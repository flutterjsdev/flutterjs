const vscode = require('vscode');
const path = require('path');
const { FJSAnalyzer } = require('./analyzer');
const { FJSFormatter } = require('./formatter');

let analyzer;
let formatter;
let diagnosticsCollection;
const DEBOUNCE_DELAY = 500;
let timeout;

function activate(context) {
  console.log('🚀 FlutterJS Pro Extension Activated!');

  try {
    analyzer = new FJSAnalyzer();
    formatter = new FJSFormatter();
    diagnosticsCollection = vscode.languages.createDiagnosticCollection('flutterjs');
    context.subscriptions.push(diagnosticsCollection);

    // ===== Document Change Listener (Debounced) =====
    const triggerUpdate = debounce((document) => {
      try {
        if (document.languageId === 'fjs' || document.fileName.endsWith('.fjs')) {
          updateDiagnostics(document);
        }
      } catch (e) {
        console.error('Error updating diagnostics:', e);
      }
    }, DEBOUNCE_DELAY);

    context.subscriptions.push(
      vscode.workspace.onDidChangeTextDocument(e => triggerUpdate(e.document)),
      vscode.workspace.onDidOpenTextDocument(triggerUpdate),
      vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) triggerUpdate(editor.document);
      })
    );

    if (vscode.window.activeTextEditor) {
      triggerUpdate(vscode.window.activeTextEditor.document);
    }

    // ===== Format Document Provider =====
    context.subscriptions.push(
      vscode.languages.registerDocumentFormattingEditProvider('fjs', {
        provideDocumentFormattingEdits(document) {
          try {
            const fullText = document.getText();
            const formatted = formatter.format(fullText);

            if (fullText === formatted) return [];

            const range = new vscode.Range(
              document.positionAt(0),
              document.positionAt(fullText.length)
            );

            return [vscode.TextEdit.replace(range, formatted)];
          } catch (e) {
            console.error('Error formatting document:', e);
            return [];
          }
        }
      })
    );



    // ===== Hover Provider =====
    context.subscriptions.push(
      vscode.languages.registerHoverProvider('fjs', {
        provideHover(document, position, token) {
          try {
            const range = document.getWordRangeAtPosition(position, /\w+/);
            if (!range) return null;

            const word = document.getText(range);

            // Widget hover
            if (analyzer.flutterWidgets[word]) {
              const widget = analyzer.flutterWidgets[word];
              const contents = [
                new vscode.MarkdownString(`**${word}** – FlutterJS Widget`),
                new vscode.MarkdownString(`Package: \`${widget.package}\``),
                new vscode.MarkdownString(`\`\`\`fjs\nnew ${word}({\n  // props\n})\n\`\`\``),
              ];

              return new vscode.Hover(contents);
            }

            // Global function hover
            const globalPkg = analyzer.dartGlobals[word];
            if (globalPkg) {
              return new vscode.Hover([
                new vscode.MarkdownString(`**${word}** – Flutter Global Function`),
                new vscode.MarkdownString(`Import from: \`${globalPkg}\``),
              ]);
            }

            // Runtime helper hover
            const helperInfo = analyzer.runtimeHelpers[word];
            if (helperInfo) {
              return new vscode.Hover([
                new vscode.MarkdownString(`**${word}** – Runtime Helper`),
                new vscode.MarkdownString(`${helperInfo.description}`),
                new vscode.MarkdownString(`Import from: \`${helperInfo.package}\``),
              ]);
            }

            return null;
          } catch (e) {
            console.error('Error in hover provider:', e);
            return null;
          }
        }
      })
    );

    // ===== Code Actions Provider =====
    context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider('fjs', 
        new FlutterJSCodeActionProvider(analyzer),
        {
          providedCodeActionKinds: [
            vscode.CodeActionKind.QuickFix,
            vscode.CodeActionKind.SourceOrganizeImports
          ]
        }
      )
    );

    // ===== Command: Add Import =====
    context.subscriptions.push(
      vscode.commands.registerCommand('flutterjs.addImport', async (packageName, importsToAdd) => {
        try {
          const editor = vscode.window.activeTextEditor;
          if (!editor) {
            vscode.window.showErrorMessage('No editor active');
            return;
          }

          const doc = editor.document;
          const fullText = doc.getText();

          const escapedPkg = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const existingImportPattern = new RegExp(
            `import\\s+{([^}]*)\\s*}\\s*from\\s+['"]${escapedPkg}['"];?`,
            'i'
          );

          const existingMatch = existingImportPattern.exec(fullText);

          if (existingMatch) {
            const existingContent = existingMatch[1];
            const existingImports = existingContent
              .split(',')
              .map(i => i.trim().split('//')[0].trim())
              .filter(i => i && !i.startsWith('import'));

            const newImports = importsToAdd.filter(imp => !existingImports.includes(imp));

            if (newImports.length === 0) {
              vscode.window.showInformationMessage(`✓ Already imported`);
              return;
            }

            const allImports = [...existingImports, ...newImports].sort();
            const importStr = allImports.join(', ');

            await editor.edit(editBuilder => {
              const startPos = doc.positionAt(existingMatch.index);
              const endPos = doc.positionAt(existingMatch.index + existingMatch[0].length);
              editBuilder.replace(
                new vscode.Range(startPos, endPos),
                `import { ${importStr} } from '${packageName}';`
              );
            });

            vscode.window.showInformationMessage(`✅ Added to existing import`);
          } else {
            let lastImportLine = 0;
            for (let i = 0; i < doc.lineCount; i++) {
              const line = doc.lineAt(i).text;
              if (line.match(/^\s*import\s+/) || line.includes('} from')) {
                lastImportLine = i;
              }
            }

            const insertPos = doc.lineAt(lastImportLine).range.end;
            const importStr = `\nimport { ${importsToAdd.join(', ')} } from '${packageName}';`;

            await editor.edit(editBuilder => {
              editBuilder.insert(insertPos, importStr);
            });

            vscode.window.showInformationMessage(`✅ Added new import`);
          }
        } catch (e) {
          console.error('Error adding import:', e);
          vscode.window.showErrorMessage(`Failed to add import: ${e.message}`);
        }
      })
    );

    // ===== Command: Remove Import =====
    context.subscriptions.push(
      vscode.commands.registerCommand('flutterjs.removeImport', async (lineNum) => {
        try {
          const editor = vscode.window.activeTextEditor;
          if (!editor) return;

          const doc = editor.document;
          const line = doc.lineAt(lineNum);

          await editor.edit(editBuilder => {
            editBuilder.delete(line.rangeIncludingLineBreak);
          });

          vscode.window.showInformationMessage('✅ Import removed');
        } catch (e) {
          console.error('Error removing import:', e);
        }
      })
    );

    console.log('✓ FlutterJS extension fully loaded');
  } catch (e) {
    console.error('Fatal error activating extension:', e);
    vscode.window.showErrorMessage(`Failed to activate FlutterJS: ${e.message}`);
  }
}

