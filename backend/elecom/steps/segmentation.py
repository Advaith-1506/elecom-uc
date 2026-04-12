import numpy as np

def detect_active_rumble_frames(f0_contour: np.ndarray, hop_length: int, sr: int) -> list:
    """
    Finds contiguous voiced frames where elephant is actually rumbling.
    Returns list of (start_sample, end_sample) tuples.
    Minimum segment length: 10 frames.
    """
    active_frames = ~np.isnan(f0_contour)
    # Find contiguous blocks of True
    # Pad with False to easily find rising and falling edges
    padded = np.concatenate(([False], active_frames, [False]))
    diffs = np.diff(padded.astype(int))
    starts = np.where(diffs == 1)[0]
    ends = np.where(diffs == -1)[0]
    
    segments = []
    for start, end in zip(starts, ends):
        if (end - start) >= 10:
            start_sample = start * hop_length
            end_sample = end * hop_length
            # If end is last frame, it might go slightly over the audio array, handled safely by split padding later
            segments.append((start_sample, end_sample))
            
    return segments

def split_active_segments(audio: np.ndarray, segments: list, sr: int, pad: float = 0.1) -> list:
    """
    Splits audio into active rumble clips only, appending padding correctly.
    Returns list of audio arrays.
    """
    pad_samples = int(pad * sr)
    clips = []
    
    for start_sample, end_sample in segments:
        s = max(0, start_sample - pad_samples)
        e = min(len(audio), end_sample + pad_samples)
        clips.append(audio[s:e])
        
    return clips
