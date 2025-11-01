export class EdgeInsets {
  constructor(top = 0, right = 0, bottom = 0, left = 0) {
    this.top = top;
    this.right = right;
    this.bottom = bottom;
    this.left = left;
  }

  static zero() {
    return new EdgeInsets(0, 0, 0, 0);
  }

  static all(value) {
    return new EdgeInsets(value, value, value, value);
  }

  static symmetric({ vertical = 0, horizontal = 0 } = {}) {
    return new EdgeInsets(vertical, horizontal, vertical, horizontal);
  }

  static only({ top = 0, right = 0, bottom = 0, left = 0 } = {}) {
    return new EdgeInsets(top, right, bottom, left);
  }

  get vertical() {
    return this.top + this.bottom;
  }

  get horizontal() {
    return this.left + this.right;
  }

  toCSSString() {
    return `${this.top}px ${this.right}px ${this.bottom}px ${this.left}px`;
  }

  toString() {
    return `EdgeInsets(${this.top}, ${this.right}, ${this.bottom}, ${this.left})`;
  }
}