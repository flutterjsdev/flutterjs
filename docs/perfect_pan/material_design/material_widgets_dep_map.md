# FlutterJS Material Widgets - Dependency Map & Generation Order

## Complete Dependency Hierarchy (Least to Most Imports)

### Level 0: Core Utilities & Base Classes (ZERO dependencies)
These are **pure foundation** - start here!

```
Level 0: No internal dependencies
├── src/core/colors.js                    (Color class, color constants)
├── src/core/enums.js                     (Alignment, BoxFit, FontWeight, etc.)
├── src/widgets/material/animations.css   (CSS animations)
└── src/vnode/style-converter.js          (Static style conversion helpers)
```

### Level 1: Simple Helper Classes (Uses Level 0 only)

```
Level 1: Simple, data-holding classes
├── src/widgets/material/theme-data.js    (Size, Brightness, Orientation)
├── src/widgets/material/box-classes.js   (BoxDecoration, BoxShadow, BorderRadius, BoxConstraints)
├── src/widgets/material/text-style.js    (TextStyle, FontWeight, TextOverflow)
├── src/widgets/material/icon-data.js     (IconData, Icons registry)
├── src/widgets/material/input-decoration.js (InputDecoration, TextEditingController)
├── src/widgets/material/bottom-nav.js    (BottomNavigationBarItem)
└── src/widgets/material/edge-insets.js   (EdgeInsets)
```

### Level 2: Base Widget Classes (Uses Level 0-1)

```
Level 2: Fundamental widgets with styling
├── src/widgets/material/container.js     (Container - uses BoxDecoration, BoxShadow, BorderRadius)
├── src/widgets/material/spacer.js        (Spacer - minimal styling)
├── src/widgets/material/padding.js       (Padding - uses EdgeInsets)
├── src/widgets/material/center.js        (Center - minimal flex)
├── src/widgets/material/align.js         (Align - minimal flex)
├── src/widgets/material/text.js          (Text - uses TextStyle, TextOverflow)
├── src/widgets/material/icon.js          (Icon - uses IconData, color conversion)
├── src/widgets/material/divider.js       (Divider - uses colors)
└── src/widgets/material/image.js         (Image - uses BoxFit)
```

### Level 3: Flex Layout Widgets (Uses Level 0-2)

```
Level 3: Flexbox-based layouts
├── src/widgets/material/flex.js          (Row, Column, Expanded, Flexible)
└── src/widgets/material/stack.js         (Stack, Positioned)
```

### Level 4: Size Constraint Widgets (Uses Level 0-3)

```
Level 4: Size-specific widgets
├── src/widgets/material/sized-box.js     (SizedBox)
└── src/widgets/material/aspect-ratio.js  (AspectRatio)
```

### Level 5: Interactive Base Widgets (Uses Level 0-4, adds event handling)

```
Level 5: Simple interactive widgets
├── src/widgets/material/selection.js     (_CheckboxWidget, _SwitchWidget, _RadioWidget)
├── src/widgets/material/progress.js      (CircularProgressIndicator, LinearProgressIndicator)
└── src/widgets/material/button-base.js   (_ButtonImpl - shared button logic)
```

### Level 6: Button Variants (Uses Level 5)

```
Level 6: Different button styles
├── src/widgets/material/elevated-button.js (ElevatedButton - uses _ButtonImpl)
├── src/widgets/material/text-button.js     (TextButton - uses _ButtonImpl)
└── src/widgets/material/icon-button.js     (IconButton)
```

### Level 7: High-Level Interactive Widgets (Uses Level 0-6)

```
Level 7: Complex interactive widgets
├── src/widgets/material/checkbox.js      (Checkbox - wraps _CheckboxWidget)
├── src/widgets/material/switch.js        (Switch - wraps _SwitchWidget)
├── src/widgets/material/radio.js         (Radio - wraps _RadioWidget)
├── src/widgets/material/text-field.js    (_TextFieldState, TextEditingController)
└── src/widgets/material/slider.js        (Slider - stateful)
```

### Level 8: Display Composite Widgets (Uses Level 0-7)

