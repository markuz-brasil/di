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
//# sourceMappingURL=data:application/json;base64,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cUJBQVMsRUFBRSxlQUFlLENBQUMsU0FBUztBQUNwQyxrQkFBTSxFQUFFLGVBQWUsQ0FBQyxNQUFNO1dBQy9CLENBQUM7U0FDSDs7S0FFSixDQUFDLENBQUM7R0FDSjs7QUFFRCxTQUFPLG9CQUFvQixDQUFDO0NBQzdCOzs7UUFJQyxRQUFRLEdBQVIsUUFBUTtRQUNSLGFBQWEsR0FBYixhQUFhO1FBQ2IsZUFBZSxHQUFmLGVBQWU7UUFFZixnQkFBZ0IsR0FBaEIsZ0JBQWdCO1FBQ2hCLGNBQWMsR0FBZCxjQUFjO1FBQ2QsTUFBTSxHQUFOLE1BQU07UUFDTixhQUFhLEdBQWIsYUFBYTtRQUNiLFVBQVUsR0FBVixVQUFVO1FBQ1YsT0FBTyxHQUFQLE9BQU87UUFDUCxjQUFjLEdBQWQsY0FBYyIsImZpbGUiOiJhbm5vdGF0aW9ucy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7aXNGdW5jdGlvbn0gZnJvbSAnLi91dGlsJztcblxuXG4vLyBUaGlzIG1vZHVsZSBjb250YWluczpcbi8vIC0gYnVpbHQtaW4gYW5ub3RhdGlvbiBjbGFzc2VzXG4vLyAtIGhlbHBlcnMgdG8gcmVhZC93cml0ZSBhbm5vdGF0aW9uc1xuXG5cbi8vIEFOTk9UQVRJT05TXG5cbi8vIEEgYnVpbHQtaW4gdG9rZW4uXG4vLyBVc2VkIHRvIGFzayBmb3IgcHJlLWluamVjdGVkIHBhcmVudCBjb25zdHJ1Y3Rvci5cbi8vIEEgY2xhc3MgY29uc3RydWN0b3IgY2FuIGFzayBmb3IgdGhpcy5cbmNsYXNzIFN1cGVyQ29uc3RydWN0b3Ige31cblxuLy8gQSBidWlsdC1pbiBzY29wZS5cbi8vIE5ldmVyIGNhY2hlLlxuY2xhc3MgVHJhbnNpZW50U2NvcGUge31cblxuY2xhc3MgSW5qZWN0IHtcbiAgY29uc3RydWN0b3IoLi4udG9rZW5zKSB7XG4gICAgdGhpcy50b2tlbnMgPSB0b2tlbnM7XG4gICAgdGhpcy5pc1Byb21pc2UgPSBmYWxzZTtcbiAgICB0aGlzLmlzTGF6eSA9IGZhbHNlO1xuICB9XG59XG5cbmNsYXNzIEluamVjdFByb21pc2UgZXh0ZW5kcyBJbmplY3Qge1xuICBjb25zdHJ1Y3RvciguLi50b2tlbnMpIHtcbiAgICB0aGlzLnRva2VucyA9IHRva2VucztcbiAgICB0aGlzLmlzUHJvbWlzZSA9IHRydWU7XG4gICAgdGhpcy5pc0xhenkgPSBmYWxzZTtcbiAgfVxufVxuXG5jbGFzcyBJbmplY3RMYXp5IGV4dGVuZHMgSW5qZWN0IHtcbiAgY29uc3RydWN0b3IoLi4udG9rZW5zKSB7XG4gICAgdGhpcy50b2tlbnMgPSB0b2tlbnM7XG4gICAgdGhpcy5pc1Byb21pc2UgPSBmYWxzZTtcbiAgICB0aGlzLmlzTGF6eSA9IHRydWU7XG4gIH1cbn1cblxuY2xhc3MgUHJvdmlkZSB7XG4gIGNvbnN0cnVjdG9yKHRva2VuKSB7XG4gICAgdGhpcy50b2tlbiA9IHRva2VuO1xuICAgIHRoaXMuaXNQcm9taXNlID0gZmFsc2U7XG4gIH1cbn1cblxuY2xhc3MgUHJvdmlkZVByb21pc2UgZXh0ZW5kcyBQcm92aWRlIHtcbiAgY29uc3RydWN0b3IodG9rZW4pIHtcbiAgICB0aGlzLnRva2VuID0gdG9rZW47XG4gICAgdGhpcy5pc1Byb21pc2UgPSB0cnVlO1xuICB9XG59XG5cblxuLy8gSEVMUEVSU1xuXG4vLyBBcHBlbmQgYW5ub3RhdGlvbiBvbiBhIGZ1bmN0aW9uIG9yIGNsYXNzLlxuLy8gVGhpcyBjYW4gYmUgaGVscGZ1bCB3aGVuIG5vdCB1c2luZyBFUzYrLlxuZnVuY3Rpb24gYW5ub3RhdGUoZm4sIGFubm90YXRpb24pIHtcblxuICBpZiAoZm4uYW5ub3RhdGlvbnMgPT09IE9iamVjdC5nZXRQcm90b3R5cGVPZihmbikuYW5ub3RhdGlvbnMpIHtcbiAgICBmbi5hbm5vdGF0aW9ucyA9IFtdXG4gIH1cblxuICBmbi5hbm5vdGF0aW9ucyA9IGZuLmFubm90YXRpb25zIHx8IFtdO1xuICBmbi5hbm5vdGF0aW9ucy5wdXNoKGFubm90YXRpb24pO1xufVxuXG5cbi8vIFJlYWQgYW5ub3RhdGlvbnMgb24gYSBmdW5jdGlvbiBvciBjbGFzcyBhbmQgcmV0dXJuIHdoZXRoZXIgZ2l2ZW4gYW5ub3RhdGlvbiBpcyBwcmVzZW50LlxuZnVuY3Rpb24gaGFzQW5ub3RhdGlvbihmbiwgYW5ub3RhdGlvbkNsYXNzKSB7XG4gIGlmICghZm4uYW5ub3RhdGlvbnMgfHwgZm4uYW5ub3RhdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZm9yICh2YXIgYW5ub3RhdGlvbiBvZiBmbi5hbm5vdGF0aW9ucykge1xuICAgIGlmIChhbm5vdGF0aW9uIGluc3RhbmNlb2YgYW5ub3RhdGlvbkNsYXNzKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cblxuLy8gUmVhZCBhbm5vdGF0aW9ucyBvbiBhIGZ1bmN0aW9uIG9yIGNsYXNzIGFuZCBjb2xsZWN0IFwiaW50ZXJlc3RpbmdcIiBtZXRhZGF0YTpcbmZ1bmN0aW9uIHJlYWRBbm5vdGF0aW9ucyhmbikge1xuICB2YXIgY29sbGVjdGVkQW5ub3RhdGlvbnMgPSB7XG4gICAgLy8gRGVzY3JpcHRpb24gb2YgdGhlIHByb3ZpZGVkIHZhbHVlLlxuICAgIHByb3ZpZGU6IHtcbiAgICAgIHRva2VuOiBudWxsLFxuICAgICAgaXNQcm9taXNlOiBmYWxzZVxuICAgIH0sXG5cbiAgICAvLyBMaXN0IG9mIHBhcmFtZXRlciBkZXNjcmlwdGlvbnMuXG4gICAgLy8gQSBwYXJhbWV0ZXIgZGVzY3JpcHRpb24gaXMgYW4gb2JqZWN0IHdpdGggcHJvcGVydGllczpcbiAgICAvLyAtIHRva2VuIChhbnl0aGluZylcbiAgICAvLyAtIGlzUHJvbWlzZSAoYm9vbGVhbilcbiAgICAvLyAtIGlzTGF6eSAoYm9vbGVhbilcbiAgICBwYXJhbXM6IFtdXG4gIH07XG5cbiAgaWYgKGZuLmFubm90YXRpb25zICYmIGZuLmFubm90YXRpb25zLmxlbmd0aCkge1xuICAgIGZvciAodmFyIGFubm90YXRpb24gb2YgZm4uYW5ub3RhdGlvbnMpIHtcbiAgICAgIGlmIChhbm5vdGF0aW9uIGluc3RhbmNlb2YgSW5qZWN0KSB7XG4gICAgICAgIGFubm90YXRpb24udG9rZW5zLmZvckVhY2goKHRva2VuKSA9PiB7XG4gICAgICAgICAgY29sbGVjdGVkQW5ub3RhdGlvbnMucGFyYW1zLnB1c2goe1xuICAgICAgICAgICAgdG9rZW46IHRva2VuLFxuICAgICAgICAgICAgaXNQcm9taXNlOiBhbm5vdGF0aW9uLmlzUHJvbWlzZSxcbiAgICAgICAgICAgIGlzTGF6eTogYW5ub3RhdGlvbi5pc0xhenlcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChhbm5vdGF0aW9uIGluc3RhbmNlb2YgUHJvdmlkZSkge1xuICAgICAgICBjb2xsZWN0ZWRBbm5vdGF0aW9ucy5wcm92aWRlLnRva2VuID0gYW5ub3RhdGlvbi50b2tlbjtcbiAgICAgICAgY29sbGVjdGVkQW5ub3RhdGlvbnMucHJvdmlkZS5pc1Byb21pc2UgPSBhbm5vdGF0aW9uLmlzUHJvbWlzZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBSZWFkIGFubm90YXRpb25zIGZvciBpbmRpdmlkdWFsIHBhcmFtZXRlcnMuXG4gIGlmIChmbi5wYXJhbWV0ZXJzKSB7XG4gICAgZm4ucGFyYW1ldGVycy5mb3JFYWNoKChwYXJhbSwgaWR4KSA9PiB7XG4gICAgICBmb3IgKHZhciBwYXJhbUFubm90YXRpb24gb2YgcGFyYW0pIHtcbiAgICAgICAgLy8gVHlwZSBhbm5vdGF0aW9uLlxuICAgICAgICBpZiAoaXNGdW5jdGlvbihwYXJhbUFubm90YXRpb24pICYmICFjb2xsZWN0ZWRBbm5vdGF0aW9ucy5wYXJhbXNbaWR4XSkge1xuICAgICAgICAgIGNvbGxlY3RlZEFubm90YXRpb25zLnBhcmFtc1tpZHhdID0ge1xuICAgICAgICAgICAgdG9rZW46IHBhcmFtQW5ub3RhdGlvbixcbiAgICAgICAgICAgIGlzUHJvbWlzZTogZmFsc2UsXG4gICAgICAgICAgICBpc0xhenk6IGZhbHNlXG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmIChwYXJhbUFubm90YXRpb24gaW5zdGFuY2VvZiBJbmplY3QpIHtcbiAgICAgICAgICBjb2xsZWN0ZWRBbm5vdGF0aW9ucy5wYXJhbXNbaWR4XSA9IHtcbiAgICAgICAgICAgIHRva2VuOiBwYXJhbUFubm90YXRpb24udG9rZW5zWzBdLFxuICAgICAgICAgICAgaXNQcm9taXNlOiBwYXJhbUFubm90YXRpb24uaXNQcm9taXNlLFxuICAgICAgICAgICAgaXNMYXp5OiBwYXJhbUFubm90YXRpb24uaXNMYXp5XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGNvbGxlY3RlZEFubm90YXRpb25zO1xufVxuXG5cbmV4cG9ydCB7XG4gIGFubm90YXRlLFxuICBoYXNBbm5vdGF0aW9uLFxuICByZWFkQW5ub3RhdGlvbnMsXG5cbiAgU3VwZXJDb25zdHJ1Y3RvcixcbiAgVHJhbnNpZW50U2NvcGUsXG4gIEluamVjdCxcbiAgSW5qZWN0UHJvbWlzZSxcbiAgSW5qZWN0TGF6eSxcbiAgUHJvdmlkZSxcbiAgUHJvdmlkZVByb21pc2Vcbn07XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=