import { Widget } from '../../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { EdgeInsets } from '../../utils/edge_insets.js';
import { Element } from '@flutterjs/runtime';

// ============================================================================
// PADDING WIDGET
// ============================================================================

class Padding extends Widget {
    constructor({
        key = null,
        padding = null,
        child = null
    } = {}) {
        super(key);

        if (!padding) {
            throw new Error('Padding requires padding parameter');
        }

        if (!(padding instanceof EdgeInsets)) {
            throw new Error(
                `Padding requires an EdgeInsets instance, got: ${typeof padding}`
            );
        }

        this.padding = padding;
        this.child = child;
    }

    /**
     * Build widget tree - following DecoratedBox pattern exactly
     */
    build(context) {
        const elementId = context.element.getElementId();
        const widgetPath = context.element.getWidgetPath();

        let childVNode = null;
        if (this.child) {
            const childElement = this.child.createElement(context.element, context.element.runtime);
            childElement.mount(context.element);
            childVNode = childElement.performRebuild();
        }

        const paddingCSS = this.padding.toCSSShorthand();

        const style = {
            padding: paddingCSS,
            boxSizing: 'border-box'
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'Padding'
            },
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'padding', value: this.padding.toString() });
    }

    createElement(parent, runtime) {
        return new PaddingElement(this, parent, runtime);
    }
}

class PaddingElement extends Element {
    performRebuild() {
        return this.widget.build(this.context);
    }
}

// ============================================================================
// RENDER PADDING (stub for compatibility)
// ============================================================================

class RenderPadding {
    constructor({ padding = null } = {}) {
        this.padding = padding;
    }
}

export { Padding, RenderPadding };