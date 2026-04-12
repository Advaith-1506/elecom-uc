import numpy as np
import librosa
import matplotlib.pyplot as plt
import sys
import os

try:
    from config import *
except ImportError:
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    from config import *

def compute_stft(audio: np.ndarray, sr: int):
    stft_complex = librosa.stft(audio, n_fft=N_FFT, hop_length=HOP_LENGTH, window=WINDOW)
    magnitude, phase = np.abs(stft_complex), np.angle(stft_complex)
    magnitude_db = librosa.amplitude_to_db(magnitude, ref=np.max)
    return stft_complex, magnitude, phase, magnitude_db

def get_freq_bins(sr: int):
    freq_bins = librosa.fft_frequencies(sr=sr, n_fft=N_FFT)
    return freq_bins, float(freq_bins[0]), float(freq_bins[-1])

def plot_spectrogram(magnitude_db: np.ndarray, sr: int, title: str, output_path: str):
    plt.figure(figsize=(12, 6))
    librosa.display.specshow(magnitude_db, sr=sr, hop_length=HOP_LENGTH, x_axis='time', y_axis='linear', cmap='magma')
    plt.ylim(0, FREQ_MAX * 1.5)  # Add some padding around the top bound
    plt.title(title)
    plt.colorbar(format='%+2.0f dB')
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()
