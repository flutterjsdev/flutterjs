class Color {
  constructor(value) {
    if (typeof value === 'string') {
      // Handle hex strings: #RRGGBB or #AARRGGBB
      const hex = value.replace('#', '');
      const num = parseInt(hex, 16);
      if (hex.length === 6) {
        this._value = (0xFF << 24) | num; // Opaque by default
      } else if (hex.length === 8) {
        this._value = num;
      } else {
        throw new Error('Invalid hex color string');
      }
      this._css = value.length === 7 ? `${value}FF` : value.toUpperCase();
    } else if (typeof value === 'number') {
      this._value = value >>> 0; // Ensure unsigned 32-bit
      const a = (this._value >> 24) & 0xFF;
      const r = (this._value >> 16) & 0xFF;
      const g = (this._value >> 8) & 0xFF;
      const b = this._value & 0xFF;
      this._css = a === 255
        ? `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase()
        : `#${a.toString(16).padStart(2, '0')}${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
    } else {
      throw new Error('Color value must be a hex string or integer');
    }
  }

  // --- Static Constructors ---

  static fromARGB(a, r, g, b) {
    const value = ((a & 0xFF) << 24) | ((r & 0xFF) << 16) | ((g & 0xFF) << 8) | (b & 0xFF);
    return new Color(value);
  }

  static fromRGBO(r, g, b, opacity) {
    if (opacity < 0 || opacity > 1) {
      throw new Error('Opacity must be between 0.0 and 1.0');
    }
    const a = Math.round(opacity * 255);
    return Color.fromARGB(a, r, g, b);
  }

  static fromHex(hex) {
    if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(hex)) {
      throw new Error('Invalid hex color format. Use #RRGGBB or #AARRGGBB');
    }
    return new Color(hex);
  }

  // --- Instance Methods ---

  withAlpha(alpha) {
    if (alpha < 0 || alpha > 255) {
      throw new Error('Alpha must be between 0 and 255');
    }
    const r = this.red;
    const g = this.green;
    const b = this.blue;
    return Color.fromARGB(alpha, r, g, b);
  }

  withOpacity(opacity) {
    if (opacity < 0 || opacity > 1) {
      throw new Error('Opacity must be between 0.0 and 1.0');
    }
    const alpha = Math.round(opacity * 255);
    return this.withAlpha(alpha);
  }

  // --- Getters ---

  get red() {
    return (this._value >> 16) & 0xFF;
  }

  get green() {
    return (this._value >> 8) & 0xFF;
  }

  get blue() {
    return this._value & 0xFF;
  }

  get alpha() {
    return (this._value >> 24) & 0xFF;
  }

  get opacity() {
    return this.alpha / 255;
  }

  get value() {
    return this._value;
  }

  get hex() {
    const a = this.alpha.toString(16).padStart(2, '0');
    const r = this.red.toString(16).padStart(2, '0');
    const g = this.green.toString(16).padStart(2, '0');
    const b = this.blue.toString(16).padStart(2, '0');
    return `#${a}${r}${g}${b}`.toUpperCase();
  }

  // --- Output ---

  toCSSString() {
    if (this.alpha === 255) {
      // hex is #AARRGGBB
      // We want #RRGGBB
      // So we take '#' and then everything after the first 2 chars (AA)
      return '#' + this.hex.slice(3);
    } else {
      const r = this.red;
      const g = this.green;
      const b = this.blue;
      const a = (this.alpha / 255).toFixed(4).replace(/\.?0+$/, '');
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }

  toString() {
    return this.toCSSString();
  }

  computeLuminance() {
    // See https://www.w3.org/TR/WCAG20/#relativeluminancedef
    const R = this.red / 255.0;
    const G = this.green / 255.0;
    const B = this.blue / 255.0;
    const r = R <= 0.03928 ? R / 12.92 : Math.pow((R + 0.055) / 1.055, 2.4);
    const g = G <= 0.03928 ? G / 12.92 : Math.pow((G + 0.055) / 1.055, 2.4);
    const b = B <= 0.03928 ? B / 12.92 : Math.pow((B + 0.055) / 1.055, 2.4);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
}

class MaterialColor extends Color {
  constructor(primary, swatch) {
    super(primary);
    this.swatch = swatch;
  }

  get(index) {
    return this.swatch[index];
  }

  static isDark(color) {
    if (!color) return false;
    let c;
    if (color instanceof Color) {
      c = color;
    } else if (typeof color === 'string') {
      // Try to parse hex
      try {
        c = new Color(color);
      } catch (e) {
        return false;
      }
    } else if (typeof color === 'object' && color.value) {
      c = new Color(color.value);
    } else {
      return false;
    }
    return c.computeLuminance() < 0.5;
  }
}

export { Color, MaterialColor };