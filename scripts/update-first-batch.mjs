import fs from "node:fs";

const file = "docs/baseline/component-matrix.v1.enriched.json";
const rows = JSON.parse(fs.readFileSync(file, "utf8"));

const updates = {
  "pages/403.tsx": {           // error/forbidden page: usually layout/copy polish
    severity: "P2",
    fix_type: "layout",
    owner: "Ali",
    due_window: "Phase-2 W3",
  },
  "pages/_app.tsx": {          // framework/internal
    internal: true,
    severity: "",
    fix_type: "",
    owner: "",
    due_window: "",
  },
  "pages/_document.tsx": {     // framework/internal
    internal: true,
    severity: "",
    fix_type: "",
    owner: "",
    due_window: "",
  }
};

for (const r of rows) {
  const u = updates[r.name_or_route];
  if (u) Object.assign(r, u);
}

fs.writeFileSync(file, JSON.stringify(rows, null, 2));
console.log("Updated first-batch rows in", file);
