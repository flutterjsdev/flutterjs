# Step 6: Build System & Production Pipeline - Production Plan

## Overview

Step 6 implements the **build system and CLI** that transforms FlutterJS source code into optimized, production-ready bundles for deployment. This includes the `flutterjs` CLI tool, bundling pipeline, optimization strategies, and development server.

**Current Status:**
- ✅ Step 1-3: Analyzer complete (metadata extraction)
- ✅ Step 4: VNode system complete (rendering, diffing, hydration)
- ✅ Step 5: Runtime system complete (state, context, events)
- ❌ Step 6: Build system & CLI needs implementation

**Goal:** Complete a production-ready build system that:
1. Provides intuitive CLI commands (`flutterjs dev`, `flutterjs build`, etc.)
2. Bundles JavaScript efficiently (code splitting, tree-shaking)
3. Optimizes CSS (minification, critical CSS extraction)
4. Generates optimized production builds
5. Provides hot module replacement (HMR) for development
6. Supports multiple output targets (SPA, MPA, SSR, static)

---

## Step 6 Breakdown (4 Major Phases)

```
Step 6: Build System & Production Pipeline
│
├── Phase 6.1: CLI & Project Scaffolding (Weeks 1-2)
│   ├── CLI command structure
│   ├── Project initialization (flutterjs create)
│   ├── Configuration system (flutterjs.config.js)
│   ├── Dependency management
│   └── Template system
│
├── Phase 6.2: Development Pipeline (Weeks 3-4)
│   ├── Development server
│   ├── Hot Module Replacement (HMR)
│   ├── Live reload
│   ├── Source maps
│   └── Error overlay
│
├── Phase 6.3: Production Build Pipeline (Weeks 5-6)
│   ├── JavaScript bundling & optimization
│   ├── CSS processing & optimization
│   ├── Asset handling (images, fonts)
│   ├── Code splitting
│   └── Tree-shaking
│
└── Phase 6.4: Advanced Build Features (Weeks 7-8)
    ├── Multiple build targets (SPA, MPA, SSR, static)
    ├── Bundle analysis & visualization
    ├── Production optimizations (minify, obfuscate)
    ├── Service worker generation
    └── Deployment helpers
```

---

## Phase 6.1: CLI & Project Scaffolding (Weeks 1-2)

### Objective
Build a robust CLI tool that developers use to create, configure, and manage FlutterJS projects.

### 6.1.1 CLI Architecture

**File:** `cli/index.js`

**Command Structure:**

```
flutterjs <command> [options]

Commands:
  create <project-name>    Create a new FlutterJS project
  dev                      Start development server
  build                    Build for production
  serve                    Preview production build locally
  analyze                  Analyze bundle size and dependencies
  clean                    Clean build artifacts
  doctor                   Check environment and dependencies
  upgrade                  Upgrade FlutterJS version

Global Options:
  -h, --help              Show help
  -v, --version           Show version
  --verbose               Verbose output
  --config <path>         Custom config file path
```

**CLI Implementation:**

```javascript
#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createProject } from './commands/create.js';
import { devServer } from './commands/dev.js';
import { buildProduction } from './commands/build.js';
import { serveStatic } from './commands/serve.js';
import { analyzeBundle } from './commands/analyze.js';
import { cleanArtifacts } from './commands/clean.js';
import { runDoctor } from './commands/doctor.js';
import { upgradeFramework } from './commands/upgrade.js';

const program = new Command();

program
  .name('flutterjs')
  .description('FlutterJS CLI - Build web apps with Flutter-like syntax')
  .version('1.0.0');

// Create command
program
  .command('create <project-name>')
  .description('Create a new FlutterJS project')
  .option('-t, --template <template>', 'Project template', 'default')
  .option('--material', 'Use Material Design')
  .option('--cupertino', 'Use Cupertino (iOS) design')
  .option('--typescript', 'Use TypeScript')
  .option('--git', 'Initialize git repository', true)
  .action(async (projectName, options) => {
    const spinner = ora('Creating project...').start();
    try {
      await createProject(projectName, options);
      spinner.succeed(chalk.green(`Project ${projectName} created successfully!`));
      console.log(chalk.blue(`\nNext steps:`));
      console.log(`  cd ${projectName}`);
      console.log(`  flutterjs dev`);
    } catch (error) {
      spinner.fail(chalk.red(`Failed to create project: ${error.message}`));
      process.exit(1);
    }
  });

// Dev command
program
  .command('dev')
  .description('Start development server with HMR')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('-o, --open', 'Open browser automatically')
  .option('--host <host>', 'Host address', 'localhost')
  .option('--https', 'Use HTTPS')
  .action(async (options) => {
    await devServer(options);
  });

// Build command
program
  .command('build')
  .description('Build for production')
  .option('-m, --mode <mode>', 'Build mode', 'production')
  .option('-t, --target <target>', 'Build target (spa|mpa|ssr|static)', 'spa')
  .option('-o, --output <path>', 'Output directory', 'dist')
  .option('--analyze', 'Analyze bundle size')
  .option('--sourcemap', 'Generate source maps')
  .option('--minify', 'Minify output', true)
  .action(async (options) => {
    const spinner = ora('Building for production...').start();
    try {
      const stats = await buildProduction(options);
      spinner.succeed(chalk.green('Build completed successfully!'));
      console.log(chalk.blue(`\nBundle size: ${stats.totalSize}`));
      console.log(chalk.blue(`Output: ${stats.outputPath}`));
    } catch (error) {
      spinner.fail(chalk.red(`Build failed: ${error.message}`));
      process.exit(1);
    }
  });

// Serve command
program
  .command('serve')
  .description('Preview production build')
  .option('-p, --port <port>', 'Port number', '8080')
  .option('-o, --open', 'Open browser')
  .action(async (options) => {
    await serveStatic(options);
  });

// Analyze command
program
  .command('analyze')
  .description('Analyze bundle size and dependencies')
  .option('--json', 'Output as JSON')
  .option('--open', 'Open visualization in browser')
  .action(async (options) => {
    await analyzeBundle(options);
  });

// Clean command
program
  .command('clean')
  .description('Clean build artifacts')
  .action(async () => {
    const spinner = ora('Cleaning build artifacts...').start();
    try {
      await cleanArtifacts();
      spinner.succeed(chalk.green('Build artifacts cleaned!'));
    } catch (error) {
      spinner.fail(chalk.red(`Clean failed: ${error.message}`));
    }
  });

// Doctor command
program
  .command('doctor')
  .description('Check environment and dependencies')
  .action(async () => {
    await runDoctor();
  });

// Upgrade command
program
  .command('upgrade')
  .description('Upgrade FlutterJS to latest version')
  .option('--force', 'Force upgrade even if up-to-date')
  .action(async (options) => {
    await upgradeFramework(options);
  });

program.parse(process.argv);
```

**Validation:**
- ✅ All commands execute without errors
- ✅ Help text clear and accurate
- ✅ Error messages helpful
- ✅ Options validated correctly

---

### 6.1.2 Project Creation System

**File:** `cli/commands/create.js`

**Project Structure:**

```javascript
async function createProject(projectName, options) {
  const projectPath = path.join(process.cwd(), projectName);
  
  // Validate project name
  validateProjectName(projectName);
  
  // Check if directory exists
  if (fs.existsSync(projectPath)) {
    throw new Error(`Directory ${projectName} already exists`);
  }
  
  // Create project structure
  await createDirectoryStructure(projectPath, options);
  
  // Copy template files
  await copyTemplateFiles(projectPath, options.template);
  
  // Initialize package.json
  await createPackageJson(projectPath, projectName, options);
  
  // Initialize git if requested
  if (options.git) {
    await initGitRepository(projectPath);
  }
  
  // Install dependencies
  await installDependencies(projectPath);
  
  return projectPath;
}

async function createDirectoryStructure(projectPath, options) {
  const structure = {
    'lib': {
      'main.fjs': null,
      'widgets': {},
      'pages': {},
      'services': {},
      'models': {},
      'utils': {}
    },
    'public': {
      'index.html': null,
      'favicon.ico': null
    },
    'assets': {
      'images': {},
      'fonts': {}
    },
    'test': {},
    '.flutterjs': {},
    'flutterjs.config.js': null,
    '.gitignore': null,
    'README.md': null
  };
  
  await createStructureRecursively(projectPath, structure);
}
```

**Default Project Structure:**

```
my-app/
├── lib/
│   ├── main.fjs                 # Entry point
│   ├── widgets/                 # Reusable widgets
│   ├── pages/                   # Page components
│   ├── services/                # Business logic
│   ├── models/                  # Data models
│   └── utils/                   # Utility functions
├── public/
│   ├── index.html               # HTML template
│   └── favicon.ico              # Favicon
├── assets/
│   ├── images/                  # Image assets
│   └── fonts/                   # Font files
├── test/                        # Test files
├── .flutterjs/                  # Build cache
├── flutterjs.config.js          # Configuration
├── package.json                 # Dependencies
├── .gitignore                   # Git ignore rules
└── README.md                    # Project documentation
```

**Template System:**

```javascript
const templates = {
  default: {
    'lib/main.fjs': `
import { MaterialApp, Scaffold, AppBar, Text, Center } from '@flutterjs/material';
import { StatelessWidget, runApp } from '@flutterjs/core';

class MyApp extends StatelessWidget {
  build(context) {
    return MaterialApp({
      title: 'FlutterJS App',
      theme: ThemeData({
        primarySwatch: Colors.blue
      }),
      home: HomePage()
    });
  }
}

class HomePage extends StatelessWidget {
  build(context) {
    return Scaffold({
      appBar: AppBar({
        title: Text('Welcome to FlutterJS')
      }),
      body: Center({
        child: Text('Hello, FlutterJS!')
      })
    });
  }
}

