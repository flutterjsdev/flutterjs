import { ProxyWidget } from '../../core/widget_element.js';
import { VNode } from "@flutterjs/vdom/vnode";

// ============================================================================
// ASPECT RATIO WIDGET
// Maintains a specific aspect ratio for its child
// ============================================================================

class AspectRatio extends ProxyWidget {
    constructor({
        key = null,
        aspectRatio = 1.0,
        child = null
    } = {}) {
        super({ key, child });

        if (aspectRatio <= 0) {
            throw new Error(`aspectRatio must be > 0, got: ${aspectRatio}`);
        }

        this.aspectRatio = aspectRatio;
        this._renderObject = null;
        this._containerElement = null;
        this._resizeObserver = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return {
            aspectRatio: this.aspectRatio
        };
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.aspectRatio = this.aspectRatio;
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

        const style = {
            position: 'relative',
            width: '100%',
            paddingBottom: `${(1 / this.aspectRatio) * 100}%`,
            height: 0,
            overflow: 'hidden'
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'AspectRatio',
                'data-aspect-ratio': this.aspectRatio,
                ref: (el) => this._onContainerMount(el)
            },
            children: [
                new VNode({
                    tag: 'div',
                    props: {
                        style: {
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%'
                        }
                    },
                    children: childVNode ? [childVNode] : []
                })
            ],
            key: this.key
        });
    }

    /**
     * Mount container
     * @private
     */
    _onContainerMount(el) {
        if (!el) return;

        this._containerElement = el;

        // Update on resize
        if (window.ResizeObserver) {
            this._resizeObserver = new ResizeObserver(() => {
                this._updateAspectRatio();
            });
            this._resizeObserver.observe(el);
        }

        const resizeHandler = () => this._updateAspectRatio();
        window.addEventListener('resize', resizeHandler);

        el._cleanupResize = () => {
            window.removeEventListener('resize', resizeHandler);
            if (this._resizeObserver) {
                this._resizeObserver.disconnect();
            }
        };
    }

    /**
     * Update aspect ratio padding
     * @private
     */
    _updateAspectRatio() {
        if (!this._containerElement) return;

        const paddingBottom = (1 / this.aspectRatio) * 100;
        this._containerElement.style.paddingBottom = `${paddingBottom}%`;
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'aspectRatio', value: this.aspectRatio });
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new AspectRatioElement(this,parent, runtime);
    }
}

// ============================================================================
// RENDER ASPECT RATIO
// ============================================================================

class RenderAspectRatio {
    constructor({ aspectRatio = 1.0 } = {}) {
        this.aspectRatio = aspectRatio;
    }

    debugInfo() {
        return {
            type: 'RenderAspectRatio',
            aspectRatio: this.aspectRatio
        };
    }
}

// ============================================================================
// ASPECT RATIO ELEMENT
// ============================================================================

class AspectRatioElement extends ProxyWidget.constructor.prototype.constructor {
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
// INTRINSIC WIDTH WIDGET
// Sizes child to its intrinsic width
// ============================================================================

class IntrinsicWidth extends ProxyWidget {
    constructor({
        key = null,
        stepWidth = null,
        stepHeight = null,
        child = null
    } = {}) {
        super({ key, child });

        if (stepWidth !== null && stepWidth < 0) {
            throw new Error('stepWidth must be >= 0');
        }

        if (stepHeight !== null && stepHeight < 0) {
            throw new Error('stepHeight must be >= 0');
        }

        // Convert 0 to null (per Flutter spec)
        this.stepWidth = stepWidth === 0 ? null : stepWidth;
        this.stepHeight = stepHeight === 0 ? null : stepHeight;
        this._renderObject = null;
        this._containerElement = null;
        this._childElement = null;
        this._resizeObserver = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return {
            stepWidth: this.stepWidth,
            stepHeight: this.stepHeight
        };
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.stepWidth = this.stepWidth;
        renderObject.stepHeight = this.stepHeight;
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

        const style = {
            position: 'relative',
            width: 'fit-content',
            height: 'auto'
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'IntrinsicWidth',
                'data-step-width': this.stepWidth,
                'data-step-height': this.stepHeight,
                ref: (el) => this._onContainerMount(el)
            },
            children: [
                new VNode({
                    tag: 'div',
                    props: {
                        style: {
                            position: 'relative',
                            width: '100%',
                            height: '100%'
                        },
                        ref: (el) => this._onChildMount(el)
                    },
                    children: childVNode ? [childVNode] : []
                })
            ],
            key: this.key
        });
    }

    /**
     * Mount container
     * @private
     */
    _onContainerMount(el) {
        if (!el) return;

        this._containerElement = el;

        if (window.ResizeObserver) {
            this._resizeObserver = new ResizeObserver(() => {
                this._calculateIntrinsicWidth();
            });
            this._resizeObserver.observe(el);
        }

        const resizeHandler = () => this._calculateIntrinsicWidth();
        window.addEventListener('resize', resizeHandler);

        el._cleanupResize = () => {
            window.removeEventListener('resize', resizeHandler);
            if (this._resizeObserver) {
                this._resizeObserver.disconnect();
            }
        };

        setTimeout(() => this._calculateIntrinsicWidth(), 0);
    }

    /**
     * Mount child
     * @private
     */
    _onChildMount(el) {
        if (!el) return;
        this._childElement = el;
        this._calculateIntrinsicWidth();
    }

    /**
     * Calculate and apply intrinsic width
     * @private
     */
    _calculateIntrinsicWidth() {
        if (!this._containerElement || !this._childElement) return;

        try {
            // Get child's natural width
            const childRect = this._childElement.getBoundingClientRect();
            let width = childRect.width;

            // Apply step width if specified
            if (this.stepWidth && this.stepWidth > 0) {
                width = Math.ceil(width / this.stepWidth) * this.stepWidth;
            }

            // Apply step height if specified
            if (this.stepHeight && this.stepHeight > 0) {
                let height = childRect.height;
                height = Math.ceil(height / this.stepHeight) * this.stepHeight;
                this._childElement.style.height = `${height}px`;
            }

            // Set container width to match child
            this._containerElement.style.width = `${width}px`;
        } catch (error) {
            console.error('Error calculating intrinsic width:', error);
        }
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        if (this.stepWidth !== null) {
            properties.push({ name: 'stepWidth', value: this.stepWidth });
        }
        if (this.stepHeight !== null) {
            properties.push({ name: 'stepHeight', value: this.stepHeight });
        }
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new IntrinsicWidthElement(this,parent, runtime);
    }
}

