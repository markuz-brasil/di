"use strict";

jasmine.getEnv().beforeEach(function () {
  this.addMatchers({
    toBeInstanceOf: function toBeInstanceOf(expectedClass) {
      this.message = function () {
        return "Expected " + this.actual + " to be an instance of " + expectedClass.name;
      };

      return "object" === typeof this.actual && this.actual instanceof expectedClass;
    },

    toBePromiseLike: function toBePromiseLike() {
      this.message = function () {
        return "Expected " + this.actual + " to be a promise";
      };

      return "object" === typeof this.actual && "function" === typeof this.actual.then;
    },

    toThrowError: function toThrowError(msg) {
      var error;

      try {
        this.actual();
      } catch (err) {
        error = err;
      }

      error.toString();

      this.message = function () {
        return "Expected to throw " + msg + " but got " + error.message;
      };

      if (error.toString().match(msg)) {
        return true;
      }

      return error.message === msg;
    } });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9fZml4dHVyZXNfXy9qYXNtaW5lX21hdGNoZXJzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLFVBQVUsQ0FBQyxZQUFXO0FBQ3JDLE1BQUksQ0FBQyxXQUFXLENBQUM7QUFDZixrQkFBYyxFQUFFLFNBQVMsY0FBYyxDQUFFLGFBQWEsRUFBRTtBQUN0RCxVQUFJLENBQUMsT0FBTyxHQUFHLFlBQVk7QUFDekIsZUFBTyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyx3QkFBd0IsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFBO09BQ2pGLENBQUE7O0FBRUQsYUFBTyxRQUFRLEtBQUssT0FBTyxJQUFJLENBQUMsTUFBTSxJQUFLLElBQUksQ0FBQyxNQUFNLFlBQVksYUFBYSxDQUFBO0tBQ2hGOztBQUVELG1CQUFlLEVBQUUsU0FBUyxlQUFlLEdBQUk7QUFDM0MsVUFBSSxDQUFDLE9BQU8sR0FBRyxZQUFZO0FBQ3pCLGVBQU8sV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsa0JBQWtCLENBQUE7T0FDdEQsQ0FBQTs7QUFFRCxhQUFPLFFBQVEsS0FBSyxPQUFPLElBQUksQ0FBQyxNQUFNLElBQUksVUFBVSxLQUFLLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUE7S0FFakY7O0FBRUQsZ0JBQVksRUFBRSxTQUFTLFlBQVksQ0FBRSxHQUFHLEVBQUU7QUFDeEMsVUFBSSxLQUFLLENBQUE7O0FBRVQsVUFBSTtBQUNGLFlBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtPQUNkLENBQ0QsT0FBTyxHQUFHLEVBQUU7QUFDVixvQkFBVzs7O0FBR1gsV0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFBOztBQUVsQjtBQUNFLHdFQUErRDtRQUNoRTs7QUFFRDtBQUNFLG9CQUFXOzs7QUFHYixtQ0FBNEI7T0FHL0IsQ0FBQyxDQUFBO0NBQ0gsQ0FBQyxDQUFBIiwiZmlsZSI6Il9fZml4dHVyZXNfXy9qYXNtaW5lX21hdGNoZXJzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiamFzbWluZS5nZXRFbnYoKS5iZWZvcmVFYWNoKGZ1bmN0aW9uKCkge1xuICB0aGlzLmFkZE1hdGNoZXJzKHtcbiAgICB0b0JlSW5zdGFuY2VPZjogZnVuY3Rpb24gdG9CZUluc3RhbmNlT2YgKGV4cGVjdGVkQ2xhc3MpIHtcbiAgICAgIHRoaXMubWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICdFeHBlY3RlZCAnICsgdGhpcy5hY3R1YWwgKyAnIHRvIGJlIGFuIGluc3RhbmNlIG9mICcgKyBleHBlY3RlZENsYXNzLm5hbWVcbiAgICAgIH1cblxuICAgICAgcmV0dXJuICdvYmplY3QnID09PSB0eXBlb2YgdGhpcy5hY3R1YWwgICYmIHRoaXMuYWN0dWFsIGluc3RhbmNlb2YgZXhwZWN0ZWRDbGFzc1xuICAgIH0sXG5cbiAgICB0b0JlUHJvbWlzZUxpa2U6IGZ1bmN0aW9uIHRvQmVQcm9taXNlTGlrZSAoKSB7XG4gICAgICB0aGlzLm1lc3NhZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAnRXhwZWN0ZWQgJyArIHRoaXMuYWN0dWFsICsgJyB0byBiZSBhIHByb21pc2UnXG4gICAgICB9XG5cbiAgICAgIHJldHVybiAnb2JqZWN0JyA9PT0gdHlwZW9mIHRoaXMuYWN0dWFsICYmICdmdW5jdGlvbicgPT09IHR5cGVvZiB0aGlzLmFjdHVhbC50aGVuXG5cbiAgICB9LFxuXG4gICAgdG9UaHJvd0Vycm9yOiBmdW5jdGlvbiB0b1Rocm93RXJyb3IgKG1zZykge1xuICAgICAgdmFyIGVycm9yXG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHRoaXMuYWN0dWFsKClcbiAgICAgIH1cbiAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgZXJyb3IgPSBlcnJcbiAgICAgIH1cblxuICAgICAgICBlcnJvci50b1N0cmluZygpXG5cbiAgICAgIHRoaXMubWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICdFeHBlY3RlZCB0byB0aHJvdyAnICsgbXNnICsgJyBidXQgZ290ICcgKyBlcnJvci5tZXNzYWdlXG4gICAgICB9XG5cbiAgICAgIGlmIChlcnJvci50b1N0cmluZygpLm1hdGNoKG1zZykpIHtcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGVycm9yLm1lc3NhZ2UgPT09IG1zZ1xuICAgIH0sXG5cbiAgfSlcbn0pXG5cblxuXG5cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==