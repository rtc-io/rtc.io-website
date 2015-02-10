(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
var crel = require('crel');
var media = require('rtc-media');
var videoproc = require('rtc-videoproc');
var video = crel('video');
var canvas = crel('canvas');

// set up the video processing
videoproc(video, canvas, {
  fps: 5,
  filter: require('rtc-filter-grayscale')
});

// capture and render the video
media().render(video);

// add the canvas to the document body
document.body.appendChild(canvas);
},{"crel":4,"rtc-filter-grayscale":8,"rtc-media":9,"rtc-videoproc":12}],3:[function(require,module,exports){
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
},{}],4:[function(require,module,exports){
//Copyright (C) 2012 Kory Nunn

//Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

//The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

/*

    This code is not formatted for readability, but rather run-speed and to assist compilers.

    However, the code's intention should be transparent.

    *** IE SUPPORT ***

    If you require this library to work in IE7, add the following after declaring crel.

    var testDiv = document.createElement('div'),
        testLabel = document.createElement('label');

    testDiv.setAttribute('class', 'a');
    testDiv['className'] !== 'a' ? crel.attrMap['class'] = 'className':undefined;
    testDiv.setAttribute('name','a');
    testDiv['name'] !== 'a' ? crel.attrMap['name'] = function(element, value){
        element.id = value;
    }:undefined;


    testLabel.setAttribute('for', 'a');
    testLabel['htmlFor'] !== 'a' ? crel.attrMap['for'] = 'htmlFor':undefined;



*/

(function (root, factory) {
    if (typeof exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        root.crel = factory();
    }
}(this, function () {
    var fn = 'function',
        obj = 'object',
        nodeType = 'nodeType',
        textContent = 'textContent',
        setAttribute = 'setAttribute',
        attrMapString = 'attrMap',
        isNodeString = 'isNode',
        isElementString = 'isElement',
        d = typeof document === obj ? document : {},
        isType = function(a, type){
            return typeof a === type;
        },
        isNode = typeof Node === fn ? function (object) {
            return object instanceof Node;
        } :
        // in IE <= 8 Node is an object, obviously..
        function(object){
            return object &&
                isType(object, obj) &&
                (nodeType in object) &&
                isType(object.ownerDocument,obj);
        },
        isElement = function (object) {
            return crel[isNodeString](object) && object[nodeType] === 1;
        },
        isArray = function(a){
            return a instanceof Array;
        },
        appendChild = function(element, child) {
          if(!crel[isNodeString](child)){
              child = d.createTextNode(child);
          }
          element.appendChild(child);
        };


    function crel(){
        var args = arguments, //Note: assigned to a variable to assist compilers. Saves about 40 bytes in closure compiler. Has negligable effect on performance.
            element = args[0],
            child,
            settings = args[1],
            childIndex = 2,
            argumentsLength = args.length,
            attributeMap = crel[attrMapString];

        element = crel[isElementString](element) ? element : d.createElement(element);
        // shortcut
        if(argumentsLength === 1){
            return element;
        }

        if(!isType(settings,obj) || crel[isNodeString](settings) || isArray(settings)) {
            --childIndex;
            settings = null;
        }

        // shortcut if there is only one child that is a string
        if((argumentsLength - childIndex) === 1 && isType(args[childIndex], 'string') && element[textContent] !== undefined){
            element[textContent] = args[childIndex];
        }else{
            for(; childIndex < argumentsLength; ++childIndex){
                child = args[childIndex];

                if(child == null){
                    continue;
                }

                if (isArray(child)) {
                  for (var i=0; i < child.length; ++i) {
                    appendChild(element, child[i]);
                  }
                } else {
                  appendChild(element, child);
                }
            }
        }

        for(var key in settings){
            if(!attributeMap[key]){
                element[setAttribute](key, settings[key]);
            }else{
                var attr = attributeMap[key];
                if(typeof attr === fn){
                    attr(element, settings[key]);
                }else{
                    element[setAttribute](attr, settings[key]);
                }
            }
        }

        return element;
    }

    // Used for mapping one kind of attribute to the supported version of that in bad browsers.
    crel[attrMapString] = {};

    crel[isElementString] = isElement;

    crel[isNodeString] = isNode;

    return crel;
}));

},{}],5:[function(require,module,exports){
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

},{"detect-browser":6}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

},{"./detect":5}],8:[function(require,module,exports){
/**
  # rtc-filter-grayscale

  A simple grayscale filter for use with the
  [rtc-videoproc](https://github.com/rtc-io/rtc-videoproc) module.

  ## Example Usage

  The following example can be run using
  [beefy](https://github.com/chrisdickinson/beefy) (`beefy example.js`):

  <<< example.js

**/
module.exports = function(imageData) {
  var channels = imageData.data;
  var rgb = [];
  var rgbAvg;
  var alpha;
  var ii;

  // check that we have channels is divisible by four (just as a safety)
  if (channels.length % 4 !== 0) {
    return;
  }

  // iterate through the data
  // NOTE: decrementing loops are fast but you need to know that you will
  // hit 0 using this logic otherwise it will run forever (only 0 is falsy)
  for (ii = channels.length; ii -= 4; ) {
    // get the rgb tuple
    rgb = [channels[ii], channels[ii + 1], channels[ii + 2]];

    // get the alpha value
    alpha = channels[ii + 3];

    // calculate the rgb average
    rgbAvg = (rgb[0] + rgb[1] + rgb[2] ) / 3;

    // update the values to the rgb average
    channels[ii] = channels[ii + 1] = channels[ii + 2] = rgbAvg;
  }

  return true;
};
},{}],9:[function(require,module,exports){
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

},{"cog/extend":3,"rtc-attach":10,"rtc-capture":11}],10:[function(require,module,exports){
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

},{"cog/extend":3,"rtc-core/plugin":7}],11:[function(require,module,exports){
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

},{"rtc-core/detect":5,"rtc-core/plugin":7}],12:[function(require,module,exports){
/* jshint node: true */
/* global document: false */
/* global HTMLVideoElement: false */
'use strict';

var DEFAULT_FPS = 25;
var raf = require('fdom/raf');
var EventEmitter = require('events').EventEmitter;

/**
  # rtc-videoproc

  This is a small helper module that allows you to substitute a video
  element with a canvas element.  This can be useful when you want to
  do pixel manipulation of the rendered images, or in situations when
  a video element does not behave as you expect.

  ## Example Usage

  <<< examples/grayscale-filter.js

  ## Using the Processing Pipeline

  A processing pipeline has been included to assist with
  manipulating the canvas on the fly. To specify the filters to be used
  in the processing pipeline, this is done in the options accepted by
  videoproc. Either specifying an array of filters with the `filters` option
  or a single filter function with the `filter` option is fine.  If you use
  both then the individual filter will be added filter list and used in
  series.

  ```js
  videoproc(srcVideo, targetCanvas, {
    filters: [
      require('rtc-filter-grayscale'),
      myCustomFilterFunction
    ]
  });
  ```

  ## Writing a Filter Function

  Writing a filter function is very simple, and they use the following
  function signature:

  ```js
  function filter(imageData, tick) {
  }
  ```

  The `imageData` arg is an
  [ImageData](http://www.w3.org/TR/2dcontext/#imagedata), and the `tick`
  argument refers to the tick that has been captured as part of the capture
  loop (be aware that it could be a high resolution timer value if rAF is
  being used).

  If you are writing an analysis filter, then simply do what you need to do
  and exit the function.  If you have written a filter that modifies the pixel
  data and you want this drawn back to the canvas then your **filter must
  return `true`** to tell `rtc-videoproc` that it should draw the imageData
  back to the canvas.

  ## Listening for custom `frame` events

  In addition to providing the opportunity to analyse and modify pixel data
  the `rtc-videoproc` module also provides the a custom `frame` event for
  detecting when a new frame has been drawn to the canvas.

  A simple example can be found below:

  <<< examples/framelistener.js

  NOTE: The `frame` event occurs after the filter pipeline has been run and
  and the imageData may have been modified from the original video frame.

  ## A Note with Regards to CPU Usage

  By default rtc-videoproc will draw at 25fps but this can be modified to capture
  at a lower frame rate for slower devices, or increased if you have a
  machine with plenty of grunt.

  ## Reference

  ### videoproc(src, target, opts?)

  Create (or patch) a `<canvas>` element that will receive the video images
  from a video element.  The following options are supported.

  - `canvas` - the canvas to draw video data to.  If not supplied a new 
    canvas element will be created.

  - `video` - the video element that will be used as the source of the video.
     If not supplied a new `<video>` element will be created.

  - `fps` - the redraw rate of the fake video (default = 25)

  - `greedy` - Specify `greedy: true` if you want the videoproc module to run
    it's capture loop using setTimeout rather than `requestAnimationFrame`.
    Doing this will mean you application will continue to capture and process
    frames even when it's tab / window becomes inactive. This is usually the
    desired behaviour with video conferencing applications.

**/
module.exports = function(src, target, opts) {
  // check for a valid source
  var validSource = typeof src != 'undefined'; // TODO: better check
  var resizeCanvas = false;
  var fps;
  var greedy;
  var greedyDelay;
  var drawDelay;

  // create an event emitter for the processor object
  var processor = new EventEmitter();

  // check for no target but opts supplied
  var shiftArgs = (! opts) && (! target) ||
    (typeof target == 'object' && typeof target.getContext != 'function');

  // initialise the draw metadata
  var drawWidth;
  var drawHeight;
  var drawX = 0;
  var drawY = 0;
  var drawData;
  var lastTick = 0;
  var sourceMonitorTimer = 0;
  var context;

  function syncCanvas() {
    target.width = src.videoWidth;
    target.height = src.videoHeight;
    calculateDrawRegion();
  }

  function calculateDrawRegion() {
    var scale;
    var scaleX;
    var scaleY;

    // if either width or height === 0 then bail
    if (target.width === 0 || target.height === 0) {
      return;
    }

    // calculate required scaling
    scale = Math.min(
      scaleX = (target.width / src.videoWidth),
      scaleY = (target.height / src.videoHeight)
    );

    // calculate the scaled draw width and height
    drawWidth = (src.videoWidth * scale) | 0;
    drawHeight = (src.videoHeight * scale) | 0;

    // calculate the offsetX and Y
    drawX = (target.width - drawWidth) >> 1;
    drawY = (target.height - drawHeight) >> 1;

    // save the draw data
    drawData = {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight
    };
  }

  function monitorSource() {
    clearInterval(sourceMonitorTimer);
    sourceMonitorTimer = setInterval(function() {
      if (src.videoWidth > 0 && src.videoHeight > 0) {
        clearInterval(sourceMonitorTimer);
        syncCanvas();
      }
    }, 100);
  }

  function redraw(tick) {
    var imageData;
    var tweaked;
    var evt;
    var postProcessEvt;
    var tweaked = false;
    var frameListeners = processor.listeners('frame').length;

    // get the current tick
    tick = tick || Date.now();

    // only draw as often as specified in the fps
    if (drawWidth && drawHeight && tick - lastTick > drawDelay) {
      // draw the image
      context.drawImage(src, drawX, drawY, drawWidth, drawHeight);

      // if we have processors, get the image data and pass it through
      if (processor.filters.length) {
        tweaked = false;
        imageData = context.getImageData(0, 0, drawWidth, drawHeight);

        // iterate through the processors
        processor.filters.forEach(function(filter) {
          tweaked = filter(imageData, tick, context, target, drawData) || tweaked;
        });

        if (tweaked) {
          // TODO: dirty area
          context.putImageData(imageData, 0, 0);
        }
      }

      // update the processor imageData
      processor.imageData = imageData;

      // emit the processor frame event
      processor.emit('frame', tick);

      // update the last tick
      lastTick = tick;
    }

    // queue up another redraw
    if (greedy) {
      setTimeout(redraw, greedyDelay);
    }
    else {
      raf(redraw);
    }
  }

  if (shiftArgs) {
    opts = target;
    target = document.createElement('canvas');
  }

  // save the target to the canvas property of the processor
  processor.canvas = target;
  context = processor.context = target.getContext('2d');

  // initialise the fps
  fps = (opts || {}).fps || DEFAULT_FPS;
  greedy = (opts || {}).greedy;

  // setTimeout should occur more frequently than the fps
  // delay so we get close to the desired fps
  greedyDelay = (1000 / fps) >> 1;

  // calaculate the draw delay, clamp as int
  drawDelay = (1000 / fps) | 0;

  // determine whether we should resize the canvas or not
  resizeCanvas = target.width === 0 || target.height === 0;

  // if we've been provided a filters array in options initialise the filters
  // with those functions
  processor.filters = ((opts || {}).filters || []).filter(function(filter) {
    return typeof filter == 'function';
  });

  // if a 'filter' option has been provided, then append to the filters array
  if (opts && typeof opts.filter == 'function') {
    processor.filters.push(opts.filter);
  }

  // if we are resizing the canvas, then as the video metadata changes
  // resync the canvas
  src.addEventListener('loadedmetadata', monitorSource);
  src.addEventListener('canplay', monitorSource);

  // calculate the initial draw metadata (will be recalculated on video stream changes)
  calculateDrawRegion();

  // start the redraw
  raf(redraw);

  return processor;
};
},{"events":1,"fdom/raf":13}],13:[function(require,module,exports){
/* jshint node: true */
/* global window: false */
'use strict';

var TEST_PROPS = ['r', 'webkitR', 'mozR', 'oR', 'msR'];

/**
  ### raf(callback)

  Request animation frame helper.

  <<< examples/raf.js

**/

module.exports = typeof window != 'undefined' && (function() {
  for (var ii = 0; ii < TEST_PROPS.length; ii++) {
    window.animFrame = window.animFrame ||
      window[TEST_PROPS[ii] + 'equestAnimationFrame'];
  } // for

  return animFrame;
})();
},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5udm0vdjAuMTAuMzMvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi8uLi8ubnZtL3YwLjEwLjMzL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsImNvZGUvc2ltcGxlLW1hbmlwdWxhdGlvbi01ZnBzLmpzIiwibm9kZV9tb2R1bGVzL2NvZy9leHRlbmQuanMiLCJub2RlX21vZHVsZXMvY3JlbC9jcmVsLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1jb3JlL2RldGVjdC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtY29yZS9ub2RlX21vZHVsZXMvZGV0ZWN0LWJyb3dzZXIvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtY29yZS9wbHVnaW4uanMiLCJub2RlX21vZHVsZXMvcnRjLWZpbHRlci1ncmF5c2NhbGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLW1lZGlhL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1tZWRpYS9ub2RlX21vZHVsZXMvcnRjLWF0dGFjaC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtbWVkaWEvbm9kZV9tb2R1bGVzL3J0Yy1jYXB0dXJlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy12aWRlb3Byb2MvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLXZpZGVvcHJvYy9ub2RlX21vZHVsZXMvZmRvbS9yYWYuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwidmFyIGNyZWwgPSByZXF1aXJlKCdjcmVsJyk7XG52YXIgbWVkaWEgPSByZXF1aXJlKCdydGMtbWVkaWEnKTtcbnZhciB2aWRlb3Byb2MgPSByZXF1aXJlKCdydGMtdmlkZW9wcm9jJyk7XG52YXIgdmlkZW8gPSBjcmVsKCd2aWRlbycpO1xudmFyIGNhbnZhcyA9IGNyZWwoJ2NhbnZhcycpO1xuXG4vLyBzZXQgdXAgdGhlIHZpZGVvIHByb2Nlc3NpbmdcbnZpZGVvcHJvYyh2aWRlbywgY2FudmFzLCB7XG4gIGZwczogNSxcbiAgZmlsdGVyOiByZXF1aXJlKCdydGMtZmlsdGVyLWdyYXlzY2FsZScpXG59KTtcblxuLy8gY2FwdHVyZSBhbmQgcmVuZGVyIHRoZSB2aWRlb1xubWVkaWEoKS5yZW5kZXIodmlkZW8pO1xuXG4vLyBhZGQgdGhlIGNhbnZhcyB0byB0aGUgZG9jdW1lbnQgYm9keVxuZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChjYW52YXMpOyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuIyMgY29nL2V4dGVuZFxuXG5gYGBqc1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcbmBgYFxuXG4jIyMgZXh0ZW5kKHRhcmdldCwgKilcblxuU2hhbGxvdyBjb3B5IG9iamVjdCBwcm9wZXJ0aWVzIGZyb20gdGhlIHN1cHBsaWVkIHNvdXJjZSBvYmplY3RzICgqKSBpbnRvXG50aGUgdGFyZ2V0IG9iamVjdCwgcmV0dXJuaW5nIHRoZSB0YXJnZXQgb2JqZWN0IG9uY2UgY29tcGxldGVkOlxuXG5gYGBqc1xuZXh0ZW5kKHsgYTogMSwgYjogMiB9LCB7IGM6IDMgfSwgeyBkOiA0IH0sIHsgYjogNSB9KSk7XG5gYGBcblxuU2VlIGFuIGV4YW1wbGUgb24gW3JlcXVpcmViaW5dKGh0dHA6Ly9yZXF1aXJlYmluLmNvbS8/Z2lzdD02MDc5NDc1KS5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0YXJnZXQpIHtcbiAgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLmZvckVhY2goZnVuY3Rpb24oc291cmNlKSB7XG4gICAgaWYgKCEgc291cmNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiB0YXJnZXQ7XG59OyIsIi8vQ29weXJpZ2h0IChDKSAyMDEyIEtvcnkgTnVublxyXG5cclxuLy9QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxyXG5cclxuLy9UaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cclxuXHJcbi8vVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXHJcblxyXG4vKlxyXG5cclxuICAgIFRoaXMgY29kZSBpcyBub3QgZm9ybWF0dGVkIGZvciByZWFkYWJpbGl0eSwgYnV0IHJhdGhlciBydW4tc3BlZWQgYW5kIHRvIGFzc2lzdCBjb21waWxlcnMuXHJcblxyXG4gICAgSG93ZXZlciwgdGhlIGNvZGUncyBpbnRlbnRpb24gc2hvdWxkIGJlIHRyYW5zcGFyZW50LlxyXG5cclxuICAgICoqKiBJRSBTVVBQT1JUICoqKlxyXG5cclxuICAgIElmIHlvdSByZXF1aXJlIHRoaXMgbGlicmFyeSB0byB3b3JrIGluIElFNywgYWRkIHRoZSBmb2xsb3dpbmcgYWZ0ZXIgZGVjbGFyaW5nIGNyZWwuXHJcblxyXG4gICAgdmFyIHRlc3REaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSxcclxuICAgICAgICB0ZXN0TGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsYWJlbCcpO1xyXG5cclxuICAgIHRlc3REaXYuc2V0QXR0cmlidXRlKCdjbGFzcycsICdhJyk7XHJcbiAgICB0ZXN0RGl2WydjbGFzc05hbWUnXSAhPT0gJ2EnID8gY3JlbC5hdHRyTWFwWydjbGFzcyddID0gJ2NsYXNzTmFtZSc6dW5kZWZpbmVkO1xyXG4gICAgdGVzdERpdi5zZXRBdHRyaWJ1dGUoJ25hbWUnLCdhJyk7XHJcbiAgICB0ZXN0RGl2WyduYW1lJ10gIT09ICdhJyA/IGNyZWwuYXR0ck1hcFsnbmFtZSddID0gZnVuY3Rpb24oZWxlbWVudCwgdmFsdWUpe1xyXG4gICAgICAgIGVsZW1lbnQuaWQgPSB2YWx1ZTtcclxuICAgIH06dW5kZWZpbmVkO1xyXG5cclxuXHJcbiAgICB0ZXN0TGFiZWwuc2V0QXR0cmlidXRlKCdmb3InLCAnYScpO1xyXG4gICAgdGVzdExhYmVsWydodG1sRm9yJ10gIT09ICdhJyA/IGNyZWwuYXR0ck1hcFsnZm9yJ10gPSAnaHRtbEZvcic6dW5kZWZpbmVkO1xyXG5cclxuXHJcblxyXG4qL1xyXG5cclxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XHJcbiAgICBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgICAgIGRlZmluZShmYWN0b3J5KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcm9vdC5jcmVsID0gZmFjdG9yeSgpO1xyXG4gICAgfVxyXG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBmbiA9ICdmdW5jdGlvbicsXHJcbiAgICAgICAgb2JqID0gJ29iamVjdCcsXHJcbiAgICAgICAgbm9kZVR5cGUgPSAnbm9kZVR5cGUnLFxyXG4gICAgICAgIHRleHRDb250ZW50ID0gJ3RleHRDb250ZW50JyxcclxuICAgICAgICBzZXRBdHRyaWJ1dGUgPSAnc2V0QXR0cmlidXRlJyxcclxuICAgICAgICBhdHRyTWFwU3RyaW5nID0gJ2F0dHJNYXAnLFxyXG4gICAgICAgIGlzTm9kZVN0cmluZyA9ICdpc05vZGUnLFxyXG4gICAgICAgIGlzRWxlbWVudFN0cmluZyA9ICdpc0VsZW1lbnQnLFxyXG4gICAgICAgIGQgPSB0eXBlb2YgZG9jdW1lbnQgPT09IG9iaiA/IGRvY3VtZW50IDoge30sXHJcbiAgICAgICAgaXNUeXBlID0gZnVuY3Rpb24oYSwgdHlwZSl7XHJcbiAgICAgICAgICAgIHJldHVybiB0eXBlb2YgYSA9PT0gdHlwZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGlzTm9kZSA9IHR5cGVvZiBOb2RlID09PSBmbiA/IGZ1bmN0aW9uIChvYmplY3QpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdCBpbnN0YW5jZW9mIE5vZGU7XHJcbiAgICAgICAgfSA6XHJcbiAgICAgICAgLy8gaW4gSUUgPD0gOCBOb2RlIGlzIGFuIG9iamVjdCwgb2J2aW91c2x5Li5cclxuICAgICAgICBmdW5jdGlvbihvYmplY3Qpe1xyXG4gICAgICAgICAgICByZXR1cm4gb2JqZWN0ICYmXHJcbiAgICAgICAgICAgICAgICBpc1R5cGUob2JqZWN0LCBvYmopICYmXHJcbiAgICAgICAgICAgICAgICAobm9kZVR5cGUgaW4gb2JqZWN0KSAmJlxyXG4gICAgICAgICAgICAgICAgaXNUeXBlKG9iamVjdC5vd25lckRvY3VtZW50LG9iaik7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc0VsZW1lbnQgPSBmdW5jdGlvbiAob2JqZWN0KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjcmVsW2lzTm9kZVN0cmluZ10ob2JqZWN0KSAmJiBvYmplY3Rbbm9kZVR5cGVdID09PSAxO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaXNBcnJheSA9IGZ1bmN0aW9uKGEpe1xyXG4gICAgICAgICAgICByZXR1cm4gYSBpbnN0YW5jZW9mIEFycmF5O1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYXBwZW5kQ2hpbGQgPSBmdW5jdGlvbihlbGVtZW50LCBjaGlsZCkge1xyXG4gICAgICAgICAgaWYoIWNyZWxbaXNOb2RlU3RyaW5nXShjaGlsZCkpe1xyXG4gICAgICAgICAgICAgIGNoaWxkID0gZC5jcmVhdGVUZXh0Tm9kZShjaGlsZCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbGVtZW50LmFwcGVuZENoaWxkKGNoaWxkKTtcclxuICAgICAgICB9O1xyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBjcmVsKCl7XHJcbiAgICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHMsIC8vTm90ZTogYXNzaWduZWQgdG8gYSB2YXJpYWJsZSB0byBhc3Npc3QgY29tcGlsZXJzLiBTYXZlcyBhYm91dCA0MCBieXRlcyBpbiBjbG9zdXJlIGNvbXBpbGVyLiBIYXMgbmVnbGlnYWJsZSBlZmZlY3Qgb24gcGVyZm9ybWFuY2UuXHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSBhcmdzWzBdLFxyXG4gICAgICAgICAgICBjaGlsZCxcclxuICAgICAgICAgICAgc2V0dGluZ3MgPSBhcmdzWzFdLFxyXG4gICAgICAgICAgICBjaGlsZEluZGV4ID0gMixcclxuICAgICAgICAgICAgYXJndW1lbnRzTGVuZ3RoID0gYXJncy5sZW5ndGgsXHJcbiAgICAgICAgICAgIGF0dHJpYnV0ZU1hcCA9IGNyZWxbYXR0ck1hcFN0cmluZ107XHJcblxyXG4gICAgICAgIGVsZW1lbnQgPSBjcmVsW2lzRWxlbWVudFN0cmluZ10oZWxlbWVudCkgPyBlbGVtZW50IDogZC5jcmVhdGVFbGVtZW50KGVsZW1lbnQpO1xyXG4gICAgICAgIC8vIHNob3J0Y3V0XHJcbiAgICAgICAgaWYoYXJndW1lbnRzTGVuZ3RoID09PSAxKXtcclxuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZighaXNUeXBlKHNldHRpbmdzLG9iaikgfHwgY3JlbFtpc05vZGVTdHJpbmddKHNldHRpbmdzKSB8fCBpc0FycmF5KHNldHRpbmdzKSkge1xyXG4gICAgICAgICAgICAtLWNoaWxkSW5kZXg7XHJcbiAgICAgICAgICAgIHNldHRpbmdzID0gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHNob3J0Y3V0IGlmIHRoZXJlIGlzIG9ubHkgb25lIGNoaWxkIHRoYXQgaXMgYSBzdHJpbmdcclxuICAgICAgICBpZigoYXJndW1lbnRzTGVuZ3RoIC0gY2hpbGRJbmRleCkgPT09IDEgJiYgaXNUeXBlKGFyZ3NbY2hpbGRJbmRleF0sICdzdHJpbmcnKSAmJiBlbGVtZW50W3RleHRDb250ZW50XSAhPT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgICAgZWxlbWVudFt0ZXh0Q29udGVudF0gPSBhcmdzW2NoaWxkSW5kZXhdO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICBmb3IoOyBjaGlsZEluZGV4IDwgYXJndW1lbnRzTGVuZ3RoOyArK2NoaWxkSW5kZXgpe1xyXG4gICAgICAgICAgICAgICAgY2hpbGQgPSBhcmdzW2NoaWxkSW5kZXhdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKGNoaWxkID09IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChpc0FycmF5KGNoaWxkKSkge1xyXG4gICAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBjaGlsZC5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGFwcGVuZENoaWxkKGVsZW1lbnQsIGNoaWxkW2ldKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgYXBwZW5kQ2hpbGQoZWxlbWVudCwgY2hpbGQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IodmFyIGtleSBpbiBzZXR0aW5ncyl7XHJcbiAgICAgICAgICAgIGlmKCFhdHRyaWJ1dGVNYXBba2V5XSl7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50W3NldEF0dHJpYnV0ZV0oa2V5LCBzZXR0aW5nc1trZXldKTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXR0ciA9IGF0dHJpYnV0ZU1hcFtrZXldO1xyXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIGF0dHIgPT09IGZuKXtcclxuICAgICAgICAgICAgICAgICAgICBhdHRyKGVsZW1lbnQsIHNldHRpbmdzW2tleV0pO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudFtzZXRBdHRyaWJ1dGVdKGF0dHIsIHNldHRpbmdzW2tleV0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZWxlbWVudDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBVc2VkIGZvciBtYXBwaW5nIG9uZSBraW5kIG9mIGF0dHJpYnV0ZSB0byB0aGUgc3VwcG9ydGVkIHZlcnNpb24gb2YgdGhhdCBpbiBiYWQgYnJvd3NlcnMuXHJcbiAgICBjcmVsW2F0dHJNYXBTdHJpbmddID0ge307XHJcblxyXG4gICAgY3JlbFtpc0VsZW1lbnRTdHJpbmddID0gaXNFbGVtZW50O1xyXG5cclxuICAgIGNyZWxbaXNOb2RlU3RyaW5nXSA9IGlzTm9kZTtcclxuXHJcbiAgICByZXR1cm4gY3JlbDtcclxufSkpO1xyXG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIHdpbmRvdzogZmFsc2UgKi9cbi8qIGdsb2JhbCBuYXZpZ2F0b3I6IGZhbHNlICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGJyb3dzZXIgPSByZXF1aXJlKCdkZXRlY3QtYnJvd3NlcicpO1xuXG4vKipcbiAgIyMjIGBydGMtY29yZS9kZXRlY3RgXG5cbiAgQSBicm93c2VyIGRldGVjdGlvbiBoZWxwZXIgZm9yIGFjY2Vzc2luZyBwcmVmaXgtZnJlZSB2ZXJzaW9ucyBvZiB0aGUgdmFyaW91c1xuICBXZWJSVEMgdHlwZXMuXG5cbiAgIyMjIEV4YW1wbGUgVXNhZ2VcblxuICBJZiB5b3Ugd2FudGVkIHRvIGdldCB0aGUgbmF0aXZlIGBSVENQZWVyQ29ubmVjdGlvbmAgcHJvdG90eXBlIGluIGFueSBicm93c2VyXG4gIHlvdSBjb3VsZCBkbyB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGpzXG4gIHZhciBkZXRlY3QgPSByZXF1aXJlKCdydGMtY29yZS9kZXRlY3QnKTsgLy8gYWxzbyBhdmFpbGFibGUgaW4gcnRjL2RldGVjdFxuICB2YXIgUlRDUGVlckNvbm5lY3Rpb24gPSBkZXRlY3QoJ1JUQ1BlZXJDb25uZWN0aW9uJyk7XG4gIGBgYFxuXG4gIFRoaXMgd291bGQgcHJvdmlkZSB3aGF0ZXZlciB0aGUgYnJvd3NlciBwcmVmaXhlZCB2ZXJzaW9uIG9mIHRoZVxuICBSVENQZWVyQ29ubmVjdGlvbiBpcyBhdmFpbGFibGUgKGB3ZWJraXRSVENQZWVyQ29ubmVjdGlvbmAsXG4gIGBtb3pSVENQZWVyQ29ubmVjdGlvbmAsIGV0YykuXG4qKi9cbnZhciBkZXRlY3QgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCwgb3B0cykge1xuICB2YXIgYXR0YWNoID0gKG9wdHMgfHwge30pLmF0dGFjaDtcbiAgdmFyIHByZWZpeElkeDtcbiAgdmFyIHByZWZpeDtcbiAgdmFyIHRlc3ROYW1lO1xuICB2YXIgaG9zdE9iamVjdCA9IHRoaXMgfHwgKHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB1bmRlZmluZWQpO1xuXG4gIC8vIGluaXRpYWxpc2UgdG8gZGVmYXVsdCBwcmVmaXhlc1xuICAvLyAocmV2ZXJzZSBvcmRlciBhcyB3ZSB1c2UgYSBkZWNyZW1lbnRpbmcgZm9yIGxvb3ApXG4gIHZhciBwcmVmaXhlcyA9ICgob3B0cyB8fCB7fSkucHJlZml4ZXMgfHwgWydtcycsICdvJywgJ21veicsICd3ZWJraXQnXSkuY29uY2F0KCcnKTtcblxuICAvLyBpZiB3ZSBoYXZlIG5vIGhvc3Qgb2JqZWN0LCB0aGVuIGFib3J0XG4gIGlmICghIGhvc3RPYmplY3QpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHByZWZpeGVzIGFuZCByZXR1cm4gdGhlIGNsYXNzIGlmIGZvdW5kIGluIGdsb2JhbFxuICBmb3IgKHByZWZpeElkeCA9IHByZWZpeGVzLmxlbmd0aDsgcHJlZml4SWR4LS07ICkge1xuICAgIHByZWZpeCA9IHByZWZpeGVzW3ByZWZpeElkeF07XG5cbiAgICAvLyBjb25zdHJ1Y3QgdGhlIHRlc3QgY2xhc3MgbmFtZVxuICAgIC8vIGlmIHdlIGhhdmUgYSBwcmVmaXggZW5zdXJlIHRoZSB0YXJnZXQgaGFzIGFuIHVwcGVyY2FzZSBmaXJzdCBjaGFyYWN0ZXJcbiAgICAvLyBzdWNoIHRoYXQgYSB0ZXN0IGZvciBnZXRVc2VyTWVkaWEgd291bGQgcmVzdWx0IGluIGFcbiAgICAvLyBzZWFyY2ggZm9yIHdlYmtpdEdldFVzZXJNZWRpYVxuICAgIHRlc3ROYW1lID0gcHJlZml4ICsgKHByZWZpeCA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdGFyZ2V0LnNsaWNlKDEpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQpO1xuXG4gICAgaWYgKHR5cGVvZiBob3N0T2JqZWN0W3Rlc3ROYW1lXSAhPSAndW5kZWZpbmVkJykge1xuICAgICAgLy8gdXBkYXRlIHRoZSBsYXN0IHVzZWQgcHJlZml4XG4gICAgICBkZXRlY3QuYnJvd3NlciA9IGRldGVjdC5icm93c2VyIHx8IHByZWZpeC50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICBpZiAoYXR0YWNoKSB7XG4gICAgICAgICBob3N0T2JqZWN0W3RhcmdldF0gPSBob3N0T2JqZWN0W3Rlc3ROYW1lXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGhvc3RPYmplY3RbdGVzdE5hbWVdO1xuICAgIH1cbiAgfVxufTtcblxuLy8gZGV0ZWN0IG1vemlsbGEgKHllcywgdGhpcyBmZWVscyBkaXJ0eSlcbmRldGVjdC5tb3ogPSB0eXBlb2YgbmF2aWdhdG9yICE9ICd1bmRlZmluZWQnICYmICEhbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYTtcblxuLy8gc2V0IHRoZSBicm93c2VyIGFuZCBicm93c2VyIHZlcnNpb25cbmRldGVjdC5icm93c2VyID0gYnJvd3Nlci5uYW1lO1xuZGV0ZWN0LmJyb3dzZXJWZXJzaW9uID0gZGV0ZWN0LnZlcnNpb24gPSBicm93c2VyLnZlcnNpb247XG4iLCJ2YXIgYnJvd3NlcnMgPSBbXG4gIFsgJ2Nocm9tZScsIC9DaHJvbSg/OmV8aXVtKVxcLyhbMC05XFwuXSspKDo/XFxzfCQpLyBdLFxuICBbICdmaXJlZm94JywgL0ZpcmVmb3hcXC8oWzAtOVxcLl0rKSg/Olxcc3wkKS8gXSxcbiAgWyAnb3BlcmEnLCAvT3BlcmFcXC8oWzAtOVxcLl0rKSg/Olxcc3wkKS8gXSxcbiAgWyAnaWUnLCAvVHJpZGVudFxcLzdcXC4wLipydlxcOihbMC05XFwuXSspXFwpLipHZWNrbyQvIF0sXG4gIFsgJ2llJywgL01TSUVcXHMoWzAtOVxcLl0rKTsuKlRyaWRlbnRcXC9bNC03XS4wLyBdLFxuICBbICdpZScsIC9NU0lFXFxzKDdcXC4wKS8gXSxcbiAgWyAnYmIxMCcsIC9CQjEwO1xcc1RvdWNoLipWZXJzaW9uXFwvKFswLTlcXC5dKykvIF0sXG4gIFsgJ2FuZHJvaWQnLCAvQW5kcm9pZFxccyhbMC05XFwuXSspLyBdLFxuICBbICdpb3MnLCAvaVBhZFxcO1xcc0NQVVxcc09TXFxzKFswLTlcXC5fXSspLyBdLFxuICBbICdpb3MnLCAgL2lQaG9uZVxcO1xcc0NQVVxcc2lQaG9uZVxcc09TXFxzKFswLTlcXC5fXSspLyBdLFxuICBbICdzYWZhcmknLCAvU2FmYXJpXFwvKFswLTlcXC5fXSspLyBdXG5dO1xuXG52YXIgbWF0Y2ggPSBicm93c2Vycy5tYXAobWF0Y2gpLmZpbHRlcihpc01hdGNoKVswXTtcbnZhciBwYXJ0cyA9IG1hdGNoICYmIG1hdGNoWzNdLnNwbGl0KC9bLl9dLykuc2xpY2UoMCwzKTtcblxud2hpbGUgKHBhcnRzICYmIHBhcnRzLmxlbmd0aCA8IDMpIHtcbiAgcGFydHMucHVzaCgnMCcpO1xufVxuXG4vLyBzZXQgdGhlIG5hbWUgYW5kIHZlcnNpb25cbmV4cG9ydHMubmFtZSA9IG1hdGNoICYmIG1hdGNoWzBdO1xuZXhwb3J0cy52ZXJzaW9uID0gcGFydHMgJiYgcGFydHMuam9pbignLicpO1xuXG5mdW5jdGlvbiBtYXRjaChwYWlyKSB7XG4gIHJldHVybiBwYWlyLmNvbmNhdChwYWlyWzFdLmV4ZWMobmF2aWdhdG9yLnVzZXJBZ2VudCkpO1xufVxuXG5mdW5jdGlvbiBpc01hdGNoKHBhaXIpIHtcbiAgcmV0dXJuICEhcGFpclsyXTtcbn1cbiIsInZhciBkZXRlY3QgPSByZXF1aXJlKCcuL2RldGVjdCcpO1xudmFyIHJlcXVpcmVkRnVuY3Rpb25zID0gW1xuICAnaW5pdCdcbl07XG5cbmZ1bmN0aW9uIGlzU3VwcG9ydGVkKHBsdWdpbikge1xuICByZXR1cm4gcGx1Z2luICYmIHR5cGVvZiBwbHVnaW4uc3VwcG9ydGVkID09ICdmdW5jdGlvbicgJiYgcGx1Z2luLnN1cHBvcnRlZChkZXRlY3QpO1xufVxuXG5mdW5jdGlvbiBpc1ZhbGlkKHBsdWdpbikge1xuICB2YXIgc3VwcG9ydGVkRnVuY3Rpb25zID0gcmVxdWlyZWRGdW5jdGlvbnMuZmlsdGVyKGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBwbHVnaW5bZm5dID09ICdmdW5jdGlvbic7XG4gIH0pO1xuXG4gIHJldHVybiBzdXBwb3J0ZWRGdW5jdGlvbnMubGVuZ3RoID09PSByZXF1aXJlZEZ1bmN0aW9ucy5sZW5ndGg7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocGx1Z2lucykge1xuICByZXR1cm4gW10uY29uY2F0KHBsdWdpbnMgfHwgW10pLmZpbHRlcihpc1N1cHBvcnRlZCkuZmlsdGVyKGlzVmFsaWQpWzBdO1xufVxuIiwiLyoqXG4gICMgcnRjLWZpbHRlci1ncmF5c2NhbGVcblxuICBBIHNpbXBsZSBncmF5c2NhbGUgZmlsdGVyIGZvciB1c2Ugd2l0aCB0aGVcbiAgW3J0Yy12aWRlb3Byb2NdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLXZpZGVvcHJvYykgbW9kdWxlLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICBUaGUgZm9sbG93aW5nIGV4YW1wbGUgY2FuIGJlIHJ1biB1c2luZ1xuICBbYmVlZnldKGh0dHBzOi8vZ2l0aHViLmNvbS9jaHJpc2RpY2tpbnNvbi9iZWVmeSkgKGBiZWVmeSBleGFtcGxlLmpzYCk6XG5cbiAgPDw8IGV4YW1wbGUuanNcblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGltYWdlRGF0YSkge1xuICB2YXIgY2hhbm5lbHMgPSBpbWFnZURhdGEuZGF0YTtcbiAgdmFyIHJnYiA9IFtdO1xuICB2YXIgcmdiQXZnO1xuICB2YXIgYWxwaGE7XG4gIHZhciBpaTtcblxuICAvLyBjaGVjayB0aGF0IHdlIGhhdmUgY2hhbm5lbHMgaXMgZGl2aXNpYmxlIGJ5IGZvdXIgKGp1c3QgYXMgYSBzYWZldHkpXG4gIGlmIChjaGFubmVscy5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBkYXRhXG4gIC8vIE5PVEU6IGRlY3JlbWVudGluZyBsb29wcyBhcmUgZmFzdCBidXQgeW91IG5lZWQgdG8ga25vdyB0aGF0IHlvdSB3aWxsXG4gIC8vIGhpdCAwIHVzaW5nIHRoaXMgbG9naWMgb3RoZXJ3aXNlIGl0IHdpbGwgcnVuIGZvcmV2ZXIgKG9ubHkgMCBpcyBmYWxzeSlcbiAgZm9yIChpaSA9IGNoYW5uZWxzLmxlbmd0aDsgaWkgLT0gNDsgKSB7XG4gICAgLy8gZ2V0IHRoZSByZ2IgdHVwbGVcbiAgICByZ2IgPSBbY2hhbm5lbHNbaWldLCBjaGFubmVsc1tpaSArIDFdLCBjaGFubmVsc1tpaSArIDJdXTtcblxuICAgIC8vIGdldCB0aGUgYWxwaGEgdmFsdWVcbiAgICBhbHBoYSA9IGNoYW5uZWxzW2lpICsgM107XG5cbiAgICAvLyBjYWxjdWxhdGUgdGhlIHJnYiBhdmVyYWdlXG4gICAgcmdiQXZnID0gKHJnYlswXSArIHJnYlsxXSArIHJnYlsyXSApIC8gMztcblxuICAgIC8vIHVwZGF0ZSB0aGUgdmFsdWVzIHRvIHRoZSByZ2IgYXZlcmFnZVxuICAgIGNoYW5uZWxzW2lpXSA9IGNoYW5uZWxzW2lpICsgMV0gPSBjaGFubmVsc1tpaSArIDJdID0gcmdiQXZnO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59OyIsInZhciBjYXB0dXJlID0gcmVxdWlyZSgncnRjLWNhcHR1cmUnKTtcbnZhciBhdHRhY2ggPSByZXF1aXJlKCdydGMtYXR0YWNoJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xuXG4vKipcbiAgIyBydGMtbWVkaWFcblxuICBUaGlzIGlzIGEgY29udmVuaWVuY2UgZnVuY3Rpb24gZm9yIGludm9raW5nIG1lZGlhIGNhcHR1cmUgYW5kIHJlbmRlcmluZ1xuICB1c2luZyB0aGUgW2BydGMtY2FwdHVyZWBdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLWNhcHR1cmUpIGFuZFxuICBbYHJ0Yy1hdHRhY2hgXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1hdHRhY2gpIHBhY2thZ2VzIHJlc3BlY3RpdmVseVxuICB3aXRoaW4gYW4gYXBwbGljYXRpb24uXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIERlZmF1bHQgY29uc3RyYWludHMgYHsgYXVkaW86IHRydWUsIHZpZGVvOiB0cnVlIH1gIGNhcHR1cmUgYW5kIHJlbmRlcmluZ1xuICBhbiBuZXcgdmlkZW8gZWxlbWVudCB3aXRoaW4gdGhlIGRvY3VtZW50LmJvZHk6XG5cbiAgPDw8IGV4YW1wbGVzL3JlbmRlci10by1ib2R5LmpzXG5cbiAgSW4gdGhlIGV2ZW50IHRoYXQgeW91IHdpc2ggdG8gbWFrZSB1c2Ugb2YgYW55IG9mIHRoZSBydGMuaW8gcGx1Z2lucywgdGhlblxuICB0aGUgZm9sbG93aW5nIGV4YW1wbGUgZGVtb25zdHJhdGVzIGhvdyB0byBwcm92aWRlIGEgc2luZ2xlIFwiY2FwdHVyZSBhbmRcbiAgcmVuZGVyXCIgY2FsbCB0aGF0IHdpbGwgd29yayB3aXRoIGEgcGx1Z2luOlxuXG4gIDw8PCBleGFtcGxlcy9wbHVnaW4uanNcblxuKiovXG5cbnZhciBtZWRpYSA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob3B0cykge1xuICAvLyBkbyB3ZSBoYXZlIGNvbnN0cmFpbnRzXG4gIHZhciBjb25zdHJhaW50cyA9IChvcHRzIHx8IHt9KS5jb25zdHJhaW50cyB8fCB7IHZpZGVvOiB0cnVlLCBhdWRpbzogdHJ1ZSB9O1xuXG4gIC8vIG9yIGRvIHdlIGhhdmUgYSBzdHJlYW1cbiAgdmFyIHN0cmVhbSA9IChvcHRzIHx8IHt9KS5zdHJlYW07XG5cbiAgLy8gaWYgd2UgaGF2ZSBiZWVuIHBhc3NlZCBjb25zdHJhaW50cywgYXNzdW1lIHdlIGFyZSBhdHRhY2hpbmcgYSBsb2NhbCBzdHJlYW1cbiAgLy8gb3RoZXJ3aXNlLCB1c2UgdGhlIGdlbmVyaWMgYXR0YWNoIG9wdGlvbnNcbiAgdmFyIHN0cmVhbUF0dGFjaCA9IChvcHRzIHx8IHt9KS5jb25zdHJhaW50cyA/IGF0dGFjaC5sb2NhbCA6IGF0dGFjaDtcblxuICAvLyBkZXRlY3QgYSB0YXJnZXRcbiAgdmFyIHRhcmdldCA9IChvcHRzIHx8IHt9KS50YXJnZXQgfHwgZG9jdW1lbnQuYm9keTtcbiAgdmFyIG5vbk1lZGlhVGFyZ2V0ID0gISh0YXJnZXQgaW5zdGFuY2VvZiBIVE1MTWVkaWFFbGVtZW50KTtcblxuICBmdW5jdGlvbiBoYW5kbGVBdHRhY2goZXJyLCBlbCkge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGFyZ2V0ICYmIG5vbk1lZGlhVGFyZ2V0ICYmIHRhcmdldCAhPT0gZWwpIHtcbiAgICAgIHRhcmdldC5hcHBlbmRDaGlsZChlbCk7XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgd2UgaGF2ZSBhIHN0cmVhbSwgbW92ZSBvbnRvIHJlbmRlcmluZyBpbW1lZGlhdGVseVxuICBpZiAoc3RyZWFtKSB7XG4gICAgcmV0dXJuIHN0cmVhbUF0dGFjaChzdHJlYW0sIG9wdHMsIGhhbmRsZUF0dGFjaCk7XG4gIH1cblxuICByZXR1cm4gY2FwdHVyZShjb25zdHJhaW50cywgb3B0cywgZnVuY3Rpb24oZXJyLCBzdHJlYW0pIHtcbiAgICBzdHJlYW1BdHRhY2goc3RyZWFtLCBvcHRzLCBoYW5kbGVBdHRhY2gpO1xuICB9KTtcbn07XG5cbm1lZGlhLmNhcHR1cmUgPSBmdW5jdGlvbihjb25zdHJhaW50cywgb3B0cykge1xuICByZXR1cm4gbWVkaWEoZXh0ZW5kKHt9LCBvcHRzLCB7IGNvbnN0cmFpbnRzOiBjb25zdHJhaW50cyB9KSk7XG59O1xuXG5tZWRpYS5hdHRhY2ggPSBtZWRpYS5yZW5kZXIgPSBmdW5jdGlvbihzdHJlYW0sIG9wdHMpIHtcbiAgcmV0dXJuIG1lZGlhKGV4dGVuZCh7fSwgb3B0cywgeyBzdHJlYW06IHN0cmVhbSB9KSk7XG59O1xuIiwidmFyIHBsdWdpbiA9IHJlcXVpcmUoJ3J0Yy1jb3JlL3BsdWdpbicpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcblxuLyoqXG4gICMgcnRjLWF0dGFjaFxuXG4gIFJvdWdobHkgZXF1aXZhbGVudCB0byB0aGVcbiAgW2BhdHRhY2hNZWRpYVN0cmVhbWBdKGh0dHBzOi8vd3d3Lm5wbWpzLm9yZy9wYWNrYWdlL2F0dGFjaG1lZGlhc3RyZWFtKVxuICBwYWNrYWdlIGJ1dCB3aXRoIHN1cHBvcnQgZm9yIHJ0Yy5pbyBwbHVnaW5zLiAgQWxzbyB1c2VzIGFuIGVycm9yIGZpcnN0XG4gIGFzeW5jIEFQSSB0byBhbGxvdyBwbHVnaW5zIHRpbWUgdG8gaW5pdGlhbGl6ZS5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgPDw8IGV4YW1wbGVzL3NpbXBsZS5qc1xuXG4gICMjIEV4YW1wbGUgdXNpbmcgUGx1Z2luc1xuXG4gIDw8PCBleGFtcGxlcy9wbHVnaW5zLmpzXG5cbiAgIyMgUmVmZXJlbmNlXG5cbiAgIyMjIGBhdHRhY2goc3RyZWFtLCBvcHRzPywgY2FsbGJhY2spYFxuXG4gIEF0dGFjaCBgc3RyZWFtYCB0byBhIEhUTUwgZWxlbWVudCB0aGF0IHdpbGwgcmVuZGVyIHRoZSBjb250ZW50LiBUaGUgcHJvdmlkZWRcbiAgYGNhbGxiYWNrYCBmb2xsb3dzIHRoZSBmb3JtYXQgb2YgYGZuKGVyciwgZWxlbWVudClgLiAgV2hpbGUgdGhlIGFzeW5jIG5hdHVyZVxuICBvZiB0aGlzIHBhY2thZ2UgbWF5IHNlZW0gb2RkLCBiZWNhdXNlIGEgcGx1Z2luIG1heSBuZWVkIHRpbWUgdG8gaW5pdGlhbGl6ZVxuICB0aGlzIGNhdGVycyBmb3IgdGhpcyBjYXNlIGluIGFkZGl0aW9uIHRvIHN0YW5kYXJkIHVzYWdlIGluIHRoZSBicm93c2VyLlxuXG4gIC0gYGF1dG9wbGF5YCAoZGVmYXVsdDogYHRydWVgKSAtIGJ5IGRlZmF1bHQgYWZ0ZXIgdGhlIHN0cmVhbSBoYXMgYmVlblxuICAgIGF0dGFjaGVkIHRvIHRoZSBlbGVtZW50IGl0IHdpbGwgYmUgcGxheWVkLiAgVGhpcyBpcyBkb25lIGJ5IGNhbGxpbmdcbiAgICB0aGUgYHBsYXkoKWAgZnVuY3Rpb24gb24gdGhlIGVsZW1lbnQgcmF0aGVyIHRoYW4gcmVseWluZyBvbiBgYXV0b3BsYXlgXG4gICAgYXR0cmlidXRlIGZ1bmN0aW9uYWxpdHkuXG5cbiAgLSBgZWxgIChkZWZhdWx0OiBgbnVsbGApIC0gaWYgeW91IHdpdGggdG8gc3VwcGx5IGFuIGVsZW1lbnQgdG8gYmUgdXNlZFxuICAgIGluc3RlYWQgb2YgY3JlYXRpbmcgYSBuZXcgZWxlbWVudCB0byByZWNlaXZlIHRoZSBzdHJlYW0gc3BlY2lmeSBpdCBoZXJlLlxuXG4gIC0gYG11dGVkYCAoZGVmYXVsdDogYGZhbHNlYCkgLSB3aGV0aGVyIHRoZSBjcmVhdGVkIGVsZW1lbnQgc2hvdWxkIGJlIG11dGVkXG4gICAgb3Igbm90LiAgRm9yIGxvY2FsIHN0cmVhbXMgdGhpcyBzaG91bGQgYWxtb3N0IGFsd2F5cywgYmUgdHJ1ZSBzbyBjb25zaWRlclxuICAgIHVzaW5nIHRoZSBgYXR0YWNoLmxvY2FsYCBoZWxwZXIgZnVuY3Rpb24gZm9yIHNpbXBsZSBjYXNlcy5cblxuICAtIGBwbHVnaW5zYCAoZGVmYXVsdDogYFtdYCkgLSBzcGVjaWZ5IG9uZSBvciBtb3JlIHBsdWdpbnMgdGhhdCBjYW4gYmUgdXNlZFxuICAgIHRvIHJlbmRlciB0aGUgbWVkaWEgc3RyZWFtIGFwcHJvcHJpYXRlIHRvIHRoZSBjdXJyZW50IHBsYXRmb3JtIGluIHRoZVxuICAgIGV2ZW50IHRoYXQgV2ViUlRDIGFuZC9vciBtZWRpYSBjYXB0dXJlIGlzIHN1cHBvcnRlZCB2aWEgYSBicm93c2VyIHBsdWdpbi5cblxuKiovXG52YXIgYXR0YWNoID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzdHJlYW0sIG9wdHMsIGNhbGxiYWNrKSB7XG4gIHZhciBVUkwgPSB0eXBlb2Ygd2luZG93ICE9ICd1bmRlZmluZWQnICYmIHdpbmRvdy5VUkw7XG4gIHZhciBwaW5zdDtcblxuICBpZiAodHlwZW9mIG9wdHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICBvcHRzID0ge307XG4gIH1cblxuICBmdW5jdGlvbiBhcHBseU1vZGlmaWNhdGlvbnMoZWwsIG8pIHtcbiAgICBpZiAoKG8gfHwge30pLm11dGVkKSB7XG4gICAgICBlbC5tdXRlZCA9IHRydWU7XG4gICAgICBlbC5zZXRBdHRyaWJ1dGUoJ211dGVkJywgJycpO1xuICAgIH1cblxuICAgIGlmICgobyB8fCB7fSkubWlycm9yKSB7XG4gICAgICBlbC5zZXRBdHRyaWJ1dGUoJ2RhdGEtbWlycm9yZWQnLCB0cnVlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZWw7XG4gIH1cblxuICBmdW5jdGlvbiBhdHRhY2hUb0VsZW1lbnQocywgbykge1xuICAgIHZhciBhdXRvcGxheSA9IChvIHx8IHt9KS5hdXRvcGxheTtcbiAgICB2YXIgZWxUeXBlID0gJ2F1ZGlvJztcbiAgICB2YXIgZWwgPSAobyB8fCB7fSkuZWwgfHwgKG8gfHwge30pLnRhcmdldDtcblxuICAgIC8vIGNoZWNrIHRoZSBzdHJlYW0gaXMgdmFsaWRcbiAgICB2YXIgaXNWYWxpZCA9IHMgJiYgdHlwZW9mIHMuZ2V0VmlkZW9UcmFja3MgPT0gJ2Z1bmN0aW9uJztcblxuICAgIC8vIGRldGVybWluZSB0aGUgZWxlbWVudCB0eXBlXG4gICAgaWYgKGlzVmFsaWQgJiYgcy5nZXRWaWRlb1RyYWNrcygpLmxlbmd0aCA+IDApIHtcbiAgICAgIGVsVHlwZSA9ICd2aWRlbyc7XG4gICAgfVxuXG4gICAgLy8gaWYgd2UgaGF2ZSBiZWVuIHBhc3NlZCBhbiBcInVucGxheWFibGVcIiB0YXJnZXQgY3JlYXRlIGEgbmV3IGVsZW1lbnRcbiAgICBpZiAoZWwgJiYgdHlwZW9mIGVsLnBsYXkgIT0gJ2Z1bmN0aW9uJykge1xuICAgICAgZWwgPSBudWxsO1xuICAgIH1cblxuICAgIC8vIHByZXBhcmUgdGhlIGVsZW1lbnRcbiAgICBlbCA9IGVsIHx8IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZWxUeXBlKTtcblxuICAgIC8vIGF0dGFjaCB0aGUgc3RyZWFtXG4gICAgaWYgKFVSTCAmJiBVUkwuY3JlYXRlT2JqZWN0VVJMKSB7XG4gICAgICBlbC5zcmMgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKHN0cmVhbSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGVsLnNyY09iamVjdCkge1xuICAgICAgZWwuc3JjT2JqZWN0ID0gc3RyZWFtO1xuICAgIH1cbiAgICBlbHNlIGlmIChlbC5tb3pTcmNPYmplY3QpIHtcbiAgICAgIGVsLm1velNyY09iamVjdCA9IHN0cmVhbTtcbiAgICB9XG5cbiAgICBpZiAoYXV0b3BsYXkgPT09IHVuZGVmaW5lZCB8fCBhdXRvcGxheSkge1xuICAgICAgZWwuc2V0QXR0cmlidXRlKCdhdXRvcGxheScsICcnKTtcbiAgICAgIGVsLnBsYXkoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXBwbHlNb2RpZmljYXRpb25zKGVsLCBvKTtcbiAgfVxuXG4gIC8vIHNlZSBpZiB3ZSBhcmUgdXNpbmcgYSBwbHVnaW5cbiAgcGluc3QgPSBwbHVnaW4oKG9wdHMgfHwge30pLnBsdWdpbnMpO1xuICBpZiAocGluc3QpIHtcbiAgICByZXR1cm4gcGluc3QuaW5pdChvcHRzLCBmdW5jdGlvbihlcnIpIHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgcGluc3QuYXR0YWNoICE9ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcigncGx1Z2luIG11c3Qgc3VwcG9ydCB0aGUgYXR0YWNoIGZ1bmN0aW9uJykpO1xuICAgICAgfVxuXG4gICAgICBjYWxsYmFjayhudWxsLCBhcHBseU1vZGlmaWNhdGlvbnMocGluc3QuYXR0YWNoKHN0cmVhbSwgb3B0cyksIG9wdHMpKTtcbiAgICB9KTtcbiAgfVxuXG4gIGNhbGxiYWNrKG51bGwsIGF0dGFjaFRvRWxlbWVudChzdHJlYW0sIG9wdHMpKTtcbn07XG5cbi8qKlxuICAjIyMgYGF0dGFjaC5sb2NhbChzdHJlYW0sIG9wdHM/LCBjYWxsYmFjaylgXG5cbiAgQXR0YWNoIGEgbG9jYWwgc3RyZWFtIHdpdGggb3B0aW9ucyBhcHByb3ByaWF0ZSBmb3IgbG9jYWwgc3RyZWFtczpcblxuICAtIGBtdXRlZGA6IGB0cnVlYFxuXG4qKi9cbmF0dGFjaC5sb2NhbCA9IGZ1bmN0aW9uKHN0cmVhbSwgb3B0cywgY2FsbGJhY2spIHtcbiAgaWYgKHR5cGVvZiBvcHRzID09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IG9wdHM7XG4gICAgb3B0cyA9IHt9O1xuICB9XG5cbiAgYXR0YWNoKHN0cmVhbSwgZXh0ZW5kKHsgbXV0ZWQ6IHRydWUsIG1pcnJvcjogdHJ1ZSB9LCBvcHRzKSwgY2FsbGJhY2spO1xufTtcbiIsInZhciBwbHVnaW4gPSByZXF1aXJlKCdydGMtY29yZS9wbHVnaW4nKTtcbnZhciBkZXRlY3QgPSByZXF1aXJlKCdydGMtY29yZS9kZXRlY3QnKTtcblxuLy8gcGF0Y2ggbmF2aWdhdG9yIGdldFVzZXJNZWRpYVxubmF2aWdhdG9yLmdldFVzZXJNZWRpYSA9IG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgfHxcbiAgZGV0ZWN0LmNhbGwobmF2aWdhdG9yLCAnZ2V0VXNlck1lZGlhJyk7XG5cbi8qKlxuICAjIHJ0Yy1jYXB0dXJlXG5cbiAgUm91Z2hseSBlcXVpdmFsZW50IHRvIHRoZVxuICBbYGdldFVzZXJNZWRpYWBdKGh0dHBzOi8vd3d3Lm5wbWpzLm9yZy9wYWNrYWdlL2dldHVzZXJtZWRpYSkgcGFja2FnZSBidXQgd2l0aFxuICBzdXBwb3J0IGZvciBydGMuaW8gcGx1Z2lucy5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgPDw8IGV4YW1wbGVzL3NpbXBsZS5qc1xuXG4gICMjIEV4YW1wbGUgd2l0aCB1c2luZyBQbHVnaW5zXG5cbiAgPDw8IGV4YW1wbGVzL3BsdWdpbnMuanNcblxuICAjIyBSZWZlcmVuY2VcblxuICAjIyMgYGNhcHR1cmUoY29uc3RyYWludHMsIG9wdHM/LCBjYWxsYmFjaylgXG5cbiAgQ2FwdHVyZSBtZWRpYSB3aXRoIHRoZSBzdXBwbGllZCBgY29uc3RyYWludHNgLiAgSWYgYW4gYG9wdHNgIGFyZ3VtZW50IGlzXG4gIHN1cHBsaWVkIGxvb2sgZm9yIHBsdWdpbnMgdGhhdCBtYXkgY2hhbmdlIHRoZSBiZWhhdmlvdXIgb2YgdGhlIGNhcHR1cmVcbiAgb3BlcmF0aW9uLlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29uc3RyYWludHMsIG9wdHMsIGNhbGxiYWNrKSB7XG4gIHZhciBwaW5zdDtcblxuICBmdW5jdGlvbiBoYW5kbGVDYXB0dXJlKHN0cmVhbSkge1xuICAgIGNhbGxiYWNrKG51bGwsIHN0cmVhbSk7XG4gIH1cblxuICBpZiAodHlwZW9mIG9wdHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICBvcHRzID0ge307XG4gIH1cblxuICAvLyBzZWUgaWYgd2UgYXJlIHVzaW5nIGEgcGx1Z2luXG4gIHBpbnN0ID0gcGx1Z2luKChvcHRzIHx8IHt9KS5wbHVnaW5zKTtcbiAgaWYgKHBpbnN0KSB7XG4gICAgcmV0dXJuIHBpbnN0LmluaXQob3B0cywgZnVuY3Rpb24oZXJyKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgIT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdwbHVnaW4gZG9lcyBub3Qgc3VwcG9ydCBtZWRpYSBjYXB0dXJlJykpO1xuICAgICAgfVxuXG4gICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzLCBoYW5kbGVDYXB0dXJlLCBjYWxsYmFjayk7XG4gICAgfSk7XG4gIH1cblxuICBpZiAodHlwZW9mIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgIT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ2dldFVzZXJNZWRpYSBub3Qgc3VwcG9ydGVkJykpO1xuICB9XG5cbiAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYShjb25zdHJhaW50cywgaGFuZGxlQ2FwdHVyZSwgY2FsbGJhY2spO1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgZG9jdW1lbnQ6IGZhbHNlICovXG4vKiBnbG9iYWwgSFRNTFZpZGVvRWxlbWVudDogZmFsc2UgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIERFRkFVTFRfRlBTID0gMjU7XG52YXIgcmFmID0gcmVxdWlyZSgnZmRvbS9yYWYnKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG5cbi8qKlxuICAjIHJ0Yy12aWRlb3Byb2NcblxuICBUaGlzIGlzIGEgc21hbGwgaGVscGVyIG1vZHVsZSB0aGF0IGFsbG93cyB5b3UgdG8gc3Vic3RpdHV0ZSBhIHZpZGVvXG4gIGVsZW1lbnQgd2l0aCBhIGNhbnZhcyBlbGVtZW50LiAgVGhpcyBjYW4gYmUgdXNlZnVsIHdoZW4geW91IHdhbnQgdG9cbiAgZG8gcGl4ZWwgbWFuaXB1bGF0aW9uIG9mIHRoZSByZW5kZXJlZCBpbWFnZXMsIG9yIGluIHNpdHVhdGlvbnMgd2hlblxuICBhIHZpZGVvIGVsZW1lbnQgZG9lcyBub3QgYmVoYXZlIGFzIHlvdSBleHBlY3QuXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIDw8PCBleGFtcGxlcy9ncmF5c2NhbGUtZmlsdGVyLmpzXG5cbiAgIyMgVXNpbmcgdGhlIFByb2Nlc3NpbmcgUGlwZWxpbmVcblxuICBBIHByb2Nlc3NpbmcgcGlwZWxpbmUgaGFzIGJlZW4gaW5jbHVkZWQgdG8gYXNzaXN0IHdpdGhcbiAgbWFuaXB1bGF0aW5nIHRoZSBjYW52YXMgb24gdGhlIGZseS4gVG8gc3BlY2lmeSB0aGUgZmlsdGVycyB0byBiZSB1c2VkXG4gIGluIHRoZSBwcm9jZXNzaW5nIHBpcGVsaW5lLCB0aGlzIGlzIGRvbmUgaW4gdGhlIG9wdGlvbnMgYWNjZXB0ZWQgYnlcbiAgdmlkZW9wcm9jLiBFaXRoZXIgc3BlY2lmeWluZyBhbiBhcnJheSBvZiBmaWx0ZXJzIHdpdGggdGhlIGBmaWx0ZXJzYCBvcHRpb25cbiAgb3IgYSBzaW5nbGUgZmlsdGVyIGZ1bmN0aW9uIHdpdGggdGhlIGBmaWx0ZXJgIG9wdGlvbiBpcyBmaW5lLiAgSWYgeW91IHVzZVxuICBib3RoIHRoZW4gdGhlIGluZGl2aWR1YWwgZmlsdGVyIHdpbGwgYmUgYWRkZWQgZmlsdGVyIGxpc3QgYW5kIHVzZWQgaW5cbiAgc2VyaWVzLlxuXG4gIGBgYGpzXG4gIHZpZGVvcHJvYyhzcmNWaWRlbywgdGFyZ2V0Q2FudmFzLCB7XG4gICAgZmlsdGVyczogW1xuICAgICAgcmVxdWlyZSgncnRjLWZpbHRlci1ncmF5c2NhbGUnKSxcbiAgICAgIG15Q3VzdG9tRmlsdGVyRnVuY3Rpb25cbiAgICBdXG4gIH0pO1xuICBgYGBcblxuICAjIyBXcml0aW5nIGEgRmlsdGVyIEZ1bmN0aW9uXG5cbiAgV3JpdGluZyBhIGZpbHRlciBmdW5jdGlvbiBpcyB2ZXJ5IHNpbXBsZSwgYW5kIHRoZXkgdXNlIHRoZSBmb2xsb3dpbmdcbiAgZnVuY3Rpb24gc2lnbmF0dXJlOlxuXG4gIGBgYGpzXG4gIGZ1bmN0aW9uIGZpbHRlcihpbWFnZURhdGEsIHRpY2spIHtcbiAgfVxuICBgYGBcblxuICBUaGUgYGltYWdlRGF0YWAgYXJnIGlzIGFuXG4gIFtJbWFnZURhdGFdKGh0dHA6Ly93d3cudzMub3JnL1RSLzJkY29udGV4dC8jaW1hZ2VkYXRhKSwgYW5kIHRoZSBgdGlja2BcbiAgYXJndW1lbnQgcmVmZXJzIHRvIHRoZSB0aWNrIHRoYXQgaGFzIGJlZW4gY2FwdHVyZWQgYXMgcGFydCBvZiB0aGUgY2FwdHVyZVxuICBsb29wIChiZSBhd2FyZSB0aGF0IGl0IGNvdWxkIGJlIGEgaGlnaCByZXNvbHV0aW9uIHRpbWVyIHZhbHVlIGlmIHJBRiBpc1xuICBiZWluZyB1c2VkKS5cblxuICBJZiB5b3UgYXJlIHdyaXRpbmcgYW4gYW5hbHlzaXMgZmlsdGVyLCB0aGVuIHNpbXBseSBkbyB3aGF0IHlvdSBuZWVkIHRvIGRvXG4gIGFuZCBleGl0IHRoZSBmdW5jdGlvbi4gIElmIHlvdSBoYXZlIHdyaXR0ZW4gYSBmaWx0ZXIgdGhhdCBtb2RpZmllcyB0aGUgcGl4ZWxcbiAgZGF0YSBhbmQgeW91IHdhbnQgdGhpcyBkcmF3biBiYWNrIHRvIHRoZSBjYW52YXMgdGhlbiB5b3VyICoqZmlsdGVyIG11c3RcbiAgcmV0dXJuIGB0cnVlYCoqIHRvIHRlbGwgYHJ0Yy12aWRlb3Byb2NgIHRoYXQgaXQgc2hvdWxkIGRyYXcgdGhlIGltYWdlRGF0YVxuICBiYWNrIHRvIHRoZSBjYW52YXMuXG5cbiAgIyMgTGlzdGVuaW5nIGZvciBjdXN0b20gYGZyYW1lYCBldmVudHNcblxuICBJbiBhZGRpdGlvbiB0byBwcm92aWRpbmcgdGhlIG9wcG9ydHVuaXR5IHRvIGFuYWx5c2UgYW5kIG1vZGlmeSBwaXhlbCBkYXRhXG4gIHRoZSBgcnRjLXZpZGVvcHJvY2AgbW9kdWxlIGFsc28gcHJvdmlkZXMgdGhlIGEgY3VzdG9tIGBmcmFtZWAgZXZlbnQgZm9yXG4gIGRldGVjdGluZyB3aGVuIGEgbmV3IGZyYW1lIGhhcyBiZWVuIGRyYXduIHRvIHRoZSBjYW52YXMuXG5cbiAgQSBzaW1wbGUgZXhhbXBsZSBjYW4gYmUgZm91bmQgYmVsb3c6XG5cbiAgPDw8IGV4YW1wbGVzL2ZyYW1lbGlzdGVuZXIuanNcblxuICBOT1RFOiBUaGUgYGZyYW1lYCBldmVudCBvY2N1cnMgYWZ0ZXIgdGhlIGZpbHRlciBwaXBlbGluZSBoYXMgYmVlbiBydW4gYW5kXG4gIGFuZCB0aGUgaW1hZ2VEYXRhIG1heSBoYXZlIGJlZW4gbW9kaWZpZWQgZnJvbSB0aGUgb3JpZ2luYWwgdmlkZW8gZnJhbWUuXG5cbiAgIyMgQSBOb3RlIHdpdGggUmVnYXJkcyB0byBDUFUgVXNhZ2VcblxuICBCeSBkZWZhdWx0IHJ0Yy12aWRlb3Byb2Mgd2lsbCBkcmF3IGF0IDI1ZnBzIGJ1dCB0aGlzIGNhbiBiZSBtb2RpZmllZCB0byBjYXB0dXJlXG4gIGF0IGEgbG93ZXIgZnJhbWUgcmF0ZSBmb3Igc2xvd2VyIGRldmljZXMsIG9yIGluY3JlYXNlZCBpZiB5b3UgaGF2ZSBhXG4gIG1hY2hpbmUgd2l0aCBwbGVudHkgb2YgZ3J1bnQuXG5cbiAgIyMgUmVmZXJlbmNlXG5cbiAgIyMjIHZpZGVvcHJvYyhzcmMsIHRhcmdldCwgb3B0cz8pXG5cbiAgQ3JlYXRlIChvciBwYXRjaCkgYSBgPGNhbnZhcz5gIGVsZW1lbnQgdGhhdCB3aWxsIHJlY2VpdmUgdGhlIHZpZGVvIGltYWdlc1xuICBmcm9tIGEgdmlkZW8gZWxlbWVudC4gIFRoZSBmb2xsb3dpbmcgb3B0aW9ucyBhcmUgc3VwcG9ydGVkLlxuXG4gIC0gYGNhbnZhc2AgLSB0aGUgY2FudmFzIHRvIGRyYXcgdmlkZW8gZGF0YSB0by4gIElmIG5vdCBzdXBwbGllZCBhIG5ldyBcbiAgICBjYW52YXMgZWxlbWVudCB3aWxsIGJlIGNyZWF0ZWQuXG5cbiAgLSBgdmlkZW9gIC0gdGhlIHZpZGVvIGVsZW1lbnQgdGhhdCB3aWxsIGJlIHVzZWQgYXMgdGhlIHNvdXJjZSBvZiB0aGUgdmlkZW8uXG4gICAgIElmIG5vdCBzdXBwbGllZCBhIG5ldyBgPHZpZGVvPmAgZWxlbWVudCB3aWxsIGJlIGNyZWF0ZWQuXG5cbiAgLSBgZnBzYCAtIHRoZSByZWRyYXcgcmF0ZSBvZiB0aGUgZmFrZSB2aWRlbyAoZGVmYXVsdCA9IDI1KVxuXG4gIC0gYGdyZWVkeWAgLSBTcGVjaWZ5IGBncmVlZHk6IHRydWVgIGlmIHlvdSB3YW50IHRoZSB2aWRlb3Byb2MgbW9kdWxlIHRvIHJ1blxuICAgIGl0J3MgY2FwdHVyZSBsb29wIHVzaW5nIHNldFRpbWVvdXQgcmF0aGVyIHRoYW4gYHJlcXVlc3RBbmltYXRpb25GcmFtZWAuXG4gICAgRG9pbmcgdGhpcyB3aWxsIG1lYW4geW91IGFwcGxpY2F0aW9uIHdpbGwgY29udGludWUgdG8gY2FwdHVyZSBhbmQgcHJvY2Vzc1xuICAgIGZyYW1lcyBldmVuIHdoZW4gaXQncyB0YWIgLyB3aW5kb3cgYmVjb21lcyBpbmFjdGl2ZS4gVGhpcyBpcyB1c3VhbGx5IHRoZVxuICAgIGRlc2lyZWQgYmVoYXZpb3VyIHdpdGggdmlkZW8gY29uZmVyZW5jaW5nIGFwcGxpY2F0aW9ucy5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNyYywgdGFyZ2V0LCBvcHRzKSB7XG4gIC8vIGNoZWNrIGZvciBhIHZhbGlkIHNvdXJjZVxuICB2YXIgdmFsaWRTb3VyY2UgPSB0eXBlb2Ygc3JjICE9ICd1bmRlZmluZWQnOyAvLyBUT0RPOiBiZXR0ZXIgY2hlY2tcbiAgdmFyIHJlc2l6ZUNhbnZhcyA9IGZhbHNlO1xuICB2YXIgZnBzO1xuICB2YXIgZ3JlZWR5O1xuICB2YXIgZ3JlZWR5RGVsYXk7XG4gIHZhciBkcmF3RGVsYXk7XG5cbiAgLy8gY3JlYXRlIGFuIGV2ZW50IGVtaXR0ZXIgZm9yIHRoZSBwcm9jZXNzb3Igb2JqZWN0XG4gIHZhciBwcm9jZXNzb3IgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbiAgLy8gY2hlY2sgZm9yIG5vIHRhcmdldCBidXQgb3B0cyBzdXBwbGllZFxuICB2YXIgc2hpZnRBcmdzID0gKCEgb3B0cykgJiYgKCEgdGFyZ2V0KSB8fFxuICAgICh0eXBlb2YgdGFyZ2V0ID09ICdvYmplY3QnICYmIHR5cGVvZiB0YXJnZXQuZ2V0Q29udGV4dCAhPSAnZnVuY3Rpb24nKTtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBkcmF3IG1ldGFkYXRhXG4gIHZhciBkcmF3V2lkdGg7XG4gIHZhciBkcmF3SGVpZ2h0O1xuICB2YXIgZHJhd1ggPSAwO1xuICB2YXIgZHJhd1kgPSAwO1xuICB2YXIgZHJhd0RhdGE7XG4gIHZhciBsYXN0VGljayA9IDA7XG4gIHZhciBzb3VyY2VNb25pdG9yVGltZXIgPSAwO1xuICB2YXIgY29udGV4dDtcblxuICBmdW5jdGlvbiBzeW5jQ2FudmFzKCkge1xuICAgIHRhcmdldC53aWR0aCA9IHNyYy52aWRlb1dpZHRoO1xuICAgIHRhcmdldC5oZWlnaHQgPSBzcmMudmlkZW9IZWlnaHQ7XG4gICAgY2FsY3VsYXRlRHJhd1JlZ2lvbigpO1xuICB9XG5cbiAgZnVuY3Rpb24gY2FsY3VsYXRlRHJhd1JlZ2lvbigpIHtcbiAgICB2YXIgc2NhbGU7XG4gICAgdmFyIHNjYWxlWDtcbiAgICB2YXIgc2NhbGVZO1xuXG4gICAgLy8gaWYgZWl0aGVyIHdpZHRoIG9yIGhlaWdodCA9PT0gMCB0aGVuIGJhaWxcbiAgICBpZiAodGFyZ2V0LndpZHRoID09PSAwIHx8IHRhcmdldC5oZWlnaHQgPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBjYWxjdWxhdGUgcmVxdWlyZWQgc2NhbGluZ1xuICAgIHNjYWxlID0gTWF0aC5taW4oXG4gICAgICBzY2FsZVggPSAodGFyZ2V0LndpZHRoIC8gc3JjLnZpZGVvV2lkdGgpLFxuICAgICAgc2NhbGVZID0gKHRhcmdldC5oZWlnaHQgLyBzcmMudmlkZW9IZWlnaHQpXG4gICAgKTtcblxuICAgIC8vIGNhbGN1bGF0ZSB0aGUgc2NhbGVkIGRyYXcgd2lkdGggYW5kIGhlaWdodFxuICAgIGRyYXdXaWR0aCA9IChzcmMudmlkZW9XaWR0aCAqIHNjYWxlKSB8IDA7XG4gICAgZHJhd0hlaWdodCA9IChzcmMudmlkZW9IZWlnaHQgKiBzY2FsZSkgfCAwO1xuXG4gICAgLy8gY2FsY3VsYXRlIHRoZSBvZmZzZXRYIGFuZCBZXG4gICAgZHJhd1ggPSAodGFyZ2V0LndpZHRoIC0gZHJhd1dpZHRoKSA+PiAxO1xuICAgIGRyYXdZID0gKHRhcmdldC5oZWlnaHQgLSBkcmF3SGVpZ2h0KSA+PiAxO1xuXG4gICAgLy8gc2F2ZSB0aGUgZHJhdyBkYXRhXG4gICAgZHJhd0RhdGEgPSB7XG4gICAgICB4OiBkcmF3WCxcbiAgICAgIHk6IGRyYXdZLFxuICAgICAgd2lkdGg6IGRyYXdXaWR0aCxcbiAgICAgIGhlaWdodDogZHJhd0hlaWdodFxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBtb25pdG9yU291cmNlKCkge1xuICAgIGNsZWFySW50ZXJ2YWwoc291cmNlTW9uaXRvclRpbWVyKTtcbiAgICBzb3VyY2VNb25pdG9yVGltZXIgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgIGlmIChzcmMudmlkZW9XaWR0aCA+IDAgJiYgc3JjLnZpZGVvSGVpZ2h0ID4gMCkge1xuICAgICAgICBjbGVhckludGVydmFsKHNvdXJjZU1vbml0b3JUaW1lcik7XG4gICAgICAgIHN5bmNDYW52YXMoKTtcbiAgICAgIH1cbiAgICB9LCAxMDApO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVkcmF3KHRpY2spIHtcbiAgICB2YXIgaW1hZ2VEYXRhO1xuICAgIHZhciB0d2Vha2VkO1xuICAgIHZhciBldnQ7XG4gICAgdmFyIHBvc3RQcm9jZXNzRXZ0O1xuICAgIHZhciB0d2Vha2VkID0gZmFsc2U7XG4gICAgdmFyIGZyYW1lTGlzdGVuZXJzID0gcHJvY2Vzc29yLmxpc3RlbmVycygnZnJhbWUnKS5sZW5ndGg7XG5cbiAgICAvLyBnZXQgdGhlIGN1cnJlbnQgdGlja1xuICAgIHRpY2sgPSB0aWNrIHx8IERhdGUubm93KCk7XG5cbiAgICAvLyBvbmx5IGRyYXcgYXMgb2Z0ZW4gYXMgc3BlY2lmaWVkIGluIHRoZSBmcHNcbiAgICBpZiAoZHJhd1dpZHRoICYmIGRyYXdIZWlnaHQgJiYgdGljayAtIGxhc3RUaWNrID4gZHJhd0RlbGF5KSB7XG4gICAgICAvLyBkcmF3IHRoZSBpbWFnZVxuICAgICAgY29udGV4dC5kcmF3SW1hZ2Uoc3JjLCBkcmF3WCwgZHJhd1ksIGRyYXdXaWR0aCwgZHJhd0hlaWdodCk7XG5cbiAgICAgIC8vIGlmIHdlIGhhdmUgcHJvY2Vzc29ycywgZ2V0IHRoZSBpbWFnZSBkYXRhIGFuZCBwYXNzIGl0IHRocm91Z2hcbiAgICAgIGlmIChwcm9jZXNzb3IuZmlsdGVycy5sZW5ndGgpIHtcbiAgICAgICAgdHdlYWtlZCA9IGZhbHNlO1xuICAgICAgICBpbWFnZURhdGEgPSBjb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCBkcmF3V2lkdGgsIGRyYXdIZWlnaHQpO1xuXG4gICAgICAgIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgcHJvY2Vzc29yc1xuICAgICAgICBwcm9jZXNzb3IuZmlsdGVycy5mb3JFYWNoKGZ1bmN0aW9uKGZpbHRlcikge1xuICAgICAgICAgIHR3ZWFrZWQgPSBmaWx0ZXIoaW1hZ2VEYXRhLCB0aWNrLCBjb250ZXh0LCB0YXJnZXQsIGRyYXdEYXRhKSB8fCB0d2Vha2VkO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAodHdlYWtlZCkge1xuICAgICAgICAgIC8vIFRPRE86IGRpcnR5IGFyZWFcbiAgICAgICAgICBjb250ZXh0LnB1dEltYWdlRGF0YShpbWFnZURhdGEsIDAsIDApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHVwZGF0ZSB0aGUgcHJvY2Vzc29yIGltYWdlRGF0YVxuICAgICAgcHJvY2Vzc29yLmltYWdlRGF0YSA9IGltYWdlRGF0YTtcblxuICAgICAgLy8gZW1pdCB0aGUgcHJvY2Vzc29yIGZyYW1lIGV2ZW50XG4gICAgICBwcm9jZXNzb3IuZW1pdCgnZnJhbWUnLCB0aWNrKTtcblxuICAgICAgLy8gdXBkYXRlIHRoZSBsYXN0IHRpY2tcbiAgICAgIGxhc3RUaWNrID0gdGljaztcbiAgICB9XG5cbiAgICAvLyBxdWV1ZSB1cCBhbm90aGVyIHJlZHJhd1xuICAgIGlmIChncmVlZHkpIHtcbiAgICAgIHNldFRpbWVvdXQocmVkcmF3LCBncmVlZHlEZWxheSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcmFmKHJlZHJhdyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHNoaWZ0QXJncykge1xuICAgIG9wdHMgPSB0YXJnZXQ7XG4gICAgdGFyZ2V0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gIH1cblxuICAvLyBzYXZlIHRoZSB0YXJnZXQgdG8gdGhlIGNhbnZhcyBwcm9wZXJ0eSBvZiB0aGUgcHJvY2Vzc29yXG4gIHByb2Nlc3Nvci5jYW52YXMgPSB0YXJnZXQ7XG4gIGNvbnRleHQgPSBwcm9jZXNzb3IuY29udGV4dCA9IHRhcmdldC5nZXRDb250ZXh0KCcyZCcpO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIGZwc1xuICBmcHMgPSAob3B0cyB8fCB7fSkuZnBzIHx8IERFRkFVTFRfRlBTO1xuICBncmVlZHkgPSAob3B0cyB8fCB7fSkuZ3JlZWR5O1xuXG4gIC8vIHNldFRpbWVvdXQgc2hvdWxkIG9jY3VyIG1vcmUgZnJlcXVlbnRseSB0aGFuIHRoZSBmcHNcbiAgLy8gZGVsYXkgc28gd2UgZ2V0IGNsb3NlIHRvIHRoZSBkZXNpcmVkIGZwc1xuICBncmVlZHlEZWxheSA9ICgxMDAwIC8gZnBzKSA+PiAxO1xuXG4gIC8vIGNhbGFjdWxhdGUgdGhlIGRyYXcgZGVsYXksIGNsYW1wIGFzIGludFxuICBkcmF3RGVsYXkgPSAoMTAwMCAvIGZwcykgfCAwO1xuXG4gIC8vIGRldGVybWluZSB3aGV0aGVyIHdlIHNob3VsZCByZXNpemUgdGhlIGNhbnZhcyBvciBub3RcbiAgcmVzaXplQ2FudmFzID0gdGFyZ2V0LndpZHRoID09PSAwIHx8IHRhcmdldC5oZWlnaHQgPT09IDA7XG5cbiAgLy8gaWYgd2UndmUgYmVlbiBwcm92aWRlZCBhIGZpbHRlcnMgYXJyYXkgaW4gb3B0aW9ucyBpbml0aWFsaXNlIHRoZSBmaWx0ZXJzXG4gIC8vIHdpdGggdGhvc2UgZnVuY3Rpb25zXG4gIHByb2Nlc3Nvci5maWx0ZXJzID0gKChvcHRzIHx8IHt9KS5maWx0ZXJzIHx8IFtdKS5maWx0ZXIoZnVuY3Rpb24oZmlsdGVyKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBmaWx0ZXIgPT0gJ2Z1bmN0aW9uJztcbiAgfSk7XG5cbiAgLy8gaWYgYSAnZmlsdGVyJyBvcHRpb24gaGFzIGJlZW4gcHJvdmlkZWQsIHRoZW4gYXBwZW5kIHRvIHRoZSBmaWx0ZXJzIGFycmF5XG4gIGlmIChvcHRzICYmIHR5cGVvZiBvcHRzLmZpbHRlciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgcHJvY2Vzc29yLmZpbHRlcnMucHVzaChvcHRzLmZpbHRlcik7XG4gIH1cblxuICAvLyBpZiB3ZSBhcmUgcmVzaXppbmcgdGhlIGNhbnZhcywgdGhlbiBhcyB0aGUgdmlkZW8gbWV0YWRhdGEgY2hhbmdlc1xuICAvLyByZXN5bmMgdGhlIGNhbnZhc1xuICBzcmMuYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVkbWV0YWRhdGEnLCBtb25pdG9yU291cmNlKTtcbiAgc3JjLmFkZEV2ZW50TGlzdGVuZXIoJ2NhbnBsYXknLCBtb25pdG9yU291cmNlKTtcblxuICAvLyBjYWxjdWxhdGUgdGhlIGluaXRpYWwgZHJhdyBtZXRhZGF0YSAod2lsbCBiZSByZWNhbGN1bGF0ZWQgb24gdmlkZW8gc3RyZWFtIGNoYW5nZXMpXG4gIGNhbGN1bGF0ZURyYXdSZWdpb24oKTtcblxuICAvLyBzdGFydCB0aGUgcmVkcmF3XG4gIHJhZihyZWRyYXcpO1xuXG4gIHJldHVybiBwcm9jZXNzb3I7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgd2luZG93OiBmYWxzZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVEVTVF9QUk9QUyA9IFsncicsICd3ZWJraXRSJywgJ21velInLCAnb1InLCAnbXNSJ107XG5cbi8qKlxuICAjIyMgcmFmKGNhbGxiYWNrKVxuXG4gIFJlcXVlc3QgYW5pbWF0aW9uIGZyYW1lIGhlbHBlci5cblxuICA8PDwgZXhhbXBsZXMvcmFmLmpzXG5cbioqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcgJiYgKGZ1bmN0aW9uKCkge1xuICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgVEVTVF9QUk9QUy5sZW5ndGg7IGlpKyspIHtcbiAgICB3aW5kb3cuYW5pbUZyYW1lID0gd2luZG93LmFuaW1GcmFtZSB8fFxuICAgICAgd2luZG93W1RFU1RfUFJPUFNbaWldICsgJ2VxdWVzdEFuaW1hdGlvbkZyYW1lJ107XG4gIH0gLy8gZm9yXG5cbiAgcmV0dXJuIGFuaW1GcmFtZTtcbn0pKCk7Il19
