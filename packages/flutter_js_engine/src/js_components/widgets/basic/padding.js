import { ProxyWidget } from '../../../core/widget.js';
import { VNode } from '../core/vdom/vnode.js';

// ============================================================================
// EDGE INSETS CLASS
// Represents padding/margin on all four sides
// ============================================================================

class EdgeInsets {
    constructor(top = 0, right = 0, bottom = 0, left = 0) {
        this.top = top;
        this.right = right;
        this.bottom = bottom;
        this.left = left;
    }

    /**
     * Create EdgeInsets with same value on all sides
     */
    static all(value) {
        return new EdgeInsets(value, value, value, value);
    }

    /**
     * Create EdgeInsets with symmetric values
     */
    static symmetric({ vertical = 0, horizontal = 0 } = {}) {
        return new EdgeInsets(vertical, horizontal, vertical, horizontal);
    }

    /**
     * Create EdgeInsets with only specified values
     */
    static only({ top = 0, right = 0, bottom = 0, left = 0 } = {}) {
        return new EdgeInsets(top, right, bottom, left);
    }

    /**
     * Create EdgeInsets with left and right only
     */
    static fromLTRB(left, top, right, bottom) {
        return new EdgeInsets(top, right, bottom, left);
    }

    /**
     * Create zero EdgeInsets
     */
    static get zero() {
        return new EdgeInsets(0, 0, 0, 0);
    }

    /**
     * Convert to CSS padding string
     */
    toCSSString() {
        // CSS padding: top right bottom left
        return `${this.top}px ${this.right}px ${this.bottom}px ${this.left}px`;
    }

    /**
     * Convert to CSS shorthand if possible
     */
    toCSSShorthand() {
        const { top, right, bottom, left } = this;

        // All sides equal
        if (top === right && right === bottom && bottom === left) {
            return `${top}px`;
        }

        // Top/bottom equal and left/right equal
        if (top === bottom && right === left) {
            return `${top}px ${right}px`;
        }

        // Use full form
        return this.toCSSString();
    }

    /**
     * Get total horizontal padding (left + right)
     */
    get horizontal() {
        return this.left + this.right;
    }

    /**
     * Get total vertical padding (top + bottom)
     */
    get vertical() {
        return this.top + this.bottom;
    }

    /**
     * Check if all values are zero
     */
    get isZero() {
        return this.top === 0 && this.right === 0 && this.bottom === 0 && this.left === 0;
    }

    /**
     * Clone with updated values
     */
    copyWith({ top, right, bottom, left } = {}) {
        return new EdgeInsets(
            top ?? this.top,
            right ?? this.right,
            bottom ?? this.bottom,
            left ?? this.left
        );
    }

    /**
     * Check equality
     */
    equals(other) {
        if (!other || !(other instanceof EdgeInsets)) {
            return false;
        }
        return this.top === other.top &&
               this.right === other.right &&
               this.bottom === other.bottom &&
               this.left === other.left;
    }

    toString() {
        return `EdgeInsets(${this.top}, ${this.right}, ${this.bottom}, ${this.left})`;
    }
}

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
            const childElement = this.child.createElement();
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
    createElement() {
        return new PaddingElement(this);
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

export { Padding, RenderPadding, EdgeInsets };