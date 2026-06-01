# ADR-001: 使用 topic 标签搜索而非 description 搜索

## Status

Accepted

## Date

2026-05-31

## Context

需要从 GitHub 上自动搜索 AI 开发者工具项目。GitHub Search API 支持多种搜索维度：
- topic 标签（项目维护者主动打的标签）
- 项目名称
- 项目描述（description）
- README 内容

最初尝试同时使用 topic 和 description 搜索，以覆盖没有打标签但有对应描述的优质项目。

## Decision

仅使用 topic 标签搜索，不使用 description 搜索。

## Alternatives Considered

### topic + description 混合搜索

- Pros：能覆盖更多项目，包括没有打标签但描述匹配的
- Cons：
  - Search API 限速 30 次/分钟，混合搜索导致 API 调用数翻倍，频繁触发 403
  - description 匹配准确率低，大量无关项目被搜到（如含 "code analysis" 但实际不是代码分析工具的）
  - 跨查询去重复杂，同一项目可能被多个查询命中
- Rejected：API 限速问题和准确率问题无法接受

### 仅 topic 搜索 + add_missing 手动补充

- Pros：
  - API 调用少（每个分类 1 个查询，共 10 个），在限速范围内
  - topic 标签是项目维护者主动打的，准确率高
  - 遗漏的优质项目通过 `manual_overrides.json` 的 `add_missing` 字段手动补充
- Accepted：平衡了覆盖率和准确性

### 仅 README 搜索

- Cons：API 成本极高，结果噪音大
- Rejected

## Consequences

- 每个分类只需要 1 个搜索查询，总约 10 个 API 调用，稳定通过限速
- 高 star 项目通常都有完善的 topic 标签，覆盖率可接受
- 没有 topic 标签的优质项目（如 `Lum1104/Understand-Anything`）通过 `add_missing` 手动收录
- 需要人工维护 `add_missing` 列表
