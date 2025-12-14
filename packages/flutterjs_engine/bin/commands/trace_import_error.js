#!/usr/bin/env node
/**
 * Diagnostic script to trace where bad imports are coming from
 * Run from project root: node trace_import_error.js
 */

const fs = require('fs');
const path = require('path');

// Go up from bin/commands/ to project root, then to src/analyzer/src/
const ANALYZER_DIR = path.join(__dirname, '../../src/analyzer/src');
const BAD_PATTERNS = [
  /"ats\//,
  /'ats\//,
  /"ast\/(?!.*\.)/,  // ast/ without ./
  /'ast\/(?!.*\.)/, // ast/ without ./
];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const issues = [];
    
    lines.forEach((line, index) => {
      BAD_PATTERNS.forEach(pattern => {
        if (pattern.test(line) && (line.includes('import') || line.includes('export'))) {
          issues.push({
            line: index + 1,
            content: line.trim(),
          });
        }
      });
    });
    
    return issues;
  } catch (error) {
    return [];
  }
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (file.endsWith('.js')) {
      callback(filePath);
    }
  });
}

console.log('\n' + '='.repeat(80));
console.log('🔍 IMPORT ERROR TRACER');
console.log('='.repeat(80) + '\n');

console.log(`Scanning: ${ANALYZER_DIR}\n`);

let totalIssues = 0;

walkDir(ANALYZER_DIR, (filePath) => {
  const issues = scanFile(filePath);
  
  if (issues.length > 0) {
    const relativePath = path.relative(ANALYZER_DIR, filePath);
    console.log(`❌ ${relativePath}`);
    
    issues.forEach(issue => {
      console.log(`   Line ${issue.line}: ${issue.content}`);
    });
    
    console.log();
    totalIssues += issues.length;
  }
});

if (totalIssues === 0) {
  console.log('✅ No bad imports found!\n');
  console.log('The error might be coming from cached/bundled code or node_modules.');
  console.log('Try:');
  console.log('  1. Delete node_modules/ and run npm install again');
  console.log('  2. Clear any build artifacts or cache files');
  console.log('  3. Run: npm cache clean --force\n');
} else {
  console.log(`\n⚠️ Found ${totalIssues} import issues above. Fix them and try again.\n`);
}

console.log('='.repeat(80) + '\n');