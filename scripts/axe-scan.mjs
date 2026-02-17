import fs from "node:fs";
import puppeteer from "puppeteer";
import axe from "axe-core";

const URLS = ["https://gramorx.com/", "https://gramorx.com/pricing"];
await fs.promises.mkdir("docs/baseline/axe", { recursive: true });

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage"]
});
const page = await browser.newPage();

for (const u of URLS) {
  await page.goto(u, { waitUntil: "networkidle0", timeout: 120000 });
  await page.addScriptTag({ content: axe.source });
  const results = await page.evaluate(async () => await axe.run({ resultTypes: ["violations"] }));
  const safe = u.replace(/https?:\/\/?/,'').replace(/\W/g,'_');
  fs.writeFileSync(`docs/baseline/axe/${safe}.json`, JSON.stringify(results, null, 2));
  console.log("axe:", u, "violations:", results.violations.length);
}

await browser.close();
