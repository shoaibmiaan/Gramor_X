import fs from "node:fs";
import path from "node:path";

const shotsDir = "docs/baseline/screens";
const out = "docs/baseline/README.md";
if (!fs.existsSync(shotsDir)) {
  console.error("No screenshots found in", shotsDir);
  process.exit(1);
}
const files = fs.readdirSync(shotsDir)
  .filter(f => f.endsWith(".png"))
  .sort();

const rows = files.map(f => {
  // {route}_{vp}.png  where route of "/" became "_" in the script
  const base = path.basename(f, ".png");
  const m = base.match(/^(.*)_(sm|md|lg)$/);
  const routeSafe = m ? m[1] : base;
  const vp = m ? m[2] : "";
  const route = routeSafe === "home" || routeSafe === "_" ? "/" : routeSafe.replace(/_/g, "/");
  return { file: f, route, vp };
});

const routes = [...new Set(rows.map(r => r.route))];

let md = `# Baseline — Screens (3 breakpoints)

> Auto-generated. Do not edit by hand. Re-run \`npm run screens:readme\` after recapturing.

## Routes
`;
for (const r of routes) {
  md += `\n### ${r}\n\n`;
  const group = rows.filter(x => x.route === r);
  // write a row of images
  md += group.map(g => `![${g.route} ${g.vp}](./screens/${g.file})`).join(" ");
  md += "\n";
}

fs.writeFileSync(out, md);
console.log("Wrote", out);
