
import { BaseClient } from './base_client.js';
import { Request } from './request.js';
import { StreamedResponse } from './streamed_response.js';
import { Response } from './response.js';
import { BaseRequest } from './base_request.js';
import axios from 'axios';

export class Client extends BaseClient {
    async send(request) {
        // Convert BaseRequest to axios config
        const url = request.url.toString();
        const headers = request.headers || {};
        let data = null;

        // Finalize the request to get the body stream
        // Note: In Dart, finalize() is often called by the client.
        // If request is already finalized, we assume it's valid to read, 
        // but BaseRequest throws if finalize() called twice.
        // We should check if it's finalized. If not, finalize it.
        let bodyStream;
        if (!request.finalized) {
            bodyStream = request.finalize();
        } else {
            // If already finalized, we can't easily get the stream again from BaseRequest 
            // without accessing private state or assuming usage pattern.
            // But usually Client.send() is what finalizes it.
            throw new Error('Request already finalized. Cannot send.');
        }

        // Consume stream to buffer for axios (browser/node compatibility)
        if (bodyStream) {
            data = await bodyStream.toBytes();
            // If empty, set to null? Axios handles empty buffer fine.
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
            const bodyStreamResponse = (async function* () {
                if (axiosResponse.data) {
                    yield new Uint8Array(axiosResponse.data);
                }
            })();

            return new StreamedResponse(bodyStreamResponse, axiosResponse.status, {
                headers: axiosResponse.headers,
                request: request,
                reasonPhrase: axiosResponse.statusText
            });

        } catch (error) {
            if (error.response) {
                throw error;
            } else if (error.request) {
                throw new Error(`Connection failed: ${error.message}`);
            } else {
                throw error;
            }
        }
    }

    async _sendUnstreamed(method, url, headers, body, encoding) {
        const req = new Request(method, url);
        if (headers) Object.assign(req.headers, headers);
        if (body) req.body = body;

        const streamedResponse = await this.send(req);
        return Response.fromStream(streamedResponse);
    }
}
