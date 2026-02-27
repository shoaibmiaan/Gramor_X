#!/usr/bin/env node
import fg from "fast-glob";
import { promises as fs } from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const pagesDir = path.join(repoRoot, "pages");
const outputDir = path.join(repoRoot, "public", "review");
const outFile = path.join(outputDir, "gramorx_all_routes_seed.json");

// Map a file under /pages to a URL (Pages Router)
function fileToRoute(filePath) {
  const rel = filePath.replace(pagesDir + path.sep, "");
  const base = rel.replace(/\.(tsx|ts|jsx|js)$/, "");

  // Skip special pages files
  const name = path.basename(base);
  if (["_app", "_document", "_error"].includes(name)) return null;

  // Remove trailing /index
  let route = base.replace(/\/index$/, "");
  if (route === "index") route = "";

  // Convert dynamic segments: [id] -> :id ; [...slug] -> :slug+ ; [[...slug]] -> :slug*
  route = route
    .replace(/\[\[\.\.\.(.*?)\]\]/g, (_, p) => `:${p}*`)
    .replace(/\[\.\.\.(.*?)\]/g, (_, p) => `:${p}+`)
    .replace(/\[(.*?)]/g, (_, p) => `:${p}`);

  return "/" + route.replace(/\\/g, "/");
}

function titleCase(s) {
  return s
    .replace(/^\//, "")
    .split("/")
    .pop() || "Home";
}

const areaMap = {
  reading: "Core Learning",
  listening: "Core Learning",
  writing: "Core Learning",
  speaking: "Core Learning",
  vocab: "Core Learning",
  vocabulary: "Core Learning",
  mock: "Practice & Assessment",
  "study-plan": "Practice & Assessment",
  challenge: "Practice & Assessment",
  leaderboard: "Practice & Assessment",
  mistakes: "Practice & Assessment",
  coach: "AI & Personalization",
  ai: "AI & Personalization",
  predictor: "AI & Personalization",
  teacher: "Teacher & Admin",
  onboarding: "Teacher & Admin",
  admin: "Teacher & Admin",
  institutions: "Teacher & Admin",
  checkout: "Monetization",
  account: "Monetization",
  pricing: "Monetization",
  premium: "Monetization",
  dashboard: "Platform & Mobile",
  auth: "Platform & Mobile",
  community: "Engagement & Comms",
  placement: "Practice & Assessment",
  blog: "Engagement & Comms",
  "": "Core Learning",
  root: "Core Learning",
};

function moduleNameFromTop(top) {
  if (!top) return "Home";
  return top
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

(async () => {
  const files = await fg(["pages/**/*.{js,jsx,ts,tsx}", "!pages/api/**"], {
    dot: false,
    cwd: repoRoot,
  });

  const routes = new Set();
  for (const f of files) {
    const abs = path.join(repoRoot, f);
    const r = fileToRoute(abs);
    if (r !== null) routes.add(r);
  }

  const all = Array.from(routes).sort();

  // Group by top-level segment
  const groups = {};
  for (const r of all) {
    const seg = r.split("/")[1] || "";
    const top = seg || "root";
    groups[top] ??= [];
    groups[top].push(r);
  }

  const seed = Object.keys(groups)
    .sort()
    .map((top) => {
      const items = groups[top];
      const area = areaMap[top] || "Platform & Mobile";
      const module = moduleNameFromTop(top === "root" ? "" : top);

      const pages = items
        .sort()
        .map((p) => {
          let name = p.replace(/\/$/, "") || "/";
          name = titleCase(name);
          if (/:/.test(p.split("/").pop() || "")) {
            // mark param pages
            name = name.replace(/^:/, "") + " (param)";
          }
          return { name, path: p, status: "todo" };
        });

      return { area, module, tags: [], progress: 0, pages };
    });

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(seed, null, 2), "utf8");
  console.log(`✅ Wrote ${all.length} routes → ${path.relative(repoRoot, outFile)}`);
})();
