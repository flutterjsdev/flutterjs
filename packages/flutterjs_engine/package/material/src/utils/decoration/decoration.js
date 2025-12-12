// ============================================================================
// FLUTTER.JS DECORATION LAYER
// Border, Shadow, Gradient, and BoxDecoration classes
// Layer: DECORATION (uses utils, constants, styles)
// ============================================================================

import { 
  Offset, 

  BorderRadius, 
  BoxShadow,
  LinearGradient,
  Alignment
} from '../utils/index.js';

import { Colors, } from '../constants/index.js';

// ============================================================================
// 1. BORDER.JS - Border styling configuration
// ============================================================================

/**
 * Represents a single border side with width, color, and style
 */
export class BorderSide {
  constructor({
    width = 1,
    color = Colors.outline,
    style = 'solid'
  } = {}) {
    this.width = width;
    this.color = typeof color === 'string' ? color : color.hex;
    this.style = style; // 'solid', 'dashed', 'dotted', 'double', 'none'
  }

  /**
   * Creates a border side with no width (invisible)
   */
  static none() {
    return new BorderSide({ width: 0, style: 'none' });
  }

  /**
   * Merges two border sides, preferring the new one
   */
  merge(other) {
    if (!other) return this;
    return new BorderSide({
      width: other.width ?? this.width,
      color: other.color ?? this.color,
      style: other.style ?? this.style
    });
  }

  /**
   * Converts to CSS border string
   */
  toCSSString() {
    if (this.width === 0 || this.style === 'none') return 'none';
    return `${this.width}px ${this.style} ${this.color}`;
  }

  toString() {
    return `BorderSide(width: ${this.width}, color: ${this.color}, style: ${this.style})`;
  }
}

/**
 * Represents all four borders of a box
 */
export class Border {
  constructor({
    top = new BorderSide(),
    right = new BorderSide(),
    bottom = new BorderSide(),
    left = new BorderSide()
  } = {}) {
    this.top = top;
    this.right = right;
    this.bottom = bottom;
    this.left = left;
  }

  /**
   * Creates a border with all sides the same
   */
  static all({
    width = 1,
    color = Colors.outline,
    style = 'solid'
  } = {}) {
    const side = new BorderSide({ width, color, style });
    return new Border({ top: side, right: side, bottom: side, left: side });
  }

  /**
   * Creates a border with no sides
   */
  static none() {
    const side = BorderSide.none();
    return new Border({ top: side, right: side, bottom: side, left: side });
  }

  /**
   * Creates a symmetric border (vertical and horizontal)
   */
  static symmetric({
    vertical = new BorderSide(),
    horizontal = new BorderSide()
  } = {}) {
    return new Border({
      top: vertical,
      bottom: vertical,
      left: horizontal,
      right: horizontal
    });
  }

  /**
   * Creates a border with only specific sides
   */
  static only({
    top = null,
    right = null,
    bottom = null,
    left = null
  } = {}) {
    return new Border({
      top: top || BorderSide.none(),
      right: right || BorderSide.none(),
      bottom: bottom || BorderSide.none(),
      left: left || BorderSide.none()
    });
  }

  /**
   * Merges two borders
   */
  merge(other) {
    if (!other) return this;
    return new Border({
      top: this.top.merge(other.top),
      right: this.right.merge(other.right),
      bottom: this.bottom.merge(other.bottom),
      left: this.left.merge(other.left)
    });
  }

  /**
   * Converts to CSS border string (uses bottom for general border)
   */
  toCSSString() {
    return this.bottom.toCSSString();
  }

  /**
   * Converts to individual CSS border properties
   */
  toCSSObject() {
    return {
      borderTop: this.top.toCSSString(),
      borderRight: this.right.toCSSString(),
      borderBottom: this.bottom.toCSSString(),
      borderLeft: this.left.toCSSString()
    };
  }

  toString() {
    return `Border(top: ${this.top}, right: ${this.right}, bottom: ${this.bottom}, left: ${this.left})`;
  }
}

// ============================================================================
// 2. BORDER-RADIUS.JS - Rounded corners configuration
// ============================================================================

/**
 * Represents a single corner radius
 */
export class Radius {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y || x;
  }

  static circular(radius) {
    return new Radius(radius, radius);
  }

  static elliptical(x, y) {
    return new Radius(x, y);
  }

  toString() {
    return `Radius(${this.x}, ${this.y})`;
  }
}

/**
 * Represents border radius for all four corners
 */
