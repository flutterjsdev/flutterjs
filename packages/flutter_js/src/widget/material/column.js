// @flutterjs/material/src/layout/Column.js

import { Widget, StatelessWidget } from '../../core/widget.js';
import { VNode } from '../../vdom/vnode.js';
import { MainAxisAlignment, CrossAxisAlignment, MainAxisSize, VerticalDirection } from '../utils/utils.js';

const LAYOUT_CLASSES = {
    base: 'fjs-column',
    mainAxis: (alignment) => `fjs-main-${alignment}`,
    crossAxis: (alignment) => `fjs-cross-${alignment}`,
    size: {
        min: 'fjs-column-min',
        max: 'fjs-column-max'
    }
};

const TEXT_DIRECTION_MAP = {
    rtl: 'rtl',
    ltr: 'ltr'
};

const BASELINE_MAP = {
    alphabetic: 'baseline',
    default: 'first baseline'
};

export function Column({
    key,
    children = [],
    mainAxisAlignment = MainAxisAlignment.start,
    crossAxisAlignment = CrossAxisAlignment.center,
    mainAxisSize = MainAxisSize.max,
    verticalDirection = VerticalDirection.down,
    textDirection,
    textBaseline
}) {
    return new _Column({
        key,
        children,
        mainAxisAlignment,
        crossAxisAlignment,
        mainAxisSize,
        verticalDirection,
        textDirection,
        textBaseline
    });
}

class _Column extends StatelessWidget {
    constructor({
        key,
        children,
        mainAxisAlignment,
        crossAxisAlignment,
        mainAxisSize,
        verticalDirection,
        textDirection,
        textBaseline
    }) {
        super(key);
        this.children = children;
        this.mainAxisAlignment = mainAxisAlignment;
        this.crossAxisAlignment = crossAxisAlignment;
        this.mainAxisSize = mainAxisSize;
        this.verticalDirection = verticalDirection;
        this.textDirection = textDirection;
        this.textBaseline = textBaseline;
    }

    build(context) {
        const { cssClass, inlineStyles } = this._computeStyles();
        const processedChildren = this._processChildren(context);

        // Get element ID from context for unique identification
        const elementId = context.element.getElementId();
        const widgetPath = context.element.getWidgetPath();

        return new VNode({
            tag: 'div',
            props: {
                class: cssClass,
                style: inlineStyles,
                'data-element-id': elementId,        // Flutter-style unique ID
                'data-widget-path': widgetPath,      // Debug: full path
                'data-identification': context.element.getIdentificationStrategy(), // keyed or unkeyed
                'data-widget': 'Column',
                'data-main-axis': this.mainAxisAlignment,
                'data-cross-axis': this.crossAxisAlignment
            },
            children: processedChildren,
            key: this.key
        });
    }

    /**
     * Process children - handle widgets, vnodes, and primitives
     */
    _processChildren(context) {
        if (!this.children || this.children.length === 0) {
            return [];
        }

        const childList = this._shouldReverseChildren()
            ? [...this.children].reverse()
            : this.children;

        return childList
            .map((child, index) => this._buildChild(child, context, index))
            .filter(child => child !== null);
    }

    /**
     * Check if children should be reversed based on vertical direction
     */
    _shouldReverseChildren() {
        return this.verticalDirection === VerticalDirection.up;
    }

    /**
     * Build a single child widget/element
     */
    _buildChild(child, context, index) {
        if (child === null || child === undefined) {
            return null;
        }

        // Widget instances - build them
        if (child instanceof Widget) {
            return child.build(context);
        }

        // VNode instances - already built
        if (child instanceof VNode) {
            return child;
        }

        // Primitive values (strings, numbers, booleans) - return as-is
        return child;
    }

    /**
     * Compute all styles for the column
     */
    _computeStyles() {
        return {
            cssClass: this._getLayoutClasses().join(' '),
            inlineStyles: this._getInlineStyles()
        };
    }

    /**
     * Get CSS classes for layout
     */
    _getLayoutClasses() {
        const classes = [LAYOUT_CLASSES.base];

        classes.push(LAYOUT_CLASSES.mainAxis(this.mainAxisAlignment));
        classes.push(LAYOUT_CLASSES.crossAxis(this.crossAxisAlignment));

        const sizeClass = this.mainAxisSize === MainAxisSize.min
            ? LAYOUT_CLASSES.size.min
            : LAYOUT_CLASSES.size.max;
        classes.push(sizeClass);

        return classes;
    }

    /**
     * Get inline styles for dynamic properties
     */
    _getInlineStyles() {
        const styles = {};

        if (this.textDirection) {
            styles.direction = TEXT_DIRECTION_MAP[this.textDirection] || this.textDirection;
        }

        if (this._shouldApplyBaseline()) {
            styles.alignItems = BASELINE_MAP[this.textBaseline] || BASELINE_MAP.default;
        }

        return styles;
    }

    /**
     * Check if baseline alignment should be applied
     */
    _shouldApplyBaseline() {
        return this.crossAxisAlignment === CrossAxisAlignment.baseline && this.textBaseline;
    }
}

export { _Column };