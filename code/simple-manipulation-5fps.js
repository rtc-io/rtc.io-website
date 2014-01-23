var media = require('rtc-media');
var canvas = require('rtc-videoproc');
var vid;

// capture media
media().render(vid = canvas(document.body, { fps: 5 }));

// add a draw handler to the pipeline
vid.pipeline.add(require('rtc-filter-grayscale'));