```
Level 8: Combines multiple widgets
├── src/widgets/material/card.js          (Card - uses Container, BoxDecoration)
├── src/widgets/material/list-tile.js     (ListTile - uses Row, Padding, Icon)
├── src/widgets/material/chip.js          (Chip - uses Container, Row, IconButton, Padding)
├── src/widgets/material/badge.js         (Badge - uses Stack, Container, Positioned, Center)
└── src/widgets/material/rich-text.js     (RichText - uses Text)
```

### Level 9: Theme System (Uses Level 0-8)

```
Level 9: Color schemes and theming
├── src/widgets/material/color-scheme.js  (ColorScheme.light(), ColorScheme.dark())
├── src/widgets/material/text-theme.js    (TextTheme with all styles)
├── src/widgets/material/icon-theme.js    (IconThemeData)
└── src/widgets/material/theme-data.js    (ThemeData - combines all theme elements)
```

### Level 10: Inherited Widgets & Context (Uses Level 9)

```
Level 10: Context providers
├── src/widgets/material/theme.js         (Theme - InheritedWidget)
├── src/widgets/material/media-query.js   (MediaQuery - InheritedWidget)
└── src/widgets/material/media-query-data.js (MediaQueryData)
```

### Level 11: App Structure Widgets (Uses Level 0-10)

```
Level 11: Layout structure
├── src/widgets/material/app-bar.js       (AppBar - uses Container, Row, Padding, Icon)
├── src/widgets/material/drawer.js        (Drawer - uses Container, BoxDecoration)
├── src/widgets/material/floating-action-button.js (_FABWidget, FloatingActionButton)
├── src/widgets/material/bottom-navigation-bar.js (BottomNavigationBar, _BottomNavItem)
└── src/widgets/material/bottom-sheet.js  (BottomSheet)
```

### Level 12: Overlay & Dialog Widgets (Uses Level 0-11)

```
Level 12: Dialogs and overlays
├── src/widgets/material/dialog.js        (AlertDialog - uses Container, Column, Padding)
├── src/widgets/material/snack-bar.js     (SnackBar - uses Container, Row, Padding)
├── src/widgets/material/drawer-header.js (DrawerHeader)
└── src/widgets/material/modal-barrier.js (ModalBarrier)
```

### Level 13: Tab Widgets (Uses Level 0-12)

```
Level 13: Tabbed interfaces
├── src/widgets/material/tab.js           (Tab)
├── src/widgets/material/tab-bar.js       (TabBar - uses Row, Tab)
└── src/widgets/material/tab-bar-view.js  (TabBarView)
```

### Level 14: Main Application Widget (Uses Level 0-13)

```
Level 14: Application root
└── src/widgets/material/material-app.js  (MaterialApp - uses Theme, MediaQuery, home)
```

---

## Code Generation Order - BUILD THIS WAY!

### PHASE 1: Foundation (Level 0) - START HERE!
**0 dependencies - pure data and utilities**

```
Day 1 - Morning:
1. src/core/colors.js
   - Color class
   - Color.withOpacity()
   - color.toHex(), color.toCss()
   - Colors constant object (Colors.red, Colors.blue, etc.)

2. src/core/enums.js
   - Alignment enum
   - BoxFit enum
   - FontWeight enum
   - TextAlign enum
   - MainAxisAlignment enum
   - CrossAxisAlignment enum
   - MainAxisSize enum
   - TextOverflow enum
   - FlexFit enum

3. src/widgets/material/animations.css
   - @keyframes fjs-spin
   - @keyframes fjs-linear-progress
   - @keyframes fjs-ripple
   - @keyframes fjs-fade-in
   - @keyframes fjs-slide-up
   - Hover effect classes
   - Focus states
```

**Duration:** 1-2 hours
**Output:** 3 files, ~400 lines of code

---

### PHASE 2: Helper Data Classes (Level 1)
**Uses only Level 0 - no widget logic**

```
Day 1 - Afternoon:
4. src/widgets/material/box-classes.js
   - BoxDecoration class
   - BoxShadow class
   - BorderRadius class
   - BoxConstraints class
   - Border class

5. src/widgets/material/text-style.js
   - TextStyle class (fontSize, fontWeight, color, etc.)
   - TextOverflow enum
   - TextAlign enum
   - TextDecoration enum

6. src/widgets/material/edge-insets.js
   - EdgeInsets class
   - EdgeInsets.all()
   - EdgeInsets.symmetric()
   - EdgeInsets.only()
   - EdgeInsets.fromLTRB()

7. src/widgets/material/icon-data.js
   - IconData class
   - Icons registry (Icons.add, Icons.close, Icons.check, etc.)

8. src/widgets/material/input-decoration.js
   - InputDecoration class
   - TextEditingController class

9. src/widgets/material/bottom-nav.js
   - BottomNavigationBarItem class

Day 2 - Morning:
10. src/vnode/style-converter.js
    - StyleConverter.colorToCss()
    - StyleConverter.edgeInsetsToPadding()
    - StyleConverter.borderRadiusToCss()
    - StyleConverter.boxShadowToCss()
    - StyleConverter.textStyleToCss()
```

