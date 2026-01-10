
import { BaseClient } from './base_client.js';
import { Request } from './request.js';
import { StreamedResponse } from './streamed_response.js';
import { Response } from './response.js';
import axios from 'axios';

export class Client extends BaseClient {
    async send(request) {
        // Convert BaseRequest to axios config
        const url = request.url.toString();
        const headers = request.headers || {};
        let data = null;

        if (request instanceof Request) {
            data = request.bodyBytes; // Use bytes
        } else if (typeof request.bodyBytes !== 'undefined') {
            data = request.bodyBytes;
        }

        try {
            const axiosResponse = await axios({
                method: request.method,
                url: url,
                headers: headers,
                data: data,
                responseType: 'arraybuffer', // Important: get raw bytes
                validateStatus: () => true // Don't throw on error status
            });

            // Convert axios response to StreamedResponse
            // Note: axios 'arraybuffer' gives us the full body, not a stream directly unless configured
            // For true streaming we'd need responseType: 'stream' in Node, but that differs in browser.
            // For MVP we wrap the buffer in a stream.

            // Create a simple async generator for the body
            const bodyStream = (async function* () {
                if (axiosResponse.data) {
                    yield new Uint8Array(axiosResponse.data);
                }
            })();

            return new StreamedResponse(bodyStream, axiosResponse.status, {
                headers: axiosResponse.headers,
                request: request,
                reasonPhrase: axiosResponse.statusText
            });

        } catch (error) {
            // Handle network errors
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx (handled by validateStatus though?)
                // Should encounter this rarely with validateStatus: true
                throw error;
            } else if (error.request) {
                // The request was made but no response was received
                throw new Error(`Connection failed: ${error.message}`);
            } else {
                throw error;
            }
        }
    }

    // Override _sendUnstreamed to use efficient non-streaming path if desired,
    // or just rely on send() + Response.fromStream()
    async _sendUnstreamed(method, url, headers, body, encoding) {
        const req = new Request(method, url);
        if (headers) Object.assign(req.headers, headers);
        if (body) req.body = body; // handling string body

        const streamedResponse = await this.send(req);
        return Response.fromStream(streamedResponse);
    }
}
