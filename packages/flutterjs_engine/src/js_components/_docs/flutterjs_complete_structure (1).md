# FlutterJS - Bottom-to-Top Hierarchy Structure

Building blocks from primitive → utilities → components → complex widgets.

## 🏗️ Bottom-to-Top Project Structure

```
flutterjs-framework/
│
├── src/
│   ├── core/                          ← FOUNDATION LAYER
│   │   ├── widget.js                  ← Base Widget class
│   │   ├── stateless-widget.js        ← Stateless base
│   │   ├── stateful-widget.js         ← Stateful base
│   │   ├── state.js                   ← State management
│   │   ├── build-context.js           ← Build context
│   │   └── index.js
│   │
│   ├── vdom/                          ← VIRTUAL DOM LAYER
│   │   ├── vnode.js                   ← Virtual node
│   │   ├── renderer.js                ← DOM renderer
│   │   ├── element-pool.js            ← Element pooling
│   │   └── index.js
│   │
│   ├── constants/                     ← CONSTANTS LAYER
│   │   ├── colors.constants.js        ← Color hex values
│   │   ├── sizes.constants.js         ← Size values (px)
│   │   ├── typography.constants.js    ← Font sizes, weights
│   │   ├── durations.constants.js     ← Animation durations
│   │   ├── curves.constants.js        ← Easing functions
│   │   └── index.js
│   │
│   ├── utils/                         ← UTILITY LAYER (Pure JS Classes)
│   │   ├── duration.js                ← Duration class
│   │   ├── offset.js                  ← x,y offset
│   │   ├── size.js                    ← width, height
│   │   ├── text-style.js              ← Font properties
│   │   ├── edge-insets.js             ← Padding/margin object
│   │   ├── alignment.js               ← Alignment enum
│   │   ├── axis.js                    ← Axis enum
│   │   ├── main-axis-alignment.js     ← MainAxisAlignment enum
│   │   ├── cross-axis-alignment.js    ← CrossAxisAlignment enum
│   │   ├── text-align.js              ← TextAlign enum
│   │   ├── text-overflow.js           ← TextOverflow enum
│   │   ├── clip.js                    ← Clip enum
│   │   ├── box-fit.js                 ← BoxFit enum
│   │   ├── border-style.js            ← BorderStyle enum
│   │   ├── font-weight.js             ← FontWeight enum
│   │   ├── input-decoration.js        ← Input styling config
│   │   └── index.js
│   │
│   ├── styles/                        ← CSS LAYER
│   │   ├── variables.css              ← CSS custom properties
│   │   ├── base.css                   ← Global resets
│   │   ├── typography.css             ← Font definitions
│   │   ├── colors.css                 ← Color definitions
│   │   ├── tokens.css                 ← Design tokens
│   │   └── index.css                  ← Import all
│   │
│   ├── decoration/                    ← DECORATION LAYER
│   │   ├── border.js                  ← Border styling
│   │   ├── border-radius.js           ← Rounded corners
│   │   ├── box-shadow.js              ← Shadow effects
│   │   ├── gradient.js                ← Gradient fill
│   │   ├── box-decoration.js          ← Complete decoration
│   │   └── index.js
│   │
│   ├── text/                          ← TEXT LAYER
│   │   ├── text-span.js               ← Single text span
│   │   ├── rich-text.js               ← Multiple spans
│   │   ├── text.js                    ← Simple text widget
│   │   └── index.js
│   │
│   ├── theme/                         ← THEME LAYER
│   │   ├── colors.js                  ← Color scheme
│   │   ├── typography.js              ← Text theme
│   │   ├── text-theme.js              ← Text styles
│   │   ├── color-scheme.js            ← Color palette
│   │   ├── button-theme.js            ← Button styling
│   │   ├── card-theme.js              ← Card styling
│   │   ├── input-decoration-theme.js  ← Input styling
│   │   ├── list-tile-theme.js         ← List styling
│   │   ├── progress-indicator-theme.js ← Progress styling
│   │   ├── slider-theme.js            ← Slider styling
│   │   ├── switch-theme.js            ← Switch styling
│   │   ├── radio-theme.js             ← Radio styling
│   │   ├── checkbox-theme.js          ← Checkbox styling
│   │   ├── snack-bar-theme.js         ← SnackBar styling
│   │   ├── badge-theme.js             ← Badge styling
│   │   ├── card-theme.js              ← Card styling
│   │   ├── theme-data.js              ← Main theme
│   │   └── index.js
│   │
│   ├── state/                         ← STATE MANAGEMENT LAYER
│   │   ├── change-notifier.js         ← Observable
│   │   ├── value-notifier.js          ← Value observable
│   │   ├── inherited-widget.js        ← Inherited context
│   │   ├── state-provider.js          ← State provider
│   │   └── index.js
│   │
│   ├── animation/                     ← ANIMATION LAYER
│   │   ├── curves.js                  ← Easing curves
│   │   ├── interval.js                ← Time interval
│   │   ├── tween.js                   ← Value tween
│   │   ├── animation.js               ← Base animation
│   │   ├── animation-controller.js    ← Animation control
│   │   ├── animated-widget.js         ← Animated base
│   │   ├── tween-animation-builder.js ← Tween builder
│   │   ├── animated-builder.js        ← Animation builder
│   │   ├── slide-transition.js        ← Slide effect
│   │   ├── scale-transition.js        ← Scale effect
│   │   ├── fade-transition.js         ← Fade effect
│   │   ├── rotate-transition.js       ← Rotate effect
│   │   ├── size-transition.js         ← Size effect
│   │   └── index.js
│   │
│   ├── forms/                         ← FORM UTILITIES LAYER
│   │   ├── form-validator.js          ← Validators
│   │   ├── text-editing-controller.js ← Text control
│   │   ├── focus-node.js              ← Focus manager
│   │   └── index.js
│   │
│   ├── gestures/                      ← GESTURE LAYER
│   │   ├── tap-detector.js            ← Tap events
│   │   ├── long-press-detector.js     ← Long press
│   │   ├── drag-detector.js           ← Drag events
│   │   ├── gesture-detector.js        ← Multi-gesture
│   │   └── index.js
│   │
│   ├── widgets/                       ← WIDGET LAYER (Complex)
│   │   ├── index.js
│   │   ├── _internal/
│   │   │   ├── widget-base.js
│   │   │   ├── theme-helper.js
│   │   │   ├── style-helper.js
│   │   │   ├── animation-helper.js
│   │   │   └── validation-helper.js
│   │   │
│   │   ├── layout/                    ← BASIC LAYOUT
│   │   │   ├── center.js              ← Center child
│   │   │   ├── padding.js             ← Add padding
│   │   │   ├── sized-box.js           ← Fixed size
│   │   │   └── index.js
│   │   │
│   │   ├── container/                 ← CONTAINER LAYER
│   │   │   ├── container.js           ← Decoration + layout
│   │   │   └── index.js
│   │   │
│   │   ├── layout-advanced/           ← ADVANCED LAYOUT
│   │   │   ├── column.js              ← Vertical
│   │   │   ├── row.js                 ← Horizontal
│   │   │   ├── flex.js                ← Flex layout
│   │   │   ├── constrained-box.js     ← Constraints
│   │   │   ├── stack.js               ← Layered
│   │   │   ├── positioned.js          ← Position in stack
│   │   │   ├── expanded.js            ← Expand in flex
│   │   │   ├── flexible.js            ← Flexible size
│   │   │   ├── wrap.js                ← Wrap children
│   │   │   ├── aspect-ratio.js        ← Aspect ratio
│   │   │   └── index.js
│   │   │
│   │   ├── feedback/                  ← VISUAL FEEDBACK
│   │   │   ├── ink-well.js            ← Ink ripple
│   │   │   ├── ink-response.js        ← Ink response
│   │   │   ├── tooltip.js             ← Tooltip hover
│   │   │   ├── progress-indicator.js  ← Base progress
│   │   │   ├── circular-progress-indicator.js ← Circular
│   │   │   ├── linear-progress-indicator.js ← Linear
│   │   │   └── index.js
│   │   │
│   │   ├── buttons/                   ← BUTTONS
│   │   │   ├── _button-base.js        ← Base button
│   │   │   ├── elevated-button.js     ← Elevated
│   │   │   ├── filled-button.js       ← Filled
│   │   │   ├── filled-tonal-button.js ← Filled tonal
│   │   │   ├── text-button.js         ← Text button
│   │   │   ├── outlined-button.js     ← Outlined
│   │   │   ├── icon-button.js         ← Icon button
│   │   │   ├── floating-action-button.js ← FAB
│   │   │   ├── back-button.js         ← Back
│   │   │   ├── close-button.js        ← Close
│   │   │   ├── dropdown-button.js     ← Dropdown
│   │   │   ├── popup-menu-button.js   ← Popup menu
│   │   │   └── index.js
│   │   │
│   │   ├── media/                     ← MEDIA
│   │   │   ├── icon.js                ← Icon
│   │   │   ├── image.js               ← Image
│   │   │   ├── network-image.js       ← Network image
│   │   │   ├── circle-avatar.js       ← Avatar
│   │   │   └── index.js
│   │   │
│   │   ├── inputs/                    ← INPUT WIDGETS
│   │   │   ├── _input-base.js         ← Base input
│   │   │   ├── checkbox.js            ← Checkbox
│   │   │   ├── switch.js              ← Toggle switch
│   │   │   ├── radio.js               ← Radio button
│   │   │   ├── slider.js              ← Single slider
│   │   │   ├── range-slider.js        ← Range slider
│   │   │   ├── text-field.js          ← Text input
│   │   │   ├── text-form-field.js     ← Form text
│   │   │   ├── date-picker.js         ← Date picker
│   │   │   ├── time-picker.js         ← Time picker
│   │   │   ├── checkbox-list-tile.js  ← Checkbox tile
│   │   │   ├── switch-list-tile.js    ← Switch tile
│   │   │   ├── radio-list-tile.js     ← Radio tile
│   │   │   ├── form.js                ← Form container
│   │   │   ├── form-field.js          ← Form field
│   │   │   └── index.js
│   │   │
│   │   ├── selection/                 ← SELECTION
│   │   │   ├── chip.js                ← Chip
│   │   │   ├── choice-chip.js         ← Choice
│   │   │   ├── filter-chip.js         ← Filter
│   │   │   ├── input-chip.js          ← Input
│   │   │   ├── action-chip.js         ← Action
│   │   │   ├── segmented-button.js    ← Segmented
│   │   │   └── index.js
│   │   │
│   │   ├── cards/                     ← CARDS
│   │   │   ├── card.js                ← Card
│   │   │   └── index.js
│   │   │
│   │   ├── lists/                     ← LISTS & GRIDS
│   │   │   ├── list-tile.js           ← List item
│   │   │   ├── list-view.js           ← List view
│   │   │   ├── grid-view.js           ← Grid view
│   │   │   ├── reorderable-list.js    ← Draggable
│   │   │   └── index.js
│   │   │
│   │   ├── scrolling/                 ← SCROLLING
│   │   │   ├── scroll-view.js         ← Base scroll
│   │   │   ├── single-child-scroll-view.js ← Single
│   │   │   ├── scrollbar.js           ← Scrollbar UI
│   │   │   └── index.js
│   │   │
│   │   ├── dividers/                  ← DIVIDERS
│   │   │   ├── divider.js             ← Horizontal
│   │   │   ├── vertical-divider.js    ← Vertical
│   │   │   └── index.js
│   │   │
│   │   ├── badges/                    ← BADGES
│   │   │   ├── badge.js               ← Badge
│   │   │   └── index.js
│   │   │
│   │   ├── app-bar/                   ← APP BARS
│   │   │   ├── app-bar.js             ← Top bar
│   │   │   ├── sliver-app-bar.js      ← Sliver bar
│   │   │   ├── search-bar.js          ← Search bar
│   │   │   └── index.js
│   │   │
│   │   ├── navigation/                ← NAVIGATION
│   │   │   ├── bottom-navigation-bar.js ← Bottom nav
│   │   │   ├── navigation-bar.js      ← Material nav
│   │   │   ├── navigation-rail.js     ← Side rail
│   │   │   ├── tab-bar.js             ← Tabs
│   │   │   ├── navigation-drawer.js   ← Drawer nav
│   │   │   └── index.js
│   │   │
│   │   ├── drawer/                    ← DRAWER
│   │   │   ├── drawer.js              ← Drawer container
│   │   │   ├── drawer-header.js       ← Header
│   │   │   ├── drawer-tile.js         ← Item
│   │   │   └── index.js
│   │   │
│   │   ├── dialog/                    ← DIALOGS & MODALS
│   │   │   ├── dialog.js              ← Base dialog
│   │   │   ├── alert-dialog.js        ← Alert
│   │   │   ├── simple-dialog.js       ← Simple
│   │   │   ├── bottom-sheet.js        ← Sheet
│   │   │   ├── modal-bottom-sheet.js  ← Modal sheet
│   │   │   ├── snack-bar.js           ← Snack bar
│   │   │   ├── expansion-panel.js     ← Panel
│   │   │   ├── expansion-panel-list.js ← Panel list
│   │   │   └── index.js
│   │   │
│   │   └── index.js
│   │
│   ├── navigation/                    ← ROUTING LAYER
│   │   ├── route.js                   ← Base route
│   │   ├── material-page-route.js     ← Material route
│   │   ├── page-route.js              ← Page route
│   │   ├── route-generator.js         ← Route gen
│   │   ├── route-observer.js          ← Observer
│   │   ├── navigator.js               ← Navigator
│   │   ├── hero.js                    ← Hero animation
│   │   └── index.js
│   │
│   ├── runtime/                       ← RUNTIME LAYER
│   │   ├── flutter-js.js              ← Main runtime
│   │   ├── run-app.js                 ← App runner
│   │   ├── scheduler.js               ← Frame scheduler
│   │   └── index.js
│   │
│   └── index.js                       ← Root export
│
├── dist/
│   ├── flutter.js
│   ├── flutter.min.js
│   ├── flutter.css
│   └── flutter.min.css
│
├── examples/
│   ├── 00-hello-world/
│   ├── 01-counter/
│   ├── 02-todo-list/
│   ├── 03-form-validation/
│   ├── 04-ecommerce/
│   ├── 05-navigation/
│   ├── 06-animations/
│   ├── 07-theming/
│   └── 08-responsive/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/
│   ├── GETTING-STARTED.md
│   ├── ARCHITECTURE.md
│   ├── WIDGETS.md
│   ├── THEME.md
│   ├── ANIMATION.md
│   ├── FORMS.md
│   ├── NAVIGATION.md
│   └── EXAMPLES.md
│
├── package.json
├── rollup.config.js
├── .eslintrc.js
├── .gitignore
└── README.md
```