main() {
  runApp(new MyApp());
}
`,
    'public/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FlutterJS App</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`,
    'flutterjs.config.js': `
export default {
  entry: 'lib/main.fjs',
  output: 'dist',
  publicPath: '/',
  sourceMap: true,
  minify: true,
  target: 'spa',
  
  server: {
    port: 3000,
    host: 'localhost',
    open: true,
    hmr: true
  },
  
  build: {
    analyze: false,
    splitting: true,
    treeshake: true
  }
};
`
  },
  
  counter: {
    'lib/main.fjs': `/* Counter app template */`
  },
  
  todo: {
    'lib/main.fjs': `/* Todo app template */`
  }
};
```

**Validation:**
- ✅ Project created with correct structure
- ✅ Templates render correctly
- ✅ Dependencies installed
- ✅ Git initialized (if requested)

---

### 6.1.3 Configuration System

**File:** `cli/config/config-loader.js`

**Configuration Schema:**

```javascript
// flutterjs.config.js
export default {
  // Entry point
  entry: 'lib/main.fjs',
  
  // Output directory
  output: 'dist',
  
  // Public path for assets
  publicPath: '/',
  
  // Source maps
  sourceMap: true,
  
  // Minification
  minify: true,
  
  // Build target
  target: 'spa',  // 'spa' | 'mpa' | 'ssr' | 'static'
  
  // Development server
  server: {
    port: 3000,
    host: 'localhost',
    open: true,
    https: false,
    hmr: true,
    overlay: true,  // Error overlay
    proxy: {}       // API proxy
  },
  
  // Build options
  build: {
    // Bundle analysis
    analyze: false,
    
    // Code splitting
    splitting: true,
    
    // Tree-shaking
    treeshake: true,
    
    // CSS options
    css: {
      modules: false,
      extract: true,
      minify: true
    },
    
    // Asset options
    assets: {
      inline: 8192,  // Inline assets < 8KB
      extensions: ['.png', '.jpg', '.svg', '.woff', '.woff2']
    },
    
    // External dependencies
    externals: [],
    
    // Chunk size limits
    chunkSizeWarningLimit: 500 * 1024  // 500KB
  },
  
  // Optimization
  optimization: {
    minify: true,
    obfuscate: false,
    
    // Terser options
    terser: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  
  // Plugins
  plugins: [],
  
  // Alias for imports
  alias: {
    '@': './lib',
    '@components': './lib/widgets',
    '@pages': './lib/pages'
  },
  
  // Define global constants
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  }
};
```

**Config Loader:**

```javascript
class ConfigLoader {
  static async load(configPath = 'flutterjs.config.js') {
    const fullPath = path.resolve(process.cwd(), configPath);
    
    if (!fs.existsSync(fullPath)) {
      console.warn('No config file found, using defaults');
      return this.getDefaultConfig();
    }
    
    // Load config file
    const configModule = await import(fullPath);
    const userConfig = configModule.default || configModule;
    
    // Merge with defaults
    const config = this.mergeConfig(this.getDefaultConfig(), userConfig);
    
    // Validate config
    this.validate(config);
    
    return config;
  }
  
  static getDefaultConfig() {
    return {
      entry: 'lib/main.fjs',
      output: 'dist',
      publicPath: '/',
      sourceMap: true,
      minify: true,
      target: 'spa',
      server: {
        port: 3000,
        host: 'localhost',
        open: true,
        hmr: true
      },
      build: {
        analyze: false,
        splitting: true,
        treeshake: true
      }
    };
  }
  
  static mergeConfig(defaults, user) {
    return deepMerge(defaults, user);
  }
  
  static validate(config) {
    // Validate required fields
    if (!config.entry) {
      throw new Error('Config: entry is required');
    }
    
    // Validate target
    const validTargets = ['spa', 'mpa', 'ssr', 'static'];
    if (!validTargets.includes(config.target)) {
      throw new Error(`Config: invalid target "${config.target}"`);
    }
    
    // Validate port
    if (config.server.port < 1024 || config.server.port > 65535) {
      throw new Error('Config: invalid port number');
    }
  }
}
```

**Validation:**
- ✅ Config loads correctly
- ✅ Defaults merged properly
- ✅ Invalid configs rejected
- ✅ All options respected

---

### 6.1.4 Dependency Management

**File:** `cli/utils/dependency-manager.js`

**Package.json Generation:**

```javascript
async function createPackageJson(projectPath, projectName, options) {
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    description: 'A FlutterJS application',
    type: 'module',
    scripts: {
      dev: 'flutterjs dev',
      build: 'flutterjs build',
      serve: 'flutterjs serve',
      test: 'vitest',
      lint: 'eslint lib/**/*.fjs'
    },
    dependencies: {
      '@flutterjs/core': '^1.0.0',
      '@flutterjs/material': '^1.0.0'
    },
    devDependencies: {
      'flutterjs-cli': '^1.0.0',
      'eslint': '^8.0.0',
      'vitest': '^1.0.0'
    },
    engines: {
      node: '>=18.0.0'
    }
  };
  
  // Add optional dependencies based on options
  if (options.material) {
    packageJson.dependencies['@flutterjs/material'] = '^1.0.0';
  }
  
  if (options.cupertino) {
    packageJson.dependencies['@flutterjs/cupertino'] = '^1.0.0';
  }
  
  if (options.typescript) {
    packageJson.devDependencies['typescript'] = '^5.0.0';
    packageJson.devDependencies['@types/node'] = '^20.0.0';
  }
  
  // Write package.json
  await fs.promises.writeFile(
    path.join(projectPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
}

async function installDependencies(projectPath) {
  console.log('Installing dependencies...');
  
  // Detect package manager
  const packageManager = detectPackageManager();
  
  // Install command
  const installCmd = {
    npm: 'npm install',
    yarn: 'yarn install',
    pnpm: 'pnpm install'
  }[packageManager];
  
  // Run install
  await execCommand(installCmd, { cwd: projectPath });
}

function detectPackageManager() {
  // Check for lock files
  if (fs.existsSync('pnpm-lock.yaml')) return 'pnpm';
  if (fs.existsSync('yarn.lock')) return 'yarn';
  return 'npm';
}
```

**Validation:**
- ✅ package.json created correctly
- ✅ Dependencies installed
- ✅ Package manager detected
- ✅ Scripts work correctly

---

## Phase 6.2: Development Pipeline (Weeks 3-4)

### Objective
Build a fast, feature-rich development server with HMR, live reload, and excellent developer experience.

### 6.2.1 Development Server

**File:** `cli/server/dev-server.js`

**Server Architecture:**

```javascript
import express from 'express';
import { createServer as createViteServer } from 'vite';
import chokidar from 'chokidar';
import WebSocket from 'ws';

class DevServer {
  constructor(config) {
    this.config = config;
    this.app = express();
    this.wss = null;
    this.viteServer = null;
    this.analyzer = null;
    this.fileWatcher = null;
  }
  
  async start() {
    // Create Vite dev server
    this.viteServer = await createViteServer({
      server: {
        middlewareMode: true,
        port: this.config.server.port,
        host: this.config.server.host,
        https: this.config.server.https
      },
      plugins: [
        flutterjsPlugin(this.config)
      ]
    });
    
    // Use Vite middleware
    this.app.use(this.viteServer.middlewares);
    
    // Setup WebSocket for HMR
    this.setupWebSocket();
    
    // Setup file watcher
    this.setupFileWatcher();
    
    // Setup middleware
    this.setupMiddleware();
    
    // Start server
    const server = this.app.listen(this.config.server.port, this.config.server.host, () => {
      const url = `http://${this.config.server.host}:${this.config.server.port}`;
      console.log(chalk.green(`\n✓ Dev server running at ${url}\n`));
      
      if (this.config.server.open) {
        open(url);
      }
    });
    
    // Upgrade to WebSocket
    server.on('upgrade', (request, socket, head) => {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
    });
    
    return server;
  }
  
  setupWebSocket() {
    this.wss = new WebSocket.Server({ noServer: true });
    
    this.wss.on('connection', (ws) => {
      console.log('Client connected');
      
      ws.on('message', (message) => {
        const data = JSON.parse(message);
        this.handleClientMessage(data, ws);
      });
      
      ws.on('close', () => {
        console.log('Client disconnected');
      });
    });
  }
  
  setupFileWatcher() {
    this.fileWatcher = chokidar.watch(['lib/**/*.fjs', 'public/**/*'], {
      ignoreInitial: true,
      ignored: ['**/node_modules/**', '**/.flutterjs/**']
    });
    
    this.fileWatcher.on('change', async (filePath) => {
      console.log(chalk.blue(`File changed: ${filePath}`));
      await this.handleFileChange(filePath);
    });
    
    this.fileWatcher.on('add', async (filePath) => {
      console.log(chalk.green(`File added: ${filePath}`));
      await this.handleFileChange(filePath);
    });
  }
  
  async handleFileChange(filePath) {
    // Re-analyze changed file
    const metadata = await this.analyzer.analyzeFile(filePath);
    
    // Determine what needs to update
    const affectedWidgets = this.analyzer.getAffectedWidgets(filePath);
    
    // Send HMR update to clients
    this.broadcastHMR({
      type: 'update',
      file: filePath,
      widgets: affectedWidgets,
      timestamp: Date.now()
    });
  }
  
  setupMiddleware() {
    // Static files
    this.app.use(express.static('public'));
    
    // API proxy
    if (this.config.server.proxy) {
      Object.entries(this.config.server.proxy).forEach(([path, target]) => {
        this.app.use(path, createProxyMiddleware({ target, changeOrigin: true }));
      });
    }
    
    // Error handler
    this.app.use((err, req, res, next) => {
      console.error(err);
      res.status(500).json({ error: err.message });
    });
  }
  
  broadcastHMR(message) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
  
  async close() {
    if (this.fileWatcher) {
      await this.fileWatcher.close();
    }
    if (this.wss) {
      this.wss.close();
    }
    if (this.viteServer) {
      await this.viteServer.close();
    }
  }
}
```

**Vite Plugin for FlutterJS:**

```javascript
function flutterjsPlugin(config) {
  return {
    name: 'flutterjs',
    
    configureServer(server) {
      // Add custom middleware
      server.middlewares.use((req, res, next) => {
        // Handle .fjs files
        if (req.url.endsWith('.fjs')) {
          return handleFjsFile(req, res);
        }
        next();
      });
    },
    
    async transform(code, id) {
      if (id.endsWith('.fjs')) {
        // Transform .fjs to JS
        const transformed = await transformFjsCode(code);
        return {
          code: transformed,
          map: null
        };
      }
    },
    
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.fjs')) {
        // Trigger HMR for .fjs files
        server.ws.send({
          type: 'custom',
          event: 'flutterjs-update',
          data: { file }
        });
      }
    }
  };
}
```

**Validation:**
- ✅ Server starts without errors
- ✅ Static files served correctly
- ✅ WebSocket connection established
- ✅ File changes detected
- ✅ API proxy works

---

### 6.2.2 Hot Module Replacement (HMR)

**File:** `cli/hmr/hmr-client.js`

**Client-Side HMR:**

```javascript
// Injected into browser
class HMRClient {
  constructor() {
    this.ws = null;
    this.runtime = null;
    this.connected = false;
  }
  
  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}`;
    
    this.ws = new WebSocket(url);
    
    this.ws.onopen = () => {
      console.log('[HMR] Connected');
      this.connected = true;
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
    
    this.ws.onclose = () => {
      console.log('[HMR] Disconnected');
      this.connected = false;
      
      // Attempt reconnection
      setTimeout(() => this.connect(), 1000);
    };
    
    this.ws.onerror = (error) => {
      console.error('[HMR] Error:', error);
    };
  }
  
  handleMessage(message) {
    switch (message.type) {
      case 'update':
        this.handleUpdate(message);
        break;
      case 'reload':
        window.location.reload();
        break;
      case 'error':
        this.showError(message.error);
        break;
    }
  }
  
  async handleUpdate(message) {
    console.log('[HMR] Updating:', message.file);
    
    try {
      // Fetch updated module
      const module = await import(`${message.file}?t=${message.timestamp}`);
      
      // Extract affected widgets
      const widgets = message.widgets || [];
      
      // Hot reload runtime
      if (this.runtime) {
        await this.runtime.hotReload(widgets, module);
      }
      
      console.log('[HMR] Update applied');
    } catch (error) {
      console.error('[HMR] Update failed:', error);
      this.showError(error);
    }
  }
  
  showError(error) {
    // Show error overlay
    const overlay = document.createElement('div');
    overlay.id = 'hmr-error-overlay';
    overlay.innerHTML = `
      <div class="hmr-error">
        <h2>Build Error</h2>
        <pre>${error.message}</pre>
        <button onclick="this.parentElement.parentElement.remove()">Dismiss</button>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  
  setRuntime(runtime) {
    this.runtime = runtime;
  }
}

