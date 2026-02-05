# Installation

## System Requirements

- **Node.js**: Version 14 or higher ([Download](https://nodejs.org))
- **npm**: Version 6 or higher (comes with Node.js)
- **Operating System**: Windows, macOS, or Linux

## Verify Prerequisites

Check if you have Node.js and npm installed:

```bash
node --version
# Should output: v18.x.x or higher

npm --version
# Should output: 9.x.x or higher
```

If not installed, download and install Node.js from [nodejs.org](https://nodejs.org) (LTS version recommended).

---

## Option 1: npm Installation (Recommended)

Install FlutterJS globally using npm:

```bash
npm install -g flutterjs
```

Verify the installation:

```bash
flutterjs --version
```

---

## Option 2: Install from Source

For development or contributing:

### 1. Clone the Repository

```bash
git clone https://github.com/flutterjsdev/flutterjs.git
cd flutterjs
```

### 2. Install Dependencies

```bash
# Get Dart dependencies
dart pub get

# Initialize project (installs JS dependencies)
dart run tool/init.dart
```

### 3. Link Globally (Optional)

To use the local version globally:

```bash
cd packages/flutterjs_engine
npm link
```

Now you can use `flutterjs` command from anywhere on your system.

---

## Platform-Specific Notes

### Windows

No additional steps required. FlutterJS uses `flutterjs.exe` binary automatically.

### macOS

You may need to give execution permissions:

```bash
chmod +x /usr/local/lib/node_modules/flutterjs/dist/flutterjs-macos
```

### Linux

You may need to give execution permissions:

```bash
chmod +x /usr/local/lib/node_modules/flutterjs/dist/flutterjs-linux
```

---

## Troubleshooting

### "command not found: flutterjs"

If the global installation doesn't add `flutterjs` to your PATH:

**Windows:**
```bash
npm bin -g
# Add the output directory to your PATH environment variable
```

**macOS/Linux:**
```bash
echo 'export PATH="$(npm bin -g):$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Permission Errors (macOS/Linux)

If you get permission errors during installation:

```bash
sudo npm install -g flutterjs
```

Or set up npm to install packages globally without sudo ([Guide](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally)).

---

## Next Steps

Once installed, continue to the [Quick Start](quick-start.md) guide to create your first FlutterJS app!
