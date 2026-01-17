import { StatelessWidget } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { BorderRadius } from '../utils/border_radius.js';
import { CardTheme } from './card_theme.js';
import { Colors } from './color.js';

class Card extends StatelessWidget {
    constructor({
        key,
        color,
        shadowColor,
        surfaceTintColor,
        elevation,
        shape,
        borderOnForeground = true,
        margin,
        clipBehavior,
        child,
        semanticContainer = true
    } = {}) {
        super(key);
        this.color = color;
        this.shadowColor = shadowColor;
        this.surfaceTintColor = surfaceTintColor;
        this.elevation = elevation;
        this.shape = shape;
        this.borderOnForeground = borderOnForeground;
        this.margin = margin;
        this.clipBehavior = clipBehavior;
        this.child = child;
        this.semanticContainer = semanticContainer;
    }

    build(context) {
        const theme = CardTheme.of(context) || {};

        const effectiveColor = this.color || theme.color || Colors.white;
        const effectiveShadowColor = this.shadowColor || theme.shadowColor || Colors.black;
        const effectiveElevation = this.elevation ?? theme.elevation ?? 1;
        const effectiveShape = this.shape || theme.shape || { borderRadius: BorderRadius.circular(4) }; // Simplified shape handling
        const effectiveMargin = this.margin || theme.margin || EdgeInsets.all(4);
        const effectiveClipBehavior = this.clipBehavior || theme.clipBehavior;

        // Shadow simulation
        const boxShadow = effectiveElevation > 0 ? [{
            color: 'rgba(0,0,0,0.2)', // Simplification of shadowColor logic
            offsetX: 0,
            offsetY: 1,
            blurRadius: 3,
            spreadRadius: 1
        }] : [];

        // Apply style to Container
        const decoration = new BoxDecoration({
            color: effectiveColor,
            borderRadius: effectiveShape.borderRadius, // Assuming shape has borderRadius for now
            boxShadow: boxShadow
        });

        return new Container({
            margin: effectiveMargin,
            decoration: decoration,
            clipBehavior: effectiveClipBehavior,
            child: this.child
        });
    }
}

export { Card };
