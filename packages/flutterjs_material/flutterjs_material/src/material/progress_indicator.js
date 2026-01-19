import { StatelessWidget } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { ProgressIndicatorThemeData } from '../utils/progress_indicator_theme.js';
import { Color } from '../utils/color.js';

/**
 * CircularProgressIndicator - Material Design circular progress indicator
 */
class CircularProgressIndicator extends StatelessWidget {
    constructor({
        key = null,
        value = null, // null for indeterminate, 0.0-1.0 for determinate
        backgroundColor = null,
        color = null,
        valueColor = null,
        strokeWidth = 4.0,
        semanticsLabel = null,
        semanticsValue = null
    } = {}) {
        super(key);
        this.value = value;
        this.backgroundColor = backgroundColor;
        this.color = color;
        this.valueColor = valueColor;
        this.strokeWidth = strokeWidth;
        this.semanticsLabel = semanticsLabel;
        this.semanticsValue = semanticsValue;
    }

    build(context) {
        // Theme lookup would go here
        // const theme = Theme.of(context).progressIndicatorTheme;

        const isIndeterminate = this.value == null;
        const elementId = context.element?.getElementId?.() || `progress-${Date.now()}`;
        const widgetPath = context.element?.getWidgetPath?.() || 'CircularProgressIndicator';

        // Defaults
        const effectiveColor = this.color || '#2196f3'; // Material blue
        const effectiveBackgroundColor = this.backgroundColor; // Can be null

        const size = 40; // Default size
        const radius = (size - this.strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;

        // Container styles
        const containerStyles = {
            width: `${size}px`,
            height: `${size}px`,
            position: 'relative',
            display: 'inline-block'
        };

        // SVG circle for progress
        const svgProps = {
            width: size,
            height: size,
            viewBox: `0 0 ${size} ${size}`,
            style: {
                transform: 'rotate(-90deg)', // Start from top
                transition: 'transform 0.3s ease'
            }
        };

        const children = [];

        // Background circle
        if (effectiveBackgroundColor) {
            children.push(
                new VNode({
                    tag: 'circle',
                    props: {
                        cx: size / 2,
                        cy: size / 2,
                        r: radius,
                        fill: 'none',
                        stroke: effectiveBackgroundColor,
                        strokeWidth: this.strokeWidth
                    }
                })
            );
        }

        // Progress circle
        const progressColor = this.valueColor || effectiveColor;

        if (isIndeterminate) {
            // Indeterminate (spinning) mode
            const circleStyle = {
                animation: 'fjs-circular-rotate 1.4s linear infinite',
                transformOrigin: 'center'
            };

            children.push(
                new VNode({
                    tag: 'circle',
                    props: {
                        cx: size / 2,
                        cy: size / 2,
                        r: radius,
                        fill: 'none',
                        stroke: progressColor,
                        strokeWidth: this.strokeWidth,
                        strokeDasharray: `${circumference * 0.75} ${circumference * 0.25}`,
                        strokeLinecap: 'round',
                        style: circleStyle
                    }
                })
            );
        } else {
            // Determinate mode (show percentage)
            const progress = Math.max(0, Math.min(1, this.value));
            const strokeDashoffset = circumference * (1 - progress);

            children.push(
                new VNode({
                    tag: 'circle',
                    props: {
                        cx: size / 2,
                        cy: size / 2,
                        r: radius,
                        fill: 'none',
                        stroke: progressColor,
                        strokeWidth: this.strokeWidth,
                        strokeDasharray: circumference,
                        strokeDashoffset: strokeDashoffset,
                        strokeLinecap: 'round',
                        style: {
                            transition: 'stroke-dashoffset 0.3s ease'
                        }
                    }
                })
            );
        }

        const svg = new VNode({
            tag: 'svg',
            props: svgProps,
            children
        });

        const containerProps = {
            className: 'fjs-circular-progress-indicator',
            style: containerStyles,
            role: 'progressbar',
            'aria-valuenow': isIndeterminate ? undefined : Math.round(this.value * 100),
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            'aria-label': this.semanticsLabel || 'Loading',
            'data-element-id': elementId,
            'data-widget-path': widgetPath,
            'data-widget': 'CircularProgressIndicator',
            'data-indeterminate': isIndeterminate
        };

        return new VNode({
            tag: 'div',
            props: containerProps,
            children: [svg],
            key: this.key
        });
    }
}

/**
 * LinearProgressIndicator - Material Design linear progress indicator
 */
class LinearProgressIndicator extends StatelessWidget {
    constructor({
        key = null,
        value = null, // null for indeterminate, 0.0-1.0 for determinate
        backgroundColor = null,
        color = null,
        valueColor = null,
        minHeight = null,
        semanticsLabel = null,
        semanticsValue = null
    } = {}) {
        super(key);
        this.value = value;
        this.backgroundColor = backgroundColor;
        this.color = color;
        this.valueColor = valueColor;
        this.minHeight = minHeight; // Will default to theme or 4.0
        this.semanticsLabel = semanticsLabel;
        this.semanticsValue = semanticsValue;
    }

