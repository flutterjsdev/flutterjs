// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * FlutterJS FlutterjsServices
 * 
 * Simple, lightweight implementation built with JavaScript
 */

/**
 * Main class for FlutterjsServices
 */
export class FlutterjsServices {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Example method - replace with your implementation
   */
  hello() {
    return 'Hello from FlutterjsServices!';
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
 * MethodChannel stub for native platform compatibility on web
 */
export class MethodChannel {
  constructor(name, codec = null, binaryMessenger = null) {
    this.name = name;
    this.codec = codec;
    this.binaryMessenger = binaryMessenger;
  }

  /**
   * Stub for invokeMethod
   * @returns {Promise<any>}
   */
  async invokeMethod(method, args) {
    console.warn(`MethodChannel(${this.name}).invokeMethod("${method}") called on web. This is a stub.`);
    return null;
  }

  /**
   * Stub for invokeListMethod
   */
  async invokeListMethod(method, args) {
    return [];
  }

  /**
   * Stub for invokeMapMethod
   */
  async invokeMapMethod(method, args) {
    return {};
  }
}

/**
 * Helper function
 */
export function createInstance(config) {
  return new FlutterjsServices(config);
}

/**
 * SystemUiOverlayStyle - Stub for web (iOS-specific styling)
 */
export const SystemUiOverlayStyle = Object.freeze({
  light: { brightness: 'light' },
  dark: { brightness: 'dark' },
});

/**
 * SystemChrome - Stub for platform UI controls on web
 */
export class SystemChrome {
  /**
   * Sets the system overlay style (no-op on web)
   */
  static setSystemUIOverlayStyle(style) {
    // No-op on web - iOS/Android specific
    console.debug('SystemChrome.setSystemUIOverlayStyle called on web (no-op)');
  }

  /**
   * Sets which overlays are visible (no-op on web)
   */
  static setEnabledSystemUIOverlays(overlays) {
    console.debug('SystemChrome.setEnabledSystemUIOverlays called on web (no-op)');
  }

  /**
   * Sets preferred orientations (no-op on web)
   */
  static setPreferredOrientations(orientations) {
    console.debug('SystemChrome.setPreferredOrientations called on web (no-op)');
    return Promise.resolve();
  }

  /**
   * Sets the system UI mode (no-op on web)
   */
  static setEnabledSystemUIMode(mode) {
    console.debug('SystemChrome.setEnabledSystemUIMode called on web (no-op)');
    return Promise.resolve();
  }
}

export default FlutterjsServices;
