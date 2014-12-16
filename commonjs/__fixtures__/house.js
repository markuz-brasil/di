"use strict";

var annotate = require('../index').annotate;
var Inject = require('../index').Inject;
var Provide = require('../index').Provide;
var House = (function () {
  var House = function House(kitchen) {};

  House.prototype.nothing = function () {};

  return House;
})();

exports.House = House;
annotate(House, new Provide("House"));
annotate(House, new Inject("Kitchen"));

var Kitchen = (function () {
  var Kitchen = function Kitchen(sink) {};

  Kitchen.prototype.nothing = function () {};

  return Kitchen;
})();

exports.Kitchen = Kitchen;
annotate(Kitchen, new Provide("Kitchen"));
annotate(Kitchen, new Inject("Sink"));

var house = exports.house = [House, Kitchen];
//# sourceMappingURL=../maps/__fixtures__/house.js.map