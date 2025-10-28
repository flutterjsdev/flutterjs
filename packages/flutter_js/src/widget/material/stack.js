import { Widget, StatelessWidget } from '../../core/widget.js';
import { VNode } from '../../vdom/vnode.js';
import { Alignment, StackFit, Clip } from '../utils/utils.js';

const LAYOUT_CLASSES = {
    base: 'fjs-stack',
    fit: {
        loose: 'fjs-stack-loose',
        expand: 'fjs-stack-expand',
        passthrough: 'fjs-stack-passthrough'
    },
    clip: {
        none: 'fjs-stack-clip-none',
        hardEdge: 'fjs-stack-clip-hard-edge',
        antiAlias: 'fjs-stack-clip-anti-alias',
        antiAliasWithSaveLayer: 'fjs-stack-clip-anti-alias-save-layer'
    }
};

const ALIGNMENT_MAP = {
    topLeft: 'top-left',
    topCenter: 'top-center',
    topRight: 'top-right',
    centerLeft: 'center-left',
    center: 'center',
    centerRight: 'center-right',
    bottomLeft: 'bottom-left',
    bottomCenter: 'bottom-center',
    bottomRight: 'bottom-right'
};

export function Stack({
    key,
    children = [],
    alignment = Alignment.topLeft,
    fit = StackFit.loose,
    clip = Clip.hardEdge,
    textDirection
}) {
    return new _Stack({
        key,
        children,
        alignment,
        fit,
        clip,
        textDirection
    });
}

class _Stack extends StatelessWidget {
    constructor({
        key,
        children,
        alignment,
        fit,
        clip,
        textDirection
    }) {
        super(key);
        this.children = children;
        this.alignment = alignment;
        this.fit = fit;
        this.clip = clip;
        this.textDirection = textDirection;
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
                'data-widget': 'Stack',
                'data-alignment': this.alignment,
                'data-fit': this.fit,
                'data-clip': this.clip
            },
            children: processedChildren,
            key: this.key
        });
    }

    _processChildren(context) {
        if (!this.children || this.children.length === 0) {
            return [];
        }

        return this.children
            .map((child, index) => this._buildChild(child, context, index))
            .filter(child => child !== null);
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

        classes.push(LAYOUT_CLASSES.fit[this.fit] || LAYOUT_CLASSES.fit.loose);
        classes.push(LAYOUT_CLASSES.clip[this.clip] || LAYOUT_CLASSES.clip.hardEdge);

        return classes;
    }

    _getInlineStyles() {
        const styles = {
            position: 'relative'
        };

        const alignmentClass = ALIGNMENT_MAP[this.alignment] || ALIGNMENT_MAP.topLeft;
        styles['data-alignment-value'] = alignmentClass;

        if (this.textDirection) {
            styles.direction = this.textDirection === 'rtl' ? 'rtl' : 'ltr';
        }

        return styles;
    }
}

export { _Stack };