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
var InjectLazy = require('../index').InjectLazy;
var Provide = require('../index').Provide;
var SuperConstructor = require('../index').SuperConstructor;
var TransientScope = require('../index').TransientScope;
var Car = require('../__fixtures__/car').Car;
var CyclicEngine = require('../__fixtures__/car').CyclicEngine;
var houseModule = require('../__fixtures__/house').house;
var shinyHouseModule = require('../__fixtures__/shiny_house').house;


describe("injector", function () {
  it("should instantiate a class without dependencies", function () {
    var Car = (function () {
      var Car = function Car() {};

      Car.prototype.start = function () {};

      return Car;
    })();

    var injector = new Injector();
    var car = injector.get(Car);

    expect(car).toBeInstanceOf(Car);
  });

  it("should resolve dependencies based on @Inject annotation", function () {
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

    annotate(Car, new Inject(Engine));

    var injector = new Injector();
    var car = injector.get(Car);

    expect(car).toBeInstanceOf(Car);
    expect(car.engine).toBeInstanceOf(Engine);
  });

  it("should override providers", function () {
    var Engine = function Engine() {};

    var Car = (function () {
      var Car = function Car(engine) {
        this.engine = engine;
      };

      Car.prototype.start = function () {};

      return Car;
    })();

    annotate(Car, new Inject(Engine));

    var MockEngine = (function () {
      var MockEngine = function MockEngine() {};

      MockEngine.prototype.start = function () {};

      return MockEngine;
    })();

    annotate(MockEngine, new Provide(Engine));

    var injector = new Injector([MockEngine]);
    var car = injector.get(Car);

    expect(car).toBeInstanceOf(Car);
    expect(car.engine).toBeInstanceOf(MockEngine);
  });

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

  it("should throw when no provider defined", function () {
    var injector = new Injector();

    expect(function () {
      return injector.get("NonExisting");
    }).toThrowError("No provider for NonExisting!");
  });

  it("should show the full path when no provider defined", function () {
    var injector = new Injector(houseModule);

    expect(function () {
      return injector.get("House");
    }).toThrowError("No provider for Sink! (House -> Kitchen -> Sink)");
  });

  it("should throw when trying to instantiate a cyclic dependency", function () {
    var injector = new Injector([CyclicEngine]);

    expect(function () {
      return injector.get(Car);
    }).toThrowError("Cannot instantiate cyclic dependency! (Car -> Engine -> Car)");
  });

  it("should show the full path when error happens in a constructor", function () {
    var Engine = function Engine() {
      throw new Error("This engine is broken!");
    };

    var Car = function Car(e) {};

    annotate(Car, new Inject(Engine));

    var injector = new Injector();

    expect(function () {
      return injector.get(Car);
    }).toThrowError(/Error during instantiation of Engine! \(Car -> Engine\)/);
  });

  describe("SuperConstructor", function () {
    it("should support \"super\" to call a parent constructor", function () {
      var Something = function Something() {};

      var Parent = function Parent(something) {
        this.parentSomething = something;
      };

      annotate(Parent, new Inject(Something));

      var Child = (function (Parent) {
        var Child = function Child(superConstructor, something) {
          superConstructor();
          this.childSomething = something;
        };

        _extends(Child, Parent);

        return Child;
      })(Parent);

      annotate(Child, new Inject(SuperConstructor, Something));

      var injector = new Injector();
      var instance = injector.get(Child);

      expect(instance.parentSomething).toBeInstanceOf(Something);
      expect(instance.childSomething).toBeInstanceOf(Something);
      expect(instance.childSomething).toBe(instance.parentSomething);
    });

    it("should support \"super\" to call multiple parent constructors", function () {
      var Foo = function Foo() {};

      var Bar = function Bar() {};

      var Parent = function Parent(foo) {
        this.parentFoo = foo;
      };

      annotate(Parent, new Inject(Foo));

      var Child = (function (Parent) {
        var Child = function Child(superConstructor, foo) {
          superConstructor();
          this.childFoo = foo;
        };

        _extends(Child, Parent);

        return Child;
      })(Parent);

      annotate(Child, new Inject(SuperConstructor, Foo));

      var GrandChild = (function (Child) {
        var GrandChild = function GrandChild(superConstructor, foo, bar) {
          superConstructor();
          this.grandChildBar = bar;
          this.grandChildFoo = foo;
        };

        _extends(GrandChild, Child);

        return GrandChild;
      })(Child);

      annotate(GrandChild, new Inject(SuperConstructor, Foo, Bar));

      var injector = new Injector();
      var instance = injector.get(GrandChild);

      expect(instance.parentFoo).toBeInstanceOf(Foo);
      expect(instance.childFoo).toBeInstanceOf(Foo);
      expect(instance.grandChildFoo).toBeInstanceOf(Foo);
      expect(instance.grandChildBar).toBeInstanceOf(Bar);
    });

    it("should throw an error when used in a factory function", function () {
      var Something = function Something() {};

      annotate(createSomething, new Provide(Something));
      annotate(createSomething, new Inject(SuperConstructor));
      function createSomething() {}

      expect(function () {
        var injector = new Injector([createSomething]);
        injector.get(Something);
      }).toThrowError(/Only classes with a parent can ask for SuperConstructor!/);
    });
  });

  // it('should throw an error when used in a class without any parent', function() {
  //   class WithoutParent {}
  //   annotate(WithoutParent, new Inject(SuperConstructor))

  //   var injector = new Injector()

  //   expect(function() {
  //     injector.get(WithoutParent)
  //   }).toThrowError(/Only classes with a parent can ask for SuperConstructor!/)
  // })

  it("should throw an error when null/undefined token requested", function () {
    var injector = new Injector();

    expect(function () {
      injector.get(null);
    }).toThrowError(/Invalid token "null" requested!/);

    expect(function () {
      injector.get(undefined);
    }).toThrowError(/Invalid token "undefined" requested!/);
  });

  // regression
  it("should show the full path when null/undefined token requested", function () {
    var Foo = function Foo() {};

    annotate(Foo, new Inject(undefined));

    var Bar = function Bar() {};

    annotate(Bar, new Inject(null));

    var injector = new Injector();

    expect(function () {
      injector.get(Foo);
    }).toThrowError(/Invalid token "undefined" requested! \(Foo -> undefined\)/);

    expect(function () {
      injector.get(Bar);
    }).toThrowError(/Invalid token "null" requested! \(Bar -> null\)/);
  });

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
      expect(carFromChild).toBeInstanceOf(MockCar);
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
      expect(engineFromA).toBeInstanceOf(MockEngine);
      expect(engineFromB).toBeInstanceOf(MockEngine);
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

      expect(engineFromParent).toBeInstanceOf(Engine);
      expect(engineFromChild).toBeInstanceOf(MockEngine);
      expect(engineFromGrantChild).toBeInstanceOf(MockEngine);
      expect(engineFromGrantChild).not.toBe(engineFromChild);
    });

    it("should show the full path when no provider", function () {
      var parent = new Injector(houseModule);
      var child = parent.createChild(shinyHouseModule);

      expect(function () {
        return child.get("House");
      }).toThrowError("No provider for Sink! (House -> Kitchen -> Sink)");
    });

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
      expect(car.engine).toBeInstanceOf(ExpensiveEngine);
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
      expect(car.engine).toBeInstanceOf(ExpensiveEngine);
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
//# sourceMappingURL=data:application/json;base64,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Xy9pbmplY3Rvci5qcyIsInNvdXJjZXNDb250ZW50IjpbImplc3QuYXV0b01vY2tPZmYoKVxuaW1wb3J0ICc2dG81L3BvbHlmaWxsJ1xuXG5pbXBvcnQge1xuICBhbm5vdGF0ZSxcbiAgSW5qZWN0b3IsXG4gIEluamVjdCxcbiAgSW5qZWN0TGF6eSxcbiAgUHJvdmlkZSxcbiAgU3VwZXJDb25zdHJ1Y3RvcixcbiAgVHJhbnNpZW50U2NvcGVcbn0gZnJvbSAnLi4vaW5kZXgnXG5cbmltcG9ydCB7Q2FyLCBDeWNsaWNFbmdpbmV9IGZyb20gJy4uL19fZml4dHVyZXNfXy9jYXInXG5pbXBvcnQge2hvdXNlIGFzIGhvdXNlTW9kdWxlfSBmcm9tICcuLi9fX2ZpeHR1cmVzX18vaG91c2UnXG5pbXBvcnQge2hvdXNlIGFzIHNoaW55SG91c2VNb2R1bGV9IGZyb20gJy4uL19fZml4dHVyZXNfXy9zaGlueV9ob3VzZSdcblxuZGVzY3JpYmUoJ2luamVjdG9yJywgZnVuY3Rpb24oKSB7XG5cbiAgaXQoJ3Nob3VsZCBpbnN0YW50aWF0ZSBhIGNsYXNzIHdpdGhvdXQgZGVwZW5kZW5jaWVzJywgZnVuY3Rpb24oKSB7XG4gICAgY2xhc3MgQ2FyIHtcbiAgICAgIGNvbnN0cnVjdG9yKCkge31cbiAgICAgIHN0YXJ0KCkge31cbiAgICB9XG5cbiAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuICAgIHZhciBjYXIgPSBpbmplY3Rvci5nZXQoQ2FyKVxuXG4gICAgZXhwZWN0KGNhcikudG9CZUluc3RhbmNlT2YoQ2FyKVxuICB9KVxuXG4gIGl0KCdzaG91bGQgcmVzb2x2ZSBkZXBlbmRlbmNpZXMgYmFzZWQgb24gQEluamVjdCBhbm5vdGF0aW9uJywgZnVuY3Rpb24oKSB7XG4gICAgY2xhc3MgRW5naW5lIHtcbiAgICAgIHN0YXJ0KCkge31cbiAgICB9XG5cbiAgICBjbGFzcyBDYXIge1xuICAgICAgY29uc3RydWN0b3IoZW5naW5lKSB7XG4gICAgICAgIHRoaXMuZW5naW5lID0gZW5naW5lXG4gICAgICB9XG5cbiAgICAgIHN0YXJ0KCkge31cbiAgICB9XG4gICAgYW5ub3RhdGUoQ2FyLCBuZXcgSW5qZWN0KEVuZ2luZSkpXG5cbiAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuICAgIHZhciBjYXIgPSBpbmplY3Rvci5nZXQoQ2FyKVxuXG4gICAgZXhwZWN0KGNhcikudG9CZUluc3RhbmNlT2YoQ2FyKVxuICAgIGV4cGVjdChjYXIuZW5naW5lKS50b0JlSW5zdGFuY2VPZihFbmdpbmUpXG4gIH0pXG5cbiAgaXQoJ3Nob3VsZCBvdmVycmlkZSBwcm92aWRlcnMnLCBmdW5jdGlvbigpIHtcbiAgICBjbGFzcyBFbmdpbmUge31cblxuICAgIGNsYXNzIENhciB7XG4gICAgICBjb25zdHJ1Y3RvcihlbmdpbmUpIHtcbiAgICAgICAgdGhpcy5lbmdpbmUgPSBlbmdpbmVcbiAgICAgIH1cblxuICAgICAgc3RhcnQoKSB7fVxuICAgIH1cbiAgICBhbm5vdGF0ZShDYXIsIG5ldyBJbmplY3QoRW5naW5lKSlcblxuICAgIGNsYXNzIE1vY2tFbmdpbmUge1xuICAgICAgc3RhcnQoKSB7fVxuICAgIH1cbiAgICBhbm5vdGF0ZShNb2NrRW5naW5lLCBuZXcgUHJvdmlkZShFbmdpbmUpKVxuXG4gICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKFtNb2NrRW5naW5lXSlcbiAgICB2YXIgY2FyID0gaW5qZWN0b3IuZ2V0KENhcilcblxuICAgIGV4cGVjdChjYXIpLnRvQmVJbnN0YW5jZU9mKENhcilcbiAgICBleHBlY3QoY2FyLmVuZ2luZSkudG9CZUluc3RhbmNlT2YoTW9ja0VuZ2luZSlcbiAgfSlcblxuICBpdCgnc2hvdWxkIGFsbG93IGZhY3RvcnkgZnVuY3Rpb24nLCBmdW5jdGlvbigpIHtcbiAgICBjbGFzcyBTaXplIHt9XG5cbiAgICBhbm5vdGF0ZShjb21wdXRlU2l6ZSwgbmV3IFByb3ZpZGUoU2l6ZSkpXG4gICAgZnVuY3Rpb24gY29tcHV0ZVNpemUoKSB7XG4gICAgICByZXR1cm4gMFxuICAgIH1cblxuICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcihbY29tcHV0ZVNpemVdKVxuICAgIHZhciBzaXplID0gaW5qZWN0b3IuZ2V0KFNpemUpXG5cbiAgICBleHBlY3Qoc2l6ZSkudG9CZSgwKVxuICB9KVxuXG4gIGl0KCdzaG91bGQgY2FjaGUgaW5zdGFuY2VzJywgZnVuY3Rpb24oKSB7XG4gICAgY2xhc3MgQ2FyIHt9XG5cbiAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuICAgIHZhciBjYXIgPSBpbmplY3Rvci5nZXQoQ2FyKVxuXG4gICAgZXhwZWN0KGluamVjdG9yLmdldChDYXIpKS50b0JlKGNhcilcbiAgfSlcblxuICBpdCgnc2hvdWxkIHRocm93IHdoZW4gbm8gcHJvdmlkZXIgZGVmaW5lZCcsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpXG5cbiAgICBleHBlY3QoKCkgPT4gaW5qZWN0b3IuZ2V0KCdOb25FeGlzdGluZycpKVxuICAgICAgICAudG9UaHJvd0Vycm9yKCdObyBwcm92aWRlciBmb3IgTm9uRXhpc3RpbmchJylcbiAgfSlcblxuICBpdCgnc2hvdWxkIHNob3cgdGhlIGZ1bGwgcGF0aCB3aGVuIG5vIHByb3ZpZGVyIGRlZmluZWQnLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoaG91c2VNb2R1bGUpXG5cbiAgICBleHBlY3QoKCkgPT4gaW5qZWN0b3IuZ2V0KCdIb3VzZScpKVxuICAgICAgICAudG9UaHJvd0Vycm9yKCdObyBwcm92aWRlciBmb3IgU2luayEgKEhvdXNlIC0+IEtpdGNoZW4gLT4gU2luayknKVxuICB9KVxuXG4gIGl0KCdzaG91bGQgdGhyb3cgd2hlbiB0cnlpbmcgdG8gaW5zdGFudGlhdGUgYSBjeWNsaWMgZGVwZW5kZW5jeScsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcihbQ3ljbGljRW5naW5lXSlcblxuICAgIGV4cGVjdCgoKSA9PiBpbmplY3Rvci5nZXQoQ2FyKSlcbiAgICAgICAgLnRvVGhyb3dFcnJvcignQ2Fubm90IGluc3RhbnRpYXRlIGN5Y2xpYyBkZXBlbmRlbmN5ISAoQ2FyIC0+IEVuZ2luZSAtPiBDYXIpJylcbiAgfSlcblxuICBpdCgnc2hvdWxkIHNob3cgdGhlIGZ1bGwgcGF0aCB3aGVuIGVycm9yIGhhcHBlbnMgaW4gYSBjb25zdHJ1Y3RvcicsIGZ1bmN0aW9uKCkge1xuICAgIGNsYXNzIEVuZ2luZSB7XG4gICAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGlzIGVuZ2luZSBpcyBicm9rZW4hJylcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjbGFzcyBDYXIge1xuICAgICAgY29uc3RydWN0b3IoZSkge31cbiAgICB9XG4gICAgYW5ub3RhdGUoQ2FyLCBuZXcgSW5qZWN0KEVuZ2luZSkpXG5cbiAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuXG4gICAgZXhwZWN0KCgpID0+IGluamVjdG9yLmdldChDYXIpKVxuICAgICAgLnRvVGhyb3dFcnJvcigvRXJyb3IgZHVyaW5nIGluc3RhbnRpYXRpb24gb2YgRW5naW5lISBcXChDYXIgLT4gRW5naW5lXFwpLylcbiAgfSlcblxuICBkZXNjcmliZSgnU3VwZXJDb25zdHJ1Y3RvcicsIGZ1bmN0aW9uICgpIHtcblxuICAgIGl0KCdzaG91bGQgc3VwcG9ydCBcInN1cGVyXCIgdG8gY2FsbCBhIHBhcmVudCBjb25zdHJ1Y3RvcicsIGZ1bmN0aW9uKCkge1xuICAgICAgY2xhc3MgU29tZXRoaW5nIHt9XG5cbiAgICAgIGNsYXNzIFBhcmVudCB7XG4gICAgICAgIGNvbnN0cnVjdG9yKHNvbWV0aGluZykge1xuICAgICAgICAgIHRoaXMucGFyZW50U29tZXRoaW5nID0gc29tZXRoaW5nXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFubm90YXRlKFBhcmVudCwgbmV3IEluamVjdChTb21ldGhpbmcpKVxuXG4gICAgICBjbGFzcyBDaGlsZCBleHRlbmRzIFBhcmVudCB7XG4gICAgICAgIGNvbnN0cnVjdG9yKHN1cGVyQ29uc3RydWN0b3IsIHNvbWV0aGluZykge1xuICAgICAgICAgIHN1cGVyQ29uc3RydWN0b3IoKVxuICAgICAgICAgIHRoaXMuY2hpbGRTb21ldGhpbmcgPSBzb21ldGhpbmdcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBhbm5vdGF0ZShDaGlsZCwgbmV3IEluamVjdChTdXBlckNvbnN0cnVjdG9yLCBTb21ldGhpbmcpKVxuXG4gICAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuICAgICAgdmFyIGluc3RhbmNlID0gaW5qZWN0b3IuZ2V0KENoaWxkKVxuXG4gICAgICBleHBlY3QoaW5zdGFuY2UucGFyZW50U29tZXRoaW5nKS50b0JlSW5zdGFuY2VPZihTb21ldGhpbmcpXG4gICAgICBleHBlY3QoaW5zdGFuY2UuY2hpbGRTb21ldGhpbmcpLnRvQmVJbnN0YW5jZU9mKFNvbWV0aGluZylcbiAgICAgIGV4cGVjdChpbnN0YW5jZS5jaGlsZFNvbWV0aGluZykudG9CZShpbnN0YW5jZS5wYXJlbnRTb21ldGhpbmcpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgc3VwcG9ydCBcInN1cGVyXCIgdG8gY2FsbCBtdWx0aXBsZSBwYXJlbnQgY29uc3RydWN0b3JzJywgZnVuY3Rpb24oKSB7XG4gICAgICBjbGFzcyBGb28ge31cbiAgICAgIGNsYXNzIEJhciB7fVxuXG4gICAgICBjbGFzcyBQYXJlbnQge1xuICAgICAgICBjb25zdHJ1Y3Rvcihmb28pIHtcbiAgICAgICAgICB0aGlzLnBhcmVudEZvbyA9IGZvb1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBhbm5vdGF0ZShQYXJlbnQsIG5ldyBJbmplY3QoRm9vKSlcblxuICAgICAgY2xhc3MgQ2hpbGQgZXh0ZW5kcyBQYXJlbnQge1xuICAgICAgICBjb25zdHJ1Y3RvcihzdXBlckNvbnN0cnVjdG9yLCBmb28pIHtcbiAgICAgICAgICBzdXBlckNvbnN0cnVjdG9yKClcbiAgICAgICAgICB0aGlzLmNoaWxkRm9vID0gZm9vXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFubm90YXRlKENoaWxkLCBuZXcgSW5qZWN0KFN1cGVyQ29uc3RydWN0b3IsIEZvbykpXG5cbiAgICAgIGNsYXNzIEdyYW5kQ2hpbGQgZXh0ZW5kcyBDaGlsZCB7XG4gICAgICAgIGNvbnN0cnVjdG9yKHN1cGVyQ29uc3RydWN0b3IsIGZvbywgYmFyKSB7XG4gICAgICAgICAgc3VwZXJDb25zdHJ1Y3RvcigpXG4gICAgICAgICAgdGhpcy5ncmFuZENoaWxkQmFyID0gYmFyXG4gICAgICAgICAgdGhpcy5ncmFuZENoaWxkRm9vID0gZm9vXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgYW5ub3RhdGUoR3JhbmRDaGlsZCwgbmV3IEluamVjdChTdXBlckNvbnN0cnVjdG9yLCBGb28sIEJhcikpXG5cbiAgICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpXG4gICAgICB2YXIgaW5zdGFuY2UgPSBpbmplY3Rvci5nZXQoR3JhbmRDaGlsZClcblxuICAgICAgZXhwZWN0KGluc3RhbmNlLnBhcmVudEZvbykudG9CZUluc3RhbmNlT2YoRm9vKVxuICAgICAgZXhwZWN0KGluc3RhbmNlLmNoaWxkRm9vKS50b0JlSW5zdGFuY2VPZihGb28pXG4gICAgICBleHBlY3QoaW5zdGFuY2UuZ3JhbmRDaGlsZEZvbykudG9CZUluc3RhbmNlT2YoRm9vKVxuICAgICAgZXhwZWN0KGluc3RhbmNlLmdyYW5kQ2hpbGRCYXIpLnRvQmVJbnN0YW5jZU9mKEJhcilcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCB0aHJvdyBhbiBlcnJvciB3aGVuIHVzZWQgaW4gYSBmYWN0b3J5IGZ1bmN0aW9uJywgZnVuY3Rpb24oKSB7XG4gICAgICBjbGFzcyBTb21ldGhpbmcge31cblxuICAgICAgYW5ub3RhdGUoY3JlYXRlU29tZXRoaW5nLCBuZXcgUHJvdmlkZShTb21ldGhpbmcpKVxuICAgICAgYW5ub3RhdGUoY3JlYXRlU29tZXRoaW5nLCBuZXcgSW5qZWN0KFN1cGVyQ29uc3RydWN0b3IpKVxuICAgICAgZnVuY3Rpb24gY3JlYXRlU29tZXRoaW5nKCkge31cblxuICAgICAgZXhwZWN0KGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoW2NyZWF0ZVNvbWV0aGluZ10pXG4gICAgICAgIGluamVjdG9yLmdldChTb21ldGhpbmcpXG4gICAgICB9KS50b1Rocm93RXJyb3IoL09ubHkgY2xhc3NlcyB3aXRoIGEgcGFyZW50IGNhbiBhc2sgZm9yIFN1cGVyQ29uc3RydWN0b3IhLylcbiAgICB9KVxuXG4gIH0pXG5cbiAgLy8gaXQoJ3Nob3VsZCB0aHJvdyBhbiBlcnJvciB3aGVuIHVzZWQgaW4gYSBjbGFzcyB3aXRob3V0IGFueSBwYXJlbnQnLCBmdW5jdGlvbigpIHtcbiAgLy8gICBjbGFzcyBXaXRob3V0UGFyZW50IHt9XG4gIC8vICAgYW5ub3RhdGUoV2l0aG91dFBhcmVudCwgbmV3IEluamVjdChTdXBlckNvbnN0cnVjdG9yKSlcblxuICAvLyAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpXG5cbiAgLy8gICBleHBlY3QoZnVuY3Rpb24oKSB7XG4gIC8vICAgICBpbmplY3Rvci5nZXQoV2l0aG91dFBhcmVudClcbiAgLy8gICB9KS50b1Rocm93RXJyb3IoL09ubHkgY2xhc3NlcyB3aXRoIGEgcGFyZW50IGNhbiBhc2sgZm9yIFN1cGVyQ29uc3RydWN0b3IhLylcbiAgLy8gfSlcblxuICBpdCgnc2hvdWxkIHRocm93IGFuIGVycm9yIHdoZW4gbnVsbC91bmRlZmluZWQgdG9rZW4gcmVxdWVzdGVkJywgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcblxuICAgIGV4cGVjdChmdW5jdGlvbigpIHtcbiAgICAgIGluamVjdG9yLmdldChudWxsKVxuICAgIH0pLnRvVGhyb3dFcnJvcigvSW52YWxpZCB0b2tlbiBcIm51bGxcIiByZXF1ZXN0ZWQhLylcblxuICAgIGV4cGVjdChmdW5jdGlvbigpIHtcbiAgICAgIGluamVjdG9yLmdldCh1bmRlZmluZWQpXG4gICAgfSkudG9UaHJvd0Vycm9yKC9JbnZhbGlkIHRva2VuIFwidW5kZWZpbmVkXCIgcmVxdWVzdGVkIS8pXG4gIH0pXG5cbiAgLy8gcmVncmVzc2lvblxuICBpdCgnc2hvdWxkIHNob3cgdGhlIGZ1bGwgcGF0aCB3aGVuIG51bGwvdW5kZWZpbmVkIHRva2VuIHJlcXVlc3RlZCcsIGZ1bmN0aW9uKCkge1xuICAgIGNsYXNzIEZvbyB7fVxuICAgIGFubm90YXRlKEZvbywgbmV3IEluamVjdCh1bmRlZmluZWQpKVxuXG4gICAgY2xhc3MgQmFyIHt9XG4gICAgYW5ub3RhdGUoQmFyLCBuZXcgSW5qZWN0KG51bGwpKVxuXG4gICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcblxuICAgIGV4cGVjdChmdW5jdGlvbigpIHtcbiAgICAgIGluamVjdG9yLmdldChGb28pXG4gICAgfSkudG9UaHJvd0Vycm9yKC9JbnZhbGlkIHRva2VuIFwidW5kZWZpbmVkXCIgcmVxdWVzdGVkISBcXChGb28gLT4gdW5kZWZpbmVkXFwpLylcblxuICAgIGV4cGVjdChmdW5jdGlvbigpIHtcbiAgICAgIGluamVjdG9yLmdldChCYXIpXG4gICAgfSkudG9UaHJvd0Vycm9yKC9JbnZhbGlkIHRva2VuIFwibnVsbFwiIHJlcXVlc3RlZCEgXFwoQmFyIC0+IG51bGxcXCkvKVxuICB9KVxuXG4gIGl0KCdzaG91bGQgcHJvdmlkZSBpdHNlbGYnLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuXG4gICAgZXhwZWN0KGluamVjdG9yLmdldChJbmplY3RvcikpLnRvQmUoaW5qZWN0b3IpXG4gIH0pXG5cbiAgZGVzY3JpYmUoJ3RyYW5zaWVudCcsIGZ1bmN0aW9uKCkge1xuXG4gICAgaXQoJ3Nob3VsZCBuZXZlciBjYWNoZScsIGZ1bmN0aW9uKCkge1xuICAgICAgY2xhc3MgRm9vIHt9XG4gICAgICBhbm5vdGF0ZShGb28sIG5ldyBUcmFuc2llbnRTY29wZSgpKVxuXG4gICAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuICAgICAgZXhwZWN0KGluamVjdG9yLmdldChGb28pKS5ub3QudG9CZShpbmplY3Rvci5nZXQoRm9vKSlcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCBhbHdheXMgdXNlIGRlcGVuZGVuY2llcyAoZGVmYXVsdCBwcm92aWRlcnMpIGZyb20gdGhlIHlvdW5nZXN0IGluamVjdG9yJywgZnVuY3Rpb24oKSB7XG4gICAgICBjbGFzcyBGb28ge31cbiAgICAgIGFubm90YXRlKEZvbywgbmV3IEluamVjdCgpKVxuXG4gICAgICBjbGFzcyBBbHdheXNOZXdJbnN0YW5jZSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGZvbykge1xuICAgICAgICAgIHRoaXMuZm9vID0gZm9vXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFubm90YXRlKEFsd2F5c05ld0luc3RhbmNlLCBuZXcgVHJhbnNpZW50U2NvcGUoKSlcbiAgICAgIGFubm90YXRlKEFsd2F5c05ld0luc3RhbmNlLCBuZXcgSW5qZWN0KEZvbykpXG5cbiAgICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpXG4gICAgICB2YXIgY2hpbGQgPSBpbmplY3Rvci5jcmVhdGVDaGlsZChbRm9vXSkgLy8gZm9yY2UgbmV3IGluc3RhbmNlIG9mIEZvb1xuXG4gICAgICB2YXIgZm9vRnJvbUNoaWxkID0gY2hpbGQuZ2V0KEZvbylcbiAgICAgIHZhciBmb29Gcm9tUGFyZW50ID0gaW5qZWN0b3IuZ2V0KEZvbylcblxuICAgICAgdmFyIGFsd2F5c05ldzEgPSBjaGlsZC5nZXQoQWx3YXlzTmV3SW5zdGFuY2UpXG4gICAgICB2YXIgYWx3YXlzTmV3MiA9IGNoaWxkLmdldChBbHdheXNOZXdJbnN0YW5jZSlcbiAgICAgIHZhciBhbHdheXNOZXdGcm9tUGFyZW50ID0gaW5qZWN0b3IuZ2V0KEFsd2F5c05ld0luc3RhbmNlKVxuXG4gICAgICBleHBlY3QoYWx3YXlzTmV3MS5mb28pLnRvQmUoZm9vRnJvbUNoaWxkKVxuICAgICAgZXhwZWN0KGFsd2F5c05ldzIuZm9vKS50b0JlKGZvb0Zyb21DaGlsZClcbiAgICAgIGV4cGVjdChhbHdheXNOZXdGcm9tUGFyZW50LmZvbykudG9CZShmb29Gcm9tUGFyZW50KVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGFsd2F5cyB1c2UgZGVwZW5kZW5jaWVzIGZyb20gdGhlIHlvdW5nZXN0IGluamVjdG9yJywgZnVuY3Rpb24oKSB7XG4gICAgICBjbGFzcyBGb28ge31cbiAgICAgIGFubm90YXRlKEZvbywgbmV3IEluamVjdCgpKVxuXG4gICAgICBjbGFzcyBBbHdheXNOZXdJbnN0YW5jZSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGZvbykge1xuICAgICAgICAgIHRoaXMuZm9vID0gZm9vXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFubm90YXRlKEFsd2F5c05ld0luc3RhbmNlLCBuZXcgVHJhbnNpZW50U2NvcGUoKSlcbiAgICAgIGFubm90YXRlKEFsd2F5c05ld0luc3RhbmNlLCBuZXcgSW5qZWN0KEZvbykpXG5cbiAgICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcihbQWx3YXlzTmV3SW5zdGFuY2VdKVxuICAgICAgdmFyIGNoaWxkID0gaW5qZWN0b3IuY3JlYXRlQ2hpbGQoW0Zvb10pIC8vIGZvcmNlIG5ldyBpbnN0YW5jZSBvZiBGb29cblxuICAgICAgdmFyIGZvb0Zyb21DaGlsZCA9IGNoaWxkLmdldChGb28pXG4gICAgICB2YXIgZm9vRnJvbVBhcmVudCA9IGluamVjdG9yLmdldChGb28pXG5cbiAgICAgIHZhciBhbHdheXNOZXcxID0gY2hpbGQuZ2V0KEFsd2F5c05ld0luc3RhbmNlKVxuICAgICAgdmFyIGFsd2F5c05ldzIgPSBjaGlsZC5nZXQoQWx3YXlzTmV3SW5zdGFuY2UpXG4gICAgICB2YXIgYWx3YXlzTmV3RnJvbVBhcmVudCA9IGluamVjdG9yLmdldChBbHdheXNOZXdJbnN0YW5jZSlcblxuICAgICAgZXhwZWN0KGFsd2F5c05ldzEuZm9vKS50b0JlKGZvb0Zyb21DaGlsZClcbiAgICAgIGV4cGVjdChhbHdheXNOZXcyLmZvbykudG9CZShmb29Gcm9tQ2hpbGQpXG4gICAgICBleHBlY3QoYWx3YXlzTmV3RnJvbVBhcmVudC5mb28pLnRvQmUoZm9vRnJvbVBhcmVudClcbiAgICB9KVxuICB9KVxuXG4gIGRlc2NyaWJlKCdjaGlsZCcsIGZ1bmN0aW9uKCkge1xuXG4gICAgaXQoJ3Nob3VsZCBsb2FkIGluc3RhbmNlcyBmcm9tIHBhcmVudCBpbmplY3RvcicsIGZ1bmN0aW9uKCkge1xuICAgICAgY2xhc3MgQ2FyIHtcbiAgICAgICAgc3RhcnQoKSB7fVxuICAgICAgfVxuXG4gICAgICB2YXIgcGFyZW50ID0gbmV3IEluamVjdG9yKFtDYXJdKVxuICAgICAgdmFyIGNoaWxkID0gcGFyZW50LmNyZWF0ZUNoaWxkKFtdKVxuXG4gICAgICB2YXIgY2FyRnJvbVBhcmVudCA9IHBhcmVudC5nZXQoQ2FyKVxuICAgICAgdmFyIGNhckZyb21DaGlsZCA9IGNoaWxkLmdldChDYXIpXG5cbiAgICAgIGV4cGVjdChjYXJGcm9tQ2hpbGQpLnRvQmUoY2FyRnJvbVBhcmVudClcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCBjcmVhdGUgbmV3IGluc3RhbmNlIGluIGEgY2hpbGQgaW5qZWN0b3InLCBmdW5jdGlvbigpIHtcbiAgICAgIGNsYXNzIENhciB7XG4gICAgICAgIHN0YXJ0KCkge31cbiAgICAgIH1cblxuICAgICAgY2xhc3MgTW9ja0NhciB7XG4gICAgICAgIHN0YXJ0KCkge31cbiAgICAgIH1cbiAgICAgIGFubm90YXRlKE1vY2tDYXIsIG5ldyBQcm92aWRlKENhcikpXG5cbiAgICAgIHZhciBwYXJlbnQgPSBuZXcgSW5qZWN0b3IoW0Nhcl0pXG4gICAgICB2YXIgY2hpbGQgPSBwYXJlbnQuY3JlYXRlQ2hpbGQoW01vY2tDYXJdKVxuXG4gICAgICB2YXIgY2FyRnJvbVBhcmVudCA9IHBhcmVudC5nZXQoQ2FyKVxuICAgICAgdmFyIGNhckZyb21DaGlsZCA9IGNoaWxkLmdldChDYXIpXG5cbiAgICAgIGV4cGVjdChjYXJGcm9tUGFyZW50KS5ub3QudG9CZShjYXJGcm9tQ2hpbGQpXG4gICAgICBleHBlY3QoY2FyRnJvbUNoaWxkKS50b0JlSW5zdGFuY2VPZihNb2NrQ2FyKVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGZvcmNlIG5ldyBpbnN0YW5jZXMgYnkgYW5ub3RhdGlvbicsIGZ1bmN0aW9uKCkge1xuICAgICAgY2xhc3MgUm91dGVTY29wZSB7fVxuXG4gICAgICBjbGFzcyBFbmdpbmUge1xuICAgICAgICBzdGFydCgpIHt9XG4gICAgICB9XG5cbiAgICAgIGNsYXNzIENhciB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGVuZ2luZSkge1xuICAgICAgICAgIHRoaXMuZW5naW5lID0gZW5naW5lXG4gICAgICAgIH1cblxuICAgICAgICBzdGFydCgpIHt9XG4gICAgICB9XG4gICAgICBhbm5vdGF0ZShDYXIsIG5ldyBSb3V0ZVNjb3BlKCkpXG4gICAgICBhbm5vdGF0ZShDYXIsIG5ldyBJbmplY3QoRW5naW5lKSlcblxuICAgICAgdmFyIHBhcmVudCA9IG5ldyBJbmplY3RvcihbQ2FyLCBFbmdpbmVdKVxuICAgICAgdmFyIGNoaWxkID0gcGFyZW50LmNyZWF0ZUNoaWxkKFtdLCBbUm91dGVTY29wZV0pXG5cbiAgICAgIHZhciBjYXJGcm9tUGFyZW50ID0gcGFyZW50LmdldChDYXIpXG4gICAgICB2YXIgY2FyRnJvbUNoaWxkID0gY2hpbGQuZ2V0KENhcilcblxuICAgICAgZXhwZWN0KGNhckZyb21DaGlsZCkubm90LnRvQmUoY2FyRnJvbVBhcmVudClcbiAgICAgIGV4cGVjdChjYXJGcm9tQ2hpbGQuZW5naW5lKS50b0JlKGNhckZyb21QYXJlbnQuZW5naW5lKVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGZvcmNlIG5ldyBpbnN0YW5jZXMgYnkgYW5ub3RhdGlvbiB1c2luZyBvdmVycmlkZGVuIHByb3ZpZGVyJywgZnVuY3Rpb24oKSB7XG4gICAgICBjbGFzcyBSb3V0ZVNjb3BlIHt9XG5cbiAgICAgIGNsYXNzIEVuZ2luZSB7XG4gICAgICAgIHN0YXJ0KCkge31cbiAgICAgIH1cblxuICAgICAgY2xhc3MgTW9ja0VuZ2luZSB7XG4gICAgICAgIHN0YXJ0KCkge31cbiAgICAgIH1cbiAgICAgIGFubm90YXRlKE1vY2tFbmdpbmUsIG5ldyBSb3V0ZVNjb3BlKCkpXG4gICAgICBhbm5vdGF0ZShNb2NrRW5naW5lLCBuZXcgUHJvdmlkZShFbmdpbmUpKVxuXG4gICAgICB2YXIgcGFyZW50ID0gbmV3IEluamVjdG9yKFtNb2NrRW5naW5lXSlcbiAgICAgIHZhciBjaGlsZEEgPSBwYXJlbnQuY3JlYXRlQ2hpbGQoW10sIFtSb3V0ZVNjb3BlXSlcbiAgICAgIHZhciBjaGlsZEIgPSBwYXJlbnQuY3JlYXRlQ2hpbGQoW10sIFtSb3V0ZVNjb3BlXSlcblxuICAgICAgdmFyIGVuZ2luZUZyb21BID0gY2hpbGRBLmdldChFbmdpbmUpXG4gICAgICB2YXIgZW5naW5lRnJvbUIgPSBjaGlsZEIuZ2V0KEVuZ2luZSlcblxuICAgICAgZXhwZWN0KGVuZ2luZUZyb21BKS5ub3QudG9CZShlbmdpbmVGcm9tQilcbiAgICAgIGV4cGVjdChlbmdpbmVGcm9tQSkudG9CZUluc3RhbmNlT2YoTW9ja0VuZ2luZSlcbiAgICAgIGV4cGVjdChlbmdpbmVGcm9tQikudG9CZUluc3RhbmNlT2YoTW9ja0VuZ2luZSlcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCBmb3JjZSBuZXcgaW5zdGFuY2UgYnkgYW5ub3RhdGlvbiB1c2luZyB0aGUgbG93ZXN0IG92ZXJyaWRkZW4gcHJvdmlkZXInLCBmdW5jdGlvbigpIHtcbiAgICAgIGNsYXNzIFJvdXRlU2NvcGUge31cblxuICAgICAgY2xhc3MgRW5naW5lIHtcbiAgICAgICAgY29uc3RydWN0b3IoKSB7fVxuICAgICAgICBzdGFydCgpIHt9XG4gICAgICB9XG4gICAgICBhbm5vdGF0ZShFbmdpbmUsIG5ldyBSb3V0ZVNjb3BlKCkpXG5cbiAgICAgIGNsYXNzIE1vY2tFbmdpbmUge1xuICAgICAgICBjb25zdHJ1Y3RvcigpIHt9XG4gICAgICAgIHN0YXJ0KCkge31cbiAgICAgIH1cbiAgICAgIGFubm90YXRlKE1vY2tFbmdpbmUsIG5ldyBQcm92aWRlKEVuZ2luZSkpXG4gICAgICBhbm5vdGF0ZShNb2NrRW5naW5lLCBuZXcgUm91dGVTY29wZSgpKVxuXG4gICAgICBjbGFzcyBEb3VibGVNb2NrRW5naW5lIHtcbiAgICAgICAgc3RhcnQoKSB7fVxuICAgICAgfVxuICAgICAgYW5ub3RhdGUoRG91YmxlTW9ja0VuZ2luZSwgbmV3IFByb3ZpZGUoRW5naW5lKSlcbiAgICAgIGFubm90YXRlKERvdWJsZU1vY2tFbmdpbmUsIG5ldyBSb3V0ZVNjb3BlKCkpXG5cbiAgICAgIHZhciBwYXJlbnQgPSBuZXcgSW5qZWN0b3IoW0VuZ2luZV0pXG4gICAgICB2YXIgY2hpbGQgPSBwYXJlbnQuY3JlYXRlQ2hpbGQoW01vY2tFbmdpbmVdKVxuICAgICAgdmFyIGdyYW50Q2hpbGQgPSBjaGlsZC5jcmVhdGVDaGlsZChbXSwgW1JvdXRlU2NvcGVdKVxuXG4gICAgICB2YXIgZW5naW5lRnJvbVBhcmVudCA9IHBhcmVudC5nZXQoRW5naW5lKVxuICAgICAgdmFyIGVuZ2luZUZyb21DaGlsZCA9IGNoaWxkLmdldChFbmdpbmUpXG4gICAgICB2YXIgZW5naW5lRnJvbUdyYW50Q2hpbGQgPSBncmFudENoaWxkLmdldChFbmdpbmUpXG5cbiAgICAgIGV4cGVjdChlbmdpbmVGcm9tUGFyZW50KS50b0JlSW5zdGFuY2VPZihFbmdpbmUpXG4gICAgICBleHBlY3QoZW5naW5lRnJvbUNoaWxkKS50b0JlSW5zdGFuY2VPZihNb2NrRW5naW5lKVxuICAgICAgZXhwZWN0KGVuZ2luZUZyb21HcmFudENoaWxkKS50b0JlSW5zdGFuY2VPZihNb2NrRW5naW5lKVxuICAgICAgZXhwZWN0KGVuZ2luZUZyb21HcmFudENoaWxkKS5ub3QudG9CZShlbmdpbmVGcm9tQ2hpbGQpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgc2hvdyB0aGUgZnVsbCBwYXRoIHdoZW4gbm8gcHJvdmlkZXInLCBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBwYXJlbnQgPSBuZXcgSW5qZWN0b3IoaG91c2VNb2R1bGUpXG4gICAgICB2YXIgY2hpbGQgPSBwYXJlbnQuY3JlYXRlQ2hpbGQoc2hpbnlIb3VzZU1vZHVsZSlcblxuICAgICAgZXhwZWN0KCgpID0+IGNoaWxkLmdldCgnSG91c2UnKSlcbiAgICAgICAgICAudG9UaHJvd0Vycm9yKCdObyBwcm92aWRlciBmb3IgU2luayEgKEhvdXNlIC0+IEtpdGNoZW4gLT4gU2luayknKVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIHByb3ZpZGUgaXRzZWxmJywgZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcGFyZW50ID0gbmV3IEluamVjdG9yKClcbiAgICAgIHZhciBjaGlsZCA9IHBhcmVudC5jcmVhdGVDaGlsZChbXSlcblxuICAgICAgZXhwZWN0KGNoaWxkLmdldChJbmplY3RvcikpLnRvQmUoY2hpbGQpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgY2FjaGUgZGVmYXVsdCBwcm92aWRlciBpbiBwYXJlbnQgaW5qZWN0b3InLCBmdW5jdGlvbigpIHtcbiAgICAgIGNsYXNzIEZvbyB7fVxuICAgICAgYW5ub3RhdGUoRm9vLCBuZXcgSW5qZWN0KCkpXG5cbiAgICAgIHZhciBwYXJlbnQgPSBuZXcgSW5qZWN0b3IoKVxuICAgICAgdmFyIGNoaWxkID0gcGFyZW50LmNyZWF0ZUNoaWxkKFtdKVxuXG4gICAgICB2YXIgZm9vRnJvbUNoaWxkID0gY2hpbGQuZ2V0KEZvbylcbiAgICAgIHZhciBmb29Gcm9tUGFyZW50ID0gcGFyZW50LmdldChGb28pXG5cbiAgICAgIGV4cGVjdChmb29Gcm9tUGFyZW50KS50b0JlKGZvb0Zyb21DaGlsZClcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCBmb3JjZSBuZXcgaW5zdGFuY2UgYnkgYW5ub3RhdGlvbiBmb3IgZGVmYXVsdCBwcm92aWRlcicsIGZ1bmN0aW9uKCkge1xuICAgICAgY2xhc3MgUmVxdWVzdFNjb3BlIHt9XG5cbiAgICAgIGNsYXNzIEZvbyB7fVxuICAgICAgYW5ub3RhdGUoRm9vLCBuZXcgSW5qZWN0KCkpXG4gICAgICBhbm5vdGF0ZShGb28sIG5ldyBSZXF1ZXN0U2NvcGUoKSlcblxuICAgICAgdmFyIHBhcmVudCA9IG5ldyBJbmplY3RvcigpXG4gICAgICB2YXIgY2hpbGQgPSBwYXJlbnQuY3JlYXRlQ2hpbGQoW10sIFtSZXF1ZXN0U2NvcGVdKVxuXG4gICAgICB2YXIgZm9vRnJvbUNoaWxkID0gY2hpbGQuZ2V0KEZvbylcbiAgICAgIHZhciBmb29Gcm9tUGFyZW50ID0gcGFyZW50LmdldChGb28pXG5cbiAgICAgIGV4cGVjdChmb29Gcm9tUGFyZW50KS5ub3QudG9CZShmb29Gcm9tQ2hpbGQpXG4gICAgfSlcbiAgfSlcblxuICBkZXNjcmliZSgnbGF6eScsIGZ1bmN0aW9uKCkge1xuXG4gICAgaXQoJ3Nob3VsZCBpbnN0YW50aWF0ZSBsYXppbHknLCBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjb25zdHJ1Y3RvclNweSA9IGphc21pbmUuY3JlYXRlU3B5KCdjb25zdHJ1Y3RvcicpXG5cbiAgICAgIGNsYXNzIEV4cGVuc2l2ZUVuZ2luZSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgIGNvbnN0cnVjdG9yU3B5KClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjbGFzcyBDYXIge1xuICAgICAgICBjb25zdHJ1Y3RvcihjcmVhdGVFbmdpbmUpIHtcbiAgICAgICAgICB0aGlzLmVuZ2luZSA9IG51bGxcbiAgICAgICAgICB0aGlzLmNyZWF0ZUVuZ2luZSA9IGNyZWF0ZUVuZ2luZVxuICAgICAgICB9XG5cbiAgICAgICAgc3RhcnQoKSB7XG4gICAgICAgICAgdGhpcy5lbmdpbmUgPSB0aGlzLmNyZWF0ZUVuZ2luZSgpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFubm90YXRlKENhciwgbmV3IEluamVjdExhenkoRXhwZW5zaXZlRW5naW5lKSlcblxuICAgICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcbiAgICAgIHZhciBjYXIgPSBpbmplY3Rvci5nZXQoQ2FyKVxuXG4gICAgICBleHBlY3QoY29uc3RydWN0b3JTcHkpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKClcblxuICAgICAgY2FyLnN0YXJ0KClcbiAgICAgIGV4cGVjdChjb25zdHJ1Y3RvclNweSkudG9IYXZlQmVlbkNhbGxlZCgpXG4gICAgICBleHBlY3QoY2FyLmVuZ2luZSkudG9CZUluc3RhbmNlT2YoRXhwZW5zaXZlRW5naW5lKVxuICAgIH0pXG5cbiAgICAvLyByZWdyZXNzaW9uXG4gICAgaXQoJ3Nob3VsZCBpbnN0YW50aWF0ZSBsYXppbHkgZnJvbSBhIHBhcmVudCBpbmplY3RvcicsIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGNvbnN0cnVjdG9yU3B5ID0gamFzbWluZS5jcmVhdGVTcHkoJ2NvbnN0cnVjdG9yJylcblxuICAgICAgY2xhc3MgRXhwZW5zaXZlRW5naW5lIHtcbiAgICAgICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgICAgY29uc3RydWN0b3JTcHkoKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNsYXNzIENhciB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGNyZWF0ZUVuZ2luZSkge1xuICAgICAgICAgIHRoaXMuZW5naW5lID0gbnVsbFxuICAgICAgICAgIHRoaXMuY3JlYXRlRW5naW5lID0gY3JlYXRlRW5naW5lXG4gICAgICAgIH1cblxuICAgICAgICBzdGFydCgpIHtcbiAgICAgICAgICB0aGlzLmVuZ2luZSA9IHRoaXMuY3JlYXRlRW5naW5lKClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYW5ub3RhdGUoQ2FyLCBuZXcgSW5qZWN0TGF6eShFeHBlbnNpdmVFbmdpbmUpKVxuXG4gICAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoW0V4cGVuc2l2ZUVuZ2luZV0pXG4gICAgICB2YXIgY2hpbGRJbmplY3RvciA9IGluamVjdG9yLmNyZWF0ZUNoaWxkKFtDYXJdKVxuICAgICAgdmFyIGNhciA9IGNoaWxkSW5qZWN0b3IuZ2V0KENhcilcblxuICAgICAgZXhwZWN0KGNvbnN0cnVjdG9yU3B5KS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpXG5cbiAgICAgIGNhci5zdGFydCgpXG4gICAgICBleHBlY3QoY29uc3RydWN0b3JTcHkpLnRvSGF2ZUJlZW5DYWxsZWQoKVxuICAgICAgZXhwZWN0KGNhci5lbmdpbmUpLnRvQmVJbnN0YW5jZU9mKEV4cGVuc2l2ZUVuZ2luZSlcbiAgICB9KVxuXG4gICAgZGVzY3JpYmUoJ3dpdGggbG9jYWxzJywgZnVuY3Rpb24oKSB7XG5cbiAgICAgIGl0KCdzaG91bGQgYWx3YXlzIGNyZWF0ZSBhIG5ldyBpbnN0YW5jZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY29uc3RydWN0b3JTcHkgPSBqYXNtaW5lLmNyZWF0ZVNweSgnY29uc3RydWN0b3InKVxuXG4gICAgICAgIGNsYXNzIEV4cGVuc2l2ZUVuZ2luZSB7XG4gICAgICAgICAgY29uc3RydWN0b3IocG93ZXIpIHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yU3B5KClcbiAgICAgICAgICAgIHRoaXMucG93ZXIgPSBwb3dlclxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhbm5vdGF0ZShFeHBlbnNpdmVFbmdpbmUsIG5ldyBUcmFuc2llbnRTY29wZSgpKVxuICAgICAgICBhbm5vdGF0ZShFeHBlbnNpdmVFbmdpbmUsIG5ldyBJbmplY3QoJ3Bvd2VyJykpXG5cbiAgICAgICAgY2xhc3MgQ2FyIHtcbiAgICAgICAgICBjb25zdHJ1Y3RvcihjcmVhdGVFbmdpbmUpIHtcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlRW5naW5lID0gY3JlYXRlRW5naW5lXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGFubm90YXRlKENhciwgbmV3IEluamVjdExhenkoRXhwZW5zaXZlRW5naW5lKSlcblxuICAgICAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuICAgICAgICB2YXIgY2FyID0gaW5qZWN0b3IuZ2V0KENhcilcblxuICAgICAgICB2YXIgdmV5cm9uRW5naW5lID0gY2FyLmNyZWF0ZUVuZ2luZSgncG93ZXInLCAxMTg0KVxuICAgICAgICB2YXIgbXVzdGFuZ0VuZ2luZSA9IGNhci5jcmVhdGVFbmdpbmUoJ3Bvd2VyJywgNDIwKVxuXG4gICAgICAgIGV4cGVjdCh2ZXlyb25FbmdpbmUpLm5vdC50b0JlKG11c3RhbmdFbmdpbmUpXG4gICAgICAgIGV4cGVjdCh2ZXlyb25FbmdpbmUucG93ZXIpLnRvQmUoMTE4NClcbiAgICAgICAgZXhwZWN0KG11c3RhbmdFbmdpbmUucG93ZXIpLnRvQmUoNDIwKVxuXG4gICAgICAgIHZhciBtdXN0YW5nRW5naW5lMiA9IGNhci5jcmVhdGVFbmdpbmUoJ3Bvd2VyJywgNDIwKVxuICAgICAgICBleHBlY3QobXVzdGFuZ0VuZ2luZSkubm90LnRvQmUobXVzdGFuZ0VuZ2luZTIpXG4gICAgICB9KVxuICAgIH0pXG4gIH0pXG59KVxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9