---

## 📊 Dependency Hierarchy (Bottom → Top)

```
LEVEL 1: PRIMITIVES
├── constants/           ← Pure values (colors, sizes, durations)
└── styles/              ← CSS variables, base styles

LEVEL 2: UTILITIES
├── utils/               ← Pure JS classes (Duration, Size, Offset, TextStyle, EdgeInsets, Alignment, etc.)
└── vdom/                ← Virtual DOM (VNode, Renderer)

LEVEL 3: CORE FRAMEWORK
├── core/                ← Widget, State, BuildContext, StatelessWidget, StatefulWidget
└── FOUNDATION COMPLETE

LEVEL 4: DECORATIONS
├── decoration/          ← Border, Shadow, Gradient, BoxDecoration
│   ├── depends on: utils, styles
│   └── used by: container, text

LEVEL 5: TEXT RENDERING
├── text/                ← TextSpan, RichText, Text
│   ├── depends on: core, decoration, utils, theme
│   └── used by: widgets, buttons, inputs

LEVEL 6: THEME SYSTEM
├── theme/               ← ThemeData, TextTheme, Colors, all theme configs
│   ├── depends on: utils, constants, typography
│   └── used by: all widgets

LEVEL 7: STATE & ANIMATION
├── state/               ← ChangeNotifier, ValueNotifier, InheritedWidget
├── animation/           ← Curves, Tween, AnimationController, Transitions
├── forms/               ← FormValidator, TextEditingController, FocusNode
└── gestures/            ← Tap, LongPress, Drag, Gesture Detector
    └── depends on: core, vdom

LEVEL 8: BASIC WIDGETS
├── layout/base          ← Center, Padding, SizedBox (simple positioning)
├── feedback/            ← InkWell, InkResponse, Tooltip, ProgressIndicators
├── media/               ← Icon, Image, NetworkImage, CircleAvatar
└── dividers/            ← Divider, VerticalDivider
    └── depends on: core, decoration, text, theme

LEVEL 9: CONTAINER
├── container/           ← Container (decoration + layout combined)
│   └── depends on: decoration, layout, widgets
│   └── used by: everything above

LEVEL 10: INPUT WIDGETS
├── inputs/              ← TextField, Checkbox, Switch, Radio, Slider, DatePicker
│   └── depends on: container, text, decoration, forms, validation

LEVEL 11: INTERACTIVE WIDGETS
├── buttons/             ← ElevatedButton, TextButton, IconButton, FAB, etc.
├── selection/           ← Chip, SegmentedButton
└── cards/               ← Card
    └── depends on: container, text, buttons, decoration

LEVEL 12: COLLECTION WIDGETS
├── lists/               ← ListTile, ListView, GridView, ReorderableList
├── scrolling/           ← ScrollView, SingleChildScrollView, Scrollbar
└── badges/              ← Badge
    └── depends on: container, text, media, inputs

LEVEL 13: COMPOSITE WIDGETS
├── dialog/              ← Dialog, AlertDialog, SnackBar, BottomSheet, ExpansionPanel
├── app-bar/             ← AppBar, SliverAppBar, SearchBar
├── navigation/          ← BottomNavigationBar, NavigationBar, NavigationRail, TabBar
└── drawer/              ← Drawer, DrawerHeader, DrawerTile
    └── depends on: container, buttons, text, lists, icons

LEVEL 14: LAYOUT ADVANCED
├── layout-advanced/     ← Column, Row, Flex, Stack, Positioned, Expanded, Wrap
│   └── depends on: basic layout, container, widgets
│   └── used by: all complex layouts

LEVEL 15: APP-LEVEL WIDGETS
├── app/                 ← MaterialApp, Scaffold
│   └── depends on: everything below
│   └── navigation, drawer, app-bar, containers

LEVEL 16: ROUTING & RUNTIME
├── navigation/routing   ← Navigator, Route, MaterialPageRoute, Hero
├── runtime/             ← runApp, FlutterJS, Scheduler
    └── depends on: all layers above
```

