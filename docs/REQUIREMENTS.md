# Awesome AI Dev Tools — 需求文档

## 1. 项目概述

在 GitHub 上建立一个**热门 AI 开发者工具合集仓库**，通过自动化脚本定期搜索 GitHub 上高星 AI 相关项目，按分类整理，生成 README.md 展示。

**仓库地址:** https://github.com/CaseBuilding/awesome-ai-dev-tools（私有）

### 核心理念

- **程序员视角** — 关注能用起来的工具，而非基础设施（训练、微调、向量数据库等不收录）
- **自动化优先** — GitHub Actions 定时更新，降低维护成本
- **配置驱动** — 分类规则、关键词写在 JSON 里，改配置不改代码
- **增量更新** — 已有项目持续保留，新项目追加，合集只增不减
- **人机协作** — 自动分类为主，手动修正 + AI 辅助审查兜底

---

## 2. 项目名

`awesome-ai-dev-tools`

---

## 3. 收录标准

| 条件 | 标准 |
|------|------|
| ⭐ **Star 门槛** | ≥ **5,000** Stars |
| 🔄 **更新频率** | 每周日 UTC 0:00 自动更新（GitHub Actions 定时 + 支持手动触发） |
| 🌐 **搜索方式** | GitHub topic 标签搜索 + 手动补充（`add_missing`） |
| 🚫 **不收录** | 训练框架、微调工具、向量数据库、纯学术论文实现 |
| ⚠️ **边界说明** | 依赖基础设施但本身是**开箱即用工具**的（如 RAG 框架、MCP 网关）→ 收录 ✅。只提供底层能力本身（如纯向量数据库、训练框架）→ 不收录 ❌ |

---

## 4. 分类方案（共 10 个）

| # | 分类 | 说明 | 示例项目 |
|---|------|------|---------|
| 1 | 🤖 AI Coding Agent | AI 编程助手，自动写代码、重构、调试 | Reasonix, Claude Code, Cursor, Aider, Continue |
| 2 | 🔌 MCP / 工具生态 | 模型上下文协议相关：MCP Servers、Clients 等 | FastMCP, mcp-toolbox |
| 3 | 🔍 代码分析 / 理解 | 大项目代码分析、代码图谱、依赖分析、静态分析 | semgrep, code-review-graph, Understand-Anything |
| 4 | 🗺️ 代码导图 / 可视化 | 生成架构图、调用图、UML、代码流程图 | go-callvis, zcf |
| 5 | 🧠 LLM 框架 / SDK | 搭建 LLM 应用的基础框架 | LangChain, LlamaIndex, DSPy |
| 6 | 🚪 AI 网关 / API 管理 | 多模型路由、成本管理、API 代理 | LiteLLM, Portkey, Kong |
| 7 | 🔄 Agent / 工作流 | 编排多步骤 Agent 任务、工作流引擎 | LangGraph, AutoGen, Dify, n8n |
| 8 | ⚡ 本地推理 | 本地运行 LLM 的推理引擎 | Ollama, llama.cpp |
| 9 | 📏 评估 / 可观测 | AI 应用测试、评估、监控 | DeepEval, LangFuse |
| 10 | 🌐 浏览器自动化 | AI 驱动的浏览器操控 | Browser Use, Playwright MCP |

---

## 5. README 展示结构

### 5.1 整体布局

```
┌─ 标题 & 统计 ─────────────────────────────┐
│ # Awesome AI Dev Tools                     │
│ > 370 个项目 · 每周日自动更新              │
│ ┌─ 统计 ─────────────────────────┐         │
│ │ 收录项目: 370 · 待确认: 0 ······│         │
│ └────────────────────────────────┘         │
├─ 📑 导航 ─────────────────────────────────┤
│ [我的关注] · [AI Coding Agent] · [MCP] ···│
├─ 👁️ 我的关注 ─────────────────────────────┤
│ │ Understand-Anything │ 46.2K │ 代码分析 │ │
│ │ code-review-graph  │ 17.7K │ 代码分析 │ │
├─ 🤖 AI Coding Agent (折叠) ──────────────┤
│  ⭐ 精选推荐 (Top 5)                      │
│  📋 全部项目 (折叠)                       │
├─ 🔌 MCP / 工具生态 (折叠) ───────────────┤
│  ...                                      │
└───────────────────────────────────────────┘
```

### 5.2 导航栏

页面顶部提供锚点链接，点击直接跳转到对应分类。格式：

```
[👁️ 我的关注](#-我的关注) · [🤖 AI Coding Agent](#ai-coding-agent) · [🔌 MCP](#mcp-工具生态) · ...
```

