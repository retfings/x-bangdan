"""Shared aggregation logic for X榜单.

Turns a single day file (`public/data/daily/YYYY-MM-DD.json`) into the derived
`public/data/index.json` that powers the website, plus the shields.io badge
endpoint files.

Used by both the Kaggle collector and the local demo generator so the real
pipeline and the demo dataset always share one schema.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

METRICS = ("posts", "replies", "followersGain", "impressions")
METRIC_LABELS = {
    "posts": "发帖",
    "replies": "评论",
    "followersGain": "涨粉",
    "impressions": "曝光",
}
SCHEMA_VERSION = 1


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def champions_for_day(day: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Return the four daily champions (highest value per metric)."""
    accounts = day.get("accounts") or []
    champions: dict[str, dict[str, Any]] = {}
    for metric in METRICS:
        ranked = sorted(
            accounts,
            key=lambda a: (-(a.get(metric) or 0), a.get("handle", "")),
        )
        best = ranked[0] if ranked else None
        if not best:
            continue
        champions[metric] = {
            "handle": best["handle"],
            "name": best.get("name") or best["handle"],
            "avatar": best.get("avatar") or "",
            "verified": bool(best.get("verified")),
            "value": int(best.get(metric) or 0),
        }
    return champions


def day_totals(day: dict[str, Any]) -> dict[str, int]:
    accounts = day.get("accounts") or []
    return {
        "accounts": len(accounts),
        "posts": int(sum(a.get("posts") or 0 for a in accounts)),
        "replies": int(sum(a.get("replies") or 0 for a in accounts)),
        "followersGain": int(sum(a.get("followersGain") or 0 for a in accounts)),
        "impressions": int(sum(a.get("impressions") or 0 for a in accounts)),
    }


def empty_index() -> dict[str, Any]:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "latest": None,
        "generatedAt": utc_now(),
        "source": "unknown",
        "dates": [],
        "totals": {},
        "records": {},
        "history": [],
        "series": {},
    }


def _series_template(length: int) -> dict[str, list[int]]:
    return {
        "posts": [0] * length,
        "replies": [0] * length,
        "followersGain": [0] * length,
        "impressions": [0] * length,
    }


def merge_index(index: dict[str, Any], day: dict[str, Any]) -> dict[str, Any]:
    """Insert or replace one day in the index and refresh derived fields."""
    date = day["date"]
    dates: list[str] = list(index.get("dates") or [])
    if date in dates:
        pos = dates.index(date)
    else:
        pos = len(dates)
        for i, existing in enumerate(dates):
            if existing > date:
                pos = i
                break
        dates.insert(pos, date)
        for entry in (index.get("series") or {}).values():
            for metric in METRICS:
                values = entry.get(metric)
                if isinstance(values, list):
                    values.insert(pos, 0)

    index["dates"] = dates

    series = index.setdefault("series", {})
    for account in day.get("accounts") or []:
        handle = account["handle"]
        entry = series.get(handle)
        if entry is None:
            entry = {
                "name": account.get("name") or handle,
                "avatar": account.get("avatar") or "",
                "verified": bool(account.get("verified")),
                "bio": account.get("bio") or "",
                "category": account.get("category") or "",
                "followers": int(account.get("followers") or 0),
                **_series_template(len(dates)),
            }
            series[handle] = entry
        entry["name"] = account.get("name") or entry.get("name") or handle
        entry["avatar"] = account.get("avatar") or entry.get("avatar") or ""
        entry["bio"] = account.get("bio") or entry.get("bio") or ""
        entry["category"] = account.get("category") or entry.get("category") or ""
        entry["verified"] = bool(account.get("verified"))
        entry["followers"] = int(account.get("followers") or entry.get("followers") or 0)
        for metric in METRICS:
            values = entry.setdefault(metric, [0] * len(dates))
            while len(values) < len(dates):
                values.append(0)
            values[pos] = int(account.get(metric) or 0)

    for entry in series.values():
        for metric in METRICS:
            values = entry.setdefault(metric, [])
            while len(values) < len(dates):
                values.append(0)
            if len(values) > len(dates):
                del values[len(dates) :]

    history = [row for row in (index.get("history") or []) if row.get("date") != date]
    history.append(
        {
            "date": date,
            "totals": day_totals(day),
            "champions": champions_for_day(day),
        }
    )
    history.sort(key=lambda row: row["date"])
    index["history"] = history

    index["latest"] = dates[-1]
    index["generatedAt"] = day.get("generatedAt") or utc_now()
    index["source"] = day.get("source") or index.get("source") or "unknown"
    latest_day = next((row for row in history if row["date"] == index["latest"]), None)
    index["totals"] = latest_day["totals"] if latest_day else {}
    index["records"] = compute_records(index)
    return index


def compute_records(index: dict[str, Any]) -> dict[str, Any]:
    """All-time best single day per metric, derived from the series matrix."""
    dates: list[str] = index.get("dates") or []
    records: dict[str, Any] = {}
    for metric in METRICS:
        candidates: list[tuple[int, str, int]] = []
        for handle, entry in (index.get("series") or {}).items():
            values = entry.get(metric) or []
            for i, value in enumerate(values[: len(dates)]):
                if value:
                    candidates.append((int(value), handle, i))
        if not candidates:
            continue
        candidates.sort(key=lambda item: (-item[0], item[2], item[1]))
        value, handle, i = candidates[0]
        entry = index["series"][handle]
        previous = next((c for c in candidates if c[0] < value), None)
        records[metric] = {
            "value": value,
            "handle": handle,
            "name": entry.get("name") or handle,
            "avatar": entry.get("avatar") or "",
            "verified": bool(entry.get("verified")),
            "date": dates[i],
            "previousValue": previous[0] if previous else None,
            "previousHandle": previous[1] if previous else None,
            "previousDate": dates[previous[2]] if previous else None,
        }
    return records


def build_index(days: list[dict[str, Any]]) -> dict[str, Any]:
    index = empty_index()
    for day in sorted(days, key=lambda d: d["date"]):
        merge_index(index, day)
    return index


def badge_files(index: dict[str, Any]) -> dict[str, dict[str, Any]]:
    totals = index.get("totals") or {}
    accounts = len(index.get("series") or {})
    return {
        "badge-accounts.json": {
            "schemaVersion": 1,
            "label": "tracked creators",
            "message": f"{accounts:,}",
            "color": "6d5ef5",
        },
        "badge-updated.json": {
            "schemaVersion": 1,
            "label": "updated",
            "message": index.get("latest") or "pending",
            "color": "22c55e",
        },
        "badge-posts.json": {
            "schemaVersion": 1,
            "label": "posts today",
            "message": f"{int(totals.get('posts') or 0):,}",
            "color": "3b82f6",
        },
        "badge-impressions.json": {
            "schemaVersion": 1,
            "label": "impressions today",
            "message": compact_number(int(totals.get("impressions") or 0)),
            "color": "a855f7",
        },
    }


def compact_number(value: int) -> str:
    if value >= 100_000_000:
        return f"{value / 100_000_000:.1f}亿"
    if value >= 10_000:
        return f"{value / 10_000:.1f}万"
    return f"{value:,}"


def write_json(path, data: Any) -> None:
    from pathlib import Path

    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(data, ensure_ascii=False, indent=2, separators=(",", ": ")) + "\n",
        encoding="utf-8",
    )
