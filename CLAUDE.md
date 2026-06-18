# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**awesome-ai-dev-tools** — Automated curated list of popular AI developer tools on GitHub. Scrapes GitHub API weekly via GitHub Actions (three-channel search: topic + description + wildcard), classifies repos by topic/description keywords, and generates a categorized README.

## Commands

- `npm run fetch` — Search GitHub API (Ch1 topic + Ch2 desc), write `data/repos.json`
- `npm run classify` — Auto-classify repos by topic/description keywords, write `data/classified.json`
- `npm run generate` — Generate `README.md` from classified data
- `npm run build` — Full weekly pipeline: fetch → classify → generate
- `npm test` — Run all tests (uses `node:test`, zero external deps, **57 tests**)
- `node scripts/translate-desc.js` — CLI helper for AI-generated Chinese descriptions
- `node scripts/fetch-wildcard.js` — Channel 3 wildcard sweep (top 200 by stars, monthly)
- `node scripts/ai-classify.js` — CLI helper for AI-assisted classification (--pending/--list/--classify/--apply)
- `node scripts/generate-site.js` — Generate `docs/index.html` (Web UI with search/filter)

## Architecture

ESM-only Node.js project (`"type": "module"`, Node 20+). Single dependency: `@octokit/rest` for GitHub API. Tests use built-in `node:test` + `node:assert` — no test framework.

### Environment

- **`GITHUB_TOKEN`** — 已设置环境变量，用于 GitHub API 搜索和 git push 认证。
  - API 搜索：`fetch-repos.js` 和 `fetch-wildcard.js` 自动使用
  - git push：需要用 `git remote set-url origin https://CaseBuilding:${GITHUB_TOKEN}@github.com/CaseBuilding/awesome-ai-dev-tools.git` 临时注入 token，推送完立即 `git remote set-url origin https://github.com/CaseBuilding/awesome-ai-dev-tools.git` 移除（不要将 token 值写入任何文件）

### Data Pipeline

```
config/search-queries.json ──→ scripts/fetch-repos.js ──→ data/repos.json  (Ch1 topic + Ch2 desc, weekly)
scripts/fetch-wildcard.js  ──→ data/repos.json (Ch3 wildcard, monthly)
scripts/source-priority.js     ←─ shared merge logic for all fetch scripts
                                                                   
config/categories.json     ──→ scripts/classify.js ──→ data/classified.json
data/manual_overrides.json ──→ scripts/classify.js (applies overrides + add_missing)
data/classification-locks.json ←─ scripts/classify.js (auto-generated, one-lock-per-repo)
                                                                   
data/classified.json       ──→ scripts/generate-readme.js ──→ README.md
data/classified.json       ──→ scripts/generate-site.js   ──→ docs/index.html
data/classified.json       ──→ data/pending_ai_review.json (unclassified Ch2/Ch3 repos)
                                                                   
scripts/ai-classify.js     ──→ data/manual_overrides.json (--apply)
```

Pipeline runs weekly via GitHub Actions (`.github/workflows/update.yml`, cron `0 0 * * 0`) and monthly via `.github/workflows/update-monthly.yml` (cron `0 0 1 * *`). Both support `workflow_dispatch` for manual trigger.

### Key Files

- **`config/categories.json`** — **19** category definitions with `match.topics` and `match.desc_keywords` arrays, plus `priority` (1-10) for disambiguation
- **`config/search-queries.json`** — GitHub Search API queries per category, using comma-OR syntax (`topic:ai-agent,coding-agent` not `topic:ai-agent OR topic:coding-agent`)
- **`config/nav-groups.json`** — Navigation table groupings (5 groups); adding a category requires an entry here or test catches it
- **`data/manual_overrides.json`** — Hand-edited overrides and `add_missing`. Do NOT edit `data/repos.json` or `data/classified.json` (regenerated every run)
- **`data/classification-locks.json`** — Auto-generated deterministic classification cache (override > lock > autoClassify priority chain)
- **`data/classification-anchors.json`** — Anchor sample library for AI classification review (3 positives + 1-2 negatives per category)
- **`data/watched.json`** — Projects flagged for README "My Watchlist" section
- **`data/first_seen.json`** — First-seen date tracking for 🆕 badge (7-day window)
- **`data/pending_ai_review.json`** — Auto-generated queue for AI-assisted classification (Ch2/Ch3 unclassified repos)
- **`scripts/source-priority.js`** — Shared merge logic: source priority ordering and `mergeSources()`
- **`scripts/generate-site.js`** — Generate `docs/index.html` (Web UI with search, filter, dark mode)
- **`docs/index.html`** — Auto-generated Web UI, served via GitHub Pages
- **`docs/AI-CLASSIFY-WORKFLOW.md`** — AI classification workflow design: Standard + Context + Anchor + Audit
- **`.reasonix/skills/ai-classify-reviewer/`** — Reusable AI classification review skill

### Conventions

- **Test exports** — Pure functions (`autoClassify`, `applyOverrides`, `formatStars`, `anchorName`, `isNewRepo`) are exported from scripts and tested. Export any new pure function you want tested.
- **`isMain` guard** — Scripts that run `main()` use `process.argv[1] === fileURLToPath(import.meta.url)` so tests can import without side effects
- **CHANGELOG.md** — JSON array, append-only. Every config/script/doc change gets a record
- **Classifier priority** — When a repo matches multiple categories, the one with highest `priority` wins. Topic matches (confidence: "high") beat description-only matches (confidence: "low")
- **Source priority** — When a repo appears from multiple search channels, `source-priority.js` decides: add_missing(10) > topic_search(8) > desc_search(5) > wildcard(2). Legacy repos without `_source` default to 8.
- **Classification lock priority chain** — manual_overrides.json > classification-locks.json > autoClassify(). Once locked, repo classification never changes unless `--relock`.
- **"🆕" badge** — Projects first seen within the last 7 days get a badge in the README. Tracked via `data/first_seen.json`.
- **"本周新增 Top 10"** — New projects section shows only top 10 by stars to avoid overwhelming the README.
- **Config-driven** — Change classification rules in JSON, not in scripts
- **Pending AI review** — Unclassified repos from desc_search/wildcard go to `data/pending_ai_review.json`. Process them with `node scripts/ai-classify.js --apply <file>` after AI review.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
