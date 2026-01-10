
import { Client } from './client.js';

export * from './base_client.js';
export * from './client.js';
export * from './base_request.js';
export * from './request.js';
export * from './base_response.js';
export * from './response.js';
export * from './streamed_request.js';
export * from './streamed_response.js';
export * from './byte_stream.js';
export * from './multipart_file.js';
export * from './multipart_request.js';
export * from './exception.js';
export * from './abortable.js';

// Re-export http_parser types as Dart does
export { MediaType } from '@flutterjs/http_parser';

const _defaultClient = new Client();

export async function get(url, headers) {
    return _defaultClient.get(url, headers);
}

export async function post(url, headers, body, encoding) {
    return _defaultClient.post(url, headers, body, encoding);
}

export async function put(url, headers, body, encoding) {
    return _defaultClient.put(url, headers, body, encoding);
}

export async function patch(url, headers, body, encoding) {
    return _defaultClient.patch(url, headers, body, encoding);
}

export async function delete_(url, headers, body, encoding) { // delete is reserved in JS
    return _defaultClient.delete(url, headers, body, encoding);
}
// Export alias to avoid keyword collision if consuming from JS directly, 
// though Dart transpiler will likely map http.delete() to http.delete_() or similar.
export { delete_ as delete };

export async function head(url, headers) {
    return _defaultClient.head(url, headers);
}

export async function read(url, headers) {
    return _defaultClient.read(url, headers);
}

export async function readBytes(url, headers) {
    return _defaultClient.readBytes(url, headers);
}
