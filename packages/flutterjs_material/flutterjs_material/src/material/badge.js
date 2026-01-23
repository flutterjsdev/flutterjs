import { StatelessWidget } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';
import { Center } from '../widgets/compoment/center.js';
import { Stack, Positioned } from '../widgets/compoment/stack.js';
import { BorderRadius } from '../utils/border_radius.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { BadgeTheme } from './badge_theme.js';
import { Alignment } from '../utils/utils.js';
import { Text } from './text.js';

export class Badge extends StatelessWidget {
    constructor({
        key,
        backgroundColor,
        textColor,
        smallSize,
        largeSize,
        textStyle,
        padding,
        alignment,
        offset,
        label,
        isLabelVisible = true,
        child,
    } = {}) {
        super(key);
        this.backgroundColor = backgroundColor;
        this.textColor = textColor;
        this.smallSize = smallSize;
        this.largeSize = largeSize;
        this.textStyle = textStyle;
        this.padding = padding;
        this.alignment = alignment;
        this.offset = offset;
        this.label = label;
        this.isLabelVisible = isLabelVisible;
        this.child = child;
    }

    build(context) {
        if (!this.child) {
            // Standalone badge
            return this._buildBadge(context);
        }

        // Wrap child in stack
        return new Stack({
            clipBehavior: 'none',
            alignment: this.alignment || Alignment.topRight,
            children: [
                this.child,
                this.isLabelVisible ? new Positioned({
                    // Todo: Apply offset properly
                    top: this.offset ? this.offset.dy : -4,
                    right: this.offset ? -this.offset.dx : -4,
                    child: this._buildBadge(context)
                }) : new Container() // Placeholder for invisible
            ]
        });
    }

    _buildBadge(context) {
        // Theme lookup
        const theme = BadgeTheme.of(context) || {};
        const appTheme = Theme.of(context);
        const colorScheme = appTheme.colorScheme;

        const bgColor = this.backgroundColor || theme.backgroundColor || colorScheme.error || '#B3261E'; // Error/Red color default
        const txtColor = this.textColor || theme.textColor || colorScheme.onError || '#FFFFFF';

        // Size
        // If label is null/undefined or empty, it's a small badge (dot)
        const isSmall = !this.label;
        const size = isSmall
            ? (this.smallSize || theme.smallSize || 6.0)
            : (this.largeSize || theme.largeSize || 16.0);

        // Padding
        const effectivePadding = this.padding || theme.padding || (isSmall ? EdgeInsets.all(0) : EdgeInsets.symmetric({ horizontal: 4 }));

        if (isSmall) {
            return new Container({
                width: size,
                height: size,
                decoration: new BoxDecoration({
                    color: bgColor,
                    borderRadius: BorderRadius.circular(size),
                })
            });
        }

        return new Container({
            height: size,
            minWidth: size,
            padding: effectivePadding,
            alignment: Alignment.center,
            decoration: new BoxDecoration({
                color: bgColor,
                borderRadius: BorderRadius.circular(size),
            }),
            child: this.label // Assuming label is a Widget or can be text
        });
    }
}
