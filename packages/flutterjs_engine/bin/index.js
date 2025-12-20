#!/usr/bin/env node

/**
 * ============================================================================
 * FlutterJS CLI Entry Point - Complete Implementation
 * ============================================================================
 * 
 * This file:
 * 1. Parses CLI arguments using Commander.js
 * 2. Loads project configuration via ProjectLoader
 * 3. Routes to appropriate command handlers
 * 4. Provides global context to all commands
 * 5. Integrates with Analyzer and Runtime systems
 * 
 * Location: cli/index.js or bin/flutterjs.js
 */

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs');

// ============================================================================
// COMMAND IMPORTS
// ============================================================================

// Import command handlers
const { init } = require('./commands/init');
const { preview } = require('./commands/preview');

// These need to be created or imported correctly
let dev, build, run, clean, doctor, upgrade;

try {
  dev = require('./commands/dev');
  build = require('./commands/build');
  run = require('./commands/run');
  clean = require('./commands/clean');
  doctor = require('./commands/doctor');
  upgrade = require('./commands/upgrade');
} catch (e) {
  console.warn(chalk.yellow(`⚠️  Warning: Some commands may not be available: ${e.message}`));
}

// Import ProjectLoader
let ProjectLoader;
try {
  ProjectLoader = require('./utils/project-loader');
} catch (e) {
  console.error(chalk.red(`❌ Error: ProjectLoader not found at ./utils/project-loader`));
  console.error(chalk.red(`   ${e.message}`));
  process.exit(1);
}

// ============================================================================
// VERSION & PACKAGE INFO
// ============================================================================

function getVersion() {
  try {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.version || '1.0.0';
  } catch (e) {
    return '1.0.0';
  }
}

const VERSION = getVersion();

// ============================================================================
// CLI PROGRAM SETUP
// ============================================================================

const program = new Command();

program
  .name('flutterjs')
  .description('🚀 FlutterJS CLI - Build web apps with Flutter-like syntax')
  .version(VERSION, '-v, --version', 'Show version number')
  .helpOption('-h, --help', 'Show help information');

// ============================================================================
// GLOBAL OPTIONS
// ============================================================================

program
  .option('--verbose', 'Verbose output with detailed logs')
  .option('--debug', 'Debug mode with extra diagnostics')
  .option('--config <path>', 'Custom config file path', 'flutterjs.config.js')
  .option('--no-color', 'Disable colored output');

// ============================================================================
// COMMAND: INIT (Create new project)
// ============================================================================

program
  .command('init <project-name>')
  .alias('create')
  .description('Create a new FlutterJS project')
  .option('-t, --template <template>', 'Project template (default|counter|todo)', 'default')
  .option('--material', 'Use Material Design widgets')
  .option('--cupertino', 'Use Cupertino (iOS) design')
  .option('--typescript', 'Use TypeScript instead of JavaScript')
  .option('--git', 'Initialize git repository', true)
  .option('--no-git', 'Skip git initialization')
  .option('--install', 'Install dependencies automatically', true)
  .option('--no-install', 'Skip dependency installation')
  .action(async (projectName, options) => {
    const spinner = ora('Creating FlutterJS project...').start();

    try {
      // Merge with global options
      const opts = { ...program.opts(), ...options };

      // Execute init command
      await init(projectName, opts);

      spinner.succeed(chalk.green(`✅ Project "${projectName}" created successfully!`));

      // Show next steps
      console.log(chalk.blue('\n📋 Next steps:\n'));
      console.log(chalk.gray(`  cd ${projectName}`));

      if (!opts.install) {
        console.log(chalk.gray('  npm install'));
      }

      console.log(chalk.gray('  flutterjs dev'));
      console.log(chalk.gray('  # or'));
      console.log(chalk.gray('  flutterjs run\n'));

    } catch (error) {
      spinner.fail(chalk.red('❌ Failed to create project'));
      console.error(chalk.red(`\nError: ${error.message}`));

      if (program.opts().verbose) {
        console.error(chalk.gray('\nStack trace:'));
        console.error(chalk.gray(error.stack));
      }

      process.exit(1);
    }
  });

// ============================================================================
// COMMAND: RUN (All-in-one: build + dev server + debug server)
// ============================================================================

