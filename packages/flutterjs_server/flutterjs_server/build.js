// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import esbuild from 'esbuild';
import { existsSync, watch } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcDir = 'src';
const outDir = 'dist';

/**
 * Compile Dart files from lib/ to src/
 */
async function compileDartToJS() {
  const packageRoot = join(__dirname, '..');
  const libDir = join(packageRoot, 'lib');

  if (!existsSync(libDir)) {
    console.log('⚠️  No lib/ directory found, skipping Dart compilation\n');
    return;
  }

  console.log('📚 Compiling Dart files from lib/...\n');

  try {
    execSync(
      `dart run ../../../tool/build_package.dart ${packageRoot}`,
      { stdio: 'inherit', cwd: __dirname }
    );
    console.log('✅ Dart compilation complete\n');
  } catch (error) {
    console.error('❌ Dart compilation failed:', error.message);
    process.exit(1);
  }
}

async function build() {
  try {
    console.log('🚀 Building @flutterjs/server...\n');

    // ✅ STAGE 1: Compile Dart lib/ → src/
    await compileDartToJS();

    // ✅ STAGE 2: Bundle runtime.js → dist/index.js
    // runtime.js is the permanent hand-written entry point.
    // Dart-compiled types land in src/ (annotations, request, response, context).
    await esbuild.build({
      entryPoints: ['runtime.js'],
      outfile:     join(outDir, 'index.js'),
      bundle:      true,
      minify:      false,
      platform:    'node',
      target:      ['node18'],
      format:      'esm',
      sourcemap:   true,
      external:    ['node:http', 'node:url', 'node:fs', 'node:path', 'node:crypto'],
    });

    console.log('✅ Build successful!\n');
    console.log('   Output: dist/index.js');
    console.log('   Usage:  import { FlutterjsServer, Response } from \'@flutterjs/server\'\n');

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

function watchMode() {
  console.log('👀 Watching src/ for changes...\n');
  watch(srcDir, { recursive: true }, (_, filename) => {
    if (filename?.endsWith('.js')) {
      console.log(`\n⚡ ${filename} changed — rebuilding...\n`);
      build();
    }
  });
}

const isWatch = process.argv.includes('--watch');
if (isWatch) {
  build().then(() => watchMode());
} else {
  build();
}
