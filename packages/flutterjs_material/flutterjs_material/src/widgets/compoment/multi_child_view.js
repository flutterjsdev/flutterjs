// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


import { Widget, } from '../../core/widget_element.js';
import { Element } from "@flutterjs/runtime"
import { VNode } from '@flutterjs/vdom/vnode';
import { MainAxisAlignment } from '../../utils/property/main_axis_alignment.js';
import { CrossAxisAlignment } from '../../utils/property/cross_axis_alignment.js';
import { Axis, TextDirection, VerticalDirection, Clip, FlexFit, WrapAlignment, WrapCrossAlignment, MainAxisSize } from '../../utils/utils.js';

// ============================================================================
// ENUMS
// ============================================================================



// ============================================================================
// HELPERS
// ============================================================================

/**
 * Reconcile a single child element.
 * 
 * @param {Element} parent The parent element.
 * @param {Element|null} oldChildElement The existing child element (if any).
 * @param {Widget|null} newWidget The new widget configuration.
 * @returns {Element|null} The updated or new child element.
 */
function reconcileChild(parent, oldChildElement, newWidget) {
    if (!newWidget) {
        if (oldChildElement) {
            oldChildElement.unmount();
        }
        return null;
    }

    // Check for reuse
    if (oldChildElement &&
        oldChildElement.widget.constructor === newWidget.constructor &&
        oldChildElement.widget.key === newWidget.key) {

        oldChildElement.updateWidget(newWidget);

        // Ensure the child is up-to-date (synchronous rebuild if dirty)
        if (oldChildElement.dirty) {
            oldChildElement.rebuild();
        }
        return oldChildElement;
    }

    // Replace
    if (oldChildElement) {
        oldChildElement.unmount();
    }

    const newChildElement = newWidget.createElement(parent, parent.runtime);
    newChildElement.mount(parent);
    return newChildElement;
}

// ============================================================================
// FLEX PARENT DATA
// ============================================================================

class FlexParentData {
    constructor() {
        this.flex = null;
        this.fit = FlexFit.loose;
    }

    debugInfo() {
        return {
            flex: this.flex,
            fit: this.fit
        };
    }
}

// ============================================================================
// RENDER FLEX
// ============================================================================

class RenderFlex {
    constructor({
        direction = Axis.horizontal,
        mainAxisAlignment = MainAxisAlignment.start,
        mainAxisSize = MainAxisSize.max,
        crossAxisAlignment = CrossAxisAlignment.center,
        textDirection = TextDirection.ltr,
        verticalDirection = VerticalDirection.down,
        textBaseline = null,
        clipBehavior = Clip.none,
        spacing = 0
    } = {}) {
        this.direction = direction;
        this.mainAxisAlignment = mainAxisAlignment;
        this.mainAxisSize = mainAxisSize;
        this.crossAxisAlignment = crossAxisAlignment;
        this.textDirection = textDirection;
        this.verticalDirection = verticalDirection;
        this.textBaseline = textBaseline;
        this.clipBehavior = clipBehavior;
        this.spacing = spacing;
        this._children = [];
    }

    addChild(child) {
        this._children.push(child);
    }

    removeChild(child) {
        const index = this._children.indexOf(child);
        if (index > -1) {
            this._children.splice(index, 1);
        }
    }

    debugInfo() {
        return {
            type: 'RenderFlex',
            direction: this.direction,
            mainAxisAlignment: this.mainAxisAlignment,
            mainAxisSize: this.mainAxisSize,
            crossAxisAlignment: this.crossAxisAlignment,
            textDirection: this.textDirection,
            spacing: this.spacing,
            childCount: this._children.length
        };
    }
}

// ============================================================================
// FLEX WIDGET
// ============================================================================

