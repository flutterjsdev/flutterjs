// Flutter foundation/stack_frame.dart → JS

export class StackFrame {
  constructor({ number, column, line, packageScheme, package: pkg, packagePath, source, className, method, isConstructor }) {
    this.number = number;
    this.column = column;
    this.line = line;
    this.packageScheme = packageScheme;
    this.package = pkg;
    this.packagePath = packagePath;
    this.source = source;
    this.className = className;
    this.method = method;
    this.isConstructor = isConstructor;
  }

  static get asynchronousSuspension() {
    return new StackFrame({ number: -1, column: -1, line: -1, packageScheme: '', package: '', packagePath: '', source: '<asynchronous suspension>', className: '', method: '<asynchronous suspension>', isConstructor: false });
  }

  static get stackOverFlow() {
    return new StackFrame({ number: -1, column: -1, line: -1, packageScheme: '', package: '', packagePath: '', source: '<stack overflow>', className: '', method: '<stack overflow>', isConstructor: false });
  }

  static fromStackString(stack) {
    return stack.split('\n').map((line, i) => StackFrame._parseLine(line, i)).filter(f => f !== null);
  }

  static _parseLine(line, number) {
    // Parse Chrome-style: "    at ClassName.method (source:line:col)"
    const chromeMatch = line.match(/^\s+at\s+(?:(\w+)\.)?(\w+)\s+\((.+):(\d+):(\d+)\)/);
    if (chromeMatch) {
      return new StackFrame({
        number,
        column: parseInt(chromeMatch[5]),
        line: parseInt(chromeMatch[4]),
        packageScheme: '',
        package: '',
        packagePath: chromeMatch[3],
        source: line.trim(),
        className: chromeMatch[1] ?? '',
        method: chromeMatch[2],
        isConstructor: false,
      });
    }
    return null;
  }

  toString() {
    return `#${this.number} ${this.className}.${this.method} (${this.packagePath}:${this.line}:${this.column})`;
  }
}
