import argparse
from pathlib import Path

import numpy as np
import pandas as pd


def split_by_group(frame: pd.DataFrame, group_column: str, seed: int = 42):
    """Split whole groups, preventing a cascade from leaking across sets."""
    if group_column not in frame:
        raise ValueError(f"Missing group column: {group_column}")
    events = np.asarray(frame[group_column].dropna().astype(str).unique(), dtype=object)
    if len(events) < 3:
        raise ValueError(f"At least three distinct {group_column} values are required")
    rng = np.random.default_rng(seed)
    rng.shuffle(events)
    train_end = max(1, round(len(events) * 0.7))
    validation_end = max(train_end + 1, round(len(events) * 0.85))
    validation_end = min(validation_end, len(events) - 1)
    train_events = set(events[:train_end])
    validation_events = set(events[train_end:validation_end])
    test_events = set(events[validation_end:])
    return (
        frame[frame[group_column].astype(str).isin(train_events)].copy(),
        frame[frame[group_column].astype(str).isin(validation_events)].copy(),
        frame[frame[group_column].astype(str).isin(test_events)].copy(),
    )


def split_by_event(frame: pd.DataFrame, seed: int = 42):
    return split_by_group(frame, "event_id", seed)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--group-column", default="root_post_id")
    args = parser.parse_args()
    frame = pd.read_csv(args.input)
    train, validation, test = split_by_group(frame, args.group_column, args.seed)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for name, subset in (("train", train), ("validation", validation), ("test", test)):
        subset.to_csv(args.output_dir / f"{name}.csv", index=False)
        print(
            f"{name}: rows={len(subset)} "
            f"groups={subset[args.group_column].nunique()} events={subset['event_id'].nunique()}"
        )


if __name__ == "__main__":
    main()
