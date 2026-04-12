import os
import sys
import json
import traceback
from typing import Optional
import numpy as np
import numba_compat  # noqa: F401
import librosa

try:
    from config import *
except ImportError:
    sys.path.insert(0, os.path.dirname(__file__))
from config import *

from steps import loader, spectrogram, noise_reduction, masking, reconstruction, features, cv_analyzer

TARGET_SELECTIONS = [14, 15, 16, 17, 18, 1, 2, 3, 4, 5, 13, 19, 20, 22, 115]

def segment_call(audio: np.ndarray, sr: int, start_time: float, end_time: float) -> np.ndarray:
    """
    Slices the loaded audio isolating the specific elephant call based on padded boundaries.
    """
    start_sample = max(0, int((start_time - PAD_SECONDS) * sr))
    end_sample   = min(len(audio), int((end_time + PAD_SECONDS) * sr))
    return audio[start_sample:end_sample]

def process_single_call(
    row,
    audio_cache: dict,
    output_root: str = "output",
    generate_plots: bool = True,
    save_outputs: bool = True,
    tune_config: Optional[dict] = None,
    force_recompute: bool = True,
) -> dict:
    """
    Abstracts sequential operation batch steps (a through u) allowing independent call isolation testing.
    """
    sel = int(row["Selection"])
    sound_file = str(row["Sound_file"]).strip()
    start_time = float(row["Start_time"])
    end_time = float(row["End_time"])
    noise_type = str(row.get("noise_type", "unknown"))
    
    # a. Cache loading and noise filtering
    if sound_file not in audio_cache:
        audio, sr = loader.load_audio(os.path.join("data/audio", sound_file))
        if noise_type in ("generator", "mixed"):
            audio = noise_reduction.apply_notch_filters(audio, sr)
            
        audio = noise_reduction.detect_noise_frequency(audio, sr, noise_type)
        audio_cache[sound_file] = (audio, sr)
    else:
        audio, sr = audio_cache[sound_file]
        
    # b. Segment
    segment = segment_call(audio, sr, start_time, end_time)
    
    # c. Fast bypass caching execution paths
    cleaned_path = os.path.join(output_root, "audio", f"{sound_file}_call_{sel}_cleaned.wav")
    freq_bins, bin_min, bin_max = spectrogram.get_freq_bins(sr)
    
    # Required maps universally (both path traces)
    _, magnitude, phase, magnitude_db = spectrogram.compute_stft(segment, sr)
    
    noise_ref = noise_reduction.extract_noise_reference(audio, sr, start_time, end_time)
    segment_nr = noise_reduction.apply_noisereduce(segment, noise_ref, sr, noise_type=noise_type)
    segment_nr = noise_reduction.rumble_bandpass(segment_nr, sr, noise_type=noise_type)
    
    f0_contour = masking.estimate_f0_yin(segment_nr, sr)
    
    valid_f0 = f0_contour[~np.isnan(f0_contour)]
    voiced_ratio = len(valid_f0) / len(f0_contour) if len(f0_contour) > 0 else 0
    harmonic_freqs_cv = cv_analyzer.detect_harmonic_bands(magnitude_db, freq_bins)
    
    tier = 1
    cv_harmonics_overlay = None
    decision_exp = ""
    confidence_score = 0.0
    
    if os.path.exists(cleaned_path) and not force_recompute:
        cleaned, _ = librosa.load(cleaned_path, sr=sr)
        masked_mag = spectrogram.compute_stft(cleaned, sr)[1]
        multi = True # Dummy fallback default
        decision_exp = "Bypassed via Cache"
        confidence_score = 1.0
        adaptive_params = {"wiener_strength": 0.0, "stationarity": 0.0, "base_alpha": 1.0}
        harmonic_count_prefilter = features.count_harmonics_from_magnitude(masked_mag, f0_contour, freq_bins)
        harmonic_retention = 1.0
        blend_diag = {"blendAlpha": 1.0}
    else:
        noise_profile = noise_reduction.compute_noise_profile(noise_ref, sr)
        magnitude_subtracted = noise_reduction.spectral_subtraction(magnitude, noise_profile)
        harmonic_count_prefilter = features.count_harmonics_from_magnitude(magnitude_subtracted, f0_contour, freq_bins)
        magnitude_clean, adaptive_params = noise_reduction.apply_wiener_postfilter(
            magnitude_subtracted,
            noise_profile,
            noise_type=noise_type,
            noise_reference=noise_ref,
            sr=sr,
            tune_config=tune_config,
        )
        
        multi = masking.detect_multiple_callers(f0_contour, magnitude_clean, freq_bins)
        
        if voiced_ratio >= 0.5:
            decision_exp = f"Tier 1: YIN harmonic mask (voiced_ratio={voiced_ratio:.2f} >= 0.5)"
            confidence_score = float(np.clip(voiced_ratio, 0.0, 1.0))
            print(decision_exp)
            mask = masking.build_harmonic_mask(magnitude_clean, f0_contour, freq_bins)
            mask_smooth = masking.smooth_mask(mask)
        elif len(harmonic_freqs_cv) >= 3:
            decision_exp = f"Tier 2: CV geometric mask ({len(harmonic_freqs_cv)} bands detected)"
            confidence_score = float(np.clip(len(harmonic_freqs_cv) / 10.0, 0.0, 1.0))
            tier = 2
            print(decision_exp)
            cv_harmonics_overlay = harmonic_freqs_cv
            mask_raw = cv_analyzer.build_cv_mask(magnitude_db, freq_bins, harmonic_freqs_cv)
            mask_smooth = masking.smooth_mask(mask_raw)
        else:
            decision_exp = f"Tier 3: CNN Fallback (low f0/bands)"
            confidence_score = 0.5
            tier = 3
            print(decision_exp)
            try:
                mask_raw = cv_analyzer.extract_cnn_mask(magnitude_db)
                mask_smooth = masking.smooth_mask(mask_raw)
            except Exception as e:
                print(f"Tier 3 CNN failed: {e}. Reverting to Tier 1 mask.")
                mask_raw = masking.build_harmonic_mask(magnitude_clean, f0_contour, freq_bins)
                mask_smooth = masking.smooth_mask(mask_raw)
            
        masked_mag = masking.apply_harmonic_mask(magnitude_clean, mask_smooth)

        filtered_candidate = reconstruction.reconstruct_audio(masked_mag, phase, sr)
        filtered_candidate = noise_reduction.rumble_bandpass(filtered_candidate, sr, noise_type=noise_type)

        candidate_mag = spectrogram.compute_stft(filtered_candidate, sr)[1]
        harmonic_count_postfilter = features.count_harmonics_from_magnitude(candidate_mag, f0_contour, freq_bins)
        harmonic_retention = (
            float(harmonic_count_postfilter / max(harmonic_count_prefilter, 1))
            if harmonic_count_prefilter > 0
            else 1.0
        )
        reference_energy_db = noise_reduction.signal_energy_db(segment_nr)
        filtered_energy_db = noise_reduction.signal_energy_db(filtered_candidate)
        energy_drop_db = max(0.0, reference_energy_db - filtered_energy_db)

        cleaned, blend_diag = noise_reduction.blend_signals(
            original_audio=segment_nr,
            filtered_audio=filtered_candidate,
            base_alpha=adaptive_params["base_alpha"],
            harmonic_ratio=harmonic_retention,
            energy_drop_db=energy_drop_db,
            tune_config=tune_config,
        )
        cleaned = noise_reduction.rumble_bandpass(cleaned, sr, noise_type=noise_type)
        if save_outputs:
            reconstruction.save_audio(cleaned, sr, cleaned_path)

    final_f0_contour = masking.estimate_f0_yin(cleaned, sr)
    final_stft, final_magnitude, _, _ = spectrogram.compute_stft(cleaned, sr)

    # d. SNR & Features mapped universally BEFORE plotting (for stats injection)
    snr_dict = reconstruction.compute_snr_improvement(audio, cleaned, start_time, end_time, sr)
    feat = features.extract_features(
        call_row=row,
        raw_audio=segment,
        cleaned_audio=cleaned,
        masked_magnitude=final_magnitude,
        f0_contour=final_f0_contour,
        freq_bins=freq_bins,
        snr_dict=snr_dict,
        multiple_callers=multi,
        sr=sr
    )
    feat["harmonicCountPreFilter"] = int(harmonic_count_prefilter)
    feat["harmonicRetention"] = round(float(harmonic_retention), 4)
    feat["blendAlpha"] = round(float(blend_diag.get("blendAlpha", 1.0)), 4)
    feat["wienerStrength"] = round(float(adaptive_params.get("wiener_strength", 0.0)), 4)
    feat["noiseStationarity"] = round(float(adaptive_params.get("stationarity", 0.0)), 6)

    # e. Visual Generations
    if generate_plots:
        spectrogram.plot_spectrogram(
            magnitude_db,
            sr,
            f"Before — Call {sel}",
            os.path.join(output_root, "spectrograms", f"{sel}_before.png"),
        )

    # Compute active tuples safely independently here to overlay over visual traces mathematically natively
    try:
        from steps import segmentation
        active_segments_list = segmentation.detect_active_rumble_frames(f0_contour, masking.HOP_LENGTH, sr)
    except Exception as e:
        print(f"Segmentation lookup failed tracking logically natively: {e}")
        print(f"Segmentation fallback used for call {sel}")
        start_sample = max(0, int((start_time - 0.5) * sr))
        end_sample = min(len(audio), int((end_time + 0.5) * sr))
        segment = audio[start_sample:end_sample]
        active_segments_list = []
        
    masked_db = librosa.amplitude_to_db(final_magnitude, ref=np.max)
    f0_str = f"{feat['f0']:.1f}"
    hnr_str = f"{feat['hnrAfter']:.2f}"
    after_title = f"After — Call {sel} | Tier {tier} | f0={f0_str}Hz | HNR={hnr_str}dB | Cleanability=pending"
    if generate_plots:
        spectrogram.plot_spectrogram(
            masked_db,
            sr,
            after_title,
            os.path.join(output_root, "spectrograms", f"{sel}_after.png"),
            f0_contour=final_f0_contour,
            cv_harmonics=cv_harmonics_overlay,
            active_segments=active_segments_list,
            decision_text=decision_exp,
        )

        reconstruction.plot_waveform_comparison(
            segment,
            cleaned,
            sr,
            start_time,
            end_time,
            os.path.join(output_root, "spectrograms", f"{sel}_waveform.png"),
        )
    
    feat['maskTierUsed'] = tier
    feat['spectrogramBefore'] = f"/spectrograms/{sel}_before.png"
    feat['spectrogramAfter'] = f"/spectrograms/{sel}_after.png"
    return feat

