'use strict'

var path = require('path')

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

var CFG = require('./config');

var log = $.util.log
var red = $.util.colors.red
var cyan = $.util.colors.cyan
var mag = $.util.colors.magenta

// TODO: add comments
gulp.task('assets', function(next){
  runSequence('assets:commonjs', 'assets:example', next)
})


// TODO: add comments
gulp.task('assets:commonjs', function (next) {

  return gulp.src('./src/*.js')
    .pipe($.cached('assets:commonjs', {optimizeMemory: true}))
    .pipe($.sourcemaps.init({loadMaps: true}))
    .pipe($['6to5']()).on('error', next)
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest('./commonjs'))
    .pipe($.size({title: 'cjs: DI'}))
    .pipe(thr(function (){ next() }))

})

// TODO: add comments
gulp.task('assets:example', function (next) {

  CFG.sourcemaps = CFG.sourcemaps || true
  CFG.aliases = CFG.aliases || {}
  CFG.entry = CFG.entry || './index.js'
  CFG.basename = CFG.basename || 'index.js'
  CFG.dest = CFG.dest || '.'
  CFG.title = CFG.title || CFG.basename

  return browserify({
      debug: true,
      extensions: ['.js', '.jsx']
    })
    .transform(to5ify.configure())
    .on('error', next)
    .transform(aliasify.configure({
      aliases: {
        'di': './commonjs'
      },
      appliesTo: {includeExtensions: ['.js', '.jsx']},
    }))
    .on('error', next)
    .transform(brfs)
    .require('./example/index.js', {entry: true})
    .bundle().on('error', next)
    .pipe(vinylify('index.js'))
    .pipe($.rename(function (p){ p.extname = '.js'}))
    .pipe($.sourcemaps.init({loadMaps: true}))
    // .pipe($.uglify())
    .pipe($.sourcemaps.write('./maps'))
    .pipe(gulp.dest('build'))
    .pipe($.size({title: 'js: example'}))
    .pipe(thr(function (){ next() }))
})
