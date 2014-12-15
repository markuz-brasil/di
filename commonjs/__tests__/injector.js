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
          // console.log(superConstructor)
          superConstructor();
          this.childSomething = something;
        };

        _extends(Child, Parent);

        return Child;
      })(Parent);

      // console.log(Child.annotations)
      // Child.annotations = [new Inject(SuperConstructor, Something)]
      annotate(Child, new Inject(SuperConstructor, Something));

      console.log(Child.annotations);
      console.log("^^", Parent.annotations);
      // annotate(Child, new Inject(Something))

      var injector = new Injector();
      var instance = injector.get(Child);

      expect(instance.parentSomething).toBeInstanceOf(Something);
      expect(instance.childSomething).toBeInstanceOf(Something);
      expect(instance.childSomething).toBe(instance.parentSomething);
    });

    // it('should support "super" to call multiple parent constructors', function() {
    //   class Foo {}
    //   class Bar {}

    //   class Parent {
    //     constructor(foo) {
    //       this.parentFoo = foo
    //     }
    //   }
    //   annotate(Parent, new Inject(Foo))

    //   class Child extends Parent {
    //     constructor(superConstructor, foo) {
    //       superConstructor()
    //       this.childFoo = foo
    //     }
    //   }
    //   annotate(Child, new SuperConstructor, new Foo)

    //   class GrandChild extends Child {
    //     constructor(bar, superConstructor, foo) {
    //       superConstructor()
    //       this.grandChildBar = bar
    //       this.grandChildFoo = foo
    //     }
    //   }
    //   annotate(GrandChild, new SuperConstructor, new Foo)

    //   var injector = new Injector()
    //   var instance = injector.get(GrandChild)

    //   expect(instance.parentFoo).toBeInstanceOf(Foo)
    //   expect(instance.childFoo).toBeInstanceOf(Foo)
    //   expect(instance.grandChildFoo).toBeInstanceOf(Foo)
    //   expect(instance.grandChildBar).toBeInstanceOf(Bar)
    // })

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9fdGVzdHNfXy9pbmplY3Rvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTs7O0lBSWhCLFFBQVEsdUJBQVIsUUFBUTtJQUNSLGFBQWEsdUJBQWIsYUFBYTtJQUNiLGVBQWUsdUJBQWYsZUFBZTtJQUNmLFFBQVEsdUJBQVIsUUFBUTtJQUNSLE1BQU0sdUJBQU4sTUFBTTtJQUNOLFVBQVUsdUJBQVYsVUFBVTtJQUNWLGFBQWEsdUJBQWIsYUFBYTtJQUNiLE9BQU8sdUJBQVAsT0FBTztJQUNQLGNBQWMsdUJBQWQsY0FBYztJQUNkLGdCQUFnQix1QkFBaEIsZ0JBQWdCO0lBQ2hCLGNBQWMsdUJBQWQsY0FBYztJQUdSLEdBQUcsa0NBQUgsR0FBRztJQUFFLFlBQVksa0NBQVosWUFBWTtJQUNQLFdBQVcsb0NBQXJCLE1BQU07SUFDSSxnQkFBZ0IsMENBQTFCLE1BQU07Ozs7QUFHZCxRQUFRLENBQUMsVUFBVSxFQUFFLFlBQVc7QUFFOUIsSUFBRSxDQUFDLGlEQUFpRCxFQUFFLFlBQVc7UUFDekQsR0FBRztVQUFILEdBQUcsR0FDSSxTQURQLEdBQUcsR0FDTyxFQUFFOztBQURaLFNBQUcsV0FFUCxLQUFLLEdBQUEsWUFBRyxFQUFFOzthQUZOLEdBQUc7OztBQUtULFFBQUksUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUE7QUFDN0IsUUFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTs7QUFFM0IsVUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtHQUNoQyxDQUFDLENBQUE7O0FBRUYsSUFBRSxDQUFDLHlEQUF5RCxFQUFFLFlBQVc7UUFDakUsTUFBTTtVQUFOLE1BQU0sWUFBTixNQUFNOztBQUFOLFlBQU0sV0FDVixLQUFLLEdBQUEsWUFBRyxFQUFFOzthQUROLE1BQU07OztRQUlOLEdBQUc7VUFB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dCI6WyJqZXN0LmF1dG9Nb2NrT2ZmKClcbmltcG9ydCAnNnRvNS9wb2x5ZmlsbCdcblxuaW1wb3J0IHtcbiAgYW5ub3RhdGUsXG4gIGhhc0Fubm90YXRpb24sXG4gIHJlYWRBbm5vdGF0aW9ucyxcbiAgSW5qZWN0b3IsXG4gIEluamVjdCxcbiAgSW5qZWN0TGF6eSxcbiAgSW5qZWN0UHJvbWlzZSxcbiAgUHJvdmlkZSxcbiAgUHJvdmlkZVByb21pc2UsXG4gIFN1cGVyQ29uc3RydWN0b3IsXG4gIFRyYW5zaWVudFNjb3BlXG59IGZyb20gJy4uL2luZGV4J1xuXG5pbXBvcnQge0NhciwgQ3ljbGljRW5naW5lfSBmcm9tICcuLi9fX2ZpeHR1cmVzX18vY2FyJ1xuaW1wb3J0IHttb2R1bGUgYXMgaG91c2VNb2R1bGV9IGZyb20gJy4uL19fZml4dHVyZXNfXy9ob3VzZSdcbmltcG9ydCB7bW9kdWxlIGFzIHNoaW55SG91c2VNb2R1bGV9IGZyb20gJy4uL19fZml4dHVyZXNfXy9zaGlueV9ob3VzZSdcblxuXG5kZXNjcmliZSgnaW5qZWN0b3InLCBmdW5jdGlvbigpIHtcblxuICBpdCgnc2hvdWxkIGluc3RhbnRpYXRlIGEgY2xhc3Mgd2l0aG91dCBkZXBlbmRlbmNpZXMnLCBmdW5jdGlvbigpIHtcbiAgICBjbGFzcyBDYXIge1xuICAgICAgY29uc3RydWN0b3IoKSB7fVxuICAgICAgc3RhcnQoKSB7fVxuICAgIH1cblxuICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpXG4gICAgdmFyIGNhciA9IGluamVjdG9yLmdldChDYXIpXG5cbiAgICBleHBlY3QoY2FyKS50b0JlSW5zdGFuY2VPZihDYXIpXG4gIH0pXG5cbiAgaXQoJ3Nob3VsZCByZXNvbHZlIGRlcGVuZGVuY2llcyBiYXNlZCBvbiBASW5qZWN0IGFubm90YXRpb24nLCBmdW5jdGlvbigpIHtcbiAgICBjbGFzcyBFbmdpbmUge1xuICAgICAgc3RhcnQoKSB7fVxuICAgIH1cblxuICAgIGNsYXNzIENhciB7XG4gICAgICBjb25zdHJ1Y3RvcihlbmdpbmUpIHtcbiAgICAgICAgdGhpcy5lbmdpbmUgPSBlbmdpbmVcbiAgICAgIH1cblxuICAgICAgc3RhcnQoKSB7fVxuICAgIH1cbiAgICBhbm5vdGF0ZShDYXIsIG5ldyBJbmplY3QoRW5naW5lKSlcblxuICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpXG4gICAgdmFyIGNhciA9IGluamVjdG9yLmdldChDYXIpXG5cbiAgICBleHBlY3QoY2FyKS50b0JlSW5zdGFuY2VPZihDYXIpXG4gICAgZXhwZWN0KGNhci5lbmdpbmUpLnRvQmVJbnN0YW5jZU9mKEVuZ2luZSlcbiAgfSlcblxuICBpdCgnc2hvdWxkIG92ZXJyaWRlIHByb3ZpZGVycycsIGZ1bmN0aW9uKCkge1xuICAgIGNsYXNzIEVuZ2luZSB7fVxuXG4gICAgY2xhc3MgQ2FyIHtcbiAgICAgIGNvbnN0cnVjdG9yKGVuZ2luZSkge1xuICAgICAgICB0aGlzLmVuZ2luZSA9IGVuZ2luZVxuICAgICAgfVxuXG4gICAgICBzdGFydCgpIHt9XG4gICAgfVxuICAgIGFubm90YXRlKENhciwgbmV3IEluamVjdChFbmdpbmUpKVxuXG4gICAgY2xhc3MgTW9ja0VuZ2luZSB7XG4gICAgICBzdGFydCgpIHt9XG4gICAgfVxuICAgIGFubm90YXRlKE1vY2tFbmdpbmUsIG5ldyBQcm92aWRlKEVuZ2luZSkpXG5cbiAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoW01vY2tFbmdpbmVdKVxuICAgIHZhciBjYXIgPSBpbmplY3Rvci5nZXQoQ2FyKVxuXG4gICAgZXhwZWN0KGNhcikudG9CZUluc3RhbmNlT2YoQ2FyKVxuICAgIGV4cGVjdChjYXIuZW5naW5lKS50b0JlSW5zdGFuY2VPZihNb2NrRW5naW5lKVxuICB9KVxuXG4gIGl0KCdzaG91bGQgYWxsb3cgZmFjdG9yeSBmdW5jdGlvbicsIGZ1bmN0aW9uKCkge1xuICAgIGNsYXNzIFNpemUge31cblxuICAgIGFubm90YXRlKGNvbXB1dGVTaXplLCBuZXcgUHJvdmlkZShTaXplKSlcbiAgICBmdW5jdGlvbiBjb21wdXRlU2l6ZSgpIHtcbiAgICAgIHJldHVybiAwXG4gICAgfVxuXG4gICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKFtjb21wdXRlU2l6ZV0pXG4gICAgdmFyIHNpemUgPSBpbmplY3Rvci5nZXQoU2l6ZSlcblxuICAgIGV4cGVjdChzaXplKS50b0JlKDApXG4gIH0pXG5cbiAgaXQoJ3Nob3VsZCBjYWNoZSBpbnN0YW5jZXMnLCBmdW5jdGlvbigpIHtcbiAgICBjbGFzcyBDYXIge31cblxuICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpXG4gICAgdmFyIGNhciA9IGluamVjdG9yLmdldChDYXIpXG5cbiAgICBleHBlY3QoaW5qZWN0b3IuZ2V0KENhcikpLnRvQmUoY2FyKVxuICB9KVxuXG4gIGl0KCdzaG91bGQgdGhyb3cgd2hlbiBubyBwcm92aWRlciBkZWZpbmVkJywgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcblxuICAgIGV4cGVjdCgoKSA9PiBpbmplY3Rvci5nZXQoJ05vbkV4aXN0aW5nJykpXG4gICAgICAgIC50b1Rocm93RXJyb3IoJ05vIHByb3ZpZGVyIGZvciBOb25FeGlzdGluZyEnKVxuICB9KVxuXG4gIGl0KCdzaG91bGQgc2hvdyB0aGUgZnVsbCBwYXRoIHdoZW4gbm8gcHJvdmlkZXIgZGVmaW5lZCcsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3Rvcihob3VzZU1vZHVsZSlcblxuICAgIGV4cGVjdCgoKSA9PiBpbmplY3Rvci5nZXQoJ0hvdXNlJykpXG4gICAgICAgIC50b1Rocm93RXJyb3IoJ05vIHByb3ZpZGVyIGZvciBTaW5rISAoSG91c2UgLT4gS2l0Y2hlbiAtPiBTaW5rKScpXG4gIH0pXG5cbiAgaXQoJ3Nob3VsZCB0aHJvdyB3aGVuIHRyeWluZyB0byBpbnN0YW50aWF0ZSBhIGN5Y2xpYyBkZXBlbmRlbmN5JywgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKFtDeWNsaWNFbmdpbmVdKVxuXG4gICAgZXhwZWN0KCgpID0+IGluamVjdG9yLmdldChDYXIpKVxuICAgICAgICAudG9UaHJvd0Vycm9yKCdDYW5ub3QgaW5zdGFudGlhdGUgY3ljbGljIGRlcGVuZGVuY3khIChDYXIgLT4gRW5naW5lIC0+IENhciknKVxuICB9KVxuXG4gIGl0KCdzaG91bGQgc2hvdyB0aGUgZnVsbCBwYXRoIHdoZW4gZXJyb3IgaGFwcGVucyBpbiBhIGNvbnN0cnVjdG9yJywgZnVuY3Rpb24oKSB7XG4gICAgY2xhc3MgRW5naW5lIHtcbiAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoaXMgZW5naW5lIGlzIGJyb2tlbiEnKVxuICAgICAgfVxuICAgIH1cblxuICAgIGNsYXNzIENhciB7XG4gICAgICBjb25zdHJ1Y3RvcihlKSB7fVxuICAgIH1cbiAgICBhbm5vdGF0ZShDYXIsIG5ldyBJbmplY3QoRW5naW5lKSlcblxuICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpXG5cbiAgICBleHBlY3QoKCkgPT4gaW5qZWN0b3IuZ2V0KENhcikpXG4gICAgICAudG9UaHJvd0Vycm9yKC9FcnJvciBkdXJpbmcgaW5zdGFudGlhdGlvbiBvZiBFbmdpbmUhIFxcKENhciAtPiBFbmdpbmVcXCkvKVxuICB9KVxuXG4gIGRlc2NyaWJlKCdTdXBlckNvbnN0cnVjdG9yJywgZnVuY3Rpb24gKCkge1xuXG4gICAgaXQoJ3Nob3VsZCBzdXBwb3J0IFwic3VwZXJcIiB0byBjYWxsIGEgcGFyZW50IGNvbnN0cnVjdG9yJywgZnVuY3Rpb24oKSB7XG4gICAgICBjbGFzcyBTb21ldGhpbmcge31cblxuICAgICAgY2xhc3MgUGFyZW50IHtcbiAgICAgICAgY29uc3RydWN0b3Ioc29tZXRoaW5nKSB7XG4gICAgICAgICAgdGhpcy5wYXJlbnRTb21ldGhpbmcgPSBzb21ldGhpbmdcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYW5ub3RhdGUoUGFyZW50LCBuZXcgSW5qZWN0KFNvbWV0aGluZykpXG5cbiAgICAgIGNsYXNzIENoaWxkIGV4dGVuZHMgUGFyZW50IHtcbiAgICAgICAgY29uc3RydWN0b3Ioc3VwZXJDb25zdHJ1Y3Rvciwgc29tZXRoaW5nKSB7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coc3VwZXJDb25zdHJ1Y3RvcilcbiAgICAgICAgICBzdXBlckNvbnN0cnVjdG9yKClcbiAgICAgICAgICB0aGlzLmNoaWxkU29tZXRoaW5nID0gc29tZXRoaW5nXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gY29uc29sZS5sb2coQ2hpbGQuYW5ub3RhdGlvbnMpXG4gICAgICAvLyBDaGlsZC5hbm5vdGF0aW9ucyA9IFtuZXcgSW5qZWN0KFN1cGVyQ29uc3RydWN0b3IsIFNvbWV0aGluZyldXG4gICAgICBhbm5vdGF0ZShDaGlsZCwgbmV3IEluamVjdChTdXBlckNvbnN0cnVjdG9yLCBTb21ldGhpbmcpKVxuXG4gICAgICBjb25zb2xlLmxvZyhDaGlsZC5hbm5vdGF0aW9ucylcbiAgICAgIGNvbnNvbGUubG9nKCdeXicsIFBhcmVudC5hbm5vdGF0aW9ucylcbiAgICAgIC8vIGFubm90YXRlKENoaWxkLCBuZXcgSW5qZWN0KFNvbWV0aGluZykpXG5cbiAgICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpXG4gICAgICB2YXIgaW5zdGFuY2UgPSBpbmplY3Rvci5nZXQoQ2hpbGQpXG5cbiAgICAgIGV4cGVjdChpbnN0YW5jZS5wYXJlbnRTb21ldGhpbmcpLnRvQmVJbnN0YW5jZU9mKFNvbWV0aGluZylcbiAgICAgIGV4cGVjdChpbnN0YW5jZS5jaGlsZFNvbWV0aGluZykudG9CZUluc3RhbmNlT2YoU29tZXRoaW5nKVxuICAgICAgZXhwZWN0KGluc3RhbmNlLmNoaWxkU29tZXRoaW5nKS50b0JlKGluc3RhbmNlLnBhcmVudFNvbWV0aGluZylcbiAgICB9KVxuXG4gICAgLy8gaXQoJ3Nob3VsZCBzdXBwb3J0IFwic3VwZXJcIiB0byBjYWxsIG11bHRpcGxlIHBhcmVudCBjb25zdHJ1Y3RvcnMnLCBmdW5jdGlvbigpIHtcbiAgICAvLyAgIGNsYXNzIEZvbyB7fVxuICAgIC8vICAgY2xhc3MgQmFyIHt9XG5cbiAgICAvLyAgIGNsYXNzIFBhcmVudCB7XG4gICAgLy8gICAgIGNvbnN0cnVjdG9yKGZvbykge1xuICAgIC8vICAgICAgIHRoaXMucGFyZW50Rm9vID0gZm9vXG4gICAgLy8gICAgIH1cbiAgICAvLyAgIH1cbiAgICAvLyAgIGFubm90YXRlKFBhcmVudCwgbmV3IEluamVjdChGb28pKVxuXG4gICAgLy8gICBjbGFzcyBDaGlsZCBleHRlbmRzIFBhcmVudCB7XG4gICAgLy8gICAgIGNvbnN0cnVjdG9yKHN1cGVyQ29uc3RydWN0b3IsIGZvbykge1xuICAgIC8vICAgICAgIHN1cGVyQ29uc3RydWN0b3IoKVxuICAgIC8vICAgICAgIHRoaXMuY2hpbGRGb28gPSBmb29cbiAgICAvLyAgICAgfVxuICAgIC8vICAgfVxuICAgIC8vICAgYW5ub3RhdGUoQ2hpbGQsIG5ldyBTdXBlckNvbnN0cnVjdG9yLCBuZXcgRm9vKVxuXG4gICAgLy8gICBjbGFzcyBHcmFuZENoaWxkIGV4dGVuZHMgQ2hpbGQge1xuICAgIC8vICAgICBjb25zdHJ1Y3RvcihiYXIsIHN1cGVyQ29uc3RydWN0b3IsIGZvbykge1xuICAgIC8vICAgICAgIHN1cGVyQ29uc3RydWN0b3IoKVxuICAgIC8vICAgICAgIHRoaXMuZ3JhbmRDaGlsZEJhciA9IGJhclxuICAgIC8vICAgICAgIHRoaXMuZ3JhbmRDaGlsZEZvbyA9IGZvb1xuICAgIC8vICAgICB9XG4gICAgLy8gICB9XG4gICAgLy8gICBhbm5vdGF0ZShHcmFuZENoaWxkLCBuZXcgU3VwZXJDb25zdHJ1Y3RvciwgbmV3IEZvbylcblxuICAgIC8vICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcbiAgICAvLyAgIHZhciBpbnN0YW5jZSA9IGluamVjdG9yLmdldChHcmFuZENoaWxkKVxuXG4gICAgLy8gICBleHBlY3QoaW5zdGFuY2UucGFyZW50Rm9vKS50b0JlSW5zdGFuY2VPZihGb28pXG4gICAgLy8gICBleHBlY3QoaW5zdGFuY2UuY2hpbGRGb28pLnRvQmVJbnN0YW5jZU9mKEZvbylcbiAgICAvLyAgIGV4cGVjdChpbnN0YW5jZS5ncmFuZENoaWxkRm9vKS50b0JlSW5zdGFuY2VPZihGb28pXG4gICAgLy8gICBleHBlY3QoaW5zdGFuY2UuZ3JhbmRDaGlsZEJhcikudG9CZUluc3RhbmNlT2YoQmFyKVxuICAgIC8vIH0pXG5cbiAgICBpdCgnc2hvdWxkIHRocm93IGFuIGVycm9yIHdoZW4gdXNlZCBpbiBhIGZhY3RvcnkgZnVuY3Rpb24nLCBmdW5jdGlvbigpIHtcbiAgICAgIGNsYXNzIFNvbWV0aGluZyB7fVxuXG4gICAgICBhbm5vdGF0ZShjcmVhdGVTb21ldGhpbmcsIG5ldyBQcm92aWRlKFNvbWV0aGluZykpXG4gICAgICBhbm5vdGF0ZShjcmVhdGVTb21ldGhpbmcsIG5ldyBJbmplY3QoU3VwZXJDb25zdHJ1Y3RvcikpXG4gICAgICBmdW5jdGlvbiBjcmVhdGVTb21ldGhpbmcoKSB7fVxuXG4gICAgICBleHBlY3QoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcihbY3JlYXRlU29tZXRoaW5nXSlcbiAgICAgICAgaW5qZWN0b3IuZ2V0KFNvbWV0aGluZylcbiAgICAgIH0pLnRvVGhyb3dFcnJvcigvT25seSBjbGFzc2VzIHdpdGggYSBwYXJlbnQgY2FuIGFzayBmb3IgU3VwZXJDb25zdHJ1Y3RvciEvKVxuICAgIH0pXG5cbiAgfSlcblxuICAvLyBpdCgnc2hvdWxkIHRocm93IGFuIGVycm9yIHdoZW4gdXNlZCBpbiBhIGNsYXNzIHdpdGhvdXQgYW55IHBhcmVudCcsIGZ1bmN0aW9uKCkge1xuICAvLyAgIGNsYXNzIFdpdGhvdXRQYXJlbnQge31cbiAgLy8gICBhbm5vdGF0ZShXaXRob3V0UGFyZW50LCBuZXcgSW5qZWN0KFN1cGVyQ29uc3RydWN0b3IpKVxuXG4gIC8vICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcblxuICAvLyAgIGV4cGVjdChmdW5jdGlvbigpIHtcbiAgLy8gICAgIGluamVjdG9yLmdldChXaXRob3V0UGFyZW50KVxuICAvLyAgIH0pLnRvVGhyb3dFcnJvcigvT25seSBjbGFzc2VzIHdpdGggYSBwYXJlbnQgY2FuIGFzayBmb3IgU3VwZXJDb25zdHJ1Y3RvciEvKVxuICAvLyB9KVxuXG4gIGl0KCdzaG91bGQgdGhyb3cgYW4gZXJyb3Igd2hlbiBudWxsL3VuZGVmaW5lZCB0b2tlbiByZXF1ZXN0ZWQnLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuXG4gICAgZXhwZWN0KGZ1bmN0aW9uKCkge1xuICAgICAgaW5qZWN0b3IuZ2V0KG51bGwpXG4gICAgfSkudG9UaHJvd0Vycm9yKC9JbnZhbGlkIHRva2VuIFwibnVsbFwiIHJlcXVlc3RlZCEvKVxuXG4gICAgZXhwZWN0KGZ1bmN0aW9uKCkge1xuICAgICAgaW5qZWN0b3IuZ2V0KHVuZGVmaW5lZClcbiAgICB9KS50b1Rocm93RXJyb3IoL0ludmFsaWQgdG9rZW4gXCJ1bmRlZmluZWRcIiByZXF1ZXN0ZWQhLylcbiAgfSlcblxuICAvLyByZWdyZXNzaW9uXG4gIGl0KCdzaG91bGQgc2hvdyB0aGUgZnVsbCBwYXRoIHdoZW4gbnVsbC91bmRlZmluZWQgdG9rZW4gcmVxdWVzdGVkJywgZnVuY3Rpb24oKSB7XG4gICAgY2xhc3MgRm9vIHt9XG4gICAgYW5ub3RhdGUoRm9vLCBuZXcgSW5qZWN0KHVuZGVmaW5lZCkpXG5cbiAgICBjbGFzcyBCYXIge31cbiAgICBhbm5vdGF0ZShCYXIsIG5ldyBJbmplY3QobnVsbCkpXG5cbiAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuXG4gICAgZXhwZWN0KGZ1bmN0aW9uKCkge1xuICAgICAgaW5qZWN0b3IuZ2V0KEZvbylcbiAgICB9KS50b1Rocm93RXJyb3IoL0ludmFsaWQgdG9rZW4gXCJ1bmRlZmluZWRcIiByZXF1ZXN0ZWQhIFxcKEZvbyAtPiB1bmRlZmluZWRcXCkvKVxuXG4gICAgZXhwZWN0KGZ1bmN0aW9uKCkge1xuICAgICAgaW5qZWN0b3IuZ2V0KEJhcilcbiAgICB9KS50b1Rocm93RXJyb3IoL0ludmFsaWQgdG9rZW4gXCJudWxsXCIgcmVxdWVzdGVkISBcXChCYXIgLT4gbnVsbFxcKS8pXG4gIH0pXG5cbiAgaXQoJ3Nob3VsZCBwcm92aWRlIGl0c2VsZicsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpXG5cbiAgICBleHBlY3QoaW5qZWN0b3IuZ2V0KEluamVjdG9yKSkudG9CZShpbmplY3RvcilcbiAgfSlcblxuICBkZXNjcmliZSgndHJhbnNpZW50JywgZnVuY3Rpb24oKSB7XG5cbiAgICBpdCgnc2hvdWxkIG5ldmVyIGNhY2hlJywgZnVuY3Rpb24oKSB7XG4gICAgICBjbGFzcyBGb28ge31cbiAgICAgIGFubm90YXRlKEZvbywgbmV3IFRyYW5zaWVudFNjb3BlKVxuXG4gICAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuICAgICAgZXhwZWN0KGluamVjdG9yLmdldChGb28pKS5ub3QudG9CZShpbmplY3Rvci5nZXQoRm9vKSlcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCBhbHdheXMgdXNlIGRlcGVuZGVuY2llcyAoZGVmYXVsdCBwcm92aWRlcnMpIGZyb20gdGhlIHlvdW5nZXN0IGluamVjdG9yJywgZnVuY3Rpb24oKSB7XG4gICAgICBjbGFzcyBGb28ge31cbiAgICAgIGFubm90YXRlKEZvbywgbmV3IEluamVjdClcblxuICAgICAgY2xhc3MgQWx3YXlzTmV3SW5zdGFuY2Uge1xuICAgICAgICBjb25zdHJ1Y3Rvcihmb28pIHtcbiAgICAgICAgICB0aGlzLmZvbyA9IGZvb1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBhbm5vdGF0ZShBbHdheXNOZXdJbnN0YW5jZSwgbmV3IFRyYW5zaWVudFNjb3BlKVxuICAgICAgYW5ub3RhdGUoQWx3YXlzTmV3SW5zdGFuY2UsIG5ldyBJbmplY3QoRm9vKSlcblxuICAgICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcbiAgICAgIHZhciBjaGlsZCA9IGluamVjdG9yLmNyZWF0ZUNoaWxkKFtGb29dKSAvLyBmb3JjZSBuZXcgaW5zdGFuY2Ugb2YgRm9vXG5cbiAgICAgIHZhciBmb29Gcm9tQ2hpbGQgPSBjaGlsZC5nZXQoRm9vKVxuICAgICAgdmFyIGZvb0Zyb21QYXJlbnQgPSBpbmplY3Rvci5nZXQoRm9vKVxuXG4gICAgICB2YXIgYWx3YXlzTmV3MSA9IGNoaWxkLmdldChBbHdheXNOZXdJbnN0YW5jZSlcbiAgICAgIHZhciBhbHdheXNOZXcyID0gY2hpbGQuZ2V0KEFsd2F5c05ld0luc3RhbmNlKVxuICAgICAgdmFyIGFsd2F5c05ld0Zyb21QYXJlbnQgPSBpbmplY3Rvci5nZXQoQWx3YXlzTmV3SW5zdGFuY2UpXG5cbiAgICAgIGV4cGVjdChhbHdheXNOZXcxLmZvbykudG9CZShmb29Gcm9tQ2hpbGQpXG4gICAgICBleHBlY3QoYWx3YXlzTmV3Mi5mb28pLnRvQmUoZm9vRnJvbUNoaWxkKVxuICAgICAgZXhwZWN0KGFsd2F5c05ld0Zyb21QYXJlbnQuZm9vKS50b0JlKGZvb0Zyb21QYXJlbnQpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgYWx3YXlzIHVzZSBkZXBlbmRlbmNpZXMgZnJvbSB0aGUgeW91bmdlc3QgaW5qZWN0b3InLCBmdW5jdGlvbigpIHtcbiAgICAgIGNsYXNzIEZvbyB7fVxuICAgICAgYW5ub3RhdGUoRm9vLCBuZXcgSW5qZWN0KVxuXG4gICAgICBjbGFzcyBBbHdheXNOZXdJbnN0YW5jZSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGZvbykge1xuICAgICAgICAgIHRoaXMuZm9vID0gZm9vXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFubm90YXRlKEFsd2F5c05ld0luc3RhbmNlLCBuZXcgVHJhbnNpZW50U2NvcGUpXG4gICAgICBhbm5vdGF0ZShBbHdheXNOZXdJbnN0YW5jZSwgbmV3IEluamVjdChGb28pKVxuXG4gICAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoW0Fsd2F5c05ld0luc3RhbmNlXSlcbiAgICAgIHZhciBjaGlsZCA9IGluamVjdG9yLmNyZWF0ZUNoaWxkKFtGb29dKSAvLyBmb3JjZSBuZXcgaW5zdGFuY2Ugb2YgRm9vXG5cbiAgICAgIHZhciBmb29Gcm9tQ2hpbGQgPSBjaGlsZC5nZXQoRm9vKVxuICAgICAgdmFyIGZvb0Zyb21QYXJlbnQgPSBpbmplY3Rvci5nZXQoRm9vKVxuXG4gICAgICB2YXIgYWx3YXlzTmV3MSA9IGNoaWxkLmdldChBbHdheXNOZXdJbnN0YW5jZSlcbiAgICAgIHZhciBhbHdheXNOZXcyID0gY2hpbGQuZ2V0KEFsd2F5c05ld0luc3RhbmNlKVxuICAgICAgdmFyIGFsd2F5c05ld0Zyb21QYXJlbnQgPSBpbmplY3Rvci5nZXQoQWx3YXlzTmV3SW5zdGFuY2UpXG5cbiAgICAgIGV4cGVjdChhbHdheXNOZXcxLmZvbykudG9CZShmb29Gcm9tQ2hpbGQpXG4gICAgICBleHBlY3QoYWx3YXlzTmV3Mi5mb28pLnRvQmUoZm9vRnJvbUNoaWxkKVxuICAgICAgZXhwZWN0KGFsd2F5c05ld0Zyb21QYXJlbnQuZm9vKS50b0JlKGZvb0Zyb21QYXJlbnQpXG4gICAgfSlcbiAgfSlcblxuICBkZXNjcmliZSgnY2hpbGQnLCBmdW5jdGlvbigpIHtcblxuICAgIGl0KCdzaG91bGQgbG9hZCBpbnN0YW5jZXMgZnJvbSBwYXJlbnQgaW5qZWN0b3InLCBmdW5jdGlvbigpIHtcbiAgICAgIGNsYXNzIENhciB7XG4gICAgICAgIHN0YXJ0KCkge31cbiAgICAgIH1cblxuICAgICAgdmFyIHBhcmVudCA9IG5ldyBJbmplY3RvcihbQ2FyXSlcbiAgICAgIHZhciBjaGlsZCA9IHBhcmVudC5jcmVhdGVDaGlsZChbXSlcblxuICAgICAgdmFyIGNhckZyb21QYXJlbnQgPSBwYXJlbnQuZ2V0KENhcilcbiAgICAgIHZhciBjYXJGcm9tQ2hpbGQgPSBjaGlsZC5nZXQoQ2FyKVxuXG4gICAgICBleHBlY3QoY2FyRnJvbUNoaWxkKS50b0JlKGNhckZyb21QYXJlbnQpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgY3JlYXRlIG5ldyBpbnN0YW5jZSBpbiBhIGNoaWxkIGluamVjdG9yJywgZnVuY3Rpb24oKSB7XG4gICAgICBjbGFzcyBDYXIge1xuICAgICAgICBzdGFydCgpIHt9XG4gICAgICB9XG5cbiAgICAgIGNsYXNzIE1vY2tDYXIge1xuICAgICAgICBzdGFydCgpIHt9XG4gICAgICB9XG4gICAgICBhbm5vdGF0ZShNb2NrQ2FyLCBuZXcgUHJvdmlkZShDYXIpKVxuXG4gICAgICB2YXIgcGFyZW50ID0gbmV3IEluamVjdG9yKFtDYXJdKVxuICAgICAgdmFyIGNoaWxkID0gcGFyZW50LmNyZWF0ZUNoaWxkKFtNb2NrQ2FyXSlcblxuICAgICAgdmFyIGNhckZyb21QYXJlbnQgPSBwYXJlbnQuZ2V0KENhcilcbiAgICAgIHZhciBjYXJGcm9tQ2hpbGQgPSBjaGlsZC5nZXQoQ2FyKVxuXG4gICAgICBleHBlY3QoY2FyRnJvbVBhcmVudCkubm90LnRvQmUoY2FyRnJvbUNoaWxkKVxuICAgICAgZXhwZWN0KGNhckZyb21DaGlsZCkudG9CZUluc3RhbmNlT2YoTW9ja0NhcilcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCBmb3JjZSBuZXcgaW5zdGFuY2VzIGJ5IGFubm90YXRpb24nLCBmdW5jdGlvbigpIHtcbiAgICAgIGNsYXNzIFJvdXRlU2NvcGUge31cblxuICAgICAgY2xhc3MgRW5naW5lIHtcbiAgICAgICAgc3RhcnQoKSB7fVxuICAgICAgfVxuXG4gICAgICBjbGFzcyBDYXIge1xuICAgICAgICBjb25zdHJ1Y3RvcihlbmdpbmUpIHtcbiAgICAgICAgICB0aGlzLmVuZ2luZSA9IGVuZ2luZVxuICAgICAgICB9XG5cbiAgICAgICAgc3RhcnQoKSB7fVxuICAgICAgfVxuICAgICAgYW5ub3RhdGUoQ2FyLCBuZXcgUm91dGVTY29wZSlcbiAgICAgIGFubm90YXRlKENhciwgbmV3IEluamVjdChFbmdpbmUpKVxuXG4gICAgICB2YXIgcGFyZW50ID0gbmV3IEluamVjdG9yKFtDYXIsIEVuZ2luZV0pXG4gICAgICB2YXIgY2hpbGQgPSBwYXJlbnQuY3JlYXRlQ2hpbGQoW10sIFtSb3V0ZVNjb3BlXSlcblxuICAgICAgdmFyIGNhckZyb21QYXJlbnQgPSBwYXJlbnQuZ2V0KENhcilcbiAgICAgIHZhciBjYXJGcm9tQ2hpbGQgPSBjaGlsZC5nZXQoQ2FyKVxuXG4gICAgICBleHBlY3QoY2FyRnJvbUNoaWxkKS5ub3QudG9CZShjYXJGcm9tUGFyZW50KVxuICAgICAgZXhwZWN0KGNhckZyb21DaGlsZC5lbmdpbmUpLnRvQmUoY2FyRnJvbVBhcmVudC5lbmdpbmUpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgZm9yY2UgbmV3IGluc3RhbmNlcyBieSBhbm5vdGF0aW9uIHVzaW5nIG92ZXJyaWRkZW4gcHJvdmlkZXInLCBmdW5jdGlvbigpIHtcbiAgICAgIGNsYXNzIFJvdXRlU2NvcGUge31cblxuICAgICAgY2xhc3MgRW5naW5lIHtcbiAgICAgICAgc3RhcnQoKSB7fVxuICAgICAgfVxuXG4gICAgICBjbGFzcyBNb2NrRW5naW5lIHtcbiAgICAgICAgc3RhcnQoKSB7fVxuICAgICAgfVxuICAgICAgYW5ub3RhdGUoTW9ja0VuZ2luZSwgbmV3IFJvdXRlU2NvcGUpXG4gICAgICBhbm5vdGF0ZShNb2NrRW5naW5lLCBuZXcgUHJvdmlkZShFbmdpbmUpKVxuXG4gICAgICB2YXIgcGFyZW50ID0gbmV3IEluamVjdG9yKFtNb2NrRW5naW5lXSlcbiAgICAgIHZhciBjaGlsZEEgPSBwYXJlbnQuY3JlYXRlQ2hpbGQoW10sIFtSb3V0ZVNjb3BlXSlcbiAgICAgIHZhciBjaGlsZEIgPSBwYXJlbnQuY3JlYXRlQ2hpbGQoW10sIFtSb3V0ZVNjb3BlXSlcblxuICAgICAgdmFyIGVuZ2luZUZyb21BID0gY2hpbGRBLmdldChFbmdpbmUpXG4gICAgICB2YXIgZW5naW5lRnJvbUIgPSBjaGlsZEIuZ2V0KEVuZ2luZSlcblxuICAgICAgZXhwZWN0KGVuZ2luZUZyb21BKS5ub3QudG9CZShlbmdpbmVGcm9tQilcbiAgICAgIGV4cGVjdChlbmdpbmVGcm9tQSkudG9CZUluc3RhbmNlT2YoTW9ja0VuZ2luZSlcbiAgICAgIGV4cGVjdChlbmdpbmVGcm9tQikudG9CZUluc3RhbmNlT2YoTW9ja0VuZ2luZSlcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCBmb3JjZSBuZXcgaW5zdGFuY2UgYnkgYW5ub3RhdGlvbiB1c2luZyB0aGUgbG93ZXN0IG92ZXJyaWRkZW4gcHJvdmlkZXInLCBmdW5jdGlvbigpIHtcbiAgICAgIGNsYXNzIFJvdXRlU2NvcGUge31cblxuICAgICAgY2xhc3MgRW5naW5lIHtcbiAgICAgICAgY29uc3RydWN0b3IoKSB7fVxuICAgICAgICBzdGFydCgpIHt9XG4gICAgICB9XG4gICAgICBhbm5vdGF0ZShFbmdpbmUsIG5ldyBSb3V0ZVNjb3BlKVxuXG4gICAgICBjbGFzcyBNb2NrRW5naW5lIHtcbiAgICAgICAgY29uc3RydWN0b3IoKSB7fVxuICAgICAgICBzdGFydCgpIHt9XG4gICAgICB9XG4gICAgICBhbm5vdGF0ZShNb2NrRW5naW5lLCBuZXcgUHJvdmlkZShFbmdpbmUpKVxuICAgICAgYW5ub3RhdGUoTW9ja0VuZ2luZSwgbmV3IFJvdXRlU2NvcGUpXG5cbiAgICAgIGNsYXNzIERvdWJsZU1vY2tFbmdpbmUge1xuICAgICAgICBzdGFydCgpIHt9XG4gICAgICB9XG4gICAgICBhbm5vdGF0ZShEb3VibGVNb2NrRW5naW5lLCBuZXcgUHJvdmlkZShFbmdpbmUpKVxuICAgICAgYW5ub3RhdGUoRG91YmxlTW9ja0VuZ2luZSwgbmV3IFJvdXRlU2NvcGUpXG5cbiAgICAgIHZhciBwYXJlbnQgPSBuZXcgSW5qZWN0b3IoW0VuZ2luZV0pXG4gICAgICB2YXIgY2hpbGQgPSBwYXJlbnQuY3JlYXRlQ2hpbGQoW01vY2tFbmdpbmVdKVxuICAgICAgdmFyIGdyYW50Q2hpbGQgPSBjaGlsZC5jcmVhdGVDaGlsZChbXSwgW1JvdXRlU2NvcGVdKVxuXG4gICAgICB2YXIgZW5naW5lRnJvbVBhcmVudCA9IHBhcmVudC5nZXQoRW5naW5lKVxuICAgICAgdmFyIGVuZ2luZUZyb21DaGlsZCA9IGNoaWxkLmdldChFbmdpbmUpXG4gICAgICB2YXIgZW5naW5lRnJvbUdyYW50Q2hpbGQgPSBncmFudENoaWxkLmdldChFbmdpbmUpXG5cbiAgICAgIGV4cGVjdChlbmdpbmVGcm9tUGFyZW50KS50b0JlSW5zdGFuY2VPZihFbmdpbmUpXG4gICAgICBleHBlY3QoZW5naW5lRnJvbUNoaWxkKS50b0JlSW5zdGFuY2VPZihNb2NrRW5naW5lKVxuICAgICAgZXhwZWN0KGVuZ2luZUZyb21HcmFudENoaWxkKS50b0JlSW5zdGFuY2VPZihNb2NrRW5naW5lKVxuICAgICAgZXhwZWN0KGVuZ2luZUZyb21HcmFudENoaWxkKS5ub3QudG9CZShlbmdpbmVGcm9tQ2hpbGQpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgc2hvdyB0aGUgZnVsbCBwYXRoIHdoZW4gbm8gcHJvdmlkZXInLCBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBwYXJlbnQgPSBuZXcgSW5qZWN0b3IoaG91c2VNb2R1bGUpXG4gICAgICB2YXIgY2hpbGQgPSBwYXJlbnQuY3JlYXRlQ2hpbGQoc2hpbnlIb3VzZU1vZHVsZSlcblxuICAgICAgZXhwZWN0KCgpID0+IGNoaWxkLmdldCgnSG91c2UnKSlcbiAgICAgICAgICAudG9UaHJvd0Vycm9yKCdObyBwcm92aWRlciBmb3IgU2luayEgKEhvdXNlIC0+IEtpdGNoZW4gLT4gU2luayknKVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIHByb3ZpZGUgaXRzZWxmJywgZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcGFyZW50ID0gbmV3IEluamVjdG9yKClcbiAgICAgIHZhciBjaGlsZCA9IHBhcmVudC5jcmVhdGVDaGlsZChbXSlcblxuICAgICAgZXhwZWN0KGNoaWxkLmdldChJbmplY3RvcikpLnRvQmUoY2hpbGQpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgY2FjaGUgZGVmYXVsdCBwcm92aWRlciBpbiBwYXJlbnQgaW5qZWN0b3InLCBmdW5jdGlvbigpIHtcbiAgICAgIGNsYXNzIEZvbyB7fVxuICAgICAgYW5ub3RhdGUoRm9vLCBuZXcgSW5qZWN0KVxuXG4gICAgICB2YXIgcGFyZW50ID0gbmV3IEluamVjdG9yKClcbiAgICAgIHZhciBjaGlsZCA9IHBhcmVudC5jcmVhdGVDaGlsZChbXSlcblxuICAgICAgdmFyIGZvb0Zyb21DaGlsZCA9IGNoaWxkLmdldChGb28pXG4gICAgICB2YXIgZm9vRnJvbVBhcmVudCA9IHBhcmVudC5nZXQoRm9vKVxuXG4gICAgICBleHBlY3QoZm9vRnJvbVBhcmVudCkudG9CZShmb29Gcm9tQ2hpbGQpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgZm9yY2UgbmV3IGluc3RhbmNlIGJ5IGFubm90YXRpb24gZm9yIGRlZmF1bHQgcHJvdmlkZXInLCBmdW5jdGlvbigpIHtcbiAgICAgIGNsYXNzIFJlcXVlc3RTY29wZSB7fVxuXG4gICAgICBjbGFzcyBGb28ge31cbiAgICAgIGFubm90YXRlKEZvbywgbmV3IEluamVjdClcbiAgICAgIGFubm90YXRlKEZvbywgbmV3IFJlcXVlc3RTY29wZSlcblxuICAgICAgdmFyIHBhcmVudCA9IG5ldyBJbmplY3RvcigpXG4gICAgICB2YXIgY2hpbGQgPSBwYXJlbnQuY3JlYXRlQ2hpbGQoW10sIFtSZXF1ZXN0U2NvcGVdKVxuXG4gICAgICB2YXIgZm9vRnJvbUNoaWxkID0gY2hpbGQuZ2V0KEZvbylcbiAgICAgIHZhciBmb29Gcm9tUGFyZW50ID0gcGFyZW50LmdldChGb28pXG5cbiAgICAgIGV4cGVjdChmb29Gcm9tUGFyZW50KS5ub3QudG9CZShmb29Gcm9tQ2hpbGQpXG4gICAgfSlcbiAgfSlcblxuICBkZXNjcmliZSgnbGF6eScsIGZ1bmN0aW9uKCkge1xuXG4gICAgaXQoJ3Nob3VsZCBpbnN0YW50aWF0ZSBsYXppbHknLCBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjb25zdHJ1Y3RvclNweSA9IGphc21pbmUuY3JlYXRlU3B5KCdjb25zdHJ1Y3RvcicpXG5cbiAgICAgIGNsYXNzIEV4cGVuc2l2ZUVuZ2luZSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgIGNvbnN0cnVjdG9yU3B5KClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjbGFzcyBDYXIge1xuICAgICAgICBjb25zdHJ1Y3RvcihjcmVhdGVFbmdpbmUpIHtcbiAgICAgICAgICB0aGlzLmVuZ2luZSA9IG51bGxcbiAgICAgICAgICB0aGlzLmNyZWF0ZUVuZ2luZSA9IGNyZWF0ZUVuZ2luZVxuICAgICAgICB9XG5cbiAgICAgICAgc3RhcnQoKSB7XG4gICAgICAgICAgdGhpcy5lbmdpbmUgPSB0aGlzLmNyZWF0ZUVuZ2luZSgpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFubm90YXRlKENhciwgbmV3IEluamVjdExhenkoRXhwZW5zaXZlRW5naW5lKSlcblxuICAgICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcbiAgICAgIHZhciBjYXIgPSBpbmplY3Rvci5nZXQoQ2FyKVxuXG4gICAgICBleHBlY3QoY29uc3RydWN0b3JTcHkpLm5vdC50b0hhdmVCZWVuQ2FsbGVkKClcblxuICAgICAgY2FyLnN0YXJ0KClcbiAgICAgIGV4cGVjdChjb25zdHJ1Y3RvclNweSkudG9IYXZlQmVlbkNhbGxlZCgpXG4gICAgICBleHBlY3QoY2FyLmVuZ2luZSkudG9CZUluc3RhbmNlT2YoRXhwZW5zaXZlRW5naW5lKVxuICAgIH0pXG5cbiAgICAvLyByZWdyZXNzaW9uXG4gICAgaXQoJ3Nob3VsZCBpbnN0YW50aWF0ZSBsYXppbHkgZnJvbSBhIHBhcmVudCBpbmplY3RvcicsIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGNvbnN0cnVjdG9yU3B5ID0gamFzbWluZS5jcmVhdGVTcHkoJ2NvbnN0cnVjdG9yJylcblxuICAgICAgY2xhc3MgRXhwZW5zaXZlRW5naW5lIHtcbiAgICAgICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgICAgY29uc3RydWN0b3JTcHkoKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNsYXNzIENhciB7XG4gICAgICAgIGNvbnN0cnVjdG9yKGNyZWF0ZUVuZ2luZSkge1xuICAgICAgICAgIHRoaXMuZW5naW5lID0gbnVsbFxuICAgICAgICAgIHRoaXMuY3JlYXRlRW5naW5lID0gY3JlYXRlRW5naW5lXG4gICAgICAgIH1cblxuICAgICAgICBzdGFydCgpIHtcbiAgICAgICAgICB0aGlzLmVuZ2luZSA9IHRoaXMuY3JlYXRlRW5naW5lKClcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYW5ub3RhdGUoQ2FyLCBuZXcgSW5qZWN0TGF6eShFeHBlbnNpdmVFbmdpbmUpKVxuXG4gICAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoW0V4cGVuc2l2ZUVuZ2luZV0pXG4gICAgICB2YXIgY2hpbGRJbmplY3RvciA9IGluamVjdG9yLmNyZWF0ZUNoaWxkKFtDYXJdKVxuICAgICAgdmFyIGNhciA9IGNoaWxkSW5qZWN0b3IuZ2V0KENhcilcblxuICAgICAgZXhwZWN0KGNvbnN0cnVjdG9yU3B5KS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpXG5cbiAgICAgIGNhci5zdGFydCgpXG4gICAgICBleHBlY3QoY29uc3RydWN0b3JTcHkpLnRvSGF2ZUJlZW5DYWxsZWQoKVxuICAgICAgZXhwZWN0KGNhci5lbmdpbmUpLnRvQmVJbnN0YW5jZU9mKEV4cGVuc2l2ZUVuZ2luZSlcbiAgICB9KVxuXG4gICAgZGVzY3JpYmUoJ3dpdGggbG9jYWxzJywgZnVuY3Rpb24oKSB7XG5cbiAgICAgIGl0KCdzaG91bGQgYWx3YXlzIGNyZWF0ZSBhIG5ldyBpbnN0YW5jZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY29uc3RydWN0b3JTcHkgPSBqYXNtaW5lLmNyZWF0ZVNweSgnY29uc3RydWN0b3InKVxuXG4gICAgICAgIGNsYXNzIEV4cGVuc2l2ZUVuZ2luZSB7XG4gICAgICAgICAgY29uc3RydWN0b3IocG93ZXIpIHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yU3B5KClcbiAgICAgICAgICAgIHRoaXMucG93ZXIgPSBwb3dlclxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhbm5vdGF0ZShFeHBlbnNpdmVFbmdpbmUsIG5ldyBUcmFuc2llbnRTY29wZSlcbiAgICAgICAgYW5ub3RhdGUoRXhwZW5zaXZlRW5naW5lLCBuZXcgSW5qZWN0KCdwb3dlcicpKVxuXG4gICAgICAgIGNsYXNzIENhciB7XG4gICAgICAgICAgY29uc3RydWN0b3IoY3JlYXRlRW5naW5lKSB7XG4gICAgICAgICAgICB0aGlzLmNyZWF0ZUVuZ2luZSA9IGNyZWF0ZUVuZ2luZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhbm5vdGF0ZShDYXIsIG5ldyBJbmplY3RMYXp5KEV4cGVuc2l2ZUVuZ2luZSkpXG5cbiAgICAgICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcbiAgICAgICAgdmFyIGNhciA9IGluamVjdG9yLmdldChDYXIpXG5cbiAgICAgICAgdmFyIHZleXJvbkVuZ2luZSA9IGNhci5jcmVhdGVFbmdpbmUoJ3Bvd2VyJywgMTE4NClcbiAgICAgICAgdmFyIG11c3RhbmdFbmdpbmUgPSBjYXIuY3JlYXRlRW5naW5lKCdwb3dlcicsIDQyMClcblxuICAgICAgICBleHBlY3QodmV5cm9uRW5naW5lKS5ub3QudG9CZShtdXN0YW5nRW5naW5lKVxuICAgICAgICBleHBlY3QodmV5cm9uRW5naW5lLnBvd2VyKS50b0JlKDExODQpXG4gICAgICAgIGV4cGVjdChtdXN0YW5nRW5naW5lLnBvd2VyKS50b0JlKDQyMClcblxuICAgICAgICB2YXIgbXVzdGFuZ0VuZ2luZTIgPSBjYXIuY3JlYXRlRW5naW5lKCdwb3dlcicsIDQyMClcbiAgICAgICAgZXhwZWN0KG11c3RhbmdFbmdpbmUpLm5vdC50b0JlKG11c3RhbmdFbmdpbmUyKVxuICAgICAgfSlcbiAgICB9KVxuICB9KVxufSlcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
