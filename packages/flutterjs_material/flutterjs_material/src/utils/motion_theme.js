// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Material Design 3 Motion System
 * Defines animation curves and durations for consistent motion
 * Follows Flutter Material Design 3 specification
 * 
 * Flutter Reference: https://api.flutter.dev/flutter/material/AnimationDuration-class.html
 * https://api.flutter.dev/flutter/animation/Curves-class.html
 */
export class MotionTheme {
  constructor({
    // Standard Durations (milliseconds)
    shortDuration = 50,
    shortMediumDuration = 100,
    mediumDuration = 200,
    mediumLongDuration = 300,
    longDuration = 500,
    veryLongDuration = 1000,
    
    // Animation Curves
    standardCurve = 'cubic-bezier(0.2, 0.0, 0.0, 1.0)', // Material standard
    standardAccelerateCurve = 'cubic-bezier(0.3, 0.0, 1.0, 1.0)', // Accelerate
    standardDecelerateCurve = 'cubic-bezier(0.0, 0.0, 0.0, 1.0)', // Decelerate
    emphasizedCurve = 'cubic-bezier(0.2, 0.0, 0.0, 1.0)', // Emphasized
    emphasizedAccelerateCurve = 'cubic-bezier(0.3, 0.0, 1.0, 1.0)', // Emphasized Accelerate
    emphasizedDecelerateCurve = 'cubic-bezier(0.05, 0.7, 0.1, 1.0)', // Emphasized Decelerate
    legacyAccelerateCurve = 'cubic-bezier(0.4, 0.0, 1.0, 1.0)', // Legacy
    legacyDecelerateCurve = 'cubic-bezier(0.0, 0.0, 0.2, 1.0)', // Legacy
    easeInCurve = 'cubic-bezier(0.4, 0.0, 1.0, 1.0)',
    easeOutCurve = 'cubic-bezier(0.0, 0.0, 0.2, 1.0)',
    easeInOutCurve = 'cubic-bezier(0.4, 0.0, 0.2, 1.0)',
    linearCurve = 'linear',
    bounceInCurve = 'cubic-bezier(0.675, 0.19, 0.985, 0.16)',
    bounceOutCurve = 'cubic-bezier(0.015, 0.84, 0.33, 1.0)',
    elasticInCurve = 'cubic-bezier(0.17, 0.67, 0.83, 0.67)',
    elasticOutCurve = 'cubic-bezier(0.17, 0.67, 0.83, 0.67)'
  } = {}) {
    // ========== DURATIONS ==========
    this.shortDuration = shortDuration;
    this.shortMediumDuration = shortMediumDuration;
    this.mediumDuration = mediumDuration;
    this.mediumLongDuration = mediumLongDuration;
    this.longDuration = longDuration;
    this.veryLongDuration = veryLongDuration;

    // ========== EASING CURVES ==========
    this.standardCurve = standardCurve;
    this.standardAccelerateCurve = standardAccelerateCurve;
    this.standardDecelerateCurve = standardDecelerateCurve;
    this.emphasizedCurve = emphasizedCurve;
    this.emphasizedAccelerateCurve = emphasizedAccelerateCurve;
    this.emphasizedDecelerateCurve = emphasizedDecelerateCurve;
    this.legacyAccelerateCurve = legacyAccelerateCurve;
    this.legacyDecelerateCurve = legacyDecelerateCurve;
    this.easeInCurve = easeInCurve;
    this.easeOutCurve = easeOutCurve;
    this.easeInOutCurve = easeInOutCurve;
    this.linearCurve = linearCurve;
    this.bounceInCurve = bounceInCurve;
    this.bounceOutCurve = bounceOutCurve;
    this.elasticInCurve = elasticInCurve;
    this.elasticOutCurve = elasticOutCurve;
  }

  /**
   * Get duration by name
   * @param {string} durationName - Name of duration
   * @returns {number} Duration in milliseconds
   * 
   * @example
   * const duration = theme.getDuration('mediumDuration'); // 200
   */
  getDuration(durationName) {
    return this[durationName] ?? null;
  }

  /**
   * Get easing curve by name
   * @param {string} curveName - Name of curve
   * @returns {string} CSS easing function
   * 
   * @example
   * const curve = theme.getCurve('standardCurve');
   * // 'cubic-bezier(0.2, 0.0, 0.0, 1.0)'
   */
  getCurve(curveName) {
    return this[curveName] ?? null;
  }

