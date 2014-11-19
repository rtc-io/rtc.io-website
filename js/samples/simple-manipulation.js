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
},{"crel":5,"rtc-filter-grayscale":9,"rtc-media":10,"rtc-videoproc":13}],3:[function(require,module,exports){
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
/* jshint node: true */
'use strict';

/**
  ## cog/logger

  ```js
  var logger = require('cog/logger');
  ```

  Simple browser logging offering similar functionality to the
  [debug](https://github.com/visionmedia/debug) module.

  ### Usage

  Create your self a new logging instance and give it a name:

  ```js
  var debug = logger('phil');
  ```

  Now do some debugging:

  ```js
  debug('hello');
  ```

  At this stage, no log output will be generated because your logger is
  currently disabled.  Enable it:

  ```js
  logger.enable('phil');
  ```

  Now do some more logger:

  ```js
  debug('Oh this is so much nicer :)');
  // --> phil: Oh this is some much nicer :)
  ```

  ### Reference
**/

var active = [];
var unleashListeners = [];
var targets = [ console ];

/**
  #### logger(name)

  Create a new logging instance.
**/
var logger = module.exports = function(name) {
  // initial enabled check
  var enabled = checkActive();

  function checkActive() {
    return enabled = active.indexOf('*') >= 0 || active.indexOf(name) >= 0;
  }

  // register the check active with the listeners array
  unleashListeners[unleashListeners.length] = checkActive;

  // return the actual logging function
  return function() {
    var args = [].slice.call(arguments);

    // if we have a string message
    if (typeof args[0] == 'string' || (args[0] instanceof String)) {
      args[0] = name + ': ' + args[0];
    }

    // if not enabled, bail
    if (! enabled) {
      return;
    }

    // log
    targets.forEach(function(target) {
      target.log.apply(target, args);
    });
  };
};

/**
  #### logger.reset()

  Reset logging (remove the default console logger, flag all loggers as
  inactive, etc, etc.
**/
logger.reset = function() {
  // reset targets and active states
  targets = [];
  active = [];

  return logger.enable();
};

/**
  #### logger.to(target)

  Add a logging target.  The logger must have a `log` method attached.

**/
logger.to = function(target) {
  targets = targets.concat(target || []);

  return logger;
};

/**
  #### logger.enable(names*)

  Enable logging via the named logging instances.  To enable logging via all
  instances, you can pass a wildcard:

  ```js
  logger.enable('*');
  ```

  __TODO:__ wildcard enablers
**/
logger.enable = function() {
  // update the active
  active = active.concat([].slice.call(arguments));

  // trigger the unleash listeners
  unleashListeners.forEach(function(listener) {
    listener();
  });

  return logger;
};
},{}],5:[function(require,module,exports){
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
    // based on http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
    var isNode = typeof Node === 'function'
        ? function (object) { return object instanceof Node; }
        : function (object) {
            return object
                && typeof object === 'object'
                && typeof object.nodeType === 'number'
                && typeof object.nodeName === 'string';
        };
    var isArray = function(a){ return a instanceof Array; };
    var appendChild = function(element, child) {
      if(!isNode(child)){
          child = document.createTextNode(child);
      }
      element.appendChild(child);
    };


    function crel(){
        var document = window.document,
            args = arguments, //Note: assigned to a variable to assist compilers. Saves about 40 bytes in closure compiler. Has negligable effect on performance.
            element = args[0],
            child,
            settings = args[1],
            childIndex = 2,
            argumentsLength = args.length,
            attributeMap = crel.attrMap;

        element = isNode(element) ? element : document.createElement(element);
        // shortcut
        if(argumentsLength === 1){
            return element;
        }

        if(typeof settings !== 'object' || isNode(settings) || isArray(settings)) {
            --childIndex;
            settings = null;
        }

        // shortcut if there is only one child that is a string
        if((argumentsLength - childIndex) === 1 && typeof args[childIndex] === 'string' && element.textContent !== undefined){
            element.textContent = args[childIndex];
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
                element.setAttribute(key, settings[key]);
            }else{
                var attr = crel.attrMap[key];
                if(typeof attr === 'function'){
                    attr(element, settings[key]);
                }else{
                    element.setAttribute(attr, settings[key]);
                }
            }
        }

        return element;
    }

    // Used for mapping one kind of attribute to the supported version of that in bad browsers.
    // String referenced so that compilers maintain the property name.
    crel['attrMap'] = {};

    // String referenced so that compilers maintain the property name.
    crel["isNode"] = isNode;

    return crel;
}));

},{}],6:[function(require,module,exports){
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
var detect = module.exports = function(target, prefixes) {
  var prefixIdx;
  var prefix;
  var testName;
  var hostObject = this || (typeof window != 'undefined' ? window : undefined);

  // if we have no host object, then abort
  if (! hostObject) {
    return;
  }

  // initialise to default prefixes
  // (reverse order as we use a decrementing for loop)
  prefixes = (prefixes || ['ms', 'o', 'moz', 'webkit']).concat('');

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

      // return the host object member
      return hostObject[target] = hostObject[testName];
    }
  }
};

// detect mozilla (yes, this feels dirty)
detect.moz = typeof navigator != 'undefined' && !!navigator.mozGetUserMedia;

