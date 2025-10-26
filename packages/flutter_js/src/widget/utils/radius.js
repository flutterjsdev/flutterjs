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