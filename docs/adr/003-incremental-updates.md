# ADR-003: 增量更新而非全量替换

## Status

Accepted

## Date

2026-05-31

## Context

GitHub Search API 每次返回的结果不完全一致。原因：
- 项目 star 数在变化，可能影响排序
- 项目 topic 标签可能被修改
- 新项目不断出现，旧项目可能被归档

如果每次运行全量替换 repos.json，会导致：
- 上周收录的项目这周消失了（读者困惑）
- manual_overrides 中的手动修正指向了一个已不存在的项目
- 合集总量忽高忽低

## Decision

采用增量更新策略：每次运行时，将新搜索结果与已有缓存合并，已有项目保留，新项目追加。

## Alternatives Considered

### 全量替换

- Pros：实现简单
- Cons：合集内容不稳定，手动修正会被冲掉
- Rejected

### 增量更新（选定）

- Pros：
  - 合集只增不减，稳定性高
  - 手动修正永久保留
  - 新项目自然追加
- Cons：已收录但已过时的项目不会自动移除（可通过 manual_overrides 的 hidden 手动处理）

### 增量更新 + 自动过期清理

- Pros：自动清理低质量项目
- Cons：难以定义"过期"标准，可能误删有价值的项目
- Rejected：复杂度高，收益低

## Consequences

- 合集总量只会增长（目前 370 个）
- 手动修正一旦设置，永久生效
- 如果某个项目不应再出现，需手动在 `manual_overrides.json` 中标记 `hidden: true`
- 合并逻辑在 `scripts/fetch-repos.js` 中实现，使用 Map 按 full_name 去重
