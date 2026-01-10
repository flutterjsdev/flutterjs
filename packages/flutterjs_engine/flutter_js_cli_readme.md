# Flutter.js CLI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D14.0.0-green.svg)](https://nodejs.org)
[![npm version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://www.npmjs.com/package/flutter_js)

A lightweight, zero-dependency CLI build tool for converting Flutter/Dart applications to JavaScript. Supports Server-Side Rendering (SSR), Client-Side Rendering (CSR), and hybrid modes.

## 🚀 Features

- **Zero External Dependencies** - Minimal footprint, fast installation
- **Cross-Platform** - Works on Windows, macOS, and Linux
- **Multiple Render Modes** - SSR, CSR, and Hybrid rendering options
- **Development Server** - Hot-reload enabled development environment with live feedback
- **Production Build** - Minification and obfuscation support with bundle analysis
- **Simple CLI** - Easy-to-use command-line interface with helpful error messages
- **Standalone Executables** - Distribute as platform-specific binaries
- **Asset Management** - Automatic copying and optimization of static assets
- **Configuration File** - Flexible `flutter.config.js` for project customization

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
- **Windows**: `flutterjs.exe`
- **macOS**: `flutterjs-macos`
- **Linux**: `flutterjs-linux`

See [Releases](https://github.com/jaypal1046/flutterjs/releases) page.

### Option 3: Build from Source

```bash
git clone https://github.com/jaypal1046/flutterjs.git
cd flutterjs
npm install
npm run build:all
```

## 💾 Setup (Choose One)

### Method 1: Add to System PATH (Recommended)

**Windows:**
```cmd
REM Run as Administrator
mkdir "C:\Program Files\flutterjs"
copy "dist\flutterjs.exe" "C:\Program Files\flutter_js\"
copy "dist\flutterjs.bat" "C:\Program Files\flutter_js\"
setx PATH "%PATH%;C:\Program Files\flutter_js"
```
Then restart Command Prompt.

**macOS/Linux:**
```bash
sudo cp dist/flutterjs-macos /usr/local/bin/flutterjs
sudo chmod +x /usr/local/bin/flutterjs
```

### Method 2: Run Directly from dist Folder

**Windows:**
```cmd
cd dist
flutterjs.exe init my-app
flutterjs.exe dev
```

**macOS/Linux:**
```bash
cd dist
./flutterjs-macos init my-app
./flutterjs-macos dev
```

### Method 3: Use Full File Path

**Windows:**
```cmd
"C:\path\to\flutterjs\dist\flutterjs.exe" init my-app
```

**macOS/Linux:**
```bash
/path/to/flutterjs/dist/flutterjs-macos init my-app
```

## 🎯 Quick Start

### 1. Create a New Project

```bash
flutter_js init my-app
cd my-app
npm install
```

This creates a new Flutter.js project with the following structure:
```
my-app/
├── .vscode/                 # VS Code configuration
│   ├── settings.json
│   └── extensions.json
├── flutter.config.js        # Configuration file
├── package.json             # Project metadata
├── README.md               # Project documentation
├── .eslintrc.json          # ESLint rules
├── .prettierrc.json        # Prettier formatting
├── .gitignore              # Git ignore rules
├── src/
│   └── main.fjs            # Your Flutter.js code
├── assets/                 # Images, fonts, etc.
└── .flutter_js/            # Generated files (auto)
```

### 2. Write Your Flutter Code

Edit `src/main.fjs`:
```javascript
class MyApp extends FJSWidget {
  @override
  build(context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: Text('Hello Flutter.js')),
        body: Center(child: Text('Welcome!')),
      ),
    );
  }
}
```

### 3. Start Development Server

```bash
npm run dev
```

Opens at `http://localhost:3000` with hot reload enabled

### 4. Build for Production

```bash
npm run build
```

Creates optimized build in `dist/` folder with minification and obfuscation

### 5. Preview Production Build

```bash
npm run preview
```

Preview at `http://localhost:4173`

## 📖 Commands

### `flutter_js init <name>`

Create a new Flutter.js project with scaffolding and templates.

```bash
flutter_js init my-app
flutter_js init my-app --template advanced
```

**Options:**
- `--template <name>` - Use specific template (default: basic)

**Creates:**
- VS Code configuration
- ESLint and Prettier setup
- Sample `.fjs` files
- Configuration file
- Package.json with npm scripts

### `flutter_js dev`

Start development server with hot-reload support.

```bash
flutter_js dev                    # Default port 3000
flutter_js dev --port 8080        # Custom port
flutter_js dev --port 3001 --open # Auto-open browser
```

**Options:**
- `-p, --port <port>` - Server port (default: 3000)
- `--open` - Open browser automatically (default: true)

**Features:**
- Color-coded request logging
- SPA routing support (404 → index.html)
- No-cache headers for development
- File change detection and rebuilding
- Graceful shutdown (Ctrl+C)

### `flutter_js build`

Build application for production with optimization options.

```bash
flutter_js build                           # Default build
flutter_js build --mode ssr                # SSR mode
flutter_js build --mode csr                # CSR mode
flutter_js build --mode hybrid             # Hybrid mode
flutter_js build --output custom-build/    # Custom output
flutter_js build --no-minify               # Skip minification
flutter_js build --no-obfuscate            # Skip obfuscation
```

**Options:**
- `-m, --mode <mode>` - Build mode: `ssr`, `csr`, or `hybrid` (default: from config)
- `-o, --output <dir>` - Output directory (default: dist)
- `--no-minify` - Disable JavaScript minification
- `--no-obfuscate` - Disable code obfuscation

**Output:**
- Minified and obfuscated JavaScript
- Combined and minified CSS
- Generated HTML with proper configuration
- Copied assets with directory structure
- Build statistics including bundle sizes

### `flutter_js preview`

Preview production build locally with production headers.

```bash
flutter_js preview                # Default port 4173
flutter_js preview --port 5000    # Custom port
flutter_js preview --open         # Auto-open browser
```

**Options:**
- `-p, --port <port>` - Server port (default: 4173)
- `--open` - Open browser automatically

**Features:**
- Production-like caching headers
- SPA routing support
- Proper MIME type detection
- Directory traversal protection

### `flutter_js --help`

Show help information for all commands.

```bash
flutter_js --help
flutter_js dev --help
flutter_js build --help
flutter_js preview --help
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
| `build.output` | string | 'dist' | Output directory for production builds |
| `build.minify` | boolean | true | Enable JavaScript minification |
| `build.obfuscate` | boolean | true | Enable code obfuscation |
| `build.sourcemap` | boolean | false | Generate source maps for debugging |
| `server.port` | number | 3000 | Development server port |
| `server.host` | string | 'localhost' | Server hostname |
| `server.open` | boolean | false | Auto-open browser on start |
| `server.hot` | boolean | true | Enable hot reload watching |
| `optimization.splitChunks` | boolean | true | Split code into chunks |
| `optimization.treeshake` | boolean | true | Remove unused code |
| `assets.include` | array | ['assets/**/*'] | Assets to include |
| `assets.exclude` | array | ['**/*.md'] | Assets to exclude |

## 📁 Project Structure

```
your-project/
├── .vscode/                 # VS Code workspace settings
│   ├── settings.json        # Editor configuration
│   └── extensions.json      # Recommended extensions
├── src/
│   ├── main.fjs             # Entry point
│   └── ...                  # Your .fjs files
├── assets/                  # Static assets
│   ├── images/              # Image files
│   ├── fonts/               # Font files
│   └── icons/               # Icon files
├── flutter.config.js        # Configuration file
├── package.json             # npm package info
├── .eslintrc.json           # ESLint rules
├── .prettierrc.json         # Prettier formatting
├── .gitignore               # Git ignore rules
├── README.md                # Project documentation
├── .flutter_js/             # Generated files (auto)
│   ├── app.generated.js
│   └── app.generated.css
├── dist/                    # Production build (generated)
│   ├── index.html
│   ├── app.min.js
│   ├── styles.css
│   └── assets/
└── .dev/                    # Development build (temporary)
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

Distribute these executables for your users to run without requiring Node.js installation.

## 🎨 Render Modes

### Client-Side Rendering (CSR) - Default

Application runs entirely in the browser.

```javascript
mode: 'csr'
```

**Pros:**
- Simple deployment (static hosting)
- Client handles rendering
- Good for single-page apps (SPAs)
- Fast subsequent navigations

**Cons:**
- Initial load is slower (JavaScript must download)
- Not ideal for SEO (search engines see empty page)
- Requires JavaScript enabled

### Server-Side Rendering (SSR)

Application pre-renders on the server.

```javascript
mode: 'ssr'
```

**Pros:**
- Fast initial page load
- Excellent for SEO
- Instant content display
- Works without JavaScript

**Cons:**
- Requires Node.js server
- More complex setup
- Higher server load

### Hybrid Mode

Combines SSR and CSR for optimal performance.

```javascript
mode: 'hybrid'
```

**Pros:**
- Best initial load time
- Excellent SEO
- Smooth interactions after hydration
- Optimal user experience

**Cons:**
- Most complex setup
- Requires server
- Higher memory requirements

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

Assets are automatically copied to build output and included in your application.

**Supported Types:**
- Images: PNG, JPG, JPEG, GIF, SVG, WebP
- Fonts: TTF, WOFF, WOFF2
- Icons: ICO, PNG, SVG

## 🚀 Development Workflow

### 1. Start Development Server

```bash
npm run dev
```

Server runs at `http://localhost:3000` with hot reload enabled

### 2. Edit Files

- Modify `src/` files (`.fjs` files)
- Update `assets/`
- Change configuration in `flutter.config.js`

### 3. Hot Reload

Changes are automatically detected and reloaded when `hot: true` in config.

```bash
# Watch changes in action
npm run dev
# Edit src/main.fjs
# Browser automatically reloads
```

### 4. View Changes in Browser

Visit `http://localhost:3000` to see your changes instantly.

### 5. Build When Ready

```bash
npm run build
```

## 🗺️ Production Deployment

### 1. Build Application

```bash
npm run build --mode ssr
```

### 2. Review Output Files

```
dist/
├── index.html         # Main HTML file
├── app.min.js         # Minified JavaScript (optimized)
├── styles.css         # Processed CSS
└── assets/            # Static assets
```

### 3. Deploy to Hosting

**Static Hosting (Netlify, Vercel, GitHub Pages):**
```bash
# Upload dist/ folder contents
# Set base path if in subdirectory
```

**Node.js Server (Heroku, AWS, DigitalOcean):**
```javascript
const express = require('express');
const app = express();
app.use(express.static('dist'));
app.get('*', (req, res) => res.sendFile(__dirname + '/dist/index.html'));
app.listen(3000);
```

**Docker:**
```dockerfile
FROM node:14
WORKDIR /app
COPY dist/ .
RUN npm install -g serve
CMD ["serve", "-s", ".", "-l", "3000"]
```

### 4. Environment Variables

Create `.env` file in project root:
```
API_URL=https://api.example.com
ENVIRONMENT=production
DEBUG=false
```

Access in your code:
```javascript
const apiUrl = process.env.API_URL;
```

## 🔍 Troubleshooting

### Issue: "Generated code not found"

**Solution:** Transpile your Flutter code first:
```bash
flutter_js_compiler transpile src/
```

Or run the development server which builds automatically:
```bash
npm run dev
```

### Issue: Port Already in Use

**Solution:** Use different port:
```bash
npm run dev --port 8080
```

Or kill the process using the port:
```bash
# macOS/Linux
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Issue: Build Fails

**Solution:** Check for errors:
1. Verify `src/main.fjs` exists and has valid syntax
2. Check `flutter.config.js` for syntax errors
3. Ensure all imports are valid
4. Run: `npm run build 2>&1` to see detailed errors

### Issue: Cannot Find flutter_js Command

**Solution:** Use full path or add to PATH:
```bash
# Full path (current directory)
./dist/flutter_js --version

# Or add to system PATH (see Setup section)
flutter_js --version
```

### Issue: Hot Reload Not Working

**Solution:** Ensure `hot: true` in `flutter.config.js`:
```javascript
server: {
  hot: true,  // Enable watching
}
```

### Issue: Assets Not Showing in Build

**Solution:** Ensure assets are in correct location:
```bash
# Should be at project root
assets/
├── images/logo.png
├── fonts/font.ttf
```

And configured in `flutter.config.js`:
```javascript
assets: {
  include: ['assets/**/*'],
}
```

## 📚 Examples

### Basic Hello World

```javascript
// src/main.fjs
class HelloApp extends FJSWidget {
  @override
  build(context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: Text('Hello')),
        body: Center(child: Text('Hello, Flutter.js!')),
      ),
    );
  }
}
```

### With State Management

```javascript
// src/main.fjs
class CounterApp extends StatefulWidget {
  @override
  _CounterAppState createState() => _CounterAppState();
}

