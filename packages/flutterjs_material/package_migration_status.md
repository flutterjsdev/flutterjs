# Package Migration Status & Task List

This document tracks the migration status of each export provided in the requirements.

**Legend:**
- [x] **Done**: Implemented in `flutterjs_material` or relevant package.
- [ ] **Pending**: Implementation needed.
- [-] **Skipped**: Not planned for initial web release (e.g., specific mobile interactions or low-level native bindings).

## 📦 Library: `animation`
*Core animation primitives. Status: **0% - Not Implemented***

- [ ] `src/animation/animation.dart`
- [ ] `src/animation/animation_controller.dart`
- [ ] `src/animation/curves.dart`
- [ ] `src/animation/tween.dart`
- [ ] `src/animation/animation_style.dart`
- [ ] `src/animation/animations.dart`
- [ ] `src/animation/listener_helpers.dart`
- [ ] `src/animation/tween_sequence.dart`


---

## 📦 Library: `cupertino`
*iOS-style widgets. Status: **0% - New Package Required (`flutterjs_cupertino`)***

### Activity & Alerts (Priority: Medium)
- [ ] `src/cupertino/activity_indicator.dart`
- [ ] `src/cupertino/dialog.dart`
- [ ] `src/cupertino/sheet.dart` (`CupertinoActionSheet`)
- [ ] `src/cupertino/context_menu.dart`

### Buttons & Controls (Priority: High)
- [ ] `src/cupertino/button.dart` (`CupertinoButton`)
- [ ] `src/cupertino/switch.dart`
- [ ] `src/cupertino/slider.dart`
- [ ] `src/cupertino/checkbox.dart`
- [ ] `src/cupertino/radio.dart` (`CupertinoRadio`)
- [ ] `src/cupertino/segmented_control.dart`
- [ ] `src/cupertino/sliding_segmented_control.dart`

### Navigation (Priority: High)
- [ ] `src/cupertino/app.dart` (`CupertinoApp`)
- [ ] `src/cupertino/nav_bar.dart` (`CupertinoNavigationBar`)
- [ ] `src/cupertino/bottom_tab_bar.dart`
- [ ] `src/cupertino/tab_scaffold.dart`
- [ ] `src/cupertino/tab_view.dart`
- [ ] `src/cupertino/page_scaffold.dart`
- [ ] `src/cupertino/route.dart` (`CupertinoPageRoute`)

### Text & Inputs (Priority: High)
- [ ] `src/cupertino/text_field.dart`
- [ ] `src/cupertino/search_field.dart`
- [ ] `src/cupertino/context_menu_action.dart`
- [ ] `src/cupertino/form_row.dart`
- [ ] `src/cupertino/form_section.dart`

### Pickers (Priority: Medium)
- [ ] `src/cupertino/date_picker.dart`
- [ ] `src/cupertino/picker.dart`

### Other
- [ ] `src/cupertino/colors.dart`
- [ ] `src/cupertino/constants.dart`
- [ ] `src/cupertino/icon_theme_data.dart`
- [ ] `src/cupertino/icons.dart`
- [ ] `src/cupertino/interface_level.dart`
- [ ] `src/cupertino/localizations.dart`
- [ ] `src/cupertino/refresh.dart` (`CupertinoSliverRefreshControl`)
- [ ] `src/cupertino/scrollbar.dart`
- [ ] `src/cupertino/thumb_painter.dart`
- [ ] `src/cupertino/theme.dart`
- [ ] `src/cupertino/text_theme.dart`

---

## 📦 Library: `foundation`
*Core utilities. Status: **~15% - Only runtime basics implemented***

