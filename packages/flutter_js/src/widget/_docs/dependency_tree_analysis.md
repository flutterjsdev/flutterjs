# Flutter.js Theme System - Dependency Tree (Bottom-Up)

## Level 0: ZERO EXTERNAL REFERENCES (Leaf Nodes)
These have no other theme/util imports:

```
✅ color.js               (only needs Math)
✅ duration.js            (only numbers)
✅ alignment.js           (only enums)
✅ axis.js                (only enums)
✅ border_style.js        (only enums)
✅ box_fit.js             (only enums)
✅ clip.js                (only enums)
✅ cross_axis_alignment.js (only enums)
✅ font_weight.js         (only enums)
✅ main_axis_alignment.js (only enums)
✅ text_align.js          (only enums)
✅ text_overflow.js       (only enums)
✅ curves.dart            (only enums/functions)
✅ constants.dart         (only values)
```

## Level 1: DEPENDS ON LEVEL 0 ONLY
(Single dependency on leaf nodes)

```
offset.js
  └─ uses: number properties only (dx, dy)

size.js
  └─ uses: number properties only (width, height)

radius.js
  └─ uses: number properties

rect.js
  └─ uses: offset.js + size.js (Level 0)

box_shadow.js
  ├─ uses: color.js (Level 0)
  └─ uses: offset.js (Level 0)
```

## Level 2: DEPENDS ON LEVEL 1
(Can reference Level 0 and 1)

```
border.js
  ├─ uses: color.js (Level 0)
  ├─ uses: border_style.js (Level 0)
  └─ uses: size.js (Level 1)

border_radius.js
  ├─ uses: radius.js (Level 1)
  └─ uses: rect.js (Level 1)

linear_gradient.js
  ├─ uses: color.js (Level 0)
  ├─ uses: alignment.js (Level 0)
  ├─ uses: offset.js (Level 1)
  └─ uses: size.js (Level 1)

edge_insets.js
  └─ uses: only numbers
```

## Level 3: DEPENDS ON LEVEL 2
(Can reference Level 0, 1, 2)

```
text_style.js
  ├─ uses: color.js (Level 0)
  ├─ uses: font_weight.js (Level 0)
  ├─ uses: text_align.js (Level 0)
  ├─ uses: text_overflow.js (Level 0)
  └─ uses: numbers/strings

input_decoration.js
  ├─ uses: border.js (Level 2)
  ├─ uses: border_radius.js (Level 2)
  ├─ uses: color.js (Level 0)
  ├─ uses: text_style.js (Level 3)
  └─ uses: edge_insets.js (Level 2)
```

## Level 4: COMPONENT THEMES (Leaf - no cross-theme dependencies)
(Can reference Levels 0-3, but NOT other Component Themes)

```
colors_theme.js
  └─ uses: color.js (Level 0)
  └─ uses: color_scheme.js pattern (no import)

shadows_theme.js
  └─ uses: box_shadow.js (Level 1)

typography_theme.js
  └─ uses: text_style.js (Level 3)

motion_theme.js
  └─ uses: curves.js (Level 0)
  └─ uses: duration.js (Level 0)
```

## Level 5: SIMPLE COMPONENT THEMES
(Single simple property themes - no complex dependencies)

```
checkbox_theme.js
  ├─ uses: color.js
  ├─ uses: edge_insets.js
  └─ uses: text_style.js

radio_theme.js
  ├─ uses: color.js
  ├─ uses: edge_insets.js
  └─ uses: text_style.js

switch_theme.js
  ├─ uses: color.js
  ├─ uses: edge_insets.js
  └─ uses: text_style.js

divider_theme.js
  ├─ uses: color.js
  ├─ uses: border.js
  └─ uses: edge_insets.js

scrollbar_theme.js
  ├─ uses: color.js
  └─ uses: size.js

badge_theme.js
  ├─ uses: color.js
  ├─ uses: border_radius.js
  └─ uses: box_shadow.js

banner_theme.dart
  ├─ uses: color.js
  ├─ uses: edge_insets.js
  └─ uses: text_style.js

slider_value_indicator_shape.js
  ├─ uses: size.js
  ├─ uses: border_radius.js
  └─ uses: color.js
```

## Level 6: MEDIUM COMPONENT THEMES
(Uses Levels 0-5)

```
slider_theme.js
  ├─ uses: color.js
  ├─ uses: box_shadow.js
  ├─ uses: size.js
  └─ uses: slider_value_indicator_shape.js

tooltip_theme.js
  ├─ uses: color.js
  ├─ uses: text_style.js
  ├─ uses: border_radius.js
  └─ uses: edge_insets.js

text_selection_theme.js
  ├─ uses: color.js
  ├─ uses: text_style.js
  └─ uses: edge_insets.js

icon_button_theme.js
  ├─ uses: color.js
  ├─ uses: size.js
  └─ uses: edge_insets.js

list_tile_theme.js
  ├─ uses: color.js
  ├─ uses: text_style.js
  ├─ uses: edge_insets.js
  └─ uses: border_radius.js

snack_bar_theme.js
  ├─ uses: color.js
  ├─ uses: text_style.js
  ├─ uses: edge_insets.js
  └─ uses: border_radius.js

tab_bar_theme.js
  ├─ uses: color.js
  ├─ uses: text_style.js
  └─ uses: border.js

progress_indicator_theme.js
  ├─ uses: color.js
  └─ uses: size.js

radio_theme.js
  ├─ uses: color.js
  └─ uses: edge_insets.js

chip_theme.js
  ├─ uses: color.js
  ├─ uses: text_style.js
  ├─ uses: border_radius.js
  ├─ uses: border.js
  └─ uses: edge_insets.js

card_theme.js
  ├─ uses: color.js
  ├─ uses: border_radius.js
  ├─ uses: box_shadow.js
  ├─ uses: edge_insets.js
  └─ uses: border.js
```

