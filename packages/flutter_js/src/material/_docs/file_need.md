# FlutterJS - Proper Organization & Structure Fix

You're right! Let's create a **clean, organized structure** that prevents conflicts and follows best practices.

## 🏗️ Recommended Project Structure

```
flutterjs-framework/
│
├── src/
│   ├── core/                          ← Core framework (READ-ONLY)
│   │   ├── widget.js
│   │   ├── stateless-widget.js
│   │   ├── stateful-widget.js
│   │   ├── state.js
│   │   └── build-context.js
│   │
│   ├── vdom/                          ← Virtual DOM (READ-ONLY)
│   │   ├── vnode.js
│   │   ├── renderer.js
│   │   └── index.js
│   │
│   ├── widgets/                       ← Material Widgets
│   │   ├── index.js                   ← Main export
│   │   ├── _internal/                 ← Internal helpers (NOT exported)
│   │   │   ├── widget-base.js
│   │   │   ├── theme-helper.js
│   │   │   └── style-helper.js
│   │   │
│   │   ├── material/                  ← Top-level app structure
│   │   │   ├── material-app.js
│   │   │   ├── scaffold.js
│   │   │   ├── app-bar.js
│   │   │   ├── bottom-nav-bar.js
│   │   │   ├── drawer.js
│   │   │   └── index.js
│   │   │
│   │   ├── layout/                    ← Layout widgets
│   │   │   ├── container.js
│   │   │   ├── column.js
│   │   │   ├── row.js
│   │   │   ├── center.js
│   │   │   ├── padding.js
│   │   │   ├── sized-box.js
│   │   │   ├── stack.js
│   │   │   ├── positioned.js
│   │   │   ├── expanded.js
│   │   │   ├── wrap.js
│   │   │   └── index.js
│   │   │
│   │   ├── text/                      ← Text widgets
│   │   │   ├── text.js
│   │   │   ├── rich-text.js
│   │   │   ├── text-span.js
│   │   │   └── index.js
│   │   │
│   │   ├── button/                    ← Button widgets
│   │   │   ├── elevated-button.js
│   │   │   ├── text-button.js
│   │   │   ├── outlined-button.js
│   │   │   ├── icon-button.js
│   │   │   ├── floating-action-button.js
│   │   │   ├── _button-base.js        ← Internal base
│   │   │   └── index.js
│   │   │
│   │   ├── input/                     ← Form input widgets
│   │   │   ├── text-field.js
│   │   │   ├── checkbox.js
│   │   │   ├── switch.js
│   │   │   ├── radio.js
│   │   │   ├── slider.js
│   │   │   ├── form.js
│   │   │   ├── form-field.js
│   │   │   └── index.js
│   │   │
│   │   ├── cards/                     ← Card & list widgets
│   │   │   ├── card.js
│   │   │   ├── list-tile.js
│   │   │   ├── list-view.js
│   │   │   ├── grid-view.js
│   │   │   └── index.js
│   │   │
│   │   ├── media/                     ← Media widgets
│   │   │   ├── icon.js
│   │   │   ├── image.js
│   │   │   ├── network-image.js
│   │   │   └── index.js
│   │   │
│   │   ├── dialog/                    ← Dialog widgets
│   │   │   ├── dialog.js
│   │   │   ├── alert-dialog.js
│   │   │   ├── simple-dialog.js
│   │   │   └── index.js
│   │   │
│   │   ├── progress/                  ← Progress indicators
│   │   │   ├── circular-progress-indicator.js
│   │   │   ├── linear-progress-indicator.js
│   │   │   ├── refresh-indicator.js
│   │   │   └── index.js
│   │   │
│   │   ├── dividers/                  ← Dividers
│   │   │   ├── divider.js
│   │   │   ├── vertical-divider.js
│   │   │   └── index.js
│   │   │
│   │   ├── decoration/                ← Decoration utilities
│   │   │   ├── box-decoration.js
│   │   │   ├── border-radius.js
│   │   │   ├── box-shadow.js
│   │   │   ├── gradient.js
│   │   │   ├── border.js
│   │   │   └── index.js
│   │   │
│   │   └── index.js                   ← Main export
│   │
│   ├── theme/                         ← Theme system
│   │   ├── theme-data.js
│   │   ├── text-theme.js
│   │   ├── color-scheme.js
│   │   ├── colors.js
│   │   ├── typography.js
│   │   └── index.js
│   │
│   ├── utils/                         ← Utility classes
│   │   ├── edge-insets.js
│   │   ├── alignment.js
│   │   ├── size.js
│   │   ├── offset.js
│   │   ├── text-style.js
│   │   ├── duration.js
│   │   ├── axis.js
│   │   ├── main-axis-alignment.js
│   │   ├── cross-axis-alignment.js
│   │   ├── clip.js
│   │   ├── text-align.js
│   │   ├── box-fit.js
│   │   ├── border-style.js
│   │   └── index.js
│   │
│   ├── state/                         ← State management
│   │   ├── state-provider.js
│   │   ├── change-notifier.js
│   │   ├── value-notifier.js
│   │   ├── inherited-widget.js
│   │   └── index.js
│   │
│   ├── navigation/                    ← Navigation/routing
│   │   ├── navigator.js
│   │   ├── material-page-route.js
│   │   ├── route-generator.js
│   │   └── index.js
│   │
│   ├── animation/                     ← Animation system
│   │   ├── animation-controller.js
│   │   ├── tween.js
│   │   ├── curves.js
│   │   └── index.js
│   │
│   ├── forms/                         ← Form utilities
│   │   ├── form-validator.js
│   │   ├── text-editing-controller.js
│   │   ├── focus-node.js
│   │   └── index.js
│   │
│   ├── runtime/                       ← Runtime engine
│   │   ├── flutter-js.js
│   │   ├── run-app.js
│   │   ├── scheduler.js
│   │   └── index.js
│   │
│   ├── styles/                        ← CSS files
│   │   ├── base.css                   ← Global styles
│   │   ├── material.css               ← Material Design styles
│   │   ├── tokens.css                 ← Design tokens
│   │   ├── animations.css             ← Keyframes
│   │   └── index.css                  ← Import all
│   │
│   ├── constants/                     ← Constants
│   │   ├── colors.constants.js
│   │   ├── sizes.constants.js
│   │   ├── typography.constants.js
│   │   └── index.js
│   │
│   └── index.js                       ← Main export (root)
│
├── dist/                              ← Built output
│   ├── flutter.js
│   ├── flutter.min.js
│   ├── flutter.css
│   └── flutter.min.css
│
├── examples/                          ← Example projects
│   ├── counter-app/
│   ├── todo-app/
│   ├── ecommerce-app/
│   └── full-stack-app/
│
├── tests/                             ← Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/                              ← Documentation
│   ├── GETTING-STARTED.md
│   ├── WIDGETS.md
│   ├── ORGANIZATION.md
│   ├── API.md
│   └── EXAMPLES.md
│
├── package.json
├── rollup.config.js
├── .eslintrc.js
├── .gitignore
└── README.md
```

