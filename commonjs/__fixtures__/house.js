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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9fZml4dHVyZXNfXy9ob3VzZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztJQUVFLFFBQVEsdUJBQVIsUUFBUTtJQUNSLE1BQU0sdUJBQU4sTUFBTTtJQUNOLE9BQU8sdUJBQVAsT0FBTztJQU1JLEtBQUs7TUFBTCxLQUFLLEdBQ0wsU0FEQSxLQUFLLENBQ0osT0FBTyxFQUFFLEVBQUU7O0FBRFosT0FBSyxXQUVoQixPQUFPLEdBQUEsWUFBRyxFQUFFOztTQUZELEtBQUs7OztRQUFMLEtBQUssR0FBTCxLQUFLO3NDQUltQjt1Q0FDQzs7SUFFekIsT0FBTztNQUFQLE9BQU8sR0FDUCxTQURBLE9BQU8sQ0FDTixJQUFJLEVBQUUsRUFBRTs7QUFEVCxTQUFPLFdBRWxCLE9BQU8sR0FBQSxZQUFHLEVBQUU7O1NBRkQsT0FBTzs7O1FBQVAsT0FBTyxHQUFQLE9BQU87QUFJcEIsUUFBUSxDQUFDLE9BQU8sRUFBRSxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO0FBQ3pDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTs7QUFROUIsSUFBSSxLQUFLLFdBQUwsS0FBSyxHQUFHLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDIiwiZmlsZSI6Il9fZml4dHVyZXNfXy9ob3VzZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0IHtcbiAgYW5ub3RhdGUsXG4gIEluamVjdCxcbiAgUHJvdmlkZSxcbn0gZnJvbSAnLi4vaW5kZXgnXG5cbi8vIFRoaXMgaXMgYW4gZXhhbXBsZSBvZiB1c2luZyBzdHJpbmcgYXMgdG9rZW5zLlxuXG5cbmV4cG9ydCBjbGFzcyBIb3VzZSB7XG4gIGNvbnN0cnVjdG9yKGtpdGNoZW4pIHt9XG4gIG5vdGhpbmcoKSB7fVxufVxuYW5ub3RhdGUoSG91c2UsIG5ldyBQcm92aWRlKCdIb3VzZScpKVxuYW5ub3RhdGUoSG91c2UsIG5ldyBJbmplY3QoJ0tpdGNoZW4nKSlcblxuZXhwb3J0IGNsYXNzIEtpdGNoZW4ge1xuICBjb25zdHJ1Y3RvcihzaW5rKSB7fVxuICBub3RoaW5nKCkge31cbn1cbmFubm90YXRlKEtpdGNoZW4sIG5ldyBQcm92aWRlKCdLaXRjaGVuJykpXG5hbm5vdGF0ZShLaXRjaGVuLCBuZXcgSW5qZWN0KCdTaW5rJykpXG5cbi8vIFNpbmsgaXMgbWlzc2luZy5cbi8vIEBQcm92aWRlKCdTaW5rJylcbi8vIGV4cG9ydCBjbGFzcyBTaW5rIHtcbi8vICAgbm90aGluZygpIHt9XG4vLyB9XG5cbmV4cG9ydCB2YXIgaG91c2UgPSBbSG91c2UsIEtpdGNoZW5dO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9