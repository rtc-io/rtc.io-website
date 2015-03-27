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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5udm0vdmVyc2lvbnMvbm9kZS92MC4xMi4xL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiY29kZS9zaW1wbGUtdmlkZW8tbWlycm9yLmpzIiwibm9kZV9tb2R1bGVzL2NvZy9leHRlbmQuanMiLCJub2RlX21vZHVsZXMvcnRjLWNvcmUvZGV0ZWN0LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1jb3JlL25vZGVfbW9kdWxlcy9kZXRlY3QtYnJvd3Nlci9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1jb3JlL3BsdWdpbi5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtbWVkaWEvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLW1lZGlhL25vZGVfbW9kdWxlcy9ydGMtYXR0YWNoL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1tZWRpYS9ub2RlX21vZHVsZXMvcnRjLWNhcHR1cmUvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBtZWRpYU1vZCA9IHJlcXVpcmUoJ3J0Yy1tZWRpYScpO1xudmFyIG1lZGlhT2JqID0gbWVkaWFNb2QoeyBzdGFydDogdHJ1ZSB9KTtcbnZhciBtaXJyb3JXaW5kb3cgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWlycm9yJyk7XG5cdFxuLy8gUmVuZGVyIGxvY2FsIHZpZGVvXG5tZWRpYU9iai5yZW5kZXIobWlycm9yV2luZG93KTtcblxuLy8gRmxpcCByZW5kZXJlZCB2aWRlbyBzbyB0aGUgdXNlciB2aWV3cyB0aGVpciBvd25cbi8vIGZlZWQgYXMgYSBtaXJyb3IgaW1hZ2Vcbm1pcnJvcldpbmRvdy5zdHlsZS50cmFuc2Zvcm0gPSAncm90YXRlWSgxODBkZWcpJzsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiMjIGNvZy9leHRlbmRcblxuYGBganNcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG5gYGBcblxuIyMjIGV4dGVuZCh0YXJnZXQsICopXG5cblNoYWxsb3cgY29weSBvYmplY3QgcHJvcGVydGllcyBmcm9tIHRoZSBzdXBwbGllZCBzb3VyY2Ugb2JqZWN0cyAoKikgaW50b1xudGhlIHRhcmdldCBvYmplY3QsIHJldHVybmluZyB0aGUgdGFyZ2V0IG9iamVjdCBvbmNlIGNvbXBsZXRlZDpcblxuYGBganNcbmV4dGVuZCh7IGE6IDEsIGI6IDIgfSwgeyBjOiAzIH0sIHsgZDogNCB9LCB7IGI6IDUgfSkpO1xuYGBgXG5cblNlZSBhbiBleGFtcGxlIG9uIFtyZXF1aXJlYmluXShodHRwOi8vcmVxdWlyZWJpbi5jb20vP2dpc3Q9NjA3OTQ3NSkuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKS5mb3JFYWNoKGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgIGlmICghIHNvdXJjZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICB0YXJnZXRbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gdGFyZ2V0O1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIHdpbmRvdzogZmFsc2UgKi9cbi8qIGdsb2JhbCBuYXZpZ2F0b3I6IGZhbHNlICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGJyb3dzZXIgPSByZXF1aXJlKCdkZXRlY3QtYnJvd3NlcicpO1xuXG4vKipcbiAgIyMjIGBydGMtY29yZS9kZXRlY3RgXG5cbiAgQSBicm93c2VyIGRldGVjdGlvbiBoZWxwZXIgZm9yIGFjY2Vzc2luZyBwcmVmaXgtZnJlZSB2ZXJzaW9ucyBvZiB0aGUgdmFyaW91c1xuICBXZWJSVEMgdHlwZXMuXG5cbiAgIyMjIEV4YW1wbGUgVXNhZ2VcblxuICBJZiB5b3Ugd2FudGVkIHRvIGdldCB0aGUgbmF0aXZlIGBSVENQZWVyQ29ubmVjdGlvbmAgcHJvdG90eXBlIGluIGFueSBicm93c2VyXG4gIHlvdSBjb3VsZCBkbyB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGpzXG4gIHZhciBkZXRlY3QgPSByZXF1aXJlKCdydGMtY29yZS9kZXRlY3QnKTsgLy8gYWxzbyBhdmFpbGFibGUgaW4gcnRjL2RldGVjdFxuICB2YXIgUlRDUGVlckNvbm5lY3Rpb24gPSBkZXRlY3QoJ1JUQ1BlZXJDb25uZWN0aW9uJyk7XG4gIGBgYFxuXG4gIFRoaXMgd291bGQgcHJvdmlkZSB3aGF0ZXZlciB0aGUgYnJvd3NlciBwcmVmaXhlZCB2ZXJzaW9uIG9mIHRoZVxuICBSVENQZWVyQ29ubmVjdGlvbiBpcyBhdmFpbGFibGUgKGB3ZWJraXRSVENQZWVyQ29ubmVjdGlvbmAsXG4gIGBtb3pSVENQZWVyQ29ubmVjdGlvbmAsIGV0YykuXG4qKi9cbnZhciBkZXRlY3QgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCwgb3B0cykge1xuICB2YXIgYXR0YWNoID0gKG9wdHMgfHwge30pLmF0dGFjaDtcbiAgdmFyIHByZWZpeElkeDtcbiAgdmFyIHByZWZpeDtcbiAgdmFyIHRlc3ROYW1lO1xuICB2YXIgaG9zdE9iamVjdCA9IHRoaXMgfHwgKHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB1bmRlZmluZWQpO1xuXG4gIC8vIGluaXRpYWxpc2UgdG8gZGVmYXVsdCBwcmVmaXhlc1xuICAvLyAocmV2ZXJzZSBvcmRlciBhcyB3ZSB1c2UgYSBkZWNyZW1lbnRpbmcgZm9yIGxvb3ApXG4gIHZhciBwcmVmaXhlcyA9ICgob3B0cyB8fCB7fSkucHJlZml4ZXMgfHwgWydtcycsICdvJywgJ21veicsICd3ZWJraXQnXSkuY29uY2F0KCcnKTtcblxuICAvLyBpZiB3ZSBoYXZlIG5vIGhvc3Qgb2JqZWN0LCB0aGVuIGFib3J0XG4gIGlmICghIGhvc3RPYmplY3QpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHByZWZpeGVzIGFuZCByZXR1cm4gdGhlIGNsYXNzIGlmIGZvdW5kIGluIGdsb2JhbFxuICBmb3IgKHByZWZpeElkeCA9IHByZWZpeGVzLmxlbmd0aDsgcHJlZml4SWR4LS07ICkge1xuICAgIHByZWZpeCA9IHByZWZpeGVzW3ByZWZpeElkeF07XG5cbiAgICAvLyBjb25zdHJ1Y3QgdGhlIHRlc3QgY2xhc3MgbmFtZVxuICAgIC8vIGlmIHdlIGhhdmUgYSBwcmVmaXggZW5zdXJlIHRoZSB0YXJnZXQgaGFzIGFuIHVwcGVyY2FzZSBmaXJzdCBjaGFyYWN0ZXJcbiAgICAvLyBzdWNoIHRoYXQgYSB0ZXN0IGZvciBnZXRVc2VyTWVkaWEgd291bGQgcmVzdWx0IGluIGFcbiAgICAvLyBzZWFyY2ggZm9yIHdlYmtpdEdldFVzZXJNZWRpYVxuICAgIHRlc3ROYW1lID0gcHJlZml4ICsgKHByZWZpeCA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdGFyZ2V0LnNsaWNlKDEpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQpO1xuXG4gICAgaWYgKHR5cGVvZiBob3N0T2JqZWN0W3Rlc3ROYW1lXSAhPSAndW5kZWZpbmVkJykge1xuICAgICAgLy8gdXBkYXRlIHRoZSBsYXN0IHVzZWQgcHJlZml4XG4gICAgICBkZXRlY3QuYnJvd3NlciA9IGRldGVjdC5icm93c2VyIHx8IHByZWZpeC50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICBpZiAoYXR0YWNoKSB7XG4gICAgICAgICBob3N0T2JqZWN0W3RhcmdldF0gPSBob3N0T2JqZWN0W3Rlc3ROYW1lXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGhvc3RPYmplY3RbdGVzdE5hbWVdO1xuICAgIH1cbiAgfVxufTtcblxuLy8gZGV0ZWN0IG1vemlsbGEgKHllcywgdGhpcyBmZWVscyBkaXJ0eSlcbmRldGVjdC5tb3ogPSB0eXBlb2YgbmF2aWdhdG9yICE9ICd1bmRlZmluZWQnICYmICEhbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYTtcblxuLy8gc2V0IHRoZSBicm93c2VyIGFuZCBicm93c2VyIHZlcnNpb25cbmRldGVjdC5icm93c2VyID0gYnJvd3Nlci5uYW1lO1xuZGV0ZWN0LmJyb3dzZXJWZXJzaW9uID0gZGV0ZWN0LnZlcnNpb24gPSBicm93c2VyLnZlcnNpb247XG4iLCJ2YXIgYnJvd3NlcnMgPSBbXG4gIFsgJ2Nocm9tZScsIC9DaHJvbSg/OmV8aXVtKVxcLyhbMC05XFwuXSspKDo/XFxzfCQpLyBdLFxuICBbICdmaXJlZm94JywgL0ZpcmVmb3hcXC8oWzAtOVxcLl0rKSg/Olxcc3wkKS8gXSxcbiAgWyAnb3BlcmEnLCAvT3BlcmFcXC8oWzAtOVxcLl0rKSg/Olxcc3wkKS8gXSxcbiAgWyAnaWUnLCAvVHJpZGVudFxcLzdcXC4wLipydlxcOihbMC05XFwuXSspXFwpLipHZWNrbyQvIF0sXG4gIFsgJ2llJywgL01TSUVcXHMoWzAtOVxcLl0rKTsuKlRyaWRlbnRcXC9bNC03XS4wLyBdLFxuICBbICdpZScsIC9NU0lFXFxzKDdcXC4wKS8gXSxcbiAgWyAnYmIxMCcsIC9CQjEwO1xcc1RvdWNoLipWZXJzaW9uXFwvKFswLTlcXC5dKykvIF0sXG4gIFsgJ2FuZHJvaWQnLCAvQW5kcm9pZFxccyhbMC05XFwuXSspLyBdLFxuICBbICdpb3MnLCAvaVBhZFxcO1xcc0NQVVxcc09TXFxzKFswLTlcXC5fXSspLyBdLFxuICBbICdpb3MnLCAgL2lQaG9uZVxcO1xcc0NQVVxcc2lQaG9uZVxcc09TXFxzKFswLTlcXC5fXSspLyBdLFxuICBbICdzYWZhcmknLCAvU2FmYXJpXFwvKFswLTlcXC5fXSspLyBdXG5dO1xuXG52YXIgbWF0Y2ggPSBicm93c2Vycy5tYXAobWF0Y2gpLmZpbHRlcihpc01hdGNoKVswXTtcbnZhciBwYXJ0cyA9IG1hdGNoICYmIG1hdGNoWzNdLnNwbGl0KC9bLl9dLykuc2xpY2UoMCwzKTtcblxud2hpbGUgKHBhcnRzICYmIHBhcnRzLmxlbmd0aCA8IDMpIHtcbiAgcGFydHMucHVzaCgnMCcpO1xufVxuXG4vLyBzZXQgdGhlIG5hbWUgYW5kIHZlcnNpb25cbmV4cG9ydHMubmFtZSA9IG1hdGNoICYmIG1hdGNoWzBdO1xuZXhwb3J0cy52ZXJzaW9uID0gcGFydHMgJiYgcGFydHMuam9pbignLicpO1xuXG5mdW5jdGlvbiBtYXRjaChwYWlyKSB7XG4gIHJldHVybiBwYWlyLmNvbmNhdChwYWlyWzFdLmV4ZWMobmF2aWdhdG9yLnVzZXJBZ2VudCkpO1xufVxuXG5mdW5jdGlvbiBpc01hdGNoKHBhaXIpIHtcbiAgcmV0dXJuICEhcGFpclsyXTtcbn1cbiIsInZhciBkZXRlY3QgPSByZXF1aXJlKCcuL2RldGVjdCcpO1xudmFyIHJlcXVpcmVkRnVuY3Rpb25zID0gW1xuICAnaW5pdCdcbl07XG5cbmZ1bmN0aW9uIGlzU3VwcG9ydGVkKHBsdWdpbikge1xuICByZXR1cm4gcGx1Z2luICYmIHR5cGVvZiBwbHVnaW4uc3VwcG9ydGVkID09ICdmdW5jdGlvbicgJiYgcGx1Z2luLnN1cHBvcnRlZChkZXRlY3QpO1xufVxuXG5mdW5jdGlvbiBpc1ZhbGlkKHBsdWdpbikge1xuICB2YXIgc3VwcG9ydGVkRnVuY3Rpb25zID0gcmVxdWlyZWRGdW5jdGlvbnMuZmlsdGVyKGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBwbHVnaW5bZm5dID09ICdmdW5jdGlvbic7XG4gIH0pO1xuXG4gIHJldHVybiBzdXBwb3J0ZWRGdW5jdGlvbnMubGVuZ3RoID09PSByZXF1aXJlZEZ1bmN0aW9ucy5sZW5ndGg7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocGx1Z2lucykge1xuICByZXR1cm4gW10uY29uY2F0KHBsdWdpbnMgfHwgW10pLmZpbHRlcihpc1N1cHBvcnRlZCkuZmlsdGVyKGlzVmFsaWQpWzBdO1xufVxuIiwidmFyIGNhcHR1cmUgPSByZXF1aXJlKCdydGMtY2FwdHVyZScpO1xudmFyIGF0dGFjaCA9IHJlcXVpcmUoJ3J0Yy1hdHRhY2gnKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG5cbi8qKlxuICAjIHJ0Yy1tZWRpYVxuXG4gIFRoaXMgaXMgYSBjb252ZW5pZW5jZSBmdW5jdGlvbiBmb3IgaW52b2tpbmcgbWVkaWEgY2FwdHVyZSBhbmQgcmVuZGVyaW5nXG4gIHVzaW5nIHRoZSBbYHJ0Yy1jYXB0dXJlYF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtY2FwdHVyZSkgYW5kXG4gIFtgcnRjLWF0dGFjaGBdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLWF0dGFjaCkgcGFja2FnZXMgcmVzcGVjdGl2ZWx5XG4gIHdpdGhpbiBhbiBhcHBsaWNhdGlvbi5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgRGVmYXVsdCBjb25zdHJhaW50cyBgeyBhdWRpbzogdHJ1ZSwgdmlkZW86IHRydWUgfWAgY2FwdHVyZSBhbmQgcmVuZGVyaW5nXG4gIGFuIG5ldyB2aWRlbyBlbGVtZW50IHdpdGhpbiB0aGUgZG9jdW1lbnQuYm9keTpcblxuICA8PDwgZXhhbXBsZXMvcmVuZGVyLXRvLWJvZHkuanNcblxuICBJbiB0aGUgZXZlbnQgdGhhdCB5b3Ugd2lzaCB0byBtYWtlIHVzZSBvZiBhbnkgb2YgdGhlIHJ0Yy5pbyBwbHVnaW5zLCB0aGVuXG4gIHRoZSBmb2xsb3dpbmcgZXhhbXBsZSBkZW1vbnN0cmF0ZXMgaG93IHRvIHByb3ZpZGUgYSBzaW5nbGUgXCJjYXB0dXJlIGFuZFxuICByZW5kZXJcIiBjYWxsIHRoYXQgd2lsbCB3b3JrIHdpdGggYSBwbHVnaW46XG5cbiAgPDw8IGV4YW1wbGVzL3BsdWdpbi5qc1xuXG4qKi9cblxudmFyIG1lZGlhID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvcHRzKSB7XG4gIC8vIGRvIHdlIGhhdmUgY29uc3RyYWludHNcbiAgdmFyIGNvbnN0cmFpbnRzID0gKG9wdHMgfHwge30pLmNvbnN0cmFpbnRzIHx8IHsgdmlkZW86IHRydWUsIGF1ZGlvOiB0cnVlIH07XG5cbiAgLy8gb3IgZG8gd2UgaGF2ZSBhIHN0cmVhbVxuICB2YXIgc3RyZWFtID0gKG9wdHMgfHwge30pLnN0cmVhbTtcblxuICAvLyBpZiB3ZSBoYXZlIGJlZW4gcGFzc2VkIGNvbnN0cmFpbnRzLCBhc3N1bWUgd2UgYXJlIGF0dGFjaGluZyBhIGxvY2FsIHN0cmVhbVxuICAvLyBvdGhlcndpc2UsIHVzZSB0aGUgZ2VuZXJpYyBhdHRhY2ggb3B0aW9uc1xuICB2YXIgc3RyZWFtQXR0YWNoID0gKG9wdHMgfHwge30pLmNvbnN0cmFpbnRzID8gYXR0YWNoLmxvY2FsIDogYXR0YWNoO1xuXG4gIC8vIGRldGVjdCBhIHRhcmdldFxuICB2YXIgdGFyZ2V0ID0gKG9wdHMgfHwge30pLnRhcmdldCB8fCBkb2N1bWVudC5ib2R5O1xuICB2YXIgbm9uTWVkaWFUYXJnZXQgPSAhKHRhcmdldCBpbnN0YW5jZW9mIEhUTUxNZWRpYUVsZW1lbnQpO1xuXG4gIGZ1bmN0aW9uIGhhbmRsZUF0dGFjaChlcnIsIGVsKSB7XG4gICAgaWYgKGVycikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0YXJnZXQgJiYgbm9uTWVkaWFUYXJnZXQgJiYgdGFyZ2V0ICE9PSBlbCkge1xuICAgICAgdGFyZ2V0LmFwcGVuZENoaWxkKGVsKTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB3ZSBoYXZlIGEgc3RyZWFtLCBtb3ZlIG9udG8gcmVuZGVyaW5nIGltbWVkaWF0ZWx5XG4gIGlmIChzdHJlYW0pIHtcbiAgICByZXR1cm4gc3RyZWFtQXR0YWNoKHN0cmVhbSwgb3B0cywgaGFuZGxlQXR0YWNoKTtcbiAgfVxuXG4gIHJldHVybiBjYXB0dXJlKGNvbnN0cmFpbnRzLCBvcHRzLCBmdW5jdGlvbihlcnIsIHN0cmVhbSkge1xuICAgIHN0cmVhbUF0dGFjaChzdHJlYW0sIG9wdHMsIGhhbmRsZUF0dGFjaCk7XG4gIH0pO1xufTtcblxubWVkaWEuY2FwdHVyZSA9IGZ1bmN0aW9uKGNvbnN0cmFpbnRzLCBvcHRzKSB7XG4gIHJldHVybiBtZWRpYShleHRlbmQoe30sIG9wdHMsIHsgY29uc3RyYWludHM6IGNvbnN0cmFpbnRzIH0pKTtcbn07XG5cbm1lZGlhLmF0dGFjaCA9IG1lZGlhLnJlbmRlciA9IGZ1bmN0aW9uKHN0cmVhbSwgb3B0cykge1xuICByZXR1cm4gbWVkaWEoZXh0ZW5kKHt9LCBvcHRzLCB7IHN0cmVhbTogc3RyZWFtIH0pKTtcbn07XG4iLCJ2YXIgcGx1Z2luID0gcmVxdWlyZSgncnRjLWNvcmUvcGx1Z2luJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xuXG4vKipcbiAgIyBydGMtYXR0YWNoXG5cbiAgUm91Z2hseSBlcXVpdmFsZW50IHRvIHRoZVxuICBbYGF0dGFjaE1lZGlhU3RyZWFtYF0oaHR0cHM6Ly93d3cubnBtanMub3JnL3BhY2thZ2UvYXR0YWNobWVkaWFzdHJlYW0pXG4gIHBhY2thZ2UgYnV0IHdpdGggc3VwcG9ydCBmb3IgcnRjLmlvIHBsdWdpbnMuICBBbHNvIHVzZXMgYW4gZXJyb3IgZmlyc3RcbiAgYXN5bmMgQVBJIHRvIGFsbG93IHBsdWdpbnMgdGltZSB0byBpbml0aWFsaXplLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICA8PDwgZXhhbXBsZXMvc2ltcGxlLmpzXG5cbiAgIyMgRXhhbXBsZSB1c2luZyBQbHVnaW5zXG5cbiAgPDw8IGV4YW1wbGVzL3BsdWdpbnMuanNcblxuICAjIyBSZWZlcmVuY2VcblxuICAjIyMgYGF0dGFjaChzdHJlYW0sIG9wdHM/LCBjYWxsYmFjaylgXG5cbiAgQXR0YWNoIGBzdHJlYW1gIHRvIGEgSFRNTCBlbGVtZW50IHRoYXQgd2lsbCByZW5kZXIgdGhlIGNvbnRlbnQuIFRoZSBwcm92aWRlZFxuICBgY2FsbGJhY2tgIGZvbGxvd3MgdGhlIGZvcm1hdCBvZiBgZm4oZXJyLCBlbGVtZW50KWAuICBXaGlsZSB0aGUgYXN5bmMgbmF0dXJlXG4gIG9mIHRoaXMgcGFja2FnZSBtYXkgc2VlbSBvZGQsIGJlY2F1c2UgYSBwbHVnaW4gbWF5IG5lZWQgdGltZSB0byBpbml0aWFsaXplXG4gIHRoaXMgY2F0ZXJzIGZvciB0aGlzIGNhc2UgaW4gYWRkaXRpb24gdG8gc3RhbmRhcmQgdXNhZ2UgaW4gdGhlIGJyb3dzZXIuXG5cbiAgLSBgYXV0b3BsYXlgIChkZWZhdWx0OiBgdHJ1ZWApIC0gYnkgZGVmYXVsdCBhZnRlciB0aGUgc3RyZWFtIGhhcyBiZWVuXG4gICAgYXR0YWNoZWQgdG8gdGhlIGVsZW1lbnQgaXQgd2lsbCBiZSBwbGF5ZWQuICBUaGlzIGlzIGRvbmUgYnkgY2FsbGluZ1xuICAgIHRoZSBgcGxheSgpYCBmdW5jdGlvbiBvbiB0aGUgZWxlbWVudCByYXRoZXIgdGhhbiByZWx5aW5nIG9uIGBhdXRvcGxheWBcbiAgICBhdHRyaWJ1dGUgZnVuY3Rpb25hbGl0eS5cblxuICAtIGBlbGAgKGRlZmF1bHQ6IGBudWxsYCkgLSBpZiB5b3Ugd2l0aCB0byBzdXBwbHkgYW4gZWxlbWVudCB0byBiZSB1c2VkXG4gICAgaW5zdGVhZCBvZiBjcmVhdGluZyBhIG5ldyBlbGVtZW50IHRvIHJlY2VpdmUgdGhlIHN0cmVhbSBzcGVjaWZ5IGl0IGhlcmUuXG5cbiAgLSBgbXV0ZWRgIChkZWZhdWx0OiBgZmFsc2VgKSAtIHdoZXRoZXIgdGhlIGNyZWF0ZWQgZWxlbWVudCBzaG91bGQgYmUgbXV0ZWRcbiAgICBvciBub3QuICBGb3IgbG9jYWwgc3RyZWFtcyB0aGlzIHNob3VsZCBhbG1vc3QgYWx3YXlzLCBiZSB0cnVlIHNvIGNvbnNpZGVyXG4gICAgdXNpbmcgdGhlIGBhdHRhY2gubG9jYWxgIGhlbHBlciBmdW5jdGlvbiBmb3Igc2ltcGxlIGNhc2VzLlxuXG4gIC0gYHBsdWdpbnNgIChkZWZhdWx0OiBgW11gKSAtIHNwZWNpZnkgb25lIG9yIG1vcmUgcGx1Z2lucyB0aGF0IGNhbiBiZSB1c2VkXG4gICAgdG8gcmVuZGVyIHRoZSBtZWRpYSBzdHJlYW0gYXBwcm9wcmlhdGUgdG8gdGhlIGN1cnJlbnQgcGxhdGZvcm0gaW4gdGhlXG4gICAgZXZlbnQgdGhhdCBXZWJSVEMgYW5kL29yIG1lZGlhIGNhcHR1cmUgaXMgc3VwcG9ydGVkIHZpYSBhIGJyb3dzZXIgcGx1Z2luLlxuXG4qKi9cbnZhciBhdHRhY2ggPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHN0cmVhbSwgb3B0cywgY2FsbGJhY2spIHtcbiAgdmFyIFVSTCA9IHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LlVSTDtcbiAgdmFyIHBpbnN0O1xuXG4gIGlmICh0eXBlb2Ygb3B0cyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRzO1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFwcGx5TW9kaWZpY2F0aW9ucyhlbCwgbykge1xuICAgIGlmICgobyB8fCB7fSkubXV0ZWQpIHtcbiAgICAgIGVsLm11dGVkID0gdHJ1ZTtcbiAgICAgIGVsLnNldEF0dHJpYnV0ZSgnbXV0ZWQnLCAnJyk7XG4gICAgfVxuXG4gICAgaWYgKChvIHx8IHt9KS5taXJyb3IpIHtcbiAgICAgIGVsLnNldEF0dHJpYnV0ZSgnZGF0YS1taXJyb3JlZCcsIHRydWUpO1xuICAgIH1cblxuICAgIHJldHVybiBlbDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGF0dGFjaFRvRWxlbWVudChzLCBvKSB7XG4gICAgdmFyIGF1dG9wbGF5ID0gKG8gfHwge30pLmF1dG9wbGF5O1xuICAgIHZhciBlbFR5cGUgPSAnYXVkaW8nO1xuICAgIHZhciBlbCA9IChvIHx8IHt9KS5lbCB8fCAobyB8fCB7fSkudGFyZ2V0O1xuXG4gICAgLy8gY2hlY2sgdGhlIHN0cmVhbSBpcyB2YWxpZFxuICAgIHZhciBpc1ZhbGlkID0gcyAmJiB0eXBlb2Ygcy5nZXRWaWRlb1RyYWNrcyA9PSAnZnVuY3Rpb24nO1xuXG4gICAgLy8gZGV0ZXJtaW5lIHRoZSBlbGVtZW50IHR5cGVcbiAgICBpZiAoaXNWYWxpZCAmJiBzLmdldFZpZGVvVHJhY2tzKCkubGVuZ3RoID4gMCkge1xuICAgICAgZWxUeXBlID0gJ3ZpZGVvJztcbiAgICB9XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGJlZW4gcGFzc2VkIGFuIFwidW5wbGF5YWJsZVwiIHRhcmdldCBjcmVhdGUgYSBuZXcgZWxlbWVudFxuICAgIGlmIChlbCAmJiB0eXBlb2YgZWwucGxheSAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICBlbCA9IG51bGw7XG4gICAgfVxuXG4gICAgLy8gcHJlcGFyZSB0aGUgZWxlbWVudFxuICAgIGVsID0gZWwgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChlbFR5cGUpO1xuXG4gICAgLy8gYXR0YWNoIHRoZSBzdHJlYW1cbiAgICBpZiAoVVJMICYmIFVSTC5jcmVhdGVPYmplY3RVUkwpIHtcbiAgICAgIGVsLnNyYyA9IFVSTC5jcmVhdGVPYmplY3RVUkwoc3RyZWFtKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZWwuc3JjT2JqZWN0KSB7XG4gICAgICBlbC5zcmNPYmplY3QgPSBzdHJlYW07XG4gICAgfVxuICAgIGVsc2UgaWYgKGVsLm1velNyY09iamVjdCkge1xuICAgICAgZWwubW96U3JjT2JqZWN0ID0gc3RyZWFtO1xuICAgIH1cblxuICAgIGlmIChhdXRvcGxheSA9PT0gdW5kZWZpbmVkIHx8IGF1dG9wbGF5KSB7XG4gICAgICBlbC5zZXRBdHRyaWJ1dGUoJ2F1dG9wbGF5JywgJycpO1xuICAgICAgZWwucGxheSgpO1xuICAgIH1cblxuICAgIHJldHVybiBhcHBseU1vZGlmaWNhdGlvbnMoZWwsIG8pO1xuICB9XG5cbiAgLy8gc2VlIGlmIHdlIGFyZSB1c2luZyBhIHBsdWdpblxuICBwaW5zdCA9IHBsdWdpbigob3B0cyB8fCB7fSkucGx1Z2lucyk7XG4gIGlmIChwaW5zdCkge1xuICAgIHJldHVybiBwaW5zdC5pbml0KG9wdHMsIGZ1bmN0aW9uKGVycikge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBwaW5zdC5hdHRhY2ggIT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdwbHVnaW4gbXVzdCBzdXBwb3J0IHRoZSBhdHRhY2ggZnVuY3Rpb24nKSk7XG4gICAgICB9XG5cbiAgICAgIGNhbGxiYWNrKG51bGwsIGFwcGx5TW9kaWZpY2F0aW9ucyhwaW5zdC5hdHRhY2goc3RyZWFtLCBvcHRzKSwgb3B0cykpO1xuICAgIH0pO1xuICB9XG5cbiAgY2FsbGJhY2sobnVsbCwgYXR0YWNoVG9FbGVtZW50KHN0cmVhbSwgb3B0cykpO1xufTtcblxuLyoqXG4gICMjIyBgYXR0YWNoLmxvY2FsKHN0cmVhbSwgb3B0cz8sIGNhbGxiYWNrKWBcblxuICBBdHRhY2ggYSBsb2NhbCBzdHJlYW0gd2l0aCBvcHRpb25zIGFwcHJvcHJpYXRlIGZvciBsb2NhbCBzdHJlYW1zOlxuXG4gIC0gYG11dGVkYDogYHRydWVgXG5cbioqL1xuYXR0YWNoLmxvY2FsID0gZnVuY3Rpb24oc3RyZWFtLCBvcHRzLCBjYWxsYmFjaykge1xuICBpZiAodHlwZW9mIG9wdHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICBvcHRzID0ge307XG4gIH1cblxuICBhdHRhY2goc3RyZWFtLCBleHRlbmQoeyBtdXRlZDogdHJ1ZSwgbWlycm9yOiB0cnVlIH0sIG9wdHMpLCBjYWxsYmFjayk7XG59O1xuIiwidmFyIHBsdWdpbiA9IHJlcXVpcmUoJ3J0Yy1jb3JlL3BsdWdpbicpO1xudmFyIGRldGVjdCA9IHJlcXVpcmUoJ3J0Yy1jb3JlL2RldGVjdCcpO1xuXG4vLyBwYXRjaCBuYXZpZ2F0b3IgZ2V0VXNlck1lZGlhXG5uYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gbmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fFxuICBkZXRlY3QuY2FsbChuYXZpZ2F0b3IsICdnZXRVc2VyTWVkaWEnKTtcblxuLyoqXG4gICMgcnRjLWNhcHR1cmVcblxuICBSb3VnaGx5IGVxdWl2YWxlbnQgdG8gdGhlXG4gIFtgZ2V0VXNlck1lZGlhYF0oaHR0cHM6Ly93d3cubnBtanMub3JnL3BhY2thZ2UvZ2V0dXNlcm1lZGlhKSBwYWNrYWdlIGJ1dCB3aXRoXG4gIHN1cHBvcnQgZm9yIHJ0Yy5pbyBwbHVnaW5zLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICA8PDwgZXhhbXBsZXMvc2ltcGxlLmpzXG5cbiAgIyMgRXhhbXBsZSB3aXRoIHVzaW5nIFBsdWdpbnNcblxuICA8PDwgZXhhbXBsZXMvcGx1Z2lucy5qc1xuXG4gICMjIFJlZmVyZW5jZVxuXG4gICMjIyBgY2FwdHVyZShjb25zdHJhaW50cywgb3B0cz8sIGNhbGxiYWNrKWBcblxuICBDYXB0dXJlIG1lZGlhIHdpdGggdGhlIHN1cHBsaWVkIGBjb25zdHJhaW50c2AuICBJZiBhbiBgb3B0c2AgYXJndW1lbnQgaXNcbiAgc3VwcGxpZWQgbG9vayBmb3IgcGx1Z2lucyB0aGF0IG1heSBjaGFuZ2UgdGhlIGJlaGF2aW91ciBvZiB0aGUgY2FwdHVyZVxuICBvcGVyYXRpb24uXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb25zdHJhaW50cywgb3B0cywgY2FsbGJhY2spIHtcbiAgdmFyIHBpbnN0O1xuXG4gIGZ1bmN0aW9uIGhhbmRsZUNhcHR1cmUoc3RyZWFtKSB7XG4gICAgY2FsbGJhY2sobnVsbCwgc3RyZWFtKTtcbiAgfVxuXG4gIGlmICh0eXBlb2Ygb3B0cyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRzO1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIC8vIHNlZSBpZiB3ZSBhcmUgdXNpbmcgYSBwbHVnaW5cbiAgcGluc3QgPSBwbHVnaW4oKG9wdHMgfHwge30pLnBsdWdpbnMpO1xuICBpZiAocGluc3QpIHtcbiAgICByZXR1cm4gcGluc3QuaW5pdChvcHRzLCBmdW5jdGlvbihlcnIpIHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ3BsdWdpbiBkb2VzIG5vdCBzdXBwb3J0IG1lZGlhIGNhcHR1cmUnKSk7XG4gICAgICB9XG5cbiAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEoY29uc3RyYWludHMsIGhhbmRsZUNhcHR1cmUsIGNhbGxiYWNrKTtcbiAgICB9KTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSAhPSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignZ2V0VXNlck1lZGlhIG5vdCBzdXBwb3J0ZWQnKSk7XG4gIH1cblxuICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzLCBoYW5kbGVDYXB0dXJlLCBjYWxsYmFjayk7XG59O1xuIl19
