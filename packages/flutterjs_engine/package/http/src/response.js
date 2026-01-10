
import { BaseResponse } from './base_response.js';

export class Response extends BaseResponse {
    constructor(body, statusCode, {
        headers = {},
        request = null,
        contentLength = null,
        persistentConnection = true,
        reasonPhrase = null,
        isRedirect = false
    } = {}) {
        // Handle body: can be string or bytes (Uint8Array)
        let bodyBytes;
        if (typeof body === 'string') {
            bodyBytes = new TextEncoder().encode(body);
        } else {
            bodyBytes = body;
        }

        super(statusCode, {
            contentLength: contentLength ?? bodyBytes.length,
            request,
            headers,
            isRedirect,
            persistentConnection,
            reasonPhrase
        });

        this.bodyBytes = bodyBytes;
    }

    get body() {
        return new TextDecoder().decode(this.bodyBytes);
    }

    // Static helper to create from stream (shim for now)
    static async fromStream(streamedResponse) {
        const chunks = [];
        // Assume streamedResponse.stream is async iterable or shim
        for await (const chunk of streamedResponse.stream) {
            chunks.push(chunk);
        }
        // Concat chunks
        const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }

        return new Response(result, streamedResponse.statusCode, {
            headers: streamedResponse.headers,
            request: streamedResponse.request,
            isRedirect: streamedResponse.isRedirect,
            persistentConnection: streamedResponse.persistentConnection,
            reasonPhrase: streamedResponse.reasonPhrase
        });
    }
}