**Duration:** 2-3 hours
**Output:** 7 files, ~600 lines

---

### PHASE 3: Basic Display Widgets (Level 2)
**Uses Level 0-1 - no complex layout or interaction**

```
Day 2 - Afternoon:
11. src/widgets/material/spacer.js
    - Spacer class

12. src/widgets/material/text.js
    - Text widget
    - TextStyle support

13. src/widgets/material/icon.js
    - Icon widget
    - SVG path rendering
    - Icon color application

14. src/widgets/material/image.js
    - Image class
    - Image.network()
    - Image.asset()
    - BoxFit conversion

15. src/widgets/material/divider.js
    - Divider class
    - VerticalDivider class

Day 3 - Morning:
16. src/widgets/material/container.js
    - Container class (COMPLEX - all decoration features)
    - BoxDecoration application
    - Transform handling
    - Alignment conversion

17. src/widgets/material/padding.js
    - Padding class

18. src/widgets/material/center.js
    - Center class

19. src/widgets/material/align.js
    - Align class
```

**Duration:** 4-5 hours
**Output:** 9 files, ~1200 lines

---

### PHASE 4: Flex & Layout System (Level 3)
**Uses Level 0-2 - flexbox foundation**

```
Day 3 - Afternoon:
20. src/widgets/material/flex.js
    - Row class
    - Column class
    - Expanded class
    - Flexible class
    - MainAxisAlignment enum
    - CrossAxisAlignment enum
    - MainAxisSize enum

21. src/widgets/material/stack.js
    - Stack class
    - Positioned class
    - Alignment mapping for positioning
```

**Duration:** 2-3 hours
**Output:** 2 files, ~400 lines

---

### PHASE 5: Size Constraint Widgets (Level 4)
**Uses Level 3 - wraps flex**

```
Day 3 - Evening:
22. src/widgets/material/sized-box.js
    - SizedBox class

23. src/widgets/material/aspect-ratio.js
    - AspectRatio class
```

**Duration:** 1 hour
**Output:** 2 files, ~150 lines

---

### PHASE 6: Simple Interactive Widgets (Level 5)
**Uses Level 4 - adds event handling, no state**

```
Day 4 - Morning:
24. src/widgets/material/progress.js
    - CircularProgressIndicator (determinate + indeterminate)
    - LinearProgressIndicator (determinate + indeterminate)
    - Animation references (CSS)

25. src/widgets/material/selection.js
    - _CheckboxWidget
    - _SwitchWidget (with animated thumb)
    - _RadioWidget

26. src/widgets/material/button-base.js
    - Shared button implementation
    - Elevation shadow logic
    - Hover states
```

**Duration:** 3 hours
**Output:** 3 files, ~600 lines

---

### PHASE 7: Button Widgets (Level 6)
**Uses Level 5 - button variants**

```
Day 4 - Afternoon:
27. src/widgets/material/elevated-button.js
    - ElevatedButton class
    - Elevation and shadow

28. src/widgets/material/text-button.js
    - TextButton class
    - Transparent background variant

29. src/widgets/material/icon-button.js
    - IconButton class
```

**Duration:** 2 hours
**Output:** 3 files, ~300 lines

---

### PHASE 8: Stateful Interactive Widgets (Level 7)
**Uses Level 6 - adds StatefulWidget wrappers**

```
Day 4 - Evening:
30. src/widgets/material/checkbox.js
    - Checkbox class (StatelessWidget wrapper)

31. src/widgets/material/switch.js
    - Switch class (StatelessWidget wrapper)

32. src/widgets/material/radio.js
    - Radio class (StatelessWidget wrapper)

Day 5 - Morning:
33. src/widgets/material/text-field.js
    - TextField class (StatefulWidget)
    - _TextFieldState
    - _TextFieldInput (low-level)
    - Focus and blur handling
    - Multiple input types

34. src/widgets/material/slider.js
    - Slider class (StatefulWidget)
    - _SliderState
    - Range detection and visualization
```

