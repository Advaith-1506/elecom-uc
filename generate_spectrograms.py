import os
import json
import librosa
import numpy as np
import matplotlib.pyplot as plt
import librosa.display
import pandas as pd

def get_row(df, sel):
    res = df[df["Selection"] == sel]
    if len(res) > 0:
        return res.iloc[0]
    return None

def main():
    features_path = "backend/elecom/output/features/features.json"
    calls_csv_path = "backend/elecom/data/calls.csv"
    audio_dir = "backend/elecom/data/audio"
    cleaned_dir = "backend/elecom/output/audio"
    output_dir = "public/spectrograms"
    
    os.makedirs(output_dir, exist_ok=True)
    
    with open(features_path, "r") as f:
        features = json.load(f)
        
    df = pd.read_csv(calls_csv_path)
    
    plt.style.use('dark_background')
    
    for feat in features:
        sel = feat["selection"]
        sound_file = str(feat["sound_file"]).strip()
        noise_type = feat.get("noiseType", "unknown")
        f0 = feat.get("f0", 0.0)
        snrImprovement = feat.get("snrImprovement", 0.0)
        
        row = get_row(df, sel)
        if row is None: continue
            
        start_time = float(row["Start_time"])
        end_time = float(row["End_time"])
        
        raw_audio_path = os.path.join(audio_dir, sound_file)
        audio, sr = librosa.load(raw_audio_path, sr=None)
        
        start_sample = max(0, int((start_time - 0.5) * sr))
        end_sample = min(len(audio), int((end_time + 0.5) * sr))
        segment_before = audio[start_sample:end_sample]
        
        cleaned_audio_path = os.path.join(cleaned_dir, f"{sound_file}_call_{sel}_cleaned.wav")
        segment_after, sr_clean = librosa.load(cleaned_audio_path, sr=sr)
        
        if len(segment_before) != len(segment_after):
            min_len = min(len(segment_before), len(segment_after))
            segment_before = segment_before[:min_len]
            segment_after = segment_after[:min_len]
            
        n_fft = 8192
        hop_length = 512
        fmin = 10
        fmax = 500
        
        stft_before = librosa.stft(segment_before, n_fft=n_fft, hop_length=hop_length)
        mag_before = np.abs(stft_before)
        db_before = librosa.amplitude_to_db(mag_before, ref=np.max)
        
        stft_after = librosa.stft(segment_after, n_fft=n_fft, hop_length=hop_length)
        mag_after = np.abs(stft_after)
        db_after = librosa.amplitude_to_db(mag_after, ref=np.max)
        
        # Calculate diff DB (Before - After magnitude, scaled cleanly)
        diff_db = db_before - db_after
        
        def setup_plot():
            fig, ax = plt.subplots(figsize=(12, 5), dpi=180)
            fig.patch.set_facecolor('#0f1117')
            ax.set_facecolor('#0f1117')
            return fig, ax
            
        def finish_plot(fig, ax, img, title_text, title_color, is_diff=False):
            ax.spines['top'].set_visible(False)
            ax.spines['right'].set_visible(False)
            ax.set_xlabel("Time (s)", color='white')
            ax.set_ylabel("Frequency (Hz)", color='white')
            ax.tick_params(colors='white')
            
            # Harmonic overlay
            if not is_diff and f0 > 0:
                for k in range(1, 10):
                    harmonic_freq = f0 * k
                    if harmonic_freq > 500: break
                    ax.axhline(y=harmonic_freq, color='cyan', linewidth=0.8, alpha=0.7, linestyle='--')
                    if k == 1:
                        ax.text(0.01, harmonic_freq + 2, "f0 harmonics", color='cyan', fontsize=8, alpha=0.8)

            cbar = fig.colorbar(img, ax=ax, format='%+2.0f dB')
            cbar.set_label("dB", color='white')
            cbar.ax.yaxis.set_tick_params(color='white')
            cbar.outline.set_edgecolor('white')
            plt.setp(plt.getp(cbar.ax.axes, 'yticklabels'), color='white')
            
            ax.set_title(title_text, color=title_color, fontsize=11)
            plt.tight_layout(pad=0.5)
            
        # BEFORE IMAGE
        fig, ax = setup_plot()
        img = librosa.display.specshow(db_before, sr=sr, hop_length=hop_length, x_axis='time', y_axis='log', cmap='inferno', fmin=fmin, fmax=fmax, ax=ax)
        ax.text(0.02, 0.95, "BEFORE", transform=ax.transAxes, color='#ff4444', fontsize=11, fontweight='bold', bbox=dict(boxstyle='round,pad=0.3', facecolor='#1a0000', alpha=0.8), verticalalignment='top')
        finish_plot(fig, ax, img, f"NOISY — {noise_type} — Call {sel}", '#ff4444')
        plt.savefig(os.path.join(output_dir, f"{sel}_before.png"), dpi=180, facecolor='#0f1117')
        plt.close(fig)
        
        # AFTER IMAGE
        fig, ax = setup_plot()
        img = librosa.display.specshow(db_after, sr=sr, hop_length=hop_length, x_axis='time', y_axis='log', cmap='inferno', fmin=fmin, fmax=fmax, ax=ax)
        ax.text(0.02, 0.95, "AFTER", transform=ax.transAxes, color='#00ff88', fontsize=11, fontweight='bold', bbox=dict(boxstyle='round,pad=0.3', facecolor='#001a00', alpha=0.8), verticalalignment='top')
        ax.text(0.98, 0.05, f"SNR +{snrImprovement:.1f} dB", transform=ax.transAxes, color='#00ff88', fontsize=10, fontweight='bold', ha='right', bbox=dict(boxstyle='round,pad=0.3', facecolor='#001a00', alpha=0.8))
        finish_plot(fig, ax, img, f"CLEANED — {noise_type} — Call {sel}", '#00ff88')
        plt.savefig(os.path.join(output_dir, f"{sel}_after.png"), dpi=180, facecolor='#0f1117')
        plt.close(fig)
        
        # DIFFERENCE IMAGE
        fig, ax = setup_plot()
        img = librosa.display.specshow(diff_db, sr=sr, hop_length=hop_length, x_axis='time', y_axis='log', cmap='RdYlGn', fmin=fmin, fmax=fmax, ax=ax)
        ax.text(0.02, 0.95, "NOISE REMOVED", transform=ax.transAxes, color='#ffff00', fontsize=11, fontweight='bold', bbox=dict(boxstyle='round,pad=0.3', facecolor='#1a1a00', alpha=0.8), verticalalignment='top')
        finish_plot(fig, ax, img, f"Removed Noise — {noise_type} — Call {sel}", '#ffff00', is_diff=True)
        plt.savefig(os.path.join(output_dir, f"{sel}_diff.png"), dpi=180, facecolor='#0f1117')
        plt.close(fig)
        
        print(f"✓ Spectrograms saved for call {sel}")
        
if __name__ == '__main__':
    main()
