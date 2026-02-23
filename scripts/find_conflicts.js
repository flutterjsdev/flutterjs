// Find export name conflicts across src/*.js files
const fs = require('fs');
const path = require('path');

function findConflicts(srcDir) {
  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.js') && f !== 'index.js');
  const map = {};
  for (const f of files) {
    const content = fs.readFileSync(path.join(srcDir, f), 'utf8');
    for (const m of content.matchAll(/^export\s+(?:(?:default\s+)?class|function|const|let|var|async\s+function)\s+(\w+)/gm)) {
      const name = m[1];
      if (!map[name]) map[name] = [];
      map[name].push(f);
    }
  }
  const conflicts = Object.entries(map).filter(([, fl]) => fl.length > 1);
  return conflicts;
}

const packages = [
  'packages/flutterjs_foundation/flutterjs_foundation/src',
  'packages/flutterjs_services/flutterjs_services/src',
];

for (const pkg of packages) {
  console.log(`\n=== ${pkg} ===`);
  const conflicts = findConflicts(pkg);
  if (conflicts.length === 0) {
    console.log('  No conflicts.');
  } else {
    for (const [name, files] of conflicts) {
      console.log(`  CONFLICT: ${name} -> ${files.join(', ')}`);
    }
  }
}
