// Syntax-checks every .gs file and the inline <script> blocks in .html files.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = path.join(__dirname, '..', 'src');
let failed = 0;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
}

function check(code, label) {
  try {
    new vm.Script(code, { filename: label });
  } catch (err) {
    failed++;
    console.error(`FAIL ${label}: ${err.message}`);
  }
}

for (const file of walk(src)) {
  const rel = path.relative(src, file);
  const text = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.gs')) check(text, rel);
  if (file.endsWith('.json')) {
    try { JSON.parse(text); } catch (err) { failed++; console.error(`FAIL ${rel}: ${err.message}`); }
  }
  if (file.endsWith('.html')) {
    const scripts = [...text.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    scripts.forEach((m, i) => {
      if (/<\?/.test(m[1])) { failed++; console.error(`FAIL ${rel}: scriptlet inside <script> #${i}`); }
      check(m[1], `${rel}#script${i}`);
    });
    const opens = (text.match(/<\?/g) || []).length;
    const closes = (text.match(/\?>/g) || []).length;
    if (opens !== closes) { failed++; console.error(`FAIL ${rel}: unbalanced scriptlets`); }
  }
}

if (failed) process.exit(1);
console.log('Syntax OK');
