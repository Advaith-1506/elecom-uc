import json
import os
import tempfile
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

import config
import main as pipeline_main
from steps import loader


REPO_ROOT = Path(__file__).resolve().parent
BASELINE_FEATURES_PATH = REPO_ROOT / "output" / "features" / "features.json"
EVAL_ROOT = REPO_ROOT / "output" / "evaluation"
PLOTS_DIR = EVAL_ROOT / "plots"


def load_baseline_features() -> list[dict]:
    with open(BASELINE_FEATURES_PATH) as f:
        return json.load(f)


def build_baseline_map(baseline_features: list[dict]) -> dict:
    return {(int(item["selection"]), item["sound_file"]): item for item in baseline_features}


def compare_feature_sets(baseline_features: list[dict], new_features: list[dict]) -> tuple[pd.DataFrame, dict]:
    baseline_map = build_baseline_map(baseline_features)
    new_map = {(int(item["selection"]), item["sound_file"]): item for item in new_features}
    rows = []

    for key, baseline in baseline_map.items():
        if key not in new_map:
            continue
        new = new_map[key]
        old_harmonic = float(baseline.get("harmonicCount", 0.0))
        new_harmonic = float(new.get("harmonicCount", 0.0))
        old_energy = float(baseline.get("energyDb", 0.0))
        new_energy = float(new.get("energyDb", 0.0))
        harmonic_retention = float(new.get("harmonicRetention", 1.0))
        rows.append({
            "selection": int(new["selection"]),
            "sound_file": new["sound_file"],
            "noiseType": new.get("noiseType", "unknown"),
            "callType": new.get("callType", "unknown"),
            "old_cleanability": float(baseline.get("cleanabilityScore", 0.0)),
            "new_cleanability": float(new.get("cleanabilityScore", 0.0)),
            "delta_cleanability": float(new.get("cleanabilityScore", 0.0) - baseline.get("cleanabilityScore", 0.0)),
            "old_snrImprovement": float(baseline.get("snrImprovement", 0.0)),
            "new_snrImprovement": float(new.get("snrImprovement", 0.0)),
            "delta_snr": float(new.get("snrImprovement", 0.0) - baseline.get("snrImprovement", 0.0)),
            "old_hnrImprovement": float(baseline.get("hnrImprovement", 0.0)),
            "new_hnrImprovement": float(new.get("hnrImprovement", 0.0)),
            "delta_hnr": float(new.get("hnrImprovement", 0.0) - baseline.get("hnrImprovement", 0.0)),
            "old_hnrAfter": float(baseline.get("hnrAfter", 0.0)),
            "new_hnrAfter": float(new.get("hnrAfter", 0.0)),
            "old_harmonicCount": old_harmonic,
            "new_harmonicCount": new_harmonic,
            "delta_harmonicCount": float(new_harmonic - old_harmonic),
            "old_energyDb": old_energy,
            "new_energyDb": new_energy,
            "delta_energyDb": float(new_energy - old_energy),
            "new_harmonicRetention": harmonic_retention,
            "new_harmonicCountPreFilter": float(new.get("harmonicCountPreFilter", new_harmonic)),
            "new_blendAlpha": float(new.get("blendAlpha", 1.0)),
            "new_wienerStrength": float(new.get("wienerStrength", 0.0)),
            "new_noiseStationarity": float(new.get("noiseStationarity", 0.0)),
        })

    df = pd.DataFrame(rows).sort_values("selection").reset_index(drop=True)
    corr = float(np.corrcoef(df["old_cleanability"], df["new_cleanability"])[0, 1]) if len(df) > 1 else 1.0

    delta_stats = {}
    for col in ["delta_cleanability", "delta_snr", "delta_hnr", "delta_harmonicCount", "delta_energyDb"]:
        delta_stats[col] = {
            "mean": float(df[col].mean()),
            "median": float(df[col].median()),
            "std": float(df[col].std(ddof=1)) if len(df) > 1 else 0.0,
        }

    severe_degradation_pct = float((df["delta_cleanability"] <= -10.0).mean() * 100.0)
    harmonic_flag_pct = float(((df["new_harmonicRetention"] < 0.7) | (df["delta_harmonicCount"] <= -3)).mean() * 100.0)
    energy_flag_pct = float((df["delta_energyDb"] <= -3.0).mean() * 100.0)
    improved_pct = float((df["delta_cleanability"] > 0.0).mean() * 100.0)
    degraded_pct = float((df["delta_cleanability"] < 0.0).mean() * 100.0)

    objective = (
        delta_stats["delta_cleanability"]["mean"]
        + 0.45 * delta_stats["delta_snr"]["mean"]
        + 0.30 * delta_stats["delta_hnr"]["mean"]
        + 0.08 * improved_pct
        - 0.40 * max(0.0, -delta_stats["delta_harmonicCount"]["mean"])
        - 0.15 * severe_degradation_pct
        - 0.08 * harmonic_flag_pct
        - 0.05 * energy_flag_pct
    )

    metrics = {
        "rows": int(len(df)),
        "correlation_old_new_cleanability": corr,
        "improved_pct": improved_pct,
        "degraded_pct": degraded_pct,
        "severe_degradation_pct": severe_degradation_pct,
        "harmonic_flag_pct": harmonic_flag_pct,
        "energy_flag_pct": energy_flag_pct,
        "delta_stats": delta_stats,
        "objective": float(objective),
        "by_noise": df.groupby("noiseType")[["delta_cleanability", "delta_snr", "delta_hnr", "delta_harmonicCount", "delta_energyDb", "new_harmonicRetention"]].mean().round(4).to_dict(orient="index"),
    }
    return df, metrics


