# FlutterJS Framework - Standalone Architecture Guide

## 🎯 Overview

**FlutterJS** is a pure JavaScript framework that requires **NO Node.js dependency**. It runs entirely in the browser and can be executed via a standalone CLI written in JavaScript.

### Key Principles
- ✅ **Pure JavaScript** - Works in browser immediately
- ✅ **No Node.js Required** - Standalone framework
- ✅ **Self-Contained CLI** - JavaScript-based CLI tool
- ✅ **Flutter-Like API** - Familiar to Flutter developers
- ✅ **Modular Design** - Import only what you need
- ✅ **Material Design** - Complete Material Design 3 system

---

## 📁 Project Structure

```
flutterjs-framework/
├── core/
│   ├── widget.js              # Base Widget class
│   ├── stateless-widget.js    # StatelessWidget
│   ├── stateful-widget.js     # StatefulWidget
│   ├── state.js               # State class
│   └── build-context.js       # BuildContext
│
├── vdom/
│   ├── vnode.js               # Virtual Node implementation
│   └── vnode-builder.js       # VNode builder utilities
│
├── widgets/
│   ├── material/
│   │   ├── material-app.js
│   │   ├── scaffold.js
│   │   ├── app-bar.js
│   │   └── ...
│   ├── layout/
│   │   ├── container.js
│   │   ├── column.js
│   │   ├── row.js
│   │   └── ...
│   ├── button/
│   ├── text/
│   ├── input/
│   └── ...
│
├── state/
│   ├── state-provider.js
│   ├── change-notifier.js
│   └── inherited-widget.js
│
├── theme/
│   ├── theme-data.js
│   ├── colors.js
│   └── text-theme.js
│
├── navigation/
│   ├── navigator.js
│   └── routes.js
│
├── animation/
│   ├── animation-controller.js
│   └── curves.js
│
├── runtime/
│   ├── flutter-js.js          # Core runtime
│   └── run-app.js             # App entry point
│
├── cli/
│   ├── cli.js                 # CLI handler
│   ├── dev-server.js          # Development server
│   ├── build-system.js        # Build pipeline
│   └── project-generator.js   # Project scaffolding
│
├── utils/
│   ├── edge-insets.js
│   ├── alignment.js
│   ├── size.js
│   └── ...
│
├── index.js                   # Main export file
├── package.json               # Package manifest
└── README.md                  # Documentation
```

---

## 🚀 Quick Start

### 1. Installation (No npm install!)

```bash
# Clone or download
git clone https://github.com/flutter-js/framework.git
cd flutterjs-framework

# Make CLI executable
chmod +x cli.js

# Create symlink (optional)
sudo ln -s $(pwd)/cli.js /usr/local/bin/flutter-js
```

### 2. Create a Project

```bash
flutter-js init my-app
cd my-app
```

### 3. Start Development Server

```bash
flutter-js dev --port 5000
```

### 4. Build for Production

```bash
flutter-js build
```

---

## 📦 Module System

### Using as ES Module

```javascript
import { StatelessWidget, Text, Container, MaterialApp, runApp } from './dist/flutter.js';

class MyApp extends StatelessWidget {
  build(context) {
    return new MaterialApp({
      home: new Container({
        child: new Text('Hello FlutterJS!')
      })
    });
  }
}

runApp(MyApp);
```

### Using Default Export

```javascript
import FlutterJS from './dist/flutter.js';

class MyApp extends FlutterJS.StatelessWidget {
  build(context) {
    return new FlutterJS.MaterialApp({
      home: new FlutterJS.Container({
        child: new FlutterJS.Text('Hello!')
      })
    });
  }
}

FlutterJS.runApp(MyApp);
```

---

## 🎨 Widget System Architecture

### Class Hierarchy

```
Widget (Abstract)
├── StatelessWidget
│   └── Custom Widgets (Text, Container, etc.)
└── StatefulWidget
    └── Custom State Widgets (Counter, Form, etc.)

State (For StatefulWidget)
├── initState()
├── build()
├── setState()
└── dispose()
```

### Creating Widgets

#### StatelessWidget (Pure)