// set the browser and browser version
detect.browser = browser.name;
detect.browserVersion = detect.version = browser.version;

},{"detect-browser":7}],7:[function(require,module,exports){
var browsers = [
  [ 'chrome', /Chrom(?:e|ium)\/([0-9\.]+)(:?\s|$)/ ],
  [ 'firefox', /Firefox\/([0-9\.]+)(?:\s|$)/ ],
  [ 'opera', /Opera\/([0-9\.]+)(?:\s|$)/ ],
  [ 'ie', /Trident\/7\.0.*rv\:([0-9\.]+)\).*Gecko$/ ],
  [ 'ie', /MSIE\s([0-9\.]+);.*Trident\/[4-6].0/ ],
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

},{}],8:[function(require,module,exports){
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

},{"./detect":6}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
/* jshint node: true */
/* global navigator: false */
/* global window: false */
/* global document: false */
/* global MediaStream: false */
/* global HTMLVideoElement: false */
/* global HTMLAudioElement: false */

/**
  # rtc-media

  Simple [getUserMedia](http://dev.w3.org/2011/webrtc/editor/getusermedia.html)
  cross-browser wrappers.  Part of the [rtc.io](http://rtc.io/) suite, which is
  sponsored by [NICTA](http://opennicta.com) and released under an
  [Apache 2.0 license](/LICENSE).

  ## Example Usage

  Capturing media on your machine is as simple as:

  ```js
  require('rtc-media')();
  ```

  While this will in fact start the user media capture process, it won't
  do anything with it.  Lets take a look at a more realistic example:

  <<< examples/render-to-body.js

  [run on requirebin](http://requirebin.com/?gist=6085450)

  In the code above, we are creating a new instance of our userMedia wrapper
  using the `media()` call and then telling it to render to the
  `document.body` once video starts streaming.  We can further expand the
  code out to the following to aid our understanding of what is going on:

  <<< examples/capture-explicit.js

  The code above is written in a more traditional JS style, but feel free
  to use the first style as it's quite safe (thanks to some checks in the
  code).

  ### Events

  Once a media object has been created, it will provide a number of events
  through the standard node EventEmitter API.

  #### `capture`

  The `capture` event is triggered once the requested media stream has
  been captured by the browser.

  <<< examples/capture-event.js

  #### `render`

  The `render` event is triggered once the stream has been rendered
  to the any supplied (or created) video elements.

  While it might seem a little confusing that when the `render` event
  fires that it returns an array of elements rather than a single element
  (which is what is provided when calling the `render` method).

  This occurs because it is completely valid to render a single captured
  media stream to multiple media elements on a page.  The `render` event
  is reporting once the render operation has completed for all targets that
  have been registered with the capture stream.

  ## Reference

**/

'use strict';

var debug = require('cog/logger')('rtc-media');
var extend = require('cog/extend');
var detect = require('rtc-core/detect');
var plugin = require('rtc-core/plugin');
var EventEmitter = require('eventemitter3');
var inherits = require('inherits');

// monkey patch getUserMedia from the prefixed version
navigator.getUserMedia = navigator.getUserMedia ||
  detect.call(navigator, 'getUserMedia');

// patch window url
window.URL = window.URL || detect('URL');

// patch media stream
window.MediaStream = detect('MediaStream');

/**
  ### media

  ```
  media(opts?)
  ```

  Capture media using the underlying
  [getUserMedia](http://www.w3.org/TR/mediacapture-streams/) API.

  The function accepts a single argument which can be either be:

  - a. An options object (see below), or;
  - b. An existing
    [MediaStream](http://www.w3.org/TR/mediacapture-streams/#mediastream) that
    the media object will bind to and provide you some DOM helpers for.

  The function supports the following options:

  - `capture` - Whether capture should be initiated automatically. Defaults
    to true, but toggled to false automatically if an existing stream is
    provided.

  - `muted` - Whether the video element created for this stream should be
    muted.  Default is true but is set to false when an existing stream is
    passed.

  - `constraints` - The constraint option allows you to specify particular
    media capture constraints which can allow you do do some pretty cool
    tricks.  By default, the contraints used to request the media are
    fairly standard defaults:

    ```js
      {
        video: {
          mandatory: {},
          optional: []
        },
        audio: true
      }
    ```

**/
function Media(opts) {
  var media = this;

  // check the constructor has been called
  if (! (this instanceof Media)) {
    return new Media(opts);
  }

  // inherited
  EventEmitter.call(this);

  // if the opts is a media stream instance, then handle that appropriately
  if (opts && MediaStream && opts instanceof MediaStream) {
    opts = {
      stream: opts
    };
  }

  // if we've been passed opts and they look like constraints, move things
  // around a little
  if (opts && (opts.audio || opts.video)) {
    opts = {
      constraints: opts
    };
  }

  // ensure we have opts
  opts = extend({}, {
    capture: (! opts) || (! opts.stream),
    muted: (! opts) || (! opts.stream),
    constraints: {
      video: {
        mandatory: {},
        optional: []
      },
      audio: true,

      // specify the fake flag if we detect we are running in the test
      // environment, on chrome this will do nothing but in firefox it will
      // use a fake video device
      fake: typeof __testlingConsole != 'undefined'
    }
  }, opts);

  // save the constraints
  this.constraints = opts.constraints;

  // if a name has been specified in the opts, save it to the media
  this.name = opts.name;

  // initialise the stream to null
  this.stream = opts.stream || null;

  // initialise the muted state
  this.muted = typeof opts.muted == 'undefined' || opts.muted;

  // create a bindings array so we have a rough idea of where
  // we have been attached to
  // TODO: revisit whether this is the best way to manage this
  this._bindings = [];

  // see if we are using a plugin
  this.plugin = plugin((opts || {}).plugins);
  if (this.plugin) {
    // if we are using a plugin, give it an opportunity to patch the
    // media capture interface
    media._pinst = this.plugin.init(opts, function(err) {
      console.log('initialization complete');
      if (err) {
        return media.emit('error', err);
      }

      if ((! opts.stream) && opts.capture) {
        media.capture();
      }
    });
  }
  // if we are autostarting, capture media on the next tick
  else if (opts.capture) {
    setTimeout(this.capture.bind(this), 0);
  }
}

inherits(Media, EventEmitter);
module.exports = Media;

/**
  ### capture

  ```
  capture(constraints, callback)
  ```

  Capture media.  If constraints are provided, then they will
  override the default constraints that were used when the media object was
  created.
**/
Media.prototype.capture = function(constraints, callback) {
  var media = this;
  var handleEnd = this.emit.bind(this, 'end');

  // if we already have a stream, then abort
  if (this.stream) { return; }

  // if no constraints have been provided, but we have
  // a callback, deal with it
  if (typeof constraints == 'function') {
    callback = constraints;
    constraints = this.constraints;
  }

  // if we have a callback, bind to the start event
  if (typeof callback == 'function') {
    this.once('capture', callback.bind(this));
  }

  // if we don't have get the ability to capture user media, then abort
  if (typeof navigator.getUserMedia != 'function') {
    return callback && callback(new Error('Unable to capture user media'));
  }

  // get user media, using either the provided constraints or the
  // default constraints
  debug('getUserMedia, constraints: ', constraints || this.constraints);
  navigator.getUserMedia(
    constraints || this.constraints,
    function(stream) {
      debug('sucessfully captured media stream: ', stream);
      if (typeof stream.addEventListener == 'function') {
        stream.addEventListener('ended', handleEnd);
      }
      else {
        stream.onended = handleEnd;
      }

      // save the stream and emit the start method
      media.stream = stream;

      // emit capture on next tick which works around a bug when using plugins
      setTimeout(function() {
        media.emit('capture', stream);
      }, 0);
    },

    function(err) {
      debug('getUserMedia attempt failed: ', err);
      media.emit('error', err);
    }
  );
};

/**
  ### render

  ```js
  render(target, opts?, callback?)
  ```

  Render the captured media to the specified target element.  While previous
  versions of rtc-media accepted a selector string or an array of elements
  this has been dropped in favour of __one single target element__.

  If the target element is a valid MediaElement then it will become the
  target of the captured media stream.  If, however, it is a generic DOM
  element it will a new Media element will be created that using the target
  as it's parent.

  A simple example of requesting default media capture and rendering to the
  document body is shown below:

  <<< examples/render-to-body.js

  You may optionally provide a callback to this function, which is
  will be triggered once each of the media elements has started playing
  the stream:

  <<< examples/render-capture-callback.js

**/
Media.prototype.render = function(target, opts, callback) {
  // if the target is an array, extract the first element
  if (Array.isArray(target)) {
    // log a warning
    console.log('WARNING: rtc-media render (as of 1.x) expects a single target');
    target = target[0];
  }

  if (typeof opts == 'function') {
    callback = opts;
    opts = {};
  }

  // ensure we have opts
  opts = opts || {};

  // create the video / audio elements
  target = this._prepareElement(opts, target);
  console.log('attempting render, stream: ', this.stream);

  // if no stream was specified, wait for the stream to initialize
  if (! this.stream) {
    this.once('capture', this._bindStream.bind(this));
  }
  // otherwise, bind the stream now
  else {
    this._bindStream(this.stream);
  }

  // if we have a callback then trigger on the render event
  if (typeof callback == 'function') {
    this.once('render', callback);
  }

  return target;
};

/**
  ### stop()

  Stop the media stream
**/
Media.prototype.stop = function(opts) {
  var media = this;

  if (! this.stream) { return; }

  // remove bindings
  this._unbind(opts);

  // stop the stream, and tell the world
  this.stream.stop();

  // on capture rebind
  this.once('capture', media._bindStream.bind(media));

  // remove the reference to the stream
  this.stream = null;
};

/**
  ## Debugging Tips

  Chrome and Chromium can both be started with the following flag:

  ```
  --use-fake-device-for-media-stream
  ```

  This uses a fake stream for the getUserMedia() call rather than attempting
  to capture the actual camera.  This is useful when doing automated testing
  and also if you want to test connectivity between two browser instances and
  want to distinguish between the two local videos.

  ## Internal Methods

  There are a number of internal methods that are used in the `rtc-media`
  implementation. These are outlined below, but not expected to be of
  general use.

**/

Media.prototype._createBinding = function(opts, element) {
  this._bindings.push({
    el: element,
    opts: opts
  });

  return element;
};

/**
  ### _prepareElement(opts, element)

  The prepareElement function is used to prepare DOM elements that will
  receive the media streams once the stream have been successfully captured.
**/
Media.prototype._prepareElement = function(opts, element) {
  var parent;
  var validElement = (element instanceof HTMLVideoElement) ||
        (element instanceof HTMLAudioElement);
  var preserveAspectRatio =
        typeof opts.preserveAspectRatio == 'undefined' ||
        opts.preserveAspectRatio;

  if (! element) {
    throw new Error('Cannot render media to a null element');
  }

  // if the plugin wants to prepare elemnets, then let it
  if (this.plugin && typeof this.plugin.prepareElement == 'function') {
    return this._createBinding(
      opts,
      this.plugin.prepareElement.call(this._pinst, opts, element)
    );
  }

  // perform some additional checks for things that "look" like a
  // media element
  validElement = validElement || (typeof element.play == 'function') && (
    typeof element.srcObject != 'undefined' ||
    typeof element.mozSrcObject != 'undefined' ||
    typeof element.src != 'undefined');

  // if the element is not a video element, then create one
  if (! validElement) {
    parent = element;

    // create a new video element
    // TODO: create an appropriate element based on the types of tracks
    // available
    element = document.createElement('video');

    // if we are preserving aspect ratio do that now
    if (preserveAspectRatio) {
      element.setAttribute('preserveAspectRatio', '');
    }

    // add to the parent
    parent.appendChild(element);
    element.setAttribute('data-playing', false);
  }

  // if muted, inject the muted attribute
  if (element && this.muted) {
    element.muted = true;
    element.setAttribute('muted', '');
  }

  return this._createBinding(opts, element);
};

/**
  ### _bindStream(stream)

  Bind a stream to previously prepared DOM elements.

**/
Media.prototype._bindStream = function(stream) {
  var media = this;
  var elements = [];
  var waiting = [];

  function checkWaiting() {
    // if we have no waiting elements, but some elements
    // trigger the start event
    if (waiting.length === 0 && elements.length > 0) {
      media.emit('render', elements[0]);

      elements.map(function(el) {
        el.setAttribute('data-playing', true);
      });
    }
  }

  function canPlay(evt) {
    var el = evt.target || evt.srcElement;
    var videoIndex = elements.indexOf(el);

    if (videoIndex >= 0) {
      waiting.splice(videoIndex, 1);
    }

    el.play();
    el.removeEventListener('canplay', canPlay);
    el.removeEventListener('loadedmetadata', canPlay);
    checkWaiting();
  }

  // if we have a plugin that knows how to attach a stream, then let it do it
  if (this.plugin && typeof this.plugin.attachStream == 'function') {
    return this.plugin.attachStream.call(this._pinst, stream, this._bindings);
  }

  // iterate through the bindings and bind the stream
  elements = this._bindings.map(function(binding) {
    // check for srcObject
    if (typeof binding.el.srcObject != 'undefined') {
      binding.el.srcObject = stream;
    }
    // check for mozSrcObject
    else if (typeof binding.el.mozSrcObject != 'undefined') {
      binding.el.mozSrcObject = stream;
    }
    else {
      binding.el.src = media._createObjectURL(stream) || stream;
    }

    // attempt playback (may not work if the stream isn't quite ready)
    binding.el.play();
    return binding.el;
  });

  // find the elements we are waiting on
  waiting = elements.filter(function(el) {
    return el.readyState < 3; // readystate < HAVE_FUTURE_DATA
  });

  // wait for all the video elements
  waiting.forEach(function(el) {
    el.addEventListener('canplay', canPlay, false);
    el.addEventListener('loadedmetadata', canPlay, false);
  });

  checkWaiting();
};

/**
  ### _unbind()

  Gracefully detach elements that are using the stream from the
  current stream.
**/
Media.prototype._unbind = function(opts) {
  // ensure we have opts
  opts = opts || {};

  // iterate through the bindings and detach streams
  this._bindings.forEach(function(binding) {
    var element = binding.el;

    // remove the source
    element.src = null;

    // check for moz
    if (element.mozSrcObject) {
      element.mozSrcObject = null;
    }

    // check for currentSrc
    if (element.currentSrc) {
      element.currentSrc = null;
    }
  });
};

/**
  ### _createObjectUrl(stream)

  This method is used to create an object url that can be attached to a video
  or audio element.  Object urls are cached to ensure only one is created
  per stream.
**/
Media.prototype._createObjectURL = function(stream) {
  try {
    return window.URL.createObjectURL(stream);
  }
  catch (e) {
  }
};

/**
  ### _handleSuccess(stream)

  Handle the success condition of a `getUserMedia` call.

**/
Media.prototype._handleSuccess = function(stream) {
  // update the active stream that we are connected to
  this.stream = stream;

  // emit the stream event
  this.emit('stream', stream);
};

/**
  ### Utility Functions

**/

},{"cog/extend":3,"cog/logger":4,"eventemitter3":11,"inherits":12,"rtc-core/detect":6,"rtc-core/plugin":8}],11:[function(require,module,exports){
'use strict';

/**
 * Representation of a single EventEmitter function.
 *
 * @param {Function} fn Event handler to be called.
 * @param {Mixed} context Context for function execution.
 * @param {Boolean} once Only emit once
 * @api private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal EventEmitter interface that is molded against the Node.js
 * EventEmitter interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() { /* Nothing to set */ }

/**
 * Holds the assigned EventEmitters by name.
 *
 * @type {Object}
 * @private
 */
EventEmitter.prototype._events = undefined;

/**
 * Return a list of assigned event listeners.
 *
 * @param {String} event The events that should be listed.
 * @returns {Array}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event) {
  if (!this._events || !this._events[event]) return [];
  if (this._events[event].fn) return [this._events[event].fn];

  for (var i = 0, l = this._events[event].length, ee = new Array(l); i < l; i++) {
    ee[i] = this._events[event][i].fn;
  }

  return ee;
};

/**
 * Emit an event to all registered event listeners.
 *
 * @param {String} event The name of the event.
 * @returns {Boolean} Indication if we've emitted an event.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  if (!this._events || !this._events[event]) return false;

  var listeners = this._events[event]
    , len = arguments.length
    , args
    , i;

  if ('function' === typeof listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Register a new EventListener for the given event.
 *
 * @param {String} event Name of the event.
 * @param {Functon} fn Callback function.
 * @param {Mixed} context The context of the function.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new EE(fn, context || this);

  if (!this._events) this._events = {};
  if (!this._events[event]) this._events[event] = listener;
  else {
    if (!this._events[event].fn) this._events[event].push(listener);
    else this._events[event] = [
      this._events[event], listener
    ];
  }

  return this;
};

/**
 * Add an EventListener that's only called once.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} context The context of the function.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new EE(fn, context || this, true);

  if (!this._events) this._events = {};
  if (!this._events[event]) this._events[event] = listener;
  else {
    if (!this._events[event].fn) this._events[event].push(listener);
    else this._events[event] = [
      this._events[event], listener
    ];
  }

  return this;
};

/**
 * Remove event listeners.
 *
 * @param {String} event The event we want to remove.
 * @param {Function} fn The listener that we need to find.
 * @param {Boolean} once Only remove once listeners.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, once) {
  if (!this._events || !this._events[event]) return this;

  var listeners = this._events[event]
    , events = [];

  if (fn) {
    if (listeners.fn && (listeners.fn !== fn || (once && !listeners.once))) {
      events.push(listeners);
    }
    if (!listeners.fn) for (var i = 0, length = listeners.length; i < length; i++) {
      if (listeners[i].fn !== fn || (once && !listeners[i].once)) {
        events.push(listeners[i]);
      }
    }
  }

  //
  // Reset the array, or remove it completely if we have no more listeners.
  //
  if (events.length) {
    this._events[event] = events.length === 1 ? events[0] : events;
  } else {
    delete this._events[event];
  }

  return this;
};

/**
 * Remove all listeners or only the listeners for the specified event.
 *
 * @param {String} event The event want to remove all listeners for.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  if (!this._events) return this;

  if (event) delete this._events[event];
  else this._events = {};

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

//
// Expose the module.
//
EventEmitter.EventEmitter = EventEmitter;
EventEmitter.EventEmitter2 = EventEmitter;
EventEmitter.EventEmitter3 = EventEmitter;

//
// Expose the module.
//
module.exports = EventEmitter;

},{}],12:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],13:[function(require,module,exports){
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
},{"events":1,"fdom/raf":14}],14:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5udm0vdjAuMTAuMzMvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi8uLi8ubnZtL3YwLjEwLjMzL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsImNvZGUvc2ltcGxlLW1hbmlwdWxhdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9jb2cvZXh0ZW5kLmpzIiwibm9kZV9tb2R1bGVzL2NvZy9sb2dnZXIuanMiLCJub2RlX21vZHVsZXMvY3JlbC9jcmVsLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1jb3JlL2RldGVjdC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtY29yZS9ub2RlX21vZHVsZXMvZGV0ZWN0LWJyb3dzZXIvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtY29yZS9wbHVnaW4uanMiLCJub2RlX21vZHVsZXMvcnRjLWZpbHRlci1ncmF5c2NhbGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLW1lZGlhL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1tZWRpYS9ub2RlX21vZHVsZXMvZXZlbnRlbWl0dGVyMy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtbWVkaWEvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvcnRjLXZpZGVvcHJvYy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtdmlkZW9wcm9jL25vZGVfbW9kdWxlcy9mZG9tL3JhZi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25SQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsInZhciBjcmVsID0gcmVxdWlyZSgnY3JlbCcpO1xudmFyIG1lZGlhID0gcmVxdWlyZSgncnRjLW1lZGlhJyk7XG52YXIgdmlkZW9wcm9jID0gcmVxdWlyZSgncnRjLXZpZGVvcHJvYycpO1xudmFyIHZpZGVvID0gY3JlbCgndmlkZW8nKTtcbnZhciBjYW52YXMgPSBjcmVsKCdjYW52YXMnKTtcblxuLy8gc2V0IHVwIHRoZSB2aWRlbyBwcm9jZXNzaW5nXG52aWRlb3Byb2ModmlkZW8sIGNhbnZhcywge1xuICBmaWx0ZXI6IHJlcXVpcmUoJ3J0Yy1maWx0ZXItZ3JheXNjYWxlJylcbn0pO1xuXG4vLyBjYXB0dXJlIGFuZCByZW5kZXIgdGhlIHZpZGVvXG5tZWRpYSgpLnJlbmRlcih2aWRlbyk7XG5cbi8vIGFkZCB0aGUgY2FudmFzIHRvIHRoZSBkb2N1bWVudCBib2R5XG5kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGNhbnZhcyk7IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4jIyBjb2cvZXh0ZW5kXG5cbmBgYGpzXG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xuYGBgXG5cbiMjIyBleHRlbmQodGFyZ2V0LCAqKVxuXG5TaGFsbG93IGNvcHkgb2JqZWN0IHByb3BlcnRpZXMgZnJvbSB0aGUgc3VwcGxpZWQgc291cmNlIG9iamVjdHMgKCopIGludG9cbnRoZSB0YXJnZXQgb2JqZWN0LCByZXR1cm5pbmcgdGhlIHRhcmdldCBvYmplY3Qgb25jZSBjb21wbGV0ZWQ6XG5cbmBgYGpzXG5leHRlbmQoeyBhOiAxLCBiOiAyIH0sIHsgYzogMyB9LCB7IGQ6IDQgfSwgeyBiOiA1IH0pKTtcbmBgYFxuXG5TZWUgYW4gZXhhbXBsZSBvbiBbcmVxdWlyZWJpbl0oaHR0cDovL3JlcXVpcmViaW4uY29tLz9naXN0PTYwNzk0NzUpLlxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkuZm9yRWFjaChmdW5jdGlvbihzb3VyY2UpIHtcbiAgICBpZiAoISBzb3VyY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgdGFyZ2V0W3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHRhcmdldDtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMjIGNvZy9sb2dnZXJcblxuICBgYGBqc1xuICB2YXIgbG9nZ2VyID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpO1xuICBgYGBcblxuICBTaW1wbGUgYnJvd3NlciBsb2dnaW5nIG9mZmVyaW5nIHNpbWlsYXIgZnVuY3Rpb25hbGl0eSB0byB0aGVcbiAgW2RlYnVnXShodHRwczovL2dpdGh1Yi5jb20vdmlzaW9ubWVkaWEvZGVidWcpIG1vZHVsZS5cblxuICAjIyMgVXNhZ2VcblxuICBDcmVhdGUgeW91ciBzZWxmIGEgbmV3IGxvZ2dpbmcgaW5zdGFuY2UgYW5kIGdpdmUgaXQgYSBuYW1lOlxuXG4gIGBgYGpzXG4gIHZhciBkZWJ1ZyA9IGxvZ2dlcigncGhpbCcpO1xuICBgYGBcblxuICBOb3cgZG8gc29tZSBkZWJ1Z2dpbmc6XG5cbiAgYGBganNcbiAgZGVidWcoJ2hlbGxvJyk7XG4gIGBgYFxuXG4gIEF0IHRoaXMgc3RhZ2UsIG5vIGxvZyBvdXRwdXQgd2lsbCBiZSBnZW5lcmF0ZWQgYmVjYXVzZSB5b3VyIGxvZ2dlciBpc1xuICBjdXJyZW50bHkgZGlzYWJsZWQuICBFbmFibGUgaXQ6XG5cbiAgYGBganNcbiAgbG9nZ2VyLmVuYWJsZSgncGhpbCcpO1xuICBgYGBcblxuICBOb3cgZG8gc29tZSBtb3JlIGxvZ2dlcjpcblxuICBgYGBqc1xuICBkZWJ1ZygnT2ggdGhpcyBpcyBzbyBtdWNoIG5pY2VyIDopJyk7XG4gIC8vIC0tPiBwaGlsOiBPaCB0aGlzIGlzIHNvbWUgbXVjaCBuaWNlciA6KVxuICBgYGBcblxuICAjIyMgUmVmZXJlbmNlXG4qKi9cblxudmFyIGFjdGl2ZSA9IFtdO1xudmFyIHVubGVhc2hMaXN0ZW5lcnMgPSBbXTtcbnZhciB0YXJnZXRzID0gWyBjb25zb2xlIF07XG5cbi8qKlxuICAjIyMjIGxvZ2dlcihuYW1lKVxuXG4gIENyZWF0ZSBhIG5ldyBsb2dnaW5nIGluc3RhbmNlLlxuKiovXG52YXIgbG9nZ2VyID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihuYW1lKSB7XG4gIC8vIGluaXRpYWwgZW5hYmxlZCBjaGVja1xuICB2YXIgZW5hYmxlZCA9IGNoZWNrQWN0aXZlKCk7XG5cbiAgZnVuY3Rpb24gY2hlY2tBY3RpdmUoKSB7XG4gICAgcmV0dXJuIGVuYWJsZWQgPSBhY3RpdmUuaW5kZXhPZignKicpID49IDAgfHwgYWN0aXZlLmluZGV4T2YobmFtZSkgPj0gMDtcbiAgfVxuXG4gIC8vIHJlZ2lzdGVyIHRoZSBjaGVjayBhY3RpdmUgd2l0aCB0aGUgbGlzdGVuZXJzIGFycmF5XG4gIHVubGVhc2hMaXN0ZW5lcnNbdW5sZWFzaExpc3RlbmVycy5sZW5ndGhdID0gY2hlY2tBY3RpdmU7XG5cbiAgLy8gcmV0dXJuIHRoZSBhY3R1YWwgbG9nZ2luZyBmdW5jdGlvblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGEgc3RyaW5nIG1lc3NhZ2VcbiAgICBpZiAodHlwZW9mIGFyZ3NbMF0gPT0gJ3N0cmluZycgfHwgKGFyZ3NbMF0gaW5zdGFuY2VvZiBTdHJpbmcpKSB7XG4gICAgICBhcmdzWzBdID0gbmFtZSArICc6ICcgKyBhcmdzWzBdO1xuICAgIH1cblxuICAgIC8vIGlmIG5vdCBlbmFibGVkLCBiYWlsXG4gICAgaWYgKCEgZW5hYmxlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGxvZ1xuICAgIHRhcmdldHMuZm9yRWFjaChmdW5jdGlvbih0YXJnZXQpIHtcbiAgICAgIHRhcmdldC5sb2cuYXBwbHkodGFyZ2V0LCBhcmdzKTtcbiAgICB9KTtcbiAgfTtcbn07XG5cbi8qKlxuICAjIyMjIGxvZ2dlci5yZXNldCgpXG5cbiAgUmVzZXQgbG9nZ2luZyAocmVtb3ZlIHRoZSBkZWZhdWx0IGNvbnNvbGUgbG9nZ2VyLCBmbGFnIGFsbCBsb2dnZXJzIGFzXG4gIGluYWN0aXZlLCBldGMsIGV0Yy5cbioqL1xubG9nZ2VyLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gIC8vIHJlc2V0IHRhcmdldHMgYW5kIGFjdGl2ZSBzdGF0ZXNcbiAgdGFyZ2V0cyA9IFtdO1xuICBhY3RpdmUgPSBbXTtcblxuICByZXR1cm4gbG9nZ2VyLmVuYWJsZSgpO1xufTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyLnRvKHRhcmdldClcblxuICBBZGQgYSBsb2dnaW5nIHRhcmdldC4gIFRoZSBsb2dnZXIgbXVzdCBoYXZlIGEgYGxvZ2AgbWV0aG9kIGF0dGFjaGVkLlxuXG4qKi9cbmxvZ2dlci50byA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICB0YXJnZXRzID0gdGFyZ2V0cy5jb25jYXQodGFyZ2V0IHx8IFtdKTtcblxuICByZXR1cm4gbG9nZ2VyO1xufTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyLmVuYWJsZShuYW1lcyopXG5cbiAgRW5hYmxlIGxvZ2dpbmcgdmlhIHRoZSBuYW1lZCBsb2dnaW5nIGluc3RhbmNlcy4gIFRvIGVuYWJsZSBsb2dnaW5nIHZpYSBhbGxcbiAgaW5zdGFuY2VzLCB5b3UgY2FuIHBhc3MgYSB3aWxkY2FyZDpcblxuICBgYGBqc1xuICBsb2dnZXIuZW5hYmxlKCcqJyk7XG4gIGBgYFxuXG4gIF9fVE9ETzpfXyB3aWxkY2FyZCBlbmFibGVyc1xuKiovXG5sb2dnZXIuZW5hYmxlID0gZnVuY3Rpb24oKSB7XG4gIC8vIHVwZGF0ZSB0aGUgYWN0aXZlXG4gIGFjdGl2ZSA9IGFjdGl2ZS5jb25jYXQoW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcblxuICAvLyB0cmlnZ2VyIHRoZSB1bmxlYXNoIGxpc3RlbmVyc1xuICB1bmxlYXNoTGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24obGlzdGVuZXIpIHtcbiAgICBsaXN0ZW5lcigpO1xuICB9KTtcblxuICByZXR1cm4gbG9nZ2VyO1xufTsiLCIvL0NvcHlyaWdodCAoQykgMjAxMiBLb3J5IE51bm5cclxuXHJcbi8vUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcclxuXHJcbi8vVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXHJcblxyXG4vL1RIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxyXG5cclxuLypcclxuXHJcbiAgICBUaGlzIGNvZGUgaXMgbm90IGZvcm1hdHRlZCBmb3IgcmVhZGFiaWxpdHksIGJ1dCByYXRoZXIgcnVuLXNwZWVkIGFuZCB0byBhc3Npc3QgY29tcGlsZXJzLlxyXG5cclxuICAgIEhvd2V2ZXIsIHRoZSBjb2RlJ3MgaW50ZW50aW9uIHNob3VsZCBiZSB0cmFuc3BhcmVudC5cclxuXHJcbiAgICAqKiogSUUgU1VQUE9SVCAqKipcclxuXHJcbiAgICBJZiB5b3UgcmVxdWlyZSB0aGlzIGxpYnJhcnkgdG8gd29yayBpbiBJRTcsIGFkZCB0aGUgZm9sbG93aW5nIGFmdGVyIGRlY2xhcmluZyBjcmVsLlxyXG5cclxuICAgIHZhciB0ZXN0RGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JyksXHJcbiAgICAgICAgdGVzdExhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGFiZWwnKTtcclxuXHJcbiAgICB0ZXN0RGl2LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnYScpO1xyXG4gICAgdGVzdERpdlsnY2xhc3NOYW1lJ10gIT09ICdhJyA/IGNyZWwuYXR0ck1hcFsnY2xhc3MnXSA9ICdjbGFzc05hbWUnOnVuZGVmaW5lZDtcclxuICAgIHRlc3REaXYuc2V0QXR0cmlidXRlKCduYW1lJywnYScpO1xyXG4gICAgdGVzdERpdlsnbmFtZSddICE9PSAnYScgPyBjcmVsLmF0dHJNYXBbJ25hbWUnXSA9IGZ1bmN0aW9uKGVsZW1lbnQsIHZhbHVlKXtcclxuICAgICAgICBlbGVtZW50LmlkID0gdmFsdWU7XHJcbiAgICB9OnVuZGVmaW5lZDtcclxuXHJcblxyXG4gICAgdGVzdExhYmVsLnNldEF0dHJpYnV0ZSgnZm9yJywgJ2EnKTtcclxuICAgIHRlc3RMYWJlbFsnaHRtbEZvciddICE9PSAnYScgPyBjcmVsLmF0dHJNYXBbJ2ZvciddID0gJ2h0bWxGb3InOnVuZGVmaW5lZDtcclxuXHJcblxyXG5cclxuKi9cclxuXHJcbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xyXG4gICAgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xyXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgICAgICBkZWZpbmUoZmFjdG9yeSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJvb3QuY3JlbCA9IGZhY3RvcnkoKTtcclxuICAgIH1cclxufSh0aGlzLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAvLyBiYXNlZCBvbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzM4NDI4Ni9qYXZhc2NyaXB0LWlzZG9tLWhvdy1kby15b3UtY2hlY2staWYtYS1qYXZhc2NyaXB0LW9iamVjdC1pcy1hLWRvbS1vYmplY3RcclxuICAgIHZhciBpc05vZGUgPSB0eXBlb2YgTm9kZSA9PT0gJ2Z1bmN0aW9uJ1xyXG4gICAgICAgID8gZnVuY3Rpb24gKG9iamVjdCkgeyByZXR1cm4gb2JqZWN0IGluc3RhbmNlb2YgTm9kZTsgfVxyXG4gICAgICAgIDogZnVuY3Rpb24gKG9iamVjdCkge1xyXG4gICAgICAgICAgICByZXR1cm4gb2JqZWN0XHJcbiAgICAgICAgICAgICAgICAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0J1xyXG4gICAgICAgICAgICAgICAgJiYgdHlwZW9mIG9iamVjdC5ub2RlVHlwZSA9PT0gJ251bWJlcidcclxuICAgICAgICAgICAgICAgICYmIHR5cGVvZiBvYmplY3Qubm9kZU5hbWUgPT09ICdzdHJpbmcnO1xyXG4gICAgICAgIH07XHJcbiAgICB2YXIgaXNBcnJheSA9IGZ1bmN0aW9uKGEpeyByZXR1cm4gYSBpbnN0YW5jZW9mIEFycmF5OyB9O1xyXG4gICAgdmFyIGFwcGVuZENoaWxkID0gZnVuY3Rpb24oZWxlbWVudCwgY2hpbGQpIHtcclxuICAgICAgaWYoIWlzTm9kZShjaGlsZCkpe1xyXG4gICAgICAgICAgY2hpbGQgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjaGlsZCk7XHJcbiAgICAgIH1cclxuICAgICAgZWxlbWVudC5hcHBlbmRDaGlsZChjaGlsZCk7XHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBjcmVsKCl7XHJcbiAgICAgICAgdmFyIGRvY3VtZW50ID0gd2luZG93LmRvY3VtZW50LFxyXG4gICAgICAgICAgICBhcmdzID0gYXJndW1lbnRzLCAvL05vdGU6IGFzc2lnbmVkIHRvIGEgdmFyaWFibGUgdG8gYXNzaXN0IGNvbXBpbGVycy4gU2F2ZXMgYWJvdXQgNDAgYnl0ZXMgaW4gY2xvc3VyZSBjb21waWxlci4gSGFzIG5lZ2xpZ2FibGUgZWZmZWN0IG9uIHBlcmZvcm1hbmNlLlxyXG4gICAgICAgICAgICBlbGVtZW50ID0gYXJnc1swXSxcclxuICAgICAgICAgICAgY2hpbGQsXHJcbiAgICAgICAgICAgIHNldHRpbmdzID0gYXJnc1sxXSxcclxuICAgICAgICAgICAgY2hpbGRJbmRleCA9IDIsXHJcbiAgICAgICAgICAgIGFyZ3VtZW50c0xlbmd0aCA9IGFyZ3MubGVuZ3RoLFxyXG4gICAgICAgICAgICBhdHRyaWJ1dGVNYXAgPSBjcmVsLmF0dHJNYXA7XHJcblxyXG4gICAgICAgIGVsZW1lbnQgPSBpc05vZGUoZWxlbWVudCkgPyBlbGVtZW50IDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudChlbGVtZW50KTtcclxuICAgICAgICAvLyBzaG9ydGN1dFxyXG4gICAgICAgIGlmKGFyZ3VtZW50c0xlbmd0aCA9PT0gMSl7XHJcbiAgICAgICAgICAgIHJldHVybiBlbGVtZW50O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYodHlwZW9mIHNldHRpbmdzICE9PSAnb2JqZWN0JyB8fCBpc05vZGUoc2V0dGluZ3MpIHx8IGlzQXJyYXkoc2V0dGluZ3MpKSB7XHJcbiAgICAgICAgICAgIC0tY2hpbGRJbmRleDtcclxuICAgICAgICAgICAgc2V0dGluZ3MgPSBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gc2hvcnRjdXQgaWYgdGhlcmUgaXMgb25seSBvbmUgY2hpbGQgdGhhdCBpcyBhIHN0cmluZ1xyXG4gICAgICAgIGlmKChhcmd1bWVudHNMZW5ndGggLSBjaGlsZEluZGV4KSA9PT0gMSAmJiB0eXBlb2YgYXJnc1tjaGlsZEluZGV4XSA9PT0gJ3N0cmluZycgJiYgZWxlbWVudC50ZXh0Q29udGVudCAhPT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgICAgZWxlbWVudC50ZXh0Q29udGVudCA9IGFyZ3NbY2hpbGRJbmRleF07XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIGZvcig7IGNoaWxkSW5kZXggPCBhcmd1bWVudHNMZW5ndGg7ICsrY2hpbGRJbmRleCl7XHJcbiAgICAgICAgICAgICAgICBjaGlsZCA9IGFyZ3NbY2hpbGRJbmRleF07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoY2hpbGQgPT0gbnVsbCl7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGlzQXJyYXkoY2hpbGQpKSB7XHJcbiAgICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IGNoaWxkLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXBwZW5kQ2hpbGQoZWxlbWVudCwgY2hpbGRbaV0pO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICBhcHBlbmRDaGlsZChlbGVtZW50LCBjaGlsZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvcih2YXIga2V5IGluIHNldHRpbmdzKXtcclxuICAgICAgICAgICAgaWYoIWF0dHJpYnV0ZU1hcFtrZXldKXtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKGtleSwgc2V0dGluZ3Nba2V5XSk7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdmFyIGF0dHIgPSBjcmVsLmF0dHJNYXBba2V5XTtcclxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBhdHRyID09PSAnZnVuY3Rpb24nKXtcclxuICAgICAgICAgICAgICAgICAgICBhdHRyKGVsZW1lbnQsIHNldHRpbmdzW2tleV0pO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoYXR0ciwgc2V0dGluZ3Nba2V5XSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBlbGVtZW50O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFVzZWQgZm9yIG1hcHBpbmcgb25lIGtpbmQgb2YgYXR0cmlidXRlIHRvIHRoZSBzdXBwb3J0ZWQgdmVyc2lvbiBvZiB0aGF0IGluIGJhZCBicm93c2Vycy5cclxuICAgIC8vIFN0cmluZyByZWZlcmVuY2VkIHNvIHRoYXQgY29tcGlsZXJzIG1haW50YWluIHRoZSBwcm9wZXJ0eSBuYW1lLlxyXG4gICAgY3JlbFsnYXR0ck1hcCddID0ge307XHJcblxyXG4gICAgLy8gU3RyaW5nIHJlZmVyZW5jZWQgc28gdGhhdCBjb21waWxlcnMgbWFpbnRhaW4gdGhlIHByb3BlcnR5IG5hbWUuXHJcbiAgICBjcmVsW1wiaXNOb2RlXCJdID0gaXNOb2RlO1xyXG5cclxuICAgIHJldHVybiBjcmVsO1xyXG59KSk7XHJcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgd2luZG93OiBmYWxzZSAqL1xuLyogZ2xvYmFsIG5hdmlnYXRvcjogZmFsc2UgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgYnJvd3NlciA9IHJlcXVpcmUoJ2RldGVjdC1icm93c2VyJyk7XG5cbi8qKlxuICAjIyMgYHJ0Yy1jb3JlL2RldGVjdGBcblxuICBBIGJyb3dzZXIgZGV0ZWN0aW9uIGhlbHBlciBmb3IgYWNjZXNzaW5nIHByZWZpeC1mcmVlIHZlcnNpb25zIG9mIHRoZSB2YXJpb3VzXG4gIFdlYlJUQyB0eXBlcy5cblxuICAjIyMgRXhhbXBsZSBVc2FnZVxuXG4gIElmIHlvdSB3YW50ZWQgdG8gZ2V0IHRoZSBuYXRpdmUgYFJUQ1BlZXJDb25uZWN0aW9uYCBwcm90b3R5cGUgaW4gYW55IGJyb3dzZXJcbiAgeW91IGNvdWxkIGRvIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBganNcbiAgdmFyIGRldGVjdCA9IHJlcXVpcmUoJ3J0Yy1jb3JlL2RldGVjdCcpOyAvLyBhbHNvIGF2YWlsYWJsZSBpbiBydGMvZGV0ZWN0XG4gIHZhciBSVENQZWVyQ29ubmVjdGlvbiA9IGRldGVjdCgnUlRDUGVlckNvbm5lY3Rpb24nKTtcbiAgYGBgXG5cbiAgVGhpcyB3b3VsZCBwcm92aWRlIHdoYXRldmVyIHRoZSBicm93c2VyIHByZWZpeGVkIHZlcnNpb24gb2YgdGhlXG4gIFJUQ1BlZXJDb25uZWN0aW9uIGlzIGF2YWlsYWJsZSAoYHdlYmtpdFJUQ1BlZXJDb25uZWN0aW9uYCxcbiAgYG1velJUQ1BlZXJDb25uZWN0aW9uYCwgZXRjKS5cbioqL1xudmFyIGRldGVjdCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGFyZ2V0LCBwcmVmaXhlcykge1xuICB2YXIgcHJlZml4SWR4O1xuICB2YXIgcHJlZml4O1xuICB2YXIgdGVzdE5hbWU7XG4gIHZhciBob3N0T2JqZWN0ID0gdGhpcyB8fCAodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHVuZGVmaW5lZCk7XG5cbiAgLy8gaWYgd2UgaGF2ZSBubyBob3N0IG9iamVjdCwgdGhlbiBhYm9ydFxuICBpZiAoISBob3N0T2JqZWN0KSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gaW5pdGlhbGlzZSB0byBkZWZhdWx0IHByZWZpeGVzXG4gIC8vIChyZXZlcnNlIG9yZGVyIGFzIHdlIHVzZSBhIGRlY3JlbWVudGluZyBmb3IgbG9vcClcbiAgcHJlZml4ZXMgPSAocHJlZml4ZXMgfHwgWydtcycsICdvJywgJ21veicsICd3ZWJraXQnXSkuY29uY2F0KCcnKTtcblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHByZWZpeGVzIGFuZCByZXR1cm4gdGhlIGNsYXNzIGlmIGZvdW5kIGluIGdsb2JhbFxuICBmb3IgKHByZWZpeElkeCA9IHByZWZpeGVzLmxlbmd0aDsgcHJlZml4SWR4LS07ICkge1xuICAgIHByZWZpeCA9IHByZWZpeGVzW3ByZWZpeElkeF07XG5cbiAgICAvLyBjb25zdHJ1Y3QgdGhlIHRlc3QgY2xhc3MgbmFtZVxuICAgIC8vIGlmIHdlIGhhdmUgYSBwcmVmaXggZW5zdXJlIHRoZSB0YXJnZXQgaGFzIGFuIHVwcGVyY2FzZSBmaXJzdCBjaGFyYWN0ZXJcbiAgICAvLyBzdWNoIHRoYXQgYSB0ZXN0IGZvciBnZXRVc2VyTWVkaWEgd291bGQgcmVzdWx0IGluIGFcbiAgICAvLyBzZWFyY2ggZm9yIHdlYmtpdEdldFVzZXJNZWRpYVxuICAgIHRlc3ROYW1lID0gcHJlZml4ICsgKHByZWZpeCA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdGFyZ2V0LnNsaWNlKDEpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQpO1xuXG4gICAgaWYgKHR5cGVvZiBob3N0T2JqZWN0W3Rlc3ROYW1lXSAhPSAndW5kZWZpbmVkJykge1xuICAgICAgLy8gdXBkYXRlIHRoZSBsYXN0IHVzZWQgcHJlZml4XG4gICAgICBkZXRlY3QuYnJvd3NlciA9IGRldGVjdC5icm93c2VyIHx8IHByZWZpeC50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICAvLyByZXR1cm4gdGhlIGhvc3Qgb2JqZWN0IG1lbWJlclxuICAgICAgcmV0dXJuIGhvc3RPYmplY3RbdGFyZ2V0XSA9IGhvc3RPYmplY3RbdGVzdE5hbWVdO1xuICAgIH1cbiAgfVxufTtcblxuLy8gZGV0ZWN0IG1vemlsbGEgKHllcywgdGhpcyBmZWVscyBkaXJ0eSlcbmRldGVjdC5tb3ogPSB0eXBlb2YgbmF2aWdhdG9yICE9ICd1bmRlZmluZWQnICYmICEhbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYTtcblxuLy8gc2V0IHRoZSBicm93c2VyIGFuZCBicm93c2VyIHZlcnNpb25cbmRldGVjdC5icm93c2VyID0gYnJvd3Nlci5uYW1lO1xuZGV0ZWN0LmJyb3dzZXJWZXJzaW9uID0gZGV0ZWN0LnZlcnNpb24gPSBicm93c2VyLnZlcnNpb247XG4iLCJ2YXIgYnJvd3NlcnMgPSBbXG4gIFsgJ2Nocm9tZScsIC9DaHJvbSg/OmV8aXVtKVxcLyhbMC05XFwuXSspKDo/XFxzfCQpLyBdLFxuICBbICdmaXJlZm94JywgL0ZpcmVmb3hcXC8oWzAtOVxcLl0rKSg/Olxcc3wkKS8gXSxcbiAgWyAnb3BlcmEnLCAvT3BlcmFcXC8oWzAtOVxcLl0rKSg/Olxcc3wkKS8gXSxcbiAgWyAnaWUnLCAvVHJpZGVudFxcLzdcXC4wLipydlxcOihbMC05XFwuXSspXFwpLipHZWNrbyQvIF0sXG4gIFsgJ2llJywgL01TSUVcXHMoWzAtOVxcLl0rKTsuKlRyaWRlbnRcXC9bNC02XS4wLyBdLFxuICBbICdpZScsIC9NU0lFXFxzKDdcXC4wKS8gXSxcbiAgWyAnYmIxMCcsIC9CQjEwO1xcc1RvdWNoLipWZXJzaW9uXFwvKFswLTlcXC5dKykvIF0sXG4gIFsgJ2FuZHJvaWQnLCAvQW5kcm9pZFxccyhbMC05XFwuXSspLyBdLFxuICBbICdpb3MnLCAvaVBhZFxcO1xcc0NQVVxcc09TXFxzKFswLTlcXC5fXSspLyBdLFxuICBbICdpb3MnLCAgL2lQaG9uZVxcO1xcc0NQVVxcc2lQaG9uZVxcc09TXFxzKFswLTlcXC5fXSspLyBdLFxuICBbICdzYWZhcmknLCAvU2FmYXJpXFwvKFswLTlcXC5fXSspLyBdXG5dO1xuXG52YXIgbWF0Y2ggPSBicm93c2Vycy5tYXAobWF0Y2gpLmZpbHRlcihpc01hdGNoKVswXTtcbnZhciBwYXJ0cyA9IG1hdGNoICYmIG1hdGNoWzNdLnNwbGl0KC9bLl9dLykuc2xpY2UoMCwzKTtcblxud2hpbGUgKHBhcnRzICYmIHBhcnRzLmxlbmd0aCA8IDMpIHtcbiAgcGFydHMucHVzaCgnMCcpO1xufVxuXG4vLyBzZXQgdGhlIG5hbWUgYW5kIHZlcnNpb25cbmV4cG9ydHMubmFtZSA9IG1hdGNoICYmIG1hdGNoWzBdO1xuZXhwb3J0cy52ZXJzaW9uID0gcGFydHMgJiYgcGFydHMuam9pbignLicpO1xuXG5mdW5jdGlvbiBtYXRjaChwYWlyKSB7XG4gIHJldHVybiBwYWlyLmNvbmNhdChwYWlyWzFdLmV4ZWMobmF2aWdhdG9yLnVzZXJBZ2VudCkpO1xufVxuXG5mdW5jdGlvbiBpc01hdGNoKHBhaXIpIHtcbiAgcmV0dXJuICEhcGFpclsyXTtcbn1cbiIsInZhciBkZXRlY3QgPSByZXF1aXJlKCcuL2RldGVjdCcpO1xudmFyIHJlcXVpcmVkRnVuY3Rpb25zID0gW1xuICAnaW5pdCdcbl07XG5cbmZ1bmN0aW9uIGlzU3VwcG9ydGVkKHBsdWdpbikge1xuICByZXR1cm4gcGx1Z2luICYmIHR5cGVvZiBwbHVnaW4uc3VwcG9ydGVkID09ICdmdW5jdGlvbicgJiYgcGx1Z2luLnN1cHBvcnRlZChkZXRlY3QpO1xufVxuXG5mdW5jdGlvbiBpc1ZhbGlkKHBsdWdpbikge1xuICB2YXIgc3VwcG9ydGVkRnVuY3Rpb25zID0gcmVxdWlyZWRGdW5jdGlvbnMuZmlsdGVyKGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBwbHVnaW5bZm5dID09ICdmdW5jdGlvbic7XG4gIH0pO1xuXG4gIHJldHVybiBzdXBwb3J0ZWRGdW5jdGlvbnMubGVuZ3RoID09PSByZXF1aXJlZEZ1bmN0aW9ucy5sZW5ndGg7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocGx1Z2lucykge1xuICByZXR1cm4gW10uY29uY2F0KHBsdWdpbnMgfHwgW10pLmZpbHRlcihpc1N1cHBvcnRlZCkuZmlsdGVyKGlzVmFsaWQpWzBdO1xufVxuIiwiLyoqXG4gICMgcnRjLWZpbHRlci1ncmF5c2NhbGVcblxuICBBIHNpbXBsZSBncmF5c2NhbGUgZmlsdGVyIGZvciB1c2Ugd2l0aCB0aGVcbiAgW3J0Yy12aWRlb3Byb2NdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLXZpZGVvcHJvYykgbW9kdWxlLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICBUaGUgZm9sbG93aW5nIGV4YW1wbGUgY2FuIGJlIHJ1biB1c2luZ1xuICBbYmVlZnldKGh0dHBzOi8vZ2l0aHViLmNvbS9jaHJpc2RpY2tpbnNvbi9iZWVmeSkgKGBiZWVmeSBleGFtcGxlLmpzYCk6XG5cbiAgPDw8IGV4YW1wbGUuanNcblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGltYWdlRGF0YSkge1xuICB2YXIgY2hhbm5lbHMgPSBpbWFnZURhdGEuZGF0YTtcbiAgdmFyIHJnYiA9IFtdO1xuICB2YXIgcmdiQXZnO1xuICB2YXIgYWxwaGE7XG4gIHZhciBpaTtcblxuICAvLyBjaGVjayB0aGF0IHdlIGhhdmUgY2hhbm5lbHMgaXMgZGl2aXNpYmxlIGJ5IGZvdXIgKGp1c3QgYXMgYSBzYWZldHkpXG4gIGlmIChjaGFubmVscy5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBkYXRhXG4gIC8vIE5PVEU6IGRlY3JlbWVudGluZyBsb29wcyBhcmUgZmFzdCBidXQgeW91IG5lZWQgdG8ga25vdyB0aGF0IHlvdSB3aWxsXG4gIC8vIGhpdCAwIHVzaW5nIHRoaXMgbG9naWMgb3RoZXJ3aXNlIGl0IHdpbGwgcnVuIGZvcmV2ZXIgKG9ubHkgMCBpcyBmYWxzeSlcbiAgZm9yIChpaSA9IGNoYW5uZWxzLmxlbmd0aDsgaWkgLT0gNDsgKSB7XG4gICAgLy8gZ2V0IHRoZSByZ2IgdHVwbGVcbiAgICByZ2IgPSBbY2hhbm5lbHNbaWldLCBjaGFubmVsc1tpaSArIDFdLCBjaGFubmVsc1tpaSArIDJdXTtcblxuICAgIC8vIGdldCB0aGUgYWxwaGEgdmFsdWVcbiAgICBhbHBoYSA9IGNoYW5uZWxzW2lpICsgM107XG5cbiAgICAvLyBjYWxjdWxhdGUgdGhlIHJnYiBhdmVyYWdlXG4gICAgcmdiQXZnID0gKHJnYlswXSArIHJnYlsxXSArIHJnYlsyXSApIC8gMztcblxuICAgIC8vIHVwZGF0ZSB0aGUgdmFsdWVzIHRvIHRoZSByZ2IgYXZlcmFnZVxuICAgIGNoYW5uZWxzW2lpXSA9IGNoYW5uZWxzW2lpICsgMV0gPSBjaGFubmVsc1tpaSArIDJdID0gcmdiQXZnO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgbmF2aWdhdG9yOiBmYWxzZSAqL1xuLyogZ2xvYmFsIHdpbmRvdzogZmFsc2UgKi9cbi8qIGdsb2JhbCBkb2N1bWVudDogZmFsc2UgKi9cbi8qIGdsb2JhbCBNZWRpYVN0cmVhbTogZmFsc2UgKi9cbi8qIGdsb2JhbCBIVE1MVmlkZW9FbGVtZW50OiBmYWxzZSAqL1xuLyogZ2xvYmFsIEhUTUxBdWRpb0VsZW1lbnQ6IGZhbHNlICovXG5cbi8qKlxuICAjIHJ0Yy1tZWRpYVxuXG4gIFNpbXBsZSBbZ2V0VXNlck1lZGlhXShodHRwOi8vZGV2LnczLm9yZy8yMDExL3dlYnJ0Yy9lZGl0b3IvZ2V0dXNlcm1lZGlhLmh0bWwpXG4gIGNyb3NzLWJyb3dzZXIgd3JhcHBlcnMuICBQYXJ0IG9mIHRoZSBbcnRjLmlvXShodHRwOi8vcnRjLmlvLykgc3VpdGUsIHdoaWNoIGlzXG4gIHNwb25zb3JlZCBieSBbTklDVEFdKGh0dHA6Ly9vcGVubmljdGEuY29tKSBhbmQgcmVsZWFzZWQgdW5kZXIgYW5cbiAgW0FwYWNoZSAyLjAgbGljZW5zZV0oL0xJQ0VOU0UpLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICBDYXB0dXJpbmcgbWVkaWEgb24geW91ciBtYWNoaW5lIGlzIGFzIHNpbXBsZSBhczpcblxuICBgYGBqc1xuICByZXF1aXJlKCdydGMtbWVkaWEnKSgpO1xuICBgYGBcblxuICBXaGlsZSB0aGlzIHdpbGwgaW4gZmFjdCBzdGFydCB0aGUgdXNlciBtZWRpYSBjYXB0dXJlIHByb2Nlc3MsIGl0IHdvbid0XG4gIGRvIGFueXRoaW5nIHdpdGggaXQuICBMZXRzIHRha2UgYSBsb29rIGF0IGEgbW9yZSByZWFsaXN0aWMgZXhhbXBsZTpcblxuICA8PDwgZXhhbXBsZXMvcmVuZGVyLXRvLWJvZHkuanNcblxuICBbcnVuIG9uIHJlcXVpcmViaW5dKGh0dHA6Ly9yZXF1aXJlYmluLmNvbS8/Z2lzdD02MDg1NDUwKVxuXG4gIEluIHRoZSBjb2RlIGFib3ZlLCB3ZSBhcmUgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2Ugb2Ygb3VyIHVzZXJNZWRpYSB3cmFwcGVyXG4gIHVzaW5nIHRoZSBgbWVkaWEoKWAgY2FsbCBhbmQgdGhlbiB0ZWxsaW5nIGl0IHRvIHJlbmRlciB0byB0aGVcbiAgYGRvY3VtZW50LmJvZHlgIG9uY2UgdmlkZW8gc3RhcnRzIHN0cmVhbWluZy4gIFdlIGNhbiBmdXJ0aGVyIGV4cGFuZCB0aGVcbiAgY29kZSBvdXQgdG8gdGhlIGZvbGxvd2luZyB0byBhaWQgb3VyIHVuZGVyc3RhbmRpbmcgb2Ygd2hhdCBpcyBnb2luZyBvbjpcblxuICA8PDwgZXhhbXBsZXMvY2FwdHVyZS1leHBsaWNpdC5qc1xuXG4gIFRoZSBjb2RlIGFib3ZlIGlzIHdyaXR0ZW4gaW4gYSBtb3JlIHRyYWRpdGlvbmFsIEpTIHN0eWxlLCBidXQgZmVlbCBmcmVlXG4gIHRvIHVzZSB0aGUgZmlyc3Qgc3R5bGUgYXMgaXQncyBxdWl0ZSBzYWZlICh0aGFua3MgdG8gc29tZSBjaGVja3MgaW4gdGhlXG4gIGNvZGUpLlxuXG4gICMjIyBFdmVudHNcblxuICBPbmNlIGEgbWVkaWEgb2JqZWN0IGhhcyBiZWVuIGNyZWF0ZWQsIGl0IHdpbGwgcHJvdmlkZSBhIG51bWJlciBvZiBldmVudHNcbiAgdGhyb3VnaCB0aGUgc3RhbmRhcmQgbm9kZSBFdmVudEVtaXR0ZXIgQVBJLlxuXG4gICMjIyMgYGNhcHR1cmVgXG5cbiAgVGhlIGBjYXB0dXJlYCBldmVudCBpcyB0cmlnZ2VyZWQgb25jZSB0aGUgcmVxdWVzdGVkIG1lZGlhIHN0cmVhbSBoYXNcbiAgYmVlbiBjYXB0dXJlZCBieSB0aGUgYnJvd3Nlci5cblxuICA8PDwgZXhhbXBsZXMvY2FwdHVyZS1ldmVudC5qc1xuXG4gICMjIyMgYHJlbmRlcmBcblxuICBUaGUgYHJlbmRlcmAgZXZlbnQgaXMgdHJpZ2dlcmVkIG9uY2UgdGhlIHN0cmVhbSBoYXMgYmVlbiByZW5kZXJlZFxuICB0byB0aGUgYW55IHN1cHBsaWVkIChvciBjcmVhdGVkKSB2aWRlbyBlbGVtZW50cy5cblxuICBXaGlsZSBpdCBtaWdodCBzZWVtIGEgbGl0dGxlIGNvbmZ1c2luZyB0aGF0IHdoZW4gdGhlIGByZW5kZXJgIGV2ZW50XG4gIGZpcmVzIHRoYXQgaXQgcmV0dXJucyBhbiBhcnJheSBvZiBlbGVtZW50cyByYXRoZXIgdGhhbiBhIHNpbmdsZSBlbGVtZW50XG4gICh3aGljaCBpcyB3aGF0IGlzIHByb3ZpZGVkIHdoZW4gY2FsbGluZyB0aGUgYHJlbmRlcmAgbWV0aG9kKS5cblxuICBUaGlzIG9jY3VycyBiZWNhdXNlIGl0IGlzIGNvbXBsZXRlbHkgdmFsaWQgdG8gcmVuZGVyIGEgc2luZ2xlIGNhcHR1cmVkXG4gIG1lZGlhIHN0cmVhbSB0byBtdWx0aXBsZSBtZWRpYSBlbGVtZW50cyBvbiBhIHBhZ2UuICBUaGUgYHJlbmRlcmAgZXZlbnRcbiAgaXMgcmVwb3J0aW5nIG9uY2UgdGhlIHJlbmRlciBvcGVyYXRpb24gaGFzIGNvbXBsZXRlZCBmb3IgYWxsIHRhcmdldHMgdGhhdFxuICBoYXZlIGJlZW4gcmVnaXN0ZXJlZCB3aXRoIHRoZSBjYXB0dXJlIHN0cmVhbS5cblxuICAjIyBSZWZlcmVuY2VcblxuKiovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpKCdydGMtbWVkaWEnKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG52YXIgZGV0ZWN0ID0gcmVxdWlyZSgncnRjLWNvcmUvZGV0ZWN0Jyk7XG52YXIgcGx1Z2luID0gcmVxdWlyZSgncnRjLWNvcmUvcGx1Z2luJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRlbWl0dGVyMycpO1xudmFyIGluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuLy8gbW9ua2V5IHBhdGNoIGdldFVzZXJNZWRpYSBmcm9tIHRoZSBwcmVmaXhlZCB2ZXJzaW9uXG5uYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gbmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fFxuICBkZXRlY3QuY2FsbChuYXZpZ2F0b3IsICdnZXRVc2VyTWVkaWEnKTtcblxuLy8gcGF0Y2ggd2luZG93IHVybFxud2luZG93LlVSTCA9IHdpbmRvdy5VUkwgfHwgZGV0ZWN0KCdVUkwnKTtcblxuLy8gcGF0Y2ggbWVkaWEgc3RyZWFtXG53aW5kb3cuTWVkaWFTdHJlYW0gPSBkZXRlY3QoJ01lZGlhU3RyZWFtJyk7XG5cbi8qKlxuICAjIyMgbWVkaWFcblxuICBgYGBcbiAgbWVkaWEob3B0cz8pXG4gIGBgYFxuXG4gIENhcHR1cmUgbWVkaWEgdXNpbmcgdGhlIHVuZGVybHlpbmdcbiAgW2dldFVzZXJNZWRpYV0oaHR0cDovL3d3dy53My5vcmcvVFIvbWVkaWFjYXB0dXJlLXN0cmVhbXMvKSBBUEkuXG5cbiAgVGhlIGZ1bmN0aW9uIGFjY2VwdHMgYSBzaW5nbGUgYXJndW1lbnQgd2hpY2ggY2FuIGJlIGVpdGhlciBiZTpcblxuICAtIGEuIEFuIG9wdGlvbnMgb2JqZWN0IChzZWUgYmVsb3cpLCBvcjtcbiAgLSBiLiBBbiBleGlzdGluZ1xuICAgIFtNZWRpYVN0cmVhbV0oaHR0cDovL3d3dy53My5vcmcvVFIvbWVkaWFjYXB0dXJlLXN0cmVhbXMvI21lZGlhc3RyZWFtKSB0aGF0XG4gICAgdGhlIG1lZGlhIG9iamVjdCB3aWxsIGJpbmQgdG8gYW5kIHByb3ZpZGUgeW91IHNvbWUgRE9NIGhlbHBlcnMgZm9yLlxuXG4gIFRoZSBmdW5jdGlvbiBzdXBwb3J0cyB0aGUgZm9sbG93aW5nIG9wdGlvbnM6XG5cbiAgLSBgY2FwdHVyZWAgLSBXaGV0aGVyIGNhcHR1cmUgc2hvdWxkIGJlIGluaXRpYXRlZCBhdXRvbWF0aWNhbGx5LiBEZWZhdWx0c1xuICAgIHRvIHRydWUsIGJ1dCB0b2dnbGVkIHRvIGZhbHNlIGF1dG9tYXRpY2FsbHkgaWYgYW4gZXhpc3Rpbmcgc3RyZWFtIGlzXG4gICAgcHJvdmlkZWQuXG5cbiAgLSBgbXV0ZWRgIC0gV2hldGhlciB0aGUgdmlkZW8gZWxlbWVudCBjcmVhdGVkIGZvciB0aGlzIHN0cmVhbSBzaG91bGQgYmVcbiAgICBtdXRlZC4gIERlZmF1bHQgaXMgdHJ1ZSBidXQgaXMgc2V0IHRvIGZhbHNlIHdoZW4gYW4gZXhpc3Rpbmcgc3RyZWFtIGlzXG4gICAgcGFzc2VkLlxuXG4gIC0gYGNvbnN0cmFpbnRzYCAtIFRoZSBjb25zdHJhaW50IG9wdGlvbiBhbGxvd3MgeW91IHRvIHNwZWNpZnkgcGFydGljdWxhclxuICAgIG1lZGlhIGNhcHR1cmUgY29uc3RyYWludHMgd2hpY2ggY2FuIGFsbG93IHlvdSBkbyBkbyBzb21lIHByZXR0eSBjb29sXG4gICAgdHJpY2tzLiAgQnkgZGVmYXVsdCwgdGhlIGNvbnRyYWludHMgdXNlZCB0byByZXF1ZXN0IHRoZSBtZWRpYSBhcmVcbiAgICBmYWlybHkgc3RhbmRhcmQgZGVmYXVsdHM6XG5cbiAgICBgYGBqc1xuICAgICAge1xuICAgICAgICB2aWRlbzoge1xuICAgICAgICAgIG1hbmRhdG9yeToge30sXG4gICAgICAgICAgb3B0aW9uYWw6IFtdXG4gICAgICAgIH0sXG4gICAgICAgIGF1ZGlvOiB0cnVlXG4gICAgICB9XG4gICAgYGBgXG5cbioqL1xuZnVuY3Rpb24gTWVkaWEob3B0cykge1xuICB2YXIgbWVkaWEgPSB0aGlzO1xuXG4gIC8vIGNoZWNrIHRoZSBjb25zdHJ1Y3RvciBoYXMgYmVlbiBjYWxsZWRcbiAgaWYgKCEgKHRoaXMgaW5zdGFuY2VvZiBNZWRpYSkpIHtcbiAgICByZXR1cm4gbmV3IE1lZGlhKG9wdHMpO1xuICB9XG5cbiAgLy8gaW5oZXJpdGVkXG4gIEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xuXG4gIC8vIGlmIHRoZSBvcHRzIGlzIGEgbWVkaWEgc3RyZWFtIGluc3RhbmNlLCB0aGVuIGhhbmRsZSB0aGF0IGFwcHJvcHJpYXRlbHlcbiAgaWYgKG9wdHMgJiYgTWVkaWFTdHJlYW0gJiYgb3B0cyBpbnN0YW5jZW9mIE1lZGlhU3RyZWFtKSB7XG4gICAgb3B0cyA9IHtcbiAgICAgIHN0cmVhbTogb3B0c1xuICAgIH07XG4gIH1cblxuICAvLyBpZiB3ZSd2ZSBiZWVuIHBhc3NlZCBvcHRzIGFuZCB0aGV5IGxvb2sgbGlrZSBjb25zdHJhaW50cywgbW92ZSB0aGluZ3NcbiAgLy8gYXJvdW5kIGEgbGl0dGxlXG4gIGlmIChvcHRzICYmIChvcHRzLmF1ZGlvIHx8IG9wdHMudmlkZW8pKSB7XG4gICAgb3B0cyA9IHtcbiAgICAgIGNvbnN0cmFpbnRzOiBvcHRzXG4gICAgfTtcbiAgfVxuXG4gIC8vIGVuc3VyZSB3ZSBoYXZlIG9wdHNcbiAgb3B0cyA9IGV4dGVuZCh7fSwge1xuICAgIGNhcHR1cmU6ICghIG9wdHMpIHx8ICghIG9wdHMuc3RyZWFtKSxcbiAgICBtdXRlZDogKCEgb3B0cykgfHwgKCEgb3B0cy5zdHJlYW0pLFxuICAgIGNvbnN0cmFpbnRzOiB7XG4gICAgICB2aWRlbzoge1xuICAgICAgICBtYW5kYXRvcnk6IHt9LFxuICAgICAgICBvcHRpb25hbDogW11cbiAgICAgIH0sXG4gICAgICBhdWRpbzogdHJ1ZSxcblxuICAgICAgLy8gc3BlY2lmeSB0aGUgZmFrZSBmbGFnIGlmIHdlIGRldGVjdCB3ZSBhcmUgcnVubmluZyBpbiB0aGUgdGVzdFxuICAgICAgLy8gZW52aXJvbm1lbnQsIG9uIGNocm9tZSB0aGlzIHdpbGwgZG8gbm90aGluZyBidXQgaW4gZmlyZWZveCBpdCB3aWxsXG4gICAgICAvLyB1c2UgYSBmYWtlIHZpZGVvIGRldmljZVxuICAgICAgZmFrZTogdHlwZW9mIF9fdGVzdGxpbmdDb25zb2xlICE9ICd1bmRlZmluZWQnXG4gICAgfVxuICB9LCBvcHRzKTtcblxuICAvLyBzYXZlIHRoZSBjb25zdHJhaW50c1xuICB0aGlzLmNvbnN0cmFpbnRzID0gb3B0cy5jb25zdHJhaW50cztcblxuICAvLyBpZiBhIG5hbWUgaGFzIGJlZW4gc3BlY2lmaWVkIGluIHRoZSBvcHRzLCBzYXZlIGl0IHRvIHRoZSBtZWRpYVxuICB0aGlzLm5hbWUgPSBvcHRzLm5hbWU7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgc3RyZWFtIHRvIG51bGxcbiAgdGhpcy5zdHJlYW0gPSBvcHRzLnN0cmVhbSB8fCBudWxsO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIG11dGVkIHN0YXRlXG4gIHRoaXMubXV0ZWQgPSB0eXBlb2Ygb3B0cy5tdXRlZCA9PSAndW5kZWZpbmVkJyB8fCBvcHRzLm11dGVkO1xuXG4gIC8vIGNyZWF0ZSBhIGJpbmRpbmdzIGFycmF5IHNvIHdlIGhhdmUgYSByb3VnaCBpZGVhIG9mIHdoZXJlXG4gIC8vIHdlIGhhdmUgYmVlbiBhdHRhY2hlZCB0b1xuICAvLyBUT0RPOiByZXZpc2l0IHdoZXRoZXIgdGhpcyBpcyB0aGUgYmVzdCB3YXkgdG8gbWFuYWdlIHRoaXNcbiAgdGhpcy5fYmluZGluZ3MgPSBbXTtcblxuICAvLyBzZWUgaWYgd2UgYXJlIHVzaW5nIGEgcGx1Z2luXG4gIHRoaXMucGx1Z2luID0gcGx1Z2luKChvcHRzIHx8IHt9KS5wbHVnaW5zKTtcbiAgaWYgKHRoaXMucGx1Z2luKSB7XG4gICAgLy8gaWYgd2UgYXJlIHVzaW5nIGEgcGx1Z2luLCBnaXZlIGl0IGFuIG9wcG9ydHVuaXR5IHRvIHBhdGNoIHRoZVxuICAgIC8vIG1lZGlhIGNhcHR1cmUgaW50ZXJmYWNlXG4gICAgbWVkaWEuX3BpbnN0ID0gdGhpcy5wbHVnaW4uaW5pdChvcHRzLCBmdW5jdGlvbihlcnIpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdpbml0aWFsaXphdGlvbiBjb21wbGV0ZScpO1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gbWVkaWEuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgICAgfVxuXG4gICAgICBpZiAoKCEgb3B0cy5zdHJlYW0pICYmIG9wdHMuY2FwdHVyZSkge1xuICAgICAgICBtZWRpYS5jYXB0dXJlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgLy8gaWYgd2UgYXJlIGF1dG9zdGFydGluZywgY2FwdHVyZSBtZWRpYSBvbiB0aGUgbmV4dCB0aWNrXG4gIGVsc2UgaWYgKG9wdHMuY2FwdHVyZSkge1xuICAgIHNldFRpbWVvdXQodGhpcy5jYXB0dXJlLmJpbmQodGhpcyksIDApO1xuICB9XG59XG5cbmluaGVyaXRzKE1lZGlhLCBFdmVudEVtaXR0ZXIpO1xubW9kdWxlLmV4cG9ydHMgPSBNZWRpYTtcblxuLyoqXG4gICMjIyBjYXB0dXJlXG5cbiAgYGBgXG4gIGNhcHR1cmUoY29uc3RyYWludHMsIGNhbGxiYWNrKVxuICBgYGBcblxuICBDYXB0dXJlIG1lZGlhLiAgSWYgY29uc3RyYWludHMgYXJlIHByb3ZpZGVkLCB0aGVuIHRoZXkgd2lsbFxuICBvdmVycmlkZSB0aGUgZGVmYXVsdCBjb25zdHJhaW50cyB0aGF0IHdlcmUgdXNlZCB3aGVuIHRoZSBtZWRpYSBvYmplY3Qgd2FzXG4gIGNyZWF0ZWQuXG4qKi9cbk1lZGlhLnByb3RvdHlwZS5jYXB0dXJlID0gZnVuY3Rpb24oY29uc3RyYWludHMsIGNhbGxiYWNrKSB7XG4gIHZhciBtZWRpYSA9IHRoaXM7XG4gIHZhciBoYW5kbGVFbmQgPSB0aGlzLmVtaXQuYmluZCh0aGlzLCAnZW5kJyk7XG5cbiAgLy8gaWYgd2UgYWxyZWFkeSBoYXZlIGEgc3RyZWFtLCB0aGVuIGFib3J0XG4gIGlmICh0aGlzLnN0cmVhbSkgeyByZXR1cm47IH1cblxuICAvLyBpZiBubyBjb25zdHJhaW50cyBoYXZlIGJlZW4gcHJvdmlkZWQsIGJ1dCB3ZSBoYXZlXG4gIC8vIGEgY2FsbGJhY2ssIGRlYWwgd2l0aCBpdFxuICBpZiAodHlwZW9mIGNvbnN0cmFpbnRzID09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IGNvbnN0cmFpbnRzO1xuICAgIGNvbnN0cmFpbnRzID0gdGhpcy5jb25zdHJhaW50cztcbiAgfVxuXG4gIC8vIGlmIHdlIGhhdmUgYSBjYWxsYmFjaywgYmluZCB0byB0aGUgc3RhcnQgZXZlbnRcbiAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhpcy5vbmNlKCdjYXB0dXJlJywgY2FsbGJhY2suYmluZCh0aGlzKSk7XG4gIH1cblxuICAvLyBpZiB3ZSBkb24ndCBoYXZlIGdldCB0aGUgYWJpbGl0eSB0byBjYXB0dXJlIHVzZXIgbWVkaWEsIHRoZW4gYWJvcnRcbiAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhICE9ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gY2FsbGJhY2sgJiYgY2FsbGJhY2sobmV3IEVycm9yKCdVbmFibGUgdG8gY2FwdHVyZSB1c2VyIG1lZGlhJykpO1xuICB9XG5cbiAgLy8gZ2V0IHVzZXIgbWVkaWEsIHVzaW5nIGVpdGhlciB0aGUgcHJvdmlkZWQgY29uc3RyYWludHMgb3IgdGhlXG4gIC8vIGRlZmF1bHQgY29uc3RyYWludHNcbiAgZGVidWcoJ2dldFVzZXJNZWRpYSwgY29uc3RyYWludHM6ICcsIGNvbnN0cmFpbnRzIHx8IHRoaXMuY29uc3RyYWludHMpO1xuICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKFxuICAgIGNvbnN0cmFpbnRzIHx8IHRoaXMuY29uc3RyYWludHMsXG4gICAgZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICBkZWJ1Zygnc3VjZXNzZnVsbHkgY2FwdHVyZWQgbWVkaWEgc3RyZWFtOiAnLCBzdHJlYW0pO1xuICAgICAgaWYgKHR5cGVvZiBzdHJlYW0uYWRkRXZlbnRMaXN0ZW5lciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHN0cmVhbS5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsIGhhbmRsZUVuZCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgc3RyZWFtLm9uZW5kZWQgPSBoYW5kbGVFbmQ7XG4gICAgICB9XG5cbiAgICAgIC8vIHNhdmUgdGhlIHN0cmVhbSBhbmQgZW1pdCB0aGUgc3RhcnQgbWV0aG9kXG4gICAgICBtZWRpYS5zdHJlYW0gPSBzdHJlYW07XG5cbiAgICAgIC8vIGVtaXQgY2FwdHVyZSBvbiBuZXh0IHRpY2sgd2hpY2ggd29ya3MgYXJvdW5kIGEgYnVnIHdoZW4gdXNpbmcgcGx1Z2luc1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgbWVkaWEuZW1pdCgnY2FwdHVyZScsIHN0cmVhbSk7XG4gICAgICB9LCAwKTtcbiAgICB9LFxuXG4gICAgZnVuY3Rpb24oZXJyKSB7XG4gICAgICBkZWJ1ZygnZ2V0VXNlck1lZGlhIGF0dGVtcHQgZmFpbGVkOiAnLCBlcnIpO1xuICAgICAgbWVkaWEuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgIH1cbiAgKTtcbn07XG5cbi8qKlxuICAjIyMgcmVuZGVyXG5cbiAgYGBganNcbiAgcmVuZGVyKHRhcmdldCwgb3B0cz8sIGNhbGxiYWNrPylcbiAgYGBgXG5cbiAgUmVuZGVyIHRoZSBjYXB0dXJlZCBtZWRpYSB0byB0aGUgc3BlY2lmaWVkIHRhcmdldCBlbGVtZW50LiAgV2hpbGUgcHJldmlvdXNcbiAgdmVyc2lvbnMgb2YgcnRjLW1lZGlhIGFjY2VwdGVkIGEgc2VsZWN0b3Igc3RyaW5nIG9yIGFuIGFycmF5IG9mIGVsZW1lbnRzXG4gIHRoaXMgaGFzIGJlZW4gZHJvcHBlZCBpbiBmYXZvdXIgb2YgX19vbmUgc2luZ2xlIHRhcmdldCBlbGVtZW50X18uXG5cbiAgSWYgdGhlIHRhcmdldCBlbGVtZW50IGlzIGEgdmFsaWQgTWVkaWFFbGVtZW50IHRoZW4gaXQgd2lsbCBiZWNvbWUgdGhlXG4gIHRhcmdldCBvZiB0aGUgY2FwdHVyZWQgbWVkaWEgc3RyZWFtLiAgSWYsIGhvd2V2ZXIsIGl0IGlzIGEgZ2VuZXJpYyBET01cbiAgZWxlbWVudCBpdCB3aWxsIGEgbmV3IE1lZGlhIGVsZW1lbnQgd2lsbCBiZSBjcmVhdGVkIHRoYXQgdXNpbmcgdGhlIHRhcmdldFxuICBhcyBpdCdzIHBhcmVudC5cblxuICBBIHNpbXBsZSBleGFtcGxlIG9mIHJlcXVlc3RpbmcgZGVmYXVsdCBtZWRpYSBjYXB0dXJlIGFuZCByZW5kZXJpbmcgdG8gdGhlXG4gIGRvY3VtZW50IGJvZHkgaXMgc2hvd24gYmVsb3c6XG5cbiAgPDw8IGV4YW1wbGVzL3JlbmRlci10by1ib2R5LmpzXG5cbiAgWW91IG1heSBvcHRpb25hbGx5IHByb3ZpZGUgYSBjYWxsYmFjayB0byB0aGlzIGZ1bmN0aW9uLCB3aGljaCBpc1xuICB3aWxsIGJlIHRyaWdnZXJlZCBvbmNlIGVhY2ggb2YgdGhlIG1lZGlhIGVsZW1lbnRzIGhhcyBzdGFydGVkIHBsYXlpbmdcbiAgdGhlIHN0cmVhbTpcblxuICA8PDwgZXhhbXBsZXMvcmVuZGVyLWNhcHR1cmUtY2FsbGJhY2suanNcblxuKiovXG5NZWRpYS5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24odGFyZ2V0LCBvcHRzLCBjYWxsYmFjaykge1xuICAvLyBpZiB0aGUgdGFyZ2V0IGlzIGFuIGFycmF5LCBleHRyYWN0IHRoZSBmaXJzdCBlbGVtZW50XG4gIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcbiAgICAvLyBsb2cgYSB3YXJuaW5nXG4gICAgY29uc29sZS5sb2coJ1dBUk5JTkc6IHJ0Yy1tZWRpYSByZW5kZXIgKGFzIG9mIDEueCkgZXhwZWN0cyBhIHNpbmdsZSB0YXJnZXQnKTtcbiAgICB0YXJnZXQgPSB0YXJnZXRbMF07XG4gIH1cblxuICBpZiAodHlwZW9mIG9wdHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICBvcHRzID0ge307XG4gIH1cblxuICAvLyBlbnN1cmUgd2UgaGF2ZSBvcHRzXG4gIG9wdHMgPSBvcHRzIHx8IHt9O1xuXG4gIC8vIGNyZWF0ZSB0aGUgdmlkZW8gLyBhdWRpbyBlbGVtZW50c1xuICB0YXJnZXQgPSB0aGlzLl9wcmVwYXJlRWxlbWVudChvcHRzLCB0YXJnZXQpO1xuICBjb25zb2xlLmxvZygnYXR0ZW1wdGluZyByZW5kZXIsIHN0cmVhbTogJywgdGhpcy5zdHJlYW0pO1xuXG4gIC8vIGlmIG5vIHN0cmVhbSB3YXMgc3BlY2lmaWVkLCB3YWl0IGZvciB0aGUgc3RyZWFtIHRvIGluaXRpYWxpemVcbiAgaWYgKCEgdGhpcy5zdHJlYW0pIHtcbiAgICB0aGlzLm9uY2UoJ2NhcHR1cmUnLCB0aGlzLl9iaW5kU3RyZWFtLmJpbmQodGhpcykpO1xuICB9XG4gIC8vIG90aGVyd2lzZSwgYmluZCB0aGUgc3RyZWFtIG5vd1xuICBlbHNlIHtcbiAgICB0aGlzLl9iaW5kU3RyZWFtKHRoaXMuc3RyZWFtKTtcbiAgfVxuXG4gIC8vIGlmIHdlIGhhdmUgYSBjYWxsYmFjayB0aGVuIHRyaWdnZXIgb24gdGhlIHJlbmRlciBldmVudFxuICBpZiAodHlwZW9mIGNhbGxiYWNrID09ICdmdW5jdGlvbicpIHtcbiAgICB0aGlzLm9uY2UoJ3JlbmRlcicsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIHJldHVybiB0YXJnZXQ7XG59O1xuXG4vKipcbiAgIyMjIHN0b3AoKVxuXG4gIFN0b3AgdGhlIG1lZGlhIHN0cmVhbVxuKiovXG5NZWRpYS5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgdmFyIG1lZGlhID0gdGhpcztcblxuICBpZiAoISB0aGlzLnN0cmVhbSkgeyByZXR1cm47IH1cblxuICAvLyByZW1vdmUgYmluZGluZ3NcbiAgdGhpcy5fdW5iaW5kKG9wdHMpO1xuXG4gIC8vIHN0b3AgdGhlIHN0cmVhbSwgYW5kIHRlbGwgdGhlIHdvcmxkXG4gIHRoaXMuc3RyZWFtLnN0b3AoKTtcblxuICAvLyBvbiBjYXB0dXJlIHJlYmluZFxuICB0aGlzLm9uY2UoJ2NhcHR1cmUnLCBtZWRpYS5fYmluZFN0cmVhbS5iaW5kKG1lZGlhKSk7XG5cbiAgLy8gcmVtb3ZlIHRoZSByZWZlcmVuY2UgdG8gdGhlIHN0cmVhbVxuICB0aGlzLnN0cmVhbSA9IG51bGw7XG59O1xuXG4vKipcbiAgIyMgRGVidWdnaW5nIFRpcHNcblxuICBDaHJvbWUgYW5kIENocm9taXVtIGNhbiBib3RoIGJlIHN0YXJ0ZWQgd2l0aCB0aGUgZm9sbG93aW5nIGZsYWc6XG5cbiAgYGBgXG4gIC0tdXNlLWZha2UtZGV2aWNlLWZvci1tZWRpYS1zdHJlYW1cbiAgYGBgXG5cbiAgVGhpcyB1c2VzIGEgZmFrZSBzdHJlYW0gZm9yIHRoZSBnZXRVc2VyTWVkaWEoKSBjYWxsIHJhdGhlciB0aGFuIGF0dGVtcHRpbmdcbiAgdG8gY2FwdHVyZSB0aGUgYWN0dWFsIGNhbWVyYS4gIFRoaXMgaXMgdXNlZnVsIHdoZW4gZG9pbmcgYXV0b21hdGVkIHRlc3RpbmdcbiAgYW5kIGFsc28gaWYgeW91IHdhbnQgdG8gdGVzdCBjb25uZWN0aXZpdHkgYmV0d2VlbiB0d28gYnJvd3NlciBpbnN0YW5jZXMgYW5kXG4gIHdhbnQgdG8gZGlzdGluZ3Vpc2ggYmV0d2VlbiB0aGUgdHdvIGxvY2FsIHZpZGVvcy5cblxuICAjIyBJbnRlcm5hbCBNZXRob2RzXG5cbiAgVGhlcmUgYXJlIGEgbnVtYmVyIG9mIGludGVybmFsIG1ldGhvZHMgdGhhdCBhcmUgdXNlZCBpbiB0aGUgYHJ0Yy1tZWRpYWBcbiAgaW1wbGVtZW50YXRpb24uIFRoZXNlIGFyZSBvdXRsaW5lZCBiZWxvdywgYnV0IG5vdCBleHBlY3RlZCB0byBiZSBvZlxuICBnZW5lcmFsIHVzZS5cblxuKiovXG5cbk1lZGlhLnByb3RvdHlwZS5fY3JlYXRlQmluZGluZyA9IGZ1bmN0aW9uKG9wdHMsIGVsZW1lbnQpIHtcbiAgdGhpcy5fYmluZGluZ3MucHVzaCh7XG4gICAgZWw6IGVsZW1lbnQsXG4gICAgb3B0czogb3B0c1xuICB9KTtcblxuICByZXR1cm4gZWxlbWVudDtcbn07XG5cbi8qKlxuICAjIyMgX3ByZXBhcmVFbGVtZW50KG9wdHMsIGVsZW1lbnQpXG5cbiAgVGhlIHByZXBhcmVFbGVtZW50IGZ1bmN0aW9uIGlzIHVzZWQgdG8gcHJlcGFyZSBET00gZWxlbWVudHMgdGhhdCB3aWxsXG4gIHJlY2VpdmUgdGhlIG1lZGlhIHN0cmVhbXMgb25jZSB0aGUgc3RyZWFtIGhhdmUgYmVlbiBzdWNjZXNzZnVsbHkgY2FwdHVyZWQuXG4qKi9cbk1lZGlhLnByb3RvdHlwZS5fcHJlcGFyZUVsZW1lbnQgPSBmdW5jdGlvbihvcHRzLCBlbGVtZW50KSB7XG4gIHZhciBwYXJlbnQ7XG4gIHZhciB2YWxpZEVsZW1lbnQgPSAoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxWaWRlb0VsZW1lbnQpIHx8XG4gICAgICAgIChlbGVtZW50IGluc3RhbmNlb2YgSFRNTEF1ZGlvRWxlbWVudCk7XG4gIHZhciBwcmVzZXJ2ZUFzcGVjdFJhdGlvID1cbiAgICAgICAgdHlwZW9mIG9wdHMucHJlc2VydmVBc3BlY3RSYXRpbyA9PSAndW5kZWZpbmVkJyB8fFxuICAgICAgICBvcHRzLnByZXNlcnZlQXNwZWN0UmF0aW87XG5cbiAgaWYgKCEgZWxlbWVudCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHJlbmRlciBtZWRpYSB0byBhIG51bGwgZWxlbWVudCcpO1xuICB9XG5cbiAgLy8gaWYgdGhlIHBsdWdpbiB3YW50cyB0byBwcmVwYXJlIGVsZW1uZXRzLCB0aGVuIGxldCBpdFxuICBpZiAodGhpcy5wbHVnaW4gJiYgdHlwZW9mIHRoaXMucGx1Z2luLnByZXBhcmVFbGVtZW50ID09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gdGhpcy5fY3JlYXRlQmluZGluZyhcbiAgICAgIG9wdHMsXG4gICAgICB0aGlzLnBsdWdpbi5wcmVwYXJlRWxlbWVudC5jYWxsKHRoaXMuX3BpbnN0LCBvcHRzLCBlbGVtZW50KVxuICAgICk7XG4gIH1cblxuICAvLyBwZXJmb3JtIHNvbWUgYWRkaXRpb25hbCBjaGVja3MgZm9yIHRoaW5ncyB0aGF0IFwibG9va1wiIGxpa2UgYVxuICAvLyBtZWRpYSBlbGVtZW50XG4gIHZhbGlkRWxlbWVudCA9IHZhbGlkRWxlbWVudCB8fCAodHlwZW9mIGVsZW1lbnQucGxheSA9PSAnZnVuY3Rpb24nKSAmJiAoXG4gICAgdHlwZW9mIGVsZW1lbnQuc3JjT2JqZWN0ICE9ICd1bmRlZmluZWQnIHx8XG4gICAgdHlwZW9mIGVsZW1lbnQubW96U3JjT2JqZWN0ICE9ICd1bmRlZmluZWQnIHx8XG4gICAgdHlwZW9mIGVsZW1lbnQuc3JjICE9ICd1bmRlZmluZWQnKTtcblxuICAvLyBpZiB0aGUgZWxlbWVudCBpcyBub3QgYSB2aWRlbyBlbGVtZW50LCB0aGVuIGNyZWF0ZSBvbmVcbiAgaWYgKCEgdmFsaWRFbGVtZW50KSB7XG4gICAgcGFyZW50ID0gZWxlbWVudDtcblxuICAgIC8vIGNyZWF0ZSBhIG5ldyB2aWRlbyBlbGVtZW50XG4gICAgLy8gVE9ETzogY3JlYXRlIGFuIGFwcHJvcHJpYXRlIGVsZW1lbnQgYmFzZWQgb24gdGhlIHR5cGVzIG9mIHRyYWNrc1xuICAgIC8vIGF2YWlsYWJsZVxuICAgIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd2aWRlbycpO1xuXG4gICAgLy8gaWYgd2UgYXJlIHByZXNlcnZpbmcgYXNwZWN0IHJhdGlvIGRvIHRoYXQgbm93XG4gICAgaWYgKHByZXNlcnZlQXNwZWN0UmF0aW8pIHtcbiAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdwcmVzZXJ2ZUFzcGVjdFJhdGlvJywgJycpO1xuICAgIH1cblxuICAgIC8vIGFkZCB0byB0aGUgcGFyZW50XG4gICAgcGFyZW50LmFwcGVuZENoaWxkKGVsZW1lbnQpO1xuICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdkYXRhLXBsYXlpbmcnLCBmYWxzZSk7XG4gIH1cblxuICAvLyBpZiBtdXRlZCwgaW5qZWN0IHRoZSBtdXRlZCBhdHRyaWJ1dGVcbiAgaWYgKGVsZW1lbnQgJiYgdGhpcy5tdXRlZCkge1xuICAgIGVsZW1lbnQubXV0ZWQgPSB0cnVlO1xuICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdtdXRlZCcsICcnKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLl9jcmVhdGVCaW5kaW5nKG9wdHMsIGVsZW1lbnQpO1xufTtcblxuLyoqXG4gICMjIyBfYmluZFN0cmVhbShzdHJlYW0pXG5cbiAgQmluZCBhIHN0cmVhbSB0byBwcmV2aW91c2x5IHByZXBhcmVkIERPTSBlbGVtZW50cy5cblxuKiovXG5NZWRpYS5wcm90b3R5cGUuX2JpbmRTdHJlYW0gPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgdmFyIG1lZGlhID0gdGhpcztcbiAgdmFyIGVsZW1lbnRzID0gW107XG4gIHZhciB3YWl0aW5nID0gW107XG5cbiAgZnVuY3Rpb24gY2hlY2tXYWl0aW5nKCkge1xuICAgIC8vIGlmIHdlIGhhdmUgbm8gd2FpdGluZyBlbGVtZW50cywgYnV0IHNvbWUgZWxlbWVudHNcbiAgICAvLyB0cmlnZ2VyIHRoZSBzdGFydCBldmVudFxuICAgIGlmICh3YWl0aW5nLmxlbmd0aCA9PT0gMCAmJiBlbGVtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICBtZWRpYS5lbWl0KCdyZW5kZXInLCBlbGVtZW50c1swXSk7XG5cbiAgICAgIGVsZW1lbnRzLm1hcChmdW5jdGlvbihlbCkge1xuICAgICAgICBlbC5zZXRBdHRyaWJ1dGUoJ2RhdGEtcGxheWluZycsIHRydWUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY2FuUGxheShldnQpIHtcbiAgICB2YXIgZWwgPSBldnQudGFyZ2V0IHx8IGV2dC5zcmNFbGVtZW50O1xuICAgIHZhciB2aWRlb0luZGV4ID0gZWxlbWVudHMuaW5kZXhPZihlbCk7XG5cbiAgICBpZiAodmlkZW9JbmRleCA+PSAwKSB7XG4gICAgICB3YWl0aW5nLnNwbGljZSh2aWRlb0luZGV4LCAxKTtcbiAgICB9XG5cbiAgICBlbC5wbGF5KCk7XG4gICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2FucGxheScsIGNhblBsYXkpO1xuICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgY2FuUGxheSk7XG4gICAgY2hlY2tXYWl0aW5nKCk7XG4gIH1cblxuICAvLyBpZiB3ZSBoYXZlIGEgcGx1Z2luIHRoYXQga25vd3MgaG93IHRvIGF0dGFjaCBhIHN0cmVhbSwgdGhlbiBsZXQgaXQgZG8gaXRcbiAgaWYgKHRoaXMucGx1Z2luICYmIHR5cGVvZiB0aGlzLnBsdWdpbi5hdHRhY2hTdHJlYW0gPT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiB0aGlzLnBsdWdpbi5hdHRhY2hTdHJlYW0uY2FsbCh0aGlzLl9waW5zdCwgc3RyZWFtLCB0aGlzLl9iaW5kaW5ncyk7XG4gIH1cblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIGJpbmRpbmdzIGFuZCBiaW5kIHRoZSBzdHJlYW1cbiAgZWxlbWVudHMgPSB0aGlzLl9iaW5kaW5ncy5tYXAoZnVuY3Rpb24oYmluZGluZykge1xuICAgIC8vIGNoZWNrIGZvciBzcmNPYmplY3RcbiAgICBpZiAodHlwZW9mIGJpbmRpbmcuZWwuc3JjT2JqZWN0ICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICBiaW5kaW5nLmVsLnNyY09iamVjdCA9IHN0cmVhbTtcbiAgICB9XG4gICAgLy8gY2hlY2sgZm9yIG1velNyY09iamVjdFxuICAgIGVsc2UgaWYgKHR5cGVvZiBiaW5kaW5nLmVsLm1velNyY09iamVjdCAhPSAndW5kZWZpbmVkJykge1xuICAgICAgYmluZGluZy5lbC5tb3pTcmNPYmplY3QgPSBzdHJlYW07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgYmluZGluZy5lbC5zcmMgPSBtZWRpYS5fY3JlYXRlT2JqZWN0VVJMKHN0cmVhbSkgfHwgc3RyZWFtO1xuICAgIH1cblxuICAgIC8vIGF0dGVtcHQgcGxheWJhY2sgKG1heSBub3Qgd29yayBpZiB0aGUgc3RyZWFtIGlzbid0IHF1aXRlIHJlYWR5KVxuICAgIGJpbmRpbmcuZWwucGxheSgpO1xuICAgIHJldHVybiBiaW5kaW5nLmVsO1xuICB9KTtcblxuICAvLyBmaW5kIHRoZSBlbGVtZW50cyB3ZSBhcmUgd2FpdGluZyBvblxuICB3YWl0aW5nID0gZWxlbWVudHMuZmlsdGVyKGZ1bmN0aW9uKGVsKSB7XG4gICAgcmV0dXJuIGVsLnJlYWR5U3RhdGUgPCAzOyAvLyByZWFkeXN0YXRlIDwgSEFWRV9GVVRVUkVfREFUQVxuICB9KTtcblxuICAvLyB3YWl0IGZvciBhbGwgdGhlIHZpZGVvIGVsZW1lbnRzXG4gIHdhaXRpbmcuZm9yRWFjaChmdW5jdGlvbihlbCkge1xuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NhbnBsYXknLCBjYW5QbGF5LCBmYWxzZSk7XG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVkbWV0YWRhdGEnLCBjYW5QbGF5LCBmYWxzZSk7XG4gIH0pO1xuXG4gIGNoZWNrV2FpdGluZygpO1xufTtcblxuLyoqXG4gICMjIyBfdW5iaW5kKClcblxuICBHcmFjZWZ1bGx5IGRldGFjaCBlbGVtZW50cyB0aGF0IGFyZSB1c2luZyB0aGUgc3RyZWFtIGZyb20gdGhlXG4gIGN1cnJlbnQgc3RyZWFtLlxuKiovXG5NZWRpYS5wcm90b3R5cGUuX3VuYmluZCA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgLy8gZW5zdXJlIHdlIGhhdmUgb3B0c1xuICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIGJpbmRpbmdzIGFuZCBkZXRhY2ggc3RyZWFtc1xuICB0aGlzLl9iaW5kaW5ncy5mb3JFYWNoKGZ1bmN0aW9uKGJpbmRpbmcpIHtcbiAgICB2YXIgZWxlbWVudCA9IGJpbmRpbmcuZWw7XG5cbiAgICAvLyByZW1vdmUgdGhlIHNvdXJjZVxuICAgIGVsZW1lbnQuc3JjID0gbnVsbDtcblxuICAgIC8vIGNoZWNrIGZvciBtb3pcbiAgICBpZiAoZWxlbWVudC5tb3pTcmNPYmplY3QpIHtcbiAgICAgIGVsZW1lbnQubW96U3JjT2JqZWN0ID0gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBjaGVjayBmb3IgY3VycmVudFNyY1xuICAgIGlmIChlbGVtZW50LmN1cnJlbnRTcmMpIHtcbiAgICAgIGVsZW1lbnQuY3VycmVudFNyYyA9IG51bGw7XG4gICAgfVxuICB9KTtcbn07XG5cbi8qKlxuICAjIyMgX2NyZWF0ZU9iamVjdFVybChzdHJlYW0pXG5cbiAgVGhpcyBtZXRob2QgaXMgdXNlZCB0byBjcmVhdGUgYW4gb2JqZWN0IHVybCB0aGF0IGNhbiBiZSBhdHRhY2hlZCB0byBhIHZpZGVvXG4gIG9yIGF1ZGlvIGVsZW1lbnQuICBPYmplY3QgdXJscyBhcmUgY2FjaGVkIHRvIGVuc3VyZSBvbmx5IG9uZSBpcyBjcmVhdGVkXG4gIHBlciBzdHJlYW0uXG4qKi9cbk1lZGlhLnByb3RvdHlwZS5fY3JlYXRlT2JqZWN0VVJMID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKHN0cmVhbSk7XG4gIH1cbiAgY2F0Y2ggKGUpIHtcbiAgfVxufTtcblxuLyoqXG4gICMjIyBfaGFuZGxlU3VjY2VzcyhzdHJlYW0pXG5cbiAgSGFuZGxlIHRoZSBzdWNjZXNzIGNvbmRpdGlvbiBvZiBhIGBnZXRVc2VyTWVkaWFgIGNhbGwuXG5cbioqL1xuTWVkaWEucHJvdG90eXBlLl9oYW5kbGVTdWNjZXNzID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gIC8vIHVwZGF0ZSB0aGUgYWN0aXZlIHN0cmVhbSB0aGF0IHdlIGFyZSBjb25uZWN0ZWQgdG9cbiAgdGhpcy5zdHJlYW0gPSBzdHJlYW07XG5cbiAgLy8gZW1pdCB0aGUgc3RyZWFtIGV2ZW50XG4gIHRoaXMuZW1pdCgnc3RyZWFtJywgc3RyZWFtKTtcbn07XG5cbi8qKlxuICAjIyMgVXRpbGl0eSBGdW5jdGlvbnNcblxuKiovXG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogUmVwcmVzZW50YXRpb24gb2YgYSBzaW5nbGUgRXZlbnRFbWl0dGVyIGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIEV2ZW50IGhhbmRsZXIgdG8gYmUgY2FsbGVkLlxuICogQHBhcmFtIHtNaXhlZH0gY29udGV4dCBDb250ZXh0IGZvciBmdW5jdGlvbiBleGVjdXRpb24uXG4gKiBAcGFyYW0ge0Jvb2xlYW59IG9uY2UgT25seSBlbWl0IG9uY2VcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBFRShmbiwgY29udGV4dCwgb25jZSkge1xuICB0aGlzLmZuID0gZm47XG4gIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMub25jZSA9IG9uY2UgfHwgZmFsc2U7XG59XG5cbi8qKlxuICogTWluaW1hbCBFdmVudEVtaXR0ZXIgaW50ZXJmYWNlIHRoYXQgaXMgbW9sZGVkIGFnYWluc3QgdGhlIE5vZGUuanNcbiAqIEV2ZW50RW1pdHRlciBpbnRlcmZhY2UuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAYXBpIHB1YmxpY1xuICovXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7IC8qIE5vdGhpbmcgdG8gc2V0ICovIH1cblxuLyoqXG4gKiBIb2xkcyB0aGUgYXNzaWduZWQgRXZlbnRFbWl0dGVycyBieSBuYW1lLlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKiBAcHJpdmF0ZVxuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5cbi8qKlxuICogUmV0dXJuIGEgbGlzdCBvZiBhc3NpZ25lZCBldmVudCBsaXN0ZW5lcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBldmVudHMgdGhhdCBzaG91bGQgYmUgbGlzdGVkLlxuICogQHJldHVybnMge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbiBsaXN0ZW5lcnMoZXZlbnQpIHtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1tldmVudF0pIHJldHVybiBbXTtcbiAgaWYgKHRoaXMuX2V2ZW50c1tldmVudF0uZm4pIHJldHVybiBbdGhpcy5fZXZlbnRzW2V2ZW50XS5mbl07XG5cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLl9ldmVudHNbZXZlbnRdLmxlbmd0aCwgZWUgPSBuZXcgQXJyYXkobCk7IGkgPCBsOyBpKyspIHtcbiAgICBlZVtpXSA9IHRoaXMuX2V2ZW50c1tldmVudF1baV0uZm47XG4gIH1cblxuICByZXR1cm4gZWU7XG59O1xuXG4vKipcbiAqIEVtaXQgYW4gZXZlbnQgdG8gYWxsIHJlZ2lzdGVyZWQgZXZlbnQgbGlzdGVuZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBUaGUgbmFtZSBvZiB0aGUgZXZlbnQuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gSW5kaWNhdGlvbiBpZiB3ZSd2ZSBlbWl0dGVkIGFuIGV2ZW50LlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24gZW1pdChldmVudCwgYTEsIGEyLCBhMywgYTQsIGE1KSB7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbZXZlbnRdKSByZXR1cm4gZmFsc2U7XG5cbiAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1tldmVudF1cbiAgICAsIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGhcbiAgICAsIGFyZ3NcbiAgICAsIGk7XG5cbiAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBsaXN0ZW5lcnMuZm4pIHtcbiAgICBpZiAobGlzdGVuZXJzLm9uY2UpIHRoaXMucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVycy5mbiwgdHJ1ZSk7XG5cbiAgICBzd2l0Y2ggKGxlbikge1xuICAgICAgY2FzZSAxOiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQpLCB0cnVlO1xuICAgICAgY2FzZSAyOiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExKSwgdHJ1ZTtcbiAgICAgIGNhc2UgMzogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSwgYTIpLCB0cnVlO1xuICAgICAgY2FzZSA0OiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiwgYTMpLCB0cnVlO1xuICAgICAgY2FzZSA1OiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiwgYTMsIGE0KSwgdHJ1ZTtcbiAgICAgIGNhc2UgNjogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSwgYTIsIGEzLCBhNCwgYTUpLCB0cnVlO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDEsIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0xKTsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICB9XG5cbiAgICBsaXN0ZW5lcnMuZm4uYXBwbHkobGlzdGVuZXJzLmNvbnRleHQsIGFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIHZhciBsZW5ndGggPSBsaXN0ZW5lcnMubGVuZ3RoXG4gICAgICAsIGo7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChsaXN0ZW5lcnNbaV0ub25jZSkgdGhpcy5yZW1vdmVMaXN0ZW5lcihldmVudCwgbGlzdGVuZXJzW2ldLmZuLCB0cnVlKTtcblxuICAgICAgc3dpdGNoIChsZW4pIHtcbiAgICAgICAgY2FzZSAxOiBsaXN0ZW5lcnNbaV0uZm4uY2FsbChsaXN0ZW5lcnNbaV0uY29udGV4dCk7IGJyZWFrO1xuICAgICAgICBjYXNlIDI6IGxpc3RlbmVyc1tpXS5mbi5jYWxsKGxpc3RlbmVyc1tpXS5jb250ZXh0LCBhMSk7IGJyZWFrO1xuICAgICAgICBjYXNlIDM6IGxpc3RlbmVyc1tpXS5mbi5jYWxsKGxpc3RlbmVyc1tpXS5jb250ZXh0LCBhMSwgYTIpOyBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBpZiAoIWFyZ3MpIGZvciAoaiA9IDEsIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0xKTsgaiA8IGxlbjsgaisrKSB7XG4gICAgICAgICAgICBhcmdzW2ogLSAxXSA9IGFyZ3VtZW50c1tqXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsaXN0ZW5lcnNbaV0uZm4uYXBwbHkobGlzdGVuZXJzW2ldLmNvbnRleHQsIGFyZ3MpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlciBhIG5ldyBFdmVudExpc3RlbmVyIGZvciB0aGUgZ2l2ZW4gZXZlbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IE5hbWUgb2YgdGhlIGV2ZW50LlxuICogQHBhcmFtIHtGdW5jdG9ufSBmbiBDYWxsYmFjayBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7TWl4ZWR9IGNvbnRleHQgVGhlIGNvbnRleHQgb2YgdGhlIGZ1bmN0aW9uLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIG9uKGV2ZW50LCBmbiwgY29udGV4dCkge1xuICB2YXIgbGlzdGVuZXIgPSBuZXcgRUUoZm4sIGNvbnRleHQgfHwgdGhpcyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpIHRoaXMuX2V2ZW50cyA9IHt9O1xuICBpZiAoIXRoaXMuX2V2ZW50c1tldmVudF0pIHRoaXMuX2V2ZW50c1tldmVudF0gPSBsaXN0ZW5lcjtcbiAgZWxzZSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHNbZXZlbnRdLmZuKSB0aGlzLl9ldmVudHNbZXZlbnRdLnB1c2gobGlzdGVuZXIpO1xuICAgIGVsc2UgdGhpcy5fZXZlbnRzW2V2ZW50XSA9IFtcbiAgICAgIHRoaXMuX2V2ZW50c1tldmVudF0sIGxpc3RlbmVyXG4gICAgXTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGQgYW4gRXZlbnRMaXN0ZW5lciB0aGF0J3Mgb25seSBjYWxsZWQgb25jZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgTmFtZSBvZiB0aGUgZXZlbnQuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBDYWxsYmFjayBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7TWl4ZWR9IGNvbnRleHQgVGhlIGNvbnRleHQgb2YgdGhlIGZ1bmN0aW9uLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24gb25jZShldmVudCwgZm4sIGNvbnRleHQpIHtcbiAgdmFyIGxpc3RlbmVyID0gbmV3IEVFKGZuLCBjb250ZXh0IHx8IHRoaXMsIHRydWUpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKSB0aGlzLl9ldmVudHMgPSB7fTtcbiAgaWYgKCF0aGlzLl9ldmVudHNbZXZlbnRdKSB0aGlzLl9ldmVudHNbZXZlbnRdID0gbGlzdGVuZXI7XG4gIGVsc2Uge1xuICAgIGlmICghdGhpcy5fZXZlbnRzW2V2ZW50XS5mbikgdGhpcy5fZXZlbnRzW2V2ZW50XS5wdXNoKGxpc3RlbmVyKTtcbiAgICBlbHNlIHRoaXMuX2V2ZW50c1tldmVudF0gPSBbXG4gICAgICB0aGlzLl9ldmVudHNbZXZlbnRdLCBsaXN0ZW5lclxuICAgIF07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIGV2ZW50IGxpc3RlbmVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgVGhlIGV2ZW50IHdlIHdhbnQgdG8gcmVtb3ZlLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGxpc3RlbmVyIHRoYXQgd2UgbmVlZCB0byBmaW5kLlxuICogQHBhcmFtIHtCb29sZWFufSBvbmNlIE9ubHkgcmVtb3ZlIG9uY2UgbGlzdGVuZXJzLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyKGV2ZW50LCBmbiwgb25jZSkge1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW2V2ZW50XSkgcmV0dXJuIHRoaXM7XG5cbiAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1tldmVudF1cbiAgICAsIGV2ZW50cyA9IFtdO1xuXG4gIGlmIChmbikge1xuICAgIGlmIChsaXN0ZW5lcnMuZm4gJiYgKGxpc3RlbmVycy5mbiAhPT0gZm4gfHwgKG9uY2UgJiYgIWxpc3RlbmVycy5vbmNlKSkpIHtcbiAgICAgIGV2ZW50cy5wdXNoKGxpc3RlbmVycyk7XG4gICAgfVxuICAgIGlmICghbGlzdGVuZXJzLmZuKSBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gbGlzdGVuZXJzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAobGlzdGVuZXJzW2ldLmZuICE9PSBmbiB8fCAob25jZSAmJiAhbGlzdGVuZXJzW2ldLm9uY2UpKSB7XG4gICAgICAgIGV2ZW50cy5wdXNoKGxpc3RlbmVyc1tpXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy9cbiAgLy8gUmVzZXQgdGhlIGFycmF5LCBvciByZW1vdmUgaXQgY29tcGxldGVseSBpZiB3ZSBoYXZlIG5vIG1vcmUgbGlzdGVuZXJzLlxuICAvL1xuICBpZiAoZXZlbnRzLmxlbmd0aCkge1xuICAgIHRoaXMuX2V2ZW50c1tldmVudF0gPSBldmVudHMubGVuZ3RoID09PSAxID8gZXZlbnRzWzBdIDogZXZlbnRzO1xuICB9IGVsc2Uge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbZXZlbnRdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbGwgbGlzdGVuZXJzIG9yIG9ubHkgdGhlIGxpc3RlbmVycyBmb3IgdGhlIHNwZWNpZmllZCBldmVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgVGhlIGV2ZW50IHdhbnQgdG8gcmVtb3ZlIGFsbCBsaXN0ZW5lcnMgZm9yLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbiByZW1vdmVBbGxMaXN0ZW5lcnMoZXZlbnQpIHtcbiAgaWYgKCF0aGlzLl9ldmVudHMpIHJldHVybiB0aGlzO1xuXG4gIGlmIChldmVudCkgZGVsZXRlIHRoaXMuX2V2ZW50c1tldmVudF07XG4gIGVsc2UgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vL1xuLy8gQWxpYXMgbWV0aG9kcyBuYW1lcyBiZWNhdXNlIHBlb3BsZSByb2xsIGxpa2UgdGhhdC5cbi8vXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXI7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbjtcblxuLy9cbi8vIFRoaXMgZnVuY3Rpb24gZG9lc24ndCBhcHBseSBhbnltb3JlLlxuLy9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24gc2V0TWF4TGlzdGVuZXJzKCkge1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8vXG4vLyBFeHBvc2UgdGhlIG1vZHVsZS5cbi8vXG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlcjIgPSBFdmVudEVtaXR0ZXI7XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyMyA9IEV2ZW50RW1pdHRlcjtcblxuLy9cbi8vIEV4cG9zZSB0aGUgbW9kdWxlLlxuLy9cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIGRvY3VtZW50OiBmYWxzZSAqL1xuLyogZ2xvYmFsIEhUTUxWaWRlb0VsZW1lbnQ6IGZhbHNlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBERUZBVUxUX0ZQUyA9IDI1O1xudmFyIHJhZiA9IHJlcXVpcmUoJ2Zkb20vcmFmJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xuXG4vKipcbiAgIyBydGMtdmlkZW9wcm9jXG5cbiAgVGhpcyBpcyBhIHNtYWxsIGhlbHBlciBtb2R1bGUgdGhhdCBhbGxvd3MgeW91IHRvIHN1YnN0aXR1dGUgYSB2aWRlb1xuICBlbGVtZW50IHdpdGggYSBjYW52YXMgZWxlbWVudC4gIFRoaXMgY2FuIGJlIHVzZWZ1bCB3aGVuIHlvdSB3YW50IHRvXG4gIGRvIHBpeGVsIG1hbmlwdWxhdGlvbiBvZiB0aGUgcmVuZGVyZWQgaW1hZ2VzLCBvciBpbiBzaXR1YXRpb25zIHdoZW5cbiAgYSB2aWRlbyBlbGVtZW50IGRvZXMgbm90IGJlaGF2ZSBhcyB5b3UgZXhwZWN0LlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICA8PDwgZXhhbXBsZXMvZ3JheXNjYWxlLWZpbHRlci5qc1xuXG4gICMjIFVzaW5nIHRoZSBQcm9jZXNzaW5nIFBpcGVsaW5lXG5cbiAgQSBwcm9jZXNzaW5nIHBpcGVsaW5lIGhhcyBiZWVuIGluY2x1ZGVkIHRvIGFzc2lzdCB3aXRoXG4gIG1hbmlwdWxhdGluZyB0aGUgY2FudmFzIG9uIHRoZSBmbHkuIFRvIHNwZWNpZnkgdGhlIGZpbHRlcnMgdG8gYmUgdXNlZFxuICBpbiB0aGUgcHJvY2Vzc2luZyBwaXBlbGluZSwgdGhpcyBpcyBkb25lIGluIHRoZSBvcHRpb25zIGFjY2VwdGVkIGJ5XG4gIHZpZGVvcHJvYy4gRWl0aGVyIHNwZWNpZnlpbmcgYW4gYXJyYXkgb2YgZmlsdGVycyB3aXRoIHRoZSBgZmlsdGVyc2Agb3B0aW9uXG4gIG9yIGEgc2luZ2xlIGZpbHRlciBmdW5jdGlvbiB3aXRoIHRoZSBgZmlsdGVyYCBvcHRpb24gaXMgZmluZS4gIElmIHlvdSB1c2VcbiAgYm90aCB0aGVuIHRoZSBpbmRpdmlkdWFsIGZpbHRlciB3aWxsIGJlIGFkZGVkIGZpbHRlciBsaXN0IGFuZCB1c2VkIGluXG4gIHNlcmllcy5cblxuICBgYGBqc1xuICB2aWRlb3Byb2Moc3JjVmlkZW8sIHRhcmdldENhbnZhcywge1xuICAgIGZpbHRlcnM6IFtcbiAgICAgIHJlcXVpcmUoJ3J0Yy1maWx0ZXItZ3JheXNjYWxlJyksXG4gICAgICBteUN1c3RvbUZpbHRlckZ1bmN0aW9uXG4gICAgXVxuICB9KTtcbiAgYGBgXG5cbiAgIyMgV3JpdGluZyBhIEZpbHRlciBGdW5jdGlvblxuXG4gIFdyaXRpbmcgYSBmaWx0ZXIgZnVuY3Rpb24gaXMgdmVyeSBzaW1wbGUsIGFuZCB0aGV5IHVzZSB0aGUgZm9sbG93aW5nXG4gIGZ1bmN0aW9uIHNpZ25hdHVyZTpcblxuICBgYGBqc1xuICBmdW5jdGlvbiBmaWx0ZXIoaW1hZ2VEYXRhLCB0aWNrKSB7XG4gIH1cbiAgYGBgXG5cbiAgVGhlIGBpbWFnZURhdGFgIGFyZyBpcyBhblxuICBbSW1hZ2VEYXRhXShodHRwOi8vd3d3LnczLm9yZy9UUi8yZGNvbnRleHQvI2ltYWdlZGF0YSksIGFuZCB0aGUgYHRpY2tgXG4gIGFyZ3VtZW50IHJlZmVycyB0byB0aGUgdGljayB0aGF0IGhhcyBiZWVuIGNhcHR1cmVkIGFzIHBhcnQgb2YgdGhlIGNhcHR1cmVcbiAgbG9vcCAoYmUgYXdhcmUgdGhhdCBpdCBjb3VsZCBiZSBhIGhpZ2ggcmVzb2x1dGlvbiB0aW1lciB2YWx1ZSBpZiByQUYgaXNcbiAgYmVpbmcgdXNlZCkuXG5cbiAgSWYgeW91IGFyZSB3cml0aW5nIGFuIGFuYWx5c2lzIGZpbHRlciwgdGhlbiBzaW1wbHkgZG8gd2hhdCB5b3UgbmVlZCB0byBkb1xuICBhbmQgZXhpdCB0aGUgZnVuY3Rpb24uICBJZiB5b3UgaGF2ZSB3cml0dGVuIGEgZmlsdGVyIHRoYXQgbW9kaWZpZXMgdGhlIHBpeGVsXG4gIGRhdGEgYW5kIHlvdSB3YW50IHRoaXMgZHJhd24gYmFjayB0byB0aGUgY2FudmFzIHRoZW4geW91ciAqKmZpbHRlciBtdXN0XG4gIHJldHVybiBgdHJ1ZWAqKiB0byB0ZWxsIGBydGMtdmlkZW9wcm9jYCB0aGF0IGl0IHNob3VsZCBkcmF3IHRoZSBpbWFnZURhdGFcbiAgYmFjayB0byB0aGUgY2FudmFzLlxuXG4gICMjIExpc3RlbmluZyBmb3IgY3VzdG9tIGBmcmFtZWAgZXZlbnRzXG5cbiAgSW4gYWRkaXRpb24gdG8gcHJvdmlkaW5nIHRoZSBvcHBvcnR1bml0eSB0byBhbmFseXNlIGFuZCBtb2RpZnkgcGl4ZWwgZGF0YVxuICB0aGUgYHJ0Yy12aWRlb3Byb2NgIG1vZHVsZSBhbHNvIHByb3ZpZGVzIHRoZSBhIGN1c3RvbSBgZnJhbWVgIGV2ZW50IGZvclxuICBkZXRlY3Rpbmcgd2hlbiBhIG5ldyBmcmFtZSBoYXMgYmVlbiBkcmF3biB0byB0aGUgY2FudmFzLlxuXG4gIEEgc2ltcGxlIGV4YW1wbGUgY2FuIGJlIGZvdW5kIGJlbG93OlxuXG4gIDw8PCBleGFtcGxlcy9mcmFtZWxpc3RlbmVyLmpzXG5cbiAgTk9URTogVGhlIGBmcmFtZWAgZXZlbnQgb2NjdXJzIGFmdGVyIHRoZSBmaWx0ZXIgcGlwZWxpbmUgaGFzIGJlZW4gcnVuIGFuZFxuICBhbmQgdGhlIGltYWdlRGF0YSBtYXkgaGF2ZSBiZWVuIG1vZGlmaWVkIGZyb20gdGhlIG9yaWdpbmFsIHZpZGVvIGZyYW1lLlxuXG4gICMjIEEgTm90ZSB3aXRoIFJlZ2FyZHMgdG8gQ1BVIFVzYWdlXG5cbiAgQnkgZGVmYXVsdCBydGMtdmlkZW9wcm9jIHdpbGwgZHJhdyBhdCAyNWZwcyBidXQgdGhpcyBjYW4gYmUgbW9kaWZpZWQgdG8gY2FwdHVyZVxuICBhdCBhIGxvd2VyIGZyYW1lIHJhdGUgZm9yIHNsb3dlciBkZXZpY2VzLCBvciBpbmNyZWFzZWQgaWYgeW91IGhhdmUgYVxuICBtYWNoaW5lIHdpdGggcGxlbnR5IG9mIGdydW50LlxuXG4gICMjIFJlZmVyZW5jZVxuXG4gICMjIyB2aWRlb3Byb2Moc3JjLCB0YXJnZXQsIG9wdHM/KVxuXG4gIENyZWF0ZSAob3IgcGF0Y2gpIGEgYDxjYW52YXM+YCBlbGVtZW50IHRoYXQgd2lsbCByZWNlaXZlIHRoZSB2aWRlbyBpbWFnZXNcbiAgZnJvbSBhIHZpZGVvIGVsZW1lbnQuICBUaGUgZm9sbG93aW5nIG9wdGlvbnMgYXJlIHN1cHBvcnRlZC5cblxuICAtIGBjYW52YXNgIC0gdGhlIGNhbnZhcyB0byBkcmF3IHZpZGVvIGRhdGEgdG8uICBJZiBub3Qgc3VwcGxpZWQgYSBuZXcgXG4gICAgY2FudmFzIGVsZW1lbnQgd2lsbCBiZSBjcmVhdGVkLlxuXG4gIC0gYHZpZGVvYCAtIHRoZSB2aWRlbyBlbGVtZW50IHRoYXQgd2lsbCBiZSB1c2VkIGFzIHRoZSBzb3VyY2Ugb2YgdGhlIHZpZGVvLlxuICAgICBJZiBub3Qgc3VwcGxpZWQgYSBuZXcgYDx2aWRlbz5gIGVsZW1lbnQgd2lsbCBiZSBjcmVhdGVkLlxuXG4gIC0gYGZwc2AgLSB0aGUgcmVkcmF3IHJhdGUgb2YgdGhlIGZha2UgdmlkZW8gKGRlZmF1bHQgPSAyNSlcblxuICAtIGBncmVlZHlgIC0gU3BlY2lmeSBgZ3JlZWR5OiB0cnVlYCBpZiB5b3Ugd2FudCB0aGUgdmlkZW9wcm9jIG1vZHVsZSB0byBydW5cbiAgICBpdCdzIGNhcHR1cmUgbG9vcCB1c2luZyBzZXRUaW1lb3V0IHJhdGhlciB0aGFuIGByZXF1ZXN0QW5pbWF0aW9uRnJhbWVgLlxuICAgIERvaW5nIHRoaXMgd2lsbCBtZWFuIHlvdSBhcHBsaWNhdGlvbiB3aWxsIGNvbnRpbnVlIHRvIGNhcHR1cmUgYW5kIHByb2Nlc3NcbiAgICBmcmFtZXMgZXZlbiB3aGVuIGl0J3MgdGFiIC8gd2luZG93IGJlY29tZXMgaW5hY3RpdmUuIFRoaXMgaXMgdXN1YWxseSB0aGVcbiAgICBkZXNpcmVkIGJlaGF2aW91ciB3aXRoIHZpZGVvIGNvbmZlcmVuY2luZyBhcHBsaWNhdGlvbnMuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzcmMsIHRhcmdldCwgb3B0cykge1xuICAvLyBjaGVjayBmb3IgYSB2YWxpZCBzb3VyY2VcbiAgdmFyIHZhbGlkU291cmNlID0gdHlwZW9mIHNyYyAhPSAndW5kZWZpbmVkJzsgLy8gVE9ETzogYmV0dGVyIGNoZWNrXG4gIHZhciByZXNpemVDYW52YXMgPSBmYWxzZTtcbiAgdmFyIGZwcztcbiAgdmFyIGdyZWVkeTtcbiAgdmFyIGdyZWVkeURlbGF5O1xuICB2YXIgZHJhd0RlbGF5O1xuXG4gIC8vIGNyZWF0ZSBhbiBldmVudCBlbWl0dGVyIGZvciB0aGUgcHJvY2Vzc29yIG9iamVjdFxuICB2YXIgcHJvY2Vzc29yID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gIC8vIGNoZWNrIGZvciBubyB0YXJnZXQgYnV0IG9wdHMgc3VwcGxpZWRcbiAgdmFyIHNoaWZ0QXJncyA9ICghIG9wdHMpICYmICghIHRhcmdldCkgfHxcbiAgICAodHlwZW9mIHRhcmdldCA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgdGFyZ2V0LmdldENvbnRleHQgIT0gJ2Z1bmN0aW9uJyk7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgZHJhdyBtZXRhZGF0YVxuICB2YXIgZHJhd1dpZHRoO1xuICB2YXIgZHJhd0hlaWdodDtcbiAgdmFyIGRyYXdYID0gMDtcbiAgdmFyIGRyYXdZID0gMDtcbiAgdmFyIGRyYXdEYXRhO1xuICB2YXIgbGFzdFRpY2sgPSAwO1xuICB2YXIgc291cmNlTW9uaXRvclRpbWVyID0gMDtcbiAgdmFyIGNvbnRleHQ7XG5cbiAgZnVuY3Rpb24gc3luY0NhbnZhcygpIHtcbiAgICB0YXJnZXQud2lkdGggPSBzcmMudmlkZW9XaWR0aDtcbiAgICB0YXJnZXQuaGVpZ2h0ID0gc3JjLnZpZGVvSGVpZ2h0O1xuICAgIGNhbGN1bGF0ZURyYXdSZWdpb24oKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNhbGN1bGF0ZURyYXdSZWdpb24oKSB7XG4gICAgdmFyIHNjYWxlO1xuICAgIHZhciBzY2FsZVg7XG4gICAgdmFyIHNjYWxlWTtcblxuICAgIC8vIGlmIGVpdGhlciB3aWR0aCBvciBoZWlnaHQgPT09IDAgdGhlbiBiYWlsXG4gICAgaWYgKHRhcmdldC53aWR0aCA9PT0gMCB8fCB0YXJnZXQuaGVpZ2h0ID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gY2FsY3VsYXRlIHJlcXVpcmVkIHNjYWxpbmdcbiAgICBzY2FsZSA9IE1hdGgubWluKFxuICAgICAgc2NhbGVYID0gKHRhcmdldC53aWR0aCAvIHNyYy52aWRlb1dpZHRoKSxcbiAgICAgIHNjYWxlWSA9ICh0YXJnZXQuaGVpZ2h0IC8gc3JjLnZpZGVvSGVpZ2h0KVxuICAgICk7XG5cbiAgICAvLyBjYWxjdWxhdGUgdGhlIHNjYWxlZCBkcmF3IHdpZHRoIGFuZCBoZWlnaHRcbiAgICBkcmF3V2lkdGggPSAoc3JjLnZpZGVvV2lkdGggKiBzY2FsZSkgfCAwO1xuICAgIGRyYXdIZWlnaHQgPSAoc3JjLnZpZGVvSGVpZ2h0ICogc2NhbGUpIHwgMDtcblxuICAgIC8vIGNhbGN1bGF0ZSB0aGUgb2Zmc2V0WCBhbmQgWVxuICAgIGRyYXdYID0gKHRhcmdldC53aWR0aCAtIGRyYXdXaWR0aCkgPj4gMTtcbiAgICBkcmF3WSA9ICh0YXJnZXQuaGVpZ2h0IC0gZHJhd0hlaWdodCkgPj4gMTtcblxuICAgIC8vIHNhdmUgdGhlIGRyYXcgZGF0YVxuICAgIGRyYXdEYXRhID0ge1xuICAgICAgeDogZHJhd1gsXG4gICAgICB5OiBkcmF3WSxcbiAgICAgIHdpZHRoOiBkcmF3V2lkdGgsXG4gICAgICBoZWlnaHQ6IGRyYXdIZWlnaHRcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gbW9uaXRvclNvdXJjZSgpIHtcbiAgICBjbGVhckludGVydmFsKHNvdXJjZU1vbml0b3JUaW1lcik7XG4gICAgc291cmNlTW9uaXRvclRpbWVyID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoc3JjLnZpZGVvV2lkdGggPiAwICYmIHNyYy52aWRlb0hlaWdodCA+IDApIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChzb3VyY2VNb25pdG9yVGltZXIpO1xuICAgICAgICBzeW5jQ2FudmFzKCk7XG4gICAgICB9XG4gICAgfSwgMTAwKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlZHJhdyh0aWNrKSB7XG4gICAgdmFyIGltYWdlRGF0YTtcbiAgICB2YXIgdHdlYWtlZDtcbiAgICB2YXIgZXZ0O1xuICAgIHZhciBwb3N0UHJvY2Vzc0V2dDtcbiAgICB2YXIgdHdlYWtlZCA9IGZhbHNlO1xuICAgIHZhciBmcmFtZUxpc3RlbmVycyA9IHByb2Nlc3Nvci5saXN0ZW5lcnMoJ2ZyYW1lJykubGVuZ3RoO1xuXG4gICAgLy8gZ2V0IHRoZSBjdXJyZW50IHRpY2tcbiAgICB0aWNrID0gdGljayB8fCBEYXRlLm5vdygpO1xuXG4gICAgLy8gb25seSBkcmF3IGFzIG9mdGVuIGFzIHNwZWNpZmllZCBpbiB0aGUgZnBzXG4gICAgaWYgKGRyYXdXaWR0aCAmJiBkcmF3SGVpZ2h0ICYmIHRpY2sgLSBsYXN0VGljayA+IGRyYXdEZWxheSkge1xuICAgICAgLy8gZHJhdyB0aGUgaW1hZ2VcbiAgICAgIGNvbnRleHQuZHJhd0ltYWdlKHNyYywgZHJhd1gsIGRyYXdZLCBkcmF3V2lkdGgsIGRyYXdIZWlnaHQpO1xuXG4gICAgICAvLyBpZiB3ZSBoYXZlIHByb2Nlc3NvcnMsIGdldCB0aGUgaW1hZ2UgZGF0YSBhbmQgcGFzcyBpdCB0aHJvdWdoXG4gICAgICBpZiAocHJvY2Vzc29yLmZpbHRlcnMubGVuZ3RoKSB7XG4gICAgICAgIHR3ZWFrZWQgPSBmYWxzZTtcbiAgICAgICAgaW1hZ2VEYXRhID0gY29udGV4dC5nZXRJbWFnZURhdGEoMCwgMCwgZHJhd1dpZHRoLCBkcmF3SGVpZ2h0KTtcblxuICAgICAgICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHByb2Nlc3NvcnNcbiAgICAgICAgcHJvY2Vzc29yLmZpbHRlcnMuZm9yRWFjaChmdW5jdGlvbihmaWx0ZXIpIHtcbiAgICAgICAgICB0d2Vha2VkID0gZmlsdGVyKGltYWdlRGF0YSwgdGljaywgY29udGV4dCwgdGFyZ2V0LCBkcmF3RGF0YSkgfHwgdHdlYWtlZDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHR3ZWFrZWQpIHtcbiAgICAgICAgICAvLyBUT0RPOiBkaXJ0eSBhcmVhXG4gICAgICAgICAgY29udGV4dC5wdXRJbWFnZURhdGEoaW1hZ2VEYXRhLCAwLCAwKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyB1cGRhdGUgdGhlIHByb2Nlc3NvciBpbWFnZURhdGFcbiAgICAgIHByb2Nlc3Nvci5pbWFnZURhdGEgPSBpbWFnZURhdGE7XG5cbiAgICAgIC8vIGVtaXQgdGhlIHByb2Nlc3NvciBmcmFtZSBldmVudFxuICAgICAgcHJvY2Vzc29yLmVtaXQoJ2ZyYW1lJywgdGljayk7XG5cbiAgICAgIC8vIHVwZGF0ZSB0aGUgbGFzdCB0aWNrXG4gICAgICBsYXN0VGljayA9IHRpY2s7XG4gICAgfVxuXG4gICAgLy8gcXVldWUgdXAgYW5vdGhlciByZWRyYXdcbiAgICBpZiAoZ3JlZWR5KSB7XG4gICAgICBzZXRUaW1lb3V0KHJlZHJhdywgZ3JlZWR5RGVsYXkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJhZihyZWRyYXcpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChzaGlmdEFyZ3MpIHtcbiAgICBvcHRzID0gdGFyZ2V0O1xuICAgIHRhcmdldCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICB9XG5cbiAgLy8gc2F2ZSB0aGUgdGFyZ2V0IHRvIHRoZSBjYW52YXMgcHJvcGVydHkgb2YgdGhlIHByb2Nlc3NvclxuICBwcm9jZXNzb3IuY2FudmFzID0gdGFyZ2V0O1xuICBjb250ZXh0ID0gcHJvY2Vzc29yLmNvbnRleHQgPSB0YXJnZXQuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBmcHNcbiAgZnBzID0gKG9wdHMgfHwge30pLmZwcyB8fCBERUZBVUxUX0ZQUztcbiAgZ3JlZWR5ID0gKG9wdHMgfHwge30pLmdyZWVkeTtcblxuICAvLyBzZXRUaW1lb3V0IHNob3VsZCBvY2N1ciBtb3JlIGZyZXF1ZW50bHkgdGhhbiB0aGUgZnBzXG4gIC8vIGRlbGF5IHNvIHdlIGdldCBjbG9zZSB0byB0aGUgZGVzaXJlZCBmcHNcbiAgZ3JlZWR5RGVsYXkgPSAoMTAwMCAvIGZwcykgPj4gMTtcblxuICAvLyBjYWxhY3VsYXRlIHRoZSBkcmF3IGRlbGF5LCBjbGFtcCBhcyBpbnRcbiAgZHJhd0RlbGF5ID0gKDEwMDAgLyBmcHMpIHwgMDtcblxuICAvLyBkZXRlcm1pbmUgd2hldGhlciB3ZSBzaG91bGQgcmVzaXplIHRoZSBjYW52YXMgb3Igbm90XG4gIHJlc2l6ZUNhbnZhcyA9IHRhcmdldC53aWR0aCA9PT0gMCB8fCB0YXJnZXQuaGVpZ2h0ID09PSAwO1xuXG4gIC8vIGlmIHdlJ3ZlIGJlZW4gcHJvdmlkZWQgYSBmaWx0ZXJzIGFycmF5IGluIG9wdGlvbnMgaW5pdGlhbGlzZSB0aGUgZmlsdGVyc1xuICAvLyB3aXRoIHRob3NlIGZ1bmN0aW9uc1xuICBwcm9jZXNzb3IuZmlsdGVycyA9ICgob3B0cyB8fCB7fSkuZmlsdGVycyB8fCBbXSkuZmlsdGVyKGZ1bmN0aW9uKGZpbHRlcikge1xuICAgIHJldHVybiB0eXBlb2YgZmlsdGVyID09ICdmdW5jdGlvbic7XG4gIH0pO1xuXG4gIC8vIGlmIGEgJ2ZpbHRlcicgb3B0aW9uIGhhcyBiZWVuIHByb3ZpZGVkLCB0aGVuIGFwcGVuZCB0byB0aGUgZmlsdGVycyBhcnJheVxuICBpZiAob3B0cyAmJiB0eXBlb2Ygb3B0cy5maWx0ZXIgPT0gJ2Z1bmN0aW9uJykge1xuICAgIHByb2Nlc3Nvci5maWx0ZXJzLnB1c2gob3B0cy5maWx0ZXIpO1xuICB9XG5cbiAgLy8gaWYgd2UgYXJlIHJlc2l6aW5nIHRoZSBjYW52YXMsIHRoZW4gYXMgdGhlIHZpZGVvIG1ldGFkYXRhIGNoYW5nZXNcbiAgLy8gcmVzeW5jIHRoZSBjYW52YXNcbiAgc3JjLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgbW9uaXRvclNvdXJjZSk7XG4gIHNyYy5hZGRFdmVudExpc3RlbmVyKCdjYW5wbGF5JywgbW9uaXRvclNvdXJjZSk7XG5cbiAgLy8gY2FsY3VsYXRlIHRoZSBpbml0aWFsIGRyYXcgbWV0YWRhdGEgKHdpbGwgYmUgcmVjYWxjdWxhdGVkIG9uIHZpZGVvIHN0cmVhbSBjaGFuZ2VzKVxuICBjYWxjdWxhdGVEcmF3UmVnaW9uKCk7XG5cbiAgLy8gc3RhcnQgdGhlIHJlZHJhd1xuICByYWYocmVkcmF3KTtcblxuICByZXR1cm4gcHJvY2Vzc29yO1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIHdpbmRvdzogZmFsc2UgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIFRFU1RfUFJPUFMgPSBbJ3InLCAnd2Via2l0UicsICdtb3pSJywgJ29SJywgJ21zUiddO1xuXG4vKipcbiAgIyMjIHJhZihjYWxsYmFjaylcblxuICBSZXF1ZXN0IGFuaW1hdGlvbiBmcmFtZSBoZWxwZXIuXG5cbiAgPDw8IGV4YW1wbGVzL3JhZi5qc1xuXG4qKi9cblxubW9kdWxlLmV4cG9ydHMgPSB0eXBlb2Ygd2luZG93ICE9ICd1bmRlZmluZWQnICYmIChmdW5jdGlvbigpIHtcbiAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IFRFU1RfUFJPUFMubGVuZ3RoOyBpaSsrKSB7XG4gICAgd2luZG93LmFuaW1GcmFtZSA9IHdpbmRvdy5hbmltRnJhbWUgfHxcbiAgICAgIHdpbmRvd1tURVNUX1BST1BTW2lpXSArICdlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICB9IC8vIGZvclxuXG4gIHJldHVybiBhbmltRnJhbWU7XG59KSgpOyJdfQ==
