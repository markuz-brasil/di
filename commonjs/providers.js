"use strict";

exports.createProviderFromFnOrClass = createProviderFromFnOrClass;
var SuperConstructorAnnotation = require('./annotations').SuperConstructor;
var readAnnotations = require('./annotations').readAnnotations;
var hasAnnotation = require('./annotations').hasAnnotation;
var ConstructorAnnotation = require('./annotations').Constructor;
var isFunction = require('./util').isFunction;
var isObject = require('./util').isObject;
var toString = require('./util').toString;



// Provider is responsible for creating instances.
//
// responsibilities:
// - create instances
//
// communication:
// - exposes `create()` which creates an instance of something
// - exposes `params` (information about which arguments it requires to be passed into `create()`)
//
// Injector reads `provider.params` first, create these dependencies (however it wants),
// then calls `provider.create(args)`, passing in these arguments.


var EmptyFunction = Object.getPrototypeOf(Function);


// ClassProvider knows how to instantiate classes.
//
// If a class inherits (has parent constructors), this provider normalizes all the dependencies
// into a single flat array first, so that the injector does not need to worry about inheritance.
//
// - all the state is immutable (constructed)
//
// TODO(vojta): super constructor - should be only allowed during the constructor call?
var ClassProvider = (function () {
  var ClassProvider = function ClassProvider(clazz, params, isPromise) {
    // TODO(vojta): can we hide this.provider? (only used for hasAnnotation(provider.provider))
    this.provider = clazz;
    this.isPromise = isPromise;

    this.params = [];
    this._constructors = [];

    this._flattenParams(clazz, params);
    this._constructors.unshift([clazz, 0, this.params.length - 1]);
  };

  ClassProvider.prototype._flattenParams = function (constructor, params) {
    var SuperConstructor;
    var constructorInfo;

    for (var _iterator = params[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) {
      var param = _step.value;
      if (param.token === SuperConstructorAnnotation) {
        SuperConstructor = Object.getPrototypeOf(constructor);

        if (SuperConstructor === EmptyFunction) {
          throw new Error("" + toString(constructor) + " does not have a parent constructor. Only classes with a parent can ask for SuperConstructor!");
        }

        constructorInfo = [SuperConstructor, this.params.length];
        this._constructors.push(constructorInfo);
        this._flattenParams(SuperConstructor, readAnnotations(SuperConstructor).params);
        constructorInfo.push(this.params.length - 1);
      } else {
        this.params.push(param);
      }
    }
  };

  ClassProvider.prototype._createConstructor = function (currentConstructorIdx, context, allArguments) {
    var constructorInfo = this._constructors[currentConstructorIdx];
    var nextConstructorInfo = this._constructors[currentConstructorIdx + 1];
    var argsForCurrentConstructor;

    if (nextConstructorInfo) {
      argsForCurrentConstructor = allArguments.slice(constructorInfo[1], nextConstructorInfo[1]).concat([this._createConstructor(currentConstructorIdx + 1, context, allArguments)]).concat(allArguments.slice(nextConstructorInfo[2] + 1, constructorInfo[2] + 1));
    } else {
      argsForCurrentConstructor = allArguments.slice(constructorInfo[1], constructorInfo[2] + 1);
    }

    return function InjectedAndBoundSuperConstructor() {
      // TODO(vojta): throw if arguments given
      return constructorInfo[0].apply(context, argsForCurrentConstructor);
    };
  };

  ClassProvider.prototype.create = function (args) {
    var context = Object.create(this.provider.prototype);
    var constructor = this._createConstructor(0, context, args);
    var returnedValue = constructor();

    if (isFunction(returnedValue) || isObject(returnedValue)) {
      return returnedValue;
    }

    return context;
  };

  return ClassProvider;
})();




// FactoryProvider knows how to create instance from a factory function.
// - all the state is immutable
var FactoryProvider = (function () {
  var FactoryProvider = function FactoryProvider(factoryFunction, params, isPromise) {
    this.provider = factoryFunction;
    this.params = params;
    this.isPromise = isPromise;

    for (var _iterator2 = params[Symbol.iterator](), _step2; !(_step2 = _iterator2.next()).done;) {
      var param = _step2.value;
      if (param.token === SuperConstructorAnnotation) {
        throw new Error("" + toString(factoryFunction) + " is not a class. Only classes with a parent can ask for SuperConstructor!");
      }
    }
  };

  FactoryProvider.prototype.create = function (args) {
    return this.provider.apply(undefined, args);
  };

  return FactoryProvider;
})();

function createProviderFromFnOrClass(ClassOrFactory, annotations) {
  if (hasAnnotation(ClassOrFactory, ConstructorAnnotation)) {
    return new ClassProvider(ClassOrFactory, annotations.params, annotations.provide.isPromise);
  }

  return new FactoryProvider(ClassOrFactory, annotations.params, annotations.provide.isPromise);
}
//# sourceMappingURL=maps/providers.js.map