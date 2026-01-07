import { ProxyWidget } from '../../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';

import { EdgeInsets } from '../../utils/edge_insets.js';

// ============================================================================
// PADDING WIDGET
// Applies padding around child widget
// ============================================================================

class Padding extends ProxyWidget {
    constructor({
        key = null,
        padding = null,
        child = null
    } = {}) {
        super({ key, child });

        if (!padding) {
            throw new Error('Padding requires padding parameter');
        }

        if (!(padding instanceof EdgeInsets)) {
            throw new Error(
                `Padding requires an EdgeInsets instance, got: ${typeof padding}`
            );
        }

        this.padding = padding;
        this._renderObject = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return new RenderPadding({
            padding: this.padding
        });
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.padding = this.padding;
    }

    /**
     * Build the widget
     */
    build(context) {
        if (!this._renderObject) {
            this._renderObject = this.createRenderObject(context);
        } else {
            this.updateRenderObject(context, this._renderObject);
        }

        let childVNode = null;
        if (this.child) {
            const childElement = this.child.createElement(context.element, context.element.runtime);
            childElement.mount(context.element);
            childVNode = childElement.performRebuild();
        }

        const elementId = context.element.getElementId();
        const widgetPath = context.element.getWidgetPath();

        // Generate padding CSS
        const paddingCSS = this.padding.toCSSShorthand();

        const style = {
            padding: paddingCSS,
            boxSizing: 'border-box',
            position: 'relative'
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'Padding',
                'data-padding': this.padding.toString(),
                'data-padding-top': this.padding.top,
                'data-padding-right': this.padding.right,
                'data-padding-bottom': this.padding.bottom,
                'data-padding-left': this.padding.left
            },
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({
            name: 'padding',
            value: this.padding.toString()
        });
        properties.push({
            name: 'horizontalPadding',
            value: this.padding.horizontal
        });
        properties.push({
            name: 'verticalPadding',
            value: this.padding.vertical
        });
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new PaddingElement(this, parent, runtime);
    }
}

// ============================================================================
// RENDER PADDING
// ============================================================================

class RenderPadding {
    constructor({
        padding = null
    } = {}) {
        this.padding = padding;
    }

    /**
     * Debug info
     */
    debugInfo() {
        return {
            type: 'RenderPadding',
            padding: this.padding?.toString(),
            horizontalPadding: this.padding?.horizontal,
            verticalPadding: this.padding?.vertical
        };
    }
}

// ============================================================================
// PADDING ELEMENT
// ============================================================================

class PaddingElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }
}

export { Padding, RenderPadding };