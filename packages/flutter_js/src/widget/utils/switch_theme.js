/**
 * Material Design 3 Switch Theme
 * Defines the visual properties of Switch widgets
 * Follows Flutter Material Design 3 specification
 * 
 * Flutter Reference: https://api.flutter.dev/flutter/material/SwitchThemeData-class.html
 */
export class SwitchTheme {
  constructor({
    // Colors
    thumbColor,
    trackColor,
    trackOutlineColor,
    overlayColor,
    focusColor,
    hoverColor,
    
    // Size
    thumbSize = 4, // radius factor, 4 = 20px diameter
    trackHeight = 28,
    
    // Interaction
    materialTapTargetSize = 'padded',
    splashRadius = 20,
    mouseCursor,
    enableFeedback = true,
    animationDuration = 200
  } = {}) {
    this.thumbColor = thumbColor;
    this.trackColor = trackColor;
    this.trackOutlineColor = trackOutlineColor;
    this.overlayColor = overlayColor;
    this.focusColor = focusColor;
    this.hoverColor = hoverColor;
    this.thumbSize = thumbSize;
    this.trackHeight = trackHeight;
    this.materialTapTargetSize = materialTapTargetSize;
    this.splashRadius = splashRadius;
    this.mouseCursor = mouseCursor;
    this.enableFeedback = enableFeedback;
    this.animationDuration = animationDuration;
  }

  /**
   * Get switch total tap target size
   * @returns {number} Size in pixels
   */
  getSwitchSize() {
    return this.materialTapTargetSize === 'padded' ? 48 : 40;
  }

  /**
   * Get thumb (circle) diameter
   * @returns {number} Diameter in pixels
   */
  getThumbDiameter() {
    return this.thumbSize * 2;
  }

  /**
   * Get track width
   * @returns {number} Width in pixels
   */
  getTrackWidth() {
    return this.getThumbDiameter() * 2;
  }

  /**
   * Convert to CSS object for DOM rendering
   * @returns {Object} CSS style object
   */
  toCSSObject() {
    return {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      cursor: this.mouseCursor || 'pointer',
      userSelect: 'none'
    };
  }

  /**
   * Get track CSS object (off state)
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties
   */
  getTrackOffStyle(themeColors = {}) {
    return {
      width: `${this.getTrackWidth()}px`,
      height: `${this.trackHeight}px`,
      borderRadius: `${this.trackHeight / 2}px`,
      backgroundColor: themeColors.surfaceVariant || '#E7E0EC',
      border: `1px solid ${this.trackOutlineColor || (themeColors.outline || '#79747E')}`,
      transition: `all ${this.animationDuration}ms ease`,
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)'
    };
  }

  /**
   * Get track CSS object (on state)
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties
   */
  getTrackOnStyle(themeColors = {}) {
    return {
      ...this.getTrackOffStyle(themeColors),
      backgroundColor: themeColors.primary || '#6750A4',
      border: `1px solid ${themeColors.primary || '#6750A4'}`
    };
  }

  /**
   * Get thumb CSS object (off state)
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties
   */
  getThumbOffStyle(themeColors = {}) {
    return {
      width: `${this.getThumbDiameter()}px`,
      height: `${this.getThumbDiameter()}px`,
      borderRadius: '50%',
      backgroundColor: themeColors.outline || '#79747E',
      position: 'absolute',
      left: `4px`,
      transition: `all ${this.animationDuration}ms ease`,
      zIndex: 1,
      boxShadow: `0 2px 4px rgba(0, 0, 0, 0.1)`
    };
  }

  /**
   * Get thumb CSS object (on state)
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties
   */
  getThumbOnStyle(themeColors = {}) {
    const trackWidth = this.getTrackWidth();
    const thumbDiam = this.getThumbDiameter();
    const rightPos = trackWidth - thumbDiam - 4;
    
    return {
      ...this.getThumbOffStyle(themeColors),
      backgroundColor: themeColors.onPrimary || '#FFFFFF',
      left: `${rightPos}px`,
      boxShadow: `0 4px 8px rgba(0, 0, 0, 0.15)`
    };
  }

  /**
   * Get disabled state CSS object
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties
   */
  getDisabledStyle(themeColors = {}) {
    return {
      opacity: 0.38,
      cursor: 'not-allowed',
      pointerEvents: 'none'
    };
  }

  /**
   * Get hover overlay CSS object
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties
   */
  getHoverStyle(themeColors = {}) {
    return {
      backgroundColor: this.hoverColor || (themeColors.primary + '14') || '#6750A414'
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
      boxShadow: `0 0 0 ${this.splashRadius}px ${this.focusColor || (themeColors.primary + '24') || '#6750A424'}`
    };
  }

  /**
   * Copy this theme with updated properties
   * @param {Object} properties - Properties to override
   * @returns {SwitchTheme} New theme instance
   */
  copyWith({
    thumbColor,
    trackColor,
    trackOutlineColor,
    overlayColor,
    focusColor,
    hoverColor,
    thumbSize,
    trackHeight,
    materialTapTargetSize,
    splashRadius,
    mouseCursor,
    enableFeedback,
    animationDuration
  } = {}) {
    return new SwitchTheme({
      thumbColor: thumbColor ?? this.thumbColor,
      trackColor: trackColor ?? this.trackColor,
      trackOutlineColor: trackOutlineColor ?? this.trackOutlineColor,
      overlayColor: overlayColor ?? this.overlayColor,
      focusColor: focusColor ?? this.focusColor,
      hoverColor: hoverColor ?? this.hoverColor,
      thumbSize: thumbSize ?? this.thumbSize,
      trackHeight: trackHeight ?? this.trackHeight,
      materialTapTargetSize: materialTapTargetSize ?? this.materialTapTargetSize,
      splashRadius: splashRadius ?? this.splashRadius,
      mouseCursor: mouseCursor ?? this.mouseCursor,
      enableFeedback: enableFeedback ?? this.enableFeedback,
      animationDuration: animationDuration ?? this.animationDuration
    });
  }

  /**
   * Merge with another SwitchTheme
   * @param {SwitchTheme} other - Theme to merge with
   * @returns {SwitchTheme} Merged theme
   */
  merge(other) {
    if (!other) return this;
    return this.copyWith({
      thumbColor: other.thumbColor,
      trackColor: other.trackColor,
      trackOutlineColor: other.trackOutlineColor,
      overlayColor: other.overlayColor,
      focusColor: other.focusColor,
      hoverColor: other.hoverColor,
      thumbSize: other.thumbSize,
      trackHeight: other.trackHeight,
      materialTapTargetSize: other.materialTapTargetSize,
      splashRadius: other.splashRadius,
      mouseCursor: other.mouseCursor,
      enableFeedback: other.enableFeedback,
      animationDuration: other.animationDuration
    });
  }

  toString() {
    return `SwitchTheme(trackHeight: ${this.trackHeight}px, thumbSize: ${this.getThumbDiameter()}px)`;
  }
}