def find_row(df, sel, sound_file):
    """Safely retrieves rows mapping both file strings and strict integers"""
    for _, row in df.iterrows():
        try:
            r_sel = int(row.get("Selection", -1))
        except:
            r_sel = -1
        r_file = str(row.get("Sound_file", "")).strip()
        
        if r_sel == sel and r_file == sound_file:
            return row
    return None

def validate_phase1(df):
    """Testing module natively confirming physical files and structure dictionaries output cleanly for target 14."""
    print("\n--- Running validate_phase1() ---")
    
    target_sel = 14
    target_file = "090224-09_generator_01.wav"
    
    row = find_row(df, target_sel, target_file)
    if row is None:
        print(f"❌ Phase 1 FAILED: Could not find call Selection={target_sel} from {target_file}")
        sys.exit(1)
        
    audio_cache = {}
    try:
        feat = process_single_call(row, audio_cache)
    except Exception as e:
        print(f"❌ Phase 1 FAILED: Pipeline execution failed with: {e}")
        traceback.print_exc()
        sys.exit(1)
        
    expected_files = [
        f"output/audio/{target_file}_call_{target_sel}_cleaned.wav",
        f"output/spectrograms/{target_sel}_before.png",
        f"output/spectrograms/{target_sel}_after.png",
        f"output/spectrograms/{target_sel}_waveform.png"
    ]
    
    for path in expected_files:
        if not os.path.exists(path):
            print(f"❌ Phase 1 FAILED: Expected file missing: {path}")
            sys.exit(1)
            
    print("\nFeature Dictionary (Raw Properties):")
    for k, v in feat.items():
        print(f"  {k}: {v}")
        
    print("\n✅ Phase 1 PASSED")

