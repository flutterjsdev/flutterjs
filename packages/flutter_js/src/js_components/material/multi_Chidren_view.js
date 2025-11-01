import { Widget, StatelessWidget } from '../../core/widget.js';
import { VNode } from '../../core/vdom/vnode.js';
import { Axis, MainAxisAlignment, MainAxisSize, CrossAxisAlignment, VerticalDirection, TextDirection, Clip } from '../utils/utils.js';

const LAYOUT_CLASSES = {
    base: 'fjs-flex',
    direction: {
        horizontal: 'fjs-flex-row',
        vertical: 'fjs-flex-col'
    },
    mainAxis: {
        start: 'fjs-main-start',
        end: 'fjs-main-end',
        center: 'fjs-main-center',
        spaceBetween: 'fjs-main-between',
        spaceAround: 'fjs-main-around',
        spaceEvenly: 'fjs-main-evenly'
    },
    crossAxis: {
        start: 'fjs-cross-start',
        end: 'fjs-cross-end',
        center: 'fjs-cross-center',
        stretch: 'fjs-cross-stretch',
        baseline: 'fjs-cross-baseline'
    },
    clip: {
        none: 'fjs-clip-none',
        hardEdge: 'fjs-clip-hard',
        antiAlias: 'fjs-clip-anti',
        antiAliasWithSaveLayer: 'fjs-clip-anti-save'
    }
};

class Flex extends StatelessWidget {
    constructor(options = {}) {
        super(options.key);
        this.direction = options.direction || Axis.horizontal;
        this.mainAxisAlignment = options.mainAxisAlignment || MainAxisAlignment.start;
        this.mainAxisSize = options.mainAxisSize || MainAxisSize.max;
        this.crossAxisAlignment = options.crossAxisAlignment || CrossAxisAlignment.center;
        this.textDirection = options.textDirection || TextDirection.ltr;
        this.verticalDirection = options.verticalDirection || VerticalDirection.down;
        this.clipBehavior = options.clipBehavior || Clip.none;
        this.spacing = options.spacing || 0;
        this.children = options.children || [];
    }

    build(context) {
        const cssClasses = this._getLayoutClasses();
        const inlineStyles = this._getInlineStyles();
        const processedChildren = this._processChildren(context);

        const elementId = context.element.getElementId();
        const widgetPath = context.element.getWidgetPath();

        return new VNode({
            tag: 'div',
            props: {
                className: cssClasses.join(' '),
                style: inlineStyles,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-identification': context.element.getIdentificationStrategy(),
                'data-widget': 'Flex',
                'data-direction': this.direction,
                'data-main-axis': this.mainAxisAlignment,
                'data-cross-axis': this.crossAxisAlignment
            },
            children: processedChildren,
            key: this.key
        });
    }

    _getLayoutClasses() {
        const classes = [LAYOUT_CLASSES.base];

        classes.push(LAYOUT_CLASSES.direction[this.direction]);
        classes.push(LAYOUT_CLASSES.mainAxis[this.mainAxisAlignment]);
        classes.push(LAYOUT_CLASSES.crossAxis[this.crossAxisAlignment]);
        classes.push(LAYOUT_CLASSES.clip[this.clipBehavior]);

        return classes;
    }

    _getInlineStyles() {
        const styles = {
            display: 'flex',
            flexDirection: this.direction === Axis.horizontal ? 'row' : 'column',
            justifyContent: this._mapMainAxisAlignment(),
            alignItems: this._mapCrossAxisAlignment(),
            gap: `${this.spacing}px`,
            width: this.mainAxisSize === MainAxisSize.max ? '100%' : 'auto',
            direction: this.textDirection === TextDirection.rtl ? 'rtl' : 'ltr'
        };

        return styles;
    }

    _mapMainAxisAlignment() {
        const map = {
            start: 'flex-start',
            end: 'flex-end',
            center: 'center',
            spaceBetween: 'space-between',
            spaceAround: 'space-around',
            spaceEvenly: 'space-evenly'
        };
        return map[this.mainAxisAlignment] || 'flex-start';
    }

    _mapCrossAxisAlignment() {
        const map = {
            start: 'flex-start',
            end: 'flex-end',
            center: 'center',
            stretch: 'stretch',
            baseline: 'baseline'
        };
        return map[this.crossAxisAlignment] || 'center';
    }

    _processChildren(context) {
        if (!this.children || this.children.length === 0) {
            return [];
        }

        return this.children
            .map(child => this._buildChild(child, context))
            .filter(child => child !== null);
    }

    _buildChild(child, context) {
        if (child === null || child === undefined) {
            return null;
        }

        if (child instanceof Widget) {
            const childElement = child.createElement();
            childElement.mount(context.element);
            return childElement.performRebuild();
        }

        if (child instanceof VNode) {
            return child;
        }

        if (typeof child === 'string' || typeof child === 'number') {
            return child;
        }

        return child;
    }

    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'direction', value: this.direction });
        properties.push({ name: 'mainAxisAlignment', value: this.mainAxisAlignment });
        properties.push({ name: 'mainAxisSize', value: this.mainAxisSize });
        properties.push({ name: 'crossAxisAlignment', value: this.crossAxisAlignment });
        properties.push({ name: 'spacing', value: this.spacing });
        properties.push({ name: 'childCount', value: this.children.length });
    }
}

class Row extends Flex {
    constructor(options = {}) {
        super({
            ...options,
            direction: Axis.horizontal
        });
    }
}

class Column extends Flex {
    constructor(options = {}) {
        super({
            ...options,
            direction: Axis.vertical
        });
    }
}

export {
    Flex,
    Row,
    Column,
};