import { Widget } from '../../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { EdgeInsets } from '../../utils/edge_insets.js';
import { Element } from '@flutterjs/runtime';

// ============================================================================
// HELPER (Duplicated for isolation)
// ============================================================================

function reconcileChild(parent, oldChildElement, newWidget) {
    if (!newWidget) {
        if (oldChildElement) oldChildElement.unmount();
        return null;
    }
    if (oldChildElement &&
        oldChildElement.widget.constructor === newWidget.constructor &&
        oldChildElement.widget.key === newWidget.key) {
        oldChildElement.updateWidget(newWidget);
        if (oldChildElement.dirty) oldChildElement.rebuild();
        return oldChildElement;
    }
    if (oldChildElement) oldChildElement.unmount();
    const newEl = newWidget.createElement(parent, parent.runtime);
    newEl.mount(parent);
    return newEl;
}

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
        // Reconcile child
        const childWidget = this.widget.child;
        const oldChild = (this._children && this._children.length > 0) ? this._children[0] : null;

        const childElement = reconcileChild(this, oldChild, childWidget);

        // Update children list
        if (childElement) {
            this._children = [childElement];
        } else {
            this._children = [];
        }

        const paddingCSS = this.widget.padding.toCSSShorthand();
        const style = {
            padding: paddingCSS,
            boxSizing: 'border-box'
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': this.getElementId(),
                'data-widget-path': this.getWidgetPath(),
                'data-widget': 'Padding'
            },
            children: childElement ? [childElement.vnode] : [],
            key: this.widget.key
        });
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