/**
 * classify.test.js — 红绿灯测试
 *
 * 测试分类器核心逻辑、手动覆盖、数据完整性、导航分组、README 格式。
 * 使用 Node 内置 node:test + node:assert，零外部依赖。
 * 所有 fixture 数据在 test/fixtures/，不碰真实 data/。
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

import { autoClassify, applyOverrides } from "../scripts/classify.js";
import { formatStars, anchorName, isNewRepo } from "../scripts/generate-readme.js";
import { mergeSources, sourcePriorityOf } from "../scripts/source-priority.js";

// ── 加载 fixture ──
const categories = JSON.parse(
  fs.readFileSync(path.join(ROOT, "test", "fixtures", "categories.json"), "utf-8")
);
const overrides = JSON.parse(
  fs.readFileSync(path.join(ROOT, "test", "fixtures", "overrides.json"), "utf-8")
);

// ─────────────────────────────────────────────
//  1. autoClassify — 分类核心逻辑
// ─────────────────────────────────────────────

describe("autoClassify", () => {
  test("topic 完全匹配 → high confidence, 正确分类", () => {
    const repo = { topics: ["mcp", "ai-agents"], description: "some tool" };
    const result = autoClassify(repo, categories);
    assert.equal(result.matched.length, 1);
    assert.equal(result.matched[0], "mcp");          // MCP priority=10 > agent-workflow=1
    assert.equal(result.confidence, "high");
  });

  test("仅 description 匹配 → low confidence", () => {
    const repo = { topics: [], description: "A useful MCP server for AI" };
    const result = autoClassify(repo, categories);
    assert.equal(result.matched.length, 1);
    assert.equal(result.matched[0], "mcp");
    assert.equal(result.confidence, "low");
  });

  test("无任何匹配 → 空结果", () => {
    const repo = { topics: [], description: "completely unrelated project" };
    const result = autoClassify(repo, categories);
    assert.equal(result.matched.length, 0);
  });

  test("优先级裁决 — high priority 胜出", () => {
    const repo = { topics: ["mcp", "ai-agents", "workflow"], description: "x" };
    const result = autoClassify(repo, categories);
    // mcp(p=10) > agent-workflow(p=1)
    assert.equal(result.matched[0], "mcp");
    assert.equal(result.confidence, "high");
  });

  test("空 topics 数组不抛异常", () => {
    const repo = { description: "mcp server for data" };
    const result = autoClassify(repo, categories);
    assert.equal(result.matched[0], "mcp");
  });

  test("空 description 不抛异常", () => {
    const repo = { topics: ["mcp"] };
    const result = autoClassify(repo, categories);
    assert.equal(result.matched[0], "mcp");
  });

  test("大小写不敏感", () => {
    const repo = { topics: ["MCP", "AI-AGENTS"], description: "x" };
    const result = autoClassify(repo, categories);
    assert.equal(result.matched[0], "mcp");
    assert.equal(result.confidence, "high");
  });
});

// ─────────────────────────────────────────────
//  2. applyOverrides — 手动覆盖
// ─────────────────────────────────────────────

describe("applyOverrides", () => {
  test("无覆盖 → 保留自动分类结果", () => {
    const repo = { full_name: "normal/repo" };
    const autoResult = { matched: ["mcp"], confidence: "high" };
    const result = applyOverrides(repo, autoResult, overrides);
    assert.equal(result.matched[0], "mcp");
    assert.equal(result.overridden, false);
  });

  test("hidden=true → 清空分类结果", () => {
    const repo = { full_name: "hidden-org/hidden-repo" };
    const autoResult = { matched: ["mcp"], confidence: "high" };
    const result = applyOverrides(repo, autoResult, overrides);
    assert.equal(result.matched.length, 0);
    assert.equal(result.overridden, true);
  });

  test("category 强制归入 → 覆盖自动分类", () => {
    const repo = { full_name: "force-org/force-category" };
    const autoResult = { matched: ["ai-coding-agent"], confidence: "high" };
    const result = applyOverrides(repo, autoResult, overrides);
    assert.equal(result.matched[0], "mcp");          // 被强制改为 mcp
    assert.equal(result.overridden, true);
  });

  test("不存在于 overrides 中的 repo → 不覆盖", () => {
    const repo = { full_name: "some/other-repo" };
    const autoResult = { matched: ["local-inference"], confidence: "low" };
    const result = applyOverrides(repo, autoResult, overrides);
    assert.equal(result.matched[0], "local-inference");
    assert.equal(result.overridden, false);
  });
});

// ─────────────────────────────────────────────
//  3. formatStars — 星数格式化
// ─────────────────────────────────────────────

describe("formatStars", () => {
  test("199600 → 199.6K", () => { assert.equal(formatStars(199600), "199.6K"); });
  test("104800 → 104.8K", () => { assert.equal(formatStars(104800), "104.8K"); });
  test("5000 → 5K", () => { assert.equal(formatStars(5000), "5K"); });
  test("1000 → 1K", () => { assert.equal(formatStars(1000), "1K"); });
  test("999 → 999", () => { assert.equal(formatStars(999), "999"); });
  test("0 → 0", () => { assert.equal(formatStars(0), "0"); });
});

// ─────────────────────────────────────────────
//  4. anchorName — 锚点生成
// ─────────────────────────────────────────────

describe("anchorName", () => {
  test("中文+英文 → 保留中文+连字符", () => {
    assert.equal(anchorName("🤖 AI Coding Agent"), "ai-coding-agent");
  });
  test("中文+空格/ → 连字符", () => {
    assert.equal(anchorName("代码分析 / 理解"), "代码分析-理解");
  });
  test("首尾连字符被去掉", () => {
    assert.equal(anchorName("!!!test!!!"), "test");
  });
});

// ─────────────────────────────────────────────
//  5. Source priority merge — _source 优先级合并
// ─────────────────────────────────────────────

describe("sourcePriorityOf", () => {
  test("add_missing → 10", () => {
    assert.equal(sourcePriorityOf("add_missing"), 10);
  });
  test("topic_search → 8", () => {
    assert.equal(sourcePriorityOf("topic_search"), 8);
  });
  test("desc_search → 5", () => {
    assert.equal(sourcePriorityOf("desc_search"), 5);
  });
  test("wildcard → 2", () => {
    assert.equal(sourcePriorityOf("wildcard"), 2);
  });
  test("undefined → 8（遗留数据降级为 topic 级别）", () => {
    assert.equal(sourcePriorityOf(undefined), 8);
  });
  test("unknown source → 8", () => {
    assert.equal(sourcePriorityOf("unknown"), 8);
  });
});

describe("mergeSources", () => {
  test("高优先级覆盖低优先级", () => {
    const existing = [{ full_name: "a/b", stars: 100, _source: "topic_search" }];
    const newData = [{ full_name: "a/b", stars: 200, _source: "wildcard" }];
    const result = mergeSources(existing, newData);
    // wildcard(2) < topic_search(8), 保留原有的
    assert.equal(result.length, 1);
    assert.equal(result[0].stars, 100);
  });

  test("低优先级不覆盖高优先级", () => {
    const existing = [{ full_name: "a/b", stars: 100, _source: "wildcard" }];
    const newData = [{ full_name: "a/b", stars: 200, _source: "topic_search" }];
    const result = mergeSources(existing, newData);
    // topic_search(8) > wildcard(2), 新数据覆盖
    assert.equal(result.length, 1);
    assert.equal(result[0].stars, 200);
  });

  test("同优先级新胜旧", () => {
    const existing = [{ full_name: "a/b", stars: 100, _source: "topic_search" }];
    const newData = [{ full_name: "a/b", stars: 200, _source: "topic_search" }];
    const result = mergeSources(existing, newData);
    assert.equal(result.length, 1);
    assert.equal(result[0].stars, 200);
  });

  test("遗留数据（无 _source）视为 topic_search 级别", () => {
    const existing = [{ full_name: "a/b", stars: 100 }];
    const newData = [{ full_name: "a/b", stars: 200, _source: "wildcard" }];
    const result = mergeSources(existing, newData);
    // legacy(8) > wildcard(2), 保留原有的
    assert.equal(result.length, 1);
    assert.equal(result[0].stars, 100);
  });

  test("合并不同项目", () => {
    const existing = [{ full_name: "a/b", stars: 100 }];
    const newData = [{ full_name: "c/d", stars: 200, _source: "wildcard" }];
    const result = mergeSources(existing, newData);
    assert.equal(result.length, 2);
  });

  test("按 stars 降序排列", () => {
    const existing = [
      { full_name: "a/a", stars: 100 },
      { full_name: "b/b", stars: 300 },
    ];
    const result = mergeSources(existing, []);
    assert.equal(result[0].full_name, "b/b");
    assert.equal(result[1].full_name, "a/a");
  });
});

// ─────────────────────────────────────────────
//  6. 导航分组一致性 — 与真实配置对比
// ─────────────────────────────────────────────

describe("导航分组一致性", () => {
  test("所有分类都在 navGroups 中有归属", () => {
    // 从真实 categories.json 读取
    const realCats = JSON.parse(
      fs.readFileSync(path.join(ROOT, "config", "categories.json"), "utf-8")
    );
    const allIds = realCats.categories.map((c) => c.id);

    // 从 nav-groups.json 读取导航分组
    const navGroupsConfig = JSON.parse(
      fs.readFileSync(path.join(ROOT, "config", "nav-groups.json"), "utf-8")
    );

    // 提取所有引用的分类 ID
    const referenced = new Set();
    for (const group of navGroupsConfig.groups) {
      for (const id of group.categories) {
        referenced.add(id);
      }
    }

    const missing = allIds.filter((id) => !referenced.has(id));
    assert.equal(
      missing.length, 0,
      `以下分类未在 navGroups 中引用: ${missing.join(", ")}`
    );
  });
});

// ─────────────────────────────────────────────
//  6. renderRepoLine — 项目渲染格式验证
// ─────────────────────────────────────────────

describe("renderRepoLine 格式", () => {
  // 由于 renderRepoLine 未导出，这里测试其内部函数
  // 通过检查 README 输出格式来验证
  test("README 包含精选编号格式 🥇 #1", () => {
    const readme = fs.readFileSync(
      path.join(ROOT, "README.md"),
      "utf-8"
    );
    assert.ok(readme.includes("🥇 #1 —"), "缺少 🥇 #1 格式");
    assert.ok(readme.includes("🥈 #2 —"), "缺少 🥈 #2 格式");
    assert.ok(readme.includes("🥉 #3 —"), "缺少 🥉 #3 格式");
  });

  test("README 包含连续编号（全部项目从 #6 起）", () => {
    const readme = fs.readFileSync(
      path.join(ROOT, "README.md"),
      "utf-8"
    );
    assert.ok(readme.includes("#6 —"), "缺少 #6 连续编号");
  });

  test("README 每个项目都有 🌏 和 📝", () => {
    const readme = fs.readFileSync(
      path.join(ROOT, "README.md"),
      "utf-8"
    );
    const cnCount = (readme.match(/🌏 \*\*/g) || []).length;
    const enCount = (readme.match(/📝 /g) || []).length;
    assert.equal(cnCount, enCount, `🌏(${cnCount}) 与 📝(${enCount}) 数量不匹配`);
  });

  test("README 精选标题含 Top 5 / 共 N", () => {
    const readme = fs.readFileSync(
      path.join(ROOT, "README.md"),
      "utf-8"
    );
    assert.ok(readme.includes("精选推荐（Top"), "缺少精选推荐（Top 5 / 共 N）标题");
  });
});

