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

---

## 4. 分类方案（共 10 个）

| # | 分类 | 说明 | 示例项目 |
|---|------|------|---------|
| 1 | 🤖 AI Coding Agent | AI 编程助手，自动写代码、重构、调试 | Reasonix, Claude Code, Cursor, Aider, Continue |
| 2 | 🔌 MCP / 工具生态 | 模型上下文协议相关：MCP Servers、Clients 等 | FastMCP, mcp-toolbox |
| 3 | 🔍 代码分析 / 理解 | 大项目代码分析、代码图谱、依赖分析 | code-review-graph, Understand-Anything |
| 4 | 🗺️ 代码导图 / 可视化 | 生成架构图、调用图、UML、依赖图 |—|
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
Top 5 高 confidence + 高 Stars 的项目，含中文描述

### 📋 全部项目 (折叠)
其余项目列表，不含中文描述

</details>
```

- 前 3 个分类默认展开，其余折叠
- 中文描述仅对精选项目抓取（从 `README.zh-CN.md` 提取）
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
🌏 中文描述（如果有，仅精选项目）
📝 英文描述
🔗 GitHub 链接
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
