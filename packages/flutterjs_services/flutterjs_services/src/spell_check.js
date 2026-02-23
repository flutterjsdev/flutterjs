// Flutter services/spell_check.dart → JS

export class SuggestionSpan {
  constructor({ range, suggestions }) {
    this.range = range;
    this.suggestions = suggestions;
  }
}

export class SpellCheckResults {
  constructor({ spellCheckedText, suggestionSpans }) {
    this.spellCheckedText = spellCheckedText;
    this.suggestionSpans = suggestionSpans ?? [];
  }
}

export class SpellCheckService {
  fetchSpellCheckSuggestions({ locale, text }) {
    return Promise.resolve(null);
  }
}

export class DefaultSpellCheckService extends SpellCheckService {
  constructor() {
    super();
  }
}
