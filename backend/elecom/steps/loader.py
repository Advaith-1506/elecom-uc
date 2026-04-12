import os
import gdown
import librosa
import numpy as np
import pandas as pd

def mount_drive_and_download():
    os.makedirs('data/audio', exist_ok=True)
    
    # Download folder
    gdown.download_folder(id='1RKRHz8G7qIZdD4krAh3hW38sE3DuGurl', output='data/audio', quiet=False)
    
    # Download CSV
    gdown.download(id='1gbqgyP65u8ELlTJIOvQ5x9rxiysuNBeahS1svTRY1qo', output='data/calls.csv', quiet=False)
    
    total_files = 0
    total_size_bytes = 0
    
    audio_dir = 'data/audio'
    if os.path.exists(audio_dir):
        for root, dirs, files in os.walk(audio_dir):
            for file in files:
                if file.lower().endswith('.wav'):
                    total_files += 1
                    total_size_bytes += os.path.getsize(os.path.join(root, file))
                    
    csv_path = 'data/calls.csv'
    if os.path.exists(csv_path):
        total_files += 1
        total_size_bytes += os.path.getsize(csv_path)
        
    total_size_mb = total_size_bytes / (1024 * 1024)
    print(f"Total files downloaded: {total_files}")
    print(f"Total size: {total_size_mb:.2f} MB")

def load_audio(filepath: str) -> tuple[np.ndarray, int]:
    audio_array, sample_rate = librosa.load(filepath, sr=None, mono=True)
    
    duration = librosa.get_duration(y=audio_array, sr=sample_rate)
    file_size_mb = os.path.getsize(filepath) / (1024 * 1024)
    filename = os.path.basename(filepath)
    
    print(f"Filename: {filename}")
    print(f"Sample rate: {sample_rate} Hz")
    print(f"Duration: {duration:.2f} seconds")
    print(f"File size: {file_size_mb:.2f} MB")
    
    return audio_array, sample_rate

def load_spreadsheet(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    
    # Strip whitespace from all string columns
    for col in df.select_dtypes(['object', 'string']).columns:
        df[col] = df[col].str.strip()
        
    def parse_noise_type(filename):
        if not isinstance(filename, str):
            return "unknown"
            
        fname_lower = filename.lower()
        keywords = ["generator", "airplane", "vehicle", "background"]
        matches = [kw for kw in keywords if kw in fname_lower]
        
        if len(matches) > 1:
            return "mixed"
        elif len(matches) == 1:
            return matches[0]
        else:
            return "unknown"
            
    df['noise_type'] = df['Sound_file'].apply(parse_noise_type)
    
    print(f"Total rows: {len(df)}")
    print(f"Unique file count: {df['Sound_file'].nunique()}")
    
    print("\nnoise_type value_counts:")
    print(df['noise_type'].value_counts())
    
    # Handle possible variations in call_type column casing
    call_col = next((c for c in df.columns if c.lower() == 'call_type'), 'call_type')
    if call_col in df.columns:
        print(f"\n{call_col} value_counts:")
        print(df[call_col].value_counts())
        
    return df
