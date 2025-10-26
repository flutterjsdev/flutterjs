#!/usr/bin/env node

const { program } = require('commander');
const { build } = require('./commands/build');
const { serve } = require('./commands/serve');
const { run } = require('./commands/run');
const pkg = require('../package.json');

program
  .name('flutter-framework')
  .description('Flutter.js Framework CLI')
  .version(pkg.version);

// Build command
program
  .command('build')
  .description('Build the application for production')
  .option('-m, --mode <mode>', 'Build mode (dev/prod)', 'prod')
  .option('-o, --output <dir>', 'Output directory', 'build')
  .option('--minify', 'Minify output', true)
  .option('--obfuscate', 'Obfuscate code', true)
  .action(build);

// Serve command (dev server)
program
  .command('serve')
  .description('Start development server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('--hot', 'Enable hot reload', true)
  .action(serve);

// Run command
program
  .command('run')
  .description('Run the application')
  .option('-m, --mode <mode>', 'Run mode (dev/prod)', 'dev')
  .action(run);

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}