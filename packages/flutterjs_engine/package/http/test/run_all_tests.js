
const { testRequest } = require('./request_test.js');
const { testResponse } = require('./response_test.js');
const { testMultipart } = require('./multipart_test.js');
const { testClientIntegration } = require('./integration_test.js');

async function runAllTests() {
    console.log('==========================================');
    console.log('  RUNNING ALL HTTP PACKAGE TESTS');
    console.log('==========================================\n');

    try {
        testRequest();
        console.log('\n------------------------------------------\n');

        testResponse();
        console.log('\n------------------------------------------\n');

        testMultipart();
        console.log('\n------------------------------------------\n');

        await testClientIntegration();

    } catch (e) {
        console.error('Testing Suite Failed:', e);
    }

    console.log('\n==========================================');
    console.log('  TEST SUITE COMPLETED');
    console.log('==========================================');
}

runAllTests();
