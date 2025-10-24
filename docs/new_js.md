# Flutter.js Framework & IR Bridge - Complete Execution Plan

**Status**: Ready for development  
**Foundation**: Binary IR already complete (FlatBuffers)  
**Next Step**: JavaScript Framework + IR Bridge  
**Approach**: Bottom-up architecture - framework first, then bridge

---

## Part A: JavaScript Framework Foundation

### Phase 1: Core Widget System (Weeks 1-3)

#### 1.1 Widget Base Classes

**Goal**: Implement Flutter's widget hierarchy in JavaScript

```javascript
// lib/core/widget.js
class Widget {
  constructor(key = null) {
    this.key = key;
    this._context = null;
    this._element = null;
    this._mounted = false;
  }

  createElement() {
    throw new Error('createElement() must be implemented');
  }

  build(context) {
    throw new Error('build(context) must be implemented');
  }

  // Lifecycle hooks
  initState() {}
  didChangeDependencies() {}
  didUpdateWidget(oldWidget) {}
  dispose() {}

  // Internal
  _mount(context) {
    this._context = context;
    this._mounted = true;
    this.initState();
  }

  _unmount() {
    this.dispose();
    this._mounted = false;
  }
}

class StatelessWidget extends Widget {
  // Pure function of props
  // Re-renders when parent triggers rebuild or props change
  render(context) {
    const vnode = this.build(context);
    return vnode;
  }
}

class StatefulWidget extends Widget {
  constructor(props = {}) {
    super(props.key);
    this.props = props;
    this._state = null;
  }

  createElement() {
    const element = new StatefulElement(this);
    return element;
  }

  createState() {
    throw new Error('createState() must be implemented');
  }
}

class State {
  constructor() {
    this.widget = null;
    this._context = null;
    this._mounted = false;
    this._updateScheduled = false;
  }

  // THE setState - Flutter's signature API
  setState(updater) {
    if (!this._mounted) {
      console.warn('setState() called on unmounted widget');
      return;
    }

    if (typeof updater === 'function') {
      updater();
    }

    this._scheduleRebuild();
  }

  _scheduleRebuild() {
    if (!this._updateScheduled) {
      this._updateScheduled = true;
      FrameworkScheduler.scheduleRebuild(this);
    }
  }

  initState() {}
  didChangeDependencies() {}
  didUpdateWidget(oldWidget) {}
  dispose() {}

  build(context) {
    throw new Error('State.build(context) must be implemented');
  }
}

class StatefulElement extends Element {
  constructor(widget) {
    super(widget);
    this.state = widget.createState();
    this.state.widget = widget;
    this.state._context = this.context;
  }

  performRebuild() {
    const vnode = this.state.build(this.state._context);
    this._updateChild(vnode);
  }

  dispose() {
    this.state.dispose();
    super.dispose();
  }
}
```

**Deliverables**:
- [ ] Widget base class with lifecycle
- [ ] StatelessWidget implementation
- [ ] StatefulWidget + State classes
- [ ] Element tree system
- [ ] Tests: 10+ unit tests for basic hierarchy

**Effort**: 3-4 days

---

#### 1.2 Virtual Node (VNode) System

