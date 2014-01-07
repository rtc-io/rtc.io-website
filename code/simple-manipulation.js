var media = require('rtc-media');
var canvas = require('rtc-videoproc');
var vid;

// capture media
media().render(vid = canvas(document.body));

// add a draw handler to the pipeline
vid.pipeline.add(require('./filters/grayscale'));