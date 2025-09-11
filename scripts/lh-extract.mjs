import fs from "node:fs";
import path from "node:path";

const dir = "docs/baseline/lighthouse";
if (!fs.existsSync(dir)) { console.error("No lighthouse output at", dir); process.exit(1); }
const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
const rows = [];
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const lhr = j.lhr || j;
  const url = lhr.finalUrl || lhr.requestedUrl || f;
  const c = lhr.categories || {};
  rows.push({ url, perf: c.performance?.score ?? "", a11y: c.accessibility?.score ?? "", seo: c.seo?.score ?? "", pwa: c.pwa?.score ?? "" });
}
rows.sort((a,b)=> (a.url>b.url?1:-1));
const md = [
  "# Lighthouse Baseline Summary",
  "",
  "| URL | Performance | Accessibility | SEO | PWA |",
  "| --- | ---: | ---: | ---: | ---: |",
  ...rows.map(r=>`| ${r.url} | ${r.perf} | ${r.a11y} | ${r.seo} | ${r.pwa} |`)
].join("\n");
fs.writeFileSync("docs/baseline/lh-summary.md", md);
console.log("Wrote docs/baseline/lh-summary.md");
