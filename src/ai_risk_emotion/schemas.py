"""Canonical schemas and validators for the research pipeline."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import pandas as pd


NODE_TYPES = {"root_post", "repost", "comment", "reply"}
POST_COLUMNS = {
    "event_id",
    "topic",
    "post_id",
    "created_at",
    "text_raw",
    "author_hash",
    "author_type",
    "repost_count",
    "comment_count",
    "like_count",
    "collected_at",
}
NODE_COLUMNS = {
    "event_id",
    "root_post_id",
    "node_id",
    "parent_node_id",
    "node_type",
    "depth",
    "created_at",
    "text_raw",
    "like_count",
    "author_hash",
    "collected_at",
}
PREDICTION_COLUMNS = {"node_id", "p_anger", "p_fear"}


def _require(frame: pd.DataFrame, columns: Iterable[str], name: str) -> None:
    missing = set(columns).difference(frame.columns)
    if missing:
        raise ValueError(f"{name} missing columns: {sorted(missing)}")


def validate_posts(frame: pd.DataFrame) -> pd.DataFrame:
    """Validate and derive root-post interaction fields."""
    _require(frame, POST_COLUMNS, "posts")
    result = frame.copy()
    if result["post_id"].isna().any() or result["post_id"].duplicated().any():
        raise ValueError("post_id must be non-empty and unique")
    for column in ("repost_count", "comment_count", "like_count"):
        result[column] = pd.to_numeric(result[column], errors="raise").astype(int)
        if result[column].lt(0).any():
            raise ValueError(f"{column} cannot be negative")
    result["created_at"] = pd.to_datetime(result["created_at"], errors="raise")
    result["engagement_total"] = result[
        ["repost_count", "comment_count", "like_count"]
    ].sum(axis=1)
    result["comment_repost_ratio"] = result["comment_count"] / (
        result["repost_count"] + 1
    )
    result["repost_share"] = result["repost_count"] / (
        result["repost_count"] + result["comment_count"]
    ).replace(0, pd.NA)
    return result


def validate_nodes(frame: pd.DataFrame) -> pd.DataFrame:
    """Validate propagation nodes without inventing unavailable parents."""
    _require(frame, NODE_COLUMNS, "nodes")
    result = frame.copy()
    if result["node_id"].isna().any() or result["node_id"].duplicated().any():
        raise ValueError("node_id must be non-empty and unique")
    unknown_types = set(result["node_type"].dropna().astype(str)).difference(NODE_TYPES)
    if unknown_types:
        raise ValueError(f"unknown node_type values: {sorted(unknown_types)}")
    result["created_at"] = pd.to_datetime(result["created_at"], errors="raise")
    result["depth"] = pd.to_numeric(result["depth"], errors="raise").astype(int)
    result["like_count"] = pd.to_numeric(result["like_count"], errors="coerce").fillna(0).astype(int)
    if result["depth"].lt(0).any() or result["like_count"].lt(0).any():
        raise ValueError("depth and like_count cannot be negative")
    parent_ids = set(result["parent_node_id"].dropna().astype(str))
    node_ids = set(result["node_id"].astype(str))
    root_ids = set(result["root_post_id"].dropna().astype(str))
    missing_parents = parent_ids.difference(node_ids | root_ids)
    if missing_parents:
        raise ValueError(f"parent_node_id not found: {sorted(missing_parents)[:5]}")
    return result


def validate_predictions(frame: pd.DataFrame) -> pd.DataFrame:
    _require(frame, PREDICTION_COLUMNS, "predictions")
    result = frame.copy()
    for column in ("p_anger", "p_fear"):
        result[column] = pd.to_numeric(result[column], errors="raise")
        if result[column].lt(0).any() or result[column].gt(1).any():
            raise ValueError(f"{column} must be between 0 and 1")
    return result


@dataclass(frozen=True)
class Completeness:
    reported: int
    visible: int

    @property
    def hidden_gap(self) -> int:
        return max(0, self.reported - self.visible)

    @property
    def coverage(self) -> float:
        return 1.0 if self.reported == 0 else min(1.0, self.visible / self.reported)
