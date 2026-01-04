export class Size {
    constructor(width = 0, height = 0) {
        this.width = width;
        this.height = height;
    }

    static get zero() {
        return new Size(0, 0);
    }

    static get infinite() {
        return new Size(Infinity, Infinity);
    }

    static square(dimension) {
        return new Size(dimension, dimension);
    }

    get isEmpty() {
        return this.width === 0 && this.height === 0;
    }

    get isInfinite() {
        return this.width === Infinity || this.height === Infinity;
    }

    toString() {
        return `Size(${this.width}, ${this.height})`;
    }

    equals(other) {
        if (!other || !(other instanceof Size)) {
            return false;
        }
        return this.width === other.width && this.height === other.height;
    }
}
