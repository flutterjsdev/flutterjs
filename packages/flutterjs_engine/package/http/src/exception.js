
export class ClientException extends Error {
    constructor(message, uri = null) {
        super(message);
        this.message = message;
        this.uri = uri;
    }
    toString() {
        return `ClientException: ${this.message}${this.uri ? `, uri=${this.uri}` : ''}`;
    }
}
