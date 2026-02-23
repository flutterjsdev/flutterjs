#!/usr/bin/env node
/**
 * FlutterJS Gap Detector
 *
 * Compares exports.json (declared API surface) against actual JS source files
 * to find which symbols are declared but not yet implemented.
 *
 * Usage:
 *   node scripts/gap_detector.js [--package foundation|services|all] [--format text|json]
 *
 * Output:
 *   - Missing JS source files (referenced in exports.json but don't exist)
 *   - Missing symbols per file (symbols declared but not exported from the JS file)
 *   - Coverage summary per package
 */

const { readFileSync, existsSync } = require('fs');
const { resolve, dirname, join } = require('path');

const ROOT = resolve(__dirname, '..');

// ── Config ──────────────────────────────────────────────────────────────────

const PACKAGES = {
  foundation: {
    exportsJson: join(ROOT, 'packages/flutterjs_foundation/flutterjs_foundation/exports.json'),
    srcDir: join(ROOT, 'packages/flutterjs_foundation/flutterjs_foundation/src'),
  },
  services: {
    exportsJson: join(ROOT, 'packages/flutterjs_services/flutterjs_services/exports.json'),
    srcDir: join(ROOT, 'packages/flutterjs_services/flutterjs_services/src'),
  },
};

// ── Argument parsing ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const pkgArg = args.includes('--package') ? args[args.indexOf('--package') + 1] : 'all';
const format = args.includes('--json') ? 'json' : 'text';
const showImplemented = args.includes('--show-implemented');

const packagesToCheck = pkgArg === 'all' ? Object.keys(PACKAGES) : [pkgArg];

// ── Symbol extraction from JS source ─────────────────────────────────────────

/**
 * Extracts all exported names from a JS ESM source file.
 * Handles:
 *   export class Foo
 *   export function foo
 *   export const foo
 *   export { Foo, bar }
 *   export { Foo as default }
 */
function extractExportedSymbols(filePath) {
  if (!existsSync(filePath)) return null; // file missing entirely

  const src = readFileSync(filePath, 'utf8');
  const symbols = new Set();

  // export class/function/const/let/var Name
  const directExportRe = /^export\s+(?:default\s+)?(?:class|function\*?|const|let|var|async\s+function\*?)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm;
  let m;
  while ((m = directExportRe.exec(src)) !== null) {
    symbols.add(m[1]);
  }

  // export { Foo, bar as baz, ... }
  const namedExportBlockRe = /^export\s*\{([^}]+)\}/gm;
  while ((m = namedExportBlockRe.exec(src)) !== null) {
    const parts = m[1].split(',');
    for (const part of parts) {
      // "Foo as Bar" → export name is "Bar"; plain "Foo" → "Foo"
      const asMatch = part.match(/\bas\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
      if (asMatch) {
        symbols.add(asMatch[1]);
      } else {
        const name = part.trim().match(/^([A-Za-z_$][A-Za-z0-9_$]*)/);
        if (name) symbols.add(name[1]);
      }
    }
  }

  // export default class/function Name (unnamed defaults are anonymous — skip)
  const defaultNamedRe = /^export\s+default\s+(?:class|function)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm;
  while ((m = defaultNamedRe.exec(src)) !== null) {
    symbols.add(m[1]);
  }

  return symbols;
}

// ── Gap analysis ─────────────────────────────────────────────────────────────

function analyzePackage(pkgName) {
  const cfg = PACKAGES[pkgName];
  const exportsData = JSON.parse(readFileSync(cfg.exportsJson, 'utf8'));

  // Group exports by their relative path (e.g. "./src/assertions.js")
  const byFile = new Map(); // relPath → [exportEntry]
  for (const entry of exportsData.exports) {
    if (!byFile.has(entry.path)) byFile.set(entry.path, []);
    byFile.get(entry.path).push(entry);
  }

  const results = {
    package: pkgName,
    totalDeclaredSymbols: exportsData.exports.length,
    totalDeclaredFiles: byFile.size,
    missingFiles: [],       // files referenced in exports.json but don't exist on disk
    incompleteFiles: [],    // files that exist but are missing some declared symbols
    implementedFiles: [],   // files fully implemented (all symbols present)
    summary: {},
  };

  for (const [relPath, entries] of byFile) {
    // Resolve relative path from the exports.json directory
    const absPath = resolve(dirname(cfg.exportsJson), relPath);
    const implementedSymbols = extractExportedSymbols(absPath);

    // Deduplicate declared symbol names (enums + enum_members share parent name)
    // We only care about top-level exported names (not "EnumName.member" style)
    const declaredNames = new Set(
      entries
        .map(e => e.name.split('.')[0]) // "DiagnosticLevel.hidden" → "DiagnosticLevel"
        .filter(n => !n.startsWith('_')) // skip private symbols
    );

    if (implementedSymbols === null) {
      // File completely missing
      results.missingFiles.push({
        file: relPath,
        declaredSymbols: [...declaredNames],
        count: declaredNames.size,
      });
      continue;
    }

    // File exists — check which symbols are missing
    const missingSymbols = [...declaredNames].filter(n => !implementedSymbols.has(n));
    const presentSymbols = [...declaredNames].filter(n => implementedSymbols.has(n));

    if (missingSymbols.length > 0) {
      results.incompleteFiles.push({
        file: relPath,
        missingSymbols,
        presentSymbols,
        coverage: `${presentSymbols.length}/${declaredNames.size}`,
      });
    } else {
      results.implementedFiles.push({
        file: relPath,
        symbolCount: declaredNames.size,
      });
    }
  }

  // Summary stats
  const totalMissingSymbols =
    results.missingFiles.reduce((s, f) => s + f.count, 0) +
    results.incompleteFiles.reduce((s, f) => s + f.missingSymbols.length, 0);

  const totalImplementedSymbols =
    results.incompleteFiles.reduce((s, f) => s + f.presentSymbols.length, 0) +
    results.implementedFiles.reduce((s, f) => s + f.symbolCount, 0);

  results.summary = {
    files: {
      missing: results.missingFiles.length,
      incomplete: results.incompleteFiles.length,
      complete: results.implementedFiles.length,
      total: byFile.size,
    },
    symbols: {
      missing: totalMissingSymbols,
      implemented: totalImplementedSymbols,
      total: results.totalDeclaredSymbols,
      coveragePct: Math.round((totalImplementedSymbols / results.totalDeclaredSymbols) * 100),
    },
  };

  return results;
}

