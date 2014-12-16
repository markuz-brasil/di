"use strict";

exports.createEngine = createEngine;
var annotate = require('../index').annotate;
var Inject = require('../index').Inject;
var Provide = require('../index').Provide;
var Engine = function Engine() {};

exports.Engine = Engine;
var Car = (function () {
  var Car = function Car(engine) {
    this.engine = engine;
  };

  Car.prototype.start = function () {};

  return Car;
})();

exports.Car = Car;
function createEngine() {
  return "strong engine";
}

var CyclicEngine = function CyclicEngine(car) {};

exports.CyclicEngine = CyclicEngine;


// This is an example of using annotate helper, instead of annotations.

// @Inject(Engine)
annotate(Car, new Inject(Engine));

// @Provide(Engine)
annotate(createEngine, new Provide(Engine));

// @Inject(Car)
annotate(CyclicEngine, new Inject(Car));
// @Provide(Engine)
annotate(CyclicEngine, new Provide(Engine));
//# sourceMappingURL=../maps/__fixtures__/car.js.map