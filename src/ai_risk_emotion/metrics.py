"""Emotion dominance, cascade, temporal, and interaction metrics."""

from __future__ import annotations

from collections import Counter, defaultdict, deque
from typing import Iterable

import numpy as np
import pandas as pd


def dominance_label(
    p_anger: float,
    p_fear: float,
    threshold: float = 0.60,
    low_emotion_threshold: float = 0.40,
) -> str:
    """Classify an aggregate without forcing low-emotion text into anger/fear."""
    if pd.isna(p_anger) or pd.isna(p_fear):
        return "other"
    if p_anger < low_emotion_threshold and p_fear < low_emotion_threshold:
        return "other"
    total = p_anger + p_fear
    if total <= 0:
        return "other"
    share = p_anger / total
    if share >= threshold:
        return "anger"
    if share <= 1 - threshold:
        return "fear"
    return "mixed"


def aggregate_emotion(
    frame: pd.DataFrame,
    group_columns: Iterable[str],
    threshold: float = 0.60,
) -> pd.DataFrame:
    grouped = frame.groupby(list(group_columns), dropna=False).agg(
        text_count=("node_id", "count"),
        anger_sum=("p_anger", "sum"),
        fear_sum=("p_fear", "sum"),
        anger_mean=("p_anger", "mean"),
        fear_mean=("p_fear", "mean"),
    )
    grouped = grouped.reset_index()
    total = grouped["anger_sum"] + grouped["fear_sum"]
    grouped["anger_share"] = grouped["anger_sum"] / total.replace(0, np.nan)
    grouped["dominance"] = [
        dominance_label(a, f, threshold) for a, f in zip(grouped.anger_mean, grouped.fear_mean)
    ]
    grouped["polarization"] = 4 * grouped["anger_share"] * (1 - grouped["anger_share"])
    return grouped