def make_plots(df: pd.DataFrame) -> None:
    PLOTS_DIR.mkdir(parents=True, exist_ok=True)

    plt.figure(figsize=(8, 5))
    plt.hist(df["old_cleanability"], bins=10, alpha=0.6, label="Old", color="#ff6b35")
    plt.hist(df["new_cleanability"], bins=10, alpha=0.6, label="New", color="#00ff88")
    plt.xlabel("Cleanability")
    plt.ylabel("Count")
    plt.legend()
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / "hist_cleanability.png", dpi=160)
    plt.close()

    plt.figure(figsize=(6, 6))
    plt.scatter(df["old_cleanability"], df["new_cleanability"], c="#7b2fff")
    min_lim = min(df["old_cleanability"].min(), df["new_cleanability"].min()) - 2
    max_lim = max(df["old_cleanability"].max(), df["new_cleanability"].max()) + 2
    plt.plot([min_lim, max_lim], [min_lim, max_lim], "--", color="gray")
    plt.xlabel("Old cleanability")
    plt.ylabel("New cleanability")
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / "scatter_old_vs_new_cleanability.png", dpi=160)
    plt.close()

    plt.figure(figsize=(8, 5))
    plt.scatter(df["old_snrImprovement"], df["old_cleanability"], c="#ff6b35", label="Old")
    plt.scatter(df["new_snrImprovement"], df["new_cleanability"], c="#00ff88", label="New")
    plt.xlabel("SNR Improvement")
    plt.ylabel("Cleanability")
    plt.legend()
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / "scatter_snr_vs_cleanability.png", dpi=160)
    plt.close()

    plt.figure(figsize=(8, 5))
    bins = np.arange(df["delta_harmonicCount"].min() - 0.5, df["delta_harmonicCount"].max() + 1.5, 1)
    plt.hist(df["delta_harmonicCount"], bins=bins, color="#7b2fff")
    plt.xlabel("HarmonicCount change")
    plt.ylabel("Count")
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / "hist_harmonic_change.png", dpi=160)
    plt.close()


def evaluate_config(df: pd.DataFrame, baseline_features: list[dict], output_root: str, tune_config: dict) -> dict:
    with open(os.devnull, "w") as sink, redirect_stdout(sink), redirect_stderr(sink):
        new_features, failed, _ = pipeline_main.run_batch_pipeline(
            df,
            output_root=output_root,
            generate_plots=False,
            save_outputs=False,
            tune_config=tune_config,
            force_recompute=True,
        )
    _, metrics = compare_feature_sets(baseline_features, new_features)
    return {
        "config": tune_config,
        "metrics": metrics,
        "failed": len(failed),
    }


def run_tuning(df: pd.DataFrame, baseline_features: list[dict]) -> tuple[dict, list[dict]]:
    tuning_results = []
    stage_candidates = [
        ("wiener_scale", config.TUNING_WIENER_SCALES),
        ("blend_scale", config.TUNING_BLEND_SCALES),
        ("harmonic_threshold", config.TUNING_HARMONIC_THRESHOLDS),
    ]
    current = {
        "wiener_scale": 1.0,
        "blend_scale": 1.0,
        "harmonic_threshold": config.HARMONIC_RETENTION_THRESHOLD,
    }
    with tempfile.TemporaryDirectory(prefix="elecom_tune_") as temp_root:
        run_index = 0
        total_runs = sum(len(values) for _, values in stage_candidates)
        for stage_name, values in stage_candidates:
            stage_results = []
            for value in values:
                run_index += 1
                candidate = dict(current)
                candidate[stage_name] = float(value)
                output_root = os.path.join(temp_root, f"config_{run_index:02d}")
                result = evaluate_config(df, baseline_features, output_root, candidate)
                tuning_results.append(result)
                stage_results.append(result)
                with open(EVAL_ROOT / "tuning_results.partial.json", "w") as f:
                    json.dump(tuning_results, f, indent=2)
                print(
                    f"TUNE {run_index:02d}/{total_runs} "
                    f"stage={stage_name} value={value} "
                    f"objective={result['metrics']['objective']:.3f} "
                    f"delta_cleanability={result['metrics']['delta_stats']['delta_cleanability']['mean']:.3f} "
                    f"harmonic_flag_pct={result['metrics']['harmonic_flag_pct']:.1f}",
                    flush=True,
                )
            best_stage = max(stage_results, key=lambda item: item["metrics"]["objective"])
            current = dict(best_stage["config"])

    best = max(tuning_results, key=lambda item: item["metrics"]["objective"])
    return best, tuning_results


