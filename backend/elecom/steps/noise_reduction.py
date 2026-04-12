import os
import sys
from typing import Optional
import numpy as np
import scipy.signal
import scipy.ndimage
import librosa
import noisereduce as nr

# Add parent directory to path to allow direct import from config
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config import *


def _clip(value: float, low: float, high: float) -> float:
    return float(np.clip(value, low, high))


def signal_energy_db(audio: np.ndarray) -> float:
    return float(20 * np.log10(np.sqrt(np.mean(np.square(audio))) + 1e-8))


def estimate_noise_stationarity(noise_reference: np.ndarray, sr: int) -> float:
    """
    Estimate stationarity by measuring normalized variance of the noise spectrum over time.
    Lower values imply a more stationary noise source.
    """
    if noise_reference is None or len(noise_reference) == 0:
        return 0.0

    stft_matrix = librosa.stft(noise_reference, n_fft=N_FFT, hop_length=HOP_LENGTH, window=WINDOW)
    magnitude = np.abs(stft_matrix)
    mean_spec = np.mean(magnitude, axis=1, keepdims=True)
    norm_var = np.var(magnitude / (mean_spec + 1e-8), axis=1)
    return float(np.mean(norm_var))


def adaptive_strength_from_stationarity(stationarity: float, low: float = STATIONARITY_LOW, high: float = STATIONARITY_HIGH) -> float:
    normalized = 1.0 - ((stationarity - low) / (high - low + 1e-8))
    return _clip(normalized, MIN_WIENER_STRENGTH, MAX_WIENER_STRENGTH)


def resolve_adaptive_params(noise_type: str, noise_reference: np.ndarray, sr: int, tune_config: Optional[dict] = None) -> dict:
    tune_config = tune_config or {}
    stationarity = estimate_noise_stationarity(noise_reference, sr)

    if noise_type in WIENER_STRENGTH_BY_NOISE:
        wiener_strength = WIENER_STRENGTH_BY_NOISE[noise_type]
        base_alpha = BLEND_ALPHA_BY_NOISE.get(noise_type, DEFAULT_BLEND_ALPHA)
    else:
        wiener_strength = adaptive_strength_from_stationarity(stationarity)
        base_alpha = _clip(0.55 + 0.35 * wiener_strength, MIN_BLEND_ALPHA, MAX_BLEND_ALPHA)

    wiener_strength *= float(tune_config.get("wiener_scale", 1.0))
    base_alpha *= float(tune_config.get("blend_scale", 1.0))

    return {
        "stationarity": stationarity,
        "wiener_strength": _clip(wiener_strength, MIN_WIENER_STRENGTH, MAX_WIENER_STRENGTH),
        "base_alpha": _clip(base_alpha, MIN_BLEND_ALPHA, MAX_BLEND_ALPHA),
    }

def apply_noisereduce(audio_segment: np.ndarray, noise_reference: np.ndarray, sr: int, noise_type: str = "unknown") -> np.ndarray:
    stationary_noise = noise_type in ("generator", "airplane")
    prop_decrease = 0.9 if noise_type == "generator" else 0.8

    cleaned = nr.reduce_noise(
        y=audio_segment,
        sr=sr,
        y_noise=noise_reference,
        prop_decrease=prop_decrease,
        stationary=stationary_noise
    )
    return cleaned

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

def detect_noise_frequency(audio: np.ndarray, sr: int, noise_type: str) -> np.ndarray:
    """
    Adaptive frequency filter logic utilizing Welch spectrum peaks dynamically explicitly targeted to properties natively filtering out noise bounds logically safely structurally.
    """
    if noise_type == "vehicle":
        f, Pxx = scipy.signal.welch(audio, fs=sr, nperseg=N_FFT)
        valid_idx = np.where((f >= 20) & (f <= 100))[0]
        if len(valid_idx) > 0:
            dom_idx = valid_idx[np.argmax(Pxx[valid_idx])]
            dom_f = f[dom_idx]
            b, a = scipy.signal.iirnotch(dom_f, Q=15, fs=sr)
            audio = scipy.signal.filtfilt(b, a, audio)
            print(f"Vehicle noise peak detected at {dom_f:.1f} Hz — removed")
            
    elif noise_type == "airplane":
        f, Pxx = scipy.signal.welch(audio, fs=sr, nperseg=N_FFT)
        valid_idx = np.where((f >= 50) & (f <= 200))[0]
        if len(valid_idx) > 0:
            valid_f = f[valid_idx]
            valid_Pxx = Pxx[valid_idx]
            peaks, _ = scipy.signal.find_peaks(valid_Pxx)
            if len(peaks) > 0:
                peak_Pxx = valid_Pxx[peaks]
                top_idx = np.argsort(peak_Pxx)[-3:]
                top_peaks = peaks[top_idx]
                for p in top_peaks:
                    dom_f = valid_f[p]
                    b, a = scipy.signal.iirnotch(dom_f, Q=20, fs=sr)
                    audio = scipy.signal.filtfilt(b, a, audio)
                    print(f"Airplane noise peak detected at {dom_f:.1f} Hz — removed")
                    
    return audio

