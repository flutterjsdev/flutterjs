// Copyright 2025 The FlutterJS Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


/**
 * OffsetBase - Abstract base class for Size and Offset
 * Provides common comparison and utility operations
 */
class OffsetBase {
    constructor(dx = 0, dy = 0) {
        this._dx = dx;
        this._dy = dy;
    }

    get dx() {
        return this._dx;
    }

    get dy() {
        return this._dy;
    }

    get isInfinite() {
        return this._dx >= Number.POSITIVE_INFINITY || this._dy >= Number.POSITIVE_INFINITY;
    }

    get isFinite() {
        return Number.isFinite(this._dx) && Number.isFinite(this._dy);
    }

    // Comparison operators
    lessThan(other) {
        return this._dx < other._dx && this._dy < other._dy;
    }

    lessThanOrEqual(other) {
        return this._dx <= other._dx && this._dy <= other._dy;
    }

    greaterThan(other) {
        return this._dx > other._dx && this._dy > other._dy;
    }

    greaterThanOrEqual(other) {
        return this._dx >= other._dx && this._dy >= other._dy;
    }

    equals(other) {
        if (!other || !(other instanceof OffsetBase)) {
            return false;
        }
        return this._dx === other._dx && this._dy === other._dy;
    }

    hashCode() {
        return this._hashCombine(this._dx, this._dy);
    }

    _hashCombine(a, b) {
        let hash = 0;
        hash = ((hash << 5) - hash) + a;
        hash = ((hash << 5) - hash) + b;
        return hash & hash; // Convert to 32bit integer
    }

    toString() {
        return `${this.constructor.name}(${this._dx.toFixed(1)}, ${this._dy.toFixed(1)})`;
    }
}

/**
 * Size - Represents 2D dimensions with width and height
 * Extends OffsetBase for comparison operations
 */
class Size extends OffsetBase {
    constructor(width = 0, height = 0) {
        super(width, height);
    }

    get width() {
        return this._dx;
    }

    get height() {
        return this._dy;
    }

    // Static constants
    static get zero() {
        return new Size(0, 0);
    }

