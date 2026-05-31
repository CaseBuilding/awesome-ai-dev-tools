/**
 * classify.js
 *
 * 读取 repos.json，按 categories.json 的关键词规则自动分类，
 * 再应用 manual_overrides.json 的手动修正。
 *
 * 输出: 分类结果数组（用于 generate-readme.js）
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// 读取数据
const reposData = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "repos.json"), "utf-8")
);
const categoriesConfig = JSON.parse(
  fs.readFileSync(path.join(ROOT, "config", "categories.json"), "utf-8")
);
const overrides = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "manual_overrides.json"), "utf-8")
);

const categories = categoriesConfig.categories;
const unclassifiedCategory = categoriesConfig.unclassified_category;

/**
 * 对单个项目执行自动分类
 * 返回分类 ID 数组（一个项目可能匹配多个分类）
 */
function autoClassify(repo) {
  const matched = [];

  for (const cat of categories) {
    const topics = repo.topics || [];
    const desc = (repo.description || "").toLowerCase();

    // 优先匹配 topics 标签
    const topicMatch = cat.match.topics.some((keyword) =>
      topics.some((t) => t.toLowerCase() === keyword.toLowerCase())
    );

    if (topicMatch) {
      matched.push(cat.id);
      continue; // topics 命中了就不再看 description
    }

    // 降级匹配 description
    const descMatch = cat.match.desc_keywords.some((keyword) =>
      desc.includes(keyword.toLowerCase())
    );

    if (descMatch) {
      matched.push(cat.id);
    }
  }

  return matched;
}

/**
 * 应用手动覆盖规则
 */
function applyOverrides(repo, autoMatched) {
  const override = overrides.overrides?.[repo.full_name];
  if (!override) return autoMatched;

  if (override.hidden === true) {
    return []; // 标记为隐藏
  }

  if (override.category) {
    return [override.category]; // 强制指定分类
  }

  return autoMatched;
}

function main() {
  const repos = reposData.repos || [];
  console.log(`📦 共 ${repos.length} 个项目，开始分类...\n`);

  // 分类结果: { categoryId: [repo, ...] }
  const classified = {};
  const hidden = [];
  const unclassified = [];

  for (const cat of categories) {
    classified[cat.id] = [];
  }
  classified["__unclassified__"] = [];

  for (const repo of repos) {
    const autoMatched = autoClassify(repo);
    const finalCategories = applyOverrides(repo, autoMatched);

    if (finalCategories.length === 0) {
      // 检查是否被隐藏
      const override = overrides.overrides?.[repo.full_name];
      if (override?.hidden) {
        hidden.push(repo.full_name);
      } else {
        unclassified.push(repo);
        classified["__unclassified__"].push(repo);
      }
      continue;
    }

    for (const catId of finalCategories) {
      if (!classified[catId]) classified[catId] = [];
      classified[catId].push(repo);
    }
  }

  // 每个分类内按 Star 降序
  for (const catId of Object.keys(classified)) {
    classified[catId].sort((a, b) => b.stars - a.stars);
  }

  // 输出统计
  let totalClassified = 0;
  for (const cat of categories) {
    const count = classified[cat.id]?.length || 0;
    console.log(`  ${cat.name}: ${count} 个项目`);
    totalClassified += count;
  }
  console.log(`  📂 未分类: ${unclassified.length} 个项目`);
  if (hidden.length > 0) {
    console.log(`  🙈 已隐藏: ${hidden.length} 个项目`);
  }
  console.log(`\n✅ 分类完成！共处理 ${repos.length} 个项目`);

  // 保存分类结果供 generate-readme.js 使用
  const outputPath = path.join(ROOT, "data", "classified.json");
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        last_updated: reposData.last_updated,
        classified,
        unclassified,
        hidden,
        stats: {
          total: repos.length,
          classified: totalClassified,
          unclassified: unclassified.length,
          hidden: hidden.length,
        },
      },
      null,
      2
    ),
    "utf-8"
  );
  console.log(`   已写入 data/classified.json`);
}

main();
