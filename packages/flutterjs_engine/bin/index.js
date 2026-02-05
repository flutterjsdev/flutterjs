// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#!/usr/bin/env node

/**
 * ============================================================================
 * FlutterJS CLI - Main Entry Point
 * ============================================================================
 * 
 * Unified CLI with all commands integrated with BuildPipeline
 * Commands: init, build, dev, run, clean, preview, analyze, doctor
 * 
 * Location: cli/index.js or bin/flutterjs
 */

import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
// Import unified commands
import {
  init,
  build,
  dev,
  run,
  clean,
  preview,
  analyze,
  doctor,
} from '../src/index.js';


const __dirname = path.dirname(fileURLToPath(import.meta.url));



// ============================================================================
// VERSION & METADATA
// ============================================================================

function getVersion() {
  try {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

const VERSION = getVersion();

// ============================================================================
// PROJECT CONTEXT LOADER
// ============================================================================

async function loadProjectContext(configPath) {
  const projectRoot = process.cwd();

  // Try to load flutterjs.config.js
  const finalConfigPath = configPath
    ? path.resolve(configPath)
    : path.join(projectRoot, 'flutterjs.config.js');

  let config = {};

  if (fs.existsSync(finalConfigPath)) {
    try {
      // Dynamic import for ES modules
      // Convert path to file URL for Windows compatibility
      const configUrl = path.isAbsolute(finalConfigPath)
        ? 'file://' + finalConfigPath
        : 'file://' + path.resolve(finalConfigPath);

      const module = await import(configUrl);
      config = module.default || module;
    } catch (error) {
      console.warn(
        chalk.yellow(`⚠️  Could not load config: ${error.message}`)
      );
    }
  }

  return {
    projectRoot,
    configPath: finalConfigPath,
    config,
  };
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

function handleError(error, options) {
  console.error(chalk.red('\n❌ Error:'), error.message);

  if (options.verbose || options.debug) {
    console.error(chalk.gray('\n📋 Stack trace:'));
    console.error(chalk.gray(error.stack));
  }

  console.log(chalk.blue('\n💡 Troubleshooting tips:'));
  console.log(chalk.gray('  • Run with --verbose for detailed logs'));
  console.log(chalk.gray('  • Run "flutterjs doctor" to check environment'));
  console.log(chalk.gray('  • Check docs: https://flutterjs.dev/docs'));
  console.log();

  process.exit(1);
}

// ============================================================================
// CLI PROGRAM SETUP
// ============================================================================

const program = new Command();

program
  .name('flutterjs')
  .description('🚀 FlutterJS CLI - Build web apps with Flutter-like syntax')
  .version(VERSION, '-v, --version')
  .helpOption('-h, --help');

// Global options
program
  .option('--verbose', 'Verbose output with detailed logs')
  .option('--debug', 'Debug mode with extra diagnostics')
  .option('--config <path>', 'Custom config file path')
  .option('--no-color', 'Disable colored output');

// ============================================================================
// COMMAND: INIT
// ============================================================================

program
  .command('init <project-name>')
  .alias('create')
  .description('Create a new FlutterJS project')
  .option('-t, --template <template>', 'Project template (default|counter|todo)', 'default')
  .option('--material', 'Use Material Design widgets')
  .option('--cupertino', 'Use Cupertino (iOS) design')
  .option('--typescript', 'Use TypeScript')
  .option('--git', 'Initialize git repository', true)
  .option('--no-git', 'Skip git initialization')
  .option('--install', 'Install dependencies', true)
  .option('--no-install', 'Skip dependency installation')
  .action(async (projectName, options) => {
    try {
      const globalOpts = program.opts();
      await init(projectName, { ...options, ...globalOpts });
    } catch (error) {
      handleError(error, program.opts());
    }
  });

// ============================================================================
// COMMAND: BUILD
// ============================================================================

program
  .command('build')
  .description('Build for production')
  .option('-t, --target <target>', 'Build target (spa|ssr|hybrid|static)', 'spa')
  .option('-o, --output <path>', 'Output directory', 'dist')
  .option('--analyze', 'Analyze bundle size and dependencies')
  .option('--sourcemap', 'Generate source maps')
  .option('--minify', 'Minify output', true)
  .option('--no-minify', 'Disable minification')
  .option('--to-js', 'Generate JavaScript output only (internal use)')
  .action(async (options) => {
    try {
      const globalOpts = program.opts();
      const projectContext = await loadProjectContext(globalOpts.config);
      await build({ ...options, ...globalOpts }, projectContext);
      process.exit(0);
    } catch (error) {
      handleError(error, program.opts());
    }
  });

// ============================================================================
// COMMAND: DEV
// ============================================================================

program
  .command('dev')
  .description('Start development server with hot reload')
  .option('-p, --port <port>', 'Development server port', '3000')
  .option('--host <host>', 'Server host', 'localhost')
  .option('--https', 'Use HTTPS')
  .option('--open', 'Open browser automatically')
  .option('--hmr', 'Enable Hot Module Replacement', true)
  .option('--no-hmr', 'Disable Hot Module Replacement')
  .action(async (options) => {
    try {
      const globalOpts = program.opts();
      const projectContext = await loadProjectContext(globalOpts.config);
      await dev({ ...options, ...globalOpts }, projectContext);
    } catch (error) {
      handleError(error, program.opts());
    }
  });

// ============================================================================
// COMMAND: RUN
// ============================================================================

program
  .command('run')
  .description('Run app (build + serve)')
  .option('-p, --port <port>', 'Server port', '3000')
  .option('-m, --mode <mode>', 'Build mode (dev|production)', 'dev')
  .option('-o, --output <path>', 'Output directory', '.dev')
  .option('-t, --target <target>', 'Build target', 'spa')
  .option('--open', 'Open browser automatically')
  .option('--serve', 'Start server', true)
  .option('--no-serve', 'Build only, no server')
  .action(async (options) => {
    try {
      const globalOpts = program.opts();
      const projectContext = await loadProjectContext(globalOpts.config);
      await run({ ...options, ...globalOpts }, projectContext);
    } catch (error) {
      handleError(error, program.opts());
    }
  });

// ============================================================================
// COMMAND: PREVIEW
// ============================================================================

program
  .command('preview')
  .alias('serve')
  .description('Preview production build')
  .option('-p, --port <port>', 'Server port', '4173')
  .option('-o, --output <path>', 'Build directory to serve', 'dist')
  .option('--open', 'Open browser automatically')
  .action(async (options) => {
    try {
      const globalOpts = program.opts();
      const projectContext = await loadProjectContext(globalOpts.config);
      await preview({ ...options, ...globalOpts }, projectContext);
    } catch (error) {
      handleError(error, program.opts());
    }
  });

// ============================================================================
// COMMAND: ANALYZE
// ============================================================================

program
  .command('analyze')
  .description('Analyze code and generate report')
  .option('-o, --output <file>', 'Output file for report')
  .option('--phase <phase>', 'Analysis phase (1|2|3)', '3')
  .action(async (options) => {
    try {
      const globalOpts = program.opts();
      const projectContext = await loadProjectContext(globalOpts.config);
      await analyze({ ...options, ...globalOpts }, projectContext);
    } catch (error) {
      handleError(error, program.opts());
    }
  });

// ============================================================================
// COMMAND: CLEAN
// ============================================================================

program
  .command('clean')
  .description('Clean build artifacts and caches')
  .option('--all', 'Remove all including node_modules')
  .option('--cache', 'Remove build cache only')
  .action(async (options) => {
    try {
      const globalOpts = program.opts();
      const projectContext = await loadProjectContext(globalOpts.config);
      await clean({ ...options, ...globalOpts }, projectContext);
    } catch (error) {
      handleError(error, program.opts());
    }
  });

// ============================================================================
// COMMAND: DOCTOR
// ============================================================================

program
  .command('doctor')
  .description('Check environment and dependencies')
  .option('--fix', 'Attempt to fix issues automatically')
  .action(async (options) => {
    try {
      const globalOpts = program.opts();
      const projectContext = await loadProjectContext(globalOpts.config);
      await doctor({ ...options, ...globalOpts }, projectContext);
    } catch (error) {
      handleError(error, program.opts());
    }
  });

// ============================================================================
// SIGNAL HANDLERS
// ============================================================================

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 Shutting down gracefully...\n'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n\n👋 Shutting down gracefully...\n'));
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n💥 Uncaught Exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('\n💥 Unhandled Rejection:'), reason);
  process.exit(1);
});

// ============================================================================
// PARSE & EXECUTE
// ============================================================================

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
  console.log();
  console.log(chalk.blue('📚 Examples:\n'));
  console.log(chalk.gray('  Create a new project:'));
  console.log(chalk.cyan('    flutterjs init my-app\n'));
  console.log(chalk.gray('  Start development server:'));
  console.log(chalk.cyan('    flutterjs dev\n'));
  console.log(chalk.gray('  Build for production:'));
  console.log(chalk.cyan('    flutterjs build\n'));
  console.log(chalk.gray('  Run build + server:'));
  console.log(chalk.cyan('    flutterjs run\n'));
  console.log(chalk.gray('  Check environment:'));
  console.log(chalk.cyan('    flutterjs doctor\n'));
  console.log(chalk.gray('  Analyze code:'));
  console.log(chalk.cyan('    flutterjs analyze\n'));
}

// ============================================================================
// EXPORTS (for testing)
// ============================================================================

export { program, loadProjectContext, handleError };
export default program;