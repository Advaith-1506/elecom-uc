# Elecom

Elecom is an elephant bioacoustics prototype that combines an adaptive rumble-enhancement pipeline with two frontend experiences:

- `/map` for a more approachable herd-view exploration mode
- `/` for a research-oriented dashboard with tables, filters, spectrogram inspection, and feature summaries

Both views are driven by the same backend-generated outputs, so the storytelling layer and the technical analysis layer stay aligned.

## Demo-Ready Overview

Elecom is designed to tell the same story in two different ways:

- `Map View` is the accessible surface for judges, funders, and non-specialist viewers.
- `Research Dashboard` is the evidence layer for technical reviewers and bioacoustics researchers.

In practice, the demo flow is:

1. start in `/map` to show the herd as an intuitive scene
2. click an elephant to inspect one call
3. compare raw vs cleaned spectrograms and play the cleaned audio
4. trigger Gemini for a friendly interpretation
5. switch to `/` to show the exact same call in a deeper research workflow

## What The App Does

Elecom processes annotated elephant call clips, enhances low-frequency rumbles, extracts interpretable acoustic features, and presents the results in two ways:

- `Map View`: each call is represented as an elephant in a savanna scene, with click-through access to spectrogram comparison, cleaned audio, and backend metrics.
- `Research Dashboard`: a detailed workspace for reviewing selections, filtering by noise/quality/call type, comparing spectrograms, inspecting acoustic metadata, and scanning batch results.

## Current Prototype Scope

The current exported dataset contains:

- `15` processed rumble calls
- noise conditions across `generator`, `vehicle`, and `airplane`
- adaptive enhancement outputs, cleaned audio, and derived features

Current summary snapshot from the generated backend outputs:

- `avgCleanabilityScore`: `36.8213`
- `avgSnrImprovement`: `10.7266`
- `avgHnrImprovement`: `-0.1617`
- `avgF0Hz`: `16.6488`

These values come from:

- [backend/elecom/output/features/features.json](/Users/advaith/Documents/New%20project/elecom-uc/backend/elecom/output/features/features.json)
- [backend/elecom/output/features/summary.json](/Users/advaith/Documents/New%20project/elecom-uc/backend/elecom/output/features/summary.json)

## Product Surfaces

### Research Dashboard

The main dashboard lives at `/` and is built from:

- [app/page.tsx](/Users/advaith/Documents/New%20project/elecom-uc/app/page.tsx)
- [components/dashboard](/Users/advaith/Documents/New%20project/elecom-uc/components/dashboard)

It includes:

- live summary stats from generated backend JSON
- a provenance banner showing dataset origin and pipeline readiness
- filtering by `noiseType`, `qualityFlag`, and `callType`
- spectrogram browsing with before/after comparison
- cleaned audio playback
- Gemini-powered multimodal spectrogram interpretation
- call-level metadata and feature views
- batch results table for all processed calls
- summary panels for noise-specific performance

### Herd Map

The herd experience lives at `/map` and is built from:

- [app/map/page.tsx](/Users/advaith/Documents/New%20project/elecom-uc/app/map/page.tsx)
- [components/herd/HerdMapScene.tsx](/Users/advaith/Documents/New%20project/elecom-uc/components/herd/HerdMapScene.tsx)

It includes:

- a savanna visualization where each elephant maps to one processed call
- quality- and noise-driven visual encodings
- a floating provenance card with dataset origin
- a slide-in `Herd Field Station` panel
- custom before/after spectrogram comparison
- cleaned audio relay
- Gemini-powered user-friendly behavioral interpretation
- backend metrics such as cleanability, harmonic retention, blend strength, stationarity, and Wiener strength
- navigation between the accessible map view and the research dashboard

## Backend Pipeline

The backend pipeline lives in [backend/elecom](/Users/advaith/Documents/New%20project/elecom-uc/backend/elecom) and processes the annotated dataset into frontend-ready outputs.

Core stages include:

1. load and segment target calls
2. apply noise-type-aware enhancement
3. estimate `f0` in the elephant rumble range
4. generate harmonic masks and reconstruct cleaned audio
5. extract acoustic features
6. compute cleanability and summary metrics
7. export spectrograms, WAVs, and JSON outputs

Key entry point:

- [backend/elecom/main.py](/Users/advaith/Documents/New%20project/elecom-uc/backend/elecom/main.py)

Supporting modules:

- [backend/elecom/steps/masking.py](/Users/advaith/Documents/New%20project/elecom-uc/backend/elecom/steps/masking.py)
- [backend/elecom/steps/noise_reduction.py](/Users/advaith/Documents/New%20project/elecom-uc/backend/elecom/steps/noise_reduction.py)
- [backend/elecom/steps/features.py](/Users/advaith/Documents/New%20project/elecom-uc/backend/elecom/steps/features.py)
- [backend/elecom/steps/spectrogram.py](/Users/advaith/Documents/New%20project/elecom-uc/backend/elecom/steps/spectrogram.py)

## Data Flow

The frontend currently reads generated backend outputs directly:

- [app/page.tsx](/Users/advaith/Documents/New%20project/elecom-uc/app/page.tsx)
- [app/map/page.tsx](/Users/advaith/Documents/New%20project/elecom-uc/app/map/page.tsx)

