
/**
 * A mixin that can be used to abort an operation.
 * 
 * In the JavaScript implementation, this wraps AbortController.
 */
export class Abortable {
    constructor() {
        this._controller = new AbortController();
    }

    /**
     * Aborts the operation.
     */
    abort() {
        this._controller.abort();
    }

    /**
     * Returns the AbortSignal associated with this abortable.
     * Internal use for passing to fetch/axios.
     */
    get signal() {
        return this._controller.signal;
    }
}
