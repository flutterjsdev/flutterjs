import { StatelessWidget } from '../core/widget_element.js';
import { Radio } from './radio.js';
import { ListTile } from './list_tile.js';

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
        let leading, trailing;

        if (this.controlAffinity === 'leading') {
            leading = radio;
            trailing = this.secondary;
        } else {
            leading = this.secondary;
            trailing = radio;
        }

        return new ListTile({
            leading,
            title: this.title,
            subtitle: this.subtitle,
            trailing,
            isThreeLine: this.isThreeLine,
            dense: this.dense,
            enabled: this.onChanged != null,
            onTap: this.onChanged ? () => this.onChanged(this.value) : null,
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

export { RadioListTile };