def rumble_bandpass(audio: np.ndarray, sr: int, noise_type: str = "unknown") -> np.ndarray:
    """
    Preserve the low-frequency elephant rumble band while attenuating out-of-band noise.
    """
    low_hz, high_hz = RUMBLE_BAND_BY_NOISE.get(noise_type, (RUMBLE_BAND_LOW, RUMBLE_BAND_HIGH))
    nyquist = 0.5 * sr
    high_hz = min(high_hz, nyquist * 0.95)

    if low_hz <= 0 or low_hz >= high_hz:
        return audio

    sos = scipy.signal.butter(4, [low_hz, high_hz], btype="bandpass", fs=sr, output="sos")
    filtered = scipy.signal.sosfiltfilt(sos, audio)
    print(f"Applied rumble band-pass: {low_hz:.1f}-{high_hz:.1f} Hz")
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

def apply_wiener_postfilter(
    magnitude: np.ndarray,
    noise_profile: np.ndarray,
    noise_type: str = "unknown",
    noise_reference: Optional[np.ndarray] = None,
    sr: Optional[int] = None,
    tune_config: Optional[dict] = None,
) -> tuple[np.ndarray, dict]:
    """
    Apply a smooth Wiener-style gain after subtraction to reduce musical-noise artifacts.
    """
    sr = sr or 48000
    params = resolve_adaptive_params(noise_type, noise_reference, sr, tune_config=tune_config)
    power = magnitude ** 2
    noise_power = np.maximum(noise_profile ** 2, 1e-10)
    posterior_snr = np.maximum(power / noise_power - 1.0, 0.0)
    gain = posterior_snr / (posterior_snr + 1.0)
    gain = scipy.ndimage.gaussian_filter(gain, sigma=WIENER_SMOOTH_SIGMA)
    gain = np.clip(gain, WIENER_FLOOR, 1.0)
    adjusted_gain = 1.0 - params["wiener_strength"] * (1.0 - gain)
    adjusted_gain = np.clip(adjusted_gain, WIENER_FLOOR, 1.0)

    filtered = magnitude * adjusted_gain
    print(
        f"Wiener post-filter gain mean: {float(np.mean(adjusted_gain)):.4f} "
        f"(strength={params['wiener_strength']:.2f}, stationarity={params['stationarity']:.4f})"
    )
    return filtered, params


def align_signals(reference: np.ndarray, candidate: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    length = min(len(reference), len(candidate))
    return reference[:length], candidate[:length]


def blend_signals(
    original_audio: np.ndarray,
    filtered_audio: np.ndarray,
    base_alpha: float,
    harmonic_ratio: float,
    energy_drop_db: float,
    tune_config: Optional[dict] = None,
) -> tuple[np.ndarray, dict]:
    tune_config = tune_config or {}
    threshold = float(tune_config.get("harmonic_threshold", HARMONIC_RETENTION_THRESHOLD))

    alpha = base_alpha
    if harmonic_ratio < threshold:
        alpha *= max(0.45, harmonic_ratio / (threshold + 1e-8))
    if energy_drop_db > ENERGY_DROP_LIMIT_DB:
        alpha *= max(0.5, 1.0 - (energy_drop_db - ENERGY_DROP_LIMIT_DB) / 10.0)

    alpha = _clip(alpha, MIN_BLEND_ALPHA, MAX_BLEND_ALPHA)
    orig_aligned, filt_aligned = align_signals(original_audio, filtered_audio)
    blended = alpha * filt_aligned + (1.0 - alpha) * orig_aligned
    peak = np.max(np.abs(blended))
    if peak > 1e-8:
        blended = blended / peak

    return blended, {
        "blendAlpha": alpha,
        "harmonicRatio": harmonic_ratio,
        "energyDropDb": energy_drop_db,
    }
