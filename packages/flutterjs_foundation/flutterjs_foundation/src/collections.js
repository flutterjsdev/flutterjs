// Flutter foundation/collections.dart → JS
// setEquals, listEquals, mapEquals, binarySearch, mergeSort

export function setEquals(a, b) {
  if (a == null) return b == null;
  if (b == null || a.size !== b.size) return false;
  if (a === b) return true;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

export function listEquals(a, b) {
  if (a == null) return b == null;
  if (b == null || a.length !== b.length) return false;
  if (a === b) return true;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function mapEquals(a, b) {
  if (a == null) return b == null;
  const aIsMap = a instanceof Map;
  const bIsMap = b instanceof Map;
  if (aIsMap !== bIsMap) return false;
  if (aIsMap) {
    if (b == null || a.size !== b.size) return false;
    if (a === b) return true;
    for (const [k, v] of a) {
      if (!b.has(k) || b.get(k) !== v) return false;
    }
  } else {
    // Plain object
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (bKeys == null || aKeys.length !== bKeys.length) return false;
    if (a === b) return true;
    for (const k of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, k) || b[k] !== a[k]) return false;
    }
  }
  return true;
}

export function binarySearch(sortedList, value) {
  let min = 0;
  let max = sortedList.length;
  while (min < max) {
    const mid = min + ((max - min) >> 1);
    const element = sortedList[mid];
    const comp = _compare(element, value);
    if (comp === 0) return mid;
    if (comp < 0) {
      min = mid + 1;
    } else {
      max = mid;
    }
  }
  return -1;
}

function _compare(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

const _kMergeSortLimit = 32;

export function mergeSort(list, { start = 0, end = null, compare = null } = {}) {
  if (end == null) end = list.length;
  if (compare == null) compare = _compare;
  const length = end - start;
  if (length < 2) return;
  if (length < _kMergeSortLimit) {
    _insertionSort(list, compare, start, end);
    return;
  }
  const middle = start + ((end - start) >> 1);
  const firstLength = middle - start;
  const secondLength = end - middle;
  const scratchSpace = new Array(secondLength);
  _mergeSort(list, compare, middle, end, scratchSpace, 0);
  const firstTarget = end - firstLength;
  _mergeSort(list, compare, start, middle, list, firstTarget);
  _merge(compare, list, firstTarget, end, scratchSpace, 0, secondLength, list, start);
}

function _insertionSort(list, compare, start, end) {
  for (let pos = start + 1; pos < end; pos++) {
    let min = start;
    let max = pos;
    const element = list[pos];
    while (min < max) {
      const mid = min + ((max - min) >> 1);
      if (compare(element, list[mid]) < 0) {
        max = mid;
      } else {
        min = mid + 1;
      }
    }
    list.copyWithin(min + 1, min, pos);
    list[min] = element;
  }
}

function _movingInsertionSort(list, compare, start, end, target, targetOffset) {
  const length = end - start;
  if (length === 0) return;
  target[targetOffset] = list[start];
  for (let i = 1; i < length; i++) {
    const element = list[start + i];
    let min = targetOffset;
    let max = targetOffset + i;
    while (min < max) {
      const mid = min + ((max - min) >> 1);
      if (compare(element, target[mid]) < 0) {
        max = mid;
      } else {
        min = mid + 1;
      }
    }
    target.copyWithin(min + 1, min, targetOffset + i);
    target[min] = element;
  }
}

function _mergeSort(list, compare, start, end, target, targetOffset) {
  const length = end - start;
  if (length < _kMergeSortLimit) {
    _movingInsertionSort(list, compare, start, end, target, targetOffset);
    return;
  }
  const middle = start + (length >> 1);
  const firstLength = middle - start;
  const secondLength = end - middle;
  const targetMiddle = targetOffset + firstLength;
  _mergeSort(list, compare, middle, end, target, targetMiddle);
  _mergeSort(list, compare, start, middle, list, middle);
  _merge(compare, list, middle, middle + firstLength, target, targetMiddle, targetMiddle + secondLength, target, targetOffset);
}

function _merge(compare, firstList, firstStart, firstEnd, secondList, secondStart, secondEnd, target, targetOffset) {
  let cursor1 = firstStart;
  let cursor2 = secondStart;
  let firstElement = firstList[cursor1++];
  let secondElement = secondList[cursor2++];
  while (true) {
    if (compare(firstElement, secondElement) <= 0) {
      target[targetOffset++] = firstElement;
      if (cursor1 === firstEnd) break;
      firstElement = firstList[cursor1++];
    } else {
      target[targetOffset++] = secondElement;
      if (cursor2 !== secondEnd) {
        secondElement = secondList[cursor2++];
        continue;
      }
      target[targetOffset++] = firstElement;
      for (let i = cursor1; i < firstEnd; i++) target[targetOffset++] = firstList[i];
      return;
    }
  }
  target[targetOffset++] = secondElement;
  for (let i = cursor2; i < secondEnd; i++) target[targetOffset++] = secondList[i];
}
