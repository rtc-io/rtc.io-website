(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
var quickconnect = require('rtc-quickconnect');
var media = require('rtc-media');
var crel = require('crel');

// create containers for our local and remote video
var local = crel('div', { class: 'local' });
var remote = crel('div', { class: 'remote' });
var media;
var peerMedia = {};

// capture local media
var localMedia = media();

// once media is captured, connect
localMedia.once('capture', function(stream) {
  quickconnect('http://rtc.io/switchboard/', { room: 'conftest' })
    // broadcast our captured media to other participants in the room
    .addStream(stream)
    // when a peer is connected (and active) pass it to us for use
    .on('call:started', function(id, pc, data) {
      console.log('peer connected: ', id);

      // render the remote streams
      pc.getRemoteStreams().forEach(renderRemote(id));
    })
    // when a peer leaves, remove teh media
    .on('call:ended', function(id) {
      // remove media for the target peer from the dom
      (peerMedia[id] || []).splice(0).forEach(function(el) {
        el.parentNode.removeChild(el);
      });
    })
});

// render the local media
localMedia.render(local);

// render a remote video
function renderRemote(id) {
  // create the peer media list
  peerMedia[id] = peerMedia[id] || [];

  return function(stream) {
    peerMedia[id] = peerMedia[id].concat(media(stream).render(remote));
  }
}

/* extra code to handle dynamic html and css creation */

// add some basic styling
document.head.appendChild(crel('style', [
  '.local { position: absolute;  right: 10px; }',
  '.local video { max-width: 200px; }'
].join('\n')));

// add the local and remote elements
document.body.appendChild(local);
document.body.appendChild(remote);

},{"crel":9,"rtc-media":14,"rtc-quickconnect":17}],3:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
## cog/defaults

```js
var defaults = require('cog/defaults');
```

### defaults(target, *)

Shallow copy object properties from the supplied source objects (*) into
the target object, returning the target object once completed.  Do not,
however, overwrite existing keys with new values:

```js
defaults({ a: 1, b: 2 }, { c: 3 }, { d: 4 }, { b: 5 }));
```

See an example on [requirebin](http://requirebin.com/?gist=6079475).
**/
module.exports = function(target) {
  // ensure we have a target
  target = target || {};

  // iterate through the sources and copy to the target
  [].slice.call(arguments, 1).forEach(function(source) {
    if (! source) {
      return;
    }

    for (var prop in source) {
      if (target[prop] === void 0) {
        target[prop] = source[prop];
      }
    }
  });

  return target;
};
},{}],4:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){
/**
  ## cog/getable

  Take an object and provide a wrapper that allows you to `get` and
  `set` values on that object.

**/
module.exports = function(target) {
  function get(key) {
    return target[key];
  }

  function set(key, value) {
    target[key] = value;
  }

  function remove(key) {
    return delete target[key];
  }

  function keys() {
    return Object.keys(target);
  };

  function values() {
    return Object.keys(target).map(function(key) {
      return target[key];
    });
  };

  if (typeof target != 'object') {
    return target;
  }

  return {
    get: get,
    set: set,
    remove: remove,
    delete: remove,
    keys: keys,
    values: values
  };
};

},{}],6:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ## cog/jsonparse

  ```js
  var jsonparse = require('cog/jsonparse');
  ```

  ### jsonparse(input)

  This function will attempt to automatically detect stringified JSON, and
  when detected will parse into JSON objects.  The function looks for strings
  that look and smell like stringified JSON, and if found attempts to
  `JSON.parse` the input into a valid object.

**/
module.exports = function(input) {
  var isString = typeof input == 'string' || (input instanceof String);
  var reNumeric = /^\-?\d+\.?\d*$/;
  var shouldParse ;
  var firstChar;
  var lastChar;

  if ((! isString) || input.length < 2) {
    if (isString && reNumeric.test(input)) {
      return parseFloat(input);
    }

    return input;
  }

  // check for true or false
  if (input === 'true' || input === 'false') {
    return input === 'true';
  }

  // check for null
  if (input === 'null') {
    return null;
  }

  // get the first and last characters
  firstChar = input.charAt(0);
  lastChar = input.charAt(input.length - 1);

  // determine whether we should JSON.parse the input
  shouldParse =
    (firstChar == '{' && lastChar == '}') ||
    (firstChar == '[' && lastChar == ']') ||
    (firstChar == '"' && lastChar == '"');

  if (shouldParse) {
    try {
      return JSON.parse(input);
    }
    catch (e) {
      // apparently it wasn't valid json, carry on with regular processing
    }
  }


  return reNumeric.test(input) ? parseFloat(input) : input;
};
},{}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ## cog/throttle

  ```js
  var throttle = require('cog/throttle');
  ```

  ### throttle(fn, delay, opts)

  A cherry-pickable throttle function.  Used to throttle `fn` to ensure
  that it can be called at most once every `delay` milliseconds.  Will
  fire first event immediately, ensuring the next event fired will occur
  at least `delay` milliseconds after the first, and so on.

**/
module.exports = function(fn, delay, opts) {
  var lastExec = (opts || {}).leading !== false ? 0 : Date.now();
  var trailing = (opts || {}).trailing;
  var timer;
  var queuedArgs;
  var queuedScope;

  // trailing defaults to true
  trailing = trailing || trailing === undefined;
  
  function invokeDefered() {
    fn.apply(queuedScope, queuedArgs || []);
    lastExec = Date.now();
  }

  return function() {
    var tick = Date.now();
    var elapsed = tick - lastExec;

    // always clear the defered timer
    clearTimeout(timer);

    if (elapsed < delay) {
      queuedArgs = [].slice.call(arguments, 0);
      queuedScope = this;

      return trailing && (timer = setTimeout(invokeDefered, delay - elapsed));
    }

    // call the function
    lastExec = tick;
    fn.apply(this, arguments);
  };
};
},{}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{"detect-browser":12}],11:[function(require,module,exports){
/**
  ### `rtc-core/genice`

  Respond appropriately to options that are passed to packages like
  `rtc-quickconnect` and trigger a `callback` (error first) with iceServer
  values.

  The function looks for either of the following keys in the options, in
  the following order or precedence:

  1. `ice` - this can either be an array of ice server values or a generator
     function (in the same format as this function).  If this key contains a
     value then any servers specified in the `iceServers` key (2) will be
     ignored.

  2. `iceServers` - an array of ice server values.
**/
module.exports = function(opts, callback) {
  var ice = (opts || {}).ice;
  var iceServers = (opts || {}).iceServers;

  if (typeof ice == 'function') {
    return ice(opts, callback);
  }
  else if (Array.isArray(ice)) {
    return callback(null, [].concat(ice));
  }

  callback(null, [].concat(iceServers || []));
};

},{}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
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

},{"./detect":10}],14:[function(require,module,exports){
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

},{"cog/extend":4,"rtc-attach":15,"rtc-capture":16}],15:[function(require,module,exports){
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

},{"cog/extend":4,"rtc-core/plugin":13}],16:[function(require,module,exports){
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

},{"rtc-core/detect":10,"rtc-core/plugin":13}],17:[function(require,module,exports){
/* jshint node: true */
/* global location */
'use strict';

var rtc = require('rtc-tools');
var mbus = require('mbus');
var detectPlugin = require('rtc-core/plugin');
var debug = rtc.logger('rtc-quickconnect');
var extend = require('cog/extend');

/**
  # rtc-quickconnect

  This is a high level helper module designed to help you get up
  an running with WebRTC really, really quickly.  By using this module you
  are trading off some flexibility, so if you need a more flexible
  configuration you should drill down into lower level components of the
  [rtc.io](http://www.rtc.io) suite.  In particular you should check out
  [rtc](https://github.com/rtc-io/rtc).

  ## Example Usage

  In the simplest case you simply call quickconnect with a single string
  argument which tells quickconnect which server to use for signaling:

  <<< examples/simple.js

  <<< docs/events.md

  <<< docs/examples.md

  ## Regarding Signalling and a Signalling Server

  Signaling is an important part of setting up a WebRTC connection and for
  our examples we use our own test instance of the
  [rtc-switchboard](https://github.com/rtc-io/rtc-switchboard). For your
  testing and development you are more than welcome to use this also, but
  just be aware that we use this for our testing so it may go up and down
  a little.  If you need something more stable, why not consider deploying
  an instance of the switchboard yourself - it's pretty easy :)

  ## Reference

  ```
  quickconnect(signalhost, opts?) => rtc-sigaller instance (+ helpers)
  ```

  ### Valid Quick Connect Options

  The options provided to the `rtc-quickconnect` module function influence the
  behaviour of some of the underlying components used from the rtc.io suite.

  Listed below are some of the commonly used options:

  - `ns` (default: '')

    An optional namespace for your signalling room.  While quickconnect
    will generate a unique hash for the room, this can be made to be more
    unique by providing a namespace.  Using a namespace means two demos
    that have generated the same hash but use a different namespace will be
    in different rooms.

  - `room` (default: null) _added 0.6_

    Rather than use the internal hash generation
    (plus optional namespace) for room name generation, simply use this room
    name instead.  __NOTE:__ Use of the `room` option takes precendence over
    `ns`.

  - `debug` (default: false)

  Write rtc.io suite debug output to the browser console.

  - `expectedLocalStreams` (default: not specified) _added 3.0_

    By providing a positive integer value for this option will mean that
    the created quickconnect instance will wait until the specified number of
    streams have been added to the quickconnect "template" before announcing
    to the signaling server.

  - `manualJoin` (default: `false`)

    Set this value to `true` if you would prefer to call the `join` function
    to connecting to the signalling server, rather than having that happen
    automatically as soon as quickconnect is ready to.

  #### Options for Peer Connection Creation

  Options that are passed onto the
  [rtc.createConnection](https://github.com/rtc-io/rtc#createconnectionopts-constraints)
  function:

  - `iceServers`

  This provides a list of ice servers that can be used to help negotiate a
  connection between peers.

  #### Options for P2P negotiation

  Under the hood, quickconnect uses the
  [rtc/couple](https://github.com/rtc-io/rtc#rtccouple) logic, and the options
  passed to quickconnect are also passed onto this function.

**/
module.exports = function(signalhost, opts) {
  var hash = typeof location != 'undefined' && location.hash.slice(1);
  var signaller = require('rtc-pluggable-signaller')(extend({ signaller: signalhost }, opts));
  var getPeerData = require('./lib/getpeerdata')(signaller.peers);

  // init configurable vars
  var ns = (opts || {}).ns || '';
  var room = (opts || {}).room;
  var debugging = (opts || {}).debug;
  var allowJoin = !(opts || {}).manualJoin;
  var profile = {};
  var announced = false;

  // initialise iceServers to undefined
  // we will not announce until these have been properly initialised
  var iceServers;

  // collect the local streams
  var localStreams = [];

  // create the calls map
  var calls = signaller.calls = require('./lib/calls')(signaller, opts);

  // create the known data channels registry
  var channels = {};

  // save the plugins passed to the signaller
  var plugins = signaller.plugins = (opts || {}).plugins || [];
  var plugin = detectPlugin(plugins);
  var pluginReady;

  // check how many local streams have been expected (default: 0)
  var expectedLocalStreams = parseInt((opts || {}).expectedLocalStreams, 10) || 0;
  var announceTimer = 0;
  var updateTimer = 0;

  function checkReadyToAnnounce() {
    clearTimeout(announceTimer);
    // if we have already announced do nothing!
    if (announced) {
      return;
    }

    if (! allowJoin) {
      return;
    }

    // if we have a plugin but it's not initialized we aren't ready
    if (plugin && (! pluginReady)) {
      return;
    }

    // if we have no iceServers we aren't ready
    if (! iceServers) {
      return;
    }

    // if we are waiting for a set number of streams, then wait until we have
    // the required number
    if (expectedLocalStreams && localStreams.length < expectedLocalStreams) {
      return;
    }

    // announce ourselves to our new friend
    announceTimer = setTimeout(function() {
      var data = extend({ room: room }, profile);

      // announce and emit the local announce event
      signaller.announce(data);
      announced = true;
    }, 0);
  }

  function connect(id) {
    var data = getPeerData(id);
    var pc;
    var monitor;

    // if the room is not a match, abort
    if (data.room !== room) {
      return;
    }

    // end any call to this id so we know we are starting fresh
    calls.end(id);

    // create a peer connection
    // iceServers that have been created using genice taking precendence
    pc = rtc.createConnection(
      extend({}, opts, { iceServers: iceServers }),
      (opts || {}).constraints
    );

    signaller('peer:connect', data.id, pc, data);

    // add this connection to the calls list
    calls.create(data.id, pc);

    // add the local streams
    localStreams.forEach(function(stream) {
      pc.addStream(stream);
    });

    // add the data channels
    // do this differently based on whether the connection is a
    // master or a slave connection
    if (signaller.isMaster(data.id)) {
      debug('is master, creating data channels: ', Object.keys(channels));

      // create the channels
      Object.keys(channels).forEach(function(label) {
       gotPeerChannel(pc.createDataChannel(label, channels[label]), pc, data);
      });
    }
    else {
      pc.ondatachannel = function(evt) {
        var channel = evt && evt.channel;

        // if we have no channel, abort
        if (! channel) {
          return;
        }

        if (channels[channel.label] !== undefined) {
          gotPeerChannel(channel, pc, getPeerData(id));
        }
      };
    }

    // couple the connections
    debug('coupling ' + signaller.id + ' to ' + data.id);
    monitor = rtc.couple(pc, id, signaller, extend({}, opts, {
      logger: mbus('pc.' + id, signaller)
    }));

    signaller('peer:couple', id, pc, data, monitor);

    // once active, trigger the peer connect event
    monitor.once('connected', calls.start.bind(null, id, pc, data));
    monitor.once('closed', calls.end.bind(null, id));

    // if we are the master connnection, create the offer
    // NOTE: this only really for the sake of politeness, as rtc couple
    // implementation handles the slave attempting to create an offer
    if (signaller.isMaster(id)) {
      monitor.createOffer();
    }
  }

  function getActiveCall(peerId) {
    var call = calls.get(peerId);

    if (! call) {
      throw new Error('No active call for peer: ' + peerId);
    }

    return call;
  }

  function gotPeerChannel(channel, pc, data) {
    var channelMonitor;

    function channelReady() {
      var call = calls.get(data.id);
      var args = [ data.id, channel, data, pc ];

      // decouple the channel.onopen listener
      debug('reporting channel "' + channel.label + '" ready, have call: ' + (!!call));
      clearInterval(channelMonitor);
      channel.onopen = null;

      // save the channel
      if (call) {
        call.channels.set(channel.label, channel);
      }

      // trigger the %channel.label%:open event
      debug('triggering channel:opened events for channel: ' + channel.label);

      // emit the plain channel:opened event
      signaller.apply(signaller, ['channel:opened'].concat(args));

      // emit the channel:opened:%label% eve
      signaller.apply(
        signaller,
        ['channel:opened:' + channel.label].concat(args)
      );
    }

    debug('channel ' + channel.label + ' discovered for peer: ' + data.id);
    if (channel.readyState === 'open') {
      return channelReady();
    }

    debug('channel not ready, current state = ' + channel.readyState);
    channel.onopen = channelReady;

    // monitor the channel open (don't trust the channel open event just yet)
    channelMonitor = setInterval(function() {
      debug('checking channel state, current state = ' + channel.readyState);
      if (channel.readyState === 'open') {
        channelReady();
      }
    }, 500);
  }

  function initPlugin() {
    return plugin && plugin.init(opts, function(err) {
      if (err) {
        return console.error('Could not initialize plugin: ', err);
      }

      pluginReady = true;
      checkReadyToAnnounce();
    });
  }

  function handleLocalAnnounce(data) {
    // if we send an announce with an updated room then update our local room name
    if (data && typeof data.room != 'undefined') {
      room = data.room;
    }
  }

  function handlePeerFilter(id, data) {
    // only connect with the peer if we are ready
    data.allow = data.allow && (localStreams.length >= expectedLocalStreams);
  }

  function handlePeerUpdate(data) {
    var id = data && data.id;
    var activeCall = id && calls.get(id);

    // if we have received an update for a peer that has no active calls,
    // then pass this onto the announce handler
    if (id && (! activeCall)) {
      debug('received peer update from peer ' + id + ', no active calls');
      signaller.to(id).send('/reconnect');
      return connect(id);
    }
  }

  // if the room is not defined, then generate the room name
  if (! room) {
    // if the hash is not assigned, then create a random hash value
    if (typeof location != 'undefined' && (! hash)) {
      hash = location.hash = '' + (Math.pow(2, 53) * Math.random());
    }

    room = ns + '#' + hash;
  }

  if (debugging) {
    rtc.logger.enable.apply(rtc.logger, Array.isArray(debug) ? debugging : ['*']);
  }

  signaller.on('peer:announce', function(data) {
    connect(data.id);
  });

  signaller.on('peer:update', handlePeerUpdate);

  signaller.on('message:reconnect', function(sender) {
    connect(sender.id);
  });



  /**
    ### Quickconnect Broadcast and Data Channel Helper Functions

    The following are functions that are patched into the `rtc-signaller`
    instance that make working with and creating functional WebRTC applications
    a lot simpler.

  **/

  /**
    #### addStream

    ```
    addStream(stream:MediaStream) => qc
    ```

    Add the stream to active calls and also save the stream so that it
    can be added to future calls.

  **/
  signaller.broadcast = signaller.addStream = function(stream) {
    localStreams.push(stream);

    // if we have any active calls, then add the stream
    calls.values().forEach(function(data) {
      data.pc.addStream(stream);
    });

    checkReadyToAnnounce();
    return signaller;
  };

  /**
    #### endCalls()

    The `endCalls` function terminates all the active calls that have been
    created in this quickconnect instance.  Calling `endCalls` does not
    kill the connection with the signalling server.

  **/
  signaller.endCalls = function() {
    calls.keys().forEach(calls.end);
  };

  /**
    #### close()

    The `close` function provides a convenient way of closing all associated
    peer connections.  This function simply uses the `endCalls` function and
    the underlying `leave` function of the signaller to do a "full cleanup"
    of all connections.
  **/
  signaller.close = function() {
    signaller.endCalls();
    signaller.leave();
  };

  /**
    #### createDataChannel(label, config)

    Request that a data channel with the specified `label` is created on
    the peer connection.  When the data channel is open and available, an
    event will be triggered using the label of the data channel.

    For example, if a new data channel was requested using the following
    call:

    ```js
    var qc = quickconnect('https://switchboard.rtc.io/').createDataChannel('test');
    ```

    Then when the data channel is ready for use, a `test:open` event would
    be emitted by `qc`.

  **/
  signaller.createDataChannel = function(label, opts) {
    // create a channel on all existing calls
    calls.keys().forEach(function(peerId) {
      var call = calls.get(peerId);
      var dc;

      // if we are the master connection, create the data channel
      if (call && call.pc && signaller.isMaster(peerId)) {
        dc = call.pc.createDataChannel(label, opts);
        gotPeerChannel(dc, call.pc, getPeerData(peerId));
      }
    });

    // save the data channel opts in the local channels dictionary
    channels[label] = opts || null;

    return signaller;
  };

  /**
    #### join()

    The `join` function is used when `manualJoin` is set to true when creating
    a quickconnect instance.  Call the `join` function once you are ready to
    join the signalling server and initiate connections with other people.

  **/
  signaller.join = function() {
    allowJoin = true;
    checkReadyToAnnounce();
  };

  /**
    #### `get(name)`

    The `get` function returns the property value for the specified property name.
  **/
  signaller.get = function(name) {
    return profile[name];
  };

  /**
    #### `getLocalStreams()`

    Return a copy of the local streams that have currently been configured
  **/
  signaller.getLocalStreams = function() {
    return [].concat(localStreams);
  };

  /**
    #### reactive()

    Flag that this session will be a reactive connection.

  **/
  signaller.reactive = function() {
    // add the reactive flag
    opts = opts || {};
    opts.reactive = true;

    // chain
    return signaller;
  };

  /**
    #### removeStream

    ```
    removeStream(stream:MediaStream)
    ```

    Remove the specified stream from both the local streams that are to
    be connected to new peers, and also from any active calls.

  **/
  signaller.removeStream = function(stream) {
    var localIndex = localStreams.indexOf(stream);

    // remove the stream from any active calls
    calls.values().forEach(function(call) {
      call.pc.removeStream(stream);
    });

    // remove the stream from the localStreams array
    if (localIndex >= 0) {
      localStreams.splice(localIndex, 1);
    }

    return signaller;
  };

  /**
    #### requestChannel

    ```
    requestChannel(targetId, label, callback)
    ```

    This is a function that can be used to respond to remote peers supplying
    a data channel as part of their configuration.  As per the `receiveStream`
    function this function will either fire the callback immediately if the
    channel is already available, or once the channel has been discovered on
    the call.

  **/
  signaller.requestChannel = function(targetId, label, callback) {
    var call = getActiveCall(targetId);
    var channel = call && call.channels.get(label);

    // if we have then channel trigger the callback immediately
    if (channel) {
      callback(null, channel);
      return signaller;
    }

    // if not, wait for it
    signaller.once('channel:opened:' + label, function(id, dc) {
      callback(null, dc);
    });

    return signaller;
  };

  /**
    #### requestStream

    ```
    requestStream(targetId, idx, callback)
    ```

    Used to request a remote stream from a quickconnect instance. If the
    stream is already available in the calls remote streams, then the callback
    will be triggered immediately, otherwise this function will monitor
    `stream:added` events and wait for a match.

    In the case that an unknown target is requested, then an exception will
    be thrown.
  **/
  signaller.requestStream = function(targetId, idx, callback) {
    var call = getActiveCall(targetId);
    var stream;

    function waitForStream(peerId) {
      if (peerId !== targetId) {
        return;
      }

      // get the stream
      stream = call.pc.getRemoteStreams()[idx];

      // if we have the stream, then remove the listener and trigger the cb
      if (stream) {
        signaller.removeListener('stream:added', waitForStream);
        callback(null, stream);
      }
    }

    // look for the stream in the remote streams of the call
    stream = call.pc.getRemoteStreams()[idx];

    // if we found the stream then trigger the callback
    if (stream) {
      callback(null, stream);
      return signaller;
    }

    // otherwise wait for the stream
    signaller.on('stream:added', waitForStream);
    return signaller;
  };

  /**
    #### profile(data)

    Update the profile data with the attached information, so when
    the signaller announces it includes this data in addition to any
    room and id information.

  **/
  signaller.profile = function(data) {
    extend(profile, data);

    // if we have already announced, then reannounce our profile to provide
    // others a `peer:update` event
    if (announced) {
      clearTimeout(updateTimer);
      updateTimer = setTimeout(function() {
        signaller.announce(profile);
      }, (opts || {}).updateDelay || 1000);
    }

    return signaller;
  };

  /**
    #### waitForCall

    ```
    waitForCall(targetId, callback)
    ```

    Wait for a call from the specified targetId.  If the call is already
    active the callback will be fired immediately, otherwise we will wait
    for a `call:started` event that matches the requested `targetId`

  **/
  signaller.waitForCall = function(targetId, callback) {
    var call = calls.get(targetId);

    if (call && call.active) {
      callback(null, call.pc);
      return signaller;
    }

    signaller.on('call:started', function handleNewCall(id) {
      if (id === targetId) {
        signaller.removeListener('call:started', handleNewCall);
        callback(null, calls.get(id).pc);
      }
    });
  };

  // if we have an expected number of local streams, then use a filter to
  // check if we should respond
  if (expectedLocalStreams) {
    signaller.on('peer:filter', handlePeerFilter);
  }

  // respond to local announce messages
  signaller.on('local:announce', handleLocalAnnounce);

  // handle ping messages
  signaller.on('message:ping', calls.ping);

  // use genice to find our iceServers
  require('rtc-core/genice')(opts, function(err, servers) {
    if (err) {
      return console.error('could not find iceServers: ', err);
    }

    iceServers = servers;
    checkReadyToAnnounce();
  });

  // if we plugin is active, then initialize it
  if (plugin) {
    initPlugin();
  }

  // pass the signaller on
  return signaller;
};

},{"./lib/calls":18,"./lib/getpeerdata":19,"cog/extend":4,"mbus":21,"rtc-core/genice":11,"rtc-core/plugin":13,"rtc-pluggable-signaller":22,"rtc-tools":56}],18:[function(require,module,exports){
(function (process){
var rtc = require('rtc-tools');
var debug = rtc.logger('rtc-quickconnect');
var cleanup = require('rtc-tools/cleanup');
var getable = require('cog/getable');

module.exports = function(signaller, opts) {
  var calls = getable({});
  var getPeerData = require('./getpeerdata')(signaller.peers);
  var heartbeat;

  function create(id, pc) {
    calls.set(id, {
      active: false,
      pc: pc,
      channels: getable({}),
      streams: [],
      lastping: Date.now()
    });
  }

  function createStreamAddHandler(id) {
    return function(evt) {
      debug('peer ' + id + ' added stream');
      updateRemoteStreams(id);
      receiveRemoteStream(id)(evt.stream);
    };
  }

  function createStreamRemoveHandler(id) {
    return function(evt) {
      debug('peer ' + id + ' removed stream');
      updateRemoteStreams(id);
      signaller('stream:removed', id, evt.stream);
    };
  }

  function end(id) {
    var call = calls.get(id);

    // if we have no data, then do nothing
    if (! call) {
      return;
    }

    // if we have no data, then return
    call.channels.keys().forEach(function(label) {
      var channel = call.channels.get(label);
      var args = [id, channel, label];

      // emit the plain channel:closed event
      signaller.apply(signaller, ['channel:closed'].concat(args));

      // emit the labelled version of the event
      signaller.apply(signaller, ['channel:closed:' + label].concat(args));

      // decouple the events
      channel.onopen = null;
    });

    // trigger stream:removed events for each of the remotestreams in the pc
    call.streams.forEach(function(stream) {
      signaller('stream:removed', id, stream);
    });

    // delete the call data
    calls.delete(id);

    // if we have no more calls, disable the heartbeat
    if (calls.keys().length === 0) {
      resetHeartbeat();
    }

    // trigger the call:ended event
    signaller('call:ended', id, call.pc);

    // ensure the peer connection is properly cleaned up
    cleanup(call.pc);
  }

  function ping(sender) {
    var call = calls.get(sender && sender.id);

    // set the last ping for the data
    if (call) {
      call.lastping = Date.now();
    }
  }

  function receiveRemoteStream(id) {
    return function(stream) {
      signaller('stream:added', id, stream, getPeerData(id));
    };
  }

  function resetHeartbeat() {
    clearInterval(heartbeat);
    heartbeat = 0;
  }

  function start(id, pc, data) {
    var call = calls.get(id);
    var streams = [].concat(pc.getRemoteStreams());

    // flag the call as active
    call.active = true;
    call.streams = [].concat(pc.getRemoteStreams());

    pc.onaddstream = createStreamAddHandler(id);
    pc.onremovestream = createStreamRemoveHandler(id);

    debug(signaller.id + ' - ' + id + ' call start: ' + streams.length + ' streams');
    signaller('call:started', id, pc, data);

    // configure the heartbeat timer
    heartbeat = heartbeat || require('./heartbeat')(signaller, calls, opts);

    // examine the existing remote streams after a short delay
    process.nextTick(function() {
      // iterate through any remote streams
      streams.forEach(receiveRemoteStream(id));
    });
  }

  function updateRemoteStreams(id) {
    var call = calls.get(id);

    if (call && call.pc) {
      call.streams = [].concat(call.pc.getRemoteStreams());
    }
  }

  calls.create = create;
  calls.end = end;
  calls.ping = ping;
  calls.start = start;

  return calls;
};

}).call(this,require('_process'))

},{"./getpeerdata":19,"./heartbeat":20,"_process":1,"cog/getable":5,"rtc-tools":56,"rtc-tools/cleanup":52}],19:[function(require,module,exports){
module.exports = function(peers) {
  return function(id) {
    var peer = peers.get(id);
    return peer && peer.data;
  };
};

},{}],20:[function(require,module,exports){
module.exports = function(signaller, calls, opts) {
  var heartbeat = (opts || {}).heartbeat || 2500;
  var heartbeatTimer = 0;

  function send() {
    var tickInactive = (Date.now() - (heartbeat * 4));

    // iterate through our established calls
    calls.keys().forEach(function(id) {
      var call = calls.get(id);

      // if the call ping is too old, end the call
      if (call.lastping < tickInactive) {
        return calls.end(id);
      }

      // send a ping message
      signaller.to(id).send('/ping');
    });
  }

  if (! heartbeat) {
    return;
  }

  return setInterval(send, heartbeat);
};

},{}],21:[function(require,module,exports){
var reDelim = /[\.\:]/;

/**
  # mbus

  If Node's EventEmitter and Eve were to have a child, it might look something like this.
  No wildcard support at this stage though...

  ## Example Usage

  <<< docs/usage.md

  ## Reference

  ### `mbus(namespace?, parent?, scope?)`

  Create a new message bus with `namespace` inheriting from the `parent`
  mbus instance.  If events from this message bus should be triggered with
  a specific `this` scope, then specify it using the `scope` argument.

**/

var createBus = module.exports = function(namespace, parent, scope) {
  var registry = {};
  var feeds = [];

  function bus(name) {
    var args = [].slice.call(arguments, 1);
    var delimited = normalize(name);
    var handlers = registry[delimited] || [];
    var results;

    // send through the feeds
    feeds.forEach(function(feed) {
      feed({ name: delimited, args: args });
    });

    // run the registered handlers
    results = [].concat(handlers).map(function(handler) {
      return handler.apply(scope || this, args);
    });

    // run the parent handlers
    if (bus.parent) {
      results = results.concat(
        bus.parent.apply(
          scope || this,
          [(namespace ? namespace + '.' : '') + delimited].concat(args)
        )
      );
    }

    return results;
  }

  /**
    ### `mbus#clear()`

    Reset the handler registry, which essential deregisters all event listeners.

    _Alias:_ `removeAllListeners`
  **/
  function clear(name) {
    // if we have a name, reset handlers for that handler
    if (name) {
      delete registry[normalize(name)];
    }
    // otherwise, reset the entire handler registry
    else {
      registry = {};
    }
  }

  /**
    ### `mbus#feed(handler)`

    Attach a handler function that will see all events that are sent through
    this bus in an "object stream" format that matches the following format:

    ```
    { name: 'event.name', args: [ 'event', 'args' ] }
    ```

    The feed function returns a function that can be called to stop the feed
    sending data.

  **/
  function feed(handler) {
    function stop() {
      feeds.splice(feeds.indexOf(handler), 1);
    }

    feeds.push(handler);
    return stop;
  }

  function normalize(name) {
    return (Array.isArray(name) ? name : name.split(reDelim)).join('.');
  }

  /**
    ### `mbus#off(name, handler)`

    Deregister an event handler.
  **/
  function off(name, handler) {
    var handlers = registry[normalize(name)] || [];
    var idx = handlers ? handlers.indexOf(handler._actual || handler) : -1;

    if (idx >= 0) {
      handlers.splice(idx, 1);
    }
  }

  /**
    ### `mbus#on(name, handler)`

    Register an event handler for the event `name`.

  **/
  function on(name, handler) {
    var handlers;

    name = normalize(name);
    handlers = registry[name];

    if (handlers) {
      handlers.push(handler);
    }
    else {
      registry[name] = [ handler ];
    }

    return bus;
  }


  /**
    ### `mbus#once(name, handler)`

    Register an event handler for the event `name` that will only
    trigger once (i.e. the handler will be deregistered immediately after
    being triggered the first time).

  **/
  function once(name, handler) {
    function handleEvent() {
      var result = handler.apply(this, arguments);

      bus.off(name, handleEvent);
      return result;
    }

    handler._actual = handleEvent;
    return on(name, handleEvent);
  }

  if (typeof namespace == 'function') {
    parent = namespace;
    namespace = '';
  }

  namespace = normalize(namespace || '');

  bus.clear = bus.removeAllListeners = clear;
  bus.feed = feed;
  bus.on = bus.addListener = on;
  bus.once = once;
  bus.off = bus.removeListener = off;
  bus.parent = parent || (namespace && createBus());

  return bus;
};

},{}],22:[function(require,module,exports){
/**
  # rtc-pluggable-signaller

  By using `rtc-pluggable-signaller` in your code, you provide the ability
  for your package to customize which signalling client it uses (and
  thus have significant control) over how signalling operates in your
  environment.

  ## How it Works

  The pluggable signaller looks in the provided `opts` for a `signaller`
  attribute.  If the value of this attribute is a string, then it is
  assumed that you wish to use the default
  [`rtc-signaller`](https://github.com/rtc-io/rtc-signaller) in your
  package.  If, however, it is not a string value then it will be passed
  straight back as the signaller (assuming that you have provided an
  object that is compliant with the rtc.io signalling API).

**/
module.exports = function(opts) {
  var signaller = (opts || {}).signaller;
  var messenger = (opts || {}).messenger || require('rtc-switchboard-messenger');

  if (typeof signaller == 'string' || (signaller instanceof String)) {
    return require('rtc-signaller')(messenger(signaller), opts);
  }

  return signaller;
};

},{"rtc-signaller":35,"rtc-switchboard-messenger":23}],23:[function(require,module,exports){
var extend = require('cog/extend');

/**
  # rtc-switchboard-messenger

  A specialised version of
  [`messenger-ws`](https://github.com/DamonOehlman/messenger-ws) designed to
  connect to [`rtc-switchboard`](http://github.com/rtc-io/rtc-switchboard)
  instances.

**/
module.exports = function(switchboard, opts) {
  return require('messenger-ws')(switchboard, extend({
    endpoints: ['/primus', '/']
  }, opts));
};

},{"cog/extend":4,"messenger-ws":24}],24:[function(require,module,exports){
var WebSocket = require('ws');
var wsurl = require('wsurl');
var ps = require('pull-ws');
var defaults = require('cog/defaults');
var reTrailingSlash = /\/$/;

/**
  # messenger-ws

  This is a simple messaging implementation for sending and receiving data
  via websockets.

  Follows the [messenger-archetype](https://github.com/DamonOehlman/messenger-archetype)

  ## Example Usage

  <<< examples/simple.js

**/
module.exports = function(url, opts) {
  var timeout = (opts || {}).timeout || 1000;
  var endpoints = ((opts || {}).endpoints || ['/']).map(function(endpoint) {
    return url.replace(reTrailingSlash, '') + endpoint;
  });

  function connect(callback) {
    var queue = [].concat(endpoints);
    var receivedData = false;
    var failTimer;
    var successTimer;
    var removeListener;

    function attemptNext() {
      var socket;

      function registerMessage(evt) {
        receivedData = true;
        removeListener.call(socket, 'message', registerMessage);
      }

      // if we have no more valid endpoints, then erorr out
      if (queue.length === 0) {
        return callback(new Error('Unable to connect to url: ' + url));
      }

      socket = new WebSocket(wsurl(queue.shift()));
      socket.addEventListener('error', handleError);
      socket.addEventListener('close', handleAbnormalClose);
      socket.addEventListener('open', function() {
        // create the source immediately to buffer any data
        var source = ps.source(socket, opts);

        // monitor data flowing from the socket
        socket.addEventListener('message', registerMessage);

        successTimer = setTimeout(function() {
          clearTimeout(failTimer);
          callback(null, source, ps.sink(socket, opts));
        }, 100);
      });

      removeListener = socket.removeEventListener || socket.removeListener;
      failTimer = setTimeout(attemptNext, timeout);
    }

    function handleAbnormalClose(evt) {
      // if this was a clean close do nothing
      if (evt.wasClean || receivedData || queue.length === 0) {
        clearTimeout(successTimer);
        clearTimeout(failTimer);
        return;
      }

      return handleError();
    }

    function handleError() {
      clearTimeout(successTimer);
      clearTimeout(failTimer);
      attemptNext();
    }

    attemptNext();
  }

  return connect;
};

},{"cog/defaults":3,"pull-ws":25,"ws":30,"wsurl":31}],25:[function(require,module,exports){
exports = module.exports = duplex;

exports.source = require('./source');
exports.sink = require('./sink');

function duplex (ws, opts) {
  return {
    source: exports.source(ws),
    sink: exports.sink(ws, opts)
  };
};

},{"./sink":28,"./source":29}],26:[function(require,module,exports){
exports.id = 
function (item) {
  return item
}

exports.prop = 
function (map) {  
  if('string' == typeof map) {
    var key = map
    return function (data) { return data[key] }
  }
  return map
}

exports.tester = function (test) {
  if(!test) return exports.id
  if('object' === typeof test
    && 'function' === typeof test.test)
      return test.test.bind(test)
  return exports.prop(test) || exports.id
}

exports.addPipe = addPipe

function addPipe(read) {
  if('function' !== typeof read)
    return read

  read.pipe = read.pipe || function (reader) {
    if('function' != typeof reader && 'function' != typeof reader.sink)
      throw new Error('must pipe to reader')
    var pipe = addPipe(reader.sink ? reader.sink(read) : reader(read))
    return reader.source || pipe;
  }
  
  read.type = 'Source'
  return read
}

var Source =
exports.Source =
function Source (createRead) {
  function s() {
    var args = [].slice.call(arguments)
    return addPipe(createRead.apply(null, args))
  }
  s.type = 'Source'
  return s
}


var Through =
exports.Through = 
function (createRead) {
  return function () {
    var args = [].slice.call(arguments)
    var piped = []
    function reader (read) {
      args.unshift(read)
      read = createRead.apply(null, args)
      while(piped.length)
        read = piped.shift()(read)
      return read
      //pipeing to from this reader should compose...
    }
    reader.pipe = function (read) {
      piped.push(read) 
      if(read.type === 'Source')
        throw new Error('cannot pipe ' + reader.type + ' to Source')
      reader.type = read.type === 'Sink' ? 'Sink' : 'Through'
      return reader
    }
    reader.type = 'Through'
    return reader
  }
}

var Sink =
exports.Sink = 
function Sink(createReader) {
  return function () {
    var args = [].slice.call(arguments)
    if(!createReader)
      throw new Error('must be createReader function')
    function s (read) {
      args.unshift(read)
      return createReader.apply(null, args)
    }
    s.type = 'Sink'
    return s
  }
}


exports.maybeSink = 
exports.maybeDrain = 
function (createSink, cb) {
  if(!cb)
    return Through(function (read) {
      var ended
      return function (close, cb) {
        if(close) return read(close, cb)
        if(ended) return cb(ended)

        createSink(function (err, data) {
          ended = err || true
          if(!err) cb(null, data)
          else     cb(ended)
        }) (read)
      }
    })()

  return Sink(function (read) {
    return createSink(cb) (read)
  })()
}


},{}],27:[function(require,module,exports){
module.exports = function(socket, callback) {
  var remove = socket && (socket.removeEventListener || socket.removeListener);

  function cleanup () {
    if (typeof remove == 'function') {
      remove.call(socket, 'open', handleOpen);
      remove.call(socket, 'error', handleErr);
    }
  }

  function handleOpen(evt) {
    cleanup(); callback();
  }

  function handleErr (evt) {
    cleanup(); callback(evt);
  }

  // if the socket is closing or closed, return end
  if (socket.readyState >= 2) {
    return callback(true);
  }

  // if open, trigger the callback
  if (socket.readyState === 1) {
    return callback();
  }

  socket.addEventListener('open', handleOpen);
  socket.addEventListener('error', handleErr);
};

},{}],28:[function(require,module,exports){
(function (process){
var pull = require('pull-core');
var ready = require('./ready');

/**
  ### `sink(socket, opts?)`

  Create a pull-stream `Sink` that will write data to the `socket`.

  <<< examples/write.js

**/
module.exports = pull.Sink(function(read, socket, opts) {
  opts = opts || {}
  var closeOnEnd = opts.closeOnEnd !== false;
  var onClose = 'function' === typeof opts ? opts : opts.onClose;

  function next(end, data) {
    // if the stream has ended, simply return
    if (end) {
      if (closeOnEnd && socket.readyState <= 1) {
        if(onClose)
          socket.addEventListener('close', function (ev) {
            if(ev.wasClean) onClose()
            else {
              var err = new Error('ws error')
              err.event = ev
              onClose(err)
            }
          });

        socket.close();
      }

      return;
    }

    // socket ready?
    ready(socket, function(end) {
      if (end) {
        return read(end, function () {});
      }

      socket.send(data);
      process.nextTick(function() {
        read(null, next);
      });
    });
  }

  read(null, next);
});

}).call(this,require('_process'))

},{"./ready":27,"_process":1,"pull-core":26}],29:[function(require,module,exports){
var pull = require('pull-core');
var ready = require('./ready');

/**
  ### `source(socket)`

  Create a pull-stream `Source` that will read data from the `socket`.

  <<< examples/read.js

**/
module.exports = pull.Source(function(socket) {
  var buffer = [];
  var receiver;
  var ended;

  socket.addEventListener('message', function(evt) {
    if (receiver) {
      return receiver(null, evt.data);
    }

    buffer.push(evt.data);
  });

  socket.addEventListener('close', function(evt) {
    if (ended) return;
    if (receiver) {
      return receiver(ended = true);
    }
  });

  socket.addEventListener('error', function (evt) {
    if (ended) return;
    ended = evt;
    if (receiver) {
      receiver(ended);
    }
  });

  function read(abort, cb) {
    receiver = null;

    //if stream has already ended.
    if (ended)
      return cb(ended)

    // if ended, abort
    if (abort) {
      //this will callback when socket closes
      receiver = cb
      return socket.close()
    }

    ready(socket, function(end) {
      if (end) {
        return cb(ended = end);
      }

      // read from the socket
      if (ended && ended !== true) {
        return cb(ended);
      }
      else if (buffer.length > 0) {
        return cb(null, buffer.shift());
      }
      else if (ended) {
        return cb(true);
      }

      receiver = cb;
    });
  };

  return read;
});

},{"./ready":27,"pull-core":26}],30:[function(require,module,exports){

/**
 * Module dependencies.
 */

var global = (function() { return this; })();

/**
 * WebSocket constructor.
 */

var WebSocket = global.WebSocket || global.MozWebSocket;

/**
 * Module exports.
 */

module.exports = WebSocket ? ws : null;

/**
 * WebSocket constructor.
 *
 * The third `opts` options object gets ignored in web browsers, since it's
 * non-standard, and throws a TypeError if passed to the constructor.
 * See: https://github.com/einaros/ws/issues/227
 *
 * @param {String} uri
 * @param {Array} protocols (optional)
 * @param {Object) opts (optional)
 * @api public
 */

function ws(uri, protocols, opts) {
  var instance;
  if (protocols) {
    instance = new WebSocket(uri, protocols);
  } else {
    instance = new WebSocket(uri);
  }
  return instance;
}

if (WebSocket) ws.prototype = WebSocket.prototype;

},{}],31:[function(require,module,exports){
var reHttpUrl = /^http(.*)$/;

/**
  # wsurl

  Given a url (including protocol relative urls - i.e. `//`), generate an appropriate
  url for a WebSocket endpoint (`ws` or `wss`).

  ## Example Usage

  <<< examples/relative.js

**/

module.exports = function(url, opts) {
  var current = (opts || {}).current || (typeof location != 'undefined' && location.href);
  var currentProtocol = current && current.slice(0, current.indexOf(':'));
  var insecure = (opts || {}).insecure;
  var isRelative = url.slice(0, 2) == '//';
  var forceWS = (! currentProtocol) || currentProtocol === 'file:';

  if (isRelative) {
    return forceWS ?
      ((insecure ? 'ws:' : 'wss:') + url) :
      (currentProtocol.replace(reHttpUrl, 'ws$1') + ':' + url);
  }

  return url.replace(reHttpUrl, 'ws$1');
};

},{}],32:[function(require,module,exports){
module.exports = {
  // messenger events
  dataEvent: 'data',
  openEvent: 'open',
  closeEvent: 'close',
  errorEvent: 'error',

  // messenger functions
  writeMethod: 'write',
  closeMethod: 'close',

  // leave timeout (ms)
  leaveTimeout: 3000
};

},{}],33:[function(require,module,exports){
/* jshint node: true */
'use strict';

var extend = require('cog/extend');

/**
  #### announce

  ```
  /announce|%metadata%|{"id": "...", ... }
  ```

  When an announce message is received by the signaller, the attached
  object data is decoded and the signaller emits an `announce` message.

**/
module.exports = function(signaller) {

  function dataAllowed(data) {
    var cloned = extend({ allow: true }, data);
    signaller('peer:filter', data.id, cloned);

    return cloned.allow;
  }

  return function(args, messageType, srcData, srcState, isDM) {
    var data = args[0];
    var peer;

    // if we have valid data then process
    if (data && data.id && data.id !== signaller.id) {
      if (! dataAllowed(data)) {
        return;
      }
      // check to see if this is a known peer
      peer = signaller.peers.get(data.id);

      // trigger the peer connected event to flag that we know about a
      // peer connection. The peer has passed the "filter" check but may
      // be announced / updated depending on previous connection status
      signaller('peer:connected', data.id, data);

      // if the peer is existing, then update the data
      if (peer && (! peer.inactive)) {
        // update the data
        extend(peer.data, data);

        // trigger the peer update event
        return signaller('peer:update', data, srcData);
      }

      // create a new peer
      peer = {
        id: data.id,

        // initialise the local role index
        roleIdx: [data.id, signaller.id].sort().indexOf(data.id),

        // initialise the peer data
        data: {}
      };

      // initialise the peer data
      extend(peer.data, data);

      // reset inactivity state
      clearTimeout(peer.leaveTimer);
      peer.inactive = false;

      // set the peer data
      signaller.peers.set(data.id, peer);

      // if this is an initial announce message (no vector clock attached)
      // then send a announce reply
      if (signaller.autoreply && (! isDM)) {
        signaller
          .to(data.id)
          .send('/announce', signaller.attributes);
      }

      // emit a new peer announce event
      return signaller('peer:announce', data, peer);
    }
  };
};

},{"cog/extend":4}],34:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ### signaller message handlers

**/

module.exports = function(signaller, opts) {
  return {
    announce: require('./announce')(signaller, opts)
  };
};

},{"./announce":33}],35:[function(require,module,exports){
/* jshint node: true */
'use strict';

var detect = require('rtc-core/detect');
var defaults = require('cog/defaults');
var extend = require('cog/extend');
var mbus = require('mbus');
var getable = require('cog/getable');
var uuid = require('cuid');
var pull = require('pull-stream');
var pushable = require('pull-pushable');

// ready state constants
var RS_DISCONNECTED = 0;
var RS_CONNECTING = 1;
var RS_CONNECTED = 2;

// initialise signaller metadata so we don't have to include the package.json
// TODO: make this checkable with some kind of prepublish script
var metadata = {
  version: '5.2.4'
};

/**
  # rtc-signaller

  The `rtc-signaller` module provides a transportless signalling
  mechanism for WebRTC.

  ## Purpose

  <<< docs/purpose.md

  ## Getting Started

  While the signaller is capable of communicating by a number of different
  messengers (i.e. anything that can send and receive messages over a wire)
  it comes with support for understanding how to connect to an
  [rtc-switchboard](https://github.com/rtc-io/rtc-switchboard) out of the box.

  The following code sample demonstrates how:

  <<< examples/getting-started.js

  <<< docs/events.md

  <<< docs/signalflow-diagrams.md

  ## Reference

  The `rtc-signaller` module is designed to be used primarily in a functional
  way and when called it creates a new signaller that will enable
  you to communicate with other peers via your messaging network.

  ```js
  // create a signaller from something that knows how to send messages
  var signaller = require('rtc-signaller')(messenger);
  ```

  As demonstrated in the getting started guide, you can also pass through
  a string value instead of a messenger instance if you simply want to
  connect to an existing `rtc-switchboard` instance.

**/
module.exports = function(messenger, opts) {
  // get the autoreply setting
  var autoreply = (opts || {}).autoreply;
  var autoconnect = (opts || {}).autoconnect;
  var reconnect = (opts || {}).reconnect;

  // initialise the metadata
  var localMeta = {};

  // create the signaller
  var signaller = mbus('', (opts || {}).logger);

  // initialise the id
  var id = signaller.id = (opts || {}).id || uuid();

  // initialise the attributes
  var attributes = signaller.attributes = {
    browser: detect.browser,
    browserVersion: detect.browserVersion,
    id: id,
    agent: 'signaller@' + metadata.version
  };

  // create the peers map
  var peers = signaller.peers = getable({});

  // create the outbound message queue
  var queue = require('pull-pushable')();

  var processor;
  var announceTimer = 0;
  var readyState = RS_DISCONNECTED;

  function announceOnReconnect() {
    signaller.announce();
  }

  function bufferMessage(args) {
    queue.push(createDataLine(args));

    // if we are not connected (and should autoconnect), then attempt connection
    if (readyState === RS_DISCONNECTED && (autoconnect === undefined || autoconnect)) {
      connect();
    }
  }

  function createDataLine(args) {
    return args.map(prepareArg).join('|');
  }

  function createMetadata() {
    return extend({}, localMeta, { id: signaller.id });
  }

  function handleDisconnect() {
    if (reconnect === undefined || reconnect) {
      setTimeout(connect, 50);
    }
  }

  function prepareArg(arg) {
    if (typeof arg == 'object' && (! (arg instanceof String))) {
      return JSON.stringify(arg);
    }
    else if (typeof arg == 'function') {
      return null;
    }

    return arg;
  }

  /**
    ### `signaller.connect()`

    Manually connect the signaller using the supplied messenger.

    __NOTE:__ This should never have to be called if the default setting
    for `autoconnect` is used.
  **/
  var connect = signaller.connect = function() {
    // if we are already connecting then do nothing
    if (readyState === RS_CONNECTING) {
      return;
    }

    // initiate the messenger
    readyState = RS_CONNECTING;
    messenger(function(err, source, sink) {
      if (err) {
        readyState = RS_DISCONNECTED;
        return signaller('error', err);
      }

      // flag as connected
      readyState = RS_CONNECTED;

      // pass messages to the processor
      pull(
        source,

        // monitor disconnection
        pull.through(null, function() {
          readyState = RS_DISCONNECTED;
          signaller('disconnected');
        }),
        pull.drain(processor)
      );

      // pass the queue to the sink
      pull(queue, sink);

      // handle disconnection
      signaller.removeListener('disconnected', handleDisconnect);
      signaller.on('disconnected', handleDisconnect);

      // trigger the connected event
      signaller('connected');
    });
  };

  /**
    ### signaller#send(message, data*)

    Use the send function to send a message to other peers in the current
    signalling scope (if announced in a room this will be a room, otherwise
    broadcast to all peers connected to the signalling server).

  **/
  var send = signaller.send = function() {
    // iterate over the arguments and stringify as required
    // var metadata = { id: signaller.id };
    var args = [].slice.call(arguments);

    // inject the metadata
    args.splice(1, 0, createMetadata());
    bufferMessage(args);
  };

  /**
    ### announce(data?)

    The `announce` function of the signaller will pass an `/announce` message
    through the messenger network.  When no additional data is supplied to
    this function then only the id of the signaller is sent to all active
    members of the messenging network.

    #### Joining Rooms

    To join a room using an announce call you simply provide the name of the
    room you wish to join as part of the data block that you annouce, for
    example:

    ```js
    signaller.announce({ room: 'testroom' });
    ```

    Signalling servers (such as
    [rtc-switchboard](https://github.com/rtc-io/rtc-switchboard)) will then
    place your peer connection into a room with other peers that have also
    announced in this room.

    Once you have joined a room, the server will only deliver messages that
    you `send` to other peers within that room.

    #### Providing Additional Announce Data

    There may be instances where you wish to send additional data as part of
    your announce message in your application.  For instance, maybe you want
    to send an alias or nick as part of your announce message rather than just
    use the signaller's generated id.

    If for instance you were writing a simple chat application you could join
    the `webrtc` room and tell everyone your name with the following announce
    call:

    ```js
    signaller.announce({
      room: 'webrtc',
      nick: 'Damon'
    });
    ```

    #### Announcing Updates

    The signaller is written to distinguish between initial peer announcements
    and peer data updates (see the docs on the announce handler below). As
    such it is ok to provide any data updates using the announce method also.

    For instance, I could send a status update as an announce message to flag
    that I am going offline:

    ```js
    signaller.announce({ status: 'offline' });
    ```

  **/
  signaller.announce = function(data, sender) {

    function sendAnnounce() {
      (sender || send)('/announce', attributes);
      signaller('local:announce', attributes);
    }

    // if we are already connected, then ensure we announce on reconnect
    if (readyState === RS_CONNECTED) {
      // always announce on reconnect
      signaller.removeListener('connected', announceOnReconnect);
      signaller.on('connected', announceOnReconnect);
    }

    clearTimeout(announceTimer);

    // update internal attributes
    extend(attributes, data, { id: signaller.id });

    // send the attributes over the network
    return announceTimer = setTimeout(sendAnnounce, (opts || {}).announceDelay || 10);
  };

  /**
    ### isMaster(targetId)

    A simple function that indicates whether the local signaller is the master
    for it's relationship with peer signaller indicated by `targetId`.  Roles
    are determined at the point at which signalling peers discover each other,
    and are simply worked out by whichever peer has the lowest signaller id
    when lexigraphically sorted.

    For example, if we have two signaller peers that have discovered each
    others with the following ids:

    - `b11f4fd0-feb5-447c-80c8-c51d8c3cced2`
    - `8a07f82e-49a5-4b9b-a02e-43d911382be6`

    They would be assigned roles:

    - `b11f4fd0-feb5-447c-80c8-c51d8c3cced2`
    - `8a07f82e-49a5-4b9b-a02e-43d911382be6` (master)

  **/
  signaller.isMaster = function(targetId) {
    var peer = peers.get(targetId);

    return peer && peer.roleIdx !== 0;
  };

  /**
    ### leave()

    Tell the signalling server we are leaving.  Calling this function is
    usually not required though as the signalling server should issue correct
    `/leave` messages when it detects a disconnect event.

  **/
  signaller.leave = signaller.close = function() {
    // send the leave signal
    send('/leave', { id: id });

    // stop announcing on reconnect
    signaller.removeListener('disconnected', handleDisconnect);
    signaller.removeListener('connected', announceOnReconnect);

    // end our current queue
    queue.end();

    // create a new queue to buffer new messages
    queue = pushable();

    // set connected to false
    readyState = RS_DISCONNECTED;
  };

  /**
    ### metadata(data?)

    Get (pass no data) or set the metadata that is passed through with each
    request sent by the signaller.

    __NOTE:__ Regardless of what is passed to this function, metadata
    generated by the signaller will **always** include the id of the signaller
    and this cannot be modified.
  **/
  signaller.metadata = function(data) {
    console.warn('metadata is deprecated, please do not use');

    if (arguments.length === 0) {
      return extend({}, localMeta);
    }

    localMeta = extend({}, data);
  };

  /**
    ### to(targetId)

    Use the `to` function to send a message to the specified target peer.
    A large parge of negotiating a WebRTC peer connection involves direct
    communication between two parties which must be done by the signalling
    server.  The `to` function provides a simple way to provide a logical
    communication channel between the two parties:

    ```js
    var send = signaller.to('e95fa05b-9062-45c6-bfa2-5055bf6625f4').send;

    // create an offer on a local peer connection
    pc.createOffer(
      function(desc) {
        // set the local description using the offer sdp
        // if this occurs successfully send this to our peer
        pc.setLocalDescription(
          desc,
          function() {
            send('/sdp', desc);
          },
          handleFail
        );
      },
      handleFail
    );
    ```

  **/
  signaller.to = function(targetId) {
    // create a sender that will prepend messages with /to|targetId|
    var sender = function() {
      // get the peer (yes when send is called to make sure it hasn't left)
      var peer = signaller.peers.get(targetId);
      var args;

      if (! peer) {
        throw new Error('Unknown peer: ' + targetId);
      }

      // if the peer is inactive, then abort
      if (peer.inactive) {
        return;
      }

      args = [
        '/to',
        targetId
      ].concat([].slice.call(arguments));

      // inject metadata
      args.splice(3, 0, createMetadata());
      bufferMessage(args);
    };

    return {
      announce: function(data) {
        return signaller.announce(data, sender);
      },

      send: sender,
    };
  };

  // initialise opts defaults
  opts = defaults({}, opts, require('./defaults'));

  // set the autoreply flag
  signaller.autoreply = autoreply === undefined || autoreply;

  // create the processor
  signaller.process = processor = require('./processor')(signaller, opts);

  // autoconnect
  if (autoconnect === undefined || autoconnect) {
    connect();
  }

  return signaller;
};

},{"./defaults":32,"./processor":51,"cog/defaults":3,"cog/extend":4,"cog/getable":5,"cuid":36,"mbus":37,"pull-pushable":38,"pull-stream":45,"rtc-core/detect":10}],36:[function(require,module,exports){
/**
 * cuid.js
 * Collision-resistant UID generator for browsers and node.
 * Sequential for fast db lookups and recency sorting.
 * Safe for element IDs and server-side lookups.
 *
 * Extracted from CLCTR
 * 
 * Copyright (c) Eric Elliott 2012
 * MIT License
 */

/*global window, navigator, document, require, process, module */
(function (app) {
  'use strict';
  var namespace = 'cuid',
    c = 0,
    blockSize = 4,
    base = 36,
    discreteValues = Math.pow(base, blockSize),

    pad = function pad(num, size) {
      var s = "000000000" + num;
      return s.substr(s.length-size);
    },

    randomBlock = function randomBlock() {
      return pad((Math.random() *
            discreteValues << 0)
            .toString(base), blockSize);
    },

    safeCounter = function () {
      c = (c < discreteValues) ? c : 0;
      c++; // this is not subliminal
      return c - 1;
    },

    api = function cuid() {
      // Starting with a lowercase letter makes
      // it HTML element ID friendly.
      var letter = 'c', // hard-coded allows for sequential access

        // timestamp
        // warning: this exposes the exact date and time
        // that the uid was created.
        timestamp = (new Date().getTime()).toString(base),

        // Prevent same-machine collisions.
        counter,

        // A few chars to generate distinct ids for different
        // clients (so different computers are far less
        // likely to generate the same id)
        fingerprint = api.fingerprint(),

        // Grab some more chars from Math.random()
        random = randomBlock() + randomBlock();

        counter = pad(safeCounter().toString(base), blockSize);

      return  (letter + timestamp + counter + fingerprint + random);
    };

  api.slug = function slug() {
    var date = new Date().getTime().toString(36),
      counter,
      print = api.fingerprint().slice(0,1) +
        api.fingerprint().slice(-1),
      random = randomBlock().slice(-2);

      counter = safeCounter().toString(36).slice(-4);

    return date.slice(-2) + 
      counter + print + random;
  };

  api.globalCount = function globalCount() {
    // We want to cache the results of this
    var cache = (function calc() {
        var i,
          count = 0;

        for (i in window) {
          count++;
        }

        return count;
      }());

    api.globalCount = function () { return cache; };
    return cache;
  };

  api.fingerprint = function browserPrint() {
    return pad((navigator.mimeTypes.length +
      navigator.userAgent.length).toString(36) +
      api.globalCount().toString(36), 4);
  };

  // don't change anything from here down.
  if (app.register) {
    app.register(namespace, api);
  } else if (typeof module !== 'undefined') {
    module.exports = api;
  } else {
    app[namespace] = api;
  }

}(this.applitude || this));

},{}],37:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"dup":21}],38:[function(require,module,exports){
var pull = require('pull-stream')

module.exports = pull.Source(function (onClose) {
  var buffer = [], cbs = [], waiting = [], ended

  function drain() {
    var l
    while(waiting.length && ((l = buffer.length) || ended)) {
      var data = buffer.shift()
      var cb   = cbs.shift()
      waiting.shift()(l ? null : ended, data)
      cb && cb(ended === true ? null : ended)
    }
  }

  function read (end, cb) {
    ended = ended || end
    waiting.push(cb)
    drain()
    if(ended)
      onClose && onClose(ended === true ? null : ended)
  }

  read.push = function (data, cb) {
    if(ended)
      return cb && cb(ended === true ? null : ended)
    buffer.push(data); cbs.push(cb)
    drain()
  }

  read.end = function (end, cb) {
    if('function' === typeof end)
      cb = end, end = true
    ended = ended || end || true;
    if(cb) cbs.push(cb)
    drain()
    if(ended)
      onClose && onClose(ended === true ? null : ended)
  }

  return read
})


},{"pull-stream":39}],39:[function(require,module,exports){

var sources  = require('./sources')
var sinks    = require('./sinks')
var throughs = require('./throughs')
var u        = require('pull-core')

for(var k in sources)
  exports[k] = u.Source(sources[k])

for(var k in throughs)
  exports[k] = u.Through(throughs[k])

for(var k in sinks)
  exports[k] = u.Sink(sinks[k])

var maybe = require('./maybe')(exports)

for(var k in maybe)
  exports[k] = maybe[k]

exports.Duplex  = 
exports.Through = exports.pipeable       = u.Through
exports.Source  = exports.pipeableSource = u.Source
exports.Sink    = exports.pipeableSink   = u.Sink



},{"./maybe":40,"./sinks":42,"./sources":43,"./throughs":44,"pull-core":41}],40:[function(require,module,exports){
var u = require('pull-core')
var prop = u.prop
var id   = u.id
var maybeSink = u.maybeSink

module.exports = function (pull) {

  var exports = {}
  var drain = pull.drain

  var find = 
  exports.find = function (test, cb) {
    return maybeSink(function (cb) {
      var ended = false
      if(!cb)
        cb = test, test = id
      else
        test = prop(test) || id

      return drain(function (data) {
        if(test(data)) {
          ended = true
          cb(null, data)
        return false
        }
      }, function (err) {
        if(ended) return //already called back
        cb(err === true ? null : err, null)
      })

    }, cb)
  }

  var reduce = exports.reduce = 
  function (reduce, acc, cb) {
    
    return maybeSink(function (cb) {
      return drain(function (data) {
        acc = reduce(acc, data)
      }, function (err) {
        cb(err, acc)
      })

    }, cb)
  }

  var collect = exports.collect = exports.writeArray =
  function (cb) {
    return reduce(function (arr, item) {
      arr.push(item)
      return arr
    }, [], cb)
  }

  return exports
}

},{"pull-core":41}],41:[function(require,module,exports){
exports.id = 
function (item) {
  return item
}

exports.prop = 
function (map) {  
  if('string' == typeof map) {
    var key = map
    return function (data) { return data[key] }
  }
  return map
}

exports.tester = function (test) {
  if(!test) return exports.id
  if('object' === typeof test
    && 'function' === typeof test.test)
      return test.test.bind(test)
  return exports.prop(test) || exports.id
}

exports.addPipe = addPipe

function addPipe(read) {
  if('function' !== typeof read)
    return read

  read.pipe = read.pipe || function (reader) {
    if('function' != typeof reader)
      throw new Error('must pipe to reader')
    return addPipe(reader(read))
  }
  read.type = 'Source'
  return read
}

var Source =
exports.Source =
function Source (createRead) {
  function s() {
    var args = [].slice.call(arguments)
    return addPipe(createRead.apply(null, args))
  }
  s.type = 'Source'
  return s
}


var Through =
exports.Through = 
function (createRead) {
  return function () {
    var args = [].slice.call(arguments)
    var piped = []
    function reader (read) {
      args.unshift(read)
      read = createRead.apply(null, args)
      while(piped.length)
        read = piped.shift()(read)
      return read
      //pipeing to from this reader should compose...
    }
    reader.pipe = function (read) {
      piped.push(read) 
      if(read.type === 'Source')
        throw new Error('cannot pipe ' + reader.type + ' to Source')
      reader.type = read.type === 'Sink' ? 'Sink' : 'Through'
      return reader
    }
    reader.type = 'Through'
    return reader
  }
}

var Sink =
exports.Sink = 
function Sink(createReader) {
  return function () {
    var args = [].slice.call(arguments)
    if(!createReader)
      throw new Error('must be createReader function')
    function s (read) {
      args.unshift(read)
      return createReader.apply(null, args)
    }
    s.type = 'Sink'
    return s
  }
}


exports.maybeSink = 
exports.maybeDrain = 
function (createSink, cb) {
  if(!cb)
    return Through(function (read) {
      var ended
      return function (close, cb) {
        if(close) return read(close, cb)
        if(ended) return cb(ended)

        createSink(function (err, data) {
          ended = err || true
          if(!err) cb(null, data)
          else     cb(ended)
        }) (read)
      }
    })()

  return Sink(function (read) {
    return createSink(cb) (read)
  })()
}


},{}],42:[function(require,module,exports){
var drain = exports.drain = function (read, op, done) {

  ;(function next() {
    var loop = true, cbed = false
    while(loop) {
      cbed = false
      read(null, function (end, data) {
        cbed = true
        if(end) {
          loop = false
          done && done(end === true ? null : end)
        }
        else if(op && false === op(data)) {
          loop = false
          read(true, done || function () {})
        }
        else if(!loop){
          next()
        }
      })
      if(!cbed) {
        loop = false
        return
      }
    }
  })()
}

var onEnd = exports.onEnd = function (read, done) {
  return drain(read, null, done)
}

var log = exports.log = function (read, done) {
  return drain(read, function (data) {
    console.log(data)
  }, done)
}


},{}],43:[function(require,module,exports){

var keys = exports.keys =
function (object) {
  return values(Object.keys(object))
}

var once = exports.once =
function (value) {
  return function (abort, cb) {
    if(abort) return cb(abort)
    if(value != null) {
      var _value = value; value = null
      cb(null, _value)
    } else
      cb(true)
  }
}

var values = exports.values = exports.readArray =
function (array) {
  if(!Array.isArray(array))
    array = Object.keys(array).map(function (k) {
      return array[k]
    })
  var i = 0
  return function (end, cb) {
    if(end)
      return cb && cb(end)  
    cb(i >= array.length || null, array[i++])
  }
}


var count = exports.count = 
function (max) {
  var i = 0; max = max || Infinity
  return function (end, cb) {
    if(end) return cb && cb(end)
    if(i > max)
      return cb(true)
    cb(null, i++)
  }
}

var infinite = exports.infinite = 
function (generate) {
  generate = generate || Math.random
  return function (end, cb) {
    if(end) return cb && cb(end)
    return cb(null, generate())
  }
}

var defer = exports.defer = function () {
  var _read, cbs = [], _end

  var read = function (end, cb) {
    if(!_read) {
      _end = end
      cbs.push(cb)
    } 
    else _read(end, cb)
  }
  read.resolve = function (read) {
    if(_read) throw new Error('already resolved')
    _read = read
    if(!_read) throw new Error('no read cannot resolve!' + _read)
    while(cbs.length)
      _read(_end, cbs.shift())
  }
  read.abort = function(err) {
    read.resolve(function (_, cb) {
      cb(err || true)
    })
  }
  return read
}

var empty = exports.empty = function () {
  return function (abort, cb) {
    cb(true)
  }
}

var depthFirst = exports.depthFirst =
function (start, createStream) {
  var reads = []

  reads.unshift(once(start))

  return function next (end, cb) {
    if(!reads.length)
      return cb(true)
    reads[0](end, function (end, data) {
      if(end) {
        //if this stream has ended, go to the next queue
        reads.shift()
        return next(null, cb)
      }
      reads.unshift(createStream(data))
      cb(end, data)
    })
  }
}
//width first is just like depth first,
//but push each new stream onto the end of the queue
var widthFirst = exports.widthFirst = 
function (start, createStream) {
  var reads = []

  reads.push(once(start))

  return function next (end, cb) {
    if(!reads.length)
      return cb(true)
    reads[0](end, function (end, data) {
      if(end) {
        reads.shift()
        return next(null, cb)
      }
      reads.push(createStream(data))
      cb(end, data)
    })
  }
}

//this came out different to the first (strm)
//attempt at leafFirst, but it's still a valid
//topological sort.
var leafFirst = exports.leafFirst = 
function (start, createStream) {
  var reads = []
  var output = []
  reads.push(once(start))
  
  return function next (end, cb) {
    reads[0](end, function (end, data) {
      if(end) {
        reads.shift()
        if(!output.length)
          return cb(true)
        return cb(null, output.shift())
      }
      reads.unshift(createStream(data))
      output.unshift(data)
      next(null, cb)
    })
  }
}


},{}],44:[function(require,module,exports){
(function (process){
var u      = require('pull-core')
var sources = require('./sources')
var sinks = require('./sinks')

var prop   = u.prop
var id     = u.id
var tester = u.tester

var map = exports.map = 
function (read, map) {
  map = prop(map) || id
  return function (end, cb) {
    read(end, function (end, data) {
      var data = !end ? map(data) : null
      cb(end, data)
    })
  }
}

var asyncMap = exports.asyncMap =
function (read, map) {
  if(!map) return read
  return function (end, cb) {
    if(end) return read(end, cb) //abort
    read(null, function (end, data) {
      if(end) return cb(end, data)
      map(data, cb)
    })
  }
}

var paraMap = exports.paraMap =
function (read, map, width) {
  if(!map) return read
  var ended = false, queue = [], _cb

  function drain () {
    if(!_cb) return
    var cb = _cb
    _cb = null
    if(queue.length)
      return cb(null, queue.shift())
    else if(ended && !n)
      return cb(ended)
    _cb = cb
  }

  function pull () {
    read(null, function (end, data) {
      if(end) {
        ended = end
        return drain()
      }
      n++
      map(data, function (err, data) {
        n--

        queue.push(data)
        drain()
      })

      if(n < width && !ended)
        pull()
    })
  }

  var n = 0
  return function (end, cb) {
    if(end) return read(end, cb) //abort
    //continue to read while there are less than 3 maps in flight
    _cb = cb
    if(queue.length || ended)
      pull(), drain()
    else pull()
  }
  return highWaterMark(asyncMap(read, map), width)
}

var filter = exports.filter =
function (read, test) {
  //regexp
  test = tester(test)
  return function next (end, cb) {
    read(end, function (end, data) {
      if(!end && !test(data))
        return next(end, cb)
      cb(end, data)
    })
  }
}

var filterNot = exports.filterNot =
function (read, test) {
  test = tester(test)
  return filter(read, function (e) {
    return !test(e)
  })
}

var through = exports.through = 
function (read, op, onEnd) {
  var a = false
  function once (abort) {
    if(a || !onEnd) return
    a = true
    onEnd(abort === true ? null : abort)
  }

  return function (end, cb) {
    if(end) once(end)
    return read(end, function (end, data) {
      if(!end) op && op(data)
      else once(end)
      cb(end, data)
    })
  }
}

var take = exports.take =
function (read, test) {
  var ended = false
  if('number' === typeof test) {
    var n = test; test = function () {
      return n --
    }
  }

  return function (end, cb) {
    if(ended) return cb(ended)
    if(ended = end) return read(ended, cb)

    read(null, function (end, data) {
      if(ended = ended || end) return cb(ended)
      if(!test(data)) {
        ended = true
        read(true, function (end, data) {
          cb(ended, data)
        })
      }
      else
        cb(null, data)
    })
  }
}

var unique = exports.unique = function (read, field, invert) {
  field = prop(field) || id
  var seen = {}
  return filter(read, function (data) {
    var key = field(data)
    if(seen[key]) return !!invert //false, by default
    else seen[key] = true
    return !invert //true by default
  })
}

var nonUnique = exports.nonUnique = function (read, field) {
  return unique(read, field, true)
}

var group = exports.group =
function (read, size) {
  var ended; size = size || 5
  var queue = []

  return function (end, cb) {
    //this means that the upstream is sending an error.
    if(end) return read(ended = end, cb)
    //this means that we read an end before.
    if(ended) return cb(ended)

    read(null, function next(end, data) {
      if(ended = ended || end) {
        if(!queue.length)
          return cb(ended)

        var _queue = queue; queue = []
        return cb(null, _queue)
      }
      queue.push(data)
      if(queue.length < size)
        return read(null, next)

      var _queue = queue; queue = []
      cb(null, _queue)
    })
  }
}

var flatten = exports.flatten = function (read) {
  var _read
  return function (abort, cb) {
    if(_read) nextChunk()
    else      nextStream()

    function nextChunk () {
      _read(null, function (end, data) {
        if(end) nextStream()
        else    cb(null, data)
      })
    }
    function nextStream () {
      read(null, function (end, stream) {
        if(end)
          return cb(end)
        if(Array.isArray(stream))
          stream = sources.values(stream)
        else if('function' != typeof stream)
          throw new Error('expected stream of streams')
        
        _read = stream
        nextChunk()
      })
    }
  }
}

var prepend =
exports.prepend =
function (read, head) {

  return function (abort, cb) {
    if(head !== null) {
      if(abort)
        return read(abort, cb)
      var _head = head
      head = null
      cb(null, _head)
    } else {
      read(abort, cb)
    }
  }

}

//var drainIf = exports.drainIf = function (op, done) {
//  sinks.drain(
//}

var _reduce = exports._reduce = function (read, reduce, initial) {
  return function (close, cb) {
    if(close) return read(close, cb)
    if(ended) return cb(ended)

    sinks.drain(function (item) {
      initial = reduce(initial, item)
    }, function (err, data) {
      ended = err || true
      if(!err) cb(null, initial)
      else     cb(ended)
    })
    (read)
  }
}

var nextTick = process.nextTick

var highWaterMark = exports.highWaterMark = 
function (read, highWaterMark) {
  var buffer = [], waiting = [], ended, reading = false
  highWaterMark = highWaterMark || 10

  function readAhead () {
    while(waiting.length && (buffer.length || ended))
      waiting.shift()(ended, ended ? null : buffer.shift())
  }

  function next () {
    if(ended || reading || buffer.length >= highWaterMark)
      return
    reading = true
    return read(ended, function (end, data) {
      reading = false
      ended = ended || end
      if(data != null) buffer.push(data)
      
      next(); readAhead()
    })
  }

  nextTick(next)

  return function (end, cb) {
    ended = ended || end
    waiting.push(cb)

    next(); readAhead()
  }
}




}).call(this,require('_process'))

},{"./sinks":42,"./sources":43,"_process":1,"pull-core":41}],45:[function(require,module,exports){
var sources  = require('./sources')
var sinks    = require('./sinks')
var throughs = require('./throughs')
var u        = require('pull-core')

function isFunction (fun) {
  return 'function' === typeof fun
}

function isReader (fun) {
  return fun && (fun.type === "Through" || fun.length === 1)
}
var exports = module.exports = function pull () {
  var args = [].slice.call(arguments)

  if(isReader(args[0]))
    return function (read) {
      args.unshift(read)
      return pull.apply(null, args)
    }

  var read = args.shift()

  //if the first function is a duplex stream,
  //pipe from the source.
  if(isFunction(read.source))
    read = read.source

  function next () {
    var s = args.shift()

    if(null == s)
      return next()

    if(isFunction(s)) return s

    return function (read) {
      s.sink(read)
      //this supports pipeing through a duplex stream
      //pull(a, b, a) "telephone style".
      //if this stream is in the a (first & last position)
      //s.source will have already been used, but this should never be called
      //so that is okay.
      return s.source
    }
  }

  while(args.length)
    read = next() (read)

  return read
}


for(var k in sources)
  exports[k] = u.Source(sources[k])

for(var k in throughs)
  exports[k] = u.Through(throughs[k])

for(var k in sinks)
  exports[k] = u.Sink(sinks[k])

var maybe = require('./maybe')(exports)

for(var k in maybe)
  exports[k] = maybe[k]

exports.Duplex  = 
exports.Through = exports.pipeable       = u.Through
exports.Source  = exports.pipeableSource = u.Source
exports.Sink    = exports.pipeableSink   = u.Sink



},{"./maybe":46,"./sinks":48,"./sources":49,"./throughs":50,"pull-core":47}],46:[function(require,module,exports){
var u = require('pull-core')
var prop = u.prop
var id   = u.id
var maybeSink = u.maybeSink

module.exports = function (pull) {

  var exports = {}
  var drain = pull.drain

  var find =
  exports.find = function (test, cb) {
    return maybeSink(function (cb) {
      var ended = false
      if(!cb)
        cb = test, test = id
      else
        test = prop(test) || id

      return drain(function (data) {
        if(test(data)) {
          ended = true
          cb(null, data)
        return false
        }
      }, function (err) {
        if(ended) return //already called back
        cb(err === true ? null : err, null)
      })

    }, cb)
  }

  var reduce = exports.reduce =
  function (reduce, acc, cb) {

    return maybeSink(function (cb) {
      return drain(function (data) {
        acc = reduce(acc, data)
      }, function (err) {
        cb(err, acc)
      })

    }, cb)
  }

  var collect = exports.collect = exports.writeArray =
  function (cb) {
    return reduce(function (arr, item) {
      arr.push(item)
      return arr
    }, [], cb)
  }

  var concat = exports.concat =
  function (cb) {
    return reduce(function (a, b) {
      return a + b
    }, '', cb)
  }

  return exports
}

},{"pull-core":47}],47:[function(require,module,exports){
arguments[4][41][0].apply(exports,arguments)
},{"dup":41}],48:[function(require,module,exports){
var drain = exports.drain = function (read, op, done) {

  ;(function next() {
    var loop = true, cbed = false
    while(loop) {
      cbed = false
      read(null, function (end, data) {
        cbed = true
        if(end) {
          loop = false
          if(done) done(end === true ? null : end)
          else if(end && end !== true)
            throw end
        }
        else if(op && false === op(data)) {
          loop = false
          read(true, done || function () {})
        }
        else if(!loop){
          next()
        }
      })
      if(!cbed) {
        loop = false
        return
      }
    }
  })()
}

var onEnd = exports.onEnd = function (read, done) {
  return drain(read, null, done)
}

var log = exports.log = function (read, done) {
  return drain(read, function (data) {
    console.log(data)
  }, done)
}


},{}],49:[function(require,module,exports){

var keys = exports.keys =
function (object) {
  return values(Object.keys(object))
}

var once = exports.once =
function (value) {
  return function (abort, cb) {
    if(abort) return cb(abort)
    if(value != null) {
      var _value = value; value = null
      cb(null, _value)
    } else
      cb(true)
  }
}

var values = exports.values = exports.readArray =
function (array) {
  if(!Array.isArray(array))
    array = Object.keys(array).map(function (k) {
      return array[k]
    })
  var i = 0
  return function (end, cb) {
    if(end)
      return cb && cb(end)
    cb(i >= array.length || null, array[i++])
  }
}


var count = exports.count =
function (max) {
  var i = 0; max = max || Infinity
  return function (end, cb) {
    if(end) return cb && cb(end)
    if(i > max)
      return cb(true)
    cb(null, i++)
  }
}

var infinite = exports.infinite =
function (generate) {
  generate = generate || Math.random
  return function (end, cb) {
    if(end) return cb && cb(end)
    return cb(null, generate())
  }
}

var defer = exports.defer = function () {
  var _read, cbs = [], _end

  var read = function (end, cb) {
    if(!_read) {
      _end = end
      cbs.push(cb)
    } 
    else _read(end, cb)
  }
  read.resolve = function (read) {
    if(_read) throw new Error('already resolved')
    _read = read
    if(!_read) throw new Error('no read cannot resolve!' + _read)
    while(cbs.length)
      _read(_end, cbs.shift())
  }
  read.abort = function(err) {
    read.resolve(function (_, cb) {
      cb(err || true)
    })
  }
  return read
}

var empty = exports.empty = function () {
  return function (abort, cb) {
    cb(true)
  }
}

var error = exports.error = function (err) {
  return function (abort, cb) {
    cb(err)
  }
}

var depthFirst = exports.depthFirst =
function (start, createStream) {
  var reads = []

  reads.unshift(once(start))

  return function next (end, cb) {
    if(!reads.length)
      return cb(true)
    reads[0](end, function (end, data) {
      if(end) {
        //if this stream has ended, go to the next queue
        reads.shift()
        return next(null, cb)
      }
      reads.unshift(createStream(data))
      cb(end, data)
    })
  }
}
//width first is just like depth first,
//but push each new stream onto the end of the queue
var widthFirst = exports.widthFirst =
function (start, createStream) {
  var reads = []

  reads.push(once(start))

  return function next (end, cb) {
    if(!reads.length)
      return cb(true)
    reads[0](end, function (end, data) {
      if(end) {
        reads.shift()
        return next(null, cb)
      }
      reads.push(createStream(data))
      cb(end, data)
    })
  }
}

//this came out different to the first (strm)
//attempt at leafFirst, but it's still a valid
//topological sort.
var leafFirst = exports.leafFirst =
function (start, createStream) {
  var reads = []
  var output = []
  reads.push(once(start))

  return function next (end, cb) {
    reads[0](end, function (end, data) {
      if(end) {
        reads.shift()
        if(!output.length)
          return cb(true)
        return cb(null, output.shift())
      }
      reads.unshift(createStream(data))
      output.unshift(data)
      next(null, cb)
    })
  }
}


},{}],50:[function(require,module,exports){
(function (process){
var u      = require('pull-core')
var sources = require('./sources')
var sinks = require('./sinks')

var prop   = u.prop
var id     = u.id
var tester = u.tester

var map = exports.map =
function (read, map) {
  map = prop(map) || id
  return function (abort, cb) {
    read(abort, function (end, data) {
      try {
      data = !end ? map(data) : null
      } catch (err) {
        return read(err, function () {
          return cb(err)
        })
      }
      cb(end, data)
    })
  }
}

var asyncMap = exports.asyncMap =
function (read, map) {
  if(!map) return read
  return function (end, cb) {
    if(end) return read(end, cb) //abort
    read(null, function (end, data) {
      if(end) return cb(end, data)
      map(data, cb)
    })
  }
}

var paraMap = exports.paraMap =
function (read, map, width) {
  if(!map) return read
  var ended = false, queue = [], _cb

  function drain () {
    if(!_cb) return
    var cb = _cb
    _cb = null
    if(queue.length)
      return cb(null, queue.shift())
    else if(ended && !n)
      return cb(ended)
    _cb = cb
  }

  function pull () {
    read(null, function (end, data) {
      if(end) {
        ended = end
        return drain()
      }
      n++
      map(data, function (err, data) {
        n--

        queue.push(data)
        drain()
      })

      if(n < width && !ended)
        pull()
    })
  }

  var n = 0
  return function (end, cb) {
    if(end) return read(end, cb) //abort
    //continue to read while there are less than 3 maps in flight
    _cb = cb
    if(queue.length || ended)
      pull(), drain()
    else pull()
  }
  return highWaterMark(asyncMap(read, map), width)
}

var filter = exports.filter =
function (read, test) {
  //regexp
  test = tester(test)
  return function next (end, cb) {
    var sync, loop = true
    while(loop) {
      loop = false
      sync = true
      read(end, function (end, data) {
        if(!end && !test(data))
          return sync ? loop = true : next(end, cb)
        cb(end, data)
      })
      sync = false
    }
  }
}

var filterNot = exports.filterNot =
function (read, test) {
  test = tester(test)
  return filter(read, function (e) {
    return !test(e)
  })
}

var through = exports.through =
function (read, op, onEnd) {
  var a = false
  function once (abort) {
    if(a || !onEnd) return
    a = true
    onEnd(abort === true ? null : abort)
  }

  return function (end, cb) {
    if(end) once(end)
    return read(end, function (end, data) {
      if(!end) op && op(data)
      else once(end)
      cb(end, data)
    })
  }
}

var take = exports.take =
function (read, test) {
  var ended = false
  if('number' === typeof test) {
    var n = test; test = function () {
      return n --
    }
  }

  return function (end, cb) {
    if(ended) return cb(ended)
    if(ended = end) return read(ended, cb)

    read(null, function (end, data) {
      if(ended = ended || end) return cb(ended)
      if(!test(data)) {
        ended = true
        read(true, function (end, data) {
          cb(ended, data)
        })
      }
      else
        cb(null, data)
    })
  }
}

var unique = exports.unique = function (read, field, invert) {
  field = prop(field) || id
  var seen = {}
  return filter(read, function (data) {
    var key = field(data)
    if(seen[key]) return !!invert //false, by default
    else seen[key] = true
    return !invert //true by default
  })
}

var nonUnique = exports.nonUnique = function (read, field) {
  return unique(read, field, true)
}

var group = exports.group =
function (read, size) {
  var ended; size = size || 5
  var queue = []

  return function (end, cb) {
    //this means that the upstream is sending an error.
    if(end) return read(ended = end, cb)
    //this means that we read an end before.
    if(ended) return cb(ended)

    read(null, function next(end, data) {
      if(ended = ended || end) {
        if(!queue.length)
          return cb(ended)

        var _queue = queue; queue = []
        return cb(null, _queue)
      }
      queue.push(data)
      if(queue.length < size)
        return read(null, next)

      var _queue = queue; queue = []
      cb(null, _queue)
    })
  }
}

var flatten = exports.flatten = function (read) {
  var _read
  return function (abort, cb) {
    if(_read) nextChunk()
    else      nextStream()

    function nextChunk () {
      _read(null, function (end, data) {
        if(end) nextStream()
        else    cb(null, data)
      })
    }
    function nextStream () {
      read(null, function (end, stream) {
        if(end)
          return cb(end)
        if(Array.isArray(stream) || stream && 'object' === typeof stream)
          stream = sources.values(stream)
        else if('function' != typeof stream)
          throw new Error('expected stream of streams')
        _read = stream
        nextChunk()
      })
    }
  }
}

var prepend =
exports.prepend =
function (read, head) {

  return function (abort, cb) {
    if(head !== null) {
      if(abort)
        return read(abort, cb)
      var _head = head
      head = null
      cb(null, _head)
    } else {
      read(abort, cb)
    }
  }

}

//var drainIf = exports.drainIf = function (op, done) {
//  sinks.drain(
//}

var _reduce = exports._reduce = function (read, reduce, initial) {
  return function (close, cb) {
    if(close) return read(close, cb)
    if(ended) return cb(ended)

    sinks.drain(function (item) {
      initial = reduce(initial, item)
    }, function (err, data) {
      ended = err || true
      if(!err) cb(null, initial)
      else     cb(ended)
    })
    (read)
  }
}

var nextTick = process.nextTick

var highWaterMark = exports.highWaterMark =
function (read, highWaterMark) {
  var buffer = [], waiting = [], ended, ending, reading = false
  highWaterMark = highWaterMark || 10

  function readAhead () {
    while(waiting.length && (buffer.length || ended))
      waiting.shift()(ended, ended ? null : buffer.shift())

    if (!buffer.length && ending) ended = ending;
  }

  function next () {
    if(ended || ending || reading || buffer.length >= highWaterMark)
      return
    reading = true
    return read(ended || ending, function (end, data) {
      reading = false
      ending = ending || end
      if(data != null) buffer.push(data)

      next(); readAhead()
    })
  }

  process.nextTick(next)

  return function (end, cb) {
    ended = ended || end
    waiting.push(cb)

    next(); readAhead()
  }
}

var flatMap = exports.flatMap =
function (read, mapper) {
  mapper = mapper || id
  var queue = [], ended

  return function (abort, cb) {
    if(queue.length) return cb(null, queue.shift())
    else if(ended)   return cb(ended)

    read(abort, function next (end, data) {
      if(end) ended = end
      else {
        var add = mapper(data)
        while(add && add.length)
          queue.push(add.shift())
      }

      if(queue.length) cb(null, queue.shift())
      else if(ended)   cb(ended)
      else             read(null, next)
    })
  }
}


}).call(this,require('_process'))

},{"./sinks":48,"./sources":49,"_process":1,"pull-core":47}],51:[function(require,module,exports){
/* jshint node: true */
'use strict';

var jsonparse = require('cog/jsonparse');

/**
  ### signaller process handling

  When a signaller's underling messenger emits a `data` event this is
  delegated to a simple message parser, which applies the following simple
  logic:

  - Is the message a `/to` message. If so, see if the message is for this
    signaller (checking the target id - 2nd arg).  If so pass the
    remainder of the message onto the standard processing chain.  If not,
    discard the message.

  - Is the message a command message (prefixed with a forward slash). If so,
    look for an appropriate message handler and pass the message payload on
    to it.

  - Finally, does the message match any patterns that we are listening for?
    If so, then pass the entire message contents onto the registered handler.
**/
module.exports = function(signaller, opts) {
  var handlers = require('./handlers')(signaller, opts);

  function sendEvent(parts, srcState, data) {
    // initialise the event name
    var evtName = 'message:' + parts[0].slice(1);

    // convert any valid json objects to json
    var args = parts.slice(2).map(jsonparse);

    signaller.apply(
      signaller,
      [evtName].concat(args).concat([srcState, data])
    );
  }

  return function(originalData) {
    var data = originalData;
    var isMatch = true;
    var parts;
    var handler;
    var srcData;
    var srcState;
    var isDirectMessage = false;

    // discard primus messages
    if (data && data.slice(0, 6) === 'primus') {
      return;
    }

    // force the id into string format so we can run length and comparison tests on it
    var id = signaller.id + '';

    // process /to messages
    if (data.slice(0, 3) === '/to') {
      isMatch = data.slice(4, id.length + 4) === id;
      if (isMatch) {
        parts = data.slice(5 + id.length).split('|').map(jsonparse);

        // get the source data
        isDirectMessage = true;

        // extract the vector clock and update the parts
        parts = parts.map(jsonparse);
      }
    }

    // if this is not a match, then bail
    if (! isMatch) {
      return;
    }

    // chop the data into parts
    signaller('rawdata', data);
    parts = parts || data.split('|').map(jsonparse);

    // if we have a specific handler for the action, then invoke
    if (typeof parts[0] == 'string') {
      // extract the metadata from the input data
      srcData = parts[1];

      // if we got data from ourself, then this is pretty dumb
      // but if we have then throw it away
      if (srcData && srcData.id === signaller.id) {
        return console.warn('got data from ourself, discarding');
      }

      // get the source state
      srcState = signaller.peers.get(srcData && srcData.id) || srcData;

      // handle commands
      if (parts[0].charAt(0) === '/') {
        // look for a handler for the message type
        handler = handlers[parts[0].slice(1)];

        if (typeof handler == 'function') {
          handler(
            parts.slice(2),
            parts[0].slice(1),
            srcData,
            srcState,
            isDirectMessage
          );
        }
        else {
          sendEvent(parts, srcState, originalData);
        }
      }
      // otherwise, emit data
      else {
        signaller(
          'data',
          parts.slice(0, 1).concat(parts.slice(2)),
          srcData,
          srcState,
          isDirectMessage
        );
      }
    }
  };
};

},{"./handlers":34,"cog/jsonparse":6}],52:[function(require,module,exports){
/* jshint node: true */
'use strict';

var debug = require('cog/logger')('rtc/cleanup');

var CANNOT_CLOSE_STATES = [
  'closed'
];

var EVENTS_DECOUPLE_BC = [
  'addstream',
  'datachannel',
  'icecandidate',
  'negotiationneeded',
  'removestream',
  'signalingstatechange'
];

var EVENTS_DECOUPLE_AC = [
  'iceconnectionstatechange'
];

/**
  ### rtc-tools/cleanup

  ```
  cleanup(pc)
  ```

  The `cleanup` function is used to ensure that a peer connection is properly
  closed and ready to be cleaned up by the browser.

**/
module.exports = function(pc) {
  // see if we can close the connection
  var currentState = pc.iceConnectionState;
  var canClose = CANNOT_CLOSE_STATES.indexOf(currentState) < 0;

  function decouple(events) {
    events.forEach(function(evtName) {
      if (pc['on' + evtName]) {
        pc['on' + evtName] = null;
      }
    });
  }

  // decouple "before close" events
  decouple(EVENTS_DECOUPLE_BC);

  if (canClose) {
    debug('attempting connection close, current state: '+ pc.iceConnectionState);
    pc.close();
  }

  // remove the event listeners
  // after a short delay giving the connection time to trigger
  // close and iceconnectionstatechange events
  setTimeout(function() {
    decouple(EVENTS_DECOUPLE_AC);
  }, 100);
};

},{"cog/logger":7}],53:[function(require,module,exports){
/* jshint node: true */
'use strict';

var mbus = require('mbus');
var queue = require('rtc-taskqueue');
var cleanup = require('./cleanup');
var monitor = require('./monitor');
var throttle = require('cog/throttle');
var pluck = require('whisk/pluck');
var pluckCandidate = pluck('candidate', 'sdpMid', 'sdpMLineIndex');
var CLOSED_STATES = [ 'closed', 'failed' ];
var CHECKING_STATES = [ 'checking' ];

/**
  ### rtc-tools/couple

  #### couple(pc, targetId, signaller, opts?)

  Couple a WebRTC connection with another webrtc connection identified by
  `targetId` via the signaller.

  The following options can be provided in the `opts` argument:

  - `sdpfilter` (default: null)

    A simple function for filtering SDP as part of the peer
    connection handshake (see the Using Filters details below).

  ##### Example Usage

  ```js
  var couple = require('rtc/couple');

  couple(pc, '54879965-ce43-426e-a8ef-09ac1e39a16d', signaller);
  ```

  ##### Using Filters

  In certain instances you may wish to modify the raw SDP that is provided
  by the `createOffer` and `createAnswer` calls.  This can be done by passing
  a `sdpfilter` function (or array) in the options.  For example:

  ```js
  // run the sdp from through a local tweakSdp function.
  couple(pc, '54879965-ce43-426e-a8ef-09ac1e39a16d', signaller, {
    sdpfilter: tweakSdp
  });
  ```

**/
function couple(pc, targetId, signaller, opts) {
  var debugLabel = (opts || {}).debugLabel || 'rtc';
  var debug = require('cog/logger')(debugLabel + '/couple');

  // create a monitor for the connection
  var mon = monitor(pc, targetId, signaller, (opts || {}).logger);
  var emit = mbus('', mon);
  var reactive = (opts || {}).reactive;
  var endOfCandidates = true;

  // configure the time to wait between receiving a 'disconnect'
  // iceConnectionState and determining that we are closed
  var disconnectTimeout = (opts || {}).disconnectTimeout || 10000;
  var disconnectTimer;

  // initilaise the negotiation helpers
  var isMaster = signaller.isMaster(targetId);

  // initialise the processing queue (one at a time please)
  var q = queue(pc, opts);

  var createOrRequestOffer = throttle(function() {
    if (! isMaster) {
      return signaller.to(targetId).send('/negotiate');
    }

    q.createOffer();
  }, 100, { leading: false });

  var debounceOffer = throttle(q.createOffer, 100, { leading: false });

  function decouple() {
    debug('decoupling ' + signaller.id + ' from ' + targetId);

    // stop the monitor
//     mon.removeAllListeners();
    mon.stop();

    // cleanup the peerconnection
    cleanup(pc);

    // remove listeners
    signaller.removeListener('sdp', handleSdp);
    signaller.removeListener('candidate', handleCandidate);
    signaller.removeListener('negotiate', handleNegotiateRequest);

    // remove listeners (version >= 5)
    signaller.removeListener('message:sdp', handleSdp);
    signaller.removeListener('message:candidate', handleCandidate);
    signaller.removeListener('message:negotiate', handleNegotiateRequest);
  }

  function handleCandidate(data) {
    q.addIceCandidate(data);
  }

  function handleSdp(sdp, src) {
    emit('sdp.remote', sdp);

    // if the source is unknown or not a match, then don't process
    if ((! src) || (src.id !== targetId)) {
      return;
    }

    q.setRemoteDescription(sdp);
  }

  function handleConnectionClose() {
    debug('captured pc close, iceConnectionState = ' + pc.iceConnectionState);
    decouple();
  }

  function handleDisconnect() {
    debug('captured pc disconnect, monitoring connection status');

    // start the disconnect timer
    disconnectTimer = setTimeout(function() {
      debug('manually closing connection after disconnect timeout');
      cleanup(pc);
    }, disconnectTimeout);

    mon.on('statechange', handleDisconnectAbort);
  }

  function handleDisconnectAbort() {
    debug('connection state changed to: ' + pc.iceConnectionState);

    // if the state is checking, then do not reset the disconnect timer as
    // we are doing our own checking
    if (CHECKING_STATES.indexOf(pc.iceConnectionState) >= 0) {
      return;
    }

    resetDisconnectTimer();

    // if we have a closed or failed status, then close the connection
    if (CLOSED_STATES.indexOf(pc.iceConnectionState) >= 0) {
      return mon('closed');
    }

    mon.once('disconnect', handleDisconnect);
  }

  function handleLocalCandidate(evt) {
    var data = evt.candidate && pluckCandidate(evt.candidate);

    if (evt.candidate) {
      resetDisconnectTimer();
      emit('ice.local', data);
      signaller.to(targetId).send('/candidate', data);
      endOfCandidates = false;
    }
    else if (! endOfCandidates) {
      endOfCandidates = true;
      emit('ice.gathercomplete');
      signaller.to(targetId).send('/endofcandidates', {});
    }
  }

  function handleNegotiateRequest(src) {
    if (src.id === targetId) {
      emit('negotiate.request', src.id);
      debounceOffer();
    }
  }

  function resetDisconnectTimer() {
    mon.off('statechange', handleDisconnectAbort);

    // clear the disconnect timer
    debug('reset disconnect timer, state: ' + pc.iceConnectionState);
    clearTimeout(disconnectTimer);
  }

  // when regotiation is needed look for the peer
  if (reactive) {
    pc.onnegotiationneeded = function() {
      emit('negotiate.renegotiate');
      createOrRequestOffer();
    };
  }

  pc.onicecandidate = handleLocalCandidate;

  // when the task queue tells us we have sdp available, send that over the wire
  q.on('sdp.local', function(desc) {
    signaller.to(targetId).send('/sdp', desc);
  });

  // when we receive sdp, then
  signaller.on('sdp', handleSdp);
  signaller.on('candidate', handleCandidate);

  // listeners (signaller >= 5)
  signaller.on('message:sdp', handleSdp);
  signaller.on('message:candidate', handleCandidate);

  // if this is a master connection, listen for negotiate events
  if (isMaster) {
    signaller.on('negotiate', handleNegotiateRequest);
    signaller.on('message:negotiate', handleNegotiateRequest); // signaller >= 5
  }

  // when the connection closes, remove event handlers
  mon.once('closed', handleConnectionClose);
  mon.once('disconnected', handleDisconnect);

  // patch in the create offer functions
  mon.createOffer = createOrRequestOffer;

  return mon;
}

module.exports = couple;

},{"./cleanup":52,"./monitor":57,"cog/logger":7,"cog/throttle":8,"mbus":58,"rtc-taskqueue":59,"whisk/pluck":69}],54:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ### rtc-tools/detect

  Provide the [rtc-core/detect](https://github.com/rtc-io/rtc-core#detect)
  functionality.
**/
module.exports = require('rtc-core/detect');

},{"rtc-core/detect":10}],55:[function(require,module,exports){
/* jshint node: true */
'use strict';

var debug = require('cog/logger')('generators');
var detect = require('./detect');
var defaults = require('cog/defaults');

var mappings = {
  create: {
    dtls: function(c) {
      if (! detect.moz) {
        c.optional = (c.optional || []).concat({ DtlsSrtpKeyAgreement: true });
      }
    }
  }
};

/**
  ### rtc-tools/generators

  The generators package provides some utility methods for generating
  constraint objects and similar constructs.

  ```js
  var generators = require('rtc/generators');
  ```

**/

/**
  #### generators.config(config)

  Generate a configuration object suitable for passing into an W3C
  RTCPeerConnection constructor first argument, based on our custom config.

  In the event that you use short term authentication for TURN, and you want
  to generate new `iceServers` regularly, you can specify an iceServerGenerator
  that will be used prior to coupling. This generator should return a fully
  compliant W3C (RTCIceServer dictionary)[http://www.w3.org/TR/webrtc/#idl-def-RTCIceServer].

  If you pass in both a generator and iceServers, the iceServers _will be
  ignored and the generator used instead.
**/

exports.config = function(config) {
  var iceServerGenerator = (config || {}).iceServerGenerator;

  return defaults({}, config, {
    iceServers: typeof iceServerGenerator == 'function' ? iceServerGenerator() : []
  });
};

/**
  #### generators.connectionConstraints(flags, constraints)

  This is a helper function that will generate appropriate connection
  constraints for a new `RTCPeerConnection` object which is constructed
  in the following way:

  ```js
  var conn = new RTCPeerConnection(flags, constraints);
  ```

  In most cases the constraints object can be left empty, but when creating
  data channels some additional options are required.  This function
  can generate those additional options and intelligently combine any
  user defined constraints (in `constraints`) with shorthand flags that
  might be passed while using the `rtc.createConnection` helper.
**/
exports.connectionConstraints = function(flags, constraints) {
  var generated = {};
  var m = mappings.create;
  var out;

  // iterate through the flags and apply the create mappings
  Object.keys(flags || {}).forEach(function(key) {
    if (m[key]) {
      m[key](generated);
    }
  });

  // generate the connection constraints
  out = defaults({}, constraints, generated);
  debug('generated connection constraints: ', out);

  return out;
};

},{"./detect":54,"cog/defaults":3,"cog/logger":7}],56:[function(require,module,exports){
/* jshint node: true */

'use strict';

/**
  # rtc-tools

  The `rtc-tools` module does most of the heavy lifting within the
  [rtc.io](http://rtc.io) suite.  Primarily it handles the logic of coupling
  a local `RTCPeerConnection` with it's remote counterpart via an
  [rtc-signaller](https://github.com/rtc-io/rtc-signaller) signalling
  channel.

  ## Getting Started

  If you decide that the `rtc-tools` module is a better fit for you than either
  [rtc-quickconnect](https://github.com/rtc-io/rtc-quickconnect) or
  [rtc](https://github.com/rtc-io/rtc) then the code snippet below
  will provide you a guide on how to get started using it in conjunction with
  the [rtc-signaller](https://github.com/rtc-io/rtc-signaller) (version 5.0 and above)
  and [rtc-media](https://github.com/rtc-io/rtc-media) modules:

  <<< examples/getting-started.js

  This code definitely doesn't cover all the cases that you need to consider
  (i.e. peers leaving, etc) but it should demonstrate how to:

  1. Capture video and add it to a peer connection
  2. Couple a local peer connection with a remote peer connection
  3. Deal with the remote steam being discovered and how to render
     that to the local interface.

  ## Reference

**/

var gen = require('./generators');

// export detect
var detect = exports.detect = require('./detect');
var findPlugin = require('rtc-core/plugin');

// export cog logger for convenience
exports.logger = require('cog/logger');

// export peer connection
var RTCPeerConnection =
exports.RTCPeerConnection = detect('RTCPeerConnection');

// add the couple utility
exports.couple = require('./couple');

/**
  ### createConnection

  ```
  createConnection(opts?, constraints?) => RTCPeerConnection
  ```

  Create a new `RTCPeerConnection` auto generating default opts as required.

  ```js
  var conn;

  // this is ok
  conn = rtc.createConnection();

  // and so is this
  conn = rtc.createConnection({
    iceServers: []
  });
  ```
**/
exports.createConnection = function(opts, constraints) {
  var plugin = findPlugin((opts || {}).plugins);
  var PeerConnection = (opts || {}).RTCPeerConnection || RTCPeerConnection;

  // generate the config based on options provided
  var config = gen.config(opts);

  // generate appropriate connection constraints
  constraints = gen.connectionConstraints(opts, constraints);

  if (plugin && typeof plugin.createConnection == 'function') {
    return plugin.createConnection(config, constraints);
  }

  return new PeerConnection(config, constraints);
};

},{"./couple":53,"./detect":54,"./generators":55,"cog/logger":7,"rtc-core/plugin":13}],57:[function(require,module,exports){
/* jshint node: true */
'use strict';

var mbus = require('mbus');

// define some state mappings to simplify the events we generate
var stateMappings = {
  completed: 'connected'
};

// define the events that we need to watch for peer connection
// state changes
var peerStateEvents = [
  'signalingstatechange',
  'iceconnectionstatechange',
];

/**
  ### rtc-tools/monitor

  ```
  monitor(pc, targetId, signaller, parentBus) => mbus
  ```

  The monitor is a useful tool for determining the state of `pc` (an
  `RTCPeerConnection`) instance in the context of your application. The
  monitor uses both the `iceConnectionState` information of the peer
  connection and also the various
  [signaller events](https://github.com/rtc-io/rtc-signaller#signaller-events)
  to determine when the connection has been `connected` and when it has
  been `disconnected`.

  A monitor created `mbus` is returned as the result of a
  [couple](https://github.com/rtc-io/rtc#rtccouple) between a local peer
  connection and it's remote counterpart.

**/
module.exports = function(pc, targetId, signaller, parentBus) {
  var monitor = mbus('', parentBus);
  var state;

  function checkState() {
    var newState = getMappedState(pc.iceConnectionState);

    // flag the we had a state change
    monitor('statechange', pc, newState);

    // if the active state has changed, then send the appopriate message
    if (state !== newState) {
      monitor(newState);
      state = newState;
    }
  }

  function handleClose() {
    monitor('closed');
  }

  pc.onclose = handleClose;
  peerStateEvents.forEach(function(evtName) {
    pc['on' + evtName] = checkState;
  });

  monitor.stop = function() {
    pc.onclose = null;
    peerStateEvents.forEach(function(evtName) {
      pc['on' + evtName] = null;
    });
  };

  monitor.checkState = checkState;

  // if we haven't been provided a valid peer connection, abort
  if (! pc) {
    return monitor;
  }

  // determine the initial is active state
  state = getMappedState(pc.iceConnectionState);

  return monitor;
};

/* internal helpers */

function getMappedState(state) {
  return stateMappings[state] || state;
}

},{"mbus":58}],58:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"dup":21}],59:[function(require,module,exports){
var detect = require('rtc-core/detect');
var findPlugin = require('rtc-core/plugin');
var PriorityQueue = require('priorityqueuejs');
var pluck = require('whisk/pluck');
var pluckSessionDesc = pluck('sdp', 'type');

// some validation routines
var checkCandidate = require('rtc-validator/candidate');

// the sdp cleaner
var sdpclean = require('rtc-sdpclean');
var parseSdp = require('rtc-sdp');

var PRIORITY_LOW = 100;
var PRIORITY_WAIT = 1000;

// priority order (lower is better)
var DEFAULT_PRIORITIES = [
  'candidate',
  'setLocalDescription',
  'setRemoteDescription',
  'createAnswer',
  'createOffer'
];

// define event mappings
var METHOD_EVENTS = {
  setLocalDescription: 'setlocaldesc',
  setRemoteDescription: 'setremotedesc',
  createOffer: 'offer',
  createAnswer: 'answer'
};

var MEDIA_MAPPINGS = {
  data: 'application'
};

// define states in which we will attempt to finalize a connection on receiving a remote offer
var VALID_RESPONSE_STATES = ['have-remote-offer', 'have-local-pranswer'];

/**
  # rtc-taskqueue

  This is a package that assists with applying actions to an `RTCPeerConnection`
  in as reliable order as possible. It is primarily used by the coupling logic
  of the [`rtc-tools`](https://github.com/rtc-io/rtc-tools).

  ## Example Usage

  For the moment, refer to the simple coupling test as an example of how to use
  this package (see below):

  <<< test/couple.js

**/
module.exports = function(pc, opts) {
  // create the task queue
  var queue = new PriorityQueue(orderTasks);
  var tq = require('mbus')('', (opts || {}).logger);

  // initialise task importance
  var priorities = (opts || {}).priorities || DEFAULT_PRIORITIES;

  // check for plugin usage
  var plugin = findPlugin((opts || {}).plugins);

  // initialise state tracking
  var checkQueueTimer = 0;
  var currentTask;
  var defaultFail = tq.bind(tq, 'fail');

  // look for an sdpfilter function (allow slight mis-spellings)
  var sdpFilter = (opts || {}).sdpfilter || (opts || {}).sdpFilter;

  // initialise session description and icecandidate objects
  var RTCSessionDescription = (opts || {}).RTCSessionDescription ||
    detect('RTCSessionDescription');

  var RTCIceCandidate = (opts || {}).RTCIceCandidate ||
    detect('RTCIceCandidate');

  function abortQueue(err) {
    console.error(err);
  }

  function applyCandidate(task, next) {
    var data = task.args[0];
    var candidate = data && data.candidate && createIceCandidate(data);

    function handleOk() {
      tq('ice.remote.applied', candidate);
      next();
    }

    function handleFail(err) {
      tq('ice.remote.invalid', candidate);
      next(err);
    }

    // we have a null candidate, we have finished gathering candidates
    if (! candidate) {
      return next();
    }

    pc.addIceCandidate(candidate, handleOk, handleFail);
  }

  function checkQueue() {
    // peek at the next item on the queue
    var next = (! queue.isEmpty()) && (! currentTask) && queue.peek();
    var ready = next && testReady(next);
    var retry = (! queue.isEmpty()) && isNotClosed(pc);

    // reset the queue timer
    checkQueueTimer = 0;

    // if we don't have a task ready, then abort
    if (! ready) {
      return retry && triggerQueueCheck();
    }

    // update the current task (dequeue)
    currentTask = queue.deq();

    // process the task
    currentTask.fn(currentTask, function(err) {
      var fail = currentTask.fail || defaultFail;
      var pass = currentTask.pass;
      var taskName = currentTask.name;

      // if errored, fail
      if (err) {
        console.error(taskName + ' task failed: ', err);
        return fail(err);
      }

      if (typeof pass == 'function') {
        pass.apply(currentTask, [].slice.call(arguments, 1));
      }

      setTimeout(function() {
        currentTask = null;
        triggerQueueCheck();
      }, 0);
    });
  }

  function cleansdp(desc) {
    // ensure we have clean sdp
    var sdpErrors = [];
    var sdp = desc && sdpclean(desc.sdp, { collector: sdpErrors });

    // if we don't have a match, log some info
    if (desc && sdp !== desc.sdp) {
      console.info('invalid lines removed from sdp: ', sdpErrors);
      desc.sdp = sdp;
    }

    // if a filter has been specified, then apply the filter
    if (typeof sdpFilter == 'function') {
      desc.sdp = sdpFilter(desc.sdp, pc);
    }

    return desc;
  }

  function completeConnection() {
    if (VALID_RESPONSE_STATES.indexOf(pc.signalingState) >= 0) {
      return tq.createAnswer();
    }
  }

  function createIceCandidate(data) {
    if (plugin && typeof plugin.createIceCandidate == 'function') {
      return plugin.createIceCandidate(data);
    }

    return new RTCIceCandidate(data);
  }

  function createSessionDescription(data) {
    if (plugin && typeof plugin.createSessionDescription == 'function') {
      return plugin.createSessionDescription(data);
    }

    return new RTCSessionDescription(data);
  }

  function emitSdp() {
    tq('sdp.local', pluckSessionDesc(this.args[0]));
  }

  function enqueue(name, handler, opts) {
    return function() {
      var args = [].slice.call(arguments);

      if (opts && typeof opts.processArgs == 'function') {
        args = args.map(opts.processArgs);
      }

      queue.enq({
        args: args,
        name: name,
        fn: handler,

        // initilaise any checks that need to be done prior
        // to the task executing
        checks: [ isNotClosed ].concat((opts || {}).checks || []),

        // initialise the pass and fail handlers
        pass: (opts || {}).pass,
        fail: (opts || {}).fail
      });

      triggerQueueCheck();
    };
  }

  function execMethod(task, next) {
    var fn = pc[task.name];
    var eventName = METHOD_EVENTS[task.name] || (task.name || '').toLowerCase();
    var cbArgs = [ success, fail ];
    var isOffer = task.name === 'createOffer';

    function fail(err) {
      tq.apply(tq, [ 'negotiate.error', task.name, err ].concat(task.args));
      next(err);
    }

    function success() {
      tq.apply(tq, [ ['negotiate', eventName, 'ok'], task.name ].concat(task.args));
      next.apply(null, [null].concat([].slice.call(arguments)));
    }

    if (! fn) {
      return next(new Error('cannot call "' + task.name + '" on RTCPeerConnection'));
    }

    // invoke the function
    tq.apply(tq, ['negotiate.' + eventName].concat(task.args));
    fn.apply(
      pc,
      task.args.concat(cbArgs).concat(isOffer ? generateConstraints() : [])
    );
  }

  function extractCandidateEventData(data) {
    // extract nested candidate data (like we will see in an event being passed to this function)
    while (data && data.candidate && data.candidate.candidate) {
      data = data.candidate;
    }

    return data;
  }

  function generateConstraints() {
    var allowedKeys = {
      offertoreceivevideo: 'OfferToReceiveVideo',
      offertoreceiveaudio: 'OfferToReceiveAudio',
      icerestart: 'IceRestart',
      voiceactivitydetection: 'VoiceActivityDetection'
    };

    var constraints = {
      OfferToReceiveVideo: true,
      OfferToReceiveAudio: true
    };

    // update known keys to match
    Object.keys(opts || {}).forEach(function(key) {
      if (allowedKeys[key.toLowerCase()]) {
        constraints[allowedKeys[key.toLowerCase()]] = opts[key];
      }
    });

    return { mandatory: constraints };
  }

  function hasLocalOrRemoteDesc(pc, task) {
    return pc.__hasDesc || (pc.__hasDesc = !!pc.remoteDescription);
  }

  function isNotNegotiating(pc) {
    return pc.signalingState !== 'have-local-offer';
  }

  function isNotClosed(pc) {
    return pc.signalingState !== 'closed';
  }

  function isStable(pc) {
    return pc.signalingState === 'stable';
  }

  function isValidCandidate(pc, data) {
    return data.__valid ||
      (data.__valid = checkCandidate(data.args[0]).length === 0);
  }

  function isConnReadyForCandidate(pc, data) {
    var sdp = parseSdp(pc.remoteDescription && pc.remoteDescription.sdp);
    var mediaTypes = sdp.getMediaTypes();
    var sdpMid = data.args[0] && data.args[0].sdpMid;

    // remap media types as appropriate
    sdpMid = MEDIA_MAPPINGS[sdpMid] || sdpMid;

    // the candidate is valid if we know about the media type
    return (sdpMid === '') || mediaTypes.indexOf(sdpMid) >= 0;
  }

  function orderTasks(a, b) {
    // apply each of the checks for each task
    var tasks = [a,b];
    var readiness = tasks.map(testReady);
    var taskPriorities = tasks.map(function(task, idx) {
      var ready = readiness[idx];
      var priority = ready && priorities.indexOf(task.name);

      return ready ? (priority >= 0 ? priority : PRIORITY_LOW) : PRIORITY_WAIT;
    });

    return taskPriorities[1] - taskPriorities[0];
  }

  // check whether a task is ready (does it pass all the checks)
  function testReady(task) {
    return (task.checks || []).reduce(function(memo, check) {
      return memo && check(pc, task);
    }, true);
  }

  function triggerQueueCheck() {
    if (checkQueueTimer) return;
    checkQueueTimer = setTimeout(checkQueue, 50);
  }

  // patch in the queue helper methods
  tq.addIceCandidate = enqueue('addIceCandidate', applyCandidate, {
    processArgs: extractCandidateEventData,
    checks: [hasLocalOrRemoteDesc, isValidCandidate, isConnReadyForCandidate ]
  });

  tq.setLocalDescription = enqueue('setLocalDescription', execMethod, {
    processArgs: cleansdp,
    pass: emitSdp
  });

  tq.setRemoteDescription = enqueue('setRemoteDescription', execMethod, {
    processArgs: createSessionDescription,
    pass: completeConnection
  });

  tq.createOffer = enqueue('createOffer', execMethod, {
    checks: [ isNotNegotiating ],
    pass: tq.setLocalDescription
  });

  tq.createAnswer = enqueue('createAnswer', execMethod, {
    pass: tq.setLocalDescription
  });

  return tq;
};

},{"mbus":58,"priorityqueuejs":60,"rtc-core/detect":10,"rtc-core/plugin":13,"rtc-sdp":61,"rtc-sdpclean":63,"rtc-validator/candidate":64,"whisk/pluck":69}],60:[function(require,module,exports){
/**
 * Expose `PriorityQueue`.
 */
module.exports = PriorityQueue;

/**
 * Initializes a new empty `PriorityQueue` with the given `comparator(a, b)`
 * function, uses `.DEFAULT_COMPARATOR()` when no function is provided.
 *
 * The comparator function must return a positive number when `a > b`, 0 when
 * `a == b` and a negative number when `a < b`.
 *
 * @param {Function}
 * @return {PriorityQueue}
 * @api public
 */
function PriorityQueue(comparator) {
  this._comparator = comparator || PriorityQueue.DEFAULT_COMPARATOR;
  this._elements = [];
}

/**
 * Compares `a` and `b`, when `a > b` it returns a positive number, when
 * it returns 0 and when `a < b` it returns a negative number.
 *
 * @param {String|Number} a
 * @param {String|Number} b
 * @return {Number}
 * @api public
 */
PriorityQueue.DEFAULT_COMPARATOR = function(a, b) {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  } else {
    a = a.toString();
    b = b.toString();

    if (a == b) return 0;

    return (a > b) ? 1 : -1;
  }
};

/**
 * Returns whether the priority queue is empty or not.
 *
 * @return {Boolean}
 * @api public
 */
PriorityQueue.prototype.isEmpty = function() {
  return this.size() === 0;
};

/**
 * Peeks at the top element of the priority queue.
 *
 * @return {Object}
 * @throws {Error} when the queue is empty.
 * @api public
 */
PriorityQueue.prototype.peek = function() {
  if (this.isEmpty()) throw new Error('PriorityQueue is empty');

  return this._elements[0];
};

/**
 * Dequeues the top element of the priority queue.
 *
 * @return {Object}
 * @throws {Error} when the queue is empty.
 * @api public
 */
PriorityQueue.prototype.deq = function() {
  var first = this.peek();
  var last = this._elements.pop();
  var size = this.size();

  if (size === 0) return first;

  this._elements[0] = last;
  var current = 0;

  while (current < size) {
    var largest = current;
    var left = (2 * current) + 1;
    var right = (2 * current) + 2;

    if (left < size && this._compare(left, largest) >= 0) {
      largest = left;
    }

    if (right < size && this._compare(right, largest) >= 0) {
      largest = right;
    }

    if (largest === current) break;

    this._swap(largest, current);
    current = largest;
  }

  return first;
};

/**
 * Enqueues the `element` at the priority queue and returns its new size.
 *
 * @param {Object} element
 * @return {Number}
 * @api public
 */
PriorityQueue.prototype.enq = function(element) {
  var size = this._elements.push(element);
  var current = size - 1;

  while (current > 0) {
    var parent = Math.floor((current - 1) / 2);

    if (this._compare(current, parent) <= 0) break;

    this._swap(parent, current);
    current = parent;
  }

  return size;
};

/**
 * Returns the size of the priority queue.
 *
 * @return {Number}
 * @api public
 */
PriorityQueue.prototype.size = function() {
  return this._elements.length;
};

/**
 *  Iterates over queue elements
 *
 *  @param {Function} fn
 */
PriorityQueue.prototype.forEach = function(fn) {
  return this._elements.forEach(fn);
};

/**
 * Compares the values at position `a` and `b` in the priority queue using its
 * comparator function.
 *
 * @param {Number} a
 * @param {Number} b
 * @return {Number}
 * @api private
 */
PriorityQueue.prototype._compare = function(a, b) {
  return this._comparator(this._elements[a], this._elements[b]);
};

/**
 * Swaps the values at position `a` and `b` in the priority queue.
 *
 * @param {Number} a
 * @param {Number} b
 * @api private
 */
PriorityQueue.prototype._swap = function(a, b) {
  var aux = this._elements[a];
  this._elements[a] = this._elements[b];
  this._elements[b] = aux;
};

},{}],61:[function(require,module,exports){
/* jshint node: true */
'use strict';

var nub = require('whisk/nub');
var pluck = require('whisk/pluck');
var flatten = require('whisk/flatten');
var reLineBreak = /\r?\n/;
var reTrailingNewlines = /\r?\n$/;

// list sdp line types that are not "significant"
var nonHeaderLines = [ 'a', 'c', 'b', 'k' ];
var parsers = require('./parsers');

/**
  # rtc-sdp

  This is a utility module for intepreting and patching sdp.

  ## Usage

  The `rtc-sdp` main module exposes a single function that is capable of
  parsing lines of SDP, and providing an object allowing you to perform
  operations on those parsed lines:

  ```js
  var sdp = require('rtc-sdp')(lines);
  ```

  The currently supported operations are listed below:

**/
module.exports = function(sdp) {
  var ops = {};
  var parsed = [];
  var activeCollector;

  // initialise the lines
  var lines = sdp.split(reLineBreak).filter(Boolean).map(function(line) {
    return line.split('=');
  });

  var inputOrder = nub(lines.filter(function(line) {
    return line[0] && nonHeaderLines.indexOf(line[0]) < 0;
  }).map(pluck(0)));

  var findLine = ops.findLine = function(type, index) {
    var lineData = parsed.filter(function(line) {
      return line[0] === type;
    })[index || 0];

    return lineData && lineData[1];
  };

  // push into parsed sections
  lines.forEach(function(line) {
    var customParser = parsers[line[0]];

    if (customParser) {
      activeCollector = customParser(parsed, line);
    }
    else if (activeCollector) {
      activeCollector = activeCollector(line);
    }
    else {
      parsed.push(line);
    }
  });

  /**
    ### `sdp.addIceCandidate(data)`

    Modify the sdp to include candidates as denoted by the data.

**/
  ops.addIceCandidate = function(data) {
    var lineIndex = (data || {}).lineIndex || (data || {}).sdpMLineIndex;
    var mLine = typeof lineIndex != 'undefined' && findLine('m', lineIndex);
    var candidate = (data || {}).candidate;

    // if we have the mLine add the new candidate
    if (mLine && candidate) {
      mLine.childlines.push(candidate.replace(reTrailingNewlines, '').split('='));
    }
  };

  /**
    ### `sdp.getMediaTypes() => []`

    Retrieve the list of media types that have been defined in the sdp via
    `m=` lines.
  **/
  ops.getMediaTypes = function() {
    function getMediaType(data) {
      return data[1].def.split(/\s/)[0];
    }

    return parsed.filter(function(parts) {
      return parts[0] === 'm' && parts[1] && parts[1].def;
    }).map(getMediaType);
  };

  /**
    ### `sdp.toString()`

    Convert the SDP structure that is currently retained in memory, into a string
    that can be provided to a `setLocalDescription` (or `setRemoteDescription`)
    WebRTC call.

  **/
  ops.toString = function() {
    return parsed.map(function(line) {
      return typeof line[1].toArray == 'function' ? line[1].toArray() : [ line ];
    }).reduce(flatten).map(function(line) {
      return line.join('=');
    }).join('\n');
  };

  /**
    ## SDP Filtering / Munging Functions

    There are additional functions included in the module to assign with
    performing "single-shot" SDP filtering (or munging) operations:

  **/

  return ops;
};

},{"./parsers":62,"whisk/flatten":66,"whisk/nub":68,"whisk/pluck":69}],62:[function(require,module,exports){
/* jshint node: true */
'use strict';

exports.m = function(parsed, line) {
  var media = {
    def: line[1],
    childlines: [],

    toArray: function() {
      return [
        ['m', media.def ]
      ].concat(media.childlines);
    }
  };

  function addChildLine(childLine) {
    media.childlines.push(childLine);
    return addChildLine;
  }

  parsed.push([ 'm', media ]);

  return addChildLine;
};
},{}],63:[function(require,module,exports){
var validators = [
  [ /^(a\=candidate.*)$/, require('rtc-validator/candidate') ]
];

var reSdpLineBreak = /(\r?\n|\\r\\n)/;

/**
  # rtc-sdpclean

  Remove invalid lines from your SDP.

  ## Why?

  This module removes the occasional "bad egg" that will slip into SDP when it
  is generated by the browser.  In particular these situations are catered for:

  - invalid ICE candidates

**/
module.exports = function(input, opts) {
  var lineBreak = detectLineBreak(input);
  var lines = input.split(lineBreak);
  var collector = (opts || {}).collector;

  // filter out invalid lines
  lines = lines.filter(function(line) {
    // iterate through the validators and use the one that matches
    var validator = validators.reduce(function(memo, data, idx) {
      return typeof memo != 'undefined' ? memo : (data[0].exec(line) && {
        line: line.replace(data[0], '$1'),
        fn: data[1]
      });
    }, undefined);

    // if we have a validator, ensure we have no errors
    var errors = validator ? validator.fn(validator.line) : [];

    // if we have errors and an error collector, then add to the collector
    if (collector) {
      errors.forEach(function(err) {
        collector.push(err);
      });
    }

    return errors.length === 0;
  });

  return lines.join(lineBreak);
};

function detectLineBreak(input) {
  var match = reSdpLineBreak.exec(input);

  return match && match[0];
}

},{"rtc-validator/candidate":64}],64:[function(require,module,exports){
var debug = require('cog/logger')('rtc-validator');
var rePrefix = /^(?:a=)?candidate:/;
var reIP = /^((\d+\.){3}\d+|([a-fA-F0-9]+\:){7}[a-fA-F0-9]+)$/;

/*

validation rules as per:
http://tools.ietf.org/html/draft-ietf-mmusic-ice-sip-sdp-03#section-8.1

   candidate-attribute   = "candidate" ":" foundation SP component-id SP
                           transport SP
                           priority SP
                           connection-address SP     ;from RFC 4566
                           port         ;port from RFC 4566
                           SP cand-type
                           [SP rel-addr]
                           [SP rel-port]
                           *(SP extension-att-name SP
                                extension-att-value)

   foundation            = 1*32ice-char
   component-id          = 1*5DIGIT
   transport             = "UDP" / transport-extension
   transport-extension   = token              ; from RFC 3261
   priority              = 1*10DIGIT
   cand-type             = "typ" SP candidate-types
   candidate-types       = "host" / "srflx" / "prflx" / "relay" / token
   rel-addr              = "raddr" SP connection-address
   rel-port              = "rport" SP port
   extension-att-name    = token
   extension-att-value   = *VCHAR
   ice-char              = ALPHA / DIGIT / "+" / "/"
*/
var partValidation = [
  [ /.+/, 'invalid foundation component', 'foundation' ],
  [ /\d+/, 'invalid component id', 'component-id' ],
  [ /(UDP|TCP)/i, 'transport must be TCP or UDP', 'transport' ],
  [ /\d+/, 'numeric priority expected', 'priority' ],
  [ reIP, 'invalid connection address', 'connection-address' ],
  [ /\d+/, 'invalid connection port', 'connection-port' ],
  [ /typ/, 'Expected "typ" identifier', 'type classifier' ],
  [ /.+/, 'Invalid candidate type specified', 'candidate-type' ]
];

/**
  ### `rtc-validator/candidate`

  Validate that an `RTCIceCandidate` (or plain old object with data, sdpMid,
  etc attributes) is a valid ice candidate.

  Specs reviewed as part of the validation implementation:

  - <http://tools.ietf.org/html/draft-ietf-mmusic-ice-sip-sdp-03#section-8.1>
  - <http://tools.ietf.org/html/rfc5245>

**/
module.exports = function(data) {
  var errors = [];
  var candidate = data && (data.candidate || data);
  var prefixMatch = candidate && rePrefix.exec(candidate);
  var parts = prefixMatch && candidate.slice(prefixMatch[0].length).split(/\s/);

  if (! candidate) {
    return [ new Error('empty candidate') ];
  }

  // check that the prefix matches expected
  if (! prefixMatch) {
    return [ new Error('candidate did not match expected sdp line format') ];
  }

  // perform the part validation
  errors = errors.concat(parts.map(validateParts)).filter(Boolean);

  return errors;
};

function validateParts(part, idx) {
  var validator = partValidation[idx];

  if (validator && (! validator[0].test(part))) {
    debug(validator[2] + ' part failed validation: ' + part);
    return new Error(validator[1]);
  }
}

},{"cog/logger":7}],65:[function(require,module,exports){
module.exports = function(a, b) {
  return arguments.length > 1 ? a === b : function(b) {
    return a === b;
  };
};

},{}],66:[function(require,module,exports){
/**
  ## flatten

  Flatten an array using `[].reduce`

  <<< examples/flatten.js

**/

module.exports = function(a, b) {
  // if a is not already an array, make it one
  a = Array.isArray(a) ? a : [a];

  // concat b with a
  return a.concat(b);
};
},{}],67:[function(require,module,exports){
module.exports = function(comparator) {
  return function(input) {
    var output = [];
    for (var ii = 0, count = input.length; ii < count; ii++) {
      var found = false;
      for (var jj = output.length; jj--; ) {
        found = found || comparator(input[ii], output[jj]);
      }

      if (found) {
        continue;
      }

      output[output.length] = input[ii];
    }

    return output;
  };
}
},{}],68:[function(require,module,exports){
/**
  ## nub

  Return only the unique elements of the list.

  <<< examples/nub.js

**/

module.exports = require('./nub-by')(require('./equality'));
},{"./equality":65,"./nub-by":67}],69:[function(require,module,exports){
/**
  ## pluck

  Extract targeted properties from a source object. When a single property
  value is requested, then just that value is returned.

  In the case where multiple properties are requested (in a varargs calling
  style) a new object will be created with the requested properties copied
  across.

  __NOTE:__ In the second form extraction of nested properties is
  not supported.

  <<< examples/pluck.js

**/
module.exports = function() {
  var fields = [];

  function extractor(parts, maxIdx) {
    return function(item) {
      var partIdx = 0;
      var val = item;

      do {
        val = val && val[parts[partIdx++]];
      } while (val && partIdx <= maxIdx);

      return val;
    };
  }

  [].slice.call(arguments).forEach(function(path) {
    var parts = typeof path == 'number' ? [ path ] : (path || '').split('.');

    fields[fields.length] = {
      name: parts[0],
      parts: parts,
      maxIdx: parts.length - 1
    };
  });

  if (fields.length <= 1) {
    return extractor(fields[0].parts, fields[0].maxIdx);
  }
  else {
    return function(item) {
      var data = {};

      for (var ii = 0, len = fields.length; ii < len; ii++) {
        data[fields[ii].name] = extractor([fields[ii].parts[0]], 0)(item);
      }

      return data;
    };
  }
};
},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5udm0vdmVyc2lvbnMvbm9kZS92MC4xMi4xL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiLi4vLi4vLi4vLm52bS92ZXJzaW9ucy9ub2RlL3YwLjEyLjEvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJjb2RlL3F1aWNrY29ubmVjdC12aWRlb2NvbmZlcmVuY2luZy5qcyIsIm5vZGVfbW9kdWxlcy9jb2cvZGVmYXVsdHMuanMiLCJub2RlX21vZHVsZXMvY29nL2V4dGVuZC5qcyIsIm5vZGVfbW9kdWxlcy9jb2cvZ2V0YWJsZS5qcyIsIm5vZGVfbW9kdWxlcy9jb2cvanNvbnBhcnNlLmpzIiwibm9kZV9tb2R1bGVzL2NvZy9sb2dnZXIuanMiLCJub2RlX21vZHVsZXMvY29nL3Rocm90dGxlLmpzIiwibm9kZV9tb2R1bGVzL2NyZWwvY3JlbC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtY29yZS9kZXRlY3QuanMiLCJub2RlX21vZHVsZXMvcnRjLWNvcmUvZ2VuaWNlLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1jb3JlL25vZGVfbW9kdWxlcy9kZXRlY3QtYnJvd3Nlci9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1jb3JlL3BsdWdpbi5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtbWVkaWEvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLW1lZGlhL25vZGVfbW9kdWxlcy9ydGMtYXR0YWNoL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1tZWRpYS9ub2RlX21vZHVsZXMvcnRjLWNhcHR1cmUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L2xpYi9jYWxscy5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L2xpYi9nZXRwZWVyZGF0YS5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L2xpYi9oZWFydGJlYXQuanMiLCJub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvbWJ1cy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtcGx1Z2dhYmxlLXNpZ25hbGxlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtcGx1Z2dhYmxlLXNpZ25hbGxlci9ub2RlX21vZHVsZXMvcnRjLXN3aXRjaGJvYXJkLW1lc3Nlbmdlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtcGx1Z2dhYmxlLXNpZ25hbGxlci9ub2RlX21vZHVsZXMvcnRjLXN3aXRjaGJvYXJkLW1lc3Nlbmdlci9ub2RlX21vZHVsZXMvbWVzc2VuZ2VyLXdzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy1wbHVnZ2FibGUtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9ydGMtc3dpdGNoYm9hcmQtbWVzc2VuZ2VyL25vZGVfbW9kdWxlcy9tZXNzZW5nZXItd3Mvbm9kZV9tb2R1bGVzL3B1bGwtd3MvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXBsdWdnYWJsZS1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL3J0Yy1zd2l0Y2hib2FyZC1tZXNzZW5nZXIvbm9kZV9tb2R1bGVzL21lc3Nlbmdlci13cy9ub2RlX21vZHVsZXMvcHVsbC13cy9ub2RlX21vZHVsZXMvcHVsbC1jb3JlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy1wbHVnZ2FibGUtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9ydGMtc3dpdGNoYm9hcmQtbWVzc2VuZ2VyL25vZGVfbW9kdWxlcy9tZXNzZW5nZXItd3Mvbm9kZV9tb2R1bGVzL3B1bGwtd3MvcmVhZHkuanMiLCJub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXBsdWdnYWJsZS1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL3J0Yy1zd2l0Y2hib2FyZC1tZXNzZW5nZXIvbm9kZV9tb2R1bGVzL21lc3Nlbmdlci13cy9ub2RlX21vZHVsZXMvcHVsbC13cy9zaW5rLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy1wbHVnZ2FibGUtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9ydGMtc3dpdGNoYm9hcmQtbWVzc2VuZ2VyL25vZGVfbW9kdWxlcy9tZXNzZW5nZXItd3Mvbm9kZV9tb2R1bGVzL3B1bGwtd3Mvc291cmNlLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy1wbHVnZ2FibGUtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9ydGMtc3dpdGNoYm9hcmQtbWVzc2VuZ2VyL25vZGVfbW9kdWxlcy9tZXNzZW5nZXItd3Mvbm9kZV9tb2R1bGVzL3dzL2xpYi9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy1wbHVnZ2FibGUtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9ydGMtc3dpdGNoYm9hcmQtbWVzc2VuZ2VyL25vZGVfbW9kdWxlcy9tZXNzZW5nZXItd3Mvbm9kZV9tb2R1bGVzL3dzdXJsL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvZGVmYXVsdHMuanMiLCJub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9oYW5kbGVycy9hbm5vdW5jZS5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL2hhbmRsZXJzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9ub2RlX21vZHVsZXMvY3VpZC9kaXN0L2Jyb3dzZXItY3VpZC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9wdWxsLXB1c2hhYmxlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL3B1bGwtcHVzaGFibGUvbm9kZV9tb2R1bGVzL3B1bGwtc3RyZWFtL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL3B1bGwtcHVzaGFibGUvbm9kZV9tb2R1bGVzL3B1bGwtc3RyZWFtL21heWJlLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL3B1bGwtcHVzaGFibGUvbm9kZV9tb2R1bGVzL3B1bGwtc3RyZWFtL25vZGVfbW9kdWxlcy9wdWxsLWNvcmUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9ub2RlX21vZHVsZXMvcHVsbC1wdXNoYWJsZS9ub2RlX21vZHVsZXMvcHVsbC1zdHJlYW0vc2lua3MuanMiLCJub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9ub2RlX21vZHVsZXMvcHVsbC1wdXNoYWJsZS9ub2RlX21vZHVsZXMvcHVsbC1zdHJlYW0vc291cmNlcy5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9wdWxsLXB1c2hhYmxlL25vZGVfbW9kdWxlcy9wdWxsLXN0cmVhbS90aHJvdWdocy5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9wdWxsLXN0cmVhbS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9wdWxsLXN0cmVhbS9tYXliZS5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9wdWxsLXN0cmVhbS9zaW5rcy5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9wdWxsLXN0cmVhbS9zb3VyY2VzLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL3B1bGwtc3RyZWFtL3Rocm91Z2hzLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvcHJvY2Vzc29yLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy10b29scy9jbGVhbnVwLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy10b29scy9jb3VwbGUuanMiLCJub2RlX21vZHVsZXMvcnRjLXRvb2xzL2RldGVjdC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtdG9vbHMvZ2VuZXJhdG9ycy5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtdG9vbHMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLXRvb2xzL21vbml0b3IuanMiLCJub2RlX21vZHVsZXMvcnRjLXRvb2xzL25vZGVfbW9kdWxlcy9ydGMtdGFza3F1ZXVlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy10b29scy9ub2RlX21vZHVsZXMvcnRjLXRhc2txdWV1ZS9ub2RlX21vZHVsZXMvcHJpb3JpdHlxdWV1ZWpzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy10b29scy9ub2RlX21vZHVsZXMvcnRjLXRhc2txdWV1ZS9ub2RlX21vZHVsZXMvcnRjLXNkcC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtdG9vbHMvbm9kZV9tb2R1bGVzL3J0Yy10YXNrcXVldWUvbm9kZV9tb2R1bGVzL3J0Yy1zZHAvcGFyc2Vycy5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtdG9vbHMvbm9kZV9tb2R1bGVzL3J0Yy10YXNrcXVldWUvbm9kZV9tb2R1bGVzL3J0Yy1zZHBjbGVhbi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtdG9vbHMvbm9kZV9tb2R1bGVzL3J0Yy10YXNrcXVldWUvbm9kZV9tb2R1bGVzL3J0Yy12YWxpZGF0b3IvY2FuZGlkYXRlLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy10b29scy9ub2RlX21vZHVsZXMvd2hpc2svZXF1YWxpdHkuanMiLCJub2RlX21vZHVsZXMvcnRjLXRvb2xzL25vZGVfbW9kdWxlcy93aGlzay9mbGF0dGVuLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy10b29scy9ub2RlX21vZHVsZXMvd2hpc2svbnViLWJ5LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy10b29scy9ub2RlX21vZHVsZXMvd2hpc2svbnViLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy10b29scy9ub2RlX21vZHVsZXMvd2hpc2svcGx1Y2suanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUM1ckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDMUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN0SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3BTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUM1SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN2VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gdHJ1ZTtcbiAgICB2YXIgY3VycmVudFF1ZXVlO1xuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB2YXIgaSA9IC0xO1xuICAgICAgICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgICAgICAgICBjdXJyZW50UXVldWVbaV0oKTtcbiAgICAgICAgfVxuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG59XG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHF1ZXVlLnB1c2goZnVuKTtcbiAgICBpZiAoIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJ2YXIgcXVpY2tjb25uZWN0ID0gcmVxdWlyZSgncnRjLXF1aWNrY29ubmVjdCcpO1xudmFyIG1lZGlhID0gcmVxdWlyZSgncnRjLW1lZGlhJyk7XG52YXIgY3JlbCA9IHJlcXVpcmUoJ2NyZWwnKTtcblxuLy8gY3JlYXRlIGNvbnRhaW5lcnMgZm9yIG91ciBsb2NhbCBhbmQgcmVtb3RlIHZpZGVvXG52YXIgbG9jYWwgPSBjcmVsKCdkaXYnLCB7IGNsYXNzOiAnbG9jYWwnIH0pO1xudmFyIHJlbW90ZSA9IGNyZWwoJ2RpdicsIHsgY2xhc3M6ICdyZW1vdGUnIH0pO1xudmFyIG1lZGlhO1xudmFyIHBlZXJNZWRpYSA9IHt9O1xuXG4vLyBjYXB0dXJlIGxvY2FsIG1lZGlhXG52YXIgbG9jYWxNZWRpYSA9IG1lZGlhKCk7XG5cbi8vIG9uY2UgbWVkaWEgaXMgY2FwdHVyZWQsIGNvbm5lY3RcbmxvY2FsTWVkaWEub25jZSgnY2FwdHVyZScsIGZ1bmN0aW9uKHN0cmVhbSkge1xuICBxdWlja2Nvbm5lY3QoJ2h0dHA6Ly9ydGMuaW8vc3dpdGNoYm9hcmQvJywgeyByb29tOiAnY29uZnRlc3QnIH0pXG4gICAgLy8gYnJvYWRjYXN0IG91ciBjYXB0dXJlZCBtZWRpYSB0byBvdGhlciBwYXJ0aWNpcGFudHMgaW4gdGhlIHJvb21cbiAgICAuYWRkU3RyZWFtKHN0cmVhbSlcbiAgICAvLyB3aGVuIGEgcGVlciBpcyBjb25uZWN0ZWQgKGFuZCBhY3RpdmUpIHBhc3MgaXQgdG8gdXMgZm9yIHVzZVxuICAgIC5vbignY2FsbDpzdGFydGVkJywgZnVuY3Rpb24oaWQsIHBjLCBkYXRhKSB7XG4gICAgICBjb25zb2xlLmxvZygncGVlciBjb25uZWN0ZWQ6ICcsIGlkKTtcblxuICAgICAgLy8gcmVuZGVyIHRoZSByZW1vdGUgc3RyZWFtc1xuICAgICAgcGMuZ2V0UmVtb3RlU3RyZWFtcygpLmZvckVhY2gocmVuZGVyUmVtb3RlKGlkKSk7XG4gICAgfSlcbiAgICAvLyB3aGVuIGEgcGVlciBsZWF2ZXMsIHJlbW92ZSB0ZWggbWVkaWFcbiAgICAub24oJ2NhbGw6ZW5kZWQnLCBmdW5jdGlvbihpZCkge1xuICAgICAgLy8gcmVtb3ZlIG1lZGlhIGZvciB0aGUgdGFyZ2V0IHBlZXIgZnJvbSB0aGUgZG9tXG4gICAgICAocGVlck1lZGlhW2lkXSB8fCBbXSkuc3BsaWNlKDApLmZvckVhY2goZnVuY3Rpb24oZWwpIHtcbiAgICAgICAgZWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbCk7XG4gICAgICB9KTtcbiAgICB9KVxufSk7XG5cbi8vIHJlbmRlciB0aGUgbG9jYWwgbWVkaWFcbmxvY2FsTWVkaWEucmVuZGVyKGxvY2FsKTtcblxuLy8gcmVuZGVyIGEgcmVtb3RlIHZpZGVvXG5mdW5jdGlvbiByZW5kZXJSZW1vdGUoaWQpIHtcbiAgLy8gY3JlYXRlIHRoZSBwZWVyIG1lZGlhIGxpc3RcbiAgcGVlck1lZGlhW2lkXSA9IHBlZXJNZWRpYVtpZF0gfHwgW107XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgIHBlZXJNZWRpYVtpZF0gPSBwZWVyTWVkaWFbaWRdLmNvbmNhdChtZWRpYShzdHJlYW0pLnJlbmRlcihyZW1vdGUpKTtcbiAgfVxufVxuXG4vKiBleHRyYSBjb2RlIHRvIGhhbmRsZSBkeW5hbWljIGh0bWwgYW5kIGNzcyBjcmVhdGlvbiAqL1xuXG4vLyBhZGQgc29tZSBiYXNpYyBzdHlsaW5nXG5kb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKGNyZWwoJ3N0eWxlJywgW1xuICAnLmxvY2FsIHsgcG9zaXRpb246IGFic29sdXRlOyAgcmlnaHQ6IDEwcHg7IH0nLFxuICAnLmxvY2FsIHZpZGVvIHsgbWF4LXdpZHRoOiAyMDBweDsgfSdcbl0uam9pbignXFxuJykpKTtcblxuLy8gYWRkIHRoZSBsb2NhbCBhbmQgcmVtb3RlIGVsZW1lbnRzXG5kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGxvY2FsKTtcbmRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQocmVtb3RlKTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuIyMgY29nL2RlZmF1bHRzXG5cbmBgYGpzXG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCdjb2cvZGVmYXVsdHMnKTtcbmBgYFxuXG4jIyMgZGVmYXVsdHModGFyZ2V0LCAqKVxuXG5TaGFsbG93IGNvcHkgb2JqZWN0IHByb3BlcnRpZXMgZnJvbSB0aGUgc3VwcGxpZWQgc291cmNlIG9iamVjdHMgKCopIGludG9cbnRoZSB0YXJnZXQgb2JqZWN0LCByZXR1cm5pbmcgdGhlIHRhcmdldCBvYmplY3Qgb25jZSBjb21wbGV0ZWQuICBEbyBub3QsXG5ob3dldmVyLCBvdmVyd3JpdGUgZXhpc3Rpbmcga2V5cyB3aXRoIG5ldyB2YWx1ZXM6XG5cbmBgYGpzXG5kZWZhdWx0cyh7IGE6IDEsIGI6IDIgfSwgeyBjOiAzIH0sIHsgZDogNCB9LCB7IGI6IDUgfSkpO1xuYGBgXG5cblNlZSBhbiBleGFtcGxlIG9uIFtyZXF1aXJlYmluXShodHRwOi8vcmVxdWlyZWJpbi5jb20vP2dpc3Q9NjA3OTQ3NSkuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIGEgdGFyZ2V0XG4gIHRhcmdldCA9IHRhcmdldCB8fCB7fTtcblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHNvdXJjZXMgYW5kIGNvcHkgdG8gdGhlIHRhcmdldFxuICBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkuZm9yRWFjaChmdW5jdGlvbihzb3VyY2UpIHtcbiAgICBpZiAoISBzb3VyY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgaWYgKHRhcmdldFtwcm9wXSA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiB0YXJnZXQ7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuIyMgY29nL2V4dGVuZFxuXG5gYGBqc1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcbmBgYFxuXG4jIyMgZXh0ZW5kKHRhcmdldCwgKilcblxuU2hhbGxvdyBjb3B5IG9iamVjdCBwcm9wZXJ0aWVzIGZyb20gdGhlIHN1cHBsaWVkIHNvdXJjZSBvYmplY3RzICgqKSBpbnRvXG50aGUgdGFyZ2V0IG9iamVjdCwgcmV0dXJuaW5nIHRoZSB0YXJnZXQgb2JqZWN0IG9uY2UgY29tcGxldGVkOlxuXG5gYGBqc1xuZXh0ZW5kKHsgYTogMSwgYjogMiB9LCB7IGM6IDMgfSwgeyBkOiA0IH0sIHsgYjogNSB9KSk7XG5gYGBcblxuU2VlIGFuIGV4YW1wbGUgb24gW3JlcXVpcmViaW5dKGh0dHA6Ly9yZXF1aXJlYmluLmNvbS8/Z2lzdD02MDc5NDc1KS5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0YXJnZXQpIHtcbiAgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLmZvckVhY2goZnVuY3Rpb24oc291cmNlKSB7XG4gICAgaWYgKCEgc291cmNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiB0YXJnZXQ7XG59OyIsIi8qKlxuICAjIyBjb2cvZ2V0YWJsZVxuXG4gIFRha2UgYW4gb2JqZWN0IGFuZCBwcm92aWRlIGEgd3JhcHBlciB0aGF0IGFsbG93cyB5b3UgdG8gYGdldGAgYW5kXG4gIGBzZXRgIHZhbHVlcyBvbiB0aGF0IG9iamVjdC5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICBmdW5jdGlvbiBnZXQoa2V5KSB7XG4gICAgcmV0dXJuIHRhcmdldFtrZXldO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0KGtleSwgdmFsdWUpIHtcbiAgICB0YXJnZXRba2V5XSA9IHZhbHVlO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlKGtleSkge1xuICAgIHJldHVybiBkZWxldGUgdGFyZ2V0W2tleV07XG4gIH1cblxuICBmdW5jdGlvbiBrZXlzKCkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh0YXJnZXQpO1xuICB9O1xuXG4gIGZ1bmN0aW9uIHZhbHVlcygpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXModGFyZ2V0KS5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gdGFyZ2V0W2tleV07XG4gICAgfSk7XG4gIH07XG5cbiAgaWYgKHR5cGVvZiB0YXJnZXQgIT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBnZXQ6IGdldCxcbiAgICBzZXQ6IHNldCxcbiAgICByZW1vdmU6IHJlbW92ZSxcbiAgICBkZWxldGU6IHJlbW92ZSxcbiAgICBrZXlzOiBrZXlzLFxuICAgIHZhbHVlczogdmFsdWVzXG4gIH07XG59O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMjIGNvZy9qc29ucGFyc2VcblxuICBgYGBqc1xuICB2YXIganNvbnBhcnNlID0gcmVxdWlyZSgnY29nL2pzb25wYXJzZScpO1xuICBgYGBcblxuICAjIyMganNvbnBhcnNlKGlucHV0KVxuXG4gIFRoaXMgZnVuY3Rpb24gd2lsbCBhdHRlbXB0IHRvIGF1dG9tYXRpY2FsbHkgZGV0ZWN0IHN0cmluZ2lmaWVkIEpTT04sIGFuZFxuICB3aGVuIGRldGVjdGVkIHdpbGwgcGFyc2UgaW50byBKU09OIG9iamVjdHMuICBUaGUgZnVuY3Rpb24gbG9va3MgZm9yIHN0cmluZ3NcbiAgdGhhdCBsb29rIGFuZCBzbWVsbCBsaWtlIHN0cmluZ2lmaWVkIEpTT04sIGFuZCBpZiBmb3VuZCBhdHRlbXB0cyB0b1xuICBgSlNPTi5wYXJzZWAgdGhlIGlucHV0IGludG8gYSB2YWxpZCBvYmplY3QuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpbnB1dCkge1xuICB2YXIgaXNTdHJpbmcgPSB0eXBlb2YgaW5wdXQgPT0gJ3N0cmluZycgfHwgKGlucHV0IGluc3RhbmNlb2YgU3RyaW5nKTtcbiAgdmFyIHJlTnVtZXJpYyA9IC9eXFwtP1xcZCtcXC4/XFxkKiQvO1xuICB2YXIgc2hvdWxkUGFyc2UgO1xuICB2YXIgZmlyc3RDaGFyO1xuICB2YXIgbGFzdENoYXI7XG5cbiAgaWYgKCghIGlzU3RyaW5nKSB8fCBpbnB1dC5sZW5ndGggPCAyKSB7XG4gICAgaWYgKGlzU3RyaW5nICYmIHJlTnVtZXJpYy50ZXN0KGlucHV0KSkge1xuICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoaW5wdXQpO1xuICAgIH1cblxuICAgIHJldHVybiBpbnB1dDtcbiAgfVxuXG4gIC8vIGNoZWNrIGZvciB0cnVlIG9yIGZhbHNlXG4gIGlmIChpbnB1dCA9PT0gJ3RydWUnIHx8IGlucHV0ID09PSAnZmFsc2UnKSB7XG4gICAgcmV0dXJuIGlucHV0ID09PSAndHJ1ZSc7XG4gIH1cblxuICAvLyBjaGVjayBmb3IgbnVsbFxuICBpZiAoaW5wdXQgPT09ICdudWxsJykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gZ2V0IHRoZSBmaXJzdCBhbmQgbGFzdCBjaGFyYWN0ZXJzXG4gIGZpcnN0Q2hhciA9IGlucHV0LmNoYXJBdCgwKTtcbiAgbGFzdENoYXIgPSBpbnB1dC5jaGFyQXQoaW5wdXQubGVuZ3RoIC0gMSk7XG5cbiAgLy8gZGV0ZXJtaW5lIHdoZXRoZXIgd2Ugc2hvdWxkIEpTT04ucGFyc2UgdGhlIGlucHV0XG4gIHNob3VsZFBhcnNlID1cbiAgICAoZmlyc3RDaGFyID09ICd7JyAmJiBsYXN0Q2hhciA9PSAnfScpIHx8XG4gICAgKGZpcnN0Q2hhciA9PSAnWycgJiYgbGFzdENoYXIgPT0gJ10nKSB8fFxuICAgIChmaXJzdENoYXIgPT0gJ1wiJyAmJiBsYXN0Q2hhciA9PSAnXCInKTtcblxuICBpZiAoc2hvdWxkUGFyc2UpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIEpTT04ucGFyc2UoaW5wdXQpO1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgLy8gYXBwYXJlbnRseSBpdCB3YXNuJ3QgdmFsaWQganNvbiwgY2Fycnkgb24gd2l0aCByZWd1bGFyIHByb2Nlc3NpbmdcbiAgICB9XG4gIH1cblxuXG4gIHJldHVybiByZU51bWVyaWMudGVzdChpbnB1dCkgPyBwYXJzZUZsb2F0KGlucHV0KSA6IGlucHV0O1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyMgY29nL2xvZ2dlclxuXG4gIGBgYGpzXG4gIHZhciBsb2dnZXIgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJyk7XG4gIGBgYFxuXG4gIFNpbXBsZSBicm93c2VyIGxvZ2dpbmcgb2ZmZXJpbmcgc2ltaWxhciBmdW5jdGlvbmFsaXR5IHRvIHRoZVxuICBbZGVidWddKGh0dHBzOi8vZ2l0aHViLmNvbS92aXNpb25tZWRpYS9kZWJ1ZykgbW9kdWxlLlxuXG4gICMjIyBVc2FnZVxuXG4gIENyZWF0ZSB5b3VyIHNlbGYgYSBuZXcgbG9nZ2luZyBpbnN0YW5jZSBhbmQgZ2l2ZSBpdCBhIG5hbWU6XG5cbiAgYGBganNcbiAgdmFyIGRlYnVnID0gbG9nZ2VyKCdwaGlsJyk7XG4gIGBgYFxuXG4gIE5vdyBkbyBzb21lIGRlYnVnZ2luZzpcblxuICBgYGBqc1xuICBkZWJ1ZygnaGVsbG8nKTtcbiAgYGBgXG5cbiAgQXQgdGhpcyBzdGFnZSwgbm8gbG9nIG91dHB1dCB3aWxsIGJlIGdlbmVyYXRlZCBiZWNhdXNlIHlvdXIgbG9nZ2VyIGlzXG4gIGN1cnJlbnRseSBkaXNhYmxlZC4gIEVuYWJsZSBpdDpcblxuICBgYGBqc1xuICBsb2dnZXIuZW5hYmxlKCdwaGlsJyk7XG4gIGBgYFxuXG4gIE5vdyBkbyBzb21lIG1vcmUgbG9nZ2VyOlxuXG4gIGBgYGpzXG4gIGRlYnVnKCdPaCB0aGlzIGlzIHNvIG11Y2ggbmljZXIgOiknKTtcbiAgLy8gLS0+IHBoaWw6IE9oIHRoaXMgaXMgc29tZSBtdWNoIG5pY2VyIDopXG4gIGBgYFxuXG4gICMjIyBSZWZlcmVuY2VcbioqL1xuXG52YXIgYWN0aXZlID0gW107XG52YXIgdW5sZWFzaExpc3RlbmVycyA9IFtdO1xudmFyIHRhcmdldHMgPSBbIGNvbnNvbGUgXTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyKG5hbWUpXG5cbiAgQ3JlYXRlIGEgbmV3IGxvZ2dpbmcgaW5zdGFuY2UuXG4qKi9cbnZhciBsb2dnZXIgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgLy8gaW5pdGlhbCBlbmFibGVkIGNoZWNrXG4gIHZhciBlbmFibGVkID0gY2hlY2tBY3RpdmUoKTtcblxuICBmdW5jdGlvbiBjaGVja0FjdGl2ZSgpIHtcbiAgICByZXR1cm4gZW5hYmxlZCA9IGFjdGl2ZS5pbmRleE9mKCcqJykgPj0gMCB8fCBhY3RpdmUuaW5kZXhPZihuYW1lKSA+PSAwO1xuICB9XG5cbiAgLy8gcmVnaXN0ZXIgdGhlIGNoZWNrIGFjdGl2ZSB3aXRoIHRoZSBsaXN0ZW5lcnMgYXJyYXlcbiAgdW5sZWFzaExpc3RlbmVyc1t1bmxlYXNoTGlzdGVuZXJzLmxlbmd0aF0gPSBjaGVja0FjdGl2ZTtcblxuICAvLyByZXR1cm4gdGhlIGFjdHVhbCBsb2dnaW5nIGZ1bmN0aW9uXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYSBzdHJpbmcgbWVzc2FnZVxuICAgIGlmICh0eXBlb2YgYXJnc1swXSA9PSAnc3RyaW5nJyB8fCAoYXJnc1swXSBpbnN0YW5jZW9mIFN0cmluZykpIHtcbiAgICAgIGFyZ3NbMF0gPSBuYW1lICsgJzogJyArIGFyZ3NbMF07XG4gICAgfVxuXG4gICAgLy8gaWYgbm90IGVuYWJsZWQsIGJhaWxcbiAgICBpZiAoISBlbmFibGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gbG9nXG4gICAgdGFyZ2V0cy5mb3JFYWNoKGZ1bmN0aW9uKHRhcmdldCkge1xuICAgICAgdGFyZ2V0LmxvZy5hcHBseSh0YXJnZXQsIGFyZ3MpO1xuICAgIH0pO1xuICB9O1xufTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyLnJlc2V0KClcblxuICBSZXNldCBsb2dnaW5nIChyZW1vdmUgdGhlIGRlZmF1bHQgY29uc29sZSBsb2dnZXIsIGZsYWcgYWxsIGxvZ2dlcnMgYXNcbiAgaW5hY3RpdmUsIGV0YywgZXRjLlxuKiovXG5sb2dnZXIucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgLy8gcmVzZXQgdGFyZ2V0cyBhbmQgYWN0aXZlIHN0YXRlc1xuICB0YXJnZXRzID0gW107XG4gIGFjdGl2ZSA9IFtdO1xuXG4gIHJldHVybiBsb2dnZXIuZW5hYmxlKCk7XG59O1xuXG4vKipcbiAgIyMjIyBsb2dnZXIudG8odGFyZ2V0KVxuXG4gIEFkZCBhIGxvZ2dpbmcgdGFyZ2V0LiAgVGhlIGxvZ2dlciBtdXN0IGhhdmUgYSBgbG9nYCBtZXRob2QgYXR0YWNoZWQuXG5cbioqL1xubG9nZ2VyLnRvID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gIHRhcmdldHMgPSB0YXJnZXRzLmNvbmNhdCh0YXJnZXQgfHwgW10pO1xuXG4gIHJldHVybiBsb2dnZXI7XG59O1xuXG4vKipcbiAgIyMjIyBsb2dnZXIuZW5hYmxlKG5hbWVzKilcblxuICBFbmFibGUgbG9nZ2luZyB2aWEgdGhlIG5hbWVkIGxvZ2dpbmcgaW5zdGFuY2VzLiAgVG8gZW5hYmxlIGxvZ2dpbmcgdmlhIGFsbFxuICBpbnN0YW5jZXMsIHlvdSBjYW4gcGFzcyBhIHdpbGRjYXJkOlxuXG4gIGBgYGpzXG4gIGxvZ2dlci5lbmFibGUoJyonKTtcbiAgYGBgXG5cbiAgX19UT0RPOl9fIHdpbGRjYXJkIGVuYWJsZXJzXG4qKi9cbmxvZ2dlci5lbmFibGUgPSBmdW5jdGlvbigpIHtcbiAgLy8gdXBkYXRlIHRoZSBhY3RpdmVcbiAgYWN0aXZlID0gYWN0aXZlLmNvbmNhdChbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuXG4gIC8vIHRyaWdnZXIgdGhlIHVubGVhc2ggbGlzdGVuZXJzXG4gIHVubGVhc2hMaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbihsaXN0ZW5lcikge1xuICAgIGxpc3RlbmVyKCk7XG4gIH0pO1xuXG4gIHJldHVybiBsb2dnZXI7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIyBjb2cvdGhyb3R0bGVcblxuICBgYGBqc1xuICB2YXIgdGhyb3R0bGUgPSByZXF1aXJlKCdjb2cvdGhyb3R0bGUnKTtcbiAgYGBgXG5cbiAgIyMjIHRocm90dGxlKGZuLCBkZWxheSwgb3B0cylcblxuICBBIGNoZXJyeS1waWNrYWJsZSB0aHJvdHRsZSBmdW5jdGlvbi4gIFVzZWQgdG8gdGhyb3R0bGUgYGZuYCB0byBlbnN1cmVcbiAgdGhhdCBpdCBjYW4gYmUgY2FsbGVkIGF0IG1vc3Qgb25jZSBldmVyeSBgZGVsYXlgIG1pbGxpc2Vjb25kcy4gIFdpbGxcbiAgZmlyZSBmaXJzdCBldmVudCBpbW1lZGlhdGVseSwgZW5zdXJpbmcgdGhlIG5leHQgZXZlbnQgZmlyZWQgd2lsbCBvY2N1clxuICBhdCBsZWFzdCBgZGVsYXlgIG1pbGxpc2Vjb25kcyBhZnRlciB0aGUgZmlyc3QsIGFuZCBzbyBvbi5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZuLCBkZWxheSwgb3B0cykge1xuICB2YXIgbGFzdEV4ZWMgPSAob3B0cyB8fCB7fSkubGVhZGluZyAhPT0gZmFsc2UgPyAwIDogRGF0ZS5ub3coKTtcbiAgdmFyIHRyYWlsaW5nID0gKG9wdHMgfHwge30pLnRyYWlsaW5nO1xuICB2YXIgdGltZXI7XG4gIHZhciBxdWV1ZWRBcmdzO1xuICB2YXIgcXVldWVkU2NvcGU7XG5cbiAgLy8gdHJhaWxpbmcgZGVmYXVsdHMgdG8gdHJ1ZVxuICB0cmFpbGluZyA9IHRyYWlsaW5nIHx8IHRyYWlsaW5nID09PSB1bmRlZmluZWQ7XG4gIFxuICBmdW5jdGlvbiBpbnZva2VEZWZlcmVkKCkge1xuICAgIGZuLmFwcGx5KHF1ZXVlZFNjb3BlLCBxdWV1ZWRBcmdzIHx8IFtdKTtcbiAgICBsYXN0RXhlYyA9IERhdGUubm93KCk7XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRpY2sgPSBEYXRlLm5vdygpO1xuICAgIHZhciBlbGFwc2VkID0gdGljayAtIGxhc3RFeGVjO1xuXG4gICAgLy8gYWx3YXlzIGNsZWFyIHRoZSBkZWZlcmVkIHRpbWVyXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcblxuICAgIGlmIChlbGFwc2VkIDwgZGVsYXkpIHtcbiAgICAgIHF1ZXVlZEFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgICBxdWV1ZWRTY29wZSA9IHRoaXM7XG5cbiAgICAgIHJldHVybiB0cmFpbGluZyAmJiAodGltZXIgPSBzZXRUaW1lb3V0KGludm9rZURlZmVyZWQsIGRlbGF5IC0gZWxhcHNlZCkpO1xuICAgIH1cblxuICAgIC8vIGNhbGwgdGhlIGZ1bmN0aW9uXG4gICAgbGFzdEV4ZWMgPSB0aWNrO1xuICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG59OyIsIi8vQ29weXJpZ2h0IChDKSAyMDEyIEtvcnkgTnVublxyXG5cclxuLy9QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxyXG5cclxuLy9UaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cclxuXHJcbi8vVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXHJcblxyXG4vKlxyXG5cclxuICAgIFRoaXMgY29kZSBpcyBub3QgZm9ybWF0dGVkIGZvciByZWFkYWJpbGl0eSwgYnV0IHJhdGhlciBydW4tc3BlZWQgYW5kIHRvIGFzc2lzdCBjb21waWxlcnMuXHJcblxyXG4gICAgSG93ZXZlciwgdGhlIGNvZGUncyBpbnRlbnRpb24gc2hvdWxkIGJlIHRyYW5zcGFyZW50LlxyXG5cclxuICAgICoqKiBJRSBTVVBQT1JUICoqKlxyXG5cclxuICAgIElmIHlvdSByZXF1aXJlIHRoaXMgbGlicmFyeSB0byB3b3JrIGluIElFNywgYWRkIHRoZSBmb2xsb3dpbmcgYWZ0ZXIgZGVjbGFyaW5nIGNyZWwuXHJcblxyXG4gICAgdmFyIHRlc3REaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSxcclxuICAgICAgICB0ZXN0TGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsYWJlbCcpO1xyXG5cclxuICAgIHRlc3REaXYuc2V0QXR0cmlidXRlKCdjbGFzcycsICdhJyk7XHJcbiAgICB0ZXN0RGl2WydjbGFzc05hbWUnXSAhPT0gJ2EnID8gY3JlbC5hdHRyTWFwWydjbGFzcyddID0gJ2NsYXNzTmFtZSc6dW5kZWZpbmVkO1xyXG4gICAgdGVzdERpdi5zZXRBdHRyaWJ1dGUoJ25hbWUnLCdhJyk7XHJcbiAgICB0ZXN0RGl2WyduYW1lJ10gIT09ICdhJyA/IGNyZWwuYXR0ck1hcFsnbmFtZSddID0gZnVuY3Rpb24oZWxlbWVudCwgdmFsdWUpe1xyXG4gICAgICAgIGVsZW1lbnQuaWQgPSB2YWx1ZTtcclxuICAgIH06dW5kZWZpbmVkO1xyXG5cclxuXHJcbiAgICB0ZXN0TGFiZWwuc2V0QXR0cmlidXRlKCdmb3InLCAnYScpO1xyXG4gICAgdGVzdExhYmVsWydodG1sRm9yJ10gIT09ICdhJyA/IGNyZWwuYXR0ck1hcFsnZm9yJ10gPSAnaHRtbEZvcic6dW5kZWZpbmVkO1xyXG5cclxuXHJcblxyXG4qL1xyXG5cclxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XHJcbiAgICBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgICAgIGRlZmluZShmYWN0b3J5KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcm9vdC5jcmVsID0gZmFjdG9yeSgpO1xyXG4gICAgfVxyXG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBmbiA9ICdmdW5jdGlvbicsXHJcbiAgICAgICAgb2JqID0gJ29iamVjdCcsXHJcbiAgICAgICAgbm9kZVR5cGUgPSAnbm9kZVR5cGUnLFxyXG4gICAgICAgIHRleHRDb250ZW50ID0gJ3RleHRDb250ZW50JyxcclxuICAgICAgICBzZXRBdHRyaWJ1dGUgPSAnc2V0QXR0cmlidXRlJyxcclxuICAgICAgICBhdHRyTWFwU3RyaW5nID0gJ2F0dHJNYXAnLFxyXG4gICAgICAgIGlzTm9kZVN0cmluZyA9ICdpc05vZGUnLFxyXG4gICAgICAgIGlzRWxlbWVudFN0cmluZyA9ICdpc0VsZW1lbnQnLFxyXG4gICAgICAgIGQgPSB0eXBlb2YgZG9jdW1lbnQgPT09IG9iaiA/IGRvY3VtZW50IDoge30sXHJcbiAgICAgICAgaXNUeXBlID0gZnVuY3Rpb24oYSwgdHlwZSl7XHJcbiAgICAgICAgICAgIHJldHVybiB0eXBlb2YgYSA9PT0gdHlwZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGlzTm9kZSA9IHR5cGVvZiBOb2RlID09PSBmbiA/IGZ1bmN0aW9uIChvYmplY3QpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdCBpbnN0YW5jZW9mIE5vZGU7XHJcbiAgICAgICAgfSA6XHJcbiAgICAgICAgLy8gaW4gSUUgPD0gOCBOb2RlIGlzIGFuIG9iamVjdCwgb2J2aW91c2x5Li5cclxuICAgICAgICBmdW5jdGlvbihvYmplY3Qpe1xyXG4gICAgICAgICAgICByZXR1cm4gb2JqZWN0ICYmXHJcbiAgICAgICAgICAgICAgICBpc1R5cGUob2JqZWN0LCBvYmopICYmXHJcbiAgICAgICAgICAgICAgICAobm9kZVR5cGUgaW4gb2JqZWN0KSAmJlxyXG4gICAgICAgICAgICAgICAgaXNUeXBlKG9iamVjdC5vd25lckRvY3VtZW50LG9iaik7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc0VsZW1lbnQgPSBmdW5jdGlvbiAob2JqZWN0KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjcmVsW2lzTm9kZVN0cmluZ10ob2JqZWN0KSAmJiBvYmplY3Rbbm9kZVR5cGVdID09PSAxO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaXNBcnJheSA9IGZ1bmN0aW9uKGEpe1xyXG4gICAgICAgICAgICByZXR1cm4gYSBpbnN0YW5jZW9mIEFycmF5O1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYXBwZW5kQ2hpbGQgPSBmdW5jdGlvbihlbGVtZW50LCBjaGlsZCkge1xyXG4gICAgICAgICAgaWYoIWNyZWxbaXNOb2RlU3RyaW5nXShjaGlsZCkpe1xyXG4gICAgICAgICAgICAgIGNoaWxkID0gZC5jcmVhdGVUZXh0Tm9kZShjaGlsZCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbGVtZW50LmFwcGVuZENoaWxkKGNoaWxkKTtcclxuICAgICAgICB9O1xyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBjcmVsKCl7XHJcbiAgICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHMsIC8vTm90ZTogYXNzaWduZWQgdG8gYSB2YXJpYWJsZSB0byBhc3Npc3QgY29tcGlsZXJzLiBTYXZlcyBhYm91dCA0MCBieXRlcyBpbiBjbG9zdXJlIGNvbXBpbGVyLiBIYXMgbmVnbGlnYWJsZSBlZmZlY3Qgb24gcGVyZm9ybWFuY2UuXHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSBhcmdzWzBdLFxyXG4gICAgICAgICAgICBjaGlsZCxcclxuICAgICAgICAgICAgc2V0dGluZ3MgPSBhcmdzWzFdLFxyXG4gICAgICAgICAgICBjaGlsZEluZGV4ID0gMixcclxuICAgICAgICAgICAgYXJndW1lbnRzTGVuZ3RoID0gYXJncy5sZW5ndGgsXHJcbiAgICAgICAgICAgIGF0dHJpYnV0ZU1hcCA9IGNyZWxbYXR0ck1hcFN0cmluZ107XHJcblxyXG4gICAgICAgIGVsZW1lbnQgPSBjcmVsW2lzRWxlbWVudFN0cmluZ10oZWxlbWVudCkgPyBlbGVtZW50IDogZC5jcmVhdGVFbGVtZW50KGVsZW1lbnQpO1xyXG4gICAgICAgIC8vIHNob3J0Y3V0XHJcbiAgICAgICAgaWYoYXJndW1lbnRzTGVuZ3RoID09PSAxKXtcclxuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZighaXNUeXBlKHNldHRpbmdzLG9iaikgfHwgY3JlbFtpc05vZGVTdHJpbmddKHNldHRpbmdzKSB8fCBpc0FycmF5KHNldHRpbmdzKSkge1xyXG4gICAgICAgICAgICAtLWNoaWxkSW5kZXg7XHJcbiAgICAgICAgICAgIHNldHRpbmdzID0gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHNob3J0Y3V0IGlmIHRoZXJlIGlzIG9ubHkgb25lIGNoaWxkIHRoYXQgaXMgYSBzdHJpbmdcclxuICAgICAgICBpZigoYXJndW1lbnRzTGVuZ3RoIC0gY2hpbGRJbmRleCkgPT09IDEgJiYgaXNUeXBlKGFyZ3NbY2hpbGRJbmRleF0sICdzdHJpbmcnKSAmJiBlbGVtZW50W3RleHRDb250ZW50XSAhPT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgICAgZWxlbWVudFt0ZXh0Q29udGVudF0gPSBhcmdzW2NoaWxkSW5kZXhdO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICBmb3IoOyBjaGlsZEluZGV4IDwgYXJndW1lbnRzTGVuZ3RoOyArK2NoaWxkSW5kZXgpe1xyXG4gICAgICAgICAgICAgICAgY2hpbGQgPSBhcmdzW2NoaWxkSW5kZXhdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKGNoaWxkID09IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChpc0FycmF5KGNoaWxkKSkge1xyXG4gICAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBjaGlsZC5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGFwcGVuZENoaWxkKGVsZW1lbnQsIGNoaWxkW2ldKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgYXBwZW5kQ2hpbGQoZWxlbWVudCwgY2hpbGQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IodmFyIGtleSBpbiBzZXR0aW5ncyl7XHJcbiAgICAgICAgICAgIGlmKCFhdHRyaWJ1dGVNYXBba2V5XSl7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50W3NldEF0dHJpYnV0ZV0oa2V5LCBzZXR0aW5nc1trZXldKTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXR0ciA9IGF0dHJpYnV0ZU1hcFtrZXldO1xyXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIGF0dHIgPT09IGZuKXtcclxuICAgICAgICAgICAgICAgICAgICBhdHRyKGVsZW1lbnQsIHNldHRpbmdzW2tleV0pO1xyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudFtzZXRBdHRyaWJ1dGVdKGF0dHIsIHNldHRpbmdzW2tleV0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZWxlbWVudDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBVc2VkIGZvciBtYXBwaW5nIG9uZSBraW5kIG9mIGF0dHJpYnV0ZSB0byB0aGUgc3VwcG9ydGVkIHZlcnNpb24gb2YgdGhhdCBpbiBiYWQgYnJvd3NlcnMuXHJcbiAgICBjcmVsW2F0dHJNYXBTdHJpbmddID0ge307XHJcblxyXG4gICAgY3JlbFtpc0VsZW1lbnRTdHJpbmddID0gaXNFbGVtZW50O1xyXG5cclxuICAgIGNyZWxbaXNOb2RlU3RyaW5nXSA9IGlzTm9kZTtcclxuXHJcbiAgICByZXR1cm4gY3JlbDtcclxufSkpO1xyXG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIHdpbmRvdzogZmFsc2UgKi9cbi8qIGdsb2JhbCBuYXZpZ2F0b3I6IGZhbHNlICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGJyb3dzZXIgPSByZXF1aXJlKCdkZXRlY3QtYnJvd3NlcicpO1xuXG4vKipcbiAgIyMjIGBydGMtY29yZS9kZXRlY3RgXG5cbiAgQSBicm93c2VyIGRldGVjdGlvbiBoZWxwZXIgZm9yIGFjY2Vzc2luZyBwcmVmaXgtZnJlZSB2ZXJzaW9ucyBvZiB0aGUgdmFyaW91c1xuICBXZWJSVEMgdHlwZXMuXG5cbiAgIyMjIEV4YW1wbGUgVXNhZ2VcblxuICBJZiB5b3Ugd2FudGVkIHRvIGdldCB0aGUgbmF0aXZlIGBSVENQZWVyQ29ubmVjdGlvbmAgcHJvdG90eXBlIGluIGFueSBicm93c2VyXG4gIHlvdSBjb3VsZCBkbyB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGpzXG4gIHZhciBkZXRlY3QgPSByZXF1aXJlKCdydGMtY29yZS9kZXRlY3QnKTsgLy8gYWxzbyBhdmFpbGFibGUgaW4gcnRjL2RldGVjdFxuICB2YXIgUlRDUGVlckNvbm5lY3Rpb24gPSBkZXRlY3QoJ1JUQ1BlZXJDb25uZWN0aW9uJyk7XG4gIGBgYFxuXG4gIFRoaXMgd291bGQgcHJvdmlkZSB3aGF0ZXZlciB0aGUgYnJvd3NlciBwcmVmaXhlZCB2ZXJzaW9uIG9mIHRoZVxuICBSVENQZWVyQ29ubmVjdGlvbiBpcyBhdmFpbGFibGUgKGB3ZWJraXRSVENQZWVyQ29ubmVjdGlvbmAsXG4gIGBtb3pSVENQZWVyQ29ubmVjdGlvbmAsIGV0YykuXG4qKi9cbnZhciBkZXRlY3QgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCwgb3B0cykge1xuICB2YXIgYXR0YWNoID0gKG9wdHMgfHwge30pLmF0dGFjaDtcbiAgdmFyIHByZWZpeElkeDtcbiAgdmFyIHByZWZpeDtcbiAgdmFyIHRlc3ROYW1lO1xuICB2YXIgaG9zdE9iamVjdCA9IHRoaXMgfHwgKHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB1bmRlZmluZWQpO1xuXG4gIC8vIGluaXRpYWxpc2UgdG8gZGVmYXVsdCBwcmVmaXhlc1xuICAvLyAocmV2ZXJzZSBvcmRlciBhcyB3ZSB1c2UgYSBkZWNyZW1lbnRpbmcgZm9yIGxvb3ApXG4gIHZhciBwcmVmaXhlcyA9ICgob3B0cyB8fCB7fSkucHJlZml4ZXMgfHwgWydtcycsICdvJywgJ21veicsICd3ZWJraXQnXSkuY29uY2F0KCcnKTtcblxuICAvLyBpZiB3ZSBoYXZlIG5vIGhvc3Qgb2JqZWN0LCB0aGVuIGFib3J0XG4gIGlmICghIGhvc3RPYmplY3QpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHByZWZpeGVzIGFuZCByZXR1cm4gdGhlIGNsYXNzIGlmIGZvdW5kIGluIGdsb2JhbFxuICBmb3IgKHByZWZpeElkeCA9IHByZWZpeGVzLmxlbmd0aDsgcHJlZml4SWR4LS07ICkge1xuICAgIHByZWZpeCA9IHByZWZpeGVzW3ByZWZpeElkeF07XG5cbiAgICAvLyBjb25zdHJ1Y3QgdGhlIHRlc3QgY2xhc3MgbmFtZVxuICAgIC8vIGlmIHdlIGhhdmUgYSBwcmVmaXggZW5zdXJlIHRoZSB0YXJnZXQgaGFzIGFuIHVwcGVyY2FzZSBmaXJzdCBjaGFyYWN0ZXJcbiAgICAvLyBzdWNoIHRoYXQgYSB0ZXN0IGZvciBnZXRVc2VyTWVkaWEgd291bGQgcmVzdWx0IGluIGFcbiAgICAvLyBzZWFyY2ggZm9yIHdlYmtpdEdldFVzZXJNZWRpYVxuICAgIHRlc3ROYW1lID0gcHJlZml4ICsgKHByZWZpeCA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdGFyZ2V0LnNsaWNlKDEpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQpO1xuXG4gICAgaWYgKHR5cGVvZiBob3N0T2JqZWN0W3Rlc3ROYW1lXSAhPSAndW5kZWZpbmVkJykge1xuICAgICAgLy8gdXBkYXRlIHRoZSBsYXN0IHVzZWQgcHJlZml4XG4gICAgICBkZXRlY3QuYnJvd3NlciA9IGRldGVjdC5icm93c2VyIHx8IHByZWZpeC50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICBpZiAoYXR0YWNoKSB7XG4gICAgICAgICBob3N0T2JqZWN0W3RhcmdldF0gPSBob3N0T2JqZWN0W3Rlc3ROYW1lXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGhvc3RPYmplY3RbdGVzdE5hbWVdO1xuICAgIH1cbiAgfVxufTtcblxuLy8gZGV0ZWN0IG1vemlsbGEgKHllcywgdGhpcyBmZWVscyBkaXJ0eSlcbmRldGVjdC5tb3ogPSB0eXBlb2YgbmF2aWdhdG9yICE9ICd1bmRlZmluZWQnICYmICEhbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYTtcblxuLy8gc2V0IHRoZSBicm93c2VyIGFuZCBicm93c2VyIHZlcnNpb25cbmRldGVjdC5icm93c2VyID0gYnJvd3Nlci5uYW1lO1xuZGV0ZWN0LmJyb3dzZXJWZXJzaW9uID0gZGV0ZWN0LnZlcnNpb24gPSBicm93c2VyLnZlcnNpb247XG4iLCIvKipcbiAgIyMjIGBydGMtY29yZS9nZW5pY2VgXG5cbiAgUmVzcG9uZCBhcHByb3ByaWF0ZWx5IHRvIG9wdGlvbnMgdGhhdCBhcmUgcGFzc2VkIHRvIHBhY2thZ2VzIGxpa2VcbiAgYHJ0Yy1xdWlja2Nvbm5lY3RgIGFuZCB0cmlnZ2VyIGEgYGNhbGxiYWNrYCAoZXJyb3IgZmlyc3QpIHdpdGggaWNlU2VydmVyXG4gIHZhbHVlcy5cblxuICBUaGUgZnVuY3Rpb24gbG9va3MgZm9yIGVpdGhlciBvZiB0aGUgZm9sbG93aW5nIGtleXMgaW4gdGhlIG9wdGlvbnMsIGluXG4gIHRoZSBmb2xsb3dpbmcgb3JkZXIgb3IgcHJlY2VkZW5jZTpcblxuICAxLiBgaWNlYCAtIHRoaXMgY2FuIGVpdGhlciBiZSBhbiBhcnJheSBvZiBpY2Ugc2VydmVyIHZhbHVlcyBvciBhIGdlbmVyYXRvclxuICAgICBmdW5jdGlvbiAoaW4gdGhlIHNhbWUgZm9ybWF0IGFzIHRoaXMgZnVuY3Rpb24pLiAgSWYgdGhpcyBrZXkgY29udGFpbnMgYVxuICAgICB2YWx1ZSB0aGVuIGFueSBzZXJ2ZXJzIHNwZWNpZmllZCBpbiB0aGUgYGljZVNlcnZlcnNgIGtleSAoMikgd2lsbCBiZVxuICAgICBpZ25vcmVkLlxuXG4gIDIuIGBpY2VTZXJ2ZXJzYCAtIGFuIGFycmF5IG9mIGljZSBzZXJ2ZXIgdmFsdWVzLlxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdHMsIGNhbGxiYWNrKSB7XG4gIHZhciBpY2UgPSAob3B0cyB8fCB7fSkuaWNlO1xuICB2YXIgaWNlU2VydmVycyA9IChvcHRzIHx8IHt9KS5pY2VTZXJ2ZXJzO1xuXG4gIGlmICh0eXBlb2YgaWNlID09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gaWNlKG9wdHMsIGNhbGxiYWNrKTtcbiAgfVxuICBlbHNlIGlmIChBcnJheS5pc0FycmF5KGljZSkpIHtcbiAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgW10uY29uY2F0KGljZSkpO1xuICB9XG5cbiAgY2FsbGJhY2sobnVsbCwgW10uY29uY2F0KGljZVNlcnZlcnMgfHwgW10pKTtcbn07XG4iLCJ2YXIgYnJvd3NlcnMgPSBbXG4gIFsgJ2Nocm9tZScsIC9DaHJvbSg/OmV8aXVtKVxcLyhbMC05XFwuXSspKDo/XFxzfCQpLyBdLFxuICBbICdmaXJlZm94JywgL0ZpcmVmb3hcXC8oWzAtOVxcLl0rKSg/Olxcc3wkKS8gXSxcbiAgWyAnb3BlcmEnLCAvT3BlcmFcXC8oWzAtOVxcLl0rKSg/Olxcc3wkKS8gXSxcbiAgWyAnaWUnLCAvVHJpZGVudFxcLzdcXC4wLipydlxcOihbMC05XFwuXSspXFwpLipHZWNrbyQvIF0sXG4gIFsgJ2llJywgL01TSUVcXHMoWzAtOVxcLl0rKTsuKlRyaWRlbnRcXC9bNC03XS4wLyBdLFxuICBbICdpZScsIC9NU0lFXFxzKDdcXC4wKS8gXSxcbiAgWyAnYmIxMCcsIC9CQjEwO1xcc1RvdWNoLipWZXJzaW9uXFwvKFswLTlcXC5dKykvIF0sXG4gIFsgJ2FuZHJvaWQnLCAvQW5kcm9pZFxccyhbMC05XFwuXSspLyBdLFxuICBbICdpb3MnLCAvaVBhZFxcO1xcc0NQVVxcc09TXFxzKFswLTlcXC5fXSspLyBdLFxuICBbICdpb3MnLCAgL2lQaG9uZVxcO1xcc0NQVVxcc2lQaG9uZVxcc09TXFxzKFswLTlcXC5fXSspLyBdLFxuICBbICdzYWZhcmknLCAvU2FmYXJpXFwvKFswLTlcXC5fXSspLyBdXG5dO1xuXG52YXIgbWF0Y2ggPSBicm93c2Vycy5tYXAobWF0Y2gpLmZpbHRlcihpc01hdGNoKVswXTtcbnZhciBwYXJ0cyA9IG1hdGNoICYmIG1hdGNoWzNdLnNwbGl0KC9bLl9dLykuc2xpY2UoMCwzKTtcblxud2hpbGUgKHBhcnRzICYmIHBhcnRzLmxlbmd0aCA8IDMpIHtcbiAgcGFydHMucHVzaCgnMCcpO1xufVxuXG4vLyBzZXQgdGhlIG5hbWUgYW5kIHZlcnNpb25cbmV4cG9ydHMubmFtZSA9IG1hdGNoICYmIG1hdGNoWzBdO1xuZXhwb3J0cy52ZXJzaW9uID0gcGFydHMgJiYgcGFydHMuam9pbignLicpO1xuXG5mdW5jdGlvbiBtYXRjaChwYWlyKSB7XG4gIHJldHVybiBwYWlyLmNvbmNhdChwYWlyWzFdLmV4ZWMobmF2aWdhdG9yLnVzZXJBZ2VudCkpO1xufVxuXG5mdW5jdGlvbiBpc01hdGNoKHBhaXIpIHtcbiAgcmV0dXJuICEhcGFpclsyXTtcbn1cbiIsInZhciBkZXRlY3QgPSByZXF1aXJlKCcuL2RldGVjdCcpO1xudmFyIHJlcXVpcmVkRnVuY3Rpb25zID0gW1xuICAnaW5pdCdcbl07XG5cbmZ1bmN0aW9uIGlzU3VwcG9ydGVkKHBsdWdpbikge1xuICByZXR1cm4gcGx1Z2luICYmIHR5cGVvZiBwbHVnaW4uc3VwcG9ydGVkID09ICdmdW5jdGlvbicgJiYgcGx1Z2luLnN1cHBvcnRlZChkZXRlY3QpO1xufVxuXG5mdW5jdGlvbiBpc1ZhbGlkKHBsdWdpbikge1xuICB2YXIgc3VwcG9ydGVkRnVuY3Rpb25zID0gcmVxdWlyZWRGdW5jdGlvbnMuZmlsdGVyKGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBwbHVnaW5bZm5dID09ICdmdW5jdGlvbic7XG4gIH0pO1xuXG4gIHJldHVybiBzdXBwb3J0ZWRGdW5jdGlvbnMubGVuZ3RoID09PSByZXF1aXJlZEZ1bmN0aW9ucy5sZW5ndGg7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocGx1Z2lucykge1xuICByZXR1cm4gW10uY29uY2F0KHBsdWdpbnMgfHwgW10pLmZpbHRlcihpc1N1cHBvcnRlZCkuZmlsdGVyKGlzVmFsaWQpWzBdO1xufVxuIiwidmFyIGNhcHR1cmUgPSByZXF1aXJlKCdydGMtY2FwdHVyZScpO1xudmFyIGF0dGFjaCA9IHJlcXVpcmUoJ3J0Yy1hdHRhY2gnKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG5cbi8qKlxuICAjIHJ0Yy1tZWRpYVxuXG4gIFRoaXMgaXMgYSBjb252ZW5pZW5jZSBmdW5jdGlvbiBmb3IgaW52b2tpbmcgbWVkaWEgY2FwdHVyZSBhbmQgcmVuZGVyaW5nXG4gIHVzaW5nIHRoZSBbYHJ0Yy1jYXB0dXJlYF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtY2FwdHVyZSkgYW5kXG4gIFtgcnRjLWF0dGFjaGBdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLWF0dGFjaCkgcGFja2FnZXMgcmVzcGVjdGl2ZWx5XG4gIHdpdGhpbiBhbiBhcHBsaWNhdGlvbi5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgRGVmYXVsdCBjb25zdHJhaW50cyBgeyBhdWRpbzogdHJ1ZSwgdmlkZW86IHRydWUgfWAgY2FwdHVyZSBhbmQgcmVuZGVyaW5nXG4gIGFuIG5ldyB2aWRlbyBlbGVtZW50IHdpdGhpbiB0aGUgZG9jdW1lbnQuYm9keTpcblxuICA8PDwgZXhhbXBsZXMvcmVuZGVyLXRvLWJvZHkuanNcblxuICBJbiB0aGUgZXZlbnQgdGhhdCB5b3Ugd2lzaCB0byBtYWtlIHVzZSBvZiBhbnkgb2YgdGhlIHJ0Yy5pbyBwbHVnaW5zLCB0aGVuXG4gIHRoZSBmb2xsb3dpbmcgZXhhbXBsZSBkZW1vbnN0cmF0ZXMgaG93IHRvIHByb3ZpZGUgYSBzaW5nbGUgXCJjYXB0dXJlIGFuZFxuICByZW5kZXJcIiBjYWxsIHRoYXQgd2lsbCB3b3JrIHdpdGggYSBwbHVnaW46XG5cbiAgPDw8IGV4YW1wbGVzL3BsdWdpbi5qc1xuXG4qKi9cblxudmFyIG1lZGlhID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvcHRzKSB7XG4gIC8vIGRvIHdlIGhhdmUgY29uc3RyYWludHNcbiAgdmFyIGNvbnN0cmFpbnRzID0gKG9wdHMgfHwge30pLmNvbnN0cmFpbnRzIHx8IHsgdmlkZW86IHRydWUsIGF1ZGlvOiB0cnVlIH07XG5cbiAgLy8gb3IgZG8gd2UgaGF2ZSBhIHN0cmVhbVxuICB2YXIgc3RyZWFtID0gKG9wdHMgfHwge30pLnN0cmVhbTtcblxuICAvLyBpZiB3ZSBoYXZlIGJlZW4gcGFzc2VkIGNvbnN0cmFpbnRzLCBhc3N1bWUgd2UgYXJlIGF0dGFjaGluZyBhIGxvY2FsIHN0cmVhbVxuICAvLyBvdGhlcndpc2UsIHVzZSB0aGUgZ2VuZXJpYyBhdHRhY2ggb3B0aW9uc1xuICB2YXIgc3RyZWFtQXR0YWNoID0gKG9wdHMgfHwge30pLmNvbnN0cmFpbnRzID8gYXR0YWNoLmxvY2FsIDogYXR0YWNoO1xuXG4gIC8vIGRldGVjdCBhIHRhcmdldFxuICB2YXIgdGFyZ2V0ID0gKG9wdHMgfHwge30pLnRhcmdldCB8fCBkb2N1bWVudC5ib2R5O1xuICB2YXIgbm9uTWVkaWFUYXJnZXQgPSAhKHRhcmdldCBpbnN0YW5jZW9mIEhUTUxNZWRpYUVsZW1lbnQpO1xuXG4gIGZ1bmN0aW9uIGhhbmRsZUF0dGFjaChlcnIsIGVsKSB7XG4gICAgaWYgKGVycikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0YXJnZXQgJiYgbm9uTWVkaWFUYXJnZXQgJiYgdGFyZ2V0ICE9PSBlbCkge1xuICAgICAgdGFyZ2V0LmFwcGVuZENoaWxkKGVsKTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB3ZSBoYXZlIGEgc3RyZWFtLCBtb3ZlIG9udG8gcmVuZGVyaW5nIGltbWVkaWF0ZWx5XG4gIGlmIChzdHJlYW0pIHtcbiAgICByZXR1cm4gc3RyZWFtQXR0YWNoKHN0cmVhbSwgb3B0cywgaGFuZGxlQXR0YWNoKTtcbiAgfVxuXG4gIHJldHVybiBjYXB0dXJlKGNvbnN0cmFpbnRzLCBvcHRzLCBmdW5jdGlvbihlcnIsIHN0cmVhbSkge1xuICAgIHN0cmVhbUF0dGFjaChzdHJlYW0sIG9wdHMsIGhhbmRsZUF0dGFjaCk7XG4gIH0pO1xufTtcblxubWVkaWEuY2FwdHVyZSA9IGZ1bmN0aW9uKGNvbnN0cmFpbnRzLCBvcHRzKSB7XG4gIHJldHVybiBtZWRpYShleHRlbmQoe30sIG9wdHMsIHsgY29uc3RyYWludHM6IGNvbnN0cmFpbnRzIH0pKTtcbn07XG5cbm1lZGlhLmF0dGFjaCA9IG1lZGlhLnJlbmRlciA9IGZ1bmN0aW9uKHN0cmVhbSwgb3B0cykge1xuICByZXR1cm4gbWVkaWEoZXh0ZW5kKHt9LCBvcHRzLCB7IHN0cmVhbTogc3RyZWFtIH0pKTtcbn07XG4iLCJ2YXIgcGx1Z2luID0gcmVxdWlyZSgncnRjLWNvcmUvcGx1Z2luJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xuXG4vKipcbiAgIyBydGMtYXR0YWNoXG5cbiAgUm91Z2hseSBlcXVpdmFsZW50IHRvIHRoZVxuICBbYGF0dGFjaE1lZGlhU3RyZWFtYF0oaHR0cHM6Ly93d3cubnBtanMub3JnL3BhY2thZ2UvYXR0YWNobWVkaWFzdHJlYW0pXG4gIHBhY2thZ2UgYnV0IHdpdGggc3VwcG9ydCBmb3IgcnRjLmlvIHBsdWdpbnMuICBBbHNvIHVzZXMgYW4gZXJyb3IgZmlyc3RcbiAgYXN5bmMgQVBJIHRvIGFsbG93IHBsdWdpbnMgdGltZSB0byBpbml0aWFsaXplLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICA8PDwgZXhhbXBsZXMvc2ltcGxlLmpzXG5cbiAgIyMgRXhhbXBsZSB1c2luZyBQbHVnaW5zXG5cbiAgPDw8IGV4YW1wbGVzL3BsdWdpbnMuanNcblxuICAjIyBSZWZlcmVuY2VcblxuICAjIyMgYGF0dGFjaChzdHJlYW0sIG9wdHM/LCBjYWxsYmFjaylgXG5cbiAgQXR0YWNoIGBzdHJlYW1gIHRvIGEgSFRNTCBlbGVtZW50IHRoYXQgd2lsbCByZW5kZXIgdGhlIGNvbnRlbnQuIFRoZSBwcm92aWRlZFxuICBgY2FsbGJhY2tgIGZvbGxvd3MgdGhlIGZvcm1hdCBvZiBgZm4oZXJyLCBlbGVtZW50KWAuICBXaGlsZSB0aGUgYXN5bmMgbmF0dXJlXG4gIG9mIHRoaXMgcGFja2FnZSBtYXkgc2VlbSBvZGQsIGJlY2F1c2UgYSBwbHVnaW4gbWF5IG5lZWQgdGltZSB0byBpbml0aWFsaXplXG4gIHRoaXMgY2F0ZXJzIGZvciB0aGlzIGNhc2UgaW4gYWRkaXRpb24gdG8gc3RhbmRhcmQgdXNhZ2UgaW4gdGhlIGJyb3dzZXIuXG5cbiAgLSBgYXV0b3BsYXlgIChkZWZhdWx0OiBgdHJ1ZWApIC0gYnkgZGVmYXVsdCBhZnRlciB0aGUgc3RyZWFtIGhhcyBiZWVuXG4gICAgYXR0YWNoZWQgdG8gdGhlIGVsZW1lbnQgaXQgd2lsbCBiZSBwbGF5ZWQuICBUaGlzIGlzIGRvbmUgYnkgY2FsbGluZ1xuICAgIHRoZSBgcGxheSgpYCBmdW5jdGlvbiBvbiB0aGUgZWxlbWVudCByYXRoZXIgdGhhbiByZWx5aW5nIG9uIGBhdXRvcGxheWBcbiAgICBhdHRyaWJ1dGUgZnVuY3Rpb25hbGl0eS5cblxuICAtIGBlbGAgKGRlZmF1bHQ6IGBudWxsYCkgLSBpZiB5b3Ugd2l0aCB0byBzdXBwbHkgYW4gZWxlbWVudCB0byBiZSB1c2VkXG4gICAgaW5zdGVhZCBvZiBjcmVhdGluZyBhIG5ldyBlbGVtZW50IHRvIHJlY2VpdmUgdGhlIHN0cmVhbSBzcGVjaWZ5IGl0IGhlcmUuXG5cbiAgLSBgbXV0ZWRgIChkZWZhdWx0OiBgZmFsc2VgKSAtIHdoZXRoZXIgdGhlIGNyZWF0ZWQgZWxlbWVudCBzaG91bGQgYmUgbXV0ZWRcbiAgICBvciBub3QuICBGb3IgbG9jYWwgc3RyZWFtcyB0aGlzIHNob3VsZCBhbG1vc3QgYWx3YXlzLCBiZSB0cnVlIHNvIGNvbnNpZGVyXG4gICAgdXNpbmcgdGhlIGBhdHRhY2gubG9jYWxgIGhlbHBlciBmdW5jdGlvbiBmb3Igc2ltcGxlIGNhc2VzLlxuXG4gIC0gYHBsdWdpbnNgIChkZWZhdWx0OiBgW11gKSAtIHNwZWNpZnkgb25lIG9yIG1vcmUgcGx1Z2lucyB0aGF0IGNhbiBiZSB1c2VkXG4gICAgdG8gcmVuZGVyIHRoZSBtZWRpYSBzdHJlYW0gYXBwcm9wcmlhdGUgdG8gdGhlIGN1cnJlbnQgcGxhdGZvcm0gaW4gdGhlXG4gICAgZXZlbnQgdGhhdCBXZWJSVEMgYW5kL29yIG1lZGlhIGNhcHR1cmUgaXMgc3VwcG9ydGVkIHZpYSBhIGJyb3dzZXIgcGx1Z2luLlxuXG4qKi9cbnZhciBhdHRhY2ggPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHN0cmVhbSwgb3B0cywgY2FsbGJhY2spIHtcbiAgdmFyIFVSTCA9IHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LlVSTDtcbiAgdmFyIHBpbnN0O1xuXG4gIGlmICh0eXBlb2Ygb3B0cyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRzO1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFwcGx5TW9kaWZpY2F0aW9ucyhlbCwgbykge1xuICAgIGlmICgobyB8fCB7fSkubXV0ZWQpIHtcbiAgICAgIGVsLm11dGVkID0gdHJ1ZTtcbiAgICAgIGVsLnNldEF0dHJpYnV0ZSgnbXV0ZWQnLCAnJyk7XG4gICAgfVxuXG4gICAgaWYgKChvIHx8IHt9KS5taXJyb3IpIHtcbiAgICAgIGVsLnNldEF0dHJpYnV0ZSgnZGF0YS1taXJyb3JlZCcsIHRydWUpO1xuICAgIH1cblxuICAgIHJldHVybiBlbDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGF0dGFjaFRvRWxlbWVudChzLCBvKSB7XG4gICAgdmFyIGF1dG9wbGF5ID0gKG8gfHwge30pLmF1dG9wbGF5O1xuICAgIHZhciBlbFR5cGUgPSAnYXVkaW8nO1xuICAgIHZhciBlbCA9IChvIHx8IHt9KS5lbCB8fCAobyB8fCB7fSkudGFyZ2V0O1xuXG4gICAgLy8gY2hlY2sgdGhlIHN0cmVhbSBpcyB2YWxpZFxuICAgIHZhciBpc1ZhbGlkID0gcyAmJiB0eXBlb2Ygcy5nZXRWaWRlb1RyYWNrcyA9PSAnZnVuY3Rpb24nO1xuXG4gICAgLy8gZGV0ZXJtaW5lIHRoZSBlbGVtZW50IHR5cGVcbiAgICBpZiAoaXNWYWxpZCAmJiBzLmdldFZpZGVvVHJhY2tzKCkubGVuZ3RoID4gMCkge1xuICAgICAgZWxUeXBlID0gJ3ZpZGVvJztcbiAgICB9XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGJlZW4gcGFzc2VkIGFuIFwidW5wbGF5YWJsZVwiIHRhcmdldCBjcmVhdGUgYSBuZXcgZWxlbWVudFxuICAgIGlmIChlbCAmJiB0eXBlb2YgZWwucGxheSAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICBlbCA9IG51bGw7XG4gICAgfVxuXG4gICAgLy8gcHJlcGFyZSB0aGUgZWxlbWVudFxuICAgIGVsID0gZWwgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChlbFR5cGUpO1xuXG4gICAgLy8gYXR0YWNoIHRoZSBzdHJlYW1cbiAgICBpZiAoVVJMICYmIFVSTC5jcmVhdGVPYmplY3RVUkwpIHtcbiAgICAgIGVsLnNyYyA9IFVSTC5jcmVhdGVPYmplY3RVUkwoc3RyZWFtKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoZWwuc3JjT2JqZWN0KSB7XG4gICAgICBlbC5zcmNPYmplY3QgPSBzdHJlYW07XG4gICAgfVxuICAgIGVsc2UgaWYgKGVsLm1velNyY09iamVjdCkge1xuICAgICAgZWwubW96U3JjT2JqZWN0ID0gc3RyZWFtO1xuICAgIH1cblxuICAgIGlmIChhdXRvcGxheSA9PT0gdW5kZWZpbmVkIHx8IGF1dG9wbGF5KSB7XG4gICAgICBlbC5zZXRBdHRyaWJ1dGUoJ2F1dG9wbGF5JywgJycpO1xuICAgICAgZWwucGxheSgpO1xuICAgIH1cblxuICAgIHJldHVybiBhcHBseU1vZGlmaWNhdGlvbnMoZWwsIG8pO1xuICB9XG5cbiAgLy8gc2VlIGlmIHdlIGFyZSB1c2luZyBhIHBsdWdpblxuICBwaW5zdCA9IHBsdWdpbigob3B0cyB8fCB7fSkucGx1Z2lucyk7XG4gIGlmIChwaW5zdCkge1xuICAgIHJldHVybiBwaW5zdC5pbml0KG9wdHMsIGZ1bmN0aW9uKGVycikge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBwaW5zdC5hdHRhY2ggIT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdwbHVnaW4gbXVzdCBzdXBwb3J0IHRoZSBhdHRhY2ggZnVuY3Rpb24nKSk7XG4gICAgICB9XG5cbiAgICAgIGNhbGxiYWNrKG51bGwsIGFwcGx5TW9kaWZpY2F0aW9ucyhwaW5zdC5hdHRhY2goc3RyZWFtLCBvcHRzKSwgb3B0cykpO1xuICAgIH0pO1xuICB9XG5cbiAgY2FsbGJhY2sobnVsbCwgYXR0YWNoVG9FbGVtZW50KHN0cmVhbSwgb3B0cykpO1xufTtcblxuLyoqXG4gICMjIyBgYXR0YWNoLmxvY2FsKHN0cmVhbSwgb3B0cz8sIGNhbGxiYWNrKWBcblxuICBBdHRhY2ggYSBsb2NhbCBzdHJlYW0gd2l0aCBvcHRpb25zIGFwcHJvcHJpYXRlIGZvciBsb2NhbCBzdHJlYW1zOlxuXG4gIC0gYG11dGVkYDogYHRydWVgXG5cbioqL1xuYXR0YWNoLmxvY2FsID0gZnVuY3Rpb24oc3RyZWFtLCBvcHRzLCBjYWxsYmFjaykge1xuICBpZiAodHlwZW9mIG9wdHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICBvcHRzID0ge307XG4gIH1cblxuICBhdHRhY2goc3RyZWFtLCBleHRlbmQoeyBtdXRlZDogdHJ1ZSwgbWlycm9yOiB0cnVlIH0sIG9wdHMpLCBjYWxsYmFjayk7XG59O1xuIiwidmFyIHBsdWdpbiA9IHJlcXVpcmUoJ3J0Yy1jb3JlL3BsdWdpbicpO1xudmFyIGRldGVjdCA9IHJlcXVpcmUoJ3J0Yy1jb3JlL2RldGVjdCcpO1xuXG4vLyBwYXRjaCBuYXZpZ2F0b3IgZ2V0VXNlck1lZGlhXG5uYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gbmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fFxuICBkZXRlY3QuY2FsbChuYXZpZ2F0b3IsICdnZXRVc2VyTWVkaWEnKTtcblxuLyoqXG4gICMgcnRjLWNhcHR1cmVcblxuICBSb3VnaGx5IGVxdWl2YWxlbnQgdG8gdGhlXG4gIFtgZ2V0VXNlck1lZGlhYF0oaHR0cHM6Ly93d3cubnBtanMub3JnL3BhY2thZ2UvZ2V0dXNlcm1lZGlhKSBwYWNrYWdlIGJ1dCB3aXRoXG4gIHN1cHBvcnQgZm9yIHJ0Yy5pbyBwbHVnaW5zLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICA8PDwgZXhhbXBsZXMvc2ltcGxlLmpzXG5cbiAgIyMgRXhhbXBsZSB3aXRoIHVzaW5nIFBsdWdpbnNcblxuICA8PDwgZXhhbXBsZXMvcGx1Z2lucy5qc1xuXG4gICMjIFJlZmVyZW5jZVxuXG4gICMjIyBgY2FwdHVyZShjb25zdHJhaW50cywgb3B0cz8sIGNhbGxiYWNrKWBcblxuICBDYXB0dXJlIG1lZGlhIHdpdGggdGhlIHN1cHBsaWVkIGBjb25zdHJhaW50c2AuICBJZiBhbiBgb3B0c2AgYXJndW1lbnQgaXNcbiAgc3VwcGxpZWQgbG9vayBmb3IgcGx1Z2lucyB0aGF0IG1heSBjaGFuZ2UgdGhlIGJlaGF2aW91ciBvZiB0aGUgY2FwdHVyZVxuICBvcGVyYXRpb24uXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb25zdHJhaW50cywgb3B0cywgY2FsbGJhY2spIHtcbiAgdmFyIHBpbnN0O1xuXG4gIGZ1bmN0aW9uIGhhbmRsZUNhcHR1cmUoc3RyZWFtKSB7XG4gICAgY2FsbGJhY2sobnVsbCwgc3RyZWFtKTtcbiAgfVxuXG4gIGlmICh0eXBlb2Ygb3B0cyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRzO1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIC8vIHNlZSBpZiB3ZSBhcmUgdXNpbmcgYSBwbHVnaW5cbiAgcGluc3QgPSBwbHVnaW4oKG9wdHMgfHwge30pLnBsdWdpbnMpO1xuICBpZiAocGluc3QpIHtcbiAgICByZXR1cm4gcGluc3QuaW5pdChvcHRzLCBmdW5jdGlvbihlcnIpIHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ3BsdWdpbiBkb2VzIG5vdCBzdXBwb3J0IG1lZGlhIGNhcHR1cmUnKSk7XG4gICAgICB9XG5cbiAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEoY29uc3RyYWludHMsIGhhbmRsZUNhcHR1cmUsIGNhbGxiYWNrKTtcbiAgICB9KTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSAhPSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignZ2V0VXNlck1lZGlhIG5vdCBzdXBwb3J0ZWQnKSk7XG4gIH1cblxuICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzLCBoYW5kbGVDYXB0dXJlLCBjYWxsYmFjayk7XG59O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbi8qIGdsb2JhbCBsb2NhdGlvbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcnRjID0gcmVxdWlyZSgncnRjLXRvb2xzJyk7XG52YXIgbWJ1cyA9IHJlcXVpcmUoJ21idXMnKTtcbnZhciBkZXRlY3RQbHVnaW4gPSByZXF1aXJlKCdydGMtY29yZS9wbHVnaW4nKTtcbnZhciBkZWJ1ZyA9IHJ0Yy5sb2dnZXIoJ3J0Yy1xdWlja2Nvbm5lY3QnKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG5cbi8qKlxuICAjIHJ0Yy1xdWlja2Nvbm5lY3RcblxuICBUaGlzIGlzIGEgaGlnaCBsZXZlbCBoZWxwZXIgbW9kdWxlIGRlc2lnbmVkIHRvIGhlbHAgeW91IGdldCB1cFxuICBhbiBydW5uaW5nIHdpdGggV2ViUlRDIHJlYWxseSwgcmVhbGx5IHF1aWNrbHkuICBCeSB1c2luZyB0aGlzIG1vZHVsZSB5b3VcbiAgYXJlIHRyYWRpbmcgb2ZmIHNvbWUgZmxleGliaWxpdHksIHNvIGlmIHlvdSBuZWVkIGEgbW9yZSBmbGV4aWJsZVxuICBjb25maWd1cmF0aW9uIHlvdSBzaG91bGQgZHJpbGwgZG93biBpbnRvIGxvd2VyIGxldmVsIGNvbXBvbmVudHMgb2YgdGhlXG4gIFtydGMuaW9dKGh0dHA6Ly93d3cucnRjLmlvKSBzdWl0ZS4gIEluIHBhcnRpY3VsYXIgeW91IHNob3VsZCBjaGVjayBvdXRcbiAgW3J0Y10oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMpLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICBJbiB0aGUgc2ltcGxlc3QgY2FzZSB5b3Ugc2ltcGx5IGNhbGwgcXVpY2tjb25uZWN0IHdpdGggYSBzaW5nbGUgc3RyaW5nXG4gIGFyZ3VtZW50IHdoaWNoIHRlbGxzIHF1aWNrY29ubmVjdCB3aGljaCBzZXJ2ZXIgdG8gdXNlIGZvciBzaWduYWxpbmc6XG5cbiAgPDw8IGV4YW1wbGVzL3NpbXBsZS5qc1xuXG4gIDw8PCBkb2NzL2V2ZW50cy5tZFxuXG4gIDw8PCBkb2NzL2V4YW1wbGVzLm1kXG5cbiAgIyMgUmVnYXJkaW5nIFNpZ25hbGxpbmcgYW5kIGEgU2lnbmFsbGluZyBTZXJ2ZXJcblxuICBTaWduYWxpbmcgaXMgYW4gaW1wb3J0YW50IHBhcnQgb2Ygc2V0dGluZyB1cCBhIFdlYlJUQyBjb25uZWN0aW9uIGFuZCBmb3JcbiAgb3VyIGV4YW1wbGVzIHdlIHVzZSBvdXIgb3duIHRlc3QgaW5zdGFuY2Ugb2YgdGhlXG4gIFtydGMtc3dpdGNoYm9hcmRdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLXN3aXRjaGJvYXJkKS4gRm9yIHlvdXJcbiAgdGVzdGluZyBhbmQgZGV2ZWxvcG1lbnQgeW91IGFyZSBtb3JlIHRoYW4gd2VsY29tZSB0byB1c2UgdGhpcyBhbHNvLCBidXRcbiAganVzdCBiZSBhd2FyZSB0aGF0IHdlIHVzZSB0aGlzIGZvciBvdXIgdGVzdGluZyBzbyBpdCBtYXkgZ28gdXAgYW5kIGRvd25cbiAgYSBsaXR0bGUuICBJZiB5b3UgbmVlZCBzb21ldGhpbmcgbW9yZSBzdGFibGUsIHdoeSBub3QgY29uc2lkZXIgZGVwbG95aW5nXG4gIGFuIGluc3RhbmNlIG9mIHRoZSBzd2l0Y2hib2FyZCB5b3Vyc2VsZiAtIGl0J3MgcHJldHR5IGVhc3kgOilcblxuICAjIyBSZWZlcmVuY2VcblxuICBgYGBcbiAgcXVpY2tjb25uZWN0KHNpZ25hbGhvc3QsIG9wdHM/KSA9PiBydGMtc2lnYWxsZXIgaW5zdGFuY2UgKCsgaGVscGVycylcbiAgYGBgXG5cbiAgIyMjIFZhbGlkIFF1aWNrIENvbm5lY3QgT3B0aW9uc1xuXG4gIFRoZSBvcHRpb25zIHByb3ZpZGVkIHRvIHRoZSBgcnRjLXF1aWNrY29ubmVjdGAgbW9kdWxlIGZ1bmN0aW9uIGluZmx1ZW5jZSB0aGVcbiAgYmVoYXZpb3VyIG9mIHNvbWUgb2YgdGhlIHVuZGVybHlpbmcgY29tcG9uZW50cyB1c2VkIGZyb20gdGhlIHJ0Yy5pbyBzdWl0ZS5cblxuICBMaXN0ZWQgYmVsb3cgYXJlIHNvbWUgb2YgdGhlIGNvbW1vbmx5IHVzZWQgb3B0aW9uczpcblxuICAtIGBuc2AgKGRlZmF1bHQ6ICcnKVxuXG4gICAgQW4gb3B0aW9uYWwgbmFtZXNwYWNlIGZvciB5b3VyIHNpZ25hbGxpbmcgcm9vbS4gIFdoaWxlIHF1aWNrY29ubmVjdFxuICAgIHdpbGwgZ2VuZXJhdGUgYSB1bmlxdWUgaGFzaCBmb3IgdGhlIHJvb20sIHRoaXMgY2FuIGJlIG1hZGUgdG8gYmUgbW9yZVxuICAgIHVuaXF1ZSBieSBwcm92aWRpbmcgYSBuYW1lc3BhY2UuICBVc2luZyBhIG5hbWVzcGFjZSBtZWFucyB0d28gZGVtb3NcbiAgICB0aGF0IGhhdmUgZ2VuZXJhdGVkIHRoZSBzYW1lIGhhc2ggYnV0IHVzZSBhIGRpZmZlcmVudCBuYW1lc3BhY2Ugd2lsbCBiZVxuICAgIGluIGRpZmZlcmVudCByb29tcy5cblxuICAtIGByb29tYCAoZGVmYXVsdDogbnVsbCkgX2FkZGVkIDAuNl9cblxuICAgIFJhdGhlciB0aGFuIHVzZSB0aGUgaW50ZXJuYWwgaGFzaCBnZW5lcmF0aW9uXG4gICAgKHBsdXMgb3B0aW9uYWwgbmFtZXNwYWNlKSBmb3Igcm9vbSBuYW1lIGdlbmVyYXRpb24sIHNpbXBseSB1c2UgdGhpcyByb29tXG4gICAgbmFtZSBpbnN0ZWFkLiAgX19OT1RFOl9fIFVzZSBvZiB0aGUgYHJvb21gIG9wdGlvbiB0YWtlcyBwcmVjZW5kZW5jZSBvdmVyXG4gICAgYG5zYC5cblxuICAtIGBkZWJ1Z2AgKGRlZmF1bHQ6IGZhbHNlKVxuXG4gIFdyaXRlIHJ0Yy5pbyBzdWl0ZSBkZWJ1ZyBvdXRwdXQgdG8gdGhlIGJyb3dzZXIgY29uc29sZS5cblxuICAtIGBleHBlY3RlZExvY2FsU3RyZWFtc2AgKGRlZmF1bHQ6IG5vdCBzcGVjaWZpZWQpIF9hZGRlZCAzLjBfXG5cbiAgICBCeSBwcm92aWRpbmcgYSBwb3NpdGl2ZSBpbnRlZ2VyIHZhbHVlIGZvciB0aGlzIG9wdGlvbiB3aWxsIG1lYW4gdGhhdFxuICAgIHRoZSBjcmVhdGVkIHF1aWNrY29ubmVjdCBpbnN0YW5jZSB3aWxsIHdhaXQgdW50aWwgdGhlIHNwZWNpZmllZCBudW1iZXIgb2ZcbiAgICBzdHJlYW1zIGhhdmUgYmVlbiBhZGRlZCB0byB0aGUgcXVpY2tjb25uZWN0IFwidGVtcGxhdGVcIiBiZWZvcmUgYW5ub3VuY2luZ1xuICAgIHRvIHRoZSBzaWduYWxpbmcgc2VydmVyLlxuXG4gIC0gYG1hbnVhbEpvaW5gIChkZWZhdWx0OiBgZmFsc2VgKVxuXG4gICAgU2V0IHRoaXMgdmFsdWUgdG8gYHRydWVgIGlmIHlvdSB3b3VsZCBwcmVmZXIgdG8gY2FsbCB0aGUgYGpvaW5gIGZ1bmN0aW9uXG4gICAgdG8gY29ubmVjdGluZyB0byB0aGUgc2lnbmFsbGluZyBzZXJ2ZXIsIHJhdGhlciB0aGFuIGhhdmluZyB0aGF0IGhhcHBlblxuICAgIGF1dG9tYXRpY2FsbHkgYXMgc29vbiBhcyBxdWlja2Nvbm5lY3QgaXMgcmVhZHkgdG8uXG5cbiAgIyMjIyBPcHRpb25zIGZvciBQZWVyIENvbm5lY3Rpb24gQ3JlYXRpb25cblxuICBPcHRpb25zIHRoYXQgYXJlIHBhc3NlZCBvbnRvIHRoZVxuICBbcnRjLmNyZWF0ZUNvbm5lY3Rpb25dKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjI2NyZWF0ZWNvbm5lY3Rpb25vcHRzLWNvbnN0cmFpbnRzKVxuICBmdW5jdGlvbjpcblxuICAtIGBpY2VTZXJ2ZXJzYFxuXG4gIFRoaXMgcHJvdmlkZXMgYSBsaXN0IG9mIGljZSBzZXJ2ZXJzIHRoYXQgY2FuIGJlIHVzZWQgdG8gaGVscCBuZWdvdGlhdGUgYVxuICBjb25uZWN0aW9uIGJldHdlZW4gcGVlcnMuXG5cbiAgIyMjIyBPcHRpb25zIGZvciBQMlAgbmVnb3RpYXRpb25cblxuICBVbmRlciB0aGUgaG9vZCwgcXVpY2tjb25uZWN0IHVzZXMgdGhlXG4gIFtydGMvY291cGxlXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0YyNydGNjb3VwbGUpIGxvZ2ljLCBhbmQgdGhlIG9wdGlvbnNcbiAgcGFzc2VkIHRvIHF1aWNrY29ubmVjdCBhcmUgYWxzbyBwYXNzZWQgb250byB0aGlzIGZ1bmN0aW9uLlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2lnbmFsaG9zdCwgb3B0cykge1xuICB2YXIgaGFzaCA9IHR5cGVvZiBsb2NhdGlvbiAhPSAndW5kZWZpbmVkJyAmJiBsb2NhdGlvbi5oYXNoLnNsaWNlKDEpO1xuICB2YXIgc2lnbmFsbGVyID0gcmVxdWlyZSgncnRjLXBsdWdnYWJsZS1zaWduYWxsZXInKShleHRlbmQoeyBzaWduYWxsZXI6IHNpZ25hbGhvc3QgfSwgb3B0cykpO1xuICB2YXIgZ2V0UGVlckRhdGEgPSByZXF1aXJlKCcuL2xpYi9nZXRwZWVyZGF0YScpKHNpZ25hbGxlci5wZWVycyk7XG5cbiAgLy8gaW5pdCBjb25maWd1cmFibGUgdmFyc1xuICB2YXIgbnMgPSAob3B0cyB8fCB7fSkubnMgfHwgJyc7XG4gIHZhciByb29tID0gKG9wdHMgfHwge30pLnJvb207XG4gIHZhciBkZWJ1Z2dpbmcgPSAob3B0cyB8fCB7fSkuZGVidWc7XG4gIHZhciBhbGxvd0pvaW4gPSAhKG9wdHMgfHwge30pLm1hbnVhbEpvaW47XG4gIHZhciBwcm9maWxlID0ge307XG4gIHZhciBhbm5vdW5jZWQgPSBmYWxzZTtcblxuICAvLyBpbml0aWFsaXNlIGljZVNlcnZlcnMgdG8gdW5kZWZpbmVkXG4gIC8vIHdlIHdpbGwgbm90IGFubm91bmNlIHVudGlsIHRoZXNlIGhhdmUgYmVlbiBwcm9wZXJseSBpbml0aWFsaXNlZFxuICB2YXIgaWNlU2VydmVycztcblxuICAvLyBjb2xsZWN0IHRoZSBsb2NhbCBzdHJlYW1zXG4gIHZhciBsb2NhbFN0cmVhbXMgPSBbXTtcblxuICAvLyBjcmVhdGUgdGhlIGNhbGxzIG1hcFxuICB2YXIgY2FsbHMgPSBzaWduYWxsZXIuY2FsbHMgPSByZXF1aXJlKCcuL2xpYi9jYWxscycpKHNpZ25hbGxlciwgb3B0cyk7XG5cbiAgLy8gY3JlYXRlIHRoZSBrbm93biBkYXRhIGNoYW5uZWxzIHJlZ2lzdHJ5XG4gIHZhciBjaGFubmVscyA9IHt9O1xuXG4gIC8vIHNhdmUgdGhlIHBsdWdpbnMgcGFzc2VkIHRvIHRoZSBzaWduYWxsZXJcbiAgdmFyIHBsdWdpbnMgPSBzaWduYWxsZXIucGx1Z2lucyA9IChvcHRzIHx8IHt9KS5wbHVnaW5zIHx8IFtdO1xuICB2YXIgcGx1Z2luID0gZGV0ZWN0UGx1Z2luKHBsdWdpbnMpO1xuICB2YXIgcGx1Z2luUmVhZHk7XG5cbiAgLy8gY2hlY2sgaG93IG1hbnkgbG9jYWwgc3RyZWFtcyBoYXZlIGJlZW4gZXhwZWN0ZWQgKGRlZmF1bHQ6IDApXG4gIHZhciBleHBlY3RlZExvY2FsU3RyZWFtcyA9IHBhcnNlSW50KChvcHRzIHx8IHt9KS5leHBlY3RlZExvY2FsU3RyZWFtcywgMTApIHx8IDA7XG4gIHZhciBhbm5vdW5jZVRpbWVyID0gMDtcbiAgdmFyIHVwZGF0ZVRpbWVyID0gMDtcblxuICBmdW5jdGlvbiBjaGVja1JlYWR5VG9Bbm5vdW5jZSgpIHtcbiAgICBjbGVhclRpbWVvdXQoYW5ub3VuY2VUaW1lcik7XG4gICAgLy8gaWYgd2UgaGF2ZSBhbHJlYWR5IGFubm91bmNlZCBkbyBub3RoaW5nIVxuICAgIGlmIChhbm5vdW5jZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoISBhbGxvd0pvaW4pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGEgcGx1Z2luIGJ1dCBpdCdzIG5vdCBpbml0aWFsaXplZCB3ZSBhcmVuJ3QgcmVhZHlcbiAgICBpZiAocGx1Z2luICYmICghIHBsdWdpblJlYWR5KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGlmIHdlIGhhdmUgbm8gaWNlU2VydmVycyB3ZSBhcmVuJ3QgcmVhZHlcbiAgICBpZiAoISBpY2VTZXJ2ZXJzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gaWYgd2UgYXJlIHdhaXRpbmcgZm9yIGEgc2V0IG51bWJlciBvZiBzdHJlYW1zLCB0aGVuIHdhaXQgdW50aWwgd2UgaGF2ZVxuICAgIC8vIHRoZSByZXF1aXJlZCBudW1iZXJcbiAgICBpZiAoZXhwZWN0ZWRMb2NhbFN0cmVhbXMgJiYgbG9jYWxTdHJlYW1zLmxlbmd0aCA8IGV4cGVjdGVkTG9jYWxTdHJlYW1zKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gYW5ub3VuY2Ugb3Vyc2VsdmVzIHRvIG91ciBuZXcgZnJpZW5kXG4gICAgYW5ub3VuY2VUaW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZGF0YSA9IGV4dGVuZCh7IHJvb206IHJvb20gfSwgcHJvZmlsZSk7XG5cbiAgICAgIC8vIGFubm91bmNlIGFuZCBlbWl0IHRoZSBsb2NhbCBhbm5vdW5jZSBldmVudFxuICAgICAgc2lnbmFsbGVyLmFubm91bmNlKGRhdGEpO1xuICAgICAgYW5ub3VuY2VkID0gdHJ1ZTtcbiAgICB9LCAwKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbm5lY3QoaWQpIHtcbiAgICB2YXIgZGF0YSA9IGdldFBlZXJEYXRhKGlkKTtcbiAgICB2YXIgcGM7XG4gICAgdmFyIG1vbml0b3I7XG5cbiAgICAvLyBpZiB0aGUgcm9vbSBpcyBub3QgYSBtYXRjaCwgYWJvcnRcbiAgICBpZiAoZGF0YS5yb29tICE9PSByb29tKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gZW5kIGFueSBjYWxsIHRvIHRoaXMgaWQgc28gd2Uga25vdyB3ZSBhcmUgc3RhcnRpbmcgZnJlc2hcbiAgICBjYWxscy5lbmQoaWQpO1xuXG4gICAgLy8gY3JlYXRlIGEgcGVlciBjb25uZWN0aW9uXG4gICAgLy8gaWNlU2VydmVycyB0aGF0IGhhdmUgYmVlbiBjcmVhdGVkIHVzaW5nIGdlbmljZSB0YWtpbmcgcHJlY2VuZGVuY2VcbiAgICBwYyA9IHJ0Yy5jcmVhdGVDb25uZWN0aW9uKFxuICAgICAgZXh0ZW5kKHt9LCBvcHRzLCB7IGljZVNlcnZlcnM6IGljZVNlcnZlcnMgfSksXG4gICAgICAob3B0cyB8fCB7fSkuY29uc3RyYWludHNcbiAgICApO1xuXG4gICAgc2lnbmFsbGVyKCdwZWVyOmNvbm5lY3QnLCBkYXRhLmlkLCBwYywgZGF0YSk7XG5cbiAgICAvLyBhZGQgdGhpcyBjb25uZWN0aW9uIHRvIHRoZSBjYWxscyBsaXN0XG4gICAgY2FsbHMuY3JlYXRlKGRhdGEuaWQsIHBjKTtcblxuICAgIC8vIGFkZCB0aGUgbG9jYWwgc3RyZWFtc1xuICAgIGxvY2FsU3RyZWFtcy5mb3JFYWNoKGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgcGMuYWRkU3RyZWFtKHN0cmVhbSk7XG4gICAgfSk7XG5cbiAgICAvLyBhZGQgdGhlIGRhdGEgY2hhbm5lbHNcbiAgICAvLyBkbyB0aGlzIGRpZmZlcmVudGx5IGJhc2VkIG9uIHdoZXRoZXIgdGhlIGNvbm5lY3Rpb24gaXMgYVxuICAgIC8vIG1hc3RlciBvciBhIHNsYXZlIGNvbm5lY3Rpb25cbiAgICBpZiAoc2lnbmFsbGVyLmlzTWFzdGVyKGRhdGEuaWQpKSB7XG4gICAgICBkZWJ1ZygnaXMgbWFzdGVyLCBjcmVhdGluZyBkYXRhIGNoYW5uZWxzOiAnLCBPYmplY3Qua2V5cyhjaGFubmVscykpO1xuXG4gICAgICAvLyBjcmVhdGUgdGhlIGNoYW5uZWxzXG4gICAgICBPYmplY3Qua2V5cyhjaGFubmVscykuZm9yRWFjaChmdW5jdGlvbihsYWJlbCkge1xuICAgICAgIGdvdFBlZXJDaGFubmVsKHBjLmNyZWF0ZURhdGFDaGFubmVsKGxhYmVsLCBjaGFubmVsc1tsYWJlbF0pLCBwYywgZGF0YSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBwYy5vbmRhdGFjaGFubmVsID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIHZhciBjaGFubmVsID0gZXZ0ICYmIGV2dC5jaGFubmVsO1xuXG4gICAgICAgIC8vIGlmIHdlIGhhdmUgbm8gY2hhbm5lbCwgYWJvcnRcbiAgICAgICAgaWYgKCEgY2hhbm5lbCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaGFubmVsc1tjaGFubmVsLmxhYmVsXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgZ290UGVlckNoYW5uZWwoY2hhbm5lbCwgcGMsIGdldFBlZXJEYXRhKGlkKSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gY291cGxlIHRoZSBjb25uZWN0aW9uc1xuICAgIGRlYnVnKCdjb3VwbGluZyAnICsgc2lnbmFsbGVyLmlkICsgJyB0byAnICsgZGF0YS5pZCk7XG4gICAgbW9uaXRvciA9IHJ0Yy5jb3VwbGUocGMsIGlkLCBzaWduYWxsZXIsIGV4dGVuZCh7fSwgb3B0cywge1xuICAgICAgbG9nZ2VyOiBtYnVzKCdwYy4nICsgaWQsIHNpZ25hbGxlcilcbiAgICB9KSk7XG5cbiAgICBzaWduYWxsZXIoJ3BlZXI6Y291cGxlJywgaWQsIHBjLCBkYXRhLCBtb25pdG9yKTtcblxuICAgIC8vIG9uY2UgYWN0aXZlLCB0cmlnZ2VyIHRoZSBwZWVyIGNvbm5lY3QgZXZlbnRcbiAgICBtb25pdG9yLm9uY2UoJ2Nvbm5lY3RlZCcsIGNhbGxzLnN0YXJ0LmJpbmQobnVsbCwgaWQsIHBjLCBkYXRhKSk7XG4gICAgbW9uaXRvci5vbmNlKCdjbG9zZWQnLCBjYWxscy5lbmQuYmluZChudWxsLCBpZCkpO1xuXG4gICAgLy8gaWYgd2UgYXJlIHRoZSBtYXN0ZXIgY29ubm5lY3Rpb24sIGNyZWF0ZSB0aGUgb2ZmZXJcbiAgICAvLyBOT1RFOiB0aGlzIG9ubHkgcmVhbGx5IGZvciB0aGUgc2FrZSBvZiBwb2xpdGVuZXNzLCBhcyBydGMgY291cGxlXG4gICAgLy8gaW1wbGVtZW50YXRpb24gaGFuZGxlcyB0aGUgc2xhdmUgYXR0ZW1wdGluZyB0byBjcmVhdGUgYW4gb2ZmZXJcbiAgICBpZiAoc2lnbmFsbGVyLmlzTWFzdGVyKGlkKSkge1xuICAgICAgbW9uaXRvci5jcmVhdGVPZmZlcigpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEFjdGl2ZUNhbGwocGVlcklkKSB7XG4gICAgdmFyIGNhbGwgPSBjYWxscy5nZXQocGVlcklkKTtcblxuICAgIGlmICghIGNhbGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTm8gYWN0aXZlIGNhbGwgZm9yIHBlZXI6ICcgKyBwZWVySWQpO1xuICAgIH1cblxuICAgIHJldHVybiBjYWxsO1xuICB9XG5cbiAgZnVuY3Rpb24gZ290UGVlckNoYW5uZWwoY2hhbm5lbCwgcGMsIGRhdGEpIHtcbiAgICB2YXIgY2hhbm5lbE1vbml0b3I7XG5cbiAgICBmdW5jdGlvbiBjaGFubmVsUmVhZHkoKSB7XG4gICAgICB2YXIgY2FsbCA9IGNhbGxzLmdldChkYXRhLmlkKTtcbiAgICAgIHZhciBhcmdzID0gWyBkYXRhLmlkLCBjaGFubmVsLCBkYXRhLCBwYyBdO1xuXG4gICAgICAvLyBkZWNvdXBsZSB0aGUgY2hhbm5lbC5vbm9wZW4gbGlzdGVuZXJcbiAgICAgIGRlYnVnKCdyZXBvcnRpbmcgY2hhbm5lbCBcIicgKyBjaGFubmVsLmxhYmVsICsgJ1wiIHJlYWR5LCBoYXZlIGNhbGw6ICcgKyAoISFjYWxsKSk7XG4gICAgICBjbGVhckludGVydmFsKGNoYW5uZWxNb25pdG9yKTtcbiAgICAgIGNoYW5uZWwub25vcGVuID0gbnVsbDtcblxuICAgICAgLy8gc2F2ZSB0aGUgY2hhbm5lbFxuICAgICAgaWYgKGNhbGwpIHtcbiAgICAgICAgY2FsbC5jaGFubmVscy5zZXQoY2hhbm5lbC5sYWJlbCwgY2hhbm5lbCk7XG4gICAgICB9XG5cbiAgICAgIC8vIHRyaWdnZXIgdGhlICVjaGFubmVsLmxhYmVsJTpvcGVuIGV2ZW50XG4gICAgICBkZWJ1ZygndHJpZ2dlcmluZyBjaGFubmVsOm9wZW5lZCBldmVudHMgZm9yIGNoYW5uZWw6ICcgKyBjaGFubmVsLmxhYmVsKTtcblxuICAgICAgLy8gZW1pdCB0aGUgcGxhaW4gY2hhbm5lbDpvcGVuZWQgZXZlbnRcbiAgICAgIHNpZ25hbGxlci5hcHBseShzaWduYWxsZXIsIFsnY2hhbm5lbDpvcGVuZWQnXS5jb25jYXQoYXJncykpO1xuXG4gICAgICAvLyBlbWl0IHRoZSBjaGFubmVsOm9wZW5lZDolbGFiZWwlIGV2ZVxuICAgICAgc2lnbmFsbGVyLmFwcGx5KFxuICAgICAgICBzaWduYWxsZXIsXG4gICAgICAgIFsnY2hhbm5lbDpvcGVuZWQ6JyArIGNoYW5uZWwubGFiZWxdLmNvbmNhdChhcmdzKVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBkZWJ1ZygnY2hhbm5lbCAnICsgY2hhbm5lbC5sYWJlbCArICcgZGlzY292ZXJlZCBmb3IgcGVlcjogJyArIGRhdGEuaWQpO1xuICAgIGlmIChjaGFubmVsLnJlYWR5U3RhdGUgPT09ICdvcGVuJykge1xuICAgICAgcmV0dXJuIGNoYW5uZWxSZWFkeSgpO1xuICAgIH1cblxuICAgIGRlYnVnKCdjaGFubmVsIG5vdCByZWFkeSwgY3VycmVudCBzdGF0ZSA9ICcgKyBjaGFubmVsLnJlYWR5U3RhdGUpO1xuICAgIGNoYW5uZWwub25vcGVuID0gY2hhbm5lbFJlYWR5O1xuXG4gICAgLy8gbW9uaXRvciB0aGUgY2hhbm5lbCBvcGVuIChkb24ndCB0cnVzdCB0aGUgY2hhbm5lbCBvcGVuIGV2ZW50IGp1c3QgeWV0KVxuICAgIGNoYW5uZWxNb25pdG9yID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICBkZWJ1ZygnY2hlY2tpbmcgY2hhbm5lbCBzdGF0ZSwgY3VycmVudCBzdGF0ZSA9ICcgKyBjaGFubmVsLnJlYWR5U3RhdGUpO1xuICAgICAgaWYgKGNoYW5uZWwucmVhZHlTdGF0ZSA9PT0gJ29wZW4nKSB7XG4gICAgICAgIGNoYW5uZWxSZWFkeSgpO1xuICAgICAgfVxuICAgIH0sIDUwMCk7XG4gIH1cblxuICBmdW5jdGlvbiBpbml0UGx1Z2luKCkge1xuICAgIHJldHVybiBwbHVnaW4gJiYgcGx1Z2luLmluaXQob3B0cywgZnVuY3Rpb24oZXJyKSB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIHJldHVybiBjb25zb2xlLmVycm9yKCdDb3VsZCBub3QgaW5pdGlhbGl6ZSBwbHVnaW46ICcsIGVycik7XG4gICAgICB9XG5cbiAgICAgIHBsdWdpblJlYWR5ID0gdHJ1ZTtcbiAgICAgIGNoZWNrUmVhZHlUb0Fubm91bmNlKCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVMb2NhbEFubm91bmNlKGRhdGEpIHtcbiAgICAvLyBpZiB3ZSBzZW5kIGFuIGFubm91bmNlIHdpdGggYW4gdXBkYXRlZCByb29tIHRoZW4gdXBkYXRlIG91ciBsb2NhbCByb29tIG5hbWVcbiAgICBpZiAoZGF0YSAmJiB0eXBlb2YgZGF0YS5yb29tICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICByb29tID0gZGF0YS5yb29tO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZVBlZXJGaWx0ZXIoaWQsIGRhdGEpIHtcbiAgICAvLyBvbmx5IGNvbm5lY3Qgd2l0aCB0aGUgcGVlciBpZiB3ZSBhcmUgcmVhZHlcbiAgICBkYXRhLmFsbG93ID0gZGF0YS5hbGxvdyAmJiAobG9jYWxTdHJlYW1zLmxlbmd0aCA+PSBleHBlY3RlZExvY2FsU3RyZWFtcyk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVQZWVyVXBkYXRlKGRhdGEpIHtcbiAgICB2YXIgaWQgPSBkYXRhICYmIGRhdGEuaWQ7XG4gICAgdmFyIGFjdGl2ZUNhbGwgPSBpZCAmJiBjYWxscy5nZXQoaWQpO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSByZWNlaXZlZCBhbiB1cGRhdGUgZm9yIGEgcGVlciB0aGF0IGhhcyBubyBhY3RpdmUgY2FsbHMsXG4gICAgLy8gdGhlbiBwYXNzIHRoaXMgb250byB0aGUgYW5ub3VuY2UgaGFuZGxlclxuICAgIGlmIChpZCAmJiAoISBhY3RpdmVDYWxsKSkge1xuICAgICAgZGVidWcoJ3JlY2VpdmVkIHBlZXIgdXBkYXRlIGZyb20gcGVlciAnICsgaWQgKyAnLCBubyBhY3RpdmUgY2FsbHMnKTtcbiAgICAgIHNpZ25hbGxlci50byhpZCkuc2VuZCgnL3JlY29ubmVjdCcpO1xuICAgICAgcmV0dXJuIGNvbm5lY3QoaWQpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHRoZSByb29tIGlzIG5vdCBkZWZpbmVkLCB0aGVuIGdlbmVyYXRlIHRoZSByb29tIG5hbWVcbiAgaWYgKCEgcm9vbSkge1xuICAgIC8vIGlmIHRoZSBoYXNoIGlzIG5vdCBhc3NpZ25lZCwgdGhlbiBjcmVhdGUgYSByYW5kb20gaGFzaCB2YWx1ZVxuICAgIGlmICh0eXBlb2YgbG9jYXRpb24gIT0gJ3VuZGVmaW5lZCcgJiYgKCEgaGFzaCkpIHtcbiAgICAgIGhhc2ggPSBsb2NhdGlvbi5oYXNoID0gJycgKyAoTWF0aC5wb3coMiwgNTMpICogTWF0aC5yYW5kb20oKSk7XG4gICAgfVxuXG4gICAgcm9vbSA9IG5zICsgJyMnICsgaGFzaDtcbiAgfVxuXG4gIGlmIChkZWJ1Z2dpbmcpIHtcbiAgICBydGMubG9nZ2VyLmVuYWJsZS5hcHBseShydGMubG9nZ2VyLCBBcnJheS5pc0FycmF5KGRlYnVnKSA/IGRlYnVnZ2luZyA6IFsnKiddKTtcbiAgfVxuXG4gIHNpZ25hbGxlci5vbigncGVlcjphbm5vdW5jZScsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBjb25uZWN0KGRhdGEuaWQpO1xuICB9KTtcblxuICBzaWduYWxsZXIub24oJ3BlZXI6dXBkYXRlJywgaGFuZGxlUGVlclVwZGF0ZSk7XG5cbiAgc2lnbmFsbGVyLm9uKCdtZXNzYWdlOnJlY29ubmVjdCcsIGZ1bmN0aW9uKHNlbmRlcikge1xuICAgIGNvbm5lY3Qoc2VuZGVyLmlkKTtcbiAgfSk7XG5cblxuXG4gIC8qKlxuICAgICMjIyBRdWlja2Nvbm5lY3QgQnJvYWRjYXN0IGFuZCBEYXRhIENoYW5uZWwgSGVscGVyIEZ1bmN0aW9uc1xuXG4gICAgVGhlIGZvbGxvd2luZyBhcmUgZnVuY3Rpb25zIHRoYXQgYXJlIHBhdGNoZWQgaW50byB0aGUgYHJ0Yy1zaWduYWxsZXJgXG4gICAgaW5zdGFuY2UgdGhhdCBtYWtlIHdvcmtpbmcgd2l0aCBhbmQgY3JlYXRpbmcgZnVuY3Rpb25hbCBXZWJSVEMgYXBwbGljYXRpb25zXG4gICAgYSBsb3Qgc2ltcGxlci5cblxuICAqKi9cblxuICAvKipcbiAgICAjIyMjIGFkZFN0cmVhbVxuXG4gICAgYGBgXG4gICAgYWRkU3RyZWFtKHN0cmVhbTpNZWRpYVN0cmVhbSkgPT4gcWNcbiAgICBgYGBcblxuICAgIEFkZCB0aGUgc3RyZWFtIHRvIGFjdGl2ZSBjYWxscyBhbmQgYWxzbyBzYXZlIHRoZSBzdHJlYW0gc28gdGhhdCBpdFxuICAgIGNhbiBiZSBhZGRlZCB0byBmdXR1cmUgY2FsbHMuXG5cbiAgKiovXG4gIHNpZ25hbGxlci5icm9hZGNhc3QgPSBzaWduYWxsZXIuYWRkU3RyZWFtID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgbG9jYWxTdHJlYW1zLnB1c2goc3RyZWFtKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYW55IGFjdGl2ZSBjYWxscywgdGhlbiBhZGQgdGhlIHN0cmVhbVxuICAgIGNhbGxzLnZhbHVlcygpLmZvckVhY2goZnVuY3Rpb24oZGF0YSkge1xuICAgICAgZGF0YS5wYy5hZGRTdHJlYW0oc3RyZWFtKTtcbiAgICB9KTtcblxuICAgIGNoZWNrUmVhZHlUb0Fubm91bmNlKCk7XG4gICAgcmV0dXJuIHNpZ25hbGxlcjtcbiAgfTtcblxuICAvKipcbiAgICAjIyMjIGVuZENhbGxzKClcblxuICAgIFRoZSBgZW5kQ2FsbHNgIGZ1bmN0aW9uIHRlcm1pbmF0ZXMgYWxsIHRoZSBhY3RpdmUgY2FsbHMgdGhhdCBoYXZlIGJlZW5cbiAgICBjcmVhdGVkIGluIHRoaXMgcXVpY2tjb25uZWN0IGluc3RhbmNlLiAgQ2FsbGluZyBgZW5kQ2FsbHNgIGRvZXMgbm90XG4gICAga2lsbCB0aGUgY29ubmVjdGlvbiB3aXRoIHRoZSBzaWduYWxsaW5nIHNlcnZlci5cblxuICAqKi9cbiAgc2lnbmFsbGVyLmVuZENhbGxzID0gZnVuY3Rpb24oKSB7XG4gICAgY2FsbHMua2V5cygpLmZvckVhY2goY2FsbHMuZW5kKTtcbiAgfTtcblxuICAvKipcbiAgICAjIyMjIGNsb3NlKClcblxuICAgIFRoZSBgY2xvc2VgIGZ1bmN0aW9uIHByb3ZpZGVzIGEgY29udmVuaWVudCB3YXkgb2YgY2xvc2luZyBhbGwgYXNzb2NpYXRlZFxuICAgIHBlZXIgY29ubmVjdGlvbnMuICBUaGlzIGZ1bmN0aW9uIHNpbXBseSB1c2VzIHRoZSBgZW5kQ2FsbHNgIGZ1bmN0aW9uIGFuZFxuICAgIHRoZSB1bmRlcmx5aW5nIGBsZWF2ZWAgZnVuY3Rpb24gb2YgdGhlIHNpZ25hbGxlciB0byBkbyBhIFwiZnVsbCBjbGVhbnVwXCJcbiAgICBvZiBhbGwgY29ubmVjdGlvbnMuXG4gICoqL1xuICBzaWduYWxsZXIuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgICBzaWduYWxsZXIuZW5kQ2FsbHMoKTtcbiAgICBzaWduYWxsZXIubGVhdmUoKTtcbiAgfTtcblxuICAvKipcbiAgICAjIyMjIGNyZWF0ZURhdGFDaGFubmVsKGxhYmVsLCBjb25maWcpXG5cbiAgICBSZXF1ZXN0IHRoYXQgYSBkYXRhIGNoYW5uZWwgd2l0aCB0aGUgc3BlY2lmaWVkIGBsYWJlbGAgaXMgY3JlYXRlZCBvblxuICAgIHRoZSBwZWVyIGNvbm5lY3Rpb24uICBXaGVuIHRoZSBkYXRhIGNoYW5uZWwgaXMgb3BlbiBhbmQgYXZhaWxhYmxlLCBhblxuICAgIGV2ZW50IHdpbGwgYmUgdHJpZ2dlcmVkIHVzaW5nIHRoZSBsYWJlbCBvZiB0aGUgZGF0YSBjaGFubmVsLlxuXG4gICAgRm9yIGV4YW1wbGUsIGlmIGEgbmV3IGRhdGEgY2hhbm5lbCB3YXMgcmVxdWVzdGVkIHVzaW5nIHRoZSBmb2xsb3dpbmdcbiAgICBjYWxsOlxuXG4gICAgYGBganNcbiAgICB2YXIgcWMgPSBxdWlja2Nvbm5lY3QoJ2h0dHBzOi8vc3dpdGNoYm9hcmQucnRjLmlvLycpLmNyZWF0ZURhdGFDaGFubmVsKCd0ZXN0Jyk7XG4gICAgYGBgXG5cbiAgICBUaGVuIHdoZW4gdGhlIGRhdGEgY2hhbm5lbCBpcyByZWFkeSBmb3IgdXNlLCBhIGB0ZXN0Om9wZW5gIGV2ZW50IHdvdWxkXG4gICAgYmUgZW1pdHRlZCBieSBgcWNgLlxuXG4gICoqL1xuICBzaWduYWxsZXIuY3JlYXRlRGF0YUNoYW5uZWwgPSBmdW5jdGlvbihsYWJlbCwgb3B0cykge1xuICAgIC8vIGNyZWF0ZSBhIGNoYW5uZWwgb24gYWxsIGV4aXN0aW5nIGNhbGxzXG4gICAgY2FsbHMua2V5cygpLmZvckVhY2goZnVuY3Rpb24ocGVlcklkKSB7XG4gICAgICB2YXIgY2FsbCA9IGNhbGxzLmdldChwZWVySWQpO1xuICAgICAgdmFyIGRjO1xuXG4gICAgICAvLyBpZiB3ZSBhcmUgdGhlIG1hc3RlciBjb25uZWN0aW9uLCBjcmVhdGUgdGhlIGRhdGEgY2hhbm5lbFxuICAgICAgaWYgKGNhbGwgJiYgY2FsbC5wYyAmJiBzaWduYWxsZXIuaXNNYXN0ZXIocGVlcklkKSkge1xuICAgICAgICBkYyA9IGNhbGwucGMuY3JlYXRlRGF0YUNoYW5uZWwobGFiZWwsIG9wdHMpO1xuICAgICAgICBnb3RQZWVyQ2hhbm5lbChkYywgY2FsbC5wYywgZ2V0UGVlckRhdGEocGVlcklkKSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBzYXZlIHRoZSBkYXRhIGNoYW5uZWwgb3B0cyBpbiB0aGUgbG9jYWwgY2hhbm5lbHMgZGljdGlvbmFyeVxuICAgIGNoYW5uZWxzW2xhYmVsXSA9IG9wdHMgfHwgbnVsbDtcblxuICAgIHJldHVybiBzaWduYWxsZXI7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIyBqb2luKClcblxuICAgIFRoZSBgam9pbmAgZnVuY3Rpb24gaXMgdXNlZCB3aGVuIGBtYW51YWxKb2luYCBpcyBzZXQgdG8gdHJ1ZSB3aGVuIGNyZWF0aW5nXG4gICAgYSBxdWlja2Nvbm5lY3QgaW5zdGFuY2UuICBDYWxsIHRoZSBgam9pbmAgZnVuY3Rpb24gb25jZSB5b3UgYXJlIHJlYWR5IHRvXG4gICAgam9pbiB0aGUgc2lnbmFsbGluZyBzZXJ2ZXIgYW5kIGluaXRpYXRlIGNvbm5lY3Rpb25zIHdpdGggb3RoZXIgcGVvcGxlLlxuXG4gICoqL1xuICBzaWduYWxsZXIuam9pbiA9IGZ1bmN0aW9uKCkge1xuICAgIGFsbG93Sm9pbiA9IHRydWU7XG4gICAgY2hlY2tSZWFkeVRvQW5ub3VuY2UoKTtcbiAgfTtcblxuICAvKipcbiAgICAjIyMjIGBnZXQobmFtZSlgXG5cbiAgICBUaGUgYGdldGAgZnVuY3Rpb24gcmV0dXJucyB0aGUgcHJvcGVydHkgdmFsdWUgZm9yIHRoZSBzcGVjaWZpZWQgcHJvcGVydHkgbmFtZS5cbiAgKiovXG4gIHNpZ25hbGxlci5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHByb2ZpbGVbbmFtZV07XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIyBgZ2V0TG9jYWxTdHJlYW1zKClgXG5cbiAgICBSZXR1cm4gYSBjb3B5IG9mIHRoZSBsb2NhbCBzdHJlYW1zIHRoYXQgaGF2ZSBjdXJyZW50bHkgYmVlbiBjb25maWd1cmVkXG4gICoqL1xuICBzaWduYWxsZXIuZ2V0TG9jYWxTdHJlYW1zID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIFtdLmNvbmNhdChsb2NhbFN0cmVhbXMpO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyMgcmVhY3RpdmUoKVxuXG4gICAgRmxhZyB0aGF0IHRoaXMgc2Vzc2lvbiB3aWxsIGJlIGEgcmVhY3RpdmUgY29ubmVjdGlvbi5cblxuICAqKi9cbiAgc2lnbmFsbGVyLnJlYWN0aXZlID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gYWRkIHRoZSByZWFjdGl2ZSBmbGFnXG4gICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgb3B0cy5yZWFjdGl2ZSA9IHRydWU7XG5cbiAgICAvLyBjaGFpblxuICAgIHJldHVybiBzaWduYWxsZXI7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIyByZW1vdmVTdHJlYW1cblxuICAgIGBgYFxuICAgIHJlbW92ZVN0cmVhbShzdHJlYW06TWVkaWFTdHJlYW0pXG4gICAgYGBgXG5cbiAgICBSZW1vdmUgdGhlIHNwZWNpZmllZCBzdHJlYW0gZnJvbSBib3RoIHRoZSBsb2NhbCBzdHJlYW1zIHRoYXQgYXJlIHRvXG4gICAgYmUgY29ubmVjdGVkIHRvIG5ldyBwZWVycywgYW5kIGFsc28gZnJvbSBhbnkgYWN0aXZlIGNhbGxzLlxuXG4gICoqL1xuICBzaWduYWxsZXIucmVtb3ZlU3RyZWFtID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgdmFyIGxvY2FsSW5kZXggPSBsb2NhbFN0cmVhbXMuaW5kZXhPZihzdHJlYW0pO1xuXG4gICAgLy8gcmVtb3ZlIHRoZSBzdHJlYW0gZnJvbSBhbnkgYWN0aXZlIGNhbGxzXG4gICAgY2FsbHMudmFsdWVzKCkuZm9yRWFjaChmdW5jdGlvbihjYWxsKSB7XG4gICAgICBjYWxsLnBjLnJlbW92ZVN0cmVhbShzdHJlYW0pO1xuICAgIH0pO1xuXG4gICAgLy8gcmVtb3ZlIHRoZSBzdHJlYW0gZnJvbSB0aGUgbG9jYWxTdHJlYW1zIGFycmF5XG4gICAgaWYgKGxvY2FsSW5kZXggPj0gMCkge1xuICAgICAgbG9jYWxTdHJlYW1zLnNwbGljZShsb2NhbEluZGV4LCAxKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2lnbmFsbGVyO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyMgcmVxdWVzdENoYW5uZWxcblxuICAgIGBgYFxuICAgIHJlcXVlc3RDaGFubmVsKHRhcmdldElkLCBsYWJlbCwgY2FsbGJhY2spXG4gICAgYGBgXG5cbiAgICBUaGlzIGlzIGEgZnVuY3Rpb24gdGhhdCBjYW4gYmUgdXNlZCB0byByZXNwb25kIHRvIHJlbW90ZSBwZWVycyBzdXBwbHlpbmdcbiAgICBhIGRhdGEgY2hhbm5lbCBhcyBwYXJ0IG9mIHRoZWlyIGNvbmZpZ3VyYXRpb24uICBBcyBwZXIgdGhlIGByZWNlaXZlU3RyZWFtYFxuICAgIGZ1bmN0aW9uIHRoaXMgZnVuY3Rpb24gd2lsbCBlaXRoZXIgZmlyZSB0aGUgY2FsbGJhY2sgaW1tZWRpYXRlbHkgaWYgdGhlXG4gICAgY2hhbm5lbCBpcyBhbHJlYWR5IGF2YWlsYWJsZSwgb3Igb25jZSB0aGUgY2hhbm5lbCBoYXMgYmVlbiBkaXNjb3ZlcmVkIG9uXG4gICAgdGhlIGNhbGwuXG5cbiAgKiovXG4gIHNpZ25hbGxlci5yZXF1ZXN0Q2hhbm5lbCA9IGZ1bmN0aW9uKHRhcmdldElkLCBsYWJlbCwgY2FsbGJhY2spIHtcbiAgICB2YXIgY2FsbCA9IGdldEFjdGl2ZUNhbGwodGFyZ2V0SWQpO1xuICAgIHZhciBjaGFubmVsID0gY2FsbCAmJiBjYWxsLmNoYW5uZWxzLmdldChsYWJlbCk7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIHRoZW4gY2hhbm5lbCB0cmlnZ2VyIHRoZSBjYWxsYmFjayBpbW1lZGlhdGVseVxuICAgIGlmIChjaGFubmVsKSB7XG4gICAgICBjYWxsYmFjayhudWxsLCBjaGFubmVsKTtcbiAgICAgIHJldHVybiBzaWduYWxsZXI7XG4gICAgfVxuXG4gICAgLy8gaWYgbm90LCB3YWl0IGZvciBpdFxuICAgIHNpZ25hbGxlci5vbmNlKCdjaGFubmVsOm9wZW5lZDonICsgbGFiZWwsIGZ1bmN0aW9uKGlkLCBkYykge1xuICAgICAgY2FsbGJhY2sobnVsbCwgZGMpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHNpZ25hbGxlcjtcbiAgfTtcblxuICAvKipcbiAgICAjIyMjIHJlcXVlc3RTdHJlYW1cblxuICAgIGBgYFxuICAgIHJlcXVlc3RTdHJlYW0odGFyZ2V0SWQsIGlkeCwgY2FsbGJhY2spXG4gICAgYGBgXG5cbiAgICBVc2VkIHRvIHJlcXVlc3QgYSByZW1vdGUgc3RyZWFtIGZyb20gYSBxdWlja2Nvbm5lY3QgaW5zdGFuY2UuIElmIHRoZVxuICAgIHN0cmVhbSBpcyBhbHJlYWR5IGF2YWlsYWJsZSBpbiB0aGUgY2FsbHMgcmVtb3RlIHN0cmVhbXMsIHRoZW4gdGhlIGNhbGxiYWNrXG4gICAgd2lsbCBiZSB0cmlnZ2VyZWQgaW1tZWRpYXRlbHksIG90aGVyd2lzZSB0aGlzIGZ1bmN0aW9uIHdpbGwgbW9uaXRvclxuICAgIGBzdHJlYW06YWRkZWRgIGV2ZW50cyBhbmQgd2FpdCBmb3IgYSBtYXRjaC5cblxuICAgIEluIHRoZSBjYXNlIHRoYXQgYW4gdW5rbm93biB0YXJnZXQgaXMgcmVxdWVzdGVkLCB0aGVuIGFuIGV4Y2VwdGlvbiB3aWxsXG4gICAgYmUgdGhyb3duLlxuICAqKi9cbiAgc2lnbmFsbGVyLnJlcXVlc3RTdHJlYW0gPSBmdW5jdGlvbih0YXJnZXRJZCwgaWR4LCBjYWxsYmFjaykge1xuICAgIHZhciBjYWxsID0gZ2V0QWN0aXZlQ2FsbCh0YXJnZXRJZCk7XG4gICAgdmFyIHN0cmVhbTtcblxuICAgIGZ1bmN0aW9uIHdhaXRGb3JTdHJlYW0ocGVlcklkKSB7XG4gICAgICBpZiAocGVlcklkICE9PSB0YXJnZXRJZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGdldCB0aGUgc3RyZWFtXG4gICAgICBzdHJlYW0gPSBjYWxsLnBjLmdldFJlbW90ZVN0cmVhbXMoKVtpZHhdO1xuXG4gICAgICAvLyBpZiB3ZSBoYXZlIHRoZSBzdHJlYW0sIHRoZW4gcmVtb3ZlIHRoZSBsaXN0ZW5lciBhbmQgdHJpZ2dlciB0aGUgY2JcbiAgICAgIGlmIChzdHJlYW0pIHtcbiAgICAgICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCdzdHJlYW06YWRkZWQnLCB3YWl0Rm9yU3RyZWFtKTtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgc3RyZWFtKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBsb29rIGZvciB0aGUgc3RyZWFtIGluIHRoZSByZW1vdGUgc3RyZWFtcyBvZiB0aGUgY2FsbFxuICAgIHN0cmVhbSA9IGNhbGwucGMuZ2V0UmVtb3RlU3RyZWFtcygpW2lkeF07XG5cbiAgICAvLyBpZiB3ZSBmb3VuZCB0aGUgc3RyZWFtIHRoZW4gdHJpZ2dlciB0aGUgY2FsbGJhY2tcbiAgICBpZiAoc3RyZWFtKSB7XG4gICAgICBjYWxsYmFjayhudWxsLCBzdHJlYW0pO1xuICAgICAgcmV0dXJuIHNpZ25hbGxlcjtcbiAgICB9XG5cbiAgICAvLyBvdGhlcndpc2Ugd2FpdCBmb3IgdGhlIHN0cmVhbVxuICAgIHNpZ25hbGxlci5vbignc3RyZWFtOmFkZGVkJywgd2FpdEZvclN0cmVhbSk7XG4gICAgcmV0dXJuIHNpZ25hbGxlcjtcbiAgfTtcblxuICAvKipcbiAgICAjIyMjIHByb2ZpbGUoZGF0YSlcblxuICAgIFVwZGF0ZSB0aGUgcHJvZmlsZSBkYXRhIHdpdGggdGhlIGF0dGFjaGVkIGluZm9ybWF0aW9uLCBzbyB3aGVuXG4gICAgdGhlIHNpZ25hbGxlciBhbm5vdW5jZXMgaXQgaW5jbHVkZXMgdGhpcyBkYXRhIGluIGFkZGl0aW9uIHRvIGFueVxuICAgIHJvb20gYW5kIGlkIGluZm9ybWF0aW9uLlxuXG4gICoqL1xuICBzaWduYWxsZXIucHJvZmlsZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBleHRlbmQocHJvZmlsZSwgZGF0YSk7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGFscmVhZHkgYW5ub3VuY2VkLCB0aGVuIHJlYW5ub3VuY2Ugb3VyIHByb2ZpbGUgdG8gcHJvdmlkZVxuICAgIC8vIG90aGVycyBhIGBwZWVyOnVwZGF0ZWAgZXZlbnRcbiAgICBpZiAoYW5ub3VuY2VkKSB7XG4gICAgICBjbGVhclRpbWVvdXQodXBkYXRlVGltZXIpO1xuICAgICAgdXBkYXRlVGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBzaWduYWxsZXIuYW5ub3VuY2UocHJvZmlsZSk7XG4gICAgICB9LCAob3B0cyB8fCB7fSkudXBkYXRlRGVsYXkgfHwgMTAwMCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNpZ25hbGxlcjtcbiAgfTtcblxuICAvKipcbiAgICAjIyMjIHdhaXRGb3JDYWxsXG5cbiAgICBgYGBcbiAgICB3YWl0Rm9yQ2FsbCh0YXJnZXRJZCwgY2FsbGJhY2spXG4gICAgYGBgXG5cbiAgICBXYWl0IGZvciBhIGNhbGwgZnJvbSB0aGUgc3BlY2lmaWVkIHRhcmdldElkLiAgSWYgdGhlIGNhbGwgaXMgYWxyZWFkeVxuICAgIGFjdGl2ZSB0aGUgY2FsbGJhY2sgd2lsbCBiZSBmaXJlZCBpbW1lZGlhdGVseSwgb3RoZXJ3aXNlIHdlIHdpbGwgd2FpdFxuICAgIGZvciBhIGBjYWxsOnN0YXJ0ZWRgIGV2ZW50IHRoYXQgbWF0Y2hlcyB0aGUgcmVxdWVzdGVkIGB0YXJnZXRJZGBcblxuICAqKi9cbiAgc2lnbmFsbGVyLndhaXRGb3JDYWxsID0gZnVuY3Rpb24odGFyZ2V0SWQsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGNhbGwgPSBjYWxscy5nZXQodGFyZ2V0SWQpO1xuXG4gICAgaWYgKGNhbGwgJiYgY2FsbC5hY3RpdmUpIHtcbiAgICAgIGNhbGxiYWNrKG51bGwsIGNhbGwucGMpO1xuICAgICAgcmV0dXJuIHNpZ25hbGxlcjtcbiAgICB9XG5cbiAgICBzaWduYWxsZXIub24oJ2NhbGw6c3RhcnRlZCcsIGZ1bmN0aW9uIGhhbmRsZU5ld0NhbGwoaWQpIHtcbiAgICAgIGlmIChpZCA9PT0gdGFyZ2V0SWQpIHtcbiAgICAgICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCdjYWxsOnN0YXJ0ZWQnLCBoYW5kbGVOZXdDYWxsKTtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgY2FsbHMuZ2V0KGlkKS5wYyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gaWYgd2UgaGF2ZSBhbiBleHBlY3RlZCBudW1iZXIgb2YgbG9jYWwgc3RyZWFtcywgdGhlbiB1c2UgYSBmaWx0ZXIgdG9cbiAgLy8gY2hlY2sgaWYgd2Ugc2hvdWxkIHJlc3BvbmRcbiAgaWYgKGV4cGVjdGVkTG9jYWxTdHJlYW1zKSB7XG4gICAgc2lnbmFsbGVyLm9uKCdwZWVyOmZpbHRlcicsIGhhbmRsZVBlZXJGaWx0ZXIpO1xuICB9XG5cbiAgLy8gcmVzcG9uZCB0byBsb2NhbCBhbm5vdW5jZSBtZXNzYWdlc1xuICBzaWduYWxsZXIub24oJ2xvY2FsOmFubm91bmNlJywgaGFuZGxlTG9jYWxBbm5vdW5jZSk7XG5cbiAgLy8gaGFuZGxlIHBpbmcgbWVzc2FnZXNcbiAgc2lnbmFsbGVyLm9uKCdtZXNzYWdlOnBpbmcnLCBjYWxscy5waW5nKTtcblxuICAvLyB1c2UgZ2VuaWNlIHRvIGZpbmQgb3VyIGljZVNlcnZlcnNcbiAgcmVxdWlyZSgncnRjLWNvcmUvZ2VuaWNlJykob3B0cywgZnVuY3Rpb24oZXJyLCBzZXJ2ZXJzKSB7XG4gICAgaWYgKGVycikge1xuICAgICAgcmV0dXJuIGNvbnNvbGUuZXJyb3IoJ2NvdWxkIG5vdCBmaW5kIGljZVNlcnZlcnM6ICcsIGVycik7XG4gICAgfVxuXG4gICAgaWNlU2VydmVycyA9IHNlcnZlcnM7XG4gICAgY2hlY2tSZWFkeVRvQW5ub3VuY2UoKTtcbiAgfSk7XG5cbiAgLy8gaWYgd2UgcGx1Z2luIGlzIGFjdGl2ZSwgdGhlbiBpbml0aWFsaXplIGl0XG4gIGlmIChwbHVnaW4pIHtcbiAgICBpbml0UGx1Z2luKCk7XG4gIH1cblxuICAvLyBwYXNzIHRoZSBzaWduYWxsZXIgb25cbiAgcmV0dXJuIHNpZ25hbGxlcjtcbn07XG4iLCJ2YXIgcnRjID0gcmVxdWlyZSgncnRjLXRvb2xzJyk7XG52YXIgZGVidWcgPSBydGMubG9nZ2VyKCdydGMtcXVpY2tjb25uZWN0Jyk7XG52YXIgY2xlYW51cCA9IHJlcXVpcmUoJ3J0Yy10b29scy9jbGVhbnVwJyk7XG52YXIgZ2V0YWJsZSA9IHJlcXVpcmUoJ2NvZy9nZXRhYmxlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2lnbmFsbGVyLCBvcHRzKSB7XG4gIHZhciBjYWxscyA9IGdldGFibGUoe30pO1xuICB2YXIgZ2V0UGVlckRhdGEgPSByZXF1aXJlKCcuL2dldHBlZXJkYXRhJykoc2lnbmFsbGVyLnBlZXJzKTtcbiAgdmFyIGhlYXJ0YmVhdDtcblxuICBmdW5jdGlvbiBjcmVhdGUoaWQsIHBjKSB7XG4gICAgY2FsbHMuc2V0KGlkLCB7XG4gICAgICBhY3RpdmU6IGZhbHNlLFxuICAgICAgcGM6IHBjLFxuICAgICAgY2hhbm5lbHM6IGdldGFibGUoe30pLFxuICAgICAgc3RyZWFtczogW10sXG4gICAgICBsYXN0cGluZzogRGF0ZS5ub3coKVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlU3RyZWFtQWRkSGFuZGxlcihpZCkge1xuICAgIHJldHVybiBmdW5jdGlvbihldnQpIHtcbiAgICAgIGRlYnVnKCdwZWVyICcgKyBpZCArICcgYWRkZWQgc3RyZWFtJyk7XG4gICAgICB1cGRhdGVSZW1vdGVTdHJlYW1zKGlkKTtcbiAgICAgIHJlY2VpdmVSZW1vdGVTdHJlYW0oaWQpKGV2dC5zdHJlYW0pO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVTdHJlYW1SZW1vdmVIYW5kbGVyKGlkKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgZGVidWcoJ3BlZXIgJyArIGlkICsgJyByZW1vdmVkIHN0cmVhbScpO1xuICAgICAgdXBkYXRlUmVtb3RlU3RyZWFtcyhpZCk7XG4gICAgICBzaWduYWxsZXIoJ3N0cmVhbTpyZW1vdmVkJywgaWQsIGV2dC5zdHJlYW0pO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBlbmQoaWQpIHtcbiAgICB2YXIgY2FsbCA9IGNhbGxzLmdldChpZCk7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIG5vIGRhdGEsIHRoZW4gZG8gbm90aGluZ1xuICAgIGlmICghIGNhbGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBpZiB3ZSBoYXZlIG5vIGRhdGEsIHRoZW4gcmV0dXJuXG4gICAgY2FsbC5jaGFubmVscy5rZXlzKCkuZm9yRWFjaChmdW5jdGlvbihsYWJlbCkge1xuICAgICAgdmFyIGNoYW5uZWwgPSBjYWxsLmNoYW5uZWxzLmdldChsYWJlbCk7XG4gICAgICB2YXIgYXJncyA9IFtpZCwgY2hhbm5lbCwgbGFiZWxdO1xuXG4gICAgICAvLyBlbWl0IHRoZSBwbGFpbiBjaGFubmVsOmNsb3NlZCBldmVudFxuICAgICAgc2lnbmFsbGVyLmFwcGx5KHNpZ25hbGxlciwgWydjaGFubmVsOmNsb3NlZCddLmNvbmNhdChhcmdzKSk7XG5cbiAgICAgIC8vIGVtaXQgdGhlIGxhYmVsbGVkIHZlcnNpb24gb2YgdGhlIGV2ZW50XG4gICAgICBzaWduYWxsZXIuYXBwbHkoc2lnbmFsbGVyLCBbJ2NoYW5uZWw6Y2xvc2VkOicgKyBsYWJlbF0uY29uY2F0KGFyZ3MpKTtcblxuICAgICAgLy8gZGVjb3VwbGUgdGhlIGV2ZW50c1xuICAgICAgY2hhbm5lbC5vbm9wZW4gPSBudWxsO1xuICAgIH0pO1xuXG4gICAgLy8gdHJpZ2dlciBzdHJlYW06cmVtb3ZlZCBldmVudHMgZm9yIGVhY2ggb2YgdGhlIHJlbW90ZXN0cmVhbXMgaW4gdGhlIHBjXG4gICAgY2FsbC5zdHJlYW1zLmZvckVhY2goZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICBzaWduYWxsZXIoJ3N0cmVhbTpyZW1vdmVkJywgaWQsIHN0cmVhbSk7XG4gICAgfSk7XG5cbiAgICAvLyBkZWxldGUgdGhlIGNhbGwgZGF0YVxuICAgIGNhbGxzLmRlbGV0ZShpZCk7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIG5vIG1vcmUgY2FsbHMsIGRpc2FibGUgdGhlIGhlYXJ0YmVhdFxuICAgIGlmIChjYWxscy5rZXlzKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXNldEhlYXJ0YmVhdCgpO1xuICAgIH1cblxuICAgIC8vIHRyaWdnZXIgdGhlIGNhbGw6ZW5kZWQgZXZlbnRcbiAgICBzaWduYWxsZXIoJ2NhbGw6ZW5kZWQnLCBpZCwgY2FsbC5wYyk7XG5cbiAgICAvLyBlbnN1cmUgdGhlIHBlZXIgY29ubmVjdGlvbiBpcyBwcm9wZXJseSBjbGVhbmVkIHVwXG4gICAgY2xlYW51cChjYWxsLnBjKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBpbmcoc2VuZGVyKSB7XG4gICAgdmFyIGNhbGwgPSBjYWxscy5nZXQoc2VuZGVyICYmIHNlbmRlci5pZCk7XG5cbiAgICAvLyBzZXQgdGhlIGxhc3QgcGluZyBmb3IgdGhlIGRhdGFcbiAgICBpZiAoY2FsbCkge1xuICAgICAgY2FsbC5sYXN0cGluZyA9IERhdGUubm93KCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVjZWl2ZVJlbW90ZVN0cmVhbShpZCkge1xuICAgIHJldHVybiBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgIHNpZ25hbGxlcignc3RyZWFtOmFkZGVkJywgaWQsIHN0cmVhbSwgZ2V0UGVlckRhdGEoaWQpKTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gcmVzZXRIZWFydGJlYXQoKSB7XG4gICAgY2xlYXJJbnRlcnZhbChoZWFydGJlYXQpO1xuICAgIGhlYXJ0YmVhdCA9IDA7XG4gIH1cblxuICBmdW5jdGlvbiBzdGFydChpZCwgcGMsIGRhdGEpIHtcbiAgICB2YXIgY2FsbCA9IGNhbGxzLmdldChpZCk7XG4gICAgdmFyIHN0cmVhbXMgPSBbXS5jb25jYXQocGMuZ2V0UmVtb3RlU3RyZWFtcygpKTtcblxuICAgIC8vIGZsYWcgdGhlIGNhbGwgYXMgYWN0aXZlXG4gICAgY2FsbC5hY3RpdmUgPSB0cnVlO1xuICAgIGNhbGwuc3RyZWFtcyA9IFtdLmNvbmNhdChwYy5nZXRSZW1vdGVTdHJlYW1zKCkpO1xuXG4gICAgcGMub25hZGRzdHJlYW0gPSBjcmVhdGVTdHJlYW1BZGRIYW5kbGVyKGlkKTtcbiAgICBwYy5vbnJlbW92ZXN0cmVhbSA9IGNyZWF0ZVN0cmVhbVJlbW92ZUhhbmRsZXIoaWQpO1xuXG4gICAgZGVidWcoc2lnbmFsbGVyLmlkICsgJyAtICcgKyBpZCArICcgY2FsbCBzdGFydDogJyArIHN0cmVhbXMubGVuZ3RoICsgJyBzdHJlYW1zJyk7XG4gICAgc2lnbmFsbGVyKCdjYWxsOnN0YXJ0ZWQnLCBpZCwgcGMsIGRhdGEpO1xuXG4gICAgLy8gY29uZmlndXJlIHRoZSBoZWFydGJlYXQgdGltZXJcbiAgICBoZWFydGJlYXQgPSBoZWFydGJlYXQgfHwgcmVxdWlyZSgnLi9oZWFydGJlYXQnKShzaWduYWxsZXIsIGNhbGxzLCBvcHRzKTtcblxuICAgIC8vIGV4YW1pbmUgdGhlIGV4aXN0aW5nIHJlbW90ZSBzdHJlYW1zIGFmdGVyIGEgc2hvcnQgZGVsYXlcbiAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgLy8gaXRlcmF0ZSB0aHJvdWdoIGFueSByZW1vdGUgc3RyZWFtc1xuICAgICAgc3RyZWFtcy5mb3JFYWNoKHJlY2VpdmVSZW1vdGVTdHJlYW0oaWQpKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZVJlbW90ZVN0cmVhbXMoaWQpIHtcbiAgICB2YXIgY2FsbCA9IGNhbGxzLmdldChpZCk7XG5cbiAgICBpZiAoY2FsbCAmJiBjYWxsLnBjKSB7XG4gICAgICBjYWxsLnN0cmVhbXMgPSBbXS5jb25jYXQoY2FsbC5wYy5nZXRSZW1vdGVTdHJlYW1zKCkpO1xuICAgIH1cbiAgfVxuXG4gIGNhbGxzLmNyZWF0ZSA9IGNyZWF0ZTtcbiAgY2FsbHMuZW5kID0gZW5kO1xuICBjYWxscy5waW5nID0gcGluZztcbiAgY2FsbHMuc3RhcnQgPSBzdGFydDtcblxuICByZXR1cm4gY2FsbHM7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwZWVycykge1xuICByZXR1cm4gZnVuY3Rpb24oaWQpIHtcbiAgICB2YXIgcGVlciA9IHBlZXJzLmdldChpZCk7XG4gICAgcmV0dXJuIHBlZXIgJiYgcGVlci5kYXRhO1xuICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2lnbmFsbGVyLCBjYWxscywgb3B0cykge1xuICB2YXIgaGVhcnRiZWF0ID0gKG9wdHMgfHwge30pLmhlYXJ0YmVhdCB8fCAyNTAwO1xuICB2YXIgaGVhcnRiZWF0VGltZXIgPSAwO1xuXG4gIGZ1bmN0aW9uIHNlbmQoKSB7XG4gICAgdmFyIHRpY2tJbmFjdGl2ZSA9IChEYXRlLm5vdygpIC0gKGhlYXJ0YmVhdCAqIDQpKTtcblxuICAgIC8vIGl0ZXJhdGUgdGhyb3VnaCBvdXIgZXN0YWJsaXNoZWQgY2FsbHNcbiAgICBjYWxscy5rZXlzKCkuZm9yRWFjaChmdW5jdGlvbihpZCkge1xuICAgICAgdmFyIGNhbGwgPSBjYWxscy5nZXQoaWQpO1xuXG4gICAgICAvLyBpZiB0aGUgY2FsbCBwaW5nIGlzIHRvbyBvbGQsIGVuZCB0aGUgY2FsbFxuICAgICAgaWYgKGNhbGwubGFzdHBpbmcgPCB0aWNrSW5hY3RpdmUpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxzLmVuZChpZCk7XG4gICAgICB9XG5cbiAgICAgIC8vIHNlbmQgYSBwaW5nIG1lc3NhZ2VcbiAgICAgIHNpZ25hbGxlci50byhpZCkuc2VuZCgnL3BpbmcnKTtcbiAgICB9KTtcbiAgfVxuXG4gIGlmICghIGhlYXJ0YmVhdCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHJldHVybiBzZXRJbnRlcnZhbChzZW5kLCBoZWFydGJlYXQpO1xufTtcbiIsInZhciByZURlbGltID0gL1tcXC5cXDpdLztcblxuLyoqXG4gICMgbWJ1c1xuXG4gIElmIE5vZGUncyBFdmVudEVtaXR0ZXIgYW5kIEV2ZSB3ZXJlIHRvIGhhdmUgYSBjaGlsZCwgaXQgbWlnaHQgbG9vayBzb21ldGhpbmcgbGlrZSB0aGlzLlxuICBObyB3aWxkY2FyZCBzdXBwb3J0IGF0IHRoaXMgc3RhZ2UgdGhvdWdoLi4uXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIDw8PCBkb2NzL3VzYWdlLm1kXG5cbiAgIyMgUmVmZXJlbmNlXG5cbiAgIyMjIGBtYnVzKG5hbWVzcGFjZT8sIHBhcmVudD8sIHNjb3BlPylgXG5cbiAgQ3JlYXRlIGEgbmV3IG1lc3NhZ2UgYnVzIHdpdGggYG5hbWVzcGFjZWAgaW5oZXJpdGluZyBmcm9tIHRoZSBgcGFyZW50YFxuICBtYnVzIGluc3RhbmNlLiAgSWYgZXZlbnRzIGZyb20gdGhpcyBtZXNzYWdlIGJ1cyBzaG91bGQgYmUgdHJpZ2dlcmVkIHdpdGhcbiAgYSBzcGVjaWZpYyBgdGhpc2Agc2NvcGUsIHRoZW4gc3BlY2lmeSBpdCB1c2luZyB0aGUgYHNjb3BlYCBhcmd1bWVudC5cblxuKiovXG5cbnZhciBjcmVhdGVCdXMgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG5hbWVzcGFjZSwgcGFyZW50LCBzY29wZSkge1xuICB2YXIgcmVnaXN0cnkgPSB7fTtcbiAgdmFyIGZlZWRzID0gW107XG5cbiAgZnVuY3Rpb24gYnVzKG5hbWUpIHtcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICB2YXIgZGVsaW1pdGVkID0gbm9ybWFsaXplKG5hbWUpO1xuICAgIHZhciBoYW5kbGVycyA9IHJlZ2lzdHJ5W2RlbGltaXRlZF0gfHwgW107XG4gICAgdmFyIHJlc3VsdHM7XG5cbiAgICAvLyBzZW5kIHRocm91Z2ggdGhlIGZlZWRzXG4gICAgZmVlZHMuZm9yRWFjaChmdW5jdGlvbihmZWVkKSB7XG4gICAgICBmZWVkKHsgbmFtZTogZGVsaW1pdGVkLCBhcmdzOiBhcmdzIH0pO1xuICAgIH0pO1xuXG4gICAgLy8gcnVuIHRoZSByZWdpc3RlcmVkIGhhbmRsZXJzXG4gICAgcmVzdWx0cyA9IFtdLmNvbmNhdChoYW5kbGVycykubWFwKGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgIHJldHVybiBoYW5kbGVyLmFwcGx5KHNjb3BlIHx8IHRoaXMsIGFyZ3MpO1xuICAgIH0pO1xuXG4gICAgLy8gcnVuIHRoZSBwYXJlbnQgaGFuZGxlcnNcbiAgICBpZiAoYnVzLnBhcmVudCkge1xuICAgICAgcmVzdWx0cyA9IHJlc3VsdHMuY29uY2F0KFxuICAgICAgICBidXMucGFyZW50LmFwcGx5KFxuICAgICAgICAgIHNjb3BlIHx8IHRoaXMsXG4gICAgICAgICAgWyhuYW1lc3BhY2UgPyBuYW1lc3BhY2UgKyAnLicgOiAnJykgKyBkZWxpbWl0ZWRdLmNvbmNhdChhcmdzKVxuICAgICAgICApXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG5cbiAgLyoqXG4gICAgIyMjIGBtYnVzI2NsZWFyKClgXG5cbiAgICBSZXNldCB0aGUgaGFuZGxlciByZWdpc3RyeSwgd2hpY2ggZXNzZW50aWFsIGRlcmVnaXN0ZXJzIGFsbCBldmVudCBsaXN0ZW5lcnMuXG5cbiAgICBfQWxpYXM6XyBgcmVtb3ZlQWxsTGlzdGVuZXJzYFxuICAqKi9cbiAgZnVuY3Rpb24gY2xlYXIobmFtZSkge1xuICAgIC8vIGlmIHdlIGhhdmUgYSBuYW1lLCByZXNldCBoYW5kbGVycyBmb3IgdGhhdCBoYW5kbGVyXG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIGRlbGV0ZSByZWdpc3RyeVtub3JtYWxpemUobmFtZSldO1xuICAgIH1cbiAgICAvLyBvdGhlcndpc2UsIHJlc2V0IHRoZSBlbnRpcmUgaGFuZGxlciByZWdpc3RyeVxuICAgIGVsc2Uge1xuICAgICAgcmVnaXN0cnkgPSB7fTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICAjIyMgYG1idXMjZmVlZChoYW5kbGVyKWBcblxuICAgIEF0dGFjaCBhIGhhbmRsZXIgZnVuY3Rpb24gdGhhdCB3aWxsIHNlZSBhbGwgZXZlbnRzIHRoYXQgYXJlIHNlbnQgdGhyb3VnaFxuICAgIHRoaXMgYnVzIGluIGFuIFwib2JqZWN0IHN0cmVhbVwiIGZvcm1hdCB0aGF0IG1hdGNoZXMgdGhlIGZvbGxvd2luZyBmb3JtYXQ6XG5cbiAgICBgYGBcbiAgICB7IG5hbWU6ICdldmVudC5uYW1lJywgYXJnczogWyAnZXZlbnQnLCAnYXJncycgXSB9XG4gICAgYGBgXG5cbiAgICBUaGUgZmVlZCBmdW5jdGlvbiByZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBjYW4gYmUgY2FsbGVkIHRvIHN0b3AgdGhlIGZlZWRcbiAgICBzZW5kaW5nIGRhdGEuXG5cbiAgKiovXG4gIGZ1bmN0aW9uIGZlZWQoaGFuZGxlcikge1xuICAgIGZ1bmN0aW9uIHN0b3AoKSB7XG4gICAgICBmZWVkcy5zcGxpY2UoZmVlZHMuaW5kZXhPZihoYW5kbGVyKSwgMSk7XG4gICAgfVxuXG4gICAgZmVlZHMucHVzaChoYW5kbGVyKTtcbiAgICByZXR1cm4gc3RvcDtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZShuYW1lKSB7XG4gICAgcmV0dXJuIChBcnJheS5pc0FycmF5KG5hbWUpID8gbmFtZSA6IG5hbWUuc3BsaXQocmVEZWxpbSkpLmpvaW4oJy4nKTtcbiAgfVxuXG4gIC8qKlxuICAgICMjIyBgbWJ1cyNvZmYobmFtZSwgaGFuZGxlcilgXG5cbiAgICBEZXJlZ2lzdGVyIGFuIGV2ZW50IGhhbmRsZXIuXG4gICoqL1xuICBmdW5jdGlvbiBvZmYobmFtZSwgaGFuZGxlcikge1xuICAgIHZhciBoYW5kbGVycyA9IHJlZ2lzdHJ5W25vcm1hbGl6ZShuYW1lKV0gfHwgW107XG4gICAgdmFyIGlkeCA9IGhhbmRsZXJzID8gaGFuZGxlcnMuaW5kZXhPZihoYW5kbGVyLl9hY3R1YWwgfHwgaGFuZGxlcikgOiAtMTtcblxuICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgaGFuZGxlcnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAgIyMjIGBtYnVzI29uKG5hbWUsIGhhbmRsZXIpYFxuXG4gICAgUmVnaXN0ZXIgYW4gZXZlbnQgaGFuZGxlciBmb3IgdGhlIGV2ZW50IGBuYW1lYC5cblxuICAqKi9cbiAgZnVuY3Rpb24gb24obmFtZSwgaGFuZGxlcikge1xuICAgIHZhciBoYW5kbGVycztcblxuICAgIG5hbWUgPSBub3JtYWxpemUobmFtZSk7XG4gICAgaGFuZGxlcnMgPSByZWdpc3RyeVtuYW1lXTtcblxuICAgIGlmIChoYW5kbGVycykge1xuICAgICAgaGFuZGxlcnMucHVzaChoYW5kbGVyKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZWdpc3RyeVtuYW1lXSA9IFsgaGFuZGxlciBdO1xuICAgIH1cblxuICAgIHJldHVybiBidXM7XG4gIH1cblxuXG4gIC8qKlxuICAgICMjIyBgbWJ1cyNvbmNlKG5hbWUsIGhhbmRsZXIpYFxuXG4gICAgUmVnaXN0ZXIgYW4gZXZlbnQgaGFuZGxlciBmb3IgdGhlIGV2ZW50IGBuYW1lYCB0aGF0IHdpbGwgb25seVxuICAgIHRyaWdnZXIgb25jZSAoaS5lLiB0aGUgaGFuZGxlciB3aWxsIGJlIGRlcmVnaXN0ZXJlZCBpbW1lZGlhdGVseSBhZnRlclxuICAgIGJlaW5nIHRyaWdnZXJlZCB0aGUgZmlyc3QgdGltZSkuXG5cbiAgKiovXG4gIGZ1bmN0aW9uIG9uY2UobmFtZSwgaGFuZGxlcikge1xuICAgIGZ1bmN0aW9uIGhhbmRsZUV2ZW50KCkge1xuICAgICAgdmFyIHJlc3VsdCA9IGhhbmRsZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgICAgYnVzLm9mZihuYW1lLCBoYW5kbGVFdmVudCk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGhhbmRsZXIuX2FjdHVhbCA9IGhhbmRsZUV2ZW50O1xuICAgIHJldHVybiBvbihuYW1lLCBoYW5kbGVFdmVudCk7XG4gIH1cblxuICBpZiAodHlwZW9mIG5hbWVzcGFjZSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgcGFyZW50ID0gbmFtZXNwYWNlO1xuICAgIG5hbWVzcGFjZSA9ICcnO1xuICB9XG5cbiAgbmFtZXNwYWNlID0gbm9ybWFsaXplKG5hbWVzcGFjZSB8fCAnJyk7XG5cbiAgYnVzLmNsZWFyID0gYnVzLnJlbW92ZUFsbExpc3RlbmVycyA9IGNsZWFyO1xuICBidXMuZmVlZCA9IGZlZWQ7XG4gIGJ1cy5vbiA9IGJ1cy5hZGRMaXN0ZW5lciA9IG9uO1xuICBidXMub25jZSA9IG9uY2U7XG4gIGJ1cy5vZmYgPSBidXMucmVtb3ZlTGlzdGVuZXIgPSBvZmY7XG4gIGJ1cy5wYXJlbnQgPSBwYXJlbnQgfHwgKG5hbWVzcGFjZSAmJiBjcmVhdGVCdXMoKSk7XG5cbiAgcmV0dXJuIGJ1cztcbn07XG4iLCIvKipcbiAgIyBydGMtcGx1Z2dhYmxlLXNpZ25hbGxlclxuXG4gIEJ5IHVzaW5nIGBydGMtcGx1Z2dhYmxlLXNpZ25hbGxlcmAgaW4geW91ciBjb2RlLCB5b3UgcHJvdmlkZSB0aGUgYWJpbGl0eVxuICBmb3IgeW91ciBwYWNrYWdlIHRvIGN1c3RvbWl6ZSB3aGljaCBzaWduYWxsaW5nIGNsaWVudCBpdCB1c2VzIChhbmRcbiAgdGh1cyBoYXZlIHNpZ25pZmljYW50IGNvbnRyb2wpIG92ZXIgaG93IHNpZ25hbGxpbmcgb3BlcmF0ZXMgaW4geW91clxuICBlbnZpcm9ubWVudC5cblxuICAjIyBIb3cgaXQgV29ya3NcblxuICBUaGUgcGx1Z2dhYmxlIHNpZ25hbGxlciBsb29rcyBpbiB0aGUgcHJvdmlkZWQgYG9wdHNgIGZvciBhIGBzaWduYWxsZXJgXG4gIGF0dHJpYnV0ZS4gIElmIHRoZSB2YWx1ZSBvZiB0aGlzIGF0dHJpYnV0ZSBpcyBhIHN0cmluZywgdGhlbiBpdCBpc1xuICBhc3N1bWVkIHRoYXQgeW91IHdpc2ggdG8gdXNlIHRoZSBkZWZhdWx0XG4gIFtgcnRjLXNpZ25hbGxlcmBdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLXNpZ25hbGxlcikgaW4geW91clxuICBwYWNrYWdlLiAgSWYsIGhvd2V2ZXIsIGl0IGlzIG5vdCBhIHN0cmluZyB2YWx1ZSB0aGVuIGl0IHdpbGwgYmUgcGFzc2VkXG4gIHN0cmFpZ2h0IGJhY2sgYXMgdGhlIHNpZ25hbGxlciAoYXNzdW1pbmcgdGhhdCB5b3UgaGF2ZSBwcm92aWRlZCBhblxuICBvYmplY3QgdGhhdCBpcyBjb21wbGlhbnQgd2l0aCB0aGUgcnRjLmlvIHNpZ25hbGxpbmcgQVBJKS5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgdmFyIHNpZ25hbGxlciA9IChvcHRzIHx8IHt9KS5zaWduYWxsZXI7XG4gIHZhciBtZXNzZW5nZXIgPSAob3B0cyB8fCB7fSkubWVzc2VuZ2VyIHx8IHJlcXVpcmUoJ3J0Yy1zd2l0Y2hib2FyZC1tZXNzZW5nZXInKTtcblxuICBpZiAodHlwZW9mIHNpZ25hbGxlciA9PSAnc3RyaW5nJyB8fCAoc2lnbmFsbGVyIGluc3RhbmNlb2YgU3RyaW5nKSkge1xuICAgIHJldHVybiByZXF1aXJlKCdydGMtc2lnbmFsbGVyJykobWVzc2VuZ2VyKHNpZ25hbGxlciksIG9wdHMpO1xuICB9XG5cbiAgcmV0dXJuIHNpZ25hbGxlcjtcbn07XG4iLCJ2YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xuXG4vKipcbiAgIyBydGMtc3dpdGNoYm9hcmQtbWVzc2VuZ2VyXG5cbiAgQSBzcGVjaWFsaXNlZCB2ZXJzaW9uIG9mXG4gIFtgbWVzc2VuZ2VyLXdzYF0oaHR0cHM6Ly9naXRodWIuY29tL0RhbW9uT2VobG1hbi9tZXNzZW5nZXItd3MpIGRlc2lnbmVkIHRvXG4gIGNvbm5lY3QgdG8gW2BydGMtc3dpdGNoYm9hcmRgXShodHRwOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLXN3aXRjaGJvYXJkKVxuICBpbnN0YW5jZXMuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzd2l0Y2hib2FyZCwgb3B0cykge1xuICByZXR1cm4gcmVxdWlyZSgnbWVzc2VuZ2VyLXdzJykoc3dpdGNoYm9hcmQsIGV4dGVuZCh7XG4gICAgZW5kcG9pbnRzOiBbJy9wcmltdXMnLCAnLyddXG4gIH0sIG9wdHMpKTtcbn07XG4iLCJ2YXIgV2ViU29ja2V0ID0gcmVxdWlyZSgnd3MnKTtcbnZhciB3c3VybCA9IHJlcXVpcmUoJ3dzdXJsJyk7XG52YXIgcHMgPSByZXF1aXJlKCdwdWxsLXdzJyk7XG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCdjb2cvZGVmYXVsdHMnKTtcbnZhciByZVRyYWlsaW5nU2xhc2ggPSAvXFwvJC87XG5cbi8qKlxuICAjIG1lc3Nlbmdlci13c1xuXG4gIFRoaXMgaXMgYSBzaW1wbGUgbWVzc2FnaW5nIGltcGxlbWVudGF0aW9uIGZvciBzZW5kaW5nIGFuZCByZWNlaXZpbmcgZGF0YVxuICB2aWEgd2Vic29ja2V0cy5cblxuICBGb2xsb3dzIHRoZSBbbWVzc2VuZ2VyLWFyY2hldHlwZV0oaHR0cHM6Ly9naXRodWIuY29tL0RhbW9uT2VobG1hbi9tZXNzZW5nZXItYXJjaGV0eXBlKVxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICA8PDwgZXhhbXBsZXMvc2ltcGxlLmpzXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih1cmwsIG9wdHMpIHtcbiAgdmFyIHRpbWVvdXQgPSAob3B0cyB8fCB7fSkudGltZW91dCB8fCAxMDAwO1xuICB2YXIgZW5kcG9pbnRzID0gKChvcHRzIHx8IHt9KS5lbmRwb2ludHMgfHwgWycvJ10pLm1hcChmdW5jdGlvbihlbmRwb2ludCkge1xuICAgIHJldHVybiB1cmwucmVwbGFjZShyZVRyYWlsaW5nU2xhc2gsICcnKSArIGVuZHBvaW50O1xuICB9KTtcblxuICBmdW5jdGlvbiBjb25uZWN0KGNhbGxiYWNrKSB7XG4gICAgdmFyIHF1ZXVlID0gW10uY29uY2F0KGVuZHBvaW50cyk7XG4gICAgdmFyIHJlY2VpdmVkRGF0YSA9IGZhbHNlO1xuICAgIHZhciBmYWlsVGltZXI7XG4gICAgdmFyIHN1Y2Nlc3NUaW1lcjtcbiAgICB2YXIgcmVtb3ZlTGlzdGVuZXI7XG5cbiAgICBmdW5jdGlvbiBhdHRlbXB0TmV4dCgpIHtcbiAgICAgIHZhciBzb2NrZXQ7XG5cbiAgICAgIGZ1bmN0aW9uIHJlZ2lzdGVyTWVzc2FnZShldnQpIHtcbiAgICAgICAgcmVjZWl2ZWREYXRhID0gdHJ1ZTtcbiAgICAgICAgcmVtb3ZlTGlzdGVuZXIuY2FsbChzb2NrZXQsICdtZXNzYWdlJywgcmVnaXN0ZXJNZXNzYWdlKTtcbiAgICAgIH1cblxuICAgICAgLy8gaWYgd2UgaGF2ZSBubyBtb3JlIHZhbGlkIGVuZHBvaW50cywgdGhlbiBlcm9yciBvdXRcbiAgICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignVW5hYmxlIHRvIGNvbm5lY3QgdG8gdXJsOiAnICsgdXJsKSk7XG4gICAgICB9XG5cbiAgICAgIHNvY2tldCA9IG5ldyBXZWJTb2NrZXQod3N1cmwocXVldWUuc2hpZnQoKSkpO1xuICAgICAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgaGFuZGxlRXJyb3IpO1xuICAgICAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgaGFuZGxlQWJub3JtYWxDbG9zZSk7XG4gICAgICBzb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignb3BlbicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBjcmVhdGUgdGhlIHNvdXJjZSBpbW1lZGlhdGVseSB0byBidWZmZXIgYW55IGRhdGFcbiAgICAgICAgdmFyIHNvdXJjZSA9IHBzLnNvdXJjZShzb2NrZXQsIG9wdHMpO1xuXG4gICAgICAgIC8vIG1vbml0b3IgZGF0YSBmbG93aW5nIGZyb20gdGhlIHNvY2tldFxuICAgICAgICBzb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIHJlZ2lzdGVyTWVzc2FnZSk7XG5cbiAgICAgICAgc3VjY2Vzc1RpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICBjbGVhclRpbWVvdXQoZmFpbFRpbWVyKTtcbiAgICAgICAgICBjYWxsYmFjayhudWxsLCBzb3VyY2UsIHBzLnNpbmsoc29ja2V0LCBvcHRzKSk7XG4gICAgICAgIH0sIDEwMCk7XG4gICAgICB9KTtcblxuICAgICAgcmVtb3ZlTGlzdGVuZXIgPSBzb2NrZXQucmVtb3ZlRXZlbnRMaXN0ZW5lciB8fCBzb2NrZXQucmVtb3ZlTGlzdGVuZXI7XG4gICAgICBmYWlsVGltZXIgPSBzZXRUaW1lb3V0KGF0dGVtcHROZXh0LCB0aW1lb3V0KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoYW5kbGVBYm5vcm1hbENsb3NlKGV2dCkge1xuICAgICAgLy8gaWYgdGhpcyB3YXMgYSBjbGVhbiBjbG9zZSBkbyBub3RoaW5nXG4gICAgICBpZiAoZXZ0Lndhc0NsZWFuIHx8IHJlY2VpdmVkRGF0YSB8fCBxdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHN1Y2Nlc3NUaW1lcik7XG4gICAgICAgIGNsZWFyVGltZW91dChmYWlsVGltZXIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBoYW5kbGVFcnJvcigpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhbmRsZUVycm9yKCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHN1Y2Nlc3NUaW1lcik7XG4gICAgICBjbGVhclRpbWVvdXQoZmFpbFRpbWVyKTtcbiAgICAgIGF0dGVtcHROZXh0KCk7XG4gICAgfVxuXG4gICAgYXR0ZW1wdE5leHQoKTtcbiAgfVxuXG4gIHJldHVybiBjb25uZWN0O1xufTtcbiIsImV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGR1cGxleDtcblxuZXhwb3J0cy5zb3VyY2UgPSByZXF1aXJlKCcuL3NvdXJjZScpO1xuZXhwb3J0cy5zaW5rID0gcmVxdWlyZSgnLi9zaW5rJyk7XG5cbmZ1bmN0aW9uIGR1cGxleCAod3MsIG9wdHMpIHtcbiAgcmV0dXJuIHtcbiAgICBzb3VyY2U6IGV4cG9ydHMuc291cmNlKHdzKSxcbiAgICBzaW5rOiBleHBvcnRzLnNpbmsod3MsIG9wdHMpXG4gIH07XG59O1xuIiwiZXhwb3J0cy5pZCA9IFxuZnVuY3Rpb24gKGl0ZW0pIHtcbiAgcmV0dXJuIGl0ZW1cbn1cblxuZXhwb3J0cy5wcm9wID0gXG5mdW5jdGlvbiAobWFwKSB7ICBcbiAgaWYoJ3N0cmluZycgPT0gdHlwZW9mIG1hcCkge1xuICAgIHZhciBrZXkgPSBtYXBcbiAgICByZXR1cm4gZnVuY3Rpb24gKGRhdGEpIHsgcmV0dXJuIGRhdGFba2V5XSB9XG4gIH1cbiAgcmV0dXJuIG1hcFxufVxuXG5leHBvcnRzLnRlc3RlciA9IGZ1bmN0aW9uICh0ZXN0KSB7XG4gIGlmKCF0ZXN0KSByZXR1cm4gZXhwb3J0cy5pZFxuICBpZignb2JqZWN0JyA9PT0gdHlwZW9mIHRlc3RcbiAgICAmJiAnZnVuY3Rpb24nID09PSB0eXBlb2YgdGVzdC50ZXN0KVxuICAgICAgcmV0dXJuIHRlc3QudGVzdC5iaW5kKHRlc3QpXG4gIHJldHVybiBleHBvcnRzLnByb3AodGVzdCkgfHwgZXhwb3J0cy5pZFxufVxuXG5leHBvcnRzLmFkZFBpcGUgPSBhZGRQaXBlXG5cbmZ1bmN0aW9uIGFkZFBpcGUocmVhZCkge1xuICBpZignZnVuY3Rpb24nICE9PSB0eXBlb2YgcmVhZClcbiAgICByZXR1cm4gcmVhZFxuXG4gIHJlYWQucGlwZSA9IHJlYWQucGlwZSB8fCBmdW5jdGlvbiAocmVhZGVyKSB7XG4gICAgaWYoJ2Z1bmN0aW9uJyAhPSB0eXBlb2YgcmVhZGVyICYmICdmdW5jdGlvbicgIT0gdHlwZW9mIHJlYWRlci5zaW5rKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdtdXN0IHBpcGUgdG8gcmVhZGVyJylcbiAgICB2YXIgcGlwZSA9IGFkZFBpcGUocmVhZGVyLnNpbmsgPyByZWFkZXIuc2luayhyZWFkKSA6IHJlYWRlcihyZWFkKSlcbiAgICByZXR1cm4gcmVhZGVyLnNvdXJjZSB8fCBwaXBlO1xuICB9XG4gIFxuICByZWFkLnR5cGUgPSAnU291cmNlJ1xuICByZXR1cm4gcmVhZFxufVxuXG52YXIgU291cmNlID1cbmV4cG9ydHMuU291cmNlID1cbmZ1bmN0aW9uIFNvdXJjZSAoY3JlYXRlUmVhZCkge1xuICBmdW5jdGlvbiBzKCkge1xuICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgcmV0dXJuIGFkZFBpcGUoY3JlYXRlUmVhZC5hcHBseShudWxsLCBhcmdzKSlcbiAgfVxuICBzLnR5cGUgPSAnU291cmNlJ1xuICByZXR1cm4gc1xufVxuXG5cbnZhciBUaHJvdWdoID1cbmV4cG9ydHMuVGhyb3VnaCA9IFxuZnVuY3Rpb24gKGNyZWF0ZVJlYWQpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgIHZhciBwaXBlZCA9IFtdXG4gICAgZnVuY3Rpb24gcmVhZGVyIChyZWFkKSB7XG4gICAgICBhcmdzLnVuc2hpZnQocmVhZClcbiAgICAgIHJlYWQgPSBjcmVhdGVSZWFkLmFwcGx5KG51bGwsIGFyZ3MpXG4gICAgICB3aGlsZShwaXBlZC5sZW5ndGgpXG4gICAgICAgIHJlYWQgPSBwaXBlZC5zaGlmdCgpKHJlYWQpXG4gICAgICByZXR1cm4gcmVhZFxuICAgICAgLy9waXBlaW5nIHRvIGZyb20gdGhpcyByZWFkZXIgc2hvdWxkIGNvbXBvc2UuLi5cbiAgICB9XG4gICAgcmVhZGVyLnBpcGUgPSBmdW5jdGlvbiAocmVhZCkge1xuICAgICAgcGlwZWQucHVzaChyZWFkKSBcbiAgICAgIGlmKHJlYWQudHlwZSA9PT0gJ1NvdXJjZScpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY2Fubm90IHBpcGUgJyArIHJlYWRlci50eXBlICsgJyB0byBTb3VyY2UnKVxuICAgICAgcmVhZGVyLnR5cGUgPSByZWFkLnR5cGUgPT09ICdTaW5rJyA/ICdTaW5rJyA6ICdUaHJvdWdoJ1xuICAgICAgcmV0dXJuIHJlYWRlclxuICAgIH1cbiAgICByZWFkZXIudHlwZSA9ICdUaHJvdWdoJ1xuICAgIHJldHVybiByZWFkZXJcbiAgfVxufVxuXG52YXIgU2luayA9XG5leHBvcnRzLlNpbmsgPSBcbmZ1bmN0aW9uIFNpbmsoY3JlYXRlUmVhZGVyKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICBpZighY3JlYXRlUmVhZGVyKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdtdXN0IGJlIGNyZWF0ZVJlYWRlciBmdW5jdGlvbicpXG4gICAgZnVuY3Rpb24gcyAocmVhZCkge1xuICAgICAgYXJncy51bnNoaWZ0KHJlYWQpXG4gICAgICByZXR1cm4gY3JlYXRlUmVhZGVyLmFwcGx5KG51bGwsIGFyZ3MpXG4gICAgfVxuICAgIHMudHlwZSA9ICdTaW5rJ1xuICAgIHJldHVybiBzXG4gIH1cbn1cblxuXG5leHBvcnRzLm1heWJlU2luayA9IFxuZXhwb3J0cy5tYXliZURyYWluID0gXG5mdW5jdGlvbiAoY3JlYXRlU2luaywgY2IpIHtcbiAgaWYoIWNiKVxuICAgIHJldHVybiBUaHJvdWdoKGZ1bmN0aW9uIChyZWFkKSB7XG4gICAgICB2YXIgZW5kZWRcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoY2xvc2UsIGNiKSB7XG4gICAgICAgIGlmKGNsb3NlKSByZXR1cm4gcmVhZChjbG9zZSwgY2IpXG4gICAgICAgIGlmKGVuZGVkKSByZXR1cm4gY2IoZW5kZWQpXG5cbiAgICAgICAgY3JlYXRlU2luayhmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG4gICAgICAgICAgZW5kZWQgPSBlcnIgfHwgdHJ1ZVxuICAgICAgICAgIGlmKCFlcnIpIGNiKG51bGwsIGRhdGEpXG4gICAgICAgICAgZWxzZSAgICAgY2IoZW5kZWQpXG4gICAgICAgIH0pIChyZWFkKVxuICAgICAgfVxuICAgIH0pKClcblxuICByZXR1cm4gU2luayhmdW5jdGlvbiAocmVhZCkge1xuICAgIHJldHVybiBjcmVhdGVTaW5rKGNiKSAocmVhZClcbiAgfSkoKVxufVxuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNvY2tldCwgY2FsbGJhY2spIHtcbiAgdmFyIHJlbW92ZSA9IHNvY2tldCAmJiAoc29ja2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIgfHwgc29ja2V0LnJlbW92ZUxpc3RlbmVyKTtcblxuICBmdW5jdGlvbiBjbGVhbnVwICgpIHtcbiAgICBpZiAodHlwZW9mIHJlbW92ZSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZW1vdmUuY2FsbChzb2NrZXQsICdvcGVuJywgaGFuZGxlT3Blbik7XG4gICAgICByZW1vdmUuY2FsbChzb2NrZXQsICdlcnJvcicsIGhhbmRsZUVycik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlT3BlbihldnQpIHtcbiAgICBjbGVhbnVwKCk7IGNhbGxiYWNrKCk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVFcnIgKGV2dCkge1xuICAgIGNsZWFudXAoKTsgY2FsbGJhY2soZXZ0KTtcbiAgfVxuXG4gIC8vIGlmIHRoZSBzb2NrZXQgaXMgY2xvc2luZyBvciBjbG9zZWQsIHJldHVybiBlbmRcbiAgaWYgKHNvY2tldC5yZWFkeVN0YXRlID49IDIpIHtcbiAgICByZXR1cm4gY2FsbGJhY2sodHJ1ZSk7XG4gIH1cblxuICAvLyBpZiBvcGVuLCB0cmlnZ2VyIHRoZSBjYWxsYmFja1xuICBpZiAoc29ja2V0LnJlYWR5U3RhdGUgPT09IDEpIHtcbiAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgfVxuXG4gIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKCdvcGVuJywgaGFuZGxlT3Blbik7XG4gIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGhhbmRsZUVycik7XG59O1xuIiwidmFyIHB1bGwgPSByZXF1aXJlKCdwdWxsLWNvcmUnKTtcbnZhciByZWFkeSA9IHJlcXVpcmUoJy4vcmVhZHknKTtcblxuLyoqXG4gICMjIyBgc2luayhzb2NrZXQsIG9wdHM/KWBcblxuICBDcmVhdGUgYSBwdWxsLXN0cmVhbSBgU2lua2AgdGhhdCB3aWxsIHdyaXRlIGRhdGEgdG8gdGhlIGBzb2NrZXRgLlxuXG4gIDw8PCBleGFtcGxlcy93cml0ZS5qc1xuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gcHVsbC5TaW5rKGZ1bmN0aW9uKHJlYWQsIHNvY2tldCwgb3B0cykge1xuICBvcHRzID0gb3B0cyB8fCB7fVxuICB2YXIgY2xvc2VPbkVuZCA9IG9wdHMuY2xvc2VPbkVuZCAhPT0gZmFsc2U7XG4gIHZhciBvbkNsb3NlID0gJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIG9wdHMgPyBvcHRzIDogb3B0cy5vbkNsb3NlO1xuXG4gIGZ1bmN0aW9uIG5leHQoZW5kLCBkYXRhKSB7XG4gICAgLy8gaWYgdGhlIHN0cmVhbSBoYXMgZW5kZWQsIHNpbXBseSByZXR1cm5cbiAgICBpZiAoZW5kKSB7XG4gICAgICBpZiAoY2xvc2VPbkVuZCAmJiBzb2NrZXQucmVhZHlTdGF0ZSA8PSAxKSB7XG4gICAgICAgIGlmKG9uQ2xvc2UpXG4gICAgICAgICAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICBpZihldi53YXNDbGVhbikgb25DbG9zZSgpXG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcignd3MgZXJyb3InKVxuICAgICAgICAgICAgICBlcnIuZXZlbnQgPSBldlxuICAgICAgICAgICAgICBvbkNsb3NlKGVycilcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICBzb2NrZXQuY2xvc2UoKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIHNvY2tldCByZWFkeT9cbiAgICByZWFkeShzb2NrZXQsIGZ1bmN0aW9uKGVuZCkge1xuICAgICAgaWYgKGVuZCkge1xuICAgICAgICByZXR1cm4gcmVhZChlbmQsIGZ1bmN0aW9uICgpIHt9KTtcbiAgICAgIH1cblxuICAgICAgc29ja2V0LnNlbmQoZGF0YSk7XG4gICAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgICByZWFkKG51bGwsIG5leHQpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICByZWFkKG51bGwsIG5leHQpO1xufSk7XG4iLCJ2YXIgcHVsbCA9IHJlcXVpcmUoJ3B1bGwtY29yZScpO1xudmFyIHJlYWR5ID0gcmVxdWlyZSgnLi9yZWFkeScpO1xuXG4vKipcbiAgIyMjIGBzb3VyY2Uoc29ja2V0KWBcblxuICBDcmVhdGUgYSBwdWxsLXN0cmVhbSBgU291cmNlYCB0aGF0IHdpbGwgcmVhZCBkYXRhIGZyb20gdGhlIGBzb2NrZXRgLlxuXG4gIDw8PCBleGFtcGxlcy9yZWFkLmpzXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBwdWxsLlNvdXJjZShmdW5jdGlvbihzb2NrZXQpIHtcbiAgdmFyIGJ1ZmZlciA9IFtdO1xuICB2YXIgcmVjZWl2ZXI7XG4gIHZhciBlbmRlZDtcblxuICBzb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uKGV2dCkge1xuICAgIGlmIChyZWNlaXZlcikge1xuICAgICAgcmV0dXJuIHJlY2VpdmVyKG51bGwsIGV2dC5kYXRhKTtcbiAgICB9XG5cbiAgICBidWZmZXIucHVzaChldnQuZGF0YSk7XG4gIH0pO1xuXG4gIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKCdjbG9zZScsIGZ1bmN0aW9uKGV2dCkge1xuICAgIGlmIChlbmRlZCkgcmV0dXJuO1xuICAgIGlmIChyZWNlaXZlcikge1xuICAgICAgcmV0dXJuIHJlY2VpdmVyKGVuZGVkID0gdHJ1ZSk7XG4gICAgfVxuICB9KTtcblxuICBzb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgaWYgKGVuZGVkKSByZXR1cm47XG4gICAgZW5kZWQgPSBldnQ7XG4gICAgaWYgKHJlY2VpdmVyKSB7XG4gICAgICByZWNlaXZlcihlbmRlZCk7XG4gICAgfVxuICB9KTtcblxuICBmdW5jdGlvbiByZWFkKGFib3J0LCBjYikge1xuICAgIHJlY2VpdmVyID0gbnVsbDtcblxuICAgIC8vaWYgc3RyZWFtIGhhcyBhbHJlYWR5IGVuZGVkLlxuICAgIGlmIChlbmRlZClcbiAgICAgIHJldHVybiBjYihlbmRlZClcblxuICAgIC8vIGlmIGVuZGVkLCBhYm9ydFxuICAgIGlmIChhYm9ydCkge1xuICAgICAgLy90aGlzIHdpbGwgY2FsbGJhY2sgd2hlbiBzb2NrZXQgY2xvc2VzXG4gICAgICByZWNlaXZlciA9IGNiXG4gICAgICByZXR1cm4gc29ja2V0LmNsb3NlKClcbiAgICB9XG5cbiAgICByZWFkeShzb2NrZXQsIGZ1bmN0aW9uKGVuZCkge1xuICAgICAgaWYgKGVuZCkge1xuICAgICAgICByZXR1cm4gY2IoZW5kZWQgPSBlbmQpO1xuICAgICAgfVxuXG4gICAgICAvLyByZWFkIGZyb20gdGhlIHNvY2tldFxuICAgICAgaWYgKGVuZGVkICYmIGVuZGVkICE9PSB0cnVlKSB7XG4gICAgICAgIHJldHVybiBjYihlbmRlZCk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChidWZmZXIubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gY2IobnVsbCwgYnVmZmVyLnNoaWZ0KCkpO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoZW5kZWQpIHtcbiAgICAgICAgcmV0dXJuIGNiKHRydWUpO1xuICAgICAgfVxuXG4gICAgICByZWNlaXZlciA9IGNiO1xuICAgIH0pO1xuICB9O1xuXG4gIHJldHVybiByZWFkO1xufSk7XG4iLCJcbi8qKlxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgZ2xvYmFsID0gKGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSkoKTtcblxuLyoqXG4gKiBXZWJTb2NrZXQgY29uc3RydWN0b3IuXG4gKi9cblxudmFyIFdlYlNvY2tldCA9IGdsb2JhbC5XZWJTb2NrZXQgfHwgZ2xvYmFsLk1veldlYlNvY2tldDtcblxuLyoqXG4gKiBNb2R1bGUgZXhwb3J0cy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFdlYlNvY2tldCA/IHdzIDogbnVsbDtcblxuLyoqXG4gKiBXZWJTb2NrZXQgY29uc3RydWN0b3IuXG4gKlxuICogVGhlIHRoaXJkIGBvcHRzYCBvcHRpb25zIG9iamVjdCBnZXRzIGlnbm9yZWQgaW4gd2ViIGJyb3dzZXJzLCBzaW5jZSBpdCdzXG4gKiBub24tc3RhbmRhcmQsIGFuZCB0aHJvd3MgYSBUeXBlRXJyb3IgaWYgcGFzc2VkIHRvIHRoZSBjb25zdHJ1Y3Rvci5cbiAqIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2VpbmFyb3Mvd3MvaXNzdWVzLzIyN1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmlcbiAqIEBwYXJhbSB7QXJyYXl9IHByb3RvY29scyAob3B0aW9uYWwpXG4gKiBAcGFyYW0ge09iamVjdCkgb3B0cyAob3B0aW9uYWwpXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIHdzKHVyaSwgcHJvdG9jb2xzLCBvcHRzKSB7XG4gIHZhciBpbnN0YW5jZTtcbiAgaWYgKHByb3RvY29scykge1xuICAgIGluc3RhbmNlID0gbmV3IFdlYlNvY2tldCh1cmksIHByb3RvY29scyk7XG4gIH0gZWxzZSB7XG4gICAgaW5zdGFuY2UgPSBuZXcgV2ViU29ja2V0KHVyaSk7XG4gIH1cbiAgcmV0dXJuIGluc3RhbmNlO1xufVxuXG5pZiAoV2ViU29ja2V0KSB3cy5wcm90b3R5cGUgPSBXZWJTb2NrZXQucHJvdG90eXBlO1xuIiwidmFyIHJlSHR0cFVybCA9IC9eaHR0cCguKikkLztcblxuLyoqXG4gICMgd3N1cmxcblxuICBHaXZlbiBhIHVybCAoaW5jbHVkaW5nIHByb3RvY29sIHJlbGF0aXZlIHVybHMgLSBpLmUuIGAvL2ApLCBnZW5lcmF0ZSBhbiBhcHByb3ByaWF0ZVxuICB1cmwgZm9yIGEgV2ViU29ja2V0IGVuZHBvaW50IChgd3NgIG9yIGB3c3NgKS5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgPDw8IGV4YW1wbGVzL3JlbGF0aXZlLmpzXG5cbioqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHVybCwgb3B0cykge1xuICB2YXIgY3VycmVudCA9IChvcHRzIHx8IHt9KS5jdXJyZW50IHx8ICh0eXBlb2YgbG9jYXRpb24gIT0gJ3VuZGVmaW5lZCcgJiYgbG9jYXRpb24uaHJlZik7XG4gIHZhciBjdXJyZW50UHJvdG9jb2wgPSBjdXJyZW50ICYmIGN1cnJlbnQuc2xpY2UoMCwgY3VycmVudC5pbmRleE9mKCc6JykpO1xuICB2YXIgaW5zZWN1cmUgPSAob3B0cyB8fCB7fSkuaW5zZWN1cmU7XG4gIHZhciBpc1JlbGF0aXZlID0gdXJsLnNsaWNlKDAsIDIpID09ICcvLyc7XG4gIHZhciBmb3JjZVdTID0gKCEgY3VycmVudFByb3RvY29sKSB8fCBjdXJyZW50UHJvdG9jb2wgPT09ICdmaWxlOic7XG5cbiAgaWYgKGlzUmVsYXRpdmUpIHtcbiAgICByZXR1cm4gZm9yY2VXUyA/XG4gICAgICAoKGluc2VjdXJlID8gJ3dzOicgOiAnd3NzOicpICsgdXJsKSA6XG4gICAgICAoY3VycmVudFByb3RvY29sLnJlcGxhY2UocmVIdHRwVXJsLCAnd3MkMScpICsgJzonICsgdXJsKTtcbiAgfVxuXG4gIHJldHVybiB1cmwucmVwbGFjZShyZUh0dHBVcmwsICd3cyQxJyk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIC8vIG1lc3NlbmdlciBldmVudHNcbiAgZGF0YUV2ZW50OiAnZGF0YScsXG4gIG9wZW5FdmVudDogJ29wZW4nLFxuICBjbG9zZUV2ZW50OiAnY2xvc2UnLFxuICBlcnJvckV2ZW50OiAnZXJyb3InLFxuXG4gIC8vIG1lc3NlbmdlciBmdW5jdGlvbnNcbiAgd3JpdGVNZXRob2Q6ICd3cml0ZScsXG4gIGNsb3NlTWV0aG9kOiAnY2xvc2UnLFxuXG4gIC8vIGxlYXZlIHRpbWVvdXQgKG1zKVxuICBsZWF2ZVRpbWVvdXQ6IDMwMDBcbn07XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xuXG4vKipcbiAgIyMjIyBhbm5vdW5jZVxuXG4gIGBgYFxuICAvYW5ub3VuY2V8JW1ldGFkYXRhJXx7XCJpZFwiOiBcIi4uLlwiLCAuLi4gfVxuICBgYGBcblxuICBXaGVuIGFuIGFubm91bmNlIG1lc3NhZ2UgaXMgcmVjZWl2ZWQgYnkgdGhlIHNpZ25hbGxlciwgdGhlIGF0dGFjaGVkXG4gIG9iamVjdCBkYXRhIGlzIGRlY29kZWQgYW5kIHRoZSBzaWduYWxsZXIgZW1pdHMgYW4gYGFubm91bmNlYCBtZXNzYWdlLlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2lnbmFsbGVyKSB7XG5cbiAgZnVuY3Rpb24gZGF0YUFsbG93ZWQoZGF0YSkge1xuICAgIHZhciBjbG9uZWQgPSBleHRlbmQoeyBhbGxvdzogdHJ1ZSB9LCBkYXRhKTtcbiAgICBzaWduYWxsZXIoJ3BlZXI6ZmlsdGVyJywgZGF0YS5pZCwgY2xvbmVkKTtcblxuICAgIHJldHVybiBjbG9uZWQuYWxsb3c7XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oYXJncywgbWVzc2FnZVR5cGUsIHNyY0RhdGEsIHNyY1N0YXRlLCBpc0RNKSB7XG4gICAgdmFyIGRhdGEgPSBhcmdzWzBdO1xuICAgIHZhciBwZWVyO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSB2YWxpZCBkYXRhIHRoZW4gcHJvY2Vzc1xuICAgIGlmIChkYXRhICYmIGRhdGEuaWQgJiYgZGF0YS5pZCAhPT0gc2lnbmFsbGVyLmlkKSB7XG4gICAgICBpZiAoISBkYXRhQWxsb3dlZChkYXRhKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICAvLyBjaGVjayB0byBzZWUgaWYgdGhpcyBpcyBhIGtub3duIHBlZXJcbiAgICAgIHBlZXIgPSBzaWduYWxsZXIucGVlcnMuZ2V0KGRhdGEuaWQpO1xuXG4gICAgICAvLyB0cmlnZ2VyIHRoZSBwZWVyIGNvbm5lY3RlZCBldmVudCB0byBmbGFnIHRoYXQgd2Uga25vdyBhYm91dCBhXG4gICAgICAvLyBwZWVyIGNvbm5lY3Rpb24uIFRoZSBwZWVyIGhhcyBwYXNzZWQgdGhlIFwiZmlsdGVyXCIgY2hlY2sgYnV0IG1heVxuICAgICAgLy8gYmUgYW5ub3VuY2VkIC8gdXBkYXRlZCBkZXBlbmRpbmcgb24gcHJldmlvdXMgY29ubmVjdGlvbiBzdGF0dXNcbiAgICAgIHNpZ25hbGxlcigncGVlcjpjb25uZWN0ZWQnLCBkYXRhLmlkLCBkYXRhKTtcblxuICAgICAgLy8gaWYgdGhlIHBlZXIgaXMgZXhpc3RpbmcsIHRoZW4gdXBkYXRlIHRoZSBkYXRhXG4gICAgICBpZiAocGVlciAmJiAoISBwZWVyLmluYWN0aXZlKSkge1xuICAgICAgICAvLyB1cGRhdGUgdGhlIGRhdGFcbiAgICAgICAgZXh0ZW5kKHBlZXIuZGF0YSwgZGF0YSk7XG5cbiAgICAgICAgLy8gdHJpZ2dlciB0aGUgcGVlciB1cGRhdGUgZXZlbnRcbiAgICAgICAgcmV0dXJuIHNpZ25hbGxlcigncGVlcjp1cGRhdGUnLCBkYXRhLCBzcmNEYXRhKTtcbiAgICAgIH1cblxuICAgICAgLy8gY3JlYXRlIGEgbmV3IHBlZXJcbiAgICAgIHBlZXIgPSB7XG4gICAgICAgIGlkOiBkYXRhLmlkLFxuXG4gICAgICAgIC8vIGluaXRpYWxpc2UgdGhlIGxvY2FsIHJvbGUgaW5kZXhcbiAgICAgICAgcm9sZUlkeDogW2RhdGEuaWQsIHNpZ25hbGxlci5pZF0uc29ydCgpLmluZGV4T2YoZGF0YS5pZCksXG5cbiAgICAgICAgLy8gaW5pdGlhbGlzZSB0aGUgcGVlciBkYXRhXG4gICAgICAgIGRhdGE6IHt9XG4gICAgICB9O1xuXG4gICAgICAvLyBpbml0aWFsaXNlIHRoZSBwZWVyIGRhdGFcbiAgICAgIGV4dGVuZChwZWVyLmRhdGEsIGRhdGEpO1xuXG4gICAgICAvLyByZXNldCBpbmFjdGl2aXR5IHN0YXRlXG4gICAgICBjbGVhclRpbWVvdXQocGVlci5sZWF2ZVRpbWVyKTtcbiAgICAgIHBlZXIuaW5hY3RpdmUgPSBmYWxzZTtcblxuICAgICAgLy8gc2V0IHRoZSBwZWVyIGRhdGFcbiAgICAgIHNpZ25hbGxlci5wZWVycy5zZXQoZGF0YS5pZCwgcGVlcik7XG5cbiAgICAgIC8vIGlmIHRoaXMgaXMgYW4gaW5pdGlhbCBhbm5vdW5jZSBtZXNzYWdlIChubyB2ZWN0b3IgY2xvY2sgYXR0YWNoZWQpXG4gICAgICAvLyB0aGVuIHNlbmQgYSBhbm5vdW5jZSByZXBseVxuICAgICAgaWYgKHNpZ25hbGxlci5hdXRvcmVwbHkgJiYgKCEgaXNETSkpIHtcbiAgICAgICAgc2lnbmFsbGVyXG4gICAgICAgICAgLnRvKGRhdGEuaWQpXG4gICAgICAgICAgLnNlbmQoJy9hbm5vdW5jZScsIHNpZ25hbGxlci5hdHRyaWJ1dGVzKTtcbiAgICAgIH1cblxuICAgICAgLy8gZW1pdCBhIG5ldyBwZWVyIGFubm91bmNlIGV2ZW50XG4gICAgICByZXR1cm4gc2lnbmFsbGVyKCdwZWVyOmFubm91bmNlJywgZGF0YSwgcGVlcik7XG4gICAgfVxuICB9O1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIyMgc2lnbmFsbGVyIG1lc3NhZ2UgaGFuZGxlcnNcblxuKiovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2lnbmFsbGVyLCBvcHRzKSB7XG4gIHJldHVybiB7XG4gICAgYW5ub3VuY2U6IHJlcXVpcmUoJy4vYW5ub3VuY2UnKShzaWduYWxsZXIsIG9wdHMpXG4gIH07XG59O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIGRldGVjdCA9IHJlcXVpcmUoJ3J0Yy1jb3JlL2RldGVjdCcpO1xudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnY29nL2RlZmF1bHRzJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xudmFyIG1idXMgPSByZXF1aXJlKCdtYnVzJyk7XG52YXIgZ2V0YWJsZSA9IHJlcXVpcmUoJ2NvZy9nZXRhYmxlJyk7XG52YXIgdXVpZCA9IHJlcXVpcmUoJ2N1aWQnKTtcbnZhciBwdWxsID0gcmVxdWlyZSgncHVsbC1zdHJlYW0nKTtcbnZhciBwdXNoYWJsZSA9IHJlcXVpcmUoJ3B1bGwtcHVzaGFibGUnKTtcblxuLy8gcmVhZHkgc3RhdGUgY29uc3RhbnRzXG52YXIgUlNfRElTQ09OTkVDVEVEID0gMDtcbnZhciBSU19DT05ORUNUSU5HID0gMTtcbnZhciBSU19DT05ORUNURUQgPSAyO1xuXG4vLyBpbml0aWFsaXNlIHNpZ25hbGxlciBtZXRhZGF0YSBzbyB3ZSBkb24ndCBoYXZlIHRvIGluY2x1ZGUgdGhlIHBhY2thZ2UuanNvblxuLy8gVE9ETzogbWFrZSB0aGlzIGNoZWNrYWJsZSB3aXRoIHNvbWUga2luZCBvZiBwcmVwdWJsaXNoIHNjcmlwdFxudmFyIG1ldGFkYXRhID0ge1xuICB2ZXJzaW9uOiAnNS4yLjQnXG59O1xuXG4vKipcbiAgIyBydGMtc2lnbmFsbGVyXG5cbiAgVGhlIGBydGMtc2lnbmFsbGVyYCBtb2R1bGUgcHJvdmlkZXMgYSB0cmFuc3BvcnRsZXNzIHNpZ25hbGxpbmdcbiAgbWVjaGFuaXNtIGZvciBXZWJSVEMuXG5cbiAgIyMgUHVycG9zZVxuXG4gIDw8PCBkb2NzL3B1cnBvc2UubWRcblxuICAjIyBHZXR0aW5nIFN0YXJ0ZWRcblxuICBXaGlsZSB0aGUgc2lnbmFsbGVyIGlzIGNhcGFibGUgb2YgY29tbXVuaWNhdGluZyBieSBhIG51bWJlciBvZiBkaWZmZXJlbnRcbiAgbWVzc2VuZ2VycyAoaS5lLiBhbnl0aGluZyB0aGF0IGNhbiBzZW5kIGFuZCByZWNlaXZlIG1lc3NhZ2VzIG92ZXIgYSB3aXJlKVxuICBpdCBjb21lcyB3aXRoIHN1cHBvcnQgZm9yIHVuZGVyc3RhbmRpbmcgaG93IHRvIGNvbm5lY3QgdG8gYW5cbiAgW3J0Yy1zd2l0Y2hib2FyZF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtc3dpdGNoYm9hcmQpIG91dCBvZiB0aGUgYm94LlxuXG4gIFRoZSBmb2xsb3dpbmcgY29kZSBzYW1wbGUgZGVtb25zdHJhdGVzIGhvdzpcblxuICA8PDwgZXhhbXBsZXMvZ2V0dGluZy1zdGFydGVkLmpzXG5cbiAgPDw8IGRvY3MvZXZlbnRzLm1kXG5cbiAgPDw8IGRvY3Mvc2lnbmFsZmxvdy1kaWFncmFtcy5tZFxuXG4gICMjIFJlZmVyZW5jZVxuXG4gIFRoZSBgcnRjLXNpZ25hbGxlcmAgbW9kdWxlIGlzIGRlc2lnbmVkIHRvIGJlIHVzZWQgcHJpbWFyaWx5IGluIGEgZnVuY3Rpb25hbFxuICB3YXkgYW5kIHdoZW4gY2FsbGVkIGl0IGNyZWF0ZXMgYSBuZXcgc2lnbmFsbGVyIHRoYXQgd2lsbCBlbmFibGVcbiAgeW91IHRvIGNvbW11bmljYXRlIHdpdGggb3RoZXIgcGVlcnMgdmlhIHlvdXIgbWVzc2FnaW5nIG5ldHdvcmsuXG5cbiAgYGBganNcbiAgLy8gY3JlYXRlIGEgc2lnbmFsbGVyIGZyb20gc29tZXRoaW5nIHRoYXQga25vd3MgaG93IHRvIHNlbmQgbWVzc2FnZXNcbiAgdmFyIHNpZ25hbGxlciA9IHJlcXVpcmUoJ3J0Yy1zaWduYWxsZXInKShtZXNzZW5nZXIpO1xuICBgYGBcblxuICBBcyBkZW1vbnN0cmF0ZWQgaW4gdGhlIGdldHRpbmcgc3RhcnRlZCBndWlkZSwgeW91IGNhbiBhbHNvIHBhc3MgdGhyb3VnaFxuICBhIHN0cmluZyB2YWx1ZSBpbnN0ZWFkIG9mIGEgbWVzc2VuZ2VyIGluc3RhbmNlIGlmIHlvdSBzaW1wbHkgd2FudCB0b1xuICBjb25uZWN0IHRvIGFuIGV4aXN0aW5nIGBydGMtc3dpdGNoYm9hcmRgIGluc3RhbmNlLlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obWVzc2VuZ2VyLCBvcHRzKSB7XG4gIC8vIGdldCB0aGUgYXV0b3JlcGx5IHNldHRpbmdcbiAgdmFyIGF1dG9yZXBseSA9IChvcHRzIHx8IHt9KS5hdXRvcmVwbHk7XG4gIHZhciBhdXRvY29ubmVjdCA9IChvcHRzIHx8IHt9KS5hdXRvY29ubmVjdDtcbiAgdmFyIHJlY29ubmVjdCA9IChvcHRzIHx8IHt9KS5yZWNvbm5lY3Q7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgbWV0YWRhdGFcbiAgdmFyIGxvY2FsTWV0YSA9IHt9O1xuXG4gIC8vIGNyZWF0ZSB0aGUgc2lnbmFsbGVyXG4gIHZhciBzaWduYWxsZXIgPSBtYnVzKCcnLCAob3B0cyB8fCB7fSkubG9nZ2VyKTtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBpZFxuICB2YXIgaWQgPSBzaWduYWxsZXIuaWQgPSAob3B0cyB8fCB7fSkuaWQgfHwgdXVpZCgpO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIGF0dHJpYnV0ZXNcbiAgdmFyIGF0dHJpYnV0ZXMgPSBzaWduYWxsZXIuYXR0cmlidXRlcyA9IHtcbiAgICBicm93c2VyOiBkZXRlY3QuYnJvd3NlcixcbiAgICBicm93c2VyVmVyc2lvbjogZGV0ZWN0LmJyb3dzZXJWZXJzaW9uLFxuICAgIGlkOiBpZCxcbiAgICBhZ2VudDogJ3NpZ25hbGxlckAnICsgbWV0YWRhdGEudmVyc2lvblxuICB9O1xuXG4gIC8vIGNyZWF0ZSB0aGUgcGVlcnMgbWFwXG4gIHZhciBwZWVycyA9IHNpZ25hbGxlci5wZWVycyA9IGdldGFibGUoe30pO1xuXG4gIC8vIGNyZWF0ZSB0aGUgb3V0Ym91bmQgbWVzc2FnZSBxdWV1ZVxuICB2YXIgcXVldWUgPSByZXF1aXJlKCdwdWxsLXB1c2hhYmxlJykoKTtcblxuICB2YXIgcHJvY2Vzc29yO1xuICB2YXIgYW5ub3VuY2VUaW1lciA9IDA7XG4gIHZhciByZWFkeVN0YXRlID0gUlNfRElTQ09OTkVDVEVEO1xuXG4gIGZ1bmN0aW9uIGFubm91bmNlT25SZWNvbm5lY3QoKSB7XG4gICAgc2lnbmFsbGVyLmFubm91bmNlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBidWZmZXJNZXNzYWdlKGFyZ3MpIHtcbiAgICBxdWV1ZS5wdXNoKGNyZWF0ZURhdGFMaW5lKGFyZ3MpKTtcblxuICAgIC8vIGlmIHdlIGFyZSBub3QgY29ubmVjdGVkIChhbmQgc2hvdWxkIGF1dG9jb25uZWN0KSwgdGhlbiBhdHRlbXB0IGNvbm5lY3Rpb25cbiAgICBpZiAocmVhZHlTdGF0ZSA9PT0gUlNfRElTQ09OTkVDVEVEICYmIChhdXRvY29ubmVjdCA9PT0gdW5kZWZpbmVkIHx8IGF1dG9jb25uZWN0KSkge1xuICAgICAgY29ubmVjdCgpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZURhdGFMaW5lKGFyZ3MpIHtcbiAgICByZXR1cm4gYXJncy5tYXAocHJlcGFyZUFyZykuam9pbignfCcpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlTWV0YWRhdGEoKSB7XG4gICAgcmV0dXJuIGV4dGVuZCh7fSwgbG9jYWxNZXRhLCB7IGlkOiBzaWduYWxsZXIuaWQgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVEaXNjb25uZWN0KCkge1xuICAgIGlmIChyZWNvbm5lY3QgPT09IHVuZGVmaW5lZCB8fCByZWNvbm5lY3QpIHtcbiAgICAgIHNldFRpbWVvdXQoY29ubmVjdCwgNTApO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHByZXBhcmVBcmcoYXJnKSB7XG4gICAgaWYgKHR5cGVvZiBhcmcgPT0gJ29iamVjdCcgJiYgKCEgKGFyZyBpbnN0YW5jZW9mIFN0cmluZykpKSB7XG4gICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGFyZyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJnO1xuICB9XG5cbiAgLyoqXG4gICAgIyMjIGBzaWduYWxsZXIuY29ubmVjdCgpYFxuXG4gICAgTWFudWFsbHkgY29ubmVjdCB0aGUgc2lnbmFsbGVyIHVzaW5nIHRoZSBzdXBwbGllZCBtZXNzZW5nZXIuXG5cbiAgICBfX05PVEU6X18gVGhpcyBzaG91bGQgbmV2ZXIgaGF2ZSB0byBiZSBjYWxsZWQgaWYgdGhlIGRlZmF1bHQgc2V0dGluZ1xuICAgIGZvciBgYXV0b2Nvbm5lY3RgIGlzIHVzZWQuXG4gICoqL1xuICB2YXIgY29ubmVjdCA9IHNpZ25hbGxlci5jb25uZWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gaWYgd2UgYXJlIGFscmVhZHkgY29ubmVjdGluZyB0aGVuIGRvIG5vdGhpbmdcbiAgICBpZiAocmVhZHlTdGF0ZSA9PT0gUlNfQ09OTkVDVElORykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGluaXRpYXRlIHRoZSBtZXNzZW5nZXJcbiAgICByZWFkeVN0YXRlID0gUlNfQ09OTkVDVElORztcbiAgICBtZXNzZW5nZXIoZnVuY3Rpb24oZXJyLCBzb3VyY2UsIHNpbmspIHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmVhZHlTdGF0ZSA9IFJTX0RJU0NPTk5FQ1RFRDtcbiAgICAgICAgcmV0dXJuIHNpZ25hbGxlcignZXJyb3InLCBlcnIpO1xuICAgICAgfVxuXG4gICAgICAvLyBmbGFnIGFzIGNvbm5lY3RlZFxuICAgICAgcmVhZHlTdGF0ZSA9IFJTX0NPTk5FQ1RFRDtcblxuICAgICAgLy8gcGFzcyBtZXNzYWdlcyB0byB0aGUgcHJvY2Vzc29yXG4gICAgICBwdWxsKFxuICAgICAgICBzb3VyY2UsXG5cbiAgICAgICAgLy8gbW9uaXRvciBkaXNjb25uZWN0aW9uXG4gICAgICAgIHB1bGwudGhyb3VnaChudWxsLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZWFkeVN0YXRlID0gUlNfRElTQ09OTkVDVEVEO1xuICAgICAgICAgIHNpZ25hbGxlcignZGlzY29ubmVjdGVkJyk7XG4gICAgICAgIH0pLFxuICAgICAgICBwdWxsLmRyYWluKHByb2Nlc3NvcilcbiAgICAgICk7XG5cbiAgICAgIC8vIHBhc3MgdGhlIHF1ZXVlIHRvIHRoZSBzaW5rXG4gICAgICBwdWxsKHF1ZXVlLCBzaW5rKTtcblxuICAgICAgLy8gaGFuZGxlIGRpc2Nvbm5lY3Rpb25cbiAgICAgIHNpZ25hbGxlci5yZW1vdmVMaXN0ZW5lcignZGlzY29ubmVjdGVkJywgaGFuZGxlRGlzY29ubmVjdCk7XG4gICAgICBzaWduYWxsZXIub24oJ2Rpc2Nvbm5lY3RlZCcsIGhhbmRsZURpc2Nvbm5lY3QpO1xuXG4gICAgICAvLyB0cmlnZ2VyIHRoZSBjb25uZWN0ZWQgZXZlbnRcbiAgICAgIHNpZ25hbGxlcignY29ubmVjdGVkJyk7XG4gICAgfSk7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIHNpZ25hbGxlciNzZW5kKG1lc3NhZ2UsIGRhdGEqKVxuXG4gICAgVXNlIHRoZSBzZW5kIGZ1bmN0aW9uIHRvIHNlbmQgYSBtZXNzYWdlIHRvIG90aGVyIHBlZXJzIGluIHRoZSBjdXJyZW50XG4gICAgc2lnbmFsbGluZyBzY29wZSAoaWYgYW5ub3VuY2VkIGluIGEgcm9vbSB0aGlzIHdpbGwgYmUgYSByb29tLCBvdGhlcndpc2VcbiAgICBicm9hZGNhc3QgdG8gYWxsIHBlZXJzIGNvbm5lY3RlZCB0byB0aGUgc2lnbmFsbGluZyBzZXJ2ZXIpLlxuXG4gICoqL1xuICB2YXIgc2VuZCA9IHNpZ25hbGxlci5zZW5kID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gaXRlcmF0ZSBvdmVyIHRoZSBhcmd1bWVudHMgYW5kIHN0cmluZ2lmeSBhcyByZXF1aXJlZFxuICAgIC8vIHZhciBtZXRhZGF0YSA9IHsgaWQ6IHNpZ25hbGxlci5pZCB9O1xuICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXG4gICAgLy8gaW5qZWN0IHRoZSBtZXRhZGF0YVxuICAgIGFyZ3Muc3BsaWNlKDEsIDAsIGNyZWF0ZU1ldGFkYXRhKCkpO1xuICAgIGJ1ZmZlck1lc3NhZ2UoYXJncyk7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIGFubm91bmNlKGRhdGE/KVxuXG4gICAgVGhlIGBhbm5vdW5jZWAgZnVuY3Rpb24gb2YgdGhlIHNpZ25hbGxlciB3aWxsIHBhc3MgYW4gYC9hbm5vdW5jZWAgbWVzc2FnZVxuICAgIHRocm91Z2ggdGhlIG1lc3NlbmdlciBuZXR3b3JrLiAgV2hlbiBubyBhZGRpdGlvbmFsIGRhdGEgaXMgc3VwcGxpZWQgdG9cbiAgICB0aGlzIGZ1bmN0aW9uIHRoZW4gb25seSB0aGUgaWQgb2YgdGhlIHNpZ25hbGxlciBpcyBzZW50IHRvIGFsbCBhY3RpdmVcbiAgICBtZW1iZXJzIG9mIHRoZSBtZXNzZW5naW5nIG5ldHdvcmsuXG5cbiAgICAjIyMjIEpvaW5pbmcgUm9vbXNcblxuICAgIFRvIGpvaW4gYSByb29tIHVzaW5nIGFuIGFubm91bmNlIGNhbGwgeW91IHNpbXBseSBwcm92aWRlIHRoZSBuYW1lIG9mIHRoZVxuICAgIHJvb20geW91IHdpc2ggdG8gam9pbiBhcyBwYXJ0IG9mIHRoZSBkYXRhIGJsb2NrIHRoYXQgeW91IGFubm91Y2UsIGZvclxuICAgIGV4YW1wbGU6XG5cbiAgICBgYGBqc1xuICAgIHNpZ25hbGxlci5hbm5vdW5jZSh7IHJvb206ICd0ZXN0cm9vbScgfSk7XG4gICAgYGBgXG5cbiAgICBTaWduYWxsaW5nIHNlcnZlcnMgKHN1Y2ggYXNcbiAgICBbcnRjLXN3aXRjaGJvYXJkXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1zd2l0Y2hib2FyZCkpIHdpbGwgdGhlblxuICAgIHBsYWNlIHlvdXIgcGVlciBjb25uZWN0aW9uIGludG8gYSByb29tIHdpdGggb3RoZXIgcGVlcnMgdGhhdCBoYXZlIGFsc29cbiAgICBhbm5vdW5jZWQgaW4gdGhpcyByb29tLlxuXG4gICAgT25jZSB5b3UgaGF2ZSBqb2luZWQgYSByb29tLCB0aGUgc2VydmVyIHdpbGwgb25seSBkZWxpdmVyIG1lc3NhZ2VzIHRoYXRcbiAgICB5b3UgYHNlbmRgIHRvIG90aGVyIHBlZXJzIHdpdGhpbiB0aGF0IHJvb20uXG5cbiAgICAjIyMjIFByb3ZpZGluZyBBZGRpdGlvbmFsIEFubm91bmNlIERhdGFcblxuICAgIFRoZXJlIG1heSBiZSBpbnN0YW5jZXMgd2hlcmUgeW91IHdpc2ggdG8gc2VuZCBhZGRpdGlvbmFsIGRhdGEgYXMgcGFydCBvZlxuICAgIHlvdXIgYW5ub3VuY2UgbWVzc2FnZSBpbiB5b3VyIGFwcGxpY2F0aW9uLiAgRm9yIGluc3RhbmNlLCBtYXliZSB5b3Ugd2FudFxuICAgIHRvIHNlbmQgYW4gYWxpYXMgb3IgbmljayBhcyBwYXJ0IG9mIHlvdXIgYW5ub3VuY2UgbWVzc2FnZSByYXRoZXIgdGhhbiBqdXN0XG4gICAgdXNlIHRoZSBzaWduYWxsZXIncyBnZW5lcmF0ZWQgaWQuXG5cbiAgICBJZiBmb3IgaW5zdGFuY2UgeW91IHdlcmUgd3JpdGluZyBhIHNpbXBsZSBjaGF0IGFwcGxpY2F0aW9uIHlvdSBjb3VsZCBqb2luXG4gICAgdGhlIGB3ZWJydGNgIHJvb20gYW5kIHRlbGwgZXZlcnlvbmUgeW91ciBuYW1lIHdpdGggdGhlIGZvbGxvd2luZyBhbm5vdW5jZVxuICAgIGNhbGw6XG5cbiAgICBgYGBqc1xuICAgIHNpZ25hbGxlci5hbm5vdW5jZSh7XG4gICAgICByb29tOiAnd2VicnRjJyxcbiAgICAgIG5pY2s6ICdEYW1vbidcbiAgICB9KTtcbiAgICBgYGBcblxuICAgICMjIyMgQW5ub3VuY2luZyBVcGRhdGVzXG5cbiAgICBUaGUgc2lnbmFsbGVyIGlzIHdyaXR0ZW4gdG8gZGlzdGluZ3Vpc2ggYmV0d2VlbiBpbml0aWFsIHBlZXIgYW5ub3VuY2VtZW50c1xuICAgIGFuZCBwZWVyIGRhdGEgdXBkYXRlcyAoc2VlIHRoZSBkb2NzIG9uIHRoZSBhbm5vdW5jZSBoYW5kbGVyIGJlbG93KS4gQXNcbiAgICBzdWNoIGl0IGlzIG9rIHRvIHByb3ZpZGUgYW55IGRhdGEgdXBkYXRlcyB1c2luZyB0aGUgYW5ub3VuY2UgbWV0aG9kIGFsc28uXG5cbiAgICBGb3IgaW5zdGFuY2UsIEkgY291bGQgc2VuZCBhIHN0YXR1cyB1cGRhdGUgYXMgYW4gYW5ub3VuY2UgbWVzc2FnZSB0byBmbGFnXG4gICAgdGhhdCBJIGFtIGdvaW5nIG9mZmxpbmU6XG5cbiAgICBgYGBqc1xuICAgIHNpZ25hbGxlci5hbm5vdW5jZSh7IHN0YXR1czogJ29mZmxpbmUnIH0pO1xuICAgIGBgYFxuXG4gICoqL1xuICBzaWduYWxsZXIuYW5ub3VuY2UgPSBmdW5jdGlvbihkYXRhLCBzZW5kZXIpIHtcblxuICAgIGZ1bmN0aW9uIHNlbmRBbm5vdW5jZSgpIHtcbiAgICAgIChzZW5kZXIgfHwgc2VuZCkoJy9hbm5vdW5jZScsIGF0dHJpYnV0ZXMpO1xuICAgICAgc2lnbmFsbGVyKCdsb2NhbDphbm5vdW5jZScsIGF0dHJpYnV0ZXMpO1xuICAgIH1cblxuICAgIC8vIGlmIHdlIGFyZSBhbHJlYWR5IGNvbm5lY3RlZCwgdGhlbiBlbnN1cmUgd2UgYW5ub3VuY2Ugb24gcmVjb25uZWN0XG4gICAgaWYgKHJlYWR5U3RhdGUgPT09IFJTX0NPTk5FQ1RFRCkge1xuICAgICAgLy8gYWx3YXlzIGFubm91bmNlIG9uIHJlY29ubmVjdFxuICAgICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCdjb25uZWN0ZWQnLCBhbm5vdW5jZU9uUmVjb25uZWN0KTtcbiAgICAgIHNpZ25hbGxlci5vbignY29ubmVjdGVkJywgYW5ub3VuY2VPblJlY29ubmVjdCk7XG4gICAgfVxuXG4gICAgY2xlYXJUaW1lb3V0KGFubm91bmNlVGltZXIpO1xuXG4gICAgLy8gdXBkYXRlIGludGVybmFsIGF0dHJpYnV0ZXNcbiAgICBleHRlbmQoYXR0cmlidXRlcywgZGF0YSwgeyBpZDogc2lnbmFsbGVyLmlkIH0pO1xuXG4gICAgLy8gc2VuZCB0aGUgYXR0cmlidXRlcyBvdmVyIHRoZSBuZXR3b3JrXG4gICAgcmV0dXJuIGFubm91bmNlVGltZXIgPSBzZXRUaW1lb3V0KHNlbmRBbm5vdW5jZSwgKG9wdHMgfHwge30pLmFubm91bmNlRGVsYXkgfHwgMTApO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyBpc01hc3Rlcih0YXJnZXRJZClcblxuICAgIEEgc2ltcGxlIGZ1bmN0aW9uIHRoYXQgaW5kaWNhdGVzIHdoZXRoZXIgdGhlIGxvY2FsIHNpZ25hbGxlciBpcyB0aGUgbWFzdGVyXG4gICAgZm9yIGl0J3MgcmVsYXRpb25zaGlwIHdpdGggcGVlciBzaWduYWxsZXIgaW5kaWNhdGVkIGJ5IGB0YXJnZXRJZGAuICBSb2xlc1xuICAgIGFyZSBkZXRlcm1pbmVkIGF0IHRoZSBwb2ludCBhdCB3aGljaCBzaWduYWxsaW5nIHBlZXJzIGRpc2NvdmVyIGVhY2ggb3RoZXIsXG4gICAgYW5kIGFyZSBzaW1wbHkgd29ya2VkIG91dCBieSB3aGljaGV2ZXIgcGVlciBoYXMgdGhlIGxvd2VzdCBzaWduYWxsZXIgaWRcbiAgICB3aGVuIGxleGlncmFwaGljYWxseSBzb3J0ZWQuXG5cbiAgICBGb3IgZXhhbXBsZSwgaWYgd2UgaGF2ZSB0d28gc2lnbmFsbGVyIHBlZXJzIHRoYXQgaGF2ZSBkaXNjb3ZlcmVkIGVhY2hcbiAgICBvdGhlcnMgd2l0aCB0aGUgZm9sbG93aW5nIGlkczpcblxuICAgIC0gYGIxMWY0ZmQwLWZlYjUtNDQ3Yy04MGM4LWM1MWQ4YzNjY2VkMmBcbiAgICAtIGA4YTA3ZjgyZS00OWE1LTRiOWItYTAyZS00M2Q5MTEzODJiZTZgXG5cbiAgICBUaGV5IHdvdWxkIGJlIGFzc2lnbmVkIHJvbGVzOlxuXG4gICAgLSBgYjExZjRmZDAtZmViNS00NDdjLTgwYzgtYzUxZDhjM2NjZWQyYFxuICAgIC0gYDhhMDdmODJlLTQ5YTUtNGI5Yi1hMDJlLTQzZDkxMTM4MmJlNmAgKG1hc3RlcilcblxuICAqKi9cbiAgc2lnbmFsbGVyLmlzTWFzdGVyID0gZnVuY3Rpb24odGFyZ2V0SWQpIHtcbiAgICB2YXIgcGVlciA9IHBlZXJzLmdldCh0YXJnZXRJZCk7XG5cbiAgICByZXR1cm4gcGVlciAmJiBwZWVyLnJvbGVJZHggIT09IDA7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIGxlYXZlKClcblxuICAgIFRlbGwgdGhlIHNpZ25hbGxpbmcgc2VydmVyIHdlIGFyZSBsZWF2aW5nLiAgQ2FsbGluZyB0aGlzIGZ1bmN0aW9uIGlzXG4gICAgdXN1YWxseSBub3QgcmVxdWlyZWQgdGhvdWdoIGFzIHRoZSBzaWduYWxsaW5nIHNlcnZlciBzaG91bGQgaXNzdWUgY29ycmVjdFxuICAgIGAvbGVhdmVgIG1lc3NhZ2VzIHdoZW4gaXQgZGV0ZWN0cyBhIGRpc2Nvbm5lY3QgZXZlbnQuXG5cbiAgKiovXG4gIHNpZ25hbGxlci5sZWF2ZSA9IHNpZ25hbGxlci5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIHNlbmQgdGhlIGxlYXZlIHNpZ25hbFxuICAgIHNlbmQoJy9sZWF2ZScsIHsgaWQ6IGlkIH0pO1xuXG4gICAgLy8gc3RvcCBhbm5vdW5jaW5nIG9uIHJlY29ubmVjdFxuICAgIHNpZ25hbGxlci5yZW1vdmVMaXN0ZW5lcignZGlzY29ubmVjdGVkJywgaGFuZGxlRGlzY29ubmVjdCk7XG4gICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCdjb25uZWN0ZWQnLCBhbm5vdW5jZU9uUmVjb25uZWN0KTtcblxuICAgIC8vIGVuZCBvdXIgY3VycmVudCBxdWV1ZVxuICAgIHF1ZXVlLmVuZCgpO1xuXG4gICAgLy8gY3JlYXRlIGEgbmV3IHF1ZXVlIHRvIGJ1ZmZlciBuZXcgbWVzc2FnZXNcbiAgICBxdWV1ZSA9IHB1c2hhYmxlKCk7XG5cbiAgICAvLyBzZXQgY29ubmVjdGVkIHRvIGZhbHNlXG4gICAgcmVhZHlTdGF0ZSA9IFJTX0RJU0NPTk5FQ1RFRDtcbiAgfTtcblxuICAvKipcbiAgICAjIyMgbWV0YWRhdGEoZGF0YT8pXG5cbiAgICBHZXQgKHBhc3Mgbm8gZGF0YSkgb3Igc2V0IHRoZSBtZXRhZGF0YSB0aGF0IGlzIHBhc3NlZCB0aHJvdWdoIHdpdGggZWFjaFxuICAgIHJlcXVlc3Qgc2VudCBieSB0aGUgc2lnbmFsbGVyLlxuXG4gICAgX19OT1RFOl9fIFJlZ2FyZGxlc3Mgb2Ygd2hhdCBpcyBwYXNzZWQgdG8gdGhpcyBmdW5jdGlvbiwgbWV0YWRhdGFcbiAgICBnZW5lcmF0ZWQgYnkgdGhlIHNpZ25hbGxlciB3aWxsICoqYWx3YXlzKiogaW5jbHVkZSB0aGUgaWQgb2YgdGhlIHNpZ25hbGxlclxuICAgIGFuZCB0aGlzIGNhbm5vdCBiZSBtb2RpZmllZC5cbiAgKiovXG4gIHNpZ25hbGxlci5tZXRhZGF0YSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBjb25zb2xlLndhcm4oJ21ldGFkYXRhIGlzIGRlcHJlY2F0ZWQsIHBsZWFzZSBkbyBub3QgdXNlJyk7XG5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGV4dGVuZCh7fSwgbG9jYWxNZXRhKTtcbiAgICB9XG5cbiAgICBsb2NhbE1ldGEgPSBleHRlbmQoe30sIGRhdGEpO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyB0byh0YXJnZXRJZClcblxuICAgIFVzZSB0aGUgYHRvYCBmdW5jdGlvbiB0byBzZW5kIGEgbWVzc2FnZSB0byB0aGUgc3BlY2lmaWVkIHRhcmdldCBwZWVyLlxuICAgIEEgbGFyZ2UgcGFyZ2Ugb2YgbmVnb3RpYXRpbmcgYSBXZWJSVEMgcGVlciBjb25uZWN0aW9uIGludm9sdmVzIGRpcmVjdFxuICAgIGNvbW11bmljYXRpb24gYmV0d2VlbiB0d28gcGFydGllcyB3aGljaCBtdXN0IGJlIGRvbmUgYnkgdGhlIHNpZ25hbGxpbmdcbiAgICBzZXJ2ZXIuICBUaGUgYHRvYCBmdW5jdGlvbiBwcm92aWRlcyBhIHNpbXBsZSB3YXkgdG8gcHJvdmlkZSBhIGxvZ2ljYWxcbiAgICBjb21tdW5pY2F0aW9uIGNoYW5uZWwgYmV0d2VlbiB0aGUgdHdvIHBhcnRpZXM6XG5cbiAgICBgYGBqc1xuICAgIHZhciBzZW5kID0gc2lnbmFsbGVyLnRvKCdlOTVmYTA1Yi05MDYyLTQ1YzYtYmZhMi01MDU1YmY2NjI1ZjQnKS5zZW5kO1xuXG4gICAgLy8gY3JlYXRlIGFuIG9mZmVyIG9uIGEgbG9jYWwgcGVlciBjb25uZWN0aW9uXG4gICAgcGMuY3JlYXRlT2ZmZXIoXG4gICAgICBmdW5jdGlvbihkZXNjKSB7XG4gICAgICAgIC8vIHNldCB0aGUgbG9jYWwgZGVzY3JpcHRpb24gdXNpbmcgdGhlIG9mZmVyIHNkcFxuICAgICAgICAvLyBpZiB0aGlzIG9jY3VycyBzdWNjZXNzZnVsbHkgc2VuZCB0aGlzIHRvIG91ciBwZWVyXG4gICAgICAgIHBjLnNldExvY2FsRGVzY3JpcHRpb24oXG4gICAgICAgICAgZGVzYyxcbiAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHNlbmQoJy9zZHAnLCBkZXNjKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGhhbmRsZUZhaWxcbiAgICAgICAgKTtcbiAgICAgIH0sXG4gICAgICBoYW5kbGVGYWlsXG4gICAgKTtcbiAgICBgYGBcblxuICAqKi9cbiAgc2lnbmFsbGVyLnRvID0gZnVuY3Rpb24odGFyZ2V0SWQpIHtcbiAgICAvLyBjcmVhdGUgYSBzZW5kZXIgdGhhdCB3aWxsIHByZXBlbmQgbWVzc2FnZXMgd2l0aCAvdG98dGFyZ2V0SWR8XG4gICAgdmFyIHNlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gZ2V0IHRoZSBwZWVyICh5ZXMgd2hlbiBzZW5kIGlzIGNhbGxlZCB0byBtYWtlIHN1cmUgaXQgaGFzbid0IGxlZnQpXG4gICAgICB2YXIgcGVlciA9IHNpZ25hbGxlci5wZWVycy5nZXQodGFyZ2V0SWQpO1xuICAgICAgdmFyIGFyZ3M7XG5cbiAgICAgIGlmICghIHBlZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIHBlZXI6ICcgKyB0YXJnZXRJZCk7XG4gICAgICB9XG5cbiAgICAgIC8vIGlmIHRoZSBwZWVyIGlzIGluYWN0aXZlLCB0aGVuIGFib3J0XG4gICAgICBpZiAocGVlci5pbmFjdGl2ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGFyZ3MgPSBbXG4gICAgICAgICcvdG8nLFxuICAgICAgICB0YXJnZXRJZFxuICAgICAgXS5jb25jYXQoW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcblxuICAgICAgLy8gaW5qZWN0IG1ldGFkYXRhXG4gICAgICBhcmdzLnNwbGljZSgzLCAwLCBjcmVhdGVNZXRhZGF0YSgpKTtcbiAgICAgIGJ1ZmZlck1lc3NhZ2UoYXJncyk7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICBhbm5vdW5jZTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICByZXR1cm4gc2lnbmFsbGVyLmFubm91bmNlKGRhdGEsIHNlbmRlcik7XG4gICAgICB9LFxuXG4gICAgICBzZW5kOiBzZW5kZXIsXG4gICAgfTtcbiAgfTtcblxuICAvLyBpbml0aWFsaXNlIG9wdHMgZGVmYXVsdHNcbiAgb3B0cyA9IGRlZmF1bHRzKHt9LCBvcHRzLCByZXF1aXJlKCcuL2RlZmF1bHRzJykpO1xuXG4gIC8vIHNldCB0aGUgYXV0b3JlcGx5IGZsYWdcbiAgc2lnbmFsbGVyLmF1dG9yZXBseSA9IGF1dG9yZXBseSA9PT0gdW5kZWZpbmVkIHx8IGF1dG9yZXBseTtcblxuICAvLyBjcmVhdGUgdGhlIHByb2Nlc3NvclxuICBzaWduYWxsZXIucHJvY2VzcyA9IHByb2Nlc3NvciA9IHJlcXVpcmUoJy4vcHJvY2Vzc29yJykoc2lnbmFsbGVyLCBvcHRzKTtcblxuICAvLyBhdXRvY29ubmVjdFxuICBpZiAoYXV0b2Nvbm5lY3QgPT09IHVuZGVmaW5lZCB8fCBhdXRvY29ubmVjdCkge1xuICAgIGNvbm5lY3QoKTtcbiAgfVxuXG4gIHJldHVybiBzaWduYWxsZXI7XG59O1xuIiwiLyoqXG4gKiBjdWlkLmpzXG4gKiBDb2xsaXNpb24tcmVzaXN0YW50IFVJRCBnZW5lcmF0b3IgZm9yIGJyb3dzZXJzIGFuZCBub2RlLlxuICogU2VxdWVudGlhbCBmb3IgZmFzdCBkYiBsb29rdXBzIGFuZCByZWNlbmN5IHNvcnRpbmcuXG4gKiBTYWZlIGZvciBlbGVtZW50IElEcyBhbmQgc2VydmVyLXNpZGUgbG9va3Vwcy5cbiAqXG4gKiBFeHRyYWN0ZWQgZnJvbSBDTENUUlxuICogXG4gKiBDb3B5cmlnaHQgKGMpIEVyaWMgRWxsaW90dCAyMDEyXG4gKiBNSVQgTGljZW5zZVxuICovXG5cbi8qZ2xvYmFsIHdpbmRvdywgbmF2aWdhdG9yLCBkb2N1bWVudCwgcmVxdWlyZSwgcHJvY2VzcywgbW9kdWxlICovXG4oZnVuY3Rpb24gKGFwcCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBuYW1lc3BhY2UgPSAnY3VpZCcsXG4gICAgYyA9IDAsXG4gICAgYmxvY2tTaXplID0gNCxcbiAgICBiYXNlID0gMzYsXG4gICAgZGlzY3JldGVWYWx1ZXMgPSBNYXRoLnBvdyhiYXNlLCBibG9ja1NpemUpLFxuXG4gICAgcGFkID0gZnVuY3Rpb24gcGFkKG51bSwgc2l6ZSkge1xuICAgICAgdmFyIHMgPSBcIjAwMDAwMDAwMFwiICsgbnVtO1xuICAgICAgcmV0dXJuIHMuc3Vic3RyKHMubGVuZ3RoLXNpemUpO1xuICAgIH0sXG5cbiAgICByYW5kb21CbG9jayA9IGZ1bmN0aW9uIHJhbmRvbUJsb2NrKCkge1xuICAgICAgcmV0dXJuIHBhZCgoTWF0aC5yYW5kb20oKSAqXG4gICAgICAgICAgICBkaXNjcmV0ZVZhbHVlcyA8PCAwKVxuICAgICAgICAgICAgLnRvU3RyaW5nKGJhc2UpLCBibG9ja1NpemUpO1xuICAgIH0sXG5cbiAgICBzYWZlQ291bnRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGMgPSAoYyA8IGRpc2NyZXRlVmFsdWVzKSA/IGMgOiAwO1xuICAgICAgYysrOyAvLyB0aGlzIGlzIG5vdCBzdWJsaW1pbmFsXG4gICAgICByZXR1cm4gYyAtIDE7XG4gICAgfSxcblxuICAgIGFwaSA9IGZ1bmN0aW9uIGN1aWQoKSB7XG4gICAgICAvLyBTdGFydGluZyB3aXRoIGEgbG93ZXJjYXNlIGxldHRlciBtYWtlc1xuICAgICAgLy8gaXQgSFRNTCBlbGVtZW50IElEIGZyaWVuZGx5LlxuICAgICAgdmFyIGxldHRlciA9ICdjJywgLy8gaGFyZC1jb2RlZCBhbGxvd3MgZm9yIHNlcXVlbnRpYWwgYWNjZXNzXG5cbiAgICAgICAgLy8gdGltZXN0YW1wXG4gICAgICAgIC8vIHdhcm5pbmc6IHRoaXMgZXhwb3NlcyB0aGUgZXhhY3QgZGF0ZSBhbmQgdGltZVxuICAgICAgICAvLyB0aGF0IHRoZSB1aWQgd2FzIGNyZWF0ZWQuXG4gICAgICAgIHRpbWVzdGFtcCA9IChuZXcgRGF0ZSgpLmdldFRpbWUoKSkudG9TdHJpbmcoYmFzZSksXG5cbiAgICAgICAgLy8gUHJldmVudCBzYW1lLW1hY2hpbmUgY29sbGlzaW9ucy5cbiAgICAgICAgY291bnRlcixcblxuICAgICAgICAvLyBBIGZldyBjaGFycyB0byBnZW5lcmF0ZSBkaXN0aW5jdCBpZHMgZm9yIGRpZmZlcmVudFxuICAgICAgICAvLyBjbGllbnRzIChzbyBkaWZmZXJlbnQgY29tcHV0ZXJzIGFyZSBmYXIgbGVzc1xuICAgICAgICAvLyBsaWtlbHkgdG8gZ2VuZXJhdGUgdGhlIHNhbWUgaWQpXG4gICAgICAgIGZpbmdlcnByaW50ID0gYXBpLmZpbmdlcnByaW50KCksXG5cbiAgICAgICAgLy8gR3JhYiBzb21lIG1vcmUgY2hhcnMgZnJvbSBNYXRoLnJhbmRvbSgpXG4gICAgICAgIHJhbmRvbSA9IHJhbmRvbUJsb2NrKCkgKyByYW5kb21CbG9jaygpO1xuXG4gICAgICAgIGNvdW50ZXIgPSBwYWQoc2FmZUNvdW50ZXIoKS50b1N0cmluZyhiYXNlKSwgYmxvY2tTaXplKTtcblxuICAgICAgcmV0dXJuICAobGV0dGVyICsgdGltZXN0YW1wICsgY291bnRlciArIGZpbmdlcnByaW50ICsgcmFuZG9tKTtcbiAgICB9O1xuXG4gIGFwaS5zbHVnID0gZnVuY3Rpb24gc2x1ZygpIHtcbiAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpLnRvU3RyaW5nKDM2KSxcbiAgICAgIGNvdW50ZXIsXG4gICAgICBwcmludCA9IGFwaS5maW5nZXJwcmludCgpLnNsaWNlKDAsMSkgK1xuICAgICAgICBhcGkuZmluZ2VycHJpbnQoKS5zbGljZSgtMSksXG4gICAgICByYW5kb20gPSByYW5kb21CbG9jaygpLnNsaWNlKC0yKTtcblxuICAgICAgY291bnRlciA9IHNhZmVDb3VudGVyKCkudG9TdHJpbmcoMzYpLnNsaWNlKC00KTtcblxuICAgIHJldHVybiBkYXRlLnNsaWNlKC0yKSArIFxuICAgICAgY291bnRlciArIHByaW50ICsgcmFuZG9tO1xuICB9O1xuXG4gIGFwaS5nbG9iYWxDb3VudCA9IGZ1bmN0aW9uIGdsb2JhbENvdW50KCkge1xuICAgIC8vIFdlIHdhbnQgdG8gY2FjaGUgdGhlIHJlc3VsdHMgb2YgdGhpc1xuICAgIHZhciBjYWNoZSA9IChmdW5jdGlvbiBjYWxjKCkge1xuICAgICAgICB2YXIgaSxcbiAgICAgICAgICBjb3VudCA9IDA7XG5cbiAgICAgICAgZm9yIChpIGluIHdpbmRvdykge1xuICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgICB9KCkpO1xuXG4gICAgYXBpLmdsb2JhbENvdW50ID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gY2FjaGU7IH07XG4gICAgcmV0dXJuIGNhY2hlO1xuICB9O1xuXG4gIGFwaS5maW5nZXJwcmludCA9IGZ1bmN0aW9uIGJyb3dzZXJQcmludCgpIHtcbiAgICByZXR1cm4gcGFkKChuYXZpZ2F0b3IubWltZVR5cGVzLmxlbmd0aCArXG4gICAgICBuYXZpZ2F0b3IudXNlckFnZW50Lmxlbmd0aCkudG9TdHJpbmcoMzYpICtcbiAgICAgIGFwaS5nbG9iYWxDb3VudCgpLnRvU3RyaW5nKDM2KSwgNCk7XG4gIH07XG5cbiAgLy8gZG9uJ3QgY2hhbmdlIGFueXRoaW5nIGZyb20gaGVyZSBkb3duLlxuICBpZiAoYXBwLnJlZ2lzdGVyKSB7XG4gICAgYXBwLnJlZ2lzdGVyKG5hbWVzcGFjZSwgYXBpKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gYXBpO1xuICB9IGVsc2Uge1xuICAgIGFwcFtuYW1lc3BhY2VdID0gYXBpO1xuICB9XG5cbn0odGhpcy5hcHBsaXR1ZGUgfHwgdGhpcykpO1xuIiwidmFyIHB1bGwgPSByZXF1aXJlKCdwdWxsLXN0cmVhbScpXG5cbm1vZHVsZS5leHBvcnRzID0gcHVsbC5Tb3VyY2UoZnVuY3Rpb24gKG9uQ2xvc2UpIHtcbiAgdmFyIGJ1ZmZlciA9IFtdLCBjYnMgPSBbXSwgd2FpdGluZyA9IFtdLCBlbmRlZFxuXG4gIGZ1bmN0aW9uIGRyYWluKCkge1xuICAgIHZhciBsXG4gICAgd2hpbGUod2FpdGluZy5sZW5ndGggJiYgKChsID0gYnVmZmVyLmxlbmd0aCkgfHwgZW5kZWQpKSB7XG4gICAgICB2YXIgZGF0YSA9IGJ1ZmZlci5zaGlmdCgpXG4gICAgICB2YXIgY2IgICA9IGNicy5zaGlmdCgpXG4gICAgICB3YWl0aW5nLnNoaWZ0KCkobCA/IG51bGwgOiBlbmRlZCwgZGF0YSlcbiAgICAgIGNiICYmIGNiKGVuZGVkID09PSB0cnVlID8gbnVsbCA6IGVuZGVkKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWQgKGVuZCwgY2IpIHtcbiAgICBlbmRlZCA9IGVuZGVkIHx8IGVuZFxuICAgIHdhaXRpbmcucHVzaChjYilcbiAgICBkcmFpbigpXG4gICAgaWYoZW5kZWQpXG4gICAgICBvbkNsb3NlICYmIG9uQ2xvc2UoZW5kZWQgPT09IHRydWUgPyBudWxsIDogZW5kZWQpXG4gIH1cblxuICByZWFkLnB1c2ggPSBmdW5jdGlvbiAoZGF0YSwgY2IpIHtcbiAgICBpZihlbmRlZClcbiAgICAgIHJldHVybiBjYiAmJiBjYihlbmRlZCA9PT0gdHJ1ZSA/IG51bGwgOiBlbmRlZClcbiAgICBidWZmZXIucHVzaChkYXRhKTsgY2JzLnB1c2goY2IpXG4gICAgZHJhaW4oKVxuICB9XG5cbiAgcmVhZC5lbmQgPSBmdW5jdGlvbiAoZW5kLCBjYikge1xuICAgIGlmKCdmdW5jdGlvbicgPT09IHR5cGVvZiBlbmQpXG4gICAgICBjYiA9IGVuZCwgZW5kID0gdHJ1ZVxuICAgIGVuZGVkID0gZW5kZWQgfHwgZW5kIHx8IHRydWU7XG4gICAgaWYoY2IpIGNicy5wdXNoKGNiKVxuICAgIGRyYWluKClcbiAgICBpZihlbmRlZClcbiAgICAgIG9uQ2xvc2UgJiYgb25DbG9zZShlbmRlZCA9PT0gdHJ1ZSA/IG51bGwgOiBlbmRlZClcbiAgfVxuXG4gIHJldHVybiByZWFkXG59KVxuXG4iLCJcbnZhciBzb3VyY2VzICA9IHJlcXVpcmUoJy4vc291cmNlcycpXG52YXIgc2lua3MgICAgPSByZXF1aXJlKCcuL3NpbmtzJylcbnZhciB0aHJvdWdocyA9IHJlcXVpcmUoJy4vdGhyb3VnaHMnKVxudmFyIHUgICAgICAgID0gcmVxdWlyZSgncHVsbC1jb3JlJylcblxuZm9yKHZhciBrIGluIHNvdXJjZXMpXG4gIGV4cG9ydHNba10gPSB1LlNvdXJjZShzb3VyY2VzW2tdKVxuXG5mb3IodmFyIGsgaW4gdGhyb3VnaHMpXG4gIGV4cG9ydHNba10gPSB1LlRocm91Z2godGhyb3VnaHNba10pXG5cbmZvcih2YXIgayBpbiBzaW5rcylcbiAgZXhwb3J0c1trXSA9IHUuU2luayhzaW5rc1trXSlcblxudmFyIG1heWJlID0gcmVxdWlyZSgnLi9tYXliZScpKGV4cG9ydHMpXG5cbmZvcih2YXIgayBpbiBtYXliZSlcbiAgZXhwb3J0c1trXSA9IG1heWJlW2tdXG5cbmV4cG9ydHMuRHVwbGV4ICA9IFxuZXhwb3J0cy5UaHJvdWdoID0gZXhwb3J0cy5waXBlYWJsZSAgICAgICA9IHUuVGhyb3VnaFxuZXhwb3J0cy5Tb3VyY2UgID0gZXhwb3J0cy5waXBlYWJsZVNvdXJjZSA9IHUuU291cmNlXG5leHBvcnRzLlNpbmsgICAgPSBleHBvcnRzLnBpcGVhYmxlU2luayAgID0gdS5TaW5rXG5cblxuIiwidmFyIHUgPSByZXF1aXJlKCdwdWxsLWNvcmUnKVxudmFyIHByb3AgPSB1LnByb3BcbnZhciBpZCAgID0gdS5pZFxudmFyIG1heWJlU2luayA9IHUubWF5YmVTaW5rXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHB1bGwpIHtcblxuICB2YXIgZXhwb3J0cyA9IHt9XG4gIHZhciBkcmFpbiA9IHB1bGwuZHJhaW5cblxuICB2YXIgZmluZCA9IFxuICBleHBvcnRzLmZpbmQgPSBmdW5jdGlvbiAodGVzdCwgY2IpIHtcbiAgICByZXR1cm4gbWF5YmVTaW5rKGZ1bmN0aW9uIChjYikge1xuICAgICAgdmFyIGVuZGVkID0gZmFsc2VcbiAgICAgIGlmKCFjYilcbiAgICAgICAgY2IgPSB0ZXN0LCB0ZXN0ID0gaWRcbiAgICAgIGVsc2VcbiAgICAgICAgdGVzdCA9IHByb3AodGVzdCkgfHwgaWRcblxuICAgICAgcmV0dXJuIGRyYWluKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGlmKHRlc3QoZGF0YSkpIHtcbiAgICAgICAgICBlbmRlZCA9IHRydWVcbiAgICAgICAgICBjYihudWxsLCBkYXRhKVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICBpZihlbmRlZCkgcmV0dXJuIC8vYWxyZWFkeSBjYWxsZWQgYmFja1xuICAgICAgICBjYihlcnIgPT09IHRydWUgPyBudWxsIDogZXJyLCBudWxsKVxuICAgICAgfSlcblxuICAgIH0sIGNiKVxuICB9XG5cbiAgdmFyIHJlZHVjZSA9IGV4cG9ydHMucmVkdWNlID0gXG4gIGZ1bmN0aW9uIChyZWR1Y2UsIGFjYywgY2IpIHtcbiAgICBcbiAgICByZXR1cm4gbWF5YmVTaW5rKGZ1bmN0aW9uIChjYikge1xuICAgICAgcmV0dXJuIGRyYWluKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGFjYyA9IHJlZHVjZShhY2MsIGRhdGEpXG4gICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIGNiKGVyciwgYWNjKVxuICAgICAgfSlcblxuICAgIH0sIGNiKVxuICB9XG5cbiAgdmFyIGNvbGxlY3QgPSBleHBvcnRzLmNvbGxlY3QgPSBleHBvcnRzLndyaXRlQXJyYXkgPVxuICBmdW5jdGlvbiAoY2IpIHtcbiAgICByZXR1cm4gcmVkdWNlKGZ1bmN0aW9uIChhcnIsIGl0ZW0pIHtcbiAgICAgIGFyci5wdXNoKGl0ZW0pXG4gICAgICByZXR1cm4gYXJyXG4gICAgfSwgW10sIGNiKVxuICB9XG5cbiAgcmV0dXJuIGV4cG9ydHNcbn1cbiIsImV4cG9ydHMuaWQgPSBcbmZ1bmN0aW9uIChpdGVtKSB7XG4gIHJldHVybiBpdGVtXG59XG5cbmV4cG9ydHMucHJvcCA9IFxuZnVuY3Rpb24gKG1hcCkgeyAgXG4gIGlmKCdzdHJpbmcnID09IHR5cGVvZiBtYXApIHtcbiAgICB2YXIga2V5ID0gbWFwXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChkYXRhKSB7IHJldHVybiBkYXRhW2tleV0gfVxuICB9XG4gIHJldHVybiBtYXBcbn1cblxuZXhwb3J0cy50ZXN0ZXIgPSBmdW5jdGlvbiAodGVzdCkge1xuICBpZighdGVzdCkgcmV0dXJuIGV4cG9ydHMuaWRcbiAgaWYoJ29iamVjdCcgPT09IHR5cGVvZiB0ZXN0XG4gICAgJiYgJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHRlc3QudGVzdClcbiAgICAgIHJldHVybiB0ZXN0LnRlc3QuYmluZCh0ZXN0KVxuICByZXR1cm4gZXhwb3J0cy5wcm9wKHRlc3QpIHx8IGV4cG9ydHMuaWRcbn1cblxuZXhwb3J0cy5hZGRQaXBlID0gYWRkUGlwZVxuXG5mdW5jdGlvbiBhZGRQaXBlKHJlYWQpIHtcbiAgaWYoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIHJlYWQpXG4gICAgcmV0dXJuIHJlYWRcblxuICByZWFkLnBpcGUgPSByZWFkLnBpcGUgfHwgZnVuY3Rpb24gKHJlYWRlcikge1xuICAgIGlmKCdmdW5jdGlvbicgIT0gdHlwZW9mIHJlYWRlcilcbiAgICAgIHRocm93IG5ldyBFcnJvcignbXVzdCBwaXBlIHRvIHJlYWRlcicpXG4gICAgcmV0dXJuIGFkZFBpcGUocmVhZGVyKHJlYWQpKVxuICB9XG4gIHJlYWQudHlwZSA9ICdTb3VyY2UnXG4gIHJldHVybiByZWFkXG59XG5cbnZhciBTb3VyY2UgPVxuZXhwb3J0cy5Tb3VyY2UgPVxuZnVuY3Rpb24gU291cmNlIChjcmVhdGVSZWFkKSB7XG4gIGZ1bmN0aW9uIHMoKSB7XG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICByZXR1cm4gYWRkUGlwZShjcmVhdGVSZWFkLmFwcGx5KG51bGwsIGFyZ3MpKVxuICB9XG4gIHMudHlwZSA9ICdTb3VyY2UnXG4gIHJldHVybiBzXG59XG5cblxudmFyIFRocm91Z2ggPVxuZXhwb3J0cy5UaHJvdWdoID0gXG5mdW5jdGlvbiAoY3JlYXRlUmVhZCkge1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgdmFyIHBpcGVkID0gW11cbiAgICBmdW5jdGlvbiByZWFkZXIgKHJlYWQpIHtcbiAgICAgIGFyZ3MudW5zaGlmdChyZWFkKVxuICAgICAgcmVhZCA9IGNyZWF0ZVJlYWQuYXBwbHkobnVsbCwgYXJncylcbiAgICAgIHdoaWxlKHBpcGVkLmxlbmd0aClcbiAgICAgICAgcmVhZCA9IHBpcGVkLnNoaWZ0KCkocmVhZClcbiAgICAgIHJldHVybiByZWFkXG4gICAgICAvL3BpcGVpbmcgdG8gZnJvbSB0aGlzIHJlYWRlciBzaG91bGQgY29tcG9zZS4uLlxuICAgIH1cbiAgICByZWFkZXIucGlwZSA9IGZ1bmN0aW9uIChyZWFkKSB7XG4gICAgICBwaXBlZC5wdXNoKHJlYWQpIFxuICAgICAgaWYocmVhZC50eXBlID09PSAnU291cmNlJylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgcGlwZSAnICsgcmVhZGVyLnR5cGUgKyAnIHRvIFNvdXJjZScpXG4gICAgICByZWFkZXIudHlwZSA9IHJlYWQudHlwZSA9PT0gJ1NpbmsnID8gJ1NpbmsnIDogJ1Rocm91Z2gnXG4gICAgICByZXR1cm4gcmVhZGVyXG4gICAgfVxuICAgIHJlYWRlci50eXBlID0gJ1Rocm91Z2gnXG4gICAgcmV0dXJuIHJlYWRlclxuICB9XG59XG5cbnZhciBTaW5rID1cbmV4cG9ydHMuU2luayA9IFxuZnVuY3Rpb24gU2luayhjcmVhdGVSZWFkZXIpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgIGlmKCFjcmVhdGVSZWFkZXIpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ211c3QgYmUgY3JlYXRlUmVhZGVyIGZ1bmN0aW9uJylcbiAgICBmdW5jdGlvbiBzIChyZWFkKSB7XG4gICAgICBhcmdzLnVuc2hpZnQocmVhZClcbiAgICAgIHJldHVybiBjcmVhdGVSZWFkZXIuYXBwbHkobnVsbCwgYXJncylcbiAgICB9XG4gICAgcy50eXBlID0gJ1NpbmsnXG4gICAgcmV0dXJuIHNcbiAgfVxufVxuXG5cbmV4cG9ydHMubWF5YmVTaW5rID0gXG5leHBvcnRzLm1heWJlRHJhaW4gPSBcbmZ1bmN0aW9uIChjcmVhdGVTaW5rLCBjYikge1xuICBpZighY2IpXG4gICAgcmV0dXJuIFRocm91Z2goZnVuY3Rpb24gKHJlYWQpIHtcbiAgICAgIHZhciBlbmRlZFxuICAgICAgcmV0dXJuIGZ1bmN0aW9uIChjbG9zZSwgY2IpIHtcbiAgICAgICAgaWYoY2xvc2UpIHJldHVybiByZWFkKGNsb3NlLCBjYilcbiAgICAgICAgaWYoZW5kZWQpIHJldHVybiBjYihlbmRlZClcblxuICAgICAgICBjcmVhdGVTaW5rKGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcbiAgICAgICAgICBlbmRlZCA9IGVyciB8fCB0cnVlXG4gICAgICAgICAgaWYoIWVycikgY2IobnVsbCwgZGF0YSlcbiAgICAgICAgICBlbHNlICAgICBjYihlbmRlZClcbiAgICAgICAgfSkgKHJlYWQpXG4gICAgICB9XG4gICAgfSkoKVxuXG4gIHJldHVybiBTaW5rKGZ1bmN0aW9uIChyZWFkKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVNpbmsoY2IpIChyZWFkKVxuICB9KSgpXG59XG5cbiIsInZhciBkcmFpbiA9IGV4cG9ydHMuZHJhaW4gPSBmdW5jdGlvbiAocmVhZCwgb3AsIGRvbmUpIHtcblxuICA7KGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgdmFyIGxvb3AgPSB0cnVlLCBjYmVkID0gZmFsc2VcbiAgICB3aGlsZShsb29wKSB7XG4gICAgICBjYmVkID0gZmFsc2VcbiAgICAgIHJlYWQobnVsbCwgZnVuY3Rpb24gKGVuZCwgZGF0YSkge1xuICAgICAgICBjYmVkID0gdHJ1ZVxuICAgICAgICBpZihlbmQpIHtcbiAgICAgICAgICBsb29wID0gZmFsc2VcbiAgICAgICAgICBkb25lICYmIGRvbmUoZW5kID09PSB0cnVlID8gbnVsbCA6IGVuZClcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKG9wICYmIGZhbHNlID09PSBvcChkYXRhKSkge1xuICAgICAgICAgIGxvb3AgPSBmYWxzZVxuICAgICAgICAgIHJlYWQodHJ1ZSwgZG9uZSB8fCBmdW5jdGlvbiAoKSB7fSlcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKCFsb29wKXtcbiAgICAgICAgICBuZXh0KClcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIGlmKCFjYmVkKSB7XG4gICAgICAgIGxvb3AgPSBmYWxzZVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICB9XG4gIH0pKClcbn1cblxudmFyIG9uRW5kID0gZXhwb3J0cy5vbkVuZCA9IGZ1bmN0aW9uIChyZWFkLCBkb25lKSB7XG4gIHJldHVybiBkcmFpbihyZWFkLCBudWxsLCBkb25lKVxufVxuXG52YXIgbG9nID0gZXhwb3J0cy5sb2cgPSBmdW5jdGlvbiAocmVhZCwgZG9uZSkge1xuICByZXR1cm4gZHJhaW4ocmVhZCwgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBjb25zb2xlLmxvZyhkYXRhKVxuICB9LCBkb25lKVxufVxuXG4iLCJcbnZhciBrZXlzID0gZXhwb3J0cy5rZXlzID1cbmZ1bmN0aW9uIChvYmplY3QpIHtcbiAgcmV0dXJuIHZhbHVlcyhPYmplY3Qua2V5cyhvYmplY3QpKVxufVxuXG52YXIgb25jZSA9IGV4cG9ydHMub25jZSA9XG5mdW5jdGlvbiAodmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIChhYm9ydCwgY2IpIHtcbiAgICBpZihhYm9ydCkgcmV0dXJuIGNiKGFib3J0KVxuICAgIGlmKHZhbHVlICE9IG51bGwpIHtcbiAgICAgIHZhciBfdmFsdWUgPSB2YWx1ZTsgdmFsdWUgPSBudWxsXG4gICAgICBjYihudWxsLCBfdmFsdWUpXG4gICAgfSBlbHNlXG4gICAgICBjYih0cnVlKVxuICB9XG59XG5cbnZhciB2YWx1ZXMgPSBleHBvcnRzLnZhbHVlcyA9IGV4cG9ydHMucmVhZEFycmF5ID1cbmZ1bmN0aW9uIChhcnJheSkge1xuICBpZighQXJyYXkuaXNBcnJheShhcnJheSkpXG4gICAgYXJyYXkgPSBPYmplY3Qua2V5cyhhcnJheSkubWFwKGZ1bmN0aW9uIChrKSB7XG4gICAgICByZXR1cm4gYXJyYXlba11cbiAgICB9KVxuICB2YXIgaSA9IDBcbiAgcmV0dXJuIGZ1bmN0aW9uIChlbmQsIGNiKSB7XG4gICAgaWYoZW5kKVxuICAgICAgcmV0dXJuIGNiICYmIGNiKGVuZCkgIFxuICAgIGNiKGkgPj0gYXJyYXkubGVuZ3RoIHx8IG51bGwsIGFycmF5W2krK10pXG4gIH1cbn1cblxuXG52YXIgY291bnQgPSBleHBvcnRzLmNvdW50ID0gXG5mdW5jdGlvbiAobWF4KSB7XG4gIHZhciBpID0gMDsgbWF4ID0gbWF4IHx8IEluZmluaXR5XG4gIHJldHVybiBmdW5jdGlvbiAoZW5kLCBjYikge1xuICAgIGlmKGVuZCkgcmV0dXJuIGNiICYmIGNiKGVuZClcbiAgICBpZihpID4gbWF4KVxuICAgICAgcmV0dXJuIGNiKHRydWUpXG4gICAgY2IobnVsbCwgaSsrKVxuICB9XG59XG5cbnZhciBpbmZpbml0ZSA9IGV4cG9ydHMuaW5maW5pdGUgPSBcbmZ1bmN0aW9uIChnZW5lcmF0ZSkge1xuICBnZW5lcmF0ZSA9IGdlbmVyYXRlIHx8IE1hdGgucmFuZG9tXG4gIHJldHVybiBmdW5jdGlvbiAoZW5kLCBjYikge1xuICAgIGlmKGVuZCkgcmV0dXJuIGNiICYmIGNiKGVuZClcbiAgICByZXR1cm4gY2IobnVsbCwgZ2VuZXJhdGUoKSlcbiAgfVxufVxuXG52YXIgZGVmZXIgPSBleHBvcnRzLmRlZmVyID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX3JlYWQsIGNicyA9IFtdLCBfZW5kXG5cbiAgdmFyIHJlYWQgPSBmdW5jdGlvbiAoZW5kLCBjYikge1xuICAgIGlmKCFfcmVhZCkge1xuICAgICAgX2VuZCA9IGVuZFxuICAgICAgY2JzLnB1c2goY2IpXG4gICAgfSBcbiAgICBlbHNlIF9yZWFkKGVuZCwgY2IpXG4gIH1cbiAgcmVhZC5yZXNvbHZlID0gZnVuY3Rpb24gKHJlYWQpIHtcbiAgICBpZihfcmVhZCkgdGhyb3cgbmV3IEVycm9yKCdhbHJlYWR5IHJlc29sdmVkJylcbiAgICBfcmVhZCA9IHJlYWRcbiAgICBpZighX3JlYWQpIHRocm93IG5ldyBFcnJvcignbm8gcmVhZCBjYW5ub3QgcmVzb2x2ZSEnICsgX3JlYWQpXG4gICAgd2hpbGUoY2JzLmxlbmd0aClcbiAgICAgIF9yZWFkKF9lbmQsIGNicy5zaGlmdCgpKVxuICB9XG4gIHJlYWQuYWJvcnQgPSBmdW5jdGlvbihlcnIpIHtcbiAgICByZWFkLnJlc29sdmUoZnVuY3Rpb24gKF8sIGNiKSB7XG4gICAgICBjYihlcnIgfHwgdHJ1ZSlcbiAgICB9KVxuICB9XG4gIHJldHVybiByZWFkXG59XG5cbnZhciBlbXB0eSA9IGV4cG9ydHMuZW1wdHkgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoYWJvcnQsIGNiKSB7XG4gICAgY2IodHJ1ZSlcbiAgfVxufVxuXG52YXIgZGVwdGhGaXJzdCA9IGV4cG9ydHMuZGVwdGhGaXJzdCA9XG5mdW5jdGlvbiAoc3RhcnQsIGNyZWF0ZVN0cmVhbSkge1xuICB2YXIgcmVhZHMgPSBbXVxuXG4gIHJlYWRzLnVuc2hpZnQob25jZShzdGFydCkpXG5cbiAgcmV0dXJuIGZ1bmN0aW9uIG5leHQgKGVuZCwgY2IpIHtcbiAgICBpZighcmVhZHMubGVuZ3RoKVxuICAgICAgcmV0dXJuIGNiKHRydWUpXG4gICAgcmVhZHNbMF0oZW5kLCBmdW5jdGlvbiAoZW5kLCBkYXRhKSB7XG4gICAgICBpZihlbmQpIHtcbiAgICAgICAgLy9pZiB0aGlzIHN0cmVhbSBoYXMgZW5kZWQsIGdvIHRvIHRoZSBuZXh0IHF1ZXVlXG4gICAgICAgIHJlYWRzLnNoaWZ0KClcbiAgICAgICAgcmV0dXJuIG5leHQobnVsbCwgY2IpXG4gICAgICB9XG4gICAgICByZWFkcy51bnNoaWZ0KGNyZWF0ZVN0cmVhbShkYXRhKSlcbiAgICAgIGNiKGVuZCwgZGF0YSlcbiAgICB9KVxuICB9XG59XG4vL3dpZHRoIGZpcnN0IGlzIGp1c3QgbGlrZSBkZXB0aCBmaXJzdCxcbi8vYnV0IHB1c2ggZWFjaCBuZXcgc3RyZWFtIG9udG8gdGhlIGVuZCBvZiB0aGUgcXVldWVcbnZhciB3aWR0aEZpcnN0ID0gZXhwb3J0cy53aWR0aEZpcnN0ID0gXG5mdW5jdGlvbiAoc3RhcnQsIGNyZWF0ZVN0cmVhbSkge1xuICB2YXIgcmVhZHMgPSBbXVxuXG4gIHJlYWRzLnB1c2gob25jZShzdGFydCkpXG5cbiAgcmV0dXJuIGZ1bmN0aW9uIG5leHQgKGVuZCwgY2IpIHtcbiAgICBpZighcmVhZHMubGVuZ3RoKVxuICAgICAgcmV0dXJuIGNiKHRydWUpXG4gICAgcmVhZHNbMF0oZW5kLCBmdW5jdGlvbiAoZW5kLCBkYXRhKSB7XG4gICAgICBpZihlbmQpIHtcbiAgICAgICAgcmVhZHMuc2hpZnQoKVxuICAgICAgICByZXR1cm4gbmV4dChudWxsLCBjYilcbiAgICAgIH1cbiAgICAgIHJlYWRzLnB1c2goY3JlYXRlU3RyZWFtKGRhdGEpKVxuICAgICAgY2IoZW5kLCBkYXRhKVxuICAgIH0pXG4gIH1cbn1cblxuLy90aGlzIGNhbWUgb3V0IGRpZmZlcmVudCB0byB0aGUgZmlyc3QgKHN0cm0pXG4vL2F0dGVtcHQgYXQgbGVhZkZpcnN0LCBidXQgaXQncyBzdGlsbCBhIHZhbGlkXG4vL3RvcG9sb2dpY2FsIHNvcnQuXG52YXIgbGVhZkZpcnN0ID0gZXhwb3J0cy5sZWFmRmlyc3QgPSBcbmZ1bmN0aW9uIChzdGFydCwgY3JlYXRlU3RyZWFtKSB7XG4gIHZhciByZWFkcyA9IFtdXG4gIHZhciBvdXRwdXQgPSBbXVxuICByZWFkcy5wdXNoKG9uY2Uoc3RhcnQpKVxuICBcbiAgcmV0dXJuIGZ1bmN0aW9uIG5leHQgKGVuZCwgY2IpIHtcbiAgICByZWFkc1swXShlbmQsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgIGlmKGVuZCkge1xuICAgICAgICByZWFkcy5zaGlmdCgpXG4gICAgICAgIGlmKCFvdXRwdXQubGVuZ3RoKVxuICAgICAgICAgIHJldHVybiBjYih0cnVlKVxuICAgICAgICByZXR1cm4gY2IobnVsbCwgb3V0cHV0LnNoaWZ0KCkpXG4gICAgICB9XG4gICAgICByZWFkcy51bnNoaWZ0KGNyZWF0ZVN0cmVhbShkYXRhKSlcbiAgICAgIG91dHB1dC51bnNoaWZ0KGRhdGEpXG4gICAgICBuZXh0KG51bGwsIGNiKVxuICAgIH0pXG4gIH1cbn1cblxuIiwidmFyIHUgICAgICA9IHJlcXVpcmUoJ3B1bGwtY29yZScpXG52YXIgc291cmNlcyA9IHJlcXVpcmUoJy4vc291cmNlcycpXG52YXIgc2lua3MgPSByZXF1aXJlKCcuL3NpbmtzJylcblxudmFyIHByb3AgICA9IHUucHJvcFxudmFyIGlkICAgICA9IHUuaWRcbnZhciB0ZXN0ZXIgPSB1LnRlc3RlclxuXG52YXIgbWFwID0gZXhwb3J0cy5tYXAgPSBcbmZ1bmN0aW9uIChyZWFkLCBtYXApIHtcbiAgbWFwID0gcHJvcChtYXApIHx8IGlkXG4gIHJldHVybiBmdW5jdGlvbiAoZW5kLCBjYikge1xuICAgIHJlYWQoZW5kLCBmdW5jdGlvbiAoZW5kLCBkYXRhKSB7XG4gICAgICB2YXIgZGF0YSA9ICFlbmQgPyBtYXAoZGF0YSkgOiBudWxsXG4gICAgICBjYihlbmQsIGRhdGEpXG4gICAgfSlcbiAgfVxufVxuXG52YXIgYXN5bmNNYXAgPSBleHBvcnRzLmFzeW5jTWFwID1cbmZ1bmN0aW9uIChyZWFkLCBtYXApIHtcbiAgaWYoIW1hcCkgcmV0dXJuIHJlYWRcbiAgcmV0dXJuIGZ1bmN0aW9uIChlbmQsIGNiKSB7XG4gICAgaWYoZW5kKSByZXR1cm4gcmVhZChlbmQsIGNiKSAvL2Fib3J0XG4gICAgcmVhZChudWxsLCBmdW5jdGlvbiAoZW5kLCBkYXRhKSB7XG4gICAgICBpZihlbmQpIHJldHVybiBjYihlbmQsIGRhdGEpXG4gICAgICBtYXAoZGF0YSwgY2IpXG4gICAgfSlcbiAgfVxufVxuXG52YXIgcGFyYU1hcCA9IGV4cG9ydHMucGFyYU1hcCA9XG5mdW5jdGlvbiAocmVhZCwgbWFwLCB3aWR0aCkge1xuICBpZighbWFwKSByZXR1cm4gcmVhZFxuICB2YXIgZW5kZWQgPSBmYWxzZSwgcXVldWUgPSBbXSwgX2NiXG5cbiAgZnVuY3Rpb24gZHJhaW4gKCkge1xuICAgIGlmKCFfY2IpIHJldHVyblxuICAgIHZhciBjYiA9IF9jYlxuICAgIF9jYiA9IG51bGxcbiAgICBpZihxdWV1ZS5sZW5ndGgpXG4gICAgICByZXR1cm4gY2IobnVsbCwgcXVldWUuc2hpZnQoKSlcbiAgICBlbHNlIGlmKGVuZGVkICYmICFuKVxuICAgICAgcmV0dXJuIGNiKGVuZGVkKVxuICAgIF9jYiA9IGNiXG4gIH1cblxuICBmdW5jdGlvbiBwdWxsICgpIHtcbiAgICByZWFkKG51bGwsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgIGlmKGVuZCkge1xuICAgICAgICBlbmRlZCA9IGVuZFxuICAgICAgICByZXR1cm4gZHJhaW4oKVxuICAgICAgfVxuICAgICAgbisrXG4gICAgICBtYXAoZGF0YSwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgICAgICBuLS1cblxuICAgICAgICBxdWV1ZS5wdXNoKGRhdGEpXG4gICAgICAgIGRyYWluKClcbiAgICAgIH0pXG5cbiAgICAgIGlmKG4gPCB3aWR0aCAmJiAhZW5kZWQpXG4gICAgICAgIHB1bGwoKVxuICAgIH0pXG4gIH1cblxuICB2YXIgbiA9IDBcbiAgcmV0dXJuIGZ1bmN0aW9uIChlbmQsIGNiKSB7XG4gICAgaWYoZW5kKSByZXR1cm4gcmVhZChlbmQsIGNiKSAvL2Fib3J0XG4gICAgLy9jb250aW51ZSB0byByZWFkIHdoaWxlIHRoZXJlIGFyZSBsZXNzIHRoYW4gMyBtYXBzIGluIGZsaWdodFxuICAgIF9jYiA9IGNiXG4gICAgaWYocXVldWUubGVuZ3RoIHx8IGVuZGVkKVxuICAgICAgcHVsbCgpLCBkcmFpbigpXG4gICAgZWxzZSBwdWxsKClcbiAgfVxuICByZXR1cm4gaGlnaFdhdGVyTWFyayhhc3luY01hcChyZWFkLCBtYXApLCB3aWR0aClcbn1cblxudmFyIGZpbHRlciA9IGV4cG9ydHMuZmlsdGVyID1cbmZ1bmN0aW9uIChyZWFkLCB0ZXN0KSB7XG4gIC8vcmVnZXhwXG4gIHRlc3QgPSB0ZXN0ZXIodGVzdClcbiAgcmV0dXJuIGZ1bmN0aW9uIG5leHQgKGVuZCwgY2IpIHtcbiAgICByZWFkKGVuZCwgZnVuY3Rpb24gKGVuZCwgZGF0YSkge1xuICAgICAgaWYoIWVuZCAmJiAhdGVzdChkYXRhKSlcbiAgICAgICAgcmV0dXJuIG5leHQoZW5kLCBjYilcbiAgICAgIGNiKGVuZCwgZGF0YSlcbiAgICB9KVxuICB9XG59XG5cbnZhciBmaWx0ZXJOb3QgPSBleHBvcnRzLmZpbHRlck5vdCA9XG5mdW5jdGlvbiAocmVhZCwgdGVzdCkge1xuICB0ZXN0ID0gdGVzdGVyKHRlc3QpXG4gIHJldHVybiBmaWx0ZXIocmVhZCwgZnVuY3Rpb24gKGUpIHtcbiAgICByZXR1cm4gIXRlc3QoZSlcbiAgfSlcbn1cblxudmFyIHRocm91Z2ggPSBleHBvcnRzLnRocm91Z2ggPSBcbmZ1bmN0aW9uIChyZWFkLCBvcCwgb25FbmQpIHtcbiAgdmFyIGEgPSBmYWxzZVxuICBmdW5jdGlvbiBvbmNlIChhYm9ydCkge1xuICAgIGlmKGEgfHwgIW9uRW5kKSByZXR1cm5cbiAgICBhID0gdHJ1ZVxuICAgIG9uRW5kKGFib3J0ID09PSB0cnVlID8gbnVsbCA6IGFib3J0KVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChlbmQsIGNiKSB7XG4gICAgaWYoZW5kKSBvbmNlKGVuZClcbiAgICByZXR1cm4gcmVhZChlbmQsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgIGlmKCFlbmQpIG9wICYmIG9wKGRhdGEpXG4gICAgICBlbHNlIG9uY2UoZW5kKVxuICAgICAgY2IoZW5kLCBkYXRhKVxuICAgIH0pXG4gIH1cbn1cblxudmFyIHRha2UgPSBleHBvcnRzLnRha2UgPVxuZnVuY3Rpb24gKHJlYWQsIHRlc3QpIHtcbiAgdmFyIGVuZGVkID0gZmFsc2VcbiAgaWYoJ251bWJlcicgPT09IHR5cGVvZiB0ZXN0KSB7XG4gICAgdmFyIG4gPSB0ZXN0OyB0ZXN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG4gLS1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24gKGVuZCwgY2IpIHtcbiAgICBpZihlbmRlZCkgcmV0dXJuIGNiKGVuZGVkKVxuICAgIGlmKGVuZGVkID0gZW5kKSByZXR1cm4gcmVhZChlbmRlZCwgY2IpXG5cbiAgICByZWFkKG51bGwsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgIGlmKGVuZGVkID0gZW5kZWQgfHwgZW5kKSByZXR1cm4gY2IoZW5kZWQpXG4gICAgICBpZighdGVzdChkYXRhKSkge1xuICAgICAgICBlbmRlZCA9IHRydWVcbiAgICAgICAgcmVhZCh0cnVlLCBmdW5jdGlvbiAoZW5kLCBkYXRhKSB7XG4gICAgICAgICAgY2IoZW5kZWQsIGRhdGEpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNlXG4gICAgICAgIGNiKG51bGwsIGRhdGEpXG4gICAgfSlcbiAgfVxufVxuXG52YXIgdW5pcXVlID0gZXhwb3J0cy51bmlxdWUgPSBmdW5jdGlvbiAocmVhZCwgZmllbGQsIGludmVydCkge1xuICBmaWVsZCA9IHByb3AoZmllbGQpIHx8IGlkXG4gIHZhciBzZWVuID0ge31cbiAgcmV0dXJuIGZpbHRlcihyZWFkLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBrZXkgPSBmaWVsZChkYXRhKVxuICAgIGlmKHNlZW5ba2V5XSkgcmV0dXJuICEhaW52ZXJ0IC8vZmFsc2UsIGJ5IGRlZmF1bHRcbiAgICBlbHNlIHNlZW5ba2V5XSA9IHRydWVcbiAgICByZXR1cm4gIWludmVydCAvL3RydWUgYnkgZGVmYXVsdFxuICB9KVxufVxuXG52YXIgbm9uVW5pcXVlID0gZXhwb3J0cy5ub25VbmlxdWUgPSBmdW5jdGlvbiAocmVhZCwgZmllbGQpIHtcbiAgcmV0dXJuIHVuaXF1ZShyZWFkLCBmaWVsZCwgdHJ1ZSlcbn1cblxudmFyIGdyb3VwID0gZXhwb3J0cy5ncm91cCA9XG5mdW5jdGlvbiAocmVhZCwgc2l6ZSkge1xuICB2YXIgZW5kZWQ7IHNpemUgPSBzaXplIHx8IDVcbiAgdmFyIHF1ZXVlID0gW11cblxuICByZXR1cm4gZnVuY3Rpb24gKGVuZCwgY2IpIHtcbiAgICAvL3RoaXMgbWVhbnMgdGhhdCB0aGUgdXBzdHJlYW0gaXMgc2VuZGluZyBhbiBlcnJvci5cbiAgICBpZihlbmQpIHJldHVybiByZWFkKGVuZGVkID0gZW5kLCBjYilcbiAgICAvL3RoaXMgbWVhbnMgdGhhdCB3ZSByZWFkIGFuIGVuZCBiZWZvcmUuXG4gICAgaWYoZW5kZWQpIHJldHVybiBjYihlbmRlZClcblxuICAgIHJlYWQobnVsbCwgZnVuY3Rpb24gbmV4dChlbmQsIGRhdGEpIHtcbiAgICAgIGlmKGVuZGVkID0gZW5kZWQgfHwgZW5kKSB7XG4gICAgICAgIGlmKCFxdWV1ZS5sZW5ndGgpXG4gICAgICAgICAgcmV0dXJuIGNiKGVuZGVkKVxuXG4gICAgICAgIHZhciBfcXVldWUgPSBxdWV1ZTsgcXVldWUgPSBbXVxuICAgICAgICByZXR1cm4gY2IobnVsbCwgX3F1ZXVlKVxuICAgICAgfVxuICAgICAgcXVldWUucHVzaChkYXRhKVxuICAgICAgaWYocXVldWUubGVuZ3RoIDwgc2l6ZSlcbiAgICAgICAgcmV0dXJuIHJlYWQobnVsbCwgbmV4dClcblxuICAgICAgdmFyIF9xdWV1ZSA9IHF1ZXVlOyBxdWV1ZSA9IFtdXG4gICAgICBjYihudWxsLCBfcXVldWUpXG4gICAgfSlcbiAgfVxufVxuXG52YXIgZmxhdHRlbiA9IGV4cG9ydHMuZmxhdHRlbiA9IGZ1bmN0aW9uIChyZWFkKSB7XG4gIHZhciBfcmVhZFxuICByZXR1cm4gZnVuY3Rpb24gKGFib3J0LCBjYikge1xuICAgIGlmKF9yZWFkKSBuZXh0Q2h1bmsoKVxuICAgIGVsc2UgICAgICBuZXh0U3RyZWFtKClcblxuICAgIGZ1bmN0aW9uIG5leHRDaHVuayAoKSB7XG4gICAgICBfcmVhZChudWxsLCBmdW5jdGlvbiAoZW5kLCBkYXRhKSB7XG4gICAgICAgIGlmKGVuZCkgbmV4dFN0cmVhbSgpXG4gICAgICAgIGVsc2UgICAgY2IobnVsbCwgZGF0YSlcbiAgICAgIH0pXG4gICAgfVxuICAgIGZ1bmN0aW9uIG5leHRTdHJlYW0gKCkge1xuICAgICAgcmVhZChudWxsLCBmdW5jdGlvbiAoZW5kLCBzdHJlYW0pIHtcbiAgICAgICAgaWYoZW5kKVxuICAgICAgICAgIHJldHVybiBjYihlbmQpXG4gICAgICAgIGlmKEFycmF5LmlzQXJyYXkoc3RyZWFtKSlcbiAgICAgICAgICBzdHJlYW0gPSBzb3VyY2VzLnZhbHVlcyhzdHJlYW0pXG4gICAgICAgIGVsc2UgaWYoJ2Z1bmN0aW9uJyAhPSB0eXBlb2Ygc3RyZWFtKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignZXhwZWN0ZWQgc3RyZWFtIG9mIHN0cmVhbXMnKVxuICAgICAgICBcbiAgICAgICAgX3JlYWQgPSBzdHJlYW1cbiAgICAgICAgbmV4dENodW5rKClcbiAgICAgIH0pXG4gICAgfVxuICB9XG59XG5cbnZhciBwcmVwZW5kID1cbmV4cG9ydHMucHJlcGVuZCA9XG5mdW5jdGlvbiAocmVhZCwgaGVhZCkge1xuXG4gIHJldHVybiBmdW5jdGlvbiAoYWJvcnQsIGNiKSB7XG4gICAgaWYoaGVhZCAhPT0gbnVsbCkge1xuICAgICAgaWYoYWJvcnQpXG4gICAgICAgIHJldHVybiByZWFkKGFib3J0LCBjYilcbiAgICAgIHZhciBfaGVhZCA9IGhlYWRcbiAgICAgIGhlYWQgPSBudWxsXG4gICAgICBjYihudWxsLCBfaGVhZClcbiAgICB9IGVsc2Uge1xuICAgICAgcmVhZChhYm9ydCwgY2IpXG4gICAgfVxuICB9XG5cbn1cblxuLy92YXIgZHJhaW5JZiA9IGV4cG9ydHMuZHJhaW5JZiA9IGZ1bmN0aW9uIChvcCwgZG9uZSkge1xuLy8gIHNpbmtzLmRyYWluKFxuLy99XG5cbnZhciBfcmVkdWNlID0gZXhwb3J0cy5fcmVkdWNlID0gZnVuY3Rpb24gKHJlYWQsIHJlZHVjZSwgaW5pdGlhbCkge1xuICByZXR1cm4gZnVuY3Rpb24gKGNsb3NlLCBjYikge1xuICAgIGlmKGNsb3NlKSByZXR1cm4gcmVhZChjbG9zZSwgY2IpXG4gICAgaWYoZW5kZWQpIHJldHVybiBjYihlbmRlZClcblxuICAgIHNpbmtzLmRyYWluKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICBpbml0aWFsID0gcmVkdWNlKGluaXRpYWwsIGl0ZW0pXG4gICAgfSwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgICAgZW5kZWQgPSBlcnIgfHwgdHJ1ZVxuICAgICAgaWYoIWVycikgY2IobnVsbCwgaW5pdGlhbClcbiAgICAgIGVsc2UgICAgIGNiKGVuZGVkKVxuICAgIH0pXG4gICAgKHJlYWQpXG4gIH1cbn1cblxudmFyIG5leHRUaWNrID0gcHJvY2Vzcy5uZXh0VGlja1xuXG52YXIgaGlnaFdhdGVyTWFyayA9IGV4cG9ydHMuaGlnaFdhdGVyTWFyayA9IFxuZnVuY3Rpb24gKHJlYWQsIGhpZ2hXYXRlck1hcmspIHtcbiAgdmFyIGJ1ZmZlciA9IFtdLCB3YWl0aW5nID0gW10sIGVuZGVkLCByZWFkaW5nID0gZmFsc2VcbiAgaGlnaFdhdGVyTWFyayA9IGhpZ2hXYXRlck1hcmsgfHwgMTBcblxuICBmdW5jdGlvbiByZWFkQWhlYWQgKCkge1xuICAgIHdoaWxlKHdhaXRpbmcubGVuZ3RoICYmIChidWZmZXIubGVuZ3RoIHx8IGVuZGVkKSlcbiAgICAgIHdhaXRpbmcuc2hpZnQoKShlbmRlZCwgZW5kZWQgPyBudWxsIDogYnVmZmVyLnNoaWZ0KCkpXG4gIH1cblxuICBmdW5jdGlvbiBuZXh0ICgpIHtcbiAgICBpZihlbmRlZCB8fCByZWFkaW5nIHx8IGJ1ZmZlci5sZW5ndGggPj0gaGlnaFdhdGVyTWFyaylcbiAgICAgIHJldHVyblxuICAgIHJlYWRpbmcgPSB0cnVlXG4gICAgcmV0dXJuIHJlYWQoZW5kZWQsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgIHJlYWRpbmcgPSBmYWxzZVxuICAgICAgZW5kZWQgPSBlbmRlZCB8fCBlbmRcbiAgICAgIGlmKGRhdGEgIT0gbnVsbCkgYnVmZmVyLnB1c2goZGF0YSlcbiAgICAgIFxuICAgICAgbmV4dCgpOyByZWFkQWhlYWQoKVxuICAgIH0pXG4gIH1cblxuICBuZXh0VGljayhuZXh0KVxuXG4gIHJldHVybiBmdW5jdGlvbiAoZW5kLCBjYikge1xuICAgIGVuZGVkID0gZW5kZWQgfHwgZW5kXG4gICAgd2FpdGluZy5wdXNoKGNiKVxuXG4gICAgbmV4dCgpOyByZWFkQWhlYWQoKVxuICB9XG59XG5cblxuXG4iLCJ2YXIgc291cmNlcyAgPSByZXF1aXJlKCcuL3NvdXJjZXMnKVxudmFyIHNpbmtzICAgID0gcmVxdWlyZSgnLi9zaW5rcycpXG52YXIgdGhyb3VnaHMgPSByZXF1aXJlKCcuL3Rocm91Z2hzJylcbnZhciB1ICAgICAgICA9IHJlcXVpcmUoJ3B1bGwtY29yZScpXG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24gKGZ1bikge1xuICByZXR1cm4gJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGZ1blxufVxuXG5mdW5jdGlvbiBpc1JlYWRlciAoZnVuKSB7XG4gIHJldHVybiBmdW4gJiYgKGZ1bi50eXBlID09PSBcIlRocm91Z2hcIiB8fCBmdW4ubGVuZ3RoID09PSAxKVxufVxudmFyIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHB1bGwgKCkge1xuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuXG4gIGlmKGlzUmVhZGVyKGFyZ3NbMF0pKVxuICAgIHJldHVybiBmdW5jdGlvbiAocmVhZCkge1xuICAgICAgYXJncy51bnNoaWZ0KHJlYWQpXG4gICAgICByZXR1cm4gcHVsbC5hcHBseShudWxsLCBhcmdzKVxuICAgIH1cblxuICB2YXIgcmVhZCA9IGFyZ3Muc2hpZnQoKVxuXG4gIC8vaWYgdGhlIGZpcnN0IGZ1bmN0aW9uIGlzIGEgZHVwbGV4IHN0cmVhbSxcbiAgLy9waXBlIGZyb20gdGhlIHNvdXJjZS5cbiAgaWYoaXNGdW5jdGlvbihyZWFkLnNvdXJjZSkpXG4gICAgcmVhZCA9IHJlYWQuc291cmNlXG5cbiAgZnVuY3Rpb24gbmV4dCAoKSB7XG4gICAgdmFyIHMgPSBhcmdzLnNoaWZ0KClcblxuICAgIGlmKG51bGwgPT0gcylcbiAgICAgIHJldHVybiBuZXh0KClcblxuICAgIGlmKGlzRnVuY3Rpb24ocykpIHJldHVybiBzXG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKHJlYWQpIHtcbiAgICAgIHMuc2luayhyZWFkKVxuICAgICAgLy90aGlzIHN1cHBvcnRzIHBpcGVpbmcgdGhyb3VnaCBhIGR1cGxleCBzdHJlYW1cbiAgICAgIC8vcHVsbChhLCBiLCBhKSBcInRlbGVwaG9uZSBzdHlsZVwiLlxuICAgICAgLy9pZiB0aGlzIHN0cmVhbSBpcyBpbiB0aGUgYSAoZmlyc3QgJiBsYXN0IHBvc2l0aW9uKVxuICAgICAgLy9zLnNvdXJjZSB3aWxsIGhhdmUgYWxyZWFkeSBiZWVuIHVzZWQsIGJ1dCB0aGlzIHNob3VsZCBuZXZlciBiZSBjYWxsZWRcbiAgICAgIC8vc28gdGhhdCBpcyBva2F5LlxuICAgICAgcmV0dXJuIHMuc291cmNlXG4gICAgfVxuICB9XG5cbiAgd2hpbGUoYXJncy5sZW5ndGgpXG4gICAgcmVhZCA9IG5leHQoKSAocmVhZClcblxuICByZXR1cm4gcmVhZFxufVxuXG5cbmZvcih2YXIgayBpbiBzb3VyY2VzKVxuICBleHBvcnRzW2tdID0gdS5Tb3VyY2Uoc291cmNlc1trXSlcblxuZm9yKHZhciBrIGluIHRocm91Z2hzKVxuICBleHBvcnRzW2tdID0gdS5UaHJvdWdoKHRocm91Z2hzW2tdKVxuXG5mb3IodmFyIGsgaW4gc2lua3MpXG4gIGV4cG9ydHNba10gPSB1LlNpbmsoc2lua3Nba10pXG5cbnZhciBtYXliZSA9IHJlcXVpcmUoJy4vbWF5YmUnKShleHBvcnRzKVxuXG5mb3IodmFyIGsgaW4gbWF5YmUpXG4gIGV4cG9ydHNba10gPSBtYXliZVtrXVxuXG5leHBvcnRzLkR1cGxleCAgPSBcbmV4cG9ydHMuVGhyb3VnaCA9IGV4cG9ydHMucGlwZWFibGUgICAgICAgPSB1LlRocm91Z2hcbmV4cG9ydHMuU291cmNlICA9IGV4cG9ydHMucGlwZWFibGVTb3VyY2UgPSB1LlNvdXJjZVxuZXhwb3J0cy5TaW5rICAgID0gZXhwb3J0cy5waXBlYWJsZVNpbmsgICA9IHUuU2lua1xuXG5cbiIsInZhciB1ID0gcmVxdWlyZSgncHVsbC1jb3JlJylcbnZhciBwcm9wID0gdS5wcm9wXG52YXIgaWQgICA9IHUuaWRcbnZhciBtYXliZVNpbmsgPSB1Lm1heWJlU2lua1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChwdWxsKSB7XG5cbiAgdmFyIGV4cG9ydHMgPSB7fVxuICB2YXIgZHJhaW4gPSBwdWxsLmRyYWluXG5cbiAgdmFyIGZpbmQgPVxuICBleHBvcnRzLmZpbmQgPSBmdW5jdGlvbiAodGVzdCwgY2IpIHtcbiAgICByZXR1cm4gbWF5YmVTaW5rKGZ1bmN0aW9uIChjYikge1xuICAgICAgdmFyIGVuZGVkID0gZmFsc2VcbiAgICAgIGlmKCFjYilcbiAgICAgICAgY2IgPSB0ZXN0LCB0ZXN0ID0gaWRcbiAgICAgIGVsc2VcbiAgICAgICAgdGVzdCA9IHByb3AodGVzdCkgfHwgaWRcblxuICAgICAgcmV0dXJuIGRyYWluKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGlmKHRlc3QoZGF0YSkpIHtcbiAgICAgICAgICBlbmRlZCA9IHRydWVcbiAgICAgICAgICBjYihudWxsLCBkYXRhKVxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICBpZihlbmRlZCkgcmV0dXJuIC8vYWxyZWFkeSBjYWxsZWQgYmFja1xuICAgICAgICBjYihlcnIgPT09IHRydWUgPyBudWxsIDogZXJyLCBudWxsKVxuICAgICAgfSlcblxuICAgIH0sIGNiKVxuICB9XG5cbiAgdmFyIHJlZHVjZSA9IGV4cG9ydHMucmVkdWNlID1cbiAgZnVuY3Rpb24gKHJlZHVjZSwgYWNjLCBjYikge1xuXG4gICAgcmV0dXJuIG1heWJlU2luayhmdW5jdGlvbiAoY2IpIHtcbiAgICAgIHJldHVybiBkcmFpbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBhY2MgPSByZWR1Y2UoYWNjLCBkYXRhKVxuICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICBjYihlcnIsIGFjYylcbiAgICAgIH0pXG5cbiAgICB9LCBjYilcbiAgfVxuXG4gIHZhciBjb2xsZWN0ID0gZXhwb3J0cy5jb2xsZWN0ID0gZXhwb3J0cy53cml0ZUFycmF5ID1cbiAgZnVuY3Rpb24gKGNiKSB7XG4gICAgcmV0dXJuIHJlZHVjZShmdW5jdGlvbiAoYXJyLCBpdGVtKSB7XG4gICAgICBhcnIucHVzaChpdGVtKVxuICAgICAgcmV0dXJuIGFyclxuICAgIH0sIFtdLCBjYilcbiAgfVxuXG4gIHZhciBjb25jYXQgPSBleHBvcnRzLmNvbmNhdCA9XG4gIGZ1bmN0aW9uIChjYikge1xuICAgIHJldHVybiByZWR1Y2UoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgIHJldHVybiBhICsgYlxuICAgIH0sICcnLCBjYilcbiAgfVxuXG4gIHJldHVybiBleHBvcnRzXG59XG4iLCJ2YXIgZHJhaW4gPSBleHBvcnRzLmRyYWluID0gZnVuY3Rpb24gKHJlYWQsIG9wLCBkb25lKSB7XG5cbiAgOyhmdW5jdGlvbiBuZXh0KCkge1xuICAgIHZhciBsb29wID0gdHJ1ZSwgY2JlZCA9IGZhbHNlXG4gICAgd2hpbGUobG9vcCkge1xuICAgICAgY2JlZCA9IGZhbHNlXG4gICAgICByZWFkKG51bGwsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgICAgY2JlZCA9IHRydWVcbiAgICAgICAgaWYoZW5kKSB7XG4gICAgICAgICAgbG9vcCA9IGZhbHNlXG4gICAgICAgICAgaWYoZG9uZSkgZG9uZShlbmQgPT09IHRydWUgPyBudWxsIDogZW5kKVxuICAgICAgICAgIGVsc2UgaWYoZW5kICYmIGVuZCAhPT0gdHJ1ZSlcbiAgICAgICAgICAgIHRocm93IGVuZFxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYob3AgJiYgZmFsc2UgPT09IG9wKGRhdGEpKSB7XG4gICAgICAgICAgbG9vcCA9IGZhbHNlXG4gICAgICAgICAgcmVhZCh0cnVlLCBkb25lIHx8IGZ1bmN0aW9uICgpIHt9KVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYoIWxvb3Ape1xuICAgICAgICAgIG5leHQoKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgaWYoIWNiZWQpIHtcbiAgICAgICAgbG9vcCA9IGZhbHNlXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgIH1cbiAgfSkoKVxufVxuXG52YXIgb25FbmQgPSBleHBvcnRzLm9uRW5kID0gZnVuY3Rpb24gKHJlYWQsIGRvbmUpIHtcbiAgcmV0dXJuIGRyYWluKHJlYWQsIG51bGwsIGRvbmUpXG59XG5cbnZhciBsb2cgPSBleHBvcnRzLmxvZyA9IGZ1bmN0aW9uIChyZWFkLCBkb25lKSB7XG4gIHJldHVybiBkcmFpbihyZWFkLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgIGNvbnNvbGUubG9nKGRhdGEpXG4gIH0sIGRvbmUpXG59XG5cbiIsIlxudmFyIGtleXMgPSBleHBvcnRzLmtleXMgPVxuZnVuY3Rpb24gKG9iamVjdCkge1xuICByZXR1cm4gdmFsdWVzKE9iamVjdC5rZXlzKG9iamVjdCkpXG59XG5cbnZhciBvbmNlID0gZXhwb3J0cy5vbmNlID1cbmZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24gKGFib3J0LCBjYikge1xuICAgIGlmKGFib3J0KSByZXR1cm4gY2IoYWJvcnQpXG4gICAgaWYodmFsdWUgIT0gbnVsbCkge1xuICAgICAgdmFyIF92YWx1ZSA9IHZhbHVlOyB2YWx1ZSA9IG51bGxcbiAgICAgIGNiKG51bGwsIF92YWx1ZSlcbiAgICB9IGVsc2VcbiAgICAgIGNiKHRydWUpXG4gIH1cbn1cblxudmFyIHZhbHVlcyA9IGV4cG9ydHMudmFsdWVzID0gZXhwb3J0cy5yZWFkQXJyYXkgPVxuZnVuY3Rpb24gKGFycmF5KSB7XG4gIGlmKCFBcnJheS5pc0FycmF5KGFycmF5KSlcbiAgICBhcnJheSA9IE9iamVjdC5rZXlzKGFycmF5KS5tYXAoZnVuY3Rpb24gKGspIHtcbiAgICAgIHJldHVybiBhcnJheVtrXVxuICAgIH0pXG4gIHZhciBpID0gMFxuICByZXR1cm4gZnVuY3Rpb24gKGVuZCwgY2IpIHtcbiAgICBpZihlbmQpXG4gICAgICByZXR1cm4gY2IgJiYgY2IoZW5kKVxuICAgIGNiKGkgPj0gYXJyYXkubGVuZ3RoIHx8IG51bGwsIGFycmF5W2krK10pXG4gIH1cbn1cblxuXG52YXIgY291bnQgPSBleHBvcnRzLmNvdW50ID1cbmZ1bmN0aW9uIChtYXgpIHtcbiAgdmFyIGkgPSAwOyBtYXggPSBtYXggfHwgSW5maW5pdHlcbiAgcmV0dXJuIGZ1bmN0aW9uIChlbmQsIGNiKSB7XG4gICAgaWYoZW5kKSByZXR1cm4gY2IgJiYgY2IoZW5kKVxuICAgIGlmKGkgPiBtYXgpXG4gICAgICByZXR1cm4gY2IodHJ1ZSlcbiAgICBjYihudWxsLCBpKyspXG4gIH1cbn1cblxudmFyIGluZmluaXRlID0gZXhwb3J0cy5pbmZpbml0ZSA9XG5mdW5jdGlvbiAoZ2VuZXJhdGUpIHtcbiAgZ2VuZXJhdGUgPSBnZW5lcmF0ZSB8fCBNYXRoLnJhbmRvbVxuICByZXR1cm4gZnVuY3Rpb24gKGVuZCwgY2IpIHtcbiAgICBpZihlbmQpIHJldHVybiBjYiAmJiBjYihlbmQpXG4gICAgcmV0dXJuIGNiKG51bGwsIGdlbmVyYXRlKCkpXG4gIH1cbn1cblxudmFyIGRlZmVyID0gZXhwb3J0cy5kZWZlciA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIF9yZWFkLCBjYnMgPSBbXSwgX2VuZFxuXG4gIHZhciByZWFkID0gZnVuY3Rpb24gKGVuZCwgY2IpIHtcbiAgICBpZighX3JlYWQpIHtcbiAgICAgIF9lbmQgPSBlbmRcbiAgICAgIGNicy5wdXNoKGNiKVxuICAgIH0gXG4gICAgZWxzZSBfcmVhZChlbmQsIGNiKVxuICB9XG4gIHJlYWQucmVzb2x2ZSA9IGZ1bmN0aW9uIChyZWFkKSB7XG4gICAgaWYoX3JlYWQpIHRocm93IG5ldyBFcnJvcignYWxyZWFkeSByZXNvbHZlZCcpXG4gICAgX3JlYWQgPSByZWFkXG4gICAgaWYoIV9yZWFkKSB0aHJvdyBuZXcgRXJyb3IoJ25vIHJlYWQgY2Fubm90IHJlc29sdmUhJyArIF9yZWFkKVxuICAgIHdoaWxlKGNicy5sZW5ndGgpXG4gICAgICBfcmVhZChfZW5kLCBjYnMuc2hpZnQoKSlcbiAgfVxuICByZWFkLmFib3J0ID0gZnVuY3Rpb24oZXJyKSB7XG4gICAgcmVhZC5yZXNvbHZlKGZ1bmN0aW9uIChfLCBjYikge1xuICAgICAgY2IoZXJyIHx8IHRydWUpXG4gICAgfSlcbiAgfVxuICByZXR1cm4gcmVhZFxufVxuXG52YXIgZW1wdHkgPSBleHBvcnRzLmVtcHR5ID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gZnVuY3Rpb24gKGFib3J0LCBjYikge1xuICAgIGNiKHRydWUpXG4gIH1cbn1cblxudmFyIGVycm9yID0gZXhwb3J0cy5lcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIChhYm9ydCwgY2IpIHtcbiAgICBjYihlcnIpXG4gIH1cbn1cblxudmFyIGRlcHRoRmlyc3QgPSBleHBvcnRzLmRlcHRoRmlyc3QgPVxuZnVuY3Rpb24gKHN0YXJ0LCBjcmVhdGVTdHJlYW0pIHtcbiAgdmFyIHJlYWRzID0gW11cblxuICByZWFkcy51bnNoaWZ0KG9uY2Uoc3RhcnQpKVxuXG4gIHJldHVybiBmdW5jdGlvbiBuZXh0IChlbmQsIGNiKSB7XG4gICAgaWYoIXJlYWRzLmxlbmd0aClcbiAgICAgIHJldHVybiBjYih0cnVlKVxuICAgIHJlYWRzWzBdKGVuZCwgZnVuY3Rpb24gKGVuZCwgZGF0YSkge1xuICAgICAgaWYoZW5kKSB7XG4gICAgICAgIC8vaWYgdGhpcyBzdHJlYW0gaGFzIGVuZGVkLCBnbyB0byB0aGUgbmV4dCBxdWV1ZVxuICAgICAgICByZWFkcy5zaGlmdCgpXG4gICAgICAgIHJldHVybiBuZXh0KG51bGwsIGNiKVxuICAgICAgfVxuICAgICAgcmVhZHMudW5zaGlmdChjcmVhdGVTdHJlYW0oZGF0YSkpXG4gICAgICBjYihlbmQsIGRhdGEpXG4gICAgfSlcbiAgfVxufVxuLy93aWR0aCBmaXJzdCBpcyBqdXN0IGxpa2UgZGVwdGggZmlyc3QsXG4vL2J1dCBwdXNoIGVhY2ggbmV3IHN0cmVhbSBvbnRvIHRoZSBlbmQgb2YgdGhlIHF1ZXVlXG52YXIgd2lkdGhGaXJzdCA9IGV4cG9ydHMud2lkdGhGaXJzdCA9XG5mdW5jdGlvbiAoc3RhcnQsIGNyZWF0ZVN0cmVhbSkge1xuICB2YXIgcmVhZHMgPSBbXVxuXG4gIHJlYWRzLnB1c2gob25jZShzdGFydCkpXG5cbiAgcmV0dXJuIGZ1bmN0aW9uIG5leHQgKGVuZCwgY2IpIHtcbiAgICBpZighcmVhZHMubGVuZ3RoKVxuICAgICAgcmV0dXJuIGNiKHRydWUpXG4gICAgcmVhZHNbMF0oZW5kLCBmdW5jdGlvbiAoZW5kLCBkYXRhKSB7XG4gICAgICBpZihlbmQpIHtcbiAgICAgICAgcmVhZHMuc2hpZnQoKVxuICAgICAgICByZXR1cm4gbmV4dChudWxsLCBjYilcbiAgICAgIH1cbiAgICAgIHJlYWRzLnB1c2goY3JlYXRlU3RyZWFtKGRhdGEpKVxuICAgICAgY2IoZW5kLCBkYXRhKVxuICAgIH0pXG4gIH1cbn1cblxuLy90aGlzIGNhbWUgb3V0IGRpZmZlcmVudCB0byB0aGUgZmlyc3QgKHN0cm0pXG4vL2F0dGVtcHQgYXQgbGVhZkZpcnN0LCBidXQgaXQncyBzdGlsbCBhIHZhbGlkXG4vL3RvcG9sb2dpY2FsIHNvcnQuXG52YXIgbGVhZkZpcnN0ID0gZXhwb3J0cy5sZWFmRmlyc3QgPVxuZnVuY3Rpb24gKHN0YXJ0LCBjcmVhdGVTdHJlYW0pIHtcbiAgdmFyIHJlYWRzID0gW11cbiAgdmFyIG91dHB1dCA9IFtdXG4gIHJlYWRzLnB1c2gob25jZShzdGFydCkpXG5cbiAgcmV0dXJuIGZ1bmN0aW9uIG5leHQgKGVuZCwgY2IpIHtcbiAgICByZWFkc1swXShlbmQsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgIGlmKGVuZCkge1xuICAgICAgICByZWFkcy5zaGlmdCgpXG4gICAgICAgIGlmKCFvdXRwdXQubGVuZ3RoKVxuICAgICAgICAgIHJldHVybiBjYih0cnVlKVxuICAgICAgICByZXR1cm4gY2IobnVsbCwgb3V0cHV0LnNoaWZ0KCkpXG4gICAgICB9XG4gICAgICByZWFkcy51bnNoaWZ0KGNyZWF0ZVN0cmVhbShkYXRhKSlcbiAgICAgIG91dHB1dC51bnNoaWZ0KGRhdGEpXG4gICAgICBuZXh0KG51bGwsIGNiKVxuICAgIH0pXG4gIH1cbn1cblxuIiwidmFyIHUgICAgICA9IHJlcXVpcmUoJ3B1bGwtY29yZScpXG52YXIgc291cmNlcyA9IHJlcXVpcmUoJy4vc291cmNlcycpXG52YXIgc2lua3MgPSByZXF1aXJlKCcuL3NpbmtzJylcblxudmFyIHByb3AgICA9IHUucHJvcFxudmFyIGlkICAgICA9IHUuaWRcbnZhciB0ZXN0ZXIgPSB1LnRlc3RlclxuXG52YXIgbWFwID0gZXhwb3J0cy5tYXAgPVxuZnVuY3Rpb24gKHJlYWQsIG1hcCkge1xuICBtYXAgPSBwcm9wKG1hcCkgfHwgaWRcbiAgcmV0dXJuIGZ1bmN0aW9uIChhYm9ydCwgY2IpIHtcbiAgICByZWFkKGFib3J0LCBmdW5jdGlvbiAoZW5kLCBkYXRhKSB7XG4gICAgICB0cnkge1xuICAgICAgZGF0YSA9ICFlbmQgPyBtYXAoZGF0YSkgOiBudWxsXG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIHJlYWQoZXJyLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIGNiKGVycilcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGNiKGVuZCwgZGF0YSlcbiAgICB9KVxuICB9XG59XG5cbnZhciBhc3luY01hcCA9IGV4cG9ydHMuYXN5bmNNYXAgPVxuZnVuY3Rpb24gKHJlYWQsIG1hcCkge1xuICBpZighbWFwKSByZXR1cm4gcmVhZFxuICByZXR1cm4gZnVuY3Rpb24gKGVuZCwgY2IpIHtcbiAgICBpZihlbmQpIHJldHVybiByZWFkKGVuZCwgY2IpIC8vYWJvcnRcbiAgICByZWFkKG51bGwsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgIGlmKGVuZCkgcmV0dXJuIGNiKGVuZCwgZGF0YSlcbiAgICAgIG1hcChkYXRhLCBjYilcbiAgICB9KVxuICB9XG59XG5cbnZhciBwYXJhTWFwID0gZXhwb3J0cy5wYXJhTWFwID1cbmZ1bmN0aW9uIChyZWFkLCBtYXAsIHdpZHRoKSB7XG4gIGlmKCFtYXApIHJldHVybiByZWFkXG4gIHZhciBlbmRlZCA9IGZhbHNlLCBxdWV1ZSA9IFtdLCBfY2JcblxuICBmdW5jdGlvbiBkcmFpbiAoKSB7XG4gICAgaWYoIV9jYikgcmV0dXJuXG4gICAgdmFyIGNiID0gX2NiXG4gICAgX2NiID0gbnVsbFxuICAgIGlmKHF1ZXVlLmxlbmd0aClcbiAgICAgIHJldHVybiBjYihudWxsLCBxdWV1ZS5zaGlmdCgpKVxuICAgIGVsc2UgaWYoZW5kZWQgJiYgIW4pXG4gICAgICByZXR1cm4gY2IoZW5kZWQpXG4gICAgX2NiID0gY2JcbiAgfVxuXG4gIGZ1bmN0aW9uIHB1bGwgKCkge1xuICAgIHJlYWQobnVsbCwgZnVuY3Rpb24gKGVuZCwgZGF0YSkge1xuICAgICAgaWYoZW5kKSB7XG4gICAgICAgIGVuZGVkID0gZW5kXG4gICAgICAgIHJldHVybiBkcmFpbigpXG4gICAgICB9XG4gICAgICBuKytcbiAgICAgIG1hcChkYXRhLCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG4gICAgICAgIG4tLVxuXG4gICAgICAgIHF1ZXVlLnB1c2goZGF0YSlcbiAgICAgICAgZHJhaW4oKVxuICAgICAgfSlcblxuICAgICAgaWYobiA8IHdpZHRoICYmICFlbmRlZClcbiAgICAgICAgcHVsbCgpXG4gICAgfSlcbiAgfVxuXG4gIHZhciBuID0gMFxuICByZXR1cm4gZnVuY3Rpb24gKGVuZCwgY2IpIHtcbiAgICBpZihlbmQpIHJldHVybiByZWFkKGVuZCwgY2IpIC8vYWJvcnRcbiAgICAvL2NvbnRpbnVlIHRvIHJlYWQgd2hpbGUgdGhlcmUgYXJlIGxlc3MgdGhhbiAzIG1hcHMgaW4gZmxpZ2h0XG4gICAgX2NiID0gY2JcbiAgICBpZihxdWV1ZS5sZW5ndGggfHwgZW5kZWQpXG4gICAgICBwdWxsKCksIGRyYWluKClcbiAgICBlbHNlIHB1bGwoKVxuICB9XG4gIHJldHVybiBoaWdoV2F0ZXJNYXJrKGFzeW5jTWFwKHJlYWQsIG1hcCksIHdpZHRoKVxufVxuXG52YXIgZmlsdGVyID0gZXhwb3J0cy5maWx0ZXIgPVxuZnVuY3Rpb24gKHJlYWQsIHRlc3QpIHtcbiAgLy9yZWdleHBcbiAgdGVzdCA9IHRlc3Rlcih0ZXN0KVxuICByZXR1cm4gZnVuY3Rpb24gbmV4dCAoZW5kLCBjYikge1xuICAgIHZhciBzeW5jLCBsb29wID0gdHJ1ZVxuICAgIHdoaWxlKGxvb3ApIHtcbiAgICAgIGxvb3AgPSBmYWxzZVxuICAgICAgc3luYyA9IHRydWVcbiAgICAgIHJlYWQoZW5kLCBmdW5jdGlvbiAoZW5kLCBkYXRhKSB7XG4gICAgICAgIGlmKCFlbmQgJiYgIXRlc3QoZGF0YSkpXG4gICAgICAgICAgcmV0dXJuIHN5bmMgPyBsb29wID0gdHJ1ZSA6IG5leHQoZW5kLCBjYilcbiAgICAgICAgY2IoZW5kLCBkYXRhKVxuICAgICAgfSlcbiAgICAgIHN5bmMgPSBmYWxzZVxuICAgIH1cbiAgfVxufVxuXG52YXIgZmlsdGVyTm90ID0gZXhwb3J0cy5maWx0ZXJOb3QgPVxuZnVuY3Rpb24gKHJlYWQsIHRlc3QpIHtcbiAgdGVzdCA9IHRlc3Rlcih0ZXN0KVxuICByZXR1cm4gZmlsdGVyKHJlYWQsIGZ1bmN0aW9uIChlKSB7XG4gICAgcmV0dXJuICF0ZXN0KGUpXG4gIH0pXG59XG5cbnZhciB0aHJvdWdoID0gZXhwb3J0cy50aHJvdWdoID1cbmZ1bmN0aW9uIChyZWFkLCBvcCwgb25FbmQpIHtcbiAgdmFyIGEgPSBmYWxzZVxuICBmdW5jdGlvbiBvbmNlIChhYm9ydCkge1xuICAgIGlmKGEgfHwgIW9uRW5kKSByZXR1cm5cbiAgICBhID0gdHJ1ZVxuICAgIG9uRW5kKGFib3J0ID09PSB0cnVlID8gbnVsbCA6IGFib3J0KVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChlbmQsIGNiKSB7XG4gICAgaWYoZW5kKSBvbmNlKGVuZClcbiAgICByZXR1cm4gcmVhZChlbmQsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgIGlmKCFlbmQpIG9wICYmIG9wKGRhdGEpXG4gICAgICBlbHNlIG9uY2UoZW5kKVxuICAgICAgY2IoZW5kLCBkYXRhKVxuICAgIH0pXG4gIH1cbn1cblxudmFyIHRha2UgPSBleHBvcnRzLnRha2UgPVxuZnVuY3Rpb24gKHJlYWQsIHRlc3QpIHtcbiAgdmFyIGVuZGVkID0gZmFsc2VcbiAgaWYoJ251bWJlcicgPT09IHR5cGVvZiB0ZXN0KSB7XG4gICAgdmFyIG4gPSB0ZXN0OyB0ZXN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG4gLS1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24gKGVuZCwgY2IpIHtcbiAgICBpZihlbmRlZCkgcmV0dXJuIGNiKGVuZGVkKVxuICAgIGlmKGVuZGVkID0gZW5kKSByZXR1cm4gcmVhZChlbmRlZCwgY2IpXG5cbiAgICByZWFkKG51bGwsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgIGlmKGVuZGVkID0gZW5kZWQgfHwgZW5kKSByZXR1cm4gY2IoZW5kZWQpXG4gICAgICBpZighdGVzdChkYXRhKSkge1xuICAgICAgICBlbmRlZCA9IHRydWVcbiAgICAgICAgcmVhZCh0cnVlLCBmdW5jdGlvbiAoZW5kLCBkYXRhKSB7XG4gICAgICAgICAgY2IoZW5kZWQsIGRhdGEpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgICBlbHNlXG4gICAgICAgIGNiKG51bGwsIGRhdGEpXG4gICAgfSlcbiAgfVxufVxuXG52YXIgdW5pcXVlID0gZXhwb3J0cy51bmlxdWUgPSBmdW5jdGlvbiAocmVhZCwgZmllbGQsIGludmVydCkge1xuICBmaWVsZCA9IHByb3AoZmllbGQpIHx8IGlkXG4gIHZhciBzZWVuID0ge31cbiAgcmV0dXJuIGZpbHRlcihyZWFkLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBrZXkgPSBmaWVsZChkYXRhKVxuICAgIGlmKHNlZW5ba2V5XSkgcmV0dXJuICEhaW52ZXJ0IC8vZmFsc2UsIGJ5IGRlZmF1bHRcbiAgICBlbHNlIHNlZW5ba2V5XSA9IHRydWVcbiAgICByZXR1cm4gIWludmVydCAvL3RydWUgYnkgZGVmYXVsdFxuICB9KVxufVxuXG52YXIgbm9uVW5pcXVlID0gZXhwb3J0cy5ub25VbmlxdWUgPSBmdW5jdGlvbiAocmVhZCwgZmllbGQpIHtcbiAgcmV0dXJuIHVuaXF1ZShyZWFkLCBmaWVsZCwgdHJ1ZSlcbn1cblxudmFyIGdyb3VwID0gZXhwb3J0cy5ncm91cCA9XG5mdW5jdGlvbiAocmVhZCwgc2l6ZSkge1xuICB2YXIgZW5kZWQ7IHNpemUgPSBzaXplIHx8IDVcbiAgdmFyIHF1ZXVlID0gW11cblxuICByZXR1cm4gZnVuY3Rpb24gKGVuZCwgY2IpIHtcbiAgICAvL3RoaXMgbWVhbnMgdGhhdCB0aGUgdXBzdHJlYW0gaXMgc2VuZGluZyBhbiBlcnJvci5cbiAgICBpZihlbmQpIHJldHVybiByZWFkKGVuZGVkID0gZW5kLCBjYilcbiAgICAvL3RoaXMgbWVhbnMgdGhhdCB3ZSByZWFkIGFuIGVuZCBiZWZvcmUuXG4gICAgaWYoZW5kZWQpIHJldHVybiBjYihlbmRlZClcblxuICAgIHJlYWQobnVsbCwgZnVuY3Rpb24gbmV4dChlbmQsIGRhdGEpIHtcbiAgICAgIGlmKGVuZGVkID0gZW5kZWQgfHwgZW5kKSB7XG4gICAgICAgIGlmKCFxdWV1ZS5sZW5ndGgpXG4gICAgICAgICAgcmV0dXJuIGNiKGVuZGVkKVxuXG4gICAgICAgIHZhciBfcXVldWUgPSBxdWV1ZTsgcXVldWUgPSBbXVxuICAgICAgICByZXR1cm4gY2IobnVsbCwgX3F1ZXVlKVxuICAgICAgfVxuICAgICAgcXVldWUucHVzaChkYXRhKVxuICAgICAgaWYocXVldWUubGVuZ3RoIDwgc2l6ZSlcbiAgICAgICAgcmV0dXJuIHJlYWQobnVsbCwgbmV4dClcblxuICAgICAgdmFyIF9xdWV1ZSA9IHF1ZXVlOyBxdWV1ZSA9IFtdXG4gICAgICBjYihudWxsLCBfcXVldWUpXG4gICAgfSlcbiAgfVxufVxuXG52YXIgZmxhdHRlbiA9IGV4cG9ydHMuZmxhdHRlbiA9IGZ1bmN0aW9uIChyZWFkKSB7XG4gIHZhciBfcmVhZFxuICByZXR1cm4gZnVuY3Rpb24gKGFib3J0LCBjYikge1xuICAgIGlmKF9yZWFkKSBuZXh0Q2h1bmsoKVxuICAgIGVsc2UgICAgICBuZXh0U3RyZWFtKClcblxuICAgIGZ1bmN0aW9uIG5leHRDaHVuayAoKSB7XG4gICAgICBfcmVhZChudWxsLCBmdW5jdGlvbiAoZW5kLCBkYXRhKSB7XG4gICAgICAgIGlmKGVuZCkgbmV4dFN0cmVhbSgpXG4gICAgICAgIGVsc2UgICAgY2IobnVsbCwgZGF0YSlcbiAgICAgIH0pXG4gICAgfVxuICAgIGZ1bmN0aW9uIG5leHRTdHJlYW0gKCkge1xuICAgICAgcmVhZChudWxsLCBmdW5jdGlvbiAoZW5kLCBzdHJlYW0pIHtcbiAgICAgICAgaWYoZW5kKVxuICAgICAgICAgIHJldHVybiBjYihlbmQpXG4gICAgICAgIGlmKEFycmF5LmlzQXJyYXkoc3RyZWFtKSB8fCBzdHJlYW0gJiYgJ29iamVjdCcgPT09IHR5cGVvZiBzdHJlYW0pXG4gICAgICAgICAgc3RyZWFtID0gc291cmNlcy52YWx1ZXMoc3RyZWFtKVxuICAgICAgICBlbHNlIGlmKCdmdW5jdGlvbicgIT0gdHlwZW9mIHN0cmVhbSlcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2V4cGVjdGVkIHN0cmVhbSBvZiBzdHJlYW1zJylcbiAgICAgICAgX3JlYWQgPSBzdHJlYW1cbiAgICAgICAgbmV4dENodW5rKClcbiAgICAgIH0pXG4gICAgfVxuICB9XG59XG5cbnZhciBwcmVwZW5kID1cbmV4cG9ydHMucHJlcGVuZCA9XG5mdW5jdGlvbiAocmVhZCwgaGVhZCkge1xuXG4gIHJldHVybiBmdW5jdGlvbiAoYWJvcnQsIGNiKSB7XG4gICAgaWYoaGVhZCAhPT0gbnVsbCkge1xuICAgICAgaWYoYWJvcnQpXG4gICAgICAgIHJldHVybiByZWFkKGFib3J0LCBjYilcbiAgICAgIHZhciBfaGVhZCA9IGhlYWRcbiAgICAgIGhlYWQgPSBudWxsXG4gICAgICBjYihudWxsLCBfaGVhZClcbiAgICB9IGVsc2Uge1xuICAgICAgcmVhZChhYm9ydCwgY2IpXG4gICAgfVxuICB9XG5cbn1cblxuLy92YXIgZHJhaW5JZiA9IGV4cG9ydHMuZHJhaW5JZiA9IGZ1bmN0aW9uIChvcCwgZG9uZSkge1xuLy8gIHNpbmtzLmRyYWluKFxuLy99XG5cbnZhciBfcmVkdWNlID0gZXhwb3J0cy5fcmVkdWNlID0gZnVuY3Rpb24gKHJlYWQsIHJlZHVjZSwgaW5pdGlhbCkge1xuICByZXR1cm4gZnVuY3Rpb24gKGNsb3NlLCBjYikge1xuICAgIGlmKGNsb3NlKSByZXR1cm4gcmVhZChjbG9zZSwgY2IpXG4gICAgaWYoZW5kZWQpIHJldHVybiBjYihlbmRlZClcblxuICAgIHNpbmtzLmRyYWluKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICBpbml0aWFsID0gcmVkdWNlKGluaXRpYWwsIGl0ZW0pXG4gICAgfSwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgICAgZW5kZWQgPSBlcnIgfHwgdHJ1ZVxuICAgICAgaWYoIWVycikgY2IobnVsbCwgaW5pdGlhbClcbiAgICAgIGVsc2UgICAgIGNiKGVuZGVkKVxuICAgIH0pXG4gICAgKHJlYWQpXG4gIH1cbn1cblxudmFyIG5leHRUaWNrID0gcHJvY2Vzcy5uZXh0VGlja1xuXG52YXIgaGlnaFdhdGVyTWFyayA9IGV4cG9ydHMuaGlnaFdhdGVyTWFyayA9XG5mdW5jdGlvbiAocmVhZCwgaGlnaFdhdGVyTWFyaykge1xuICB2YXIgYnVmZmVyID0gW10sIHdhaXRpbmcgPSBbXSwgZW5kZWQsIGVuZGluZywgcmVhZGluZyA9IGZhbHNlXG4gIGhpZ2hXYXRlck1hcmsgPSBoaWdoV2F0ZXJNYXJrIHx8IDEwXG5cbiAgZnVuY3Rpb24gcmVhZEFoZWFkICgpIHtcbiAgICB3aGlsZSh3YWl0aW5nLmxlbmd0aCAmJiAoYnVmZmVyLmxlbmd0aCB8fCBlbmRlZCkpXG4gICAgICB3YWl0aW5nLnNoaWZ0KCkoZW5kZWQsIGVuZGVkID8gbnVsbCA6IGJ1ZmZlci5zaGlmdCgpKVxuXG4gICAgaWYgKCFidWZmZXIubGVuZ3RoICYmIGVuZGluZykgZW5kZWQgPSBlbmRpbmc7XG4gIH1cblxuICBmdW5jdGlvbiBuZXh0ICgpIHtcbiAgICBpZihlbmRlZCB8fCBlbmRpbmcgfHwgcmVhZGluZyB8fCBidWZmZXIubGVuZ3RoID49IGhpZ2hXYXRlck1hcmspXG4gICAgICByZXR1cm5cbiAgICByZWFkaW5nID0gdHJ1ZVxuICAgIHJldHVybiByZWFkKGVuZGVkIHx8IGVuZGluZywgZnVuY3Rpb24gKGVuZCwgZGF0YSkge1xuICAgICAgcmVhZGluZyA9IGZhbHNlXG4gICAgICBlbmRpbmcgPSBlbmRpbmcgfHwgZW5kXG4gICAgICBpZihkYXRhICE9IG51bGwpIGJ1ZmZlci5wdXNoKGRhdGEpXG5cbiAgICAgIG5leHQoKTsgcmVhZEFoZWFkKClcbiAgICB9KVxuICB9XG5cbiAgcHJvY2Vzcy5uZXh0VGljayhuZXh0KVxuXG4gIHJldHVybiBmdW5jdGlvbiAoZW5kLCBjYikge1xuICAgIGVuZGVkID0gZW5kZWQgfHwgZW5kXG4gICAgd2FpdGluZy5wdXNoKGNiKVxuXG4gICAgbmV4dCgpOyByZWFkQWhlYWQoKVxuICB9XG59XG5cbnZhciBmbGF0TWFwID0gZXhwb3J0cy5mbGF0TWFwID1cbmZ1bmN0aW9uIChyZWFkLCBtYXBwZXIpIHtcbiAgbWFwcGVyID0gbWFwcGVyIHx8IGlkXG4gIHZhciBxdWV1ZSA9IFtdLCBlbmRlZFxuXG4gIHJldHVybiBmdW5jdGlvbiAoYWJvcnQsIGNiKSB7XG4gICAgaWYocXVldWUubGVuZ3RoKSByZXR1cm4gY2IobnVsbCwgcXVldWUuc2hpZnQoKSlcbiAgICBlbHNlIGlmKGVuZGVkKSAgIHJldHVybiBjYihlbmRlZClcblxuICAgIHJlYWQoYWJvcnQsIGZ1bmN0aW9uIG5leHQgKGVuZCwgZGF0YSkge1xuICAgICAgaWYoZW5kKSBlbmRlZCA9IGVuZFxuICAgICAgZWxzZSB7XG4gICAgICAgIHZhciBhZGQgPSBtYXBwZXIoZGF0YSlcbiAgICAgICAgd2hpbGUoYWRkICYmIGFkZC5sZW5ndGgpXG4gICAgICAgICAgcXVldWUucHVzaChhZGQuc2hpZnQoKSlcbiAgICAgIH1cblxuICAgICAgaWYocXVldWUubGVuZ3RoKSBjYihudWxsLCBxdWV1ZS5zaGlmdCgpKVxuICAgICAgZWxzZSBpZihlbmRlZCkgICBjYihlbmRlZClcbiAgICAgIGVsc2UgICAgICAgICAgICAgcmVhZChudWxsLCBuZXh0KVxuICAgIH0pXG4gIH1cbn1cblxuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIGpzb25wYXJzZSA9IHJlcXVpcmUoJ2NvZy9qc29ucGFyc2UnKTtcblxuLyoqXG4gICMjIyBzaWduYWxsZXIgcHJvY2VzcyBoYW5kbGluZ1xuXG4gIFdoZW4gYSBzaWduYWxsZXIncyB1bmRlcmxpbmcgbWVzc2VuZ2VyIGVtaXRzIGEgYGRhdGFgIGV2ZW50IHRoaXMgaXNcbiAgZGVsZWdhdGVkIHRvIGEgc2ltcGxlIG1lc3NhZ2UgcGFyc2VyLCB3aGljaCBhcHBsaWVzIHRoZSBmb2xsb3dpbmcgc2ltcGxlXG4gIGxvZ2ljOlxuXG4gIC0gSXMgdGhlIG1lc3NhZ2UgYSBgL3RvYCBtZXNzYWdlLiBJZiBzbywgc2VlIGlmIHRoZSBtZXNzYWdlIGlzIGZvciB0aGlzXG4gICAgc2lnbmFsbGVyIChjaGVja2luZyB0aGUgdGFyZ2V0IGlkIC0gMm5kIGFyZykuICBJZiBzbyBwYXNzIHRoZVxuICAgIHJlbWFpbmRlciBvZiB0aGUgbWVzc2FnZSBvbnRvIHRoZSBzdGFuZGFyZCBwcm9jZXNzaW5nIGNoYWluLiAgSWYgbm90LFxuICAgIGRpc2NhcmQgdGhlIG1lc3NhZ2UuXG5cbiAgLSBJcyB0aGUgbWVzc2FnZSBhIGNvbW1hbmQgbWVzc2FnZSAocHJlZml4ZWQgd2l0aCBhIGZvcndhcmQgc2xhc2gpLiBJZiBzbyxcbiAgICBsb29rIGZvciBhbiBhcHByb3ByaWF0ZSBtZXNzYWdlIGhhbmRsZXIgYW5kIHBhc3MgdGhlIG1lc3NhZ2UgcGF5bG9hZCBvblxuICAgIHRvIGl0LlxuXG4gIC0gRmluYWxseSwgZG9lcyB0aGUgbWVzc2FnZSBtYXRjaCBhbnkgcGF0dGVybnMgdGhhdCB3ZSBhcmUgbGlzdGVuaW5nIGZvcj9cbiAgICBJZiBzbywgdGhlbiBwYXNzIHRoZSBlbnRpcmUgbWVzc2FnZSBjb250ZW50cyBvbnRvIHRoZSByZWdpc3RlcmVkIGhhbmRsZXIuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2lnbmFsbGVyLCBvcHRzKSB7XG4gIHZhciBoYW5kbGVycyA9IHJlcXVpcmUoJy4vaGFuZGxlcnMnKShzaWduYWxsZXIsIG9wdHMpO1xuXG4gIGZ1bmN0aW9uIHNlbmRFdmVudChwYXJ0cywgc3JjU3RhdGUsIGRhdGEpIHtcbiAgICAvLyBpbml0aWFsaXNlIHRoZSBldmVudCBuYW1lXG4gICAgdmFyIGV2dE5hbWUgPSAnbWVzc2FnZTonICsgcGFydHNbMF0uc2xpY2UoMSk7XG5cbiAgICAvLyBjb252ZXJ0IGFueSB2YWxpZCBqc29uIG9iamVjdHMgdG8ganNvblxuICAgIHZhciBhcmdzID0gcGFydHMuc2xpY2UoMikubWFwKGpzb25wYXJzZSk7XG5cbiAgICBzaWduYWxsZXIuYXBwbHkoXG4gICAgICBzaWduYWxsZXIsXG4gICAgICBbZXZ0TmFtZV0uY29uY2F0KGFyZ3MpLmNvbmNhdChbc3JjU3RhdGUsIGRhdGFdKVxuICAgICk7XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24ob3JpZ2luYWxEYXRhKSB7XG4gICAgdmFyIGRhdGEgPSBvcmlnaW5hbERhdGE7XG4gICAgdmFyIGlzTWF0Y2ggPSB0cnVlO1xuICAgIHZhciBwYXJ0cztcbiAgICB2YXIgaGFuZGxlcjtcbiAgICB2YXIgc3JjRGF0YTtcbiAgICB2YXIgc3JjU3RhdGU7XG4gICAgdmFyIGlzRGlyZWN0TWVzc2FnZSA9IGZhbHNlO1xuXG4gICAgLy8gZGlzY2FyZCBwcmltdXMgbWVzc2FnZXNcbiAgICBpZiAoZGF0YSAmJiBkYXRhLnNsaWNlKDAsIDYpID09PSAncHJpbXVzJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGZvcmNlIHRoZSBpZCBpbnRvIHN0cmluZyBmb3JtYXQgc28gd2UgY2FuIHJ1biBsZW5ndGggYW5kIGNvbXBhcmlzb24gdGVzdHMgb24gaXRcbiAgICB2YXIgaWQgPSBzaWduYWxsZXIuaWQgKyAnJztcblxuICAgIC8vIHByb2Nlc3MgL3RvIG1lc3NhZ2VzXG4gICAgaWYgKGRhdGEuc2xpY2UoMCwgMykgPT09ICcvdG8nKSB7XG4gICAgICBpc01hdGNoID0gZGF0YS5zbGljZSg0LCBpZC5sZW5ndGggKyA0KSA9PT0gaWQ7XG4gICAgICBpZiAoaXNNYXRjaCkge1xuICAgICAgICBwYXJ0cyA9IGRhdGEuc2xpY2UoNSArIGlkLmxlbmd0aCkuc3BsaXQoJ3wnKS5tYXAoanNvbnBhcnNlKTtcblxuICAgICAgICAvLyBnZXQgdGhlIHNvdXJjZSBkYXRhXG4gICAgICAgIGlzRGlyZWN0TWVzc2FnZSA9IHRydWU7XG5cbiAgICAgICAgLy8gZXh0cmFjdCB0aGUgdmVjdG9yIGNsb2NrIGFuZCB1cGRhdGUgdGhlIHBhcnRzXG4gICAgICAgIHBhcnRzID0gcGFydHMubWFwKGpzb25wYXJzZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gaWYgdGhpcyBpcyBub3QgYSBtYXRjaCwgdGhlbiBiYWlsXG4gICAgaWYgKCEgaXNNYXRjaCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGNob3AgdGhlIGRhdGEgaW50byBwYXJ0c1xuICAgIHNpZ25hbGxlcigncmF3ZGF0YScsIGRhdGEpO1xuICAgIHBhcnRzID0gcGFydHMgfHwgZGF0YS5zcGxpdCgnfCcpLm1hcChqc29ucGFyc2UpO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSBhIHNwZWNpZmljIGhhbmRsZXIgZm9yIHRoZSBhY3Rpb24sIHRoZW4gaW52b2tlXG4gICAgaWYgKHR5cGVvZiBwYXJ0c1swXSA9PSAnc3RyaW5nJykge1xuICAgICAgLy8gZXh0cmFjdCB0aGUgbWV0YWRhdGEgZnJvbSB0aGUgaW5wdXQgZGF0YVxuICAgICAgc3JjRGF0YSA9IHBhcnRzWzFdO1xuXG4gICAgICAvLyBpZiB3ZSBnb3QgZGF0YSBmcm9tIG91cnNlbGYsIHRoZW4gdGhpcyBpcyBwcmV0dHkgZHVtYlxuICAgICAgLy8gYnV0IGlmIHdlIGhhdmUgdGhlbiB0aHJvdyBpdCBhd2F5XG4gICAgICBpZiAoc3JjRGF0YSAmJiBzcmNEYXRhLmlkID09PSBzaWduYWxsZXIuaWQpIHtcbiAgICAgICAgcmV0dXJuIGNvbnNvbGUud2FybignZ290IGRhdGEgZnJvbSBvdXJzZWxmLCBkaXNjYXJkaW5nJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIGdldCB0aGUgc291cmNlIHN0YXRlXG4gICAgICBzcmNTdGF0ZSA9IHNpZ25hbGxlci5wZWVycy5nZXQoc3JjRGF0YSAmJiBzcmNEYXRhLmlkKSB8fCBzcmNEYXRhO1xuXG4gICAgICAvLyBoYW5kbGUgY29tbWFuZHNcbiAgICAgIGlmIChwYXJ0c1swXS5jaGFyQXQoMCkgPT09ICcvJykge1xuICAgICAgICAvLyBsb29rIGZvciBhIGhhbmRsZXIgZm9yIHRoZSBtZXNzYWdlIHR5cGVcbiAgICAgICAgaGFuZGxlciA9IGhhbmRsZXJzW3BhcnRzWzBdLnNsaWNlKDEpXTtcblxuICAgICAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIGhhbmRsZXIoXG4gICAgICAgICAgICBwYXJ0cy5zbGljZSgyKSxcbiAgICAgICAgICAgIHBhcnRzWzBdLnNsaWNlKDEpLFxuICAgICAgICAgICAgc3JjRGF0YSxcbiAgICAgICAgICAgIHNyY1N0YXRlLFxuICAgICAgICAgICAgaXNEaXJlY3RNZXNzYWdlXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBzZW5kRXZlbnQocGFydHMsIHNyY1N0YXRlLCBvcmlnaW5hbERhdGEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBvdGhlcndpc2UsIGVtaXQgZGF0YVxuICAgICAgZWxzZSB7XG4gICAgICAgIHNpZ25hbGxlcihcbiAgICAgICAgICAnZGF0YScsXG4gICAgICAgICAgcGFydHMuc2xpY2UoMCwgMSkuY29uY2F0KHBhcnRzLnNsaWNlKDIpKSxcbiAgICAgICAgICBzcmNEYXRhLFxuICAgICAgICAgIHNyY1N0YXRlLFxuICAgICAgICAgIGlzRGlyZWN0TWVzc2FnZVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn07XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGVidWcgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJykoJ3J0Yy9jbGVhbnVwJyk7XG5cbnZhciBDQU5OT1RfQ0xPU0VfU1RBVEVTID0gW1xuICAnY2xvc2VkJ1xuXTtcblxudmFyIEVWRU5UU19ERUNPVVBMRV9CQyA9IFtcbiAgJ2FkZHN0cmVhbScsXG4gICdkYXRhY2hhbm5lbCcsXG4gICdpY2VjYW5kaWRhdGUnLFxuICAnbmVnb3RpYXRpb25uZWVkZWQnLFxuICAncmVtb3Zlc3RyZWFtJyxcbiAgJ3NpZ25hbGluZ3N0YXRlY2hhbmdlJ1xuXTtcblxudmFyIEVWRU5UU19ERUNPVVBMRV9BQyA9IFtcbiAgJ2ljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZSdcbl07XG5cbi8qKlxuICAjIyMgcnRjLXRvb2xzL2NsZWFudXBcblxuICBgYGBcbiAgY2xlYW51cChwYylcbiAgYGBgXG5cbiAgVGhlIGBjbGVhbnVwYCBmdW5jdGlvbiBpcyB1c2VkIHRvIGVuc3VyZSB0aGF0IGEgcGVlciBjb25uZWN0aW9uIGlzIHByb3Blcmx5XG4gIGNsb3NlZCBhbmQgcmVhZHkgdG8gYmUgY2xlYW5lZCB1cCBieSB0aGUgYnJvd3Nlci5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHBjKSB7XG4gIC8vIHNlZSBpZiB3ZSBjYW4gY2xvc2UgdGhlIGNvbm5lY3Rpb25cbiAgdmFyIGN1cnJlbnRTdGF0ZSA9IHBjLmljZUNvbm5lY3Rpb25TdGF0ZTtcbiAgdmFyIGNhbkNsb3NlID0gQ0FOTk9UX0NMT1NFX1NUQVRFUy5pbmRleE9mKGN1cnJlbnRTdGF0ZSkgPCAwO1xuXG4gIGZ1bmN0aW9uIGRlY291cGxlKGV2ZW50cykge1xuICAgIGV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2dE5hbWUpIHtcbiAgICAgIGlmIChwY1snb24nICsgZXZ0TmFtZV0pIHtcbiAgICAgICAgcGNbJ29uJyArIGV2dE5hbWVdID0gbnVsbDtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8vIGRlY291cGxlIFwiYmVmb3JlIGNsb3NlXCIgZXZlbnRzXG4gIGRlY291cGxlKEVWRU5UU19ERUNPVVBMRV9CQyk7XG5cbiAgaWYgKGNhbkNsb3NlKSB7XG4gICAgZGVidWcoJ2F0dGVtcHRpbmcgY29ubmVjdGlvbiBjbG9zZSwgY3VycmVudCBzdGF0ZTogJysgcGMuaWNlQ29ubmVjdGlvblN0YXRlKTtcbiAgICBwYy5jbG9zZSgpO1xuICB9XG5cbiAgLy8gcmVtb3ZlIHRoZSBldmVudCBsaXN0ZW5lcnNcbiAgLy8gYWZ0ZXIgYSBzaG9ydCBkZWxheSBnaXZpbmcgdGhlIGNvbm5lY3Rpb24gdGltZSB0byB0cmlnZ2VyXG4gIC8vIGNsb3NlIGFuZCBpY2Vjb25uZWN0aW9uc3RhdGVjaGFuZ2UgZXZlbnRzXG4gIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgZGVjb3VwbGUoRVZFTlRTX0RFQ09VUExFX0FDKTtcbiAgfSwgMTAwKTtcbn07XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgbWJ1cyA9IHJlcXVpcmUoJ21idXMnKTtcbnZhciBxdWV1ZSA9IHJlcXVpcmUoJ3J0Yy10YXNrcXVldWUnKTtcbnZhciBjbGVhbnVwID0gcmVxdWlyZSgnLi9jbGVhbnVwJyk7XG52YXIgbW9uaXRvciA9IHJlcXVpcmUoJy4vbW9uaXRvcicpO1xudmFyIHRocm90dGxlID0gcmVxdWlyZSgnY29nL3Rocm90dGxlJyk7XG52YXIgcGx1Y2sgPSByZXF1aXJlKCd3aGlzay9wbHVjaycpO1xudmFyIHBsdWNrQ2FuZGlkYXRlID0gcGx1Y2soJ2NhbmRpZGF0ZScsICdzZHBNaWQnLCAnc2RwTUxpbmVJbmRleCcpO1xudmFyIENMT1NFRF9TVEFURVMgPSBbICdjbG9zZWQnLCAnZmFpbGVkJyBdO1xudmFyIENIRUNLSU5HX1NUQVRFUyA9IFsgJ2NoZWNraW5nJyBdO1xuXG4vKipcbiAgIyMjIHJ0Yy10b29scy9jb3VwbGVcblxuICAjIyMjIGNvdXBsZShwYywgdGFyZ2V0SWQsIHNpZ25hbGxlciwgb3B0cz8pXG5cbiAgQ291cGxlIGEgV2ViUlRDIGNvbm5lY3Rpb24gd2l0aCBhbm90aGVyIHdlYnJ0YyBjb25uZWN0aW9uIGlkZW50aWZpZWQgYnlcbiAgYHRhcmdldElkYCB2aWEgdGhlIHNpZ25hbGxlci5cblxuICBUaGUgZm9sbG93aW5nIG9wdGlvbnMgY2FuIGJlIHByb3ZpZGVkIGluIHRoZSBgb3B0c2AgYXJndW1lbnQ6XG5cbiAgLSBgc2RwZmlsdGVyYCAoZGVmYXVsdDogbnVsbClcblxuICAgIEEgc2ltcGxlIGZ1bmN0aW9uIGZvciBmaWx0ZXJpbmcgU0RQIGFzIHBhcnQgb2YgdGhlIHBlZXJcbiAgICBjb25uZWN0aW9uIGhhbmRzaGFrZSAoc2VlIHRoZSBVc2luZyBGaWx0ZXJzIGRldGFpbHMgYmVsb3cpLlxuXG4gICMjIyMjIEV4YW1wbGUgVXNhZ2VcblxuICBgYGBqc1xuICB2YXIgY291cGxlID0gcmVxdWlyZSgncnRjL2NvdXBsZScpO1xuXG4gIGNvdXBsZShwYywgJzU0ODc5OTY1LWNlNDMtNDI2ZS1hOGVmLTA5YWMxZTM5YTE2ZCcsIHNpZ25hbGxlcik7XG4gIGBgYFxuXG4gICMjIyMjIFVzaW5nIEZpbHRlcnNcblxuICBJbiBjZXJ0YWluIGluc3RhbmNlcyB5b3UgbWF5IHdpc2ggdG8gbW9kaWZ5IHRoZSByYXcgU0RQIHRoYXQgaXMgcHJvdmlkZWRcbiAgYnkgdGhlIGBjcmVhdGVPZmZlcmAgYW5kIGBjcmVhdGVBbnN3ZXJgIGNhbGxzLiAgVGhpcyBjYW4gYmUgZG9uZSBieSBwYXNzaW5nXG4gIGEgYHNkcGZpbHRlcmAgZnVuY3Rpb24gKG9yIGFycmF5KSBpbiB0aGUgb3B0aW9ucy4gIEZvciBleGFtcGxlOlxuXG4gIGBgYGpzXG4gIC8vIHJ1biB0aGUgc2RwIGZyb20gdGhyb3VnaCBhIGxvY2FsIHR3ZWFrU2RwIGZ1bmN0aW9uLlxuICBjb3VwbGUocGMsICc1NDg3OTk2NS1jZTQzLTQyNmUtYThlZi0wOWFjMWUzOWExNmQnLCBzaWduYWxsZXIsIHtcbiAgICBzZHBmaWx0ZXI6IHR3ZWFrU2RwXG4gIH0pO1xuICBgYGBcblxuKiovXG5mdW5jdGlvbiBjb3VwbGUocGMsIHRhcmdldElkLCBzaWduYWxsZXIsIG9wdHMpIHtcbiAgdmFyIGRlYnVnTGFiZWwgPSAob3B0cyB8fCB7fSkuZGVidWdMYWJlbCB8fCAncnRjJztcbiAgdmFyIGRlYnVnID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpKGRlYnVnTGFiZWwgKyAnL2NvdXBsZScpO1xuXG4gIC8vIGNyZWF0ZSBhIG1vbml0b3IgZm9yIHRoZSBjb25uZWN0aW9uXG4gIHZhciBtb24gPSBtb25pdG9yKHBjLCB0YXJnZXRJZCwgc2lnbmFsbGVyLCAob3B0cyB8fCB7fSkubG9nZ2VyKTtcbiAgdmFyIGVtaXQgPSBtYnVzKCcnLCBtb24pO1xuICB2YXIgcmVhY3RpdmUgPSAob3B0cyB8fCB7fSkucmVhY3RpdmU7XG4gIHZhciBlbmRPZkNhbmRpZGF0ZXMgPSB0cnVlO1xuXG4gIC8vIGNvbmZpZ3VyZSB0aGUgdGltZSB0byB3YWl0IGJldHdlZW4gcmVjZWl2aW5nIGEgJ2Rpc2Nvbm5lY3QnXG4gIC8vIGljZUNvbm5lY3Rpb25TdGF0ZSBhbmQgZGV0ZXJtaW5pbmcgdGhhdCB3ZSBhcmUgY2xvc2VkXG4gIHZhciBkaXNjb25uZWN0VGltZW91dCA9IChvcHRzIHx8IHt9KS5kaXNjb25uZWN0VGltZW91dCB8fCAxMDAwMDtcbiAgdmFyIGRpc2Nvbm5lY3RUaW1lcjtcblxuICAvLyBpbml0aWxhaXNlIHRoZSBuZWdvdGlhdGlvbiBoZWxwZXJzXG4gIHZhciBpc01hc3RlciA9IHNpZ25hbGxlci5pc01hc3Rlcih0YXJnZXRJZCk7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgcHJvY2Vzc2luZyBxdWV1ZSAob25lIGF0IGEgdGltZSBwbGVhc2UpXG4gIHZhciBxID0gcXVldWUocGMsIG9wdHMpO1xuXG4gIHZhciBjcmVhdGVPclJlcXVlc3RPZmZlciA9IHRocm90dGxlKGZ1bmN0aW9uKCkge1xuICAgIGlmICghIGlzTWFzdGVyKSB7XG4gICAgICByZXR1cm4gc2lnbmFsbGVyLnRvKHRhcmdldElkKS5zZW5kKCcvbmVnb3RpYXRlJyk7XG4gICAgfVxuXG4gICAgcS5jcmVhdGVPZmZlcigpO1xuICB9LCAxMDAsIHsgbGVhZGluZzogZmFsc2UgfSk7XG5cbiAgdmFyIGRlYm91bmNlT2ZmZXIgPSB0aHJvdHRsZShxLmNyZWF0ZU9mZmVyLCAxMDAsIHsgbGVhZGluZzogZmFsc2UgfSk7XG5cbiAgZnVuY3Rpb24gZGVjb3VwbGUoKSB7XG4gICAgZGVidWcoJ2RlY291cGxpbmcgJyArIHNpZ25hbGxlci5pZCArICcgZnJvbSAnICsgdGFyZ2V0SWQpO1xuXG4gICAgLy8gc3RvcCB0aGUgbW9uaXRvclxuLy8gICAgIG1vbi5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbiAgICBtb24uc3RvcCgpO1xuXG4gICAgLy8gY2xlYW51cCB0aGUgcGVlcmNvbm5lY3Rpb25cbiAgICBjbGVhbnVwKHBjKTtcblxuICAgIC8vIHJlbW92ZSBsaXN0ZW5lcnNcbiAgICBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIoJ3NkcCcsIGhhbmRsZVNkcCk7XG4gICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCdjYW5kaWRhdGUnLCBoYW5kbGVDYW5kaWRhdGUpO1xuICAgIHNpZ25hbGxlci5yZW1vdmVMaXN0ZW5lcignbmVnb3RpYXRlJywgaGFuZGxlTmVnb3RpYXRlUmVxdWVzdCk7XG5cbiAgICAvLyByZW1vdmUgbGlzdGVuZXJzICh2ZXJzaW9uID49IDUpXG4gICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCdtZXNzYWdlOnNkcCcsIGhhbmRsZVNkcCk7XG4gICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCdtZXNzYWdlOmNhbmRpZGF0ZScsIGhhbmRsZUNhbmRpZGF0ZSk7XG4gICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCdtZXNzYWdlOm5lZ290aWF0ZScsIGhhbmRsZU5lZ290aWF0ZVJlcXVlc3QpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlQ2FuZGlkYXRlKGRhdGEpIHtcbiAgICBxLmFkZEljZUNhbmRpZGF0ZShkYXRhKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZVNkcChzZHAsIHNyYykge1xuICAgIGVtaXQoJ3NkcC5yZW1vdGUnLCBzZHApO1xuXG4gICAgLy8gaWYgdGhlIHNvdXJjZSBpcyB1bmtub3duIG9yIG5vdCBhIG1hdGNoLCB0aGVuIGRvbid0IHByb2Nlc3NcbiAgICBpZiAoKCEgc3JjKSB8fCAoc3JjLmlkICE9PSB0YXJnZXRJZCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBxLnNldFJlbW90ZURlc2NyaXB0aW9uKHNkcCk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVDb25uZWN0aW9uQ2xvc2UoKSB7XG4gICAgZGVidWcoJ2NhcHR1cmVkIHBjIGNsb3NlLCBpY2VDb25uZWN0aW9uU3RhdGUgPSAnICsgcGMuaWNlQ29ubmVjdGlvblN0YXRlKTtcbiAgICBkZWNvdXBsZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlRGlzY29ubmVjdCgpIHtcbiAgICBkZWJ1ZygnY2FwdHVyZWQgcGMgZGlzY29ubmVjdCwgbW9uaXRvcmluZyBjb25uZWN0aW9uIHN0YXR1cycpO1xuXG4gICAgLy8gc3RhcnQgdGhlIGRpc2Nvbm5lY3QgdGltZXJcbiAgICBkaXNjb25uZWN0VGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgZGVidWcoJ21hbnVhbGx5IGNsb3NpbmcgY29ubmVjdGlvbiBhZnRlciBkaXNjb25uZWN0IHRpbWVvdXQnKTtcbiAgICAgIGNsZWFudXAocGMpO1xuICAgIH0sIGRpc2Nvbm5lY3RUaW1lb3V0KTtcblxuICAgIG1vbi5vbignc3RhdGVjaGFuZ2UnLCBoYW5kbGVEaXNjb25uZWN0QWJvcnQpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlRGlzY29ubmVjdEFib3J0KCkge1xuICAgIGRlYnVnKCdjb25uZWN0aW9uIHN0YXRlIGNoYW5nZWQgdG86ICcgKyBwYy5pY2VDb25uZWN0aW9uU3RhdGUpO1xuXG4gICAgLy8gaWYgdGhlIHN0YXRlIGlzIGNoZWNraW5nLCB0aGVuIGRvIG5vdCByZXNldCB0aGUgZGlzY29ubmVjdCB0aW1lciBhc1xuICAgIC8vIHdlIGFyZSBkb2luZyBvdXIgb3duIGNoZWNraW5nXG4gICAgaWYgKENIRUNLSU5HX1NUQVRFUy5pbmRleE9mKHBjLmljZUNvbm5lY3Rpb25TdGF0ZSkgPj0gMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHJlc2V0RGlzY29ubmVjdFRpbWVyKCk7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGEgY2xvc2VkIG9yIGZhaWxlZCBzdGF0dXMsIHRoZW4gY2xvc2UgdGhlIGNvbm5lY3Rpb25cbiAgICBpZiAoQ0xPU0VEX1NUQVRFUy5pbmRleE9mKHBjLmljZUNvbm5lY3Rpb25TdGF0ZSkgPj0gMCkge1xuICAgICAgcmV0dXJuIG1vbignY2xvc2VkJyk7XG4gICAgfVxuXG4gICAgbW9uLm9uY2UoJ2Rpc2Nvbm5lY3QnLCBoYW5kbGVEaXNjb25uZWN0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZUxvY2FsQ2FuZGlkYXRlKGV2dCkge1xuICAgIHZhciBkYXRhID0gZXZ0LmNhbmRpZGF0ZSAmJiBwbHVja0NhbmRpZGF0ZShldnQuY2FuZGlkYXRlKTtcblxuICAgIGlmIChldnQuY2FuZGlkYXRlKSB7XG4gICAgICByZXNldERpc2Nvbm5lY3RUaW1lcigpO1xuICAgICAgZW1pdCgnaWNlLmxvY2FsJywgZGF0YSk7XG4gICAgICBzaWduYWxsZXIudG8odGFyZ2V0SWQpLnNlbmQoJy9jYW5kaWRhdGUnLCBkYXRhKTtcbiAgICAgIGVuZE9mQ2FuZGlkYXRlcyA9IGZhbHNlO1xuICAgIH1cbiAgICBlbHNlIGlmICghIGVuZE9mQ2FuZGlkYXRlcykge1xuICAgICAgZW5kT2ZDYW5kaWRhdGVzID0gdHJ1ZTtcbiAgICAgIGVtaXQoJ2ljZS5nYXRoZXJjb21wbGV0ZScpO1xuICAgICAgc2lnbmFsbGVyLnRvKHRhcmdldElkKS5zZW5kKCcvZW5kb2ZjYW5kaWRhdGVzJywge30pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZU5lZ290aWF0ZVJlcXVlc3Qoc3JjKSB7XG4gICAgaWYgKHNyYy5pZCA9PT0gdGFyZ2V0SWQpIHtcbiAgICAgIGVtaXQoJ25lZ290aWF0ZS5yZXF1ZXN0Jywgc3JjLmlkKTtcbiAgICAgIGRlYm91bmNlT2ZmZXIoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZXNldERpc2Nvbm5lY3RUaW1lcigpIHtcbiAgICBtb24ub2ZmKCdzdGF0ZWNoYW5nZScsIGhhbmRsZURpc2Nvbm5lY3RBYm9ydCk7XG5cbiAgICAvLyBjbGVhciB0aGUgZGlzY29ubmVjdCB0aW1lclxuICAgIGRlYnVnKCdyZXNldCBkaXNjb25uZWN0IHRpbWVyLCBzdGF0ZTogJyArIHBjLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG4gICAgY2xlYXJUaW1lb3V0KGRpc2Nvbm5lY3RUaW1lcik7XG4gIH1cblxuICAvLyB3aGVuIHJlZ290aWF0aW9uIGlzIG5lZWRlZCBsb29rIGZvciB0aGUgcGVlclxuICBpZiAocmVhY3RpdmUpIHtcbiAgICBwYy5vbm5lZ290aWF0aW9ubmVlZGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICBlbWl0KCduZWdvdGlhdGUucmVuZWdvdGlhdGUnKTtcbiAgICAgIGNyZWF0ZU9yUmVxdWVzdE9mZmVyKCk7XG4gICAgfTtcbiAgfVxuXG4gIHBjLm9uaWNlY2FuZGlkYXRlID0gaGFuZGxlTG9jYWxDYW5kaWRhdGU7XG5cbiAgLy8gd2hlbiB0aGUgdGFzayBxdWV1ZSB0ZWxscyB1cyB3ZSBoYXZlIHNkcCBhdmFpbGFibGUsIHNlbmQgdGhhdCBvdmVyIHRoZSB3aXJlXG4gIHEub24oJ3NkcC5sb2NhbCcsIGZ1bmN0aW9uKGRlc2MpIHtcbiAgICBzaWduYWxsZXIudG8odGFyZ2V0SWQpLnNlbmQoJy9zZHAnLCBkZXNjKTtcbiAgfSk7XG5cbiAgLy8gd2hlbiB3ZSByZWNlaXZlIHNkcCwgdGhlblxuICBzaWduYWxsZXIub24oJ3NkcCcsIGhhbmRsZVNkcCk7XG4gIHNpZ25hbGxlci5vbignY2FuZGlkYXRlJywgaGFuZGxlQ2FuZGlkYXRlKTtcblxuICAvLyBsaXN0ZW5lcnMgKHNpZ25hbGxlciA+PSA1KVxuICBzaWduYWxsZXIub24oJ21lc3NhZ2U6c2RwJywgaGFuZGxlU2RwKTtcbiAgc2lnbmFsbGVyLm9uKCdtZXNzYWdlOmNhbmRpZGF0ZScsIGhhbmRsZUNhbmRpZGF0ZSk7XG5cbiAgLy8gaWYgdGhpcyBpcyBhIG1hc3RlciBjb25uZWN0aW9uLCBsaXN0ZW4gZm9yIG5lZ290aWF0ZSBldmVudHNcbiAgaWYgKGlzTWFzdGVyKSB7XG4gICAgc2lnbmFsbGVyLm9uKCduZWdvdGlhdGUnLCBoYW5kbGVOZWdvdGlhdGVSZXF1ZXN0KTtcbiAgICBzaWduYWxsZXIub24oJ21lc3NhZ2U6bmVnb3RpYXRlJywgaGFuZGxlTmVnb3RpYXRlUmVxdWVzdCk7IC8vIHNpZ25hbGxlciA+PSA1XG4gIH1cblxuICAvLyB3aGVuIHRoZSBjb25uZWN0aW9uIGNsb3NlcywgcmVtb3ZlIGV2ZW50IGhhbmRsZXJzXG4gIG1vbi5vbmNlKCdjbG9zZWQnLCBoYW5kbGVDb25uZWN0aW9uQ2xvc2UpO1xuICBtb24ub25jZSgnZGlzY29ubmVjdGVkJywgaGFuZGxlRGlzY29ubmVjdCk7XG5cbiAgLy8gcGF0Y2ggaW4gdGhlIGNyZWF0ZSBvZmZlciBmdW5jdGlvbnNcbiAgbW9uLmNyZWF0ZU9mZmVyID0gY3JlYXRlT3JSZXF1ZXN0T2ZmZXI7XG5cbiAgcmV0dXJuIG1vbjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjb3VwbGU7XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyMjIHJ0Yy10b29scy9kZXRlY3RcblxuICBQcm92aWRlIHRoZSBbcnRjLWNvcmUvZGV0ZWN0XShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1jb3JlI2RldGVjdClcbiAgZnVuY3Rpb25hbGl0eS5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCdydGMtY29yZS9kZXRlY3QnKTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKSgnZ2VuZXJhdG9ycycpO1xudmFyIGRldGVjdCA9IHJlcXVpcmUoJy4vZGV0ZWN0Jyk7XG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCdjb2cvZGVmYXVsdHMnKTtcblxudmFyIG1hcHBpbmdzID0ge1xuICBjcmVhdGU6IHtcbiAgICBkdGxzOiBmdW5jdGlvbihjKSB7XG4gICAgICBpZiAoISBkZXRlY3QubW96KSB7XG4gICAgICAgIGMub3B0aW9uYWwgPSAoYy5vcHRpb25hbCB8fCBbXSkuY29uY2F0KHsgRHRsc1NydHBLZXlBZ3JlZW1lbnQ6IHRydWUgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAgIyMjIHJ0Yy10b29scy9nZW5lcmF0b3JzXG5cbiAgVGhlIGdlbmVyYXRvcnMgcGFja2FnZSBwcm92aWRlcyBzb21lIHV0aWxpdHkgbWV0aG9kcyBmb3IgZ2VuZXJhdGluZ1xuICBjb25zdHJhaW50IG9iamVjdHMgYW5kIHNpbWlsYXIgY29uc3RydWN0cy5cblxuICBgYGBqc1xuICB2YXIgZ2VuZXJhdG9ycyA9IHJlcXVpcmUoJ3J0Yy9nZW5lcmF0b3JzJyk7XG4gIGBgYFxuXG4qKi9cblxuLyoqXG4gICMjIyMgZ2VuZXJhdG9ycy5jb25maWcoY29uZmlnKVxuXG4gIEdlbmVyYXRlIGEgY29uZmlndXJhdGlvbiBvYmplY3Qgc3VpdGFibGUgZm9yIHBhc3NpbmcgaW50byBhbiBXM0NcbiAgUlRDUGVlckNvbm5lY3Rpb24gY29uc3RydWN0b3IgZmlyc3QgYXJndW1lbnQsIGJhc2VkIG9uIG91ciBjdXN0b20gY29uZmlnLlxuXG4gIEluIHRoZSBldmVudCB0aGF0IHlvdSB1c2Ugc2hvcnQgdGVybSBhdXRoZW50aWNhdGlvbiBmb3IgVFVSTiwgYW5kIHlvdSB3YW50XG4gIHRvIGdlbmVyYXRlIG5ldyBgaWNlU2VydmVyc2AgcmVndWxhcmx5LCB5b3UgY2FuIHNwZWNpZnkgYW4gaWNlU2VydmVyR2VuZXJhdG9yXG4gIHRoYXQgd2lsbCBiZSB1c2VkIHByaW9yIHRvIGNvdXBsaW5nLiBUaGlzIGdlbmVyYXRvciBzaG91bGQgcmV0dXJuIGEgZnVsbHlcbiAgY29tcGxpYW50IFczQyAoUlRDSWNlU2VydmVyIGRpY3Rpb25hcnkpW2h0dHA6Ly93d3cudzMub3JnL1RSL3dlYnJ0Yy8jaWRsLWRlZi1SVENJY2VTZXJ2ZXJdLlxuXG4gIElmIHlvdSBwYXNzIGluIGJvdGggYSBnZW5lcmF0b3IgYW5kIGljZVNlcnZlcnMsIHRoZSBpY2VTZXJ2ZXJzIF93aWxsIGJlXG4gIGlnbm9yZWQgYW5kIHRoZSBnZW5lcmF0b3IgdXNlZCBpbnN0ZWFkLlxuKiovXG5cbmV4cG9ydHMuY29uZmlnID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gIHZhciBpY2VTZXJ2ZXJHZW5lcmF0b3IgPSAoY29uZmlnIHx8IHt9KS5pY2VTZXJ2ZXJHZW5lcmF0b3I7XG5cbiAgcmV0dXJuIGRlZmF1bHRzKHt9LCBjb25maWcsIHtcbiAgICBpY2VTZXJ2ZXJzOiB0eXBlb2YgaWNlU2VydmVyR2VuZXJhdG9yID09ICdmdW5jdGlvbicgPyBpY2VTZXJ2ZXJHZW5lcmF0b3IoKSA6IFtdXG4gIH0pO1xufTtcblxuLyoqXG4gICMjIyMgZ2VuZXJhdG9ycy5jb25uZWN0aW9uQ29uc3RyYWludHMoZmxhZ3MsIGNvbnN0cmFpbnRzKVxuXG4gIFRoaXMgaXMgYSBoZWxwZXIgZnVuY3Rpb24gdGhhdCB3aWxsIGdlbmVyYXRlIGFwcHJvcHJpYXRlIGNvbm5lY3Rpb25cbiAgY29uc3RyYWludHMgZm9yIGEgbmV3IGBSVENQZWVyQ29ubmVjdGlvbmAgb2JqZWN0IHdoaWNoIGlzIGNvbnN0cnVjdGVkXG4gIGluIHRoZSBmb2xsb3dpbmcgd2F5OlxuXG4gIGBgYGpzXG4gIHZhciBjb25uID0gbmV3IFJUQ1BlZXJDb25uZWN0aW9uKGZsYWdzLCBjb25zdHJhaW50cyk7XG4gIGBgYFxuXG4gIEluIG1vc3QgY2FzZXMgdGhlIGNvbnN0cmFpbnRzIG9iamVjdCBjYW4gYmUgbGVmdCBlbXB0eSwgYnV0IHdoZW4gY3JlYXRpbmdcbiAgZGF0YSBjaGFubmVscyBzb21lIGFkZGl0aW9uYWwgb3B0aW9ucyBhcmUgcmVxdWlyZWQuICBUaGlzIGZ1bmN0aW9uXG4gIGNhbiBnZW5lcmF0ZSB0aG9zZSBhZGRpdGlvbmFsIG9wdGlvbnMgYW5kIGludGVsbGlnZW50bHkgY29tYmluZSBhbnlcbiAgdXNlciBkZWZpbmVkIGNvbnN0cmFpbnRzIChpbiBgY29uc3RyYWludHNgKSB3aXRoIHNob3J0aGFuZCBmbGFncyB0aGF0XG4gIG1pZ2h0IGJlIHBhc3NlZCB3aGlsZSB1c2luZyB0aGUgYHJ0Yy5jcmVhdGVDb25uZWN0aW9uYCBoZWxwZXIuXG4qKi9cbmV4cG9ydHMuY29ubmVjdGlvbkNvbnN0cmFpbnRzID0gZnVuY3Rpb24oZmxhZ3MsIGNvbnN0cmFpbnRzKSB7XG4gIHZhciBnZW5lcmF0ZWQgPSB7fTtcbiAgdmFyIG0gPSBtYXBwaW5ncy5jcmVhdGU7XG4gIHZhciBvdXQ7XG5cbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBmbGFncyBhbmQgYXBwbHkgdGhlIGNyZWF0ZSBtYXBwaW5nc1xuICBPYmplY3Qua2V5cyhmbGFncyB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAobVtrZXldKSB7XG4gICAgICBtW2tleV0oZ2VuZXJhdGVkKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIGdlbmVyYXRlIHRoZSBjb25uZWN0aW9uIGNvbnN0cmFpbnRzXG4gIG91dCA9IGRlZmF1bHRzKHt9LCBjb25zdHJhaW50cywgZ2VuZXJhdGVkKTtcbiAgZGVidWcoJ2dlbmVyYXRlZCBjb25uZWN0aW9uIGNvbnN0cmFpbnRzOiAnLCBvdXQpO1xuXG4gIHJldHVybiBvdXQ7XG59O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyBydGMtdG9vbHNcblxuICBUaGUgYHJ0Yy10b29sc2AgbW9kdWxlIGRvZXMgbW9zdCBvZiB0aGUgaGVhdnkgbGlmdGluZyB3aXRoaW4gdGhlXG4gIFtydGMuaW9dKGh0dHA6Ly9ydGMuaW8pIHN1aXRlLiAgUHJpbWFyaWx5IGl0IGhhbmRsZXMgdGhlIGxvZ2ljIG9mIGNvdXBsaW5nXG4gIGEgbG9jYWwgYFJUQ1BlZXJDb25uZWN0aW9uYCB3aXRoIGl0J3MgcmVtb3RlIGNvdW50ZXJwYXJ0IHZpYSBhblxuICBbcnRjLXNpZ25hbGxlcl0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtc2lnbmFsbGVyKSBzaWduYWxsaW5nXG4gIGNoYW5uZWwuXG5cbiAgIyMgR2V0dGluZyBTdGFydGVkXG5cbiAgSWYgeW91IGRlY2lkZSB0aGF0IHRoZSBgcnRjLXRvb2xzYCBtb2R1bGUgaXMgYSBiZXR0ZXIgZml0IGZvciB5b3UgdGhhbiBlaXRoZXJcbiAgW3J0Yy1xdWlja2Nvbm5lY3RdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLXF1aWNrY29ubmVjdCkgb3JcbiAgW3J0Y10oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMpIHRoZW4gdGhlIGNvZGUgc25pcHBldCBiZWxvd1xuICB3aWxsIHByb3ZpZGUgeW91IGEgZ3VpZGUgb24gaG93IHRvIGdldCBzdGFydGVkIHVzaW5nIGl0IGluIGNvbmp1bmN0aW9uIHdpdGhcbiAgdGhlIFtydGMtc2lnbmFsbGVyXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1zaWduYWxsZXIpICh2ZXJzaW9uIDUuMCBhbmQgYWJvdmUpXG4gIGFuZCBbcnRjLW1lZGlhXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1tZWRpYSkgbW9kdWxlczpcblxuICA8PDwgZXhhbXBsZXMvZ2V0dGluZy1zdGFydGVkLmpzXG5cbiAgVGhpcyBjb2RlIGRlZmluaXRlbHkgZG9lc24ndCBjb3ZlciBhbGwgdGhlIGNhc2VzIHRoYXQgeW91IG5lZWQgdG8gY29uc2lkZXJcbiAgKGkuZS4gcGVlcnMgbGVhdmluZywgZXRjKSBidXQgaXQgc2hvdWxkIGRlbW9uc3RyYXRlIGhvdyB0bzpcblxuICAxLiBDYXB0dXJlIHZpZGVvIGFuZCBhZGQgaXQgdG8gYSBwZWVyIGNvbm5lY3Rpb25cbiAgMi4gQ291cGxlIGEgbG9jYWwgcGVlciBjb25uZWN0aW9uIHdpdGggYSByZW1vdGUgcGVlciBjb25uZWN0aW9uXG4gIDMuIERlYWwgd2l0aCB0aGUgcmVtb3RlIHN0ZWFtIGJlaW5nIGRpc2NvdmVyZWQgYW5kIGhvdyB0byByZW5kZXJcbiAgICAgdGhhdCB0byB0aGUgbG9jYWwgaW50ZXJmYWNlLlxuXG4gICMjIFJlZmVyZW5jZVxuXG4qKi9cblxudmFyIGdlbiA9IHJlcXVpcmUoJy4vZ2VuZXJhdG9ycycpO1xuXG4vLyBleHBvcnQgZGV0ZWN0XG52YXIgZGV0ZWN0ID0gZXhwb3J0cy5kZXRlY3QgPSByZXF1aXJlKCcuL2RldGVjdCcpO1xudmFyIGZpbmRQbHVnaW4gPSByZXF1aXJlKCdydGMtY29yZS9wbHVnaW4nKTtcblxuLy8gZXhwb3J0IGNvZyBsb2dnZXIgZm9yIGNvbnZlbmllbmNlXG5leHBvcnRzLmxvZ2dlciA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKTtcblxuLy8gZXhwb3J0IHBlZXIgY29ubmVjdGlvblxudmFyIFJUQ1BlZXJDb25uZWN0aW9uID1cbmV4cG9ydHMuUlRDUGVlckNvbm5lY3Rpb24gPSBkZXRlY3QoJ1JUQ1BlZXJDb25uZWN0aW9uJyk7XG5cbi8vIGFkZCB0aGUgY291cGxlIHV0aWxpdHlcbmV4cG9ydHMuY291cGxlID0gcmVxdWlyZSgnLi9jb3VwbGUnKTtcblxuLyoqXG4gICMjIyBjcmVhdGVDb25uZWN0aW9uXG5cbiAgYGBgXG4gIGNyZWF0ZUNvbm5lY3Rpb24ob3B0cz8sIGNvbnN0cmFpbnRzPykgPT4gUlRDUGVlckNvbm5lY3Rpb25cbiAgYGBgXG5cbiAgQ3JlYXRlIGEgbmV3IGBSVENQZWVyQ29ubmVjdGlvbmAgYXV0byBnZW5lcmF0aW5nIGRlZmF1bHQgb3B0cyBhcyByZXF1aXJlZC5cblxuICBgYGBqc1xuICB2YXIgY29ubjtcblxuICAvLyB0aGlzIGlzIG9rXG4gIGNvbm4gPSBydGMuY3JlYXRlQ29ubmVjdGlvbigpO1xuXG4gIC8vIGFuZCBzbyBpcyB0aGlzXG4gIGNvbm4gPSBydGMuY3JlYXRlQ29ubmVjdGlvbih7XG4gICAgaWNlU2VydmVyczogW11cbiAgfSk7XG4gIGBgYFxuKiovXG5leHBvcnRzLmNyZWF0ZUNvbm5lY3Rpb24gPSBmdW5jdGlvbihvcHRzLCBjb25zdHJhaW50cykge1xuICB2YXIgcGx1Z2luID0gZmluZFBsdWdpbigob3B0cyB8fCB7fSkucGx1Z2lucyk7XG4gIHZhciBQZWVyQ29ubmVjdGlvbiA9IChvcHRzIHx8IHt9KS5SVENQZWVyQ29ubmVjdGlvbiB8fCBSVENQZWVyQ29ubmVjdGlvbjtcblxuICAvLyBnZW5lcmF0ZSB0aGUgY29uZmlnIGJhc2VkIG9uIG9wdGlvbnMgcHJvdmlkZWRcbiAgdmFyIGNvbmZpZyA9IGdlbi5jb25maWcob3B0cyk7XG5cbiAgLy8gZ2VuZXJhdGUgYXBwcm9wcmlhdGUgY29ubmVjdGlvbiBjb25zdHJhaW50c1xuICBjb25zdHJhaW50cyA9IGdlbi5jb25uZWN0aW9uQ29uc3RyYWludHMob3B0cywgY29uc3RyYWludHMpO1xuXG4gIGlmIChwbHVnaW4gJiYgdHlwZW9mIHBsdWdpbi5jcmVhdGVDb25uZWN0aW9uID09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gcGx1Z2luLmNyZWF0ZUNvbm5lY3Rpb24oY29uZmlnLCBjb25zdHJhaW50cyk7XG4gIH1cblxuICByZXR1cm4gbmV3IFBlZXJDb25uZWN0aW9uKGNvbmZpZywgY29uc3RyYWludHMpO1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBtYnVzID0gcmVxdWlyZSgnbWJ1cycpO1xuXG4vLyBkZWZpbmUgc29tZSBzdGF0ZSBtYXBwaW5ncyB0byBzaW1wbGlmeSB0aGUgZXZlbnRzIHdlIGdlbmVyYXRlXG52YXIgc3RhdGVNYXBwaW5ncyA9IHtcbiAgY29tcGxldGVkOiAnY29ubmVjdGVkJ1xufTtcblxuLy8gZGVmaW5lIHRoZSBldmVudHMgdGhhdCB3ZSBuZWVkIHRvIHdhdGNoIGZvciBwZWVyIGNvbm5lY3Rpb25cbi8vIHN0YXRlIGNoYW5nZXNcbnZhciBwZWVyU3RhdGVFdmVudHMgPSBbXG4gICdzaWduYWxpbmdzdGF0ZWNoYW5nZScsXG4gICdpY2Vjb25uZWN0aW9uc3RhdGVjaGFuZ2UnLFxuXTtcblxuLyoqXG4gICMjIyBydGMtdG9vbHMvbW9uaXRvclxuXG4gIGBgYFxuICBtb25pdG9yKHBjLCB0YXJnZXRJZCwgc2lnbmFsbGVyLCBwYXJlbnRCdXMpID0+IG1idXNcbiAgYGBgXG5cbiAgVGhlIG1vbml0b3IgaXMgYSB1c2VmdWwgdG9vbCBmb3IgZGV0ZXJtaW5pbmcgdGhlIHN0YXRlIG9mIGBwY2AgKGFuXG4gIGBSVENQZWVyQ29ubmVjdGlvbmApIGluc3RhbmNlIGluIHRoZSBjb250ZXh0IG9mIHlvdXIgYXBwbGljYXRpb24uIFRoZVxuICBtb25pdG9yIHVzZXMgYm90aCB0aGUgYGljZUNvbm5lY3Rpb25TdGF0ZWAgaW5mb3JtYXRpb24gb2YgdGhlIHBlZXJcbiAgY29ubmVjdGlvbiBhbmQgYWxzbyB0aGUgdmFyaW91c1xuICBbc2lnbmFsbGVyIGV2ZW50c10oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtc2lnbmFsbGVyI3NpZ25hbGxlci1ldmVudHMpXG4gIHRvIGRldGVybWluZSB3aGVuIHRoZSBjb25uZWN0aW9uIGhhcyBiZWVuIGBjb25uZWN0ZWRgIGFuZCB3aGVuIGl0IGhhc1xuICBiZWVuIGBkaXNjb25uZWN0ZWRgLlxuXG4gIEEgbW9uaXRvciBjcmVhdGVkIGBtYnVzYCBpcyByZXR1cm5lZCBhcyB0aGUgcmVzdWx0IG9mIGFcbiAgW2NvdXBsZV0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMjcnRjY291cGxlKSBiZXR3ZWVuIGEgbG9jYWwgcGVlclxuICBjb25uZWN0aW9uIGFuZCBpdCdzIHJlbW90ZSBjb3VudGVycGFydC5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHBjLCB0YXJnZXRJZCwgc2lnbmFsbGVyLCBwYXJlbnRCdXMpIHtcbiAgdmFyIG1vbml0b3IgPSBtYnVzKCcnLCBwYXJlbnRCdXMpO1xuICB2YXIgc3RhdGU7XG5cbiAgZnVuY3Rpb24gY2hlY2tTdGF0ZSgpIHtcbiAgICB2YXIgbmV3U3RhdGUgPSBnZXRNYXBwZWRTdGF0ZShwYy5pY2VDb25uZWN0aW9uU3RhdGUpO1xuXG4gICAgLy8gZmxhZyB0aGUgd2UgaGFkIGEgc3RhdGUgY2hhbmdlXG4gICAgbW9uaXRvcignc3RhdGVjaGFuZ2UnLCBwYywgbmV3U3RhdGUpO1xuXG4gICAgLy8gaWYgdGhlIGFjdGl2ZSBzdGF0ZSBoYXMgY2hhbmdlZCwgdGhlbiBzZW5kIHRoZSBhcHBvcHJpYXRlIG1lc3NhZ2VcbiAgICBpZiAoc3RhdGUgIT09IG5ld1N0YXRlKSB7XG4gICAgICBtb25pdG9yKG5ld1N0YXRlKTtcbiAgICAgIHN0YXRlID0gbmV3U3RhdGU7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlQ2xvc2UoKSB7XG4gICAgbW9uaXRvcignY2xvc2VkJyk7XG4gIH1cblxuICBwYy5vbmNsb3NlID0gaGFuZGxlQ2xvc2U7XG4gIHBlZXJTdGF0ZUV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2dE5hbWUpIHtcbiAgICBwY1snb24nICsgZXZ0TmFtZV0gPSBjaGVja1N0YXRlO1xuICB9KTtcblxuICBtb25pdG9yLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICBwYy5vbmNsb3NlID0gbnVsbDtcbiAgICBwZWVyU3RhdGVFdmVudHMuZm9yRWFjaChmdW5jdGlvbihldnROYW1lKSB7XG4gICAgICBwY1snb24nICsgZXZ0TmFtZV0gPSBudWxsO1xuICAgIH0pO1xuICB9O1xuXG4gIG1vbml0b3IuY2hlY2tTdGF0ZSA9IGNoZWNrU3RhdGU7XG5cbiAgLy8gaWYgd2UgaGF2ZW4ndCBiZWVuIHByb3ZpZGVkIGEgdmFsaWQgcGVlciBjb25uZWN0aW9uLCBhYm9ydFxuICBpZiAoISBwYykge1xuICAgIHJldHVybiBtb25pdG9yO1xuICB9XG5cbiAgLy8gZGV0ZXJtaW5lIHRoZSBpbml0aWFsIGlzIGFjdGl2ZSBzdGF0ZVxuICBzdGF0ZSA9IGdldE1hcHBlZFN0YXRlKHBjLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG5cbiAgcmV0dXJuIG1vbml0b3I7XG59O1xuXG4vKiBpbnRlcm5hbCBoZWxwZXJzICovXG5cbmZ1bmN0aW9uIGdldE1hcHBlZFN0YXRlKHN0YXRlKSB7XG4gIHJldHVybiBzdGF0ZU1hcHBpbmdzW3N0YXRlXSB8fCBzdGF0ZTtcbn1cbiIsInZhciBkZXRlY3QgPSByZXF1aXJlKCdydGMtY29yZS9kZXRlY3QnKTtcbnZhciBmaW5kUGx1Z2luID0gcmVxdWlyZSgncnRjLWNvcmUvcGx1Z2luJyk7XG52YXIgUHJpb3JpdHlRdWV1ZSA9IHJlcXVpcmUoJ3ByaW9yaXR5cXVldWVqcycpO1xudmFyIHBsdWNrID0gcmVxdWlyZSgnd2hpc2svcGx1Y2snKTtcbnZhciBwbHVja1Nlc3Npb25EZXNjID0gcGx1Y2soJ3NkcCcsICd0eXBlJyk7XG5cbi8vIHNvbWUgdmFsaWRhdGlvbiByb3V0aW5lc1xudmFyIGNoZWNrQ2FuZGlkYXRlID0gcmVxdWlyZSgncnRjLXZhbGlkYXRvci9jYW5kaWRhdGUnKTtcblxuLy8gdGhlIHNkcCBjbGVhbmVyXG52YXIgc2RwY2xlYW4gPSByZXF1aXJlKCdydGMtc2RwY2xlYW4nKTtcbnZhciBwYXJzZVNkcCA9IHJlcXVpcmUoJ3J0Yy1zZHAnKTtcblxudmFyIFBSSU9SSVRZX0xPVyA9IDEwMDtcbnZhciBQUklPUklUWV9XQUlUID0gMTAwMDtcblxuLy8gcHJpb3JpdHkgb3JkZXIgKGxvd2VyIGlzIGJldHRlcilcbnZhciBERUZBVUxUX1BSSU9SSVRJRVMgPSBbXG4gICdjYW5kaWRhdGUnLFxuICAnc2V0TG9jYWxEZXNjcmlwdGlvbicsXG4gICdzZXRSZW1vdGVEZXNjcmlwdGlvbicsXG4gICdjcmVhdGVBbnN3ZXInLFxuICAnY3JlYXRlT2ZmZXInXG5dO1xuXG4vLyBkZWZpbmUgZXZlbnQgbWFwcGluZ3NcbnZhciBNRVRIT0RfRVZFTlRTID0ge1xuICBzZXRMb2NhbERlc2NyaXB0aW9uOiAnc2V0bG9jYWxkZXNjJyxcbiAgc2V0UmVtb3RlRGVzY3JpcHRpb246ICdzZXRyZW1vdGVkZXNjJyxcbiAgY3JlYXRlT2ZmZXI6ICdvZmZlcicsXG4gIGNyZWF0ZUFuc3dlcjogJ2Fuc3dlcidcbn07XG5cbnZhciBNRURJQV9NQVBQSU5HUyA9IHtcbiAgZGF0YTogJ2FwcGxpY2F0aW9uJ1xufTtcblxuLy8gZGVmaW5lIHN0YXRlcyBpbiB3aGljaCB3ZSB3aWxsIGF0dGVtcHQgdG8gZmluYWxpemUgYSBjb25uZWN0aW9uIG9uIHJlY2VpdmluZyBhIHJlbW90ZSBvZmZlclxudmFyIFZBTElEX1JFU1BPTlNFX1NUQVRFUyA9IFsnaGF2ZS1yZW1vdGUtb2ZmZXInLCAnaGF2ZS1sb2NhbC1wcmFuc3dlciddO1xuXG4vKipcbiAgIyBydGMtdGFza3F1ZXVlXG5cbiAgVGhpcyBpcyBhIHBhY2thZ2UgdGhhdCBhc3Npc3RzIHdpdGggYXBwbHlpbmcgYWN0aW9ucyB0byBhbiBgUlRDUGVlckNvbm5lY3Rpb25gXG4gIGluIGFzIHJlbGlhYmxlIG9yZGVyIGFzIHBvc3NpYmxlLiBJdCBpcyBwcmltYXJpbHkgdXNlZCBieSB0aGUgY291cGxpbmcgbG9naWNcbiAgb2YgdGhlIFtgcnRjLXRvb2xzYF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtdG9vbHMpLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICBGb3IgdGhlIG1vbWVudCwgcmVmZXIgdG8gdGhlIHNpbXBsZSBjb3VwbGluZyB0ZXN0IGFzIGFuIGV4YW1wbGUgb2YgaG93IHRvIHVzZVxuICB0aGlzIHBhY2thZ2UgKHNlZSBiZWxvdyk6XG5cbiAgPDw8IHRlc3QvY291cGxlLmpzXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwYywgb3B0cykge1xuICAvLyBjcmVhdGUgdGhlIHRhc2sgcXVldWVcbiAgdmFyIHF1ZXVlID0gbmV3IFByaW9yaXR5UXVldWUob3JkZXJUYXNrcyk7XG4gIHZhciB0cSA9IHJlcXVpcmUoJ21idXMnKSgnJywgKG9wdHMgfHwge30pLmxvZ2dlcik7XG5cbiAgLy8gaW5pdGlhbGlzZSB0YXNrIGltcG9ydGFuY2VcbiAgdmFyIHByaW9yaXRpZXMgPSAob3B0cyB8fCB7fSkucHJpb3JpdGllcyB8fCBERUZBVUxUX1BSSU9SSVRJRVM7XG5cbiAgLy8gY2hlY2sgZm9yIHBsdWdpbiB1c2FnZVxuICB2YXIgcGx1Z2luID0gZmluZFBsdWdpbigob3B0cyB8fCB7fSkucGx1Z2lucyk7XG5cbiAgLy8gaW5pdGlhbGlzZSBzdGF0ZSB0cmFja2luZ1xuICB2YXIgY2hlY2tRdWV1ZVRpbWVyID0gMDtcbiAgdmFyIGN1cnJlbnRUYXNrO1xuICB2YXIgZGVmYXVsdEZhaWwgPSB0cS5iaW5kKHRxLCAnZmFpbCcpO1xuXG4gIC8vIGxvb2sgZm9yIGFuIHNkcGZpbHRlciBmdW5jdGlvbiAoYWxsb3cgc2xpZ2h0IG1pcy1zcGVsbGluZ3MpXG4gIHZhciBzZHBGaWx0ZXIgPSAob3B0cyB8fCB7fSkuc2RwZmlsdGVyIHx8IChvcHRzIHx8IHt9KS5zZHBGaWx0ZXI7XG5cbiAgLy8gaW5pdGlhbGlzZSBzZXNzaW9uIGRlc2NyaXB0aW9uIGFuZCBpY2VjYW5kaWRhdGUgb2JqZWN0c1xuICB2YXIgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uID0gKG9wdHMgfHwge30pLlJUQ1Nlc3Npb25EZXNjcmlwdGlvbiB8fFxuICAgIGRldGVjdCgnUlRDU2Vzc2lvbkRlc2NyaXB0aW9uJyk7XG5cbiAgdmFyIFJUQ0ljZUNhbmRpZGF0ZSA9IChvcHRzIHx8IHt9KS5SVENJY2VDYW5kaWRhdGUgfHxcbiAgICBkZXRlY3QoJ1JUQ0ljZUNhbmRpZGF0ZScpO1xuXG4gIGZ1bmN0aW9uIGFib3J0UXVldWUoZXJyKSB7XG4gICAgY29uc29sZS5lcnJvcihlcnIpO1xuICB9XG5cbiAgZnVuY3Rpb24gYXBwbHlDYW5kaWRhdGUodGFzaywgbmV4dCkge1xuICAgIHZhciBkYXRhID0gdGFzay5hcmdzWzBdO1xuICAgIHZhciBjYW5kaWRhdGUgPSBkYXRhICYmIGRhdGEuY2FuZGlkYXRlICYmIGNyZWF0ZUljZUNhbmRpZGF0ZShkYXRhKTtcblxuICAgIGZ1bmN0aW9uIGhhbmRsZU9rKCkge1xuICAgICAgdHEoJ2ljZS5yZW1vdGUuYXBwbGllZCcsIGNhbmRpZGF0ZSk7XG4gICAgICBuZXh0KCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaGFuZGxlRmFpbChlcnIpIHtcbiAgICAgIHRxKCdpY2UucmVtb3RlLmludmFsaWQnLCBjYW5kaWRhdGUpO1xuICAgICAgbmV4dChlcnIpO1xuICAgIH1cblxuICAgIC8vIHdlIGhhdmUgYSBudWxsIGNhbmRpZGF0ZSwgd2UgaGF2ZSBmaW5pc2hlZCBnYXRoZXJpbmcgY2FuZGlkYXRlc1xuICAgIGlmICghIGNhbmRpZGF0ZSkge1xuICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICB9XG5cbiAgICBwYy5hZGRJY2VDYW5kaWRhdGUoY2FuZGlkYXRlLCBoYW5kbGVPaywgaGFuZGxlRmFpbCk7XG4gIH1cblxuICBmdW5jdGlvbiBjaGVja1F1ZXVlKCkge1xuICAgIC8vIHBlZWsgYXQgdGhlIG5leHQgaXRlbSBvbiB0aGUgcXVldWVcbiAgICB2YXIgbmV4dCA9ICghIHF1ZXVlLmlzRW1wdHkoKSkgJiYgKCEgY3VycmVudFRhc2spICYmIHF1ZXVlLnBlZWsoKTtcbiAgICB2YXIgcmVhZHkgPSBuZXh0ICYmIHRlc3RSZWFkeShuZXh0KTtcbiAgICB2YXIgcmV0cnkgPSAoISBxdWV1ZS5pc0VtcHR5KCkpICYmIGlzTm90Q2xvc2VkKHBjKTtcblxuICAgIC8vIHJlc2V0IHRoZSBxdWV1ZSB0aW1lclxuICAgIGNoZWNrUXVldWVUaW1lciA9IDA7XG5cbiAgICAvLyBpZiB3ZSBkb24ndCBoYXZlIGEgdGFzayByZWFkeSwgdGhlbiBhYm9ydFxuICAgIGlmICghIHJlYWR5KSB7XG4gICAgICByZXR1cm4gcmV0cnkgJiYgdHJpZ2dlclF1ZXVlQ2hlY2soKTtcbiAgICB9XG5cbiAgICAvLyB1cGRhdGUgdGhlIGN1cnJlbnQgdGFzayAoZGVxdWV1ZSlcbiAgICBjdXJyZW50VGFzayA9IHF1ZXVlLmRlcSgpO1xuXG4gICAgLy8gcHJvY2VzcyB0aGUgdGFza1xuICAgIGN1cnJlbnRUYXNrLmZuKGN1cnJlbnRUYXNrLCBmdW5jdGlvbihlcnIpIHtcbiAgICAgIHZhciBmYWlsID0gY3VycmVudFRhc2suZmFpbCB8fCBkZWZhdWx0RmFpbDtcbiAgICAgIHZhciBwYXNzID0gY3VycmVudFRhc2sucGFzcztcbiAgICAgIHZhciB0YXNrTmFtZSA9IGN1cnJlbnRUYXNrLm5hbWU7XG5cbiAgICAgIC8vIGlmIGVycm9yZWQsIGZhaWxcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcih0YXNrTmFtZSArICcgdGFzayBmYWlsZWQ6ICcsIGVycik7XG4gICAgICAgIHJldHVybiBmYWlsKGVycik7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgcGFzcyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHBhc3MuYXBwbHkoY3VycmVudFRhc2ssIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgICB9XG5cbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGN1cnJlbnRUYXNrID0gbnVsbDtcbiAgICAgICAgdHJpZ2dlclF1ZXVlQ2hlY2soKTtcbiAgICAgIH0sIDApO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY2xlYW5zZHAoZGVzYykge1xuICAgIC8vIGVuc3VyZSB3ZSBoYXZlIGNsZWFuIHNkcFxuICAgIHZhciBzZHBFcnJvcnMgPSBbXTtcbiAgICB2YXIgc2RwID0gZGVzYyAmJiBzZHBjbGVhbihkZXNjLnNkcCwgeyBjb2xsZWN0b3I6IHNkcEVycm9ycyB9KTtcblxuICAgIC8vIGlmIHdlIGRvbid0IGhhdmUgYSBtYXRjaCwgbG9nIHNvbWUgaW5mb1xuICAgIGlmIChkZXNjICYmIHNkcCAhPT0gZGVzYy5zZHApIHtcbiAgICAgIGNvbnNvbGUuaW5mbygnaW52YWxpZCBsaW5lcyByZW1vdmVkIGZyb20gc2RwOiAnLCBzZHBFcnJvcnMpO1xuICAgICAgZGVzYy5zZHAgPSBzZHA7XG4gICAgfVxuXG4gICAgLy8gaWYgYSBmaWx0ZXIgaGFzIGJlZW4gc3BlY2lmaWVkLCB0aGVuIGFwcGx5IHRoZSBmaWx0ZXJcbiAgICBpZiAodHlwZW9mIHNkcEZpbHRlciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBkZXNjLnNkcCA9IHNkcEZpbHRlcihkZXNjLnNkcCwgcGMpO1xuICAgIH1cblxuICAgIHJldHVybiBkZXNjO1xuICB9XG5cbiAgZnVuY3Rpb24gY29tcGxldGVDb25uZWN0aW9uKCkge1xuICAgIGlmIChWQUxJRF9SRVNQT05TRV9TVEFURVMuaW5kZXhPZihwYy5zaWduYWxpbmdTdGF0ZSkgPj0gMCkge1xuICAgICAgcmV0dXJuIHRxLmNyZWF0ZUFuc3dlcigpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUljZUNhbmRpZGF0ZShkYXRhKSB7XG4gICAgaWYgKHBsdWdpbiAmJiB0eXBlb2YgcGx1Z2luLmNyZWF0ZUljZUNhbmRpZGF0ZSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gcGx1Z2luLmNyZWF0ZUljZUNhbmRpZGF0ZShkYXRhKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJUQ0ljZUNhbmRpZGF0ZShkYXRhKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVNlc3Npb25EZXNjcmlwdGlvbihkYXRhKSB7XG4gICAgaWYgKHBsdWdpbiAmJiB0eXBlb2YgcGx1Z2luLmNyZWF0ZVNlc3Npb25EZXNjcmlwdGlvbiA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gcGx1Z2luLmNyZWF0ZVNlc3Npb25EZXNjcmlwdGlvbihkYXRhKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbihkYXRhKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGVtaXRTZHAoKSB7XG4gICAgdHEoJ3NkcC5sb2NhbCcsIHBsdWNrU2Vzc2lvbkRlc2ModGhpcy5hcmdzWzBdKSk7XG4gIH1cblxuICBmdW5jdGlvbiBlbnF1ZXVlKG5hbWUsIGhhbmRsZXIsIG9wdHMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblxuICAgICAgaWYgKG9wdHMgJiYgdHlwZW9mIG9wdHMucHJvY2Vzc0FyZ3MgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBhcmdzID0gYXJncy5tYXAob3B0cy5wcm9jZXNzQXJncyk7XG4gICAgICB9XG5cbiAgICAgIHF1ZXVlLmVucSh7XG4gICAgICAgIGFyZ3M6IGFyZ3MsXG4gICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgIGZuOiBoYW5kbGVyLFxuXG4gICAgICAgIC8vIGluaXRpbGFpc2UgYW55IGNoZWNrcyB0aGF0IG5lZWQgdG8gYmUgZG9uZSBwcmlvclxuICAgICAgICAvLyB0byB0aGUgdGFzayBleGVjdXRpbmdcbiAgICAgICAgY2hlY2tzOiBbIGlzTm90Q2xvc2VkIF0uY29uY2F0KChvcHRzIHx8IHt9KS5jaGVja3MgfHwgW10pLFxuXG4gICAgICAgIC8vIGluaXRpYWxpc2UgdGhlIHBhc3MgYW5kIGZhaWwgaGFuZGxlcnNcbiAgICAgICAgcGFzczogKG9wdHMgfHwge30pLnBhc3MsXG4gICAgICAgIGZhaWw6IChvcHRzIHx8IHt9KS5mYWlsXG4gICAgICB9KTtcblxuICAgICAgdHJpZ2dlclF1ZXVlQ2hlY2soKTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gZXhlY01ldGhvZCh0YXNrLCBuZXh0KSB7XG4gICAgdmFyIGZuID0gcGNbdGFzay5uYW1lXTtcbiAgICB2YXIgZXZlbnROYW1lID0gTUVUSE9EX0VWRU5UU1t0YXNrLm5hbWVdIHx8ICh0YXNrLm5hbWUgfHwgJycpLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFyIGNiQXJncyA9IFsgc3VjY2VzcywgZmFpbCBdO1xuICAgIHZhciBpc09mZmVyID0gdGFzay5uYW1lID09PSAnY3JlYXRlT2ZmZXInO1xuXG4gICAgZnVuY3Rpb24gZmFpbChlcnIpIHtcbiAgICAgIHRxLmFwcGx5KHRxLCBbICduZWdvdGlhdGUuZXJyb3InLCB0YXNrLm5hbWUsIGVyciBdLmNvbmNhdCh0YXNrLmFyZ3MpKTtcbiAgICAgIG5leHQoZXJyKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzdWNjZXNzKCkge1xuICAgICAgdHEuYXBwbHkodHEsIFsgWyduZWdvdGlhdGUnLCBldmVudE5hbWUsICdvayddLCB0YXNrLm5hbWUgXS5jb25jYXQodGFzay5hcmdzKSk7XG4gICAgICBuZXh0LmFwcGx5KG51bGwsIFtudWxsXS5jb25jYXQoW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgfVxuXG4gICAgaWYgKCEgZm4pIHtcbiAgICAgIHJldHVybiBuZXh0KG5ldyBFcnJvcignY2Fubm90IGNhbGwgXCInICsgdGFzay5uYW1lICsgJ1wiIG9uIFJUQ1BlZXJDb25uZWN0aW9uJykpO1xuICAgIH1cblxuICAgIC8vIGludm9rZSB0aGUgZnVuY3Rpb25cbiAgICB0cS5hcHBseSh0cSwgWyduZWdvdGlhdGUuJyArIGV2ZW50TmFtZV0uY29uY2F0KHRhc2suYXJncykpO1xuICAgIGZuLmFwcGx5KFxuICAgICAgcGMsXG4gICAgICB0YXNrLmFyZ3MuY29uY2F0KGNiQXJncykuY29uY2F0KGlzT2ZmZXIgPyBnZW5lcmF0ZUNvbnN0cmFpbnRzKCkgOiBbXSlcbiAgICApO1xuICB9XG5cbiAgZnVuY3Rpb24gZXh0cmFjdENhbmRpZGF0ZUV2ZW50RGF0YShkYXRhKSB7XG4gICAgLy8gZXh0cmFjdCBuZXN0ZWQgY2FuZGlkYXRlIGRhdGEgKGxpa2Ugd2Ugd2lsbCBzZWUgaW4gYW4gZXZlbnQgYmVpbmcgcGFzc2VkIHRvIHRoaXMgZnVuY3Rpb24pXG4gICAgd2hpbGUgKGRhdGEgJiYgZGF0YS5jYW5kaWRhdGUgJiYgZGF0YS5jYW5kaWRhdGUuY2FuZGlkYXRlKSB7XG4gICAgICBkYXRhID0gZGF0YS5jYW5kaWRhdGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRhdGE7XG4gIH1cblxuICBmdW5jdGlvbiBnZW5lcmF0ZUNvbnN0cmFpbnRzKCkge1xuICAgIHZhciBhbGxvd2VkS2V5cyA9IHtcbiAgICAgIG9mZmVydG9yZWNlaXZldmlkZW86ICdPZmZlclRvUmVjZWl2ZVZpZGVvJyxcbiAgICAgIG9mZmVydG9yZWNlaXZlYXVkaW86ICdPZmZlclRvUmVjZWl2ZUF1ZGlvJyxcbiAgICAgIGljZXJlc3RhcnQ6ICdJY2VSZXN0YXJ0JyxcbiAgICAgIHZvaWNlYWN0aXZpdHlkZXRlY3Rpb246ICdWb2ljZUFjdGl2aXR5RGV0ZWN0aW9uJ1xuICAgIH07XG5cbiAgICB2YXIgY29uc3RyYWludHMgPSB7XG4gICAgICBPZmZlclRvUmVjZWl2ZVZpZGVvOiB0cnVlLFxuICAgICAgT2ZmZXJUb1JlY2VpdmVBdWRpbzogdHJ1ZVxuICAgIH07XG5cbiAgICAvLyB1cGRhdGUga25vd24ga2V5cyB0byBtYXRjaFxuICAgIE9iamVjdC5rZXlzKG9wdHMgfHwge30pLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICBpZiAoYWxsb3dlZEtleXNba2V5LnRvTG93ZXJDYXNlKCldKSB7XG4gICAgICAgIGNvbnN0cmFpbnRzW2FsbG93ZWRLZXlzW2tleS50b0xvd2VyQ2FzZSgpXV0gPSBvcHRzW2tleV07XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4geyBtYW5kYXRvcnk6IGNvbnN0cmFpbnRzIH07XG4gIH1cblxuICBmdW5jdGlvbiBoYXNMb2NhbE9yUmVtb3RlRGVzYyhwYywgdGFzaykge1xuICAgIHJldHVybiBwYy5fX2hhc0Rlc2MgfHwgKHBjLl9faGFzRGVzYyA9ICEhcGMucmVtb3RlRGVzY3JpcHRpb24pO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNOb3ROZWdvdGlhdGluZyhwYykge1xuICAgIHJldHVybiBwYy5zaWduYWxpbmdTdGF0ZSAhPT0gJ2hhdmUtbG9jYWwtb2ZmZXInO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNOb3RDbG9zZWQocGMpIHtcbiAgICByZXR1cm4gcGMuc2lnbmFsaW5nU3RhdGUgIT09ICdjbG9zZWQnO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNTdGFibGUocGMpIHtcbiAgICByZXR1cm4gcGMuc2lnbmFsaW5nU3RhdGUgPT09ICdzdGFibGUnO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNWYWxpZENhbmRpZGF0ZShwYywgZGF0YSkge1xuICAgIHJldHVybiBkYXRhLl9fdmFsaWQgfHxcbiAgICAgIChkYXRhLl9fdmFsaWQgPSBjaGVja0NhbmRpZGF0ZShkYXRhLmFyZ3NbMF0pLmxlbmd0aCA9PT0gMCk7XG4gIH1cblxuICBmdW5jdGlvbiBpc0Nvbm5SZWFkeUZvckNhbmRpZGF0ZShwYywgZGF0YSkge1xuICAgIHZhciBzZHAgPSBwYXJzZVNkcChwYy5yZW1vdGVEZXNjcmlwdGlvbiAmJiBwYy5yZW1vdGVEZXNjcmlwdGlvbi5zZHApO1xuICAgIHZhciBtZWRpYVR5cGVzID0gc2RwLmdldE1lZGlhVHlwZXMoKTtcbiAgICB2YXIgc2RwTWlkID0gZGF0YS5hcmdzWzBdICYmIGRhdGEuYXJnc1swXS5zZHBNaWQ7XG5cbiAgICAvLyByZW1hcCBtZWRpYSB0eXBlcyBhcyBhcHByb3ByaWF0ZVxuICAgIHNkcE1pZCA9IE1FRElBX01BUFBJTkdTW3NkcE1pZF0gfHwgc2RwTWlkO1xuXG4gICAgLy8gdGhlIGNhbmRpZGF0ZSBpcyB2YWxpZCBpZiB3ZSBrbm93IGFib3V0IHRoZSBtZWRpYSB0eXBlXG4gICAgcmV0dXJuIChzZHBNaWQgPT09ICcnKSB8fCBtZWRpYVR5cGVzLmluZGV4T2Yoc2RwTWlkKSA+PSAwO1xuICB9XG5cbiAgZnVuY3Rpb24gb3JkZXJUYXNrcyhhLCBiKSB7XG4gICAgLy8gYXBwbHkgZWFjaCBvZiB0aGUgY2hlY2tzIGZvciBlYWNoIHRhc2tcbiAgICB2YXIgdGFza3MgPSBbYSxiXTtcbiAgICB2YXIgcmVhZGluZXNzID0gdGFza3MubWFwKHRlc3RSZWFkeSk7XG4gICAgdmFyIHRhc2tQcmlvcml0aWVzID0gdGFza3MubWFwKGZ1bmN0aW9uKHRhc2ssIGlkeCkge1xuICAgICAgdmFyIHJlYWR5ID0gcmVhZGluZXNzW2lkeF07XG4gICAgICB2YXIgcHJpb3JpdHkgPSByZWFkeSAmJiBwcmlvcml0aWVzLmluZGV4T2YodGFzay5uYW1lKTtcblxuICAgICAgcmV0dXJuIHJlYWR5ID8gKHByaW9yaXR5ID49IDAgPyBwcmlvcml0eSA6IFBSSU9SSVRZX0xPVykgOiBQUklPUklUWV9XQUlUO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRhc2tQcmlvcml0aWVzWzFdIC0gdGFza1ByaW9yaXRpZXNbMF07XG4gIH1cblxuICAvLyBjaGVjayB3aGV0aGVyIGEgdGFzayBpcyByZWFkeSAoZG9lcyBpdCBwYXNzIGFsbCB0aGUgY2hlY2tzKVxuICBmdW5jdGlvbiB0ZXN0UmVhZHkodGFzaykge1xuICAgIHJldHVybiAodGFzay5jaGVja3MgfHwgW10pLnJlZHVjZShmdW5jdGlvbihtZW1vLCBjaGVjaykge1xuICAgICAgcmV0dXJuIG1lbW8gJiYgY2hlY2socGMsIHRhc2spO1xuICAgIH0sIHRydWUpO1xuICB9XG5cbiAgZnVuY3Rpb24gdHJpZ2dlclF1ZXVlQ2hlY2soKSB7XG4gICAgaWYgKGNoZWNrUXVldWVUaW1lcikgcmV0dXJuO1xuICAgIGNoZWNrUXVldWVUaW1lciA9IHNldFRpbWVvdXQoY2hlY2tRdWV1ZSwgNTApO1xuICB9XG5cbiAgLy8gcGF0Y2ggaW4gdGhlIHF1ZXVlIGhlbHBlciBtZXRob2RzXG4gIHRxLmFkZEljZUNhbmRpZGF0ZSA9IGVucXVldWUoJ2FkZEljZUNhbmRpZGF0ZScsIGFwcGx5Q2FuZGlkYXRlLCB7XG4gICAgcHJvY2Vzc0FyZ3M6IGV4dHJhY3RDYW5kaWRhdGVFdmVudERhdGEsXG4gICAgY2hlY2tzOiBbaGFzTG9jYWxPclJlbW90ZURlc2MsIGlzVmFsaWRDYW5kaWRhdGUsIGlzQ29ublJlYWR5Rm9yQ2FuZGlkYXRlIF1cbiAgfSk7XG5cbiAgdHEuc2V0TG9jYWxEZXNjcmlwdGlvbiA9IGVucXVldWUoJ3NldExvY2FsRGVzY3JpcHRpb24nLCBleGVjTWV0aG9kLCB7XG4gICAgcHJvY2Vzc0FyZ3M6IGNsZWFuc2RwLFxuICAgIHBhc3M6IGVtaXRTZHBcbiAgfSk7XG5cbiAgdHEuc2V0UmVtb3RlRGVzY3JpcHRpb24gPSBlbnF1ZXVlKCdzZXRSZW1vdGVEZXNjcmlwdGlvbicsIGV4ZWNNZXRob2QsIHtcbiAgICBwcm9jZXNzQXJnczogY3JlYXRlU2Vzc2lvbkRlc2NyaXB0aW9uLFxuICAgIHBhc3M6IGNvbXBsZXRlQ29ubmVjdGlvblxuICB9KTtcblxuICB0cS5jcmVhdGVPZmZlciA9IGVucXVldWUoJ2NyZWF0ZU9mZmVyJywgZXhlY01ldGhvZCwge1xuICAgIGNoZWNrczogWyBpc05vdE5lZ290aWF0aW5nIF0sXG4gICAgcGFzczogdHEuc2V0TG9jYWxEZXNjcmlwdGlvblxuICB9KTtcblxuICB0cS5jcmVhdGVBbnN3ZXIgPSBlbnF1ZXVlKCdjcmVhdGVBbnN3ZXInLCBleGVjTWV0aG9kLCB7XG4gICAgcGFzczogdHEuc2V0TG9jYWxEZXNjcmlwdGlvblxuICB9KTtcblxuICByZXR1cm4gdHE7XG59O1xuIiwiLyoqXG4gKiBFeHBvc2UgYFByaW9yaXR5UXVldWVgLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IFByaW9yaXR5UXVldWU7XG5cbi8qKlxuICogSW5pdGlhbGl6ZXMgYSBuZXcgZW1wdHkgYFByaW9yaXR5UXVldWVgIHdpdGggdGhlIGdpdmVuIGBjb21wYXJhdG9yKGEsIGIpYFxuICogZnVuY3Rpb24sIHVzZXMgYC5ERUZBVUxUX0NPTVBBUkFUT1IoKWAgd2hlbiBubyBmdW5jdGlvbiBpcyBwcm92aWRlZC5cbiAqXG4gKiBUaGUgY29tcGFyYXRvciBmdW5jdGlvbiBtdXN0IHJldHVybiBhIHBvc2l0aXZlIG51bWJlciB3aGVuIGBhID4gYmAsIDAgd2hlblxuICogYGEgPT0gYmAgYW5kIGEgbmVnYXRpdmUgbnVtYmVyIHdoZW4gYGEgPCBiYC5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufVxuICogQHJldHVybiB7UHJpb3JpdHlRdWV1ZX1cbiAqIEBhcGkgcHVibGljXG4gKi9cbmZ1bmN0aW9uIFByaW9yaXR5UXVldWUoY29tcGFyYXRvcikge1xuICB0aGlzLl9jb21wYXJhdG9yID0gY29tcGFyYXRvciB8fCBQcmlvcml0eVF1ZXVlLkRFRkFVTFRfQ09NUEFSQVRPUjtcbiAgdGhpcy5fZWxlbWVudHMgPSBbXTtcbn1cblxuLyoqXG4gKiBDb21wYXJlcyBgYWAgYW5kIGBiYCwgd2hlbiBgYSA+IGJgIGl0IHJldHVybnMgYSBwb3NpdGl2ZSBudW1iZXIsIHdoZW5cbiAqIGl0IHJldHVybnMgMCBhbmQgd2hlbiBgYSA8IGJgIGl0IHJldHVybnMgYSBuZWdhdGl2ZSBudW1iZXIuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSBhXG4gKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ9IGJcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblByaW9yaXR5UXVldWUuREVGQVVMVF9DT01QQVJBVE9SID0gZnVuY3Rpb24oYSwgYikge1xuICBpZiAodHlwZW9mIGEgPT09ICdudW1iZXInICYmIHR5cGVvZiBiID09PSAnbnVtYmVyJykge1xuICAgIHJldHVybiBhIC0gYjtcbiAgfSBlbHNlIHtcbiAgICBhID0gYS50b1N0cmluZygpO1xuICAgIGIgPSBiLnRvU3RyaW5nKCk7XG5cbiAgICBpZiAoYSA9PSBiKSByZXR1cm4gMDtcblxuICAgIHJldHVybiAoYSA+IGIpID8gMSA6IC0xO1xuICB9XG59O1xuXG4vKipcbiAqIFJldHVybnMgd2hldGhlciB0aGUgcHJpb3JpdHkgcXVldWUgaXMgZW1wdHkgb3Igbm90LlxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5pc0VtcHR5ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnNpemUoKSA9PT0gMDtcbn07XG5cbi8qKlxuICogUGVla3MgYXQgdGhlIHRvcCBlbGVtZW50IG9mIHRoZSBwcmlvcml0eSBxdWV1ZS5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAdGhyb3dzIHtFcnJvcn0gd2hlbiB0aGUgcXVldWUgaXMgZW1wdHkuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5wZWVrID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmlzRW1wdHkoKSkgdGhyb3cgbmV3IEVycm9yKCdQcmlvcml0eVF1ZXVlIGlzIGVtcHR5Jyk7XG5cbiAgcmV0dXJuIHRoaXMuX2VsZW1lbnRzWzBdO1xufTtcblxuLyoqXG4gKiBEZXF1ZXVlcyB0aGUgdG9wIGVsZW1lbnQgb2YgdGhlIHByaW9yaXR5IHF1ZXVlLlxuICpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEB0aHJvd3Mge0Vycm9yfSB3aGVuIHRoZSBxdWV1ZSBpcyBlbXB0eS5cbiAqIEBhcGkgcHVibGljXG4gKi9cblByaW9yaXR5UXVldWUucHJvdG90eXBlLmRlcSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZmlyc3QgPSB0aGlzLnBlZWsoKTtcbiAgdmFyIGxhc3QgPSB0aGlzLl9lbGVtZW50cy5wb3AoKTtcbiAgdmFyIHNpemUgPSB0aGlzLnNpemUoKTtcblxuICBpZiAoc2l6ZSA9PT0gMCkgcmV0dXJuIGZpcnN0O1xuXG4gIHRoaXMuX2VsZW1lbnRzWzBdID0gbGFzdDtcbiAgdmFyIGN1cnJlbnQgPSAwO1xuXG4gIHdoaWxlIChjdXJyZW50IDwgc2l6ZSkge1xuICAgIHZhciBsYXJnZXN0ID0gY3VycmVudDtcbiAgICB2YXIgbGVmdCA9ICgyICogY3VycmVudCkgKyAxO1xuICAgIHZhciByaWdodCA9ICgyICogY3VycmVudCkgKyAyO1xuXG4gICAgaWYgKGxlZnQgPCBzaXplICYmIHRoaXMuX2NvbXBhcmUobGVmdCwgbGFyZ2VzdCkgPj0gMCkge1xuICAgICAgbGFyZ2VzdCA9IGxlZnQ7XG4gICAgfVxuXG4gICAgaWYgKHJpZ2h0IDwgc2l6ZSAmJiB0aGlzLl9jb21wYXJlKHJpZ2h0LCBsYXJnZXN0KSA+PSAwKSB7XG4gICAgICBsYXJnZXN0ID0gcmlnaHQ7XG4gICAgfVxuXG4gICAgaWYgKGxhcmdlc3QgPT09IGN1cnJlbnQpIGJyZWFrO1xuXG4gICAgdGhpcy5fc3dhcChsYXJnZXN0LCBjdXJyZW50KTtcbiAgICBjdXJyZW50ID0gbGFyZ2VzdDtcbiAgfVxuXG4gIHJldHVybiBmaXJzdDtcbn07XG5cbi8qKlxuICogRW5xdWV1ZXMgdGhlIGBlbGVtZW50YCBhdCB0aGUgcHJpb3JpdHkgcXVldWUgYW5kIHJldHVybnMgaXRzIG5ldyBzaXplLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50XG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5lbnEgPSBmdW5jdGlvbihlbGVtZW50KSB7XG4gIHZhciBzaXplID0gdGhpcy5fZWxlbWVudHMucHVzaChlbGVtZW50KTtcbiAgdmFyIGN1cnJlbnQgPSBzaXplIC0gMTtcblxuICB3aGlsZSAoY3VycmVudCA+IDApIHtcbiAgICB2YXIgcGFyZW50ID0gTWF0aC5mbG9vcigoY3VycmVudCAtIDEpIC8gMik7XG5cbiAgICBpZiAodGhpcy5fY29tcGFyZShjdXJyZW50LCBwYXJlbnQpIDw9IDApIGJyZWFrO1xuXG4gICAgdGhpcy5fc3dhcChwYXJlbnQsIGN1cnJlbnQpO1xuICAgIGN1cnJlbnQgPSBwYXJlbnQ7XG4gIH1cblxuICByZXR1cm4gc2l6ZTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgc2l6ZSBvZiB0aGUgcHJpb3JpdHkgcXVldWUuXG4gKlxuICogQHJldHVybiB7TnVtYmVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuUHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUuc2l6ZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5fZWxlbWVudHMubGVuZ3RoO1xufTtcblxuLyoqXG4gKiAgSXRlcmF0ZXMgb3ZlciBxdWV1ZSBlbGVtZW50c1xuICpcbiAqICBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICovXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24oZm4pIHtcbiAgcmV0dXJuIHRoaXMuX2VsZW1lbnRzLmZvckVhY2goZm4pO1xufTtcblxuLyoqXG4gKiBDb21wYXJlcyB0aGUgdmFsdWVzIGF0IHBvc2l0aW9uIGBhYCBhbmQgYGJgIGluIHRoZSBwcmlvcml0eSBxdWV1ZSB1c2luZyBpdHNcbiAqIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGFcbiAqIEBwYXJhbSB7TnVtYmVyfSBiXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuUHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUuX2NvbXBhcmUgPSBmdW5jdGlvbihhLCBiKSB7XG4gIHJldHVybiB0aGlzLl9jb21wYXJhdG9yKHRoaXMuX2VsZW1lbnRzW2FdLCB0aGlzLl9lbGVtZW50c1tiXSk7XG59O1xuXG4vKipcbiAqIFN3YXBzIHRoZSB2YWx1ZXMgYXQgcG9zaXRpb24gYGFgIGFuZCBgYmAgaW4gdGhlIHByaW9yaXR5IHF1ZXVlLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBhXG4gKiBAcGFyYW0ge051bWJlcn0gYlxuICogQGFwaSBwcml2YXRlXG4gKi9cblByaW9yaXR5UXVldWUucHJvdG90eXBlLl9zd2FwID0gZnVuY3Rpb24oYSwgYikge1xuICB2YXIgYXV4ID0gdGhpcy5fZWxlbWVudHNbYV07XG4gIHRoaXMuX2VsZW1lbnRzW2FdID0gdGhpcy5fZWxlbWVudHNbYl07XG4gIHRoaXMuX2VsZW1lbnRzW2JdID0gYXV4O1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBudWIgPSByZXF1aXJlKCd3aGlzay9udWInKTtcbnZhciBwbHVjayA9IHJlcXVpcmUoJ3doaXNrL3BsdWNrJyk7XG52YXIgZmxhdHRlbiA9IHJlcXVpcmUoJ3doaXNrL2ZsYXR0ZW4nKTtcbnZhciByZUxpbmVCcmVhayA9IC9cXHI/XFxuLztcbnZhciByZVRyYWlsaW5nTmV3bGluZXMgPSAvXFxyP1xcbiQvO1xuXG4vLyBsaXN0IHNkcCBsaW5lIHR5cGVzIHRoYXQgYXJlIG5vdCBcInNpZ25pZmljYW50XCJcbnZhciBub25IZWFkZXJMaW5lcyA9IFsgJ2EnLCAnYycsICdiJywgJ2snIF07XG52YXIgcGFyc2VycyA9IHJlcXVpcmUoJy4vcGFyc2VycycpO1xuXG4vKipcbiAgIyBydGMtc2RwXG5cbiAgVGhpcyBpcyBhIHV0aWxpdHkgbW9kdWxlIGZvciBpbnRlcHJldGluZyBhbmQgcGF0Y2hpbmcgc2RwLlxuXG4gICMjIFVzYWdlXG5cbiAgVGhlIGBydGMtc2RwYCBtYWluIG1vZHVsZSBleHBvc2VzIGEgc2luZ2xlIGZ1bmN0aW9uIHRoYXQgaXMgY2FwYWJsZSBvZlxuICBwYXJzaW5nIGxpbmVzIG9mIFNEUCwgYW5kIHByb3ZpZGluZyBhbiBvYmplY3QgYWxsb3dpbmcgeW91IHRvIHBlcmZvcm1cbiAgb3BlcmF0aW9ucyBvbiB0aG9zZSBwYXJzZWQgbGluZXM6XG5cbiAgYGBganNcbiAgdmFyIHNkcCA9IHJlcXVpcmUoJ3J0Yy1zZHAnKShsaW5lcyk7XG4gIGBgYFxuXG4gIFRoZSBjdXJyZW50bHkgc3VwcG9ydGVkIG9wZXJhdGlvbnMgYXJlIGxpc3RlZCBiZWxvdzpcblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNkcCkge1xuICB2YXIgb3BzID0ge307XG4gIHZhciBwYXJzZWQgPSBbXTtcbiAgdmFyIGFjdGl2ZUNvbGxlY3RvcjtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBsaW5lc1xuICB2YXIgbGluZXMgPSBzZHAuc3BsaXQocmVMaW5lQnJlYWspLmZpbHRlcihCb29sZWFuKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgIHJldHVybiBsaW5lLnNwbGl0KCc9Jyk7XG4gIH0pO1xuXG4gIHZhciBpbnB1dE9yZGVyID0gbnViKGxpbmVzLmZpbHRlcihmdW5jdGlvbihsaW5lKSB7XG4gICAgcmV0dXJuIGxpbmVbMF0gJiYgbm9uSGVhZGVyTGluZXMuaW5kZXhPZihsaW5lWzBdKSA8IDA7XG4gIH0pLm1hcChwbHVjaygwKSkpO1xuXG4gIHZhciBmaW5kTGluZSA9IG9wcy5maW5kTGluZSA9IGZ1bmN0aW9uKHR5cGUsIGluZGV4KSB7XG4gICAgdmFyIGxpbmVEYXRhID0gcGFyc2VkLmZpbHRlcihmdW5jdGlvbihsaW5lKSB7XG4gICAgICByZXR1cm4gbGluZVswXSA9PT0gdHlwZTtcbiAgICB9KVtpbmRleCB8fCAwXTtcblxuICAgIHJldHVybiBsaW5lRGF0YSAmJiBsaW5lRGF0YVsxXTtcbiAgfTtcblxuICAvLyBwdXNoIGludG8gcGFyc2VkIHNlY3Rpb25zXG4gIGxpbmVzLmZvckVhY2goZnVuY3Rpb24obGluZSkge1xuICAgIHZhciBjdXN0b21QYXJzZXIgPSBwYXJzZXJzW2xpbmVbMF1dO1xuXG4gICAgaWYgKGN1c3RvbVBhcnNlcikge1xuICAgICAgYWN0aXZlQ29sbGVjdG9yID0gY3VzdG9tUGFyc2VyKHBhcnNlZCwgbGluZSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGFjdGl2ZUNvbGxlY3Rvcikge1xuICAgICAgYWN0aXZlQ29sbGVjdG9yID0gYWN0aXZlQ29sbGVjdG9yKGxpbmUpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHBhcnNlZC5wdXNoKGxpbmUpO1xuICAgIH1cbiAgfSk7XG5cbiAgLyoqXG4gICAgIyMjIGBzZHAuYWRkSWNlQ2FuZGlkYXRlKGRhdGEpYFxuXG4gICAgTW9kaWZ5IHRoZSBzZHAgdG8gaW5jbHVkZSBjYW5kaWRhdGVzIGFzIGRlbm90ZWQgYnkgdGhlIGRhdGEuXG5cbioqL1xuICBvcHMuYWRkSWNlQ2FuZGlkYXRlID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIHZhciBsaW5lSW5kZXggPSAoZGF0YSB8fCB7fSkubGluZUluZGV4IHx8IChkYXRhIHx8IHt9KS5zZHBNTGluZUluZGV4O1xuICAgIHZhciBtTGluZSA9IHR5cGVvZiBsaW5lSW5kZXggIT0gJ3VuZGVmaW5lZCcgJiYgZmluZExpbmUoJ20nLCBsaW5lSW5kZXgpO1xuICAgIHZhciBjYW5kaWRhdGUgPSAoZGF0YSB8fCB7fSkuY2FuZGlkYXRlO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSB0aGUgbUxpbmUgYWRkIHRoZSBuZXcgY2FuZGlkYXRlXG4gICAgaWYgKG1MaW5lICYmIGNhbmRpZGF0ZSkge1xuICAgICAgbUxpbmUuY2hpbGRsaW5lcy5wdXNoKGNhbmRpZGF0ZS5yZXBsYWNlKHJlVHJhaWxpbmdOZXdsaW5lcywgJycpLnNwbGl0KCc9JykpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICAjIyMgYHNkcC5nZXRNZWRpYVR5cGVzKCkgPT4gW11gXG5cbiAgICBSZXRyaWV2ZSB0aGUgbGlzdCBvZiBtZWRpYSB0eXBlcyB0aGF0IGhhdmUgYmVlbiBkZWZpbmVkIGluIHRoZSBzZHAgdmlhXG4gICAgYG09YCBsaW5lcy5cbiAgKiovXG4gIG9wcy5nZXRNZWRpYVR5cGVzID0gZnVuY3Rpb24oKSB7XG4gICAgZnVuY3Rpb24gZ2V0TWVkaWFUeXBlKGRhdGEpIHtcbiAgICAgIHJldHVybiBkYXRhWzFdLmRlZi5zcGxpdCgvXFxzLylbMF07XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnNlZC5maWx0ZXIoZnVuY3Rpb24ocGFydHMpIHtcbiAgICAgIHJldHVybiBwYXJ0c1swXSA9PT0gJ20nICYmIHBhcnRzWzFdICYmIHBhcnRzWzFdLmRlZjtcbiAgICB9KS5tYXAoZ2V0TWVkaWFUeXBlKTtcbiAgfTtcblxuICAvKipcbiAgICAjIyMgYHNkcC50b1N0cmluZygpYFxuXG4gICAgQ29udmVydCB0aGUgU0RQIHN0cnVjdHVyZSB0aGF0IGlzIGN1cnJlbnRseSByZXRhaW5lZCBpbiBtZW1vcnksIGludG8gYSBzdHJpbmdcbiAgICB0aGF0IGNhbiBiZSBwcm92aWRlZCB0byBhIGBzZXRMb2NhbERlc2NyaXB0aW9uYCAob3IgYHNldFJlbW90ZURlc2NyaXB0aW9uYClcbiAgICBXZWJSVEMgY2FsbC5cblxuICAqKi9cbiAgb3BzLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHBhcnNlZC5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgcmV0dXJuIHR5cGVvZiBsaW5lWzFdLnRvQXJyYXkgPT0gJ2Z1bmN0aW9uJyA/IGxpbmVbMV0udG9BcnJheSgpIDogWyBsaW5lIF07XG4gICAgfSkucmVkdWNlKGZsYXR0ZW4pLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICByZXR1cm4gbGluZS5qb2luKCc9Jyk7XG4gICAgfSkuam9pbignXFxuJyk7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMgU0RQIEZpbHRlcmluZyAvIE11bmdpbmcgRnVuY3Rpb25zXG5cbiAgICBUaGVyZSBhcmUgYWRkaXRpb25hbCBmdW5jdGlvbnMgaW5jbHVkZWQgaW4gdGhlIG1vZHVsZSB0byBhc3NpZ24gd2l0aFxuICAgIHBlcmZvcm1pbmcgXCJzaW5nbGUtc2hvdFwiIFNEUCBmaWx0ZXJpbmcgKG9yIG11bmdpbmcpIG9wZXJhdGlvbnM6XG5cbiAgKiovXG5cbiAgcmV0dXJuIG9wcztcbn07XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLm0gPSBmdW5jdGlvbihwYXJzZWQsIGxpbmUpIHtcbiAgdmFyIG1lZGlhID0ge1xuICAgIGRlZjogbGluZVsxXSxcbiAgICBjaGlsZGxpbmVzOiBbXSxcblxuICAgIHRvQXJyYXk6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIFtcbiAgICAgICAgWydtJywgbWVkaWEuZGVmIF1cbiAgICAgIF0uY29uY2F0KG1lZGlhLmNoaWxkbGluZXMpO1xuICAgIH1cbiAgfTtcblxuICBmdW5jdGlvbiBhZGRDaGlsZExpbmUoY2hpbGRMaW5lKSB7XG4gICAgbWVkaWEuY2hpbGRsaW5lcy5wdXNoKGNoaWxkTGluZSk7XG4gICAgcmV0dXJuIGFkZENoaWxkTGluZTtcbiAgfVxuXG4gIHBhcnNlZC5wdXNoKFsgJ20nLCBtZWRpYSBdKTtcblxuICByZXR1cm4gYWRkQ2hpbGRMaW5lO1xufTsiLCJ2YXIgdmFsaWRhdG9ycyA9IFtcbiAgWyAvXihhXFw9Y2FuZGlkYXRlLiopJC8sIHJlcXVpcmUoJ3J0Yy12YWxpZGF0b3IvY2FuZGlkYXRlJykgXVxuXTtcblxudmFyIHJlU2RwTGluZUJyZWFrID0gLyhcXHI/XFxufFxcXFxyXFxcXG4pLztcblxuLyoqXG4gICMgcnRjLXNkcGNsZWFuXG5cbiAgUmVtb3ZlIGludmFsaWQgbGluZXMgZnJvbSB5b3VyIFNEUC5cblxuICAjIyBXaHk/XG5cbiAgVGhpcyBtb2R1bGUgcmVtb3ZlcyB0aGUgb2NjYXNpb25hbCBcImJhZCBlZ2dcIiB0aGF0IHdpbGwgc2xpcCBpbnRvIFNEUCB3aGVuIGl0XG4gIGlzIGdlbmVyYXRlZCBieSB0aGUgYnJvd3Nlci4gIEluIHBhcnRpY3VsYXIgdGhlc2Ugc2l0dWF0aW9ucyBhcmUgY2F0ZXJlZCBmb3I6XG5cbiAgLSBpbnZhbGlkIElDRSBjYW5kaWRhdGVzXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpbnB1dCwgb3B0cykge1xuICB2YXIgbGluZUJyZWFrID0gZGV0ZWN0TGluZUJyZWFrKGlucHV0KTtcbiAgdmFyIGxpbmVzID0gaW5wdXQuc3BsaXQobGluZUJyZWFrKTtcbiAgdmFyIGNvbGxlY3RvciA9IChvcHRzIHx8IHt9KS5jb2xsZWN0b3I7XG5cbiAgLy8gZmlsdGVyIG91dCBpbnZhbGlkIGxpbmVzXG4gIGxpbmVzID0gbGluZXMuZmlsdGVyKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHZhbGlkYXRvcnMgYW5kIHVzZSB0aGUgb25lIHRoYXQgbWF0Y2hlc1xuICAgIHZhciB2YWxpZGF0b3IgPSB2YWxpZGF0b3JzLnJlZHVjZShmdW5jdGlvbihtZW1vLCBkYXRhLCBpZHgpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgbWVtbyAhPSAndW5kZWZpbmVkJyA/IG1lbW8gOiAoZGF0YVswXS5leGVjKGxpbmUpICYmIHtcbiAgICAgICAgbGluZTogbGluZS5yZXBsYWNlKGRhdGFbMF0sICckMScpLFxuICAgICAgICBmbjogZGF0YVsxXVxuICAgICAgfSk7XG4gICAgfSwgdW5kZWZpbmVkKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYSB2YWxpZGF0b3IsIGVuc3VyZSB3ZSBoYXZlIG5vIGVycm9yc1xuICAgIHZhciBlcnJvcnMgPSB2YWxpZGF0b3IgPyB2YWxpZGF0b3IuZm4odmFsaWRhdG9yLmxpbmUpIDogW107XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGVycm9ycyBhbmQgYW4gZXJyb3IgY29sbGVjdG9yLCB0aGVuIGFkZCB0byB0aGUgY29sbGVjdG9yXG4gICAgaWYgKGNvbGxlY3Rvcikge1xuICAgICAgZXJyb3JzLmZvckVhY2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgIGNvbGxlY3Rvci5wdXNoKGVycik7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gZXJyb3JzLmxlbmd0aCA9PT0gMDtcbiAgfSk7XG5cbiAgcmV0dXJuIGxpbmVzLmpvaW4obGluZUJyZWFrKTtcbn07XG5cbmZ1bmN0aW9uIGRldGVjdExpbmVCcmVhayhpbnB1dCkge1xuICB2YXIgbWF0Y2ggPSByZVNkcExpbmVCcmVhay5leGVjKGlucHV0KTtcblxuICByZXR1cm4gbWF0Y2ggJiYgbWF0Y2hbMF07XG59XG4iLCJ2YXIgZGVidWcgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJykoJ3J0Yy12YWxpZGF0b3InKTtcbnZhciByZVByZWZpeCA9IC9eKD86YT0pP2NhbmRpZGF0ZTovO1xudmFyIHJlSVAgPSAvXigoXFxkK1xcLil7M31cXGQrfChbYS1mQS1GMC05XStcXDopezd9W2EtZkEtRjAtOV0rKSQvO1xuXG4vKlxuXG52YWxpZGF0aW9uIHJ1bGVzIGFzIHBlcjpcbmh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL2RyYWZ0LWlldGYtbW11c2ljLWljZS1zaXAtc2RwLTAzI3NlY3Rpb24tOC4xXG5cbiAgIGNhbmRpZGF0ZS1hdHRyaWJ1dGUgICA9IFwiY2FuZGlkYXRlXCIgXCI6XCIgZm91bmRhdGlvbiBTUCBjb21wb25lbnQtaWQgU1BcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zcG9ydCBTUFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHkgU1BcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb24tYWRkcmVzcyBTUCAgICAgO2Zyb20gUkZDIDQ1NjZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcnQgICAgICAgICA7cG9ydCBmcm9tIFJGQyA0NTY2XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBTUCBjYW5kLXR5cGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFtTUCByZWwtYWRkcl1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFtTUCByZWwtcG9ydF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICooU1AgZXh0ZW5zaW9uLWF0dC1uYW1lIFNQXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbi1hdHQtdmFsdWUpXG5cbiAgIGZvdW5kYXRpb24gICAgICAgICAgICA9IDEqMzJpY2UtY2hhclxuICAgY29tcG9uZW50LWlkICAgICAgICAgID0gMSo1RElHSVRcbiAgIHRyYW5zcG9ydCAgICAgICAgICAgICA9IFwiVURQXCIgLyB0cmFuc3BvcnQtZXh0ZW5zaW9uXG4gICB0cmFuc3BvcnQtZXh0ZW5zaW9uICAgPSB0b2tlbiAgICAgICAgICAgICAgOyBmcm9tIFJGQyAzMjYxXG4gICBwcmlvcml0eSAgICAgICAgICAgICAgPSAxKjEwRElHSVRcbiAgIGNhbmQtdHlwZSAgICAgICAgICAgICA9IFwidHlwXCIgU1AgY2FuZGlkYXRlLXR5cGVzXG4gICBjYW5kaWRhdGUtdHlwZXMgICAgICAgPSBcImhvc3RcIiAvIFwic3JmbHhcIiAvIFwicHJmbHhcIiAvIFwicmVsYXlcIiAvIHRva2VuXG4gICByZWwtYWRkciAgICAgICAgICAgICAgPSBcInJhZGRyXCIgU1AgY29ubmVjdGlvbi1hZGRyZXNzXG4gICByZWwtcG9ydCAgICAgICAgICAgICAgPSBcInJwb3J0XCIgU1AgcG9ydFxuICAgZXh0ZW5zaW9uLWF0dC1uYW1lICAgID0gdG9rZW5cbiAgIGV4dGVuc2lvbi1hdHQtdmFsdWUgICA9ICpWQ0hBUlxuICAgaWNlLWNoYXIgICAgICAgICAgICAgID0gQUxQSEEgLyBESUdJVCAvIFwiK1wiIC8gXCIvXCJcbiovXG52YXIgcGFydFZhbGlkYXRpb24gPSBbXG4gIFsgLy4rLywgJ2ludmFsaWQgZm91bmRhdGlvbiBjb21wb25lbnQnLCAnZm91bmRhdGlvbicgXSxcbiAgWyAvXFxkKy8sICdpbnZhbGlkIGNvbXBvbmVudCBpZCcsICdjb21wb25lbnQtaWQnIF0sXG4gIFsgLyhVRFB8VENQKS9pLCAndHJhbnNwb3J0IG11c3QgYmUgVENQIG9yIFVEUCcsICd0cmFuc3BvcnQnIF0sXG4gIFsgL1xcZCsvLCAnbnVtZXJpYyBwcmlvcml0eSBleHBlY3RlZCcsICdwcmlvcml0eScgXSxcbiAgWyByZUlQLCAnaW52YWxpZCBjb25uZWN0aW9uIGFkZHJlc3MnLCAnY29ubmVjdGlvbi1hZGRyZXNzJyBdLFxuICBbIC9cXGQrLywgJ2ludmFsaWQgY29ubmVjdGlvbiBwb3J0JywgJ2Nvbm5lY3Rpb24tcG9ydCcgXSxcbiAgWyAvdHlwLywgJ0V4cGVjdGVkIFwidHlwXCIgaWRlbnRpZmllcicsICd0eXBlIGNsYXNzaWZpZXInIF0sXG4gIFsgLy4rLywgJ0ludmFsaWQgY2FuZGlkYXRlIHR5cGUgc3BlY2lmaWVkJywgJ2NhbmRpZGF0ZS10eXBlJyBdXG5dO1xuXG4vKipcbiAgIyMjIGBydGMtdmFsaWRhdG9yL2NhbmRpZGF0ZWBcblxuICBWYWxpZGF0ZSB0aGF0IGFuIGBSVENJY2VDYW5kaWRhdGVgIChvciBwbGFpbiBvbGQgb2JqZWN0IHdpdGggZGF0YSwgc2RwTWlkLFxuICBldGMgYXR0cmlidXRlcykgaXMgYSB2YWxpZCBpY2UgY2FuZGlkYXRlLlxuXG4gIFNwZWNzIHJldmlld2VkIGFzIHBhcnQgb2YgdGhlIHZhbGlkYXRpb24gaW1wbGVtZW50YXRpb246XG5cbiAgLSA8aHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvZHJhZnQtaWV0Zi1tbXVzaWMtaWNlLXNpcC1zZHAtMDMjc2VjdGlvbi04LjE+XG4gIC0gPGh0dHA6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzUyNDU+XG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkYXRhKSB7XG4gIHZhciBlcnJvcnMgPSBbXTtcbiAgdmFyIGNhbmRpZGF0ZSA9IGRhdGEgJiYgKGRhdGEuY2FuZGlkYXRlIHx8IGRhdGEpO1xuICB2YXIgcHJlZml4TWF0Y2ggPSBjYW5kaWRhdGUgJiYgcmVQcmVmaXguZXhlYyhjYW5kaWRhdGUpO1xuICB2YXIgcGFydHMgPSBwcmVmaXhNYXRjaCAmJiBjYW5kaWRhdGUuc2xpY2UocHJlZml4TWF0Y2hbMF0ubGVuZ3RoKS5zcGxpdCgvXFxzLyk7XG5cbiAgaWYgKCEgY2FuZGlkYXRlKSB7XG4gICAgcmV0dXJuIFsgbmV3IEVycm9yKCdlbXB0eSBjYW5kaWRhdGUnKSBdO1xuICB9XG5cbiAgLy8gY2hlY2sgdGhhdCB0aGUgcHJlZml4IG1hdGNoZXMgZXhwZWN0ZWRcbiAgaWYgKCEgcHJlZml4TWF0Y2gpIHtcbiAgICByZXR1cm4gWyBuZXcgRXJyb3IoJ2NhbmRpZGF0ZSBkaWQgbm90IG1hdGNoIGV4cGVjdGVkIHNkcCBsaW5lIGZvcm1hdCcpIF07XG4gIH1cblxuICAvLyBwZXJmb3JtIHRoZSBwYXJ0IHZhbGlkYXRpb25cbiAgZXJyb3JzID0gZXJyb3JzLmNvbmNhdChwYXJ0cy5tYXAodmFsaWRhdGVQYXJ0cykpLmZpbHRlcihCb29sZWFuKTtcblxuICByZXR1cm4gZXJyb3JzO1xufTtcblxuZnVuY3Rpb24gdmFsaWRhdGVQYXJ0cyhwYXJ0LCBpZHgpIHtcbiAgdmFyIHZhbGlkYXRvciA9IHBhcnRWYWxpZGF0aW9uW2lkeF07XG5cbiAgaWYgKHZhbGlkYXRvciAmJiAoISB2YWxpZGF0b3JbMF0udGVzdChwYXJ0KSkpIHtcbiAgICBkZWJ1Zyh2YWxpZGF0b3JbMl0gKyAnIHBhcnQgZmFpbGVkIHZhbGlkYXRpb246ICcgKyBwYXJ0KTtcbiAgICByZXR1cm4gbmV3IEVycm9yKHZhbGlkYXRvclsxXSk7XG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYSwgYikge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhID09PSBiIDogZnVuY3Rpb24oYikge1xuICAgIHJldHVybiBhID09PSBiO1xuICB9O1xufTtcbiIsIi8qKlxuICAjIyBmbGF0dGVuXG5cbiAgRmxhdHRlbiBhbiBhcnJheSB1c2luZyBgW10ucmVkdWNlYFxuXG4gIDw8PCBleGFtcGxlcy9mbGF0dGVuLmpzXG5cbioqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgLy8gaWYgYSBpcyBub3QgYWxyZWFkeSBhbiBhcnJheSwgbWFrZSBpdCBvbmVcbiAgYSA9IEFycmF5LmlzQXJyYXkoYSkgPyBhIDogW2FdO1xuXG4gIC8vIGNvbmNhdCBiIHdpdGggYVxuICByZXR1cm4gYS5jb25jYXQoYik7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY29tcGFyYXRvcikge1xuICByZXR1cm4gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICB2YXIgb3V0cHV0ID0gW107XG4gICAgZm9yICh2YXIgaWkgPSAwLCBjb3VudCA9IGlucHV0Lmxlbmd0aDsgaWkgPCBjb3VudDsgaWkrKykge1xuICAgICAgdmFyIGZvdW5kID0gZmFsc2U7XG4gICAgICBmb3IgKHZhciBqaiA9IG91dHB1dC5sZW5ndGg7IGpqLS07ICkge1xuICAgICAgICBmb3VuZCA9IGZvdW5kIHx8IGNvbXBhcmF0b3IoaW5wdXRbaWldLCBvdXRwdXRbampdKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGZvdW5kKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBvdXRwdXRbb3V0cHV0Lmxlbmd0aF0gPSBpbnB1dFtpaV07XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfTtcbn0iLCIvKipcbiAgIyMgbnViXG5cbiAgUmV0dXJuIG9ubHkgdGhlIHVuaXF1ZSBlbGVtZW50cyBvZiB0aGUgbGlzdC5cblxuICA8PDwgZXhhbXBsZXMvbnViLmpzXG5cbioqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbnViLWJ5JykocmVxdWlyZSgnLi9lcXVhbGl0eScpKTsiLCIvKipcbiAgIyMgcGx1Y2tcblxuICBFeHRyYWN0IHRhcmdldGVkIHByb3BlcnRpZXMgZnJvbSBhIHNvdXJjZSBvYmplY3QuIFdoZW4gYSBzaW5nbGUgcHJvcGVydHlcbiAgdmFsdWUgaXMgcmVxdWVzdGVkLCB0aGVuIGp1c3QgdGhhdCB2YWx1ZSBpcyByZXR1cm5lZC5cblxuICBJbiB0aGUgY2FzZSB3aGVyZSBtdWx0aXBsZSBwcm9wZXJ0aWVzIGFyZSByZXF1ZXN0ZWQgKGluIGEgdmFyYXJncyBjYWxsaW5nXG4gIHN0eWxlKSBhIG5ldyBvYmplY3Qgd2lsbCBiZSBjcmVhdGVkIHdpdGggdGhlIHJlcXVlc3RlZCBwcm9wZXJ0aWVzIGNvcGllZFxuICBhY3Jvc3MuXG5cbiAgX19OT1RFOl9fIEluIHRoZSBzZWNvbmQgZm9ybSBleHRyYWN0aW9uIG9mIG5lc3RlZCBwcm9wZXJ0aWVzIGlzXG4gIG5vdCBzdXBwb3J0ZWQuXG5cbiAgPDw8IGV4YW1wbGVzL3BsdWNrLmpzXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGZpZWxkcyA9IFtdO1xuXG4gIGZ1bmN0aW9uIGV4dHJhY3RvcihwYXJ0cywgbWF4SWR4KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIHZhciBwYXJ0SWR4ID0gMDtcbiAgICAgIHZhciB2YWwgPSBpdGVtO1xuXG4gICAgICBkbyB7XG4gICAgICAgIHZhbCA9IHZhbCAmJiB2YWxbcGFydHNbcGFydElkeCsrXV07XG4gICAgICB9IHdoaWxlICh2YWwgJiYgcGFydElkeCA8PSBtYXhJZHgpO1xuXG4gICAgICByZXR1cm4gdmFsO1xuICAgIH07XG4gIH1cblxuICBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykuZm9yRWFjaChmdW5jdGlvbihwYXRoKSB7XG4gICAgdmFyIHBhcnRzID0gdHlwZW9mIHBhdGggPT0gJ251bWJlcicgPyBbIHBhdGggXSA6IChwYXRoIHx8ICcnKS5zcGxpdCgnLicpO1xuXG4gICAgZmllbGRzW2ZpZWxkcy5sZW5ndGhdID0ge1xuICAgICAgbmFtZTogcGFydHNbMF0sXG4gICAgICBwYXJ0czogcGFydHMsXG4gICAgICBtYXhJZHg6IHBhcnRzLmxlbmd0aCAtIDFcbiAgICB9O1xuICB9KTtcblxuICBpZiAoZmllbGRzLmxlbmd0aCA8PSAxKSB7XG4gICAgcmV0dXJuIGV4dHJhY3RvcihmaWVsZHNbMF0ucGFydHMsIGZpZWxkc1swXS5tYXhJZHgpO1xuICB9XG4gIGVsc2Uge1xuICAgIHJldHVybiBmdW5jdGlvbihpdGVtKSB7XG4gICAgICB2YXIgZGF0YSA9IHt9O1xuXG4gICAgICBmb3IgKHZhciBpaSA9IDAsIGxlbiA9IGZpZWxkcy5sZW5ndGg7IGlpIDwgbGVuOyBpaSsrKSB7XG4gICAgICAgIGRhdGFbZmllbGRzW2lpXS5uYW1lXSA9IGV4dHJhY3RvcihbZmllbGRzW2lpXS5wYXJ0c1swXV0sIDApKGl0ZW0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGF0YTtcbiAgICB9O1xuICB9XG59OyJdfQ==
