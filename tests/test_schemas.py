import unittest

import pandas as pd

from src.ai_risk_emotion.schemas import validate_nodes, validate_posts


class SchemaTests(unittest.TestCase):
    def test_post_derivations(self):
        posts = pd.DataFrame(
            [{
                "event_id": "E1", "topic": "t", "post_id": "p1",
                "created_at": "2026-01-01", "text_raw": "x", "author_hash": "a",
                "author_type": "media", "repost_count": 2, "comment_count": 3,
                "like_count": 5, "collected_at": "2026-01-02",
            }]
        )
        result = validate_posts(posts)
        self.assertEqual(result.loc[0, "engagement_total"], 10)
        self.assertAlmostEqual(result.loc[0, "comment_repost_ratio"], 1.0)

    def test_root_post_may_be_external_parent(self):
        nodes = pd.DataFrame(
            [{
                "event_id": "E1", "root_post_id": "p1", "node_id": "r1",
                "parent_node_id": "p1", "node_type": "repost", "depth": 1,
                "created_at": "2026-01-01", "text_raw": "x", "like_count": 0,
                "author_hash": "a", "collected_at": "2026-01-02",
            }]
        )
        self.assertEqual(len(validate_nodes(nodes)), 1)


if __name__ == "__main__":
    unittest.main()
