import { Color } from '../utils/color.js';
import { EdgeInsets } from '../utils/edge_insets.js';

/**
 * InputBorder - Base class for input borders
 */
class InputBorder {
    constructor({
        borderSide = 'none' // 'none' or object
    } = {}) {
        this.borderSide = borderSide;
    }
}

/**
 * OutlineInputBorder - Default rectangular border
 */
class OutlineInputBorder extends InputBorder {
    constructor({
        borderRadius = 4,
        borderSide = null, // { color, width }
        gapPadding = 4
    } = {}) {
        super();
        this.borderRadius = borderRadius;
        this.gapPadding = gapPadding;

        // Handle borderSide shorthand or object
        if (borderSide) {
            this.borderSide = {
                color: borderSide.color || new Color('#bdbdbd').toCSSString(),
                width: borderSide.width || 1,
                ...borderSide
            };
        } else {
            this.borderSide = {
                color: new Color('#bdbdbd').toCSSString(),
                width: 1
            };
        }
    }

    copyWith({ borderRadius, borderSide, gapPadding } = {}) {
        return new OutlineInputBorder({
            borderRadius: borderRadius ?? this.borderRadius,
            borderSide: borderSide ?? this.borderSide,
            gapPadding: gapPadding ?? this.gapPadding
        });
    }

    toCSSObject() {
        return {
            border: `${this.borderSide.width}px solid ${this.borderSide.color}`,
            borderRadius: `${this.borderRadius}px`
        };
    }
}

/**
 * UnderlineInputBorder - Underline only border
 */
class UnderlineInputBorder extends InputBorder {
    constructor({
        borderSide = null
    } = {}) {
        super();

        if (borderSide) {
            this.borderSide = {
                color: borderSide.color || new Color('#bdbdbd').toCSSString(),
                width: borderSide.width || 1,
                ...borderSide
            };
        } else {
            this.borderSide = {
                color: new Color('#bdbdbd').toCSSString(),
                width: 1
            };
        }
    }

    copyWith({ borderSide } = {}) {
        return new UnderlineInputBorder({
            borderSide: borderSide ?? this.borderSide
        });
    }

    toCSSObject() {
        return {
            borderBottom: `${this.borderSide.width}px solid ${this.borderSide.color}`
        };
    }
}

export { InputBorder, OutlineInputBorder, UnderlineInputBorder };
