# FlutterJS Widget Status Map

> **Status Tracking**
> Last Updated: 2026-01-10
> Package: `@flutterjs/material`

## 🟢 Implemented Widgets

### 🧱 Core Layout & Painting
| Widget | Status | Details |
| :--- | :--- | :--- |
| **`Container`** | ✅ **High** | Supports `alignment`, `padding`, `color`, `decoration` (BoxDecoration with borders, shadows, gradients, images), `foregroundDecoration`, `constraints`, `margin`, `transform`. |
| **`Padding`** | ✅ **Full** | Standard implementation. |
| **`SizedBox`** | ✅ **Full** | Supports `width`, `height`, `expand`, `shrink`. |
| **`Center`** | ✅ **Full** | Centers child within parent. |
| **`Align`** | ✅ **Full** | Alignment support (topLeft, center, etc.). |
| **`Row` / `Column`** | ✅ **High** | Built on `Flex`. Supports `mainAxisAlignment`, `crossAxisAlignment`, `mainAxisSize`. |
| **`Stack`** | ✅ **High** | Supports `alignment`, `fit`, `clipBehavior`. |
| **`Positioned`** | ✅ **Full** | Top/Right/Bottom/Left constraints for Stack children. |
| **`Expanded` / `Flexible`**| ✅ **Full** | Flex factors for Row/Column. |
| **`Transform`** | ✅ **High** | Matrix4 transformations. |
| **`Opacity`** | ✅ **Full** | Layer opacity. |
| **`Clip` Widgets** | ✅ **High** | `ClipRect`, `ClipRRect`, `ClipOval`, `ClipPath` supported. |

### 🅰️ Typography
| Widget | Status | Details |
| :--- | :--- | :--- |
| **`Text`** | ✅ **High** | Supports `style` (TextStyle), `textAlign`, `overflow`, `maxLines`, `selectable` (standard & web-selection), `semanticsLabel`. |
| **`TextStyle`** | ✅ **High** | Comprehensive support including **Google Fonts** auto-loading, shadows, decoration, spacing, gradients. |
| **`RichText`** | ⚠️ **Partial**| Basic span support exists. |

### 📱 App Structure
| Widget | Status | Details |
| :--- | :--- | :--- |
| **`MaterialApp`** | ✅ **High** | Routing, Theme injection, Navigator setup. |
| **`Scaffold`** | ✅ **High** | `appBar`, `body`, `floatingActionButton` (locations), `drawer`, `endDrawer`, `bottomNavigationBar`, `snackBar` (with auto-dismiss/action). |
| **`AppBar`** | 🟡 **Med** | Basic title, minimal leading/actions support. Needs expansion. |
| **`Navigator`** | ✅ **High** | Push/Pop, replacement, history management. |

### 👆 Interaction & Feedback
| Widget | Status | Details |
| :--- | :--- | :--- |
| **`GestureDetector`** | ✅ **High** | Tap, press, hover events mapped to DOM events. |
| **`ElevatedButton`** | 🟡 **Med** | Basic styling and `onPressed`. |
| **`FloatingActionButton`**| ✅ **High** | Standard FAB with elevation and positioning support in Scaffold. |
| **`SnackBar`** | ✅ **High** | Integrated into ScaffoldState. |

### 🎨 Visuals
| Widget | Status | Details |
| :--- | :--- | :--- |
| **`Icon`** | ✅ **High** | Material Icons font integration. |
| **`Image`** | ✅ **High** | Network & Asset images. |
| **`Card`** | ✅ **High** | Elevation, rounded corners. |
| **`Divider`** | ✅ **Full** | Horizontal line with styling. |

---

## 🔴 Missing (Planned)

### Input & Forms (High Priority)
- [ ] **`TextField`**: Essential for user input.
- [ ] **`TextFormField`**: Form validation integration.
- [ ] **`Form`**: State management for fields.
- [ ] **`Checkbox`**, **`Radio`**, **`Switch`**: Selection controls.

### Lists & Scrolling (High Priority)
- [ ] **`ListView`**: Efficient scrolling lists (virtualization needed for web?).
- [ ] **`GridView`**: 2D scrollable areas.
- [ ] **`SingleChildScrollView`**: Basic scrolling.
- [ ] **`Scrollbar`**: Visual scroll indicator.

### Additional Buttons
- [ ] **`TextButton`**
- [ ] **`OutlinedButton`**
- [ ] **`IconButton`**

### Navigation Components
- [ ] **`Drawer`**: Widget wrapper (logic exists in Scaffold).
- [ ] **`BottomNavigationBar`**: Full widget implementation.
- [ ] **`TabBar`** / **`TabBarView`**: Tabbed interfaces.

### Dialogs & Overlays
- [ ] **`Dialog`** / **`AlertDialog`**
- [ ] **`BottomSheet`** / **`ModalBottomSheet`**
- [ ] **`PopupMenuButton`**

---

## 🏗️ Refactoring Opportunities
1.  **File Naming**: Fix typos (`compoment` -> `component`, `scffold_basic` -> `scaffold`).
2.  **Organization**: Move `AppBar` and `SnackBar` to dedicated files (currently in `scffold_basic.js`).
3.  **Exports**: Ensure all widgets are cleanly exported from `index.js`.
