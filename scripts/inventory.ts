// scripts/inventory.ts
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PAGES_DIRS = ["pages", "app"]; // support either
const DS_DIR = "design-system";

function listFiles(dir: string, exts = [".tsx", ".ts", ".jsx", ".js"]) {
  const out: string[] = [];
  function walk(d: string) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (exts.includes(path.extname(f))) out.push(p);
    }
  }
  walk(dir);
  return out;
}

const pagesDirs = PAGES_DIRS
  .map(d => path.join(ROOT, d))
  .filter(p => fs.existsSync(p));

const pageFiles = pagesDirs.flatMap(d => listFiles(d));
const dsFiles = fs.existsSync(path.join(ROOT, DS_DIR))
  ? listFiles(path.join(ROOT, DS_DIR))
  : [];

const rows: any[] = [];

for (const f of pageFiles) {
  const src = fs.readFileSync(f, "utf8");
  const rel = path.relative(ROOT, f);
  const comps = Array.from(src.matchAll(/<([A-Z][A-Za-z0-9]+)/g)).map(m => m[1]);
  rows.push({
    type: "page",
    name_or_route: rel,
    components_used_guess: Array.from(new Set(comps)).slice(0, 20).join(", ")
  });
}
for (const f of dsFiles) {
  const rel = path.relative(ROOT, f);
  rows.push({ type: "ds", name_or_route: rel, components_used_guess: "" });
}

fs.writeFileSync("docs/baseline/component-matrix.v1.json", JSON.stringify(rows, null, 2));
console.log("Wrote docs/baseline/component-matrix.v1.json");