### 5.3 👁️ 我的关注

用户手动标记的重点项目，在 README 顶部独立展示。配置在 `data/watched.json`：

```json
{
  "watched": {
    "Lum1104/Understand-Anything": {
      "note": "重点关注 - 代码知识图谱"
    }
  }
}
```

### 5.4 每个分类的三级展示

```
<details open>
<summary>🤖 AI Coding Agent (37)</summary>

### ⭐ 精选推荐
Top 5 高 confidence + 高 Stars 的项目，含中文 + 英文描述

### 📋 全部项目 (折叠)
其余项目列表，从缓存读取中文描述（不触发 GitHub 请求）

</details>
```

- 前 3 个分类默认展开，其余折叠
- 中文描述来源：GitHub 自带 README.zh-CN.md → AI 翻译缓存（`chinese_descriptions.json`）
  - 精选项目：按优先级顺序尝试全部来源
  - 全部项目：仅从缓存读取（不触发 GitHub 请求，保持性能）
  - 均未命中时显示 `*中文描述待补充*` 占位
- 英文描述始终显示
- ❓ 待确认区已被优先级系统取代（见第 7 章）

---

## 6. 搜索策略

### 6.1 自动搜索

使用 GitHub Search API 的 **topic 标签搜索**，每个分类一个查询，用逗号语法表示 OR：

```
topic:ai-agent,coding-agent,code-assistant stars:>=5000
```

每个分类仅 1 个 topic 查询，总约 10 个 API 调用，控制限速。

### 6.2 手动补充（add_missing）

