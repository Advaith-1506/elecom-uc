import os
import sys
import json
import traceback
import numpy as np
import librosa

try:
    from config import *
except ImportError:
    sys.path.insert(0, os.path.dirname(__file__))
    from config import *

from steps import loader, spectrogram, noise_reduction, masking, reconstruction, features

def segment_call(audio: np.ndarray, sr: int, start_time: float, end_time: float) -> np.ndarray:
    """
    Slices the loaded audio isolating the specific elephant call based on padded boundaries.
    """
    start_sample = max(0, int((start_time - PAD_SECONDS) * sr))
    end_sample   = min(len(audio), int((end_time + PAD_SECONDS) * sr))
    return audio[start_sample:end_sample]

def process_single_call(row, audio_cache: dict) -> dict:
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
        audio_cache[sound_file] = (audio, sr)
    else:
        audio, sr = audio_cache[sound_file]
        
    # b. Segment
    segment = segment_call(audio, sr, start_time, end_time)
    
    # c. STFT
    stft_complex, magnitude, phase, magnitude_db = spectrogram.compute_stft(segment, sr)
    
    # d. Bins
    freq_bins, bin_min, bin_max = spectrogram.get_freq_bins(sr)
    
    # e. Noise ref
    noise_ref = noise_reduction.extract_noise_reference(audio, sr, start_time, end_time)
    
    # f. Noise profile
    noise_profile = noise_reduction.compute_noise_profile(noise_ref, sr)
    
    # g. Spectral sub
    magnitude_clean = noise_reduction.spectral_subtraction(magnitude, noise_profile)
    
    # h. Pitch contour
    f0_contour = masking.estimate_f0_yin(segment, sr)
    
    # i. Multi caller
    multi = masking.detect_multiple_callers(f0_contour, magnitude_clean, freq_bins)
    
    # j. Build mask
    mask = masking.build_harmonic_mask(magnitude_clean, f0_contour, freq_bins)
    
    # k. Smooth mask
    mask_smooth = masking.smooth_mask(mask)
    
    # l. Apply mask
    masked_mag = masking.apply_harmonic_mask(magnitude_clean, mask_smooth)
    
    # m. Reconstruct
    cleaned = reconstruction.reconstruct_audio(masked_mag, phase, sr)
    
    # n & o. Save audio Output
    reconstruction.save_audio(cleaned, sr, f"output/audio/{sound_file}_call_{sel}_cleaned.wav")
    
    # p. SNR
    snr_dict = reconstruction.compute_snr_improvement(segment, cleaned, start_time, end_time, sr)
    
    # q. Plot before
    spectrogram.plot_spectrogram(magnitude_db, sr, f"Before — Call {sel}", f"output/spectrograms/{sel}_before.png")
    
    # r. Plot after
    masked_db = librosa.amplitude_to_db(masked_mag, ref=np.max)
    spectrogram.plot_spectrogram(masked_db, sr, f"After — Call {sel}", f"output/spectrograms/{sel}_after.png")
    
    # s. Plot waveform
    reconstruction.plot_waveform_comparison(segment, cleaned, sr, start_time, end_time, f"output/spectrograms/{sel}_waveform.png")
    
    # t. Features Extraction
    feat = features.extract_features(
        call_row=row,
        raw_audio=segment,
        cleaned_audio=cleaned,
        masked_magnitude=masked_mag,
        f0_contour=f0_contour,
        freq_bins=freq_bins,
        snr_dict=snr_dict,
        multiple_callers=multi,
        sr=sr
    )
    
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

