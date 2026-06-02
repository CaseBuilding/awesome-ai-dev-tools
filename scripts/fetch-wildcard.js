/**
 * fetch-wildcard.js
 *
 * Channel 3: 通配扫描 — 按 stars 降序取 Top 200 项目，
 * 不做关键词筛选。结果标记 _source: "wildcard"。
 *
 * 月度运行，由 update-monthly.yml 触发。
 * 不生成 README（由每周 CI 处理）。
 *
 * 环境变量: GITHUB_TOKEN — GitHub Personal Access Token
 */

import { Octokit } from "@octokit/rest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { mergeSources } from "./source-priority.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN || "",
});

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
      repos.push({
        full_name: item.full_name,
        name: item.name,
        description: item.description || "",
        topics: item.topics || [],
        stars: item.stargazers_count,
        language: item.language || "",
        html_url: item.html_url,
        _source: "wildcard",
      });
    }
    page++;
  }
  return repos;
}

async function main() {
  console.log("🌐 通配扫描 — 正在获取高星项目...\n");

  const queryStr = "stars:>=5000";
  const repos = await searchRepos(queryStr, 200);
  console.log(`   找到 ${repos.length} 个项目`);

  // 读取已有缓存
  let existingRepos = [];
  let existingData = {};
  try {
    existingData = JSON.parse(
      fs.readFileSync(path.join(ROOT, "data", "repos.json"), "utf-8")
    );
    if (existingData.repos) {
      existingRepos = existingData.repos;
    }
  } catch {
    // 首次运行，无缓存
  }

  console.log(`\n📊 已有缓存: ${existingRepos.length} 个项目`);
  console.log(`   新扫描到: ${repos.length} 个项目`);

  // 按来源优先级合并
  const finalRepos = mergeSources(existingRepos, repos);
  const added = finalRepos.length - existingRepos.length;

  // 记录新项目的首次入库日期
  const firstSeenPath = path.join(ROOT, "data", "first_seen.json");
  let firstSeen = {};
  try {
    firstSeen = JSON.parse(fs.readFileSync(firstSeenPath, "utf-8"));
  } catch {
    console.warn("⚠️ first_seen.json 不存在或已损坏，将新建");
  }
  const today = new Date().toISOString().slice(0, 10);
  let firstSeenChanged = false;
  if (!firstSeen._baseline) {
    firstSeen._baseline = today;
    firstSeenChanged = true;
  }
  const existingNames = new Set(existingRepos.map((r) => r.full_name));
  for (const repo of repos) {
    if (!existingNames.has(repo.full_name) && !firstSeen[repo.full_name]) {
      firstSeen[repo.full_name] = today;
      firstSeenChanged = true;
    }
  }
  if (firstSeenChanged) {
    fs.writeFileSync(firstSeenPath, JSON.stringify(firstSeen, null, 2));
  }

  // 写入
  const output = {
    _说明: "此文件由 scripts/fetch-repos.js 和 scripts/fetch-wildcard.js 共同维护。已有项目持续保留，新的追加。",
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
