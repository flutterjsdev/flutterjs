# Flutter.js IR Bridge - Dart Code Generator

**Language**: Dart  
**Input**: Binary IR (FlatBuffers)  
**Output**: Complete Flutter.js JavaScript Application  
**Integration**: Part of your Dart compiler pipeline

---

## Part B: Dart-Based IR Bridge

### Phase 9: IR Parser & Type Mapping (Weeks 19-20)

#### 9.1 FlatBuffers IR Reader (Dart)

```dart
// lib/bridge/ir_reader.dart
import 'package:flatbuffers/flatbuffers.dart' as fb;
import 'package:your_ir_package/generated/app_ir.dart';

class IRReader {
  late ByteBuffer _buffer;
  late AppIR _app;

  IRReader(List<int> bytes) {
    _buffer = ByteBuffer(bytes);
    _app = AppIR.getRootAsAppIR(_buffer, 0);
  }

  /// Read complete app structure from IR
  AppData readApp() {
    return AppData(
      version: _app.version,
      projectName: _app.projectName,
      metadata: _readMetadata(),
      theme: _readTheme(),
      routes: _readRoutes(),
      widgets: _readWidgets(),
      models: _readModels(),
      services: _readServices(),
    );
  }

  /// Read app metadata
  Metadata _readMetadata() {
    final meta = _app.metadata;
    return Metadata(
      appName: meta.appName,
      version: meta.version,
      supportsMPA: meta.supportsMPA,
      supportsSSR: meta.supportsSSR,
      targetPlatforms: List.generate(
        meta.platformsLength,
        (i) => meta.platforms(i),
      ),
    );
  }

  /// Read theme configuration
  ThemeData _readTheme() {
    final theme = _app.theme;
    if (theme == null) return ThemeData.defaultMaterial3();

    return ThemeData(
      useMaterial3: theme.useMaterial3,
      primaryColor: theme.primaryColor,
      colorScheme: _readColorScheme(theme),
      typography: _readTypography(theme),
      brightness: theme.brightness == 0 ? Brightness.light : Brightness.dark,
    );
  }

  /// Read Material color scheme
  ColorScheme _readColorScheme(ThemeIR theme) {
    final colors = <String, String>{};
    for (int i = 0; i < theme.colorsLength; i++) {
      final entry = theme.colors(i);
      colors[entry.name] = entry.value;
    }
    return ColorScheme.fromMap(colors);
  }

  /// Read typography system
  TypographyData _readTypography(ThemeIR theme) {
    final styles = <String, TextStyleData>{};
    for (int i = 0; i < theme.typographyLength; i++) {
      final typo = theme.typography(i);
      styles[typo.name] = TextStyleData(
        fontSize: typo.fontSize,
        fontWeight: typo.fontWeight,
        lineHeight: typo.lineHeight,
        letterSpacing: typo.letterSpacing,
      );
    }
    return TypographyData(styles);
  }

  /// Read all routes
  List<RouteData> _readRoutes() {
    final routes = <RouteData>[];
    for (int i = 0; i < _app.routesLength; i++) {
      final route = _app.routes(i);
      routes.add(RouteData(
        name: route.name,
        path: route.path,
        widgetId: route.widgetId,
        isPage: route.isPage,
        isMPA: route.isMPA,
        parameters: _readRouteParameters(route),
      ));
    }
    return routes;
  }

  /// Read route parameters
  List<ParameterData> _readRouteParameters(RouteIR route) {
    final params = <ParameterData>[];
    for (int i = 0; i < route.parametersLength; i++) {
      final param = route.parameters(i);
      params.add(ParameterData(
        name: param.name,
        type: param.type,
        isRequired: param.isRequired,
        defaultValue: param.defaultValue,
      ));
    }
    return params;
  }

  /// Read all widgets with their properties
  Map<String, WidgetData> _readWidgets() {
    final widgets = <String, WidgetData>{};
    for (int i = 0; i < _app.widgetsLength; i++) {
      final widget = _app.widgets(i);
      final data = _readWidget(widget);
      widgets[data.id] = data;
    }
    return widgets;
  }

  /// Read single widget recursively
  WidgetData _readWidget(WidgetIR widget) {
    return WidgetData(
      id: widget.id,
      type: widget.type,
      isStateful: widget.isStateful,
      isMaterial: widget.isMaterial,
      classification: WidgetClassification.values[widget.classification],
      props: _readProperties(widget),
      children: _readChildWidgets(widget),
      reactivityInfo: _readReactivity(widget),
      stateFields: _readStateFields(widget),
    );
  }

  /// Read widget properties
  Map<String, PropertyData> _readProperties(WidgetIR widget) {
    final props = <String, PropertyData>{};
    for (int i = 0; i < widget.propertiesLength; i++) {
      final prop = widget.properties(i);
      props[prop.name] = PropertyData(
        name: prop.name,
        value: prop.value,
        type: prop.type,
        isDynamic: prop.isDynamic,
        isRequired: prop.isRequired,
        defaultValue: prop.defaultValue,
      );
    }
    return props;
  }

  /// Read child widgets
  List<WidgetData> _readChildWidgets(WidgetIR widget) {
    final children = <WidgetData>[];
    for (int i = 0; i < widget.childrenLength; i++) {
      children.add(_readWidget(widget.children(i)));
    }
    return children;
  }

  /// Read reactivity information
  ReactivityInfo? _readReactivity(WidgetIR widget) {
    final info = widget.reactivityInfo;
    if (info == null) return null;

    return ReactivityInfo(
      triggers: _readTriggers(info),
      affectedProps: _readAffectedProps(info),
      propagatesToChildren: info.propagatesToChildren,
      strategy: RenderStrategy.values[info.renderStrategy],
    );
  }

  /// Read state fields for stateful widgets
  List<StateFieldData> _readStateFields(WidgetIR widget) {
    final fields = <StateFieldData>[];
    for (int i = 0; i < widget.stateFieldsLength; i++) {
      final field = widget.stateFields(i);
      fields.add(StateFieldData(
        name: field.name,
        type: field.type,
        initialValue: field.initialValue,
        isDynamic: field.isDynamic,
      ));
    }
    return fields;
  }

  /// Read reactivity triggers
  List<TriggerData> _readTriggers(ReactivityIR info) {
    final triggers = <TriggerData>[];
    for (int i = 0; i < info.triggersLength; i++) {
      final trigger = info.triggers(i);
      triggers.add(TriggerData(
        type: TriggerType.values[trigger.type],
        source: trigger.source,
      ));
    }
    return triggers;
  }

  /// Read affected properties
  List<String> _readAffectedProps(ReactivityIR info) {
    final props = <String>[];
    for (int i = 0; i < info.affectedPropsLength; i++) {
      props.add(info.affectedProps(i));
    }
    return props;
  }

  /// Read data models
  Map<String, ModelData> _readModels() {
    final models = <String, ModelData>{};
    for (int i = 0; i < _app.modelsLength; i++) {
      final model = _app.models(i);
      models[model.name] = ModelData(
        name: model.name,
        properties: _readModelProperties(model),
        methods: _readModelMethods(model),
        constructor: _readConstructor(model),
      );
    }
    return models;
  }

  /// Read model properties
  List<PropertyData> _readModelProperties(ModelIR model) {
    final props = <PropertyData>[];
    for (int i = 0; i < model.propertiesLength; i++) {
      final prop = model.properties(i);
      props.add(PropertyData(
        name: prop.name,
        type: prop.type,
        defaultValue: prop.defaultValue,
        isRequired: prop.isRequired,
      ));
    }
    return props;
  }

  /// Read model methods
  List<MethodData> _readModelMethods(ModelIR model) {
    final methods = <MethodData>[];
    for (int i = 0; i < model.methodsLength; i++) {
      final method = model.methods(i);
      methods.add(MethodData(
        name: method.name,
        parameters: _readMethodParameters(method),
        returnType: method.returnType,
        isAsync: method.isAsync,
        body: method.body,
      ));
    }
    return methods;
  }

  /// Read method parameters
  List<ParameterData> _readMethodParameters(MethodIR method) {
    final params = <ParameterData>[];
    for (int i = 0; i < method.parametersLength; i++) {
      final param = method.parameters(i);
      params.add(ParameterData(
        name: param.name,
        type: param.type,
        isRequired: param.isRequired,
      ));
    }
    return params;
  }

  /// Read constructor
  ConstructorData? _readConstructor(ModelIR model) {
    final ctor = model.constructor;
    if (ctor == null) return null;

    return ConstructorData(
      parameters: _readMethodParameters(ctor),
      body: ctor.body,
    );
  }

  /// Read services (non-UI classes)
  Map<String, ServiceData> _readServices() {
    final services = <String, ServiceData>{};
    for (int i = 0; i < _app.servicesLength; i++) {
      final service = _app.services(i);
      services[service.name] = ServiceData(
        name: service.name,
        methods: _readServiceMethods(service),
        properties: _readServiceProperties(service),
      );
    }
    return services;
  }

  List<MethodData> _readServiceMethods(ServiceIR service) {
    final methods = <MethodData>[];
    for (int i = 0; i < service.methodsLength; i++) {
      final method = service.methods(i);
      methods.add(MethodData(
        name: method.name,
        parameters: _readMethodParameters(method),
        returnType: method.returnType,
        isAsync: method.isAsync,
        body: method.body,
        isStatic: method.isStatic,
      ));
    }
    return methods;
  }

  List<PropertyData> _readServiceProperties(ServiceIR service) {
    final props = <PropertyData>[];
    for (int i = 0; i < service.propertiesLength; i++) {
      final prop = service.properties(i);
      props.add(PropertyData(
        name: prop.name,
        type: prop.type,
        defaultValue: prop.defaultValue,
        isStatic: prop.isStatic,
      ));
    }
    return props;
  }
}
```

