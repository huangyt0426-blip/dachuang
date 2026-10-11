"""End-to-end metric calculation for collected Weibo research data."""

from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from .metrics import (
    aggregate_emotion,
    cascade_metrics,
    interaction_metrics,
    make_time_windows,
    temporal_metrics,
)
from .risk import build_risk_windows
from .schemas import validate_nodes, validate_posts, validate_predictions
from .statistics import compare_dominance_groups


def early_cascade_emotion(
    merged: pd.DataFrame,
    posts: pd.DataFrame,
    hours: int = 6,
    minimum_texts: int = 20,
    threshold: float = 0.60,
) -> pd.DataFrame:
    starts = posts[["post_id", "created_at"]].rename(
        columns={"post_id": "root_post_id", "created_at": "root_created_at"}
    )
    frame = merged.merge(starts, on="root_post_id", how="left", validate="many_to_one")
    if frame["root_created_at"].isna().any():
        missing = frame.loc[frame["root_created_at"].isna(), "root_post_id"].unique()
        raise ValueError(f"找不到根帖发布时间: {missing[:5].tolist()}")
    early = frame[
        (frame["created_at"] >= frame["root_created_at"])
        & (frame["created_at"] < frame["root_created_at"] + pd.Timedelta(hours=hours))
    ]
    result = aggregate_emotion(early, ["event_id", "root_post_id"], threshold)
    result["early_emotion_eligible"] = result["text_count"] >= minimum_texts
    result.loc[~result["early_emotion_eligible"], "dominance"] = "insufficient"
    return result


def run_analysis(
    posts: pd.DataFrame,
    nodes: pd.DataFrame,
    predictions: pd.DataFrame,
    frequency: str = "6h",
    threshold: float = 0.60,
) -> dict[str, pd.DataFrame]:
    posts = validate_posts(posts)
    nodes = validate_nodes(nodes)
    predictions = validate_predictions(predictions)
    merged = nodes.merge(predictions, on="node_id", validate="one_to_one")
    early = early_cascade_emotion(merged, posts, threshold=threshold)
    cascades = cascade_metrics(nodes).merge(early, on="root_post_id", how="left")
    interactions = interaction_metrics(posts, nodes).merge(
        early[["root_post_id", "dominance", "anger_share", "early_emotion_eligible"]],
        on="root_post_id",
        how="left",
    )
    windows = make_time_windows(merged, frequency, threshold)
    temporal = temporal_metrics(windows)
    topology_tests = compare_dominance_groups(
        cascades[cascades["early_emotion_eligible"].fillna(False)],
        ["cascade_size", "max_depth", "max_breadth", "first_level_ratio", "structural_virality"],
    )
    interaction_tests = compare_dominance_groups(
        interactions[interactions["early_emotion_eligible"].fillna(False)],
        ["comment_repost_ratio", "repost_share", "reply_rate", "comment_tree_max_depth"],
    )
    next_window_tests = compare_dominance_groups(
        windows,
        ["next_heat", "next_reposts", "next_comments"],
    )
    outputs = {
        "text_probabilities": merged,
        "cascade_metrics": cascades,
        "interaction_metrics": interactions,
        "time_windows": windows,
        "temporal_metrics": temporal,
        "h1_topology_tests": topology_tests,
        "h2_next_window_tests": next_window_tests,
        "h3_interaction_tests": interaction_tests,
    }
    if len(windows) >= 30:
        risk_windows, weights = build_risk_windows(windows)
        outputs["risk_windows"] = risk_windows
        outputs["entropy_weights"] = weights.rename_axis("indicator").reset_index()
    return outputs


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--posts", type=Path, required=True)
    parser.add_argument("--nodes", type=Path, required=True)
    parser.add_argument("--predictions", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--frequency", default="6h")
    parser.add_argument("--dominance-threshold", type=float, default=0.60)
    args = parser.parse_args()
    outputs = run_analysis(
        pd.read_csv(args.posts),
        pd.read_csv(args.nodes),
        pd.read_csv(args.predictions),
        args.frequency,
        args.dominance_threshold,
    )
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for name, frame in outputs.items():
        path = args.output_dir / f"{name}.csv"
        frame.to_csv(path, index=False)
        print(f"{name}: rows={len(frame)} output={path}")


if __name__ == "__main__":
    main()
