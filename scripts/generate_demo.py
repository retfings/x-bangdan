#!/usr/bin/env python3
"""Generate a realistic, fully deterministic demo dataset.

The demo exists so the site is usable before X credentials / Kaggle secrets are
configured. It creates 45 days of daily files, avatars, index.json and shields
badges. All numbers are synthetic and the site labels them as demo data.
"""

from __future__ import annotations

import hashlib
import json
import random
import sys
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scraper"))

from aggregate import build_index, badge_files, write_json  # noqa: E402

DATA_DIR = ROOT / "public" / "data"
AVATAR_DIR = ROOT / "public" / "avatars"
DAYS = 45
SEED = 20261030

ACCOUNTS = [
    ("windinwoods", "林间有风", "AI", "把复杂 AI 讲成人话，偶尔写点生活。", 128_000, "balanced"),
    ("ai_tavern", "AI小酒馆", "AI", "一杯酒的时间，聊一个 AI 产品。", 86_000, "viral"),
    ("go_global", "出海笔记", "出海", "记录中国产品走向全球的每一天。", 54_000, "grower"),
    ("azhe_tokyo", "阿哲在东京", "海外生活", "东京十年，观察日本互联网与生活。", 210_000, "viral"),
    ("indie_laok", "独立开发者老K", "独立开发", "一个人，一台电脑，一款产品。", 33_000, "poster"),
    ("muzili", "木子李", "生活", "普通人的普通一天。", 9_600, "casual"),
    ("sundayoff", "周日不营业", "生活方式", "周末不聊工作，只聊好玩的事。", 156_000, "balanced"),
    ("cybercat", "赛博朋克猫", "AI", "在赛博世界里打滚的猫。", 72_000, "replier"),
    ("laochen_growth", "老陈聊增长", "增长", "增长不是玄学，是实验和复盘。", 188_000, "balanced"),
    ("lemon_001", "一颗柠檬", "生活", "酸酸甜甜的日常记录者。", 4_300, "casual"),
    ("mountmoon", "山月", "摄影", "用镜头收集山野与月光。", 58_000, "grower"),
    ("code_coffee", "代码与咖啡", "独立开发", "写代码，喝咖啡，做小产品。", 27_000, "poster"),
    ("north30", "北纬三十度", "旅行", "沿着北纬三十度看世界。", 112_000, "viral"),
    ("pm_xiaoman", "产品经理小满", "产品", "产品经理的自我修养。", 45_000, "balanced"),
    ("kai_nomad", "数字游民Kai", "数字游民", "一边工作，一边换城市生活。", 67_000, "grower"),
    ("white_noise", "白噪音", "生活", "收集城市里细碎的声音。", 8_900, "casual"),
    ("wang_global", "出海老王", "出海", "十年跨境，分享踩过的坑。", 230_000, "balanced"),
    ("cola_zero", "零度可乐", "科技", "科技新闻的另一种打开方式。", 35_000, "replier"),
    ("sv_observer", "硅谷观察员", "科技", "在硅谷，看技术如何改变世界。", 310_000, "viral"),
    ("night_coder", "深夜写代码", "独立开发", "凌晨两点，代码比梦更清醒。", 19_000, "poster"),
    ("deer_run", "小鹿乱撞", "生活", "记录那些让人心跳的瞬间。", 47_000, "balanced"),
    ("geekwan", "极客湾湾", "科技", "硬核测评，认真拆机。", 142_000, "viral"),
    ("pm_dog", "一只产品汪", "产品", "产品路上的观察与吐槽。", 23_000, "replier"),
    ("growth_aw", "增长黑客阿伟", "增长", "用数据驱动每一次增长。", 96_000, "balanced"),
    ("rainy_tokyo", "东京下雨了", "海外生活", "雨天、咖啡和东京的日常。", 81_000, "balanced"),
    ("mumuxi", "木木夕", "设计", "做有温度的设计。", 38_000, "balanced"),
    ("shopify_diary", "独立站日记", "出海", "从 0 到 1 的独立站运营日记。", 29_000, "poster"),
    ("content_lab", "内容创业者", "内容", "内容是一门长期生意。", 76_000, "balanced"),
    ("abu_shanghai", "阿布在上海", "生活", "上海街头的观察者。", 125_000, "viral"),
    ("slowbeat", "慢半拍", "生活方式", "慢一点，也没关系。", 17_000, "casual"),
    ("cloudwalk", "云端漫步", "旅行", "在云端，也在人间。", 64_000, "balanced"),
    ("dataviz", "数据可视化", "数据", "让数据自己讲故事。", 41_000, "balanced"),
    ("fe_king", "前端小王子", "技术", "前端工程师，热爱折腾。", 28_000, "replier"),
    ("coffee_life", "咖啡续命", "生活", "靠咖啡续命的打工人。", 12_000, "casual"),
    ("crossborder", "跨境电商笔记", "出海", "跨境电商实战与选品笔记。", 52_000, "poster"),
    ("freelance_diary", "自由职业日记", "自由职业", "不上班的第一年。", 33_000, "balanced"),
    ("designmeow", "设计喵", "设计", "设计、插画与猫。", 61_000, "balanced"),
    ("photo_liu", "摄影师大刘", "摄影", "人像摄影师，拍有故事的人。", 95_000, "viral"),
    ("reader_zhou", "读书人小周", "读书", "每周读完一本，写给你看。", 22_000, "casual"),
    ("ai_painter", "AI绘画师", "AI", "用 AI 画出想象中的世界。", 73_000, "viral"),
    ("podcast_host", "播客主理人", "播客", "把有趣的人请进录音间。", 39_000, "balanced"),
    ("tina_life", "生活家Tina", "生活", "认真生活，认真分享。", 108_000, "balanced"),
    ("digital_review", "数码测评君", "科技", "只讲真实体验的数码测评。", 265_000, "viral"),
    ("crypto_watch", "币圈观察", "加密", "链上数据与市场情绪观察。", 48_000, "replier"),
    ("usstock", "美股小散", "投资", "一个小散的长期主义。", 31_000, "balanced"),
    ("remote_guide", "远程工作指南", "远程", "远程工作的方法论与机会。", 57_000, "balanced"),
    ("one_person_co", "一个人公司", "独立开发", "一人公司的产品、运营与复盘。", 44_000, "poster"),
    ("town_nerd", "小镇做题家", "生活", "从小镇出发，记录一路的风景。", 6_800, "casual"),
]

