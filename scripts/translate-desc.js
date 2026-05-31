/**
 * translate-desc.js
 *
 * AI 辅助中文描述翻译工具。
 * 不自动调用任何 API — 仅列出待翻译项目、接收翻译结果写入缓存。
 * 由用户手动触发 Reasonix 在对话中完成翻译。
 *
 * 用法:
 *   node scripts/translate-desc.js --dry-run
 *     列出所有缺少中文描述的精选项目
 *
 *   node scripts/translate-desc.js --list
 *     列出项目中英文对照表（供 AI 集中翻译）
 *
 *   node scripts/translate-desc.js --import <json-file>
 *     从 JSON 文件批量导入翻译并写入缓存
 *     JSON 格式: { "owner/repo": "中文描述", ... }
 *
 *   node scripts/translate-desc.js --set "owner/repo" "中文描述"
 *     单条写入中文描述
 *
 * 环境变量: 无（纯文件操作）
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── 读取数据 ──
const reposData = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "repos.json"), "utf-8")
);
const classifiedData = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "classified.json"), "utf-8")
);
const categoriesConfig = JSON.parse(
  fs.readFileSync(path.join(ROOT, "config", "categories.json"), "utf-8")
);
const categories = categoriesConfig.categories;

// 中文描述缓存
const CN_CACHE_PATH = path.join(ROOT, "data", "chinese_descriptions.json");
let cnCache = {};
try {
  cnCache = JSON.parse(fs.readFileSync(CN_CACHE_PATH, "utf-8"));
} catch {
  cnCache = {};
}

/**
 * 获取所有精选项目（每个分类 high confidence + top 5），
 * 筛选出缺少中文描述的。
 */
function getFeaturedWithoutChinese() {
  const result = [];

  for (const cat of categories) {
    const repos = classifiedData.classified[cat.id] || [];
    const featured = repos
      .filter((r) => r._confidence === "high" && !r._uncertain)
      .slice(0, 5);

    for (const repo of featured) {
      const existingCn = cnCache[repo.full_name];
      if (!existingCn) {
        result.push({
          full_name: repo.full_name,
          category: cat.name,
          description_en: repo.description || "",
          stars: repo.stars,
          language: repo.language || "",
        });
      }
    }
  }

  return result;
}

function saveCache() {
  fs.writeFileSync(CN_CACHE_PATH, JSON.stringify(cnCache, null, 2), "utf-8");
  console.log(`✅ 已写入 ${CN_CACHE_PATH}`);
}

function doDryRun() {
  const pending = getFeaturedWithoutChinese();

  if (pending.length === 0) {
    console.log("🎉 所有精选项目已有中文描述，无需翻译！");
    return;
  }

  console.log(`\n📋 待翻译项目共 ${pending.length} 个：\n`);
  for (const item of pending) {
    const descPreview = item.description_en.slice(0, 80) + (item.description_en.length > 80 ? "…" : "");
    console.log(`  ${item.full_name}`);
    console.log(`    分类: ${item.category}  ⭐${(item.stars / 1000).toFixed(1)}K`);
    console.log(`    英文: ${descPreview}`);
    console.log();
  }
}

function doList() {
  const pending = getFeaturedWithoutChinese();

  if (pending.length === 0) {
    console.log("🎉 所有精选项目已有中文描述，无需翻译！");
    return;
  }

  // 以 JSON 数组形式输出，便于 AI 批量处理
  const list = pending.map((item) => ({
    full_name: item.full_name,
    category: item.category,
    description_en: item.description_en,
  }));
  console.log(JSON.stringify(list, null, 2));
}

function doImport(filePath) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error(`❌ 无法读取文件 ${filePath}: ${err.message}`);
    process.exit(1);
  }

  let count = 0;
  for (const [fullName, chineseDesc] of Object.entries(data)) {
    if (typeof chineseDesc !== "string" || !chineseDesc.trim()) {
      console.warn(`  ⚠️ 跳过 ${fullName}：描述为空`);
      continue;
    }
    cnCache[fullName] = chineseDesc.trim().slice(0, 200);
    count++;
  }

  saveCache();
  console.log(`✅ 成功导入 ${count} 条中文描述`);
}

function doSet(fullName, chineseDesc) {
  // 验证项目是否存在
  const repo = reposData.repos?.find((r) => r.full_name === fullName);
  if (!repo) {
    console.error(`❌ 项目 ${fullName} 不在 repos.json 中`);
    process.exit(1);
  }

  cnCache[fullName] = chineseDesc.trim().slice(0, 200);
  saveCache();
  console.log(`✅ 已写入 ${fullName}: ${cnCache[fullName]}`);
}

// ── 主入口 ──

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "--dry-run":
    doDryRun();
    break;
  case "--list":
    doList();
    break;
  case "--import":
    if (!args[1]) {
      console.error("❌ 用法: node scripts/translate-desc.js --import <json-file>");
      process.exit(1);
    }
    doImport(args[1]);
    break;
  case "--set":
    if (!args[1] || !args[2]) {
      console.error("❌ 用法: node scripts/translate-desc.js --set \"owner/repo\" \"中文描述\"");
      process.exit(1);
    }
    doSet(args[1], args[2]);
    break;
  default:
    console.log(`
用法:
  node scripts/translate-desc.js --dry-run       列出待翻译项目
  node scripts/translate-desc.js --list          输出 JSON 对照表（供 AI 批量翻译）
  node scripts/translate-desc.js --import <json>  从 JSON 文件批量导入翻译
  node scripts/translate-desc.js --set <repo> <cn> 单条写入中文描述
`);
    break;
}
