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
var TransientScope = require('../index').TransientScope;
var UserList = function UserList() {};

annotate(fetchUsers2, new Provide(UserList));
function fetchUsers2() {
  return {};
}

// An async provider.
annotate(fetchUsers, new ProvidePromise(UserList));
function fetchUsers() {
  return Promise.resolve(new UserList());
}

var SynchronousUserList = function SynchronousUserList() {};

var UserController = function UserController(list) {
  this.list = list;
};

annotate(UserController, new Inject(UserList));

var SmartUserController = function SmartUserController(promise) {
  this.promise = promise;
};

annotate(SmartUserController, new InjectPromise(UserList));


describe("async", function () {
  // it('should return a promise', function() {
  //   var injector = new Injector([fetchUsers2])
  //   var p = injector.get(UserList)

  //   expect(p).toBePromiseLike()
  // })


  // it('should throw when instantiating promise provider synchronously', function() {
  //   var injector = new Injector([fetchUsers])

  //   expect(() => injector.get(UserList))
  //       .toThrowError('Cannot instantiate UserList synchronously. It is provided as a promise!')
  // })


  // it('should return promise even if the provider is sync', function() {
  //   var injector = new Injector()
  //   var p = injector.getPromise(SynchronousUserList)

  //   expect(p).toBePromiseLike()
  // })


  // regression
  // it('should return promise even if the provider is sync, from cache', function() {
  //   var injector = new Injector()
  //   var p1 = injector.getPromise(SynchronousUserList)
  //   var p2 = injector.getPromise(SynchronousUserList)

  //   expect(p2).toBePromiseLike()
  // })


  // it('should return promise when a dependency is async', function(done) {
  //   var injector = new Injector([fetchUsers])

  //   injector.getPromise(UserController).then(function(userController) {
  //     expect(userController).toBeInstanceOf(UserController)
  //     expect(userController.list).toBeInstanceOf(UserList)
  //     done()
  //   })
  // })


  // regression
  // it('should return a promise even from parent injector', function() {
  //   var injector = new Injector([SynchronousUserList])
  //   var childInjector = injector.createChild([])

  //   expect(childInjector.getPromise(SynchronousUserList)).toBePromiseLike()
  // })


  // it('should throw when a dependency is async', function() {
  //   var injector = new Injector([fetchUsers])

  //   expect(() => injector.get(UserController))
  //       .toThrowError('Cannot instantiate UserList synchronously. It is provided as a promise! (UserController -> UserList)')
  // })


  // it('should resolve synchronously when async dependency requested as a promise', function() {
  //   var injector = new Injector([fetchUsers])
  //   var controller = injector.get(SmartUserController)

  //   expect(controller).toBeInstanceOf(SmartUserController)
  //   expect(controller.promise).toBePromiseLike()
  // })


  // regression
  it("should not cache TransientScope", function (done) {
    var NeverCachedUserController = function NeverCachedUserController(list) {
      this.list = list;
    };

    annotate(NeverCachedUserController, new TransientScope());
    annotate(NeverCachedUserController, new Inject(UserList));

    var injector = new Injector([fetchUsers]);

    injector.getPromise(NeverCachedUserController).then(function (controller1) {
      injector.getPromise(NeverCachedUserController).then(function (controller2) {
        expect(controller1).not.toBe(controller2);
        done();
      });
    });
  });

});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIl9fdGVzdHNfXy9hc3luYy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTs7Ozs7SUFLaEIsUUFBUSx1QkFBUixRQUFRO0lBQ1IsYUFBYSx1QkFBYixhQUFhO0lBQ2IsZUFBZSx1QkFBZixlQUFlO0lBQ2YsUUFBUSx1QkFBUixRQUFRO0lBQ1IsTUFBTSx1QkFBTixNQUFNO0lBQ04sVUFBVSx1QkFBVixVQUFVO0lBQ1YsYUFBYSx1QkFBYixhQUFhO0lBQ2IsT0FBTyx1QkFBUCxPQUFPO0lBQ1AsY0FBYyx1QkFBZCxjQUFjO0lBQ2QsY0FBYyx1QkFBZCxjQUFjO0lBR1YsUUFBUSxZQUFSLFFBQVE7OzZDQUU4Qjs7QUFFMUMsWUFBUzs7OzttREFJdUM7O0FBRWhELHVDQUFtQyxDQUFDLENBQUE7OztJQUdoQyxtQkFBbUIsWUFBbkIsbUJBQW1COztJQUVuQixjQUFjLEdBQ1AsU0FEUCxjQUFjLENBQ04sSUFBSSxFQUFFO0FBQ2hCLE1BQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO0NBQ2pCOztBQUVILFFBQVEsQ0FBQyxjQUFjLEVBQUUsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTs7SUFFeEMsbUJBQW1CLEdBQ1osU0FEUCxtQkFBbUIsQ0FDWCxPQUFPLEVBQUU7QUFDbkIsTUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUE7Q0FDdkI7O0FBRUgsUUFBUSxDQUFDLG1CQUFtQixFQUFFLElBQUksYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7OztBQUcxRCxRQUFRLENBQUMsT0FBTyxFQUFFLFlBQVc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUEwRTNCLElBQUUsQ0FBQyxpQ0FBaUMsRUFBRSxVQUFTLElBQUksRUFBRTtRQUU3Qyx5QkFBeUIsR0FDbEIsU0FEUCx5QkFBeUIsQ0FDakIsSUFBSSxFQUFFO0FBQ2hCLFVBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO0tBQ2pCOztBQUVILFlBQVEsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLGNBQWMsRUFBQSxDQUFDLENBQUE7QUFDdkQsWUFBUSxDQUFDLHlCQUF5QixFQUFFLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7O0FBRXpELFFBQUksUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTs7QUFFekMsWUFBUSxDQUFDLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFTLFdBQVcsRUFBRTtBQUN4RSxjQUFRLENBQUMsVUFBVSxDQUFDLHlCQUF5QixDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVMsV0FBVyxFQUFFO0FBQ3hFLGNBQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0FBQ3pDLFlBQUksRUFBRSxDQUFBO09BQ1AsQ0FBQyxDQUFBO0tBQ0gsQ0FBQyxDQUFBO0dBQ0gsQ0FBQyxDQUFBOztDQWNILENBQUMsQ0FBQSIsImZpbGUiOiJfX3Rlc3RzX18vYXN5bmMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJqZXN0LmF1dG9Nb2NrT2ZmKClcbmltcG9ydCAnNnRvNS9wb2x5ZmlsbCdcbmltcG9ydCAnLi4vX19maXh0dXJlc19fL2phc21pbmVfbWF0Y2hlcnMnXG5cbmltcG9ydCB7XG4gIGFubm90YXRlLFxuICBoYXNBbm5vdGF0aW9uLFxuICByZWFkQW5ub3RhdGlvbnMsXG4gIEluamVjdG9yLFxuICBJbmplY3QsXG4gIEluamVjdExhenksXG4gIEluamVjdFByb21pc2UsXG4gIFByb3ZpZGUsXG4gIFByb3ZpZGVQcm9taXNlLFxuICBUcmFuc2llbnRTY29wZVxufSBmcm9tICcuLi9pbmRleCdcblxuY2xhc3MgVXNlckxpc3Qge31cblxuYW5ub3RhdGUoZmV0Y2hVc2VyczIsIG5ldyBQcm92aWRlKFVzZXJMaXN0KSlcbmZ1bmN0aW9uIGZldGNoVXNlcnMyKCkge1xuICByZXR1cm4ge31cbn1cblxuLy8gQW4gYXN5bmMgcHJvdmlkZXIuXG5hbm5vdGF0ZShmZXRjaFVzZXJzLCBuZXcgUHJvdmlkZVByb21pc2UoVXNlckxpc3QpKVxuZnVuY3Rpb24gZmV0Y2hVc2VycygpIHtcbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgVXNlckxpc3QpXG59XG5cbmNsYXNzIFN5bmNocm9ub3VzVXNlckxpc3Qge31cblxuY2xhc3MgVXNlckNvbnRyb2xsZXIge1xuICBjb25zdHJ1Y3RvcihsaXN0KSB7XG4gICAgdGhpcy5saXN0ID0gbGlzdFxuICB9XG59XG5hbm5vdGF0ZShVc2VyQ29udHJvbGxlciwgbmV3IEluamVjdChVc2VyTGlzdCkpXG5cbmNsYXNzIFNtYXJ0VXNlckNvbnRyb2xsZXIge1xuICBjb25zdHJ1Y3Rvcihwcm9taXNlKSB7XG4gICAgdGhpcy5wcm9taXNlID0gcHJvbWlzZVxuICB9XG59XG5hbm5vdGF0ZShTbWFydFVzZXJDb250cm9sbGVyLCBuZXcgSW5qZWN0UHJvbWlzZShVc2VyTGlzdCkpXG5cblxuZGVzY3JpYmUoJ2FzeW5jJywgZnVuY3Rpb24oKSB7XG5cbiAgLy8gaXQoJ3Nob3VsZCByZXR1cm4gYSBwcm9taXNlJywgZnVuY3Rpb24oKSB7XG4gIC8vICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKFtmZXRjaFVzZXJzMl0pXG4gIC8vICAgdmFyIHAgPSBpbmplY3Rvci5nZXQoVXNlckxpc3QpXG5cbiAgLy8gICBleHBlY3QocCkudG9CZVByb21pc2VMaWtlKClcbiAgLy8gfSlcblxuXG4gIC8vIGl0KCdzaG91bGQgdGhyb3cgd2hlbiBpbnN0YW50aWF0aW5nIHByb21pc2UgcHJvdmlkZXIgc3luY2hyb25vdXNseScsIGZ1bmN0aW9uKCkge1xuICAvLyAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcihbZmV0Y2hVc2Vyc10pXG5cbiAgLy8gICBleHBlY3QoKCkgPT4gaW5qZWN0b3IuZ2V0KFVzZXJMaXN0KSlcbiAgLy8gICAgICAgLnRvVGhyb3dFcnJvcignQ2Fubm90IGluc3RhbnRpYXRlIFVzZXJMaXN0IHN5bmNocm9ub3VzbHkuIEl0IGlzIHByb3ZpZGVkIGFzIGEgcHJvbWlzZSEnKVxuICAvLyB9KVxuXG5cbiAgLy8gaXQoJ3Nob3VsZCByZXR1cm4gcHJvbWlzZSBldmVuIGlmIHRoZSBwcm92aWRlciBpcyBzeW5jJywgZnVuY3Rpb24oKSB7XG4gIC8vICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKClcbiAgLy8gICB2YXIgcCA9IGluamVjdG9yLmdldFByb21pc2UoU3luY2hyb25vdXNVc2VyTGlzdClcblxuICAvLyAgIGV4cGVjdChwKS50b0JlUHJvbWlzZUxpa2UoKVxuICAvLyB9KVxuXG5cbiAgLy8gcmVncmVzc2lvblxuICAvLyBpdCgnc2hvdWxkIHJldHVybiBwcm9taXNlIGV2ZW4gaWYgdGhlIHByb3ZpZGVyIGlzIHN5bmMsIGZyb20gY2FjaGUnLCBmdW5jdGlvbigpIHtcbiAgLy8gICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoKVxuICAvLyAgIHZhciBwMSA9IGluamVjdG9yLmdldFByb21pc2UoU3luY2hyb25vdXNVc2VyTGlzdClcbiAgLy8gICB2YXIgcDIgPSBpbmplY3Rvci5nZXRQcm9taXNlKFN5bmNocm9ub3VzVXNlckxpc3QpXG5cbiAgLy8gICBleHBlY3QocDIpLnRvQmVQcm9taXNlTGlrZSgpXG4gIC8vIH0pXG5cblxuICAvLyBpdCgnc2hvdWxkIHJldHVybiBwcm9taXNlIHdoZW4gYSBkZXBlbmRlbmN5IGlzIGFzeW5jJywgZnVuY3Rpb24oZG9uZSkge1xuICAvLyAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcihbZmV0Y2hVc2Vyc10pXG5cbiAgLy8gICBpbmplY3Rvci5nZXRQcm9taXNlKFVzZXJDb250cm9sbGVyKS50aGVuKGZ1bmN0aW9uKHVzZXJDb250cm9sbGVyKSB7XG4gIC8vICAgICBleHBlY3QodXNlckNvbnRyb2xsZXIpLnRvQmVJbnN0YW5jZU9mKFVzZXJDb250cm9sbGVyKVxuICAvLyAgICAgZXhwZWN0KHVzZXJDb250cm9sbGVyLmxpc3QpLnRvQmVJbnN0YW5jZU9mKFVzZXJMaXN0KVxuICAvLyAgICAgZG9uZSgpXG4gIC8vICAgfSlcbiAgLy8gfSlcblxuXG4gIC8vIHJlZ3Jlc3Npb25cbiAgLy8gaXQoJ3Nob3VsZCByZXR1cm4gYSBwcm9taXNlIGV2ZW4gZnJvbSBwYXJlbnQgaW5qZWN0b3InLCBmdW5jdGlvbigpIHtcbiAgLy8gICB2YXIgaW5qZWN0b3IgPSBuZXcgSW5qZWN0b3IoW1N5bmNocm9ub3VzVXNlckxpc3RdKVxuICAvLyAgIHZhciBjaGlsZEluamVjdG9yID0gaW5qZWN0b3IuY3JlYXRlQ2hpbGQoW10pXG5cbiAgLy8gICBleHBlY3QoY2hpbGRJbmplY3Rvci5nZXRQcm9taXNlKFN5bmNocm9ub3VzVXNlckxpc3QpKS50b0JlUHJvbWlzZUxpa2UoKVxuICAvLyB9KVxuXG5cbiAgLy8gaXQoJ3Nob3VsZCB0aHJvdyB3aGVuIGEgZGVwZW5kZW5jeSBpcyBhc3luYycsIGZ1bmN0aW9uKCkge1xuICAvLyAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcihbZmV0Y2hVc2Vyc10pXG5cbiAgLy8gICBleHBlY3QoKCkgPT4gaW5qZWN0b3IuZ2V0KFVzZXJDb250cm9sbGVyKSlcbiAgLy8gICAgICAgLnRvVGhyb3dFcnJvcignQ2Fubm90IGluc3RhbnRpYXRlIFVzZXJMaXN0IHN5bmNocm9ub3VzbHkuIEl0IGlzIHByb3ZpZGVkIGFzIGEgcHJvbWlzZSEgKFVzZXJDb250cm9sbGVyIC0+IFVzZXJMaXN0KScpXG4gIC8vIH0pXG5cblxuICAvLyBpdCgnc2hvdWxkIHJlc29sdmUgc3luY2hyb25vdXNseSB3aGVuIGFzeW5jIGRlcGVuZGVuY3kgcmVxdWVzdGVkIGFzIGEgcHJvbWlzZScsIGZ1bmN0aW9uKCkge1xuICAvLyAgIHZhciBpbmplY3RvciA9IG5ldyBJbmplY3RvcihbZmV0Y2hVc2Vyc10pXG4gIC8vICAgdmFyIGNvbnRyb2xsZXIgPSBpbmplY3Rvci5nZXQoU21hcnRVc2VyQ29udHJvbGxlcilcblxuICAvLyAgIGV4cGVjdChjb250cm9sbGVyKS50b0JlSW5zdGFuY2VPZihTbWFydFVzZXJDb250cm9sbGVyKVxuICAvLyAgIGV4cGVjdChjb250cm9sbGVyLnByb21pc2UpLnRvQmVQcm9taXNlTGlrZSgpXG4gIC8vIH0pXG5cblxuICAvLyByZWdyZXNzaW9uXG4gIGl0KCdzaG91bGQgbm90IGNhY2hlIFRyYW5zaWVudFNjb3BlJywgZnVuY3Rpb24oZG9uZSkge1xuXG4gICAgY2xhc3MgTmV2ZXJDYWNoZWRVc2VyQ29udHJvbGxlciB7XG4gICAgICBjb25zdHJ1Y3RvcihsaXN0KSB7XG4gICAgICAgIHRoaXMubGlzdCA9IGxpc3RcbiAgICAgIH1cbiAgICB9XG4gICAgYW5ub3RhdGUoTmV2ZXJDYWNoZWRVc2VyQ29udHJvbGxlciwgbmV3IFRyYW5zaWVudFNjb3BlKVxuICAgIGFubm90YXRlKE5ldmVyQ2FjaGVkVXNlckNvbnRyb2xsZXIsIG5ldyBJbmplY3QoVXNlckxpc3QpKVxuXG4gICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKFtmZXRjaFVzZXJzXSlcblxuICAgIGluamVjdG9yLmdldFByb21pc2UoTmV2ZXJDYWNoZWRVc2VyQ29udHJvbGxlcikudGhlbihmdW5jdGlvbihjb250cm9sbGVyMSkge1xuICAgICAgaW5qZWN0b3IuZ2V0UHJvbWlzZShOZXZlckNhY2hlZFVzZXJDb250cm9sbGVyKS50aGVuKGZ1bmN0aW9uKGNvbnRyb2xsZXIyKSB7XG4gICAgICAgIGV4cGVjdChjb250cm9sbGVyMSkubm90LnRvQmUoY29udHJvbGxlcjIpXG4gICAgICAgIGRvbmUoKVxuICAgICAgfSlcbiAgICB9KVxuICB9KVxuXG5cbiAgLy8gaXQoJ3Nob3VsZCBhbGxvdyBhc3luYyBkZXBlbmRlbmN5IGluIGEgcGFyZW50IGNvbnN0cnVjdG9yJywgZnVuY3Rpb24oZG9uZSkge1xuICAvLyAgIGNsYXNzIENoaWxkVXNlckNvbnRyb2xsZXIgZXh0ZW5kcyBVc2VyQ29udHJvbGxlciB7fVxuXG4gIC8vICAgdmFyIGluamVjdG9yID0gbmV3IEluamVjdG9yKFtmZXRjaFVzZXJzXSlcblxuICAvLyAgIGluamVjdG9yLmdldFByb21pc2UoQ2hpbGRVc2VyQ29udHJvbGxlcikudGhlbihmdW5jdGlvbihjaGlsZFVzZXJDb250cm9sbGVyKSB7XG4gIC8vICAgICBleHBlY3QoY2hpbGRVc2VyQ29udHJvbGxlcikudG9CZUluc3RhbmNlT2YoQ2hpbGRVc2VyQ29udHJvbGxlcilcbiAgLy8gICAgIGV4cGVjdChjaGlsZFVzZXJDb250cm9sbGVyLmxpc3QpLnRvQmVJbnN0YW5jZU9mKFVzZXJMaXN0KVxuICAvLyAgICAgZG9uZSgpXG4gIC8vICAgfSlcbiAgLy8gfSlcbn0pXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=