ARCHETYPES = {
    "poster": dict(posts=(165, 0.28), replies=(420, 0.55), gain=0.0012, views=1_700_000, spike=0.035),
    "replier": dict(posts=(28, 0.45), replies=(1_850, 0.3), gain=0.0016, views=430_000, spike=0.025),
    "grower": dict(posts=(38, 0.4), replies=(360, 0.55), gain=0.014, views=900_000, spike=0.05),
    "viral": dict(posts=(55, 0.4), replies=(300, 0.6), gain=0.0032, views=3_400_000, spike=0.07),
    "balanced": dict(posts=(82, 0.33), replies=(720, 0.5), gain=0.0022, views=1_250_000, spike=0.04),
    "casual": dict(posts=(13, 0.55), replies=(110, 0.7), gain=0.0008, views=140_000, spike=0.02),
}

TEXTS = [
    "把最近三个月做 AI 产品的复盘写完了：真正难的从来不是模型，而是找到那个愿意付费的场景。",
    "出海第一年，最大的坑不是流量，而是用国内的产品思维去猜海外用户。",
    "今天把一个功能删掉了，产品反而更好了。少即是多，这句话真的要在做减法时才懂。",
    "分享一个提高效率的小习惯：每天只选一件必须完成的事，其他都算加分项。",
    "东京的雨下了一整天。坐在窗边改方案，突然理解了什么叫「慢就是快」。",
    "独立开发第 180 天，月收入终于覆盖了服务器和咖啡。下一个目标：覆盖房租。",
    "看了 20 个竞品之后发现，大家拼的不是功能，而是谁更懂用户的那一点点犹豫。",
    "增长的底层逻辑其实很朴素：让对的人，在对的地方，反复看见你。",
    "AI 不会取代设计师，但会取代不做判断的设计师。",
    "今天面试了一个候选人，作品集不炫，但每个决策都讲得清为什么。这种人很稀缺。",
    "做内容最难的不是日更，是日更之后还能保持真诚。",
    "跨境选品的一个反直觉结论：先看退货率，再看毛利率。",
    "远程工作三年，最有效的管理方式不是打卡，而是把目标写清楚。",
    "刚把独立站的加载速度从 4.2s 压到 1.3s，转化率涨了 18%。技术真的能赚钱。",
    "读书笔记：真正的长期主义，不是坚持做同一件事，而是坚持做难而正确的事。",
    "拍了一组清晨的街景。光线只有十分钟，但值得等一整个早上。",
    "前端性能优化清单更新了，这次加了几个 2026 年新踩的坑。",
    "一个人公司的好处是自由，坏处是没人帮你踩刹车。",
    "今天收到一封用户邮件，说我们的产品帮他省下了每周 6 小时。这比任何融资新闻都开心。",
    "币圈待久了会发现，最难的不是判断趋势，是管住手。",
    "做了一个小实验：把落地页第一屏从「我们是谁」改成「你能得到什么」，注册率翻倍。",
    "数字游民不是旅行，是换一个地方认真工作。",
    "把播客第 50 期的录音剪完，突然有点感动。原来已经聊了这么多有趣的人。",
    "产品经理最重要的能力，是在一堆合理需求里选出最该做的那一个。",
    "设计不是把东西变好看，是让复杂的事情看起来理所当然。",
    "美股定投第 6 年，最大的收获是学会了不看盘。",
    "今天教会团队用 AI 做竞品分析，省下来的时间拿去做用户访谈。",
    "小镇出来的孩子，最大的优势是知道没有退路是什么感觉。",
    "咖啡、代码、傍晚的风。普通的一天，也值得被记录。",
    "把用户访谈录音转成文字后，发现用户说的和做的完全是两回事。",
]

