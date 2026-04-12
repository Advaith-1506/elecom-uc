import os
import sys
import numpy as np
import librosa
import soundfile as sf
import matplotlib.pyplot as plt

# Load config correctly regardless of where the file is imported from
try:
    from config import *
except ImportError:
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    from config import *

def reconstruct_audio(masked_magnitude: np.ndarray, original_phase: np.ndarray, sr: int) -> np.ndarray:
    """
    Reconstructs the time-domain audio signal from the masked magnitude and original phase.
    """
    # Multiply the magnitude by the complex exponentiation of the phase 
    stft_reconstructed = masked_magnitude * np.exp(1j * original_phase)
    
    # Run the inverse STFT to convert back to a 1D time domain array
    audio = librosa.istft(stft_reconstructed, hop_length=HOP_LENGTH, window=WINDOW)
    
    # Normalize the final result
    audio = audio / (np.max(np.abs(audio)) + 1e-8)
    
    duration = len(audio) / sr
    max_amp = np.max(np.abs(audio))
    
    print(f"Duration in seconds: {duration:.2f}")
    print(f"Max amplitude: {max_amp:.6f}")
    
    return audio

def save_audio(audio: np.ndarray, sr: int, output_path: str):
    """
    Saves the processed numpy audio array back to disk as a WAV file.
    """
    sf.write(output_path, audio, sr)
    print(f"Saved → {output_path}")

def compute_snr_improvement(original_audio: np.ndarray, cleaned_audio: np.ndarray, call_start: float, call_end: float, sr: int) -> dict:
    """
    Calculates SNR before and after applying noise reduction, based on the call window and surrounding noise.
    """
    start_idx = int(call_start * sr)
    end_idx = int(call_end * sr)
    
    def get_snr(audio: np.ndarray) -> float:
        # Separate the actual call window from the surrounding noise
        signal = audio[start_idx:end_idx]
        noise_pre = audio[:start_idx]
        noise_post = audio[end_idx:]
        noise = np.concatenate((noise_pre, noise_post))
        
        # Guard against fully filled window without noise
        signal_rms = np.sqrt(np.mean(signal**2)) if len(signal) > 0 else 0.0
        noise_rms = np.sqrt(np.mean(noise**2)) if len(noise) > 0 else 0.0
        
        # Calculate SNR db
        snr = 20 * np.log10(signal_rms / (noise_rms + 1e-8))
        return snr

    snr_before = get_snr(original_audio)
    snr_after = get_snr(cleaned_audio)
    
    return {
        "snr_before_db": float(snr_before),
        "snr_after_db": float(snr_after),
        "snr_improvement_db": float(snr_after - snr_before)
    }

def plot_waveform_comparison(original: np.ndarray, cleaned: np.ndarray, sr: int, call_start: float, call_end: float, output_path: str):
    """
    Generates a high-quality visualization comparing original and finalized audio signals.
    """
    time_orig = np.arange(len(original)) / sr
    time_clean = np.arange(len(cleaned)) / sr
    
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 6), sharex=True)
    
    # Plot Original Audio
    ax1.plot(time_orig, original, color='blue', alpha=0.7)
    ax1.set_title("Original Waveform")
    ax1.axvspan(call_start, call_end, color='green', alpha=0.2, label='Call Region')
    ax1.axvline(call_start, color='red', linestyle='--')
    ax1.axvline(call_end, color='red', linestyle='--')
    ax1.set_ylabel("Amplitude")
    ax1.legend(loc='upper right')
    
    # Plot Final Audio
    ax2.plot(time_clean, cleaned, color='orange', alpha=0.7)
    ax2.set_title("Cleaned Waveform")
    ax2.axvspan(call_start, call_end, color='green', alpha=0.2, label='Call Region')
    ax2.axvline(call_start, color='red', linestyle='--')
    ax2.axvline(call_end, color='red', linestyle='--')
    ax2.set_xlabel("Time (seconds)")
    ax2.set_ylabel("Amplitude")
    ax2.legend(loc='upper right')
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()
