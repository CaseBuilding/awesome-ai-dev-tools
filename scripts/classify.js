/**
 * classify.js
 *
 * 读取 repos.json，按 categories.json 的关键词规则自动分类，
 * 再应用 manual_overrides.json 的手动修正。
 *
 * 分类匹配规则：
 *   1. topics 标签匹配 → high confidence
 *   2. description 关键词匹配 → low confidence
 *   3. 命中多分类 → 按 priority 取最高
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

const PENDING_AI_REVIEW_PATH = path.join(ROOT, "data", "pending_ai_review.json");

/**
 * 对单个项目执行自动分类
 * 返回 { matched: [分类ID], confidence: "high"|"low" }
 *   - high: 通过 topics 匹配
 *   - low: 仅通过 description 匹配
 */
export function autoClassify(repo, cats) {
  const matched = [];
  let confidence = "low";

  const catList = cats || categories;
  for (const cat of catList) {
    const topics = repo.topics || [];
    const desc = (repo.description || "").toLowerCase();

    const topicMatch = cat.match.topics.some((keyword) =>
      topics.some((t) => t.toLowerCase() === keyword.toLowerCase())
    );

    if (topicMatch) {
      matched.push({ id: cat.id, priority: cat.priority || 0 });
      confidence = "high";
      continue;
    }

    const descMatch = cat.match.desc_keywords.some((keyword) =>
      desc.includes(keyword.toLowerCase())
    );

    if (descMatch) {
      matched.push({ id: cat.id, priority: cat.priority || 0 });
    }
  }

  // 优先级去重：匹配多个分类时，只保留优先级最高的那个
  if (matched.length > 1) {
    matched.sort((a, b) => b.priority - a.priority);
    return { matched: [matched[0].id], confidence };
  }

  return { matched: matched.map((m) => m.id), confidence };
}

export function applyOverrides(repo, autoResult, ovr) {
  const ov = ovr || overrides;
  const override = ov.overrides?.[repo.full_name];
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
        // desc_search 和 wildcard 未分类项目 → 走 AI 辅助分类，不进展示区
        if (repo._source === "desc_search" || repo._source === "wildcard") {
          // 不加入 __unclassified__（由 pending_ai_review.json 处理）
        } else {
          // topic_search / add_missing / legacy（无 _source）→ 常规未分类
          classified["__unclassified__"].push(repo);
        }
      }
      continue;
    }

    // 放入匹配的分类中展示
    for (const catId of final.matched) {
      if (!classified[catId]) classified[catId] = [];
      classified[catId].push({
        ...repo,
        _confidence: final.confidence,
        _overridden: final.overridden,
      });
    }
  }

  // 排序
  for (const catId of Object.keys(classified)) {
    classified[catId].sort((a, b) => b.stars - a.stars);
  }

  // 统计
  let totalClassified = 0;
  for (const cat of categories) {
    const count = classified[cat.id]?.length || 0;
    console.log(`  ${cat.name}: ${count} 个项目`);
    totalClassified += count;
  }
  console.log(`  📂 未分类: ${unclassified.length} 个项目`);
  if (hidden.length > 0) console.log(`  🙈 已隐藏: ${hidden.length} 个项目`);
  console.log(`\n✅ 分类完成！共处理 ${repos.length} 个项目`);

  // ── 写入 pending_ai_review.json（desc_search/wildcard 未分类项目） ──
  const pendingForReview = unclassified.filter(
    (r) => r._source === "desc_search" || r._source === "wildcard"
  );
  if (pendingForReview.length > 0) {
    let existingPending = [];
    try {
      existingPending = JSON.parse(
        fs.readFileSync(PENDING_AI_REVIEW_PATH, "utf-8")
      ).pending || [];
    } catch {
      // 首次运行，无缓存
    }

    const existingNames = new Set(existingPending.map((r) => r.full_name));
    for (const repo of pendingForReview) {
      if (!existingNames.has(repo.full_name)) {
        existingPending.push({
          full_name: repo.full_name,
          _source: repo._source,
          description: repo.description || "",
          topics: repo.topics || [],
          stars: repo.stars,
          language: repo.language || "",
        });
        existingNames.add(repo.full_name);
      }
    }

    fs.writeFileSync(
      PENDING_AI_REVIEW_PATH,
      JSON.stringify({
        _说明: "需要 AI 辅助分类的项目。由 classify.js 自动生成，通过 scripts/ai-classify.js 处理。",
        last_updated: new Date().toISOString(),
        pending_count: existingPending.length,
        pending: existingPending,
      }, null, 2),
      "utf-8"
    );
    console.log(`   已写入 pending_ai_review.json (${existingPending.length} 个待确认)`);
  }

  // 写入
  const output = {
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
  };

  const outputPath = path.join(ROOT, "data", "classified.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`   已写入 data/classified.json`);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) main();