// Auto-connect
const hmrClient = new HMRClient();
hmrClient.connect();

// Expose globally
window.__HMR__ = hmrClient;
```

**Runtime Hot Reload:**

```javascript
// In runtime system
class RuntimeEngine {
  async hotReload(widgetNames, newModule) {
    // Find affected elements
    const affectedElements = this.findElementsByWidgetType(widgetNames);
    
    // For each affected element
    for (const element of affectedElements) {
      // Get new widget class
      const NewWidgetClass = newModule[element.widget.constructor.name];
      
      if (!NewWidgetClass) continue;
      
      // Create new widget instance with same props
      const newWidget = new NewWidgetClass(element.widget.props);
      
      // Update element
      element.update(newWidget);
      
      // Rebuild
      element.rebuild();
    }
    
    // Preserve state
    this.preserveState();
  }
  
  findElementsByWidgetType(widgetNames) {
    const elements = [];
    
    const traverse = (el) => {
      if (widgetNames.includes(el.widget?.constructor.name)) {
        elements.push(el);
      }
      el.children?.forEach(traverse);
    };
    
    traverse(this.elementTree);
    
    return elements;
  }
  
  preserveState() {
    // Save all stateful widget states
    const states = new Map();
    
    const traverse = (el) => {
      if (el instanceof StatefulElement) {
        states.set(el.id, el.state);
      }
      el.children?.forEach(traverse);
    };
    
    traverse(this.elementTree);
    
    return states;
  }
}
```

**Validation:**
- ✅ HMR client connects to server
- ✅ File changes trigger updates
- ✅ Widgets hot reload without full refresh
- ✅ State preserved during reload
- ✅ Error overlay shows on errors

---

###### 6.2.3 Source Maps & Error Overlay

**File:** `cli/server/error-handler.js`

**Source Map Generation:**

```javascript
import { SourceMapGenerator } from 'source-map';

class SourceMapBuilder {
  constructor() {
    this.generator = new SourceMapGenerator({
      file: 'bundle.js'
    });
  }
  
  // Map transpiled code back to original .fjs source
  addMapping(generatedLine, generatedColumn, originalFile, originalLine, originalColumn) {
    this.generator.addMapping({
      generated: {
        line: generatedLine,
        column: generatedColumn
      },
      source: originalFile,
      original: {
        line: originalLine,
        column: originalColumn
      }
    });
  }
  
  // Set original source content
  setSourceContent(filename, content) {
    this.generator.setSourceContent(filename, content);
  }
  
  // Generate final source map
  generate() {
    return this.generator.toString();
  }
}

// During transpilation
class FjsTranspiler {
  transpile(code, filename) {
    const sourceMap = new SourceMapBuilder();
    const lines = code.split('\n');
    const output = [];
    
    lines.forEach((line, lineNum) => {
      const transformed = this.transformLine(line);
      output.push(transformed);
      
      // Add mapping for each line
      sourceMap.addMapping(
        output.length,        // Generated line
        0,                    // Generated column
        filename,             // Original file
        lineNum + 1,          // Original line
        0                     // Original column
      );
    });
    
    sourceMap.setSourceContent(filename, code);
    
    return {
      code: output.join('\n'),
      map: sourceMap.generate()
    };
  }
}
```

**Error Overlay System:**

```javascript
class ErrorOverlay {
  constructor() {
    this.container = null;
  }
  
  show(error) {
    // Remove existing overlay
    this.hide();
    
    // Create overlay container
    this.container = document.createElement('div');
    this.container.id = 'flutterjs-error-overlay';
    this.container.innerHTML = this.renderError(error);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = this.getStyles();
    this.container.appendChild(style);
    
    // Add to DOM
    document.body.appendChild(this.container);
    
    // Add event listeners
    this.container.querySelector('.close-btn')?.addEventListener('click', () => {
      this.hide();
    });
  }
  
  hide() {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
  
  renderError(error) {
    const { message, file, line, column, stack, codeFrame } = this.parseError(error);
    
    return `
      <div class="error-overlay-backdrop">
        <div class="error-overlay-content">
          <div class="error-header">
            <h2>Build Error</h2>
            <button class="close-btn">×</button>
          </div>
          
          <div class="error-location">
            <strong>${file}:${line}:${column}</strong>
          </div>
          
          <div class="error-message">
            ${this.escapeHtml(message)}
          </div>
          
          ${codeFrame ? `
            <div class="error-code-frame">
              <pre><code>${this.escapeHtml(codeFrame)}</code></pre>
            </div>
          ` : ''}
          
          <details class="error-stack">
            <summary>Stack Trace</summary>
            <pre><code>${this.escapeHtml(stack)}</code></pre>
          </details>
          
          <div class="error-hint">
            💡 This error overlay will disappear when you fix the error.
          </div>
        </div>
      </div>
    `;
  }
  
  parseError(error) {
    // Extract error information
    const message = error.message || 'Unknown error';
    const stack = error.stack || '';
    
    // Parse stack trace for file location
    const stackMatch = stack.match(/at .+ \((.+):(\d+):(\d+)\)/);
    const file = stackMatch?.[1] || 'unknown';
    const line = stackMatch?.[2] || '?';
    const column = stackMatch?.[3] || '?';
    
    // Generate code frame
    const codeFrame = this.generateCodeFrame(file, parseInt(line), parseInt(column));
    
    return { message, file, line, column, stack, codeFrame };
  }
  
  generateCodeFrame(file, line, column) {
    try {
      // Read source file
      const source = fs.readFileSync(file, 'utf-8');
      const lines = source.split('\n');
      
      // Get surrounding lines (3 before, 3 after)
      const start = Math.max(0, line - 4);
      const end = Math.min(lines.length, line + 3);
      
      let frame = '';
      for (let i = start; i < end; i++) {
        const lineNum = i + 1;
        const isErrorLine = lineNum === line;
        const prefix = isErrorLine ? '>' : ' ';
        const lineNumStr = String(lineNum).padStart(4, ' ');
        
        frame += `${prefix} ${lineNumStr} | ${lines[i]}\n`;
        
        // Add pointer to error column
        if (isErrorLine && column) {
          const spaces = ' '.repeat(column + 8);
          frame += `${spaces}^\n`;
        }
      }
      
      return frame;
    } catch {
      return null;
    }
  }
  
  getStyles() {
    return `
      #flutterjs-error-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      
      .error-overlay-backdrop {
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow: auto;
      }
      
      .error-overlay-content {
        background: #1e1e1e;
        color: #d4d4d4;
        border-radius: 8px;
        padding: 24px;
        max-width: 800px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }
      
      .error-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 16px;
        border-bottom: 1px solid #333;
      }
      
      .error-header h2 {
        margin: 0;
        color: #f48771;
        font-size: 20px;
      }
      
      .close-btn {
        background: none;
        border: none;
        color: #d4d4d4;
        font-size: 32px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }
      
      .close-btn:hover {
        background: #333;
      }
      
      .error-location {
        margin-bottom: 12px;
        color: #4ec9b0;
        font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
        font-size: 13px;
      }
      
      .error-message {
        margin-bottom: 20px;
        color: #f48771;
        font-size: 14px;
        line-height: 1.6;
      }
      
      .error-code-frame {
        background: #252526;
        border: 1px solid #333;
        border-radius: 4px;
        padding: 16px;
        margin-bottom: 20px;
        overflow-x: auto;
      }
      
      .error-code-frame pre {
        margin: 0;
        font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
        font-size: 12px;
        line-height: 1.5;
      }
      
      .error-stack {
        margin-bottom: 16px;
        background: #252526;
        border: 1px solid #333;
        border-radius: 4px;
        padding: 12px;
      }
      
      .error-stack summary {
        cursor: pointer;
        user-select: none;
        color: #4ec9b0;
        font-size: 13px;
      }
      
      .error-stack summary:hover {
        color: #5fd3ba;
      }
      
      .error-stack pre {
        margin: 12px 0 0 0;
        font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
        font-size: 11px;
        line-height: 1.5;
        overflow-x: auto;
      }
      
      .error-hint {
        color: #858585;
        font-size: 12px;
        font-style: italic;
      }
    `;
  }
  
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, c => map[c]);
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  if (window.__DEV__) {
    const overlay = new ErrorOverlay();
    overlay.show(event.error);
    event.preventDefault();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (window.__DEV__) {
    const overlay = new ErrorOverlay();
    overlay.show(event.reason);
    event.preventDefault();
  }
});
```

**Validation:**
- ✅ Source maps generated correctly
- ✅ Errors show original .fjs file location
- ✅ Error overlay displays with context
- ✅ Code frame highlights error line
- ✅ Stack traces readable

---

### 6.2.4 Live Reload & Watch System

**File:** `cli/server/file-watcher.js`

**Advanced File Watching:**

```javascript
import chokidar from 'chokidar';
import path from 'path';

