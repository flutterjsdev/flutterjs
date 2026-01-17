import { StatefulWidget } from '../core/widget_element.js';
import { Container, BoxDecoration } from './container.js';

export class Ink extends StatefulWidget {
    constructor({
        key,
        padding,
        color,
        decoration,
        width,
        height,
        child,
    } = {}) {
        super(key);
        this.padding = padding;
        this.color = color;
        this.decoration = decoration;
        this.width = width;
        this.height = height;
        this.child = child;
    }

    createState() {
        return new InkState();
    }

    static image({
        key,
        padding,
        image,
        onImageError,
        colorFilter,
        fit,
        alignment,
        centerSlice,
        repeat,
        matchTextDirection,
        width,
        height,
        child,
    } = {}) {
        return new Ink({
            key,
            padding,
            width,
            height,
            child,
            decoration: new BoxDecoration({
                image: {
                    image, fit, alignment, repeat
                }
            })
        });
    }
}

class InkState extends StatefulWidget.State {
    build(context) {
        return new Container({
            padding: this.widget.padding,
            color: this.widget.color,
            decoration: this.widget.decoration,
            width: this.widget.width,
            height: this.widget.height,
            child: this.widget.child,
        });
    }
}