VERIFIED = {
    "ai_tavern",
    "azhe_tokyo",
    "sundayoff",
    "laochen_growth",
    "wang_global",
    "sv_observer",
    "geekwan",
    "digital_review",
    "tina_life",
    "abu_shanghai",
}

PALETTES = [
    ("#6366f1", "#a855f7"),
    ("#0ea5e9", "#2563eb"),
    ("#14b8a6", "#0f766e"),
    ("#f59e0b", "#ef4444"),
    ("#ec4899", "#8b5cf6"),
    ("#22c55e", "#0ea5e9"),
    ("#f97316", "#db2777"),
    ("#8b5cf6", "#3b82f6"),
    ("#06b6d4", "#4f46e5"),
    ("#e11d48", "#f59e0b"),
]


def avatar_svg(name: str, handle: str) -> str:
    idx = sum(ord(c) for c in handle) % len(PALETTES)
    c1, c2 = PALETTES[idx]
    initial = (name.strip()[0] if name.strip() else handle[0]).upper()
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/>
    </linearGradient>
    <radialGradient id="r" cx="30%" cy="20%" r="70%">
      <stop stop-color="#ffffff" stop-opacity=".38"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="160" height="160" rx="80" fill="url(#g)"/>
  <rect width="160" height="160" rx="80" fill="url(#r)"/>
  <circle cx="128" cy="36" r="46" fill="#ffffff" opacity=".10"/>
  <circle cx="30" cy="142" r="58" fill="#000000" opacity=".12"/>
  <text x="80" y="80" text-anchor="middle" dominant-baseline="central"
    font-family="PingFang SC,Microsoft YaHei,Segoe UI,sans-serif" font-size="62" font-weight="700"
    fill="#ffffff">{initial}</text>