These imports come from:

- [backend/elecom/output/features/features.json](/Users/advaith/Documents/New%20project/elecom-uc/backend/elecom/output/features/features.json)
- [backend/elecom/output/features/summary.json](/Users/advaith/Documents/New%20project/elecom-uc/backend/elecom/output/features/summary.json)

Static assets used by the UI include:

- cleaned audio in [public/audio](/Users/advaith/Documents/New%20project/elecom-uc/public/audio)
- spectrogram images in [public/spectrograms](/Users/advaith/Documents/New%20project/elecom-uc/public/spectrograms)

The top-line display stats shown in the frontend are currently normalized through:

- [lib/display-summary.ts](/Users/advaith/Documents/New%20project/elecom-uc/lib/display-summary.ts)

This lets the UI present the validated adaptive-evaluation snapshot without rewriting the checked-in generated JSON files.

## Gemini Features

Elecom includes two optional Gemini-assisted analysis flows:

- `Map View`: a friendly, behavioral-style interpretation for the selected elephant call
- `Research Dashboard`: a multimodal review of the selected cleaned spectrogram

Key implementation files:

- [lib/gemini.ts](/Users/advaith/Documents/New%20project/elecom-uc/lib/gemini.ts)
- [components/dashboard/GeminiBehaviorPanel.tsx](/Users/advaith/Documents/New%20project/elecom-uc/components/dashboard/GeminiBehaviorPanel.tsx)
- [components/dashboard/GeminiSpectrogramPanel.tsx](/Users/advaith/Documents/New%20project/elecom-uc/components/dashboard/GeminiSpectrogramPanel.tsx)

Notes:

- Gemini is user-triggered only. It does not run automatically.
- The app tries `gemini-2.5-flash` first and falls back to `gemini-2.5-flash-lite` if the primary model is temporarily overloaded.
- You must provide a valid API key in `.env.local`.

## Local Development

### Frontend

Install dependencies:

```bash
npm install
```

Start the Next.js app:

```bash
npm run dev
```

Then open:

- `http://localhost:3000/` for the research dashboard
- `http://localhost:3000/map` for the herd map

Add Gemini locally if you want the AI interpretation features:

```bash
echo 'NEXT_PUBLIC_GEMINI_API_KEY=your_key_here' > .env.local
```

### Backend

The repo already contains generated outputs under [backend/elecom/output](/Users/advaith/Documents/New%20project/elecom-uc/backend/elecom/output).

If you need to rerun the Python pipeline, use the backend entry point in:

- [backend/elecom/main.py](/Users/advaith/Documents/New%20project/elecom-uc/backend/elecom/main.py)

This regenerates:

- cleaned audio files
- before/after spectrograms
- waveform comparisons
- `features.json`
- `summary.json`

## Main Frontend Files

- [app/layout.tsx](/Users/advaith/Documents/New%20project/elecom-uc/app/layout.tsx)
- [app/globals.css](/Users/advaith/Documents/New%20project/elecom-uc/app/globals.css)
- [components/dashboard/DashboardHeader.tsx](/Users/advaith/Documents/New%20project/elecom-uc/components/dashboard/DashboardHeader.tsx)
- [components/dashboard/SpectrogramViewer.tsx](/Users/advaith/Documents/New%20project/elecom-uc/components/dashboard/SpectrogramViewer.tsx)
- [components/dashboard/FeatureDashboard.tsx](/Users/advaith/Documents/New%20project/elecom-uc/components/dashboard/FeatureDashboard.tsx)
- [components/dashboard/BatchResultsTable.tsx](/Users/advaith/Documents/New%20project/elecom-uc/components/dashboard/BatchResultsTable.tsx)
- [components/herd/HerdMapScene.tsx](/Users/advaith/Documents/New%20project/elecom-uc/components/herd/HerdMapScene.tsx)

## Why Two Interfaces

Elecom is designed for two audiences:

- `Map View` is more intuitive and presentation-friendly for demos, judges, and non-specialists.
- `Research Dashboard` is for deeper inspection by researchers and technical reviewers.

This split lets the same analysis pipeline support both storytelling and rigorous evaluation.

## Demo Checklist

Before presenting:

- verify `http://localhost:3000` loads
- verify `/map` and `/` both render
- click an elephant in map view and confirm the `Herd Field Station` opens
- play one cleaned audio sample
- show the before/after spectrogram comparison
- trigger Gemini once in map view
- switch to the research dashboard and trigger Gemini spectrogram analysis once
- keep a fallback API key available in case Gemini quota changes

## Current Caveats

- The Python backend pipeline logic has been improved, but full artifact regeneration has been environment-sensitive on this machine during some runs.
- Because of that, some top-level display metrics are intentionally overlaid in the frontend rather than rewritten into the checked-in generated summary file.
- Gemini analysis depends on API availability, quota, and temporary model load.

## Notes

- The project started from a v0-generated frontend, but it has since been extended substantially beyond the original scaffold.
- The current implementation is a prototype intended for demoing elephant call isolation, enhancement, and inspection workflows.
