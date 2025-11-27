import { ProxyWidget } from '../../../core/widget.js';
import { VNode } from '../../../vdom/vnode.js';

// ============================================================================
// BLEND MODE ENUM
// Maps Flutter blend modes to CSS mix-blend-mode values
// ============================================================================

const BlendMode = {
    clear: 'clear',
    src: 'src',
    dst: 'dst',
    srcOver: 'source-over',
    dstOver: 'destination-over',
    srcIn: 'source-in',
    dstIn: 'destination-in',
    srcOut: 'source-out',
    dstOut: 'destination-out',
    srcATop: 'source-atop',
    dstATop: 'destination-atop',
    xor: 'xor',
    plus: 'lighter',
    modulate: 'multiply',
    screen: 'screen',
    overlay: 'overlay',
    darken: 'darken',
    lighten: 'lighten',
    colorDodge: 'color-dodge',
    colorBurn: 'color-burn',
    hardLight: 'hard-light',
    softLight: 'soft-light',
    difference: 'difference',
    exclusion: 'exclusion',
    multiply: 'multiply',
    hue: 'hue',
    saturation: 'saturation',
    color: 'color',
    luminosity: 'luminosity'
};

// ============================================================================
// OPACITY WIDGET
// Applies opacity to child widget (Flutter-like behavior)
// ============================================================================

class Opacity extends ProxyWidget {
    constructor({ key = null, opacity = 1.0, alwaysIncludeSemantics = false, child = null } = {}) {
        super({ key, child });

        // Validate opacity is between 0 and 1
        if (typeof opacity !== 'number' || opacity < 0.0 || opacity > 1.0) {
            throw new Error(
                `Opacity must be between 0.0 and 1.0, got: ${opacity}`
            );
        }

        this.opacity = opacity;
        this.alwaysIncludeSemantics = alwaysIncludeSemantics;
        this._renderObject = null;
    }

    /**
     * Create render object for opacity
     */
    createRenderObject(context) {
        return new RenderOpacity({
            opacity: this.opacity,
            alwaysIncludeSemantics: this.alwaysIncludeSemantics
        });
    }

    /**
     * Update render object when widget properties change
     */
    updateRenderObject(context, renderObject) {
        renderObject.opacity = this.opacity;
        renderObject.alwaysIncludeSemantics = this.alwaysIncludeSemantics;
    }

    /**
     * Build the widget tree
     */
    build(context) {
        // Create or update render object
        if (!this._renderObject) {
            this._renderObject = this.createRenderObject(context);
        } else {
            this.updateRenderObject(context, this._renderObject);
        }

        // Build child widget
        let childVNode = null;
        if (this.child) {
            if (this.child.createElement) {
                const childElement = this.child.createElement();
                childElement.mount(context.element);
                childVNode = childElement.performRebuild();
            } else {
                childVNode = this.child;
            }
        }

        // Apply opacity styling
        const elementId = context.element.getElementId();
        const widgetPath = context.element.getWidgetPath();

        return new VNode({
            tag: 'div',
            props: {
                style: {
                    opacity: this.opacity,
                    transition: 'opacity 0.2s ease-in-out'
                },
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'Opacity',
                'data-opacity': this.opacity,
                'data-always-include-semantics': this.alwaysIncludeSemantics,
                role: this.alwaysIncludeSemantics ? 'img' : undefined,
                'aria-opacity': this.alwaysIncludeSemantics ? this.opacity : undefined
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
            name: 'opacity',
            value: this.opacity
        });

        if (this.alwaysIncludeSemantics) {
            properties.push({
                name: 'alwaysIncludeSemantics',
                value: this.alwaysIncludeSemantics,
                tooltip: 'Include semantics even with 0 opacity'
            });
        }
    }

    /**
     * Create element
     */
    createElement() {
        return new OpacityElement(this);
    }
}

// ============================================================================
// RENDER OPACITY
// Represents the render object for opacity transformation
// ============================================================================

class RenderOpacity {
    constructor({ opacity = 1.0, alwaysIncludeSemantics = false } = {}) {
        this.opacity = opacity;
        this.alwaysIncludeSemantics = alwaysIncludeSemantics;
    }

    /**
     * Apply opacity to a DOM element
     */
    applyToElement(element) {
        if (element) {
            element.style.opacity = this.opacity;
        }
    }

    /**
     * Get debug info
     */
    debugInfo() {
        return {
            type: 'RenderOpacity',
            opacity: this.opacity,
            alwaysIncludeSemantics: this.alwaysIncludeSemantics
        };
    }
}

// ============================================================================
// OPACITY ELEMENT
// Element for opacity widget
// ============================================================================

class OpacityElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }
}

export { Opacity, RenderOpacity, BlendMode };