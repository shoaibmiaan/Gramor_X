import fs from "node:fs";
const out = "docs/planning/risks.csv";
if (!fs.existsSync(out)) {
  fs.writeFileSync(out, "Risk,Severity,Likelihood,Mitigation,Owner,Target Phase,Notes\n");
}
const add = (row) => fs.appendFileSync(out, row + "\n");

add(`"Mobile performance regressions","High","Medium","Lock LH floors; PR checklist; image budgets","", "Phase 2","Use lighthouserc floors"`);
add(`"A11y blockers slip to later","High","Medium","Axe sweep per PR; fail on criticals","", "Phase 2","Track violations trend"`);
add(`"Auth friction (OTP/email)","Medium","Medium","Shorten flows; cache error states","", "Phase 2","Measure time-to-sign-in"`);
add(`"Token drift (raw hex/px)","Medium","High","Tokens-only rule + lint","", "Phase 2","Add lint rule later"`);
add(`"Unclear pricing path","Medium","Medium","Above-the-fold CTA; link after mock","", "Phase 2","Heatmap later"`);
add(`"CI env differences (Node/Chrome)","Low","Medium","Pin LH Chrome via Playwright path","", "Phase 2","Already using CHROME_PATH"`);
console.log("Seeded docs/planning/risks.csv");
