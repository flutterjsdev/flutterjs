
import { BaseRequest } from './base_request.js';
import { ByteStream } from './byte_stream.js';

export class StreamedRequest extends BaseRequest {
    constructor(method, url) {
        super(method, url);
        this._chunks = [];
        this._streamController = {
            // Simple controller shim
            add: (chunk) => {
                if (typeof chunk === 'string') {
                    this._chunks.push(new TextEncoder().encode(chunk));
                } else {
                    this._chunks.push(chunk);
                }
            },
            close: () => {
                // No-op for buffer collection, mainly denotes end
            }
        };
    }

    get sink() {
        return this._streamController;
    }

    finalize() {
        super.finalize();
        // Combine chunks into a single stream
        // We create an async iterator from the chunks
        const chunks = this._chunks;
        const stream = (async function* () {
            for (const chunk of chunks) {
                yield chunk;
            }
        })();
        return new ByteStream(stream);
    }
}
