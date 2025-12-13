/**
 * Test Runner - Executes all test files
 * Usage: node test/runner.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all test files
const testDir = __dirname;
const testFiles = fs
  .readdirSync(testDir)
  .filter(file => file.endsWith('.test.js'))
  .sort();

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  title: (msg) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
};

/**
 * Run a single test file
 */
async function runTestFile(filePath) {
  const fileName = path.basename(filePath);
  
  try {
    log.title(`Running: ${fileName}`);
    const module = await import(`file://${filePath}`);
    
    // If test file has a run function, call it
    if (typeof module.default === 'function') {
      await module.default();
    } else if (typeof module.run === 'function') {
      await module.run();
    }
    
    log.success(`${fileName} passed`);
    return true;
  } catch (error) {
    log.error(`${fileName} failed`);
    console.error(error);
    return false;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log(`\n${colors.bright}${colors.cyan}🧪 FlutterJS Analyzer Test Suite${colors.reset}\n`);
  
  if (testFiles.length === 0) {
    log.warn('No test files found in test/');
    return;
  }

  log.info(`Found ${testFiles.length} test file(s)`);
  
  let passed = 0;
  let failed = 0;
  const startTime = Date.now();

  for (const file of testFiles) {
    const filePath = path.join(testDir, file);
    const success = await runTestFile(filePath);
    
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Summary
  console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}Test Results:${colors.reset}`);
  console.log(`  ${colors.green}✅ Passed: ${passed}${colors.reset}`);
  console.log(`  ${colors.red}❌ Failed: ${failed}${colors.reset}`);
  console.log(`  ${colors.cyan}⏱️  Duration: ${duration}s${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  log.error('Fatal error in test runner');
  console.error(error);
  process.exit(1);
});
