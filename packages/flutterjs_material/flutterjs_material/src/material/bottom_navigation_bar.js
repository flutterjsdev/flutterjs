// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, StatelessWidget } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';
import { Row, Column, Expanded, SizedBox } from '../widgets/widgets.js';
import { Icon } from './icon.js';
import { Text } from './text.js';
import { GestureDetector } from './gesture_detector.js';
import { MainAxisAlignment, CrossAxisAlignment, MainAxisSize } from '../utils/utils.js';
import { BottomNavigationBarTheme } from './bottom_navigation_bar_theme.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { Theme } from './theme.js';

const BottomNavigationBarType = {
    fixed: 'fixed',
    shifting: 'shifting',
};

class BottomNavigationBarItem {
    constructor({
        icon,
        label,
        activeIcon,
        backgroundColor,
        tooltip
    } = {}) {
        this.icon = icon;
        this.label = label;
        this.activeIcon = activeIcon || icon;
        this.backgroundColor = backgroundColor;
        this.tooltip = tooltip;
    }
}

class BottomNavigationBar extends StatelessWidget {
    constructor({
        key,
        items = [],
        onTap,
        currentIndex = 0,
        elevation,
        type,
        fixedColor,
        backgroundColor,
        iconSize = 24.0,
        selectedItemColor,
        unselectedItemColor,
        selectedIconTheme,
        unselectedIconTheme,
        selectedFontSize = 14.0,
        unselectedFontSize = 12.0,
        selectedLabelStyle,
        unselectedLabelStyle,
        showSelectedLabels = true,
        showUnselectedLabels,
        mouseCursor,
        enableFeedback = true,
        landscapeLayout,
    } = {}) {
        super(key);
        this.items = items;
        this.onTap = onTap;
        this.currentIndex = currentIndex;
        this.elevation = elevation;
        this.type = type;
        this.fixedColor = fixedColor;
        this.backgroundColor = backgroundColor;
        this.iconSize = iconSize;
        this.selectedItemColor = selectedItemColor;
        this.unselectedItemColor = unselectedItemColor;
        this.selectedIconTheme = selectedIconTheme;
        this.unselectedIconTheme = unselectedIconTheme;
        this.selectedFontSize = selectedFontSize;
        this.unselectedFontSize = unselectedFontSize;
        this.selectedLabelStyle = selectedLabelStyle;
        this.unselectedLabelStyle = unselectedLabelStyle;
        this.showSelectedLabels = showSelectedLabels;
        this.showUnselectedLabels = showUnselectedLabels;
        this.mouseCursor = mouseCursor;
        this.enableFeedback = enableFeedback;
        this.landscapeLayout = landscapeLayout;
    }

    build(context) {
        const theme = BottomNavigationBarTheme.of(context) || {};
        const appTheme = Theme.of(context);
        const colorScheme = appTheme.colorScheme;

        const effectiveType = this.type || theme.type || BottomNavigationBarType.fixed;
        const effectiveBgColor = this.backgroundColor || theme.backgroundColor || colorScheme.surfaceContainer || '#F3EDF7';
        const effectiveElevation = this.elevation ?? theme.elevation ?? 8.0;
        const effectiveSelectedItemColor = this.selectedItemColor || theme.selectedItemColor || this.fixedColor || colorScheme.primary || '#6750A4';
        const effectiveUnselectedItemColor = this.unselectedItemColor || theme.unselectedItemColor || colorScheme.onSurfaceVariant || '#49454F';

        // Show unselected labels defaults to true for fixed, false for shifting
        const effectiveShowUnselectedLabels = this.showUnselectedLabels ?? theme.showUnselectedLabels ?? (effectiveType === BottomNavigationBarType.fixed);

        const children = this.items.map((item, index) => {
            const isSelected = index === this.currentIndex;
            const itemColor = isSelected ? effectiveSelectedItemColor : effectiveUnselectedItemColor;
            const icon = isSelected ? item.activeIcon : item.icon;

            // Should apply IconTheme overriding size/color if not locally set on Icon
            // For now, simpler implementation:
            // We can't easily mutate the Icon widget instance if it's already created.
            // But we can wrap it or assume it respects hierarchical theme if we implemented it.
            // Or we just rely on the user passing correct icons, 
            // BUT standard flutter overrides color/size. 
            // In FlutterJS Icon.js, it might check context? 
            // Yes `_getIconTheme(context)` in `Icon.js`.
            // So we should ideally wrap each item in an `IconTheme`.

            // For simplistic approach (as we are building MVP of these widgets):

            return new Expanded({
                child: new GestureDetector({
                    onTap: () => this.onTap && this.onTap(index),
                    child: new Container({
                        color: 'transparent', // Hit test
                        padding: EdgeInsets.symmetric({ vertical: 8.0 }),
                        child: new Column({
                            mainAxisSize: MainAxisSize.min,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                                // Icon Wrapper to enforce color
                                new Container({
                                    style: { color: itemColor }, // CSS inheritance for icon text/svg if compatible
                                    child: icon
                                }),
                                (isSelected && this.showSelectedLabels) || (!isSelected && effectiveShowUnselectedLabels)
                                    ? new Container({
                                        margin: EdgeInsets.only({ top: 4.0 }),
                                        child: new Text(item.label || '', {
                                            style: {
                                                color: itemColor,
                                                fontSize: isSelected ? `${this.selectedFontSize}px` : `${this.unselectedFontSize}px`,
                                                fontWeight: isSelected ? '500' : '400'
                                            }
                                        })
                                    })
                                    : new SizedBox()
                            ]
                        })
                    })
                })
            });
        });

        return new Container({
            color: effectiveBgColor,
            height: 56.0 + (this.showSelectedLabels || effectiveShowUnselectedLabels ? 0 : 0), // 56 standard, adjust for labels? 
            // Standard height is usually 56, sometimes more with labels. 
            // Let's rely on flex/padding.
            style: {
                boxShadow: `0px -1px ${effectiveElevation}px rgba(0,0,0,0.1)`,
                display: 'flex', // Container supports this but explicit checking
                zIndex: 8,
            },
            child: new Row({
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: children
            })
        });
    }
}

export {
    BottomNavigationBar,
    BottomNavigationBarItem,
    BottomNavigationBarType
};