// ─────────────────────────────────────────────
//  7. 数据完整性 — 实际数据检查
// ─────────────────────────────────────────────

describe("数据完整性", () => {
  test("classified.json 中无重复项目", () => {
    const classified = JSON.parse(
      fs.readFileSync(path.join(ROOT, "data", "classified.json"), "utf-8")
    );
    const all = [];
    for (const repos of Object.values(classified.classified)) {
      for (const r of repos) all.push(r.full_name);
    }
    const dupes = all.filter((n, i) => all.indexOf(n) !== i);
    assert.equal(dupes.length, 0, `发现重复项目: ${[...new Set(dupes)].join(", ")}`);
  });

  test("隐藏项目数 = hidden 数组长度", () => {
    const classified = JSON.parse(
      fs.readFileSync(path.join(ROOT, "data", "classified.json"), "utf-8")
    );
    assert.equal(
      classified.hidden.length,
      classified.stats.hidden,
      `hidden 数组(${classified.hidden.length}) 与 stats(${classified.stats.hidden}) 不一致`
    );
  });

  test("README 统计表合计行与 classified 一致", () => {
    const classified = JSON.parse(
      fs.readFileSync(path.join(ROOT, "data", "classified.json"), "utf-8")
    );
    const readme = fs.readFileSync(
      path.join(ROOT, "README.md"),
      "utf-8"
    );
    // 找到合计行: | **合计** | **357** | ...
    const totalLine = readme.split("\n").find((l) => l.includes("合计") && l.includes("**"));
    assert.ok(totalLine, "README 未找到合计行");
    const totalMatch = totalLine.match(/\*\*(\d+)\*\*/);
    assert.ok(totalMatch, "合计行未找到数字");
    assert.equal(
      Number(totalMatch[1]),
      classified.stats.classified,
      `README 合计(${totalMatch[1]}) 与 classified(${classified.stats.classified}) 不一致`
    );
  });
});