    static get infinite() {
        return new Size(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    }

    // Static factory methods
    static copy(source) {
        if (!source || !(source instanceof Size)) {
            return new Size();
        }
        return new Size(source.width, source.height);
    }

    static square(dimension) {
        return new Size(dimension, dimension);
    }

    static fromWidth(width) {
        return new Size(width, Number.POSITIVE_INFINITY);
    }

    static fromHeight(height) {
        return new Size(Number.POSITIVE_INFINITY, height);
    }

    static fromRadius(radius) {
        return new Size(radius * 2.0, radius * 2.0);
    }

    // Properties
    get isEmpty() {
        return this.width <= 0 || this.height <= 0;
    }

    get aspectRatio() {
        if (this.height !== 0) {
            return this.width / this.height;
        }
        if (this.width > 0) {
            return Number.POSITIVE_INFINITY;
        }
        if (this.width < 0) {
            return Number.NEGATIVE_INFINITY;
        }
        return 0;
    }

    get shortestSide() {
        return Math.min(Math.abs(this.width), Math.abs(this.height));
    }

    get longestSide() {
        return Math.max(Math.abs(this.width), Math.abs(this.height));
    }

    get flipped() {
        return new Size(this.height, this.width);
    }

    // Point operations - returns Offset
    topLeft(origin = new Offset(0, 0)) {
        return origin;
    }

    topCenter(origin = new Offset(0, 0)) {
        return new Offset(origin.dx + this.width / 2.0, origin.dy);
    }

    topRight(origin = new Offset(0, 0)) {
        return new Offset(origin.dx + this.width, origin.dy);
    }

    centerLeft(origin = new Offset(0, 0)) {
        return new Offset(origin.dx, origin.dy + this.height / 2.0);
    }

    center(origin = new Offset(0, 0)) {
        return new Offset(origin.dx + this.width / 2.0, origin.dy + this.height / 2.0);
    }

    centerRight(origin = new Offset(0, 0)) {
        return new Offset(origin.dx + this.width, origin.dy + this.height / 2.0);
    }

    bottomLeft(origin = new Offset(0, 0)) {
        return new Offset(origin.dx, origin.dy + this.height);
    }

    bottomCenter(origin = new Offset(0, 0)) {
        return new Offset(origin.dx + this.width / 2.0, origin.dy + this.height);
    }

    bottomRight(origin = new Offset(0, 0)) {
        return new Offset(origin.dx + this.width, origin.dy + this.height);
    }

    // Point containment check
    contains(offset) {
        if (!offset || !(offset instanceof Offset)) {
            return false;
        }
        return (
            offset.dx >= 0 &&
            offset.dx < this.width &&
            offset.dy >= 0 &&
            offset.dy < this.height
        );
    }

    // Arithmetic operations
    subtract(other) {
        if (other instanceof Size) {
            return new Offset(this.width - other.width, this.height - other.height);
        }
        if (other instanceof Offset) {
            return new Size(this.width - other.dx, this.height - other.dy);
        }
        throw new Error(`Cannot subtract ${other.constructor.name} from Size`);
    }

    add(offset) {
        if (!offset || !(offset instanceof Offset)) {
            throw new Error('Can only add Offset to Size');
        }
        return new Size(this.width + offset.dx, this.height + offset.dy);
    }

    multiply(operand) {
        if (typeof operand !== 'number') {
            throw new Error('Can only multiply Size by number');
        }
        return new Size(this.width * operand, this.height * operand);
    }

    divide(operand) {
        if (typeof operand !== 'number') {
            throw new Error('Can only divide Size by number');
        }
        if (operand === 0) {
            throw new Error('Division by zero');
        }
        return new Size(this.width / operand, this.height / operand);
    }

    floorDivide(operand) {
        if (typeof operand !== 'number') {
            throw new Error('Can only divide Size by number');
        }
        if (operand === 0) {
            throw new Error('Division by zero');
        }
        return new Size(
            Math.floor(this.width / operand),
            Math.floor(this.height / operand)
        );
    }

    modulo(operand) {
        if (typeof operand !== 'number') {
            throw new Error('Can only apply modulo with number');
        }
        return new Size(this.width % operand, this.height % operand);
    }

    // Static interpolation
    static lerp(a, b, t) {
        if (typeof t !== 'number' || t < 0 || t > 1) {
            throw new Error('Parameter t must be between 0 and 1');
        }

        if (b === null || b === undefined) {
            if (a === null || a === undefined) {
                return null;
            }
            return a.multiply(1.0 - t);
        }

        if (a === null || a === undefined) {
            return b.multiply(t);
        }

        return new Size(
            Size._lerpDouble(a.width, b.width, t),
            Size._lerpDouble(a.height, b.height, t)
        );
    }

    static _lerpDouble(a, b, t) {
        return a + (b - a) * t;
    }

    // Equality and hashing
    equals(other) {
        if (!other || !(other instanceof Size)) {
            return false;
        }
        return this._dx === other._dx && this._dy === other._dy;
    }

    hashCode() {
        return this._hashCombine(this.width, this.height);
    }

    toString() {
        return `Size(${this.width.toFixed(1)}, ${this.height.toFixed(1)})`;
    }
}

/**
 * Offset - Represents a 2D position/displacement
 * Used for relative positioning in coordinate space
 */
class Offset extends OffsetBase {
    constructor(dx = 0, dy = 0) {
        super(dx, dy);
    }

    static get zero() {
        return new Offset(0, 0);
    }

