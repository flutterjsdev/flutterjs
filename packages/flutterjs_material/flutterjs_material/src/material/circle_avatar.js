import { StatelessWidget } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';
import { Center } from '../widgets/compoment/center.js';
import { BorderRadius } from '../utils/border_radius.js';
import { Theme } from './theme.js';
import { Colors } from './color.js';
import { BoxFit } from '../utils/utils.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { buildChildWidget } from '../utils/build_helper.js';

import { SizedBox } from '../widgets/compoment/sized_box.js';

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

        const effectiveBgColor = this.backgroundColor || colorScheme.primaryContainer || '#EADDFF';
        const effectiveFgColor = this.foregroundColor || colorScheme.onPrimaryContainer || '#21005D';

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
            // Wrap in text style wrapper to enforce color inheritance
            // Handle Color object vs string
            const cssColor = typeof effectiveFgColor.toCSSString === 'function'
                ? effectiveFgColor.toCSSString()
                : effectiveFgColor;

            content = new _TextStyleWrapper({
                child: content,
                style: { color: cssColor }
            });
        }

        // Wrap in SizedBox to prevent shrinking in Flex layouts (this fixes the oval issue)
        return new SizedBox({
            width: diameter,
            height: diameter,
            child: new Container({
                width: diameter,
                height: diameter,
                decoration: decoration,
                child: new Center({ child: content })
            })
        });
    }
}

class _TextStyleWrapper extends StatelessWidget {
    constructor({ key, child, style }) {
        super(key);
        this.child = child;
        this.style = style;
    }

    build(context) {
        return new VNode({
            tag: 'div',
            props: {
                style: {
                    display: 'flex', // Ensure center alignment works if parent is center
                    width: '100%',
                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                    ...this.style
                }
            },
            children: [buildChildWidget(this.child, context)]
        });
    }
}



export { CircleAvatar };
