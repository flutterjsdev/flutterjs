import { SizedBox } from './sized_box.js';
import { Expanded } from './multi_child_view.js';

export class Spacer extends Expanded {
    constructor({ key, flex = 1 } = {}) {
        super({
            key,
            flex,
            child: SizedBox.shrink()
        });
    }
}
