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
//# sourceMappingURL=../maps/__fixtures__/jasmine_matchers.js.map