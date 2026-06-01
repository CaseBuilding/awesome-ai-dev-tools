# ADR-004: 使用逗号语法（topic:key1,key2）而非括号 OR 语法

## Status

Accepted

## Date

2026-05-31

## Context

GitHub Search API 支持多种表示 OR 的语法：
- 括号语法：`(topic:ai-agent OR topic:coding-agent)`
- 逗号语法：`topic:ai-agent,coding-agent`
- 空格语法（AND）：`topic:ai-agent topic:coding-agent`

最初使用括号语法，但搜索结果始终为 0。需要找到 GitHub Search API 实际支持的 OR 语法。

## Decision

使用逗号语法 `topic:key1,key2` 表示 OR。

## Alternatives Considered

### 括号 OR 语法

```
q=(topic:ai-agent OR topic:coding-agent) stars:>=5000
```

- Result：总返回 0 结果
- 原因：GitHub Search API 对括号的支持有限，URL 编码后的括号可能被忽略
- Rejected

### 逗号语法

```
q=topic:ai-agent,coding-agent stars:>=5000
```

- Result：正确返回 48 个结果
- 验证：URL 编码后（`topic%3Aai-agent%2Ccoding-agent`）同样工作
- Accepted

### 多次搜索后合并

- Pros：无需 OR 语法
- Cons：API 调用数翻倍，增加限速风险
- Rejected

## Consequences

- 所有搜索查询必须使用逗号语法
- `config/search-queries.json` 中的查询语句没有括号
- 单个 topic 查询内用逗号分隔多个关键词
- API 返回结果合并去重后作为该分类的项目池