class FileWatcher {
  constructor(config, callbacks) {
    this.config = config;
    this.callbacks = callbacks;
    this.watcher = null;
    this.debounceTimers = new Map();
  }
  
  start() {
    const watchPaths = [
      'lib/**/*.fjs',
      'public/**/*',
      'assets/**/*',
      'flutterjs.config.js'
    ];
    
    this.watcher = chokidar.watch(watchPaths, {
      ignoreInitial: true,
      ignored: [
        '**/node_modules/**',
        '**/.flutterjs/**',
        '**/dist/**',
        '**/.git/**'
      ],
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50
      }
    });
    
    // File changed
    this.watcher.on('change', (filePath) => {
      this.handleChange(filePath, 'change');
    });
    
    // File added
    this.watcher.on('add', (filePath) => {
      this.handleChange(filePath, 'add');
    });
    
    // File deleted
    this.watcher.on('unlink', (filePath) => {
      this.handleChange(filePath, 'unlink');
    });
    
    console.log(chalk.blue('👀 Watching for file changes...'));
  }
  
  handleChange(filePath, eventType) {
    const normalizedPath = path.normalize(filePath);
    const ext = path.extname(normalizedPath);
    
    // Debounce rapid changes
    this.debounce(normalizedPath, () => {
      console.log(chalk.cyan(`[${eventType}] ${normalizedPath}`));
      
      // Determine file type and trigger appropriate action
      if (ext === '.fjs') {
        this.handleFjsChange(normalizedPath, eventType);
      } else if (normalizedPath === 'flutterjs.config.js') {
        this.handleConfigChange();
      } else if (normalizedPath.startsWith('public/')) {
        this.handlePublicFileChange(normalizedPath);
      } else if (normalizedPath.startsWith('assets/')) {
        this.handleAssetChange(normalizedPath);
      }
    }, 200);
  }
  
  async handleFjsChange(filePath, eventType) {
    try {
      if (eventType === 'unlink') {
        // File deleted
        this.callbacks.onFileDelete?.(filePath);
        this.callbacks.onReload?.();
        return;
      }
      
      // Re-analyze file
      const metadata = await this.callbacks.onAnalyze?.(filePath);
      
      // Determine affected widgets
      const affectedWidgets = this.getAffectedWidgets(filePath, metadata);
      
      // Trigger HMR if possible, otherwise full reload
      if (this.canHotReload(affectedWidgets)) {
        this.callbacks.onHMR?.({
          file: filePath,
          widgets: affectedWidgets,
          timestamp: Date.now()
        });
      } else {
        this.callbacks.onReload?.();
      }
    } catch (error) {
      console.error(chalk.red(`Error handling ${filePath}:`), error);
      this.callbacks.onError?.(error);
    }
  }
  
  handleConfigChange() {
    console.log(chalk.yellow('⚙️  Config changed, restarting server...'));
    this.callbacks.onConfigChange?.();
  }
  
  handlePublicFileChange(filePath) {
    console.log(chalk.green('📄 Public file changed, reloading...'));
    this.callbacks.onReload?.();
  }
  
  handleAssetChange(filePath) {
    console.log(chalk.green('🖼️  Asset changed, reloading...'));
    this.callbacks.onReload?.();
  }
  
  canHotReload(affectedWidgets) {
    // Can't hot reload if:
    // - Main entry point changed
    // - Config changed
    // - Global state providers changed
    
    const nonHotReloadable = ['MyApp', 'MaterialApp', 'main'];
    
    return !affectedWidgets.some(w => nonHotReloadable.includes(w));
  }
  
  getAffectedWidgets(filePath, metadata) {
    // Extract widget names from metadata
    return Object.keys(metadata?.widgets || {});
  }
  
  debounce(key, callback, delay) {
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }
    
    const timer = setTimeout(() => {
      callback();
      this.debounceTimers.delete(key);
    }, delay);
    
    this.debounceTimers.set(key, timer);
  }
  
  async close() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
    
    // Clear all pending timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}
```

**Validation:**
- ✅ File changes detected immediately
- ✅ Rapid changes debounced
- ✅ Correct change type identified
- ✅ HMR triggered when possible
- ✅ Full reload as fallback

---

## Phase 6.3: Production Build Pipeline (Weeks 5-6)

### Objective
Create an optimized production build system with bundling, minification, code splitting, and tree-shaking.

### 6.3.1 JavaScript Bundling

**File:** `cli/bundler/js-bundler.js`

**Bundler Architecture:**

```javascript
import * as esbuild from 'esbuild';
import { builtinModules } from 'module';

class JavaScriptBundler {
  constructor(config) {
    this.config = config;
    this.entryPoint = config.entry;
    this.outputDir = config.output;
  }
  
  async bundle() {
    const startTime = Date.now();
    
    try {
      const result = await esbuild.build({
        entryPoints: [this.entryPoint],
        bundle: true,
        outdir: this.outputDir,
        
        // Splitting & chunking
        splitting: this.config.build.splitting,
        format: 'esm',
        chunkNames: 'chunks/[name]-[hash]',
        
        // Minification
        minify: this.config.minify,
        minifyWhitespace: true,
        minifyIdentifiers: true,
        minifySyntax: true,
        
        // Tree-shaking
        treeShaking: this.config.build.treeshake,
        
        // Source maps
        sourcemap: this.config.sourceMap ? 'linked' : false,
        sourcesContent: true,
        
        // Target
        target: ['es2020', 'chrome90', 'firefox88', 'safari14'],
        
        // Platform
        platform: 'browser',
        
        // Externals
        external: [
          ...builtinModules,
          ...this.config.build.externals
        ],
        
        // Plugins
        plugins: [
          flutterjsResolverPlugin(this.config),
          cssPlugin(this.config),
          assetPlugin(this.config)
        ],
        
        // Define globals
        define: {
          'process.env.NODE_ENV': JSON.stringify('production'),
          '__DEV__': 'false',
          ...this.config.define
        },
        
        // Aliases
        alias: this.config.alias || {},
        
        // Loader configuration
        loader: {
          '.png': 'file',
          '.jpg': 'file',
          '.jpeg': 'file',
          '.svg': 'file',
          '.woff': 'file',
          '.woff2': 'file',
          '.ttf': 'file'
        },
        
        // Asset names
        assetNames: 'assets/[name]-[hash]',
        
        // Metafile for analysis
        metafile: true,
        
        // Write to disk
        write: true
      });
      
      const buildTime = Date.now() - startTime;
      
      return {
        success: true,
        outputs: result.outputFiles || [],
        metafile: result.metafile,
        buildTime,
        warnings: result.warnings,
        errors: result.errors
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        errors: error.errors || [],
        warnings: error.warnings || []
      };
    }
  }
  
  async analyze() {
    const result = await this.bundle();
    
    if (!result.success) {
      throw new Error(`Build failed: ${result.error}`);
    }
    
    // Analyze bundle
    const analysis = await this.analyzeMetafile(result.metafile);
    
    return analysis;
  }
  
