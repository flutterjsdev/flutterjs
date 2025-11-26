/// ============================================================================
/// binary_constain.dart
/// Binary Format Constants & System-Level Encoding Rules
/// ============================================================================
///
/// Defines all **low-level constants**, **magic numbers**, **section markers**,
/// and **binary schema rules** used by the FlutterJS binary serialization
/// system.
///
/// This file is the *source of truth* for the binary format used across:
/// - **IR → Binary Encoding**
/// - **Binary → IR Decoding**
/// - **Format Validation**
/// - **Binary bundle versioning**
///
/// No binary writer/reader logic is implemented here—only constants and
/// restrictions that ensure stable, deterministic encoding.
///
///
/// # Purpose
///
/// FlutterJS generates a **compact binary representation** of the UI
/// intermediate representation (IR).  
/// To guarantee compatibility and reproducibility across builds and devices,
/// all encoding rules are centralized inside this file.
///
/// This allows:
/// - Backward compatibility management  
/// - Forward compatibility checking  
/// - Debugging via structured section markers  
/// - Prevention of undefined binary states  
/// - Consistency across all binary tools  
///
///
/// # Responsibilities
///
/// - Define **magic headers** for verifying bundle identity
/// - Provide **version constants** for schema evolution
/// - Define **section types** (widgets, expressions, metadata)
/// - Define **type tags** for primitive expression encoding
/// - Define **reserved ranges** preventing collisions
/// - Define **maximum/minimum value constraints**
/// - Expose **binary safety rules** used by validation module
///
///
/// # Key Components
///
/// ## 1. Magic Numbers
/// Unique markers embedded into the file header to ensure the incoming binary
/// matches the FlutterJS format.
///
/// ```dart
/// const int kMagicHeader = 0xF1F2F3F4;
/// ```
///
/// These help readers reject corrupted or incompatible binaries.
///
///
/// ## 2. Schema Versioning
///
/// ```dart
/// const int kBinaryFormatVersion = 2;
/// ```
///
/// Increment this whenever there are:
/// - Changes in encoding order  
/// - Addition/removal of section types  
/// - Modifications to string-table rules  
///
///
/// ## 3. Section Identifiers
///
/// Used by writers/readers to mark logical groups:
/// - Widget tree section
/// - Expression section
/// - String table section
/// - Metadata section
///
/// Example:
/// ```dart
/// const int kSectionWidgets = 0x01;
/// const int kSectionExpressions = 0x02;
/// const int kSectionStringTable = 0x03;
/// ```
///
///
/// ## 4. Expression Type Tags
///
/// Tags used when encoding any expression node:
///
/// ```dart
/// const int kExprLiteralString = 0x10;
/// const int kExprLiteralNumber = 0x11;
/// const int kExprVariableRef   = 0x12;
/// const int kExprBinaryOp      = 0x13;
/// const int kExprUnaryOp       = 0x14;
/// ```
///
/// Writers always output these tags before the expression payload.
///
///
/// ## 5. Reserved Ranges
///
/// Ensures no collisions across custom or extended IR types:
///
/// ```dart
/// const int kReservedMin = 0xF000;
/// const int kReservedMax = 0xFFFF;
/// ```
///
/// These values must **never** appear in user-generated tags.
///
///
/// ## 6. Validation Rules
///
/// Imported by `binary_format_validate.dart` to verify:
/// - Header correctness  
/// - Section boundaries  
/// - Tag integrity  
/// - Unexpected end-of-stream errors  
/// - Zero-length or invalid string table issues  
///
///
/// # Integration
///
/// Writers/readers must *only* use constants defined here.
///
/// ```dart
/// writer.writeUint32(kMagicHeader);
/// writer.writeUint8(kSectionWidgets);
/// reader.expectUint32(kMagicHeader);
/// ```
///
/// Validation tools should rely on these constants to ensure correctness.
///
///
/// # Notes
/// - **Never** hardcode magic numbers in other modules.  
/// - When adding new constants, update the binary schema documentation.  
/// - When breaking format compatibility, increment `kBinaryFormatVersion`.  
/// - This file is zero-logic by design and should remain stable.
///
///
/// ============================================================================
///
library;

class BinaryConstants {
  // ===========================================================================
  // HEADER CONSTANTS (8 bytes total)
  // ===========================================================================

  /// Magic number: "FLIR" in ASCII (Flutter IR)
  /// Bytes 0-3: 0x464C4952
  /// Used to identify this as a Flutter IR binary file
  static const int MAGIC_NUMBER = 0x464C4952;

