# ADR-005: 使用 CHANGELOG.md 作为不可篡改的审计日志

## Status

Accepted

## Date

2026-05-31

## Context

项目运行过程中频繁需要调整配置（搜索关键词、分类规则、手动覆盖等）。这些变更如果没有记录，会导致：
- 不知道为什么某个配置被改过
- 后续维护者（包括 AI）不知道哪些决策已经做过
- 同一个问题可能被反复讨论

## Decision

建立 CHANGELOG.md 作为审计日志，所有变更必须记录：
- 只追加，不修改已有条目
- 每条记录必须包含：日期、类型、原因、变更者、影响文件

## Alternatives Considered

### 不记录

- Pros：零成本
- Cons：决策无追溯，项目难以长期维护
- Rejected

### 用 Git commit message 记录

- Pros：天然不可篡改
- Cons：commit message 容易被简写或遗漏，不易结构化查询
- Rejected：作为补充手段，而非主要记录

### CHANGELOG.md 审计日志（选定）

- Pros：
  - 结构化 JSON 格式，机器可读
  - 原因必填，不会出现"不知道为什么改的"
  - 位置明确，维护者和 AI 都知道去哪里查
  - 追加写入，天然不可篡改
- Accepted

### ADR 记录

- Pros：更详细的决策记录
- Cons：ADR 适合记录架构决策，不适合记录日常配置变更
- 结论：ADR 和 CHANGELOG 互补，ADR 记为什么，CHANGELOG 记做了什么

## Consequences

- CHANGELOG.md 采用 JSON 数组格式，追加写入
- 变更配置、脚本、文档时都要记录
- 配合 ADR 目录（docs/adr/）覆盖所有关键决策
- 当前已有 10 条初始记录
