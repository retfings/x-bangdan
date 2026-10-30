#!/usr/bin/env python3
"""Fail CI when the generated dataset is internally inconsistent."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"
METRICS = ("posts", "replies", "followersGain", "impressions")


def fail(message: str) -> None:
    print(f"[data-check] ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    index_path = DATA / "index.json"
    if not index_path.exists():
        fail("public/data/index.json is missing")

    index = json.loads(index_path.read_text(encoding="utf-8"))
    dates = index.get("dates") or []
    if not dates:
        fail("index.dates is empty")
    if dates != sorted(dates):
        fail("index.dates is not sorted")
    if index.get("latest") != dates[-1]:
        fail("index.latest does not match the last date")
    if len(set(dates)) != len(dates):
        fail("duplicate dates in index")

    series = index.get("series") or {}
    if not series:
        fail("index.series is empty")
    for handle, entry in series.items():
        for metric in METRICS:
            values = entry.get(metric)
            if not isinstance(values, list):
                fail(f"series[{handle}].{metric} is not a list")
            if len(values) != len(dates):
                fail(f"series[{handle}].{metric} length {len(values)} != {len(dates)}")

    history = index.get("history") or []
    if [row["date"] for row in history] != dates:
        fail("index.history does not align with index.dates")
    for row in history:
        for metric in METRICS:
            champion = (row.get("champions") or {}).get(metric)
            if champion and champion["handle"] not in series:
                fail(f"{row['date']} champion {champion['handle']} missing from series")

    for metric in METRICS:
        record = (index.get("records") or {}).get(metric)
        if record and record["handle"] not in series:
            fail(f"record holder {record['handle']} missing from series")

    missing = [date for date in dates if not (DATA / "daily" / f"{date}.json").exists()]
    if missing:
        fail(f"missing daily files: {', '.join(missing[:5])}")

    for filename in (
        "badge-accounts.json",
        "badge-updated.json",
        "badge-posts.json",
        "badge-impressions.json",
    ):
        path = DATA / filename
        if not path.exists():
            fail(f"{filename} is missing")
        payload = json.loads(path.read_text(encoding="utf-8"))
        if payload.get("schemaVersion") != 1 or not payload.get("message"):
            fail(f"{filename} is not a valid shields endpoint payload")

    latest = json.loads((DATA / "daily" / f"{dates[-1]}.json").read_text(encoding="utf-8"))
    if latest.get("date") != dates[-1]:
        fail("latest daily file date mismatch")
    if not latest.get("accounts"):
        fail("latest daily file has no accounts")

    print(
        f"[data-check] OK · {len(dates)} days · {len(series)} creators · "
        f"{index['totals'].get('posts', 0):,} posts · latest {index['latest']}"
    )


if __name__ == "__main__":
    main()
