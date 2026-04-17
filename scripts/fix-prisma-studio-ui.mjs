import fs from "node:fs";
import path from "node:path";

const target = path.join(
  process.cwd(),
  "node_modules",
  "@prisma",
  "studio-core",
  "dist",
  "ui",
  "index.js"
);

if (!fs.existsSync(target)) {
  console.log("[studio-fix] target not found, skipped:", target);
  process.exit(0);
}

let content = fs.readFileSync(target, "utf8");
const replacements = [
  [
    'from"@radix-ui/react-toggle"',
    'from"https://esm.sh/@radix-ui/react-toggle@1.1.10"',
  ],
  ['from"chart.js/auto"', 'from"https://esm.sh/chart.js@4.5.1/auto"'],
];

let changed = false;
for (const [from, to] of replacements) {
  if (content.includes(from)) {
    content = content.split(from).join(to);
    changed = true;
  }
}

if (!changed) {
  console.log("[studio-fix] already patched");
  process.exit(0);
}

fs.writeFileSync(target, content, "utf8");
console.log("[studio-fix] patched prisma studio ui imports");