**Deliverables**:
- [ ] Complete IR reader for binary format
- [ ] All data structures extracted
- [ ] Metadata, theme, routes parsed
- [ ] Widget tree preserved
- [ ] Models and services extracted
- [ ] Tests: parse sample IR files

**Effort**: 4-5 days

---

#### 9.2 Type Mapping (Dart)

```dart
// lib/bridge/type_mapper.dart
enum DartType {
  int,
  double,
  string,
  bool,
  list,
  map,
  future,
  stream,
  custom,
}

enum JavaScriptType {
  number,
  string,
  boolean,
  array,
  object,
  promise,
  any,
}

class TypeMapper {
  /// Map Dart type to JavaScript type
  static JavaScriptType dartToJS(String dartType) {
    switch (dartType) {
      case 'int':
      case 'double':
        return JavaScriptType.number;
      case 'String':
        return JavaScriptType.string;
      case 'bool':
        return JavaScriptType.boolean;
      case 'List':
        return JavaScriptType.array;
      case 'Map':
        return JavaScriptType.object;
      case 'Future':
        return JavaScriptType.promise;
      case 'Stream':
        return JavaScriptType.promise;
      default:
        return JavaScriptType.any;
    }
  }

  /// Convert Dart value to JavaScript literal
  static String serializeValue(dynamic value, String type) {
    if (value == null) return 'null';

    switch (type) {
      case 'String':
        return "'${_escapeString(value.toString())}'";
      case 'int':
      case 'double':
        return value.toString();
      case 'bool':
        return value.toString();
      case 'Color':
        return "'${_colorToHex(value)}'";
      case 'Offset':
        return '{ x: ${value['x']}, y: ${value['y']} }';
      case 'Size':
        return '{ width: ${value['width']}, height: ${value['height']} }';
      case 'EdgeInsets':
        return _edgeInsetsToCSS(value);
      case 'List':
        return '[${_serializeList(value)}]';
      case 'Map':
        return _serializeMap(value);
      default:
        return 'null';
    }
  }

  static String _escapeString(String s) {
    return s.replaceAll("'", "\\'").replaceAll('\n', '\\n').replaceAll('\t', '\\t');
  }

  static String _colorToHex(dynamic color) {
    if (color is String) return color;
    if (color is int) return '#${color.toRadixString(16).padLeft(8, '0')}';
    return '#000000';
  }

  static String _edgeInsetsToCSS(Map<String, dynamic> insets) {
    final top = insets['top'] ?? 0;
    final right = insets['right'] ?? 0;
    final bottom = insets['bottom'] ?? 0;
    final left = insets['left'] ?? 0;

    if (top == right && right == bottom && bottom == left) {
      return '{ all: $top }';
    }
    if (top == bottom && left == right) {
      return '{ vertical: $top, horizontal: $left }';
    }
    return '{ top: $top, right: $right, bottom: $bottom, left: $left }';
  }

  static String _serializeList(List<dynamic> items) {
    return items.map((item) => serializeValue(item, 'any')).join(', ');
  }

  static String _serializeMap(Map<String, dynamic> map) {
    final entries = map.entries
        .map((e) => "'${e.key}': ${serializeValue(e.value, 'any')}")
        .join(', ');
    return '{ $entries }';
  }

  /// Get JavaScript import for custom type
  static String? getImportForType(String type) {
    const customTypes = {
      'Color': "import { Colors } from '@flutterjs/material';",
      'TextStyle': "import { TextStyle } from '@flutterjs/material';",
      'BoxDecoration': "import { BoxDecoration } from '@flutterjs/material';",
      'EdgeInsets': "import { EdgeInsets } from '@flutterjs/material';",
    };
    return customTypes[type];
  }
}
```

