"""Normalize the existing collection tables into the canonical schemas."""

from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from .schemas import validate_nodes, validate_posts


def normalize_posts(frame: pd.DataFrame) -> pd.DataFrame:
    result = frame.copy()
    aliases = {"text_preview": "text_raw"}
    for old, new in aliases.items():
        if new not in result and old in result:
            result[new] = result[old]
    if "collected_at" not in result:
        raise ValueError("posts require collected_at")
    canonical = validate_posts(result)
    return canonical


def normalize_nodes(frame: pd.DataFrame) -> pd.DataFrame:
    result = frame.copy()
    for column, default in {
        "event_id": "",
        "like_count": 0,
        "author_hash": "",
        "collected_at": "",
    }.items():
        if column not in result:
            result[column] = default
    return validate_nodes(result)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--posts", type=Path, required=True)
    parser.add_argument("--nodes", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    posts = normalize_posts(pd.read_csv(args.posts))
    nodes = normalize_nodes(pd.read_csv(args.nodes))
    args.output_dir.mkdir(parents=True, exist_ok=True)
    posts.to_csv(args.output_dir / "posts.csv", index=False)
    nodes.to_csv(args.output_dir / "nodes.csv", index=False)
    print(f"posts={len(posts)} nodes={len(nodes)} output={args.output_dir}")


if __name__ == "__main__":
    main()
