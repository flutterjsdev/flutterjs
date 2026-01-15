// build.js
import esbuild from 'esbuild';
import { readdirSync } from 'fs';
import { join, extname, basename } from 'path';

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
  })
  .catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
  });