**Deliverables**:
- [ ] Dart ↔ JavaScript type conversion
- [ ] Value serialization
- [ ] Color, Size, Offset, EdgeInsets conversion
- [ ] Import generation for custom types
- [ ] Tests: type conversions

**Effort**: 2-3 days

---

### Phase 10: Code Generators (Weeks 21-23)

#### 10.1 Widget Code Generator (Dart)

```dart
// lib/bridge/generators/widget_generator.dart
class WidgetCodeGenerator {
  final WidgetData widget;
  final ThemeData theme;
  final Map<String, WidgetData> allWidgets;

  WidgetCodeGenerator(
    this.widget,
    this.theme,
    this.allWidgets,
  );

  /// Generate complete widget class
  String generate() {
    if (widget.isStateful) {
      return _generateStatefulWidget();
    } else {
      return _generateStatelessWidget();
    }
  }

  /// Generate StatelessWidget
  String _generateStatelessWidget() {
    final className = widget.type;
    final props = _generatePropsInterface();
    final propsInit = _generatePropsInit();
    final buildBody = _generateBuildBody();

    return '''
function $className($props) {
  return new _$className($props);
}

class _$className extends StatelessWidget {
  constructor($propsInit) {
    super(props.key);
    this.props = props;
  }

  build(context) {
    const theme = MaterialTheme.of(context);
    $buildBody
  }
}
''';
  }

  /// Generate StatefulWidget
  String _generateStatefulWidget() {
    final className = widget.type;
    final stateClassName = '_${className}State';
    final props = _generatePropsInterface();
    final stateFields = _generateStateFields();
    final initStateBody = _generateInitState();
    final buildBody = _generateBuildBody();

    return '''
function $className($props) {
  return new _$className($props);
}

class _$className extends StatefulWidget {
  createState() {
    return new $stateClassName();
  }
}

class $stateClassName extends State {
  constructor() {
    super();
    $stateFields
  }

  initState() {
    super.initState();
    $initStateBody
  }

  build(context) {
    const theme = MaterialTheme.of(context);
    $buildBody
  }
}
''';
  }

  /// Generate props interface documentation
  String _generatePropsInterface() {
    final props = widget.props.values
        .where((p) => !p.isDynamic)
        .map((p) => '${p.name}: ${TypeMapper.dartToJS(p.type)}')
        .join(',\n  ');

    return props.isEmpty ? '{}' : '{\n  $props\n}';
  }

  /// Generate props initialization
  String _generatePropsInit() {
    final required = widget.props.values
        .where((p) => p.isRequired && !p.isDynamic)
        .map((p) => p.name)
        .join(', ');

    final optional = widget.props.values
        .where((p) => !p.isRequired && !p.isDynamic)
        .map((p) => '${p.name}${p.defaultValue != null ? ' = ${TypeMapper.serializeValue(p.defaultValue, p.type)}' : ''}')
        .join(', ');

    final all = [required, optional].where((s) => s.isNotEmpty).join(', ');
    return all.isEmpty ? '{}' : '{ $all } = {}';
  }

  /// Generate state field initializations
  String _generateStateFields() {
    return widget.stateFields
        .map((field) {
          final initializer = field.initialValue != null
              ? TypeMapper.serializeValue(field.initialValue, field.type)
              : 'null';
          return 'this.${field.name} = $initializer;';
        })
        .join('\n    ');
  }

  /// Generate initState body
  String _generateInitState() {
    // Look for initState in IR if available
    return '// Initialize state';
  }

  /// Generate build method body
  String _generateBuildBody() {
    if (widget.children.isEmpty) {
      return 'return Container({ child: Text("${widget.type}") });';
    }

    final child = widget.children.length == 1
        ? _generateWidgetCall(widget.children[0])
        : _generateMultipleChildren();

    return 'return $child;';
  }

  /// Generate widget instantiation call
  String _generateWidgetCall(WidgetData child) {
    final componentName = child.type;
    final props = _generateComponentProps(child);
    final children = child.children.isNotEmpty
        ? ', children: [${child.children.map(_generateWidgetCall).join(', ')}]'
        : '';

    return '$componentName({ $props$children })';
  }

  /// Generate props for a widget
  String _generateComponentProps(WidgetData w) {
    return w.props.entries
        .map((e) {
          final value = e.value.isDynamic
              ? 'this.${e.key}'
              : TypeMapper.serializeValue(e.value.value, e.value.type);
          return '${e.key}: $value';
        })
        .join(', ');
  }

  /// Generate multiple children (Column or Row)
  String _generateMultipleChildren() {
    final children = widget.children
        .map((c) => _generateWidgetCall(c))
        .join(', ');
    return 'Column({ children: [$children] })';
  }
}
```

**Deliverables**:
- [ ] Widget class generation (stateless & stateful)
- [ ] Props interface generation
- [ ] Build method generation
- [ ] Nested widget handling
- [ ] State field initialization
- [ ] Tests: generated widget validity

**Effort**: 5-6 days

---

#### 10.2 Route & Navigation Generator (Dart)

