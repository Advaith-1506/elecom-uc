import os
import sys
import numpy as np
import scipy.signal
import scipy.ndimage
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
    f0 = librosa.yin(audio_segment, fmin=FREQ_MIN, fmax=200.0, sr=sr,
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
    flag = False
    
    for t in range(magnitude.shape[1]):
        if t >= len(f0_contour):
            break
            
        f0_t = f0_contour[t]
        if np.isnan(f0_t):
            continue
            
        mag_t = magnitude[:, t]
        peaks, _ = scipy.signal.find_peaks(mag_t)
        
        # Look for peaks that indicate a separate fundamental harmonic structure
        unexplained_peaks = 0
        for p in peaks:
            peak_freq = freq_bins[p]
            if FREQ_MIN <= peak_freq <= 200.0:
                ratio = peak_freq / f0_t
                dist_to_harmonic = abs(ratio - round(ratio))
                
                # Check for strong peak that deviates heavily from current harmonics
                if dist_to_harmonic > 0.2 and mag_t[p] > np.max(mag_t) * 0.3:
                    unexplained_peaks += 1
                    
        # Multi-caller assumption
        if unexplained_peaks >= 2:
            flag = True
            break

    if flag:
        print("WARNING: Multiple elephant callers detected in this segment")
        
    return flag

def build_harmonic_mask(magnitude: np.ndarray, f0_contour: np.ndarray, freq_bins: np.ndarray) -> np.ndarray:
    """
    Builds a boolean-like mask preserving the N_HARMONICS of the identified f0 fundamental trace.
    """
    mask = np.zeros_like(magnitude)
    
    for t in range(magnitude.shape[1]):
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
    
    smoothed = scipy.ndimage.median_filter(mask, size=(1, MASK_KERNEL))
    
    nonzero_after = np.count_nonzero(smoothed)
    
    print(f"Non-zero bin count before smoothing: {nonzero_before}")
    print(f"Non-zero bin count after smoothing: {nonzero_after}")
    return smoothed

def apply_harmonic_mask(magnitude_clean: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """
    Overlays the finalized harmonic mask tightly onto the signal magnitude array.
    """
    mean_energy_before = np.mean(magnitude_clean)
    
    result = magnitude_clean * mask
    
    mean_energy_after = np.mean(result)
    
    print(f"Mean energy before masking: {mean_energy_before:.6f}")
    print(f"Mean energy after masking: {mean_energy_after:.6f}")
    
    return result
