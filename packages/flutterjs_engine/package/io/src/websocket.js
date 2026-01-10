
// Minimal WebSocket wrapper for browser
export class WebSocket {
    constructor(url, protocols) {
        if (typeof globalThis.WebSocket === 'undefined') {
            throw new Error('WebSocket is not supported in this environment');
        }
        this._socket = new globalThis.WebSocket(url, protocols);
    }

    static connect(url, { protocols } = {}) {
        return Promise.resolve(new WebSocket(url, protocols));
    }

    // Dart API Shim
    get listeners() { return []; }
    // ... more shim methods would go here

    send(data) {
        this._socket.send(data);
    }

    close(code, reason) {
        this._socket.close(code, reason);
    }
}
