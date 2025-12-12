class ElementIdentifier {
  constructor() {
    this._elementCounter = 0;
    this._idCache = new Map();
    this._pathCache = new Map();
    this._keyedIndex = new Map();
    this._unkeyedIndex = new Map();
  }

  getElementId(element) {
    if (this._idCache.has(element)) {
      return this._idCache.get(element);
    }

    let id;
    if (element.widget.key) {
      id = this._getKeyedId(element);
    } else {
      id = this._getUnkeyedId(element);
    }

    this._idCache.set(element, id);
    return id;
  }

  _getKeyedId(element) {
    const key = element.widget.key;
    const type = element.widget.constructor.name;
    const parentPath = element._parent ? this._getParentKey(element._parent) : 'root';

    return `keyed:${parentPath}/${type}@${key}`;
  }

  _getUnkeyedId(element) {
    const type = element.widget.constructor.name;
    const parentPath = element._parent ? this._getParentKey(element._parent) : 'root';
    const position = this._getChildPosition(element);

    return `unkeyed:${parentPath}/${type}[${position}]`;
  }

  _getParentKey(parent) {
    return parent.widget.key ? `${parent.widget.constructor.name}@${parent.widget.key}` : 
           `${parent.widget.constructor.name}`;
  }

  _getChildPosition(element) {
    if (!element._parent) {
      return 0;
    }

    const siblings = element._parent._children;
    const type = element.widget.constructor.name;
    let position = 0;

    for (let i = 0; i < siblings.length; i++) {
      if (siblings[i] === element) {
        break;
      }
      if (siblings[i].widget.constructor.name === type) {
        position++;
      }
    }

    return position;
  }

  getWidgetPath(element) {
    if (this._pathCache.has(element)) {
      return this._pathCache.get(element);
    }

    const path = [];
    let current = element;

    while (current) {
      const name = current.widget.constructor.name;
      const key = current.widget.key;
      path.unshift(key ? `${name}(${key})` : name);
      current = current._parent;
    }

    const pathStr = path.join(' > ');
    this._pathCache.set(element, pathStr);
    return pathStr;
  }

  getIdentificationStrategy(element) {
    return element.widget.key ? 'keyed' : 'unkeyed';
  }

  findElementById(id, rootElement) {
    const stack = [rootElement];

    while (stack.length > 0) {
      const current = stack.pop();

      if (this.getElementId(current) === id) {
        return current;
      }

      if (current._children) {
        stack.push(...current._children);
      }
    }

    return null;
  }

  findElementByType(type, rootElement) {
    const stack = [rootElement];

    while (stack.length > 0) {
      const current = stack.pop();

      if (current.widget.constructor === type) {
        return current;
      }

      if (current._children) {
        stack.push(...current._children);
      }
    }

    return null;
  }

  findElementsByType(type, rootElement) {
    const results = [];
    const stack = [rootElement];

    while (stack.length > 0) {
      const current = stack.pop();

      if (current.widget.constructor === type) {
        results.push(current);
      }

      if (current._children) {
        stack.push(...current._children);
      }
    }

    return results;
  }

  invalidateCache(element = null) {
    if (element) {
      this._idCache.delete(element);
      this._pathCache.delete(element);
      
      if (element._parent) {
        this.invalidateCache(element._parent);
      }
    } else {
      this._idCache.clear();
      this._pathCache.clear();
      this._keyedIndex.clear();
      this._unkeyedIndex.clear();
    }
  }

  getDebugInfo(element) {
    return {
      id: this.getElementId(element),
      path: this.getWidgetPath(element),
      strategy: this.getIdentificationStrategy(element),
      type: element.widget.constructor.name,
      key: element.widget.key || null,
      depth: element._depth,
      childCount: element._children?.length || 0
    };
  }
}

export { ElementIdentifier };