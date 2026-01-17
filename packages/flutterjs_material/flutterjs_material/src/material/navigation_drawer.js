import { StatefulWidget, StatelessWidget } from '../core/widget_element.js';
import { Container } from './container.js';
import { Column, Row, SizedBox } from '../widgets/widgets.js';
import { Drawer } from './drawer.js';
import { NavigationDrawerTheme } from './navigation_drawer_theme.js';
import { Colors } from './color.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { GestureDetector } from './gesture_detector.js';
import { Text } from './text.js';

export class NavigationDrawerDestination {
    constructor({
        icon,
        selectedIcon,
        label,
        enabled = true,
    } = {}) {
        this.icon = icon;
        this.selectedIcon = selectedIcon;
        this.label = label;
        this.enabled = enabled;
    }
}

export class NavigationDrawer extends StatelessWidget {
    constructor({
        key,
        children = [], // Can be arbitrary widgets or NavigationDrawerDestination (via helper ideally)
        // Material 3 drawer takes children directly, but assumes some structure.
        // We will assume 'children' is a mix.
        // For structured usage like NavigationBar, it often takes `selectedIndex` and `onDestinationSelected`
        // IF we are strictly following M3 API, it's `NavigationDrawer` with `children` where `NavigationDrawerDestination` is a widget.
        // But implementation simplifies if we accept `destinations` similar to NavigationBar for now OR strictly follow M3.

        // M3 NavigationDrawer API:
        // children: List<Widget>
        // selectedIndex: int?
        // onDestinationSelected: ValueChanged<int>?

        selectedIndex,
        onDestinationSelected,
        backgroundColor,
        elevation,
        shadowColor,
        surfaceTintColor,
        indicatorColor,
        indicatorShape,
        tilePadding,
    } = {}) {
        super(key);
        this.children = children;
        this.selectedIndex = selectedIndex;
        this.onDestinationSelected = onDestinationSelected;
        this.backgroundColor = backgroundColor;
        this.elevation = elevation;
        this.shadowColor = shadowColor;
        this.surfaceTintColor = surfaceTintColor;
        this.indicatorColor = indicatorColor;
        this.indicatorShape = indicatorShape;
        this.tilePadding = tilePadding;
    }

    build(context) {
        const theme = NavigationDrawerTheme.of(context) || {};
        const effectiveBgColor = this.backgroundColor || theme.backgroundColor || Colors.white; // Surface

        // We need to intercept taps on Destination widgets if they are passed as children.
        // This is tricky without a specialized Destination widget that knows its index.
        // In Flutter, NavigationDrawerDestination is a Widget.
        // Users pass them in `children`.
        // We need to iterate children and if they are Destinations, wrap them.

        let destinationIndex = 0;
        const mappedChildren = this.children.map(child => {
            if (child instanceof NavigationDrawerDestination) {
                // If the user passed raw data class instead of widget (unlikely in proper M3 api but let's handle if we defined it as such above)
                // Actually `NavigationDrawerDestination` IS a specific Widget class in Flutter M3.
                // Let's assume we implement `NavigationDrawerDestination` as a Widget below.
                return child;
            }
            // Check if it's our widget type (if JS supported robust type checks on classes/constructors easily here without import circles)
            // For now, let's assume `children` contains `NavigationDrawerDestination` widgets.

            // Wait, if passing widgets, how do we know which index corresponds to which for `selectedIndex`?
            // The `children` list contains everything including headers/dividers.
            // Only `NavigationDrawerDestination`s count towards index.

            if (child.isNavigationDrawerDestination) {
                const index = destinationIndex++;
                const isSelected = index === this.selectedIndex;

                // Inject selection state and callback
                // In JS we can clone/modify or wrap.
                // We'll wrap in a click handler that calls onDestinationSelected(index)

                return new GestureDetector({
                    onTap: () => this.onDestinationSelected?.(index),
                    child: new Container({
                        decoration: isSelected ? {
                            color: this.indicatorColor || theme.indicatorColor || Colors.blue[100],
                            borderRadius: '100px' // stadium
                        } : null,
                        child: child // The destination widget itself needs to render icon/label
                    })
                });
            }
            return child;
        });

        return new Drawer({
            backgroundColor: effectiveBgColor,
            elevation: this.elevation,
            child: new Column({
                children: mappedChildren
            })
        });
    }
}

// We redefine NavigationDrawerDestination as a StatelessWidget to be used in children
export class NavigationDrawerDestinationWidget extends StatelessWidget {
    constructor({
        key,
        icon,
        selectedIcon,
        label,
        enabled = true,
    } = {}) {
        super(key);
        this.icon = icon;
        this.selectedIcon = selectedIcon;
        this.label = label;
        this.enabled = enabled;
        this.isNavigationDrawerDestination = true; // Marker
    }

    build(context) {
        // Simple row with icon and text
        return new Container({
            height: 56, // Standard height
            padding: EdgeInsets.symmetric({ horizontal: 16 }), // Standard padding
            child: new Row({
                children: [
                    this.icon,
                    new SizedBox({ width: 12 }),
                    this.label
                ]
            })
        });
    }
}
