# AI 分类工作流设计

> 让 AI 对 GitHub 项目做分类审查时，结果稳定、可审计、可复现。

## 目录

1. [问题分析](#1-问题分析)
2. [整体架构](#2-整体架构)
3. [判定标准（Standard）](#3-判定标准standard)
4. [输入上下文（Context）](#4-输入上下文context)
5. [锚定样本（Anchor）](#5-锚定样本anchor)
6. [审计追踪（Audit）](#6-审计追踪audit)
7. [Prompt 模板](#7-prompt-模板)
8. [数据文件设计](#8-数据文件设计)
9. [集成方案](#9-集成方案)
10. [工作流示例](#10-工作流示例)

---

## 1. 问题分析

### 1.1 不稳定的根源

AI 在不同次会话中对同一项目分类不同的原因有四个层面：

| 层 | 问题 | 当前状况 |
|----|------|---------|
| **标准** | 判定标准不明确 | 关键词匹配规则（code）是确定的，但 AI 审查时没有书面标准，每次凭感觉 |
| **上下文** | 输入信息不足 | AI 分类时通常只看 `description` + `topics`（约 300 字符），未读 README |
| **锚定** | 没有参考样本 | AI 不知道某个分类的"典型项目"长什么样，缺乏标杆 |
| **审计** | 推理不可追溯 | AI 输出结果但没保留推理过程，下次无法验证对错 |

### 1.2 目标

每次 AI 分类满足：

1. **确定性** — 同一项目、同一上下文 → 同一分类
2. **可审计** — 每条分类都有推理记录，可追溯、可反驳
3. **可改进** — 发现分错时，有明确的改进路径（扩样本 / 调标准 / 加 override）

---

## 2. 整体架构

```
┌──────────────────────────────────────────────────────────┐
│                    分类结果优先级链                        │
│                                                          │
│  ① manual_overrides.json  ← AI 审核心得，手工修正          │
│     优先级: 最高 (锁定，永不重新匹配)                       │
│                                                          │
│  ② classification-locks.json  ← 确定性缓存，一次锁定终身   │
│     优先级: 中 (锁定，除非 --relock 强制刷新)               │
│                                                          │
│  ③ autoClassify()  ← 关键词匹配，对新项目自动分类            │
│     优先级: 低 (仅对新项目或无锁定项目)                     │
└──────────────────────────────────────────────────────────┘

AI 的角色:
  ┌─ 对新项目执行分类审查 → 写入 classification-locks.json
  ├─ 对已有锁定项目做深度 review → 修改 manual_overrides.json
  └─ 分类结果存在争议时 → 记录推理到 classification-locks.json._reason
```

### 2.1 什么时候用 AI 分类？

| 场景 | AI 介入 | 写入目标 |
|------|---------|---------|
| 新项目（首次出现，无 lock） | 执行标准分类流程 | `classification-locks.json` |
| 已有 lock 的项目（日常 rebuild） | 不介入，直接读 lock | — |
| 手工触发深度 review | 逐类审阅，判断 override 需求 | `manual_overrides.json` |
| 分类规则变更后 | 执行 `--relock` 全面刷新 | `classification-locks.json` |

---

## 3. 判定标准（Standard）

所有分类判断依据以下 **5 条测试**，逐条执行，优先级从高到低。只有前一条通过了才进入下一条。

### 3.1 主业测试（Primary Purpose）

该项目的**主业**是什么？用户下载它的**首要原因**是什么？

> 不要看它的 topic 标签写了什么，不要看它顺便支持了什么功能。看它首页 README 第一句话怎么定义自己。

**示例：**
- `rtk-ai/rtk` → "CLI proxy that reduces LLM token consumption" → 主业是 Token 代理，不是编码
- `unslothai/unsloth` → "Web UI for training and running open models" → 主业是 LLM 微调/训练

**规则：** 主业不明显的 → 进入开发者预期测试。

### 3.2 开发者预期测试（Developer Expectation）

一个开发者点进该分类看到这个项目，会**意外还是自然**？

> 换位思考：如果我在找 X 工具，我会期待在这个分类下看到它吗？

**示例：**
- `gitpod-io/gitpod` 在 `code-analysis` 下 → 意外（云 IDE 不是代码分析）
- `gitpod-io/gitpod` 在 `dev-tools` 下 → 自然

### 3.3 最佳归属测试（Best Fit）

多个分类都能匹配时，选**最佳**而非"第一个命中的"。

> 如果有 60% 的理由归 A、40% 的理由归 B，选 A。取交集不如取并集——选覆盖面最窄的那个。

**示例：**
- `presenton/presenton`：有 `ai-agent` topic → 可归 ai-coding-agent。但主业是 PPT 生成 → `doc-knowledge` 更精确
- `CherryHQ/cherry-studio`：AI 编码辅助功能 + 通用 AI 聊天 → `dev-tools` 而非 `ai-coding-agent`

### 3.4 开发者工具相关性测试（Developer Tool Relevance Gate）

该项目的核心用户是**开发者**吗？它在**开发工作流**中起作用吗？

> 不限 AI。传统的 CLI 工具、代码格式化工具、Git 工具都可以收录，走通用分类。

**示例：**
- `gcanti/io-ts` → TypeScript 类型库，开发者工具 → `dev-tools`
- `ohmyzsh/ohmyzsh` → Shell 配置框架，开发者工具 → `devops`
- `fastapi/fastapi` → Web 框架，开发者工具 → `web-framework`

**不收录（不在本合集范围内）：**
- 纯消费型应用（Notion 替代品、个人笔记）
- 纯金融/股票分析工具
- 社交媒体管理工具

### 3.5 最少意外原则（Least Surprise）

拿不准时，宁可选宽泛的通用分类，也不选具体的 AI 分类。

> 假阳性（放到具体 AI 分类但实际不符）比假阴性（放到通用分类但实际是 AI 工具）更坏。
> 因为假阳性会让读者质疑整个分类体系的质量；假阴性只是多翻一个分类的事。

**通用分类（安全网）：**
- `dev-tools` — 通用开发者工具（默认兜底）
- `web-framework` — Web 服务框架
- `database-storage` — 数据库与存储
- `devops` — DevOps 与部署
- `security` — 安全工具
- `learning` — 学习资料
- `self-hosted` — 自托管服务

### 3.6 分类特定指导规则

| 分类 | 适合 | 不适合 |
|------|------|--------|
| ai-coding-agent | AI 编码代理、代码辅助、代码生成 CLI/IDE | 通用 AI 聊天、项目管理 |
| agent-framework | Agent 编排框架、多 Agent 系统 | 单个聊天 Bot、纯 workflow 引擎 |
| workflow-automation | 工作流引擎、DAG、管道编排 | Agent 框架（走 agent-framework） |
| mcp | MCP server/client、MCP 协议工具 | 非 MCP 的浏览器自动化 |
| local-inference | 本地 LLM 推理引擎、模型部署 | 类型推理（type inference）、API 客户端 |
| llm-sdk | LLM 开发框架、RAG 框架、Agent SDK | 单模型训练工具 |
| ai-gateway | API 代理、模型路由、成本管理 | 单一模型提供商客户端 |
| evaluation | LLM 评估、可观测性、Prompt 测试 | 通用 APM、运维监控 |
| browser-automation | 浏览器操控、网页抓取、AI 浏览器代理 | 纯无头浏览器（无 AI 能力） |
| doc-knowledge | 文档解析、知识库、RAG 应用 | 通用笔记应用 |
| media-processing | 音视频处理、语音识别、图像处理 | LLM 微调训练 |
| code-analysis | 代码分析、Linter、代码审查 | CI/CD 平台、IDE 环境 |
| dev-tools | CLI 工具、API 工具、Git 工具、通用生产力 | 不属于上述任何 AI 分类的开发者工具 |
| learning | 教程、课程、awesome 列表 | 文档工具（走 doc-knowledge） |

---

## 4. 输入上下文（Context）

### 4.1 最小输入集（必需）

```
full_name: owner/repo
description: ...
topics: [topic1, topic2, ...]
stars: 12345
language: Python
_source: topic_search / desc_search / wildcard
```

### 4.2 扩展输入集（深度 review 时）

```
# 上述 + README 首页内容（前 2000 字符或第一屏）
readme_first_page: "..."
# 从 README 提取的关键信息
readme_primary_purpose: "..."
readme_target_users: "..."
readme_key_features: ["...", "..."]
```

### 4.3 上下文获取策略

| 信息源 | 获取方式 | 使用场景 |
|--------|---------|---------|
| GitHub API `/repos/{owner}/{repo}` | 已有 `repos.json` | 最小输入（每日） |
| GitHub API `/repos/{owner}/{repo}/readme` | 运行时 fetch | 深度 review（按需） |
| GitHub raw README.md | `raw.githubusercontent.com` | 深度 review（按需） |

**成本控制：** 全量 1364 个 repo 读 README 约需 1300+ 次 HTTP 请求。建议：
- 初始全量 review：分批跑，每次处理一个分类（约 50-150 个）
- 日常增量：仅对新项目（每周约 10-30 个）读 README

---

## 5. 锚定样本（Anchor）

### 5.1 样本库结构

```json
{
  "_说明": "每个分类的标杆项目。AI 分类时参考这些示例来校准判断标准。",
  "version": "1.0",
  "last_updated": "2026-06-08",
  "samples": [
    {
      "full_name": "owner/repo",
      "category": "分类ID",
      "reason": "为什么归此类的简要说明",
      "key_signals": ["关键信号词1", "关键信号词2"],
      "false_signals": ["容易被误判的词1", "易混淆 topic"],
      "confidence": "high" | "medium" | "low"
    }
  ]
}
```

### 5.2 初始化样本库

从已经 override + 审核确认的 repo 中选取每个分类 3-5 个标杆项目。

**建议的初始样本（基于之前审核结果）：**

| 分类 | 锚定项目 | 为什么 | 注意避免混淆 |
|------|---------|--------|------------|
| ai-coding-agent | `anomalyco/opencode` | 开源编码代理，主业就是 coding agent | 虽有 `ai-agent` topic，但主业是编码 |
| ai-coding-agent | `TabbyML/tabby` | 自托管 AI 编码助手，明确 | 不要只看 `ai` topic |
| agent-framework | `Significant-Gravitas/AutoGPT` | 自动驾驶 Agent 框架 | 不是编码代理，是 Agent 框架 |
| agent-framework | `langflow-ai/langflow` | 可视化 Agent 构建平台 | 虽然也有 workflow 能力 |
| mcp | `modelcontextprotocol/servers` | MCP 官方 Servers | 明确标 MCP |
| mcp | `punkpeye/awesome-mcp-servers` | MCP 资源合集 | 既有 `ai` topic 也有 `mcp` |
| local-inference | `ollama/ollama` | 本地 LLM 推理标杆 | 注意 ollama 也有 `ai-agent` topic |
| local-inference | `open-webui/open-webui` | 本地 LLM Web UI | 注意 topic 含 `ai` |
| llm-sdk | `langchain-ai/langchain` | LLM 应用开发框架 | 注意 topics 含 `ai-agents` |
| ai-gateway | `BerriAI/litellm` | AI Gateway SDK + Proxy | topic 明确含 `ai-gateway` |
| browser-automation | `browser-use/browser-use` | AI 浏览器自动化 | topic 明确 |
| doc-knowledge | `PaddlePaddle/PaddleOCR` | 文档 OCR 工具 | 注意 topics 含大量 AI 标签 |
| code-analysis | `go-gitea/gitea` | 代码审查+Git 托管 | 注意不是 devops |
| dev-tools | `ohmyzsh/ohmyzsh` | 终端配置框架 | 开发者工具但非 AI |
| web-framework | `gin-gonic/gin` | Go Web 框架 | 纯 Web 框架，无 AI 成分 |
| learning | `codecrafters-io/build-your-own-x` | 编程教程合集 | 明确学习资源 |

### 5.3 样本库的维护

- 新增分类时 → 同步添加 3-5 个锚定项目
- 发现某分类频繁误判 → 添加更多"易混淆"反例
- 每次深度 review 后 → 可补充已确认的优质样本

---

## 6. 审计追踪（Audit）

### 6.1 每条分类记录的推理格式

每个进入 `classification-locks.json` 的 repo 必须附带 `_audit` 字段：

```json
{
  "full_name": "owner/repo",
  "category": "分类ID",
  "_audit": {
    "classified_by": "autoClassify | ai_review | manual_override",
    "timestamp": "2026-06-08T12:00:00Z",
    "source": "topic_search | desc_search | wildcard",
    "primary_purpose": "从 README 提取的主业描述",
    "standard_checklist": {
      "primary_purpose_test": "通过/失败 - 原因",
      "developer_expectation_test": "通过/失败 - 原因",
      "best_fit_test": "通过/失败 - 原因",
      "ai_relevance_test": "通过/失败 - 原因"
    },
    "reason": "完整推理过程",
    "confidence": "high | medium | low",
    "reviewed_by": "AI | 人工"
  }
}
```

### 6.2 变更记录（CHANGELOG.md）

每次分类变更（override、lock 更新、relock）在 `CHANGELOG.md` 中追加记录：

```json
{
  "date": "2026-06-08",
  "type": "classification_change",
  "repo": "owner/repo",
  "from": "旧分类ID",
  "to": "新分类ID",
  "reason": "变更原因",
  "trigger": "depth_review | user_feedback | relock"
}
```

### 6.3 版本化锁定

`classification-locks.json` 包含版本号和生成时间：

```json
{
  "_说明": "确定性分类缓存。一次锁定，除非 --relock 否则永不重新匹配。",
  "version": "1.0",
  "generated_at": "2026-06-08T12:00:00Z",
  "lock_count": 1025,
  "locks": {
    "owner/repo": {
      "category": "分类ID",
      "_audit": { "...": "..." }
    }
  }
}
```

---

## 7. Prompt 模板

### 7.1 AI 分类审查 Prompt

以下是可以直接喂给 Reasonix（或其他 AI）的分类审查 prompt。设计原则：

1. **先给标准再给项目** — AI 在判断前先理解判定规则
2. **先给锚定样本** — 用标杆校准预期
3. **逐条测试输出** — 要求 AI 显示每步推理
4. **最后下结论**

```
## 任务

判断以下 GitHub 项目应归入哪个分类。

## 判定标准（按优先级逐条执行）

1. **主业测试** — 项目的首要目的是什么？看 README 首页第一句话。
2. **开发者预期测试** — 一个开发者会在该分类下期待看到这个项目吗？
3. **最佳归属测试** — 多个可归分类中选最精确的那个。
4. **开发者工具相关性测试** — 该项目的核心用户是开发者吗？
5. **最少意外原则** — 拿不准时选宽泛的分类，不要硬塞进 AI 分类。

详细判定规则见分类特定指导规则。

## 锚定样本（作为参考基准）

{{anchor_samples}}

## 待分类项目

- full_name: {{full_name}}
- description: {{description}}
- topics: {{topics}}
- stars: {{stars}}
- language: {{language}}
- source: {{_source}}
- readme_first_page: {{readme_first_page}}

## 输出格式

你只需输出 JSON，不要输出其他内容：

{
  "primary_purpose": "一句话总结主业",
  "standard_checklist": {
    "primary_purpose_test": {"result": "通过|失败|不确定", "reason": "..."},
    "developer_expectation_test": {"result": "通过|失败|不确定", "reason": "..."},
    "best_fit_test": {"result": "通过|失败|不确定", "reason": "..."},
    "ai_relevance_test": {"result": "通过|失败|不确定", "reason": "..."}
  },
  "suggested_category": "分类ID",
  "confidence": "high|medium|low",
  "reason": "完整推理过程"
}
```

### 7.2 锚定样本注入格式

每次调用时，从 `data/classification-anchors.json` 中取出目标分类的 3-5 个样本 + 附近易混淆分类的 1-2 个样本，格式化为：

```
## 锚定样本

### ai-coding-agent
- anomalyco/opencode — 开源编码代理，CLI 界面。
  关键信号: coding agent, code assistant
  易混淆: ai-agent topic（不能单靠 ai-agent 判断）

- TabbyML/tabby — 自托管 AI 编码助手。
  关键信号: coding assistant, codegen
  易混淆: 虽含有 ai topic 但主业是编码

### agent-framework
- Significant-Gravitas/AutoGPT — 自主 Agent 框架。
  关键信号: agents, multi-agent
  易混淆: 有 ai 标签但不是编码代理

...（按需继续）
```

### 7.3 批量分类 Prompt（用于 pending_ai_review）

处理 `pending_ai_review.json` 中大量待分类项目时，使用以下结构：

```
## 批量分类任务

以下是 {{count}} 个待分类项目。请逐个判断，输出 JSON 数组。

判定标准和锚定样本同上。

项目列表：

{{projects_json}}

输出格式：
[
  {
    "full_name": "owner/repo",
    "suggested_category": "分类ID",
    "confidence": "high|medium|low",
    "primary_purpose": "主业",
    "reason": "推理过程"
  }
]
```

---

## 8. 数据文件设计

### 8.1 新增文件

| 文件 | 用途 | 是否自动生成 |
|------|------|-------------|
| `data/classification-locks.json` | 确定性锁定缓存 | ✅ classify.js 自动维护 |
| `data/classification-anchors.json` | 锚定样本库 | ❌ 手动编辑，随 review 扩充 |
| `data/classification-audit.json` | 审计日志（每条 AI 分类的推理） | ✅ AI 审核时写入 |

### 8.2 修改文件

| 文件 | 修改内容 |
|------|---------|
| `scripts/classify.js` | 新增 locks 读取逻辑；优先级链改为 override > lock > autoClassify；新增 `--relock` 参数 |
| `scripts/classify.js` | autoClassify 新增项目时自动写入 lock（含 `_audit` 字段） |
| `docs/ARCHITECTURE.md` | 更新数据流图和文件说明 |

### 8.3 classification-locks.json 结构

```json
{
  "_说明": "确定性分类缓存。一次锁定，除非 --relock 否则永不重新匹配。",
  "_说明2": "优先级: manual_overrides.json > classification-locks.json > autoClassify()",
  "version": "1.0",
  "generated_at": "2026-06-08T12:00:00Z",
  "classifier_version": 1,
  "lock_count": 1025,
  "locks": {
    "owner/repo": {
      "category": "分类ID",
      "_matched_by": "topic|description|override",
      "_confidence": "high|low",
      "_overridden": false,
      "_audit": {
        "classified_by": "autoClassify",
        "timestamp": "2026-06-08T12:00:00Z",
        "source": "topic_search",
        "primary_purpose": "从 README/描述提取的主业",
        "standard_checklist": {
          "primary_purpose_test": {"result": "通过", "reason": "..."},
          "developer_expectation_test": {"result": "通过", "reason": "..."},
          "best_fit_test": {"result": "通过", "reason": "..."},
          "ai_relevance_test": {"result": "通过", "reason": "..."}
        },
        "reason": "完整推理",
        "confidence": "high"
      }
    }
  }
}
```

### 8.4 classification-anchors.json 结构

```json
{
  "_说明": "每个分类的标杆项目。AI 分类时参考这些示例来校准判断。",
  "version": "1.0",
  "last_updated": "2026-06-08",
  "anchors": {
    "ai-coding-agent": {
      "positive": [
        {
          "full_name": "anomalyco/opencode",
          "reason": "主业就是 coding agent",
          "key_signals": ["coding agent", "code assistant"],
          "false_signals": ["ai-agent"]
        }
      ],
      "negative": [
        {
          "full_name": "hugohe3/ppt-master",
          "reason": "主业是 PPT 生成，虽有 ai-agent topic 但不属于编码代理",
          "false_signal": "ai-agent"
        }
      ]
    }
  }
}
```

---

## 9. 集成方案

### 9.1 classify.js 修改

```javascript
// 新增流程：
function classifyRepo(repo) {
  // 1. manual_overrides.json — 手工修正优先
  const override = overrides.overrides?.[repo.full_name];
  if (override) return applyOverride(repo, override);

  // 2. classification-locks.json — 锁定缓存
  const lock = locks[repo.full_name];
  if (lock && !relockMode) {
    return { matched: [lock.category], confidence: lock._confidence, locked: true };
  }

  // 3. autoClassify — 自动匹配（仅新项目）
  const autoResult = autoClassify(repo);
  if (autoResult.matched.length > 0) {
    // 自动写入 lock
    locks[repo.full_name] = {
      category: autoResult.matched[0],
      _matched_by: autoResult.confidence === "high" ? "topic" : "description",
      _confidence: autoResult.confidence,
      _overridden: false,
      _audit: {
        classified_by: "autoClassify",
        timestamp: new Date().toISOString(),
      }
    };
    return autoResult;
  }

  // 4. 没匹配 → 未分类
  return { matched: [], confidence: "low" };
}
```

### 9.2 分类确定性证明

要证明分类结果是确定性的：

```bash
# 运行两次，输出必须一致
npm run classify && cp data/classified.json data/classified-run1.json
npm run classify
diff data/classified.json data/classified-run1.json
# 期望输出: 无差异
```

### 9.3 与 ai-classify.js 的关系

`ai-classify.js` 保持现有功能不变，但 AI 审查后的结果写入路径为：

```
ai-classify.js --apply <json> 
    ↓
写入 manual_overrides.json 的 overrides 字段
    ↓
下次 classify.js 运行时自动读取 override
    ↓
同时更新 classification-locks.json 中的对应条目
```

---

## 10. 工作流示例

### 10.1 每周增量更新

```
① fetch-repos.js → 拉新项目到 repos.json
② classify.js:
   - 已有 lock 的项目 → 直接读 lock
   - 新项目 → autoClassify() → 写 lock（含 _audit）
   - 新项目中无法分类的 → pending_ai_review.json
③ generate-readme.js → 生成 README.md
```

### 10.2 深度 review 流程（本项目的下一步）

```
① 选择一个分类（如 agent-framework，153 个项目）
② 加载锚定样本（从 classification-anchors.json）
③ 对分类中的项目按 stars 排序
④ 逐个检查（重点关注 low confidence + 可疑 topic 匹配）：
   - 看 description + topics
   - 可疑项目 fetch README
   - 按 5 条标准判断
   - 分错的 → 写入 manual_overrides.json
   - 分对的 → 不需要改，但仍可在 anchor 库添加标杆
⑤ 该分类检查完毕后，再选下一个
```

### 10.3 确定性验证

```
① 修改完一批 override 后
② npm run classify → 生成新 classified.json
③ 再次 npm run classify → diff 两次结果 → 必须一致
④ npm run generate → 生成 README
⑤ npm test → 全部通过
```

---

## 附录：与现有系统的兼容性

| 方面 | 兼容性 |
|------|--------|
| `fetch-repos.js` | 不受影响，仍然是 `repos.json` 的输入源 |
| `classify.js` | 新增 locks 读取逻辑，原有 `autoClassify()` 不变；新增 `--relock` 参数 |
| `generate-readme.js` | 不受影响，读取的是 `classified.json` |
| `ai-classify.js` | 可配合使用，结果写入 `manual_overrides.json` |
| `generate-site.js` | 不受影响 |
| `npm test` | 新增 locks 相关测试，不破坏现有测试 |
| `CHANGELOG.md` | 新增 audit 事件类型记录 |
