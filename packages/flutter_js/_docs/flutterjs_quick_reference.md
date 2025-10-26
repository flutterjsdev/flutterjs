# FlutterJS Quick Reference Card

## 🚀 10-Second Start

```bash
git clone https://github.com/flutter-js/framework
cd flutterjs-framework
./cli.js init my-app && cd my-app
./cli.js dev
```

---

## 📦 Core Imports

```javascript
import {
  // Base classes
  Widget, StatelessWidget, StatefulWidget, State,
  
  // Layout
  Container, Column, Row, Stack, Center, Padding,
  
  // Buttons
  ElevatedButton, TextButton, IconButton,
  
  // Input
  TextField, Checkbox, Switch, RadioButton,
  
  // Text & Media
  Text, Icon, Image,
  
  // Structure
  MaterialApp, Scaffold, AppBar, BottomNavBar,
  
  // Utilities
  runApp, ThemeData, Colors,
  Navigator, EdgeInsets, TextStyle
} from './dist/flutter.js';
```

---

## 🎨 Widget Hierarchy

```
Widget (Abstract)
├── StatelessWidget      (Pure - no state)
└── StatefulWidget       (Has state)
    └── State            (Holds state + lifecycle)

BuildContext            (Tree context)
VNode                   (Virtual node)
```

---

## 💻 Stateless Widget

```javascript
class MyWidget extends StatelessWidget {
  build(context) {
    return new Text('Hello!');
  }
}
```

---

## 📊 Stateful Widget

```javascript
class Counter extends StatefulWidget {
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
    // Called when mounted
  }

  build(context) {
    return new Column({
      children: [
        new Text(`${this.count}`),
        new ElevatedButton({
          child: new Text('Increment'),
          onPressed: () => this.setState({ count: this.count + 1 })
        })
      ]
    });
  }

  dispose() {
    // Called when unmounted
  }
}
```

---

## 🎯 setState Pattern

```javascript
// Update state
this.setState({ key: value });

// Update with callback
this.setState(state => ({
  count: state.count + 1,
  total: state.count + 1
}));

// Async update
async fetchData() {
  const data = await api.get();
  this.setState({ data });
}
```

---

## 🏗️ Layout Widgets

| Widget | Purpose | Usage |
|--------|---------|-------|
| **Container** | Box with decoration | Padding, background, size |
| **Column** | Vertical layout | Stack children vertically |
| **Row** | Horizontal layout | Stack children horizontally |
| **Stack** | Overlay layout | Layer children on top |
| **Center** | Center child | Center content |
| **Padding** | Add spacing | Around child |
| **SizedBox** | Fixed size | Spacer or fixed dimension |
| **Expanded** | Fill space | Flexible sizing |
| **Wrap** | Flow layout | Wrap on overflow |
| **Align** | Align child | Position within space |

---

## 🔘 Button Widgets

```javascript
// Elevated Button
new ElevatedButton({
  child: new Text('Click'),
  onPressed: () => handleClick(),
  backgroundColor: '#6750A4',
  textColor: '#FFFFFF'
})

// Text Button
new TextButton({
  child: new Text('Cancel'),
  onPressed: () => handleCancel()
})

// Icon Button
new IconButton({
  icon: new Icon('favorite'),
  onPressed: () => handleFavorite()
})

// Floating Action Button
new FloatingActionButton({
  child: new Text('+'),
  onPressed: () => handleAdd()
})
```

---

## ⌨️ Input Widgets

```javascript
// Text Field
new TextField({
  label: 'Enter name',
  onChanged: (value) => this.setState({ name: value }),
  validator: (value) => value.length > 0 ? null : 'Required'
})

// Checkbox
new Checkbox({
  value: this.state.agreed,
  onChanged: (value) => this.setState({ agreed: value })
})

// Switch
new Switch({
  value: this.state.darkMode,
  onChanged: (value) => this.setState({ darkMode: value })
})

// Radio Button
new RadioButton({
  value: 'option1',
  groupValue: this.state.selected,
  onChanged: (value) => this.setState({ selected: value })
})
```

