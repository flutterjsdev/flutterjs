import { StatefulWidget, StatelessWidget } from '../core/widget_element.js';
import { Container } from './container.js';
import { Row, Expanded, Column } from '../widgets/widgets.js';
import { GestureDetector } from './gesture_detector.js';
import { Icon } from './icon.js';
import { Text } from './text.js';
import { NavigationBarTheme } from './navigation_bar_theme.js';
import { Colors } from './color.js';
import { EdgeInsets } from '../utils/edge_insets.js';

export class NavigationBar extends StatefulWidget {
    constructor({
        key,
        animationDuration,
        selectedIndex = 0,
        destinations = [],
        onDestinationSelected,
        backgroundColor,
        elevation,
        shadowColor,
        surfaceTintColor,
        indicatorColor,
        indicatorShape,
        height,
        labelBehavior, // NavigationDestinationLabelBehavior
        overlayColor,
    } = {}) {
        super(key);
        this.animationDuration = animationDuration;
        this.selectedIndex = selectedIndex;
        this.destinations = destinations;
        this.onDestinationSelected = onDestinationSelected;
        this.backgroundColor = backgroundColor;
        this.elevation = elevation;
        this.shadowColor = shadowColor;
        this.surfaceTintColor = surfaceTintColor;
        this.indicatorColor = indicatorColor;
        this.indicatorShape = indicatorShape;
        this.height = height;
        this.labelBehavior = labelBehavior;
        this.overlayColor = overlayColor;
    }

    createState() {
        return new NavigationBarState();
    }
}

class NavigationBarState extends StatefulWidget.State {
    build(context) {
        const theme = NavigationBarTheme.of(context) || {};
        const effectiveBgColor = this.widget.backgroundColor || theme.backgroundColor || Colors.white; // Should be surfaceContainer
        const effectiveHeight = this.widget.height || theme.height || 80.0;

        return new Container({
            height: effectiveHeight,
            color: effectiveBgColor,
            elevation: this.widget.elevation || theme.elevation || 3.0,
            child: new Row({
                // alignment logic for destinations
                children: this.widget.destinations.map((destination, index) => {
                    const isSelected = index === this.widget.selectedIndex;

                    // Destination Item Implementation (Simplified)
                    // Should wrap in 'NavigationDestination' style logic
                    return new Expanded({
                        child: new GestureDetector({
                            onTap: () => this.widget.onDestinationSelected?.(index),
                            child: new Container({
                                color: 'transparent', // Hit area
                                child: new Column({
                                    mainAxisAlignment: 'center',
                                    children: [
                                        // Indicator Pill logic for Material 3
                                        new Container({
                                            padding: EdgeInsets.symmetric({ horizontal: 20, vertical: 4 }), // approximate pill
                                            decoration: isSelected ? {
                                                color: this.widget.indicatorColor || theme.indicatorColor || Colors.blue[100], // secondaryContainer
                                                borderRadius: '16px' // horizontal pill
                                            } : null,
                                            child: isSelected ? (destination.selectedIcon || destination.icon) : destination.icon
                                        }),
                                        new Container({ height: 4 }),
                                        // Label
                                        destination.label ? new Text(destination.label) : null
                                    ]
                                })
                            })
                        })
                    });
                })
            })
        });
    }
}
