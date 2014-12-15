"use strict";

beforeEach(function () {
  this.addMatchers({
    toBeInstanceOf: function () {
      return {
        compare: function (actual, expectedClass) {
          var pass = typeof actual === "object" && actual instanceof expectedClass;

          return (function (_ref) {
            Object.defineProperties(_ref, {
              message: {
                get: function () {
                  if (pass) {
                    // TODO(vojta): support not.toBeInstanceOf
                    throw new Error("not.toBeInstanceOf is not supported!");
                  }

                  return "Expected " + actual + " to be an instance of " + expectedClass;
                }
              }
            });

            return _ref;
          })({
            pass: pass });
        }
      };
    },

    toBePromiseLike: function () {
      return {
        compare: function (actual, expectedClass) {
          var pass = typeof actual === "object" && typeof actual.then === "function";

          return (function (_ref2) {
            Object.defineProperties(_ref2, {
              message: {
                get: function () {
                  if (pass) {
                    // TODO(vojta): support not.toBePromiseLike
                    throw new Error("not.toBePromiseLike is not supported!");
                  }

                  return "Expected " + actual + " to be a promise";
                }
              }
            });

            return _ref2;
          })({
            pass: pass });
        }
      };
    },

    toThrowError: function (j$) {
      function toThrowError(util) {
        return {
          compare: function (actual) {
            var threw = false, thrown, errorType, message, regexp, name, constructorName;

            if (typeof actual != "function") {
              throw new Error("Actual is not a Function");
            }

            extractExpectedParams.apply(null, arguments);

            try {
              actual();
            } catch (e) {
              threw = true;
              thrown = e;
            }

            if (!threw) {
              return fail("Expected function to throw an Error.");
            }

            if (!(thrown instanceof Error)) {
              return fail("Expected function to throw an Error, but it threw " + thrown + ".");
            }

            if (arguments.length == 1) {
              return pass("Expected function not to throw an Error, but it threw " + fnNameFor(thrown) + ".");
            }

            if (errorType) {
              name = fnNameFor(errorType);
              constructorName = fnNameFor(thrown.constructor);
            }

            if (errorType && message) {
              if (thrown.constructor == errorType && util.equals(thrown.message, message)) {
                return pass("Expected function not to throw " + name + " with message \"" + message + "\".");
              } else {
                return fail("Expected function to throw " + name + " with message \"" + message + "\", but it threw " + constructorName + " with message \"" + thrown.message + "\".");
              }
            }

            if (errorType && regexp) {
              if (thrown.constructor == errorType && regexp.test(thrown.message)) {
                return pass("Expected function not to throw " + name + " with message matching " + regexp + ".");
              } else {
                return fail("Expected function to throw " + name + " with message matching " + regexp + ", but it threw " + constructorName + " with message \"" + thrown.message + "\".");
              }
            }

            if (errorType) {
              if (thrown.constructor == errorType) {
                return pass("Expected function not to throw " + name + ".");
              } else {
                return fail("Expected function to throw " + name + ", but it threw " + constructorName + ".");
              }
            }

            if (message) {
              if (thrown.message == message) {
                return pass("Expected function not to throw an exception with message " + j$.pp(message) + ".");
              } else {
                return fail("Expected function to throw an exception with message " + j$.pp(message) + ", but it threw an exception with message " + j$.pp(thrown.message) + ".");
              }
            }

            if (regexp) {
              if (regexp.test(thrown.message)) {
                return pass("Expected function not to throw an exception with a message matching " + j$.pp(regexp) + ".");
              } else {
                return fail("Expected function to throw an exception with a message matching " + j$.pp(regexp) + ", but it threw an exception with message " + j$.pp(thrown.message) + ".");
              }
            }

            function fnNameFor(func) {
              return func.name || func.toString().match(/^\s*function\s*(\w*)\s*\(/)[1];
            }

            function pass(notMessage) {
              return {
                pass: true,
                message: notMessage
              };
            }

            function fail(message) {
              return {
                pass: false,
                message: message
              };
            }

            function extractExpectedParams() {
              if (arguments.length == 1) {
                return;
              }

              if (arguments.length == 2) {
                var expected = arguments[1];

                if (expected instanceof RegExp) {
                  regexp = expected;
                } else if (typeof expected == "string") {
                  message = expected;
                } else if (checkForAnErrorType(expected)) {
                  errorType = expected;
                }

                if (!(errorType || message || regexp)) {
                  throw new Error("Expected is not an Error, string, or RegExp.");
                }
              } else {
                if (checkForAnErrorType(arguments[1])) {
                  errorType = arguments[1];
                } else {
                  throw new Error("Expected error type is not an Error.");
                }

                if (arguments[2] instanceof RegExp) {
                  regexp = arguments[2];
                } else if (typeof arguments[2] == "string") {
                  message = arguments[2];
                } else {
                  throw new Error("Expected error message is not a string or RegExp.");
                }
              }
            }

            function checkForAnErrorType(type) {
              if (typeof type !== "function") {
                return false;
              }

              var Surrogate = function () {};
              Surrogate.prototype = type.prototype;
              return (new Surrogate()) instanceof Error;
            }
          }
        };
      }

      return toThrowError;
    } });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9fZml4dHVyZXNfXy9qYXNtaW5lX21hdGNoZXJzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsVUFBVSxDQUFDLFlBQVc7QUFDcEIsTUFBSSxDQUFDLFdBQVcsQ0FBQztBQUNmLGtCQUFjLEVBQUUsWUFBVztBQUN6QixhQUFPO0FBQ0wsZUFBTyxFQUFFLFVBQVMsTUFBTSxFQUFFLGFBQWEsRUFBRTtBQUN2QyxjQUFJLElBQUksR0FBRyxPQUFPLE1BQU0sS0FBSyxRQUFRLElBQUksTUFBTSxZQUFZLGFBQWEsQ0FBQTs7QUFFeEU7O0FBRU0scUJBQU87cUJBQUEsWUFBRztBQUNaLHNCQUFJLElBQUksRUFBRTs7QUFFUiwwQkFBTSxJQUFJLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFBO21CQUN4RDs7QUFFRCx5QkFBTyxXQUFXLEdBQUcsTUFBTSxHQUFHLHdCQUF3QixHQUFHLGFBQWEsQ0FBQTtpQkFDdkU7Ozs7O2FBVEk7QUFDTCxnQkFBSSxFQUFFLElBQUksRUFTWCxFQUFBO1NBQ0Y7T0FDRixDQUFBO0tBQ0Y7O0FBRUQsbUJBQWUsRUFBRSxZQUFXO0FBQzFCLGFBQU87QUFDTCxlQUFPLEVBQUUsVUFBUyxNQUFNLEVBQUUsYUFBYSxFQUFFO0FBQ3ZDLGNBQUksSUFBSSxHQUFHLE9BQU8sTUFBTSxLQUFLLFFBQVEsSUFBSSxPQUFPLE1BQU0sQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFBOztBQUUxRTs7QUFFTSxxQkFBTztxQkFBQSxZQUFHO0FBQ1osc0JBQUksSUFBSSxFQUFFOztBQUVSLDBCQUFNLElBQUksS0FBSyxDQUFDLHVDQUF1QyxDQUFDLENBQUE7bUJBQ3pEOztBQUVELHlCQUFPLFdBQVcsR0FBRyxNQUFNLEdBQUcsa0JBQWtCLENBQUE7aUJBQ2pEOzs7OzthQVRJO0FBQ0wsZ0JBQUksRUFBRSxJQUFJLEVBU1gsRUFBQTtTQUNGO09BQ0YsQ0FBQTtLQUNGOztBQUVELGdCQUFZLEVBQUUsVUFBUyxFQUFFLEVBQUU7QUFDekIsZUFB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Q0FBQTtpQkFDdkIsTUFBTTtBQUNMLHdCQUFNLElBQUksS0FBSyxDQUFDLG1EQUFtRCxDQUFDLENBQUE7aUJBQ3JFO2VBQ0Y7YUFDRjs7QUFFRCxxQkFBUyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUU7QUFDakMsa0JBQUksT0FBTyxJQUFJLEtBQUssVUFBVSxFQUFFO0FBQzlCLHVCQUFPLEtBQUssQ0FBQTtlQUNiOztBQUVELGtCQUFJLFNBQVMsR0FBRyxZQUFXLEVBQUUsQ0FBQTtBQUM3Qix1QkFBUyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFBO0FBQ3BDLHFCQUFPLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQyxZQUFZLEtBQUssQ0FBQTthQUMxQztXQUNGO1NBQ0YsQ0FBQTtPQUNGOztBQUVELGFBQU8sWUFBWSxDQUFBO0tBQ3BCLEVBR0YsQ0FBQyxDQUFBO0NBQ0gsQ0FBQyxDQUFBIiwiZmlsZSI6Il9fZml4dHVyZXNfXy9qYXNtaW5lX21hdGNoZXJzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYmVmb3JlRWFjaChmdW5jdGlvbigpIHtcbiAgdGhpcy5hZGRNYXRjaGVycyh7XG4gICAgdG9CZUluc3RhbmNlT2Y6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY29tcGFyZTogZnVuY3Rpb24oYWN0dWFsLCBleHBlY3RlZENsYXNzKSB7XG4gICAgICAgICAgdmFyIHBhc3MgPSB0eXBlb2YgYWN0dWFsID09PSAnb2JqZWN0JyAmJiBhY3R1YWwgaW5zdGFuY2VvZiBleHBlY3RlZENsYXNzXG5cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcGFzczogcGFzcyxcbiAgICAgICAgICAgIGdldCBtZXNzYWdlKCkge1xuICAgICAgICAgICAgICBpZiAocGFzcykge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8odm9qdGEpOiBzdXBwb3J0IG5vdC50b0JlSW5zdGFuY2VPZlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignbm90LnRvQmVJbnN0YW5jZU9mIGlzIG5vdCBzdXBwb3J0ZWQhJylcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHJldHVybiAnRXhwZWN0ZWQgJyArIGFjdHVhbCArICcgdG8gYmUgYW4gaW5zdGFuY2Ugb2YgJyArIGV4cGVjdGVkQ2xhc3NcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuXG4gICAgdG9CZVByb21pc2VMaWtlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbXBhcmU6IGZ1bmN0aW9uKGFjdHVhbCwgZXhwZWN0ZWRDbGFzcykge1xuICAgICAgICAgIHZhciBwYXNzID0gdHlwZW9mIGFjdHVhbCA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIGFjdHVhbC50aGVuID09PSAnZnVuY3Rpb24nXG5cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcGFzczogcGFzcyxcbiAgICAgICAgICAgIGdldCBtZXNzYWdlKCkge1xuICAgICAgICAgICAgICBpZiAocGFzcykge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8odm9qdGEpOiBzdXBwb3J0IG5vdC50b0JlUHJvbWlzZUxpa2VcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vdC50b0JlUHJvbWlzZUxpa2UgaXMgbm90IHN1cHBvcnRlZCEnKVxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgcmV0dXJuICdFeHBlY3RlZCAnICsgYWN0dWFsICsgJyB0byBiZSBhIHByb21pc2UnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcblxuICAgIHRvVGhyb3dFcnJvcjogZnVuY3Rpb24oaiQpIHtcbiAgICAgIGZ1bmN0aW9uIHRvVGhyb3dFcnJvciAodXRpbCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGNvbXBhcmU6IGZ1bmN0aW9uKGFjdHVhbCkge1xuICAgICAgICAgICAgdmFyIHRocmV3ID0gZmFsc2UsXG4gICAgICAgICAgICAgIHRocm93bixcbiAgICAgICAgICAgICAgZXJyb3JUeXBlLFxuICAgICAgICAgICAgICBtZXNzYWdlLFxuICAgICAgICAgICAgICByZWdleHAsXG4gICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgIGNvbnN0cnVjdG9yTmFtZVxuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGFjdHVhbCAhPSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQWN0dWFsIGlzIG5vdCBhIEZ1bmN0aW9uXCIpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGV4dHJhY3RFeHBlY3RlZFBhcmFtcy5hcHBseShudWxsLCBhcmd1bWVudHMpXG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGFjdHVhbCgpXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgIHRocmV3ID0gdHJ1ZVxuICAgICAgICAgICAgICB0aHJvd24gPSBlXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghdGhyZXcpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhaWwoXCJFeHBlY3RlZCBmdW5jdGlvbiB0byB0aHJvdyBhbiBFcnJvci5cIilcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCEodGhyb3duIGluc3RhbmNlb2YgRXJyb3IpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWlsKFwiRXhwZWN0ZWQgZnVuY3Rpb24gdG8gdGhyb3cgYW4gRXJyb3IsIGJ1dCBpdCB0aHJldyBcIiArIHRocm93biArIFwiLlwiKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICAgIHJldHVybiBwYXNzKFwiRXhwZWN0ZWQgZnVuY3Rpb24gbm90IHRvIHRocm93IGFuIEVycm9yLCBidXQgaXQgdGhyZXcgXCIgKyBmbk5hbWVGb3IodGhyb3duKSArIFwiLlwiKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZXJyb3JUeXBlKSB7XG4gICAgICAgICAgICAgIG5hbWUgPSBmbk5hbWVGb3IoZXJyb3JUeXBlKVxuICAgICAgICAgICAgICBjb25zdHJ1Y3Rvck5hbWUgPSBmbk5hbWVGb3IodGhyb3duLmNvbnN0cnVjdG9yKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZXJyb3JUeXBlICYmIG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgaWYgKHRocm93bi5jb25zdHJ1Y3RvciA9PSBlcnJvclR5cGUgJiYgdXRpbC5lcXVhbHModGhyb3duLm1lc3NhZ2UsIG1lc3NhZ2UpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhc3MoXCJFeHBlY3RlZCBmdW5jdGlvbiBub3QgdG8gdGhyb3cgXCIgKyBuYW1lICsgXCIgd2l0aCBtZXNzYWdlIFxcXCJcIiArIG1lc3NhZ2UgKyBcIlxcXCIuXCIpXG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhaWwoXCJFeHBlY3RlZCBmdW5jdGlvbiB0byB0aHJvdyBcIiArIG5hbWUgKyBcIiB3aXRoIG1lc3NhZ2UgXFxcIlwiICsgbWVzc2FnZSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJcXFwiLCBidXQgaXQgdGhyZXcgXCIgKyBjb25zdHJ1Y3Rvck5hbWUgKyBcIiB3aXRoIG1lc3NhZ2UgXFxcIlwiICsgdGhyb3duLm1lc3NhZ2UgKyBcIlxcXCIuXCIpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGVycm9yVHlwZSAmJiByZWdleHApIHtcbiAgICAgICAgICAgICAgaWYgKHRocm93bi5jb25zdHJ1Y3RvciA9PSBlcnJvclR5cGUgJiYgcmVnZXhwLnRlc3QodGhyb3duLm1lc3NhZ2UpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhc3MoXCJFeHBlY3RlZCBmdW5jdGlvbiBub3QgdG8gdGhyb3cgXCIgKyBuYW1lICsgXCIgd2l0aCBtZXNzYWdlIG1hdGNoaW5nIFwiICsgcmVnZXhwICsgXCIuXCIpXG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhaWwoXCJFeHBlY3RlZCBmdW5jdGlvbiB0byB0aHJvdyBcIiArIG5hbWUgKyBcIiB3aXRoIG1lc3NhZ2UgbWF0Y2hpbmcgXCIgKyByZWdleHAgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiLCBidXQgaXQgdGhyZXcgXCIgKyBjb25zdHJ1Y3Rvck5hbWUgKyBcIiB3aXRoIG1lc3NhZ2UgXFxcIlwiICsgdGhyb3duLm1lc3NhZ2UgKyBcIlxcXCIuXCIpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGVycm9yVHlwZSkge1xuICAgICAgICAgICAgICBpZiAodGhyb3duLmNvbnN0cnVjdG9yID09IGVycm9yVHlwZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXNzKFwiRXhwZWN0ZWQgZnVuY3Rpb24gbm90IHRvIHRocm93IFwiICsgbmFtZSArIFwiLlwiKVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWlsKFwiRXhwZWN0ZWQgZnVuY3Rpb24gdG8gdGhyb3cgXCIgKyBuYW1lICsgXCIsIGJ1dCBpdCB0aHJldyBcIiArIGNvbnN0cnVjdG9yTmFtZSArIFwiLlwiKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChtZXNzYWdlKSB7XG4gICAgICAgICAgICAgIGlmICh0aHJvd24ubWVzc2FnZSA9PSBtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhc3MoXCJFeHBlY3RlZCBmdW5jdGlvbiBub3QgdG8gdGhyb3cgYW4gZXhjZXB0aW9uIHdpdGggbWVzc2FnZSBcIiArIGokLnBwKG1lc3NhZ2UpICsgXCIuXCIpXG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhaWwoXCJFeHBlY3RlZCBmdW5jdGlvbiB0byB0aHJvdyBhbiBleGNlcHRpb24gd2l0aCBtZXNzYWdlIFwiICsgaiQucHAobWVzc2FnZSkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiLCBidXQgaXQgdGhyZXcgYW4gZXhjZXB0aW9uIHdpdGggbWVzc2FnZSBcIiArIGokLnBwKHRocm93bi5tZXNzYWdlKSArIFwiLlwiKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChyZWdleHApIHtcbiAgICAgICAgICAgICAgaWYgKHJlZ2V4cC50ZXN0KHRocm93bi5tZXNzYWdlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXNzKFwiRXhwZWN0ZWQgZnVuY3Rpb24gbm90IHRvIHRocm93IGFuIGV4Y2VwdGlvbiB3aXRoIGEgbWVzc2FnZSBtYXRjaGluZyBcIiArIGokLnBwKHJlZ2V4cCkgKyBcIi5cIilcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFpbChcIkV4cGVjdGVkIGZ1bmN0aW9uIHRvIHRocm93IGFuIGV4Y2VwdGlvbiB3aXRoIGEgbWVzc2FnZSBtYXRjaGluZyBcIiArIGokLnBwKHJlZ2V4cCkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiLCBidXQgaXQgdGhyZXcgYW4gZXhjZXB0aW9uIHdpdGggbWVzc2FnZSBcIiArIGokLnBwKHRocm93bi5tZXNzYWdlKSArIFwiLlwiKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGZuTmFtZUZvcihmdW5jKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmMubmFtZSB8fCBmdW5jLnRvU3RyaW5nKCkubWF0Y2goL15cXHMqZnVuY3Rpb25cXHMqKFxcdyopXFxzKlxcKC8pWzFdXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHBhc3Mobm90TWVzc2FnZSkge1xuICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHBhc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogbm90TWVzc2FnZVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGZhaWwobWVzc2FnZSkge1xuICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHBhc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2VcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBleHRyYWN0RXhwZWN0ZWRQYXJhbXMoKSB7XG4gICAgICAgICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09IDIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXhwZWN0ZWQgPSBhcmd1bWVudHNbMV1cblxuICAgICAgICAgICAgICAgIGlmIChleHBlY3RlZCBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICAgICAgICAgICAgcmVnZXhwID0gZXhwZWN0ZWRcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHBlY3RlZCA9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgICBtZXNzYWdlID0gZXhwZWN0ZWRcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoZWNrRm9yQW5FcnJvclR5cGUoZXhwZWN0ZWQpKSB7XG4gICAgICAgICAgICAgICAgICBlcnJvclR5cGUgPSBleHBlY3RlZFxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICghKGVycm9yVHlwZSB8fCBtZXNzYWdlIHx8IHJlZ2V4cCkpIHtcbiAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGVkIGlzIG5vdCBhbiBFcnJvciwgc3RyaW5nLCBvciBSZWdFeHAuXCIpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChjaGVja0ZvckFuRXJyb3JUeXBlKGFyZ3VtZW50c1sxXSkpIHtcbiAgICAgICAgICAgICAgICAgIGVycm9yVHlwZSA9IGFyZ3VtZW50c1sxXVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCBlcnJvciB0eXBlIGlzIG5vdCBhbiBFcnJvci5cIilcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoYXJndW1lbnRzWzJdIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgICAgICAgICAgICByZWdleHAgPSBhcmd1bWVudHNbMl1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBhcmd1bWVudHNbMl0gPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGFyZ3VtZW50c1syXVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCBlcnJvciBtZXNzYWdlIGlzIG5vdCBhIHN0cmluZyBvciBSZWdFeHAuXCIpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGNoZWNrRm9yQW5FcnJvclR5cGUodHlwZSkge1xuICAgICAgICAgICAgICBpZiAodHlwZW9mIHR5cGUgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgdmFyIFN1cnJvZ2F0ZSA9IGZ1bmN0aW9uKCkge31cbiAgICAgICAgICAgICAgU3Vycm9nYXRlLnByb3RvdHlwZSA9IHR5cGUucHJvdG90eXBlXG4gICAgICAgICAgICAgIHJldHVybiAobmV3IFN1cnJvZ2F0ZSgpKSBpbnN0YW5jZW9mIEVycm9yXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0b1Rocm93RXJyb3JcbiAgICB9LFxuXG5cbiAgfSlcbn0pXG5cblxuXG5cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==