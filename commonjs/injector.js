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
//# sourceMappingURL=data:application/json;base64,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QUksQ0FBQyxDQUFDO0dBQ2xDOztBQXBRRyxVQUFRLFdBeVFaLFdBQVcsR0FBQSxVQUFDLE9BQU8sRUFBTyxtQkFBbUIsRUFBTztRQUF4QyxPQUFPLGdCQUFQLE9BQU8sR0FBRyxFQUFFO1FBQUUsbUJBQW1CLGdCQUFuQixtQkFBbUIsR0FBRyxFQUFFO0FBQ2hELFFBQUksZUFBZSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7OztBQUdoQyx1QkFBbUIsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQzs7MEJBRTVCLG1CQUFtQjtVQUFqQyxVQUFVO0FBQ2pCLFVBQUksQ0FBQywrQkFBK0IsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUM7OztBQUdwRSxXQUFPLElBQUksUUFBUSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixDQUFDLENBQUM7R0FDMUU7O1NBcFJHLFFBQVE7OztRQXdSTixRQUFRLEdBQVIsUUFBUSIsImZpbGUiOiJpbmplY3Rvci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGpzaGludCAtVzA4MyAqL1xuXG5pbXBvcnQge1xuICBhbm5vdGF0ZSxcbiAgcmVhZEFubm90YXRpb25zLFxuICBoYXNBbm5vdGF0aW9uLFxuICBQcm92aWRlIGFzIFByb3ZpZGVBbm5vdGF0aW9uLFxuICBUcmFuc2llbnRTY29wZSBhcyBUcmFuc2llbnRTY29wZUFubm90YXRpb25cbn0gZnJvbSAnLi9hbm5vdGF0aW9ucyc7XG5cbmltcG9ydCB7aXNGdW5jdGlvbiwgdG9TdHJpbmd9IGZyb20gJy4vdXRpbCc7XG5pbXBvcnQge3Byb2ZpbGVJbmplY3Rvcn0gZnJvbSAnLi9wcm9maWxlcic7XG5pbXBvcnQge2NyZWF0ZVByb3ZpZGVyRnJvbUZuT3JDbGFzc30gZnJvbSAnLi9wcm92aWRlcnMnO1xuXG5cbmZ1bmN0aW9uIGNvbnN0cnVjdFJlc29sdmluZ01lc3NhZ2UocmVzb2x2aW5nLCB0b2tlbikge1xuICAvLyBJZiBhIHRva2VuIGlzIHBhc3NlZCBpbiwgYWRkIGl0IGludG8gdGhlIHJlc29sdmluZyBhcnJheS5cbiAgLy8gV2UgbmVlZCB0byBjaGVjayBhcmd1bWVudHMubGVuZ3RoIGJlY2F1c2UgaXQgY2FuIGJlIG51bGwvdW5kZWZpbmVkLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICByZXNvbHZpbmcucHVzaCh0b2tlbik7XG4gIH1cblxuICBpZiAocmVzb2x2aW5nLmxlbmd0aCA+IDEpIHtcbiAgICByZXR1cm4gYCAoJHtyZXNvbHZpbmcubWFwKHRvU3RyaW5nKS5qb2luKCcgLT4gJyl9KWA7XG4gIH1cblxuICByZXR1cm4gJyc7XG59XG5cblxuLy8gSW5qZWN0b3IgZW5jYXBzdWxhdGUgYSBsaWZlIHNjb3BlLlxuLy8gVGhlcmUgaXMgZXhhY3RseSBvbmUgaW5zdGFuY2UgZm9yIGdpdmVuIHRva2VuIGluIGdpdmVuIGluamVjdG9yLlxuLy9cbi8vIEFsbCB0aGUgc3RhdGUgaXMgaW1tdXRhYmxlLCB0aGUgb25seSBzdGF0ZSBjaGFuZ2VzIGlzIHRoZSBjYWNoZS4gVGhlcmUgaXMgaG93ZXZlciBubyB3YXkgdG8gcHJvZHVjZSBkaWZmZXJlbnQgaW5zdGFuY2UgdW5kZXIgZ2l2ZW4gdG9rZW4uIEluIHRoYXQgc2Vuc2UgaXQgaXMgaW1tdXRhYmxlLlxuLy9cbi8vIEluamVjdG9yIGlzIHJlc3BvbnNpYmxlIGZvcjpcbi8vIC0gcmVzb2x2aW5nIHRva2VucyBpbnRvXG4vLyAgIC0gcHJvdmlkZXJcbi8vICAgLSB2YWx1ZSAoY2FjaGUvY2FsbGluZyBwcm92aWRlcilcbi8vIC0gZGVhbGluZyB3aXRoIGlzUHJvbWlzZVxuLy8gLSBkZWFsaW5nIHdpdGggaXNMYXp5XG4vLyAtIGxvYWRpbmcgZGlmZmVyZW50IFwicHJvdmlkZXJzXCIgYW5kIG1vZHVsZXNcbmNsYXNzIEluamVjdG9yIHtcblxuICBjb25zdHJ1Y3Rvcihtb2R1bGVzID0gW10sIHBhcmVudEluamVjdG9yID0gbnVsbCwgcHJvdmlkZXJzID0gbmV3IE1hcCgpLCBzY29wZXMgPSBbXSkge1xuICAgIHRoaXMuX2NhY2hlID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX3Byb3ZpZGVycyA9IHByb3ZpZGVycztcbiAgICB0aGlzLl9wYXJlbnQgPSBwYXJlbnRJbmplY3RvcjtcbiAgICB0aGlzLl9zY29wZXMgPSBzY29wZXM7XG5cbiAgICB0aGlzLl9sb2FkTW9kdWxlcyhtb2R1bGVzKTtcblxuICAgIHByb2ZpbGVJbmplY3Rvcih0aGlzLCBJbmplY3Rvcik7XG4gIH1cblxuXG4gIC8vIENvbGxlY3QgYWxsIHJlZ2lzdGVyZWQgcHJvdmlkZXJzIHRoYXQgaGFzIGdpdmVuIGFubm90YXRpb24uXG4gIC8vIEluY2x1ZGluZyBwcm92aWRlcnMgZGVmaW5lZCBpbiBwYXJlbnQgaW5qZWN0b3JzLlxuICBfY29sbGVjdFByb3ZpZGVyc1dpdGhBbm5vdGF0aW9uKGFubm90YXRpb25DbGFzcywgY29sbGVjdGVkUHJvdmlkZXJzKSB7XG4gICAgdGhpcy5fcHJvdmlkZXJzLmZvckVhY2goKHByb3ZpZGVyLCB0b2tlbikgPT4ge1xuICAgICAgaWYgKCFjb2xsZWN0ZWRQcm92aWRlcnMuaGFzKHRva2VuKSAmJiBoYXNBbm5vdGF0aW9uKHByb3ZpZGVyLnByb3ZpZGVyLCBhbm5vdGF0aW9uQ2xhc3MpKSB7XG4gICAgICAgIGNvbGxlY3RlZFByb3ZpZGVycy5zZXQodG9rZW4sIHByb3ZpZGVyKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmICh0aGlzLl9wYXJlbnQpIHtcbiAgICAgIHRoaXMuX3BhcmVudC5fY29sbGVjdFByb3ZpZGVyc1dpdGhBbm5vdGF0aW9uKGFubm90YXRpb25DbGFzcywgY29sbGVjdGVkUHJvdmlkZXJzKTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIExvYWQgbW9kdWxlcy9mdW5jdGlvbi9jbGFzc2VzLlxuICAvLyBUaGlzIG11dGF0ZXMgYHRoaXMuX3Byb3ZpZGVyc2AsIGJ1dCBpdCBpcyBvbmx5IGNhbGxlZCBkdXJpbmcgdGhlIGNvbnN0cnVjdG9yLlxuICBfbG9hZE1vZHVsZXMobW9kdWxlcykge1xuICAgIGZvciAodmFyIG1vZHVsZSBvZiBtb2R1bGVzKSB7XG4gICAgICAvLyBBIHNpbmdsZSBwcm92aWRlciAoY2xhc3Mgb3IgZnVuY3Rpb24pLlxuICAgICAgaWYgKGlzRnVuY3Rpb24obW9kdWxlKSkge1xuICAgICAgICB0aGlzLl9sb2FkRm5PckNsYXNzKG1vZHVsZSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgbW9kdWxlIScpO1xuICAgIH1cbiAgfVxuXG5cbiAgLy8gTG9hZCBhIGZ1bmN0aW9uIG9yIGNsYXNzLlxuICAvLyBUaGlzIG11dGF0ZXMgYHRoaXMuX3Byb3ZpZGVyc2AsIGJ1dCBpdCBpcyBvbmx5IGNhbGxlZCBkdXJpbmcgdGhlIGNvbnN0cnVjdG9yLlxuICBfbG9hZEZuT3JDbGFzcyhmbk9yQ2xhc3MpIHtcbiAgICAvLyBUT0RPKHZvanRhKTogc2hvdWxkIHdlIGV4cG9zZSBwcm92aWRlci50b2tlbj9cbiAgICB2YXIgYW5ub3RhdGlvbnMgPSByZWFkQW5ub3RhdGlvbnMoZm5PckNsYXNzKTtcbiAgICB2YXIgdG9rZW4gPSBhbm5vdGF0aW9ucy5wcm92aWRlLnRva2VuIHx8IGZuT3JDbGFzcztcbiAgICB2YXIgcHJvdmlkZXIgPSBjcmVhdGVQcm92aWRlckZyb21Gbk9yQ2xhc3MoZm5PckNsYXNzLCBhbm5vdGF0aW9ucyk7XG5cbiAgICB0aGlzLl9wcm92aWRlcnMuc2V0KHRva2VuLCBwcm92aWRlcik7XG4gIH1cblxuXG4gIC8vIFJldHVybnMgdHJ1ZSBpZiB0aGVyZSBpcyBhbnkgcHJvdmlkZXIgcmVnaXN0ZXJlZCBmb3IgZ2l2ZW4gdG9rZW4uXG4gIC8vIEluY2x1ZGluZyBwYXJlbnQgaW5qZWN0b3JzLlxuICBfaGFzUHJvdmlkZXJGb3IodG9rZW4pIHtcbiAgICBpZiAodGhpcy5fcHJvdmlkZXJzLmhhcyh0b2tlbikpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9wYXJlbnQpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wYXJlbnQuX2hhc1Byb3ZpZGVyRm9yKHRva2VuKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBGaW5kIHRoZSBjb3JyZWN0IGluamVjdG9yIHdoZXJlIHRoZSBkZWZhdWx0IHByb3ZpZGVyIHNob3VsZCBiZSBpbnN0YW50aWF0ZWQgYW5kIGNhY2hlZC5cbiAgX2luc3RhbnRpYXRlRGVmYXVsdFByb3ZpZGVyKHByb3ZpZGVyLCB0b2tlbiwgcmVzb2x2aW5nLCB3YW50UHJvbWlzZSwgd2FudExhenkpIHtcbiAgICAvLyBJbiByb290IGluamVjdG9yLCBpbnN0YW50aWF0ZSBoZXJlLlxuICAgIGlmICghdGhpcy5fcGFyZW50KSB7XG4gICAgICB0aGlzLl9wcm92aWRlcnMuc2V0KHRva2VuLCBwcm92aWRlcik7XG4gICAgICByZXR1cm4gdGhpcy5nZXQodG9rZW4sIHJlc29sdmluZywgd2FudFByb21pc2UsIHdhbnRMYXp5KTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiB0aGlzIGluamVjdG9yIGZvcmNlcyBuZXcgaW5zdGFuY2Ugb2YgdGhpcyBwcm92aWRlci5cbiAgICBmb3IgKHZhciBTY29wZUNsYXNzIG9mIHRoaXMuX3Njb3Blcykge1xuICAgICAgaWYgKGhhc0Fubm90YXRpb24ocHJvdmlkZXIucHJvdmlkZXIsIFNjb3BlQ2xhc3MpKSB7XG4gICAgICAgIHRoaXMuX3Byb3ZpZGVycy5zZXQodG9rZW4sIHByb3ZpZGVyKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KHRva2VuLCByZXNvbHZpbmcsIHdhbnRQcm9taXNlLCB3YW50TGF6eSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlIGFzayBwYXJlbnQgaW5qZWN0b3IuXG4gICAgcmV0dXJuIHRoaXMuX3BhcmVudC5faW5zdGFudGlhdGVEZWZhdWx0UHJvdmlkZXIocHJvdmlkZXIsIHRva2VuLCByZXNvbHZpbmcsIHdhbnRQcm9taXNlLCB3YW50TGF6eSk7XG4gIH1cblxuXG4gIC8vIFJldHVybiBhbiBpbnN0YW5jZSBmb3IgZ2l2ZW4gdG9rZW4uXG4gIGdldCh0b2tlbiwgcmVzb2x2aW5nID0gW10sIHdhbnRQcm9taXNlID0gZmFsc2UsIHdhbnRMYXp5ID0gZmFsc2UpIHtcbiAgICB2YXIgcmVzb2x2aW5nTXNnID0gJyc7XG4gICAgdmFyIHByb3ZpZGVyO1xuICAgIHZhciBpbnN0YW5jZTtcbiAgICB2YXIgaW5qZWN0b3IgPSB0aGlzO1xuXG4gICAgaWYgKHRva2VuID09PSBudWxsIHx8IHRva2VuID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJlc29sdmluZ01zZyA9IGNvbnN0cnVjdFJlc29sdmluZ01lc3NhZ2UocmVzb2x2aW5nLCB0b2tlbik7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgdG9rZW4gXCIke3Rva2VufVwiIHJlcXVlc3RlZCEke3Jlc29sdmluZ01zZ31gKTtcbiAgICB9XG5cbiAgICAvLyBTcGVjaWFsIGNhc2UsIHJldHVybiBpdHNlbGYuXG4gICAgaWYgKHRva2VuID09PSBJbmplY3Rvcikge1xuICAgICAgaWYgKHdhbnRQcm9taXNlKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIFRPRE8odm9qdGEpOiBvcHRpbWl6ZSAtIG5vIGNoaWxkIGluamVjdG9yIGZvciBsb2NhbHM/XG4gICAgaWYgKHdhbnRMYXp5KSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gY3JlYXRlTGF6eUluc3RhbmNlKCkge1xuICAgICAgICB2YXIgbGF6eUluamVjdG9yID0gaW5qZWN0b3I7XG5cbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICB2YXIgbG9jYWxzID0gW107XG4gICAgICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG5cbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgICAgICAgIGxvY2Fscy5wdXNoKChmdW5jdGlvbihpaSkge1xuICAgICAgICAgICAgICB2YXIgZm4gPSBmdW5jdGlvbiBjcmVhdGVMb2NhbEluc3RhbmNlKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhcmdzW2lpICsgMV07XG4gICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgYW5ub3RhdGUoZm4sIG5ldyBQcm92aWRlQW5ub3RhdGlvbihhcmdzW2lpXSkpO1xuXG4gICAgICAgICAgICAgIHJldHVybiBmbjtcbiAgICAgICAgICAgIH0pKGkpKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsYXp5SW5qZWN0b3IgPSBpbmplY3Rvci5jcmVhdGVDaGlsZChsb2NhbHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGxhenlJbmplY3Rvci5nZXQodG9rZW4sIHJlc29sdmluZywgd2FudFByb21pc2UsIGZhbHNlKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgdGhlcmUgaXMgYSBjYWNoZWQgaW5zdGFuY2UgYWxyZWFkeS5cbiAgICBpZiAodGhpcy5fY2FjaGUuaGFzKHRva2VuKSkge1xuICAgICAgaW5zdGFuY2UgPSB0aGlzLl9jYWNoZS5nZXQodG9rZW4pO1xuICAgICAgcHJvdmlkZXIgPSB0aGlzLl9wcm92aWRlcnMuZ2V0KHRva2VuKTtcblxuICAgICAgaWYgKHByb3ZpZGVyLmlzUHJvbWlzZSAmJiAhd2FudFByb21pc2UpIHtcbiAgICAgICAgcmVzb2x2aW5nTXNnID0gY29uc3RydWN0UmVzb2x2aW5nTWVzc2FnZShyZXNvbHZpbmcsIHRva2VuKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgaW5zdGFudGlhdGUgJHt0b1N0cmluZyh0b2tlbil9IHN5bmNocm9ub3VzbHkuIEl0IGlzIHByb3ZpZGVkIGFzIGEgcHJvbWlzZSEke3Jlc29sdmluZ01zZ31gKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFwcm92aWRlci5pc1Byb21pc2UgJiYgd2FudFByb21pc2UpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShpbnN0YW5jZSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICB9XG5cbiAgICBwcm92aWRlciA9IHRoaXMuX3Byb3ZpZGVycy5nZXQodG9rZW4pO1xuXG4gICAgLy8gTm8gcHJvdmlkZXIgZGVmaW5lZCAob3ZlcnJpZGRlbiksIHVzZSB0aGUgZGVmYXVsdCBwcm92aWRlciAodG9rZW4pLlxuICAgIGlmICghcHJvdmlkZXIgJiYgaXNGdW5jdGlvbih0b2tlbikgJiYgIXRoaXMuX2hhc1Byb3ZpZGVyRm9yKHRva2VuKSkge1xuICAgICAgcHJvdmlkZXIgPSBjcmVhdGVQcm92aWRlckZyb21Gbk9yQ2xhc3ModG9rZW4sIHJlYWRBbm5vdGF0aW9ucyh0b2tlbikpO1xuICAgICAgcmV0dXJuIHRoaXMuX2luc3RhbnRpYXRlRGVmYXVsdFByb3ZpZGVyKHByb3ZpZGVyLCB0b2tlbiwgcmVzb2x2aW5nLCB3YW50UHJvbWlzZSwgd2FudExhenkpO1xuICAgIH1cblxuICAgIGlmICghcHJvdmlkZXIpIHtcbiAgICAgIGlmICghdGhpcy5fcGFyZW50KSB7XG4gICAgICAgIHJlc29sdmluZ01zZyA9IGNvbnN0cnVjdFJlc29sdmluZ01lc3NhZ2UocmVzb2x2aW5nLCB0b2tlbik7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gcHJvdmlkZXIgZm9yICR7dG9TdHJpbmcodG9rZW4pfSEke3Jlc29sdmluZ01zZ31gKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuX3BhcmVudC5nZXQodG9rZW4sIHJlc29sdmluZywgd2FudFByb21pc2UsIHdhbnRMYXp5KTtcbiAgICB9XG5cbiAgICBpZiAocmVzb2x2aW5nLmluZGV4T2YodG9rZW4pICE9PSAtMSkge1xuICAgICAgcmVzb2x2aW5nTXNnID0gY29uc3RydWN0UmVzb2x2aW5nTWVzc2FnZShyZXNvbHZpbmcsIHRva2VuKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGluc3RhbnRpYXRlIGN5Y2xpYyBkZXBlbmRlbmN5ISR7cmVzb2x2aW5nTXNnfWApO1xuICAgIH1cblxuICAgIHJlc29sdmluZy5wdXNoKHRva2VuKTtcblxuICAgIC8vIFRPRE8odm9qdGEpOiBoYW5kbGUgdGhlc2UgY2FzZXM6XG4gICAgLy8gMS9cbiAgICAvLyAtIHJlcXVlc3RlZCBhcyBwcm9taXNlIChkZWxheWVkKVxuICAgIC8vIC0gcmVxdWVzdGVkIGFnYWluIGFzIHByb21pc2UgKGJlZm9yZSB0aGUgcHJldmlvdXMgZ2V0cyByZXNvbHZlZCkgLT4gY2FjaGUgdGhlIHByb21pc2VcbiAgICAvLyAyL1xuICAgIC8vIC0gcmVxdWVzdGVkIGFzIHByb21pc2UgKGRlbGF5ZWQpXG4gICAgLy8gLSByZXF1ZXN0ZWQgYWdhaW4gc3luYyAoYmVmb3JlIHRoZSBwcmV2aW91cyBnZXRzIHJlc29sdmVkKVxuICAgIC8vIC0+IGVycm9yLCBidXQgbGV0IGl0IGdvIGluc2lkZSB0byB0aHJvdyB3aGVyZSBleGFjdGx5IGlzIHRoZSBhc3luYyBwcm92aWRlclxuICAgIHZhciBkZWxheWluZ0luc3RhbnRpYXRpb24gPSB3YW50UHJvbWlzZSAmJiBwcm92aWRlci5wYXJhbXMuc29tZSgocGFyYW0pID0+ICFwYXJhbS5pc1Byb21pc2UpO1xuICAgIHZhciBhcmdzID0gcHJvdmlkZXIucGFyYW1zLm1hcCgocGFyYW0pID0+IHtcblxuICAgICAgaWYgKGRlbGF5aW5nSW5zdGFudGlhdGlvbikge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXQocGFyYW0udG9rZW4sIHJlc29sdmluZywgdHJ1ZSwgcGFyYW0uaXNMYXp5KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuZ2V0KHBhcmFtLnRva2VuLCByZXNvbHZpbmcsIHBhcmFtLmlzUHJvbWlzZSwgcGFyYW0uaXNMYXp5KTtcbiAgICB9KTtcblxuICAgIC8vIERlbGF5aW5nIHRoZSBpbnN0YW50aWF0aW9uIC0gcmV0dXJuIGEgcHJvbWlzZS5cbiAgICBpZiAoZGVsYXlpbmdJbnN0YW50aWF0aW9uKSB7XG4gICAgICB2YXIgZGVsYXllZFJlc29sdmluZyA9IHJlc29sdmluZy5zbGljZSgpOyAvLyBjbG9uZVxuXG4gICAgICByZXNvbHZpbmcucG9wKCk7XG5cbiAgICAgIC8vIE9uY2UgYWxsIGRlcGVuZGVuY2llcyAocHJvbWlzZXMpIGFyZSByZXNvbHZlZCwgaW5zdGFudGlhdGUuXG4gICAgICByZXR1cm4gUHJvbWlzZS5hbGwoYXJncykudGhlbihmdW5jdGlvbihhcmdzKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaW5zdGFuY2UgPSBwcm92aWRlci5jcmVhdGUoYXJncyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICByZXNvbHZpbmdNc2cgPSBjb25zdHJ1Y3RSZXNvbHZpbmdNZXNzYWdlKGRlbGF5ZWRSZXNvbHZpbmcpO1xuICAgICAgICAgIHZhciBvcmlnaW5hbE1zZyA9ICdPUklHSU5BTCBFUlJPUjogJyArIGUubWVzc2FnZTtcbiAgICAgICAgICBlLm1lc3NhZ2UgPSBgRXJyb3IgZHVyaW5nIGluc3RhbnRpYXRpb24gb2YgJHt0b1N0cmluZyh0b2tlbil9ISR7cmVzb2x2aW5nTXNnfVxcbiR7b3JpZ2luYWxNc2d9YDtcbiAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFoYXNBbm5vdGF0aW9uKHByb3ZpZGVyLnByb3ZpZGVyLCBUcmFuc2llbnRTY29wZUFubm90YXRpb24pKSB7XG4gICAgICAgICAgaW5qZWN0b3IuX2NhY2hlLnNldCh0b2tlbiwgaW5zdGFuY2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVE9ETyh2b2p0YSk6IGlmIGEgcHJvdmlkZXIgcmV0dXJucyBhIHByb21pc2UgKGJ1dCBpcyBub3QgZGVjbGFyZWQgYXMgQFByb3ZpZGVQcm9taXNlKSxcbiAgICAgICAgLy8gaGVyZSB0aGUgdmFsdWUgd2lsbCBnZXQgdW53cmFwcGVkIChiZWNhdXNlIGl0IGlzIHJldHVybmVkIGZyb20gYSBwcm9taXNlIGNhbGxiYWNrKSBhbmRcbiAgICAgICAgLy8gdGhlIGFjdHVhbCB2YWx1ZSB3aWxsIGJlIGluamVjdGVkLiBUaGlzIGlzIHByb2JhYmx5IG5vdCBkZXNpcmVkIGJlaGF2aW9yLiBNYXliZSB3ZSBjb3VsZFxuICAgICAgICAvLyBnZXQgcmlkIG9mZiB0aGUgQFByb3ZpZGVQcm9taXNlIGFuZCBqdXN0IGNoZWNrIHRoZSByZXR1cm5lZCB2YWx1ZSwgd2hldGhlciBpdCBpc1xuICAgICAgICAvLyBhIHByb21pc2Ugb3Igbm90LlxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgaW5zdGFuY2UgPSBwcm92aWRlci5jcmVhdGUoYXJncyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmVzb2x2aW5nTXNnID0gY29uc3RydWN0UmVzb2x2aW5nTWVzc2FnZShyZXNvbHZpbmcpO1xuICAgICAgdmFyIG9yaWdpbmFsTXNnID0gJ09SSUdJTkFMIEVSUk9SOiAnICsgZS5tZXNzYWdlO1xuICAgICAgZS5tZXNzYWdlID0gYEVycm9yIGR1cmluZyBpbnN0YW50aWF0aW9uIG9mICR7dG9TdHJpbmcodG9rZW4pfSEke3Jlc29sdmluZ01zZ31cXG4ke29yaWdpbmFsTXNnfWA7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cblxuICAgIGlmICghaGFzQW5ub3RhdGlvbihwcm92aWRlci5wcm92aWRlciwgVHJhbnNpZW50U2NvcGVBbm5vdGF0aW9uKSkge1xuICAgICAgdGhpcy5fY2FjaGUuc2V0KHRva2VuLCBpbnN0YW5jZSk7XG4gICAgfVxuXG4gICAgaWYgKCF3YW50UHJvbWlzZSAmJiBwcm92aWRlci5pc1Byb21pc2UpIHtcbiAgICAgIHJlc29sdmluZ01zZyA9IGNvbnN0cnVjdFJlc29sdmluZ01lc3NhZ2UocmVzb2x2aW5nKTtcblxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgaW5zdGFudGlhdGUgJHt0b1N0cmluZyh0b2tlbil9IHN5bmNocm9ub3VzbHkuIEl0IGlzIHByb3ZpZGVkIGFzIGEgcHJvbWlzZSEke3Jlc29sdmluZ01zZ31gKTtcbiAgICB9XG5cbiAgICBpZiAod2FudFByb21pc2UgJiYgIXByb3ZpZGVyLmlzUHJvbWlzZSkge1xuICAgICAgaW5zdGFuY2UgPSBQcm9taXNlLnJlc29sdmUoaW5zdGFuY2UpO1xuICAgIH1cblxuICAgIHJlc29sdmluZy5wb3AoKTtcblxuICAgIHJldHVybiBpbnN0YW5jZTtcbiAgfVxuXG5cbiAgZ2V0UHJvbWlzZSh0b2tlbikge1xuICAgIHJldHVybiB0aGlzLmdldCh0b2tlbiwgW10sIHRydWUpO1xuICB9XG5cblxuICAvLyBDcmVhdGUgYSBjaGlsZCBpbmplY3Rvciwgd2hpY2ggZW5jYXBzdWxhdGUgc2hvcnRlciBsaWZlIHNjb3BlLlxuICAvLyBJdCBpcyBwb3NzaWJsZSB0byBhZGQgYWRkaXRpb25hbCBwcm92aWRlcnMgYW5kIGFsc28gZm9yY2UgbmV3IGluc3RhbmNlcyBvZiBleGlzdGluZyBwcm92aWRlcnMuXG4gIGNyZWF0ZUNoaWxkKG1vZHVsZXMgPSBbXSwgZm9yY2VOZXdJbnN0YW5jZXNPZiA9IFtdKSB7XG4gICAgdmFyIGZvcmNlZFByb3ZpZGVycyA9IG5ldyBNYXAoKTtcblxuICAgIC8vIEFsd2F5cyBmb3JjZSBuZXcgaW5zdGFuY2Ugb2YgVHJhbnNpZW50U2NvcGUuXG4gICAgZm9yY2VOZXdJbnN0YW5jZXNPZi5wdXNoKFRyYW5zaWVudFNjb3BlQW5ub3RhdGlvbik7XG5cbiAgICBmb3IgKHZhciBhbm5vdGF0aW9uIG9mIGZvcmNlTmV3SW5zdGFuY2VzT2YpIHtcbiAgICAgIHRoaXMuX2NvbGxlY3RQcm92aWRlcnNXaXRoQW5ub3RhdGlvbihhbm5vdGF0aW9uLCBmb3JjZWRQcm92aWRlcnMpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgSW5qZWN0b3IobW9kdWxlcywgdGhpcywgZm9yY2VkUHJvdmlkZXJzLCBmb3JjZU5ld0luc3RhbmNlc09mKTtcbiAgfVxufVxuXG5cbmV4cG9ydCB7SW5qZWN0b3J9O1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9