import fs from "node:fs";

// Inputs
const matrixPath = "docs/baseline/component-matrix.v1.json";
const out = "docs/planning/backlog.csv";

// Ensure header exists
if (!fs.existsSync(out)) {
  fs.writeFileSync(out, "Epic,MoSCoW,Route/Comp,KPI Linked,AC,DoD,Owner,Estimate,Deps,Phase-2-Ready\n");
}

// Helper
const add = (row) => fs.appendFileSync(out, row + "\n");

// Seed core epics first
add(`"Onboarding & Auth","Must","/auth/signin","Time-to-start mock ≤60s","User can sign in in ≤3 steps","No console errors; Axe 0 blockers; LH mobile ≥ baseline","", "3", "", "TRUE"`);
add(`"Pricing Clarity","Should","/pricing","View pricing after first mock %","Pricing visible, scannable; plan CTA works","No horizontal scroll @375px; Axe 0 criticals","", "2", "", "TRUE"`);
add(`"Mock Start Fast Path","Must","/ (home)","Time-to-start mock ≤60s","Primary CTA starts a mock in ≤60s on mobile","TTI ≤ baseline; LCP ≤ baseline","", "5", "", "TRUE"`);

// Pull from matrix if present
if (fs.existsSync(matrixPath)) {
  const rows = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
  const pages = rows.filter(r => r.type === "page");
  const ds = rows.filter(r => r.type === "ds");

  // Up to 15 pages
  pages.slice(0, 15).forEach(p => {
    const route = p.name_or_route || "";
    const comps = (p.components_used_guess || "").replaceAll(",", " +");
    add(`"Page Polish","Should","${route}","Mobile task success %","Fix layout/a11y/perf issues on this route","No Axe criticals; no 375px overflow; LH mobile not worse","", "1", "${comps}", "TRUE"`);
  });

  // A few DS items
  ds.slice(0, 10).forEach(c => {
    add(`"Design System Hygiene","Could","${c.name_or_route}","N/A","Replace raw hex/px with tokens","No raw hex/px; tokens-only utility classes","", "1", "", "TRUE"`);
  });
}
console.log("Seeded docs/planning/backlog.csv");
