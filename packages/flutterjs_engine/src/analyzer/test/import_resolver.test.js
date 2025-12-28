/**
 * COMPREHENSIVE TEST SUITE FOR IMPORT RESOLVER
 * Tests both single-line and multi-line import handling
 */

import { ImportResolver } from '../src/flutter_import_resolver.js';

// ============================================================================
// TEST DATA
// ============================================================================

const singleLineImport = `
import { runApp } from '@flutterjs/runtime';
`;

const multiLineImportLarge = `
import {
  // Core Framework
  Widget,
  State,
  StatefulWidget,
  StatelessWidget,
  BuildContext,
  Key,
  MaterialApp,
  Scaffold,
  AppBar,
  Text,
  Container,
  Card,
  Column,
  Row,
  Icon,
  Padding,
  Divider,
  FloatingActionButton,
  Icons,
} from '@flutterjs/material';
`;

const multiLineImportWithComments = `
import {
  /* Block comment */
  Widget, // inline comment
  State,
  /* Another block
     spanning lines */
  StatefulWidget,
} from '@flutterjs/runtime';
`;

const mixedImports = `
import { runApp } from '@flutterjs/runtime';
import {
  MaterialApp,
  Scaffold,
  AppBar,
} from '@flutterjs/material';
import defaultExport from '@flutterjs/foundation';
import * as utils from './utils.js';
`;

// ============================================================================
// TEST RUNNER
// ============================================================================

