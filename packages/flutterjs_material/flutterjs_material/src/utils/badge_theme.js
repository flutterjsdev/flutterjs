// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Material Design 3 Badge Theme
 * Defines the visual properties of Badge widgets
 * Follows Flutter Material Design 3 specification
 * 
 * Flutter Reference: https://api.flutter.dev/flutter/material/BadgeThemeData-class.html
 */
export class BadgeTheme {
  constructor({
    // Colors
    backgroundColor,
    textColor,
    
    // Size & Padding
    smallSize = 6,
    largeSize = 24,
    padding = 4,
    
    // Position
    alignment = 'topEnd',
    offset,
    
    // Text & Font
    textStyle,
    textScaleFactor = 0.75,
    
    // Border & Shadow
    border,
    borderRadius = 12,
    elevation = 4,
    shadowColor = '#000000'
  } = {}) {
    this.backgroundColor = backgroundColor;
    this.textColor = textColor;
    this.smallSize = smallSize;
    this.largeSize = largeSize;
    this.padding = padding;
    this.alignment = alignment;
    this.offset = offset;
    this.textStyle = textStyle;
    this.textScaleFactor = textScaleFactor;
    this.border = border;
    this.borderRadius = borderRadius;
    this.elevation = elevation;
    this.shadowColor = shadowColor;
  }

  /**
   * Get small badge CSS (indicator only, no text)
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties
   */
  getSmallBadgeStyle(themeColors = {}) {
    return {
      width: `${this.smallSize}px`,
      height: `${this.smallSize}px`,
      borderRadius: '50%',
      backgroundColor: this.backgroundColor || themeColors.error || '#B3261E',
      position: 'absolute',
      top: `-${this.smallSize / 2}px`,
      right: `-${this.smallSize / 2}px`,
      border: this.border ? `2px solid ${this.border}` : 'none',
      boxShadow: `0 2px 4px ${this.shadowColor}40`,
      zIndex: 1000
    };
  }

  /**
   * Get large badge CSS (with text/number)
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties
   */
  getLargeBadgeStyle(themeColors = {}) {
    return {
      minWidth: `${this.largeSize}px`,
      height: `${this.largeSize}px`,
      borderRadius: `${this.borderRadius}px`,
      backgroundColor: this.backgroundColor || themeColors.error || '#B3261E',
      color: this.textColor || themeColors.onError || '#FFFFFF',
      padding: `0 ${this.padding}px`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 'bold',
      position: 'absolute',
      top: `-${this.largeSize / 2}px`,
      right: `-${this.largeSize / 2}px`,
      border: this.border ? `2px solid ${this.border}` : 'none',
      boxShadow: `0 ${this.elevation}px ${this.elevation * 2}px ${this.shadowColor}40`,
      zIndex: 1000
    };
  }

  /**
   * Get badge text CSS
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties
   */
  getBadgeTextStyle(themeColors = {}) {
    return {
      fontSize: '12px',
      fontWeight: 'bold',
      color: this.textColor || themeColors.onError || '#FFFFFF',
      lineHeight: 1,
      userSelect: 'none'
    };
  }

  /**
   * Get alignment position CSS
   * @returns {Object} CSS positioning properties
   */
  getAlignmentStyle() {
    const alignments = {
      topStart: { top: `-${this.largeSize / 2}px`, left: `-${this.largeSize / 2}px` },
      topEnd: { top: `-${this.largeSize / 2}px`, right: `-${this.largeSize / 2}px` },
      bottomStart: { bottom: `-${this.largeSize / 2}px`, left: `-${this.largeSize / 2}px` },
      bottomEnd: { bottom: `-${this.largeSize / 2}px`, right: `-${this.largeSize / 2}px` }
    };
    return alignments[this.alignment] || alignments.topEnd;
  }

  /**
   * Get badge container wrapper CSS
   * @returns {Object} CSS properties
   */
  getContainerStyle() {
    return {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    };
  }

  /**
   * Get badge visibility CSS
   * @param {boolean} visible - Whether badge should be visible
   * @returns {Object} CSS properties
   */
  getVisibilityStyle(visible = true) {
    return {
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1)' : 'scale(0)',
      transition: 'all 0.3s ease',
      pointerEvents: visible ? 'auto' : 'none'
    };
  }

  /**
   * Get badge animation CSS
   * @returns {Object} CSS animation properties
   */
  getAnimationStyle() {
    return {
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    };
  }

  /**
   * Get responsive badge CSS (scales on small screens)
   * @param {string} screenSize - 'small', 'medium', 'large'
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties
   */
  getResponsiveStyle(screenSize = 'medium', themeColors = {}) {
    const sizes = {
      small: {
        largeSize: 18,
        padding: 2,
        fontSize: '10px'
      },
      medium: {
        largeSize: 24,
        padding: 4,
        fontSize: '12px'
      },
      large: {
        largeSize: 28,
        padding: 6,
        fontSize: '14px'
      }
    };

    const size = sizes[screenSize] || sizes.medium;
    return {
      ...this.getLargeBadgeStyle(themeColors),
      minWidth: `${size.largeSize}px`,
      height: `${size.largeSize}px`,
      padding: `0 ${size.padding}px`,
      fontSize: size.fontSize
    };
  }

  /**
   * Copy this theme with updated properties
   * @param {Object} properties - Properties to override
   * @returns {BadgeTheme} New theme instance
   */
  copyWith({
    backgroundColor,
    textColor,
    smallSize,
    largeSize,
    padding,
    alignment,
    offset,
    textStyle,
    textScaleFactor,
    border,
    borderRadius,
    elevation,
    shadowColor
  } = {}) {
    return new BadgeTheme({
      backgroundColor: backgroundColor ?? this.backgroundColor,
      textColor: textColor ?? this.textColor,
      smallSize: smallSize ?? this.smallSize,
      largeSize: largeSize ?? this.largeSize,
      padding: padding ?? this.padding,
      alignment: alignment ?? this.alignment,
      offset: offset ?? this.offset,
      textStyle: textStyle ?? this.textStyle,
      textScaleFactor: textScaleFactor ?? this.textScaleFactor,
      border: border ?? this.border,
      borderRadius: borderRadius ?? this.borderRadius,
      elevation: elevation ?? this.elevation,
      shadowColor: shadowColor ?? this.shadowColor
    });
  }

  /**
   * Merge with another BadgeTheme
   * @param {BadgeTheme} other - Theme to merge with
   * @returns {BadgeTheme} Merged theme
   */
  merge(other) {
    if (!other) return this;
    return this.copyWith({
      backgroundColor: other.backgroundColor,
      textColor: other.textColor,
      smallSize: other.smallSize,
      largeSize: other.largeSize,
      padding: other.padding,
      alignment: other.alignment,
      offset: other.offset,
      textStyle: other.textStyle,
      textScaleFactor: other.textScaleFactor,
      border: other.border,
      borderRadius: other.borderRadius,
      elevation: other.elevation,
      shadowColor: other.shadowColor
    });
  }

  toString() {
    return `BadgeTheme(backgroundColor: ${this.backgroundColor}, largeSize: ${this.largeSize}px)`;
  }
}