```dart
// lib/bridge/generators/route_generator.dart
class RouteCodeGenerator {
  final List<RouteData> routes;
  final Map<String, WidgetData> widgets;

  RouteCodeGenerator(this.routes, this.widgets);

  /// Generate router configuration
  String generateRouterConfig() {
    final routeConfigs = routes
        .map((route) => _generateRouteConfig(route))
        .join(',\n  ');

    return '''
const AppRoutes = [
  $routeConfigs
];

export const router = new Router({
  routes: AppRoutes,
  mode: '${routes.any((r) => r.isMPA) ? 'mpa' : 'spa'}'
});
''';
  }

  /// Generate single route config
  String _generateRouteConfig(RouteData route) {
    final widget = widgets[route.widgetId];
    final widgetName = widget?.type ?? 'Scaffold';

    return '''{
  name: '${route.name}',
  path: '${route.path}',
  component: $widgetName,
  isMPA: ${route.isMPA},
  ${route.parameters.isNotEmpty ? 'parameters: ${_generateParameters(route.parameters)},' : ''}
}''';
  }

  /// Generate parameters
  String _generateParameters(List<ParameterData> params) {
    final paramList = params
        .map((p) => '''{ name: '${p.name}', type: '${p.type}', required: ${p.isRequired} }''')
        .join(', ');
    return '[$paramList]';
  }

  /// Generate Navigator helper class
  String generateNavigatorHelper() {
    return '''
class AppNavigator {
  static routes = {
    ${routes.map((r) => "'${r.name}': '${r.path}'").join(',\n    ')}
  };

  static push(context, routeName, { arguments }) {
    Navigator.pushNamed(context, routeName, { arguments });
  }

  static pop(context, result) {
    Navigator.pop(context, result);
  }

  static replace(context, routeName, { arguments }) {
    Navigator.pushReplacementNamed(context, routeName, { arguments });
  }

  static get currentRoute() {
    return Navigator.currentRoute();
  }
}

export default AppNavigator;
''';
  }

  /// Generate route parameter parser
  String generateParameterParser() {
    return '''
class RouteParser {
  static parseParams(path, pattern) {
    // Dynamic route parameter extraction
    const regex = new RegExp(pattern.replace(/:[^/]+/g, '([^/]+)'));
    const match = path.match(regex);
    if (!match) return null;

    const params = {};
    let paramIndex = 1;
    pattern.split('/').forEach(segment => {
      if (segment.startsWith(':')) {
        params[segment.slice(1)] = match[paramIndex++];
      }
    });

    return params;
  }
}

export default RouteParser;
''';
  }
}
```

**Deliverables**:
- [ ] Router configuration generation
- [ ] Route parameter extraction
- [ ] Navigator helper class
- [ ] Dynamic route matching
- [ ] Tests: route generation

**Effort**: 3-4 days

---

#### 10.3 Model & Service Generator (Dart)

```dart
// lib/bridge/generators/model_generator.dart
class ModelCodeGenerator {
  final Map<String, ModelData> models;
  final Map<String, ServiceData> services;

  ModelCodeGenerator(this.models, this.services);

  /// Generate all models
  String generateModels() {
    return models.entries
        .map((e) => _generateModel(e.key, e.value))
        .join('\n\n');
  }

  /// Generate single model class
  String _generateModel(String name, ModelData model) {
    final constructor = _generateConstructor(name, model);
    final properties = _generateProperties(model);
    final methods = _generateMethods(model);
    final serialization = _generateSerialization(name, model);

    return '''
class $name {
  $constructor

  $properties

  $methods

  $serialization
}
''';
  }

  /// Generate constructor
  String _generateConstructor(String className, ModelData model) {
    final params = model.properties
        .map((p) => '${p.name}${p.defaultValue != null ? ' = ${TypeMapper.serializeValue(p.defaultValue, p.type)}' : ''}')
        .join(', ');

    final assignments = model.properties
        .map((p) => 'this.${p.name} = ${p.name};')
        .join('\n    ');

    return '''constructor($params) {
    $assignments
  }''';
  }

  /// Generate property declarations
  String _generateProperties(ModelData model) {
    return model.properties
        .map((p) => '// @type ${p.type}\n  ${p.name};')
        .join('\n  ');
  }

  /// Generate methods
  String _generateMethods(ModelData model) {
    return model.methods
        .map((m) => _generateMethod(m))
        .join('\n\n  ');
  }

  /// Generate single method
  String _generateMethod(MethodData method) {
    final params = method.parameters.map((p) => p.name).join(', ');
    final async = method.isAsync ? 'async ' : '';

    return '''${async}${method.name}($params) {
    ${method.body ?? '// TODO: implement'}
  }''';
  }

  /// Generate JSON serialization
  String _generateSerialization(String className, ModelData model) {
    final toJsonProps = model.properties
        .map((p) => '${p.name}: this.${p.name}')
        .join(',\n      ');

    final fromJsonParams = model.properties.map((p) => 'json.${p.name}').join(', ');

    return '''
  toJSON() {
    return {
      $toJsonProps
    };
  }

  static fromJSON(json) {
    return new $className($fromJsonParams);
  }

  static fromList(list) {
    return list.map(item => $className.fromJSON(item));
  }
''';
  }

  /// Generate all services
  String generateServices() {
    return services.entries
        .map((e) => _generateService(e.key, e.value))
        .join('\n\n');
  }

  /// Generate service class
  String _generateService(String name, ServiceData service) {
    final methods = _generateServiceMethods(service);
    final properties = _generateServiceProperties(service);

    return '''
export class $name {
  $properties

  $methods
}

export const ${_toLowerCamelCase(name)} = new $name();
''';
  }

  /// Generate service methods
  String _generateServiceMethods(ServiceData service) {
    return service.methods
        .map((m) {
          final params = m.parameters.map((p) => p.name).join(', ');
          final async = m.isAsync ? 'async ' : '';
          final isStatic = m.isStatic ? 'static ' : '';

          return '''${isStatic}${async}${m.name}($params) {
    ${m.body ?? 'return null;'}
  }''';
        })
        .join('\n\n  ');
  }

  /// Generate service properties
  String _generateServiceProperties(ServiceData service) {
    return service.properties
        .map((p) {
          final isStatic = p.isStatic ? 'static ' : '';
          return '${isStatic}${p.name} = null;';
        })
        .join('\n  ');
  }

  static String _toLowerCamelCase(String str) {
    if (str.isEmpty) return str;
    return str[0].toLowerCase() + str.substring(1);
  }
}
```

