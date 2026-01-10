
import { MediaType } from '../src/media_type.js';

function testMediaType() {
    console.log('Testing MediaType...');

    try {
        const type = MediaType.parse('application/json; charset=utf-8');
        if (type.type !== 'application') throw new Error('Failed type check');
        if (type.subtype !== 'json') throw new Error('Failed subtype check');
        if (type.parameters['charset'] !== 'utf-8') throw new Error('Failed param check');
        console.log('✅ MediaType.parse passed');

        if (type.toString() !== 'application/json; charset=utf-8') throw new Error('Failed toString check');
        console.log('✅ MediaType.toString passed');

    } catch (e) {
        console.error('❌ MediaType failed:', e);
    }
}

testMediaType();
