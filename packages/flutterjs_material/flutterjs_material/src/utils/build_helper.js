// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Build Helper Utilities
 * 
 * Provides helper functions for properly building widgets through the Element system.
 * This fixes the architectural issue where widgets manually call .build() and expect
 * VNodes, but actually get Widgets.
 */

/**
 * Properly builds a widget to a VNode by creating an Element and going through
 * the proper build lifecycle.
 * 
 * @param {Widget} widget - The widget to build
 * @param {BuildContext} context - The build context
 * @returns {VNode|string|null} - The built VNode
 */
export function buildChildWidget(widget, context) {
    if (!widget) {
        return null;
    }

    // If it's already a VNode or primitive, return as-is
    if (typeof widget === 'string' || typeof widget === 'number') {
        return String(widget);
    }

    if (widget.tag) {
        // It's a VNode
        return widget;
    }

    // Check if widget has createElement (i.e., it's a Widget)
    if (!widget.createElement) {
        console.warn('[buildChildWidget] Object is not a widget:', widget);
        return null;
    }

    // Create an element for the widget
    const element = widget.createElement(context.element, context.element.runtime);

    // Mount the element (this sets up the element tree)
    element.mount(context.element);

    // Build and return the VNode
    const vnode = element.performRebuild();

    return vnode;
}

/**
 * Builds an array of widgets to VNodes
 * 
 * @param {Array<Widget>} widgets - Array of widgets to build
 * @param {BuildContext} context - The build context
 * @returns {Array<VNode|string>} - Array of built VNodes
 */
export function buildChildWidgets(widgets, context) {
    if (!widgets || !Array.isArray(widgets)) {
        return [];
    }

    return widgets
        .map(widget => buildChildWidget(widget, context))
        .filter(vnode => vnode !== null);
}