class _CounterAppState extends State {
  int count = 0;
  
  @override
  build(context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: Text('Counter')),
        body: Center(
          child: Column(
            children: [
              Text('Count: $count'),
              ElevatedButton(
                onPressed: () => setState(() => count++),
                child: Text('Increment'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

### With Navigation

```javascript
// src/main.fjs
class NavigationApp extends StatelessWidget {
  @override
  build(context) {
    return MaterialApp(
      initialRoute: '/',
      routes: {
        '/': (context) => HomePage(),
        '/about': (context) => AboutPage(),
        '/contact': (context) => ContactPage(),
      },
    );
  }
}
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🔗 Resources

- [Flutter Documentation](https://flutter.dev/docs)
- [Dart Language](https://dart.dev)
- [GitHub Repository](https://github.com/jaypal1046/flutterjs)
- [Issue Tracker](https://github.com/jaypal1046/flutterjs/issues)
- [Discussions](https://github.com/jaypal1046/flutterjs/discussions)

## 👨‍💼 Support

- **Documentation**: Check this README and inline help
- **Issues**: [GitHub Issues](https://github.com/jaypal1046/flutterjs/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jaypal1046/flutterjs/discussions)
- **Quick Help**: `flutter_js --help`

## 🎓 Getting Help

### Quick Help
```bash
flutter_js --help
```

### Command Help
```bash
flutter_js init --help
flutter_js dev --help
flutter_js build --help
flutter_js preview --help
```

### FAQ

**Q: How do I update Flutter.js?**
```bash
npm install -g flutter_js@latest
```

**Q: Can I use external packages?**
A: Yes, install via npm and import in your code.

**Q: Is SEO supported?**
A: Yes, use SSR or Hybrid mode for better SEO performance.

**Q: Can I customize the build output?**
A: Yes, edit `flutter.config.js` to customize all settings.

**Q: What's the difference between `.fjs` and `.dart`?**
A: `.fjs` files are Flutter.js-specific JavaScript with Flutter syntax. They're automatically transpiled to standard JavaScript.

**Q: How do I deploy to production?**
A: Build with `npm run build`, then upload the `dist/` folder to any static hosting or Node.js server.

**Q: Does it work offline?**
A: The development server requires Node.js. Once built, the production version works anywhere.

## 📊 Performance

- **Build Time**: ~2-5 seconds (depends on project size)
- **Bundle Size**: ~50 KB (minified + gzipped, framework only)
- **Development Server**: Fast reload in <1 second
- **Production**: Optimized for performance with minification and tree-shaking
- **Asset Loading**: Efficient caching with proper headers

## 🔐 Security

- **No External Dependencies** - Fewer security vulnerabilities
- **Code Obfuscation** - Protect your source code in production
- **Directory Traversal Protection** - Safe file serving
- **Regular Updates** - Security patches applied promptly
- **OWASP Compliance** - Follow [OWASP](https://owasp.org) best practices

## 🚦 Roadmap

- [ ] WebAssembly (WASM) support
- [ ] Advanced code splitting strategies
- [ ] Service Worker integration
- [ ] Progressive Web App (PWA) support
- [ ] TypeScript support
- [ ] Plugin system for extensions
- [ ] Built-in testing framework
- [ ] Performance monitoring tools

## 🙏 Acknowledgments

- Built with Node.js
- Inspired by Flutter and modern web tooling
- Community feedback and contributions
- Thanks to all contributors and users

---

**Made with ❤️ by the Flutter.js Team**

**Version:** 1.0.0  
**Last Updated:** 2025-01-15  
**Status:** Stable ✅  
**License:** MIT