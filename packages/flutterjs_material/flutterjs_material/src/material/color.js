// ============================================================================
// COLOR CLASS
// ============================================================================

class Color {
  constructor(value) {
    // Parse hex value (0xAARRGGBB format)
    this.value = typeof value === 'string' ? parseInt(value.replace('#', ''), 16) : value;
  }

  /**
   * Create color from RGB
   */
  static fromARGB(alpha, red, green, blue) {
    const value = (alpha << 24) | (red << 16) | (green << 8) | blue;
    return new Color(value);
  }

  /**
   * Create color from RGB (alpha = 255)
   */
  static fromRGBO(red, green, blue, opacity) {
    const alpha = Math.round(opacity * 255);
    return Color.fromARGB(alpha, red, green, blue);
  }

  /**
   * Get alpha channel (0-255)
   */
  get alpha() {
    return (this.value >> 24) & 0xFF;
  }

  /**
   * Get red channel (0-255)
   */
  get red() {
    return (this.value >> 16) & 0xFF;
  }

  /**
   * Get green channel (0-255)
   */
  get green() {
    return (this.value >> 8) & 0xFF;
  }

  /**
   * Get blue channel (0-255)
   */
  get blue() {
    return this.value & 0xFF;
  }

  /**
   * Get opacity (0.0-1.0)
   */
  get opacity() {
    return this.alpha / 255;
  }

  /**
   * Convert to CSS hex string
   */
  toCSSString() {
    const hex = this.value.toString(16).padStart(8, '0');
    return `#${hex.slice(2)}`; // Skip alpha for CSS
  }

  /**
   * Convert to CSS rgba string
   */
  toCSS() {
    return `rgba(${this.red}, ${this.green}, ${this.blue}, ${this.opacity})`;
  }

  /**
   * Create a copy with modified alpha
   */
  withAlpha(alpha) {
    return Color.fromARGB(alpha, this.red, this.green, this.blue);
  }

  /**
   * Create a copy with modified opacity (0.0-1.0)
   */
  withOpacity(opacity) {
    const alpha = Math.round(opacity * 255);
    return Color.fromARGB(alpha, this.red, this.green, this.blue);
  }

  /**
   * Blend two colors
   */
  static lerp(a, b, t) {
    if (a === null) return b?.withOpacity(b.opacity * t);
    if (b === null) return a?.withOpacity(a.opacity * (1 - t));

    const alpha = Math.round(a.alpha * (1 - t) + b.alpha * t);
    const red = Math.round(a.red * (1 - t) + b.red * t);
    const green = Math.round(a.green * (1 - t) + b.green * t);
    const blue = Math.round(a.blue * (1 - t) + b.blue * t);

    return Color.fromARGB(alpha, red, green, blue);
  }

  /**
   * Compare colors
   */
  equals(other) {
    return this.value === other.value;
  }

  toString() {
    return `Color(0x${this.value.toString(16).padStart(8, '0').toUpperCase()})`;
  }
}

// ============================================================================
// COLOR SWATCH
// ============================================================================

class ColorSwatch extends Color {
  constructor(primary, swatch) {
    super(primary);
    this._swatch = swatch || {};
  }

  /**
   * Get color by shade number
   */
  get(shade) {
    return this._swatch[shade];
  }

  /**
   * Direct access via bracket notation
   */
  [Symbol.for('get')](shade) {
    return this._swatch[shade];
  }
}

// ============================================================================
// MATERIAL COLOR CLASS
// ============================================================================

class MaterialColor extends ColorSwatch {
  constructor(primary, swatch) {
    super(primary, swatch);
  }

  get shade50() { return this._swatch[50]; }
  get shade100() { return this._swatch[100]; }
  get shade200() { return this._swatch[200]; }
  get shade300() { return this._swatch[300]; }
  get shade400() { return this._swatch[400]; }
  get shade500() { return this._swatch[500]; }
  get shade600() { return this._swatch[600]; }
  get shade700() { return this._swatch[700]; }
  get shade800() { return this._swatch[800]; }
  get shade900() { return this._swatch[900]; }

  /**
   * Get shade by index
   */
  getShade(index) {
    return this._swatch[index];
  }
}

// ============================================================================
// MATERIAL ACCENT COLOR CLASS
// ============================================================================

