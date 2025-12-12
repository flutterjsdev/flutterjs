#!/usr/bin/env node

/**
 * ============================================================================
 * FlutterJS CLI Entry Point - Enhanced with ProjectLoader
 * ============================================================================
 * 
 * This file:
 * 1. Parses CLI arguments
 * 2. Loads project configuration (if not 'init' command)
 * 3. Routes to appropriate command handler
 * 4. Provides global context to all commands
 * 
 * Location: bin/index.js or index.js (in CLI root)
 */

const path = require('path');
const { init } = require('./commands/init');
const { dev } = require('./commands/dev');
const { build } = require('./commands/build');
const { preview } = require('./commands/preview');
const { run } = require('./commands/run');

// Import ProjectLoader
const { ProjectLoader } = require('./project-loader');

// ============================================================================
// PARSING & UTILITIES
// ============================================================================

/**
 * Parse command-line options
 * Supports: --key value, --key, -k value, -k
 */
function parseOptions(args) {
  const options = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      // Long option: --key or --key=value or --key value
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        // --key=value format
        const key = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);
        options[key] = value;
      } else {
        // --key value or --key format
        const key = arg.slice(2);
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          options[key] = nextArg;
          i++;
        } else {
          options[key] = true;
        }
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      // Short option: -k or -k value
      const key = arg.slice(1);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        options[key] = nextArg;
        i++;
      } else {
        options[key] = true;
      }
    }
  }

  return options;
}

/**
 * Normalize options (convert short flags to long form)
 */
function normalizeOptions(options) {
  const normalized = { ...options };

  // Map short flags to long names
  if (normalized.p) normalized.port = normalized.p;
  if (normalized.m) normalized.mode = normalized.m;
  if (normalized.o) normalized.output = normalized.o;
  if (normalized.v) normalized.version = normalized.v;
  if (normalized.h) normalized.help = normalized.h;

  // Set defaults
  normalized.mode = normalized.mode || 'dev';
  normalized.output = normalized.output || 'dist';
  normalized.port = normalized.port || (normalized.command === 'preview' ? '4173' : '3000');
  normalized.minify = normalized['no-minify'] ? false : (normalized.minify !== false);
  normalized.obfuscate = normalized['no-obfuscate'] ? false : (normalized.obfuscate !== false);
  normalized.open = normalized.open !== false;

  return normalized;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
🚀 Flutter.js CLI - Build tool for Flutter to JavaScript projects

USAGE:
  flutterjs <command> [options]

COMMANDS:
  init <name>      Create a new Flutter.js project
  run              Run your Flutter.js project (all-in-one)
  dev              Start development server with HMR
  build            Build for production
  preview          Preview production build
  clean            delete all build

DETAILED COMMAND OPTIONS:

Init:
  flutterjs init my-app
  flutterjs init my-app --template material

Run (All-in-one workflow - transpile + build + serve):
  flutterjs run
  flutterjs run --port 8080
  flutterjs run --mode dev
  flutterjs run --no-minify        # Disable minification
  flutterjs run --verbose          # Detailed output

Dev Server:
  flutterjs dev
  flutterjs dev --port 3000
  flutterjs dev --verbose
  flutterjs dev --debug            # Debug mode

Build:
  flutterjs build
  flutterjs build --mode ssr       # Server-side rendering
  flutterjs build --no-minify      # Disable minification
  flutterjs build --analyze        # Show bundle analysis
  flutterjs build --production     # Production optimizations

Preview:
  flutterjs preview
  flutterjs preview --port 4173
  flutterjs preview --open         # Auto-open browser

GLOBAL OPTIONS:
  -h, --help              Show help
  -v, --version           Show version
  --verbose               Detailed output
  --debug                 Debug mode

EXAMPLES:
  # Create new project
  flutterjs init counter-app

  # Development workflow
  flutterjs dev
  flutterjs dev --port 8080

  # One-command run
  flutterjs run --port 3000

  # Production build
  flutterjs build --production
  flutterjs preview

  # With custom output
  flutterjs build -o ./build --no-minify

Learn more at: https://flutter-js.dev/docs
`);
}

/**
 * Show version
 */
function showVersion() {
  try {
    const pkg = require(path.join(__dirname, '..', 'package.json'));
    console.log(`flutterjs v${pkg.version}`);
  } catch (e) {
    console.log('flutterjs v1.0.0');
  }
}

/**
 * Print error message with context
 */
function printError(message, options = {}) {
  console.error(`\n❌ Error: ${message}\n`);

  if (options.verbose && options.stack) {
    console.error('Stack trace:');
    console.error(options.stack);
  }

  if (options.suggestion) {
    console.error(`💡 ${options.suggestion}`);
  }

  console.log('');
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Handle help & version first (no project needed)
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    showHelp();
    process.exit(0);
  }

  if (command === '--version' || command === '-v' || command === 'version') {
    showVersion();
    process.exit(0);
  }

  // Parse options
  let options = parseOptions(args);
  options = normalizeOptions(options);
  options.command = command;

  try {
    // ========================================================================
    // COMMANDS THAT DON'T NEED PROJECT CONTEXT
    // ========================================================================

    if (command === 'init') {
      // 'init' doesn't need project loading
      await init(args[1], options);
      process.exit(0);
    }

    // ========================================================================
    // COMMANDS THAT NEED PROJECT CONTEXT
    // ========================================================================
    // For all other commands, load project configuration first

    let projectContext = null;

    try {
      // Load project (finds root, config, validates structure)
      const loader = new ProjectLoader();

      projectContext = {
        loader,
        projectRoot: loader.projectRoot,
        config: loader.config,
        packageJson: loader.packageJson,
        paths: loader.resolvePaths(),
        environment: loader.getEnvironment(),
        buildConfig: loader.getBuildConfig(),
      };

      // Show project info if verbose
      if (options.verbose) {
        console.log('\n📋 Project Context Loaded:');
        console.log(`   Root: ${projectContext.projectRoot}`);
        console.log(`   Entry: ${projectContext.paths.entryFile}`);
        console.log(`   Mode: ${projectContext.environment}\n`);
      }

    } catch (error) {
      // Project loading failed
      if (command === 'run' || command === 'dev' || command === 'build' || command === 'preview') {
        printError(error.message, {
          verbose: options.verbose,
          stack: error.stack,
          suggestion:
            'Create a new project: flutterjs init my-app\n' +
            '  Or ensure package.json has a "flutterjs" field',
        });
        process.exit(1);
      }
    }

    // ========================================================================
    // ROUTE TO COMMAND HANDLERS
    // ========================================================================

    switch (command) {
      case 'run':
        if (!projectContext) throw new Error('Project context required');
        await run(options, projectContext);
        break;

      case 'dev':
        if (!projectContext) throw new Error('Project context required');
        await dev(options, projectContext);
        break;

      case 'build':
        if (!projectContext) throw new Error('Project context required');
        await build(options, projectContext);
        break;

      case 'preview':
        if (!projectContext) throw new Error('Project context required');
        await preview(options, projectContext);
        break;

      default:
        console.error(`\n❌ Unknown command: ${command}\n`);
        showHelp();
        process.exit(1);
    }

  } catch (error) {
    // Global error handler
    printError(error.message, {
      verbose: options.verbose,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// ============================================================================
// HANDLE SIGNALS
// ============================================================================

// Graceful shutdown on CTRL+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...\n');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down gracefully...\n');
  process.exit(0);
});

// ============================================================================
// RUN
// ============================================================================

if (require.main === module) {
  main();
}

module.exports = { parseOptions, normalizeOptions, showHelp, showVersion };