---

## 🎯 Build Dependency Order (Bottom → Top)

```javascript
// Order to build/import (lowest → highest):

1. constants/           // LEAF (no dependencies)
2. styles/              // LEAF (only HTML/CSS)
3. core/                // BASE (uses constants)
4. vdom/                // Uses core
5. utils/               // Pure JS (uses constants)
6. decoration/          // Uses utils, constants, styles
7. text/                // Uses core, decoration, utils, constants
8. theme/               // Uses utils, constants, text
9. state/               // Uses core
10. animation/          // Uses core, vdom
11. forms/              // Uses core, constants
12. gestures/           // Uses core, vdom
13. feedback/           // Uses core, decoration, text, theme
14. media/              // Uses core, text
15. layout-basic/       // Uses core, utils, container
16. container/          // Uses decoration, layout, text, theme
17. inputs/             // Uses container, text, forms, validation
18. buttons/            // Uses container, text, feedback, decoration
19. selection/          // Uses container, buttons, text
20. cards/              // Uses container, text, media
21. lists/              // Uses container, text, media, buttons
22. scrolling/          // Uses layout, container
23. dividers/           // Uses core, decoration
24. badges/             // Uses core, text, media
25. dialog/             // Uses container, buttons, text, lists, dividers
26. app-bar/            // Uses container, buttons, text, media
27. navigation/         // Uses container, buttons, text, lists
28. drawer/             // Uses container, buttons, text, lists
29. layout-advanced/    // Uses basic layout, container, all widgets
30. app/                // Uses navigation, drawer, app-bar, containers
31. navigation-routing/ // Uses core, animation
32. runtime/            // Uses everything
```

