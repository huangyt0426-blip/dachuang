"""Run a fine-tuned model over propagation nodes and save probabilities."""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from .cleaning import clean_text


def predict_frame(
    frame: pd.DataFrame,
    model_path: str,
    batch_size: int = 32,
    max_length: int = 256,
) -> pd.DataFrame:
    if "node_id" not in frame or "text_raw" not in frame:
        raise ValueError("input must contain node_id and text_raw")
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForSequenceClassification.from_pretrained(model_path)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device).eval()
    texts = frame["text_raw"].map(clean_text).tolist()
    probabilities = []
    for start in range(0, len(texts), batch_size):
        encoded = tokenizer(
            texts[start : start + batch_size],
            padding=True,
            truncation=True,
            max_length=max_length,
            return_tensors="pt",
        ).to(device)
        with torch.no_grad():
            logits = model(**encoded).logits
        probabilities.append(torch.sigmoid(logits).cpu().numpy())
    matrix = np.vstack(probabilities) if probabilities else np.empty((0, 2))
    return pd.DataFrame(
        {"node_id": frame["node_id"].astype(str), "p_anger": matrix[:, 0], "p_fear": matrix[:, 1]}
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--max-length", type=int, default=256)
    args = parser.parse_args()
    result = predict_frame(
        pd.read_csv(args.input), args.model, args.batch_size, args.max_length
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(args.output, index=False)
    print(f"predictions rows={len(result)} output={args.output}")


if __name__ == "__main__":
    main()
