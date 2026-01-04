import { StatelessWidget } from '../../core/widget_element.js';
import { Container, EdgeInsets } from '../../material/container.js';
import { SizedBox } from './sized_box.js';
import { Center } from './center.js';
import { Colors } from '../../material/color.js';

export class Divider extends StatelessWidget {
    constructor({
        key,
        height = 16.0,
        thickness = null,
        indent = 0.0,
        endIndent = 0.0,
        color = null,
    } = {}) {
        super(key);
        this.height = height;
        this.thickness = thickness;
        this.indent = indent;
        this.endIndent = endIndent;
        this.color = color;
    }

    build(context) {
        const height = this.height;
        const thickness = this.thickness ?? 1.0;
        const indent = this.indent;
        const endIndent = this.endIndent;
        const color = this.color ?? Colors.grey.shade400;

        return new SizedBox({
            height: height,
            child: new Center({
                child: new Container({
                    height: thickness,
                    margin: EdgeInsets.only({ left: indent, right: endIndent }),
                    color: color,
                })
            })
        });
    }
}