class MaterialAccentColor extends ColorSwatch {
  constructor(primary, swatch) {
    super(primary, swatch);
  }

  get shade100() { return this._swatch[100]; }
  get shade200() { return this._swatch[200]; }
  get shade400() { return this._swatch[400]; }
  get shade700() { return this._swatch[700]; }

  /**
   * Get shade by index
   */
  getShade(index) {
    return this._swatch[index];
  }
}

// ============================================================================
// MATERIAL COLORS
// ============================================================================

class Colors {
  // Transparency
  static transparent = new Color(0x00000000);

  // Black and White
  static black = new Color(0xFF000000);
  static black87 = new Color(0xDD000000);
  static black54 = new Color(0x8A000000);
  static black45 = new Color(0x73000000);
  static black38 = new Color(0x61000000);
  static black26 = new Color(0x42000000);
  static black12 = new Color(0x1F000000);

  static white = new Color(0xFFFFFFFF);
  static white70 = new Color(0xB3FFFFFF);
  static white60 = new Color(0x99FFFFFF);
  static white54 = new Color(0x8AFFFFFF);
  static white38 = new Color(0x62FFFFFF);
  static white30 = new Color(0x4DFFFFFF);
  static white24 = new Color(0x3DFFFFFF);
  static white12 = new Color(0x1FFFFFFF);
  static white10 = new Color(0x1AFFFFFF);

  // RED
  static red = new MaterialColor(0xFFF44336, {
    50: new Color(0xFFFFEBEE),
    100: new Color(0xFFFFCDD2),
    200: new Color(0xFFEF9A9A),
    300: new Color(0xFFE57373),
    400: new Color(0xFFEF5350),
    500: new Color(0xFFF44336),
    600: new Color(0xFFE53935),
    700: new Color(0xFFD32F2F),
    800: new Color(0xFFC62828),
    900: new Color(0xFFB71C1C)
  });

  static redAccent = new MaterialAccentColor(0xFFFF5252, {
    100: new Color(0xFFFF8A80),
    200: new Color(0xFFFF5252),
    400: new Color(0xFFFF1744),
    700: new Color(0xFFD50000)
  });

  // PINK
  static pink = new MaterialColor(0xFFE91E63, {
    50: new Color(0xFFFCE4EC),
    100: new Color(0xFFF8BBD0),
    200: new Color(0xFFF48FB1),
    300: new Color(0xFFF06292),
    400: new Color(0xFFEC407A),
    500: new Color(0xFFE91E63),
    600: new Color(0xFFD81B60),
    700: new Color(0xFFC2185B),
    800: new Color(0xFFAD1457),
    900: new Color(0xFF880E4F)
  });

  static pinkAccent = new MaterialAccentColor(0xFFFF4081, {
    100: new Color(0xFFFF80AB),
    200: new Color(0xFFFF4081),
    400: new Color(0xFFF50057),
    700: new Color(0xFFC51162)
  });

  // PURPLE
  static purple = new MaterialColor(0xFF9C27B0, {
    50: new Color(0xFFF3E5F5),
    100: new Color(0xFFE1BEE7),
    200: new Color(0xFFCE93D8),
    300: new Color(0xFFBA68C8),
    400: new Color(0xFFAB47BC),
    500: new Color(0xFF9C27B0),
    600: new Color(0xFF8E24AA),
    700: new Color(0xFF7B1FA2),
    800: new Color(0xFF6A1B9A),
    900: new Color(0xFF4A148C)
  });

  static purpleAccent = new MaterialAccentColor(0xFFE040FB, {
    100: new Color(0xFFEA80FC),
    200: new Color(0xFFE040FB),
    400: new Color(0xFFD500F9),
    700: new Color(0xFFAA00FF)
  });

  // DEEP PURPLE
  static deepPurple = new MaterialColor(0xFF673AB7, {
    50: new Color(0xFFEDE7F6),
    100: new Color(0xFFD1C4E9),
    200: new Color(0xFFB39DDB),
    300: new Color(0xFF9575CD),
    400: new Color(0xFF7E57C2),
    500: new Color(0xFF673AB7),
    600: new Color(0xFF5E35B1),
    700: new Color(0xFF512DA8),
    800: new Color(0xFF4527A0),
    900: new Color(0xFF311B92)
  });

