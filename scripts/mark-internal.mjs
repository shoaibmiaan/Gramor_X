import fs from "node:fs";

const file = "docs/baseline/component-matrix.v1.enriched.json";
const rows = JSON.parse(fs.readFileSync(file, "utf8"));

const INTERNAL_PATTERNS = [
  /^pages\/_(app|document|error)\.(t|j)sx?$/,
  /^pages\/api\//,
  /^app\/(layout|template)\.(t|j)sx?$/,
];

function isInternal(path){
  return INTERNAL_PATTERNS.some(rx => rx.test(path || ""));
}

for (const r of rows) {
  if (isInternal(r.name_or_route)) {
    r.internal = true;        // new helper flag
    // keep severity/fix fields empty on internal items
    r.severity ||= "";
    r.fix_type ||= "";
    r.owner ||= "";
    r.due_window ||= "";
  } else {
    r.internal = r.internal ?? false;
  }
}

fs.writeFileSync(file, JSON.stringify(rows, null, 2));
console.log("Internal flags applied in", file);
