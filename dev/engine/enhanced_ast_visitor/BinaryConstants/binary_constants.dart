// // ============================================================================
// // Flutter.js Binary IR Format Specification & Implementation
// // ============================================================================
// // 
// // This implements a compact binary format for serializing Flutter IR to disk.
// // Benefits:
// // - 10-20x smaller than JSON
// // - Faster parsing (no string parsing overhead)
// // - Type-safe deserialization
// // - Supports forward/backward compatibility via versioning
// //
// // Binary Format Layout:
// // [Header][String Table][Type Table][IR Nodes]
// //
// // ============================================================================
// import 'dart:typed_data';
// import 'dart:convert';

// import 'binary_constants.dart';
// import '../ir/file_ir.dart';
// import '../ir/widget/widget_ir.dart';
// import '../ir/Expression/expression_ir.dart';
// import '../ir/Statement/statement_ir.dart';
// import '../../analyzer/analying_project.dart';
// import 'dart:typed_data';
// import 'dart:convert';

// import '../ir/Expression/expression_ir.dart';
// import '../ir/Statement/statement_ir.dart';

// import '../ir/widget/widget_ir.dart';

// // ============================================================================
// // BINARY FORMAT CONSTANTS
// // ============================================================================

// class BinaryConstants {
//   // Magic number to identify Flutter IR files
//   static const int MAGIC_NUMBER = 0x464C5452; // "FLTR" in hex
  
//   // Version
//   static const int FORMAT_VERSION = 2;
  
//   // Node type identifiers (1 byte each)
//   static const int TYPE_NULL = 0x00;
//   static const int TYPE_WIDGET = 0x01;
//   static const int TYPE_STATE_CLASS = 0x02;
//   static const int TYPE_EXPRESSION = 0x03;
//   static const int TYPE_STATEMENT = 0x04;
//   static const int TYPE_FUNCTION = 0x05;
//   static const int TYPE_ROUTE = 0x06;
//   static const int TYPE_ANIMATION = 0x07;
//   static const int TYPE_PROVIDER = 0x08;
//   static const int TYPE_IMPORT = 0x09;
//   static const int TYPE_THEME = 0x0A;
  
//   // Expression subtypes
//   static const int EXPR_LITERAL = 0x10;
//   static const int EXPR_IDENTIFIER = 0x11;
//   static const int EXPR_BINARY = 0x12;
//   static const int EXPR_UNARY = 0x13;
//   static const int EXPR_METHOD_CALL = 0x14;
//   static const int EXPR_PROPERTY_ACCESS = 0x15;
//   static const int EXPR_CONDITIONAL = 0x16;
//   static const int EXPR_FUNCTION = 0x17;
//   static const int EXPR_LIST = 0x18;
//   static const int EXPR_MAP = 0x19;
//   static const int EXPR_AWAIT = 0x1A;
//   static const int EXPR_AS = 0x1B;
//   static const int EXPR_IS = 0x1C;
  
//   // Statement subtypes
//   static const int STMT_BLOCK = 0x20;
//   static const int STMT_EXPRESSION = 0x21;
//   static const int STMT_VAR_DECL = 0x22;
//   static const int STMT_IF = 0x23;
//   static const int STMT_FOR = 0x24;
//   static const int STMT_FOREACH = 0x25;
//   static const int STMT_WHILE = 0x26;
//   static const int STMT_DO_WHILE = 0x27;
//   static const int STMT_SWITCH = 0x28;
//   static const int STMT_TRY = 0x29;
//   static const int STMT_RETURN = 0x2A;
//   static const int STMT_BREAK = 0x2B;
//   static const int STMT_CONTINUE = 0x2C;
//   static const int STMT_THROW = 0x2D;
// }

// // ============================================================================
// // BINARY WRITER
// // ============================================================================

// // lib/src/serialization/binary_file_ir_serializer.dart



// // ============================================================================
// // BINARY FILE IR WRITER
// // ============================================================================

// class BinaryIRWriter {
//   final BytesBuilder _buffer = BytesBuilder();
//   final List<String> _stringTable = [];
//   final Map<String, int> _stringIndices = {};
  
//   /// Writes a FileIR to binary format
//   Uint8List writeFileIR(FileIR fileIR) {
//     _buffer.clear();
//     _stringTable.clear();
//     _stringIndices.clear();
    
//     // Phase 1: Collect all strings
//     _collectStringsFromFileIR(fileIR);
    
//     // Phase 2: Write header
//     _writeHeader();
    
//     // Phase 3: Write string table
//     _writeStringTable();
    
//     // Phase 4: Write FileIR data
//     _writeFileIRData(fileIR);
    
//     return _buffer.toBytes();
//   }
  
//   // --------------------------------------------------------------------------
//   // HEADER WRITING
//   // --------------------------------------------------------------------------
  
//   void _writeHeader() {
//     // Magic number (4 bytes) - "FLIR" for Flutter IR File
//     _writeUint32(0x464C4952);
    
//     // Format version (2 bytes)
//     _writeUint16(BinaryConstants.FORMAT_VERSION);
    
//     // Reserved for future use (2 bytes)
//     _writeUint16(0);
//   }
  
//   // --------------------------------------------------------------------------
//   // STRING TABLE COLLECTION
//   // --------------------------------------------------------------------------
  
