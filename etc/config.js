'use strict'

var path = require('path')
var fs = require('fs')


var PATH_OFFSET = path.relative(process.cwd(), fs.realpathSync(process.env.ORI_PATH || '.'))

var CFG = {
  standalone: 'DI',
  sourcemaps: true,
  entry: './example/index.js',
  basename: 'DI-example',
  // basename: 'di-closure',
  dest: 'build',
  title: 'DI',

  js: {
    src: [
      './src/**/*.{js,jsx}',
      './example/**/*.{js,jsx}',
    ],
    // TODO: use this opt intead of having it hard coded on assets
    // use this for browserify
    opt: {},
  }
}



CFG.throw = console.error.bind(console)

CFG.PATH_OFFSET = PATH_OFFSET

CFG.js = CFG.js || {}
CFG.js.src = CFG.js.src || []

CFG.less = CFG.less || {}
CFG.less.src = CFG.less.src || []

CFG.jade = CFG.jade || {}
CFG.jade.src = CFG.jade.src || []

// Watch Files For Changes & reload
CFG.FILES = {
  jade: CFG.jade.src.map(function (p) {
    return path.join(PATH_OFFSET, p)
  }),

  less: CFG.less.src.map(function (p) {
    return path.join(PATH_OFFSET, p)
  }),

  js: CFG.js.src.map(function (p) {
    return path.join(PATH_OFFSET, p)
  }),

  tasks: [
    'gulpfile.js',
    'etc/**/*.js',
    path.join(PATH_OFFSET, 'config.js')
  ],
}


CFG.entry = path.join(PATH_OFFSET, CFG.entry)
CFG.dest = path.join(PATH_OFFSET, CFG.dest)

CFG.browserSync = {
  server: {
    baseDir: [
      // path.join(PATH_OFFSET, 'node_modules/tau-runtime/build'),
      path.join(PATH_OFFSET, 'build'),
      path.join(PATH_OFFSET, 'public'),
    ]
  },
  ghostMode: false,
  notify: false,
  port: 3000,
  browser: 'skip',
  // browser: 'chrome',

  // forces full page reload on css changes.
  // injectChanges: false,

  // Run as an https by uncommenting 'https: true'
  // Note: this uses an unsigned certificate which on first access
  //       will present a certificate warning in the browser.
  // https: true,
}

CFG.tasks = {}
process.argv.forEach(function(task, i){
  if (i < 2) {return}
  CFG.tasks[task] = true
})

module.exports = CFG
