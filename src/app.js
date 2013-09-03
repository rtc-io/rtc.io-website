var qsa = require('cog/qsa');
var runsam = require('runsam');
var reStatusOK = /^(2|3)\d{2}$/;

function initSample(anchor) {
  anchor.addEventListener('click', function(evt) {
    var xhr = new XMLHttpRequest();

    // don't do the default click anchor thing...
    evt.preventDefault();

    xhr.open('get', anchor.dataset.sample, true);
    xhr.onload = function() {
      if (reStatusOK.test(this.status)) {
        runsam.prepare(this.response, { cdn: 'http://wzrd.in' });
      }
    };

    xhr.send();
  });
}

qsa('.sample').forEach(initSample);
