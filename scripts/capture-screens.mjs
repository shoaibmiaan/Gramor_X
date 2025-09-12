import { chromium } from "playwright";
import fs from "node:fs";

const PAGES = [
  "/", "/pricing", "/auth/signin" // add more key routes
];
const viewports = [
  { name: "sm", width: 375, height: 812 },
  { name: "md", width: 768, height: 1024 },
  { name: "lg", width: 1280, height: 800 },
];

(async () => {
  const base = process.env.BASE_URL || "http://localhost:3000";
  if (!fs.existsSync("docs/baseline/screens")) {
    fs.mkdirSync("docs/baseline/screens", { recursive: true });
  }
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  for (const route of PAGES) {
    for (const vp of viewports) {
      await p.setViewportSize({ width: vp.width, height: vp.height });
      await p.goto(`${base}${route}`, { waitUntil: "networkidle" });
      const safe = route.replace(/[^\w-]/g, "_") || "home";
      const out = `docs/baseline/screens/${safe}_${vp.name}.png`;
      await p.screenshot({ path: out, fullPage: true });
      console.log("shot:", out);
    }
  }
  await browser.close();
})();
