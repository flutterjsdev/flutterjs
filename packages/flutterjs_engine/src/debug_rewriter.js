
import ImportRewriter from './import_rewriter.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
    console.log('--- Debugging ImportRewriter ---');

    const rewriter = new ImportRewriter({
        debugMode: true,
        baseDir: '/node_modules',
        projectRoot: 'C:\\Jay\\_Plugin\\flutterjs\\examples\\flutterjs_website'
    });

    const httpParserPath = 'C:\\Jay\\_Plugin\\flutterjs\\examples\\flutterjs_website\\build\\flutterjs\\node_modules\\http_parser';

    const resolution = new Map();
    resolution.set('http_parser', httpParserPath);

    console.log(`Manually adding http_parser -> ${httpParserPath}`);

    try {
        const result = await rewriter.analyzeImportsWithResolution('import "package:http_parser/http_parser.js";', resolution);

        const importMap = result.getImportMapObject();

        const output = {
            errors: result.errors,
            warnings: result.warnings,
            importMap: importMap,
            success: importMap.imports && !!importMap.imports['http_parser']
        };

        fs.writeFileSync('debug_result.json', JSON.stringify(output, null, 2));
        console.log('Written output to debug_result.json');

    } catch (e) {
        console.error('Crash:', e);
        fs.writeFileSync('debug_result.json', JSON.stringify({ error: e.message, stack: e.stack }, null, 2));
    }
}

run();
