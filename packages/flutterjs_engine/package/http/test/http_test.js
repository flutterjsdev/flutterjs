
const http = require('../src/index.js'); // Assuming Babel/transpiler handles ES modules or we run in node with ESM
// Since we are writing raw JS files that use 'import/export', we need to run with a tool that supports it or ensure package.json "type": "module"

async function testHttp() {
    console.log('Testing @flutterjs/http...');

    try {
        console.log('GET https://jsonplaceholder.typicode.com/posts/1');
        const response = await http.get('https://jsonplaceholder.typicode.com/posts/1');

        console.log(`Status: ${response.statusCode}`);
        if (response.statusCode === 200) {
            console.log('✅ GET request success');
            const body = response.body;
            console.log('Body length:', body.length);
            if (body.includes('userId')) {
                console.log('✅ Body content verified');
            } else {
                console.error('❌ Body content missing expected data');
            }
        } else {
            console.error(`❌ Request failed with status ${response.statusCode}`);
        }

        console.log('\nTesting readBytes...');
        const bytes = await http.readBytes('https://jsonplaceholder.typicode.com/posts/1');
        if (bytes instanceof Uint8Array && bytes.length > 0) {
            console.log('✅ readBytes success, got Uint8Array');
        } else {
            console.error('❌ readBytes failed');
        }

    } catch (e) {
        console.error('❌ Test failed with error:', e);
    }
}

// Check if we can run this directly (if dependencies installed)
if (require.main === module) {
    testHttp();
}

module.exports = { testHttp };
