/**
 * Material Design 3 Scrollbar Theme
 * Defines the visual properties of Scrollbar widgets
 * Follows Flutter Material Design 3 specification
 * 
 * Flutter Reference: https://api.flutter.dev/flutter/material/ScrollbarThemeData-class.html
 */
export class ScrollbarTheme {
  constructor({
    // Colors
    thumbColor,
    trackColor,
    trackBorderColor,
    
    // Size
    thickness = 8,
    minThumbLength = 18,
    
    // Radius
    radius = 4,
    
    // Interaction
    mainAxisMargin = 0,
    crossAxisMargin = 0,
    
    // Hover/Interactive
    hoverThickness = 12,
    isAlwaysShown = false,
    
    // Interaction behavior
    interactive = true,
    showTrackOnHover = false
  } = {}) {
    this.thumbColor = thumbColor;
    this.trackColor = trackColor;
    this.trackBorderColor = trackBorderColor;
    this.thickness = thickness;
    this.minThumbLength = minThumbLength;
    this.radius = radius;
    this.mainAxisMargin = mainAxisMargin;
    this.crossAxisMargin = crossAxisMargin;
    this.hoverThickness = hoverThickness;
    this.isAlwaysShown = isAlwaysShown;
    this.interactive = interactive;
    this.showTrackOnHover = showTrackOnHover;
  }

  /**
   * Get scrollbar thumb CSS
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties
   */
  getThumbStyle(themeColors = {}) {
    return {
      width: `${this.thickness}px`,
      height: `${this.minThumbLength}px`,
      backgroundColor: this.thumbColor || (themeColors.outline + '80') || '#79747E80',
      borderRadius: `${this.radius}px`,
      transition: 'all 0.3s ease',
      cursor: this.interactive ? 'pointer' : 'default'
    };
  }

  /**
   * Get scrollbar thumb hover CSS
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties
   */
  getThumbHoverStyle(themeColors = {}) {
    return {
      ...this.getThumbStyle(themeColors),
      width: `${this.hoverThickness}px`,
      backgroundColor: this.thumbColor || (themeColors.outline + 'CC') || '#79747ECC'
    };
  }

  /**
   * Get scrollbar track CSS
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties
   */
  getTrackStyle(themeColors = {}) {
    return {
      width: `${this.thickness}px`,
      backgroundColor: this.trackColor || 'transparent',
      borderRadius: `${this.radius}px`,
      border: this.trackBorderColor ? `1px solid ${this.trackBorderColor}` : 'none'
    };
  }

  /**
   * Get scrollbar container CSS (vertical)
   * @returns {Object} CSS properties
   */
  getVerticalScrollbarStyle() {
    return {
      position: 'absolute',
      right: `${this.crossAxisMargin}px`,
      top: `${this.mainAxisMargin}px`,
      bottom: `${this.mainAxisMargin}px`,
      width: `${this.thickness}px`,
      opacity: this.isAlwaysShown ? 1 : 0,
      transition: this.isAlwaysShown ? 'none' : 'opacity 0.3s ease'
    };
  }

  /**
   * Get scrollbar container CSS (horizontal)
   * @returns {Object} CSS properties
   */
  getHorizontalScrollbarStyle() {
    return {
      position: 'absolute',
      bottom: `${this.crossAxisMargin}px`,
      left: `${this.mainAxisMargin}px`,
      right: `${this.mainAxisMargin}px`,
      height: `${this.thickness}px`,
      opacity: this.isAlwaysShown ? 1 : 0,
      transition: this.isAlwaysShown ? 'none' : 'opacity 0.3s ease'
    };
  }

  /**
   * Get scrollbar container on hover CSS
   * @returns {Object} CSS properties
   */
  getHoverContainerStyle() {
    return {
      opacity: 1
    };
  }

