// build.js
import esbuild from 'esbuild';

esbuild
    .build({
        entryPoints: ['src/flutterjs_runtime.js'],        // or src/analyzer.js – your main file
        bundle: true,
        minify: true,
        platform: 'node',                     // THIS IS THE KEY LINE
        target: ['node14'],                   // or node16, node18, etc.
        outfile: 'dist/flutterjs_runtime.js',
        format: 'esm',                        // keeps import/export syntax
        sourcemap: true,
        external: ['fs', 'path'],             // don't bundle Node.js builtins
        // Optional: remove console.log in production
        // drop: ['console', 'debugger'],
    })
    .then(() => {
        console.log('Build successful: dist/flutterjs_runtime.js (Node.js tool)');
    })
    .catch((error) => {
        console.error('Build failed:', error);
        process.exit(1);
    });