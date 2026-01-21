import { BorderRadius } from "../utils/border_radius.js";

/**
 * A rectangular border with rounded corners.
 */
class RoundedRectangleBorder {
    constructor({
        side = { width: 0, color: 'transparent', style: 'none' },
        borderRadius = BorderRadius.zero
    } = {}) {
        this.side = side;
        this.borderRadius = borderRadius;
    }

    /**
     * Creates a copy of this border with the given fields replaced with the new values.
     */
    copyWith({ side, borderRadius } = {}) {
        return new RoundedRectangleBorder({
            side: side ?? this.side,
            borderRadius: borderRadius ?? this.borderRadius
        });
    }

    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `RoundedRectangleBorder(side: ${this.side}, borderRadius: ${this.borderRadius})`;
    }
}

export { RoundedRectangleBorder };
