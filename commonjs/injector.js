"use strict";

var annotate = require('./annotations').annotate;
var readAnnotations = require('./annotations').readAnnotations;
var hasAnnotation = require('./annotations').hasAnnotation;
var ProvideAnnotation = require('./annotations').Provide;
var FactoryAnnotation = require('./annotations').Factory;
var TransientScopeAnnotation = require('./annotations').TransientScope;
var isFunction = require('./util').isFunction;
var toString = require('./util').toString;
var createProviderFromFnOrClass = require('./providers').createProviderFromFnOrClass;



function constructResolvingMessage(resolving, token) {
  // If a token is passed in, add it into the resolving array.
  // We need to check arguments.length because it can be null/undefined.
  if (arguments.length > 1) {
    resolving.push(token);
  }

  if (resolving.length > 1) {
    return " (" + resolving.map(toString).join(" -> ") + ")";
  }

  return "";
}


// Injector encapsulate a life scope.
// There is exactly one instance for given token in given injector.
//
// All the state is immutable, the only state changes is the cache. There is however no way to produce different instance under given token. In that sense it is immutable.
//
// Injector is responsible for:
// - resolving tokens into
//   - provider
//   - value (cache/calling provider)
// - dealing with isPromise
// - dealing with isLazy
// - loading different "providers" and modules
var Injector = (function () {
  var Injector = function Injector(modules, parentInjector, providers, scopes) {
    if (modules === undefined) modules = [];
    if (parentInjector === undefined) parentInjector = null;
    if (providers === undefined) providers = new Map();
    if (scopes === undefined) scopes = [];
    this._cache = new Map();
    this._providers = providers;
    this._parent = parentInjector;
    this._scopes = scopes;

    this._loadModules(modules);
  };

  Injector.prototype._collectProvidersWithAnnotation = function (annotationClass, collectedProviders) {
    this._providers.forEach(function (provider, token) {
      if (!collectedProviders.has(token) && hasAnnotation(provider.provider, annotationClass)) {
        collectedProviders.set(token, provider);
      }
    });

    if (this._parent) {
      this._parent._collectProvidersWithAnnotation(annotationClass, collectedProviders);
    }
  };

  Injector.prototype._loadModules = function (modules) {
    for (var _iterator = modules[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) {
      var module = _step.value;
      // A single provider (class or function).
      if (isFunction(module)) {
        this._loadFnOrClass(module);
        continue;
      }

      throw new Error("Invalid module!");
    }
  };

  Injector.prototype._loadFnOrClass = function (fnOrClass) {
    // TODO(vojta): should we expose provider.token?
    var annotations = readAnnotations(fnOrClass);
    var token = annotations.provide.token || fnOrClass;
    var provider = createProviderFromFnOrClass(fnOrClass, annotations);

    this._providers.set(token, provider);
  };

  Injector.prototype._hasProviderFor = function (token) {
    if (this._providers.has(token)) {
      return true;
    }

    if (this._parent) {
      return this._parent._hasProviderFor(token);
    }

    return false;
  };

  Injector.prototype._instantiateDefaultProvider = function (provider, token, resolving, wantPromise, wantLazy) {
    // In root injector, instantiate here.
    if (!this._parent) {
      this._providers.set(token, provider);
      return this.get(token, resolving, wantPromise, wantLazy);
    }

    for (var _iterator2 = this._scopes[Symbol.iterator](), _step2; !(_step2 = _iterator2.next()).done;) {
      var ScopeClass = _step2.value;
      if (hasAnnotation(provider.provider, ScopeClass)) {
        this._providers.set(token, provider);
        return this.get(token, resolving, wantPromise, wantLazy);
      }
    }

    // Otherwise ask parent injector.
    return this._parent._instantiateDefaultProvider(provider, token, resolving, wantPromise, wantLazy);
  };

  Injector.prototype.get = function (token, resolving, wantPromise, wantLazy) {
    var _this = this;
    if (resolving === undefined) resolving = [];
    if (wantPromise === undefined) wantPromise = false;
    if (wantLazy === undefined) wantLazy = false;
    var resolvingMsg = "";
    var provider;
    var instance;
    var injector = this;

    if (token === null || token === undefined) {
      resolvingMsg = constructResolvingMessage(resolving, token);
      throw new Error("Invalid token \"" + token + "\" requested!" + resolvingMsg);
    }

    // Special case, return itself.
    if (token === Injector) {
      if (wantPromise) {
        return Promise.resolve(this);
      }

      return this;
    }

    // TODO(vojta): optimize - no child injector for locals?
    if (wantLazy) {
      return function createLazyInstance() {
        var lazyInjector = injector;

        if (arguments.length) {
          var locals = [];
          var args = arguments;

          for (var i = 0; i < args.length; i += 2) {
            locals.push((function (ii) {
              var fn = function createLocalInstance() {
                return args[ii + 1];
              };

              annotate(fn, new FactoryAnnotation());
              annotate(fn, new ProvideAnnotation(args[ii]));

              return fn;
            })(i));
          }

          lazyInjector = injector.createChild(locals);
        }

        return lazyInjector.get(token, resolving, wantPromise, false);
      };
    }

    // Check if there is a cached instance already.
    if (this._cache.has(token)) {
      instance = this._cache.get(token);
      provider = this._providers.get(token);

      if (provider.isPromise && !wantPromise) {
        resolvingMsg = constructResolvingMessage(resolving, token);
        throw new Error("Cannot instantiate " + toString(token) + " synchronously. It is provided as a promise!" + resolvingMsg);
      }

      if (!provider.isPromise && wantPromise) {
        return Promise.resolve(instance);
      }

      return instance;
    }

    provider = this._providers.get(token);

    // No provider defined (overridden), use the default provider (token).
    if (!provider && isFunction(token) && !this._hasProviderFor(token)) {
      provider = createProviderFromFnOrClass(token, readAnnotations(token));
      return this._instantiateDefaultProvider(provider, token, resolving, wantPromise, wantLazy);
    }

    if (!provider) {
      if (!this._parent) {
        resolvingMsg = constructResolvingMessage(resolving, token);
        throw new Error("No provider for " + toString(token) + "!" + resolvingMsg);
      }

      return this._parent.get(token, resolving, wantPromise, wantLazy);
    }

    if (resolving.indexOf(token) !== -1) {
      resolvingMsg = constructResolvingMessage(resolving, token);
      throw new Error("Cannot instantiate cyclic dependency!" + resolvingMsg);
    }

    resolving.push(token);

    // TODO(vojta): handle these cases:
    // 1/
    // - requested as promise (delayed)
    // - requested again as promise (before the previous gets resolved) -> cache the promise
    // 2/
    // - requested as promise (delayed)
    // - requested again sync (before the previous gets resolved)
    // -> error, but let it go inside to throw where exactly is the async provider
    var delayingInstantiation = wantPromise && provider.params.some(function (param) {
      return !param.isPromise;
    });
    var args = provider.params.map(function (param) {
      if (delayingInstantiation) {
        return _this.get(param.token, resolving, true, param.isLazy);
      }

      return _this.get(param.token, resolving, param.isPromise, param.isLazy);
    });

    // Delaying the instantiation - return a promise.
    if (delayingInstantiation) {
      var delayedResolving = resolving.slice(); // clone

      resolving.pop();

      // Once all dependencies (promises) are resolved, instantiate.
      return Promise.all(args).then(function (args) {
        try {
          instance = provider.create(args);
        } catch (e) {
          resolvingMsg = constructResolvingMessage(delayedResolving);
          var originalMsg = "ORIGINAL ERROR: " + e.message;
          e.message = "Error during instantiation of " + toString(token) + "!" + resolvingMsg + "\n" + originalMsg;
          throw e;
        }

        if (!hasAnnotation(provider.provider, TransientScopeAnnotation)) {
          injector._cache.set(token, instance);
        }

        // TODO(vojta): if a provider returns a promise (but is not declared as @ProvidePromise),
        // here the value will get unwrapped (because it is returned from a promise callback) and
        // the actual value will be injected. This is probably not desired behavior. Maybe we could
        // get rid off the @ProvidePromise and just check the returned value, whether it is
        // a promise or not.
        return instance;
      });
    }

    try {
      instance = provider.create(args);
    } catch (e) {
      resolvingMsg = constructResolvingMessage(resolving);
      var originalMsg = "ORIGINAL ERROR: " + e.message;
      e.message = "Error during instantiation of " + toString(token) + "!" + resolvingMsg + "\n" + originalMsg;
      throw e;
    }

    if (!hasAnnotation(provider.provider, TransientScopeAnnotation)) {
      this._cache.set(token, instance);
    }

    if (!wantPromise && provider.isPromise) {
      resolvingMsg = constructResolvingMessage(resolving);

      throw new Error("Cannot instantiate " + toString(token) + " synchronously. It is provided as a promise!" + resolvingMsg);
    }

    if (wantPromise && !provider.isPromise) {
      instance = Promise.resolve(instance);
    }

    resolving.pop();

    return instance;
  };

  Injector.prototype.getPromise = function (token) {
    return this.get(token, [], true);
  };

  Injector.prototype.createChild = function (modules, forceNewInstancesOf) {
    if (modules === undefined) modules = [];
    if (forceNewInstancesOf === undefined) forceNewInstancesOf = [];
    var forcedProviders = new Map();

    // Always force new instance of TransientScope.
    forceNewInstancesOf.push(TransientScopeAnnotation);

    for (var _iterator3 = forceNewInstancesOf[Symbol.iterator](), _step3; !(_step3 = _iterator3.next()).done;) {
      var annotation = _step3.value;
      this._collectProvidersWithAnnotation(annotation, forcedProviders);
    }

    return new Injector(modules, this, forcedProviders, forceNewInstancesOf);
  };

  return Injector;
})();

exports.Injector = Injector;
//# sourceMappingURL=maps/injector.js.map