**Deliverables**:
- [ ] Model class generation with constructors
- [ ] Service class generation
- [ ] JSON serialization/deserialization
- [ ] Method code generation
- [ ] Tests: model and service generation

**Effort**: 4-5 days

---

### Phase 11: Build Pipeline Assembly (Weeks 24-25)

#### 11.1 Complete Build Orchestrator (Dart)

```dart
// lib/bridge/build_orchestrator.dart
import 'dart:io';
import 'package:path/path.dart' as path;

class BuildOrchestrator {
  final String irPath;
  final String outputDir;
  final bool minify;
  final bool obfuscate;
  
  late IRReader irReader;
  late AppData appData;
  late FileGenerator fileGenerator;

  BuildOrchestrator({
    required this.irPath,
    required this.outputDir,
    this.minify = true,
    this.obfuscate = true,
  });

  /// Main build entry point
  Future<BuildResult> build() async {
    try {
      print('🚀 Flutter.js Bridge Build Started');
      print('📂 Input IR: $irPath');
      print('📤 Output: $outputDir');

      // 1. Read binary IR
      print('\n📖 Reading IR file...');
      final irBytes = await File(irPath).readAsBytes();
      irReader = IRReader(irBytes);
      appData = irReader.readApp();
      print('✓ IR read successfully');
      print('  App: ${appData.metadata.appName}');
      print('  Widgets: ${appData.widgets.length}');
      print('  Routes: ${appData.routes.length}');
      print('  Models: ${appData.models.length}');

      // 2. Create output directory structure
      print('\n📁 Creating directories...');
      await _createDirectoryStructure();
      print('✓ Directories created');

      // 3. Generate widgets
      print('\n🎨 Generating widgets...');
      await _generateWidgets();
      print('✓ Generated ${appData.widgets.length} widgets');

      // 4. Generate models
      print('\n📦 Generating models...');
      await _generateModels();
      print('✓ Generated ${appData.models.length} models');

      // 5. Generate services
      print('\n🔧 Generating services...');
      await _generateServices();
      print('✓ Generated ${appData.services.length} services');

      // 6. Generate routes
      print('\n🛣️  Generating routes...');
      await _generateRoutes();
      print('✓ Generated ${appData.routes.length} routes');

      // 7. Generate app entry point
      print('\n📝 Generating app entry...');
      await _generateAppEntry();
      print('✓ App entry generated');

      // 8. Generate styles
      print('\n🎨 Generating CSS...');
      await _generateStyles();
      print('✓ Styles generated');

      // 9. Generate HTML
      print('\n🌐 Generating HTML...');
      await _generateHTML();
      print('✓ HTML generated');

      // 10. Copy framework files
      print('\n📚 Copying framework...');
      await _copyFramework();
      print('✓ Framework copied');

      // 11. Minification (optional)
      if (minify) {
        print('\n⚙️  Minifying...');
        await _minifyOutput();
        print('✓ Minified');
      }

      // 12. Obfuscation (optional)
      if (obfuscate) {
        print('\n🔐 Obfuscating...');
        await _obfuscateOutput();
        print('✓ Obfuscated');
      }

      print('\n✅ Build Complete!');
      return BuildResult(
        success: true,
        outputDir: outputDir,
        filesGenerated: await _countFiles(),
      );
    } catch (e) {
      print('❌ Build failed: $e');
      return BuildResult(
        success: false,
        error: e.toString(),
      );
    }
  }

  /// Create output directory structure
  Future<void> _createDirectoryStructure() async {
    final dirs = [
      outputDir,
      path.join(outputDir, 'widgets'),
      path.join(outputDir, 'models'),
      path.join(outputDir, 'services'),
      path.join(outputDir, 'routes'),
      path.join(outputDir, 'styles'),
      path.join(outputDir, 'pages'),
      path.join(outputDir, 'framework'),
      path.join(outputDir, 'static'),
    ];

    for (final dir in dirs) {
      await Directory(dir).create(recursive: true);
    }
  }

  /// Generate all widgets
  Future<void> _generateWidgets() async {
    for (final entry in appData.widgets.entries) {
      final widgetId = entry.key;
      final widget = entry.value;

      final generator = WidgetCodeGenerator(widget, appData.theme, appData.widgets);
      final code = generator.generate();

      final filename = _toKebabCase(widget.type);
      final filepath = path.join(outputDir, 'widgets', '$filename.js');

      await File(filepath).writeAsString(code);
    }

    // Generate widgets index
    final index = _generateWidgetsIndex();
    await File(path.join(outputDir, 'widgets', 'index.js')).writeAsString(index);
  }

  /// Generate widgets index file
  String _generateWidgetsIndex() {
    final imports = appData.widgets.values
        .map((w) => "export { _${w.type} as ${w.type} } from './${_toKebabCase(w.type)}.js';")
        .join('\n');

    return '''// Auto-generated widget exports
$imports
''';
  }

  /// Generate all models
  Future<void> _generateModels() async {
    final generator = ModelCodeGenerator(appData.models, appData.services);
    final code = generator.generateModels();

    await File(path.join(outputDir, 'models', 'index.js')).writeAsString(code);
  }

  /// Generate all services
  Future<void> _generateServices() async {
    final generator = ModelCodeGenerator(appData.models, appData.services);
    final code = generator.generateServices();

    await File(path.join(outputDir, 'services', 'index.js')).writeAsString(code);
  }

  /// Generate routes and navigation
  Future<void> _generateRoutes() async {
    final generator = RouteCodeGenerator(appData.routes, appData.widgets);

    // Route configuration
    final routerConfig = generator.generateRouterConfig();
    await File(path.join(outputDir, 'routes', 'router.js')).writeAsString(routerConfig);

    // Navigator helper
    final navigator = generator.generateNavigatorHelper();
    await File(path.join(outputDir, 'routes', 'navigator.js')).writeAsString(navigator);

    // Parameter parser
    final parser = generator.generateParameterParser();
    await File(path.join(outputDir, 'routes', 'parser.js')).writeAsString(parser);

    // Routes index
    final index = '''export { router } from './router.js';
export { default as Navigator } from './navigator.js';
export { default as RouteParser } from './parser.js';
''';
    await File(path.join(outputDir, 'routes', 'index.js')).writeAsString(index);
  }

  /// Generate app entry point
  Future<void> _generateAppEntry() async {
    final homeRoute = appData.routes.firstWhere(
      (r) => r.path == '/',
      orElse: () => appData.routes.first,
    );

    final homeWidget = appData.widgets[homeRoute.widgetId];
    final homeComponentName = homeWidget?.type ?? 'Scaffold';

    final code = '''
import { MaterialApp } from '@flutterjs/material';
import { router, Navigator } from './routes/index.js';
import * as Models from './models/index.js';
import * as Services from './services/index.js';
import * as Widgets from './widgets/index.js';

class MyApp extends StatelessWidget {
  build(context) {
    return MaterialApp({
      title: '${appData.metadata.appName}',
      theme: ${_generateThemeConfig()},
      home: Widgets.${homeComponentName}(),
      routes: router.routes
    });
  }
}

// Bootstrap application
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('app');
    if (!root) {
      console.error('App root element not found');
      return;
    }

    const app = new MyApp();
    const context = new BuildContext(null);
    const vnode = app.build(context);
    const dom = vnode.toDOM();
    root.appendChild(dom);

    // Initialize router
    router.init();
  });
}

export default MyApp;
''';

    await File(path.join(outputDir, 'app.js')).writeAsString(code);
  }

  /// Generate theme configuration
  String _generateThemeConfig() {
    final colorEntries = appData.theme.colorScheme.colors.entries
        .map((e) => "'${e.key}': '${e.value}'")
        .join(',\n      ');

    return '''new MaterialTheme({
      useMaterial3: ${appData.theme.useMaterial3},
      colorScheme: {
        $colorEntries
      }
    })''';
  }

  /// Generate CSS styles
  Future<void> _generateStyles() async {
    // Material Design tokens
    final tokens = _generateMaterialTokens();

    // Widget base styles
    final widgetStyles = _generateWidgetStyles();

    // Application-specific styles
    final appStyles = _generateAppStyles();

    final css = '''
/* Material Design 3 Tokens */
$tokens

/* Widget Styles */
$widgetStyles

/* Application Styles */
$appStyles
''';

    await File(path.join(outputDir, 'styles', 'main.css')).writeAsString(css);
  }

  /// Generate Material Design CSS variables
  String _generateMaterialTokens() {
    final colorVars = appData.theme.colorScheme.colors.entries
        .map((e) => '--md-sys-${_toKebabCase(e.key)}: ${e.value};')
        .join('\n  ');

    final typographyVars = appData.theme.typography.styles.entries
        .map((e) {
          final style = e.value;
          return '''--md-typescale-${_toKebabCase(e.key)}-size: ${style.fontSize}px;
  --md-typescale-${_toKebabCase(e.key)}-weight: ${style.fontWeight};
  --md-typescale-${_toKebabCase(e.key)}-line-height: ${style.lineHeight}px;''';
        })
        .join('\n  ');

    return '''
:root {
  $colorVars
  $typographyVars
}

@media (prefers-color-scheme: dark) {
  :root {
    /* Dark mode variants */
  }
}
''';
  }

  /// Generate widget CSS
  String _generateWidgetStyles() {
    return '''
.flutter-container {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.flutter-column {
  display: flex;
  flex-direction: column;
}

.flutter-row {
  display: flex;
  flex-direction: row;
}

.flutter-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.flutter-text {
  font-family: Roboto, sans-serif;
  margin: 0;
}

.flutter-button {
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-family: Roboto, sans-serif;
  transition: all 0.2s ease;
}

.flutter-button:hover {
  opacity: 0.8;
}

.flutter-card {
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  background-color: var(--md-sys-surface);
}
''';
  }

  /// Generate app-specific CSS
  String _generateAppStyles() {
    return '''
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  font-family: Roboto, sans-serif;
  background-color: var(--md-sys-background);
  color: var(--md-sys-on-background);
}

#app {
  width: 100%;
  height: 100%;
}
''';
  }

  /// Generate HTML entry file
  Future<void> _generateHTML() async {
    final html = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${appData.metadata.appName}">
  <title>${appData.metadata.appName}</title>
  
  <!-- Styles -->
  <link rel="stylesheet" href="styles/main.css">
</head>
<body>
  <div id="app"></div>

  <!-- Flutter.js Framework -->
  <script src="framework/core.js"></script>
  <script src="framework/material.js"></script>
  <script src="framework/router.js"></script>

  <!-- Models & Services -->
  <script src="models/index.js"></script>
  <script src="services/index.js"></script>

  <!-- Widgets -->
  <script src="widgets/index.js"></script>

  <!-- Routes -->
  <script src="routes/index.js"></script>

  <!-- Application -->
  <script src="app.js"></script>
</body>
</html>
''';

    await File(path.join(outputDir, 'index.html')).writeAsString(html);
  }

  /// Copy framework files
  Future<void> _copyFramework() async {
    // In real implementation, copy from framework distribution
    // For now, create placeholder
    final frameworkDir = Directory(path.join(outputDir, 'framework'));

    final coreJs = '''// Flutter.js Core Framework
// Auto-generated, do not edit

class Widget { /* ... */ }
class StatelessWidget extends Widget { /* ... */ }
class StatefulWidget extends Widget { /* ... */ }
class State { /* ... */ }
class BuildContext { /* ... */ }
class VNode { /* ... */ }

export { Widget, StatelessWidget, StatefulWidget, State, BuildContext, VNode };
''';

    await File(path.join(frameworkDir.path, 'core.js')).writeAsString(coreJs);
  }

  /// Minify output (placeholder)
  Future<void> _minifyOutput() async {
    // In real implementation, use a Dart minification library
    // or call external minifier
    print('  Minification would be performed here');
  }

  /// Obfuscate output (placeholder)
  Future<void> _obfuscateOutput() async {
    // In real implementation, use obfuscation library
    // or call external obfuscator
    print('  Obfuscation would be performed here');
  }

  /// Count generated files
  Future<int> _countFiles() async {
    int count = 0;
    await for (final entity in Directory(outputDir).list(recursive: true)) {
      if (entity is File) count++;
    }
    return count;
  }

  /// Convert string to kebab-case
  String _toKebabCase(String str) {
    return str
        .replaceAllMapped(RegExp(r'([A-Z])'), (m) => '-${m.group(1)!.toLowerCase()}')
        .replaceFirst(RegExp(r'^-'), '');
  }
}
```