---

## 📋 File Organization Rules

### 1. **Internal Files (Prefix with `_`)**

Files ONLY used internally within a folder:

```javascript
// src/widgets/button/_button-base.js
// ↓ DO NOT EXPORT from index.js

export class _ButtonBase extends StatelessWidget {
  // Common button logic
}
```

### 2. **Index Files (Barrel Exports)**

Each folder has `index.js` that exports public APIs:

```javascript
// src/widgets/button/index.js
export { ElevatedButton } from './elevated-button.js';
export { TextButton } from './text-button.js';
export { OutlinedButton } from './outlined-button.js';
export { IconButton } from './icon-button.js';
export { FloatingActionButton } from './floating-action-button.js';

// DON'T export internal:
// export { _ButtonBase } from './_button-base.js';  ← NO!
```

### 3. **No Circular Imports**

**Direction of dependencies (one-way):**

```
core/ → vdom/ → widgets/ → material/
                 ↓
              utils/
                 ↓
              theme/
                 ↓
              state/
```

**Good (one direction):**
```javascript
// src/widgets/button/elevated-button.js
import { StatelessWidget } from '../../core/stateless-widget.js';
import { VNode } from '../../vdom/vnode.js';
import { EdgeInsets } from '../../utils/edge-insets.js';
```

**Bad (circular):**
```javascript
// ❌ DON'T DO THIS
// src/widgets/button/elevated-button.js imports from
// src/widgets/layout/container.js which imports from
// src/widgets/button/elevated-button.js
```

