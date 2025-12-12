import { ProxyWidget } from '../../../core/widget.js';
import { VNode } from '../core/vdom/vnode.js';
import { Offset } from './transform_widget.js';

// ============================================================================
// FRACTIONAL TRANSLATION WIDGET
// Translates child by a fraction of its own size
// ============================================================================

class FractionalTranslation extends ProxyWidget {
    constructor({
        key = null,
        translation = null,
        transformHitTests = true,
        child = null
    } = {}) {
        super({ key, child });

        if (!translation) {
            throw new Error('FractionalTranslation requires a translation (Offset)');
        }

        if (!(translation instanceof Offset)) {
            throw new Error(
                `FractionalTranslation requires an Offset instance, got: ${typeof translation}`
            );
        }

        this.translation = translation;
        this.transformHitTests = transformHitTests;
        this._renderObject = null;
        this._containerElement = null;
        this._resizeObserver = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return new RenderFractionalTranslation({
            translation: this.translation,
            transformHitTests: this.transformHitTests
        });
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.translation = this.translation;
        renderObject.transformHitTests = this.transformHitTests;
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

        const style = {
            position: 'relative'
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'FractionalTranslation',
                'data-translation': this.translation.toString(),
                'data-transform-hit-tests': this.transformHitTests,
                ref: (el) => this._onMount(el)
            },
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    /**
     * Mount container and set up resize observer
     * @private
     */
    _onMount(el) {
        if (!el) return;

        this._containerElement = el;

        // Set up resize observer to recalculate translation
        if (window.ResizeObserver) {
            this._resizeObserver = new ResizeObserver(() => {
                this._applyTranslation();
            });
            this._resizeObserver.observe(el);
        }

        // Fallback to window resize
        const resizeHandler = () => this._applyTranslation();
        window.addEventListener('resize', resizeHandler);

        el._cleanupResize = () => {
            window.removeEventListener('resize', resizeHandler);
            if (this._resizeObserver) {
                this._resizeObserver.disconnect();
            }
        };

        this._applyTranslation();
    }

    /**
     * Apply fractional translation
     * Translates by fraction of own size
     * @private
     */
    _applyTranslation() {
        if (!this._containerElement) return;

        try {
            const rect = this._containerElement.getBoundingClientRect();
            const width = rect.width || 100;
            const height = rect.height || 100;

            // Calculate translation in pixels based on fraction of own size
            const translateX = width * this.translation.dx;
            const translateY = height * this.translation.dy;

            this._containerElement.style.transform = `translate(${translateX}px, ${translateY}px)`;
        } catch (error) {
            console.error('Error applying fractional translation:', error);
        }
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'translation', value: this.translation.toString() });
        properties.push({ name: 'transformHitTests', value: this.transformHitTests });
    }

    /**
     * Create element
     */
    createElement() {
        return new FractionalTranslationElement(this);
    }
}

// ============================================================================
// RENDER FRACTIONAL TRANSLATION
// ============================================================================

class RenderFractionalTranslation {
    constructor({
        translation = null,
        transformHitTests = true
    } = {}) {
        this.translation = translation;
        this.transformHitTests = transformHitTests;
    }

    /**
     * Debug info
     */
    debugInfo() {
        return {
            type: 'RenderFractionalTranslation',
            translation: this.translation?.toString(),
            transformHitTests: this.transformHitTests
        };
    }
}

// ============================================================================
// FRACTIONAL TRANSLATION ELEMENT
// ============================================================================

class FractionalTranslationElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }

    detach() {
        if (this.widget._containerElement && this.widget._containerElement._cleanupResize) {
            this.widget._containerElement._cleanupResize();
        }
        super.detach();
    }
}

// ============================================================================
// ROTATED BOX WIDGET
// Rotates child by increments of 90 degrees (quarter turns)
// ============================================================================

class RotatedBox extends ProxyWidget {
    constructor({
        key = null,
        quarterTurns = 0,
        child = null
    } = {}) {
        super({ key, child });

        if (typeof quarterTurns !== 'number' || !Number.isInteger(quarterTurns)) {
            throw new Error(
                `RotatedBox requires quarterTurns to be an integer, got: ${quarterTurns}`
            );
        }

        this.quarterTurns = quarterTurns;
        this._renderObject = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return new RenderRotatedBox({
            quarterTurns: this.quarterTurns
        });
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.quarterTurns = this.quarterTurns;
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

        // Calculate rotation angle and required dimensions
        const rotationAngle = this._getRotationAngle();
        const swapDimensions = this._shouldSwapDimensions();

        const style = {
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `rotate(${rotationAngle}deg)`,
            transformOrigin: 'center'
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'RotatedBox',
                'data-quarter-turns': this.quarterTurns,
                'data-rotation-angle': rotationAngle
            },
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    /**
     * Get rotation angle in degrees
     * @private
     */
    _getRotationAngle() {
        // Normalize quarter turns to 0-3 range
        const normalized = ((this.quarterTurns % 4) + 4) % 4;
        return normalized * 90;
    }

    /**
     * Check if dimensions should be swapped
     * When rotated 90 or 270 degrees, width becomes height
     * @private
     */
    _shouldSwapDimensions() {
        const normalized = ((this.quarterTurns % 4) + 4) % 4;
        return normalized === 1 || normalized === 3;
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'quarterTurns', value: this.quarterTurns });
        properties.push({ name: 'rotationAngle', value: `${this._getRotationAngle()}°` });
    }

    /**
     * Create element
     */
    createElement() {
        return new RotatedBoxElement(this);
    }
}

// ============================================================================
// RENDER ROTATED BOX
// ============================================================================

class RenderRotatedBox {
    constructor({
        quarterTurns = 0
    } = {}) {
        this.quarterTurns = quarterTurns;
    }

    /**
     * Debug info
     */
    debugInfo() {
        return {
            type: 'RenderRotatedBox',
            quarterTurns: this.quarterTurns,
            rotationAngle: `${((this.quarterTurns % 4 + 4) % 4) * 90}°`
        };
    }
}

// ============================================================================
// ROTATED BOX ELEMENT
// ============================================================================

class RotatedBoxElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }
}

export {
    FractionalTranslation,
    RenderFractionalTranslation,
    RotatedBox,
    RenderRotatedBox
};