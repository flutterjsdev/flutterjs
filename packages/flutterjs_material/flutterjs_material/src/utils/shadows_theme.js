// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { BoxShadow } from './box_shadow.js';
import { Offset } from './geometry.js';

/**
 * Material Design 3 Shadow System (Elevation)
 * Defines shadow values for elevation levels 0-24
 * Follows Flutter Material Design 3 specification
 * 
 * Flutter Reference: https://api.flutter.dev/flutter/material/kElevationToShadow-class.html
 */
export class ShadowsTheme {
  constructor() {
    // Shadow definitions for each elevation level
    this._shadows = this._initializeShadows();
  }

  /**
   * Initialize shadow definitions for all elevation levels
   * @private
   * @returns {Object} Shadow map by elevation
   */
  _initializeShadows() {
    return {
      // Elevation 0 - No shadow
      0: [],

      // Elevation 1 - Subtle shadow
      1: [
        new BoxShadow({
          color: '#00000033', // 20% opacity black
          offset: new Offset(0, 1),
          blurRadius: 3,
          spreadRadius: 0
        })
      ],

      // Elevation 2
      2: [
        new BoxShadow({
          color: '#0000001f', // 12% opacity black
          offset: new Offset(0, 1),
          blurRadius: 2,
          spreadRadius: 0
        }),
        new BoxShadow({
          color: '#00000024', // 14% opacity black
          offset: new Offset(0, 2),
          blurRadius: 4,
          spreadRadius: 0
        })
      ],

      // Elevation 3
      3: [
        new BoxShadow({
          color: '#0000001f', // 12% opacity black
          offset: new Offset(0, 1),
          blurRadius: 3,
          spreadRadius: 0
        }),
        new BoxShadow({
          color: '#00000024', // 14% opacity black
          offset: new Offset(0, 3),
          blurRadius: 6,
          spreadRadius: 0
        })
      ],

      // Elevation 4
      4: [
        new BoxShadow({
          color: '#00000018', // 10% opacity black
          offset: new Offset(0, 2),
          blurRadius: 3,
          spreadRadius: 0
        }),
        new BoxShadow({
          color: '#00000024', // 14% opacity black
          offset: new Offset(0, 4),
          blurRadius: 8,
          spreadRadius: 0
        })
      ],

      // Elevation 5
      5: [
        new BoxShadow({
          color: '#00000018', // 10% opacity black
          offset: new Offset(0, 2),
          blurRadius: 4,
          spreadRadius: 0
        }),
        new BoxShadow({
          color: '#00000024', // 14% opacity black
          offset: new Offset(0, 5),
          blurRadius: 10,
          spreadRadius: 0
        })
      ],

      // Elevation 6
      6: [
        new BoxShadow({
          color: '#00000015', // 8% opacity black
          offset: new Offset(0, 3),
          blurRadius: 4,
          spreadRadius: 0
        }),
        new BoxShadow({
          color: '#00000024', // 14% opacity black
          offset: new Offset(0, 6),
          blurRadius: 12,
          spreadRadius: 0
        })
      ],

      // Elevation 8
      8: [
        new BoxShadow({
          color: '#00000012', // 7% opacity black
          offset: new Offset(0, 5),
          blurRadius: 5,
          spreadRadius: 0
        }),
        new BoxShadow({
          color: '#00000026', // 15% opacity black
          offset: new Offset(0, 8),
          blurRadius: 16,
          spreadRadius: 0
        })
      ],

      // Elevation 12
      12: [
        new BoxShadow({
          color: '#0000000d', // 5% opacity black
          offset: new Offset(0, 7),
          blurRadius: 8,
          spreadRadius: 0
        }),
        new BoxShadow({
          color: '#00000026', // 15% opacity black
          offset: new Offset(0, 12),
          blurRadius: 24,
          spreadRadius: 0
        })
      ],

      // Elevation 16
      16: [
        new BoxShadow({
          color: '#0000000d', // 5% opacity black
          offset: new Offset(0, 8),
          blurRadius: 10,
          spreadRadius: 0
        }),
        new BoxShadow({
          color: '#00000026', // 15% opacity black
          offset: new Offset(0, 16),
          blurRadius: 32,
          spreadRadius: 0
        })
      ],

      // Elevation 24
      24: [
        new BoxShadow({
          color: '#0000000d', // 5% opacity black
          offset: new Offset(0, 11),
          blurRadius: 15,
          spreadRadius: 0
        }),
        new BoxShadow({
          color: '#00000026', // 15% opacity black
          offset: new Offset(0, 24),
          blurRadius: 48,
          spreadRadius: 0
        })
      ]
    };
  }

