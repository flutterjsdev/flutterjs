// dart:math implementation

export const E = Math.E;
export const LN10 = Math.LN10;
export const LN2 = Math.LN2;
export const LOG2E = Math.LOG2E;
export const LOG10E = Math.LOG10E;
export const PI = Math.PI;
export const SQRT1_2 = Math.SQRT1_2;
export const SQRT2 = Math.SQRT2;

export const min = Math.min;
export const max = Math.max;
export const sqrt = Math.sqrt;
export const sign = Math.sign;
export const sin = Math.sin;
export const cos = Math.cos;
export const tan = Math.tan;
export const acos = Math.acos;
export const asin = Math.asin;
export const atan = Math.atan;
export const atan2 = Math.atan2;
export const exp = Math.exp;
export const log = Math.log;
export const pow = Math.pow;

export class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    toString() {
        return `Point(${this.x}, ${this.y})`;
    }

    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    get magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    operator_add(other) {
        return new Point(this.x + other.x, this.y + other.y);
    }

    operator_minus(other) {
        return new Point(this.x - other.x, this.y - other.y);
    }
}

export class Rectangle {
    constructor(left, top, width, height) {
        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height;
    }

    get right() { return this.left + this.width; }
    get bottom() { return this.top + this.height; }

    containsPoint(point) {
        return point.x >= this.left && point.x < this.right &&
            point.y >= this.top && point.y < this.bottom;
    }

    containsRectangle(rect) {
        return rect.left >= this.left && rect.right <= this.right &&
            rect.top >= this.top && rect.bottom <= this.bottom;
    }
}

export class MutableRectangle extends Rectangle {
    constructor(left, top, width, height) {
        super(left, top, width, height);
    }
}

export class Random {
    constructor(seed) {
        // JS Math.random() doesn't support seeding natively without a custom PRNG.
        // For now, we ignore the seed to rely on browser crypto/random.
        // TODO: Implement a seeded PRNG if strict determinism is needed.
    }

    nextInt(max) {
        return Math.floor(Math.random() * max);
    }

    nextDouble() {
        return Math.random();
    }

    nextBool() {
        return Math.random() >= 0.5;
    }
}