  static deepPurpleAccent = new MaterialAccentColor(0xFF7C4DFF, {
    100: new Color(0xFFB388FF),
    200: new Color(0xFF7C4DFF),
    400: new Color(0xFF651FFF),
    700: new Color(0xFF6200EA)
  });

  // INDIGO
  static indigo = new MaterialColor(0xFF3F51B5, {
    50: new Color(0xFFE8EAF6),
    100: new Color(0xFFC5CAE9),
    200: new Color(0xFF9FA8DA),
    300: new Color(0xFF7986CB),
    400: new Color(0xFF5C6BC0),
    500: new Color(0xFF3F51B5),
    600: new Color(0xFF3949AB),
    700: new Color(0xFF303F9F),
    800: new Color(0xFF283593),
    900: new Color(0xFF1A237E)
  });

  static indigoAccent = new MaterialAccentColor(0xFF536DFE, {
    100: new Color(0xFF8C9EFF),
    200: new Color(0xFF536DFE),
    400: new Color(0xFF3D5AFE),
    700: new Color(0xFF304FFE)
  });

  // BLUE
  static blue = new MaterialColor(0xFF2196F3, {
    50: new Color(0xFFE3F2FD),
    100: new Color(0xFFBBDEFB),
    200: new Color(0xFF90CAF9),
    300: new Color(0xFF64B5F6),
    400: new Color(0xFF42A5F5),
    500: new Color(0xFF2196F3),
    600: new Color(0xFF1E88E5),
    700: new Color(0xFF1976D2),
    800: new Color(0xFF1565C0),
    900: new Color(0xFF0D47A1)
  });

  static blueAccent = new MaterialAccentColor(0xFF448AFF, {
    100: new Color(0xFF82B1FF),
    200: new Color(0xFF448AFF),
    400: new Color(0xFF2979FF),
    700: new Color(0xFF2962FF)
  });

  // LIGHT BLUE
  static lightBlue = new MaterialColor(0xFF03A9F4, {
    50: new Color(0xFFE1F5FE),
    100: new Color(0xFFB3E5FC),
    200: new Color(0xFF81D4FA),
    300: new Color(0xFF4FC3F7),
    400: new Color(0xFF29B6F6),
    500: new Color(0xFF03A9F4),
    600: new Color(0xFF039BE5),
    700: new Color(0xFF0288D1),
    800: new Color(0xFF0277BD),
    900: new Color(0xFF01579B)
  });

  static lightBlueAccent = new MaterialAccentColor(0xFF40C4FF, {
    100: new Color(0xFF80D8FF),
    200: new Color(0xFF40C4FF),
    400: new Color(0xFF00B0FF),
    700: new Color(0xFF0091EA)
  });

  // CYAN
  static cyan = new MaterialColor(0xFF00BCD4, {
    50: new Color(0xFFE0F7FA),
    100: new Color(0xFFB2EBF2),
    200: new Color(0xFF80DEEA),
    300: new Color(0xFF4DD0E1),
    400: new Color(0xFF26C6DA),
    500: new Color(0xFF00BCD4),
    600: new Color(0xFF00ACC1),
    700: new Color(0xFF0097A7),
    800: new Color(0xFF00838F),
    900: new Color(0xFF006064)
  });

  static cyanAccent = new MaterialAccentColor(0xFF18FFFF, {
    100: new Color(0xFF84FFFF),
    200: new Color(0xFF18FFFF),
    400: new Color(0xFF00E5FF),
    700: new Color(0xFF00B8D4)
  });

  // TEAL
  static teal = new MaterialColor(0xFF009688, {
    50: new Color(0xFFE0F2F1),
    100: new Color(0xFFB2DFDB),
    200: new Color(0xFF80CBC4),
    300: new Color(0xFF4DB6AC),
    400: new Color(0xFF26A69A),
    500: new Color(0xFF009688),
    600: new Color(0xFF00897B),
    700: new Color(0xFF00796B),
    800: new Color(0xFF00695C),
    900: new Color(0xFF004D40)
  });

  static tealAccent = new MaterialAccentColor(0xFF64FFDA, {
    100: new Color(0xFFA7FFEB),
    200: new Color(0xFF64FFDA),
    400: new Color(0xFF1DE9B6),
    700: new Color(0xFF00BFA5)
  });