  /**
   * Get shadow for elevation level
   * @param {number} elevation - Elevation level (0-24)
   * @returns {BoxShadow[]} Array of shadow definitions
   * 
   * @example
   * const shadows = theme.getShadow(4);
   * // Returns array of BoxShadow instances for elevation 4
   */
  getShadow(elevation) {
    // Clamp elevation to valid range
    const level = Math.max(0, Math.min(24, elevation));

    // Map to available elevation levels
    const levels = [0, 1, 2, 3, 4, 5, 6, 8, 12, 16, 24];
    const closest = levels.reduce((prev, curr) =>
      Math.abs(curr - level) < Math.abs(prev - level) ? curr : prev
    );

    return this._shadows[closest] || [];
  }

  /**
   * Get shadow as CSS string
   * @param {number} elevation - Elevation level
   * @returns {string} CSS box-shadow string
   * 
   * @example
   * theme.getShadowCSS(4) // "0 2px 3px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.14)"
   */
  getShadowCSS(elevation) {
    const shadows = this.getShadow(elevation);
    if (shadows.length === 0) return 'none';

    return shadows
      .map(shadow => shadow.toCSSString())
      .join(', ');
  }

  /**
   * Get shadow object for CSS
   * @param {number} elevation - Elevation level
   * @returns {Object} CSS style object
   * 
   * @example
   * const style = theme.getShadowStyle(4);
   * // { boxShadow: "0 2px 3px rgba(...), 0 4px 8px rgba(...)" }
   */
  getShadowStyle(elevation) {
    return {
      boxShadow: this.getShadowCSS(elevation)
    };
  }

  /**
   * Get all elevation shadows
   * @returns {Object} Map of elevation -> shadows
   */
  getAllShadows() {
    return this._shadows;
  }

  /**
   * Create custom shadow theme
   * @param {Object} config - Custom shadow definitions
   * @returns {ShadowsTheme} New theme instance
   * 
   * @example
   * const customTheme = ShadowsTheme.custom({
   *   4: [new BoxShadow({ ...custom shadow... })]
   * });
   */
  static custom(config = {}) {
    const theme = new ShadowsTheme();
    Object.assign(theme._shadows, config);
    return theme;
  }

  /**
   * Create reduced motion shadows (flatter design)
   * Less dramatic shadow falloff
   * @returns {ShadowsTheme} Reduced motion theme
   */
  static reducedMotion() {
    const theme = new ShadowsTheme();

    // Reduce shadow intensity
    Object.keys(theme._shadows).forEach(level => {
      theme._shadows[level] = theme._shadows[level].map(shadow =>
        new BoxShadow({
          color: shadow.color.replace(/[\d.]+\)/, match => {
            const opacity = parseFloat(match);
            return (opacity * 0.5).toString() + ')'; // 50% opacity reduction
          }),
          offset: shadow.offset,
          blurRadius: Math.max(1, shadow.blurRadius * 0.7),
          spreadRadius: shadow.spreadRadius
        })
      );
    });

    return theme;
  }

  /**
   * Generate CSS variables for all elevation levels
   * @returns {string} CSS variable declarations
   * 
   * @example
   * const css = theme.toCSSVariables();
   * // Output: --shadow-4: 0 2px 3px rgba(...), ...;
   */
  toCSSVariables() {
    let css = ':root {\n';

    const levels = [0, 1, 2, 3, 4, 5, 6, 8, 12, 16, 24];
    levels.forEach(level => {
      const shadowCSS = this.getShadowCSS(level);
      css += `  --shadow-${level}: ${shadowCSS};\n`;
    });

    css += '}';
    return css;
  }

  /**
   * Copy theme with updated shadows
   * @param {Object} shadows - Shadow definitions to override
   * @returns {ShadowsTheme} New theme instance
   */
  copyWith(shadows = {}) {
    return ShadowsTheme.custom(Object.assign({}, this._shadows, shadows));
  }

  /**
   * Merge with another shadow theme
   * @param {ShadowsTheme} other - Theme to merge with
   * @returns {ShadowsTheme} Merged theme
   */
  merge(other) {
    if (!other) return this;
    return this.copyWith(other.getAllShadows());
  }

  toString() {
    return 'ShadowsTheme(elevation: 0-24)';
  }
}