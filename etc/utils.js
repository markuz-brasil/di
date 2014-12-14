'use strict'

var path = require('path')
var exec = require('child_process').exec
var fs = require('fs')

var gulp = require('gulp')
var $ = require('gulp-load-plugins')()
var del = require('del')
var runSequence = require('run-sequence')
var thr = require('through2').obj

var browserify =  require('browserify')
var to5ify = require('6to5ify')
var aliasify = require('aliasify')
var brfs = require('brfs')
var vinylify = require('vinyl-source-stream2')

var log = $.util.log
var red = $.util.colors.red
var cyan = $.util.colors.cyan
var mag = $.util.colors.magenta

function bundleClosure (opt, next) {

  opt.sourcemaps = opt.sourcemaps || true
  opt.aliases = opt.aliases || {}
  opt.entry = opt.entry || './index.js'
  opt.basename = opt.basename || 'index.js'
  opt.dest = opt.dest || '.'
  opt.title = opt.title || opt.basename

  return browserify({
      debug: opt.sourcemaps,
      extensions: ['.js', '.jsx']
    })
    .transform(to5ify.configure())
    .on('error', next)
    .transform(aliasify.configure({
      aliases: opt.aliases,
      appliesTo: {includeExtensions: ['.js', '.jsx']},
    }))
    .on('error', next)
    .transform(brfs)
    .require(opt.entry, {entry: true})
    .bundle()
    .on('error', next)
    .pipe(vinylify(opt.basename))
    .pipe($.rename(function (p){ p.extname = '.js'}))
    .pipe($.sourcemaps.init({loadMaps: opt.sourcemaps}))
    // .pipe($.uglify())
    .pipe($.sourcemaps.write('./maps'))
    .pipe(gulp.dest(opt.dest))
    .pipe($.size({title: 'js: '+ opt.title}))
    .pipe($.gzip())
    .pipe($.size({title: 'gz: '+ opt.title}))
    .pipe(gulp.dest(opt.dest +'/gzip'))
    .pipe(thr(function (){ next() }))
}

function bundleNamespace (opt, next) {

  opt.sourcemaps = opt.sourcemaps || true
  opt.aliases = opt.aliases || {}
  opt.entry = opt.entry || './index.js'
  opt.basename = opt.basename || 'index.js'
  opt.dest = opt.dest || '.'
  opt.title = opt.title || opt.basename
  opt.standalone = opt.standalone || opt.basename.split('.')[0]

  return browserify({
      debug: opt.sourcemaps,
      standalone: opt.standalone,
      extensions: ['.js', '.jsx'],
    })
    .transform(to5ify.configure())
    .on('error', next)
    .transform(aliasify.configure({
      aliases: opt.aliases,
      appliesTo: {includeExtensions: ['.js', '.jsx']},
    }))
    .on('error', next)
    .transform(brfs)
    .require(opt.entry, {entry: true})
    .bundle()
    .on('error', next)
    .pipe(vinylify(opt.basename))
    .pipe($.rename(function (p){ p.extname = '.js'}))
    .pipe($.sourcemaps.init({loadMaps: opt.sourcemaps}))
    // .pipe($.uglify())
    .pipe($.sourcemaps.write('./maps'))
    .pipe(gulp.dest(opt.dest))
    .pipe($.size({title: 'js: '+ opt.title}))
    .pipe($.gzip())
    .pipe($.size({title: 'gz: '+ opt.title}))
    .pipe(gulp.dest(opt.dest +'/gzip'))
    .pipe(thr(function (){ next() }))
}

function bundleCommonjs (opt, next) {

  opt.sourcemaps = opt.sourcemaps || true
  opt.entry = opt.entry || './index.js'
  opt.dest = opt.dest || '.'
  opt.title = opt.title || opt.entry

  var re = /\.es6/g

  return gulp.src(opt.FILES.js)
    .pipe($.cached('assets:commonjs', {optimizeMemory: true}))
    .pipe($.sourcemaps.init({loadMaps: opt.sourcemaps}))
    .pipe($['6to5']()).on('error', next)
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest(opt.dest + '/commonjs'))
    // .pipe(thr(function (vfs, enc, next){ console.log(arguments[0].path); next() }))
    .pipe($.size({title: 'cjs: '+ opt.title}))
    .pipe(thr(function (){ next() }))
}

module.exports.bundleClosure = bundleClosure
module.exports.bundleCommonjs = bundleCommonjs
module.exports.bundleNamespace = bundleNamespace
