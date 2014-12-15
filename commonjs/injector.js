"use strict";

var annotate = require('./annotations').annotate;
var readAnnotations = require('./annotations').readAnnotations;
var hasAnnotation = require('./annotations').hasAnnotation;
var ProvideAnnotation = require('./annotations').Provide;
var TransientScopeAnnotation = require('./annotations').TransientScope;
var isFunction = require('./util').isFunction;
var toString = require('./util').toString;
var profileInjector = require('./profiler').profileInjector;
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

    profileInjector(this, Injector);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluamVjdG9yLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0lBQ0UsUUFBUSw0QkFBUixRQUFRO0lBQ1IsZUFBZSw0QkFBZixlQUFlO0lBQ2YsYUFBYSw0QkFBYixhQUFhO0lBQ0YsaUJBQWlCLDRCQUE1QixPQUFPO0lBQ1csd0JBQXdCLDRCQUExQyxjQUFjO0lBR1IsVUFBVSxxQkFBVixVQUFVO0lBQUUsUUFBUSxxQkFBUixRQUFRO0lBQ3BCLGVBQWUseUJBQWYsZUFBZTtJQUNmLDJCQUEyQiwwQkFBM0IsMkJBQTJCOzs7O0FBR25DLFNBQVMseUJBQXlCLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRTs7O0FBR25ELE1BQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7QUFDeEIsYUFBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztHQUN2Qjs7QUFFRCxNQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO0FBQ3hCLGtCQUFZLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFJO0dBQ3JEOztBQUVELFNBQU8sRUFBRSxDQUFDO0NBQ1g7Ozs7Ozs7Ozs7Ozs7OztJQWVLLFFBQVE7TUFBUixRQUFRLEdBRUQsU0FGUCxRQUFRLENBRUEsT0FBTyxFQUFPLGNBQWMsRUFBUyxTQUFTLEVBQWMsTUFBTSxFQUFPO1FBQXpFLE9BQU8sZ0JBQVAsT0FBTyxHQUFHLEVBQUU7UUFBRSxjQUFjLGdCQUFkLGNBQWMsR0FBRyxJQUFJO1FBQUUsU0FBUyxnQkFBVCxTQUFTLEdBQUcsSUFBSSxHQUFHLEVBQUU7UUFBRSxNQUFNLGdCQUFOLE1BQU0sR0FBRyxFQUFFO0FBQ2pGLFFBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUN4QixRQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztBQUM1QixRQUFJLENBQUMsT0FBTyxHQUFHLGNBQWMsQ0FBQztBQUM5QixRQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQzs7QUFFdEIsUUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQzs7QUFFM0IsbUJBQWUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7R0FDakM7O0FBWEcsVUFBUSxXQWdCWiwrQkFBK0IsR0FBQSxVQUFDLGVBQWUsRUFBRSxrQkFBa0IsRUFBRTtBQUNuRSxRQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUs7QUFDM0MsVUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsRUFBRTtBQUN2RiwwQkFBa0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO09BQ3pDO0tBQ0YsQ0FBQyxDQUFDOztBQUVILFFBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtBQUNoQixVQUFJLENBQUMsT0FBTyxDQUFDLCtCQUErQixDQUFDLGVBQWUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0tBQ25GO0dBQ0Y7O0FBMUJHLFVBQVEsV0ErQlosWUFBWSxHQUFBLFVBQUMsT0FBTyxFQUFFO3lCQUNELE9BQU87VUFBakIsTUFBTTs7QUFFYixVQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRTtBQUN0QixZQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzVCLGlCQUFTO09BQ1Y7O0FBRUQsWUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDOztHQUV0Qzs7QUF6Q0csVUFBUSxXQThDWixjQUFjLEdBQUEsVUFBQyxTQUFTLEVBQUU7O0FBRXhCLFFBQUksV0FBVyxHQUFHLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUM3QyxRQUFJLEtBQUssR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxTQUFTLENBQUM7QUFDbkQsUUFBSSxRQUFRLEdBQUcsMkJBQTJCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDOztBQUVuRSxRQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7R0FDdEM7O0FBckRHLFVBQVEsV0EwRFosZUFBZSxHQUFBLFVBQUMsS0FBSyxFQUFFO0FBQ3JCLFFBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7QUFDOUIsYUFBTyxJQUFJLENBQUM7S0FDYjs7QUFFRCxRQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7QUFDaEIsYUFBTyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUM1Qzs7QUFFRCxXQUFPLEtBQUssQ0FBQztHQUNkOztBQXBFRyxVQUFRLFdBdUVaLDJCQUEyQixHQUFBLFVBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRTs7QUFFN0UsUUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7QUFDakIsVUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQ3JDLGFBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztLQUMxRDs7MEJBR3NCLElBQUksQ0FBQyxPQUFPO1VBQTFCLFVBQVU7QUFDakIsVUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsRUFBRTtBQUNoRCxZQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDckMsZUFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDO09BQzFEOzs7O0FBSUgsV0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLDJCQUEyQixDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztHQUNwRzs7QUF4RkcsVUFBUSxXQTRGWixHQUFHLEdBQUEsVUFBQyxLQUFLLEVBQUUsU0FBUyxFQUFPLFdBQVcsRUFBVSxRQUFRLEVBQVU7O1FBQXZELFNBQVMsZ0JBQVQsU0FBUyxHQUFHLEVBQUU7UUFBRSxXQUFXLGdCQUFYLFdBQVcsR0FBRyxLQUFLO1FBQUUsUUFBUSxnQkFBUixRQUFRLEdBQUcsS0FBSztBQUM5RCxRQUFJLFlBQVksR0FBRyxFQUFFLENBQUM7QUFDdEIsUUFBSSxRQUFRLENBQUM7QUFDYixRQUFJLFFBQVEsQ0FBQztBQUNiLFFBQUksUUFBUSxHQUFHLElBQUksQ0FBQzs7QUFFcEIsUUFBSSxLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUU7QUFDekMsa0JBQVksR0FBRyx5QkFBeUIsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDM0QsWUFBTSxJQUFJLEtBQUssc0JBQW1CLEtBQUsscUJBQWUsWUFBWSxDQUFHLENBQUM7S0FDdkU7OztBQUdELFFBQUksS0FBSyxLQUFLLFFBQVEsRUFBRTtBQUN0QixVQUFJLFdBQVcsRUFBRTtBQUNmLGVBQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztPQUM5Qjs7QUFFRCxhQUFPLElBQUksQ0FBQztLQUNiOzs7QUFHRCxRQUFJLFFBQVEsRUFBRTtBQUNaLGFBQU8sU0FBUyxrQkFBa0IsR0FBRztBQUNuQyxZQUFJLFlBQVksR0FBRyxRQUFRLENBQUM7O0FBRTVCLFlBQUksU0FBUyxDQUFDLE1BQU0sRUFBRTtBQUNwQixjQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7QUFDaEIsY0FBSSxJQUFJLEdBQUcsU0FBUyxDQUFDOztBQUVyQixlQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ3ZDLGtCQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBUyxFQUFFLEVBQUU7QUFDeEIsa0JBQUksRUFBRSxHQUFHLFNBQVMsbUJBQW1CLEdBQUc7QUFDdEMsdUJBQU8sSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztlQUNyQixDQUFDOztBQUVGLHNCQUFRLENBQUMsRUFBRSxFQUFFLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFOUMscUJBQU8sRUFBRSxDQUFDO2FBQ1gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7V0FDUjs7QUFFRCxzQkFBWSxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDN0M7O0FBRUQsZUFBTyxZQUFZLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO09BQy9ELENBQUM7S0FDSDs7O0FBR0QsUUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtBQUMxQixjQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbEMsY0FBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDOztBQUV0QyxVQUFJLFFBQVEsQ0FBQyxTQUFTLElBQUksQ0FBQyxXQUFXLEVBQUU7QUFDdEMsb0JBQVksR0FBRyx5QkFBeUIsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDM0QsY0FBTSxJQUFJLEtBQUsseUJBQXVCLFFBQVEsQ0FBQyxLQUFLLENBQUMsb0RBQStDLFlBQVksQ0FBRyxDQUFDO09BQ3JIOztBQUVELFVBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxJQUFJLFdBQVcsRUFBRTtBQUN0QyxlQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7T0FDbEM7O0FBRUQsYUFBTyxRQUFRLENBQUM7S0FDakI7O0FBRUQsWUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDOzs7QUFHdEMsUUFBSSxDQUFDLFFBQVEsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxFQUFFO0FBQ2xFLGNBQVEsR0FBRywyQkFBMkIsQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDdEUsYUFBTyxJQUFJLENBQUMsMkJBQTJCLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0tBQzVGOztBQUVELFFBQUksQ0FBQyxRQUFRLEVBQUU7QUFDYixVQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtBQUNqQixvQkFBWSxHQUFHLHlCQUF5QixDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUMzRCxjQUFNLElBQUksS0FBSyxzQkFBb0IsUUFBUSxDQUFDLEtBQUssQ0FBQyxTQUFJLFlBQVksQ0FBRyxDQUFDO09BQ3ZFOztBQUVELGFBQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7S0FDbEU7O0FBRUQsUUFBSSxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO0FBQ25DLGtCQUFZLEdBQUcseUJBQXlCLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzNELFlBQU0sSUFBSSxLQUFLLDJDQUF5QyxZQUFZLENBQUcsQ0FBQztLQUN6RTs7QUFFRCxhQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDOzs7Ozs7Ozs7O0FBVXRCLFFBQUkscUJBQXFCLEdBQUcsV0FBVyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQUMsS0FBSzthQUFLLENBQUMsS0FBSyxDQUFDLFNBQVM7S0FBQSxDQUFDLENBQUM7QUFDN0YsUUFBSSxJQUFJLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBQyxLQUFLLEVBQUs7QUFFeEMsVUFBSSxxQkFBcUIsRUFBRTtBQUN6QixlQUFPLE1BQUssR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7T0FDN0Q7O0FBRUQsYUFBTyxNQUFLLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUN4RSxDQUFDLENBQUM7OztBQUdILFFBQUkscUJBQXFCLEVBQUU7QUFDekIsVUFBSSxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7O0FBRXpDLGVBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQzs7O0FBR2hCLGFBQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBUyxJQUFJLEVBQUU7QUFDM0MsWUFBSTtBQUNGLGtCQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNsQyxDQUFDLE9BQU8sQ0FBQyxFQUFFO0FBQ1Ysc0JBQVksR0FBRyx5QkFBeUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzNELGNBQUksV0FBVyxHQUFHLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDakQsV0FBQyxDQUFDLE9BQU8sc0NBQW9DLFFBQVEsQ0FBQyxLQUFLLENBQUMsU0FBSSxZQUFZLFVBQUssV0FBVyxBQUFFLENBQUM7QUFDL0YsZ0JBQU0sQ0FBQyxDQUFDO1NBQ1Q7O0FBRUQsWUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLHdCQUF3QixDQUFDLEVBQUU7QUFDL0Qsa0JBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztTQUN0Qzs7Ozs7OztBQU9ELGVBQU8sUUFBUSxDQUFDO09BQ2pCLENBQUMsQ0FBQztLQUNKOztBQUVELFFBQUk7QUFDRixjQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNsQyxDQUFDLE9BQU8sQ0FBQyxFQUFFO0FBQ1Ysa0JBQVksR0FBRyx5QkFBeUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNwRCxVQUFJLFdBQVcsR0FBRyxrQkFBa0IsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ2pELE9BQUMsQ0FBQyxPQUFPLHNDQUFvQyxRQUFRLENBQUMsS0FBSyxDQUFDLFNBQUksWUFBWSxVQUFLLFdBQVcsQUFBRSxDQUFDO0FBQy9GLFlBQU0sQ0FBQyxDQUFDO0tBQ1Q7O0FBRUQsUUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLHdCQUF3QixDQUFDLEVBQUU7QUFDL0QsVUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0tBQ2xDOztBQUVELFFBQUksQ0FBQyxXQUFXLElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRTtBQUN0QyxrQkFBWSxHQUFHLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxDQUFDOztBQUVwRCxZQUFNLElBQUksS0FBSyx5QkFBdUIsUUFBUSxDQUFDLEtBQUssQ0FBQyxvREFBK0MsWUFBWSxDQUFHLENBQUM7S0FDckg7O0FBRUQsUUFBSSxXQUFXLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFO0FBQ3RDLGNBQVEsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQ3RDOztBQUVELGFBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQzs7QUFFaEIsV0FBTyxRQUFRLENBQUM7R0FDakI7O0FBL1BHLFVBQVEsV0FrUVosVUFBVSxHQUFBLFVBQUMsS0FBSyxFQUFFO0FBQ2hCLFdBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO0dBQ2xDOztBQXBRRyxVQUFRLFdBeVFaLFdBQVcsR0FBQSxVQUFDLE9BQU8sRUFBTyxtQkFBbUIsRUFBTztRQUF4QyxPQUFPLGdCQUFQLE9BQU8sR0FBRyxFQUFFO1FBQUUsbUJBQW1CLGdCQUFuQixtQkFBbUIsR0FBRyxFQUFFO0FBQ2hELFFBQUksZUFBZSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7OztBQUdoQyx1QkFBbUIsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQzs7MEJBRTVCLG1CQUFtQjtVQUFqQyxVQUFVO0FBQ2pCLFVBQUksQ0FBQywrQkFBK0IsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUM7OztBQUdwRSxXQUFPLElBQUksUUFBUSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixDQUFDLENBQUM7R0FDMUU7O1NBcFJHLFFBQVE7OztRQXdSTixRQUFRLEdBQVIsUUFBUSIsImZpbGUiOiJpbmplY3Rvci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIGFubm90YXRlLFxuICByZWFkQW5ub3RhdGlvbnMsXG4gIGhhc0Fubm90YXRpb24sXG4gIFByb3ZpZGUgYXMgUHJvdmlkZUFubm90YXRpb24sXG4gIFRyYW5zaWVudFNjb3BlIGFzIFRyYW5zaWVudFNjb3BlQW5ub3RhdGlvblxufSBmcm9tICcuL2Fubm90YXRpb25zJztcblxuaW1wb3J0IHtpc0Z1bmN0aW9uLCB0b1N0cmluZ30gZnJvbSAnLi91dGlsJztcbmltcG9ydCB7cHJvZmlsZUluamVjdG9yfSBmcm9tICcuL3Byb2ZpbGVyJztcbmltcG9ydCB7Y3JlYXRlUHJvdmlkZXJGcm9tRm5PckNsYXNzfSBmcm9tICcuL3Byb3ZpZGVycyc7XG5cblxuZnVuY3Rpb24gY29uc3RydWN0UmVzb2x2aW5nTWVzc2FnZShyZXNvbHZpbmcsIHRva2VuKSB7XG4gIC8vIElmIGEgdG9rZW4gaXMgcGFzc2VkIGluLCBhZGQgaXQgaW50byB0aGUgcmVzb2x2aW5nIGFycmF5LlxuICAvLyBXZSBuZWVkIHRvIGNoZWNrIGFyZ3VtZW50cy5sZW5ndGggYmVjYXVzZSBpdCBjYW4gYmUgbnVsbC91bmRlZmluZWQuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgIHJlc29sdmluZy5wdXNoKHRva2VuKTtcbiAgfVxuXG4gIGlmIChyZXNvbHZpbmcubGVuZ3RoID4gMSkge1xuICAgIHJldHVybiBgICgke3Jlc29sdmluZy5tYXAodG9TdHJpbmcpLmpvaW4oJyAtPiAnKX0pYDtcbiAgfVxuXG4gIHJldHVybiAnJztcbn1cblxuXG4vLyBJbmplY3RvciBlbmNhcHN1bGF0ZSBhIGxpZmUgc2NvcGUuXG4vLyBUaGVyZSBpcyBleGFjdGx5IG9uZSBpbnN0YW5jZSBmb3IgZ2l2ZW4gdG9rZW4gaW4gZ2l2ZW4gaW5qZWN0b3IuXG4vL1xuLy8gQWxsIHRoZSBzdGF0ZSBpcyBpbW11dGFibGUsIHRoZSBvbmx5IHN0YXRlIGNoYW5nZXMgaXMgdGhlIGNhY2hlLiBUaGVyZSBpcyBob3dldmVyIG5vIHdheSB0byBwcm9kdWNlIGRpZmZlcmVudCBpbnN0YW5jZSB1bmRlciBnaXZlbiB0b2tlbi4gSW4gdGhhdCBzZW5zZSBpdCBpcyBpbW11dGFibGUuXG4vL1xuLy8gSW5qZWN0b3IgaXMgcmVzcG9uc2libGUgZm9yOlxuLy8gLSByZXNvbHZpbmcgdG9rZW5zIGludG9cbi8vICAgLSBwcm92aWRlclxuLy8gICAtIHZhbHVlIChjYWNoZS9jYWxsaW5nIHByb3ZpZGVyKVxuLy8gLSBkZWFsaW5nIHdpdGggaXNQcm9taXNlXG4vLyAtIGRlYWxpbmcgd2l0aCBpc0xhenlcbi8vIC0gbG9hZGluZyBkaWZmZXJlbnQgXCJwcm92aWRlcnNcIiBhbmQgbW9kdWxlc1xuY2xhc3MgSW5qZWN0b3Ige1xuXG4gIGNvbnN0cnVjdG9yKG1vZHVsZXMgPSBbXSwgcGFyZW50SW5qZWN0b3IgPSBudWxsLCBwcm92aWRlcnMgPSBuZXcgTWFwKCksIHNjb3BlcyA9IFtdKSB7XG4gICAgdGhpcy5fY2FjaGUgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5fcHJvdmlkZXJzID0gcHJvdmlkZXJzO1xuICAgIHRoaXMuX3BhcmVudCA9IHBhcmVudEluamVjdG9yO1xuICAgIHRoaXMuX3Njb3BlcyA9IHNjb3BlcztcblxuICAgIHRoaXMuX2xvYWRNb2R1bGVzKG1vZHVsZXMpO1xuXG4gICAgcHJvZmlsZUluamVjdG9yKHRoaXMsIEluamVjdG9yKTtcbiAgfVxuXG5cbiAgLy8gQ29sbGVjdCBhbGwgcmVnaXN0ZXJlZCBwcm92aWRlcnMgdGhhdCBoYXMgZ2l2ZW4gYW5ub3RhdGlvbi5cbiAgLy8gSW5jbHVkaW5nIHByb3ZpZGVycyBkZWZpbmVkIGluIHBhcmVudCBpbmplY3RvcnMuXG4gIF9jb2xsZWN0UHJvdmlkZXJzV2l0aEFubm90YXRpb24oYW5ub3RhdGlvbkNsYXNzLCBjb2xsZWN0ZWRQcm92aWRlcnMpIHtcbiAgICB0aGlzLl9wcm92aWRlcnMuZm9yRWFjaCgocHJvdmlkZXIsIHRva2VuKSA9PiB7XG4gICAgICBpZiAoIWNvbGxlY3RlZFByb3ZpZGVycy5oYXModG9rZW4pICYmIGhhc0Fubm90YXRpb24ocHJvdmlkZXIucHJvdmlkZXIsIGFubm90YXRpb25DbGFzcykpIHtcbiAgICAgICAgY29sbGVjdGVkUHJvdmlkZXJzLnNldCh0b2tlbiwgcHJvdmlkZXIpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMuX3BhcmVudCkge1xuICAgICAgdGhpcy5fcGFyZW50Ll9jb2xsZWN0UHJvdmlkZXJzV2l0aEFubm90YXRpb24oYW5ub3RhdGlvbkNsYXNzLCBjb2xsZWN0ZWRQcm92aWRlcnMpO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gTG9hZCBtb2R1bGVzL2Z1bmN0aW9uL2NsYXNzZXMuXG4gIC8vIFRoaXMgbXV0YXRlcyBgdGhpcy5fcHJvdmlkZXJzYCwgYnV0IGl0IGlzIG9ubHkgY2FsbGVkIGR1cmluZyB0aGUgY29uc3RydWN0b3IuXG4gIF9sb2FkTW9kdWxlcyhtb2R1bGVzKSB7XG4gICAgZm9yICh2YXIgbW9kdWxlIG9mIG1vZHVsZXMpIHtcbiAgICAgIC8vIEEgc2luZ2xlIHByb3ZpZGVyIChjbGFzcyBvciBmdW5jdGlvbikuXG4gICAgICBpZiAoaXNGdW5jdGlvbihtb2R1bGUpKSB7XG4gICAgICAgIHRoaXMuX2xvYWRGbk9yQ2xhc3MobW9kdWxlKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBtb2R1bGUhJyk7XG4gICAgfVxuICB9XG5cblxuICAvLyBMb2FkIGEgZnVuY3Rpb24gb3IgY2xhc3MuXG4gIC8vIFRoaXMgbXV0YXRlcyBgdGhpcy5fcHJvdmlkZXJzYCwgYnV0IGl0IGlzIG9ubHkgY2FsbGVkIGR1cmluZyB0aGUgY29uc3RydWN0b3IuXG4gIF9sb2FkRm5PckNsYXNzKGZuT3JDbGFzcykge1xuICAgIC8vIFRPRE8odm9qdGEpOiBzaG91bGQgd2UgZXhwb3NlIHByb3ZpZGVyLnRva2VuP1xuICAgIHZhciBhbm5vdGF0aW9ucyA9IHJlYWRBbm5vdGF0aW9ucyhmbk9yQ2xhc3MpO1xuICAgIHZhciB0b2tlbiA9IGFubm90YXRpb25zLnByb3ZpZGUudG9rZW4gfHwgZm5PckNsYXNzO1xuICAgIHZhciBwcm92aWRlciA9IGNyZWF0ZVByb3ZpZGVyRnJvbUZuT3JDbGFzcyhmbk9yQ2xhc3MsIGFubm90YXRpb25zKTtcblxuICAgIHRoaXMuX3Byb3ZpZGVycy5zZXQodG9rZW4sIHByb3ZpZGVyKTtcbiAgfVxuXG5cbiAgLy8gUmV0dXJucyB0cnVlIGlmIHRoZXJlIGlzIGFueSBwcm92aWRlciByZWdpc3RlcmVkIGZvciBnaXZlbiB0b2tlbi5cbiAgLy8gSW5jbHVkaW5nIHBhcmVudCBpbmplY3RvcnMuXG4gIF9oYXNQcm92aWRlckZvcih0b2tlbikge1xuICAgIGlmICh0aGlzLl9wcm92aWRlcnMuaGFzKHRva2VuKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BhcmVudCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BhcmVudC5faGFzUHJvdmlkZXJGb3IodG9rZW4pO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIEZpbmQgdGhlIGNvcnJlY3QgaW5qZWN0b3Igd2hlcmUgdGhlIGRlZmF1bHQgcHJvdmlkZXIgc2hvdWxkIGJlIGluc3RhbnRpYXRlZCBhbmQgY2FjaGVkLlxuICBfaW5zdGFudGlhdGVEZWZhdWx0UHJvdmlkZXIocHJvdmlkZXIsIHRva2VuLCByZXNvbHZpbmcsIHdhbnRQcm9taXNlLCB3YW50TGF6eSkge1xuICAgIC8vIEluIHJvb3QgaW5qZWN0b3IsIGluc3RhbnRpYXRlIGhlcmUuXG4gICAgaWYgKCF0aGlzLl9wYXJlbnQpIHtcbiAgICAgIHRoaXMuX3Byb3ZpZGVycy5zZXQodG9rZW4sIHByb3ZpZGVyKTtcbiAgICAgIHJldHVybiB0aGlzLmdldCh0b2tlbiwgcmVzb2x2aW5nLCB3YW50UHJvbWlzZSwgd2FudExhenkpO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIHRoaXMgaW5qZWN0b3IgZm9yY2VzIG5ldyBpbnN0YW5jZSBvZiB0aGlzIHByb3ZpZGVyLlxuICAgIGZvciAodmFyIFNjb3BlQ2xhc3Mgb2YgdGhpcy5fc2NvcGVzKSB7XG4gICAgICBpZiAoaGFzQW5ub3RhdGlvbihwcm92aWRlci5wcm92aWRlciwgU2NvcGVDbGFzcykpIHtcbiAgICAgICAgdGhpcy5fcHJvdmlkZXJzLnNldCh0b2tlbiwgcHJvdmlkZXIpO1xuICAgICAgICByZXR1cm4gdGhpcy5nZXQodG9rZW4sIHJlc29sdmluZywgd2FudFByb21pc2UsIHdhbnRMYXp5KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UgYXNrIHBhcmVudCBpbmplY3Rvci5cbiAgICByZXR1cm4gdGhpcy5fcGFyZW50Ll9pbnN0YW50aWF0ZURlZmF1bHRQcm92aWRlcihwcm92aWRlciwgdG9rZW4sIHJlc29sdmluZywgd2FudFByb21pc2UsIHdhbnRMYXp5KTtcbiAgfVxuXG5cbiAgLy8gUmV0dXJuIGFuIGluc3RhbmNlIGZvciBnaXZlbiB0b2tlbi5cbiAgZ2V0KHRva2VuLCByZXNvbHZpbmcgPSBbXSwgd2FudFByb21pc2UgPSBmYWxzZSwgd2FudExhenkgPSBmYWxzZSkge1xuICAgIHZhciByZXNvbHZpbmdNc2cgPSAnJztcbiAgICB2YXIgcHJvdmlkZXI7XG4gICAgdmFyIGluc3RhbmNlO1xuICAgIHZhciBpbmplY3RvciA9IHRoaXM7XG5cbiAgICBpZiAodG9rZW4gPT09IG51bGwgfHwgdG9rZW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmVzb2x2aW5nTXNnID0gY29uc3RydWN0UmVzb2x2aW5nTWVzc2FnZShyZXNvbHZpbmcsIHRva2VuKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCB0b2tlbiBcIiR7dG9rZW59XCIgcmVxdWVzdGVkISR7cmVzb2x2aW5nTXNnfWApO1xuICAgIH1cblxuICAgIC8vIFNwZWNpYWwgY2FzZSwgcmV0dXJuIGl0c2VsZi5cbiAgICBpZiAodG9rZW4gPT09IEluamVjdG9yKSB7XG4gICAgICBpZiAod2FudFByb21pc2UpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gVE9ETyh2b2p0YSk6IG9wdGltaXplIC0gbm8gY2hpbGQgaW5qZWN0b3IgZm9yIGxvY2Fscz9cbiAgICBpZiAod2FudExhenkpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbiBjcmVhdGVMYXp5SW5zdGFuY2UoKSB7XG4gICAgICAgIHZhciBsYXp5SW5qZWN0b3IgPSBpbmplY3RvcjtcblxuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgIHZhciBsb2NhbHMgPSBbXTtcbiAgICAgICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcblxuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgICAgICAgbG9jYWxzLnB1c2goKGZ1bmN0aW9uKGlpKSB7XG4gICAgICAgICAgICAgIHZhciBmbiA9IGZ1bmN0aW9uIGNyZWF0ZUxvY2FsSW5zdGFuY2UoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFyZ3NbaWkgKyAxXTtcbiAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICBhbm5vdGF0ZShmbiwgbmV3IFByb3ZpZGVBbm5vdGF0aW9uKGFyZ3NbaWldKSk7XG5cbiAgICAgICAgICAgICAgcmV0dXJuIGZuO1xuICAgICAgICAgICAgfSkoaSkpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxhenlJbmplY3RvciA9IGluamVjdG9yLmNyZWF0ZUNoaWxkKGxvY2Fscyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbGF6eUluamVjdG9yLmdldCh0b2tlbiwgcmVzb2x2aW5nLCB3YW50UHJvbWlzZSwgZmFsc2UpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiB0aGVyZSBpcyBhIGNhY2hlZCBpbnN0YW5jZSBhbHJlYWR5LlxuICAgIGlmICh0aGlzLl9jYWNoZS5oYXModG9rZW4pKSB7XG4gICAgICBpbnN0YW5jZSA9IHRoaXMuX2NhY2hlLmdldCh0b2tlbik7XG4gICAgICBwcm92aWRlciA9IHRoaXMuX3Byb3ZpZGVycy5nZXQodG9rZW4pO1xuXG4gICAgICBpZiAocHJvdmlkZXIuaXNQcm9taXNlICYmICF3YW50UHJvbWlzZSkge1xuICAgICAgICByZXNvbHZpbmdNc2cgPSBjb25zdHJ1Y3RSZXNvbHZpbmdNZXNzYWdlKHJlc29sdmluZywgdG9rZW4pO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBpbnN0YW50aWF0ZSAke3RvU3RyaW5nKHRva2VuKX0gc3luY2hyb25vdXNseS4gSXQgaXMgcHJvdmlkZWQgYXMgYSBwcm9taXNlISR7cmVzb2x2aW5nTXNnfWApO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXByb3ZpZGVyLmlzUHJvbWlzZSAmJiB3YW50UHJvbWlzZSkge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGluc3RhbmNlKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgIH1cblxuICAgIHByb3ZpZGVyID0gdGhpcy5fcHJvdmlkZXJzLmdldCh0b2tlbik7XG5cbiAgICAvLyBObyBwcm92aWRlciBkZWZpbmVkIChvdmVycmlkZGVuKSwgdXNlIHRoZSBkZWZhdWx0IHByb3ZpZGVyICh0b2tlbikuXG4gICAgaWYgKCFwcm92aWRlciAmJiBpc0Z1bmN0aW9uKHRva2VuKSAmJiAhdGhpcy5faGFzUHJvdmlkZXJGb3IodG9rZW4pKSB7XG4gICAgICBwcm92aWRlciA9IGNyZWF0ZVByb3ZpZGVyRnJvbUZuT3JDbGFzcyh0b2tlbiwgcmVhZEFubm90YXRpb25zKHRva2VuKSk7XG4gICAgICByZXR1cm4gdGhpcy5faW5zdGFudGlhdGVEZWZhdWx0UHJvdmlkZXIocHJvdmlkZXIsIHRva2VuLCByZXNvbHZpbmcsIHdhbnRQcm9taXNlLCB3YW50TGF6eSk7XG4gICAgfVxuXG4gICAgaWYgKCFwcm92aWRlcikge1xuICAgICAgaWYgKCF0aGlzLl9wYXJlbnQpIHtcbiAgICAgICAgcmVzb2x2aW5nTXNnID0gY29uc3RydWN0UmVzb2x2aW5nTWVzc2FnZShyZXNvbHZpbmcsIHRva2VuKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBwcm92aWRlciBmb3IgJHt0b1N0cmluZyh0b2tlbil9ISR7cmVzb2x2aW5nTXNnfWApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5fcGFyZW50LmdldCh0b2tlbiwgcmVzb2x2aW5nLCB3YW50UHJvbWlzZSwgd2FudExhenkpO1xuICAgIH1cblxuICAgIGlmIChyZXNvbHZpbmcuaW5kZXhPZih0b2tlbikgIT09IC0xKSB7XG4gICAgICByZXNvbHZpbmdNc2cgPSBjb25zdHJ1Y3RSZXNvbHZpbmdNZXNzYWdlKHJlc29sdmluZywgdG9rZW4pO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgaW5zdGFudGlhdGUgY3ljbGljIGRlcGVuZGVuY3khJHtyZXNvbHZpbmdNc2d9YCk7XG4gICAgfVxuXG4gICAgcmVzb2x2aW5nLnB1c2godG9rZW4pO1xuXG4gICAgLy8gVE9ETyh2b2p0YSk6IGhhbmRsZSB0aGVzZSBjYXNlczpcbiAgICAvLyAxL1xuICAgIC8vIC0gcmVxdWVzdGVkIGFzIHByb21pc2UgKGRlbGF5ZWQpXG4gICAgLy8gLSByZXF1ZXN0ZWQgYWdhaW4gYXMgcHJvbWlzZSAoYmVmb3JlIHRoZSBwcmV2aW91cyBnZXRzIHJlc29sdmVkKSAtPiBjYWNoZSB0aGUgcHJvbWlzZVxuICAgIC8vIDIvXG4gICAgLy8gLSByZXF1ZXN0ZWQgYXMgcHJvbWlzZSAoZGVsYXllZClcbiAgICAvLyAtIHJlcXVlc3RlZCBhZ2FpbiBzeW5jIChiZWZvcmUgdGhlIHByZXZpb3VzIGdldHMgcmVzb2x2ZWQpXG4gICAgLy8gLT4gZXJyb3IsIGJ1dCBsZXQgaXQgZ28gaW5zaWRlIHRvIHRocm93IHdoZXJlIGV4YWN0bHkgaXMgdGhlIGFzeW5jIHByb3ZpZGVyXG4gICAgdmFyIGRlbGF5aW5nSW5zdGFudGlhdGlvbiA9IHdhbnRQcm9taXNlICYmIHByb3ZpZGVyLnBhcmFtcy5zb21lKChwYXJhbSkgPT4gIXBhcmFtLmlzUHJvbWlzZSk7XG4gICAgdmFyIGFyZ3MgPSBwcm92aWRlci5wYXJhbXMubWFwKChwYXJhbSkgPT4ge1xuXG4gICAgICBpZiAoZGVsYXlpbmdJbnN0YW50aWF0aW9uKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldChwYXJhbS50b2tlbiwgcmVzb2x2aW5nLCB0cnVlLCBwYXJhbS5pc0xhenkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5nZXQocGFyYW0udG9rZW4sIHJlc29sdmluZywgcGFyYW0uaXNQcm9taXNlLCBwYXJhbS5pc0xhenkpO1xuICAgIH0pO1xuXG4gICAgLy8gRGVsYXlpbmcgdGhlIGluc3RhbnRpYXRpb24gLSByZXR1cm4gYSBwcm9taXNlLlxuICAgIGlmIChkZWxheWluZ0luc3RhbnRpYXRpb24pIHtcbiAgICAgIHZhciBkZWxheWVkUmVzb2x2aW5nID0gcmVzb2x2aW5nLnNsaWNlKCk7IC8vIGNsb25lXG5cbiAgICAgIHJlc29sdmluZy5wb3AoKTtcblxuICAgICAgLy8gT25jZSBhbGwgZGVwZW5kZW5jaWVzIChwcm9taXNlcykgYXJlIHJlc29sdmVkLCBpbnN0YW50aWF0ZS5cbiAgICAgIHJldHVybiBQcm9taXNlLmFsbChhcmdzKS50aGVuKGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBpbnN0YW5jZSA9IHByb3ZpZGVyLmNyZWF0ZShhcmdzKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHJlc29sdmluZ01zZyA9IGNvbnN0cnVjdFJlc29sdmluZ01lc3NhZ2UoZGVsYXllZFJlc29sdmluZyk7XG4gICAgICAgICAgdmFyIG9yaWdpbmFsTXNnID0gJ09SSUdJTkFMIEVSUk9SOiAnICsgZS5tZXNzYWdlO1xuICAgICAgICAgIGUubWVzc2FnZSA9IGBFcnJvciBkdXJpbmcgaW5zdGFudGlhdGlvbiBvZiAke3RvU3RyaW5nKHRva2VuKX0hJHtyZXNvbHZpbmdNc2d9XFxuJHtvcmlnaW5hbE1zZ31gO1xuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWhhc0Fubm90YXRpb24ocHJvdmlkZXIucHJvdmlkZXIsIFRyYW5zaWVudFNjb3BlQW5ub3RhdGlvbikpIHtcbiAgICAgICAgICBpbmplY3Rvci5fY2FjaGUuc2V0KHRva2VuLCBpbnN0YW5jZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUT0RPKHZvanRhKTogaWYgYSBwcm92aWRlciByZXR1cm5zIGEgcHJvbWlzZSAoYnV0IGlzIG5vdCBkZWNsYXJlZCBhcyBAUHJvdmlkZVByb21pc2UpLFxuICAgICAgICAvLyBoZXJlIHRoZSB2YWx1ZSB3aWxsIGdldCB1bndyYXBwZWQgKGJlY2F1c2UgaXQgaXMgcmV0dXJuZWQgZnJvbSBhIHByb21pc2UgY2FsbGJhY2spIGFuZFxuICAgICAgICAvLyB0aGUgYWN0dWFsIHZhbHVlIHdpbGwgYmUgaW5qZWN0ZWQuIFRoaXMgaXMgcHJvYmFibHkgbm90IGRlc2lyZWQgYmVoYXZpb3IuIE1heWJlIHdlIGNvdWxkXG4gICAgICAgIC8vIGdldCByaWQgb2ZmIHRoZSBAUHJvdmlkZVByb21pc2UgYW5kIGp1c3QgY2hlY2sgdGhlIHJldHVybmVkIHZhbHVlLCB3aGV0aGVyIGl0IGlzXG4gICAgICAgIC8vIGEgcHJvbWlzZSBvciBub3QuXG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBpbnN0YW5jZSA9IHByb3ZpZGVyLmNyZWF0ZShhcmdzKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXNvbHZpbmdNc2cgPSBjb25zdHJ1Y3RSZXNvbHZpbmdNZXNzYWdlKHJlc29sdmluZyk7XG4gICAgICB2YXIgb3JpZ2luYWxNc2cgPSAnT1JJR0lOQUwgRVJST1I6ICcgKyBlLm1lc3NhZ2U7XG4gICAgICBlLm1lc3NhZ2UgPSBgRXJyb3IgZHVyaW5nIGluc3RhbnRpYXRpb24gb2YgJHt0b1N0cmluZyh0b2tlbil9ISR7cmVzb2x2aW5nTXNnfVxcbiR7b3JpZ2luYWxNc2d9YDtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuXG4gICAgaWYgKCFoYXNBbm5vdGF0aW9uKHByb3ZpZGVyLnByb3ZpZGVyLCBUcmFuc2llbnRTY29wZUFubm90YXRpb24pKSB7XG4gICAgICB0aGlzLl9jYWNoZS5zZXQodG9rZW4sIGluc3RhbmNlKTtcbiAgICB9XG5cbiAgICBpZiAoIXdhbnRQcm9taXNlICYmIHByb3ZpZGVyLmlzUHJvbWlzZSkge1xuICAgICAgcmVzb2x2aW5nTXNnID0gY29uc3RydWN0UmVzb2x2aW5nTWVzc2FnZShyZXNvbHZpbmcpO1xuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBpbnN0YW50aWF0ZSAke3RvU3RyaW5nKHRva2VuKX0gc3luY2hyb25vdXNseS4gSXQgaXMgcHJvdmlkZWQgYXMgYSBwcm9taXNlISR7cmVzb2x2aW5nTXNnfWApO1xuICAgIH1cblxuICAgIGlmICh3YW50UHJvbWlzZSAmJiAhcHJvdmlkZXIuaXNQcm9taXNlKSB7XG4gICAgICBpbnN0YW5jZSA9IFByb21pc2UucmVzb2x2ZShpbnN0YW5jZSk7XG4gICAgfVxuXG4gICAgcmVzb2x2aW5nLnBvcCgpO1xuXG4gICAgcmV0dXJuIGluc3RhbmNlO1xuICB9XG5cblxuICBnZXRQcm9taXNlKHRva2VuKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0KHRva2VuLCBbXSwgdHJ1ZSk7XG4gIH1cblxuXG4gIC8vIENyZWF0ZSBhIGNoaWxkIGluamVjdG9yLCB3aGljaCBlbmNhcHN1bGF0ZSBzaG9ydGVyIGxpZmUgc2NvcGUuXG4gIC8vIEl0IGlzIHBvc3NpYmxlIHRvIGFkZCBhZGRpdGlvbmFsIHByb3ZpZGVycyBhbmQgYWxzbyBmb3JjZSBuZXcgaW5zdGFuY2VzIG9mIGV4aXN0aW5nIHByb3ZpZGVycy5cbiAgY3JlYXRlQ2hpbGQobW9kdWxlcyA9IFtdLCBmb3JjZU5ld0luc3RhbmNlc09mID0gW10pIHtcbiAgICB2YXIgZm9yY2VkUHJvdmlkZXJzID0gbmV3IE1hcCgpO1xuXG4gICAgLy8gQWx3YXlzIGZvcmNlIG5ldyBpbnN0YW5jZSBvZiBUcmFuc2llbnRTY29wZS5cbiAgICBmb3JjZU5ld0luc3RhbmNlc09mLnB1c2goVHJhbnNpZW50U2NvcGVBbm5vdGF0aW9uKTtcblxuICAgIGZvciAodmFyIGFubm90YXRpb24gb2YgZm9yY2VOZXdJbnN0YW5jZXNPZikge1xuICAgICAgdGhpcy5fY29sbGVjdFByb3ZpZGVyc1dpdGhBbm5vdGF0aW9uKGFubm90YXRpb24sIGZvcmNlZFByb3ZpZGVycyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBJbmplY3Rvcihtb2R1bGVzLCB0aGlzLCBmb3JjZWRQcm92aWRlcnMsIGZvcmNlTmV3SW5zdGFuY2VzT2YpO1xuICB9XG59XG5cblxuZXhwb3J0IHtJbmplY3Rvcn07XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=