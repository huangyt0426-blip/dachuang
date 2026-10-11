"""Non-parametric hypothesis tests with effect sizes."""

from __future__ import annotations

from itertools import combinations

import numpy as np
import pandas as pd
from scipy.stats import kruskal, mannwhitneyu


def rank_biserial(x: np.ndarray, y: np.ndarray, u_statistic: float) -> float:
    if len(x) == 0 or len(y) == 0:
        return np.nan
    return 2 * u_statistic / (len(x) * len(y)) - 1


def compare_dominance_groups(
    frame: pd.DataFrame,
    metrics: list[str],
    group_column: str = "dominance",
    minimum_group_size: int = 3,
) -> pd.DataFrame:
    """Run Kruskal-Wallis and pairwise Mann-Whitney tests."""
    rows: list[dict] = []
    for metric in metrics:
        groups = {
            str(name): values[metric].dropna().to_numpy(float)
            for name, values in frame.groupby(group_column)
            if len(values[metric].dropna()) >= minimum_group_size
        }
        if len(groups) < 2:
            rows.append(
                {
                    "metric": metric,
                    "test": "insufficient_groups",
                    "group_a": "",
                    "group_b": "",
                    "statistic": np.nan,
                    "p_value": np.nan,
                    "effect_size": np.nan,
                }
            )
            continue
        statistic, p_value = kruskal(*groups.values())
        rows.append(
            {
                "metric": metric,
                "test": "kruskal_wallis",
                "group_a": "|".join(groups),
                "group_b": "",
                "statistic": statistic,
                "p_value": p_value,
                "effect_size": np.nan,
            }
        )
        for left, right in combinations(groups, 2):
            u_stat, pair_p = mannwhitneyu(groups[left], groups[right], alternative="two-sided")
            rows.append(
                {
                    "metric": metric,
                    "test": "mann_whitney_u",
                    "group_a": left,
                    "group_b": right,
                    "statistic": u_stat,
                    "p_value": pair_p,
                    "effect_size": rank_biserial(groups[left], groups[right], u_stat),
                }
            )
    result = pd.DataFrame(rows)
    if not result.empty:
        result["significant_0_05"] = result["p_value"].lt(0.05)
    return result
