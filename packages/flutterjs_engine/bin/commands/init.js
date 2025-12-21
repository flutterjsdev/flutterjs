/**
 * ============================================================================
 * FlutterJS CLI - Project Creation System
 * ============================================================================
 * 
 * This module handles:
 * 1. Project scaffolding with directory structure
 * 2. Template selection and generation
 * 3. Configuration file creation
 * 4. Dependency management
 * 5. Git initialization (optional)
 * 6. Post-creation setup
 * 
 * Location: cli/commands/create.js or cli/commands/init.js
 */



import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import chalk from "chalk";

// ============================================================================
// TEMPLATES DEFINITION
// ============================================================================

export const TEMPLATES = {
  default: {
    name: 'Default App',
    description: 'Basic FlutterJS application with Material Design',
    files: {
      'lib/main.fjs': `/**
 * FlutterJS Default Application
 * A simple Material Design app
 */

class MyApp {
  constructor() {
    this.title = 'Welcome to FlutterJS';
  }

  build() {
    return {
      type: 'MaterialApp',
      props: {
        title: this.title,
        theme: {
          primaryColor: '#6750A4',
          colorScheme: 'light'
        },
        home: new HomePage()
      }
    };
  }
}

class HomePage {
  build() {
    return {
      type: 'Scaffold',
      props: {
        appBar: {
          type: 'AppBar',
          props: {
            title: 'FlutterJS App',
            backgroundColor: '#6750A4'
          }
        },
        body: {
          type: 'Center',
          children: [
            {
              type: 'Column',
              props: {
                mainAxisAlignment: 'center',
                crossAxisAlignment: 'center'
              },
              children: [
                {
                  type: 'Text',
                  props: {
                    text: 'Hello, FlutterJS!',
                    style: {
                      fontSize: 24,
                      fontWeight: 'bold',
                      color: '#1D1B20'
                    }
                  }
                },
                {
                  type: 'SizedBox',
                  props: { height: 20 }
                },
                {
                  type: 'Text',
                  props: {
                    text: 'Edit lib/main.fjs to get started',
                    style: {
                      fontSize: 16,
                      color: '#49454F'
                    }
                  }
                }
              ]
            }
          ]
        }
      }
    };
  }
}

function main() {
  return new MyApp();
}

export { MyApp, HomePage, main };
`,
      'lib/widgets/.gitkeep': '',
      'lib/pages/.gitkeep': '',
      'lib/services/.gitkeep': '',
      'lib/models/.gitkeep': '',
      'lib/utils/.gitkeep': '',
      'public/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="A FlutterJS application">
  <meta name="theme-color" content="#6750A4">
  <title>FlutterJS App</title>
  <link rel="icon" type="image/png" href="/favicon.png">
</head>
<body>
  <div id="root"></div>
  <noscript>
    <p>This application requires JavaScript to run.</p>
  </noscript>
</body>
</html>`,
      'assets/images/.gitkeep': '',
      'assets/fonts/.gitkeep': '',
      'test/.gitkeep': ''
    }
  },

  counter: {
    name: 'Counter App',
    description: 'Classic counter example with state management',
    files: {
      'lib/main.fjs': `/**
 * FlutterJS Counter Application
 * Demonstrates stateful widgets and event handling
 */

class CounterApp {
  constructor() {
    this.title = 'FlutterJS Counter';
  }

  build() {
    return {
      type: 'MaterialApp',
      props: {
        title: this.title,
        theme: {
          primaryColor: '#6750A4',
          colorScheme: 'light'
        },
        home: new CounterPage()
      }
    };
  }
}

class CounterPage {
  constructor() {
    this.state = {
      counter: 0
    };
  }

  increment() {
    this.setState({ counter: this.state.counter + 1 });
  }

  decrement() {
    this.setState({ counter: this.state.counter - 1 });
  }

  reset() {
    this.setState({ counter: 0 });
  }

  build() {
    return {
      type: 'Scaffold',
      props: {
        appBar: {
          type: 'AppBar',
          props: {
            title: 'Counter App',
            backgroundColor: '#6750A4'
          }
        },
        body: {
          type: 'Center',
          children: [
            {
              type: 'Column',
              props: {
                mainAxisAlignment: 'center',
                crossAxisAlignment: 'center'
              },
              children: [
                {
                  type: 'Text',
                  props: {
                    text: 'You have pressed the button this many times:',
                    style: { fontSize: 16, color: '#49454F' }
                  }
                },
                {
                  type: 'SizedBox',
                  props: { height: 20 }
                },
                {
                  type: 'Text',
                  props: {
                    text: String(this.state.counter),
                    style: {
                      fontSize: 48,
                      fontWeight: 'bold',
                      color: '#6750A4'
                    }
                  }
                },
                {
                  type: 'SizedBox',
                  props: { height: 40 }
                },
                {
                  type: 'Row',
                  props: {
                    mainAxisAlignment: 'center',
                    crossAxisAlignment: 'center'
                  },
                  children: [
                    {
                      type: 'ElevatedButton',
                      props: {
                        text: 'Decrement',
                        onPressed: () => this.decrement(),
                        style: { minWidth: 120 }
                      }
                    },
                    {
                      type: 'SizedBox',
                      props: { width: 20 }
                    },
                    {
                      type: 'ElevatedButton',
                      props: {
                        text: 'Increment',
                        onPressed: () => this.increment(),
                        style: { minWidth: 120 }
                      }
                    }
                  ]
                },
                {
                  type: 'SizedBox',
                  props: { height: 20 }
                },
                {
                  type: 'TextButton',
                  props: {
                    text: 'Reset',
                    onPressed: () => this.reset()
                  }
                }
              ]
            }
          ]
        }
      }
    };
  }
}

function main() {
  return new CounterApp();
}

export { CounterApp, CounterPage, main };
`,
      'lib/widgets/.gitkeep': '',
      'lib/pages/.gitkeep': '',
      'public/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Counter App - FlutterJS</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`,
      'assets/images/.gitkeep': '',
      'test/.gitkeep': ''
    }
  },

  todo: {
    name: 'Todo List',
    description: 'Todo application with CRUD operations',
    files: {
      'lib/main.fjs': `/**
 * FlutterJS Todo Application
 * Demonstrates list management and user interactions
 */

class TodoApp {
  constructor() {
    this.title = 'FlutterJS Todo';
  }

  build() {
    return {
      type: 'MaterialApp',
      props: {
        title: this.title,
        theme: {
          primaryColor: '#6750A4',
          colorScheme: 'light'
        },
        home: new TodoPage()
      }
    };
  }
}

class TodoPage {
  constructor() {
    this.state = {
      todos: [
        { id: 1, text: 'Welcome to FlutterJS!', completed: false },
        { id: 2, text: 'Build amazing apps', completed: false }
      ],
      inputValue: ''
    };
    this.nextId = 3;
  }

  addTodo() {
    if (this.state.inputValue.trim()) {
      const newTodo = {
        id: this.nextId++,
        text: this.state.inputValue,
        completed: false
      };
      
      this.setState({
        todos: [...this.state.todos, newTodo],
        inputValue: ''
      });
    }
  }

  toggleTodo(id) {
    this.setState({
      todos: this.state.todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    });
  }

  deleteTodo(id) {
    this.setState({
      todos: this.state.todos.filter(todo => todo.id !== id)
    });
  }

  build() {
    const completedCount = this.state.todos.filter(t => t.completed).length;
    const totalCount = this.state.todos.length;

    return {
      type: 'Scaffold',
      props: {
        appBar: {
          type: 'AppBar',
          props: {
            title: 'Todo List',
            backgroundColor: '#6750A4'
          }
        },
        body: {
          type: 'Column',
          children: [
            // Input section
            {
              type: 'Padding',
              props: { padding: 16 },
              children: [
                {
                  type: 'Row',
                  children: [
                    {
                      type: 'Expanded',
                      children: [
                        {
                          type: 'TextField',
                          props: {
                            value: this.state.inputValue,
                            placeholder: 'Enter a todo...',
                            onChanged: (value) => this.setState({ inputValue: value })
                          }
                        }
                      ]
                    },
                    {
                      type: 'SizedBox',
                      props: { width: 10 }
                    },
                    {
                      type: 'ElevatedButton',
                      props: {
                        text: 'Add',
                        onPressed: () => this.addTodo()
                      }
                    }
                  ]
                }
              ]
            },
            // Stats
            {
              type: 'Padding',
              props: { padding: 16 },
              children: [
                {
                  type: 'Text',
                  props: {
                    text: \`Completed: \${completedCount}/\${totalCount}\`,
                    style: { fontSize: 14, color: '#49454F' }
                  }
                }
              ]
            },
            // Todo list
            {
              type: 'Expanded',
              children: [
                {
                  type: 'ListView',
                  children: this.state.todos.map(todo => ({
                    type: 'ListTile',
                    props: {
                      key: todo.id,
                      title: todo.text,
                      leading: {
                        type: 'Checkbox',
                        props: {
                          value: todo.completed,
                          onChanged: () => this.toggleTodo(todo.id)
                        }
                      },
                      trailing: {
                        type: 'IconButton',
                        props: {
                          icon: 'delete',
                          onPressed: () => this.deleteTodo(todo.id)
                        }
                      },
                      style: {
                        textDecoration: todo.completed ? 'line-through' : 'none',
                        opacity: todo.completed ? 0.6 : 1
                      }
                    }
                  }))
                }
              ]
            }
          ]
        }
      }
    };
  }
}

function main() {
  return new TodoApp();
}

export { TodoApp, TodoPage, main };
`,
      'lib/widgets/.gitkeep': '',
      'lib/models/.gitkeep': '',
      'public/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Todo App - FlutterJS</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`,
      'assets/.gitkeep': '',
      'test/.gitkeep': ''
    }
  }
};

