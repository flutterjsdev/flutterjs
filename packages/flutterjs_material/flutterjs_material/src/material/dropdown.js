import { StatefulWidget, StatelessWidget, State } from '../core/widget_element.js';
import { Theme } from './theme.js';
import { Container } from './container.js';
import { Row } from '../widgets/widgets.js';
import { Text } from './text.js';
import { Icon, Icons } from './icon.js';
import { GestureDetector } from './gesture_detector.js';
import { MainAxisAlignment } from '../utils/utils.js';
import { EdgeInsets } from '../utils/edge_insets.js';

export class DropdownMenuItem extends StatelessWidget {
    constructor({
        key,
        onTap,
        value,
        enabled = true,
        alignment,
        child,
    } = {}) {
        super(key);
        this.onTap = onTap;
        this.value = value;
        this.enabled = enabled;
        this.alignment = alignment;
        this.child = child;
    }

    build(context) {
        return new Container({
            padding: EdgeInsets.symmetric({ vertical: 8.0, horizontal: 16.0 }),
            child: this.child
        });
    }
}

export class DropdownButton extends StatefulWidget {
    constructor({
        key,
        items = [],
        selectedItemBuilder,
        value,
        hint,
        disabledHint,
        onChanged,
        onTap,
        elevation = 8,
        style,
        underline,
        icon,
        iconDisabledColor,
        iconEnabledColor,
        iconSize = 24.0,
        isDense = false,
        isExpanded = false,
        itemHeight = 48.0,
        focusColor,
        focusNode,
        autofocus = false,
        dropdownColor,
        menuMaxHeight,
        enableFeedback,
        alignment,
        borderRadius,
    } = {}) {
        super(key);
        this.items = items;
        this.selectedItemBuilder = selectedItemBuilder;
        this.value = value;
        this.hint = hint;
        this.disabledHint = disabledHint;
        this.onChanged = onChanged;
        this.onTap = onTap;
        this.elevation = elevation;
        this.style = style;
        this.underline = underline;
        this.icon = icon;
        this.iconDisabledColor = iconDisabledColor;
        this.iconEnabledColor = iconEnabledColor;
        this.iconSize = iconSize;
        this.isDense = isDense;
        this.isExpanded = isExpanded;
        this.itemHeight = itemHeight;
        this.dropdownColor = dropdownColor;
        this.menuMaxHeight = menuMaxHeight;
        this.enableFeedback = enableFeedback;
        this.alignment = alignment;
        this.borderRadius = borderRadius;
    }

    createState() {
        return new DropdownButtonState();
    }
}

class DropdownButtonState extends State {
    constructor() {
        super();
        this.isOpen = false;
    }

    _toggleDropdown() {
        if (!this.widget.onChanged) return; // Disabled

        // This is a naive implementation.
        // In real Flutter, this opens a generic Menu connected to Navigator/Overlay.
        // Here we might just implement a simple inline toggle or use HTML select for native behavior (not material compliant physically but accessible)
        // OR we try to simulate a popup.

        // Simulating Inline Toggle mainly for now as Overlay isn't fully robust in this context yet.

        this.setState(() => {
            this.isOpen = !this.isOpen;
        });

        // In reality, this should call a `showMenu` equivalent.
    }

    _handleSelection(itemValue) {
        this.setState(() => {
            this.isOpen = false;
        });
        if (this.widget.onChanged) {
            this.widget.onChanged(itemValue);
        }
    }

    build(context) {
        // Find selected item
        const selectedItem = this.widget.items?.find(item => item.value === this.widget.value);

        const displayChild = selectedItem ? selectedItem.child : (this.widget.hint || new Text('Select'));

        const trigger = new GestureDetector({
            onTap: () => this._toggleDropdown(),
            child: new Container({
                padding: EdgeInsets.all(8.0),
                decoration: {
                    border: '1px solid #ccc', // Temporary visual
                    borderRadius: '4px'
                },
                child: new Row({
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                        displayChild,
                        this.widget.icon || new Icon(Icons.arrowDropDown)
                    ]
                })
            })
        });

        if (!this.isOpen) {
            return trigger;
        }

        // Render Open State (Naive list below)
        // Ideally this is in an Overlay.

        const menuItems = this.widget.items.map(item => {
            return new GestureDetector({
                onTap: () => this._handleSelection(item.value),
                child: new Container({
                    padding: EdgeInsets.all(12.0),
                    color: this.widget.dropdownColor || Theme.of(context).cardColor || 'white',
                    child: item.child
                })
            });
        });

        // Simulating a dropdown list appearing "somewhere" (here just below linearly)
        // This is strictly a fallback implementation.

        return new Container({
            child: new Column({
                crossAxisAlignment: 'stretch',
                children: [
                    trigger,
                    new Container({
                        color: 'white',
                        style: {
                            position: 'absolute',
                            zIndex: 1000,
                            // Box shadow
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                            maxHeight: this.widget.menuMaxHeight || 200,
                            overflowY: 'auto'
                        },
                        child: new Column({
                            crossAxisAlignment: 'stretch',
                            children: menuItems
                        })
                    })
                ]
            })
        });
    }
}

export class DropdownButtonHideUnderline extends StatelessWidget {
    constructor({ key, child } = {}) {
        super(key);
        this.child = child;
    }

    build(context) {
        // In real flutter this uses a Theme or InheritedWidget to suppress the underline.
        // We can check this in DropdownButton if we implemented the inheritance.
        // For now, it just passes through.
        return this.child;
    }
}