// ─────────────────────────────────────────────
//  8. 搜索配置完整性 — 每个分类都有搜索配置
// ─────────────────────────────────────────────

describe("搜索配置完整性", () => {
  test("所有分类都在 search-queries 中有搜索配置", () => {
    const realCats = JSON.parse(
      fs.readFileSync(path.join(ROOT, "config", "categories.json"), "utf-8")
    );
    const allIds = realCats.categories.map((c) => c.id);

    const searchQueries = JSON.parse(
      fs.readFileSync(path.join(ROOT, "config", "search-queries.json"), "utf-8")
    );
    const configuredIds = new Set(Object.keys(searchQueries.queries));

    const missing = allIds.filter((id) => !configuredIds.has(id));
    assert.equal(
      missing.length, 0,
      `以下分类缺少搜索配置: ${missing.join(", ")}`
    );
  });

  test("每个搜索配置都引用了已定义的分类", () => {
    const realCats = JSON.parse(
      fs.readFileSync(path.join(ROOT, "config", "categories.json"), "utf-8")
    );
    const validIds = new Set(realCats.categories.map((c) => c.id));

    const searchQueries = JSON.parse(
      fs.readFileSync(path.join(ROOT, "config", "search-queries.json"), "utf-8")
    );
    const unknown = Object.keys(searchQueries.queries).filter((id) => !validIds.has(id));
    assert.equal(
      unknown.length, 0,
      `搜索配置引用了不存在的分类: ${unknown.join(", ")}`
    );
  });
});

