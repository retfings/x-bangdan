"""Pluggable data sources for the daily collector.

Two real backends are supported:

* ``twscrape``  – uses logged-in X accounts/cookies. Returns view counts and is
  the recommended option for a daily leaderboard.
* ``x_api``     – official X API v2 with a bearer token. Easier to set up, but
  rate limits and field availability depend on your API plan.

Both normalize to the same schema consumed by ``aggregate.py``.
"""

from __future__ import annotations

import json
import math
import os
import time
from datetime import date, datetime, time as dt_time, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

import requests

DEFAULT_TZ = os.environ.get("XB_TIMEZONE", "Asia/Shanghai")


class CollectorError(RuntimeError):
    pass


def day_bounds(target: date, tz_name: str = DEFAULT_TZ) -> tuple[datetime, datetime]:
    tz = ZoneInfo(tz_name)
    start = datetime.combine(target, dt_time.min, tzinfo=tz)
    end = start + timedelta(days=1)
    return start, end


def iso_utc(value: datetime) -> str:
    return value.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def clean_avatar(url: str | None) -> str:
    if not url:
        return ""
    return url.replace("_normal.", "_400x400.").replace("_mini.", "_400x400.")


def to_aware(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    if not isinstance(value, datetime):
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value


def load_x_accounts() -> list[dict[str, Any]]:
    raw = os.environ.get("X_ACCOUNTS", "").strip()
    if not raw:
        return []
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as error:
        raise CollectorError(f"X_ACCOUNTS 不是合法 JSON：{error}") from error
    if isinstance(payload, dict):
        payload = payload.get("accounts") or payload.get("cookies") or []
    if not isinstance(payload, list):
        raise CollectorError("X_ACCOUNTS 必须是数组")
    return [item for item in payload if isinstance(item, dict)]


def _tweet_payload(
    *,
    handle: str,
    name: str,
    avatar: str,
    verified: bool,
    tweet_id: str,
    text: str,
    views: int,
    likes: int,
    replies: int,
    retweets: int,
    created: datetime,
    is_reply: bool,
) -> dict[str, Any]:
    return {
        "id": str(tweet_id),
        "handle": handle,
        "name": name,
        "avatar": avatar,
        "verified": verified,
        "text": (text or "").strip(),
        "url": f"https://x.com/{handle}/status/{tweet_id}",
        "impressions": int(views or 0),
        "likes": int(likes or 0),
        "replies": int(replies or 0),
        "retweets": int(retweets or 0),
        "createdAt": iso_utc(created),
        "isReply": is_reply,
    }


# ---------------------------------------------------------------------------
# twscrape backend
# ---------------------------------------------------------------------------


async def _collect_twscrape_async(
    config: dict[str, Any],
    target: date,
    limit: int,
    tz_name: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    from twscrape import API, gather

    warnings: list[str] = []
    accounts = load_x_accounts()
    if not accounts:
        raise CollectorError("使用 twscrape 需要配置 X_ACCOUNTS")

    api = API()
    for item in accounts:
        username = item.get("username") or item.get("user")
        if not username:
            continue
        try:
            await api.pool.add_account(
                username=username,
                password=item.get("password", ""),
                email=item.get("email", ""),
                email_password=item.get("email_password", ""),
                cookies=item.get("cookies", ""),
                proxy=item.get("proxy"),
                user_agent=item.get("user_agent"),
            )
        except Exception as error:  # noqa: BLE001 - pool is best effort
            warnings.append(f"添加采集账号 {username} 失败：{error}")

    try:
        await api.pool.login_all()
    except Exception as error:  # noqa: BLE001
        warnings.append(f"登录采集账号时出现异常（若 cookies 有效可忽略）：{error}")

    start, end = day_bounds(target, tz_name)
    result: list[dict[str, Any]] = []
    tweets: list[dict[str, Any]] = []

    for entry in config.get("accounts") or []:
        if not entry.get("enabled", True):
            continue
        handle = entry["handle"].lstrip("@")
        try:
            user = await api.user_by_login(handle)
        except Exception as error:  # noqa: BLE001
            warnings.append(f"@{handle} 读取资料失败：{error}")
            continue
        if user is None:
            warnings.append(f"@{handle} 不存在或当前账号不可见")
            continue

        name = getattr(user, "displayname", None) or handle
        avatar = clean_avatar(getattr(user, "profileImageUrl", ""))
        verified = bool(getattr(user, "verified", False) or getattr(user, "blueVerified", False))
        bio = getattr(user, "rawDescription", "") or ""

        try:
            timeline = await gather(api.user_tweets_and_replies(user.id, limit=limit))
        except Exception as error:  # noqa: BLE001
            warnings.append(f"@{handle} 读取推文失败：{error}")
            timeline = []

        day_tweets: list[dict[str, Any]] = []
        for tweet in timeline:
            created = to_aware(getattr(tweet, "date", None))
            if not created or not (start <= created < end):
                continue
            if getattr(tweet, "retweetedTweet", None):
                continue
            is_reply = bool(getattr(tweet, "inReplyToTweetId", None))
            text = (
                getattr(tweet, "rawContent", None)
                or getattr(tweet, "content", None)
                or ""
            )
            views = getattr(tweet, "viewCount", 0) or 0
            day_tweets.append(
                _tweet_payload(
                    handle=handle,
                    name=name,
                    avatar=avatar,
                    verified=verified,
                    tweet_id=getattr(tweet, "id", ""),
                    text=text,
                    views=views,
                    likes=getattr(tweet, "likeCount", 0) or 0,
                    replies=getattr(tweet, "replyCount", 0) or 0,
                    retweets=getattr(tweet, "retweetCount", 0) or 0,
                    created=created,
                    is_reply=is_reply,
                )
            )

        originals = [item for item in day_tweets if not item["isReply"]]
        replies = [item for item in day_tweets if item["isReply"]]
        if len(timeline) >= limit and timeline:
            oldest = to_aware(getattr(timeline[-1], "date", None))
            if oldest and oldest >= start:
                warnings.append(f"@{handle} 时间线达到 {limit} 条上限，当日数据可能不完整")

        result.append(
            {
                "handle": handle,
                "name": name,
                "avatar": avatar,
                "verified": verified,
                "bio": bio,
                "category": entry.get("category") or "其他",
                "followers": int(getattr(user, "followersCount", 0) or 0),
                "posts": len(originals),
                "replies": len(replies),
                "followersGain": 0,
                "impressions": int(sum(item["impressions"] for item in day_tweets)),
                "likes": int(sum(item["likes"] for item in day_tweets)),
                "retweets": int(sum(item["retweets"] for item in day_tweets)),
            }
        )
        tweets.extend(originals)

    tweets.sort(key=lambda item: -item["impressions"])
    return result, tweets[:100], warnings


def collect_twscrape(
    config: dict[str, Any], target: date, limit: int = 200, tz_name: str = DEFAULT_TZ
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    import asyncio

    return asyncio.run(_collect_twscrape_async(config, target, limit, tz_name))


# ---------------------------------------------------------------------------
# official X API v2 backend
# ---------------------------------------------------------------------------


class XApi:
    def __init__(self, token: str) -> None:
        self.token = token
        self.session = requests.Session()
        self.session.headers.update({"Authorization": f"Bearer {token}", "User-Agent": "x-bangdan"})

    def get(self, path: str, params: dict[str, Any]) -> dict[str, Any]:
        url = f"https://api.x.com/2{path}"
        for attempt in range(5):
            response = self.session.get(url, params=params, timeout=45)
            if response.status_code == 429:
                reset = response.headers.get("x-rate-limit-reset")
                wait = max(3, int(reset) - int(time.time()) + 2) if reset else 15
                time.sleep(min(wait, 900))
                continue
            if response.status_code >= 500:
                time.sleep(2**attempt)
                continue
            if response.status_code == 401:
                raise CollectorError("X_BEARER_TOKEN 无效或已过期")
            if response.status_code == 403:
                raise CollectorError(
                    "X API 拒绝访问（403）。当前套餐可能无权读取该接口，请升级 API 或改用 twscrape。"
                )
            if not response.ok:
                raise CollectorError(f"X API {response.status_code}: {response.text[:300]}")
            return response.json()
        raise CollectorError("X API 连续限流，请稍后重试")

    def users(self, handles: list[str]) -> dict[str, dict[str, Any]]:
        found: dict[str, dict[str, Any]] = {}
        for offset in range(0, len(handles), 100):
            chunk = handles[offset : offset + 100]
            payload = self.get(
                "/users/by",
                {
                    "usernames": ",".join(chunk),
                    "user.fields": "public_metrics,profile_image_url,verified,description,name,username",
                },
            )
            for user in payload.get("data") or []:
                found[user["username"].lower()] = user
        return found

    def user_tweets(self, user_id: str, start: datetime, end: datetime, limit: int) -> list[dict[str, Any]]:
        collected: list[dict[str, Any]] = []
        token: str | None = None
        pages = max(1, min(10, math.ceil(limit / 100)))
        for _ in range(pages):
            params = {
                "max_results": 100,
                "start_time": iso_utc(start),
                "end_time": iso_utc(end),
                "exclude": "retweets",
                "tweet.fields": "created_at,public_metrics,referenced_tweets,note_tweet,lang",
            }
            if token:
                params["pagination_token"] = token
            payload = self.get(f"/users/{user_id}/tweets", params)
            collected.extend(payload.get("data") or [])
            token = (payload.get("meta") or {}).get("next_token")
            if not token or len(collected) >= limit:
                break
        return collected[:limit]


def collect_x_api(
    config: dict[str, Any], target: date, limit: int = 200, tz_name: str = DEFAULT_TZ
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    bearer = os.environ.get("X_BEARER_TOKEN", "").strip()
    if not bearer:
        raise CollectorError("使用 X API 需要配置 X_BEARER_TOKEN")

    handles = [entry["handle"].lstrip("@") for entry in config.get("accounts") or [] if entry.get("enabled", True)]
    api = XApi(bearer)
    users = api.users(handles)
    start, end = day_bounds(target, tz_name)
    warnings: list[str] = []
    accounts: list[dict[str, Any]] = []
    tweets: list[dict[str, Any]] = []

    for entry in config.get("accounts") or []:
        if not entry.get("enabled", True):
            continue
        handle = entry["handle"].lstrip("@")
        user = users.get(handle.lower())
        if not user:
            warnings.append(f"@{handle} 不存在或不可见")
            continue
        metrics = user.get("public_metrics") or {}
        name = user.get("name") or handle
        avatar = clean_avatar(user.get("profile_image_url"))
        verified = bool(user.get("verified"))
        try:
            raw_tweets = api.user_tweets(user["id"], start, end, limit)
        except CollectorError as error:
            warnings.append(f"@{handle}: {error}")
            raw_tweets = []

        day_tweets: list[dict[str, Any]] = []
        for tweet in raw_tweets:
            created = to_aware(tweet.get("created_at"))
            if not created or not (start <= created < end):
                continue
            tweet_metrics = tweet.get("public_metrics") or {}
            references = tweet.get("referenced_tweets") or []
            is_reply = any(item.get("type") == "replied_to" for item in references)
            text = ((tweet.get("note_tweet") or {}).get("text")) or tweet.get("text") or ""
            day_tweets.append(
                _tweet_payload(
                    handle=handle,
                    name=name,
                    avatar=avatar,
                    verified=verified,
                    tweet_id=tweet["id"],
                    text=text,
                    views=tweet_metrics.get("impression_count", 0),
                    likes=tweet_metrics.get("like_count", 0),
                    replies=tweet_metrics.get("reply_count", 0),
                    retweets=tweet_metrics.get("retweet_count", 0),
                    created=created,
                    is_reply=is_reply,
                )
            )

        originals = [item for item in day_tweets if not item["isReply"]]
        replies = [item for item in day_tweets if item["isReply"]]
        accounts.append(
            {
                "handle": handle,
                "name": name,
                "avatar": avatar,
                "verified": verified,
                "bio": user.get("description") or "",
                "category": entry.get("category") or "其他",
                "followers": int(metrics.get("followers_count", 0) or 0),
                "posts": len(originals),
                "replies": len(replies),
                "followersGain": 0,
                "impressions": int(sum(item["impressions"] for item in day_tweets)),
                "likes": int(sum(item["likes"] for item in day_tweets)),
                "retweets": int(sum(item["retweets"] for item in day_tweets)),
            }
        )
        tweets.extend(originals)

    tweets.sort(key=lambda item: -item["impressions"])
    return accounts, tweets[:100], warnings


def collect(
    source: str, config: dict[str, Any], target: date, limit: int = 200, tz_name: str = DEFAULT_TZ
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    if source == "auto":
        if load_x_accounts():
            source = "twscrape"
        elif os.environ.get("X_BEARER_TOKEN"):
            source = "x_api"
        else:
            raise CollectorError(
                "没有可用的数据源。请配置 X_ACCOUNTS（twscrape）或 X_BEARER_TOKEN（X API）。"
            )
    if source == "twscrape":
        return collect_twscrape(config, target, limit, tz_name)
    if source == "x_api":
        return collect_x_api(config, target, limit, tz_name)
    raise CollectorError(f"未知数据源：{source}")
