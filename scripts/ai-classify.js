/**
 * ai-classify.js
 *
 * AI 辅助分类工具。
 * 不自动调用任何 API — 仅列出待分类项目、接收 AI 分类结果写入 manual_overrides.json。
 * 由用户手动触发 Reasonix 在对话中完成分类。
 *
 * 用法:
 *   node scripts/ai-classify.js --pending
 *     列出所有待分类的精选项目
 *
 *   node scripts/ai-classify.js --list
 *     输出 JSON 数组（供 AI 批量分类）
 *
 *   node scripts/ai-classify.js --apply <json-file>
 *     从 JSON 文件批量导入分类结果并写入 manual_overrides.json
 *     JSON 格式: { "owner/repo": "分类ID", ... }
 *
 *   node scripts/ai-classify.js --classify "owner/repo"
 *     输出单个项目的详细信息（供 AI 逐条判断）
 *
 * 环境变量: 无（纯文件操作）
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PENDING_PATH = path.join(ROOT, "data", "pending_ai_review.json");
const OVERRIDES_PATH = path.join(ROOT, "data", "manual_overrides.json");

const categories = JSON.parse(
  fs.readFileSync(path.join(ROOT, "config", "categories.json"), "utf-8")
).categories;

// ── 数据加载 ──

function loadPending() {
  try {
    const data = JSON.parse(fs.readFileSync(PENDING_PATH, "utf-8"));
    return data.pending || [];
  } catch {
    return [];
  }
}

function loadOverrides() {
  return JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf-8"));
}

function saveOverrides(overrides) {
  fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2), "utf-8");
  console.log(`✅ 已写入 ${OVERRIDES_PATH}`);
}

function savePending(pending) {
  fs.writeFileSync(
    PENDING_PATH,
    JSON.stringify(
      {
        _说明: "需要 AI 辅助分类的项目。由 classify.js 自动生成，通过 scripts/ai-classify.js 处理。",
        last_updated: new Date().toISOString(),
        pending_count: pending.length,
        pending,
      },
      null,
      2
    ),
    "utf-8"
  );
  console.log(`✅ 已更新 ${PENDING_PATH}`);
}

function isValidCategoryId(id) {
  return categories.some((c) => c.id === id);
}

// ── 命令实现 ──

function doPending() {
  const pending = loadPending();
  if (pending.length === 0) {
    console.log("🎉 没有待 AI 分类的项目！");
    return;
  }

  console.log(`\n📋 待 AI 分类项目共 ${pending.length} 个：\n`);
  for (const item of pending) {
    const descPreview = (item.description || "").slice(0, 80);
    const topicStr = (item.topics || []).join(", ") || "(无)";
    console.log(`  ${item.full_name}`);
    console.log(`    来源: ${item._source}  ⭐${(item.stars / 1000).toFixed(1)}K`);
    console.log(`    描述: ${descPreview}`);
    console.log(`    topics: ${topicStr}`);
    console.log();
  }
}

function doList() {
  const pending = loadPending();
  if (pending.length === 0) {
    console.log("🎉 没有待 AI 分类的项目！");
    return;
  }

  const list = pending.map((item) => ({
    full_name: item.full_name,
    _source: item._source,
    description: item.description || "",
    topics: item.topics || [],
    stars: item.stars,
    language: item.language || "",
    url: `https://github.com/${item.full_name}`,
  }));
  console.log(JSON.stringify(list, null, 2));
}

function doClassify(fullName) {
  const pending = loadPending();
  const item = pending.find((p) => p.full_name === fullName);
  if (!item) {
    console.error(`❌ 项目 ${fullName} 不在待分类列表中`);
    process.exit(1);
  }

  const output = {
    full_name: item.full_name,
    _source: item._source,
    description: item.description || "",
    topics: item.topics || [],
    stars: item.stars,
    language: item.language || "",
    url: `https://github.com/${item.full_name}`,
    available_categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      match_topics: c.match.topics,
      match_desc_keywords: c.match.desc_keywords,
    })),
    instruction: "请阅读项目描述和 README，判断它属于哪个分类。输出格式：{\"suggested_category\": \"分类ID\", \"reason\": \"判断理由\"}",
  };
  console.log(JSON.stringify(output, null, 2));
}

function doApply(filePath) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error(`❌ 无法读取文件 ${filePath}: ${err.message}`);
    process.exit(1);
  }

  const overrides = loadOverrides();
  let pending = loadPending();
  let applyCount = 0;
  let skipCount = 0;

  for (const [fullName, categoryId] of Object.entries(data)) {
    if (!isValidCategoryId(categoryId)) {
      console.warn(`  ⚠️ 跳过 ${fullName}：无效分类 "${categoryId}"`);
      skipCount++;
      continue;
    }

    overrides.overrides[fullName] = {
      category: categoryId,
      reason: "AI 辅助分类",
    };

    pending = pending.filter((p) => p.full_name !== fullName);
    applyCount++;
  }

  saveOverrides(overrides);
  savePending(pending);
  console.log(`✅ 成功应用 ${applyCount} 条分类，跳过 ${skipCount} 条`);
  if (pending.length > 0) {
    console.log(`📋 剩余 ${pending.length} 个待分类项目`);
  }
}

// ── 主入口 ──

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "--pending":
    doPending();
    break;
  case "--list":
    doList();
    break;
  case "--classify":
    if (!args[1]) {
      console.error("❌ 用法: node scripts/ai-classify.js --classify \"owner/repo\"");
      process.exit(1);
    }
    doClassify(args[1]);
    break;
  case "--apply":
    if (!args[1]) {
      console.error("❌ 用法: node scripts/ai-classify.js --apply <json-file>");
      process.exit(1);
    }
    doApply(args[1]);
    break;
  default:
    console.log(`
用法:
  node scripts/ai-classify.js --pending       列出待 AI 分类项目
  node scripts/ai-classify.js --list          输出 JSON 列表（供 AI 批量分类）
  node scripts/ai-classify.js --classify <repo> 输出单个项目详情（供 AI 判断）
  node scripts/ai-classify.js --apply <json>  从 JSON 文件批量导入分类结果
`);
    break;
}
