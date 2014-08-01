(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{"crel":4,"rtc-filter-grayscale":8,"rtc-media":9,"rtc-videoproc":12}],2:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
/* jshint node: true */
/* global window: false */
/* global navigator: false */

'use strict';

var browser = require('detect-browser');

/**
  ## rtc-core/detect

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

},{"detect-browser":6}],6:[function(require,module,exports){
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
  [ 'ios', /iPhone\;\sCPU\siPhone\sOS\s([0-9\._]+)/ ]
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

},{"cog/extend":2,"cog/logger":3,"eventemitter3":10,"inherits":11,"rtc-core/detect":5,"rtc-core/plugin":7}],10:[function(require,module,exports){
'use strict';

/**
 * Minimal EventEmitter interface that is molded against the Node.js
 * EventEmitter interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() {
  this._events = {};
}

/**
 * Return a list of assigned event listeners.
 *
 * @param {String} event The events that should be listed.
 * @returns {Array}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event) {
  return Array.apply(this, this._events[event] || []);
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
    , length = listeners.length
    , len = arguments.length
    , fn = listeners[0]
    , args
    , i;

  if (1 === length) {
    if (fn.__EE3_once) this.removeListener(event, fn);

    switch (len) {
      case 1:
        fn.call(fn.__EE3_context || this);
      break;
      case 2:
        fn.call(fn.__EE3_context || this, a1);
      break;
      case 3:
        fn.call(fn.__EE3_context || this, a1, a2);
      break;
      case 4:
        fn.call(fn.__EE3_context || this, a1, a2, a3);
      break;
      case 5:
        fn.call(fn.__EE3_context || this, a1, a2, a3, a4);
      break;
      case 6:
        fn.call(fn.__EE3_context || this, a1, a2, a3, a4, a5);
      break;

      default:
        for (i = 1, args = new Array(len -1); i < len; i++) {
          args[i - 1] = arguments[i];
        }

        fn.apply(fn.__EE3_context || this, args);
    }
  } else {
    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    for (i = 0; i < length; fn = listeners[++i]) {
      if (fn.__EE3_once) this.removeListener(event, fn);
      fn.apply(fn.__EE3_context || this, args);
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
  if (!this._events) this._events = {};
  if (!this._events[event]) this._events[event] = [];

  fn.__EE3_context = context;
  this._events[event].push(fn);

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
  fn.__EE3_once = true;
  return this.on(event, fn, context);
};

/**
 * Remove event listeners.
 *
 * @param {String} event The event we want to remove.
 * @param {Function} fn The listener that we need to find.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn) {
  if (!this._events || !this._events[event]) return this;

  var listeners = this._events[event]
    , events = [];

  for (var i = 0, length = listeners.length; i < length; i++) {
    if (fn && listeners[i] !== fn) {
      events.push(listeners[i]);
    }
  }

  //
  // Reset the array, or remove it completely if we have no more listeners.
  //
  if (events.length) this._events[event] = events;
  else this._events[event] = null;

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

  if (event) this._events[event] = null;
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

try { module.exports = EventEmitter; }
catch (e) {}

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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
},{"events":14,"fdom/raf":13}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
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
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
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

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvY2xpbGwvU2VydmVyL3J0Yy5pby9ydGMuaW8td2Vic2l0ZS9jb2RlL3NpbXBsZS1tYW5pcHVsYXRpb24tNWZwcy5qcyIsIi9Vc2Vycy9jbGlsbC9TZXJ2ZXIvcnRjLmlvL3J0Yy5pby13ZWJzaXRlL25vZGVfbW9kdWxlcy9jb2cvZXh0ZW5kLmpzIiwiL1VzZXJzL2NsaWxsL1NlcnZlci9ydGMuaW8vcnRjLmlvLXdlYnNpdGUvbm9kZV9tb2R1bGVzL2NvZy9sb2dnZXIuanMiLCIvVXNlcnMvY2xpbGwvU2VydmVyL3J0Yy5pby9ydGMuaW8td2Vic2l0ZS9ub2RlX21vZHVsZXMvY3JlbC9jcmVsLmpzIiwiL1VzZXJzL2NsaWxsL1NlcnZlci9ydGMuaW8vcnRjLmlvLXdlYnNpdGUvbm9kZV9tb2R1bGVzL3J0Yy1jb3JlL2RldGVjdC5qcyIsIi9Vc2Vycy9jbGlsbC9TZXJ2ZXIvcnRjLmlvL3J0Yy5pby13ZWJzaXRlL25vZGVfbW9kdWxlcy9ydGMtY29yZS9ub2RlX21vZHVsZXMvZGV0ZWN0LWJyb3dzZXIvYnJvd3Nlci5qcyIsIi9Vc2Vycy9jbGlsbC9TZXJ2ZXIvcnRjLmlvL3J0Yy5pby13ZWJzaXRlL25vZGVfbW9kdWxlcy9ydGMtY29yZS9wbHVnaW4uanMiLCIvVXNlcnMvY2xpbGwvU2VydmVyL3J0Yy5pby9ydGMuaW8td2Vic2l0ZS9ub2RlX21vZHVsZXMvcnRjLWZpbHRlci1ncmF5c2NhbGUvaW5kZXguanMiLCIvVXNlcnMvY2xpbGwvU2VydmVyL3J0Yy5pby9ydGMuaW8td2Vic2l0ZS9ub2RlX21vZHVsZXMvcnRjLW1lZGlhL2luZGV4LmpzIiwiL1VzZXJzL2NsaWxsL1NlcnZlci9ydGMuaW8vcnRjLmlvLXdlYnNpdGUvbm9kZV9tb2R1bGVzL3J0Yy1tZWRpYS9ub2RlX21vZHVsZXMvZXZlbnRlbWl0dGVyMy9pbmRleC5qcyIsIi9Vc2Vycy9jbGlsbC9TZXJ2ZXIvcnRjLmlvL3J0Yy5pby13ZWJzaXRlL25vZGVfbW9kdWxlcy9ydGMtbWVkaWEvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCIvVXNlcnMvY2xpbGwvU2VydmVyL3J0Yy5pby9ydGMuaW8td2Vic2l0ZS9ub2RlX21vZHVsZXMvcnRjLXZpZGVvcHJvYy9pbmRleC5qcyIsIi9Vc2Vycy9jbGlsbC9TZXJ2ZXIvcnRjLmlvL3J0Yy5pby13ZWJzaXRlL25vZGVfbW9kdWxlcy9ydGMtdmlkZW9wcm9jL25vZGVfbW9kdWxlcy9mZG9tL3JhZi5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBjcmVsID0gcmVxdWlyZSgnY3JlbCcpO1xudmFyIG1lZGlhID0gcmVxdWlyZSgncnRjLW1lZGlhJyk7XG52YXIgdmlkZW9wcm9jID0gcmVxdWlyZSgncnRjLXZpZGVvcHJvYycpO1xudmFyIHZpZGVvID0gY3JlbCgndmlkZW8nKTtcbnZhciBjYW52YXMgPSBjcmVsKCdjYW52YXMnKTtcblxuLy8gc2V0IHVwIHRoZSB2aWRlbyBwcm9jZXNzaW5nXG52aWRlb3Byb2ModmlkZW8sIGNhbnZhcywge1xuICBmcHM6IDUsXG4gIGZpbHRlcjogcmVxdWlyZSgncnRjLWZpbHRlci1ncmF5c2NhbGUnKVxufSk7XG5cbi8vIGNhcHR1cmUgYW5kIHJlbmRlciB0aGUgdmlkZW9cbm1lZGlhKCkucmVuZGVyKHZpZGVvKTtcblxuLy8gYWRkIHRoZSBjYW52YXMgdG8gdGhlIGRvY3VtZW50IGJvZHlcbmRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoY2FudmFzKTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiMjIGNvZy9leHRlbmRcblxuYGBganNcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG5gYGBcblxuIyMjIGV4dGVuZCh0YXJnZXQsICopXG5cblNoYWxsb3cgY29weSBvYmplY3QgcHJvcGVydGllcyBmcm9tIHRoZSBzdXBwbGllZCBzb3VyY2Ugb2JqZWN0cyAoKikgaW50b1xudGhlIHRhcmdldCBvYmplY3QsIHJldHVybmluZyB0aGUgdGFyZ2V0IG9iamVjdCBvbmNlIGNvbXBsZXRlZDpcblxuYGBganNcbmV4dGVuZCh7IGE6IDEsIGI6IDIgfSwgeyBjOiAzIH0sIHsgZDogNCB9LCB7IGI6IDUgfSkpO1xuYGBgXG5cblNlZSBhbiBleGFtcGxlIG9uIFtyZXF1aXJlYmluXShodHRwOi8vcmVxdWlyZWJpbi5jb20vP2dpc3Q9NjA3OTQ3NSkuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKS5mb3JFYWNoKGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgIGlmICghIHNvdXJjZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICB0YXJnZXRbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gdGFyZ2V0O1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyMgY29nL2xvZ2dlclxuXG4gIGBgYGpzXG4gIHZhciBsb2dnZXIgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJyk7XG4gIGBgYFxuXG4gIFNpbXBsZSBicm93c2VyIGxvZ2dpbmcgb2ZmZXJpbmcgc2ltaWxhciBmdW5jdGlvbmFsaXR5IHRvIHRoZVxuICBbZGVidWddKGh0dHBzOi8vZ2l0aHViLmNvbS92aXNpb25tZWRpYS9kZWJ1ZykgbW9kdWxlLlxuXG4gICMjIyBVc2FnZVxuXG4gIENyZWF0ZSB5b3VyIHNlbGYgYSBuZXcgbG9nZ2luZyBpbnN0YW5jZSBhbmQgZ2l2ZSBpdCBhIG5hbWU6XG5cbiAgYGBganNcbiAgdmFyIGRlYnVnID0gbG9nZ2VyKCdwaGlsJyk7XG4gIGBgYFxuXG4gIE5vdyBkbyBzb21lIGRlYnVnZ2luZzpcblxuICBgYGBqc1xuICBkZWJ1ZygnaGVsbG8nKTtcbiAgYGBgXG5cbiAgQXQgdGhpcyBzdGFnZSwgbm8gbG9nIG91dHB1dCB3aWxsIGJlIGdlbmVyYXRlZCBiZWNhdXNlIHlvdXIgbG9nZ2VyIGlzXG4gIGN1cnJlbnRseSBkaXNhYmxlZC4gIEVuYWJsZSBpdDpcblxuICBgYGBqc1xuICBsb2dnZXIuZW5hYmxlKCdwaGlsJyk7XG4gIGBgYFxuXG4gIE5vdyBkbyBzb21lIG1vcmUgbG9nZ2VyOlxuXG4gIGBgYGpzXG4gIGRlYnVnKCdPaCB0aGlzIGlzIHNvIG11Y2ggbmljZXIgOiknKTtcbiAgLy8gLS0+IHBoaWw6IE9oIHRoaXMgaXMgc29tZSBtdWNoIG5pY2VyIDopXG4gIGBgYFxuXG4gICMjIyBSZWZlcmVuY2VcbioqL1xuXG52YXIgYWN0aXZlID0gW107XG52YXIgdW5sZWFzaExpc3RlbmVycyA9IFtdO1xudmFyIHRhcmdldHMgPSBbIGNvbnNvbGUgXTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyKG5hbWUpXG5cbiAgQ3JlYXRlIGEgbmV3IGxvZ2dpbmcgaW5zdGFuY2UuXG4qKi9cbnZhciBsb2dnZXIgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgLy8gaW5pdGlhbCBlbmFibGVkIGNoZWNrXG4gIHZhciBlbmFibGVkID0gY2hlY2tBY3RpdmUoKTtcblxuICBmdW5jdGlvbiBjaGVja0FjdGl2ZSgpIHtcbiAgICByZXR1cm4gZW5hYmxlZCA9IGFjdGl2ZS5pbmRleE9mKCcqJykgPj0gMCB8fCBhY3RpdmUuaW5kZXhPZihuYW1lKSA+PSAwO1xuICB9XG5cbiAgLy8gcmVnaXN0ZXIgdGhlIGNoZWNrIGFjdGl2ZSB3aXRoIHRoZSBsaXN0ZW5lcnMgYXJyYXlcbiAgdW5sZWFzaExpc3RlbmVyc1t1bmxlYXNoTGlzdGVuZXJzLmxlbmd0aF0gPSBjaGVja0FjdGl2ZTtcblxuICAvLyByZXR1cm4gdGhlIGFjdHVhbCBsb2dnaW5nIGZ1bmN0aW9uXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYSBzdHJpbmcgbWVzc2FnZVxuICAgIGlmICh0eXBlb2YgYXJnc1swXSA9PSAnc3RyaW5nJyB8fCAoYXJnc1swXSBpbnN0YW5jZW9mIFN0cmluZykpIHtcbiAgICAgIGFyZ3NbMF0gPSBuYW1lICsgJzogJyArIGFyZ3NbMF07XG4gICAgfVxuXG4gICAgLy8gaWYgbm90IGVuYWJsZWQsIGJhaWxcbiAgICBpZiAoISBlbmFibGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gbG9nXG4gICAgdGFyZ2V0cy5mb3JFYWNoKGZ1bmN0aW9uKHRhcmdldCkge1xuICAgICAgdGFyZ2V0LmxvZy5hcHBseSh0YXJnZXQsIGFyZ3MpO1xuICAgIH0pO1xuICB9O1xufTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyLnJlc2V0KClcblxuICBSZXNldCBsb2dnaW5nIChyZW1vdmUgdGhlIGRlZmF1bHQgY29uc29sZSBsb2dnZXIsIGZsYWcgYWxsIGxvZ2dlcnMgYXNcbiAgaW5hY3RpdmUsIGV0YywgZXRjLlxuKiovXG5sb2dnZXIucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgLy8gcmVzZXQgdGFyZ2V0cyBhbmQgYWN0aXZlIHN0YXRlc1xuICB0YXJnZXRzID0gW107XG4gIGFjdGl2ZSA9IFtdO1xuXG4gIHJldHVybiBsb2dnZXIuZW5hYmxlKCk7XG59O1xuXG4vKipcbiAgIyMjIyBsb2dnZXIudG8odGFyZ2V0KVxuXG4gIEFkZCBhIGxvZ2dpbmcgdGFyZ2V0LiAgVGhlIGxvZ2dlciBtdXN0IGhhdmUgYSBgbG9nYCBtZXRob2QgYXR0YWNoZWQuXG5cbioqL1xubG9nZ2VyLnRvID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gIHRhcmdldHMgPSB0YXJnZXRzLmNvbmNhdCh0YXJnZXQgfHwgW10pO1xuXG4gIHJldHVybiBsb2dnZXI7XG59O1xuXG4vKipcbiAgIyMjIyBsb2dnZXIuZW5hYmxlKG5hbWVzKilcblxuICBFbmFibGUgbG9nZ2luZyB2aWEgdGhlIG5hbWVkIGxvZ2dpbmcgaW5zdGFuY2VzLiAgVG8gZW5hYmxlIGxvZ2dpbmcgdmlhIGFsbFxuICBpbnN0YW5jZXMsIHlvdSBjYW4gcGFzcyBhIHdpbGRjYXJkOlxuXG4gIGBgYGpzXG4gIGxvZ2dlci5lbmFibGUoJyonKTtcbiAgYGBgXG5cbiAgX19UT0RPOl9fIHdpbGRjYXJkIGVuYWJsZXJzXG4qKi9cbmxvZ2dlci5lbmFibGUgPSBmdW5jdGlvbigpIHtcbiAgLy8gdXBkYXRlIHRoZSBhY3RpdmVcbiAgYWN0aXZlID0gYWN0aXZlLmNvbmNhdChbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuXG4gIC8vIHRyaWdnZXIgdGhlIHVubGVhc2ggbGlzdGVuZXJzXG4gIHVubGVhc2hMaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbihsaXN0ZW5lcikge1xuICAgIGxpc3RlbmVyKCk7XG4gIH0pO1xuXG4gIHJldHVybiBsb2dnZXI7XG59OyIsIi8vQ29weXJpZ2h0IChDKSAyMDEyIEtvcnkgTnVublxyXG5cclxuLy9QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxyXG5cclxuLy9UaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cclxuXHJcbi8vVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXHJcblxyXG4vKlxyXG5cclxuICAgIFRoaXMgY29kZSBpcyBub3QgZm9ybWF0dGVkIGZvciByZWFkYWJpbGl0eSwgYnV0IHJhdGhlciBydW4tc3BlZWQgYW5kIHRvIGFzc2lzdCBjb21waWxlcnMuXHJcblxyXG4gICAgSG93ZXZlciwgdGhlIGNvZGUncyBpbnRlbnRpb24gc2hvdWxkIGJlIHRyYW5zcGFyZW50LlxyXG5cclxuICAgICoqKiBJRSBTVVBQT1JUICoqKlxyXG5cclxuICAgIElmIHlvdSByZXF1aXJlIHRoaXMgbGlicmFyeSB0byB3b3JrIGluIElFNywgYWRkIHRoZSBmb2xsb3dpbmcgYWZ0ZXIgZGVjbGFyaW5nIGNyZWwuXHJcblxyXG4gICAgdmFyIHRlc3REaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSxcclxuICAgICAgICB0ZXN0TGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsYWJlbCcpO1xyXG5cclxuICAgIHRlc3REaXYuc2V0QXR0cmlidXRlKCdjbGFzcycsICdhJyk7XHJcbiAgICB0ZXN0RGl2WydjbGFzc05hbWUnXSAhPT0gJ2EnID8gY3JlbC5hdHRyTWFwWydjbGFzcyddID0gJ2NsYXNzTmFtZSc6dW5kZWZpbmVkO1xyXG4gICAgdGVzdERpdi5zZXRBdHRyaWJ1dGUoJ25hbWUnLCdhJyk7XHJcbiAgICB0ZXN0RGl2WyduYW1lJ10gIT09ICdhJyA/IGNyZWwuYXR0ck1hcFsnbmFtZSddID0gZnVuY3Rpb24oZWxlbWVudCwgdmFsdWUpe1xyXG4gICAgICAgIGVsZW1lbnQuaWQgPSB2YWx1ZTtcclxuICAgIH06dW5kZWZpbmVkO1xyXG5cclxuXHJcbiAgICB0ZXN0TGFiZWwuc2V0QXR0cmlidXRlKCdmb3InLCAnYScpO1xyXG4gICAgdGVzdExhYmVsWydodG1sRm9yJ10gIT09ICdhJyA/IGNyZWwuYXR0ck1hcFsnZm9yJ10gPSAnaHRtbEZvcic6dW5kZWZpbmVkO1xyXG5cclxuXHJcblxyXG4qL1xyXG5cclxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XHJcbiAgICBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgICAgIGRlZmluZShmYWN0b3J5KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcm9vdC5jcmVsID0gZmFjdG9yeSgpO1xyXG4gICAgfVxyXG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcclxuICAgIC8vIGJhc2VkIG9uIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMzg0Mjg2L2phdmFzY3JpcHQtaXNkb20taG93LWRvLXlvdS1jaGVjay1pZi1hLWphdmFzY3JpcHQtb2JqZWN0LWlzLWEtZG9tLW9iamVjdFxyXG4gICAgdmFyIGlzTm9kZSA9IHR5cGVvZiBOb2RlID09PSAnZnVuY3Rpb24nXHJcbiAgICAgICAgPyBmdW5jdGlvbiAob2JqZWN0KSB7IHJldHVybiBvYmplY3QgaW5zdGFuY2VvZiBOb2RlOyB9XHJcbiAgICAgICAgOiBmdW5jdGlvbiAob2JqZWN0KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBvYmplY3RcclxuICAgICAgICAgICAgICAgICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnXHJcbiAgICAgICAgICAgICAgICAmJiB0eXBlb2Ygb2JqZWN0Lm5vZGVUeXBlID09PSAnbnVtYmVyJ1xyXG4gICAgICAgICAgICAgICAgJiYgdHlwZW9mIG9iamVjdC5ub2RlTmFtZSA9PT0gJ3N0cmluZyc7XHJcbiAgICAgICAgfTtcclxuICAgIHZhciBpc0FycmF5ID0gZnVuY3Rpb24oYSl7IHJldHVybiBhIGluc3RhbmNlb2YgQXJyYXk7IH07XHJcbiAgICB2YXIgYXBwZW5kQ2hpbGQgPSBmdW5jdGlvbihlbGVtZW50LCBjaGlsZCkge1xyXG4gICAgICBpZighaXNOb2RlKGNoaWxkKSl7XHJcbiAgICAgICAgICBjaGlsZCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNoaWxkKTtcclxuICAgICAgfVxyXG4gICAgICBlbGVtZW50LmFwcGVuZENoaWxkKGNoaWxkKTtcclxuICAgIH07XHJcblxyXG5cclxuICAgIGZ1bmN0aW9uIGNyZWwoKXtcclxuICAgICAgICB2YXIgZG9jdW1lbnQgPSB3aW5kb3cuZG9jdW1lbnQsXHJcbiAgICAgICAgICAgIGFyZ3MgPSBhcmd1bWVudHMsIC8vTm90ZTogYXNzaWduZWQgdG8gYSB2YXJpYWJsZSB0byBhc3Npc3QgY29tcGlsZXJzLiBTYXZlcyBhYm91dCA0MCBieXRlcyBpbiBjbG9zdXJlIGNvbXBpbGVyLiBIYXMgbmVnbGlnYWJsZSBlZmZlY3Qgb24gcGVyZm9ybWFuY2UuXHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSBhcmdzWzBdLFxyXG4gICAgICAgICAgICBjaGlsZCxcclxuICAgICAgICAgICAgc2V0dGluZ3MgPSBhcmdzWzFdLFxyXG4gICAgICAgICAgICBjaGlsZEluZGV4ID0gMixcclxuICAgICAgICAgICAgYXJndW1lbnRzTGVuZ3RoID0gYXJncy5sZW5ndGgsXHJcbiAgICAgICAgICAgIGF0dHJpYnV0ZU1hcCA9IGNyZWwuYXR0ck1hcDtcclxuXHJcbiAgICAgICAgZWxlbWVudCA9IGlzTm9kZShlbGVtZW50KSA/IGVsZW1lbnQgOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGVsZW1lbnQpO1xyXG4gICAgICAgIC8vIHNob3J0Y3V0XHJcbiAgICAgICAgaWYoYXJndW1lbnRzTGVuZ3RoID09PSAxKXtcclxuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZih0eXBlb2Ygc2V0dGluZ3MgIT09ICdvYmplY3QnIHx8IGlzTm9kZShzZXR0aW5ncykgfHwgaXNBcnJheShzZXR0aW5ncykpIHtcclxuICAgICAgICAgICAgLS1jaGlsZEluZGV4O1xyXG4gICAgICAgICAgICBzZXR0aW5ncyA9IG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBzaG9ydGN1dCBpZiB0aGVyZSBpcyBvbmx5IG9uZSBjaGlsZCB0aGF0IGlzIGEgc3RyaW5nXHJcbiAgICAgICAgaWYoKGFyZ3VtZW50c0xlbmd0aCAtIGNoaWxkSW5kZXgpID09PSAxICYmIHR5cGVvZiBhcmdzW2NoaWxkSW5kZXhdID09PSAnc3RyaW5nJyAmJiBlbGVtZW50LnRleHRDb250ZW50ICE9PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgICBlbGVtZW50LnRleHRDb250ZW50ID0gYXJnc1tjaGlsZEluZGV4XTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgZm9yKDsgY2hpbGRJbmRleCA8IGFyZ3VtZW50c0xlbmd0aDsgKytjaGlsZEluZGV4KXtcclxuICAgICAgICAgICAgICAgIGNoaWxkID0gYXJnc1tjaGlsZEluZGV4XTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZihjaGlsZCA9PSBudWxsKXtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaXNBcnJheShjaGlsZCkpIHtcclxuICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgY2hpbGQubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAgICAgICAgICAgICBhcHBlbmRDaGlsZChlbGVtZW50LCBjaGlsZFtpXSk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgIGFwcGVuZENoaWxkKGVsZW1lbnQsIGNoaWxkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yKHZhciBrZXkgaW4gc2V0dGluZ3Mpe1xyXG4gICAgICAgICAgICBpZighYXR0cmlidXRlTWFwW2tleV0pe1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoa2V5LCBzZXR0aW5nc1trZXldKTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXR0ciA9IGNyZWwuYXR0ck1hcFtrZXldO1xyXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIGF0dHIgPT09ICdmdW5jdGlvbicpe1xyXG4gICAgICAgICAgICAgICAgICAgIGF0dHIoZWxlbWVudCwgc2V0dGluZ3Nba2V5XSk7XHJcbiAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShhdHRyLCBzZXR0aW5nc1trZXldKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVXNlZCBmb3IgbWFwcGluZyBvbmUga2luZCBvZiBhdHRyaWJ1dGUgdG8gdGhlIHN1cHBvcnRlZCB2ZXJzaW9uIG9mIHRoYXQgaW4gYmFkIGJyb3dzZXJzLlxyXG4gICAgLy8gU3RyaW5nIHJlZmVyZW5jZWQgc28gdGhhdCBjb21waWxlcnMgbWFpbnRhaW4gdGhlIHByb3BlcnR5IG5hbWUuXHJcbiAgICBjcmVsWydhdHRyTWFwJ10gPSB7fTtcclxuXHJcbiAgICAvLyBTdHJpbmcgcmVmZXJlbmNlZCBzbyB0aGF0IGNvbXBpbGVycyBtYWludGFpbiB0aGUgcHJvcGVydHkgbmFtZS5cclxuICAgIGNyZWxbXCJpc05vZGVcIl0gPSBpc05vZGU7XHJcblxyXG4gICAgcmV0dXJuIGNyZWw7XHJcbn0pKTtcclxuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbi8qIGdsb2JhbCB3aW5kb3c6IGZhbHNlICovXG4vKiBnbG9iYWwgbmF2aWdhdG9yOiBmYWxzZSAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBicm93c2VyID0gcmVxdWlyZSgnZGV0ZWN0LWJyb3dzZXInKTtcblxuLyoqXG4gICMjIHJ0Yy1jb3JlL2RldGVjdFxuXG4gIEEgYnJvd3NlciBkZXRlY3Rpb24gaGVscGVyIGZvciBhY2Nlc3NpbmcgcHJlZml4LWZyZWUgdmVyc2lvbnMgb2YgdGhlIHZhcmlvdXNcbiAgV2ViUlRDIHR5cGVzLlxuXG4gICMjIyBFeGFtcGxlIFVzYWdlXG5cbiAgSWYgeW91IHdhbnRlZCB0byBnZXQgdGhlIG5hdGl2ZSBgUlRDUGVlckNvbm5lY3Rpb25gIHByb3RvdHlwZSBpbiBhbnkgYnJvd3NlclxuICB5b3UgY291bGQgZG8gdGhlIGZvbGxvd2luZzpcblxuICBgYGBqc1xuICB2YXIgZGV0ZWN0ID0gcmVxdWlyZSgncnRjLWNvcmUvZGV0ZWN0Jyk7IC8vIGFsc28gYXZhaWxhYmxlIGluIHJ0Yy9kZXRlY3RcbiAgdmFyIFJUQ1BlZXJDb25uZWN0aW9uID0gZGV0ZWN0KCdSVENQZWVyQ29ubmVjdGlvbicpO1xuICBgYGBcblxuICBUaGlzIHdvdWxkIHByb3ZpZGUgd2hhdGV2ZXIgdGhlIGJyb3dzZXIgcHJlZml4ZWQgdmVyc2lvbiBvZiB0aGVcbiAgUlRDUGVlckNvbm5lY3Rpb24gaXMgYXZhaWxhYmxlIChgd2Via2l0UlRDUGVlckNvbm5lY3Rpb25gLFxuICBgbW96UlRDUGVlckNvbm5lY3Rpb25gLCBldGMpLlxuKiovXG52YXIgZGV0ZWN0ID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0YXJnZXQsIHByZWZpeGVzKSB7XG4gIHZhciBwcmVmaXhJZHg7XG4gIHZhciBwcmVmaXg7XG4gIHZhciB0ZXN0TmFtZTtcbiAgdmFyIGhvc3RPYmplY3QgPSB0aGlzIHx8ICh0eXBlb2Ygd2luZG93ICE9ICd1bmRlZmluZWQnID8gd2luZG93IDogdW5kZWZpbmVkKTtcblxuICAvLyBpZiB3ZSBoYXZlIG5vIGhvc3Qgb2JqZWN0LCB0aGVuIGFib3J0XG4gIGlmICghIGhvc3RPYmplY3QpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBpbml0aWFsaXNlIHRvIGRlZmF1bHQgcHJlZml4ZXNcbiAgLy8gKHJldmVyc2Ugb3JkZXIgYXMgd2UgdXNlIGEgZGVjcmVtZW50aW5nIGZvciBsb29wKVxuICBwcmVmaXhlcyA9IChwcmVmaXhlcyB8fCBbJ21zJywgJ28nLCAnbW96JywgJ3dlYmtpdCddKS5jb25jYXQoJycpO1xuXG4gIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgcHJlZml4ZXMgYW5kIHJldHVybiB0aGUgY2xhc3MgaWYgZm91bmQgaW4gZ2xvYmFsXG4gIGZvciAocHJlZml4SWR4ID0gcHJlZml4ZXMubGVuZ3RoOyBwcmVmaXhJZHgtLTsgKSB7XG4gICAgcHJlZml4ID0gcHJlZml4ZXNbcHJlZml4SWR4XTtcblxuICAgIC8vIGNvbnN0cnVjdCB0aGUgdGVzdCBjbGFzcyBuYW1lXG4gICAgLy8gaWYgd2UgaGF2ZSBhIHByZWZpeCBlbnN1cmUgdGhlIHRhcmdldCBoYXMgYW4gdXBwZXJjYXNlIGZpcnN0IGNoYXJhY3RlclxuICAgIC8vIHN1Y2ggdGhhdCBhIHRlc3QgZm9yIGdldFVzZXJNZWRpYSB3b3VsZCByZXN1bHQgaW4gYVxuICAgIC8vIHNlYXJjaCBmb3Igd2Via2l0R2V0VXNlck1lZGlhXG4gICAgdGVzdE5hbWUgPSBwcmVmaXggKyAocHJlZml4ID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB0YXJnZXQuc2xpY2UoMSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldCk7XG5cbiAgICBpZiAodHlwZW9mIGhvc3RPYmplY3RbdGVzdE5hbWVdICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAvLyB1cGRhdGUgdGhlIGxhc3QgdXNlZCBwcmVmaXhcbiAgICAgIGRldGVjdC5icm93c2VyID0gZGV0ZWN0LmJyb3dzZXIgfHwgcHJlZml4LnRvTG93ZXJDYXNlKCk7XG5cbiAgICAgIC8vIHJldHVybiB0aGUgaG9zdCBvYmplY3QgbWVtYmVyXG4gICAgICByZXR1cm4gaG9zdE9iamVjdFt0YXJnZXRdID0gaG9zdE9iamVjdFt0ZXN0TmFtZV07XG4gICAgfVxuICB9XG59O1xuXG4vLyBkZXRlY3QgbW96aWxsYSAoeWVzLCB0aGlzIGZlZWxzIGRpcnR5KVxuZGV0ZWN0Lm1veiA9IHR5cGVvZiBuYXZpZ2F0b3IgIT0gJ3VuZGVmaW5lZCcgJiYgISFuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhO1xuXG4vLyBzZXQgdGhlIGJyb3dzZXIgYW5kIGJyb3dzZXIgdmVyc2lvblxuZGV0ZWN0LmJyb3dzZXIgPSBicm93c2VyLm5hbWU7XG5kZXRlY3QuYnJvd3NlclZlcnNpb24gPSBkZXRlY3QudmVyc2lvbiA9IGJyb3dzZXIudmVyc2lvbjtcbiIsInZhciBicm93c2VycyA9IFtcbiAgWyAnY2hyb21lJywgL0Nocm9tKD86ZXxpdW0pXFwvKFswLTlcXC5dKykoOj9cXHN8JCkvIF0sXG4gIFsgJ2ZpcmVmb3gnLCAvRmlyZWZveFxcLyhbMC05XFwuXSspKD86XFxzfCQpLyBdLFxuICBbICdvcGVyYScsIC9PcGVyYVxcLyhbMC05XFwuXSspKD86XFxzfCQpLyBdLFxuICBbICdpZScsIC9UcmlkZW50XFwvN1xcLjAuKnJ2XFw6KFswLTlcXC5dKylcXCkuKkdlY2tvJC8gXSxcbiAgWyAnaWUnLCAvTVNJRVxccyhbMC05XFwuXSspOy4qVHJpZGVudFxcL1s0LTZdLjAvIF0sXG4gIFsgJ2llJywgL01TSUVcXHMoN1xcLjApLyBdLFxuICBbICdiYjEwJywgL0JCMTA7XFxzVG91Y2guKlZlcnNpb25cXC8oWzAtOVxcLl0rKS8gXSxcbiAgWyAnYW5kcm9pZCcsIC9BbmRyb2lkXFxzKFswLTlcXC5dKykvIF0sXG4gIFsgJ2lvcycsIC9pUGFkXFw7XFxzQ1BVXFxzT1NcXHMoWzAtOVxcLl9dKykvIF0sXG4gIFsgJ2lvcycsIC9pUGhvbmVcXDtcXHNDUFVcXHNpUGhvbmVcXHNPU1xccyhbMC05XFwuX10rKS8gXVxuXTtcblxudmFyIG1hdGNoID0gYnJvd3NlcnMubWFwKG1hdGNoKS5maWx0ZXIoaXNNYXRjaClbMF07XG52YXIgcGFydHMgPSBtYXRjaCAmJiBtYXRjaFszXS5zcGxpdCgvWy5fXS8pLnNsaWNlKDAsMyk7XG5cbndoaWxlIChwYXJ0cyAmJiBwYXJ0cy5sZW5ndGggPCAzKSB7XG4gIHBhcnRzLnB1c2goJzAnKTtcbn1cblxuLy8gc2V0IHRoZSBuYW1lIGFuZCB2ZXJzaW9uXG5leHBvcnRzLm5hbWUgPSBtYXRjaCAmJiBtYXRjaFswXTtcbmV4cG9ydHMudmVyc2lvbiA9IHBhcnRzICYmIHBhcnRzLmpvaW4oJy4nKTtcblxuZnVuY3Rpb24gbWF0Y2gocGFpcikge1xuICByZXR1cm4gcGFpci5jb25jYXQocGFpclsxXS5leGVjKG5hdmlnYXRvci51c2VyQWdlbnQpKTtcbn1cblxuZnVuY3Rpb24gaXNNYXRjaChwYWlyKSB7XG4gIHJldHVybiAhIXBhaXJbMl07XG59XG4iLCJ2YXIgZGV0ZWN0ID0gcmVxdWlyZSgnLi9kZXRlY3QnKTtcbnZhciByZXF1aXJlZEZ1bmN0aW9ucyA9IFtcbiAgJ2luaXQnXG5dO1xuXG5mdW5jdGlvbiBpc1N1cHBvcnRlZChwbHVnaW4pIHtcbiAgcmV0dXJuIHBsdWdpbiAmJiB0eXBlb2YgcGx1Z2luLnN1cHBvcnRlZCA9PSAnZnVuY3Rpb24nICYmIHBsdWdpbi5zdXBwb3J0ZWQoZGV0ZWN0KTtcbn1cblxuZnVuY3Rpb24gaXNWYWxpZChwbHVnaW4pIHtcbiAgdmFyIHN1cHBvcnRlZEZ1bmN0aW9ucyA9IHJlcXVpcmVkRnVuY3Rpb25zLmZpbHRlcihmdW5jdGlvbihmbikge1xuICAgIHJldHVybiB0eXBlb2YgcGx1Z2luW2ZuXSA9PSAnZnVuY3Rpb24nO1xuICB9KTtcblxuICByZXR1cm4gc3VwcG9ydGVkRnVuY3Rpb25zLmxlbmd0aCA9PT0gcmVxdWlyZWRGdW5jdGlvbnMubGVuZ3RoO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHBsdWdpbnMpIHtcbiAgcmV0dXJuIFtdLmNvbmNhdChwbHVnaW5zIHx8IFtdKS5maWx0ZXIoaXNTdXBwb3J0ZWQpLmZpbHRlcihpc1ZhbGlkKVswXTtcbn1cbiIsIi8qKlxuICAjIHJ0Yy1maWx0ZXItZ3JheXNjYWxlXG5cbiAgQSBzaW1wbGUgZ3JheXNjYWxlIGZpbHRlciBmb3IgdXNlIHdpdGggdGhlXG4gIFtydGMtdmlkZW9wcm9jXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy12aWRlb3Byb2MpIG1vZHVsZS5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgVGhlIGZvbGxvd2luZyBleGFtcGxlIGNhbiBiZSBydW4gdXNpbmdcbiAgW2JlZWZ5XShodHRwczovL2dpdGh1Yi5jb20vY2hyaXNkaWNraW5zb24vYmVlZnkpIChgYmVlZnkgZXhhbXBsZS5qc2ApOlxuXG4gIDw8PCBleGFtcGxlLmpzXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpbWFnZURhdGEpIHtcbiAgdmFyIGNoYW5uZWxzID0gaW1hZ2VEYXRhLmRhdGE7XG4gIHZhciByZ2IgPSBbXTtcbiAgdmFyIHJnYkF2ZztcbiAgdmFyIGFscGhhO1xuICB2YXIgaWk7XG5cbiAgLy8gY2hlY2sgdGhhdCB3ZSBoYXZlIGNoYW5uZWxzIGlzIGRpdmlzaWJsZSBieSBmb3VyIChqdXN0IGFzIGEgc2FmZXR5KVxuICBpZiAoY2hhbm5lbHMubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgZGF0YVxuICAvLyBOT1RFOiBkZWNyZW1lbnRpbmcgbG9vcHMgYXJlIGZhc3QgYnV0IHlvdSBuZWVkIHRvIGtub3cgdGhhdCB5b3Ugd2lsbFxuICAvLyBoaXQgMCB1c2luZyB0aGlzIGxvZ2ljIG90aGVyd2lzZSBpdCB3aWxsIHJ1biBmb3JldmVyIChvbmx5IDAgaXMgZmFsc3kpXG4gIGZvciAoaWkgPSBjaGFubmVscy5sZW5ndGg7IGlpIC09IDQ7ICkge1xuICAgIC8vIGdldCB0aGUgcmdiIHR1cGxlXG4gICAgcmdiID0gW2NoYW5uZWxzW2lpXSwgY2hhbm5lbHNbaWkgKyAxXSwgY2hhbm5lbHNbaWkgKyAyXV07XG5cbiAgICAvLyBnZXQgdGhlIGFscGhhIHZhbHVlXG4gICAgYWxwaGEgPSBjaGFubmVsc1tpaSArIDNdO1xuXG4gICAgLy8gY2FsY3VsYXRlIHRoZSByZ2IgYXZlcmFnZVxuICAgIHJnYkF2ZyA9IChyZ2JbMF0gKyByZ2JbMV0gKyByZ2JbMl0gKSAvIDM7XG5cbiAgICAvLyB1cGRhdGUgdGhlIHZhbHVlcyB0byB0aGUgcmdiIGF2ZXJhZ2VcbiAgICBjaGFubmVsc1tpaV0gPSBjaGFubmVsc1tpaSArIDFdID0gY2hhbm5lbHNbaWkgKyAyXSA9IHJnYkF2ZztcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIG5hdmlnYXRvcjogZmFsc2UgKi9cbi8qIGdsb2JhbCB3aW5kb3c6IGZhbHNlICovXG4vKiBnbG9iYWwgZG9jdW1lbnQ6IGZhbHNlICovXG4vKiBnbG9iYWwgTWVkaWFTdHJlYW06IGZhbHNlICovXG4vKiBnbG9iYWwgSFRNTFZpZGVvRWxlbWVudDogZmFsc2UgKi9cbi8qIGdsb2JhbCBIVE1MQXVkaW9FbGVtZW50OiBmYWxzZSAqL1xuXG4vKipcbiAgIyBydGMtbWVkaWFcblxuICBTaW1wbGUgW2dldFVzZXJNZWRpYV0oaHR0cDovL2Rldi53My5vcmcvMjAxMS93ZWJydGMvZWRpdG9yL2dldHVzZXJtZWRpYS5odG1sKVxuICBjcm9zcy1icm93c2VyIHdyYXBwZXJzLiAgUGFydCBvZiB0aGUgW3J0Yy5pb10oaHR0cDovL3J0Yy5pby8pIHN1aXRlLCB3aGljaCBpc1xuICBzcG9uc29yZWQgYnkgW05JQ1RBXShodHRwOi8vb3Blbm5pY3RhLmNvbSkgYW5kIHJlbGVhc2VkIHVuZGVyIGFuXG4gIFtBcGFjaGUgMi4wIGxpY2Vuc2VdKC9MSUNFTlNFKS5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgQ2FwdHVyaW5nIG1lZGlhIG9uIHlvdXIgbWFjaGluZSBpcyBhcyBzaW1wbGUgYXM6XG5cbiAgYGBganNcbiAgcmVxdWlyZSgncnRjLW1lZGlhJykoKTtcbiAgYGBgXG5cbiAgV2hpbGUgdGhpcyB3aWxsIGluIGZhY3Qgc3RhcnQgdGhlIHVzZXIgbWVkaWEgY2FwdHVyZSBwcm9jZXNzLCBpdCB3b24ndFxuICBkbyBhbnl0aGluZyB3aXRoIGl0LiAgTGV0cyB0YWtlIGEgbG9vayBhdCBhIG1vcmUgcmVhbGlzdGljIGV4YW1wbGU6XG5cbiAgPDw8IGV4YW1wbGVzL3JlbmRlci10by1ib2R5LmpzXG5cbiAgW3J1biBvbiByZXF1aXJlYmluXShodHRwOi8vcmVxdWlyZWJpbi5jb20vP2dpc3Q9NjA4NTQ1MClcblxuICBJbiB0aGUgY29kZSBhYm92ZSwgd2UgYXJlIGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlIG9mIG91ciB1c2VyTWVkaWEgd3JhcHBlclxuICB1c2luZyB0aGUgYG1lZGlhKClgIGNhbGwgYW5kIHRoZW4gdGVsbGluZyBpdCB0byByZW5kZXIgdG8gdGhlXG4gIGBkb2N1bWVudC5ib2R5YCBvbmNlIHZpZGVvIHN0YXJ0cyBzdHJlYW1pbmcuICBXZSBjYW4gZnVydGhlciBleHBhbmQgdGhlXG4gIGNvZGUgb3V0IHRvIHRoZSBmb2xsb3dpbmcgdG8gYWlkIG91ciB1bmRlcnN0YW5kaW5nIG9mIHdoYXQgaXMgZ29pbmcgb246XG5cbiAgPDw8IGV4YW1wbGVzL2NhcHR1cmUtZXhwbGljaXQuanNcblxuICBUaGUgY29kZSBhYm92ZSBpcyB3cml0dGVuIGluIGEgbW9yZSB0cmFkaXRpb25hbCBKUyBzdHlsZSwgYnV0IGZlZWwgZnJlZVxuICB0byB1c2UgdGhlIGZpcnN0IHN0eWxlIGFzIGl0J3MgcXVpdGUgc2FmZSAodGhhbmtzIHRvIHNvbWUgY2hlY2tzIGluIHRoZVxuICBjb2RlKS5cblxuICAjIyMgRXZlbnRzXG5cbiAgT25jZSBhIG1lZGlhIG9iamVjdCBoYXMgYmVlbiBjcmVhdGVkLCBpdCB3aWxsIHByb3ZpZGUgYSBudW1iZXIgb2YgZXZlbnRzXG4gIHRocm91Z2ggdGhlIHN0YW5kYXJkIG5vZGUgRXZlbnRFbWl0dGVyIEFQSS5cblxuICAjIyMjIGBjYXB0dXJlYFxuXG4gIFRoZSBgY2FwdHVyZWAgZXZlbnQgaXMgdHJpZ2dlcmVkIG9uY2UgdGhlIHJlcXVlc3RlZCBtZWRpYSBzdHJlYW0gaGFzXG4gIGJlZW4gY2FwdHVyZWQgYnkgdGhlIGJyb3dzZXIuXG5cbiAgPDw8IGV4YW1wbGVzL2NhcHR1cmUtZXZlbnQuanNcblxuICAjIyMjIGByZW5kZXJgXG5cbiAgVGhlIGByZW5kZXJgIGV2ZW50IGlzIHRyaWdnZXJlZCBvbmNlIHRoZSBzdHJlYW0gaGFzIGJlZW4gcmVuZGVyZWRcbiAgdG8gdGhlIGFueSBzdXBwbGllZCAob3IgY3JlYXRlZCkgdmlkZW8gZWxlbWVudHMuXG5cbiAgV2hpbGUgaXQgbWlnaHQgc2VlbSBhIGxpdHRsZSBjb25mdXNpbmcgdGhhdCB3aGVuIHRoZSBgcmVuZGVyYCBldmVudFxuICBmaXJlcyB0aGF0IGl0IHJldHVybnMgYW4gYXJyYXkgb2YgZWxlbWVudHMgcmF0aGVyIHRoYW4gYSBzaW5nbGUgZWxlbWVudFxuICAod2hpY2ggaXMgd2hhdCBpcyBwcm92aWRlZCB3aGVuIGNhbGxpbmcgdGhlIGByZW5kZXJgIG1ldGhvZCkuXG5cbiAgVGhpcyBvY2N1cnMgYmVjYXVzZSBpdCBpcyBjb21wbGV0ZWx5IHZhbGlkIHRvIHJlbmRlciBhIHNpbmdsZSBjYXB0dXJlZFxuICBtZWRpYSBzdHJlYW0gdG8gbXVsdGlwbGUgbWVkaWEgZWxlbWVudHMgb24gYSBwYWdlLiAgVGhlIGByZW5kZXJgIGV2ZW50XG4gIGlzIHJlcG9ydGluZyBvbmNlIHRoZSByZW5kZXIgb3BlcmF0aW9uIGhhcyBjb21wbGV0ZWQgZm9yIGFsbCB0YXJnZXRzIHRoYXRcbiAgaGF2ZSBiZWVuIHJlZ2lzdGVyZWQgd2l0aCB0aGUgY2FwdHVyZSBzdHJlYW0uXG5cbiAgIyMgUmVmZXJlbmNlXG5cbioqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKSgncnRjLW1lZGlhJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xudmFyIGRldGVjdCA9IHJlcXVpcmUoJ3J0Yy1jb3JlL2RldGVjdCcpO1xudmFyIHBsdWdpbiA9IHJlcXVpcmUoJ3J0Yy1jb3JlL3BsdWdpbicpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50ZW1pdHRlcjMnKTtcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbi8vIG1vbmtleSBwYXRjaCBnZXRVc2VyTWVkaWEgZnJvbSB0aGUgcHJlZml4ZWQgdmVyc2lvblxubmF2aWdhdG9yLmdldFVzZXJNZWRpYSA9IG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgfHxcbiAgZGV0ZWN0LmNhbGwobmF2aWdhdG9yLCAnZ2V0VXNlck1lZGlhJyk7XG5cbi8vIHBhdGNoIHdpbmRvdyB1cmxcbndpbmRvdy5VUkwgPSB3aW5kb3cuVVJMIHx8IGRldGVjdCgnVVJMJyk7XG5cbi8vIHBhdGNoIG1lZGlhIHN0cmVhbVxud2luZG93Lk1lZGlhU3RyZWFtID0gZGV0ZWN0KCdNZWRpYVN0cmVhbScpO1xuXG4vKipcbiAgIyMjIG1lZGlhXG5cbiAgYGBgXG4gIG1lZGlhKG9wdHM/KVxuICBgYGBcblxuICBDYXB0dXJlIG1lZGlhIHVzaW5nIHRoZSB1bmRlcmx5aW5nXG4gIFtnZXRVc2VyTWVkaWFdKGh0dHA6Ly93d3cudzMub3JnL1RSL21lZGlhY2FwdHVyZS1zdHJlYW1zLykgQVBJLlxuXG4gIFRoZSBmdW5jdGlvbiBhY2NlcHRzIGEgc2luZ2xlIGFyZ3VtZW50IHdoaWNoIGNhbiBiZSBlaXRoZXIgYmU6XG5cbiAgLSBhLiBBbiBvcHRpb25zIG9iamVjdCAoc2VlIGJlbG93KSwgb3I7XG4gIC0gYi4gQW4gZXhpc3RpbmdcbiAgICBbTWVkaWFTdHJlYW1dKGh0dHA6Ly93d3cudzMub3JnL1RSL21lZGlhY2FwdHVyZS1zdHJlYW1zLyNtZWRpYXN0cmVhbSkgdGhhdFxuICAgIHRoZSBtZWRpYSBvYmplY3Qgd2lsbCBiaW5kIHRvIGFuZCBwcm92aWRlIHlvdSBzb21lIERPTSBoZWxwZXJzIGZvci5cblxuICBUaGUgZnVuY3Rpb24gc3VwcG9ydHMgdGhlIGZvbGxvd2luZyBvcHRpb25zOlxuXG4gIC0gYGNhcHR1cmVgIC0gV2hldGhlciBjYXB0dXJlIHNob3VsZCBiZSBpbml0aWF0ZWQgYXV0b21hdGljYWxseS4gRGVmYXVsdHNcbiAgICB0byB0cnVlLCBidXQgdG9nZ2xlZCB0byBmYWxzZSBhdXRvbWF0aWNhbGx5IGlmIGFuIGV4aXN0aW5nIHN0cmVhbSBpc1xuICAgIHByb3ZpZGVkLlxuXG4gIC0gYG11dGVkYCAtIFdoZXRoZXIgdGhlIHZpZGVvIGVsZW1lbnQgY3JlYXRlZCBmb3IgdGhpcyBzdHJlYW0gc2hvdWxkIGJlXG4gICAgbXV0ZWQuICBEZWZhdWx0IGlzIHRydWUgYnV0IGlzIHNldCB0byBmYWxzZSB3aGVuIGFuIGV4aXN0aW5nIHN0cmVhbSBpc1xuICAgIHBhc3NlZC5cblxuICAtIGBjb25zdHJhaW50c2AgLSBUaGUgY29uc3RyYWludCBvcHRpb24gYWxsb3dzIHlvdSB0byBzcGVjaWZ5IHBhcnRpY3VsYXJcbiAgICBtZWRpYSBjYXB0dXJlIGNvbnN0cmFpbnRzIHdoaWNoIGNhbiBhbGxvdyB5b3UgZG8gZG8gc29tZSBwcmV0dHkgY29vbFxuICAgIHRyaWNrcy4gIEJ5IGRlZmF1bHQsIHRoZSBjb250cmFpbnRzIHVzZWQgdG8gcmVxdWVzdCB0aGUgbWVkaWEgYXJlXG4gICAgZmFpcmx5IHN0YW5kYXJkIGRlZmF1bHRzOlxuXG4gICAgYGBganNcbiAgICAgIHtcbiAgICAgICAgdmlkZW86IHtcbiAgICAgICAgICBtYW5kYXRvcnk6IHt9LFxuICAgICAgICAgIG9wdGlvbmFsOiBbXVxuICAgICAgICB9LFxuICAgICAgICBhdWRpbzogdHJ1ZVxuICAgICAgfVxuICAgIGBgYFxuXG4qKi9cbmZ1bmN0aW9uIE1lZGlhKG9wdHMpIHtcbiAgdmFyIG1lZGlhID0gdGhpcztcblxuICAvLyBjaGVjayB0aGUgY29uc3RydWN0b3IgaGFzIGJlZW4gY2FsbGVkXG4gIGlmICghICh0aGlzIGluc3RhbmNlb2YgTWVkaWEpKSB7XG4gICAgcmV0dXJuIG5ldyBNZWRpYShvcHRzKTtcbiAgfVxuXG4gIC8vIGluaGVyaXRlZFxuICBFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblxuICAvLyBpZiB0aGUgb3B0cyBpcyBhIG1lZGlhIHN0cmVhbSBpbnN0YW5jZSwgdGhlbiBoYW5kbGUgdGhhdCBhcHByb3ByaWF0ZWx5XG4gIGlmIChvcHRzICYmIE1lZGlhU3RyZWFtICYmIG9wdHMgaW5zdGFuY2VvZiBNZWRpYVN0cmVhbSkge1xuICAgIG9wdHMgPSB7XG4gICAgICBzdHJlYW06IG9wdHNcbiAgICB9O1xuICB9XG5cbiAgLy8gaWYgd2UndmUgYmVlbiBwYXNzZWQgb3B0cyBhbmQgdGhleSBsb29rIGxpa2UgY29uc3RyYWludHMsIG1vdmUgdGhpbmdzXG4gIC8vIGFyb3VuZCBhIGxpdHRsZVxuICBpZiAob3B0cyAmJiAob3B0cy5hdWRpbyB8fCBvcHRzLnZpZGVvKSkge1xuICAgIG9wdHMgPSB7XG4gICAgICBjb25zdHJhaW50czogb3B0c1xuICAgIH07XG4gIH1cblxuICAvLyBlbnN1cmUgd2UgaGF2ZSBvcHRzXG4gIG9wdHMgPSBleHRlbmQoe30sIHtcbiAgICBjYXB0dXJlOiAoISBvcHRzKSB8fCAoISBvcHRzLnN0cmVhbSksXG4gICAgbXV0ZWQ6ICghIG9wdHMpIHx8ICghIG9wdHMuc3RyZWFtKSxcbiAgICBjb25zdHJhaW50czoge1xuICAgICAgdmlkZW86IHtcbiAgICAgICAgbWFuZGF0b3J5OiB7fSxcbiAgICAgICAgb3B0aW9uYWw6IFtdXG4gICAgICB9LFxuICAgICAgYXVkaW86IHRydWUsXG5cbiAgICAgIC8vIHNwZWNpZnkgdGhlIGZha2UgZmxhZyBpZiB3ZSBkZXRlY3Qgd2UgYXJlIHJ1bm5pbmcgaW4gdGhlIHRlc3RcbiAgICAgIC8vIGVudmlyb25tZW50LCBvbiBjaHJvbWUgdGhpcyB3aWxsIGRvIG5vdGhpbmcgYnV0IGluIGZpcmVmb3ggaXQgd2lsbFxuICAgICAgLy8gdXNlIGEgZmFrZSB2aWRlbyBkZXZpY2VcbiAgICAgIGZha2U6IHR5cGVvZiBfX3Rlc3RsaW5nQ29uc29sZSAhPSAndW5kZWZpbmVkJ1xuICAgIH1cbiAgfSwgb3B0cyk7XG5cbiAgLy8gc2F2ZSB0aGUgY29uc3RyYWludHNcbiAgdGhpcy5jb25zdHJhaW50cyA9IG9wdHMuY29uc3RyYWludHM7XG5cbiAgLy8gaWYgYSBuYW1lIGhhcyBiZWVuIHNwZWNpZmllZCBpbiB0aGUgb3B0cywgc2F2ZSBpdCB0byB0aGUgbWVkaWFcbiAgdGhpcy5uYW1lID0gb3B0cy5uYW1lO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIHN0cmVhbSB0byBudWxsXG4gIHRoaXMuc3RyZWFtID0gb3B0cy5zdHJlYW0gfHwgbnVsbDtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBtdXRlZCBzdGF0ZVxuICB0aGlzLm11dGVkID0gdHlwZW9mIG9wdHMubXV0ZWQgPT0gJ3VuZGVmaW5lZCcgfHwgb3B0cy5tdXRlZDtcblxuICAvLyBjcmVhdGUgYSBiaW5kaW5ncyBhcnJheSBzbyB3ZSBoYXZlIGEgcm91Z2ggaWRlYSBvZiB3aGVyZVxuICAvLyB3ZSBoYXZlIGJlZW4gYXR0YWNoZWQgdG9cbiAgLy8gVE9ETzogcmV2aXNpdCB3aGV0aGVyIHRoaXMgaXMgdGhlIGJlc3Qgd2F5IHRvIG1hbmFnZSB0aGlzXG4gIHRoaXMuX2JpbmRpbmdzID0gW107XG5cbiAgLy8gc2VlIGlmIHdlIGFyZSB1c2luZyBhIHBsdWdpblxuICB0aGlzLnBsdWdpbiA9IHBsdWdpbigob3B0cyB8fCB7fSkucGx1Z2lucyk7XG4gIGlmICh0aGlzLnBsdWdpbikge1xuICAgIC8vIGlmIHdlIGFyZSB1c2luZyBhIHBsdWdpbiwgZ2l2ZSBpdCBhbiBvcHBvcnR1bml0eSB0byBwYXRjaCB0aGVcbiAgICAvLyBtZWRpYSBjYXB0dXJlIGludGVyZmFjZVxuICAgIG1lZGlhLl9waW5zdCA9IHRoaXMucGx1Z2luLmluaXQob3B0cywgZnVuY3Rpb24oZXJyKSB7XG4gICAgICBjb25zb2xlLmxvZygnaW5pdGlhbGl6YXRpb24gY29tcGxldGUnKTtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIG1lZGlhLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCghIG9wdHMuc3RyZWFtKSAmJiBvcHRzLmNhcHR1cmUpIHtcbiAgICAgICAgbWVkaWEuY2FwdHVyZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIC8vIGlmIHdlIGFyZSBhdXRvc3RhcnRpbmcsIGNhcHR1cmUgbWVkaWEgb24gdGhlIG5leHQgdGlja1xuICBlbHNlIGlmIChvcHRzLmNhcHR1cmUpIHtcbiAgICBzZXRUaW1lb3V0KHRoaXMuY2FwdHVyZS5iaW5kKHRoaXMpLCAwKTtcbiAgfVxufVxuXG5pbmhlcml0cyhNZWRpYSwgRXZlbnRFbWl0dGVyKTtcbm1vZHVsZS5leHBvcnRzID0gTWVkaWE7XG5cbi8qKlxuICAjIyMgY2FwdHVyZVxuXG4gIGBgYFxuICBjYXB0dXJlKGNvbnN0cmFpbnRzLCBjYWxsYmFjaylcbiAgYGBgXG5cbiAgQ2FwdHVyZSBtZWRpYS4gIElmIGNvbnN0cmFpbnRzIGFyZSBwcm92aWRlZCwgdGhlbiB0aGV5IHdpbGxcbiAgb3ZlcnJpZGUgdGhlIGRlZmF1bHQgY29uc3RyYWludHMgdGhhdCB3ZXJlIHVzZWQgd2hlbiB0aGUgbWVkaWEgb2JqZWN0IHdhc1xuICBjcmVhdGVkLlxuKiovXG5NZWRpYS5wcm90b3R5cGUuY2FwdHVyZSA9IGZ1bmN0aW9uKGNvbnN0cmFpbnRzLCBjYWxsYmFjaykge1xuICB2YXIgbWVkaWEgPSB0aGlzO1xuICB2YXIgaGFuZGxlRW5kID0gdGhpcy5lbWl0LmJpbmQodGhpcywgJ2VuZCcpO1xuXG4gIC8vIGlmIHdlIGFscmVhZHkgaGF2ZSBhIHN0cmVhbSwgdGhlbiBhYm9ydFxuICBpZiAodGhpcy5zdHJlYW0pIHsgcmV0dXJuOyB9XG5cbiAgLy8gaWYgbm8gY29uc3RyYWludHMgaGF2ZSBiZWVuIHByb3ZpZGVkLCBidXQgd2UgaGF2ZVxuICAvLyBhIGNhbGxiYWNrLCBkZWFsIHdpdGggaXRcbiAgaWYgKHR5cGVvZiBjb25zdHJhaW50cyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBjb25zdHJhaW50cztcbiAgICBjb25zdHJhaW50cyA9IHRoaXMuY29uc3RyYWludHM7XG4gIH1cblxuICAvLyBpZiB3ZSBoYXZlIGEgY2FsbGJhY2ssIGJpbmQgdG8gdGhlIHN0YXJ0IGV2ZW50XG4gIGlmICh0eXBlb2YgY2FsbGJhY2sgPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRoaXMub25jZSgnY2FwdHVyZScsIGNhbGxiYWNrLmJpbmQodGhpcykpO1xuICB9XG5cbiAgLy8gaWYgd2UgZG9uJ3QgaGF2ZSBnZXQgdGhlIGFiaWxpdHkgdG8gY2FwdHVyZSB1c2VyIG1lZGlhLCB0aGVuIGFib3J0XG4gIGlmICh0eXBlb2YgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSAhPSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrICYmIGNhbGxiYWNrKG5ldyBFcnJvcignVW5hYmxlIHRvIGNhcHR1cmUgdXNlciBtZWRpYScpKTtcbiAgfVxuXG4gIC8vIGdldCB1c2VyIG1lZGlhLCB1c2luZyBlaXRoZXIgdGhlIHByb3ZpZGVkIGNvbnN0cmFpbnRzIG9yIHRoZVxuICAvLyBkZWZhdWx0IGNvbnN0cmFpbnRzXG4gIGRlYnVnKCdnZXRVc2VyTWVkaWEsIGNvbnN0cmFpbnRzOiAnLCBjb25zdHJhaW50cyB8fCB0aGlzLmNvbnN0cmFpbnRzKTtcbiAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYShcbiAgICBjb25zdHJhaW50cyB8fCB0aGlzLmNvbnN0cmFpbnRzLFxuICAgIGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgZGVidWcoJ3N1Y2Vzc2Z1bGx5IGNhcHR1cmVkIG1lZGlhIHN0cmVhbTogJywgc3RyZWFtKTtcbiAgICAgIGlmICh0eXBlb2Ygc3RyZWFtLmFkZEV2ZW50TGlzdGVuZXIgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBzdHJlYW0uYWRkRXZlbnRMaXN0ZW5lcignZW5kZWQnLCBoYW5kbGVFbmQpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHN0cmVhbS5vbmVuZGVkID0gaGFuZGxlRW5kO1xuICAgICAgfVxuXG4gICAgICAvLyBzYXZlIHRoZSBzdHJlYW0gYW5kIGVtaXQgdGhlIHN0YXJ0IG1ldGhvZFxuICAgICAgbWVkaWEuc3RyZWFtID0gc3RyZWFtO1xuXG4gICAgICAvLyBlbWl0IGNhcHR1cmUgb24gbmV4dCB0aWNrIHdoaWNoIHdvcmtzIGFyb3VuZCBhIGJ1ZyB3aGVuIHVzaW5nIHBsdWdpbnNcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIG1lZGlhLmVtaXQoJ2NhcHR1cmUnLCBzdHJlYW0pO1xuICAgICAgfSwgMCk7XG4gICAgfSxcblxuICAgIGZ1bmN0aW9uKGVycikge1xuICAgICAgZGVidWcoJ2dldFVzZXJNZWRpYSBhdHRlbXB0IGZhaWxlZDogJywgZXJyKTtcbiAgICAgIG1lZGlhLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICB9XG4gICk7XG59O1xuXG4vKipcbiAgIyMjIHJlbmRlclxuXG4gIGBgYGpzXG4gIHJlbmRlcih0YXJnZXQsIG9wdHM/LCBjYWxsYmFjaz8pXG4gIGBgYFxuXG4gIFJlbmRlciB0aGUgY2FwdHVyZWQgbWVkaWEgdG8gdGhlIHNwZWNpZmllZCB0YXJnZXQgZWxlbWVudC4gIFdoaWxlIHByZXZpb3VzXG4gIHZlcnNpb25zIG9mIHJ0Yy1tZWRpYSBhY2NlcHRlZCBhIHNlbGVjdG9yIHN0cmluZyBvciBhbiBhcnJheSBvZiBlbGVtZW50c1xuICB0aGlzIGhhcyBiZWVuIGRyb3BwZWQgaW4gZmF2b3VyIG9mIF9fb25lIHNpbmdsZSB0YXJnZXQgZWxlbWVudF9fLlxuXG4gIElmIHRoZSB0YXJnZXQgZWxlbWVudCBpcyBhIHZhbGlkIE1lZGlhRWxlbWVudCB0aGVuIGl0IHdpbGwgYmVjb21lIHRoZVxuICB0YXJnZXQgb2YgdGhlIGNhcHR1cmVkIG1lZGlhIHN0cmVhbS4gIElmLCBob3dldmVyLCBpdCBpcyBhIGdlbmVyaWMgRE9NXG4gIGVsZW1lbnQgaXQgd2lsbCBhIG5ldyBNZWRpYSBlbGVtZW50IHdpbGwgYmUgY3JlYXRlZCB0aGF0IHVzaW5nIHRoZSB0YXJnZXRcbiAgYXMgaXQncyBwYXJlbnQuXG5cbiAgQSBzaW1wbGUgZXhhbXBsZSBvZiByZXF1ZXN0aW5nIGRlZmF1bHQgbWVkaWEgY2FwdHVyZSBhbmQgcmVuZGVyaW5nIHRvIHRoZVxuICBkb2N1bWVudCBib2R5IGlzIHNob3duIGJlbG93OlxuXG4gIDw8PCBleGFtcGxlcy9yZW5kZXItdG8tYm9keS5qc1xuXG4gIFlvdSBtYXkgb3B0aW9uYWxseSBwcm92aWRlIGEgY2FsbGJhY2sgdG8gdGhpcyBmdW5jdGlvbiwgd2hpY2ggaXNcbiAgd2lsbCBiZSB0cmlnZ2VyZWQgb25jZSBlYWNoIG9mIHRoZSBtZWRpYSBlbGVtZW50cyBoYXMgc3RhcnRlZCBwbGF5aW5nXG4gIHRoZSBzdHJlYW06XG5cbiAgPDw8IGV4YW1wbGVzL3JlbmRlci1jYXB0dXJlLWNhbGxiYWNrLmpzXG5cbioqL1xuTWVkaWEucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKHRhcmdldCwgb3B0cywgY2FsbGJhY2spIHtcbiAgLy8gaWYgdGhlIHRhcmdldCBpcyBhbiBhcnJheSwgZXh0cmFjdCB0aGUgZmlyc3QgZWxlbWVudFxuICBpZiAoQXJyYXkuaXNBcnJheSh0YXJnZXQpKSB7XG4gICAgLy8gbG9nIGEgd2FybmluZ1xuICAgIGNvbnNvbGUubG9nKCdXQVJOSU5HOiBydGMtbWVkaWEgcmVuZGVyIChhcyBvZiAxLngpIGV4cGVjdHMgYSBzaW5nbGUgdGFyZ2V0Jyk7XG4gICAgdGFyZ2V0ID0gdGFyZ2V0WzBdO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBvcHRzID09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IG9wdHM7XG4gICAgb3B0cyA9IHt9O1xuICB9XG5cbiAgLy8gZW5zdXJlIHdlIGhhdmUgb3B0c1xuICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICAvLyBjcmVhdGUgdGhlIHZpZGVvIC8gYXVkaW8gZWxlbWVudHNcbiAgdGFyZ2V0ID0gdGhpcy5fcHJlcGFyZUVsZW1lbnQob3B0cywgdGFyZ2V0KTtcbiAgY29uc29sZS5sb2coJ2F0dGVtcHRpbmcgcmVuZGVyLCBzdHJlYW06ICcsIHRoaXMuc3RyZWFtKTtcblxuICAvLyBpZiBubyBzdHJlYW0gd2FzIHNwZWNpZmllZCwgd2FpdCBmb3IgdGhlIHN0cmVhbSB0byBpbml0aWFsaXplXG4gIGlmICghIHRoaXMuc3RyZWFtKSB7XG4gICAgdGhpcy5vbmNlKCdjYXB0dXJlJywgdGhpcy5fYmluZFN0cmVhbS5iaW5kKHRoaXMpKTtcbiAgfVxuICAvLyBvdGhlcndpc2UsIGJpbmQgdGhlIHN0cmVhbSBub3dcbiAgZWxzZSB7XG4gICAgdGhpcy5fYmluZFN0cmVhbSh0aGlzLnN0cmVhbSk7XG4gIH1cblxuICAvLyBpZiB3ZSBoYXZlIGEgY2FsbGJhY2sgdGhlbiB0cmlnZ2VyIG9uIHRoZSByZW5kZXIgZXZlbnRcbiAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhpcy5vbmNlKCdyZW5kZXInLCBjYWxsYmFjayk7XG4gIH1cblxuICByZXR1cm4gdGFyZ2V0O1xufTtcblxuLyoqXG4gICMjIyBzdG9wKClcblxuICBTdG9wIHRoZSBtZWRpYSBzdHJlYW1cbioqL1xuTWVkaWEucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbihvcHRzKSB7XG4gIHZhciBtZWRpYSA9IHRoaXM7XG5cbiAgaWYgKCEgdGhpcy5zdHJlYW0pIHsgcmV0dXJuOyB9XG5cbiAgLy8gcmVtb3ZlIGJpbmRpbmdzXG4gIHRoaXMuX3VuYmluZChvcHRzKTtcblxuICAvLyBzdG9wIHRoZSBzdHJlYW0sIGFuZCB0ZWxsIHRoZSB3b3JsZFxuICB0aGlzLnN0cmVhbS5zdG9wKCk7XG5cbiAgLy8gb24gY2FwdHVyZSByZWJpbmRcbiAgdGhpcy5vbmNlKCdjYXB0dXJlJywgbWVkaWEuX2JpbmRTdHJlYW0uYmluZChtZWRpYSkpO1xuXG4gIC8vIHJlbW92ZSB0aGUgcmVmZXJlbmNlIHRvIHRoZSBzdHJlYW1cbiAgdGhpcy5zdHJlYW0gPSBudWxsO1xufTtcblxuLyoqXG4gICMjIERlYnVnZ2luZyBUaXBzXG5cbiAgQ2hyb21lIGFuZCBDaHJvbWl1bSBjYW4gYm90aCBiZSBzdGFydGVkIHdpdGggdGhlIGZvbGxvd2luZyBmbGFnOlxuXG4gIGBgYFxuICAtLXVzZS1mYWtlLWRldmljZS1mb3ItbWVkaWEtc3RyZWFtXG4gIGBgYFxuXG4gIFRoaXMgdXNlcyBhIGZha2Ugc3RyZWFtIGZvciB0aGUgZ2V0VXNlck1lZGlhKCkgY2FsbCByYXRoZXIgdGhhbiBhdHRlbXB0aW5nXG4gIHRvIGNhcHR1cmUgdGhlIGFjdHVhbCBjYW1lcmEuICBUaGlzIGlzIHVzZWZ1bCB3aGVuIGRvaW5nIGF1dG9tYXRlZCB0ZXN0aW5nXG4gIGFuZCBhbHNvIGlmIHlvdSB3YW50IHRvIHRlc3QgY29ubmVjdGl2aXR5IGJldHdlZW4gdHdvIGJyb3dzZXIgaW5zdGFuY2VzIGFuZFxuICB3YW50IHRvIGRpc3Rpbmd1aXNoIGJldHdlZW4gdGhlIHR3byBsb2NhbCB2aWRlb3MuXG5cbiAgIyMgSW50ZXJuYWwgTWV0aG9kc1xuXG4gIFRoZXJlIGFyZSBhIG51bWJlciBvZiBpbnRlcm5hbCBtZXRob2RzIHRoYXQgYXJlIHVzZWQgaW4gdGhlIGBydGMtbWVkaWFgXG4gIGltcGxlbWVudGF0aW9uLiBUaGVzZSBhcmUgb3V0bGluZWQgYmVsb3csIGJ1dCBub3QgZXhwZWN0ZWQgdG8gYmUgb2ZcbiAgZ2VuZXJhbCB1c2UuXG5cbioqL1xuXG5NZWRpYS5wcm90b3R5cGUuX2NyZWF0ZUJpbmRpbmcgPSBmdW5jdGlvbihvcHRzLCBlbGVtZW50KSB7XG4gIHRoaXMuX2JpbmRpbmdzLnB1c2goe1xuICAgIGVsOiBlbGVtZW50LFxuICAgIG9wdHM6IG9wdHNcbiAgfSk7XG5cbiAgcmV0dXJuIGVsZW1lbnQ7XG59O1xuXG4vKipcbiAgIyMjIF9wcmVwYXJlRWxlbWVudChvcHRzLCBlbGVtZW50KVxuXG4gIFRoZSBwcmVwYXJlRWxlbWVudCBmdW5jdGlvbiBpcyB1c2VkIHRvIHByZXBhcmUgRE9NIGVsZW1lbnRzIHRoYXQgd2lsbFxuICByZWNlaXZlIHRoZSBtZWRpYSBzdHJlYW1zIG9uY2UgdGhlIHN0cmVhbSBoYXZlIGJlZW4gc3VjY2Vzc2Z1bGx5IGNhcHR1cmVkLlxuKiovXG5NZWRpYS5wcm90b3R5cGUuX3ByZXBhcmVFbGVtZW50ID0gZnVuY3Rpb24ob3B0cywgZWxlbWVudCkge1xuICB2YXIgcGFyZW50O1xuICB2YXIgdmFsaWRFbGVtZW50ID0gKGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MVmlkZW9FbGVtZW50KSB8fFxuICAgICAgICAoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxBdWRpb0VsZW1lbnQpO1xuICB2YXIgcHJlc2VydmVBc3BlY3RSYXRpbyA9XG4gICAgICAgIHR5cGVvZiBvcHRzLnByZXNlcnZlQXNwZWN0UmF0aW8gPT0gJ3VuZGVmaW5lZCcgfHxcbiAgICAgICAgb3B0cy5wcmVzZXJ2ZUFzcGVjdFJhdGlvO1xuXG4gIGlmICghIGVsZW1lbnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCByZW5kZXIgbWVkaWEgdG8gYSBudWxsIGVsZW1lbnQnKTtcbiAgfVxuXG4gIC8vIGlmIHRoZSBwbHVnaW4gd2FudHMgdG8gcHJlcGFyZSBlbGVtbmV0cywgdGhlbiBsZXQgaXRcbiAgaWYgKHRoaXMucGx1Z2luICYmIHR5cGVvZiB0aGlzLnBsdWdpbi5wcmVwYXJlRWxlbWVudCA9PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NyZWF0ZUJpbmRpbmcoXG4gICAgICBvcHRzLFxuICAgICAgdGhpcy5wbHVnaW4ucHJlcGFyZUVsZW1lbnQuY2FsbCh0aGlzLl9waW5zdCwgb3B0cywgZWxlbWVudClcbiAgICApO1xuICB9XG5cbiAgLy8gcGVyZm9ybSBzb21lIGFkZGl0aW9uYWwgY2hlY2tzIGZvciB0aGluZ3MgdGhhdCBcImxvb2tcIiBsaWtlIGFcbiAgLy8gbWVkaWEgZWxlbWVudFxuICB2YWxpZEVsZW1lbnQgPSB2YWxpZEVsZW1lbnQgfHwgKHR5cGVvZiBlbGVtZW50LnBsYXkgPT0gJ2Z1bmN0aW9uJykgJiYgKFxuICAgIHR5cGVvZiBlbGVtZW50LnNyY09iamVjdCAhPSAndW5kZWZpbmVkJyB8fFxuICAgIHR5cGVvZiBlbGVtZW50Lm1velNyY09iamVjdCAhPSAndW5kZWZpbmVkJyB8fFxuICAgIHR5cGVvZiBlbGVtZW50LnNyYyAhPSAndW5kZWZpbmVkJyk7XG5cbiAgLy8gaWYgdGhlIGVsZW1lbnQgaXMgbm90IGEgdmlkZW8gZWxlbWVudCwgdGhlbiBjcmVhdGUgb25lXG4gIGlmICghIHZhbGlkRWxlbWVudCkge1xuICAgIHBhcmVudCA9IGVsZW1lbnQ7XG5cbiAgICAvLyBjcmVhdGUgYSBuZXcgdmlkZW8gZWxlbWVudFxuICAgIC8vIFRPRE86IGNyZWF0ZSBhbiBhcHByb3ByaWF0ZSBlbGVtZW50IGJhc2VkIG9uIHRoZSB0eXBlcyBvZiB0cmFja3NcbiAgICAvLyBhdmFpbGFibGVcbiAgICBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndmlkZW8nKTtcblxuICAgIC8vIGlmIHdlIGFyZSBwcmVzZXJ2aW5nIGFzcGVjdCByYXRpbyBkbyB0aGF0IG5vd1xuICAgIGlmIChwcmVzZXJ2ZUFzcGVjdFJhdGlvKSB7XG4gICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgncHJlc2VydmVBc3BlY3RSYXRpbycsICcnKTtcbiAgICB9XG5cbiAgICAvLyBhZGQgdG8gdGhlIHBhcmVudFxuICAgIHBhcmVudC5hcHBlbmRDaGlsZChlbGVtZW50KTtcbiAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnZGF0YS1wbGF5aW5nJywgZmFsc2UpO1xuICB9XG5cbiAgLy8gaWYgbXV0ZWQsIGluamVjdCB0aGUgbXV0ZWQgYXR0cmlidXRlXG4gIGlmIChlbGVtZW50ICYmIHRoaXMubXV0ZWQpIHtcbiAgICBlbGVtZW50Lm11dGVkID0gdHJ1ZTtcbiAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnbXV0ZWQnLCAnJyk7XG4gIH1cblxuICByZXR1cm4gdGhpcy5fY3JlYXRlQmluZGluZyhvcHRzLCBlbGVtZW50KTtcbn07XG5cbi8qKlxuICAjIyMgX2JpbmRTdHJlYW0oc3RyZWFtKVxuXG4gIEJpbmQgYSBzdHJlYW0gdG8gcHJldmlvdXNseSBwcmVwYXJlZCBET00gZWxlbWVudHMuXG5cbioqL1xuTWVkaWEucHJvdG90eXBlLl9iaW5kU3RyZWFtID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gIHZhciBtZWRpYSA9IHRoaXM7XG4gIHZhciBlbGVtZW50cyA9IFtdO1xuICB2YXIgd2FpdGluZyA9IFtdO1xuXG4gIGZ1bmN0aW9uIGNoZWNrV2FpdGluZygpIHtcbiAgICAvLyBpZiB3ZSBoYXZlIG5vIHdhaXRpbmcgZWxlbWVudHMsIGJ1dCBzb21lIGVsZW1lbnRzXG4gICAgLy8gdHJpZ2dlciB0aGUgc3RhcnQgZXZlbnRcbiAgICBpZiAod2FpdGluZy5sZW5ndGggPT09IDAgJiYgZWxlbWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgbWVkaWEuZW1pdCgncmVuZGVyJywgZWxlbWVudHNbMF0pO1xuXG4gICAgICBlbGVtZW50cy5tYXAoZnVuY3Rpb24oZWwpIHtcbiAgICAgICAgZWwuc2V0QXR0cmlidXRlKCdkYXRhLXBsYXlpbmcnLCB0cnVlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNhblBsYXkoZXZ0KSB7XG4gICAgdmFyIGVsID0gZXZ0LnRhcmdldCB8fCBldnQuc3JjRWxlbWVudDtcbiAgICB2YXIgdmlkZW9JbmRleCA9IGVsZW1lbnRzLmluZGV4T2YoZWwpO1xuXG4gICAgaWYgKHZpZGVvSW5kZXggPj0gMCkge1xuICAgICAgd2FpdGluZy5zcGxpY2UodmlkZW9JbmRleCwgMSk7XG4gICAgfVxuXG4gICAgZWwucGxheSgpO1xuICAgIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NhbnBsYXknLCBjYW5QbGF5KTtcbiAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdsb2FkZWRtZXRhZGF0YScsIGNhblBsYXkpO1xuICAgIGNoZWNrV2FpdGluZygpO1xuICB9XG5cbiAgLy8gaWYgd2UgaGF2ZSBhIHBsdWdpbiB0aGF0IGtub3dzIGhvdyB0byBhdHRhY2ggYSBzdHJlYW0sIHRoZW4gbGV0IGl0IGRvIGl0XG4gIGlmICh0aGlzLnBsdWdpbiAmJiB0eXBlb2YgdGhpcy5wbHVnaW4uYXR0YWNoU3RyZWFtID09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gdGhpcy5wbHVnaW4uYXR0YWNoU3RyZWFtLmNhbGwodGhpcy5fcGluc3QsIHN0cmVhbSwgdGhpcy5fYmluZGluZ3MpO1xuICB9XG5cbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBiaW5kaW5ncyBhbmQgYmluZCB0aGUgc3RyZWFtXG4gIGVsZW1lbnRzID0gdGhpcy5fYmluZGluZ3MubWFwKGZ1bmN0aW9uKGJpbmRpbmcpIHtcbiAgICAvLyBjaGVjayBmb3Igc3JjT2JqZWN0XG4gICAgaWYgKHR5cGVvZiBiaW5kaW5nLmVsLnNyY09iamVjdCAhPSAndW5kZWZpbmVkJykge1xuICAgICAgYmluZGluZy5lbC5zcmNPYmplY3QgPSBzdHJlYW07XG4gICAgfVxuICAgIC8vIGNoZWNrIGZvciBtb3pTcmNPYmplY3RcbiAgICBlbHNlIGlmICh0eXBlb2YgYmluZGluZy5lbC5tb3pTcmNPYmplY3QgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGJpbmRpbmcuZWwubW96U3JjT2JqZWN0ID0gc3RyZWFtO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGJpbmRpbmcuZWwuc3JjID0gbWVkaWEuX2NyZWF0ZU9iamVjdFVSTChzdHJlYW0pIHx8IHN0cmVhbTtcbiAgICB9XG5cbiAgICAvLyBhdHRlbXB0IHBsYXliYWNrIChtYXkgbm90IHdvcmsgaWYgdGhlIHN0cmVhbSBpc24ndCBxdWl0ZSByZWFkeSlcbiAgICBiaW5kaW5nLmVsLnBsYXkoKTtcbiAgICByZXR1cm4gYmluZGluZy5lbDtcbiAgfSk7XG5cbiAgLy8gZmluZCB0aGUgZWxlbWVudHMgd2UgYXJlIHdhaXRpbmcgb25cbiAgd2FpdGluZyA9IGVsZW1lbnRzLmZpbHRlcihmdW5jdGlvbihlbCkge1xuICAgIHJldHVybiBlbC5yZWFkeVN0YXRlIDwgMzsgLy8gcmVhZHlzdGF0ZSA8IEhBVkVfRlVUVVJFX0RBVEFcbiAgfSk7XG5cbiAgLy8gd2FpdCBmb3IgYWxsIHRoZSB2aWRlbyBlbGVtZW50c1xuICB3YWl0aW5nLmZvckVhY2goZnVuY3Rpb24oZWwpIHtcbiAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdjYW5wbGF5JywgY2FuUGxheSwgZmFsc2UpO1xuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgY2FuUGxheSwgZmFsc2UpO1xuICB9KTtcblxuICBjaGVja1dhaXRpbmcoKTtcbn07XG5cbi8qKlxuICAjIyMgX3VuYmluZCgpXG5cbiAgR3JhY2VmdWxseSBkZXRhY2ggZWxlbWVudHMgdGhhdCBhcmUgdXNpbmcgdGhlIHN0cmVhbSBmcm9tIHRoZVxuICBjdXJyZW50IHN0cmVhbS5cbioqL1xuTWVkaWEucHJvdG90eXBlLl91bmJpbmQgPSBmdW5jdGlvbihvcHRzKSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIG9wdHNcbiAgb3B0cyA9IG9wdHMgfHwge307XG5cbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBiaW5kaW5ncyBhbmQgZGV0YWNoIHN0cmVhbXNcbiAgdGhpcy5fYmluZGluZ3MuZm9yRWFjaChmdW5jdGlvbihiaW5kaW5nKSB7XG4gICAgdmFyIGVsZW1lbnQgPSBiaW5kaW5nLmVsO1xuXG4gICAgLy8gcmVtb3ZlIHRoZSBzb3VyY2VcbiAgICBlbGVtZW50LnNyYyA9IG51bGw7XG5cbiAgICAvLyBjaGVjayBmb3IgbW96XG4gICAgaWYgKGVsZW1lbnQubW96U3JjT2JqZWN0KSB7XG4gICAgICBlbGVtZW50Lm1velNyY09iamVjdCA9IG51bGw7XG4gICAgfVxuXG4gICAgLy8gY2hlY2sgZm9yIGN1cnJlbnRTcmNcbiAgICBpZiAoZWxlbWVudC5jdXJyZW50U3JjKSB7XG4gICAgICBlbGVtZW50LmN1cnJlbnRTcmMgPSBudWxsO1xuICAgIH1cbiAgfSk7XG59O1xuXG4vKipcbiAgIyMjIF9jcmVhdGVPYmplY3RVcmwoc3RyZWFtKVxuXG4gIFRoaXMgbWV0aG9kIGlzIHVzZWQgdG8gY3JlYXRlIGFuIG9iamVjdCB1cmwgdGhhdCBjYW4gYmUgYXR0YWNoZWQgdG8gYSB2aWRlb1xuICBvciBhdWRpbyBlbGVtZW50LiAgT2JqZWN0IHVybHMgYXJlIGNhY2hlZCB0byBlbnN1cmUgb25seSBvbmUgaXMgY3JlYXRlZFxuICBwZXIgc3RyZWFtLlxuKiovXG5NZWRpYS5wcm90b3R5cGUuX2NyZWF0ZU9iamVjdFVSTCA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICB0cnkge1xuICAgIHJldHVybiB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChzdHJlYW0pO1xuICB9XG4gIGNhdGNoIChlKSB7XG4gIH1cbn07XG5cbi8qKlxuICAjIyMgX2hhbmRsZVN1Y2Nlc3Moc3RyZWFtKVxuXG4gIEhhbmRsZSB0aGUgc3VjY2VzcyBjb25kaXRpb24gb2YgYSBgZ2V0VXNlck1lZGlhYCBjYWxsLlxuXG4qKi9cbk1lZGlhLnByb3RvdHlwZS5faGFuZGxlU3VjY2VzcyA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICAvLyB1cGRhdGUgdGhlIGFjdGl2ZSBzdHJlYW0gdGhhdCB3ZSBhcmUgY29ubmVjdGVkIHRvXG4gIHRoaXMuc3RyZWFtID0gc3RyZWFtO1xuXG4gIC8vIGVtaXQgdGhlIHN0cmVhbSBldmVudFxuICB0aGlzLmVtaXQoJ3N0cmVhbScsIHN0cmVhbSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIE1pbmltYWwgRXZlbnRFbWl0dGVyIGludGVyZmFjZSB0aGF0IGlzIG1vbGRlZCBhZ2FpbnN0IHRoZSBOb2RlLmpzXG4gKiBFdmVudEVtaXR0ZXIgaW50ZXJmYWNlLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICogQGFwaSBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB7fTtcbn1cblxuLyoqXG4gKiBSZXR1cm4gYSBsaXN0IG9mIGFzc2lnbmVkIGV2ZW50IGxpc3RlbmVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgVGhlIGV2ZW50cyB0aGF0IHNob3VsZCBiZSBsaXN0ZWQuXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uIGxpc3RlbmVycyhldmVudCkge1xuICByZXR1cm4gQXJyYXkuYXBwbHkodGhpcywgdGhpcy5fZXZlbnRzW2V2ZW50XSB8fCBbXSk7XG59O1xuXG4vKipcbiAqIEVtaXQgYW4gZXZlbnQgdG8gYWxsIHJlZ2lzdGVyZWQgZXZlbnQgbGlzdGVuZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBUaGUgbmFtZSBvZiB0aGUgZXZlbnQuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gSW5kaWNhdGlvbiBpZiB3ZSd2ZSBlbWl0dGVkIGFuIGV2ZW50LlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24gZW1pdChldmVudCwgYTEsIGEyLCBhMywgYTQsIGE1KSB7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbZXZlbnRdKSByZXR1cm4gZmFsc2U7XG5cbiAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1tldmVudF1cbiAgICAsIGxlbmd0aCA9IGxpc3RlbmVycy5sZW5ndGhcbiAgICAsIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGhcbiAgICAsIGZuID0gbGlzdGVuZXJzWzBdXG4gICAgLCBhcmdzXG4gICAgLCBpO1xuXG4gIGlmICgxID09PSBsZW5ndGgpIHtcbiAgICBpZiAoZm4uX19FRTNfb25jZSkgdGhpcy5yZW1vdmVMaXN0ZW5lcihldmVudCwgZm4pO1xuXG4gICAgc3dpdGNoIChsZW4pIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgZm4uY2FsbChmbi5fX0VFM19jb250ZXh0IHx8IHRoaXMpO1xuICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGZuLmNhbGwoZm4uX19FRTNfY29udGV4dCB8fCB0aGlzLCBhMSk7XG4gICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgZm4uY2FsbChmbi5fX0VFM19jb250ZXh0IHx8IHRoaXMsIGExLCBhMik7XG4gICAgICBicmVhaztcbiAgICAgIGNhc2UgNDpcbiAgICAgICAgZm4uY2FsbChmbi5fX0VFM19jb250ZXh0IHx8IHRoaXMsIGExLCBhMiwgYTMpO1xuICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDU6XG4gICAgICAgIGZuLmNhbGwoZm4uX19FRTNfY29udGV4dCB8fCB0aGlzLCBhMSwgYTIsIGEzLCBhNCk7XG4gICAgICBicmVhaztcbiAgICAgIGNhc2UgNjpcbiAgICAgICAgZm4uY2FsbChmbi5fX0VFM19jb250ZXh0IHx8IHRoaXMsIGExLCBhMiwgYTMsIGE0LCBhNSk7XG4gICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgZm9yIChpID0gMSwgYXJncyA9IG5ldyBBcnJheShsZW4gLTEpOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZuLmFwcGx5KGZuLl9fRUUzX2NvbnRleHQgfHwgdGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGZvciAoaSA9IDEsIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0xKTsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBmbiA9IGxpc3RlbmVyc1srK2ldKSB7XG4gICAgICBpZiAoZm4uX19FRTNfb25jZSkgdGhpcy5yZW1vdmVMaXN0ZW5lcihldmVudCwgZm4pO1xuICAgICAgZm4uYXBwbHkoZm4uX19FRTNfY29udGV4dCB8fCB0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXIgYSBuZXcgRXZlbnRMaXN0ZW5lciBmb3IgdGhlIGdpdmVuIGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBOYW1lIG9mIHRoZSBldmVudC5cbiAqIEBwYXJhbSB7RnVuY3Rvbn0gZm4gQ2FsbGJhY2sgZnVuY3Rpb24uXG4gKiBAcGFyYW0ge01peGVkfSBjb250ZXh0IFRoZSBjb250ZXh0IG9mIHRoZSBmdW5jdGlvbi5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbiBvbihldmVudCwgZm4sIGNvbnRleHQpIHtcbiAgaWYgKCF0aGlzLl9ldmVudHMpIHRoaXMuX2V2ZW50cyA9IHt9O1xuICBpZiAoIXRoaXMuX2V2ZW50c1tldmVudF0pIHRoaXMuX2V2ZW50c1tldmVudF0gPSBbXTtcblxuICBmbi5fX0VFM19jb250ZXh0ID0gY29udGV4dDtcbiAgdGhpcy5fZXZlbnRzW2V2ZW50XS5wdXNoKGZuKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkIGFuIEV2ZW50TGlzdGVuZXIgdGhhdCdzIG9ubHkgY2FsbGVkIG9uY2UuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IE5hbWUgb2YgdGhlIGV2ZW50LlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gQ2FsbGJhY2sgZnVuY3Rpb24uXG4gKiBAcGFyYW0ge01peGVkfSBjb250ZXh0IFRoZSBjb250ZXh0IG9mIHRoZSBmdW5jdGlvbi5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uIG9uY2UoZXZlbnQsIGZuLCBjb250ZXh0KSB7XG4gIGZuLl9fRUUzX29uY2UgPSB0cnVlO1xuICByZXR1cm4gdGhpcy5vbihldmVudCwgZm4sIGNvbnRleHQpO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgZXZlbnQgbGlzdGVuZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBUaGUgZXZlbnQgd2Ugd2FudCB0byByZW1vdmUuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBUaGUgbGlzdGVuZXIgdGhhdCB3ZSBuZWVkIHRvIGZpbmQuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gcmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGZuKSB7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbZXZlbnRdKSByZXR1cm4gdGhpcztcblxuICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW2V2ZW50XVxuICAgICwgZXZlbnRzID0gW107XG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGxpc3RlbmVycy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmIChmbiAmJiBsaXN0ZW5lcnNbaV0gIT09IGZuKSB7XG4gICAgICBldmVudHMucHVzaChsaXN0ZW5lcnNbaV0pO1xuICAgIH1cbiAgfVxuXG4gIC8vXG4gIC8vIFJlc2V0IHRoZSBhcnJheSwgb3IgcmVtb3ZlIGl0IGNvbXBsZXRlbHkgaWYgd2UgaGF2ZSBubyBtb3JlIGxpc3RlbmVycy5cbiAgLy9cbiAgaWYgKGV2ZW50cy5sZW5ndGgpIHRoaXMuX2V2ZW50c1tldmVudF0gPSBldmVudHM7XG4gIGVsc2UgdGhpcy5fZXZlbnRzW2V2ZW50XSA9IG51bGw7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbGwgbGlzdGVuZXJzIG9yIG9ubHkgdGhlIGxpc3RlbmVycyBmb3IgdGhlIHNwZWNpZmllZCBldmVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgVGhlIGV2ZW50IHdhbnQgdG8gcmVtb3ZlIGFsbCBsaXN0ZW5lcnMgZm9yLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbiByZW1vdmVBbGxMaXN0ZW5lcnMoZXZlbnQpIHtcbiAgaWYgKCF0aGlzLl9ldmVudHMpIHJldHVybiB0aGlzO1xuXG4gIGlmIChldmVudCkgdGhpcy5fZXZlbnRzW2V2ZW50XSA9IG51bGw7XG4gIGVsc2UgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vL1xuLy8gQWxpYXMgbWV0aG9kcyBuYW1lcyBiZWNhdXNlIHBlb3BsZSByb2xsIGxpa2UgdGhhdC5cbi8vXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXI7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbjtcblxuLy9cbi8vIFRoaXMgZnVuY3Rpb24gZG9lc24ndCBhcHBseSBhbnltb3JlLlxuLy9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24gc2V0TWF4TGlzdGVuZXJzKCkge1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8vXG4vLyBFeHBvc2UgdGhlIG1vZHVsZS5cbi8vXG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlcjIgPSBFdmVudEVtaXR0ZXI7XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyMyA9IEV2ZW50RW1pdHRlcjtcblxudHJ5IHsgbW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7IH1cbmNhdGNoIChlKSB7fVxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIGRvY3VtZW50OiBmYWxzZSAqL1xuLyogZ2xvYmFsIEhUTUxWaWRlb0VsZW1lbnQ6IGZhbHNlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBERUZBVUxUX0ZQUyA9IDI1O1xudmFyIHJhZiA9IHJlcXVpcmUoJ2Zkb20vcmFmJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xuXG4vKipcbiAgIyBydGMtdmlkZW9wcm9jXG5cbiAgVGhpcyBpcyBhIHNtYWxsIGhlbHBlciBtb2R1bGUgdGhhdCBhbGxvd3MgeW91IHRvIHN1YnN0aXR1dGUgYSB2aWRlb1xuICBlbGVtZW50IHdpdGggYSBjYW52YXMgZWxlbWVudC4gIFRoaXMgY2FuIGJlIHVzZWZ1bCB3aGVuIHlvdSB3YW50IHRvXG4gIGRvIHBpeGVsIG1hbmlwdWxhdGlvbiBvZiB0aGUgcmVuZGVyZWQgaW1hZ2VzLCBvciBpbiBzaXR1YXRpb25zIHdoZW5cbiAgYSB2aWRlbyBlbGVtZW50IGRvZXMgbm90IGJlaGF2ZSBhcyB5b3UgZXhwZWN0LlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICA8PDwgZXhhbXBsZXMvZ3JheXNjYWxlLWZpbHRlci5qc1xuXG4gICMjIFVzaW5nIHRoZSBQcm9jZXNzaW5nIFBpcGVsaW5lXG5cbiAgQSBwcm9jZXNzaW5nIHBpcGVsaW5lIGhhcyBiZWVuIGluY2x1ZGVkIHRvIGFzc2lzdCB3aXRoXG4gIG1hbmlwdWxhdGluZyB0aGUgY2FudmFzIG9uIHRoZSBmbHkuIFRvIHNwZWNpZnkgdGhlIGZpbHRlcnMgdG8gYmUgdXNlZFxuICBpbiB0aGUgcHJvY2Vzc2luZyBwaXBlbGluZSwgdGhpcyBpcyBkb25lIGluIHRoZSBvcHRpb25zIGFjY2VwdGVkIGJ5XG4gIHZpZGVvcHJvYy4gRWl0aGVyIHNwZWNpZnlpbmcgYW4gYXJyYXkgb2YgZmlsdGVycyB3aXRoIHRoZSBgZmlsdGVyc2Agb3B0aW9uXG4gIG9yIGEgc2luZ2xlIGZpbHRlciBmdW5jdGlvbiB3aXRoIHRoZSBgZmlsdGVyYCBvcHRpb24gaXMgZmluZS4gIElmIHlvdSB1c2VcbiAgYm90aCB0aGVuIHRoZSBpbmRpdmlkdWFsIGZpbHRlciB3aWxsIGJlIGFkZGVkIGZpbHRlciBsaXN0IGFuZCB1c2VkIGluXG4gIHNlcmllcy5cblxuICBgYGBqc1xuICB2aWRlb3Byb2Moc3JjVmlkZW8sIHRhcmdldENhbnZhcywge1xuICAgIGZpbHRlcnM6IFtcbiAgICAgIHJlcXVpcmUoJ3J0Yy1maWx0ZXItZ3JheXNjYWxlJyksXG4gICAgICBteUN1c3RvbUZpbHRlckZ1bmN0aW9uXG4gICAgXVxuICB9KTtcbiAgYGBgXG5cbiAgIyMgV3JpdGluZyBhIEZpbHRlciBGdW5jdGlvblxuXG4gIFdyaXRpbmcgYSBmaWx0ZXIgZnVuY3Rpb24gaXMgdmVyeSBzaW1wbGUsIGFuZCB0aGV5IHVzZSB0aGUgZm9sbG93aW5nXG4gIGZ1bmN0aW9uIHNpZ25hdHVyZTpcblxuICBgYGBqc1xuICBmdW5jdGlvbiBmaWx0ZXIoaW1hZ2VEYXRhLCB0aWNrKSB7XG4gIH1cbiAgYGBgXG5cbiAgVGhlIGBpbWFnZURhdGFgIGFyZyBpcyBhblxuICBbSW1hZ2VEYXRhXShodHRwOi8vd3d3LnczLm9yZy9UUi8yZGNvbnRleHQvI2ltYWdlZGF0YSksIGFuZCB0aGUgYHRpY2tgXG4gIGFyZ3VtZW50IHJlZmVycyB0byB0aGUgdGljayB0aGF0IGhhcyBiZWVuIGNhcHR1cmVkIGFzIHBhcnQgb2YgdGhlIGNhcHR1cmVcbiAgbG9vcCAoYmUgYXdhcmUgdGhhdCBpdCBjb3VsZCBiZSBhIGhpZ2ggcmVzb2x1dGlvbiB0aW1lciB2YWx1ZSBpZiByQUYgaXNcbiAgYmVpbmcgdXNlZCkuXG5cbiAgSWYgeW91IGFyZSB3cml0aW5nIGFuIGFuYWx5c2lzIGZpbHRlciwgdGhlbiBzaW1wbHkgZG8gd2hhdCB5b3UgbmVlZCB0byBkb1xuICBhbmQgZXhpdCB0aGUgZnVuY3Rpb24uICBJZiB5b3UgaGF2ZSB3cml0dGVuIGEgZmlsdGVyIHRoYXQgbW9kaWZpZXMgdGhlIHBpeGVsXG4gIGRhdGEgYW5kIHlvdSB3YW50IHRoaXMgZHJhd24gYmFjayB0byB0aGUgY2FudmFzIHRoZW4geW91ciAqKmZpbHRlciBtdXN0XG4gIHJldHVybiBgdHJ1ZWAqKiB0byB0ZWxsIGBydGMtdmlkZW9wcm9jYCB0aGF0IGl0IHNob3VsZCBkcmF3IHRoZSBpbWFnZURhdGFcbiAgYmFjayB0byB0aGUgY2FudmFzLlxuXG4gICMjIExpc3RlbmluZyBmb3IgY3VzdG9tIGBmcmFtZWAgZXZlbnRzXG5cbiAgSW4gYWRkaXRpb24gdG8gcHJvdmlkaW5nIHRoZSBvcHBvcnR1bml0eSB0byBhbmFseXNlIGFuZCBtb2RpZnkgcGl4ZWwgZGF0YVxuICB0aGUgYHJ0Yy12aWRlb3Byb2NgIG1vZHVsZSBhbHNvIHByb3ZpZGVzIHRoZSBhIGN1c3RvbSBgZnJhbWVgIGV2ZW50IGZvclxuICBkZXRlY3Rpbmcgd2hlbiBhIG5ldyBmcmFtZSBoYXMgYmVlbiBkcmF3biB0byB0aGUgY2FudmFzLlxuXG4gIEEgc2ltcGxlIGV4YW1wbGUgY2FuIGJlIGZvdW5kIGJlbG93OlxuXG4gIDw8PCBleGFtcGxlcy9mcmFtZWxpc3RlbmVyLmpzXG5cbiAgTk9URTogVGhlIGBmcmFtZWAgZXZlbnQgb2NjdXJzIGFmdGVyIHRoZSBmaWx0ZXIgcGlwZWxpbmUgaGFzIGJlZW4gcnVuIGFuZFxuICBhbmQgdGhlIGltYWdlRGF0YSBtYXkgaGF2ZSBiZWVuIG1vZGlmaWVkIGZyb20gdGhlIG9yaWdpbmFsIHZpZGVvIGZyYW1lLlxuXG4gICMjIEEgTm90ZSB3aXRoIFJlZ2FyZHMgdG8gQ1BVIFVzYWdlXG5cbiAgQnkgZGVmYXVsdCBydGMtdmlkZW9wcm9jIHdpbGwgZHJhdyBhdCAyNWZwcyBidXQgdGhpcyBjYW4gYmUgbW9kaWZpZWQgdG8gY2FwdHVyZVxuICBhdCBhIGxvd2VyIGZyYW1lIHJhdGUgZm9yIHNsb3dlciBkZXZpY2VzLCBvciBpbmNyZWFzZWQgaWYgeW91IGhhdmUgYVxuICBtYWNoaW5lIHdpdGggcGxlbnR5IG9mIGdydW50LlxuXG4gICMjIFJlZmVyZW5jZVxuXG4gICMjIyB2aWRlb3Byb2Moc3JjLCB0YXJnZXQsIG9wdHM/KVxuXG4gIENyZWF0ZSAob3IgcGF0Y2gpIGEgYDxjYW52YXM+YCBlbGVtZW50IHRoYXQgd2lsbCByZWNlaXZlIHRoZSB2aWRlbyBpbWFnZXNcbiAgZnJvbSBhIHZpZGVvIGVsZW1lbnQuICBUaGUgZm9sbG93aW5nIG9wdGlvbnMgYXJlIHN1cHBvcnRlZC5cblxuICAtIGBjYW52YXNgIC0gdGhlIGNhbnZhcyB0byBkcmF3IHZpZGVvIGRhdGEgdG8uICBJZiBub3Qgc3VwcGxpZWQgYSBuZXcgXG4gICAgY2FudmFzIGVsZW1lbnQgd2lsbCBiZSBjcmVhdGVkLlxuXG4gIC0gYHZpZGVvYCAtIHRoZSB2aWRlbyBlbGVtZW50IHRoYXQgd2lsbCBiZSB1c2VkIGFzIHRoZSBzb3VyY2Ugb2YgdGhlIHZpZGVvLlxuICAgICBJZiBub3Qgc3VwcGxpZWQgYSBuZXcgYDx2aWRlbz5gIGVsZW1lbnQgd2lsbCBiZSBjcmVhdGVkLlxuXG4gIC0gYGZwc2AgLSB0aGUgcmVkcmF3IHJhdGUgb2YgdGhlIGZha2UgdmlkZW8gKGRlZmF1bHQgPSAyNSlcblxuICAtIGBncmVlZHlgIC0gU3BlY2lmeSBgZ3JlZWR5OiB0cnVlYCBpZiB5b3Ugd2FudCB0aGUgdmlkZW9wcm9jIG1vZHVsZSB0byBydW5cbiAgICBpdCdzIGNhcHR1cmUgbG9vcCB1c2luZyBzZXRUaW1lb3V0IHJhdGhlciB0aGFuIGByZXF1ZXN0QW5pbWF0aW9uRnJhbWVgLlxuICAgIERvaW5nIHRoaXMgd2lsbCBtZWFuIHlvdSBhcHBsaWNhdGlvbiB3aWxsIGNvbnRpbnVlIHRvIGNhcHR1cmUgYW5kIHByb2Nlc3NcbiAgICBmcmFtZXMgZXZlbiB3aGVuIGl0J3MgdGFiIC8gd2luZG93IGJlY29tZXMgaW5hY3RpdmUuIFRoaXMgaXMgdXN1YWxseSB0aGVcbiAgICBkZXNpcmVkIGJlaGF2aW91ciB3aXRoIHZpZGVvIGNvbmZlcmVuY2luZyBhcHBsaWNhdGlvbnMuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzcmMsIHRhcmdldCwgb3B0cykge1xuICAvLyBjaGVjayBmb3IgYSB2YWxpZCBzb3VyY2VcbiAgdmFyIHZhbGlkU291cmNlID0gdHlwZW9mIHNyYyAhPSAndW5kZWZpbmVkJzsgLy8gVE9ETzogYmV0dGVyIGNoZWNrXG4gIHZhciByZXNpemVDYW52YXMgPSBmYWxzZTtcbiAgdmFyIGZwcztcbiAgdmFyIGdyZWVkeTtcbiAgdmFyIGdyZWVkeURlbGF5O1xuICB2YXIgZHJhd0RlbGF5O1xuXG4gIC8vIGNyZWF0ZSBhbiBldmVudCBlbWl0dGVyIGZvciB0aGUgcHJvY2Vzc29yIG9iamVjdFxuICB2YXIgcHJvY2Vzc29yID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gIC8vIGNoZWNrIGZvciBubyB0YXJnZXQgYnV0IG9wdHMgc3VwcGxpZWRcbiAgdmFyIHNoaWZ0QXJncyA9ICghIG9wdHMpICYmICghIHRhcmdldCkgfHxcbiAgICAodHlwZW9mIHRhcmdldCA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgdGFyZ2V0LmdldENvbnRleHQgIT0gJ2Z1bmN0aW9uJyk7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgZHJhdyBtZXRhZGF0YVxuICB2YXIgZHJhd1dpZHRoO1xuICB2YXIgZHJhd0hlaWdodDtcbiAgdmFyIGRyYXdYID0gMDtcbiAgdmFyIGRyYXdZID0gMDtcbiAgdmFyIGRyYXdEYXRhO1xuICB2YXIgbGFzdFRpY2sgPSAwO1xuICB2YXIgc291cmNlTW9uaXRvclRpbWVyID0gMDtcbiAgdmFyIGNvbnRleHQ7XG5cbiAgZnVuY3Rpb24gc3luY0NhbnZhcygpIHtcbiAgICB0YXJnZXQud2lkdGggPSBzcmMudmlkZW9XaWR0aDtcbiAgICB0YXJnZXQuaGVpZ2h0ID0gc3JjLnZpZGVvSGVpZ2h0O1xuICAgIGNhbGN1bGF0ZURyYXdSZWdpb24oKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNhbGN1bGF0ZURyYXdSZWdpb24oKSB7XG4gICAgdmFyIHNjYWxlO1xuICAgIHZhciBzY2FsZVg7XG4gICAgdmFyIHNjYWxlWTtcblxuICAgIC8vIGlmIGVpdGhlciB3aWR0aCBvciBoZWlnaHQgPT09IDAgdGhlbiBiYWlsXG4gICAgaWYgKHRhcmdldC53aWR0aCA9PT0gMCB8fCB0YXJnZXQuaGVpZ2h0ID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gY2FsY3VsYXRlIHJlcXVpcmVkIHNjYWxpbmdcbiAgICBzY2FsZSA9IE1hdGgubWluKFxuICAgICAgc2NhbGVYID0gKHRhcmdldC53aWR0aCAvIHNyYy52aWRlb1dpZHRoKSxcbiAgICAgIHNjYWxlWSA9ICh0YXJnZXQuaGVpZ2h0IC8gc3JjLnZpZGVvSGVpZ2h0KVxuICAgICk7XG5cbiAgICAvLyBjYWxjdWxhdGUgdGhlIHNjYWxlZCBkcmF3IHdpZHRoIGFuZCBoZWlnaHRcbiAgICBkcmF3V2lkdGggPSAoc3JjLnZpZGVvV2lkdGggKiBzY2FsZSkgfCAwO1xuICAgIGRyYXdIZWlnaHQgPSAoc3JjLnZpZGVvSGVpZ2h0ICogc2NhbGUpIHwgMDtcblxuICAgIC8vIGNhbGN1bGF0ZSB0aGUgb2Zmc2V0WCBhbmQgWVxuICAgIGRyYXdYID0gKHRhcmdldC53aWR0aCAtIGRyYXdXaWR0aCkgPj4gMTtcbiAgICBkcmF3WSA9ICh0YXJnZXQuaGVpZ2h0IC0gZHJhd0hlaWdodCkgPj4gMTtcblxuICAgIC8vIHNhdmUgdGhlIGRyYXcgZGF0YVxuICAgIGRyYXdEYXRhID0ge1xuICAgICAgeDogZHJhd1gsXG4gICAgICB5OiBkcmF3WSxcbiAgICAgIHdpZHRoOiBkcmF3V2lkdGgsXG4gICAgICBoZWlnaHQ6IGRyYXdIZWlnaHRcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gbW9uaXRvclNvdXJjZSgpIHtcbiAgICBjbGVhckludGVydmFsKHNvdXJjZU1vbml0b3JUaW1lcik7XG4gICAgc291cmNlTW9uaXRvclRpbWVyID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoc3JjLnZpZGVvV2lkdGggPiAwICYmIHNyYy52aWRlb0hlaWdodCA+IDApIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChzb3VyY2VNb25pdG9yVGltZXIpO1xuICAgICAgICBzeW5jQ2FudmFzKCk7XG4gICAgICB9XG4gICAgfSwgMTAwKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlZHJhdyh0aWNrKSB7XG4gICAgdmFyIGltYWdlRGF0YTtcbiAgICB2YXIgdHdlYWtlZDtcbiAgICB2YXIgZXZ0O1xuICAgIHZhciBwb3N0UHJvY2Vzc0V2dDtcbiAgICB2YXIgdHdlYWtlZCA9IGZhbHNlO1xuICAgIHZhciBmcmFtZUxpc3RlbmVycyA9IHByb2Nlc3Nvci5saXN0ZW5lcnMoJ2ZyYW1lJykubGVuZ3RoO1xuXG4gICAgLy8gZ2V0IHRoZSBjdXJyZW50IHRpY2tcbiAgICB0aWNrID0gdGljayB8fCBEYXRlLm5vdygpO1xuXG4gICAgLy8gb25seSBkcmF3IGFzIG9mdGVuIGFzIHNwZWNpZmllZCBpbiB0aGUgZnBzXG4gICAgaWYgKGRyYXdXaWR0aCAmJiBkcmF3SGVpZ2h0ICYmIHRpY2sgLSBsYXN0VGljayA+IGRyYXdEZWxheSkge1xuICAgICAgLy8gZHJhdyB0aGUgaW1hZ2VcbiAgICAgIGNvbnRleHQuZHJhd0ltYWdlKHNyYywgZHJhd1gsIGRyYXdZLCBkcmF3V2lkdGgsIGRyYXdIZWlnaHQpO1xuXG4gICAgICAvLyBpZiB3ZSBoYXZlIHByb2Nlc3NvcnMsIGdldCB0aGUgaW1hZ2UgZGF0YSBhbmQgcGFzcyBpdCB0aHJvdWdoXG4gICAgICBpZiAocHJvY2Vzc29yLmZpbHRlcnMubGVuZ3RoKSB7XG4gICAgICAgIHR3ZWFrZWQgPSBmYWxzZTtcbiAgICAgICAgaW1hZ2VEYXRhID0gY29udGV4dC5nZXRJbWFnZURhdGEoMCwgMCwgZHJhd1dpZHRoLCBkcmF3SGVpZ2h0KTtcblxuICAgICAgICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHByb2Nlc3NvcnNcbiAgICAgICAgcHJvY2Vzc29yLmZpbHRlcnMuZm9yRWFjaChmdW5jdGlvbihmaWx0ZXIpIHtcbiAgICAgICAgICB0d2Vha2VkID0gZmlsdGVyKGltYWdlRGF0YSwgdGljaywgY29udGV4dCwgdGFyZ2V0LCBkcmF3RGF0YSkgfHwgdHdlYWtlZDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHR3ZWFrZWQpIHtcbiAgICAgICAgICAvLyBUT0RPOiBkaXJ0eSBhcmVhXG4gICAgICAgICAgY29udGV4dC5wdXRJbWFnZURhdGEoaW1hZ2VEYXRhLCAwLCAwKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyB1cGRhdGUgdGhlIHByb2Nlc3NvciBpbWFnZURhdGFcbiAgICAgIHByb2Nlc3Nvci5pbWFnZURhdGEgPSBpbWFnZURhdGE7XG5cbiAgICAgIC8vIGVtaXQgdGhlIHByb2Nlc3NvciBmcmFtZSBldmVudFxuICAgICAgcHJvY2Vzc29yLmVtaXQoJ2ZyYW1lJywgdGljayk7XG5cbiAgICAgIC8vIHVwZGF0ZSB0aGUgbGFzdCB0aWNrXG4gICAgICBsYXN0VGljayA9IHRpY2s7XG4gICAgfVxuXG4gICAgLy8gcXVldWUgdXAgYW5vdGhlciByZWRyYXdcbiAgICBpZiAoZ3JlZWR5KSB7XG4gICAgICBzZXRUaW1lb3V0KHJlZHJhdywgZ3JlZWR5RGVsYXkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJhZihyZWRyYXcpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChzaGlmdEFyZ3MpIHtcbiAgICBvcHRzID0gdGFyZ2V0O1xuICAgIHRhcmdldCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICB9XG5cbiAgLy8gc2F2ZSB0aGUgdGFyZ2V0IHRvIHRoZSBjYW52YXMgcHJvcGVydHkgb2YgdGhlIHByb2Nlc3NvclxuICBwcm9jZXNzb3IuY2FudmFzID0gdGFyZ2V0O1xuICBjb250ZXh0ID0gcHJvY2Vzc29yLmNvbnRleHQgPSB0YXJnZXQuZ2V0Q29udGV4dCgnMmQnKTtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBmcHNcbiAgZnBzID0gKG9wdHMgfHwge30pLmZwcyB8fCBERUZBVUxUX0ZQUztcbiAgZ3JlZWR5ID0gKG9wdHMgfHwge30pLmdyZWVkeTtcblxuICAvLyBzZXRUaW1lb3V0IHNob3VsZCBvY2N1ciBtb3JlIGZyZXF1ZW50bHkgdGhhbiB0aGUgZnBzXG4gIC8vIGRlbGF5IHNvIHdlIGdldCBjbG9zZSB0byB0aGUgZGVzaXJlZCBmcHNcbiAgZ3JlZWR5RGVsYXkgPSAoMTAwMCAvIGZwcykgPj4gMTtcblxuICAvLyBjYWxhY3VsYXRlIHRoZSBkcmF3IGRlbGF5LCBjbGFtcCBhcyBpbnRcbiAgZHJhd0RlbGF5ID0gKDEwMDAgLyBmcHMpIHwgMDtcblxuICAvLyBkZXRlcm1pbmUgd2hldGhlciB3ZSBzaG91bGQgcmVzaXplIHRoZSBjYW52YXMgb3Igbm90XG4gIHJlc2l6ZUNhbnZhcyA9IHRhcmdldC53aWR0aCA9PT0gMCB8fCB0YXJnZXQuaGVpZ2h0ID09PSAwO1xuXG4gIC8vIGlmIHdlJ3ZlIGJlZW4gcHJvdmlkZWQgYSBmaWx0ZXJzIGFycmF5IGluIG9wdGlvbnMgaW5pdGlhbGlzZSB0aGUgZmlsdGVyc1xuICAvLyB3aXRoIHRob3NlIGZ1bmN0aW9uc1xuICBwcm9jZXNzb3IuZmlsdGVycyA9ICgob3B0cyB8fCB7fSkuZmlsdGVycyB8fCBbXSkuZmlsdGVyKGZ1bmN0aW9uKGZpbHRlcikge1xuICAgIHJldHVybiB0eXBlb2YgZmlsdGVyID09ICdmdW5jdGlvbic7XG4gIH0pO1xuXG4gIC8vIGlmIGEgJ2ZpbHRlcicgb3B0aW9uIGhhcyBiZWVuIHByb3ZpZGVkLCB0aGVuIGFwcGVuZCB0byB0aGUgZmlsdGVycyBhcnJheVxuICBpZiAob3B0cyAmJiB0eXBlb2Ygb3B0cy5maWx0ZXIgPT0gJ2Z1bmN0aW9uJykge1xuICAgIHByb2Nlc3Nvci5maWx0ZXJzLnB1c2gob3B0cy5maWx0ZXIpO1xuICB9XG5cbiAgLy8gaWYgd2UgYXJlIHJlc2l6aW5nIHRoZSBjYW52YXMsIHRoZW4gYXMgdGhlIHZpZGVvIG1ldGFkYXRhIGNoYW5nZXNcbiAgLy8gcmVzeW5jIHRoZSBjYW52YXNcbiAgc3JjLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWRlZG1ldGFkYXRhJywgbW9uaXRvclNvdXJjZSk7XG4gIHNyYy5hZGRFdmVudExpc3RlbmVyKCdjYW5wbGF5JywgbW9uaXRvclNvdXJjZSk7XG5cbiAgLy8gY2FsY3VsYXRlIHRoZSBpbml0aWFsIGRyYXcgbWV0YWRhdGEgKHdpbGwgYmUgcmVjYWxjdWxhdGVkIG9uIHZpZGVvIHN0cmVhbSBjaGFuZ2VzKVxuICBjYWxjdWxhdGVEcmF3UmVnaW9uKCk7XG5cbiAgLy8gc3RhcnQgdGhlIHJlZHJhd1xuICByYWYocmVkcmF3KTtcblxuICByZXR1cm4gcHJvY2Vzc29yO1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIHdpbmRvdzogZmFsc2UgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIFRFU1RfUFJPUFMgPSBbJ3InLCAnd2Via2l0UicsICdtb3pSJywgJ29SJywgJ21zUiddO1xuXG4vKipcbiAgIyMjIHJhZihjYWxsYmFjaylcblxuICBSZXF1ZXN0IGFuaW1hdGlvbiBmcmFtZSBoZWxwZXIuXG5cbiAgPDw8IGV4YW1wbGVzL3JhZi5qc1xuXG4qKi9cblxubW9kdWxlLmV4cG9ydHMgPSB0eXBlb2Ygd2luZG93ICE9ICd1bmRlZmluZWQnICYmIChmdW5jdGlvbigpIHtcbiAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IFRFU1RfUFJPUFMubGVuZ3RoOyBpaSsrKSB7XG4gICAgd2luZG93LmFuaW1GcmFtZSA9IHdpbmRvdy5hbmltRnJhbWUgfHxcbiAgICAgIHdpbmRvd1tURVNUX1BST1BTW2lpXSArICdlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICB9IC8vIGZvclxuXG4gIHJldHVybiBhbmltRnJhbWU7XG59KSgpOyIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiJdfQ==
