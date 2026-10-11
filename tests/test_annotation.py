import unittest

import pandas as pd

from src.ai_risk_emotion.annotation import agreement, prepare_annotation_batch


class AnnotationTests(unittest.TestCase):
    def test_prepare_deduplicates_clean_text(self):
        nodes = pd.DataFrame(
            {
                "node_id": ["1", "2", "3"], "event_id": ["E"] * 3,
                "root_post_id": ["p"] * 3, "text_raw": ["AI 风险", "AI  风险", "转发微博"],
            }
        )
        result = prepare_annotation_batch(nodes, 10)
        self.assertEqual(len(result), 1)

    def test_perfect_agreement(self):
        a = pd.DataFrame({"node_id": ["1", "2"], "anger": [0, 1], "fear": [1, 0], "relevant": [1, 1]})
        b = a.copy()
        scores = agreement(a, b)
        self.assertEqual(scores["minimum_kappa"], 1.0)


if __name__ == "__main__":
    unittest.main()