//   void _collectStringsFromFileIR(FileIR fileIR) {
//     // File metadata
//     _addString(fileIR.filePath);
//     _addString(fileIR.contentHash);
    
//     if (fileIR.metadata.documentation != null) {
//       _addString(fileIR.metadata.documentation!);
//     }
//     if (fileIR.metadata.libraryName != null) {
//       _addString(fileIR.metadata.libraryName!);
//     }
//     if (fileIR.metadata.partOf != null) {
//       _addString(fileIR.metadata.partOf!);
//     }
    
//     for (var part in fileIR.metadata.parts) {
//       _addString(part);
//     }
    
//     // Widgets
//     for (var widget in fileIR.widgets) {
//       _collectStringsFromWidget(widget);
//     }
    
//     // State classes
//     for (var state in fileIR.stateClasses) {
//       _collectStringsFromStateClass(state);
//     }
    
//     // Classes
//     for (var cls in fileIR.classes) {
//       _collectStringsFromClass(cls);
//     }
    
//     // Functions
//     for (var func in fileIR.functions) {
//       _collectStringsFromFunction(func);
//     }
    
//     // Providers
//     for (var provider in fileIR.providers) {
//       _collectStringsFromProvider(provider);
//     }
    
//     // Imports
//     for (var import in fileIR.imports) {
//       _addString(import.uri);
//       if (import.prefix != null) _addString(import.prefix!);
//       if (import.alias != null) _addString(import.alias!);
//     }
    
//     // Exports
//     for (var export in fileIR.exports) {
//       _addString(export);
//     }
    
//     // Dependencies
//     for (var dep in fileIR.dependencies) {
//       _addString(dep);
//     }
    
//     // Dependents
//     for (var dep in fileIR.dependents) {
//       _addString(dep);
//     }
    
//     // Issues
//     for (var issue in fileIR.issues) {
//       _addString(issue.message);
//       _addString(issue.code);
//       _addString(issue.location.file);
//       if (issue.correction != null) _addString(issue.correction!);
//       for (var msg in issue.contextMessages) {
//         _addString(msg);
//       }
//     }
//   }
  
//   void _collectStringsFromWidget(WidgetIR widget) {
//     _addString(widget.id);
//     _addString(widget.name);
//     _addString(widget.type);
//     _addString(widget.sourceLocation.file);
    
//     // Properties
//     for (var prop in widget.properties) {
//       _addString(prop.name);
//       if (prop.value != null) {
//         _collectStringsFromExpression(prop.value!);
//       }
//     }
    
//     // Fields
//     for (var field in widget.fields) {
//       _addString(field.name);
//       _addString(field.type.name);
//     }
    
//     // Recursively collect from children
//     for (var child in widget.children) {
//       _collectStringsFromWidget(child);
//     }
    
//     // Event handlers
//     for (var handler in widget.eventHandlers) {
//       _addString(handler.eventName);
//       _addString(handler.handlerName);
//     }
    
//     // Annotations
//     for (var annotation in widget.annotations) {
//       _addString(annotation.name);
//     }
//   }
  
//   void _collectStringsFromStateClass(StateClassIR state) {
//     _addString(state.id);
//     _addString(state.name);
//     _addString(state.widgetType);
//     _addString(state.sourceLocation.file);
    
//     // State fields
//     for (var field in state.stateFields) {
//       _addString(field.name);
//       _addString(field.type.name);
//       if (field.initializer != null) {
//         _collectStringsFromExpression(field.initializer!);
//       }
//     }
    
//     // Regular fields
//     for (var field in state.regularFields) {
//       _addString(field.name);
//       _addString(field.type.name);
//     }
    
//     // Controllers
//     for (var controller in state.controllers) {
//       _addString(controller.name);
//       _addString(controller.type);
//     }
//   }
  
//   void _collectStringsFromClass(ClassIR cls) {
//     _addString(cls.name);
//     if (cls.superclass != null) _addString(cls.superclass!);
    
//     for (var field in cls.fields) {
//       _addString(field.name);
//       _addString(field.type.name);
//     }
    
//     for (var method in cls.methods) {
//       _addString(method.name);
//     }
//   }
  
//   void _collectStringsFromFunction(FunctionIR func) {
//     _addString(func.name);
//     _addString(func.returnType.name);
    
//     for (var param in func.parameters) {
//       _addString(param.name);
//       _addString(param.type.name);
//     }
//   }
  
//   void _collectStringsFromProvider(ProviderIR provider) {
//     _addString(provider.name);
//     _addString(provider.type);
    
//     for (var field in provider.fields) {
//       _addString(field.name);
//       _addString(field.type.name);
//     }
//   }
  
//   void _collectStringsFromExpression(ExpressionIR expr) {
//     _addString(expr.id);
//     _addString(expr.resultType.name);
//     _addString(expr.sourceLocation.file);
    
//     if (expr is LiteralExpressionIR) {
//       if (expr.literalType == LiteralType.string && expr.value is String) {
//         _addString(expr.value as String);
//       }
//     } else if (expr is IdentifierExpressionIR) {
//       _addString(expr.name);
//     } else if (expr is BinaryExpressionIR) {
//       _collectStringsFromExpression(expr.left);
//       _collectStringsFromExpression(expr.right);
//     } else if (expr is MethodCallExpressionIR) {
//       _addString(expr.methodName);
//       if (expr.target != null) {
//         _collectStringsFromExpression(expr.target!);
//       }
//       for (var arg in expr.arguments) {
//         _collectStringsFromExpression(arg);
//       }
//       for (var entry in expr.namedArguments.entries) {
//         _addString(entry.key);
//         _collectStringsFromExpression(entry.value);
//       }
//     }
//   }
  