    static get infinite() {
        return new Offset(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    }

    static fromDirection(direction, distance = 1.0) {
        return new Offset(
            distance * Math.cos(direction),
            distance * Math.sin(direction)
        );
    }

    static lerp(a, b, t) {
        if (typeof t !== 'number' || t < 0 || t > 1) {
            throw new Error('Parameter t must be between 0 and 1');
        }

        if (b === null || b === undefined) {
            if (a === null || a === undefined) {
                return null;
            }
            return a.multiply(1.0 - t);
        }

        if (a === null || a === undefined) {
            return b.multiply(t);
        }

        return new Offset(
            Offset._lerpDouble(a.dx, b.dx, t),
            Offset._lerpDouble(a.dy, b.dy, t)
        );
    }

    static _lerpDouble(a, b, t) {
        return a + (b - a) * t;
    }

    // Properties
    get distance() {
        return Math.sqrt(this._dx * this._dx + this._dy * this._dy);
    }

    get distanceSquared() {
        return this._dx * this._dx + this._dy * this._dy;
    }

    get direction() {
        return Math.atan2(this._dy, this._dx);
    }

    // Operations
    add(other) {
        if (!other || !(other instanceof Offset)) {
            throw new Error('Can only add Offset to Offset');
        }
        return new Offset(this._dx + other._dx, this._dy + other._dy);
    }

    subtract(other) {
        if (!other || !(other instanceof Offset)) {
            throw new Error('Can only subtract Offset from Offset');
        }
        return new Offset(this._dx - other._dx, this._dy - other._dy);
    }

    multiply(operand) {
        if (typeof operand !== 'number') {
            throw new Error('Can only multiply Offset by number');
        }
        return new Offset(this._dx * operand, this._dy * operand);
    }

    divide(operand) {
        if (typeof operand !== 'number') {
            throw new Error('Can only divide Offset by number');
        }
        if (operand === 0) {
            throw new Error('Division by zero');
        }
        return new Offset(this._dx / operand, this._dy / operand);
    }

    floorDivide(operand) {
        if (typeof operand !== 'number') {
            throw new Error('Can only divide Offset by number');
        }
        if (operand === 0) {
            throw new Error('Division by zero');
        }
        return new Offset(
            Math.floor(this._dx / operand),
            Math.floor(this._dy / operand)
        );
    }

    modulo(operand) {
        if (typeof operand !== 'number') {
            throw new Error('Can only apply modulo with number');
        }
        return new Offset(this._dx % operand, this._dy % operand);
    }

    // Geometry
    scale(scaleX, scaleY = scaleX) {
        return new Offset(this._dx * scaleX, this._dy * scaleY);
    }

    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Offset(
            this._dx * cos - this._dy * sin,
            this._dx * sin + this._dy * cos
        );
    }

    translate(dx = 0, dy = 0) {
        return new Offset(this._dx + dx, this._dy + dy);
    }

    get negate() {
        return new Offset(-this._dx, -this._dy);
    }

    equals(other) {
        if (!other || !(other instanceof Offset)) {
            return false;
        }
        return this._dx === other._dx && this._dy === other._dy;
    }

    hashCode() {
        return this._hashCombine(this._dx, this._dy);
    }

    toString() {
        return `Offset(${this._dx.toFixed(1)}, ${this._dy.toFixed(1)})`;
    }
}

/**
 * Rect - Represents a rectangle with left, top, right, bottom coordinates
 */
class Rect {
    constructor(left = 0, top = 0, right = 0, bottom = 0) {
        this.left = left;
        this.top = top;
        this.right = right;
        this.bottom = bottom;
    }

    static fromLTWH(left, top, width, height) {
        return new Rect(left, top, left + width, top + height);
    }

    static fromCircle(center, radius) {
        return new Rect(
            center.dx - radius,
            center.dy - radius,
            center.dx + radius,
            center.dy + radius
        );
    }