---

## 🛠️ How to Prevent Collisions

### **1. Namespace your code**

```javascript
// ✅ GOOD: Clear namespace
export class ElevatedButton extends StatelessWidget {
  build(context) {
    // Internal helper - clearly internal
    const _getButtonStyle = () => { ... };
    return ...;
  }
}

// ❌ BAD: Generic name that might collide
export class Button extends StatelessWidget { ... }
```

### **2. Use constants file for shared values**

```javascript
// src/constants/sizes.constants.js
export const BUTTON_HEIGHT = 48;
export const BUTTON_PADDING = 16;
export const STANDARD_SPACING = 8;

// src/widgets/button/elevated-button.js
import { BUTTON_HEIGHT, BUTTON_PADDING } from '../../constants/sizes.constants.js';
```

### **3. Use helpers file for shared logic**

```javascript
// src/widgets/_internal/style-helper.js
export function getMaterialButtonStyle(variant, disabled) {
  if (variant === 'elevated') return { /* styles */ };
  if (variant === 'text') return { /* styles */ };
}

// src/widgets/button/elevated-button.js
import { getMaterialButtonStyle } from '../_internal/style-helper.js';
```

---

## 📦 Main Index Export Pattern

```javascript
// src/index.js (Root export)

// Core
export { Widget } from './core/widget.js';
export { StatelessWidget } from './core/stateless-widget.js';
export { StatefulWidget } from './core/stateful-widget.js';
export { State } from './core/state.js';
export { BuildContext } from './core/build-context.js';

// Widgets (organized by category)
export {
  MaterialApp,
  Scaffold,
  AppBar,
  BottomNavigationBar,
  Drawer
} from './widgets/material/index.js';

export {
  Container,
  Column,
  Row,
  Center,
  Padding,
  SizedBox,
  Stack,
  Positioned,
  Expanded,
  Wrap
} from './widgets/layout/index.js';

export {
  Text,
  RichText,
  TextSpan
} from './widgets/text/index.js';

export {
  ElevatedButton,
  TextButton,
  OutlinedButton,
  IconButton,
  FloatingActionButton
} from './widgets/button/index.js';

export {
  TextField,
  Checkbox,
  Switch,
  RadioButton,
  Slider
} from './widgets/input/index.js';

export {
  Card,
  ListTile,
  ListView,
  GridView
} from './widgets/cards/index.js';

export {
  Icon,
  Image,
  NetworkImage
} from './widgets/media/index.js';

export {
  Dialog,
  AlertDialog,
  SimpleDialog
} from './widgets/dialog/index.js';

// Theme
export {
  ThemeData,
  TextTheme,
  ColorScheme,
  Colors
} from './theme/index.js';

// Utils
export {
  EdgeInsets,
  Alignment,
  Size,
  Offset,
  TextStyle,
  Duration
} from './utils/index.js';

// State Management
export {
  StateProvider,
  ChangeNotifier,
  ValueNotifier,
  InheritedWidget
} from './state/index.js';

// Navigation
export {
  Navigator,
  MaterialPageRoute
} from './navigation/index.js';

// Animation
export {
  AnimationController,
  Tween,
  Curves
} from './animation/index.js';

// Runtime
export { runApp } from './runtime/run-app.js';

// Default export
export default {
  // All exports available via default too
  Widget,
  StatelessWidget,
  StatefulWidget,
  MaterialApp,
  Scaffold,
  AppBar,
  Container,
  Column,
  Row,
  Text,
  ElevatedButton,
  // ... etc
  runApp,
  version: '1.0.0'
};
```

---

## ✅ Checklist Before Creating a Widget