class Flex extends Widget {
    constructor({
        key = null,
        direction = Axis.horizontal,
        mainAxisAlignment = MainAxisAlignment.start,
        mainAxisSize = MainAxisSize.max,
        crossAxisAlignment = CrossAxisAlignment.center,
        textDirection = null,
        verticalDirection = VerticalDirection.down,
        textBaseline = null,
        clipBehavior = Clip.none,
        spacing = 0,
        children = []
    } = {}) {
        super(key);

        // Validate baseline
        if (crossAxisAlignment === CrossAxisAlignment.baseline && !textBaseline) {
            throw new Error(
                'textBaseline is required when crossAxisAlignment is CrossAxisAlignment.baseline'
            );
        }

        this.direction = direction;
        this.mainAxisAlignment = mainAxisAlignment;
        this.mainAxisSize = mainAxisSize;
        this.crossAxisAlignment = crossAxisAlignment;
        this.textDirection = textDirection;
        this.verticalDirection = verticalDirection;
        this.textBaseline = textBaseline;
        this.clipBehavior = clipBehavior;
        this.spacing = spacing;
        this.spacing = spacing;
        this.children = (children || []).flat(Infinity);
        this._renderObject = null;

        // Size Intent Bubbling - Smart Logic
        // We only want to bubble "Full Size" intent if we actually NEED the space.
        // 1. If we have Flexible/Expanded/Spacer children, we need full space to let them grow.
        // 2. If we have non-start alignment, we need full space to position children.

        // Universal check to catch any variation (String, Object, Enum) for Start Alignment
        const isStart = (mainAxisAlignment === MainAxisAlignment.start) ||
            (mainAxisAlignment === 'start') ||
            (mainAxisAlignment === 'flex-start') ||
            (typeof mainAxisAlignment === 'object' && mainAxisAlignment.name === 'start') ||
            (!mainAxisAlignment);

        const isAlignmentNeeded = !isStart;

        const hasFlexibleChildren = children.some(child => {
            // Explicitly ignore Column/Row to prevent false positives in layout
            if (child.constructor.name === 'Column' || child.constructor.name === 'Row') return false;

            return child instanceof Flexible ||
                (child.constructor && ['Flexible', 'Expanded', 'Spacer'].includes(child.constructor.name)) ||
                (child.flex !== undefined && child.fit !== undefined)
        });

        // Default max is technically "fill", but for Web behavior matching "shrink-wrap" vs "fill"
        // we only force it if we have a reason to occupy the space.
        const isMax = (mainAxisSize === MainAxisSize.max || mainAxisSize === 'max' || mainAxisSize === undefined);

        const needsFullSize = isMax && (hasFlexibleChildren || isAlignmentNeeded);

        this.isFullWidth = (direction === Axis.horizontal) && needsFullSize;
        this.isFullHeight = (direction === Axis.vertical) && needsFullSize;
    }

    /**
     * Check if text direction is needed
     * @private
     */
    _needTextDirection() {
        if (this.direction === Axis.horizontal) {
            return true;
        }
        return this.crossAxisAlignment === CrossAxisAlignment.start ||
            this.crossAxisAlignment === CrossAxisAlignment.end;
    }

    /**
     * Get effective text direction
     */
    getEffectiveTextDirection(context) {
        if (this.textDirection) {
            return this.textDirection;
        }

        if (this._needTextDirection()) {
            return context?.textDirection || TextDirection.ltr;
        }

        return null;
    }

    /**
     * Create render object
     */
    createRenderObject(context) {
        return new RenderFlex({
            direction: this.direction,
            mainAxisAlignment: this.mainAxisAlignment,
            mainAxisSize: this.mainAxisSize,
            crossAxisAlignment: this.crossAxisAlignment,
            textDirection: this.getEffectiveTextDirection(context),
            verticalDirection: this.verticalDirection,
            textBaseline: this.textBaseline,
            clipBehavior: this.clipBehavior,
            spacing: this.spacing
        });
    }

    /**
     * Update render object
     */
    updateRenderObject(context, renderObject) {
        renderObject.direction = this.direction;
        renderObject.mainAxisAlignment = this.mainAxisAlignment;
        renderObject.mainAxisSize = this.mainAxisSize;
        renderObject.crossAxisAlignment = this.crossAxisAlignment;
        renderObject.textDirection = this.getEffectiveTextDirection(context);
        renderObject.verticalDirection = this.verticalDirection;
        renderObject.textBaseline = this.textBaseline;
        renderObject.clipBehavior = this.clipBehavior;
        renderObject.spacing = this.spacing;
    }

    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'direction', value: this.direction });
        properties.push({ name: 'mainAxisAlignment', value: this.mainAxisAlignment });
        properties.push({ name: 'mainAxisSize', value: this.mainAxisSize });
        properties.push({ name: 'crossAxisAlignment', value: this.crossAxisAlignment });
        properties.push({ name: 'textDirection', value: this.textDirection });
        properties.push({ name: 'spacing', value: this.spacing });
        properties.push({ name: 'childCount', value: this.children.length });
    }

    createElement(parent, runtime) {
        return new FlexElement(this, parent, runtime);
    }
}

