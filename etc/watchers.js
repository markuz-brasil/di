'use strict'

var path = require('path')
var fs = require('fs')

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var runSequence = require('run-sequence');

var log = $.util.log
var red = $.util.colors.red
var cyan = $.util.colors.cyan

var CFG = require('./config');

function runTasks () {
  var args = [].slice.call(arguments)

  return function (evt) {
    if ('changed' !== evt.type) { return }
    // bug on runSequece.
    // this JSON trick is cleanest way to deep copy a simple, non-circular array.
    runSequence.apply(runSequence, JSON.parse(JSON.stringify(args)))
  }
}

function assets () {
  log("Starting '"+ cyan('watch:assets') +"'...")

  gulp.watch(CFG.FILES.js, runTasks('assets', 'reload'))
}

function gulpfile () {
  log("Starting '"+ cyan('watch:gulpfile') +"'...")
  gulp.watch(CFG.FILES.tasks, runTasks('restart'))
}

module.exports = {
  assets: assets,
  gulpfile: gulpfile,
}
