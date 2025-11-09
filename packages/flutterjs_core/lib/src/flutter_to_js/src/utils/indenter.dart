class Indenter {
  String _indent;
  int _level = 0;

  Indenter(this._indent);

  void indent() => _level++;
  void dedent() {
    if (_level > 0) _level--;
  }

  String get current => _indent * _level;
  String get next => _indent * (_level + 1);

  String line(String code) => '$current$code';
}
