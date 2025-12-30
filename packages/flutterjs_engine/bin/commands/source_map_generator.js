/**
 * ============================================================================
 * Source Map Generator - Development Time Debugging
 * ============================================================================
 *
 * Generates source maps so Chrome DevTools shows original source files
 * instead of minified/bundled code.
 *
 * Usage:
 * - Dev mode: Automatically generates maps for each .js file
 * - Points errors to original .src files
 * - Maps class names back to source locations
 *
 * Example Error:
 * BEFORE: Error at app.js:234 in class r (minified)
 * AFTER:  Error at lib/widgets/center.js:12 in class Center (source)
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// ============================================================================
// SOURCE MAP TYPES
// ============================================================================

/**
 * Represents a single mapping in the source map
 */
class SourceMapping {
  constructor(generatedLine, generatedColumn, sourceLine, sourceColumn, source = null) {
    this.generatedLine = generatedLine;
    this.generatedColumn = generatedColumn;
    this.sourceLine = sourceLine;
    this.sourceColumn = sourceColumn;
    this.source = source;
    this.name = null;
  }
}

/**
 * Complete source map (V3 format)
 */
class SourceMap {
  constructor(generatedFile, sourceFile = null) {
    this.version = 3;
    this.file = generatedFile;
    this.sourceRoot = '';
    this.sources = sourceFile ? [sourceFile] : [];
    this.sourcesContent = [];
    this.names = [];
    this.mappings = [];
    this.nameMap = new Map(); // name -> index
  }

  addSource(sourceFile, sourceContent = null) {
    if (!this.sources.includes(sourceFile)) {
      this.sources.push(sourceFile);
      if (sourceContent) {
        this.sourcesContent.push(sourceContent);
      }
    }
  }

  addName(name) {
    if (!this.nameMap.has(name)) {
      const index = this.names.length;
      this.names.push(name);
      this.nameMap.set(name, index);
    }
    return this.nameMap.get(name);
  }

  addMapping(generatedLine, generatedColumn, sourceLine, sourceColumn, source = null, name = null) {
    const mapping = new SourceMapping(generatedLine, generatedColumn, sourceLine, sourceColumn, source);
    if (name) {
      mapping.nameIndex = this.addName(name);
    }
    this.mappings.push(mapping);
  }

  /**
   * Convert mappings to VLQ encoded format
   */
  encodeMappings() {
    if (this.mappings.length === 0) return '';

    // Sort mappings by generated position
    this.mappings.sort((a, b) => {
      if (a.generatedLine !== b.generatedLine) {
        return a.generatedLine - b.generatedLine;
      }
      return a.generatedColumn - b.generatedColumn;
    });

    let result = '';
    let prevGeneratedLine = 0;
    let prevGeneratedColumn = 0;
    let prevSourceIndex = 0;
    let prevSourceLine = 0;
    let prevSourceColumn = 0;
    let prevNameIndex = 0;

    for (const mapping of this.mappings) {
      // Add semicolons for new lines
      while (prevGeneratedLine < mapping.generatedLine) {
        result += ';';
        prevGeneratedLine++;
        prevGeneratedColumn = 0;
      }

      // Add comma between mappings on same line
      if (prevGeneratedColumn > 0) {
        result += ',';
      }

      // Encode VLQ
      result += this.encodeVLQ(mapping.generatedColumn - prevGeneratedColumn);
      prevGeneratedColumn = mapping.generatedColumn;

      if (mapping.source !== undefined) {
        const sourceIndex = this.sources.indexOf(mapping.source) || 0;
        result += this.encodeVLQ(sourceIndex - prevSourceIndex);
        prevSourceIndex = sourceIndex;

        result += this.encodeVLQ(mapping.sourceLine - prevSourceLine);
        prevSourceLine = mapping.sourceLine;

        result += this.encodeVLQ(mapping.sourceColumn - prevSourceColumn);
        prevSourceColumn = mapping.sourceColumn;

        if (mapping.nameIndex !== undefined) {
          result += this.encodeVLQ(mapping.nameIndex - prevNameIndex);
          prevNameIndex = mapping.nameIndex;
        }
      }
    }

    return result;
  }

  /**
   * Encode number as VLQ
   */
  encodeVLQ(num) {
    const VLQ_BASE_SHIFT = 5;
    const VLQ_BASE = 1 << VLQ_BASE_SHIFT;
    const VLQ_BASE_MASK = VLQ_BASE - 1;
    const VLQ_CONTINUATION_BIT = VLQ_BASE;
    const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    let result = '';
    let value = num < 0 ? ((-num) << 1) | 1 : (num << 1) | 0;

    do {
      let digit = value & VLQ_BASE_MASK;
      value >>>= VLQ_BASE_SHIFT;
      if (value > 0) {
        digit |= VLQ_CONTINUATION_BIT;
      }
      result += CHARSET[digit];
    } while (value > 0);

    return result;
  }

