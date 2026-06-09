[
  {
    "date": "2026-05-31",
    "type": "init",
    "reason": "项目初始化，确定 Star ≥ 5K 门槛、10 个分类、GitHub Actions 自动更新",
    "changed_by": "CaseBuilding + Reasonix 讨论确认",
    "changes": {
      "docs/REQUIREMENTS.md": "创建初始需求文档"
    }
  },
  {
    "date": "2026-05-31",
    "type": "config",
    "reason": "GitHub Search API 不支持括号 OR 语法，改用逗号语法 topic:key1,key2",
    "changed_by": "Reasonix 排查后修复",
    "changes": {
      "config/search-queries.json": "将 (topic:xxx OR topic:yyy) 改为 topic:xxx,yyy"
    }
  },
  {
    "date": "2026-05-31",
    "type": "config",
    "reason": "多分类匹配导致 203 个待确认项目，引入优先级系统自动消歧义",
    "changed_by": "Reasonix 设计 + CaseBuilding 确认",
    "changes": {
      "config/categories.json": "每个分类增加 priority 字段 (1-10)",
      "scripts/classify.js": "匹配多个分类时取 priority 最高者，不再标记待确认"
    }
  },
  {
    "date": "2026-05-31",
    "type": "feature",
    "reason": "已有搜索结果每次不一致，需要保留历史数据",
    "changed_by": "Reasonix 设计 + CaseBuilding 确认",
    "changes": {
      "scripts/fetch-repos.js": "增量更新：合并搜索缓存 + 新数据，已有项目只增不减"
    }
  },
  {
    "date": "2026-05-31",
    "type": "feature",
    "reason": "Understand-Anything 等优质项目没有 topic 标签，无法被搜索到",
    "changed_by": "CaseBuilding 提出 + Reasonix 实现",
    "changes": {
      "data/manual_overrides.json": "新增 add_missing 字段，手动收录无 topic 项目",
      "scripts/fetch-repos.js": "读取 add_missing 并调用 octokit.repos.get() 获取数据"
    }
  },
  {
    "date": "2026-05-31",
    "type": "feature",
    "reason": "用户需要关注重点项目",
    "changed_by": "CaseBuilding 提出",
    "changes": {
      "data/watched.json": "新增我的关注列表",
      "scripts/generate-readme.js": "README 顶部展示关注项目表格"
    }
  },
  {
    "date": "2026-05-31",
    "type": "feature",
    "reason": "README 项目太多不易浏览，需要更好的展示结构",
    "changed_by": "CaseBuilding 提出 + Reasonix 实现",
    "changes": {
      "scripts/generate-readme.js": "折叠分类、导航栏、精选/全部分级、中文描述抓取"
    }
  },
  {
    "date": "2026-05-31",
    "type": "config",
    "reason": "代码分析 vs 代码导图边界模糊，缺少示例项目",
    "changed_by": "grill-with-docs 追问后确认",
    "changes": {
      "docs/REQUIREMENTS.md": "明确边界：分析结构/质量/依赖→代码分析，画图给人看→代码导图；补充示例项目"
    }
  },
  {
    "date": "2026-05-31",
    "type": "config",
    "reason": "依赖基础设施的工具（如 RAG 框架）是否收录不明确",
    "changed_by": "grill-with-docs 追问后确认",
    "changes": {
      "docs/REQUIREMENTS.md": "收录标准增加边界说明：开箱即用工具收录，纯底层能力不收录"
    }
  },
  {
    "date": "2026-05-31",
    "type": "process",
    "reason": "需要明确的变更记录和不可篡改的审计日志",
    "changed_by": "CaseBuilding 要求",
    "changes": {
      "CHANGELOG.md": "创建审计日志（追加写入，不修改已有条目）",
      "docs/REQUIREMENTS.md": "第 17 章改为维护异常处理+审计规范"
    }
  },
  {
    "date": "2026-05-31",
    "type": "install",
    "reason": "安装 addyosmani/agent-skills 全套 23 个 Skills（47.2K⭐，Google Chrome 团队 Addy Osmani）",
    "changed_by": "CaseBuilding + Reasonix 确认",
    "changes": {
      ".reasonix/skills/": "新增 23 个文件：interview-me、idea-refine、spec-driven-development、doubt-driven-development 等"
    }
  },
  {
    "date": "2026-06-01",
    "type": "feature",
    "reason": "中英双语 README — Q5 决定改为双语展示，AI 补充缺失中文描述",
    "changed_by": "CaseBuilding 决定 + Reasonix 实现",
    "changes": {
      "scripts/generate-readme.js": "renderRepoLine 始终输出 🌏 + 📝 两行；全部项目区也从缓存读取中文描述；修复精选项目在全部项目区重复的 Bug（||→&&）",
      "scripts/translate-desc.js": "新增 AI 翻译辅助脚本（--dry-run / --list / --import / --set），由用户手动运行",
      "docs/REQUIREMENTS.md": "新增 §19-25 PRD 模块（目标用户、成功标准、范围、风险、未决问题、Roadmap、术语表）；更新 §5.4 和 §10 双语展示规则",
      "CHANGELOG.md": "追加本条记录"
    }
  },
  {
    "date": "2026-06-01",
    "type": "test",
    "reason": "建立红绿灯测试体系，确保核心分类逻辑、数据完整性、README 格式不退化",
    "changed_by": "Reasonix 实现 + CaseBuilding 确认",
    "changes": {
      "scripts/classify.js": "autoClassify 和 applyOverrides 改为参数化导出供测试",
      "scripts/generate-readme.js": "导出 formatStars、anchorName 供测试",
      "test/classify.test.js": "新增 29 个测试（分类逻辑、覆盖、格式、数据完整性、导航一致性）",
      "test/fixtures/": "测试用 mock 数据",
      "package.json": "新增 scripts.test",
      "CHANGELOG.md": "追加本条记录"
    }
  },
  {
    "date": "2026-06-01",
    "type": "docs",
    "reason": "新增 SKILL-GUIDE.md，记录项目推荐使用的 skill 流程，方便后续快速查阅",
    "changed_by": "CaseBuilding 提出 + Reasonix 实现",
    "changes": {
      "docs/SKILL-GUIDE.md": "创建 skill 使用指南"
    }
  },
  {
    "date": "2026-06-01",
    "type": "docs",
    "reason": "创建 ADR-001，记录本次会话的关键架构决策：中英双语 README、红绿灯测试体系、导航配置化、死代码清理",
    "changed_by": "Reasonix 整理 + CaseBuilding 确认",
    "changes": {
      "docs/decisions/ADR-001.md": "新建架构决策记录"
    }
  },
  {
    "date": "2026-06-01",
    "type": "feature",
    "reason": "新增 🎬 视频处理/生成 分类（第11类），topic: video-editing/processing/generation/enhancement/tools, stars:>=5000",
    "changed_by": "CaseBuilding 提出 + Reasonix 实施",
    "changes": {
      "config/categories.json": "新增 video-processing 分类定义",
      "config/search-queries.json": "新增 video-processing 搜索配置",
      "config/nav-groups.json": "video-processing 加入 AI 工具方向导航组",
      "docs/REQUIREMENTS.md": "更新分类表、导航模板、导航分组说明",
      "docs/specs/video-processing-category.md": "新增实施规范文档"
    }
  },
  {
    "date": "2026-06-01",
    "type": "feature",
    "reason": "新增入库标记 🆕 与本周新增区块：first_seen.json 追踪首次入库日期，7 天窗口期自动标记/过期，存量数据不误标",
    "changed_by": "CaseBuilding 提出需求 → 经 spec → doubt-driven review 后实施",
    "changes": {
      "scripts/fetch-repos.js": "新增 first_seen 写入逻辑 + _baseline 自动初始化",
      "scripts/generate-readme.js": "新增 isNewRepo 函数、📬 本周新增区块、行首 🆕 标记",
      "test/classify.test.js": "新增 8 个 isNewRepo 测试 + 2 个搜索配置完整性测试",
      "data/first_seen.json": "新建首次入库日期数据文件",
      "data/chinese_descriptions.json": "补充 125 条中文描述",
      "docs/specs/new-repo-badge.md": "新增实施规范文档",
      "docs/decisions/ADR-002.md": "新增架构决策记录"
    }
  },
  {
    "date": "2026-06-02",
    "type": "feature",
    "reason": "实现三通道搜索策略（Ch1 topic + Ch2 desc + Ch3 wildcard）和 AI 辅助分类流程，提升搜索覆盖率",
    "changed_by": "CaseBuilding 提出 + Reasonix 设计实施",
    "changes": {
      "scripts/source-priority.js": "新建：来源优先级排序与合并逻辑（add_missing > topic > desc > wildcard）",
      "scripts/fetch-repos.js": "新增 Channel 2 desc 搜索（从 desc_keywords 自动生成查询），_source 标记，mergeSources 合并",
      "scripts/fetch-wildcard.js": "新建：Channel 3 通配扫描（stars:>=5000 Top 200），月度运行",
      "scripts/classify.js": "保留 _source 标记；desc_search/wildcard 未分类写入 pending_ai_review.json",
      "scripts/ai-classify.js": "新建：AI 辅助分类 CLI（--pending/--list/--classify/--apply）",
      "data/pending_ai_review.json": "新建：AI 待分类队列",
      ".github/workflows/update-monthly.yml": "新建：月度通配搜索工作流",
      ".github/workflows/update.yml": "添加 npm test 步骤；跟踪 classified.json 和 pending_ai_review.json",
      "test/classify.test.js": "新增 sourcePriorityOf、mergeSources 测试（12 个）",
      "test/fetch.test.js": "新建：desc 搜索查询生成测试（6 个）",
      "docs/REQUIREMENTS.md": "更新 §6 三通道搜索、§7.5 AI 辅助分类、§14 功能需求（新增 F21/F43-F55）、§21/§24"
    }
  },
  {
    "date": "2026-06-02",
    "type": "feature",
    "reason": "新增 Web UI（web-ui/index.html），支持搜索/筛选/分类浏览/深色模式；CI 自动生成",
    "changed_by": "CaseBuilding 提出 + Reasonix 实现",
    "changes": {
      "scripts/generate-site.js": "新建：读取 classified.json 生成完整 Web UI 页面，数据嵌入 HTML，单文件无依赖",
      "web-ui/index.html": "新建：自动生成的 Web UI 页面（搜索、语言/分类筛选、排序、本周新增、深色模式）",
      ".github/workflows/update.yml": "新增 generate-site.js 步骤，web-ui/index.html 加入 git 追踪",
      "CLAUDE.md": "更新数据管道图（新增 generate-site.js → web-ui/index.html），新增命令和关键文件说明"
    }
  },
  {
    "date": "2026-06-02",
    "type": "fix",
    "reason": "Web UI 输出目录改为 docs/ 以兼容 GitHub Pages、修复统计数量不对和日期不显示、修复 JS 引号冲突导致页面空白",
    "changed_by": "CaseBuilding 提出 + Reasonix 修复",
    "changes": {
      "scripts/generate-site.js": "输出目录 web-ui/ → docs/；header 显示 last_updated 日期；修复 JS 单/双引号混用导致语法错误；inline onclick 改为事件委托",
      "scripts/generate-readme.js": "合计行从 stats.classified(396) 改为 stats.total(498)",
      "test/classify.test.js": "更新合计行断言从 classified → total",
      ".github/workflows/update.yml": "git add web-ui/ → docs/",
      ".gitignore": "新增 web-ui-demo/、遗留数据文件（all_repos.txt、uncertain*.json）",
      "CLAUDE.md": "更新 pipeline 图从 web-ui 到 docs，新增 generate-site 命令说明"
    }
  },
  {
    "date": "2026-06-08",
    "type": "fix",
    "reason": "修复 nav-groups.json：过期分类 ID agent-workflow→agent-framework、video-processing→media-processing、llm-framework→llm-sdk，移除废弃 code-visualization；导航分组从 3 组扩展至 5 组覆盖全部 19 个分类",
    "changed_by": "CaseBuilding + Reasonix 确认",
    "changes": {
      "config/nav-groups.json": "修正过期分类 ID，新增基础设施和知识与资源两个导航组"
    }
  },
  {
    "date": "2026-06-08",
    "type": "fix",
    "reason": "README 本周新增过多（591 个），限制为 Top 10；修复 🌏/📝 数量不匹配；添加 Web UI 链接",
    "changed_by": "CaseBuilding 提出 + Reasonix 实现",
    "changes": {
      "scripts/generate-readme.js": "新增 newRepos 排序+slice(0,10) 截断；空 description 输出 📝 占位符；页脚添加 Web UI 链接",
      "test/classify.test.js": "导航表格测试 4 列→6 列；🌏📝 测试正则从全局匹配改为 \\n\\n 前缀"
    }
  },
  {
    "date": "2026-06-08",
    "type": "fix",
    "reason": "大量分类错误修正（17 个 repo）：local-inference 中类型推理库归 dev-tools、ai-coding-agent 中非编码项目归入正确分类或隐藏",
    "changed_by": "CaseBuilding + Reasonix 确认",
    "changes": {
      "data/manual_overrides.json": "新增 17 条 override（io-ts→dev-tools, ts-pattern→dev-tools, chatbox→dev-tools, miurla/morphic→dev-tools, stas00/ml-engineering→learning, unsloth→local-inference, fastapi→web-framework, gitpod→dev-tools, OpenSandbox→agent-framework, TencentDB-Agent-Memory→agent-framework, mirrord→devops, Cherry Studio→dev-tools, rtk→ai-gateway, ppt-master→doc-knowledge, guizang-ppt-skill→doc-knowledge, presenton→doc-knowledge, ccpm→hidden）"
    }
  },
  {
    "date": "2026-06-08",
    "type": "feature",
    "reason": "为 7 个 catch-all 分类补充搜索配置（web-framework、database-storage、devops、security、self-hosted、dev-tools、learning）",
    "changed_by": "CaseBuilding 确认",
    "changes": {
      "config/search-queries.json": "新增 7 个分类的 topic 搜索查询"
    }
  },
  {
    "date": "2026-06-08",
    "type": "feature",
    "reason": "修复 pre-existing 测试失败：search-queries 完整性测试和 🌏/📝 计数测试",
    "changed_by": "Reasonix 修复",
    "changes": {
      "test/classify.test.js": "🌏📝 测试正则修正；4 列→6 列表格测试",
      "config/search-queries.json": "补充 7 个分类搜索配置"
    }
  },
  {
    "date": "2026-06-08",
    "type": "feature",
    "reason": "确定性分类锁定机制：新增 classification-locks.json，优先级链 override > lock > autoClassify，防止每次 rebuild 分类结果不一致",
    "changed_by": "CaseBuilding + Reasonix 设计确认",
    "changes": {
      "scripts/classify.js": "新增 loadLocks/saveLocks 函数，实现 override>lock>autoClassify 优先级链，支持 --relock 参数",
      "data/classification-locks.json": "新建（首次运行生成 1024 条锁定）",
      "docs/AI-CLASSIFY-WORKFLOW.md": "新建完整 AI 分类工作流设计文档"
    }
  },
  {
    "date": "2026-06-08",
    "type": "feature",
    "reason": "创建 ai-classify-reviewer skill 和 data/classification-anchors.json 锚定样本库：AI 分类时参照 5 条标准和样本判断，稳定结果",
    "changed_by": "CaseBuilding + Reasonix 设计确认",
    "changes": {
      ".reasonix/skills/ai-classify-reviewer/SKILL.md": "新建 AI 分类审查 skill（5 条标准、锚定注入、审计输出）",
      "data/classification-anchors.json": "新建锚定样本库（19 个分类各 3 正例+1-2 反例）"
    }
  },
  {
    "date": "2026-06-08",
    "type": "docs",
    "reason": "全面修复文档与代码脱钩：发现 24 处脱钩并全部修复",
    "changed_by": "CaseBuilding 要求 + Reasonix 审查修复",
    "changes": {
      "docs/REQUIREMENTS.md": "§4 分类表 11→19，§5.1 项目数 370→1364，导航 4 列→6 列，§7.1 优先级表更新，§9 文件清单补充，§23/§24 更新",
      "docs/ARCHITECTURE.md": "全篇重写：项目结构图、数据流图（新增 locks/优先级链）、脚本职责（补充 4 个缺失脚本）、配置示例全部更新",
      "CLAUDE.md": "分类数 11→19，新增 5 个文件引用和锁定约定",
      "REASONIX.md": "测试数 29→57，新增 5 个命令和 4 个文件引用",
      "docs/SKILL-GUIDE.md": "测试数 29→57，新增 locks/anchors/skill 基础设施"
    }
  }
]