    build(context) {
        // Theme lookup
        // const theme = Theme.of(context).progressIndicatorTheme;

        const isIndeterminate = this.value == null;
        const elementId = context.element?.getElementId?.() || `linear-progress-${Date.now()}`;
        const widgetPath = context.element?.getWidgetPath?.() || 'LinearProgressIndicator';

        // Defaults
        const effectiveMinHeight = this.minHeight || 4.0;
        const effectiveColor = this.color || '#2196f3';
        const effectiveBackgroundColor = this.backgroundColor || '#e0e0e0';
        const progressColor = this.valueColor || effectiveColor;

        // Container (track) styles
        const containerStyles = {
            width: '100%',
            height: `${effectiveMinHeight}px`,
            backgroundColor: effectiveBackgroundColor,
            borderRadius: `${effectiveMinHeight / 2}px`,
            overflow: 'hidden',
            position: 'relative'
        };

        let progressBar;

        if (isIndeterminate) {
            // Indeterminate (moving bar) mode
            const barStyles = {
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: '30%',
                backgroundColor: progressColor,
                borderRadius: `${effectiveMinHeight / 2}px`,
                animation: 'fjs-linear-indeterminate 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite'
            };

            progressBar = new VNode({
                tag: 'div',
                props: {
                    className: 'fjs-linear-progress-bar',
                    style: barStyles
                }
            });
        } else {
            // Determinate mode
            const progress = Math.max(0, Math.min(1, this.value));
            const barStyles = {
                height: '100%',
                width: `${progress * 100}%`,
                backgroundColor: progressColor,
                borderRadius: `${effectiveMinHeight / 2}px`,
                transition: 'width 0.3s ease'
            };

            progressBar = new VNode({
                tag: 'div',
                props: {
                    className: 'fjs-linear-progress-bar',
                    style: barStyles
                }
            });
        }

        const containerProps = {
            className: 'fjs-linear-progress-indicator',
            style: containerStyles,
            role: 'progressbar',
            'aria-valuenow': isIndeterminate ? undefined : Math.round(this.value * 100),
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            'aria-label': this.semanticsLabel || 'Loading',
            'data-element-id': elementId,
            'data-widget-path': widgetPath,
            'data-widget': 'LinearProgressIndicator',
            'data-indeterminate': isIndeterminate
        };

        return new VNode({
            tag: 'div',
            props: containerProps,
            children: [progressBar],
            key: this.key
        });
    }
}

// Add CSS animations
if (typeof document !== 'undefined') {
    const styleId = 'fjs-progress-animations';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
        @keyframes fjs-circular-rotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
    
        @keyframes fjs-linear-indeterminate {
          0% {
            left: -30%;
          }
          50% {
            left: 100%;
          }
          100% {
            left: 100%;
          }
        }
      `;
        document.head.appendChild(style);
    }
}

export {
    CircularProgressIndicator,
    LinearProgressIndicator
};