export class BorderRadius {
  constructor(
    topLeft = 0,
    topRight = 0,
    bottomRight = 0,
    bottomLeft = 0
  ) {
    this.topLeft = topLeft instanceof Radius ? topLeft : new Radius(topLeft);
    this.topRight = topRight instanceof Radius ? topRight : new Radius(topRight);
    this.bottomRight = bottomRight instanceof Radius ? bottomRight : new Radius(bottomRight);
    this.bottomLeft = bottomLeft instanceof Radius ? bottomLeft : new Radius(bottomLeft);
  }

  /**
   * Creates all corners with same radius
   */
  static all(radius) {
    return new BorderRadius(radius, radius, radius, radius);
  }

  /**
   * Creates all corners circular
   */
  static circular(radius) {
    return BorderRadius.all(radius);
  }

  /**
   * Creates specific corners only
   */
  static only({
    topLeft = 0,
    topRight = 0,
    bottomRight = 0,
    bottomLeft = 0
  } = {}) {
    return new BorderRadius(topLeft, topRight, bottomRight, bottomLeft);
  }

  /**
   * Creates vertical (top/bottom) and horizontal (left/right) symmetry
   */
  static vertical({
    top = 0,
    bottom = 0
  } = {}) {
    return new BorderRadius(top, top, bottom, bottom);
  }

  /**
   * Creates horizontal (left/right) and vertical (top/bottom) symmetry
   */
  static horizontal({
    left = 0,
    right = 0
  } = {}) {
    return new BorderRadius(left, right, right, left);
  }

  /**
   * Merges two BorderRadius values
   */
  merge(other) {
    if (!other) return this;
    return new BorderRadius(
      other.topLeft ?? this.topLeft,
      other.topRight ?? this.topRight,
      other.bottomRight ?? this.bottomRight,
      other.bottomLeft ?? this.bottomLeft
    );
  }

  /**
   * Converts to CSS border-radius string
   */
  toCSSString() {
    const tl = this.topLeft instanceof Radius ? this.topLeft.x : this.topLeft;
    const tr = this.topRight instanceof Radius ? this.topRight.x : this.topRight;
    const br = this.bottomRight instanceof Radius ? this.bottomRight.x : this.bottomRight;
    const bl = this.bottomLeft instanceof Radius ? this.bottomLeft.x : this.bottomLeft;
    return `${tl}px ${tr}px ${br}px ${bl}px`;
  }

  /**
   * Converts to CSS border-radius object
   */
  toCSSObject() {
    return {
      borderTopLeftRadius: `${this.topLeft instanceof Radius ? this.topLeft.x : this.topLeft}px`,
      borderTopRightRadius: `${this.topRight instanceof Radius ? this.topRight.x : this.topRight}px`,
      borderBottomRightRadius: `${this.bottomRight instanceof Radius ? this.bottomRight.x : this.bottomRight}px`,
      borderBottomLeftRadius: `${this.bottomLeft instanceof Radius ? this.bottomLeft.x : this.bottomLeft}px`
    };
  }

  toString() {
    return `BorderRadius(${this.topLeft}, ${this.topRight}, ${this.bottomRight}, ${this.bottomLeft})`;
  }
}

// ============================================================================
// 3. BOX-SHADOW.JS - Shadow effects configuration
// ============================================================================

/**
 * Represents a single shadow effect
 */
export class BoxShadow {
  constructor({
    color = Colors.black54,
    offset = new Offset(0, 0),
    blurRadius = 0,
    spreadRadius = 0
  } = {}) {
    this.color = typeof color === 'string' ? color : color.hex;
    this.offset = offset;
    this.blurRadius = blurRadius;
    this.spreadRadius = spreadRadius;
  }

  /**
   * Creates a shadow with no spread (no visible shadow)
   */
  static none() {
    return new BoxShadow({
      blurRadius: 0,
      spreadRadius: 0
    });
  }

  /**
   * Material Design 3 Elevation 1
   */
  static elevation1() {
    return new BoxShadow({
      color: Colors.black12,
      offset: new Offset(0, 1),
      blurRadius: 3,
      spreadRadius: 0
    });
  }

  /**
   * Material Design 3 Elevation 2
   */
  static elevation2() {
    return new BoxShadow({
      color: Colors.black26,
      offset: new Offset(0, 3),
      blurRadius: 6,
      spreadRadius: 0
    });
  }

  /**
   * Material Design 3 Elevation 3
   */
  static elevation3() {
    return new BoxShadow({
      color: Colors.black38,
      offset: new Offset(0, 10),
      blurRadius: 20,
      spreadRadius: 0
    });
  }

  /**
   * Material Design 3 Elevation 4
   */
  static elevation4() {
    return new BoxShadow({
      color: Colors.black45,
      offset: new Offset(0, 15),
      blurRadius: 25,
      spreadRadius: 0
    });
  }

