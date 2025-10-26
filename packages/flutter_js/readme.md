# Flutter.js CLI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D14.0.0-green.svg)](https://nodejs.org)
[![npm version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://www.npmjs.com/package/flutter_js)

A lightweight, zero-dependency CLI build tool for converting Flutter/Dart applications to JavaScript. Supports Server-Side Rendering (SSR), Client-Side Rendering (CSR), and hybrid modes.

## 🚀 Features

- **Zero External Dependencies** - Minimal footprint, fast installation
- **Cross-Platform** - Works on Windows, macOS, and Linux
- **Multiple Render Modes** - SSR, CSR, and Hybrid rendering options
- **Development Server** - Hot-reload enabled development environment
- **Production Build** - Minification and obfuscation support
- **Simple CLI** - Easy-to-use command-line interface
- **Standalone Executables** - Distribute as platform-specific binaries

## 📋 Prerequisites

- **Node.js** >= 14.0.0
- **npm** >= 6.0.0

## 🔧 Installation

### Option 1: As npm Package

```bash
npm install -g flutter_js
```

### Option 2: Download Pre-Built Executable

Download the executable for your platform:
- **Windows**: `flutter_js.exe`
- **macOS**: `flutter_js-macos`
- **Linux**: `flutter_js-linux`

See [Releases](https://github.com/jaypal1046/flutterjs/package/flutter_js/releases) page.

### Option 3: Build from Source

```bash
git clone https://github.com/jaypal1046/flutterjs.git
cd flutter_js
npm install
npm run build:all
```

## 💾 Setup (Choose One)

### Method 1: Add to System PATH (Recommended)

**Windows:**
```cmd
REM Run as Administrator
mkdir "C:\Program Files\flutter_js"
copy "dist\flutter_js.exe" "C:\Program Files\flutter_js\"
copy "dist\flutter_js.bat" "C:\Program Files\flutter_js\"
setx PATH "%PATH%;C:\Program Files\flutter_js"
```
Then restart Command Prompt.

**macOS/Linux:**
```bash
sudo cp dist/flutter_js-macos /usr/local/bin/flutter_js
sudo chmod +x /usr/local/bin/flutter_js
```

### Method 2: Run Directly from dist Folder

**Windows:**
```cmd
cd dist
flutter_js.exe init my-app
flutter_js.exe dev
```

**macOS/Linux:**
```bash
cd dist
./flutter_js-macos init my-app
./flutter_js-macos dev
```

### Method 3: Use Full File Path

**Windows:**
```cmd
"C:\path\to\flutter_js\dist\flutter_js.exe" init my-app
```

**macOS/Linux:**
```bash
/path/to/flutter_js/dist/flutter_js-macos init my-app
```

## 🎯 Quick Start

### 1. Create a New Project

```bash
flutter_js init my-app
cd my-app
```

This creates a new Flutter.js project with the following structure:
```
my-app/
├── flutter.config.js      # Configuration file
├── package.json           # Project metadata
├── README.md             # Project README
├── src/
│   └── main.dart         # Your Flutter code
├── assets/               # Images, fonts, etc.
└── .gitignore           # Git ignore rules
```

### 2. Write Your Flutter Code

Edit `src/main.dart`:
```dart
void main() {
  print('Hello from Flutter.js!');
}
```

### 3. Transpile Flutter Code

```bash
flutter_js_compiler transpile src/
```

This generates `.flutter_js/app.generated.js`

### 4. Start Development Server

```bash
flutter_js dev
```

Opens at `http://localhost:3000`

### 5. Build for Production

```bash
flutter_js build
```

Optimized build created in `dist/` folder

### 6. Preview Production Build

```bash
flutter_js preview
```

Preview at `http://localhost:4173`

## 📖 Commands

### `flutter_js init <name>`

Create a new Flutter.js project.

```bash
flutter_js init my-app
```

**Options:**
- `--template <name>` - Use specific template

### `flutter_js dev`

Start development server with hot-reload.

```bash
flutter_js dev                 # Default port 3000
flutter_js dev --port 8080     # Custom port
flutter_js dev --open          # Auto-open browser
```

**Options:**
- `-p, --port <port>` - Server port (default: 3000)
- `--open` - Open browser automatically

### `flutter_js build`

Build application for production.

```bash
flutter_js build                          # Default build
flutter_js build --mode ssr               # SSR mode
flutter_js build --mode csr               # CSR mode
flutter_js build --output custom-build/   # Custom output
flutter_js build --no-minify              # Skip minification
flutter_js build --no-obfuscate           # Skip obfuscation
```

**Options:**
- `-m, --mode <mode>` - Build mode (ssr/csr/hybrid)
- `-o, --output <dir>` - Output directory
- `--no-minify` - Disable minification
- `--no-obfuscate` - Disable obfuscation

### `flutter_js preview`

Preview production build locally.

```bash
flutter_js preview                  # Default port 4173
flutter_js preview --port 5000      # Custom port
flutter_js preview --open           # Auto-open browser
```

**Options:**
- `-p, --port <port>` - Server port (default: 4173)
- `--open` - Open browser automatically

### `flutter_js --help`

Show help information.

```bash
flutter_js --help
```

### `flutter_js --version`

Show version information.

```bash
flutter_js --version
```

## ⚙️ Configuration

Edit `flutter.config.js` in your project root:

```javascript
module.exports = {
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
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | string | 'csr' | Rendering mode (ssr/csr/hybrid) |
| `build.output` | string | 'dist' | Output directory |
| `build.minify` | boolean | true | Enable minification |
| `build.obfuscate` | boolean | true | Enable obfuscation |
| `build.sourcemap` | boolean | false | Generate source maps |
| `server.port` | number | 3000 | Development server port |
| `server.hot` | boolean | true | Enable hot reload |
| `optimization.splitChunks` | boolean | true | Split code into chunks |
| `optimization.treeshake` | boolean | true | Remove unused code |

## 📁 Project Structure

```
your-project/
├── flutter.config.js       # Configuration file
├── package.json            # npm package info
├── README.md              # Project documentation
├── .gitignore             # Git ignore rules
├── src/
│   ├── main.dart          # Entry point
│   └── ...                # Your Dart files
├── assets/                # Static assets
│   ├── images/
│   ├── fonts/
│   └── icons/
├── .flutter_js/           # Generated files (auto)
│   ├── app.generated.js
│   └── app.generated.css
├── dist/                  # Production build (generated)
│   ├── index.html
│   ├── app.min.js
│   ├── styles.css
│   └── assets/
└── .dev/                  # Development build (temporary)
    ├── index.html
    ├── app.js
    ├── styles.css
    └── assets/
```

## 🔨 Build Executables

Build standalone executables for distribution:

```bash
# Install pkg (one time)
npm install -g pkg

# Build for all platforms
npm run pkg:build:all

# Or build individual platforms
npm run pkg:build:linux      # Linux x64
npm run pkg:build:macos      # macOS x64
npm run pkg:build:windows    # Windows x64
```

Output files (40-50 MB each):
- `dist/flutter_js-linux`
- `dist/flutter_js-macos`
- `dist/flutter_js-win.exe`

## 🎨 Render Modes

### Client-Side Rendering (CSR) - Default

Application runs entirely in the browser.

```javascript
mode: 'csr'
```

**Pros:**
- Simple deployment
- Client handles rendering
- Good for single-page apps

**Cons:**
- Initial load is slower
- Not ideal for SEO

### Server-Side Rendering (SSR)

Application pre-renders on the server.

```javascript
mode: 'ssr'
```

**Pros:**
- Fast initial page load
- Great for SEO
- Instant content display

**Cons:**
- Requires server
- More complex setup

### Hybrid Mode

Combines SSR and CSR for optimal performance.

```javascript
mode: 'hybrid'
```

**Pros:**
- Best of both worlds
- Optimal performance
- Good SEO

**Cons:**
- Most complex
- Requires server

## 📦 Assets Management

Place static files in the `assets/` directory:

```
assets/
├── images/
│   ├── logo.png
│   ├── background.jpg
│   └── icon.svg
├── fonts/
│   ├── CustomFont.ttf
│   └── AnotherFont.woff2
└── icons/
    └── favicon.ico
```

Assets are automatically copied to build output.

## 🚀 Development Workflow

### 1. Start Development Server

```bash
flutter_js dev
```

Server runs at `http://localhost:3000`

### 2. Edit Files

- Modify `src/main.dart`
- Update `assets/`
- Change configuration in `flutter.config.js`

### 3. Hot Reload

Changes are automatically detected and reloaded (if enabled in config).

### 4. Build When Ready

```bash
flutter_js build
```

## 🏗️ Production Deployment

### 1. Build Application

```bash
flutter_js build --mode ssr
```

### 2. Output Files

```
dist/
├── index.html      # Main HTML file
├── app.min.js      # Minified JavaScript
├── styles.css      # Processed CSS
└── assets/         # Static assets
```

### 3. Deploy

Upload `dist/` folder to your hosting:

**Static Hosting (Netlify, Vercel, GitHub Pages):**
```bash
# Copy dist/ folder contents to hosting
```

**Node.js Server:**
```javascript
const express = require('express');
const app = express();
app.use(express.static('dist'));
app.listen(3000);
```

### 4. Environment Variables

Create `.env` file in project root:
```
API_URL=https://api.example.com
ENVIRONMENT=production
```

## 🔍 Troubleshooting

### Issue: "Generated code not found"

**Solution:** Transpile your Flutter code first:
```bash
flutter_js_compiler transpile src/
```

### Issue: Port Already in Use

**Solution:** Use different port:
```bash
flutter_js dev --port 8080
```

### Issue: Build Fails

**Solution:** Check for errors:
1. Verify `src/main.dart` exists
2. Check `flutter.config.js` syntax
3. Run transpiler: `flutter_js_compiler transpile src/`

### Issue: Cannot Find flutter_js Command

**Solution:** Use full path or add to PATH:
```bash
# Full path
/path/to/dist/flutter_js --version

# Or add to PATH (see Setup section)
```

## 📚 Examples

### Basic Hello World

```dart
// src/main.dart
void main() {
  print('Hello, Flutter.js!');
}
```

### With UI Components

```dart
// src/main.dart
import 'package:flutter/material.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: Text('Flutter.js App')),
        body: Center(child: Text('Hello World')),
      ),
    );
  }
}
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🔗 Resources

- [Flutter Documentation](https://flutter.dev/docs)
- [Dart Language](https://dart.dev)
- [GitHub Repository](https://github.com/jaypal1046/flutterjs)
- [Issue Tracker](https://github.com/jaypal1046/flutterjs/issues)

## 👨‍💼 Support

- **Documentation**: Check this README and inline help
- **Issues**: [GitHub Issues](https://github.com/jaypal1046/flutterjs/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jaypal1046/flutterjs/discussions)

## 🎓 Getting Help

### Quick Help
```bash
flutter_js --help
```

### Command Help
```bash
flutter_js dev --help
flutter_js build --help
```

### FAQ

**Q: How do I update Flutter.js?**
```bash
npm install -g flutter_js@latest
```

**Q: Can I use external packages?**
A: Yes, install via npm and import in your Dart code.

**Q: Is SEO supported?**
A: Yes, use SSR or Hybrid mode for better SEO.

**Q: Can I customize the build output?**
A: Yes, edit `flutter.config.js` to customize settings.

## 📊 Performance

- **Build Time**: ~2-5 seconds (depends on project size)
- **Bundle Size**: ~50 KB (minified + gzipped)
- **Development Server**: Fast reload in <1 second
- **Production**: Optimized for performance

## 🔐 Security

- No external dependencies = fewer security vulnerabilities
- Regularly updated to fix security issues
- Follow [OWASP](https://owasp.org) best practices

## 📈 Roadmap

- [ ] WebAssembly (WASM) support
- [ ] Advanced code splitting
- [ ] Service Worker integration
- [ ] Progressive Web App (PWA) support
- [ ] TypeScript support
- [ ] Plugin system

## 🙏 Acknowledgments

- Built with Node.js
- Inspired by Flutter and modern web tooling
- Community feedback and contributions

---

**Made with ❤️ by the Flutter.js Team**

**Version:** 1.0.0  
**Last Updated:** 2025-01-15  
**Status:** Stable ✅