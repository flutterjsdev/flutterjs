import { StatelessWidget } from '../core/widget_element.js';
import { GestureDetector } from './gesture_detector.js';
import { Container } from './container.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { Center } from '../widgets/compoment/center.js';
import { IconTheme } from './icon_theme.js';
import { IconThemeData } from './icon.js';

/**
 * IconButton - A Material Design icon button.
 * 
 * An icon button is a picture printed on a Material widget that reacts to touches
 * by filling with color (ink).
 */
export class IconButton extends StatelessWidget {
    constructor({
        key,
        iconSize = 24.0,
        padding = EdgeInsets.all(8.0),
        alignment,
        icon,
        color,
        focusColor,
        hoverColor,
        highlightColor,
        splashColor,
        disabledColor,
        onPressed,
        mouseCursor,
        focusNode,
        autofocus = false,
        tooltip,
        enableFeedback = true,
        constraints,
    } = {}) {
        super({ key });
        this.iconSize = iconSize;
        this.padding = padding;
        this.alignment = alignment;
        this.icon = icon;
        this.color = color;
        this.focusColor = focusColor;
        this.hoverColor = hoverColor;
        this.highlightColor = highlightColor;
        this.splashColor = splashColor;
        this.disabledColor = disabledColor;
        this.onPressed = onPressed;
        this.mouseCursor = mouseCursor;
        this.focusNode = focusNode;
        this.autofocus = autofocus;
        this.tooltip = tooltip;
        this.enableFeedback = enableFeedback;
        this.constraints = constraints;
    }

    build(context) {
        // Retrieve parent theme to inherit properties (e.g. from AppBar)
        const parentTheme = IconTheme.of(context) || new IconThemeData({ size: 24.0, color: null });

        // Merge with IconButton specific overrides
        // If this.color is undefined, it preserves parentTheme.color
        const mergedThemeData = parentTheme.copyWith({
            color: this.color,
            size: this.iconSize
        });

        return new GestureDetector({
            onTap: this.onPressed,
            child: new Container({
                padding: this.padding,
                child: new Center({
                    child: new IconTheme({
                        data: mergedThemeData,
                        child: this.icon
                    })
                })
            })
        });
    }
}