// ============================================================================
// MAIN INIT FUNCTION
// ============================================================================

export async function initProject(projectName, options) {
  console.log(chalk.blue(`\n🚀 Creating FlutterJS project: ${projectName}\n`));

  // 1. Validate project name
  validateProjectName(projectName);

  // 2. Setup paths
  const projectPath = path.join(process.cwd(), projectName);

  // 3. Check if directory exists
  if (fs.existsSync(projectPath)) {
    throw new Error(`Directory "${projectName}" already exists!`);
  }

  try {
    // 4. Create project structure
    console.log(chalk.gray('📁 Creating project structure...'));
    await createDirectoryStructure(projectPath);

    // 5. Copy template files
    console.log(chalk.gray(`📋 Setting up "${options.template}" template...`));
    await copyTemplateFiles(projectPath, options.template);

    // 6. Create configuration files
    console.log(chalk.gray('⚙️  Creating configuration files...'));
    await createConfigFiles(projectPath, projectName, options);

    // 7. Initialize git (optional)
    if (options.git) {
      console.log(chalk.gray('🔧 Initializing git repository...'));
      await initGitRepository(projectPath);
    }

    // 8. Install dependencies (optional)
    if (options.install) {
      console.log(chalk.gray('📦 Installing dependencies...'));
      await installDependencies(projectPath);
    }

    // 9. Show success message
    console.log(chalk.green('\n✅ Project created successfully!\n'));
    
    // 10. Display file tree
    displayProjectStructure(projectPath, projectName);

  } catch (error) {
    // Cleanup on failure
    if (fs.existsSync(projectPath)) {
      console.log(chalk.yellow('\n🧹 Cleaning up...'));
      fs.rmSync(projectPath, { recursive: true, force: true });
    }
    throw error;
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateProjectName(name) {
  // Check if name is valid
  const validNamePattern = /^[a-z0-9-_]+$/;
  
  if (!validNamePattern.test(name)) {
    throw new Error(
      `Invalid project name: "${name}"\n` +
      `Project name must contain only lowercase letters, numbers, hyphens, and underscores.`
    );
  }

  // Check reserved names
  const reservedNames = [
    'node_modules', 'dist', 'build', 'public', 'lib', 'test',
    'flutterjs', 'flutter', 'react', 'vue', 'angular'
  ];

  if (reservedNames.includes(name.toLowerCase())) {
    throw new Error(`Project name "${name}" is reserved and cannot be used.`);
  }
}

// ============================================================================
// DIRECTORY STRUCTURE
// ============================================================================

async function createDirectoryStructure(projectPath) {
  const structure = {
    'lib': {
      'widgets': {},
      'pages': {},
      'services': {},
      'models': {},
      'utils': {}
    },
    'public': {},
    'assets': {
      'images': {},
      'fonts': {}
    },
    'test': {},
    '.flutterjs': {}
  };

  await createStructureRecursively(projectPath, structure);
}

async function createStructureRecursively(basePath, structure) {
  for (const [name, content] of Object.entries(structure)) {
    const fullPath = path.join(basePath, name);
    
    if (typeof content === 'object' && content !== null) {
      // Create directory
      await fs.promises.mkdir(fullPath, { recursive: true });
      
      // Recurse for nested structure
      if (Object.keys(content).length > 0) {
        await createStructureRecursively(fullPath, content);
      }
    } else {
      // Create file
      await fs.promises.writeFile(fullPath, content || '');
    }
  }
}

// ============================================================================
// TEMPLATE FILES
// ============================================================================

async function copyTemplateFiles(projectPath, templateName) {
  const template = TEMPLATES[templateName] || TEMPLATES.default;
  
  if (!template) {
    throw new Error(`Template "${templateName}" not found!`);
  }

  // Copy all template files
  for (const [filePath, content] of Object.entries(template.files)) {
    const fullPath = path.join(projectPath, filePath);
    
    // Create parent directory if needed
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    
    // Write file
    await fs.promises.writeFile(fullPath, content);
  }
}

// ============================================================================
// CONFIGURATION FILES
// ============================================================================

async function createConfigFiles(projectPath, projectName, options) {
  // 1. package.json
  await createPackageJson(projectPath, projectName, options);

  // 2. flutterjs.config.js
  await createFlutterJsConfig(projectPath, projectName, options);

  // 3. .gitignore
  await createGitignore(projectPath);

  // 4. README.md
  await createReadme(projectPath, projectName);

  // 5. .prettierrc.json
  await createPrettierConfig(projectPath);

  // 6. .eslintrc.json
  await createEslintConfig(projectPath);
}

async function createPackageJson(projectPath, projectName, options) {
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    description: `A FlutterJS application`,
    type: 'module',
    scripts: {
      dev: 'flutterjs dev',
      'dev:debug': 'flutterjs dev --debug',
      build: 'flutterjs build',
      'build:prod': 'flutterjs build --production',
      preview: 'flutterjs preview',
      run: 'flutterjs run',
      clean: 'flutterjs clean',
      analyze: 'flutterjs analyze',
      test: 'vitest',
      lint: 'eslint lib/**/*.fjs'
    },
    dependencies: {
      '@flutterjs/core': '^1.0.0'
    },
    devDependencies: {
      'flutterjs-cli': '^1.0.0',
      'eslint': '^8.0.0',
      'prettier': '^3.0.0',
      'vitest': '^1.0.0'
    },
    keywords: ['flutterjs', 'flutter', 'web-app'],
    author: '',
    license: 'MIT',
    engines: {
      node: '>=18.0.0'
    },
    flutterjs: {
      version: '1.0.0',
      entry: {
        main: 'lib/main.fjs',
        rootWidget: 'MyApp',
        entryFunction: 'main'
      },
      build: {
        source: 'lib',
        output: 'dist'
      },
      dev: {
        port: 3000
      }
    }
  };

  // Add Material Design if specified
  if (options.material) {
    packageJson.dependencies['@flutterjs/material'] = '^1.0.0';
  }

  // Add Cupertino if specified
  if (options.cupertino) {
    packageJson.dependencies['@flutterjs/cupertino'] = '^1.0.0';
  }

  // Add TypeScript if specified
  if (options.typescript) {
    packageJson.devDependencies['typescript'] = '^5.0.0';
    packageJson.devDependencies['@types/node'] = '^20.0.0';
  }

  await fs.promises.writeFile(
    path.join(projectPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
}

async function createFlutterJsConfig(projectPath, projectName, options) {
  const config = `module.exports = {
  // Project Identity
  project: {
    name: '${projectName}',
    description: 'A FlutterJS application',
    version: '1.0.0',
  },

  // Entry Point Configuration
  entry: {
    main: 'lib/main.fjs',
    rootWidget: 'MyApp',
    entryFunction: 'main',
  },

  // Rendering Mode
  render: {
    mode: 'csr', // 'csr' | 'ssr' | 'hybrid'
    target: 'web', // 'web' | 'node' | 'universal'
  },

  // Build Configuration
  build: {
    output: 'dist',
    source: 'lib',
    production: {
      minify: true,
      obfuscate: true,
      treeshake: true,
      sourceMap: false,
    },
    development: {
      minify: false,
      obfuscate: false,
      treeshake: false,
      sourceMap: true,
    },
  },

  // Development Server
  dev: {
    server: {
      port: 3000,
      host: 'localhost',
      https: false,
    },
    hmr: {
      enabled: true,
      interval: 300,
      reload: true,
    },
    behavior: {
      open: false,
      cors: true,
    },
  },

  // Framework Configuration
  framework: {
    material: {
      version: '3',
      theme: 'light',
    },
    providers: {
      theme: true,
      navigation: true,
      mediaQuery: true,
    },
  },
};
`;

  await fs.promises.writeFile(
    path.join(projectPath, 'flutterjs.config.js'),
    config
  );
}

async function createGitignore(projectPath) {
  const gitignore = `# Dependencies
node_modules/
package-lock.json
yarn.lock
pnpm-lock.yaml

# Build outputs
dist/
.dev/
build/

# Cache
.flutterjs/
.cache/

# Environment
.env
.env.local
.env.production

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage/
.nyc_output/

# Misc
*.tgz
`;

  await fs.promises.writeFile(
    path.join(projectPath, '.gitignore'),
    gitignore
  );
}

async function createReadme(projectPath, projectName) {
  const readme = `# ${projectName}

A FlutterJS application built with Flutter-like syntax for the web.

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm, yarn, or pnpm

### Installation

\`\`\`bash
npm install
\`\`\`

### Development

Start the development server with hot reload:

\`\`\`bash
npm run dev
\`\`\`

Opens at http://localhost:3000

### Production Build

Build optimized production bundle:

\`\`\`bash
npm run build
\`\`\`

Preview the production build:

\`\`\`bash
npm run preview
\`\`\`

## 📁 Project Structure

\`\`\`
${projectName}/
├── lib/
│   ├── main.fjs           # Application entry point
│   ├── widgets/           # Reusable widgets
│   ├── pages/             # Page components
│   ├── services/          # Business logic
│   ├── models/            # Data models
│   └── utils/             # Utility functions
├── public/
│   └── index.html         # HTML template
├── assets/
│   ├── images/            # Image assets
│   └── fonts/             # Font files
├── test/                  # Test files
├── flutterjs.config.js    # FlutterJS configuration
└── package.json           # Project metadata
\`\`\`

## 🎨 Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run preview\` - Preview production build
- \`npm run run\` - All-in-one: build + serve
- \`npm run clean\` - Clean build artifacts
- \`npm run analyze\` - Analyze bundle size
- \`npm test\` - Run tests
- \`npm run lint\` - Lint code

## 📚 Learn More

- [FlutterJS Documentation](https://flutter-js.dev)
- [Flutter Documentation](https://flutter.dev)
- [Material Design](https://m3.material.io)

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines.

## 📝 License

MIT License - see LICENSE file for details
`;

  await fs.promises.writeFile(
    path.join(projectPath, 'README.md'),
    readme
  );
}

async function createPrettierConfig(projectPath) {
  const config = {
    semi: true,
    trailingComma: 'es5',
    singleQuote: true,
    printWidth: 100,
    tabWidth: 2,
    useTabs: false
  };

  await fs.promises.writeFile(
    path.join(projectPath, '.prettierrc.json'),
    JSON.stringify(config, null, 2)
  );
}

async function createEslintConfig(projectPath) {
  const config = {
    env: {
      browser: true,
      es2021: true,
      node: true
    },
    extends: ['eslint:recommended'],
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'warn'
    }
  };

  await fs.promises.writeFile(
    path.join(projectPath, '.eslintrc.json'),
    JSON.stringify(config, null, 2)
  );
}

// ============================================================================
// GIT INITIALIZATION
// ============================================================================

async function initGitRepository(projectPath) {
  try {
    // Initialize git
    execSync('git init', { cwd: projectPath, stdio: 'ignore' });
    
    // Create initial commit
    execSync('git add .', { cwd: projectPath, stdio: 'ignore' });
    execSync('git commit -m "Initial commit"', { cwd: projectPath, stdio: 'ignore' });
    
    console.log(chalk.gray('  ✓ Git repository initialized'));
  } catch (error) {
    console.log(chalk.yellow('  ⚠ Git initialization failed (optional)'));
  }
}

// ============================================================================
// DEPENDENCY INSTALLATION
// ============================================================================

async function installDependencies(projectPath) {
  const packageManager = detectPackageManager();
  
  console.log(chalk.gray(`  Using ${packageManager}...`));

  try {
    const installCmd = {
      npm: 'npm install',
      yarn: 'yarn install',
      pnpm: 'pnpm install'
    }[packageManager];

    execSync(installCmd, { 
      cwd: projectPath, 
      stdio: 'inherit'
    });

    console.log(chalk.gray('  ✓ Dependencies installed'));
  } catch (error) {
    console.log(chalk.yellow('  ⚠ Dependency installation failed'));
    console.log(chalk.gray('  Run "npm install" manually'));
  }
}

function detectPackageManager() {
  // Check for lock files in current directory
  if (fs.existsSync('pnpm-lock.yaml')) return 'pnpm';
  if (fs.existsSync('yarn.lock')) return 'yarn';
  
  // Check if package managers are installed
  try {
    execSync('pnpm --version', { stdio: 'ignore' });
    return 'pnpm';
  } catch {}

  try {
    execSync('yarn --version', { stdio: 'ignore' });
    return 'yarn';
  } catch {}

  return 'npm';
}

// ============================================================================
// PROJECT STRUCTURE DISPLAY
// ============================================================================

function displayProjectStructure(projectPath, projectName) {
  console.log(chalk.blue('📂 Project Structure:\n'));
  console.log(chalk.gray(`${projectName}/`));
  console.log(chalk.gray('├── lib/'));
  console.log(chalk.gray('│   ├── main.fjs'));
  console.log(chalk.gray('│   ├── widgets/'));
  console.log(chalk.gray('│   ├── pages/'));
  console.log(chalk.gray('│   ├── services/'));
  console.log(chalk.gray('│   └── utils/'));
  console.log(chalk.gray('├── public/'));
  console.log(chalk.gray('│   └── index.html'));
  console.log(chalk.gray('├── assets/'));
  console.log(chalk.gray('│   ├── images/'));
  console.log(chalk.gray('│   └── fonts/'));
  console.log(chalk.gray('├── test/'));
  console.log(chalk.gray('├── flutterjs.config.js'));
  console.log(chalk.gray('├── package.json'));
  console.log(chalk.gray('└── README.md\n'));
}

// ============================================================================
// EXPORTS
// ============================================================================
