/**
 * ============================================================================
 * dart:ui - Basic implementation for FlutterJS
 * ============================================================================
 * 
 * Provides basic types used by the transpiled code.
 * Most primitive types are implemented here.
 */

export class Offset {
    constructor(dx, dy) {
        this.dx = dx;
        this.dy = dy;
    }

    get distance() {
        return Math.sqrt(this.dx * this.dx + this.dy * this.dy);
    }

    static get zero() {
        return new Offset(0, 0);
    }

    static get infinite() {
        return new Offset(Infinity, Infinity);
    }

    translate(translateX, translateY) {
        return new Offset(this.dx + translateX, this.dy + translateY);
    }

    scale(scaleX, scaleY) {
        return new Offset(this.dx * scaleX, this.dy * scaleY);
    }
}

export class Size {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }

    static get zero() {
        return new Size(0, 0);
    }

    static get infinite() {
        return new Size(Infinity, Infinity);
    }
}

export class Rect {
    constructor(left, top, right, bottom) {
        this.left = left;
        this.top = top;
        this.right = right;
        this.bottom = bottom;
    }

    get width() { return this.right - this.left; }
    get height() { return this.bottom - this.top; }

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
}

export class Color {
    constructor(value) {
        this.value = value;
    }

    get alpha() { return (this.value >> 24) & 0xFF; }
    get opacity() { return this.alpha / 0xFF; }
    get red() { return (this.value >> 16) & 0xFF; }
    get green() { return (this.value >> 8) & 0xFF; }
    get blue() { return this.value & 0xFF; }

    withOpacity(opacity) {
        // Clamp opacity between 0.0 and 1.0
        opacity = Math.max(0.0, Math.min(1.0, opacity));
        const alphaValue = Math.round(opacity * 255);
        return new Color((this.value & 0x00FFFFFF) | (alphaValue << 24));
    }
}

export class Radius {
    constructor(x) {
        this.x = x;
        this.y = x;
    }

    static circular(radius) {
        return new Radius(radius);
    }
}

export class RRect {
    constructor() {
        this._rect = new Rect(0, 0, 0, 0);
    }

    static fromRectAndRadius(rect, radius) {
        const r = new RRect();
        r._rect = rect;
        return r;
    }
}

// Export default object for compat
export default {
    Offset,
    Size,
    Rect,
    Color,
    Radius,
    RRect
};
