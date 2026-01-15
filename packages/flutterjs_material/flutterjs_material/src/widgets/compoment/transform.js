import { ProxyWidget } from '../../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { Offset, Alignment } from '../../utils/utils.js';


// ============================================================================
// ALIGNMENT CLASS
// Represents alignment in 2D space
// ============================================================================



// ============================================================================
// MATRIX4 CLASS (Simplified for 2D transforms)
// Represents a 4x4 transformation matrix
// ============================================================================

class Matrix4 {
    constructor(values = null) {
        // 4x4 matrix stored as 16-element array
        if (values) {
            this.storage = values;
        } else {
            this.storage = new Array(16).fill(0);
            // Identity matrix
            this.storage[0] = 1;
            this.storage[5] = 1;
            this.storage[10] = 1;
            this.storage[15] = 1;
        }
    }

    static identity() {
        return new Matrix4();
    }

    static translationValues(x, y, z = 0) {
        const m = new Matrix4();
        m.storage[12] = x;
        m.storage[13] = y;
        m.storage[14] = z;
        return m;
    }

    static diagonal3Values(x, y, z) {
        const m = new Matrix4();
        m.storage[0] = x;
        m.storage[5] = y;
        m.storage[10] = z;
        return m;
    }

    static rotationZ(radians) {
        const sin = Math.sin(radians);
        const cos = Math.cos(radians);
        const m = new Matrix4();
        m.storage[0] = cos;
        m.storage[1] = sin;
        m.storage[4] = -sin;
        m.storage[5] = cos;
        return m;
    }

    toCSSMatrix() {
        // Convert to CSS matrix() or matrix3d() format
        // For 2D transforms, we use matrix(a, b, c, d, e, f)
        const s = this.storage;
        return `matrix3d(${s[0]}, ${s[1]}, ${s[2]}, ${s[3]}, ${s[4]}, ${s[5]}, ${s[6]}, ${s[7]}, ${s[8]}, ${s[9]}, ${s[10]}, ${s[11]}, ${s[12]}, ${s[13]}, ${s[14]}, ${s[15]})`;
    }

    toString() {
        return `Matrix4(${this.storage.join(', ')})`;
    }
}

// ============================================================================
// FILTER QUALITY ENUM
// ============================================================================

const FilterQuality = {
    low: 'low',
    medium: 'medium',
    high: 'high'
};

// ============================================================================
// TRANSFORM WIDGET
// Applies 2D/3D transformation to child widget
// ============================================================================

class Transform extends ProxyWidget {
    constructor({
        key = null,
        transform = null,
        origin = null,
        alignment = null,
        transformHitTests = true,
        filterQuality = FilterQuality.low,
        child = null
    } = {}) {
        super({ key, child });

        if (!transform) {
            throw new Error('Transform requires a transform (Matrix4)');
        }

        this.transform = transform;
        this.origin = origin;
        this.alignment = alignment;
        this.transformHitTests = transformHitTests;
        this.filterQuality = filterQuality;
        this._renderObject = null;
    }

    /**
     * Static constructor for rotation
     */
    static rotate({
        key = null,
        angle = 0,
        origin = null,
        alignment = Alignment.center,
        transformHitTests = true,
        filterQuality = FilterQuality.low,
        child = null
    } = {}) {
        return new Transform({
            key,
            transform: Matrix4.rotationZ(angle),
            origin,
            alignment,
            transformHitTests,
            filterQuality,
            child
        });
    }

    /**
     * Static constructor for translation
     */
    static translate({
        key = null,
        offset = null,
        transformHitTests = true,
        filterQuality = FilterQuality.low,
        child = null
    } = {}) {
        if (!offset) {
            throw new Error('Transform.translate requires an offset');
        }

        return new Transform({
            key,
            transform: Matrix4.translationValues(offset.dx, offset.dy, 0),
            origin: null,
            alignment: null,
            transformHitTests,
            filterQuality,
            child
        });
    }

    /**
     * Static constructor for scale
     */
    static scale({
        key = null,
        scale = null,
        scaleX = null,
        scaleY = null,
        origin = null,
        alignment = Alignment.center,
        transformHitTests = true,
        filterQuality = FilterQuality.low,
        child = null
    } = {}) {
        if (scale === null && scaleX === null && scaleY === null) {
            throw new Error("At least one of 'scale', 'scaleX' and 'scaleY' is required to be non-null");
        }

        if (scale !== null && (scaleX !== null || scaleY !== null)) {
            throw new Error("If 'scale' is non-null then 'scaleX' and 'scaleY' must be left null");
        }

        const sx = scale ?? scaleX ?? 1.0;
        const sy = scale ?? scaleY ?? 1.0;

        return new Transform({
            key,
            transform: Matrix4.diagonal3Values(sx, sy, 1.0),
            origin,
            alignment,
            transformHitTests,
            filterQuality,
            child
        });
    }