## Level 7: COMPLEX COMPONENT THEMES
(Uses Levels 0-6)

```
app_bar_theme.js
  ├─ uses: text_style.js
  ├─ uses: color.js
  ├─ uses: edge_insets.js
  └─ uses: icon_button_theme.js (if referencing)

elevated_button_theme.js
  ├─ uses: color.js
  ├─ uses: text_style.js
  ├─ uses: edge_insets.js
  ├─ uses: border_radius.js
  └─ uses: box_shadow.js

filled_button_theme.js
  ├─ uses: elevated_button_theme pattern
  └─ similar to elevated_button_theme.js

outlined_button_theme.js
  ├─ uses: color.js
  ├─ uses: text_style.js
  ├─ uses: border.js
  ├─ uses: edge_insets.js
  └─ uses: border_radius.js

text_button_theme.js
  ├─ uses: color.js
  ├─ uses: text_style.js
  ├─ uses: edge_insets.js
  └─ uses: border_radius.js

floating_action_button_theme.js
  ├─ uses: color.js
  ├─ uses: text_style.js
  ├─ uses: border_radius.js
  └─ uses: box_shadow.js

dialog_theme.js
  ├─ uses: color.js
  ├─ uses: text_style.js
  ├─ uses: border_radius.js
  ├─ uses: edge_insets.js
  └─ uses: box_shadow.js

bottom_sheet_theme.js
  ├─ uses: color.js
  ├─ uses: border_radius.js
  ├─ uses: box_shadow.js
  └─ uses: edge_insets.js

bottom_navigation_bar_theme.js
  ├─ uses: color.js
  ├─ uses: text_style.js
  ├─ uses: border.js
  └─ uses: edge_insets.js

navigation_bar_theme.js
  ├─ uses: color.js
  ├─ uses: text_style.js
  └─ uses: icon_button_theme.js

navigation_rail_theme.js
  ├─ uses: color.js
  ├─ uses: text_style.js
  └─ uses: icon_button_theme.js

navigation_drawer_theme.js
  ├─ uses: color.js
  ├─ uses: text_style.js
  ├─ uses: border_radius.js
  └─ uses: edge_insets.js

drawer_theme.js
  ├─ uses: color.js
  ├─ uses: text_style.js
  ├─ uses: border_radius.js
  ├─ uses: box_shadow.js
  └─ uses: edge_insets.js
```

## Level 8: ROOT THEME (Top-level dependency)
(Uses everything)

```
theme_data.js / ThemeData
  ├─ uses: colors_theme.js
  ├─ uses: typography_theme.js
  ├─ uses: shadows_theme.js
  ├─ uses: motion_theme.js
  ├─ uses: ALL component themes (Levels 5-7)
  └─ generates CSS variables for all
```

---

## BUILD ORDER (Bottom-Up)

### Phase 1: Leaf Nodes (Zero Dependencies)
1. color.js ✅
2. duration.js ✅
3. alignment.js ✅
4. axis.js ✅
5. border_style.js ✅
6. box_fit.js ✅
7. clip.js ✅
8. cross_axis_alignment.js ✅
9. font_weight.js ✅
10. main_axis_alignment.js ✅
11. text_align.js ✅
12. text_overflow.js ✅
13. curves.js
14. constants.js

### Phase 2: Level 1 (Only Level 0)
1. offset.js ✅
2. size.js ✅
3. radius.js
4. rect.js
5. box_shadow.js ✅

### Phase 3: Level 2
1. border.js ✅
2. border_radius.js ✅
3. linear_gradient.js ✅
4. edge_insets.js ✅

### Phase 4: Level 3
1. text_style.js ✅
2. input_decoration.js ✅

### Phase 5: Level 4 (Base Themes)
1. colors_theme.js
2. shadows_theme.js
3. typography_theme.js
4. motion_theme.js

### Phase 6: Level 5 (Simple Component Themes)
1. checkbox_theme.js
2. radio_theme.js
3. switch_theme.js
4. divider_theme.js
5. scrollbar_theme.js
6. badge_theme.js
7. banner_theme.js
8. slider_value_indicator_shape.js

### Phase 7: Level 6 (Medium Component Themes)
1. slider_theme.js
2. tooltip_theme.js
3. text_selection_theme.js
4. icon_button_theme.js
5. list_tile_theme.js
6. snack_bar_theme.js
7. tab_bar_theme.js
8. progress_indicator_theme.js
9. chip_theme.js
10. card_theme.js

### Phase 8: Level 7 (Complex Component Themes)
1. elevated_button_theme.js
2. filled_button_theme.js
3. outlined_button_theme.js
4. text_button_theme.js
5. floating_action_button_theme.js
6. app_bar_theme.js
7. dialog_theme.js
8. bottom_sheet_theme.js
9. bottom_navigation_bar_theme.js
10. bottom_app_bar_theme.js
11. navigation_bar_theme.js
12. navigation_rail_theme.js
13. navigation_drawer_theme.js
14. drawer_theme.js
15. expansion_tile_theme.js
16. popup_menu_theme.js
17. search_bar_theme.js
18. menu_theme.js
19. segmented_button_theme.js
20. input_border.js
21. input_decorator.js
22. page_transitions_theme.js

### Phase 9: Level 8 (Root Theme)
1. theme_data.js / ThemeData
2. color_scheme.js
3. text_theme.js

---

## Summary

- **Start with**: Level 0-4 (Foundation)
- **Then**: Level 5-6 (Simple to Medium themes)
- **Finally**: Level 7-8 (Complex themes + ThemeData)

**Benefit**: No circular dependencies, each file can be tested independently
