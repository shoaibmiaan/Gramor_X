// scripts/generate-review-dashboard.mjs
import fg from "fast-glob";
import fs from "fs-extra";
import path from "node:path";

/** ==== CONFIG ==== */
const REPO_ROOT = process.cwd();
const SITE_BASE = process.env.REVIEW_SITE_BASE || "https://gramorx.com"; // set to http://localhost:3000 for local
const OUTPUT = path.join(REPO_ROOT, "public/review/index.html");

// folders to scan for awareness (primary routes come from /pages, others are linked to nearest public route)
const SCAN_FOLDERS = [
  "pages/**/*.{js,jsx,ts,tsx,md,mdx}",
  "components/**/*.{js,jsx,ts,tsx}",
  "lib/**/*.{js,jsx,ts,tsx}",
  "data/**/*",
  "supabase/**/*",
  "hooks/**/*.{js,jsx,ts,tsx}",
];

// ignore some build and dot folders
const IGNORE = [
  "**/node_modules/**",
  ".next/**",
  "public/**",
  ".vercel/**",
  ".husky/**",
  ".git/**",
];

// <= 20 buckets (module -> area)
const BUCKETS = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
  vocab: "Vocabulary",
  vocabulary: "Vocabulary",
  "mock-tests": "Mock Tests",
  "study-plan": "Study Plan",
  challenge: "Gamification",
  leaderboard: "Gamification",
  mistakes: "Mistakes Book",
  coach: "AI Coach & Writing",
  ai: "AI Coach & Writing",
  predictor: "Recommender & Predictor",
  onboarding: "Teacher & Onboarding",
  teacher: "Teacher & Onboarding",
  admin: "Admin & Institutions",
  institutions: "Admin & Institutions",
  checkout: "Monetization",
  pricing: "Monetization",
  account: "Monetization",
  premium: "Platform",
  dashboard: "Platform",
  auth: "Auth",
  community: "Community & Blog",
  blog: "Community & Blog",
  placement: "Placement",
  "": "Platform",
  root: "Platform",
};

const BUCKET_AREA = {
  Reading: "Core Learning",
  Listening: "Core Learning",
  Writing: "Core Learning",
  Speaking: "Core Learning",
  Vocabulary: "Core Learning",
  "Mock Tests": "Practice & Assessment",
  "Study Plan": "Practice & Assessment",
  Gamification: "Practice & Assessment",
  "Mistakes Book": "Practice & Assessment",
  "AI Coach & Writing": "AI & Personalization",
  "Recommender & Predictor": "AI & Personalization",
  "Teacher & Onboarding": "Teacher & Admin",
  "Admin & Institutions": "Teacher & Admin",
  Monetization: "Monetization",
  Platform: "Platform & Mobile",
  Auth: "Platform & Mobile",
  "Community & Blog": "Engagement & Comms",
  Placement: "Practice & Assessment",
  "System & Errors": "Platform & Mobile",
};

const ROUTE_HINTS = {
  reading: "/reading",
  listening: "/listening",
  writing: "/writing",
  speaking: "/speaking",
  vocab: "/vocab",
  vocabulary: "/vocab",
  "mock-tests": "/mock-tests",
  "study-plan": "/study-plan",
  challenge: "/challenge",
  leaderboard: "/leaderboard",
  mistakes: "/mistakes",
  coach: "/coach",
  ai: "/ai/writing",
  predictor: "/predictor",
  onboarding: "/onboarding/teacher",
  teacher: "/teacher",
  admin: "/admin",
  institutions: "/institutions",
  checkout: "/checkout",
  pricing: "/pricing",
  account: "/account",
  premium: "/premium",
  dashboard: "/dashboard",
  auth: "/login",
  community: "/community",
  blog: "/blog",
  placement: "/placement",
};