  /**
   * Material Design 3 Elevation 5
   */
  static elevation5() {
    return new BoxShadow({
      color: Colors.black54,
      offset: new Offset(0, 20),
      blurRadius: 40,
      spreadRadius: 0
    });
  }

  /**
   * Converts to CSS box-shadow string
   */
  toCSSString() {
    const { dx, dy } = this.offset;
    return `${dx}px ${dy}px ${this.blurRadius}px ${this.spreadRadius}px ${this.color}`;
  }

  toString() {
    return `BoxShadow(color: ${this.color}, offset: ${this.offset}, blur: ${this.blurRadius})`;
  }
}

/**
 * Multiple shadows (supports layered shadows)
 */
export class BoxShadows {
  constructor(shadows = []) {
    this.shadows = shadows;
  }

  /**
   * Converts to CSS box-shadow string (multiple shadows)
   */
  toCSSString() {
    return this.shadows.map(shadow => shadow.toCSSString()).join(', ');
  }

  toString() {
    return `BoxShadows(${this.shadows.length} shadows)`;
  }
}

// ============================================================================
// 4. GRADIENT.JS - Gradient fill configuration
// ============================================================================

/**
 * Linear gradient fill
 */
export class LinearGradient {
  constructor({
    begin = Alignment.topLeft,
    end = Alignment.bottomRight,
    colors = [],
    stops = null,
    tileMode = 'clamp' // 'clamp', 'repeated', 'mirror'
  } = {}) {
    this.begin = begin;
    this.end = end;
    this.colors = colors.map(c => typeof c === 'string' ? c : c.hex);
    this.stops = stops || colors.map((_, i) => i / (colors.length - 1 || 1));
    this.tileMode = tileMode;
  }

  /**
   * Calculates gradient angle in degrees
   */
  getAngle() {
    const dx = this.end.x - this.begin.x;
    const dy = this.end.y - this.begin.y;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }

  /**
   * Converts to CSS linear-gradient string
   */
  toCSSString() {
    const angle = this.getAngle();
    const colorStops = this.colors
      .map((color, i) => `${color} ${(this.stops[i] * 100).toFixed(2)}%`)
      .join(', ');
    return `linear-gradient(${angle}deg, ${colorStops})`;
  }

  toString() {
    return `LinearGradient(colors: ${this.colors.length}, from: ${this.begin} to: ${this.end})`;
  }
}

/**
 * Radial gradient fill
 */
export class RadialGradient {
  constructor({
    center = Alignment.center,
    radius = 0.5,
    colors = [],
    stops = null,
    tileMode = 'clamp'
  } = {}) {
    this.center = center;
    this.radius = radius;
    this.colors = colors.map(c => typeof c === 'string' ? c : c.hex);
    this.stops = stops || colors.map((_, i) => i / (colors.length - 1 || 1));
    this.tileMode = tileMode;
  }

  /**
   * Converts to CSS radial-gradient string
   */
  toCSSString() {
    const centerX = ((this.center.x + 1) / 2) * 100;
    const centerY = ((this.center.y + 1) / 2) * 100;
    const colorStops = this.colors
      .map((color, i) => `${color} ${(this.stops[i] * 100).toFixed(2)}%`)
      .join(', ');
    return `radial-gradient(circle at ${centerX}% ${centerY}%, ${colorStops})`;
  }

  toString() {
    return `RadialGradient(colors: ${this.colors.length}, center: ${this.center})`;
  }
}

/**
 * Sweep gradient (conic) fill
 */
export class SweepGradient {
  constructor({
    center = Alignment.center,
    startAngle = 0,
    endAngle = 360,
    colors = [],
    stops = null
  } = {}) {
    this.center = center;
    this.startAngle = startAngle;
    this.endAngle = endAngle;
    this.colors = colors.map(c => typeof c === 'string' ? c : c.hex);
    this.stops = stops || colors.map((_, i) => i / (colors.length - 1 || 1));
  }

  /**
   * Converts to CSS conic-gradient string
   */
  toCSSString() {
    const centerX = ((this.center.x + 1) / 2) * 100;
    const centerY = ((this.center.y + 1) / 2) * 100;
    const colorStops = this.colors
      .map((color, i) => `${color} ${(this.stops[i] * 360).toFixed(2)}deg`)
      .join(', ');
    return `conic-gradient(from 0deg at ${centerX}% ${centerY}%, ${colorStops})`;
  }

  toString() {
    return `SweepGradient(colors: ${this.colors.length}, center: ${this.center})`;
  }
}

// ============================================================================
// 5. BOX-DECORATION.JS - Complete box decoration
// ============================================================================

/**
 * Complete decoration configuration for a box/container
 * Combines color, border, border-radius, shadow, and gradient
 */
