// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// build.js
import esbuild from 'esbuild';
import { readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';

// Define your source directory and output directory
const srcDir = 'src';
const outDir = 'dist';

// Get all .js files in src/ (recursively if you have subfolders, but you seem flat)
const entryPoints = readdirSync(srcDir)
    .filter(file => extname(file) === '.js')
    .map(file => join(srcDir, file));

// Build all files independently (no bundling between them)
esbuild
    .build({
        entryPoints,
        outdir: outDir,
        bundle: false,              // IMPORTANT: no bundling across files
        minify: true,
        platform: 'node',
        target: ['node18'],         // or node20 if you want latest features
        format: 'esm',
        sourcemap: true,
        // Keep original filenames: src/analyzer.js → dist/analyzer.js
        outExtension: { '.js': '.js' },
        
        // Optional: drop console.log/debugger in production
        // drop: ['console', 'debugger'],
    })
    .then(() => {
        console.log(`Build successful! ${entryPoints.length} files built to ${outDir}/`);
        console.log('Files:', entryPoints.map(p => basename(p)).join(', '));
    })
    .catch((error) => {
        console.error('Build failed:', error);
        process.exit(1);
    });