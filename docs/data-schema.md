# 数据格式说明

站点只读取 `public/data/` 下的静态 JSON，不依赖任何后端。

## 文件布局

```text
public/data/
├── index.json
├── badge-accounts.json
├── badge-updated.json
├── badge-posts.json
├── badge-impressions.json
└── daily/
    ├── 2026-10-28.json
    ├── 2026-10-29.json
    └── 2026-10-30.json
```

- `index.json`：站点启动时唯一必须加载的文件，包含日期索引、每日冠军、历史纪录和完整账号序列。
- `daily/*.json`：单日明细，用于账号榜、推文榜和 7 天聚合。文件名必须与 `index.dates` 中的日期一一对应。
- `badge-*.json`：shields.io endpoint 格式，供 README 徽章使用。

## index.json

```jsonc
{
  "schemaVersion": 1,
  "latest": "2026-10-30",
  "generatedAt": "2026-10-30T15:40:12Z",
  "source": "twscrape",
  "dates": ["2026-09-16", "..."],
  "totals": {
    "accounts": 48,
    "posts": 4174,
    "replies": 24000,
    "followersGain": 12000,
    "impressions": 164441159
  },
  "records": {
    "posts": {
      "value": 449,
      "handle": "crossborder",
      "name": "跨境电商笔记",
      "avatar": "avatars/crossborder.svg",
      "verified": false,
      "date": "2026-10-24",
      "previousValue": 367,
      "previousHandle": "someone",
      "previousDate": "2026-10-19"
    }
  },
  "history": [
    {
      "date": "2026-10-30",
      "totals": { "accounts": 48, "posts": 4174, "impressions": 164441159 },
      "champions": {
        "posts": { "handle": "...", "name": "...", "avatar": "...", "verified": false, "value": 196 }
      }
    }
  ],
  "series": {
    "crossborder": {
      "name": "跨境电商笔记",
      "avatar": "avatars/crossborder.svg",
      "verified": false,
      "bio": "跨境电商实战与选品笔记。",
      "category": "出海",
      "followers": 52000,
      "posts": [0, 12, 9],
      "replies": [0, 80, 55],
      "followersGain": [0, 120, 98],
      "impressions": [0, 120000, 98000]
    }
  }
}
```

### 字段约束

| 字段 | 约束 |
| --- | --- |
| `dates` | 升序、去重；`latest` 必须等于最后一项 |
| `series.*.posts/replies/followersGain/impressions` | 长度必须与 `dates` 相同，按日期对齐 |
| `history` | 顺序与 `dates` 一致，每天一条 |
| `records.*.handle` | 必须存在于 `series` 中 |
| `history[].champions.*.handle` | 必须存在于 `series` 中 |

`python scripts/validate_data.py` 会检查以上规则，CI 也会自动运行。

## daily/YYYY-MM-DD.json

```jsonc
{
  "schemaVersion": 1,
  "date": "2026-10-30",
  "generatedAt": "2026-10-30T15:40:12Z",
  "source": "twscrape",
  "accounts": [
    {
      "handle": "example",
      "name": "示例账号",
      "avatar": "https://pbs.twimg.com/profile_images/.../photo_400x400.jpg",
      "verified": true,
      "bio": "一句话简介",
      "category": "AI",
      "followers": 123456,
      "posts": 12,
      "replies": 80,
      "followersGain": 120,
      "impressions": 120000,
      "likes": 3200,
      "retweets": 410
    }
  ],
  "tweets": [
    {
      "id": "1234567890",
      "handle": "example",
      "name": "示例账号",
      "avatar": "https://...",
      "verified": true,
      "text": "推文内容",
      "url": "https://x.com/example/status/1234567890",
      "impressions": 52000,
      "likes": 1200,
      "replies": 32,
      "retweets": 88,
      "createdAt": "2026-10-30T08:12:00Z"
    }
  ]
}
```

### 指标口径

| 指标 | 字段 | 口径 |
| --- | --- | --- |
| 发帖 | `posts` | 当日发布的非转推、非回复推文数 |
| 评论 | `replies` | 当日发出的回复数（`in_reply_to`） |
| 涨粉 | `followersGain` | 当日粉丝数 − 上一快照粉丝数 |
| 曝光 | `impressions` | 当日全部推文 `viewCount` / `impression_count` 之和 |

抓取不到曝光时写入 `0`，前端会显示为 `0` 或 `—`。不要在真实数据中伪造估算值。

## badge-*.json

```json
{
  "schemaVersion": 1,
  "label": "tracked creators",
  "message": "48",
  "color": "6d5ef5"
}
```

这是 [shields.io endpoint](https://shields.io/badges/endpoint-badge) 的标准格式，字段含义：

- `label`：左侧灰色文字
- `message`：右侧彩色文字
- `color`：右侧背景色（不带 `#`）

采集脚本会在每次提交时重写这些文件，因此 README 徽章始终与最新数据一致。

## 写入流程

1. `collect.py` 采集当天数据。
2. `aggregate.merge_index()` 更新 `series` / `history` / `records` / `totals`。
3. `badge_files()` 生成 4 个徽章 JSON。
4. `GitHubPublisher.commit_files()` 用 Git Data API 原子提交：
   - `public/data/daily/<date>.json`
   - `public/data/index.json`
   - `public/data/badge-*.json`

任何一步失败都不会产生半成品提交。