//   void _addString(String str) {
//     if (!_stringIndices.containsKey(str)) {
//       _stringIndices[str] = _stringTable.length;
//       _stringTable.add(str);
//     }
//   }
  
//   int _getStringIndex(String str) {
//     return _stringIndices[str] ?? -1;
//   }
  
//   // --------------------------------------------------------------------------
//   // STRING TABLE WRITING
//   // --------------------------------------------------------------------------
  
//   void _writeStringTable() {
//     // Number of strings (4 bytes)
//     _writeUint32(_stringTable.length);
    
//     // Each string: [length (2 bytes)][UTF-8 bytes]
//     for (var str in _stringTable) {
//       final bytes = utf8.encode(str);
//       if (bytes.length > 65535) {
//         throw Exception('String too long: ${str.substring(0, 50)}...');
//       }
//       _writeUint16(bytes.length);
//       _buffer.add(bytes);
//     }
//   }
  
//   // --------------------------------------------------------------------------
//   // FILE IR WRITING
//   // --------------------------------------------------------------------------
  
//   void _writeFileIRData(FileIR fileIR) {
//     // File path and hash
//     _writeStringRef(fileIR.filePath);
//     _writeStringRef(fileIR.contentHash);
    
//     // Metadata
//     _writeFileMetadata(fileIR.metadata);
    
//     // Widgets
//     _writeArray(fileIR.widgets, _writeWidget);
    
//     // State classes
//     _writeArray(fileIR.stateClasses, _writeStateClass);
    
//     // Classes
//     _writeArray(fileIR.classes, _writeClass);
    
//     // Functions
//     _writeArray(fileIR.functions, _writeFunction);
    
//     // Providers
//     _writeArray(fileIR.providers, _writeProvider);
    
//     // Imports
//     _writeArray(fileIR.imports, _writeImportInfo);
    
//     // Exports
//     _writeArray(fileIR.exports, _writeStringRef);
    
//     // Dependencies
//     _writeArray(fileIR.dependencies, _writeStringRef);
    
//     // Dependents
//     _writeArray(fileIR.dependents, _writeStringRef);
    
//     // Issues
//     _writeArray(fileIR.issues, _writeAnalysisIssue);
//   }
  
//   void _writeFileMetadata(FileMetadata metadata) {
//     _writeOptionalString(metadata.documentation);
//     _writeOptionalString(metadata.libraryName);
//     _writeOptionalString(metadata.partOf);
//     _writeArray(metadata.parts, _writeStringRef);
//     _writeArray(metadata.annotations, _writeAnnotation);
//     _writeUint64(metadata.analyzedAt.millisecondsSinceEpoch);
//     _writeStringRef(metadata.analyzerVersion);
//   }
  
//   void _writeWidget(WidgetIR widget) {
//     _writeStringRef(widget.id);
//     _writeStringRef(widget.name);
//     _writeStringRef(widget.type);
//     _writeByte(widget.classification.index);
//     _writeBool(widget.isStateful);
    
//     // Properties
//     _writeArray(widget.properties, _writeProperty);
    
//     // Fields
//     _writeArray(widget.fields, _writeField);
    
//     // Constructor
//     _writeOptional(widget.constructor, _writeConstructor);
    
//     // Build method
//     _writeOptional(widget.buildMethod, _writeBuildMethod);
    
//     // Children (recursive)
//     _writeArray(widget.children, _writeWidget);
    
//     // Widget tree
//     _writeOptional(widget.widgetTree, _writeWidgetTree);
    
//     // Reactivity info
//     _writeOptional(widget.reactivityInfo, _writeReactivityInfo);
    
//     // State binding
//     _writeOptional(widget.stateBinding, _writeStateBinding);
    
//     // Lifecycle methods
//     _writeArray(widget.lifecycleMethods, _writeLifecycleMethod);
    
//     // Event handlers
//     _writeArray(widget.eventHandlers, _writeEventHandler);
    
//     // Key
//     _writeOptional(widget.key, _writeKey);
    
//     // Annotations
//     _writeArray(widget.annotations, _writeAnnotation);
    
//     // Source location
//     _writeSourceLocation(widget.sourceLocation);
//   }
  
//   void _writeStateClass(StateClassIR state) {
//     _writeStringRef(state.id);
//     _writeStringRef(state.name);
//     _writeStringRef(state.widgetType);
    
//     // State fields
//     _writeArray(state.stateFields, _writeStateField);
    
//     // Regular fields
//     _writeArray(state.regularFields, _writeField);
    
//     // Lifecycle methods
//     _writeOptional(state.initState, _writeLifecycleMethod);
//     _writeOptional(state.dispose, _writeLifecycleMethod);
//     _writeOptional(state.didUpdateWidget, _writeLifecycleMethod);
//     _writeOptional(state.didChangeDependencies, _writeLifecycleMethod);
//     _writeOptional(state.reassemble, _writeLifecycleMethod);
    
//     // Build method
//     _writeBuildMethod(state.buildMethod);
    
