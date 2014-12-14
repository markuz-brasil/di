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
//# sourceMappingURL=data:application/json;base64,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LG1CQUFtQixnQkFBbkIsbUJBQW1CLEdBQUcsRUFBRTtBQUNoRCxRQUFJLGVBQWUsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDOzs7QUFHaEMsdUJBQW1CLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7OzBCQUU1QixtQkFBbUI7VUFBakMsVUFBVTtBQUNqQixVQUFJLENBQUMsK0JBQStCLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFDOzs7QUFHcEUsV0FBTyxJQUFJLFFBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0dBQzFFOztTQXBSRyxRQUFROzs7UUF3Uk4sUUFBUSxHQUFSLFFBQVEiLCJmaWxlIjoiaW5qZWN0b3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBhbm5vdGF0ZSxcbiAgcmVhZEFubm90YXRpb25zLFxuICBoYXNBbm5vdGF0aW9uLFxuICBQcm92aWRlIGFzIFByb3ZpZGVBbm5vdGF0aW9uLFxuICBUcmFuc2llbnRTY29wZSBhcyBUcmFuc2llbnRTY29wZUFubm90YXRpb25cbn0gZnJvbSAnLi9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge2lzRnVuY3Rpb24sIHRvU3RyaW5nfSBmcm9tICcuL3V0aWwnO1xuaW1wb3J0IHtwcm9maWxlSW5qZWN0b3J9IGZyb20gJy4vcHJvZmlsZXInO1xuaW1wb3J0IHtjcmVhdGVQcm92aWRlckZyb21Gbk9yQ2xhc3N9IGZyb20gJy4vcHJvdmlkZXJzJztcblxuXG5mdW5jdGlvbiBjb25zdHJ1Y3RSZXNvbHZpbmdNZXNzYWdlKHJlc29sdmluZywgdG9rZW4pIHtcbiAgLy8gSWYgYSB0b2tlbiBpcyBwYXNzZWQgaW4sIGFkZCBpdCBpbnRvIHRoZSByZXNvbHZpbmcgYXJyYXkuXG4gIC8vIFdlIG5lZWQgdG8gY2hlY2sgYXJndW1lbnRzLmxlbmd0aCBiZWNhdXNlIGl0IGNhbiBiZSBudWxsL3VuZGVmaW5lZC5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgcmVzb2x2aW5nLnB1c2godG9rZW4pO1xuICB9XG5cbiAgaWYgKHJlc29sdmluZy5sZW5ndGggPiAxKSB7XG4gICAgcmV0dXJuIGAgKCR7cmVzb2x2aW5nLm1hcCh0b1N0cmluZykuam9pbignIC0+ICcpfSlgO1xuICB9XG5cbiAgcmV0dXJuICcnO1xufVxuXG5cbi8vIEluamVjdG9yIGVuY2Fwc3VsYXRlIGEgbGlmZSBzY29wZS5cbi8vIFRoZXJlIGlzIGV4YWN0bHkgb25lIGluc3RhbmNlIGZvciBnaXZlbiB0b2tlbiBpbiBnaXZlbiBpbmplY3Rvci5cbi8vXG4vLyBBbGwgdGhlIHN0YXRlIGlzIGltbXV0YWJsZSwgdGhlIG9ubHkgc3RhdGUgY2hhbmdlcyBpcyB0aGUgY2FjaGUuIFRoZXJlIGlzIGhvd2V2ZXIgbm8gd2F5IHRvIHByb2R1Y2UgZGlmZmVyZW50IGluc3RhbmNlIHVuZGVyIGdpdmVuIHRva2VuLiBJbiB0aGF0IHNlbnNlIGl0IGlzIGltbXV0YWJsZS5cbi8vXG4vLyBJbmplY3RvciBpcyByZXNwb25zaWJsZSBmb3I6XG4vLyAtIHJlc29sdmluZyB0b2tlbnMgaW50b1xuLy8gICAtIHByb3ZpZGVyXG4vLyAgIC0gdmFsdWUgKGNhY2hlL2NhbGxpbmcgcHJvdmlkZXIpXG4vLyAtIGRlYWxpbmcgd2l0aCBpc1Byb21pc2Vcbi8vIC0gZGVhbGluZyB3aXRoIGlzTGF6eVxuLy8gLSBsb2FkaW5nIGRpZmZlcmVudCBcInByb3ZpZGVyc1wiIGFuZCBtb2R1bGVzXG5jbGFzcyBJbmplY3RvciB7XG5cbiAgY29uc3RydWN0b3IobW9kdWxlcyA9IFtdLCBwYXJlbnRJbmplY3RvciA9IG51bGwsIHByb3ZpZGVycyA9IG5ldyBNYXAoKSwgc2NvcGVzID0gW10pIHtcbiAgICB0aGlzLl9jYWNoZSA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9wcm92aWRlcnMgPSBwcm92aWRlcnM7XG4gICAgdGhpcy5fcGFyZW50ID0gcGFyZW50SW5qZWN0b3I7XG4gICAgdGhpcy5fc2NvcGVzID0gc2NvcGVzO1xuXG4gICAgdGhpcy5fbG9hZE1vZHVsZXMobW9kdWxlcyk7XG5cbiAgICBwcm9maWxlSW5qZWN0b3IodGhpcywgSW5qZWN0b3IpO1xuICB9XG5cblxuICAvLyBDb2xsZWN0IGFsbCByZWdpc3RlcmVkIHByb3ZpZGVycyB0aGF0IGhhcyBnaXZlbiBhbm5vdGF0aW9uLlxuICAvLyBJbmNsdWRpbmcgcHJvdmlkZXJzIGRlZmluZWQgaW4gcGFyZW50IGluamVjdG9ycy5cbiAgX2NvbGxlY3RQcm92aWRlcnNXaXRoQW5ub3RhdGlvbihhbm5vdGF0aW9uQ2xhc3MsIGNvbGxlY3RlZFByb3ZpZGVycykge1xuICAgIHRoaXMuX3Byb3ZpZGVycy5mb3JFYWNoKChwcm92aWRlciwgdG9rZW4pID0+IHtcbiAgICAgIGlmICghY29sbGVjdGVkUHJvdmlkZXJzLmhhcyh0b2tlbikgJiYgaGFzQW5ub3RhdGlvbihwcm92aWRlci5wcm92aWRlciwgYW5ub3RhdGlvbkNsYXNzKSkge1xuICAgICAgICBjb2xsZWN0ZWRQcm92aWRlcnMuc2V0KHRva2VuLCBwcm92aWRlcik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgICB0aGlzLl9wYXJlbnQuX2NvbGxlY3RQcm92aWRlcnNXaXRoQW5ub3RhdGlvbihhbm5vdGF0aW9uQ2xhc3MsIGNvbGxlY3RlZFByb3ZpZGVycyk7XG4gICAgfVxuICB9XG5cblxuICAvLyBMb2FkIG1vZHVsZXMvZnVuY3Rpb24vY2xhc3Nlcy5cbiAgLy8gVGhpcyBtdXRhdGVzIGB0aGlzLl9wcm92aWRlcnNgLCBidXQgaXQgaXMgb25seSBjYWxsZWQgZHVyaW5nIHRoZSBjb25zdHJ1Y3Rvci5cbiAgX2xvYWRNb2R1bGVzKG1vZHVsZXMpIHtcbiAgICBmb3IgKHZhciBtb2R1bGUgb2YgbW9kdWxlcykge1xuICAgICAgLy8gQSBzaW5nbGUgcHJvdmlkZXIgKGNsYXNzIG9yIGZ1bmN0aW9uKS5cbiAgICAgIGlmIChpc0Z1bmN0aW9uKG1vZHVsZSkpIHtcbiAgICAgICAgdGhpcy5fbG9hZEZuT3JDbGFzcyhtb2R1bGUpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIG1vZHVsZSEnKTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIExvYWQgYSBmdW5jdGlvbiBvciBjbGFzcy5cbiAgLy8gVGhpcyBtdXRhdGVzIGB0aGlzLl9wcm92aWRlcnNgLCBidXQgaXQgaXMgb25seSBjYWxsZWQgZHVyaW5nIHRoZSBjb25zdHJ1Y3Rvci5cbiAgX2xvYWRGbk9yQ2xhc3MoZm5PckNsYXNzKSB7XG4gICAgLy8gVE9ETyh2b2p0YSk6IHNob3VsZCB3ZSBleHBvc2UgcHJvdmlkZXIudG9rZW4/XG4gICAgdmFyIGFubm90YXRpb25zID0gcmVhZEFubm90YXRpb25zKGZuT3JDbGFzcyk7XG4gICAgdmFyIHRva2VuID0gYW5ub3RhdGlvbnMucHJvdmlkZS50b2tlbiB8fCBmbk9yQ2xhc3M7XG4gICAgdmFyIHByb3ZpZGVyID0gY3JlYXRlUHJvdmlkZXJGcm9tRm5PckNsYXNzKGZuT3JDbGFzcywgYW5ub3RhdGlvbnMpO1xuXG4gICAgdGhpcy5fcHJvdmlkZXJzLnNldCh0b2tlbiwgcHJvdmlkZXIpO1xuICB9XG5cblxuICAvLyBSZXR1cm5zIHRydWUgaWYgdGhlcmUgaXMgYW55IHByb3ZpZGVyIHJlZ2lzdGVyZWQgZm9yIGdpdmVuIHRva2VuLlxuICAvLyBJbmNsdWRpbmcgcGFyZW50IGluamVjdG9ycy5cbiAgX2hhc1Byb3ZpZGVyRm9yKHRva2VuKSB7XG4gICAgaWYgKHRoaXMuX3Byb3ZpZGVycy5oYXModG9rZW4pKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGFyZW50Ll9oYXNQcm92aWRlckZvcih0b2tlbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gRmluZCB0aGUgY29ycmVjdCBpbmplY3RvciB3aGVyZSB0aGUgZGVmYXVsdCBwcm92aWRlciBzaG91bGQgYmUgaW5zdGFudGlhdGVkIGFuZCBjYWNoZWQuXG4gIF9pbnN0YW50aWF0ZURlZmF1bHRQcm92aWRlcihwcm92aWRlciwgdG9rZW4sIHJlc29sdmluZywgd2FudFByb21pc2UsIHdhbnRMYXp5KSB7XG4gICAgLy8gSW4gcm9vdCBpbmplY3RvciwgaW5zdGFudGlhdGUgaGVyZS5cbiAgICBpZiAoIXRoaXMuX3BhcmVudCkge1xuICAgICAgdGhpcy5fcHJvdmlkZXJzLnNldCh0b2tlbiwgcHJvdmlkZXIpO1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0KHRva2VuLCByZXNvbHZpbmcsIHdhbnRQcm9taXNlLCB3YW50TGF6eSk7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgdGhpcyBpbmplY3RvciBmb3JjZXMgbmV3IGluc3RhbmNlIG9mIHRoaXMgcHJvdmlkZXIuXG4gICAgZm9yICh2YXIgU2NvcGVDbGFzcyBvZiB0aGlzLl9zY29wZXMpIHtcbiAgICAgIGlmIChoYXNBbm5vdGF0aW9uKHByb3ZpZGVyLnByb3ZpZGVyLCBTY29wZUNsYXNzKSkge1xuICAgICAgICB0aGlzLl9wcm92aWRlcnMuc2V0KHRva2VuLCBwcm92aWRlcik7XG4gICAgICAgIHJldHVybiB0aGlzLmdldCh0b2tlbiwgcmVzb2x2aW5nLCB3YW50UHJvbWlzZSwgd2FudExhenkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE90aGVyd2lzZSBhc2sgcGFyZW50IGluamVjdG9yLlxuICAgIHJldHVybiB0aGlzLl9wYXJlbnQuX2luc3RhbnRpYXRlRGVmYXVsdFByb3ZpZGVyKHByb3ZpZGVyLCB0b2tlbiwgcmVzb2x2aW5nLCB3YW50UHJvbWlzZSwgd2FudExhenkpO1xuICB9XG5cblxuICAvLyBSZXR1cm4gYW4gaW5zdGFuY2UgZm9yIGdpdmVuIHRva2VuLlxuICBnZXQodG9rZW4sIHJlc29sdmluZyA9IFtdLCB3YW50UHJvbWlzZSA9IGZhbHNlLCB3YW50TGF6eSA9IGZhbHNlKSB7XG4gICAgdmFyIHJlc29sdmluZ01zZyA9ICcnO1xuICAgIHZhciBwcm92aWRlcjtcbiAgICB2YXIgaW5zdGFuY2U7XG4gICAgdmFyIGluamVjdG9yID0gdGhpcztcblxuICAgIGlmICh0b2tlbiA9PT0gbnVsbCB8fCB0b2tlbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXNvbHZpbmdNc2cgPSBjb25zdHJ1Y3RSZXNvbHZpbmdNZXNzYWdlKHJlc29sdmluZywgdG9rZW4pO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHRva2VuIFwiJHt0b2tlbn1cIiByZXF1ZXN0ZWQhJHtyZXNvbHZpbmdNc2d9YCk7XG4gICAgfVxuXG4gICAgLy8gU3BlY2lhbCBjYXNlLCByZXR1cm4gaXRzZWxmLlxuICAgIGlmICh0b2tlbiA9PT0gSW5qZWN0b3IpIHtcbiAgICAgIGlmICh3YW50UHJvbWlzZSkge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvLyBUT0RPKHZvanRhKTogb3B0aW1pemUgLSBubyBjaGlsZCBpbmplY3RvciBmb3IgbG9jYWxzP1xuICAgIGlmICh3YW50TGF6eSkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uIGNyZWF0ZUxhenlJbnN0YW5jZSgpIHtcbiAgICAgICAgdmFyIGxhenlJbmplY3RvciA9IGluamVjdG9yO1xuXG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIGxvY2FscyA9IFtdO1xuICAgICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuXG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICAgICAgICBsb2NhbHMucHVzaCgoZnVuY3Rpb24oaWkpIHtcbiAgICAgICAgICAgICAgdmFyIGZuID0gZnVuY3Rpb24gY3JlYXRlTG9jYWxJbnN0YW5jZSgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJnc1tpaSArIDFdO1xuICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgIGFubm90YXRlKGZuLCBuZXcgUHJvdmlkZUFubm90YXRpb24oYXJnc1tpaV0pKTtcblxuICAgICAgICAgICAgICByZXR1cm4gZm47XG4gICAgICAgICAgICB9KShpKSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGF6eUluamVjdG9yID0gaW5qZWN0b3IuY3JlYXRlQ2hpbGQobG9jYWxzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBsYXp5SW5qZWN0b3IuZ2V0KHRva2VuLCByZXNvbHZpbmcsIHdhbnRQcm9taXNlLCBmYWxzZSk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIHRoZXJlIGlzIGEgY2FjaGVkIGluc3RhbmNlIGFscmVhZHkuXG4gICAgaWYgKHRoaXMuX2NhY2hlLmhhcyh0b2tlbikpIHtcbiAgICAgIGluc3RhbmNlID0gdGhpcy5fY2FjaGUuZ2V0KHRva2VuKTtcbiAgICAgIHByb3ZpZGVyID0gdGhpcy5fcHJvdmlkZXJzLmdldCh0b2tlbik7XG5cbiAgICAgIGlmIChwcm92aWRlci5pc1Byb21pc2UgJiYgIXdhbnRQcm9taXNlKSB7XG4gICAgICAgIHJlc29sdmluZ01zZyA9IGNvbnN0cnVjdFJlc29sdmluZ01lc3NhZ2UocmVzb2x2aW5nLCB0b2tlbik7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGluc3RhbnRpYXRlICR7dG9TdHJpbmcodG9rZW4pfSBzeW5jaHJvbm91c2x5LiBJdCBpcyBwcm92aWRlZCBhcyBhIHByb21pc2UhJHtyZXNvbHZpbmdNc2d9YCk7XG4gICAgICB9XG5cbiAgICAgIGlmICghcHJvdmlkZXIuaXNQcm9taXNlICYmIHdhbnRQcm9taXNlKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoaW5zdGFuY2UpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgfVxuXG4gICAgcHJvdmlkZXIgPSB0aGlzLl9wcm92aWRlcnMuZ2V0KHRva2VuKTtcblxuICAgIC8vIE5vIHByb3ZpZGVyIGRlZmluZWQgKG92ZXJyaWRkZW4pLCB1c2UgdGhlIGRlZmF1bHQgcHJvdmlkZXIgKHRva2VuKS5cbiAgICBpZiAoIXByb3ZpZGVyICYmIGlzRnVuY3Rpb24odG9rZW4pICYmICF0aGlzLl9oYXNQcm92aWRlckZvcih0b2tlbikpIHtcbiAgICAgIHByb3ZpZGVyID0gY3JlYXRlUHJvdmlkZXJGcm9tRm5PckNsYXNzKHRva2VuLCByZWFkQW5ub3RhdGlvbnModG9rZW4pKTtcbiAgICAgIHJldHVybiB0aGlzLl9pbnN0YW50aWF0ZURlZmF1bHRQcm92aWRlcihwcm92aWRlciwgdG9rZW4sIHJlc29sdmluZywgd2FudFByb21pc2UsIHdhbnRMYXp5KTtcbiAgICB9XG5cbiAgICBpZiAoIXByb3ZpZGVyKSB7XG4gICAgICBpZiAoIXRoaXMuX3BhcmVudCkge1xuICAgICAgICByZXNvbHZpbmdNc2cgPSBjb25zdHJ1Y3RSZXNvbHZpbmdNZXNzYWdlKHJlc29sdmluZywgdG9rZW4pO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHByb3ZpZGVyIGZvciAke3RvU3RyaW5nKHRva2VuKX0hJHtyZXNvbHZpbmdNc2d9YCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLl9wYXJlbnQuZ2V0KHRva2VuLCByZXNvbHZpbmcsIHdhbnRQcm9taXNlLCB3YW50TGF6eSk7XG4gICAgfVxuXG4gICAgaWYgKHJlc29sdmluZy5pbmRleE9mKHRva2VuKSAhPT0gLTEpIHtcbiAgICAgIHJlc29sdmluZ01zZyA9IGNvbnN0cnVjdFJlc29sdmluZ01lc3NhZ2UocmVzb2x2aW5nLCB0b2tlbik7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBpbnN0YW50aWF0ZSBjeWNsaWMgZGVwZW5kZW5jeSEke3Jlc29sdmluZ01zZ31gKTtcbiAgICB9XG5cbiAgICByZXNvbHZpbmcucHVzaCh0b2tlbik7XG5cbiAgICAvLyBUT0RPKHZvanRhKTogaGFuZGxlIHRoZXNlIGNhc2VzOlxuICAgIC8vIDEvXG4gICAgLy8gLSByZXF1ZXN0ZWQgYXMgcHJvbWlzZSAoZGVsYXllZClcbiAgICAvLyAtIHJlcXVlc3RlZCBhZ2FpbiBhcyBwcm9taXNlIChiZWZvcmUgdGhlIHByZXZpb3VzIGdldHMgcmVzb2x2ZWQpIC0+IGNhY2hlIHRoZSBwcm9taXNlXG4gICAgLy8gMi9cbiAgICAvLyAtIHJlcXVlc3RlZCBhcyBwcm9taXNlIChkZWxheWVkKVxuICAgIC8vIC0gcmVxdWVzdGVkIGFnYWluIHN5bmMgKGJlZm9yZSB0aGUgcHJldmlvdXMgZ2V0cyByZXNvbHZlZClcbiAgICAvLyAtPiBlcnJvciwgYnV0IGxldCBpdCBnbyBpbnNpZGUgdG8gdGhyb3cgd2hlcmUgZXhhY3RseSBpcyB0aGUgYXN5bmMgcHJvdmlkZXJcbiAgICB2YXIgZGVsYXlpbmdJbnN0YW50aWF0aW9uID0gd2FudFByb21pc2UgJiYgcHJvdmlkZXIucGFyYW1zLnNvbWUoKHBhcmFtKSA9PiAhcGFyYW0uaXNQcm9taXNlKTtcbiAgICB2YXIgYXJncyA9IHByb3ZpZGVyLnBhcmFtcy5tYXAoKHBhcmFtKSA9PiB7XG5cbiAgICAgIGlmIChkZWxheWluZ0luc3RhbnRpYXRpb24pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KHBhcmFtLnRva2VuLCByZXNvbHZpbmcsIHRydWUsIHBhcmFtLmlzTGF6eSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLmdldChwYXJhbS50b2tlbiwgcmVzb2x2aW5nLCBwYXJhbS5pc1Byb21pc2UsIHBhcmFtLmlzTGF6eSk7XG4gICAgfSk7XG5cbiAgICAvLyBEZWxheWluZyB0aGUgaW5zdGFudGlhdGlvbiAtIHJldHVybiBhIHByb21pc2UuXG4gICAgaWYgKGRlbGF5aW5nSW5zdGFudGlhdGlvbikge1xuICAgICAgdmFyIGRlbGF5ZWRSZXNvbHZpbmcgPSByZXNvbHZpbmcuc2xpY2UoKTsgLy8gY2xvbmVcblxuICAgICAgcmVzb2x2aW5nLnBvcCgpO1xuXG4gICAgICAvLyBPbmNlIGFsbCBkZXBlbmRlbmNpZXMgKHByb21pc2VzKSBhcmUgcmVzb2x2ZWQsIGluc3RhbnRpYXRlLlxuICAgICAgcmV0dXJuIFByb21pc2UuYWxsKGFyZ3MpLnRoZW4oZnVuY3Rpb24oYXJncykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGluc3RhbmNlID0gcHJvdmlkZXIuY3JlYXRlKGFyZ3MpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgcmVzb2x2aW5nTXNnID0gY29uc3RydWN0UmVzb2x2aW5nTWVzc2FnZShkZWxheWVkUmVzb2x2aW5nKTtcbiAgICAgICAgICB2YXIgb3JpZ2luYWxNc2cgPSAnT1JJR0lOQUwgRVJST1I6ICcgKyBlLm1lc3NhZ2U7XG4gICAgICAgICAgZS5tZXNzYWdlID0gYEVycm9yIGR1cmluZyBpbnN0YW50aWF0aW9uIG9mICR7dG9TdHJpbmcodG9rZW4pfSEke3Jlc29sdmluZ01zZ31cXG4ke29yaWdpbmFsTXNnfWA7XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaGFzQW5ub3RhdGlvbihwcm92aWRlci5wcm92aWRlciwgVHJhbnNpZW50U2NvcGVBbm5vdGF0aW9uKSkge1xuICAgICAgICAgIGluamVjdG9yLl9jYWNoZS5zZXQodG9rZW4sIGluc3RhbmNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRPRE8odm9qdGEpOiBpZiBhIHByb3ZpZGVyIHJldHVybnMgYSBwcm9taXNlIChidXQgaXMgbm90IGRlY2xhcmVkIGFzIEBQcm92aWRlUHJvbWlzZSksXG4gICAgICAgIC8vIGhlcmUgdGhlIHZhbHVlIHdpbGwgZ2V0IHVud3JhcHBlZCAoYmVjYXVzZSBpdCBpcyByZXR1cm5lZCBmcm9tIGEgcHJvbWlzZSBjYWxsYmFjaykgYW5kXG4gICAgICAgIC8vIHRoZSBhY3R1YWwgdmFsdWUgd2lsbCBiZSBpbmplY3RlZC4gVGhpcyBpcyBwcm9iYWJseSBub3QgZGVzaXJlZCBiZWhhdmlvci4gTWF5YmUgd2UgY291bGRcbiAgICAgICAgLy8gZ2V0IHJpZCBvZmYgdGhlIEBQcm92aWRlUHJvbWlzZSBhbmQganVzdCBjaGVjayB0aGUgcmV0dXJuZWQgdmFsdWUsIHdoZXRoZXIgaXQgaXNcbiAgICAgICAgLy8gYSBwcm9taXNlIG9yIG5vdC5cbiAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGluc3RhbmNlID0gcHJvdmlkZXIuY3JlYXRlKGFyZ3MpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJlc29sdmluZ01zZyA9IGNvbnN0cnVjdFJlc29sdmluZ01lc3NhZ2UocmVzb2x2aW5nKTtcbiAgICAgIHZhciBvcmlnaW5hbE1zZyA9ICdPUklHSU5BTCBFUlJPUjogJyArIGUubWVzc2FnZTtcbiAgICAgIGUubWVzc2FnZSA9IGBFcnJvciBkdXJpbmcgaW5zdGFudGlhdGlvbiBvZiAke3RvU3RyaW5nKHRva2VuKX0hJHtyZXNvbHZpbmdNc2d9XFxuJHtvcmlnaW5hbE1zZ31gO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG5cbiAgICBpZiAoIWhhc0Fubm90YXRpb24ocHJvdmlkZXIucHJvdmlkZXIsIFRyYW5zaWVudFNjb3BlQW5ub3RhdGlvbikpIHtcbiAgICAgIHRoaXMuX2NhY2hlLnNldCh0b2tlbiwgaW5zdGFuY2UpO1xuICAgIH1cblxuICAgIGlmICghd2FudFByb21pc2UgJiYgcHJvdmlkZXIuaXNQcm9taXNlKSB7XG4gICAgICByZXNvbHZpbmdNc2cgPSBjb25zdHJ1Y3RSZXNvbHZpbmdNZXNzYWdlKHJlc29sdmluZyk7XG5cbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IGluc3RhbnRpYXRlICR7dG9TdHJpbmcodG9rZW4pfSBzeW5jaHJvbm91c2x5LiBJdCBpcyBwcm92aWRlZCBhcyBhIHByb21pc2UhJHtyZXNvbHZpbmdNc2d9YCk7XG4gICAgfVxuXG4gICAgaWYgKHdhbnRQcm9taXNlICYmICFwcm92aWRlci5pc1Byb21pc2UpIHtcbiAgICAgIGluc3RhbmNlID0gUHJvbWlzZS5yZXNvbHZlKGluc3RhbmNlKTtcbiAgICB9XG5cbiAgICByZXNvbHZpbmcucG9wKCk7XG5cbiAgICByZXR1cm4gaW5zdGFuY2U7XG4gIH1cblxuXG4gIGdldFByb21pc2UodG9rZW4pIHtcbiAgICByZXR1cm4gdGhpcy5nZXQodG9rZW4sIFtdLCB0cnVlKTtcbiAgfVxuXG5cbiAgLy8gQ3JlYXRlIGEgY2hpbGQgaW5qZWN0b3IsIHdoaWNoIGVuY2Fwc3VsYXRlIHNob3J0ZXIgbGlmZSBzY29wZS5cbiAgLy8gSXQgaXMgcG9zc2libGUgdG8gYWRkIGFkZGl0aW9uYWwgcHJvdmlkZXJzIGFuZCBhbHNvIGZvcmNlIG5ldyBpbnN0YW5jZXMgb2YgZXhpc3RpbmcgcHJvdmlkZXJzLlxuICBjcmVhdGVDaGlsZChtb2R1bGVzID0gW10sIGZvcmNlTmV3SW5zdGFuY2VzT2YgPSBbXSkge1xuICAgIHZhciBmb3JjZWRQcm92aWRlcnMgPSBuZXcgTWFwKCk7XG5cbiAgICAvLyBBbHdheXMgZm9yY2UgbmV3IGluc3RhbmNlIG9mIFRyYW5zaWVudFNjb3BlLlxuICAgIGZvcmNlTmV3SW5zdGFuY2VzT2YucHVzaChUcmFuc2llbnRTY29wZUFubm90YXRpb24pO1xuXG4gICAgZm9yICh2YXIgYW5ub3RhdGlvbiBvZiBmb3JjZU5ld0luc3RhbmNlc09mKSB7XG4gICAgICB0aGlzLl9jb2xsZWN0UHJvdmlkZXJzV2l0aEFubm90YXRpb24oYW5ub3RhdGlvbiwgZm9yY2VkUHJvdmlkZXJzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IEluamVjdG9yKG1vZHVsZXMsIHRoaXMsIGZvcmNlZFByb3ZpZGVycywgZm9yY2VOZXdJbnN0YW5jZXNPZik7XG4gIH1cbn1cblxuXG5leHBvcnQge0luamVjdG9yfTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==