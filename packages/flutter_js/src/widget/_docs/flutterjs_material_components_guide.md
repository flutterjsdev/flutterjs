# Flutter.js Material Components Guide

## 📖 Complete Overview

This guide explains how Material Design components are organized in Flutter.js, their responsibilities, and how to implement them using VNode and Material properties.

---

## 🎯 Table of Contents

1. [Component Organization](#component-organization)
2. [VNode vs Material Properties](#vnode-vs-material-properties)
3. [Component Sections](#component-sections)
4. [Implementation Patterns](#implementation-patterns)
5. [Property Handling](#property-handling)
6. [State Management](#state-management)
7. [Build Order](#build-order)
8. [Examples](#examples)

---

## Component Organization

### What is a Material Component?

A Material Component in Flutter.js is a **widget** that:
- Takes **Material properties** (alignment, colors, elevation, etc.)
- Converts them to **CSS classes and styles**
- Returns a **VNode** (virtual DOM representation)
- Can optionally manage **state** and **animations**

### Three Core Responsibilities

```
┌─────────────────────────────────────────────┐
│   1. ACCEPT MATERIAL PROPERTIES             │
│   (MainAxisAlignment, EdgeInsets, etc.)     │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│   2. PROCESS & MAP TO CSS                   │
│   (Enums → CSS classes, convert styles)     │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│   3. RETURN VNODE                           │
│   (Clean HTML representation)               │
└─────────────────────────────────────────────┘
```

---

## VNode vs Material Properties

### What is VNode?

**VNode** = Virtual Node (JavaScript representation of DOM)

```javascript
new VNode({
  tag: 'div',              // HTML tag
  props: { className: 'fjs-column' },  // Attributes
  children: [],            // Child nodes
  events: { click: fn }    // Event handlers
})
```

**Purpose**: Abstract representation that can be:
- Converted to HTML string (SSR)
- Converted to DOM element (CSR)
- Easily manipulated and diffed

### What are Material Properties?

**Material Properties** = Configuration parameters using Material Design enums/classes

```javascript
Column({
  mainAxisAlignment: MainAxisAlignment.center,     // ← Material property
  crossAxisAlignment: CrossAxisAlignment.stretch,  // ← Material property
  children: [...]
})
```

**Purpose**: Provide Flutter-like API that developers understand

### The Relationship

```
User Code:
  ↓
Column({ mainAxisAlignment: MainAxisAlignment.center })
  ↓
Widget stores Material property:
  ↓
this.mainAxisAlignment = MainAxisAlignment.center
  ↓
Maps to CSS class using enum:
  ↓
const map = { [MainAxisAlignment.center]: 'fjs-main-center' }
  ↓
Generates VNode with CSS class:
  ↓
new VNode({
  tag: 'div',
  props: { className: 'fjs-main-center' }
})
  ↓
Returns clean, optimized VNode
```

---

## Component Sections

### SECTION 1: Basic Layout Widgets

**Components**: Center, Padding, SizedBox, Spacer

**Purpose**: Simple positioning without Material complexity

**Material Properties**: ❌ MINIMAL
- No enums
- No theme lookup
- Just simple CSS values

**VNode Creation**: ✅ SIMPLE
- Standard flexbox layout
- Basic CSS properties

**State Management**: ❌ NONE
- Stateless widgets

**Animation**: ❌ NONE

**Example**:
```javascript
Center({
  child: Text('Hello'),
  widthFactor: 0.5
})

// Internally:
// - Returns VNode with display: flex, justifyContent: center
// - No Material property mapping needed
```

---

### SECTION 2: Flex Layout Widgets

**Components**: Column, Row, Flex, Wrap

**Purpose**: Advanced multi-child positioning using flexbox

**Material Properties**: ✅ ENUMS
- MainAxisAlignment (start, center, end, spaceBetween, etc.)
- CrossAxisAlignment (stretch, baseline, etc.)

**VNode Creation**: ✅ ENUM MAPPING
```javascript
// Widget receives:
mainAxisAlignment: MainAxisAlignment.center

// Maps to CSS class:
const map = {
  [MainAxisAlignment.start]: 'fjs-main-start',
  [MainAxisAlignment.center]: 'fjs-main-center',
  [MainAxisAlignment.end]: 'fjs-main-end'
}

// Returns VNode:
new VNode({
  tag: 'div',
  props: {
    className: map[this.mainAxisAlignment],
    style: { display: 'flex', flexDirection: 'column' }
  }
})
```

**State Management**: ❌ NONE

**Animation**: ❌ NONE

---

### SECTION 3: Container & Decoration Widgets

**Components**: Container, Card, DecoratedBox

**Purpose**: Box with styling (color, border, shadow, radius)

**Material Properties**: ✅ COMPLEX CONVERSION
- Color → backgroundColor
- BorderRadius → borderRadiusCSS object
- BoxShadow → boxShadowString
- Border → borderCSSObject

**VNode Creation**: ✅ STYLE OBJECT CONVERSION
```javascript
Container({
  color: Colors.primary,
  borderRadius: BorderRadius.circular(12),
  boxShadow: BoxShadow({ blurRadius: 8 })
})

// Internally:
// - Calls borderRadius.toCSSObject()
// - Calls boxShadow.toCSSString()
// - Returns VNode with all styles merged
```

**State Management**: ❌ NONE

**Animation**: ❌ NONE

---

### SECTION 4: Text & Typography Widgets

**Components**: Text, RichText, TextSpan

**Purpose**: Text rendering with styling

**Material Properties**: ✅ TEXTSTYLE CONVERSION
- TextStyle → CSS style object
- FontWeight → fontWeight property
- TextAlign → textAlign property
- TextOverflow → overflow handling

**VNode Creation**: ✅ STYLE CONVERSION
```javascript
Text('Hello', {
  style: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: Colors.primary
  }
})

// Internally:
// - Converts TextStyle to CSS object
// - Returns VNode with span element
```

**State Management**: ❌ NONE

**Animation**: ❌ NONE

---

### SECTION 5: Button Widgets

**Components**: ElevatedButton, FilledButton, TextButton, OutlinedButton, IconButton, FloatingActionButton

**Purpose**: Interactive clickable elements with Material styling

**Material Properties**: ✅ THEME LOOKUP + SHADOWS
- onPressed callback
- style overrides
- Uses ButtonTheme from context
- Elevation system (BoxShadow)

**VNode Creation**: ✅ THEME + ELEVATION
```javascript
ElevatedButton({
  onPressed: () => handleClick(),
  child: Text('Click me')
})

// Internally:
// - Gets ButtonTheme from context
// - Applies BoxShadow based on elevation
// - Sets background color from theme
// - Returns VNode with button element + click event
```

**State Management**: ❌ NO INTERNAL STATE
- External callback only

**Animation**: ✅ RIPPLE EFFECT
- Material ripple on click
- Uses animation controller

---

### SECTION 6: Input Widgets

**Components**: TextField, Checkbox, Switch, Radio, Slider, RangeSlider, DatePicker, TimePicker

**Purpose**: User input with validation and state management

**Material Properties**: ✅ INPUTDECORATION + VALIDATION
- InputDecoration (hint, label, error, etc.)
- Validators
- Controller for value management

**VNode Creation**: ✅ INPUT ELEMENTS + ATTRIBUTES
```javascript
TextField({
  decoration: InputDecoration({
    hintText: 'Enter text',
    labelText: 'Name',
    filled: true
  }),
  validator: FormValidator.required()
})

// Internally:
// - Applies InputDecoration styling
// - Converts to input VNode with attributes
// - Attaches validation logic
```

**State Management**: ✅ REQUIRED
- Manages: checked, value, selected, input
- Uses: TextEditingController
- Lifecycle: initState, didUpdateWidget, dispose

**Animation**: ❌ NONE (except focus transition)

---

### SECTION 7: Selection Widgets

**Components**: Chip, ChoiceChip, FilterChip, InputChip, ActionChip, SegmentedButton

**Purpose**: User selection (single or multiple)

**Material Properties**: ✅ SELECTION STATE + THEME
- selected boolean
- onSelected callback
- label widget
- avatar widget

**VNode Creation**: ✅ STATE-BASED STYLING
```javascript
ChoiceChip({
  label: Text('Option 1'),
  selected: this.state.selected,
  onSelected: (value) => this.setState({ selected: value })
})

// Internally:
// - Maps selected state to CSS class
// - Applies different colors based on selection
// - Returns VNode with click handler
```

**State Management**: ✅ REQUIRED
- Manages: selected state
- Updates: on user selection
- Notifies: onSelected callback

**Animation**: ❌ NONE

---

### SECTION 8: List Widgets

**Components**: ListTile, ListView, GridView, ReorderableList

**Purpose**: Rendering collections of items

**Material Properties**: ✅ LIST ITEM SPACING & LAYOUT
- ListTile properties (title, subtitle, leading, trailing)
- ListView/GridView (scrollDirection, itemBuilder)
- Spacing and dividers

**VNode Creation**: ✅ COLLECTION RENDERING
```javascript
ListView({
  children: itemList.map(item => 
    ListTile({
      title: Text(item.title),
      subtitle: Text(item.subtitle),
      leading: Icon(item.icon)
    })
  )
})

// Internally:
// - Builds each ListTile as VNode
// - Applies Material 3 spacing
// - Adds dividers between items
// - Returns list container VNode
```

**State Management**: ✅ SCROLL STATE
- Manages: scroll position
- Lifecycle: scroll listeners
- Lazy loading support

**Animation**: ✅ LIST ANIMATIONS
- Item enter/exit animations
- Reorder animations (ReorderableList)

---

### SECTION 9: Dialog & Modal Widgets

**Components**: Dialog, AlertDialog, SimpleDialog, BottomSheet, ModalBottomSheet, SnackBar, ExpansionPanel

**Purpose**: Overlay content above main content

**Material Properties**: ✅ ELEVATION + SCRIM
- Elevation (z-index)
- Scrim color (backdrop)
- Animations (fade in/out)
- Position (center, bottom, etc.)

**VNode Creation**: ✅ OVERLAY STRUCTURE
```javascript
AlertDialog({
  title: Text('Confirm?'),
  content: Text('Are you sure?'),
  actions: [
    TextButton({ child: Text('Cancel') }),
    TextButton({ child: Text('OK') })
  ]
})

// Internally:
// - Creates backdrop VNode (div with scrim color)
// - Creates dialog box VNode (elevated container)
// - Sets z-index from Material tokens
// - Returns overlay structure
```

**State Management**: ✅ VISIBILITY STATE
- Manages: visible/hidden
- Lifecycle: on show/hide
- Modal barrier handling

**Animation**: ✅ ENTER/EXIT
- Fade in animation
- Slide up/down animations
- Scrim fade

---

### SECTION 10: App Structure Widgets

**Components**: AppBar, Scaffold, NavigationBar, BottomNavigationBar, NavigationRail, Drawer, DrawerHeader, DrawerTile, TabBar

**Purpose**: Page-level layout and navigation

**Material Properties**: ✅ COMPLEX THEME + NAVIGATION
- Title, actions, leading, trailing (AppBar)
- Elevation and color
- Navigation state

**VNode Creation**: ✅ COMPLEX STRUCTURE
```javascript
Scaffold({
  appBar: AppBar({
    title: Text('My App'),
    elevation: 4
  }),
  body: Center({ child: Text('Content') }),
  bottomNavigationBar: BottomNavigationBar({
    items: [...]
  })
})

// Internally:
// - Creates column structure
// - Applies AppBar styling (elevation, color)
// - Manages navigation state
// - Returns complete page structure
```

**State Management**: ✅ REQUIRED
- Manages: current page, tab selection
- Navigation state
- Drawer visibility

**Animation**: ❌ NONE (navigation handled separately)

---

### SECTION 11: Feedback Widgets

**Components**: InkWell, InkResponse, Tooltip, CircularProgressIndicator, LinearProgressIndicator

**Purpose**: Visual feedback for interactions

**Material Properties**: ✅ INTERACTION STYLING
- splashColor, hoverColor (InkWell)
- onTap, onLongPress callbacks
- Ripple radius

**VNode Creation**: ✅ EVENT HANDLERS + ANIMATION
```javascript
InkWell({
  onTap: () => handleTap(),
  splashColor: Colors.primary,
  child: Text('Tap me')
})

// Internally:
// - Attaches click handler
// - Creates ripple animation on click
// - Returns VNode with event listeners
```

**State Management**: ✅ ANIMATION STATE
- Manages: ripple animation
- Hover state
- Animation controller

**Animation**: ✅ RIPPLE EFFECT
- Ripple animation curves
- Splash color animation
- Hover state animation

---

### SECTION 12: Media Widgets

**Components**: Icon, Image, NetworkImage, CircleAvatar, Badge

**Purpose**: Asset rendering (icons, images, avatars)

**Material Properties**: ✅ SIZE & BOXFIT
- Size (icon size, image size)
- BoxFit (contain, cover, fill, etc.)
- Color filter

**VNode Creation**: ✅ MEDIA ELEMENTS
```javascript
Icon(Icons.favorite, {
  size: 24,
  color: Colors.red
})

// Internally:
// - Returns img or svg VNode
// - Applies size as width/height
// - Applies color filter if needed
```

**State Management**: ❌ NONE (except loading state)

**Animation**: ❌ NONE

---

## Implementation Patterns

### Pattern 1: Simple Stateless Component

```javascript
// Structure
function ComponentName(props) {
  return new _ComponentName(props);
}

class _ComponentName extends StatelessWidget {
  constructor(props) {
    super();
    this.prop1 = props.prop1;
    this.prop2 = props.prop2;
  }

  build(context) {
    // 1. Extract Material properties
    // 2. Map to CSS classes/values
    // 3. Return VNode
    return new VNode({
      tag: 'div',
      props: { className: this._generateCSSClasses() }
    });
  }

  _generateCSSClasses() {
    // Map enums to CSS classes
  }
}

// Usage
Center({ child: Text('Hello') })
```

### Pattern 2: Stateful Component with State

```javascript
// Structure
function ComponentName(props) {
  return new _ComponentName(props);
}

class _ComponentName extends StatefulWidget {
  constructor(props) {
    super();
    this.prop1 = props.prop1;
  }

  createState() {
    return new _ComponentNameState();
  }
}

class _ComponentNameState extends State {
  initState() {
    // Initialize
  }

  build(context) {
    // 1. Use this.state for state values
    // 2. Map Material properties
    // 3. Return VNode with event handlers
    return new VNode({
      tag: 'input',
      props: { value: this.state.value },
      events: { change: (e) => this.setState({ value: e.target.value }) }
    });
  }

  dispose() {
    // Cleanup
  }
}

// Usage
TextField({ onChanged: (value) => console.log(value) })
```

### Pattern 3: Component with Theme Access

```javascript
class _ComponentName extends StatelessWidget {
  build(context) {
    // Get theme from context
    const theme = context.getInheritedWidgetOfExactType(ThemeData);
    
    // Use theme colors
    const color = this.customColor || theme.primary;
    
    return new VNode({
      tag: 'div',
      props: {
        style: { backgroundColor: color }
      }
    });
  }
}
```

---

## Property Handling

### Type 1: Simple Values

No conversion needed, use directly:

```javascript
// Properties: width, height, opacity
SizedBox({ width: 100, height: 100 })

// In VNode:
props: { style: { width: '100px', height: '100px' } }
```

### Type 2: Enums → CSS Classes

Map enums to CSS class names:

```javascript
// Property: MainAxisAlignment enum
Column({ mainAxisAlignment: MainAxisAlignment.center })

// Mapping:
const map = {
  [MainAxisAlignment.center]: 'fjs-main-center',
  [MainAxisAlignment.start]: 'fjs-main-start'
}

// In VNode:
props: { className: map[this.mainAxisAlignment] }
```

### Type 3: Objects → CSS Objects

Convert objects to CSS style objects:

```javascript
// Property: BorderRadius object
Container({ borderRadius: BorderRadius.circular(12) })

// Conversion:
const borderRadiusCSS = this.borderRadius.toCSSObject();
// Returns: { borderTopLeftRadius: '12px', ... }

// In VNode:
props: { style: borderRadiusCSS }
```

### Type 4: Complex Objects → Strings

Convert complex objects to CSS strings:

```javascript
// Property: BoxShadow object
Container({ boxShadow: BoxShadow({ blurRadius: 8 }) })

// Conversion:
const shadowString = this.boxShadow.toCSSString();
// Returns: '0px 0px 8px 0px rgba(0,0,0,0.2)'

// In VNode:
props: { style: { boxShadow: shadowString } }
```

### Type 5: Callbacks → Event Handlers

Attach callbacks as event listeners:

```javascript
// Property: onPressed callback
ElevatedButton({ onPressed: () => handleClick() })

// In VNode:
events: { click: this.onPressed }
```

---

## State Management

### When to Use State

| Use Case | Example | State Type |
|----------|---------|-----------|
| User input | TextField value | StatefulWidget |
| Selection | Checkbox checked | StatefulWidget |
| Visibility | Dialog visible | StatefulWidget |
| Toggle | Switch state | StatefulWidget |
| Static content | Text, Icon | StatelessWidget |
| Layout only | Column, Row | StatelessWidget |

### State Lifecycle

```javascript
class MyState extends State {
  // 1. Called once when widget created
  initState() {
    this.count = 0;
  }

  // 2. Called when widget props change
  didUpdateWidget(oldWidget) {
    if (oldWidget.data !== this.widget.data) {
      // Handle change
    }
  }

  // 3. Build the UI
  build(context) {
    return new VNode({...});
  }

  // 4. Called before removing
  deactivate() {
    // Save state if needed
  }

  // 5. Called on cleanup
  dispose() {
    // Cleanup resources
  }
}
```

### setState Usage

```javascript
// Trigger rebuild with new state
this.setState(() => {
  this.count = this.count + 1;
  this.name = 'New Name';
});

// Scheduler will:
// 1. Update this.state properties
// 2. Call performRebuild()
// 3. Generate new VNode
// 4. Update DOM
```

---

## Build Order

Components must be built in dependency order:

```
Level 8: Layout (Center, Padding)
  ↓
Level 8: Flex (Column, Row)
  ↓
Level 9: Container (Container, Card)
  ↓
Level 5: Text (Text, RichText)
  ↓
Level 8: Media (Icon, Image)
  ↓
Level 11: Button (ElevatedButton, TextButton)
  ↓
Level 10: Input (TextField, Checkbox)
  ↓
Level 11: Selection (Chip, SegmentedButton)
  ↓
Level 12: List (ListView, ListTile)
  ↓
Level 8: Feedback (InkWell, Progress)
  ↓
Level 13: Dialog (AlertDialog, SnackBar)
  ↓
Level 10: App (AppBar, Scaffold)
```

---

## Examples

### Example 1: Simple Button Component

```javascript
// Factory function
function ElevatedButton({ onPressed, child }) {
  return new _ElevatedButton({ onPressed, child });
}

// Widget class
class _ElevatedButton extends StatelessWidget {
  constructor({ onPressed, child }) {
    super();
    this.onPressed = onPressed;
    this.child = child;
  }

  build(context) {
    // 1. Get theme
    const theme = context.getInheritedWidgetOfExactType(ThemeData);
    
    // 2. Build child
    const builtChild = this.child instanceof StatelessWidget
      ? this.child.build(context)
      : this.child;
    
    // 3. Create VNode
    return new VNode({
      tag: 'button',
      props: {
        className: 'fjs-elevated-button',
        style: {
          backgroundColor: theme.primary,
          color: theme.onPrimary,
          padding: '12px 24px',
          borderRadius: '4px',
          cursor: this.onPressed ? 'pointer' : 'default'
        }
      },
      children: [builtChild],
      events: {
        click: this.onPressed
      }
    });
  }
}

// Usage
ElevatedButton({
  onPressed: () => alert('Clicked!'),
  child: Text('Click Me')
})
```

### Example 2: Stateful Input Component

```javascript
// Factory function
function TextField({ value, onChanged, decoration }) {
  return new _TextField({ value, onChanged, decoration });
}

// Widget class
class _TextField extends StatefulWidget {
  constructor({ value, onChanged, decoration }) {
    super();
    this.value = value;
    this.onChanged = onChanged;
    this.decoration = decoration;
  }

  createState() {
    return new _TextFieldState();
  }
}

// State class
class _TextFieldState extends State {
  initState() {
    this.value = this.widget.value || '';
  }

  build(context) {
    // 1. Get InputDecoration
    const decoration = this.widget.decoration || new InputDecoration();
    
    // 2. Apply padding from decoration
    const padding = decoration.getContentPadding();
    
    // 3. Create input VNode
    return new VNode({
      tag: 'input',
      props: {
        type: 'text',
        value: this.value,
        placeholder: decoration.hintText,
        style: {
          padding: `${padding.top}px ${padding.right}px`,
          border: '1px solid #ccc',
          borderRadius: '4px'
        }
      },
      events: {
        change: (e) => {
          this.setState(() => {
            this.value = e.target.value;
          });
          if (this.widget.onChanged) {
            this.widget.onChanged(this.value);
          }
        }
      }
    });
  }
}

// Usage
TextField({
  value: 'Initial',
  onChanged: (value) => console.log(value),
  decoration: new InputDecoration({
    hintText: 'Enter text',
    labelText: 'Name'
  })
})
```

### Example 3: Column with Alignment

```javascript
// Factory function
function Column({ children, mainAxisAlignment, crossAxisAlignment }) {
  return new _Column({
    children,
    mainAxisAlignment,
    crossAxisAlignment
  });
}

// Widget class
class _Column extends StatelessWidget {
  constructor({ children, mainAxisAlignment, crossAxisAlignment }) {
    super();
    this.children = children;
    this.mainAxisAlignment = mainAxisAlignment;
    this.crossAxisAlignment = crossAxisAlignment;
  }

  build(context) {
    // 1. Build all children
    const builtChildren = this.children.map(child => {
      if (child instanceof StatelessWidget || child instanceof StatefulWidget) {
        return child.build(context);
      }
      return child;
    });
    
    // 2. Map alignment enums to CSS
    const alignmentMap = {
      [MainAxisAlignment.start]: 'flex-start',
      [MainAxisAlignment.center]: 'center',
      [MainAxisAlignment.end]: 'flex-end',
      [MainAxisAlignment.spaceBetween]: 'space-between',
      [MainAxisAlignment.spaceAround]: 'space-around',
      [MainAxisAlignment.spaceEvenly]: 'space-evenly'
    };
    
    // 3. Create VNode with flexbox
    return new VNode({
      tag: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: alignmentMap[this.mainAxisAlignment],
          alignItems: alignmentMap[this.crossAxisAlignment]
        }
      },
      children: builtChildren
    });
  }
}

// Usage
Column({
  mainAxisAlignment: MainAxisAlignment.center,
  crossAxisAlignment: CrossAxisAlignment.stretch,
  children: [
    Text('Title'),
    SizedBox({ height: 16 }),
    Text('Content')
  ]
})
```

---

## 🎯 Summary

| Aspect | Role | Example |
|--------|------|---------|
| **Material Properties** | User-facing configuration | `mainAxisAlignment: MainAxisAlignment.center` |
| **Enum Mapping** | Convert to CSS classes | `[MainAxisAlignment.center]: 'fjs-main-center'` |
| **Style Conversion** | Objects to CSS strings | `borderRadius.toCSSObject()` |
| **VNode Creation** | Return clean DOM structure | `new VNode({ tag: 'div', props: {...} })` |
| **State Management** | Optional - only if needed | `StatefulWidget` + `setState()` |
| **Event Handlers** | Callbacks on user action | `events: { click: this.onPressed }` |
| **Theme Access** | Get colors/styles from context | `context.getInheritedWidgetOfExactType(ThemeData)` |

---

## 📚 Next Steps

1. Implement Section 1 (Basic Layout) first
2. Then build Section 2 (Flex Layout)
3. Move up gradually through sections
4. Test each section before moving to next
5. Follow build order strictly to avoid circular dependencies

Happy building! 🚀