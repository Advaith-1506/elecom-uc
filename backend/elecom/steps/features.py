import os
import sys
from typing import Optional
import numpy as np
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import numba_compat  # noqa: F401
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
        return 0.0
    return round(float(val), ndigits)


def _mean_db_spectrum(magnitude: np.ndarray) -> np.ndarray:
    return librosa.amplitude_to_db(np.mean(magnitude, axis=1) + 1e-10)


def _candidate_support_score(candidate_f0: float, db_spectrum: np.ndarray, freq_bins: np.ndarray) -> float:
    score = 0.0
    for k in range(1, 9):
        harmonic_freq = candidate_f0 * k
        if harmonic_freq > min(FREQ_MAX, 180.0):
            break
        bin_idx = int(np.argmin(np.abs(freq_bins - harmonic_freq)))
        left = max(0, bin_idx - 1)
        right = min(len(db_spectrum), bin_idx + 2)
        local_peak = float(np.max(db_spectrum[left:right]))
        score += max(local_peak - NOISE_FLOOR_DB, 0.0) / np.sqrt(k)

    target_bonus = 1.0 - min(abs(candidate_f0 - RUMBLE_F0_TARGET_CENTER) / 10.0, 1.0)
    return score + 3.0 * target_bonus


def estimate_rumble_f0(
    f0_contour: np.ndarray,
    magnitude: Optional[np.ndarray] = None,
    freq_bins: Optional[np.ndarray] = None,
) -> float:
    with np.errstate(all='ignore'):
        raw_f0 = np.nanmedian(f0_contour)

    if np.isnan(raw_f0) or raw_f0 <= 0:
        return raw_f0

    candidate_values = [raw_f0, raw_f0 / 2.0, raw_f0 * 2.0]
    candidates = sorted({
        float(np.clip(candidate, RUMBLE_F0_LOW, RUMBLE_F0_HIGH))
        for candidate in candidate_values
        if candidate > 0
    })

    if not candidates:
        return correct_rumble_f0(raw_f0)

    if magnitude is None or freq_bins is None:
        return correct_rumble_f0(raw_f0)

    db_spectrum = _mean_db_spectrum(magnitude)
    best_candidate = max(
        candidates,
        key=lambda candidate: _candidate_support_score(candidate, db_spectrum, freq_bins),
    )
    return float(np.clip(best_candidate, RUMBLE_F0_LOW, RUMBLE_F0_HIGH))


def count_harmonics_from_magnitude(magnitude: np.ndarray, f0_contour: np.ndarray, freq_bins: np.ndarray) -> int:
    f0_hz = estimate_rumble_f0(f0_contour, magnitude, freq_bins)
    db_spectrum = _mean_db_spectrum(magnitude)
    harmonic_count = 0
    if not np.isnan(f0_hz) and f0_hz > 0:
        for k in range(1, 21):
            harmonic_freq = f0_hz * k
            if harmonic_freq > FREQ_MAX:
                break
            bin_idx = np.argmin(np.abs(freq_bins - harmonic_freq))
            if db_spectrum[bin_idx] > (NOISE_FLOOR_DB + 6.0):
                harmonic_count += 1
    return int(harmonic_count)


def correct_rumble_f0(f0_hz: float) -> float:
    if np.isnan(f0_hz) or f0_hz <= 0:
        return f0_hz
    if f0_hz > RUMBLE_F0_HIGH:
        f0_hz /= 2.0
    if f0_hz < RUMBLE_F0_LOW:
        f0_hz *= 2.0
    return float(np.clip(f0_hz, RUMBLE_F0_LOW, RUMBLE_F0_HIGH))

