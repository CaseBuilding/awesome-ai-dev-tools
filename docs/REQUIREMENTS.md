# Awesome AI Dev Tools — 需求文档

## 1. 项目概述

在 GitHub 上建立一个**热门 AI 开发者工具合集仓库**，通过自动化脚本定期搜索 GitHub 上高星 AI 相关项目，按分类整理，生成 README.md 展示。

### 核心理念

- **程序员视角** — 关注能用起来的工具，而非基础设施（训练、微调、向量数据库等不收录）
- **自动化优先** — GitHub Actions 定时更新，降低维护成本
- **配置驱动** — 分类规则、关键词写在 JSON 里，改配置不改代码
- **人机协作** — 自动分类为主，手动修正兜底

---

## 2. 项目名

> 待定，建议: `awesome-ai-dev-tools`

---

## 3. 收录标准

| 条件 | 标准 |
|------|------|
| ⭐ **Star 门槛** | ≥ **5,000** Stars |
| 🔄 **更新频率** | 每周自动更新（GitHub Actions 定时 + 支持手动触发） |
| 🌐 **范围** | GitHub 上的 AI / LLM 开发者工具 |
| 🚫 **不收录** | 训练框架、微调工具、向量数据库、纯学术论文实现 |

---

## 4. 分类方案（共 10 个）

| # | 分类 | 说明 | 示例项目 |
|---|------|------|---------|
| 1 | 🤖 AI Coding Agent | AI 编程助手，自动写代码、重构、调试 | Reasonix, Claude Code, Cursor, Aider, Continue |
| 2 | 🔌 MCP / 工具生态 | 模型上下文协议相关：MCP Servers、Clients 等 | FastMCP, mcp-toolbox |
| 3 | 🔍 代码分析 / 理解 | 大项目代码分析、代码图谱、依赖分析、架构可视化 |—|
| 4 | 🗺️ 代码导图 / 可视化 | 生成架构图、调用图、UML、依赖图 |—|
| 5 | 🧠 LLM 框架 / SDK | 搭建 LLM 应用的基础框架 | LangChain, LlamaIndex, DSPy |
| 6 | 🚪 AI 网关 / API 管理 | 多模型路由、成本管理、API 代理 | LiteLLM, Portkey, Helicone |
| 7 | 🔄 Agent / 工作流 | 编排多步骤 Agent 任务、工作流引擎 | LangGraph, AutoGen, Dify, n8n |
| 8 | ⚡ 本地推理 | 本地运行 LLM 的推理引擎 | Ollama, llama.cpp |
| 9 | 📏 评估 / 可观测 | AI 应用测试、评估、监控 | DeepEval, LangFuse |
| 10 | 🌐 浏览器自动化 | AI 驱动的浏览器操控 | Browser Use, Playwright MCP |

---

## 5. 每个项目展示的信息（6 个字段）

```
### 项目名
> ⭐ Stars · 🔤 语言 · 🏷️ 分类标签

**🎯 功能:** 核心功能介绍（1-2 句话）

**✅ 条件:** 运行前提（Node ≥ ?、是否需要 API Key、是否付费）

**📝 描述:** 详细说明项目是做什么的、解决了什么问题

**🔗 链接:** GitHub 仓库地址
```

### 实际渲染效果

```
### Reasonix
> ⭐ 14.7K · 🔤 TypeScript · 🏷️ AI Coding Agent, MCP

**🎯 功能:** DeepSeek 原生的终端 AI 编程 Agent，MCP 支持、Skills 扩展
**✅ 条件:** Node ≥ 22、DeepSeek API Key
**📝 描述:** 围绕 prefix-cache 稳定性设计的编码助手，缓存命中率 99%+
**🔗 链接:** https://github.com/esengine/DeepSeek-Reasonix
```

---

## 6. 分类逻辑

### 6.1 自动分类（关键词匹配）

不使用 AI 进行分类。脚本通过项目自带的 `topics` 标签和 `description` 描述，与预定义关键词表匹配。

**匹配优先级：**

```
1. topics 标签匹配（最准确，项目维护者自己打的标签）
2. description 关键词匹配（降级方案）
3. 都不匹配 → 放入待分类列表，人工指定
```

### 6.2 手动覆盖

在 `data/manual_overrides.json` 中记录手动修正，脚本每次运行都会读取并应用，**自动更新不会冲掉手动调整**。

---

## 7. 数据管理

| 文件 | 由谁维护 | 作用 |
|------|---------|------|
| `config/categories.json` | 你手动编辑 | 定义分类名称 + 匹配关键词 |
| `config/search-queries.json` | 你手动编辑 | 定义每个分类的搜索条件 |
| `data/repos.json` | 脚本自动生成 | 缓存原始数据，避免重复搜索 |
| `data/manual_overrides.json` | 你手动编辑 | 手动修正自动分类结果 |

---

## 8. 维护成本

| 事项 | 频率 | 耗时 |
|------|------|------|
| GitHub Actions 自动更新 | 每周日 UTC 8:00 | 0 分钟 |
| 检查新项目分类是否准确 | 每月 | ~5 分钟 |
| 手动修正分类 | 偶尔 | ~2 分钟 |
| 调整关键词配置 | 按需 | ~2 分钟 |

**预估每月维护：5-10 分钟**

---

## 9. 费用

| 项目 | 费用 |
|------|------|
| GitHub API（Token 认证） | ✅ 免费（5,000 次/小时） |
| GitHub Actions（公开仓库） | ✅ 免费（2,000 分钟/月） |
| 仓库托管（公开） | ✅ 免费 |
| **合计** | **¥0 / 月** |

仅需一个免费的 GitHub Personal Access Token。

---

## 10. 技术约束

- 脚本语言：Node.js (JavaScript)
- 运行环境：GitHub Actions（Ubuntu）
- API 调用：GitHub REST API (`/search/repositories`)
- 数据格式：JSON 配置驱动
- 输出产物：README.md
