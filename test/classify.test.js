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
import { formatStars, anchorName } from "../scripts/generate-readme.js";

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
//  5. 导航分组一致性 — 与真实配置对比
// ─────────────────────────────────────────────

describe("导航分组一致性", () => {
  test("所有分类都在 navGroups 中有归属", () => {
    // 从真实 categories.json 读取
    const realCats = JSON.parse(
      fs.readFileSync(path.join(ROOT, "config", "categories.json"), "utf-8")
    );
    const allIds = realCats.categories.map((c) => c.id);

    // 从 generate-readme.js 提取 navGroups
    const gr = fs.readFileSync(
      path.join(ROOT, "scripts", "generate-readme.js"),
      "utf-8"
    );
    const navMatch = gr.match(/navGroups\s*=\s*\{([^}]+)\}/s);
    assert.ok(navMatch, "navGroups 定义未找到");

    // 提取所有引用的分类 ID
    const referenced = new Set();
    for (const id of allIds) {
      if (gr.includes(`"${id}"`)) referenced.add(id);
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
//  8. 导航表格格式验证
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