```javascript
import { StatelessWidget, Text, Container } from './flutter.js';

class GreetingWidget extends StatelessWidget {
  constructor(props) {
    super(props);
    this.name = props.name || 'World';
  }

  build(context) {
    return new Container({
      child: new Text(`Hello, ${this.name}!`)
    });
  }
}

// Usage
new GreetingWidget({ name: 'Flutter' })
```

#### StatefulWidget (With State)

```javascript
import { StatefulWidget, State, Text, ElevatedButton, Column } from './flutter.js';

class CounterWidget extends StatefulWidget {
  createState() {
    return new _CounterState();
  }
}

class _CounterState extends State {
  constructor() {
    super();
    this.count = 0;
  }

  initState() {
    console.log('Counter initialized');
  }

  build(context) {
    return new Column({
      children: [
        new Text(`Count: ${this.count}`),
        new ElevatedButton({
          child: new Text('Increment'),
          onPressed: () => this.setState({ count: this.count + 1 })
        })
      ]
    });
  }

  dispose() {
    console.log('Counter disposed');
  }
}

// Usage
new CounterWidget()
```

---

## 🎯 Virtual DOM (VNode)

The VNode system bridges Flutter concepts to HTML:

```javascript
// VNode Creation
const vnode = new VNode('div', {
  className: 'flutter-container',
  style: {
    padding: '16px',
    backgroundColor: '#FAFAFA'
  },
  onClick: () => alert('Clicked!')
}, [
  new VNode('span', {}, ['Hello World'])
]);

// Render to DOM
const element = vnode.render();
document.body.appendChild(element);

// Or to HTML string (SSR)
const htmlString = vnode.toHTML();
```

---

## 🎨 Material Design System

### Using Material Widgets

```javascript
import {
  MaterialApp,
  Scaffold,
  AppBar,
  FloatingActionButton,
  ElevatedButton,
  Text
} from './flutter.js';

class HomePage extends StatelessWidget {
  build(context) {
    return new Scaffold({
      appBar: new AppBar({
        title: new Text('Home Page'),
        backgroundColor: '#6750A4' // Material Purple
      }),
      body: new Center({
        child: new Column({
          children: [
            new Text('Welcome!'),
            new ElevatedButton({
              child: new Text('Click Me'),
              onPressed: () => alert('Hello!')
            })
          ]
        })
      }),
      floatingActionButton: new FloatingActionButton({
        child: new Text('+'),
        onPressed: () => console.log('FAB pressed')
      })
    });
  }
}
```

### Theme System

```javascript
import { MaterialApp, ThemeData, ColorScheme } from './flutter.js';

const theme = new ThemeData({
  primaryColor: '#6750A4',
  accentColor: '#FFAB00',
  backgroundColor: '#FFFBFE',
  colorScheme: new ColorScheme({
    primary: '#6750A4',
    onPrimary: '#FFFFFF',
    surface: '#FFFBFE',
    onSurface: '#000000'
  })
});

class MyApp extends StatelessWidget {
  build(context) {
    return new MaterialApp({
      theme: theme,
      home: new HomePage()
    });
  }
}
```

---

## 💾 State Management

### Local State (setState)

```javascript
class CounterState extends State {
  constructor() {
    super();
    this.count = 0;
  }

  build(context) {
    return new Column({
      children: [
        new Text(`Count: ${this.count}`),
        new ElevatedButton({
          child: new Text('Increment'),
          onPressed: () => this.setState({ count: this.count + 1 })
        })
      ]
    });
  }
}
```

### Global State (Provider Pattern)

```javascript
import { StateProvider, InheritedWidget } from './flutter.js';

// Create global provider
const appState = new StateProvider({
  user: null,
  isLoggedIn: false,
  notifications: []
});

// Consume in widget
class UserInfo extends StatefulWidget {
  createState() {
    return new _UserInfoState();
  }
}

class _UserInfoState extends State {
  build(context) {
    const state = appState.value;
    return new Text(
      state.isLoggedIn ? `Welcome, ${state.user.name}` : 'Please login'
    );
  }
}

// Update globally
appState.setValue({
  ...appState.value,
  user: { name: 'John', id: 1 },
  isLoggedIn: true
});
```

---

## 🧭 Navigation

### Named Routes

