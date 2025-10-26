module.exports = {
  // Rendering mode: 'ssr' | 'csr' | 'hybrid'
  mode: 'csr',
  
  // Build configuration
  build: {
    output: 'dist',
    minify: true,
    obfuscate: true,
    sourcemap: false,
  },
  
  // Development server
  server: {
    port: 3000,
    host: 'localhost',
    open: false,
    hot: true,
  },
  
  // Optimization
  optimization: {
    splitChunks: true,
    treeshake: true,
  },
  
  // Assets configuration
  assets: {
    include: ['assets/**/*'],
    exclude: ['**/*.md', '**/.DS_Store'],
  },
};