    /**
     * Static constructor for flip
     */
    static flip({
        key = null,
        flipX = false,
        flipY = false,
        origin = null,
        transformHitTests = true,
        filterQuality = FilterQuality.low,
        child = null
    } = {}) {
        return new Transform({
            key,
            transform: Matrix4.diagonal3Values(
                flipX ? -1.0 : 1.0,
                flipY ? -1.0 : 1.0,
                1.0
            ),
            origin,
            alignment: Alignment.center,
            transformHitTests,
            filterQuality,
            child
        });
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return new RenderTransform({
            transform: this.transform,
            origin: this.origin,
            alignment: this.alignment,
            transformHitTests: this.transformHitTests,
            filterQuality: this.filterQuality
        });
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.transform = this.transform;
        renderObject.origin = this.origin;
        renderObject.alignment = this.alignment;
        renderObject.transformHitTests = this.transformHitTests;
        renderObject.filterQuality = this.filterQuality;
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

        // Generate CSS transform
        const transformCss = this._generateTransformCSS();
        const transformOrigin = this._generateTransformOrigin();
        const filter = this._getFilterCSS();

        const style = {
            transform: transformCss,
            transformOrigin: transformOrigin,
            position: 'relative',
            filter: filter
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'Transform',
                'data-filter-quality': this.filterQuality,
                'data-transform-hit-tests': this.transformHitTests
            },
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    /**
     * Generate CSS transform string
     * @private
     */
    _generateTransformCSS() {
        if (!this.transform) {
            return 'none';
        }

        // For simplicity, convert common transforms to CSS
        // For complex transforms, use matrix3d
        return this.transform.toCSSMatrix();
    }

    /**
     * Generate CSS transform-origin
     * @private
     */
    _generateTransformOrigin() {
        if (this.origin) {
            return `${this.origin.dx}px ${this.origin.dy}px`;
        }

        if (this.alignment) {
            // Convert alignment to percentage
            const x = ((this.alignment.x + 1) / 2) * 100;
            const y = ((this.alignment.y + 1) / 2) * 100;
            return `${x}% ${y}%`;
        }

        return '50% 50%'; // Default center
    }

    /**
     * Get filter CSS for quality
     * @private
     */
    _getFilterCSS() {
        switch (this.filterQuality) {
            case FilterQuality.high:
                return 'blur(0px)';
            case FilterQuality.medium:
                return 'blur(0.5px)';
            case FilterQuality.low:
            default:
                return 'none';
        }
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'transform', value: this.transform.toString() });
        if (this.origin) {
            properties.push({ name: 'origin', value: this.origin.toString() });
        }
        if (this.alignment) {
            properties.push({ name: 'alignment', value: this.alignment.toString() });
        }
        properties.push({ name: 'transformHitTests', value: this.transformHitTests });
        properties.push({ name: 'filterQuality', value: this.filterQuality });
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new TransformElement(this,parent, runtime);
    }
}

// ============================================================================
// RENDER TRANSFORM
// ============================================================================

class RenderTransform {
    constructor({
        transform = null,
        origin = null,
        alignment = null,
        transformHitTests = true,
        filterQuality = FilterQuality.low
    } = {}) {
        this.transform = transform;
        this.origin = origin;
        this.alignment = alignment;
        this.transformHitTests = transformHitTests;
        this.filterQuality = filterQuality;
    }

    /**
     * Debug info
     */
    debugInfo() {
        return {
            type: 'RenderTransform',
            transform: this.transform?.toString(),
            origin: this.origin?.toString(),
            alignment: this.alignment?.toString(),
            transformHitTests: this.transformHitTests,
            filterQuality: this.filterQuality
        };
    }
}

// ============================================================================
// TRANSFORM ELEMENT
// ============================================================================

class TransformElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }
}

// ============================================================================
// LAYER LINK
// Used for linking transform targets and followers
// ============================================================================

class LayerLink {
    constructor() {
        this._target = null;
        this._followers = new Set();
    }

    get target() {
        return this._target;
    }

    set target(value) {
        this._target = value;
    }

    addFollower(follower) {
        this._followers.add(follower);
    }

    removeFollower(follower) {
        this._followers.delete(follower);
    }

    getFollowers() {
        return Array.from(this._followers);
    }
}

// ============================================================================
// COMPOSITED TRANSFORM TARGET WIDGET
// Marks a widget as a transform target for followers
// ============================================================================

class CompositedTransformTarget extends ProxyWidget {
    constructor({
        key = null,
        link = null,
        child = null
    } = {}) {
        super({ key, child });

        if (!link) {
            throw new Error('CompositedTransformTarget requires a LayerLink');
        }

        this.link = link;
        this._renderObject = null;
        this._targetElement = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return new RenderLeaderLayer({
            link: this.link
        });
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.link = this.link;
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
                    position: 'relative'
                },
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'CompositedTransformTarget',
                'data-layer-link': this.link.constructor.name,
                ref: (el) => this._onMount(el)
            },
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    /**
     * Mount and register target
     * @private
     */
    _onMount(el) {
        if (!el || !this.link) return;

        this._targetElement = el;
        this.link.target = el;

        // Update all followers
        const followers = this.link.getFollowers();
        followers.forEach(follower => {
            if (follower._updatePosition) {
                follower._updatePosition();
            }
        });
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'link', value: 'LayerLink' });
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new CompositedTransformTargetElement(this,parent, runtime);
    }
}

