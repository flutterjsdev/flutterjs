import { Offset } from './geometry.js';
export class BoxShadow {
  constructor({
    color = '#000000',
    offset = Offset.zero(),
    blurRadius = 0,
    spreadRadius = 0
  } = {}) {
    this.color = typeof color === 'string' ? color : color.hex;
    this.offset = offset;
    this.blurRadius = blurRadius;
    this.spreadRadius = spreadRadius;
  }

  toCSSString() {
    return `${this.offset.dx}px ${this.offset.dy}px ${this.blurRadius}px ${this.spreadRadius}px ${this.color}`;
  }

  toString() {
    return `BoxShadow(color: ${this.color}, blur: ${this.blurRadius})`;
  }
}