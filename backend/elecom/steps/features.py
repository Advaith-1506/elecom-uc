import os
import sys
import numpy as np
import librosa
import scipy.signal

# Load config correctly regardless of where the file is imported from
try:
    from config import *
except ImportError:
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    from config import *

def safe_round(val, ndigits=4):
    """Safely rounds float values to standard precision while ignoring NaNs/Nones."""
    if val is None or np.isnan(val):
        return np.nan
    return round(float(val), ndigits)

def extract_features(call_row: dict, raw_audio: np.ndarray, cleaned_audio: np.ndarray, 
                     masked_magnitude: np.ndarray, f0_contour: np.ndarray, 
                     freq_bins: np.ndarray, snr_dict: dict, multiple_callers: bool, 
                     sr: int) -> dict:
    """
    MASTER FUNCTION: Consolidates mathematical signal calculations into physical properties to build an analytical feature vector for each call. 
    """
    
    # 1. Fundamental Frequency Median
    with np.errstate(all='ignore'):
        f0_hz = np.nanmedian(f0_contour)
        
    # 2. Harmonic Count Filtered by Noise Floor
    # Compress the STFT temporal dimension, converted down to db map
    db_spectrum = librosa.amplitude_to_db(np.mean(masked_magnitude, axis=1))
    
    harmonic_count = 0
    if not np.isnan(f0_hz) and f0_hz > 0:
        for k in range(1, 21): # k=1..20
            harmonic_freq = f0_hz * k
            if harmonic_freq > FREQ_MAX:
                break
            
            # Find the bin containing our theoretical harmonic frequency
            bin_idx = np.argmin(np.abs(freq_bins - harmonic_freq))
            if db_spectrum[bin_idx] > (NOISE_FLOOR_DB + 6.0):
                harmonic_count += 1
                
    # 3. Harmonic to Noise Ratio Measurements (Current and Baseline)
    def calculate_hnr(audio_array: np.ndarray) -> float:
        if np.isnan(f0_hz) or f0_hz <= 0:
            return np.nan
            
        r = np.correlate(audio_array, audio_array, mode='full')[len(audio_array)-1:]
        lag = int(sr / f0_hz)
        
        if lag >= len(r) or lag == 0:
            return np.nan
            
        # Protect against non-standard cross-over boundaries causing negative ratios
        noise_energy = max(r[0] - r[lag], 0.0)
        hnr = 10 * np.log10(r[lag] / (noise_energy + 1e-8))
        return float(np.clip(hnr, -20.0, 40.0))

    hnr_db = calculate_hnr(cleaned_audio)
    hnr_before_db = calculate_hnr(raw_audio)
    
    # 4. Spectral Centroid tracking via Librosa's window
    centroids = librosa.feature.spectral_centroid(y=cleaned_audio, sr=sr, n_fft=N_FFT, hop_length=HOP_LENGTH)
    spectral_centroid_hz = np.mean(centroids)
    
    # 5. Volumetric Call Energy
    energy_db = 20 * np.log10(np.sqrt(np.mean(cleaned_audio**2)) + 1e-8)
    
    # 6. Elapsed Time Calculation
    duration_s = float(call_row["End_time"]) - float(call_row["Start_time"])
    
    # 7. Frequency Modulation Depth calculation
    valid_f0 = f0_contour[~np.isnan(f0_contour)]
    fm_depth_hz = np.std(valid_f0) if len(valid_f0) > 0 else np.nan
    
    # Prepare difference states natively bridging potential edge cases
    hnr_impr = hnr_db - hnr_before_db if not (np.isnan(hnr_db) or np.isnan(hnr_before_db)) else np.nan

    return {
      "selection": int(call_row["Selection"]),
      "sound_file": str(call_row["Sound_file"]),
      "start_time": safe_round(call_row["Start_time"]),
      "end_time": safe_round(call_row["End_time"]),
      "call_type": str(call_row["Call_type"]),
      "noise_type": str(call_row["noise_type"]),
      "duration_s": safe_round(duration_s),
      "f0_hz": safe_round(f0_hz),
      "harmonic_count": int(harmonic_count),
      "hnr_db": safe_round(hnr_db),
      "hnr_before_db": safe_round(hnr_before_db),
      "hnr_improvement_db": safe_round(hnr_impr),
      "spectral_centroid_hz": safe_round(spectral_centroid_hz),
      "energy_db": safe_round(energy_db),
      "fm_depth_hz": safe_round(fm_depth_hz),
      "snr_before_db": safe_round(snr_dict.get("snr_before_db", np.nan)),
      "snr_after_db": safe_round(snr_dict.get("snr_after_db", np.nan)),
      "snr_improvement_db": safe_round(snr_dict.get("snr_improvement_db", np.nan)),
      "multiple_callers_detected": bool(multiple_callers),
      "cleanability_score": None
    }

def compute_cleanability_scores(all_features: list[dict]) -> list[dict]:
    """
    Synthesizes HNR, SNR, and Semantic Harmonic properties to establish a global unified Quality benchmark Score between 0.0 and 1.0.
    """
    def is_valid(v):
        return v is not None and not np.isnan(v)
        
    hnr_vals = [f['hnr_db'] for f in all_features if is_valid(f['hnr_db'])]
    global_min_hnr = min(hnr_vals) if hnr_vals else 0.0
    global_max_hnr = max(hnr_vals) if hnr_vals else 1.0
    
    snr_vals = [f['snr_improvement_db'] for f in all_features if is_valid(f['snr_improvement_db'])]
    global_min_snr = min(snr_vals) if snr_vals else 0.0
    global_max_snr = max(snr_vals) if snr_vals else 1.0
    
    harm_vals = [f['harmonic_count'] for f in all_features if is_valid(f['harmonic_count'])]
    global_min_harm = min(harm_vals) if harm_vals else 0.0
    global_max_harm = max(harm_vals) if harm_vals else 1.0
    
    for f in all_features:
        # Prevent math warnings against null properties
        norm_hnr = (f['hnr_db'] - global_min_hnr) / (global_max_hnr - global_min_hnr + 1e-8) if is_valid(f['hnr_db']) else 0.0
        norm_snr_impr = (f['snr_improvement_db'] - global_min_snr) / (global_max_snr - global_min_snr + 1e-8) if is_valid(f['snr_improvement_db']) else 0.0
        norm_harmonics = (f['harmonic_count'] - global_min_harm) / (global_max_harm - global_min_harm + 1e-8) if is_valid(f['harmonic_count']) else 0.0
            
        score = 0.4 * norm_hnr + 0.4 * norm_snr_impr + 0.2 * norm_harmonics
        score = np.clip(score, 0.0, 1.0)
        f['cleanability_score'] = round(float(score), 4)
        
    return all_features
