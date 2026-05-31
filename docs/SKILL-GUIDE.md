# Skill 使用指南

适用于 `awesome-ai-dev-tools` 项目。当你不确定用什么 skill 时，按这个流程走。

## 快速入口

```
有新想法/反馈
    │
    ├── 模糊想法，说不清楚 ──────→ interview-me
    ├── 有清晰需求，涉及多个文件 ─→ spec-driven-development
    ├── 想要拆任务/估工作量 ────→ planning-and-task-breakdown
    ├── 开始实现 ──────────────→ incremental-implementation
    ├── 想检查方案有没有漏洞 ───→ doubt-driven-development
    ├── 写完想审查代码 ────────→ code-review-and-quality
    ├── 想加测试 ──────────────→ test-driven-development
    ├── 想提交 ────────────────→ git-workflow-and-versioning
    ├── 想记录决策原因 ────────→ documentation-and-adrs
    ├── 出了 Bug ──────────────→ debugging-and-error-recovery
    ├── 浏览代码库找线索 ──────→ explore（内置）
    └── 需要查资料+看代码 ────→ research（内置）
```

## 推荐完整流程（新功能）

```
① interview-me
      追问你到底想要什么（别让我猜）
      输出：一句话需求确认

② spec-driven-development
      把需求写成规格，你确认后再动手
      输出：spec 文档

③ planning-and-task-breakdown
      拆成可执行的任务，排依赖
      输出：任务列表

④ incremental-implementation
      按任务切片实现，每个切片验证
      输出：可运行的改动

⑤ doubt-driven-development（可选）
      关键决策交叉检查，防止想当然
      输出：审查意见

⑥ npm test
      红绿灯测试，确认没崩

⑦ code-review-and-quality
      提交前五维审查（正确性/可读性/架构/安全/性能）
      输出：审查报告

⑧ git-workflow-and-versioning
      commit + push
```

## 本项目已建立的基础设施

| 项目 | 说明 |
|------|------|
| `npm test` | 29 个红绿灯测试，零依赖 |
| `npm run generate` | 生成本地 README |
| `data/chinese_descriptions.json` | 中文描述缓存 |
| `test/fixtures/` | 测试 mock 数据，不碰真实数据 |
| `docs/REQUIREMENTS.md` | 完整需求文档（§1-25） |
| `CHANGELOG.md` | 变更审计日志 |

## 提醒

- 别跳步。跳过 `interview-me` 直接实现，大概率返工
- 单文件简单改动不需要走完整流程，`incremental-implementation` 就够了
- `explore` 适合查"这个字段在哪里被消费"这类跨文件追踪
