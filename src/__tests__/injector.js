jest.autoMockOff()
import '6to5/polyfill'

import {
  annotate,
  Injector,
  Inject,
  InjectLazy,
  Provide,
  Constructor,
  SuperConstructor,
  TransientScope
} from '../index'

import {Car, CyclicEngine} from '../__fixtures__/car'
import {house as houseModule} from '../__fixtures__/house'
import {house as shinyHouseModule} from '../__fixtures__/shiny_house'

describe('injector', function() {

  it('should instantiate a class without dependencies', function() {
    class Car {
      start() {}
    }
    annotate(Car, new Constructor())

    var injector = new Injector()
    var car = injector.get(Car)

    expect(car).toBeInstanceOf(Car)
  })

  it('should resolve dependencies based on @Inject annotation', function() {
    class Engine {
      start() {}
    }
    annotate(Engine, new Constructor())

    class Car {
      constructor(engine) {
        this.engine = engine
      }

      start() {}
    }
    annotate(Car, new Constructor())
    annotate(Car, new Inject(Engine))

    var injector = new Injector()
    var car = injector.get(Car)

    expect(car).toBeInstanceOf(Car)
    expect(car.engine).toBeInstanceOf(Engine)
  })

  it('should override providers', function() {
    class Engine {}
    annotate(Engine, new Constructor())

    class Car {
      constructor(engine) {
        this.engine = engine
      }

      start() {}
    }
    annotate(Car, new Constructor())
    annotate(Car, new Inject(Engine))

    class MockEngine {
      start() {}
    }
    annotate(MockEngine, new Constructor())
    annotate(MockEngine, new Provide(Engine))

    var injector = new Injector([MockEngine])
    var car = injector.get(Car)

    expect(car).toBeInstanceOf(Car)
    expect(car.engine).toBeInstanceOf(MockEngine)
  })

  it('should allow factory function', function() {
    class Size {}

    annotate(computeSize, new Provide(Size))
    function computeSize() {
      return 0
    }

    var injector = new Injector([computeSize])
    var size = injector.get(Size)
    expect(size).toBe(0)
  })

  it('should cache instances', function() {
    class Car {}

    var injector = new Injector()
    var car = injector.get(Car)

    expect(injector.get(Car)).toBe(car)
  })

  it('should throw when no provider defined', function() {
    var injector = new Injector()

    expect(() => injector.get('NonExisting'))
        .toThrowError('No provider for NonExisting!')
  })

  it('should show the full path when no provider defined', function() {
    var injector = new Injector(houseModule)

    expect(() => injector.get('House'))
        .toThrowError('No provider for Sink! (House -> Kitchen -> Sink)')
  })

  it('should throw when trying to instantiate a cyclic dependency', function() {
    var injector = new Injector([CyclicEngine])

    expect(() => injector.get(Car))
        .toThrowError('Cannot instantiate cyclic dependency! (Car -> Engine -> Car)')
  })

  it('should show the full path when error happens in a constructor', function() {
    class Engine {
      constructor() {
        throw new Error('This engine is broken!')
      }
    }

    class Car {
      constructor(e) {}
    }
    annotate(Car, new Inject(Engine))

    var injector = new Injector()

    expect(() => injector.get(Car))
      .toThrowError(/Error during instantiation of Engine! \(Car -> Engine\)/)
  })

  it('should throw an error when used in a class without any parent', function() {
    class WithoutParent {}
    annotate(WithoutParent, new Inject(SuperConstructor))

    var injector = new Injector()

    expect(function() {
      injector.get(WithoutParent)
    }).toThrowError(/Only classes with a parent can ask for SuperConstructor!/)
  })

  it('should throw an error when null/undefined token requested', function() {
    var injector = new Injector()

    expect(function() {
      injector.get(null)
    }).toThrowError(/Invalid token "null" requested!/)

    expect(function() {
      injector.get(undefined)
    }).toThrowError(/Invalid token "undefined" requested!/)
  })

  // regression
  it('should show the full path when null/undefined token requested', function() {
    class Foo {}
    annotate(Foo, new Inject(undefined))

    class Bar {}
    annotate(Bar, new Inject(null))

    var injector = new Injector()

    expect(function() {
      injector.get(Foo)
    }).toThrowError(/Invalid token "undefined" requested! \(Foo -> undefined\)/)

    expect(function() {
      injector.get(Bar)
    }).toThrowError(/Invalid token "null" requested! \(Bar -> null\)/)
  })

  it('should provide itself', function() {
    var injector = new Injector()

    expect(injector.get(Injector)).toBe(injector)
  })

  describe('SuperConstructor', function () {

    it('should support "super" to call a parent constructor', function() {
      class Something {}
      annotate(Something, new Constructor())

      class Parent {
        constructor(something) {
          this.parentSomething = something
        }
      }
      annotate(Parent, new Constructor())
      annotate(Parent, new Inject(Something))

      class Child extends Parent {
        constructor(superConstructor, something) {
          superConstructor()
          this.childSomething = something
        }
      }
      annotate(Child, new Constructor())
      annotate(Child, new Inject(SuperConstructor, Something))

      var injector = new Injector()
      var instance = injector.get(Child)

      expect(instance.parentSomething).toBeInstanceOf(Something)
      expect(instance.childSomething).toBeInstanceOf(Something)
      expect(instance.childSomething).toBe(instance.parentSomething)
    })

    it('should support "super" to call multiple parent constructors', function() {
      class Foo {}
      annotate(Foo, new Constructor())

      class Bar {}
      annotate(Bar, new Constructor())

      class Parent {
        constructor(foo) {
          this.parentFoo = foo
        }
      }
      annotate(Parent, new Constructor())
      annotate(Parent, new Inject(Foo))

      class Child extends Parent {
        constructor(superConstructor, foo) {
          superConstructor()
          this.childFoo = foo
        }
      }
      annotate(Child, new Constructor())
      annotate(Child, new Inject(SuperConstructor, Foo))

      class GrandChild extends Child {
        constructor(superConstructor, foo, bar) {
          superConstructor()
          this.grandChildBar = bar
          this.grandChildFoo = foo
        }
      }
      annotate(GrandChild, new Constructor())
      annotate(GrandChild, new Inject(SuperConstructor, Foo, Bar))

      var injector = new Injector()
      var instance = injector.get(GrandChild)

      expect(instance.parentFoo).toBeInstanceOf(Foo)
      expect(instance.childFoo).toBeInstanceOf(Foo)
      expect(instance.grandChildFoo).toBeInstanceOf(Foo)
      expect(instance.grandChildBar).toBeInstanceOf(Bar)
    })

    it('should throw an error when used in a factory function', function() {
      class Something {}

      annotate(createSomething, new Provide(Something))
      annotate(createSomething, new Inject(SuperConstructor))
      function createSomething() {}

      expect(function() {
        var injector = new Injector([createSomething])
        injector.get(Something)
      }).toThrowError(/Only classes with a parent can ask for SuperConstructor!/)
    })
  })

  describe('transient', function() {

    it('should never cache', function() {
      class Foo {}
      annotate(Foo, new Constructor())
      annotate(Foo, new TransientScope())

      var injector = new Injector()
      expect(injector.get(Foo)).not.toBe(injector.get(Foo))
    })

    it('should always use dependencies (default providers) from the youngest injector', function() {
      class Foo {}
      annotate(Foo, new Constructor())
      annotate(Foo, new Inject())

      class AlwaysNewInstance {
        constructor(foo) {
          this.foo = foo
        }
      }
      annotate(AlwaysNewInstance, new Constructor())
      annotate(AlwaysNewInstance, new TransientScope())
      annotate(AlwaysNewInstance, new Inject(Foo))

      var injector = new Injector()
      var child = injector.createChild([Foo]) // force new instance of Foo

      var fooFromChild = child.get(Foo)
      var fooFromParent = injector.get(Foo)

      var alwaysNew1 = child.get(AlwaysNewInstance)
      var alwaysNew2 = child.get(AlwaysNewInstance)
      var alwaysNewFromParent = injector.get(AlwaysNewInstance)

      expect(alwaysNew1.foo).toBe(fooFromChild)
      expect(alwaysNew2.foo).toBe(fooFromChild)
      expect(alwaysNewFromParent.foo).toBe(fooFromParent)
    })

    it('should always use dependencies from the youngest injector', function() {
      class Foo {}
      annotate(Foo, new Constructor())
      annotate(Foo, new Inject())

      class AlwaysNewInstance {
        constructor(foo) {
          this.foo = foo
        }
      }
      annotate(AlwaysNewInstance, new Constructor())
      annotate(AlwaysNewInstance, new TransientScope())
      annotate(AlwaysNewInstance, new Inject(Foo))

      var injector = new Injector([AlwaysNewInstance])
      var child = injector.createChild([Foo]) // force new instance of Foo

      var fooFromChild = child.get(Foo)
      var fooFromParent = injector.get(Foo)

      var alwaysNew1 = child.get(AlwaysNewInstance)
      var alwaysNew2 = child.get(AlwaysNewInstance)
      var alwaysNewFromParent = injector.get(AlwaysNewInstance)

      expect(alwaysNew1.foo).toBe(fooFromChild)
      expect(alwaysNew2.foo).toBe(fooFromChild)
      expect(alwaysNewFromParent.foo).toBe(fooFromParent)
    })
  })

  describe('child', function() {

    it('should load instances from parent injector', function() {
      class Car {
        start() {}
      }
      annotate(Car, new Constructor())

      var parent = new Injector([Car])
      var child = parent.createChild([])

      var carFromParent = parent.get(Car)
      var carFromChild = child.get(Car)

      expect(carFromChild).toBe(carFromParent)
    })

    it('should create new instance in a child injector', function() {
      class Car {
        start() {}
      }
      annotate(Car, new Constructor())

      class MockCar {
        start() {}
      }
      annotate(MockCar, new Constructor())
      annotate(MockCar, new Provide(Car))

      var parent = new Injector([Car])
      var child = parent.createChild([MockCar])

      var carFromParent = parent.get(Car)
      var carFromChild = child.get(Car)

      expect(carFromParent).not.toBe(carFromChild)
      expect(carFromChild).toBeInstanceOf(MockCar)
    })

    it('should force new instances by annotation', function() {
      class RouteScope {}

      class Engine {
        start() {}
      }
      annotate(Engine, new Constructor())

      class Car {
        constructor(engine) {
          this.engine = engine
        }

        start() {}
      }
      annotate(Car, new Constructor())
      annotate(Car, new RouteScope())
      annotate(Car, new Inject(Engine))

      var parent = new Injector([Car, Engine])
      var child = parent.createChild([], [RouteScope])

      var carFromParent = parent.get(Car)
      var carFromChild = child.get(Car)

      expect(carFromChild).not.toBe(carFromParent)
      expect(carFromChild.engine).toBe(carFromParent.engine)
    })

    it('should force new instances by annotation using overridden provider', function() {
      class RouteScope {}

      class Engine {
        start() {}
      }
      annotate(Engine, new Constructor())

      class MockEngine {
        start() {}
      }
      annotate(MockEngine, new Constructor())
      annotate(MockEngine, new RouteScope())
      annotate(MockEngine, new Provide(Engine))

      var parent = new Injector([MockEngine])
      var childA = parent.createChild([], [RouteScope])
      var childB = parent.createChild([], [RouteScope])

      var engineFromA = childA.get(Engine)
      var engineFromB = childB.get(Engine)

      expect(engineFromA).not.toBe(engineFromB)
      expect(engineFromA).toBeInstanceOf(MockEngine)
      expect(engineFromB).toBeInstanceOf(MockEngine)
    })

    it('should force new instance by annotation using the lowest overridden provider', function() {
      class RouteScope {}

      class Engine {
        constructor() {}
        start() {}
      }
      annotate(Engine, new Constructor())
      annotate(Engine, new RouteScope())

      class MockEngine {
        constructor() {}
        start() {}
      }
      annotate(MockEngine, new Constructor())
      annotate(MockEngine, new Provide(Engine))
      annotate(MockEngine, new RouteScope())

      class DoubleMockEngine {
        start() {}
      }
      annotate(DoubleMockEngine, new Constructor())
      annotate(DoubleMockEngine, new Provide(Engine))
      annotate(DoubleMockEngine, new RouteScope())

      var parent = new Injector([Engine])
      var child = parent.createChild([MockEngine])
      var grantChild = child.createChild([], [RouteScope])

      var engineFromParent = parent.get(Engine)
      var engineFromChild = child.get(Engine)
      var engineFromGrantChild = grantChild.get(Engine)

      expect(engineFromParent).toBeInstanceOf(Engine)
      expect(engineFromChild).toBeInstanceOf(MockEngine)
      expect(engineFromGrantChild).toBeInstanceOf(MockEngine)
      expect(engineFromGrantChild).not.toBe(engineFromChild)
    })

    it('should show the full path when no provider', function() {
      var parent = new Injector(houseModule)
      var child = parent.createChild(shinyHouseModule)

      expect(() => child.get('House'))
          .toThrowError('No provider for Sink! (House -> Kitchen -> Sink)')
    })

    it('should provide itself', function() {
      var parent = new Injector()
      var child = parent.createChild([])

      expect(child.get(Injector)).toBe(child)
    })

    it('should cache default provider in parent injector', function() {
      class Foo {}
      annotate(Foo, new Inject())

      var parent = new Injector()
      var child = parent.createChild([])

      var fooFromChild = child.get(Foo)
      var fooFromParent = parent.get(Foo)

      expect(fooFromParent).toBe(fooFromChild)
    })

    it('should force new instance by annotation for default provider', function() {
      class RequestScope {}

      class Foo {}
      annotate(Foo, new Constructor())
      annotate(Foo, new Inject())
      annotate(Foo, new RequestScope())

      var parent = new Injector()
      var child = parent.createChild([], [RequestScope])

      var fooFromChild = child.get(Foo)
      var fooFromParent = parent.get(Foo)

      expect(fooFromParent).not.toBe(fooFromChild)
    })
  })

  describe('lazy', function() {

    it('should instantiate lazily', function() {
      var constructorSpy = jasmine.createSpy('constructor')

      class ExpensiveEngine {
        constructor() {
          constructorSpy()
        }
      }
      annotate(ExpensiveEngine, new Constructor())

      class Car {
        constructor(createEngine) {
          this.engine = null
          this.createEngine = createEngine
        }

        start() {
          this.engine = this.createEngine()
        }
      }
      annotate(Car, new Constructor())
      annotate(Car, new InjectLazy(ExpensiveEngine))

      var injector = new Injector()
      var car = injector.get(Car)

      expect(constructorSpy).not.toHaveBeenCalled()

      car.start()
      expect(constructorSpy).toHaveBeenCalled()
      expect(car.engine).toBeInstanceOf(ExpensiveEngine)
    })

    // regression
    it('should instantiate lazily from a parent injector', function() {
      var constructorSpy = jasmine.createSpy('constructor')

      class ExpensiveEngine {
        constructor() {
          constructorSpy()
        }
      }
      annotate(ExpensiveEngine, new Constructor())

      class Car {
        constructor(createEngine) {
          this.engine = null
          this.createEngine = createEngine
        }

        start() {
          this.engine = this.createEngine()
        }
      }
      annotate(Car, new Constructor())
      annotate(Car, new InjectLazy(ExpensiveEngine))

      var injector = new Injector([ExpensiveEngine])
      var childInjector = injector.createChild([Car])
      var car = childInjector.get(Car)

      expect(constructorSpy).not.toHaveBeenCalled()

      car.start()
      expect(constructorSpy).toHaveBeenCalled()
      expect(car.engine).toBeInstanceOf(ExpensiveEngine)
    })

    describe('with locals', function() {

      it('should always create a new instance', function() {
        var constructorSpy = jasmine.createSpy('constructor')

          class ExpensiveEngine {
            constructor(power) {
              constructorSpy()
              this.power = power
            }
          }
          annotate(ExpensiveEngine, new Constructor())
          annotate(ExpensiveEngine, new TransientScope())
          annotate(ExpensiveEngine, new Inject('power'))

          class Car {
            constructor(createEngine) {
              this.createEngine = createEngine
            }
          }
          annotate(Car, new Constructor())
          annotate(Car, new InjectLazy(ExpensiveEngine))

          var injector = new Injector()
          var car = injector.get(Car)

          var veyronEngine = car.createEngine('power', 1184)
          var mustangEngine = car.createEngine('power', 420)

        expect(veyronEngine).not.toBe(mustangEngine)
        expect(veyronEngine.power).toBe(1184)
        expect(mustangEngine.power).toBe(420)

        var mustangEngine2 = car.createEngine('power', 420)
        expect(mustangEngine).not.toBe(mustangEngine2)
      })
    })
  })
})