def extract_features(call_row: dict, raw_audio: np.ndarray, cleaned_audio: np.ndarray, 
                     masked_magnitude: np.ndarray, f0_contour: np.ndarray, 
                     freq_bins: np.ndarray, snr_dict: dict, multiple_callers: bool, 
                     sr: int) -> dict:
    """
    MASTER FUNCTION: Consolidates mathematical signal calculations into physical properties to build an analytical feature vector for each call. 
    """
    
    # 1. Fundamental Frequency Median
    f0_hz = estimate_rumble_f0(f0_contour, masked_magnitude, freq_bins)
        
    # 2. Harmonic Count Filtered by Noise Floor
    harmonic_count = count_harmonics_from_magnitude(masked_magnitude, f0_contour, freq_bins)
                
    # 3. Harmonic to Noise Ratio Measurements (Current and Baseline)
    def calculate_hnr(audio_array: np.ndarray) -> float:
        if np.isnan(f0_hz) or f0_hz <= 0:
            return np.nan
            
        r = scipy.signal.correlate(audio_array, audio_array, mode='full', method='fft')[len(audio_array)-1:]
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

    # 8. Active Rumble Segmentation Bounds Parsing
    try:
        from steps import segmentation
        active_segments_list = segmentation.detect_active_rumble_frames(f0_contour, HOP_LENGTH, sr)
        active_rumble_segments = len(active_segments_list)
    except Exception as e:
        print(f"Segmentation failed cleanly: {e}")
        active_rumble_segments = 0

    sel = call_row.get("Selection", -1)
    
    return {
        "id": f"sel-{sel}",
        "selection": int(sel) if not np.isnan(sel) else 0,
        "sound_file": str(call_row.get("Sound_file", "unknown")),
        "callType": str(call_row.get("Call_type", "unknown")),
        "noiseType": str(call_row.get("noise_type", "unknown")),
        "duration": float(safe_round(duration_s)),
        "f0": float(safe_round(f0_hz)),
        "harmonicCount": int(harmonic_count) if harmonic_count is not None and not np.isnan(harmonic_count) else 0,
        "hnrBefore": float(safe_round(hnr_before_db)),
        "hnrAfter": float(safe_round(hnr_db)),
        "hnrImprovement": float(safe_round(hnr_impr)),
        "snrImprovement": float(safe_round(snr_dict.get("snr_improvement_db", 0.0))),
        "fmDepth": float(safe_round(fm_depth_hz)),
        "spectralCentroid": float(safe_round(spectral_centroid_hz)),
        "energyDb": float(safe_round(energy_db)),
        "multipleCallers": bool(multiple_callers),
        "maskTierUsed": 1,
        "harmonicRetention": 1.0,
        "harmonicCountPreFilter": int(harmonic_count),
        "blendAlpha": 1.0,
        "wienerStrength": 0.0,
        "noiseStationarity": 0.0,
        "cleanabilityScore": 0.0,
        "spectrogramBefore": "unknown",
        "spectrogramAfter": "unknown"
    }

def compute_cleanability_scores(all_features: list[dict]) -> list[dict]:
    """
    Score cleanability against absolute restoration targets instead of only relative batch ranking.
    """
    if not all_features:
        return all_features

    def normalize(value: float, low: float, high: float) -> float:
        return float(np.clip((value - low) / (high - low + 1e-8), 0.0, 1.0))

    for f in all_features:
        snr_score = normalize(f.get('snrImprovement', 0.0), -5.0, 20.0)
        hnr_gain_score = normalize(f.get('hnrImprovement', 0.0), -2.0, 10.0)
        hnr_abs_score = normalize(f.get('hnrAfter', 0.0), -10.0, 12.0)
        harmonic_score = normalize(f.get('harmonicCount', 0.0), 4.0, 20.0)
        energy_score = normalize(f.get('energyDb', -40.0), -30.0, -10.0)

        score = (
            0.34 * snr_score +
            0.30 * hnr_gain_score +
            0.18 * hnr_abs_score +
            0.10 * harmonic_score +
            0.08 * energy_score
        ) * 100.0

        if f.get('multipleCallers'):
            score -= 3.5
        if f.get('snrImprovement', 0.0) < 0:
            score -= 8.0
        harmonic_retention = float(f.get('harmonicRetention', 1.0))
        if harmonic_retention < SOFT_HARMONIC_RETENTION:
            score -= (SOFT_HARMONIC_RETENTION - harmonic_retention) * 18.0

        score = float(np.clip(score, 0.0, 100.0))
        f['cleanabilityScore'] = round(score, 2)

    return all_features
