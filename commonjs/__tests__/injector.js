"use strict";

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

  it("should throw an error when used in a class without any parent", function () {
    var WithoutParent = function WithoutParent() {};

    annotate(WithoutParent, new Inject(SuperConstructor));

    var injector = new Injector();

    expect(function () {
      injector.get(WithoutParent);
    }).toThrowError(/Only classes with a parent can ask for SuperConstructor!/);
  });

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9fdGVzdHNfXy9pbmplY3Rvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTs7O0lBSWhCLFFBQVEsdUJBQVIsUUFBUTtJQUNSLGFBQWEsdUJBQWIsYUFBYTtJQUNiLGVBQWUsdUJBQWYsZUFBZTtJQUNmLFFBQVEsdUJBQVIsUUFBUTtJQUNSLE1BQU0sdUJBQU4sTUFBTTtJQUNOLFVBQVUsdUJBQVYsVUFBVTtJQUNWLGFBQWEsdUJBQWIsYUFBYTtJQUNiLE9BQU8sdUJBQVAsT0FBTztJQUNQLGNBQWMsdUJBQWQsY0FBYztJQUNkLGdCQUFnQix1QkFBaEIsZ0JBQWdCO0lBQ2hCLGNBQWMsdUJBQWQsY0FBYztJQUdSLEdBQUcsa0NBQUgsR0FBRztJQUFFLFlBQVksa0NBQVosWUFBWTtJQUNQLFdBQVcsb0NBQXJCLE1BQU07SUFDSSxnQkFBZ0IsMENBQTFCLE1BQU07Ozs7QUFHZCxRQUFRLENBQUMsVUFBVSxFQUFFLFlBQVc7QUFFOUIsb0VBQWlFO1FBQ3pELEdBQUc7VUFBSCxHQUFHLEdBQ0ksU0FEUCxHQUFHLEdBQ08sRUFBRTs7QUFEWixTQUFHLFdBRVAsS0FBSyxHQUFBLFlBQUcsRUFBRTs7YUFGTixHQUFHOzs7QUFLVCxRQUFJLFFBQVEsR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFBO0FBQzdCLFFBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7O0FBRTNCLFVBQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUE7R0FDaEMsQ0FBQyxDQUFBOztBQUVGLElBQUUsQ0FBQyx5REFBeUQsRUFBRSxZQUFXO1FBQ2pFLE1BQU07VUFBTixNQUFNLFlBQU4sTUFBTTs7QUFBTixZQUFNLFdBQ1YsS0FBSyxHQUFBLFlBQUcsRUFBRTs7YUFETixNQUFNOzs7UUFJTixHQUFHO1VBQUgsR0FBRyxHQUNJLFNBRFAsR0FBRyxDQUNLLE1BQU0sRUFBRTtBQUNsQixZQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtPQUNyQjs7QUFIRyxTQUFHLFdBS1AsS0FBSyxHQUFBLFlBQUcsRUFBRTs7YUFMTixHQUFHOzs7QUFPVCxZQUFRLENBQUMsR0FBRyxFQUFFLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7O0FBRWpDLFFBQUksUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUE7QUFDN0IsUUFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTs7QUFFM0IsVUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUMvQixVQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtHQUMxQyxDQUFDLENBQUE7O0FBRUYsSUFBRSxDQUFDLDJCQUEyQixFQUFFLFlBQVc7UUFDbkMsTUFBTSxZQUFOLE1BQU07O1FBRU4sR0FBRztVQUFILEdBQUcsR0FDSSxTQURQLEdBQUcsQ0FDSyxNQUFNLEVBQUU7QUFDbEIsWUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7T0FDckI7O0FBSEcsU0FBRyxXQUtQLEtBQUssR0FBQSxZQUFHLEVBQUU7O2FBTE4sR0FBRzs7O0FBT1QsWUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBOztRQUUzQixVQUFVO1VBQVYsVUFBVSxZQUFWLFVBQVU7O0FBQVYsZ0JBQVUsV0FDZCxLQUFLLEdBQUEsWUFBRyxFQUFFOzthQUROLFVBQVU7OztBQUdoQixZQUFRLENBQUMsVUFBVSxFQUFFLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7O0FBRXpDLFFBQUksUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtBQUN6QyxRQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBOztBQUUzQixVQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0FBQy9CLFVBQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0dBQzlDLENBQUMsQ0FBQTs7QUFFRixJQUFFLENBQUMsK0JBQStCLEVBQUUsWUFBVztRQUN2QyxJQUFJLFlBQUosSUFBSTs7QUFFVixZQUFRLENBQUMsV0FBVyxFQUFFLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7QUFDeEMsYUFBUyxXQUFXLEdBQUc7QUFDckIsYUFBTyxDQUFDLENBQUE7S0FDVDs7QUFFRCxRQUFJLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7QUFDMUMsUUFBSSxJQUFJLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTs7QUFFN0IsVUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUNyQixDQUFDLENBQUE7O0FBRUYsSUFBRSxDQUFDLHdCQUF3QixFQUFFLFlBQVc7UUFDaEMsR0FBRyxZQUFILEdBQUc7O0FBRVQsUUFBSSxRQUFRLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQTtBQUM3QixRQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBOztBQUUzQixVQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtHQUNwQyxDQUFDLENBQUE7O0FBRUYsSUFBRSxDQUFDLHVDQUF1QyxFQUFFLFlBQVc7QUFDckQsUUFBSSxRQUFRLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQTs7QUFFN0IsVUFBTSxDQUFDO2FBQU0sUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUM7S0FBQSxDQUFDLENBQ3BDLFlBQVksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO0dBQ2xELENBQUMsQ0FBQTs7QUFFRixJQUFFLENBQUMsb0RBQW9ELEVBQUUsWUFBVztBQUNsRSxRQUFJLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQTs7QUFFeEMsVUFBTSxDQUFDO2FBQU0sUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUM7S0FBQSxDQUFDLENBQzlCLFlBQVksQ0FBQyxrREFBa0QsQ0FBQyxDQUFBO0dBQ3RFLENBQUMsQ0FBQTs7QUFFRixJQUFFLENBQUMsNkRBQTZELEVBQUUsWUFBVztBQUMzRSxRQUFJLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7O0FBRTNDLFVBQU0sQ0FBQzthQUFNLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO0tBQUEsQ0FBQyxDQUMxQixZQUFZLENBQUMsOERBQThELENBQUMsQ0FBQTtHQUNsRixDQUFDLENBQUE7O0FBRUYsSUFBRSxDQUFDLCtEQUErRCxFQUFFLFlBQVc7UUFDdkUsTUFBTSxHQUNDLFNBRFAsTUFBTSxHQUNJO0FBQ1osWUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO0tBQzFDOztRQUdHLEdBQUcsR0FDSSxTQURQLEdBQUcsQ0FDSyxDQUFDLEVBQUUsRUFBRTs7QUFFbkIsWUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBOztBQUVqQyxRQUFJLFFBQVEsR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFBOztBQUU3QixVQUFNLENBQUM7YUFBTSxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztLQUFBLENBQUMsQ0FDNUIsWUFBWSxDQUFDLHlEQUF5RCxDQUFDLENBQUE7R0FDM0UsQ0FBQyxDQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW9GRixJQUFFLENBQUMsK0RBQStELEVBQUUsWUFBVztRQUN2RSxhQUFhLFlBQWIsYUFBYTs7QUFDbkIsWUFBUSxDQUFDLGFBQWEsRUFBRSxJQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7O0FBRXJELFFBQUksUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUE7O0FBRTdCLFVBQU0sQ0FBQyxZQUFXO0FBQ2hCLGNBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7S0FDNUIsQ0FBQyxDQUFDLFlBQVksQ0FBQywwREFBMEQsQ0FBQyxDQUFBO0dBQzVFLENBQUMsQ0FBQTs7QUFFRixJQUFFLENBQUMsMkRBQTJELEVBQUUsWUFBVztBQUN6RSxRQUFJLFFBQVEsR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFBOztBQUU3QixVQUFNLENBQUMsWUFBVztBQUNoQixjQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO0tBQ25CLENBQUMsQ0FBQyxZQUFZLENBQUMsaUNBQWlDLENBQUMsQ0FBQTs7QUFFbEQsVUFBTSxDQUFDLFlBQVc7QUFDaEIsY0FBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtLQUN4QixDQUFDLENBQUMsWUFBWSxDQUFDLHNDQUFzQyxDQUFDLENBQUE7R0FDeEQsQ0FBQyxDQUFBOzs7QUFHRixJQUFFLENBQUMsK0RBQStELEVBQUUsWUFBVztRQUN2RSxHQUFHLFlBQUgsR0FBRzs7QUFDVCxZQUFRLENBQUMsR0FBRyxFQUFFLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7O1FBRTlCLEdBQUcsWUFBSCxHQUFHOztBQUNULFlBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTs7QUFFL0IsUUFBSSxRQUFRLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQTs7QUFFN0IsVUFBTSxDQUFDLFlBQVc7QUFDaEIsY0FBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtLQUNsQixDQUFDLENBQUMsWUFBWSxDQUFDLDJEQUEyRCxDQUFDLENBQUE7O0FBRTVFLFVBQU0sQ0FBQyxZQUFXO0FBQ2hCLGNBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7S0FDbEIsQ0FBQyxDQUFDLFlBQVksQ0FBQyxpREFBaUQsQ0FBQyxDQUFBO0dBQ25FLENBQUMsQ0FBQTs7QUFFRixJQUFFLENBQUMsdUJBQXVCLEVBQUUsWUFBVztBQUNyQyxRQUFJLFFBQVEsR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFBOztBQUU3QixVQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtHQUM5QyxDQUFDLENBQUE7O0FBRUYsVUFBUSxDQUFDLFdBQVcsRUFBRSxZQUFXO0FBRS9CLE1BQUUsQ0FBQyxvQkFBb0IsRUFBRSxZQUFXO1VBQzVCLEdBQUcsWUFBSCxHQUFHOztBQUNULGNBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxjQUFjLEVBQUEsQ0FBQyxDQUFBOztBQUVqQyxVQUFJLFFBQVEsR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFBO0FBQzdCLFlBQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7S0FDdEQsQ0FBQyxDQUFBOztBQUVGLE1BQUUsQ0FBQywrRUFBK0UsRUFBRSxZQUFXO1VBQ3ZGLEdBQUcsWUFBSCxHQUFHOztBQUNULGNBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxNQUFNLEVBQUEsQ0FBQyxDQUFBOztVQUVuQixpQkFBaUIsR0FDVixTQURQLGlCQUFpQixDQUNULEdBQUcsRUFBRTtBQUNmLFlBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFBO09BQ2Y7O0FBRUgsY0FBUSxDQUFDLGlCQUFpQixFQUFFLElBQUksY0FBYyxFQUFBLENBQUMsQ0FBQTtBQUMvQyxjQUFRLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTs7QUFFNUMsVUFBSSxRQUFRLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQTtBQUM3QixVQUFJLEtBQUssR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTs7QUFFdkMsVUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUNqQyxVQUFJLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBOztBQUVyQyxVQUFJLFVBQVUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7QUFDN0MsVUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0FBQzdDLFVBQUksbUJBQW1CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBOztBQUV6RCxZQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtBQUN6QyxZQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtBQUN6QyxZQUFNLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO0tBQ3BELENBQUMsQ0FBQTs7QUFFRixNQUFFLENBQUMsMkRBQTJELEVBQUUsWUFBVztVQUNuRSxHQUFHLFlBQUgsR0FBRzs7QUFDVCxjQUFRLENBQUMsR0FBRyxFQUFFLElBQUksTUFBTSxFQUFBLENBQUMsQ0FBQTs7VUFFbkIsaUJBQWlCLEdBQ1YsU0FEUCxpQkFBaUIsQ0FDVCxHQUFHLEVBQUU7QUFDZixZQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQTtPQUNmOztBQUVILGNBQVEsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLGNBQWMsRUFBQSxDQUFDLENBQUE7QUFDL0MsY0FBUSxDQUFDLGlCQUFpQixFQUFFLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7O0FBRTVDLFVBQUksUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO0FBQ2hELFVBQUksS0FBSyxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBOztBQUV2QyxVQUFJLFlBQVksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0FBQ2pDLFVBQUksYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7O0FBRXJDLFVBQUksVUFBVSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtBQUM3QyxVQUFJLFVBQVUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7QUFDN0MsVUFBSSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7O0FBRXpELFlBQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO0FBQ3pDLFlBQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO0FBQ3pDLFlBQU0sQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUE7S0FDcEQsQ0FBQyxDQUFBO0dBQ0gsQ0FBQyxDQUFBOztBQUVGLFVBQVEsQ0FBQyxPQUFPLEVBQUUsWUFBVztBQUUzQixNQUFFLENBQUMsNENBQTRDLEVBQUUsWUFBVztVQUNwRCxHQUFHO1lBQUgsR0FBRyxZQUFILEdBQUc7O0FBQUgsV0FBRyxXQUNQLEtBQUssR0FBQSxZQUFHLEVBQUU7O2VBRE4sR0FBRzs7O0FBSVQsVUFBSSxNQUFNLEdBQUcsSUFBSSxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBQ2hDLFVBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUE7O0FBRWxDLFVBQUksYUFBYSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDbkMsVUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTs7QUFFakMsWUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtLQUN6QyxDQUFDLENBQUE7O0FBRUYsTUFBRSxDQUFDLGdEQUFnRCxFQUFFLFlBQVc7VUFDeEQsR0FBRztZQUFILEdBQUcsWUFBSCxHQUFHOztBQUFILFdBQUcsV0FDUCxLQUFLLEdBQUEsWUFBRyxFQUFFOztlQUROLEdBQUc7OztVQUlILE9BQU87WUFBUCxPQUFPLFlBQVAsT0FBTzs7QUFBUCxlQUFPLFdBQ1gsS0FBSyxHQUFBLFlBQUcsRUFBRTs7ZUFETixPQUFPOzs7QUFHYixjQUFRLENBQUMsT0FBTyxFQUFFLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7O0FBRW5DLFVBQUksTUFBTSxHQUFHLElBQUksUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUNoQyxVQUFJLEtBQUssR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTs7QUFFekMsVUFBSSxhQUFhLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUNuQyxVQUFJLFlBQVksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBOztBQUVqQyxZQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtBQUM1QyxZQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0tBQzdDLENBQUMsQ0FBQTs7QUFFRixNQUFFLENBQUMsMENBQTBDLEVBQUUsWUFBVztVQUNsRCxVQUFVLFlBQVYsVUFBVTs7VUFFVixNQUFNO1lBQU4sTUFBTSxZQUFOLE1BQU07O0FBQU4sY0FBTSxXQUNWLEtBQUssR0FBQSxZQUFHLEVBQUU7O2VBRE4sTUFBTTs7O1VBSU4sR0FBRztZQUFILEdBQUcsR0FDSSxTQURQLEdBQUcsQ0FDSyxNQUFNLEVBQUU7QUFDbEIsY0FBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7U0FDckI7O0FBSEcsV0FBRyxXQUtQLEtBQUssR0FBQSxZQUFHLEVBQUU7O2VBTE4sR0FBRzs7O0FBT1QsY0FBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLFVBQVUsRUFBQSxDQUFDLENBQUE7QUFDN0IsY0FBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBOztBQUVqQyxVQUFJLE1BQU0sR0FBRyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO0FBQ3hDLFVBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTs7QUFFaEQsVUFBSSxhQUFhLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUNuQyxVQUFJLFlBQVksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBOztBQUVqQyxZQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtBQUM1QyxZQUFNLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7S0FDdkQsQ0FBQyxDQUFBOztBQUVGLE1BQUUsQ0FBQyxvRUFBb0UsRUFBRSxZQUFXO1VBQzVFLFVBQVUsWUFBVixVQUFVOztVQUVWLE1BQU07WUFBTixNQUFNLFlBQU4sTUFBTTs7QUFBTixjQUFNLFdBQ1YsS0FBSyxHQUFBLFlBQUcsRUFBRTs7ZUFETixNQUFNOzs7VUFJTixVQUFVO1lBQVYsVUFBVSxZQUFWLFVBQVU7O0FBQVYsa0JBQVUsV0FDZCxLQUFLLEdBQUEsWUFBRyxFQUFFOztlQUROLFVBQVU7OztBQUdoQixjQUFRLENBQUMsVUFBVSxFQUFFLElBQUksVUFBVSxFQUFBLENBQUMsQ0FBQTtBQUNwQyxjQUFRLENBQUMsVUFBVSxFQUFFLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7O0FBRXpDLFVBQUksTUFBTSxHQUFHLElBQUksUUFBUSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtBQUN2QyxVQUFJLE1BQU0sR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7QUFDakQsVUFBSSxNQUFNLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBOztBQUVqRCxVQUFJLFdBQVcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQ3BDLFVBQUksV0FBVyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7O0FBRXBDLFlBQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0FBQ3pDLFlBQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUE7QUFDOUMsWUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtLQUMvQyxDQUFDLENBQUE7O0FBRUYsTUFBRSxDQUFDLDhFQUE4RSxFQUFFLFlBQVc7VUFDdEYsVUFBVSxZQUFWLFVBQVU7O1VBRVYsTUFBTTtZQUFOLE1BQU0sR0FDQyxTQURQLE1BQU0sR0FDSSxFQUFFOztBQURaLGNBQU0sV0FFVixLQUFLLEdBQUEsWUFBRyxFQUFFOztlQUZOLE1BQU07OztBQUlaLGNBQVEsQ0FBQyxNQUFNLEVBQUUsSUFBSSxVQUFVLEVBQUEsQ0FBQyxDQUFBOztVQUUxQixVQUFVO1lBQVYsVUFBVSxHQUNILFNBRFAsVUFBVSxHQUNBLEVBQUU7O0FBRFosa0JBQVUsV0FFZCxLQUFLLEdBQUEsWUFBRyxFQUFFOztlQUZOLFVBQVU7OztBQUloQixjQUFRLENBQUMsVUFBVSxFQUFFLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7QUFDekMsY0FBUSxDQUFDLFVBQVUsRUFBRSxJQUFJLFVBQVUsRUFBQSxDQUFDLENBQUE7O1VBRTlCLGdCQUFnQjtZQUFoQixnQkFBZ0IsWUFBaEIsZ0JBQWdCOztBQUFoQix3QkFBZ0IsV0FDcEIsS0FBSyxHQUFBLFlBQUcsRUFBRTs7ZUFETixnQkFBZ0I7OztBQUd0QixjQUFRLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtBQUMvQyxjQUFRLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxVQUFVLEVBQUEsQ0FBQyxDQUFBOztBQUUxQyxVQUFJLE1BQU0sR0FBRyxJQUFJLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7QUFDbkMsVUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7QUFDNUMsVUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBOztBQUVwRCxVQUFJLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7QUFDekMsVUFBSSxlQUFlLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtBQUN2QyxVQUFJLG9CQUFvQixHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7O0FBRWpELFlBQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtBQUMvQyxZQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0FBQ2xELFlBQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtBQUN2RCxZQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO0tBQ3ZELENBQUMsQ0FBQTs7QUFFRixNQUFFLENBQUMsNENBQTRDLEVBQUUsWUFBVztBQUMxRCxVQUFJLE1BQU0sR0FBRyxJQUFJLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQTtBQUN0QyxVQUFJLEtBQUssR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUE7O0FBRWhELFlBQU0sQ0FBQztlQUFNLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDO09BQUEsQ0FBQyxDQUMzQixZQUFZLENBQUMsa0RBQWtELENBQUMsQ0FBQTtLQUN0RSxDQUFDLENBQUE7O0FBRUYsTUFBRSxDQUFDLHVCQUF1QixFQUFFLFlBQVc7QUFDckMsVUFBSSxNQUFNLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQTtBQUMzQixVQUFJLEtBQUssR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFBOztBQUVsQyxZQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtLQUN4QyxDQUFDLENBQUE7O0FBRUYsTUFBRSxDQUFDLGtEQUFrRCxFQUFFLFlBQVc7VUFDMUQsR0FBRyxZQUFILEdBQUc7O0FBQ1QsY0FBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLE1BQU0sRUFBQSxDQUFDLENBQUE7O0FBRXpCLFVBQUksTUFBTSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUE7QUFDM0IsVUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQTs7QUFFbEMsVUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUNqQyxVQUFJLGFBQWEsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBOztBQUVuQyxZQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO0tBQ3pDLENBQUMsQ0FBQTs7QUFFRixNQUFFLENBQUMsOERBQThELEVBQUUsWUFBVztVQUN0RSxZQUFZLFlBQVosWUFBWTs7VUFFWixHQUFHLFlBQUgsR0FBRzs7QUFDVCxjQUFRLENBQUMsR0FBRyxFQUFFLElBQUksTUFBTSxFQUFBLENBQUMsQ0FBQTtBQUN6QixjQUFRLENBQUMsR0FBRyxFQUFFLElBQUksWUFBWSxFQUFBLENBQUMsQ0FBQTs7QUFFL0IsVUFBSSxNQUFNLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQTtBQUMzQixVQUFJLEtBQUssR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7O0FBRWxELFVBQUksWUFBWSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDakMsVUFBSSxhQUFhLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTs7QUFFbkMsWUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7S0FDN0MsQ0FBQyxDQUFBO0dBQ0gsQ0FBQyxDQUFBOztBQUVGLFVBQVEsQ0FBQyxNQUFNLEVBQUUsWUFBVztBQUUxQixNQUFFLENBQUMsMkJBQTJCLEVBQUUsWUFBVztBQUN6QyxVQUFJLGNBQWMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFBOztVQUUvQyxlQUFlLEdBQ1IsU0FEUCxlQUFlLEdBQ0w7QUFDWixzQkFBYyxFQUFFLENBQUE7T0FDakI7O1VBR0csR0FBRztZQUFILEdBQUcsR0FDSSxTQURQLEdBQUcsQ0FDSyxZQUFZLEVBQUU7QUFDeEIsY0FBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUE7QUFDbEIsY0FBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUE7U0FDakM7O0FBSkcsV0FBRyxXQU1QLEtBQUssR0FBQSxZQUFHO0FBQ04sY0FBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7U0FDbEM7O2VBUkcsR0FBRzs7O0FBVVQsY0FBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFBOztBQUU5QyxVQUFJLFFBQVEsR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFBO0FBQzdCLFVBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7O0FBRTNCLFlBQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTs7QUFFN0MsU0FBRyxDQUFDLEtBQUssRUFBRSxDQUFBO0FBQ1gsWUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLENBQUE7QUFDekMsWUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUE7S0FDbkQsQ0FBQyxDQUFBOzs7QUFHRixNQUFFLENBQUMsa0RBQWtELEVBQUUsWUFBVztBQUNoRSxVQUFJLGNBQWMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFBOztVQUUvQyxlQUFlLEdBQ1IsU0FEUCxlQUFlLEdBQ0w7QUFDWixzQkFBYyxFQUFFLENBQUE7T0FDakI7O1VBR0csR0FBRztZQUFILEdBQUcsR0FDSSxTQURQLEdBQUcsQ0FDSyxZQUFZLEVBQUU7QUFDeEIsY0FBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUE7QUFDbEIsY0FBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUE7U0FDakM7O0FBSkcsV0FBRyxXQU1QLEtBQUssR0FBQSxZQUFHO0FBQ04sY0FBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7U0FDbEM7O2VBUkcsR0FBRzs7O0FBVVQsY0FBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFBOztBQUU5QyxVQUFJLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUE7QUFDOUMsVUFBSSxhQUFhLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFDL0MsVUFBSSxHQUFHLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTs7QUFFaEMsWUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBOztBQUU3QyxTQUFHLENBQUMsS0FBSyxFQUFFLENBQUE7QUFDWCxZQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtBQUN6QyxZQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQTtLQUNuRCxDQUFDLENBQUE7O0FBRUYsWUFBUSxDQUFDLGFBQWEsRUFBRSxZQUFXO0FBRWpDLFFBQUUsQ0FBQyxxQ0FBcUMsRUFBRSxZQUFXO0FBQ25ELFlBQUksY0FBYyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUE7O1lBRS9DLGVBQWUsR0FDUixTQURQLGVBQWUsQ0FDUCxLQUFLLEVBQUU7QUFDakIsd0JBQWMsRUFBRSxDQUFBO0FBQ2hCLGNBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1NBQ25COztBQUVILGdCQUFRLENBQUMsZUFBZSxFQUFFLElBQUksY0FBYyxFQUFBLENBQUMsQ0FBQTtBQUM3QyxnQkFBUSxDQUFDLGVBQWUsRUFBRSxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBOztZQUV4QyxHQUFHLEdBQ0ksU0FEUCxHQUFHLENBQ0ssWUFBWSxFQUFFO0FBQ3hCLGNBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFBO1NBQ2pDOztBQUVILGdCQUFRLENBQUMsR0FBRyxFQUFFLElBQUksVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUE7O0FBRTlDLFlBQUksUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUE7QUFDN0IsWUFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTs7QUFFM0IsWUFBSSxZQUFZLEdBQUcsR0FBRyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7QUFDbEQsWUFBSSxhQUFhLEdBQUcsR0FBRyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUE7O0FBRWxELGNBQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO0FBQzVDLGNBQU0sQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ3JDLGNBQU0sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBOztBQUVyQyxZQUFJLGNBQWMsR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQTtBQUNuRCxjQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQTtPQUMvQyxDQUFDLENBQUE7S0FDSCxDQUFDLENBQUE7R0FDSCxDQUFDLENBQUE7Q0FDSCxDQUFDLENBQUEiLCJmaWxlIjoiX190ZXN0c19fL2luamVjdG9yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiamVzdC5hdXRvTW9ja09mZigpXG5pbXBvcnQgJzZ0bzUvcG9seWZpbGwnXG5cbmltcG9ydCB7XG4gIGFubm90YXRlLFxuICBoYXNBbm5vdGF0aW9uLFxuICByZWFkQW5ub3RhdGlvbnMsXG4gIEluamVjdG9yLFxuICBJbmplY3QsXG4gIEluamVjdExhenksXG4gIEluamVjdFByb21pc2UsXG4gIFByb3ZpZGUsXG4gIFByb3ZpZGVQcm9taXNlLFxuICBTdXBlckNvbnN0cnVjdG9yLFxuICBUcmFuc2llbnRTY29wZVxufSBmcm9tICcuLi9pbmRleCdcblxuaW1wb3J0IHtDYXIsIEN5Y2xpY0VuZ2luZX0gZnJvbSAnLi4vX19maXh0dXJlc19fL2NhcidcbmltcG9ydCB7bW9kdWxlIGFzIGhvdXNlTW9kdWxlfSBmcm9tICcuLi9fX2ZpeHR1cmVzX18vaG91c2UnXG5pbXBvcnQge21vZHVsZSBhcyBzaGlueUhvdXNlTW9kdWxlfSBmcm9tICcuLi9fX2ZpeHR1cmVzX18vc2hpbnlfaG91c2UnXG5cblxuZGVzY3JpYmUoJ2luamVjdG9yJywgZnVuY3Rpb24oKSB7XG5cbiAgaXQoJ3Nob3VsZCBpbnN0YW50aWF0ZSBhIGNsYXNzIHdpdGhvdXQgZGVwZW5kZW5jaWVzJywgZnVuY3Rpb24oKSB7XG4gICAgY2xhc3MgQ2FyIHtcbiAgICAgIGNvbnN0cnVjdG9yKCkge31cbiAgICAgIHN0YXJ0KCkge31cbiAgICB9XG5cbiAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuICAgIHZhciBjYXIgPSBpbmplY3Rvci5nZXQoQ2FyKVxuXG4gICAgZXhwZWN0KGNhcikudG9CZUluc3RhbmNlT2YoQ2FyKVxuICB9KVxuXG4gIGl0KCdzaG91bGQgcmVzb2x2ZSBkZXBlbmRlbmNpZXMgYmFzZWQgb24gQEluamVjdCBhbm5vdGF0aW9uJywgZnVuY3Rpb24oKSB7XG4gICAgY2xhc3MgRW5naW5lIHtcbiAgICAgIHN0YXJ0KCkge31cbiAgICB9XG5cbiAgICBjbGFzcyBDYXIge1xuICAgICAgY29uc3RydWN0b3IoZW5naW5lKSB7XG4gICAgICAgIHRoaXMuZW5naW5lID0gZW5naW5lXG4gICAgICB9XG5cbiAgICAgIHN0YXJ0KCkge31cbiAgICB9XG4gICAgYW5ub3RhdGUoQ2FyLCBuZXcgSW5qZWN0KEVuZ2luZSkpXG5cbiAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuICAgIHZhciBjYXIgPSBpbmplY3Rvci5nZXQoQ2FyKVxuXG4gICAgZXhwZWN0KGNhcikudG9CZUluc3RhbmNlT2YoQ2FyKVxuICAgIGV4cGVjdChjYXIuZW5naW5lKS50b0JlSW5zdGFuY2VPZihFbmdpbmUpXG4gIH0pXG5cbiAgaXQoJ3Nob3VsZCBvdmVycmlkZSBwcm92aWRlcnMnLCBmdW5jdGlvbigpIHtcbiAgICBjbGFzcyBFbmdpbmUge31cblxuICAgIGNsYXNzIENhciB7XG4gICAgICBjb25zdHJ1Y3RvcihlbmdpbmUpIHtcbiAgICAgICAgdGhpcy5lbmdpbmUgPSBlbmdpbmVcbiAgICAgIH1cblxuICAgICAgc3RhcnQoKSB7fVxuICAgIH1cbiAgICBhbm5vdGF0ZShDYXIsIG5ldyBJbmplY3QoRW5naW5lKSlcblxuICAgIGNsYXNzIE1vY2tFbmdpbmUge1xuICAgICAgc3RhcnQoKSB7fVxuICAgIH1cbiAgICBhbm5vdGF0ZShNb2NrRW5naW5lLCBuZXcgUHJvdmlkZShFbmdpbmUpKVxuXG4gICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKFtNb2NrRW5naW5lXSlcbiAgICB2YXIgY2FyID0gaW5qZWN0b3IuZ2V0KENhcilcblxuICAgIGV4cGVjdChjYXIpLnRvQmVJbnN0YW5jZU9mKENhcilcbiAgICBleHBlY3QoY2FyLmVuZ2luZSkudG9CZUluc3RhbmNlT2YoTW9ja0VuZ2luZSlcbiAgfSlcblxuICBpdCgnc2hvdWxkIGFsbG93IGZhY3RvcnkgZnVuY3Rpb24nLCBmdW5jdGlvbigpIHtcbiAgICBjbGFzcyBTaXplIHt9XG5cbiAgICBhbm5vdGF0ZShjb21wdXRlU2l6ZSwgbmV3IFByb3ZpZGUoU2l6ZSkpXG4gICAgZnVuY3Rpb24gY29tcHV0ZVNpemUoKSB7XG4gICAgICByZXR1cm4gMFxuICAgIH1cblxuICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcihbY29tcHV0ZVNpemVdKVxuICAgIHZhciBzaXplID0gaW5qZWN0b3IuZ2V0KFNpemUpXG5cbiAgICBleHBlY3Qoc2l6ZSkudG9CZSgwKVxuICB9KVxuXG4gIGl0KCdzaG91bGQgY2FjaGUgaW5zdGFuY2VzJywgZnVuY3Rpb24oKSB7XG4gICAgY2xhc3MgQ2FyIHt9XG5cbiAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuICAgIHZhciBjYXIgPSBpbmplY3Rvci5nZXQoQ2FyKVxuXG4gICAgZXhwZWN0KGluamVjdG9yLmdldChDYXIpKS50b0JlKGNhcilcbiAgfSlcblxuICBpdCgnc2hvdWxkIHRocm93IHdoZW4gbm8gcHJvdmlkZXIgZGVmaW5lZCcsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpXG5cbiAgICBleHBlY3QoKCkgPT4gaW5qZWN0b3IuZ2V0KCdOb25FeGlzdGluZycpKVxuICAgICAgICAudG9UaHJvd0Vycm9yKCdObyBwcm92aWRlciBmb3IgTm9uRXhpc3RpbmchJylcbiAgfSlcblxuICBpdCgnc2hvdWxkIHNob3cgdGhlIGZ1bGwgcGF0aCB3aGVuIG5vIHByb3ZpZGVyIGRlZmluZWQnLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoaG91c2VNb2R1bGUpXG5cbiAgICBleHBlY3QoKCkgPT4gaW5qZWN0b3IuZ2V0KCdIb3VzZScpKVxuICAgICAgICAudG9UaHJvd0Vycm9yKCdObyBwcm92aWRlciBmb3IgU2luayEgKEhvdXNlIC0+IEtpdGNoZW4gLT4gU2luayknKVxuICB9KVxuXG4gIGl0KCdzaG91bGQgdGhyb3cgd2hlbiB0cnlpbmcgdG8gaW5zdGFudGlhdGUgYSBjeWNsaWMgZGVwZW5kZW5jeScsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcihbQ3ljbGljRW5naW5lXSlcblxuICAgIGV4cGVjdCgoKSA9PiBpbmplY3Rvci5nZXQoQ2FyKSlcbiAgICAgICAgLnRvVGhyb3dFcnJvcignQ2Fubm90IGluc3RhbnRpYXRlIGN5Y2xpYyBkZXBlbmRlbmN5ISAoQ2FyIC0+IEVuZ2luZSAtPiBDYXIpJylcbiAgfSlcblxuICBpdCgnc2hvdWxkIHNob3cgdGhlIGZ1bGwgcGF0aCB3aGVuIGVycm9yIGhhcHBlbnMgaW4gYSBjb25zdHJ1Y3RvcicsIGZ1bmN0aW9uKCkge1xuICAgIGNsYXNzIEVuZ2luZSB7XG4gICAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGlzIGVuZ2luZSBpcyBicm9rZW4hJylcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjbGFzcyBDYXIge1xuICAgICAgY29uc3RydWN0b3IoZSkge31cbiAgICB9XG4gICAgYW5ub3RhdGUoQ2FyLCBuZXcgSW5qZWN0KEVuZ2luZSkpXG5cbiAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuXG4gICAgZXhwZWN0KCgpID0+IGluamVjdG9yLmdldChDYXIpKVxuICAgICAgLnRvVGhyb3dFcnJvcigvRXJyb3IgZHVyaW5nIGluc3RhbnRpYXRpb24gb2YgRW5naW5lISBcXChDYXIgLT4gRW5naW5lXFwpLylcbiAgfSlcblxuICAvLyBkZXNjcmliZSgnU3VwZXJDb25zdHJ1Y3RvcicsIGZ1bmN0aW9uICgpIHtcblxuICAvLyAgIGl0KCdzaG91bGQgc3VwcG9ydCBcInN1cGVyXCIgdG8gY2FsbCBhIHBhcmVudCBjb25zdHJ1Y3RvcicsIGZ1bmN0aW9uKCkge1xuICAvLyAgICAgY2xhc3MgU29tZXRoaW5nIHt9XG5cbiAgLy8gICAgIGNsYXNzIFBhcmVudCB7XG4gIC8vICAgICAgIGNvbnN0cnVjdG9yKHNvbWV0aGluZykge1xuICAvLyAgICAgICAgIHRoaXMucGFyZW50U29tZXRoaW5nID0gc29tZXRoaW5nXG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cbiAgLy8gICAgIGFubm90YXRlKFBhcmVudCwgbmV3IEluamVjdChTb21ldGhpbmcpKVxuXG4gIC8vICAgICBjbGFzcyBDaGlsZCBleHRlbmRzIFBhcmVudCB7XG4gIC8vICAgICAgIGNvbnN0cnVjdG9yKHN1cGVyQ29uc3RydWN0b3IsIHNvbWV0aGluZykge1xuICAvLyAgICAgICAgIHN1cGVyQ29uc3RydWN0b3IoKVxuICAvLyAgICAgICAgIHRoaXMuY2hpbGRTb21ldGhpbmcgPSBzb21ldGhpbmdcbiAgLy8gICAgICAgfVxuICAvLyAgICAgfVxuICAvLyAgICAgYW5ub3RhdGUoQ2hpbGQsIG5ldyBTdXBlckNvbnN0cnVjdG9yLCBuZXcgU29tZXRoaW5nKVxuXG4gIC8vICAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuICAvLyAgICAgdmFyIGluc3RhbmNlID0gaW5qZWN0b3IuZ2V0KENoaWxkKVxuXG4gIC8vICAgICBleHBlY3QoaW5zdGFuY2UucGFyZW50U29tZXRoaW5nKS50b0JlSW5zdGFuY2VPZihTb21ldGhpbmcpXG4gIC8vICAgICBleHBlY3QoaW5zdGFuY2UuY2hpbGRTb21ldGhpbmcpLnRvQmVJbnN0YW5jZU9mKFNvbWV0aGluZylcbiAgLy8gICAgIGV4cGVjdChpbnN0YW5jZS5jaGlsZFNvbWV0aGluZykudG9CZShpbnN0YW5jZS5wYXJlbnRTb21ldGhpbmcpXG4gIC8vICAgfSlcblxuICAvLyAgIGl0KCdzaG91bGQgc3VwcG9ydCBcInN1cGVyXCIgdG8gY2FsbCBtdWx0aXBsZSBwYXJlbnQgY29uc3RydWN0b3JzJywgZnVuY3Rpb24oKSB7XG4gIC8vICAgICBjbGFzcyBGb28ge31cbiAgLy8gICAgIGNsYXNzIEJhciB7fVxuXG4gIC8vICAgICBjbGFzcyBQYXJlbnQge1xuICAvLyAgICAgICBjb25zdHJ1Y3Rvcihmb28pIHtcbiAgLy8gICAgICAgICB0aGlzLnBhcmVudEZvbyA9IGZvb1xuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgICBhbm5vdGF0ZShQYXJlbnQsIG5ldyBJbmplY3QoRm9vKSlcblxuICAvLyAgICAgY2xhc3MgQ2hpbGQgZXh0ZW5kcyBQYXJlbnQge1xuICAvLyAgICAgICBjb25zdHJ1Y3RvcihzdXBlckNvbnN0cnVjdG9yLCBmb28pIHtcbiAgLy8gICAgICAgICBzdXBlckNvbnN0cnVjdG9yKClcbiAgLy8gICAgICAgICB0aGlzLmNoaWxkRm9vID0gZm9vXG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cbiAgLy8gICAgIGFubm90YXRlKENoaWxkLCBuZXcgU3VwZXJDb25zdHJ1Y3RvciwgbmV3IEZvbylcblxuICAvLyAgICAgY2xhc3MgR3JhbmRDaGlsZCBleHRlbmRzIENoaWxkIHtcbiAgLy8gICAgICAgY29uc3RydWN0b3IoYmFyLCBzdXBlckNvbnN0cnVjdG9yLCBmb28pIHtcbiAgLy8gICAgICAgICBzdXBlckNvbnN0cnVjdG9yKClcbiAgLy8gICAgICAgICB0aGlzLmdyYW5kQ2hpbGRCYXIgPSBiYXJcbiAgLy8gICAgICAgICB0aGlzLmdyYW5kQ2hpbGRGb28gPSBmb29cbiAgLy8gICAgICAgfVxuICAvLyAgICAgfVxuICAvLyAgICAgYW5ub3RhdGUoR3JhbmRDaGlsZCwgbmV3IFN1cGVyQ29uc3RydWN0b3IsIG5ldyBGb28pXG5cbiAgLy8gICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpXG4gIC8vICAgICB2YXIgaW5zdGFuY2UgPSBpbmplY3Rvci5nZXQoR3JhbmRDaGlsZClcblxuICAvLyAgICAgZXhwZWN0KGluc3RhbmNlLnBhcmVudEZvbykudG9CZUluc3RhbmNlT2YoRm9vKVxuICAvLyAgICAgZXhwZWN0KGluc3RhbmNlLmNoaWxkRm9vKS50b0JlSW5zdGFuY2VPZihGb28pXG4gIC8vICAgICBleHBlY3QoaW5zdGFuY2UuZ3JhbmRDaGlsZEZvbykudG9CZUluc3RhbmNlT2YoRm9vKVxuICAvLyAgICAgZXhwZWN0KGluc3RhbmNlLmdyYW5kQ2hpbGRCYXIpLnRvQmVJbnN0YW5jZU9mKEJhcilcbiAgLy8gICB9KVxuXG4gIC8vICAgaXQoJ3Nob3VsZCB0aHJvdyBhbiBlcnJvciB3aGVuIHVzZWQgaW4gYSBmYWN0b3J5IGZ1bmN0aW9uJywgZnVuY3Rpb24oKSB7XG4gIC8vICAgICBjbGFzcyBTb21ldGhpbmcge31cblxuICAvLyAgICAgYW5ub3RhdGUoY3JlYXRlU29tZXRoaW5nLCBuZXcgUHJvdmlkZShTb21ldGhpbmcpKVxuICAvLyAgICAgYW5ub3RhdGUoY3JlYXRlU29tZXRoaW5nLCBuZXcgSW5qZWN0KFN1cGVyQ29uc3RydWN0b3IpKVxuICAvLyAgICAgZnVuY3Rpb24gY3JlYXRlU29tZXRoaW5nKHBhcmVudCkge1xuICAvLyAgICAgICBjb25zb2xlLmxvZygnaW5pdCcsIHBhcmVudClcbiAgLy8gICAgIH1cblxuICAvLyAgICAgZXhwZWN0KGZ1bmN0aW9uKCkge1xuICAvLyAgICAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoW2NyZWF0ZVNvbWV0aGluZ10pXG4gIC8vICAgICAgIGluamVjdG9yLmdldChTb21ldGhpbmcpXG4gIC8vICAgICB9KS50b1Rocm93RXJyb3IoL09ubHkgY2xhc3NlcyB3aXRoIGEgcGFyZW50IGNhbiBhc2sgZm9yIFN1cGVyQ29uc3RydWN0b3IhLylcbiAgLy8gICB9KVxuXG4gIC8vIH0pXG5cbiAgaXQoJ3Nob3VsZCB0aHJvdyBhbiBlcnJvciB3aGVuIHVzZWQgaW4gYSBjbGFzcyB3aXRob3V0IGFueSBwYXJlbnQnLCBmdW5jdGlvbigpIHtcbiAgICBjbGFzcyBXaXRob3V0UGFyZW50IHt9XG4gICAgYW5ub3RhdGUoV2l0aG91dFBhcmVudCwgbmV3IEluamVjdChTdXBlckNvbnN0cnVjdG9yKSlcblxuICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpXG5cbiAgICBleHBlY3QoZnVuY3Rpb24oKSB7XG4gICAgICBpbmplY3Rvci5nZXQoV2l0aG91dFBhcmVudClcbiAgICB9KS50b1Rocm93RXJyb3IoL09ubHkgY2xhc3NlcyB3aXRoIGEgcGFyZW50IGNhbiBhc2sgZm9yIFN1cGVyQ29uc3RydWN0b3IhLylcbiAgfSlcblxuICBpdCgnc2hvdWxkIHRocm93IGFuIGVycm9yIHdoZW4gbnVsbC91bmRlZmluZWQgdG9rZW4gcmVxdWVzdGVkJywgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcblxuICAgIGV4cGVjdChmdW5jdGlvbigpIHtcbiAgICAgIGluamVjdG9yLmdldChudWxsKVxuICAgIH0pLnRvVGhyb3dFcnJvcigvSW52YWxpZCB0b2tlbiBcIm51bGxcIiByZXF1ZXN0ZWQhLylcblxuICAgIGV4cGVjdChmdW5jdGlvbigpIHtcbiAgICAgIGluamVjdG9yLmdldCh1bmRlZmluZWQpXG4gICAgfSkudG9UaHJvd0Vycm9yKC9JbnZhbGlkIHRva2VuIFwidW5kZWZpbmVkXCIgcmVxdWVzdGVkIS8pXG4gIH0pXG5cbiAgLy8gcmVncmVzc2lvblxuICBpdCgnc2hvdWxkIHNob3cgdGhlIGZ1bGwgcGF0aCB3aGVuIG51bGwvdW5kZWZpbmVkIHRva2VuIHJlcXVlc3RlZCcsIGZ1bmN0aW9uKCkge1xuICAgIGNsYXNzIEZvbyB7fVxuICAgIGFubm90YXRlKEZvbywgbmV3IEluamVjdCh1bmRlZmluZWQpKVxuXG4gICAgY2xhc3MgQmFyIHt9XG4gICAgYW5ub3RhdGUoQmFyLCBuZXcgSW5qZWN0KG51bGwpKVxuXG4gICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcblxuICAgIGV4cGVjdChmdW5jdGlvbigpIHtcbiAgICAgIGluamVjdG9yLmdldChGb28pXG4gICAgfSkudG9UaHJvd0Vycm9yKC9JbnZhbGlkIHRva2VuIFwidW5kZWZpbmVkXCIgcmVxdWVzdGVkISBcXChGb28gLT4gdW5kZWZpbmVkXFwpLylcblxuICAgIGV4cGVjdChmdW5jdGlvbigpIHtcbiAgICAgIGluamVjdG9yLmdldChCYXIpXG4gICAgfSkudG9UaHJvd0Vycm9yKC9JbnZhbGlkIHRva2VuIFwibnVsbFwiIHJlcXVlc3RlZCEgXFwoQmFyIC0+IG51bGxcXCkvKVxuICB9KVxuXG4gIGl0KCdzaG91bGQgcHJvdmlkZSBpdHNlbGYnLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuXG4gICAgZXhwZWN0KGluamVjdG9yLmdldChJbmplY3RvcikpLnRvQmUoaW5qZWN0b3IpXG4gIH0pXG5cbiAgZGVzY3JpYmUoJ3RyYW5zaWVudCcsIGZ1bmN0aW9uKCkge1xuXG4gICAgaXQoJ3Nob3VsZCBuZXZlciBjYWNoZScsIGZ1bmN0aW9uKCkge1xuICAgICAgY2xhc3MgRm9vIHt9XG4gICAgICBhbm5vdGF0ZShGb28sIG5ldyBUcmFuc2llbnRTY29wZSlcblxuICAgICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcbiAgICAgIGV4cGVjdChpbmplY3Rvci5nZXQoRm9vKSkubm90LnRvQmUoaW5qZWN0b3IuZ2V0KEZvbykpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgYWx3YXlzIHVzZSBkZXBlbmRlbmNpZXMgKGRlZmF1bHQgcHJvdmlkZXJzKSBmcm9tIHRoZSB5b3VuZ2VzdCBpbmplY3RvcicsIGZ1bmN0aW9uKCkge1xuICAgICAgY2xhc3MgRm9vIHt9XG4gICAgICBhbm5vdGF0ZShGb28sIG5ldyBJbmplY3QpXG5cbiAgICAgIGNsYXNzIEFsd2F5c05ld0luc3RhbmNlIHtcbiAgICAgICAgY29uc3RydWN0b3IoZm9vKSB7XG4gICAgICAgICAgdGhpcy5mb28gPSBmb29cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYW5ub3RhdGUoQWx3YXlzTmV3SW5zdGFuY2UsIG5ldyBUcmFuc2llbnRTY29wZSlcbiAgICAgIGFubm90YXRlKEFsd2F5c05ld0luc3RhbmNlLCBuZXcgSW5qZWN0KEZvbykpXG5cbiAgICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpXG4gICAgICB2YXIgY2hpbGQgPSBpbmplY3Rvci5jcmVhdGVDaGlsZChbRm9vXSkgLy8gZm9yY2UgbmV3IGluc3RhbmNlIG9mIEZvb1xuXG4gICAgICB2YXIgZm9vRnJvbUNoaWxkID0gY2hpbGQuZ2V0KEZvbylcbiAgICAgIHZhciBmb29Gcm9tUGFyZW50ID0gaW5qZWN0b3IuZ2V0KEZvbylcblxuICAgICAgdmFyIGFsd2F5c05ldzEgPSBjaGlsZC5nZXQoQWx3YXlzTmV3SW5zdGFuY2UpXG4gICAgICB2YXIgYWx3YXlzTmV3MiA9IGNoaWxkLmdldChBbHdheXNOZXdJbnN0YW5jZSlcbiAgICAgIHZhciBhbHdheXNOZXdGcm9tUGFyZW50ID0gaW5qZWN0b3IuZ2V0KEFsd2F5c05ld0luc3RhbmNlKVxuXG4gICAgICBleHBlY3QoYWx3YXlzTmV3MS5mb28pLnRvQmUoZm9vRnJvbUNoaWxkKVxuICAgICAgZXhwZWN0KGFsd2F5c05ldzIuZm9vKS50b0JlKGZvb0Zyb21DaGlsZClcbiAgICAgIGV4cGVjdChhbHdheXNOZXdGcm9tUGFyZW50LmZvbykudG9CZShmb29Gcm9tUGFyZW50KVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGFsd2F5cyB1c2UgZGVwZW5kZW5jaWVzIGZyb20gdGhlIHlvdW5nZXN0IGluamVjdG9yJywgZnVuY3Rpb24oKSB7XG4gICAgICBjbGFzcyBGb28ge31cbiAgICAgIGFubm90YXRlKEZvbywgbmV3IEluamVjdClcblxuICAgICAgY2xhc3MgQWx3YXlzTmV3SW5zdGFuY2Uge1xuICAgICAgICBjb25zdHJ1Y3Rvcihmb28pIHtcbiAgICAgICAgICB0aGlzLmZvbyA9IGZvb1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBhbm5vdGF0ZShBbHdheXNOZXdJbnN0YW5jZSwgbmV3IFRyYW5zaWVudFNjb3BlKVxuICAgICAgYW5ub3RhdGUoQWx3YXlzTmV3SW5zdGFuY2UsIG5ldyBJbmplY3QoRm9vKSlcblxuICAgICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKFtBbHdheXNOZXdJbnN0YW5jZV0pXG4gICAgICB2YXIgY2hpbGQgPSBpbmplY3Rvci5jcmVhdGVDaGlsZChbRm9vXSkgLy8gZm9yY2UgbmV3IGluc3RhbmNlIG9mIEZvb1xuXG4gICAgICB2YXIgZm9vRnJvbUNoaWxkID0gY2hpbGQuZ2V0KEZvbylcbiAgICAgIHZhciBmb29Gcm9tUGFyZW50ID0gaW5qZWN0b3IuZ2V0KEZvbylcblxuICAgICAgdmFyIGFsd2F5c05ldzEgPSBjaGlsZC5nZXQoQWx3YXlzTmV3SW5zdGFuY2UpXG4gICAgICB2YXIgYWx3YXlzTmV3MiA9IGNoaWxkLmdldChBbHdheXNOZXdJbnN0YW5jZSlcbiAgICAgIHZhciBhbHdheXNOZXdGcm9tUGFyZW50ID0gaW5qZWN0b3IuZ2V0KEFsd2F5c05ld0luc3RhbmNlKVxuXG4gICAgICBleHBlY3QoYWx3YXlzTmV3MS5mb28pLnRvQmUoZm9vRnJvbUNoaWxkKVxuICAgICAgZXhwZWN0KGFsd2F5c05ldzIuZm9vKS50b0JlKGZvb0Zyb21DaGlsZClcbiAgICAgIGV4cGVjdChhbHdheXNOZXdGcm9tUGFyZW50LmZvbykudG9CZShmb29Gcm9tUGFyZW50KVxuICAgIH0pXG4gIH0pXG5cbiAgZGVzY3JpYmUoJ2NoaWxkJywgZnVuY3Rpb24oKSB7XG5cbiAgICBpdCgnc2hvdWxkIGxvYWQgaW5zdGFuY2VzIGZyb20gcGFyZW50IGluamVjdG9yJywgZnVuY3Rpb24oKSB7XG4gICAgICBjbGFzcyBDYXIge1xuICAgICAgICBzdGFydCgpIHt9XG4gICAgICB9XG5cbiAgICAgIHZhciBwYXJlbnQgPSBuZXcgSW5qZWN0b3IoW0Nhcl0pXG4gICAgICB2YXIgY2hpbGQgPSBwYXJlbnQuY3JlYXRlQ2hpbGQoW10pXG5cbiAgICAgIHZhciBjYXJGcm9tUGFyZW50ID0gcGFyZW50LmdldChDYXIpXG4gICAgICB2YXIgY2FyRnJvbUNoaWxkID0gY2hpbGQuZ2V0KENhcilcblxuICAgICAgZXhwZWN0KGNhckZyb21DaGlsZCkudG9CZShjYXJGcm9tUGFyZW50KVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGNyZWF0ZSBuZXcgaW5zdGFuY2UgaW4gYSBjaGlsZCBpbmplY3RvcicsIGZ1bmN0aW9uKCkge1xuICAgICAgY2xhc3MgQ2FyIHtcbiAgICAgICAgc3RhcnQoKSB7fVxuICAgICAgfVxuXG4gICAgICBjbGFzcyBNb2NrQ2FyIHtcbiAgICAgICAgc3RhcnQoKSB7fVxuICAgICAgfVxuICAgICAgYW5ub3RhdGUoTW9ja0NhciwgbmV3IFByb3ZpZGUoQ2FyKSlcblxuICAgICAgdmFyIHBhcmVudCA9IG5ldyBJbmplY3RvcihbQ2FyXSlcbiAgICAgIHZhciBjaGlsZCA9IHBhcmVudC5jcmVhdGVDaGlsZChbTW9ja0Nhcl0pXG5cbiAgICAgIHZhciBjYXJGcm9tUGFyZW50ID0gcGFyZW50LmdldChDYXIpXG4gICAgICB2YXIgY2FyRnJvbUNoaWxkID0gY2hpbGQuZ2V0KENhcilcblxuICAgICAgZXhwZWN0KGNhckZyb21QYXJlbnQpLm5vdC50b0JlKGNhckZyb21DaGlsZClcbiAgICAgIGV4cGVjdChjYXJGcm9tQ2hpbGQpLnRvQmVJbnN0YW5jZU9mKE1vY2tDYXIpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgZm9yY2UgbmV3IGluc3RhbmNlcyBieSBhbm5vdGF0aW9uJywgZnVuY3Rpb24oKSB7XG4gICAgICBjbGFzcyBSb3V0ZVNjb3BlIHt9XG5cbiAgICAgIGNsYXNzIEVuZ2luZSB7XG4gICAgICAgIHN0YXJ0KCkge31cbiAgICAgIH1cblxuICAgICAgY2xhc3MgQ2FyIHtcbiAgICAgICAgY29uc3RydWN0b3IoZW5naW5lKSB7XG4gICAgICAgICAgdGhpcy5lbmdpbmUgPSBlbmdpbmVcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXJ0KCkge31cbiAgICAgIH1cbiAgICAgIGFubm90YXRlKENhciwgbmV3IFJvdXRlU2NvcGUpXG4gICAgICBhbm5vdGF0ZShDYXIsIG5ldyBJbmplY3QoRW5naW5lKSlcblxuICAgICAgdmFyIHBhcmVudCA9IG5ldyBJbmplY3RvcihbQ2FyLCBFbmdpbmVdKVxuICAgICAgdmFyIGNoaWxkID0gcGFyZW50LmNyZWF0ZUNoaWxkKFtdLCBbUm91dGVTY29wZV0pXG5cbiAgICAgIHZhciBjYXJGcm9tUGFyZW50ID0gcGFyZW50LmdldChDYXIpXG4gICAgICB2YXIgY2FyRnJvbUNoaWxkID0gY2hpbGQuZ2V0KENhcilcblxuICAgICAgZXhwZWN0KGNhckZyb21DaGlsZCkubm90LnRvQmUoY2FyRnJvbVBhcmVudClcbiAgICAgIGV4cGVjdChjYXJGcm9tQ2hpbGQuZW5naW5lKS50b0JlKGNhckZyb21QYXJlbnQuZW5naW5lKVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGZvcmNlIG5ldyBpbnN0YW5jZXMgYnkgYW5ub3RhdGlvbiB1c2luZyBvdmVycmlkZGVuIHByb3ZpZGVyJywgZnVuY3Rpb24oKSB7XG4gICAgICBjbGFzcyBSb3V0ZVNjb3BlIHt9XG5cbiAgICAgIGNsYXNzIEVuZ2luZSB7XG4gICAgICAgIHN0YXJ0KCkge31cbiAgICAgIH1cblxuICAgICAgY2xhc3MgTW9ja0VuZ2luZSB7XG4gICAgICAgIHN0YXJ0KCkge31cbiAgICAgIH1cbiAgICAgIGFubm90YXRlKE1vY2tFbmdpbmUsIG5ldyBSb3V0ZVNjb3BlKVxuICAgICAgYW5ub3RhdGUoTW9ja0VuZ2luZSwgbmV3IFByb3ZpZGUoRW5naW5lKSlcblxuICAgICAgdmFyIHBhcmVudCA9IG5ldyBJbmplY3RvcihbTW9ja0VuZ2luZV0pXG4gICAgICB2YXIgY2hpbGRBID0gcGFyZW50LmNyZWF0ZUNoaWxkKFtdLCBbUm91dGVTY29wZV0pXG4gICAgICB2YXIgY2hpbGRCID0gcGFyZW50LmNyZWF0ZUNoaWxkKFtdLCBbUm91dGVTY29wZV0pXG5cbiAgICAgIHZhciBlbmdpbmVGcm9tQSA9IGNoaWxkQS5nZXQoRW5naW5lKVxuICAgICAgdmFyIGVuZ2luZUZyb21CID0gY2hpbGRCLmdldChFbmdpbmUpXG5cbiAgICAgIGV4cGVjdChlbmdpbmVGcm9tQSkubm90LnRvQmUoZW5naW5lRnJvbUIpXG4gICAgICBleHBlY3QoZW5naW5lRnJvbUEpLnRvQmVJbnN0YW5jZU9mKE1vY2tFbmdpbmUpXG4gICAgICBleHBlY3QoZW5naW5lRnJvbUIpLnRvQmVJbnN0YW5jZU9mKE1vY2tFbmdpbmUpXG4gICAgfSlcblxuICAgIGl0KCdzaG91bGQgZm9yY2UgbmV3IGluc3RhbmNlIGJ5IGFubm90YXRpb24gdXNpbmcgdGhlIGxvd2VzdCBvdmVycmlkZGVuIHByb3ZpZGVyJywgZnVuY3Rpb24oKSB7XG4gICAgICBjbGFzcyBSb3V0ZVNjb3BlIHt9XG5cbiAgICAgIGNsYXNzIEVuZ2luZSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKCkge31cbiAgICAgICAgc3RhcnQoKSB7fVxuICAgICAgfVxuICAgICAgYW5ub3RhdGUoRW5naW5lLCBuZXcgUm91dGVTY29wZSlcblxuICAgICAgY2xhc3MgTW9ja0VuZ2luZSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKCkge31cbiAgICAgICAgc3RhcnQoKSB7fVxuICAgICAgfVxuICAgICAgYW5ub3RhdGUoTW9ja0VuZ2luZSwgbmV3IFByb3ZpZGUoRW5naW5lKSlcbiAgICAgIGFubm90YXRlKE1vY2tFbmdpbmUsIG5ldyBSb3V0ZVNjb3BlKVxuXG4gICAgICBjbGFzcyBEb3VibGVNb2NrRW5naW5lIHtcbiAgICAgICAgc3RhcnQoKSB7fVxuICAgICAgfVxuICAgICAgYW5ub3RhdGUoRG91YmxlTW9ja0VuZ2luZSwgbmV3IFByb3ZpZGUoRW5naW5lKSlcbiAgICAgIGFubm90YXRlKERvdWJsZU1vY2tFbmdpbmUsIG5ldyBSb3V0ZVNjb3BlKVxuXG4gICAgICB2YXIgcGFyZW50ID0gbmV3IEluamVjdG9yKFtFbmdpbmVdKVxuICAgICAgdmFyIGNoaWxkID0gcGFyZW50LmNyZWF0ZUNoaWxkKFtNb2NrRW5naW5lXSlcbiAgICAgIHZhciBncmFudENoaWxkID0gY2hpbGQuY3JlYXRlQ2hpbGQoW10sIFtSb3V0ZVNjb3BlXSlcblxuICAgICAgdmFyIGVuZ2luZUZyb21QYXJlbnQgPSBwYXJlbnQuZ2V0KEVuZ2luZSlcbiAgICAgIHZhciBlbmdpbmVGcm9tQ2hpbGQgPSBjaGlsZC5nZXQoRW5naW5lKVxuICAgICAgdmFyIGVuZ2luZUZyb21HcmFudENoaWxkID0gZ3JhbnRDaGlsZC5nZXQoRW5naW5lKVxuXG4gICAgICBleHBlY3QoZW5naW5lRnJvbVBhcmVudCkudG9CZUluc3RhbmNlT2YoRW5naW5lKVxuICAgICAgZXhwZWN0KGVuZ2luZUZyb21DaGlsZCkudG9CZUluc3RhbmNlT2YoTW9ja0VuZ2luZSlcbiAgICAgIGV4cGVjdChlbmdpbmVGcm9tR3JhbnRDaGlsZCkudG9CZUluc3RhbmNlT2YoTW9ja0VuZ2luZSlcbiAgICAgIGV4cGVjdChlbmdpbmVGcm9tR3JhbnRDaGlsZCkubm90LnRvQmUoZW5naW5lRnJvbUNoaWxkKVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIHNob3cgdGhlIGZ1bGwgcGF0aCB3aGVuIG5vIHByb3ZpZGVyJywgZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcGFyZW50ID0gbmV3IEluamVjdG9yKGhvdXNlTW9kdWxlKVxuICAgICAgdmFyIGNoaWxkID0gcGFyZW50LmNyZWF0ZUNoaWxkKHNoaW55SG91c2VNb2R1bGUpXG5cbiAgICAgIGV4cGVjdCgoKSA9PiBjaGlsZC5nZXQoJ0hvdXNlJykpXG4gICAgICAgICAgLnRvVGhyb3dFcnJvcignTm8gcHJvdmlkZXIgZm9yIFNpbmshIChIb3VzZSAtPiBLaXRjaGVuIC0+IFNpbmspJylcbiAgICB9KVxuXG4gICAgaXQoJ3Nob3VsZCBwcm92aWRlIGl0c2VsZicsIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHBhcmVudCA9IG5ldyBJbmplY3RvcigpXG4gICAgICB2YXIgY2hpbGQgPSBwYXJlbnQuY3JlYXRlQ2hpbGQoW10pXG5cbiAgICAgIGV4cGVjdChjaGlsZC5nZXQoSW5qZWN0b3IpKS50b0JlKGNoaWxkKVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGNhY2hlIGRlZmF1bHQgcHJvdmlkZXIgaW4gcGFyZW50IGluamVjdG9yJywgZnVuY3Rpb24oKSB7XG4gICAgICBjbGFzcyBGb28ge31cbiAgICAgIGFubm90YXRlKEZvbywgbmV3IEluamVjdClcblxuICAgICAgdmFyIHBhcmVudCA9IG5ldyBJbmplY3RvcigpXG4gICAgICB2YXIgY2hpbGQgPSBwYXJlbnQuY3JlYXRlQ2hpbGQoW10pXG5cbiAgICAgIHZhciBmb29Gcm9tQ2hpbGQgPSBjaGlsZC5nZXQoRm9vKVxuICAgICAgdmFyIGZvb0Zyb21QYXJlbnQgPSBwYXJlbnQuZ2V0KEZvbylcblxuICAgICAgZXhwZWN0KGZvb0Zyb21QYXJlbnQpLnRvQmUoZm9vRnJvbUNoaWxkKVxuICAgIH0pXG5cbiAgICBpdCgnc2hvdWxkIGZvcmNlIG5ldyBpbnN0YW5jZSBieSBhbm5vdGF0aW9uIGZvciBkZWZhdWx0IHByb3ZpZGVyJywgZnVuY3Rpb24oKSB7XG4gICAgICBjbGFzcyBSZXF1ZXN0U2NvcGUge31cblxuICAgICAgY2xhc3MgRm9vIHt9XG4gICAgICBhbm5vdGF0ZShGb28sIG5ldyBJbmplY3QpXG4gICAgICBhbm5vdGF0ZShGb28sIG5ldyBSZXF1ZXN0U2NvcGUpXG5cbiAgICAgIHZhciBwYXJlbnQgPSBuZXcgSW5qZWN0b3IoKVxuICAgICAgdmFyIGNoaWxkID0gcGFyZW50LmNyZWF0ZUNoaWxkKFtdLCBbUmVxdWVzdFNjb3BlXSlcblxuICAgICAgdmFyIGZvb0Zyb21DaGlsZCA9IGNoaWxkLmdldChGb28pXG4gICAgICB2YXIgZm9vRnJvbVBhcmVudCA9IHBhcmVudC5nZXQoRm9vKVxuXG4gICAgICBleHBlY3QoZm9vRnJvbVBhcmVudCkubm90LnRvQmUoZm9vRnJvbUNoaWxkKVxuICAgIH0pXG4gIH0pXG5cbiAgZGVzY3JpYmUoJ2xhenknLCBmdW5jdGlvbigpIHtcblxuICAgIGl0KCdzaG91bGQgaW5zdGFudGlhdGUgbGF6aWx5JywgZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY29uc3RydWN0b3JTcHkgPSBqYXNtaW5lLmNyZWF0ZVNweSgnY29uc3RydWN0b3InKVxuXG4gICAgICBjbGFzcyBFeHBlbnNpdmVFbmdpbmUge1xuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgICBjb25zdHJ1Y3RvclNweSgpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY2xhc3MgQ2FyIHtcbiAgICAgICAgY29uc3RydWN0b3IoY3JlYXRlRW5naW5lKSB7XG4gICAgICAgICAgdGhpcy5lbmdpbmUgPSBudWxsXG4gICAgICAgICAgdGhpcy5jcmVhdGVFbmdpbmUgPSBjcmVhdGVFbmdpbmVcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXJ0KCkge1xuICAgICAgICAgIHRoaXMuZW5naW5lID0gdGhpcy5jcmVhdGVFbmdpbmUoKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBhbm5vdGF0ZShDYXIsIG5ldyBJbmplY3RMYXp5KEV4cGVuc2l2ZUVuZ2luZSkpXG5cbiAgICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpXG4gICAgICB2YXIgY2FyID0gaW5qZWN0b3IuZ2V0KENhcilcblxuICAgICAgZXhwZWN0KGNvbnN0cnVjdG9yU3B5KS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpXG5cbiAgICAgIGNhci5zdGFydCgpXG4gICAgICBleHBlY3QoY29uc3RydWN0b3JTcHkpLnRvSGF2ZUJlZW5DYWxsZWQoKVxuICAgICAgZXhwZWN0KGNhci5lbmdpbmUpLnRvQmVJbnN0YW5jZU9mKEV4cGVuc2l2ZUVuZ2luZSlcbiAgICB9KVxuXG4gICAgLy8gcmVncmVzc2lvblxuICAgIGl0KCdzaG91bGQgaW5zdGFudGlhdGUgbGF6aWx5IGZyb20gYSBwYXJlbnQgaW5qZWN0b3InLCBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjb25zdHJ1Y3RvclNweSA9IGphc21pbmUuY3JlYXRlU3B5KCdjb25zdHJ1Y3RvcicpXG5cbiAgICAgIGNsYXNzIEV4cGVuc2l2ZUVuZ2luZSB7XG4gICAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgIGNvbnN0cnVjdG9yU3B5KClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjbGFzcyBDYXIge1xuICAgICAgICBjb25zdHJ1Y3RvcihjcmVhdGVFbmdpbmUpIHtcbiAgICAgICAgICB0aGlzLmVuZ2luZSA9IG51bGxcbiAgICAgICAgICB0aGlzLmNyZWF0ZUVuZ2luZSA9IGNyZWF0ZUVuZ2luZVxuICAgICAgICB9XG5cbiAgICAgICAgc3RhcnQoKSB7XG4gICAgICAgICAgdGhpcy5lbmdpbmUgPSB0aGlzLmNyZWF0ZUVuZ2luZSgpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFubm90YXRlKENhciwgbmV3IEluamVjdExhenkoRXhwZW5zaXZlRW5naW5lKSlcblxuICAgICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKFtFeHBlbnNpdmVFbmdpbmVdKVxuICAgICAgdmFyIGNoaWxkSW5qZWN0b3IgPSBpbmplY3Rvci5jcmVhdGVDaGlsZChbQ2FyXSlcbiAgICAgIHZhciBjYXIgPSBjaGlsZEluamVjdG9yLmdldChDYXIpXG5cbiAgICAgIGV4cGVjdChjb25zdHJ1Y3RvclNweSkubm90LnRvSGF2ZUJlZW5DYWxsZWQoKVxuXG4gICAgICBjYXIuc3RhcnQoKVxuICAgICAgZXhwZWN0KGNvbnN0cnVjdG9yU3B5KS50b0hhdmVCZWVuQ2FsbGVkKClcbiAgICAgIGV4cGVjdChjYXIuZW5naW5lKS50b0JlSW5zdGFuY2VPZihFeHBlbnNpdmVFbmdpbmUpXG4gICAgfSlcblxuICAgIGRlc2NyaWJlKCd3aXRoIGxvY2FscycsIGZ1bmN0aW9uKCkge1xuXG4gICAgICBpdCgnc2hvdWxkIGFsd2F5cyBjcmVhdGUgYSBuZXcgaW5zdGFuY2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNvbnN0cnVjdG9yU3B5ID0gamFzbWluZS5jcmVhdGVTcHkoJ2NvbnN0cnVjdG9yJylcblxuICAgICAgICBjbGFzcyBFeHBlbnNpdmVFbmdpbmUge1xuICAgICAgICAgIGNvbnN0cnVjdG9yKHBvd2VyKSB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvclNweSgpXG4gICAgICAgICAgICB0aGlzLnBvd2VyID0gcG93ZXJcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYW5ub3RhdGUoRXhwZW5zaXZlRW5naW5lLCBuZXcgVHJhbnNpZW50U2NvcGUpXG4gICAgICAgIGFubm90YXRlKEV4cGVuc2l2ZUVuZ2luZSwgbmV3IEluamVjdCgncG93ZXInKSlcblxuICAgICAgICBjbGFzcyBDYXIge1xuICAgICAgICAgIGNvbnN0cnVjdG9yKGNyZWF0ZUVuZ2luZSkge1xuICAgICAgICAgICAgdGhpcy5jcmVhdGVFbmdpbmUgPSBjcmVhdGVFbmdpbmVcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYW5ub3RhdGUoQ2FyLCBuZXcgSW5qZWN0TGF6eShFeHBlbnNpdmVFbmdpbmUpKVxuXG4gICAgICAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcigpXG4gICAgICAgIHZhciBjYXIgPSBpbmplY3Rvci5nZXQoQ2FyKVxuXG4gICAgICAgIHZhciB2ZXlyb25FbmdpbmUgPSBjYXIuY3JlYXRlRW5naW5lKCdwb3dlcicsIDExODQpXG4gICAgICAgIHZhciBtdXN0YW5nRW5naW5lID0gY2FyLmNyZWF0ZUVuZ2luZSgncG93ZXInLCA0MjApXG5cbiAgICAgICAgZXhwZWN0KHZleXJvbkVuZ2luZSkubm90LnRvQmUobXVzdGFuZ0VuZ2luZSlcbiAgICAgICAgZXhwZWN0KHZleXJvbkVuZ2luZS5wb3dlcikudG9CZSgxMTg0KVxuICAgICAgICBleHBlY3QobXVzdGFuZ0VuZ2luZS5wb3dlcikudG9CZSg0MjApXG5cbiAgICAgICAgdmFyIG11c3RhbmdFbmdpbmUyID0gY2FyLmNyZWF0ZUVuZ2luZSgncG93ZXInLCA0MjApXG4gICAgICAgIGV4cGVjdChtdXN0YW5nRW5naW5lKS5ub3QudG9CZShtdXN0YW5nRW5naW5lMilcbiAgICAgIH0pXG4gICAgfSlcbiAgfSlcbn0pXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=