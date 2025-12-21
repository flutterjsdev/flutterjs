/**
 * Transpile .fjs files to executable JavaScript
 * Handles:
 * - Import statements
 * - Class definitions
 * - Type annotations (remove them)
 * - Export statements
 */

import fs from 'fs';
import path from 'path';

export class FJSTranspiler {
  constructor() {
    this.importMap = new Map(); // File path → resolved imports
  }

  /**
   * Transpile .fjs source to JavaScript
   */
  transpile(source, filePath, projectRoot) {
    let code = source;

    // 1. Resolve imports
    code = this.resolveImports(code, filePath, projectRoot);

    // 2. Remove type annotations
    code = this.removeTypeAnnotations(code);

    // 3. Convert class syntax (if needed)
    code = this.normalizeClassSyntax(code);

    // 4. Handle export statements
    code = this.normalizeExports(code);

    return code;
  }

  /**
   * Resolve import paths
   * flutter-js-framework → @flutterjs/core
   * ./widgets → ./widgets.js
   */
  resolveImports(source, filePath, projectRoot) {
    return source.replace(
      /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g,
      (match, imports, specifier) => {
        const resolved = this.resolveSpecifier(specifier, filePath, projectRoot);
        return `import { ${imports} } from '${resolved}'`;
      }
    );
  }

  /**
   * Resolve import specifier
   */
  resolveSpecifier(specifier, filePath, projectRoot) {
    // Framework imports
    if (specifier === 'flutter-js-framework') {
      return '@flutterjs/core';
    }

    // Scoped packages (@flutterjs/*)
    if (specifier.startsWith('@flutterjs/')) {
      return specifier;
    }

    // Relative imports - add .js extension
    if (specifier.startsWith('.')) {
      const dir = path.dirname(filePath);
      const resolved = path.resolve(dir, specifier);
      
      // Add .js if not present
      if (!resolved.endsWith('.js') && !resolved.endsWith('.fjs')) {
        return specifier + '.js';
      }
      
      return specifier;
    }

    // npm packages - keep as-is
    return specifier;
  }

  /**
   * Remove type annotations (TypeScript-like)
   * : Type → (remove)
   * as Type → (keep as, it's JavaScript)
   */
  removeTypeAnnotations(source) {
    // Remove parameter types: (x: number) → (x)
    source = source.replace(
      /:\s*(?:number|string|boolean|object|any|void|never|unknown|Symbol|Array<[^>]+>|[A-Z]\w*)/g,
      ''
    );

    // Remove return type annotations
    source = source.replace(/\)\s*:\s*(?:number|string|boolean|void|[A-Z]\w*)\s*{/g, ') {');

    // Remove generic type parameters
    source = source.replace(/<[A-Z]\w*(?:\s*,\s*[A-Z]\w*)*>/g, '');

    return source;
  }

  /**
   * Normalize class syntax for runtime compatibility
   */
  normalizeClassSyntax(source) {
    // Ensure extends works with imported classes
    source = source.replace(
      /class\s+(\w+)\s+extends\s+(\w+)/g,
      'class $1 extends $2'
    );

    return source;
  }

  /**
   * Normalize export statements
   * export { MyApp } → export { MyApp }
   * export default MyApp → export { MyApp as default }
   */
  normalizeExports(source) {
    source = source.replace(
      /export\s+default\s+(\w+)/g,
      'export { $1 as default }'
    );

    return source;
  }
}

export default FJSTranspiler;