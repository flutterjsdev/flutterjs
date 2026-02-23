// Flutter foundation/unicode.dart → JS

export class Unicode {
  static get LF()   { return 0x000A; }  // Line Feed
  static get CR()   { return 0x000D; }  // Carriage Return
  static get SP()   { return 0x0020; }  // Space
  static get nbsp() { return 0x00A0; }  // No-Break Space

  // Word boundary characters
  static get RLM()  { return 0x200F; }  // Right-to-left mark
  static get LRM()  { return 0x200E; }  // Left-to-right mark
  static get ALM()  { return 0x061C; }  // Arabic letter mark
  static get ZWJ()  { return 0x200D; }  // Zero width joiner
  static get ZWNJ() { return 0x200C; }  // Zero width non-joiner

  // Bidi control characters
  static get LRE()  { return 0x202A; }
  static get RLE()  { return 0x202B; }
  static get LRO()  { return 0x202D; }
  static get RLO()  { return 0x202E; }
  static get LRI()  { return 0x2066; }
  static get RLI()  { return 0x2067; }
  static get FSI()  { return 0x2068; }
  static get PDF()  { return 0x202C; }
  static get PDI()  { return 0x2069; }
}
