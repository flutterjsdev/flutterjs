# Flutter.js Material Widgets - Complete Categorization

## 📊 Overview

All 200+ Flutter Material widgets need to be categorized into:

1. **VNode Direct** - Maps directly to HTML elements
2. **Decoration/Style** - Uses CSS and style utilities
3. **New Category 3** - Complex calculations/positioning
4. **New Category 4** - Data processing/formatting

---

## ✅ CATEGORY 1: VNODE DIRECT

### Definition
These widgets map **directly to HTML elements** with minimal processing.
- Direct HTML: `<div>`, `<button>`, `<input>`, `<img>`, etc.
- Simple attributes
- Basic event handlers

### Widgets

#### A. HTML Element Replacements
- **app_bar.dart** → `<header>`
- **button.dart** → `<button>`
- **back_button.dart** → `<button>`
- **close_button.dart** → `<button>`
- **icon_button.dart** → `<button>`
- **floating_action_button.dart** → `<button>`
- **text_button.dart** → `<button>`
- **filled_button.dart** → `<button>`
- **elevated_button.dart** → `<button>`
- **outlined_button.dart** → `<button>`
- **filled_tonal_button.dart** → `<button>`
- **checkbox.dart** → `<input type="checkbox">`
- **checkbox_list_tile.dart** → `<label>` + `<input>`
- **radio.dart** → `<input type="radio">`
- **radio_list_tile.dart** → `<label>` + `<input>`
- **switch.dart** → `<input type="checkbox">` (styled)
- **switch_list_tile.dart** → `<label>` + `<input>`
- **slider.dart** → `<input type="range">`
- **range_slider.dart** → `<div>` (double range)
- **text_field.dart** → `<input type="text">`
- **text_form_field.dart** → `<input>` + validation
- **dropdown.dart** → `<select>`
- **dropdown_menu.dart** → `<div>` + `<ul>`
- **popup_menu.dart** → `<div>` overlay + `<ul>`
- **menu_anchor.dart** → `<div>` menu
- **divider.dart** → `<hr>` or `<div>`
- **vertical_divider.dart** → `<div>` (vertical)
- **image.dart** → `<img>`
- **icon.dart** → `<svg>` or `<i>`
- **circle_avatar.dart** → `<div>` circular
- **badge.dart** → `<div>` + badge content
- **card.dart** → `<div>` container
- **container.dart** → `<div>`
- **center.dart** → `<div>` (flexbox)
- **padding.dart** → `<div>` (with padding)
- **sized_box.dart** → `<div>` (fixed size)
- **list_tile.dart** → `<div>` row layout
- **drawer.dart** → `<div>` sidebar
- **drawer_header.dart** → `<div>` header
- **navigation_bar.dart** → `<nav>`
- **bottom_navigation_bar.dart** → `<nav>` bottom
- **navigation_rail.dart** → `<nav>` vertical
- **tab_bar.dart** → `<div>` tabs
- **text.dart** → `<span>` or `<p>`
- **tooltip.dart** → `<div>` overlay

#### B. Layout Widgets
- **column.dart** → `<div>` (flex-direction: column)
- **row.dart** → `<div>` (flex-direction: row)
- **flex.dart** → `<div>` (flex)
- **expanded.dart** → `<div>` (flex: 1)
- **flexible.dart** → `<div>` (flex-grow/shrink)
- **stack.dart** → `<div>` (position: relative)
- **positioned.dart** → `<div>` (position: absolute)
- **wrap.dart** → `<div>` (flex-wrap)
- **aspect_ratio.dart** → `<div>` (aspect-ratio)
- **bottom_sheet.dart** → `<div>` overlay
- **dialog.dart** → `<div>` overlay
- **snack_bar.dart** → `<div>` notification
- **banner.dart** → `<div>` banner
- **drawer_theme.dart** → Theme config

#### C. Simple Data Display
- **selectable_text.dart** → `<span>` (selectable)
- **search_bar.dart** → `<input>` search

### VNode Creation Pattern
```javascript
// Simple mapping
button.dart → new VNode({
  tag: 'button',
  props: { className: 'fjs-button' },
  events: { click: this.onPressed }
})

// Direct HTML conversion
checkbox.dart → new VNode({
  tag: 'input',
  props: { type: 'checkbox', checked: this.value }
})
```