    static fromPoints(a, b) {
        return new Rect(
            Math.min(a.dx, b.dx),
            Math.min(a.dy, b.dy),
            Math.max(a.dx, b.dx),
            Math.max(a.dy, b.dy)
        );
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

    get topLeft() {
        return new Offset(this.left, this.top);
    }

    get bottomRight() {
        return new Offset(this.right, this.bottom);
    }

    get center() {
        return new Offset(
            this.left + this.width / 2,
            this.top + this.height / 2
        );
    }

    contains(offset) {
        return (
            offset.dx >= this.left &&
            offset.dx < this.right &&
            offset.dy >= this.top &&
            offset.dy < this.bottom
        );
    }

    intersects(other) {
        return !(
            this.left >= other.right ||
            this.right <= other.left ||
            this.top >= other.bottom ||
            this.bottom <= other.top
        );
    }

    toString() {
        return `Rect.fromLTRB(${this.left.toFixed(1)}, ${this.top.toFixed(1)}, ${this.right.toFixed(1)}, ${this.bottom.toFixed(1)})`;
    }
}

/**
 * Radius - Represents corner radius for rounded rectangles
 * Can be circular (same x and y) or elliptical (different x and y)
 */
class Radius {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    // Static factory methods
    static circular(radius) {
        return new Radius(radius, radius);
    }

    static elliptical(x, y) {
        return new Radius(x, y);
    }

    static get zero() {
        return new Radius(0, 0);
    }

    // Clamp radius values
    clamp(options = {}) {
        const { minimum, maximum } = options;
        const minRadius = minimum || Radius.circular(Number.NEGATIVE_INFINITY);
        const maxRadius = maximum || Radius.circular(Number.POSITIVE_INFINITY);

        return new Radius(
            Radius._clampDouble(this.x, minRadius.x, maxRadius.x),
            Radius._clampDouble(this.y, minRadius.y, maxRadius.y)
        );
    }

    clampValues(options = {}) {
        const {
            minimumX,
            minimumY,
            maximumX,
            maximumY
        } = options;

        return new Radius(
            Radius._clampDouble(this.x, minimumX ?? Number.NEGATIVE_INFINITY, maximumX ?? Number.POSITIVE_INFINITY),
            Radius._clampDouble(this.y, minimumY ?? Number.NEGATIVE_INFINITY, maximumY ?? Number.POSITIVE_INFINITY)
        );
    }

    static _clampDouble(value, min, max) {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }

    // Unary negation
    negate() {
        return new Radius(-this.x, -this.y);
    }

    // Binary operations
    subtract(other) {
        if (!other || !(other instanceof Radius)) {
            throw new Error('Can only subtract Radius from Radius');
        }
        return new Radius(this.x - other.x, this.y - other.y);
    }

    add(other) {
        if (!other || !(other instanceof Radius)) {
            throw new Error('Can only add Radius to Radius');
        }
        return new Radius(this.x + other.x, this.y + other.y);
    }

    multiply(operand) {
        if (typeof operand !== 'number') {
            throw new Error('Can only multiply Radius by number');
        }
        return new Radius(this.x * operand, this.y * operand);
    }

    divide(operand) {
        if (typeof operand !== 'number') {
            throw new Error('Can only divide Radius by number');
        }
        if (operand === 0) {
            throw new Error('Division by zero');
        }
        return new Radius(this.x / operand, this.y / operand);
    }

    floorDivide(operand) {
        if (typeof operand !== 'number') {
            throw new Error('Can only divide Radius by number');
        }
        if (operand === 0) {
            throw new Error('Division by zero');
        }
        return new Radius(
            Math.floor(this.x / operand),
            Math.floor(this.y / operand)
        );
    }

    modulo(operand) {
        if (typeof operand !== 'number') {
            throw new Error('Can only apply modulo with number');
        }
        return new Radius(this.x % operand, this.y % operand);
    }

