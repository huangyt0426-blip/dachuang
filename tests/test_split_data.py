import unittest

import pandas as pd

from src.ai_risk_emotion.split_data import split_by_event


class SplitTests(unittest.TestCase):
    def test_events_do_not_leak(self):
        frame = pd.DataFrame(
            {
                "event_id": [f"event_{i}" for i in range(10) for _ in range(2)],
                "text": [f"text_{i}" for i in range(20)],
                "anger": [0] * 20,
                "fear": [0] * 20,
            }
        )
        train, validation, test = split_by_event(frame)
        train_events = set(train["event_id"])
        validation_events = set(validation["event_id"])
        test_events = set(test["event_id"])
        self.assertFalse(train_events & validation_events)
        self.assertFalse(train_events & test_events)
        self.assertFalse(validation_events & test_events)
        self.assertEqual(train_events | validation_events | test_events, set(frame["event_id"]))


if __name__ == "__main__":
    unittest.main()