---

## 📦 Import Examples (Bottom → Top)

```javascript
// LEVEL 1: Constants (NO IMPORTS)
// src/constants/colors.constants.js
export const PRIMARY = '#6200EA';
export const SECONDARY = '#03DAC6';

// LEVEL 2: Utils (uses CONSTANTS)
// src/utils/text-style.js
import { BUTTON_SIZE } from '../constants/typography.constants.js';

export class TextStyle {
  constructor(size = BUTTON_SIZE) {
    this.size = size;
  }
}

// LEVEL 3: Decoration (uses UTILS + CONSTANTS)
// src/decoration/box-decoration.js
import { EdgeInsets } from '../utils/edge-insets.js';
import { PRIMARY } from '../constants/colors.constants.js';

export class BoxDecoration {
  constructor() {
    this.color = PRIMARY;
  }
}

// LEVEL 4: Text (uses DECORATION + THEME + UTILS)
// src/text/text.js
import { StatelessWidget } from '../core/stateless-widget.js';
import { TextStyle } from '../utils/text-style.js';
import { BoxDecoration } from '../decoration/box-decoration.js';

export class Text extends StatelessWidget {
  build(context) {
    // ...
  }
}

// LEVEL 5: Container (uses DECORATION + LAYOUT)
// src/widgets/container/container.js
import { StatelessWidget } from '../core/stateless-widget.js';
import { BoxDecoration } from '../decoration/box-decoration.js';
import { EdgeInsets } from '../utils/edge-insets.js';

export class Container extends StatelessWidget {
  build(context) {
    // ...
  }
}

// LEVEL 6: Button (uses CONTAINER + TEXT + FEEDBACK)
// src/widgets/buttons/elevated-button.js
import { StatelessWidget } from '../core/stateless-widget.js';
import { Container } from '../container/container.js';
import { Text } from '../text/text.js';
import { InkWell } from '../feedback/ink-well.js';

export class ElevatedButton extends StatelessWidget {
  build(context) {
    return new InkWell({
      child: new Container({
        child: new Text(this.label)
      })
    });
  }
}

// LEVEL 7: List (uses CONTAINER + TEXT + BUTTON + MEDIA)
// src/widgets/lists/list-tile.js
import { StatelessWidget } from '../core/stateless-widget.js';
import { Container } from '../container/container.js';
import { Text } from '../text/text.js';
import { Icon } from '../media/icon.js';

export class ListTile extends StatelessWidget {
  build(context) {
    return new Container({
      child: new Row({
        children: [
          new Icon(this.icon),
          new Text(this.title)
        ]
      })
    });
  }
}

// LEVEL 8: Dialog (uses CONTAINER + BUTTON + TEXT + LISTS)
// src/widgets/dialog/alert-dialog.js
import { StatelessWidget } from '../core/stateless-widget.js';
import { Container } from '../container/container.js';
import { Text } from '../text/text.js';
import { ElevatedButton } from '../buttons/elevated-button.js';

export class AlertDialog extends StatelessWidget {
  build(context) {
    return new Container({
      child: new Column({
        children: [
          new Text(this.title),
          new Row({
            children: [
              new ElevatedButton({ label: 'OK' }),
              new ElevatedButton({ label: 'Cancel' })
            ]
          })
        ]
      })
    });
  }
}

// LEVEL 9: Scaffold (uses all above)
// src/widgets/app/scaffold.js
import { StatelessWidget } from '../core/stateless-widget.js';
import { AppBar } from '../app-bar/app-bar.js';
import { NavigationBar } from '../navigation/navigation-bar.js';
import { Container } from '../container/container.js';

export class Scaffold extends StatelessWidget {
  build(context) {
    return new Container({
      child: new Column({
        children: [
          new AppBar(),
          this.body,
          new NavigationBar()
        ]
      })
    });
  }
}
```