//     // setState calls
//     _writeArray(state.setStateCalls, _writeSetStateCall);
    
//     // Controllers
//     _writeArray(state.controllers, _writeController);
    
//     // Context dependencies
//     _writeArray(state.contextDependencies, _writeContextDependency);
    
//     // Mixins
//     _writeArray(state.mixins, _writeMixin);
    
//     // Source location
//     _writeSourceLocation(state.sourceLocation);
//   }
  
//   void _writeClass(ClassIR cls) {
//     _writeStringRef(cls.name);
//     _writeOptionalString(cls.superclass);
//     _writeArray(cls.interfaces, _writeStringRef);
//     _writeArray(cls.mixins, _writeStringRef);
//     _writeArray(cls.fields, _writeField);
//     _writeArray(cls.methods, _writeMethod);
//     _writeBool(cls.isAbstract);
//   }
  
//   void _writeFunction(FunctionIR func) {
//     _writeStringRef(func.name);
//     _writeType(func.returnType);
//     _writeArray(func.parameters, _writeParameter);
//     _writeBool(func.isAsync);
//     _writeBool(func.isGenerator);
//     _writeOptional(func.body, _writeStatement);
//   }
  
//   void _writeProvider(ProviderIR provider) {
//     _writeStringRef(provider.name);
//     _writeStringRef(provider.type);
//     _writeArray(provider.fields, _writeField);
//     _writeArray(provider.methods, _writeMethod);
//     _writeBool(provider.notifiesListeners);
//   }
  
//   void _writeImportInfo(ImportInfo import) {
//     _writeStringRef(import.uri);
//     _writeOptionalString(import.prefix);
//     _writeOptionalString(import.alias);
//     _writeBool(import.isDeferred);
//     _writeArray(import.showCombinators, _writeStringRef);
//     _writeArray(import.hideCombinators, _writeStringRef);
//   }
  
//   void _writeAnalysisIssue(AnalysisIssue issue) {
//     _writeByte(issue.severity.index);
//     _writeStringRef(issue.message);
//     _writeStringRef(issue.code);
//     _writeSourceLocation(issue.location);
//     _writeOptionalString(issue.correction);
//     _writeArray(issue.contextMessages, _writeStringRef);
//   }
  
//   // --------------------------------------------------------------------------
//   // PRIMITIVE TYPE WRITERS
//   // --------------------------------------------------------------------------
  
//   void _writeByte(int value) {
//     _buffer.addByte(value & 0xFF);
//   }
  
//   void _writeBool(bool value) {
//     _buffer.addByte(value ? 1 : 0);
//   }
  
//   void _writeUint16(int value) {
//     _buffer.add([value & 0xFF, (value >> 8) & 0xFF]);
//   }
  
//   void _writeUint32(int value) {
//     _buffer.add([
//       value & 0xFF,
//       (value >> 8) & 0xFF,
//       (value >> 16) & 0xFF,
//       (value >> 24) & 0xFF,
//     ]);
//   }
  
//   void _writeUint64(int value) {
//     final bytes = ByteData(8);
//     bytes.setUint64(0, value, Endian.little);
//     _buffer.add(bytes.buffer.asUint8List());
//   }
  
//   void _writeInt64(int value) {
//     final bytes = ByteData(8);
//     bytes.setInt64(0, value, Endian.little);
//     _buffer.add(bytes.buffer.asUint8List());
//   }
  
//   void _writeFloat64(double value) {
//     final bytes = ByteData(8);
//     bytes.setFloat64(0, value, Endian.little);
//     _buffer.add(bytes.buffer.asUint8List());
//   }
  
//   void _writeStringRef(String str) {
//     _writeUint32(_getStringIndex(str));
//   }
  
//   void _writeOptionalString(String? str) {
//     if (str == null) {
//       _writeBool(false);
//     } else {
//       _writeBool(true);
//       _writeStringRef(str);
//     }
//   }
  
//   void _writeType(TypeIR type) {
//     _writeStringRef(type.name);
//     _writeBool(type.isNullable);
//   }
  
//   void _writeSourceLocation(SourceLocationIR loc) {
//     _writeStringRef(loc.file);
//     _writeUint32(loc.line);
//     _writeUint32(loc.column);
//     _writeUint32(loc.offset);
//     _writeUint32(loc.length);
//   }
  
//   // --------------------------------------------------------------------------
//   // COLLECTION WRITERS
//   // --------------------------------------------------------------------------
  
//   void _writeArray<T>(List<T> items, void Function(T) writer) {
//     _writeUint32(items.length);
//     for (var item in items) {
//       writer(item);
//     }
//   }
  
//   void _writeMap<K, V>(
//     Map<K, V> map,
//     void Function(K) keyWriter,
//     void Function(V) valueWriter,
//   ) {
//     _writeUint32(map.length);
//     for (var entry in map.entries) {
//       keyWriter(entry.key);
//       valueWriter(entry.value);
//     }
//   }
  
//   void _writeOptional<T>(T? value, void Function(T) writer) {
//     if (value == null) {
//       _writeBool(false);
//     } else {
//       _writeBool(true);
//       writer(value);
//     }
//   }
  
//   // Placeholder methods (implement as needed based on your IR structure)
//   void _writeProperty(PropertyIR prop) {
//     _writeStringRef(prop.name);
//     _writeType(prop.type);
//     _writeOptional(prop.value, _writeExpression);
//     _writeBool(prop.isRequired);
//     _writeBool(prop.isNamed);
//   }
  
