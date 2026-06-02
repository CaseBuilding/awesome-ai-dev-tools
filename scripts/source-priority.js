/**
 * source-priority.js
 *
 * 来源优先级排序与合并逻辑。
 * 当同一个项目从多个搜索通道获取时，按来源优先级决定保留哪个版本。
 *
 * 使用方式:
 *   import { mergeSources } from "./source-priority.js";
 *   const merged = mergeSources(existingRepos, newRepos);
 *
 * 来源优先级（高 → 低）:
 *   add_missing(10) — 手动添加，最可靠
 *   topic_search(8)  — topic 标签匹配，较可靠
 *   desc_search(5)   — description 关键词匹配，中等
 *   wildcard(2)      — 通配扫描，靠后
 *   无 _source(8)    — 遗留数据，视为 topic 级别
 */

const SOURCE_ORDER = {
  add_missing: 10,   // 手动添加，最可靠
  topic_search: 8,   // topic 标签匹配，较可靠
  desc_search: 5,    // description 关键词匹配，中等
  wildcard: 2,       // 通配扫描，靠后
};

/**
 * 返回来源的优先级数值。
 * 数值越大=优先级越高。无 _source 的遗留数据默认 topic 级别(8)。
 */
export function sourcePriorityOf(source) {
  return SOURCE_ORDER[source] ?? 8;
}

/**
 * 按来源优先级合并已有缓存和新抓取的数据。
 *
 * - 新数据来源优先级 >= 已有数据 → 覆盖 ✅
 * - 新数据来源优先级 < 已有数据 → 保留已有 ✅
 * - 同优先级 → 新胜旧（因为新数据可能更新了 stars/description）
 * - 遗留数据（无 _source）视为 topic_search 级别
 *
 * 返回按 stars 降序排列的合并后数组。
 */
export function mergeSources(existingRepos, newRepos) {
  const merged = new Map();

  // 先填入已有数据
  for (const repo of existingRepos) {
    merged.set(repo.full_name, { ...repo });
  }

  // 新数据按优先级决定是否覆盖
  for (const repo of newRepos) {
    const existing = merged.get(repo.full_name);
    if (existing) {
      const existingPrio = sourcePriorityOf(existing._source);
      const newPrio = sourcePriorityOf(repo._source);
      if (newPrio >= existingPrio) {
        merged.set(repo.full_name, { ...repo });
      }
      // 低优先级不覆盖
    } else {
      merged.set(repo.full_name, { ...repo });
    }
  }

  const result = Array.from(merged.values());
  result.sort((a, b) => b.stars - a.stars);
  return result;
}