---

## ✅ Key Principles

### **1. No Circular Dependencies**
```javascript
// ✅ GOOD: One direction only
constants → utils → decoration → text → container → button → dialog

// ❌ BAD: Never go backwards
// button should NEVER import from dialog
// dialog should NEVER import from button (use interface/callback instead)
```

### **2. Leaf Layers (No Dependencies)**
```
constants/     ← Pure values only
styles/        ← CSS only
```

### **3. Foundation Layer**
```
core/          ← Widget, State, Context (uses nothing from widgets)
vdom/          ← Virtual DOM (uses only core)
```

### **4. Building Up**
```
Each layer builds on layers BELOW it only
decoration → text → theme → widgets
↑          ↑      ↑       ↑
Uses       Uses   Uses    Uses
lower      lower  lower   lower
layers     layers layers  layers
```

### **5. Final Top Layer**
```
MaterialApp → Scaffold → Navigation
Uses everything below
Brings it all together
```

---

## 🚀 Build Script Order

```bash
# Build in order (bottom to top):
npm run build:constants
npm run build:styles
npm run build:core
npm run build:vdom
npm run build:utils
npm run build:decoration
npm run build:text
npm run build:theme
npm run build:state
npm run build:animation
npm run build:forms
npm run build:gestures
npm run build:feedback
npm run build:media
npm run build:layout-basic
npm run build:container
npm run build:inputs
npm run build:buttons
npm run build:selection
npm run build:cards
npm run build:lists
npm run build:scrolling
npm run build:dividers
npm run build:badges
npm run build:dialog
npm run build:app-bar
npm run build:navigation
npm run build:drawer
npm run build:layout-advanced
npm run build:app
npm run build:navigation-routing
npm run build:runtime
npm run bundle
```

---

## 📊 Widget Layers Summary

