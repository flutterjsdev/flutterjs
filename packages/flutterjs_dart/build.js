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
        console.log('🚀 Building @flutterjs/dart...\n');

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

        // ✅ Generate export manifest for Dart code generator
        generateExportManifest(allFiles);

        console.log('✅ Build successful!\n');

    } catch (error) {
        console.error('❌ Build failed:', error.message);
    }
}

/**
 * Auto-generate package.json exports in the exact format requested
 */
function generateExports(sourceFiles) {
    const packageJsonPath = './package.json';
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    const exports = {};

    // Main entry point
    exports['.'] = './dist/index.js';

    for (const srcFile of sourceFiles) {
        const relativePath = relative(srcDir, srcFile);

        // Skip index.js - it's already the main entry
        if (relativePath === 'index.js') {
            continue;
        }

        // Convert path with .js extension:
        // math/index.js -> ./math/index.js (normalized)

        // Normalize slashes for Windows
        const normalizedPath = relativePath.replace(/\\/g, '/');

        // For submodules like math/index.js, we want to expose them as:
        // "./math": "./dist/math/index.js"
        // And also potentially specific files if needed.

        // If filename is index.js, export the parent directory name
        if (normalizedPath.endsWith('/index.js')) {
            const dirName = normalizedPath.replace('/index.js', '');
            const exportKey = './' + dirName;
            const exportPath = './dist/' + normalizedPath;
            exports[exportKey] = exportPath;
        } else {
            // Normal file
            const exportKey = './' + normalizedPath.replace(/\.js$/, ''); // Ensure only last .js is removed
            const exportPath = './dist/' + normalizedPath;
            exports[exportKey] = exportPath;
        }
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
// Maps src sub-directory name → dart: library URI
const dartLibUriMap = {
    'core':       'dart:core',
    'async':      'dart:async',
    'collection': 'dart:collection',
    'convert':    'dart:convert',
    'math':       'dart:math',
    'typed_data': 'dart:typed_data',
    'html':       'dart:html',
};

function generateExportManifest(sourceFiles) {
    const manifest = {
        package: '@flutterjs/dart',
        version: '1.0.0',
        exports: []
    };

    // Regex patterns to match different export types
    const exportRegex = /export\s*{\s*([^}]+)\s*}/g;
    const classRegex = /export\s+class\s+(\w+)/g;
    const functionRegex = /export\s+function\s+(\w+)/g;
    const constRegex = /export\s+const\s+(\w+)/g;

    const seen = new Set();

    for (const srcFile of sourceFiles) {
        const content = readFileSync(srcFile, 'utf8');

        // Derive dart: URI from the source file path (e.g. src/core/index.js -> dart:core)
        const relPath = relative(srcDir, srcFile).replace(/\\/g, '/');
        const subDir = relPath.split('/')[0];
        const dartUri = dartLibUriMap[subDir] || 'dart:core';
        // Corresponding dist path (e.g. src/core/index.js -> ./dist/core/index.js)
        const distPath = './' + outDir + '/' + relPath;

        const addSymbol = (name) => {
            name = name.trim();
            if (!name || name === 'default' || name.startsWith('_') || seen.has(name)) return;
            seen.add(name);
            manifest.exports.push({ name, path: distPath, uri: dartUri, type: 'class' });
        };

        // Find named exports: export { Foo, Bar } or export { Foo as Bar }
        for (const match of content.matchAll(exportRegex)) {
            match[1].split(',')
                .map(s => s.trim().split(/\s+as\s+/).pop())
                .filter(s => s && !s.includes('from'))
                .forEach(addSymbol);
        }

        // Find class exports: export class Foo
        for (const match of content.matchAll(classRegex)) addSymbol(match[1]);

        // Find function exports: export function foo()
        for (const match of content.matchAll(functionRegex)) addSymbol(match[1]);

        // Find const exports: export const FOO
        for (const match of content.matchAll(constRegex)) addSymbol(match[1]);
    }

    // Sort by name for readability
    manifest.exports.sort((a, b) => a.name.localeCompare(b.name));

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