//   void _writeField(FieldIR field) {
//     _writeStringRef(field.name);
//     _writeType(field.type);
//     _writeBool(field.isFinal);
//     _writeBool(field.isStatic);
//     _writeBool(field.isLate);
//     _writeOptional(field.initializer, _writeExpression);
//   }
  
//   void _writeStateField(StateFieldIR field) {
//     _writeStringRef(field.name);
//     _writeType(field.type);
//     _writeBool(field.isMutable);
//     _writeOptional(field.initializer, _writeExpression);
//   }
  
//   void _writeParameter(ParameterIR param) {
//     _writeStringRef(param.name);
//     _writeType(param.type);
//     _writeBool(param.isRequired);
//     _writeBool(param.isNamed);
//     _writeBool(param.isPositional);
//     _writeOptional(param.defaultValue, _writeExpression);
//   }
  
//   void _writeMethod(MethodIR method) {
//     _writeStringRef(method.name);
//     _writeType(method.returnType);
//     _writeArray(method.parameters, _writeParameter);
//     _writeBool(method.isAsync);
//     _writeBool(method.isStatic);
//     _writeOptional(method.body, _writeStatement);
//   }
  
//   void _writeExpression(ExpressionIR expr) {
//     // Write expression type discriminator
//     if (expr is LiteralExpressionIR) {
//       _writeByte(BinaryConstants.EXPR_LITERAL);
//       _writeLiteralExpression(expr);
//     } else if (expr is IdentifierExpressionIR) {
//       _writeByte(BinaryConstants.EXPR_IDENTIFIER);
//       _writeIdentifierExpression(expr);
//     } else if (expr is BinaryExpressionIR) {
//       _writeByte(BinaryConstants.EXPR_BINARY);
//       _writeBinaryExpression(expr);
//     } else if (expr is MethodCallExpressionIR) {
//       _writeByte(BinaryConstants.EXPR_METHOD_CALL);
//       _writeMethodCallExpression(expr);
//     } else {
//       // Unknown expression type
//       _writeByte(0xFF);
//     }
//   }
  
//   void _writeLiteralExpression(LiteralExpressionIR expr) {
//     _writeStringRef(expr.id);
//     _writeType(expr.resultType);
//     _writeSourceLocation(expr.sourceLocation);
//     _writeByte(expr.literalType.index);
    
//     switch (expr.literalType) {
//       case LiteralType.string:
//         _writeStringRef(expr.value as String);
//         break;
//       case LiteralType.integer:
//         _writeInt64(expr.value as int);
//         break;
//       case LiteralType.double:
//         _writeFloat64(expr.value as double);
//         break;
//       case LiteralType.boolean:
//         _writeBool(expr.value as bool);
//         break;
//       case LiteralType.nullValue:
//         break;
//       default:
//         break;
//     }
//   }
  
//   void _writeIdentifierExpression(IdentifierExpressionIR expr) {
//     _writeStringRef(expr.id);
//     _writeType(expr.resultType);
//     _writeSourceLocation(expr.sourceLocation);
//     _writeStringRef(expr.name);
//   }
  
//   void _writeBinaryExpression(BinaryExpressionIR expr) {
//     _writeStringRef(expr.id);
//     _writeType(expr.resultType);
//     _writeSourceLocation(expr.sourceLocation);
//     _writeExpression(expr.left);
//     _writeByte(expr.operator.index);
//     _writeExpression(expr.right);
//   }
  
//   void _writeMethodCallExpression(MethodCallExpressionIR expr) {
//     _writeStringRef(expr.id);
//     _writeType(expr.resultType);
//     _writeSourceLocation(expr.sourceLocation);
//     _writeOptional(expr.target, _writeExpression);
//     _writeStringRef(expr.methodName);
//     _writeArray(expr.arguments, _writeExpression);
//     _writeMap(expr.namedArguments, _writeStringRef, _writeExpression);
//     _writeArray(expr.typeArguments, _writeType);
//     _writeBool(expr.isNullAware);
//     _writeBool(expr.isCascade);
//   }
  
//   void _writeStatement(StatementIR stmt) {
//     // Implement based on your statement types
//     _writeByte(0xFF); // Placeholder
//   }
  
//   void _writeConstructor(ConstructorIR ctor) { /* ... */ }
//   void _writeBuildMethod(BuildMethodIR method) { /* ... */ }
//   void _writeWidgetTree(WidgetTreeIR tree) { /* ... */ }
//   void _writeReactivityInfo(ReactivityInfoIR info) { /* ... */ }
//   void _writeStateBinding(StateBindingIR binding) { /* ... */ }
//   void _writeLifecycleMethod(LifecycleMethodIR method) { /* ... */ }
//   void _writeEventHandler(EventHandlerIR handler) {
//     _writeStringRef(handler.eventName);
//     _writeStringRef(handler.handlerName);
//   }
//   void _writeKey(KeyIR key) { /* ... */ }
//   void _writeAnnotation(AnnotationIR annotation) {
//     _writeStringRef(annotation.name);
//   }
//   void _writeSetStateCall(SetStateCallIR call) { /* ... */ }
//   void _writeController(ControllerIR controller) {
//     _writeStringRef(controller.name);
//     _writeStringRef(controller.type);
//   }
//   void _writeContextDependency(ContextDependencyIR dep) { /* ... */ }
//   void _writeMixin(MixinIR mixin) { /* ... */ }
// }

