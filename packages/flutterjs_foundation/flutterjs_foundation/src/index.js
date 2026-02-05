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

export default FlutterjsFoundation;
