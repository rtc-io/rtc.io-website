var crel = require('crel');
var qsa = require('cog/qsa');
var loader = require('cog/loader');
var main = qsa('.main')[0];
var reStatusOK = /^(2|3)\d{2}$/;
var reStripExt = /^(.*)\.js$/;
var baseScripts = [
  'https://rtcjs.io/socket.io/socket.io.js'
];

function createCodeFrame(sample, anchor, callback) {
  var frameContainer;
  var frame;
  var closeBar;
  var content;
  var xhr = new XMLHttpRequest();
  var sampleHTML = '<html><body></body></html>';

  frameContainer = crel('div', { class: 'codeframe' },
    closeBar = crel('div', { class: 'closer' }, 'close sample'),
    frame = crel('iframe')
  );

  // insert the code frame
  document.body.insertBefore(frameContainer, main);

  // initialise the content
  content = frame.contentDocument || frame.contentWindow.document;

  // check if we have custom html for this demo
  xhr.open('GET', 'code/' + sample + '.html');
  xhr.onload = function() {
    // if we got it, then use that as the document 
    if (this.status === 200) {
      sampleHTML = this.response;
    }

    // write the sample html into the frame
    content.open();
    content.write(sampleHTML);
    content.close();

    // trigger the callback
    callback(frameContainer, content);
  };

  xhr.send();
}

function initSample(anchor) {

  function closeCode() {
    var frame = anchor.codeframe;

    // if the anchor already has a codeframe associated with it dropit
    if (frame) {
      frame.className = 'codeframe';
      anchor.codeframe = null;

      setTimeout(function() {
        frame.parentNode.removeChild(frame);
      }, 500);
    }
  }

  anchor.addEventListener('click', function(evt) {
    var sample = (anchor.dataset.sample || '').replace(reStripExt, '$1');
    var frame;

    // don't do the default click anchor thing...
    evt.preventDefault();

    // create the code frame
    createCodeFrame(sample, anchor, function(frame, doc) {
      var style = doc.createElement('style');
      style.innerHTML = [
        'html { overflow: hidden; }',
        'body { width: 820px; margin: 5px auto 0; }',
        'body video { width: 100% }'
      ].join('\n');
      
      doc.head.appendChild(style);

      // load the required scripts
      loader(baseScripts, function() {
        loader('js/samples/' + sample + '.js');

        setTimeout(function() {
          frame.className += ' active';
        }, 100);
      });

      // associate the code frame with the frame
      anchor.codeframe = frame;
      qsa('.closer', frame)[0].addEventListener('click', closeCode);
    });
  });
}

qsa('.sample').forEach(initSample);