// // ============================================================================
// // BINARY FILE IR READER
// // ============================================================================

// class BinaryIRReader {
//   late ByteData _data;
//   int _offset = 0;
//   List<String> _stringTable = [];
  
//   /// Reads FileIR from binary format
//   FileIR readFileIR(Uint8List bytes) {
//     _data = ByteData.view(bytes.buffer);
//     _offset = 0;
//     _stringTable = [];
    
//     // Read header
//     _readHeader();
    
//     // Read string table
//     _readStringTable();
    
//     // Read FileIR data
//     return _readFileIRData();
//   }
  
//   // --------------------------------------------------------------------------
//   // HEADER READING
//   // --------------------------------------------------------------------------
  
//   void _readHeader() {
//     final magic = _readUint32();
//     if (magic != 0x464C4952) {
//       throw Exception('Invalid Flutter IR file: bad magic number');
//     }
    
//     final version = _readUint16();
//     if (version != BinaryConstants.FORMAT_VERSION) {
//       throw Exception('Unsupported IR version: $version');
//     }
    
//     // Skip reserved bytes
//     _readUint16();
//   }
  
//   // --------------------------------------------------------------------------
//   // STRING TABLE READING
//   // --------------------------------------------------------------------------
  
//   void _readStringTable() {
//     final count = _readUint32();
//     _stringTable = List.generate(count, (_) {
//       final length = _readUint16();
//       final bytes = _readBytes(length);
//       return utf8.decode(bytes);
//     });
//   }
  
//   String _readStringRef() {
//     final index = _readUint32();
//     if (index >= _stringTable.length) {
//       throw Exception('Invalid string reference: $index');
//     }
//     return _stringTable[index];
//   }
  
//   String? _readOptionalString() {
//     if (_readBool()) {
//       return _readStringRef();
//     }
//     return null;
//   }
  
//   // --------------------------------------------------------------------------
//   // FILE IR READING
//   // --------------------------------------------------------------------------
  
//   FileIR _readFileIRData() {
//     final filePath = _readStringRef();
//     final contentHash = _readStringRef();
//     final metadata = _readFileMetadata();
    
//     return FileIR(
//       filePath: filePath,
//       contentHash: contentHash,
//       metadata: metadata,
//       widgets: _readArray(_readWidget),
//       stateClasses: _readArray(_readStateClass),
//       classes: _readArray(_readClass),
//       functions: _readArray(_readFunction),
//       providers: _readArray(_readProvider),
//       imports: _readArray(_readImportInfo),
//       exports: _readArray(_readStringRef),
//       dependencies: _readArray(_readStringRef),
//       dependents: _readArray(_readStringRef),
//       issues: _readArray(_readAnalysisIssue),
//     );
//   }
  
  
//   FileMetadata _readFileMetadata() {
//     return FileMetadata(
//       documentation: _readOptionalString(),
//       libraryName: _readOptionalString(),
//       partOf: _readOptionalString(),
//       parts: _readArray(_readStringRef),
//       annotations: _readArray(_readAnnotation),
//       analyzedAt: DateTime.fromMillisecondsSinceEpoch(_readUint64()),
//       analyzerVersion: _readStringRef(),
//     );
//   }
  
//   WidgetIR _readWidget() {
//     return WidgetIR(
//       id: _readStringRef(),
//       name: _readStringRef(),
//       type: _readStringRef(),
//       classification: WidgetClassification.values[_readByte()],
//       isStateful: _readBool(),
//       properties: _readArray(_readProperty),
//       fields: _readArray(_readField),
//       constructor: _readOptional(_readConstructor),
//       buildMethod: _readOptional(_readBuildMethod),
//       children: _readArray(_readWidget),
//       widgetTree: _readOptional(_readWidgetTree),
//       reactivityInfo: _readOptional(_readReactivityInfo),
//       stateBinding: _readOptional(_readStateBinding),
//       lifecycleMethods: _readArray(_readLifecycleMethod),
//       eventHandlers: _readArray(_readEventHandler),
//       key: _readOptional(_readKey),
//       annotations: _readArray(_readAnnotation),
//       sourceLocation: _readSourceLocation(),
//     );
//   }
  
// // Continuation of BinaryIRReader class from binary_file_ir_serializer.dart

//   StateClassIR _readStateClass() {
//     return StateClassIR(
//       id: _readStringRef(),
//       name: _readStringRef(),
//       widgetType: _readStringRef(),
//       stateFields: _readArray(_readStateField),
//       regularFields: _readArray(_readField),
//       initState: _readOptional(_readLifecycleMethod),
//       dispose: _readOptional(_readLifecycleMethod),
//       didUpdateWidget: _readOptional(_readLifecycleMethod),
//       didChangeDependencies: _readOptional(_readLifecycleMethod),
//       reassemble: _readOptional(_readLifecycleMethod),
//       buildMethod: _readBuildMethod(),
//       setStateCalls: _readArray(_readSetStateCall),
//       controllers: _readArray(_readController),
//       contextDependencies: _readArray(_readContextDependency),
//       mixins: _readArray(_readMixin),
//       sourceLocation: _readSourceLocation(),
//     );
//   }