  async analyzeMetafile(metafile) {
    const outputs = metafile.outputs;
    const inputs = metafile.inputs;
    
    // Calculate sizes
    const totalSize = Object.values(outputs)
      .reduce((sum, output) => sum + output.bytes, 0);
    
    // Group by type
    const byType = {};
    Object.entries(outputs).forEach(([path, output]) => {
      const ext = path.split('.').pop();
      byType[ext] = (byType[ext] || 0) + output.bytes;
    });
    
    // Find largest modules
    const modules = Object.entries(inputs)
      .map(([path, input]) => ({
        path,
        size: input.bytes
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 20);
    
    return {
      totalSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      byType,
      modules,
      outputCount: Object.keys(outputs).length
    };
  }
  
  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

// FlutterJS resolver plugin
function flutterjsResolverPlugin(config) {
  return {
    name: 'flutterjs-resolver',
    setup(build) {
      // Resolve @flutterjs/* packages
      build.onResolve({ filter: /^@flutterjs\// }, (args) => {
        const packageName = args.path.replace('@flutterjs/', '');
        const packagePath = path.resolve(
          __dirname,
          '../../packages',
          packageName,
          'index.js'
        );
        
        return { path: packagePath };
      });
      
      // Resolve .fjs files
      build.onResolve({ filter: /\.fjs$/ }, (args) => {
        return {
          path: path.resolve(args.resolveDir, args.path),
          namespace: 'flutterjs'
        };
      });
    }
  };
}
```

**Code Splitting Strategy:**

```javascript
class CodeSplitter {
  constructor(config) {
    this.config = config;
  }
  
  getChunkingStrategy() {
    return {
      // Vendor chunk: node_modules
      'vendor': /node_modules/,
      
      // FlutterJS runtime
      'runtime': /@flutterjs\/(core|runtime)/,
      
      // Material Design widgets
      'material': /@flutterjs\/material/,
      
      // App code (default chunk)
      'app': /lib\//
    };
  }
  
  shouldSplitChunk(module) {
    const strategy = this.getChunkingStrategy();
    
    for (const [chunkName, pattern] of Object.entries(strategy)) {
      if (pattern.test(module.path)) {
        return chunkName;
      }
    }
    
    return 'app';
  }
}
```

**Validation:**
- ✅ Bundle created successfully
- ✅ Code splitting works
- ✅ Minification reduces size
- ✅ Source maps generated
- ✅ External deps excluded

---

### 6.3.2 CSS Processing & Optimization

**File:** `cli/bundler/css-processor.js`

**CSS Pipeline:**

```javascript
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import { PurgeCSS } from 'purgecss';

class CSSProcessor {
  constructor(config) {
    this.config = config;
  }
  
  async process(cssContent, sourcePath) {
    let processed = cssContent;
    
    // 1. PostCSS transformations
    processed = await this.runPostCSS(processed, sourcePath);
    
    // 2. Purge unused CSS (production only)
    if (this.config.minify) {
      processed = await this.purgeUnused(processed);
    }
    
    // 3. Minify
    if (this.config.build.css.minify) {
      processed = await this.minify(processed);
    }
    
    return processed;
  }
  
  async runPostCSS(css, sourcePath) {
    const result = await postcss([
      autoprefixer({
        overrideBrowserslist: [
          'last 2 versions',
          'not dead',
          'not ie 11'
        ]
      })
    ]).process(css, {
      from: sourcePath,
      to: sourcePath
    });
    
    return result.css;
  }
  
  async purgeUnused(css) {
    const purgeCSSResult = await new PurgeCSS().purge({
      content: [
        `${this.config.output}/**/*.html`,
        `${this.config.output}/**/*.js`
      ],
      css: [{ raw: css }],
      safelist: [
        // Always keep these classes
        /^fjs-/,
        /^md-sys-/,
        /^material-icons/
      ],
      defaultExtractor: content => {
        // Extract class names from content
        return content.match(/[\w-/:]+(?<!:)/g) || [];
      }
    });
    
    return purgeCSSResult[0]?.css || css;
  }
  
  async minify(css) {
    const result = await postcss([
      cssnano({
        preset: ['default', {
          discardComments: { removeAll: true },
          normalizeWhitespace: true,
          mergeLonghand: true,
          mergeRules: true,
          minifyFontValues: true,
          minifyGradients: true,
          minifySelectors: true
        }]
      })
    ]).process(css, { from: undefined });
    
    return result.css;
  }
  
  async extractCritical(css, html) {
    // Extract only CSS needed for above-the-fold content
    const critical = await this.getCriticalCSS(html);
    
    return {
      critical,
      remaining: this.removeCriticalFromFull(css, critical)
    };
  }
  
  async getCriticalCSS(html) {
    // Parse HTML, find all classes/IDs used above fold
    // Extract only relevant CSS rules
    // Return minimal CSS for initial render
    
    // Simplified implementation
    const usedSelectors = this.extractSelectorsFromHTML(html);
    const criticalRules = this.filterCSSRules(css, usedSelectors);
    
    return criticalRules;
  }
  
  extractSelectorsFromHTML(html) {
    const selectors = new Set();
    
    // Extract classes
    const classMatches = html.matchAll(/class="([^"]+)"/g);
    for (const match of classMatches) {
      match[1].split(/\s+/).forEach(cls => selectors.add(`.${cls}`));
    }
    
    // Extract IDs
    const idMatches = html.matchAll(/id="([^"]+)"/g);
    for (const match of idMatches) {
      selectors.add(`#${match[1]}`);
    }
    
    return Array.from(selectors);
  }
  
  filterCSSRules(css, selectors) {
    // Parse CSS and filter rules matching selectors
    // Return filtered CSS
    // Simplified - would use real CSS parser
    
    return css; // Placeholder
  }
  
  removeCriticalFromFull(fullCSS, criticalCSS) {
    // Remove critical CSS from full CSS
    // Return remaining CSS for async loading
    
    return fullCSS; // Placeholder
  }
}

// esbuild CSS plugin
function cssPlugin(config) {
  return {
    name: 'css-processor',
    setup(build) {
      const processor = new CSSProcessor(config);
      
      build.onLoad({ filter: /\.css$/ }, async (args) => {
        const source = await fs.promises.readFile(args.path, 'utf8');
        const processed = await processor.process(source, args.path);
        
        return {
          contents: processed,
          loader: 'css'
        };
      });
    }
  };
}
```

**Material Design CSS Generation:**

```javascript
class MaterialCSSGenerator {
  generate(theme) {
    return `
:root {
  /* Primary colors */
  --md-sys-color-primary: ${theme.primaryColor};
  --md-sys-color-on-primary: ${theme.onPrimaryColor};
  --md-sys-color-primary-container: ${theme.primaryContainerColor};
  --md-sys-color-on-primary-container: ${theme.onPrimaryContainerColor};
  
  /* Surface colors */
  --md-sys-color-surface: ${theme.surfaceColor};
  --md-sys-color-on-surface: ${theme.onSurfaceColor};
  --md-sys-color-surface-variant: ${theme.surfaceVariantColor};
  --md-sys-color-on-surface-variant: ${theme.onSurfaceVariantColor};
  
  /* Typography */
  --md-sys-typescale-body-large-font: ${theme.bodyFont};
  --md-sys-typescale-body-large-size: ${theme.bodySize};
  --md-sys-typescale-body-large-weight: ${theme.bodyWeight};
  --md-sys-typescale-body-large-line-height: ${theme.bodyLineHeight};
  
  /* Spacing */
  --md-sys-spacing-small: 8px;
  --md-sys-spacing-medium: 16px;
  --md-sys-spacing-large: 24px;
  
  /* Elevation */
  --md-sys-elevation-1: 0 1px 2px rgba(0,0,0,0.3);
  --md-sys-elevation-2: 0 2px 6px rgba(0,0,0,0.3);
  --md-sys-elevation-3: 0 4px 12px rgba(0,0,0,0.3);
}

/* Base styles */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: var(--md-sys-typescale-body-large-font);
  font-size: var(--md-sys-typescale-body-large-size);
  font-weight: var(--md-sys-typescale-body-large-weight);
  line-height: var(--md-sys-typescale-body-large-line-height);
  color: var(--md-sys-color-on-surface);
  background-color: var(--md-sys-color-surface);
}

/* FlutterJS widget styles */
.fjs-scaffold {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.fjs-app-bar {
  background-color: var(--md-sys-color-surface);
  box-shadow: var(--md-sys-elevation-2);
  padding: 12px 16px;
  min-height: 56px;
  display: flex;
  align-items: center;
}

.fjs-column {
  display: flex;
  flex-direction: column;
}

.fjs-row {
  display: flex;
  flex-direction: row;
}

.fjs-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.fjs-button {
  padding: 10px 24px;
  border-radius: 20px;
  border: none;
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.fjs-button:hover {
  box-shadow: var(--md-sys-elevation-2);
}

.fjs-button:active {
  box-shadow: var(--md-sys-elevation-1);
}

.fjs-floating-action-button {
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border: none;
  box-shadow: var(--md-sys-elevation-3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ... more widget styles ... */
`;
  }
}
```

**Validation:**
- ✅ CSS processed with autoprefixer
- ✅ Unused CSS purged
- ✅ CSS minified correctly
- ✅ Critical CSS extracted
- ✅ Material Design CSS generated

---

### 6.3.3 Asset Handling & Optimization

**File:** `cli/bundler/asset-handler.js`

**Asset Processing:**

```javascript
import sharp from 'sharp';
import { optimize } from 'svgo';

class AssetHandler {
  constructor(config) {
    this.config = config;
    this.outputDir = config.output;
    this.assetDir = path.join(this.outputDir, 'assets');
  }
  
  async processAssets() {
    const assetFiles = await this.findAssets();
    const results = [];
    
    for (const asset of assetFiles) {
      const result = await this.processAsset(asset);
      results.push(result);
    }
    
    return results;
  }
  
  async findAssets() {
    const patterns = this.config.build.assets.extensions;
    const assetDir = 'assets';
    
    const files = [];
    
    for (const pattern of patterns) {
      const matches = await glob(`${assetDir}/**/*${pattern}`);
      files.push(...matches);
    }
    
    return files;
  }
  
  async processAsset(assetPath) {
    const ext = path.extname(assetPath).toLowerCase();
    
    switch (ext) {
      case '.png':
      case '.jpg':
      case '.jpeg':
        return await this.optimizeImage(assetPath);
      
      case '.svg':
        return await this.optimizeSVG(assetPath);
      
      case '.woff':
      case '.woff2':
      case '.ttf':
        return await this.copyFont(assetPath);
      
      default:
        return await this.copyAsset(assetPath);
    }
  }
  
  async optimizeImage(imagePath) {
    const buffer = await fs.promises.readFile(imagePath);
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    // Determine if should inline (< 8KB)
    const size = buffer.length;
    const shouldInline = size < this.config.build.assets.inline;
    
    if (shouldInline) {
      // Inline as data URL
      const base64 = buffer.toString('base64');
      const mimeType = `image/${metadata.format}`;
      return {
        path: imagePath,
        inline: true,
        dataUrl: `data:${mimeType};base64,${base64}`,
        size
      };
    }
    
    // Optimize and copy
    const outputPath = this.getOutputPath(imagePath);
    
    await image
      .resize(metadata.width, metadata.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85, progressive: true })
      .png({ compressionLevel: 9, progressive: true })
      .webp({ quality: 85 })
      .toFile(outputPath);
    
    const optimizedSize = (await fs.promises.stat(outputPath)).size;
    
    return {
      path: imagePath,
      outputPath,
      inline: false,
      originalSize: size,
      optimizedSize,
      saved: size - optimizedSize
    };
  }
  
  async optimizeSVG(svgPath) {
    const svg = await fs.promises.readFile(svgPath, 'utf8');
    
    const result = optimize(svg, {
      plugins: [
        'removeDoctype',
        'removeXMLProcInst',
        'removeComments',
        'removeMetadata',
        'removeEditorsNSData',
        'cleanupAttrs',
        'mergeStyles',
        'inlineStyles',
        'minifyStyles',
        'cleanupIDs',
        'removeUselessDefs',
        'cleanupNumericValues',
        'convertColors',
        'removeUnknownsAndDefaults',
        'removeNonInheritableGroupAttrs',
        'removeUselessStrokeAndFill',
        'removeViewBox',
        'cleanupEnableBackground',
        'removeHiddenElems',
        'removeEmptyText',
        'convertShapeToPath',
        'convertEllipseToCircle',
        'moveElemsAttrsToGroup',
        'moveGroupAttrsToElems',
        'collapseGroups',
        'convertPathData',
        'convertTransform',
        'removeEmptyAttrs',
        'removeEmptyContainers',
        'mergePaths',
        'removeUnusedNS',
        'sortDefsChildren',
        'removeTitle',
        'removeDesc'
      ]
    });
    
    const outputPath = this.getOutputPath(svgPath);
    await fs.promises.writeFile(outputPath, result.data);
    
    return {
      path: svgPath,
      outputPath,
      originalSize: Buffer.byteLength(svg),
      optimizedSize: Buffer.byteLength(result.data)
    };
  }
  
  async copyFont(fontPath) {
    const outputPath = this.getOutputPath(fontPath);
    await fs.promises.copyFile(fontPath, outputPath);
    
    return {
      path: fontPath,
      outputPath,
      copied: true
    };
  }
  
  async copyAsset(assetPath) {
    const outputPath = this.getOutputPath(assetPath);
    await fs.promises.copyFile(assetPath, outputPath);
    
    return {
      path: assetPath,
      outputPath,
      copied: true
    };
  }
  
  getOutputPath(assetPath) {
    const relativePath = path.relative('assets', assetPath);
    return path.join(this.assetDir, relativePath);
  }
  
