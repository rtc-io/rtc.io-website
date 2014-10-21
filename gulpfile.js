var gulp = require('gulp-help')(require('gulp'));
var data = require('gulp-data');
var fm = require('front-matter');
var jade = require('gulp-jade');
var gutil = require('gulp-util');
var st = require('st');
var http = require('http');
var port = process.env.PORT || 3000;

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
