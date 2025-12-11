# How to Create Packages - Complete Guide

## What is a "Package"?

A **package** is a folder with:
1. Source code (`.js` files)
2. `package.json` file (metadata)
3. `index.js` file (export everything)

Think of it like a **library you can reuse**.

---

## Step 1: Understand Package.json

A `package.json` tells Node.js what this package is:

```json
{
  "name": "@flutterjs/widgets",
  "version": "1.0.0",
  "description": "Flutter.js Widget Library",
  "main": "dist/index.js",
  "exports": {
    ".": "./dist/index.js",
    "./basic": "./dist/basic/index.js",
    "./layout": "./dist/layout/index.js"
  },
  "keywords": ["flutter", "widgets", "ui"],
  "license": "MIT"
}
```

---

## Step 2: Create Package Structure

### Example 1: Core Package

```bash
# Create folder structure
mkdir -p packages/core/src
cd packages/core

# Create package.json
cat > package.json << 'EOF'
{
  "name": "@flutterjs/core",
  "version": "1.0.0",
  "description": "Flutter.js Core Framework",
  "main": "dist/index.js",
  "exports": {
    ".": "./dist/index.js"
  },
  "license": "MIT"
}
EOF

# Create source files
touch src/widget.js
touch src/state.js
touch src/index.js
```

**packages/core/src/widget.js:**
```javascript
// Base Widget class
class Widget {
  constructor(props = {}) {
    this.props = props;
    this.key = props.key || null;
  }

  build(context) {
    throw new Error('build() must be implemented');
  }

  render() {
    return document.createElement('div');
  }
}

module.exports = Widget;
```

**packages/core/src/state.js:**
```javascript
// State class for StatefulWidget
class State {
  constructor() {
    this.state = {};
  }

  setState(updater) {
    if (typeof updater === 'function') {
      this.state = { ...this.state, ...updater(this.state) };
    } else {
      this.state = { ...this.state, ...updater };
    }
    // Trigger re-render
    if (this._onUpdate) {
      this._onUpdate();
    }
  }
}

module.exports = State;
```

**packages/core/src/index.js:**
```javascript
// Export everything from this package
const Widget = require('./widget');
const State = require('./state');

module.exports = {
  Widget,
  State,
};
```

---

### Example 2: Widgets Package

```bash
mkdir -p packages/widgets/src/basic
mkdir -p packages/widgets/src/layout
cd packages/widgets

cat > package.json << 'EOF'
{
  "name": "@flutterjs/widgets",
  "version": "1.0.0",
  "description": "Flutter.js Widgets",
  "main": "dist/index.js",
  "dependencies": {
    "@flutterjs/core": "^1.0.0"
  },
  "exports": {
    ".": "./dist/index.js",
    "./basic": "./dist/basic/index.js",
    "./layout": "./dist/layout/index.js"
  },
  "license": "MIT"
}
EOF
```

**packages/widgets/src/basic/text.js:**
```javascript
const { Widget } = require('@flutterjs/core');

class Text extends Widget {
  constructor(props = {}) {
    super(props);
    this.text = props.text || '';
    this.style = props.style || {};
  }

  build(context) {
    return this;
  }

  render() {
    const el = document.createElement('span');
    el.textContent = this.text;
    el.className = 'flutter-text';
    
    // Apply custom styles
    Object.assign(el.style, this.style);
    
    return el;
  }
}

module.exports = Text;
```

**packages/widgets/src/basic/container.js:**
```javascript
const { Widget } = require('@flutterjs/core');

class Container extends Widget {
  constructor(props = {}) {
    super(props);
    this.width = props.width;
    this.height = props.height;
    this.color = props.color;
    this.padding = props.padding;
    this.child = props.child;
  }

  build(context) {
    return this;
  }

  render() {
    const el = document.createElement('div');
    el.className = 'flutter-container';
    
    if (this.width) el.style.width = this.width;
    if (this.height) el.style.height = this.height;
    if (this.color) el.style.backgroundColor = this.color;
    if (this.padding) el.style.padding = this.padding;
    
    if (this.child) {
      el.appendChild(this.child.render());
    }
    
    return el;
  }
}

module.exports = Container;
```

**packages/widgets/src/basic/index.js:**
```javascript
const Text = require('./text');
const Container = require('./container');

module.exports = {
  Text,
  Container,
};
```

