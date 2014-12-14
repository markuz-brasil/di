"use strict";

var _slice = Array.prototype.slice;
var _applyConstructor = function (Constructor, args) {
  var instance = Object.create(Constructor.prototype);

  var result = Constructor.apply(instance, args);

  return result != null && (typeof result == "object" || typeof result == "function") ? result : instance;
};

var _toArray = function (arr) {
  return Array.isArray(arr) ? arr : Array.from(arr);
};

var Injector = require('./injector').Injector;
var Inject = require('./annotations').Inject;
var annotate = require('./annotations').annotate;
var readAnnotations = require('./annotations').readAnnotations;
var isFunction = require('./util').isFunction;
var createProviderFromFnOrClass = require('./providers').createProviderFromFnOrClass;



var currentSpec = null;
beforeEach(function () {
  currentSpec = this;
  currentSpec.$$providers = [];
});

afterEach(function () {
  currentSpec.$$providers = null;
  currentSpec.$$injector = null;
  currentSpec = null;
});

function isRunning() {
  return !!currentSpec;
}

function use(mock) {
  if (currentSpec && currentSpec.$$injector) {
    throw new Error("Cannot call use() after inject() has already been called.");
  }

  var providerWrapper = {
    provider: mock
  };

  var fn = function () {
    currentSpec.$$providers.push(providerWrapper);
  };

  fn.as = function (token) {
    if (currentSpec && currentSpec.$$injector) {
      throw new Error("Cannot call as() after inject() has already been called.");
    }

    providerWrapper.as = token;
    if (isRunning()) {
      return undefined;
    }

    return fn;
  };

  if (isRunning()) {
    fn();
  }

  return fn;
}

function inject() {
  var params = _slice.call(arguments);

  var behavior = params.pop();

  annotate(behavior, _applyConstructor(Inject, _toArray(params)));

  var run = function () {
    if (!currentSpec.$$injector) {
      var providers = new Map();
      var modules = [];
      var annotations;

      currentSpec.$$providers.forEach(function (providerWrapper) {
        if (!providerWrapper.as) {
          // load as a regular module
          modules.push(providerWrapper.provider);
        } else {
          if (!isFunction(providerWrapper.provider)) {
            // inlined mock
            providers.set(providerWrapper.as, createProviderFromFnOrClass(function () {
              return providerWrapper.provider;
            }, { provide: { token: null, isPromise: false }, params: [] }));
          } else {
            // a fn/class provider with overridden token
            annotations = readAnnotations(providerWrapper.provider);
            providers.set(providerWrapper.as, createProviderFromFnOrClass(providerWrapper.provider, annotations));
          }
        }
      });

      currentSpec.$$injector = new Injector(modules, null, providers);
    }

    currentSpec.$$injector.get(behavior);
  };

  return isRunning() ? run() : run;
}

