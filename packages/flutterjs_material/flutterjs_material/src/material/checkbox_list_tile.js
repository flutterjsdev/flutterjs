import { StatelessWidget } from '../core/widget_element.js';
import { VNode } from '@flutterjs/vdom/vnode';
import { Checkbox } from './checkbox.js';
import { ListTile } from './list_tile.js';
import { EdgeInsets } from '../utils/edge_insets.js';
import { Color } from '../utils/color.js';

/**
 * CheckboxListTile - A ListTile with a Checkbox
 */
class CheckboxListTile extends StatelessWidget {
    constructor({
        key = null,
        value = false,
        onChanged = null,
        activeColor = null,
        checkColor = null,
        title = null,
        subtitle = null,
        isThreeLine = false,
        dense = false,
        secondary = null,
        selected = false,
        controlAffinity = 'trailing', // 'leading', 'trailing', 'platform'
        autofocus = false,
        tristate = false,
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
        this.onChanged = onChanged;
        this.activeColor = activeColor;
        this.checkColor = checkColor;
        this.title = title;
        this.subtitle = subtitle;
        this.isThreeLine = isThreeLine;
        this.dense = dense;
        this.secondary = secondary;
        this.selected = selected;
        this.controlAffinity = controlAffinity;
        this.autofocus = autofocus;
        this.tristate = tristate;
        this.shape = shape;
        this.selectedTileColor = selectedTileColor;
        this.tileColor = tileColor;
        this.visualDensity = visualDensity;
        this.focusNode = focusNode;
        this.enableFeedback = enableFeedback;
        this.contentPadding = contentPadding;
    }

    build(context) {
        const checkbox = new Checkbox({
            value: this.value,
            onChanged: this.onChanged,
            activeColor: this.activeColor,
            checkColor: this.checkColor,
            tristate: this.tristate,
            autofocus: this.autofocus
        });

        let leading, trailing;
        if (this.controlAffinity === 'leading') {
            leading = checkbox;
            trailing = this.secondary;
        } else {
            leading = this.secondary;
            trailing = checkbox;
        }

        return new ListTile({
            leading,
            title: this.title,
            subtitle: this.subtitle,
            trailing,
            isThreeLine: this.isThreeLine,
            dense: this.dense,
            enabled: this.onChanged != null,
            onTap: this.onChanged ? () => this.onChanged(!this.value) : null,
            selected: this.selected,
            autofocus: this.autofocus,
            contentPadding: this.contentPadding,
            shape: this.shape,
            selectedTileColor: this.selectedTileColor,
            tileColor: this.tileColor,
            visualDensity: this.visualDensity,
            focusNode: this.focusNode,
            enableFeedback: this.enableFeedback
        });
    }
}

export { CheckboxListTile };