def validate_phase2(df):
    """Test verification table printing direct comparisons over 3 independent properties"""
    print("\n--- Running validate_phase2() ---")
    
    targets = [
        {"noise": "Generator", "sel": 14, "file": "090224-09_generator_01.wav"},
        {"noise": "Vehicle",   "sel": 1,  "file": "04-040920-02_vehicle_1.wav"},
        {"noise": "Airplane",  "sel": 13, "file": "061220-24_airplane_01.wav"}
    ]
    
    audio_cache = {}
    feats = []
    
    for t in targets:
        row = find_row(df, t["sel"], t["file"])
        if row is None:
            print(f"❌ Phase 2 FAILED: Could not find {t['noise']} call (Selection={t['sel']})")
            sys.exit(1)
            
        try:
            f = process_single_call(row, audio_cache)
            feats.append(f)
        except Exception as e:
            print(f"❌ Phase 2 FAILED: Failed processing {t['noise']} call: {e}")
            traceback.print_exc()
            sys.exit(1)
            
    print(f"\n| {'Feature':<25} | {'Generator (14)':<15} | {'Vehicle (1)':<15} | {'Airplane (13)':<15} |")
    print("-" * 83)
    
    keys_order = [k for k in feats[0].keys()]
    
    for k in keys_order:
        val1 = str(feats[0].get(k, ""))
        val2 = str(feats[1].get(k, ""))
        val3 = str(feats[2].get(k, ""))
        print(f"| {k[:25]:<25} | {val1[:15]:<15} | {val2[:15]:<15} | {val3[:15]:<15} |")
        
    print("\n✅ Phase 2 PASSED")

