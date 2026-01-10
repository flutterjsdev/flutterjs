
export class BaseRequest {
    constructor(method, url) {
        this.method = method;
        this.url = typeof url === 'string' ? new URL(url) : url;
        this.headers = {};
        this.contentLength = null;
        this.persistentConnection = true;
        this.followRedirects = true;
        this.maxRedirects = 5;
        this._finalized = false;
    }

    get finalized() {
        return this._finalized;
    }

    finalize() {
        if (this._finalized) {
            throw new Error('Request already finalized');
        }
        this._finalized = true;
        // In Dart this returns a ByteStream, but for simplicity we return 'this' or handle it in Client
        // We will stick to the plan: Client.send() takes BaseRequest.
        return this;
    }

    send() {
        // In Dart, BaseRequest.send() calls Client.send(this)
        // Since we don't have a global client instance here easily without circular dep,
        // we might need to inject it or assume user calls client.send(request)
        throw new Error('BaseRequest.send() not implemented yet. Use Client.send(request).');
    }
}
