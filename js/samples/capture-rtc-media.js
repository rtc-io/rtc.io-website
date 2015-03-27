(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// include the rtc/media module
var media = require('rtc-media');

// now capture media, and once available render to the document body
media().render(document.body);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5udm0vdmVyc2lvbnMvbm9kZS92MC4xMi4xL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiY29kZS9jYXB0dXJlLXJ0Yy1tZWRpYS5qcyIsIm5vZGVfbW9kdWxlcy9jb2cvZXh0ZW5kLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1jb3JlL2RldGVjdC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtY29yZS9ub2RlX21vZHVsZXMvZGV0ZWN0LWJyb3dzZXIvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtY29yZS9wbHVnaW4uanMiLCJub2RlX21vZHVsZXMvcnRjLW1lZGlhL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1tZWRpYS9ub2RlX21vZHVsZXMvcnRjLWF0dGFjaC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtbWVkaWEvbm9kZV9tb2R1bGVzL3J0Yy1jYXB0dXJlL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIGluY2x1ZGUgdGhlIHJ0Yy9tZWRpYSBtb2R1bGVcbnZhciBtZWRpYSA9IHJlcXVpcmUoJ3J0Yy1tZWRpYScpO1xuXG4vLyBub3cgY2FwdHVyZSBtZWRpYSwgYW5kIG9uY2UgYXZhaWxhYmxlIHJlbmRlciB0byB0aGUgZG9jdW1lbnQgYm9keVxubWVkaWEoKS5yZW5kZXIoZG9jdW1lbnQuYm9keSk7IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4jIyBjb2cvZXh0ZW5kXG5cbmBgYGpzXG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xuYGBgXG5cbiMjIyBleHRlbmQodGFyZ2V0LCAqKVxuXG5TaGFsbG93IGNvcHkgb2JqZWN0IHByb3BlcnRpZXMgZnJvbSB0aGUgc3VwcGxpZWQgc291cmNlIG9iamVjdHMgKCopIGludG9cbnRoZSB0YXJnZXQgb2JqZWN0LCByZXR1cm5pbmcgdGhlIHRhcmdldCBvYmplY3Qgb25jZSBjb21wbGV0ZWQ6XG5cbmBgYGpzXG5leHRlbmQoeyBhOiAxLCBiOiAyIH0sIHsgYzogMyB9LCB7IGQ6IDQgfSwgeyBiOiA1IH0pKTtcbmBgYFxuXG5TZWUgYW4gZXhhbXBsZSBvbiBbcmVxdWlyZWJpbl0oaHR0cDovL3JlcXVpcmViaW4uY29tLz9naXN0PTYwNzk0NzUpLlxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkuZm9yRWFjaChmdW5jdGlvbihzb3VyY2UpIHtcbiAgICBpZiAoISBzb3VyY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgdGFyZ2V0W3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHRhcmdldDtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbi8qIGdsb2JhbCB3aW5kb3c6IGZhbHNlICovXG4vKiBnbG9iYWwgbmF2aWdhdG9yOiBmYWxzZSAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBicm93c2VyID0gcmVxdWlyZSgnZGV0ZWN0LWJyb3dzZXInKTtcblxuLyoqXG4gICMjIyBgcnRjLWNvcmUvZGV0ZWN0YFxuXG4gIEEgYnJvd3NlciBkZXRlY3Rpb24gaGVscGVyIGZvciBhY2Nlc3NpbmcgcHJlZml4LWZyZWUgdmVyc2lvbnMgb2YgdGhlIHZhcmlvdXNcbiAgV2ViUlRDIHR5cGVzLlxuXG4gICMjIyBFeGFtcGxlIFVzYWdlXG5cbiAgSWYgeW91IHdhbnRlZCB0byBnZXQgdGhlIG5hdGl2ZSBgUlRDUGVlckNvbm5lY3Rpb25gIHByb3RvdHlwZSBpbiBhbnkgYnJvd3NlclxuICB5b3UgY291bGQgZG8gdGhlIGZvbGxvd2luZzpcblxuICBgYGBqc1xuICB2YXIgZGV0ZWN0ID0gcmVxdWlyZSgncnRjLWNvcmUvZGV0ZWN0Jyk7IC8vIGFsc28gYXZhaWxhYmxlIGluIHJ0Yy9kZXRlY3RcbiAgdmFyIFJUQ1BlZXJDb25uZWN0aW9uID0gZGV0ZWN0KCdSVENQZWVyQ29ubmVjdGlvbicpO1xuICBgYGBcblxuICBUaGlzIHdvdWxkIHByb3ZpZGUgd2hhdGV2ZXIgdGhlIGJyb3dzZXIgcHJlZml4ZWQgdmVyc2lvbiBvZiB0aGVcbiAgUlRDUGVlckNvbm5lY3Rpb24gaXMgYXZhaWxhYmxlIChgd2Via2l0UlRDUGVlckNvbm5lY3Rpb25gLFxuICBgbW96UlRDUGVlckNvbm5lY3Rpb25gLCBldGMpLlxuKiovXG52YXIgZGV0ZWN0ID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0YXJnZXQsIG9wdHMpIHtcbiAgdmFyIGF0dGFjaCA9IChvcHRzIHx8IHt9KS5hdHRhY2g7XG4gIHZhciBwcmVmaXhJZHg7XG4gIHZhciBwcmVmaXg7XG4gIHZhciB0ZXN0TmFtZTtcbiAgdmFyIGhvc3RPYmplY3QgPSB0aGlzIHx8ICh0eXBlb2Ygd2luZG93ICE9ICd1bmRlZmluZWQnID8gd2luZG93IDogdW5kZWZpbmVkKTtcblxuICAvLyBpbml0aWFsaXNlIHRvIGRlZmF1bHQgcHJlZml4ZXNcbiAgLy8gKHJldmVyc2Ugb3JkZXIgYXMgd2UgdXNlIGEgZGVjcmVtZW50aW5nIGZvciBsb29wKVxuICB2YXIgcHJlZml4ZXMgPSAoKG9wdHMgfHwge30pLnByZWZpeGVzIHx8IFsnbXMnLCAnbycsICdtb3onLCAnd2Via2l0J10pLmNvbmNhdCgnJyk7XG5cbiAgLy8gaWYgd2UgaGF2ZSBubyBob3N0IG9iamVjdCwgdGhlbiBhYm9ydFxuICBpZiAoISBob3N0T2JqZWN0KSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBwcmVmaXhlcyBhbmQgcmV0dXJuIHRoZSBjbGFzcyBpZiBmb3VuZCBpbiBnbG9iYWxcbiAgZm9yIChwcmVmaXhJZHggPSBwcmVmaXhlcy5sZW5ndGg7IHByZWZpeElkeC0tOyApIHtcbiAgICBwcmVmaXggPSBwcmVmaXhlc1twcmVmaXhJZHhdO1xuXG4gICAgLy8gY29uc3RydWN0IHRoZSB0ZXN0IGNsYXNzIG5hbWVcbiAgICAvLyBpZiB3ZSBoYXZlIGEgcHJlZml4IGVuc3VyZSB0aGUgdGFyZ2V0IGhhcyBhbiB1cHBlcmNhc2UgZmlyc3QgY2hhcmFjdGVyXG4gICAgLy8gc3VjaCB0aGF0IGEgdGVzdCBmb3IgZ2V0VXNlck1lZGlhIHdvdWxkIHJlc3VsdCBpbiBhXG4gICAgLy8gc2VhcmNoIGZvciB3ZWJraXRHZXRVc2VyTWVkaWFcbiAgICB0ZXN0TmFtZSA9IHByZWZpeCArIChwcmVmaXggP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHRhcmdldC5zbGljZSgxKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0KTtcblxuICAgIGlmICh0eXBlb2YgaG9zdE9iamVjdFt0ZXN0TmFtZV0gIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIC8vIHVwZGF0ZSB0aGUgbGFzdCB1c2VkIHByZWZpeFxuICAgICAgZGV0ZWN0LmJyb3dzZXIgPSBkZXRlY3QuYnJvd3NlciB8fCBwcmVmaXgudG9Mb3dlckNhc2UoKTtcblxuICAgICAgaWYgKGF0dGFjaCkge1xuICAgICAgICAgaG9zdE9iamVjdFt0YXJnZXRdID0gaG9zdE9iamVjdFt0ZXN0TmFtZV07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBob3N0T2JqZWN0W3Rlc3ROYW1lXTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIGRldGVjdCBtb3ppbGxhICh5ZXMsIHRoaXMgZmVlbHMgZGlydHkpXG5kZXRlY3QubW96ID0gdHlwZW9mIG5hdmlnYXRvciAhPSAndW5kZWZpbmVkJyAmJiAhIW5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWE7XG5cbi8vIHNldCB0aGUgYnJvd3NlciBhbmQgYnJvd3NlciB2ZXJzaW9uXG5kZXRlY3QuYnJvd3NlciA9IGJyb3dzZXIubmFtZTtcbmRldGVjdC5icm93c2VyVmVyc2lvbiA9IGRldGVjdC52ZXJzaW9uID0gYnJvd3Nlci52ZXJzaW9uO1xuIiwidmFyIGJyb3dzZXJzID0gW1xuICBbICdjaHJvbWUnLCAvQ2hyb20oPzplfGl1bSlcXC8oWzAtOVxcLl0rKSg6P1xcc3wkKS8gXSxcbiAgWyAnZmlyZWZveCcsIC9GaXJlZm94XFwvKFswLTlcXC5dKykoPzpcXHN8JCkvIF0sXG4gIFsgJ29wZXJhJywgL09wZXJhXFwvKFswLTlcXC5dKykoPzpcXHN8JCkvIF0sXG4gIFsgJ2llJywgL1RyaWRlbnRcXC83XFwuMC4qcnZcXDooWzAtOVxcLl0rKVxcKS4qR2Vja28kLyBdLFxuICBbICdpZScsIC9NU0lFXFxzKFswLTlcXC5dKyk7LipUcmlkZW50XFwvWzQtN10uMC8gXSxcbiAgWyAnaWUnLCAvTVNJRVxccyg3XFwuMCkvIF0sXG4gIFsgJ2JiMTAnLCAvQkIxMDtcXHNUb3VjaC4qVmVyc2lvblxcLyhbMC05XFwuXSspLyBdLFxuICBbICdhbmRyb2lkJywgL0FuZHJvaWRcXHMoWzAtOVxcLl0rKS8gXSxcbiAgWyAnaW9zJywgL2lQYWRcXDtcXHNDUFVcXHNPU1xccyhbMC05XFwuX10rKS8gXSxcbiAgWyAnaW9zJywgIC9pUGhvbmVcXDtcXHNDUFVcXHNpUGhvbmVcXHNPU1xccyhbMC05XFwuX10rKS8gXSxcbiAgWyAnc2FmYXJpJywgL1NhZmFyaVxcLyhbMC05XFwuX10rKS8gXVxuXTtcblxudmFyIG1hdGNoID0gYnJvd3NlcnMubWFwKG1hdGNoKS5maWx0ZXIoaXNNYXRjaClbMF07XG52YXIgcGFydHMgPSBtYXRjaCAmJiBtYXRjaFszXS5zcGxpdCgvWy5fXS8pLnNsaWNlKDAsMyk7XG5cbndoaWxlIChwYXJ0cyAmJiBwYXJ0cy5sZW5ndGggPCAzKSB7XG4gIHBhcnRzLnB1c2goJzAnKTtcbn1cblxuLy8gc2V0IHRoZSBuYW1lIGFuZCB2ZXJzaW9uXG5leHBvcnRzLm5hbWUgPSBtYXRjaCAmJiBtYXRjaFswXTtcbmV4cG9ydHMudmVyc2lvbiA9IHBhcnRzICYmIHBhcnRzLmpvaW4oJy4nKTtcblxuZnVuY3Rpb24gbWF0Y2gocGFpcikge1xuICByZXR1cm4gcGFpci5jb25jYXQocGFpclsxXS5leGVjKG5hdmlnYXRvci51c2VyQWdlbnQpKTtcbn1cblxuZnVuY3Rpb24gaXNNYXRjaChwYWlyKSB7XG4gIHJldHVybiAhIXBhaXJbMl07XG59XG4iLCJ2YXIgZGV0ZWN0ID0gcmVxdWlyZSgnLi9kZXRlY3QnKTtcbnZhciByZXF1aXJlZEZ1bmN0aW9ucyA9IFtcbiAgJ2luaXQnXG5dO1xuXG5mdW5jdGlvbiBpc1N1cHBvcnRlZChwbHVnaW4pIHtcbiAgcmV0dXJuIHBsdWdpbiAmJiB0eXBlb2YgcGx1Z2luLnN1cHBvcnRlZCA9PSAnZnVuY3Rpb24nICYmIHBsdWdpbi5zdXBwb3J0ZWQoZGV0ZWN0KTtcbn1cblxuZnVuY3Rpb24gaXNWYWxpZChwbHVnaW4pIHtcbiAgdmFyIHN1cHBvcnRlZEZ1bmN0aW9ucyA9IHJlcXVpcmVkRnVuY3Rpb25zLmZpbHRlcihmdW5jdGlvbihmbikge1xuICAgIHJldHVybiB0eXBlb2YgcGx1Z2luW2ZuXSA9PSAnZnVuY3Rpb24nO1xuICB9KTtcblxuICByZXR1cm4gc3VwcG9ydGVkRnVuY3Rpb25zLmxlbmd0aCA9PT0gcmVxdWlyZWRGdW5jdGlvbnMubGVuZ3RoO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHBsdWdpbnMpIHtcbiAgcmV0dXJuIFtdLmNvbmNhdChwbHVnaW5zIHx8IFtdKS5maWx0ZXIoaXNTdXBwb3J0ZWQpLmZpbHRlcihpc1ZhbGlkKVswXTtcbn1cbiIsInZhciBjYXB0dXJlID0gcmVxdWlyZSgncnRjLWNhcHR1cmUnKTtcbnZhciBhdHRhY2ggPSByZXF1aXJlKCdydGMtYXR0YWNoJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xuXG4vKipcbiAgIyBydGMtbWVkaWFcblxuICBUaGlzIGlzIGEgY29udmVuaWVuY2UgZnVuY3Rpb24gZm9yIGludm9raW5nIG1lZGlhIGNhcHR1cmUgYW5kIHJlbmRlcmluZ1xuICB1c2luZyB0aGUgW2BydGMtY2FwdHVyZWBdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLWNhcHR1cmUpIGFuZFxuICBbYHJ0Yy1hdHRhY2hgXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1hdHRhY2gpIHBhY2thZ2VzIHJlc3BlY3RpdmVseVxuICB3aXRoaW4gYW4gYXBwbGljYXRpb24uXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIERlZmF1bHQgY29uc3RyYWludHMgYHsgYXVkaW86IHRydWUsIHZpZGVvOiB0cnVlIH1gIGNhcHR1cmUgYW5kIHJlbmRlcmluZ1xuICBhbiBuZXcgdmlkZW8gZWxlbWVudCB3aXRoaW4gdGhlIGRvY3VtZW50LmJvZHk6XG5cbiAgPDw8IGV4YW1wbGVzL3JlbmRlci10by1ib2R5LmpzXG5cbiAgSW4gdGhlIGV2ZW50IHRoYXQgeW91IHdpc2ggdG8gbWFrZSB1c2Ugb2YgYW55IG9mIHRoZSBydGMuaW8gcGx1Z2lucywgdGhlblxuICB0aGUgZm9sbG93aW5nIGV4YW1wbGUgZGVtb25zdHJhdGVzIGhvdyB0byBwcm92aWRlIGEgc2luZ2xlIFwiY2FwdHVyZSBhbmRcbiAgcmVuZGVyXCIgY2FsbCB0aGF0IHdpbGwgd29yayB3aXRoIGEgcGx1Z2luOlxuXG4gIDw8PCBleGFtcGxlcy9wbHVnaW4uanNcblxuKiovXG5cbnZhciBtZWRpYSA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob3B0cykge1xuICAvLyBkbyB3ZSBoYXZlIGNvbnN0cmFpbnRzXG4gIHZhciBjb25zdHJhaW50cyA9IChvcHRzIHx8IHt9KS5jb25zdHJhaW50cyB8fCB7IHZpZGVvOiB0cnVlLCBhdWRpbzogdHJ1ZSB9O1xuXG4gIC8vIG9yIGRvIHdlIGhhdmUgYSBzdHJlYW1cbiAgdmFyIHN0cmVhbSA9IChvcHRzIHx8IHt9KS5zdHJlYW07XG5cbiAgLy8gaWYgd2UgaGF2ZSBiZWVuIHBhc3NlZCBjb25zdHJhaW50cywgYXNzdW1lIHdlIGFyZSBhdHRhY2hpbmcgYSBsb2NhbCBzdHJlYW1cbiAgLy8gb3RoZXJ3aXNlLCB1c2UgdGhlIGdlbmVyaWMgYXR0YWNoIG9wdGlvbnNcbiAgdmFyIHN0cmVhbUF0dGFjaCA9IChvcHRzIHx8IHt9KS5jb25zdHJhaW50cyA/IGF0dGFjaC5sb2NhbCA6IGF0dGFjaDtcblxuICAvLyBkZXRlY3QgYSB0YXJnZXRcbiAgdmFyIHRhcmdldCA9IChvcHRzIHx8IHt9KS50YXJnZXQgfHwgZG9jdW1lbnQuYm9keTtcbiAgdmFyIG5vbk1lZGlhVGFyZ2V0ID0gISh0YXJnZXQgaW5zdGFuY2VvZiBIVE1MTWVkaWFFbGVtZW50KTtcblxuICBmdW5jdGlvbiBoYW5kbGVBdHRhY2goZXJyLCBlbCkge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGFyZ2V0ICYmIG5vbk1lZGlhVGFyZ2V0ICYmIHRhcmdldCAhPT0gZWwpIHtcbiAgICAgIHRhcmdldC5hcHBlbmRDaGlsZChlbCk7XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgd2UgaGF2ZSBhIHN0cmVhbSwgbW92ZSBvbnRvIHJlbmRlcmluZyBpbW1lZGlhdGVseVxuICBpZiAoc3RyZWFtKSB7XG4gICAgcmV0dXJuIHN0cmVhbUF0dGFjaChzdHJlYW0sIG9wdHMsIGhhbmRsZUF0dGFjaCk7XG4gIH1cblxuICByZXR1cm4gY2FwdHVyZShjb25zdHJhaW50cywgb3B0cywgZnVuY3Rpb24oZXJyLCBzdHJlYW0pIHtcbiAgICBzdHJlYW1BdHRhY2goc3RyZWFtLCBvcHRzLCBoYW5kbGVBdHRhY2gpO1xuICB9KTtcbn07XG5cbm1lZGlhLmNhcHR1cmUgPSBmdW5jdGlvbihjb25zdHJhaW50cywgb3B0cykge1xuICByZXR1cm4gbWVkaWEoZXh0ZW5kKHt9LCBvcHRzLCB7IGNvbnN0cmFpbnRzOiBjb25zdHJhaW50cyB9KSk7XG59O1xuXG5tZWRpYS5hdHRhY2ggPSBtZWRpYS5yZW5kZXIgPSBmdW5jdGlvbihzdHJlYW0sIG9wdHMpIHtcbiAgcmV0dXJuIG1lZGlhKGV4dGVuZCh7fSwgb3B0cywgeyBzdHJlYW06IHN0cmVhbSB9KSk7XG59O1xuIiwidmFyIHBsdWdpbiA9IHJlcXVpcmUoJ3J0Yy1jb3JlL3BsdWdpbicpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcblxuLyoqXG4gICMgcnRjLWF0dGFjaFxuXG4gIFJvdWdobHkgZXF1aXZhbGVudCB0byB0aGVcbiAgW2BhdHRhY2hNZWRpYVN0cmVhbWBdKGh0dHBzOi8vd3d3Lm5wbWpzLm9yZy9wYWNrYWdlL2F0dGFjaG1lZGlhc3RyZWFtKVxuICBwYWNrYWdlIGJ1dCB3aXRoIHN1cHBvcnQgZm9yIHJ0Yy5pbyBwbHVnaW5zLiAgQWxzbyB1c2VzIGFuIGVycm9yIGZpcnN0XG4gIGFzeW5jIEFQSSB0byBhbGxvdyBwbHVnaW5zIHRpbWUgdG8gaW5pdGlhbGl6ZS5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgPDw8IGV4YW1wbGVzL3NpbXBsZS5qc1xuXG4gICMjIEV4YW1wbGUgdXNpbmcgUGx1Z2luc1xuXG4gIDw8PCBleGFtcGxlcy9wbHVnaW5zLmpzXG5cbiAgIyMgUmVmZXJlbmNlXG5cbiAgIyMjIGBhdHRhY2goc3RyZWFtLCBvcHRzPywgY2FsbGJhY2spYFxuXG4gIEF0dGFjaCBgc3RyZWFtYCB0byBhIEhUTUwgZWxlbWVudCB0aGF0IHdpbGwgcmVuZGVyIHRoZSBjb250ZW50LiBUaGUgcHJvdmlkZWRcbiAgYGNhbGxiYWNrYCBmb2xsb3dzIHRoZSBmb3JtYXQgb2YgYGZuKGVyciwgZWxlbWVudClgLiAgV2hpbGUgdGhlIGFzeW5jIG5hdHVyZVxuICBvZiB0aGlzIHBhY2thZ2UgbWF5IHNlZW0gb2RkLCBiZWNhdXNlIGEgcGx1Z2luIG1heSBuZWVkIHRpbWUgdG8gaW5pdGlhbGl6ZVxuICB0aGlzIGNhdGVycyBmb3IgdGhpcyBjYXNlIGluIGFkZGl0aW9uIHRvIHN0YW5kYXJkIHVzYWdlIGluIHRoZSBicm93c2VyLlxuXG4gIC0gYGF1dG9wbGF5YCAoZGVmYXVsdDogYHRydWVgKSAtIGJ5IGRlZmF1bHQgYWZ0ZXIgdGhlIHN0cmVhbSBoYXMgYmVlblxuICAgIGF0dGFjaGVkIHRvIHRoZSBlbGVtZW50IGl0IHdpbGwgYmUgcGxheWVkLiAgVGhpcyBpcyBkb25lIGJ5IGNhbGxpbmdcbiAgICB0aGUgYHBsYXkoKWAgZnVuY3Rpb24gb24gdGhlIGVsZW1lbnQgcmF0aGVyIHRoYW4gcmVseWluZyBvbiBgYXV0b3BsYXlgXG4gICAgYXR0cmlidXRlIGZ1bmN0aW9uYWxpdHkuXG5cbiAgLSBgZWxgIChkZWZhdWx0OiBgbnVsbGApIC0gaWYgeW91IHdpdGggdG8gc3VwcGx5IGFuIGVsZW1lbnQgdG8gYmUgdXNlZFxuICAgIGluc3RlYWQgb2YgY3JlYXRpbmcgYSBuZXcgZWxlbWVudCB0byByZWNlaXZlIHRoZSBzdHJlYW0gc3BlY2lmeSBpdCBoZXJlLlxuXG4gIC0gYG11dGVkYCAoZGVmYXVsdDogYGZhbHNlYCkgLSB3aGV0aGVyIHRoZSBjcmVhdGVkIGVsZW1lbnQgc2hvdWxkIGJlIG11dGVkXG4gICAgb3Igbm90LiAgRm9yIGxvY2FsIHN0cmVhbXMgdGhpcyBzaG91bGQgYWxtb3N0IGFsd2F5cywgYmUgdHJ1ZSBzbyBjb25zaWRlclxuICAgIHVzaW5nIHRoZSBgYXR0YWNoLmxvY2FsYCBoZWxwZXIgZnVuY3Rpb24gZm9yIHNpbXBsZSBjYXNlcy5cblxuICAtIGBwbHVnaW5zYCAoZGVmYXVsdDogYFtdYCkgLSBzcGVjaWZ5IG9uZSBvciBtb3JlIHBsdWdpbnMgdGhhdCBjYW4gYmUgdXNlZFxuICAgIHRvIHJlbmRlciB0aGUgbWVkaWEgc3RyZWFtIGFwcHJvcHJpYXRlIHRvIHRoZSBjdXJyZW50IHBsYXRmb3JtIGluIHRoZVxuICAgIGV2ZW50IHRoYXQgV2ViUlRDIGFuZC9vciBtZWRpYSBjYXB0dXJlIGlzIHN1cHBvcnRlZCB2aWEgYSBicm93c2VyIHBsdWdpbi5cblxuKiovXG52YXIgYXR0YWNoID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzdHJlYW0sIG9wdHMsIGNhbGxiYWNrKSB7XG4gIHZhciBVUkwgPSB0eXBlb2Ygd2luZG93ICE9ICd1bmRlZmluZWQnICYmIHdpbmRvdy5VUkw7XG4gIHZhciBwaW5zdDtcblxuICBpZiAodHlwZW9mIG9wdHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICBvcHRzID0ge307XG4gIH1cblxuICBmdW5jdGlvbiBhcHBseU1vZGlmaWNhdGlvbnMoZWwsIG8pIHtcbiAgICBpZiAoKG8gfHwge30pLm11dGVkKSB7XG4gICAgICBlbC5tdXRlZCA9IHRydWU7XG4gICAgICBlbC5zZXRBdHRyaWJ1dGUoJ211dGVkJywgJycpO1xuICAgIH1cblxuICAgIGlmICgobyB8fCB7fSkubWlycm9yKSB7XG4gICAgICBlbC5zZXRBdHRyaWJ1dGUoJ2RhdGEtbWlycm9yZWQnLCB0cnVlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZWw7XG4gIH1cblxuICBmdW5jdGlvbiBhdHRhY2hUb0VsZW1lbnQocywgbykge1xuICAgIHZhciBhdXRvcGxheSA9IChvIHx8IHt9KS5hdXRvcGxheTtcbiAgICB2YXIgZWxUeXBlID0gJ2F1ZGlvJztcbiAgICB2YXIgZWwgPSAobyB8fCB7fSkuZWwgfHwgKG8gfHwge30pLnRhcmdldDtcblxuICAgIC8vIGNoZWNrIHRoZSBzdHJlYW0gaXMgdmFsaWRcbiAgICB2YXIgaXNWYWxpZCA9IHMgJiYgdHlwZW9mIHMuZ2V0VmlkZW9UcmFja3MgPT0gJ2Z1bmN0aW9uJztcblxuICAgIC8vIGRldGVybWluZSB0aGUgZWxlbWVudCB0eXBlXG4gICAgaWYgKGlzVmFsaWQgJiYgcy5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aCA+IDApIHtcbiAgICAgIGVsVHlwZSA9ICd2aWRlbyc7XG4gICAgfVxuXG4gICAgLy8gaWYgd2UgaGF2ZSBiZWVuIHBhc3NlZCBhbiBcInVucGxheWFibGVcIiB0YXJnZXQgY3JlYXRlIGEgbmV3IGVsZW1lbnRcbiAgICBpZiAoZWwgJiYgdHlwZW9mIGVsLnBsYXkgIT0gJ2Z1bmN0aW9uJykge1xuICAgICAgZWwgPSBudWxsO1xuICAgIH1cblxuICAgIC8vIHByZXBhcmUgdGhlIGVsZW1lbnRcbiAgICBlbCA9IGVsIHx8IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZWxUeXBlKTtcblxuICAgIC8vIGF0dGFjaCB0aGUgc3RyZWFtXG4gICAgaWYgKFVSTCAmJiBVUkwuY3JlYXRlT2JqZWN0VVJMKSB7XG4gICAgICBlbC5zcmMgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKHN0cmVhbSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGVsLnNyY09iamVjdCkge1xuICAgICAgZWwuc3JjT2JqZWN0ID0gc3RyZWFtO1xuICAgIH1cbiAgICBlbHNlIGlmIChlbC5tb3pTcmNPYmplY3QpIHtcbiAgICAgIGVsLm1velNyY09iamVjdCA9IHN0cmVhbTtcbiAgICB9XG5cbiAgICBpZiAoYXV0b3BsYXkgPT09IHVuZGVmaW5lZCB8fCBhdXRvcGxheSkge1xuICAgICAgZWwuc2V0QXR0cmlidXRlKCdhdXRvcGxheScsICcnKTtcbiAgICAgIGVsLnBsYXkoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXBwbHlNb2RpZmljYXRpb25zKGVsLCBvKTtcbiAgfVxuXG4gIC8vIHNlZSBpZiB3ZSBhcmUgdXNpbmcgYSBwbHVnaW5cbiAgcGluc3QgPSBwbHVnaW4oKG9wdHMgfHwge30pLnBsdWdpbnMpO1xuICBpZiAocGluc3QpIHtcbiAgICByZXR1cm4gcGluc3QuaW5pdChvcHRzLCBmdW5jdGlvbihlcnIpIHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgcGluc3QuYXR0YWNoICE9ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcigncGx1Z2luIG11c3Qgc3VwcG9ydCB0aGUgYXR0YWNoIGZ1bmN0aW9uJykpO1xuICAgICAgfVxuXG4gICAgICBjYWxsYmFjayhudWxsLCBhcHBseU1vZGlmaWNhdGlvbnMocGluc3QuYXR0YWNoKHN0cmVhbSwgb3B0cyksIG9wdHMpKTtcbiAgICB9KTtcbiAgfVxuXG4gIGNhbGxiYWNrKG51bGwsIGF0dGFjaFRvRWxlbWVudChzdHJlYW0sIG9wdHMpKTtcbn07XG5cbi8qKlxuICAjIyMgYGF0dGFjaC5sb2NhbChzdHJlYW0sIG9wdHM/LCBjYWxsYmFjaylgXG5cbiAgQXR0YWNoIGEgbG9jYWwgc3RyZWFtIHdpdGggb3B0aW9ucyBhcHByb3ByaWF0ZSBmb3IgbG9jYWwgc3RyZWFtczpcblxuICAtIGBtdXRlZGA6IGB0cnVlYFxuXG4qKi9cbmF0dGFjaC5sb2NhbCA9IGZ1bmN0aW9uKHN0cmVhbSwgb3B0cywgY2FsbGJhY2spIHtcbiAgaWYgKHR5cGVvZiBvcHRzID09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IG9wdHM7XG4gICAgb3B0cyA9IHt9O1xuICB9XG5cbiAgYXR0YWNoKHN0cmVhbSwgZXh0ZW5kKHsgbXV0ZWQ6IHRydWUsIG1pcnJvcjogdHJ1ZSB9LCBvcHRzKSwgY2FsbGJhY2spO1xufTtcbiIsInZhciBwbHVnaW4gPSByZXF1aXJlKCdydGMtY29yZS9wbHVnaW4nKTtcbnZhciBkZXRlY3QgPSByZXF1aXJlKCdydGMtY29yZS9kZXRlY3QnKTtcblxuLy8gcGF0Y2ggbmF2aWdhdG9yIGdldFVzZXJNZWRpYVxubmF2aWdhdG9yLmdldFVzZXJNZWRpYSA9IG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgfHxcbiAgZGV0ZWN0LmNhbGwobmF2aWdhdG9yLCAnZ2V0VXNlck1lZGlhJyk7XG5cbi8qKlxuICAjIHJ0Yy1jYXB0dXJlXG5cbiAgUm91Z2hseSBlcXVpdmFsZW50IHRvIHRoZVxuICBbYGdldFVzZXJNZWRpYWBdKGh0dHBzOi8vd3d3Lm5wbWpzLm9yZy9wYWNrYWdlL2dldHVzZXJtZWRpYSkgcGFja2FnZSBidXQgd2l0aFxuICBzdXBwb3J0IGZvciBydGMuaW8gcGx1Z2lucy5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgPDw8IGV4YW1wbGVzL3NpbXBsZS5qc1xuXG4gICMjIEV4YW1wbGUgd2l0aCB1c2luZyBQbHVnaW5zXG5cbiAgPDw8IGV4YW1wbGVzL3BsdWdpbnMuanNcblxuICAjIyBSZWZlcmVuY2VcblxuICAjIyMgYGNhcHR1cmUoY29uc3RyYWludHMsIG9wdHM/LCBjYWxsYmFjaylgXG5cbiAgQ2FwdHVyZSBtZWRpYSB3aXRoIHRoZSBzdXBwbGllZCBgY29uc3RyYWludHNgLiAgSWYgYW4gYG9wdHNgIGFyZ3VtZW50IGlzXG4gIHN1cHBsaWVkIGxvb2sgZm9yIHBsdWdpbnMgdGhhdCBtYXkgY2hhbmdlIHRoZSBiZWhhdmlvdXIgb2YgdGhlIGNhcHR1cmVcbiAgb3BlcmF0aW9uLlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29uc3RyYWludHMsIG9wdHMsIGNhbGxiYWNrKSB7XG4gIHZhciBwaW5zdDtcblxuICBmdW5jdGlvbiBoYW5kbGVDYXB0dXJlKHN0cmVhbSkge1xuICAgIGNhbGxiYWNrKG51bGwsIHN0cmVhbSk7XG4gIH1cblxuICBpZiAodHlwZW9mIG9wdHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICBvcHRzID0ge307XG4gIH1cblxuICAvLyBzZWUgaWYgd2UgYXJlIHVzaW5nIGEgcGx1Z2luXG4gIHBpbnN0ID0gcGx1Z2luKChvcHRzIHx8IHt9KS5wbHVnaW5zKTtcbiAgaWYgKHBpbnN0KSB7XG4gICAgcmV0dXJuIHBpbnN0LmluaXQob3B0cywgZnVuY3Rpb24oZXJyKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgIT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdwbHVnaW4gZG9lcyBub3Qgc3VwcG9ydCBtZWRpYSBjYXB0dXJlJykpO1xuICAgICAgfVxuXG4gICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzLCBoYW5kbGVDYXB0dXJlLCBjYWxsYmFjayk7XG4gICAgfSk7XG4gIH1cblxuICBpZiAodHlwZW9mIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgIT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ2dldFVzZXJNZWRpYSBub3Qgc3VwcG9ydGVkJykpO1xuICB9XG5cbiAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYShjb25zdHJhaW50cywgaGFuZGxlQ2FwdHVyZSwgY2FsbGJhY2spO1xufTtcbiJdfQ==
