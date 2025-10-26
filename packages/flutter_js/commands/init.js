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

async function init(projectName, options) {
  if (!projectName) {
    console.error('❌ Project name is required!');
    console.log('\n💡 Usage: flutter_js init <project-name>\n');
    process.exit(1);
  }
  
  console.log(`🚀 Creating new Flutter.js project: ${projectName}\n`);
  
  const projectPath = path.join(process.cwd(), projectName);
  
  // Check if directory already exists
  if (fs.existsSync(projectPath)) {
    console.error(`❌ Directory "${projectName}" already exists!`);
    process.exit(1);
  }
  
  try {
    // Create project structure
    console.log('📁 Creating project structure...');
    mkdirp(projectPath);
    mkdirp(path.join(projectPath, 'src'));
    mkdirp(path.join(projectPath, 'assets'));
    mkdirp(path.join(projectPath, '.flutter_js'));
    
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
      keywords: ['flutter', 'flutter.js'],
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
    
    // Create src/main.dart (placeholder)
    console.log('📝 Creating src/main.dart...');
    const mainDartContent = `// Flutter.js Application Entry Point
// 
// This is a placeholder file. Write your Flutter/Dart code here.
// After writing your code, transpile it using:
//   flutter_js_compiler transpile src/
//
// Then build and run:
//   flutter_js dev

void main() {
  // Your Flutter app code here
  print('Hello from Flutter.js!');
}
`;
    fs.writeFileSync(
      path.join(projectPath, 'src', 'main.dart'),
      mainDartContent
    );
    
    // Create README.md
    console.log('📄 Creating README.md...');
    const readmeContent = `# ${projectName}

A Flutter.js application.

## Getting Started

### 1. Transpile Flutter Code
First, transpile your Dart code to JavaScript:

\`\`\`bash
flutter_js_compiler transpile src/
\`\`\`

This will generate \`.flutter_js/app.generated.js\`

### 2. Start Development Server

\`\`\`bash
flutter_js dev
\`\`\`

Opens development server at http://localhost:3000

### 3. Build for Production

\`\`\`bash
flutter_js build
\`\`\`

Creates optimized build in \`dist/\` folder.

### 4. Preview Production Build

\`\`\`bash
flutter_js preview
\`\`\`

## Project Structure

\`\`\`
${projectName}/
├── flutter.config.js      # Configuration file
├── src/
│   └── main.dart         # Your Flutter/Dart code
├── assets/               # Images, fonts, etc.
├── .flutter_js/          # Generated files (gitignore this)
│   └── app.generated.js
├── dist/                 # Production build
└── package.json
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

## Learn More

- [Flutter.js Documentation](https://flutter-js.dev)
- [Flutter Documentation](https://flutter.dev)
`;
    fs.writeFileSync(
      path.join(projectPath, 'README.md'),
      readmeContent
    );
    
    // Create .gitignore
    console.log('🔒 Creating .gitignore...');
    const gitignoreContent = `# Dependencies
node_modules/

# Build outputs
dist/
.dev/

# Generated files
.flutter_js/

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Logs
*.log
npm-debug.log*
`;
    fs.writeFileSync(
      path.join(projectPath, '.gitignore'),
      gitignoreContent
    );
    
    // Create example asset
    console.log('🎨 Creating example assets...');
    const assetsReadme = `# Assets Directory

Place your static assets here:
- Images (PNG, JPG, SVG, etc.)
- Fonts (TTF, WOFF, WOFF2)
- Icons
- Other static files

Example structure:
\`\`\`
assets/
├── images/
│   ├── logo.png
│   └── background.jpg
├── fonts/
│   └── CustomFont.ttf
└── icons/
    └── favicon.ico
\`\`\`

These files will be copied to the build output automatically.
`;
    fs.writeFileSync(
      path.join(projectPath, 'assets', 'README.md'),
      assetsReadme
    );
    
    // Success message
    console.log('\n✅ Project created successfully!\n');
    console.log('📋 Next steps:\n');
    console.log(`   cd ${projectName}`);
    console.log('   # Write your Flutter code in src/main.dart');
    console.log('   flutter_js_compiler transpile src/');
    console.log('   flutter_js dev');
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