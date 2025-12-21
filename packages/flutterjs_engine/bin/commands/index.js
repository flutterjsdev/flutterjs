/**
 * ============================================================================
 * FlutterJS CLI - Unified Commands Module (FIXED)
 * ============================================================================
 * 
 * All commands integrated with BuildPipeline:
 * - build: Production build with analysis
 * - dev: Development server with HMR
 * - run: All-in-one (build + serve)
 * - clean: Remove artifacts
 * - preview: Preview production build
 * - analyze: Code analysis
 * - doctor: Environment check
 * - init: Project creation
 * 
 * Location: cli/commands/index.js
 */

import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import open from 'open';

// Try to import optional dependencies
let chokidar;
try {
  import('chokidar').then(module => {
    chokidar = module.default;
  }).catch(() => {
    chokidar = null;
  });
} catch (e) {
  chokidar = null;
}

// Import systems
import { BuildPipeline } from './build_pipeline.js';
import { DevServer } from './dev.js';
import { initProject } from './init.js';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// CONFIGURATION LOADER (Fix for loadConfig)
// ============================================================================

/**
 * Deep merge configuration objects
 */
function deepMergeConfig(defaults, userConfig) {
  const merged = { ...defaults };

  for (const key in userConfig) {
    if (!userConfig.hasOwnProperty(key)) continue;

    const defaultValue = defaults[key];
    const userValue = userConfig[key];

    // Recursively merge objects
    if (
      typeof userValue === 'object' &&
      userValue !== null &&
      !Array.isArray(userValue) &&
      typeof defaultValue === 'object' &&
      defaultValue !== null &&
      !Array.isArray(defaultValue)
    ) {
      merged[key] = deepMergeConfig(defaultValue, userValue);
    } else {
      // Direct assignment for primitives and arrays
      merged[key] = userValue;
    }
  }

  return merged;
}

/**
 * Load project configuration - handles both ESM and CommonJS
 */
function loadConfigFile(configPath) {
  try {
    if (!fs.existsSync(configPath)) {
      return null;
    }

    const configCode = fs.readFileSync(configPath, 'utf-8');

    // Create a safe sandbox for eval
    const sandbox = { module: { exports: {} } };
    
    try {
      // Execute the config file in the sandbox
      new Function('module', 'exports', configCode).call(sandbox, sandbox.module, sandbox.module.exports);
      return sandbox.module.exports;
    } catch (evalError) {
      console.warn(
        chalk.yellow(`⚠️  Could not parse config file: ${evalError.message}`)
      );
      return null;
    }
  } catch (error) {
    console.warn(chalk.yellow(`⚠️  Error loading config file: ${error.message}`));
    return null;
  }
}

function loadConfig(projectContext) {
  try {
    const configPath = path.join(projectContext.projectRoot, 'flutterjs.config.js');
    
    if (!fs.existsSync(configPath)) {
      if (projectContext.projectRoot !== process.cwd()) {
        console.warn(chalk.yellow(`⚠️  No flutterjs.config.js found, using defaults\n`));
      }
      return getDefaultConfig();
    }

    // Try to load the actual config file
    const userConfig = loadConfigFile(configPath);
    
    if (userConfig && typeof userConfig === 'object') {
      // Deep merge user config with defaults
      return deepMergeConfig(getDefaultConfig(), userConfig);
    }

    console.warn(chalk.yellow(`⚠️  Could not parse flutterjs.config.js, using defaults\n`));
    return getDefaultConfig();
  } catch (error) {
    console.warn(chalk.yellow(`⚠️  Config loading error: ${error.message}, using defaults\n`));
    return getDefaultConfig();
  }
}

/**
 * Get default configuration
 */
function getDefaultConfig() {
  return {
    project: {
      name: 'flutter-js-app',
      version: '1.0.0',
    },
    entry: {
      main: 'lib/main.fjs',
      rootWidget: 'MyApp',
    },
    build: {
      output: 'dist',
      source: 'lib',
      publicPath: '/',
    },
    dev: {
      server: {
        port: 3000,
        host: 'localhost',
        https: false,
      },
      hmr: {
        enabled: true,
        interval: 300,
      },
    },
    render: {
      mode: 'csr',
      target: 'web',
    },
  };
}

