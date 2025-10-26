export class Alignment {
  constructor(x = 0, y = 0) {
    this.x = x;  // -1 to 1
    this.y = y;  // -1 to 1
  }

  static topLeft = new Alignment(-1, -1);
  static topCenter = new Alignment(0, -1);
  static topRight = new Alignment(1, -1);
  static centerLeft = new Alignment(-1, 0);
  static center = new Alignment(0, 0);
  static centerRight = new Alignment(1, 0);
  static bottomLeft = new Alignment(-1, 1);
  static bottomCenter = new Alignment(0, 1);
  static bottomRight = new Alignment(1, 1);

  toCSSString() {
    const xPercent = ((this.x + 1) / 2) * 100;
    const yPercent = ((this.y + 1) / 2) * 100;
    return `${xPercent}% ${yPercent}%`;
  }

  toString() {
    return `Alignment(${this.x}, ${this.y})`;
  }
}