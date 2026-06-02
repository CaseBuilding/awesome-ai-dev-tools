/**
 * generate-site.js
 *
 * 读取 classified.json 生成独立的 Web UI 页面（web-ui/index.html）。
 * 页面包含搜索、筛选、分类浏览、本周新增、深色模式等功能。
 * 所有 CSS/JS 内联，单文件无外部依赖。
 *
 * 输出: web-ui/index.html
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
const categories = categoriesConfig.categories;

let cnCache = {};
try {
  cnCache = JSON.parse(
    fs.readFileSync(path.join(ROOT, "data", "chinese_descriptions.json"), "utf-8")
  );
} catch { /* 无缓存 */ }

let firstSeenData = {};
try {
  firstSeenData = JSON.parse(
    fs.readFileSync(path.join(ROOT, "data", "first_seen.json"), "utf-8")
  );
} catch { /* 无记录 */ }

// ── 7 天新增判断（与 generate-readme.js 一致） ──
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const repoLastUpdated = reposData.last_updated?.slice(0, 10) || "";

function isNewRepo(fullName) {
  const data = firstSeenData;
  const lu = repoLastUpdated;
  const seen = data[fullName];
  const baseline = data._baseline;
  if (!seen || !baseline || seen === baseline) return false;
  if (!lu) return false;
  const diff = new Date(lu) - new Date(seen);
  if (diff < 0) return false;
  return diff <= SEVEN_DAYS_MS;
}

// ── 构建数据结构 ──
const langs = new Set();
const siteData = categories.map((cat) => {
  const repos = classifiedData.classified[cat.id] || [];
  const items = repos.map((r) => {
    const cn = cnCache[r.full_name] || "";
    if (r.language) langs.add(r.language);
    return {
      n: r.full_name,
      s: r.stars,
      l: r.language || "",
      d: r.description || "",
      c: cn,
      u: r.html_url,
      f: r._confidence === "high",
      _new: isNewRepo(r.full_name),
    };
  });
  return {
    id: cat.id,
    name: cat.name,
    order: cat.order || 99,
    repos: items,
  };
});

// 按 order 排序
siteData.sort((a, b) => a.order - b.order);

const totalCount = reposData.repos?.length || 0;
const allRepos = siteData.flatMap((c) => c.repos);
const totalNew = allRepos.filter((r) => r._new).length;
const langList = [...langs].sort();

const jsonData = JSON.stringify({
  categories: siteData,
  stats: { total: totalCount, newCount: totalNew },
  langs: langList,
  lastUpdated: repoLastUpdated,
});

