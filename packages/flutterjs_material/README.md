# @flutterjs/material

Flutter Material Design widget runtime for FlutterJS — 477 exported symbols compiled to ES modules, rendering to real DOM elements.

## Installation

```yaml
# pubspec.yaml
dependencies:
  flutterjs_material: ^0.1.0
```

```bash
flutterjs get
```

Or via npm (JS runtime only):

```bash
npm install @flutterjs/material
```

## Available Widgets

### Layout
| Widget | DOM output | Notes |
|--------|-----------|-------|
| `Column` | `<div style="flex-direction:column">` | `crossAxisAlignment`, `mainAxisAlignment` |
| `Row` | `<div style="flex-direction:row">` | `crossAxisAlignment`, `mainAxisAlignment` |
| `Container` | `<div>` | `padding`, `margin`, `decoration`, `constraints` |
| `SizedBox` | `<div>` | fixed `width` / `height` |
| `Padding` | `<div>` | `EdgeInsets` padding |
| `Expanded` | `<div style="flex:1">` | fills available space in Row/Column |
| `Flexible` | `<div>` | `flex` factor |
| `Stack` | `<div style="position:relative">` | absolute child positioning |
| `Wrap` | `<div style="flex-wrap:wrap">` | — |
| `Center` | `<div style="align-items/justify-content:center">` | — |
| `Align` | `<div>` | `Alignment` constant |
| `SingleChildScrollView` | `<div style="overflow:auto">` | — |

### Text & Icons
| Widget | DOM output | Notes |
|--------|-----------|-------|
| `Text` | `<p>` or `<span>` | `TextStyle`, `maxLines`, `overflow` |
| `Icon` | `<span class="material-icons">` | `Icons.*` constants, `size`, `color` |
| `RichText` | `<p>` | `TextSpan` tree |

### Buttons
| Widget | DOM output | Notes |
|--------|-----------|-------|
| `ElevatedButton` | `<button>` | `onPressed`, `style`, `child` |
| `TextButton` | `<button>` | flat style |
| `OutlinedButton` | `<button>` | border style |
| `FilledButton` | `<button>` | filled tonal style |
| `IconButton` | `<button>` | icon-only |
| `FloatingActionButton` | `<button>` | `mini`, `extended` variants |

### Form & Input
| Widget | DOM output | Notes |
|--------|-----------|-------|
| `TextField` | `<input>` or `<textarea>` | `onChanged`, `decoration`, `maxLines`, `obscureText`, `controller` |
| `TextFormField` | `<input>` | `validator`, `onSaved` |
| `Checkbox` | `<input type="checkbox">` | `tristate`, `onChanged` |
| `Radio` | `<input type="radio">` | grouped by `groupValue` |
| `Switch` | `<div>` (custom) | animated thumb/track |
| `Slider` | `<input type="range">` | `min`, `max`, `divisions` |
| `DropdownButton` | `<select>` | `items`, `onChanged` |

### Scaffold & Navigation
| Widget | DOM output | Notes |
|--------|-----------|-------|
| `Scaffold` | `<div>` | `appBar`, `body`, `floatingActionButton`, `drawer` |
| `AppBar` | `<header>` | `title`, `actions`, `leading`, `backgroundColor` |
| `BottomNavigationBar` | `<nav>` | `items`, `currentIndex`, `onTap` |
| `NavigationBar` | `<nav>` | Material 3 bottom nav |
| `Drawer` | `<div>` overlay | `child` |
| `TabBar` + `TabBarView` | `<div>` | `tabs`, `controller` |

### Cards & Lists
| Widget | DOM output | Notes |
|--------|-----------|-------|
| `Card` | `<div>` | `elevation`, `shape`, `color` |
| `ListTile` | `<div>` | `title`, `subtitle`, `leading`, `trailing`, `onTap` |
| `ListView` | `<div style="overflow:auto">` | `.builder`, `.separated` constructors |
| `GridView` | `<div style="display:grid">` | `crossAxisCount`, `builder` |
| `Divider` | `<hr>` | `color`, `thickness`, `indent` |
| `ListBody` | `<div>` | linear list of children |

### Dialogs & Overlays
| Widget | DOM output | Notes |
|--------|-----------|-------|
| `AlertDialog` | `<dialog>` overlay | `title`, `content`, `actions` |
| `SimpleDialog` | `<dialog>` overlay | `children` list |
| `SnackBar` | `<div>` fixed bottom | `content`, `action`, `duration` |
| `BottomSheet` | `<div>` fixed bottom | `builder` |
| `Tooltip` | `<div>` hover overlay | `message` |

### Progress & Loading
| Widget | DOM output | Notes |
|--------|-----------|-------|
| `CircularProgressIndicator` | SVG | `value`, `color`, indeterminate animation |
| `LinearProgressIndicator` | `<div>` | `value`, `color` |
| `RefreshIndicator` | wrapper | `onRefresh` |

### Chips & Badges
| Widget | DOM output | Notes |
|--------|-----------|-------|
| `Chip` | `<div>` | `label`, `avatar`, `onDeleted` |
| `ActionChip` | `<div>` | `onPressed` |
| `FilterChip` | `<div>` | `selected`, `onSelected` |
| `Badge` | `<div>` | `count`, `label` |

### Other
| Widget | Notes |
|--------|-------|
| `InkWell` | Tap ripple wrapper, `onTap`, `onDoubleTap`, `onLongPress` |
| `GestureDetector` | All gesture callbacks |
| `AnimatedContainer` | Animated property transitions |
| `Spacer` | Fills remaining space in Row/Column |
| `Visibility` | Show/hide subtree |
| `ExpansionTile` | Expand/collapse panel |
| `DataTable` | `columns`, `rows` |

## TextField — Important Notes

**Always use `onChanged`** (Flutter standard), not `onChange`:

```dart
TextField(
  onChanged: (value) => setState(() => _text = value),  // ✅ correct
  decoration: InputDecoration(labelText: 'Name'),
)
```

`onChange` also works (legacy alias), but `onChanged` is preferred.

**For multi-line input**, set `maxLines`:

```dart
TextField(
  maxLines: 4,
  decoration: InputDecoration(labelText: 'Message'),
)
```

**For password fields**:

```dart
TextField(
  obscureText: true,
  decoration: InputDecoration(labelText: 'Password'),
)
```

## Bug Fixes (v0.1.x, March 2026)

| Component | Bug | Fix |
|-----------|-----|-----|
| `widget_element.js` — `State.setState()` | Only marked the direct element dirty. Navigator's VNode had no `_element`, so page navigation was silently dropped | Now walks the ancestor element chain and marks the first ancestor with a real DOM reference dirty |
| `utils/color.js` — `Color` constructor | Threw when passed a `MaterialColor` (which extends `Color`) — `new Color(Colors.indigo)` crashed | Added `instanceof Color` identity copy: copies `_value` and `_css` directly |
| `utils/decoration/decoration.js` — `BoxDecoration.toCSSObject()` | Set `style.backgroundColor = this.color` (raw object), browser received `[object Object]` | Now calls `this.color.toCSSString()` before assigning |
| `material/text_field.js` — `TextField` constructor | Only accepted `onChange`; Dart-compiled code always uses `onChanged` (Flutter standard), so all `TextField` callbacks were silently ignored | Accepts both: `this.onChange = onChange \|\| onChanged` |

## Building

```bash
cd packages/flutterjs_material/flutterjs_material
npm install
npm run build    # compiles src/ → dist/
```

## License

MIT
