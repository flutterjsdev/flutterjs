/// Maps Flutter enum members to JavaScript/CSS equivalents
class FlutterEnumMapper {
  static const Map<String, Map<String, String>> enumMappings = {
    // MainAxisAlignment
    'MainAxisAlignment': {
      'start': '"flex-start"',
      'end': '"flex-end"',
      'center': '"center"',
      'spaceBetween': '"space-between"',
      'spaceAround': '"space-around"',
      'spaceEvenly': '"space-evenly"',
    },

    // CrossAxisAlignment
    'CrossAxisAlignment': {
      'start': '"flex-start"',
      'end': '"flex-end"',
      'center': '"center"',
      'stretch': '"stretch"',
      'baseline': '"baseline"',
    },

    // TextAlign
    'TextAlign': {
      'left': '"left"',
      'right': '"right"',
      'center': '"center"',
      'justify': '"justify"',
      'start': '"left"',
      'end': '"right"',
    },

    // Axis
    'Axis': {'horizontal': '"horizontal"', 'vertical': '"vertical"'},

    // MainAxisSize
    'MainAxisSize': {'max': '"max"', 'min': '"min"'},

    // CrossAxisSize
    'CrossAxisSize': {'max': '"max"', 'min': '"min"'},

    // FontWeight
    'FontWeight': {
      'w100': '"100"',
      'w200': '"200"',
      'w300': '"300"',
      'normal': '"400"',
      'w400': '"400"',
      'w500': '"500"',
      'w600': '"600"',
      'bold': '"700"',
      'w700': '"700"',
      'w800': '"800"',
      'w900': '"900"',
    },

    // TextOverflow
    'TextOverflow': {
      'clip': '"clip"',
      'fade': '"fade"',
      'ellipsis': '"ellipsis"',
      'visible': '"visible"',
    },

    // BoxFit
    'BoxFit': {
      'fill': '"fill"',
      'contain': '"contain"',
      'cover': '"cover"',
      'fitWidth': '"scale-down"',
      'fitHeight': '"cover"',
      'none': '"none"',
      'scaleDown': '"scale-down"',
    },

    // VerticalDirection
    'VerticalDirection': {'down': '"down"', 'up': '"up"'},

    // TextDirection
    'TextDirection': {'rtl': '"rtl"', 'ltr': '"ltr"'},
  };

  /// Map an enum member to its JavaScript equivalent
  static String mapEnumMember(String typeName, String memberName) {
    final typeMap = enumMappings[typeName];
    if (typeMap == null) {
      print('⚠️  Unknown enum type: $typeName');
      return '"${memberName.toLowerCase()}"';
    }

    final mapped = typeMap[memberName];
    if (mapped == null) {
      print('⚠️  Unknown member: $typeName.$memberName');
      return '"${memberName.toLowerCase()}"';
    }

    return mapped;
  }
}