  async generateAssetManifest(processedAssets) {
    const manifest = {};
    
    processedAssets.forEach(asset => {
      if (asset.inline) {
        manifest[asset.path] = {
          type: 'inline',
          dataUrl: asset.dataUrl,
          size: asset.size
        };
      } else {
        manifest[asset.path] = {
          type: 'file',
          url: `/${path.relative(this.outputDir, asset.outputPath)}`,
          size: asset.optimizedSize || asset.size
        };
      }
    });
    
    const manifestPath = path.join(this.outputDir, 'asset-manifest.json');
    await fs.promises.writeFile(
      manifestPath,
      JSON.stringify(manifest, null, 2)
    );
    
    return manifest;
  }
}

// esbuild asset plugin
function assetPlugin(config) {
  return {
    name: 'asset-handler',
    setup(build) {
      const handler = new AssetHandler(config);
      
      // Handle image imports
      build.onLoad({ filter: /\.(png|jpg|jpeg|svg)$/ }, async (args) => {
        const asset = await handler.processAsset(args.path);
        
        if (asset.inline) {
          // Return as data URL
          return {
            contents: `export default "${asset.dataUrl}"`,
            loader: 'js'
          };
        } else {
          // Return as file path
          return {
            contents: `export default "/${path.relative(config.output, asset.outputPath)}"`,
            loader: 'js'
          };
        }
      });
    }
  };
}
```

**Validation:**
- ✅ Images optimized (smaller size)
- ✅ SVGs optimized
- ✅ Small assets inlined as data URLs
- ✅ Fonts copied correctly
- ✅ Asset manifest generated

---

### 6.3.4 Tree-Shaking Implementation

**File:** `cli/bundler/tree-shaker.js`

**Dead Code Elimination:**

```javascript
class TreeShaker {
  constructor(config) {
    this.config = config;
    this.usedExports = new Set();
    this.unusedExports = new Set();
  }
  
  async analyze(entryPoint) {
    // Parse entry point
    const ast = await this.parseFile(entryPoint);
    
    // Build dependency graph
    const graph = await this.buildDependencyGraph(ast, entryPoint);
    
    // Mark used exports
    this.markUsedExports(graph);
    
    // Find unused exports
    this.findUnusedExports(graph);
    
    return {
      usedExports: Array.from(this.usedExports),
      unusedExports: Array.from(this.unusedExports),
      savings: this.calculateSavings()
    };
  }
  
  async buildDependencyGraph(ast, filePath) {
    const graph = {
      nodes: new Map(),
      edges: []
    };
    
    // Extract imports and exports
    const imports = this.extractImports(ast);
    const exports = this.extractExports(ast);
    
    graph.nodes.set(filePath, {
      imports,
      exports,
      ast
    });
    
    // Recursively analyze dependencies
    for (const imp of imports) {
      const depPath = await this.resolveImport(imp.source, filePath);
      if (depPath && !graph.nodes.has(depPath)) {
        const depAst = await this.parseFile(depPath);
        await this.buildDependencyGraph(depAst, depPath);
      }
      
      graph.edges.push({
        from: filePath,
        to: depPath,
        imported: imp.specifiers
      });
    }
    
    return graph;
  }
  
  extractImports(ast) {
    const imports = [];
    
    // Traverse AST to find import declarations
    this.traverse(ast, {
      ImportDeclaration(node) {
        imports.push({
          source: node.source.value,
          specifiers: node.specifiers.map(s => ({
            imported: s.imported?.name || 'default',
            local: s.local.name
          }))
        });
      }
    });
    
    return imports;
  }
  
  extractExports(ast) {
    const exports = [];
    
    this.traverse(ast, {
      ExportNamedDeclaration(node) {
        if (node.declaration) {
          // export const x = ...
          // export function foo() {}
          exports.push({
            type: 'named',
            name: this.getDeclarationName(node.declaration)
          });
        } else {
          // export { x, y }
          node.specifiers.forEach(spec => {
            exports.push({
              type: 'named',
              name: spec.exported.name
            });
          });
        }
      },
      
      ExportDefaultDeclaration(node) {
        exports.push({
          type: 'default',
          name: 'default'
        });
      }
    });
    
    return exports;
  }
  
  markUsedExports(graph) {
    // Start from entry point
    const entryNode = graph.nodes.values().next().value;
    
    // Mark all imports from entry as used
    const queue = [entryNode];
    const visited = new Set();
    
    while (queue.length > 0) {
      const node = queue.shift();
      if (visited.has(node)) continue;
      visited.add(node);
      
      // Mark all imports as used
      node.imports?.forEach(imp => {
        imp.specifiers.forEach(spec => {
          this.usedExports.add(`${imp.source}:${spec.imported}`);
        });
        
        // Add imported module to queue
        const depNode = this.findNode(graph, imp.source);
        if (depNode) queue.push(depNode);
      });
    }
  }
  
  findUnusedExports(graph) {
    // Check all exports in graph
    graph.nodes.forEach((node, filePath) => {
      node.exports?.forEach(exp => {
        const key = `${filePath}:${exp.name}`;
        if (!this.usedExports.has(key)) {
          this.unusedExports.add(key);
        }
      });
    });
  }
  
  calculateSavings() {
    // Estimate size savings from removing unused exports
    return {
      unusedCount: this.unusedExports.size,
      estimatedSavingsKB: this.unusedExports.size * 0.5 // Rough estimate
    };
  }
  
  async removeUnusedExports(code, filePath) {
    const ast = await this.parseFile(filePath);
    const unusedInFile = Array.from(this.unusedExports)
      .filter(key => key.startsWith(`${filePath}:`))
      .map(key => key.split(':')[1]);
    
    // Remove unused export declarations
    this.traverse(ast, {
      ExportNamedDeclaration(node, parent, key) {
        const name = this.getDeclarationName(node.declaration);
        if (unusedInFile.includes(name)) {
          // Remove this node
          parent[key] = null;
        }
      }
    });
    
    // Generate code from modified AST
    return this.generate(ast);
  }
}
```

**Integration with Bundler:**

```javascript
// In JavaScriptBundler
async bundleWithTreeShaking() {
  const shaker = new TreeShaker(this.config);
  
  // Analyze what's used
  const analysis = await shaker.analyze(this.entryPoint);
  
  console.log(`Tree-shaking removed ${analysis.unusedCount} unused exports`);
  console.log(`Estimated savings: ${analysis.estimatedSavingsKB} KB`);
  
  // Bundle with dead code elimination
  return await this.bundle({
    treeShaking: true,
    sideEffects: false
  });
}
```

**Validation:**
- ✅ Unused exports detected
- ✅ Unused code removed
- ✅ Bundle size reduced
- ✅ Used code preserved
- ✅ No runtime errors

---

## Phase 6.4: Advanced Build Features (Weeks 7-8)

### Objective
Implement advanced build features for production optimization and multiple deployment targets.

### 6.4.1 Multiple Build Targets

**File:** `cli/bundler/target-builder.js`

**Build Target System:**

```javascript
class TargetBuilder {
  constructor(config) {
    this.config = config;
    this.target = config.target;
  }
  
  async build() {
    switch (this.target) {
      case 'spa':
        return await this.buildSPA();
      
      case 'mpa':
        return await this.buildMPA();
      
      case 'ssr':
        return await this.buildSSR();
      
      case 'static':
        return await this.buildStatic();
      
      default:
        throw new Error(`Unknown target: ${this.target}`);
    }
  }
  
  // Single Page Application
  async buildSPA() {
    const bundler = new JavaScriptBundler(this.config);
    const result = await bundler.bundle();
    
    // Generate index.html
    const html = this.generateSPAHTML({
      title: this.config.title || 'FlutterJS App',
      scripts: result.outputs.filter(o => o.path.endsWith('.js')),
      styles: result.outputs.filter(o => o.path.endsWith('.css'))
    });
    
    await fs.promises.writeFile(
      path.join(this.config.output, 'index.html'),
      html
    );
    
    return result;
  }
  