def build_summary(all_features: list[dict], failed: list[dict]) -> dict:
    def safe_mean(key, dataset=all_features):
        vals = [d[key] for d in dataset if d.get(key) is not None and isinstance(d[key], (int, float))]
        return float(np.mean(vals)) if vals else 0.0

    avg_cleanability_score = safe_mean("cleanabilityScore")
    avg_snr_improvement_db = safe_mean("snrImprovement")
    avg_hnr_improvement_db = safe_mean("hnrImprovement")
    avg_f0_hz = safe_mean("f0")

    multiple_caller_flags = sum(1 for d in all_features if d.get("multipleCallers"))

    by_noise_type = {}
    noise_types = set(d["noiseType"] for d in all_features if d.get("noiseType"))
    for nt in noise_types:
        subset = [d for d in all_features if d["noiseType"] == nt]
        by_noise_type[nt] = {
            "avgCleanabilityScore": round(safe_mean("cleanabilityScore", subset), 4),
            "avgSnrImprovement": round(safe_mean("snrImprovement", subset), 4),
            "avgF0Hz": round(safe_mean("f0", subset), 4),
            "callCount": len(subset)
        }

    by_call_type = {}
    call_types = set(d["callType"] for d in all_features if d.get("callType"))
    for ct in call_types:
        subset = [d for d in all_features if d["callType"] == ct]
        by_call_type[ct] = {
            "avgCleanabilityScore": round(safe_mean("cleanabilityScore", subset), 4),
            "callCount": len(subset)
        }

    tier1_used = sum(1 for d in all_features if d.get("maskTierUsed") == 1)
    tier2_used = sum(1 for d in all_features if d.get("maskTierUsed") == 2)
    tier3_used = sum(1 for d in all_features if d.get("maskTierUsed") == 3)

    return {
        "totalCallsProcessed": len(all_features),
        "totalCallsFailed": len(failed),
        "avgCleanabilityScore": round(avg_cleanability_score, 4),
        "avgSnrImprovement": round(avg_snr_improvement_db, 4),
        "avgHnrImprovement": round(avg_hnr_improvement_db, 4),
        "avgF0Hz": round(avg_f0_hz, 4),
        "multipleCallerFlags": int(multiple_caller_flags),
        "byNoiseType": by_noise_type,
        "byCallType": by_call_type,
        "tierUsage": {
            "tier1": tier1_used,
            "tier2": tier2_used,
            "tier3": tier3_used
        }
    }


