"use strict";

jest.autoMockOff();
require('6to5/polyfill');

require('../__fixtures__/jasmine_matchers');

var annotate = require('../index').annotate;
var hasAnnotation = require('../index').hasAnnotation;
var readAnnotations = require('../index').readAnnotations;
var Injector = require('../index').Injector;
var Inject = require('../index').Inject;
var InjectLazy = require('../index').InjectLazy;
var InjectPromise = require('../index').InjectPromise;
var Provide = require('../index').Provide;
var ProvidePromise = require('../index').ProvidePromise;
var SuperConstructor = require('../index').SuperConstructor;
var TransientScope = require('../index').TransientScope;
var Car = require('../__fixtures__/car').Car;
var CyclicEngine = require('../__fixtures__/car').CyclicEngine;
var houseModule = require('../__fixtures__/house').module;
var shinyHouseModule = require('../__fixtures__/shiny_house').module;



describe("injector", function () {
  // it('should instantiate a class without dependencies', function() {
  //   class Car {
  //     constructor() {}
  //     start() {}
  //   }

  //   var injector = new Injector()
  //   var car = injector.get(Car)

  //   expect(car).toBeInstanceOf(Car)
  // })

  // it('should resolve dependencies based on @Inject annotation', function() {
  //   class Engine {
  //     start() {}
  //   }

  //   class Car {
  //     constructor(engine) {
  //       this.engine = engine
  //     }

  //     start() {}
  //   }
  //   annotate(Car, new Inject(Engine))

  //   var injector = new Injector()
  //   var car = injector.get(Car)

  //   expect(car).toBeInstanceOf(Car)
  //   expect(car.engine).toBeInstanceOf(Engine)
  // })

  // it('should override providers', function() {
  //   class Engine {}

  //   class Car {
  //     constructor(engine) {
  //       this.engine = engine
  //     }

  //     start() {}
  //   }
  //   annotate(Car, new Inject(Engine))

  //   class MockEngine {
  //     start() {}
  //   }
  //   annotate(MockEngine, new Provide(Engine))

  //   var injector = new Injector([MockEngine])
  //   var car = injector.get(Car)

  //   expect(car).toBeInstanceOf(Car)
  //   expect(car.engine).toBeInstanceOf(MockEngine)
  // })

  it("should allow factory function", function () {
    var Size = function Size() {};

    annotate(computeSize, new Provide(Size));
    function computeSize() {
      return 0;
    }

    var injector = new Injector([computeSize]);
    var size = injector.get(Size);

    expect(size).toBe(0);
  });

  it("should cache instances", function () {
    var Car = function Car() {};

    var injector = new Injector();
    var car = injector.get(Car);

    expect(injector.get(Car)).toBe(car);
  });

  // it('should throw when no provider defined', function() {
  //   var injector = new Injector()

  //   expect(() => injector.get('NonExisting'))
  //       .toThrowError('No provider for NonExisting!')
  // })

  // it('should show the full path when no provider defined', function() {
  //   var injector = new Injector(houseModule)

  //   expect(() => injector.get('House'))
  //       .toThrowError('No provider for Sink! (House -> Kitchen -> Sink)')
  // })

  // it('should throw when trying to instantiate a cyclic dependency', function() {
  //   var injector = new Injector([CyclicEngine])

  //   expect(() => injector.get(Car))
  //       .toThrowError('Cannot instantiate cyclic dependency! (Car -> Engine -> Car)')
  // })

  // it('should show the full path when error happens in a constructor', function() {
  //   class Engine {
  //     constructor() {
  //       throw new Error('This engine is broken!')
  //     }
  //   }

  //   class Car {
  //     constructor(e) {}
  //   }
  //   annotate(Car, new Inject(Engine))

  //   var injector = new Injector()

  //   expect(() => injector.get(Car))
  //     .toThrowError(/Error during instantiation of Engine! \(Car -> Engine\)/)
  // })

  // describe('SuperConstructor', function () {
  //   it('should support "super" to call a parent constructor', function() {
  //     class Something {}

  //     class Parent {
  //       constructor(something) {
  //         this.parentSomething = something
  //       }
  //     }
  //     annotate(Parent, new Inject(Something))

  //     class Child extends Parent {
  //       constructor(superConstructor, something) {
  //         superConstructor()
  //         this.childSomething = something
  //       }
  //     }
  //     annotate(Child, new SuperConstructor, new Something)

  //     var injector = new Injector()
  //     var instance = injector.get(Child)

  //     expect(instance.parentSomething).toBeInstanceOf(Something)
  //     expect(instance.childSomething).toBeInstanceOf(Something)
  //     expect(instance.childSomething).toBe(instance.parentSomething)
  //   })

  //   it('should support "super" to call multiple parent constructors', function() {
  //     class Foo {}
  //     class Bar {}

  //     class Parent {
  //       constructor(foo) {
  //         this.parentFoo = foo
  //       }
  //     }
  //     annotate(Parent, new Inject(Foo))

  //     class Child extends Parent {
  //       constructor(superConstructor, foo) {
  //         superConstructor()
  //         this.childFoo = foo
  //       }
  //     }
  //     annotate(Child, new SuperConstructor, new Foo)

  //     class GrandChild extends Child {
  //       constructor(bar, superConstructor, foo) {
  //         superConstructor()
  //         this.grandChildBar = bar
  //         this.grandChildFoo = foo
  //       }
  //     }
  //     annotate(GrandChild, new SuperConstructor, new Foo)

  //     var injector = new Injector()
  //     var instance = injector.get(GrandChild)

  //     expect(instance.parentFoo).toBeInstanceOf(Foo)
  //     expect(instance.childFoo).toBeInstanceOf(Foo)
  //     expect(instance.grandChildFoo).toBeInstanceOf(Foo)
  //     expect(instance.grandChildBar).toBeInstanceOf(Bar)
  //   })

  //   it('should throw an error when used in a factory function', function() {
  //     class Something {}

  //     annotate(createSomething, new Provide(Something))
  //     annotate(createSomething, new Inject(SuperConstructor))
  //     function createSomething(parent) {
  //       console.log('init', parent)
  //     }

  //     expect(function() {
  //       var injector = new Injector([createSomething])
  //       injector.get(Something)
  //     }).toThrowError(/Only classes with a parent can ask for SuperConstructor!/)
  //   })

  // })

  // it('should throw an error when used in a class without any parent', function() {
  //   class WithoutParent {}
  //   annotate(WithoutParent, new Inject(SuperConstructor))

  //   var injector = new Injector()

  //   expect(function() {
  //     injector.get(WithoutParent)
  //   }).toThrowError(/Only classes with a parent can ask for SuperConstructor!/)
  // })

  // it('should throw an error when null/undefined token requested', function() {
  //   var injector = new Injector()

  //   expect(function() {
  //     injector.get(null)
  //   }).toThrowError(/Invalid token "null" requested!/)

  //   expect(function() {
  //     injector.get(undefined)
  //   }).toThrowError(/Invalid token "undefined" requested!/)
  // })

  // regression
  // it('should show the full path when null/undefined token requested', function() {
  //   class Foo {}
  //   annotate(Foo, new Inject(undefined))

  //   class Bar {}
  //   annotate(Bar, new Inject(null))

  //   var injector = new Injector()

  //   expect(function() {
  //     injector.get(Foo)
  //   }).toThrowError(/Invalid token "undefined" requested! \(Foo -> undefined\)/)

  //   expect(function() {
  //     injector.get(Bar)
  //   }).toThrowError(/Invalid token "null" requested! \(Bar -> null\)/)
  // })

  it("should provide itself", function () {
    var injector = new Injector();

    expect(injector.get(Injector)).toBe(injector);
  });

  describe("transient", function () {
    it("should never cache", function () {
      var Foo = function Foo() {};

      annotate(Foo, new TransientScope());

      var injector = new Injector();
      expect(injector.get(Foo)).not.toBe(injector.get(Foo));
    });

    it("should always use dependencies (default providers) from the youngest injector", function () {
      var Foo = function Foo() {};

      annotate(Foo, new Inject());

      (function (_val) {
        return _val.TransientScope();
      });
      (function (_val2) {
        return _val2.Inject(Foo);
      });
      var AlwaysNewInstance = function AlwaysNewInstance(foo) {
        this.foo = foo;
      };

      annotate(AlwaysNewInstance, new TransientScope());
      annotate(AlwaysNewInstance, new Inject(Foo));

      var injector = new Injector();
      var child = injector.createChild([Foo]); // force new instance of Foo

      var fooFromChild = child.get(Foo);
      var fooFromParent = injector.get(Foo);

      var alwaysNew1 = child.get(AlwaysNewInstance);
      var alwaysNew2 = child.get(AlwaysNewInstance);
      var alwaysNewFromParent = injector.get(AlwaysNewInstance);

      expect(alwaysNew1.foo).toBe(fooFromChild);
      expect(alwaysNew2.foo).toBe(fooFromChild);
      expect(alwaysNewFromParent.foo).toBe(fooFromParent);
    });

    it("should always use dependencies from the youngest injector", function () {
      var Foo = function Foo() {};

      annotate(Foo, new Inject());

      var AlwaysNewInstance = function AlwaysNewInstance(foo) {
        this.foo = foo;
      };

      annotate(AlwaysNewInstance, new TransientScope());
      annotate(AlwaysNewInstance, new Inject(Foo));

      var injector = new Injector([AlwaysNewInstance]);
      var child = injector.createChild([Foo]); // force new instance of Foo

      var fooFromChild = child.get(Foo);
      var fooFromParent = injector.get(Foo);

      var alwaysNew1 = child.get(AlwaysNewInstance);
      var alwaysNew2 = child.get(AlwaysNewInstance);
      var alwaysNewFromParent = injector.get(AlwaysNewInstance);

      expect(alwaysNew1.foo).toBe(fooFromChild);
      expect(alwaysNew2.foo).toBe(fooFromChild);
      expect(alwaysNewFromParent.foo).toBe(fooFromParent);
    });
  });


  describe("child", function () {
    it("should load instances from parent injector", function () {
      var Car = (function () {
        var Car = function Car() {};

        Car.prototype.start = function () {};

        return Car;
      })();

      var parent = new Injector([Car]);
      var child = parent.createChild([]);

      var carFromParent = parent.get(Car);
      var carFromChild = child.get(Car);

      expect(carFromChild).toBe(carFromParent);
    });


    it("should create new instance in a child injector", function () {
      var Car = (function () {
        var Car = function Car() {};

        Car.prototype.start = function () {};

        return Car;
      })();

      var MockCar = (function () {
        var MockCar = function MockCar() {};

        MockCar.prototype.start = function () {};

        return MockCar;
      })();

      annotate(MockCar, new Provide(Car));

      var parent = new Injector([Car]);
      var child = parent.createChild([MockCar]);

      var carFromParent = parent.get(Car);
      var carFromChild = child.get(Car);

      expect(carFromParent).not.toBe(carFromChild);
    });


    it("should force new instances by annotation", function () {
      var RouteScope = function RouteScope() {};

      var Engine = (function () {
        var Engine = function Engine() {};

        Engine.prototype.start = function () {};

        return Engine;
      })();

      var Car = (function () {
        var Car = function Car(engine) {
          this.engine = engine;
        };

        Car.prototype.start = function () {};

        return Car;
      })();

      annotate(Car, new RouteScope());
      annotate(Car, new Inject(Engine));

      var parent = new Injector([Car, Engine]);
      var child = parent.createChild([], [RouteScope]);

      var carFromParent = parent.get(Car);
      var carFromChild = child.get(Car);

      expect(carFromChild).not.toBe(carFromParent);
      expect(carFromChild.engine).toBe(carFromParent.engine);
    });

    it("should force new instances by annotation using overridden provider", function () {
      var RouteScope = function RouteScope() {};

      var Engine = (function () {
        var Engine = function Engine() {};

        Engine.prototype.start = function () {};

        return Engine;
      })();

      (function (_val3) {
        return _val3.RouteScope();
      });
      (function (_val4) {
        return _val4.Provide(Engine);
      });
      var MockEngine = (function () {
        var MockEngine = function MockEngine() {};

        MockEngine.prototype.start = function () {};

        return MockEngine;
      })();

      annotate(MockEngine, new RouteScope());
      annotate(MockEngine, new Provide(Engine));

      var parent = new Injector([MockEngine]);
      var childA = parent.createChild([], [RouteScope]);
      var childB = parent.createChild([], [RouteScope]);

      var engineFromA = childA.get(Engine);
      var engineFromB = childB.get(Engine);

      expect(engineFromA).not.toBe(engineFromB);
    });

    it("should force new instance by annotation using the lowest overridden provider", function () {
      var RouteScope = function RouteScope() {};

      var Engine = (function () {
        var Engine = function Engine() {};

        Engine.prototype.start = function () {};

        return Engine;
      })();

      annotate(Engine, new RouteScope());

      var MockEngine = (function () {
        var MockEngine = function MockEngine() {};

        MockEngine.prototype.start = function () {};

        return MockEngine;
      })();

      annotate(MockEngine, new Provide(Engine));
      annotate(MockEngine, new RouteScope());

      var DoubleMockEngine = (function () {
        var DoubleMockEngine = function DoubleMockEngine() {};

        DoubleMockEngine.prototype.start = function () {};

        return DoubleMockEngine;
      })();

      annotate(DoubleMockEngine, new Provide(Engine));
      annotate(DoubleMockEngine, new RouteScope());

      var parent = new Injector([Engine]);
      var child = parent.createChild([MockEngine]);
      var grantChild = child.createChild([], [RouteScope]);

      var engineFromParent = parent.get(Engine);
      var engineFromChild = child.get(Engine);
      var engineFromGrantChild = grantChild.get(Engine);

      // expect(engineFromParent).toBeInstanceOf(Engine)
      // expect(engineFromChild).toBeInstanceOf(MockEngine)
      // expect(engineFromGrantChild).toBeInstanceOf(MockEngine)
      expect(engineFromGrantChild).not.toBe(engineFromChild);
    });

    // it('should show the full path when no provider', function() {
    //   var parent = new Injector(houseModule)
    //   var child = parent.createChild(shinyHouseModule)

    //   expect(() => child.get('House'))
    //       .toThrowError('No provider for Sink! (House -> Kitchen -> Sink)')
    // })

    it("should provide itself", function () {
      var parent = new Injector();
      var child = parent.createChild([]);

      expect(child.get(Injector)).toBe(child);
    });

    it("should cache default provider in parent injector", function () {
      var Foo = function Foo() {};

      annotate(Foo, new Inject());

      var parent = new Injector();
      var child = parent.createChild([]);

      var fooFromChild = child.get(Foo);
      var fooFromParent = parent.get(Foo);

      expect(fooFromParent).toBe(fooFromChild);
    });

    it("should force new instance by annotation for default provider", function () {
      var RequestScope = function RequestScope() {};

      var Foo = function Foo() {};

      annotate(Foo, new Inject());
      annotate(Foo, new RequestScope());

      var parent = new Injector();
      var child = parent.createChild([], [RequestScope]);

      var fooFromChild = child.get(Foo);
      var fooFromParent = parent.get(Foo);

      expect(fooFromParent).not.toBe(fooFromChild);
    });
  });


  describe("lazy", function () {
    it("should instantiate lazily", function () {
      var constructorSpy = jasmine.createSpy("constructor");

      var ExpensiveEngine = function ExpensiveEngine() {
        constructorSpy();
      };

      var Car = (function () {
        var Car = function Car(createEngine) {
          this.engine = null;
          this.createEngine = createEngine;
        };

        Car.prototype.start = function () {
          this.engine = this.createEngine();
        };

        return Car;
      })();

      annotate(Car, new InjectLazy(ExpensiveEngine));

      var injector = new Injector();
      var car = injector.get(Car);

      expect(constructorSpy).not.toHaveBeenCalled();

      car.start();
      expect(constructorSpy).toHaveBeenCalled();
    });

    // regression
    it("should instantiate lazily from a parent injector", function () {
      var constructorSpy = jasmine.createSpy("constructor");

      var ExpensiveEngine = function ExpensiveEngine() {
        constructorSpy();
      };

      var Car = (function () {
        var Car = function Car(createEngine) {
          this.engine = null;
          this.createEngine = createEngine;
        };

        Car.prototype.start = function () {
          this.engine = this.createEngine();
        };

        return Car;
      })();

      annotate(Car, new InjectLazy(ExpensiveEngine));

      var injector = new Injector([ExpensiveEngine]);
      var childInjector = injector.createChild([Car]);
      var car = childInjector.get(Car);

      expect(constructorSpy).not.toHaveBeenCalled();

      car.start();
      expect(constructorSpy).toHaveBeenCalled();
    });

    describe("with locals", function () {
      it("should always create a new instance", function () {
        var constructorSpy = jasmine.createSpy("constructor");

        var ExpensiveEngine = function ExpensiveEngine(power) {
          constructorSpy();
          this.power = power;
        };

        annotate(ExpensiveEngine, new TransientScope());
        annotate(ExpensiveEngine, new Inject("power"));

        var Car = function Car(createEngine) {
          this.createEngine = createEngine;
        };

        annotate(Car, new InjectLazy(ExpensiveEngine));

        var injector = new Injector();
        var car = injector.get(Car);

        var veyronEngine = car.createEngine("power", 1184);
        var mustangEngine = car.createEngine("power", 420);

        expect(veyronEngine).not.toBe(mustangEngine);
        expect(veyronEngine.power).toBe(1184);
        expect(mustangEngine.power).toBe(420);

        var mustangEngine2 = car.createEngine("power", 420);
        expect(mustangEngine).not.toBe(mustangEngine2);
      });
    });
  });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9fdGVzdHNfXy9pbmplY3Rvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTs7Ozs7SUFLaEIsUUFBUSx1QkFBUixRQUFRO0lBQ1IsYUFBYSx1QkFBYixhQUFhO0lBQ2IsZUFBZSx1QkFBZixlQUFlO0lBQ2YsUUFBUSx1QkFBUixRQUFRO0lBQ1IsTUFBTSx1QkFBTixNQUFNO0lBQ04sVUFBVSx1QkFBVixVQUFVO0lBQ1YsYUFBYSx1QkFBYixhQUFhO0lBQ2IsT0FBTyx1QkFBUCxPQUFPO0lBQ1AsY0FBYyx1QkFBZCxjQUFjO0lBQ2QsZ0JBQWdCLHVCQUFoQixnQkFBZ0I7SUFDaEIsY0FBYyx1QkFBZCxjQUFjO0lBR1IsR0FBRyxrQ0FBSCxHQUFHO0lBQUUsWUFBWSxrQ0FBWixZQUFZO0lBQ1AsV0FBVyxvQ0FBckIsTUFBTTtJQUNJLGdCQUFnQiwwQ0FBMUIsTUFBTTs7OztBQUdkLFFBQVEsQ0FBQyxVQUFVLEVBQUUsWUFBVzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQTJEOUIsSUFBRSxDQUFDLCtCQUErQixFQUFFLFlBQVc7UUFDdkMsSUFBSSxZQUFKLElBQUk7O0FBRVYsWUFBUSxDQUFDLFdBQVcsRUFBRSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0FBQ3hDLGFBQVMsV0FBVyxHQUFHO0FBQ3JCLGFBQU8sQ0FBQyxDQUFBO0tBQ1Q7O0FBRUQsUUFBSSxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO0FBQzFDLFFBQUksSUFBSSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7O0FBRTdCLFVBQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FDckIsQ0FBQyxDQUFBOztBQUVGLElBQUUsQ0FBQyx3QkFBd0Is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SCxDQUFDLENBQUEiLCJmaWxlIjoiX190ZXN0c19fL2luamVjdG9yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiamVzdC5hdXRvTW9ja09mZigpXG5pbXBvcnQgJzZ0bzUvcG9seWZpbGwnXG5pbXBvcnQgJy4uL19fZml4dHVyZXNfXy9qYXNtaW5lX21hdGNoZXJzJ1xuXG5pbXBvcnQge1xuICBhbm5vdGF0ZSxcbiAgaGFzQW5ub3RhdGlvbixcbiAgcmVhZEFubm90YXRpb25zLFxuICBJbmplY3RvcixcbiAgSW5qZWN0LFxuICBJbmplY3RMYXp5LFxuICBJbmplY3RQcm9taXNlLFxuICBQcm92aWRlLFxuICBQcm92aWRlUHJvbWlzZSxcbiAgU3VwZXJDb25zdHJ1Y3RvcixcbiAgVHJhbnNpZW50U2NvcGVcbn0gZnJvbSAnLi4vaW5kZXgnXG5cbmltcG9ydCB7Q2FyLCBDeWNsaWNFbmdpbmV9IGZyb20gJy4uL19fZml4dHVyZXNfXy9jYXInXG5pbXBvcnQge21vZHVsZSBhcyBob3VzZU1vZHVsZX0gZnJvbSAnLi4vX19maXh0dXJlc19fL2hvdXNlJ1xuaW1wb3J0IHttb2R1bGUgYXMgc2hpbnlIb3VzZU1vZHVsZX0gZnJvbSAnLi4vX19maXh0dXJlc19fL3NoaW55X2hvdXNlJ1xuXG5cbmRlc2NyaWJlKCdpbmplY3RvcicsIGZ1bmN0aW9uKCkge1xuXG4gIC8vIGl0KCdzaG91bGQgaW5zdGFudGlhdGUgYSBjbGFzcyB3aXRob3V0IGRlcGVuZGVuY2llcycsIGZ1bmN0aW9uKCkge1xuICAvLyAgIGNsYXNzIENhciB7XG4gIC8vICAgICBjb25zdHJ1Y3RvcigpIHt9XG4gIC8vICAgICBzdGFydCgpIHt9XG4gIC8vICAgfVxuXG4gIC8vICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcbiAgLy8gICB2YXIgY2FyID0gaW5qZWN0b3IuZ2V0KENhcilcblxuICAvLyAgIGV4cGVjdChjYXIpLnRvQmVJbnN0YW5jZU9mKENhcilcbiAgLy8gfSlcblxuICAvLyBpdCgnc2hvdWxkIHJlc29sdmUgZGVwZW5kZW5jaWVzIGJhc2VkIG9uIEBJbmplY3QgYW5ub3RhdGlvbicsIGZ1bmN0aW9uKCkge1xuICAvLyAgIGNsYXNzIEVuZ2luZSB7XG4gIC8vICAgICBzdGFydCgpIHt9XG4gIC8vICAgfVxuXG4gIC8vICAgY2xhc3MgQ2FyIHtcbiAgLy8gICAgIGNvbnN0cnVjdG9yKGVuZ2luZSkge1xuICAvLyAgICAgICB0aGlzLmVuZ2luZSA9IGVuZ2luZVxuICAvLyAgICAgfVxuXG4gIC8vICAgICBzdGFydCgpIHt9XG4gIC8vICAgfVxuICAvLyAgIGFubm90YXRlKENhciwgbmV3IEluamVjdChFbmdpbmUpKVxuXG4gIC8vICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcbiAgLy8gICB2YXIgY2FyID0gaW5qZWN0b3IuZ2V0KENhcilcblxuICAvLyAgIGV4cGVjdChjYXIpLnRvQmVJbnN0YW5jZU9mKENhcilcbiAgLy8gICBleHBlY3QoY2FyLmVuZ2luZSkudG9CZUluc3RhbmNlT2YoRW5naW5lKVxuICAvLyB9KVxuXG4gIC8vIGl0KCdzaG91bGQgb3ZlcnJpZGUgcHJvdmlkZXJzJywgZnVuY3Rpb24oKSB7XG4gIC8vICAgY2xhc3MgRW5naW5lIHt9XG5cbiAgLy8gICBjbGFzcyBDYXIge1xuICAvLyAgICAgY29uc3RydWN0b3IoZW5naW5lKSB7XG4gIC8vICAgICAgIHRoaXMuZW5naW5lID0gZW5naW5lXG4gIC8vICAgICB9XG5cbiAgLy8gICAgIHN0YXJ0KCkge31cbiAgLy8gICB9XG4gIC8vICAgYW5ub3RhdGUoQ2FyLCBuZXcgSW5qZWN0KEVuZ2luZSkpXG5cbiAgLy8gICBjbGFzcyBNb2NrRW5naW5lIHtcbiAgLy8gICAgIHN0YXJ0KCkge31cbiAgLy8gICB9XG4gIC8vICAgYW5ub3RhdGUoTW9ja0VuZ2luZSwgbmV3IFByb3ZpZGUoRW5naW5lKSlcblxuICAvLyAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcihbTW9ja0VuZ2luZV0pXG4gIC8vICAgdmFyIGNhciA9IGluamVjdG9yLmdldChDYXIpXG5cbiAgLy8gICBleHBlY3QoY2FyKS50b0JlSW5zdGFuY2VPZihDYXIpXG4gIC8vICAgZXhwZWN0KGNhci5lbmdpbmUpLnRvQmVJbnN0YW5jZU9mKE1vY2tFbmdpbmUpXG4gIC8vIH0pXG5cbiAgaXQoJ3Nob3VsZCBhbGxvdyBmYWN0b3J5IGZ1bmN0aW9uJywgZnVuY3Rpb24oKSB7XG4gICAgY2xhc3MgU2l6ZSB7fVxuXG4gICAgYW5ub3RhdGUoY29tcHV0ZVNpemUsIG5ldyBQcm92aWRlKFNpemUpKVxuICAgIGZ1bmN0aW9uIGNvbXB1dGVTaXplKCkge1xuICAgICAgcmV0dXJuIDBcbiAgICB9XG5cbiAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoW2NvbXB1dGVTaXplXSlcbiAgICB2YXIgc2l6ZSA9IGluamVjdG9yLmdldChTaXplKVxuXG4gICAgZXhwZWN0KHNpemUpLnRvQmUoMClcbiAgfSlcblxuICBpdCgnc2hvdWxkIGNhY2hlIGluc3RhbmNlcycsIGZ1bmN0aW9uKCkge1xuICAgIGNsYXNzIENhciB7fVxuXG4gICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcbiAgICB2YXIgY2FyID0gaW5qZWN0b3IuZ2V0KENhcilcblxuICAgIGV4cGVjdChpbmplY3Rvci5nZXQoQ2FyKSkudG9CZShjYXIpXG4gIH0pXG5cbiAgLy8gaXQoJ3Nob3VsZCB0aHJvdyB3aGVuIG5vIHByb3ZpZGVyIGRlZmluZWQnLCBmdW5jdGlvbigpIHtcbiAgLy8gICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuXG4gIC8vICAgZXhwZWN0KCgpID0+IGluamVjdG9yLmdldCgnTm9uRXhpc3RpbmcnKSlcbiAgLy8gICAgICAgLnRvVGhyb3dFcnJvcignTm8gcHJvdmlkZXIgZm9yIE5vbkV4aXN0aW5nIScpXG4gIC8vIH0pXG5cbiAgLy8gaXQoJ3Nob3VsZCBzaG93IHRoZSBmdWxsIHBhdGggd2hlbiBubyBwcm92aWRlciBkZWZpbmVkJywgZnVuY3Rpb24oKSB7XG4gIC8vICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKGhvdXNlTW9kdWxlKVxuXG4gIC8vICAgZXhwZWN0KCgpID0+IGluamVjdG9yLmdldCgnSG91c2UnKSlcbiAgLy8gICAgICAgLnRvVGhyb3dFcnJvcignTm8gcHJvdmlkZXIgZm9yIFNpbmshIChIb3VzZSAtPiBLaXRjaGVuIC0+IFNpbmspJylcbiAgLy8gfSlcblxuICAvLyBpdCgnc2hvdWxkIHRocm93IHdoZW4gdHJ5aW5nIHRvIGluc3RhbnRpYXRlIGEgY3ljbGljIGRlcGVuZGVuY3knLCBmdW5jdGlvbigpIHtcbiAgLy8gICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoW0N5Y2xpY0VuZ2luZV0pXG5cbiAgLy8gICBleHBlY3QoKCkgPT4gaW5qZWN0b3IuZ2V0KENhcikpXG4gIC8vICAgICAgIC50b1Rocm93RXJyb3IoJ0Nhbm5vdCBpbnN0YW50aWF0ZSBjeWNsaWMgZGVwZW5kZW5jeSEgKENhciAtPiBFbmdpbmUgLT4gQ2FyKScpXG4gIC8vIH0pXG5cbiAgLy8gaXQoJ3Nob3VsZCBzaG93IHRoZSBmdWxsIHBhdGggd2hlbiBlcnJvciBoYXBwZW5zIGluIGEgY29uc3RydWN0b3InLCBmdW5jdGlvbigpIHtcbiAgLy8gICBjbGFzcyBFbmdpbmUge1xuICAvLyAgICAgY29uc3RydWN0b3IoKSB7XG4gIC8vICAgICAgIHRocm93IG5ldyBFcnJvcignVGhpcyBlbmdpbmUgaXMgYnJva2VuIScpXG4gIC8vICAgICB9XG4gIC8vICAgfVxuXG4gIC8vICAgY2xhc3MgQ2FyIHtcbiAgLy8gICAgIGNvbnN0cnVjdG9yKGUpIHt9XG4gIC8vICAgfVxuICAvLyAgIGFubm90YXRlKENhciwgbmV3IEluamVjdChFbmdpbmUpKVxuXG4gIC8vICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcblxuICAvLyAgIGV4cGVjdCgoKSA9PiBpbmplY3Rvci5nZXQoQ2FyKSlcbiAgLy8gICAgIC50b1Rocm93RXJyb3IoL0Vycm9yIGR1cmluZyBpbnN0YW50aWF0aW9uIG9mIEVuZ2luZSEgXFwoQ2FyIC0+IEVuZ2luZVxcKS8pXG4gIC8vIH0pXG5cbiAgLy8gZGVzY3JpYmUoJ1N1cGVyQ29uc3RydWN0b3InLCBmdW5jdGlvbiAoKSB7XG5cbiAgLy8gICBpdCgnc2hvdWxkIHN1cHBvcnQgXCJzdXBlclwiIHRvIGNhbGwgYSBwYXJlbnQgY29uc3RydWN0b3InLCBmdW5jdGlvbigpIHtcbiAgLy8gICAgIGNsYXNzIFNvbWV0aGluZyB7fVxuXG4gIC8vICAgICBjbGFzcyBQYXJlbnQge1xuICAvLyAgICAgICBjb25zdHJ1Y3Rvcihzb21ldGhpbmcpIHtcbiAgLy8gICAgICAgICB0aGlzLnBhcmVudFNvbWV0aGluZyA9IHNvbWV0aGluZ1xuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgICBhbm5vdGF0ZShQYXJlbnQsIG5ldyBJbmplY3QoU29tZXRoaW5nKSlcblxuICAvLyAgICAgY2xhc3MgQ2hpbGQgZXh0ZW5kcyBQYXJlbnQge1xuICAvLyAgICAgICBjb25zdHJ1Y3RvcihzdXBlckNvbnN0cnVjdG9yLCBzb21ldGhpbmcpIHtcbiAgLy8gICAgICAgICBzdXBlckNvbnN0cnVjdG9yKClcbiAgLy8gICAgICAgICB0aGlzLmNoaWxkU29tZXRoaW5nID0gc29tZXRoaW5nXG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cbiAgLy8gICAgIGFubm90YXRlKENoaWxkLCBuZXcgU3VwZXJDb25zdHJ1Y3RvciwgbmV3IFNvbWV0aGluZylcblxuICAvLyAgICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcbiAgLy8gICAgIHZhciBpbnN0YW5jZSA9IGluamVjdG9yLmdldChDaGlsZClcblxuICAvLyAgICAgZXhwZWN0KGluc3RhbmNlLnBhcmVudFNvbWV0aGluZykudG9CZUluc3RhbmNlT2YoU29tZXRoaW5nKVxuICAvLyAgICAgZXhwZWN0KGluc3RhbmNlLmNoaWxkU29tZXRoaW5nKS50b0JlSW5zdGFuY2VPZihTb21ldGhpbmcpXG4gIC8vICAgICBleHBlY3QoaW5zdGFuY2UuY2hpbGRTb21ldGhpbmcpLnRvQmUoaW5zdGFuY2UucGFyZW50U29tZXRoaW5nKVxuICAvLyAgIH0pXG5cbiAgLy8gICBpdCgnc2hvdWxkIHN1cHBvcnQgXCJzdXBlclwiIHRvIGNhbGwgbXVsdGlwbGUgcGFyZW50IGNvbnN0cnVjdG9ycycsIGZ1bmN0aW9uKCkge1xuICAvLyAgICAgY2xhc3MgRm9vIHt9XG4gIC8vICAgICBjbGFzcyBCYXIge31cblxuICAvLyAgICAgY2xhc3MgUGFyZW50IHtcbiAgLy8gICAgICAgY29uc3RydWN0b3IoZm9vKSB7XG4gIC8vICAgICAgICAgdGhpcy5wYXJlbnRGb28gPSBmb29cbiAgLy8gICAgICAgfVxuICAvLyAgICAgfVxuICAvLyAgICAgYW5ub3RhdGUoUGFyZW50LCBuZXcgSW5qZWN0KEZvbykpXG5cbiAgLy8gICAgIGNsYXNzIENoaWxkIGV4dGVuZHMgUGFyZW50IHtcbiAgLy8gICAgICAgY29uc3RydWN0b3Ioc3VwZXJDb25zdHJ1Y3RvciwgZm9vKSB7XG4gIC8vICAgICAgICAgc3VwZXJDb25zdHJ1Y3RvcigpXG4gIC8vICAgICAgICAgdGhpcy5jaGlsZEZvbyA9IGZvb1xuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgICBhbm5vdGF0ZShDaGlsZCwgbmV3IFN1cGVyQ29uc3RydWN0b3IsIG5ldyBGb28pXG5cbiAgLy8gICAgIGNsYXNzIEdyYW5kQ2hpbGQgZXh0ZW5kcyBDaGlsZCB7XG4gIC8vICAgICAgIGNvbnN0cnVjdG9yKGJhciwgc3VwZXJDb25zdHJ1Y3RvciwgZm9vKSB7XG4gIC8vICAgICAgICAgc3VwZXJDb25zdHJ1Y3RvcigpXG4gIC8vICAgICAgICAgdGhpcy5ncmFuZENoaWxkQmFyID0gYmFyXG4gIC8vICAgICAgICAgdGhpcy5ncmFuZENoaWxkRm9vID0gZm9vXG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cbiAgLy8gICAgIGFubm90YXRlKEdyYW5kQ2hpbGQsIG5ldyBTdXBlckNvbnN0cnVjdG9yLCBuZXcgRm9vKVxuXG4gIC8vICAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuICAvLyAgICAgdmFyIGluc3RhbmNlID0gaW5qZWN0b3IuZ2V0KEdyYW5kQ2hpbGQpXG5cbiAgLy8gICAgIGV4cGVjdChpbnN0YW5jZS5wYXJlbnRGb28pLnRvQmVJbnN0YW5jZU9mKEZvbylcbiAgLy8gICAgIGV4cGVjdChpbnN0YW5jZS5jaGlsZEZvbykudG9CZUluc3RhbmNlT2YoRm9vKVxuICAvLyAgICAgZXhwZWN0KGluc3RhbmNlLmdyYW5kQ2hpbGRGb28pLnRvQmVJbnN0YW5jZU9mKEZvbylcbiAgLy8gICAgIGV4cGVjdChpbnN0YW5jZS5ncmFuZENoaWxkQmFyKS50b0JlSW5zdGFuY2VPZihCYXIpXG4gIC8vICAgfSlcblxuICAvLyAgIGl0KCdzaG91bGQgdGhyb3cgYW4gZXJyb3Igd2hlbiB1c2VkIGluIGEgZmFjdG9yeSBmdW5jdGlvbicsIGZ1bmN0aW9uKCkge1xuICAvLyAgICAgY2xhc3MgU29tZXRoaW5nIHt9XG5cbiAgLy8gICAgIGFubm90YXRlKGNyZWF0ZVNvbWV0aGluZywgbmV3IFByb3ZpZGUoU29tZXRoaW5nKSlcbiAgLy8gICAgIGFubm90YXRlKGNyZWF0ZVNvbWV0aGluZywgbmV3IEluamVjdChTdXBlckNvbnN0cnVjdG9yKSlcbiAgLy8gICAgIGZ1bmN0aW9uIGNyZWF0ZVNvbWV0aGluZyhwYXJlbnQpIHtcbiAgLy8gICAgICAgY29uc29sZS5sb2coJ2luaXQnLCBwYXJlbnQpXG4gIC8vICAgICB9XG5cbiAgLy8gICAgIGV4cGVjdChmdW5jdGlvbigpIHtcbiAgLy8gICAgICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKFtjcmVhdGVTb21ldGhpbmddKVxuICAvLyAgICAgICBpbmplY3Rvci5nZXQoU29tZXRoaW5nKVxuICAvLyAgICAgfSkudG9UaHJvd0Vycm9yKC9Pbmx5IGNsYXNzZXMgd2l0aCBhIHBhcmVudCBjYW4gYXNrIGZvciBTdXBlckNvbnN0cnVjdG9yIS8pXG4gIC8vICAgfSlcblxuICAvLyB9KVxuXG4gIC8vIGl0KCdzaG91bGQgdGhyb3cgYW4gZXJyb3Igd2hlbiB1c2VkIGluIGEgY2xhc3Mgd2l0aG91dCBhbnkgcGFyZW50JywgZnVuY3Rpb24oKSB7XG4gIC8vICAgY2xhc3MgV2l0aG91dFBhcmVudCB7fVxuICAvLyAgIGFubm90YXRlKFdpdGhvdXRQYXJlbnQsIG5ldyBJbmplY3QoU3VwZXJDb25zdHJ1Y3RvcikpXG5cbiAgLy8gICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuXG4gIC8vICAgZXhwZWN0KGZ1bmN0aW9uKCkge1xuICAvLyAgICAgaW5qZWN0b3IuZ2V0KFdpdGhvdXRQYXJlbnQpXG4gIC8vICAgfSkudG9UaHJvd0Vycm9yKC9Pbmx5IGNsYXNzZXMgd2l0aCBhIHBhcmVudCBjYW4gYXNrIGZvciBTdXBlckNvbnN0cnVjdG9yIS8pXG4gIC8vIH0pXG5cbiAgLy8gaXQoJ3Nob3VsZCB0aHJvdyBhbiBlcnJvciB3aGVuIG51bGwvdW5kZWZpbmVkIHRva2VuIHJlcXVlc3RlZCcsIGZ1bmN0aW9uKCkge1xuICAvLyAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpXG5cbiAgLy8gICBleHBlY3QoZnVuY3Rpb24oKSB7XG4gIC8vICAgICBpbmplY3Rvci5nZXQobnVsbClcbiAgLy8gICB9KS50b1Rocm93RXJyb3IoL0ludmFsaWQgdG9rZW4gXCJudWxsXCIgcmVxdWVzdGVkIS8pXG5cbiAgLy8gICBleHBlY3QoZnVuY3Rpb24oKSB7XG4gIC8vICAgICBpbmplY3Rvci5nZXQodW5kZWZpbmVkKVxuICAvLyAgIH0pLnRvVGhyb3dFcnJvcigvSW52YWxpZCB0b2tlbiBcInVuZGVmaW5lZFwiIHJlcXVlc3RlZCEvKVxuICAvLyB9KVxuXG4gIC8vIHJlZ3Jlc3Npb25cbiAgLy8gaXQoJ3Nob3VsZCBzaG93IHRoZSBmdWxsIHBhdGggd2hlbiBudWxsL3VuZGVmaW5lZCB0b2tlbiByZXF1ZXN0ZWQnLCBmdW5jdGlvbigpIHtcbiAgLy8gICBjbGFzcyBGb28ge31cbiAgLy8gICBhbm5vdGF0ZShGb28sIG5ldyBJbmplY3QodW5kZWZpbmVkKSlcblxuICAvLyAgIGNsYXNzIEJhciB7fVxuICAvLyAgIGFubm90YXRlKEJhciwgbmV3IEluamVjdChudWxsKSlcblxuICAvLyAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpXG5cbiAgLy8gICBleHBlY3QoZnVuY3Rpb24oKSB7XG4gIC8vICAgICBpbmplY3Rvci5nZXQoRm9vKVxuICAvLyAgIH0pLnRvVGhyb3dFcnJvcigvSW52YWxpZCB0b2tlbiBcInVuZGVmaW5lZFwiIHJlcXVlc3RlZCEgXFwoRm9vIC0+IHVuZGVmaW5lZFxcKS8pXG5cbiAgLy8gICBleHBlY3QoZnVuY3Rpb24oKSB7XG4gIC8vICAgICBpbmplY3Rvci5nZXQoQmFyKVxuICAvLyAgIH0pLnRvVGhyb3dFcnJvcigvSW52YWxpZCB0b2tlbiBcIm51bGxcIiByZXF1ZXN0ZWQhIFxcKEJhciAtPiBudWxsXFwpLylcbiAgLy8gfSlcblxuICBpdCgnc2hvdWxkIHByb3ZpZGUgaXRzZWxmJywgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcblxuICAgIGV4cGVjdChpbmplY3Rvci5nZXQoSW5qZWN0b3IpKS50b0JlKGluamVjdG9yKVxuICB9KVxuXG4gIGRlc2NyaWJlKCd0cmFuc2llbnQnLCBmdW5jdGlvbigpIHtcblxuICAgIGl0KCdzaG91bGQgbmV2ZXIgY2FjaGUnLCBmdW5jdGlvbigpIHtcbiAgICAgIGNsYXNzIEZvbyB7fVxuICAgICAgYW5ub3RhdGUoRm9vLCBuZXcgVHJhbnNpZW50U2NvcGUpXG5cbiAgICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpXG4gICAgICBleHBlY3QoaW5qZWN0b3IuZ2V0KEZvbykpLm5vdC50b0JlKGluamVjdG9yLmdldChGb28pKVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGFsd2F5cyB1c2UgZGVwZW5kZW5jaWVzIChkZWZhdWx0IHByb3ZpZGVycykgZnJvbSB0aGUgeW91bmdlc3QgaW5qZWN0b3InLCBmdW5jdGlvbigpIHtcbiAgICAgIGNsYXNzIEZvbyB7fVxuICAgICAgYW5ub3RhdGUoRm9vLCBuZXcgSW5qZWN0KVxuXG4gICAgICBAVHJhbnNpZW50U2NvcGVcbiAgICAgIEBJbmplY3QoRm9vKVxuICAgICAgY2xhc3MgQWx3YXlzTmV3SW5zdGFuY2Uge1xuICAgICAgICBjb25zdHJ1Y3Rvcihmb28pIHtcbiAgICAgICAgICB0aGlzLmZvbyA9IGZvb1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBhbm5vdGF0ZShBbHdheXNOZXdJbnN0YW5jZSwgbmV3IFRyYW5zaWVudFNjb3BlKVxuICAgICAgYW5ub3RhdGUoQWx3YXlzTmV3SW5zdGFuY2UsIG5ldyBJbmplY3QoRm9vKSlcblxuICAgICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcbiAgICAgIHZhciBjaGlsZCA9IGluamVjdG9yLmNyZWF0ZUNoaWxkKFtGb29dKSAvLyBmb3JjZSBuZXcgaW5zdGFuY2Ugb2YgRm9vXG5cbiAgICAgIHZhciBmb29Gcm9tQ2hpbGQgPSBjaGlsZC5nZXQoRm9vKVxuICAgICAgdmFyIGZvb0Zyb21QYXJlbnQgPSBpbmplY3Rvci5nZXQoRm9vKVxuXG4gICAgICB2YXIgYWx3YXlzTmV3MSA9IGNoaWxkLmdldChBbHdheXNOZXdJbnN0YW5jZSlcbiAgICAgIHZhciBhbHdheXNOZXcyID0gY2hpbGQuZ2V0KEFsd2F5c05ld0luc3RhbmNlKVxuICAgICAgdmFyIGFsd2F5c05ld0Zyb21QYXJlbnQgPSBpbmplY3Rvci5nZXQoQWx3YXlzTmV3SW5zdGFuY2UpXG5cbiAgICAgIGV4cGVjdChhbHdheXNOZXcxLmZvbykudG9CZShmb29Gcm9tQ2hpbGQpXG4gICAgICBleHBlY3QoYWx3YXlzTmV3Mi5mb28pLnRvQmUoZm9vRnJvbUNoaWxkKVxuICAgICAgZXhwZWN0KGFsd2F5c05ld0Zyb21QYXJlbnQuZm9vKS50b0JlKGZvb0Zyb21QYXJlbnQpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgYWx3YXlzIHVzZSBkZXBlbmRlbmNpZXMgZnJvbSB0aGUgeW91bmdlc3QgaW5qZWN0b3InLCBmdW5jdGlvbigpIHtcbiAgICAgIGNsYXNzIEZvbyB7fVxuICAgICAgYW5ub3RhdGUoRm9vLCBuZXcgSW5qZWN0KVxuXG4gICAgICBjbGFzcyBBbHdheXNOZXdJbnN0YW5jZSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGZvbykge1xuICAgICAgICAgIHRoaXMuZm9vID0gZm9vXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFubm90YXRlKEFsd2F5c05ld0luc3RhbmNlLCBuZXcgVHJhbnNpZW50U2NvcGUpXG4gICAgICBhbm5vdGF0ZShBbHdheXNOZXdJbnN0YW5jZSwgbmV3IEluamVjdChGb28pKVxuXG4gICAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoW0Fsd2F5c05ld0luc3RhbmNlXSlcbiAgICAgIHZhciBjaGlsZCA9IGluamVjdG9yLmNyZWF0ZUNoaWxkKFtGb29dKSAvLyBmb3JjZSBuZXcgaW5zdGFuY2Ugb2YgRm9vXG5cbiAgICAgIHZhciBmb29Gcm9tQ2hpbGQgPSBjaGlsZC5nZXQoRm9vKVxuICAgICAgdmFyIGZvb0Zyb21QYXJlbnQgPSBpbmplY3Rvci5nZXQoRm9vKVxuXG4gICAgICB2YXIgYWx3YXlzTmV3MSA9IGNoaWxkLmdldChBbHdheXNOZXdJbnN0YW5jZSlcbiAgICAgIHZhciBhbHdheXNOZXcyID0gY2hpbGQuZ2V0KEFsd2F5c05ld0luc3RhbmNlKVxuICAgICAgdmFyIGFsd2F5c05ld0Zyb21QYXJlbnQgPSBpbmplY3Rvci5nZXQoQWx3YXlzTmV3SW5zdGFuY2UpXG5cbiAgICAgIGV4cGVjdChhbHdheXNOZXcxLmZvbykudG9CZShmb29Gcm9tQ2hpbGQpXG4gICAgICBleHBlY3QoYWx3YXlzTmV3Mi5mb28pLnRvQmUoZm9vRnJvbUNoaWxkKVxuICAgICAgZXhwZWN0KGFsd2F5c05ld0Zyb21QYXJlbnQuZm9vKS50b0JlKGZvb0Zyb21QYXJlbnQpXG4gICAgfSlcbiAgfSlcblxuXG4gIGRlc2NyaWJlKCdjaGlsZCcsIGZ1bmN0aW9uKCkge1xuXG4gICAgaXQoJ3Nob3VsZCBsb2FkIGluc3RhbmNlcyBmcm9tIHBhcmVudCBpbmplY3RvcicsIGZ1bmN0aW9uKCkge1xuICAgICAgY2xhc3MgQ2FyIHtcbiAgICAgICAgc3RhcnQoKSB7fVxuICAgICAgfVxuXG4gICAgICB2YXIgcGFyZW50ID0gbmV3IEluamVjdG9yKFtDYXJdKVxuICAgICAgdmFyIGNoaWxkID0gcGFyZW50LmNyZWF0ZUNoaWxkKFtdKVxuXG4gICAgICB2YXIgY2FyRnJvbVBhcmVudCA9IHBhcmVudC5nZXQoQ2FyKVxuICAgICAgdmFyIGNhckZyb21DaGlsZCA9IGNoaWxkLmdldChDYXIpXG5cbiAgICAgIGV4cGVjdChjYXJGcm9tQ2hpbGQpLnRvQmUoY2FyRnJvbVBhcmVudClcbiAgICB9KVxuXG5cbiAgICBpdCgnc2hvdWxkIGNyZWF0ZSBuZXcgaW5zdGFuY2UgaW4gYSBjaGlsZCBpbmplY3RvcicsIGZ1bmN0aW9uKCkge1xuICAgICAgY2xhc3MgQ2FyIHtcbiAgICAgICAgc3RhcnQoKSB7fVxuICAgICAgfVxuXG4gICAgICBjbGFzcyBNb2NrQ2FyIHtcbiAgICAgICAgc3RhcnQoKSB7fVxuICAgICAgfVxuICAgICAgYW5ub3RhdGUoTW9ja0NhciwgbmV3IFByb3ZpZGUoQ2FyKSlcblxuICAgICAgdmFyIHBhcmVudCA9IG5ldyBJbmplY3RvcihbQ2FyXSlcbiAgICAgIHZhciBjaGlsZCA9IHBhcmVudC5jcmVhdGVDaGlsZChbTW9ja0Nhcl0pXG5cbiAgICAgIHZhciBjYXJGcm9tUGFyZW50ID0gcGFyZW50LmdldChDYXIpXG4gICAgICB2YXIgY2FyRnJvbUNoaWxkID0gY2hpbGQuZ2V0KENhcilcblxuICAgICAgZXhwZWN0KGNhckZyb21QYXJlbnQpLm5vdC50b0JlKGNhckZyb21DaGlsZClcbiAgICAgIC8vIGV4cGVjdChjYXJGcm9tQ2hpbGQpLnRvQmVJbnN0YW5jZU9mKE1vY2tDYXIpXG4gICAgfSlcblxuXG4gICAgaXQoJ3Nob3VsZCBmb3JjZSBuZXcgaW5zdGFuY2VzIGJ5IGFubm90YXRpb24nLCBmdW5jdGlvbigpIHtcbiAgICAgIGNsYXNzIFJvdXRlU2NvcGUge31cblxuICAgICAgY2xhc3MgRW5naW5lIHtcbiAgICAgICAgc3RhcnQoKSB7fVxuICAgICAgfVxuXG4gICAgICBjbGFzcyBDYXIge1xuICAgICAgICBjb25zdHJ1Y3RvcihlbmdpbmUpIHtcbiAgICAgICAgICB0aGlzLmVuZ2luZSA9IGVuZ2luZVxuICAgICAgICB9XG5cbiAgICAgICAgc3RhcnQoKSB7fVxuICAgICAgfVxuICAgICAgYW5ub3RhdGUoQ2FyLCBuZXcgUm91dGVTY29wZSlcbiAgICAgIGFubm90YXRlKENhciwgbmV3IEluamVjdChFbmdpbmUpKVxuXG4gICAgICB2YXIgcGFyZW50ID0gbmV3IEluamVjdG9yKFtDYXIsIEVuZ2luZV0pXG4gICAgICB2YXIgY2hpbGQgPSBwYXJlbnQuY3JlYXRlQ2hpbGQoW10sIFtSb3V0ZVNjb3BlXSlcblxuICAgICAgdmFyIGNhckZyb21QYXJlbnQgPSBwYXJlbnQuZ2V0KENhcilcbiAgICAgIHZhciBjYXJGcm9tQ2hpbGQgPSBjaGlsZC5nZXQoQ2FyKVxuXG4gICAgICBleHBlY3QoY2FyRnJvbUNoaWxkKS5ub3QudG9CZShjYXJGcm9tUGFyZW50KVxuICAgICAgZXhwZWN0KGNhckZyb21DaGlsZC5lbmdpbmUpLnRvQmUoY2FyRnJvbVBhcmVudC5lbmdpbmUpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgZm9yY2UgbmV3IGluc3RhbmNlcyBieSBhbm5vdGF0aW9uIHVzaW5nIG92ZXJyaWRkZW4gcHJvdmlkZXInLCBmdW5jdGlvbigpIHtcbiAgICAgIGNsYXNzIFJvdXRlU2NvcGUge31cblxuICAgICAgY2xhc3MgRW5naW5lIHtcbiAgICAgICAgc3RhcnQoKSB7fVxuICAgICAgfVxuXG4gICAgICBAUm91dGVTY29wZVxuICAgICAgQFByb3ZpZGUoRW5naW5lKVxuICAgICAgY2xhc3MgTW9ja0VuZ2luZSB7XG4gICAgICAgIHN0YXJ0KCkge31cbiAgICAgIH1cbiAgICAgIGFubm90YXRlKE1vY2tFbmdpbmUsIG5ldyBSb3V0ZVNjb3BlKVxuICAgICAgYW5ub3RhdGUoTW9ja0VuZ2luZSwgbmV3IFByb3ZpZGUoRW5naW5lKSlcblxuICAgICAgdmFyIHBhcmVudCA9IG5ldyBJbmplY3RvcihbTW9ja0VuZ2luZV0pXG4gICAgICB2YXIgY2hpbGRBID0gcGFyZW50LmNyZWF0ZUNoaWxkKFtdLCBbUm91dGVTY29wZV0pXG4gICAgICB2YXIgY2hpbGRCID0gcGFyZW50LmNyZWF0ZUNoaWxkKFtdLCBbUm91dGVTY29wZV0pXG5cbiAgICAgIHZhciBlbmdpbmVGcm9tQSA9IGNoaWxkQS5nZXQoRW5naW5lKVxuICAgICAgdmFyIGVuZ2luZUZyb21CID0gY2hpbGRCLmdldChFbmdpbmUpXG5cbiAgICAgIGV4cGVjdChlbmdpbmVGcm9tQSkubm90LnRvQmUoZW5naW5lRnJvbUIpXG4gICAgICAvLyBleHBlY3QoZW5naW5lRnJvbUEpLnRvQmVJbnN0YW5jZU9mKE1vY2tFbmdpbmUpXG4gICAgICAvLyBleHBlY3QoZW5naW5lRnJvbUIpLnRvQmVJbnN0YW5jZU9mKE1vY2tFbmdpbmUpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgZm9yY2UgbmV3IGluc3RhbmNlIGJ5IGFubm90YXRpb24gdXNpbmcgdGhlIGxvd2VzdCBvdmVycmlkZGVuIHByb3ZpZGVyJywgZnVuY3Rpb24oKSB7XG4gICAgICBjbGFzcyBSb3V0ZVNjb3BlIHt9XG5cbiAgICAgIGNsYXNzIEVuZ2luZSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKCkge31cbiAgICAgICAgc3RhcnQoKSB7fVxuICAgICAgfVxuICAgICAgYW5ub3RhdGUoRW5naW5lLCBuZXcgUm91dGVTY29wZSlcblxuICAgICAgY2xhc3MgTW9ja0VuZ2luZSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKCkge31cbiAgICAgICAgc3RhcnQoKSB7fVxuICAgICAgfVxuICAgICAgYW5ub3RhdGUoTW9ja0VuZ2luZSwgbmV3IFByb3ZpZGUoRW5naW5lKSlcbiAgICAgIGFubm90YXRlKE1vY2tFbmdpbmUsIG5ldyBSb3V0ZVNjb3BlKVxuXG4gICAgICBjbGFzcyBEb3VibGVNb2NrRW5naW5lIHtcbiAgICAgICAgc3RhcnQoKSB7fVxuICAgICAgfVxuICAgICAgYW5ub3RhdGUoRG91YmxlTW9ja0VuZ2luZSwgbmV3IFByb3ZpZGUoRW5naW5lKSlcbiAgICAgIGFubm90YXRlKERvdWJsZU1vY2tFbmdpbmUsIG5ldyBSb3V0ZVNjb3BlKVxuXG4gICAgICB2YXIgcGFyZW50ID0gbmV3IEluamVjdG9yKFtFbmdpbmVdKVxuICAgICAgdmFyIGNoaWxkID0gcGFyZW50LmNyZWF0ZUNoaWxkKFtNb2NrRW5naW5lXSlcbiAgICAgIHZhciBncmFudENoaWxkID0gY2hpbGQuY3JlYXRlQ2hpbGQoW10sIFtSb3V0ZVNjb3BlXSlcblxuICAgICAgdmFyIGVuZ2luZUZyb21QYXJlbnQgPSBwYXJlbnQuZ2V0KEVuZ2luZSlcbiAgICAgIHZhciBlbmdpbmVGcm9tQ2hpbGQgPSBjaGlsZC5nZXQoRW5naW5lKVxuICAgICAgdmFyIGVuZ2luZUZyb21HcmFudENoaWxkID0gZ3JhbnRDaGlsZC5nZXQoRW5naW5lKVxuXG4gICAgICAvLyBleHBlY3QoZW5naW5lRnJvbVBhcmVudCkudG9CZUluc3RhbmNlT2YoRW5naW5lKVxuICAgICAgLy8gZXhwZWN0KGVuZ2luZUZyb21DaGlsZCkudG9CZUluc3RhbmNlT2YoTW9ja0VuZ2luZSlcbiAgICAgIC8vIGV4cGVjdChlbmdpbmVGcm9tR3JhbnRDaGlsZCkudG9CZUluc3RhbmNlT2YoTW9ja0VuZ2luZSlcbiAgICAgIGV4cGVjdChlbmdpbmVGcm9tR3JhbnRDaGlsZCkubm90LnRvQmUoZW5naW5lRnJvbUNoaWxkKVxuICAgIH0pXG5cbiAgICAvLyBpdCgnc2hvdWxkIHNob3cgdGhlIGZ1bGwgcGF0aCB3aGVuIG5vIHByb3ZpZGVyJywgZnVuY3Rpb24oKSB7XG4gICAgLy8gICB2YXIgcGFyZW50ID0gbmV3IEluamVjdG9yKGhvdXNlTW9kdWxlKVxuICAgIC8vICAgdmFyIGNoaWxkID0gcGFyZW50LmNyZWF0ZUNoaWxkKHNoaW55SG91c2VNb2R1bGUpXG5cbiAgICAvLyAgIGV4cGVjdCgoKSA9PiBjaGlsZC5nZXQoJ0hvdXNlJykpXG4gICAgLy8gICAgICAgLnRvVGhyb3dFcnJvcignTm8gcHJvdmlkZXIgZm9yIFNpbmshIChIb3VzZSAtPiBLaXRjaGVuIC0+IFNpbmspJylcbiAgICAvLyB9KVxuXG4gICAgaXQoJ3Nob3VsZCBwcm92aWRlIGl0c2VsZicsIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHBhcmVudCA9IG5ldyBJbmplY3RvcigpXG4gICAgICB2YXIgY2hpbGQgPSBwYXJlbnQuY3JlYXRlQ2hpbGQoW10pXG5cbiAgICAgIGV4cGVjdChjaGlsZC5nZXQoSW5qZWN0b3IpKS50b0JlKGNoaWxkKVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGNhY2hlIGRlZmF1bHQgcHJvdmlkZXIgaW4gcGFyZW50IGluamVjdG9yJywgZnVuY3Rpb24oKSB7XG4gICAgICBjbGFzcyBGb28ge31cbiAgICAgIGFubm90YXRlKEZvbywgbmV3IEluamVjdClcblxuICAgICAgdmFyIHBhcmVudCA9IG5ldyBJbmplY3RvcigpXG4gICAgICB2YXIgY2hpbGQgPSBwYXJlbnQuY3JlYXRlQ2hpbGQoW10pXG5cbiAgICAgIHZhciBmb29Gcm9tQ2hpbGQgPSBjaGlsZC5nZXQoRm9vKVxuICAgICAgdmFyIGZvb0Zyb21QYXJlbnQgPSBwYXJlbnQuZ2V0KEZvbylcblxuICAgICAgZXhwZWN0KGZvb0Zyb21QYXJlbnQpLnRvQmUoZm9vRnJvbUNoaWxkKVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGZvcmNlIG5ldyBpbnN0YW5jZSBieSBhbm5vdGF0aW9uIGZvciBkZWZhdWx0IHByb3ZpZGVyJywgZnVuY3Rpb24oKSB7XG4gICAgICBjbGFzcyBSZXF1ZXN0U2NvcGUge31cblxuICAgICAgY2xhc3MgRm9vIHt9XG4gICAgICBhbm5vdGF0ZShGb28sIG5ldyBJbmplY3QpXG4gICAgICBhbm5vdGF0ZShGb28sIG5ldyBSZXF1ZXN0U2NvcGUpXG5cbiAgICAgIHZhciBwYXJlbnQgPSBuZXcgSW5qZWN0b3IoKVxuICAgICAgdmFyIGNoaWxkID0gcGFyZW50LmNyZWF0ZUNoaWxkKFtdLCBbUmVxdWVzdFNjb3BlXSlcblxuICAgICAgdmFyIGZvb0Zyb21DaGlsZCA9IGNoaWxkLmdldChGb28pXG4gICAgICB2YXIgZm9vRnJvbVBhcmVudCA9IHBhcmVudC5nZXQoRm9vKVxuXG4gICAgICBleHBlY3QoZm9vRnJvbVBhcmVudCkubm90LnRvQmUoZm9vRnJvbUNoaWxkKVxuICAgIH0pXG4gIH0pXG5cblxuICBkZXNjcmliZSgnbGF6eScsIGZ1bmN0aW9uKCkge1xuXG4gICAgaXQoJ3Nob3VsZCBpbnN0YW50aWF0ZSBsYXppbHknLCBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjb25zdHJ1Y3RvclNweSA9IGphc21pbmUuY3JlYXRlU3B5KCdjb25zdHJ1Y3RvcicpXG5cbiAgICAgIGNsYXNzIEV4cGVuc2l2ZUVuZ2luZSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgIGNvbnN0cnVjdG9yU3B5KClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjbGFzcyBDYXIge1xuICAgICAgICBjb25zdHJ1Y3RvcihjcmVhdGVFbmdpbmUpIHtcbiAgICAgICAgICB0aGlzLmVuZ2luZSA9IG51bGxcbiAgICAgICAgICB0aGlzLmNyZWF0ZUVuZ2luZSA9IGNyZWF0ZUVuZ2luZVxuICAgICAgICB9XG5cbiAgICAgICAgc3RhcnQoKSB7XG4gICAgICAgICAgdGhpcy5lbmdpbmUgPSB0aGlzLmNyZWF0ZUVuZ2luZSgpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFubm90YXRlKENhciwgbmV3IEluamVjdExhenkoRXhwZW5zaXZlRW5naW5lKSlcblxuICAgICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcbiAgICAgIHZhciBjYXIgPSBpbmplY3Rvci5nZXQoQ2FyKVxuXG4gICAgICBleHBlY3QoY29uc3RydWN0b3JTcHkpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKClcblxuICAgICAgY2FyLnN0YXJ0KClcbiAgICAgIGV4cGVjdChjb25zdHJ1Y3RvclNweSkudG9IYXZlQmVlbkNhbGxlZCgpXG4gICAgICAvLyBleHBlY3QoY2FyLmVuZ2luZSkudG9CZUluc3RhbmNlT2YoRXhwZW5zaXZlRW5naW5lKVxuICAgIH0pXG5cbiAgICAvLyByZWdyZXNzaW9uXG4gICAgaXQoJ3Nob3VsZCBpbnN0YW50aWF0ZSBsYXppbHkgZnJvbSBhIHBhcmVudCBpbmplY3RvcicsIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGNvbnN0cnVjdG9yU3B5ID0gamFzbWluZS5jcmVhdGVTcHkoJ2NvbnN0cnVjdG9yJylcblxuICAgICAgY2xhc3MgRXhwZW5zaXZlRW5naW5lIHtcbiAgICAgICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgICAgY29uc3RydWN0b3JTcHkoKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNsYXNzIENhciB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGNyZWF0ZUVuZ2luZSkge1xuICAgICAgICAgIHRoaXMuZW5naW5lID0gbnVsbFxuICAgICAgICAgIHRoaXMuY3JlYXRlRW5naW5lID0gY3JlYXRlRW5naW5lXG4gICAgICAgIH1cblxuICAgICAgICBzdGFydCgpIHtcbiAgICAgICAgICB0aGlzLmVuZ2luZSA9IHRoaXMuY3JlYXRlRW5naW5lKClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYW5ub3RhdGUoQ2FyLCBuZXcgSW5qZWN0TGF6eShFeHBlbnNpdmVFbmdpbmUpKVxuXG4gICAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoW0V4cGVuc2l2ZUVuZ2luZV0pXG4gICAgICB2YXIgY2hpbGRJbmplY3RvciA9IGluamVjdG9yLmNyZWF0ZUNoaWxkKFtDYXJdKVxuICAgICAgdmFyIGNhciA9IGNoaWxkSW5qZWN0b3IuZ2V0KENhcilcblxuICAgICAgZXhwZWN0KGNvbnN0cnVjdG9yU3B5KS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpXG5cbiAgICAgIGNhci5zdGFydCgpXG4gICAgICBleHBlY3QoY29uc3RydWN0b3JTcHkpLnRvSGF2ZUJlZW5DYWxsZWQoKVxuICAgICAgLy8gZXhwZWN0KGNhci5lbmdpbmUpLnRvQmVJbnN0YW5jZU9mKEV4cGVuc2l2ZUVuZ2luZSlcbiAgICB9KVxuXG4gICAgZGVzY3JpYmUoJ3dpdGggbG9jYWxzJywgZnVuY3Rpb24oKSB7XG4gICAgICBpdCgnc2hvdWxkIGFsd2F5cyBjcmVhdGUgYSBuZXcgaW5zdGFuY2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNvbnN0cnVjdG9yU3B5ID0gamFzbWluZS5jcmVhdGVTcHkoJ2NvbnN0cnVjdG9yJylcblxuICAgICAgICBjbGFzcyBFeHBlbnNpdmVFbmdpbmUge1xuICAgICAgICAgIGNvbnN0cnVjdG9yKHBvd2VyKSB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvclNweSgpXG4gICAgICAgICAgICB0aGlzLnBvd2VyID0gcG93ZXJcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYW5ub3RhdGUoRXhwZW5zaXZlRW5naW5lLCBuZXcgVHJhbnNpZW50U2NvcGUpXG4gICAgICAgIGFubm90YXRlKEV4cGVuc2l2ZUVuZ2luZSwgbmV3IEluamVjdCgncG93ZXInKSlcblxuICAgICAgICBjbGFzcyBDYXIge1xuICAgICAgICAgIGNvbnN0cnVjdG9yKGNyZWF0ZUVuZ2luZSkge1xuICAgICAgICAgICAgdGhpcy5jcmVhdGVFbmdpbmUgPSBjcmVhdGVFbmdpbmVcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYW5ub3RhdGUoQ2FyLCBuZXcgSW5qZWN0TGF6eShFeHBlbnNpdmVFbmdpbmUpKVxuXG4gICAgICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpXG4gICAgICAgIHZhciBjYXIgPSBpbmplY3Rvci5nZXQoQ2FyKVxuXG4gICAgICAgIHZhciB2ZXlyb25FbmdpbmUgPSBjYXIuY3JlYXRlRW5naW5lKCdwb3dlcicsIDExODQpXG4gICAgICAgIHZhciBtdXN0YW5nRW5naW5lID0gY2FyLmNyZWF0ZUVuZ2luZSgncG93ZXInLCA0MjApXG5cbiAgICAgICAgZXhwZWN0KHZleXJvbkVuZ2luZSkubm90LnRvQmUobXVzdGFuZ0VuZ2luZSlcbiAgICAgICAgZXhwZWN0KHZleXJvbkVuZ2luZS5wb3dlcikudG9CZSgxMTg0KVxuICAgICAgICBleHBlY3QobXVzdGFuZ0VuZ2luZS5wb3dlcikudG9CZSg0MjApXG5cbiAgICAgICAgdmFyIG11c3RhbmdFbmdpbmUyID0gY2FyLmNyZWF0ZUVuZ2luZSgncG93ZXInLCA0MjApXG4gICAgICAgIGV4cGVjdChtdXN0YW5nRW5naW5lKS5ub3QudG9CZShtdXN0YW5nRW5naW5lMilcbiAgICAgIH0pXG4gICAgfSlcbiAgfSlcbn0pXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=