  /**
   * Create CSS transition string
   * @param {string} property - CSS property to animate
   * @param {string} curveName - Easing curve name (default: standardCurve)
   * @param {string} durationName - Duration name (default: mediumDuration)
   * @returns {string} CSS transition string
   * 
   * @example
   * theme.createTransition('opacity', 'standardCurve', 'mediumDuration')
   * // 'opacity 200ms cubic-bezier(0.2, 0.0, 0.0, 1.0)'
   */
  createTransition(property, curveName = 'standardCurve', durationName = 'mediumDuration') {
    const duration = this.getDuration(durationName);
    const curve = this.getCurve(curveName);
    
    if (!duration || !curve) return null;
    
    return `${property} ${duration}ms ${curve}`;
  }

  /**
   * Create multiple CSS transitions
   * @param {string[]} properties - CSS properties to animate
   * @param {string} curveName - Easing curve name
   * @param {string} durationName - Duration name
   * @returns {string} CSS transition string
   * 
   * @example
   * theme.createTransitions(['opacity', 'transform'], 'standardCurve', 'mediumDuration')
   * // 'opacity 200ms cubic-bezier(...), transform 200ms cubic-bezier(...)'
   */
  createTransitions(properties, curveName = 'standardCurve', durationName = 'mediumDuration') {
    return properties
      .map(prop => this.createTransition(prop, curveName, durationName))
      .join(', ');
  }

  /**
   * Get all durations as object
   * @returns {Object} Duration map
   */
  getAllDurations() {
    return {
      shortDuration: this.shortDuration,
      shortMediumDuration: this.shortMediumDuration,
      mediumDuration: this.mediumDuration,
      mediumLongDuration: this.mediumLongDuration,
      longDuration: this.longDuration,
      veryLongDuration: this.veryLongDuration
    };
  }

  /**
   * Get all curves as object
   * @returns {Object} Curve map
   */
  getAllCurves() {
    return {
      standardCurve: this.standardCurve,
      standardAccelerateCurve: this.standardAccelerateCurve,
      standardDecelerateCurve: this.standardDecelerateCurve,
      emphasizedCurve: this.emphasizedCurve,
      emphasizedAccelerateCurve: this.emphasizedAccelerateCurve,
      emphasizedDecelerateCurve: this.emphasizedDecelerateCurve,
      legacyAccelerateCurve: this.legacyAccelerateCurve,
      legacyDecelerateCurve: this.legacyDecelerateCurve,
      easeInCurve: this.easeInCurve,
      easeOutCurve: this.easeOutCurve,
      easeInOutCurve: this.easeInOutCurve,
      linearCurve: this.linearCurve,
      bounceInCurve: this.bounceInCurve,
      bounceOutCurve: this.bounceOutCurve,
      elasticInCurve: this.elasticInCurve,
      elasticOutCurve: this.elasticOutCurve
    };
  }

  /**
   * Create reduced motion theme for accessibility
   * Disables most animations
   * @returns {MotionTheme} Reduced motion theme
   * 
   * @example
   * const reducedMotion = MotionTheme.reducedMotion();
   */
  static reducedMotion() {
    return new MotionTheme({
      shortDuration: 0,
      shortMediumDuration: 0,
      mediumDuration: 0,
      mediumLongDuration: 0,
      longDuration: 0,
      veryLongDuration: 0,
      // Keep curves but they won't be used with 0 duration
      linearCurve: 'linear'
    });
  }

  /**
   * Create slower motion theme (for accessibility/preference)
   * Increases all animation durations by 1.5x
   * @returns {MotionTheme} Slower motion theme
   * 
   * @example
   * const slower = MotionTheme.slower();
   */
  static slower() {
    return new MotionTheme({
      shortDuration: 75,
      shortMediumDuration: 150,
      mediumDuration: 300,
      mediumLongDuration: 450,
      longDuration: 750,
      veryLongDuration: 1500
    });
  }

  /**
   * Create faster motion theme
   * Decreases all animation durations by 0.5x
   * @returns {MotionTheme} Faster motion theme
   * 
   * @example
   * const faster = MotionTheme.faster();
   */
  static faster() {
    return new MotionTheme({
      shortDuration: 25,
      shortMediumDuration: 50,
      mediumDuration: 100,
      mediumLongDuration: 150,
      longDuration: 250,
      veryLongDuration: 500
    });
  }