// ===== Diagnostics Update =====
function updateDiagnostics(document) {
  try {
    if (document.languageId !== 'fjs' && !document.fileName.endsWith('.fjs')) {
      return;
    }

    const diagnostics = [];
    const issues = analyzer.analyze(document.getText(), document.uri.fsPath);

    for (const issue of issues) {
      const range = new vscode.Range(
        new vscode.Position(issue.line, issue.column),
        new vscode.Position(issue.line, issue.column + issue.length)
      );

      const severity = 
        issue.severity === 'error' ? vscode.DiagnosticSeverity.Error :
        issue.severity === 'warning' ? vscode.DiagnosticSeverity.Warning :
        vscode.DiagnosticSeverity.Information;

      const diagnostic = new vscode.Diagnostic(range, issue.message, severity);
      diagnostic.source = 'FlutterJS';
      diagnostic.code = issue.code;

      diagnostics.push(diagnostic);
    }

    diagnosticsCollection.set(document.uri, diagnostics);
  } catch (e) {
    console.error('Error in updateDiagnostics:', e);
  }
}

// ===== Code Action Provider =====
class FlutterJSCodeActionProvider {
  constructor(analyzer) {
    this.analyzer = analyzer;
  }

  provideCodeActions(document, range, context, token) {
    try {
      const actions = [];

      for (const diagnostic of context.diagnostics) {
        if (diagnostic.source !== 'FlutterJS') continue;

        const code = diagnostic.code;
        const diagRange = diagnostic.range;

        // ===== MISSING-WIDGET-IMPORT =====
        if (code === 'MISSING-WIDGET-IMPORT') {
          const text = document.getText(diagRange).trim();
          const widget = this.findWidget(text);

          if (widget && this.analyzer.flutterWidgets[widget]) {
            const pkg = this.analyzer.flutterWidgets[widget];
            
            const action = new vscode.CodeAction(
              `Import '${widget}' from '${pkg.package}'`,
              vscode.CodeActionKind.QuickFix
            );
            action.command = {
              title: 'Add import',
              command: 'flutterjs.addImport',
              arguments: [pkg.package, [widget]]
            };
            action.isPreferred = true;
            actions.push(action);
          }
        }

        // ===== MISSING-FUNCTION-IMPORT =====
        if (code === 'MISSING-FUNCTION-IMPORT') {
          const text = document.getText(diagRange).trim();
          const pkg = this.analyzer.dartGlobals[text];

          if (pkg) {
            const action = new vscode.CodeAction(
              `Import '${text}' from '${pkg}'`,
              vscode.CodeActionKind.QuickFix
            );
            action.command = {
              title: 'Add import',
              command: 'flutterjs.addImport',
              arguments: [pkg, [text]]
            };
            action.isPreferred = true;
            actions.push(action);
          }
        }

        // ===== MISSING-RUNTIME-HELPER =====
        if (code === 'MISSING-RUNTIME-HELPER') {
          const text = document.getText(diagRange).trim();
          const helperInfo = this.analyzer.runtimeHelpers[text];

          if (helperInfo) {
            const action = new vscode.CodeAction(
              `Import runtime helper '${text}' from '${helperInfo.package}'`,
              vscode.CodeActionKind.QuickFix
            );
            action.command = {
              title: 'Add import',
              command: 'flutterjs.addImport',
              arguments: [helperInfo.package, [text]]
            };
            action.isPreferred = true;
            actions.push(action);

            // Info action
            const infoAction = new vscode.CodeAction(
              `ℹ️ ${helperInfo.description}`,
              vscode.CodeActionKind.Information
            );
            actions.push(infoAction);
          }
        }

        // ===== UNUSED-IMPORT =====
        if (code === 'UNUSED-IMPORT') {
          const action = new vscode.CodeAction(
            'Remove unused import',
            vscode.CodeActionKind.QuickFix
          );
          action.command = {
            title: 'Remove import',
            command: 'flutterjs.removeImport',
            arguments: [diagRange.start.line]
          };
          actions.push(action);
        }

        // ===== DART SYNTAX FIXES =====
        if (code && code.startsWith('DART-SYNTAX-')) {
          const text = document.getText(diagRange);
          let replacement = text;

          if (code === 'DART-SYNTAX-CONST-NEW') {
            replacement = text.replace(/const\s+new\s+/, 'new ');
          } else if (code === 'DART-SYNTAX-FINAL') {
            replacement = text.replace(/final\s+/, 'const ');
          } else if (code === 'DART-SYNTAX-LATE') {
            replacement = text.replace(/late\s+/, 'let ');
          } else if (code === 'DART-SYNTAX-OVERRIDE') {
            replacement = '// @override';
          } else if (code === 'DART-SYNTAX-CONST') {
            replacement = text.replace(/const\s+/, 'let ');
          }

          const action = new vscode.CodeAction(
            `Fix: ${text.trim().substring(0, 30)}...`,
            vscode.CodeActionKind.QuickFix
          );
          action.edit = new vscode.WorkspaceEdit();
          action.edit.replace(document.uri, diagRange, replacement);
          action.isPreferred = true;
          actions.push(action);
        }

        // ===== DART SETSTATE ERROR =====
        if (code === 'DART-SETSTATE-ERROR') {
          const action = new vscode.CodeAction(
            'Replace setState() with notifyListeners()',
            vscode.CodeActionKind.QuickFix
          );
          action.edit = new vscode.WorkspaceEdit();
          action.edit.replace(
            document.uri,
            diagRange,
            'this.notifyListeners() // Use ChangeNotifier or Provider'
          );
          actions.push(action);
        }
      }

      return actions;
    } catch (e) {
      console.error('Error in provideCodeActions:', e);
      return [];
    }
  }

  findWidget(text) {
    const match = text.match(/([A-Z][a-zA-Z0-9]*)/);
    return match ? match[1] : null;
  }
}

// ===== Utility: Debounce =====
function debounce(func, delay) {
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

function deactivate() {
  console.log('FlutterJS Pro Extension Deactivated');
}


export { activate,
  deactivate};