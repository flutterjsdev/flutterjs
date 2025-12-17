/**
 * StyleConverter - Convert Flutter styles to CSS
 * 
 * Handles conversion of Flutter style properties to CSS:
 * - EdgeInsets → padding/margin
 * - Color → hex/rgba
 * - TextStyle → font properties
 * - BoxDecoration → border/shadow/gradient
 * - Alignment → flexbox
 * - And more...
 */

class StyleConverter {
  // ============================================================================
  // COLOR CONVERSION
  // ============================================================================

  /**
   * Convert Flutter Color to CSS color string
   * @param {Color|number|string} color - Flutter Color object or value
   * @returns {string} CSS color (hex or rgba)
   */
  static colorToCss(color) {
    if (!color) return null;

    // Already a CSS string
    if (typeof color === 'string') {
      return color;
    }

    // Numeric color value (0xAARRGGBB format)
    if (typeof color === 'number') {
      return this.numberToColor(color);
    }

    // Color object with value property
    if (color.value !== undefined) {
      return this.numberToColor(color.value);
    }

    // Color object with r, g, b, a properties
    if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
      const a = color.a !== undefined ? color.a : 1;
      return a < 1
        ? `rgba(${color.r}, ${color.g}, ${color.b}, ${a})`
        : `rgb(${color.r}, ${color.g}, ${color.b})`;
    }

