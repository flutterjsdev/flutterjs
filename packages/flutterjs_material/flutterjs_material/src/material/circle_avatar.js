import { StatelessWidget } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';
import { Center } from '../widgets/compoment/center.js';
import { BorderRadius } from '../utils/border_radius.js';
import { Theme } from './theme.js';
import { Colors } from './color.js';
import { BoxFit } from '../utils/utils.js';

class CircleAvatar extends StatelessWidget {
    constructor({
        key,
        child,
        backgroundColor,
        backgroundImage, // String URL or ImageProvider? Assuming String URL for web simplicity for now, or Widget.
        foregroundImage,
        onBackgroundImageError,
        onForegroundImageError,
        foregroundColor,
        radius,
        minRadius,
        maxRadius,
    } = {}) {
        super(key);
        this.child = child;
        this.backgroundColor = backgroundColor;
        this.backgroundImage = backgroundImage;
        this.foregroundImage = foregroundImage;
        this.onBackgroundImageError = onBackgroundImageError;
        this.onForegroundImageError = onForegroundImageError;
        this.foregroundColor = foregroundColor;
        this.radius = radius;
        this.minRadius = minRadius;
        this.maxRadius = maxRadius;
    }

    build(context) {
        // Theme defaults
        const theme = Theme.of(context);
        const colorScheme = theme.colorScheme;

        const effectiveBgColor = this.backgroundColor || (colorScheme ? colorScheme.primaryContainer : Colors.grey[300]); // Fallback
        const effectiveFgColor = this.foregroundColor || (colorScheme ? colorScheme.onPrimaryContainer : Colors.white);

        const effectiveRadius = this.radius || this.maxRadius || this.minRadius || 20.0;
        const diameter = effectiveRadius * 2;

        let decorationImage;
        if (this.backgroundImage) {
            // Check if string (URL) or ImageProvider concept used. Assuming string URL for simplicity in JS port often
            if (typeof this.backgroundImage === 'string') {
                decorationImage = {
                    image: `url("${this.backgroundImage}")`,
                    fit: BoxFit.cover
                };
            }
        }

        const decoration = new BoxDecoration({
            color: effectiveBgColor,
            borderRadius: BorderRadius.circular(effectiveRadius),
            image: decorationImage
        });

        // Content
        let content = this.child;
        if (content && effectiveFgColor) {
            // Wrap in text style / Icon theme ideally
            // For now just Center
            // TODO: Apply DefaultTextStyle with color
        }

        return new Container({
            width: diameter,
            height: diameter,
            decoration: decoration,
            child: new Center({ child: content })
        });
    }
}

export { CircleAvatar };
