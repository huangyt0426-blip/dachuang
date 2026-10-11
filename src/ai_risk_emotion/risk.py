"""Entropy weights, composite risk index, and ABC classification."""

from __future__ import annotations

import numpy as np
import pandas as pd


RISK_COLUMNS = [
    "anger_density",
    "fear_density",
    "polarization",
    "propagation_speed",
    "controversy_index",
]


def minmax(frame: pd.DataFrame) -> pd.DataFrame:
    result = pd.DataFrame(index=frame.index)
    for column in frame.columns:
        values = pd.to_numeric(frame[column], errors="raise").astype(float)
        span = values.max() - values.min()
        result[column] = 0.0 if span == 0 else (values - values.min()) / span
    return result


def entropy_weights(frame: pd.DataFrame) -> pd.Series:
    """Return non-negative weights summing to one, including constant-column fallback."""
    normalized = minmax(frame)
    n = len(normalized)
    if n < 2:
        raise ValueError("At least two rows are required for entropy weights")
    proportions = normalized.div(normalized.sum(axis=0).replace(0, np.nan), axis=1).fillna(0)
    log_values = np.zeros_like(proportions.to_numpy(float))
    positive = proportions.to_numpy(float) > 0
    log_values[positive] = np.log(proportions.to_numpy(float)[positive])
    entropy = -(proportions.to_numpy(float) * log_values).sum(axis=0) / np.log(n)
    divergence = 1 - entropy
    if np.isclose(divergence.sum(), 0):
        weights = np.repeat(1 / len(frame.columns), len(frame.columns))
    else:
        weights = divergence / divergence.sum()
    return pd.Series(weights, index=frame.columns, name="weight")


def build_risk_windows(windows: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    if len(windows) < 30:
        raise ValueError("ABC classification requires at least 30 event-time windows")
    result = windows.copy()
    result["anger_density"] = result["anger_mean"]
    result["fear_density"] = result["fear_mean"]
    result["propagation_speed"] = result["heat"]
    result["controversy_index"] = result["new_comments"] / (result["new_reposts"] + 1)
    normalized = minmax(result[RISK_COLUMNS])
    weights = entropy_weights(result[RISK_COLUMNS])
    result["cri"] = normalized.mul(weights, axis=1).sum(axis=1)
    result = result.sort_values("cri", ascending=False).reset_index(drop=True)
    total = result["cri"].sum()
    result["cumulative_risk_share"] = (
        result["cri"].cumsum() / total if total > 0 else np.arange(1, len(result) + 1) / len(result)
    )
    previous_share = result["cumulative_risk_share"] - (
        result["cri"] / total if total > 0 else 1 / len(result)
    )
    result["abc_class"] = np.select(
        [previous_share < 0.80, previous_share < 0.95],
        ["A", "B"],
        default="C",
    )
    return result, weights
