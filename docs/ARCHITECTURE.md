# 技术架构文档

## 1. 项目结构

```
awesome-ai-dev-tools/
│
├── README.md                      # ★ 最终产物 — 自动生成的 AI 工具合集
│
├── .github/workflows/
│   └── update.yml                 # GitHub Actions: 每周自动更新 + 手动触发
│
├── config/
│   ├── categories.json            # 分类定义 + 关键词匹配规则（你编辑）
│   └── search-queries.json        # 每个分类的 GitHub 搜索查询（你编辑）
│
├── scripts/
│   ├── fetch-repos.js             # 调用 GitHub API 搜索项目
│   ├── classify.js                # 关键词匹配自动分类
│   └── generate-readme.js         # 生成 README.md
│
├── data/
│   ├── repos.json                 # 原始数据缓存（自动生成）
│   └── manual_overrides.json      # 手动修正分类（你编辑）
│
├── docs/
│   ├── REQUIREMENTS.md            # 需求文档
│   └── ARCHITECTURE.md            # 本文件 — 技术架构说明
│
└── package.json                   # Node.js 项目配置
```

---

## 2. 数据流

```
┌──────────────────────────────────────────────────────────┐
│                  每周定时触发 (GitHub Actions)            │
│              或 手动触发 (workflow_dispatch)              │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  scripts/fetch-repos  │
              │     .js              │
              │                      │
              │ 读取 search-queries  │
              │ 调用 GitHub API      │────► 写入 data/repos.json
              │ Star ≥ 5K 过滤       │     （原始数据缓存）
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  scripts/classify.js  │
              │                      │
              │ 读取 categories.json  │
              │ 关键词匹配自动分类     │
              │ 读取 manual_overrides │────► 覆盖自动分类结果
              │ 合并结果              │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ scripts/generate-    │
              │   readme.js          │
              │                      │
              │ 按分类 + Star 排序    │────► 生成 README.md
              │ 渲染信息字段          │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ git commit + push    │
              │ 提交到 GitHub         │
              └──────────────────────┘
```

---

## 3. 脚本职责说明

### 3.1 `scripts/fetch-repos.js`

**输入:** `config/search-queries.json`
**输出:** `data/repos.json`
**职责:**

- 读取搜索配置，遍历每个分类的搜索关键词
- 调用 `GET /search/repositories`（GitHub Search API）
- 过滤 Star ≥ 5,000
- 提取需要的字段（name, full_name, description, topics, stars, language, html_url）
- 结果写入 `data/repos.json`（缓存，避免重复搜索）

### 3.2 `scripts/classify.js`

**输入:** `data/repos.json` + `config/categories.json` + `data/manual_overrides.json`
**输出:** 分类结果（传递给 generate-readme.js）
**职责:**

- 读取 repos.json 中的每个项目
- 按 categories.json 的关键词规则匹配分类
- 优先匹配 topics 标签 → 降级匹配 description
- 应用 manual_overrides.json 的手动修正
- 未分类项目标记为 "未分类"

### 3.3 `scripts/generate-readme.js`

**输入:** 分类结果
**输出:** `README.md`
**职责:**

- 按分类顺序排列
- 每个分类内按 Star 降序
- 渲染 6 个信息字段
- 写入 README.md

---

## 4. GitHub Actions 工作流

**文件:** `.github/workflows/update.yml`

```yaml
触发器:
  - schedule: cron '0 0 * * 0'     # 每周日 UTC 0:00 自动运行
  - workflow_dispatch:              # 支持手动触发

步骤:
  1. Checkout 仓库
  2. 安装 Node.js 20
  3. npm ci 安装依赖
  4. node scripts/fetch-repos.js     # 搜索数据
  5. node scripts/classify.js         # 分类
  6. node scripts/generate-readme.js  # 生成 README
  7. 如果有变更 → git commit + push
```

---

## 5. 配置管理

所有可调参数都在 `config/` 目录下，**不需要改代码即可调整分类逻辑**。

### categories.json 结构

```json
{
  "ai-coding-agent": {
    "name": "🤖 AI Coding Agent",
    "emoji": "🤖",
    "order": 1,
    "match": {
      "topics": ["ai-agent", "coding-agent", "code-assistant"],
      "desc_keywords": ["coding agent", "code assistant"]
    }
  }
}
```

### search-queries.json 结构

```json
{
  "ai-coding-agent": {
    "queries": [
      "topic:ai-agent stars:>=5000",
      "topic:coding-agent stars:>=5000"
    ],
    "max_results": 20
  }
}
```

### manual_overrides.json 结构

```json
{
  "overrides": {
    "esengine/DeepSeek-Reasonix": {
      "category": "ai-coding-agent",
      "reason": "用户指定"
    },
    "other/repo": {
      "category": null,
      "hidden": true,
      "reason": "与 AI 开发者工具无关"
    }
  }
}
```

---

## 6. GitHub API 用量估算

| 操作 | 每次调用 | 每周次数 |
|------|---------|---------|
| 搜索 API（每个分类约 2 个查询） | 1 次 | ~20 次 |
| 获取项目详情（可选） | 1 次/项目 | ~100 次 |
| **合计** | | **~120 次/周** |

免费额度：5,000 次/小时 → **完全够用**