通过 `manual_overrides.json` 的 `add_missing` 字段收录没有 topic 标签的项目。详见 [7.4 额外收录](#74-额外收录add_missing)。

---

## 7. 分类逻辑

### 7.1 优先级系统

每个分类有一个 `priority` 值（1-10），数字越大表示分类越具体。

| 优先级 | 分类 |
|:------:|------|
| 10 | 🔌 MCP / 工具生态（最具体）|
| 9 | 🤖 AI Coding Agent |
| 8 | 🔍 代码分析 / 理解 |
| 7 | 🗺️ 代码导图 / 可视化 |
| 6 | 🌐 浏览器自动化 |
| 5 | 📏 评估 / 可观测 |
| 4 | 🚪 AI 网关 / API 管理 |
| 3 | ⚡ 本地推理 |
| 2 | 🧠 LLM 框架 / SDK |
| 1 | 🔄 Agent / 工作流（最宽泛）|

### 7.2 自动分类（关键词匹配 + 优先级裁决）

不使用 AI。匹配规则：

```
1. topics 标签匹配 → high confidence ✅
2. description 关键词匹配 → low confidence ⚠️（降级方案）
3. 都不匹配 → 未分类（极少见）
4. 匹配 2+ 分类 → 保留 priority 最高的那个（自动消歧义）
```

### 7.3 手动覆盖

在 `data/manual_overrides.json` 中记录：

| 操作 | 效果 |
|------|------|
| `category: "code-analysis"` | 强制归入指定分类 |
| `hidden: true` | 从合集中隐藏 |
| 不设置 | 保留优先级自动分类结果 |

### 7.4 额外收录（add_missing）

对于没有 topic 标签但有价值的项目，在 `manual_overrides.json` 的 `add_missing` 字段中列出。脚本通过 `octokit.repos.get()` 单独获取并加入合集。

### 7.5 AI 辅助审查

Reasonix 可读取项目的 README，判断其实际用途后更新 `manual_overrides.json`。完全无法判断的（极少）标记为 `needs_review` 展示给用户。

流程：

```
1. 读取 repos.json
2. 对不确定的项目，查看 README 和描述
3. 确定分类 → 写入 manual_overrides.json
4. 真正不确定的 → 展示给用户决定
```

---

## 8. 增量更新机制

**核心原则：合集只增不减。**

```
每次运行：
    搜索新项目（当前结果可能有变）
    │
    ├── 读取已有缓存 repos.json
    │
    ├── 合并：
    │   ├── 已有项目 → 全部保留
    │   └── 新项目 → 追加
    │
    └── 写入 repos.json（总量增长）
```

这样即使 GitHub 搜索结果变化，已收录的项目也不会丢失。

---

## 9. 数据文件清单

| 文件 | 维护者 | 用途 |
|------|--------|------|
| `config/categories.json` | 你编辑 | 分类名称 + 关键词规则 |
| `config/search-queries.json` | 你编辑 | 搜索查询语句 |
| `data/repos.json` | 自动生成 | 原始项目数据缓存 |
| `data/classified.json` | 自动生成 | 分类结果 |
| `data/chinese_descriptions.json` | 自动生成 | 中文描述缓存 |
| `data/manual_overrides.json` | 你编辑 | 手动修正分类 + add_missing |
| `data/watched.json` | 你编辑 | 我的关注列表 |

---

## 10. README 信息展示

每条项目展示 4 个字段：

```
### owner/repo ⭐ Stars · 🔤 语言
🌏 中文描述（有则显示，无则显示 "*中文描述待补充*"）
📝 英文描述（始终显示）
🔗 GitHub 链接
```

### 10.1 中文描述来源优先级

| 优先级 | 来源 | 说明 |
|:------:|------|------|
| 1 | GitHub 仓库自带 `README.zh-CN.md` | 自动抓取第一段有意义的中文 |
| 2 | `data/chinese_descriptions.json` 缓存 | AI 翻译写入的缓存，启动时加载 |
| 3 | 英文描述本身含中文 | 直接复用 `description` 字段 |
| 未命中 | 显示 `*中文描述待补充*` | 占位提示，等待手动触发 AI 翻译 |

### 10.2 AI 翻译流程

AI 翻译**不进 GitHub Actions**，由维护者手动触发 Reasonix 执行：

```
维护者执行:
  node scripts/translate-desc.js --list
        ↓
  Reasonix 逐批生成中文描述
        ↓
  node scripts/translate-desc.js --import batch.json
        ↓
  chinese_descriptions.json 新增条目
        ↓
  下一次 GitHub Actions 运行或本地 npm run generate 后 README 更新
```

---

## 11. 维护成本

| 事项 | 频率 | 耗时 |
|------|------|------|
| GitHub Actions 自动更新 | 每周日 UTC 0:00 | 0 分钟 |
| Review 待确认/未分类项目 | 每月 | ~10 分钟 |
| 新增关注项目 | 按需 | ~1 分钟 |
| 调整关键词/搜索 | 按需 | ~2 分钟 |

**预估每月维护：10-15 分钟**

---

## 12. 费用

| 项目 | 费用 |
|------|------|
| GitHub API（Token 认证） | ✅ 免费（5,000 次/小时） |
| GitHub Actions（私有仓库） | ✅ 免费（2,000 分钟/月） |
| 仓库托管 | ✅ 免费 |
| **合计** | **¥0 / 月** |

仅需一个免费的 GitHub Personal Access Token（含 `repo` 和 `workflow` 权限）。

---

## 13. 技术栈

- **脚本语言:** Node.js (ES Modules)
- **运行环境:** GitHub Actions (Ubuntu)
- **GitHub SDK:** `@octokit/rest`
- **搜索方式:** `GET /search/repositories` (topic 标签)
- **数据格式:** JSON
- **输出产物:** `README.md`

---

## 14. 功能级需求（详细）

### 14.1 fetch-repos.js — 搜索 & 获取项目数据

| # | 需求 | 详细说明 |
|---|------|---------|
| F1 | **读取搜索配置** | 从 `config/search-queries.json` 读取每个分类的查询语句和 `max_results` |
| F2 | **执行搜索** | 调用 `octokit.search.repos()`，按 stars 降序排列 |
| F3 | **分页控制** | 每页 100 条，最多 2 页（200 条/查询），超过停止 |
| F4 | **Star 过滤** | 硬门槛 5,000 Stars，API 返回结果中再次验证 |
| F5 | **去重** | 同一次运行中按 `full_name` 去重，后出现的覆盖先出现的 |
| F6 | **跨查询去重** | 不同分类的搜索如果返回相同项目，只保留首次出现的分类标记 |
| F7 | **限速控制** | Search API 调用后等待 2.5 秒，add_missing 的 `repos.get()` 后等待 1 秒（Core API 额度 5,000 次/小时，1 秒足够）|
| F8 | **手动补充** | 读取 `manual_overrides.json` 的 `add_missing` 字段，对每个项目调用 `octokit.repos.get()` 单独获取 |
| F9 | **增量合并** | 读取已有的 `data/repos.json` 缓存，新搜索结果的同名项目覆盖旧数据，未匹配到的旧项目保留 |
| F10 | **字段提取** | 每个项目提取 7 个字段：`full_name`, `name`, `description`, `topics`, `stars`, `language`, `html_url` |
| F11 | **写入缓存** | 合并后的数据写入 `data/repos.json`，含 `last_updated` 时间戳 |

**错误处理：**

| 场景 | 行为 |
|------|------|
| API 返回 403 限速 | 打印错误信息，立即退出，不写入不完整的缓存 |
| 网络超时 | 自动重试（@octokit 内置），失败则退出 |
| `add_missing` 项目不存在（404） | 打印警告，跳过该项目 |
| `search-queries.json` 格式错误 | 退出并打印解析错误 |
| `data/repos.json` 首次运行不存在 | 视为空缓存，继续正常流程 |

### 14.2 classify.js — 自动分类

| # | 需求 | 详细说明 |
|---|------|---------|
| F12 | **读取数据** | 从 `data/repos.json`、`config/categories.json`、`data/manual_overrides.json` 读取 |
| F13 | **关键词匹配** | 将项目的 `topics` 数组与每个分类的 `match.topics` 列表逐项匹配（不区分大小写，完全匹配） |
| F14 | **降级匹配** | 如果 topics 未命中，将项目 `description` 转为小写，与 `match.desc_keywords` 列表做子串匹配 |
| F15 | **优先级裁决** | 如果命中多个分类，按 `priority` 从高到低排序，只保留最高优先级的分类 |
| F16 | **手动覆盖** | 如果项目在 `manual_overrides.json` 的 `overrides` 中，忽略自动分类结果 |
| F17 | **应用覆盖** | `category: "xxx"` → 强制归入指定分类；`hidden: true` → 不归入任何分类 |
| F18 | **标注来源** | 每个分类结果附带 `_confidence`（high/low）、`_overridden`（true/false）标记 |
| F19 | **输出分类结果** | 写入 `data/classified.json`，包含每个分类的项目列表、未分类列表、统计数据 |

**分类优先级匹配规则示例：**

```
项目 topics: ["mcp", "ai-agents", "automation"]
  → 匹配 MCP (p=10) 和 Agent 工作流 (p=1)
  → 保留 MCP ✅

项目 topics: ["ai-agent", "code-assistant"]
  → 匹配 AI Coding Agent (p=9)
  → 保留 AI Coding Agent ✅
```

### 14.3 generate-readme.js — 生成 README

| # | 需求 | 详细说明 |
|---|------|---------|
| F20 | **标题区** | 输出 `# Awesome AI Dev Tools` + 统计概要 |
| F21 | **统计表** | 输出 Markdown 表格，含收录总数、已分类数、未分类数、最后更新时间 |
| F22 | **导航栏** | 输出所有分类的锚点链接，用 ` · ` 分隔 |
| F23 | **我的关注** | 从 `data/watched.json` 读取关注列表，查询其在分类结果中的分类名称和 Stars，输出 Markdown 表格 |
| F24 | **未找到提示** | 如果关注的项目不在合集中，显示 "⚠️ 未在搜索结果中找到" |
| F25 | **分类输出** | 按 `categories.json` 的 `order` 顺序遍历，跳过空分类 |
| F26 | **锚点** | 每个分类前输出 `<a name="xxx">` 锚点，名称由分类名的拼音/英文缩写生成 |
| F27 | **折叠标签** | 前 3 个分类 `<details open>`，其余 `<details>`（默认折叠） |
| F28 | **精选推荐** | 取该分类中 `_confidence === "high" && !_uncertain` 的前 5 个项目 |
| F29 | **全部项目** | 精选之外的项目放入嵌套的 `<details>` 折叠区 |
| F30 | **中文描述抓取** | 仅对精选项目：按顺序尝试 `README.zh-CN.md` → `READMEs/README.zh-CN.md` → `README.zh.md`，每个 URL 超时 3 秒 |
| F31 | **中文描述缓存** | 抓取到的中文描述写入 `data/chinese_descriptions.json`，避免每次重复抓取 |
| F32 | **项目信息渲染** | 每条项目固定 4 行：`### name ⭐Stars · 🔤lang` → `🌏 中文`（有则显示） → `📝 英文描述`（截断 200 字） → `🔗 链接` |
| F33 | **分隔线** | 每个项目之间用 `---` 分隔 |
| F34 | **写入 README** | 输出到 `README.md` |

### 14.4 GitHub Actions 工作流

| # | 需求 | 详细说明 |
|---|------|---------|
| F35 | **触发方式** | `schedule`（每周日 UTC 0:00）+ `workflow_dispatch`（手动触发） |
| F36 | **运行环境** | `ubuntu-latest`，Node.js 20 |
| F37 | **依赖安装** | `npm ci` |
| F38 | **执行顺序** | `fetch-repos.js` → `classify.js` → `generate-readme.js` |
| F39 | **自动提交** | 检测 `README.md` 或 `data/repos.json` 是否有变更，有则 commit + push |
| F40 | **提交信息** | `chore: auto-update README YYYY-MM-DD` |
| F41 | **Git 配置** | 使用 `github-actions[bot]` 身份提交 |
| F42 | **Token 权限** | `contents: write`，搜索使用的 Token 通过 `secrets.TOKEN` 传入（需要用户在 GitHub Secrets 中配置） |

---

## 15. UI/UX 需求（展示 & 交互）

### 15.1 README 视觉层次

```
层级 1: # Awesome AI Dev Tools        ← 大标题
层级 2: ## 📊 统计                    ← 区域标题
层级 3: <details><summary>分类名</>    ← 分类标题（可折叠）
层级 4: ### ⭐ 精选推荐               ← 分组标题
层级 5: ### owner/repo ⭐ Stars       ← 项目标题
层级 6: 📝 / 🌏 / 🔗                  ← 信息行
```

### 15.2 导航栏规范

| 规范 | 要求 |
|------|------|
| **位置** | 统计表下方，紧接分隔线 |
| **分隔符** | ` · `（空格·空格） |
| **格式** | `[🤖 AI Coding Agent](#ai-coding-agent)` |
| **锚点名称** | 英文小写 + 连字符，如 `#mcp-工具生态` |
| **锚点生成规则** | 分类名转小写 → 非字母/中文转 `-` → 去掉首尾 `-` |
| **包含** | 所有有项目存在的分类 + 我的关注（如有） |

### 15.3 分类折叠区规范

| 状态 | 规则 |
|------|------|
| **默认展开** | 前 3 个分类（按 `order` 排序） |
| **默认折叠** | 第 4 个分类及之后 |
| **展开/折叠标识** | 浏览器原生 `<details>` 三角箭头 |
| **摘要文字** | `🤖 AI Coding Agent <code>37</code>`（emoji + 名称 + 数量标签） |

### 15.4 项目卡片规范

| 字段 | 格式 | 长度限制 | 示例 |
|------|------|---------|------|
| **项目名** | `### owner/repo ⭐Stars · 🔤语言` | 完整显示 | `### esengine/DeepSeek-Reasonix ⭐14.7K · 🔤TypeScript` |
| **Stars 格式化** | ≥1000 显示 `X.XK`，否则显示整数 | — | `14.7K`、`5000` |
| **语言** | 来自 GitHub API 的 `language` 字段 | — | `TypeScript`, `Python` |
| **语言缺失** | 不显示 `· 🔤` 部分 | — | `### owner/repo ⭐5K` |
| **中文描述** | `🌏 **中文描述...**` | 200 字截断 | `🌏 **为 DeepSeek 原生的终端 AI 编程 Agent**` |
| **英文描述** | `📝 英文描述...` | 200 字符截断 | `📝 DeepSeek-native AI coding agent...` |
| **链接** | `🔗 [GitHub](url)` | — | `🔗 [GitHub](https://github.com/...)` |

### 15.5 我的关注表格规范

| 列 | 宽度 | 说明 |
|----|------|------|
| **项目** | 自适应 | 项目名链接到 GitHub |
| **Stars** | 固定 | `X.XK` 格式 |
| **分类** | 自适应 | 该项目的分类名称 |
| **备注** | 自适应 | 用户填写的关注理由 |

### 15.6 空状态处理

| 场景 | 显示 |
|------|------|
| 分类无项目 | 不输出该分类 |
| 某个分类精选不足 5 个 | 实际有几个显示几个 |
| 我的关注为空 | 不显示 👁️ 区域 |
| 无中文描述 | 不显示 🌏 行，直接显示 📝 行 |

### 15.7 响应式/可读性

| 需求 | 说明 |
|------|------|
| 所有链接可点击 | GitHub Markdown 原生支持 |
| 折叠区可交互 | 浏览器原生 `<details>` 支持点击展开/折叠 |
| 代码块不溢出 | 项目名放在标题（###）中，无需代码块 |
| 深色模式兼容 | 标准 GitHub Markdown，自动适配 |

---

## 16. 边界情况 & 异常处理

| # | 场景 | 预期行为 |
|---|------|---------|
| E1 | 搜索 API 返回 0 结果 | 跳过该查询，继续下一个 |
| E2 | 所有搜索都返回 0 结果 | 保留上次缓存，不覆盖 |
| E3 | GitHub Actions Token 未配置 | workflow 运行失败，打印错误 |
| E4 | 搜索结果中 Star 数低于门槛 | 过滤掉，不收录 |
| E5 | 同名项目在不同搜索中重复出现 | 只收录一次，标记首次出现的分类 |
| E6 | `manual_overrides.json` JSON 格式错误 | classify.js 退出并打印解析错误 |
| E7 | `config/categories.json` 缺少 `priority` 字段 | 默认 priority = 0 |
| E8 | 中文 README 抓取超时（3 秒） | 跳过中文描述，使用英文描述 |
| E9 | `watched.json` 中的项目不在任何分类中 | 显示 "⚠️ 未在搜索结果中找到" |
| E10 | add_missing 的项目已在搜索结果中 | 去重机制自动处理 |
| E11 | 工作流被手动触发时上次运行未完成 | GitHub 自动排队，不并发 |
| E12 | generate-readme.js 运行中 crash | 已写入的部分不提交（git diff 检测无变更） |

---

## 17. 维护异常处理流程

### 17.1 触发条件

以下情况进入维护异常流程：

| 触发条件 | 示例 |
|---------|------|
| GitHub Actions 运行失败 | 搜索 API 限速、脚本报错、提交失败 |
| README 出现明显错误 | 分类错乱、项目重复、描述乱码 |
| 分类质量下降 | 大量无关项目涌入同一分类 |
| 搜索策略失效 | topic 标签变化导致搜索结果锐减 |
| 你反馈"这里不对" | 任何你发现的问题 |

### 17.2 决策流程

```
发现问题
    │
    ▼
┌──────────────────────┐
│  你通知 Reasonix      │
│  "XX 有问题，看一下"   │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  Reasonix 分析原因    │
│  给出修复方案 +       │
│  预估影响范围         │
└──────────┬───────────┘
           ▼
┌──────────────────────────────────┐
│  你来决定下一步：                  │
│                                  │
│  A) Reasonix 直接修               │
│     → 改配置/脚本，提交 PR        │
│     → 你 review 后合并            │
│                                  │
│  B) 先暂停，下次维护再说           │
│     → 记录问题，标记 known issue  │
│     → 等你有空再处理              │
│                                  │
│  C) 你来自行处理                  │
│     → Reasonix 给建议方案         │
│     → 你按建议手动改              │
│                                  │
│  D) 降级/回滚                    │
│     → 恢复上次正常版本            │
│     → 暂时关闭自动更新             │
└──────────────────────────────────┘
```

### 17.3 各选项的约定

⚠️ **无论选哪个选项，变更原因必须记录到 `CHANGELOG.md`。** 不可篡改，只追加。

| 选项 | 你的投入 | Reasonix 的投入 | 记录要求 | 适合场景 |
|------|---------|----------------|---------|---------|
| **A) 直接修** | review + 确认（~2 分钟） | 完整排查 + 修复 | 写入 CHANGELOG：原因、变更内容、影响文件 | 大部分问题 |
| **B) 暂停** | 说"先放着"（~10 秒） | 记录问题到 known issues + CHANGELOG | 写入 CHANGELOG：发现了什么问题、暂缓原因、待办 | 不影响使用的小问题 |
| **C) 自己来** | 按建议手动操作（~5 分钟） | 出方案和步骤 | 你自行写入 CHANGELOG：做了什么、为什么 | 你想了解底层逻辑时 |
| **D) 回滚** | 说"回滚"（~10 秒） | 执行回滚操作 | 写入 CHANGELOG：回滚原因、回滚到哪个版本 | 大问题导致合集不可看 |