  toJSON() {
    return {
      version: this.version,
      file: this.file,
      sourceRoot: this.sourceRoot,
      sources: this.sources,
      sourcesContent: this.sourcesContent,
      names: this.names,
      mappings: this.encodeMappings()
    };
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }
}

// ============================================================================
// SOURCE ANALYZER - Extract mapping info from source
// ============================================================================

class SourceAnalyzer {
  /**
   * Parse JavaScript source and extract class/function definitions
   */
  static analyzeSource(sourceCode) {
    const lines = sourceCode.split('\n');
    const definitions = [];

    // Match: class ClassName
    const classRegex = /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class)\s+(\w+)/;
    // Match: const name = ...
    const constRegex = /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check for class/function
      let match = line.match(classRegex);
      if (match) {
        definitions.push({
          type: line.includes('class') ? 'class' : 'function',
          name: match[1],
          line: lineNum,
          column: line.indexOf(match[1])
        });
        continue;
      }

      // Check for const/let/var
      match = line.match(constRegex);
      if (match) {
        definitions.push({
          type: 'variable',
          name: match[1],
          line: lineNum,
          column: line.indexOf(match[1])
        });
      }
    }

    return definitions;
  }

  /**
   * Match generated code to source definitions
   */
  static matchDefinitions(sourceCode, generatedCode) {
    const sourceDefinitions = this.analyzeSource(sourceCode);
    const generatedLines = generatedCode.split('\n');
    const matches = [];

    for (const def of sourceDefinitions) {
      // Try to find class/function name in generated code
      const searchTerm = def.name;
      const regex = new RegExp(`(?:class\\s+|function\\s+|const\\s+|\\b)${searchTerm}\\b`);

      for (let i = 0; i < generatedLines.length; i++) {
        if (regex.test(generatedLines[i])) {
          matches.push({
            source: def,
            generated: {
              line: i + 1,
              column: generatedLines[i].indexOf(searchTerm)
            }
          });
          break;
        }
      }
    }

    return matches;
  }
}

// ============================================================================
// MAIN SOURCE MAP GENERATOR
// ============================================================================

class SourceMapGenerator {
  constructor(options = {}) {
    this.options = {
      projectRoot: options.projectRoot || process.cwd(),
      sourceDir: options.sourceDir || 'src',
      outputDir: options.outputDir || '.dev',
      debugMode: options.debugMode || false,
      generateInline: options.generateInline !== false,
      ...options
    };

    this.projectRoot = this.options.projectRoot;
    this.sourceDir = path.join(this.projectRoot, this.options.sourceDir);
    this.outputDir = path.join(this.projectRoot, this.options.outputDir);
    this.generatedMaps = new Map();

    if (this.options.debugMode) {
      console.log(chalk.gray('[SourceMapGenerator] Initialized'));
      console.log(chalk.gray(`  Source: ${this.sourceDir}`));
      console.log(chalk.gray(`  Output: ${this.outputDir}\n`));
    }
  }

  /**
   * Generate source map for a single file
   */
  async generateForFile(sourceFile, generatedFile = null) {
    try {
      if (!fs.existsSync(sourceFile)) {
        return null;
      }

      const sourceCode = fs.readFileSync(sourceFile, 'utf-8');
      const relativePath = path.relative(this.projectRoot, sourceFile);

      // Find the corresponding generated file
      let generatedCode = null;
      if (generatedFile && fs.existsSync(generatedFile)) {
        generatedCode = fs.readFileSync(generatedFile, 'utf-8');
      } else {
        // Try to find it in output dir
        const baseName = path.basename(sourceFile, path.extname(sourceFile));
        const possibleGenerated = path.join(this.outputDir, baseName + '.js');
        if (fs.existsSync(possibleGenerated)) {
          generatedCode = fs.readFileSync(possibleGenerated, 'utf-8');
        }
      }

      // Create source map
      const sourceMap = new SourceMap(
        path.basename(sourceFile).replace(/\.fjs$/, '.js'),
        relativePath
      );

      sourceMap.addSource(relativePath, sourceCode);

      if (generatedCode) {
        // Create detailed mappings
        this._createDetailedMappings(sourceMap, sourceCode, generatedCode, relativePath);
      } else {
        // Fallback: 1:1 mapping
        const lines = sourceCode.split('\n');
        for (let i = 0; i < lines.length; i++) {
          sourceMap.addMapping(i + 1, 0, i + 1, 0, relativePath);
        }
      }

      this.generatedMaps.set(sourceFile, sourceMap);
      return sourceMap;

    } catch (error) {
      console.error(chalk.red(`Error generating map for ${sourceFile}: ${error.message}`));
      return null;
    }
  }



