# REASONIX.md — awesome-ai-dev-tools

## Stack
- **Runtime:** Node.js 24 (ES Modules, `"type": "module"` in package.json)
- **Dep:** `@octokit/rest` ^21.0 — GitHub API client
- **Test:** Zero-dep — uses Node built-in `node:test` + `node:assert`
- **Config:** Plain JSON files in `config/` and `data/`

## Layout
- `scripts/fetch-repos.js` — search GitHub API (Ch1 topic + Ch2 desc), write `data/repos.json`
- `scripts/fetch-wildcard.js` — Channel 3 wildcard sweep (top 200 by stars, monthly)
- `scripts/source-priority.js` — source priority merge logic
- `scripts/classify.js` — auto-classify + deterministic locking (override > lock > autoClassify)
- `scripts/ai-classify.js` — AI-assisted classification CLI
- `scripts/generate-readme.js` — render `README.md` from classified data
- `scripts/generate-site.js` — generate `docs/index.html` (Web UI)
- `scripts/translate-desc.js` — CLI helper for AI-generated Chinese descriptions
- `config/` — `categories.json`, `search-queries.json`, `nav-groups.json`
- `data/` — repos / classified / classification-locks / classification-anchors / chinese_descriptions (auto-generated), manual_overrides / watched / first_seen (hand-edited)
- `test/` — `classify.test.js` (57 tests), `fixtures/` (mock data)
- `docs/` — `REQUIREMENTS.md`, `ARCHITECTURE.md`, `AI-CLASSIFY-WORKFLOW.md`, `SKILL-GUIDE.md`
- `.reasonix/skills/` — ai-classify-reviewer (classification review skill) + other skills
- `CHANGELOG.md` — append-only JSON audit log

## Commands
- `npm run fetch` — search GitHub and cache repo data
- `npm run classify` — auto-classify repos (+ `--relock` to force refresh locks)
- `npm run generate` — generate `README.md`
- `npm run build` — fetch → classify → generate (runs weekly in CI)
- `npm test` — 57 traffic-light tests (zero deps, uses node:test)
- `node scripts/generate-site.js` — generate Web UI (`docs/index.html`)
- `node scripts/ai-classify.js --pending` — list pending AI classification items
- `node scripts/fetch-wildcard.js` — monthly wildcard sweep

## Conventions
- **ESM throughout** — all scripts use `import`/`export`, no `require()`
- **Config-driven** — category rules, search queries, nav groups all in `config/*.json`
- **CHANGELOG.md** — JSON array, append only. Every config/script/doc change gets a record
- **Export for test** — `autoClassify()`, `applyOverrides()`, `formatStars()`, `anchorName()` are exported pure functions. Add `export` to any new pure function you want tested
- **isMain guard** — scripts that run `main()` at module level check `process.argv[1] === fileURLToPath(import.meta.url)` so tests can import without side effects

## Watch out for
- **`data/repos.json` + `data/classified.json` are regenerated every run** — don't hand-edit them. Edit `data/manual_overrides.json` or `data/watched.json` instead
- **`data/chinese_descriptions.json`** — AI-generated translation cache. The translate-desc.js script writes to it. Never edit by hand
- **`data/classification-locks.json`** — auto-generated deterministic cache. Do NOT hand-edit; use `--relock` to refresh.
- **`data/classification-anchors.json`** — anchor samples for AI classification. Hand-edit to add/improve samples.
- **`scripts/classify.js` reads global `categories` from module scope** — `autoClassify(repo, cats)` accepts it as a param for testing, but `main()` uses the module-level variable
- **`navGroups` mapping in `config/nav-groups.json`** — adding a new category to `categories.json` requires adding it here too, or it won't appear in the navigation table (test `导航分组一致性` catches this)
- **`config/search-queries.json` uses comma-OR syntax** — `topic:ai-agent,coding-agent` not `topic:ai-agent OR topic:coding-agent` (GitHub Search API syntax constraint)
- **Classification lock priority** — `override > lock > autoClassify`. Overrides in `manual_overrides.json` always win. Once locked, a repo's classification won't change unless `--relock` is used.

## User preferences
- **Confirm before acting** — Every request must be clarified via `interview-me` before execution. Write hypothesis + confidence, ask one question with a guess attached, wait for explicit confirmation. Exception: pure info queries, mechanical operations, or explicit "just do it."