---

## 🎨 CATEGORY 2: DECORATION/STYLE

### Definition
These are **configuration/property objects** that define how other widgets look.
- Don't render themselves
- Applied TO other widgets
- Pure styling definitions

### Widgets

#### A. Color & Theme
1 - **colors.dart** → Color definitions 
 - **color_scheme.dart** → Color palette
- **text_theme.dart** → Text styles
- **theme.dart** → Complete theme
- **theme_data.dart** → Theme configuration

#### B. Component Themes
- **app_bar_theme.dart** → AppBar styling config
- **button_theme.dart** → Button styling config
- **button_style.dart** → Button style object
- **button_style_button.dart** → Style application
- **button_bar_theme.dart** → ButtonBar config
- **card_theme.dart** → Card styling config
- **checkbox_theme.dart** → Checkbox styling config
- **chip_theme.dart** → Chip styling config
- **dialog_theme.dart** → Dialog styling config
- **divider_theme.dart** → Divider styling config

- **drawer_theme.dart** → Drawer styling config
- **elevated_button_theme.dart** → ElevatedButton styling
- **filled_button_theme.dart** → FilledButton styling
- **filled_button_theme.dart** → FilledTonal styling
- **floating_action_button_theme.dart** → FAB styling
- **icon_button_theme.dart** → IconButton styling
- **input_decorator.dart** → TextField decoration config
- **list_tile_theme.dart** → ListTile styling config
- **navigation_bar_theme.dart** → NavigationBar styling
- **navigation_drawer_theme.dart** → NavigationDrawer styling
- **navigation_rail_theme.dart** → NavigationRail styling
- **outlined_button_theme.dart** → OutlinedButton styling
- **popup_menu_theme.dart** → PopupMenu styling
- **progress_indicator_theme.dart** → Progress styling
- **radio_theme.dart** → Radio styling config
- **scrollbar_theme.dart** → Scrollbar styling
- **segmented_button_theme.dart** → SegmentedButton styling
- **slider_theme.dart** → Slider styling config
- **snack_bar_theme.dart** → SnackBar styling
- **switch_theme.dart** → Switch styling config
- **tab_bar_theme.dart** → TabBar styling
- **text_button_theme.dart** → TextButton styling
- **text_selection_theme.dart** → Text selection styling
- **text_field.dart** (decoration property) → TextField decoration
- **text_form_field.dart** (decoration) → FormField decoration
- **toggles_buttons_theme.dart** → ToggleButton styling
- **tooltip_theme.dart** → Tooltip styling
- **bottom_app_bar_theme.dart** → BottomAppBar styling
- **bottom_navigation_bar_theme.dart** → BottomNavigationBar styling
- **bottom_sheet_theme.dart** → BottomSheet styling
- **expansion_tile_theme.dart** → ExpansionTile styling
- **badge_theme.dart** → Badge styling
- **banner_theme.dart** → Banner styling
- **dropdown_menu_theme.dart** → DropdownMenu styling
- **input_border.dart** → Border styling for input
- **menu_style.dart** → Menu styling
- **menu_theme.dart** → Menu styling config
- **menu_button_theme.dart** → MenuButton styling
- **menu_bar_theme.dart** → MenuBar styling
- **page_transitions_theme.dart** → Page transition styling
- **search_bar_theme.dart** → SearchBar styling
- **search_view_theme.dart** → SearchView styling
- **slider_value_indicator_shape.dart** → Slider indicator shape
- **text_selection_toolbar.dart** → Toolbar styling
- **icon_button_theme.dart** → Icon button theme

#### C. Constants & Curves
- **constants.dart** → Constants values
- **curves.dart** → Animation curves
- **shadows.dart** → Shadow definitions
- **typography.dart** → Typography config
- **motion.dart** → Motion/animation config

### Decoration/Style Usage Pattern
```javascript
// Theme config (not rendered)
button_theme.dart → ButtonTheme object {
  primary: Colors.primary,
  onPrimary: Colors.onPrimary,
  elevation: 2
}

// Applied when rendering button
ElevatedButton uses ButtonTheme to get colors
```

