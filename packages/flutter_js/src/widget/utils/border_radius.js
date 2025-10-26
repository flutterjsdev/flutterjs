export class BorderRadius {
  constructor(topLeft = 0, topRight = 0, bottomRight = 0, bottomLeft = 0) {
    this.topLeft = topLeft;
    this.topRight = topRight;
    this.bottomRight = bottomRight;
    this.bottomLeft = bottomLeft;
  }

  static all(radius) {
    return new BorderRadius(radius, radius, radius, radius);
  }

  static circular(radius) {
    return new BorderRadius(radius, radius, radius, radius);
  }

  static only({ topLeft = 0, topRight = 0, bottomRight = 0, bottomLeft = 0 } = {}) {
    return new BorderRadius(topLeft, topRight, bottomRight, bottomLeft);
  }

  static vertical({ top = 0, bottom = 0 } = {}) {
    return new BorderRadius(top, top, bottom, bottom);
  }

  static horizontal({ left = 0, right = 0 } = {}) {
    return new BorderRadius(left, right, right, left);
  }

  toCSSString() {
    return `${this.topLeft}px ${this.topRight}px ${this.bottomRight}px ${this.bottomLeft}px`;
  }

  toString() {
    return `BorderRadius(${this.topLeft}, ${this.topRight}, ${this.bottomRight}, ${this.bottomLeft})`;
  }
}