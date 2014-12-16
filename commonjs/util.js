"use strict";

// A bunch of helper functions.


function isUpperCase(char) {
  return char.toUpperCase() === char;
}


function isClass(clsOrFunction) {
  if (clsOrFunction.name) {
    return isUpperCase(clsOrFunction.name.charAt(0));
  }

  return Object.keys(clsOrFunction.prototype).length > 0;
}


function isFunction(value) {
  return typeof value === "function";
}


function isObject(value) {
  return typeof value === "object";
}


function toString(token) {
  if (typeof token === "string") {
    return token;
  }

  if (token === undefined || token === null) {
    return "" + token;
  }

  if (token.name) {
    return token.name;
  }

  return token.toString();
}


exports.isUpperCase = isUpperCase;
exports.isClass = isClass;
exports.isFunction = isFunction;
exports.isObject = isObject;
exports.toString = toString;
//# sourceMappingURL=maps/util.js.map