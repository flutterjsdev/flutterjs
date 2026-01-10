
import { Request } from '../src/request.js';

function testRequest() {
    console.log('--- Testing Request ---');
    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`✅ ${message}`);
            passed++;
        } else {
            console.error(`❌ ${message}`);
            failed++;
        }
    }

    try {
        const req = new Request('GET', 'https://example.com');
        assert(req.method === 'GET', 'Method should be GET');
        assert(req.url.toString() === 'https://example.com/', 'URL should handle string input');

        req.body = 'Hello World';
        assert(req.body === 'Hello World', 'Body getter should return set string');
        assert(req.bodyBytes.length === 11, 'BodyBytes should be updated');
        assert(req.contentLength === 11, 'ContentLength should be updated');

        // Test encoding
        req.bodyBytes = new Uint8Array([72, 101, 108, 108, 111]); // Hello
        assert(req.body === 'Hello', 'Body getter should decode bytes');

        // Test bodyFields
        req.bodyFields = { 'key': 'value', 'foo': 'bar' };
        // key=value&foo=bar -> URLSearchParams
        assert(req.body.includes('key=value'), 'BodyFields should encode to url encoded string');
        assert(req.headers['content-type'] === 'application/x-www-form-urlencoded', 'Should set content-type header for bodyFields');

        // Test finalize
        req.finalize();
        assert(req.finalized === true, 'Request should be finalized');
        try {
            req.body = 'Change';
            assert(false, 'Should invoke error when modifying body after finalize');
        } catch (e) {
            assert(true, 'Correctly threw error when modifying body after finalize');
        }

    } catch (e) {
        console.error('❌ Unexpected error in Request tests:', e);
        failed++;
    }

    console.log(`Request Tests: ${passed} passed, ${failed} failed`);
}

// Run directly
testRequest();