**packages/widgets/src/layout/column.js:**
```javascript
const { Widget } = require('@flutterjs/core');

class Column extends Widget {
  constructor(props = {}) {
    super(props);
    this.children = props.children || [];
    this.mainAxisAlignment = props.mainAxisAlignment || 'flex-start';
    this.crossAxisAlignment = props.crossAxisAlignment || 'stretch';
  }

  build(context) {
    return this;
  }

  render() {
    const el = document.createElement('div');
    el.className = 'flutter-column';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.justifyContent = this.mainAxisAlignment;
    el.style.alignItems = this.crossAxisAlignment;
    
    this.children.forEach(child => {
      el.appendChild(child.render());
    });
    
    return el;
  }
}

module.exports = Column;
```

**packages/widgets/src/layout/row.js:**
```javascript
const { Widget } = require('@flutterjs/core');

class Row extends Widget {
  constructor(props = {}) {
    super(props);
    this.children = props.children || [];
    this.mainAxisAlignment = props.mainAxisAlignment || 'flex-start';
    this.crossAxisAlignment = props.crossAxisAlignment || 'center';
  }

  build(context) {
    return this;
  }

  render() {
    const el = document.createElement('div');
    el.className = 'flutter-row';
    el.style.display = 'flex';
    el.style.flexDirection = 'row';
    el.style.justifyContent = this.mainAxisAlignment;
    el.style.alignItems = this.crossAxisAlignment;
    
    this.children.forEach(child => {
      el.appendChild(child.render());
    });
    
    return el;
  }
}

module.exports = Row;
```

**packages/widgets/src/layout/index.js:**
```javascript
const Column = require('./column');
const Row = require('./row');

module.exports = {
  Column,
  Row,
};
```

**packages/widgets/src/index.js:**
```javascript
const basicWidgets = require('./basic');
const layoutWidgets = require('./layout');

module.exports = {
  ...basicWidgets,
  ...layoutWidgets,
};
```

---

### Example 3: Material Package

```bash
mkdir -p packages/material/src/theme
mkdir -p packages/material/src/widgets
cd packages/material

cat > package.json << 'EOF'
{
  "name": "@flutterjs/material",
  "version": "1.0.0",
  "description": "Flutter.js Material Design",
  "main": "dist/index.js",
  "dependencies": {
    "@flutterjs/core": "^1.0.0",
    "@flutterjs/widgets": "^1.0.0"
  },
  "license": "MIT"
}
EOF
```

**packages/material/src/theme/colors.js:**
```javascript
const Colors = {
  // Primary colors
  red: '#F44336',
  pink: '#E91E63',
  purple: '#9C27B0',
  deepPurple: '#673AB7',
  indigo: '#3F51B5',
  blue: '#2196F3',
  lightBlue: '#03A9F4',
  cyan: '#00BCD4',
  teal: '#009688',
  green: '#4CAF50',
  lightGreen: '#8BC34A',
  lime: '#CDDC39',
  yellow: '#FFEB3B',
  amber: '#FFC107',
  orange: '#FF9800',
  deepOrange: '#FF5722',
  brown: '#795548',
  grey: '#9E9E9E',
  blueGrey: '#607D8B',
  black: '#000000',
  white: '#FFFFFF',
};

module.exports = Colors;
```

**packages/material/src/theme/theme_data.js:**
```javascript
const Colors = require('./colors');

class ThemeData {
  constructor(props = {}) {
    this.primaryColor = props.primaryColor || Colors.blue;
    this.primarySwatch = props.primarySwatch || Colors.blue;
    this.accentColor = props.accentColor || Colors.blue;
    this.backgroundColor = props.backgroundColor || Colors.white;
    this.textTheme = props.textTheme || {};
  }
}

module.exports = ThemeData;
```

**packages/material/src/theme/index.js:**
```javascript
const Colors = require('./colors');
const ThemeData = require('./theme_data');

module.exports = {
  Colors,
  ThemeData,
};
```

**packages/material/src/widgets/scaffold.js:**
```javascript
const { Widget } = require('@flutterjs/core');

class Scaffold extends Widget {
  constructor(props = {}) {
    super(props);
    this.appBar = props.appBar;
    this.body = props.body;
    this.floatingActionButton = props.floatingActionButton;
  }

  build(context) {
    return this;
  }

  render() {
    const el = document.createElement('div');
    el.className = 'flutter-scaffold';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.height = '100vh';
    
    if (this.appBar) {
      el.appendChild(this.appBar.render());
    }
    
    if (this.body) {
      const bodyEl = document.createElement('div');
      bodyEl.className = 'scaffold-body';
      bodyEl.style.flex = '1';
      bodyEl.appendChild(this.body.render());
      el.appendChild(bodyEl);
    }
    
    if (this.floatingActionButton) {
      el.appendChild(this.floatingActionButton.render());
    }
    
    return el;
  }
}

module.exports = Scaffold;
```