class FlexElement extends Element {
    performRebuild() {
        // 1. Maintain Logic for RenderObject (Optional but preserved from original)
        if (!this.widget._renderObject) {
            this.widget._renderObject = this.widget.createRenderObject(this.context);
        } else {
            this.widget.updateRenderObject(this.context, this.widget._renderObject);
        }

        const widget = this.widget;
        const context = this.context;

        // 2. Map alignment to CSS
        const justifyContent = this._mapMainAxisAlignment(widget.mainAxisAlignment);
        const alignItems = this._mapCrossAxisAlignment(widget.crossAxisAlignment);
        var flexDirection = widget.direction === Axis.horizontal ? 'row' : 'column';

        // Handle reverse direction
        if (widget.verticalDirection === VerticalDirection.up && widget.direction === Axis.vertical) {
            flexDirection = 'column-reverse';
        }

        const overflowValue = widget.clipBehavior === Clip.none ? 'visible' : 'hidden';
        const isHorizontal = widget.direction === Axis.horizontal;

        // Harden MainAxisSize check
        // Default to MAX if not explicitly MIN
        const mainAxisSizeVal = widget.mainAxisSize;
        // Treat as MIN only if it explicitly equals 'min' or MainAxisSize.min
        const isMin = mainAxisSizeVal === 'min' || mainAxisSizeVal === MainAxisSize.min;
        const isMainMax = !isMin; // Default to max (Flutter behavior)

        const style = {
            // Use inline-flex checks to fix Auto Width behavior in Rows
            display: (isHorizontal && !widget.isFullWidth) ? 'inline-flex' : 'flex',
            flexDirection,
            justifyContent,
            alignItems,
            gap: `${widget.spacing}px`,
            // ✅ FIXED: Width/height logic for flex containers 
            // For Row (horizontal): width 100% if Max, auto if Min. Height auto.
            // For Column (vertical): Width 100% (like block). Height 100% if Max, auto if Min.

            width: (isHorizontal && widget.isFullWidth) ? '100%' : 'auto',
            maxWidth: (isHorizontal && widget.isFullWidth) || (!isHorizontal) ? '100%' : 'fit-content',

            // Fixed height: 100% is required for Scrolling to work (constraints propagation)
            // Use auto only if MainAxisSize.min
            height: (!isHorizontal && isMainMax) ? '100%' : 'auto',
            minHeight: 'auto',

            direction: widget.textDirection === TextDirection.rtl ? 'rtl' : 'ltr',
            overflow: overflowValue,
            flexWrap: 'nowrap',
            boxSizing: 'border-box',
            // Critical for scrolling: prevent flex item from shrinking smaller than content
            flexShrink: 0,
            // Robustness: ensure this Flex fills the cross-axis of a parent Flex (like Column)
            alignSelf: 'stretch'
        };

        // 3. Reconcile Children
        const newWidgets = widget.children;
        const oldChildren = this._children || [];
        const newChildrenElements = [];
        const childVNodes = [];

        for (let i = 0; i < newWidgets.length; i++) {
            const newWidget = newWidgets[i];

            // Match existing child by index (Simple List Diffing)
            // TODO: Enhance with Key support if needed
            const oldChild = i < oldChildren.length ? oldChildren[i] : null;

            const childElement = reconcileChild(this, oldChild, newWidget);
            if (childElement) {
                newChildrenElements.push(childElement);

                // Wrapper Logic (Flexible/Expanded support)
                let childStyle = {};
                const isFlexible = newWidget instanceof Flexible ||
                    (newWidget.constructor && ['Flexible', 'Expanded', 'Spacer'].includes(newWidget.constructor.name));

                // FLEX FACTOR
                if (isFlexible) {
                    const flexValue = newWidget.flex || 1;
                    const fit = newWidget.fit || FlexFit.loose;

                    if (fit === FlexFit.tight) {
                        childStyle.flex = `${flexValue} ${flexValue} 0%`; // Tight: grow and shrink
                    } else {
                        // Loose: grow but allow content to determine basis? No, Flutter Loose means "at most".
                        // Web: flex: <grow> <shrink> <basis>
                        // If we use flex: N N auto, it grows.
                        childStyle.flex = `${flexValue} 1 auto`;
                    }
                } else {
                    childStyle.flex = '0 0 auto'; // Non-flexible: standard
                }

                // CROSS AXIS ALIGNMENT (Override parent alignItems if needed?)
                // Actually Flutter handles this via wrapper logic if needed.
                // But generally children just exist.

                // Improved Wrapper: Becomes a Flex container to handle cross-axis alignment properly
                // This allows 'width: 100%' children to expand while respecting 'alignItems' for others.
                const isColumn = flexDirection.includes('column');

                // Sniff child intent for cross-axis expansion
                // In a Column (vertical), cross-axis is horizontal (width).
                // In a Row (horizontal), cross-axis is vertical (height).
                const wantsFullCross = isHorizontal ? newWidget.isFullHeight : newWidget.isFullWidth;

                const wrapperStyle = {
                    minWidth: 0,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: isColumn ? 'column' : 'row',
                    alignItems: alignItems, // Inherit cross-axis alignment
                    // Don't force width/height - let flex property control sizing for flexible children
                    // Only set explicit width/height for non-flexible children to match parent cross-axis
                    boxSizing: 'border-box'
                };

                // For non-flexible children, set cross-axis size to match parent 
                // if stretch is requested OR if the child explicitly wants to be full-width
                const isStretch = widget.crossAxisAlignment === 'stretch' || (widget.crossAxisAlignment && (widget.crossAxisAlignment.name === 'stretch' || widget.crossAxisAlignment === CrossAxisAlignment.stretch));
                if (isStretch || wantsFullCross) {
                    if (isHorizontal) {
                        wrapperStyle.height = '100%';
                    } else {
                        wrapperStyle.width = '100%';
                    }
                }

                // Add to VNode list
                childVNodes.push(new VNode({
                    tag: 'div',
                    props: {
                        style: { ...childStyle, ...wrapperStyle } // Merge styles
                    },
                    children: [childElement.vnode] // Use the cached/updated VNode
                }));
            }
        }

        // Unmount extra children
        for (let i = newWidgets.length; i < oldChildren.length; i++) {
            if (oldChildren[i]) {
                oldChildren[i].unmount();
            }
        }

        this._children = newChildrenElements;

        // 4. Return Container VNode
        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': this.getElementId(),
                'data-widget-path': this.getWidgetPath(),
                'data-widget': 'Flex',
                'data-direction': widget.direction,
                'data-main-axis': widget.mainAxisAlignment,
                'data-cross-axis': widget.crossAxisAlignment,
                'data-spacing': widget.spacing
            },
            children: childVNodes,
            key: widget.key
        });
    }

    _mapMainAxisAlignment(value) {
        if (!value) return 'flex-start';
        // Handle Enum objects (e.g. { name: 'spaceBetween' })
        if (typeof value === 'object' && value.name) value = value.name;
        if (typeof value === 'string' && value.startsWith('.')) value = value.substring(1);

        const map = {
            start: 'flex-start', end: 'flex-end', center: 'center',
            spaceBetween: 'space-between', spaceAround: 'space-around', spaceEvenly: 'space-evenly',
            'flex-start': 'flex-start', 'flex-end': 'flex-end',
            'space-between': 'space-between', 'space-around': 'space-around', 'space-evenly': 'space-evenly'
        };
        return map[value] || value || 'flex-start';
    }

    _mapCrossAxisAlignment(value) {
        if (!value) return 'center';
        // Handle Enum objects
        if (typeof value === 'object' && value.name) value = value.name;
        if (typeof value === 'string' && value.startsWith('.')) value = value.substring(1);

        const map = {
            start: 'flex-start', end: 'flex-end', center: 'center',
            stretch: 'stretch', baseline: 'baseline',
            'flex-start': 'flex-start', 'flex-end': 'flex-end'
        };
        return map[value] || value || 'center';
    }
}