| Layer | Components | Dependencies | Used By |
|-------|-----------|--------------|---------|
| **LEAF** | constants, styles | None | Everything |
| **CORE** | widget, state, context | constants | All widgets |
| **VDOM** | vnode, renderer | core | Widget rendering |
| **UTILS** | Duration, Size, TextStyle, EdgeInsets, Alignment | constants | decoration, text, theme |
| **DECORATION** | Border, Shadow, Gradient, BoxDecoration | utils, styles | text, container |
| **TEXT** | TextSpan, RichText, Text | core, decoration, utils, theme | All widgets |
| **THEME** | ThemeData, Colors, Typography | utils, constants, text | All widgets |
| **STATE** | ChangeNotifier, ValueNotifier | core | Complex widgets |
| **ANIMATION** | Curves, Tween, AnimationController | core, vdom | Transitions, widgets |
| **FORMS** | Validator, TextController, FocusNode | core, constants | Input widgets |
| **GESTURES** | TapDetector, LongPress, Drag | core, vdom | Interactive widgets |
| **FEEDBACK** | InkWell, Tooltip, Progress | core, decoration, text, theme | buttons, inputs |
| **MEDIA** | Icon, Image, Avatar | core, text | Lists, cards, buttons |
| **LAYOUT-BASIC** | Center, Padding, SizedBox | core, utils, container | Simple layouts |
| **CONTAINER** | Container | core, decoration, layout, text, theme | All complex widgets |
| **INPUTS** | TextField, Checkbox, Slider | core, container, forms, validation | Forms |
| **BUTTONS** | ElevatedButton, IconButton, FAB | core, container, text, feedback | All UIs |
| **SELECTION** | Chip, SegmentedButton | core, container, buttons, text | Complex forms |
| **CARDS** | Card | core, container, text, media | Lists, layouts |
| **LISTS** | ListView, GridView, ListTile | core, container, text, media, buttons | UIs |
| **SCROLLING** | ScrollView, Scrollbar | core, layout, container | Lists, dialogs |
| **DIVIDERS** | Divider, VerticalDivider | core, decoration | Layouts |
| **BADGES** | Badge | core, text, media | Cards, lists |
| **DIALOG** | AlertDialog, SnackBar, BottomSheet | core, container, buttons, text, lists | User interaction |
| **APP-BAR** | AppBar, SearchBar | core, container, buttons, text, media | App layouts |
| **NAVIGATION** | BottomNav, NavBar, NavRail, TabBar | core, container, buttons, text, lists | Scaffold |
| **DRAWER** | Drawer, DrawerTile | core, container, buttons, text, lists | Scaffold |
| **LAYOUT-ADV** | Column, Row, Stack, Flex | core, utils, container, layout-basic | All complex layouts |
| **APP** | MaterialApp, Scaffold | core, navigation, drawer, app-bar, container | Top-level |
| **ROUTING** | Navigator, Route, Hero | core, animation, widgets | App navigation |
| **RUNTIME** | runApp, FlutterJS | Everything | Entry point |

---

## 🔗 Concrete Dependency Graph

```
LEVEL 1 (LEAF - No deps)
├── constants/
└── styles/

LEVEL 2 (Uses LEVEL 1)
├── utils/ ─────→ constants
└── vdom/ ─────→ core

LEVEL 3 (Uses LEVEL 1-2)
├── core/ ─────→ Nothing (fundamental)
└── (Now core exists)

LEVEL 4 (Uses LEVEL 1-3)
├── decoration/ ────→ utils, constants, styles
└── state/ ────→ core

LEVEL 5 (Uses LEVEL 1-4)
├── text/ ────→ core, decoration, utils
├── theme/ ────→ utils, constants
├── animation/ ────→ core, vdom
└── forms/ ────→ core, constants

LEVEL 6 (Uses LEVEL 1-5)
├── gestures/ ────→ core, vdom
├── feedback/ ────→ core, decoration, text, theme
└── media/ ────→ core, text

LEVEL 7 (Uses LEVEL 1-6)
├── layout-basic/ ────→ core, utils, container
├── container/ ────→ decoration, layout, text, theme
└── dividers/ ────→ core, decoration

LEVEL 8 (Uses LEVEL 1-7)
├── inputs/ ────→ container, text, forms, validation
├── buttons/ ────→ container, text, feedback, decoration, theme
├── selection/ ────→ container, buttons, text
├── cards/ ────→ container, text, media
└── badges/ ────→ container, text, media

LEVEL 9 (Uses LEVEL 1-8)
├── lists/ ────→ container, text, media, buttons, cards
├── scrolling/ ────→ layout-basic, container, utils
└── dialog/ ────→ container, buttons, text, lists, dividers

LEVEL 10 (Uses LEVEL 1-9)
├── app-bar/ ────→ container, buttons, text, media, dividers
├── navigation/ ────→ container, buttons, text, lists, icons
└── drawer/ ────→ container, buttons, text, lists, dividers

LEVEL 11 (Uses LEVEL 1-10)
├── layout-advanced/ ────→ layout-basic, container, all widgets
└── app/ ────→ navigation, drawer, app-bar, containers, scaffold

LEVEL 12 (Uses LEVEL 1-11)
├── navigation-routing/ ────→ core, animation, widgets, app
└── runtime/ ────→ Everything (entry point)
```

---

## 🎯 File Import Template (Bottom → Top)