def enrich_report(df: pd.DataFrame, metrics: dict) -> dict:
    top_improved = df.sort_values("delta_cleanability", ascending=False).head(10)
    top_degraded = df.sort_values("delta_cleanability").head(10)
    false_improvements = df[
        (df["delta_cleanability"] > 8.0) &
        ((df["delta_snr"] < 0.0) | (df["delta_hnr"] < 0.0))
    ].sort_values("delta_cleanability", ascending=False).head(10)
    hidden_improvements = df[
        (df["delta_cleanability"] < -8.0) &
        ((df["delta_snr"] > 0.0) | (df["delta_hnr"] > 0.0))
    ].sort_values("delta_cleanability").head(10)
    over_smoothed = df[
        (df["new_harmonicRetention"] < 0.7) |
        (df["delta_harmonicCount"] <= -3.0) |
        (df["delta_energyDb"] <= -3.0)
    ].sort_values(["delta_harmonicCount", "delta_energyDb"])

    metrics["top_improved"] = top_improved[[
        "selection", "noiseType", "delta_cleanability", "delta_snr", "delta_hnr",
        "delta_harmonicCount", "delta_energyDb", "new_harmonicRetention"
    ]].to_dict(orient="records")
    metrics["top_degraded"] = top_degraded[[
        "selection", "noiseType", "delta_cleanability", "delta_snr", "delta_hnr",
        "delta_harmonicCount", "delta_energyDb", "new_harmonicRetention"
    ]].to_dict(orient="records")
    metrics["false_improvements"] = false_improvements[[
        "selection", "noiseType", "delta_cleanability", "delta_snr", "delta_hnr"
    ]].to_dict(orient="records")
    metrics["hidden_improvements"] = hidden_improvements[[
        "selection", "noiseType", "delta_cleanability", "delta_snr", "delta_hnr"
    ]].to_dict(orient="records")
    metrics["over_smoothed"] = over_smoothed[[
        "selection", "noiseType", "delta_harmonicCount", "delta_energyDb", "new_harmonicRetention"
    ]].to_dict(orient="records")
    return metrics


def main():
    os.makedirs(EVAL_ROOT, exist_ok=True)
    baseline_features = load_baseline_features()
    with open(REPO_ROOT / "output" / "features" / "summary.json") as f:
        baseline_summary = json.load(f)
    with open(EVAL_ROOT / "baseline_features_snapshot.json", "w") as f:
        json.dump(baseline_features, f, indent=2)
    with open(EVAL_ROOT / "baseline_summary_snapshot.json", "w") as f:
        json.dump(baseline_summary, f, indent=2)

    df = loader.load_spreadsheet("data/calls.csv")
    best, tuning_results = run_tuning(df, baseline_features)

    best_config = best["config"]
    with open(EVAL_ROOT / "tuning_results.json", "w") as f:
        json.dump(tuning_results, f, indent=2)

    with open(os.devnull, "w") as sink, redirect_stdout(sink), redirect_stderr(sink):
        new_features, failed, summary = pipeline_main.run_batch_pipeline(
            df,
            output_root="output",
            generate_plots=True,
            save_outputs=True,
            tune_config=best_config,
            force_recompute=True,
        )

    df_compare, metrics = compare_feature_sets(baseline_features, new_features)
    metrics = enrich_report(df_compare, metrics)
    metrics["best_config"] = best_config
    metrics["pipeline_failed"] = len(failed)
    metrics["new_summary"] = summary
    metrics["old_summary"] = baseline_summary

    df_compare.to_csv(EVAL_ROOT / "ab_per_call.csv", index=False)
    with open(EVAL_ROOT / "ab_report.json", "w") as f:
        json.dump(metrics, f, indent=2)

    make_plots(df_compare)

    print(json.dumps({
        "best_config": best_config,
        "objective": metrics["objective"],
        "delta_cleanability_mean": metrics["delta_stats"]["delta_cleanability"]["mean"],
        "delta_snr_mean": metrics["delta_stats"]["delta_snr"]["mean"],
        "delta_hnr_mean": metrics["delta_stats"]["delta_hnr"]["mean"],
        "delta_harmonic_mean": metrics["delta_stats"]["delta_harmonicCount"]["mean"],
        "improved_pct": metrics["improved_pct"],
        "degraded_pct": metrics["degraded_pct"],
        "harmonic_flag_pct": metrics["harmonic_flag_pct"],
        "severe_degradation_pct": metrics["severe_degradation_pct"],
    }, indent=2))


if __name__ == "__main__":
    main()
