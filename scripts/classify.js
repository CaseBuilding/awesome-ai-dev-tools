/**
 * classify.js
 *
 * 读取 repos.json，按 categories.json 的关键词规则自动分类，
 * 再应用 manual_overrides.json 的手动修正。
 *
 * 新增：「待确认」标记
 *   - 匹配 2+ 个分类 → uncertain（不知道该放哪）
 *   - 仅 description 匹配（非 topics）→ low confidence
 *
 * 输出: data/classified.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

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
 * 返回 { matched: [分类ID], confidence: "high"|"low" }
 *   - high: 通过 topics 匹配
 *   - low: 仅通过 description 匹配
 */
function autoClassify(repo) {
  const matched = [];
  let confidence = "low";

  for (const cat of categories) {
    const topics = repo.topics || [];
    const desc = (repo.description || "").toLowerCase();

    const topicMatch = cat.match.topics.some((keyword) =>
      topics.some((t) => t.toLowerCase() === keyword.toLowerCase())
    );

    if (topicMatch) {
      matched.push(cat.id);
      confidence = "high";
      continue;
    }

    const descMatch = cat.match.desc_keywords.some((keyword) =>
      desc.includes(keyword.toLowerCase())
    );

    if (descMatch) {
      matched.push(cat.id);
    }
  }

  return { matched, confidence };
}

function applyOverrides(repo, autoResult) {
  const override = overrides.overrides?.[repo.full_name];
  if (!override) return { ...autoResult, overridden: false };

  if (override.hidden === true) {
    return { matched: [], confidence: "high", overridden: true };
  }

  if (override.category) {
    return { matched: [override.category], confidence: "high", overridden: true };
  }

  return { ...autoResult, overridden: false };
}

function main() {
  const repos = reposData.repos || [];
  console.log(`📦 共 ${repos.length} 个项目，开始分类...\n`);

  // 分类结果: { categoryId: [repo, ...] }
  const classified = {};
  const uncertain = [];   // 匹配 2+ 分类，不确定归哪
  const hidden = [];
  const unclassified = [];

  for (const cat of categories) {
    classified[cat.id] = [];
  }
  classified["__unclassified__"] = [];

  for (const repo of repos) {
    const autoResult = autoClassify(repo);
    const final = applyOverrides(repo, autoResult);

    if (final.matched.length === 0) {
      const override = overrides.overrides?.[repo.full_name];
      if (override?.hidden) {
        hidden.push(repo.full_name);
      } else {
        unclassified.push(repo);
        classified["__unclassified__"].push(repo);
      }
      continue;
    }

    // 匹配 2+ 分类且没有被手动覆盖 → 标记待确认
    if (final.matched.length >= 2 && !final.overridden) {
      uncertain.push({
        repo,
        matched_categories: final.matched,
        confidence: final.confidence,
      });
    }

    // 仍然放进匹配的分类中展示
    for (const catId of final.matched) {
      if (!classified[catId]) classified[catId] = [];
      classified[catId].push({
        ...repo,
        _confidence: final.confidence,
        _uncertain: final.matched.length >= 2 && !final.overridden,
        _overridden: final.overridden,
      });
    }
  }

  // 排序
  for (const catId of Object.keys(classified)) {
    classified[catId].sort((a, b) => b.stars - a.stars);
  }
  uncertain.sort((a, b) => b.repo.stars - a.repo.stars);

  // 统计
  let totalClassified = 0;
  for (const cat of categories) {
    const count = classified[cat.id]?.length || 0;
    console.log(`  ${cat.name}: ${count} 个项目`);
    totalClassified += count;
  }
  console.log(`  📂 未分类: ${unclassified.length} 个项目`);
  console.log(`  ❓ 待确认: ${uncertain.length} 个项目（匹配多个分类）`);
  if (hidden.length > 0) console.log(`  🙈 已隐藏: ${hidden.length} 个项目`);
  console.log(`\n✅ 分类完成！共处理 ${repos.length} 个项目`);

  // 写入
  const output = {
    last_updated: reposData.last_updated,
    classified,
    uncertain,
    unclassified,
    hidden,
    stats: {
      total: repos.length,
      classified: totalClassified,
      unclassified: unclassified.length,
      uncertain: uncertain.length,
      hidden: hidden.length,
    },
  };

  const outputPath = path.join(ROOT, "data", "classified.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`   已写入 data/classified.json`);
}

main();
