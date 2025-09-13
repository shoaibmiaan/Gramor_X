import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

/** 1) Ensure styles/globals.css imports tokens */
const stylesDir = path.join(root, "styles");
if (!fs.existsSync(stylesDir)) fs.mkdirSync(stylesDir, { recursive: true });
const globals = path.join(stylesDir, "globals.css");
let g = fs.existsSync(globals) ? fs.readFileSync(globals, "utf8") : "";
const importLine = "@import \"../tokens/tokens.css\";";
if (!g.includes(importLine)) {
  g = `${importLine}\n${g}`;
  fs.writeFileSync(globals, g);
  console.log("✔ Added tokens import to styles/globals.css");
} else {
  console.log("• tokens import already present in styles/globals.css");
}

/** 2) Create or patch tailwind.config.js */
const tw = path.join(root, "tailwind.config.js");
let contents;
if (!fs.existsSync(tw)) {
  contents = `module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: { extend: {} },
  plugins: []
};`;
  fs.writeFileSync(tw, contents);
  console.log("✔ Created tailwind.config.js");
} else {
  contents = fs.readFileSync(tw, "utf8");
}

function ensureExtendBlock(src) {
  if (!/theme\s*:\s*{[\s\S]*?}/.test(src)) {
    src = src.replace(/module\.exports\s*=\s*{/, `module.exports = {\n  theme: { extend: {} },`);
  }
  if (!/extend\s*:\s*{/.test(src)) {
    src = src.replace(/theme\s*:\s*{/, `theme: {\n    extend: {}`);
  }
  return src;
}

let patched = ensureExtendBlock(contents);

// inject mappings if missing
const wanted = `
      colors: {
        bg: "var(--bg)",
        card: "var(--card)",
        text: "var(--text)",
        primary: "var(--primary)",
        accent: "var(--accent)",
        border: "var(--border)"
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        "2xl": "var(--radius-2xl)"
      },
      boxShadow: {
        sm: "var(--shadow-1)",
        md: "var(--shadow-2)"
      },
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        6: "var(--space-6)",
        8: "var(--space-8)"
      }`;

if (!patched.includes('colors: {') || !patched.includes('bg: "var(--bg)"')) {
  patched = patched.replace(/extend\s*:\s*{/, `extend: {${wanted},`);
}

if (patched !== contents) {
  fs.writeFileSync(tw, patched);
  console.log("✔ Patched tailwind.config.js with token mappings");
} else {
  console.log("• tailwind.config.js already has token mappings");
}
