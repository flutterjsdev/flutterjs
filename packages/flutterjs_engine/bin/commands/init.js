const fs = require('fs');
const path = require('path');

// Simple mkdir -p implementation
function mkdirp(dir) {
  if (fs.existsSync(dir)) return;
  const parent = path.dirname(dir);
  if (!fs.existsSync(parent)) {
    mkdirp(parent);
  }
  fs.mkdirSync(dir);
}

// Copy directory recursively
function copyDir(src, dest) {
  mkdirp(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy single file
function copyFile(src, dest) {
  mkdirp(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

async function init(projectName, options) {
  if (!projectName) {
    console.error('❌ Project name is required!');
    console.log('\n💡 Usage: flutter_js init <project-name>\n');
    process.exit(1);
  }

  console.log(`🚀 Creating new Flutter.js project: ${projectName}\n`);

  const projectPath = path.join(process.cwd(), projectName);
  const templateDir = path.join(__dirname, '..', 'templates');

  // Check if directory already exists
  if (fs.existsSync(projectPath)) {
    console.error(`❌ Directory "${projectName}" already exists!`);
    process.exit(1);
  }

  try {
    // Create base project directory
    console.log('📁 Creating project structure...');
    mkdirp(projectPath);
    mkdirp(path.join(projectPath, 'src'));
    mkdirp(path.join(projectPath, 'assets'));
    mkdirp(path.join(projectPath, 'public'));

    // Copy template files from framework if they exist
    console.log('📋 Setting up from templates...');

    // Copy .vscode configuration
    if (fs.existsSync(path.join(templateDir, '.vscode'))) {
      console.log('  ⚙️  Copying VS Code configuration...');
      copyDir(
        path.join(templateDir, '.vscode'),
        path.join(projectPath, '.vscode')
      );
    } else {
      // Create basic .vscode config
      mkdirp(path.join(projectPath, '.vscode'));
      fs.writeFileSync(
        path.join(projectPath, '.vscode', 'settings.json'),
        JSON.stringify({
          'editor.formatOnSave': true,
          'editor.defaultFormatter': 'esbenp.prettier-vscode',
          '[javascript]': { 'editor.defaultFormatter': 'esbenp.prettier-vscode' }
        }, null, 2)
      );
    }

    // Create main.fjs if template doesn't exist
    if (!fs.existsSync(path.join(projectPath, 'src', 'main.fjs'))) {
      console.log('  📝 Creating main.fjs...');
      fs.writeFileSync(
        path.join(projectPath, 'src', 'main.fjs'),
        `class MyApp {
  constructor() {
    this.title = 'Flutter.js App';
  }

  build() {
    return {
      type: 'Scaffold',
      props: {
        appBar: {
          type: 'AppBar',
          props: {
            title: this.title,
          },
        },
        body: {
          type: 'Center',
          children: [{
            type: 'Text',
            props: {
              text: 'Welcome to Flutter.js!',
            },
          }],
        },
      },
    };
  }
}

function main() {
  return new MyApp();
}

export { MyApp, main };
`
      );
    }

    // Copy config files
    const configFiles = ['.eslintrc.json', '.prettierrc.json', '.gitignore'];
    for (const configFile of configFiles) {
      const srcPath = path.join(templateDir, configFile);
      if (fs.existsSync(srcPath)) {
        console.log(`  🔧 Copying ${configFile}...`);
        copyFile(srcPath, path.join(projectPath, configFile));
      }
    }

    // Create .gitignore if not copied
    if (!fs.existsSync(path.join(projectPath, '.gitignore'))) {
      fs.writeFileSync(
        path.join(projectPath, '.gitignore'),
        `node_modules/
dist/
.dev/
.cache/
.DS_Store
*.log
.env
.env.local
`
      );
    }

    // Create package.json
    console.log('📦 Creating package.json...');
    const packageJson = {
      name: projectName,
      version: '1.0.0',
      description: 'A Flutter.js application',
      scripts: {
        dev: 'flutter_js dev',
        'dev:debug': 'flutter_js dev --debug',
        build: 'flutter_js build',
        'build:prod': 'flutter_js build --production',
        preview: 'flutter_js preview',
        run: 'flutter_js run',
      },
      devDependencies: {
        eslint: '^8.0.0',
        prettier: '^3.0.0',
      },
      keywords: ['flutter', 'flutter.js', 'fjs'],
      author: '',
      license: 'MIT',
      flutterjs: {
        version: '1.0.0',
        entry: {
          main: 'src/main.fjs',
          rootWidget: 'MyApp',
          entryFunction: 'main',
        },
        build: {
          source: 'src',
          output: 'dist',
        },
        dev: {
          port: 3000,
        },
      },
    };
    fs.writeFileSync(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create flutterjs.config.js (correct filename!)
    console.log('⚙️  Creating flutterjs.config.js...');
    const configContent = `module.exports = {
  // Project Identity
  project: {
    name: '${projectName}',
    description: 'A Flutter.js application',
    version: '1.0.0',
  },

  // Entry Point Configuration
  entry: {
    main: 'src/main.fjs',
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
    source: 'src',
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
    fs.writeFileSync(
      path.join(projectPath, 'flutterjs.config.js'),
      configContent
    );

    // Create README.md
    console.log('📄 Creating README.md...');
    const readmeContent = `# ${projectName}

A Flutter.js application.

## Getting Started

### 1. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 2. Start Development Server

\`\`\`bash
npm run dev
\`\`\`

Opens development server at http://localhost:3000

### 3. Build for Production

\`\`\`bash
npm run build
\`\`\`

Creates optimized build in \`dist/\` folder.

### 4. Preview Production Build

\`\`\`bash
npm run preview
\`\`\`

## Project Structure

\`\`\`
${projectName}/
├── src/
│   └── main.fjs            # Your Flutter.js code
├── assets/                 # Images, fonts, etc.
├── public/                 # Static files
├── flutterjs.config.js     # Flutter.js configuration
├── package.json            # Project metadata
└── README.md
\`\`\`

## About .fjs Files

\`.fjs\` is the Flutter.js file format - write Flutter-like code in JavaScript:

- Flutter-like syntax in JavaScript
- Automatic transpilation to standard JS
- Full IDE support with autocomplete
- Hot reload during development

## Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run preview\` - Preview production build
- \`npm run run\` - All-in-one: build + serve

## Learn More

- [Flutter.js Documentation](https://flutter-js.dev)
- [Flutter Documentation](https://flutter.dev)
`;
    fs.writeFileSync(
      path.join(projectPath, 'README.md'),
      readmeContent
    );

    // Success message
    console.log('\n✅ Project created successfully!\n');
    console.log('📋 Next steps:\n');
    console.log(`   cd ${projectName}`);
    console.log('   npm install');
    console.log('   npm run dev');
    console.log('');
    console.log('📁 Files created:');
    console.log('   ✓ src/main.fjs - Your app entry point');
    console.log('   ✓ flutterjs.config.js - App configuration');
    console.log('   ✓ package.json - Project metadata');
    console.log('   ✓ README.md - Documentation');
    console.log('');
    console.log('🎉 Happy coding!\n');

  } catch (error) {
    console.error('\n❌ Failed to create project:', error.message);

    // Cleanup on failure
    if (fs.existsSync(projectPath)) {
      console.log('🧹 Cleaning up...');
      fs.rmSync(projectPath, { recursive: true, force: true });
    }

    process.exit(1);
  }
}

module.exports = { init };