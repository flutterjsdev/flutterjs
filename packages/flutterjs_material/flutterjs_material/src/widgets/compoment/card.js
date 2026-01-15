import { StatelessWidget } from '../../core/widget_element.js';
import { Container, BoxDecoration } from '../../material/container.js';
import { EdgeInsets, BorderRadius } from '../../utils/utils.js';
import { Colors } from '../../material/color.js';

class Card extends StatelessWidget {
    constructor({
        key = null,
        color = null,
        shadowColor = null,
        elevation = 1,
        shape = null,
        margin = null,
        clipBehavior = null,
        child = null,
        semanticContainer = true
    } = {}) {
        super(key);
        this.color = color;
        this.shadowColor = shadowColor;
        this.elevation = elevation;
        this.shape = shape;
        this.margin = margin || EdgeInsets.all(4);
        this.clipBehavior = clipBehavior;
        this.child = child;
        this.semanticContainer = semanticContainer;
    }

    build(context) {
        // Basic card implementation using Container
        const cardColor = this.color || Colors.white;
        const shadowColor = this.shadowColor || Colors.black;
        const borderRadius = this.shape?.borderRadius || BorderRadius.circular(4);

        return new Container({
            margin: this.margin,
            decoration: new BoxDecoration({
                color: cardColor,
                borderRadius: borderRadius,
                boxShadow: this.elevation > 0 ? [
                    {
                        color: 'rgba(0,0,0,0.2)',
                        offsetX: 0,
                        offsetY: 1,
                        blurRadius: 3,
                        spreadRadius: 1
                    }
                ] : []
            }),
            child: this.child
        });
    }
}

export { Card };
