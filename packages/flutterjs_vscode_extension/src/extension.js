const vscode = require('vscode');
const { FJSAnalyzer } = require('./analyzer');

let analyzer;

function activate(context) {
  console.log('FlutterJS Analyzer activated!');

  analyzer = new FJSAnalyzer();
  const diagnosticsCollection = vscode.languages.createDiagnosticCollection('fjs');
  context.subscriptions.push(diagnosticsCollection);

  // Analyze on open
  if (vscode.window.activeTextEditor) {
    updateDiagnostics(vscode.window.activeTextEditor.document, diagnosticsCollection);
  }

  // Analyze on file change
  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (event.document.languageId === 'fjs') {
        updateDiagnostics(event.document, diagnosticsCollection);
      }
    },
    null,
    context.subscriptions
  );

  // Analyze on file open
  vscode.workspace.onDidOpenTextDocument(
    (document) => {
      if (document.languageId === 'fjs') {
        updateDiagnostics(document, diagnosticsCollection);
      }
    },
    null,
    context.subscriptions
  );

  // Analyze on tab switch
  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (editor && editor.document.languageId === 'fjs') {
        updateDiagnostics(editor.document, diagnosticsCollection);
      }
    },
    null,
    context.subscriptions
  );
}

function updateDiagnostics(document, collection) {
  if (document.languageId !== 'fjs') {
    return;
  }

  const diagnostics = [];
  const issues = analyzer.analyze(document.getText(), document.uri.fsPath);

  for (const issue of issues) {
    const range = new vscode.Range(
      new vscode.Position(issue.line, issue.column),
      new vscode.Position(issue.line, issue.column + issue.length)
    );

    const diagnostic = new vscode.Diagnostic(
      range,
      issue.message,
      issue.severity === 'error' 
        ? vscode.DiagnosticSeverity.Error 
        : vscode.DiagnosticSeverity.Warning
    );

    diagnostic.source = 'FlutterJS';
    diagnostic.code = issue.code;
    diagnostics.push(diagnostic);
  }

  collection.set(document.uri, diagnostics);
}

function deactivate() {
  console.log('FlutterJS Analyzer deactivated');
}

module.exports = {
  activate,
  deactivate
};