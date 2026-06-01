# Spec: 新增项目标记 🆕 与「本周新增」区块

## Objective

在 README 中自动标记最近 7 天内新收录的项目，使用户能一眼看出哪些是新上榜的工具。

**成功标准：**
- 每个新项目行尾显示 🆕 标记
- README 顶部导航下方新增"📬 本周新增"汇总区块
- 超过 7 天的项目自动失去 🆕 标记（不需要手动清理）
- 全部 31 个测试通过

## Tech Stack

- Node.js 24 + ESM（项目现有栈）
- JSON 数据文件（无数据库）

## Commands

```bash
# 验证用（需 token）
set GITHUB_TOKEN=xxx && npm run build

# 测试
npm test
```

## 变更文件

| 文件 | 变更类型 | 说明 |
|---|---|---|
| `scripts/fetch-repos.js` | 🔧 修改 | 新 repo 入库时写入 first_seen.json |
| `scripts/generate-readme.js` | 🔧 修改 | 顶部新增"📬 本周新增"区块；行尾 🆕 |
| `data/first_seen.json` | 🆕 新建 | 存量项目标 last_updated 日期 |
| `test/classify.test.js` | 🔧 修改 | 测试 🆕 标记逻辑 |

## 数据格式

`data/first_seen.json`:
```json
{
  "roboflow/supervision": "2026-06-01",
  "google-ai-edge/mediapipe": "2026-06-01"
}
```

## 关键逻辑

```
fetch-repos.js 跑完 → 对比新旧 repos 列表
  → 新出现的 repo → first_seen[full_name] = 今天
  → 已有的 repo → 不做任何操作（保留首次出现日期）

generate-readme.js 生成时：
  → 读取 first_seen.json
  → last_updated 取自 repos.json
  → first_seen 在 last_updated 前 7 天内 → 🆕
  → 否则 → 无标记
```

## 边界条件

- **首次部署：** 存量 repo 全部设 first_seen = repos.json 的 last_updated，不会出现误标 🆕
- **超过 7 天：** 自然消失，不删 first_seen 里的记录
- **增量更新：** 下次 fetch 新增的 repo 会新增 first_seen 记录
- **手动重置：** 删 first_seen.json 会自动重建（所有 repo 标为当天 → 但有 7 天窗口期问题，需特殊处理）

## Boundaries

- **Always do:** 新 repo 才写 first_seen；存量不覆盖
- **Ask first:** 🆕 图标要不要换成别的？汇总区块放导航上方还是下方？
- **Never do:** 不修改 first_seen 中已有的日期；不删历史数据

## Open Questions

- [ ] 🆕 标记放在项目行首还是行尾？
- [ ] "📬 本周新增"区块放导航上方还是下方？
