import { Size } from './size.js';
export class Rect {
  constructor(left = 0, top = 0, right = 0, bottom = 0) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
  }

  static fromLTWH(left, top, width, height) {
    return new Rect(left, top, left + width, top + height);
  }

  get width() {
    return this.right - this.left;
  }

  get height() {
    return this.bottom - this.top;
  }

  get size() {
    return new Size(this.width, this.height);
  }

  toString() {
    return `Rect.fromLTWH(${this.left}, ${this.top}, ${this.width}, ${this.height})`;
  }
}