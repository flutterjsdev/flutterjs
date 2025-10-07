# Flutter.js Logic & Package Handling Architecture

A comprehensive overview of the logic storage, package handling, and transpilation strategies for Flutter.js

## 1. Logic Storage System (Parallel to UI IR)

### 1.1 Enhanced FlatBuffers Schema

```dart
// Core Logic Structures
table DartClass {
  name: string;
  type: ClassType; // StatefulWidget, StatelessWidget, Model, Service, etc.
  extends: string;
  implements: [string];
  mixins: [string];
  fields: [Field];
  constructors: [Constructor];
  methods: [Method];
  getters: [Getter];
  setters: [Setter];
  annotations: [Annotation];
  is_abstract: bool;
  source_package: string;
}
table Field {
  name: string;
  type: string;
  is_final: bool;
  is_static: bool;
  is_const: bool;
  initial_value: Expression;
  annotations: [Annotation];
}
table Method {
  name: string;
  return_type: string;
  parameters: [Parameter];
  body: MethodBody;
  is_async: bool;
  is_static: bool;
  is_override: bool;
  annotations: [Annotation];
}
table MethodBody {
  type: BodyType;
  statements: [Statement];
  complexity_score: int;
  uses_packages: [string];
  ast_json: string;
}
table Statement {
  type: StatementType;
  expression: Expression;
  children: [Statement];
}
table Expression {
  type: ExprType;
  value: string;
  operator: string;
  operands: [Expression];
  function_name: string;
  arguments: [Expression];
}
enum ClassType {
  StatefulWidget, StatelessWidget, DataModel, Service, Controller, Provider, Repository, Utility, Mixin, Extension
}
enum BodyType {
  Simple, Complex, External, Native, PackageBound
}
```

## 2. Package & Plugin Handling System

### 2.1 Package Classification

```dart
table PackageDependency {
  name: string;
  version: string;
  type: PackageType;
  mapping_strategy: MappingStrategy;
  web_equivalent: string;
  shim_required: bool;
  support_level: SupportLevel;
}
enum PackageType {
  CoreDart, FlutterFramework, StateManagement, Network, Storage, Navigation, UI, Utility, PlatformChannel, Unsupported
}
enum MappingStrategy {
  DirectTranspile, NPMReplacement, BrowserAPI, ShimLayer, RuntimeEmulation, Polyfill, Unsupported
}
enum SupportLevel {
  FullySupported, PartialSupport, ExperimentalSupport, NotSupported, RequiresManualImpl
}
```

### 2.2 Package Registry (Built-in Mappings)

```json
{
  "package_mappings": {
    "http": {
      "type": "Network",
      "strategy": "NPMReplacement",
      "web_equivalent": "axios@1.6.0",
      "mapping": {
        "http.get": "axios.get",
        "http.post": "axios.post",
        "Response": "AxiosResponse"
      },
      "support_level": "FullySupported"
    },
    "shared_preferences": {
      "type": "Storage",
      "strategy": "BrowserAPI",
      "web_equivalent": "localStorage",
      "shim_required": true,
      "shim_path": "@flutter-js/shared-preferences-shim",
      "support_level": "FullySupported"
    },
    "provider": {
      "type": "StateManagement",
      "strategy": "RuntimeEmulation",
      "runtime_module": "flutter-js/provider.js",
      "support_level": "PartialSupport",
      "notes": "context.watch() and basic Provider work"
    }
  }
}
```

## 3. Transpilation Strategies by Category

### 3.1 Strategy 1: Direct Dart-to-JS (Simple Logic)

For pure Dart classes with no Flutter dependencies.

**Input: models/user.dart**

```dart
class User {
  final String id;
  final String name;
  final int age;
  User({required this.id, required this.name, required this.age});
  bool get isAdult => age >= 18;
  Map toJson() {
    return {'id': id, 'name': name, 'age': age};
  }
}
```

**JS Output**

```javascript
class User {
  constructor({id, name, age}) {
    this.id = id;
    this.name = name;
    this.age = age;
  }
  get isAdult() {
    return this.age >= 18;
  }
  toJson() {
    return {id: this.id, name: this.name, age: this.age};
  }
}
```

## 5. Package Support Matrix

| Tier       | Package                | Status                    | Details                          |
|------------|------------------------|---------------------------|----------------------------------|
| Tier 1     | http                   | ✅ Fully Supported         | Replaced with axios/fetch        |
| Tier 1     | shared_preferences     | ✅ Fully Supported         | Uses localStorage                |
| Tier 2     | dio                    | ⚠️ Partial Support        | Limited interceptor support      |
| Tier 3     | camera                 | 🔬 Experimental           | Uses MediaDevices API            |
| Not Supported | flutter_bluetooth_serial | ❌ Not Supported         | Requires native code              |

## 10. Example: Full Counter App

**Input: lib/main.dart**

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'models/counter.dart';
void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => Counter(),
      child: MyApp(),
    ),
  );
}
class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: CounterPage(),
    );
  }
}
class CounterPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final counter = context.watch();
    return Scaffold(
      appBar: AppBar(title: Text('Counter')),
      body: Center(
        child: Text('Count: ${counter.count}'),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: counter.increment,
        child: Icon(Icons.add),
      ),
    );
  }
}
```

## Footer

Flutter.js Architecture Documentation | Generated on October 04, 2025