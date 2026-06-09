# 技术架构文档

## 1. 项目结构

```
awesome-ai-dev-tools/
│
├── README.md                      # ★ 最终产物 — 自动生成的 AI 工具合集
│
├── .github/workflows/
│   ├── update.yml                 # GitHub Actions: 每周自动更新 + 手动触发
│   └── update-monthly.yml         # GitHub Actions: 月度通配扫描
│
├── config/
│   ├── categories.json            # 分类定义 + 关键词匹配规则 + 优先级（你编辑）
│   ├── search-queries.json        # 每个分类的 GitHub 搜索查询（你编辑）
│   └── nav-groups.json            # 导航分组规则（你编辑）
│
├── scripts/
│   ├── fetch-repos.js             # 调用 GitHub API 搜索项目（Ch1 topic + Ch2 desc）
│   ├── fetch-wildcard.js          # Ch3 通配扫描（stars:>=5000 Top 200，月度）
│   ├── source-priority.js         # 来源优先级排序与合并逻辑
│   ├── classify.js                # 关键词匹配自动分类 + 确定性锁定（--relock）
│   ├── ai-classify.js             # AI 辅助分类 CLI（--pending/--list/--classify/--apply）
│   ├── generate-readme.js         # 生成 README.md
│   ├── generate-site.js           # 生成 Web UI（docs/index.html）
│   └── translate-desc.js          # AI 中文描述翻译 CLI
│
├── data/
│   ├── repos.json                 # 原始数据缓存（自动生成，增量更新）
│   ├── classified.json            # 分类结果（自动生成）
│   ├── classification-locks.json  # 确定性锁定缓存（自动生成，一次锁定不重新匹配）
│   ├── classification-anchors.json# AI 分类锚定样本库（你编辑）
│   ├── manual_overrides.json      # 手动修正分类 + add_missing（你编辑）
│   ├── watched.json               # 我的关注列表（你编辑）
│   ├── first_seen.json            # 首次入库日期追踪（自动生成）
│   ├── pending_ai_review.json     # AI 待分类队列（自动生成）
│   └── chinese_descriptions.json  # 中文描述缓存（自动生成）
│
├── test/
│   ├── classify.test.js           # 57 个红绿灯测试（node:test，零依赖）
│   └── fixtures/                  # 测试 mock 数据
│
├── docs/
│   ├── REQUIREMENTS.md            # 需求文档（§1-25）
│   ├── ARCHITECTURE.md            # 本文件 — 技术架构说明
│   ├── AI-CLASSIFY-WORKFLOW.md    # AI 分类工作流设计文档
│   ├── SKILL-GUIDE.md             # Skill 使用指南
│   ├── index.html                 # 自动生成的 Web UI（GitHub Pages 部署）
│   ├── adr/                       # 架构决策记录
│   ├── decisions/                 # 历史决策
│   └── specs/                     # 实施规范文档
│
├── .reasonix/skills/
│   ├── ai-classify-reviewer/      # AI 分类审查 Skill
│   └── ...                        # 其他 Skills
│
├── CHANGELOG.md                   # 不可篡改的审计日志
├── CLAUDE.md                      # Claude Code 项目指引
├── REASONIX.md                    # Reasonix 项目指引
└── package.json                   # Node.js 项目配置
```

---

## 2. 数据流

```
┌─────────────────────────────────────────────────────────────┐
│             每周定时触发 (GitHub Actions update.yml)         │
│             每月通配扫描 (GitHub Actions update-monthly.yml) │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  scripts/fetch-repos  │
            │     .js              │
            │                      │
            │ 读取 search-queries  │────► data/repos.json
            │ 调用 GitHub API      │      (增量合并)
            │ Star ≥ 5K 过滤       │
            │ Ch1 topic + Ch2 desc │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  scripts/classify.js  │
            │                      │
            │ ① manual_overrides   │─── 最高优先级（手工修正）
            │ ② classification-    │─── 确定性锁定（已分类的跳过重新匹配）
            │    locks.json        │
            │ ③ autoClassify()     │─── 仅对新项目运行关键词匹配
            │ 写入 locks           │─── 新分类结果自动锁定
            │ 写入 pending_ai_     │─── desc_search/wildcard 未分类
            │    review.json       │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │ scripts/generate-    │
            │   readme.js          │
            │ scripts/generate-    │
            │   site.js            │
            │                      │
            │ 按分类 + Star 排序    │───► README.md
            │ 渲染信息字段          │───► docs/index.html
            └──────────────────────┘
```