**Duration:** 4 hours
**Output:** 5 files, ~900 lines

---

### PHASE 9: Composite Display Widgets (Level 8)
**Uses Level 7 - combines multiple widgets**

```
Day 5 - Afternoon:
35. src/widgets/material/card.js
    - Card class

36. src/widgets/material/list-tile.js
    - ListTile class
    - _ListTileWidget

37. src/widgets/material/chip.js
    - Chip class

38. src/widgets/material/badge.js
    - Badge class
    - Uses Stack/Positioned

Day 6 - Morning:
39. src/widgets/material/rich-text.js
    - RichText class
    - TextSpan class
```

**Duration:** 3 hours
**Output:** 5 files, ~600 lines

---

### PHASE 10: Theme System (Level 9)
**Uses Level 8 - but independent color/text definitions**

```
Day 6 - Afternoon:
40. src/widgets/material/color-scheme.js
    - ColorScheme class
    - ColorScheme.light()
    - ColorScheme.dark()
    - All 30+ color properties

41. src/widgets/material/text-theme.js
    - TextTheme class
    - Type scale definitions (display, headline, title, body, label)

42. src/widgets/material/icon-theme.js
    - IconThemeData class

43. src/widgets/material/theme-data.js
    - ThemeData class
    - ThemeData.light()
    - ThemeData.dark()
```

**Duration:** 2 hours
**Output:** 4 files, ~400 lines

---

### PHASE 11: Context & Inheritance (Level 10)
**Uses Level 9 - provides theme to widgets**

```
Day 6 - Evening:
44. src/widgets/material/theme.js
    - Theme (InheritedWidget)
    - Theme.of(context)

45. src/widgets/material/media-query-data.js
    - MediaQueryData class

46. src/widgets/material/media-query.js
    - MediaQuery (InheritedWidget)
    - MediaQuery.of(context)
```

**Duration:** 1.5 hours
**Output:** 3 files, ~250 lines

---

### PHASE 12: App Structure Widgets (Level 11)
**Uses Level 10 - app layout and navigation**

```
Day 7 - Morning:
47. src/widgets/material/app-bar.js
    - AppBar class
    - Title, actions, leading support

48. src/widgets/material/floating-action-button.js
    - FloatingActionButton class
    - _FABWidget
    - Elevation and positioning

49. src/widgets/material/drawer.js
    - Drawer class

50. src/widgets/material/bottom-navigation-bar.js
    - BottomNavigationBar (StatefulWidget)
    - _BottomNavigationBarState
    - _BottomNavItem
    - Animated indicator

Day 7 - Afternoon:
51. src/widgets/material/scaffold.js
    - Scaffold class (complex - combines all pieces)
    - AppBar placement
    - FAB positioning
    - Drawer overlay
    - Body with Expanded

52. src/widgets/material/bottom-sheet.js
    - BottomSheet class

53. src/widgets/material/drawer-header.js
    - DrawerHeader class
```

**Duration:** 4 hours
**Output:** 7 files, ~1000 lines

---

### PHASE 13: Dialog & Overlay (Level 12)
**Uses Level 11 - overlay widgets**

```
Day 7 - Evening:
54. src/widgets/material/dialog.js
    - AlertDialog class
    - Dialog.show() static method

55. src/widgets/material/snack-bar.js
    - SnackBar class
    - SnackBar.show() static method

56. src/widgets/material/modal-barrier.js
    - ModalBarrier class
```

**Duration:** 2 hours
**Output:** 3 files, ~400 lines

---

### PHASE 14: Tab Widgets (Level 13)
**Uses Level 12 - tabbed interface**

```
Day 8 - Morning:
57. src/widgets/material/tab.js
    - Tab class

58. src/widgets/material/tab-bar.js
    - TabBar (StatefulWidget)
    - _TabBarState
    - Indicator animation

59. src/widgets/material/tab-bar-view.js
    - TabBarView class
```

**Duration:** 2.5 hours
**Output:** 3 files, ~500 lines

---

### PHASE 15: Application Root (Level 14)
**Uses Level 13 - brings it all together**