def interaction_metrics(posts: pd.DataFrame, nodes: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for post in posts.itertuples(index=False):
        cascade = nodes[nodes["root_post_id"].astype(str) == str(post.post_id)]
        comments = cascade[cascade["node_type"].isin(["comment", "reply"])]
        replies = cascade[cascade["node_type"].eq("reply")]
        denominator = int(post.repost_count) + int(post.comment_count)
        rows.append(
            {
                "event_id": post.event_id,
                "root_post_id": post.post_id,
                "engagement_total": int(post.repost_count)
                + int(post.comment_count)
                + int(post.like_count),
                "comment_repost_ratio": int(post.comment_count) / (int(post.repost_count) + 1),
                "repost_share": int(post.repost_count) / denominator if denominator else np.nan,
                "reply_rate": len(replies) / len(comments) if len(comments) else np.nan,
                "comment_tree_max_depth": int(comments["depth"].max()) if len(comments) else 0,
                "comment_tree_mean_depth": float(comments["depth"].mean()) if len(comments) else 0.0,
            }
        )
    return pd.DataFrame(rows)


def _all_pair_mean_distance(adjacency: dict[str, set[str]], nodes: list[str]) -> float:
    if len(nodes) < 2:
        return 0.0
    total = 0
    pairs = 0
    for index, start in enumerate(nodes):
        distances = {start: 0}
        queue = deque([start])
        while queue:
            current = queue.popleft()
            for neighbor in adjacency[current]:
                if neighbor not in distances:
                    distances[neighbor] = distances[current] + 1
                    queue.append(neighbor)
        for target in nodes[index + 1 :]:
            if target not in distances:
                return np.nan
            total += distances[target]
            pairs += 1
    return total / pairs


def cascade_metrics(nodes: pd.DataFrame, minimum_parent_coverage: float = 0.70) -> pd.DataFrame:
    """Compute repost-tree metrics; comments never become repost edges."""
    rows = []
    for root_id, group in nodes.groupby("root_post_id"):
        reposts = group[group["node_type"].eq("repost")].copy()
        all_ids = set(reposts["node_id"].astype(str)) | {str(root_id)}
        known = reposts["parent_node_id"].astype(str).isin(all_ids)
        coverage = float(known.mean()) if len(reposts) else 1.0
        adjacency: dict[str, set[str]] = defaultdict(set)
        depth_counts = Counter({0: 1})
        for row in reposts.itertuples(index=False):
            child = str(row.node_id)
            parent = str(row.parent_node_id)
            depth_counts[int(row.depth)] += 1
            if parent in all_ids:
                adjacency[parent].add(child)
                adjacency[child].add(parent)
        adjacency[str(root_id)]
        node_list = sorted(all_ids)
        structural_virality = (
            _all_pair_mean_distance(adjacency, node_list)
            if coverage >= minimum_parent_coverage
            else np.nan
        )
        first_level = int((reposts["depth"] == 1).sum())
        rows.append(
            {
                "root_post_id": root_id,
                "cascade_size": len(reposts) + 1,
                "max_depth": int(reposts["depth"].max()) if len(reposts) else 0,
                "max_breadth": max(depth_counts.values()),
                "first_level_ratio": first_level / len(reposts) if len(reposts) else np.nan,
                "parent_coverage": coverage,
                "structural_virality": structural_virality,
                "topology_eligible": bool(
                    coverage >= minimum_parent_coverage and not np.isnan(structural_virality)
                ),
            }
        )
    return pd.DataFrame(rows)


def make_time_windows(
    nodes_with_predictions: pd.DataFrame,
    frequency: str = "6h",
    threshold: float = 0.60,
) -> pd.DataFrame:
    frame = nodes_with_predictions.copy()
    frame["created_at"] = pd.to_datetime(frame["created_at"], errors="raise")
    frame["window_start"] = frame["created_at"].dt.floor(frequency)
    frame["is_repost"] = frame["node_type"].eq("repost").astype(int)
    frame["is_comment"] = frame["node_type"].isin(["comment", "reply"]).astype(int)
    windows = frame.groupby(["event_id", "window_start"], as_index=False).agg(
        text_count=("node_id", "count"),
        new_reposts=("is_repost", "sum"),
        new_comments=("is_comment", "sum"),
        anger_sum=("p_anger", "sum"),
        fear_sum=("p_fear", "sum"),
        anger_mean=("p_anger", "mean"),
        fear_mean=("p_fear", "mean"),
    )
    windows["heat"] = windows["new_reposts"] + windows["new_comments"]
    complete = []
    for event_id, event_frame in windows.groupby("event_id", sort=False):
        full_index = pd.date_range(
            event_frame["window_start"].min(),
            event_frame["window_start"].max(),
            freq=frequency,
        )
        event_frame = event_frame.set_index("window_start").reindex(full_index)
        event_frame.index.name = "window_start"
        event_frame["event_id"] = event_id
        for column in ["text_count", "new_reposts", "new_comments", "heat"]:
            event_frame[column] = event_frame[column].fillna(0).astype(int)
        for column in ["anger_sum", "fear_sum", "anger_mean", "fear_mean"]:
            event_frame[column] = event_frame[column].fillna(0.0)
        complete.append(event_frame.reset_index())
    windows = pd.concat(complete, ignore_index=True)
    total = windows["anger_sum"] + windows["fear_sum"]
    windows["anger_share"] = windows["anger_sum"] / total.replace(0, np.nan)
    windows["dominance"] = [
        dominance_label(a, f, threshold) for a, f in zip(windows.anger_mean, windows.fear_mean)
    ]
    windows["polarization"] = 4 * windows["anger_share"] * (1 - windows["anger_share"])
    windows["next_heat"] = windows.groupby("event_id")["heat"].shift(-1)
    windows["next_reposts"] = windows.groupby("event_id")["new_reposts"].shift(-1)
    windows["next_comments"] = windows.groupby("event_id")["new_comments"].shift(-1)
    return windows


def _half_life(values: np.ndarray, timestamps: pd.Series) -> float:
    if len(values) < 3 or np.nanmax(values) <= 0:
        return np.nan
    peak_index = int(np.nanargmax(values))
    threshold = values[peak_index] / 2
    for index in range(peak_index + 1, len(values) - 1):
        if values[index] <= threshold and values[index + 1] <= threshold:
            delta = timestamps.iloc[index] - timestamps.iloc[peak_index]
            return delta.total_seconds() / 3600
    return np.nan


def temporal_metrics(windows: pd.DataFrame, tail_hours: int = 24) -> pd.DataFrame:
    rows = []
    for event_id, group in windows.sort_values("window_start").groupby("event_id"):
        group = group.reset_index(drop=True)
        peak_index = int(group["heat"].to_numpy().argmax())
        peak_time = group.loc[peak_index, "window_start"]
        start_time = group.loc[0, "window_start"]
        tail_count = group.loc[group["window_start"] > peak_time + pd.Timedelta(hours=tail_hours), "text_count"].sum()
        rows.append(
            {
                "event_id": event_id,
                "time_to_peak_hours": (peak_time - start_time).total_seconds() / 3600,
                "peak_speed": float(group.loc[peak_index, "heat"]),
                "heat_half_life_hours": _half_life(group["heat"].to_numpy(float), group["window_start"]),
                "anger_half_life_hours": _half_life(group["anger_mean"].to_numpy(float), group["window_start"]),
                "fear_half_life_hours": _half_life(group["fear_mean"].to_numpy(float), group["window_start"]),
                "tail_ratio": tail_count / group["text_count"].sum() if group["text_count"].sum() else np.nan,
            }
        )
    return pd.DataFrame(rows)
