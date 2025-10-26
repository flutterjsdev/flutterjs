import { Math } from '../../core/math.js';
export class Offset {
  constructor(dx = 0, dy = 0) {
    this.dx = dx;
    this.dy = dy;
  }

  static zero() {
    return new Offset(0, 0);
  }

  static infinite() {
    return new Offset(Infinity, Infinity);
  }

  get distance() {
    return Math.sqrt(this.dx * this.dx + this.dy * this.dy);
  }

  translate(translateX, translateY) {
    return new Offset(this.dx + translateX, this.dy + translateY);
  }

  scale(scaleX, scaleY = scaleX) {
    return new Offset(this.dx * scaleX, this.dy * scaleY);
  }

  toString() {
    return `Offset(${this.dx}, ${this.dy})`;
  }
}