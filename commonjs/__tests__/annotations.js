"use strict";

jest.autoMockOff();
require('6to5/polyfill');

var annotate = require('../index').annotate;
var hasAnnotation = require('../index').hasAnnotation;
var readAnnotations = require('../index').readAnnotations;
var Inject = require('../index').Inject;
var InjectLazy = require('../index').InjectLazy;
var InjectPromise = require('../index').InjectPromise;
var Provide = require('../index').Provide;
var ProvidePromise = require('../index').ProvidePromise;


describe("hasAnnotation", function () {
  it("should return false if fn not annotated", function () {
    function foo() {}
    var Bar = function Bar() {};

    var SomeAnnotation = function SomeAnnotation() {};

    expect(hasAnnotation(foo, SomeAnnotation)).toBe(false);
    expect(hasAnnotation(Bar, SomeAnnotation)).toBe(false);
  });


  it("should return true if the fn has an instance of given annotation", function () {
    var SomeAnnotation = function SomeAnnotation() {};

    annotate(foo, new SomeAnnotation());
    function foo() {}

    expect(hasAnnotation(foo, SomeAnnotation)).toBe(true);
  });


  it("should return false if fn does not have given annotation", function () {
    var YepAnnotation = function YepAnnotation() {};

    var NopeAnnotation = function NopeAnnotation() {};

    annotate(foo, new YepAnnotation());
    function foo() {}

    expect(hasAnnotation(foo, NopeAnnotation)).toBe(false);
  });
});

describe("readAnnotations", function () {
  it("should read @Provide", function () {
    var Bar = function Bar() {};

    var Foo = function Foo() {};

    annotate(Foo, new Provide(Bar));

    var annotations = readAnnotations(Foo);

    expect(annotations.provide.token).toBe(Bar);
    expect(annotations.provide.isPromise).toBe(false);
  });

  it("should read @ProvidePromise", function () {
    var Bar = function Bar() {};

    var Foo = function Foo() {};

    annotate(Foo, new ProvidePromise(Bar));

    var annotations = readAnnotations(Foo);

    expect(annotations.provide.token).toBe(Bar);
    expect(annotations.provide.isPromise).toBe(true);
  });

  it("should read @Inject", function () {
    var One = function One() {};

    var Two = function Two() {};

    var Foo = function Foo() {};

    annotate(Foo, new Inject(One, Two));

    var annotations = readAnnotations(Foo);

    expect(annotations.params[0].token).toBe(One);
    expect(annotations.params[0].isPromise).toBe(false);
    expect(annotations.params[0].isLazy).toBe(false);

    expect(annotations.params[1].token).toBe(Two);
    expect(annotations.params[1].isPromise).toBe(false);
    expect(annotations.params[1].isLazy).toBe(false);
  });

  it("should read @InjectLazy", function () {
    var One = function One() {};

    var Foo = function Foo() {};

    annotate(Foo, new InjectLazy(One));

    var annotations = readAnnotations(Foo);

    expect(annotations.params[0].token).toBe(One);
    expect(annotations.params[0].isPromise).toBe(false);
    expect(annotations.params[0].isLazy).toBe(true);
  });

  it("should read @InjectPromise", function () {
    var One = function One() {};

    var Foo = function Foo() {};

    annotate(Foo, new InjectPromise(One));

    var annotations = readAnnotations(Foo);

    expect(annotations.params[0].token).toBe(One);
    expect(annotations.params[0].isPromise).toBe(true);
    expect(annotations.params[0].isLazy).toBe(false);
  });

  it("should read stacked @Inject{Lazy, Promise} annotations", function () {
    var One = function One() {};

    var Two = function Two() {};

    var Three = function Three() {};

    var Foo = function Foo() {};

    annotate(Foo, new Inject(One));
    annotate(Foo, new InjectLazy(Two));
    annotate(Foo, new InjectPromise(Three));

    var annotations = readAnnotations(Foo);

    expect(annotations.params[0].token).toBe(One);
    expect(annotations.params[0].isPromise).toBe(false);
    expect(annotations.params[0].isLazy).toBe(false);

    expect(annotations.params[1].token).toBe(Two);
    expect(annotations.params[1].isPromise).toBe(false);
    expect(annotations.params[1].isLazy).toBe(true);

    expect(annotations.params[2].token).toBe(Three);
    expect(annotations.params[2].isPromise).toBe(true);
    expect(annotations.params[2].isLazy).toBe(false);
  });
});
//# sourceMappingURL=../maps/__tests__/annotations.js.map