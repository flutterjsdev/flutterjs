# Flutter to HTML Widget Hierarchy

## Level 1: Basic Elements (No Sub-properties)

### Simple Widgets
- **divider.dart** → `<hr>` or `<div>`
- **vertical_divider.dart** → `<div>` (vertical line)
- **sized_box.dart** → `<div>` (width, height only)
- **icon.dart** → `<svg>` or `<i>` (icon data, size, color)
- **image.dart** → `<img>` (src, width, height)
- **badge.dart** → `<div>` (count/label)

### Input Elements
- **checkbox.dart** → `<input type="checkbox">` (value, onChanged)
- **radio.dart** → `<input type="radio">` (value, groupValue, onChanged)
- **switch.dart** → `<input type="checkbox">` (value, onChanged)
- **slider.dart** → `<input type="range">` (value, min, max, onChanged)

---

## Level 2: Composite Elements (1-2 Properties/Children)

### Layout Wrappers
- **padding.dart** → `<div>` with padding
  - `padding`: EdgeInsets (top, bottom, left, right)
  - `child`: Single widget

- **center.dart** → `<div>` with flexbox centering
  - `child`: Single widget
  - Alignment: center

- **expanded.dart** → `<div>` with flex: 1
  - `flex`: Number (default 1)
  - `child`: Single widget

- **flexible.dart** → `<div>` with flex-grow/shrink
  - `flex`: Number
  - `fit`: FlexFit (tight/loose)
  - `child`: Single widget

- **aspect_ratio.dart** → `<div>` with aspect-ratio
  - `aspectRatio`: Number (width/height)
  - `child`: Single widget

### Text Elements
- **text.dart** → `<span>` or `<p>`
  - `data`: String content
  - `style`: TextStyle
    - `fontSize`: Number
    - `fontWeight`: FontWeight
    - `color`: Color
    - `fontFamily`: String
    - `decoration`: TextDecoration
    - `letterSpacing`: Number
    - `height`: Number (line height)

- **selectable_text.dart** → `<span>` (user-select: text)
  - Same as Text + selection enabled

### Simple Interactive
- **tooltip.dart** → `<div>` overlay on hover
  - `message`: String
  - `child`: Widget

- **circle_avatar.dart** → `<div>` circular
  - `radius`: Number
  - `backgroundColor`: Color
  - `backgroundImage`: Image
  - `child`: Widget (icon/text)

---

## Level 3: Complex Single Elements (3+ Properties)

### Container
- **container.dart** → `<div>`
  - `width`: Number
  - `height`: Number
  - `padding`: EdgeInsets
  - `margin`: EdgeInsets
  - `decoration`: BoxDecoration
    - `color`: Color
    - `border`: Border
    - `borderRadius`: BorderRadius
    - `boxShadow`: List<BoxShadow>
    - `gradient`: Gradient
    - `image`: DecorationImage
  - `alignment`: Alignment
  - `transform`: Matrix4
  - `child`: Single widget

### Card
- **card.dart** → `<div>` with elevation/shadow
  - `elevation`: Number
  - `color`: Color
  - `shadowColor`: Color
  - `shape`: ShapeBorder (borderRadius)
  - `margin`: EdgeInsets
  - `clipBehavior`: Clip
  - `child`: Widget

### Buttons
- **elevated_button.dart** → `<button>` with elevation
  - `onPressed`: Function
  - `style`: ButtonStyle
    - `backgroundColor`: Color
    - `foregroundColor`: Color
    - `elevation`: Number
    - `padding`: EdgeInsets
    - `shape`: ShapeBorder
    - `textStyle`: TextStyle
  - `child`: Widget (usually Text)

- **filled_button.dart** → `<button>` filled
- **outlined_button.dart** → `<button>` with border
- **text_button.dart** → `<button>` text only
- **filled_tonal_button.dart** → `<button>` tonal
- **icon_button.dart** → `<button>` icon only
- **floating_action_button.dart** → `<button>` floating

