// dart:developer implementation

export function log(message, { time, sequenceNumber, level = 0, name = '', zone, error, stackTrace } = {}) {
    const timestamp = time ? new Date(time).toLocaleTimeString() : new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] ${name ? name + ': ' : ''}`;

    if (error) {
        console.error(prefix + message, error);
        if (stackTrace) console.error(stackTrace);
    } else {
        console.log(prefix + message);
    }
}

export function inspect(object) {
    console.dir(object);
    return object;
}

export function debugger_({ message, when = true } = {}) {
    if (when) {
        if (message) console.log(`Debugger triggered: ${message}`);
        // eslint-disable-next-line
        debugger;
        return true;
    }
    return false;
}

export class Timeline {
    static startSync(name, { arguments: args } = {}) {
        // Use User Timing API
        if (typeof performance !== 'undefined') {
            performance.mark(name);
        }
    }

    static finishSync() {
        // Ideally we'd match the last mark, but JS performance API is event based.
        // This is a loose approximation.
    }
}
