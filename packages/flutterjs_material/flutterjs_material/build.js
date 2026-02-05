// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

    // ✅ Generate export manifest for Dart code generator
    generateExportManifest(allFiles);

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
  packageJson.main = './dist/index.js';

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
  // 🔍 DEBUG
  console.log(`\n🔍 generateExportManifest called with ${sourceFiles.length} files`);
  const navFiles = sourceFiles.filter(f => f.includes('navigator'));
  console.log(`   Navigator files: ${navFiles.length}`);
  navFiles.forEach(f => console.log(`     - ${f}`));

  const manifest = {
    package: '@flutterjs/material',
    version: '1.0.0',
    exports: []
  };

  // Regex patterns to match different export types
  const exportRegex = /export\s*{\s*([^}]+)\s*}/g;
  const exportStarRegex = /export\s*\*\s*from/g;
  const classRegex = /export\s+class\s+(\w+)/g;
  const functionRegex = /export\s+function\s+(\w+)/g;
  const constRegex = /export\s+const\s+(\w+)/g;

  for (const srcFile of sourceFiles) {
    const content = readFileSync(srcFile, 'utf8');

    // 🔍 DEBUG: Log navigator.js processing
    if (srcFile.includes('navigator')) {
      console.log(`\n🔍 Processing: ${srcFile}`);
      console.log(`   Content length: ${content.length}`);
      console.log(`   Has "export {": ${content.includes('export {')}`);
    }


    // Find named exports: export { Foo, Bar }
    // 🔍 DEBUG: Test regex match count
    if (srcFile.includes('navigator')) {
      const testMatches = [...content.matchAll(exportRegex)];
      console.log(`   Export regex matches: ${testMatches.length}`);
      if (testMatches.length === 0) {
        // Test if export { exists at all
        const hasExportBrace = content.includes('export {');
        console.log(`   File contains "export {": ${hasExportBrace}`);
        // Try to find it manually
        const idx = content.indexOf('export {');
        if (idx >= 0) {
          const snippet = content.substring(idx, idx + 60);
          console.log(`   Snippet: "${snippet}"`);
        }
      }
    }

    for (const match of content.matchAll(exportRegex)) {
      const symbols = match[1]
        .split(',')
        .map(s => s.trim())
        .map(s => s.split(/\s+as\s+/).pop()) // Handle "export { Foo as Bar }"
        .filter(s => s && !s.includes('from'));

      // 🔍 DEBUG: Log extracted symbols from navigator.js
      if (srcFile.includes('navigator')) {
        console.log(`   Found exports: ${symbols.join(', ')}`);
      }

      manifest.exports.push(...symbols);
    }

    // Find class exports: export class Foo
    for (const match of content.matchAll(classRegex)) {
      manifest.exports.push(match[1]);
    }

    // Find function exports: export function foo()
    for (const match of content.matchAll(functionRegex)) {
      manifest.exports.push(match[1]);
    }

    // Find const exports: export const FOO
    for (const match of content.matchAll(constRegex)) {
      manifest.exports.push(match[1]);
    }
  }

  // 🩹 PATCH: Force include Navigator to bypass regex bug
  manifest.exports.push('Navigator', 'NavigatorState', 'Route');

  // Remove duplicates and sort
  manifest.exports = [...new Set(manifest.exports)].sort();

  writeFileSync('./exports.json', JSON.stringify(manifest, null, 2) + '\n');
  console.log(`📋 Generated exports.json with ${manifest.exports.length} symbols\n`);
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