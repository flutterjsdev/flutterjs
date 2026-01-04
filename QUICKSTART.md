# FlutterJS Quick Start Guide 🚀

This guide shows you the **easiest ways** to run FlutterJS commands without typing long paths.

## 🎯 Quick Commands

### Option 1: Using Wrapper Scripts (Easiest!)

**PowerShell (Recommended for Windows):**
```powershell
# From the flutterjs root directory
.\flutterjs.ps1 run --to-js --serve

# With verbose logging
.\flutterjs.ps1 -v run --to-js --serve

# Other commands
.\flutterjs.ps1 doctor
.\flutterjs.ps1 build
```

**Command Prompt (cmd.exe):**
```cmd
flutterjs run --to-js --serve
flutterjs -v run --to-js --serve
flutterjs doctor
```

### Option 2: Direct Dart Command (Full Control)

```bash
dart run bin/flutterjs.dart run --to-js --serve --devtools-no-open
```

---

## 📋 Common Workflows

### Start Development Server
```bash
# Using wrapper script
.\flutterjs.ps1 run --to-js --serve
```

### Rebuild Engine After Changes
```bash
# Navigate to engine package first
cd packages/flutterjs_engine

# Windows only
npm run build:windows

# All platforms
npm run build:all
```

### Initialize Project (First Time Setup)
```bash
dart run tool/init.dart
```

### Run with Custom Options
```bash
# Using wrapper
.\flutterjs.ps1 run --to-js --serve --port 4000 -v
```

---

## 🔧 Available FlutterJS Commands

| Command | Description |
|---------|-------------|
| `run --to-js --serve` | Generate JS files and start dev server |
| `run --to-js` | Generate JS files only (no server) |
| `build` | Build for production |
| `doctor` | Check environment and dependencies |
| `analyze` | Analyze code quality |
| `-v` / `--verbose` | Enable verbose logging |
| `-vv` | Enable very verbose logging |
| `--help` | Show help information |

---

## 📁 Working Directory

Most commands should be run from:
- **FlutterJS root**: `C:\Jay\_Plugin\flutterjs\` (for wrapper scripts)
- **Example project**: `C:\Jay\_Plugin\flutterjs\examples\counter\` (for project-specific runs)

---

## 🐛 Troubleshooting

**Issue**: "FlutterJS engine not found"
- **Fix**: Run `npm run build:windows` in `packages/flutterjs_engine` to rebuild the engine binary

**Issue**: ES module errors
- **Fix**: Rebuild the engine: `npm run build:windows` in `packages/flutterjs_engine`

**Issue**: Commands not found
- **Fix**: Make sure you're in the flutterjs root directory

**Issue**: PowerShell execution policy error
- **Fix**: Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

---

## 💡 Tips

1. **Use `.\flutterjs.ps1`** for the quickest development workflow on Windows.
2. **Access from anywhere**: Add `C:\Jay\_Plugin\flutterjs` to your PATH
3. **Check logs**: Use `-v` if something goes wrong.

---

## 🎬 Examples

```bash
# Start development (simplest way)
.\flutterjs.ps1 run --to-js --serve

# Build (production)
.\flutterjs.ps1 build

# Rebuild engine after changes
cd packages/flutterjs_engine
npm run build:windows

# Full initialization
cd ../..
dart run tool/init.dart
```

---

Happy coding! 🎉
