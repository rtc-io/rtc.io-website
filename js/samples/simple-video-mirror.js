(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var mediaMod = require('rtc-media');
var mediaObj = mediaMod({ start: true });
var mirrorWindow = document.getElementById('mirror');
	
// Render local video
mediaObj.render(mirrorWindow);

// Flip rendered video so the user views their own
// feed as a mirror image
mirrorWindow.style.transform = 'rotateY(180deg)';
},{"rtc-media":6}],2:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
## cog/extend

```js
var extend = require('cog/extend');
```

### extend(target, *)

Shallow copy object properties from the supplied source objects (*) into
the target object, returning the target object once completed:

```js
extend({ a: 1, b: 2 }, { c: 3 }, { d: 4 }, { b: 5 }));
```

See an example on [requirebin](http://requirebin.com/?gist=6079475).
**/
module.exports = function(target) {
  [].slice.call(arguments, 1).forEach(function(source) {
    if (! source) {
      return;
    }

    for (var prop in source) {
      target[prop] = source[prop];
    }
  });

  return target;
};
},{}],3:[function(require,module,exports){
/* jshint node: true */
/* global window: false */
/* global navigator: false */

'use strict';

var browser = require('detect-browser');

/**
  ### `rtc-core/detect`

  A browser detection helper for accessing prefix-free versions of the various
  WebRTC types.

  ### Example Usage

  If you wanted to get the native `RTCPeerConnection` prototype in any browser
  you could do the following:

  ```js
  var detect = require('rtc-core/detect'); // also available in rtc/detect
  var RTCPeerConnection = detect('RTCPeerConnection');
  ```

  This would provide whatever the browser prefixed version of the
  RTCPeerConnection is available (`webkitRTCPeerConnection`,
  `mozRTCPeerConnection`, etc).
**/
var detect = module.exports = function(target, opts) {
  var attach = (opts || {}).attach;
  var prefixIdx;
  var prefix;
  var testName;
  var hostObject = this || (typeof window != 'undefined' ? window : undefined);

  // initialise to default prefixes
  // (reverse order as we use a decrementing for loop)
  var prefixes = ((opts || {}).prefixes || ['ms', 'o', 'moz', 'webkit']).concat('');

  // if we have no host object, then abort
  if (! hostObject) {
    return;
  }

  // iterate through the prefixes and return the class if found in global
  for (prefixIdx = prefixes.length; prefixIdx--; ) {
    prefix = prefixes[prefixIdx];

    // construct the test class name
    // if we have a prefix ensure the target has an uppercase first character
    // such that a test for getUserMedia would result in a
    // search for webkitGetUserMedia
    testName = prefix + (prefix ?
                            target.charAt(0).toUpperCase() + target.slice(1) :
                            target);

    if (typeof hostObject[testName] != 'undefined') {
      // update the last used prefix
      detect.browser = detect.browser || prefix.toLowerCase();

      if (attach) {
         hostObject[target] = hostObject[testName];
      }

      return hostObject[testName];
    }
  }
};

// detect mozilla (yes, this feels dirty)
detect.moz = typeof navigator != 'undefined' && !!navigator.mozGetUserMedia;

// set the browser and browser version
detect.browser = browser.name;
detect.browserVersion = detect.version = browser.version;

},{"detect-browser":4}],4:[function(require,module,exports){
var browsers = [
  [ 'chrome', /Chrom(?:e|ium)\/([0-9\.]+)(:?\s|$)/ ],
  [ 'firefox', /Firefox\/([0-9\.]+)(?:\s|$)/ ],
  [ 'opera', /Opera\/([0-9\.]+)(?:\s|$)/ ],
  [ 'ie', /Trident\/7\.0.*rv\:([0-9\.]+)\).*Gecko$/ ],
  [ 'ie', /MSIE\s([0-9\.]+);.*Trident\/[4-7].0/ ],
  [ 'ie', /MSIE\s(7\.0)/ ],
  [ 'bb10', /BB10;\sTouch.*Version\/([0-9\.]+)/ ],
  [ 'android', /Android\s([0-9\.]+)/ ],
  [ 'ios', /iPad\;\sCPU\sOS\s([0-9\._]+)/ ],
  [ 'ios',  /iPhone\;\sCPU\siPhone\sOS\s([0-9\._]+)/ ],
  [ 'safari', /Safari\/([0-9\._]+)/ ]
];

var match = browsers.map(match).filter(isMatch)[0];
var parts = match && match[3].split(/[._]/).slice(0,3);

while (parts && parts.length < 3) {
  parts.push('0');
}

// set the name and version
exports.name = match && match[0];
exports.version = parts && parts.join('.');

function match(pair) {
  return pair.concat(pair[1].exec(navigator.userAgent));
}

function isMatch(pair) {
  return !!pair[2];
}

},{}],5:[function(require,module,exports){
var detect = require('./detect');
var requiredFunctions = [
  'init'
];

function isSupported(plugin) {
  return plugin && typeof plugin.supported == 'function' && plugin.supported(detect);
}

function isValid(plugin) {
  var supportedFunctions = requiredFunctions.filter(function(fn) {
    return typeof plugin[fn] == 'function';
  });

  return supportedFunctions.length === requiredFunctions.length;
}

module.exports = function(plugins) {
  return [].concat(plugins || []).filter(isSupported).filter(isValid)[0];
}

},{"./detect":3}],6:[function(require,module,exports){
var capture = require('rtc-capture');
var attach = require('rtc-attach');
var extend = require('cog/extend');

/**
  # rtc-media

  This is a convenience function for invoking media capture and rendering
  using the [`rtc-capture`](https://github.com/rtc-io/rtc-capture) and
  [`rtc-attach`](https://github.com/rtc-io/rtc-attach) packages respectively
  within an application.

  ## Example Usage

  Default constraints `{ audio: true, video: true }` capture and rendering
  an new video element within the document.body:

  <<< examples/render-to-body.js

  In the event that you wish to make use of any of the rtc.io plugins, then
  the following example demonstrates how to provide a single "capture and
  render" call that will work with a plugin:

  <<< examples/plugin.js

**/

var media = module.exports = function(opts) {
  // do we have constraints
  var constraints = (opts || {}).constraints || { video: true, audio: true };

  // or do we have a stream
  var stream = (opts || {}).stream;

  // if we have been passed constraints, assume we are attaching a local stream
  // otherwise, use the generic attach options
  var streamAttach = (opts || {}).constraints ? attach.local : attach;

  // detect a target
  var target = (opts || {}).target || document.body;
  var nonMediaTarget = !(target instanceof HTMLMediaElement);

  function handleAttach(err, el) {
    if (err) {
      return;
    }

    if (target && nonMediaTarget && target !== el) {
      target.appendChild(el);
    }
  }

  // if we have a stream, move onto rendering immediately
  if (stream) {
    return streamAttach(stream, opts, handleAttach);
  }

  return capture(constraints, opts, function(err, stream) {
    streamAttach(stream, opts, handleAttach);
  });
};

media.capture = function(constraints, opts) {
  return media(extend({}, opts, { constraints: constraints }));
};

media.attach = media.render = function(stream, opts) {
  return media(extend({}, opts, { stream: stream }));
};

},{"cog/extend":2,"rtc-attach":7,"rtc-capture":8}],7:[function(require,module,exports){
var plugin = require('rtc-core/plugin');
var extend = require('cog/extend');

/**
  # rtc-attach

  Roughly equivalent to the
  [`attachMediaStream`](https://www.npmjs.org/package/attachmediastream)
  package but with support for rtc.io plugins.  Also uses an error first
  async API to allow plugins time to initialize.

  ## Example Usage

  <<< examples/simple.js

  ## Example using Plugins

  <<< examples/plugins.js

  ## Reference

  ### `attach(stream, opts?, callback)`

  Attach `stream` to a HTML element that will render the content. The provided
  `callback` follows the format of `fn(err, element)`.  While the async nature
  of this package may seem odd, because a plugin may need time to initialize
  this caters for this case in addition to standard usage in the browser.

  - `autoplay` (default: `true`) - by default after the stream has been
    attached to the element it will be played.  This is done by calling
    the `play()` function on the element rather than relying on `autoplay`
    attribute functionality.

  - `el` (default: `null`) - if you with to supply an element to be used
    instead of creating a new element to receive the stream specify it here.

  - `muted` (default: `false`) - whether the created element should be muted
    or not.  For local streams this should almost always, be true so consider
    using the `attach.local` helper function for simple cases.

  - `plugins` (default: `[]`) - specify one or more plugins that can be used
    to render the media stream appropriate to the current platform in the
    event that WebRTC and/or media capture is supported via a browser plugin.

**/
var attach = module.exports = function(stream, opts, callback) {
  var URL = typeof window != 'undefined' && window.URL;
  var pinst;

  if (typeof opts == 'function') {
    callback = opts;
    opts = {};
  }

  function applyModifications(el, o) {
    if ((o || {}).muted) {
      el.muted = true;
      el.setAttribute('muted', '');
    }

    if ((o || {}).mirror) {
      el.setAttribute('data-mirrored', true);
    }

    return el;
  }

  function attachToElement(s, o) {
    var autoplay = (o || {}).autoplay;
    var elType = 'audio';
    var el = (o || {}).el || (o || {}).target;

    // check the stream is valid
    var isValid = s && typeof s.getVideoTracks == 'function';

    // determine the element type
    if (isValid && s.getVideoTracks().length > 0) {
      elType = 'video';
    }

    // if we have been passed an "unplayable" target create a new element
    if (el && typeof el.play != 'function') {
      el = null;
    }

    // prepare the element
    el = el || document.createElement(elType);

    // attach the stream
    if (URL && URL.createObjectURL) {
      el.src = URL.createObjectURL(stream);
    }
    else if (el.srcObject) {
      el.srcObject = stream;
    }
    else if (el.mozSrcObject) {
      el.mozSrcObject = stream;
    }

    if (autoplay === undefined || autoplay) {
      el.setAttribute('autoplay', '');
      el.play();
    }

    return applyModifications(el, o);
  }

  // see if we are using a plugin
  pinst = plugin((opts || {}).plugins);
  if (pinst) {
    return pinst.init(opts, function(err) {
      if (err) {
        return callback(err);
      }

      if (typeof pinst.attach != 'function') {
        return callback(new Error('plugin must support the attach function'));
      }

      callback(null, applyModifications(pinst.attach(stream, opts), opts));
    });
  }

  callback(null, attachToElement(stream, opts));
};

/**
  ### `attach.local(stream, opts?, callback)`

  Attach a local stream with options appropriate for local streams:

  - `muted`: `true`

**/
attach.local = function(stream, opts, callback) {
  if (typeof opts == 'function') {
    callback = opts;
    opts = {};
  }

  attach(stream, extend({ muted: true, mirror: true }, opts), callback);
};

},{"cog/extend":2,"rtc-core/plugin":5}],8:[function(require,module,exports){
var plugin = require('rtc-core/plugin');
var detect = require('rtc-core/detect');

// patch navigator getUserMedia
navigator.getUserMedia = navigator.getUserMedia ||
  detect.call(navigator, 'getUserMedia');

/**
  # rtc-capture

  Roughly equivalent to the
  [`getUserMedia`](https://www.npmjs.org/package/getusermedia) package but with
  support for rtc.io plugins.

  ## Example Usage

  <<< examples/simple.js

  ## Example with using Plugins

  <<< examples/plugins.js

  ## Reference

  ### `capture(constraints, opts?, callback)`

  Capture media with the supplied `constraints`.  If an `opts` argument is
  supplied look for plugins that may change the behaviour of the capture
  operation.

**/
module.exports = function(constraints, opts, callback) {
  var pinst;

  function handleCapture(stream) {
    callback(null, stream);
  }

  if (typeof opts == 'function') {
    callback = opts;
    opts = {};
  }

  // see if we are using a plugin
  pinst = plugin((opts || {}).plugins);
  if (pinst) {
    return pinst.init(opts, function(err) {
      if (err) {
        return callback(err);
      }

      if (typeof navigator.getUserMedia != 'function') {
        return callback(new Error('plugin does not support media capture'));
      }

      navigator.getUserMedia(constraints, handleCapture, callback);
    });
  }

  if (typeof navigator.getUserMedia != 'function') {
    return callback(new Error('getUserMedia not supported'));
  }

  navigator.getUserMedia(constraints, handleCapture, callback);
};

},{"rtc-core/detect":3,"rtc-core/plugin":5}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5udm0vdjAuMTAuMzMvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjb2RlL3NpbXBsZS12aWRlby1taXJyb3IuanMiLCJub2RlX21vZHVsZXMvY29nL2V4dGVuZC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtY29yZS9kZXRlY3QuanMiLCJub2RlX21vZHVsZXMvcnRjLWNvcmUvbm9kZV9tb2R1bGVzL2RldGVjdC1icm93c2VyL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvcnRjLWNvcmUvcGx1Z2luLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1tZWRpYS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtbWVkaWEvbm9kZV9tb2R1bGVzL3J0Yy1hdHRhY2gvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLW1lZGlhL25vZGVfbW9kdWxlcy9ydGMtY2FwdHVyZS9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIG1lZGlhTW9kID0gcmVxdWlyZSgncnRjLW1lZGlhJyk7XG52YXIgbWVkaWFPYmogPSBtZWRpYU1vZCh7IHN0YXJ0OiB0cnVlIH0pO1xudmFyIG1pcnJvcldpbmRvdyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtaXJyb3InKTtcblx0XG4vLyBSZW5kZXIgbG9jYWwgdmlkZW9cbm1lZGlhT2JqLnJlbmRlcihtaXJyb3JXaW5kb3cpO1xuXG4vLyBGbGlwIHJlbmRlcmVkIHZpZGVvIHNvIHRoZSB1c2VyIHZpZXdzIHRoZWlyIG93blxuLy8gZmVlZCBhcyBhIG1pcnJvciBpbWFnZVxubWlycm9yV2luZG93LnN0eWxlLnRyYW5zZm9ybSA9ICdyb3RhdGVZKDE4MGRlZyknOyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuIyMgY29nL2V4dGVuZFxuXG5gYGBqc1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcbmBgYFxuXG4jIyMgZXh0ZW5kKHRhcmdldCwgKilcblxuU2hhbGxvdyBjb3B5IG9iamVjdCBwcm9wZXJ0aWVzIGZyb20gdGhlIHN1cHBsaWVkIHNvdXJjZSBvYmplY3RzICgqKSBpbnRvXG50aGUgdGFyZ2V0IG9iamVjdCwgcmV0dXJuaW5nIHRoZSB0YXJnZXQgb2JqZWN0IG9uY2UgY29tcGxldGVkOlxuXG5gYGBqc1xuZXh0ZW5kKHsgYTogMSwgYjogMiB9LCB7IGM6IDMgfSwgeyBkOiA0IH0sIHsgYjogNSB9KSk7XG5gYGBcblxuU2VlIGFuIGV4YW1wbGUgb24gW3JlcXVpcmViaW5dKGh0dHA6Ly9yZXF1aXJlYmluLmNvbS8/Z2lzdD02MDc5NDc1KS5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0YXJnZXQpIHtcbiAgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLmZvckVhY2goZnVuY3Rpb24oc291cmNlKSB7XG4gICAgaWYgKCEgc291cmNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiB0YXJnZXQ7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgd2luZG93OiBmYWxzZSAqL1xuLyogZ2xvYmFsIG5hdmlnYXRvcjogZmFsc2UgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgYnJvd3NlciA9IHJlcXVpcmUoJ2RldGVjdC1icm93c2VyJyk7XG5cbi8qKlxuICAjIyMgYHJ0Yy1jb3JlL2RldGVjdGBcblxuICBBIGJyb3dzZXIgZGV0ZWN0aW9uIGhlbHBlciBmb3IgYWNjZXNzaW5nIHByZWZpeC1mcmVlIHZlcnNpb25zIG9mIHRoZSB2YXJpb3VzXG4gIFdlYlJUQyB0eXBlcy5cblxuICAjIyMgRXhhbXBsZSBVc2FnZVxuXG4gIElmIHlvdSB3YW50ZWQgdG8gZ2V0IHRoZSBuYXRpdmUgYFJUQ1BlZXJDb25uZWN0aW9uYCBwcm90b3R5cGUgaW4gYW55IGJyb3dzZXJcbiAgeW91IGNvdWxkIGRvIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBganNcbiAgdmFyIGRldGVjdCA9IHJlcXVpcmUoJ3J0Yy1jb3JlL2RldGVjdCcpOyAvLyBhbHNvIGF2YWlsYWJsZSBpbiBydGMvZGV0ZWN0XG4gIHZhciBSVENQZWVyQ29ubmVjdGlvbiA9IGRldGVjdCgnUlRDUGVlckNvbm5lY3Rpb24nKTtcbiAgYGBgXG5cbiAgVGhpcyB3b3VsZCBwcm92aWRlIHdoYXRldmVyIHRoZSBicm93c2VyIHByZWZpeGVkIHZlcnNpb24gb2YgdGhlXG4gIFJUQ1BlZXJDb25uZWN0aW9uIGlzIGF2YWlsYWJsZSAoYHdlYmtpdFJUQ1BlZXJDb25uZWN0aW9uYCxcbiAgYG1velJUQ1BlZXJDb25uZWN0aW9uYCwgZXRjKS5cbioqL1xudmFyIGRldGVjdCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGFyZ2V0LCBvcHRzKSB7XG4gIHZhciBhdHRhY2ggPSAob3B0cyB8fCB7fSkuYXR0YWNoO1xuICB2YXIgcHJlZml4SWR4O1xuICB2YXIgcHJlZml4O1xuICB2YXIgdGVzdE5hbWU7XG4gIHZhciBob3N0T2JqZWN0ID0gdGhpcyB8fCAodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHVuZGVmaW5lZCk7XG5cbiAgLy8gaW5pdGlhbGlzZSB0byBkZWZhdWx0IHByZWZpeGVzXG4gIC8vIChyZXZlcnNlIG9yZGVyIGFzIHdlIHVzZSBhIGRlY3JlbWVudGluZyBmb3IgbG9vcClcbiAgdmFyIHByZWZpeGVzID0gKChvcHRzIHx8IHt9KS5wcmVmaXhlcyB8fCBbJ21zJywgJ28nLCAnbW96JywgJ3dlYmtpdCddKS5jb25jYXQoJycpO1xuXG4gIC8vIGlmIHdlIGhhdmUgbm8gaG9zdCBvYmplY3QsIHRoZW4gYWJvcnRcbiAgaWYgKCEgaG9zdE9iamVjdCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgcHJlZml4ZXMgYW5kIHJldHVybiB0aGUgY2xhc3MgaWYgZm91bmQgaW4gZ2xvYmFsXG4gIGZvciAocHJlZml4SWR4ID0gcHJlZml4ZXMubGVuZ3RoOyBwcmVmaXhJZHgtLTsgKSB7XG4gICAgcHJlZml4ID0gcHJlZml4ZXNbcHJlZml4SWR4XTtcblxuICAgIC8vIGNvbnN0cnVjdCB0aGUgdGVzdCBjbGFzcyBuYW1lXG4gICAgLy8gaWYgd2UgaGF2ZSBhIHByZWZpeCBlbnN1cmUgdGhlIHRhcmdldCBoYXMgYW4gdXBwZXJjYXNlIGZpcnN0IGNoYXJhY3RlclxuICAgIC8vIHN1Y2ggdGhhdCBhIHRlc3QgZm9yIGdldFVzZXJNZWRpYSB3b3VsZCByZXN1bHQgaW4gYVxuICAgIC8vIHNlYXJjaCBmb3Igd2Via2l0R2V0VXNlck1lZGlhXG4gICAgdGVzdE5hbWUgPSBwcmVmaXggKyAocHJlZml4ID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB0YXJnZXQuc2xpY2UoMSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldCk7XG5cbiAgICBpZiAodHlwZW9mIGhvc3RPYmplY3RbdGVzdE5hbWVdICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAvLyB1cGRhdGUgdGhlIGxhc3QgdXNlZCBwcmVmaXhcbiAgICAgIGRldGVjdC5icm93c2VyID0gZGV0ZWN0LmJyb3dzZXIgfHwgcHJlZml4LnRvTG93ZXJDYXNlKCk7XG5cbiAgICAgIGlmIChhdHRhY2gpIHtcbiAgICAgICAgIGhvc3RPYmplY3RbdGFyZ2V0XSA9IGhvc3RPYmplY3RbdGVzdE5hbWVdO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gaG9zdE9iamVjdFt0ZXN0TmFtZV07XG4gICAgfVxuICB9XG59O1xuXG4vLyBkZXRlY3QgbW96aWxsYSAoeWVzLCB0aGlzIGZlZWxzIGRpcnR5KVxuZGV0ZWN0Lm1veiA9IHR5cGVvZiBuYXZpZ2F0b3IgIT0gJ3VuZGVmaW5lZCcgJiYgISFuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhO1xuXG4vLyBzZXQgdGhlIGJyb3dzZXIgYW5kIGJyb3dzZXIgdmVyc2lvblxuZGV0ZWN0LmJyb3dzZXIgPSBicm93c2VyLm5hbWU7XG5kZXRlY3QuYnJvd3NlclZlcnNpb24gPSBkZXRlY3QudmVyc2lvbiA9IGJyb3dzZXIudmVyc2lvbjtcbiIsInZhciBicm93c2VycyA9IFtcbiAgWyAnY2hyb21lJywgL0Nocm9tKD86ZXxpdW0pXFwvKFswLTlcXC5dKykoOj9cXHN8JCkvIF0sXG4gIFsgJ2ZpcmVmb3gnLCAvRmlyZWZveFxcLyhbMC05XFwuXSspKD86XFxzfCQpLyBdLFxuICBbICdvcGVyYScsIC9PcGVyYVxcLyhbMC05XFwuXSspKD86XFxzfCQpLyBdLFxuICBbICdpZScsIC9UcmlkZW50XFwvN1xcLjAuKnJ2XFw6KFswLTlcXC5dKylcXCkuKkdlY2tvJC8gXSxcbiAgWyAnaWUnLCAvTVNJRVxccyhbMC05XFwuXSspOy4qVHJpZGVudFxcL1s0LTddLjAvIF0sXG4gIFsgJ2llJywgL01TSUVcXHMoN1xcLjApLyBdLFxuICBbICdiYjEwJywgL0JCMTA7XFxzVG91Y2guKlZlcnNpb25cXC8oWzAtOVxcLl0rKS8gXSxcbiAgWyAnYW5kcm9pZCcsIC9BbmRyb2lkXFxzKFswLTlcXC5dKykvIF0sXG4gIFsgJ2lvcycsIC9pUGFkXFw7XFxzQ1BVXFxzT1NcXHMoWzAtOVxcLl9dKykvIF0sXG4gIFsgJ2lvcycsICAvaVBob25lXFw7XFxzQ1BVXFxzaVBob25lXFxzT1NcXHMoWzAtOVxcLl9dKykvIF0sXG4gIFsgJ3NhZmFyaScsIC9TYWZhcmlcXC8oWzAtOVxcLl9dKykvIF1cbl07XG5cbnZhciBtYXRjaCA9IGJyb3dzZXJzLm1hcChtYXRjaCkuZmlsdGVyKGlzTWF0Y2gpWzBdO1xudmFyIHBhcnRzID0gbWF0Y2ggJiYgbWF0Y2hbM10uc3BsaXQoL1suX10vKS5zbGljZSgwLDMpO1xuXG53aGlsZSAocGFydHMgJiYgcGFydHMubGVuZ3RoIDwgMykge1xuICBwYXJ0cy5wdXNoKCcwJyk7XG59XG5cbi8vIHNldCB0aGUgbmFtZSBhbmQgdmVyc2lvblxuZXhwb3J0cy5uYW1lID0gbWF0Y2ggJiYgbWF0Y2hbMF07XG5leHBvcnRzLnZlcnNpb24gPSBwYXJ0cyAmJiBwYXJ0cy5qb2luKCcuJyk7XG5cbmZ1bmN0aW9uIG1hdGNoKHBhaXIpIHtcbiAgcmV0dXJuIHBhaXIuY29uY2F0KHBhaXJbMV0uZXhlYyhuYXZpZ2F0b3IudXNlckFnZW50KSk7XG59XG5cbmZ1bmN0aW9uIGlzTWF0Y2gocGFpcikge1xuICByZXR1cm4gISFwYWlyWzJdO1xufVxuIiwidmFyIGRldGVjdCA9IHJlcXVpcmUoJy4vZGV0ZWN0Jyk7XG52YXIgcmVxdWlyZWRGdW5jdGlvbnMgPSBbXG4gICdpbml0J1xuXTtcblxuZnVuY3Rpb24gaXNTdXBwb3J0ZWQocGx1Z2luKSB7XG4gIHJldHVybiBwbHVnaW4gJiYgdHlwZW9mIHBsdWdpbi5zdXBwb3J0ZWQgPT0gJ2Z1bmN0aW9uJyAmJiBwbHVnaW4uc3VwcG9ydGVkKGRldGVjdCk7XG59XG5cbmZ1bmN0aW9uIGlzVmFsaWQocGx1Z2luKSB7XG4gIHZhciBzdXBwb3J0ZWRGdW5jdGlvbnMgPSByZXF1aXJlZEZ1bmN0aW9ucy5maWx0ZXIoZnVuY3Rpb24oZm4pIHtcbiAgICByZXR1cm4gdHlwZW9mIHBsdWdpbltmbl0gPT0gJ2Z1bmN0aW9uJztcbiAgfSk7XG5cbiAgcmV0dXJuIHN1cHBvcnRlZEZ1bmN0aW9ucy5sZW5ndGggPT09IHJlcXVpcmVkRnVuY3Rpb25zLmxlbmd0aDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwbHVnaW5zKSB7XG4gIHJldHVybiBbXS5jb25jYXQocGx1Z2lucyB8fCBbXSkuZmlsdGVyKGlzU3VwcG9ydGVkKS5maWx0ZXIoaXNWYWxpZClbMF07XG59XG4iLCJ2YXIgY2FwdHVyZSA9IHJlcXVpcmUoJ3J0Yy1jYXB0dXJlJyk7XG52YXIgYXR0YWNoID0gcmVxdWlyZSgncnRjLWF0dGFjaCcpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcblxuLyoqXG4gICMgcnRjLW1lZGlhXG5cbiAgVGhpcyBpcyBhIGNvbnZlbmllbmNlIGZ1bmN0aW9uIGZvciBpbnZva2luZyBtZWRpYSBjYXB0dXJlIGFuZCByZW5kZXJpbmdcbiAgdXNpbmcgdGhlIFtgcnRjLWNhcHR1cmVgXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1jYXB0dXJlKSBhbmRcbiAgW2BydGMtYXR0YWNoYF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtYXR0YWNoKSBwYWNrYWdlcyByZXNwZWN0aXZlbHlcbiAgd2l0aGluIGFuIGFwcGxpY2F0aW9uLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICBEZWZhdWx0IGNvbnN0cmFpbnRzIGB7IGF1ZGlvOiB0cnVlLCB2aWRlbzogdHJ1ZSB9YCBjYXB0dXJlIGFuZCByZW5kZXJpbmdcbiAgYW4gbmV3IHZpZGVvIGVsZW1lbnQgd2l0aGluIHRoZSBkb2N1bWVudC5ib2R5OlxuXG4gIDw8PCBleGFtcGxlcy9yZW5kZXItdG8tYm9keS5qc1xuXG4gIEluIHRoZSBldmVudCB0aGF0IHlvdSB3aXNoIHRvIG1ha2UgdXNlIG9mIGFueSBvZiB0aGUgcnRjLmlvIHBsdWdpbnMsIHRoZW5cbiAgdGhlIGZvbGxvd2luZyBleGFtcGxlIGRlbW9uc3RyYXRlcyBob3cgdG8gcHJvdmlkZSBhIHNpbmdsZSBcImNhcHR1cmUgYW5kXG4gIHJlbmRlclwiIGNhbGwgdGhhdCB3aWxsIHdvcmsgd2l0aCBhIHBsdWdpbjpcblxuICA8PDwgZXhhbXBsZXMvcGx1Z2luLmpzXG5cbioqL1xuXG52YXIgbWVkaWEgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgLy8gZG8gd2UgaGF2ZSBjb25zdHJhaW50c1xuICB2YXIgY29uc3RyYWludHMgPSAob3B0cyB8fCB7fSkuY29uc3RyYWludHMgfHwgeyB2aWRlbzogdHJ1ZSwgYXVkaW86IHRydWUgfTtcblxuICAvLyBvciBkbyB3ZSBoYXZlIGEgc3RyZWFtXG4gIHZhciBzdHJlYW0gPSAob3B0cyB8fCB7fSkuc3RyZWFtO1xuXG4gIC8vIGlmIHdlIGhhdmUgYmVlbiBwYXNzZWQgY29uc3RyYWludHMsIGFzc3VtZSB3ZSBhcmUgYXR0YWNoaW5nIGEgbG9jYWwgc3RyZWFtXG4gIC8vIG90aGVyd2lzZSwgdXNlIHRoZSBnZW5lcmljIGF0dGFjaCBvcHRpb25zXG4gIHZhciBzdHJlYW1BdHRhY2ggPSAob3B0cyB8fCB7fSkuY29uc3RyYWludHMgPyBhdHRhY2gubG9jYWwgOiBhdHRhY2g7XG5cbiAgLy8gZGV0ZWN0IGEgdGFyZ2V0XG4gIHZhciB0YXJnZXQgPSAob3B0cyB8fCB7fSkudGFyZ2V0IHx8IGRvY3VtZW50LmJvZHk7XG4gIHZhciBub25NZWRpYVRhcmdldCA9ICEodGFyZ2V0IGluc3RhbmNlb2YgSFRNTE1lZGlhRWxlbWVudCk7XG5cbiAgZnVuY3Rpb24gaGFuZGxlQXR0YWNoKGVyciwgZWwpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRhcmdldCAmJiBub25NZWRpYVRhcmdldCAmJiB0YXJnZXQgIT09IGVsKSB7XG4gICAgICB0YXJnZXQuYXBwZW5kQ2hpbGQoZWwpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHdlIGhhdmUgYSBzdHJlYW0sIG1vdmUgb250byByZW5kZXJpbmcgaW1tZWRpYXRlbHlcbiAgaWYgKHN0cmVhbSkge1xuICAgIHJldHVybiBzdHJlYW1BdHRhY2goc3RyZWFtLCBvcHRzLCBoYW5kbGVBdHRhY2gpO1xuICB9XG5cbiAgcmV0dXJuIGNhcHR1cmUoY29uc3RyYWludHMsIG9wdHMsIGZ1bmN0aW9uKGVyciwgc3RyZWFtKSB7XG4gICAgc3RyZWFtQXR0YWNoKHN0cmVhbSwgb3B0cywgaGFuZGxlQXR0YWNoKTtcbiAgfSk7XG59O1xuXG5tZWRpYS5jYXB0dXJlID0gZnVuY3Rpb24oY29uc3RyYWludHMsIG9wdHMpIHtcbiAgcmV0dXJuIG1lZGlhKGV4dGVuZCh7fSwgb3B0cywgeyBjb25zdHJhaW50czogY29uc3RyYWludHMgfSkpO1xufTtcblxubWVkaWEuYXR0YWNoID0gbWVkaWEucmVuZGVyID0gZnVuY3Rpb24oc3RyZWFtLCBvcHRzKSB7XG4gIHJldHVybiBtZWRpYShleHRlbmQoe30sIG9wdHMsIHsgc3RyZWFtOiBzdHJlYW0gfSkpO1xufTtcbiIsInZhciBwbHVnaW4gPSByZXF1aXJlKCdydGMtY29yZS9wbHVnaW4nKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG5cbi8qKlxuICAjIHJ0Yy1hdHRhY2hcblxuICBSb3VnaGx5IGVxdWl2YWxlbnQgdG8gdGhlXG4gIFtgYXR0YWNoTWVkaWFTdHJlYW1gXShodHRwczovL3d3dy5ucG1qcy5vcmcvcGFja2FnZS9hdHRhY2htZWRpYXN0cmVhbSlcbiAgcGFja2FnZSBidXQgd2l0aCBzdXBwb3J0IGZvciBydGMuaW8gcGx1Z2lucy4gIEFsc28gdXNlcyBhbiBlcnJvciBmaXJzdFxuICBhc3luYyBBUEkgdG8gYWxsb3cgcGx1Z2lucyB0aW1lIHRvIGluaXRpYWxpemUuXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIDw8PCBleGFtcGxlcy9zaW1wbGUuanNcblxuICAjIyBFeGFtcGxlIHVzaW5nIFBsdWdpbnNcblxuICA8PDwgZXhhbXBsZXMvcGx1Z2lucy5qc1xuXG4gICMjIFJlZmVyZW5jZVxuXG4gICMjIyBgYXR0YWNoKHN0cmVhbSwgb3B0cz8sIGNhbGxiYWNrKWBcblxuICBBdHRhY2ggYHN0cmVhbWAgdG8gYSBIVE1MIGVsZW1lbnQgdGhhdCB3aWxsIHJlbmRlciB0aGUgY29udGVudC4gVGhlIHByb3ZpZGVkXG4gIGBjYWxsYmFja2AgZm9sbG93cyB0aGUgZm9ybWF0IG9mIGBmbihlcnIsIGVsZW1lbnQpYC4gIFdoaWxlIHRoZSBhc3luYyBuYXR1cmVcbiAgb2YgdGhpcyBwYWNrYWdlIG1heSBzZWVtIG9kZCwgYmVjYXVzZSBhIHBsdWdpbiBtYXkgbmVlZCB0aW1lIHRvIGluaXRpYWxpemVcbiAgdGhpcyBjYXRlcnMgZm9yIHRoaXMgY2FzZSBpbiBhZGRpdGlvbiB0byBzdGFuZGFyZCB1c2FnZSBpbiB0aGUgYnJvd3Nlci5cblxuICAtIGBhdXRvcGxheWAgKGRlZmF1bHQ6IGB0cnVlYCkgLSBieSBkZWZhdWx0IGFmdGVyIHRoZSBzdHJlYW0gaGFzIGJlZW5cbiAgICBhdHRhY2hlZCB0byB0aGUgZWxlbWVudCBpdCB3aWxsIGJlIHBsYXllZC4gIFRoaXMgaXMgZG9uZSBieSBjYWxsaW5nXG4gICAgdGhlIGBwbGF5KClgIGZ1bmN0aW9uIG9uIHRoZSBlbGVtZW50IHJhdGhlciB0aGFuIHJlbHlpbmcgb24gYGF1dG9wbGF5YFxuICAgIGF0dHJpYnV0ZSBmdW5jdGlvbmFsaXR5LlxuXG4gIC0gYGVsYCAoZGVmYXVsdDogYG51bGxgKSAtIGlmIHlvdSB3aXRoIHRvIHN1cHBseSBhbiBlbGVtZW50IHRvIGJlIHVzZWRcbiAgICBpbnN0ZWFkIG9mIGNyZWF0aW5nIGEgbmV3IGVsZW1lbnQgdG8gcmVjZWl2ZSB0aGUgc3RyZWFtIHNwZWNpZnkgaXQgaGVyZS5cblxuICAtIGBtdXRlZGAgKGRlZmF1bHQ6IGBmYWxzZWApIC0gd2hldGhlciB0aGUgY3JlYXRlZCBlbGVtZW50IHNob3VsZCBiZSBtdXRlZFxuICAgIG9yIG5vdC4gIEZvciBsb2NhbCBzdHJlYW1zIHRoaXMgc2hvdWxkIGFsbW9zdCBhbHdheXMsIGJlIHRydWUgc28gY29uc2lkZXJcbiAgICB1c2luZyB0aGUgYGF0dGFjaC5sb2NhbGAgaGVscGVyIGZ1bmN0aW9uIGZvciBzaW1wbGUgY2FzZXMuXG5cbiAgLSBgcGx1Z2luc2AgKGRlZmF1bHQ6IGBbXWApIC0gc3BlY2lmeSBvbmUgb3IgbW9yZSBwbHVnaW5zIHRoYXQgY2FuIGJlIHVzZWRcbiAgICB0byByZW5kZXIgdGhlIG1lZGlhIHN0cmVhbSBhcHByb3ByaWF0ZSB0byB0aGUgY3VycmVudCBwbGF0Zm9ybSBpbiB0aGVcbiAgICBldmVudCB0aGF0IFdlYlJUQyBhbmQvb3IgbWVkaWEgY2FwdHVyZSBpcyBzdXBwb3J0ZWQgdmlhIGEgYnJvd3NlciBwbHVnaW4uXG5cbioqL1xudmFyIGF0dGFjaCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc3RyZWFtLCBvcHRzLCBjYWxsYmFjaykge1xuICB2YXIgVVJMID0gdHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuVVJMO1xuICB2YXIgcGluc3Q7XG5cbiAgaWYgKHR5cGVvZiBvcHRzID09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IG9wdHM7XG4gICAgb3B0cyA9IHt9O1xuICB9XG5cbiAgZnVuY3Rpb24gYXBwbHlNb2RpZmljYXRpb25zKGVsLCBvKSB7XG4gICAgaWYgKChvIHx8IHt9KS5tdXRlZCkge1xuICAgICAgZWwubXV0ZWQgPSB0cnVlO1xuICAgICAgZWwuc2V0QXR0cmlidXRlKCdtdXRlZCcsICcnKTtcbiAgICB9XG5cbiAgICBpZiAoKG8gfHwge30pLm1pcnJvcikge1xuICAgICAgZWwuc2V0QXR0cmlidXRlKCdkYXRhLW1pcnJvcmVkJywgdHJ1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVsO1xuICB9XG5cbiAgZnVuY3Rpb24gYXR0YWNoVG9FbGVtZW50KHMsIG8pIHtcbiAgICB2YXIgYXV0b3BsYXkgPSAobyB8fCB7fSkuYXV0b3BsYXk7XG4gICAgdmFyIGVsVHlwZSA9ICdhdWRpbyc7XG4gICAgdmFyIGVsID0gKG8gfHwge30pLmVsIHx8IChvIHx8IHt9KS50YXJnZXQ7XG5cbiAgICAvLyBjaGVjayB0aGUgc3RyZWFtIGlzIHZhbGlkXG4gICAgdmFyIGlzVmFsaWQgPSBzICYmIHR5cGVvZiBzLmdldFZpZGVvVHJhY2tzID09ICdmdW5jdGlvbic7XG5cbiAgICAvLyBkZXRlcm1pbmUgdGhlIGVsZW1lbnQgdHlwZVxuICAgIGlmIChpc1ZhbGlkICYmIHMuZ2V0VmlkZW9UcmFja3MoKS5sZW5ndGggPiAwKSB7XG4gICAgICBlbFR5cGUgPSAndmlkZW8nO1xuICAgIH1cblxuICAgIC8vIGlmIHdlIGhhdmUgYmVlbiBwYXNzZWQgYW4gXCJ1bnBsYXlhYmxlXCIgdGFyZ2V0IGNyZWF0ZSBhIG5ldyBlbGVtZW50XG4gICAgaWYgKGVsICYmIHR5cGVvZiBlbC5wbGF5ICE9ICdmdW5jdGlvbicpIHtcbiAgICAgIGVsID0gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBwcmVwYXJlIHRoZSBlbGVtZW50XG4gICAgZWwgPSBlbCB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGVsVHlwZSk7XG5cbiAgICAvLyBhdHRhY2ggdGhlIHN0cmVhbVxuICAgIGlmIChVUkwgJiYgVVJMLmNyZWF0ZU9iamVjdFVSTCkge1xuICAgICAgZWwuc3JjID0gVVJMLmNyZWF0ZU9iamVjdFVSTChzdHJlYW0pO1xuICAgIH1cbiAgICBlbHNlIGlmIChlbC5zcmNPYmplY3QpIHtcbiAgICAgIGVsLnNyY09iamVjdCA9IHN0cmVhbTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZWwubW96U3JjT2JqZWN0KSB7XG4gICAgICBlbC5tb3pTcmNPYmplY3QgPSBzdHJlYW07XG4gICAgfVxuXG4gICAgaWYgKGF1dG9wbGF5ID09PSB1bmRlZmluZWQgfHwgYXV0b3BsYXkpIHtcbiAgICAgIGVsLnNldEF0dHJpYnV0ZSgnYXV0b3BsYXknLCAnJyk7XG4gICAgICBlbC5wbGF5KCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwcGx5TW9kaWZpY2F0aW9ucyhlbCwgbyk7XG4gIH1cblxuICAvLyBzZWUgaWYgd2UgYXJlIHVzaW5nIGEgcGx1Z2luXG4gIHBpbnN0ID0gcGx1Z2luKChvcHRzIHx8IHt9KS5wbHVnaW5zKTtcbiAgaWYgKHBpbnN0KSB7XG4gICAgcmV0dXJuIHBpbnN0LmluaXQob3B0cywgZnVuY3Rpb24oZXJyKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIHBpbnN0LmF0dGFjaCAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ3BsdWdpbiBtdXN0IHN1cHBvcnQgdGhlIGF0dGFjaCBmdW5jdGlvbicpKTtcbiAgICAgIH1cblxuICAgICAgY2FsbGJhY2sobnVsbCwgYXBwbHlNb2RpZmljYXRpb25zKHBpbnN0LmF0dGFjaChzdHJlYW0sIG9wdHMpLCBvcHRzKSk7XG4gICAgfSk7XG4gIH1cblxuICBjYWxsYmFjayhudWxsLCBhdHRhY2hUb0VsZW1lbnQoc3RyZWFtLCBvcHRzKSk7XG59O1xuXG4vKipcbiAgIyMjIGBhdHRhY2gubG9jYWwoc3RyZWFtLCBvcHRzPywgY2FsbGJhY2spYFxuXG4gIEF0dGFjaCBhIGxvY2FsIHN0cmVhbSB3aXRoIG9wdGlvbnMgYXBwcm9wcmlhdGUgZm9yIGxvY2FsIHN0cmVhbXM6XG5cbiAgLSBgbXV0ZWRgOiBgdHJ1ZWBcblxuKiovXG5hdHRhY2gubG9jYWwgPSBmdW5jdGlvbihzdHJlYW0sIG9wdHMsIGNhbGxiYWNrKSB7XG4gIGlmICh0eXBlb2Ygb3B0cyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRzO1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIGF0dGFjaChzdHJlYW0sIGV4dGVuZCh7IG11dGVkOiB0cnVlLCBtaXJyb3I6IHRydWUgfSwgb3B0cyksIGNhbGxiYWNrKTtcbn07XG4iLCJ2YXIgcGx1Z2luID0gcmVxdWlyZSgncnRjLWNvcmUvcGx1Z2luJyk7XG52YXIgZGV0ZWN0ID0gcmVxdWlyZSgncnRjLWNvcmUvZGV0ZWN0Jyk7XG5cbi8vIHBhdGNoIG5hdmlnYXRvciBnZXRVc2VyTWVkaWFcbm5hdmlnYXRvci5nZXRVc2VyTWVkaWEgPSBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhIHx8XG4gIGRldGVjdC5jYWxsKG5hdmlnYXRvciwgJ2dldFVzZXJNZWRpYScpO1xuXG4vKipcbiAgIyBydGMtY2FwdHVyZVxuXG4gIFJvdWdobHkgZXF1aXZhbGVudCB0byB0aGVcbiAgW2BnZXRVc2VyTWVkaWFgXShodHRwczovL3d3dy5ucG1qcy5vcmcvcGFja2FnZS9nZXR1c2VybWVkaWEpIHBhY2thZ2UgYnV0IHdpdGhcbiAgc3VwcG9ydCBmb3IgcnRjLmlvIHBsdWdpbnMuXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIDw8PCBleGFtcGxlcy9zaW1wbGUuanNcblxuICAjIyBFeGFtcGxlIHdpdGggdXNpbmcgUGx1Z2luc1xuXG4gIDw8PCBleGFtcGxlcy9wbHVnaW5zLmpzXG5cbiAgIyMgUmVmZXJlbmNlXG5cbiAgIyMjIGBjYXB0dXJlKGNvbnN0cmFpbnRzLCBvcHRzPywgY2FsbGJhY2spYFxuXG4gIENhcHR1cmUgbWVkaWEgd2l0aCB0aGUgc3VwcGxpZWQgYGNvbnN0cmFpbnRzYC4gIElmIGFuIGBvcHRzYCBhcmd1bWVudCBpc1xuICBzdXBwbGllZCBsb29rIGZvciBwbHVnaW5zIHRoYXQgbWF5IGNoYW5nZSB0aGUgYmVoYXZpb3VyIG9mIHRoZSBjYXB0dXJlXG4gIG9wZXJhdGlvbi5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbnN0cmFpbnRzLCBvcHRzLCBjYWxsYmFjaykge1xuICB2YXIgcGluc3Q7XG5cbiAgZnVuY3Rpb24gaGFuZGxlQ2FwdHVyZShzdHJlYW0pIHtcbiAgICBjYWxsYmFjayhudWxsLCBzdHJlYW0pO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBvcHRzID09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IG9wdHM7XG4gICAgb3B0cyA9IHt9O1xuICB9XG5cbiAgLy8gc2VlIGlmIHdlIGFyZSB1c2luZyBhIHBsdWdpblxuICBwaW5zdCA9IHBsdWdpbigob3B0cyB8fCB7fSkucGx1Z2lucyk7XG4gIGlmIChwaW5zdCkge1xuICAgIHJldHVybiBwaW5zdC5pbml0KG9wdHMsIGZ1bmN0aW9uKGVycikge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhICE9ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcigncGx1Z2luIGRvZXMgbm90IHN1cHBvcnQgbWVkaWEgY2FwdHVyZScpKTtcbiAgICAgIH1cblxuICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYShjb25zdHJhaW50cywgaGFuZGxlQ2FwdHVyZSwgY2FsbGJhY2spO1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhICE9ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdnZXRVc2VyTWVkaWEgbm90IHN1cHBvcnRlZCcpKTtcbiAgfVxuXG4gIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEoY29uc3RyYWludHMsIGhhbmRsZUNhcHR1cmUsIGNhbGxiYWNrKTtcbn07XG4iXX0=