// ============================================================================
// RENDER INTRINSIC WIDTH
// ============================================================================

class RenderIntrinsicWidth {
    constructor({ stepWidth = null, stepHeight = null } = {}) {
        this.stepWidth = stepWidth;
        this.stepHeight = stepHeight;
    }

    debugInfo() {
        return {
            type: 'RenderIntrinsicWidth',
            stepWidth: this.stepWidth,
            stepHeight: this.stepHeight
        };
    }
}

// ============================================================================
// INTRINSIC WIDTH ELEMENT
// ============================================================================

class IntrinsicWidthElement extends ProxyWidget.constructor.prototype.constructor {
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
// INTRINSIC HEIGHT WIDGET
// Sizes child to its intrinsic height
// ============================================================================

class IntrinsicHeight extends ProxyWidget {
    constructor({
        key = null,
        child = null
    } = {}) {
        super({ key, child });

        this._renderObject = null;
        this._containerElement = null;
        this._childElement = null;
        this._resizeObserver = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return {};
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        // No updates needed
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

        const style = {
            position: 'relative',
            width: '100%',
            height: 'fit-content'
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'IntrinsicHeight',
                ref: (el) => this._onContainerMount(el)
            },
            children: [
                new VNode({
                    tag: 'div',
                    props: {
                        style: {
                            position: 'relative',
                            width: '100%',
                            height: '100%'
                        },
                        ref: (el) => this._onChildMount(el)
                    },
                    children: childVNode ? [childVNode] : []
                })
            ],
            key: this.key
        });
    }

    /**
     * Mount container
     * @private
     */
    _onContainerMount(el) {
        if (!el) return;

        this._containerElement = el;

        if (window.ResizeObserver) {
            this._resizeObserver = new ResizeObserver(() => {
                this._calculateIntrinsicHeight();
            });
            this._resizeObserver.observe(el);
        }

        const resizeHandler = () => this._calculateIntrinsicHeight();
        window.addEventListener('resize', resizeHandler);

        el._cleanupResize = () => {
            window.removeEventListener('resize', resizeHandler);
            if (this._resizeObserver) {
                this._resizeObserver.disconnect();
            }
        };

        setTimeout(() => this._calculateIntrinsicHeight(), 0);
    }

    /**
     * Mount child
     * @private
     */
    _onChildMount(el) {
        if (!el) return;
        this._childElement = el;
        this._calculateIntrinsicHeight();
    }

    /**
     * Calculate and apply intrinsic height
     * @private
     */
    _calculateIntrinsicHeight() {
        if (!this._containerElement || !this._childElement) return;

        try {
            // Get child's natural height
            const childRect = this._childElement.getBoundingClientRect();
            const height = childRect.height;

            // Set container height to match child
            this._containerElement.style.height = `${height}px`;
        } catch (error) {
            console.error('Error calculating intrinsic height:', error);
        }
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'type', value: 'IntrinsicHeight' });
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new IntrinsicHeightElement(this,parent, runtime);
    }
}

// ============================================================================
// RENDER INTRINSIC HEIGHT
// ============================================================================

class RenderIntrinsicHeight {
    constructor() { }

    debugInfo() {
        return {
            type: 'RenderIntrinsicHeight'
        };
    }
}

// ============================================================================
// INTRINSIC HEIGHT ELEMENT
// ============================================================================

class IntrinsicHeightElement extends ProxyWidget.constructor.prototype.constructor {
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
// IGNORE BASELINE WIDGET
// Prevents child from affecting parent's baseline calculation
// ============================================================================

class IgnoreBaseline extends ProxyWidget {
    constructor({
        key = null,
        child = null
    } = {}) {
        super({ key, child });

        this._renderObject = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return new RenderIgnoreBaseline();
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        // No properties to update
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

        const style = {
            position: 'relative',
            display: 'inline-block'
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'IgnoreBaseline',
                // Set attributes to prevent baseline calculation
                'data-ignore-baseline': 'true'
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
        properties.push({ name: 'ignoresBaseline', value: true });
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new IgnoreBaselineElement(this,parent, runtime);
    }
}

// ============================================================================
// RENDER IGNORE BASELINE
// ============================================================================

class RenderIgnoreBaseline {
    constructor() { }

    debugInfo() {
        return {
            type: 'RenderIgnoreBaseline',
            ignoresBaseline: true
        };
    }
}

// ============================================================================
// IGNORE BASELINE ELEMENT
// ============================================================================

class IgnoreBaselineElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }
}

export {

    RenderAspectRatio,
    IntrinsicWidth,
    RenderIntrinsicWidth,
    IntrinsicHeight,
    RenderIntrinsicHeight,
    AspectRatio,



    IgnoreBaseline,
    RenderIgnoreBaseline,

};