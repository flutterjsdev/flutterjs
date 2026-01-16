/**
 * Build script for @flutterjs/flutterjs_animation
 * 
 * Generates exports.json manifest for the import resolver system
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const srcDir = './src';

/**
 * Get all JavaScript files recursively
 */
function getAllJsFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllJsFiles(filePath, fileList);
    } else if (extname(file) === '.js') {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

/**
 * Scan all source files and generate exports.json manifest
 * This manifest tells the Dart code generator what symbols this package exports
 */
function generateExportManifest(sourceFiles) {
  const manifest = {
    package: '@flutterjs/flutterjs_animation',
    version: '0.1.0',
    exports: []
  };

  // Regex patterns to match different export types
  const exportRegex = /export\s*{\s*([^}]+)\s*}/g;
  const exportStarRegex = /export\s*\*\s*from/g;
  const classRegex = /export\s+class\s+(\w+)/g;
  const functionRegex = /export\s+function\s+(\w+)/g;
  const constRegex = /export\s+const\s+(\w+)/g;

  for (const srcFile of sourceFiles) {
    const content = readFileSync(srcFile, 'utf8');
    
    // Find named exports: export { Foo, Bar }
    for (const match of content.matchAll(exportRegex)) {
      const symbols = match[1]
        .split(',')
        .map(s => s.trim())
        .map(s => s.split(/\s+as\s+/).pop()) // Handle "export { Foo as Bar }"
        .filter(s => s && !s.includes('from'));
      manifest.exports.push(...symbols);
    }
    
    // Find class exports: export class Foo
    for (const match of content.matchAll(classRegex)) {
      manifest.exports.push(match[1]);
    }
    
    // Find function exports: export function foo()
    for (const match of content.matchAll(functionRegex)) {
      manifest.exports.push(match[1]);
    }
    
    // Find const exports: export const FOO
    for (const match of content.matchAll(constRegex)) {
      manifest.exports.push(match[1]);
    }
  }

  // Remove duplicates and sort
  manifest.exports = [...new Set(manifest.exports)].sort();

  writeFileSync('./exports.json', JSON.stringify(manifest, null, 2) + '\n');
  console.log(`📋 Generated exports.json with ${manifest.exports.length} symbols\n`);
}

// Main build process
async function build() {
  console.log('🚀 Building @flutterjs/flutterjs_animation...\n');

  const allFiles = getAllJsFiles(srcDir);
  console.log(`📦 Found ${allFiles.length} JavaScript files\n`);

  // Generate export manifest
  generateExportManifest(allFiles);

  console.log('✅ Build successful!\n');
}

build().catch(console.error);
