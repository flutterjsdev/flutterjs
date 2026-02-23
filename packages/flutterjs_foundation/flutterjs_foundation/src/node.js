// Flutter foundation/node.dart → JS

export class AbstractNode {
  constructor() {
    this._depth = 0;
    this._owner = null;
    this._parent = null;
  }

  get depth() { return this._depth; }
  get owner() { return this._owner; }
  get parent() { return this._parent; }

  get attached() { return this._owner !== null; }

  redepthChild(child) {
    if (child._depth <= this._depth) {
      child._depth = this._depth + 1;
      child.redepthChildren();
    }
  }

  redepthChildren() {}

  attach(owner) {
    this._owner = owner;
  }

  detach() {
    this._owner = null;
  }

  adoptChild(child) {
    child._parent = this;
    if (this.attached) child.attach(this._owner);
    this.redepthChild(child);
  }

  dropChild(child) {
    child._parent = null;
    if (this.attached) child.detach();
  }
}