### 17.4 审计规范

**所有变更必须记录在 `CHANGELOG.md` 中，且满足以下规则：**

| 规则 | 说明 |
|------|------|
| **不可篡改** | 已有条目不能修改或删除，只能追加新条目 |
| **原因必填** | 每条记录必须有 `reason` 字段说明为什么改 |
| **变更者** | 标明是 CaseBuilding / Reasonix / 共同确认 |
| **时间戳** | 精确到日 |
| **影响范围** | 列出哪些文件被修改 |

**CHANGELOG.md 格式：**

```json
[
  {
    "date": "2026-05-31",
    "type": "config",
    "reason": "为什么做这个变更（必填）",
    "changed_by": "谁决定的",
    "changes": {
      "file路径": "做了什么改动"
    }
  }
]
```

**什么时候记录：**
- 每次修改 `config/` 下的配置文件
- 每次修改 `scripts/` 下的脚本逻辑
- 每次修改 `data/manual_overrides.json` 的 overrides 或 add_missing
- 每次修改 `docs/REQUIREMENTS.md`
- 每次修改 `CHANGELOG.md`（追加）本身

### 17.5 日常维护节奏

```
每周日 UTC 0:00 自动更新
    │
    ├── 成功 → 你不需要做任何事 ✅
    │
    └── 失败 → 你看到 GitHub Actions 红色标记
           │
           └── 你决定：叫我修 / 先放着 / 自己来
```