  /// Format version number
  /// Bytes 4-5: Current version = 1
  /// Increment for breaking changes to format
  static const int FORMAT_VERSION = 1;

  // ===========================================================================
  // HEADER FLAGS (Bytes 6-7)
  // ===========================================================================

  /// Flag: File includes SHA256 checksum at end (32 bytes)
  static const int FLAG_HAS_CHECKSUM = 0x0001;

  /// Flag: IR data is gzip-compressed after string table
  static const int FLAG_COMPRESSED = 0x0002;

  /// Flag: Includes optional debug information (source spans, comments)
  static const int FLAG_DEBUG_INFO = 0x0004;

  /// Flag: Reserved for future use
  static const int FLAG_RESERVED_1 = 0x0008;
  static const int FLAG_RESERVED_2 = 0x0010;
  static const int FLAG_RESERVED_3 = 0x0020;

  // ===========================================================================
  // TYPE SYSTEM CONSTANTS
  // ===========================================================================

  /// Type kind: Simple type (int, String, Widget, etc.)
  static const int TYPE_SIMPLE = 0x00;

  /// Type kind: Generic type (List<T>, Map<K,V>, etc.)
  static const int TYPE_GENERIC = 0x01;

  /// Type kind: Function type ((int, String) -> Widget)
  static const int TYPE_FUNCTION = 0x02;

  /// Type kind: Type parameter (T in List<T>)
  static const int TYPE_PARAMETER = 0x03;

  /// Type kind: Dynamic type
  static const int TYPE_DYNAMIC = 0x04;

  /// Type kind: Void type
  static const int TYPE_VOID = 0x05;

  /// Type kind: Never type
  static const int TYPE_NEVER = 0x06;

  /// Type kind: Nullable wrapper (T?)
  static const int TYPE_NULLABLE = 0x07;

  // ===========================================================================
  // EXPRESSION TYPE CONSTANTS (0x01 - 0x3F)
  // ===========================================================================

  // --- Literal Expressions (0x01 - 0x0F) ---

  /// Literal expression (string, int, double, bool, null)
  static const int EXPR_LITERAL = 0x01;

  /// String literal specifically
  static const int EXPR_STRING_LITERAL = 0x02;

  /// Integer literal specifically
  static const int EXPR_INT_LITERAL = 0x03;

  /// Double literal specifically
  static const int EXPR_DOUBLE_LITERAL = 0x04;

  /// Boolean literal specifically
  static const int EXPR_BOOL_LITERAL = 0x05;

  /// Null literal specifically
  static const int EXPR_NULL_LITERAL = 0x06;

  /// List literal [1, 2, 3]
  static const int EXPR_LIST_LITERAL = 0x07;

  /// Map literal {key: value}
  static const int EXPR_MAP_LITERAL = 0x08;

  /// Set literal {1, 2, 3}
  static const int EXPR_SET_LITERAL = 0x09;

  // --- Identifier & Access (0x10 - 0x1F) ---

  /// Identifier (variable/field reference)
  static const int EXPR_IDENTIFIER = 0x10;

  /// Property access (obj.property)
  static const int EXPR_PROPERTY_ACCESS = 0x11;

  /// Index access (list[index])
  static const int EXPR_INDEX_ACCESS = 0x12;

  /// This expression
  static const int EXPR_THIS = 0x13;

  /// Super expression
  static const int EXPR_SUPER = 0x14;

  // --- Operations (0x20 - 0x2F) ---

  /// Binary operation (a + b, a * b, etc.)
  static const int EXPR_BINARY = 0x20;

  /// Unary operation (!a, -a, etc.)
  static const int EXPR_UNARY = 0x21;

  /// Assignment (a = b)
  static const int EXPR_ASSIGNMENT = 0x22;

  /// Compound assignment (a += b, a *= b, etc.)
  static const int EXPR_COMPOUND_ASSIGNMENT = 0x23;

  /// Conditional/ternary (condition ? then : else)
  static const int EXPR_CONDITIONAL = 0x24;

  /// Null-aware operation (a ?? b, a?.b)
  static const int EXPR_NULL_AWARE = 0x25;

  // --- Function & Method Calls (0x30 - 0x3F) ---

  /// Method call (obj.method(args))
  static const int EXPR_METHOD_CALL = 0x30;

  /// Function call (function(args))
  static const int EXPR_FUNCTION_CALL = 0x31;

  /// Constructor call (new Widget())
  static const int EXPR_INSTANCE_CREATION = 0x32;