```
Day 8 - Afternoon:
60. src/widgets/material/material-app.js
    - MaterialApp class
    - Theme provider setup
    - MediaQuery setup
    - Route handling
```

**Duration:** 1.5 hours
**Output:** 1 file, ~250 lines

---

## Visual Dependency Tree

```
PHASE 1 (Foundation)
├─ colors.js
├─ enums.js
└─ animations.css

        ↓

PHASE 2 (Helper Classes)
├─ box-classes.js (uses Level 0)
├─ text-style.js
├─ edge-insets.js
├─ icon-data.js
├─ input-decoration.js
├─ bottom-nav.js
└─ style-converter.js

        ↓

PHASE 3 (Basic Display)
├─ spacer.js
├─ text.js (uses TextStyle)
├─ icon.js (uses IconData)
├─ image.js (uses BoxFit)
├─ divider.js
├─ container.js (uses BoxDecoration, BoxShadow, EdgeInsets)
├─ padding.js (uses EdgeInsets)
├─ center.js
└─ align.js

        ↓

PHASE 4 (Flex Layout)
├─ flex.js (Row, Column)
└─ stack.js (Stack, Positioned)

        ↓

PHASE 5 (Size)
├─ sized-box.js
└─ aspect-ratio.js

        ↓

PHASE 6 (Interactive Base)
├─ progress.js
├─ selection.js
└─ button-base.js

        ↓

PHASE 7 (Buttons)
├─ elevated-button.js
├─ text-button.js
└─ icon-button.js

        ↓

PHASE 8 (Interactive Stateful)
├─ checkbox.js
├─ switch.js
├─ radio.js
├─ text-field.js
└─ slider.js

        ↓

PHASE 9 (Composite Display)
├─ card.js
├─ list-tile.js
├─ chip.js
├─ badge.js
└─ rich-text.js

        ↓

PHASE 10 (Theme)
├─ color-scheme.js
├─ text-theme.js
├─ icon-theme.js
└─ theme-data.js

        ↓

PHASE 11 (Context)
├─ theme.js
├─ media-query-data.js
└─ media-query.js

        ↓

PHASE 12 (App Structure)
├─ app-bar.js
├─ floating-action-button.js
├─ drawer.js
├─ bottom-navigation-bar.js
├─ scaffold.js
├─ bottom-sheet.js
└─ drawer-header.js

        ↓

PHASE 13 (Dialogs)
├─ dialog.js
├─ snack-bar.js
└─ modal-barrier.js

        ↓

PHASE 14 (Tabs)
├─ tab.js
├─ tab-bar.js
└─ tab-bar-view.js

        ↓

PHASE 15 (Application)
└─ material-app.js
```

---

## Timeline Summary

| Phase | Days | Files | Duration | Key Output |
|-------|------|-------|----------|-----------|
| **1** | 1 | 3 | 2 hrs | Colors, enums, CSS |
| **2** | 1-2 | 7 | 3 hrs | Helper classes |
| **3** | 2-3 | 9 | 5 hrs | Basic widgets |
| **4** | 3 | 2 | 3 hrs | Flex layout |
| **5** | 3 | 2 | 1 hr | Size widgets |
| **6** | 4 | 3 | 3 hrs | Interactive base |
| **7** | 4 | 3 | 2 hrs | Button variants |
| **8** | 4-5 | 5 | 4 hrs | Stateful input |
| **9** | 5-6 | 5 | 3 hrs | Composite display |
| **10** | 6 | 4 | 2 hrs | Theme system |
| **11** | 6-7 | 3 | 1.5 hrs | Context providers |
| **12** | 7 | 7 | 4 hrs | App structure |
| **13** | 7-8 | 3 | 2 hrs | Dialogs |
| **14** | 8 | 3 | 2.5 hrs | Tabs |
| **15** | 8 | 1 | 1.5 hrs | Application root |
| **TOTAL** | 8 Days | 60 Files | ~40 Hours | Complete widget library |

---

## Implementation Checklist

### PHASE 1: Foundation ✓
- [ ] src/core/colors.js
- [ ] src/core/enums.js
- [ ] src/widgets/material/animations.css

