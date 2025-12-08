// ============================================================================
// FLUTTER-JS TRANSFORMER - Post-processing for generated code
// ============================================================================
// Transforms generated JavaScript to support Flutter-like syntax
// ============================================================================

const fs = require('fs');
const path = require('path');

/**
 * ✅ Transform generated Flutter-JS code
 * Supports:
 *  - const new Widget() → immutable instance
 *  - extends StateOf<Widget> → state with widget context
 *  - ImmutableWidget base class → Object.freeze()
 */
function transformFlutterJS(source, filename) {
  let code = source;
  const neededImports = new Set();
  const neededRuntimes = new Set();

  // =========================================================================
  // TRANSFORM 1: Support 'const new' syntax (semantic marker)
  // =========================================================================
  // const new MyApp() → marks widget as immutable
  code = code.replace(/const\s+new\s+([A-Z][A-Za-z0-9_]*)\s*\(/g,
    (match, className) => {
      neededRuntimes.add('constWidget');
      return `constWidget(new ${className})(`;
    }
  );

  // =========================================================================
  // TRANSFORM 2: Support ImmutableWidget base class
  // =========================================================================
  // class MyButton extends ImmutableWidget
  code = code.replace(/extends\s+ImmutableWidget/g,
    (match) => {
      neededImports.add('ImmutableWidget');
      neededRuntimes.add('freezeObject');
      return 'extends ImmutableWidget';
    }
  );

  // =========================================================================
  // TRANSFORM 3: State extensions with widget type
  // =========================================================================
  // extends State<MyHomePage> → extends StateOf(MyHomePage)
  code = code.replace(/extends\s+State\s*<\s*([A-Za-z_][\w$]*)\s*>/g,
    (match, widgetName) => {
      neededImports.add(widgetName);
      neededRuntimes.add('StateOf');
      return `extends StateOf(${widgetName})`;
    }
  );

  // =========================================================================
  // TRANSFORM 4: Widget class declarations
  // =========================================================================
  // class MyApp extends StatelessWidget → tracking for runtime
  code = code.replace(/class\s+([A-Za-z_][\w$]*)\s+extends\s+(Stateless|Stateful)Widget/g,
    (match, className, widgetType) => {
      neededImports.add(`${widgetType}Widget`);
      return match; // Keep as-is, just track imports
    }
  );

  // =========================================================================
  // TRANSFORM 5: Add runtime helper for const widgets
  // =========================================================================
  const runtimeHelpers = [];

  if (neededRuntimes.has('constWidget')) {
    runtimeHelpers.push(`
// ✅ Runtime helper: Mark widget as const (immutable)
function constWidget(instance) {
  if (instance && typeof instance === 'object') {
    // Mark as const
    Object.defineProperty(instance, '_isConst', {
      value: true,
      writable: false,
      enumerable: false
    });
    
    // Freeze to prevent modifications (optional)
    if (instance.constructor._immutable) {
      Object.freeze(instance);
    }
  }
  return instance;
}
`);
  }

  if (neededRuntimes.has('freezeObject')) {
    runtimeHelpers.push(`
// ✅ Runtime helper: Freeze object (make immutable)
function freezeObject(obj) {
  return Object.freeze(obj);
}
`);
  }

  if (neededRuntimes.has('StateOf')) {
    runtimeHelpers.push(`
// ✅ Runtime helper: Create state with widget context
function StateOf(widgetClass) {
  return class extends State {
    get widget() {
      return this._widget || new widgetClass();
    }
    set widget(value) {
      this._widget = value;
    }
  };
}
`);
  }

  // =========================================================================
  // TRANSFORM 6: Add necessary imports
  // =========================================================================
  const imports = [];

  if (neededImports.has('ImmutableWidget')) {
    imports.push(`import { ImmutableWidget } from '@flutter.js/framework/widgets';`);
  }
  if (neededImports.has('StatelessWidget')) {
    imports.push(`import { StatelessWidget } from '@flutter.js/framework/widgets';`);
  }
  if (neededImports.has('StatefulWidget')) {
    imports.push(`import { StatefulWidget } from '@flutter.js/framework/widgets';`);
  }
  if (neededImports.has('State')) {
    imports.push(`import { State } from '@flutter.js/framework/widgets';`);
  }

  // =========================================================================
  // STEP: Add imports at the top
  // =========================================================================
  if (imports.length > 0) {
    const existingImports = code.match(/^import\s+.*?from\s+['"].*?['"];?\n/gm) || [];

    if (existingImports.length > 0) {
      // Add after existing imports
      const lastImportIndex = code.lastIndexOf(existingImports[existingImports.length - 1]);
      const insertPosition = lastImportIndex + existingImports[existingImports.length - 1].length;
      code = code.slice(0, insertPosition) + '\n' + imports.join('\n') + code.slice(insertPosition);
    } else {
      // Add at the beginning
      code = imports.join('\n') + '\n\n' + code;
    }
  }

  // =========================================================================
  // STEP: Add runtime helpers before exports
  // =========================================================================
  if (runtimeHelpers.length > 0) {
    const helperCode = runtimeHelpers.join('\n\n');
    const exportMatch = code.match(/\nexport\s+{/);

    if (exportMatch) {
      // Insert before export
      const exportIndex = code.lastIndexOf('\nexport {');
      code = code.slice(0, exportIndex) + '\n\n' + helperCode + code.slice(exportIndex);
    } else {
      // Add before end
      code = code + '\n\n' + helperCode;
    }
  }

  return code;
}

/**
 * ✅ Process Flutter-JS files (.fjs)
 */
function processFlutterJSFiles(srcDir, outDir) {
  if (!fs.existsSync(srcDir)) {
    console.warn(`⚠️  Source directory not found: ${srcDir}`);
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });
  const files = fs.readdirSync(srcDir);

  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const stats = fs.statSync(srcPath);

    if (stats.isDirectory()) {
      if (!file.startsWith('.')) {
        // Recursively process subdirectories
        processFlutterJSFiles(srcPath, path.join(outDir, file));
      }
    } else if (file.endsWith('.fjs') || file.endsWith('.js')) {
      try {
        const content = fs.readFileSync(srcPath, 'utf8');
        const transformed = transformFlutterJS(content, srcPath);
        const outPath = path.join(outDir, file.replace('.fjs', '.js'));

        fs.writeFileSync(outPath, transformed);
        console.log(`✅ Transformed: ${file} → ${path.basename(outPath)}`);
      } catch (error) {
        console.error(`❌ Error transforming ${file}:`, error.message);
      }
    } else if (!['.dart', '.fjs'].some(ext => file.endsWith(ext))) {
      // Copy non-fjs files
      try {
        fs.copyFileSync(srcPath, path.join(outDir, file));
      } catch (error) {
        console.error(`❌ Error copying ${file}:`, error.message);
      }
    }
  }
}
