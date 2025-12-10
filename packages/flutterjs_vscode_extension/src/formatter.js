class FJSFormatter {
  constructor() {
    this.indentSize = 2;
    this.lineLength = 80;
  }

  format(content) {
    let formatted = content;

    // 1. Normalize line endings
    formatted = formatted.replace(/\r\n/g, '\n');

    // 2. Break long lines with nested widgets
    formatted = this.breakLongWidgetLines(formatted);

    // 3. Format imports
    formatted = this.formatImports(formatted);

    // 4. Format class declarations
    formatted = this.formatClasses(formatted);

    // 5. Fix indentation (before widget formatting)
    formatted = this.fixIndentation(formatted);

    // 6. Format function declarations
    formatted = this.formatFunctions(formatted);

    // 7. Format spacing (blank lines)
    formatted = this.formatSpacing(formatted);

    // 8. Trailing commas and semicolons
    formatted = this.formatTrailingPunctuation(formatted);

    return formatted;
  }

  breakLongWidgetLines(content) {
    const lines = content.split('\n');
    const formatted = [];

    for (let line of lines) {
      // Skip if line is short enough or is import/comment
      if (line.length < this.lineLength || line.trim().startsWith('import') || line.trim().startsWith('//')) {
        formatted.push(line);
        continue;
      }

      // Check if line contains widget constructors
      if (/\w+\s*\(\s*{/.test(line)) {
        const baseIndent = this.getIndentation(line);
        const trimmed = line.trim();
        
        // Break long widget chains into multiple lines
        const broken = this.breakWidgetChain(trimmed, baseIndent);
        formatted.push(...broken);
      } else {
        formatted.push(line);
      }
    }

    return formatted.join('\n');
  }

  breakWidgetChain(line, baseIndent) {
    const result = [];
    let depth = 0;
    let inString = false;
    let stringChar = '';
    const indent = baseIndent;
    const childIndent = indent + ' '.repeat(this.indentSize);
    let current = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prevChar = i > 0 ? line[i - 1] : '';

      // Track strings
      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (inString) {
        current += char;
        continue;
      }

      // Handle opening brace
      if (char === '{') {
        depth++;
        current += char;
        
        // Break after opening { for object/widget properties
        if (depth === 1) {
          result.push(current);
          current = childIndent;
        }
        continue;
      }

      // Handle closing brace
      if (char === '}') {
        depth--;
        
        if (depth === 0) {
          // Closing the main object
          if (current.trim() && current.trim() !== '') {
            result.push(current);
          }
          result.push(indent + '}');
          current = '';
        } else {
          current += char;
        }
        continue;
      }

      // Break on commas at depth 1 (property separations)
      if (char === ',' && depth === 1) {
        current += char;
        result.push(current);
        current = childIndent;
        // Skip spaces after comma
        while (i + 1 < line.length && line[i + 1] === ' ') {
          i++;
        }
        continue;
      }

      current += char;
    }

    // Push any remaining content
    if (current.trim()) {
      result.push(current);
    }

    return result.length > 1 ? result : [line];
  }

  formatImports(content) {
    const lines = content.split('\n');
    let importSection = [];
    let otherLines = [];
    let inImportSection = true;

    lines.forEach((line, idx) => {
      if (line.trim().startsWith('import ')) {
        importSection.push(line.trim());
      } else if (line.trim() === '' && inImportSection) {
        inImportSection = false;
        otherLines.push('');
      } else {
        inImportSection = false;
        otherLines.push(line);
      }
    });

    // Sort imports: named imports first, then default imports
    importSection.sort((a, b) => {
      const aIsNamed = a.includes('{');
      const bIsNamed = b.includes('{');
      if (aIsNamed === bIsNamed) {
        return a.localeCompare(b);
      }
      return aIsNamed ? -1 : 1;
    });

    // Format each import with proper spacing
    const formattedImports = importSection.map(imp => {
      if (imp.includes('{')) {
        // Named import: import { X, Y } from 'package'
        const match = imp.match(/import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/);
        if (match) {
          const items = match[1]
            .split(',')
            .map(i => i.trim())
            .sort()
            .join(', ');
          return `import { ${items} } from '${match[2]}';`;
        }
      } else if (imp.includes('*')) {
        // Namespace import: import * as X from 'package'
        return imp.endsWith(';') ? imp : imp + ';';
      } else {
        // Default import: import X from 'package'
        return imp.endsWith(';') ? imp : imp + ';';
      }
      return imp;
    });

    return [...formattedImports, ...otherLines].join('\n');
  }

  formatClasses(content) {
    // Format class declarations with proper spacing - keep opening brace on same line
    return content.replace(
      /class\s+(\w+)\s*(?:extends\s+(\w+))?\s*\n\s*{/g,
      (match, className, extendsClass) => {
        if (extendsClass) {
          return `class ${className} extends ${extendsClass} {`;
        }
        return `class ${className} {`;
      }
    );
  }

  fixIndentation(content) {
    const lines = content.split('\n');
    let indentLevel = 0;
    const formatted = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        formatted.push('');
        continue;
      }

      // Skip comment lines - maintain their relative indent
      if (trimmed.startsWith('//')) {
        formatted.push(' '.repeat(indentLevel * this.indentSize) + trimmed);
        continue;
      }

      // Check if this line starts with closing brace - decrease indent BEFORE adding line
      const startsWithClosing = /^[}\])]/.test(trimmed);
      if (startsWithClosing) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      // Add properly indented line
      const indented = ' '.repeat(indentLevel * this.indentSize) + trimmed;
      formatted.push(indented);

      // Update indent level based on opening/closing braces
      const openCount = (trimmed.match(/{/g) || []).length + 
                        (trimmed.match(/\[/g) || []).length +
                        (trimmed.match(/\(/g) || []).length;
      const closeCount = (trimmed.match(/}/g) || []).length + 
                         (trimmed.match(/\]/g) || []).length +
                         (trimmed.match(/\)/g) || []).length;

      indentLevel += openCount - closeCount;
      indentLevel = Math.max(0, indentLevel);
    }

    return formatted.join('\n');
  }

  formatFunctions(content) {
    return content
      // Function declarations: function name() {
      .replace(/function\s+(\w+)\s*\(\s*/g, 'function $1(')
      // Arrow functions: () => {
      .replace(/\)\s*=>\s*{/g, ') => {')
      // Remove spaces around arrow
      .replace(/\s+=>\s+/g, ' => ')
      // Keep opening brace on same line as function
      .replace(/\)\s*\n\s*{/g, ') {');
  }

  formatSpacing(content) {
    let formatted = content;

    // Remove multiple consecutive blank lines (keep max 1)
    formatted = formatted.replace(/\n\n\n+/g, '\n\n');

    // Ensure blank line between class/function members
    formatted = formatted.replace(
      /(\n\s{2,}[a-z_]\w*\s*\([^)]*\)\s*{[^}]*})\n(\s{2,}[a-z_])/g,
      '$1\n\n$2'
    );

    // Remove trailing whitespace from lines
    formatted = formatted
      .split('\n')
      .map(line => line.replace(/\s+$/, ''))
      .join('\n');

    // Ensure file ends with newline
    if (formatted && !formatted.endsWith('\n')) {
      formatted += '\n';
    }

    return formatted;
  }

  formatTrailingPunctuation(content) {
    const lines = content.split('\n');
    const formatted = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      let trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('//')) {
        formatted.push(line);
        continue;
      }

      // Don't modify lines that are just closing braces
      if (/^[}\])]([,;])?$/.test(trimmed)) {
        formatted.push(line);
        continue;
      }

      // Add semicolon to statements (but not to control structures or declarations ending with {)
      if (!trimmed.endsWith(';') && !trimmed.endsWith('{') && 
          !trimmed.endsWith('}') && !trimmed.endsWith(',') &&
          !/^(if|else|for|while|switch|class|function|import|export)\b/.test(trimmed)) {
        // Don't add semicolon if line ends with opening paren or bracket
        if (!trimmed.endsWith('(') && !trimmed.endsWith('[') && !trimmed.endsWith('(')) {
          // Only add if it looks like a statement
          if (!/^\/\//.test(trimmed)) {
            trimmed += ';';
          }
        }
      }

      const indent = this.getIndentation(line);
      formatted.push(indent + trimmed);
    }

    return formatted.join('\n');
  }

  getIndentation(line) {
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
  }

  // Format a single line (for real-time formatting in editor)
  formatLine(line) {
    let formatted = line.trim();

    // Remove extra spaces
    formatted = formatted.replace(/\s+/g, ' ');

    // Fix spacing around operators (but not in strings)
    if (!formatted.includes('"') && !formatted.includes("'")) {
      formatted = formatted.replace(/\s*([=+\-*/%])\s*/g, ' $1 ');
      formatted = formatted.replace(/\s*([=+\-*/%])\s*=/g, ' $1= ');
    }

    // Fix spacing in function calls
    formatted = formatted.replace(/\(\s+/g, '(');
    formatted = formatted.replace(/\s+\)/g, ')');
    formatted = formatted.replace(/,\s*/g, ', ');

    return formatted;
  }
}

module.exports = { FJSFormatter };