    // Linear interpolation
    static lerp(a, b, t) {
        if (typeof t !== 'number' || t < 0 || t > 1) {
            throw new Error('Parameter t must be between 0 and 1');
        }

        if (b === null || b === undefined) {
            if (a === null || a === undefined) {
                return null;
            }
            const k = 1.0 - t;
            return new Radius(a.x * k, a.y * k);
        }

        if (a === null || a === undefined) {
            return new Radius(b.x * t, b.y * t);
        }

        return new Radius(
            Radius._lerpDouble(a.x, b.x, t),
            Radius._lerpDouble(a.y, b.y, t)
        );
    }

    static _lerpDouble(a, b, t) {
        return a + (b - a) * t;
    }

    // Equality and hashing
    equals(other) {
        if (!other || !(other instanceof Radius)) {
            return false;
        }
        return this.x === other.x && this.y === other.y;
    }

    hashCode() {
        let hash = 0;
        hash = ((hash << 5) - hash) + this.x;
        hash = ((hash << 5) - hash) + this.y;
        return hash & hash; // Convert to 32bit integer
    }

    toString() {
        if (this.x === this.y) {
            return `Radius.circular(${this.x.toFixed(1)})`;
        }
        return `Radius.elliptical(${this.x.toFixed(1)}, ${this.y.toFixed(1)})`;
    }
}

/**
 * BorderRadius - Represents the radius for all four corners of a rectangle
 */
class BorderRadius {
    constructor(topLeft, topRight, bottomRight, bottomLeft) {
        this.topLeft = topLeft || Radius.zero;
        this.topRight = topRight || Radius.zero;
        this.bottomRight = bottomRight || Radius.zero;
        this.bottomLeft = bottomLeft || Radius.zero;
    }

    // Static factory methods
    static all(radius) {
        if (!(radius instanceof Radius)) {
            radius = Radius.circular(radius);
        }
        return new BorderRadius(radius, radius, radius, radius);
    }

    static circular(radius) {
        const r = Radius.circular(radius);
        return new BorderRadius(r, r, r, r);
    }

    static vertical(top, bottom) {
        return new BorderRadius(top, top, bottom, bottom);
    }

    static horizontal(left, right) {
        return new BorderRadius(left, right, right, left);
    }

    static only({ topLeft, topRight, bottomRight, bottomLeft } = {}) {
        return new BorderRadius(
            topLeft || Radius.zero,
            topRight || Radius.zero,
            bottomRight || Radius.zero,
            bottomLeft || Radius.zero
        );
    }

    static fromBorderSide(side, radius) {
        if (!(radius instanceof Radius)) {
            radius = Radius.circular(radius);
        }
        return new BorderRadius(radius, radius, radius, radius);
    }

    static get zero() {
        return new BorderRadius(Radius.zero, Radius.zero, Radius.zero, Radius.zero);
    }

    // Check if all radii are zero
    get isNonNegative() {
        return (
            this.topLeft.x >= 0 && this.topLeft.y >= 0 &&
            this.topRight.x >= 0 && this.topRight.y >= 0 &&
            this.bottomRight.x >= 0 && this.bottomRight.y >= 0 &&
            this.bottomLeft.x >= 0 && this.bottomLeft.y >= 0
        );
    }

    // Clamp border radius
    clamp(options = {}) {
        const { minimum, maximum } = options;
        return new BorderRadius(
            this.topLeft.clamp({ minimum, maximum }),
            this.topRight.clamp({ minimum, maximum }),
            this.bottomRight.clamp({ minimum, maximum }),
            this.bottomLeft.clamp({ minimum, maximum })
        );
    }

    // Subtract border radii
    subtract(other) {
        if (!other || !(other instanceof BorderRadius)) {
            throw new Error('Can only subtract BorderRadius from BorderRadius');
        }
        return new BorderRadius(
            this.topLeft.subtract(other.topLeft),
            this.topRight.subtract(other.topRight),
            this.bottomRight.subtract(other.bottomRight),
            this.bottomLeft.subtract(other.bottomLeft)
        );
    }