---

## 18. 配置文件格式规范

### 18.1 search-queries.json

```json
{
  "queries": {
    "分类ID": {
      "name": "分类显示名（仅参考）",
      "search": ["查询语句1", "查询语句2"],
      "max_results": 搜索上限（建议 20-100）
    }
  }
}
```

**约束：**
- `search` 数组每个元素是一条独立搜索，结果合并去重
- `max_results` 控制每个查询最多获取的项目数
- GitHub API 每页 100 条，最多 2 页

### 18.2 categories.json 中 priority 字段

```json
{
  "id": "分类ID",
  "priority": 1-10 的整数,
  "match": {
    "topics": ["关键词1", "关键词2"],
    "desc_keywords": ["描述1", "描述2"]
  }
}
```

**约束：**
- `priority` 越大越具体，多个匹配时取最高
- 建议 MCP=10 > Coding Agent=9 > ... > Agent 工作流=1
- 同一 priority 值的分类同时命中时，按 `order` 顺序取第一个

### 18.3 manual_overrides.json

```json
{
  "add_missing": {
    "owner/repo": { "category": "分类ID", "reason": "原因" }
  },
  "overrides": {
    "owner/repo": {
      "category": "分类ID | null",
      "hidden": true | false,
      "reason": "原因"
    }
  }
}
```

