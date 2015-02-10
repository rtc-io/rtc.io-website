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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5udm0vdjAuMTAuMzMvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi8uLi8ubnZtL3YwLjEwLjMzL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsImNvZGUvc2ltcGxlLW1hbmlwdWxhdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9jb2cvZXh0ZW5kLmpzIiwibm9kZV9tb2R1bGVzL2NyZWwvY3JlbC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtY29yZS9kZXRlY3QuanMiLCJub2RlX21vZHVsZXMvcnRjLWNvcmUvbm9kZV9tb2R1bGVzL2RldGVjdC1icm93c2VyL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvcnRjLWNvcmUvcGx1Z2luLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1maWx0ZXItZ3JheXNjYWxlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1tZWRpYS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtbWVkaWEvbm9kZV9tb2R1bGVzL3J0Yy1hdHRhY2gvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLW1lZGlhL25vZGVfbW9kdWxlcy9ydGMtY2FwdHVyZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtdmlkZW9wcm9jL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy12aWRlb3Byb2Mvbm9kZV9tb2R1bGVzL2Zkb20vcmFmLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25SQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsInZhciBjcmVsID0gcmVxdWlyZSgnY3JlbCcpO1xudmFyIG1lZGlhID0gcmVxdWlyZSgncnRjLW1lZGlhJyk7XG52YXIgdmlkZW9wcm9jID0gcmVxdWlyZSgncnRjLXZpZGVvcHJvYycpO1xudmFyIHZpZGVvID0gY3JlbCgndmlkZW8nKTtcbnZhciBjYW52YXMgPSBjcmVsKCdjYW52YXMnKTtcblxuLy8gc2V0IHVwIHRoZSB2aWRlbyBwcm9jZXNzaW5nXG52aWRlb3Byb2ModmlkZW8sIGNhbnZhcywge1xuICBmaWx0ZXI6IHJlcXVpcmUoJ3J0Yy1maWx0ZXItZ3JheXNjYWxlJylcbn0pO1xuXG4vLyBjYXB0dXJlIGFuZCByZW5kZXIgdGhlIHZpZGVvXG5tZWRpYSgpLnJlbmRlcih2aWRlbyk7XG5cbi8vIGFkZCB0aGUgY2FudmFzIHRvIHRoZSBkb2N1bWVudCBib2R5XG5kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGNhbnZhcyk7IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4jIyBjb2cvZXh0ZW5kXG5cbmBgYGpzXG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xuYGBgXG5cbiMjIyBleHRlbmQodGFyZ2V0LCAqKVxuXG5TaGFsbG93IGNvcHkgb2JqZWN0IHByb3BlcnRpZXMgZnJvbSB0aGUgc3VwcGxpZWQgc291cmNlIG9iamVjdHMgKCopIGludG9cbnRoZSB0YXJnZXQgb2JqZWN0LCByZXR1cm5pbmcgdGhlIHRhcmdldCBvYmplY3Qgb25jZSBjb21wbGV0ZWQ6XG5cbmBgYGpzXG5leHRlbmQoeyBhOiAxLCBiOiAyIH0sIHsgYzogMyB9LCB7IGQ6IDQgfSwgeyBiOiA1IH0pKTtcbmBgYFxuXG5TZWUgYW4gZXhhbXBsZSBvbiBbcmVxdWlyZWJpbl0oaHR0cDovL3JlcXVpcmViaW4uY29tLz9naXN0PTYwNzk0NzUpLlxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkuZm9yRWFjaChmdW5jdGlvbihzb3VyY2UpIHtcbiAgICBpZiAoISBzb3VyY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgdGFyZ2V0W3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHRhcmdldDtcbn07IiwiLy9Db3B5cmlnaHQgKEMpIDIwMTIgS29yeSBOdW5uXHJcblxyXG4vL1Blcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XHJcblxyXG4vL1RoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxyXG5cclxuLy9USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cclxuXHJcbi8qXHJcblxyXG4gICAgVGhpcyBjb2RlIGlzIG5vdCBmb3JtYXR0ZWQgZm9yIHJlYWRhYmlsaXR5LCBidXQgcmF0aGVyIHJ1bi1zcGVlZCBhbmQgdG8gYXNzaXN0IGNvbXBpbGVycy5cclxuXHJcbiAgICBIb3dldmVyLCB0aGUgY29kZSdzIGludGVudGlvbiBzaG91bGQgYmUgdHJhbnNwYXJlbnQuXHJcblxyXG4gICAgKioqIElFIFNVUFBPUlQgKioqXHJcblxyXG4gICAgSWYgeW91IHJlcXVpcmUgdGhpcyBsaWJyYXJ5IHRvIHdvcmsgaW4gSUU3LCBhZGQgdGhlIGZvbGxvd2luZyBhZnRlciBkZWNsYXJpbmcgY3JlbC5cclxuXHJcbiAgICB2YXIgdGVzdERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLFxyXG4gICAgICAgIHRlc3RMYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xhYmVsJyk7XHJcblxyXG4gICAgdGVzdERpdi5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2EnKTtcclxuICAgIHRlc3REaXZbJ2NsYXNzTmFtZSddICE9PSAnYScgPyBjcmVsLmF0dHJNYXBbJ2NsYXNzJ10gPSAnY2xhc3NOYW1lJzp1bmRlZmluZWQ7XHJcbiAgICB0ZXN0RGl2LnNldEF0dHJpYnV0ZSgnbmFtZScsJ2EnKTtcclxuICAgIHRlc3REaXZbJ25hbWUnXSAhPT0gJ2EnID8gY3JlbC5hdHRyTWFwWyduYW1lJ10gPSBmdW5jdGlvbihlbGVtZW50LCB2YWx1ZSl7XHJcbiAgICAgICAgZWxlbWVudC5pZCA9IHZhbHVlO1xyXG4gICAgfTp1bmRlZmluZWQ7XHJcblxyXG5cclxuICAgIHRlc3RMYWJlbC5zZXRBdHRyaWJ1dGUoJ2ZvcicsICdhJyk7XHJcbiAgICB0ZXN0TGFiZWxbJ2h0bWxGb3InXSAhPT0gJ2EnID8gY3JlbC5hdHRyTWFwWydmb3InXSA9ICdodG1sRm9yJzp1bmRlZmluZWQ7XHJcblxyXG5cclxuXHJcbiovXHJcblxyXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcclxuICAgIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAgICAgZGVmaW5lKGZhY3RvcnkpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByb290LmNyZWwgPSBmYWN0b3J5KCk7XHJcbiAgICB9XHJcbn0odGhpcywgZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGZuID0gJ2Z1bmN0aW9uJyxcclxuICAgICAgICBvYmogPSAnb2JqZWN0JyxcclxuICAgICAgICBub2RlVHlwZSA9ICdub2RlVHlwZScsXHJcbiAgICAgICAgdGV4dENvbnRlbnQgPSAndGV4dENvbnRlbnQnLFxyXG4gICAgICAgIHNldEF0dHJpYnV0ZSA9ICdzZXRBdHRyaWJ1dGUnLFxyXG4gICAgICAgIGF0dHJNYXBTdHJpbmcgPSAnYXR0ck1hcCcsXHJcbiAgICAgICAgaXNOb2RlU3RyaW5nID0gJ2lzTm9kZScsXHJcbiAgICAgICAgaXNFbGVtZW50U3RyaW5nID0gJ2lzRWxlbWVudCcsXHJcbiAgICAgICAgZCA9IHR5cGVvZiBkb2N1bWVudCA9PT0gb2JqID8gZG9jdW1lbnQgOiB7fSxcclxuICAgICAgICBpc1R5cGUgPSBmdW5jdGlvbihhLCB0eXBlKXtcclxuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBhID09PSB0eXBlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaXNOb2RlID0gdHlwZW9mIE5vZGUgPT09IGZuID8gZnVuY3Rpb24gKG9iamVjdCkge1xyXG4gICAgICAgICAgICByZXR1cm4gb2JqZWN0IGluc3RhbmNlb2YgTm9kZTtcclxuICAgICAgICB9IDpcclxuICAgICAgICAvLyBpbiBJRSA8PSA4IE5vZGUgaXMgYW4gb2JqZWN0LCBvYnZpb3VzbHkuLlxyXG4gICAgICAgIGZ1bmN0aW9uKG9iamVjdCl7XHJcbiAgICAgICAgICAgIHJldHVybiBvYmplY3QgJiZcclxuICAgICAgICAgICAgICAgIGlzVHlwZShvYmplY3QsIG9iaikgJiZcclxuICAgICAgICAgICAgICAgIChub2RlVHlwZSBpbiBvYmplY3QpICYmXHJcbiAgICAgICAgICAgICAgICBpc1R5cGUob2JqZWN0Lm93bmVyRG9jdW1lbnQsb2JqKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGlzRWxlbWVudCA9IGZ1bmN0aW9uIChvYmplY3QpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGNyZWxbaXNOb2RlU3RyaW5nXShvYmplY3QpICYmIG9iamVjdFtub2RlVHlwZV0gPT09IDE7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc0FycmF5ID0gZnVuY3Rpb24oYSl7XHJcbiAgICAgICAgICAgIHJldHVybiBhIGluc3RhbmNlb2YgQXJyYXk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBhcHBlbmRDaGlsZCA9IGZ1bmN0aW9uKGVsZW1lbnQsIGNoaWxkKSB7XHJcbiAgICAgICAgICBpZighY3JlbFtpc05vZGVTdHJpbmddKGNoaWxkKSl7XHJcbiAgICAgICAgICAgICAgY2hpbGQgPSBkLmNyZWF0ZVRleHROb2RlKGNoaWxkKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQoY2hpbGQpO1xyXG4gICAgICAgIH07XHJcblxyXG5cclxuICAgIGZ1bmN0aW9uIGNyZWwoKXtcclxuICAgICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cywgLy9Ob3RlOiBhc3NpZ25lZCB0byBhIHZhcmlhYmxlIHRvIGFzc2lzdCBjb21waWxlcnMuIFNhdmVzIGFib3V0IDQwIGJ5dGVzIGluIGNsb3N1cmUgY29tcGlsZXIuIEhhcyBuZWdsaWdhYmxlIGVmZmVjdCBvbiBwZXJmb3JtYW5jZS5cclxuICAgICAgICAgICAgZWxlbWVudCA9IGFyZ3NbMF0sXHJcbiAgICAgICAgICAgIGNoaWxkLFxyXG4gICAgICAgICAgICBzZXR0aW5ncyA9IGFyZ3NbMV0sXHJcbiAgICAgICAgICAgIGNoaWxkSW5kZXggPSAyLFxyXG4gICAgICAgICAgICBhcmd1bWVudHNMZW5ndGggPSBhcmdzLmxlbmd0aCxcclxuICAgICAgICAgICAgYXR0cmlidXRlTWFwID0gY3JlbFthdHRyTWFwU3RyaW5nXTtcclxuXHJcbiAgICAgICAgZWxlbWVudCA9IGNyZWxbaXNFbGVtZW50U3RyaW5nXShlbGVtZW50KSA/IGVsZW1lbnQgOiBkLmNyZWF0ZUVsZW1lbnQoZWxlbWVudCk7XHJcbiAgICAgICAgLy8gc2hvcnRjdXRcclxuICAgICAgICBpZihhcmd1bWVudHNMZW5ndGggPT09IDEpe1xyXG4gICAgICAgICAgICByZXR1cm4gZWxlbWVudDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKCFpc1R5cGUoc2V0dGluZ3Msb2JqKSB8fCBjcmVsW2lzTm9kZVN0cmluZ10oc2V0dGluZ3MpIHx8IGlzQXJyYXkoc2V0dGluZ3MpKSB7XHJcbiAgICAgICAgICAgIC0tY2hpbGRJbmRleDtcclxuICAgICAgICAgICAgc2V0dGluZ3MgPSBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gc2hvcnRjdXQgaWYgdGhlcmUgaXMgb25seSBvbmUgY2hpbGQgdGhhdCBpcyBhIHN0cmluZ1xyXG4gICAgICAgIGlmKChhcmd1bWVudHNMZW5ndGggLSBjaGlsZEluZGV4KSA9PT0gMSAmJiBpc1R5cGUoYXJnc1tjaGlsZEluZGV4XSwgJ3N0cmluZycpICYmIGVsZW1lbnRbdGV4dENvbnRlbnRdICE9PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgICBlbGVtZW50W3RleHRDb250ZW50XSA9IGFyZ3NbY2hpbGRJbmRleF07XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIGZvcig7IGNoaWxkSW5kZXggPCBhcmd1bWVudHNMZW5ndGg7ICsrY2hpbGRJbmRleCl7XHJcbiAgICAgICAgICAgICAgICBjaGlsZCA9IGFyZ3NbY2hpbGRJbmRleF07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoY2hpbGQgPT0gbnVsbCl7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGlzQXJyYXkoY2hpbGQpKSB7XHJcbiAgICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IGNoaWxkLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXBwZW5kQ2hpbGQoZWxlbWVudCwgY2hpbGRbaV0pO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICBhcHBlbmRDaGlsZChlbGVtZW50LCBjaGlsZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvcih2YXIga2V5IGluIHNldHRpbmdzKXtcclxuICAgICAgICAgICAgaWYoIWF0dHJpYnV0ZU1hcFtrZXldKXtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnRbc2V0QXR0cmlidXRlXShrZXksIHNldHRpbmdzW2tleV0pO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHZhciBhdHRyID0gYXR0cmlidXRlTWFwW2tleV07XHJcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgYXR0ciA9PT0gZm4pe1xyXG4gICAgICAgICAgICAgICAgICAgIGF0dHIoZWxlbWVudCwgc2V0dGluZ3Nba2V5XSk7XHJcbiAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50W3NldEF0dHJpYnV0ZV0oYXR0ciwgc2V0dGluZ3Nba2V5XSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBlbGVtZW50O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFVzZWQgZm9yIG1hcHBpbmcgb25lIGtpbmQgb2YgYXR0cmlidXRlIHRvIHRoZSBzdXBwb3J0ZWQgdmVyc2lvbiBvZiB0aGF0IGluIGJhZCBicm93c2Vycy5cclxuICAgIGNyZWxbYXR0ck1hcFN0cmluZ10gPSB7fTtcclxuXHJcbiAgICBjcmVsW2lzRWxlbWVudFN0cmluZ10gPSBpc0VsZW1lbnQ7XHJcblxyXG4gICAgY3JlbFtpc05vZGVTdHJpbmddID0gaXNOb2RlO1xyXG5cclxuICAgIHJldHVybiBjcmVsO1xyXG59KSk7XHJcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgd2luZG93OiBmYWxzZSAqL1xuLyogZ2xvYmFsIG5hdmlnYXRvcjogZmFsc2UgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgYnJvd3NlciA9IHJlcXVpcmUoJ2RldGVjdC1icm93c2VyJyk7XG5cbi8qKlxuICAjIyMgYHJ0Yy1jb3JlL2RldGVjdGBcblxuICBBIGJyb3dzZXIgZGV0ZWN0aW9uIGhlbHBlciBmb3IgYWNjZXNzaW5nIHByZWZpeC1mcmVlIHZlcnNpb25zIG9mIHRoZSB2YXJpb3VzXG4gIFdlYlJUQyB0eXBlcy5cblxuICAjIyMgRXhhbXBsZSBVc2FnZVxuXG4gIElmIHlvdSB3YW50ZWQgdG8gZ2V0IHRoZSBuYXRpdmUgYFJUQ1BlZXJDb25uZWN0aW9uYCBwcm90b3R5cGUgaW4gYW55IGJyb3dzZXJcbiAgeW91IGNvdWxkIGRvIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBganNcbiAgdmFyIGRldGVjdCA9IHJlcXVpcmUoJ3J0Yy1jb3JlL2RldGVjdCcpOyAvLyBhbHNvIGF2YWlsYWJsZSBpbiBydGMvZGV0ZWN0XG4gIHZhciBSVENQZWVyQ29ubmVjdGlvbiA9IGRldGVjdCgnUlRDUGVlckNvbm5lY3Rpb24nKTtcbiAgYGBgXG5cbiAgVGhpcyB3b3VsZCBwcm92aWRlIHdoYXRldmVyIHRoZSBicm93c2VyIHByZWZpeGVkIHZlcnNpb24gb2YgdGhlXG4gIFJUQ1BlZXJDb25uZWN0aW9uIGlzIGF2YWlsYWJsZSAoYHdlYmtpdFJUQ1BlZXJDb25uZWN0aW9uYCxcbiAgYG1velJUQ1BlZXJDb25uZWN0aW9uYCwgZXRjKS5cbioqL1xudmFyIGRldGVjdCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGFyZ2V0LCBvcHRzKSB7XG4gIHZhciBhdHRhY2ggPSAob3B0cyB8fCB7fSkuYXR0YWNoO1xuICB2YXIgcHJlZml4SWR4O1xuICB2YXIgcHJlZml4O1xuICB2YXIgdGVzdE5hbWU7XG4gIHZhciBob3N0T2JqZWN0ID0gdGhpcyB8fCAodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHVuZGVmaW5lZCk7XG5cbiAgLy8gaW5pdGlhbGlzZSB0byBkZWZhdWx0IHByZWZpeGVzXG4gIC8vIChyZXZlcnNlIG9yZGVyIGFzIHdlIHVzZSBhIGRlY3JlbWVudGluZyBmb3IgbG9vcClcbiAgdmFyIHByZWZpeGVzID0gKChvcHRzIHx8IHt9KS5wcmVmaXhlcyB8fCBbJ21zJywgJ28nLCAnbW96JywgJ3dlYmtpdCddKS5jb25jYXQoJycpO1xuXG4gIC8vIGlmIHdlIGhhdmUgbm8gaG9zdCBvYmplY3QsIHRoZW4gYWJvcnRcbiAgaWYgKCEgaG9zdE9iamVjdCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgcHJlZml4ZXMgYW5kIHJldHVybiB0aGUgY2xhc3MgaWYgZm91bmQgaW4gZ2xvYmFsXG4gIGZvciAocHJlZml4SWR4ID0gcHJlZml4ZXMubGVuZ3RoOyBwcmVmaXhJZHgtLTsgKSB7XG4gICAgcHJlZml4ID0gcHJlZml4ZXNbcHJlZml4SWR4XTtcblxuICAgIC8vIGNvbnN0cnVjdCB0aGUgdGVzdCBjbGFzcyBuYW1lXG4gICAgLy8gaWYgd2UgaGF2ZSBhIHByZWZpeCBlbnN1cmUgdGhlIHRhcmdldCBoYXMgYW4gdXBwZXJjYXNlIGZpcnN0IGNoYXJhY3RlclxuICAgIC8vIHN1Y2ggdGhhdCBhIHRlc3QgZm9yIGdldFVzZXJNZWRpYSB3b3VsZCByZXN1bHQgaW4gYVxuICAgIC8vIHNlYXJjaCBmb3Igd2Via2l0R2V0VXNlck1lZGlhXG4gICAgdGVzdE5hbWUgPSBwcmVmaXggKyAocHJlZml4ID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB0YXJnZXQuc2xpY2UoMSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldCk7XG5cbiAgICBpZiAodHlwZW9mIGhvc3RPYmplY3RbdGVzdE5hbWVdICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAvLyB1cGRhdGUgdGhlIGxhc3QgdXNlZCBwcmVmaXhcbiAgICAgIGRldGVjdC5icm93c2VyID0gZGV0ZWN0LmJyb3dzZXIgfHwgcHJlZml4LnRvTG93ZXJDYXNlKCk7XG5cbiAgICAgIGlmIChhdHRhY2gpIHtcbiAgICAgICAgIGhvc3RPYmplY3RbdGFyZ2V0XSA9IGhvc3RPYmplY3RbdGVzdE5hbWVdO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gaG9zdE9iamVjdFt0ZXN0TmFtZV07XG4gICAgfVxuICB9XG59O1xuXG4vLyBkZXRlY3QgbW96aWxsYSAoeWVzLCB0aGlzIGZlZWxzIGRpcnR5KVxuZGV0ZWN0Lm1veiA9IHR5cGVvZiBuYXZpZ2F0b3IgIT0gJ3VuZGVmaW5lZCcgJiYgISFuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhO1xuXG4vLyBzZXQgdGhlIGJyb3dzZXIgYW5kIGJyb3dzZXIgdmVyc2lvblxuZGV0ZWN0LmJyb3dzZXIgPSBicm93c2VyLm5hbWU7XG5kZXRlY3QuYnJvd3NlclZlcnNpb24gPSBkZXRlY3QudmVyc2lvbiA9IGJyb3dzZXIudmVyc2lvbjtcbiIsInZhciBicm93c2VycyA9IFtcbiAgWyAnY2hyb21lJywgL0Nocm9tKD86ZXxpdW0pXFwvKFswLTlcXC5dKykoOj9cXHN8JCkvIF0sXG4gIFsgJ2ZpcmVmb3gnLCAvRmlyZWZveFxcLyhbMC05XFwuXSspKD86XFxzfCQpLyBdLFxuICBbICdvcGVyYScsIC9PcGVyYVxcLyhbMC05XFwuXSspKD86XFxzfCQpLyBdLFxuICBbICdpZScsIC9UcmlkZW50XFwvN1xcLjAuKnJ2XFw6KFswLTlcXC5dKylcXCkuKkdlY2tvJC8gXSxcbiAgWyAnaWUnLCAvTVNJRVxccyhbMC05XFwuXSspOy4qVHJpZGVudFxcL1s0LTddLjAvIF0sXG4gIFsgJ2llJywgL01TSUVcXHMoN1xcLjApLyBdLFxuICBbICdiYjEwJywgL0JCMTA7XFxzVG91Y2guKlZlcnNpb25cXC8oWzAtOVxcLl0rKS8gXSxcbiAgWyAnYW5kcm9pZCcsIC9BbmRyb2lkXFxzKFswLTlcXC5dKykvIF0sXG4gIFsgJ2lvcycsIC9pUGFkXFw7XFxzQ1BVXFxzT1NcXHMoWzAtOVxcLl9dKykvIF0sXG4gIFsgJ2lvcycsICAvaVBob25lXFw7XFxzQ1BVXFxzaVBob25lXFxzT1NcXHMoWzAtOVxcLl9dKykvIF0sXG4gIFsgJ3NhZmFyaScsIC9TYWZhcmlcXC8oWzAtOVxcLl9dKykvIF1cbl07XG5cbnZhciBtYXRjaCA9IGJyb3dzZXJzLm1hcChtYXRjaCkuZmlsdGVyKGlzTWF0Y2gpWzBdO1xudmFyIHBhcnRzID0gbWF0Y2ggJiYgbWF0Y2hbM10uc3BsaXQoL1suX10vKS5zbGljZSgwLDMpO1xuXG53aGlsZSAocGFydHMgJiYgcGFydHMubGVuZ3RoIDwgMykge1xuICBwYXJ0cy5wdXNoKCcwJyk7XG59XG5cbi8vIHNldCB0aGUgbmFtZSBhbmQgdmVyc2lvblxuZXhwb3J0cy5uYW1lID0gbWF0Y2ggJiYgbWF0Y2hbMF07XG5leHBvcnRzLnZlcnNpb24gPSBwYXJ0cyAmJiBwYXJ0cy5qb2luKCcuJyk7XG5cbmZ1bmN0aW9uIG1hdGNoKHBhaXIpIHtcbiAgcmV0dXJuIHBhaXIuY29uY2F0KHBhaXJbMV0uZXhlYyhuYXZpZ2F0b3IudXNlckFnZW50KSk7XG59XG5cbmZ1bmN0aW9uIGlzTWF0Y2gocGFpcikge1xuICByZXR1cm4gISFwYWlyWzJdO1xufVxuIiwidmFyIGRldGVjdCA9IHJlcXVpcmUoJy4vZGV0ZWN0Jyk7XG52YXIgcmVxdWlyZWRGdW5jdGlvbnMgPSBbXG4gICdpbml0J1xuXTtcblxuZnVuY3Rpb24gaXNTdXBwb3J0ZWQocGx1Z2luKSB7XG4gIHJldHVybiBwbHVnaW4gJiYgdHlwZW9mIHBsdWdpbi5zdXBwb3J0ZWQgPT0gJ2Z1bmN0aW9uJyAmJiBwbHVnaW4uc3VwcG9ydGVkKGRldGVjdCk7XG59XG5cbmZ1bmN0aW9uIGlzVmFsaWQocGx1Z2luKSB7XG4gIHZhciBzdXBwb3J0ZWRGdW5jdGlvbnMgPSByZXF1aXJlZEZ1bmN0aW9ucy5maWx0ZXIoZnVuY3Rpb24oZm4pIHtcbiAgICByZXR1cm4gdHlwZW9mIHBsdWdpbltmbl0gPT0gJ2Z1bmN0aW9uJztcbiAgfSk7XG5cbiAgcmV0dXJuIHN1cHBvcnRlZEZ1bmN0aW9ucy5sZW5ndGggPT09IHJlcXVpcmVkRnVuY3Rpb25zLmxlbmd0aDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwbHVnaW5zKSB7XG4gIHJldHVybiBbXS5jb25jYXQocGx1Z2lucyB8fCBbXSkuZmlsdGVyKGlzU3VwcG9ydGVkKS5maWx0ZXIoaXNWYWxpZClbMF07XG59XG4iLCIvKipcbiAgIyBydGMtZmlsdGVyLWdyYXlzY2FsZVxuXG4gIEEgc2ltcGxlIGdyYXlzY2FsZSBmaWx0ZXIgZm9yIHVzZSB3aXRoIHRoZVxuICBbcnRjLXZpZGVvcHJvY10oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtdmlkZW9wcm9jKSBtb2R1bGUuXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIFRoZSBmb2xsb3dpbmcgZXhhbXBsZSBjYW4gYmUgcnVuIHVzaW5nXG4gIFtiZWVmeV0oaHR0cHM6Ly9naXRodWIuY29tL2NocmlzZGlja2luc29uL2JlZWZ5KSAoYGJlZWZ5IGV4YW1wbGUuanNgKTpcblxuICA8PDwgZXhhbXBsZS5qc1xuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaW1hZ2VEYXRhKSB7XG4gIHZhciBjaGFubmVscyA9IGltYWdlRGF0YS5kYXRhO1xuICB2YXIgcmdiID0gW107XG4gIHZhciByZ2JBdmc7XG4gIHZhciBhbHBoYTtcbiAgdmFyIGlpO1xuXG4gIC8vIGNoZWNrIHRoYXQgd2UgaGF2ZSBjaGFubmVscyBpcyBkaXZpc2libGUgYnkgZm91ciAoanVzdCBhcyBhIHNhZmV0eSlcbiAgaWYgKGNoYW5uZWxzLmxlbmd0aCAlIDQgIT09IDApIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIGRhdGFcbiAgLy8gTk9URTogZGVjcmVtZW50aW5nIGxvb3BzIGFyZSBmYXN0IGJ1dCB5b3UgbmVlZCB0byBrbm93IHRoYXQgeW91IHdpbGxcbiAgLy8gaGl0IDAgdXNpbmcgdGhpcyBsb2dpYyBvdGhlcndpc2UgaXQgd2lsbCBydW4gZm9yZXZlciAob25seSAwIGlzIGZhbHN5KVxuICBmb3IgKGlpID0gY2hhbm5lbHMubGVuZ3RoOyBpaSAtPSA0OyApIHtcbiAgICAvLyBnZXQgdGhlIHJnYiB0dXBsZVxuICAgIHJnYiA9IFtjaGFubmVsc1tpaV0sIGNoYW5uZWxzW2lpICsgMV0sIGNoYW5uZWxzW2lpICsgMl1dO1xuXG4gICAgLy8gZ2V0IHRoZSBhbHBoYSB2YWx1ZVxuICAgIGFscGhhID0gY2hhbm5lbHNbaWkgKyAzXTtcblxuICAgIC8vIGNhbGN1bGF0ZSB0aGUgcmdiIGF2ZXJhZ2VcbiAgICByZ2JBdmcgPSAocmdiWzBdICsgcmdiWzFdICsgcmdiWzJdICkgLyAzO1xuXG4gICAgLy8gdXBkYXRlIHRoZSB2YWx1ZXMgdG8gdGhlIHJnYiBhdmVyYWdlXG4gICAgY2hhbm5lbHNbaWldID0gY2hhbm5lbHNbaWkgKyAxXSA9IGNoYW5uZWxzW2lpICsgMl0gPSByZ2JBdmc7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07IiwidmFyIGNhcHR1cmUgPSByZXF1aXJlKCdydGMtY2FwdHVyZScpO1xudmFyIGF0dGFjaCA9IHJlcXVpcmUoJ3J0Yy1hdHRhY2gnKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG5cbi8qKlxuICAjIHJ0Yy1tZWRpYVxuXG4gIFRoaXMgaXMgYSBjb252ZW5pZW5jZSBmdW5jdGlvbiBmb3IgaW52b2tpbmcgbWVkaWEgY2FwdHVyZSBhbmQgcmVuZGVyaW5nXG4gIHVzaW5nIHRoZSBbYHJ0Yy1jYXB0dXJlYF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtY2FwdHVyZSkgYW5kXG4gIFtgcnRjLWF0dGFjaGBdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLWF0dGFjaCkgcGFja2FnZXMgcmVzcGVjdGl2ZWx5XG4gIHdpdGhpbiBhbiBhcHBsaWNhdGlvbi5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgRGVmYXVsdCBjb25zdHJhaW50cyBgeyBhdWRpbzogdHJ1ZSwgdmlkZW86IHRydWUgfWAgY2FwdHVyZSBhbmQgcmVuZGVyaW5nXG4gIGFuIG5ldyB2aWRlbyBlbGVtZW50IHdpdGhpbiB0aGUgZG9jdW1lbnQuYm9keTpcblxuICA8PDwgZXhhbXBsZXMvcmVuZGVyLXRvLWJvZHkuanNcblxuICBJbiB0aGUgZXZlbnQgdGhhdCB5b3Ugd2lzaCB0byBtYWtlIHVzZSBvZiBhbnkgb2YgdGhlIHJ0Yy5pbyBwbHVnaW5zLCB0aGVuXG4gIHRoZSBmb2xsb3dpbmcgZXhhbXBsZSBkZW1vbnN0cmF0ZXMgaG93IHRvIHByb3ZpZGUgYSBzaW5nbGUgXCJjYXB0dXJlIGFuZFxuICByZW5kZXJcIiBjYWxsIHRoYXQgd2lsbCB3b3JrIHdpdGggYSBwbHVnaW46XG5cbiAgPDw8IGV4YW1wbGVzL3BsdWdpbi5qc1xuXG4qKi9cblxudmFyIG1lZGlhID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvcHRzKSB7XG4gIC8vIGRvIHdlIGhhdmUgY29uc3RyYWludHNcbiAgdmFyIGNvbnN0cmFpbnRzID0gKG9wdHMgfHwge30pLmNvbnN0cmFpbnRzIHx8IHsgdmlkZW86IHRydWUsIGF1ZGlvOiB0cnVlIH07XG5cbiAgLy8gb3IgZG8gd2UgaGF2ZSBhIHN0cmVhbVxuICB2YXIgc3RyZWFtID0gKG9wdHMgfHwge30pLnN0cmVhbTtcblxuICAvLyBpZiB3ZSBoYXZlIGJlZW4gcGFzc2VkIGNvbnN0cmFpbnRzLCBhc3N1bWUgd2UgYXJlIGF0dGFjaGluZyBhIGxvY2FsIHN0cmVhbVxuICAvLyBvdGhlcndpc2UsIHVzZSB0aGUgZ2VuZXJpYyBhdHRhY2ggb3B0aW9uc1xuICB2YXIgc3RyZWFtQXR0YWNoID0gKG9wdHMgfHwge30pLmNvbnN0cmFpbnRzID8gYXR0YWNoLmxvY2FsIDogYXR0YWNoO1xuXG4gIC8vIGRldGVjdCBhIHRhcmdldFxuICB2YXIgdGFyZ2V0ID0gKG9wdHMgfHwge30pLnRhcmdldCB8fCBkb2N1bWVudC5ib2R5O1xuICB2YXIgbm9uTWVkaWFUYXJnZXQgPSAhKHRhcmdldCBpbnN0YW5jZW9mIEhUTUxNZWRpYUVsZW1lbnQpO1xuXG4gIGZ1bmN0aW9uIGhhbmRsZUF0dGFjaChlcnIsIGVsKSB7XG4gICAgaWYgKGVycikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0YXJnZXQgJiYgbm9uTWVkaWFUYXJnZXQgJiYgdGFyZ2V0ICE9PSBlbCkge1xuICAgICAgdGFyZ2V0LmFwcGVuZENoaWxkKGVsKTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB3ZSBoYXZlIGEgc3RyZWFtLCBtb3ZlIG9udG8gcmVuZGVyaW5nIGltbWVkaWF0ZWx5XG4gIGlmIChzdHJlYW0pIHtcbiAgICByZXR1cm4gc3RyZWFtQXR0YWNoKHN0cmVhbSwgb3B0cywgaGFuZGxlQXR0YWNoKTtcbiAgfVxuXG4gIHJldHVybiBjYXB0dXJlKGNvbnN0cmFpbnRzLCBvcHRzLCBmdW5jdGlvbihlcnIsIHN0cmVhbSkge1xuICAgIHN0cmVhbUF0dGFjaChzdHJlYW0sIG9wdHMsIGhhbmRsZUF0dGFjaCk7XG4gIH0pO1xufTtcblxubWVkaWEuY2FwdHVyZSA9IGZ1bmN0aW9uKGNvbnN0cmFpbnRzLCBvcHRzKSB7XG4gIHJldHVybiBtZWRpYShleHRlbmQoe30sIG9wdHMsIHsgY29uc3RyYWludHM6IGNvbnN0cmFpbnRzIH0pKTtcbn07XG5cbm1lZGlhLmF0dGFjaCA9IG1lZGlhLnJlbmRlciA9IGZ1bmN0aW9uKHN0cmVhbSwgb3B0cykge1xuICByZXR1cm4gbWVkaWEoZXh0ZW5kKHt9LCBvcHRzLCB7IHN0cmVhbTogc3RyZWFtIH0pKTtcbn07XG4iLCJ2YXIgcGx1Z2luID0gcmVxdWlyZSgncnRjLWNvcmUvcGx1Z2luJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xuXG4vKipcbiAgIyBydGMtYXR0YWNoXG5cbiAgUm91Z2hseSBlcXVpdmFsZW50IHRvIHRoZVxuICBbYGF0dGFjaE1lZGlhU3RyZWFtYF0oaHR0cHM6Ly93d3cubnBtanMub3JnL3BhY2thZ2UvYXR0YWNobWVkaWFzdHJlYW0pXG4gIHBhY2thZ2UgYnV0IHdpdGggc3VwcG9ydCBmb3IgcnRjLmlvIHBsdWdpbnMuICBBbHNvIHVzZXMgYW4gZXJyb3IgZmlyc3RcbiAgYXN5bmMgQVBJIHRvIGFsbG93IHBsdWdpbnMgdGltZSB0byBpbml0aWFsaXplLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICA8PDwgZXhhbXBsZXMvc2ltcGxlLmpzXG5cbiAgIyMgRXhhbXBsZSB1c2luZyBQbHVnaW5zXG5cbiAgPDw8IGV4YW1wbGVzL3BsdWdpbnMuanNcblxuICAjIyBSZWZlcmVuY2VcblxuICAjIyMgYGF0dGFjaChzdHJlYW0sIG9wdHM/LCBjYWxsYmFjaylgXG5cbiAgQXR0YWNoIGBzdHJlYW1gIHRvIGEgSFRNTCBlbGVtZW50IHRoYXQgd2lsbCByZW5kZXIgdGhlIGNvbnRlbnQuIFRoZSBwcm92aWRlZFxuICBgY2FsbGJhY2tgIGZvbGxvd3MgdGhlIGZvcm1hdCBvZiBgZm4oZXJyLCBlbGVtZW50KWAuICBXaGlsZSB0aGUgYXN5bmMgbmF0dXJlXG4gIG9mIHRoaXMgcGFja2FnZSBtYXkgc2VlbSBvZGQsIGJlY2F1c2UgYSBwbHVnaW4gbWF5IG5lZWQgdGltZSB0byBpbml0aWFsaXplXG4gIHRoaXMgY2F0ZXJzIGZvciB0aGlzIGNhc2UgaW4gYWRkaXRpb24gdG8gc3RhbmRhcmQgdXNhZ2UgaW4gdGhlIGJyb3dzZXIuXG5cbiAgLSBgYXV0b3BsYXlgIChkZWZhdWx0OiBgdHJ1ZWApIC0gYnkgZGVmYXVsdCBhZnRlciB0aGUgc3RyZWFtIGhhcyBiZWVuXG4gICAgYXR0YWNoZWQgdG8gdGhlIGVsZW1lbnQgaXQgd2lsbCBiZSBwbGF5ZWQuICBUaGlzIGlzIGRvbmUgYnkgY2FsbGluZ1xuICAgIHRoZSBgcGxheSgpYCBmdW5jdGlvbiBvbiB0aGUgZWxlbWVudCByYXRoZXIgdGhhbiByZWx5aW5nIG9uIGBhdXRvcGxheWBcbiAgICBhdHRyaWJ1dGUgZnVuY3Rpb25hbGl0eS5cblxuICAtIGBlbGAgKGRlZmF1bHQ6IGBudWxsYCkgLSBpZiB5b3Ugd2l0aCB0byBzdXBwbHkgYW4gZWxlbWVudCB0byBiZSB1c2VkXG4gICAgaW5zdGVhZCBvZiBjcmVhdGluZyBhIG5ldyBlbGVtZW50IHRvIHJlY2VpdmUgdGhlIHN0cmVhbSBzcGVjaWZ5IGl0IGhlcmUuXG5cbiAgLSBgbXV0ZWRgIChkZWZhdWx0OiBgZmFsc2VgKSAtIHdoZXRoZXIgdGhlIGNyZWF0ZWQgZWxlbWVudCBzaG91bGQgYmUgbXV0ZWRcbiAgICBvciBub3QuICBGb3IgbG9jYWwgc3RyZWFtcyB0aGlzIHNob3VsZCBhbG1vc3QgYWx3YXlzLCBiZSB0cnVlIHNvIGNvbnNpZGVyXG4gICAgdXNpbmcgdGhlIGBhdHRhY2gubG9jYWxgIGhlbHBlciBmdW5jdGlvbiBmb3Igc2ltcGxlIGNhc2VzLlxuXG4gIC0gYHBsdWdpbnNgIChkZWZhdWx0OiBgW11gKSAtIHNwZWNpZnkgb25lIG9yIG1vcmUgcGx1Z2lucyB0aGF0IGNhbiBiZSB1c2VkXG4gICAgdG8gcmVuZGVyIHRoZSBtZWRpYSBzdHJlYW0gYXBwcm9wcmlhdGUgdG8gdGhlIGN1cnJlbnQgcGxhdGZvcm0gaW4gdGhlXG4gICAgZXZlbnQgdGhhdCBXZWJSVEMgYW5kL29yIG1lZGlhIGNhcHR1cmUgaXMgc3VwcG9ydGVkIHZpYSBhIGJyb3dzZXIgcGx1Z2luLlxuXG4qKi9cbnZhciBhdHRhY2ggPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHN0cmVhbSwgb3B0cywgY2FsbGJhY2spIHtcbiAgdmFyIFVSTCA9IHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LlVSTDtcbiAgdmFyIHBpbnN0O1xuXG4gIGlmICh0eXBlb2Ygb3B0cyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRzO1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFwcGx5TW9kaWZpY2F0aW9ucyhlbCwgbykge1xuICAgIGlmICgobyB8fCB7fSkubXV0ZWQpIHtcbiAgICAgIGVsLm11dGVkID0gdHJ1ZTtcbiAgICAgIGVsLnNldEF0dHJpYnV0ZSgnbXV0ZWQnLCAnJyk7XG4gICAgfVxuXG4gICAgaWYgKChvIHx8IHt9KS5taXJyb3IpIHtcbiAgICAgIGVsLnNldEF0dHJpYnV0ZSgnZGF0YS1taXJyb3JlZCcsIHRydWUpO1xuICAgIH1cblxuICAgIHJldHVybiBlbDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGF0dGFjaFRvRWxlbWVudChzLCBvKSB7XG4gICAgdmFyIGF1dG9wbGF5ID0gKG8gfHwge30pLmF1dG9wbGF5O1xuICAgIHZhciBlbFR5cGUgPSAnYXVkaW8nO1xuICAgIHZhciBlbCA9IChvIHx8IHt9KS5lbCB8fCAobyB8fCB7fSkudGFyZ2V0O1xuXG4gICAgLy8gY2hlY2sgdGhlIHN0cmVhbSBpcyB2YWxpZFxuICAgIHZhciBpc1ZhbGlkID0gcyAmJiB0eXBlb2Ygcy5nZXRWaWRlb1RyYWNrcyA9PSAnZnVuY3Rpb24nO1xuXG4gICAgLy8gZGV0ZXJtaW5lIHRoZSBlbGVtZW50IHR5cGVcbiAgICBpZiAoaXNWYWxpZCAmJiBzLmdldFZpZGVvVHJhY2tzKCkubGVuZ3RoID4gMCkge1xuICAgICAgZWxUeXBlID0gJ3ZpZGVvJztcbiAgICB9XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGJlZW4gcGFzc2VkIGFuIFwidW5wbGF5YWJsZVwiIHRhcmdldCBjcmVhdGUgYSBuZXcgZWxlbWVudFxuICAgIGlmIChlbCAmJiB0eXBlb2YgZWwucGxheSAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICBlbCA9IG51bGw7XG4gICAgfVxuXG4gICAgLy8gcHJlcGFyZSB0aGUgZWxlbWVudFxuICAgIGVsID0gZWwgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChlbFR5cGUpO1xuXG4gICAgLy8gYXR0YWNoIHRoZSBzdHJlYW1cbiAgICBpZiAoVVJMICYmIFVSTC5jcmVhdGVPYmplY3RVUkwpIHtcbiAgICAgIGVsLnNyYyA9IFVSTC5jcmVhdGVPYmplY3RVUkwoc3RyZWFtKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZWwuc3JjT2JqZWN0KSB7XG4gICAgICBlbC5zcmNPYmplY3QgPSBzdHJlYW07XG4gICAgfVxuICAgIGVsc2UgaWYgKGVsLm1velNyY09iamVjdCkge1xuICAgICAgZWwubW96U3JjT2JqZWN0ID0gc3RyZWFtO1xuICAgIH1cblxuICAgIGlmIChhdXRvcGxheSA9PT0gdW5kZWZpbmVkIHx8IGF1dG9wbGF5KSB7XG4gICAgICBlbC5zZXRBdHRyaWJ1dGUoJ2F1dG9wbGF5JywgJycpO1xuICAgICAgZWwucGxheSgpO1xuICAgIH1cblxuICAgIHJldHVybiBhcHBseU1vZGlmaWNhdGlvbnMoZWwsIG8pO1xuICB9XG5cbiAgLy8gc2VlIGlmIHdlIGFyZSB1c2luZyBhIHBsdWdpblxuICBwaW5zdCA9IHBsdWdpbigob3B0cyB8fCB7fSkucGx1Z2lucyk7XG4gIGlmIChwaW5zdCkge1xuICAgIHJldHVybiBwaW5zdC5pbml0KG9wdHMsIGZ1bmN0aW9uKGVycikge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBwaW5zdC5hdHRhY2ggIT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdwbHVnaW4gbXVzdCBzdXBwb3J0IHRoZSBhdHRhY2ggZnVuY3Rpb24nKSk7XG4gICAgICB9XG5cbiAgICAgIGNhbGxiYWNrKG51bGwsIGFwcGx5TW9kaWZpY2F0aW9ucyhwaW5zdC5hdHRhY2goc3RyZWFtLCBvcHRzKSwgb3B0cykpO1xuICAgIH0pO1xuICB9XG5cbiAgY2FsbGJhY2sobnVsbCwgYXR0YWNoVG9FbGVtZW50KHN0cmVhbSwgb3B0cykpO1xufTtcblxuLyoqXG4gICMjIyBgYXR0YWNoLmxvY2FsKHN0cmVhbSwgb3B0cz8sIGNhbGxiYWNrKWBcblxuICBBdHRhY2ggYSBsb2NhbCBzdHJlYW0gd2l0aCBvcHRpb25zIGFwcHJvcHJpYXRlIGZvciBsb2NhbCBzdHJlYW1zOlxuXG4gIC0gYG11dGVkYDogYHRydWVgXG5cbioqL1xuYXR0YWNoLmxvY2FsID0gZnVuY3Rpb24oc3RyZWFtLCBvcHRzLCBjYWxsYmFjaykge1xuICBpZiAodHlwZW9mIG9wdHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICBvcHRzID0ge307XG4gIH1cblxuICBhdHRhY2goc3RyZWFtLCBleHRlbmQoeyBtdXRlZDogdHJ1ZSwgbWlycm9yOiB0cnVlIH0sIG9wdHMpLCBjYWxsYmFjayk7XG59O1xuIiwidmFyIHBsdWdpbiA9IHJlcXVpcmUoJ3J0Yy1jb3JlL3BsdWdpbicpO1xudmFyIGRldGVjdCA9IHJlcXVpcmUoJ3J0Yy1jb3JlL2RldGVjdCcpO1xuXG4vLyBwYXRjaCBuYXZpZ2F0b3IgZ2V0VXNlck1lZGlhXG5uYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gbmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fFxuICBkZXRlY3QuY2FsbChuYXZpZ2F0b3IsICdnZXRVc2VyTWVkaWEnKTtcblxuLyoqXG4gICMgcnRjLWNhcHR1cmVcblxuICBSb3VnaGx5IGVxdWl2YWxlbnQgdG8gdGhlXG4gIFtgZ2V0VXNlck1lZGlhYF0oaHR0cHM6Ly93d3cubnBtanMub3JnL3BhY2thZ2UvZ2V0dXNlcm1lZGlhKSBwYWNrYWdlIGJ1dCB3aXRoXG4gIHN1cHBvcnQgZm9yIHJ0Yy5pbyBwbHVnaW5zLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICA8PDwgZXhhbXBsZXMvc2ltcGxlLmpzXG5cbiAgIyMgRXhhbXBsZSB3aXRoIHVzaW5nIFBsdWdpbnNcblxuICA8PDwgZXhhbXBsZXMvcGx1Z2lucy5qc1xuXG4gICMjIFJlZmVyZW5jZVxuXG4gICMjIyBgY2FwdHVyZShjb25zdHJhaW50cywgb3B0cz8sIGNhbGxiYWNrKWBcblxuICBDYXB0dXJlIG1lZGlhIHdpdGggdGhlIHN1cHBsaWVkIGBjb25zdHJhaW50c2AuICBJZiBhbiBgb3B0c2AgYXJndW1lbnQgaXNcbiAgc3VwcGxpZWQgbG9vayBmb3IgcGx1Z2lucyB0aGF0IG1heSBjaGFuZ2UgdGhlIGJlaGF2aW91ciBvZiB0aGUgY2FwdHVyZVxuICBvcGVyYXRpb24uXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb25zdHJhaW50cywgb3B0cywgY2FsbGJhY2spIHtcbiAgdmFyIHBpbnN0O1xuXG4gIGZ1bmN0aW9uIGhhbmRsZUNhcHR1cmUoc3RyZWFtKSB7XG4gICAgY2FsbGJhY2sobnVsbCwgc3RyZWFtKTtcbiAgfVxuXG4gIGlmICh0eXBlb2Ygb3B0cyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRzO1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIC8vIHNlZSBpZiB3ZSBhcmUgdXNpbmcgYSBwbHVnaW5cbiAgcGluc3QgPSBwbHVnaW4oKG9wdHMgfHwge30pLnBsdWdpbnMpO1xuICBpZiAocGluc3QpIHtcbiAgICByZXR1cm4gcGluc3QuaW5pdChvcHRzLCBmdW5jdGlvbihlcnIpIHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ3BsdWdpbiBkb2VzIG5vdCBzdXBwb3J0IG1lZGlhIGNhcHR1cmUnKSk7XG4gICAgICB9XG5cbiAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEoY29uc3RyYWludHMsIGhhbmRsZUNhcHR1cmUsIGNhbGxiYWNrKTtcbiAgICB9KTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSAhPSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignZ2V0VXNlck1lZGlhIG5vdCBzdXBwb3J0ZWQnKSk7XG4gIH1cblxuICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzLCBoYW5kbGVDYXB0dXJlLCBjYWxsYmFjayk7XG59O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbi8qIGdsb2JhbCBkb2N1bWVudDogZmFsc2UgKi9cbi8qIGdsb2JhbCBIVE1MVmlkZW9FbGVtZW50OiBmYWxzZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgREVGQVVMVF9GUFMgPSAyNTtcbnZhciByYWYgPSByZXF1aXJlKCdmZG9tL3JhZicpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcblxuLyoqXG4gICMgcnRjLXZpZGVvcHJvY1xuXG4gIFRoaXMgaXMgYSBzbWFsbCBoZWxwZXIgbW9kdWxlIHRoYXQgYWxsb3dzIHlvdSB0byBzdWJzdGl0dXRlIGEgdmlkZW9cbiAgZWxlbWVudCB3aXRoIGEgY2FudmFzIGVsZW1lbnQuICBUaGlzIGNhbiBiZSB1c2VmdWwgd2hlbiB5b3Ugd2FudCB0b1xuICBkbyBwaXhlbCBtYW5pcHVsYXRpb24gb2YgdGhlIHJlbmRlcmVkIGltYWdlcywgb3IgaW4gc2l0dWF0aW9ucyB3aGVuXG4gIGEgdmlkZW8gZWxlbWVudCBkb2VzIG5vdCBiZWhhdmUgYXMgeW91IGV4cGVjdC5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgPDw8IGV4YW1wbGVzL2dyYXlzY2FsZS1maWx0ZXIuanNcblxuICAjIyBVc2luZyB0aGUgUHJvY2Vzc2luZyBQaXBlbGluZVxuXG4gIEEgcHJvY2Vzc2luZyBwaXBlbGluZSBoYXMgYmVlbiBpbmNsdWRlZCB0byBhc3Npc3Qgd2l0aFxuICBtYW5pcHVsYXRpbmcgdGhlIGNhbnZhcyBvbiB0aGUgZmx5LiBUbyBzcGVjaWZ5IHRoZSBmaWx0ZXJzIHRvIGJlIHVzZWRcbiAgaW4gdGhlIHByb2Nlc3NpbmcgcGlwZWxpbmUsIHRoaXMgaXMgZG9uZSBpbiB0aGUgb3B0aW9ucyBhY2NlcHRlZCBieVxuICB2aWRlb3Byb2MuIEVpdGhlciBzcGVjaWZ5aW5nIGFuIGFycmF5IG9mIGZpbHRlcnMgd2l0aCB0aGUgYGZpbHRlcnNgIG9wdGlvblxuICBvciBhIHNpbmdsZSBmaWx0ZXIgZnVuY3Rpb24gd2l0aCB0aGUgYGZpbHRlcmAgb3B0aW9uIGlzIGZpbmUuICBJZiB5b3UgdXNlXG4gIGJvdGggdGhlbiB0aGUgaW5kaXZpZHVhbCBmaWx0ZXIgd2lsbCBiZSBhZGRlZCBmaWx0ZXIgbGlzdCBhbmQgdXNlZCBpblxuICBzZXJpZXMuXG5cbiAgYGBganNcbiAgdmlkZW9wcm9jKHNyY1ZpZGVvLCB0YXJnZXRDYW52YXMsIHtcbiAgICBmaWx0ZXJzOiBbXG4gICAgICByZXF1aXJlKCdydGMtZmlsdGVyLWdyYXlzY2FsZScpLFxuICAgICAgbXlDdXN0b21GaWx0ZXJGdW5jdGlvblxuICAgIF1cbiAgfSk7XG4gIGBgYFxuXG4gICMjIFdyaXRpbmcgYSBGaWx0ZXIgRnVuY3Rpb25cblxuICBXcml0aW5nIGEgZmlsdGVyIGZ1bmN0aW9uIGlzIHZlcnkgc2ltcGxlLCBhbmQgdGhleSB1c2UgdGhlIGZvbGxvd2luZ1xuICBmdW5jdGlvbiBzaWduYXR1cmU6XG5cbiAgYGBganNcbiAgZnVuY3Rpb24gZmlsdGVyKGltYWdlRGF0YSwgdGljaykge1xuICB9XG4gIGBgYFxuXG4gIFRoZSBgaW1hZ2VEYXRhYCBhcmcgaXMgYW5cbiAgW0ltYWdlRGF0YV0oaHR0cDovL3d3dy53My5vcmcvVFIvMmRjb250ZXh0LyNpbWFnZWRhdGEpLCBhbmQgdGhlIGB0aWNrYFxuICBhcmd1bWVudCByZWZlcnMgdG8gdGhlIHRpY2sgdGhhdCBoYXMgYmVlbiBjYXB0dXJlZCBhcyBwYXJ0IG9mIHRoZSBjYXB0dXJlXG4gIGxvb3AgKGJlIGF3YXJlIHRoYXQgaXQgY291bGQgYmUgYSBoaWdoIHJlc29sdXRpb24gdGltZXIgdmFsdWUgaWYgckFGIGlzXG4gIGJlaW5nIHVzZWQpLlxuXG4gIElmIHlvdSBhcmUgd3JpdGluZyBhbiBhbmFseXNpcyBmaWx0ZXIsIHRoZW4gc2ltcGx5IGRvIHdoYXQgeW91IG5lZWQgdG8gZG9cbiAgYW5kIGV4aXQgdGhlIGZ1bmN0aW9uLiAgSWYgeW91IGhhdmUgd3JpdHRlbiBhIGZpbHRlciB0aGF0IG1vZGlmaWVzIHRoZSBwaXhlbFxuICBkYXRhIGFuZCB5b3Ugd2FudCB0aGlzIGRyYXduIGJhY2sgdG8gdGhlIGNhbnZhcyB0aGVuIHlvdXIgKipmaWx0ZXIgbXVzdFxuICByZXR1cm4gYHRydWVgKiogdG8gdGVsbCBgcnRjLXZpZGVvcHJvY2AgdGhhdCBpdCBzaG91bGQgZHJhdyB0aGUgaW1hZ2VEYXRhXG4gIGJhY2sgdG8gdGhlIGNhbnZhcy5cblxuICAjIyBMaXN0ZW5pbmcgZm9yIGN1c3RvbSBgZnJhbWVgIGV2ZW50c1xuXG4gIEluIGFkZGl0aW9uIHRvIHByb3ZpZGluZyB0aGUgb3Bwb3J0dW5pdHkgdG8gYW5hbHlzZSBhbmQgbW9kaWZ5IHBpeGVsIGRhdGFcbiAgdGhlIGBydGMtdmlkZW9wcm9jYCBtb2R1bGUgYWxzbyBwcm92aWRlcyB0aGUgYSBjdXN0b20gYGZyYW1lYCBldmVudCBmb3JcbiAgZGV0ZWN0aW5nIHdoZW4gYSBuZXcgZnJhbWUgaGFzIGJlZW4gZHJhd24gdG8gdGhlIGNhbnZhcy5cblxuICBBIHNpbXBsZSBleGFtcGxlIGNhbiBiZSBmb3VuZCBiZWxvdzpcblxuICA8PDwgZXhhbXBsZXMvZnJhbWVsaXN0ZW5lci5qc1xuXG4gIE5PVEU6IFRoZSBgZnJhbWVgIGV2ZW50IG9jY3VycyBhZnRlciB0aGUgZmlsdGVyIHBpcGVsaW5lIGhhcyBiZWVuIHJ1biBhbmRcbiAgYW5kIHRoZSBpbWFnZURhdGEgbWF5IGhhdmUgYmVlbiBtb2RpZmllZCBmcm9tIHRoZSBvcmlnaW5hbCB2aWRlbyBmcmFtZS5cblxuICAjIyBBIE5vdGUgd2l0aCBSZWdhcmRzIHRvIENQVSBVc2FnZVxuXG4gIEJ5IGRlZmF1bHQgcnRjLXZpZGVvcHJvYyB3aWxsIGRyYXcgYXQgMjVmcHMgYnV0IHRoaXMgY2FuIGJlIG1vZGlmaWVkIHRvIGNhcHR1cmVcbiAgYXQgYSBsb3dlciBmcmFtZSByYXRlIGZvciBzbG93ZXIgZGV2aWNlcywgb3IgaW5jcmVhc2VkIGlmIHlvdSBoYXZlIGFcbiAgbWFjaGluZSB3aXRoIHBsZW50eSBvZiBncnVudC5cblxuICAjIyBSZWZlcmVuY2VcblxuICAjIyMgdmlkZW9wcm9jKHNyYywgdGFyZ2V0LCBvcHRzPylcblxuICBDcmVhdGUgKG9yIHBhdGNoKSBhIGA8Y2FudmFzPmAgZWxlbWVudCB0aGF0IHdpbGwgcmVjZWl2ZSB0aGUgdmlkZW8gaW1hZ2VzXG4gIGZyb20gYSB2aWRlbyBlbGVtZW50LiAgVGhlIGZvbGxvd2luZyBvcHRpb25zIGFyZSBzdXBwb3J0ZWQuXG5cbiAgLSBgY2FudmFzYCAtIHRoZSBjYW52YXMgdG8gZHJhdyB2aWRlbyBkYXRhIHRvLiAgSWYgbm90IHN1cHBsaWVkIGEgbmV3IFxuICAgIGNhbnZhcyBlbGVtZW50IHdpbGwgYmUgY3JlYXRlZC5cblxuICAtIGB2aWRlb2AgLSB0aGUgdmlkZW8gZWxlbWVudCB0aGF0IHdpbGwgYmUgdXNlZCBhcyB0aGUgc291cmNlIG9mIHRoZSB2aWRlby5cbiAgICAgSWYgbm90IHN1cHBsaWVkIGEgbmV3IGA8dmlkZW8+YCBlbGVtZW50IHdpbGwgYmUgY3JlYXRlZC5cblxuICAtIGBmcHNgIC0gdGhlIHJlZHJhdyByYXRlIG9mIHRoZSBmYWtlIHZpZGVvIChkZWZhdWx0ID0gMjUpXG5cbiAgLSBgZ3JlZWR5YCAtIFNwZWNpZnkgYGdyZWVkeTogdHJ1ZWAgaWYgeW91IHdhbnQgdGhlIHZpZGVvcHJvYyBtb2R1bGUgdG8gcnVuXG4gICAgaXQncyBjYXB0dXJlIGxvb3AgdXNpbmcgc2V0VGltZW91dCByYXRoZXIgdGhhbiBgcmVxdWVzdEFuaW1hdGlvbkZyYW1lYC5cbiAgICBEb2luZyB0aGlzIHdpbGwgbWVhbiB5b3UgYXBwbGljYXRpb24gd2lsbCBjb250aW51ZSB0byBjYXB0dXJlIGFuZCBwcm9jZXNzXG4gICAgZnJhbWVzIGV2ZW4gd2hlbiBpdCdzIHRhYiAvIHdpbmRvdyBiZWNvbWVzIGluYWN0aXZlLiBUaGlzIGlzIHVzdWFsbHkgdGhlXG4gICAgZGVzaXJlZCBiZWhhdmlvdXIgd2l0aCB2aWRlbyBjb25mZXJlbmNpbmcgYXBwbGljYXRpb25zLlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc3JjLCB0YXJnZXQsIG9wdHMpIHtcbiAgLy8gY2hlY2sgZm9yIGEgdmFsaWQgc291cmNlXG4gIHZhciB2YWxpZFNvdXJjZSA9IHR5cGVvZiBzcmMgIT0gJ3VuZGVmaW5lZCc7IC8vIFRPRE86IGJldHRlciBjaGVja1xuICB2YXIgcmVzaXplQ2FudmFzID0gZmFsc2U7XG4gIHZhciBmcHM7XG4gIHZhciBncmVlZHk7XG4gIHZhciBncmVlZHlEZWxheTtcbiAgdmFyIGRyYXdEZWxheTtcblxuICAvLyBjcmVhdGUgYW4gZXZlbnQgZW1pdHRlciBmb3IgdGhlIHByb2Nlc3NvciBvYmplY3RcbiAgdmFyIHByb2Nlc3NvciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICAvLyBjaGVjayBmb3Igbm8gdGFyZ2V0IGJ1dCBvcHRzIHN1cHBsaWVkXG4gIHZhciBzaGlmdEFyZ3MgPSAoISBvcHRzKSAmJiAoISB0YXJnZXQpIHx8XG4gICAgKHR5cGVvZiB0YXJnZXQgPT0gJ29iamVjdCcgJiYgdHlwZW9mIHRhcmdldC5nZXRDb250ZXh0ICE9ICdmdW5jdGlvbicpO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIGRyYXcgbWV0YWRhdGFcbiAgdmFyIGRyYXdXaWR0aDtcbiAgdmFyIGRyYXdIZWlnaHQ7XG4gIHZhciBkcmF3WCA9IDA7XG4gIHZhciBkcmF3WSA9IDA7XG4gIHZhciBkcmF3RGF0YTtcbiAgdmFyIGxhc3RUaWNrID0gMDtcbiAgdmFyIHNvdXJjZU1vbml0b3JUaW1lciA9IDA7XG4gIHZhciBjb250ZXh0O1xuXG4gIGZ1bmN0aW9uIHN5bmNDYW52YXMoKSB7XG4gICAgdGFyZ2V0LndpZHRoID0gc3JjLnZpZGVvV2lkdGg7XG4gICAgdGFyZ2V0LmhlaWdodCA9IHNyYy52aWRlb0hlaWdodDtcbiAgICBjYWxjdWxhdGVEcmF3UmVnaW9uKCk7XG4gIH1cblxuICBmdW5jdGlvbiBjYWxjdWxhdGVEcmF3UmVnaW9uKCkge1xuICAgIHZhciBzY2FsZTtcbiAgICB2YXIgc2NhbGVYO1xuICAgIHZhciBzY2FsZVk7XG5cbiAgICAvLyBpZiBlaXRoZXIgd2lkdGggb3IgaGVpZ2h0ID09PSAwIHRoZW4gYmFpbFxuICAgIGlmICh0YXJnZXQud2lkdGggPT09IDAgfHwgdGFyZ2V0LmhlaWdodCA9PT0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGNhbGN1bGF0ZSByZXF1aXJlZCBzY2FsaW5nXG4gICAgc2NhbGUgPSBNYXRoLm1pbihcbiAgICAgIHNjYWxlWCA9ICh0YXJnZXQud2lkdGggLyBzcmMudmlkZW9XaWR0aCksXG4gICAgICBzY2FsZVkgPSAodGFyZ2V0LmhlaWdodCAvIHNyYy52aWRlb0hlaWdodClcbiAgICApO1xuXG4gICAgLy8gY2FsY3VsYXRlIHRoZSBzY2FsZWQgZHJhdyB3aWR0aCBhbmQgaGVpZ2h0XG4gICAgZHJhd1dpZHRoID0gKHNyYy52aWRlb1dpZHRoICogc2NhbGUpIHwgMDtcbiAgICBkcmF3SGVpZ2h0ID0gKHNyYy52aWRlb0hlaWdodCAqIHNjYWxlKSB8IDA7XG5cbiAgICAvLyBjYWxjdWxhdGUgdGhlIG9mZnNldFggYW5kIFlcbiAgICBkcmF3WCA9ICh0YXJnZXQud2lkdGggLSBkcmF3V2lkdGgpID4+IDE7XG4gICAgZHJhd1kgPSAodGFyZ2V0LmhlaWdodCAtIGRyYXdIZWlnaHQpID4+IDE7XG5cbiAgICAvLyBzYXZlIHRoZSBkcmF3IGRhdGFcbiAgICBkcmF3RGF0YSA9IHtcbiAgICAgIHg6IGRyYXdYLFxuICAgICAgeTogZHJhd1ksXG4gICAgICB3aWR0aDogZHJhd1dpZHRoLFxuICAgICAgaGVpZ2h0OiBkcmF3SGVpZ2h0XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1vbml0b3JTb3VyY2UoKSB7XG4gICAgY2xlYXJJbnRlcnZhbChzb3VyY2VNb25pdG9yVGltZXIpO1xuICAgIHNvdXJjZU1vbml0b3JUaW1lciA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHNyYy52aWRlb1dpZHRoID4gMCAmJiBzcmMudmlkZW9IZWlnaHQgPiAwKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoc291cmNlTW9uaXRvclRpbWVyKTtcbiAgICAgICAgc3luY0NhbnZhcygpO1xuICAgICAgfVxuICAgIH0sIDEwMCk7XG4gIH1cblxuICBmdW5jdGlvbiByZWRyYXcodGljaykge1xuICAgIHZhciBpbWFnZURhdGE7XG4gICAgdmFyIHR3ZWFrZWQ7XG4gICAgdmFyIGV2dDtcbiAgICB2YXIgcG9zdFByb2Nlc3NFdnQ7XG4gICAgdmFyIHR3ZWFrZWQgPSBmYWxzZTtcbiAgICB2YXIgZnJhbWVMaXN0ZW5lcnMgPSBwcm9jZXNzb3IubGlzdGVuZXJzKCdmcmFtZScpLmxlbmd0aDtcblxuICAgIC8vIGdldCB0aGUgY3VycmVudCB0aWNrXG4gICAgdGljayA9IHRpY2sgfHwgRGF0ZS5ub3coKTtcblxuICAgIC8vIG9ubHkgZHJhdyBhcyBvZnRlbiBhcyBzcGVjaWZpZWQgaW4gdGhlIGZwc1xuICAgIGlmIChkcmF3V2lkdGggJiYgZHJhd0hlaWdodCAmJiB0aWNrIC0gbGFzdFRpY2sgPiBkcmF3RGVsYXkpIHtcbiAgICAgIC8vIGRyYXcgdGhlIGltYWdlXG4gICAgICBjb250ZXh0LmRyYXdJbWFnZShzcmMsIGRyYXdYLCBkcmF3WSwgZHJhd1dpZHRoLCBkcmF3SGVpZ2h0KTtcblxuICAgICAgLy8gaWYgd2UgaGF2ZSBwcm9jZXNzb3JzLCBnZXQgdGhlIGltYWdlIGRhdGEgYW5kIHBhc3MgaXQgdGhyb3VnaFxuICAgICAgaWYgKHByb2Nlc3Nvci5maWx0ZXJzLmxlbmd0aCkge1xuICAgICAgICB0d2Vha2VkID0gZmFsc2U7XG4gICAgICAgIGltYWdlRGF0YSA9IGNvbnRleHQuZ2V0SW1hZ2VEYXRhKDAsIDAsIGRyYXdXaWR0aCwgZHJhd0hlaWdodCk7XG5cbiAgICAgICAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBwcm9jZXNzb3JzXG4gICAgICAgIHByb2Nlc3Nvci5maWx0ZXJzLmZvckVhY2goZnVuY3Rpb24oZmlsdGVyKSB7XG4gICAgICAgICAgdHdlYWtlZCA9IGZpbHRlcihpbWFnZURhdGEsIHRpY2ssIGNvbnRleHQsIHRhcmdldCwgZHJhd0RhdGEpIHx8IHR3ZWFrZWQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICh0d2Vha2VkKSB7XG4gICAgICAgICAgLy8gVE9ETzogZGlydHkgYXJlYVxuICAgICAgICAgIGNvbnRleHQucHV0SW1hZ2VEYXRhKGltYWdlRGF0YSwgMCwgMCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gdXBkYXRlIHRoZSBwcm9jZXNzb3IgaW1hZ2VEYXRhXG4gICAgICBwcm9jZXNzb3IuaW1hZ2VEYXRhID0gaW1hZ2VEYXRhO1xuXG4gICAgICAvLyBlbWl0IHRoZSBwcm9jZXNzb3IgZnJhbWUgZXZlbnRcbiAgICAgIHByb2Nlc3Nvci5lbWl0KCdmcmFtZScsIHRpY2spO1xuXG4gICAgICAvLyB1cGRhdGUgdGhlIGxhc3QgdGlja1xuICAgICAgbGFzdFRpY2sgPSB0aWNrO1xuICAgIH1cblxuICAgIC8vIHF1ZXVlIHVwIGFub3RoZXIgcmVkcmF3XG4gICAgaWYgKGdyZWVkeSkge1xuICAgICAgc2V0VGltZW91dChyZWRyYXcsIGdyZWVkeURlbGF5KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByYWYocmVkcmF3KTtcbiAgICB9XG4gIH1cblxuICBpZiAoc2hpZnRBcmdzKSB7XG4gICAgb3B0cyA9IHRhcmdldDtcbiAgICB0YXJnZXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgfVxuXG4gIC8vIHNhdmUgdGhlIHRhcmdldCB0byB0aGUgY2FudmFzIHByb3BlcnR5IG9mIHRoZSBwcm9jZXNzb3JcbiAgcHJvY2Vzc29yLmNhbnZhcyA9IHRhcmdldDtcbiAgY29udGV4dCA9IHByb2Nlc3Nvci5jb250ZXh0ID0gdGFyZ2V0LmdldENvbnRleHQoJzJkJyk7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgZnBzXG4gIGZwcyA9IChvcHRzIHx8IHt9KS5mcHMgfHwgREVGQVVMVF9GUFM7XG4gIGdyZWVkeSA9IChvcHRzIHx8IHt9KS5ncmVlZHk7XG5cbiAgLy8gc2V0VGltZW91dCBzaG91bGQgb2NjdXIgbW9yZSBmcmVxdWVudGx5IHRoYW4gdGhlIGZwc1xuICAvLyBkZWxheSBzbyB3ZSBnZXQgY2xvc2UgdG8gdGhlIGRlc2lyZWQgZnBzXG4gIGdyZWVkeURlbGF5ID0gKDEwMDAgLyBmcHMpID4+IDE7XG5cbiAgLy8gY2FsYWN1bGF0ZSB0aGUgZHJhdyBkZWxheSwgY2xhbXAgYXMgaW50XG4gIGRyYXdEZWxheSA9ICgxMDAwIC8gZnBzKSB8IDA7XG5cbiAgLy8gZGV0ZXJtaW5lIHdoZXRoZXIgd2Ugc2hvdWxkIHJlc2l6ZSB0aGUgY2FudmFzIG9yIG5vdFxuICByZXNpemVDYW52YXMgPSB0YXJnZXQud2lkdGggPT09IDAgfHwgdGFyZ2V0LmhlaWdodCA9PT0gMDtcblxuICAvLyBpZiB3ZSd2ZSBiZWVuIHByb3ZpZGVkIGEgZmlsdGVycyBhcnJheSBpbiBvcHRpb25zIGluaXRpYWxpc2UgdGhlIGZpbHRlcnNcbiAgLy8gd2l0aCB0aG9zZSBmdW5jdGlvbnNcbiAgcHJvY2Vzc29yLmZpbHRlcnMgPSAoKG9wdHMgfHwge30pLmZpbHRlcnMgfHwgW10pLmZpbHRlcihmdW5jdGlvbihmaWx0ZXIpIHtcbiAgICByZXR1cm4gdHlwZW9mIGZpbHRlciA9PSAnZnVuY3Rpb24nO1xuICB9KTtcblxuICAvLyBpZiBhICdmaWx0ZXInIG9wdGlvbiBoYXMgYmVlbiBwcm92aWRlZCwgdGhlbiBhcHBlbmQgdG8gdGhlIGZpbHRlcnMgYXJyYXlcbiAgaWYgKG9wdHMgJiYgdHlwZW9mIG9wdHMuZmlsdGVyID09ICdmdW5jdGlvbicpIHtcbiAgICBwcm9jZXNzb3IuZmlsdGVycy5wdXNoKG9wdHMuZmlsdGVyKTtcbiAgfVxuXG4gIC8vIGlmIHdlIGFyZSByZXNpemluZyB0aGUgY2FudmFzLCB0aGVuIGFzIHRoZSB2aWRlbyBtZXRhZGF0YSBjaGFuZ2VzXG4gIC8vIHJlc3luYyB0aGUgY2FudmFzXG4gIHNyYy5hZGRFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIG1vbml0b3JTb3VyY2UpO1xuICBzcmMuYWRkRXZlbnRMaXN0ZW5lcignY2FucGxheScsIG1vbml0b3JTb3VyY2UpO1xuXG4gIC8vIGNhbGN1bGF0ZSB0aGUgaW5pdGlhbCBkcmF3IG1ldGFkYXRhICh3aWxsIGJlIHJlY2FsY3VsYXRlZCBvbiB2aWRlbyBzdHJlYW0gY2hhbmdlcylcbiAgY2FsY3VsYXRlRHJhd1JlZ2lvbigpO1xuXG4gIC8vIHN0YXJ0IHRoZSByZWRyYXdcbiAgcmFmKHJlZHJhdyk7XG5cbiAgcmV0dXJuIHByb2Nlc3Nvcjtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbi8qIGdsb2JhbCB3aW5kb3c6IGZhbHNlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBURVNUX1BST1BTID0gWydyJywgJ3dlYmtpdFInLCAnbW96UicsICdvUicsICdtc1InXTtcblxuLyoqXG4gICMjIyByYWYoY2FsbGJhY2spXG5cbiAgUmVxdWVzdCBhbmltYXRpb24gZnJhbWUgaGVscGVyLlxuXG4gIDw8PCBleGFtcGxlcy9yYWYuanNcblxuKiovXG5cbm1vZHVsZS5leHBvcnRzID0gdHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJyAmJiAoZnVuY3Rpb24oKSB7XG4gIGZvciAodmFyIGlpID0gMDsgaWkgPCBURVNUX1BST1BTLmxlbmd0aDsgaWkrKykge1xuICAgIHdpbmRvdy5hbmltRnJhbWUgPSB3aW5kb3cuYW5pbUZyYW1lIHx8XG4gICAgICB3aW5kb3dbVEVTVF9QUk9QU1tpaV0gKyAnZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgfSAvLyBmb3JcblxuICByZXR1cm4gYW5pbUZyYW1lO1xufSkoKTsiXX0=