  _createDetailedMappings(sourceMap, sourceCode, generatedCode, sourcePath) {
    const sourceLines = sourceCode.split('\n');
    const generatedLines = generatedCode.split('\n');

    // Track important patterns
    const patterns = [
      /class\s+(\w+)/g,           // class declarations
      /function\s+(\w+)/g,        // function declarations
      /const\s+(\w+)/g,           // const declarations
      /\.(\w+)\s*\(/g,            // method calls
      /new\s+(\w+)/g,             // constructor calls
      /throw\s+new\s+Error/g,     // error throws
    ];

    // For each source line with important code
    sourceLines.forEach((sourceLine, sourceLineNum) => {
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(sourceLine)) !== null) {
          const identifier = match[1] || match[0];
          const sourceCol = match.index;

          // Try to find this identifier in generated code
          generatedLines.forEach((genLine, genLineNum) => {
            const genCol = genLine.indexOf(identifier);
            if (genCol !== -1) {
              sourceMap.addMapping(
                genLineNum + 1,
                genCol,
                sourceLineNum + 1,
                sourceCol,
                sourcePath,
                identifier
              );
            }
          });
        }
      });
    });
  }


  /**
   * Generate maps for all source files
   */
  async generateForDirectory(dir = null) {
    const startDir = dir || this.sourceDir;

    if (!fs.existsSync(startDir)) {
      console.warn(chalk.yellow(`Directory not found: ${startDir}`));
      return;
    }

    if (this.options.debugMode) {
      console.log(chalk.blue(`Generating source maps for: ${startDir}\n`));
    }

    const walkDir = async (dirPath) => {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Recurse
          await walkDir(fullPath);
        } else if (entry.isFile() && /\.(js|ts|jsx|tsx)$/.test(entry.name)) {
          await this.generateForFile(fullPath);

          if (this.options.debugMode) {
            console.log(chalk.gray(`âœ" ${path.relative(this.projectRoot, fullPath)}`));
          }
        }
      }
    };

    await walkDir(startDir);

    console.log(chalk.green(`\nGenerated ${this.generatedMaps.size} source maps\n`));
  }

  /**
   * Write source maps to disk
   */
  async writeMaps(outputDir = null) {
    const outDir = outputDir || this.outputDir;

    if (!fs.existsSync(outDir)) {
      await fs.promises.mkdir(outDir, { recursive: true });
    }

    if (this.options.debugMode) {
      console.log(chalk.blue(`Writing ${this.generatedMaps.size} source maps to: ${outDir}\n`));
    }

    for (const [sourceFile, sourceMap] of this.generatedMaps) {
      try {
        const mapFileName = path.basename(sourceFile) + '.map';
        const mapPath = path.join(outDir, mapFileName);

        await fs.promises.writeFile(mapPath, sourceMap.toString(), 'utf-8');

        if (this.options.debugMode) {
          console.log(chalk.gray(`âœ" ${mapFileName}`));
        }
      } catch (error) {
        console.error(chalk.red(`Error writing map: ${error.message}`));
      }
    }
  }

  /**
   * Get inline source map comment
   */
  getInlineComment(sourceMap) {
    const mapString = sourceMap.toString();
    const encoded = Buffer.from(mapString).toString('base64');
    return `//# sourceMappingURL=data:application/json;base64,${encoded}`;
  }

  /**
   * Create error mapper function for runtime
   */
  createErrorMapper() {
    return {
      mapError: (error) => {
        const stack = error.stack || error.toString();
        const lines = stack.split('\n');

        const mapped = lines.map(line => {
          // Try to extract file:line:col from stack
          const match = line.match(/(\w+\.js):(\d+):(\d+)/);
          if (!match) return line;

          const [, fileName, lineNum, colNum] = match;

          // Look up in our maps
          for (const [sourceFile, sourceMap] of this.generatedMaps) {
            if (path.basename(sourceFile).endsWith('.js')) {
              // Find mapping
              for (const mapping of sourceMap.mappings) {
                if (mapping.generatedLine === parseInt(lineNum)) {
                  const sourcePath = sourceMap.sources[0] || sourceFile;
                  return line.replace(
                    `${fileName}:${lineNum}:${colNum}`,
                    `${sourcePath}:${mapping.sourceLine}:${mapping.sourceColumn}`
                  );
                }
              }
            }
          }

          return line;
        });

        return {
          original: error.toString(),
          mapped: mapped.join('\n')
        };
      }
    };
  }

  /**
   * Generate DevTools protocol response
   */
  getDevToolsResponse() {
    const maps = {};

    for (const [sourceFile, sourceMap] of this.generatedMaps) {
      const jsFile = path.basename(sourceFile).replace(/\.[^.]+$/, '.js');
      maps[jsFile] = sourceMap.toJSON();
    }

    return maps;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  SourceMapGenerator,
  SourceMap,
  SourceAnalyzer,
  SourceMapping
};