def main():
    print("Initializing Elephant Communications Pipeline...")
    
    # 1. Mount and Download
    loader.mount_drive_and_download()
    
    # 2. Load spreadsheet
    df = loader.load_spreadsheet("data/calls.csv")
    
    # Scaffold outputs explicitly before validation checks write against them
    os.makedirs("output/audio", exist_ok=True)
    os.makedirs("output/spectrograms", exist_ok=True)
    os.makedirs("output/features", exist_ok=True)
    
    # Phase validation protocols
    validate_phase1(df)
    validate_phase2(df)
    
    print("\n--- Running Full Batch Pipeline ---")
    audio_cache = {}
    all_features = []
    failed = []
    total_calls = len(df)
    
    # 4. BATCH LOOP
    for idx, row in df.iterrows():
        try:
            sel = int(row.get("Selection", -1))
            feat = process_single_call(row, audio_cache)
            all_features.append(feat)
            
            f0_val = feat.get('f0_hz', np.nan)
            snr_val = feat.get('snr_improvement_db', np.nan)
            print(f"✓ Call {sel}/{total_calls} complete — cleanability_score pending, f0={f0_val:.1f}Hz, snr_improvement={snr_val:.2f}dB")
            
        except Exception as e:
            err_msg = traceback.format_exc()
            failed.append({
                "selection": int(row.get("Selection", -1)), 
                "sound_file": str(row.get("Sound_file", "unknown")), 
                "error": str(e),
                "traceback": err_msg
            })
            print(f"✗ Call {row.get('Selection', 'UNKNOWN')} FAILED: {e}")
            continue

    # 5. POST LOOP
    print("\nComputing abstract cleanability rankings...")
    all_features = features.compute_cleanability_scores(all_features)
    
    def safe_nan_replace(d):
        return {k: (None if isinstance(v, float) and np.isnan(v) else v) for k, v in d.items()}
        
    cleaned_features = [safe_nan_replace(f) for f in all_features]
    with open("output/features/features.json", "w") as f:
        json.dump(cleaned_features, f, indent=4)
        
    with open("output/features/failed.json", "w") as f:
        json.dump(failed, f, indent=4)
        
    def safe_mean(key, dataset=all_features):
        vals = [d[key] for d in dataset if d.get(key) is not None and isinstance(d[key], (int, float)) and not np.isnan(d[key])]
        return float(np.mean(vals)) if vals else 0.0
        
    avg_cleanability_score = safe_mean("cleanability_score")
    avg_snr_improvement_db = safe_mean("snr_improvement_db")
    avg_hnr_improvement_db = safe_mean("hnr_improvement_db")
    avg_f0_hz = safe_mean("f0_hz")
    
    multiple_caller_flags = sum(1 for d in all_features if d.get("multiple_callers_detected"))

    by_noise_type = {}
    noise_types = set(d["noise_type"] for d in all_features)
    for nt in noise_types:
        subset = [d for d in all_features if d["noise_type"] == nt]
        by_noise_type[nt] = {
            "avg_cleanability": round(safe_mean("cleanability_score", subset), 4),
            "avg_snr_improvement": round(safe_mean("snr_improvement_db", subset), 4),
            "avg_f0_hz": round(safe_mean("f0_hz", subset), 4),
            "call_count": len(subset)
        }

    by_call_type = {}
    call_types = set(d["call_type"] for d in all_features)
    for ct in call_types:
        subset = [d for d in all_features if d["call_type"] == ct]
        by_call_type[ct] = {
            "avg_cleanability": round(safe_mean("cleanability_score", subset), 4),
            "call_count": len(subset)
        }

    summary = {
        "total_calls_processed": len(all_features),
        "total_calls_failed": len(failed),
        "avg_cleanability_score": round(avg_cleanability_score, 4),
        "avg_snr_improvement_db": round(avg_snr_improvement_db, 4),
        "avg_hnr_improvement_db": round(avg_hnr_improvement_db, 4),
        "avg_f0_hz": round(avg_f0_hz, 4),
        "multiple_caller_flags": int(multiple_caller_flags),
        "by_noise_type": by_noise_type,
        "by_call_type": by_call_type
    }
    
    with open("output/features/summary.json", "w") as f:
        json.dump(summary, f, indent=4)
        
    # 6. Print Summary
    print(f"═══════════════════════════════════════")
    print(f"PIPELINE COMPLETE")
    print(f"═══════════════════════════════════════")
    print(f"Calls processed : {len(all_features)}")
    print(f"Calls failed    : {len(failed)}")
    print(f"Avg cleanability: {avg_cleanability_score:.4f}")
    print(f"Avg SNR improve : {avg_snr_improvement_db:.2f} dB")
    print(f"Avg HNR improve : {avg_hnr_improvement_db:.2f} dB")
    print(f"Multiple caller flags: {multiple_caller_flags}")
    print(f"Output → output/")
    print(f"═══════════════════════════════════════")

if __name__ == '__main__':
    main()