---

## 📄 Text & Media

```javascript
// Text
new Text('Hello', {
  style: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#000000'
  }
})

// Icon
new Icon('favorite', {
  size: 24,
  color: '#FF0000'
})

// Image
new Image({
  src: '/path/to/image.png',
  width: 100,
  height: 100
})
```

---

## 🏛️ Structure Widgets

```javascript
// App
new MaterialApp({
  title: 'My App',
  theme: new ThemeData({ primaryColor: '#6750A4' }),
  home: new HomePage()
})

// Scaffold
new Scaffold({
  appBar: new AppBar({ title: new Text('Home') }),
  body: new Center({ child: new Text('Content') }),
  floatingActionButton: new FloatingActionButton({
    child: new Text('+'),
    onPressed: handleFab
  })
})

// AppBar
new AppBar({
  title: new Text('Title'),
  backgroundColor: '#6750A4',
  elevation: 4
})
```

---

## 🎨 Theming

```javascript
// Define theme
const theme = new ThemeData({
  primaryColor: '#6750A4',
  accentColor: '#FFAB00',
  backgroundColor: '#FFFBFE',
  textTheme: new TextTheme({
    headline1: new TextStyle({ fontSize: '32px', fontWeight: 'bold' }),
    bodyText1: new TextStyle({ fontSize: '16px' })
  })
});

// Use theme
new MaterialApp({
  theme: theme,
  home: new HomePage()
});

// Access theme
const theme = Theme.of(context);
const color = theme.primaryColor;
```

---

## 🧭 Navigation

```javascript
// Push route
Navigator.push(context, '/profile', { userId: 123 });

// Pop route
Navigator.pop(context);

// Replace route
Navigator.replace(context, '/home');

// Named routes
const routes = {
  '/': HomePage,
  '/profile': ProfilePage,
  '/settings': SettingsPage
};
```

---

## 📱 Responsive Layout

```javascript
// MediaQuery
const mediaQuery = MediaQuery.of(context);
const width = mediaQuery.size.width;
const height = mediaQuery.size.height;
const isMobile = width < 600;

// Responsive widget
if (isMobile) {
  return new Column({ children: items });
} else {
  return new Row({ children: items });
}
```

---

## 🎯 State Management

### Local State
```javascript
this.setState({ count: this.count + 1 });
```

### Global Provider
```javascript
const appState = new StateProvider({ user: null });
appState.setValue({ user: userData });
const user = appState.value.user;
```

### InheritedWidget
```javascript
class ThemeProvider extends InheritedWidget {
  static of(context) {
    return context.dependOnInheritedWidgetOfExactType(ThemeProvider);
  }
}
```

---

## ⚡ Lifecycle Hooks

```javascript
class MyWidget extends StatefulWidget {
  createState() {
    return new _MyWidgetState();
  }
}

class _MyWidgetState extends State {
  initState() {
    // Called when widget mounted
    // Initialize resources
  }

  didChangeDependencies() {
    // Called when dependencies changed
  }

  didUpdateWidget(oldWidget) {
    // Called when widget updated
  }

  build(context) {
    // Return widget tree
  }

  dispose() {
    // Called when widget unmounted
    // Cleanup resources
  }
}
```

---

## 🎬 Animations

```javascript
// Animation controller
const controller = new AnimationController({
  duration: 300,
  vsync: this
});

// Tween animation
const tween = new Tween({ begin: 0, end: 1 });

// Use animation
controller.forward();
controller.reverse();
```

---

## 📝 Forms

```javascript
class FormPage extends StatefulWidget {
  createState() {
    return new _FormPageState();
  }
}

class _FormPageState extends State {
  constructor() {
    super();
    this.formData = {};
  }

  build(context) {
    return new Form({
      children: [
        new TextField({
          label: 'Name',
          onChanged: (value) => this.formData.name = value,
          validator: (value) => value ? null : 'Required'
        }),
        new ElevatedButton({
          child: new Text('Submit'),
          onPressed: () => this.submitForm()
        })
      ]
    });
  }

  submitForm() {
    if (this.validateForm()) {
      // Submit
    }
  }
}
```

