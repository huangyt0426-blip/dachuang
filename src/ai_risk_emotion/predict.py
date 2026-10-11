import argparse

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--text", required=True)
    args = parser.parse_args()

    tokenizer = AutoTokenizer.from_pretrained(args.model)
    model = AutoModelForSequenceClassification.from_pretrained(args.model)
    model.eval()
    encoded = tokenizer(args.text, return_tensors="pt", truncation=True, max_length=256)
    with torch.inference_mode():
        probabilities = torch.sigmoid(model(**encoded).logits)[0].tolist()
    print({"anger": probabilities[0], "fear": probabilities[1]})


if __name__ == "__main__":
    main()

