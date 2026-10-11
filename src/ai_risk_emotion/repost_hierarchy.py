"""Conservatively recover visible Weibo repost chains."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd


CHAIN_RE = re.compile(r"//@([^:：]+)[:：](.*)", re.S)


def _norm(text: object) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def recover_repost_hierarchy(frame: pd.DataFrame) -> pd.DataFrame:
    """Resolve a parent only when the quoted payload uniquely matches a visible node."""
    result = frame.copy()
    normalized = result["text_raw"].fillna("").map(_norm)
    text_to_ids: dict[str, list[str]] = {}
    for node_id, text in zip(result["node_id"].astype(str), normalized):
        if text and text != "转发微博":
            text_to_ids.setdefault(text, []).append(node_id)

    parent_ids, statuses, chain_flags = [], [], []
    for node_id, text in zip(result["node_id"].astype(str), normalized):
        match = CHAIN_RE.search(text)
        chain_flags.append(bool(match))
        if not match:
            parent_ids.append("")
            statuses.append("direct_or_unobservable")
            continue
        payload = _norm(match.group(2))
        matches = [candidate for candidate in text_to_ids.get(payload, []) if candidate != node_id]
        if len(matches) == 1:
            parent_ids.append(matches[0])
            statuses.append("resolved_exact_payload")
        elif len(matches) > 1:
            parent_ids.append("")
            statuses.append("ambiguous_payload")
        else:
            parent_ids.append("")
            statuses.append("parent_not_visible")

    result["has_repost_chain"] = chain_flags
    result["inferred_parent_node_id"] = parent_ids
    result["parent_resolution_status"] = statuses
    resolved = dict(zip(result["node_id"].astype(str), parent_ids))

    def depth_for(node_id: str) -> object:
        if not resolved.get(node_id):
            return 1
        seen, depth, current = {node_id}, 1, node_id
        while resolved.get(current):
            current = resolved[current]
            if current in seen:
                return pd.NA
            seen.add(current)
            depth += 1
        return depth

    result["inferred_depth"] = [depth_for(node_id) for node_id in result["node_id"].astype(str)]
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--multilevel-output", type=Path, required=True)
    args = parser.parse_args()
    result = recover_repost_hierarchy(pd.read_csv(args.input))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(args.output, index=False)
    multilevel = result[result["has_repost_chain"]].copy()
    args.multilevel_output.parent.mkdir(parents=True, exist_ok=True)
    multilevel.to_csv(args.multilevel_output, index=False)
    print(
        f"reposts={len(result)} chain_candidates={len(multilevel)} "
        f"resolved={(result.parent_resolution_status == 'resolved_exact_payload').sum()}"
    )


if __name__ == "__main__":
    main()