**Deliverables**:
- [ ] Complete build orchestration
- [ ] Directory structure creation
- [ ] Sequential file generation
- [ ] Error handling and logging
- [ ] Build result reporting
- [ ] Tests: full build pipeline

**Effort**: 4-5 days

---

#### 11.2 Data Models (Dart)

```dart
// lib/bridge/models.dart
class AppData {
  final String version;
  final String projectName;
  final Metadata metadata;
  final ThemeData theme;
  final List<RouteData> routes;
  final Map<String, WidgetData> widgets;
  final Map<String, ModelData> models;
  final Map<String, ServiceData> services;

  AppData({
    required this.version,
    required this.projectName,
    required this.metadata,
    required this.theme,
    required this.routes,
    required this.widgets,
    required this.models,
    required this.services,
  });
}

class Metadata {
  final String appName;
  final String version;
  final bool supportsMPA;
  final bool supportsSSR;
  final List<String> targetPlatforms;

  Metadata({
    required this.appName,
    required this.version,
    required this.supportsMPA,
    required this.supportsSSR,
    required this.targetPlatforms,
  });
}

class ThemeData {
  final bool useMaterial3;
  final String primaryColor;
  final ColorScheme colorScheme;
  final TypographyData typography;
  final Brightness brightness;

  ThemeData({
    required this.useMaterial3,
    required this.primaryColor,
    required this.colorScheme,
    required this.typography,
    this.brightness = Brightness.light,
  });

  factory ThemeData.defaultMaterial3() {
    return ThemeData(
      useMaterial3: true,
      primaryColor: '#6750A4',
      colorScheme: ColorScheme.material3Light(),
      typography: TypographyData.material3(),
    );
  }
}

class ColorScheme {
  final Map<String, String> colors;

  ColorScheme({required this.colors});

  factory ColorScheme.fromMap(Map<String, String> map) {
    return ColorScheme(colors: map);
  }

  factory ColorScheme.material3Light() {
    return ColorScheme(
      colors: {
        'primary': '#6750A4',
        'onPrimary': '#FFFFFF',
        'primaryContainer': '#EADDFF',
        'onPrimaryContainer': '#21005D',
        'secondary': '#625B71',
        'onSecondary': '#FFFFFF',
        'secondaryContainer': '#E8DEF8',
        'onSecondaryContainer': '#1D192B',
        'tertiary': '#7D5260',
        'onTertiary': '#FFFFFF',
        'tertiaryContainer': '#FFD8E4',
        'onTertiaryContainer': '#31111D',
        'error': '#B3261E',
        'onError': '#FFFFFF',
        'errorContainer': '#F9DEDC',
        'onErrorContainer': '#410E0B',
        'background': '#FFFBFE',
        'onBackground': '#1C1B1F',
        'surface': '#FFFBFE',
        'onSurface': '#1C1B1F',
        'outline': '#79747E',
        'outlineVariant': '#CAC7D0',
      },
    );
  }
}

class TypographyData {
  final Map<String, TextStyleData> styles;

  TypographyData(this.styles);

  factory TypographyData.material3() {
    return TypographyData({
      'displayLarge': TextStyleData(fontSize: 57, fontWeight: 400, lineHeight: 64),
      'displayMedium': TextStyleData(fontSize: 45, fontWeight: 400, lineHeight: 52),
      'displaySmall': TextStyleData(fontSize: 36, fontWeight: 400, lineHeight: 44),
      'headlineLarge': TextStyleData(fontSize: 32, fontWeight: 400, lineHeight: 40),
      'headlineMedium': TextStyleData(fontSize: 28, fontWeight: 400, lineHeight: 36),
      'headlineSmall': TextStyleData(fontSize: 24, fontWeight: 400, lineHeight: 32),
      'titleLarge': TextStyleData(fontSize: 22, fontWeight: 500, lineHeight: 28),
      'titleMedium': TextStyleData(fontSize: 16, fontWeight: 500, lineHeight: 24),
      'titleSmall': TextStyleData(fontSize: 14, fontWeight: 500, lineHeight: 20),
      'bodyLarge': TextStyleData(fontSize: 16, fontWeight: 400, lineHeight: 24),
      'bodyMedium': TextStyleData(fontSize: 14, fontWeight: 400, lineHeight: 20),
      'bodySmall': TextStyleData(fontSize: 12, fontWeight: 400, lineHeight: 16),
      'labelLarge': TextStyleData(fontSize: 14, fontWeight: 500, lineHeight: 20),
      'labelMedium': TextStyleData(fontSize: 12, fontWeight: 500, lineHeight: 16),
      'labelSmall': TextStyleData(fontSize: 11, fontWeight: 500, lineHeight: 16),
    });
  }
}

class TextStyleData {
  final int fontSize;
  final int fontWeight;
  final int lineHeight;
  final double? letterSpacing;

  TextStyleData({
    required this.fontSize,
    required this.fontWeight,
    required this.lineHeight,
    this.letterSpacing,
  });
}

enum Brightness { light, dark }

class WidgetData {
  final String id;
  final String type;
  final bool isStateful;
  final bool isMaterial;
  final WidgetClassification classification;
  final Map<String, PropertyData> props;
  final List<WidgetData> children;
  final ReactivityInfo? reactivityInfo;
  final List<StateFieldData> stateFields;

  WidgetData({
    required this.id,
    required this.type,
    required this.isStateful,
    required this.isMaterial,
    required this.classification,
    required this.props,
    required this.children,
    this.reactivityInfo,
    required this.stateFields,
  });
}

enum WidgetClassification { stateless, stateful, function, nonUI }

class PropertyData {
  final String name;
  final dynamic value;
  final String type;
  final bool isDynamic;
  final bool isRequired;
  final dynamic defaultValue;
  final bool isStatic;

  PropertyData({
    required this.name,
    required this.value,
    required this.type,
    this.isDynamic = false,
    this.isRequired = false,
    this.defaultValue,
    this.isStatic = false,
  });
}

class StateFieldData {
  final String name;
  final String type;
  final dynamic initialValue;
  final bool isDynamic;

  StateFieldData({
    required this.name,
    required this.type,
    required this.initialValue,
    this.isDynamic = true,
  });
}

class ReactivityInfo {
  final List<TriggerData> triggers;
  final List<String> affectedProps;
  final bool propagatesToChildren;
  final RenderStrategy strategy;

  ReactivityInfo({
    required this.triggers,
    required this.affectedProps,
    required this.propagatesToChildren,
    required this.strategy,
  });
}

class TriggerData {
  final TriggerType type;
  final String source;

  TriggerData({required this.type, required this.source});
}

enum TriggerType { parentProps, setState, inherited, provider }
enum RenderStrategy { full, partial, static }

class RouteData {
  final String name;
  final String path;
  final String widgetId;
  final bool isPage;
  final bool isMPA;
  final List<ParameterData> parameters;

  RouteData({
    required this.name,
    required this.path,
    required this.widgetId,
    required this.isPage,
    required this.isMPA,
    required this.parameters,
  });
}

class ParameterData {
  final String name;
  final String type;
  final bool isRequired;
  final dynamic defaultValue;

  ParameterData({
    required this.name,
    required this.type,
    required this.isRequired,
    this.defaultValue,
  });
}

class ModelData {
  final String name;
  final List<PropertyData> properties;
  final List<MethodData> methods;
  final ConstructorData? constructor;

  ModelData({
    required this.name,
    required this.properties,
    required this.methods,
    this.constructor,
  });
}

class MethodData {
  final String name;
  final List<ParameterData> parameters;
  final String returnType;
  final bool isAsync;
  final String? body;
  final bool isStatic;

  MethodData({
    required this.name,
    required this.parameters,
    required this.returnType,
    this.isAsync = false,
    this.body,
    this.isStatic = false,
  });
}

class ConstructorData {
  final List<ParameterData> parameters;
  final String? body;

  ConstructorData({required this.parameters, this.body});
}

class ServiceData {
  final String name;
  final List<MethodData> methods;
  final List<PropertyData> properties;

  ServiceData({
    required this.name,
    required this.methods,
    required this.properties,
  });
}

class BuildResult {
  final bool success;
  final String? outputDir;
  final int filesGenerated;
  final String? error;

  BuildResult({
    required this.success,
    this.outputDir,
    this.filesGenerated = 0,
    this.error,
  });
}
```