---

## 🔧 CATEGORY 3: COMPLEX POSITIONING/CALCULATIONS

### Definition
These require **complex layout calculations** beyond simple flexbox.
- Measure constraints
- Complex positioning logic
- Responsive calculations
- Multiple passes to compute layout

### Widgets

#### A. Data & Grid Layouts
- **data_table.dart** → Table with calculations
- **data_table_source.dart** → Table data source
- **data_table_theme.dart** → Table styling
- **paginated_data_table.dart** → Paginated table
- **grid_tile.dart** → Grid cell calculations
- **grid_tile_bar.dart** → Grid overlay bar
- **calendar_date_picker.dart** → Calendar grid layout
- **date_picker.dart** → Date picker layout
- **time_picker.dart** → Time picker layout
- **date.dart** → Date calculations
- **time.dart** → Time calculations

#### B. Complex Positioning
- **flexible_space_bar.dart** → Collapsing app bar
- **sliver_app_bar.dart** → Sliver positioning
- **expansion_panel.dart** → Expandable with height calc
- **expansion_tile.dart** → Expandable tile
- **stepper.dart** → Multi-step layout
- **reorderable_list.dart** → Drag & reorder layout
- **selection_area.dart** → Text selection area calc
- **carousel.dart** → Carousel positioning
- **carousel_theme.dart** → Carousel styling

#### C. Constraint-Based
- **constrained_box.dart** → Size constraints
- **limited_box.dart** → Max size constraints
- **aspect_ratio.dart** → Aspect ratio calculation
- **range_slider_parts.dart** → Slider thumb positioning
- **slider_parts.dart** → Slider track positioning
- **magnifier.dart** → Text magnifier positioning
- **menu_anchor.dart** (positioning) → Menu position calc
- **search_anchor.dart** (positioning) → Search position calc

### Complex Positioning Pattern
```javascript
// Requires measurement & calculation
calendar_date_picker.dart → {
  // 1. Calculate grid size
  // 2. Position each day
  // 3. Handle selection bounds
  // 4. Return calculated layout
}
```

---

## 📦 CATEGORY 4: DATA PROCESSING/FORMATTING

### Definition
These are **logic/data handlers** that process information.
- Don't render directly
- Transform data
- Handle state
- Format values

### Widgets

#### A. Data Source & Controllers
- **data_table_source.dart** → Table data source
- **tab_controller.dart** → Tab state management
- **material_state.dart** → Material state enum
- **material_state_mixin.dart** → State mixin
- **material_localizations.dart** → Localization data
- **text_selection.dart** → Selection logic
- **search.dart** → Search logic

#### B. Event Handlers & Detectors
- **adaptive_text_selection_toolbar.dart** → Text selection handler
- **desktop_text_selection.dart** → Desktop selection logic
- **desktop_text_selection_toolbar.dart** → Desktop toolbar
- **desktop_text_selection_toolbar_button.dart** → Toolbar button
- **spell_check_suggestions_toolbar.dart** → Spell check handler
- **spell_check_suggestions_toolbar_layout_delegate.dart** → Layout delegate
- **text_selection_toolbar.dart** → Selection toolbar logic
- **text_selection_toolbar_text_button.dart** → Toolbar button
- **text_selection_theme.dart** (logic) → Selection theme

#### C. Animation & Motion
- **animated_icons.dart** → Icon animation
- **animated_switcher.dart** → Animated switching
- **motion.dart** → Motion logic
- **page_transitions_theme.dart** (logic) → Transition logic
- **predictive_back_page_transitions_builder.dart** → Back gesture handler

#### D. Ink Effects & Feedback
- **ink_decoration.dart** → Ink effect logic
- **ink_highlight.dart** → Highlight effect
- **ink_ripple.dart** → Ripple effect
- **ink_splash.dart** → Splash effect
- **ink_sparkle.dart** → Sparkle effect
- **ink_well.dart** (logic) → Ink well state

#### E. Input & Validation
- **input_date_picker_form_field.dart** → Date input validation
- **autocomplete.dart** → Autocomplete logic
- **dropdown_menu_form_field.dart** → Dropdown form logic
- **search_view_theme.dart** (logic) → Search logic