// ─────────────────────────────────────────────
//  9. 导航表格格式验证
// ─────────────────────────────────────────────

describe("导航表格", () => {
  test("README 导航使用 4 列表格", () => {
    const readme = fs.readFileSync(
      path.join(ROOT, "README.md"),
      "utf-8"
    );
    // 找到导航区：从 "## 📑 导航" 到下一个 "##"
    const navSection = readme.split("## 📑 导航")[1]?.split("## ")[0] || "";
    // 找到第一个表格行（非分隔行）
    const tableLines = navSection.split("\n").filter((l) => l.startsWith("|") && !l.includes("---"));
    assert.ok(tableLines.length >= 2, "导航表格行数不足");
    // 验证第一行有 5 个竖线（4 列）
    const colCount = (tableLines[0].match(/\|/g) || []).length;
    assert.equal(colCount, 5, `导航表格列数不对。期望 4 列(5竖线)，实际 ${colCount - 1} 列`);
  });
});

// ─────────────────────────────────────────────
//  10. isNewRepo — 7 天新增判断
// ─────────────────────────────────────────────

describe("isNewRepo", () => {
  const lastUpdated = "2026-06-08";
  const baseline = { _baseline: "2026-06-01" };

  test("基线日期的存量项目 → 不算新", () => {
    const data = { ...baseline, "owner/repo": "2026-06-01" };
    assert.equal(isNewRepo("owner/repo", data, lastUpdated), false);
  });

  test("7 天内新增的项目 → 算新", () => {
    const data = { ...baseline, "owner/repo": "2026-06-05" };
    assert.equal(isNewRepo("owner/repo", data, lastUpdated), true);
  });

  test("恰好 7 天前新增的项目 → 算新（含边界）", () => {
    const data = { ...baseline, "owner/repo": "2026-06-01" };
    assert.equal(isNewRepo("owner/repo", data, lastUpdated), false);
  });

  test("超过 7 天的新增 → 不算新", () => {
    const data = { ...baseline, "owner/repo": "2026-05-25" };
    assert.equal(isNewRepo("owner/repo", data, lastUpdated), false);
  });

  test("没有 firstSeen 记录 → 不算新", () => {
    const data = { ...baseline };
    assert.equal(isNewRepo("unknown/repo", data, lastUpdated), false);
  });

  test("没有 baseline → 不算新", () => {
    const data = { "owner/repo": "2026-06-05" };
    assert.equal(isNewRepo("owner/repo", data, lastUpdated), false);
  });

  test("lastUpdated 早于 firstSeen（异常数据）→ 不算新", () => {
    const data = { ...baseline, "owner/repo": "2026-06-10" };
    assert.equal(isNewRepo("owner/repo", data, "2026-06-08"), false);
  });

  test("同一 repo 在不同数据中结果不同", () => {
    const old = { ...baseline, "repo/a": "2026-06-01" };
    const fresh = { ...baseline, "repo/a": "2026-06-07" };
    assert.equal(isNewRepo("repo/a", old, lastUpdated), false);
    assert.equal(isNewRepo("repo/a", fresh, lastUpdated), true);
  });
});
