import { ProxyWidget, Widget } from '../../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { Size } from '../../utils/size.js';
import { BoxConstraints } from '../../utils/box_constraints.js';
import { Size } from '../../utils/size.js';
import { BoxConstraints } from '../../utils/box_constraints.js';





// ============================================================================
// SINGLE CHILD LAYOUT DELEGATE BASE CLASS
// Override methods to define custom layout logic
// ============================================================================

class SingleChildLayoutDelegate {
    constructor() {
        if (new.target === SingleChildLayoutDelegate) {
            throw new Error('SingleChildLayoutDelegate is abstract');
        }
    }

    /**
     * Get size constraints for the child
     * Override to define child constraints
     */
    getConstraintsForChild(constraints) {
        throw new Error('getConstraintsForChild() must be implemented');
    }

    /**
     * Position the child
     * Override to position child relative to parent
     */
    positionChild(size, childSize) {
        throw new Error('positionChild() must be implemented');
    }

    /**
     * Get size of this widget
     * Override to define own size
     */
    getSize(constraints) {
        return constraints.constrain(new Size(300, 300));
    }

    /**
     * Check if delegate should be updated
     */
    shouldRelayout(oldDelegate) {
        return true;
    }
}

// ============================================================================
// CUSTOM SINGLE CHILD LAYOUT WIDGET
// Allows custom layout of a single child
// ============================================================================

