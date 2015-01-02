"use strict";

exports.isFunction = isFunction;
exports.isObject = isObject;
exports.toString = toString;
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
//# sourceMappingURL=maps/util.js.map