  /**
   * Generate CSS for scrollable container
   * @param {string} direction - 'vertical' or 'horizontal'
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} Complete CSS object
   */
  getScrollableStyle(direction = 'vertical', themeColors = {}) {
    const isVertical = direction === 'vertical';
    
    if (isVertical) {
      return {
        ...this.getVerticalScrollbarStyle(),
        ...this.getTrackStyle(themeColors)
      };
    } else {
      return {
        ...this.getHorizontalScrollbarStyle(),
        ...this.getTrackStyle(themeColors)
      };
    }
  }

  /**
   * Generate webkit scrollbar CSS rules
   * @param {Object} themeColors - Theme colors object
   * @returns {string} CSS rules for webkit browsers
   */
  toWebkitCSS(themeColors = {}) {
    const thumbColor = this.thumbColor || (themeColors.outline + '80') || '#79747E80';
    const thumbHoverColor = this.thumbColor || (themeColors.outline + 'CC') || '#79747ECC';
    const radius = this.radius;
    
    return `
      ::-webkit-scrollbar {
        width: ${this.thickness}px;
        height: ${this.thickness}px;
      }
      
      ::-webkit-scrollbar-track {
        background: ${this.trackColor || 'transparent'};
        border-radius: ${radius}px;
      }
      
      ::-webkit-scrollbar-thumb {
        background: ${thumbColor};
        border-radius: ${radius}px;
        border: 2px solid transparent;
        background-clip: content-box;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: ${thumbHoverColor};
        background-clip: content-box;
      }
    `;
  }

  /**
   * Generate Firefox scrollbar CSS rules
   * @param {Object} themeColors - Theme colors object
   * @returns {string} CSS rules for Firefox
   */
  toFirefoxCSS(themeColors = {}) {
    const thumbColor = this.thumbColor || (themeColors.outline + '80') || '#79747E80';
    
    return `
      * {
        scrollbar-color: ${thumbColor} ${this.trackColor || 'transparent'};
        scrollbar-width: ${this.thickness === 8 ? 'thin' : 'auto'};
      }
    `;
  }

  /**
   * Copy this theme with updated properties
   * @param {Object} properties - Properties to override
   * @returns {ScrollbarTheme} New theme instance
   */
  copyWith({
    thumbColor,
    trackColor,
    trackBorderColor,
    thickness,
    minThumbLength,
    radius,
    mainAxisMargin,
    crossAxisMargin,
    hoverThickness,
    isAlwaysShown,
    interactive,
    showTrackOnHover
  } = {}) {
    return new ScrollbarTheme({
      thumbColor: thumbColor ?? this.thumbColor,
      trackColor: trackColor ?? this.trackColor,
      trackBorderColor: trackBorderColor ?? this.trackBorderColor,
      thickness: thickness ?? this.thickness,
      minThumbLength: minThumbLength ?? this.minThumbLength,
      radius: radius ?? this.radius,
      mainAxisMargin: mainAxisMargin ?? this.mainAxisMargin,
      crossAxisMargin: crossAxisMargin ?? this.crossAxisMargin,
      hoverThickness: hoverThickness ?? this.hoverThickness,
      isAlwaysShown: isAlwaysShown ?? this.isAlwaysShown,
      interactive: interactive ?? this.interactive,
      showTrackOnHover: showTrackOnHover ?? this.showTrackOnHover
    });
  }

  /**
   * Merge with another ScrollbarTheme
   * @param {ScrollbarTheme} other - Theme to merge with
   * @returns {ScrollbarTheme} Merged theme
   */
  merge(other) {
    if (!other) return this;
    return this.copyWith({
      thumbColor: other.thumbColor,
      trackColor: other.trackColor,
      trackBorderColor: other.trackBorderColor,
      thickness: other.thickness,
      minThumbLength: other.minThumbLength,
      radius: other.radius,
      mainAxisMargin: other.mainAxisMargin,
      crossAxisMargin: other.crossAxisMargin,
      hoverThickness: other.hoverThickness,
      isAlwaysShown: other.isAlwaysShown,
      interactive: other.interactive,
      showTrackOnHover: other.showTrackOnHover
    });
  }

  toString() {
    return `ScrollbarTheme(thickness: ${this.thickness}px, radius: ${this.radius}px)`;
  }
}