
import { ButtonStyle } from './button_style.js';

export class TextButtonThemeData {
    constructor({
        style
    } = {}) {
        this.style = style;
    }

    // Convert to JSON for VDOM/Props
    toJson() {
        return {
            style: this.style
        };
    }
}