  /// Lambda/closure ((x) => x * 2)
  static const int EXPR_LAMBDA = 0x33;

  /// Function expression (full function body)
  static const int EXPR_FUNCTION = 0x34;

  // --- Type Operations (0x40 - 0x4F) ---

  /// Type cast (value as Type)
  static const int EXPR_CAST = 0x40;

  /// Type check (value is Type)
  static const int EXPR_TYPE_CHECK = 0x41;

  /// Type check negated (value is! Type)
  static const int EXPR_TYPE_CHECK_NEGATED = 0x42;

  // --- Async Operations (0x50 - 0x5F) ---

  /// Await expression (await future)
  static const int EXPR_AWAIT = 0x50;

  /// Throw expression (throw exception)
  static const int EXPR_THROW = 0x51;

  /// Rethrow expression
  static const int EXPR_RETHROW = 0x52;

  // --- Special Expressions (0x60 - 0x6F) ---

  /// Cascade notation (obj..method1()..method2())
  static const int EXPR_CASCADE = 0x60;

  /// Parenthesized expression ((expr))
  static const int EXPR_PARENTHESIZED = 0x61;

  /// String interpolation ("text ${expr} more")
  static const int EXPR_STRING_INTERPOLATION = 0x62;

  /// Unknown/unrecognized expression (fallback)
  static const int EXPR_UNKNOWN = 0xFF;

  // ===========================================================================
  // LITERAL TYPE CONSTANTS (used within EXPR_LITERAL)
  // ===========================================================================

  /// Literal type: String
  static const int LITERAL_STRING = 0x00;

  /// Literal type: Integer
  static const int LITERAL_INTEGER = 0x01;

  /// Literal type: Double/Float
  static const int LITERAL_DOUBLE = 0x02;

  /// Literal type: Boolean
  static const int LITERAL_BOOLEAN = 0x03;

  /// Literal type: Null
  static const int LITERAL_NULL = 0x04;

  // ===========================================================================
  // BINARY OPERATOR CONSTANTS
  // ===========================================================================

  static const int OP_ADD = 0x01; // +
  static const int OP_SUBTRACT = 0x02; // -
  static const int OP_MULTIPLY = 0x03; // *
  static const int OP_DIVIDE = 0x04; // /
  static const int OP_INT_DIVIDE = 0x05; // ~/
  static const int OP_MODULO = 0x06; // %

  static const int OP_EQUALS = 0x10; // ==
  static const int OP_NOT_EQUALS = 0x11; // !=
  static const int OP_LESS_THAN = 0x12; // <
  static const int OP_LESS_OR_EQUAL = 0x13; // <=
  static const int OP_GREATER_THAN = 0x14; // >
  static const int OP_GREATER_OR_EQUAL = 0x15; // >=

  static const int OP_LOGICAL_AND = 0x20; // &&
  static const int OP_LOGICAL_OR = 0x21; // ||

  static const int OP_BITWISE_AND = 0x30; // &
  static const int OP_BITWISE_OR = 0x31; // |
  static const int OP_BITWISE_XOR = 0x32; // ^
  static const int OP_LEFT_SHIFT = 0x33; // <<
  static const int OP_RIGHT_SHIFT = 0x34; // >>
  static const int OP_UNSIGNED_RIGHT_SHIFT = 0x35; // >>>

  static const int OP_NULL_COALESCE = 0x40; // ??

  // ===========================================================================
  // UNARY OPERATOR CONSTANTS
  // ===========================================================================

  static const int UNARY_NEGATE = 0x01; // -
  static const int UNARY_NOT = 0x02; // !
  static const int UNARY_BITWISE_NOT = 0x03; // ~
  static const int UNARY_PRE_INCREMENT = 0x04; // ++x
  static const int UNARY_PRE_DECREMENT = 0x05; // --x
  static const int UNARY_POST_INCREMENT = 0x06; // x++
  static const int UNARY_POST_DECREMENT = 0x07; // x--

  // ===========================================================================
  // STATEMENT TYPE CONSTANTS (0x00 - 0x2F)
  // ===========================================================================

  // --- Simple Statements (0x00 - 0x0F) ---

  /// Expression statement (expr;)
  static const int STMT_EXPRESSION = 0x00;

  /// Variable declaration (var x = value;)
  static const int STMT_VAR_DECL = 0x01;

  /// Return statement (return expr;)
  static const int STMT_RETURN = 0x02;

  /// Break statement (break;)
  static const int STMT_BREAK = 0x03;

