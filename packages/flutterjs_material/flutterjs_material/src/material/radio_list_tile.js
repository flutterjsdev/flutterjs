import { StatelessWidget } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { Radio } from './radio.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { Color } from '../utils/color.js';

/**
 * RadioListTile - A ListTile with a Radio button
 */
class RadioListTile extends StatelessWidget {
    constructor({
        key = null,
        value = null,
        groupValue = null,
        onChanged = null,
        toggleable = false,
        activeColor = null,
        title = null,
        subtitle = null,
        isThreeLine = false,
        dense = false,
        secondary = null,
        selected = false,
        controlAffinity = 'trailing', // 'leading', 'trailing', 'platform'
        autofocus = false,
        shape = null,
        selectedTileColor = null,
        tileColor = null,
        visualDensity = null,
        focusNode = null,
        enableFeedback = null,
        contentPadding = null
    } = {}) {
        super(key);
        this.value = value;
        this.groupValue = groupValue;
        this.onChanged = onChanged;
        this.toggleable = toggleable;
        this.activeColor = activeColor;
        this.title = title;
        this.subtitle = subtitle;
        this.isThreeLine = isThreeLine;
        this.dense = dense;
        this.secondary = secondary;
        this.selected = selected;
        this.controlAffinity = controlAffinity;
        this.autofocus = autofocus;
        this.shape = shape;
        this.selectedTileColor = selectedTileColor;
        this.tileColor = tileColor;
        this.visualDensity = visualDensity;
        this.focusNode = focusNode;
        this.enableFeedback = enableFeedback;
        this.contentPadding = contentPadding;
    }

    build(context) {
        const radio = new Radio({
            value: this.value,
            groupValue: this.groupValue,
            onChanged: this.onChanged,
            toggleable: this.toggleable,
            activeColor: this.activeColor,
            autofocus: this.autofocus
        });

        const isSelected = this.value === this.groupValue;
        const children = [];

        // Leading element
        if (this.controlAffinity === 'leading') {
            children.push(radio.build(context));
        } else if (this.secondary) {
            children.push(this.secondary);
        }

        // Title/Subtitle
        const textContent = [];
        if (this.title) {
            textContent.push(
                new VNode({
                    tag: 'div',
                    props: {
                        className: 'fjs-list-tile-title',
                        style: {
                            fontSize: '16px',
                            fontWeight: '400',
                            color: new Color('#000000de').toCSSString()
                        }
                    },
                    children: [this.title]
                })
            );
        }
        if (this.subtitle) {
            textContent.push(
                new VNode({
                    tag: 'div',
                    props: {
                        className: 'fjs-list-tile-subtitle',
                        style: {
                            fontSize: '14px',
                            color: new Color('#00000099').toCSSString(),
                            marginTop: '4px'
                        }
                    },
                    children: [this.subtitle]
                })
            );
        }

        children.push(
            new VNode({
                tag: 'div',
                props: {
                    className: 'fjs-list-tile-content',
                    style: {
                        flex: 1,
                        minWidth: 0
                    }
                },
                children: textContent
            })
        );

        // Trailing element
        if (this.controlAffinity === 'trailing') {
            children.push(radio.build(context));
        }

        // Handle content padding
        let paddingStr;
        if (this.contentPadding) {
            if (this.contentPadding instanceof EdgeInsets) {
                paddingStr = `${this.contentPadding.top}px ${this.contentPadding.right}px ${this.contentPadding.bottom}px ${this.contentPadding.left}px`;
            } else {
                paddingStr = `${this.contentPadding.top}px ${this.contentPadding.right}px ${this.contentPadding.bottom}px ${this.contentPadding.left}px`;
            }
        } else {
            paddingStr = '8px 16px';
        }

        const tileStyles = {
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: paddingStr,
            minHeight: this.dense ? '48px' : '56px',
            cursor: this.onChanged ? 'pointer' : 'default',
            backgroundColor: this.selected || isSelected
                ? (this.selectedTileColor ? new Color(this.selectedTileColor).toCSSString() : new Color('#e3f2fd').toCSSString())
                : (this.tileColor ? new Color(this.tileColor).toCSSString() : 'transparent'),
            transition: 'background-color 0.15s ease',
            borderRadius: this.shape?.borderRadius || '0px'
        };

        const events = {
            click: () => {
                if (this.onChanged) {
                    this.onChanged(this.value);
                }
            }
        };

        return new VNode({
            tag: 'div',
            props: {
                className: 'fjs-radio-list-tile',
                style: tileStyles,
                role: 'radio',
                'aria-checked': isSelected,
                'data-widget': 'RadioListTile'
            },
            children,
            events,
            key: this.key
        });
    }
}

export { RadioListTile };
