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
    console.log('🚀 Building @flutterjs/seo...\n');

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
        minify: false, // Disabled for debugging
        platform: 'browser',
        target: ['es2020'],
        format: 'esm',
        sourcemap: true,
      });
    }

    console.log();

    // ✅ Generate exports based on all built files
    generateExports(allFiles);

    // 🎁 NEW: Generate exports.json for Dart analyzer
    generateExportManifest(allFiles);

    console.log('✅ Build successful!\n');

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
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
  packageJson.main = './dist/seo.js';

  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

  console.log('📝 Generated exports:\n');
  Object.entries(exports).forEach(([key, value]) => {
    console.log(`   "${key}": "${value}"`);
  });
  console.log();
}

/**
 * Scan all source files and generate exports.json manifest
 * This manifest tells the Dart code generator what symbols this package exports
 */
function generateExportManifest(sourceFiles) {
  const manifest = {
    package: '@flutterjs/seo',
    version: JSON.parse(readFileSync('./package.json', 'utf8')).version,
    exports: []
  };

  const regex = /export\s+(?:class|function|const|var|let|enum)\s+([a-zA-Z0-9_$]+)/g;
  const aliasRegex = /export\s*{\s*([^}]+)\s*}/;

  for (const file of sourceFiles) {
    const content = readFileSync(file, 'utf8');
    const relativePath = relative(srcDir, file).replace(/\\/g, '/');
    const importPath = `./dist/${relativePath}`;

    // Match named exports: export class Foo
    let match;
    while ((match = regex.exec(content)) !== null) {
      manifest.exports.push({
        name: match[1],
        path: importPath,
        type: 'class' // simplified
      });
    }

    // Match alias exports: export { Foo, Bar as Baz }
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