</svg>
"""


def clamp(value: float, low: float = 0, high: float = 100_000_000) -> int:
    return int(max(low, min(high, round(value))))


def stable_hash(*parts: object) -> int:
    raw = "|".join(str(part) for part in parts).encode("utf-8")
    return int(hashlib.md5(raw).hexdigest()[:12], 16)


def make_tweets(rng: random.Random, day: str, accounts: list[dict], now: datetime) -> list[dict]:
    tweets: list[dict] = []
    for account in accounts:
        if account["impressions"] <= 0:
            continue
        count = min(5, max(1, round(account["posts"] ** 0.5)))
        weights = [rng.lognormvariate(0, 0.85) for _ in range(count)]
        total_weight = sum(weights) or 1
        remaining = account["impressions"] * rng.uniform(0.72, 0.92)
        for index in range(count):
            views = int(remaining * weights[index] / total_weight)
            if views < 1:
                continue
            likes = int(views * rng.uniform(0.004, 0.038))
            replies = int(views * rng.uniform(0.0002, 0.006))
            retweets = int(views * rng.uniform(0.0006, 0.012))
            text = TEXTS[(stable_hash(day, account["handle"], index) + index) % len(TEXTS)]
            created = now - timedelta(
                hours=rng.uniform(0.5, 9), minutes=rng.randint(0, 59)
            )
            tweets.append(
                {
                    "id": f"{day.replace('-', '')}{stable_hash(day, account['handle'], index) % 10_000_000:07d}",
                    "handle": account["handle"],
                    "name": account["name"],
                    "avatar": account["avatar"],
                    "verified": account["verified"],
                    "text": text,
                    "url": f"https://x.com/{account['handle']}",
                    "impressions": views,
                    "likes": likes,
                    "replies": replies,
                    "retweets": retweets,
                    "createdAt": created.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
                }
            )
    tweets.sort(key=lambda t: -t["impressions"])
    unique: list[dict] = []
    seen_text: set[str] = set()
    for tweet in tweets:
        if tweet["text"] in seen_text:
            continue
        seen_text.add(tweet["text"])
        unique.append(tweet)
    return unique[:80]


def main() -> None:
    rng = random.Random(SEED)
    today = date.today()
    dates = [today - timedelta(days=offset) for offset in range(DAYS - 1, -1, -1)]

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)

    profiles = []
    for handle, name, category, bio, followers, archetype in ACCOUNTS:
        avatar = f"avatars/{handle}.svg"
        (AVATAR_DIR / f"{handle}.svg").write_text(avatar_svg(name, handle), encoding="utf-8")
        profiles.append(
            {
                "handle": handle,
                "name": name,
                "category": category,
                "bio": bio,
                "followers": followers,
                "archetype": archetype,
                "avatar": avatar,
                "verified": handle in VERIFIED,
            }
        )

    starting_followers = {}
    for profile in profiles:
        gain = ARCHETYPES[profile["archetype"]]["gain"]
        starting_followers[profile["handle"]] = int(profile["followers"] * (1 - gain * DAYS * 0.55))

    days: list[dict] = []
    for day_index, current_date in enumerate(dates):
        day_str = current_date.isoformat()
        now = datetime.combine(current_date, time(10, 0), tzinfo=timezone.utc)
        accounts: list[dict] = []
        for profile in profiles:
            config = ARCHETYPES[profile["archetype"]]
            base_posts, post_cv = config["posts"]
            base_replies, reply_cv = config["replies"]
            weekend = current_date.weekday() >= 5
            weekend_factor = 0.82 if weekend and profile["archetype"] in ("poster", "replier") else 1.0
            trend = 1 + 0.0045 * day_index
            posts = clamp(rng.gauss(base_posts, base_posts * post_cv) * weekend_factor * trend)
            replies = clamp(rng.gauss(base_replies, base_replies * reply_cv) * weekend_factor * trend)
            if rng.random() < 0.03:
                posts = clamp(posts * rng.uniform(1.5, 2.1))
            if rng.random() < 0.03:
                replies = clamp(replies * rng.uniform(1.5, 2.3))

            gain = profile["followers"] * config["gain"] + rng.gauss(0, profile["followers"] * 0.0006)
            if rng.random() < config["spike"]:
                gain *= rng.uniform(3.5, 13.0)
            if rng.random() < 0.008:
                gain *= rng.uniform(8.0, 26.0)
            followers_gain = clamp(gain, -80)
            followers = int(starting_followers[profile["handle"]] + followers_gain)
            starting_followers[profile["handle"]] = followers

            views = profile["followers"] * rng.uniform(3, 11) + config["views"]
            views *= rng.lognormvariate(0, 0.55) * trend
            if rng.random() < config["spike"]:
                views *= rng.uniform(2.0, 4.5)
            if rng.random() < 0.012:
                views *= rng.uniform(3.0, 7.0)
            impressions = clamp(views, 0, 80_000_000)
            likes = int(impressions * rng.uniform(0.004, 0.032))
            retweets = int(impressions * rng.uniform(0.0008, 0.009))

            accounts.append(
                {
                    "handle": profile["handle"],
                    "name": profile["name"],
                    "avatar": profile["avatar"],
                    "verified": profile["verified"],
                    "bio": profile["bio"],
                    "category": profile["category"],
                    "followers": followers,
                    "posts": posts,
                    "replies": replies,
                    "followersGain": followers_gain,
                    "impressions": impressions,
                    "likes": likes,
                    "retweets": retweets,
                }
            )

        accounts.sort(key=lambda a: -a["impressions"])
        tweets = make_tweets(rng, day_str, accounts, now)
        day = {
            "schemaVersion": 1,
            "date": day_str,
            "generatedAt": now.isoformat().replace("+00:00", "Z"),
            "source": "demo",
            "accounts": accounts,
            "tweets": tweets,
        }
        days.append(day)
        write_json(DATA_DIR / "daily" / f"{day_str}.json", day)

    index = build_index(days)
    index["source"] = "demo"
    write_json(DATA_DIR / "index.json", index)
    for filename, payload in badge_files(index).items():
        write_json(DATA_DIR / filename, payload)

    summary = {
        "days": len(days),
        "accounts": len(index["series"]),
        "latest": index["latest"],
        "posts": index["totals"]["posts"],
        "impressions": index["totals"]["impressions"],
        "records": {m: (r["value"], r["handle"]) for m, r in index["records"].items()},
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
