/**
 * classify.js
 *
 * 读取 repos.json，按 categories.json 的关键词规则自动分类，
 * 再应用 manual_overrides.json 的手动修正。
 * 同时根据分类内的 tags 规则分配标签。
 *
 * 分类匹配规则：
 *   1. topics 标签匹配 → high confidence
 *   2. description 关键词匹配 → low confidence
 *   3. 命中多分类 → 按 priority 取最高
 *
 * 标签分配规则：
 *   每个分类的 tags 独立匹配，tags 之间不互斥（一个项目可以多个标签）
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
const LOCKS_PATH = path.join(ROOT, "data", "classification-locks.json");

/**
 * 加载或创建 classification-locks.json
 * 确定性缓存：一次锁定，除非 --relock 否则永不重新匹配。
 */
function loadLocks() {
  try {
    return JSON.parse(fs.readFileSync(LOCKS_PATH, "utf-8"));
  } catch {
    return {
      _说明: "确定性分类缓存。优先级: manual_overrides.json > classification-locks.json > autoClassify()",
      version: "1.0",
      generated_at: new Date().toISOString(),
      locks: {},
    };
  }
}

function saveLocks(locksData) {
  locksData.generated_at = new Date().toISOString();
  locksData.lock_count = Object.keys(locksData.locks).length;
  fs.writeFileSync(LOCKS_PATH, JSON.stringify(locksData, null, 2), "utf-8");
  console.log(`   已写入 classification-locks.json (${locksData.lock_count} 条锁定)`);
}

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

/**
 * 根据项目所属分类的 tags 规则，分配标签
 * tags 基于 description 关键词匹配，不互斥
 */
export function assignTags(repo, categoryId, cats) {
  const catList = cats || categories;
  const cat = catList.find((c) => c.id === categoryId);
  if (!cat || !cat.tags) return [];

  const desc = (repo.description || "").toLowerCase();
  const topics = repo.topics || [];
  const tags = [];

  for (const [tagId, tagDef] of Object.entries(cat.tags)) {
    const tagKeywords = tagDef.desc_keywords || [];
    const match = tagKeywords.some((kw) =>
      desc.includes(kw.toLowerCase())
    );
    if (match) {
      tags.push(tagId);
    }
  }

  return tags;
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
  const relockMode = process.argv.includes("--relock");
  if (relockMode) console.log("🔓 --relock 模式：忽略已有锁定，重新分类所有项目\n");

  console.log(`📦 共 ${repos.length} 个项目，开始分类...\n`);

  // 加载确定性锁定缓存
  const locksData = loadLocks();
  const locks = locksData.locks;

  // 分类结果: { categoryId: [repo, ...] }
  const classified = {};
  const hidden = [];
  const unclassified = [];

  for (const cat of categories) {
    classified[cat.id] = [];
  }
  classified["__unclassified__"] = [];

  for (const repo of repos) {
    // ── 优先级 ① manual_overrides.json — 手工修正最优先 ──
    const override = overrides.overrides?.[repo.full_name];
    if (override) {
      if (override.hidden === true) {
        hidden.push(repo.full_name);
        // 同步更新 lock
        delete locks[repo.full_name];
        continue;
      }
      if (override.category) {
        const catId = override.category;
        const tags = assignTags(repo, catId);
        classified[catId].push({
          ...repo,
          _confidence: "high",
          _overridden: true,
          _tags: tags,
        });
        // 同步更新 lock
        locks[repo.full_name] = {
          category: catId,
          _overridden: true,
          _matched_by: "override",
          _confidence: "high",
          _audit: {
            classified_by: "manual_override",
            timestamp: new Date().toISOString(),
            source: repo._source || "unknown",
          },
        };
        continue;
      }
    }

    // ── 优先级 ② classification-locks.json — 确定性锁定缓存 ──
    const lock = locks[repo.full_name];
    if (lock && !relockMode) {
      const catId = lock.category;
      const tags = assignTags(repo, catId);
      if (classified[catId]) {
        classified[catId].push({
          ...repo,
          _confidence: lock._confidence || "high",
          _overridden: false,
          _tags: tags,
          _locked: true,
        });
      }
      continue;
    }

    // ── 优先级 ③ autoClassify — 自动关键词匹配 ──
    const autoResult = autoClassify(repo);
    const final = applyOverrides(repo, autoResult);

    if (final.matched.length === 0) {
      if (override?.hidden) {
        hidden.push(repo.full_name);
      } else {
        unclassified.push(repo);
        if (repo._source === "desc_search" || repo._source === "wildcard") {
          // 由 pending_ai_review.json 处理
        } else {
          classified["__unclassified__"].push(repo);
        }
      }
      continue;
    }

    for (const catId of final.matched) {
      if (!classified[catId]) classified[catId] = [];
      const tags = assignTags(repo, catId);
      classified[catId].push({
        ...repo,
        _confidence: final.confidence,
        _overridden: final.overridden,
        _tags: tags,
      });

      // 自动分类结果写入 lock（首次分类即锁定）
      if (!locks[repo.full_name]) {
        locks[repo.full_name] = {
          category: catId,
          _overridden: final.overridden,
          _matched_by: final.confidence === "high" ? "topic" : "description",
          _confidence: final.confidence,
          _audit: {
            classified_by: "autoClassify",
            timestamp: new Date().toISOString(),
            source: repo._source || "unknown",
          },
        };
      }
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
  if (!relockMode) console.log(`  🔒 已锁定: ${Object.keys(locks).length} 个项目`);
  console.log(`\n✅ 分类完成！共处理 ${repos.length} 个项目`);

  // 写入 pending_ai_review.json（desc_search/wildcard 未分类项目）
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

  // 写入 classification-locks.json
  saveLocks(locksData);

  // 写入 classified.json
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