**Implemented in `flutterjs_runtime`:**
- [x] `src/foundation/key.dart` ([Key](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_runtime/flutterjs_runtime/src/key.js#9-16), [ValueKey](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_runtime/flutterjs_runtime/src/key.js#17-31), [ObjectKey](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_runtime/flutterjs_runtime/src/key.js#32-46), [GlobalKey](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_runtime/flutterjs_runtime/src/key.js#47-74) in [runtime/src/key.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_runtime/flutterjs_runtime/src/key.js))
- [x] `src/foundation/change_notifier.dart` ([ChangeNotifier](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_runtime/flutterjs_runtime/src/inherited_element.js#488-556), [ValueNotifier](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_runtime/flutterjs_runtime/src/inherited_element.js#562-611) in [runtime/src/inherited_element.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_runtime/flutterjs_runtime/src/inherited_element.js))

**Pending:**
- [ ] `src/foundation/basic_types.dart` (`VoidCallback`, etc.)
- [ ] `src/foundation/platform.dart` (Web platform checks)
- [ ] `src/foundation/print.dart` (Console logging wrapper)
- [ ] `src/foundation/annotations.dart`
- [ ] `src/foundation/binding.dart`
- [ ] `src/foundation/serialization.dart`
- [ ] `src/foundation/debug.dart` (`kDebugMode`)

**Skipped (not applicable to web/JS):**
- [-] `src/foundation/isolates.dart` (No isolates in browser JS)
- [-] `src/foundation/memory_allocations.dart` (No manual memory management)


---

## 📦 Library: `material`
*Material Design widgets. Status: **~20% - Significant Widget Gaps***

### App Structure (Priority: High)
- [x] `src/material/app.dart` (`MaterialApp` -> [material_app.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_material/flutterjs_material/src/material/material_app.js))
- [x] `src/material/scaffold.dart` (`Scaffold` -> [scffold_basic.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_material/flutterjs_material/src/material/scffold_basic.js))
- [ ] `src/material/app_bar.dart` (`AppBar`) - *Missing standalone file, check Scaffold integration*
- [ ] `src/material/drawer.dart`
- [ ] `src/material/bottom_navigation_bar.dart`
- [ ] `src/material/tab_controller.dart`
- [ ] `src/material/tabs.dart` (`TabBar`, `TabBarView`)

### Buttons (Priority: High)
- [x] `src/material/elevated_button.dart` ([elevated_button.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_material/flutterjs_material/src/material/elevated_button.js))
- [x] `src/material/floating_action_button.dart` ([floating_action_button.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_material/flutterjs_material/src/material/floating_action_button.js))
- [ ] `src/material/text_button.dart`
- [ ] `src/material/outlined_button.dart`
- [ ] `src/material/icon_button.dart`
- [ ] `src/material/filled_button.dart`
- [ ] `src/material/material_button.dart`

### Display & Layout (Priority: High)
- [x] [src/material/icon.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_material/flutterjs_material/src/material/icon.js) (Mapped to [icon.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_material/flutterjs_material/src/material/icon.js))
- [x] `src/material/card.dart` ([card.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_material/flutterjs_material/src/widgets/compoment/card.js))
- [x] `src/material/divider.dart` ([divider.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_material/flutterjs_material/src/widgets/compoment/divider.js))
- [x] `src/material/list_tile.dart` (Related: [list_view.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_material/flutterjs_material/src/material/list_view.js) exists, `list_tile.js` missing?)
- [x] `src/material/material.dart` (`Material` related logic in [material.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_material/flutterjs_material/src/material/material.js))
- [ ] `src/material/circle_avatar.dart`
- [ ] `src/material/chip.dart`
- [ ] `src/material/badge.dart`
- [ ] `src/material/toolip.dart`
- [ ] `src/material/snack_bar.dart`
- [ ] `src/material/progress_indicator.dart` (`CircularProgressIndicator`, `LinearProgressIndicator`)

### Inputs & Forms (Priority: High)
- [ ] `src/material/text_field.dart`
- [ ] `src/material/text_form_field.dart`
- [ ] `src/material/input_decorator.dart`
- [ ] `src/material/checkbox.dart`
- [ ] `src/material/radio.dart`
- [ ] `src/material/switch.dart`
- [ ] `src/material/slider.dart`
- [ ] `src/material/dropdown.dart`

### Dialogs & Overlays (Priority: Medium)
- [ ] `src/material/dialog.dart` (`AlertDialog`, `SimpleDialog`)
- [ ] `src/material/bottom_sheet.dart`
- [ ] `src/material/banner.dart`

### Theming (Priority: high)
- [x] `src/material/color_scheme.dart` ([color_scheme.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_material/flutterjs_material/src/material/color_scheme.js))
- [x] `src/material/colors.dart` (`colors.js`)
- [ ] `src/material/theme.dart` (Full `ThemeData` support pending)
- [ ] `src/material/typography.dart`

### Advanced / Other (Priority: Low)
- [ ] `src/material/data_table.dart`
- [ ] `src/material/stepper.dart`
- [ ] `src/material/date_picker.dart`
- [ ] `src/material/time_picker.dart`
- [ ] `src/material/search.dart`
- [ ] `src/material/autocomplete.dart`
- [ ] `src/material/expansion_tile.dart`
- [ ] `src/material/popup_menu.dart`

---

## 📦 Library: `widgets`
*General purpose widgets. Status: **~40%***

### Layout/Painting
- [x] `src/widgets/basic.dart` (Includes `Row`, `Column`, `Padding`, `Center`, `Align`)
- [x] `src/widgets/container.dart` ([container.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_material/flutterjs_material/src/material/container.js))
- [x] `src/widgets/image.dart` ([image.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_material/flutterjs_material/src/material/image.js))
- [x] `src/widgets/text.dart` ([text.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_runtime/flutterjs_runtime/src/build_context.js))
- [x] `src/widgets/layout_builder.dart` (Implied/Pending explicit file)
- [x] `src/widgets/stack.dart` ([stack.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_material/flutterjs_material/src/widgets/compoment/stack.js), [positioned.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_material/flutterjs_material/src/widgets/compoment/positioned.js))
- [x] `src/widgets/transform.dart` ([transform.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_material/flutterjs_material/src/widgets/compoment/transform.js))
- [x] `src/widgets/media_query.dart` (Needed for responsive apps)

### Interaction
- [x] `src/widgets/gesture_detector.dart` ([gesture_detector.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_material/flutterjs_material/src/material/gesture_detector.js))
- [ ] `src/widgets/scroll_view.dart` (Partial `ListView` in material, need generic)
- [ ] `src/widgets/interactive_viewer.dart`
- [ ] `src/widgets/draggable_scrollable_sheet.dart`

### Navigation
- [x] `src/widgets/navigator.dart` ([navigator.js](file:///c:/Jay/_Plugin/flutterjs/packages/flutterjs_material/flutterjs_material/src/widgets/navigator.js))
- [ ] `src/widgets/routes.dart`
- [ ] `src/widgets/overlay.dart`

### Async
- [ ] `src/widgets/async.dart` (`FutureBuilder`, `StreamBuilder`)

---

## 📦 Library: `services`
- [ ] `src/services/clipboard.dart`
- [ ] `src/services/haptic_feedback.dart`
- [ ] `src/services/system_chrome.dart` (Title, meta tags)
- [ ] `src/services/asset_bundle.dart` (Image loading)

## 📦 Library: `painting`
- [x] `src/painting/alignment.dart`
- [x] `src/painting/edge_insets.dart`
- [x] `src/painting/box_decoration.dart`
- [x] `src/painting/text_style.dart`
- [x] `src/painting/colors.dart`
- [ ] `src/painting/gradient.dart`
- [ ] `src/painting/borders.dart` (`BorderRadius`, `BoxBorder`) - *Partially done in CSS logic*

## 📦 Library: `gestures`
- [x] `src/gestures/tap.dart` (`TapGestureRecognizer`)
- [ ] `src/gestures/drag.dart`
- [ ] `src/gestures/scale.dart`
