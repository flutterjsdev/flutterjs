import { StatelessWidget } from '../core/widget_element.js';
import { Container } from './container.js';
import { Center } from '../widgets/compoment/center.js';
import { Stack } from '../widgets/widgets.js';
import { Positioned } from '../widgets/widgets.js';

export class GridTile extends StatelessWidget {
    constructor({
        key,
        header,
        footer,
        child,
    } = {}) {
        super(key);
        this.header = header;
        this.footer = footer;
        this.child = child;
    }

    build(context) {
        if (!this.header && !this.footer) {
            return this.child || new Container();
        }

        const children = [];
        if (this.child) {
            children.push(new Positioned({
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                child: this.child
            }));
        }
        if (this.header) {
            children.push(new Positioned({
                top: 0,
                left: 0,
                right: 0,
                child: this.header // Usually fixed height or GridTileBar
            }));
        }
        if (this.footer) {
            children.push(new Positioned({
                bottom: 0,
                left: 0,
                right: 0,
                child: this.footer // Usually fixed height or GridTileBar
            }));
        }

        return new Stack({
            children: children
        });
    }
}

export class GridTileBar extends StatelessWidget {
    constructor({
        key,
        backgroundColor,
        leading,
        title,
        subtitle,
        trailing,
    } = {}) {
        super(key);
        this.backgroundColor = backgroundColor;
        this.leading = leading;
        this.title = title;
        this.subtitle = subtitle;
        this.trailing = trailing;
    }

    build(context) {
        // Simplified implementation: Row with leading, title/subtitle expanded, trailing
        // In valid material GridTileBar has specific height and layout

        const children = [];
        if (this.leading) {
            children.push(new Container({
                margin: { right: 16 }, // Padding like Logic
                child: this.leading
            }));
        }

        const textChildren = [];
        if (this.title) textChildren.push(this.title); // Should be styled
        if (this.subtitle) textChildren.push(this.subtitle); // Should be styled darker

        // We lack Column/CrossAxisAlignment in bare array, need a container/column
        // For simplicity returning a Container structure
        // This is a placeholder since we don't have full Row/Column power imported inside this file easily without circular deps sometimes?
        // Actually we can import Row/Col.

        // Lazy layout logic here: using CSS Grid or Flex in Container is safest for this "Bar"

        return new Container({
            color: this.backgroundColor,
            height: 48, // Standard GridTileBar height
            child: { // Raw DOM structure hint for framework or using Row
                tag: 'div',
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 8px',
                    height: '100%'
                },
                children: [
                    this.leading ? { tag: 'div', style: { marginRight: '16px' }, child: this.leading } : null,
                    {
                        tag: 'div',
                        style: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' },
                        children: [
                            this.title,
                            this.subtitle
                        ].filter(Boolean)
                    },
                    this.trailing ? { tag: 'div', style: { marginLeft: '16px' }, child: this.trailing } : null
                ].filter(Boolean)
            }
        });
    }
}
