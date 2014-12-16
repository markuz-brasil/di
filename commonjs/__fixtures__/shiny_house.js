"use strict";

var annotate = require('../index').annotate;
var Inject = require('../index').Inject;
var Provide = require('../index').Provide;
var ShinyHouse = (function () {
  var ShinyHouse = function ShinyHouse(kitchen) {};

  ShinyHouse.prototype.nothing = function () {};

  return ShinyHouse;
})();

exports.ShinyHouse = ShinyHouse;
annotate(ShinyHouse, new Provide("House"));
annotate(ShinyHouse, new Inject("Kitchen"));

var house = exports.house = [ShinyHouse];
//# sourceMappingURL=../maps/__fixtures__/shiny_house.js.map