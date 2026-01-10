
export class SocketException extends Error {
    constructor(message, { osError = null, address = null, port = null } = {}) {
        super(message);
        this.message = message;
        this.osError = osError;
        this.address = address;
        this.port = port;
    }
    toString() {
        return `SocketException: ${this.message}${this.osError ? ` (${this.osError})` : ''}${this.address ? `, address = ${this.address}` : ''}${this.port ? `, port = ${this.port}` : ''}`;
    }
}
