class SourceLocation {
  final int line;
  final int column;
  final int offset;
  final int length;

  SourceLocation({
    required this.line,
    required this.column,
    required this.offset,
    this.length = 0,
  });

  Map<String, dynamic> toJson() => {
    'line': line,
    'column': column,
    'offset': offset,
    'length': length,
  };

  factory SourceLocation.fromJson(Map<String, dynamic> json) {
    return SourceLocation(
      line: json['line'],
      column: json['column'],
      offset: json['offset'],
      length: json['length'] ?? 0,
    );
  }
}

enum WidgetType {
  statelessWidget,
  statefulWidget,
  inheritedWidget,
  customWidget,
}

enum ProviderType {
  changeNotifier,
  valueNotifier,
  streamProvider,
  futureProvider,
  stateNotifier,
}

enum FunctionType { topLevel, method, closure, callback }
