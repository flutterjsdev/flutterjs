import { Widget, StatelessWidget } from '../../core/widget.js';
import { VNode } from '../../vdom/vnode.js';
import { MainAxisAlignment, CrossAxisAlignment, MainAxisSize, HorizontalDirection } from '../utils/utils.js';

const LAYOUT_CLASSES = {
    base: 'fjs-row',
    mainAxis: (alignment) => `fjs-main-${alignment}`,
    crossAxis: (alignment) => `fjs-cross-${alignment}`,
    size: {
        min: 'fjs-row-min',
        max: 'fjs-row-max'
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

export function Row({
    key,
    children = [],
    mainAxisAlignment = MainAxisAlignment.start,
    crossAxisAlignment = CrossAxisAlignment.center,
    mainAxisSize = MainAxisSize.max,
    horizontalDirection = HorizontalDirection.ltr,
    textDirection,
    textBaseline
}) {
    return new _Row({
        key,
        children,
        mainAxisAlignment,
        crossAxisAlignment,
        mainAxisSize,
        horizontalDirection,
        textDirection,
        textBaseline
    });
}

class _Row extends StatelessWidget {
    constructor({
        key,
        children,
        mainAxisAlignment,
        crossAxisAlignment,
        mainAxisSize,
        horizontalDirection,
        textDirection,
        textBaseline
    }) {
        super(key);
        this.children = children;
        this.mainAxisAlignment = mainAxisAlignment;
        this.crossAxisAlignment = crossAxisAlignment;
        this.mainAxisSize = mainAxisSize;
        this.horizontalDirection = horizontalDirection;
        this.textDirection = textDirection;
        this.textBaseline = textBaseline;
    }

    build(context) {
        const { cssClass, inlineStyles } = this._computeStyles();
        const processedChildren = this._processChildren(context);

        const elementId = context.element.getElementId();
        const widgetPath = context.element.getWidgetPath();

        return new VNode({
            tag: 'div',
            props: {
                class: cssClass,
                style: inlineStyles,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-identification': context.element.getIdentificationStrategy(),
                'data-widget': 'Row',
                'data-main-axis': this.mainAxisAlignment,
                'data-cross-axis': this.crossAxisAlignment
            },
            children: processedChildren,
            key: this.key
        });
    }

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

    _shouldReverseChildren() {
        return this.horizontalDirection === HorizontalDirection.rtl;
    }

    _buildChild(child, context, index) {
        if (child === null || child === undefined) {
            return null;
        }

        if (child instanceof Widget) {
            return child.build(context);
        }

        if (child instanceof VNode) {
            return child;
        }

        return child;
    }

    _computeStyles() {
        return {
            cssClass: this._getLayoutClasses().join(' '),
            inlineStyles: this._getInlineStyles()
        };
    }

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

    _shouldApplyBaseline() {
        return this.crossAxisAlignment === CrossAxisAlignment.baseline && this.textBaseline;
    }
}

export { _Row };