**约束：**
- `add_missing` → 收录没有 topic 标签的项目，脚本会主动获取
- `overrides` 中 `category: null` + `hidden: true` → 从合集中隐藏
- `overrides` 中 `category: "xxx"` → 强制归入指定分类

---

## 19. 目标用户

### 19.1 主要使用者

| 角色 | 说明 | 使用场景 |
|------|------|---------|
| **CaseBuilding（维护者）** | 项目创建者和唯一维护者 | 定期检查更新状态、手动修正分类、关注重要项目 |
| **中文 AI 开发者（浏览者）** | 使用中文的 AI 应用开发者，寻找开箱即用的工具 | 通过 README 发现适合的工具，靠中文描述快速定位 |

### 19.2 角色画像

**CaseBuilding（维护者）**
- 每周投入 10-15 分钟维护
- 需求：低维护成本、自动化运行、发现问题时能快速修复
- 不期望：手动整理列表、每天盯着 GitHub Actions

**中文 AI 开发者（浏览者）**
- 偶尔访问 README 找工具
- 需求：分类清晰、有中文描述、信息准确
- 不期望：项目重复、分类混乱、过时信息

---

## 20. 成功标准

### 20.1 量化指标

| 指标 | 当前值 | 目标 | 衡量方式 |
|------|--------|------|---------|
| 收录项目数 | 370 | 持续增长（每周净增 ≥0） | `repos.json` 的 `total_count` |
| 自动更新成功率 | — | ≥ 95%（月维度） | GitHub Actions 运行历史 |
| 已分类比例 | 97.3%（360/370） | ≥ 95% | `classified.json` 的 `stats` |
| 待确认项目数 | 0 | ≤ 10 | `classified.json` 的 `uncertain` 长度 |
| 分类准确率（主观） | — | 误分类 ≤ 5%（人工抽查） | 手动检查 classified.json |
| 手动覆盖维护频率 | — | 至少每月 review 一次 | CHANGELOG 记录 |

