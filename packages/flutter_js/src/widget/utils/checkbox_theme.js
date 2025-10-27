import { EdgeInsets } from './edge_insets.js';

/**
 * Material Design 3 Checkbox Theme
 * Defines the visual properties of Checkbox widgets
 * Follows Flutter Material Design 3 specification
 * 
 * Flutter Reference: https://api.flutter.dev/flutter/material/CheckboxThemeData-class.html
 */
export class CheckboxTheme {
  constructor({
    // Colors
    fillColor,
    checkColor,
    hoverColor,
    overlayColor,
    focusColor,
    
    // Size & Padding
    materialTapTargetSize = 'padded',
    visualDensity,
    side,
    shape,
    mouseCursor,
    
    // States
    splashRadius,
    
    // Interaction
    enableFeedback = true,
    animationDuration = 200
  } = {}) {
    this.fillColor = fillColor;
    this.checkColor = checkColor;
    this.hoverColor = hoverColor;
    this.overlayColor = overlayColor;
    this.focusColor = focusColor;
    this.materialTapTargetSize = materialTapTargetSize;
    this.visualDensity = visualDensity;
    this.side = side;
    this.shape = shape;
    this.mouseCursor = mouseCursor;
    this.splashRadius = splashRadius ?? 20;
    this.enableFeedback = enableFeedback;
    this.animationDuration = animationDuration;
  }

  /**
   * Get checkbox size based on tap target
   * @returns {number} Size in pixels
   */
  getCheckboxSize() {
    return this.materialTapTargetSize === 'padded' ? 48 : 40;
  }

  /**
   * Convert to CSS object for DOM rendering
   * @returns {Object} CSS style object
   */
  toCSSObject() {
    return {
      width: '20px',
      height: '20px',
      cursor: this.mouseCursor || 'pointer',
      borderRadius: '2px',
      transition: `all ${this.animationDuration}ms ease`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    };
  }

  /**
   * Get fill color for checked state
   * @param {Object} themeColors - Theme colors object
   * @returns {string} Hex color value
   */
  getFillColor(themeColors = {}) {
    return this.fillColor || themeColors.primary || '#6750A4';
  }

  /**
   * Get check icon color
   * @param {Object} themeColors - Theme colors object
   * @returns {string} Hex color value
   */
  getCheckColor(themeColors = {}) {
    return this.checkColor || themeColors.onPrimary || '#FFFFFF';
  }

  /**
   * Get hover color
   * @param {Object} themeColors - Theme colors object
   * @returns {string} Hex color value
   */
  getHoverColor(themeColors = {}) {
    return this.hoverColor || themeColors.primary + '14' || '#6750A414';
  }

  /**
   * Get focus color
   * @param {Object} themeColors - Theme colors object
   * @returns {string} Hex color value
   */
  getFocusColor(themeColors = {}) {
    return this.focusColor || themeColors.primary + '24' || '#6750A424';
  }

  /**
   * Get unchecked state CSS object
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties
   */
  getUncheckedStyle(themeColors = {}) {
    return {
      ...this.toCSSObject(),
      border: `2px solid ${themeColors.onSurfaceVariant || '#79747E'}`,
      backgroundColor: 'transparent'
    };
  }

  /**
   * Get checked state CSS object
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties
   */
  getCheckedStyle(themeColors = {}) {
    return {
      ...this.toCSSObject(),
      backgroundColor: this.getFillColor(themeColors),
      border: `2px solid ${this.getFillColor(themeColors)}`
    };
  }

  /**
   * Get disabled state CSS object
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties
   */
  getDisabledStyle(themeColors = {}) {
    return {
      ...this.toCSSObject(),
      opacity: 0.38,
      cursor: 'not-allowed',
      pointerEvents: 'none'
    };
  }

  /**
   * Get hover state CSS object
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties
   */
  getHoverStyle(themeColors = {}) {
    return {
      backgroundColor: this.getHoverColor(themeColors)
    };
  }

  /**
   * Get focus state CSS object
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties
   */
  getFocusStyle(themeColors = {}) {
    return {
      outline: 'none',
      boxShadow: `0 0 0 ${this.splashRadius}px ${this.getFocusColor(themeColors)}`
    };
  }

  /**
   * Copy this theme with updated properties
   * @param {Object} properties - Properties to override
   * @returns {CheckboxTheme} New theme instance
   */
  copyWith({
    fillColor,
    checkColor,
    hoverColor,
    overlayColor,
    focusColor,
    materialTapTargetSize,
    visualDensity,
    side,
    shape,
    mouseCursor,
    splashRadius,
    enableFeedback,
    animationDuration
  } = {}) {
    return new CheckboxTheme({
      fillColor: fillColor ?? this.fillColor,
      checkColor: checkColor ?? this.checkColor,
      hoverColor: hoverColor ?? this.hoverColor,
      overlayColor: overlayColor ?? this.overlayColor,
      focusColor: focusColor ?? this.focusColor,
      materialTapTargetSize: materialTapTargetSize ?? this.materialTapTargetSize,
      visualDensity: visualDensity ?? this.visualDensity,
      side: side ?? this.side,
      shape: shape ?? this.shape,
      mouseCursor: mouseCursor ?? this.mouseCursor,
      splashRadius: splashRadius ?? this.splashRadius,
      enableFeedback: enableFeedback ?? this.enableFeedback,
      animationDuration: animationDuration ?? this.animationDuration
    });
  }

  /**
   * Merge with another CheckboxTheme
   * @param {CheckboxTheme} other - Theme to merge with
   * @returns {CheckboxTheme} Merged theme
   */
  merge(other) {
    if (!other) return this;
    return this.copyWith({
      fillColor: other.fillColor,
      checkColor: other.checkColor,
      hoverColor: other.hoverColor,
      overlayColor: other.overlayColor,
      focusColor: other.focusColor,
      materialTapTargetSize: other.materialTapTargetSize,
      visualDensity: other.visualDensity,
      side: other.side,
      shape: other.shape,
      mouseCursor: other.mouseCursor,
      splashRadius: other.splashRadius,
      enableFeedback: other.enableFeedback,
      animationDuration: other.animationDuration
    });
  }

  toString() {
    return `CheckboxTheme(fillColor: ${this.fillColor}, checkColor: ${this.checkColor})`;
  }
}