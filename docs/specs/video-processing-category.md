# Spec: 新增「🎬 视频处理 / 生成」分类

## Objective

在 awesome-ai-dev-tools 中新增一个「视频处理/生成」分类，使 roboflow/supervision、google-ai-edge/mediapipe、Zulko/moviepy、Wan-Video/Wan2.2、Tencent-Hunyuan/HunyuanVideo、bloc97/Anime4K 等 ≥5000⭐ 的视频相关项目能被自动发现并归类展示。

**成功标准：**
- 运行 `npm run build`（fetch → classify → generate）后，上述项目出现在 README 的「🎬 视频处理 / 生成」分类下
- 已有分类不受影响，项目数量不变
- 不修改任何 .js / .ts 源码

## Tech Stack

- 纯 JSON 配置变更
- Node.js 24 + ESM（项目现有栈）
- GitHub Search API（现有 fetch-repos.js 使用）

## Commands

```bash
# 完整流程（改完后验证用）
npm run build

# 分步验证
npm run fetch       # 第 1 步：搜索并写入 repos.json
npm run classify    # 第 2 步：分类并写入 classified.json
npm run generate    # 第 3 步：生成 README.md

# 测试（确保现有功能不被破坏）
npm test            # 29 个测试
```

## 变更文件

### 1. `config/categories.json` — 新增分类定义

**位置：** 在 `categories` 数组末尾、`browser-automation` 之后添加。

```json
{
  "id": "video-processing",
  "name": "🎬 视频处理 / 生成",
  "order": 11,
  "priority": 6,
  "match": {
    "topics": [
      "video-editing",
      "video-processing",
      "video-generation",
      "video-tools",
      "video-enhancement"
    ],
    "desc_keywords": [
      "video editing",
      "video generation",
      "video processing",
      "video clip",
      "auto editor",
      "video enhance",
      "video upscale"
    ]
  }
}
```

**说明：**
- `id`: `video-processing`，内部标识
- `name`: `"🎬 视频处理 / 生成"`，与现有分类命名风格一致（emoji + 中文）
- `order`: `11`，排在浏览器自动化（order=10）之后
- `priority`: `6`，与浏览器自动化同级，高于 Agent 工作流（1）和 LLM 框架（2）
- `match.topics`: 覆盖剪辑（`video-editing`）、处理（`video-processing`）、生成（`video-generation`）、增强（`video-enhancement`）、工具（`video-tools`）
- `match.desc_keywords`: 描述关键词兜底

### 2. `config/search-queries.json` — 新增搜索配置

**位置：** 在 `queries` 对象末尾、`browser-automation` 之后添加。

```json
"video-processing": {
  "name": "🎬 视频处理 / 生成",
  "search": [
    "topic:video-editing,video-processing,video-generation,video-enhancement,video-tools stars:>=5000"
  ],
  "max_results": 100
}
```

**说明：**
- 使用逗号-OR 语法（与现有配置一致）
- `stars:>=5000` 保持现有门槛
- `max_results: 100` 与大部分分类一致

### 3. `config/nav-groups.json` — 新增导航分组映射

**位置：** 在 `groups[0].categories`（AI 工具方向）末尾添加 `"video-processing"`。

```json
{
  "name": "AI 工具方向",
  "categories": ["ai-coding-agent", "mcp", "agent-workflow", "browser-automation", "video-processing"]
}
```

**说明：** 视频处理/生成本质上属于 AI 工具方向，与同一组的其他 AI 工具并列。

### 无需变更的文件

| 文件 | 理由 |
|---|---|
| `scripts/fetch-repos.js` | 自动读取 search-queries.json，新增条目会被遍历到 |
| `scripts/classify.js` | 自动读取 categories.json，新增分类会被匹配 |
| `scripts/generate-readme.js` | 自动遍历 classified.json 的所有分类 |
| `data/manual_overrides.json` | 只有需要手动修正分类或补充隐藏项目时才改 |

## 验证计划

### Step 1：改配置前 — 基线确认
```bash
# 记录当前分类数量
node -e "const c=require('./config/categories.json'); console.log('当前分类数:', c.categories.length)"
# 预期输出: 10

# 确认目标项目不在 repos.json 中
node -e "const d=require('./data/repos.json'); ['roboflow/supervision','google-ai-edge/mediapipe','bloc97/Anime4K','Wan-Video/Wan2.2','Zulko/moviepy','Tencent-Hunyuan/HunyuanVideo'].forEach(r=>console.log(r, d.repos.some(x=>x.full_name===r)?'✅':'❌'))"
# 预期输出: 全部 ❌
```

### Step 2：改配置后 — fetch 验证
```bash
npm run fetch
# 检查新增项目是否被搜到
node -e "const d=require('./data/repos.json'); ['roboflow/supervision','google-ai-edge/mediapipe','bloc97/Anime4K','Wan-Video/Wan2.2','Zulko/moviepy','Tencent-Hunyuan/HunyuanVideo'].forEach(r=>console.log(r, d.repos.some(x=>x.full_name===r)?'✅':'❌'))"
# 预期输出: 全部 ✅

# 总项目数增加
node -e "const d=require('./data/repos.json'); console.log('总项目数:', d.repos.length)"
```

### Step 3：分类验证
```bash
npm run classify

# 检查新分类的项目
node -e "const d=require('./data/classified.json'); const c=d.classified['video-processing']||[]; console.log('视频分类项目数:', c.length); c.forEach(x=>console.log(' ', x.full_name, x.stars+'⭐', x._confidence))"
```

### Step 4：生成验证
```bash
npm run generate
# 人工检查 README.md 中是否有「🎬 视频处理 / 生成」分类
```

### Step 5：回归验证
```bash
npm test
# 确保 29 个测试全部通过
# 特别注意「导航分组一致性」测试（如果涉及 nav-groups.json）
```

## 回滚方案

如果发现问题，回滚只需两步：

```bash
# 方法 A — 用 git 回滚（推荐）
git diff config/categories.json config/search-queries.json  # 确认改了什么
git checkout -- config/categories.json config/search-queries.json
npm run build  # 重新生成，回到之前状态

# 方法 B — 如果已提交
git revert HEAD
```

**回滚后验证：** 再次检查 repos.json 的项目数是否回到基线值。

## 已确认的边界

- **Always do:** 改配置前先确认基线，改后跑完整 `build` 流程
- **Ask first:** 是否需要同时更新 `config/nav-groups.json`？是否需要调整 `order`？
- **Never do:** 不改 .js 源码、不删已有配置、不手动编辑 repos.json

## 待确认的问题（Open Questions）

| # | 问题 | 状态 |
|---|---|---|
| 1 | 是否需要同时更新 `data/manual_overrides.json` 补充已知项目？ | 暂不需要，topic 搜索可覆盖 |
| 2 | `config/nav-groups.json` 是否需要为视频分类添加映射？ | ✅ 已确认：加到「AI 工具方向」组 |
| 3 | 视频分类的 emoji 🎬 是否满意？ | ⏳ |