*(All buttons share similar properties)*

### Input Fields
- **text_field.dart** → `<input type="text">`
  - `controller`: TextEditingController
  - `decoration`: InputDecoration
    - `labelText`: String
    - `hintText`: String
    - `prefixIcon`: Icon
    - `suffixIcon`: Icon
    - `border`: InputBorder
    - `filled`: Boolean
    - `fillColor`: Color
    - `errorText`: String
  - `keyboardType`: TextInputType
  - `obscureText`: Boolean
  - `maxLines`: Number
  - `onChanged`: Function

- **text_form_field.dart** → `<input>` + validation
  - All TextField properties +
  - `validator`: Function
  - `autovalidateMode`: AutovalidateMode

- **search_bar.dart** → `<input>` search type
  - TextField properties +
  - `leading`: Icon (search icon)
  - `trailing`: List<Widget> (actions)

### Dropdowns
- **dropdown.dart** → `<select>`
  - `value`: Selected value
  - `items`: List<DropdownMenuItem>
  - `onChanged`: Function
  - `icon`: Widget
  - `elevation`: Number
  - `style`: TextStyle

---

## Level 4: Layout Containers (Multiple Children)

### Flex Layouts
- **column.dart** → `<div>` (flex-direction: column)
  - `children`: List<Widget>
  - `mainAxisAlignment`: MainAxisAlignment
  - `crossAxisAlignment`: CrossAxisAlignment
  - `mainAxisSize`: MainAxisSize
  - `verticalDirection`: VerticalDirection

- **row.dart** → `<div>` (flex-direction: row)
  - Same properties as Column

- **wrap.dart** → `<div>` (flex-wrap: wrap)
  - `children`: List<Widget>
  - `direction`: Axis
  - `alignment`: WrapAlignment
  - `spacing`: Number (horizontal)
  - `runSpacing`: Number (vertical)

### Positioned Layouts
- **stack.dart** → `<div>` (position: relative)
  - `children`: List<Widget>
  - `alignment`: Alignment
  - `fit`: StackFit
  - `clipBehavior`: Clip

- **positioned.dart** → `<div>` (position: absolute)
  - `top`: Number
  - `bottom`: Number
  - `left`: Number
  - `right`: Number
  - `width`: Number
  - `height`: Number
  - `child`: Widget

---

## Level 5: Composite UI Components (Widget + Children + Logic)

### List Components
- **list_tile.dart** → `<div>` row layout
  - `leading`: Widget (icon/avatar)
  - `title`: Widget (main text)
  - `subtitle`: Widget (secondary text)
  - `trailing`: Widget (icon/badge)
  - `onTap`: Function
  - `selected`: Boolean
  - `enabled`: Boolean

- **checkbox_list_tile.dart** → `<label>` + `<input>`
  - ListTile properties +
  - `value`: Boolean
  - `onChanged`: Function
  - `controlAffinity`: ListTileControlAffinity

- **radio_list_tile.dart** → `<label>` + `<input>`
- **switch_list_tile.dart** → `<label>` + `<input>`

### Navigation Components
- **drawer.dart** → `<div>` sidebar
  - `children`: List<Widget> (usually in ListView)
  - `backgroundColor`: Color
  - `elevation`: Number
  - `width`: Number

- **drawer_header.dart** → `<div>` header section
  - `decoration`: BoxDecoration
  - `child`: Widget
  - `margin`: EdgeInsets
  - `padding`: EdgeInsets

- **navigation_bar.dart** → `<nav>` bottom
  - `destinations`: List<NavigationDestination>
    - `icon`: Widget
    - `selectedIcon`: Widget
    - `label`: String
  - `selectedIndex`: Number
  - `onDestinationSelected`: Function
  - `backgroundColor`: Color

- **bottom_navigation_bar.dart** → `<nav>` bottom
  - `items`: List<BottomNavigationBarItem>
  - `currentIndex`: Number
  - `onTap`: Function
  - `type`: BottomNavigationBarType

