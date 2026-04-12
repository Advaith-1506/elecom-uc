import numpy as np
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import numba_compat  # noqa: F401
import librosa
import matplotlib.pyplot as plt
import librosa.display
import scipy.signal as signal

try:
    from config import *
except ImportError:
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    from config import *

def compute_stft(audio_segment: np.ndarray, sr: int):
    stft_matrix = librosa.stft(audio_segment, n_fft=N_FFT, hop_length=HOP_LENGTH, window=WINDOW)
    magnitude = np.abs(stft_matrix)
    phase = np.angle(stft_matrix)
    magnitude_db = librosa.amplitude_to_db(magnitude, ref=np.max)
    return stft_matrix, magnitude, phase, magnitude_db

def get_freq_bins(sr: int):
    freq_bins = librosa.fft_frequencies(sr=sr, n_fft=N_FFT)
    bin_min = np.argmin(np.abs(freq_bins - FREQ_MIN))
    bin_max = np.argmin(np.abs(freq_bins - FREQ_MAX))
    return freq_bins, bin_min, bin_max

def plot_spectrogram(magnitude_db: np.ndarray, sr: int, title: str, output_path: str, 
                     f0_contour: np.ndarray = None, cv_harmonics: list = None, 
                     active_segments: list = None, decision_text: str = None):
    plt.figure(figsize=(12, 6))
    librosa.display.specshow(magnitude_db, sr=sr, hop_length=HOP_LENGTH, x_axis='time', y_axis='log', cmap='magma', vmin=-80, vmax=0)
    plt.ylim(10, 80)
    plt.title(title, fontsize=14, pad=10)
    
    # Horizontal labels
    markers = [(10, 'f0 min'), (20, 'f0 max')]
    for freq, label in markers:
        plt.axhline(y=freq, color='w', linestyle='--', alpha=0.5)
        plt.text(0.1, freq, f" {label} ", color='white', va='center', backgroundcolor='black', fontsize=9)
        
    plt.grid(True, which="major", axis="both", color='gray', linestyle=':', alpha=0.5)
    
    # LPC smoothing
    power_spec = librosa.db_to_power(np.mean(magnitude_db, axis=1))
    r = np.fft.irfft(power_spec)
    
    try:
        a = librosa.lpc(r, order=8)
        _, h = signal.freqz(1, a, worN=len(power_spec))
        lpc_env = librosa.amplitude_to_db(np.abs(h))
        
        freqs = librosa.fft_frequencies(sr=sr, n_fft=N_FFT)
        num_frames = magnitude_db.shape[1]
        max_time = num_frames * HOP_LENGTH / sr
        
        scaled_env = (lpc_env - lpc_env.min()) / (lpc_env.max() - lpc_env.min() + 1e-6) * max_time * 0.8
        plt.plot(scaled_env, freqs, color='white', linewidth=2, label='LPC envelope')
    except Exception as e:
        print(f"LPC formulation failed cleanly: {e}")
        
    # CV structural horizontal tracks cleanly mapping geometric stripes natively bounded
    if cv_harmonics is not None:
        for f in cv_harmonics:
            plt.axhline(y=f, color='cyan', linestyle='-', alpha=0.5)
        if len(cv_harmonics) > 0:
            plt.plot([], [], color='cyan', linestyle='-', label='CV harmonics')
        
    # f0 trace mapping
    if f0_contour is not None:
        times = librosa.frames_to_time(np.arange(len(f0_contour)), sr=sr, hop_length=HOP_LENGTH)
        plt.plot(times, f0_contour, color='orange', linestyle=':', linewidth=2, label='f0 contour')
        
    # Semantic Overlays natively tracking regions dynamically seamlessly 
    if active_segments is not None:
        plotted_segment = False
        for s_start, s_end in active_segments:
            t_start = s_start / sr
            t_end = s_end / sr
            plt.axvspan(t_start, t_end, color='white', alpha=0.15, label='Active Segment' if not plotted_segment else "")
            plotted_segment = True
            
    if decision_text is not None:
        plt.text(0.02, 0.95, decision_text, transform=plt.gca().transAxes, 
                 color='yellow', fontsize=10, backgroundcolor='black', va='top')
                 
    plt.legend(loc='upper right')
    
    plt.colorbar(format='%+2.0f dB')
    plt.tight_layout()
    plt.savefig(output_path, dpi=200)
    plt.close()