### PHASE 2: Helper Classes ✓
- [ ] src/widgets/material/box-classes.js
- [ ] src/widgets/material/text-style.js
- [ ] src/widgets/material/edge-insets.js
- [ ] src/widgets/material/icon-data.js
- [ ] src/widgets/material/input-decoration.js
- [ ] src/widgets/material/bottom-nav.js
- [ ] src/vnode/style-converter.js

### PHASE 3: Basic Display ✓
- [ ] src/widgets/material/spacer.js
- [ ] src/widgets/material/text.js
- [ ] src/widgets/material/icon.js
- [ ] src/widgets/material/image.js
- [ ] src/widgets/material/divider.js
- [ ] src/widgets/material/container.js
- [ ] src/widgets/material/padding.js
- [ ] src/widgets/material/center.js
- [ ] src/widgets/material/align.js

### PHASE 4: Flex Layout ✓
- [ ] src/widgets/material/flex.js
- [ ] src/widgets/material/stack.js

### PHASE 5: Size ✓
- [ ] src/widgets/material/sized-box.js
- [ ] src/widgets/material/aspect-ratio.js

### PHASE 6: Interactive Base ✓
- [ ] src/widgets/material/progress.js
- [ ] src/widgets/material/selection.js
- [ ] src/widgets/material/button-base.js

### PHASE 7: Buttons ✓
- [ ] src/widgets/material/elevated-button.js
- [ ] src/widgets/material/text-button.js
- [ ] src/widgets/material/icon-button.js

### PHASE 8: Interactive Stateful ✓
- [ ] src/widgets/material/checkbox.js
- [ ] src/widgets/material/switch.js
- [ ] src/widgets/material/radio.js
- [ ] src/widgets/material/text-field.js
- [ ] src/widgets/material/slider.js

### PHASE 9: Composite Display ✓
- [ ] src/widgets/material/card.js
- [ ] src/widgets/material/list-tile.js
- [ ] src/widgets/material/chip.js
- [ ] src/widgets/material/badge.js
- [ ] src/widgets/material/rich-text.js

### PHASE 10: Theme ✓
- [ ] src/widgets/material/color-scheme.js
- [ ] src/widgets/material/text-theme.js
- [ ] src/widgets/material/icon-theme.js
- [ ] src/widgets/material/theme-data.js

### PHASE 11: Context ✓
- [ ] src/widgets/material/theme.js
- [ ] src/widgets/material/media-query-data.js
- [ ] src/widgets/material/media-query.js

### PHASE 12: App Structure ✓
- [ ] src/widgets/material/app-bar.js
- [ ] src/widgets/material/floating-action-button.js
- [ ] src/widgets/material/drawer.js
- [ ] src/widgets/material/bottom-navigation-bar.js
- [ ] src/widgets/material/scaffold.js
- [ ] src/widgets/material/bottom-sheet.js
- [ ] src/widgets/material/drawer-header.js

### PHASE 13: Dialogs ✓
- [ ] src/widgets/material/dialog.js
- [ ] src/widgets/material/snack-bar.js
- [ ] src/widgets/material/modal-barrier.js

### PHASE 14: Tabs ✓
- [ ] src/widgets/material/tab.js
- [ ] src/widgets/material/tab-bar.js
- [ ] src/widgets/material/tab-bar-view.js

### PHASE 15: Application ✓
- [ ] src/widgets/material/material-app.js

---

## Key Dependencies to Remember

**Container depends on:**
- BoxDecoration, BoxShadow, BorderRadius (Level 1)
- Alignment conversion logic

**Scaffold depends on:**
- AppBar (Level 11)
- Column, Expanded (Level 4)
- Stack, Positioned (Level 4)
- FloatingActionButton (Level 11)
- Drawer (Level 12)

**TextField depends on:**
- Container, Column, Row, Padding (Level 2-4)
- Icon (Level 2)
- InputDecoration, TextEditingController (Level 1)

**BottomNavigationBar depends on:**
- Row (Level 4)
- Icon (Level 2)
- Text (Level 2)

**Theme system depends on:**
- ColorScheme, TextTheme, IconThemeData (Level 9)
- Must be complete before widgets can use them

---

## Next Steps

1. **Start with PHASE 1** - Takes ~2 hours
2. **Then PHASE 2** - Data classes, no UI logic
3. **Progress through phases** - Each builds on previous
4. **Don't skip ahead** - Dependency order is critical
5. **Test as you go** - Unit tests for each file