```javascript
import { MaterialApp, Navigator } from './flutter.js';

class MyApp extends StatelessWidget {
  build(context) {
    return new MaterialApp({
      routes: {
        '/': HomePage,
        '/profile': ProfilePage,
        '/settings': SettingsPage
      },
      home: new HomePage()
    });
  }
}

// Navigate
Navigator.push(context, '/profile', { userId: 123 });

// Pop
Navigator.pop(context);
```

---

## 🛠️ CLI Commands

```bash
# Initialize project
flutter-js init my-app

# Start dev server
flutter-js dev                    # Default port 5000
flutter-js dev --port 3000       # Custom port

# Build for production
flutter-js build                  # Default obfuscation
flutter-js build --mode dev       # Readable output

# Serve production build
flutter-js serve --port 8000

# Help
flutter-js help
flutter-js --help
```

---

## 📊 Build Output

### Development Build

```
build/
├── index.html           (Readable HTML)
├── flutter.js           (Readable JavaScript)
├── styles.css           (Readable CSS)
└── assets/
    └── images/
```

### Production Build

```
build/
├── index.html           (Minified, 3KB)
├── app.min.js           (Obfuscated, 28KB)
├── styles.min.css       (Minified, 6KB)
└── assets/
    └── (optimized)
```

**Size Comparison:**
- **Dev**: ~135KB
- **Prod Uncompressed**: ~37KB
- **Prod Gzipped**: ~12KB

---

## ⚡ Performance Optimization

### Code Splitting

```javascript
// Lazy load widgets
const HeavyWidget = lazy(() => import('./widgets/heavy.js'));

// Usage
<HeavyWidget /> // Loaded when needed
```

### Memoization

```javascript
import { memo } from './flutter.js';

const OptimizedWidget = memo(class extends StatelessWidget {
  build(context) {
    return new Text('Only re-renders on prop change');
  }
});
```

### Tree Shaking

Only used widgets are included in final build:

```bash
flutter-js build --analyze  # Show unused code
```

---

## 🧪 Testing

### Unit Tests

```javascript
import { expect } from 'chai';
import { Text, Container } from './flutter.js';

describe('Text Widget', () => {
  it('should render text content', () => {
    const text = new Text('Hello');
    const vnode = text.build(null);
    expect(vnode.toHTML()).to.include('Hello');
  });
});
```

### Widget Tests

```javascript
describe('Counter Widget', () => {
  it('should increment on button press', () => {
    const counter = new CounterWidget();
    counter.mount('#test-container');

    // Simulate button click
    const button = document.querySelector('button');
    button.click();

    // Verify state changed
    expect(counter._state.count).to.equal(1);
  });
});
```

---

## 🔒 Production Checklist

- [ ] All widgets working in production build
- [ ] Code properly obfuscated
- [ ] Assets optimized
- [ ] Bundle size < 50KB
- [ ] Performance score > 90
- [ ] SEO score > 90
- [ ] WCAG AA compliant
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Dark mode working

---

## 📚 Available Widgets

### Layout (10)
Container, Column, Row, Stack, Positioned, Center, Padding, SizedBox, Flexible, Expanded

### Material (15)
MaterialApp, Scaffold, AppBar, BottomNavigationBar, FloatingActionButton, Card, ListTile, ListView, Drawer, AlertDialog

### Input (5)
TextField, Form, FormField, Checkbox, RadioButton

### Buttons (5)
ElevatedButton, TextButton, OutlinedButton, IconButton, FloatingActionButton

### Text & Media (5)
Text, RichText, Icon, Image, TextSpan

### Progress (3)
CircularProgressIndicator, LinearProgressIndicator, RefreshIndicator

---

## 🚀 Deployment

### Static Hosting (Vercel, Netlify)

```bash
flutter-js build
# Deploy build/ directory
```

### Self-Hosted

```bash
flutter-js serve --port 8000
# Runs production server on http://localhost:8000
```

---

## 📖 Resources

- **GitHub**: https://github.com/flutter-js/framework
- **Documentation**: https://flutter-js.dev/docs
- **Examples**: https://github.com/flutter-js/examples
- **Community**: https://discord.gg/flutter-js

---

## 🎓 Philosophy

FlutterJS brings **Flutter's declarative paradigm and Material Design** to web development **without bloat**. It's not a Flutter replacement but a **Flutter Design System for HTML**.

**Zero Dependencies. Maximum Flexibility. Pure JavaScript.**