//   PropertyIR _readProperty() {
//     return PropertyIR(
//       name: _readStringRef(),
//       type: _readType(),
//       value: _readOptional(_readExpression),
//       isRequired: _readBool(),
//       isNamed: _readBool(),
//     );
//   }

//   FieldIR _readField() {
//     return FieldIR(
//       name: _readStringRef(),
//       type: _readType(),
//       isFinal: _readBool(),
//       isStatic: _readBool(),
//       isLate: _readBool(),
//       initializer: _readOptional(_readExpression),
//     );
//   }

//   StateFieldIR _readStateField() {
//     return StateFieldIR(
//       name: _readStringRef(),
//       type: _readType(),
//       isMutable: _readBool(),
//       initializer: _readOptional(_readExpression),
//     );
//   }

//   ParameterIR _readParameter() {
//     return ParameterIR(
//       name: _readStringRef(),
//       type: _readType(),
//       isRequired: _readBool(),
//       isNamed: _readBool(),
//       isPositional: _readBool(),
//       defaultValue: _readOptional(_readExpression),
//     );
//   }

//   MethodIR _readMethod() {
//     return MethodIR(
//       name: _readStringRef(),
//       returnType: _readType(),
//       parameters: _readArray(_readParameter),
//       isAsync: _readBool(),
//       isStatic: _readBool(),
//       body: _readOptional(_readStatement),
//     );
//   }

//   ClassIR _readClass() {
//     return ClassIR(
//       name: _readStringRef(),
//       superclass: _readOptionalString(),
//       interfaces: _readArray(_readStringRef),
//       mixins: _readArray(_readStringRef),
//       fields: _readArray(_readField),
//       methods: _readArray(_readMethod),
//       isAbstract: _readBool(),
//     );
//   }

//   FunctionIR _readFunction() {
//     return FunctionIR(
//       name: _readStringRef(),
//       returnType: _readType(),
//       parameters: _readArray(_readParameter),
//       isAsync: _readBool(),
//       isGenerator: _readBool(),
//       body: _readOptional(_readStatement),
//     );
//   }

//   ProviderIR _readProvider() {
//     return ProviderIR(
//       name: _readStringRef(),
//       type: _readStringRef(),
//       fields: _readArray(_readField),
//       methods: _readArray(_readMethod),
//       notifiesListeners: _readBool(),
//     );
//   }

//   ImportInfo _readImportInfo() {
//     return ImportInfo(
//       uri: _readStringRef(),
//       prefix: _readOptionalString(),
//       alias: _readOptionalString(),
//       isDeferred: _readBool(),
//       showCombinators: _readArray(_readStringRef),
//       hideCombinators: _readArray(_readStringRef),
//     );
//   }

//   AnalysisIssue _readAnalysisIssue() {
//     return AnalysisIssue(
//       severity: IssueSeverity.values[_readByte()],
//       message: _readStringRef(),
//       code: _readStringRef(),
//       location: _readSourceLocation(),
//       correction: _readOptionalString(),
//       contextMessages: _readArray(_readStringRef),
//     );
//   }

//   ExpressionIR _readExpression() {
//     final exprType = _readByte();
    
//     switch (exprType) {
//       case BinaryConstants.EXPR_LITERAL:
//         return _readLiteralExpression();
//       case BinaryConstants.EXPR_IDENTIFIER:
//         return _readIdentifierExpression();
//       case BinaryConstants.EXPR_BINARY:
//         return _readBinaryExpression();
//       case BinaryConstants.EXPR_METHOD_CALL:
//         return _readMethodCallExpression();
//       default:
//         throw Exception('Unknown expression type: $exprType');
//     }
//   }

//   LiteralExpressionIR _readLiteralExpression() {
//     final id = _readStringRef();
//     final resultType = _readType();
//     final sourceLocation = _readSourceLocation();
//     final literalType = LiteralType.values[_readByte()];
    
//     dynamic value;
//     switch (literalType) {
//       case LiteralType.string:
//         value = _readStringRef();
//         break;
//       case LiteralType.integer:
//         value = _readInt64();
//         break;
//       case LiteralType.double:
//         value = _readFloat64();
//         break;
//       case LiteralType.boolean:
//         value = _readBool();
//         break;
//       case LiteralType.nullValue:
//         value = null;
//         break;
//     }
    
//     return LiteralExpressionIR(
//       id: id,
//       resultType: resultType,
//       sourceLocation: sourceLocation,
//       value: value,
//       literalType: literalType,
//     );
//   }

//   IdentifierExpressionIR _readIdentifierExpression() {
//     return IdentifierExpressionIR(
//       id: _readStringRef(),
//       resultType: _readType(),
//       sourceLocation: _readSourceLocation(),
//       name: _readStringRef(),
//     );
//   }

//   BinaryExpressionIR _readBinaryExpression() {
//     return BinaryExpressionIR(
//       id: _readStringRef(),
//       resultType: _readType(),
//       sourceLocation: _readSourceLocation(),
//       left: _readExpression(),
//       operator: BinaryOperator.values[_readByte()],
//       right: _readExpression(),
//     );
//   }