class CustomSingleChildLayout extends ProxyWidget {
    constructor({
        key = null,
        delegate = null,
        child = null
    } = {}) {
        super({ key, child });

        if (!delegate) {
            throw new Error('CustomSingleChildLayout requires a delegate');
        }

        if (!(delegate instanceof SingleChildLayoutDelegate)) {
            throw new Error(
                `CustomSingleChildLayout requires a SingleChildLayoutDelegate instance, got: ${typeof delegate}`
            );
        }

        this.delegate = delegate;
        this._renderObject = null;
        this._containerElement = null;
        this._childElement = null;
        this._resizeObserver = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return new RenderCustomSingleChildLayoutBox({
            delegate: this.delegate
        });
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        if (this.delegate.shouldRelayout(renderObject.delegate)) {
            renderObject.delegate = this.delegate;
        }
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

        return new VNode({
            tag: 'div',
            props: {
                style: {
                    position: 'relative',
                    display: 'inline-block'
                },
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'CustomSingleChildLayout',
                ref: (el) => this._onContainerMount(el)
            },
            children: [
                new VNode({
                    tag: 'div',
                    props: {
                        style: {
                            position: 'absolute'
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
                this._performLayout();
            });
            this._resizeObserver.observe(el);
        }

        const resizeHandler = () => this._performLayout();
        window.addEventListener('resize', resizeHandler);

        el._cleanupResize = () => {
            window.removeEventListener('resize', resizeHandler);
            if (this._resizeObserver) {
                this._resizeObserver.disconnect();
            }
        };

        this._performLayout();
    }

    /**
     * Mount child
     * @private
     */
    _onChildMount(el) {
        if (!el) return;
        this._childElement = el;
        this._performLayout();
    }

    /**
     * Perform layout using delegate
     * @private
     */
    _performLayout() {
        if (!this._containerElement || !this._childElement || !this.delegate) return;

        try {
            const containerRect = this._containerElement.getBoundingClientRect();
            const parentSize = new Size(containerRect.width || 300, containerRect.height || 300);

            // Get parent constraints
            const constraints = BoxConstraints.expand({ width: parentSize.width, height: parentSize.height });

            // Get child constraints from delegate
            const childConstraints = this.delegate.getConstraintsForChild(constraints);

            // Get child size
            const childRect = this._childElement.getBoundingClientRect();
            const childSize = new Size(childRect.width || 100, childRect.height || 100);

            // Constrain child size
            const constrainedChildSize = childConstraints.constrain(childSize);

            // Get position from delegate
            const position = this.delegate.positionChild(parentSize, constrainedChildSize);

            // Apply position and size
            this._childElement.style.left = `${position.x}px`;
            this._childElement.style.top = `${position.y}px`;
            this._childElement.style.width = `${constrainedChildSize.width}px`;
            this._childElement.style.height = `${constrainedChildSize.height}px`;

            // Get container size from delegate
            const containerSize = this.delegate.getSize(constraints);
            this._containerElement.style.width = `${containerSize.width}px`;
            this._containerElement.style.height = `${containerSize.height}px`;
        } catch (error) {
            console.error('Error performing custom single child layout:', error);
        }
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'delegate', value: this.delegate.constructor.name });
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new CustomSingleChildLayoutElement(this, parent, runtime);
    }
}

// ============================================================================
// RENDER CUSTOM SINGLE CHILD LAYOUT BOX
// ============================================================================

class RenderCustomSingleChildLayoutBox {
    constructor({ delegate = null } = {}) {
        this.delegate = delegate;
    }

    debugInfo() {
        return {
            type: 'RenderCustomSingleChildLayoutBox',
            delegateType: this.delegate?.constructor.name
        };
    }
}

// ============================================================================
// CUSTOM SINGLE CHILD LAYOUT ELEMENT
// ============================================================================

class CustomSingleChildLayoutElement extends ProxyWidget.constructor.prototype.constructor {
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
// MULTI CHILD LAYOUT DELEGATE BASE CLASS
// Override methods to define custom multi-child layout logic
// ============================================================================

class MultiChildLayoutDelegate {
    constructor() {
        if (new.target === MultiChildLayoutDelegate) {
            throw new Error('MultiChildLayoutDelegate is abstract');
        }
    }

    /**
     * Perform layout on children
     * Children are keyed by id set via LayoutId
     */
    performLayout(size, layoutChild) {
        throw new Error('performLayout() must be implemented');
    }

    /**
     * Get size of this widget
     */
    getSize(constraints) {
        return constraints.constrain(new Size(300, 300));
    }

    /**
     * Check if delegate should update
     */
    shouldRelayout(oldDelegate) {
        return true;
    }
}

// ============================================================================
// LAYOUT ID WIDGET
// Assigns an id to a child in CustomMultiChildLayout
// ============================================================================

class LayoutId extends Widget {
    constructor({
        key = null,
        id = null,
        child = null
    } = {}) {
        super(key || { id });

        if (!id) {
            throw new Error('LayoutId requires an id');
        }

        this.id = id;
        this.child = child;
    }

    /**
     * Apply parent data to child
     */
    applyParentData(renderObject) {
        if (!renderObject.parentData) {
            renderObject.parentData = {};
        }
        renderObject.parentData.id = this.id;
    }

    /**
     * Build returns the child
     */
    build(context) {
        return this.child;
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'id', value: this.id });
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new LayoutIdElement(this, parent, runtime);
    }
}

class LayoutIdElement extends Widget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }
}

// ============================================================================
// CUSTOM MULTI CHILD LAYOUT WIDGET
// Allows custom layout of multiple children with ids
// ============================================================================

class CustomMultiChildLayout extends Widget {
    constructor({
        key = null,
        delegate = null,
        children = []
    } = {}) {
        super(key);

        if (!delegate) {
            throw new Error('CustomMultiChildLayout requires a delegate');
        }

        if (!(delegate instanceof MultiChildLayoutDelegate)) {
            throw new Error(
                `CustomMultiChildLayout requires a MultiChildLayoutDelegate instance, got: ${typeof delegate}`
            );
        }

        this.delegate = delegate;
        this.children = children || [];
        this._renderObject = null;
        this._containerElement = null;
        this._childElements = new Map();
        this._resizeObserver = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return new RenderCustomMultiChildLayoutBox({
            delegate: this.delegate
        });
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        if (this.delegate.shouldRelayout(renderObject.delegate)) {
            renderObject.delegate = this.delegate;
        }
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

        const elementId = context.element.getElementId();
        const widgetPath = context.element.getWidgetPath();

        const childVNodes = this.children.map((childWidget, index) => {
            let wrappedChild = childWidget;

            // Wrap child in LayoutId if not already wrapped
            if (!(childWidget instanceof LayoutId)) {
                wrappedChild = new LayoutId({
                    id: index,
                    child: childWidget
                });
            }

            const childElement = wrappedChild.createElement(context.element, context.element.runtime);
            childElement.mount(context.element);
            return childElement.performRebuild();
        });

        return new VNode({
            tag: 'div',
            props: {
                style: {
                    position: 'relative',
                    display: 'inline-block'
                },
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'CustomMultiChildLayout',
                ref: (el) => this._onContainerMount(el)
            },
            children: childVNodes.map((vnode, index) =>
                new VNode({
                    tag: 'div',
                    props: {
                        style: {
                            position: 'absolute'
                        },
                        'data-layout-id': index,
                        ref: (el) => this._onChildMount(el, index)
                    },
                    children: [vnode]
                })
            ),
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
                this._performLayout();
            });
            this._resizeObserver.observe(el);
        }