  // GREEN
  static green = new MaterialColor(0xFF4CAF50, {
    50: new Color(0xFFE8F5E9),
    100: new Color(0xFFC8E6C9),
    200: new Color(0xFFA5D6A7),
    300: new Color(0xFF81C784),
    400: new Color(0xFF66BB6A),
    500: new Color(0xFF4CAF50),
    600: new Color(0xFF43A047),
    700: new Color(0xFF388E3C),
    800: new Color(0xFF2E7D32),
    900: new Color(0xFF1B5E20)
  });

  static greenAccent = new MaterialAccentColor(0xFF69F0AE, {
    100: new Color(0xFFB9F6CA),
    200: new Color(0xFF69F0AE),
    400: new Color(0xFF00E676),
    700: new Color(0xFF00C853)
  });

  // LIGHT GREEN
  static lightGreen = new MaterialColor(0xFF8BC34A, {
    50: new Color(0xFFF1F8E9),
    100: new Color(0xFFDCEDC8),
    200: new Color(0xFFC5E1A5),
    300: new Color(0xFFAED581),
    400: new Color(0xFF9CCC65),
    500: new Color(0xFF8BC34A),
    600: new Color(0xFF7CB342),
    700: new Color(0xFF689F38),
    800: new Color(0xFF558B2F),
    900: new Color(0xFF33691E)
  });

  static lightGreenAccent = new MaterialAccentColor(0xFFB2FF59, {
    100: new Color(0xFFCCFF90),
    200: new Color(0xFFB2FF59),
    400: new Color(0xFF76FF03),
    700: new Color(0xFF64DD17)
  });

  // LIME
  static lime = new MaterialColor(0xFFCDDC39, {
    50: new Color(0xFFF9FBE7),
    100: new Color(0xFFF0F4C3),
    200: new Color(0xFFE6EE9C),
    300: new Color(0xFFDCE775),
    400: new Color(0xFFD4E157),
    500: new Color(0xFFCDDC39),
    600: new Color(0xFFC0CA33),
    700: new Color(0xFFAFB42B),
    800: new Color(0xFF9E9D24),
    900: new Color(0xFF827717)
  });

  static limeAccent = new MaterialAccentColor(0xFFEEFF41, {
    100: new Color(0xFFF4FF81),
    200: new Color(0xFFEEFF41),
    400: new Color(0xFFC6FF00),
    700: new Color(0xFFAEEA00)
  });

  // YELLOW
  static yellow = new MaterialColor(0xFFFFEB3B, {
    50: new Color(0xFFFFFDE7),
    100: new Color(0xFFFFF9C4),
    200: new Color(0xFFFFF59D),
    300: new Color(0xFFFFF176),
    400: new Color(0xFFFFEE58),
    500: new Color(0xFFFFEB3B),
    600: new Color(0xFFFDD835),
    700: new Color(0xFFFBC02D),
    800: new Color(0xFFF9A825),
    900: new Color(0xFFF57F17)
  });

  static yellowAccent = new MaterialAccentColor(0xFFFFFF00, {
    100: new Color(0xFFFFFF8D),
    200: new Color(0xFFFFFF00),
    400: new Color(0xFFFFEA00),
    700: new Color(0xFFFFD600)
  });

  // AMBER
  static amber = new MaterialColor(0xFFFFC107, {
    50: new Color(0xFFFFF8E1),
    100: new Color(0xFFFFECB3),
    200: new Color(0xFFFFE082),
    300: new Color(0xFFFFD54F),
    400: new Color(0xFFFFCA28),
    500: new Color(0xFFFFC107),
    600: new Color(0xFFFFB300),
    700: new Color(0xFFFFA000),
    800: new Color(0xFFFF8F00),
    900: new Color(0xFFFF6F00)
  });

  static amberAccent = new MaterialAccentColor(0xFFFFD740, {
    100: new Color(0xFFFFE57F),
    200: new Color(0xFFFFD740),
    400: new Color(0xFFFFC400),
    700: new Color(0xFFFFAB00)
  });