class ImportResolverTester {
  constructor() {
    this.resolver = new ImportResolver({
      projectRoot: process.cwd(),
      ignoreUnresolved: true,
    });
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  // Test: Single-line import
  testSingleLineImport() {
    console.log('\n' + '='.repeat(80));
    console.log('TEST 1: Single-Line Import');
    console.log('='.repeat(80));

    const imports = this.resolver.parseImportsFromSource(singleLineImport);

    console.log('Input:');
    console.log(singleLineImport);
    console.log('\nParsed Result:');
    console.log(JSON.stringify(imports, null, 2));

    const pass = imports.length === 1 && 
                 imports[0].source === '@flutterjs/runtime' &&
                 imports[0].items.includes('runApp');

    this.logResult('Single-Line Import', pass, imports);
    return pass;
  }

  // Test: Multi-line import (large)
  testMultiLineImportLarge() {
    console.log('\n' + '='.repeat(80));
    console.log('TEST 2: Multi-Line Import (Large)');
    console.log('='.repeat(80));

    const imports = this.resolver.parseImportsFromSource(multiLineImportLarge);

    console.log('Input:');
    console.log(multiLineImportLarge);
    console.log('\nParsed Result:');
    console.log(JSON.stringify(imports, null, 2));

    const expectedItems = [
      'Widget', 'State', 'StatefulWidget', 'StatelessWidget',
      'BuildContext', 'Key', 'MaterialApp', 'Scaffold', 'AppBar',
      'Text', 'Container', 'Card', 'Column', 'Row', 'Icon',
      'Padding', 'Divider', 'FloatingActionButton', 'Icons'
    ];

    const pass = imports.length === 1 &&
                 imports[0].source === '@flutterjs/material' &&
                 expectedItems.every(item => imports[0].items.includes(item));

    console.log('\nExpected Items:');
    console.log(expectedItems.join(', '));
    console.log('\nActual Items:');
    if (imports[0]) {
      console.log(imports[0].items.join(', '));
      console.log(`\nMissing Items: ${expectedItems.filter(i => !imports[0].items.includes(i)).join(', ')}`);
    }

    this.logResult('Multi-Line Import (Large)', pass, imports);
    return pass;
  }

  // Test: Multi-line with comments
  testMultiLineWithComments() {
    console.log('\n' + '='.repeat(80));
    console.log('TEST 3: Multi-Line Import with Comments');
    console.log('='.repeat(80));

    const imports = this.resolver.parseImportsFromSource(multiLineImportWithComments);

    console.log('Input:');
    console.log(multiLineImportWithComments);
    console.log('\nParsed Result:');
    console.log(JSON.stringify(imports, null, 2));

    const expectedItems = ['Widget', 'State', 'StatefulWidget'];

    const pass = imports.length === 1 &&
                 imports[0].source === '@flutterjs/runtime' &&
                 expectedItems.every(item => imports[0].items.includes(item));

    console.log('\nExpected Items:');
    console.log(expectedItems.join(', '));
    console.log('\nActual Items:');
    if (imports[0]) {
      console.log(imports[0].items.join(', '));
    }

    this.logResult('Multi-Line with Comments', pass, imports);
    return pass;
  }

  // Test: Mixed import styles
  testMixedImports() {
    console.log('\n' + '='.repeat(80));
    console.log('TEST 4: Mixed Import Styles');
    console.log('='.repeat(80));

    const imports = this.resolver.parseImportsFromSource(mixedImports);

    console.log('Input:');
    console.log(mixedImports);
    console.log('\nParsed Result:');
    console.log(JSON.stringify(imports, null, 2));

    const pass = imports.length === 4 &&
                 imports[0].items.includes('runApp') &&
                 imports[1].items.includes('MaterialApp') &&
                 imports[2].items.includes('defaultExport') &&
                 imports[3].items.includes('utils');

    console.log('\nExpected:');
    console.log('  - Import 1: runApp');
    console.log('  - Import 2: MaterialApp, Scaffold, AppBar');
    console.log('  - Import 3: defaultExport');
    console.log('  - Import 4: utils');
    console.log('\nActual:');
    imports.forEach((imp, idx) => {
      console.log(`  - Import ${idx + 1}: ${imp.items.join(', ')}`);
    });

    this.logResult('Mixed Import Styles', pass, imports);
    return pass;
  }

  // Test: Regex pattern matching
  testRegexPattern() {
    console.log('\n' + '='.repeat(80));
    console.log('TEST 5: Regex Pattern Analysis');
    console.log('='.repeat(80));

    const importRegex = /import\s+([\s\S]*?)\s+from\s+['"`]([^'"`]+)['"`]/g;
    
    console.log('Testing regex against multi-line import:');
    // console.log('Pattern: /import\\s+([\\s\\S]*?)\\s+from\\s+[\\'"`]([^\\'"`]+)[\\'"`]/g');
    console.log('\nInput:');
    console.log(multiLineImportLarge);

    let match;
    let count = 0;
    const matches = [];

    while ((match = importRegex.exec(multiLineImportLarge)) !== null) {
      count++;
      matches.push({
        fullMatch: match[0].substring(0, 100) + '...',
        importClause: match[1].substring(0, 100) + '...',
        modulePath: match[2],
      });
    }

    console.log(`\nMatches found: ${count}`);
    console.log(JSON.stringify(matches, null, 2));

    const pass = count === 1;
    this.logResult('Regex Pattern Matching', pass, { count });
    return pass;
  }

  // Test: Parse import clause
  testParseImportClause() {
    console.log('\n' + '='.repeat(80));
    console.log('TEST 6: Parse Import Clause');
    console.log('='.repeat(80));

    const clause = `
  // Core Framework
  Widget,
  State,
  StatefulWidget,
  StatelessWidget,
  BuildContext,
  Key,
  MaterialApp,
`;

    console.log('Input clause:');
    console.log(clause);

    const result = this.resolver.parseImportClause(clause, '@flutterjs/material');

    console.log('\nParsed Result:');
    console.log(JSON.stringify(result, null, 2));

    const expectedItems = ['Widget', 'State', 'StatefulWidget', 'StatelessWidget', 'BuildContext', 'Key', 'MaterialApp'];
    const pass = result && result.items.length === expectedItems.length &&
                 expectedItems.every(item => result.items.includes(item));

    console.log('\nExpected Items:', expectedItems.length);
    console.log('Actual Items:', result ? result.items.length : 0);

    this.logResult('Parse Import Clause', pass, result);
    return pass;
  }

  // Test: Full resolution pipeline
  testFullResolutionPipeline() {
    console.log('\n' + '='.repeat(80));
    console.log('TEST 7: Full Resolution Pipeline');
    console.log('='.repeat(80));

    const source = `
${singleLineImport}

${multiLineImportLarge}
`;

    console.log('Input:');
    console.log(source);

    const result = this.resolver.resolveFromSource(source);

    console.log('\nResolution Result:');
    console.log(JSON.stringify(result, null, 2));

    const pass = result.parsed.length === 2 &&
                 result.summary.resolved >= 0;

    this.logResult('Full Resolution Pipeline', pass, result);
    return pass;
  }

  // Logging helper
  logResult(testName, passed, data) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`\n${status}: ${testName}`);
    
    if (!passed) {
      console.log('Data:', JSON.stringify(data, null, 2));
      this.failed++;
    } else {
      this.passed++;
    }
  }

  // Run all tests
  runAll() {
    console.log('\n' + '█'.repeat(80));
    console.log('█ IMPORT RESOLVER TEST SUITE');
    console.log('█'.repeat(80));

    this.testSingleLineImport();
    this.testMultiLineImportLarge();
    this.testMultiLineWithComments();
    this.testMixedImports();
    this.testRegexPattern();
    this.testParseImportClause();
    this.testFullResolutionPipeline();

    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`Total:  ${this.passed + this.failed}`);
    console.log(`Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(2)}%`);
    console.log('='.repeat(80) + '\n');
  }
}

// ============================================================================
// RUN TESTS
// ============================================================================

const tester = new ImportResolverTester();
tester.runAll();