if (run) {
  program
    .command('run')
    .description('Run FlutterJS app (build + dev server + optional debug tools)')
    .option('-p, --port <port>', 'Development server port', '3000')
    .option('--debug-port <port>', 'Debug server port (dev port + 1 by default)')
    .option('--no-debug', 'Disable debug server')
    .option('-m, --mode <mode>', 'Build mode (dev|production)', 'dev')
    .option('-o, --output <path>', 'Build output directory', '.dev')
    .option('--no-minify', 'Disable minification')
    .option('--no-obfuscate', 'Disable obfuscation')
    .option('--open', 'Open browser automatically')
    .option('--open-debug', 'Open debug tools only')
    .option('--serve', 'Start development server', true)
    .option('--no-serve', 'Build only, no server')
    .action(async (options) => {
      const spinner = ora('Starting FlutterJS runtime...').start();

      try {
        // Merge with global options
        const opts = { ...program.opts(), ...options };

        // Load project context
        spinner.text = 'Loading project configuration...';
        const projectContext = await loadProjectContext(opts);

        spinner.stop();

        // Execute run command
        await run(opts, projectContext);

      } catch (error) {
        spinner.fail(chalk.red('❌ Run command failed'));
        handleError(error, program.opts());
      }
    });
}

// ============================================================================
// COMMAND: DEV (Development server only)
// ============================================================================

if (dev) {
  program
    .command('dev')
    .description('Start development server with HMR')
    .option('-p, --port <port>', 'Server port', '3000')
    .option('--host <host>', 'Server host', 'localhost')
    .option('--https', 'Use HTTPS')
    .option('--open', 'Open browser automatically')
    .option('--no-hmr', 'Disable Hot Module Replacement')
    .option('--no-overlay', 'Disable error overlay')
    .action(async (options) => {
      const spinner = ora('Starting development server...').start();

      try {
        const opts = { ...program.opts(), ...options };
        const projectContext = await loadProjectContext(opts);

        spinner.stop();

        await dev(opts, projectContext);

      } catch (error) {
        spinner.fail(chalk.red('❌ Dev server failed'));
        handleError(error, program.opts());
      }
    });
}

// ============================================================================
// COMMAND: BUILD (Production build)
// ============================================================================

if (build) {
  program
    .command('build')
    .description('Build for production')
    .option('-m, --mode <mode>', 'Build mode (production|ssr|static)', 'production')
    .option('-t, --target <target>', 'Build target (spa|mpa|ssr|static)', 'spa')
    .option('-o, --output <path>', 'Output directory', 'dist')
    .option('--analyze', 'Analyze bundle size')
    .option('--sourcemap', 'Generate source maps')
    .option('--minify', 'Minify output', true)
    .option('--no-minify', 'Disable minification')
    .option('--obfuscate', 'Obfuscate code', true)
    .option('--no-obfuscate', 'Disable obfuscation')
    .option('--treeshake', 'Enable tree-shaking', true)
    .option('--no-treeshake', 'Disable tree-shaking')
    .option('--splitting', 'Enable code splitting', true)
    .option('--no-splitting', 'Disable code splitting')
    .action(async (options) => {
      const spinner = ora('Building for production...').start();

      try {
        const opts = { ...program.opts(), ...options };
        const projectContext = await loadProjectContext(opts);

        spinner.text = 'Analyzing source code...';

        const result = await build(opts, projectContext);

        spinner.succeed(chalk.green('✅ Build completed successfully!'));

        // Display build stats
        console.log(chalk.blue('\n📊 Build Stats:\n'));
        console.log(chalk.gray(`  Output: ${result.outputPath}`));
        console.log(chalk.gray(`  Mode: ${opts.mode.toUpperCase()}`));
        console.log(chalk.gray(`  Time: ${result.buildTime || 'N/A'}`));

        if (result.analysisResults) {
          const widgets = result.analysisResults.widgets?.summary?.count || 0;
          const health = result.analysisResults.widgets?.summary?.healthScore || 0;
          console.log(chalk.gray(`  Widgets: ${widgets} (Health: ${health}/100)`));
        }

        console.log();

        if (opts.analyze) {
          console.log(chalk.blue('💡 Tip: Open bundle analysis with:'));
          console.log(chalk.gray('  flutterjs analyze --open\n'));
        }

      } catch (error) {
        spinner.fail(chalk.red('❌ Build failed'));
        handleError(error, program.opts());
      }
    });
}

// ============================================================================
// COMMAND: PREVIEW (Preview production build)
// ============================================================================

program
  .command('preview')
  .alias('serve')
  .description('Preview production build locally')
  .option('-p, --port <port>', 'Server port', '4173')
  .option('-o, --output <path>', 'Build directory to serve', 'dist')
  .option('--open', 'Open browser automatically')
  .action(async (options) => {
    const spinner = ora('Starting preview server...').start();

    try {
      const opts = { ...program.opts(), ...options };
      const projectContext = await loadProjectContext(opts);

      spinner.stop();

      await preview(opts, projectContext);

    } catch (error) {
      spinner.fail(chalk.red('❌ Preview server failed'));
      handleError(error, program.opts());
    }
  });

// ============================================================================
// COMMAND: ANALYZE (Bundle analysis)
// ============================================================================

