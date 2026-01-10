
import { Response } from '../src/response.js';

function testResponse() {
    console.log('--- Testing Response ---');
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
        const bodyStr = 'Response Content';
        const res = new Response(bodyStr, 200, {
            headers: { 'content-type': 'text/plain' },
            reasonPhrase: 'OK'
        });

        assert(res.statusCode === 200, 'Status code should be 200');
        assert(res.reasonPhrase === 'OK', 'Reason phrase should be OK');
        assert(res.body === bodyStr, 'Body should match input string');
        assert(res.bodyBytes.length === bodyStr.length, 'BodyBytes length should match');
        assert(res.headers['content-type'] === 'text/plain', 'Headers should be preserved');

        // Test binary body construction
        const bytes = new Uint8Array([1, 2, 3]);
        const resBin = new Response(bytes, 404);
        assert(resBin.statusCode === 404, 'Status code should be 404');
        assert(resBin.bodyBytes.length === 3, 'Binary body length should be 3');
        assert(resBin.contentLength === 3, 'ContentLength should be automatically set');

    } catch (e) {
        console.error('❌ Unexpected error in Response tests:', e);
        failed++;
    }

    console.log(`Response Tests: ${passed} passed, ${failed} failed`);
}

testResponse();
