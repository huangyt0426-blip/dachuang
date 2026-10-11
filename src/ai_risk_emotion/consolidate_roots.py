"""Merge page checkpoints into a deduplicated candidate-root table."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd


MANUAL_EXCLUSIONS = {
    "Qvgkx9raQ": "蹭话题：正文为未成年人退货诈骗，与OpenClaw风险事件无关",
}


def parse_weibo_time(value: object, year: int = 2026) -> pd.Timestamp:
    text = str(value).strip()
    for fmt in ("%Y-%m-%d %H:%M", "%Y年%m月%d日 %H:%M"):
        parsed = pd.to_datetime(text, format=fmt, errors="coerce")
        if not pd.isna(parsed):
            return parsed
    return pd.to_datetime(f"{year}年{text}", format="%Y年%m月%d日 %H:%M", errors="raise")


def consolidate(files: list[Path], start: str, end: str) -> pd.DataFrame:
    topic_defaults = {
        "topic1": "#AI龙虾爆火工信部发布高危风险预警#",
        "topic2": "#AI龙虾可像人一样帮你干活#",
        "topic3": "#龙虾一秒可搬空用户隐私信息#",
        "topic4": "#养龙虾存在严重安全隐患#",
        "topic5": "#普通人无需盲目跟风养龙虾#",
    }
    frames = []
    for path in files:
        frame = pd.read_csv(path)
        if "topics" in frame and "topic" not in frame:
            frame = frame.rename(columns={"topics": "topic"})
        if "topic" not in frame:
            frame["topic"] = pd.NA
        for marker, default_topic in topic_defaults.items():
            if marker in path.name:
                frame["topic"] = frame["topic"].fillna(default_topic)
                break
        frame["source_file"] = path.name
        frames.append(frame)
    combined = pd.concat(frames, ignore_index=True, sort=False)
    combined["created_at_parsed"] = combined["created_at"].map(parse_weibo_time)
    combined = combined[
        combined["created_at_parsed"].between(pd.Timestamp(start), pd.Timestamp(end) + pd.Timedelta(days=1), inclusive="left")
    ].copy()
    for column in ("repost_count", "comment_count", "like_count"):
        combined[column] = pd.to_numeric(combined[column], errors="coerce").fillna(0).astype(int)
    combined["engagement_total"] = combined[["repost_count", "comment_count", "like_count"]].sum(axis=1)
    combined = combined.sort_values(["post_id", "engagement_total"], ascending=[True, False])
    def merge_topics(values: pd.Series) -> str:
        parts: set[str] = set()
        for value in values.dropna().astype(str):
            parts.update(part for part in value.split("|") if part and part.lower() != "nan")
        return "|".join(sorted(parts))

    topics = combined.groupby("post_id")["topic"].agg(merge_topics)
    result = combined.drop_duplicates("post_id", keep="first").copy()
    result["topic"] = result["post_id"].map(topics)
    # Search result pages may contain algorithmically expanded, unrelated AI posts.
    # Keep them for audit but exclude them from automatic ranking until reviewed.
    relevant_pattern = re.compile(r"open\s*claw|龙虾|养虾", re.I)
    result["relevant_auto"] = result["text_raw"].fillna("").map(
        lambda text: bool(relevant_pattern.search(str(text)))
    )
    result["review_status"] = result["relevant_auto"].map(
        {True: "auto_relevant_needs_review", False: "auto_excluded_needs_review"}
    )
    result["manual_exclusion_reason"] = result["post_id"].map(MANUAL_EXCLUSIONS).fillna("")
    result.loc[result["post_id"].isin(MANUAL_EXCLUSIONS), "review_status"] = "manual_excluded"
    return result.sort_values("engagement_total", ascending=False).reset_index(drop=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--inputs", type=Path, nargs="+", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--top-output", type=Path)
    parser.add_argument("--top-n", type=int, default=20)
    parser.add_argument("--start", default="2026-02-01")
    parser.add_argument("--end", default="2026-03-31")
    args = parser.parse_args()
    result = consolidate(args.inputs, args.start, args.end)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(args.output, index=False)
    if args.top_output:
        top = result[
            result["relevant_auto"] & ~result["post_id"].isin(MANUAL_EXCLUSIONS)
        ].head(args.top_n).copy()
        top["review_status"] = "manual_reviewed_include"
        top.insert(0, "rank", range(1, len(top) + 1))
        args.top_output.parent.mkdir(parents=True, exist_ok=True)
        top.to_csv(args.top_output, index=False)
    print(f"candidate_roots={len(result)} output={args.output}")


if __name__ == "__main__":
    main()
