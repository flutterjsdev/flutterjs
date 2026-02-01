import { Queue } from "./index.js";

export class QueueList extends Queue {
    constructor(initialCapacityOrList) {
        super();
        if (Array.isArray(initialCapacityOrList)) {
            this._list = [...initialCapacityOrList];
        } else {
            this._list = [];
        }
    }

    add(element) {
        this._list.push(element);
    }

    addAll(iterable) {
        for (const element of iterable) {
            this._list.push(element);
        }
    }

    get length() {
        return this._list.length;
    }

    set length(value) {
        this._list.length = value;
    }

    operator_get(index) {
        return this._list[index];
    }

    operator_set(index, value) {
        this._list[index] = value;
    }

    // Dart List methods
    indexOf(element, start) {
        return this._list.indexOf(element, start);
    }
}
