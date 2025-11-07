
// 1. Enhanced fjs.js - Better transformation and file handling
// src/utils/fjs.js

const fs = require('fs');
const path = require('path');

function transformFJS(source, filename) {
  let code = source;
  const neededImports = new Set();

  // Transform State extensions
  code = code.replace(/extends\s+State\s*<\s*([A-Za-z_][\w$]*)\s*>/g,
    (match, widgetName) => {
      neededImports.add(widgetName);
      return `extends StateOf(${widgetName})`;
    }
  );

  // Transform Widget declarations
  code = code.replace(/class\s+([A-Za-z_][\w$]*)\s+extends\s+Widget/g,
    (match, className) => {
      neededImports.add('Widget');
      return `class ${className} extends FJSWidget`;
    }
  );

  // Add necessary imports
  const imports = [];
  if (neededImports.has('StateOf') || code.includes('StateOf')) {
    imports.push(`import { StateOf } from '@flutter.js/framework';`);
  }
  if (neededImports.has('Widget') || code.includes('FJSWidget')) {
    imports.push(`import { FJSWidget } from '@flutter.js/framework';`);
  }

  // Add imports at the top if needed
  if (imports.length > 0) {
    const existingImports = code.match(/^import\s+.*?from\s+['"].*?['"];?\n/gm) || [];
    if (existingImports.length === 0) {
      code = imports.join('\n') + '\n\n' + code;
    }
  }

  return code;
}

function processFJSFiles(srcDir, outDir) {
  if (!fs.existsSync(srcDir)) {
    console.warn(`Source directory not found: ${srcDir}`);
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });
  const files = fs.readdirSync(srcDir);

  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const stats = fs.statSync(srcPath);

    if (stats.isDirectory()) {
      // Skip hidden directories
      if (!file.startsWith('.')) {
        processFJSFiles(srcPath, path.join(outDir, file));
      }
    } else if (file.endsWith('.fjs')) {
      try {
        const content = fs.readFileSync(srcPath, 'utf8');
        const transformed = transformFJS(content, srcPath);
        const outPath = path.join(outDir, file.replace('.fjs', '.js'));
        
        fs.writeFileSync(outPath, transformed);
        console.log(`✓ Transformed: ${file} → ${path.basename(outPath)}`);
      } catch (error) {
        console.error(`✗ Error transforming ${file}:`, error.message);
      }
    } else if (!['.dart', '.fjs'].some(ext => file.endsWith(ext))) {
      // Copy non-fjs files
      try {
        fs.copyFileSync(srcPath, path.join(outDir, file));
      } catch (error) {
        console.error(`✗ Error copying ${file}:`, error.message);
      }
    }
  }
}

module.exports = { transformFJS, processFJSFiles };