class RenderLeaderLayer {
    constructor({ link = null } = {}) {
        this.link = link;
    }

    debugInfo() {
        return {
            type: 'RenderLeaderLayer',
            hasLink: !!this.link
        };
    }
}

class CompositedTransformTargetElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }
}

// ============================================================================
// COMPOSITED TRANSFORM FOLLOWER WIDGET
// Follows a transform target's position
// ============================================================================

class CompositedTransformFollower extends ProxyWidget {
    constructor({
        key = null,
        link = null,
        showWhenUnlinked = true,
        offset = null,
        targetAnchor = Alignment.topLeft,
        followerAnchor = Alignment.topLeft,
        child = null
    } = {}) {
        super({ key, child });

        if (!link) {
            throw new Error('CompositedTransformFollower requires a LayerLink');
        }

        this.link = link;
        this.showWhenUnlinked = showWhenUnlinked;
        this.offset = offset || Offset.zero;
        this.targetAnchor = targetAnchor;
        this.followerAnchor = followerAnchor;
        this._renderObject = null;
        this._followerElement = null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return new RenderFollowerLayer({
            link: this.link,
            showWhenUnlinked: this.showWhenUnlinked,
            offset: this.offset,
            leaderAnchor: this.targetAnchor,
            followerAnchor: this.followerAnchor
        });
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.link = this.link;
        renderObject.showWhenUnlinked = this.showWhenUnlinked;
        renderObject.offset = this.offset;
        renderObject.leaderAnchor = this.targetAnchor;
        renderObject.followerAnchor = this.followerAnchor;
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
            position: 'absolute',
            visibility: this.showWhenUnlinked ? 'visible' : 'hidden'
        };

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'CompositedTransformFollower',
                'data-layer-link': this.link.constructor.name,
                ref: (el) => this._onMount(el)
            },
            children: childVNode ? [childVNode] : [],
            key: this.key
        });
    }

    /**
     * Mount and register follower
     * @private
     */
    _onMount(el) {
        if (!el || !this.link) return;

        this._followerElement = el;
        this.link.addFollower(this);
        this._updatePosition();
    }

    /**
     * Update position based on target
     * @private
     */
    _updatePosition() {
        if (!this._followerElement || !this.link.target) {
            return;
        }

        try {
            const targetRect = this.link.target.getBoundingClientRect();
            const followerRect = this._followerElement.getBoundingClientRect();

            // Calculate anchor offsets
            const targetAnchorX = ((this.targetAnchor.x + 1) / 2) * targetRect.width;
            const targetAnchorY = ((this.targetAnchor.y + 1) / 2) * targetRect.height;

            const followerAnchorX = ((this.followerAnchor.x + 1) / 2) * followerRect.width;
            const followerAnchorY = ((this.followerAnchor.y + 1) / 2) * followerRect.height;

            // Calculate final position
            let x = targetRect.left + targetAnchorX - followerAnchorX + this.offset.dx;
            let y = targetRect.top + targetAnchorY - followerAnchorY + this.offset.dy;

            this._followerElement.style.left = `${x}px`;
            this._followerElement.style.top = `${y}px`;
        } catch (error) {
            console.error('Error updating follower position:', error);
        }
    }

    /**
     * Debug properties
     */
    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'link', value: 'LayerLink' });
        properties.push({ name: 'showWhenUnlinked', value: this.showWhenUnlinked });
        properties.push({ name: 'offset', value: this.offset.toString() });
        properties.push({ name: 'targetAnchor', value: this.targetAnchor.toString() });
        properties.push({ name: 'followerAnchor', value: this.followerAnchor.toString() });
    }

    /**
     * Create element
     */
    createElement(parent, runtime) {
        return new CompositedTransformFollowerElement(this,parent, runtime);
    }
}

class RenderFollowerLayer {
    constructor({
        link = null,
        showWhenUnlinked = true,
        offset = null,
        leaderAnchor = null,
        followerAnchor = null
    } = {}) {
        this.link = link;
        this.showWhenUnlinked = showWhenUnlinked;
        this.offset = offset || Offset.zero;
        this.leaderAnchor = leaderAnchor;
        this.followerAnchor = followerAnchor;
    }

    debugInfo() {
        return {
            type: 'RenderFollowerLayer',
            hasLink: !!this.link,
            showWhenUnlinked: this.showWhenUnlinked
        };
    }
}

class CompositedTransformFollowerElement extends ProxyWidget.constructor.prototype.constructor {
    performRebuild() {
        return this.widget.build(this.context);
    }

    detach() {
        if (this.widget.link && this.widget._followerElement) {
            this.widget.link.removeFollower(this.widget);
        }
        super.detach();
    }
}

export {
    Transform,
    RenderTransform,
    CompositedTransformTarget,
    RenderLeaderLayer,
    CompositedTransformFollower,
    RenderFollowerLayer,
    Matrix4,
    LayerLink,
    FilterQuality
};