**Deliverables**:
- [ ] All data model classes
- [ ] Default factory constructors
- [ ] Type-safe data structures
- [ ] Tests: model instantiation

**Effort**: 2-3 days

---

#### 11.3 CLI Entry Point (Dart)

```dart
// bin/flutter_js_bridge.dart
import 'package:args/args.dart';
import 'package:your_package/bridge/build_orchestrator.dart';

Future<void> main(List<String> arguments) async {
  final parser = ArgParser()
    ..addOption('input', abbr: 'i', help: 'Input IR file path', mandatory: true)
    ..addOption('output', abbr: 'o', help: 'Output directory', defaultsTo: './build')
    ..addFlag('minify', help: 'Minify output', defaultsTo: true)
    ..addFlag('obfuscate', help: 'Obfuscate JavaScript', defaultsTo: true)
    ..addFlag('verbose', abbr: 'v', help: 'Verbose output')
    ..addFlag('help', abbr: 'h', help: 'Show help');

  try {
    final results = parser.parse(arguments);

    if (results['help'] as bool) {
      print('Flutter.js IR Bridge\n');
      print(parser.usage);
      return;
    }

    final irPath = results['input'] as String;
    final outputDir = results['output'] as String;
    final minify = results['minify'] as bool;
    final obfuscate = results['obfuscate'] as bool;

    final orchestrator = BuildOrchestrator(
      irPath: irPath,
      outputDir: outputDir,
      minify: minify,
      obfuscate: obfuscate,
    );

    final result = await orchestrator.build();

    if (result.success) {
      print('\n🎉 Build succeeded!');
      print('📂 Output: ${result.outputDir}');
      print('📄 Files: ${result.filesGenerated}');
      exit(0);
    } else {
      print('\n❌ Build failed!');
      print('Error: ${result.error}');
      exit(1);
    }
  } catch (e) {
    print('Error: $e');
    print('\nUsage: dart run flutter_js_bridge --input <ir-file> [--output <dir>]');
    exit(1);
  }
}
```