  /**
   * Generate CSS variables for all durations and curves
   * @returns {string} CSS variable declarations
   * 
   * @example
   * const css = theme.toCSSVariables();
   * // Output: --motion-duration-medium: 200ms; --motion-curve-standard: ...;
   */
  toCSSVariables() {
    let css = ':root {\n';
    
    // Duration variables
    const durations = this.getAllDurations();
    for (const [name, value] of Object.entries(durations)) {
      const cssVarName = `--motion-duration-${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      css += `  ${cssVarName}: ${value}ms;\n`;
    }
    
    css += '\n';
    
    // Curve variables
    const curves = this.getAllCurves();
    for (const [name, value] of Object.entries(curves)) {
      const cssVarName = `--motion-curve-${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      css += `  ${cssVarName}: ${value};\n`;
    }
    
    css += '}';
    return css;
  }

  /**
   * Get predefined animation presets
   * @returns {Object} Animation presets for common transitions
   */
  getPresets() {
    return {
      // Fast feedback animations
      ripple: {
        duration: this.shortMediumDuration,
        curve: this.linearCurve
      },
      
      // Standard UI transitions
      standardFadeIn: {
        duration: this.mediumDuration,
        curve: this.standardDecelerateCurve,
        properties: ['opacity']
      },
      
      standardFadeOut: {
        duration: this.mediumDuration,
        curve: this.standardAccelerateCurve,
        properties: ['opacity']
      },
      
      // Emphasized transitions
      emphasizedFadeIn: {
        duration: this.mediumLongDuration,
        curve: this.emphasizedDecelerateCurve,
        properties: ['opacity']
      },
      
      // Slide animations
      slideIn: {
        duration: this.mediumLongDuration,
        curve: this.standardDecelerateCurve,
        properties: ['transform', 'opacity']
      },
      
      slideOut: {
        duration: this.mediumDuration,
        curve: this.standardAccelerateCurve,
        properties: ['transform', 'opacity']
      },
      
      // Scale animations
      scaleIn: {
        duration: this.mediumDuration,
        curve: this.emphasizedDecelerateCurve,
        properties: ['transform', 'opacity']
      },
      
      scaleOut: {
        duration: this.mediumDuration,
        curve: this.standardAccelerateCurve,
        properties: ['transform', 'opacity']
      },
      
      // Hover/interactive
      hoverFocus: {
        duration: this.shortMediumDuration,
        curve: this.linearCurve,
        properties: ['background-color', 'box-shadow']
      },
      
      // Dialogs
      dialogOpen: {
        duration: this.mediumLongDuration,
        curve: this.emphasizedDecelerateCurve,
        properties: ['transform', 'opacity']
      },
      
      dialogClose: {
        duration: this.mediumDuration,
        curve: this.emphasizedAccelerateCurve,
        properties: ['transform', 'opacity']
      }
    };
  }

  /**
   * Get preset transition CSS
   * @param {string} presetName - Preset name
   * @returns {Object} CSS properties
   * 
   * @example
   * const style = theme.getPresetStyle('slideIn');
   * // { transition: 'transform 300ms ..., opacity 300ms ...' }
   */
  getPresetStyle(presetName) {
    const preset = this.getPresets()[presetName];
    if (!preset) return null;
    
    if (preset.properties) {
      return {
        transition: this.createTransitions(preset.properties, null, null)
          .split(', ')
          .map(t => {
            // Replace null curve with preset curve
            const [prop, ...rest] = t.split(' ');
            return `${prop} ${preset.duration}ms ${preset.curve}`;
          })
          .join(', ')
      };
    }
    
    return {
      animationDuration: `${preset.duration}ms`,
      animationTimingFunction: preset.curve
    };
  }

  /**
   * Copy theme with updated values
   * @param {Object} config - Config to override
   * @returns {MotionTheme} New theme instance
   */
  copyWith(config = {}) {
    return new MotionTheme({
      shortDuration: config.shortDuration ?? this.shortDuration,
      shortMediumDuration: config.shortMediumDuration ?? this.shortMediumDuration,
      mediumDuration: config.mediumDuration ?? this.mediumDuration,
      mediumLongDuration: config.mediumLongDuration ?? this.mediumLongDuration,
      longDuration: config.longDuration ?? this.longDuration,
      veryLongDuration: config.veryLongDuration ?? this.veryLongDuration,
      ...config
    });
  }

  /**
   * Merge with another motion theme
   * @param {MotionTheme} other - Theme to merge with
   * @returns {MotionTheme} Merged theme
   */
  merge(other) {
    if (!other) return this;
    return this.copyWith({
      ...other.getAllDurations(),
      ...other.getAllCurves()
    });
  }

  /**
   * Respect prefers-reduced-motion media query
   * @returns {MotionTheme} Accessible motion theme
   */
  static respectPreference() {
    // Check if user prefers reduced motion
    if (typeof window !== 'undefined' && 
        window.matchMedia && 
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return MotionTheme.reducedMotion();
    }
    return new MotionTheme();
  }

  toString() {
    return `MotionTheme(durations: 6, curves: 16, presets: 10)`;
  }
}