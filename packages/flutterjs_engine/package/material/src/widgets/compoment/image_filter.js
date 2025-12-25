import { UbiquitousInheritedWidget, UbiquitousInheritedElement } from './directionality.js';
import { VNode } from '@flutterjs/vdom/vnode';

// ============================================================================
// IMAGE FILTER
// Represents a visual filter effect (blur, matrix, etc.)
// ============================================================================

class ImageFilter {
    constructor(type = 'blur', values = {}) {
        this.type = type;
        this.values = values;
    }

    /**
     * Create blur filter
     */
    static blur({ sigmaX = 0, sigmaY = 0 } = {}) {
        return new ImageFilter('blur', { sigmaX, sigmaY });
    }

    /**
     * Create matrix filter
     */
    static matrix(values) {
        return new ImageFilter('matrix', values);
    }

    /**
     * Convert to CSS filter string
     */
    toCSSFilter() {
        switch (this.type) {
            case 'blur':
                return `blur(${Math.max(this.values.sigmaX, this.values.sigmaY)}px)`;
            case 'matrix':
                return `matrix(${Object.values(this.values).join(', ')})`;
            default:
                return 'none';
        }
    }

    /**
     * Check equality with another filter
     */
    equals(other) {
        if (!other || !(other instanceof ImageFilter)) {
            return false;
        }
        return this.type === other.type &&
               JSON.stringify(this.values) === JSON.stringify(other.values);
    }

    toString() {
        return `ImageFilter(${this.type}, ${JSON.stringify(this.values)})`;
    }
}

// ============================================================================
// IMAGE FILTER PROVIDER
// Ubiquitous inherited widget that provides image filter to all descendants
// ============================================================================

class ImageFilterProvider extends UbiquitousInheritedWidget {
    constructor({ key = null, imageFilter = null, child = null } = {}) {
        super({ key, child });

        if (imageFilter && !(imageFilter instanceof ImageFilter)) {
            throw new Error(
                `ImageFilterProvider requires an ImageFilter instance, got: ${typeof imageFilter}`
            );
        }

        this.imageFilter = imageFilter;
    }

    /**
     * Check if should notify dependents
     */
    updateShouldNotify(oldWidget) {
        // Notify if filter changes
        if (!this.imageFilter && !oldWidget.imageFilter) {
            return false;
        }
        if (!this.imageFilter || !oldWidget.imageFilter) {
            return true;
        }
        return !this.imageFilter.equals(oldWidget.imageFilter);
    }

    /**
     * Get ImageFilterProvider from context
     * Throws if not found
     */
    static of(context) {
        const widget = context.dependOnInheritedWidgetOfExactType(ImageFilterProvider);

        if (!widget) {
            throw new Error(
                'ImageFilterProvider.of() called with a context that does not contain an ImageFilterProvider widget. ' +
                'Make sure to wrap your widget tree with an ImageFilterProvider widget.'
            );
        }

        return widget;
    }

    /**
     * Get ImageFilterProvider from context (returns null if not found)
     */
    static maybeOf(context) {
        const widget = context.getInheritedWidgetOfExactType(ImageFilterProvider);
        return widget || null;
    }

    /**
     * Build the widget tree
     */
    build(context) {
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

        const elementId = context.element.getElementId();
        const widgetPath = context.element.getWidgetPath();

        // Apply filter styling to container
        const filterCss = this.imageFilter ? this.imageFilter.toCSSFilter() : 'none';

        return new VNode({
            tag: 'div',
            props: {
                style: {
                    position: 'relative',
                    filter: filterCss
                },
                'data-element-id': elementId,
                'data-widget-path': widgetPath,
                'data-widget': 'ImageFilterProvider',
                'data-filter-type': this.imageFilter ? this.imageFilter.type : 'none',
                'data-filter-css': filterCss
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
        if (this.imageFilter) {
            properties.push({
                name: 'imageFilter',
                value: this.imageFilter.toString()
            });
            properties.push({
                name: 'filterType',
                value: this.imageFilter.type
            });
            properties.push({
                name: 'cssFilter',
                value: this.imageFilter.toCSSFilter()
            });
        }
    }

    /**
     * Create element
     */
    createElement() {
        return new UbiquitousInheritedElement(this);
    }
}

export { ImageFilter, ImageFilterProvider };