  /// Continue statement (continue;)
  static const int STMT_CONTINUE = 0x04;

  /// Throw statement (throw exception;)
  static const int STMT_THROW = 0x05;

  /// Rethrow statement (rethrow;)
  static const int STMT_RETHROW = 0x06;

  /// Assert statement (assert(condition);)
  static const int STMT_ASSERT = 0x07;

  /// Empty statement (;)
  static const int STMT_EMPTY = 0x08;

  // --- Compound Statements (0x10 - 0x1F) ---

  /// Block statement ({ statements })
  static const int STMT_BLOCK = 0x10;

  /// If statement (if (cond) then else)
  static const int STMT_IF = 0x11;

  /// For loop (for (init; cond; update) body)
  static const int STMT_FOR = 0x12;

  /// For-each loop (for (var in iterable) body)
  static const int STMT_FOR_EACH = 0x13;

  /// While loop (while (cond) body)
  static const int STMT_WHILE = 0x14;

  /// Do-while loop (do body while (cond);)
  static const int STMT_DO_WHILE = 0x15;

  /// Switch statement (switch (expr) { cases })
  static const int STMT_SWITCH = 0x16;

  /// Try-catch statement (try { } catch { } finally { })
  static const int STMT_TRY = 0x17;

  /// Labeled statement (label: statement)
  static const int STMT_LABELED = 0x18;

  // --- Special Statements (0x20 - 0x2F) ---

  /// Yield statement (yield value;) - for generators
  static const int STMT_YIELD = 0x20;

  /// Yield-each statement (yield* iterable;)
  static const int STMT_YIELD_EACH = 0x21;

  /// Function declaration statement
  static const int STMT_FUNCTION_DECL = 0x22;

  /// Unknown/unrecognized statement (fallback)
  static const int STMT_UNKNOWN = 0xFF;

  // ===========================================================================
  // FLUTTER-SPECIFIC CONSTANTS
  // ===========================================================================

  // --- Widget Classification ---

  /// Widget classification: Stateless
  static const int WIDGET_STATELESS = 0x01;

  /// Widget classification: Stateful
  static const int WIDGET_STATEFUL = 0x02;

  /// Widget classification: Inherited
  static const int WIDGET_INHERITED = 0x03;

  /// Widget classification: Provider/Scoped
  static const int WIDGET_PROVIDER = 0x04;

  /// Widget classification: Regular (non-widget class)
  static const int WIDGET_NONE = 0x00;

  // --- Lifecycle Method Types ---

  static const int LIFECYCLE_INIT_STATE = 0x01;
  static const int LIFECYCLE_DISPOSE = 0x02;
  static const int LIFECYCLE_DID_UPDATE_WIDGET = 0x03;
  static const int LIFECYCLE_DID_CHANGE_DEPENDENCIES = 0x04;
  static const int LIFECYCLE_REASSEMBLE = 0x05;
  static const int LIFECYCLE_DEACTIVATE = 0x06;
  static const int LIFECYCLE_ACTIVATE = 0x07;

  // --- Provider Types ---

  static const int PROVIDER_CHANGE_NOTIFIER = 0x01;
  static const int PROVIDER_VALUE_NOTIFIER = 0x02;
  static const int PROVIDER_INHERITED_WIDGET = 0x03;
  static const int PROVIDER_BLOC = 0x04;
  static const int PROVIDER_CUBIT = 0x05;
  static const int PROVIDER_RIVERPOD = 0x06;
  static const int PROVIDER_CUSTOM = 0xFF;

  // --- Controller Types ---

  static const int CONTROLLER_ANIMATION = 0x01;
  static const int CONTROLLER_TEXT = 0x02;
  static const int CONTROLLER_SCROLL = 0x03;
  static const int CONTROLLER_PAGE = 0x04;
  static const int CONTROLLER_TAB = 0x05;
  static const int CONTROLLER_VIDEO = 0x06;
  static const int CONTROLLER_CUSTOM = 0xFF;

  // --- Key Types ---

  static const int KEY_VALUE = 0x01;
  static const int KEY_OBJECT = 0x02;
  static const int KEY_UNIQUE = 0x03;
  static const int KEY_GLOBAL = 0x04;
  static const int KEY_LOCAL = 0x05;

  // ===========================================================================
  // ISSUE SEVERITY CONSTANTS
  // ===========================================================================

  static const int SEVERITY_ERROR = 0x00;
  static const int SEVERITY_WARNING = 0x01;
  static const int SEVERITY_INFO = 0x02;
  static const int SEVERITY_HINT = 0x03;

