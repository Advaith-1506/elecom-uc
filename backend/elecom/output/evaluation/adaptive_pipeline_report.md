# Adaptive Pipeline Evaluation

Metric-only A/B evaluation against the last committed 15-call feature export. This run used the current backend logic with plotting/audio export disabled to avoid local librosa/numba environment issues during validation.

## Summary

- Avg cleanability: 36.8213 -> 46.5487 (+9.7273)
- Avg SNR improvement: 10.7266 -> 10.7193 (-0.0073 dB)
- Avg HNR improvement: -0.1617 -> 1.4352 (+1.5969 dB)
- Avg f0: 16.6488 -> 11.1352 (-5.5135 Hz)
- Multiple caller flags: 14 -> 0
- Calls improved: 12/15
- Calls degraded: 3/15

## By Noise Type

- airplane: delta cleanability +10.0140, delta SNR +0.2992 dB, delta f0 -2.1715 Hz
- generator: delta cleanability +10.6860, delta SNR -0.2356 dB, delta f0 -4.5510 Hz
- vehicle: delta cleanability +8.4820, delta SNR -0.0856 dB, delta f0 -9.8181 Hz

## Top Improved Calls

- Selection 16 (generator): cleanability +29.71, SNR -0.19, HNR +10.41, f0 -9.43
- Selection 3 (vehicle): cleanability +26.19, SNR -1.18, HNR +5.29, f0 -6.98
- Selection 19 (airplane): cleanability +19.49, SNR +0.05, HNR +0.00, f0 -10.86
- Selection 20 (airplane): cleanability +19.11, SNR -0.04, HNR +12.90, f0 -0.05
- Selection 2 (vehicle): cleanability +15.07, SNR +0.01, HNR -0.53, f0 -11.30

## Top Degraded Calls

- Selection 4 (vehicle): cleanability -3.02, SNR -0.46, HNR -2.04, f0 -7.76
- Selection 14 (generator): cleanability -1.28, SNR -0.01, HNR -1.04, f0 -5.86
- Selection 115 (airplane): cleanability -0.59, SNR +1.05, HNR -0.24, f0 -0.01
- Selection 1 (vehicle): cleanability +0.10, SNR +1.07, HNR -3.55, f0 -11.68
- Selection 5 (vehicle): cleanability +4.07, SNR +0.14, HNR +0.00, f0 -11.36