export class BoxDecoration {
  constructor({
    color = null,
    gradient = null,
    image = null,
    border = new Border(),
    borderRadius = new BorderRadius(),
    boxShadow = new BoxShadow(),
    boxShadows = [],
    backgroundBlendMode = 'normal'
  } = {}) {
    // Either color or gradient, not both
    this.color = typeof color === 'string' ? color : color?.hex || null;
    this.gradient = gradient;
    this.image = image;
    
    this.border = border;
    this.borderRadius = borderRadius;
    this.boxShadow = boxShadow;
    this.boxShadows = boxShadows.length > 0 ? boxShadows : (boxShadow ? [boxShadow] : []);
    
    this.backgroundBlendMode = backgroundBlendMode;
  }

  /**
   * Creates a simple colored decoration
   */
  static color({
    color = Colors.primary,
    borderRadius = new BorderRadius()
  } = {}) {
    return new BoxDecoration({ color, borderRadius });
  }

  /**
   * Creates a decoration with gradient
   */
  static gradient({
    gradient = new LinearGradient(),
    borderRadius = new BorderRadius()
  } = {}) {
    return new BoxDecoration({ gradient, borderRadius });
  }

  /**
   * Creates a decoration with border only
   */
  static border({
    border = Border.all(),
    borderRadius = new BorderRadius()
  } = {}) {
    return new BoxDecoration({ border, borderRadius });
  }

  /**
   * Creates a decoration with shadow
   */
  static shadow({
    color = null,
    boxShadow = BoxShadow.elevation2(),
    borderRadius = new BorderRadius()
  } = {}) {
    return new BoxDecoration({ color, boxShadow, borderRadius });
  }

  /**
   * Creates Material Design 3 card decoration
   */
  static card({
    color = Colors.surface,
    elevation = 1,
    borderRadius = BorderRadius.circular(12)
  } = {}) {
    let shadow;
    switch (elevation) {
      case 1: shadow = BoxShadow.elevation1(); break;
      case 2: shadow = BoxShadow.elevation2(); break;
      case 3: shadow = BoxShadow.elevation3(); break;
      case 4: shadow = BoxShadow.elevation4(); break;
      case 5: shadow = BoxShadow.elevation5(); break;
      default: shadow = BoxShadow.none();
    }
    return new BoxDecoration({ color, boxShadow: shadow, borderRadius });
  }

  /**
   * Merges two decorations
   */
  merge(other) {
    if (!other) return this;
    return new BoxDecoration({
      color: other.color ?? this.color,
      gradient: other.gradient ?? this.gradient,
      image: other.image ?? this.image,
      border: this.border.merge(other.border),
      borderRadius: this.borderRadius.merge(other.borderRadius),
      boxShadow: other.boxShadow ?? this.boxShadow,
      boxShadows: other.boxShadows.length > 0 ? other.boxShadows : this.boxShadows,
      backgroundBlendMode: other.backgroundBlendMode ?? this.backgroundBlendMode
    });
  }

  /**
   * Converts to CSS style object
   */
  toCSSObject() {
    const style = {};

    // Background
    if (this.gradient) {
      style.background = this.gradient.toCSSString();
    } else if (this.color) {
      style.backgroundColor = this.color;
    }

    // Border
    const borderCSS = this.border.toCSSObject();
    Object.assign(style, borderCSS);

    // Border Radius
    const radiusCSS = this.borderRadius.toCSSObject();
    Object.assign(style, radiusCSS);

    // Box Shadow
    if (this.boxShadows.length > 0) {
      style.boxShadow = this.boxShadows.map(s => s.toCSSString()).join(', ');
    } else if (this.boxShadow) {
      style.boxShadow = this.boxShadow.toCSSString();
    }

    // Blend Mode
    if (this.backgroundBlendMode !== 'normal') {
      style.mixBlendMode = this.backgroundBlendMode;
    }

    return style;
  }

  /**
   * Applies decoration to a DOM element
   */
  applyToElement(element) {
    const styles = this.toCSSObject();
    Object.assign(element.style, styles);
  }

  toString() {
    const parts = [];
    if (this.color) parts.push(`color: ${this.color}`);
    if (this.gradient) parts.push(`gradient: ${this.gradient}`);
    if (this.boxShadow) parts.push(`shadow: ${this.boxShadow}`);
    return `BoxDecoration(${parts.join(', ')})`;
  }
}

// ============================================================================
// 6. INDEX.JS - Re-export all decoration classes
// ============================================================================

export default {
  // Border
  BorderSide,
  Border,
  
  // Border Radius
  Radius,
  BorderRadius,
  
  // Shadow
  BoxShadow,
  BoxShadows,
  
  // Gradient
  LinearGradient,
  RadialGradient,
  SweepGradient,
  
  // Complete Decoration
  BoxDecoration
};