---

## 🎨 Common Patterns

### Center Content
```javascript
new Center({
  child: new Text('Centered')
})
```

### Full Screen
```javascript
new Container({
  width: double.infinity,
  height: double.infinity,
  child: content
})
```

### Spacer
```javascript
new SizedBox({ width: 16 })  // Horizontal spacer
new SizedBox({ height: 16 }) // Vertical spacer
```

### List
```javascript
new Column({
  children: items.map(item =>
    new ListTile({
      title: new Text(item.name),
      onTap: () => handleTap(item)
    })
  )
})
```

---

## 🐛 Debugging

```javascript
// Log to console
console.log('[FlutterJS] Message:', value);

// Widget inspector
FlutterJS.inspectWidget(element);

// Performance profiling
FlutterJS.profile(() => {
  // Code to profile
});
```

---

## 📦 Common Props

| Widget | Props |
|--------|-------|
| **Text** | `style`, `textAlign`, `maxLines` |
| **Container** | `width`, `height`, `color`, `padding`, `margin` |
| **Button** | `onPressed`, `child`, `backgroundColor` |
| **Input** | `label`, `onChanged`, `validator` |
| **Layout** | `children`, `mainAxisAlignment`, `crossAxisAlignment` |

---

## 🛠️ CLI Commands

```bash
# Create project
./cli.js init my-app

# Development
./cli.js dev --port 5000

# Build
./cli.js build

# Serve
./cli.js serve --port 8000

# Help
./cli.js help
```

---

## 📊 Material Colors

```javascript
Colors.red       // #F44336
Colors.pink      // #E91E63
Colors.purple    // #9C27B0
Colors.blue      // #2196F3
Colors.cyan      // #00BCD4
Colors.teal      // #009688
Colors.green     // #4CAF50
Colors.amber     // #FFC107
Colors.orange    // #FF9800
Colors.grey      // #9E9E9E

// Shades: Colors.blue[50], Colors.blue[100], ... Colors.blue[900]
```

---

## 🎯 Best Practices

✅ **Do**
- Keep widgets small and focused
- Use meaningful prop names
- Initialize state in constructor
- Clean up in dispose
- Use const for immutable data
- Separate concerns (UI, logic, models)

❌ **Don't**
- Mutate state directly (use setState)
- Put business logic in build()
- Create widgets in render methods
- Forget to dispose resources
- Overuse global state
- Build large nested widget trees

---

## 🚀 Performance Tips

```javascript
// Bad: Heavy computation in build
build(context) {
  const result = expensiveCalculation();
  return new Text(result);
}

// Good: Cache in state
build(context) {
  return new Text(this.state.cachedResult);
}

// Use memoization
const MemoizedWidget = memo(MyWidget);
```

---

## 📚 Resources

- **Docs**: https://flutter-js.dev
- **GitHub**: https://github.com/flutter-js/framework
- **Discord**: https://discord.gg/flutter-js
- **Examples**: https://github.com/flutter-js/examples
- **API Docs**: https://flutter-js.dev/api

---

## 🎓 Learning Path

**Day 1**: Widgets basics + StatelessWidget  
**Day 2**: StatefulWidget + setState  
**Day 3**: Layout widgets + responsive design  
**Day 4**: Navigation + routing  
**Day 5**: State management + forms  
**Day 6**: Theming + styling  
**Day 7**: Deployment + optimization  

---

## ⚡ Cheat Sheets by Level

### Beginner
- Basic widgets (Text, Container, Button)
- Simple layouts (Column, Row)
- StatelessWidget
- Import patterns

### Intermediate
- StatefulWidget + setState
- Navigation
- Forms + validation
- Theme customization

### Advanced
- Custom widgets
- State providers
- Performance optimization
- Plugin development

---

## 🎉 You're Ready!

Save this card and refer back when you need quick answers.

**Happy coding with FlutterJS!** 🚀