// ============================================================================
// ROW WIDGET
// ============================================================================

class Row extends Flex {
    constructor(options = {}) {
        super({
            ...options,
            direction: Axis.horizontal
        });
    }
}

// ============================================================================
// COLUMN WIDGET
// ============================================================================

class Column extends Flex {
    constructor(options = {}) {
        super({
            ...options,
            direction: Axis.vertical
        });
    }
}

// ============================================================================
// FLEXIBLE WIDGET
// ============================================================================

class Flexible extends Widget {
    constructor({
        key = null,
        flex = 1,
        fit = FlexFit.loose,
        child = null
    } = {}) {
        super(key);

        if (flex <= 0) {
            throw new Error('flex must be > 0');
        }

        this.flex = flex;
        this.fit = fit;
        this.child = child;

        // Flexible children always intend to occupy space on the main axis
        this.isFullWidth = true;
        this.isFullHeight = true;
    }

    /**
     * Apply flex parent data
     */
    applyParentData(renderObject) {
        if (!renderObject.parentData) {
            renderObject.parentData = new FlexParentData();
        }

        const parentData = renderObject.parentData;
        let needsLayout = false;

        if (parentData.flex !== this.flex) {
            parentData.flex = this.flex;
            needsLayout = true;
        }

        if (parentData.fit !== this.fit) {
            parentData.fit = this.fit;
            needsLayout = true;
        }

        if (needsLayout && renderObject.parent) {
            renderObject.parent.markNeedsLayout?.();
        }
    }

    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'flex', value: this.flex });
        properties.push({ name: 'fit', value: this.fit });
    }

    createElement(parent, runtime) {
        return new FlexibleElement(this, parent, runtime);
    }
}