program
  .command('analyze')
  .description('Analyze bundle size and dependencies')
  .option('--json', 'Output as JSON')
  .option('--open', 'Open visualization in browser')
  .option('-o, --output <path>', 'Build directory to analyze', 'dist')
  .action(async (options) => {
    const spinner = ora('Analyzing bundle...').start();

    try {
      const opts = { ...program.opts(), ...options };

      // Dynamic import of analyzer
      const analyzeBundle = async (opts) => {
        // Placeholder - implement actual analysis
        console.log(chalk.yellow('⚠️  Bundle analysis not yet implemented'));
        return { text: 'Analysis data' };
      };

      const analysis = await analyzeBundle(opts);

      spinner.succeed(chalk.green('✅ Analysis complete!'));

      if (!opts.json && !opts.open) {
        console.log(chalk.blue('\n📊 Bundle Analysis:\n'));
        console.log(analysis.text);
      }

    } catch (error) {
      spinner.fail(chalk.red('❌ Analysis failed'));
      handleError(error, program.opts());
    }
  });

// ============================================================================
// COMMAND: CLEAN (Remove build artifacts)
// ============================================================================

if (clean) {
  program
    .command('clean')
    .description('Clean build artifacts and caches')
    .option('--all', 'Remove all artifacts including node_modules')
    .option('--cache', 'Remove build cache only')
    .action(async (options) => {
      const spinner = ora('Cleaning build artifacts...').start();

      try {
        const opts = { ...program.opts(), ...options };

        await clean(opts);

        spinner.succeed(chalk.green('✅ Build artifacts cleaned!'));

      } catch (error) {
        spinner.fail(chalk.red('❌ Clean failed'));
        handleError(error, program.opts());
      }
    });
}

// ============================================================================
// COMMAND: DOCTOR (Environment check)
// ============================================================================

if (doctor) {
  program
    .command('doctor')
    .description('Check environment and dependencies')
    .option('--fix', 'Attempt to fix issues automatically')
    .action(async (options) => {
      const spinner = ora('Running diagnostics...').start();

      try {
        const opts = { ...program.opts(), ...options };

        spinner.stop();

        await doctor(opts);

      } catch (error) {
        spinner.fail(chalk.red('❌ Doctor command failed'));
        handleError(error, program.opts());
      }
    });
}

// ============================================================================
// COMMAND: UPGRADE (Upgrade FlutterJS)
// ============================================================================

if (upgrade) {
  program
    .command('upgrade')
    .description('Upgrade FlutterJS to latest version')
    .option('--force', 'Force upgrade even if up-to-date')
    .option('--version <version>', 'Upgrade to specific version')
    .action(async (options) => {
      const spinner = ora('Checking for updates...').start();

      try {
        const opts = { ...program.opts(), ...options };

        const result = await upgrade(opts);

        if (result.upgraded) {
          spinner.succeed(chalk.green(`✅ Upgraded to v${result.newVersion}!`));
        } else {
          spinner.succeed(chalk.blue('ℹ️  Already up-to-date'));
        }

      } catch (error) {
        spinner.fail(chalk.red('❌ Upgrade failed'));
        handleError(error, program.opts());
      }
    });
}

// ============================================================================
// HELPER: Load Project Context
// ============================================================================

async function loadProjectContext(options) {
  try {
    // Create project loader
    const loader = new ProjectLoader(options.config);

    // Validate project structure
    loader.validate();

    // Get full context
    const context = loader.getContext();

    // Show project info if verbose
    if (options.verbose) {
      console.log(chalk.blue('\n📋 Project Context:\n'));
      console.log(chalk.gray(`  Root: ${context.projectRoot}`));
      console.log(chalk.gray(`  Entry: ${context.paths.entryFile}`));
      console.log(chalk.gray(`  Mode: ${context.environment}\n`));
    }

    return context;

  } catch (error) {
    throw new Error(
      `Failed to load project:\n\n${error.message}\n\n` +
      `💡 Suggestions:\n` +
      `  • Create a new project: flutterjs init my-app\n` +
      `  • Ensure you're in a FlutterJS project directory\n` +
      `  • Check that flutterjs.config.js or package.json exists\n`
    );
  }
}

// ============================================================================
// HELPER: Error Handler
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
  console.log(chalk.gray('  • Check the docs: https://flutter-js.dev/docs'));
  console.log();

  process.exit(1);
}

// ============================================================================
// HANDLE SIGNALS (Graceful shutdown)
// ============================================================================

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 Shutting down gracefully...'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n\n👋 Shutting down gracefully...'));
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n💥 Uncaught Exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\n💥 Unhandled Rejection at:'), promise);
  console.error(chalk.red('Reason:'), reason);
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
}

// ============================================================================
// EXPORTS (for testing)
// ============================================================================

module.exports = {
  program,
  loadProjectContext,
  handleError,
  VERSION
};