#### F. Visual Elements
- **elevation_overlay.dart** → Elevation calculation
- **expand_icon.dart** → Expand icon logic
- **material_button.dart** → Button base logic
- **button_style_button.dart** (logic) → Style application logic
- **arc.dart** → Arc drawing logic
- **no_splash.dart** → No splash effect

#### G. Localization & Accessibility
- **material_localizations.dart** → Localized strings
- **material.dart** (framework) → Framework setup

### Data Processing Pattern
```javascript
// Process data, don't render
tab_controller.dart → {
  index: 0,
  length: 3,
  // Methods to change index, animate, etc.
}

// Used by TabBar widget to render
TabBar uses tab_controller.index to show which tab
```

---

## 📊 Summary Table

| Category | Count | Examples | Renders? | Has State? |
|----------|-------|----------|----------|-----------|
| **VNODE DIRECT** | ~90 | Button, Text, Input, Layout | ✅ YES | ⚠️ Optional |
| **DECORATION/STYLE** | ~70 | ButtonTheme, Colors, TextTheme | ❌ NO | ❌ NO |
| **COMPLEX POSITIONING** | ~25 | DataTable, Calendar, Carousel | ✅ YES | ⚠️ Yes |
| **DATA PROCESSING** | ~25 | TabController, TextSelection | ❌ NO | ⚠️ Maybe |

---

## 🏗️ Implementation Priority

### Phase 1: Build CATEGORY 1 (VNODE DIRECT)
These render directly to HTML and are easiest to implement.

#### Priority 1A: Basic Elements
1. Text
2. Icon
3. Container
4. Padding
5. Center
6. SizedBox

#### Priority 1B: Layouts
7. Column
8. Row
9. Flex
10. Stack
11. Positioned
12. Wrap

#### Priority 1C: Buttons
13. ElevatedButton
14. TextButton
15. OutlinedButton
16. IconButton
17. FloatingActionButton

#### Priority 1D: Inputs
18. TextField
19. Checkbox
20. Radio
21. Switch
22. Slider

#### Priority 1E: Collections
23. ListView
24. GridView
25. ListTile

#### Priority 1F: Navigation & Structure
26. AppBar
27. Scaffold
28. NavigationBar
29. Drawer
30. Card

### Phase 2: Build CATEGORY 2 (DECORATION/STYLE)
These are configuration objects used by CATEGORY 1 widgets.

### Phase 3: Build CATEGORY 3 (COMPLEX POSITIONING)
After Categories 1 & 2 are solid.

### Phase 4: Build CATEGORY 4 (DATA PROCESSING)
Utilities and helpers for other categories.

---

## 🎯 Categorization Rules

### When to use CATEGORY 1 (VNode Direct)
✅ Maps to HTML element  
✅ Simple flexbox layout  
✅ Direct event handling  
✅ No complex calculations  

### When to use CATEGORY 2 (Decoration/Style)
✅ Defines styling only  
✅ Doesn't render itself  
✅ Pure configuration  
✅ Applied to other widgets  

### When to use CATEGORY 3 (Complex Positioning)
✅ Requires layout calculations  
✅ Constraint-based sizing  
✅ Multi-pass layout  
✅ Responsive calculations  

### When to use CATEGORY 4 (Data Processing)
✅ Handles state/data  
✅ Provides logic only  
✅ No rendering  
✅ Event processing  

---

## 📝 Quick Reference

```
Button → CATEGORY 1 (renders to <button>)
ButtonTheme → CATEGORY 2 (styling config)
DataTable → CATEGORY 3 (complex layout calc)
TabController → CATEGORY 4 (state management)

AppBar → CATEGORY 1 (renders to <header>)
AppBarTheme → CATEGORY 2 (styling config)
FlexibleSpaceBar → CATEGORY 3 (collapsing logic)

TextField → CATEGORY 1 (renders to <input>)
InputDecoration → CATEGORY 2 (styling config)
InputDatePickerFormField → CATEGORY 3 (calendar calc)
TextEditingController → CATEGORY 4 (data handling)
```

---

## ✅ Complete Widget List by Category