**Goal**: Abstract representation of UI (like React's Virtual DOM but for Flutter)

```javascript
// lib/vdom/vnode.js
class VNode {
  constructor({
    tag,
    props = {},
    children = [],
    key = null,
    ref = null,
    events = {}
  }) {
    this.tag = tag;           // 'div', 'button', 'span'
    this.props = props;       // HTML attributes
    this.children = children; // VNode[] or string[]
    this.key = key;
    this.ref = ref;
    this.events = events;     // { onClick: fn, ... }
    this._element = null;     // Cached DOM element
  }

  // Render to HTML string (for SSR/SSG)
  toHTML() {
    const attrs = this._serializeAttrs();
    const openTag = `<${this.tag}${attrs ? ' ' + attrs : ''}>`;

    if (this._isVoidTag()) {
      return openTag;
    }

    const childrenHTML = this.children
      .map(child => {
        if (child instanceof VNode) return child.toHTML();
        if (child === null || child === undefined) return '';
        return this._escapeHTML(String(child));
      })
      .join('');

    return `${openTag}${childrenHTML}</${this.tag}>`;
  }

  // Render to DOM (for CSR)
  toDOM() {
    const element = document.createElement(this.tag);
    this._element = element;

    // Apply props
    Object.entries(this.props).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      if (key === 'className') {
        element.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else if (key.startsWith('data-')) {
        element.setAttribute(key, value);
      } else {
        try {
          element[key] = value;
        } catch {
          element.setAttribute(key, value);
        }
      }
    });

    // Attach events
    Object.entries(this.events).forEach(([eventName, handler]) => {
      if (handler) {
        element.addEventListener(eventName, handler);
      }
    });

    // Add children
    this.children.forEach(child => {
      if (child instanceof VNode) {
        element.appendChild(child.toDOM());
      } else if (child !== null && child !== undefined) {
        element.appendChild(document.createTextNode(String(child)));
      }
    });

    return element;
  }

  // Hydrate: attach events to existing DOM
  hydrate(existingElement) {
    this._element = existingElement;

    Object.entries(this.events).forEach(([eventName, handler]) => {
      if (handler) {
        existingElement.addEventListener(eventName, handler);
      }
    });

    // Recursively hydrate children
    let childIndex = 0;
    Array.from(existingElement.childNodes).forEach(childNode => {
      const vnodeChild = this.children[childIndex];
      if (vnodeChild instanceof VNode && childNode.nodeType === 1) {
        vnodeChild.hydrate(childNode);
        childIndex++;
      } else if (childNode.nodeType === 3) {
        childIndex++;
      }
    });

    return existingElement;
  }

  _serializeAttrs() {
    return Object.entries(this.props)
      .map(([key, value]) => {
        if (value === null || value === undefined || value === false) return '';
        if (value === true) return key;
        if (key === 'className') return `class="${this._escape(value)}"`;
        if (key === 'style' && typeof value === 'object') {
          const styleStr = Object.entries(value)
            .map(([prop, val]) => `${this._camelToKebab(prop)}: ${val}`)
            .join('; ');
          return `style="${this._escape(styleStr)}"`;
        }
        return `${key}="${this._escape(String(value))}"`;
      })
      .filter(Boolean)
      .join(' ');
  }

  _isVoidTag() {
    return ['img', 'br', 'hr', 'input', 'meta', 'link'].includes(this.tag);
  }

  _escape(str) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return str.replace(/[&<>"']/g, c => map[c]);
  }

  _escapeHTML(str) {
    return this._escape(str);
  }

  _camelToKebab(str) {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
  }
}
```

**Deliverables**:
- [ ] VNode class with toHTML(), toDOM(), hydrate()
- [ ] Prop serialization
- [ ] Event binding infrastructure
- [ ] Tests: HTML generation, DOM creation, hydration

**Effort**: 3-4 days

---

#### 1.3 Reactivity & Scheduling System

**Goal**: Efficient update scheduling like Flutter's frame scheduler

```javascript
// lib/core/scheduler.js
class FrameworkScheduler {
  static {
    this._dirty = new Set();
    this._frameScheduled = false;
    this._updating = false;
  }

  static markDirty(element) {
    this._dirty.add(element);
    this._scheduleFrame();
  }

  static _scheduleFrame() {
    if (!this._frameScheduled) {
      this._frameScheduled = true;
      requestAnimationFrame(() => this._processFrame());
    }
  }

  static _processFrame() {
    this._frameScheduled = false;
    this._updating = true;

    // Rebuild dirty elements
    const elements = Array.from(this._dirty).sort((a, b) => {
      return (a._depth || 0) - (b._depth || 0); // Breadth-first
    });

    this._dirty.clear();

    elements.forEach(element => {
      try {
        element.performRebuild();
      } catch (error) {
        console.error('Rebuild failed:', error);
      }
    });

    this._updating = false;
  }

  static isUpdating() {
    return this._updating;
  }
}
```

**Deliverables**:
- [ ] Dirty element tracking
- [ ] Frame scheduling (requestAnimationFrame)
- [ ] Batched updates
- [ ] Depth-based rebuild ordering

**Effort**: 2-3 days

---

### Phase 2: Material Design System (Weeks 4-6)

#### 2.1 Design Tokens & Theme System

**Goal**: Material Design 3 color system, typography, elevation

```javascript
// lib/material/theme.js
class MaterialTheme {
  constructor(config = {}) {
    this.colorScheme = config.colorScheme || this._defaultColorScheme();
    this.typography = config.typography || this._defaultTypography();
    this.useMaterial3 = config.useMaterial3 ?? true;
  }

  static of(context) {
    return context._theme || MaterialTheme.defaultTheme;
  }

  static defaultTheme = new MaterialTheme();

  _defaultColorScheme() {
    return {
      primary: '#6750A4',
      onPrimary: '#FFFFFF',
      primaryContainer: '#EADDFF',
      onPrimaryContainer: '#21005D',
      secondary: '#625B71',
      onSecondary: '#FFFFFF',
      secondaryContainer: '#E8DEF8',
      onSecondaryContainer: '#1D192B',
      tertiary: '#7D5260',
      onTertiary: '#FFFFFF',
      tertiaryContainer: '#FFD8E4',
      onTertiaryContainer: '#31111D',
      error: '#B3261E',
      onError: '#FFFFFF',
      errorContainer: '#F9DEDC',
      onErrorContainer: '#410E0B',
      background: '#FFFBFE',
      onBackground: '#1C1B1F',
      surface: '#FFFBFE',
      onSurface: '#1C1B1F',
      outline: '#79747E',
      outlineVariant: '#CAC7D0'
    };
  }

  _defaultTypography() {
    return {
      displayLarge: { fontSize: 57, fontWeight: 400, lineHeight: 64 },
      displayMedium: { fontSize: 45, fontWeight: 400, lineHeight: 52 },
      displaySmall: { fontSize: 36, fontWeight: 400, lineHeight: 44 },
      headlineLarge: { fontSize: 32, fontWeight: 400, lineHeight: 40 },
      headlineMedium: { fontSize: 28, fontWeight: 400, lineHeight: 36 },
      headlineSmall: { fontSize: 24, fontWeight: 400, lineHeight: 32 },
      titleLarge: { fontSize: 22, fontWeight: 500, lineHeight: 28 },
      titleMedium: { fontSize: 16, fontWeight: 500, lineHeight: 24 },
      titleSmall: { fontSize: 14, fontWeight: 500, lineHeight: 20 },
      bodyLarge: { fontSize: 16, fontWeight: 400, lineHeight: 24 },
      bodyMedium: { fontSize: 14, fontWeight: 400, lineHeight: 20 },
      bodySmall: { fontSize: 12, fontWeight: 400, lineHeight: 16 },
      labelLarge: { fontSize: 14, fontWeight: 500, lineHeight: 20 },
      labelMedium: { fontSize: 12, fontWeight: 500, lineHeight: 16 },
      labelSmall: { fontSize: 11, fontWeight: 500, lineHeight: 16 }
    };
  }

  copyWith(overrides) {
    return new MaterialTheme({
      colorScheme: { ...this.colorScheme, ...overrides.colorScheme },
      typography: { ...this.typography, ...overrides.typography },
      useMaterial3: overrides.useMaterial3 ?? this.useMaterial3
    });
  }
}

// lib/material/colors.js
class Colors {
  static primary = '#6750A4';
  static secondary = '#625B71';
  static tertiary = '#7D5260';
  static error = '#B3261E';
  static background = '#FFFBFE';
  static surface = '#FFFBFE';
  static white = '#FFFFFF';
  static black = '#000000';
  static transparent = 'rgba(0, 0, 0, 0)';

  // Utility
  static withOpacity(color, opacity) {
    return color.replace(/[^,]+(?=\))/, opacity);
  }
}
```

**Deliverables**:
- [ ] MaterialTheme class with MD3 color system
- [ ] Typography system (13 text styles)
- [ ] Colors utility class
- [ ] Theme context propagation
- [ ] CSS variables generation

**Effort**: 4-5 days

---

#### 2.2 Tier 1 Material Widgets (15 core widgets)

**Goal**: Implement core widgets that cover 80% of use cases

**Widgets to implement**:
1. Container
2. Text
3. Column / Row
4. Stack / Positioned
5. Scaffold / AppBar
6. Center
7. Padding / SizedBox
8. ElevatedButton / TextButton / IconButton
9. Icon / Image

```javascript
// lib/material/widgets/container.js
function Container({
  key,
  child,
  color,
  padding,
  margin,
  width,
  height,
  decoration,
  onTap,
  alignment = 'topLeft'
}) {
  return new _Container({
    key,
    child,
    color,
    padding,
    margin,
    width,
    height,
    decoration,
    onTap,
    alignment
  });
}

class _Container extends StatelessWidget {
  constructor(props) {
    super(props.key);
    this.props = props;
  }

  build(context) {
    const theme = MaterialTheme.of(context);
    const style = {
      boxSizing: 'border-box',
      position: 'relative'
    };

    if (this.props.width) style.width = this._toPx(this.props.width);
    if (this.props.height) style.height = this._toPx(this.props.height);
    if (this.props.color) style.backgroundColor = this.props.color;
    if (this.props.margin) style.margin = this._paddingToCss(this.props.margin);
    if (this.props.padding) style.padding = this._paddingToCss(this.props.padding);

    if (this.props.decoration) {
      Object.assign(style, this._decorationToCss(this.props.decoration, theme));
    }

    const events = this.props.onTap ? { click: this.props.onTap } : {};

    return new VNode({
      tag: 'div',
      key: this.props.key,
      props: { style, className: 'flutter-container' },
      children: this.props.child ? [this.props.child] : [],
      events
    });
  }

  _toPx(value) {
    return typeof value === 'number' ? `${value}px` : value;
  }

  _paddingToCss(padding) {
    if (typeof padding === 'number') {
      return `${padding}px`;
    }
    if (padding.all !== undefined) {
      return `${padding.all}px`;
    }
    if (padding.symmetric) {
      const h = padding.symmetric.horizontal || 0;
      const v = padding.symmetric.vertical || 0;
      return `${v}px ${h}px`;
    }
    if (padding.only) {
      const t = padding.only.top || 0;
      const r = padding.only.right || 0;
      const b = padding.only.bottom || 0;
      const l = padding.only.left || 0;
      return `${t}px ${r}px ${b}px ${l}px`;
    }
    return '0';
  }

  _decorationToCss(decoration, theme) {
    const css = {};
    if (decoration.color) css.backgroundColor = decoration.color;
    if (decoration.borderRadius) {
      css.borderRadius = this._toPx(decoration.borderRadius);
    }
    if (decoration.boxShadow) {
      css.boxShadow = decoration.boxShadow
        .map(shadow => `${shadow.offsetX || 0}px ${shadow.offsetY || 0}px ${shadow.blurRadius || 0}px ${shadow.color || '#000'}`)
        .join(', ');
    }
    return css;
  }
}

// lib/material/widgets/text.js
function Text(data, {
  key,
  style,
  textAlign = 'left',
  maxLines,
  overflow = 'clip',
  semanticsLabel
} = {}) {
  return new _Text(data, { key, style, textAlign, maxLines, overflow, semanticsLabel });
}

class _Text extends StatelessWidget {
  constructor(data, props) {
    super(props.key);
    this.data = data;
    this.props = props;
  }

  build(context) {
    const theme = MaterialTheme.of(context);
    const textStyle = {
      fontFamily: 'Roboto, sans-serif',
      fontSize: '14px',
      lineHeight: '20px',
      ...this._textStyleToCss(this.props.style, theme)
    };

    if (this.props.textAlign) textStyle.textAlign = this.props.textAlign;
    if (this.props.maxLines) {
      textStyle.overflow = 'hidden';
      textStyle.display = '-webkit-box';
      textStyle.webkitLineClamp = this.props.maxLines;
      textStyle.webkitBoxOrient = 'vertical';
    }

    return new VNode({
      tag: 'span',
      key: this.props.key,
      props: {
        style: textStyle,
        className: 'flutter-text',
        'aria-label': this.props.semanticsLabel
      },
      children: [String(this.data)]
    });
  }

  _textStyleToCss(style, theme) {
    if (!style) return {};
    const css = {};
    if (style.fontSize) css.fontSize = this._toPx(style.fontSize);
    if (style.fontWeight) css.fontWeight = style.fontWeight;
    if (style.color) css.color = style.color;
    if (style.fontStyle) css.fontStyle = style.fontStyle;
    if (style.letterSpacing) css.letterSpacing = this._toPx(style.letterSpacing);
    if (style.height) css.lineHeight = style.height;
    return css;
  }

  _toPx(value) {
    return typeof value === 'number' ? `${value}px` : value;
  }
}

// lib/material/widgets/column.js
function Column({
  key,
  children = [],
  mainAxisAlignment = 'start',
  crossAxisAlignment = 'start',
  mainAxisSize = 'max',
  textDirection = 'ltr'
} = {}) {
  return new _Column({
    key,
    children,
    mainAxisAlignment,
    crossAxisAlignment,
    mainAxisSize,
    textDirection
  });
}

class _Column extends StatelessWidget {
  constructor(props) {
    super(props.key);
    this.props = props;
  }

  build(context) {
    const justifyMap = {
      'start': 'flex-start',
      'end': 'flex-end',
      'center': 'center',
      'spaceBetween': 'space-between',
      'spaceAround': 'space-around',
      'spaceEvenly': 'space-evenly'
    };

    const alignMap = {
      'start': 'flex-start',
      'end': 'flex-end',
      'center': 'center',
      'stretch': 'stretch',
      'baseline': 'baseline'
    };

    const style = {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: justifyMap[this.props.mainAxisAlignment] || 'flex-start',
      alignItems: alignMap[this.props.crossAxisAlignment] || 'flex-start',
      width: this.props.mainAxisSize === 'max' ? '100%' : 'auto'
    };

    return new VNode({
      tag: 'div',
      key: this.props.key,
      props: { style, className: 'flutter-column' },
      children: this.props.children
    });
  }
}

// Similar implementations for:
// - Row, Stack, Positioned
// - Scaffold, AppBar
// - Center, Padding, SizedBox
// - ElevatedButton, TextButton, IconButton
// - Icon, Image
```

**Deliverables**:
- [ ] 15 Tier 1 widgets fully implemented
- [ ] Consistent prop API (matching Dart Flutter)
- [ ] CSS generation for each widget
- [ ] Tests: 30+ widget tests
- [ ] Example layouts using these widgets

**Effort**: 8-10 days (roughly 1 day per widget + integration)

---

### Phase 3: State Management (Weeks 7-8)

#### 3.1 InheritedWidget & Context System

```javascript
// lib/framework/inherited_widget.js
class InheritedWidget extends StatelessWidget {
  constructor({ key, child, value } = {}) {
    super(key);
    this.child = child;
    this.value = value;
  }

  build(context) {
    context._inheritedWidgets = context._inheritedWidgets || new Map();
    context._inheritedWidgets.set(this.constructor.name, this);
    return this.child;
  }

  static of(context, WidgetType) {
    const name = WidgetType.name;
    const widget = context._inheritedWidgets?.get(name);
    if (!widget) {
      throw new Error(`No ${name} found in context`);
    }
    return widget.value;
  }
}

// Usage:
class ThemeProvider extends InheritedWidget {
  constructor({ theme, child }) {
    super({ child, value: theme });
  }
}

// In a widget:
class MyButton extends StatelessWidget {
  build(context) {
    const theme = ThemeProvider.of(context, ThemeProvider);
    // Use theme...
  }
}
```

#### 3.2 BuildContext

```javascript
// lib/framework/build_context.js
class BuildContext {
  constructor(element) {
    this._element = element;
    this._inheritedWidgets = new Map();
    this._theme = null;
    this._mediaQuery = null;
  }

  // Theme.of(context)
  get theme() {
    return this._theme || MaterialTheme.defaultTheme;
  }

  // MediaQuery.of(context)
  get mediaQuery() {
    return {
      size: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      devicePixelRatio: window.devicePixelRatio,
      padding: {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }
    };
  }

  findAncestorStateOfType(StateType) {
    let ancestor = this._element.parent;
    while (ancestor) {
      if (ancestor instanceof StatefulElement && ancestor.state instanceof StateType) {
        return ancestor.state;
      }
      ancestor = ancestor.parent;
    }
    return null;
  }
}
```

**Deliverables**:
- [ ] InheritedWidget implementation
- [ ] BuildContext with theme, mediaquery access
- [ ] Context propagation down widget tree
- [ ] Tests: context inheritance, provider pattern

**Effort**: 3-4 days

---

### Phase 4: Navigation System (Weeks 9-10)

#### 4.1 Route Management

```javascript
// lib/framework/navigation/route.js
class Route {
  constructor({ name, builder, settings = {} }) {
    this.name = name;
    this.builder = builder;
    this.settings = settings;
    this._widget = null;
  }

  didPop(result) {}
  didPush() {}
  willPop() { return Promise.resolve(true); }
}

// lib/framework/navigation/navigator.js
class Navigator {
  static _stack = [];
  static _history = [];

  static push(context, route) {
    this._stack.push(route);
    this._history.push(route);
    FrameworkScheduler.markDirty(context._element);
  }

  static pop(context, result) {
    if (this._stack.length === 1) return;
    const route = this._stack.pop();
    route.didPop(result);
    FrameworkScheduler.markDirty(context._element);
  }

  static pushNamed(context, routeName, { arguments: args } = {}) {
    // Route lookup from app config
    const route = new Route({
      name: routeName,
      settings: { arguments: args }
    });
    this.push(context, route);
  }

  static popUntil(context, predicate) {
    while (this._stack.length > 0 && !predicate(this._stack[this._stack.length - 1])) {
      this._stack.pop();
    }
    FrameworkScheduler.markDirty(context._element);
  }

  static currentRoute() {
    return this._stack[this._stack.length - 1];
  }
}
```

**Deliverables**:
- [ ] Route class
- [ ] Navigator with push/pop/pushNamed
- [ ] Route stack management
- [ ] Browser history integration
- [ ] Tests: navigation flow

**Effort**: 4-5 days

---

### Phase 5: Event & Gesture System (Weeks 11-12)

#### 5.1 Gesture Detector

```javascript
// lib/material/widgets/gesture_detector.js
function GestureDetector({
  key,
  child,
  onTap,
  onDoubleTap,
  onLongPress,
  onPanUpdate
} = {}) {
  return new _GestureDetector({
    key,
    child,
    onTap,
    onDoubleTap,
    onLongPress,
    onPanUpdate
  });
}

class _GestureDetector extends StatelessWidget {
  constructor(props) {
    super(props.key);
    this.props = props;
    this._lastTapTime = 0;
    this._tapCount = 0;
    this._longPressTimer = null;
  }

  build(context) {
    const events = {};

    if (this.props.onTap || this.props.onDoubleTap) {
      events.click = (e) => {
        const now = Date.now();
        if (now - this._lastTapTime < 300) {
          this._tapCount++;
          if (this._tapCount === 2 && this.props.onDoubleTap) {
            this.props.onDoubleTap(new TapDownDetails(e));
            this._tapCount = 0;
          }
        } else {
          this._tapCount = 1;
          if (this.props.onTap) {
            this.props.onTap(new TapDownDetails(e));
          }
        }
        this._lastTapTime = now;
      };
    }

    if (this.props.onLongPress) {
      events.mousedown = (e) => {
        this._longPressTimer = setTimeout(() => {
          this.props.onLongPress(new LongPressStartDetails(e));
        }, 500);
      };
      events.mouseup = () => clearTimeout(this._longPressTimer);
      events.mouseleave = () => clearTimeout(this._longPressTimer);
    }

    return new VNode({
      tag: 'div',
      key: this.props.key,
      props: {
        style: { cursor: 'pointer' },
        className: 'flutter-gesture-detector'
      },
      children: [this.props.child],
      events
    });
  }
}

class TapDownDetails {
  constructor(event) {
    this.globalPosition = { x: event.clientX, y: event.clientY };
    this.localPosition = { x: event.offsetX, y: event.offsetY };
  }
}
```

**Deliverables**:
- [ ] GestureDetector with tap, double-tap, long-press
- [ ] Event details objects
- [ ] Pointer tracking
- [ ] Tests: gesture detection

**Effort**: 3-4 days

---

### Phase 6: Form & Input Widgets (Weeks 13-14)

#### 6.1 Form System

```javascript
// lib/material/widgets/text_field.js
function TextField({
  key,
  onChanged,
  onSubmitted,
  controller,
  decoration = {},
  keyboardType = 'text',
  maxLines = 1,
  obscureText = false
} = {}) {
  return new _TextField({
    key,
    onChanged,
    onSubmitted,
    controller,
    decoration,
    keyboardType,
    maxLines,
    obscureText
  });
}

class _TextField extends StatefulWidget {
  createState() {
    return new _TextFieldState();
  }
}

class _TextFieldState extends State {
  constructor() {
    super();
    this.value = '';
    this._controller = null;
  }

  initState() {
    if (this.widget.props.controller) {
      this._controller = this.widget.props.controller;
      this._controller.addListener(() => {
        this.setState(() => {
          this.value = this._controller.text;
        });
      });
    }
  }

  build(context) {
    const theme = MaterialTheme.of(context);
    const style = {
      padding: '12px 16px',
      fontSize: '16px',
      border: `1px solid ${theme.colorScheme.outline}`,
      borderRadius: '4px',
      fontFamily: 'Roboto, sans-serif',
      fontWeight: '400',
      lineHeight: '24px',
      width: '100%',
      boxSizing: 'border-box'
    };

    const events = {
      input: (e) => {
        this.value = e.target.value;
        if (this.widget.props.onChanged) {
          this.widget.props.onChanged(e.target.value);
        }
      },
      change: (e) => {
        if (this.widget.props.onSubmitted) {
          this.widget.props.onSubmitted(e.target.value);
        }
      }
    };

    const inputType = this.widget.props.obscureText ? 'password' : 'text';

    return new VNode({
      tag: 'input',
      key: this.widget.props.key,
      props: {
        type: inputType,
        style,
        className: 'flutter-text-field',
        value: this.value,
        placeholder: this.widget.props.decoration.hintText || ''
      },
      events
    });
  }
}

// lib/material/widgets/form.js
class FormState extends State {
  _formKey = Symbol('FormKey');

  validate() {
    // Collect all FormField states and validate
    return true;
  }

  save() {
    // Save all form fields
  }

  reset() {
    // Reset all form fields
  }
}

function Form({ key, child, onChanged, onWillPop } = {}) {
  return new _Form({ key, child, onChanged, onWillPop });
}

class _Form extends StatefulWidget {
  createState() {
    return new FormState();
  }
}

// lib/material/widgets/checkbox.js
function Checkbox({
  key,
  value = false,
  onChanged,
  activeColor,
  checkColor
} = {}) {
  return new _Checkbox({
    key,
    value,
    onChanged,
    activeColor,
    checkColor
  });
}

class _Checkbox extends StatefulWidget {
  createState() {
    return new _CheckboxState();
  }
}

class _CheckboxState extends State {
  constructor() {
    super();
    this.checked = false;
  }

  initState() {
    this.checked = this.widget.props.value;
  }

  build(context) {
    const theme = MaterialTheme.of(context);
    const style = {
      width: '24px',
      height: '24px',
      cursor: 'pointer',
      accentColor: this.widget.props.activeColor || theme.colorScheme.primary
    };

    const events = {
      change: (e) => {
        this.setState(() => {
          this.checked = e.target.checked;
        });
        if (this.widget.props.onChanged) {
          this.widget.props.onChanged(e.target.checked);
        }
      }
    };

    return new VNode({
      tag: 'input',
      key: this.widget.props.key,
      props: {
        type: 'checkbox',
        style,
        className: 'flutter-checkbox',
        checked: this.checked
      },
      events
    });
  }
}

// lib/material/widgets/switch.js
function Switch({
  key,
  value = false,
  onChanged,
  activeColor,
  inactiveColor
} = {}) {
  return new _Switch({
    key,
    value,
    onChanged,
    activeColor,
    inactiveColor
  });
}

class _Switch extends StatefulWidget {
  createState() {
    return new _SwitchState();
  }
}

class _SwitchState extends State {
  constructor() {
    super();
    this.value = false;
  }

  initState() {
    this.value = this.widget.props.value;
  }

  build(context) {
    const theme = MaterialTheme.of(context);
    const style = {
      width: '52px',
      height: '32px',
      borderRadius: '16px',
      backgroundColor: this.value ? 
        (this.widget.props.activeColor || theme.colorScheme.primary) : 
        '#BDBDBD',
      cursor: 'pointer',
      padding: '4px',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      transition: 'background-color 0.2s'
    };

    const thumbStyle = {
      width: '24px',
      height: '24px',
      borderRadius: '12px',
      backgroundColor: '#FFFFFF',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      marginLeft: this.value ? 'auto' : '0',
      transition: 'margin-left 0.2s'
    };

    const events = {
      click: () => {
        this.setState(() => {
          this.value = !this.value;
        });
        if (this.widget.props.onChanged) {
          this.widget.props.onChanged(!this.value);
        }
      }
    };

    return new VNode({
      tag: 'div',
      key: this.widget.props.key,
      props: { style, className: 'flutter-switch' },
      children: [
        new VNode({
          tag: 'div',
          props: { style: thumbStyle }
        })
      ],
      events
    });
  }
}
```

**Deliverables**:
- [ ] TextField with input handling
- [ ] TextEditingController
- [ ] Form with validation
- [ ] Checkbox widget
- [ ] Switch widget
- [ ] Tests: form submission, validation

**Effort**: 5-6 days

---

### Phase 7: Tier 2 Material Widgets (Weeks 15-16)

#### 7.1 Secondary Widgets

Implement 10 additional widgets:
1. Card
2. ListTile
3. FloatingActionButton
4. BottomNavigationBar
5. TabBar / TabBarView
6. AlertDialog
7. SnackBar
8. Tooltip
9. CircularProgressIndicator
10. LinearProgressIndicator

```javascript
// lib/material/widgets/card.js
function Card({
  key,
  child,
  elevation = 1,
  color,
  shape,
  margin = EdgeInsets.zero,
  clipBehavior = 'antiAlias'
} = {}) {
  return new _Card({
    key,
    child,
    elevation,
    color,
    shape,
    margin,
    clipBehavior
  });
}

class _Card extends StatelessWidget {
  constructor(props) {
    super(props.key);
    this.props = props;
  }

  build(context) {
    const theme = MaterialTheme.of(context);
    const elevationMap = {
      0: 'none',
      1: '0 1px 2px rgba(0,0,0,0.3)',
      2: '0 2px 4px rgba(0,0,0,0.3)',
      3: '0 3px 6px rgba(0,0,0,0.3)',
      4: '0 4px 8px rgba(0,0,0,0.3)'
    };

    const style = {
      backgroundColor: this.props.color || theme.colorScheme.surface,
      borderRadius: '12px',
      padding: '16px',
      boxShadow: elevationMap[this.props.elevation] || 'none',
      overflow: this.props.clipBehavior === 'antiAlias' ? 'hidden' : 'visible'
    };

    return new VNode({
      tag: 'div',
      key: this.props.key,
      props: { style, className: 'flutter-card' },
      children: [this.props.child]
    });
  }
}

// lib/material/widgets/list_tile.js
function ListTile({
  key,
  leading,
  title,
  subtitle,
  trailing,
  onTap,
  selected = false,
  enabled = true
} = {}) {
  return new _ListTile({
    key,
    leading,
    title,
    subtitle,
    trailing,
    onTap,
    selected,
    enabled
  });
}

class _ListTile extends StatelessWidget {
  constructor(props) {
    super(props.key);
    this.props = props;
  }

  build(context) {
    const theme = MaterialTheme.of(context);
    const style = {
      display: 'flex',
      alignItems: 'center',
      padding: '16px',
      gap: '16px',
      backgroundColor: this.props.selected ? theme.colorScheme.primaryContainer : 'transparent',
      cursor: this.props.enabled ? 'pointer' : 'default',
      opacity: this.props.enabled ? 1 : 0.5,
      transition: 'background-color 0.2s'
    };

    const contentStyle = {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    };

    const events = this.props.enabled && this.props.onTap ? 
      { click: this.props.onTap } : 
      {};

    return new VNode({
      tag: 'div',
      key: this.props.key,
      props: { style, className: 'flutter-list-tile' },
      children: [
        this.props.leading ? new VNode({
          tag: 'div',
          props: { style: { flexShrink: 0 } },
          children: [this.props.leading]
        }) : null,
        new VNode({
          tag: 'div',
          props: { style: contentStyle },
          children: [
            this.props.title,
            this.props.subtitle
          ].filter(Boolean)
        }),
        this.props.trailing ? new VNode({
          tag: 'div',
          props: { style: { flexShrink: 0 } },
          children: [this.props.trailing]
        }) : null
      ].filter(Boolean),
      events
    });
  }
}

// lib/material/widgets/floating_action_button.js
function FloatingActionButton({
  key,
  onPressed,
  child,
  backgroundColor,
  foregroundColor,
  elevation = 6,
  mini = false
} = {}) {
  return new _FloatingActionButton({
    key,
    onPressed,
    child,
    backgroundColor,
    foregroundColor,
    elevation,
    mini
  });
}

class _FloatingActionButton extends StatelessWidget {
  constructor(props) {
    super(props.key);
    this.props = props;
  }

  build(context) {
    const theme = MaterialTheme.of(context);
    const size = this.props.mini ? 40 : 56;

    const style = {
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      backgroundColor: this.props.backgroundColor || theme.colorScheme.primary,
      color: this.props.foregroundColor || theme.colorScheme.onPrimary,
      border: 'none',
      boxShadow: `0 4px 8px rgba(0,0,0,0.3)`,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      transition: 'all 0.2s'
    };

    const events = this.props.onPressed ? 
      { 
        click: this.props.onPressed,
        mouseenter: (e) => {
          e.target.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
        },
        mouseleave: (e) => {
          e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        }
      } : 
      {};

    return new VNode({
      tag: 'button',
      key: this.props.key,
      props: { style, className: 'flutter-fab' },
      children: [this.props.child],
      events
    });
  }
}

// lib/material/widgets/bottom_navigation_bar.js
function BottomNavigationBar({
  key,
  items = [],
  currentIndex = 0,
  onTap,
  type = 'fixed'
} = {}) {
  return new _BottomNavigationBar({
    key,
    items,
    currentIndex,
    onTap,
    type
  });
}

class _BottomNavigationBar extends StatefulWidget {
  createState() {
    return new _BottomNavigationBarState();
  }
}

class _BottomNavigationBarState extends State {
  constructor() {
    super();
    this.selectedIndex = 0;
  }

  initState() {
    this.selectedIndex = this.widget.props.currentIndex;
  }

  build(context) {
    const theme = MaterialTheme.of(context);
    const style = {
      display: 'flex',
      justifyContent: 'space-around',
      padding: '8px 0',
      backgroundColor: theme.colorScheme.surface,
      borderTop: `1px solid ${theme.colorScheme.outline}`,
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000
    };

    const items = this.widget.props.items.map((item, index) => {
      const isSelected = index === this.selectedIndex;
      const itemStyle = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '8px 12px',
        cursor: 'pointer',
        color: isSelected ? theme.colorScheme.primary : theme.colorScheme.onSurface,
        transition: 'color 0.2s'
      };

      return new VNode({
        tag: 'div',
        key: `nav-item-${index}`,
        props: { style: itemStyle, className: 'flutter-nav-item' },
        children: [
          new VNode({
            tag: 'div',
            props: { className: 'flutter-nav-icon' },
            children: [item.icon]
          }),
          new VNode({
            tag: 'span',
            props: { className: 'flutter-nav-label' },
            children: [item.label]
          })
        ],
        events: {
          click: () => {
            this.setState(() => {
              this.selectedIndex = index;
            });
            if (this.widget.props.onTap) {
              this.widget.props.onTap(index);
            }
          }
        }
      });
    });

    return new VNode({
      tag: 'div',
      key: this.widget.props.key,
      props: { style, className: 'flutter-bottom-nav-bar' },
      children: items
    });
  }
}

// Simplified implementations for:
// - TabBar / TabBarView
// - AlertDialog
// - SnackBar
// - Tooltip
// - Progress indicators
```

**Deliverables**:
- [ ] 10 Tier 2 widgets
- [ ] Dialog system (AlertDialog, SnackBar)
- [ ] Progress indicators (circular, linear)
- [ ] Tests: 20+ Tier 2 widget tests

**Effort**: 6-8 days

---

### Phase 8: Tier 3 Widgets & Layout (Weeks 17-18)

#### 8.1 Advanced Layout Widgets

```javascript
// lib/material/widgets/wrap.js
function Wrap({
  key,
  children = [],
  direction = 'horizontal',
  alignment = 'start',
  spacing = 0,
  runAlignment = 'start',
  runSpacing = 0,
  crossAxisAlignment = 'start'
} = {}) {
  return new _Wrap({
    key,
    children,
    direction,
    alignment,
    spacing,
    runAlignment,
    runSpacing,
    crossAxisAlignment
  });
}

class _Wrap extends StatelessWidget {
  constructor(props) {
    super(props.key);
    this.props = props;
  }

  build(context) {
    const isHorizontal = this.props.direction === 'horizontal';
    const style = {
      display: 'flex',
      flexWrap: 'wrap',
      flexDirection: isHorizontal ? 'row' : 'column',
      justifyContent: this._alignmentToCss(this.props.alignment),
      gap: `${this.props.spacing}px`,
      rowGap: `${this.props.runSpacing}px`,
      alignItems: this._alignmentToCss(this.props.crossAxisAlignment),
      width: '100%'
    };

    return new VNode({
      tag: 'div',
      key: this.props.key,
      props: { style, className: 'flutter-wrap' },
      children: this.props.children
    });
  }

  _alignmentToCss(alignment) {
    const map = {
      'start': 'flex-start',
      'end': 'flex-end',
      'center': 'center',
      'spaceBetween': 'space-between',
      'spaceAround': 'space-around'
    };
    return map[alignment] || 'flex-start';
  }
}

// lib/material/widgets/flexible.js
function Flexible({
  key,
  flex = 1,
  fit = 'loose',
  child
} = {}) {
  return new _Flexible({ key, flex, fit, child });
}

class _Flexible extends StatelessWidget {
  constructor(props) {
    super(props.key);
    this.props = props;
  }

  build(context) {
    const style = {
      flex: this.props.flex,
      flexShrink: 1,
      overflow: this.props.fit === 'tight' ? 'hidden' : 'visible'
    };

    return new VNode({
      tag: 'div',
      key: this.props.key,
      props: { style, className: 'flutter-flexible' },
      children: [this.props.child]
    });
  }
}

// lib/material/widgets/expanded.js
function Expanded({
  key,
  flex = 1,
  child
} = {}) {
  return Flexible({ key, flex, fit: 'tight', child });
}

// lib/material/widgets/align.js
function Align({
  key,
  alignment = 'center',
  widthFactor,
  heightFactor,
  child
} = {}) {
  return new _Align({
    key,
    alignment,
    widthFactor,
    heightFactor,
    child
  });
}

class _Align extends StatelessWidget {
  constructor(props) {
    super(props.key);
    this.props = props;
  }

  build(context) {
    const alignmentMap = {
      'topLeft': 'flex-start flex-start',
      'topCenter': 'center flex-start',
      'topRight': 'flex-end flex-start',
      'centerLeft': 'flex-start center',
      'center': 'center center',
      'centerRight': 'flex-end center',
      'bottomLeft': 'flex-start flex-end',
      'bottomCenter': 'center flex-end',
      'bottomRight': 'flex-end flex-end'
    };

    const [justifyContent, alignItems] = (alignmentMap[this.props.alignment] || 'center center').split(' ');

    const style = {
      display: 'flex',
      justifyContent,
      alignItems,
      width: this.props.widthFactor ? `${this.props.widthFactor * 100}%` : '100%',
      height: this.props.heightFactor ? `${this.props.heightFactor * 100}%` : '100%'
    };

    return new VNode({
      tag: 'div',
      key: this.props.key,
      props: { style, className: 'flutter-align' },
      children: [this.props.child]
    });
  }
}

// lib/material/widgets/aspect_ratio.js
function AspectRatio({
  key,
  aspectRatio = 1.0,
  child
} = {}) {
  return new _AspectRatio({ key, aspectRatio, child });
}

class _AspectRatio extends StatelessWidget {
  constructor(props) {
    super(props.key);
    this.props = props;
  }

  build(context) {
    const style = {
      position: 'relative',
      paddingBottom: `${(1 / this.props.aspectRatio) * 100}%`,
      height: 0,
      overflow: 'hidden'
    };

    const childStyle = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    };

    return new VNode({
      tag: 'div',
      key: this.props.key,
      props: { style, className: 'flutter-aspect-ratio' },
      children: [
        new VNode({
          tag: 'div',
          props: { style: childStyle },
          children: [this.props.child]
        })
      ]
    });
  }
}
```

**Deliverables**:
- [ ] Wrap widget with flexible wrapping
- [ ] Flexible & Expanded widgets
- [ ] Align widget (9 alignments)
- [ ] AspectRatio widget
- [ ] Tests: layout calculations

**Effort**: 4-5 days

---

## Part B: IR to Framework Bridge

### Phase 9: IR Parser (Weeks 19-20)

#### 9.1 FlatBuffers Reader

```javascript
// lib/bridge/ir_reader.js
import * as flatbuffers from 'flatbuffers';
import { AppIR } from './generated/app_ir.js'; // Generated by flatc

class IRReader {
  constructor(buffer) {
    this.buf = new flatbuffers.ByteBuffer(buffer);
  }

  readApp() {
    const root = AppIR.getRootAsAppIR(this.buf, 0);
    
    return {
      version: root.version(),
      projectName: root.projectName(),
      routes: this._readRoutes(root),
      theme: this._readTheme(root),
      widgets: this._readWidgets(root),
      models: this._readModels(root),
      metadata: this._readMetadata(root)
    };
  }

  _readRoutes(root) {
    const routes = [];
    for (let i = 0; i < root.routesLength(); i++) {
      const route = root.routes(i);
      routes.push({
        name: route.name(),
        path: route.path(),
        widgetId: route.widgetId(),
        isPage: route.isPage(),
        parameters: this._readParameters(route)
      });
    }
    return routes;
  }

  _readTheme(root) {
    const theme = root.theme();
    if (!theme) return null;

    return {
      useMaterial3: theme.useMaterial3(),
      primaryColor: theme.primaryColor(),
      colorScheme: this._readColorScheme(theme),
      typography: this._readTypography(theme)
    };
  }

  _readColorScheme(theme) {
    const colors = {};
    for (let i = 0; i < theme.colorsLength(); i++) {
      const colorEntry = theme.colors(i);
      colors[colorEntry.name()] = colorEntry.value();
    }
    return colors;
  }

  _readTypography(theme) {
    const styles = {};
    for (let i = 0; i < theme.typographyLength(); i++) {
      const typo = theme.typography(i);
      styles[typo.name()] = {
        fontSize: typo.fontSize(),
        fontWeight: typo.fontWeight(),
        lineHeight: typo.lineHeight(),
        letterSpacing: typo.letterSpacing()
      };
    }
    return styles;
  }

  _readWidgets(root) {
    const widgets = {};
    for (let i = 0; i < root.widgetsLength(); i++) {
      const widget = root.widgets(i);
      widgets[widget.id()] = this._readWidget(widget);
    }
    return widgets;
  }

  _readWidget(widget) {
    return {
      id: widget.id(),
      type: widget.type(),
      isStateful: widget.isStateful(),
      isMaterial: widget.isMaterial(),
      props: this._readProperties(widget),
      children: this._readChildren(widget),
      reactivityInfo: this._readReactivity(widget)
    };
  }

  _readProperties(widget) {
    const props = {};
    for (let i = 0; i < widget.propertiesLength(); i++) {
      const prop = widget.properties(i);
      props[prop.name()] = {
        value: prop.value(),
        type: prop.type(),
        isDynamic: prop.isDynamic()
      };
    }
    return props;
  }

  _readChildren(widget) {
    const children = [];
    for (let i = 0; i < widget.childrenLength(); i++) {
      children.push(this._readWidget(widget.children(i)));
    }
    return children;
  }

  _readReactivity(widget) {
    const info = widget.reactivityInfo();
    if (!info) return null;

    return {
      triggers: this._readTriggers(info),
      affectedProps: this._readAffectedProps(info),
      propagatesToChildren: info.propagatesToChildren(),
      strategy: info.renderStrategy()
    };
  }

  _readParameters(route) {
    const params = [];
    for (let i = 0; i < route.parametersLength(); i++) {
      params.push(route.parameters(i));
    }
    return params;
  }

  _readTriggers(info) {
    const triggers = [];
    for (let i = 0; i < info.triggersLength(); i++) {
      triggers.push({
        type: info.triggers(i).type(),
        source: info.triggers(i).source()
      });
    }
    return triggers;
  }

  _readAffectedProps(info) {
    const props = [];
    for (let i = 0; i < info.affectedPropsLength(); i++) {
      props.push(info.affectedProps(i));
    }
    return props;
  }

  _readModels(root) {
    const models = {};
    for (let i = 0; i < root.modelsLength(); i++) {
      const model = root.models(i);
      models[model.name()] = {
        name: model.name(),
        properties: this._readModelProperties(model),
        methods: this._readMethods(model)
      };
    }
    return models;
  }

  _readModelProperties(model) {
    const props = [];
    for (let i = 0; i < model.propertiesLength(); i++) {
      const prop = model.properties(i);
      props.push({
        name: prop.name(),
        type: prop.type(),
        defaultValue: prop.defaultValue()
      });
    }
    return props;
  }

  _readMethods(model) {
    const methods = [];
    for (let i = 0; i < model.methodsLength(); i++) {
      const method = model.methods(i);
      methods.push({
        name: method.name(),
        parameters: this._readMethodParameters(method),
        returnType: method.returnType(),
        body: method.body()
      });
    }
    return methods;
  }

  _readMethodParameters(method) {
    const params = [];
    for (let i = 0; i < method.parametersLength(); i++) {
      const param = method.parameters(i);
      params.push({
        name: param.name(),
        type: param.type(),
        isRequired: param.isRequired()
      });
    }
    return params;
  }

  _readMetadata(root) {
    const meta = root.metadata();
    return {
      appName: meta.appName(),
      version: meta.version(),
      supportsMPA: meta.supportsMPA(),
      supportsSSR: meta.supportsSSR(),
      targetPlatforms: this._readPlatforms(meta)
    };
  }

  _readPlatforms(meta) {
    const platforms = [];
    for (let i = 0; i < meta.platformsLength(); i++) {
      platforms.push(meta.platforms(i));
    }
    return platforms;
  }
}
```

**Deliverables**:
- [ ] FlatBuffers reader for binary IR
- [ ] Parse all widget types
- [ ] Extract routes, themes, models
- [ ] Reactivity information extraction
- [ ] Tests: valid IR parsing

**Effort**: 4-5 days

---

#### 9.2 Type Mapping

```javascript
// lib/bridge/type_mapper.js
class TypeMapper {
  static dartTypeToJSType(dartType) {
    const map = {
      'int': 'number',
      'double': 'number',
      'String': 'string',
      'bool': 'boolean',
      'List': 'Array',
      'Map': 'Object',
      'Future': 'Promise',
      'Stream': 'AsyncIterable',
      'Color': 'string', // Hex color
      'Offset': 'Object', // { x, y }
      'Size': 'Object', // { width, height }
      'EdgeInsets': 'Object', // { top, left, right, bottom }
      'TextStyle': 'Object',
      'BoxDecoration': 'Object'
    };
    return map[dartType] || 'any';
  }

  static propValue(dartValue, type) {
    if (dartValue === null || dartValue === undefined) return null;

    if (type === 'Color') {
      return this.colorToHex(dartValue);
    }
    if (type === 'Offset') {
      return { x: dartValue.dx, y: dartValue.dy };
    }
    if (type === 'Size') {
      return { width: dartValue.width, height: dartValue.height };
    }
    if (type === 'EdgeInsets') {
      return {
        top: dartValue.top,
        left: dartValue.left,
        right: dartValue.right,
        bottom: dartValue.bottom
      };
    }
    if (type === 'List' && Array.isArray(dartValue)) {
      return dartValue.map(item => this.propValue(item, 'any'));
    }

    return dartValue;
  }

  static colorToHex(color) {
    // Handle Flutter color formats
    if (typeof color === 'string') return color;
    if (color.value !== undefined) {
      return '#' + color.value.toString(16).padStart(8, '0');
    }
    return '#000000';
  }

  static widgetTypeToComponent(dartWidget) {
    const map = {
      'Container': 'Container',
      'Text': 'Text',
      'Column': 'Column',
      'Row': 'Row',
      'Stack': 'Stack',
      'Scaffold': 'Scaffold',
      'AppBar': 'AppBar',
      'Center': 'Center',
      'Padding': 'Padding',
      'SizedBox': 'SizedBox',
      'ElevatedButton': 'ElevatedButton',
      'TextButton': 'TextButton',
      'IconButton': 'IconButton',
      'Icon': 'Icon',
      'Image': 'Image',
      'Card': 'Card',
      'ListTile': 'ListTile',
      'TextField': 'TextField',
      'Checkbox': 'Checkbox',
      'Switch': 'Switch',
      'FloatingActionButton': 'FloatingActionButton',
      'BottomNavigationBar': 'BottomNavigationBar',
      'TabBar': 'TabBar',
      'AlertDialog': 'AlertDialog',
      'SnackBar': 'SnackBar',
      'Tooltip': 'Tooltip',
      'CircularProgressIndicator': 'CircularProgressIndicator',
      'LinearProgressIndicator': 'LinearProgressIndicator',
      'Wrap': 'Wrap',
      'Flexible': 'Flexible',
      'Expanded': 'Expanded',
      'Align': 'Align',
      'AspectRatio': 'AspectRatio'
    };
    return map[dartWidget];
  }
}
```

**Deliverables**:
- [ ] Dart type to JavaScript conversion
- [ ] Color, Size, Offset conversion
- [ ] Widget type mapping
- [ ] Tests: type conversions

**Effort**: 2-3 days

---

### Phase 10: Code Generator (Weeks 21-23)

#### 10.1 Widget Generator

```javascript
// lib/bridge/generators/widget_generator.js
class WidgetGenerator {
  constructor(irData) {
    this.ir = irData;
    this.widgets = irData.widgets;
    this.theme = irData.theme;
  }

  generateWidget(widgetId) {
    const widget = this.widgets[widgetId];
    if (!widget) return null;

    if (widget.isStateful) {
      return this._generateStatefulWidget(widget);
    } else {
      return this._generateStatelessWidget(widget);
    }
  }

  _generateStatelessWidget(widget) {
    const componentName = widget.type;
    const props = this._generateProps(widget);
    const children = this._generateChildren(widget);

    return `
function ${componentName}(${props ? `{ ${props} }` : ''}) {
  return new _${componentName}(${props ? `{ ${props} }` : '{}'});
}

class _${componentName} extends StatelessWidget {
  constructor(props) {
    super(props.key);
    this.props = props;
  }

  build(context) {
    const theme = MaterialTheme.of(context);
    
    ${this._generateBuildBody(widget)}
  }
}
    `;
  }

  _generateStatefulWidget(widget) {
    const componentName = widget.type;
    const props = this._generateProps(widget);
    const stateFields = this._generateStateFields(widget);

    return `
function ${componentName}(${props ? `{ ${props} }` : ''}) {
  return new _${componentName}(${props ? `{ ${props} }` : '{}'});
}

class _${componentName} extends StatefulWidget {
  createState() {
    return new _${componentName}State();
  }
}

class _${componentName}State extends State {
  constructor() {
    super();
    ${stateFields}
  }

  initState() {
    super.initState();
    // Initialization logic
  }

  build(context) {
    const theme = MaterialTheme.of(context);
    
    ${this._generateBuildBody(widget)}
  }
}
    `;
  }

  _generateProps(widget) {
    return Object.keys(widget.props)
      .filter(key => !widget.props[key].isDynamic)
      .map(key => key)
      .join(', ');
  }

  _generateStateFields(widget) {
    return Object.keys(widget.props)
      .filter(key => widget.props[key].isDynamic)
      .map(key => {
        const prop = widget.props[key];
        return `this.${key} = ${this._serializeValue(prop.value)};`;
      })
      .join('\n    ');
  }

  _generateChildren(widget) {
    if (widget.children.length === 0) return 'null';
    if (widget.children.length === 1) return this._generateWidget(widget.children[0]);
    return `[${widget.children.map(child => this._generateWidget(child)).join(', ')}]`;
  }

  _generateWidget(widget) {
    const componentName = widget.type;
    const props = Object.entries(widget.props)
      .map(([key, val]) => `${key}: ${this._serializeValue(val.value)}`)
      .join(', ');

    return `${componentName}({ ${props} })`;
  }

  _generateBuildBody(widget) {
    const componentName = widget.type;
    const props = Object.entries(widget.props)
      .map(([key, val]) => {
        if (val.isDynamic) {
          return `${key}: this.${key}`;
        }
        return `${key}: ${this._serializeValue(val.value)}`;
      })
      .join(',\n      ');

    const children = this._generateChildren(widget);

    return `
    return ${componentName}({
      key: this.props.key,
      ${props}
      ${children !== 'null' ? `,\n      children: ${children}` : ''}
    });
    `;
  }

  _serializeValue(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return `'${value}'`;
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return 'null';
  }
}
```

**Deliverables**:
- [ ] Widget code generation (stateless & stateful)
- [ ] Props generation with type safety
- [ ] Build method generation
- [ ] Tests: generated code validity

**Effort**: 5-6 days

---

#### 10.2 Route Generator

```javascript
// lib/bridge/generators/route_generator.js
class RouteGenerator {
  constructor(irData) {
    this.ir = irData;
    this.routes = irData.routes;
    this.widgets = irData.widgets;
  }

  generateRoutes() {
    const routeConfigs = this.routes.map(route => ({
      name: route.name,
      path: route.path,
      component: this.widgets[route.widgetId],
      isPage: route.isPage
    }));

    return `
const AppRoutes = [
  ${routeConfigs.map(r => this._generateRoute(r)).join(',\n  ')}
];

export const appRouter = new Router({
  routes: AppRoutes,
  mode: '${this.ir.metadata.supportsMPA ? 'mpa' : 'spa'}'
});
    `;
  }

  _generateRoute(route) {
    return `{
      name: '${route.name}',
      path: '${route.path}',
      component: ${route.component.type},
      isPage: ${route.isPage}
    }`;
  }

  generateNavigator() {
    return `
class AppNavigator {
  static routes = new Map([
    ${this.routes.map(r => `['${r.name}', '${r.path}']`).join(',\n    ')}
  ]);

  static push(context, routeName, args) {
    Navigator.pushNamed(context, routeName, { arguments: args });
  }

  static pop(context, result) {
    Navigator.pop(context, result);
  }

  static replace(context, routeName, args) {
    Navigator.pushReplacementNamed(context, routeName, { arguments: args });
  }
}
    `;
  }
}
```

**Deliverables**:
- [ ] Route configuration generation
- [ ] Navigator class generation
- [ ] Dynamic route matching
- [ ] Tests: route generation

**Effort**: 3-4 days

---

#### 10.3 Model/Service Generator

```javascript
// lib/bridge/generators/model_generator.js
class ModelGenerator {
  constructor(irData) {
    this.ir = irData;
    this.models = irData.models;
  }

  generateModel(modelName) {
    const model = this.models[modelName];
    if (!model) return null;

    const properties = this._generateProperties(model);
    const methods = this._generateMethods(model);

    return `
class ${modelName} {
  constructor(${this._constructorParams(model)}) {
    ${properties}
  }

  ${methods}

  toJSON() {
    return {
      ${model.properties.map(p => `${p.name}: this.${p.name}`).join(',\n      ')}
    };
  }

  static fromJSON(json) {
    return new ${modelName}(${model.properties.map(p => `json.${p.name}`).join(', ')});
  }
}
    `;
  }

  _generateProperties(model) {
    return model.properties
      .map(prop => `this.${prop.name} = ${prop.name};`)
      .join('\n    ');
  }

  _generateMethods(model) {
    return model.methods
      .map(method => {
        const params = method.parameters.map(p => p.name).join(', ');
        return `
  ${method.name}(${params}) {
    // Method implementation from IR
    ${method.body || 'return null;'}
  }
        `;
      })
      .join('\n');
  }

  _constructorParams(model) {
    return model.properties
      .map(p => `${p.name}${!p.defaultValue ? '' : ` = ${p.defaultValue}`}`)
      .join(', ');
  }

  generateAllModels() {
    return Object.keys(this.models)
      .map(modelName => this.generateModel(modelName))
      .join('\n\n');
  }
}
```

**Deliverables**:
- [ ] Model class generation
- [ ] JSON serialization/deserialization
- [ ] Method code generation
- [ ] Tests: model generation

**Effort**: 3-4 days

---

### Phase 11: Build & Assembly (Weeks 24-25)

#### 11.1 Build Pipeline

```javascript
// lib/bridge/builder.js
class BridgeBuilder {
  constructor(irBuffer, outputDir = './build') {
    this.irReader = new IRReader(irBuffer);
    this.irData = this.irReader.readApp();
    this.outputDir = outputDir;
    this.generators = {
      widgets: new WidgetGenerator(this.irData),
      routes: new RouteGenerator(this.irData),
      models: new ModelGenerator(this.irData)
    };
  }

  async build() {
    console.log('Starting Flutter.js build from IR...');

    // 1. Generate all widgets
    console.log('Generating widgets...');
    await this._buildWidgets();

    // 2. Generate models
    console.log('Generating models...');
    await this._buildModels();

    // 3. Generate routes
    console.log('Generating routes...');
    await this._buildRoutes();

    // 4. Generate main app
    console.log('Generating app entry...');
    await this._buildApp();

    // 5. Generate styles
    console.log('Generating styles...');
    await this._buildStyles();

    // 6. Generate index.html
    console.log('Generating index.html...');
    await this._buildHTML();

    // 7. Copy framework files
    console.log('Copying framework...');
    await this._copyFramework();

    console.log('Build complete!');
    return {
      success: true,
      outputDir: this.outputDir,
      files: await this._listOutput()
    };
  }

  async _buildWidgets() {
    const widgetDir = path.join(this.outputDir, 'widgets');
    await fs.mkdir(widgetDir, { recursive: true });

    for (const [id, widget] of Object.entries(this.irData.widgets)) {
      const code = this.generators.widgets.generateWidget(id);
      const fileName = this._kebabCase(widget.type) + '.js';
      await fs.writeFile(path.join(widgetDir, fileName), code);
    }
  }

  async _buildModels() {
    const modelDir = path.join(this.outputDir, 'models');
    await fs.mkdir(modelDir, { recursive: true });

    const allModels = this.generators.models.generateAllModels();
    await fs.writeFile(path.join(modelDir, 'index.js'), allModels);
  }

  async _buildRoutes() {
    const routeCode = this.generators.routes.generateRoutes();
    const navCode = this.generators.routes.generateNavigator();

    const routeDir = path.join(this.outputDir, 'routes');
    await fs.mkdir(routeDir, { recursive: true });

    await fs.writeFile(path.join(routeDir, 'index.js'), routeCode);
    await fs.writeFile(path.join(routeDir, 'navigator.js'), navCode);
  }

  async _buildApp() {
    const appCode = `
import { MaterialApp, Scaffold } from '@flutterjs/material';
import { appRouter } from './routes/index.js';
import * as Models from './models/index.js';

class MyApp extends StatelessWidget {
  build(context) {
    return MaterialApp({
      title: '${this.irData.metadata.appName}',
      theme: ${this._themeToJS(this.irData.theme)},
      routes: appRouter.routes,
      home: ${this._getHomeWidget()}
    });
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app');
  const app = new MyApp();
  const context = new BuildContext(null);
  const vnode = app.build(context);
  const dom = vnode.toDOM();
  root.appendChild(dom);
});
    `;

    await fs.writeFile(path.join(this.outputDir, 'app.js'), appCode);
  }

  async _buildStyles() {
    const cssCode = `
/* Material Design 3 Variables */
:root {
  ${this._generateCSSVariables(this.irData.theme)}
}

/* Widget Base Styles */
${this._generateWidgetCSS()}

/* Application Styles */
${await this._generateAppCSS()}
    `;

    await fs.writeFile(path.join(this.outputDir, 'styles.css'), cssCode);
  }

  async _buildHTML() {
    const htmlCode = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.irData.metadata.appName}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app"></div>
  
  <!-- Flutter.js Framework -->
  <script src="framework/core.js"></script>
  <script src="framework/material.js"></script>
  <script src="framework/router.js"></script>
  
  <!-- Models -->
  <script src="models/index.js"></script>
  
  <!-- Routes -->
  <script src="routes/index.js"></script>
  
  <!-- App -->
  <script src="app.js"></script>
</body>
</html>
    `;

    await fs.writeFile(path.join(this.outputDir, 'index.html'), htmlCode);
  }

  async _copyFramework() {
    const frameworkSrc = path.join(__dirname, '../framework');
    const frameworkDst = path.join(this.outputDir, 'framework');
    await fs.cp(frameworkSrc, frameworkDst, { recursive: true });
  }

  _generateCSSVariables(theme) {
    const colors = Object.entries(theme.colorScheme)
      .map(([name, color]) => `--md-sys-${this._kebabCase(name)}: ${color};`)
      .join('\n  ');

    const typography = Object.entries(theme.typography)
      .map(([name, style]) => `
  --md-typescale-${this._kebabCase(name)}-size: ${style.fontSize}px;
  --md-typescale-${this._kebabCase(name)}-weight: ${style.fontWeight};
  --md-typescale-${this._kebabCase(name)}-line-height: ${style.lineHeight}px;`)
      .join('\n');

    return colors + typography;
  }

  _generateWidgetCSS() {
    return `
.flutter-container { box-sizing: border-box; }
.flutter-column { display: flex; flex-direction: column; }
.flutter-row { display: flex; flex-direction: row; }
.flutter-center { display: flex; justify-content: center; align-items: center; }
.flutter-text { font-family: Roboto, sans-serif; }
.flutter-button { border: none; cursor: pointer; border-radius: 4px; }
.flutter-card { border-radius: 12px; padding: 16px; }
    `;
  }

  async _generateAppCSS() {
    // Generate component-specific CSS based on widgets used
    return '';
  }

  _themeToJS(theme) {
    return `new MaterialTheme({
      useMaterial3: ${theme.useMaterial3},
      colorScheme: {
        ${Object.entries(theme.colorScheme).map(([k, v]) => `${k}: '${v}'`).join(',\n        ')}
      }
    })`;
  }

  _getHomeWidget() {
    const home = this.irData.routes.find(r => r.path === '/');
    return home ? home.widgetId : 'Scaffold()';
  }

  _kebabCase(str) {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, '');
  }

  async _listOutput() {
    const files = [];
    const walk = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else {
          files.push(path.relative(this.outputDir, full));
        }
      }
    };
    await walk(this.outputDir);
    return files;
  }
}
```

**Deliverables**:
- [ ] Complete build pipeline
- [ ] File generation and organization
- [ ] CSS variable generation
- [ ] HTML template generation
- [ ] Framework copying
- [ ] Tests: complete build output

**Effort**: 5-7 days

---

#### 11.2 CLI Integration

```javascript
// bin/flutter-js-bridge.js
#!/usr/bin/env node