exports.use = use;
exports.inject = inject;
//# sourceMappingURL=data:application/json;base64,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LEVBQUMsQ0FBQyxDQUFDLENBQUM7V0FDN0QsTUFBTTs7QUFFTCx1QkFBVyxHQUFHLGVBQWUsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDeEQscUJBQVMsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSwyQkFBMkIsQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7V0FDdkc7U0FDRjtPQUNGLENBQUMsQ0FBQzs7QUFFSCxpQkFBVyxDQUFDLFVBQVUsR0FBRyxJQUFJLFFBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0tBQ2pFOztBQUVELGVBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0dBQ3RDLENBQUM7O0FBRUYsU0FBTyxTQUFTLEVBQUUsR0FBRyxHQUFHLEVBQUUsR0FBRyxHQUFHLENBQUM7Q0FDbEM7O1FBR0MsR0FBRyxHQUFILEdBQUc7UUFBRSxNQUFNLEdBQU4sTUFBTSIsImZpbGUiOiJ0ZXN0aW5nLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtJbmplY3Rvcn0gZnJvbSAnLi9pbmplY3Rvcic7XG5pbXBvcnQge0luamVjdCwgYW5ub3RhdGUsIHJlYWRBbm5vdGF0aW9uc30gZnJvbSAnLi9hbm5vdGF0aW9ucyc7XG5pbXBvcnQge2lzRnVuY3Rpb259IGZyb20gJy4vdXRpbCc7XG5pbXBvcnQge2NyZWF0ZVByb3ZpZGVyRnJvbUZuT3JDbGFzc30gZnJvbSAnLi9wcm92aWRlcnMnO1xuXG5cbnZhciBjdXJyZW50U3BlYyA9IG51bGw7XG5iZWZvcmVFYWNoKGZ1bmN0aW9uKCkge1xuICBjdXJyZW50U3BlYyA9IHRoaXM7XG4gIGN1cnJlbnRTcGVjLiQkcHJvdmlkZXJzID0gW107XG59KTtcblxuYWZ0ZXJFYWNoKGZ1bmN0aW9uKCkge1xuICBjdXJyZW50U3BlYy4kJHByb3ZpZGVycyA9IG51bGw7XG4gIGN1cnJlbnRTcGVjLiQkaW5qZWN0b3IgPSBudWxsO1xuICBjdXJyZW50U3BlYyA9IG51bGw7XG59KTtcblxuZnVuY3Rpb24gaXNSdW5uaW5nKCkge1xuICByZXR1cm4gISFjdXJyZW50U3BlYztcbn1cblxuZnVuY3Rpb24gdXNlKG1vY2spIHtcbiAgaWYgKGN1cnJlbnRTcGVjICYmIGN1cnJlbnRTcGVjLiQkaW5qZWN0b3IpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBjYWxsIHVzZSgpIGFmdGVyIGluamVjdCgpIGhhcyBhbHJlYWR5IGJlZW4gY2FsbGVkLicpO1xuICB9XG5cbiAgdmFyIHByb3ZpZGVyV3JhcHBlciA9IHtcbiAgICBwcm92aWRlcjogbW9ja1xuICB9O1xuXG4gIHZhciBmbiA9IGZ1bmN0aW9uKCkge1xuICAgIGN1cnJlbnRTcGVjLiQkcHJvdmlkZXJzLnB1c2gocHJvdmlkZXJXcmFwcGVyKTtcbiAgfTtcblxuICBmbi5hcyA9IGZ1bmN0aW9uKHRva2VuKSB7XG4gICAgaWYgKGN1cnJlbnRTcGVjICYmIGN1cnJlbnRTcGVjLiQkaW5qZWN0b3IpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGNhbGwgYXMoKSBhZnRlciBpbmplY3QoKSBoYXMgYWxyZWFkeSBiZWVuIGNhbGxlZC4nKTtcbiAgICB9XG5cbiAgICBwcm92aWRlcldyYXBwZXIuYXMgPSB0b2tlbjtcbiAgICBpZiAoaXNSdW5uaW5nKCkpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZuO1xuICB9O1xuXG4gIGlmIChpc1J1bm5pbmcoKSkge1xuICAgIGZuKCk7XG4gIH1cblxuICByZXR1cm4gZm47XG59XG5cbmZ1bmN0aW9uIGluamVjdCguLi5wYXJhbXMpIHtcbiAgdmFyIGJlaGF2aW9yID0gcGFyYW1zLnBvcCgpO1xuXG4gIGFubm90YXRlKGJlaGF2aW9yLCBuZXcgSW5qZWN0KC4uLnBhcmFtcykpO1xuXG4gIHZhciBydW4gPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIWN1cnJlbnRTcGVjLiQkaW5qZWN0b3IpIHtcbiAgICAgIHZhciBwcm92aWRlcnMgPSBuZXcgTWFwKCk7XG4gICAgICB2YXIgbW9kdWxlcyA9IFtdO1xuICAgICAgdmFyIGFubm90YXRpb25zO1xuXG4gICAgICBjdXJyZW50U3BlYy4kJHByb3ZpZGVycy5mb3JFYWNoKGZ1bmN0aW9uKHByb3ZpZGVyV3JhcHBlcikge1xuICAgICAgICBpZiAoIXByb3ZpZGVyV3JhcHBlci5hcykge1xuICAgICAgICAgIC8vIGxvYWQgYXMgYSByZWd1bGFyIG1vZHVsZVxuICAgICAgICAgIG1vZHVsZXMucHVzaChwcm92aWRlcldyYXBwZXIucHJvdmlkZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICghaXNGdW5jdGlvbihwcm92aWRlcldyYXBwZXIucHJvdmlkZXIpKSB7XG4gICAgICAgICAgICAvLyBpbmxpbmVkIG1vY2tcbiAgICAgICAgICAgIHByb3ZpZGVycy5zZXQocHJvdmlkZXJXcmFwcGVyLmFzLCBjcmVhdGVQcm92aWRlckZyb21Gbk9yQ2xhc3MoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHJldHVybiBwcm92aWRlcldyYXBwZXIucHJvdmlkZXI7XG4gICAgICAgICAgICB9LCB7cHJvdmlkZToge3Rva2VuOiBudWxsLCBpc1Byb21pc2U6IGZhbHNlfSwgcGFyYW1zOiBbXX0pKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gYSBmbi9jbGFzcyBwcm92aWRlciB3aXRoIG92ZXJyaWRkZW4gdG9rZW5cbiAgICAgICAgICAgIGFubm90YXRpb25zID0gcmVhZEFubm90YXRpb25zKHByb3ZpZGVyV3JhcHBlci5wcm92aWRlcik7XG4gICAgICAgICAgICBwcm92aWRlcnMuc2V0KHByb3ZpZGVyV3JhcHBlci5hcywgY3JlYXRlUHJvdmlkZXJGcm9tRm5PckNsYXNzKHByb3ZpZGVyV3JhcHBlci5wcm92aWRlciwgYW5ub3RhdGlvbnMpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBjdXJyZW50U3BlYy4kJGluamVjdG9yID0gbmV3IEluamVjdG9yKG1vZHVsZXMsIG51bGwsIHByb3ZpZGVycyk7XG4gICAgfVxuXG4gICAgY3VycmVudFNwZWMuJCRpbmplY3Rvci5nZXQoYmVoYXZpb3IpO1xuICB9O1xuXG4gIHJldHVybiBpc1J1bm5pbmcoKSA/IHJ1bigpIDogcnVuO1xufVxuXG5leHBvcnQge1xuICB1c2UsIGluamVjdFxufTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==