import fs from "node:fs";

const file = "docs/baseline/component-matrix.v1.enriched.json";
const rows = JSON.parse(fs.readFileSync(file, "utf8"));

function routeSlug(s){
  const base = s.startsWith("/")
    ? s.slice(1)
    : s.replace(/^pages\//,'').replace(/^app\//,'');
  const slug = base.replace(/\.(tsx|ts|jsx|js)$/,'').replace(/[^\w/-]/g,'');
  return slug === "" ? "home" : slug.replace(/\//g,'_');
}

const host = "gramorx.com";

for (const r of rows) {
  const slug = routeSlug(r.name_or_route || "");
  const screens = [
    `docs/baseline/screens/${slug}_sm.png`,
    `docs/baseline/screens/${slug}_md.png`,
    `docs/baseline/screens/${slug}_lg.png`,
  ];
  const axe = `docs/baseline/axe/${host.replace(/\W/g,'_')}_${slug}.json`;
  if (!r.evidence || r.evidence.length === 0) {
    r.evidence = [...screens, axe];
  }
}

fs.writeFileSync(file, JSON.stringify(rows, null, 2));
console.log("Evidence prefilled in", file);