  // ORANGE
  static orange = new MaterialColor(0xFFFF9800, {
    50: new Color(0xFFFFF3E0),
    100: new Color(0xFFFFE0B2),
    200: new Color(0xFFFFCC80),
    300: new Color(0xFFFFB74D),
    400: new Color(0xFFFFA726),
    500: new Color(0xFFFF9800),
    600: new Color(0xFFFB8C00),
    700: new Color(0xFFF57C00),
    800: new Color(0xFFEF6C00),
    900: new Color(0xFFE65100)
  });

  static orangeAccent = new MaterialAccentColor(0xFFFFAB40, {
    100: new Color(0xFFFFD180),
    200: new Color(0xFFFFAB40),
    400: new Color(0xFFFF9100),
    700: new Color(0xFFFF6D00)
  });

  // DEEP ORANGE
  static deepOrange = new MaterialColor(0xFFFF5722, {
    50: new Color(0xFFFBE9E7),
    100: new Color(0xFFFFCCBC),
    200: new Color(0xFFFFAB91),
    300: new Color(0xFFFF8A65),
    400: new Color(0xFFFF7043),
    500: new Color(0xFFFF5722),
    600: new Color(0xFFF4511E),
    700: new Color(0xFFE64A19),
    800: new Color(0xFFD84315),
    900: new Color(0xFFBF360C)
  });

  static deepOrangeAccent = new MaterialAccentColor(0xFFFF6E40, {
    100: new Color(0xFFFF9E80),
    200: new Color(0xFFFF6E40),
    400: new Color(0xFFFF3D00),
    700: new Color(0xFFDD2C00)
  });

  // BROWN
  static brown = new MaterialColor(0xFF795548, {
    50: new Color(0xFFEFEBE9),
    100: new Color(0xFFD7CCC8),
    200: new Color(0xFFBCAAA4),
    300: new Color(0xFFA1887F),
    400: new Color(0xFF8D6E63),
    500: new Color(0xFF795548),
    600: new Color(0xFF6D4C41),
    700: new Color(0xFF5D4037),
    800: new Color(0xFF4E342E),
    900: new Color(0xFF3E2723)
  });

  // GREY
  static grey = new MaterialColor(0xFF9E9E9E, {
    50: new Color(0xFFFAFAFA),
    100: new Color(0xFFF5F5F5),
    200: new Color(0xFFEEEEEE),
    300: new Color(0xFFE0E0E0),
    350: new Color(0xFFD6D6D6),
    400: new Color(0xFFBDBDBD),
    500: new Color(0xFF9E9E9E),
    600: new Color(0xFF757575),
    700: new Color(0xFF616161),
    800: new Color(0xFF424242),
    850: new Color(0xFF303030),
    900: new Color(0xFF212121)
  });

  // BLUE GREY
  static blueGrey = new MaterialColor(0xFF607D8B, {
    50: new Color(0xFFECEFF1),
    100: new Color(0xFFCFD8DC),
    200: new Color(0xFFB0BEC5),
    300: new Color(0xFF90A4AE),
    400: new Color(0xFF78909C),
    500: new Color(0xFF607D8B),
    600: new Color(0xFF546E7A),
    700: new Color(0xFF455A64),
    800: new Color(0xFF37474F),
    900: new Color(0xFF263238)
  });

  /**
   * All primary material colors
   */
  static get primaries() {
    return [
      Colors.red,
      Colors.pink,
      Colors.purple,
      Colors.deepPurple,
      Colors.indigo,
      Colors.blue,
      Colors.lightBlue,
      Colors.cyan,
      Colors.teal,
      Colors.green,
      Colors.lightGreen,
      Colors.lime,
      Colors.yellow,
      Colors.amber,
      Colors.orange,
      Colors.deepOrange,
      Colors.brown,
      Colors.blueGrey
    ];
  }

  /**
   * All accent colors
   */
  static get accents() {
    return [
      Colors.redAccent,
      Colors.pinkAccent,
      Colors.purpleAccent,
      Colors.deepPurpleAccent,
      Colors.indigoAccent,
      Colors.blueAccent,
      Colors.lightBlueAccent,
      Colors.cyanAccent,
      Colors.tealAccent,
      Colors.greenAccent,
      Colors.lightGreenAccent,
      Colors.limeAccent,
      Colors.yellowAccent,
      Colors.amberAccent,
      Colors.orangeAccent,
      Colors.deepOrangeAccent
    ];
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  Color,
  ColorSwatch,
  MaterialColor,
  MaterialAccentColor,
  Colors
};