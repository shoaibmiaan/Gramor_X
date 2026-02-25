// scripts/enrich-matrix.mjs
import fs from "node:fs";

const inFile = "docs/baseline/component-matrix.v1.json";
const outFile = "docs/baseline/component-matrix.v1.enriched.json";

const rows = JSON.parse(fs.readFileSync(inFile, "utf8"));

const enriched = rows.map(r => ({
  ...r,
  severity: r.severity ?? "",        // P1 | P2 | P3
  fix_type: r.fix_type ?? "",        // tokens | layout | a11y | content | perf
  owner: r.owner ?? "",              // e.g., "Ali"
  due_window: r.due_window ?? "",    // e.g., "Phase-2 W3" or "W1-D5"
  evidence: r.evidence ?? []         // array of links/paths
}));

fs.writeFileSync(outFile, JSON.stringify(enriched, null, 2));
console.log("Wrote", outFile);
