
import { ClientException } from './exception.js';

export class BaseClient {
    async head(url, headers) {
        return this._sendUnstreamed('HEAD', url, headers);
    }

    async get(url, headers) {
        return this._sendUnstreamed('GET', url, headers);
    }

    async post(url, headers, body, encoding) {
        return this._sendUnstreamed('POST', url, headers, body, encoding);
    }

    async put(url, headers, body, encoding) {
        return this._sendUnstreamed('PUT', url, headers, body, encoding);
    }

    async patch(url, headers, body, encoding) {
        return this._sendUnstreamed('PATCH', url, headers, body, encoding);
    }

    async delete(url, headers, body, encoding) {
        return this._sendUnstreamed('DELETE', url, headers, body, encoding);
    }

    async read(url, headers) {
        const response = await this.get(url, headers);
        this._checkResponseSuccess(url, response);
        return response.body;
    }

    async readBytes(url, headers) {
        const response = await this.get(url, headers);
        this._checkResponseSuccess(url, response);
        return response.bodyBytes;
    }

    async send(request) {
        throw new Error('BaseClient.send() must be implemented by subclasses.');
    }

    close() { }

    async _sendUnstreamed(method, url, headers, body, encoding) {
        // This is where we create a Request and send it
        // But typically this logic resides in standard Client
        // We'll leave it abstract or implement specific logic in Client
        throw new Error('BaseClient._sendUnstreamed not fully implemented in base. Use Client.');
    }

    _checkResponseSuccess(url, response) {
        if (response.statusCode < 400) return;
        throw new ClientException(`Request to ${url} failed with status ${response.statusCode}`, url);
    }
}
