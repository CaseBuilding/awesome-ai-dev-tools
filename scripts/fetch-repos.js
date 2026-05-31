/**
 * fetch-repos.js
 *
 * 从 GitHub Search API 搜索项目，合并已有缓存（增量更新）。
 * 已有项目持续保留，新搜索到的项目追加进去。
 *
 * 环境变量: GITHUB_TOKEN — GitHub Personal Access Token
 */

import { Octokit } from "@octokit/rest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const searchQueries = JSON.parse(
  fs.readFileSync(path.join(ROOT, "config", "search-queries.json"), "utf-8")
);
const categories = JSON.parse(
  fs.readFileSync(path.join(ROOT, "config", "categories.json"), "utf-8")
).categories;

const categoryNames = {};
for (const cat of categories) {
  categoryNames[cat.id] = cat.name;
}

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN || "",
});

const MIN_STARS = 5000;

async function searchRepos(queryStr, maxResults) {
  const seen = new Set();
  const repos = [];
  let page = 1;

  while (repos.length < maxResults && page <= 2) {
    const { data } = await octokit.search.repos({
      q: queryStr,
      sort: "stars",
      order: "desc",
      per_page: 100,
      page,
    });

    if (data.items.length === 0) break;

    for (const item of data.items) {
      if (seen.has(item.full_name)) continue;
      seen.add(item.full_name);
      if (item.stargazers_count < MIN_STARS) continue;
      repos.push({
        full_name: item.full_name,
        name: item.name,
        description: item.description || "",
        topics: item.topics || [],
        stars: item.stargazers_count,
        language: item.language || "",
        html_url: item.html_url,
      });
    }
    page++;
  }
  return repos;
}

async function main() {
  console.log("🔍 开始搜索 GitHub 项目...\n");

  const newRepos = [];
  const seen = new Set();

  // ── 第 1 步：搜索新项目 ──
  for (const [categoryId, config] of Object.entries(searchQueries.queries)) {
    const categoryName = categoryNames[categoryId] || categoryId;
    console.log(`  [${categoryName}]`);

    for (const query of config.search) {
      console.log(`    → ${query}`);
      const repos = await searchRepos(query, config.max_results);
      for (const repo of repos) {
        if (seen.has(repo.full_name)) continue;
        seen.add(repo.full_name);
        newRepos.push(repo);
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
  }

  // ── 第 2 步：手动补充项目（没有 topic 标签的） ──
  const overrides = JSON.parse(
    fs.readFileSync(path.join(ROOT, "data", "manual_overrides.json"), "utf-8")
  );
  const addMissing = overrides.add_missing || {};
  const missingKeys = Object.keys(addMissing).filter(
    (name) => !seen.has(name) && name !== "_说明"
  );

  if (missingKeys.length > 0) {
    console.log(`\n📥 手动补充 ${missingKeys.length} 个项目...`);
    for (const fullName of missingKeys) {
      try {
        const [owner, repoName] = fullName.split("/");
        const { data } = await octokit.repos.get({ owner, repo: repoName });
        const repo = {
          full_name: data.full_name,
          name: data.name,
          description: data.description || "",
          topics: data.topics || [],
          stars: data.stargazers_count,
          language: data.language || "",
          html_url: data.html_url,
        };
        newRepos.push(repo);
        seen.add(fullName);
        console.log(`    ✅ ${fullName} (${data.stargazers_count}⭐)`);
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err) {
        console.log(`    ❌ ${fullName}: ${err.message}`);
      }
    }
  }

  // ── 第 3 步：合并已有缓存（增量更新，保留历史） ──
  let existingRepos = [];
  try {
    const existing = JSON.parse(
      fs.readFileSync(path.join(ROOT, "data", "repos.json"), "utf-8")
    );
    if (existing.repos) {
      existingRepos = existing.repos;
    }
  } catch {
    // 首次运行，无缓存
  }

  console.log(`\n📊 已有缓存: ${existingRepos.length} 个项目`);
  console.log(`   新搜索到: ${newRepos.length} 个项目`);

  // 合并：新搜索的覆盖旧数据，旧数据中没有被覆盖的保留
  const merged = new Map();
  for (const repo of existingRepos) {
    merged.set(repo.full_name, repo);
  }
  for (const repo of newRepos) {
    merged.set(repo.full_name, repo);
  }

  const finalRepos = Array.from(merged.values());
  finalRepos.sort((a, b) => b.stars - a.stars);

  const added = finalRepos.length - existingRepos.length;

  // ── 第 4 步：写入 ──
  const output = {
    _说明: "此文件由 scripts/fetch-repos.js 自动生成。已有项目持续保留，新的追加。",
    last_updated: new Date().toISOString(),
    total_count: finalRepos.length,
    repos: finalRepos,
  };

  const outputPath = path.join(ROOT, "data", "repos.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n✅ 完成！共 ${finalRepos.length} 个项目 (新增 ${added} 个)`);
  console.log(`   已写入 data/repos.json`);
}

main().catch((err) => {
  console.error("❌ 出错:", err.message);
  process.exit(1);
});
