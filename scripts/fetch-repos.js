/**
 * fetch-repos.js
 *
 * 从 GitHub Search API 搜索项目，按 search-queries.json 配置
 * 过滤 Star ≥ 5000，输出到 data/repos.json
 *
 * 环境变量: GITHUB_TOKEN — GitHub Personal Access Token
 */

import { Octokit } from "@octokit/rest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// 读取搜索配置
const searchQueries = JSON.parse(
  fs.readFileSync(path.join(ROOT, "config", "search-queries.json"), "utf-8")
);

// 读取分类配置（用于获取分类名称）
const categories = JSON.parse(
  fs.readFileSync(path.join(ROOT, "config", "categories.json"), "utf-8")
).categories;

// 建立分类 ID → 名称的映射
const categoryNames = {};
for (const cat of categories) {
  categoryNames[cat.id] = cat.name;
}

// GitHub API 客户端
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN || "",
});

const MIN_STARS = 5000;

/**
 * 执行一个搜索查询，返回去重后的项目列表
 */
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

      // 再次确保 Star 门槛
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
    if (page > 10) break; // 安全限制
  }

  return repos;
}

async function main() {
  console.log("🔍 开始搜索 GitHub 项目...\n");

  const allRepos = [];
  const seen = new Set();

  for (const [categoryId, config] of Object.entries(searchQueries.queries)) {
    const categoryName = categoryNames[categoryId] || categoryId;
    console.log(`  [${categoryName}]`);

    for (const query of config.search) {
      console.log(`    → ${query}`);
      const repos = await searchRepos(query, config.max_results);

      for (const repo of repos) {
        if (seen.has(repo.full_name)) continue;
        seen.add(repo.full_name);
        repo._sourceCategory = categoryId;
        allRepos.push(repo);
      }

      // GitHub Search API 限速：30 请求/分钟，留余量
      await new Promise((r) => setTimeout(r, 2500));
    }
  }

  // 按 Star 降序排列
  allRepos.sort((a, b) => b.stars - a.stars);

  // 写入缓存
  const output = {
    _说明: "此文件由 scripts/fetch-repos.js 自动生成，缓存 GitHub API 搜索结果",
    last_updated: new Date().toISOString(),
    total_count: allRepos.length,
    repos: allRepos,
  };

  const outputPath = path.join(ROOT, "data", "repos.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n✅ 完成！共获取 ${allRepos.length} 个项目`);
  console.log(`   已写入 data/repos.json`);
}

main().catch((err) => {
  console.error("❌ 出错:", err.message);
  process.exit(1);
});