### 20.2 质量门禁

| 条件 | 通过标准 |
|------|---------|
| GitHub Actions 运行 | 三脚本依次执行无 error exit |
| README 生成 | 无空分类、无重复项目、导航链接有效 |
| 增量更新 | 已有项目不被删除（对比上次缓存） |
| 分类稳定性 | 同一项目在无配置变化时分类结果不变 |

---

## 21. 范围声明

### 21.1 在范围内（In Scope）

- 基于 GitHub topic 搜索的自动化项目收集
- 关键词 + 优先级自动分类（10 个类别）
- 手动分类修正和隐藏（`manual_overrides.json`）
- 按 Star 排序 + 精选/全部两级 README 展示
- 中文描述自动抓取（精选项目）
- 增量更新（已有项目持续保留）
- GitHub Actions 每周自动运行
- 我的关注（`watched.json` 独立展示）
- CHANGELOG 审计追踪

### 21.2 不在范围内（Out of Scope / Non-Goals）

- 不是 AI 工具搜索引擎（仅做合集展示，不做搜索功能）
- 不是 SaaS 平台（无后端服务、无数据库、无用户系统）
- 不是社区驱动的合集（不接受 PR 提交项目，仅维护者管理）
- 不做 AI 分类（使用关键词匹配，不使用 LLM 做分类决策）
- 不做代码分析（只读 GitHub metadata，不 clone 仓库分析代码）
- 不保证中文描述的完整性和准确性（自动抓取，不人工翻译）
- 不是实时更新（每周一次快照）

