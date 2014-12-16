"use strict";

var _slice = Array.prototype.slice;
var _extends = function (child, parent) {
  child.prototype = Object.create(parent.prototype, {
    constructor: {
      value: child,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  child.__proto__ = parent;
};

exports.annotate = annotate;
exports.hasAnnotation = hasAnnotation;
exports.readAnnotations = readAnnotations;
var isFunction = require('./util').isFunction;
var SuperConstructor = function SuperConstructor() {};

exports.SuperConstructor = SuperConstructor;
var TransientScope = function TransientScope() {};

exports.TransientScope = TransientScope;
var Inject = function Inject() {
  var tokens = _slice.call(arguments);

  this.tokens = tokens;
  this.isPromise = false;
  this.isLazy = false;
};

exports.Inject = Inject;
var InjectPromise = (function (Inject) {
  var InjectPromise = function InjectPromise() {
    var tokens = _slice.call(arguments);

    this.tokens = tokens;
    this.isPromise = true;
    this.isLazy = false;
  };

  _extends(InjectPromise, Inject);

  return InjectPromise;
})(Inject);

exports.InjectPromise = InjectPromise;
var InjectLazy = (function (Inject) {
  var InjectLazy = function InjectLazy() {
    var tokens = _slice.call(arguments);

    this.tokens = tokens;
    this.isPromise = false;
    this.isLazy = true;
  };

  _extends(InjectLazy, Inject);

  return InjectLazy;
})(Inject);

exports.InjectLazy = InjectLazy;
var Provide = function Provide(token) {
  this.token = token;
  this.isPromise = false;
};

exports.Provide = Provide;
var ProvidePromise = (function (Provide) {
  var ProvidePromise = function ProvidePromise(token) {
    this.token = token;
    this.isPromise = true;
  };

  _extends(ProvidePromise, Provide);

  return ProvidePromise;
})(Provide);

exports.ProvidePromise = ProvidePromise;
function annotate(fn, annotation) {
  if (fn.annotations === Object.getPrototypeOf(fn).annotations) {
    fn.annotations = [];
  }

  fn.annotations = fn.annotations || [];
  fn.annotations.push(annotation);
}


function hasAnnotation(fn, annotationClass) {
  if (!fn.annotations || fn.annotations.length === 0) {
    return false;
  }

  for (var _iterator = fn.annotations[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) {
    var annotation = _step.value;
    if (annotation instanceof annotationClass) {
      return true;
    }
  }

  return false;
}


function readAnnotations(fn) {
  var collectedAnnotations = {
    // Description of the provided value.
    provide: {
      token: null,
      isPromise: false
    },

    // List of parameter descriptions.
    // A parameter description is an object with properties:
    // - token (anything)
    // - isPromise (boolean)
    // - isLazy (boolean)
    params: []
  };

  if (fn.annotations && fn.annotations.length) {
    for (var _iterator2 = fn.annotations[Symbol.iterator](), _step2; !(_step2 = _iterator2.next()).done;) {
      var annotation = _step2.value;
      if (annotation instanceof Inject) {
        annotation.tokens.forEach(function (token) {
          collectedAnnotations.params.push({
            token: token,
            isPromise: annotation.isPromise,
            isLazy: annotation.isLazy
          });
        });
      }

      if (annotation instanceof Provide) {
        collectedAnnotations.provide.token = annotation.token;
        collectedAnnotations.provide.isPromise = annotation.isPromise;
      }
    }
  }

  // Read annotations for individual parameters.
  if (fn.parameters) {
    fn.parameters.forEach(function (param, idx) {
      for (var _iterator3 = param[Symbol.iterator](), _step3; !(_step3 = _iterator3.next()).done;) {
        var paramAnnotation = _step3.value;
        // Type annotation.
        if (isFunction(paramAnnotation) && !collectedAnnotations.params[idx]) {
          collectedAnnotations.params[idx] = {
            token: paramAnnotation,
            isPromise: false,
            isLazy: false
          };
        } else if (paramAnnotation instanceof Inject) {
          collectedAnnotations.params[idx] = {
            token: paramAnnotation.tokens[0],
            isPromise: paramAnnotation.isPromise,
            isLazy: paramAnnotation.isLazy
          };
        }
      }
    });
  }

  return collectedAnnotations;
}
//# sourceMappingURL=maps/annotations.js.map