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

var isFunction = require('./util').isFunction;



// This module contains:
// - built-in annotation classes
// - helpers to read/write annotations


// ANNOTATIONS

// A built-in token.
// Used to ask for pre-injected parent constructor.
// A class constructor can ask for this.
var SuperConstructor = function SuperConstructor() {};

// A built-in scope.
// Never cache.
var TransientScope = function TransientScope() {};

var Inject = function Inject() {
  var tokens = _slice.call(arguments);

  this.tokens = tokens;
  this.isPromise = false;
  this.isLazy = false;
};

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

var Provide = function Provide(token) {
  this.token = token;
  this.isPromise = false;
};

var ProvidePromise = (function (Provide) {
  var ProvidePromise = function ProvidePromise(token) {
    this.token = token;
    this.isPromise = true;
  };

  _extends(ProvidePromise, Provide);

  return ProvidePromise;
})(Provide);




// HELPERS

// Append annotation on a function or class.
// This can be helpful when not using ES6+.
function annotate(fn, annotation) {
  if (fn.annotations === Object.getPrototypeOf(fn).annotations) {
    fn.annotations = [];
  }

  fn.annotations = fn.annotations || [];
  fn.annotations.push(annotation);
}


// Read annotations on a function or class and return whether given annotation is present.
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


// Read annotations on a function or class and collect "interesting" metadata:
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


exports.annotate = annotate;
exports.hasAnnotation = hasAnnotation;
exports.readAnnotations = readAnnotations;
exports.SuperConstructor = SuperConstructor;
exports.TransientScope = TransientScope;
exports.Inject = Inject;
exports.InjectPromise = InjectPromise;
exports.InjectLazy = InjectLazy;
exports.Provide = Provide;
exports.ProvidePromise = ProvidePromise;
//# sourceMappingURL=maps/annotations.js.map