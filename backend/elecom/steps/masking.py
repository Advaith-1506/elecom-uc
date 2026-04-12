import os
import sys
import numpy as np
import scipy.signal
import scipy.ndimage
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import numba_compat  # noqa: F401
import librosa

# Load config correctly regardless of where the file is imported from
try:
    from config import *
except ImportError:
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    from config import *

def estimate_f0_yin(audio_segment: np.ndarray, sr: int) -> np.ndarray:
    """
    Estimates the fundamental frequency (f0) contour of an audio segment using the YIN algorithm.
    """
    f0 = librosa.yin(audio_segment, fmin=FREQ_MIN, fmax=F0_SEARCH_MAX, sr=sr,
                     frame_length=N_FFT, hop_length=HOP_LENGTH)
                     
    # Replace unvoiced logic with NaN
    f0[f0 == 0.0] = np.nan
    valid_f0 = f0[~np.isnan(f0)]
    
    if len(valid_f0) > 0:
        median_f0 = np.median(valid_f0)
        f0_min = np.min(valid_f0)
        f0_max = np.max(valid_f0)
    else:
        median_f0 = np.nan
        f0_min = np.nan
        f0_max = np.nan
        
    print(f"Median f0: {median_f0:.1f} Hz")
    print(f"f0 range: {f0_min:.1f} to {f0_max:.1f} Hz")
    print(f"Voiced frames: {len(valid_f0)} / {len(f0)}")
    
    return f0

def detect_multiple_callers(f0_contour: np.ndarray, magnitude: np.ndarray, freq_bins: np.ndarray) -> bool:
    """
    At each time frame, verifies if crossing patterns of overlapping tracks signal a second caller.
    """
    frames_with_secondary = 0
    evaluated_frames = 0

    for t in range(magnitude.shape[1]):
        if t >= len(f0_contour):
            break
            
        f0_t = f0_contour[t]
        if np.isnan(f0_t):
            continue

        evaluated_frames += 1
        mag_t = magnitude[:, t]
        prominence = max(float(np.max(mag_t)) * MULTI_CALLER_PEAK_PROMINENCE_RATIO, 1e-8)
        peaks, props = scipy.signal.find_peaks(mag_t, prominence=prominence)

        if len(peaks) == 0:
            continue

        unexplained_peaks = 0
        for idx, p in enumerate(peaks):
            peak_freq = freq_bins[p]
            if not (FREQ_MIN <= peak_freq <= MULTI_CALLER_MAX_FREQ):
                continue

            ratio = peak_freq / max(f0_t, 1e-8)
            nearest_harmonic = max(1.0, round(ratio))
            dist_to_harmonic = abs(ratio - nearest_harmonic)
            prominence_value = props["prominences"][idx] if "prominences" in props else 0.0

            # Ignore peaks that look like the expected harmonic ladder or weak broadband leftovers.
            if dist_to_harmonic <= 0.15:
                continue
            if 0.45 <= ratio <= 0.65:
                continue
            if prominence_value < prominence * 1.1:
                continue
            unexplained_peaks += 1

        if unexplained_peaks >= 2:
            frames_with_secondary += 1

    frame_ratio = frames_with_secondary / max(evaluated_frames, 1)
    flag = (
        evaluated_frames >= MULTI_CALLER_MIN_FRAMES and
        frame_ratio >= MULTI_CALLER_FRAME_RATIO
    )
    if flag:
        print("WARNING: Multiple elephant callers detected in this segment")

    return flag

def build_harmonic_mask(magnitude: np.ndarray, f0_contour: np.ndarray, freq_bins: np.ndarray) -> np.ndarray:
    """
    Builds a boolean-like mask preserving the N_HARMONICS of the identified f0 fundamental trace.
    """
    num_bins, num_frames = magnitude.shape
    mask = np.zeros_like(magnitude)
    
    valid_f0 = f0_contour[~np.isnan(f0_contour)]
    voiced_frame_count = len(valid_f0)
    
    if voiced_frame_count < 0.5 * num_frames:
        print("WARNING: Low f0 confidence, using broadband fallback")
        bin_min = np.argmin(np.abs(freq_bins - FREQ_MIN))
        bin_max = np.argmin(np.abs(freq_bins - FREQ_MAX))
        mask[bin_min:bin_max, :] = 1.0
        return mask
    
    for t in range(num_frames):
        if t >= len(f0_contour):
            continue
            
        f0_t = f0_contour[t]
        if np.isnan(f0_t):
            continue
            
        for k in range(1, N_HARMONICS + 1):
            harmonic_freq = f0_t * k
            if harmonic_freq > FREQ_MAX:
                break
                
            freq_low = harmonic_freq * (1 - HARMONIC_TOLERANCE)
            freq_high = harmonic_freq * (1 + HARMONIC_TOLERANCE)
            
            bin_low = np.searchsorted(freq_bins, freq_low)
            bin_high = np.searchsorted(freq_bins, freq_high)
            
            # Map into our mask representation
            mask[bin_low:bin_high, t] = 1.0
            
    coverage = (np.count_nonzero(mask) / mask.size) * 100
    print(f"Mask coverage percentage: {coverage:.2f}%")
    return mask

def smooth_mask(mask: np.ndarray) -> np.ndarray:
    """
    Smooths the harmonic mask linearly across the time axis utilizing a median filter.
    """
    nonzero_before = np.count_nonzero(mask)
    
    smoothed = scipy.ndimage.median_filter(mask, size=(5, MASK_KERNEL))
    
    nonzero_after = np.count_nonzero(smoothed)
    
    print(f"Non-zero bin count before smoothing: {nonzero_before}")
    print(f"Non-zero bin count after smoothing: {nonzero_after}")
    return smoothed

def apply_harmonic_mask(magnitude_clean: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """
    Overlays the finalized harmonic mask tightly onto the signal magnitude array.
    """
    mean_energy_before = np.mean(magnitude_clean)
    
    result = magnitude_clean * mask + (magnitude_clean * 0.3 * (1 - mask))
    
    mean_energy_after = np.mean(result)
    
    print(f"Mean energy before masking: {mean_energy_before:.6f}")
    print(f"Mean energy after masking: {mean_energy_after:.6f}")
    
    return result