---

## 22. 风险与缓解措施

| # | 风险 | 概率 | 影响 | 缓解措施 |
|---|------|------|------|---------|
| R1 | **GitHub Search API 策略变更**（限速降低、废弃 topic 搜索） | 中 | 高——核心功能瘫痪 | 保持 `add_missing` 手动补充通道；关注 GitHub Changelog；预备切换到 `GET /repos` 遍历方案 |
| R2 | **topic 标签生态变化**（热门项目不再打标签，或标签含义漂移） | 中 | 中——搜索结果质量下降 | 依赖 `desc_keywords` 降级匹配；增加 manual_overrides 覆盖频率 |
| R3 | **收录量增长导致分类质量下降**（关键词匹配误报率上升） | 低→中 | 中 | 在需求中设定误报上限；定期 review 新增项目的分类结果 |
| R4 | **私有仓库 GitHub Actions 额度耗尽**（2,000 分钟/月） | 低 | 中——更新暂停 | 每次运行约 2-3 分钟，远低于限额；如接近限额可降频为双周更新 |
| R5 | **`@octokit/rest` 依赖过时或安全漏洞** | 低 | 中——脚本无法运行 | `npm audit` 定期检查；每周 CI 运行本身就是可用性验证 |
| R6 | **README 中文描述抓取依赖 Raw GitHub URL**（raw.githubusercontent.com 被屏蔽） | 低 | 低——仅精选项目缺中文描述 | 已设 3 秒超时自动跳过，不影响分类和英文展示 |

---

## 23. 未决问题（Open Questions）

以下问题尚未最终决定，将在后续迭代中确认：

| # | 问题 | 当前状态 | 建议方向 | 待谁决定 |
|---|------|---------|---------|---------|
| # | 问题 | 决定 | 后续行动 |
|---|------|------|---------|
| Q1 | 项目未来是否会开源？ | ✅ **保持私有**，不考虑公开 | 无 |
| Q2 | 5,000 Stars 门槛是否合适？是否要分层？ | ✅ **保持单一大于 5K 门槛**，不增加分层 | 待收录量 > 500 后重新评估 |
| Q3 | 当前 10 个分类是否够用？ | ✅ **暂不变动**，维持现有 10 个分类 | 新工具类别出现时再评估 |
| Q4 | 是否要支持社区提交项目？ | ✅ **暂不支持**，不开放 PR 提交 | 可考虑 issue 模板接收建议 |
| Q5 | README 是否要中英双语？ | ✅ **改为中英双语**（若原项目有英文描述则直接使用，若缺少则由 AI 后续补充） | 需在 generate-readme.js 中增加英文描述兜底逻辑，并将此作为 v1.2 或 v2.0 任务 |
| Q6 | 是否需要测试脚本？ | ✅ **暂不需要**，分类质量靠人工 review 兜底 | 无 |

---

## 24. 迭代计划（Roadmap）

| 阶段 | 目标 | 状态 | 时间 |
|------|------|------|------|
| **v1.0** | 基础功能：搜索→分类→生成 README 全链路跑通，10 个分类，370 项目 | ✅ 已完成 | 2026-05 |
| **v1.1** | Bug 修复：精选去重、死代码清理、文档编号修正 | 🔄 当前迭代 | 2026-06 |
| **v1.2** | 中英双语 README + 质量提升：AI 补充缺失中文描述、分类稳定性检查、误报率评估、搜索查询优化 | 📋 计划中 | 2026-06 |
| **v1.3** | 中英双语完善：README 展示结构调整为双语对照，导航/统计/页脚同步中英 | 📋 候选 | 2026-07 |

---

## 25. 术语表（Glossary）

| 术语 | 定义 |
|------|------|
| **PRD** | Product Requirements Document，产品需求文档 |
| **Topic 搜索** | GitHub 的 `topic:xxx` 标签搜索语法 |
| **优先级分类** | 一个项目匹配多个分类时，取 `priority` 值最高的分类 |
| **增量更新** | 已有项目永不删除，新项目追加的合并策略 |
| **精选推荐（Featured）** | 每个分类中 `confidence=high` 且非 uncertain 的前 5 个项目 |
| **`add_missing`** | 手动收录没有 topic 标签但值得收录的项目 |
| **`manual_overrides`** | 手动修正分类结果或隐藏项目的配置文件 |