class FlexibleElement extends Element {
    performRebuild() {
        // Reconcile single child
        const childWidget = this.widget.child;
        const oldChild = (this._children && this._children.length > 0) ? this._children[0] : null;

        const childElement = reconcileChild(this, oldChild, childWidget);

        if (childElement) {
            this._children = [childElement];
            return childElement.vnode;
        } else {
            this._children = [];
            return null;
        }
    }
}

// ============================================================================
// EXPANDED WIDGET
// ============================================================================

class Expanded extends Flexible {
    constructor({
        key = null,
        flex = 1,
        child = null
    } = {}) {
        super({
            key,
            flex,
            fit: FlexFit.tight,
            child
        });
    }
}

// ============================================================================
// WRAP WIDGET
// ============================================================================

class Wrap extends Widget {
    constructor({
        key = null,
        direction = Axis.horizontal,
        alignment = WrapAlignment.start,
        spacing = 0,
        runAlignment = WrapAlignment.start,
        runSpacing = 0,
        crossAxisAlignment = WrapCrossAlignment.start,
        textDirection = null,
        verticalDirection = VerticalDirection.down,
        clipBehavior = Clip.none,
        children = []
    } = {}) {
        super(key);

        this.direction = direction;
        this.alignment = alignment;
        this.spacing = spacing;
        this.runAlignment = runAlignment;
        this.runSpacing = runSpacing;
        this.crossAxisAlignment = crossAxisAlignment;
        this.textDirection = textDirection;
        this.verticalDirection = verticalDirection;
        this.clipBehavior = clipBehavior;
        this.children = children || [];
    }

    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'direction', value: this.direction });
        properties.push({ name: 'alignment', value: this.alignment });
        properties.push({ name: 'spacing', value: this.spacing });
        properties.push({ name: 'runAlignment', value: this.runAlignment });
        properties.push({ name: 'runSpacing', value: this.runSpacing });
        properties.push({ name: 'childCount', value: this.children.length });
    }

    createElement(parent, runtime) {
        return new WrapElement(this, parent, runtime);
    }
}

