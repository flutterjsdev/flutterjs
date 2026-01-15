import esbuild from 'esbuild';
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, extname, basename, relative } from 'path';


const srcDir = 'src';
const outDir = 'dist';

// Get all .js files in src/ (non-recursive — add glob if you have subfolders later)
const entryPoints = readdirSync(srcDir)
  .filter(file => extname(file) === '.js')
  .map(file => join(srcDir, file));

esbuild
  .build({
    entryPoints,
    outdir: outDir,
    bundle: false,              // Keep false — we want independent files
    minify: true,
    platform: 'node',
    target: ['node18'],
    format: 'esm',
    sourcemap: true,
    // REMOVED: external — not allowed with bundle: false
    // If you later need to exclude Node builtins, they are automatically external anyway!
  })
  .then(() => {
    console.log(`Build successful! ${entryPoints.length} files built to ${outDir}/`);
    console.log('Built files:', entryPoints.map(p => basename(p)).join(', '));

    // 🎁 NEW: Generate exports.json
    generateExportManifest(entryPoints);

  })

  .catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
  });

/**
 * Scan all source files and generate exports.json manifest
 */
function generateExportManifest(sourceFiles) {
  const manifest = {
    package: '@flutterjs/vdom',
    version: JSON.parse(readFileSync('./package.json', 'utf8')).version,
    exports: []
  };

  const regex = /export\s+(?:class|function|const|var|let|enum)\s+([a-zA-Z0-9_$]+)/g;
  const aliasRegex = /export\s*{\s*([^}]+)\s*}/;

  for (const file of sourceFiles) {
    const content = readFileSync(file, 'utf8');
    const relativePath = relative(srcDir, file).replace(/\\/g, '/');
    const importPath = `./dist/${relativePath}`;

    // Match named exports
    let match;
    while ((match = regex.exec(content)) !== null) {
      manifest.exports.push({
        name: match[1],
        path: importPath,
        type: 'class' // simplified
      });
    }

    // Match alias exports
    const aliasMatch = content.match(aliasRegex);
    if (aliasMatch) {
      const exportsList = aliasMatch[1].split(',');
      for (const exp of exportsList) {
        const parts = exp.trim().split(/\s+as\s+/);
        const name = parts.length > 1 ? parts[1] : parts[0];
        manifest.exports.push({
          name: name,
          path: importPath,
          type: 'alias'
        });
      }
    }
  }

  writeFileSync('exports.json', JSON.stringify(manifest, null, 2));
  console.log(`📋 Generated exports.json with ${manifest.exports.length} symbols`);
}
