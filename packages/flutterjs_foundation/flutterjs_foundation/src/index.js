// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * FlutterJS FlutterjsFoundation
 * 
 * Simple, lightweight implementation built with JavaScript
 */

/**
 * Main class for FlutterjsFoundation
 */
export class FlutterjsFoundation {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Example method - replace with your implementation
   */
  hello() {
    return 'Hello from FlutterjsFoundation!';
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
  return new FlutterjsFoundation(config);
}

/**
 * TargetPlatform - Enum for platform types
 */
export const TargetPlatform = Object.freeze({
  android: 'android',
  fuchsia: 'fuchsia',
  iOS: 'iOS',
  linux: 'linux',
  macOS: 'macOS',
  windows: 'windows',
});

/**
 * The current platform (always returns null for web since web is not a TargetPlatform value)
 */
export const defaultTargetPlatform = null;

/**
 * kIsWeb - true if running on web
 */
export const kIsWeb = true;

/**
 * kDebugMode - true if in debug mode (always true for development)
 */
export const kDebugMode = true;

/**
 * kProfileMode - true if in profile mode
 */
export const kProfileMode = false;

/**
 * kReleaseMode - true if in release mode
 */
export const kReleaseMode = false;

export default FlutterjsFoundation;