    // Add border radii
    add(other) {
        if (!other || !(other instanceof BorderRadius)) {
            throw new Error('Can only add BorderRadius to BorderRadius');
        }
        return new BorderRadius(
            this.topLeft.add(other.topLeft),
            this.topRight.add(other.topRight),
            this.bottomRight.add(other.bottomRight),
            this.bottomLeft.add(other.bottomLeft)
        );
    }

    // Scale border radius
    multiply(operand) {
        if (typeof operand !== 'number') {
            throw new Error('Can only multiply BorderRadius by number');
        }
        return new BorderRadius(
            this.topLeft.multiply(operand),
            this.topRight.multiply(operand),
            this.bottomRight.multiply(operand),
            this.bottomLeft.multiply(operand)
        );
    }

    divide(operand) {
        if (typeof operand !== 'number') {
            throw new Error('Can only divide BorderRadius by number');
        }
        return new BorderRadius(
            this.topLeft.divide(operand),
            this.topRight.divide(operand),
            this.bottomRight.divide(operand),
            this.bottomLeft.divide(operand)
        );
    }

    // Convert to CSS border-radius string
    toCSSString() {
        // All corners different
        if (!this._isUniform()) {
            return `${this.topLeft.x}px ${this.topRight.x}px ${this.bottomRight.x}px ${this.bottomLeft.x}px`;
        }

        // Check if all corners have same value
        if (
            this.topLeft.x === this.topRight.x &&
            this.topRight.x === this.bottomRight.x &&
            this.bottomRight.x === this.bottomLeft.x
        ) {
            return `${this.topLeft.x}px`;
        }

        return `${this.topLeft.x}px ${this.topRight.x}px ${this.bottomRight.x}px ${this.bottomLeft.x}px`;
    }

    _isUniform() {
        return (
            this.topLeft.x === this.topLeft.y &&
            this.topRight.x === this.topRight.y &&
            this.bottomRight.x === this.bottomRight.y &&
            this.bottomLeft.x === this.bottomLeft.y
        );
    }

    // Linear interpolation
    static lerp(a, b, t) {
        if (typeof t !== 'number' || t < 0 || t > 1) {
            throw new Error('Parameter t must be between 0 and 1');
        }

        if (b === null || b === undefined) {
            if (a === null || a === undefined) {
                return null;
            }
            return a.multiply(1.0 - t);
        }

        if (a === null || a === undefined) {
            return b.multiply(t);
        }

        return new BorderRadius(
            Radius.lerp(a.topLeft, b.topLeft, t),
            Radius.lerp(a.topRight, b.topRight, t),
            Radius.lerp(a.bottomRight, b.bottomRight, t),
            Radius.lerp(a.bottomLeft, b.bottomLeft, t)
        );
    }

    // Equality and hashing
    equals(other) {
        if (!other || !(other instanceof BorderRadius)) {
            return false;
        }
        return (
            this.topLeft.equals(other.topLeft) &&
            this.topRight.equals(other.topRight) &&
            this.bottomRight.equals(other.bottomRight) &&
            this.bottomLeft.equals(other.bottomLeft)
        );
    }

    hashCode() {
        let hash = 0;
        hash = ((hash << 5) - hash) + this.topLeft.hashCode();
        hash = ((hash << 5) - hash) + this.topRight.hashCode();
        hash = ((hash << 5) - hash) + this.bottomRight.hashCode();
        hash = ((hash << 5) - hash) + this.bottomLeft.hashCode();
        return hash & hash;
    }

    toString() {
        if (
            this.topLeft.equals(this.topRight) &&
            this.topRight.equals(this.bottomRight) &&
            this.bottomRight.equals(this.bottomLeft)
        ) {
            return `BorderRadius.all(${this.topLeft.toString()})`;
        }
        return `BorderRadius(topLeft: ${this.topLeft}, topRight: ${this.topRight}, bottomRight: ${this.bottomRight}, bottomLeft: ${this.bottomLeft})`;
    }
}

export { Size, Offset, Rect, OffsetBase, Radius, BorderRadius };