
import { CaseInsensitiveMap } from '../src/case_insensitive_map.js';

function testCaseInsensitiveMap() {
    console.log('--- Testing CaseInsensitiveMap ---');
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
        const map = new CaseInsensitiveMap();

        // 1. Basic Set/Get
        map.set('Content-Type', 'application/json');
        assert(map.get('content-type') === 'application/json', 'Should retrieve lower case key');
        assert(map.get('CONTENT-TYPE') === 'application/json', 'Should retrieve upper case key');
        assert(map.has('content-type'), 'Should have lower case key');

        // 2. Overwrite
        map.set('content-type', 'text/plain');
        assert(map.get('Content-Type') === 'text/plain', 'Should overwrite value case-insensitively');
        // Check size - should be 1, not 2
        assert(map.size === 1, 'Size should remain 1 after overwrite');

        // 3. Constructor with object
        const map2 = new CaseInsensitiveMap({ 'Header-One': '1', 'HEADER-TWO': '2' });
        assert(map2.get('header-one') === '1', 'Constructor object parsing 1');
        assert(map2.get('header-two') === '2', 'Constructor object parsing 2');

        // 4. Constructor with Map
        const sourceMap = new Map();
        sourceMap.set('Key', 'Val');
        const map3 = new CaseInsensitiveMap(sourceMap);
        assert(map3.get('key') === 'Val', 'Constructor Map parsing');

        // 5. Delete
        map2.delete('header-one');
        assert(!map2.has('Header-One'), 'Delete should work case-insensitively');
        assert(map2.size === 1, 'Size should decrease after delete');

    } catch (e) {
        console.error('❌ Unexpected error:', e);
        failed++;
    }

    console.log(`CaseInsensitiveMap Tests: ${passed} passed, ${failed} failed`);
}

testCaseInsensitiveMap();
