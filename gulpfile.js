'use strict'
var path = require('path')
var fs = require('fs')

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var del = require('del');
var runSequence = require('run-sequence');
var thr = require('through2').obj
var jest = require('jest-cli')

var log = $.util.log
var red = $.util.colors.red
var cyan = $.util.colors.cyan
var mag = $.util.colors.magenta

// Clean Output Directory
gulp.task('clean', del.bind(null, ['commonjs'], {dot: true}))

// Lint ES6 JavaScript
gulp.task('jshint', function () {
  return gulp.src('src/**/*.js')
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
});

// Actual build task
gulp.task('build',['clean'], function(next){
  runSequence('compile', 'test', next)
})

// Compile ES6 -> ES5
gulp.task('compile', function (next) {
  return gulp.src('./src/**/*.js')
    .pipe($.cached('compile', {optimizeMemory: true}))
    .pipe($.sourcemaps.init({loadMaps: true}))
    .pipe($['6to5']()).on('error', next)
    .pipe($.sourcemaps.write('./maps'))
    .pipe(gulp.dest('./commonjs'))
    .pipe($.size({title: 'compiled'}))
})

// Run jest testing framework
gulp.task('test', function(next){
  var cfg = {
    config: {
      rootDir: './commonjs',
      setupTestFrameworkScriptFile: '<rootDir>/__fixtures__/jasmine_matchers.js',
    }
  }

  jest.runCLI(cfg, process.cwd(), function(ok){
    if (!ok) log(red('jest error'))
    next()
  })
})

// Quit task if gulpfile changed
gulp.task('restart', function(){
  log(red(':: restarting ::'))
  process.exit(0)
})

// Setup watchers
gulp.task('watch', function(next){
  log("Starting '"+ cyan('watch:gulpfile') +"'...")
  log("Starting '"+ cyan('watch:assets') +"'...")

  gulp.watch('./gulpfile.js', runTasks('restart'))
  gulp.watch('./src/**/*.js', runTasks(['jshint', 'compile'], 'test'))

  next()
})

// Helper functions used by the watchers
function runTasks () {
  var args = [].slice.call(arguments)
  return function (evt) {
    if ('changed' !== evt.type) return
    // bug on runSequece.
    // this JSON trick is cleanest way to deep copy a simple, non-circular array.
    runSequence.apply(runSequence, JSON.parse(JSON.stringify(args)))
  }
}
