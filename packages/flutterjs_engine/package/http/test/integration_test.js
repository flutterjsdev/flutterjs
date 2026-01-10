
const { Client, get, post, put, delete: httpDelete, read, readBytes } = require('../src/index.js');
// Note: delete is exported as delete_ and aliased to delete, but requiring index.js usually gives strict exports
// We'll check what we actually exported in index.js. 
// "export { delete_ as delete };" -> commonjs might strict handle this differently depending on transpilation.
// Let's rely on 'get', 'post' for top level check.

async function testClientIntegration() {
    console.log('--- Testing Client Integration ---');
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

    const client = new Client();
    const baseUrl = 'https://jsonplaceholder.typicode.com';

    try {
        // 1. GET Request
        console.log('1. Testing GET...');
        const resGet = await client.get(`${baseUrl}/posts/1`);
        assert(resGet.statusCode === 200, 'GET status should be 200');
        assert(resGet.body.includes('userId'), 'GET body should verify content');

        // 2. POST Request
        console.log('2. Testing POST...');
        const resPost = await client.post(`${baseUrl}/posts`,
            { 'Content-type': 'application/json; charset=UTF-8' },
            JSON.stringify({ title: 'foo', body: 'bar', userId: 1 })
        );
        assert(resPost.statusCode === 201, 'POST status should be 201 (Created)');
        assert(resPost.body.includes('"id":'), 'POST response should contain new ID');

        // 3. PUT Request
        console.log('3. Testing PUT...');
        const resPut = await client.put(`${baseUrl}/posts/1`,
            { 'Content-type': 'application/json; charset=UTF-8' },
            JSON.stringify({ id: 1, title: 'updated', body: 'bar', userId: 1 })
        );
        assert(resPut.statusCode === 200, 'PUT status should be 200');
        assert(resPut.body.includes('"title": "updated"'), 'PUT body should show update');

        // 4. DELETE Request
        console.log('4. Testing DELETE...');
        const resDel = await client.delete(`${baseUrl}/posts/1`);
        assert(resDel.statusCode === 200, 'DELETE status should be 200/204'); // jsonplaceholder returns 200

        // 5. Error Handling (404)
        console.log('5. Testing 404...');
        const res404 = await client.get(`${baseUrl}/posts/999999`);
        assert(res404.statusCode === 404, 'Status should be 404 for missing resource');
        // Implementation note: Client uses validateStatus: true, so it returns response, not throw.
        // This matches Dart behavior where you get a Response object even for 404.

        // 6. Network Error (Invalid Domain)
        console.log('6. Testing Network Error...');
        try {
            await client.get('https://invalid-domain.example.com');
            assert(false, 'Should throw exception for network error');
        } catch (e) {
            assert(true, 'Correctly threw exception for network error: ' + e.message);
        }

        // 7. read (Top Level)
        console.log('7. Testing top-level read()...');
        const bodyStr = await read(`${baseUrl}/posts/1`);
        assert(typeof bodyStr === 'string' && bodyStr.length > 0, 'read() should return string body');

        // 8. readBytes (Top Level)
        console.log('8. Testing top-level readBytes()...');
        const bodyBytes = await readBytes(`${baseUrl}/posts/1`);
        assert(bodyBytes instanceof Uint8Array && bodyBytes.length > 0, 'readBytes() should return Uint8Array');

    } catch (e) {
        console.error('❌ Unexpected error in Integration tests:', e);
        failed++;
    }

    console.log(`Integration Tests: ${passed} passed, ${failed} failed`);
}

if (require.main === module) {
    testClientIntegration();
}

module.exports = { testClientIntegration };
