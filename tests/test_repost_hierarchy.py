import unittest

import pandas as pd

from src.ai_risk_emotion.repost_hierarchy import recover_repost_hierarchy


class RepostHierarchyTests(unittest.TestCase):
    def test_exact_quoted_payload_resolves_parent(self):
        frame = pd.DataFrame(
            {
                "node_id": ["parent", "child"],
                "text_raw": ["权限越大风险越大", "我同意//@甲:权限越大风险越大"],
            }
        )
        result = recover_repost_hierarchy(frame).set_index("node_id")
        self.assertEqual(result.loc["child", "inferred_parent_node_id"], "parent")
        self.assertEqual(result.loc["child", "inferred_depth"], 2)

    def test_unseen_parent_is_not_invented(self):
        frame = pd.DataFrame({"node_id": ["child"], "text_raw": ["//@甲:不存在的帖子"]})
        result = recover_repost_hierarchy(frame).iloc[0]
        self.assertEqual(result["parent_resolution_status"], "parent_not_visible")
        self.assertEqual(result["inferred_parent_node_id"], "")


if __name__ == "__main__":
    unittest.main()
