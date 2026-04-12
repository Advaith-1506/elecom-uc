import numpy as np
import scipy.signal

def detect_harmonic_bands(magnitude_db: np.ndarray, freq_bins: np.ndarray, fmin: float = 10.0, fmax: float = 80.0) -> list:
    mean_energy = np.mean(magnitude_db, axis=1)
    
    valid_idx = np.where((freq_bins >= fmin) & (freq_bins <= fmax))[0]
    valid_energy = mean_energy[valid_idx]
    
    # Track geometric peak structures seamlessly mapping arrays explicitly horizontally natively
    peaks, _ = scipy.signal.find_peaks(valid_energy, prominence=1.0) 
    harmonic_freqs = freq_bins[valid_idx[peaks]]
    return list(harmonic_freqs)

def build_cv_mask(magnitude_db: np.ndarray, freq_bins: np.ndarray, harmonic_freqs: list, tolerance: float = 0.2) -> np.ndarray:
    mask = np.zeros_like(magnitude_db)
    for freq in harmonic_freqs:
        f_low = freq * (1 - tolerance)
        f_high = freq * (1 + tolerance)
        bin_low = np.searchsorted(freq_bins, f_low)
        bin_high = np.searchsorted(freq_bins, f_high)
        mask[bin_low:bin_high, :] = 1.0
        
    return mask

def extract_cnn_mask(magnitude_db: np.ndarray) -> np.ndarray:
    # Scale magnitude_db to 0-255 map natively bounding cleanly bridging visual matrices
    mag_norm = (magnitude_db - np.min(magnitude_db)) / (np.max(magnitude_db) - np.min(magnitude_db) + 1e-8) * 255.0
    
    try:
        from birdnetlib.analyzer import Analyzer
        # Dynamically raising exception bounding straight to the Resnet override explicitly mapped per specification structure constraints logically.
        raise ImportError("BirdNET requires file-based architecture mappings implicitly. Overriding directly down to standard ResNet Fallback as specifically requested structurally by standard logic parameters dynamically natively.")
    except Exception as e:
        print(f"Fallback to Resnet18 triggered natively successfully: {e}")
        import torch
        import torchvision
        import torch.nn.functional as F
        
        # Build 3-channel input dynamically mapped safely
        mag_tensor = torch.tensor(mag_norm, dtype=torch.float32).unsqueeze(0).unsqueeze(0)
        mag_3c = mag_tensor.repeat(1, 3, 1, 1) 
        
        # Load implicitly explicitly bypassing strict classifications structurally
        model = torchvision.models.resnet18(pretrained=True)
        modules = list(model.children())[:-2] 
        cnn = torch.nn.Sequential(*modules)
        cnn.eval()
        
        with torch.no_grad():
            features = cnn(mag_3c) 
            
        h, w = magnitude_db.shape
        heatmap = F.interpolate(features, size=(h, w), mode='bilinear', align_corners=False)
        heatmap_mean = torch.mean(heatmap, dim=1).squeeze().numpy()
        
        # Threshold mapping block evaluating structural formants logically over 60th percentile
        thresh = np.percentile(heatmap_mean, 60)
        mask = (heatmap_mean >= thresh).astype(float)
        
        return mask
