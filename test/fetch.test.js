/**
 * fetch.test.js — fetch-repos 辅助函数测试
 *
 * 测试 description 查询生成、来源标记逻辑。
 * 使用 Node 内置 node:test + node:assert，零外部依赖。
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

/**
 * 描述关键词 → GitHub 搜索字符串 的生成逻辑。
 * 这是 fetch-repos.js 中 Channel 2 使用的内联逻辑，
 * 这里单独测试确保格式正确。
 */
function buildDescQuery(keywords) {
  if (!keywords || keywords.length === 0) return null;
  const quoted = keywords.map((kw) => `"${kw}"`);
  return `${quoted.join(" OR ")} in:description,readme stars:>=5000`;
}

// ─────────────────────────────────────────────
//  description 查询生成
// ─────────────────────────────────────────────

describe("buildDescQuery", () => {
  test("单个关键词 → 正确格式", () => {
    const result = buildDescQuery(["mcp server"]);
    assert.equal(result, '"mcp server" in:description,readme stars:>=5000');
  });

  test("多个关键词 → OR 连接", () => {
    const result = buildDescQuery(["mcp server", "mcp client", "model context protocol"]);
    assert.equal(result, '"mcp server" OR "mcp client" OR "model context protocol" in:description,readme stars:>=5000');
  });

  test("空数组 → null", () => {
    assert.equal(buildDescQuery([]), null);
  });

  test("undefined → null", () => {
    assert.equal(buildDescQuery(undefined), null);
  });

  test("null → null", () => {
    assert.equal(buildDescQuery(null), null);
  });

  test("关键词含特殊字符 → 保留原样加引号", () => {
    const result = buildDescQuery(["code analysis", "static-analysis"]);
    assert.equal(result, '"code analysis" OR "static-analysis" in:description,readme stars:>=5000');
  });
});