**Deliverables**:
- [ ] Complete CLI tool
- [ ] Argument parsing
- [ ] Error messages
- [ ] Exit codes
- [ ] Help documentation

**Effort**: 1-2 days

---

## Timeline Summary

| Phase | Weeks | Focus | Deliverables |
|-------|-------|-------|--------------|
| **Part B: Dart Bridge** | | | |
| 9 | 19-20 | IR Parser | FlatBuffers reader, type mapping |
| 10 | 21-23 | Code Generators | Widgets, routes, models, services |
| 11 | 24-25 | Build Pipeline | Orchestration, CLI, output assembly |

**Total Bridge Development**: 7 weeks (19-25)

---

## Complete Project Timeline

| Section | Weeks | Total |
|---------|-------|-------|
| **Part A: JavaScript Framework** | 1-18 | 18 weeks |
| **Part B: Dart IR Bridge** | 19-25 | 7 weeks |
| **Testing & Polish** | 26+ | 2-4 weeks |

**Total to MVP**: 26-29 weeks (~6 months)

---

## Dart Bridge Architecture

```
Your Dart Compiler
    ↓
Binary IR (FlatBuffers)
    ↓
[flutter_js_bridge] ← Dart program
    ↓
IRReader
    ├─ Parse binary IR
    ├─ Extract metadata, routes, widgets, models
    └─ Type mapping
    ↓
Code Generators
    ├─ WidgetCodeGenerator → JavaScript widget classes
    ├─ RouteCodeGenerator → Router configuration
    ├─ ModelCodeGenerator → Model & service classes
    └─ ThemeCodeGenerator → Material Design CSS
    ↓
BuildOrchestrator
    ├─ Create directory structure
    ├─ Generate all files
    ├─ Generate HTML entry
    ├─ Copy framework
    ├─ Minify (optional)
    └─ Obfuscate (optional)
    ↓
Generated Flutter.js App
    ├─ index.html
    ├─ app.js
    ├─ widgets/
    ├─ routes/
    ├─ models/
    ├─ services/
    ├─ styles/
    └─ framework/