// ── Output formatting ─────────────────────────────────────────────────────────

const RESET  = '\x1b[0m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN  = '\x1b[32m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

function bar(pct, width = 30) {
  const filled = Math.round((pct / 100) * width);
  const color = pct >= 80 ? GREEN : pct >= 40 ? YELLOW : RED;
  return color + '█'.repeat(filled) + DIM + '░'.repeat(width - filled) + RESET;
}

function printTextReport(result) {
  console.log(`\n${BOLD}${CYAN}═══ ${result.package.toUpperCase()} ═══${RESET}`);
  console.log(`Declared: ${result.totalDeclaredSymbols} symbols across ${result.totalDeclaredFiles} files\n`);

  // ── Missing files ──
  if (result.missingFiles.length > 0) {
    console.log(`${RED}${BOLD}MISSING FILES (${result.missingFiles.length}) — not yet created:${RESET}`);
    for (const f of result.missingFiles) {
      const symbols = f.declaredSymbols.slice(0, 5).join(', ');
      const more = f.declaredNames > 5 ? ` +${f.count - 5} more` : '';
      console.log(`  ${RED}✗${RESET} ${f.file.replace('./src/', '')} ${DIM}(${f.count} symbols: ${symbols}${more})${RESET}`);
    }
    console.log();
  }

  // ── Incomplete files ──
  if (result.incompleteFiles.length > 0) {
    console.log(`${YELLOW}${BOLD}INCOMPLETE FILES (${result.incompleteFiles.length}) — exist but missing symbols:${RESET}`);
    for (const f of result.incompleteFiles) {
      console.log(`  ${YELLOW}~${RESET} ${f.file.replace('./src/', '')} [${f.coverage}]`);
      for (const sym of f.missingSymbols) {
        console.log(`      ${DIM}missing: ${sym}${RESET}`);
      }
    }
    console.log();
  }

  // ── Implemented files ──
  if (showImplemented && result.implementedFiles.length > 0) {
    console.log(`${GREEN}${BOLD}COMPLETE FILES (${result.implementedFiles.length}):${RESET}`);
    for (const f of result.implementedFiles) {
      console.log(`  ${GREEN}✓${RESET} ${f.file.replace('./src/', '')} ${DIM}(${f.symbolCount} symbols)${RESET}`);
    }
    console.log();
  }

  // ── Summary ──
  const s = result.summary;
  console.log(`${BOLD}Coverage: ${bar(s.symbols.coveragePct)} ${s.symbols.coveragePct}%${RESET}`);
  console.log(`  Symbols: ${GREEN}${s.symbols.implemented} implemented${RESET} / ${RED}${s.symbols.missing} missing${RESET} / ${s.symbols.total} total`);
  console.log(`  Files:   ${GREEN}${s.files.complete} complete${RESET} / ${YELLOW}${s.files.incomplete} incomplete${RESET} / ${RED}${s.files.missing} missing${RESET} / ${s.files.total} total`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const allResults = [];

for (const pkg of packagesToCheck) {
  if (!PACKAGES[pkg]) {
    console.error(`Unknown package: ${pkg}. Valid: ${Object.keys(PACKAGES).join(', ')}`);
    process.exit(1);
  }
  const result = analyzePackage(pkg);
  allResults.push(result);
}

if (format === 'json') {
  console.log(JSON.stringify(allResults, null, 2));
} else {
  console.log(`${BOLD}FlutterJS Gap Detector${RESET}`);
  console.log(`Checking packages: ${packagesToCheck.join(', ')}\n`);

  for (const result of allResults) {
    printTextReport(result);
  }

  // Cross-package totals
  if (allResults.length > 1) {
    const totalSymbols = allResults.reduce((s, r) => s + r.summary.symbols.total, 0);
    const totalImpl    = allResults.reduce((s, r) => s + r.summary.symbols.implemented, 0);
    const totalMissing = allResults.reduce((s, r) => s + r.summary.symbols.missing, 0);
    const totalPct     = Math.round((totalImpl / totalSymbols) * 100);
    console.log(`\n${BOLD}OVERALL COVERAGE: ${bar(totalPct)} ${totalPct}%${RESET}`);
    console.log(`  ${GREEN}${totalImpl} implemented${RESET} / ${RED}${totalMissing} missing${RESET} / ${totalSymbols} total\n`);
  }
}
