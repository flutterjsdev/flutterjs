
import { MultipartRequest } from '../src/multipart_request.js';
import { MultipartFile } from '../src/multipart_file.js';

function testMultipart() {
    console.log('--- Testing Multipart ---');
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
        const req = new MultipartRequest('POST', 'https://example.com/upload');

        // Test fields
        req.fields['user'] = 'jay';
        assert(req.fields['user'] === 'jay', 'Fields should be set correctly');

        // Test file addition
        const file = MultipartFile.fromString('file', 'file content', { filename: 'test.txt' });
        req.addFile(file);

        assert(req.files.length === 1, 'File should be added to request');
        assert(req.files[0].field === 'file', 'File field name check');
        assert(req.files[0].filename === 'test.txt', 'Filename check');
        assert(req.files[0].length === 12, 'File length check'); // 'file content' length

        // finalize check (basic)
        req.finalize();
        assert(req.finalized === true, 'MultipartRequest should be finalized');

    } catch (e) {
        console.error('❌ Unexpected error in Multipart tests:', e);
        failed++;
    }

    console.log(`Multipart Tests: ${passed} passed, ${failed} failed`);
}

testMultipart();
