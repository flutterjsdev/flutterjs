
export class BaseResponse {
    constructor(statusCode, {
        contentLength = null,
        request = null,
        headers = {},
        isRedirect = false,
        persistentConnection = true,
        reasonPhrase = null
    } = {}) {
        this.statusCode = statusCode;
        this.contentLength = contentLength;
        this.request = request;
        this.headers = headers;
        this.isRedirect = isRedirect;
        this.persistentConnection = persistentConnection;
        this.reasonPhrase = reasonPhrase;
    }
}
