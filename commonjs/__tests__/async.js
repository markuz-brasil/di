"use strict";

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

jest.autoMockOff();
require('6to5/polyfill');

var annotate = require('../index').annotate;
var Injector = require('../index').Injector;
var Inject = require('../index').Inject;
var InjectPromise = require('../index').InjectPromise;
var ProvidePromise = require('../index').ProvidePromise;
var TransientScope = require('../index').TransientScope;
var UserList = function UserList() {};

// An async provider.
annotate(fetchUsers, new ProvidePromise(UserList));
function fetchUsers() {
  return Promise.resolve(new UserList());
}

var SynchronousUserList = function SynchronousUserList() {};

var UserController = function UserController(list) {
  this.list = list;
};

annotate(UserController, new Inject(UserList));

var SmartUserController = function SmartUserController(promise) {
  this.promise = promise;
};

annotate(SmartUserController, new InjectPromise(UserList));

describe("async", function () {
  it("should return a promise", function () {
    var injector = new Injector([fetchUsers]);
    var p = injector.getPromise(UserList);

    expect(p).toBePromiseLike();
  });

  it("should throw when instantiating promise provider synchronously", function () {
    var injector = new Injector([fetchUsers]);

    expect(function () {
      return injector.get(UserList);
    }).toThrowError("Cannot instantiate UserList synchronously. It is provided as a promise!");
  });

  it("should return promise even if the provider is sync", function () {
    var injector = new Injector();
    var p = injector.getPromise(SynchronousUserList);

    expect(p).toBePromiseLike();
  });

  // regression
  it("should return promise even if the provider is sync, from cache", function () {
    var injector = new Injector();
    /* jshint -W004 */
    var p1 = injector.getPromise(SynchronousUserList);
    var p1 = injector.getPromise(SynchronousUserList);
    /* jshint +W004 */

    expect(p1).toBePromiseLike();
  });

  pit("should return promise when a dependency is async", function () {
    var injector = new Injector([fetchUsers]);

    return injector.getPromise(UserController).then(function (userController) {
      expect(userController).toBeInstanceOf(UserController);
      expect(userController.list).toBeInstanceOf(UserList);
    });
  });

  // regression
  it("should return a promise even from parent injector", function () {
    var injector = new Injector([SynchronousUserList]);
    var childInjector = injector.createChild([]);

    expect(childInjector.getPromise(SynchronousUserList)).toBePromiseLike();
  });

  it("should throw when a dependency is async", function () {
    var injector = new Injector([fetchUsers]);

    expect(function () {
      return injector.get(UserController);
    }).toThrowError("Cannot instantiate UserList synchronously. It is provided as a promise! (UserController -> UserList)");
  });

  it("should resolve synchronously when async dependency requested as a promise", function () {
    var injector = new Injector([fetchUsers]);
    var controller = injector.get(SmartUserController);

    expect(controller).toBeInstanceOf(SmartUserController);
    expect(controller.promise).toBePromiseLike();
  });

  // regression
  pit("should not cache TransientScope", function () {
    var NeverCachedUserController = function NeverCachedUserController(list) {
      this.list = list;
    };

    annotate(NeverCachedUserController, new TransientScope());
    annotate(NeverCachedUserController, new Inject(UserList));

    var injector = new Injector([fetchUsers]);

    return injector.getPromise(NeverCachedUserController).then(function (controller1) {
      injector.getPromise(NeverCachedUserController).then(function (controller2) {
        expect(controller1).not.toBe(controller2);
      });
    });
  });

  pit("should allow async dependency in a parent constructor", function () {
    var ChildUserController = (function (UserController) {
      var ChildUserController = function ChildUserController() {
        UserController.apply(this, arguments);
      };

      _extends(ChildUserController, UserController);

      return ChildUserController;
    })(UserController);

    var injector = new Injector([fetchUsers]);

    return injector.getPromise(ChildUserController).then(function (childUserController) {
      expect(childUserController).toBeInstanceOf(ChildUserController);
      expect(childUserController.list).toBeInstanceOf(UserList);
    });
  });
});
//# sourceMappingURL=../maps/__tests__/async.js.map