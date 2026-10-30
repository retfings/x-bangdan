#!/usr/bin/env python3
"""Daily X榜单 collector.

Run this from the repository root (locally or inside a Kaggle Notebook):

    python scraper/collect.py --source auto

Environment variables
---------------------
GITHUB_TOKEN      fine-grained PAT with Contents: Read & write
GITHUB_REPO       owner/name
GITHUB_BRANCH     default: main
X_ACCOUNTS        JSON array of twscrape accounts / cookies
X_BEARER_TOKEN    optional X API v2 bearer token
XB_SOURCE         auto | twscrape | x_api
XB_TIMEZONE       default: Asia/Shanghai
XB_TWEET_LIMIT    max timeline items per creator (default 200)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scraper"))

from aggregate import badge_files, empty_index, merge_index, write_json  # noqa: E402
from github_publisher import GitHubError, GitHubPublisher  # noqa: E402
from sources import (  # noqa: E402
    DEFAULT_TZ,
    CollectorError,
    collect,
    load_x_accounts,
)

DATA_DIR = ROOT / "public" / "data"
INDEX_PATH = "public/data/index.json"


def parse_target(value: str | None, offset: int, tz_name: str) -> date:
    today = datetime.now(ZoneInfo(tz_name)).date()
    if not value:
        return today - timedelta(days=offset)
    if value == "today":
        return today
    if value == "yesterday":
        return today - timedelta(days=1)
    return date.fromisoformat(value)


def load_local_json(path: Path):
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Collect one day of X榜单 data")
    parser.add_argument("--source", default=os.environ.get("XB_SOURCE", "auto"), choices=["auto", "twscrape", "x_api"])
    parser.add_argument("--date", default=None, help="YYYY-MM-DD, today or yesterday (default: today in XB_TIMEZONE)")
    parser.add_argument("--offset", type=int, default=int(os.environ.get("XB_COLLECT_OFFSET", "0")))
    parser.add_argument("--limit", type=int, default=int(os.environ.get("XB_TWEET_LIMIT", "200")))
    parser.add_argument("--config", default=str(ROOT / "config" / "accounts.json"))
    parser.add_argument("--no-push", action="store_true", help="write files locally, skip GitHub commit")
    parser.add_argument("--require-push", action="store_true", help="fail if GitHub credentials are missing")
    parser.add_argument("--dry-run", action="store_true", help="collect and print, do not write files")
    args = parser.parse_args()

    tz_name = os.environ.get("XB_TIMEZONE", DEFAULT_TZ)
    target = parse_target(args.date, args.offset, tz_name)
    config = json.loads(Path(args.config).read_text(encoding="utf-8"))

    token = os.environ.get("GITHUB_TOKEN", "").strip()
    repo = os.environ.get("GITHUB_REPO", "").strip()
    branch = os.environ.get("GITHUB_BRANCH", "main").strip() or "main"
    publisher = GitHubPublisher(repo, token, branch) if token and repo else None
    if args.require_push and publisher is None:
        print("GITHUB_TOKEN / GITHUB_REPO 未配置，无法推送。", file=sys.stderr)
        return 2

    source = args.source
    if source == "auto":
        if load_x_accounts():
            source = "twscrape"
        elif os.environ.get("X_BEARER_TOKEN"):
            source = "x_api"
        else:
            print(
                "没有可用的数据源：请配置 X_ACCOUNTS（twscrape）或 X_BEARER_TOKEN（X API）。",
                file=sys.stderr,
            )
            return 2

    print(f"[x-bangdan] date={target} tz={tz_name} source={source} accounts={len(config.get('accounts') or [])}")

    # Existing index: prefer the checkout, fall back to GitHub.
    index = load_local_json(DATA_DIR / "index.json")
    if index is None and publisher:
        index = publisher.get_json(INDEX_PATH)
    if index is None:
        index = empty_index()
        index["source"] = source

    demo_dates: list[str] = []
    if index.get("source") == "demo" and source != "demo":
        demo_dates = list(index.get("dates") or [])
        print(f"[x-bangdan] 检测到演示数据，首次真实采集将重置 {len(demo_dates)} 天演示快照")
        index = empty_index()
        index["source"] = source

    previous_dates = [item for item in index.get("dates", []) if item < target.isoformat()]
    previous_day = None
    if previous_dates:
        previous_day = load_local_json(DATA_DIR / "daily" / f"{previous_dates[-1]}.json")
        if previous_day is None and publisher:
            previous_day = publisher.get_json(f"public/data/daily/{previous_dates[-1]}.json")

    try:
        accounts, tweets, warnings = collect(source, config, target, args.limit, tz_name)
    except CollectorError as error:
        print(f"[x-bangdan] 采集失败：{error}", file=sys.stderr)
        return 1

    if not accounts:
        print("[x-bangdan] 没有采集到任何账号，终止以避免覆盖线上数据。", file=sys.stderr)
        return 1

    previous_followers = {
        item["handle"]: int(item.get("followers") or 0) for item in (previous_day or {}).get("accounts", [])
    }
    for account in accounts:
        previous = previous_followers.get(account["handle"])
        account["followersGain"] = int(account["followers"] - previous) if previous else 0

    accounts.sort(key=lambda item: -item["impressions"])
    generated_at = datetime.now(ZoneInfo("UTC")).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    day = {
        "schemaVersion": 1,
        "date": target.isoformat(),
        "generatedAt": generated_at,
        "source": source,
        "accounts": accounts,
        "tweets": tweets,
    }

    totals = {
        "accounts": len(accounts),
        "posts": sum(item["posts"] for item in accounts),
        "replies": sum(item["replies"] for item in accounts),
        "followersGain": sum(item["followersGain"] for item in accounts),
        "impressions": sum(item["impressions"] for item in accounts),
    }
    print(
        f"[x-bangdan] collected {len(accounts)} accounts · "
        f"{totals['posts']} posts · {totals['impressions']:,} impressions · {len(tweets)} top tweets"
    )
    for warning in warnings[:20]:
        print(f"[warn] {warning}")
    if len(warnings) > 20:
        print(f"[warn] ... {len(warnings) - 20} more warnings")

    if args.dry_run:
        print("[x-bangdan] dry run, nothing written")
        return 0

    merge_index(index, day)
    index["source"] = source

    write_json(DATA_DIR / "daily" / f"{target.isoformat()}.json", day)
    write_json(DATA_DIR / "index.json", index)
    badges = badge_files(index)
    for filename, payload in badges.items():
        write_json(DATA_DIR / filename, payload)
    for demo_date in demo_dates:
        if demo_date == target.isoformat():
            continue
        (DATA_DIR / "daily" / f"{demo_date}.json").unlink(missing_ok=True)

    print(f"[x-bangdan] local data written to {DATA_DIR}")

    if publisher and not args.no_push:
        files = {
            INDEX_PATH: (DATA_DIR / "index.json").read_text(encoding="utf-8"),
            f"public/data/daily/{target.isoformat()}.json": (DATA_DIR / "daily" / f"{target.isoformat()}.json").read_text(
                encoding="utf-8"
            ),
        }
        for filename, payload in badges.items():
            files[f"public/data/{filename}"] = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
        try:
            result = publisher.commit_files(
                files,
                f"data: {target.isoformat()} · {len(accounts)} creators, {totals['posts']} posts",
                delete_paths=[
                    f"public/data/daily/{item}.json"
                    for item in demo_dates
                    if item != target.isoformat()
                ],
            )
            if result["sha"]:
                print(
                    f"[x-bangdan] pushed {len(result['changed'])} files"
                    f"{f', deleted {len(result.get('deleted', []))}' if result.get('deleted') else ''}"
                    f" → {result['url']}"
                )
            else:
                print("[x-bangdan] no repository changes")
        except (GitHubError, Exception) as error:  # noqa: BLE001
            print(f"[x-bangdan] GitHub 推送失败：{error}", file=sys.stderr)
            return 1
    elif args.require_push:
        print("[x-bangdan] 未推送：缺少 GITHUB_TOKEN / GITHUB_REPO。", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
