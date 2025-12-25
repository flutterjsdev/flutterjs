import { ProxyWidget } from '../../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { Alignment,Clip ,BoxFit} from '../../utils.js';



// ============================================================================
// FITTED BOX WIDGET
// Scales and positions child to fit available space
// ============================================================================

class FittedBox extends ProxyWidget {
    constructor({
        key = null,
        fit = BoxFit.contain,
        alignment = Alignment.center,
        clipBehavior = Clip.none,
        child = null
    } = {}) {
        super({ key, child });

        if (!Object.values(BoxFit).includes(fit)) {
            throw new Error(`Invalid BoxFit: ${fit}`);
        }

        if (!Object.values(Clip).includes(clipBehavior)) {
            throw new Error(`Invalid clipBehavior: ${clipBehavior}`);
        }

        if (!(alignment instanceof Alignment)) {
            throw new Error(
                `FittedBox requires an Alignment instance, got: ${typeof alignment}`
            );
        }

        this.fit = fit;
        this.alignment = alignment;
        this.clipBehavior = clipBehavior;
        this._renderObject = null;
        this._containerElement = null;
        this._childElement = null;
        this._resizeObserver = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return new RenderFittedBox({
            fit: this.fit,
            alignment: this.alignment,
            clipBehavior: this.clipBehavior
        });
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.fit = this.fit;
        renderObject.alignment = this.alignment;
        renderObject.clipBehavior = this.clipBehavior;
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

        // Overflow handling
        const overflowValue = this.clipBehavior === Clip.none ? 'visible' : 'hidden';

        const style = {
            position: 'relative',
            overflow: overflowValue,
            display: 'flex',
            alignItems: this._getAlignmentValue('vertical'),
            justifyContent: this._getAlignmentValue('horizontal'),
            width: '100%',
            height: '100%'
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'FittedBox',
                'data-fit': this.fit,
                'data-alignment': this.alignment.toString(),
                'data-clip-behavior': this.clipBehavior,
                ref: (el) => this._onContainerMount(el)
            },
            children: [
                new VNode({
                    tag: 'div',
                    props: {
                        style: {
                            position: 'relative',
                            width: 'auto',
                            height: 'auto',
                            maxWidth: '100%',
                            maxHeight: '100%'
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
     * Mount container and set up resize observer
     * @private
     */
    _onContainerMount(el) {
        if (!el) return;

        this._containerElement = el;

        // Set up resize observer to handle size changes
        if (window.ResizeObserver) {
            this._resizeObserver = new ResizeObserver(() => {
                this._applyFitting();
            });
            this._resizeObserver.observe(el);
        }

        // Fallback to window resize
        const resizeHandler = () => this._applyFitting();
        window.addEventListener('resize', resizeHandler);

        el._cleanupResize = () => {
            window.removeEventListener('resize', resizeHandler);
            if (this._resizeObserver) {
                this._resizeObserver.disconnect();
            }
        };

        this._applyFitting();
    }

    /**
     * Mount child element
     * @private
     */
    _onChildMount(el) {
        if (!el) return;

        this._childElement = el;
        this._applyFitting();
    }

    /**
     * Apply fitting logic
     * @private
     */
    _applyFitting() {
        if (!this._containerElement || !this._childElement) return;

        try {
            const containerRect = this._containerElement.getBoundingClientRect();
            const containerWidth = containerRect.width || 300;
            const containerHeight = containerRect.height || 300;

            // Get child's natural dimensions
            const childRect = this._childElement.getBoundingClientRect();
            let childWidth = childRect.width || 100;
            let childHeight = childRect.height || 100;

            // Calculate scaling factors
            const scaleX = containerWidth / childWidth;
            const scaleY = containerHeight / childHeight;

            let scale = 1;
            let transform = 'none';

            // Apply BoxFit logic
            switch (this.fit) {
                case BoxFit.fill:
                    // Stretch to fill, ignore aspect ratio
                    transform = `scaleX(${scaleX}) scaleY(${scaleY})`;
                    break;

                case BoxFit.cover:
                    // Scale to cover, maintain aspect ratio, may crop
                    scale = Math.max(scaleX, scaleY);
                    transform = `scale(${scale})`;
                    break;

                case BoxFit.contain:
                    // Scale to fit inside, maintain aspect ratio
                    scale = Math.min(scaleX, scaleY);
                    transform = `scale(${scale})`;
                    break;

                case BoxFit.fitWidth:
                    // Fit to width, maintain aspect ratio
                    scale = scaleX;
                    transform = `scale(${scale})`;
                    break;

                case BoxFit.fitHeight:
                    // Fit to height, maintain aspect ratio
                    scale = scaleY;
                    transform = `scale(${scale})`;
                    break;

                case BoxFit.none:
                    // No scaling
                    transform = 'none';
                    break;

                case BoxFit.scaleDown:
                    // Scale down only if needed
                    scale = Math.min(scaleX, scaleY, 1);
                    transform = scale < 1 ? `scale(${scale})` : 'none';
                    break;

                default:
                    transform = 'none';
            }

            // Apply transform
            this._childElement.style.transform = transform;
            this._childElement.style.transformOrigin = this._getTransformOrigin();
        } catch (error) {
            console.error('Error applying fitted box scaling:', error);
        }
    }

    /**
     * Get alignment value for flex properties
     * @private
     */
    _getAlignmentValue(direction) {
        if (direction === 'horizontal') {
            if (this.alignment.x < 0) return 'flex-start';
            if (this.alignment.x > 0) return 'flex-end';
            return 'center';
        } else if (direction === 'vertical') {
            if (this.alignment.y < 0) return 'flex-start';
            if (this.alignment.y > 0) return 'flex-end';
            return 'center';
        }
        return 'center';
    }

    /**
     * Get transform origin from alignment
     * @private
     */
    _getTransformOrigin() {
        const x = ((this.alignment.x + 1) / 2) * 100;
        const y = ((this.alignment.y + 1) / 2) * 100;
        return `${x}% ${y}%`;
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'fit', value: this.fit });
        properties.push({ name: 'alignment', value: this.alignment.toString() });
        properties.push({ name: 'clipBehavior', value: this.clipBehavior });
    }

    /**
     * Create element
     */
    createElement() {
        return new FittedBoxElement(this);
    }
}

// ============================================================================
// RENDER FITTED BOX
// ============================================================================

class RenderFittedBox {
    constructor({
        fit = BoxFit.contain,
        alignment = Alignment.center,
        clipBehavior = Clip.none
    } = {}) {
        this.fit = fit;
        this.alignment = alignment;
        this.clipBehavior = clipBehavior;
    }

    /**
     * Debug info
     */
    debugInfo() {
        return {
            type: 'RenderFittedBox',
            fit: this.fit,
            alignment: this.alignment.toString(),
            clipBehavior: this.clipBehavior
        };
    }
}

// ============================================================================
// FITTED BOX ELEMENT
// ============================================================================

class FittedBoxElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }

    detach() {
        // Cleanup resize observer
        if (this.widget._containerElement && this.widget._containerElement._cleanupResize) {
            this.widget._containerElement._cleanupResize();
        }
        super.detach();
    }
}

export { FittedBox, RenderFittedBox, BoxFit };