  generateSPAHTML({ title, scripts, styles }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="A FlutterJS application">
  <title>${title}</title>
  ${styles.map(s => `<link rel="stylesheet" href="/${path.relative(this.config.output, s.path)}">`).join('\n  ')}
</head>
<body>
  <div id="root"></div>
  ${scripts.map(s => `<script type="module" src="/${path.relative(this.config.output, s.path)}"></script>`).join('\n  ')}
</body>
</html>`;
  }
  
  // Multi-Page Application
  async buildMPA() {
    // Find all entry points (pages)
    const pages = await this.findPages();
    
    const results = [];
    
    // Build each page separately
    for (const page of pages) {
      const pageConfig = { ...this.config, entry: page.entry };
      const bundler = new JavaScriptBundler(pageConfig);
      const result = await bundler.bundle();
      
      // Generate HTML for this page
      const html = this.generatePageHTML(page, result);
      await fs.promises.writeFile(
        path.join(this.config.output, page.name, 'index.html'),
        html
      );
      
      results.push({ page: page.name, result });
    }
    
    return results;
  }
  
  async findPages() {
    const pagesDir = 'lib/pages';
    const files = await glob(`${pagesDir}/**/main.fjs`);
    
    return files.map(file => ({
      name: path.dirname(path.relative(pagesDir, file)),
      entry: file
    }));
  }
  
  // Server-Side Rendering
  async buildSSR() {
    // Build client bundle
    const clientResult = await this.buildSPA();
    
    // Build server bundle
    const serverConfig = {
      ...this.config,
      platform: 'node',
      output: path.join(this.config.output, 'server')
    };
    
    const serverBundler = new JavaScriptBundler(serverConfig);
    const serverResult = await serverBundler.bundle();
    
    // Generate server entry point
    await this.generateServerEntry();
    
    return {
      client: clientResult,
      server: serverResult
    };
  }
  
  async generateServerEntry() {
    const serverEntry = `
import express from 'express';
import { renderToString } from '@flutterjs/server';
import { MyApp } from './lib/main.fjs';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('${this.config.output}'));

app.get('*', async (req, res) => {
  try {
    const html = await renderToString(new MyApp());
    
    res.send(\`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FlutterJS App</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div id="root">\${html}</div>
  <script type="module" src="/main.js"></script>
</body>
</html>\`);
  } catch (error) {
    console.error('SSR Error:', error);
    res.status(500).send('Server Error');
  }
});

app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
});
`;
    
    await fs.promises.writeFile(
      path.join(this.config.output, 'server', 'index.js'),
      serverEntry
    );
  }
  
  // Static Site Generation
  async buildStatic() {
    // Build SSR first
    const ssrResult = await this.buildSSR();
    
    // Pre-render all routes
    const routes = await this.findRoutes();
    
    for (const route of routes) {
      const html = await this.prerenderRoute(route);
      const outputPath = this.getStaticPath(route);
      
      await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.promises.writeFile(outputPath, html);
    }
    
    return ssrResult;
  }
  
  async findRoutes() {
    // Extract routes from router configuration
    // For now, return default routes
    return [
      '/',
      '/about',
      '/contact'
    ];
  }
  
  async prerenderRoute(route) {
    // Load server bundle
    const serverBundle = await import(
      path.join(this.config.output, 'server', 'index.js')
    );
    
    // Render route to HTML
    const html = await serverBundle.renderToString(route);
    
    return html;
  }
  
  getStaticPath(route) {
    if (route === '/') {
      return path.join(this.config.output, 'index.html');
    }
    
    return path.join(this.config.output, route, 'index.html');
  }
}
```

**Validation:**
- ✅ SPA build works
- ✅ MPA build creates separate pages
- ✅ SSR build creates server bundle
- ✅ Static build pre-renders all routes

---

### 6.4.2 Bundle Analysis & Visualization

**File:** `cli/analyze/bundle-analyzer.js`

**Bundle Analysis:**

```javascript
import { analyzeMetafile } from 'esbuild';

class BundleAnalyzer {
  constructor(metafile) {
    this.metafile = metafile;
  }
  
  async analyze() {
    const analysis = await analyzeMetafile(this.metafile, {
      verbose: true
    });
    
    return {
      text: analysis,
      json: this.generateJSONAnalysis()
    };
  }
  
  generateJSONAnalysis() {
    const outputs = this.metafile.outputs;
    const inputs = this.metafile.inputs;
    
    // Total bundle size
    const totalSize = Object.values(outputs)
      .reduce((sum, output) => sum + output.bytes, 0);
    
    // Group by chunk
    const chunks = this.groupByChunk(outputs);
    
    // Top modules by size
    const topModules = Object.entries(inputs)
      .map(([path, input]) => ({
        path,
        size: input.bytes,
        sizeFormatted: this.formatBytes(input.bytes)
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 50);
    
    // Dependency tree
    const dependencyTree = this.buildDependencyTree();
    
    return {
      totalSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      chunks,
      topModules,
      dependencyTree,
      summary: {
        outputCount: Object.keys(outputs).length,
        inputCount: Object.keys(inputs).length,
        averageChunkSize: this.formatBytes(totalSize / Object.keys(outputs).length)
      }
    };
  }
  
  groupByChunk(outputs) {
    const chunks = {};
    
    Object.entries(outputs).forEach(([path, output]) => {
      const chunkName = this.getChunkName(path);
      
      if (!chunks[chunkName]) {
        chunks[chunkName] = {
          files: [],
          totalSize: 0
        };
      }
      
      chunks[chunkName].files.push({
        path,
        size: output.bytes,
        sizeFormatted: this.formatBytes(output.bytes)
      });
      
      chunks[chunkName].totalSize += output.bytes;
    });
    
    // Sort chunks by size
    Object.keys(chunks).forEach(key => {
      chunks[key].totalSizeFormatted = this.formatBytes(chunks[key].totalSize);
      chunks[key].files.sort((a, b) => b.size - a.size);
    });
    
    return chunks;
  }
  
  getChunkName(filePath) {
    const basename = path.basename(filePath);
    
    if (basename.includes('vendor')) return 'vendor';
    if (basename.includes('runtime')) return 'runtime';
    if (basename.includes('material')) return 'material';
    if (basename.includes('chunk')) return 'chunks';
    
    return 'app';
  }
  
  buildDependencyTree() {
    const tree = {};
    const inputs = this.metafile.inputs;
    
    Object.entries(inputs).forEach(([path, input]) => {
      tree[path] = {
        size: input.bytes,
        imports: input.imports?.map(imp => imp.path) || []
      };
    });
    
    return tree;
  }
  
  async generateVisualization() {
    const analysis = this.generateJSONAnalysis();
    
    // Generate HTML visualization
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bundle Analysis</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    h1 {
      margin-top: 0;
      color: #333;
    }
    
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .summary-card {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #6750a4;
    }
    
    .summary-card h3 {
      margin: 0 0 10px 0;
      color: #666;
      font-size: 14px;
      font-weight: 500;
    }
    
    .summary-card .value {
      font-size: 24px;
      font-weight: 600;
      color: #333;
    }
    
    .chart-container {
      margin: 30px 0;
      height: 400px;
    }
    
    .module-list {
      margin-top: 30px;
    }
    
    .module-item {
      display: flex;
      justify-content: space-between;
      padding: 12px;
      border-bottom: 1px solid #eee;
    }
    
    .module-item:hover {
      background: #f9f9f9;
    }
    
    .module-path {
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 13px;
      color: #333;
    }
    
    .module-size {
      font-weight: 600;
      color: #6750a4;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📦 Bundle Analysis</h1>
    
    <div class="summary">
      <div class="summary-card">
        <h3>Total Size</h3>
        <div class="value">${analysis.totalSizeFormatted}</div>
      </div>
      <div class="summary-card">
        <h3>Output Files</h3>
        <div class="value">${analysis.summary.outputCount}</div>
      </div>
      <div class="summary-card">
        <h3>Input Modules</h3>
        <div class="value">${analysis.summary.inputCount}</div>
      </div>
      <div class="summary-card">
        <h3>Avg Chunk Size</h3>
        <div class="value">${analysis.summary.averageChunkSize}</div>
      </div>
    </div>
    
    <h2>Bundle Composition</h2>
    <div class="chart-container">
      <canvas id="bundleChart"></canvas>
    </div>
    
    <h2>Top 20 Modules by Size</h2>
    <div class="module-list">
      ${analysis.topModules.slice(0, 20).map(mod => `
        <div class="module-item">
          <span class="module-path">${mod.path}</span>
          <span class="module-size">${mod.sizeFormatted}</span>
        </div>
      `).join('')}
    </div>
  </div>
  
  <script>
    const chunks = ${JSON.stringify(analysis.chunks)};
    
    const ctx = document.getElementById('bundleChart').getContext('2d');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(chunks),
        datasets: [{
          data: Object.values(chunks).map(c => c.totalSize),
          backgroundColor: [
            '#6750a4',
            '#7d5fa7',
            '#9470aa',
            '#ab81ad',
            '#c392b0'
          ]]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const formatted = formatBytes(value);
                return label + ': ' + formatted;
              }
            }
          }
        }
      }
    });
    
    function formatBytes(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
  </script>
</body>
</html>`;
    
    return html;
  }
  
  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
```

**CLI Integration:**

```javascript
// In analyze command
async function analyzeBundle(options) {
  // Build with metafile
  const config = await ConfigLoader.load();
  config.build.analyze = true;
  
  const bundler = new JavaScriptBundler(config);
  const result = await bundler.bundle();
  
  if (!result.metafile) {
    throw new Error('Metafile not generated');
  }
  
  // Analyze
  const analyzer = new BundleAnalyzer(result.metafile);
  const analysis = await analyzer.analyze();
  
  if (options.json) {
    // Output as JSON
    console.log(JSON.stringify(analysis.json, null, 2));
  } else {
    // Output as text
    console.log(analysis.text);
    
    // Generate visualization
    if (options.open) {
      const html = await analyzer.generateVisualization();
      const htmlPath = path.join(config.output, 'bundle-analysis.html');
      
      await fs.promises.writeFile(htmlPath, html);
      
      console.log(chalk.green(`\n✓ Analysis saved to ${htmlPath}`));
      
      // Open in browser
      await open(htmlPath);
    }
  }
}
```

**Validation:**
- ✅ Bundle analyzed correctly
- ✅ Size breakdown accurate
- ✅ Visualization generated
- ✅ Opens in browser
- ✅ JSON output works

---

### 6.4.3 Production Optimizations

**File:** `cli/bundler/production-optimizer.js`

**Advanced Optimizations:**

```javascript
class ProductionOptimizer {
  constructor(config) {
    this.config = config;
  }
  
  async optimize(bundle) {
    let optimized = bundle;
    
    // 1. Minification (already done by esbuild)
    
    // 2. Obfuscation (if enabled)
    if (this.config.optimization.obfuscate) {
      optimized = await this.obfuscate(optimized);
    }
    
    // 3. Compression (gzip/brotli)
    await this.compress(optimized);
    
    // 4. Generate integrity hashes
    await this.generateIntegrityHashes(optimized);
    
    // 5. Generate service worker
    await this.generateServiceWorker(optimized);
    
    return optimized;
  }
  
  async obfuscate(bundle) {
    const JavaScriptObfuscator = require('javascript-obfuscator');
    
    const files = await glob(`${this.config.output}/**/*.js`);
    
    for (const file of files) {
      const code = await fs.promises.readFile(file, 'utf8');
      
      const obfuscated = JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        debugProtection: false,
        debugProtectionInterval: 0,
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        numbersToExpressions: true,
        renameGlobals: false,
        selfDefending: true,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 10,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: ['base64'],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 2,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 4,
        stringArrayWrappersType: 'function',
        stringArrayThreshold: 0.75,
        transformObjectKeys: true,
        unicodeEscapeSequence: false
      });
      
      await fs.promises.writeFile(file, obfuscated.getObfuscatedCode());
    }
    
    return bundle;
  }
  
  async compress(bundle) {
    const zlib = require('zlib');
    const { promisify } = require('util');
    const gzip = promisify(zlib.gzip);
    const brotliCompress = promisify(zlib.brotliCompress);
    
    const files = await glob(`${this.config.output}/**/*.{js,css,html,json}`);
    
    for (const file of files) {
      const content = await fs.promises.readFile(file);
      
      // Gzip
      const gzipped = await gzip(content, { level: 9 });
      await fs.promises.writeFile(`${file}.gz`, gzipped);
      
      // Brotli
      const brotlied = await brotliCompress(content, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 11
        }
      });
      await fs.promises.writeFile(`${file}.br`, brotlied);
      
      console.log(chalk.gray(
        `Compressed ${path.basename(file)}: ` +
        `${this.formatBytes(content.length)} → ` +
        `${this.formatBytes(gzipped.length)} (gzip), ` +
        `${this.formatBytes(brotlied.length)} (br)`
      ));
    }
  }
  
  async generateIntegrityHashes(bundle) {
    const crypto = require('crypto');
    const files = await glob(`${this.config.output}/**/*.{js,css}`);
    
    const integrity = {};
    
    for (const file of files) {
      const content = await fs.promises.readFile(file);
      const hash = crypto.createHash('sha384').update(content).digest('base64');
      const relativePath = path.relative(this.config.output, file);
      
      integrity[relativePath] = `sha384-${hash}`;
    }
    
    // Save integrity manifest
    await fs.promises.writeFile(
      path.join(this.config.output, 'integrity.json'),
      JSON.stringify(integrity, null, 2)
    );
    
    return integrity;
  }
  
  async generateServiceWorker(bundle) {
    // Generate service worker for offline support
    const swCode = `
const CACHE_NAME = 'flutterjs-v1';
const urlsToCache = [
  '/',
  '/index.html',
  ${await this.getCacheableAssets()}
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
`;
    
    await fs.promises.writeFile(
      path.join(this.config.output, 'sw.js'),
      swCode
    );
  }
  
  async getCacheableAssets() {
    const files = await glob(`${this.config.output}/**/*.{js,css,png,jpg,svg,woff,woff2}`);
    
    return files
      .map(f => path.relative(this.config.output, f))
      .map(f => `'/${f}'`)
      .join(',\n  ');
  }
  
  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
```

**Validation:**
- ✅ Code obfuscated (if enabled)
- ✅ Assets compressed (gzip + brotli)
- ✅ Integrity hashes generated
- ✅ Service worker created
- ✅ Offline support works

---

### 6.4.4 Build Performance Optimization

**File:** `cli/bundler/build-cache.js`

**Persistent Build Cache:**

```javascript
import crypto from 'crypto';

class BuildCache {
  constructor(config) {
    this.config = config;
    this.cacheDir = path.join('.flutterjs', 'cache');
    this.manifestPath = path.join(this.cacheDir, 'manifest.json');
    this.manifest = null;
  }
  
  async initialize() {
    await fs.promises.mkdir(this.cacheDir, { recursive: true });
    
    // Load existing manifest
    if (fs.existsSync(this.manifestPath)) {
      const content = await fs.promises.readFile(this.manifestPath, 'utf8');
      this.manifest = JSON.parse(content);
    } else {
      this.manifest = {
        version: '1.0',
        entries: {}
      };
    }
  }
  
  async get(key) {
    if (!this.manifest.entries[key]) {
      return null;
    }
    
    const entry = this.manifest.entries[key];
    const cachePath = path.join(this.cacheDir, entry.hash);
    
    if (!fs.existsSync(cachePath)) {
      // Cache entry missing, invalidate
      delete this.manifest.entries[key];
      return null;
    }
    
    // Check if still valid
    if (!await this.isValid(key, entry)) {
      return null;
    }
    
    // Read cached content
    const content = await fs.promises.readFile(cachePath, 'utf8');
    return JSON.parse(content);
  }
  
  async set(key, value, dependencies = []) {
    // Calculate hash
    const hash = this.hash(JSON.stringify(value));
    const cachePath = path.join(this.cacheDir, hash);
    
    // Write cache file
    await fs.promises.writeFile(cachePath, JSON.stringify(value));
    
    // Update manifest
    this.manifest.entries[key] = {
      hash,
      dependencies,
      timestamp: Date.now()
    };
    
    await this.saveManifest();
  }
  
  async isValid(key, entry) {
    // Check if dependencies changed
    for (const dep of entry.dependencies) {
      const stat = await fs.promises.stat(dep);
      
      if (stat.mtimeMs > entry.timestamp) {
        return false;
      }
    }
    
    return true;
  }
  
  async invalidate(key) {
    if (this.manifest.entries[key]) {
      const entry = this.manifest.entries[key];
      const cachePath = path.join(this.cacheDir, entry.hash);
      
      // Delete cache file
      if (fs.existsSync(cachePath)) {
        await fs.promises.unlink(cachePath);
      }
      
      // Remove from manifest
      delete this.manifest.entries[key];
      await this.saveManifest();
    }
  }
  
  async clear() {
    // Delete all cache files
    const files = await fs.promises.readdir(this.cacheDir);
    
    for (const file of files) {
      if (file !== 'manifest.json') {
        await fs.promises.unlink(path.join(this.cacheDir, file));
      }
    }
    
    // Reset manifest
    this.manifest = {
      version: '1.0',
      entries: {}
    };
    
    await this.saveManifest();
  }
  
  async saveManifest() {
    await fs.promises.writeFile(
      this.manifestPath,
      JSON.stringify(this.manifest, null, 2)
    );
  }
  
  hash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
  
  async getStats() {
    const files = await fs.promises.readdir(this.cacheDir);
    let totalSize = 0;
    
    for (const file of files) {
      const stat = await fs.promises.stat(path.join(this.cacheDir, file));
      totalSize += stat.size;
    }
    
    return {
      entries: Object.keys(this.manifest.entries).length,
      totalSize: this.formatBytes(totalSize),
      cacheDir: this.cacheDir
    };
  }
  
  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

// Integration with bundler
class CachedBundler extends JavaScriptBundler {
  constructor(config) {
    super(config);
    this.cache = new BuildCache(config);
  }
  
  async bundle() {
    await this.cache.initialize();
    
    // Check cache
    const cacheKey = this.getCacheKey();
    const cached = await this.cache.get(cacheKey);
    
    if (cached) {
      console.log(chalk.green('✓ Using cached build'));
      return cached;
    }
    
    // Build
    console.log(chalk.blue('Building...'));
    const result = await super.bundle();
    
    // Cache result
    const dependencies = await this.getDependencies();
    await this.cache.set(cacheKey, result, dependencies);
    
    return result;
  }
  
  getCacheKey() {
    // Generate cache key based on config + source files
    const configHash = this.cache.hash(JSON.stringify(this.config));
    return `build_${configHash}`;
  }
  
  async getDependencies() {
    // Get list of all source files
    const files = await glob('lib/**/*.fjs');
    return files;
  }
}
```

**Validation:**
- ✅ Cache stores results
- ✅ Cache hit on unchanged code
- ✅ Cache invalidated on changes
- ✅ Build time reduced significantly
- ✅ Cache stats accurate

---

## Implementation Checklist

### Phase 6.1: CLI & Scaffolding
- [ ] CLI command structure with Commander
- [ ] `create` command with templates
- [ ] Configuration system (flutterjs.config.js)
- [ ] Project scaffolding
- [ ] Dependency management
- [ ] `doctor` command for environment check
- [ ] Unit tests (30+ test cases)
- [ ] Integration test (create + build project)

### Phase 6.2: Development Pipeline
- [ ] Development server with Express
- [ ] WebSocket for HMR
- [ ] File watcher with Chokidar
- [ ] HMR client-side code
- [ ] Source map generation
- [ ] Error overlay
- [ ] Live reload
- [ ] Unit tests (40+ test cases)
- [ ] Integration test (dev server + HMR)

### Phase 6.3: Production Build
- [ ] JavaScript bundler with esbuild
- [ ] Code splitting strategy
- [ ] CSS processor with PostCSS
- [ ] Asset handler (images, fonts)
- [ ] Tree-shaking implementation
- [ ] Bundle optimization
- [ ] Unit tests (50+ test cases)
- [ ] Integration test (full production build)

### Phase 6.4: Advanced Features
- [ ] Multiple build targets (SPA, MPA, SSR, static)
- [ ] Bundle analyzer with visualization
- [ ] Production optimizations (obfuscate, compress)
- [ ] Service worker generation
- [ ] Build cache system
- [ ] Performance benchmarks
- [ ] Unit tests (40+ test cases)
- [ ] End-to-end test (complete workflow)

---

## Success Criteria

**By end of Week 2 (Phase 6.1):**
- ✅ CLI commands work correctly
- ✅ Project scaffolding creates valid structure
- ✅ Configuration system functional
- ✅ Dependencies install correctly

**By end of Week 4 (Phase 6.2):**
- ✅ Dev server runs without errors
- ✅ HMR updates widgets instantly
- ✅ Error overlay shows helpful messages
- ✅ Source maps trace to original code

**By end of Week 6 (Phase 6.3):**
- ✅ Production build completes successfully
- ✅ Bundle size < 50KB (core + material)
- ✅ Assets optimized correctly
- ✅ Tree-shaking removes unused code

**By end of Week 8 (Phase 6.4):**
- ✅ All build targets work
- ✅ Bundle analysis visualizes correctly
- ✅ Production optimizations effective
- ✅ Build cache reduces build time by 70%+

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Dev server startup** | < 2 seconds | Time to ready |
| **HMR update** | < 200ms | File change → browser update |
| **Production build** | < 30 seconds | Full build time |
| **Cached build** | < 5 seconds | Using cache |
| **Bundle size (gzipped)** | < 15KB | Core + material |
| **Initial load time** | < 1 second | Time to interactive |

---

## Testing Strategy

**Unit Tests:** 160+ test cases
- CLI command parsing
- Configuration loading
- File watching
- Bundling logic
- Asset optimization
- Cache management

**Integration Tests:** 20+ scenarios
- Create → dev → build workflow
- HMR with state preservation
- Multi-target builds
- Bundle analysis
- Cache invalidation

**E2E Tests:** Complete workflows
- Scaffold → develop → deploy
- Error handling
- Production optimization
- Performance benchmarks

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Build failures | Blocks deployment | Comprehensive error handling, validation |
| Slow builds | Poor DX | Build cache, incremental compilation |
| Bundle size bloat | Slow loading | Tree-shaking, code splitting, monitoring |
| HMR state loss | Frustrating DX | State preservation, smart invalidation |
| Platform compatibility | Limited adoption | Test on Windows/Mac/Linux |

---

## Output Artifacts

By end of Step 6, you'll have:

1. **cli/** - Complete CLI tool
   - index.js (main entry)
   - commands/ (create, dev, build, serve, analyze, etc.)
   - server/ (dev server, HMR)
   - bundler/ (production build)
   - config/ (configuration system)
   - utils/ (helpers)

2. **tests/cli/** - 160+ unit tests

3. **templates/** - Project templates
   - default
   - counter
   - todo
   - dashboard

4. **docs/cli-guide.md** - CLI documentation

5. **Performance benchmarks** - Build time metrics

---

## Next Steps (After Step 6)

Once Step 6 is complete, you'll have a **fully functional build system**. The remaining steps will be:

- **Step 7:** Material Design Widgets (complete widget library)
- **Step 8:** Routing & Navigation
- **Step 9:** Advanced Features (animations, gestures, i18n)
- **Step 10:** Production Polish (DevTools, debugging, documentation)

The build system created in Step 6 is **essential infrastructure** that all other steps depend on. Focus on stability, performance, and developer experience before moving on.