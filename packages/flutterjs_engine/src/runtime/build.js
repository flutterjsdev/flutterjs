import esbuild from 'esbuild';
import { readFileSync, writeFileSync, readdirSync, statSync, watch } from 'fs';
import { join, relative, extname } from 'path';

const srcDir = 'src';
const outDir = 'dist';

/**
 * ✅ Recursively find ALL .js files in src/
 */
function getAllJsFiles(dir) {
  const files = [];
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getAllJsFiles(fullPath));
    } else if (extname(item) === '.js') {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Build each .js file separately
 */
async function buildAllFiles() {
  try {
    console.log('🚀 Building @flutterjs/material...\n');

    // ✅ Find all .js files
    const allFiles = getAllJsFiles(srcDir);

    console.log(`📁 Found ${allFiles.length} files\n`);

    // ✅ Build each file separately
    for (const srcFile of allFiles) {
      const relativePath = relative(srcDir, srcFile);
      const outFile = join(outDir, relativePath);

      console.log(`📦 ${relativePath}`);

      await esbuild.build({
        entryPoints: [srcFile],
        outfile: outFile,
        bundle: false,
        minify: true,
        platform: 'browser',
        target: ['es2020'],
        format: 'esm',
        sourcemap: true,
      });
    }

    console.log();

    // ✅ Generate exports based on all built files
    generateExports(allFiles);

    console.log('✅ Build successful!\n');

  } catch (error) {
    console.error('❌ Build failed:', error.message);
  }
}

/**
 * Auto-generate package.json exports in the exact format requested
 * "./core/widget_element.js" → "./dist/core/widget_element.js"
 */
function generateExports(sourceFiles) {
  const packageJsonPath = './package.json';
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

  const exports = {};

  // Main entry point
  exports['.'] = './dist/index.js';

  // ✅ Create export for EVERY built file with exact format
  for (const srcFile of sourceFiles) {
    const relativePath = relative(srcDir, srcFile);

    // Skip index.js - it's already the main entry
    if (relativePath === 'index.js') {
      continue;
    }

    // Convert path with .js extension:
    // core.js → ./core.js
    // core/widget_element.js → ./core/widget_element.js
    // material.js → ./material.js
    // widgets/compoment/multi_child_view.js → ./widgets/compoment/multi_child_view.js

    // Normalize slashes for Windows
    const normalizedPath = relativePath.replace(/\\/g, '/');
    const exportKey = './' + normalizedPath.replaceAll(".js", "");
    const exportPath = './dist/' + normalizedPath;

    exports[exportKey] = exportPath;
  }

  // Update package.json
  packageJson.exports = exports;
  packageJson.main = './dist/runtime.js';

  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

  console.log('📝 Generated exports:\n');
  Object.entries(exports).forEach(([key, value]) => {
    console.log(`   "${key}": "${value}"`);
  });
  console.log();
}

/**
 * Watch mode - rebuild on file changes
 */
function watchMode() {
  console.log('👀 Watching for changes...\n');

  watch(srcDir, { recursive: true }, (eventType, filename) => {
    if (extname(filename) === '.js') {
      console.log(`\n⚡ ${filename} changed\n`);
      buildAllFiles();
    }
  });
}

// ✅ Check for --watch flag
const isWatchMode = process.argv.includes('--watch');

if (isWatchMode) {
  buildAllFiles().then(() => watchMode());
} else {
  buildAllFiles();
}