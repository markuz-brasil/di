jest.autoMockOff()
import '6to5/polyfill'

import {
  annotate,
  Injector,
  Inject,
  Constructor,
  InjectPromise,
  ProvidePromise,
  TransientScope
} from '../index'

class UserList {}

// An async provider.
annotate(fetchUsers, new ProvidePromise(UserList))
function fetchUsers() {
  return Promise.resolve(new UserList())
}

class SynchronousUserList {}

class UserController {
  constructor(list) {
    this.list = list
  }
}
annotate(UserController, new Constructor())
annotate(UserController, new Inject(UserList))

class SmartUserController {
  constructor(promise) {
    this.promise = promise
  }
}
annotate(SmartUserController, new Constructor())
annotate(SmartUserController, new InjectPromise(UserList))

describe('async', function() {

  it('should return a promise', function() {
    var injector = new Injector([fetchUsers])
    var p = injector.getPromise(UserList)

    expect(p).toBePromiseLike()
  })

  it('should throw when instantiating promise provider synchronously', function() {
    var injector = new Injector([fetchUsers])

    expect(() => injector.get(UserList))
        .toThrowError('Cannot instantiate UserList synchronously. It is provided as a promise!')
  })

  it('should return promise even if the provider is sync', function() {
    var injector = new Injector()
    var p = injector.getPromise(SynchronousUserList)

    expect(p).toBePromiseLike()
  })

  // regression
  it('should return promise even if the provider is sync, from cache', function() {
    var injector = new Injector()
    /* jshint -W004 */
    var p1 = injector.getPromise(SynchronousUserList)
    var p1 = injector.getPromise(SynchronousUserList)
    /* jshint +W004 */

    expect(p1).toBePromiseLike()
  })

  pit('should return promise when a dependency is async', function() {
    var injector = new Injector([fetchUsers])

    return injector.getPromise(UserController).then(function(userController) {
      expect(userController).toBeInstanceOf(UserController)
      expect(userController.list).toBeInstanceOf(UserList)
    })
  })

  // regression
  it('should return a promise even from parent injector', function() {
    var injector = new Injector([SynchronousUserList])
    var childInjector = injector.createChild([])

    expect(childInjector.getPromise(SynchronousUserList)).toBePromiseLike()
  })

  it('should throw when a dependency is async', function() {
    var injector = new Injector([fetchUsers])

    expect(() => injector.get(UserController))
        .toThrowError('Cannot instantiate UserList synchronously. It is provided as a promise! (UserController -> UserList)')
  })

  it('should resolve synchronously when async dependency requested as a promise', function() {
    var injector = new Injector([fetchUsers])
    var controller = injector.get(SmartUserController)

    expect(controller).toBeInstanceOf(SmartUserController)
    expect(controller.promise).toBePromiseLike()
  })

  // regression
  pit('should not cache TransientScope', function() {

    class NeverCachedUserController {
      constructor(list) {
        this.list = list
      }
    }
    annotate(NeverCachedUserController, new Constructor())
    annotate(NeverCachedUserController, new TransientScope())
    annotate(NeverCachedUserController, new Inject(UserList))

    var injector = new Injector([fetchUsers])

    return injector.getPromise(NeverCachedUserController).then(function(controller1) {
      injector.getPromise(NeverCachedUserController).then(function(controller2) {
        expect(controller1).not.toBe(controller2)
      })
    })
  })

  pit('should allow async dependency in a parent constructor', function() {
    class ChildUserController extends UserController {}

    var injector = new Injector([fetchUsers])

    return injector.getPromise(ChildUserController).then(function(childUserController) {
      expect(childUserController).toBeInstanceOf(ChildUserController)
      expect(childUserController.list).toBeInstanceOf(UserList)
    })
  })
})