class WrapElement extends Element {
    performRebuild() {
        const widget = this.widget;

        const flexDirection = widget.direction === Axis.horizontal ? 'row' : 'column';
        const overflowValue = widget.clipBehavior === Clip.none ? 'visible' : 'hidden';

        // Map alignments (Helper logic duplicated for safety inside Element)
        const mapAlignment = (val) => {
            if (typeof val === 'string' && val.startsWith('.')) val = val.substring(1);
            const map = {
                start: 'flex-start', end: 'flex-end', center: 'center',
                spaceBetween: 'space-between', spaceAround: 'space-around', spaceEvenly: 'space-evenly'
            };
            return map[val] || 'flex-start';
        };

        const style = {
            display: 'flex',
            flexDirection,
            flexWrap: 'wrap',
            justifyContent: mapAlignment(widget.alignment),
            alignContent: mapAlignment(widget.runAlignment),
            gap: `${widget.spacing}px ${widget.runSpacing}px`,
            direction: widget.textDirection === TextDirection.rtl ? 'rtl' : 'ltr',
            overflow: overflowValue
        };

        // Reconcile Children
        const newWidgets = widget.children;
        const oldChildren = this._children || [];
        const newChildrenElements = [];
        const childVNodes = [];

        for (let i = 0; i < newWidgets.length; i++) {
            const newWidget = newWidgets[i];
            const oldChild = i < oldChildren.length ? oldChildren[i] : null;
            const childElement = reconcileChild(this, oldChild, newWidget);

            if (childElement) {
                newChildrenElements.push(childElement);
                childVNodes.push(childElement.vnode);
            }
        }

        for (let i = newWidgets.length; i < oldChildren.length; i++) {
            if (oldChildren[i]) oldChildren[i].unmount();
        }
        this._children = newChildrenElements;

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': this.getElementId(),
                'data-widget-path': this.getWidgetPath(),
                'data-widget': 'Wrap',
                'data-direction': widget.direction,
            },
            children: childVNodes,
            key: widget.key
        });
    }
}

// ============================================================================
// FLOW DELEGATE BASE CLASS
// ============================================================================

class FlowDelegate {
    constructor() {
        if (new.target === FlowDelegate) {
            throw new Error('FlowDelegate is abstract');
        }
    }

    getSize(constraints) {
        throw new Error('getSize() must be implemented');
    }

    paintChildren(context, sizes) {
        throw new Error('paintChildren() must be implemented');
    }

    shouldRepaint(oldDelegate) {
        return true;
    }

    shouldReflow(oldDelegate) {
        return true;
    }
}

// ============================================================================
// FLOW WIDGET
// ============================================================================

class Flow extends Widget {
    constructor({
        key = null,
        delegate = null,
        clipBehavior = Clip.hardEdge,
        children = []
    } = {}) {
        super(key);

        if (!delegate) {
            throw new Error('Flow requires a delegate');
        }

        if (!(delegate instanceof FlowDelegate)) {
            throw new Error('delegate must be an instance of FlowDelegate');
        }

        this.delegate = delegate;
        this.clipBehavior = clipBehavior;
        this.children = children || [];
    }

    debugFillProperties(properties) {
        super.debugFillProperties(properties);
        properties.push({ name: 'delegate', value: this.delegate.constructor.name });
        properties.push({ name: 'clipBehavior', value: this.clipBehavior });
        properties.push({ name: 'childCount', value: this.children.length });
    }

    createElement(parent, runtime) {
        return new FlowElement(this, parent, runtime);
    }
}

class FlowElement extends Element {
    performRebuild() {
        const widget = this.widget;
        const overflowValue = widget.clipBehavior === Clip.none ? 'visible' : 'hidden';

        const style = {
            position: 'relative',
            display: 'inline-block',
            overflow: overflowValue
        };

        // Reconcile Children
        const newWidgets = widget.children;
        const oldChildren = this._children || [];
        const newChildrenElements = [];
        const childVNodes = [];

        for (let i = 0; i < newWidgets.length; i++) {
            const newWidget = newWidgets[i];
            const oldChild = i < oldChildren.length ? oldChildren[i] : null;
            const childElement = reconcileChild(this, oldChild, newWidget);

            if (childElement) {
                newChildrenElements.push(childElement);
                // Wrap in positional div
                childVNodes.push(new VNode({
                    tag: 'div',
                    props: {
                        style: {
                            position: 'absolute',
                            left: 0,
                            top: 0
                        },
                        'data-flow-index': i
                    },
                    children: [childElement.vnode]
                }));
            }
        }

        for (let i = newWidgets.length; i < oldChildren.length; i++) {
            if (oldChildren[i]) oldChildren[i].unmount();
        }
        this._children = newChildrenElements;

        return new VNode({
            tag: 'div',
            props: {
                style,
                'data-element-id': this.getElementId(),
                'data-widget-path': this.getWidgetPath(),
                'data-widget': 'Flow',
                'data-clip-behavior': widget.clipBehavior,
            },
            children: childVNodes,
            key: widget.key
        });
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
    Flex,
    FlexElement,
    RenderFlex,
    Row,
    Column,
    Flexible,
    FlexibleElement,
    FlexParentData,
    Expanded,
    Wrap,
    WrapElement,
    Flow,
    FlowElement,
    FlowDelegate,
    MainAxisSize
};