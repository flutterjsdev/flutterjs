// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * FlutterJS FlutterjsWidgets
 * 
 * Simple, lightweight implementation built with JavaScript
 */

/**
 * Main class for FlutterjsWidgets
 */
export class FlutterjsWidgets {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Example method - replace with your implementation
   */
  hello() {
    return 'Hello from FlutterjsWidgets!';
  }

  /**
   * Example async method
   */
  async fetchData(url) {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }
}

/**
 * Helper function
 */
export function createInstance(config) {
  return new FlutterjsWidgets(config);
}

/**
 * WidgetsBinding stub for web compatibility
 * In Flutter, WidgetsBinding provides the glue between the widgets layer and the Flutter engine.
 * On the web platform, we provide a minimal stub.
 */
class _WidgetsBinding {
  constructor() {
    this._renderViews = [];
    this._platformDispatcher = {
      implicitView: null,
    };
  }

  get renderViews() {
    return this._renderViews;
  }

  get platformDispatcher() {
    return this._platformDispatcher;
  }
}

// Singleton instance
const _widgetsBindingInstance = new _WidgetsBinding();

export const WidgetsBinding = {
  get instance() {
    return _widgetsBindingInstance;
  }
};

/**
 * PlatformViewLink - Widget for embedding platform-specific views
 *
 * On web, this is a stub that renders a placeholder div.
 * In a full Flutter app, this would create an HTML element that hosts native platform content.
 */
export class PlatformViewLink {
  /**
   * @param {Object} params
   * @param {string} params.viewType - The unique identifier for the type of platform view
   * @param {Function} params.onCreatePlatformView - Callback to create the platform view
   * @param {Object} params.surfaceFactory - Factory for creating the rendering surface
   */
  constructor({ viewType, onCreatePlatformView, surfaceFactory } = {}) {
    this.viewType = viewType;
    this.onCreatePlatformView = onCreatePlatformView;
    this.surfaceFactory = surfaceFactory;

    // On web, create a simple placeholder
    console.debug(`PlatformViewLink created for viewType: ${viewType}`);
  }

  /**
   * Build method - returns a placeholder for web
   */
  build(context) {
    // In a real implementation, this would call onCreatePlatformView
    // and set up the platform view rendering surface
    return { type: 'PlatformView', viewType: this.viewType };
  }
}

/**
 * PlatformViewCreationParams - Parameters for creating a platform view
 */
export class PlatformViewCreationParams {
  constructor({ id, viewType, onPlatformViewCreated, onFocusChanged } = {}) {
    this.id = id;
    this.viewType = viewType;
    this.onPlatformViewCreated = onPlatformViewCreated;
    this.onFocusChanged = onFocusChanged;
  }
}

/**
 * ExcludeFocus - Widget that excludes its subtree from focus traversal
 * Stub for web compatibility
 */
export class ExcludeFocus {
  constructor({ child, excluding = true } = {}) {
    this.child = child;
    this.excluding = excluding;
  }

  build(context) {
    return this.child;
  }
}

/**
 * ExcludeSemantics - Widget that excludes its subtree from semantics tree
 * Stub for web compatibility
 */
export class ExcludeSemantics {
  constructor({ child, excluding = true } = {}) {
    this.child = child;
    this.excluding = excluding;
  }

  build(context) {
    return this.child;
  }
}

/**
 * Semantics - Widget that annotates the widget tree with semantic information
 * Stub for web compatibility
 */
export class Semantics {
  constructor({
    child,
    link = false,
    identifier = null,
    linkUrl = null,
    label = null,
    button = false,
    enabled = true
  } = {}) {
    this.child = child;
    this.link = link;
    this.identifier = identifier;
    this.linkUrl = linkUrl;
    this.label = label;
    this.button = button;
    this.enabled = enabled;
  }

  build(context) {
    return this.child;
  }
}

/**
 * MergeSemantics - Widget that merges semantics of its descendants
 * Stub for web compatibility
 */
export class MergeSemantics {
  constructor({ child } = {}) {
    this.child = child;
  }

  build(context) {
    return this.child;
  }
}

export default FlutterjsWidgets;

