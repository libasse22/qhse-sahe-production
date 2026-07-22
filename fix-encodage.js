const fs = require("fs");
const path = require("path");

function walk(dir, exts, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, files);
    else if (exts.includes(path.extname(entry.name))) files.push(full);
  }
  return files;
}

const dirs = ["app", "components", "lib"];
const exts = [".ts", ".tsx"];
let files = [];
for (const d of dirs) files = files.concat(walk(d, exts));

const pattern = /Ã©|Ã¨|Ã |Ã´|Ã¹|Ã»|Ã§|â€™|â€œ|â€\x9d|Ã‰|ðŸ/;
let fixedCount = 0;

for (const file of files) {
  const original = fs.readFileSync(file, "utf8");
  if (!pattern.test(original)) continue;
  const fixed = Buffer.from(original, "latin1").toString("utf8");
  fs.writeFileSync(file, fixed, "utf8");
  fixedCount++;
  console.log("Corrige :", file);
}
console.log("Total corrige :", fixedCount);
