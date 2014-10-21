var gulp = require('gulp-help')(require('gulp'));
var async = require('async');
var getit = require('getit');
var data = require('gulp-data');
var fm = require('front-matter');
var jade = require('gulp-jade');
var gutil = require('gulp-util');
var st = require('st');
var http = require('http');
var port = process.env.PORT || 3000;
var Readable = require('readable-stream').Readable;
var File = require('vinyl');

var packages = [
  'rtc',
  'rtc-quickconnect',
  'rtc-signaller',
  'rtc-quickconnect',
  'rtc-tools',
  'rtc-capture',
  'rtc-attach',
  'rtc-mesh',
  'rtc-dcstream',
  'rtc-media',
  'rtc-core',
  'rtc-audioproc',
  'rtc-captureconfig',
  'rtc-videoproc',
  'rtc-sharedcursor'
];

gulp.task('serve', 'Serve the local files using a development server', ['build-pages'], function(cb) {
  var mount = st({
    path: process.cwd(),
    index: 'index.html',
    cache: false
  });

  http.createServer(mount).listen(port, function(err) {
    if (! err) {
      gutil.log('server running @ http://localhost:' + port + '/');
    }

    cb(err);
  });
});

gulp.task('build-pages', 'Build the pages for the site', function() {
  return gulp.src([
    'src/pages/*.jade',
    'src/pages/about/*.jade'
  ], { base: 'src/pages' })
  .pipe(data(function(file) {
    var content = fm(String(file.contents));
    file.contents = new Buffer(content.body);
    return content.attributes;
  }))
  .pipe(jade())
  .pipe(gulp.dest('./'));
});

gulp.task('build-packages', 'Fetch the various project readmes from the project sites', function() {
  var stream = new Readable({ objectMode: true });

  function download(package, callback) {
    getit('github://rtc-io/' + package + '/README.md', function(err, data) {
      if (err) {
        return callback(err);
      }

      stream.push(new File({
        cwd: '/',
        base: '.',
        path: package + '.md',
        contents: new Buffer(data)
      }));

      callback();
    })
  }

  async.forEach(packages, download, function(err) {
    stream.push(null);
  });

  stream._read = function () {};

  return stream.pipe(gulp.dest('./packages'));
});