### CATEGORY 1: VNODE DIRECT (90 widgets)
action_buttons, action_chip, animated_icons, app_bar, back_button, badge, banner, bottom_app_bar, button, button_bar, card, carousel, center, checkbox, checkbox_list_tile, choice_chip, circle_avatar, column, container, dialog, divider, drawer, drawer_header, dropdown, dropdown_menu, elevated_button, filled_button, filled_tonal_button, filter_chip, flexible_space_bar, floating_action_button, grid_tile, grid_tile_bar, icon, icon_button, image, ink_well, input_chip, list_tile, navigation_bar, navigation_drawer, navigation_rail, outlined_button, padding, page, popup_menu, radio, radio_list_tile, row, scaffold, search_bar, segmented_button, selectable_text, sized_box, snack_bar, stack, switch, switch_list_tile, tab_bar, tabs, text, text_button, text_field, text_form_field, toggle_buttons, tooltip, vertical_divider, bottom_navigation_bar, bottom_sheet, chip, close_button, drift, flex, expanded, flexible, ink_highlight, ink_response, ink_ripple, ink_splash, ink_sparkle, menu_anchor, menu_bar, menu_button, positioned, positioned_transition, refresh_indicator, row_expanded, scrollbar, search_anchor, search_view, slider, snack_bar_action, tab_controller, text_selection_toolbar, text_selection_toolbar_text_button, vertical_divider, wrapping_text

### CATEGORY 2: DECORATION/STYLE (70 widgets)
app_bar_theme, badge_theme, banner_theme, bottom_app_bar_theme, bottom_navigation_bar_theme, bottom_sheet_theme, button_bar_theme, button_style, button_theme, card_theme, checkbox_theme, chip_theme, color_scheme, colors, constants, curves, data_table_theme, dialog_theme, divider_theme, drawer_theme, elevated_button_theme, expansion_tile_theme, filled_button_theme, floating_action_button_theme, icon_button_theme, input_border, input_decorator, list_tile_theme, menu_bar_theme, menu_button_theme, menu_style, menu_theme, motion, navigation_bar_theme, navigation_drawer_theme, navigation_rail_theme, outlined_button_theme, page_transitions_theme, popup_menu_theme, progress_indicator_theme, radio_theme, scrollbar_theme, search_bar_theme, search_view_theme, segmented_button_theme, shadows, slider_theme, slider_value_indicator_shape, snack_bar_theme, switch_theme, tab_bar_theme, tab_indicator, text_button_theme, text_selection_theme, text_theme, theme, theme_data, toggle_buttons_theme, tooltip_theme, typography

### CATEGORY 3: COMPLEX POSITIONING (25 widgets)
arc, aspect_ratio, calendar_date_picker, carousel_theme, constrained_box, data_table, data_table_source, date, date_picker, date_picker_theme, expansion_panel, expansion_tile, flexible_space_bar, grid_layout, limited_box, magnifier, menu_anchor (positioning), paginated_data_table, range_slider, range_slider_parts, reorderable_list, search_anchor (positioning), sliver_app_bar, slider_parts, stepper

### CATEGORY 4: DATA PROCESSING (25 widgets)
adaptive_text_selection_toolbar, animated_icons (logic), animated_switcher, autocomplete, desktop_text_selection, desktop_text_selection_toolbar, desktop_text_selection_toolbar_button, elevation_overlay, expand_icon, input_date_picker_form_field, ink_decoration, ink_highlight (logic), ink_ripple (logic), ink_splash (logic), ink_sparkle (logic), ink_well (logic), material, material_button (logic), material_localizations, material_state, material_state_mixin, no_splash, predictive_back_page_transitions_builder, spell_check_suggestions_toolbar, spell_check_suggestions_toolbar_layout_delegate, tab_controller, text_selection, text_selection_toolbar (logic), text_selection_toolbar_text_button (logic)

---

## 🚀 Next Steps

1. ✅ Understand the 4 categories
2. ✅ Review which widgets go where
3. ✅ Start implementing CATEGORY 1 widgets
4. ✅ Build CATEGORY 2 styling configs
5. ✅ Add CATEGORY 3 positioning logic
6. ✅ Implement CATEGORY 4 data handlers

This ensures clean separation of concerns and proper build order!