```javascript
// Before creating new widget, ask:

☐ Which folder does it belong in?
  └─ material/ (app-level)
  └─ layout/ (layout)
  └─ text/ (text rendering)
  └─ button/ (interactive buttons)
  └─ input/ (form inputs)
  └─ cards/ (content containers)
  └─ media/ (images, icons)
  └─ dialog/ (modals)

☐ Does it conflict with existing?
  └─ Search: grep -r "class NewWidget" src/

☐ What does it depend on?
  └─ Core only?
  └─ Widgets?
  └─ Utils?
  └─ Theme?

☐ Should it be exported?
  └─ YES → add to index.js
  └─ NO → prefix with _ (internal only)

☐ Does it share code with others?
  └─ YES → move shared code to _internal/
  └─ NO → keep self-contained
```

---

## 🚀 Creating a New Widget (Step-by-Step)

### **Example: Creating TextField**

```bash
# 1. Create file in correct location
touch src/widgets/input/text-field.js

# 2. Write the widget
```

```javascript
// src/widgets/input/text-field.js

import { StatefulWidget } from '../../core/stateful-widget.js';
import { State } from '../../core/state.js';
import { VNode } from '../../vdom/vnode.js';
import { Container } from '../layout/container.js';
import { Text } from '../text/text.js';
import { EdgeInsets } from '../../utils/edge-insets.js';

export class TextField extends StatefulWidget {
  constructor({
    label = '',
    value = '',
    onChanged = null,
    placeholder = '',
    type = 'text'
  } = {}) {
    super();
    this.label = label;
    this.value = value;
    this.onChanged = onChanged;
    this.placeholder = placeholder;
    this.type = type;
  }

  createState() {
    return new _TextFieldState();
  }
}

class _TextFieldState extends State {
  constructor() {
    super();
    this.inputValue = '';
  }

  initState() {
    this.inputValue = this.widget.value;
  }

  build(context) {
    return new Container({
      padding: new EdgeInsets.all(8),
      child: new VNode('input', {
        type: this.widget.type,
        placeholder: this.widget.placeholder,
        value: this.inputValue,
        onChange: (e) => {
          this.inputValue = e.target.value;
          this.setState({ inputValue: this.inputValue });
          this.widget.onChanged?.(this.inputValue);
        }
      })
    });
  }
}
```

```bash
# 3. Add to index.js
```

```javascript
// src/widgets/input/index.js

export { TextField } from './text-field.js';
export { Checkbox } from './checkbox.js';
export { Switch } from './switch.js';
export { RadioButton } from './radio.js';
export { Slider } from './slider.js';
```

```bash
# 4. Test it
npm run build
npm test -- input
```

---

## 🔍 Avoid Collisions Checklist

Before committing code:

```bash
# 1. Check for duplicate classes
grep -r "class TextField" src/

# 2. Check for missing imports
npm run build  # Will show import errors

# 3. Check for circular dependencies
grep -n "import.*from.*\.\." src/widgets/input/text-field.js

# 4. Test in browser
npm run dev

# 5. Run tests
npm test
```

---

## 📝 Summary: Organization Best Practices

| Rule | Why | Example |
|------|-----|---------|
| **One widget per file** | Easy to find, no conflicts | `elevated-button.js` not `buttons.js` |
| **Internal files start with `_`** | Prevents accidental exports | `_button-base.js` |
| **Index files for exports** | Clean public API | `export { ElevatedButton }` |
| **One-way imports** | No circular deps | `widgets → utils` (not reverse) |
| **Constants in separate file** | DRY principle | `sizes.constants.js` |
| **Shared logic in `_internal/`** | Reusability | `_button-helper.js` |
| **Tests next to code** | Easy to maintain | `text-field.js` + `text-field.test.js` |

---

## ✨ Now You Have:

✅ **Clear folder structure** - No confusion  
✅ **No circular imports** - Clean dependencies  
✅ **No name collisions** - Organized namespaces  
✅ **Easy to find things** - Logical organization  
✅ **Scalable** - Add 100+ widgets without chaos  
✅ **Professional** - Production-ready structure  

**Follow this structure and you'll never have collisions!** 🎯