### 2.1 三通道搜索

```
Ch1: topic_search (每周) ──► topic:xxx,yyy stars:>=5000
Ch2: desc_search  (每周) ──► "keyword" in:description,readme stars:>=5000
Ch3: wildcard     (每月) ──► stars:>=5000 Top 200（通配扫描）

三条通道 → mergeSources() → repos.json（增量合并）
```

### 2.2 分类优先级链

```
manual_overrides.json (手工)
       │ 无条件优先
       ▼
classification-locks.json (锁定缓存)
       │ 无变化时跳过
       ▼
autoClassify() (关键词匹配)
       │ 仅对新项目运行
       ▼
结果 → 写入 locks + classified.json
```

---

## 3. 脚本职责说明

### 3.1 `scripts/fetch-repos.js`

**输入:** `config/search-queries.json`
**输出:** `data/repos.json`
**职责:**
- 遍历每个分类的搜索配置，调用 `GET /search/repositories`
- 执行 Combos 1（topic 搜索）和 Channel 2（description 搜索）
- 过滤 Star ≥ 5,000，提取必要字段
- 通过 `mergeSources()` 增量合并：已有项目保留，新项目追加
- 标记 `_source` 字段（topic_search / desc_search / add_missing）

### 3.2 `scripts/fetch-wildcard.js`

**输入:** 无（硬编码搜索：stars:>=5000）
**输出:** `data/repos.json`（增量合并）
**职责:**
- 月度运行，无关键词筛选
- 取 Top 200，标记 `_source: "wildcard"`
- 通过 `mergeSources()` 并入 repos.json

### 3.3 `scripts/source-priority.js`

**输入:** 来源字符串
**输出:** 优先级数值 / 合并后的数组
**职责:**
- 来源优先级：add_missing(10) > topic_search(8) > desc_search(5) > wildcard(2)
- `mergeSources(existingRepos, newRepos)` — 高优先级覆盖低优先级，同优先级新胜旧

### 3.4 `scripts/classify.js`

**输入:** `data/repos.json` + `config/categories.json` + `data/manual_overrides.json`
**输出:** `data/classified.json` + `data/classification-locks.json`
**职责:**
- 对每个 repo 按优先级链处理：override → lock → autoClassify
- 关键词匹配：topics 优先（high confidence），description 降级（low confidence）
- 多分类命中按 priority 取最高
- 首次分类结果自动写入 `classification-locks.json`
- 支持 `--relock` 参数强制刷新所有锁定
- desc_search/wildcard 未分类写入 `pending_ai_review.json`
- 分配标签 tags

### 3.5 `scripts/generate-readme.js`

**输入:** `data/classified.json` + `data/chinese_descriptions.json` + `config/categories.json` + `data/watched.json`
**输出:** `README.md`
**职责:**
- 渲染：统计表、6 列导航表、我的关注、本周新增 Top 10、各分类内容
- 每个分类：精选推荐（confidence=high 的前 5）+ 全部项目（折叠）
- 中英双语描述，中文描述缓存读取
- 🆕 新增标记（7 天窗口期）

### 3.6 `scripts/generate-site.js`

**输入:** `data/classified.json` + `data/chinese_descriptions.json`
**输出:** `docs/index.html`
**职责:**
- 生成完整单页 Web UI
- 搜索、分类/语言筛选、排序、深色模式
- 所有 CSS/JS 内联，零外部依赖

### 3.7 `scripts/ai-classify.js`

**输入:** `data/pending_ai_review.json` / 命令行参数
**输出:** `data/manual_overrides.json` / 终端输出
**职责:**
- 列出 pending 待分类项目 `--pending`
- 输出 JSON 列表供 AI 判断 `--list`
- 输出单个项目详情（含可用分类）供 AI 判断 `--classify`
- 从 JSON 文件批量导入分类结果 `--apply`