// ── HTML 模板 ──
function buildHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Awesome AI Dev Tools</title>
<style>
:root{--bg:#f0f2f5;--surface:#fff;--surface-hover:#f8f9fb;--text:#1a1a2e;--text-secondary:#475569;--text-muted:#94a3b8;--border:#e2e8f0;--primary:#6c5ce7;--primary-light:#a29bfe;--primary-bg:#f0eeff;--shadow:0 1px 3px rgba(0,0,0,.06);--shadow-hover:0 4px 12px rgba(0,0,0,.08);--radius:12px;--radius-sm:8px;--t:.2s ease;--new:#10b981}
@media(prefers-color-scheme:dark){:root{--bg:#0f0f1a;--surface:#1a1a2e;--surface-hover:#222240;--text:#e2e8f0;--text-secondary:#94a3b8;--text-muted:#64748b;--border:#2d2d4a;--primary-bg:#1a1a3e;--shadow:0 1px 3px rgba(0,0,0,.2);--shadow-hover:0 4px 16px rgba(0,0,0,.3)}}
[data-theme=dark]{--bg:#0f0f1a;--surface:#1a1a2e;--surface-hover:#222240;--text:#e2e8f0;--text-secondary:#94a3b8;--text-muted:#64748b;--border:#2d2d4a;--primary-bg:#1a1a3e;--shadow:0 1px 3px rgba(0,0,0,.2);--shadow-hover:0 4px 16px rgba(0,0,0,.3)}
[data-theme=light]{--bg:#f0f2f5;--surface:#fff;--surface-hover:#f8f9fb;--text:#1a1a2e;--text-secondary:#64748b;--text-muted:#94a3b8;--border:#e2e8f0;--primary:#6c5ce7;--primary-light:#a29bfe;--primary-bg:#f0eeff;--shadow:0 1px 3px rgba(0,0,0,.06);--shadow-hover:0 4px 12px rgba(0,0,0,.08)}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans SC",system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.5;padding:0;transition:background var(--t),color var(--t);-webkit-font-smoothing:antialiased}
.container{max-width:1040px;margin:0 auto;padding:24px 16px}
.theme-toggle{position:fixed;top:16px;right:16px;z-index:100;width:40px;height:40px;border-radius:50%;border:1px solid var(--border);background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:var(--shadow);transition:all var(--t)}.theme-toggle:hover{box-shadow:var(--shadow-hover);transform:scale(1.05)}
.header{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#1a1a3e 100%);color:#fff;border-radius:var(--radius);padding:32px 36px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;position:relative;overflow:hidden}
.header::after{content:"";position:absolute;top:-60%;right:-20%;width:400px;height:400px;background:radial-gradient(circle,rgba(108,92,231,.12) 0%,transparent 70%);pointer-events:none}
.header h1{font-size:22px;font-weight:700;position:relative;z-index:1}.header h1 span{color:var(--primary-light)}
.header .sub{font-size:13px;color:rgba(255,255,255,.45);margin-top:2px;position:relative;z-index:1}
.header .stats{display:flex;gap:28px;position:relative;z-index:1}
.header .stat{text-align:center}
.header .stat .num{font-size:26px;font-weight:700;background:linear-gradient(135deg,#a29bfe,#6c5ce7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.header .stat .label{font-size:11px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.8px;margin-top:1px}
.controls{background:var(--surface);border-radius:var(--radius);padding:16px 20px;margin-bottom:12px;box-shadow:var(--shadow);display:flex;gap:10px;flex-wrap:wrap;align-items:center;transition:background var(--t),box-shadow var(--t)}
.search-box{flex:1;min-width:160px;padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;background:var(--bg);color:var(--text);outline:none;transition:all var(--t)}.search-box:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-bg)}.search-box::placeholder{color:var(--text-muted)}
.filter-select{padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:13px;background:var(--bg);color:var(--text);cursor:pointer;outline:none;transition:all var(--t);min-width:100px}.filter-select:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-bg)}
.result-meta{font-size:13px;color:var(--text-muted);margin-left:auto;white-space:nowrap}
.pills{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch}
.pills .pill{padding:6px 14px;border-radius:20px;font-size:13px;font-weight:500;background:var(--surface);border:1.5px solid var(--border);color:var(--text-secondary);cursor:pointer;transition:all var(--t);user-select:none;white-space:nowrap;box-shadow:var(--shadow)}
.pills .pill:hover{border-color:var(--primary);color:var(--primary)}
.pills .pill.active{background:var(--primary);color:#fff;border-color:var(--primary)}
.pills .pill .count{display:inline-block;margin-left:4px;font-size:11px;font-weight:600;opacity:.65}
.pills .pill.active .count{opacity:.8}
.category{background:var(--surface);border-radius:var(--radius);margin-bottom:10px;box-shadow:var(--shadow);overflow:hidden;transition:background var(--t),box-shadow var(--t)}
.category-header{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;cursor:pointer;transition:background .15s;user-select:none;-webkit-tap-highlight-color:transparent}
.category-header:hover{background:var(--surface-hover)}
.category-header .left{display:flex;align-items:center;gap:10px}
.category-header .left .name{font-weight:600;font-size:15px}
.category-header .left .badge{background:var(--primary-bg);color:var(--primary);font-size:12px;font-weight:700;padding:1px 10px;border-radius:10px}
.category-header .arrow{transition:transform .3s cubic-bezier(.4,0,.2,1);font-size:14px;color:var(--text-muted)}
.category-header .arrow.open{transform:rotate(180deg)}
.category-body{padding:0 20px 16px;display:none}
.category-body.open{display:block}
.section-title{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--text-muted);margin:10px 0 10px;display:flex;align-items:center;gap:8px}
.section-title::after{content:"";flex:1;height:1px;background:var(--border)}
.project{padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border);margin-bottom:6px;transition:all var(--t);animation:fadeIn .3s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
.project:hover{border-color:var(--primary-light);box-shadow:0 2px 8px rgba(108,92,231,.08)}
.project .top{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.project .top .left{display:flex;align-items:center;gap:6px;min-width:0}
.project .top .left .rank{font-size:13px;font-weight:700;min-width:24px;flex-shrink:0}
.project .top .left .name-wrap{min-width:0}
.project .top .left .name-wrap .name{font-weight:600;font-size:14px;color:var(--text);text-decoration:none;transition:color var(--t)}
.project .top .left .name-wrap .name:hover{color:var(--primary)}
.project .top .left .name-wrap .lang{font-size:12px;color:var(--text-muted);margin-left:4px}
.project .top .stars{display:flex;align-items:center;gap:3px;font-size:13px;font-weight:600;color:var(--text-secondary);flex-shrink:0}
.project .top .stars svg{width:14px;height:14px;fill:#f59e0b}
.project .desc{font-size:13px;color:var(--text-secondary);margin-top:5px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.project .desc.cn{color:var(--text);font-weight:450}
.cat-tag{display:inline-block;font-size:11px;background:var(--primary-bg);color:var(--primary);padding:0 7px;border-radius:4px;margin-left:6px;font-weight:500;white-space:nowrap}
.new-badge{display:inline-block;background:var(--new);color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:1px 6px;border-radius:3px;margin-left:4px;letter-spacing:.3px;vertical-align:middle}
.empty-state{text-align:center;padding:60px 20px;color:var(--text-muted)}.empty-state .icon{font-size:48px;margin-bottom:8px}.empty-state p{font-size:14px}
.new-section{border-left:3px solid var(--new)}
@media(max-width:640px){.container{padding:12px 8px}.header{padding:20px 16px;flex-direction:column;text-align:center}.header .stats{gap:20px}.controls{padding:12px 14px}.search-box{min-width:120px}.result-meta{width:100%;text-align:right;margin-top:4px}.category-body{padding:0 14px 12px}.project{padding:10px 12px}.project .top{flex-direction:column;align-items:flex-start;gap:4px}}
</style>
</head>
<body>
<div class="container" id="app">
<button class="theme-toggle" id="themeToggle" title="切换主题">🌙</button>
<div class="header">
<div><h1><span>✦</span> Awesome AI Dev Tools</h1><div class="sub">热门 AI 开发者工具合集 · <span id="totalLabel">0</span> 个项目 · 每周自动更新</div></div>
<div class="stats">
<div class="stat"><div class="num" id="totalCount">0</div><div class="label">项目</div></div>
<div class="stat"><div class="num" id="catCount">0</div><div class="label">分类</div></div>
<div class="stat" id="newStat"><div class="num" id="newCount">0</div><div class="label">本周新</div></div>
</div>
</div>
<div class="controls">
<input class="search-box" id="search" type="text" placeholder="🔍 搜索项目名、描述..." oninput="filter()">
<select class="filter-select" id="langFilter" onchange="filter()"><option value="">所有语言</option></select>
<select class="filter-select" id="sortBy" onchange="filter()"><option value="stars">⭐ Stars 降序</option><option value="name">📄 名称 A-Z</option></select>
<span class="result-meta" id="resultMeta">共 <strong>0</strong> 个项目</span>
</div>
<div class="pills" id="pills"></div>
<div id="results"></div>
<div class="empty-state" id="empty" style="display:none"><div class="icon">🔍</div><p>没有匹配的项目，试试调整搜索条件</p></div>
</div>
<script>const DATA = ${jsonData};
// ── Init ──
const fmt=s=>s>=1000?(s/1000).toFixed(1).replace(/\\.0$/,"")+"K":s;
let active=null, allData=[];
DATA.categories.forEach(c=>c.repos.forEach(r=>allData.push({...r,catId:c.id,catName:c.name})));
const allLang=[...new Set(allData.map(r=>r.l).filter(Boolean))].sort();
const el=(t,c,h)=>{const e=document.createElement(t);e.className=c;e.innerHTML=h;return e};
function init(){
  document.getElementById("totalCount").textContent=DATA.stats.total;
  document.getElementById("totalLabel").textContent=DATA.stats.total;
  document.getElementById("catCount").textContent=DATA.categories.length;
  document.getElementById("newCount").textContent=DATA.stats.newCount;
  if(DATA.stats.newCount<1)document.getElementById("newStat").style.display="none";
  const langSel=document.getElementById("langFilter");
  allLang.forEach(l=>{const o=document.createElement("option");o.value=l;o.textContent=l;langSel.appendChild(o)});
  const pills=document.getElementById("pills");
  const allP=el("span","pill active","🏠 全部");
  allP.onclick=()=>{active=null;pills.querySelectorAll(".pill").forEach(p=>p.classList.remove("active"));allP.classList.add("active");filter()};
  pills.appendChild(allP);
  const newP=el("span","pill","🆕 本周新增");
  newP.onclick=()=>{active="__new__";pills.querySelectorAll(".pill").forEach(p=>p.classList.remove("active"));newP.classList.add("active");filter()};
  pills.appendChild(newP);
  DATA.categories.forEach(c=>{
    const p=el("span","pill",c.name+' <span class="count">'+c.repos.length+'</span>');
    p.onclick=()=>{active=c.id;pills.querySelectorAll(".pill").forEach(x=>x.classList.remove("active"));p.classList.add("active");filter()};
    pills.appendChild(p)
  });
  const saved=localStorage.getItem("theme");
  if(saved)document.documentElement.setAttribute("data-theme",saved);
  else document.documentElement.setAttribute("data-theme",window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light");
  document.getElementById("themeToggle").textContent=document.documentElement.getAttribute("data-theme")==="dark"?"☀️":"🌙";
  document.getElementById("themeToggle").onclick=()=>{
    const cur=document.documentElement.getAttribute("data-theme"),next=cur==="dark"?"light":"dark";
    document.documentElement.setAttribute("data-theme",next);localStorage.setItem("theme",next);
    document.getElementById("themeToggle").textContent=next==="dark"?"☀️":"🌙"
  };
  filter()
}
function card(r,catName){
  const em=r.f?["🥇","🥈","🥉","#4","#5","#6","#7","#8","#9","#10"][allData.filter(x=>x.catId===r.catId&&x.f).sort((a,b)=>b.s-a.s).findIndex(x=>x.n===r.n)]||"":"";
  const stars=fmt(r.s), nb=r._new?'<span class="new-badge">🆕 new</span>':"", ct=catName?'<span class="cat-tag">'+catName.replace(/^[^\\s]+\\s/,"")+"</span>":"";
  return '<div class="project" style="animation-delay:'+(Math.random()*.1)+'s"><div class="top"><div class="left">'+
    (em?'<span class="rank">'+em+"</span>":"")+
    '<div class="name-wrap"><a class="name" href="'+(r.u||"https://github.com/"+r.n)+'" target="_blank" rel="noopener">'+r.n+nb+ct+"</a>"+
    (r.l?'<span class="lang">· '+r.l+"</span>":"")+"</div></div>"+
    '<div class="stars"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'+stars+"</div></div>"+
    (r.c?'<div class="desc cn">🌏 '+r.c+"</div>":"")+
    (r.d?'<div class="desc">📝 '+r.d.slice(0,120)+"</div>":"")+"</div>"
}
function filter(){
  const q=document.getElementById("search").value.toLowerCase().trim(),lang=document.getElementById("langFilter").value,
        sort=document.getElementById("sortBy").value,results=document.getElementById("results"),empty=document.getElementById("empty");
  let html="",total=0,newProjects=[];
  const filteredRepos=allData.filter(r=>{
    if(active==="__new__"&&!r._new)return false;
    if(lang&&r.l!==lang)return false;
    if(q&&![r.n,r.d,r.c].some(t=>(t||"").toLowerCase().includes(q)))return false;
    return true
  });
  DATA.categories.forEach(cat=>{
    if(active&&active!=="__new__"&&cat.id!==active)return;
    let repos=filteredRepos.filter(r=>r.catId===cat.id);
    if(active==="__new__")return;
    if(!repos.length)return;total+=repos.length;
    if(!q&&!lang)repos.filter(r=>r._new).forEach(r=>newProjects.push({...r,catName:cat.name,catId:cat.id}));
    const feats=repos.filter(r=>r.f),rest=repos.filter(r=>!r.f);
    if(sort==="name"){feats.sort((a,b)=>a.n.localeCompare(b.n));rest.sort((a,b)=>a.n.localeCompare(b.n))}
    else{feats.sort((a,b)=>b.s-a.s);rest.sort((a,b)=>b.s-a.s)}
    html+='<div class="category"><div class="category-header" onclick="this.nextElementSibling.classList.toggle(\'open\');this.querySelector(\'.arrow\').classList.toggle(\'open\')">'+
      '<div class="left"><span class="name">'+cat.name+'</span><span class="badge">'+repos.length+"</span></div>"+
      '<span class="arrow open">▾</span></div><div class="category-body open">';
    if(feats.length)html+='<div class="section-title">⭐ 精选推荐</div>'+feats.map(r=>card(r)).join("");
    if(rest.length){
      if(feats.length)html+='<div class="section-title" style="margin-top:14px">📋 全部（'+rest.length+"）</div>";
      html+=rest.map(r=>card(r)).join("")
    }
    html+="</div></div>"
  });
  if(active==="__new__"){
    let byCat={};
    DATA.categories.forEach(cat=>{
      const items=filteredRepos.filter(r=>r.catId===cat.id);
      if(items.length)byCat[cat.id]={name:cat.name,repos:items}
    });
    const keys=DATA.categories.map(c=>c.id).filter(id=>byCat[id]);
    total=keys.reduce((s,id)=>s+byCat[id].repos.length,0);
    if(total){html='<div class="category"><div class="category-header" style="cursor:default;pointer-events:none">'+
      '<div class="left"><span class="name">🆕 本周新增</span><span class="badge">'+total+"</span></div></div><div class=\"category-body open\">";
      keys.forEach(id=>{
        const g=byCat[id];let items=[...g.repos];
        if(sort==="name")items.sort((a,b)=>a.n.localeCompare(b.n));else items.sort((a,b)=>b.s-a.s);
        html+='<div class="section-title">'+g.name+"</div>"+items.map(r=>card(r,g.name)).join("")
      });
      html+="</div></div>"
    }
  }
  if(!active&&!q&&!lang&&newProjects.length){
    const topNew=newProjects.sort((a,b)=>b.s-a.s).slice(0,8);
    let nh="",last="";
    topNew.forEach(r=>{
      if(r.catName!==last){nh+='<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin:6px 0 4px 2px">'+r.catName+"</div>";last=r.catName}
      nh+=card(r,r.catName)
    });
    if(newProjects.length>8)nh+='<div style="text-align:center;font-size:13px;color:var(--text-muted);margin-top:4px">⋯ 还有 '+(newProjects.length-8)+' 个，点击上方「🆕 本周新增」查看全部</div>';
    html='<div class="category new-section"><div class="category-header" onclick="this.nextElementSibling.classList.toggle(\'open\');this.querySelector(\'.arrow\').classList.toggle(\'open\')">'+
      '<div class="left"><span class="name">🆕 本周新增</span><span class="badge">'+newProjects.length+"</span></div>"+
      '<span class="arrow open">▾</span></div><div class="category-body open">'+nh+"</div></div>"+html
  }
  results.innerHTML=html;empty.style.display=total?"none":"block";
  document.getElementById("resultMeta").innerHTML="共 <strong>"+total+"</strong> 个项目"
}
init();
</script>
</body>
</html>`;
}

// ── 写入 ──
const outputDir = path.join(ROOT, "web-ui");
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "index.html"), buildHtml(), "utf-8");
console.log(`✅ web-ui/index.html 已生成 (${siteData.length} 个分类, ${allRepos.length} 个项目)`);
