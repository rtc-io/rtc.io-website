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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5udm0vdmVyc2lvbnMvbm9kZS92MC4xMi4xL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiLi4vLi4vLi4vLm52bS92ZXJzaW9ucy9ub2RlL3YwLjEyLjEvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwiY29kZS9zaW1wbGUtbWFuaXB1bGF0aW9uLmpzIiwibm9kZV9tb2R1bGVzL2NvZy9leHRlbmQuanMiLCJub2RlX21vZHVsZXMvY3JlbC9jcmVsLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1jb3JlL2RldGVjdC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtY29yZS9ub2RlX21vZHVsZXMvZGV0ZWN0LWJyb3dzZXIvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtY29yZS9wbHVnaW4uanMiLCJub2RlX21vZHVsZXMvcnRjLWZpbHRlci1ncmF5c2NhbGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLW1lZGlhL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1tZWRpYS9ub2RlX21vZHVsZXMvcnRjLWF0dGFjaC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtbWVkaWEvbm9kZV9tb2R1bGVzL3J0Yy1jYXB0dXJlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy12aWRlb3Byb2MvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLXZpZGVvcHJvYy9ub2RlX21vZHVsZXMvZmRvbS9yYWYuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwidmFyIGNyZWwgPSByZXF1aXJlKCdjcmVsJyk7XG52YXIgbWVkaWEgPSByZXF1aXJlKCdydGMtbWVkaWEnKTtcbnZhciB2aWRlb3Byb2MgPSByZXF1aXJlKCdydGMtdmlkZW9wcm9jJyk7XG52YXIgdmlkZW8gPSBjcmVsKCd2aWRlbycpO1xudmFyIGNhbnZhcyA9IGNyZWwoJ2NhbnZhcycpO1xuXG4vLyBzZXQgdXAgdGhlIHZpZGVvIHByb2Nlc3NpbmdcbnZpZGVvcHJvYyh2aWRlbywgY2FudmFzLCB7XG4gIGZpbHRlcjogcmVxdWlyZSgncnRjLWZpbHRlci1ncmF5c2NhbGUnKVxufSk7XG5cbi8vIGNhcHR1cmUgYW5kIHJlbmRlciB0aGUgdmlkZW9cbm1lZGlhKCkucmVuZGVyKHZpZGVvKTtcblxuLy8gYWRkIHRoZSBjYW52YXMgdG8gdGhlIGRvY3VtZW50IGJvZHlcbmRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoY2FudmFzKTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiMjIGNvZy9leHRlbmRcblxuYGBganNcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG5gYGBcblxuIyMjIGV4dGVuZCh0YXJnZXQsICopXG5cblNoYWxsb3cgY29weSBvYmplY3QgcHJvcGVydGllcyBmcm9tIHRoZSBzdXBwbGllZCBzb3VyY2Ugb2JqZWN0cyAoKikgaW50b1xudGhlIHRhcmdldCBvYmplY3QsIHJldHVybmluZyB0aGUgdGFyZ2V0IG9iamVjdCBvbmNlIGNvbXBsZXRlZDpcblxuYGBganNcbmV4dGVuZCh7IGE6IDEsIGI6IDIgfSwgeyBjOiAzIH0sIHsgZDogNCB9LCB7IGI6IDUgfSkpO1xuYGBgXG5cblNlZSBhbiBleGFtcGxlIG9uIFtyZXF1aXJlYmluXShodHRwOi8vcmVxdWlyZWJpbi5jb20vP2dpc3Q9NjA3OTQ3NSkuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKS5mb3JFYWNoKGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgIGlmICghIHNvdXJjZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICB0YXJnZXRbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gdGFyZ2V0O1xufTsiLCIvL0NvcHlyaWdodCAoQykgMjAxMiBLb3J5IE51bm5cclxuXHJcbi8vUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcclxuXHJcbi8vVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXHJcblxyXG4vL1RIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxyXG5cclxuLypcclxuXHJcbiAgICBUaGlzIGNvZGUgaXMgbm90IGZvcm1hdHRlZCBmb3IgcmVhZGFiaWxpdHksIGJ1dCByYXRoZXIgcnVuLXNwZWVkIGFuZCB0byBhc3Npc3QgY29tcGlsZXJzLlxyXG5cclxuICAgIEhvd2V2ZXIsIHRoZSBjb2RlJ3MgaW50ZW50aW9uIHNob3VsZCBiZSB0cmFuc3BhcmVudC5cclxuXHJcbiAgICAqKiogSUUgU1VQUE9SVCAqKipcclxuXHJcbiAgICBJZiB5b3UgcmVxdWlyZSB0aGlzIGxpYnJhcnkgdG8gd29yayBpbiBJRTcsIGFkZCB0aGUgZm9sbG93aW5nIGFmdGVyIGRlY2xhcmluZyBjcmVsLlxyXG5cclxuICAgIHZhciB0ZXN0RGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JyksXHJcbiAgICAgICAgdGVzdExhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGFiZWwnKTtcclxuXHJcbiAgICB0ZXN0RGl2LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnYScpO1xyXG4gICAgdGVzdERpdlsnY2xhc3NOYW1lJ10gIT09ICdhJyA/IGNyZWwuYXR0ck1hcFsnY2xhc3MnXSA9ICdjbGFzc05hbWUnOnVuZGVmaW5lZDtcclxuICAgIHRlc3REaXYuc2V0QXR0cmlidXRlKCduYW1lJywnYScpO1xyXG4gICAgdGVzdERpdlsnbmFtZSddICE9PSAnYScgPyBjcmVsLmF0dHJNYXBbJ25hbWUnXSA9IGZ1bmN0aW9uKGVsZW1lbnQsIHZhbHVlKXtcclxuICAgICAgICBlbGVtZW50LmlkID0gdmFsdWU7XHJcbiAgICB9OnVuZGVmaW5lZDtcclxuXHJcblxyXG4gICAgdGVzdExhYmVsLnNldEF0dHJpYnV0ZSgnZm9yJywgJ2EnKTtcclxuICAgIHRlc3RMYWJlbFsnaHRtbEZvciddICE9PSAnYScgPyBjcmVsLmF0dHJNYXBbJ2ZvciddID0gJ2h0bWxGb3InOnVuZGVmaW5lZDtcclxuXHJcblxyXG5cclxuKi9cclxuXHJcbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xyXG4gICAgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xyXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgICAgICBkZWZpbmUoZmFjdG9yeSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJvb3QuY3JlbCA9IGZhY3RvcnkoKTtcclxuICAgIH1cclxufSh0aGlzLCBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgZm4gPSAnZnVuY3Rpb24nLFxyXG4gICAgICAgIG9iaiA9ICdvYmplY3QnLFxyXG4gICAgICAgIG5vZGVUeXBlID0gJ25vZGVUeXBlJyxcclxuICAgICAgICB0ZXh0Q29udGVudCA9ICd0ZXh0Q29udGVudCcsXHJcbiAgICAgICAgc2V0QXR0cmlidXRlID0gJ3NldEF0dHJpYnV0ZScsXHJcbiAgICAgICAgYXR0ck1hcFN0cmluZyA9ICdhdHRyTWFwJyxcclxuICAgICAgICBpc05vZGVTdHJpbmcgPSAnaXNOb2RlJyxcclxuICAgICAgICBpc0VsZW1lbnRTdHJpbmcgPSAnaXNFbGVtZW50JyxcclxuICAgICAgICBkID0gdHlwZW9mIGRvY3VtZW50ID09PSBvYmogPyBkb2N1bWVudCA6IHt9LFxyXG4gICAgICAgIGlzVHlwZSA9IGZ1bmN0aW9uKGEsIHR5cGUpe1xyXG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIGEgPT09IHR5cGU7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc05vZGUgPSB0eXBlb2YgTm9kZSA9PT0gZm4gPyBmdW5jdGlvbiAob2JqZWN0KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBvYmplY3QgaW5zdGFuY2VvZiBOb2RlO1xyXG4gICAgICAgIH0gOlxyXG4gICAgICAgIC8vIGluIElFIDw9IDggTm9kZSBpcyBhbiBvYmplY3QsIG9idmlvdXNseS4uXHJcbiAgICAgICAgZnVuY3Rpb24ob2JqZWN0KXtcclxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdCAmJlxyXG4gICAgICAgICAgICAgICAgaXNUeXBlKG9iamVjdCwgb2JqKSAmJlxyXG4gICAgICAgICAgICAgICAgKG5vZGVUeXBlIGluIG9iamVjdCkgJiZcclxuICAgICAgICAgICAgICAgIGlzVHlwZShvYmplY3Qub3duZXJEb2N1bWVudCxvYmopO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaXNFbGVtZW50ID0gZnVuY3Rpb24gKG9iamVjdCkge1xyXG4gICAgICAgICAgICByZXR1cm4gY3JlbFtpc05vZGVTdHJpbmddKG9iamVjdCkgJiYgb2JqZWN0W25vZGVUeXBlXSA9PT0gMTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGlzQXJyYXkgPSBmdW5jdGlvbihhKXtcclxuICAgICAgICAgICAgcmV0dXJuIGEgaW5zdGFuY2VvZiBBcnJheTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGFwcGVuZENoaWxkID0gZnVuY3Rpb24oZWxlbWVudCwgY2hpbGQpIHtcclxuICAgICAgICAgIGlmKCFjcmVsW2lzTm9kZVN0cmluZ10oY2hpbGQpKXtcclxuICAgICAgICAgICAgICBjaGlsZCA9IGQuY3JlYXRlVGV4dE5vZGUoY2hpbGQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxlbWVudC5hcHBlbmRDaGlsZChjaGlsZCk7XHJcbiAgICAgICAgfTtcclxuXHJcblxyXG4gICAgZnVuY3Rpb24gY3JlbCgpe1xyXG4gICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzLCAvL05vdGU6IGFzc2lnbmVkIHRvIGEgdmFyaWFibGUgdG8gYXNzaXN0IGNvbXBpbGVycy4gU2F2ZXMgYWJvdXQgNDAgYnl0ZXMgaW4gY2xvc3VyZSBjb21waWxlci4gSGFzIG5lZ2xpZ2FibGUgZWZmZWN0IG9uIHBlcmZvcm1hbmNlLlxyXG4gICAgICAgICAgICBlbGVtZW50ID0gYXJnc1swXSxcclxuICAgICAgICAgICAgY2hpbGQsXHJcbiAgICAgICAgICAgIHNldHRpbmdzID0gYXJnc1sxXSxcclxuICAgICAgICAgICAgY2hpbGRJbmRleCA9IDIsXHJcbiAgICAgICAgICAgIGFyZ3VtZW50c0xlbmd0aCA9IGFyZ3MubGVuZ3RoLFxyXG4gICAgICAgICAgICBhdHRyaWJ1dGVNYXAgPSBjcmVsW2F0dHJNYXBTdHJpbmddO1xyXG5cclxuICAgICAgICBlbGVtZW50ID0gY3JlbFtpc0VsZW1lbnRTdHJpbmddKGVsZW1lbnQpID8gZWxlbWVudCA6IGQuY3JlYXRlRWxlbWVudChlbGVtZW50KTtcclxuICAgICAgICAvLyBzaG9ydGN1dFxyXG4gICAgICAgIGlmKGFyZ3VtZW50c0xlbmd0aCA9PT0gMSl7XHJcbiAgICAgICAgICAgIHJldHVybiBlbGVtZW50O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoIWlzVHlwZShzZXR0aW5ncyxvYmopIHx8IGNyZWxbaXNOb2RlU3RyaW5nXShzZXR0aW5ncykgfHwgaXNBcnJheShzZXR0aW5ncykpIHtcclxuICAgICAgICAgICAgLS1jaGlsZEluZGV4O1xyXG4gICAgICAgICAgICBzZXR0aW5ncyA9IG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBzaG9ydGN1dCBpZiB0aGVyZSBpcyBvbmx5IG9uZSBjaGlsZCB0aGF0IGlzIGEgc3RyaW5nXHJcbiAgICAgICAgaWYoKGFyZ3VtZW50c0xlbmd0aCAtIGNoaWxkSW5kZXgpID09PSAxICYmIGlzVHlwZShhcmdzW2NoaWxkSW5kZXhdLCAnc3RyaW5nJykgJiYgZWxlbWVudFt0ZXh0Q29udGVudF0gIT09IHVuZGVmaW5lZCl7XHJcbiAgICAgICAgICAgIGVsZW1lbnRbdGV4dENvbnRlbnRdID0gYXJnc1tjaGlsZEluZGV4XTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgZm9yKDsgY2hpbGRJbmRleCA8IGFyZ3VtZW50c0xlbmd0aDsgKytjaGlsZEluZGV4KXtcclxuICAgICAgICAgICAgICAgIGNoaWxkID0gYXJnc1tjaGlsZEluZGV4XTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihjaGlsZCA9PSBudWxsKXtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaXNBcnJheShjaGlsZCkpIHtcclxuICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgY2hpbGQubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgICAgICAgICBhcHBlbmRDaGlsZChlbGVtZW50LCBjaGlsZFtpXSk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgIGFwcGVuZENoaWxkKGVsZW1lbnQsIGNoaWxkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yKHZhciBrZXkgaW4gc2V0dGluZ3Mpe1xyXG4gICAgICAgICAgICBpZighYXR0cmlidXRlTWFwW2tleV0pe1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudFtzZXRBdHRyaWJ1dGVdKGtleSwgc2V0dGluZ3Nba2V5XSk7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdmFyIGF0dHIgPSBhdHRyaWJ1dGVNYXBba2V5XTtcclxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBhdHRyID09PSBmbil7XHJcbiAgICAgICAgICAgICAgICAgICAgYXR0cihlbGVtZW50LCBzZXR0aW5nc1trZXldKTtcclxuICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRbc2V0QXR0cmlidXRlXShhdHRyLCBzZXR0aW5nc1trZXldKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVXNlZCBmb3IgbWFwcGluZyBvbmUga2luZCBvZiBhdHRyaWJ1dGUgdG8gdGhlIHN1cHBvcnRlZCB2ZXJzaW9uIG9mIHRoYXQgaW4gYmFkIGJyb3dzZXJzLlxyXG4gICAgY3JlbFthdHRyTWFwU3RyaW5nXSA9IHt9O1xyXG5cclxuICAgIGNyZWxbaXNFbGVtZW50U3RyaW5nXSA9IGlzRWxlbWVudDtcclxuXHJcbiAgICBjcmVsW2lzTm9kZVN0cmluZ10gPSBpc05vZGU7XHJcblxyXG4gICAgcmV0dXJuIGNyZWw7XHJcbn0pKTtcclxuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbi8qIGdsb2JhbCB3aW5kb3c6IGZhbHNlICovXG4vKiBnbG9iYWwgbmF2aWdhdG9yOiBmYWxzZSAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBicm93c2VyID0gcmVxdWlyZSgnZGV0ZWN0LWJyb3dzZXInKTtcblxuLyoqXG4gICMjIyBgcnRjLWNvcmUvZGV0ZWN0YFxuXG4gIEEgYnJvd3NlciBkZXRlY3Rpb24gaGVscGVyIGZvciBhY2Nlc3NpbmcgcHJlZml4LWZyZWUgdmVyc2lvbnMgb2YgdGhlIHZhcmlvdXNcbiAgV2ViUlRDIHR5cGVzLlxuXG4gICMjIyBFeGFtcGxlIFVzYWdlXG5cbiAgSWYgeW91IHdhbnRlZCB0byBnZXQgdGhlIG5hdGl2ZSBgUlRDUGVlckNvbm5lY3Rpb25gIHByb3RvdHlwZSBpbiBhbnkgYnJvd3NlclxuICB5b3UgY291bGQgZG8gdGhlIGZvbGxvd2luZzpcblxuICBgYGBqc1xuICB2YXIgZGV0ZWN0ID0gcmVxdWlyZSgncnRjLWNvcmUvZGV0ZWN0Jyk7IC8vIGFsc28gYXZhaWxhYmxlIGluIHJ0Yy9kZXRlY3RcbiAgdmFyIFJUQ1BlZXJDb25uZWN0aW9uID0gZGV0ZWN0KCdSVENQZWVyQ29ubmVjdGlvbicpO1xuICBgYGBcblxuICBUaGlzIHdvdWxkIHByb3ZpZGUgd2hhdGV2ZXIgdGhlIGJyb3dzZXIgcHJlZml4ZWQgdmVyc2lvbiBvZiB0aGVcbiAgUlRDUGVlckNvbm5lY3Rpb24gaXMgYXZhaWxhYmxlIChgd2Via2l0UlRDUGVlckNvbm5lY3Rpb25gLFxuICBgbW96UlRDUGVlckNvbm5lY3Rpb25gLCBldGMpLlxuKiovXG52YXIgZGV0ZWN0ID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0YXJnZXQsIG9wdHMpIHtcbiAgdmFyIGF0dGFjaCA9IChvcHRzIHx8IHt9KS5hdHRhY2g7XG4gIHZhciBwcmVmaXhJZHg7XG4gIHZhciBwcmVmaXg7XG4gIHZhciB0ZXN0TmFtZTtcbiAgdmFyIGhvc3RPYmplY3QgPSB0aGlzIHx8ICh0eXBlb2Ygd2luZG93ICE9ICd1bmRlZmluZWQnID8gd2luZG93IDogdW5kZWZpbmVkKTtcblxuICAvLyBpbml0aWFsaXNlIHRvIGRlZmF1bHQgcHJlZml4ZXNcbiAgLy8gKHJldmVyc2Ugb3JkZXIgYXMgd2UgdXNlIGEgZGVjcmVtZW50aW5nIGZvciBsb29wKVxuICB2YXIgcHJlZml4ZXMgPSAoKG9wdHMgfHwge30pLnByZWZpeGVzIHx8IFsnbXMnLCAnbycsICdtb3onLCAnd2Via2l0J10pLmNvbmNhdCgnJyk7XG5cbiAgLy8gaWYgd2UgaGF2ZSBubyBob3N0IG9iamVjdCwgdGhlbiBhYm9ydFxuICBpZiAoISBob3N0T2JqZWN0KSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBwcmVmaXhlcyBhbmQgcmV0dXJuIHRoZSBjbGFzcyBpZiBmb3VuZCBpbiBnbG9iYWxcbiAgZm9yIChwcmVmaXhJZHggPSBwcmVmaXhlcy5sZW5ndGg7IHByZWZpeElkeC0tOyApIHtcbiAgICBwcmVmaXggPSBwcmVmaXhlc1twcmVmaXhJZHhdO1xuXG4gICAgLy8gY29uc3RydWN0IHRoZSB0ZXN0IGNsYXNzIG5hbWVcbiAgICAvLyBpZiB3ZSBoYXZlIGEgcHJlZml4IGVuc3VyZSB0aGUgdGFyZ2V0IGhhcyBhbiB1cHBlcmNhc2UgZmlyc3QgY2hhcmFjdGVyXG4gICAgLy8gc3VjaCB0aGF0IGEgdGVzdCBmb3IgZ2V0VXNlck1lZGlhIHdvdWxkIHJlc3VsdCBpbiBhXG4gICAgLy8gc2VhcmNoIGZvciB3ZWJraXRHZXRVc2VyTWVkaWFcbiAgICB0ZXN0TmFtZSA9IHByZWZpeCArIChwcmVmaXggP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHRhcmdldC5zbGljZSgxKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0KTtcblxuICAgIGlmICh0eXBlb2YgaG9zdE9iamVjdFt0ZXN0TmFtZV0gIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIC8vIHVwZGF0ZSB0aGUgbGFzdCB1c2VkIHByZWZpeFxuICAgICAgZGV0ZWN0LmJyb3dzZXIgPSBkZXRlY3QuYnJvd3NlciB8fCBwcmVmaXgudG9Mb3dlckNhc2UoKTtcblxuICAgICAgaWYgKGF0dGFjaCkge1xuICAgICAgICAgaG9zdE9iamVjdFt0YXJnZXRdID0gaG9zdE9iamVjdFt0ZXN0TmFtZV07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBob3N0T2JqZWN0W3Rlc3ROYW1lXTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIGRldGVjdCBtb3ppbGxhICh5ZXMsIHRoaXMgZmVlbHMgZGlydHkpXG5kZXRlY3QubW96ID0gdHlwZW9mIG5hdmlnYXRvciAhPSAndW5kZWZpbmVkJyAmJiAhIW5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWE7XG5cbi8vIHNldCB0aGUgYnJvd3NlciBhbmQgYnJvd3NlciB2ZXJzaW9uXG5kZXRlY3QuYnJvd3NlciA9IGJyb3dzZXIubmFtZTtcbmRldGVjdC5icm93c2VyVmVyc2lvbiA9IGRldGVjdC52ZXJzaW9uID0gYnJvd3Nlci52ZXJzaW9uO1xuIiwidmFyIGJyb3dzZXJzID0gW1xuICBbICdjaHJvbWUnLCAvQ2hyb20oPzplfGl1bSlcXC8oWzAtOVxcLl0rKSg6P1xcc3wkKS8gXSxcbiAgWyAnZmlyZWZveCcsIC9GaXJlZm94XFwvKFswLTlcXC5dKykoPzpcXHN8JCkvIF0sXG4gIFsgJ29wZXJhJywgL09wZXJhXFwvKFswLTlcXC5dKykoPzpcXHN8JCkvIF0sXG4gIFsgJ2llJywgL1RyaWRlbnRcXC83XFwuMC4qcnZcXDooWzAtOVxcLl0rKVxcKS4qR2Vja28kLyBdLFxuICBbICdpZScsIC9NU0lFXFxzKFswLTlcXC5dKyk7LipUcmlkZW50XFwvWzQtN10uMC8gXSxcbiAgWyAnaWUnLCAvTVNJRVxccyg3XFwuMCkvIF0sXG4gIFsgJ2JiMTAnLCAvQkIxMDtcXHNUb3VjaC4qVmVyc2lvblxcLyhbMC05XFwuXSspLyBdLFxuICBbICdhbmRyb2lkJywgL0FuZHJvaWRcXHMoWzAtOVxcLl0rKS8gXSxcbiAgWyAnaW9zJywgL2lQYWRcXDtcXHNDUFVcXHNPU1xccyhbMC05XFwuX10rKS8gXSxcbiAgWyAnaW9zJywgIC9pUGhvbmVcXDtcXHNDUFVcXHNpUGhvbmVcXHNPU1xccyhbMC05XFwuX10rKS8gXSxcbiAgWyAnc2FmYXJpJywgL1NhZmFyaVxcLyhbMC05XFwuX10rKS8gXVxuXTtcblxudmFyIG1hdGNoID0gYnJvd3NlcnMubWFwKG1hdGNoKS5maWx0ZXIoaXNNYXRjaClbMF07XG52YXIgcGFydHMgPSBtYXRjaCAmJiBtYXRjaFszXS5zcGxpdCgvWy5fXS8pLnNsaWNlKDAsMyk7XG5cbndoaWxlIChwYXJ0cyAmJiBwYXJ0cy5sZW5ndGggPCAzKSB7XG4gIHBhcnRzLnB1c2goJzAnKTtcbn1cblxuLy8gc2V0IHRoZSBuYW1lIGFuZCB2ZXJzaW9uXG5leHBvcnRzLm5hbWUgPSBtYXRjaCAmJiBtYXRjaFswXTtcbmV4cG9ydHMudmVyc2lvbiA9IHBhcnRzICYmIHBhcnRzLmpvaW4oJy4nKTtcblxuZnVuY3Rpb24gbWF0Y2gocGFpcikge1xuICByZXR1cm4gcGFpci5jb25jYXQocGFpclsxXS5leGVjKG5hdmlnYXRvci51c2VyQWdlbnQpKTtcbn1cblxuZnVuY3Rpb24gaXNNYXRjaChwYWlyKSB7XG4gIHJldHVybiAhIXBhaXJbMl07XG59XG4iLCJ2YXIgZGV0ZWN0ID0gcmVxdWlyZSgnLi9kZXRlY3QnKTtcbnZhciByZXF1aXJlZEZ1bmN0aW9ucyA9IFtcbiAgJ2luaXQnXG5dO1xuXG5mdW5jdGlvbiBpc1N1cHBvcnRlZChwbHVnaW4pIHtcbiAgcmV0dXJuIHBsdWdpbiAmJiB0eXBlb2YgcGx1Z2luLnN1cHBvcnRlZCA9PSAnZnVuY3Rpb24nICYmIHBsdWdpbi5zdXBwb3J0ZWQoZGV0ZWN0KTtcbn1cblxuZnVuY3Rpb24gaXNWYWxpZChwbHVnaW4pIHtcbiAgdmFyIHN1cHBvcnRlZEZ1bmN0aW9ucyA9IHJlcXVpcmVkRnVuY3Rpb25zLmZpbHRlcihmdW5jdGlvbihmbikge1xuICAgIHJldHVybiB0eXBlb2YgcGx1Z2luW2ZuXSA9PSAnZnVuY3Rpb24nO1xuICB9KTtcblxuICByZXR1cm4gc3VwcG9ydGVkRnVuY3Rpb25zLmxlbmd0aCA9PT0gcmVxdWlyZWRGdW5jdGlvbnMubGVuZ3RoO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHBsdWdpbnMpIHtcbiAgcmV0dXJuIFtdLmNvbmNhdChwbHVnaW5zIHx8IFtdKS5maWx0ZXIoaXNTdXBwb3J0ZWQpLmZpbHRlcihpc1ZhbGlkKVswXTtcbn1cbiIsIi8qKlxuICAjIHJ0Yy1maWx0ZXItZ3JheXNjYWxlXG5cbiAgQSBzaW1wbGUgZ3JheXNjYWxlIGZpbHRlciBmb3IgdXNlIHdpdGggdGhlXG4gIFtydGMtdmlkZW9wcm9jXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy12aWRlb3Byb2MpIG1vZHVsZS5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgVGhlIGZvbGxvd2luZyBleGFtcGxlIGNhbiBiZSBydW4gdXNpbmdcbiAgW2JlZWZ5XShodHRwczovL2dpdGh1Yi5jb20vY2hyaXNkaWNraW5zb24vYmVlZnkpIChgYmVlZnkgZXhhbXBsZS5qc2ApOlxuXG4gIDw8PCBleGFtcGxlLmpzXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpbWFnZURhdGEpIHtcbiAgdmFyIGNoYW5uZWxzID0gaW1hZ2VEYXRhLmRhdGE7XG4gIHZhciByZ2IgPSBbXTtcbiAgdmFyIHJnYkF2ZztcbiAgdmFyIGFscGhhO1xuICB2YXIgaWk7XG5cbiAgLy8gY2hlY2sgdGhhdCB3ZSBoYXZlIGNoYW5uZWxzIGlzIGRpdmlzaWJsZSBieSBmb3VyIChqdXN0IGFzIGEgc2FmZXR5KVxuICBpZiAoY2hhbm5lbHMubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgZGF0YVxuICAvLyBOT1RFOiBkZWNyZW1lbnRpbmcgbG9vcHMgYXJlIGZhc3QgYnV0IHlvdSBuZWVkIHRvIGtub3cgdGhhdCB5b3Ugd2lsbFxuICAvLyBoaXQgMCB1c2luZyB0aGlzIGxvZ2ljIG90aGVyd2lzZSBpdCB3aWxsIHJ1biBmb3JldmVyIChvbmx5IDAgaXMgZmFsc3kpXG4gIGZvciAoaWkgPSBjaGFubmVscy5sZW5ndGg7IGlpIC09IDQ7ICkge1xuICAgIC8vIGdldCB0aGUgcmdiIHR1cGxlXG4gICAgcmdiID0gW2NoYW5uZWxzW2lpXSwgY2hhbm5lbHNbaWkgKyAxXSwgY2hhbm5lbHNbaWkgKyAyXV07XG5cbiAgICAvLyBnZXQgdGhlIGFscGhhIHZhbHVlXG4gICAgYWxwaGEgPSBjaGFubmVsc1tpaSArIDNdO1xuXG4gICAgLy8gY2FsY3VsYXRlIHRoZSByZ2IgYXZlcmFnZVxuICAgIHJnYkF2ZyA9IChyZ2JbMF0gKyByZ2JbMV0gKyByZ2JbMl0gKSAvIDM7XG5cbiAgICAvLyB1cGRhdGUgdGhlIHZhbHVlcyB0byB0aGUgcmdiIGF2ZXJhZ2VcbiAgICBjaGFubmVsc1tpaV0gPSBjaGFubmVsc1tpaSArIDFdID0gY2hhbm5lbHNbaWkgKyAyXSA9IHJnYkF2ZztcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTsiLCJ2YXIgY2FwdHVyZSA9IHJlcXVpcmUoJ3J0Yy1jYXB0dXJlJyk7XG52YXIgYXR0YWNoID0gcmVxdWlyZSgncnRjLWF0dGFjaCcpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcblxuLyoqXG4gICMgcnRjLW1lZGlhXG5cbiAgVGhpcyBpcyBhIGNvbnZlbmllbmNlIGZ1bmN0aW9uIGZvciBpbnZva2luZyBtZWRpYSBjYXB0dXJlIGFuZCByZW5kZXJpbmdcbiAgdXNpbmcgdGhlIFtgcnRjLWNhcHR1cmVgXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1jYXB0dXJlKSBhbmRcbiAgW2BydGMtYXR0YWNoYF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtYXR0YWNoKSBwYWNrYWdlcyByZXNwZWN0aXZlbHlcbiAgd2l0aGluIGFuIGFwcGxpY2F0aW9uLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICBEZWZhdWx0IGNvbnN0cmFpbnRzIGB7IGF1ZGlvOiB0cnVlLCB2aWRlbzogdHJ1ZSB9YCBjYXB0dXJlIGFuZCByZW5kZXJpbmdcbiAgYW4gbmV3IHZpZGVvIGVsZW1lbnQgd2l0aGluIHRoZSBkb2N1bWVudC5ib2R5OlxuXG4gIDw8PCBleGFtcGxlcy9yZW5kZXItdG8tYm9keS5qc1xuXG4gIEluIHRoZSBldmVudCB0aGF0IHlvdSB3aXNoIHRvIG1ha2UgdXNlIG9mIGFueSBvZiB0aGUgcnRjLmlvIHBsdWdpbnMsIHRoZW5cbiAgdGhlIGZvbGxvd2luZyBleGFtcGxlIGRlbW9uc3RyYXRlcyBob3cgdG8gcHJvdmlkZSBhIHNpbmdsZSBcImNhcHR1cmUgYW5kXG4gIHJlbmRlclwiIGNhbGwgdGhhdCB3aWxsIHdvcmsgd2l0aCBhIHBsdWdpbjpcblxuICA8PDwgZXhhbXBsZXMvcGx1Z2luLmpzXG5cbioqL1xuXG52YXIgbWVkaWEgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgLy8gZG8gd2UgaGF2ZSBjb25zdHJhaW50c1xuICB2YXIgY29uc3RyYWludHMgPSAob3B0cyB8fCB7fSkuY29uc3RyYWludHMgfHwgeyB2aWRlbzogdHJ1ZSwgYXVkaW86IHRydWUgfTtcblxuICAvLyBvciBkbyB3ZSBoYXZlIGEgc3RyZWFtXG4gIHZhciBzdHJlYW0gPSAob3B0cyB8fCB7fSkuc3RyZWFtO1xuXG4gIC8vIGlmIHdlIGhhdmUgYmVlbiBwYXNzZWQgY29uc3RyYWludHMsIGFzc3VtZSB3ZSBhcmUgYXR0YWNoaW5nIGEgbG9jYWwgc3RyZWFtXG4gIC8vIG90aGVyd2lzZSwgdXNlIHRoZSBnZW5lcmljIGF0dGFjaCBvcHRpb25zXG4gIHZhciBzdHJlYW1BdHRhY2ggPSAob3B0cyB8fCB7fSkuY29uc3RyYWludHMgPyBhdHRhY2gubG9jYWwgOiBhdHRhY2g7XG5cbiAgLy8gZGV0ZWN0IGEgdGFyZ2V0XG4gIHZhciB0YXJnZXQgPSAob3B0cyB8fCB7fSkudGFyZ2V0IHx8IGRvY3VtZW50LmJvZHk7XG4gIHZhciBub25NZWRpYVRhcmdldCA9ICEodGFyZ2V0IGluc3RhbmNlb2YgSFRNTE1lZGlhRWxlbWVudCk7XG5cbiAgZnVuY3Rpb24gaGFuZGxlQXR0YWNoKGVyciwgZWwpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRhcmdldCAmJiBub25NZWRpYVRhcmdldCAmJiB0YXJnZXQgIT09IGVsKSB7XG4gICAgICB0YXJnZXQuYXBwZW5kQ2hpbGQoZWwpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHdlIGhhdmUgYSBzdHJlYW0sIG1vdmUgb250byByZW5kZXJpbmcgaW1tZWRpYXRlbHlcbiAgaWYgKHN0cmVhbSkge1xuICAgIHJldHVybiBzdHJlYW1BdHRhY2goc3RyZWFtLCBvcHRzLCBoYW5kbGVBdHRhY2gpO1xuICB9XG5cbiAgcmV0dXJuIGNhcHR1cmUoY29uc3RyYWludHMsIG9wdHMsIGZ1bmN0aW9uKGVyciwgc3RyZWFtKSB7XG4gICAgc3RyZWFtQXR0YWNoKHN0cmVhbSwgb3B0cywgaGFuZGxlQXR0YWNoKTtcbiAgfSk7XG59O1xuXG5tZWRpYS5jYXB0dXJlID0gZnVuY3Rpb24oY29uc3RyYWludHMsIG9wdHMpIHtcbiAgcmV0dXJuIG1lZGlhKGV4dGVuZCh7fSwgb3B0cywgeyBjb25zdHJhaW50czogY29uc3RyYWludHMgfSkpO1xufTtcblxubWVkaWEuYXR0YWNoID0gbWVkaWEucmVuZGVyID0gZnVuY3Rpb24oc3RyZWFtLCBvcHRzKSB7XG4gIHJldHVybiBtZWRpYShleHRlbmQoe30sIG9wdHMsIHsgc3RyZWFtOiBzdHJlYW0gfSkpO1xufTtcbiIsInZhciBwbHVnaW4gPSByZXF1aXJlKCdydGMtY29yZS9wbHVnaW4nKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG5cbi8qKlxuICAjIHJ0Yy1hdHRhY2hcblxuICBSb3VnaGx5IGVxdWl2YWxlbnQgdG8gdGhlXG4gIFtgYXR0YWNoTWVkaWFTdHJlYW1gXShodHRwczovL3d3dy5ucG1qcy5vcmcvcGFja2FnZS9hdHRhY2htZWRpYXN0cmVhbSlcbiAgcGFja2FnZSBidXQgd2l0aCBzdXBwb3J0IGZvciBydGMuaW8gcGx1Z2lucy4gIEFsc28gdXNlcyBhbiBlcnJvciBmaXJzdFxuICBhc3luYyBBUEkgdG8gYWxsb3cgcGx1Z2lucyB0aW1lIHRvIGluaXRpYWxpemUuXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIDw8PCBleGFtcGxlcy9zaW1wbGUuanNcblxuICAjIyBFeGFtcGxlIHVzaW5nIFBsdWdpbnNcblxuICA8PDwgZXhhbXBsZXMvcGx1Z2lucy5qc1xuXG4gICMjIFJlZmVyZW5jZVxuXG4gICMjIyBgYXR0YWNoKHN0cmVhbSwgb3B0cz8sIGNhbGxiYWNrKWBcblxuICBBdHRhY2ggYHN0cmVhbWAgdG8gYSBIVE1MIGVsZW1lbnQgdGhhdCB3aWxsIHJlbmRlciB0aGUgY29udGVudC4gVGhlIHByb3ZpZGVkXG4gIGBjYWxsYmFja2AgZm9sbG93cyB0aGUgZm9ybWF0IG9mIGBmbihlcnIsIGVsZW1lbnQpYC4gIFdoaWxlIHRoZSBhc3luYyBuYXR1cmVcbiAgb2YgdGhpcyBwYWNrYWdlIG1heSBzZWVtIG9kZCwgYmVjYXVzZSBhIHBsdWdpbiBtYXkgbmVlZCB0aW1lIHRvIGluaXRpYWxpemVcbiAgdGhpcyBjYXRlcnMgZm9yIHRoaXMgY2FzZSBpbiBhZGRpdGlvbiB0byBzdGFuZGFyZCB1c2FnZSBpbiB0aGUgYnJvd3Nlci5cblxuICAtIGBhdXRvcGxheWAgKGRlZmF1bHQ6IGB0cnVlYCkgLSBieSBkZWZhdWx0IGFmdGVyIHRoZSBzdHJlYW0gaGFzIGJlZW5cbiAgICBhdHRhY2hlZCB0byB0aGUgZWxlbWVudCBpdCB3aWxsIGJlIHBsYXllZC4gIFRoaXMgaXMgZG9uZSBieSBjYWxsaW5nXG4gICAgdGhlIGBwbGF5KClgIGZ1bmN0aW9uIG9uIHRoZSBlbGVtZW50IHJhdGhlciB0aGFuIHJlbHlpbmcgb24gYGF1dG9wbGF5YFxuICAgIGF0dHJpYnV0ZSBmdW5jdGlvbmFsaXR5LlxuXG4gIC0gYGVsYCAoZGVmYXVsdDogYG51bGxgKSAtIGlmIHlvdSB3aXRoIHRvIHN1cHBseSBhbiBlbGVtZW50IHRvIGJlIHVzZWRcbiAgICBpbnN0ZWFkIG9mIGNyZWF0aW5nIGEgbmV3IGVsZW1lbnQgdG8gcmVjZWl2ZSB0aGUgc3RyZWFtIHNwZWNpZnkgaXQgaGVyZS5cblxuICAtIGBtdXRlZGAgKGRlZmF1bHQ6IGBmYWxzZWApIC0gd2hldGhlciB0aGUgY3JlYXRlZCBlbGVtZW50IHNob3VsZCBiZSBtdXRlZFxuICAgIG9yIG5vdC4gIEZvciBsb2NhbCBzdHJlYW1zIHRoaXMgc2hvdWxkIGFsbW9zdCBhbHdheXMsIGJlIHRydWUgc28gY29uc2lkZXJcbiAgICB1c2luZyB0aGUgYGF0dGFjaC5sb2NhbGAgaGVscGVyIGZ1bmN0aW9uIGZvciBzaW1wbGUgY2FzZXMuXG5cbiAgLSBgcGx1Z2luc2AgKGRlZmF1bHQ6IGBbXWApIC0gc3BlY2lmeSBvbmUgb3IgbW9yZSBwbHVnaW5zIHRoYXQgY2FuIGJlIHVzZWRcbiAgICB0byByZW5kZXIgdGhlIG1lZGlhIHN0cmVhbSBhcHByb3ByaWF0ZSB0byB0aGUgY3VycmVudCBwbGF0Zm9ybSBpbiB0aGVcbiAgICBldmVudCB0aGF0IFdlYlJUQyBhbmQvb3IgbWVkaWEgY2FwdHVyZSBpcyBzdXBwb3J0ZWQgdmlhIGEgYnJvd3NlciBwbHVnaW4uXG5cbioqL1xudmFyIGF0dGFjaCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc3RyZWFtLCBvcHRzLCBjYWxsYmFjaykge1xuICB2YXIgVVJMID0gdHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuVVJMO1xuICB2YXIgcGluc3Q7XG5cbiAgaWYgKHR5cGVvZiBvcHRzID09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IG9wdHM7XG4gICAgb3B0cyA9IHt9O1xuICB9XG5cbiAgZnVuY3Rpb24gYXBwbHlNb2RpZmljYXRpb25zKGVsLCBvKSB7XG4gICAgaWYgKChvIHx8IHt9KS5tdXRlZCkge1xuICAgICAgZWwubXV0ZWQgPSB0cnVlO1xuICAgICAgZWwuc2V0QXR0cmlidXRlKCdtdXRlZCcsICcnKTtcbiAgICB9XG5cbiAgICBpZiAoKG8gfHwge30pLm1pcnJvcikge1xuICAgICAgZWwuc2V0QXR0cmlidXRlKCdkYXRhLW1pcnJvcmVkJywgdHJ1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVsO1xuICB9XG5cbiAgZnVuY3Rpb24gYXR0YWNoVG9FbGVtZW50KHMsIG8pIHtcbiAgICB2YXIgYXV0b3BsYXkgPSAobyB8fCB7fSkuYXV0b3BsYXk7XG4gICAgdmFyIGVsVHlwZSA9ICdhdWRpbyc7XG4gICAgdmFyIGVsID0gKG8gfHwge30pLmVsIHx8IChvIHx8IHt9KS50YXJnZXQ7XG5cbiAgICAvLyBjaGVjayB0aGUgc3RyZWFtIGlzIHZhbGlkXG4gICAgdmFyIGlzVmFsaWQgPSBzICYmIHR5cGVvZiBzLmdldFZpZGVvVHJhY2tzID09ICdmdW5jdGlvbic7XG5cbiAgICAvLyBkZXRlcm1pbmUgdGhlIGVsZW1lbnQgdHlwZVxuICAgIGlmIChpc1ZhbGlkICYmIHMuZ2V0VmlkZW9UcmFja3MoKS5sZW5ndGggPiAwKSB7XG4gICAgICBlbFR5cGUgPSAndmlkZW8nO1xuICAgIH1cblxuICAgIC8vIGlmIHdlIGhhdmUgYmVlbiBwYXNzZWQgYW4gXCJ1bnBsYXlhYmxlXCIgdGFyZ2V0IGNyZWF0ZSBhIG5ldyBlbGVtZW50XG4gICAgaWYgKGVsICYmIHR5cGVvZiBlbC5wbGF5ICE9ICdmdW5jdGlvbicpIHtcbiAgICAgIGVsID0gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBwcmVwYXJlIHRoZSBlbGVtZW50XG4gICAgZWwgPSBlbCB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGVsVHlwZSk7XG5cbiAgICAvLyBhdHRhY2ggdGhlIHN0cmVhbVxuICAgIGlmIChVUkwgJiYgVVJMLmNyZWF0ZU9iamVjdFVSTCkge1xuICAgICAgZWwuc3JjID0gVVJMLmNyZWF0ZU9iamVjdFVSTChzdHJlYW0pO1xuICAgIH1cbiAgICBlbHNlIGlmIChlbC5zcmNPYmplY3QpIHtcbiAgICAgIGVsLnNyY09iamVjdCA9IHN0cmVhbTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZWwubW96U3JjT2JqZWN0KSB7XG4gICAgICBlbC5tb3pTcmNPYmplY3QgPSBzdHJlYW07XG4gICAgfVxuXG4gICAgaWYgKGF1dG9wbGF5ID09PSB1bmRlZmluZWQgfHwgYXV0b3BsYXkpIHtcbiAgICAgIGVsLnNldEF0dHJpYnV0ZSgnYXV0b3BsYXknLCAnJyk7XG4gICAgICBlbC5wbGF5KCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwcGx5TW9kaWZpY2F0aW9ucyhlbCwgbyk7XG4gIH1cblxuICAvLyBzZWUgaWYgd2UgYXJlIHVzaW5nIGEgcGx1Z2luXG4gIHBpbnN0ID0gcGx1Z2luKChvcHRzIHx8IHt9KS5wbHVnaW5zKTtcbiAgaWYgKHBpbnN0KSB7XG4gICAgcmV0dXJuIHBpbnN0LmluaXQob3B0cywgZnVuY3Rpb24oZXJyKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIHBpbnN0LmF0dGFjaCAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ3BsdWdpbiBtdXN0IHN1cHBvcnQgdGhlIGF0dGFjaCBmdW5jdGlvbicpKTtcbiAgICAgIH1cblxuICAgICAgY2FsbGJhY2sobnVsbCwgYXBwbHlNb2RpZmljYXRpb25zKHBpbnN0LmF0dGFjaChzdHJlYW0sIG9wdHMpLCBvcHRzKSk7XG4gICAgfSk7XG4gIH1cblxuICBjYWxsYmFjayhudWxsLCBhdHRhY2hUb0VsZW1lbnQoc3RyZWFtLCBvcHRzKSk7XG59O1xuXG4vKipcbiAgIyMjIGBhdHRhY2gubG9jYWwoc3RyZWFtLCBvcHRzPywgY2FsbGJhY2spYFxuXG4gIEF0dGFjaCBhIGxvY2FsIHN0cmVhbSB3aXRoIG9wdGlvbnMgYXBwcm9wcmlhdGUgZm9yIGxvY2FsIHN0cmVhbXM6XG5cbiAgLSBgbXV0ZWRgOiBgdHJ1ZWBcblxuKiovXG5hdHRhY2gubG9jYWwgPSBmdW5jdGlvbihzdHJlYW0sIG9wdHMsIGNhbGxiYWNrKSB7XG4gIGlmICh0eXBlb2Ygb3B0cyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRzO1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIGF0dGFjaChzdHJlYW0sIGV4dGVuZCh7IG11dGVkOiB0cnVlLCBtaXJyb3I6IHRydWUgfSwgb3B0cyksIGNhbGxiYWNrKTtcbn07XG4iLCJ2YXIgcGx1Z2luID0gcmVxdWlyZSgncnRjLWNvcmUvcGx1Z2luJyk7XG52YXIgZGV0ZWN0ID0gcmVxdWlyZSgncnRjLWNvcmUvZGV0ZWN0Jyk7XG5cbi8vIHBhdGNoIG5hdmlnYXRvciBnZXRVc2VyTWVkaWFcbm5hdmlnYXRvci5nZXRVc2VyTWVkaWEgPSBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhIHx8XG4gIGRldGVjdC5jYWxsKG5hdmlnYXRvciwgJ2dldFVzZXJNZWRpYScpO1xuXG4vKipcbiAgIyBydGMtY2FwdHVyZVxuXG4gIFJvdWdobHkgZXF1aXZhbGVudCB0byB0aGVcbiAgW2BnZXRVc2VyTWVkaWFgXShodHRwczovL3d3dy5ucG1qcy5vcmcvcGFja2FnZS9nZXR1c2VybWVkaWEpIHBhY2thZ2UgYnV0IHdpdGhcbiAgc3VwcG9ydCBmb3IgcnRjLmlvIHBsdWdpbnMuXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIDw8PCBleGFtcGxlcy9zaW1wbGUuanNcblxuICAjIyBFeGFtcGxlIHdpdGggdXNpbmcgUGx1Z2luc1xuXG4gIDw8PCBleGFtcGxlcy9wbHVnaW5zLmpzXG5cbiAgIyMgUmVmZXJlbmNlXG5cbiAgIyMjIGBjYXB0dXJlKGNvbnN0cmFpbnRzLCBvcHRzPywgY2FsbGJhY2spYFxuXG4gIENhcHR1cmUgbWVkaWEgd2l0aCB0aGUgc3VwcGxpZWQgYGNvbnN0cmFpbnRzYC4gIElmIGFuIGBvcHRzYCBhcmd1bWVudCBpc1xuICBzdXBwbGllZCBsb29rIGZvciBwbHVnaW5zIHRoYXQgbWF5IGNoYW5nZSB0aGUgYmVoYXZpb3VyIG9mIHRoZSBjYXB0dXJlXG4gIG9wZXJhdGlvbi5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbnN0cmFpbnRzLCBvcHRzLCBjYWxsYmFjaykge1xuICB2YXIgcGluc3Q7XG5cbiAgZnVuY3Rpb24gaGFuZGxlQ2FwdHVyZShzdHJlYW0pIHtcbiAgICBjYWxsYmFjayhudWxsLCBzdHJlYW0pO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBvcHRzID09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IG9wdHM7XG4gICAgb3B0cyA9IHt9O1xuICB9XG5cbiAgLy8gc2VlIGlmIHdlIGFyZSB1c2luZyBhIHBsdWdpblxuICBwaW5zdCA9IHBsdWdpbigob3B0cyB8fCB7fSkucGx1Z2lucyk7XG4gIGlmIChwaW5zdCkge1xuICAgIHJldHVybiBwaW5zdC5pbml0KG9wdHMsIGZ1bmN0aW9uKGVycikge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhICE9ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcigncGx1Z2luIGRvZXMgbm90IHN1cHBvcnQgbWVkaWEgY2FwdHVyZScpKTtcbiAgICAgIH1cblxuICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYShjb25zdHJhaW50cywgaGFuZGxlQ2FwdHVyZSwgY2FsbGJhY2spO1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhICE9ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdnZXRVc2VyTWVkaWEgbm90IHN1cHBvcnRlZCcpKTtcbiAgfVxuXG4gIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEoY29uc3RyYWludHMsIGhhbmRsZUNhcHR1cmUsIGNhbGxiYWNrKTtcbn07XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIGRvY3VtZW50OiBmYWxzZSAqL1xuLyogZ2xvYmFsIEhUTUxWaWRlb0VsZW1lbnQ6IGZhbHNlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBERUZBVUxUX0ZQUyA9IDI1O1xudmFyIHJhZiA9IHJlcXVpcmUoJ2Zkb20vcmFmJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xuXG4vKipcbiAgIyBydGMtdmlkZW9wcm9jXG5cbiAgVGhpcyBpcyBhIHNtYWxsIGhlbHBlciBtb2R1bGUgdGhhdCBhbGxvd3MgeW91IHRvIHN1YnN0aXR1dGUgYSB2aWRlb1xuICBlbGVtZW50IHdpdGggYSBjYW52YXMgZWxlbWVudC4gIFRoaXMgY2FuIGJlIHVzZWZ1bCB3aGVuIHlvdSB3YW50IHRvXG4gIGRvIHBpeGVsIG1hbmlwdWxhdGlvbiBvZiB0aGUgcmVuZGVyZWQgaW1hZ2VzLCBvciBpbiBzaXR1YXRpb25zIHdoZW5cbiAgYSB2aWRlbyBlbGVtZW50IGRvZXMgbm90IGJlaGF2ZSBhcyB5b3UgZXhwZWN0LlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICA8PDwgZXhhbXBsZXMvZ3JheXNjYWxlLWZpbHRlci5qc1xuXG4gICMjIFVzaW5nIHRoZSBQcm9jZXNzaW5nIFBpcGVsaW5lXG5cbiAgQSBwcm9jZXNzaW5nIHBpcGVsaW5lIGhhcyBiZWVuIGluY2x1ZGVkIHRvIGFzc2lzdCB3aXRoXG4gIG1hbmlwdWxhdGluZyB0aGUgY2FudmFzIG9uIHRoZSBmbHkuIFRvIHNwZWNpZnkgdGhlIGZpbHRlcnMgdG8gYmUgdXNlZFxuICBpbiB0aGUgcHJvY2Vzc2luZyBwaXBlbGluZSwgdGhpcyBpcyBkb25lIGluIHRoZSBvcHRpb25zIGFjY2VwdGVkIGJ5XG4gIHZpZGVvcHJvYy4gRWl0aGVyIHNwZWNpZnlpbmcgYW4gYXJyYXkgb2YgZmlsdGVycyB3aXRoIHRoZSBgZmlsdGVyc2Agb3B0aW9uXG4gIG9yIGEgc2luZ2xlIGZpbHRlciBmdW5jdGlvbiB3aXRoIHRoZSBgZmlsdGVyYCBvcHRpb24gaXMgZmluZS4gIElmIHlvdSB1c2VcbiAgYm90aCB0aGVuIHRoZSBpbmRpdmlkdWFsIGZpbHRlciB3aWxsIGJlIGFkZGVkIGZpbHRlciBsaXN0IGFuZCB1c2VkIGluXG4gIHNlcmllcy5cblxuICBgYGBqc1xuICB2aWRlb3Byb2Moc3JjVmlkZW8sIHRhcmdldENhbnZhcywge1xuICAgIGZpbHRlcnM6IFtcbiAgICAgIHJlcXVpcmUoJ3J0Yy1maWx0ZXItZ3JheXNjYWxlJyksXG4gICAgICBteUN1c3RvbUZpbHRlckZ1bmN0aW9uXG4gICAgXVxuICB9KTtcbiAgYGBgXG5cbiAgIyMgV3JpdGluZyBhIEZpbHRlciBGdW5jdGlvblxuXG4gIFdyaXRpbmcgYSBmaWx0ZXIgZnVuY3Rpb24gaXMgdmVyeSBzaW1wbGUsIGFuZCB0aGV5IHVzZSB0aGUgZm9sbG93aW5nXG4gIGZ1bmN0aW9uIHNpZ25hdHVyZTpcblxuICBgYGBqc1xuICBmdW5jdGlvbiBmaWx0ZXIoaW1hZ2VEYXRhLCB0aWNrKSB7XG4gIH1cbiAgYGBgXG5cbiAgVGhlIGBpbWFnZURhdGFgIGFyZyBpcyBhblxuICBbSW1hZ2VEYXRhXShodHRwOi8vd3d3LnczLm9yZy9UUi8yZGNvbnRleHQvI2ltYWdlZGF0YSksIGFuZCB0aGUgYHRpY2tgXG4gIGFyZ3VtZW50IHJlZmVycyB0byB0aGUgdGljayB0aGF0IGhhcyBiZWVuIGNhcHR1cmVkIGFzIHBhcnQgb2YgdGhlIGNhcHR1cmVcbiAgbG9vcCAoYmUgYXdhcmUgdGhhdCBpdCBjb3VsZCBiZSBhIGhpZ2ggcmVzb2x1dGlvbiB0aW1lciB2YWx1ZSBpZiByQUYgaXNcbiAgYmVpbmcgdXNlZCkuXG5cbiAgSWYgeW91IGFyZSB3cml0aW5nIGFuIGFuYWx5c2lzIGZpbHRlciwgdGhlbiBzaW1wbHkgZG8gd2hhdCB5b3UgbmVlZCB0byBkb1xuICBhbmQgZXhpdCB0aGUgZnVuY3Rpb24uICBJZiB5b3UgaGF2ZSB3cml0dGVuIGEgZmlsdGVyIHRoYXQgbW9kaWZpZXMgdGhlIHBpeGVsXG4gIGRhdGEgYW5kIHlvdSB3YW50IHRoaXMgZHJhd24gYmFjayB0byB0aGUgY2FudmFzIHRoZW4geW91ciAqKmZpbHRlciBtdXN0XG4gIHJldHVybiBgdHJ1ZWAqKiB0byB0ZWxsIGBydGMtdmlkZW9wcm9jYCB0aGF0IGl0IHNob3VsZCBkcmF3IHRoZSBpbWFnZURhdGFcbiAgYmFjayB0byB0aGUgY2FudmFzLlxuXG4gICMjIExpc3RlbmluZyBmb3IgY3VzdG9tIGBmcmFtZWAgZXZlbnRzXG5cbiAgSW4gYWRkaXRpb24gdG8gcHJvdmlkaW5nIHRoZSBvcHBvcnR1bml0eSB0byBhbmFseXNlIGFuZCBtb2RpZnkgcGl4ZWwgZGF0YVxuICB0aGUgYHJ0Yy12aWRlb3Byb2NgIG1vZHVsZSBhbHNvIHByb3ZpZGVzIHRoZSBhIGN1c3RvbSBgZnJhbWVgIGV2ZW50IGZvclxuICBkZXRlY3Rpbmcgd2hlbiBhIG5ldyBmcmFtZSBoYXMgYmVlbiBkcmF3biB0byB0aGUgY2FudmFzLlxuXG4gIEEgc2ltcGxlIGV4YW1wbGUgY2FuIGJlIGZvdW5kIGJlbG93OlxuXG4gIDw8PCBleGFtcGxlcy9mcmFtZWxpc3RlbmVyLmpzXG5cbiAgTk9URTogVGhlIGBmcmFtZWAgZXZlbnQgb2NjdXJzIGFmdGVyIHRoZSBmaWx0ZXIgcGlwZWxpbmUgaGFzIGJlZW4gcnVuIGFuZFxuICBhbmQgdGhlIGltYWdlRGF0YSBtYXkgaGF2ZSBiZWVuIG1vZGlmaWVkIGZyb20gdGhlIG9yaWdpbmFsIHZpZGVvIGZyYW1lLlxuXG4gICMjIEEgTm90ZSB3aXRoIFJlZ2FyZHMgdG8gQ1BVIFVzYWdlXG5cbiAgQnkgZGVmYXVsdCBydGMtdmlkZW9wcm9jIHdpbGwgZHJhdyBhdCAyNWZwcyBidXQgdGhpcyBjYW4gYmUgbW9kaWZpZWQgdG8gY2FwdHVyZVxuICBhdCBhIGxvd2VyIGZyYW1lIHJhdGUgZm9yIHNsb3dlciBkZXZpY2VzLCBvciBpbmNyZWFzZWQgaWYgeW91IGhhdmUgYVxuICBtYWNoaW5lIHdpdGggcGxlbnR5IG9mIGdydW50LlxuXG4gICMjIFJlZmVyZW5jZVxuXG4gICMjIyB2aWRlb3Byb2Moc3JjLCB0YXJnZXQsIG9wdHM/KVxuXG4gIENyZWF0ZSAob3IgcGF0Y2gpIGEgYDxjYW52YXM+YCBlbGVtZW50IHRoYXQgd2lsbCByZWNlaXZlIHRoZSB2aWRlbyBpbWFnZXNcbiAgZnJvbSBhIHZpZGVvIGVsZW1lbnQuICBUaGUgZm9sbG93aW5nIG9wdGlvbnMgYXJlIHN1cHBvcnRlZC5cblxuICAtIGBjYW52YXNgIC0gdGhlIGNhbnZhcyB0byBkcmF3IHZpZGVvIGRhdGEgdG8uICBJZiBub3Qgc3VwcGxpZWQgYSBuZXcgXG4gICAgY2FudmFzIGVsZW1lbnQgd2lsbCBiZSBjcmVhdGVkLlxuXG4gIC0gYHZpZGVvYCAtIHRoZSB2aWRlbyBlbGVtZW50IHRoYXQgd2lsbCBiZSB1c2VkIGFzIHRoZSBzb3VyY2Ugb2YgdGhlIHZpZGVvLlxuICAgICBJZiBub3Qgc3VwcGxpZWQgYSBuZXcgYDx2aWRlbz5gIGVsZW1lbnQgd2lsbCBiZSBjcmVhdGVkLlxuXG4gIC0gYGZwc2AgLSB0aGUgcmVkcmF3IHJhdGUgb2YgdGhlIGZha2UgdmlkZW8gKGRlZmF1bHQgPSAyNSlcblxuICAtIGBncmVlZHlgIC0gU3BlY2lmeSBgZ3JlZWR5OiB0cnVlYCBpZiB5b3Ugd2FudCB0aGUgdmlkZW9wcm9jIG1vZHVsZSB0byBydW5cbiAgICBpdCdzIGNhcHR1cmUgbG9vcCB1c2luZyBzZXRUaW1lb3V0IHJhdGhlciB0aGFuIGByZXF1ZXN0QW5pbWF0aW9uRnJhbWVgLlxuICAgIERvaW5nIHRoaXMgd2lsbCBtZWFuIHlvdSBhcHBsaWNhdGlvbiB3aWxsIGNvbnRpbnVlIHRvIGNhcHR1cmUgYW5kIHByb2Nlc3NcbiAgICBmcmFtZXMgZXZlbiB3aGVuIGl0J3MgdGFiIC8gd2luZG93IGJlY29tZXMgaW5hY3RpdmUuIFRoaXMgaXMgdXN1YWxseSB0aGVcbiAgICBkZXNpcmVkIGJlaGF2aW91ciB3aXRoIHZpZGVvIGNvbmZlcmVuY2luZyBhcHBsaWNhdGlvbnMuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzcmMsIHRhcmdldCwgb3B0cykge1xuICAvLyBjaGVjayBmb3IgYSB2YWxpZCBzb3VyY2VcbiAgdmFyIHZhbGlkU291cmNlID0gdHlwZW9mIHNyYyAhPSAndW5kZWZpbmVkJzsgLy8gVE9ETzogYmV0dGVyIGNoZWNrXG4gIHZhciByZXNpemVDYW52YXMgPSBmYWxzZTtcbiAgdmFyIGZwcztcbiAgdmFyIGdyZWVkeTtcbiAgdmFyIGdyZWVkeURlbGF5O1xuICB2YXIgZHJhd0RlbGF5O1xuXG4gIC8vIGNyZWF0ZSBhbiBldmVudCBlbWl0dGVyIGZvciB0aGUgcHJvY2Vzc29yIG9iamVjdFxuICB2YXIgcHJvY2Vzc29yID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gIC8vIGNoZWNrIGZvciBubyB0YXJnZXQgYnV0IG9wdHMgc3VwcGxpZWRcbiAgdmFyIHNoaWZ0QXJncyA9ICghIG9wdHMpICYmICghIHRhcmdldCkgfHxcbiAgICAodHlwZW9mIHRhcmdldCA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgdGFyZ2V0LmdldENvbnRleHQgIT0gJ2Z1bmN0aW9uJyk7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgZHJhdyBtZXRhZGF0YVxuICB2YXIgZHJhd1dpZHRoO1xuICB2YXIgZHJhd0hlaWdodDtcbiAgdmFyIGRyYXdYID0gMDtcbiAgdmFyIGRyYXdZID0gMDtcbiAgdmFyIGRyYXdEYXRhO1xuICB2YXIgbGFzdFRpY2sgPSAwO1xuICB2YXIgc291cmNlTW9uaXRvclRpbWVyID0gMDtcbiAgdmFyIGNvbnRleHQ7XG5cbiAgZnVuY3Rpb24gc3luY0NhbnZhcygpIHtcbiAgICB0YXJnZXQud2lkdGggPSBzcmMudmlkZW9XaWR0aDtcbiAgICB0YXJnZXQuaGVpZ2h0ID0gc3JjLnZpZGVvSGVpZ2h0O1xuICAgIGNhbGN1bGF0ZURyYXdSZWdpb24oKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNhbGN1bGF0ZURyYXdSZWdpb24oKSB7XG4gICAgdmFyIHNjYWxlO1xuICAgIHZhciBzY2FsZVg7XG4gICAgdmFyIHNjYWxlWTtcblxuICAgIC8vIGlmIGVpdGhlciB3aWR0aCBvciBoZWlnaHQgPT09IDAgdGhlbiBiYWlsXG4gICAgaWYgKHRhcmdldC53aWR0aCA9PT0gMCB8fCB0YXJnZXQuaGVpZ2h0ID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gY2FsY3VsYXRlIHJlcXVpcmVkIHNjYWxpbmdcbiAgICBzY2FsZSA9IE1hdGgubWluKFxuICAgICAgc2NhbGVYID0gKHRhcmdldC53aWR0aCAvIHNyYy52aWRlb1dpZHRoKSxcbiAgICAgIHNjYWxlWSA9ICh0YXJnZXQuaGVpZ2h0IC8gc3JjLnZpZGVvSGVpZ2h0KVxuICAgICk7XG5cbiAgICAvLyBjYWxjdWxhdGUgdGhlIHNjYWxlZCBkcmF3IHdpZHRoIGFuZCBoZWlnaHRcbiAgICBkcmF3V2lkdGggPSAoc3JjLnZpZGVvV2lkdGggKiBzY2FsZSkgfCAwO1xuICAgIGRyYXdIZWlnaHQgPSAoc3JjLnZpZGVvSGVpZ2h0ICogc2NhbGUpIHwgMDtcblxuICAgIC8vIGNhbGN1bGF0ZSB0aGUgb2Zmc2V0WCBhbmQgWVxuICAgIGRyYXdYID0gKHRhcmdldC53aWR0aCAtIGRyYXdXaWR0aCkgPj4gMTtcbiAgICBkcmF3WSA9ICh0YXJnZXQuaGVpZ2h0IC0gZHJhd0hlaWdodCkgPj4gMTtcblxuICAgIC8vIHNhdmUgdGhlIGRyYXcgZGF0YVxuICAgIGRyYXdEYXRhID0ge1xuICAgICAgeDogZHJhd1gsXG4gICAgICB5OiBkcmF3WSxcbiAgICAgIHdpZHRoOiBkcmF3V2lkdGgsXG4gICAgICBoZWlnaHQ6IGRyYXdIZWlnaHRcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gbW9uaXRvclNvdXJjZSgpIHtcbiAgICBjbGVhckludGVydmFsKHNvdXJjZU1vbml0b3JUaW1lcik7XG4gICAgc291cmNlTW9uaXRvclRpbWVyID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoc3JjLnZpZGVvV2lkdGggPiAwICYmIHNyYy52aWRlb0hlaWdodCA+IDApIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChzb3VyY2VNb25pdG9yVGltZXIpO1xuICAgICAgICBzeW5jQ2FudmFzKCk7XG4gICAgICB9XG4gICAgfSwgMTAwKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlZHJhdyh0aWNrKSB7XG4gICAgdmFyIGltYWdlRGF0YTtcbiAgICB2YXIgdHdlYWtlZDtcbiAgICB2YXIgZXZ0O1xuICAgIHZhciBwb3N0UHJvY2Vzc0V2dDtcbiAgICB2YXIgdHdlYWtlZCA9IGZhbHNlO1xuICAgIHZhciBmcmFtZUxpc3RlbmVycyA9IHByb2Nlc3Nvci5saXN0ZW5lcnMoJ2ZyYW1lJykubGVuZ3RoO1xuXG4gICAgLy8gZ2V0IHRoZSBjdXJyZW50IHRpY2tcbiAgICB0aWNrID0gdGljayB8fCBEYXRlLm5vdygpO1xuXG4gICAgLy8gb25seSBkcmF3IGFzIG9mdGVuIGFzIHNwZWNpZmllZCBpbiB0aGUgZnBzXG4gICAgaWYgKGRyYXdXaWR0aCAmJiBkcmF3SGVpZ2h0ICYmIHRpY2sgLSBsYXN0VGljayA+IGRyYXdEZWxheSkge1xuICAgICAgLy8gZHJhdyB0aGUgaW1hZ2VcbiAgICAgIGNvbnRleHQuZHJhd0ltYWdlKHNyYywgZHJhd1gsIGRyYXdZLCBkcmF3V2lkdGgsIGRyYXdIZWlnaHQpO1xuXG4gICAgICAvLyBpZiB3ZSBoYXZlIHByb2Nlc3NvcnMsIGdldCB0aGUgaW1hZ2UgZGF0YSBhbmQgcGFzcyBpdCB0aHJvdWdoXG4gICAgICBpZiAocHJvY2Vzc29yLmZpbHRlcnMubGVuZ3RoKSB7XG4gICAgICAgIHR3ZWFrZWQgPSBmYWxzZTtcbiAgICAgICAgaW1hZ2VEYXRhID0gY29udGV4dC5nZXRJbWFnZURhdGEoMCwgMCwgZHJhd1dpZHRoLCBkcmF3SGVpZ2h0KTtcblxuICAgICAgICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHByb2Nlc3NvcnNcbiAgICAgICAgcHJvY2Vzc29yLmZpbHRlcnMuZm9yRWFjaChmdW5jdGlvbihmaWx0ZXIpIHtcbiAgICAgICAgICB0d2Vha2VkID0gZmlsdGVyKGltYWdlRGF0YSwgdGljaywgY29udGV4dCwgdGFyZ2V0LCBkcmF3RGF0YSkgfHwgdHdlYWtlZDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHR3ZWFrZWQpIHtcbiAgICAgICAgICAvLyBUT0RPOiBkaXJ0eSBhcmVhXG4gICAgICAgICAgY29udGV4dC5wdXRJbWFnZURhdGEoaW1hZ2VEYXRhLCAwLCAwKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyB1cGRhdGUgdGhlIHByb2Nlc3NvciBpbWFnZURhdGFcbiAgICAgIHByb2Nlc3Nvci5pbWFnZURhdGEgPSBpbWFnZURhdGE7XG5cbiAgICAgIC8vIGVtaXQgdGhlIHByb2Nlc3NvciBmcmFtZSBldmVudFxuICAgICAgcHJvY2Vzc29yLmVtaXQoJ2ZyYW1lJywgdGljayk7XG5cbiAgICAgIC8vIHVwZGF0ZSB0aGUgbGFzdCB0aWNrXG4gICAgICBsYXN0VGljayA9IHRpY2s7XG4gICAgfVxuXG4gICAgLy8gcXVldWUgdXAgYW5vdGhlciByZWRyYXdcbiAgICBpZiAoZ3JlZWR5KSB7XG4gICAgICBzZXRUaW1lb3V0KHJlZHJhdywgZ3JlZWR5RGVsYXkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJhZihyZWRyYXcpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChzaGlmdEFyZ3MpIHtcbiAgICBvcHRzID0gdGFyZ2V0O1xuICAgIHRhcmdldCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICB9XG5cbiAgLy8gc2F2ZSB0aGUgdGFyZ2V0IHRvIHRoZSBjYW52YXMgcHJvcGVydHkgb2YgdGhlIHByb2Nlc3NvclxuICBwcm9jZXNzb3IuY2FudmFzID0gdGFyZ2V0O1xuICBjb250ZXh0ID0gcHJvY2Vzc29yLmNvbnRleHQgPSB0YXJnZXQuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBmcHNcbiAgZnBzID0gKG9wdHMgfHwge30pLmZwcyB8fCBERUZBVUxUX0ZQUztcbiAgZ3JlZWR5ID0gKG9wdHMgfHwge30pLmdyZWVkeTtcblxuICAvLyBzZXRUaW1lb3V0IHNob3VsZCBvY2N1ciBtb3JlIGZyZXF1ZW50bHkgdGhhbiB0aGUgZnBzXG4gIC8vIGRlbGF5IHNvIHdlIGdldCBjbG9zZSB0byB0aGUgZGVzaXJlZCBmcHNcbiAgZ3JlZWR5RGVsYXkgPSAoMTAwMCAvIGZwcykgPj4gMTtcblxuICAvLyBjYWxhY3VsYXRlIHRoZSBkcmF3IGRlbGF5LCBjbGFtcCBhcyBpbnRcbiAgZHJhd0RlbGF5ID0gKDEwMDAgLyBmcHMpIHwgMDtcblxuICAvLyBkZXRlcm1pbmUgd2hldGhlciB3ZSBzaG91bGQgcmVzaXplIHRoZSBjYW52YXMgb3Igbm90XG4gIHJlc2l6ZUNhbnZhcyA9IHRhcmdldC53aWR0aCA9PT0gMCB8fCB0YXJnZXQuaGVpZ2h0ID09PSAwO1xuXG4gIC8vIGlmIHdlJ3ZlIGJlZW4gcHJvdmlkZWQgYSBmaWx0ZXJzIGFycmF5IGluIG9wdGlvbnMgaW5pdGlhbGlzZSB0aGUgZmlsdGVyc1xuICAvLyB3aXRoIHRob3NlIGZ1bmN0aW9uc1xuICBwcm9jZXNzb3IuZmlsdGVycyA9ICgob3B0cyB8fCB7fSkuZmlsdGVycyB8fCBbXSkuZmlsdGVyKGZ1bmN0aW9uKGZpbHRlcikge1xuICAgIHJldHVybiB0eXBlb2YgZmlsdGVyID09ICdmdW5jdGlvbic7XG4gIH0pO1xuXG4gIC8vIGlmIGEgJ2ZpbHRlcicgb3B0aW9uIGhhcyBiZWVuIHByb3ZpZGVkLCB0aGVuIGFwcGVuZCB0byB0aGUgZmlsdGVycyBhcnJheVxuICBpZiAob3B0cyAmJiB0eXBlb2Ygb3B0cy5maWx0ZXIgPT0gJ2Z1bmN0aW9uJykge1xuICAgIHByb2Nlc3Nvci5maWx0ZXJzLnB1c2gob3B0cy5maWx0ZXIpO1xuICB9XG5cbiAgLy8gaWYgd2UgYXJlIHJlc2l6aW5nIHRoZSBjYW52YXMsIHRoZW4gYXMgdGhlIHZpZGVvIG1ldGFkYXRhIGNoYW5nZXNcbiAgLy8gcmVzeW5jIHRoZSBjYW52YXNcbiAgc3JjLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgbW9uaXRvclNvdXJjZSk7XG4gIHNyYy5hZGRFdmVudExpc3RlbmVyKCdjYW5wbGF5JywgbW9uaXRvclNvdXJjZSk7XG5cbiAgLy8gY2FsY3VsYXRlIHRoZSBpbml0aWFsIGRyYXcgbWV0YWRhdGEgKHdpbGwgYmUgcmVjYWxjdWxhdGVkIG9uIHZpZGVvIHN0cmVhbSBjaGFuZ2VzKVxuICBjYWxjdWxhdGVEcmF3UmVnaW9uKCk7XG5cbiAgLy8gc3RhcnQgdGhlIHJlZHJhd1xuICByYWYocmVkcmF3KTtcblxuICByZXR1cm4gcHJvY2Vzc29yO1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIHdpbmRvdzogZmFsc2UgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIFRFU1RfUFJPUFMgPSBbJ3InLCAnd2Via2l0UicsICdtb3pSJywgJ29SJywgJ21zUiddO1xuXG4vKipcbiAgIyMjIHJhZihjYWxsYmFjaylcblxuICBSZXF1ZXN0IGFuaW1hdGlvbiBmcmFtZSBoZWxwZXIuXG5cbiAgPDw8IGV4YW1wbGVzL3JhZi5qc1xuXG4qKi9cblxubW9kdWxlLmV4cG9ydHMgPSB0eXBlb2Ygd2luZG93ICE9ICd1bmRlZmluZWQnICYmIChmdW5jdGlvbigpIHtcbiAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IFRFU1RfUFJPUFMubGVuZ3RoOyBpaSsrKSB7XG4gICAgd2luZG93LmFuaW1GcmFtZSA9IHdpbmRvdy5hbmltRnJhbWUgfHxcbiAgICAgIHdpbmRvd1tURVNUX1BST1BTW2lpXSArICdlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICB9IC8vIGZvclxuXG4gIHJldHVybiBhbmltRnJhbWU7XG59KSgpOyJdfQ==