/** ==== Helpers ==== */
function normalizeFromPages(p) {
  let rest = p.replace(/^pages\//, "/");
  rest = rest.replace(/\/index\.(t|j)sx?$/i, "/");
  rest = rest.replace(/\.(t|j)sx?$/i, "");
  if (!rest.startsWith("/")) rest = "/" + rest;
  return rest || "/";
}

function topSegment(route) {
  const seg = (route.split("/")[1] || "root");
  return seg;
}

function guessRouteForAnyPath(file) {
  let p = file.startsWith("/") ? file.slice(1) : file;
  // Explicit pages mapping
  if (p.startsWith("pages/")) return normalizeFromPages(p);

  // Try to infer by keyword
  const segs = p.split("/").filter(Boolean);
  const hit =
    segs.find((s) => ROUTE_HINTS[s]) ||
    Object.keys(ROUTE_HINTS).find((k) => ("/" + p).includes("/" + k + "/"));

  const hint = hit ? ROUTE_HINTS[hit] : "/";
  return hint.endsWith("/") && hint !== "/" ? hint.slice(0, -1) : hint;
}

function toSiteHref(file) {
  const route = guessRouteForAnyPath(file);
  return SITE_BASE.replace(/\/$/, "") + route;
}

function toRepoPath(file) {
  return "/" + file.replace(/^\/+/, "");
}

/** ==== Scan repo ==== */
const files = await fg(SCAN_FOLDERS, { cwd: REPO_ROOT, ignore: IGNORE, dot: false });

/** Build a big flat list of “pages” data the UI expects */
const flatPages = files.map((f) => {
  const display = path.basename(f).replace(/\.(t|j)sx?$/i, "");
  const name = display === "index" ? "Index" : display.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  const pathForUi = "/" + f; // keep original file path with leading slash for seed
  return {
    area: "Platform & Mobile",
    module: "Platform",
    tags: [],
    progress: 0,
    pages: [{ name, path: pathForUi, status: "todo" }],
  };
});

/** Group into ≤20 buckets */
const SYSTEM_RE = /^\/(404|500|403|_error|\+error|maintenance|health|status)(\b|$)/;

const groupedMap = new Map();

function ensureBucket(bucket, areaHint = "Platform & Mobile") {
  if (!groupedMap.has(bucket)) {
    groupedMap.set(bucket, {
      area: BUCKET_AREA[bucket] || areaHint,
      module: bucket,
      tags: [],
      progress: 0,
      pages: [],
    });
  }
  return groupedMap.get(bucket);
}

for (const f of files) {
  const uiPath = "/" + f;
  const seg = topSegment(guessRouteForAnyPath(f));
  const isSystem = SYSTEM_RE.test(uiPath);
  const bucketKey = isSystem ? "System & Errors" : (BUCKETS[seg] || "Platform");
  const bucket = ensureBucket(BUCKETS[seg] || (isSystem ? "System & Errors" : "Platform"));

  // Create page entry
  const display = path.basename(f).replace(/\.(t|j)sx?$/i, "");
  const name = display === "index" ? "Index" : display.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

  const page = { name, path: uiPath, status: "todo" };

  if (!bucket.pages.some((p) => p.path === page.path)) bucket.pages.push(page);
}

/** Compute progress */
const grouped = Array.from(groupedMap.values())
  .map((s) => {
    const total = s.pages.length || 1;
    const done = s.pages.filter((p) => p.status === "done").length;
    s.progress = Math.round((done / total) * 100);
    return s;
  })
  .sort((a, b) => a.module.localeCompare(b.module));

/** Build seed JSON the UI reads */
const seedJson = JSON.stringify(grouped, null, 2).replace(/<\/script>/g, "<\\/script>");

/** ==== HTML Template (single-file) ==== */
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Gramor X — Modules Review (Auto, ≤20 Modules)</title>
<style>
:root{ --bg:#0b0b10; --panel:#11121a; --muted:#9aa3af; --text:#e5e7eb;
  --accent:#7c3aed; --accent-2:#22d3ee; --ok:#22c55e; --warn:#f59e0b; --bad:#ef4444;
  --chip:#1f2937; --card:#0f172a; --border:#1f2937; }
*{box-sizing:border-box} html,body{height:100%}
body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Inter,Helvetica,Arial;
  background:linear-gradient(180deg,#0b0b10 0%, #0b0b10 60%, #0e121a 100%); color:var(--text);}
header{position:sticky;top:0;z-index:50;backdrop-filter:saturate(180%) blur(10px);
  background:rgba(11,11,16,.7);border-bottom:1px solid var(--border);}
.container{max-width:1200px;margin:0 auto;padding:16px}
.row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.row>*{flex:0 0 auto}
h1{font-size:20px;margin:0;font-weight:700;letter-spacing:.2px}
.muted{color:var(--muted)}
.pill{background:var(--chip);border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:999px;font-size:12px}
.search{flex:1 1 320px;display:flex;gap:8px}
.search input,.select{flex:1;background:var(--panel);border:1px solid var(--border);border-radius:10px;color:var(--text);padding:10px 12px;font-size:14px;outline:none;}
.select{appearance:none;min-width:180px;background-image:linear-gradient(45deg,transparent 50%,var(--muted) 50%),linear-gradient(135deg,var(--muted) 50%,transparent 50%);background-position:calc(100% - 18px) 16px, calc(100% - 12px) 16px;background-size:6px 6px;background-repeat:no-repeat;}
main{padding:24px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.card{background:linear-gradient(180deg,var(--card),#0b1020);border:1px solid var(--border);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;min-height:220px;}
.card header{background:transparent;border:none;padding:14px 14px 0}
.card h3{margin:0 0 4px 0;font-size:16px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0}
.tag{font-size:11px;padding:4px 8px;border-radius:999px;border:1px solid var(--border);background:var(--panel);color:var(--muted)}
.body{padding:10px 14px 14px;display:flex;flex-direction:column;gap:10px}
.pages{display:flex;flex-direction:column;gap:8px;max-height:260px;overflow:auto}
.page{display:flex;align-items:center;gap:10px;padding:8px;border:1px dashed var(--border);border-radius:10px;background:#0c1320}
.page .path{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;font-size:12px}
.status{margin-left:auto;display:flex;gap:8px;align-items:center}
.badge{font-size:10px;padding:2px 6px;border-radius:6px;border:1px solid var(--border);background:var(--chip)}
.badge.ok{color:#dcfce7;background:rgba(34,197,94,.12);border-color:rgba(34,197,94,.35)}
.badge.warn{color:#fff7ed;background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.35)}
.badge.bad{color:#fee2e2;background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.35)}
.progress{height:8px;background:var(--panel);border:1px solid var(--border);border-radius:999px;overflow:hidden}
.bar{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-2));width:0%}
.footer{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:auto;padding:12px 14px;border-top:1px solid var(--border)}
button{background:linear-gradient(180deg,var(--accent),#5b21b6);border:none;border-radius:10px;color:white;padding:10px 12px;font-weight:600;cursor:pointer;}
.ghost{background:transparent;border:1px solid var(--border);color:var(--text)}
.legend{display:flex;gap:10px;align-items:center}
.legend .key{display:flex;gap:6px;align-items:center;font-size:12px;color:var(--muted)}
.dot{width:10px;height:10px;border-radius:999px}
.okDot{background:var(--ok)} .warnDot{background:var(--warn)} .badDot{background:var(--bad)}
.toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.link{color:#93c5fd;text-decoration:none}
.tiny{font-size:11px}
.kbd{font:12px ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;background:#0b1320;border:1px solid var(--border);padding:2px 6px;border-radius:6px;color:#cbd5e1}
.count{font-weight:700}
.toast{position:fixed;bottom:16px;right:16px;background:#111827;border:1px solid var(--border);padding:10px 12px;border-radius:10px;display:none}
.controls{display:flex;gap:12px;align-items:center;margin:10px 0}
label.switch{display:flex;gap:8px;align-items:center;font-size:12px;color:var(--muted)}
.code-link{font-size:11px;margin-left:6px;opacity:.9}
</style>
</head>
<body>
<header>
  <div class="container">
    <div class="row">
      <h1>Gramor X • Modules Review</h1>
      <span class="pill">Auto-generated • ≤20 curated modules • site links</span>
      <div class="toolbar">
        <div class="legend">
          <div class="key"><span class="dot okDot"></span> Done</div>
          <div class="key"><span class="dot warnDot"></span> In Progress</div>
          <div class="key"><span class="dot badDot"></span> Not Started</div>
        </div>
      </div>
      <div class="search">
        <input id="q" placeholder="Search modules, pages, routes…" aria-label="Search content"/>
        <select id="status" class="select" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="done">Done</option>
          <option value="progress">In Progress</option>
          <option value="todo">Not Started</option>
        </select>
        <select id="area" class="select" aria-label="Filter by area">
          <option value="">All areas</option>
        </select>
      </div>
    </div>
  </div>
</header>

<main class="container">
  <div class="row" style="justify-content:space-between;margin-bottom:12px">
    <div class="muted tiny">Tip: Press <span class="kbd">/</span> to focus search • Your edits save to <strong>localStorage</strong>.</div>
    <div class="muted tiny">Items: <span id="counts" class="count">0</span></div>
  </div>
  <section id="cards" class="grid" aria-live="polite"></section>
</main>

<div class="container" style="padding-bottom:40px">
  <div class="row" style="justify-content:flex-end">
    <button class="ghost" id="export">Export JSON</button>
    <button id="reset">Reset to Defaults</button>
  </div>
</div>

<div id="toast" class="toast" role="status" aria-live="polite">Saved</div>

<script type="application/json" id="seed">
${seedJson}
</script>

<script>
const SITE_BASE = "${SITE_BASE}";
const GITHUB_BASE = "https://github.com/shoaibmiaan/Gramor_X/blob/main";

const KEY = "gx_review_dashboard_v1_grouped20_auto";
const cardsEl = document.getElementById("cards");
const qEl = document.getElementById("q");
const statusEl = document.getElementById("status");
const areaEl = document.getElementById("area");
const countsEl = document.getElementById("counts");

function toast(msg){ const t=document.getElementById("toast"); t.textContent=msg; t.style.display="block"; setTimeout(()=>t.style.display="none", 900); }
function save(data){ localStorage.setItem(KEY, JSON.stringify(data)); toast("Saved"); }
function computeProgress(section){ const total=section.pages.length||1; const done=section.pages.filter(p=>p.status==="done").length; return Math.round((done/total)*100); }
function label(v){ return v==="done" ? "Done" : v==="progress" ? "In Progress" : "Not Started"; }

function loadSeed(){
  try{ return JSON.parse(document.getElementById("seed").textContent.trim()); } catch { return []; }
}

const BUCKET_AREA = ${JSON.stringify(BUCKET_AREA, null, 2).replace(/</g,"\\u003c")};

function toRepoHref(file){
  const p = file.startsWith("/") ? file : ("/" + file);
  return GITHUB_BASE.replace(/\/$/,'') + p;
}

function guessRouteForAnyPath(file) {
  const ROUTE_HINTS = ${JSON.stringify(ROUTE_HINTS, null, 2).replace(/</g,"\\u003c")};
  let p = file.startsWith("/") ? file.slice(1) : file;
  if (p.startsWith("pages/")) {
    let rest = "/" + p.replace(/^pages\//,"");
    rest = rest.replace(/\\/index\\.(t|j)sx?$/i, "/");
    rest = rest.replace(/\\.(t|j)sx?$/i, "");
    if (!rest.startsWith("/")) rest = "/" + rest;
    return rest || "/";
  }
  const segs = p.split("/").filter(Boolean);
  const hit = segs.find((s) => ROUTE_HINTS[s]) || Object.keys(ROUTE_HINTS).find((k) => ("/" + p).includes("/" + k + "/"));
  const hint = hit ? ROUTE_HINTS[hit] : "/";
  return hint.endsWith("/") && hint !== "/" ? hint.slice(0, -1) : hint;
}

function toSiteHref(file){
  const route = guessRouteForAnyPath(file);
  return SITE_BASE.replace(/\\/$/,'') + route;
}

function computeCountsAndRender(state){
  const q = (qEl.value||"").toLowerCase().trim();
  const s = statusEl.value;
  const a = areaEl.value;
  cardsEl.innerHTML="";
  let shown=0;

  state.forEach((section, idx)=>{
    section.progress = computeProgress(section);

    let pages = section.pages
      .filter(p=> !s || (s==="progress" ? p.status==="progress" : p.status===s))
      .filter(p=> !q || (\`\${p.name} \${p.path}\`.toLowerCase().includes(q)));

    const sectionHit = (!q || section.area.toLowerCase().includes(q) || section.module.toLowerCase().includes(q));
    const areaHit = (!a || section.area===a);

    if((pages.length>0 || sectionHit) && areaHit){
      shown++;
      const card = document.createElement("article");
      card.className="card";

      const head = document.createElement("header");
      head.innerHTML = \`
        <h3>\${section.module}</h3>
        <div class="muted tiny">\${section.area}</div>
        <div class="tags">\${(section.tags||[]).map(t=>\`<span class="tag">\${t}</span>\`).join("")}</div>
      \`;
      card.appendChild(head);

      const body = document.createElement("div");
      body.className="body";
      const prog = document.createElement("div");
      prog.innerHTML = \`
        <div class="row" style="justify-content:space-between">
          <div class="muted tiny">Progress</div>
          <div class="tiny"><strong>\${section.progress}%</strong></div>
        </div>
        <div class="progress" aria-label="Progress \${section.progress}%"><div class="bar" style="width:\${section.progress}%"></div></div>
      \`;
      body.appendChild(prog);

      const list = document.createElement("div");
      list.className="pages";
      (pages.length ? pages : section.pages).forEach((p, i)=>{
        const row = document.createElement("div");
        row.className="page";
        const badgeCls = p.status==="done" ? "ok" : p.status==="progress" ? "warn" : "bad";

        const siteHref = toSiteHref(p.path);
        const repoHref = toRepoHref(p.path);

        row.innerHTML = \`
          <div>
            <div><strong>\${p.name}</strong></div>
            <a href="\${siteHref}" class="path muted tiny link" target="_blank" rel="noopener">\${p.path}</a>
            <a class="code-link link" href="\${repoHref}" target="_blank" rel="noopener">code ↗</a>
          </div>
          <div class="status">
            <span class="badge \${badgeCls}">\${label(p.status)}</span>
            <select data-idx="\${idx}" data-page="\${i}" class="select tiny" style="min-width:130px">
              \${["todo","progress","done"].map(v=>\`<option value="\${v}" \${p.status===v?"selected":""}>\${label(v)}</option>\`).join("")}
            </select>
          </div>
        \`;
        list.appendChild(row);
      });

      body.appendChild(list);
      card.appendChild(body);

      const foot = document.createElement("div");
      foot.className="footer";
      foot.innerHTML = \`<span class="muted tiny">\${section.pages.length} items</span>\`;
      card.appendChild(foot);

      cardsEl.appendChild(card);
    }
  });

  countsEl.textContent = shown;
}

function init(){
  let state = loadSeed();

  const areas = ["", ...Array.from(new Set(state.map(s=>s.area)))].sort();
  areaEl.innerHTML = "";
  areas.forEach(a=>{
    const opt=document.createElement("option");
    opt.value=a; opt.textContent=a||"All areas"; areaEl.appendChild(opt);
  });

  computeCountsAndRender(state);

  document.addEventListener("change", (e)=>{
    if(e.target && e.target.matches("select.select.tiny")){
      const idx = +e.target.getAttribute("data-idx");
      const p = +e.target.getAttribute("data-page");
      const val = e.target.value;
      state[idx].pages[p].status = val;
      state[idx].progress = computeProgress(state[idx]);
      save(state);
      computeCountsAndRender(state);
    }
  });
  document.getElementById("q").addEventListener("input", ()=>computeCountsAndRender(state));
  document.getElementById("status").addEventListener("change", ()=>computeCountsAndRender(state));
  document.getElementById("area").addEventListener("change", ()=>computeCountsAndRender(state));
  document.addEventListener("keydown",(e)=>{ if(e.key==="/"){ e.preventDefault(); document.getElementById("q").focus(); } });

  document.getElementById("export").addEventListener("click", ()=>{
    const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "routes_grouped20.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("reset").addEventListener("click", ()=>{
    if(confirm("Reset dashboard to current repo scan? Your local changes will be lost.")){
      localStorage.removeItem(KEY);
      location.reload();
    }
  });
}
init();
</script>
</body>
</html>`;

/** ==== Write file ==== */
await fs.ensureDir(path.dirname(OUTPUT));
await fs.writeFile(OUTPUT, html, "utf8");

console.log(`✅ Review dashboard generated at: ${OUTPUT}`);
