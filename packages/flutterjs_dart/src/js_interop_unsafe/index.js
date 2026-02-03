
/**
 * Dart JS Interop Unsafe Library
 * Implements dart:js_interop_unsafe functionality for FlutterJS
 */

import { globalJS } from '../js_interop/index.js';

export { globalJS };

/**
 * Gets a property from a JS object.
 * Corresponds to `extension JSObjectUtilExtension on JSObject { getProperty ... }`
 */
export function getProperty(obj, key) {
    return obj[key];
}

/**
 * Sets a property on a JS object.
 */
export function setProperty(obj, key, value) {
    obj[key] = value;
}

/**
 * Calls a method on a JS object.
 */
export function callMethod(obj, method, ...args) {
    if (typeof obj[method] === 'function') {
        return obj[method](...args);
    }
    throw new Error(`Method ${method} not found on object`);
}

/**
 * Type check helper if needed
 */
export function hasProperty(obj, key) {
    return key in obj;
}
