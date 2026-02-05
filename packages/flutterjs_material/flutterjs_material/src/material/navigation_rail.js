// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { StatefulWidget, State } from '../core/widget_element.js';
import { Theme } from './theme.js';
import { Container } from './container.js';
import { Column, Expanded } from '../widgets/widgets.js';
import { GestureDetector } from './gesture_detector.js';
import { NavigationRailTheme } from './navigation_rail_theme.js';
import { Colors } from './color.js';
import { EdgeInsets } from '../utils/edge_insets.js';

export class NavigationRailDestination {
    constructor({
        icon,
        selectedIcon,
        label,
        padding,
        enabled = true,
    } = {}) {
        this.icon = icon;
        this.selectedIcon = selectedIcon;
        this.label = label;
        this.padding = padding;
        this.enabled = enabled;
    }
}

export class NavigationRail extends StatefulWidget {
    constructor({
        key,
        backgroundColor,
        extended = false,
        leading,
        trailing,
        destinations = [],
        selectedIndex,
        onDestinationSelected,
        elevation,
        groupAlignment,
        labelType,
        unselectedLabelTextStyle,
        selectedLabelTextStyle,
        unselectedIconTheme,
        selectedIconTheme,
        minWidth,
        minExtendedWidth,
        useIndicator,
        indicatorColor,
        indicatorShape,
    } = {}) {
        super(key);
        this.backgroundColor = backgroundColor;
        this.extended = extended;
        this.leading = leading;
        this.trailing = trailing;
        this.destinations = destinations;
        this.selectedIndex = selectedIndex;
        this.onDestinationSelected = onDestinationSelected;
        this.elevation = elevation;
        this.groupAlignment = groupAlignment;
        this.labelType = labelType;
        this.unselectedLabelTextStyle = unselectedLabelTextStyle;
        this.selectedLabelTextStyle = selectedLabelTextStyle;
        this.unselectedIconTheme = unselectedIconTheme;
        this.selectedIconTheme = selectedIconTheme;
        this.minWidth = minWidth;
        this.minExtendedWidth = minExtendedWidth;
        this.useIndicator = useIndicator;
        this.indicatorColor = indicatorColor;
        this.indicatorShape = indicatorShape;
    }

    createState() {
        return new NavigationRailState();
    }
}

class NavigationRailState extends State {
    build(context) {
        const theme = NavigationRailTheme.of(context) || {};
        const appTheme = Theme.of(context);
        const colorScheme = appTheme.colorScheme;
        const effectiveBgColor = this.widget.backgroundColor || theme.backgroundColor || colorScheme.surface || '#FFFFFF';
        const width = this.widget.extended
            ? (this.widget.minExtendedWidth || theme.minExtendedWidth || 256.0)
            : (this.widget.minWidth || theme.minWidth || 72.0);

        return new Container({
            width: width,
            color: effectiveBgColor,
            elevation: this.widget.elevation || theme.elevation,
            padding: EdgeInsets.symmetric({ vertical: 8.0 }),
            child: new Column({
                children: [
                    this.widget.leading,
                    // Expanded space if group alignment logic needed
                    new Expanded({
                        child: new Column({
                            mainAxisAlignment: 'center', // Simplified alignment
                            children: this.widget.destinations.map((destination, index) => {
                                const isSelected = index === this.widget.selectedIndex;
                                return new GestureDetector({
                                    onTap: () => this.widget.onDestinationSelected?.(index),
                                    child: new Container({
                                        padding: EdgeInsets.symmetric({ vertical: 12.0 }),
                                        // Indicator logic simpler than Bar/Drawer usually vertical pill or circle
                                        // For now simple container
                                        child: isSelected ? (destination.selectedIcon || destination.icon) : destination.icon
                                        // Add Label logic based on extended/labelType
                                    })
                                });
                            })
                        })
                    }),
                    this.widget.trailing
                ].filter(Boolean)
            })
        });
    }
}
