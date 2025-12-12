import { Alignment } from './property/alignment.js';

export class LinearGradient {
  constructor({
    begin = Alignment.topLeft,
    end = Alignment.bottomRight,
    colors = [],
    stops = null
  } = {}) {
    this.begin = begin;
    this.end = end;
    this.colors = colors;
    this.stops = stops || colors.map((_, i) => i / (colors.length - 1 || 1));
  }

  toCSSString() {
    const angle = Math.atan2(this.end.y - this.begin.y, this.end.x - this.begin.x) * (180 / Math.PI);
    const colorStops = this.colors
      .map((color, i) => `${color} ${this.stops[i] * 100}%`)
      .join(', ');
    return `linear-gradient(${angle}deg, ${colorStops})`;
  }

  toString() {
    return `LinearGradient(colors: ${this.colors.length})`;
  }
}