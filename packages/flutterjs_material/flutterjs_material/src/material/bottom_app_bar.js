import { StatelessWidget } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';
import { Row } from '../widgets/widgets.js';
import { MainAxisAlignment, MainAxisSize } from '../utils/utils.js';
import { BottomAppBarTheme } from './bottom_app_bar_theme.js';

export class BottomAppBar extends StatelessWidget {
    constructor({
        key,
        color,
        elevation,
        shape,
        clipBehavior,
        notchMargin,
        child,
        padding,
        surfaceTintColor,
        shadowColor,
        height,
    } = {}) {
        super(key);
        this.color = color;
        this.elevation = elevation;
        this.shape = shape;
        this.clipBehavior = clipBehavior;
        this.notchMargin = notchMargin;
        this.child = child;
        this.padding = padding;
        this.surfaceTintColor = surfaceTintColor;
        this.shadowColor = shadowColor;
        this.height = height;
    }

    build(context) {
        // Theme lookup not fully implemented in system yet, stubbing or using passed values
        // const theme = BottomAppBarTheme.of(context);

        // Default styling
        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;

        const effectiveHeight = this.height || 80.0;
        const effectiveColor = this.color || colorScheme.surfaceContainer || '#F3EDF7';
        const effectiveElevation = this.elevation || 8.0;

        return new Container({
            padding: this.padding,
            color: effectiveColor,
            height: effectiveHeight,
            // BoxShadow for elevation stub
            style: {
                boxShadow: `0px -2px ${effectiveElevation}px rgba(0,0,0,0.1)`,
                // Shape/Notch handling would go here with SVG clip-path or complex CSS.
                // For now, just a bar.
            },
            child: this.child
        });
    }
}
