import argparse
from pathlib import Path

import pandas as pd

from .cleaning import clean_text, text_hash


REQUIRED_COLUMNS = {"text", "anger", "fear", "event_id"}


def validate(path: Path) -> pd.DataFrame:
    frame = pd.read_csv(path)
    missing = REQUIRED_COLUMNS.difference(frame.columns)
    if missing:
        raise ValueError(f"Missing columns: {sorted(missing)}")

    frame["text"] = frame["text"].map(clean_text)
    if frame["text"].eq("").any():
        raise ValueError("Empty text remains after cleaning")
    for label in ("anger", "fear"):
        values = set(frame[label].dropna().astype(int).unique())
        if not values.issubset({0, 1}):
            raise ValueError(f"{label} must contain only 0/1, got {sorted(values)}")
        frame[label] = frame[label].astype(int)
    if frame["event_id"].isna().any() or frame["event_id"].astype(str).str.strip().eq("").any():
        raise ValueError("event_id cannot be empty")

    frame["text_hash"] = frame["text"].map(text_hash)
    duplicates = int(frame["text_hash"].duplicated().sum())
    distribution = frame.groupby(["anger", "fear"]).size().to_dict()
    print(f"rows={len(frame)} duplicates={duplicates} label_combinations={distribution}")
    return frame


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    args = parser.parse_args()
    validate(args.input)


if __name__ == "__main__":
    main()