---

## 4. GitHub Actions 工作流

### 4.1 每周更新 (`update.yml`)

```yaml
触发器:
  - schedule: cron '0 0 * * 0'     # 每周日 UTC 0:00
  - workflow_dispatch:

步骤:
  1. Checkout 仓库
  2. 安装 Node.js 24
  3. npm ci 安装依赖
  4. node scripts/fetch-repos.js     # Ch1 topic + Ch2 desc
  5. node scripts/fetch-wildcard.js   # Ch3 通配扫描（实际由 update-monthly.yml 触发）
  6. node scripts/classify.js         # 分类 + 锁定
  7. node scripts/generate-readme.js  # 生成 README
  8. node scripts/generate-site.js    # 生成 Web UI
  9. npm test                         # 红绿灯测试
  10. 如果有变更 → git commit + push
```

### 4.2 月度通配扫描 (`update-monthly.yml`)

```yaml
触发器:
  - schedule: cron '0 0 1 * *'      # 每月 1 日 UTC 0:00
  - workflow_dispatch:

步骤:
  1. Checkout 仓库
  2. node scripts/fetch-wildcard.js  # 通配扫描 Top 200
  3. node scripts/classify.js
  4. node scripts/generate-readme.js
  5. node scripts/generate-site.js
  6. npm test
  7. git commit + push
```

---

## 5. 配置管理

所有可调参数都在 `config/` 和 `data/` 目录下，**不需要改代码即可调整分类逻辑**。

### categories.json 结构

```json
{
  "categories": [
    {
      "id": "ai-coding-agent",
      "name": "🤖 AI 编码助手",
      "order": 1,
      "priority": 9,
      "match": {
        "topics": ["ai-agent", "coding-agent", "ai-code-assistant"],
        "desc_keywords": ["coding agent", "code assistant", "ai coding"]
      },
      "tags": { "cli-agent": { "name": "命令行工具", "desc_keywords": ["cli"] } }
    }
  ]
}
```

### search-queries.json 结构

```json
{
  "queries": {
    "ai-coding-agent": {
      "name": "🤖 AI 编码助手",
      "search": ["topic:ai-agent,coding-agent,code-assistant stars:>=5000"],
      "max_results": 100
    }
  }
}
```

### manual_overrides.json 结构

```json
{
  "add_missing": {
    "owner/repo": { "category": "分类ID", "reason": "原因" }
  },
  "overrides": {
    "owner/repo": {
      "category": "分类ID",
      "hidden": false,
      "reason": "为什么这样调"
    }
  }
}
```

### classification-locks.json 结构

```json
{
  "_说明": "确定性分类缓存。优先级: override > lock > autoClassify",
  "version": "1.0",
  "locks": {
    "owner/repo": {
      "category": "分类ID",
      "_overridden": false,
      "_matched_by": "topic|description|override",
      "_confidence": "high|low",
      "_audit": {
        "classified_by": "autoClassify|manual_override",
        "timestamp": "ISO 时间戳",
        "source": "topic_search|desc_search|wildcard"
      }
    }
  }
}
```

### nav-groups.json 结构

```json
{
  "groups": [
    { "name": "AI 工具方向",
      "categories": ["ai-coding-agent", "mcp", "agent-framework", "browser-automation", "media-processing"] }
  ]
}
```

---

## 6. GitHub API 用量估算

| 操作 | 每次调用 | 每周次数 |
|------|---------|---------|
| 搜索 API（每个分类 1-3 个查询） | 1 次 | ~25 次 |
| 通配扫描 | 2 次 | 月度 |
| **合计** | | **~25 次/周** |

免费额度：5,000 次/小时 → **完全够用**

---

## 7. 核心依赖

| 组件 | 依赖 | 版本 |
|------|------|------|
| GitHub API | `@octokit/rest` | ^21.0 |
| CI/CD | GitHub Actions | 内置 |
| 测试框架 | `node:test` + `node:assert` | 内置（Node 20+）|
| 模块系统 | ESM (`"type": "module"`) | 内置 |
