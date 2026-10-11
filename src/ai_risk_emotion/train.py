import argparse
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from sklearn.metrics import classification_report, f1_score
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
)


LABELS = ["anger", "fear"]


class EmotionDataset(torch.utils.data.Dataset):
    def __init__(self, frame: pd.DataFrame, tokenizer, max_length: int):
        self.frame = frame.reset_index(drop=True)
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.frame)

    def __getitem__(self, index):
        row = self.frame.iloc[index]
        item = self.tokenizer(
            str(row["text"]),
            truncation=True,
            max_length=self.max_length,
        )
        item["labels"] = torch.tensor([row["anger"], row["fear"]], dtype=torch.float)
        return item


def compute_metrics(prediction):
    probabilities = 1.0 / (1.0 + np.exp(-prediction.predictions))
    predicted = (probabilities >= 0.5).astype(int)
    expected = prediction.label_ids.astype(int)
    metrics = {
        "macro_f1": f1_score(expected, predicted, average="macro", zero_division=0),
        "micro_f1": f1_score(expected, predicted, average="micro", zero_division=0),
    }
    report = classification_report(
        expected,
        predicted,
        target_names=LABELS,
        output_dict=True,
        zero_division=0,
    )
    for label in LABELS:
        metrics[f"{label}_precision"] = report[label]["precision"]
        metrics[f"{label}_recall"] = report[label]["recall"]
        metrics[f"{label}_f1"] = report[label]["f1-score"]
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", type=Path, required=True)
    parser.add_argument("--validation", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--model", default="google-bert/bert-base-chinese")
    parser.add_argument("--max-length", type=int, default=256)
    parser.add_argument("--epochs", type=float, default=3.0)
    parser.add_argument("--batch-size", type=int, default=16)
    args = parser.parse_args()

    train_frame = pd.read_csv(args.train)
    validation_frame = pd.read_csv(args.validation)
    leakage_column = "root_post_id" if "root_post_id" in train_frame.columns else "event_id"
    leaked_groups = set(train_frame[leakage_column]).intersection(
        validation_frame[leakage_column]
    )
    if leaked_groups:
        raise ValueError(
            f"{leakage_column} leakage between train and validation: "
            f"{sorted(leaked_groups)[:5]}"
        )

    tokenizer = AutoTokenizer.from_pretrained(args.model)
    model = AutoModelForSequenceClassification.from_pretrained(
        args.model,
        num_labels=2,
        problem_type="multi_label_classification",
        id2label={0: "anger", 1: "fear"},
        label2id={"anger": 0, "fear": 1},
    )
    training_args = TrainingArguments(
        output_dir=str(args.output),
        learning_rate=2e-5,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        num_train_epochs=args.epochs,
        weight_decay=0.01,
        warmup_ratio=0.1,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="macro_f1",
        greater_is_better=True,
        logging_steps=20,
        report_to="none",
        seed=42,
    )
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=EmotionDataset(train_frame, tokenizer, args.max_length),
        eval_dataset=EmotionDataset(validation_frame, tokenizer, args.max_length),
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=compute_metrics,
    )
    trainer.train()
    trainer.save_model(str(args.output))
    tokenizer.save_pretrained(str(args.output))


if __name__ == "__main__":
    main()