```javascript
// LEVEL 1: CONSTANTS (leaf - no imports needed from framework)
// src/constants/colors.constants.js
export const PRIMARY = '#6200EA';
export const SECONDARY = '#03DAC6';
export const ERROR = '#CF6679';

// ═══════════════════════════════════════════════════════════

// LEVEL 2: STYLES (leaf - only CSS)
// src/styles/base.css
body {
  font-family: 'Roboto', sans-serif;
  margin: 0;
  padding: 0;
}

// ═══════════════════════════════════════════════════════════

// LEVEL 3: UTILS (uses CONSTANTS)
// src/utils/duration.js
export class Duration {
  constructor(ms = 0) {
    this.ms = ms;
  }
  
  get seconds() {
    return this.ms / 1000;
  }
}

// ═══════════════════════════════════════════════════════════

// LEVEL 4: DECORATION (uses UTILS)
// src/decoration/border.js
import { PRIMARY } from '../constants/colors.constants.js';

export class Border {
  constructor(width = 1, color = PRIMARY) {
    this.width = width;
    this.color = color;
  }
}

// ═══════════════════════════════════════════════════════════

// LEVEL 5: TEXT (uses DECORATION + UTILS + CORE)
// src/text/text-span.js
import { StatelessWidget } from '../core/stateless-widget.js';
import { TextStyle } from '../utils/text-style.js';

export class TextSpan {
  constructor(text, style = new TextStyle()) {
    this.text = text;
    this.style = style;
  }
}

// ═══════════════════════════════════════════════════════════

// LEVEL 6: THEME (uses UTILS + CONSTANTS + TEXT)
// src/theme/theme-data.js
import { PRIMARY, SECONDARY } from '../constants/colors.constants.js';
import { TextTheme } from './text-theme.js';

export class ThemeData {
  constructor() {
    this.primary = PRIMARY;
    this.secondary = SECONDARY;
    this.textTheme = new TextTheme();
  }
}

// ═══════════════════════════════════════════════════════════

// LEVEL 7: BASIC CONTAINER (uses DECORATION + TEXT + THEME)
// src/widgets/container/container.js
import { StatelessWidget } from '../../core/stateless-widget.js';
import { BoxDecoration } from '../../decoration/box-decoration.js';
import { EdgeInsets } from '../../utils/edge-insets.js';

export class Container extends StatelessWidget {
  constructor(options = {}) {
    super();
    this.decoration = options.decoration || new BoxDecoration();
    this.padding = options.padding || EdgeInsets.zero();
    this.child = options.child;
  }

  build(context) {
    // Build with decoration + padding
  }
}

// ═══════════════════════════════════════════════════════════

// LEVEL 8: INPUT (uses CONTAINER + FORMS)
// src/widgets/inputs/text-field.js
import { StatefulWidget } from '../../core/stateful-widget.js';
import { State } from '../../core/state.js';
import { Container } from '../container/container.js';
import { TextEditingController } from '../../forms/text-editing-controller.js';

export class TextField extends StatefulWidget {
  constructor(options = {}) {
    super();
    this.controller = options.controller || new TextEditingController();
  }

  createState() {
    return new _TextFieldState();
  }
}

// ═══════════════════════════════════════════════════════════

// LEVEL 9: BUTTON (uses CONTAINER + FEEDBACK + TEXT)
// src/widgets/buttons/elevated-button.js
import { StatelessWidget } from '../../core/stateless-widget.js';
import { Container } from '../container/container.js';
import { Text } from '../text/text.js';
import { InkWell } from '../feedback/ink-well.js';

export class ElevatedButton extends StatelessWidget {
  constructor(options = {}) {
    super();
    this.label = options.label || 'Button';
    this.onPressed = options.onPressed;
  }

  build(context) {
    return new InkWell({
      onTap: this.onPressed,
      child: new Container({
        child: new Text(this.label)
      })
    });
  }
}

// ═══════════════════════════════════════════════════════════

// LEVEL 10: LIST (uses CONTAINER + TEXT + BUTTON + MEDIA)
// src/widgets/lists/list-view.js
import { StatelessWidget } from '../../core/stateless-widget.js';
import { Container } from '../container/container.js';
import { ListTile } from './list-tile.js';

export class ListView extends StatelessWidget {
  constructor(options = {}) {
    super();
    this.children = options.children || [];
    this.scrollDirection = options.scrollDirection || 'vertical';
  }

  build(context) {
    return new Container({
      child: new Column({
        children: this.children.map(item => new ListTile(item))
      })
    });
  }
}

// ═══════════════════════════════════════════════════════════

// LEVEL 11: DIALOG (uses CONTAINER + BUTTON + TEXT + LISTS)
// src/widgets/dialog/alert-dialog.js
import { StatelessWidget } from '../../core/stateless-widget.js';
import { Container } from '../container/container.js';
import { Text } from '../text/text.js';
import { ElevatedButton } from '../buttons/elevated-button.js';
import { Column } from '../layout-advanced/column.js';

export class AlertDialog extends StatelessWidget {
  constructor(options = {}) {
    super();
    this.title = options.title || 'Alert';
    this.content = options.content || '';
    this.actions = options.actions || [];
  }

  build(context) {
    return new Container({
      child: new Column({
        children: [
          new Text(this.title),
          new Text(this.content),
          new Row({
            children: this.actions
          })
        ]
      })
    });
  }
}

// ═══════════════════════════════════════════════════════════

// LEVEL 12: APP-BAR (uses CONTAINER + BUTTONS + TEXT + MEDIA)
// src/widgets/app-bar/app-bar.js
import { StatelessWidget } from '../../core/stateless-widget.js';
import { Container } from '../container/container.js';
import { Text } from '../text/text.js';
import { IconButton } from '../buttons/icon-button.js';
import { Row } from '../layout-advanced/row.js';

export class AppBar extends StatelessWidget {
  constructor(options = {}) {
    super();
    this.title = options.title || 'App';
    this.actions = options.actions || [];
  }

  build(context) {
    return new Container({
      child: new Row({
        children: [
          new Text(this.title),
          new Row({ children: this.actions })
        ]
      })
    });
  }
}

// ═══════════════════════════════════════════════════════════

// LEVEL 13: SCAFFOLD (uses APP-BAR + DRAWER + NAVIGATION)
// src/widgets/app/scaffold.js
import { StatelessWidget } from '../../core/stateless-widget.js';
import { AppBar } from '../app-bar/app-bar.js';
import { NavigationBar } from '../navigation/navigation-bar.js';
import { Column } from '../layout-advanced/column.js';
import { Container } from '../container/container.js';

export class Scaffold extends StatelessWidget {
  constructor(options = {}) {
    super();
    this.appBar = options.appBar;
    this.body = options.body;
    this.bottomNavigationBar = options.bottomNavigationBar;
    this.drawer = options.drawer;
  }

  build(context) {
    return new Container({
      child: new Column({
        children: [
          this.appBar,
          this.body,
          this.bottomNavigationBar
        ]
      })
    });
  }
}

// ═══════════════════════════════════════════════════════════

// LEVEL 14: MATERIAL APP (uses SCAFFOLD + THEME + ROUTING)
// src/widgets/app/material-app.js
import { StatelessWidget } from '../../core/stateless-widget.js';
import { Scaffold } from './scaffold.js';
import { ThemeData } from '../../theme/theme-data.js';
import { Navigator } from '../../navigation/navigator.js';

export class MaterialApp extends StatelessWidget {
  constructor(options = {}) {
    super();
    this.title = options.title || 'Flutter App';
    this.theme = options.theme || new ThemeData();
    this.home = options.home;
    this.routes = options.routes || {};
  }

  build(context) {
    return new Scaffold({
      body: this.home
    });
  }
}

// ═══════════════════════════════════════════════════════════

// LEVEL 15: RUNTIME (uses EVERYTHING)
// src/runtime/run-app.js
import { MaterialApp } from '../widgets/app/material-app.js';
import { FlutterJS } from './flutter-js.js';

export function runApp(app) {
  const flutter = new FlutterJS();
  flutter.bootstrap(document.getElementById('app'), app);
}
```

