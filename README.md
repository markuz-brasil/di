TODO: Explain the motivation for this fork.

## Dependency Injection v2

This readme describes how to set up your working space in order to run the tests and hack on it. TODO: add howto docs

### Installation

```bash
# Clone this repo (or your fork).
git clone --depth=1 https://github.com/markuz-brasil/dep-in.git

# Install all the the dev dependencies.
npm install
```

### Transpiling ES6
All the source code is written in the upcoming version of JavaScript - ES6. In order to use it in the current browsers/nodejs you need to transpile the code into ES5 using [6to5].


```bash
# Transpile ES6 into ./commonjs/* and test (jest) the source files
$ npm test

# Watch all the sources and transpile/test/jshint on any change
npm run dev
```

### More stuff

I talked about this DI framework at the [ng-conf], here are some more links...

  - [video](http://www.youtube.com/watch?v=_OGGsf1ZXMs)
  - [slides](https://dl.dropboxusercontent.com/u/36607830/talks/ng-conf-di-v2.pdf) ([annotated version](https://dl.dropboxusercontent.com/u/36607830/talks/ng-conf-di-v2-annotated.pdf))
