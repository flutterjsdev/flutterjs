export class Alignment {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    Object.freeze(this); // Immutable like Flutter
  }

  // --- Flutter-style Static Getters ---
  static get topLeft() { return new Alignment(-1, -1); }
  static get topCenter() { return new Alignment(0, -1); }
  static get topRight() { return new Alignment(1, -1); }
  static get centerLeft() { return new Alignment(-1, 0); }
  static get center() { return new Alignment(0, 0); }
  static get centerRight() { return new Alignment(1, 0); }
  static get bottomLeft() { return new Alignment(-1, 1); }
  static get bottomCenter() { return new Alignment(0, 1); }
  static get bottomRight() { return new Alignment(1, 1); }

  // --- String-based Constants (CSS/JS) ---
  static topLeftStr = 'top-left';
  static topCenterStr = 'top-center';
  static topRightStr = 'top-right';
  static centerLeftStr = 'center-left';
  static centerStr = 'center';
  static centerRightStr = 'center-right';
  static bottomLeftStr = 'bottom-left';
  static bottomCenterStr = 'bottom-center';
  static bottomRightStr = 'bottom-right';

  // --- Convert String → Alignment Instance ---
  static fromString(str) {
    const map = {
      'top-left': Alignment.topLeft,
      'top-center': Alignment.topCenter,
      'top-right': Alignment.topRight,
      'center-left': Alignment.centerLeft,
      'center': Alignment.center,
      'center-right': Alignment.centerRight,
      'bottom-left': Alignment.bottomLeft,
      'bottom-center': Alignment.bottomCenter,
      'bottom-right': Alignment.bottomRight,
    };
    const result = map[str];
    if (!result) throw new Error(`Invalid alignment string: "${str}"`);
    return result;
  }

  // --- Convert Alignment → String Shortcut ---
  toString() {
    const key = `${this.x},${this.y}`;
    const map = {
      '-1,-1': 'top-left',
      '0,-1': 'top-center',
      '1,-1': 'top-right',
      '-1,0': 'center-left',
      '0,0': 'center',
      '1,0': 'center-right',
      '-1,1': 'bottom-left',
      '0,1': 'bottom-center',
      '1,1': 'bottom-right',
    };
    return map[key] || `Alignment(${this.x}, ${this.y})`;
  }

  // --- CSS: Flexbox / Grid (align-items + justify-items) ---
  toCSSFlex() {
    const xMap = { '-1': 'flex-start', '0': 'center', '1': 'flex-end' };
    const yMap = { '-1': 'flex-start', '0': 'center', '1': 'flex-end' };
    return `${xMap[this.x]} ${yMap[this.y]}`; // e.g., "flex-end flex-end"
  }

  // --- CSS: object-position (for <img>, <video>) ---
  toCSSObjectPosition() {
    const xMap = { '-1': 'left', '0': 'center', '1': 'right' };
    const yMap = { '-1': 'top', '0': 'center', '1': 'bottom' };
    return `${xMap[this.x]} ${yMap[this.y]}`;
  }

  // --- CSS: background-position ---
  toCSSBackground() {
    const xMap = { '-1': '0%', '0': '50%', '1': '100%' };
    const yMap = { '-1': '0%', '0': '50%', '1': '100%' };
    return `${xMap[this.x]} ${yMap[this.y]}`;
  }

  // --- DOM: Position absolute child inside container ---
  positionElement(childEl, containerEl) {
    const crect = containerEl.getBoundingClientRect();
    const erect = childEl.getBoundingClientRect();

    const left = (crect.width - erect.width) * (this.x + 1) / 2;
    const top = (crect.height - erect.height) * (this.y + 1) / 2;

    childEl.style.position = 'absolute';
    childEl.style.left = `${left}px`;
    childEl.style.top = `${top}px`;

    return { left, top };
  }

  // --- Flutter-style: Linear Interpolation ---
  static lerp(a, b, t) {
    if (!(a instanceof Alignment) || !(b instanceof Alignment)) return a;
    return new Alignment(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t
    );
  }

  // --- Equality ---
  equals(other) {
    return other instanceof Alignment && this.x === other.x && this.y === other.y;
  }
}