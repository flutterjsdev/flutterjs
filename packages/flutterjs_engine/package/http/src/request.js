
import { BaseRequest } from './base_request.js';

export class Request extends BaseRequest {
    constructor(method, url) {
        super(method, url);
        this._bodyBytes = new Uint8Array(0);
        this.encoding = 'utf-8';
    }

    get bodyBytes() {
        return this._bodyBytes;
    }

    set bodyBytes(value) {
        if (this.finalized) throw new Error('Request finalized');
        this._bodyBytes = value;
        this.contentLength = value.length;
    }

    get body() {
        return new TextDecoder(this.encoding).decode(this._bodyBytes);
    }

    set body(value) {
        if (this.finalized) throw new Error('Request finalized');
        const encoder = new TextEncoder(); // default utf-8
        this.bodyBytes = encoder.encode(value);
    }

    set bodyFields(fields) {
        // Encode as form-urlencoded
        const params = new URLSearchParams(fields);
        this.body = params.toString();
        this.headers['content-type'] = 'application/x-www-form-urlencoded';
    }
}
