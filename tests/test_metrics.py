import unittest

import numpy as np
import pandas as pd

from src.ai_risk_emotion.metrics import (
    cascade_metrics,
    dominance_label,
    make_time_windows,
    temporal_metrics,
)


class MetricTests(unittest.TestCase):
    def test_dominance_thresholds_and_other(self):
        self.assertEqual(dominance_label(0.8, 0.2), "anger")
        self.assertEqual(dominance_label(0.2, 0.8), "fear")
        self.assertEqual(dominance_label(0.6, 0.6), "mixed")
        self.assertEqual(dominance_label(0.2, 0.3), "other")

    def test_path_tree_structural_virality(self):
        nodes = pd.DataFrame(
            [
                {"root_post_id": "p", "node_id": "r1", "parent_node_id": "p", "node_type": "repost", "depth": 1},
                {"root_post_id": "p", "node_id": "r2", "parent_node_id": "r1", "node_type": "repost", "depth": 2},
                {"root_post_id": "p", "node_id": "r3", "parent_node_id": "r2", "node_type": "repost", "depth": 3},
            ]
        )
        result = cascade_metrics(nodes).iloc[0]
        self.assertEqual(result["cascade_size"], 4)
        self.assertEqual(result["max_depth"], 3)
        self.assertAlmostEqual(result["structural_virality"], 10 / 6)
        self.assertTrue(result["topology_eligible"])

    def test_temporal_half_life_requires_two_low_windows(self):
        times = pd.date_range("2026-01-01", periods=4, freq="6h")
        windows = pd.DataFrame(
            {
                "event_id": ["E1"] * 4,
                "window_start": times,
                "text_count": [2, 10, 4, 3],
                "heat": [2, 10, 4, 3],
                "anger_mean": [0.2, 0.8, 0.3, 0.2],
                "fear_mean": [0.2, 0.7, 0.3, 0.2],
            }
        )
        result = temporal_metrics(windows).iloc[0]
        self.assertEqual(result["time_to_peak_hours"], 6)
        self.assertEqual(result["heat_half_life_hours"], 6)

    def test_windows_use_new_comments_and_reposts(self):
        frame = pd.DataFrame(
            {
                "event_id": ["E1"] * 3,
                "node_id": ["1", "2", "3"],
                "node_type": ["repost", "comment", "reply"],
                "created_at": ["2026-01-01 01:00", "2026-01-01 02:00", "2026-01-01 07:00"],
                "p_anger": [0.8, 0.7, 0.2],
                "p_fear": [0.2, 0.3, 0.8],
            }
        )
        result = make_time_windows(frame)
        self.assertEqual(result.loc[0, "heat"], 2)
        self.assertEqual(result.loc[1, "heat"], 1)


if __name__ == "__main__":
    unittest.main()