    return null;
  }

  /**
   * Convert numeric color (0xAARRGGBB) to CSS
   * @private
   */
  static numberToColor(value) {
    // Extract ARGB components
    const a = ((value >> 24) & 0xFF) / 255;
    const r = (value >> 16) & 0xFF;
    const g = (value >> 8) & 0xFF;
    const b = value & 0xFF;

    // Return rgba if alpha < 1, otherwise hex
    if (a < 1) {
      return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
    }

    // Convert to hex
    const hex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    return `#${hex}`;
  }

  // ============================================================================
  // TEXT STYLE CONVERSION
  // ============================================================================

  /**
   * Convert Flutter TextStyle to CSS properties
   * @param {TextStyle} style - Flutter TextStyle object
   * @returns {Object} CSS style object
   */
  static textStyleToCss(style) {
    if (!style || typeof style !== 'object') return {};

    const css = {};

    // Font size
    if (style.fontSize !== undefined) {
      css.fontSize = typeof style.fontSize === 'number'
        ? `${style.fontSize}px`
        : style.fontSize;
    }

    // Color
    if (style.color) {
      css.color = this.colorToCss(style.color);
    }

    // Font weight
    if (style.fontWeight !== undefined) {
      css.fontWeight = this.fontWeightToCss(style.fontWeight);
    }

    // Font style (italic)
    if (style.fontStyle === 'italic') {
      css.fontStyle = 'italic';
    }

    // Font family
    if (style.fontFamily) {
      css.fontFamily = style.fontFamily;
    }

    // Letter spacing
    if (style.letterSpacing !== undefined) {
      css.letterSpacing = `${style.letterSpacing}px`;
    }

    // Word spacing
    if (style.wordSpacing !== undefined) {
      css.wordSpacing = `${style.wordSpacing}px`;
    }

    // Line height
    if (style.height !== undefined) {
      css.lineHeight = typeof style.height === 'number'
        ? String(style.height)
        : style.height;
    }

    // Text decoration
    if (style.decoration) {
      css.textDecoration = this.textDecorationToCss(style.decoration);
    }

    // Text decoration color
    if (style.decorationColor) {
      css.textDecorationColor = this.colorToCss(style.decorationColor);
    }

    // Text decoration style
    if (style.decorationStyle) {
      css.textDecorationStyle = style.decorationStyle;
    }

    // Text overflow
    if (style.overflow === 'ellipsis') {
      css.textOverflow = 'ellipsis';
      css.overflow = 'hidden';
      css.whiteSpace = 'nowrap';
    }

    // Text shadow
    if (style.shadows) {
      css.textShadow = this.textShadowsToCss(style.shadows);
    }

    return css;
  }

  /**
   * Convert Flutter FontWeight to CSS
   * @private
   */
  static fontWeightToCss(weight) {
    // Flutter FontWeight enum
    const weightMap = {
      w100: '100',
      w200: '200',
      w300: '300',
      w400: '400', // normal
      w500: '500',
      w600: '600',
      w700: '700', // bold
      w800: '800',
      w900: '900',
      normal: '400',
      bold: '700'
    };
    // If it's a number, return as string
    if (typeof weight === 'number') return String(weight);

    // If it's a string, look it up in the map
    console.log("weight"+weight);
    if (typeof weight === 'string') {
      return weightMap[weight] || '400';
    }

    return '400';
  }

  /**
   * Convert Flutter TextDecoration to CSS
   * @private
   */
  static textDecorationToCss(decoration) {
    if (typeof decoration === 'string') return decoration;

    // Handle multiple decorations
    if (decoration.underline && decoration.lineThrough) {
      return 'underline line-through';
    }
    if (decoration.underline) return 'underline';
    if (decoration.lineThrough) return 'line-through';
    if (decoration.overline) return 'overline';

    return 'none';
  }

  /**
   * Convert text shadows
   * @private
   */
  static textShadowsToCss(shadows) {
    if (!Array.isArray(shadows)) shadows = [shadows];

    return shadows
      .map(shadow => {
        const x = shadow.offset?.dx || 0;
        const y = shadow.offset?.dy || 0;
        const blur = shadow.blurRadius || 0;
        const color = this.colorToCss(shadow.color) || '#000000';
        return `${x}px ${y}px ${blur}px ${color}`;
      })
      .join(', ');
  }

  // ============================================================================
  // EDGE INSETS (Padding/Margin)
  // ============================================================================

  /**
   * Convert EdgeInsets to CSS padding
   * @param {EdgeInsets} padding - Flutter EdgeInsets
   * @returns {Object} CSS padding properties
   */
  static paddingToCss(padding) {
    if (!padding) return {};
    return { padding: this.edgeInsetsToCss(padding) };
  }

  /**
   * Convert EdgeInsets to CSS margin
   * @param {EdgeInsets} margin - Flutter EdgeInsets
   * @returns {Object} CSS margin properties
   */
  static marginToCss(margin) {
    if (!margin) return {};
    return { margin: this.edgeInsetsToCss(margin) };
  }

  /**
   * Convert EdgeInsets to CSS string
   * @private
   */
  static edgeInsetsToCss(insets) {
    if (!insets) return null;

    // EdgeInsets.all(value)
    if (insets.all !== undefined) {
      return `${insets.all}px`;
    }

    // EdgeInsets.symmetric
    if (insets.horizontal !== undefined || insets.vertical !== undefined) {
      const v = insets.vertical || 0;
      const h = insets.horizontal || 0;
      return `${v}px ${h}px`;
    }

    // EdgeInsets.only or EdgeInsets.fromLTRB
    const top = insets.top || 0;
    const right = insets.right || 0;
    const bottom = insets.bottom || 0;
    const left = insets.left || 0;

    // Optimize output
    if (top === right && right === bottom && bottom === left) {
      return `${top}px`;
    }
    if (top === bottom && left === right) {
      return `${top}px ${right}px`;
    }

    return `${top}px ${right}px ${bottom}px ${left}px`;
  }

  // ============================================================================
  // BOX DECORATION
  // ============================================================================

  /**
   * Convert BoxDecoration to CSS properties
   * @param {BoxDecoration} decoration - Flutter BoxDecoration
   * @returns {Object} CSS style object
   */
  static decorationToCss(decoration) {
    if (!decoration || typeof decoration !== 'object') return {};

    const css = {};

    // Background color
    if (decoration.color) {
      css.backgroundColor = this.colorToCss(decoration.color);
    }

    // Border
    if (decoration.border) {
      Object.assign(css, this.borderToCss(decoration.border));
    }

    // Border radius
    if (decoration.borderRadius) {
      css.borderRadius = this.borderRadiusToCss(decoration.borderRadius);
    }

    // Box shadow
    if (decoration.boxShadow) {
      css.boxShadow = this.boxShadowToCss(decoration.boxShadow);
    }

    // Gradient
    if (decoration.gradient) {
      css.background = this.gradientToCss(decoration.gradient);
    }

    // Image (background image)
    if (decoration.image) {
      css.backgroundImage = `url(${decoration.image.image || decoration.image})`;
      css.backgroundSize = 'cover';
      css.backgroundPosition = 'center';
    }

    // Shape (circle)
    if (decoration.shape === 'circle') {
      css.borderRadius = '50%';
    }

    return css;
  }

  /**
   * Convert Border to CSS
   * @private
   */
  static borderToCss(border) {
    const css = {};

    if (border.all) {
      // Border.all()
      const width = border.all.width || 1;
      const color = this.colorToCss(border.all.color) || '#000000';
      const style = border.all.style || 'solid';
      css.border = `${width}px ${style} ${color}`;
    } else {
      // Individual borders
      if (border.top) {
        css.borderTop = this.borderSideToCss(border.top);
      }
      if (border.right) {
        css.borderRight = this.borderSideToCss(border.right);
      }
      if (border.bottom) {
        css.borderBottom = this.borderSideToCss(border.bottom);
      }
      if (border.left) {
        css.borderLeft = this.borderSideToCss(border.left);
      }
    }

    return css;
  }

  /**
   * Convert BorderSide to CSS string
   * @private
   */
  static borderSideToCss(side) {
    const width = side.width || 1;
    const color = this.colorToCss(side.color) || '#000000';
    const style = side.style || 'solid';
    return `${width}px ${style} ${color}`;
  }

  /**
   * Convert BorderRadius to CSS
   * @private
   */
  static borderRadiusToCss(radius) {
    if (typeof radius === 'number') {
      return `${radius}px`;
    }

    // BorderRadius.circular(value)
    if (radius.circular !== undefined) {
      return `${radius.circular}px`;
    }

    // BorderRadius.all(Radius.circular(value))
    if (radius.all !== undefined) {
      return `${radius.all}px`;
    }

    // BorderRadius.only
    const tl = radius.topLeft || 0;
    const tr = radius.topRight || 0;
    const br = radius.bottomRight || 0;
    const bl = radius.bottomLeft || 0;

    if (tl === tr && tr === br && br === bl) {
      return `${tl}px`;
    }

    return `${tl}px ${tr}px ${br}px ${bl}px`;
  }

  /**
   * Convert BoxShadow to CSS
   * @private
   */
  static boxShadowToCss(shadows) {
    if (!Array.isArray(shadows)) shadows = [shadows];

    return shadows
      .map(shadow => {
        const x = shadow.offset?.dx || 0;
        const y = shadow.offset?.dy || 0;
        const blur = shadow.blurRadius || 0;
        const spread = shadow.spreadRadius || 0;
        const color = this.colorToCss(shadow.color) || 'rgba(0,0,0,0.2)';
        return `${x}px ${y}px ${blur}px ${spread}px ${color}`;
      })
      .join(', ');
  }

  /**
   * Convert Gradient to CSS
   * @private
   */
  static gradientToCss(gradient) {
    if (!gradient) return null;

    const colors = gradient.colors || [];
    const stops = gradient.stops || [];

    // LinearGradient
    if (gradient.type === 'linear' || gradient.begin || gradient.end) {
      const angle = this.getGradientAngle(gradient.begin, gradient.end);
      const colorStops = colors.map((color, i) => {
        const stop = stops[i] !== undefined ? stops[i] * 100 : null;
        const cssColor = this.colorToCss(color);
        return stop !== null ? `${cssColor} ${stop}%` : cssColor;
      }).join(', ');

      return `linear-gradient(${angle}deg, ${colorStops})`;
    }

    // RadialGradient
    if (gradient.type === 'radial') {
      const colorStops = colors.map((color, i) => {
        const stop = stops[i] !== undefined ? stops[i] * 100 : null;
        const cssColor = this.colorToCss(color);
        return stop !== null ? `${cssColor} ${stop}%` : cssColor;
      }).join(', ');

      return `radial-gradient(circle, ${colorStops})`;
    }

    return null;
  }

  /**
   * Calculate gradient angle from begin/end alignment
   * @private
   */
  static getGradientAngle(begin, end) {
    // Default to top to bottom (180deg)
    if (!begin && !end) return 180;

    // Map common alignments to angles
    if (begin === 'topLeft' && end === 'bottomRight') return 135;
    if (begin === 'topCenter' && end === 'bottomCenter') return 180;
    if (begin === 'topRight' && end === 'bottomLeft') return 225;
    if (begin === 'centerLeft' && end === 'centerRight') return 90;

    return 180; // Default
  }

  // ============================================================================
  // ALIGNMENT
  // ============================================================================

  /**
   * Convert Alignment to CSS flexbox properties
   * @param {Alignment|string} alignment - Flutter Alignment
   * @returns {Object} CSS flexbox properties
   */
  static alignmentToCss(alignment) {
    if (!alignment) return {};

    const css = {
      display: 'flex'
    };

    // String-based alignments
    if (typeof alignment === 'string') {
      const map = {
        topLeft: { justifyContent: 'flex-start', alignItems: 'flex-start' },
        topCenter: { justifyContent: 'center', alignItems: 'flex-start' },
        topRight: { justifyContent: 'flex-end', alignItems: 'flex-start' },
        centerLeft: { justifyContent: 'flex-start', alignItems: 'center' },
        center: { justifyContent: 'center', alignItems: 'center' },
        centerRight: { justifyContent: 'flex-end', alignItems: 'center' },
        bottomLeft: { justifyContent: 'flex-start', alignItems: 'flex-end' },
        bottomCenter: { justifyContent: 'center', alignItems: 'flex-end' },
        bottomRight: { justifyContent: 'flex-end', alignItems: 'flex-end' },
      };

      return { ...css, ...(map[alignment] || map.center) };
    }

    // Object-based alignment with x, y values (-1 to 1)
    if (alignment.x !== undefined && alignment.y !== undefined) {
      css.justifyContent = this.alignmentValueToCss(alignment.x);
      css.alignItems = this.alignmentValueToCss(alignment.y);
    }

    return css;
  }

  /**
   * Convert alignment value (-1 to 1) to CSS
   * @private
   */
  static alignmentValueToCss(value) {
    if (value <= -0.5) return 'flex-start';
    if (value >= 0.5) return 'flex-end';
    return 'center';
  }

  /**
   * Convert MainAxisAlignment to CSS justify-content
   * @param {string} alignment - Flutter MainAxisAlignment
   * @returns {string} CSS justify-content value
   */
  static mainAxisAlignmentToCss(alignment) {
    const map = {
      start: 'flex-start',
      end: 'flex-end',
      center: 'center',
      spaceBetween: 'space-between',
      spaceAround: 'space-around',
      spaceEvenly: 'space-evenly',
    };

    return map[alignment] || 'flex-start';
  }

  /**
   * Convert CrossAxisAlignment to CSS align-items
   * @param {string} alignment - Flutter CrossAxisAlignment
   * @param {string} direction - 'row' or 'column'
   * @returns {string} CSS align-items value
   */
  static crossAxisAlignmentToCss(alignment, direction = 'column') {
    const map = {
      start: 'flex-start',
      end: 'flex-end',
      center: 'center',
      stretch: 'stretch',
      baseline: 'baseline',
    };

    return map[alignment] || 'center';
  }

  // ============================================================================
  // CONSTRAINTS
  // ============================================================================

  /**
   * Convert BoxConstraints to CSS
   * @param {BoxConstraints} constraints - Flutter BoxConstraints
   * @returns {Object} CSS style object
   */
  static constraintsToCss(constraints) {
    if (!constraints) return {};

    const css = {};

    if (constraints.minWidth !== undefined) {
      css.minWidth = `${constraints.minWidth}px`;
    }
    if (constraints.maxWidth !== undefined && constraints.maxWidth !== Infinity) {
      css.maxWidth = `${constraints.maxWidth}px`;
    }
    if (constraints.minHeight !== undefined) {
      css.minHeight = `${constraints.minHeight}px`;
    }
    if (constraints.maxHeight !== undefined && constraints.maxHeight !== Infinity) {
      css.maxHeight = `${constraints.maxHeight}px`;
    }

    return css;
  }

  // ============================================================================
  // TRANSFORMS
  // ============================================================================

  /**
   * Convert Matrix4 transform to CSS
   * @param {Matrix4|Object} transform - Flutter transform
   * @returns {Object} CSS transform properties
   */
  static transformToCss(transform) {
    if (!transform) return {};

    const css = {};

    // Handle common transform objects
    if (transform.rotateZ !== undefined) {
      css.transform = `rotate(${transform.rotateZ}rad)`;
    } else if (transform.scale !== undefined) {
      css.transform = `scale(${transform.scale})`;
    } else if (transform.translateX !== undefined || transform.translateY !== undefined) {
      const x = transform.translateX || 0;
      const y = transform.translateY || 0;
      css.transform = `translate(${x}px, ${y}px)`;
    }

    return css;
  }

  // ============================================================================
  // CLIP BEHAVIOR
  // ============================================================================

  /**
   * Convert Clip behavior to CSS
   * @param {string} clip - Flutter Clip enum
   * @returns {Object} CSS overflow properties
   */
  static clipToCss(clip) {
    if (!clip) return {};

    const map = {
      none: { overflow: 'visible' },
      hardEdge: { overflow: 'hidden' },
      antiAlias: { overflow: 'hidden' },
      antiAliasWithSaveLayer: { overflow: 'hidden' },
    };

    return map[clip] || {};
  }

  // ============================================================================
  // MATERIAL DESIGN ELEVATION
  // ============================================================================

  /**
   * Convert Material elevation to box-shadow
   * @param {number} elevation - Elevation level (0-24)
   * @returns {string} CSS box-shadow
   */
  static elevationToBoxShadow(elevation) {
    if (!elevation || elevation <= 0) return 'none';

    // Material Design elevation shadows
    const elevations = {
      1: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
      2: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
      3: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
      4: '0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)',
      5: '0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22)',
    };

    // For values > 5, interpolate
    if (elevation <= 5) {
      return elevations[elevation] || elevations[1];
    }

    const blur = elevation * 2;
    const spread = Math.floor(elevation / 2);
    return `0 ${elevation}px ${blur}px rgba(0,0,0,0.${Math.min(30, elevation * 2)})`;
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StyleConverter;
}
if (typeof window !== 'undefined') {
  window.StyleConverter = StyleConverter;
}

export { StyleConverter }