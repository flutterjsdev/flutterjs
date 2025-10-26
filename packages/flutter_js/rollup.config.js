import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default [
  // UMD build (for browsers) - Development
  {
    input: 'src/index.js',
    output: {
      file: 'dist/flutter-framework.js',
      format: 'umd',
      name: 'FlutterJS',
      sourcemap: true,
    },
    plugins: [
      resolve(),
      commonjs(),
    ],
  },
  
  // UMD build (for browsers) - Production (Minified)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/flutter-framework.min.js',
      format: 'umd',
      name: 'FlutterJS',
      sourcemap: false,
    },
    plugins: [
      resolve(),
      commonjs(),
      terser({
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log'],
        },
        mangle: {
          toplevel: true,
        },
        format: {
          comments: false,
        },
      }),
    ],
  },
  
  // ES Module build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/flutter-framework.esm.js',
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      resolve(),
      commonjs(),
    ],
  },
];