**packages/material/src/widgets/app_bar.js:**
```javascript
const { Widget } = require('@flutterjs/core');

class AppBar extends Widget {
  constructor(props = {}) {
    super(props);
    this.title = props.title;
    this.backgroundColor = props.backgroundColor || '#1976D2';
  }

  build(context) {
    return this;
  }

  render() {
    const el = document.createElement('header');
    el.className = 'flutter-app-bar';
    el.style.backgroundColor = this.backgroundColor;
    el.style.color = 'white';
    el.style.padding = '16px';
    el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    
    if (this.title) {
      el.appendChild(this.title.render());
    }
    
    return el;
  }
}

module.exports = AppBar;
```

**packages/material/src/widgets/index.js:**
```javascript
const Scaffold = require('./scaffold');
const AppBar = require('./app_bar');

module.exports = {
  Scaffold,
  AppBar,
};
```

**packages/material/src/index.js:**
```javascript
const theme = require('./theme');
const widgets = require('./widgets');

module.exports = {
  ...theme,
  ...widgets,
};
```

---

## Step 3: Root Package.json Setup (Optional)

Your root `flutterjs/package.json`:

```json
{
  "name": "flutterjs",
  "version": "1.0.0",
  "private": true,
  "description": "Flutter to JavaScript Framework",
  "license": "MIT",
  "scripts": {
    "build": "node scripts/build.js",
    "dev": "node bin/index.js dev",
    "run": "node bin/index.js run"
  }
}
```

---

## Step 4: How to Use Packages in Your App

**User creates an app:**

```javascript
// app.js
const { Text, Container, Column, Row } = require('@flutterjs/widgets');
const { Scaffold, AppBar } = require('@flutterjs/material');

class MyApp {
  render() {
    const app = new Scaffold({
      appBar: new AppBar({
        title: new Text({ text: 'Hello' })
      }),
      body: new Column({
        children: [
          new Text({ text: 'Welcome to Flutter.js' }),
          new Container({
            color: '#f0f0f0',
            padding: '16px',
            child: new Text({ text: 'This is a container' })
          })
        ]
      })
    });

    return app.render();
  }
}

// Mount to DOM
const root = document.getElementById('root');
const myApp = new MyApp();
root.appendChild(myApp.render());
```

---

## Step 5: Building Packages

Create a build script `scripts/build.js`:

```javascript
const fs = require('fs');
const path = require('path');

// Get all packages
const packageDirs = fs.readdirSync('packages');

packageDirs.forEach(pkg => {
  const srcDir = path.join('packages', pkg, 'src');
  const distDir = path.join('packages', pkg, 'dist');
  
  // Create dist directory
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  // Copy src to dist (for now, later use bundlers)
  fs.cpSync(srcDir, distDir, { recursive: true });
  
  console.log(`✅ Built package: ${pkg}`);
});
```

Run:
```bash
npm run build
```

---

## File Structure After Creating Packages

```
flutterjs/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── widget.js
│   │   │   ├── state.js
│   │   │   └── index.js
│   │   ├── dist/                    # Generated by build script
│   │   │   ├── widget.js
│   │   │   ├── state.js
│   │   │   └── index.js
│   │   └── package.json
│   │
│   ├── widgets/
│   │   ├── src/
│   │   │   ├── basic/
│   │   │   │   ├── text.js
│   │   │   │   ├── container.js
│   │   │   │   └── index.js
│   │   │   ├── layout/
│   │   │   │   ├── column.js
│   │   │   │   ├── row.js
│   │   │   │   └── index.js
│   │   │   └── index.js
│   │   ├── dist/                    # Generated
│   │   └── package.json
│   │
│   └── material/
│       ├── src/
│       │   ├── theme/
│       │   ├── widgets/
│       │   └── index.js
│       ├── dist/                    # Generated
│       └── package.json
│
├── scripts/
│   └── build.js
├── package.json
└── README.md
```

---

## Summary: Creating a Package

1. **Create folder** - `packages/my-package/`
2. **Create package.json** - Metadata
3. **Create src/** - Source code
4. **Create index.js** - Export everything
5. **Create dist/** - Build output (generated)
6. **Run build script** - Compile

That's it! Each package is independent and reusable.