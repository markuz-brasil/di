jest.autoMockOff()
import '6to5/polyfill'

import {
  annotate,
  hasAnnotation,
  readAnnotations,
  Inject,
  InjectLazy,
  InjectPromise,
  Provide,
  ProvidePromise
} from '../index'

describe('hasAnnotation', function() {

  it('should return false if fn not annotated', function() {

    function foo() {}
    class Bar {}
    class SomeAnnotation {}

    expect(hasAnnotation(foo, SomeAnnotation)).toBe(false)
    expect(hasAnnotation(Bar, SomeAnnotation)).toBe(false)
  })


  it('should return true if the fn has an instance of given annotation', function() {

    class SomeAnnotation {}

    annotate(foo, new SomeAnnotation())
    function foo() {}

    expect(hasAnnotation(foo, SomeAnnotation)).toBe(true)
  })


  it('should return false if fn does not have given annotation', function() {

    class YepAnnotation {}
    class NopeAnnotation {}

    annotate(foo, new YepAnnotation())
    function foo() {}

    expect(hasAnnotation(foo, NopeAnnotation)).toBe(false)
  })
})

describe('readAnnotations', function() {

  it('should read @Provide', function() {
    class Bar {}

    class Foo {}
    annotate(Foo, new Provide(Bar))

    var annotations = readAnnotations(Foo)

    expect(annotations.provide.token).toBe(Bar)
    expect(annotations.provide.isPromise).toBe(false)
  })

  it('should read @ProvidePromise', function() {
    class Bar {}

    class Foo {}
    annotate(Foo, new ProvidePromise(Bar))

    var annotations = readAnnotations(Foo)

    expect(annotations.provide.token).toBe(Bar)
    expect(annotations.provide.isPromise).toBe(true)
  })

  it('should read @Inject', function() {
    class One {}
    class Two {}

    class Foo {}
    annotate(Foo, new Inject(One, Two))

    var annotations = readAnnotations(Foo)

    expect(annotations.params[0].token).toBe(One)
    expect(annotations.params[0].isPromise).toBe(false)
    expect(annotations.params[0].isLazy).toBe(false)

    expect(annotations.params[1].token).toBe(Two)
    expect(annotations.params[1].isPromise).toBe(false)
    expect(annotations.params[1].isLazy).toBe(false)
  })

  it('should read @InjectLazy', function() {
    class One {}

    class Foo {}
    annotate(Foo, new InjectLazy(One))

    var annotations = readAnnotations(Foo)

    expect(annotations.params[0].token).toBe(One)
    expect(annotations.params[0].isPromise).toBe(false)
    expect(annotations.params[0].isLazy).toBe(true)
  })

  it('should read @InjectPromise', function() {
    class One {}

    class Foo {}
    annotate(Foo, new InjectPromise(One))

    var annotations = readAnnotations(Foo)

    expect(annotations.params[0].token).toBe(One)
    expect(annotations.params[0].isPromise).toBe(true)
    expect(annotations.params[0].isLazy).toBe(false)
  })

  it('should read stacked @Inject{Lazy, Promise} annotations', function() {
    class One {}
    class Two {}
    class Three {}

    class Foo {}
    annotate(Foo, new Inject(One))
    annotate(Foo, new InjectLazy(Two))
    annotate(Foo, new InjectPromise(Three))

    var annotations = readAnnotations(Foo)

    expect(annotations.params[0].token).toBe(One)
    expect(annotations.params[0].isPromise).toBe(false)
    expect(annotations.params[0].isLazy).toBe(false)

    expect(annotations.params[1].token).toBe(Two)
    expect(annotations.params[1].isPromise).toBe(false)
    expect(annotations.params[1].isLazy).toBe(true)

    expect(annotations.params[2].token).toBe(Three)
    expect(annotations.params[2].isPromise).toBe(true)
    expect(annotations.params[2].isLazy).toBe(false)
  })
})
