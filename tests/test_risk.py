import unittest

import numpy as np
import pandas as pd

from src.ai_risk_emotion.risk import build_risk_windows, entropy_weights


class RiskTests(unittest.TestCase):
    def test_weights_sum_to_one(self):
        frame = pd.DataFrame({"a": [1, 2, 4], "b": [3, 3, 3]})
        weights = entropy_weights(frame)
        self.assertAlmostEqual(weights.sum(), 1.0)
        self.assertTrue((weights >= 0).all())

    def test_abc_requires_thirty_windows(self):
        frame = pd.DataFrame(
            {
                "anger_mean": np.linspace(0, 1, 29), "fear_mean": np.linspace(1, 0, 29),
                "polarization": np.ones(29), "heat": np.arange(29),
                "new_comments": np.arange(29), "new_reposts": np.ones(29),
            }
        )
        with self.assertRaises(ValueError):
            build_risk_windows(frame)

    def test_abc_outputs_classes(self):
        frame = pd.DataFrame(
            {
                "anger_mean": np.linspace(0.1, 0.9, 30), "fear_mean": np.linspace(0.9, 0.1, 30),
                "polarization": np.linspace(0.2, 1, 30), "heat": np.arange(1, 31),
                "new_comments": np.arange(1, 31), "new_reposts": np.arange(30, 0, -1),
            }
        )
        result, weights = build_risk_windows(frame)
        self.assertEqual(len(result), 30)
        self.assertEqual(set(result["abc_class"]), {"A", "B", "C"})
        self.assertAlmostEqual(weights.sum(), 1.0)


if __name__ == "__main__":
    unittest.main()
