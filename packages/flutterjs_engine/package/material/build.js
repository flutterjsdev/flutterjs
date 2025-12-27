// build.js
import esbuild from 'esbuild';
import { writeFileSync } from 'fs';
import { join } from 'path';

const outDir = 'dist';

/**
 * Define your entry points
 * Each entry point becomes a separate bundle
 */
const entryPoints = {
  // Main entry - exports everything
  'index': './src/index.js',
  
  // Core widgets
  'core': './src/core/index.js',
  
  // Material widgets
  'material': './src/material/index.js',
  
  // Other components
  'widgets': './src/widgets/index.js',
};

/**
 * Build each entry point
 */
async function build() {
  try {
    console.log('Building @flutterjs/material...\n');

    for (const [name, entry] of Object.entries(entryPoints)) {
      console.log(`Building: ${name} (${entry})`);
      
      await esbuild.build({
        entryPoints: [entry],
        outfile: `${outDir}/${name}.js`,
        bundle: false,              // Keep false - independent files
        minify: true,
        platform: 'browser',
        target: ['es2020'],
        format: 'esm',
        sourcemap: true,
      });
      
      console.log(`  ✓ ${outDir}/${name}.js\n`);
    }

    console.log('✅ Build successful!');
    console.log(`Built ${Object.keys(entryPoints).length} bundles to ${outDir}/`);

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();