---

## ✅ Import Rules (Bottom → Top Only)

### **DO** ✅
```javascript
// text-field uses container (lower level imports higher level)
// src/widgets/inputs/text-field.js
import { Container } from '../container/container.js'; ✅

// container uses decoration (lower level imports higher level)
// src/widgets/container/container.js
import { BoxDecoration } from '../../decoration/box-decoration.js'; ✅

// button uses text (lower level imports higher level)
// src/widgets/buttons/elevated-button.js
import { Text } from '../text/text.js'; ✅
```

### **DON'T** ❌
```javascript
// text should NEVER use text-field
// src/text/text.js
import { TextField } from '../widgets/inputs/text-field.js'; ❌

// container should NEVER use button
// src/widgets/container/container.js
import { ElevatedButton } from '../buttons/elevated-button.js'; ❌

// decoration should NEVER use container
// src/decoration/box-decoration.js
import { Container } from '../widgets/container/container.js'; ❌
```

---

## 🔍 Layer Verification Checklist

Before committing code:

```markdown
### Layer Position: [ ] CORRECT

- [ ] File in right folder?
  - [ ] constants/ (leaf)
  - [ ] styles/ (leaf)
  - [ ] utils/ (uses constants)
  - [ ] decoration/ (uses utils)
  - [ ] text/ (uses decoration, utils)
  - [ ] theme/ (uses utils, constants)
  - [ ] widgets/ (uses all above)

### Imports: [ ] ONLY FROM LOWER LAYERS

- [ ] Imports ONLY from layers below?
  - [ ] Checked all import statements?
  - [ ] No imports from same layer?
  - [ ] No imports from higher layers?

### Re-exports: [ ] FROM INDEX ONLY

- [ ] Exporting from index.js of folder?
  - [ ] NOT exporting internals (_*.js)?
  - [ ] Only public APIs exported?

### Testing: [ ] PASSES

- [ ] ESLint clean?
  - [ ] No unused imports?
  - [ ] Correct indentation?
  - [ ] No circular deps?
  - [ ] npm run lint -- file-path

### Build: [ ] COMPILES

- [ ] Builds without errors?
  - [ ] npm run build
  - [ ] Check dist/ files
  - [ ] No warnings about deps?
```

---

## 📈 Scaling Guide

### **Adding New Widget**
```javascript
// 1. Determine LAYER
TextField = INPUT LAYER (Level 8)

// 2. Check dependencies
- Uses: Container, Text, FormValidator
- All at lower or same level? ✅

// 3. Create file
src/widgets/inputs/text-field.js

// 4. Import only from lower layers
import { Container } from '../container/container.js';
import { Text } from '../text/text.js';
import { FormValidator } from '../../forms/form-validator.js';

// 5. Add to index
// src/widgets/inputs/index.js
export { TextField } from './text-field.js';

// 6. Test build
npm run build:inputs
npm run build  // Full build

// 7. Verify no circular deps
npm run lint
```

### **Adding New Category**
```javascript
// 1. Determine layer and dependencies
NewCategory = Level X (uses layers below)

// 2. Create folder structure
src/widgets/new-category/
  ├── component-1.js
  ├── component-2.js
  └── index.js

// 3. Build order: Layer → Layer+1 → Layer+2...
// Don't build NewCategory until dependencies ready

// 4. Organize in build script
// package.json
"build:new-category": "..."

// 5. Add to master build sequence
npm run build:dependency
npm run build:new-category
```

---

## 🎯 Summary

**Bottom-to-Top Hierarchy = Clean Architecture**

```
Runtime ↑
  ↑
App ↑
  ↑
Widgets (Complex) ↑
  ↑
Widgets (Simple) ↑
  ↑
Feedback, Media ↑
  ↑
Container ↑
  ↑
Animation, Forms, Gestures ↑
  ↑
Theme, State ↑
  ↑
Text, Decoration ↑
  ↑
Utils ↑
  ↑
Core, VDOM ↑
  ↑
Constants, Styles ↑
═════════════════════
(No dependencies)
```

**Each layer only imports from layers BELOW it. Never sideways. Never upwards.** 🎯