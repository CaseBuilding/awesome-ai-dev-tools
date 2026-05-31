/**
 * generate-readme.js
 *
 * 读取分类结果，生成 README.md
 * 按分类顺序排列，每个分类内按 Star 降序
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// 读取数据
const classifiedData = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "classified.json"), "utf-8")
);
const categoriesConfig = JSON.parse(
  fs.readFileSync(path.join(ROOT, "config", "categories.json"), "utf-8")
);
const reposData = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "repos.json"), "utf-8")
);

const categories = categoriesConfig.categories;
const unclassifiedCategory = categoriesConfig.unclassified_category;

/**
 * 格式化 Star 数字
 */
function formatStars(n) {
  if (n >= 1000) {
    return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return String(n);
}

/**
 * 生成单个项目的信息块
 */
function renderRepo(repo) {
  const stars = formatStars(repo.stars);
  const lang = repo.language || "—";
  const desc = repo.description || "暂无描述";

  return `### ${repo.full_name}
> ⭐ ${stars} · 🔤 ${lang}

**🎯 功能:** ${desc}

**🔗 链接:** [${repo.html_url}](${repo.html_url})
`;
}

function main() {
  const lines = [];
  const now = new Date();
  const lastUpdated = reposData.last_updated
    ? new Date(reposData.last_updated).toLocaleDateString("zh-CN")
    : "—";

  // ──── 标题 ────
  lines.push(`# Awesome AI Dev Tools`);
  lines.push(``);
  lines.push(
    `> 热门 AI 开发者工具合集 · 自动更新 · 最后更新: ${lastUpdated}`
  );
  lines.push(``);
  lines.push(
    `收录 GitHub 上 Star ≥ 5K 的热门 AI 开发者工具，按分类整理，每周自动更新。`
  );
  lines.push(``);

  // ──── 统计 ────
  lines.push(`## 📊 统计`);
  lines.push(``);
  lines.push(`| 指标 | 数值 |`);
  lines.push(`| --- | --- |`);
  lines.push(`| 收录项目总数 | ${classifiedData.stats.total} |`);
  lines.push(`| 已分类 | ${classifiedData.stats.classified} |`);
  lines.push(`| 未分类 | ${classifiedData.stats.unclassified} |`);
  lines.push(`| 已隐藏 | ${classifiedData.stats.hidden} |`);
  lines.push(`| 最后更新 | ${lastUpdated} |`);
  lines.push(``);

  // ──── 目录 ────
  lines.push(`## 📑 目录`);
  lines.push(``);
  for (const cat of categories) {
    const count = classifiedData.classified[cat.id]?.length || 0;
    if (count > 0) {
      lines.push(`- ${cat.name}（${count}）`);
    }
  }
  if (
    classifiedData.unclassified &&
    classifiedData.unclassified.length > 0
  ) {
    lines.push(`- 📂 未分类（${classifiedData.unclassified.length}）`);
  }
  lines.push(``);

  // ──── 各分类内容 ────
  for (const cat of categories) {
    const repos = classifiedData.classified[cat.id] || [];
    if (repos.length === 0) continue;

    lines.push(`---`);
    lines.push(``);
    lines.push(`## ${cat.name}`);
    lines.push(``);

    for (const repo of repos) {
      lines.push(renderRepo(repo));
    }
  }

  // ──── 未分类 ────
  if (classifiedData.unclassified && classifiedData.unclassified.length > 0) {
    lines.push(`---`);
    lines.push(``);
    lines.push(`## 📂 ${unclassifiedCategory.name}`);
    lines.push(``);
    lines.push(
      `以下项目暂未自动分类，请手动指定所属类别后移入上方对应区域。`
    );
    lines.push(``);

    for (const repo of classifiedData.unclassified) {
      lines.push(renderRepo(repo));
    }
  }

  // ──── 页脚 ────
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 🤖 关于本项目`);
  lines.push(``);
  lines.push(
    `本合集由 [GitHub Actions](${reposData.repos?.[0]?.html_url || "#"}) 每周自动更新。`
  );
  lines.push(``);
  lines.push(`**维护方式：**`);
  lines.push(``);
  lines.push(`1. 自动分类不准 → 编辑 \`data/manual_overrides.json\` 手动修正`);
  lines.push(`2. 想调整分类规则 → 编辑 \`config/categories.json\``);
  lines.push(`3. 想调整搜索范围 → 编辑 \`config/search-queries.json\``);
  lines.push(``);
  lines.push(`更多说明见 [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)`);

  // 写入
  const readmePath = path.join(ROOT, "README.md");
  fs.writeFileSync(readmePath, lines.join("\n"), "utf-8");

  console.log(`✅ README.md 已生成 (${lines.length} 行)`);
}

main();
