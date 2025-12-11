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
    mkdirp(path.join(projectPath, '.flutter_js'));
    
    // Copy template files from framework
    console.log('📋 Setting up from templates...');
    
    // Copy .vscode configuration
    if (fs.existsSync(path.join(templateDir, '.vscode'))) {
      console.log('  ⚙️  Copying VS Code configuration...');
      copyDir(
        path.join(templateDir, '.vscode'),
        path.join(projectPath, '.vscode')
      );
    }
    
    // Copy src folder with main.fjs
    if (fs.existsSync(path.join(templateDir, 'src'))) {
      console.log('  📝 Copying source templates...');
      copyDir(
        path.join(templateDir, 'src'),
        path.join(projectPath, 'src')
      );
    }
    
    // Copy assets folder
    if (fs.existsSync(path.join(templateDir, 'assets'))) {
      console.log('  🎨 Copying assets...');
      copyDir(
        path.join(templateDir, 'assets'),
        path.join(projectPath, 'assets')
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
    
    // Generate dynamic files
    
    // Create package.json
    console.log('📦 Creating package.json...');
    const packageJson = {
      name: projectName,
      version: '1.0.0',
      description: 'A Flutter.js application',
      scripts: {
        dev: 'flutter_js dev',
        build: 'flutter_js build',
        preview: 'flutter_js preview',
      },
      devDependencies: {
        eslint: '^8.0.0',
        prettier: '^3.0.0',
      },
      keywords: ['flutter', 'flutter.js', 'fjs'],
      author: '',
      license: 'MIT',
    };
    fs.writeFileSync(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Create flutter.config.js
    console.log('⚙️  Creating flutter.config.js...');
    const configContent = `module.exports = {
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
`;
    fs.writeFileSync(
      path.join(projectPath, 'flutter.config.js'),
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

The development server watches for changes in your \`.fjs\` files and automatically rebuilds.

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
├── .vscode/
│   ├── settings.json        # VS Code configuration
│   └── extensions.json      # Recommended extensions
├── flutter.config.js        # Flutter.js configuration
├── .eslintrc.json           # ESLint rules
├── .prettierrc.json         # Prettier formatting
├── src/
│   └── main.fjs            # Your Flutter.js code
├── assets/                  # Images, fonts, etc.
├── .flutter_js/            # Generated files (gitignore)
│   └── app.generated.js
├── dist/                   # Production build
└── package.json
\`\`\`

## About .fjs Files

\`.fjs\` is the Flutter.js file format - think of it like \`.js\` but with Flutter-specific syntax and transformations:

- Write Flutter-like code in JavaScript
- Automatic transpilation to standard JavaScript
- Full IDE support with autocomplete
- ESLint integration for code quality
- Hot reload during development

Example \`.fjs\` code:

\`\`\`fjs
class CounterApp extends FJSWidget {
  @override
  build(context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: Text('Counter')),
        body: Center(child: Text('Count: 0')),
      ),
    );
  }
}
\`\`\`

## Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run preview\` - Preview production build

## Configuration

Edit \`flutter.config.js\` to customize:
- Rendering mode (SSR/CSR/Hybrid)
- Build options
- Development server settings
- Optimization settings

## IDE Setup

This project comes with VS Code configuration:

- **settings.json** - Editor settings optimized for .fjs files
- **extensions.json** - Recommended extensions

Install recommended extensions for the best experience!

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
    console.log('📝 Files created:');
    console.log('   ✓ .vscode/ - VS Code configuration');
    console.log('   ✓ src/main.fjs - Your app entry point');
    console.log('   ✓ .eslintrc.json - Linting rules');
    console.log('   ✓ .prettierrc.json - Code formatting');
    console.log('   ✓ flutter.config.js - App configuration');
    console.log('   ✓ package.json - Project metadata');
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