def run_batch_pipeline(
    df,
    output_root: str = "output",
    generate_plots: bool = True,
    save_outputs: bool = True,
    tune_config: Optional[dict] = None,
    force_recompute: bool = True,
):
    os.makedirs(os.path.join(output_root, "audio"), exist_ok=True)
    os.makedirs(os.path.join(output_root, "spectrograms"), exist_ok=True)
    os.makedirs(os.path.join(output_root, "features"), exist_ok=True)

    df_target = df[df["Selection"].isin(TARGET_SELECTIONS)]
    print("\n--- Running Full Batch Pipeline ---")
    audio_cache = {}
    all_features = []
    failed = []

    for idx, row in df_target.iterrows():
        sel = int(row.get("Selection", -1))
        filename = str(row.get("Sound_file", "unknown"))
        noise_type = str(row.get("noise_type", "unknown"))
        try:
            feat = process_single_call(
                row,
                audio_cache,
                output_root=output_root,
                generate_plots=generate_plots,
                save_outputs=save_outputs,
                tune_config=tune_config,
                force_recompute=force_recompute,
            )
            all_features.append(feat)
            print(f"✓ {sel}/15 — {filename} ({noise_type})")
        except Exception as e:
            err_msg = traceback.format_exc()
            failed.append({
                "selection": sel, 
                "sound_file": filename, 
                "error": str(e),
                "traceback": err_msg
            })
            print(f"✗ {sel}/15 FAILED: {e}")
            continue

    print("\nComputing abstract cleanability rankings...")
    all_features = features.compute_cleanability_scores(all_features)

    with open(os.path.join(output_root, "features", "features.json"), "w") as f:
        json.dump(all_features, f, indent=4)

    with open(os.path.join(output_root, "features", "failed.json"), "w") as f:
        json.dump(failed, f, indent=4)

    summary = build_summary(all_features, failed)
    with open(os.path.join(output_root, "features", "summary.json"), "w") as f:
        json.dump(summary, f, indent=4)

    return all_features, failed, summary


def main():
    print("Initializing Elephant Communications Pipeline...")

    df = loader.load_spreadsheet("data/calls.csv")
    all_features, failed, summary = run_batch_pipeline(df)
    avg_cleanability_score = summary["avgCleanabilityScore"]
    avg_snr_improvement_db = summary["avgSnrImprovement"]
    avg_hnr_improvement_db = summary["avgHnrImprovement"]
    by_noise_type = summary["byNoiseType"]
    tier1_used = summary["tierUsage"]["tier1"]
    tier2_used = summary["tierUsage"]["tier2"]
    tier3_used = summary["tierUsage"]["tier3"]

    print(f"  ═══════════════════════════════════")
    print(f"  ELECOM PIPELINE COMPLETE")
    print(f"  ═══════════════════════════════════")
    print(f"  Calls processed : {len(all_features)}/15")
    print(f"  Calls failed    : {len(failed)}")
    print(f"  Generator calls : {by_noise_type.get('generator', {}).get('callCount', 0)}")
    print(f"  Vehicle calls   : {by_noise_type.get('vehicle', {}).get('callCount', 0)}")
    print(f"  Airplane calls  : {by_noise_type.get('airplane', {}).get('callCount', 0)}")
    print(f"  Avg cleanability: {avg_cleanability_score:.2f}/100")
    print(f"  Avg SNR improve : {avg_snr_improvement_db:.2f} dB")
    print(f"  Avg HNR improve : {avg_hnr_improvement_db:.2f} dB")
    print(f"  Tier 1 used     : {tier1_used}")
    print(f"  Tier 2 used     : {tier2_used}")
    print(f"  Tier 3 used     : {tier3_used}")
    print(f"  Output → output/")
    print(f"  ═══════════════════════════════════")

if __name__ == '__main__':
    main()