        const resizeHandler = () => this._performLayout();
        window.addEventListener('resize', resizeHandler);

        el._cleanupResize = () => {
            window.removeEventListener('resize', resizeHandler);
            if (this._resizeObserver) {
                this._resizeObserver.disconnect();
            }
        };

        this._performLayout();
    }

    /**
     * Mount child
     * @private
     */
    _onChildMount(el, id) {
        if (!el) return;
        this._childElements.set(id, el);
        this._performLayout();
    }

    /**
     * Perform layout using delegate
     * @private
     */
    _performLayout() {
        if (!this._containerElement || !this.delegate) return;

        try {
            const containerRect = this._containerElement.getBoundingClientRect();
            const size = new Size(containerRect.width || 300, containerRect.height || 300);

            // Get constraints
            const constraints = BoxConstraints.expand({ width: size.width, height: size.height });

            // Create layout child function
            const layoutChild = (id, childConstraints) => {
                const childEl = this._childElements.get(id);
                if (!childEl) {
                    console.warn(`LayoutId ${id} not found`);
                    return new Size(0, 0);
                }

                // Get child size
                const childRect = childEl.getBoundingClientRect();
                const childSize = new Size(childRect.width || 100, childRect.height || 100);

                // Constrain and return
                return childConstraints.constrain(childSize);
            };

            // Call delegate's performLayout
            const layoutInfo = this.delegate.performLayout(size, layoutChild);

            // Apply layout to children
            if (layoutInfo && typeof layoutInfo === 'object') {
                for (const [id, info] of Object.entries(layoutInfo)) {
                    const childEl = this._childElements.get(parseInt(id));
                    if (childEl) {
                        childEl.style.left = `${info.x || 0}px`;
                        childEl.style.top = `${info.y || 0}px`;
                        if (info.width) childEl.style.width = `${info.width}px`;
                        if (info.height) childEl.style.height = `${info.height}px`;
                    }
                }
            }

            // Get container size from delegate
            const containerSize = this.delegate.getSize(constraints);
            this._containerElement.style.width = `${containerSize.width}px`;
            this._containerElement.style.height = `${containerSize.height}px`;
        } catch (error) {
            console.error('Error performing custom multi child layout:', error);
        }
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'delegate', value: this.delegate.constructor.name });
        properties.push({ name: 'childCount', value: this.children.length });
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new CustomMultiChildLayoutElement(this, parent, runtime);
    }
}

// ============================================================================
// RENDER CUSTOM MULTI CHILD LAYOUT BOX
// ============================================================================

class RenderCustomMultiChildLayoutBox {
    constructor({ delegate = null } = {}) {
        this.delegate = delegate;
    }

    debugInfo() {
        return {
            type: 'RenderCustomMultiChildLayoutBox',
            delegateType: this.delegate?.constructor.name
        };
    }
}

// ============================================================================
// CUSTOM MULTI CHILD LAYOUT ELEMENT
// ============================================================================

class CustomMultiChildLayoutElement extends Widget.constructor.prototype.constructor {
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

export {
    CustomSingleChildLayout,
    RenderCustomSingleChildLayoutBox,
    SingleChildLayoutDelegate,
    LayoutId,
    CustomMultiChildLayout,
    RenderCustomMultiChildLayoutBox,
    MultiChildLayoutDelegate
};