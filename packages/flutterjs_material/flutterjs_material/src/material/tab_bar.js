import { StatefulWidget, StatelessWidget ,State} from '../core/widget_element.js';
import { Container } from './container.js';
import { Row, Expanded, Column } from '../widgets/widgets.js';
import { GestureDetector } from './gesture_detector.js';
import { TabController, DefaultTabController } from './tab_controller.js';
import { TabBarTheme } from './tab_bar_theme.js';
import { Colors } from './color.js';

export class Tab extends StatelessWidget {
    constructor({
        key,
        text,
        icon,
        iconMargin,
        height,
        child,
    } = {}) {
        super(key);
        this.text = text;
        this.icon = icon;
        this.iconMargin = iconMargin;
        this.height = height;
        this.child = child;
    }

    build(context) {
        // Return structured Container/Column
        return new Container({
            height: this.height || 46.0,
            alignment: 'center',
            child: new Column({
                mainAxisAlignment: 'center',
                children: [
                    this.icon,
                    this.text // Should be Text widget
                ].filter(Boolean)
            })
        });
    }
}

export class TabBar extends StatefulWidget {
    constructor({
        key,
        tabs,
        controller,
        isScrollable = false,
        padding,
        indicatorColor,
        automaticIndicatorColorAdjustment = true,
        indicatorWeight = 2.0,
        indicatorPadding,
        indicator,
        indicatorSize,
        dividerColor,
        dividerHeight,
        labelColor,
        labelStyle,
        labelPadding,
        unselectedLabelColor,
        unselectedLabelStyle,
        dragStartBehavior,
        overlayColor,
        mouseCursor,
        enableFeedback,
        onTap,
        physics,
        splashFactory,
        splashBorderRadius,
        tabAlignment,
    } = {}) {
        super(key);
        this.tabs = tabs;
        this.controller = controller;
        this.isScrollable = isScrollable;
        this.indicatorColor = indicatorColor;
        this.labelColor = labelColor;
        this.unselectedLabelColor = unselectedLabelColor;
        this.onTap = onTap;
    }

    createState() {
        return new TabBarState();
    }
}

class TabBarState extends State {

    get _controller() {
        return this.widget.controller || DefaultTabController.of(this.context);
    }

    _handleTap(index) {
        this._controller?.animateTo(index);
        this.widget.onTap?.(index);
        // Force rebuild to update selection UI if not reacting to listener
        this.setState(() => { });
    }

    initState() {
        if (this._controller) {
            this._controller.addListener(() => {
                this.setState(() => { });
            });
        }
    }

    build(context) {
        const theme = TabBarTheme.of(context) || {};
        const activeColor = this.widget.labelColor || theme.labelColor || Colors.blue;
        const inactiveColor = this.widget.unselectedLabelColor || theme.unselectedLabelColor || Colors.grey;
        const currentIndex = this._controller?.index || 0;

        return new Row({
            // If scrollable need ListView or SingleChildScrollView, for now basic Row with Expanded
            children: this.widget.tabs.map((tab, index) => {
                const isSelected = index === currentIndex;

                // Indicator logic (bottom border)
                const decoration = isSelected ? {
                    borderBottom: `2px solid ${this.widget.indicatorColor || theme.indicatorColor || activeColor}`
                } : null;

                // Color logic for child text/icon would normally be done via DefaultTextStyle/IconTheme
                // Simplified here:

                return new Expanded({
                    child: new GestureDetector({
                        onTap: () => this._handleTap(index),
                        child: new Container({
                            decoration: decoration, // Indicator
                            child: tab // The Tab widget
                            // We should probably inject color styles here into the Tab
                        })
                    })
                });
            })
        });
    }
}
