/**
 * generate-readme.js
 *
 * 生成 README.md
 * 功能：导航栏、我的关注、精选/全部/待确认分级、折叠分类、中文描述优先
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── 读取数据 ──
const classifiedData = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "classified.json"), "utf-8")
);
const categoriesConfig = JSON.parse(
  fs.readFileSync(path.join(ROOT, "config", "categories.json"), "utf-8")
);
const reposData = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "repos.json"), "utf-8")
);
const watchedData = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "watched.json"), "utf-8")
);

const categories = categoriesConfig.categories;

// ── 工具函数 ──

function formatStars(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function hasChinese(text) {
  return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);
}

function anchorName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "");
}

// 中文描述缓存（避免重复 fetch）
const CN_CACHE_PATH = path.join(ROOT, "data", "chinese_descriptions.json");
let cnCache = {};
try {
  cnCache = JSON.parse(fs.readFileSync(CN_CACHE_PATH, "utf-8"));
} catch {
  cnCache = {};
}

async function fetchChineseDescription(repo) {
  // 如果 API 描述已经有中文，直接用
  if (hasChinese(repo.description || "")) {
    return repo.description;
  }

  // 检查缓存
  if (cnCache[repo.full_name]) {
    return cnCache[repo.full_name];
  }

  // 尝试抓取 README.zh-CN.md
  try {
    const branches = ["main", "master"];
    for (const branch of branches) {
      const urls = [
        `https://raw.githubusercontent.com/${repo.full_name}/${branch}/README.zh-CN.md`,
        `https://raw.githubusercontent.com/${repo.full_name}/${branch}/READMEs/README.zh-CN.md`,
        `https://raw.githubusercontent.com/${repo.full_name}/${branch}/README.zh.md`,
      ];
      for (const url of urls) {
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const text = await res.text();
          // 提取第一段有意义的文字
          const lines = text
            .replace(/^#+.*$/gm, "")
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 5 && !l.startsWith("[") && !l.startsWith("!"))
            .filter((l) => hasChinese(l));

          const desc = lines[0] || "";
          if (desc) {
            cnCache[repo.full_name] = desc.slice(0, 200);
            return cnCache[repo.full_name];
          }
        }
      }
    }
  } catch {
    // 超时或网络错误，忽略
  }

  cnCache[repo.full_name] = ""; // 缓存空值，避免重复请求
  return "";
}

// ── 渲染 ──

function renderRepoLine(repo, descCn) {
  const stars = formatStars(repo.stars);
  const lang = repo.language || "";
  const desc = repo.description || "";

  let lines = `### ${repo.full_name} ⭐${stars}`;
  if (lang) lines += ` · 🔤${lang}`;

  // 优先展示中文描述
  if (descCn) {
    lines += `\n\n🌏 **${descCn}**`;
  }
  if (desc && (!descCn || desc !== descCn)) {
    lines += `\n\n📝 ${desc.slice(0, 200)}`;
  }

  lines += `\n\n🔗 [GitHub](${repo.html_url})\n`;
  return lines;
}

// ── 主流程 ──

async function main() {
  const lines = [];
  const now = new Date();
  const lastUpdated = reposData.last_updated
    ? new Date(reposData.last_updated).toLocaleDateString("zh-CN")
    : "—";

  // ════════ 标题 ════════
  lines.push(`# Awesome AI Dev Tools`);
  lines.push(``);
  lines.push(`> 热门 AI 开发者工具合集 · **${classifiedData.stats.total}** 个项目 · 每周日自动更新`);
  lines.push(``);

  // ════════ 统计 ════════
  lines.push(`## 📊 统计`);
  lines.push(``);
  lines.push(`| 指标 | 数值 |`);
  lines.push(`| --- | --- |`);
  lines.push(`| 收录项目 | ${classifiedData.stats.total} |`);
  lines.push(`| 已分类 | ${classifiedData.stats.classified} |`);
  lines.push(`| 待确认 | ${classifiedData.stats.uncertain || 0} |`);
  lines.push(`| 未分类 | ${classifiedData.stats.unclassified} |`);
  lines.push(`| 最后更新 | ${lastUpdated} |`);
  lines.push(``);

  // ════════ 导航栏 ════════
  lines.push(`## 📑 导航`);
  lines.push(``);

  const navItems = [];
  // 我的关注
  const watched = watchedData.watched || {};
  const watchedKeys = Object.keys(watched);
  if (watchedKeys.length > 0) {
    navItems.push(`[👁️ 我的关注](#-我的关注)`);
  }

  for (const cat of categories) {
    const count = classifiedData.classified[cat.id]?.length || 0;
    if (count > 0) {
      navItems.push(`[${cat.name}](#${anchorName(cat.name)})`);
    }
  }

  if (classifiedData.unclassified?.length > 0) {
    navItems.push(`[📂 未分类](#-未分类)`);
  }

  lines.push(navItems.join(" · "));
  lines.push(``);

  // ════════ 我的关注 ════════
  if (watchedKeys.length > 0) {
    lines.push(`---`);
    lines.push(``);
    lines.push(`## 👁️ 我的关注`);
    lines.push(``);
    lines.push(`| 项目 | Stars | 分类 | 备注 |`);
    lines.push(`| --- | --- | --- | --- |`);

    for (const [fullName, info] of Object.entries(watched)) {
      const repo = reposData.repos?.find((r) => r.full_name === fullName);
      if (repo) {
        const stars = formatStars(repo.stars);
        // 找到它的分类
        let catName = "—";
        for (const [catId, repos] of Object.entries(classifiedData.classified)) {
          if (repos.some((r) => r.full_name === fullName)) {
            const cat = categories.find((c) => c.id === catId);
            if (cat) catName = cat.name;
            break;
          }
        }
        lines.push(`| [${fullName}](${repo.html_url}) | ${stars} | ${catName} | ${info.note || ""} |`);
      } else {
        lines.push(`| ${fullName} | — | — | ⚠️ 未在搜索结果中找到 |`);
      }
    }
    lines.push(``);
  }

  // ════════ 各分类 ════════
  for (const cat of categories) {
    const repos = classifiedData.classified[cat.id] || [];
    if (repos.length === 0) continue;

    lines.push(`---`);
    lines.push(``);

    // 锚点
    lines.push(`<a name="${anchorName(cat.name)}"></a>`);
    lines.push(``);

    // 可折叠分类标题（默认展开前三个分类）
    const defaultOpen = categories.indexOf(cat) < 3;
    lines.push(`<details ${defaultOpen ? "open" : ""}>`);
    lines.push(`<summary><b>${cat.name}</b> <code>${repos.length}</code></summary>`);
    lines.push(`<br>`);

    // 精选：高 confidence + 高 stars 的前 5 个
    const featured = repos
      .filter((r) => r._confidence === "high" && !r._uncertain)
      .slice(0, 5);

    // 待确认
    const uncertain = repos.filter((r) => r._uncertain);

    if (featured.length > 0) {
      lines.push(`### ⭐ 精选推荐`);
      lines.push(``);
      for (const repo of featured) {
        const descCn = await fetchChineseDescription(repo);
        lines.push(renderRepoLine(repo, descCn));
        lines.push(`---`);
      }
    }

    // 全部项目（折叠）
    const rest = repos.filter(
      (r) => !uncertain.includes(r) || featured.includes(r)
    );
    if (rest.length > featured.length) {
      lines.push(`### 📋 全部项目 (${rest.length})`);
      lines.push(``);
      lines.push(`<details>`);
      lines.push(`<summary>点击展开全部 ${rest.length} 个项目</summary>`);
      lines.push(`<br>`);
      for (const repo of rest) {
        const descCn = await fetchChineseDescription(repo);
        lines.push(renderRepoLine(repo, descCn));
        lines.push(`---`);
      }
      lines.push(`</details>`);
    }

    // 待确认
    if (uncertain.length > 0) {
      lines.push(`### ❓ 待确认 (${uncertain.length})`);
      lines.push(``);
      lines.push(`> 以下项目匹配了多个分类，不确定应归入哪一类。请手动确认并更新 data/manual_overrides.json`);
      lines.push(``);
      lines.push(`<details>`);
      lines.push(`<summary>点击查看 ${uncertain.length} 个待确认项目</summary>`);
      lines.push(`<br>`);
      for (const repo of uncertain) {
        const descCn = await fetchChineseDescription(repo);
        lines.push(renderRepoLine(repo, descCn));
        lines.push(`---`);
      }
      lines.push(`</details>`);
    }

    lines.push(`</details>`);
    lines.push(``);
  }

  // ════════ 未分类 ════════
  if (classifiedData.unclassified?.length > 0) {
    lines.push(`---`);
    lines.push(``);
    lines.push(`<a name="未分类"></a>`);
    lines.push(`## 📂 未分类`);
    lines.push(``);
    lines.push(`以下项目暂未自动分类，请手动指定所属类别。`);
    lines.push(``);
    lines.push(`<details>`);
    lines.push(`<summary>点击查看 ${classifiedData.unclassified.length} 个未分类项目</summary>`);
    lines.push(`<br>`);
    for (const repo of classifiedData.unclassified) {
      const descCn = await fetchChineseDescription(repo);
      lines.push(renderRepoLine(repo, descCn));
      lines.push(`---`);
    }
    lines.push(`</details>`);
  }

  // ════════ 页脚 ════════
  lines.push(`---`);
  lines.push(``);
  lines.push(`## 🤖 关于本项目`);
  lines.push(``);
  lines.push(`由 GitHub Actions 每周自动更新。人工修正请编辑：`);
  lines.push(``);
  lines.push(`- 修正分类 → \`data/manual_overrides.json\``);
  lines.push(`- 关注项目 → \`data/watched.json\``);
  lines.push(`- 调整搜索 → \`config/search-queries.json\``);
  lines.push(`- 调整规则 → \`config/categories.json\``);
  lines.push(``);
  lines.push(`更多说明见 [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)`);

  // 保存中文描述缓存
  fs.writeFileSync(CN_CACHE_PATH, JSON.stringify(cnCache, null, 2), "utf-8");

  // 写入 README
  const readmePath = path.join(ROOT, "README.md");
  fs.writeFileSync(readmePath, lines.join("\n"), "utf-8");
  console.log(`✅ README.md 已生成 (${lines.length} 行)`);
  console.log(`   中文描述缓存: ${Object.keys(cnCache).filter((k) => cnCache[k]).length} 条`);
}

main().catch((err) => {
  console.error("❌ 出错:", err.message);
  process.exit(1);
});
