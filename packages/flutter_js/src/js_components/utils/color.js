import { Math } from '../../core/math.js';
export class Color {
  constructor(value) {
    if (typeof value === 'string') {
      this.hex = value;
      this.value = parseInt(value.replace('#', ''), 16);
    } else {
      this.value = value;
      this.hex = '#' + value.toString(16).padStart(6, '0');
    }
  }

  static fromARGB(a, r, g, b) {
    const value = (a << 24) | (r << 16) | (g << 8) | b;
    return new Color(value);
  }

  static fromHex(hex) {
    return new Color(hex);
  }

  withOpacity(opacity) {
    const rgb = this.hex.slice(1);
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return new Color(`#${alpha}${rgb}`);
  }

  get red() {
    return (this.value >> 16) & 0xFF;
  }

  get green() {
    return (this.value >> 8) & 0xFF;
  }

  get blue() {
    return this.value & 0xFF;
  }

  get alpha() {
    return (this.value >> 24) & 0xFF;
  }

  toString() {
    return this.hex;
  }
}