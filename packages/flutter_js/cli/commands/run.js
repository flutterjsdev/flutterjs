const { build } = require('./build');
const { serve } = require('./serve');

async function run(options) {
  console.log('🏃 Running Flutter.js application...\n');
  
  // Build and serve
  await serve({ port: 3000, ...options });
}

module.exports = { run };