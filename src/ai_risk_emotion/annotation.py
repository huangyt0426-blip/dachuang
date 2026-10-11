"""Create annotation batches and measure annotator agreement."""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from .cleaning import clean_text, text_hash


ANNOTATION_COLUMNS = [
    "node_id",
    "event_id",
    "root_post_id",
    "text",
    "anger",
    "fear",
    "relevant",
    "responsibility_target",
    "avoidance",
    "information_seeking",
    "sarcasm",
    "risk_type",
    "annotator",
    "notes",
]


def _cohen_kappa(left: pd.Series, right: pd.Series) -> float:
    """Cohen's kappa for binary labels without a heavyweight dependency."""
    a = left.to_numpy(int)
    b = right.to_numpy(int)
    observed = float(np.mean(a == b))
    p_a = float(np.mean(a == 1))
    p_b = float(np.mean(b == 1))
    expected = p_a * p_b + (1 - p_a) * (1 - p_b)
    return 1.0 if expected == 1.0 and observed == 1.0 else (observed - expected) / (1 - expected)


def prepare_annotation_batch(nodes: pd.DataFrame, size: int, seed: int = 42) -> pd.DataFrame:
    required = {"node_id", "event_id", "root_post_id", "text_raw"}
    missing = required.difference(nodes.columns)
    if missing:
        raise ValueError(f"nodes missing columns: {sorted(missing)}")
    frame = nodes.copy()
    frame["text"] = frame["text_raw"].map(clean_text)
    frame = frame[frame["text"].ne("")].copy()
    frame["text_hash"] = frame["text"].map(text_hash)
    frame = frame.drop_duplicates("text_hash")
    sample_size = min(size, len(frame))
    frame = frame.sample(sample_size, random_state=seed).reset_index(drop=True)
    for column in ANNOTATION_COLUMNS:
        if column not in frame:
            frame[column] = ""
    return frame[ANNOTATION_COLUMNS]


def agreement(annotator_a: pd.DataFrame, annotator_b: pd.DataFrame) -> dict[str, float]:
    merged = annotator_a.merge(
        annotator_b, on="node_id", suffixes=("_a", "_b"), validate="one_to_one"
    )
    if merged.empty:
        raise ValueError("annotator files have no shared node_id")
    result = {}
    for label in ("anger", "fear", "relevant"):
        left = pd.to_numeric(merged[f"{label}_a"], errors="raise").astype(int)
        right = pd.to_numeric(merged[f"{label}_b"], errors="raise").astype(int)
        result[f"{label}_kappa"] = _cohen_kappa(left, right)
    result["minimum_kappa"] = min(result.values())
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    prepare = subparsers.add_parser("prepare")
    prepare.add_argument("--nodes", type=Path, required=True)
    prepare.add_argument("--output", type=Path, required=True)
    prepare.add_argument("--size", type=int, default=500)
    prepare.add_argument("--seed", type=int, default=42)
    score = subparsers.add_parser("agreement")
    score.add_argument("--annotator-a", type=Path, required=True)
    score.add_argument("--annotator-b", type=Path, required=True)
    args = parser.parse_args()
    if args.command == "prepare":
        output = prepare_annotation_batch(pd.read_csv(args.nodes), args.size, args.seed)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        output.to_csv(args.output, index=False)
        print(f"annotation rows={len(output)} output={args.output}")
    else:
        scores = agreement(pd.read_csv(args.annotator_a), pd.read_csv(args.annotator_b))
        print(" ".join(f"{key}={value:.4f}" for key, value in scores.items()))


if __name__ == "__main__":
    main()
