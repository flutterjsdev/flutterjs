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

export default FlutterjsWidgets;

