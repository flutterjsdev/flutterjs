
import { BaseResponse } from './base_response.js';
import { ByteStream } from './byte_stream.js';

export class StreamedResponse extends BaseResponse {
    constructor(stream, statusCode, {
        contentLength = null,
        request = null,
        headers = {},
        isRedirect = false,
        persistentConnection = true,
        reasonPhrase = null
    } = {}) {
        super(statusCode, {
            contentLength,
            request,
            headers,
            isRedirect,
            persistentConnection,
            reasonPhrase
        });
        this.stream = stream instanceof ByteStream ? stream : new ByteStream(stream);
    }
}
