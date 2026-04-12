import os
import sys
import numpy as np
import scipy.signal
import librosa

# Add parent directory to path to allow direct import from config
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config import *

def apply_notch_filters(audio: np.ndarray, sr: int) -> np.ndarray:
    """
    Applies a series of notch filters to remove specific generator frequencies.
    ONLY intended for use when noise_type is 'generator' or 'mixed'.
    """
    filtered = audio.copy()
    n = 0
    for freq in GENERATOR_NOTCH_FREQS:
        # Generate the an IIR notch filter and apply it using filtfilt (zero-phase)
        b, a = scipy.signal.iirnotch(freq, Q=NOTCH_Q, fs=sr)
        filtered = scipy.signal.filtfilt(b, a, filtered)
        n += 1
        
    print(f"Applied {n} notch filters")
    return filtered

def extract_noise_reference(audio: np.ndarray, sr: int, call_start_time: float, call_end_time: float) -> np.ndarray:
    """
    Extracts a time window from the audio to use as a pure noise reference.
    """
    duration_s = len(audio) / sr
    
    # Primary: 2-second window before call start. Fallback if <0.5s available.
    if call_start_time >= 0.5:
        end_s = call_start_time
        start_s = max(0.0, end_s - NOISE_REF_DURATION)
    else:
        start_s = call_end_time
        end_s = min(duration_s, start_s + NOISE_REF_DURATION)
        
    start_sample = int(start_s * sr)
    end_sample = int(end_s * sr)
    
    print(f"Time window used: {start_s:.2f}s to {end_s:.2f}s")
    return audio[start_sample:end_sample]

def compute_noise_profile(noise_ref: np.ndarray, sr: int) -> np.ndarray:
    """
    Computes a noise profile by averaging STFT magnitudes over time.
    """
    # Note: sr is kept in signature as standard parameter though librosa STFT is based on N_FFT
    stft_matrix = librosa.stft(noise_ref, n_fft=N_FFT, hop_length=HOP_LENGTH, window=WINDOW)
    magnitude = np.abs(stft_matrix)
    
    # Calculate mean magnitude across time axis
    noise_profile = np.mean(magnitude, axis=1, keepdims=True)
    return noise_profile

def spectral_subtraction(magnitude: np.ndarray, noise_profile: np.ndarray) -> np.ndarray:
    """
    Applies spectral subtraction using a noise profile with an oversubtraction factor (ALPHA)
    and a spectral floor (BETA).
    """
    S_clean = np.maximum(magnitude - ALPHA * noise_profile, BETA * magnitude)
    
    # Safely compute mean reduction tracking to avoid zero-division issues
    with np.errstate(divide='ignore', invalid='ignore'):
        reduction = (magnitude - S_clean) / magnitude * 100
        reduction = np.nan_to_num(reduction, nan=0.0, posinf=0.0, neginf=0.0)
        
    mean_reduction = np.mean(reduction)
    print(f"Mean reduction percentage: {mean_reduction:.2f}%")
    
    return S_clean
