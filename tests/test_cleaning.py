import unittest

from src.ai_risk_emotion.cleaning import clean_text, text_hash


class CleaningTests(unittest.TestCase):
    def test_normalizes_url_and_mention(self):
        self.assertEqual(clean_text("  @某用户 看这里：https://example.com  "), "[USER] 看这里: [URL]")

    def test_keeps_hashtag_and_emoji(self):
        self.assertEqual(clean_text("#AI失业# 好害怕😨"), "#AI失业# 好害怕😨")

    def test_removes_empty_repost(self):
        self.assertEqual(clean_text("转发微博"), "")

    def test_hash_is_stable_after_whitespace_normalization(self):
        self.assertEqual(text_hash("AI  风险"), text_hash("AI 风险"))


if __name__ == "__main__":
    unittest.main()
