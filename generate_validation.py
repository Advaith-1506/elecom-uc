import os
import json
import librosa
import numpy as np
import warnings
import pandas as pd
import scipy.signal

def main():
    features_path = "backend/elecom/output/features/features.json"
    audio_dir = "backend/elecom/output/audio"
    
    with open(features_path, "r") as f:
        features = json.load(f)
        
    excellent, good, marginal, poor = 0, 0, 0, 0
    report_lines = []
    
    df = pd.read_csv("backend/elecom/data/calls.csv")
    
    for feat in features:
        sel = feat["selection"]
        sound_file = str(feat["sound_file"]).strip()
        noise_type = feat.get("noiseType", "unknown")
        
        cleaned_audio_path = os.path.join(audio_dir, f"{sound_file}_call_{sel}_cleaned.wav")
        raw_audio_path = os.path.join("backend/elecom/data/audio", sound_file) 
        
        row = df[df["Selection"] == sel].iloc[0]
        start_time = float(row["Start_time"])
        end_time = float(row["End_time"])
        
        raw_full, sr = librosa.load(raw_audio_path, sr=None)
        start_sample = max(0, int((start_time - 0.5) * sr))
        end_sample = min(len(raw_full), int((end_time + 0.5) * sr))
        raw_seg = raw_full[start_sample:end_sample]
        
        cleaned_seg, _ = librosa.load(cleaned_audio_path, sr=sr)
        
        # STEP 1 — F0 SANITY CHECK
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            # Pad segment if too short for frame_length
            seg_len = len(cleaned_seg)
            if seg_len < 8192:
                 cleaned_seg_f0 = np.pad(cleaned_seg, (0, 8192 - seg_len))
            else:
                 cleaned_seg_f0 = cleaned_seg
            f0_contour = librosa.yin(cleaned_seg_f0, fmin=10, fmax=200, sr=sr, frame_length=8192)
            
        valid_f0s = f0_contour[~np.isnan(f0_contour)]
        if len(valid_f0s) > 0:
            median_f0 = np.median(valid_f0s)
            f0_valid = (10.0 <= median_f0 <= 20.0)
        else:
            median_f0 = 0.0
            f0_valid = False
            
        # STEP 2 — HARMONIC SPACING CHECK
        stft_clean = np.abs(librosa.stft(cleaned_seg, n_fft=8192, hop_length=512))
        db_clean = librosa.amplitude_to_db(stft_clean, ref=np.max)
        mean_db_clean = np.mean(db_clean, axis=1)
        freq_bins = librosa.fft_frequencies(sr=sr, n_fft=8192)
        
        idx_10_500 = np.where((freq_bins >= 10) & (freq_bins <= 500))[0]
        valid_freqs = freq_bins[idx_10_500]
        valid_energy = mean_db_clean[idx_10_500]
        
        peaks, _ = scipy.signal.find_peaks(valid_energy, prominence=1.0)
        top_5_peaks_idx = peaks[np.argsort(valid_energy[peaks])[-5:]] if len(peaks) > 0 else []
        top_5_freqs = valid_freqs[top_5_peaks_idx]
        
        harmonics_valid = True
        base_f0 = feat["f0"] if feat["f0"] > 0 else median_f0
        if base_f0 > 0 and len(top_5_freqs) > 0:
            for pf in top_5_freqs:
                ratio = pf / base_f0
                dist_to_integer = abs(ratio - round(ratio))
                if dist_to_integer > 0.15: 
                    harmonics_valid = False
                    break
        else:
            harmonics_valid = False
            
        # STEP 3 — NOISE REDUCTION CHECK
        stft_raw = np.abs(librosa.stft(raw_seg, n_fft=8192, hop_length=512))
        db_raw = librosa.amplitude_to_db(stft_raw, ref=np.max)
        mean_db_raw = np.mean(db_raw, axis=1)
        
        harmonic_energy_raw = []
        harmonic_energy_clean = []
        noise_energy_raw = []
        noise_energy_clean = []
        
        for i, freq in enumerate(valid_freqs):
            is_harmonic = False
            if base_f0 > 0:
                ratio = freq / base_f0
                if abs(ratio - round(ratio)) < 0.15:
                    is_harmonic = True
            
            if is_harmonic:
                harmonic_energy_raw.append(mean_db_raw[idx_10_500[i]])
                harmonic_energy_clean.append(valid_energy[i])
            else:
                noise_energy_raw.append(mean_db_raw[idx_10_500[i]])
                noise_energy_clean.append(valid_energy[i])
                
        signal_preserved_db = np.mean(harmonic_energy_clean) - np.mean(harmonic_energy_raw) if harmonic_energy_clean else 0.0
        noise_reduced_db = np.mean(noise_energy_raw) - np.mean(noise_energy_clean) if noise_energy_clean else 0.0
        
        # STEP 4 — QUALITY FLAG
        if not f0_valid or signal_preserved_db < -10.0:  
            quality_flag = "poor"
        elif not harmonics_valid or noise_reduced_db < 0:
            quality_flag = "marginal"
        elif noise_reduced_db >= 3.0:
            quality_flag = "excellent"
        else:
            quality_flag = "good"
            
        if quality_flag == "excellent": excellent += 1
        elif quality_flag == "good": good += 1
        elif quality_flag == "marginal": marginal += 1
        else: poor += 1
        
        feat["f0Valid"] = bool(f0_valid)
        feat["harmonicsValid"] = bool(harmonics_valid)
        feat["signalPreservedDb"] = float(signal_preserved_db)
        feat["noiseReducedDb"] = float(noise_reduced_db)
        feat["qualityFlag"] = str(quality_flag)
        
        report_lines.append(f"  {sel:<4} | {noise_type:<10} | {median_f0:<5.1f} | {str(harmonics_valid):<9} | {quality_flag}")

    with open(features_path, "w") as f:
        json.dump(features, f, indent=4)
        
    accuracy = (excellent + good) / max(1, len(features)) * 100
    
    print("  ════════════════════════════════════════════════════")
    print("  ELECOM VALIDATION REPORT")
    print("  ════════════════════════════════════════════════════")
    print("  Call | NoiseType  | f0 Hz | Harmonics | Quality")
    print("  ────────────────────────────────────────────────────")
    for line in report_lines:
        print(line)
    print("  ────────────────────────────────────────────────────")
    print(f"  Excellent : {excellent}")
    print(f"  Good      : {good}")
    print(f"  Marginal  : {marginal}")
    print(f"  Poor      : {poor}")
    print(f"  Overall accuracy: {accuracy:.0f}%")
    print("  ════════════════════════════════════════════════════")

if __name__ == '__main__':
    main()
