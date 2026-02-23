// Flutter services/process_text.dart → JS

export class ProcessTextAction {
  constructor({ id, label }) {
    this.id = id;
    this.label = label;
  }
}

export class ProcessTextService {
  queryTextActions() { return Promise.resolve([]); }
  processTextAction({ id, text, readOnly }) { return Promise.resolve(null); }
}

export class DefaultProcessTextService extends ProcessTextService {
  queryTextActions() { return Promise.resolve([]); }
  processTextAction({ id, text, readOnly }) { return Promise.resolve(null); }
}
