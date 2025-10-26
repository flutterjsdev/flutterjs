import { Math } from '../../core/math.js';
export class Size {
  constructor(width = 0, height = 0) {
    this.width = width;
    this.height = height;
  }

  static zero() {
    return new Size(0, 0);
  }

  static infinite() {
    return new Size(Infinity, Infinity);
  }

  static fromWidth(width) {
    return new Size(width, Infinity);
  }

  static fromHeight(height) {
    return new Size(Infinity, height);
  }

  get isEmpty() {
    return this.width <= 0 || this.height <= 0;
  }

  get longestSide() {
    return Math.max(this.width, this.height);
  }

  get shortestSide() {
    return Math.min(this.width, this.height);
  }

  aspectRatio() {
    return this.height === 0 ? Infinity : this.width / this.height;
  }

  toString() {
    return `Size(${this.width}, ${this.height})`;
  }
}