  // ===========================================================================
  // SIZE LIMITS
  // ===========================================================================

  /// Maximum string length in bytes (65,535 = 2^16 - 1)
  static const int MAX_STRING_LENGTH = 0xFFFF;

  /// Maximum number of strings in string table (4,294,967,295 = 2^32 - 1)
  static const int MAX_STRING_COUNT = 0xFFFFFFFF;

  /// Maximum array/list count (2^32 - 1)
  static const int MAX_ARRAY_COUNT = 0xFFFFFFFF;

  /// Checksum size in bytes (SHA-256 = 32 bytes)
  static const int CHECKSUM_SIZE = 32;

  /// Header size in bytes
  static const int HEADER_SIZE = 8;

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /// Check if a flag is set in the header flags
  static bool isFlagSet(int flags, int flag) {
    return (flags & flag) != 0;
  }

  /// Set a flag in the header flags
  static int setFlag(int flags, int flag) {
    return flags | flag;
  }

  /// Clear a flag in the header flags
  static int clearFlag(int flags, int flag) {
    return flags & ~flag;
  }

  /// Get human-readable name for expression type
  static String getExpressionTypeName(int type) {
    switch (type) {
      case EXPR_LITERAL:
        return 'Literal';
      case EXPR_IDENTIFIER:
        return 'Identifier';
      case EXPR_BINARY:
        return 'Binary';
      case EXPR_METHOD_CALL:
        return 'MethodCall';
      case EXPR_PROPERTY_ACCESS:
        return 'PropertyAccess';
      case EXPR_CONDITIONAL:
        return 'Conditional';
      case EXPR_LIST_LITERAL:
        return 'ListLiteral';
      case EXPR_MAP_LITERAL:
        return 'MapLiteral';
      case EXPR_ASSIGNMENT:
        return 'Assignment';
      case EXPR_CAST:
        return 'Cast';
      case EXPR_TYPE_CHECK:
        return 'TypeCheck';
      case EXPR_LAMBDA:
        return 'Lambda';
      case EXPR_AWAIT:
        return 'Await';
      case EXPR_THROW:
        return 'Throw';
      case EXPR_INDEX_ACCESS:
        return 'IndexAccess';
      default:
        return 'Unknown(0x${type.toRadixString(16)})';
    }
  }

  /// Get human-readable name for statement type
  static String getStatementTypeName(int type) {
    switch (type) {
      case STMT_EXPRESSION:
        return 'Expression';
      case STMT_VAR_DECL:
        return 'VarDecl';
      case STMT_IF:
        return 'If';
      case STMT_FOR:
        return 'For';
      case STMT_FOR_EACH:
        return 'ForEach';
      case STMT_WHILE:
        return 'While';
      case STMT_DO_WHILE:
        return 'DoWhile';
      case STMT_SWITCH:
        return 'Switch';
      case STMT_TRY:
        return 'Try';
      case STMT_RETURN:
        return 'Return';
      case STMT_BREAK:
        return 'Break';
      case STMT_CONTINUE:
        return 'Continue';
      case STMT_THROW:
        return 'Throw';
      case STMT_BLOCK:
        return 'Block';
      default:
        return 'Unknown(0x${type.toRadixString(16)})';
    }
  }

  /// Get human-readable name for binary operator
  static String getBinaryOperatorName(int op) {
    switch (op) {
      case OP_ADD:
        return '+';
      case OP_SUBTRACT:
        return '-';
      case OP_MULTIPLY:
        return '*';
      case OP_DIVIDE:
        return '/';
      case OP_INT_DIVIDE:
        return '~/';
      case OP_MODULO:
        return '%';
      case OP_EQUALS:
        return '==';
      case OP_NOT_EQUALS:
        return '!=';
      case OP_LESS_THAN:
        return '<';
      case OP_LESS_OR_EQUAL:
        return '<=';
      case OP_GREATER_THAN:
        return '>';
      case OP_GREATER_OR_EQUAL:
        return '>=';
      case OP_LOGICAL_AND:
        return '&&';
      case OP_LOGICAL_OR:
        return '||';
      case OP_BITWISE_AND:
        return '&';
      case OP_BITWISE_OR:
        return '|';
      case OP_BITWISE_XOR:
        return '^';
      case OP_LEFT_SHIFT:
        return '<<';
      case OP_RIGHT_SHIFT:
        return '>>';
      case OP_NULL_COALESCE:
        return '??';
      default:
        return 'Unknown(0x${op.toRadixString(16)})';
    }
  }
}
