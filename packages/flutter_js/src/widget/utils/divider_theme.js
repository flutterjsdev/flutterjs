/**
 * Material Design 3 Divider Theme
 * Defines the visual properties of Divider widgets
 * Follows Flutter Material Design 3 specification
 * 
 * Flutter Reference: https://api.flutter.dev/flutter/material/DividerThemeData-class.html
 */
export class DividerTheme {
  constructor({
    // Dimensions
    thickness = 1,
    indent = 0,
    endIndent = 0,
    height,
    
    // Color
    color,
    
    // Space
    space
  } = {}) {
    this.thickness = thickness;
    this.indent = indent;
    this.endIndent = endIndent;
    this.height = height ?? (thickness * 16); // Default height factor
    this.color = color;
    this.space = space;
  }

  /**
   * Convert to CSS object for horizontal divider
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS style object
   */
  toCSSObject(themeColors = {}) {
    return {
      width: '100%',
      height: `${this.height}px`,
      display: 'flex',
      alignItems: 'center',
      marginLeft: 0,
      marginRight: 0
    };
  }

  /**
   * Get horizontal divider line CSS
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties for the line element
   */
  getHorizontalLineStyle(themeColors = {}) {
    const totalIndent = this.indent + this.endIndent;
    const lineWidth = `calc(100% - ${totalIndent}px)`;
    
    return {
      width: lineWidth,
      height: `${this.thickness}px`,
      backgroundColor: this.color || (themeColors.outlineVariant || '#CAC7D0'),
      border: 'none',
      margin: `${(this.height - this.thickness) / 2}px ${this.endIndent}px ${(this.height - this.thickness) / 2}px ${this.indent}px`
    };
  }

  /**
   * Get vertical divider CSS object
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties
   */
  getVerticalLineStyle(themeColors = {}) {
    return {
      width: `${this.thickness}px`,
      height: this.height ? `${this.height}px` : '100%',
      backgroundColor: this.color || (themeColors.outlineVariant || '#CAC7D0'),
      border: 'none',
      margin: `${this.indent}px 0`
    };
  }

  /**
   * Get divider with spacing CSS
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties including margins
   */
  getDividerWithSpacingStyle(themeColors = {}) {
    const spacing = this.space ?? this.height;
    return {
      ...this.getHorizontalLineStyle(themeColors),
      marginTop: `${spacing}px`,
      marginBottom: `${spacing}px`
    };
  }

  /**
   * Get list divider CSS (commonly used between list items)
   * @param {Object} themeColors - Theme colors object
   * @returns {Object} CSS properties
   */
  getListDividerStyle(themeColors = {}) {
    return {
      ...this.getHorizontalLineStyle(themeColors),
      margin: '0',
      marginBottom: `${this.height}px`
    };
  }

  /**
   * Get divider color
   * @param {Object} themeColors - Theme colors object
   * @returns {string} Hex color value
   */
  getDividerColor(themeColors = {}) {
    return this.color || themeColors.outlineVariant || '#CAC7D0';
  }

  /**
   * Copy this theme with updated properties
   * @param {Object} properties - Properties to override
   * @returns {DividerTheme} New theme instance
   */
  copyWith({
    thickness,
    indent,
    endIndent,
    height,
    color,
    space
  } = {}) {
    return new DividerTheme({
      thickness: thickness ?? this.thickness,
      indent: indent ?? this.indent,
      endIndent: endIndent ?? this.endIndent,
      height: height ?? this.height,
      color: color ?? this.color,
      space: space ?? this.space
    });
  }

  /**
   * Merge with another DividerTheme
   * @param {DividerTheme} other - Theme to merge with
   * @returns {DividerTheme} Merged theme
   */
  merge(other) {
    if (!other) return this;
    return this.copyWith({
      thickness: other.thickness,
      indent: other.indent,
      endIndent: other.endIndent,
      height: other.height,
      color: other.color,
      space: other.space
    });
  }

  toString() {
    return `DividerTheme(thickness: ${this.thickness}px, height: ${this.height}px)`;
  }
}