import { program } from 'commander';
import { BridgeBuilder } from '../lib/bridge/builder.js';
import fs from 'fs/promises';
import path from 'path';

program
  .command('convert <ir-file> [output-dir]')
  .description('Convert Flutter IR to Flutter.js application')
  .option('-w, --watch', 'Watch for IR file changes')
  .option('-o, --output <dir>', 'Output directory')
  .option('--minify', 'Minify output')
  .option('--obfuscate', 'Obfuscate JavaScript')
  .action(async (irFile, outputDir, options) => {
    try {
      const irBuffer = await fs.readFile(irFile);
      const outDir = outputDir || options.output || './build';

      const builder = new BridgeBuilder(irBuffer, outDir);
      const result = await builder.build();

      console.log(`✓ Build complete in ${outDir}`);
      console.log(`✓ Generated ${result.files.length} files`);

      if (options.minify) {
        // Minify output
      }
      if (options.obfuscate) {
        // Obfuscate output
      }
    } catch (error) {
      console.error('Build failed:', error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
```

**Deliverables**:
- [ ] CLI tool for IR conversion
- [ ] Watch mode for development
- [ ] Minification option
- [ ] Obfuscation option
- [ ] Tests: CLI functionality

**Effort**: 2-3 days

---

## Summary: Complete Timeline

| Phase | Weeks | Focus | Deliverables |
|-------|-------|-------|--------------|
| **Part A: Framework** | | | |
| 1 | 1-3 | Core Widget System | Widget, State, VNode, Scheduling |
| 2 | 4-6 | Material Design | Theme, Colors, Typography, 15 widgets |
| 3 | 7-8 | State Management | InheritedWidget, Context, BuildContext |
| 4 | 9-10 | Navigation | Routes, Navigator, History |
| 5 | 11-12 | Events & Gestures | GestureDetector, Tap, LongPress, Pan |
| 6 | 13-14 | Forms & Input | TextField, Checkbox, Switch, Form |
| 7 | 15-16 | Tier 2 Widgets | Card, ListTile, FAB, BottomNav, Progress |
| 8 | 17-18 | Layout & Tier 3 | Wrap, Flexible, Expanded, Align, AspectRatio |
| **Part B: Bridge** | | | |
| 9 | 19-20 | IR Parser | FlatBuffers reader, Type mapping |
| 10 | 21-23 | Code Generator | Widgets, Routes, Models, Services |
| 11 | 24-25 | Build Pipeline | Assembly, CLI, Output generation |

**Total: 25 weeks (6 months)**

---

## Key Architecture Decisions

### 1. Framework Design Philosophy
- **Minimal runtime**: Only what Flutter needs, no bloat
- **Virtual DOM**: Efficient updates through diffing
- **Dart API compatibility**: Familiar to Flutter developers
- **Pure JavaScript**: No transpilation needed at runtime

### 2. IR to Code Strategy
- **Binary input**: FlatBuffers from your Dart compiler
- **Direct generation**: IR → JavaScript (no intermediate format)
- **Type-safe**: Leverage IR metadata for optimization
- **Modular output**: Separate files for widgets, models, routes

### 3. Widget Implementation
- **Factory functions**: Match Flutter's clean API
- **Class-based internals**: `_WidgetName` handles implementation
- **CSS-first styling**: Leverage web platform strengths
- **Accessibility**: Built-in semantic HTML and ARIA

### 4. State Management
- **Flutter-compatible**: `setState()` works identically
- **Efficient scheduling**: Batched updates via `requestAnimationFrame`
- **Dependency tracking**: Depth-first rebuild ordering
- **Context system**: Theme, MediaQuery, InheritedWidget support

---

## Success Criteria

### Framework Complete When:
- [ ] 30+ widgets implemented (Tier 1, 2, 3)
- [ ] Reactivity system handles nested updates
- [ ] Navigation works with browser history
- [ ] Material Design 3 tokens applied correctly
- [ ] <15KB runtime (minified + gzipped)
- [ ] 100+ unit tests passing

### Bridge Complete When:
- [ ] IR parser handles all widget types
- [ ] Code generation produces valid JavaScript
- [ ] Routes and navigation configured automatically
- [ ] Models and services generated correctly
- [ ] Build output is production-ready
- [ ] CLI tool works end-to-end

### Quality Gates:
- [ ] All generated code is valid JavaScript
- [ ] Generated widgets render identically to Flutter
- [ ] No runtime errors in sample apps
- [ ] Performance: load time <2s (3G)
- [ ] Bundle size: <50KB uncompressed
- [ ] SEO score >90

---

## Development Notes

### Technologies Used
- **JavaScript (ES6+)**: Core framework and generated code
- **CSS3**: Styling with custom properties and Flexbox
- **FlatBuffers**: Binary IR parsing
- **Node.js**: Build tools and CLI

### Testing Strategy
- **Unit tests**: Each widget, each bridge component
- **Integration tests**: Full app builds from sample IR
- **Visual regression**: Screenshot comparisons
- **Performance tests**: Bundle size, load time, TTI

### Documentation Required
- **API Reference**: All 30+ widgets with examples
- **Getting Started**: From IR to running app
- **Architecture Guide**: Framework internals
- **Migration Guide**: Converting Flutter apps
- **Examples**: 5-10 complete sample apps

---

This plan provides a complete, realistic roadmap for building Flutter.js from the ground up.