//   MethodCallExpressionIR _readMethodCallExpression() {
//     return MethodCallExpressionIR(
//       id: _readStringRef(),
//       resultType: _readType(),
//       sourceLocation: _readSourceLocation(),
//       target: _readOptional(_readExpression),
//       methodName: _readStringRef(),
//       arguments: _readArray(_readExpression),
//       namedArguments: _readMap(_readStringRef, _readExpression),
//       typeArguments: _readArray(_readType),
//       isNullAware: _readBool(),
//       isCascade: _readBool(),
//     );
//   }

//   StatementIR _readStatement() {
//     final stmtType = _readByte();
//     // Placeholder - implement based on statement types
//     // For now, throw to indicate unimplemented
//     throw UnimplementedError('Statement reading not fully implemented');
//   }

//   ConstructorIR _readConstructor() {
//     return ConstructorIR(
//       name: _readOptionalString(),
//       parameters: _readArray(_readParameter),
//       isConst: _readBool(),
//       isFactory: _readBool(),
//     );
//   }

//   BuildMethodIR _readBuildMethod() {
//     return BuildMethodIR(
//       parameters: _readArray(_readParameter),
//       returnType: _readType(),
//       body: _readOptional(_readStatement),
//     );
//   }

//   WidgetTreeIR _readWidgetTree() {
//     return WidgetTreeIR(
//       rootWidget: _readOptional(_readWidgetNode),
//       depth: _readUint32(),
//       totalWidgets: _readUint32(),
//     );
//   }

//   WidgetNodeIR _readWidgetNode() {
//     return WidgetNodeIR(
//       id: _readStringRef(),
//       widgetType: _readStringRef(),
//       properties: _readMap(_readStringRef, _readExpression),
//       children: _readArray(_readWidgetNode),
//       key: _readOptional(_readKey),
//       isConst: _readBool(),
//     );
//   }

//   ReactivityInfoIR _readReactivityInfo() {
//     return ReactivityInfoIR(
//       dependsOnState: _readArray(_readStringRef),
//       dependsOnInheritedWidgets: _readArray(_readStringRef),
//       dependsOnProviders: _readArray(_readStringRef),
//       triggersRebuild: _readBool(),
//     );
//   }

//   StateBindingIR _readStateBinding() {
//     return StateBindingIR(
//       stateClassName: _readStringRef(),
//       stateClassId: _readStringRef(),
//     );
//   }

//   LifecycleMethodIR _readLifecycleMethod() {
//     return LifecycleMethodIR(
//       name: _readStringRef(),
//       body: _readOptional(_readStatement),
//       callsSuper: _readBool(),
//       isAsync: _readBool(),
//     );
//   }

//   EventHandlerIR _readEventHandler() {
//     return EventHandlerIR(
//       eventName: _readStringRef(),
//       handlerName: _readStringRef(),
//     );
//   }

//   KeyIR _readKey() {
//     final keyType = _readByte();
//     final value = _readOptional(_readExpression);
    
//     return KeyIR(
//       type: KeyType.values[keyType],
//       value: value,
//     );
//   }

//   AnnotationIR _readAnnotation() {
//     return AnnotationIR(
//       name: _readStringRef(),
//     );
//   }

//   SetStateCallIR _readSetStateCall() {
//     return SetStateCallIR(
//       sourceLocation: _readSourceLocation(),
//       modifiedFields: _readArray(_readStringRef),
//       callback: _readOptional(_readExpression),
//     );
//   }

//   ControllerIR _readController() {
//     return ControllerIR(
//       name: _readStringRef(),
//       type: _readStringRef(),
//     );
//   }

//   ContextDependencyIR _readContextDependency() {
//     return ContextDependencyIR(
//       type: _readStringRef(),
//       method: _readStringRef(),
//       sourceLocation: _readSourceLocation(),
//     );
//   }

//   MixinIR _readMixin() {
//     return MixinIR(
//       name: _readStringRef(),
//     );
//   }

//   int _readUint64() {
//     final value = _data.getUint64(_offset, Endian.little);
//     _offset += 8;
//     return value;
//   }

//   TypeIR _readType() {
//     final name = _readStringRef();
//     final isNullable = _readBool();
    
//     return SimpleTypeIR(
//       id: 'type_$name',
//       name: name,
//       isNullable: isNullable,
//     );
//   }

//   SourceLocationIR _readSourceLocation() {
//     return SourceLocationIR(
//       file: _readStringRef(),
//       line: _readUint32(),
//       column: _readUint32(),
//       offset: _readUint32(),
//       length: _readUint32(),
//     );
//   }
// }
// // // ============================================================================
// // // USAGE EXAMPLE
// // // ============================================================================

// // void main() {
// //   // Create sample IR
// //   final app = FlutterAppIR(
// //     version: 2,
// //     widgets: [
// //       // ... widget definitions
// //     ],
// //     stateClasses: [],
// //     functions: [],
// //     routes: [],
// //     animations: [],
// //     providers: [],
// //     imports: [],
// //   );
  
// //   // Write to binary
// //   final writer = BinaryIRWriter();
// //   final binary = writer.write(app);
  
// //   print('Binary size: ${binary.length} bytes');
  
// //   // Read from binary
// //   final reader = BinaryIRReader();
// //   final loadedApp = reader.read(binary);
  
// //   print('Loaded app version: ${loadedApp.version}');
// //   print('Widget count: ${loadedApp.widgets.length}');
// // }

// // ============================================================================
// // FORMAT DOCUMENTATION
// // ============================================================================