- **navigation_rail.dart** → `<nav>` vertical
  - Similar to NavigationBar but vertical

### Menu Components
- **dropdown_menu.dart** → `<div>` + `<ul>`
  - `dropdownMenuEntries`: List<DropdownMenuEntry>
  - `controller`: TextEditingController
  - `initialSelection`: Value
  - `onSelected`: Function
  - `label`: Widget
  - `width`: Number

- **popup_menu.dart** → `<div>` overlay + `<ul>`
  - `itemBuilder`: Function returns List<PopupMenuEntry>
  - `onSelected`: Function
  - `child`: Widget (trigger)
  - `position`: PopupMenuPosition
  - `elevation`: Number

- **menu_anchor.dart** → `<div>` menu container
  - `menuChildren`: List<Widget>
  - `builder`: Function
  - `style`: MenuStyle

### Tab Components
- **tab_bar.dart** → `<div>` tabs
  - `tabs`: List<Tab>
    - `text`: String
    - `icon`: Widget
  - `controller`: TabController
  - `onTap`: Function
  - `indicatorColor`: Color
  - `labelColor`: Color

---

## Level 6: App Structure & Overlays

### App Structure
- **app_bar.dart** → `<header>`
  - `title`: Widget
  - `leading`: Widget (back button)
  - `actions`: List<Widget> (action buttons)
  - `backgroundColor`: Color
  - `elevation`: Number
  - `flexibleSpace`: Widget
  - `bottom`: PreferredSizeWidget (TabBar)
  - `centerTitle`: Boolean
  - `toolbarHeight`: Number

### Overlays & Modals
- **dialog.dart** → `<div>` modal overlay
  - `title`: Widget
  - `content`: Widget
  - `actions`: List<Widget> (buttons)
  - `backgroundColor`: Color
  - `elevation`: Number
  - `shape`: ShapeBorder

- **bottom_sheet.dart** → `<div>` bottom overlay
  - `builder`: Function returns Widget
  - `backgroundColor`: Color
  - `elevation`: Number
  - `shape`: ShapeBorder
  - `enableDrag`: Boolean

- **snack_bar.dart** → `<div>` notification toast
  - `content`: Widget
  - `action`: SnackBarAction
  - `duration`: Duration
  - `backgroundColor`: Color
  - `behavior`: SnackBarBehavior

- **banner.dart** → `<div>` banner notification
  - `content`: Widget
  - `actions`: List<Widget>
  - `leading`: Widget
  - `backgroundColor`: Color

---

## Level 7: Specialized Complex Widgets

### Range Slider
- **range_slider.dart** → `<div>` (custom double range)
  - `values`: RangeValues (start, end)
  - `min`: Number
  - `max`: Number
  - `divisions`: Number
  - `labels`: RangeLabels
  - `onChanged`: Function
  - `activeColor`: Color
  - `inactiveColor`: Color

### Back/Close Buttons
- **back_button.dart** → `<button>` (arrow back icon)
  - `onPressed`: Function (default: Navigator.pop)
  - `color`: Color

- **close_button.dart** → `<button>` (X icon)
  - `onPressed`: Function
  - `color`: Color

---

## Usage Patterns

### Nesting Example:
```
Container (Level 3)
├── decoration: BoxDecoration
│   ├── color
│   ├── borderRadius
│   └── boxShadow
├── padding: EdgeInsets
└── child: Column (Level 4)
    └── children: [
        ├── Text (Level 2)
        │   └── style: TextStyle
        ├── SizedBox (Level 1)
        └── ElevatedButton (Level 3)
            ├── style: ButtonStyle
            └── child: Text
        ]
```

### Common Compositions:
1. **ListTile** (Level 5) = Row + Padding + InkWell
2. **Card** (Level 3) = Container + Elevation + Border
3. **AppBar** (Level 6) = Container + Row + Actions
4. **TextField** (Level 3) = Input + Border + Label + Icons