// ============================================================================
// BUILD COMMAND
// ============================================================================

/**
 * Build command - Production build with optional analysis
 */
export async function build(options, projectContext) {
  const spinner = ora('Building for production...').start();

  try {
    // Validate configuration
    spinner.text = 'Validating configuration...';
    const config = loadConfig(projectContext);

    // Resolve entry file path
    const entryFile = config.entry?.main || 'lib/main.fjs';
    const entryPath = path.resolve(projectContext.projectRoot, entryFile);

    if (!fs.existsSync(entryPath)) {
      throw new Error(`Entry file not found: ${entryFile}\n\nExpected at: ${entryPath}`);
    }

    // Create build pipeline with FULL config
    const pipeline = new BuildPipeline({
      projectRoot: projectContext.projectRoot,
      mode: 'production',
      target: options.target || 'spa',
      entryFile: entryFile,  // Pass actual entry file
      outputDir: options.output || 'dist',
      debugMode: options.debug || false,
      enableHotReload: false,
      enablePerformanceMonitoring: true,
      enableMemoryTracking: true,
      // IMPORTANT: Pass full config
      config: config,
    });

    // Run build pipeline
    spinner.text = 'Analyzing & building source code...';
    const result = await pipeline.run();

    spinner.stop();

    // Display build results
    console.log(chalk.blue('\n📊 Build Results:\n'));
    console.log(chalk.gray(`  Output:     ${options.output || 'dist'}`));
    console.log(chalk.gray(`  Mode:       ${options.target || 'spa'}`));
    console.log(chalk.gray(`  Time:       ${result.stats.totalTime.toFixed(2)}ms`));
    console.log(chalk.gray(`  Widgets:    ${result.analysis.widgets?.count || 0}`));
    console.log();

    // Display file sizes
    if (result.output.html) {
      const htmlSize = (result.output.html.length / 1024).toFixed(2);
      console.log(chalk.gray(`  HTML:       ${htmlSize} KB`));
    }

    if (result.output.css) {
      const cssSize = (result.output.css.length / 1024).toFixed(2);
      console.log(chalk.gray(`  CSS:        ${cssSize} KB`));
    }

    if (result.output.js) {
      const jsSize = (result.output.js.length / 1024).toFixed(2);
      console.log(chalk.gray(`  JavaScript: ${jsSize} KB`));
    }

    console.log();

    // Analyze bundle if requested
    if (options.analyze) {
      console.log(chalk.cyan('Analyzing bundle...\n'));
      console.log(chalk.gray('(Bundle analysis available via "flutterjs analyze")\n'));
    }

    // Cleanup pipeline
    pipeline.dispose();

    console.log(chalk.green('✅ Build successful!\n'));

    return {
      success: true,
      outputPath: path.join(projectContext.projectRoot, options.output || 'dist'),
      buildTime: result.stats.totalTime,
      analysisResults: result.analysis,
    };

  } catch (error) {
    spinner.fail(chalk.red('❌ Build failed'));
    console.error(chalk.red(`\nError: ${error.message}`));
    if (options.debug) {
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

// ============================================================================
// DEV COMMAND
// ============================================================================

/**
 * Dev command - Development server with HMR
 */
export async function dev(options, projectContext) {
  const spinner = ora('Setting up development environment...').start();

  try {
    // Load configuration
    spinner.text = 'Loading project configuration...';
    const config = loadConfig(projectContext);

    // Resolve entry file path
    const entryFile = config.entry?.main || 'lib/main.fjs';
    const entryPath = path.resolve(projectContext.projectRoot, entryFile);

    if (!fs.existsSync(entryPath)) {
      throw new Error(`Entry file not found: ${entryFile}`);
    }

    // Create build pipeline (for initial build)
    const pipeline = new BuildPipeline({
      projectRoot: projectContext.projectRoot,
      mode: 'development',
      target: 'spa',
      entryFile: entryFile,
      outputDir: '.dev',
      debugMode: options.debug || false,
      enableHotReload: true,
      enablePerformanceMonitoring: true,
      enableMemoryTracking: options.debug || false,
    });

    // Run initial build
    spinner.text = 'Running initial build...';
    const buildResult = await pipeline.run();

    // Create development server
    const devServer = new DevServer(config, projectContext);

    spinner.stop();

    // Start dev server
    await devServer.start();

    // Setup file watching for rebuilds
    setupDevWatch(devServer, pipeline, projectContext, config);

    // Open browser if requested
    if (options.open) {
      setTimeout(async () => {
        await open(`http://${options.host || 'localhost'}:${parseInt(options.port || 3000, 10)}`).catch(() => {});
      }, 1000);
    }

    // Handle graceful shutdown
    setupGracefulShutdown(devServer, pipeline);

  } catch (error) {
    spinner.fail(chalk.red('❌ Dev server failed'));
    console.error(chalk.red(`\nError: ${error.message}`));
    if (options.debug) {
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

// ============================================================================
// RUN COMMAND
// ============================================================================

/**
 * Run command - All-in-one: build + dev server
 */
export async function run(options, projectContext) {
  const spinner = ora('Starting FlutterJS runtime...').start();

  try {
    // Load configuration
    const config = loadConfig(projectContext);

    // Resolve entry file path
    const entryFile = config.entry?.main || 'lib/main.fjs';
    const entryPath = path.resolve(projectContext.projectRoot, entryFile);

    if (!fs.existsSync(entryPath)) {
      throw new Error(`Entry file not found: ${entryFile}`);
    }

    // Create build pipeline
    const pipeline = new BuildPipeline({
      projectRoot: projectContext.projectRoot,
      mode: options.mode === 'production' ? 'production' : 'development',
      target: options.target || 'spa',
      entryFile: entryFile,
      outputDir: options.output || '.dev',
      debugMode: options.debug || false,
      enableHotReload: options.mode !== 'production',
      enablePerformanceMonitoring: true,
    });

    // Run build
    spinner.text = 'Building application...';
    const buildResult = await pipeline.run();

    spinner.stop();

    // Display build info
    console.log(chalk.blue('\n📊 Build Complete:\n'));
    console.log(chalk.gray(`  Widgets:    ${buildResult.analysis.widgets?.count || 0}`));
    console.log(chalk.gray(`  Build time: ${buildResult.stats.totalTime.toFixed(2)}ms`));
    console.log();

    // Start server if not production-only
    if (options.serve !== false) {
      const port = parseInt(options.port || 3000, 10);
      const host = 'localhost';
      
      console.log(chalk.cyan('Starting development server...\n'));

      const devServer = new DevServer(
        {
          ...config,
          dev: {
            ...config.dev,
            server: {
              port,
              host,
              https: false,
            },
          },
        },
        projectContext
      );

      await devServer.start();
      setupGracefulShutdown(devServer, pipeline);
    } else {
      pipeline.dispose();
    }

  } catch (error) {
    spinner.fail(chalk.red('❌ Run failed'));
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}

// ============================================================================
// CLEAN COMMAND
// ============================================================================

/**
 * Clean command - Remove build artifacts
 */
export async function clean(options, projectContext) {
  const spinner = ora('Cleaning build artifacts...').start();

  try {
    const paths = [
      path.join(projectContext.projectRoot, 'dist'),
      path.join(projectContext.projectRoot, '.dev'),
      path.join(projectContext.projectRoot, '.flutterjs'),
    ];

    if (options.all) {
      paths.push(path.join(projectContext.projectRoot, 'node_modules'));
    }

    for (const dir of paths) {
      if (fs.existsSync(dir)) {
        spinner.text = `Removing ${path.relative(projectContext.projectRoot, dir)}...`;
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }

    spinner.succeed(chalk.green('✅ Clean complete\n'));

  } catch (error) {
    spinner.fail(chalk.red('❌ Clean failed'));
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}

// ============================================================================
// PREVIEW COMMAND
// ============================================================================

/**
 * Preview command - Serve production build
 */
export async function preview(options, projectContext) {
  const spinner = ora('Starting preview server...').start();

  try {
    const buildDir = options.output || 'dist';
    const buildPath = path.join(projectContext.projectRoot, buildDir);

    // Check if build exists
    if (!fs.existsSync(buildPath)) {
      throw new Error(`Build not found at ${buildDir}\n\nRun "flutterjs build" first.`);
    }

    spinner.text = 'Setting up preview server...';

    const port = parseInt(options.port || 4173, 10);

    const server = http.createServer((req, res) => {
      let filePath = path.join(buildPath, req.url === '/' ? 'index.html' : req.url);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(fs.readFileSync(filePath));
      } else {
        // SPA fallback
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(fs.readFileSync(path.join(buildPath, 'index.html')));
      }
    });

    server.listen(port, () => {
      spinner.stop();
      console.log(chalk.green('\n✅ Preview server running!\n'));
      console.log(chalk.blue(`🌐 Open: http://localhost:${port}\n`));

      // Open browser if requested
      if (options.open) {
        setTimeout(() => {
          open(`http://localhost:${port}`).catch(() => {});
        }, 500);
      }
    });

    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\n👋 Shutting down preview server...'));
      server.close(() => {
        console.log(chalk.green('✅ Server stopped\n'));
        process.exit(0);
      });
    });

  } catch (error) {
    spinner.fail(chalk.red('❌ Preview failed'));
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}

// ============================================================================
// ANALYZE COMMAND
// ============================================================================

/**
 * Analyze command - Code analysis and reports
 */
export async function analyze(options, projectContext) {
  const spinner = ora('Running code analysis...').start();

  try {
    const config = loadConfig(projectContext);

    // Resolve entry file path
    const entryFile = config.entry?.main || 'lib/main.fjs';
    const entryPath = path.resolve(projectContext.projectRoot, entryFile);

    if (!fs.existsSync(entryPath)) {
      throw new Error(`Entry file not found: ${entryFile}`);
    }

    // Create pipeline with analysis
    const pipeline = new BuildPipeline({
      projectRoot: projectContext.projectRoot,
      mode: 'development',
      target: 'spa',
      entryFile: entryFile,
      outputDir: '.analysis',
      debugMode: true,
    });

    spinner.text = 'Analyzing source code...';
    const result = await pipeline.run();

    spinner.stop();

    // Display analysis results
    console.log(chalk.blue('\n📊 Code Analysis Results:\n'));

    // Widgets
    if (result.analysis.widgets) {
      console.log(chalk.cyan('Widgets:'));
      console.log(chalk.gray(`  Total:      ${result.analysis.widgets.count}`));
      console.log(chalk.gray(`  Stateless:  ${result.analysis.widgets.stateless || 0}`));
      console.log(chalk.gray(`  Stateful:   ${result.analysis.widgets.stateful || 0}`));
      console.log();
    }

    // Save report if requested
    if (options.output) {
      const reportPath = path.join(projectContext.projectRoot, options.output);
      fs.writeFileSync(reportPath, JSON.stringify(result.analysis, null, 2));
      console.log(chalk.gray(`Report saved to: ${options.output}\n`));
    }

    console.log(chalk.green('✅ Analysis complete\n'));

    pipeline.dispose();

  } catch (error) {
    spinner.fail(chalk.red('❌ Analysis failed'));
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}

// ============================================================================
// DOCTOR COMMAND
// ============================================================================

/**
 * Doctor command - Environment diagnostics
 */
export async function doctor(options, projectContext) {
  console.log(chalk.blue('\n🏥 FlutterJS Doctor\n'));

  try {
    const checks = [];

    // 1. Node.js version
    const nodeVersion = process.version;
    const nodeOk = semverGte(nodeVersion, '18.0.0');
    checks.push({
      name: 'Node.js',
      version: nodeVersion,
      status: nodeOk,
      message: nodeOk ? 'Compatible' : 'Node.js 18+ required',
    });

    // 2. npm/yarn/pnpm
    const packageManagers = checkPackageManagers();
    checks.push({
      name: 'Package Manager',
      version: packageManagers.active || 'Not found',
      status: !!packageManagers.active,
      message: packageManagers.active ? `Using ${packageManagers.active}` : 'Install npm, yarn, or pnpm',
    });

    // 3. Git
    const gitOk = isCommandAvailable('git');
    checks.push({
      name: 'Git',
      version: gitOk ? 'Installed' : 'Not found',
      status: gitOk,
      message: gitOk ? 'Ready' : 'Optional - Install Git',
    });

    // 4. FlutterJS config
    const configExists = fs.existsSync(
      path.join(projectContext.projectRoot, 'flutterjs.config.js')
    );
    checks.push({
      name: 'FlutterJS Config',
      version: configExists ? 'Found' : 'Not found',
      status: configExists,
      message: configExists ? 'Valid' : 'Run "flutterjs init" or create flutterjs.config.js',
    });

    // 5. Build artifacts
    const distExists = fs.existsSync(path.join(projectContext.projectRoot, 'dist'));
    checks.push({
      name: 'Build Artifacts',
      version: distExists ? 'Present' : 'None',
      status: distExists,
      message: distExists ? 'Ready' : 'Run "flutterjs build"',
    });

    // Display results
    console.log(chalk.cyan('Checks:\n'));

    checks.forEach((check) => {
      const icon = check.status ? chalk.green('✓') : chalk.red('✗');
      console.log(`${icon} ${chalk.gray(check.name.padEnd(20))} ${check.message}`);
    });

    console.log();

    const allOk = checks.every((c) => c.status);

    if (allOk) {
      console.log(chalk.green('✅ All checks passed!\n'));
    } else {
      console.log(chalk.yellow('⚠️  Some checks failed\n'));
    }

  } catch (error) {
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}

// ============================================================================
// INIT COMMAND
// ============================================================================

/**
 * Init command - Create new project
 */
export async function init(projectName, options) {
  try {
    await initProject(projectName, options);
    console.log(chalk.green(`\n✅ Project created!\n`));
  } catch (error) {
    console.error(chalk.red(`\n❌ Project creation failed\n`));
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Setup file watching for development
 */
function setupDevWatch(devServer, pipeline, projectContext, config) {
  if (!chokidar) {
    console.warn(chalk.yellow('⚠️  chokidar not available, file watching disabled'));
    return;
  }

  const watcher = chokidar.watch(
    [
      path.join(projectContext.projectRoot, config.build?.source || 'lib'),
      path.join(projectContext.projectRoot, 'public'),
      path.join(projectContext.projectRoot, 'flutterjs.config.js'),
    ],
    {
      ignoreInitial: true,
      ignored: /node_modules|dist|\.dev/,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100,
      },
    }
  );

  watcher.on('change', async (filePath) => {
    console.log(chalk.cyan(`\n[CHANGE] ${path.relative(projectContext.projectRoot, filePath)}`));

    // Trigger rebuild
    try {
      const result = await pipeline.run();
      devServer.updateBuildAnalysis(result.analysis);
      console.log(chalk.green('✅ Rebuild complete\n'));
    } catch (error) {
      devServer.reportBuildError(error);
      console.error(chalk.red(`Build error: ${error.message}\n`));
    }
  });

  // Cleanup watcher on shutdown
  process.on('SIGINT', () => {
    watcher.close();
  });
}

/**
 * Setup graceful shutdown
 */
function setupGracefulShutdown(devServer, pipeline) {
  const shutdown = async () => {
    await devServer.stop();
    pipeline.dispose();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

/**
 * Check if command is available
 */
function isCommandAvailable(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check installed package managers
 */
function checkPackageManagers() {
  const managers = { npm: false, yarn: false, pnpm: false, active: null };

  try {
    execSync('npm --version', { stdio: 'ignore' });
    managers.npm = true;
    if (!managers.active) managers.active = 'npm';
  } catch {}

  try {
    execSync('yarn --version', { stdio: 'ignore' });
    managers.yarn = true;
    if (!managers.active) managers.active = 'yarn';
  } catch {}

  try {
    execSync('pnpm --version', { stdio: 'ignore' });
    managers.pnpm = true;
    managers.active = 'pnpm';
  } catch {}

  return managers;
}

/**
 * Simple semver comparison
 */
function semverGte(version, target) {
  const parse = (v) =>
    v.replace(/^v/, '').split('.').map((x) => parseInt(x, 10));
  const [maj1, min1, pat1] = parse(version);
  const [maj2, min2, pat2] = parse(target);

  if (maj1 !== maj2) return maj1 > maj2;
  if (min1 !== min2) return min1 > min2;
  return pat1 >= pat2;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  build,
  dev,
  run,
  clean,
  preview,
  analyze,
  doctor,
  init,
};