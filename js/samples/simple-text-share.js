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
// rtc-quickconnect requires a signalling server location and a room name.
var quickConnectMod = require('rtc-quickconnect');
var quickConnectObj = quickConnectMod('//switchboard.rtc.io', { room: 'rtcio-text-demo' });

// Create the text area for chatting
var messageWindow = document.createElement('textarea');
messageWindow.rows = 20;
messageWindow.cols = 80;

var bodyElement = document.getElementsByTagName('body')[0];
bodyElement.appendChild(messageWindow);

// Create a data channel and bind to it's events
quickConnectObj.createDataChannel('shared-text');
quickConnectObj.on('channel:opened:shared-text', function (id, dataChannel) {
  	bindDataEvents(dataChannel);
});

function bindDataEvents(channel) {
	// Receive message
	channel.onmessage = function (evt) {
		messageWindow.value = evt.data;
	};

	// Send message
	messageWindow.onkeyup = function (evt) {
		channel.send(this.value);
	};
}

},{"rtc-quickconnect":13}],3:[function(require,module,exports){
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

},{"detect-browser":11}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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

},{"./detect":9}],13:[function(require,module,exports){
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

},{"./lib/calls":14,"./lib/getpeerdata":15,"cog/extend":4,"mbus":17,"rtc-core/genice":10,"rtc-core/plugin":12,"rtc-pluggable-signaller":18,"rtc-tools":52}],14:[function(require,module,exports){
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

},{"./getpeerdata":15,"./heartbeat":16,"_process":1,"cog/getable":5,"rtc-tools":52,"rtc-tools/cleanup":48}],15:[function(require,module,exports){
module.exports = function(peers) {
  return function(id) {
    var peer = peers.get(id);
    return peer && peer.data;
  };
};

},{}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

},{"rtc-signaller":31,"rtc-switchboard-messenger":19}],19:[function(require,module,exports){
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

},{"cog/extend":4,"messenger-ws":20}],20:[function(require,module,exports){
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

},{"cog/defaults":3,"pull-ws":21,"ws":26,"wsurl":27}],21:[function(require,module,exports){
exports = module.exports = duplex;

exports.source = require('./source');
exports.sink = require('./sink');

function duplex (ws, opts) {
  return {
    source: exports.source(ws),
    sink: exports.sink(ws, opts)
  };
};

},{"./sink":24,"./source":25}],22:[function(require,module,exports){
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


},{}],23:[function(require,module,exports){
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

},{}],24:[function(require,module,exports){
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

},{"./ready":23,"_process":1,"pull-core":22}],25:[function(require,module,exports){
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

},{"./ready":23,"pull-core":22}],26:[function(require,module,exports){

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

},{}],27:[function(require,module,exports){
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

},{}],28:[function(require,module,exports){
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

},{}],29:[function(require,module,exports){
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

},{"cog/extend":4}],30:[function(require,module,exports){
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

},{"./announce":29}],31:[function(require,module,exports){
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

},{"./defaults":28,"./processor":47,"cog/defaults":3,"cog/extend":4,"cog/getable":5,"cuid":32,"mbus":33,"pull-pushable":34,"pull-stream":41,"rtc-core/detect":9}],32:[function(require,module,exports){
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

},{}],33:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"dup":17}],34:[function(require,module,exports){
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


},{"pull-stream":35}],35:[function(require,module,exports){

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



},{"./maybe":36,"./sinks":38,"./sources":39,"./throughs":40,"pull-core":37}],36:[function(require,module,exports){
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

},{"pull-core":37}],37:[function(require,module,exports){
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


},{}],38:[function(require,module,exports){
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


},{}],39:[function(require,module,exports){

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


},{}],40:[function(require,module,exports){
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

},{"./sinks":38,"./sources":39,"_process":1,"pull-core":37}],41:[function(require,module,exports){
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



},{"./maybe":42,"./sinks":44,"./sources":45,"./throughs":46,"pull-core":43}],42:[function(require,module,exports){
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

},{"pull-core":43}],43:[function(require,module,exports){
arguments[4][37][0].apply(exports,arguments)
},{"dup":37}],44:[function(require,module,exports){
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


},{}],45:[function(require,module,exports){

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


},{}],46:[function(require,module,exports){
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

},{"./sinks":44,"./sources":45,"_process":1,"pull-core":43}],47:[function(require,module,exports){
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

},{"./handlers":30,"cog/jsonparse":6}],48:[function(require,module,exports){
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

},{"cog/logger":7}],49:[function(require,module,exports){
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

},{"./cleanup":48,"./monitor":53,"cog/logger":7,"cog/throttle":8,"mbus":54,"rtc-taskqueue":55,"whisk/pluck":65}],50:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ### rtc-tools/detect

  Provide the [rtc-core/detect](https://github.com/rtc-io/rtc-core#detect)
  functionality.
**/
module.exports = require('rtc-core/detect');

},{"rtc-core/detect":9}],51:[function(require,module,exports){
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

},{"./detect":50,"cog/defaults":3,"cog/logger":7}],52:[function(require,module,exports){
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

},{"./couple":49,"./detect":50,"./generators":51,"cog/logger":7,"rtc-core/plugin":12}],53:[function(require,module,exports){
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

},{"mbus":54}],54:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"dup":17}],55:[function(require,module,exports){
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

},{"mbus":54,"priorityqueuejs":56,"rtc-core/detect":9,"rtc-core/plugin":12,"rtc-sdp":57,"rtc-sdpclean":59,"rtc-validator/candidate":60,"whisk/pluck":65}],56:[function(require,module,exports){
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

},{}],57:[function(require,module,exports){
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

},{"./parsers":58,"whisk/flatten":62,"whisk/nub":64,"whisk/pluck":65}],58:[function(require,module,exports){
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
},{}],59:[function(require,module,exports){
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

},{"rtc-validator/candidate":60}],60:[function(require,module,exports){
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

},{"cog/logger":7}],61:[function(require,module,exports){
module.exports = function(a, b) {
  return arguments.length > 1 ? a === b : function(b) {
    return a === b;
  };
};

},{}],62:[function(require,module,exports){
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
},{}],63:[function(require,module,exports){
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
},{}],64:[function(require,module,exports){
/**
  ## nub

  Return only the unique elements of the list.

  <<< examples/nub.js

**/

module.exports = require('./nub-by')(require('./equality'));
},{"./equality":61,"./nub-by":63}],65:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5udm0vdmVyc2lvbnMvbm9kZS92MC4xMi4xL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiLi4vLi4vLi4vLm52bS92ZXJzaW9ucy9ub2RlL3YwLjEyLjEvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJjb2RlL3NpbXBsZS10ZXh0LXNoYXJlLmpzIiwibm9kZV9tb2R1bGVzL2NvZy9kZWZhdWx0cy5qcyIsIm5vZGVfbW9kdWxlcy9jb2cvZXh0ZW5kLmpzIiwibm9kZV9tb2R1bGVzL2NvZy9nZXRhYmxlLmpzIiwibm9kZV9tb2R1bGVzL2NvZy9qc29ucGFyc2UuanMiLCJub2RlX21vZHVsZXMvY29nL2xvZ2dlci5qcyIsIm5vZGVfbW9kdWxlcy9jb2cvdGhyb3R0bGUuanMiLCJub2RlX21vZHVsZXMvcnRjLWNvcmUvZGV0ZWN0LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1jb3JlL2dlbmljZS5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtY29yZS9ub2RlX21vZHVsZXMvZGV0ZWN0LWJyb3dzZXIvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtY29yZS9wbHVnaW4uanMiLCJub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L2xpYi9jYWxscy5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L2xpYi9nZXRwZWVyZGF0YS5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L2xpYi9oZWFydGJlYXQuanMiLCJub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvbWJ1cy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtcGx1Z2dhYmxlLXNpZ25hbGxlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtcGx1Z2dhYmxlLXNpZ25hbGxlci9ub2RlX21vZHVsZXMvcnRjLXN3aXRjaGJvYXJkLW1lc3Nlbmdlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtcXVpY2tjb25uZWN0L25vZGVfbW9kdWxlcy9ydGMtcGx1Z2dhYmxlLXNpZ25hbGxlci9ub2RlX21vZHVsZXMvcnRjLXN3aXRjaGJvYXJkLW1lc3Nlbmdlci9ub2RlX21vZHVsZXMvbWVzc2VuZ2VyLXdzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy1wbHVnZ2FibGUtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9ydGMtc3dpdGNoYm9hcmQtbWVzc2VuZ2VyL25vZGVfbW9kdWxlcy9tZXNzZW5nZXItd3Mvbm9kZV9tb2R1bGVzL3B1bGwtd3MvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXBsdWdnYWJsZS1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL3J0Yy1zd2l0Y2hib2FyZC1tZXNzZW5nZXIvbm9kZV9tb2R1bGVzL21lc3Nlbmdlci13cy9ub2RlX21vZHVsZXMvcHVsbC13cy9ub2RlX21vZHVsZXMvcHVsbC1jb3JlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy1wbHVnZ2FibGUtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9ydGMtc3dpdGNoYm9hcmQtbWVzc2VuZ2VyL25vZGVfbW9kdWxlcy9tZXNzZW5nZXItd3Mvbm9kZV9tb2R1bGVzL3B1bGwtd3MvcmVhZHkuanMiLCJub2RlX21vZHVsZXMvcnRjLXF1aWNrY29ubmVjdC9ub2RlX21vZHVsZXMvcnRjLXBsdWdnYWJsZS1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL3J0Yy1zd2l0Y2hib2FyZC1tZXNzZW5nZXIvbm9kZV9tb2R1bGVzL21lc3Nlbmdlci13cy9ub2RlX21vZHVsZXMvcHVsbC13cy9zaW5rLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy1wbHVnZ2FibGUtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9ydGMtc3dpdGNoYm9hcmQtbWVzc2VuZ2VyL25vZGVfbW9kdWxlcy9tZXNzZW5nZXItd3Mvbm9kZV9tb2R1bGVzL3B1bGwtd3Mvc291cmNlLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy1wbHVnZ2FibGUtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9ydGMtc3dpdGNoYm9hcmQtbWVzc2VuZ2VyL25vZGVfbW9kdWxlcy9tZXNzZW5nZXItd3Mvbm9kZV9tb2R1bGVzL3dzL2xpYi9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1xdWlja2Nvbm5lY3Qvbm9kZV9tb2R1bGVzL3J0Yy1wbHVnZ2FibGUtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9ydGMtc3dpdGNoYm9hcmQtbWVzc2VuZ2VyL25vZGVfbW9kdWxlcy9tZXNzZW5nZXItd3Mvbm9kZV9tb2R1bGVzL3dzdXJsL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvZGVmYXVsdHMuanMiLCJub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9oYW5kbGVycy9hbm5vdW5jZS5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL2hhbmRsZXJzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9ub2RlX21vZHVsZXMvY3VpZC9kaXN0L2Jyb3dzZXItY3VpZC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9wdWxsLXB1c2hhYmxlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL3B1bGwtcHVzaGFibGUvbm9kZV9tb2R1bGVzL3B1bGwtc3RyZWFtL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL3B1bGwtcHVzaGFibGUvbm9kZV9tb2R1bGVzL3B1bGwtc3RyZWFtL21heWJlLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL3B1bGwtcHVzaGFibGUvbm9kZV9tb2R1bGVzL3B1bGwtc3RyZWFtL25vZGVfbW9kdWxlcy9wdWxsLWNvcmUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9ub2RlX21vZHVsZXMvcHVsbC1wdXNoYWJsZS9ub2RlX21vZHVsZXMvcHVsbC1zdHJlYW0vc2lua3MuanMiLCJub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9ub2RlX21vZHVsZXMvcHVsbC1wdXNoYWJsZS9ub2RlX21vZHVsZXMvcHVsbC1zdHJlYW0vc291cmNlcy5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9wdWxsLXB1c2hhYmxlL25vZGVfbW9kdWxlcy9wdWxsLXN0cmVhbS90aHJvdWdocy5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9wdWxsLXN0cmVhbS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9wdWxsLXN0cmVhbS9tYXliZS5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9wdWxsLXN0cmVhbS9zaW5rcy5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9wdWxsLXN0cmVhbS9zb3VyY2VzLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL3B1bGwtc3RyZWFtL3Rocm91Z2hzLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvcHJvY2Vzc29yLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy10b29scy9jbGVhbnVwLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy10b29scy9jb3VwbGUuanMiLCJub2RlX21vZHVsZXMvcnRjLXRvb2xzL2RldGVjdC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtdG9vbHMvZ2VuZXJhdG9ycy5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtdG9vbHMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcnRjLXRvb2xzL21vbml0b3IuanMiLCJub2RlX21vZHVsZXMvcnRjLXRvb2xzL25vZGVfbW9kdWxlcy9ydGMtdGFza3F1ZXVlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy10b29scy9ub2RlX21vZHVsZXMvcnRjLXRhc2txdWV1ZS9ub2RlX21vZHVsZXMvcHJpb3JpdHlxdWV1ZWpzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy10b29scy9ub2RlX21vZHVsZXMvcnRjLXRhc2txdWV1ZS9ub2RlX21vZHVsZXMvcnRjLXNkcC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtdG9vbHMvbm9kZV9tb2R1bGVzL3J0Yy10YXNrcXVldWUvbm9kZV9tb2R1bGVzL3J0Yy1zZHAvcGFyc2Vycy5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtdG9vbHMvbm9kZV9tb2R1bGVzL3J0Yy10YXNrcXVldWUvbm9kZV9tb2R1bGVzL3J0Yy1zZHBjbGVhbi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ydGMtdG9vbHMvbm9kZV9tb2R1bGVzL3J0Yy10YXNrcXVldWUvbm9kZV9tb2R1bGVzL3J0Yy12YWxpZGF0b3IvY2FuZGlkYXRlLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy10b29scy9ub2RlX21vZHVsZXMvd2hpc2svZXF1YWxpdHkuanMiLCJub2RlX21vZHVsZXMvcnRjLXRvb2xzL25vZGVfbW9kdWxlcy93aGlzay9mbGF0dGVuLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy10b29scy9ub2RlX21vZHVsZXMvd2hpc2svbnViLWJ5LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy10b29scy9ub2RlX21vZHVsZXMvd2hpc2svbnViLmpzIiwibm9kZV9tb2R1bGVzL3J0Yy10b29scy9ub2RlX21vZHVsZXMvd2hpc2svcGx1Y2suanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDNXJCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcmJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzlHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDdEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNwU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDNUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdlVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IHRydWU7XG4gICAgdmFyIGN1cnJlbnRRdWV1ZTtcbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgdmFyIGkgPSAtMTtcbiAgICAgICAgd2hpbGUgKCsraSA8IGxlbikge1xuICAgICAgICAgICAgY3VycmVudFF1ZXVlW2ldKCk7XG4gICAgICAgIH1cbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xufVxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICBxdWV1ZS5wdXNoKGZ1bik7XG4gICAgaWYgKCFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiLy8gcnRjLXF1aWNrY29ubmVjdCByZXF1aXJlcyBhIHNpZ25hbGxpbmcgc2VydmVyIGxvY2F0aW9uIGFuZCBhIHJvb20gbmFtZS5cbnZhciBxdWlja0Nvbm5lY3RNb2QgPSByZXF1aXJlKCdydGMtcXVpY2tjb25uZWN0Jyk7XG52YXIgcXVpY2tDb25uZWN0T2JqID0gcXVpY2tDb25uZWN0TW9kKCcvL3N3aXRjaGJvYXJkLnJ0Yy5pbycsIHsgcm9vbTogJ3J0Y2lvLXRleHQtZGVtbycgfSk7XG5cbi8vIENyZWF0ZSB0aGUgdGV4dCBhcmVhIGZvciBjaGF0dGluZ1xudmFyIG1lc3NhZ2VXaW5kb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZXh0YXJlYScpO1xubWVzc2FnZVdpbmRvdy5yb3dzID0gMjA7XG5tZXNzYWdlV2luZG93LmNvbHMgPSA4MDtcblxudmFyIGJvZHlFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2JvZHknKVswXTtcbmJvZHlFbGVtZW50LmFwcGVuZENoaWxkKG1lc3NhZ2VXaW5kb3cpO1xuXG4vLyBDcmVhdGUgYSBkYXRhIGNoYW5uZWwgYW5kIGJpbmQgdG8gaXQncyBldmVudHNcbnF1aWNrQ29ubmVjdE9iai5jcmVhdGVEYXRhQ2hhbm5lbCgnc2hhcmVkLXRleHQnKTtcbnF1aWNrQ29ubmVjdE9iai5vbignY2hhbm5lbDpvcGVuZWQ6c2hhcmVkLXRleHQnLCBmdW5jdGlvbiAoaWQsIGRhdGFDaGFubmVsKSB7XG4gIFx0YmluZERhdGFFdmVudHMoZGF0YUNoYW5uZWwpO1xufSk7XG5cbmZ1bmN0aW9uIGJpbmREYXRhRXZlbnRzKGNoYW5uZWwpIHtcblx0Ly8gUmVjZWl2ZSBtZXNzYWdlXG5cdGNoYW5uZWwub25tZXNzYWdlID0gZnVuY3Rpb24gKGV2dCkge1xuXHRcdG1lc3NhZ2VXaW5kb3cudmFsdWUgPSBldnQuZGF0YTtcblx0fTtcblxuXHQvLyBTZW5kIG1lc3NhZ2Vcblx0bWVzc2FnZVdpbmRvdy5vbmtleXVwID0gZnVuY3Rpb24gKGV2dCkge1xuXHRcdGNoYW5uZWwuc2VuZCh0aGlzLnZhbHVlKTtcblx0fTtcbn1cbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuIyMgY29nL2RlZmF1bHRzXG5cbmBgYGpzXG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCdjb2cvZGVmYXVsdHMnKTtcbmBgYFxuXG4jIyMgZGVmYXVsdHModGFyZ2V0LCAqKVxuXG5TaGFsbG93IGNvcHkgb2JqZWN0IHByb3BlcnRpZXMgZnJvbSB0aGUgc3VwcGxpZWQgc291cmNlIG9iamVjdHMgKCopIGludG9cbnRoZSB0YXJnZXQgb2JqZWN0LCByZXR1cm5pbmcgdGhlIHRhcmdldCBvYmplY3Qgb25jZSBjb21wbGV0ZWQuICBEbyBub3QsXG5ob3dldmVyLCBvdmVyd3JpdGUgZXhpc3Rpbmcga2V5cyB3aXRoIG5ldyB2YWx1ZXM6XG5cbmBgYGpzXG5kZWZhdWx0cyh7IGE6IDEsIGI6IDIgfSwgeyBjOiAzIH0sIHsgZDogNCB9LCB7IGI6IDUgfSkpO1xuYGBgXG5cblNlZSBhbiBleGFtcGxlIG9uIFtyZXF1aXJlYmluXShodHRwOi8vcmVxdWlyZWJpbi5jb20vP2dpc3Q9NjA3OTQ3NSkuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIGEgdGFyZ2V0XG4gIHRhcmdldCA9IHRhcmdldCB8fCB7fTtcblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHNvdXJjZXMgYW5kIGNvcHkgdG8gdGhlIHRhcmdldFxuICBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkuZm9yRWFjaChmdW5jdGlvbihzb3VyY2UpIHtcbiAgICBpZiAoISBzb3VyY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgaWYgKHRhcmdldFtwcm9wXSA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiB0YXJnZXQ7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuIyMgY29nL2V4dGVuZFxuXG5gYGBqc1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcbmBgYFxuXG4jIyMgZXh0ZW5kKHRhcmdldCwgKilcblxuU2hhbGxvdyBjb3B5IG9iamVjdCBwcm9wZXJ0aWVzIGZyb20gdGhlIHN1cHBsaWVkIHNvdXJjZSBvYmplY3RzICgqKSBpbnRvXG50aGUgdGFyZ2V0IG9iamVjdCwgcmV0dXJuaW5nIHRoZSB0YXJnZXQgb2JqZWN0IG9uY2UgY29tcGxldGVkOlxuXG5gYGBqc1xuZXh0ZW5kKHsgYTogMSwgYjogMiB9LCB7IGM6IDMgfSwgeyBkOiA0IH0sIHsgYjogNSB9KSk7XG5gYGBcblxuU2VlIGFuIGV4YW1wbGUgb24gW3JlcXVpcmViaW5dKGh0dHA6Ly9yZXF1aXJlYmluLmNvbS8/Z2lzdD02MDc5NDc1KS5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0YXJnZXQpIHtcbiAgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLmZvckVhY2goZnVuY3Rpb24oc291cmNlKSB7XG4gICAgaWYgKCEgc291cmNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiB0YXJnZXQ7XG59OyIsIi8qKlxuICAjIyBjb2cvZ2V0YWJsZVxuXG4gIFRha2UgYW4gb2JqZWN0IGFuZCBwcm92aWRlIGEgd3JhcHBlciB0aGF0IGFsbG93cyB5b3UgdG8gYGdldGAgYW5kXG4gIGBzZXRgIHZhbHVlcyBvbiB0aGF0IG9iamVjdC5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICBmdW5jdGlvbiBnZXQoa2V5KSB7XG4gICAgcmV0dXJuIHRhcmdldFtrZXldO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0KGtleSwgdmFsdWUpIHtcbiAgICB0YXJnZXRba2V5XSA9IHZhbHVlO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlKGtleSkge1xuICAgIHJldHVybiBkZWxldGUgdGFyZ2V0W2tleV07XG4gIH1cblxuICBmdW5jdGlvbiBrZXlzKCkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh0YXJnZXQpO1xuICB9O1xuXG4gIGZ1bmN0aW9uIHZhbHVlcygpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXModGFyZ2V0KS5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gdGFyZ2V0W2tleV07XG4gICAgfSk7XG4gIH07XG5cbiAgaWYgKHR5cGVvZiB0YXJnZXQgIT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBnZXQ6IGdldCxcbiAgICBzZXQ6IHNldCxcbiAgICByZW1vdmU6IHJlbW92ZSxcbiAgICBkZWxldGU6IHJlbW92ZSxcbiAgICBrZXlzOiBrZXlzLFxuICAgIHZhbHVlczogdmFsdWVzXG4gIH07XG59O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMjIGNvZy9qc29ucGFyc2VcblxuICBgYGBqc1xuICB2YXIganNvbnBhcnNlID0gcmVxdWlyZSgnY29nL2pzb25wYXJzZScpO1xuICBgYGBcblxuICAjIyMganNvbnBhcnNlKGlucHV0KVxuXG4gIFRoaXMgZnVuY3Rpb24gd2lsbCBhdHRlbXB0IHRvIGF1dG9tYXRpY2FsbHkgZGV0ZWN0IHN0cmluZ2lmaWVkIEpTT04sIGFuZFxuICB3aGVuIGRldGVjdGVkIHdpbGwgcGFyc2UgaW50byBKU09OIG9iamVjdHMuICBUaGUgZnVuY3Rpb24gbG9va3MgZm9yIHN0cmluZ3NcbiAgdGhhdCBsb29rIGFuZCBzbWVsbCBsaWtlIHN0cmluZ2lmaWVkIEpTT04sIGFuZCBpZiBmb3VuZCBhdHRlbXB0cyB0b1xuICBgSlNPTi5wYXJzZWAgdGhlIGlucHV0IGludG8gYSB2YWxpZCBvYmplY3QuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpbnB1dCkge1xuICB2YXIgaXNTdHJpbmcgPSB0eXBlb2YgaW5wdXQgPT0gJ3N0cmluZycgfHwgKGlucHV0IGluc3RhbmNlb2YgU3RyaW5nKTtcbiAgdmFyIHJlTnVtZXJpYyA9IC9eXFwtP1xcZCtcXC4/XFxkKiQvO1xuICB2YXIgc2hvdWxkUGFyc2UgO1xuICB2YXIgZmlyc3RDaGFyO1xuICB2YXIgbGFzdENoYXI7XG5cbiAgaWYgKCghIGlzU3RyaW5nKSB8fCBpbnB1dC5sZW5ndGggPCAyKSB7XG4gICAgaWYgKGlzU3RyaW5nICYmIHJlTnVtZXJpYy50ZXN0KGlucHV0KSkge1xuICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoaW5wdXQpO1xuICAgIH1cblxuICAgIHJldHVybiBpbnB1dDtcbiAgfVxuXG4gIC8vIGNoZWNrIGZvciB0cnVlIG9yIGZhbHNlXG4gIGlmIChpbnB1dCA9PT0gJ3RydWUnIHx8IGlucHV0ID09PSAnZmFsc2UnKSB7XG4gICAgcmV0dXJuIGlucHV0ID09PSAndHJ1ZSc7XG4gIH1cblxuICAvLyBjaGVjayBmb3IgbnVsbFxuICBpZiAoaW5wdXQgPT09ICdudWxsJykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gZ2V0IHRoZSBmaXJzdCBhbmQgbGFzdCBjaGFyYWN0ZXJzXG4gIGZpcnN0Q2hhciA9IGlucHV0LmNoYXJBdCgwKTtcbiAgbGFzdENoYXIgPSBpbnB1dC5jaGFyQXQoaW5wdXQubGVuZ3RoIC0gMSk7XG5cbiAgLy8gZGV0ZXJtaW5lIHdoZXRoZXIgd2Ugc2hvdWxkIEpTT04ucGFyc2UgdGhlIGlucHV0XG4gIHNob3VsZFBhcnNlID1cbiAgICAoZmlyc3RDaGFyID09ICd7JyAmJiBsYXN0Q2hhciA9PSAnfScpIHx8XG4gICAgKGZpcnN0Q2hhciA9PSAnWycgJiYgbGFzdENoYXIgPT0gJ10nKSB8fFxuICAgIChmaXJzdENoYXIgPT0gJ1wiJyAmJiBsYXN0Q2hhciA9PSAnXCInKTtcblxuICBpZiAoc2hvdWxkUGFyc2UpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIEpTT04ucGFyc2UoaW5wdXQpO1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgLy8gYXBwYXJlbnRseSBpdCB3YXNuJ3QgdmFsaWQganNvbiwgY2Fycnkgb24gd2l0aCByZWd1bGFyIHByb2Nlc3NpbmdcbiAgICB9XG4gIH1cblxuXG4gIHJldHVybiByZU51bWVyaWMudGVzdChpbnB1dCkgPyBwYXJzZUZsb2F0KGlucHV0KSA6IGlucHV0O1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyMgY29nL2xvZ2dlclxuXG4gIGBgYGpzXG4gIHZhciBsb2dnZXIgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJyk7XG4gIGBgYFxuXG4gIFNpbXBsZSBicm93c2VyIGxvZ2dpbmcgb2ZmZXJpbmcgc2ltaWxhciBmdW5jdGlvbmFsaXR5IHRvIHRoZVxuICBbZGVidWddKGh0dHBzOi8vZ2l0aHViLmNvbS92aXNpb25tZWRpYS9kZWJ1ZykgbW9kdWxlLlxuXG4gICMjIyBVc2FnZVxuXG4gIENyZWF0ZSB5b3VyIHNlbGYgYSBuZXcgbG9nZ2luZyBpbnN0YW5jZSBhbmQgZ2l2ZSBpdCBhIG5hbWU6XG5cbiAgYGBganNcbiAgdmFyIGRlYnVnID0gbG9nZ2VyKCdwaGlsJyk7XG4gIGBgYFxuXG4gIE5vdyBkbyBzb21lIGRlYnVnZ2luZzpcblxuICBgYGBqc1xuICBkZWJ1ZygnaGVsbG8nKTtcbiAgYGBgXG5cbiAgQXQgdGhpcyBzdGFnZSwgbm8gbG9nIG91dHB1dCB3aWxsIGJlIGdlbmVyYXRlZCBiZWNhdXNlIHlvdXIgbG9nZ2VyIGlzXG4gIGN1cnJlbnRseSBkaXNhYmxlZC4gIEVuYWJsZSBpdDpcblxuICBgYGBqc1xuICBsb2dnZXIuZW5hYmxlKCdwaGlsJyk7XG4gIGBgYFxuXG4gIE5vdyBkbyBzb21lIG1vcmUgbG9nZ2VyOlxuXG4gIGBgYGpzXG4gIGRlYnVnKCdPaCB0aGlzIGlzIHNvIG11Y2ggbmljZXIgOiknKTtcbiAgLy8gLS0+IHBoaWw6IE9oIHRoaXMgaXMgc29tZSBtdWNoIG5pY2VyIDopXG4gIGBgYFxuXG4gICMjIyBSZWZlcmVuY2VcbioqL1xuXG52YXIgYWN0aXZlID0gW107XG52YXIgdW5sZWFzaExpc3RlbmVycyA9IFtdO1xudmFyIHRhcmdldHMgPSBbIGNvbnNvbGUgXTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyKG5hbWUpXG5cbiAgQ3JlYXRlIGEgbmV3IGxvZ2dpbmcgaW5zdGFuY2UuXG4qKi9cbnZhciBsb2dnZXIgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgLy8gaW5pdGlhbCBlbmFibGVkIGNoZWNrXG4gIHZhciBlbmFibGVkID0gY2hlY2tBY3RpdmUoKTtcblxuICBmdW5jdGlvbiBjaGVja0FjdGl2ZSgpIHtcbiAgICByZXR1cm4gZW5hYmxlZCA9IGFjdGl2ZS5pbmRleE9mKCcqJykgPj0gMCB8fCBhY3RpdmUuaW5kZXhPZihuYW1lKSA+PSAwO1xuICB9XG5cbiAgLy8gcmVnaXN0ZXIgdGhlIGNoZWNrIGFjdGl2ZSB3aXRoIHRoZSBsaXN0ZW5lcnMgYXJyYXlcbiAgdW5sZWFzaExpc3RlbmVyc1t1bmxlYXNoTGlzdGVuZXJzLmxlbmd0aF0gPSBjaGVja0FjdGl2ZTtcblxuICAvLyByZXR1cm4gdGhlIGFjdHVhbCBsb2dnaW5nIGZ1bmN0aW9uXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYSBzdHJpbmcgbWVzc2FnZVxuICAgIGlmICh0eXBlb2YgYXJnc1swXSA9PSAnc3RyaW5nJyB8fCAoYXJnc1swXSBpbnN0YW5jZW9mIFN0cmluZykpIHtcbiAgICAgIGFyZ3NbMF0gPSBuYW1lICsgJzogJyArIGFyZ3NbMF07XG4gICAgfVxuXG4gICAgLy8gaWYgbm90IGVuYWJsZWQsIGJhaWxcbiAgICBpZiAoISBlbmFibGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gbG9nXG4gICAgdGFyZ2V0cy5mb3JFYWNoKGZ1bmN0aW9uKHRhcmdldCkge1xuICAgICAgdGFyZ2V0LmxvZy5hcHBseSh0YXJnZXQsIGFyZ3MpO1xuICAgIH0pO1xuICB9O1xufTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyLnJlc2V0KClcblxuICBSZXNldCBsb2dnaW5nIChyZW1vdmUgdGhlIGRlZmF1bHQgY29uc29sZSBsb2dnZXIsIGZsYWcgYWxsIGxvZ2dlcnMgYXNcbiAgaW5hY3RpdmUsIGV0YywgZXRjLlxuKiovXG5sb2dnZXIucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgLy8gcmVzZXQgdGFyZ2V0cyBhbmQgYWN0aXZlIHN0YXRlc1xuICB0YXJnZXRzID0gW107XG4gIGFjdGl2ZSA9IFtdO1xuXG4gIHJldHVybiBsb2dnZXIuZW5hYmxlKCk7XG59O1xuXG4vKipcbiAgIyMjIyBsb2dnZXIudG8odGFyZ2V0KVxuXG4gIEFkZCBhIGxvZ2dpbmcgdGFyZ2V0LiAgVGhlIGxvZ2dlciBtdXN0IGhhdmUgYSBgbG9nYCBtZXRob2QgYXR0YWNoZWQuXG5cbioqL1xubG9nZ2VyLnRvID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gIHRhcmdldHMgPSB0YXJnZXRzLmNvbmNhdCh0YXJnZXQgfHwgW10pO1xuXG4gIHJldHVybiBsb2dnZXI7XG59O1xuXG4vKipcbiAgIyMjIyBsb2dnZXIuZW5hYmxlKG5hbWVzKilcblxuICBFbmFibGUgbG9nZ2luZyB2aWEgdGhlIG5hbWVkIGxvZ2dpbmcgaW5zdGFuY2VzLiAgVG8gZW5hYmxlIGxvZ2dpbmcgdmlhIGFsbFxuICBpbnN0YW5jZXMsIHlvdSBjYW4gcGFzcyBhIHdpbGRjYXJkOlxuXG4gIGBgYGpzXG4gIGxvZ2dlci5lbmFibGUoJyonKTtcbiAgYGBgXG5cbiAgX19UT0RPOl9fIHdpbGRjYXJkIGVuYWJsZXJzXG4qKi9cbmxvZ2dlci5lbmFibGUgPSBmdW5jdGlvbigpIHtcbiAgLy8gdXBkYXRlIHRoZSBhY3RpdmVcbiAgYWN0aXZlID0gYWN0aXZlLmNvbmNhdChbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuXG4gIC8vIHRyaWdnZXIgdGhlIHVubGVhc2ggbGlzdGVuZXJzXG4gIHVubGVhc2hMaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbihsaXN0ZW5lcikge1xuICAgIGxpc3RlbmVyKCk7XG4gIH0pO1xuXG4gIHJldHVybiBsb2dnZXI7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIyBjb2cvdGhyb3R0bGVcblxuICBgYGBqc1xuICB2YXIgdGhyb3R0bGUgPSByZXF1aXJlKCdjb2cvdGhyb3R0bGUnKTtcbiAgYGBgXG5cbiAgIyMjIHRocm90dGxlKGZuLCBkZWxheSwgb3B0cylcblxuICBBIGNoZXJyeS1waWNrYWJsZSB0aHJvdHRsZSBmdW5jdGlvbi4gIFVzZWQgdG8gdGhyb3R0bGUgYGZuYCB0byBlbnN1cmVcbiAgdGhhdCBpdCBjYW4gYmUgY2FsbGVkIGF0IG1vc3Qgb25jZSBldmVyeSBgZGVsYXlgIG1pbGxpc2Vjb25kcy4gIFdpbGxcbiAgZmlyZSBmaXJzdCBldmVudCBpbW1lZGlhdGVseSwgZW5zdXJpbmcgdGhlIG5leHQgZXZlbnQgZmlyZWQgd2lsbCBvY2N1clxuICBhdCBsZWFzdCBgZGVsYXlgIG1pbGxpc2Vjb25kcyBhZnRlciB0aGUgZmlyc3QsIGFuZCBzbyBvbi5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZuLCBkZWxheSwgb3B0cykge1xuICB2YXIgbGFzdEV4ZWMgPSAob3B0cyB8fCB7fSkubGVhZGluZyAhPT0gZmFsc2UgPyAwIDogRGF0ZS5ub3coKTtcbiAgdmFyIHRyYWlsaW5nID0gKG9wdHMgfHwge30pLnRyYWlsaW5nO1xuICB2YXIgdGltZXI7XG4gIHZhciBxdWV1ZWRBcmdzO1xuICB2YXIgcXVldWVkU2NvcGU7XG5cbiAgLy8gdHJhaWxpbmcgZGVmYXVsdHMgdG8gdHJ1ZVxuICB0cmFpbGluZyA9IHRyYWlsaW5nIHx8IHRyYWlsaW5nID09PSB1bmRlZmluZWQ7XG4gIFxuICBmdW5jdGlvbiBpbnZva2VEZWZlcmVkKCkge1xuICAgIGZuLmFwcGx5KHF1ZXVlZFNjb3BlLCBxdWV1ZWRBcmdzIHx8IFtdKTtcbiAgICBsYXN0RXhlYyA9IERhdGUubm93KCk7XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRpY2sgPSBEYXRlLm5vdygpO1xuICAgIHZhciBlbGFwc2VkID0gdGljayAtIGxhc3RFeGVjO1xuXG4gICAgLy8gYWx3YXlzIGNsZWFyIHRoZSBkZWZlcmVkIHRpbWVyXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcblxuICAgIGlmIChlbGFwc2VkIDwgZGVsYXkpIHtcbiAgICAgIHF1ZXVlZEFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgICBxdWV1ZWRTY29wZSA9IHRoaXM7XG5cbiAgICAgIHJldHVybiB0cmFpbGluZyAmJiAodGltZXIgPSBzZXRUaW1lb3V0KGludm9rZURlZmVyZWQsIGRlbGF5IC0gZWxhcHNlZCkpO1xuICAgIH1cblxuICAgIC8vIGNhbGwgdGhlIGZ1bmN0aW9uXG4gICAgbGFzdEV4ZWMgPSB0aWNrO1xuICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgd2luZG93OiBmYWxzZSAqL1xuLyogZ2xvYmFsIG5hdmlnYXRvcjogZmFsc2UgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgYnJvd3NlciA9IHJlcXVpcmUoJ2RldGVjdC1icm93c2VyJyk7XG5cbi8qKlxuICAjIyMgYHJ0Yy1jb3JlL2RldGVjdGBcblxuICBBIGJyb3dzZXIgZGV0ZWN0aW9uIGhlbHBlciBmb3IgYWNjZXNzaW5nIHByZWZpeC1mcmVlIHZlcnNpb25zIG9mIHRoZSB2YXJpb3VzXG4gIFdlYlJUQyB0eXBlcy5cblxuICAjIyMgRXhhbXBsZSBVc2FnZVxuXG4gIElmIHlvdSB3YW50ZWQgdG8gZ2V0IHRoZSBuYXRpdmUgYFJUQ1BlZXJDb25uZWN0aW9uYCBwcm90b3R5cGUgaW4gYW55IGJyb3dzZXJcbiAgeW91IGNvdWxkIGRvIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBganNcbiAgdmFyIGRldGVjdCA9IHJlcXVpcmUoJ3J0Yy1jb3JlL2RldGVjdCcpOyAvLyBhbHNvIGF2YWlsYWJsZSBpbiBydGMvZGV0ZWN0XG4gIHZhciBSVENQZWVyQ29ubmVjdGlvbiA9IGRldGVjdCgnUlRDUGVlckNvbm5lY3Rpb24nKTtcbiAgYGBgXG5cbiAgVGhpcyB3b3VsZCBwcm92aWRlIHdoYXRldmVyIHRoZSBicm93c2VyIHByZWZpeGVkIHZlcnNpb24gb2YgdGhlXG4gIFJUQ1BlZXJDb25uZWN0aW9uIGlzIGF2YWlsYWJsZSAoYHdlYmtpdFJUQ1BlZXJDb25uZWN0aW9uYCxcbiAgYG1velJUQ1BlZXJDb25uZWN0aW9uYCwgZXRjKS5cbioqL1xudmFyIGRldGVjdCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGFyZ2V0LCBvcHRzKSB7XG4gIHZhciBhdHRhY2ggPSAob3B0cyB8fCB7fSkuYXR0YWNoO1xuICB2YXIgcHJlZml4SWR4O1xuICB2YXIgcHJlZml4O1xuICB2YXIgdGVzdE5hbWU7XG4gIHZhciBob3N0T2JqZWN0ID0gdGhpcyB8fCAodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHVuZGVmaW5lZCk7XG5cbiAgLy8gaW5pdGlhbGlzZSB0byBkZWZhdWx0IHByZWZpeGVzXG4gIC8vIChyZXZlcnNlIG9yZGVyIGFzIHdlIHVzZSBhIGRlY3JlbWVudGluZyBmb3IgbG9vcClcbiAgdmFyIHByZWZpeGVzID0gKChvcHRzIHx8IHt9KS5wcmVmaXhlcyB8fCBbJ21zJywgJ28nLCAnbW96JywgJ3dlYmtpdCddKS5jb25jYXQoJycpO1xuXG4gIC8vIGlmIHdlIGhhdmUgbm8gaG9zdCBvYmplY3QsIHRoZW4gYWJvcnRcbiAgaWYgKCEgaG9zdE9iamVjdCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgcHJlZml4ZXMgYW5kIHJldHVybiB0aGUgY2xhc3MgaWYgZm91bmQgaW4gZ2xvYmFsXG4gIGZvciAocHJlZml4SWR4ID0gcHJlZml4ZXMubGVuZ3RoOyBwcmVmaXhJZHgtLTsgKSB7XG4gICAgcHJlZml4ID0gcHJlZml4ZXNbcHJlZml4SWR4XTtcblxuICAgIC8vIGNvbnN0cnVjdCB0aGUgdGVzdCBjbGFzcyBuYW1lXG4gICAgLy8gaWYgd2UgaGF2ZSBhIHByZWZpeCBlbnN1cmUgdGhlIHRhcmdldCBoYXMgYW4gdXBwZXJjYXNlIGZpcnN0IGNoYXJhY3RlclxuICAgIC8vIHN1Y2ggdGhhdCBhIHRlc3QgZm9yIGdldFVzZXJNZWRpYSB3b3VsZCByZXN1bHQgaW4gYVxuICAgIC8vIHNlYXJjaCBmb3Igd2Via2l0R2V0VXNlck1lZGlhXG4gICAgdGVzdE5hbWUgPSBwcmVmaXggKyAocHJlZml4ID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB0YXJnZXQuc2xpY2UoMSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldCk7XG5cbiAgICBpZiAodHlwZW9mIGhvc3RPYmplY3RbdGVzdE5hbWVdICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAvLyB1cGRhdGUgdGhlIGxhc3QgdXNlZCBwcmVmaXhcbiAgICAgIGRldGVjdC5icm93c2VyID0gZGV0ZWN0LmJyb3dzZXIgfHwgcHJlZml4LnRvTG93ZXJDYXNlKCk7XG5cbiAgICAgIGlmIChhdHRhY2gpIHtcbiAgICAgICAgIGhvc3RPYmplY3RbdGFyZ2V0XSA9IGhvc3RPYmplY3RbdGVzdE5hbWVdO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gaG9zdE9iamVjdFt0ZXN0TmFtZV07XG4gICAgfVxuICB9XG59O1xuXG4vLyBkZXRlY3QgbW96aWxsYSAoeWVzLCB0aGlzIGZlZWxzIGRpcnR5KVxuZGV0ZWN0Lm1veiA9IHR5cGVvZiBuYXZpZ2F0b3IgIT0gJ3VuZGVmaW5lZCcgJiYgISFuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhO1xuXG4vLyBzZXQgdGhlIGJyb3dzZXIgYW5kIGJyb3dzZXIgdmVyc2lvblxuZGV0ZWN0LmJyb3dzZXIgPSBicm93c2VyLm5hbWU7XG5kZXRlY3QuYnJvd3NlclZlcnNpb24gPSBkZXRlY3QudmVyc2lvbiA9IGJyb3dzZXIudmVyc2lvbjtcbiIsIi8qKlxuICAjIyMgYHJ0Yy1jb3JlL2dlbmljZWBcblxuICBSZXNwb25kIGFwcHJvcHJpYXRlbHkgdG8gb3B0aW9ucyB0aGF0IGFyZSBwYXNzZWQgdG8gcGFja2FnZXMgbGlrZVxuICBgcnRjLXF1aWNrY29ubmVjdGAgYW5kIHRyaWdnZXIgYSBgY2FsbGJhY2tgIChlcnJvciBmaXJzdCkgd2l0aCBpY2VTZXJ2ZXJcbiAgdmFsdWVzLlxuXG4gIFRoZSBmdW5jdGlvbiBsb29rcyBmb3IgZWl0aGVyIG9mIHRoZSBmb2xsb3dpbmcga2V5cyBpbiB0aGUgb3B0aW9ucywgaW5cbiAgdGhlIGZvbGxvd2luZyBvcmRlciBvciBwcmVjZWRlbmNlOlxuXG4gIDEuIGBpY2VgIC0gdGhpcyBjYW4gZWl0aGVyIGJlIGFuIGFycmF5IG9mIGljZSBzZXJ2ZXIgdmFsdWVzIG9yIGEgZ2VuZXJhdG9yXG4gICAgIGZ1bmN0aW9uIChpbiB0aGUgc2FtZSBmb3JtYXQgYXMgdGhpcyBmdW5jdGlvbikuICBJZiB0aGlzIGtleSBjb250YWlucyBhXG4gICAgIHZhbHVlIHRoZW4gYW55IHNlcnZlcnMgc3BlY2lmaWVkIGluIHRoZSBgaWNlU2VydmVyc2Aga2V5ICgyKSB3aWxsIGJlXG4gICAgIGlnbm9yZWQuXG5cbiAgMi4gYGljZVNlcnZlcnNgIC0gYW4gYXJyYXkgb2YgaWNlIHNlcnZlciB2YWx1ZXMuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob3B0cywgY2FsbGJhY2spIHtcbiAgdmFyIGljZSA9IChvcHRzIHx8IHt9KS5pY2U7XG4gIHZhciBpY2VTZXJ2ZXJzID0gKG9wdHMgfHwge30pLmljZVNlcnZlcnM7XG5cbiAgaWYgKHR5cGVvZiBpY2UgPT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBpY2Uob3B0cywgY2FsbGJhY2spO1xuICB9XG4gIGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoaWNlKSkge1xuICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBbXS5jb25jYXQoaWNlKSk7XG4gIH1cblxuICBjYWxsYmFjayhudWxsLCBbXS5jb25jYXQoaWNlU2VydmVycyB8fCBbXSkpO1xufTtcbiIsInZhciBicm93c2VycyA9IFtcbiAgWyAnY2hyb21lJywgL0Nocm9tKD86ZXxpdW0pXFwvKFswLTlcXC5dKykoOj9cXHN8JCkvIF0sXG4gIFsgJ2ZpcmVmb3gnLCAvRmlyZWZveFxcLyhbMC05XFwuXSspKD86XFxzfCQpLyBdLFxuICBbICdvcGVyYScsIC9PcGVyYVxcLyhbMC05XFwuXSspKD86XFxzfCQpLyBdLFxuICBbICdpZScsIC9UcmlkZW50XFwvN1xcLjAuKnJ2XFw6KFswLTlcXC5dKylcXCkuKkdlY2tvJC8gXSxcbiAgWyAnaWUnLCAvTVNJRVxccyhbMC05XFwuXSspOy4qVHJpZGVudFxcL1s0LTddLjAvIF0sXG4gIFsgJ2llJywgL01TSUVcXHMoN1xcLjApLyBdLFxuICBbICdiYjEwJywgL0JCMTA7XFxzVG91Y2guKlZlcnNpb25cXC8oWzAtOVxcLl0rKS8gXSxcbiAgWyAnYW5kcm9pZCcsIC9BbmRyb2lkXFxzKFswLTlcXC5dKykvIF0sXG4gIFsgJ2lvcycsIC9pUGFkXFw7XFxzQ1BVXFxzT1NcXHMoWzAtOVxcLl9dKykvIF0sXG4gIFsgJ2lvcycsICAvaVBob25lXFw7XFxzQ1BVXFxzaVBob25lXFxzT1NcXHMoWzAtOVxcLl9dKykvIF0sXG4gIFsgJ3NhZmFyaScsIC9TYWZhcmlcXC8oWzAtOVxcLl9dKykvIF1cbl07XG5cbnZhciBtYXRjaCA9IGJyb3dzZXJzLm1hcChtYXRjaCkuZmlsdGVyKGlzTWF0Y2gpWzBdO1xudmFyIHBhcnRzID0gbWF0Y2ggJiYgbWF0Y2hbM10uc3BsaXQoL1suX10vKS5zbGljZSgwLDMpO1xuXG53aGlsZSAocGFydHMgJiYgcGFydHMubGVuZ3RoIDwgMykge1xuICBwYXJ0cy5wdXNoKCcwJyk7XG59XG5cbi8vIHNldCB0aGUgbmFtZSBhbmQgdmVyc2lvblxuZXhwb3J0cy5uYW1lID0gbWF0Y2ggJiYgbWF0Y2hbMF07XG5leHBvcnRzLnZlcnNpb24gPSBwYXJ0cyAmJiBwYXJ0cy5qb2luKCcuJyk7XG5cbmZ1bmN0aW9uIG1hdGNoKHBhaXIpIHtcbiAgcmV0dXJuIHBhaXIuY29uY2F0KHBhaXJbMV0uZXhlYyhuYXZpZ2F0b3IudXNlckFnZW50KSk7XG59XG5cbmZ1bmN0aW9uIGlzTWF0Y2gocGFpcikge1xuICByZXR1cm4gISFwYWlyWzJdO1xufVxuIiwidmFyIGRldGVjdCA9IHJlcXVpcmUoJy4vZGV0ZWN0Jyk7XG52YXIgcmVxdWlyZWRGdW5jdGlvbnMgPSBbXG4gICdpbml0J1xuXTtcblxuZnVuY3Rpb24gaXNTdXBwb3J0ZWQocGx1Z2luKSB7XG4gIHJldHVybiBwbHVnaW4gJiYgdHlwZW9mIHBsdWdpbi5zdXBwb3J0ZWQgPT0gJ2Z1bmN0aW9uJyAmJiBwbHVnaW4uc3VwcG9ydGVkKGRldGVjdCk7XG59XG5cbmZ1bmN0aW9uIGlzVmFsaWQocGx1Z2luKSB7XG4gIHZhciBzdXBwb3J0ZWRGdW5jdGlvbnMgPSByZXF1aXJlZEZ1bmN0aW9ucy5maWx0ZXIoZnVuY3Rpb24oZm4pIHtcbiAgICByZXR1cm4gdHlwZW9mIHBsdWdpbltmbl0gPT0gJ2Z1bmN0aW9uJztcbiAgfSk7XG5cbiAgcmV0dXJuIHN1cHBvcnRlZEZ1bmN0aW9ucy5sZW5ndGggPT09IHJlcXVpcmVkRnVuY3Rpb25zLmxlbmd0aDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwbHVnaW5zKSB7XG4gIHJldHVybiBbXS5jb25jYXQocGx1Z2lucyB8fCBbXSkuZmlsdGVyKGlzU3VwcG9ydGVkKS5maWx0ZXIoaXNWYWxpZClbMF07XG59XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIGxvY2F0aW9uICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBydGMgPSByZXF1aXJlKCdydGMtdG9vbHMnKTtcbnZhciBtYnVzID0gcmVxdWlyZSgnbWJ1cycpO1xudmFyIGRldGVjdFBsdWdpbiA9IHJlcXVpcmUoJ3J0Yy1jb3JlL3BsdWdpbicpO1xudmFyIGRlYnVnID0gcnRjLmxvZ2dlcigncnRjLXF1aWNrY29ubmVjdCcpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcblxuLyoqXG4gICMgcnRjLXF1aWNrY29ubmVjdFxuXG4gIFRoaXMgaXMgYSBoaWdoIGxldmVsIGhlbHBlciBtb2R1bGUgZGVzaWduZWQgdG8gaGVscCB5b3UgZ2V0IHVwXG4gIGFuIHJ1bm5pbmcgd2l0aCBXZWJSVEMgcmVhbGx5LCByZWFsbHkgcXVpY2tseS4gIEJ5IHVzaW5nIHRoaXMgbW9kdWxlIHlvdVxuICBhcmUgdHJhZGluZyBvZmYgc29tZSBmbGV4aWJpbGl0eSwgc28gaWYgeW91IG5lZWQgYSBtb3JlIGZsZXhpYmxlXG4gIGNvbmZpZ3VyYXRpb24geW91IHNob3VsZCBkcmlsbCBkb3duIGludG8gbG93ZXIgbGV2ZWwgY29tcG9uZW50cyBvZiB0aGVcbiAgW3J0Yy5pb10oaHR0cDovL3d3dy5ydGMuaW8pIHN1aXRlLiAgSW4gcGFydGljdWxhciB5b3Ugc2hvdWxkIGNoZWNrIG91dFxuICBbcnRjXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0YykuXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIEluIHRoZSBzaW1wbGVzdCBjYXNlIHlvdSBzaW1wbHkgY2FsbCBxdWlja2Nvbm5lY3Qgd2l0aCBhIHNpbmdsZSBzdHJpbmdcbiAgYXJndW1lbnQgd2hpY2ggdGVsbHMgcXVpY2tjb25uZWN0IHdoaWNoIHNlcnZlciB0byB1c2UgZm9yIHNpZ25hbGluZzpcblxuICA8PDwgZXhhbXBsZXMvc2ltcGxlLmpzXG5cbiAgPDw8IGRvY3MvZXZlbnRzLm1kXG5cbiAgPDw8IGRvY3MvZXhhbXBsZXMubWRcblxuICAjIyBSZWdhcmRpbmcgU2lnbmFsbGluZyBhbmQgYSBTaWduYWxsaW5nIFNlcnZlclxuXG4gIFNpZ25hbGluZyBpcyBhbiBpbXBvcnRhbnQgcGFydCBvZiBzZXR0aW5nIHVwIGEgV2ViUlRDIGNvbm5lY3Rpb24gYW5kIGZvclxuICBvdXIgZXhhbXBsZXMgd2UgdXNlIG91ciBvd24gdGVzdCBpbnN0YW5jZSBvZiB0aGVcbiAgW3J0Yy1zd2l0Y2hib2FyZF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtc3dpdGNoYm9hcmQpLiBGb3IgeW91clxuICB0ZXN0aW5nIGFuZCBkZXZlbG9wbWVudCB5b3UgYXJlIG1vcmUgdGhhbiB3ZWxjb21lIHRvIHVzZSB0aGlzIGFsc28sIGJ1dFxuICBqdXN0IGJlIGF3YXJlIHRoYXQgd2UgdXNlIHRoaXMgZm9yIG91ciB0ZXN0aW5nIHNvIGl0IG1heSBnbyB1cCBhbmQgZG93blxuICBhIGxpdHRsZS4gIElmIHlvdSBuZWVkIHNvbWV0aGluZyBtb3JlIHN0YWJsZSwgd2h5IG5vdCBjb25zaWRlciBkZXBsb3lpbmdcbiAgYW4gaW5zdGFuY2Ugb2YgdGhlIHN3aXRjaGJvYXJkIHlvdXJzZWxmIC0gaXQncyBwcmV0dHkgZWFzeSA6KVxuXG4gICMjIFJlZmVyZW5jZVxuXG4gIGBgYFxuICBxdWlja2Nvbm5lY3Qoc2lnbmFsaG9zdCwgb3B0cz8pID0+IHJ0Yy1zaWdhbGxlciBpbnN0YW5jZSAoKyBoZWxwZXJzKVxuICBgYGBcblxuICAjIyMgVmFsaWQgUXVpY2sgQ29ubmVjdCBPcHRpb25zXG5cbiAgVGhlIG9wdGlvbnMgcHJvdmlkZWQgdG8gdGhlIGBydGMtcXVpY2tjb25uZWN0YCBtb2R1bGUgZnVuY3Rpb24gaW5mbHVlbmNlIHRoZVxuICBiZWhhdmlvdXIgb2Ygc29tZSBvZiB0aGUgdW5kZXJseWluZyBjb21wb25lbnRzIHVzZWQgZnJvbSB0aGUgcnRjLmlvIHN1aXRlLlxuXG4gIExpc3RlZCBiZWxvdyBhcmUgc29tZSBvZiB0aGUgY29tbW9ubHkgdXNlZCBvcHRpb25zOlxuXG4gIC0gYG5zYCAoZGVmYXVsdDogJycpXG5cbiAgICBBbiBvcHRpb25hbCBuYW1lc3BhY2UgZm9yIHlvdXIgc2lnbmFsbGluZyByb29tLiAgV2hpbGUgcXVpY2tjb25uZWN0XG4gICAgd2lsbCBnZW5lcmF0ZSBhIHVuaXF1ZSBoYXNoIGZvciB0aGUgcm9vbSwgdGhpcyBjYW4gYmUgbWFkZSB0byBiZSBtb3JlXG4gICAgdW5pcXVlIGJ5IHByb3ZpZGluZyBhIG5hbWVzcGFjZS4gIFVzaW5nIGEgbmFtZXNwYWNlIG1lYW5zIHR3byBkZW1vc1xuICAgIHRoYXQgaGF2ZSBnZW5lcmF0ZWQgdGhlIHNhbWUgaGFzaCBidXQgdXNlIGEgZGlmZmVyZW50IG5hbWVzcGFjZSB3aWxsIGJlXG4gICAgaW4gZGlmZmVyZW50IHJvb21zLlxuXG4gIC0gYHJvb21gIChkZWZhdWx0OiBudWxsKSBfYWRkZWQgMC42X1xuXG4gICAgUmF0aGVyIHRoYW4gdXNlIHRoZSBpbnRlcm5hbCBoYXNoIGdlbmVyYXRpb25cbiAgICAocGx1cyBvcHRpb25hbCBuYW1lc3BhY2UpIGZvciByb29tIG5hbWUgZ2VuZXJhdGlvbiwgc2ltcGx5IHVzZSB0aGlzIHJvb21cbiAgICBuYW1lIGluc3RlYWQuICBfX05PVEU6X18gVXNlIG9mIHRoZSBgcm9vbWAgb3B0aW9uIHRha2VzIHByZWNlbmRlbmNlIG92ZXJcbiAgICBgbnNgLlxuXG4gIC0gYGRlYnVnYCAoZGVmYXVsdDogZmFsc2UpXG5cbiAgV3JpdGUgcnRjLmlvIHN1aXRlIGRlYnVnIG91dHB1dCB0byB0aGUgYnJvd3NlciBjb25zb2xlLlxuXG4gIC0gYGV4cGVjdGVkTG9jYWxTdHJlYW1zYCAoZGVmYXVsdDogbm90IHNwZWNpZmllZCkgX2FkZGVkIDMuMF9cblxuICAgIEJ5IHByb3ZpZGluZyBhIHBvc2l0aXZlIGludGVnZXIgdmFsdWUgZm9yIHRoaXMgb3B0aW9uIHdpbGwgbWVhbiB0aGF0XG4gICAgdGhlIGNyZWF0ZWQgcXVpY2tjb25uZWN0IGluc3RhbmNlIHdpbGwgd2FpdCB1bnRpbCB0aGUgc3BlY2lmaWVkIG51bWJlciBvZlxuICAgIHN0cmVhbXMgaGF2ZSBiZWVuIGFkZGVkIHRvIHRoZSBxdWlja2Nvbm5lY3QgXCJ0ZW1wbGF0ZVwiIGJlZm9yZSBhbm5vdW5jaW5nXG4gICAgdG8gdGhlIHNpZ25hbGluZyBzZXJ2ZXIuXG5cbiAgLSBgbWFudWFsSm9pbmAgKGRlZmF1bHQ6IGBmYWxzZWApXG5cbiAgICBTZXQgdGhpcyB2YWx1ZSB0byBgdHJ1ZWAgaWYgeW91IHdvdWxkIHByZWZlciB0byBjYWxsIHRoZSBgam9pbmAgZnVuY3Rpb25cbiAgICB0byBjb25uZWN0aW5nIHRvIHRoZSBzaWduYWxsaW5nIHNlcnZlciwgcmF0aGVyIHRoYW4gaGF2aW5nIHRoYXQgaGFwcGVuXG4gICAgYXV0b21hdGljYWxseSBhcyBzb29uIGFzIHF1aWNrY29ubmVjdCBpcyByZWFkeSB0by5cblxuICAjIyMjIE9wdGlvbnMgZm9yIFBlZXIgQ29ubmVjdGlvbiBDcmVhdGlvblxuXG4gIE9wdGlvbnMgdGhhdCBhcmUgcGFzc2VkIG9udG8gdGhlXG4gIFtydGMuY3JlYXRlQ29ubmVjdGlvbl0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMjY3JlYXRlY29ubmVjdGlvbm9wdHMtY29uc3RyYWludHMpXG4gIGZ1bmN0aW9uOlxuXG4gIC0gYGljZVNlcnZlcnNgXG5cbiAgVGhpcyBwcm92aWRlcyBhIGxpc3Qgb2YgaWNlIHNlcnZlcnMgdGhhdCBjYW4gYmUgdXNlZCB0byBoZWxwIG5lZ290aWF0ZSBhXG4gIGNvbm5lY3Rpb24gYmV0d2VlbiBwZWVycy5cblxuICAjIyMjIE9wdGlvbnMgZm9yIFAyUCBuZWdvdGlhdGlvblxuXG4gIFVuZGVyIHRoZSBob29kLCBxdWlja2Nvbm5lY3QgdXNlcyB0aGVcbiAgW3J0Yy9jb3VwbGVdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjI3J0Y2NvdXBsZSkgbG9naWMsIGFuZCB0aGUgb3B0aW9uc1xuICBwYXNzZWQgdG8gcXVpY2tjb25uZWN0IGFyZSBhbHNvIHBhc3NlZCBvbnRvIHRoaXMgZnVuY3Rpb24uXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzaWduYWxob3N0LCBvcHRzKSB7XG4gIHZhciBoYXNoID0gdHlwZW9mIGxvY2F0aW9uICE9ICd1bmRlZmluZWQnICYmIGxvY2F0aW9uLmhhc2guc2xpY2UoMSk7XG4gIHZhciBzaWduYWxsZXIgPSByZXF1aXJlKCdydGMtcGx1Z2dhYmxlLXNpZ25hbGxlcicpKGV4dGVuZCh7IHNpZ25hbGxlcjogc2lnbmFsaG9zdCB9LCBvcHRzKSk7XG4gIHZhciBnZXRQZWVyRGF0YSA9IHJlcXVpcmUoJy4vbGliL2dldHBlZXJkYXRhJykoc2lnbmFsbGVyLnBlZXJzKTtcblxuICAvLyBpbml0IGNvbmZpZ3VyYWJsZSB2YXJzXG4gIHZhciBucyA9IChvcHRzIHx8IHt9KS5ucyB8fCAnJztcbiAgdmFyIHJvb20gPSAob3B0cyB8fCB7fSkucm9vbTtcbiAgdmFyIGRlYnVnZ2luZyA9IChvcHRzIHx8IHt9KS5kZWJ1ZztcbiAgdmFyIGFsbG93Sm9pbiA9ICEob3B0cyB8fCB7fSkubWFudWFsSm9pbjtcbiAgdmFyIHByb2ZpbGUgPSB7fTtcbiAgdmFyIGFubm91bmNlZCA9IGZhbHNlO1xuXG4gIC8vIGluaXRpYWxpc2UgaWNlU2VydmVycyB0byB1bmRlZmluZWRcbiAgLy8gd2Ugd2lsbCBub3QgYW5ub3VuY2UgdW50aWwgdGhlc2UgaGF2ZSBiZWVuIHByb3Blcmx5IGluaXRpYWxpc2VkXG4gIHZhciBpY2VTZXJ2ZXJzO1xuXG4gIC8vIGNvbGxlY3QgdGhlIGxvY2FsIHN0cmVhbXNcbiAgdmFyIGxvY2FsU3RyZWFtcyA9IFtdO1xuXG4gIC8vIGNyZWF0ZSB0aGUgY2FsbHMgbWFwXG4gIHZhciBjYWxscyA9IHNpZ25hbGxlci5jYWxscyA9IHJlcXVpcmUoJy4vbGliL2NhbGxzJykoc2lnbmFsbGVyLCBvcHRzKTtcblxuICAvLyBjcmVhdGUgdGhlIGtub3duIGRhdGEgY2hhbm5lbHMgcmVnaXN0cnlcbiAgdmFyIGNoYW5uZWxzID0ge307XG5cbiAgLy8gc2F2ZSB0aGUgcGx1Z2lucyBwYXNzZWQgdG8gdGhlIHNpZ25hbGxlclxuICB2YXIgcGx1Z2lucyA9IHNpZ25hbGxlci5wbHVnaW5zID0gKG9wdHMgfHwge30pLnBsdWdpbnMgfHwgW107XG4gIHZhciBwbHVnaW4gPSBkZXRlY3RQbHVnaW4ocGx1Z2lucyk7XG4gIHZhciBwbHVnaW5SZWFkeTtcblxuICAvLyBjaGVjayBob3cgbWFueSBsb2NhbCBzdHJlYW1zIGhhdmUgYmVlbiBleHBlY3RlZCAoZGVmYXVsdDogMClcbiAgdmFyIGV4cGVjdGVkTG9jYWxTdHJlYW1zID0gcGFyc2VJbnQoKG9wdHMgfHwge30pLmV4cGVjdGVkTG9jYWxTdHJlYW1zLCAxMCkgfHwgMDtcbiAgdmFyIGFubm91bmNlVGltZXIgPSAwO1xuICB2YXIgdXBkYXRlVGltZXIgPSAwO1xuXG4gIGZ1bmN0aW9uIGNoZWNrUmVhZHlUb0Fubm91bmNlKCkge1xuICAgIGNsZWFyVGltZW91dChhbm5vdW5jZVRpbWVyKTtcbiAgICAvLyBpZiB3ZSBoYXZlIGFscmVhZHkgYW5ub3VuY2VkIGRvIG5vdGhpbmchXG4gICAgaWYgKGFubm91bmNlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghIGFsbG93Sm9pbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGlmIHdlIGhhdmUgYSBwbHVnaW4gYnV0IGl0J3Mgbm90IGluaXRpYWxpemVkIHdlIGFyZW4ndCByZWFkeVxuICAgIGlmIChwbHVnaW4gJiYgKCEgcGx1Z2luUmVhZHkpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gaWYgd2UgaGF2ZSBubyBpY2VTZXJ2ZXJzIHdlIGFyZW4ndCByZWFkeVxuICAgIGlmICghIGljZVNlcnZlcnMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBpZiB3ZSBhcmUgd2FpdGluZyBmb3IgYSBzZXQgbnVtYmVyIG9mIHN0cmVhbXMsIHRoZW4gd2FpdCB1bnRpbCB3ZSBoYXZlXG4gICAgLy8gdGhlIHJlcXVpcmVkIG51bWJlclxuICAgIGlmIChleHBlY3RlZExvY2FsU3RyZWFtcyAmJiBsb2NhbFN0cmVhbXMubGVuZ3RoIDwgZXhwZWN0ZWRMb2NhbFN0cmVhbXMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBhbm5vdW5jZSBvdXJzZWx2ZXMgdG8gb3VyIG5ldyBmcmllbmRcbiAgICBhbm5vdW5jZVRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIHZhciBkYXRhID0gZXh0ZW5kKHsgcm9vbTogcm9vbSB9LCBwcm9maWxlKTtcblxuICAgICAgLy8gYW5ub3VuY2UgYW5kIGVtaXQgdGhlIGxvY2FsIGFubm91bmNlIGV2ZW50XG4gICAgICBzaWduYWxsZXIuYW5ub3VuY2UoZGF0YSk7XG4gICAgICBhbm5vdW5jZWQgPSB0cnVlO1xuICAgIH0sIDApO1xuICB9XG5cbiAgZnVuY3Rpb24gY29ubmVjdChpZCkge1xuICAgIHZhciBkYXRhID0gZ2V0UGVlckRhdGEoaWQpO1xuICAgIHZhciBwYztcbiAgICB2YXIgbW9uaXRvcjtcblxuICAgIC8vIGlmIHRoZSByb29tIGlzIG5vdCBhIG1hdGNoLCBhYm9ydFxuICAgIGlmIChkYXRhLnJvb20gIT09IHJvb20pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBlbmQgYW55IGNhbGwgdG8gdGhpcyBpZCBzbyB3ZSBrbm93IHdlIGFyZSBzdGFydGluZyBmcmVzaFxuICAgIGNhbGxzLmVuZChpZCk7XG5cbiAgICAvLyBjcmVhdGUgYSBwZWVyIGNvbm5lY3Rpb25cbiAgICAvLyBpY2VTZXJ2ZXJzIHRoYXQgaGF2ZSBiZWVuIGNyZWF0ZWQgdXNpbmcgZ2VuaWNlIHRha2luZyBwcmVjZW5kZW5jZVxuICAgIHBjID0gcnRjLmNyZWF0ZUNvbm5lY3Rpb24oXG4gICAgICBleHRlbmQoe30sIG9wdHMsIHsgaWNlU2VydmVyczogaWNlU2VydmVycyB9KSxcbiAgICAgIChvcHRzIHx8IHt9KS5jb25zdHJhaW50c1xuICAgICk7XG5cbiAgICBzaWduYWxsZXIoJ3BlZXI6Y29ubmVjdCcsIGRhdGEuaWQsIHBjLCBkYXRhKTtcblxuICAgIC8vIGFkZCB0aGlzIGNvbm5lY3Rpb24gdG8gdGhlIGNhbGxzIGxpc3RcbiAgICBjYWxscy5jcmVhdGUoZGF0YS5pZCwgcGMpO1xuXG4gICAgLy8gYWRkIHRoZSBsb2NhbCBzdHJlYW1zXG4gICAgbG9jYWxTdHJlYW1zLmZvckVhY2goZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICBwYy5hZGRTdHJlYW0oc3RyZWFtKTtcbiAgICB9KTtcblxuICAgIC8vIGFkZCB0aGUgZGF0YSBjaGFubmVsc1xuICAgIC8vIGRvIHRoaXMgZGlmZmVyZW50bHkgYmFzZWQgb24gd2hldGhlciB0aGUgY29ubmVjdGlvbiBpcyBhXG4gICAgLy8gbWFzdGVyIG9yIGEgc2xhdmUgY29ubmVjdGlvblxuICAgIGlmIChzaWduYWxsZXIuaXNNYXN0ZXIoZGF0YS5pZCkpIHtcbiAgICAgIGRlYnVnKCdpcyBtYXN0ZXIsIGNyZWF0aW5nIGRhdGEgY2hhbm5lbHM6ICcsIE9iamVjdC5rZXlzKGNoYW5uZWxzKSk7XG5cbiAgICAgIC8vIGNyZWF0ZSB0aGUgY2hhbm5lbHNcbiAgICAgIE9iamVjdC5rZXlzKGNoYW5uZWxzKS5mb3JFYWNoKGZ1bmN0aW9uKGxhYmVsKSB7XG4gICAgICAgZ290UGVlckNoYW5uZWwocGMuY3JlYXRlRGF0YUNoYW5uZWwobGFiZWwsIGNoYW5uZWxzW2xhYmVsXSksIHBjLCBkYXRhKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHBjLm9uZGF0YWNoYW5uZWwgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgdmFyIGNoYW5uZWwgPSBldnQgJiYgZXZ0LmNoYW5uZWw7XG5cbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBubyBjaGFubmVsLCBhYm9ydFxuICAgICAgICBpZiAoISBjaGFubmVsKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoYW5uZWxzW2NoYW5uZWwubGFiZWxdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBnb3RQZWVyQ2hhbm5lbChjaGFubmVsLCBwYywgZ2V0UGVlckRhdGEoaWQpKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBjb3VwbGUgdGhlIGNvbm5lY3Rpb25zXG4gICAgZGVidWcoJ2NvdXBsaW5nICcgKyBzaWduYWxsZXIuaWQgKyAnIHRvICcgKyBkYXRhLmlkKTtcbiAgICBtb25pdG9yID0gcnRjLmNvdXBsZShwYywgaWQsIHNpZ25hbGxlciwgZXh0ZW5kKHt9LCBvcHRzLCB7XG4gICAgICBsb2dnZXI6IG1idXMoJ3BjLicgKyBpZCwgc2lnbmFsbGVyKVxuICAgIH0pKTtcblxuICAgIHNpZ25hbGxlcigncGVlcjpjb3VwbGUnLCBpZCwgcGMsIGRhdGEsIG1vbml0b3IpO1xuXG4gICAgLy8gb25jZSBhY3RpdmUsIHRyaWdnZXIgdGhlIHBlZXIgY29ubmVjdCBldmVudFxuICAgIG1vbml0b3Iub25jZSgnY29ubmVjdGVkJywgY2FsbHMuc3RhcnQuYmluZChudWxsLCBpZCwgcGMsIGRhdGEpKTtcbiAgICBtb25pdG9yLm9uY2UoJ2Nsb3NlZCcsIGNhbGxzLmVuZC5iaW5kKG51bGwsIGlkKSk7XG5cbiAgICAvLyBpZiB3ZSBhcmUgdGhlIG1hc3RlciBjb25ubmVjdGlvbiwgY3JlYXRlIHRoZSBvZmZlclxuICAgIC8vIE5PVEU6IHRoaXMgb25seSByZWFsbHkgZm9yIHRoZSBzYWtlIG9mIHBvbGl0ZW5lc3MsIGFzIHJ0YyBjb3VwbGVcbiAgICAvLyBpbXBsZW1lbnRhdGlvbiBoYW5kbGVzIHRoZSBzbGF2ZSBhdHRlbXB0aW5nIHRvIGNyZWF0ZSBhbiBvZmZlclxuICAgIGlmIChzaWduYWxsZXIuaXNNYXN0ZXIoaWQpKSB7XG4gICAgICBtb25pdG9yLmNyZWF0ZU9mZmVyKCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0QWN0aXZlQ2FsbChwZWVySWQpIHtcbiAgICB2YXIgY2FsbCA9IGNhbGxzLmdldChwZWVySWQpO1xuXG4gICAgaWYgKCEgY2FsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBhY3RpdmUgY2FsbCBmb3IgcGVlcjogJyArIHBlZXJJZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNhbGw7XG4gIH1cblxuICBmdW5jdGlvbiBnb3RQZWVyQ2hhbm5lbChjaGFubmVsLCBwYywgZGF0YSkge1xuICAgIHZhciBjaGFubmVsTW9uaXRvcjtcblxuICAgIGZ1bmN0aW9uIGNoYW5uZWxSZWFkeSgpIHtcbiAgICAgIHZhciBjYWxsID0gY2FsbHMuZ2V0KGRhdGEuaWQpO1xuICAgICAgdmFyIGFyZ3MgPSBbIGRhdGEuaWQsIGNoYW5uZWwsIGRhdGEsIHBjIF07XG5cbiAgICAgIC8vIGRlY291cGxlIHRoZSBjaGFubmVsLm9ub3BlbiBsaXN0ZW5lclxuICAgICAgZGVidWcoJ3JlcG9ydGluZyBjaGFubmVsIFwiJyArIGNoYW5uZWwubGFiZWwgKyAnXCIgcmVhZHksIGhhdmUgY2FsbDogJyArICghIWNhbGwpKTtcbiAgICAgIGNsZWFySW50ZXJ2YWwoY2hhbm5lbE1vbml0b3IpO1xuICAgICAgY2hhbm5lbC5vbm9wZW4gPSBudWxsO1xuXG4gICAgICAvLyBzYXZlIHRoZSBjaGFubmVsXG4gICAgICBpZiAoY2FsbCkge1xuICAgICAgICBjYWxsLmNoYW5uZWxzLnNldChjaGFubmVsLmxhYmVsLCBjaGFubmVsKTtcbiAgICAgIH1cblxuICAgICAgLy8gdHJpZ2dlciB0aGUgJWNoYW5uZWwubGFiZWwlOm9wZW4gZXZlbnRcbiAgICAgIGRlYnVnKCd0cmlnZ2VyaW5nIGNoYW5uZWw6b3BlbmVkIGV2ZW50cyBmb3IgY2hhbm5lbDogJyArIGNoYW5uZWwubGFiZWwpO1xuXG4gICAgICAvLyBlbWl0IHRoZSBwbGFpbiBjaGFubmVsOm9wZW5lZCBldmVudFxuICAgICAgc2lnbmFsbGVyLmFwcGx5KHNpZ25hbGxlciwgWydjaGFubmVsOm9wZW5lZCddLmNvbmNhdChhcmdzKSk7XG5cbiAgICAgIC8vIGVtaXQgdGhlIGNoYW5uZWw6b3BlbmVkOiVsYWJlbCUgZXZlXG4gICAgICBzaWduYWxsZXIuYXBwbHkoXG4gICAgICAgIHNpZ25hbGxlcixcbiAgICAgICAgWydjaGFubmVsOm9wZW5lZDonICsgY2hhbm5lbC5sYWJlbF0uY29uY2F0KGFyZ3MpXG4gICAgICApO1xuICAgIH1cblxuICAgIGRlYnVnKCdjaGFubmVsICcgKyBjaGFubmVsLmxhYmVsICsgJyBkaXNjb3ZlcmVkIGZvciBwZWVyOiAnICsgZGF0YS5pZCk7XG4gICAgaWYgKGNoYW5uZWwucmVhZHlTdGF0ZSA9PT0gJ29wZW4nKSB7XG4gICAgICByZXR1cm4gY2hhbm5lbFJlYWR5KCk7XG4gICAgfVxuXG4gICAgZGVidWcoJ2NoYW5uZWwgbm90IHJlYWR5LCBjdXJyZW50IHN0YXRlID0gJyArIGNoYW5uZWwucmVhZHlTdGF0ZSk7XG4gICAgY2hhbm5lbC5vbm9wZW4gPSBjaGFubmVsUmVhZHk7XG5cbiAgICAvLyBtb25pdG9yIHRoZSBjaGFubmVsIG9wZW4gKGRvbid0IHRydXN0IHRoZSBjaGFubmVsIG9wZW4gZXZlbnQganVzdCB5ZXQpXG4gICAgY2hhbm5lbE1vbml0b3IgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgIGRlYnVnKCdjaGVja2luZyBjaGFubmVsIHN0YXRlLCBjdXJyZW50IHN0YXRlID0gJyArIGNoYW5uZWwucmVhZHlTdGF0ZSk7XG4gICAgICBpZiAoY2hhbm5lbC5yZWFkeVN0YXRlID09PSAnb3BlbicpIHtcbiAgICAgICAgY2hhbm5lbFJlYWR5KCk7XG4gICAgICB9XG4gICAgfSwgNTAwKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGluaXRQbHVnaW4oKSB7XG4gICAgcmV0dXJuIHBsdWdpbiAmJiBwbHVnaW4uaW5pdChvcHRzLCBmdW5jdGlvbihlcnIpIHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIGNvbnNvbGUuZXJyb3IoJ0NvdWxkIG5vdCBpbml0aWFsaXplIHBsdWdpbjogJywgZXJyKTtcbiAgICAgIH1cblxuICAgICAgcGx1Z2luUmVhZHkgPSB0cnVlO1xuICAgICAgY2hlY2tSZWFkeVRvQW5ub3VuY2UoKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZUxvY2FsQW5ub3VuY2UoZGF0YSkge1xuICAgIC8vIGlmIHdlIHNlbmQgYW4gYW5ub3VuY2Ugd2l0aCBhbiB1cGRhdGVkIHJvb20gdGhlbiB1cGRhdGUgb3VyIGxvY2FsIHJvb20gbmFtZVxuICAgIGlmIChkYXRhICYmIHR5cGVvZiBkYXRhLnJvb20gIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJvb20gPSBkYXRhLnJvb207XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlUGVlckZpbHRlcihpZCwgZGF0YSkge1xuICAgIC8vIG9ubHkgY29ubmVjdCB3aXRoIHRoZSBwZWVyIGlmIHdlIGFyZSByZWFkeVxuICAgIGRhdGEuYWxsb3cgPSBkYXRhLmFsbG93ICYmIChsb2NhbFN0cmVhbXMubGVuZ3RoID49IGV4cGVjdGVkTG9jYWxTdHJlYW1zKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZVBlZXJVcGRhdGUoZGF0YSkge1xuICAgIHZhciBpZCA9IGRhdGEgJiYgZGF0YS5pZDtcbiAgICB2YXIgYWN0aXZlQ2FsbCA9IGlkICYmIGNhbGxzLmdldChpZCk7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIHJlY2VpdmVkIGFuIHVwZGF0ZSBmb3IgYSBwZWVyIHRoYXQgaGFzIG5vIGFjdGl2ZSBjYWxscyxcbiAgICAvLyB0aGVuIHBhc3MgdGhpcyBvbnRvIHRoZSBhbm5vdW5jZSBoYW5kbGVyXG4gICAgaWYgKGlkICYmICghIGFjdGl2ZUNhbGwpKSB7XG4gICAgICBkZWJ1ZygncmVjZWl2ZWQgcGVlciB1cGRhdGUgZnJvbSBwZWVyICcgKyBpZCArICcsIG5vIGFjdGl2ZSBjYWxscycpO1xuICAgICAgc2lnbmFsbGVyLnRvKGlkKS5zZW5kKCcvcmVjb25uZWN0Jyk7XG4gICAgICByZXR1cm4gY29ubmVjdChpZCk7XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgdGhlIHJvb20gaXMgbm90IGRlZmluZWQsIHRoZW4gZ2VuZXJhdGUgdGhlIHJvb20gbmFtZVxuICBpZiAoISByb29tKSB7XG4gICAgLy8gaWYgdGhlIGhhc2ggaXMgbm90IGFzc2lnbmVkLCB0aGVuIGNyZWF0ZSBhIHJhbmRvbSBoYXNoIHZhbHVlXG4gICAgaWYgKHR5cGVvZiBsb2NhdGlvbiAhPSAndW5kZWZpbmVkJyAmJiAoISBoYXNoKSkge1xuICAgICAgaGFzaCA9IGxvY2F0aW9uLmhhc2ggPSAnJyArIChNYXRoLnBvdygyLCA1MykgKiBNYXRoLnJhbmRvbSgpKTtcbiAgICB9XG5cbiAgICByb29tID0gbnMgKyAnIycgKyBoYXNoO1xuICB9XG5cbiAgaWYgKGRlYnVnZ2luZykge1xuICAgIHJ0Yy5sb2dnZXIuZW5hYmxlLmFwcGx5KHJ0Yy5sb2dnZXIsIEFycmF5LmlzQXJyYXkoZGVidWcpID8gZGVidWdnaW5nIDogWycqJ10pO1xuICB9XG5cbiAgc2lnbmFsbGVyLm9uKCdwZWVyOmFubm91bmNlJywgZnVuY3Rpb24oZGF0YSkge1xuICAgIGNvbm5lY3QoZGF0YS5pZCk7XG4gIH0pO1xuXG4gIHNpZ25hbGxlci5vbigncGVlcjp1cGRhdGUnLCBoYW5kbGVQZWVyVXBkYXRlKTtcblxuICBzaWduYWxsZXIub24oJ21lc3NhZ2U6cmVjb25uZWN0JywgZnVuY3Rpb24oc2VuZGVyKSB7XG4gICAgY29ubmVjdChzZW5kZXIuaWQpO1xuICB9KTtcblxuXG5cbiAgLyoqXG4gICAgIyMjIFF1aWNrY29ubmVjdCBCcm9hZGNhc3QgYW5kIERhdGEgQ2hhbm5lbCBIZWxwZXIgRnVuY3Rpb25zXG5cbiAgICBUaGUgZm9sbG93aW5nIGFyZSBmdW5jdGlvbnMgdGhhdCBhcmUgcGF0Y2hlZCBpbnRvIHRoZSBgcnRjLXNpZ25hbGxlcmBcbiAgICBpbnN0YW5jZSB0aGF0IG1ha2Ugd29ya2luZyB3aXRoIGFuZCBjcmVhdGluZyBmdW5jdGlvbmFsIFdlYlJUQyBhcHBsaWNhdGlvbnNcbiAgICBhIGxvdCBzaW1wbGVyLlxuXG4gICoqL1xuXG4gIC8qKlxuICAgICMjIyMgYWRkU3RyZWFtXG5cbiAgICBgYGBcbiAgICBhZGRTdHJlYW0oc3RyZWFtOk1lZGlhU3RyZWFtKSA9PiBxY1xuICAgIGBgYFxuXG4gICAgQWRkIHRoZSBzdHJlYW0gdG8gYWN0aXZlIGNhbGxzIGFuZCBhbHNvIHNhdmUgdGhlIHN0cmVhbSBzbyB0aGF0IGl0XG4gICAgY2FuIGJlIGFkZGVkIHRvIGZ1dHVyZSBjYWxscy5cblxuICAqKi9cbiAgc2lnbmFsbGVyLmJyb2FkY2FzdCA9IHNpZ25hbGxlci5hZGRTdHJlYW0gPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICBsb2NhbFN0cmVhbXMucHVzaChzdHJlYW0pO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSBhbnkgYWN0aXZlIGNhbGxzLCB0aGVuIGFkZCB0aGUgc3RyZWFtXG4gICAgY2FsbHMudmFsdWVzKCkuZm9yRWFjaChmdW5jdGlvbihkYXRhKSB7XG4gICAgICBkYXRhLnBjLmFkZFN0cmVhbShzdHJlYW0pO1xuICAgIH0pO1xuXG4gICAgY2hlY2tSZWFkeVRvQW5ub3VuY2UoKTtcbiAgICByZXR1cm4gc2lnbmFsbGVyO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyMgZW5kQ2FsbHMoKVxuXG4gICAgVGhlIGBlbmRDYWxsc2AgZnVuY3Rpb24gdGVybWluYXRlcyBhbGwgdGhlIGFjdGl2ZSBjYWxscyB0aGF0IGhhdmUgYmVlblxuICAgIGNyZWF0ZWQgaW4gdGhpcyBxdWlja2Nvbm5lY3QgaW5zdGFuY2UuICBDYWxsaW5nIGBlbmRDYWxsc2AgZG9lcyBub3RcbiAgICBraWxsIHRoZSBjb25uZWN0aW9uIHdpdGggdGhlIHNpZ25hbGxpbmcgc2VydmVyLlxuXG4gICoqL1xuICBzaWduYWxsZXIuZW5kQ2FsbHMgPSBmdW5jdGlvbigpIHtcbiAgICBjYWxscy5rZXlzKCkuZm9yRWFjaChjYWxscy5lbmQpO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyMgY2xvc2UoKVxuXG4gICAgVGhlIGBjbG9zZWAgZnVuY3Rpb24gcHJvdmlkZXMgYSBjb252ZW5pZW50IHdheSBvZiBjbG9zaW5nIGFsbCBhc3NvY2lhdGVkXG4gICAgcGVlciBjb25uZWN0aW9ucy4gIFRoaXMgZnVuY3Rpb24gc2ltcGx5IHVzZXMgdGhlIGBlbmRDYWxsc2AgZnVuY3Rpb24gYW5kXG4gICAgdGhlIHVuZGVybHlpbmcgYGxlYXZlYCBmdW5jdGlvbiBvZiB0aGUgc2lnbmFsbGVyIHRvIGRvIGEgXCJmdWxsIGNsZWFudXBcIlxuICAgIG9mIGFsbCBjb25uZWN0aW9ucy5cbiAgKiovXG4gIHNpZ25hbGxlci5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHNpZ25hbGxlci5lbmRDYWxscygpO1xuICAgIHNpZ25hbGxlci5sZWF2ZSgpO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyMgY3JlYXRlRGF0YUNoYW5uZWwobGFiZWwsIGNvbmZpZylcblxuICAgIFJlcXVlc3QgdGhhdCBhIGRhdGEgY2hhbm5lbCB3aXRoIHRoZSBzcGVjaWZpZWQgYGxhYmVsYCBpcyBjcmVhdGVkIG9uXG4gICAgdGhlIHBlZXIgY29ubmVjdGlvbi4gIFdoZW4gdGhlIGRhdGEgY2hhbm5lbCBpcyBvcGVuIGFuZCBhdmFpbGFibGUsIGFuXG4gICAgZXZlbnQgd2lsbCBiZSB0cmlnZ2VyZWQgdXNpbmcgdGhlIGxhYmVsIG9mIHRoZSBkYXRhIGNoYW5uZWwuXG5cbiAgICBGb3IgZXhhbXBsZSwgaWYgYSBuZXcgZGF0YSBjaGFubmVsIHdhcyByZXF1ZXN0ZWQgdXNpbmcgdGhlIGZvbGxvd2luZ1xuICAgIGNhbGw6XG5cbiAgICBgYGBqc1xuICAgIHZhciBxYyA9IHF1aWNrY29ubmVjdCgnaHR0cHM6Ly9zd2l0Y2hib2FyZC5ydGMuaW8vJykuY3JlYXRlRGF0YUNoYW5uZWwoJ3Rlc3QnKTtcbiAgICBgYGBcblxuICAgIFRoZW4gd2hlbiB0aGUgZGF0YSBjaGFubmVsIGlzIHJlYWR5IGZvciB1c2UsIGEgYHRlc3Q6b3BlbmAgZXZlbnQgd291bGRcbiAgICBiZSBlbWl0dGVkIGJ5IGBxY2AuXG5cbiAgKiovXG4gIHNpZ25hbGxlci5jcmVhdGVEYXRhQ2hhbm5lbCA9IGZ1bmN0aW9uKGxhYmVsLCBvcHRzKSB7XG4gICAgLy8gY3JlYXRlIGEgY2hhbm5lbCBvbiBhbGwgZXhpc3RpbmcgY2FsbHNcbiAgICBjYWxscy5rZXlzKCkuZm9yRWFjaChmdW5jdGlvbihwZWVySWQpIHtcbiAgICAgIHZhciBjYWxsID0gY2FsbHMuZ2V0KHBlZXJJZCk7XG4gICAgICB2YXIgZGM7XG5cbiAgICAgIC8vIGlmIHdlIGFyZSB0aGUgbWFzdGVyIGNvbm5lY3Rpb24sIGNyZWF0ZSB0aGUgZGF0YSBjaGFubmVsXG4gICAgICBpZiAoY2FsbCAmJiBjYWxsLnBjICYmIHNpZ25hbGxlci5pc01hc3RlcihwZWVySWQpKSB7XG4gICAgICAgIGRjID0gY2FsbC5wYy5jcmVhdGVEYXRhQ2hhbm5lbChsYWJlbCwgb3B0cyk7XG4gICAgICAgIGdvdFBlZXJDaGFubmVsKGRjLCBjYWxsLnBjLCBnZXRQZWVyRGF0YShwZWVySWQpKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIHNhdmUgdGhlIGRhdGEgY2hhbm5lbCBvcHRzIGluIHRoZSBsb2NhbCBjaGFubmVscyBkaWN0aW9uYXJ5XG4gICAgY2hhbm5lbHNbbGFiZWxdID0gb3B0cyB8fCBudWxsO1xuXG4gICAgcmV0dXJuIHNpZ25hbGxlcjtcbiAgfTtcblxuICAvKipcbiAgICAjIyMjIGpvaW4oKVxuXG4gICAgVGhlIGBqb2luYCBmdW5jdGlvbiBpcyB1c2VkIHdoZW4gYG1hbnVhbEpvaW5gIGlzIHNldCB0byB0cnVlIHdoZW4gY3JlYXRpbmdcbiAgICBhIHF1aWNrY29ubmVjdCBpbnN0YW5jZS4gIENhbGwgdGhlIGBqb2luYCBmdW5jdGlvbiBvbmNlIHlvdSBhcmUgcmVhZHkgdG9cbiAgICBqb2luIHRoZSBzaWduYWxsaW5nIHNlcnZlciBhbmQgaW5pdGlhdGUgY29ubmVjdGlvbnMgd2l0aCBvdGhlciBwZW9wbGUuXG5cbiAgKiovXG4gIHNpZ25hbGxlci5qb2luID0gZnVuY3Rpb24oKSB7XG4gICAgYWxsb3dKb2luID0gdHJ1ZTtcbiAgICBjaGVja1JlYWR5VG9Bbm5vdW5jZSgpO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyMgYGdldChuYW1lKWBcblxuICAgIFRoZSBgZ2V0YCBmdW5jdGlvbiByZXR1cm5zIHRoZSBwcm9wZXJ0eSB2YWx1ZSBmb3IgdGhlIHNwZWNpZmllZCBwcm9wZXJ0eSBuYW1lLlxuICAqKi9cbiAgc2lnbmFsbGVyLmdldCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gcHJvZmlsZVtuYW1lXTtcbiAgfTtcblxuICAvKipcbiAgICAjIyMjIGBnZXRMb2NhbFN0cmVhbXMoKWBcblxuICAgIFJldHVybiBhIGNvcHkgb2YgdGhlIGxvY2FsIHN0cmVhbXMgdGhhdCBoYXZlIGN1cnJlbnRseSBiZWVuIGNvbmZpZ3VyZWRcbiAgKiovXG4gIHNpZ25hbGxlci5nZXRMb2NhbFN0cmVhbXMgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gW10uY29uY2F0KGxvY2FsU3RyZWFtcyk7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIyByZWFjdGl2ZSgpXG5cbiAgICBGbGFnIHRoYXQgdGhpcyBzZXNzaW9uIHdpbGwgYmUgYSByZWFjdGl2ZSBjb25uZWN0aW9uLlxuXG4gICoqL1xuICBzaWduYWxsZXIucmVhY3RpdmUgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBhZGQgdGhlIHJlYWN0aXZlIGZsYWdcbiAgICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgICBvcHRzLnJlYWN0aXZlID0gdHJ1ZTtcblxuICAgIC8vIGNoYWluXG4gICAgcmV0dXJuIHNpZ25hbGxlcjtcbiAgfTtcblxuICAvKipcbiAgICAjIyMjIHJlbW92ZVN0cmVhbVxuXG4gICAgYGBgXG4gICAgcmVtb3ZlU3RyZWFtKHN0cmVhbTpNZWRpYVN0cmVhbSlcbiAgICBgYGBcblxuICAgIFJlbW92ZSB0aGUgc3BlY2lmaWVkIHN0cmVhbSBmcm9tIGJvdGggdGhlIGxvY2FsIHN0cmVhbXMgdGhhdCBhcmUgdG9cbiAgICBiZSBjb25uZWN0ZWQgdG8gbmV3IHBlZXJzLCBhbmQgYWxzbyBmcm9tIGFueSBhY3RpdmUgY2FsbHMuXG5cbiAgKiovXG4gIHNpZ25hbGxlci5yZW1vdmVTdHJlYW0gPSBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICB2YXIgbG9jYWxJbmRleCA9IGxvY2FsU3RyZWFtcy5pbmRleE9mKHN0cmVhbSk7XG5cbiAgICAvLyByZW1vdmUgdGhlIHN0cmVhbSBmcm9tIGFueSBhY3RpdmUgY2FsbHNcbiAgICBjYWxscy52YWx1ZXMoKS5mb3JFYWNoKGZ1bmN0aW9uKGNhbGwpIHtcbiAgICAgIGNhbGwucGMucmVtb3ZlU3RyZWFtKHN0cmVhbSk7XG4gICAgfSk7XG5cbiAgICAvLyByZW1vdmUgdGhlIHN0cmVhbSBmcm9tIHRoZSBsb2NhbFN0cmVhbXMgYXJyYXlcbiAgICBpZiAobG9jYWxJbmRleCA+PSAwKSB7XG4gICAgICBsb2NhbFN0cmVhbXMuc3BsaWNlKGxvY2FsSW5kZXgsIDEpO1xuICAgIH1cblxuICAgIHJldHVybiBzaWduYWxsZXI7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIyByZXF1ZXN0Q2hhbm5lbFxuXG4gICAgYGBgXG4gICAgcmVxdWVzdENoYW5uZWwodGFyZ2V0SWQsIGxhYmVsLCBjYWxsYmFjaylcbiAgICBgYGBcblxuICAgIFRoaXMgaXMgYSBmdW5jdGlvbiB0aGF0IGNhbiBiZSB1c2VkIHRvIHJlc3BvbmQgdG8gcmVtb3RlIHBlZXJzIHN1cHBseWluZ1xuICAgIGEgZGF0YSBjaGFubmVsIGFzIHBhcnQgb2YgdGhlaXIgY29uZmlndXJhdGlvbi4gIEFzIHBlciB0aGUgYHJlY2VpdmVTdHJlYW1gXG4gICAgZnVuY3Rpb24gdGhpcyBmdW5jdGlvbiB3aWxsIGVpdGhlciBmaXJlIHRoZSBjYWxsYmFjayBpbW1lZGlhdGVseSBpZiB0aGVcbiAgICBjaGFubmVsIGlzIGFscmVhZHkgYXZhaWxhYmxlLCBvciBvbmNlIHRoZSBjaGFubmVsIGhhcyBiZWVuIGRpc2NvdmVyZWQgb25cbiAgICB0aGUgY2FsbC5cblxuICAqKi9cbiAgc2lnbmFsbGVyLnJlcXVlc3RDaGFubmVsID0gZnVuY3Rpb24odGFyZ2V0SWQsIGxhYmVsLCBjYWxsYmFjaykge1xuICAgIHZhciBjYWxsID0gZ2V0QWN0aXZlQ2FsbCh0YXJnZXRJZCk7XG4gICAgdmFyIGNoYW5uZWwgPSBjYWxsICYmIGNhbGwuY2hhbm5lbHMuZ2V0KGxhYmVsKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgdGhlbiBjaGFubmVsIHRyaWdnZXIgdGhlIGNhbGxiYWNrIGltbWVkaWF0ZWx5XG4gICAgaWYgKGNoYW5uZWwpIHtcbiAgICAgIGNhbGxiYWNrKG51bGwsIGNoYW5uZWwpO1xuICAgICAgcmV0dXJuIHNpZ25hbGxlcjtcbiAgICB9XG5cbiAgICAvLyBpZiBub3QsIHdhaXQgZm9yIGl0XG4gICAgc2lnbmFsbGVyLm9uY2UoJ2NoYW5uZWw6b3BlbmVkOicgKyBsYWJlbCwgZnVuY3Rpb24oaWQsIGRjKSB7XG4gICAgICBjYWxsYmFjayhudWxsLCBkYyk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gc2lnbmFsbGVyO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyMgcmVxdWVzdFN0cmVhbVxuXG4gICAgYGBgXG4gICAgcmVxdWVzdFN0cmVhbSh0YXJnZXRJZCwgaWR4LCBjYWxsYmFjaylcbiAgICBgYGBcblxuICAgIFVzZWQgdG8gcmVxdWVzdCBhIHJlbW90ZSBzdHJlYW0gZnJvbSBhIHF1aWNrY29ubmVjdCBpbnN0YW5jZS4gSWYgdGhlXG4gICAgc3RyZWFtIGlzIGFscmVhZHkgYXZhaWxhYmxlIGluIHRoZSBjYWxscyByZW1vdGUgc3RyZWFtcywgdGhlbiB0aGUgY2FsbGJhY2tcbiAgICB3aWxsIGJlIHRyaWdnZXJlZCBpbW1lZGlhdGVseSwgb3RoZXJ3aXNlIHRoaXMgZnVuY3Rpb24gd2lsbCBtb25pdG9yXG4gICAgYHN0cmVhbTphZGRlZGAgZXZlbnRzIGFuZCB3YWl0IGZvciBhIG1hdGNoLlxuXG4gICAgSW4gdGhlIGNhc2UgdGhhdCBhbiB1bmtub3duIHRhcmdldCBpcyByZXF1ZXN0ZWQsIHRoZW4gYW4gZXhjZXB0aW9uIHdpbGxcbiAgICBiZSB0aHJvd24uXG4gICoqL1xuICBzaWduYWxsZXIucmVxdWVzdFN0cmVhbSA9IGZ1bmN0aW9uKHRhcmdldElkLCBpZHgsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGNhbGwgPSBnZXRBY3RpdmVDYWxsKHRhcmdldElkKTtcbiAgICB2YXIgc3RyZWFtO1xuXG4gICAgZnVuY3Rpb24gd2FpdEZvclN0cmVhbShwZWVySWQpIHtcbiAgICAgIGlmIChwZWVySWQgIT09IHRhcmdldElkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gZ2V0IHRoZSBzdHJlYW1cbiAgICAgIHN0cmVhbSA9IGNhbGwucGMuZ2V0UmVtb3RlU3RyZWFtcygpW2lkeF07XG5cbiAgICAgIC8vIGlmIHdlIGhhdmUgdGhlIHN0cmVhbSwgdGhlbiByZW1vdmUgdGhlIGxpc3RlbmVyIGFuZCB0cmlnZ2VyIHRoZSBjYlxuICAgICAgaWYgKHN0cmVhbSkge1xuICAgICAgICBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIoJ3N0cmVhbTphZGRlZCcsIHdhaXRGb3JTdHJlYW0pO1xuICAgICAgICBjYWxsYmFjayhudWxsLCBzdHJlYW0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGxvb2sgZm9yIHRoZSBzdHJlYW0gaW4gdGhlIHJlbW90ZSBzdHJlYW1zIG9mIHRoZSBjYWxsXG4gICAgc3RyZWFtID0gY2FsbC5wYy5nZXRSZW1vdGVTdHJlYW1zKClbaWR4XTtcblxuICAgIC8vIGlmIHdlIGZvdW5kIHRoZSBzdHJlYW0gdGhlbiB0cmlnZ2VyIHRoZSBjYWxsYmFja1xuICAgIGlmIChzdHJlYW0pIHtcbiAgICAgIGNhbGxiYWNrKG51bGwsIHN0cmVhbSk7XG4gICAgICByZXR1cm4gc2lnbmFsbGVyO1xuICAgIH1cblxuICAgIC8vIG90aGVyd2lzZSB3YWl0IGZvciB0aGUgc3RyZWFtXG4gICAgc2lnbmFsbGVyLm9uKCdzdHJlYW06YWRkZWQnLCB3YWl0Rm9yU3RyZWFtKTtcbiAgICByZXR1cm4gc2lnbmFsbGVyO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyMgcHJvZmlsZShkYXRhKVxuXG4gICAgVXBkYXRlIHRoZSBwcm9maWxlIGRhdGEgd2l0aCB0aGUgYXR0YWNoZWQgaW5mb3JtYXRpb24sIHNvIHdoZW5cbiAgICB0aGUgc2lnbmFsbGVyIGFubm91bmNlcyBpdCBpbmNsdWRlcyB0aGlzIGRhdGEgaW4gYWRkaXRpb24gdG8gYW55XG4gICAgcm9vbSBhbmQgaWQgaW5mb3JtYXRpb24uXG5cbiAgKiovXG4gIHNpZ25hbGxlci5wcm9maWxlID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIGV4dGVuZChwcm9maWxlLCBkYXRhKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYWxyZWFkeSBhbm5vdW5jZWQsIHRoZW4gcmVhbm5vdW5jZSBvdXIgcHJvZmlsZSB0byBwcm92aWRlXG4gICAgLy8gb3RoZXJzIGEgYHBlZXI6dXBkYXRlYCBldmVudFxuICAgIGlmIChhbm5vdW5jZWQpIHtcbiAgICAgIGNsZWFyVGltZW91dCh1cGRhdGVUaW1lcik7XG4gICAgICB1cGRhdGVUaW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHNpZ25hbGxlci5hbm5vdW5jZShwcm9maWxlKTtcbiAgICAgIH0sIChvcHRzIHx8IHt9KS51cGRhdGVEZWxheSB8fCAxMDAwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2lnbmFsbGVyO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyMgd2FpdEZvckNhbGxcblxuICAgIGBgYFxuICAgIHdhaXRGb3JDYWxsKHRhcmdldElkLCBjYWxsYmFjaylcbiAgICBgYGBcblxuICAgIFdhaXQgZm9yIGEgY2FsbCBmcm9tIHRoZSBzcGVjaWZpZWQgdGFyZ2V0SWQuICBJZiB0aGUgY2FsbCBpcyBhbHJlYWR5XG4gICAgYWN0aXZlIHRoZSBjYWxsYmFjayB3aWxsIGJlIGZpcmVkIGltbWVkaWF0ZWx5LCBvdGhlcndpc2Ugd2Ugd2lsbCB3YWl0XG4gICAgZm9yIGEgYGNhbGw6c3RhcnRlZGAgZXZlbnQgdGhhdCBtYXRjaGVzIHRoZSByZXF1ZXN0ZWQgYHRhcmdldElkYFxuXG4gICoqL1xuICBzaWduYWxsZXIud2FpdEZvckNhbGwgPSBmdW5jdGlvbih0YXJnZXRJZCwgY2FsbGJhY2spIHtcbiAgICB2YXIgY2FsbCA9IGNhbGxzLmdldCh0YXJnZXRJZCk7XG5cbiAgICBpZiAoY2FsbCAmJiBjYWxsLmFjdGl2ZSkge1xuICAgICAgY2FsbGJhY2sobnVsbCwgY2FsbC5wYyk7XG4gICAgICByZXR1cm4gc2lnbmFsbGVyO1xuICAgIH1cblxuICAgIHNpZ25hbGxlci5vbignY2FsbDpzdGFydGVkJywgZnVuY3Rpb24gaGFuZGxlTmV3Q2FsbChpZCkge1xuICAgICAgaWYgKGlkID09PSB0YXJnZXRJZCkge1xuICAgICAgICBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIoJ2NhbGw6c3RhcnRlZCcsIGhhbmRsZU5ld0NhbGwpO1xuICAgICAgICBjYWxsYmFjayhudWxsLCBjYWxscy5nZXQoaWQpLnBjKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICAvLyBpZiB3ZSBoYXZlIGFuIGV4cGVjdGVkIG51bWJlciBvZiBsb2NhbCBzdHJlYW1zLCB0aGVuIHVzZSBhIGZpbHRlciB0b1xuICAvLyBjaGVjayBpZiB3ZSBzaG91bGQgcmVzcG9uZFxuICBpZiAoZXhwZWN0ZWRMb2NhbFN0cmVhbXMpIHtcbiAgICBzaWduYWxsZXIub24oJ3BlZXI6ZmlsdGVyJywgaGFuZGxlUGVlckZpbHRlcik7XG4gIH1cblxuICAvLyByZXNwb25kIHRvIGxvY2FsIGFubm91bmNlIG1lc3NhZ2VzXG4gIHNpZ25hbGxlci5vbignbG9jYWw6YW5ub3VuY2UnLCBoYW5kbGVMb2NhbEFubm91bmNlKTtcblxuICAvLyBoYW5kbGUgcGluZyBtZXNzYWdlc1xuICBzaWduYWxsZXIub24oJ21lc3NhZ2U6cGluZycsIGNhbGxzLnBpbmcpO1xuXG4gIC8vIHVzZSBnZW5pY2UgdG8gZmluZCBvdXIgaWNlU2VydmVyc1xuICByZXF1aXJlKCdydGMtY29yZS9nZW5pY2UnKShvcHRzLCBmdW5jdGlvbihlcnIsIHNlcnZlcnMpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICByZXR1cm4gY29uc29sZS5lcnJvcignY291bGQgbm90IGZpbmQgaWNlU2VydmVyczogJywgZXJyKTtcbiAgICB9XG5cbiAgICBpY2VTZXJ2ZXJzID0gc2VydmVycztcbiAgICBjaGVja1JlYWR5VG9Bbm5vdW5jZSgpO1xuICB9KTtcblxuICAvLyBpZiB3ZSBwbHVnaW4gaXMgYWN0aXZlLCB0aGVuIGluaXRpYWxpemUgaXRcbiAgaWYgKHBsdWdpbikge1xuICAgIGluaXRQbHVnaW4oKTtcbiAgfVxuXG4gIC8vIHBhc3MgdGhlIHNpZ25hbGxlciBvblxuICByZXR1cm4gc2lnbmFsbGVyO1xufTtcbiIsInZhciBydGMgPSByZXF1aXJlKCdydGMtdG9vbHMnKTtcbnZhciBkZWJ1ZyA9IHJ0Yy5sb2dnZXIoJ3J0Yy1xdWlja2Nvbm5lY3QnKTtcbnZhciBjbGVhbnVwID0gcmVxdWlyZSgncnRjLXRvb2xzL2NsZWFudXAnKTtcbnZhciBnZXRhYmxlID0gcmVxdWlyZSgnY29nL2dldGFibGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzaWduYWxsZXIsIG9wdHMpIHtcbiAgdmFyIGNhbGxzID0gZ2V0YWJsZSh7fSk7XG4gIHZhciBnZXRQZWVyRGF0YSA9IHJlcXVpcmUoJy4vZ2V0cGVlcmRhdGEnKShzaWduYWxsZXIucGVlcnMpO1xuICB2YXIgaGVhcnRiZWF0O1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZShpZCwgcGMpIHtcbiAgICBjYWxscy5zZXQoaWQsIHtcbiAgICAgIGFjdGl2ZTogZmFsc2UsXG4gICAgICBwYzogcGMsXG4gICAgICBjaGFubmVsczogZ2V0YWJsZSh7fSksXG4gICAgICBzdHJlYW1zOiBbXSxcbiAgICAgIGxhc3RwaW5nOiBEYXRlLm5vdygpXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVTdHJlYW1BZGRIYW5kbGVyKGlkKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgZGVidWcoJ3BlZXIgJyArIGlkICsgJyBhZGRlZCBzdHJlYW0nKTtcbiAgICAgIHVwZGF0ZVJlbW90ZVN0cmVhbXMoaWQpO1xuICAgICAgcmVjZWl2ZVJlbW90ZVN0cmVhbShpZCkoZXZ0LnN0cmVhbSk7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVN0cmVhbVJlbW92ZUhhbmRsZXIoaWQpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICBkZWJ1ZygncGVlciAnICsgaWQgKyAnIHJlbW92ZWQgc3RyZWFtJyk7XG4gICAgICB1cGRhdGVSZW1vdGVTdHJlYW1zKGlkKTtcbiAgICAgIHNpZ25hbGxlcignc3RyZWFtOnJlbW92ZWQnLCBpZCwgZXZ0LnN0cmVhbSk7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGVuZChpZCkge1xuICAgIHZhciBjYWxsID0gY2FsbHMuZ2V0KGlkKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgbm8gZGF0YSwgdGhlbiBkbyBub3RoaW5nXG4gICAgaWYgKCEgY2FsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGlmIHdlIGhhdmUgbm8gZGF0YSwgdGhlbiByZXR1cm5cbiAgICBjYWxsLmNoYW5uZWxzLmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uKGxhYmVsKSB7XG4gICAgICB2YXIgY2hhbm5lbCA9IGNhbGwuY2hhbm5lbHMuZ2V0KGxhYmVsKTtcbiAgICAgIHZhciBhcmdzID0gW2lkLCBjaGFubmVsLCBsYWJlbF07XG5cbiAgICAgIC8vIGVtaXQgdGhlIHBsYWluIGNoYW5uZWw6Y2xvc2VkIGV2ZW50XG4gICAgICBzaWduYWxsZXIuYXBwbHkoc2lnbmFsbGVyLCBbJ2NoYW5uZWw6Y2xvc2VkJ10uY29uY2F0KGFyZ3MpKTtcblxuICAgICAgLy8gZW1pdCB0aGUgbGFiZWxsZWQgdmVyc2lvbiBvZiB0aGUgZXZlbnRcbiAgICAgIHNpZ25hbGxlci5hcHBseShzaWduYWxsZXIsIFsnY2hhbm5lbDpjbG9zZWQ6JyArIGxhYmVsXS5jb25jYXQoYXJncykpO1xuXG4gICAgICAvLyBkZWNvdXBsZSB0aGUgZXZlbnRzXG4gICAgICBjaGFubmVsLm9ub3BlbiA9IG51bGw7XG4gICAgfSk7XG5cbiAgICAvLyB0cmlnZ2VyIHN0cmVhbTpyZW1vdmVkIGV2ZW50cyBmb3IgZWFjaCBvZiB0aGUgcmVtb3Rlc3RyZWFtcyBpbiB0aGUgcGNcbiAgICBjYWxsLnN0cmVhbXMuZm9yRWFjaChmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgIHNpZ25hbGxlcignc3RyZWFtOnJlbW92ZWQnLCBpZCwgc3RyZWFtKTtcbiAgICB9KTtcblxuICAgIC8vIGRlbGV0ZSB0aGUgY2FsbCBkYXRhXG4gICAgY2FsbHMuZGVsZXRlKGlkKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgbm8gbW9yZSBjYWxscywgZGlzYWJsZSB0aGUgaGVhcnRiZWF0XG4gICAgaWYgKGNhbGxzLmtleXMoKS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJlc2V0SGVhcnRiZWF0KCk7XG4gICAgfVxuXG4gICAgLy8gdHJpZ2dlciB0aGUgY2FsbDplbmRlZCBldmVudFxuICAgIHNpZ25hbGxlcignY2FsbDplbmRlZCcsIGlkLCBjYWxsLnBjKTtcblxuICAgIC8vIGVuc3VyZSB0aGUgcGVlciBjb25uZWN0aW9uIGlzIHByb3Blcmx5IGNsZWFuZWQgdXBcbiAgICBjbGVhbnVwKGNhbGwucGMpO1xuICB9XG5cbiAgZnVuY3Rpb24gcGluZyhzZW5kZXIpIHtcbiAgICB2YXIgY2FsbCA9IGNhbGxzLmdldChzZW5kZXIgJiYgc2VuZGVyLmlkKTtcblxuICAgIC8vIHNldCB0aGUgbGFzdCBwaW5nIGZvciB0aGUgZGF0YVxuICAgIGlmIChjYWxsKSB7XG4gICAgICBjYWxsLmxhc3RwaW5nID0gRGF0ZS5ub3coKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZWNlaXZlUmVtb3RlU3RyZWFtKGlkKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgc2lnbmFsbGVyKCdzdHJlYW06YWRkZWQnLCBpZCwgc3RyZWFtLCBnZXRQZWVyRGF0YShpZCkpO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiByZXNldEhlYXJ0YmVhdCgpIHtcbiAgICBjbGVhckludGVydmFsKGhlYXJ0YmVhdCk7XG4gICAgaGVhcnRiZWF0ID0gMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHN0YXJ0KGlkLCBwYywgZGF0YSkge1xuICAgIHZhciBjYWxsID0gY2FsbHMuZ2V0KGlkKTtcbiAgICB2YXIgc3RyZWFtcyA9IFtdLmNvbmNhdChwYy5nZXRSZW1vdGVTdHJlYW1zKCkpO1xuXG4gICAgLy8gZmxhZyB0aGUgY2FsbCBhcyBhY3RpdmVcbiAgICBjYWxsLmFjdGl2ZSA9IHRydWU7XG4gICAgY2FsbC5zdHJlYW1zID0gW10uY29uY2F0KHBjLmdldFJlbW90ZVN0cmVhbXMoKSk7XG5cbiAgICBwYy5vbmFkZHN0cmVhbSA9IGNyZWF0ZVN0cmVhbUFkZEhhbmRsZXIoaWQpO1xuICAgIHBjLm9ucmVtb3Zlc3RyZWFtID0gY3JlYXRlU3RyZWFtUmVtb3ZlSGFuZGxlcihpZCk7XG5cbiAgICBkZWJ1ZyhzaWduYWxsZXIuaWQgKyAnIC0gJyArIGlkICsgJyBjYWxsIHN0YXJ0OiAnICsgc3RyZWFtcy5sZW5ndGggKyAnIHN0cmVhbXMnKTtcbiAgICBzaWduYWxsZXIoJ2NhbGw6c3RhcnRlZCcsIGlkLCBwYywgZGF0YSk7XG5cbiAgICAvLyBjb25maWd1cmUgdGhlIGhlYXJ0YmVhdCB0aW1lclxuICAgIGhlYXJ0YmVhdCA9IGhlYXJ0YmVhdCB8fCByZXF1aXJlKCcuL2hlYXJ0YmVhdCcpKHNpZ25hbGxlciwgY2FsbHMsIG9wdHMpO1xuXG4gICAgLy8gZXhhbWluZSB0aGUgZXhpc3RpbmcgcmVtb3RlIHN0cmVhbXMgYWZ0ZXIgYSBzaG9ydCBkZWxheVxuICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICAvLyBpdGVyYXRlIHRocm91Z2ggYW55IHJlbW90ZSBzdHJlYW1zXG4gICAgICBzdHJlYW1zLmZvckVhY2gocmVjZWl2ZVJlbW90ZVN0cmVhbShpZCkpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlUmVtb3RlU3RyZWFtcyhpZCkge1xuICAgIHZhciBjYWxsID0gY2FsbHMuZ2V0KGlkKTtcblxuICAgIGlmIChjYWxsICYmIGNhbGwucGMpIHtcbiAgICAgIGNhbGwuc3RyZWFtcyA9IFtdLmNvbmNhdChjYWxsLnBjLmdldFJlbW90ZVN0cmVhbXMoKSk7XG4gICAgfVxuICB9XG5cbiAgY2FsbHMuY3JlYXRlID0gY3JlYXRlO1xuICBjYWxscy5lbmQgPSBlbmQ7XG4gIGNhbGxzLnBpbmcgPSBwaW5nO1xuICBjYWxscy5zdGFydCA9IHN0YXJ0O1xuXG4gIHJldHVybiBjYWxscztcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHBlZXJzKSB7XG4gIHJldHVybiBmdW5jdGlvbihpZCkge1xuICAgIHZhciBwZWVyID0gcGVlcnMuZ2V0KGlkKTtcbiAgICByZXR1cm4gcGVlciAmJiBwZWVyLmRhdGE7XG4gIH07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzaWduYWxsZXIsIGNhbGxzLCBvcHRzKSB7XG4gIHZhciBoZWFydGJlYXQgPSAob3B0cyB8fCB7fSkuaGVhcnRiZWF0IHx8IDI1MDA7XG4gIHZhciBoZWFydGJlYXRUaW1lciA9IDA7XG5cbiAgZnVuY3Rpb24gc2VuZCgpIHtcbiAgICB2YXIgdGlja0luYWN0aXZlID0gKERhdGUubm93KCkgLSAoaGVhcnRiZWF0ICogNCkpO1xuXG4gICAgLy8gaXRlcmF0ZSB0aHJvdWdoIG91ciBlc3RhYmxpc2hlZCBjYWxsc1xuICAgIGNhbGxzLmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uKGlkKSB7XG4gICAgICB2YXIgY2FsbCA9IGNhbGxzLmdldChpZCk7XG5cbiAgICAgIC8vIGlmIHRoZSBjYWxsIHBpbmcgaXMgdG9vIG9sZCwgZW5kIHRoZSBjYWxsXG4gICAgICBpZiAoY2FsbC5sYXN0cGluZyA8IHRpY2tJbmFjdGl2ZSkge1xuICAgICAgICByZXR1cm4gY2FsbHMuZW5kKGlkKTtcbiAgICAgIH1cblxuICAgICAgLy8gc2VuZCBhIHBpbmcgbWVzc2FnZVxuICAgICAgc2lnbmFsbGVyLnRvKGlkKS5zZW5kKCcvcGluZycpO1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKCEgaGVhcnRiZWF0KSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgcmV0dXJuIHNldEludGVydmFsKHNlbmQsIGhlYXJ0YmVhdCk7XG59O1xuIiwidmFyIHJlRGVsaW0gPSAvW1xcLlxcOl0vO1xuXG4vKipcbiAgIyBtYnVzXG5cbiAgSWYgTm9kZSdzIEV2ZW50RW1pdHRlciBhbmQgRXZlIHdlcmUgdG8gaGF2ZSBhIGNoaWxkLCBpdCBtaWdodCBsb29rIHNvbWV0aGluZyBsaWtlIHRoaXMuXG4gIE5vIHdpbGRjYXJkIHN1cHBvcnQgYXQgdGhpcyBzdGFnZSB0aG91Z2guLi5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgPDw8IGRvY3MvdXNhZ2UubWRcblxuICAjIyBSZWZlcmVuY2VcblxuICAjIyMgYG1idXMobmFtZXNwYWNlPywgcGFyZW50Pywgc2NvcGU/KWBcblxuICBDcmVhdGUgYSBuZXcgbWVzc2FnZSBidXMgd2l0aCBgbmFtZXNwYWNlYCBpbmhlcml0aW5nIGZyb20gdGhlIGBwYXJlbnRgXG4gIG1idXMgaW5zdGFuY2UuICBJZiBldmVudHMgZnJvbSB0aGlzIG1lc3NhZ2UgYnVzIHNob3VsZCBiZSB0cmlnZ2VyZWQgd2l0aFxuICBhIHNwZWNpZmljIGB0aGlzYCBzY29wZSwgdGhlbiBzcGVjaWZ5IGl0IHVzaW5nIHRoZSBgc2NvcGVgIGFyZ3VtZW50LlxuXG4qKi9cblxudmFyIGNyZWF0ZUJ1cyA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obmFtZXNwYWNlLCBwYXJlbnQsIHNjb3BlKSB7XG4gIHZhciByZWdpc3RyeSA9IHt9O1xuICB2YXIgZmVlZHMgPSBbXTtcblxuICBmdW5jdGlvbiBidXMobmFtZSkge1xuICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIHZhciBkZWxpbWl0ZWQgPSBub3JtYWxpemUobmFtZSk7XG4gICAgdmFyIGhhbmRsZXJzID0gcmVnaXN0cnlbZGVsaW1pdGVkXSB8fCBbXTtcbiAgICB2YXIgcmVzdWx0cztcblxuICAgIC8vIHNlbmQgdGhyb3VnaCB0aGUgZmVlZHNcbiAgICBmZWVkcy5mb3JFYWNoKGZ1bmN0aW9uKGZlZWQpIHtcbiAgICAgIGZlZWQoeyBuYW1lOiBkZWxpbWl0ZWQsIGFyZ3M6IGFyZ3MgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBydW4gdGhlIHJlZ2lzdGVyZWQgaGFuZGxlcnNcbiAgICByZXN1bHRzID0gW10uY29uY2F0KGhhbmRsZXJzKS5tYXAoZnVuY3Rpb24oaGFuZGxlcikge1xuICAgICAgcmV0dXJuIGhhbmRsZXIuYXBwbHkoc2NvcGUgfHwgdGhpcywgYXJncyk7XG4gICAgfSk7XG5cbiAgICAvLyBydW4gdGhlIHBhcmVudCBoYW5kbGVyc1xuICAgIGlmIChidXMucGFyZW50KSB7XG4gICAgICByZXN1bHRzID0gcmVzdWx0cy5jb25jYXQoXG4gICAgICAgIGJ1cy5wYXJlbnQuYXBwbHkoXG4gICAgICAgICAgc2NvcGUgfHwgdGhpcyxcbiAgICAgICAgICBbKG5hbWVzcGFjZSA/IG5hbWVzcGFjZSArICcuJyA6ICcnKSArIGRlbGltaXRlZF0uY29uY2F0KGFyZ3MpXG4gICAgICAgIClcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cblxuICAvKipcbiAgICAjIyMgYG1idXMjY2xlYXIoKWBcblxuICAgIFJlc2V0IHRoZSBoYW5kbGVyIHJlZ2lzdHJ5LCB3aGljaCBlc3NlbnRpYWwgZGVyZWdpc3RlcnMgYWxsIGV2ZW50IGxpc3RlbmVycy5cblxuICAgIF9BbGlhczpfIGByZW1vdmVBbGxMaXN0ZW5lcnNgXG4gICoqL1xuICBmdW5jdGlvbiBjbGVhcihuYW1lKSB7XG4gICAgLy8gaWYgd2UgaGF2ZSBhIG5hbWUsIHJlc2V0IGhhbmRsZXJzIGZvciB0aGF0IGhhbmRsZXJcbiAgICBpZiAobmFtZSkge1xuICAgICAgZGVsZXRlIHJlZ2lzdHJ5W25vcm1hbGl6ZShuYW1lKV07XG4gICAgfVxuICAgIC8vIG90aGVyd2lzZSwgcmVzZXQgdGhlIGVudGlyZSBoYW5kbGVyIHJlZ2lzdHJ5XG4gICAgZWxzZSB7XG4gICAgICByZWdpc3RyeSA9IHt9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgICMjIyBgbWJ1cyNmZWVkKGhhbmRsZXIpYFxuXG4gICAgQXR0YWNoIGEgaGFuZGxlciBmdW5jdGlvbiB0aGF0IHdpbGwgc2VlIGFsbCBldmVudHMgdGhhdCBhcmUgc2VudCB0aHJvdWdoXG4gICAgdGhpcyBidXMgaW4gYW4gXCJvYmplY3Qgc3RyZWFtXCIgZm9ybWF0IHRoYXQgbWF0Y2hlcyB0aGUgZm9sbG93aW5nIGZvcm1hdDpcblxuICAgIGBgYFxuICAgIHsgbmFtZTogJ2V2ZW50Lm5hbWUnLCBhcmdzOiBbICdldmVudCcsICdhcmdzJyBdIH1cbiAgICBgYGBcblxuICAgIFRoZSBmZWVkIGZ1bmN0aW9uIHJldHVybnMgYSBmdW5jdGlvbiB0aGF0IGNhbiBiZSBjYWxsZWQgdG8gc3RvcCB0aGUgZmVlZFxuICAgIHNlbmRpbmcgZGF0YS5cblxuICAqKi9cbiAgZnVuY3Rpb24gZmVlZChoYW5kbGVyKSB7XG4gICAgZnVuY3Rpb24gc3RvcCgpIHtcbiAgICAgIGZlZWRzLnNwbGljZShmZWVkcy5pbmRleE9mKGhhbmRsZXIpLCAxKTtcbiAgICB9XG5cbiAgICBmZWVkcy5wdXNoKGhhbmRsZXIpO1xuICAgIHJldHVybiBzdG9wO1xuICB9XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplKG5hbWUpIHtcbiAgICByZXR1cm4gKEFycmF5LmlzQXJyYXkobmFtZSkgPyBuYW1lIDogbmFtZS5zcGxpdChyZURlbGltKSkuam9pbignLicpO1xuICB9XG5cbiAgLyoqXG4gICAgIyMjIGBtYnVzI29mZihuYW1lLCBoYW5kbGVyKWBcblxuICAgIERlcmVnaXN0ZXIgYW4gZXZlbnQgaGFuZGxlci5cbiAgKiovXG4gIGZ1bmN0aW9uIG9mZihuYW1lLCBoYW5kbGVyKSB7XG4gICAgdmFyIGhhbmRsZXJzID0gcmVnaXN0cnlbbm9ybWFsaXplKG5hbWUpXSB8fCBbXTtcbiAgICB2YXIgaWR4ID0gaGFuZGxlcnMgPyBoYW5kbGVycy5pbmRleE9mKGhhbmRsZXIuX2FjdHVhbCB8fCBoYW5kbGVyKSA6IC0xO1xuXG4gICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICBoYW5kbGVycy5zcGxpY2UoaWR4LCAxKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICAjIyMgYG1idXMjb24obmFtZSwgaGFuZGxlcilgXG5cbiAgICBSZWdpc3RlciBhbiBldmVudCBoYW5kbGVyIGZvciB0aGUgZXZlbnQgYG5hbWVgLlxuXG4gICoqL1xuICBmdW5jdGlvbiBvbihuYW1lLCBoYW5kbGVyKSB7XG4gICAgdmFyIGhhbmRsZXJzO1xuXG4gICAgbmFtZSA9IG5vcm1hbGl6ZShuYW1lKTtcbiAgICBoYW5kbGVycyA9IHJlZ2lzdHJ5W25hbWVdO1xuXG4gICAgaWYgKGhhbmRsZXJzKSB7XG4gICAgICBoYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJlZ2lzdHJ5W25hbWVdID0gWyBoYW5kbGVyIF07XG4gICAgfVxuXG4gICAgcmV0dXJuIGJ1cztcbiAgfVxuXG5cbiAgLyoqXG4gICAgIyMjIGBtYnVzI29uY2UobmFtZSwgaGFuZGxlcilgXG5cbiAgICBSZWdpc3RlciBhbiBldmVudCBoYW5kbGVyIGZvciB0aGUgZXZlbnQgYG5hbWVgIHRoYXQgd2lsbCBvbmx5XG4gICAgdHJpZ2dlciBvbmNlIChpLmUuIHRoZSBoYW5kbGVyIHdpbGwgYmUgZGVyZWdpc3RlcmVkIGltbWVkaWF0ZWx5IGFmdGVyXG4gICAgYmVpbmcgdHJpZ2dlcmVkIHRoZSBmaXJzdCB0aW1lKS5cblxuICAqKi9cbiAgZnVuY3Rpb24gb25jZShuYW1lLCBoYW5kbGVyKSB7XG4gICAgZnVuY3Rpb24gaGFuZGxlRXZlbnQoKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gaGFuZGxlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgICBidXMub2ZmKG5hbWUsIGhhbmRsZUV2ZW50KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgaGFuZGxlci5fYWN0dWFsID0gaGFuZGxlRXZlbnQ7XG4gICAgcmV0dXJuIG9uKG5hbWUsIGhhbmRsZUV2ZW50KTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgbmFtZXNwYWNlID09ICdmdW5jdGlvbicpIHtcbiAgICBwYXJlbnQgPSBuYW1lc3BhY2U7XG4gICAgbmFtZXNwYWNlID0gJyc7XG4gIH1cblxuICBuYW1lc3BhY2UgPSBub3JtYWxpemUobmFtZXNwYWNlIHx8ICcnKTtcblxuICBidXMuY2xlYXIgPSBidXMucmVtb3ZlQWxsTGlzdGVuZXJzID0gY2xlYXI7XG4gIGJ1cy5mZWVkID0gZmVlZDtcbiAgYnVzLm9uID0gYnVzLmFkZExpc3RlbmVyID0gb247XG4gIGJ1cy5vbmNlID0gb25jZTtcbiAgYnVzLm9mZiA9IGJ1cy5yZW1vdmVMaXN0ZW5lciA9IG9mZjtcbiAgYnVzLnBhcmVudCA9IHBhcmVudCB8fCAobmFtZXNwYWNlICYmIGNyZWF0ZUJ1cygpKTtcblxuICByZXR1cm4gYnVzO1xufTtcbiIsIi8qKlxuICAjIHJ0Yy1wbHVnZ2FibGUtc2lnbmFsbGVyXG5cbiAgQnkgdXNpbmcgYHJ0Yy1wbHVnZ2FibGUtc2lnbmFsbGVyYCBpbiB5b3VyIGNvZGUsIHlvdSBwcm92aWRlIHRoZSBhYmlsaXR5XG4gIGZvciB5b3VyIHBhY2thZ2UgdG8gY3VzdG9taXplIHdoaWNoIHNpZ25hbGxpbmcgY2xpZW50IGl0IHVzZXMgKGFuZFxuICB0aHVzIGhhdmUgc2lnbmlmaWNhbnQgY29udHJvbCkgb3ZlciBob3cgc2lnbmFsbGluZyBvcGVyYXRlcyBpbiB5b3VyXG4gIGVudmlyb25tZW50LlxuXG4gICMjIEhvdyBpdCBXb3Jrc1xuXG4gIFRoZSBwbHVnZ2FibGUgc2lnbmFsbGVyIGxvb2tzIGluIHRoZSBwcm92aWRlZCBgb3B0c2AgZm9yIGEgYHNpZ25hbGxlcmBcbiAgYXR0cmlidXRlLiAgSWYgdGhlIHZhbHVlIG9mIHRoaXMgYXR0cmlidXRlIGlzIGEgc3RyaW5nLCB0aGVuIGl0IGlzXG4gIGFzc3VtZWQgdGhhdCB5b3Ugd2lzaCB0byB1c2UgdGhlIGRlZmF1bHRcbiAgW2BydGMtc2lnbmFsbGVyYF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtc2lnbmFsbGVyKSBpbiB5b3VyXG4gIHBhY2thZ2UuICBJZiwgaG93ZXZlciwgaXQgaXMgbm90IGEgc3RyaW5nIHZhbHVlIHRoZW4gaXQgd2lsbCBiZSBwYXNzZWRcbiAgc3RyYWlnaHQgYmFjayBhcyB0aGUgc2lnbmFsbGVyIChhc3N1bWluZyB0aGF0IHlvdSBoYXZlIHByb3ZpZGVkIGFuXG4gIG9iamVjdCB0aGF0IGlzIGNvbXBsaWFudCB3aXRoIHRoZSBydGMuaW8gc2lnbmFsbGluZyBBUEkpLlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob3B0cykge1xuICB2YXIgc2lnbmFsbGVyID0gKG9wdHMgfHwge30pLnNpZ25hbGxlcjtcbiAgdmFyIG1lc3NlbmdlciA9IChvcHRzIHx8IHt9KS5tZXNzZW5nZXIgfHwgcmVxdWlyZSgncnRjLXN3aXRjaGJvYXJkLW1lc3NlbmdlcicpO1xuXG4gIGlmICh0eXBlb2Ygc2lnbmFsbGVyID09ICdzdHJpbmcnIHx8IChzaWduYWxsZXIgaW5zdGFuY2VvZiBTdHJpbmcpKSB7XG4gICAgcmV0dXJuIHJlcXVpcmUoJ3J0Yy1zaWduYWxsZXInKShtZXNzZW5nZXIoc2lnbmFsbGVyKSwgb3B0cyk7XG4gIH1cblxuICByZXR1cm4gc2lnbmFsbGVyO1xufTtcbiIsInZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG5cbi8qKlxuICAjIHJ0Yy1zd2l0Y2hib2FyZC1tZXNzZW5nZXJcblxuICBBIHNwZWNpYWxpc2VkIHZlcnNpb24gb2ZcbiAgW2BtZXNzZW5nZXItd3NgXShodHRwczovL2dpdGh1Yi5jb20vRGFtb25PZWhsbWFuL21lc3Nlbmdlci13cykgZGVzaWduZWQgdG9cbiAgY29ubmVjdCB0byBbYHJ0Yy1zd2l0Y2hib2FyZGBdKGh0dHA6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtc3dpdGNoYm9hcmQpXG4gIGluc3RhbmNlcy5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHN3aXRjaGJvYXJkLCBvcHRzKSB7XG4gIHJldHVybiByZXF1aXJlKCdtZXNzZW5nZXItd3MnKShzd2l0Y2hib2FyZCwgZXh0ZW5kKHtcbiAgICBlbmRwb2ludHM6IFsnL3ByaW11cycsICcvJ11cbiAgfSwgb3B0cykpO1xufTtcbiIsInZhciBXZWJTb2NrZXQgPSByZXF1aXJlKCd3cycpO1xudmFyIHdzdXJsID0gcmVxdWlyZSgnd3N1cmwnKTtcbnZhciBwcyA9IHJlcXVpcmUoJ3B1bGwtd3MnKTtcbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJ2NvZy9kZWZhdWx0cycpO1xudmFyIHJlVHJhaWxpbmdTbGFzaCA9IC9cXC8kLztcblxuLyoqXG4gICMgbWVzc2VuZ2VyLXdzXG5cbiAgVGhpcyBpcyBhIHNpbXBsZSBtZXNzYWdpbmcgaW1wbGVtZW50YXRpb24gZm9yIHNlbmRpbmcgYW5kIHJlY2VpdmluZyBkYXRhXG4gIHZpYSB3ZWJzb2NrZXRzLlxuXG4gIEZvbGxvd3MgdGhlIFttZXNzZW5nZXItYXJjaGV0eXBlXShodHRwczovL2dpdGh1Yi5jb20vRGFtb25PZWhsbWFuL21lc3Nlbmdlci1hcmNoZXR5cGUpXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIDw8PCBleGFtcGxlcy9zaW1wbGUuanNcblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHVybCwgb3B0cykge1xuICB2YXIgdGltZW91dCA9IChvcHRzIHx8IHt9KS50aW1lb3V0IHx8IDEwMDA7XG4gIHZhciBlbmRwb2ludHMgPSAoKG9wdHMgfHwge30pLmVuZHBvaW50cyB8fCBbJy8nXSkubWFwKGZ1bmN0aW9uKGVuZHBvaW50KSB7XG4gICAgcmV0dXJuIHVybC5yZXBsYWNlKHJlVHJhaWxpbmdTbGFzaCwgJycpICsgZW5kcG9pbnQ7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGNvbm5lY3QoY2FsbGJhY2spIHtcbiAgICB2YXIgcXVldWUgPSBbXS5jb25jYXQoZW5kcG9pbnRzKTtcbiAgICB2YXIgcmVjZWl2ZWREYXRhID0gZmFsc2U7XG4gICAgdmFyIGZhaWxUaW1lcjtcbiAgICB2YXIgc3VjY2Vzc1RpbWVyO1xuICAgIHZhciByZW1vdmVMaXN0ZW5lcjtcblxuICAgIGZ1bmN0aW9uIGF0dGVtcHROZXh0KCkge1xuICAgICAgdmFyIHNvY2tldDtcblxuICAgICAgZnVuY3Rpb24gcmVnaXN0ZXJNZXNzYWdlKGV2dCkge1xuICAgICAgICByZWNlaXZlZERhdGEgPSB0cnVlO1xuICAgICAgICByZW1vdmVMaXN0ZW5lci5jYWxsKHNvY2tldCwgJ21lc3NhZ2UnLCByZWdpc3Rlck1lc3NhZ2UpO1xuICAgICAgfVxuXG4gICAgICAvLyBpZiB3ZSBoYXZlIG5vIG1vcmUgdmFsaWQgZW5kcG9pbnRzLCB0aGVuIGVyb3JyIG91dFxuICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdVbmFibGUgdG8gY29ubmVjdCB0byB1cmw6ICcgKyB1cmwpKTtcbiAgICAgIH1cblxuICAgICAgc29ja2V0ID0gbmV3IFdlYlNvY2tldCh3c3VybChxdWV1ZS5zaGlmdCgpKSk7XG4gICAgICBzb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBoYW5kbGVFcnJvcik7XG4gICAgICBzb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBoYW5kbGVBYm5vcm1hbENsb3NlKTtcbiAgICAgIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKCdvcGVuJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIGNyZWF0ZSB0aGUgc291cmNlIGltbWVkaWF0ZWx5IHRvIGJ1ZmZlciBhbnkgZGF0YVxuICAgICAgICB2YXIgc291cmNlID0gcHMuc291cmNlKHNvY2tldCwgb3B0cyk7XG5cbiAgICAgICAgLy8gbW9uaXRvciBkYXRhIGZsb3dpbmcgZnJvbSB0aGUgc29ja2V0XG4gICAgICAgIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgcmVnaXN0ZXJNZXNzYWdlKTtcblxuICAgICAgICBzdWNjZXNzVGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNsZWFyVGltZW91dChmYWlsVGltZXIpO1xuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHNvdXJjZSwgcHMuc2luayhzb2NrZXQsIG9wdHMpKTtcbiAgICAgICAgfSwgMTAwKTtcbiAgICAgIH0pO1xuXG4gICAgICByZW1vdmVMaXN0ZW5lciA9IHNvY2tldC5yZW1vdmVFdmVudExpc3RlbmVyIHx8IHNvY2tldC5yZW1vdmVMaXN0ZW5lcjtcbiAgICAgIGZhaWxUaW1lciA9IHNldFRpbWVvdXQoYXR0ZW1wdE5leHQsIHRpbWVvdXQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhbmRsZUFibm9ybWFsQ2xvc2UoZXZ0KSB7XG4gICAgICAvLyBpZiB0aGlzIHdhcyBhIGNsZWFuIGNsb3NlIGRvIG5vdGhpbmdcbiAgICAgIGlmIChldnQud2FzQ2xlYW4gfHwgcmVjZWl2ZWREYXRhIHx8IHF1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBjbGVhclRpbWVvdXQoc3VjY2Vzc1RpbWVyKTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGZhaWxUaW1lcik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGhhbmRsZUVycm9yKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaGFuZGxlRXJyb3IoKSB7XG4gICAgICBjbGVhclRpbWVvdXQoc3VjY2Vzc1RpbWVyKTtcbiAgICAgIGNsZWFyVGltZW91dChmYWlsVGltZXIpO1xuICAgICAgYXR0ZW1wdE5leHQoKTtcbiAgICB9XG5cbiAgICBhdHRlbXB0TmV4dCgpO1xuICB9XG5cbiAgcmV0dXJuIGNvbm5lY3Q7XG59O1xuIiwiZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gZHVwbGV4O1xuXG5leHBvcnRzLnNvdXJjZSA9IHJlcXVpcmUoJy4vc291cmNlJyk7XG5leHBvcnRzLnNpbmsgPSByZXF1aXJlKCcuL3NpbmsnKTtcblxuZnVuY3Rpb24gZHVwbGV4ICh3cywgb3B0cykge1xuICByZXR1cm4ge1xuICAgIHNvdXJjZTogZXhwb3J0cy5zb3VyY2Uod3MpLFxuICAgIHNpbms6IGV4cG9ydHMuc2luayh3cywgb3B0cylcbiAgfTtcbn07XG4iLCJleHBvcnRzLmlkID0gXG5mdW5jdGlvbiAoaXRlbSkge1xuICByZXR1cm4gaXRlbVxufVxuXG5leHBvcnRzLnByb3AgPSBcbmZ1bmN0aW9uIChtYXApIHsgIFxuICBpZignc3RyaW5nJyA9PSB0eXBlb2YgbWFwKSB7XG4gICAgdmFyIGtleSA9IG1hcFxuICAgIHJldHVybiBmdW5jdGlvbiAoZGF0YSkgeyByZXR1cm4gZGF0YVtrZXldIH1cbiAgfVxuICByZXR1cm4gbWFwXG59XG5cbmV4cG9ydHMudGVzdGVyID0gZnVuY3Rpb24gKHRlc3QpIHtcbiAgaWYoIXRlc3QpIHJldHVybiBleHBvcnRzLmlkXG4gIGlmKCdvYmplY3QnID09PSB0eXBlb2YgdGVzdFxuICAgICYmICdmdW5jdGlvbicgPT09IHR5cGVvZiB0ZXN0LnRlc3QpXG4gICAgICByZXR1cm4gdGVzdC50ZXN0LmJpbmQodGVzdClcbiAgcmV0dXJuIGV4cG9ydHMucHJvcCh0ZXN0KSB8fCBleHBvcnRzLmlkXG59XG5cbmV4cG9ydHMuYWRkUGlwZSA9IGFkZFBpcGVcblxuZnVuY3Rpb24gYWRkUGlwZShyZWFkKSB7XG4gIGlmKCdmdW5jdGlvbicgIT09IHR5cGVvZiByZWFkKVxuICAgIHJldHVybiByZWFkXG5cbiAgcmVhZC5waXBlID0gcmVhZC5waXBlIHx8IGZ1bmN0aW9uIChyZWFkZXIpIHtcbiAgICBpZignZnVuY3Rpb24nICE9IHR5cGVvZiByZWFkZXIgJiYgJ2Z1bmN0aW9uJyAhPSB0eXBlb2YgcmVhZGVyLnNpbmspXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ211c3QgcGlwZSB0byByZWFkZXInKVxuICAgIHZhciBwaXBlID0gYWRkUGlwZShyZWFkZXIuc2luayA/IHJlYWRlci5zaW5rKHJlYWQpIDogcmVhZGVyKHJlYWQpKVxuICAgIHJldHVybiByZWFkZXIuc291cmNlIHx8IHBpcGU7XG4gIH1cbiAgXG4gIHJlYWQudHlwZSA9ICdTb3VyY2UnXG4gIHJldHVybiByZWFkXG59XG5cbnZhciBTb3VyY2UgPVxuZXhwb3J0cy5Tb3VyY2UgPVxuZnVuY3Rpb24gU291cmNlIChjcmVhdGVSZWFkKSB7XG4gIGZ1bmN0aW9uIHMoKSB7XG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICByZXR1cm4gYWRkUGlwZShjcmVhdGVSZWFkLmFwcGx5KG51bGwsIGFyZ3MpKVxuICB9XG4gIHMudHlwZSA9ICdTb3VyY2UnXG4gIHJldHVybiBzXG59XG5cblxudmFyIFRocm91Z2ggPVxuZXhwb3J0cy5UaHJvdWdoID0gXG5mdW5jdGlvbiAoY3JlYXRlUmVhZCkge1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgdmFyIHBpcGVkID0gW11cbiAgICBmdW5jdGlvbiByZWFkZXIgKHJlYWQpIHtcbiAgICAgIGFyZ3MudW5zaGlmdChyZWFkKVxuICAgICAgcmVhZCA9IGNyZWF0ZVJlYWQuYXBwbHkobnVsbCwgYXJncylcbiAgICAgIHdoaWxlKHBpcGVkLmxlbmd0aClcbiAgICAgICAgcmVhZCA9IHBpcGVkLnNoaWZ0KCkocmVhZClcbiAgICAgIHJldHVybiByZWFkXG4gICAgICAvL3BpcGVpbmcgdG8gZnJvbSB0aGlzIHJlYWRlciBzaG91bGQgY29tcG9zZS4uLlxuICAgIH1cbiAgICByZWFkZXIucGlwZSA9IGZ1bmN0aW9uIChyZWFkKSB7XG4gICAgICBwaXBlZC5wdXNoKHJlYWQpIFxuICAgICAgaWYocmVhZC50eXBlID09PSAnU291cmNlJylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgcGlwZSAnICsgcmVhZGVyLnR5cGUgKyAnIHRvIFNvdXJjZScpXG4gICAgICByZWFkZXIudHlwZSA9IHJlYWQudHlwZSA9PT0gJ1NpbmsnID8gJ1NpbmsnIDogJ1Rocm91Z2gnXG4gICAgICByZXR1cm4gcmVhZGVyXG4gICAgfVxuICAgIHJlYWRlci50eXBlID0gJ1Rocm91Z2gnXG4gICAgcmV0dXJuIHJlYWRlclxuICB9XG59XG5cbnZhciBTaW5rID1cbmV4cG9ydHMuU2luayA9IFxuZnVuY3Rpb24gU2luayhjcmVhdGVSZWFkZXIpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgIGlmKCFjcmVhdGVSZWFkZXIpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ211c3QgYmUgY3JlYXRlUmVhZGVyIGZ1bmN0aW9uJylcbiAgICBmdW5jdGlvbiBzIChyZWFkKSB7XG4gICAgICBhcmdzLnVuc2hpZnQocmVhZClcbiAgICAgIHJldHVybiBjcmVhdGVSZWFkZXIuYXBwbHkobnVsbCwgYXJncylcbiAgICB9XG4gICAgcy50eXBlID0gJ1NpbmsnXG4gICAgcmV0dXJuIHNcbiAgfVxufVxuXG5cbmV4cG9ydHMubWF5YmVTaW5rID0gXG5leHBvcnRzLm1heWJlRHJhaW4gPSBcbmZ1bmN0aW9uIChjcmVhdGVTaW5rLCBjYikge1xuICBpZighY2IpXG4gICAgcmV0dXJuIFRocm91Z2goZnVuY3Rpb24gKHJlYWQpIHtcbiAgICAgIHZhciBlbmRlZFxuICAgICAgcmV0dXJuIGZ1bmN0aW9uIChjbG9zZSwgY2IpIHtcbiAgICAgICAgaWYoY2xvc2UpIHJldHVybiByZWFkKGNsb3NlLCBjYilcbiAgICAgICAgaWYoZW5kZWQpIHJldHVybiBjYihlbmRlZClcblxuICAgICAgICBjcmVhdGVTaW5rKGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcbiAgICAgICAgICBlbmRlZCA9IGVyciB8fCB0cnVlXG4gICAgICAgICAgaWYoIWVycikgY2IobnVsbCwgZGF0YSlcbiAgICAgICAgICBlbHNlICAgICBjYihlbmRlZClcbiAgICAgICAgfSkgKHJlYWQpXG4gICAgICB9XG4gICAgfSkoKVxuXG4gIHJldHVybiBTaW5rKGZ1bmN0aW9uIChyZWFkKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVNpbmsoY2IpIChyZWFkKVxuICB9KSgpXG59XG5cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc29ja2V0LCBjYWxsYmFjaykge1xuICB2YXIgcmVtb3ZlID0gc29ja2V0ICYmIChzb2NrZXQucmVtb3ZlRXZlbnRMaXN0ZW5lciB8fCBzb2NrZXQucmVtb3ZlTGlzdGVuZXIpO1xuXG4gIGZ1bmN0aW9uIGNsZWFudXAgKCkge1xuICAgIGlmICh0eXBlb2YgcmVtb3ZlID09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJlbW92ZS5jYWxsKHNvY2tldCwgJ29wZW4nLCBoYW5kbGVPcGVuKTtcbiAgICAgIHJlbW92ZS5jYWxsKHNvY2tldCwgJ2Vycm9yJywgaGFuZGxlRXJyKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVPcGVuKGV2dCkge1xuICAgIGNsZWFudXAoKTsgY2FsbGJhY2soKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZUVyciAoZXZ0KSB7XG4gICAgY2xlYW51cCgpOyBjYWxsYmFjayhldnQpO1xuICB9XG5cbiAgLy8gaWYgdGhlIHNvY2tldCBpcyBjbG9zaW5nIG9yIGNsb3NlZCwgcmV0dXJuIGVuZFxuICBpZiAoc29ja2V0LnJlYWR5U3RhdGUgPj0gMikge1xuICAgIHJldHVybiBjYWxsYmFjayh0cnVlKTtcbiAgfVxuXG4gIC8vIGlmIG9wZW4sIHRyaWdnZXIgdGhlIGNhbGxiYWNrXG4gIGlmIChzb2NrZXQucmVhZHlTdGF0ZSA9PT0gMSkge1xuICAgIHJldHVybiBjYWxsYmFjaygpO1xuICB9XG5cbiAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ29wZW4nLCBoYW5kbGVPcGVuKTtcbiAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgaGFuZGxlRXJyKTtcbn07XG4iLCJ2YXIgcHVsbCA9IHJlcXVpcmUoJ3B1bGwtY29yZScpO1xudmFyIHJlYWR5ID0gcmVxdWlyZSgnLi9yZWFkeScpO1xuXG4vKipcbiAgIyMjIGBzaW5rKHNvY2tldCwgb3B0cz8pYFxuXG4gIENyZWF0ZSBhIHB1bGwtc3RyZWFtIGBTaW5rYCB0aGF0IHdpbGwgd3JpdGUgZGF0YSB0byB0aGUgYHNvY2tldGAuXG5cbiAgPDw8IGV4YW1wbGVzL3dyaXRlLmpzXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBwdWxsLlNpbmsoZnVuY3Rpb24ocmVhZCwgc29ja2V0LCBvcHRzKSB7XG4gIG9wdHMgPSBvcHRzIHx8IHt9XG4gIHZhciBjbG9zZU9uRW5kID0gb3B0cy5jbG9zZU9uRW5kICE9PSBmYWxzZTtcbiAgdmFyIG9uQ2xvc2UgPSAnZnVuY3Rpb24nID09PSB0eXBlb2Ygb3B0cyA/IG9wdHMgOiBvcHRzLm9uQ2xvc2U7XG5cbiAgZnVuY3Rpb24gbmV4dChlbmQsIGRhdGEpIHtcbiAgICAvLyBpZiB0aGUgc3RyZWFtIGhhcyBlbmRlZCwgc2ltcGx5IHJldHVyblxuICAgIGlmIChlbmQpIHtcbiAgICAgIGlmIChjbG9zZU9uRW5kICYmIHNvY2tldC5yZWFkeVN0YXRlIDw9IDEpIHtcbiAgICAgICAgaWYob25DbG9zZSlcbiAgICAgICAgICBzb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIGlmKGV2Lndhc0NsZWFuKSBvbkNsb3NlKClcbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICB2YXIgZXJyID0gbmV3IEVycm9yKCd3cyBlcnJvcicpXG4gICAgICAgICAgICAgIGVyci5ldmVudCA9IGV2XG4gICAgICAgICAgICAgIG9uQ2xvc2UoZXJyKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgIHNvY2tldC5jbG9zZSgpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gc29ja2V0IHJlYWR5P1xuICAgIHJlYWR5KHNvY2tldCwgZnVuY3Rpb24oZW5kKSB7XG4gICAgICBpZiAoZW5kKSB7XG4gICAgICAgIHJldHVybiByZWFkKGVuZCwgZnVuY3Rpb24gKCkge30pO1xuICAgICAgfVxuXG4gICAgICBzb2NrZXQuc2VuZChkYXRhKTtcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlYWQobnVsbCwgbmV4dCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHJlYWQobnVsbCwgbmV4dCk7XG59KTtcbiIsInZhciBwdWxsID0gcmVxdWlyZSgncHVsbC1jb3JlJyk7XG52YXIgcmVhZHkgPSByZXF1aXJlKCcuL3JlYWR5Jyk7XG5cbi8qKlxuICAjIyMgYHNvdXJjZShzb2NrZXQpYFxuXG4gIENyZWF0ZSBhIHB1bGwtc3RyZWFtIGBTb3VyY2VgIHRoYXQgd2lsbCByZWFkIGRhdGEgZnJvbSB0aGUgYHNvY2tldGAuXG5cbiAgPDw8IGV4YW1wbGVzL3JlYWQuanNcblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IHB1bGwuU291cmNlKGZ1bmN0aW9uKHNvY2tldCkge1xuICB2YXIgYnVmZmVyID0gW107XG4gIHZhciByZWNlaXZlcjtcbiAgdmFyIGVuZGVkO1xuXG4gIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAgaWYgKHJlY2VpdmVyKSB7XG4gICAgICByZXR1cm4gcmVjZWl2ZXIobnVsbCwgZXZ0LmRhdGEpO1xuICAgIH1cblxuICAgIGJ1ZmZlci5wdXNoKGV2dC5kYXRhKTtcbiAgfSk7XG5cbiAgc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAgaWYgKGVuZGVkKSByZXR1cm47XG4gICAgaWYgKHJlY2VpdmVyKSB7XG4gICAgICByZXR1cm4gcmVjZWl2ZXIoZW5kZWQgPSB0cnVlKTtcbiAgICB9XG4gIH0pO1xuXG4gIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGZ1bmN0aW9uIChldnQpIHtcbiAgICBpZiAoZW5kZWQpIHJldHVybjtcbiAgICBlbmRlZCA9IGV2dDtcbiAgICBpZiAocmVjZWl2ZXIpIHtcbiAgICAgIHJlY2VpdmVyKGVuZGVkKTtcbiAgICB9XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIHJlYWQoYWJvcnQsIGNiKSB7XG4gICAgcmVjZWl2ZXIgPSBudWxsO1xuXG4gICAgLy9pZiBzdHJlYW0gaGFzIGFscmVhZHkgZW5kZWQuXG4gICAgaWYgKGVuZGVkKVxuICAgICAgcmV0dXJuIGNiKGVuZGVkKVxuXG4gICAgLy8gaWYgZW5kZWQsIGFib3J0XG4gICAgaWYgKGFib3J0KSB7XG4gICAgICAvL3RoaXMgd2lsbCBjYWxsYmFjayB3aGVuIHNvY2tldCBjbG9zZXNcbiAgICAgIHJlY2VpdmVyID0gY2JcbiAgICAgIHJldHVybiBzb2NrZXQuY2xvc2UoKVxuICAgIH1cblxuICAgIHJlYWR5KHNvY2tldCwgZnVuY3Rpb24oZW5kKSB7XG4gICAgICBpZiAoZW5kKSB7XG4gICAgICAgIHJldHVybiBjYihlbmRlZCA9IGVuZCk7XG4gICAgICB9XG5cbiAgICAgIC8vIHJlYWQgZnJvbSB0aGUgc29ja2V0XG4gICAgICBpZiAoZW5kZWQgJiYgZW5kZWQgIT09IHRydWUpIHtcbiAgICAgICAgcmV0dXJuIGNiKGVuZGVkKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGJ1ZmZlci5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiBjYihudWxsLCBidWZmZXIuc2hpZnQoKSk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChlbmRlZCkge1xuICAgICAgICByZXR1cm4gY2IodHJ1ZSk7XG4gICAgICB9XG5cbiAgICAgIHJlY2VpdmVyID0gY2I7XG4gICAgfSk7XG4gIH07XG5cbiAgcmV0dXJuIHJlYWQ7XG59KTtcbiIsIlxuLyoqXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBnbG9iYWwgPSAoZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9KSgpO1xuXG4vKipcbiAqIFdlYlNvY2tldCBjb25zdHJ1Y3Rvci5cbiAqL1xuXG52YXIgV2ViU29ja2V0ID0gZ2xvYmFsLldlYlNvY2tldCB8fCBnbG9iYWwuTW96V2ViU29ja2V0O1xuXG4vKipcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gV2ViU29ja2V0ID8gd3MgOiBudWxsO1xuXG4vKipcbiAqIFdlYlNvY2tldCBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBUaGUgdGhpcmQgYG9wdHNgIG9wdGlvbnMgb2JqZWN0IGdldHMgaWdub3JlZCBpbiB3ZWIgYnJvd3NlcnMsIHNpbmNlIGl0J3NcbiAqIG5vbi1zdGFuZGFyZCwgYW5kIHRocm93cyBhIFR5cGVFcnJvciBpZiBwYXNzZWQgdG8gdGhlIGNvbnN0cnVjdG9yLlxuICogU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZWluYXJvcy93cy9pc3N1ZXMvMjI3XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVyaVxuICogQHBhcmFtIHtBcnJheX0gcHJvdG9jb2xzIChvcHRpb25hbClcbiAqIEBwYXJhbSB7T2JqZWN0KSBvcHRzIChvcHRpb25hbClcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gd3ModXJpLCBwcm90b2NvbHMsIG9wdHMpIHtcbiAgdmFyIGluc3RhbmNlO1xuICBpZiAocHJvdG9jb2xzKSB7XG4gICAgaW5zdGFuY2UgPSBuZXcgV2ViU29ja2V0KHVyaSwgcHJvdG9jb2xzKTtcbiAgfSBlbHNlIHtcbiAgICBpbnN0YW5jZSA9IG5ldyBXZWJTb2NrZXQodXJpKTtcbiAgfVxuICByZXR1cm4gaW5zdGFuY2U7XG59XG5cbmlmIChXZWJTb2NrZXQpIHdzLnByb3RvdHlwZSA9IFdlYlNvY2tldC5wcm90b3R5cGU7XG4iLCJ2YXIgcmVIdHRwVXJsID0gL15odHRwKC4qKSQvO1xuXG4vKipcbiAgIyB3c3VybFxuXG4gIEdpdmVuIGEgdXJsIChpbmNsdWRpbmcgcHJvdG9jb2wgcmVsYXRpdmUgdXJscyAtIGkuZS4gYC8vYCksIGdlbmVyYXRlIGFuIGFwcHJvcHJpYXRlXG4gIHVybCBmb3IgYSBXZWJTb2NrZXQgZW5kcG9pbnQgKGB3c2Agb3IgYHdzc2ApLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICA8PDwgZXhhbXBsZXMvcmVsYXRpdmUuanNcblxuKiovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odXJsLCBvcHRzKSB7XG4gIHZhciBjdXJyZW50ID0gKG9wdHMgfHwge30pLmN1cnJlbnQgfHwgKHR5cGVvZiBsb2NhdGlvbiAhPSAndW5kZWZpbmVkJyAmJiBsb2NhdGlvbi5ocmVmKTtcbiAgdmFyIGN1cnJlbnRQcm90b2NvbCA9IGN1cnJlbnQgJiYgY3VycmVudC5zbGljZSgwLCBjdXJyZW50LmluZGV4T2YoJzonKSk7XG4gIHZhciBpbnNlY3VyZSA9IChvcHRzIHx8IHt9KS5pbnNlY3VyZTtcbiAgdmFyIGlzUmVsYXRpdmUgPSB1cmwuc2xpY2UoMCwgMikgPT0gJy8vJztcbiAgdmFyIGZvcmNlV1MgPSAoISBjdXJyZW50UHJvdG9jb2wpIHx8IGN1cnJlbnRQcm90b2NvbCA9PT0gJ2ZpbGU6JztcblxuICBpZiAoaXNSZWxhdGl2ZSkge1xuICAgIHJldHVybiBmb3JjZVdTID9cbiAgICAgICgoaW5zZWN1cmUgPyAnd3M6JyA6ICd3c3M6JykgKyB1cmwpIDpcbiAgICAgIChjdXJyZW50UHJvdG9jb2wucmVwbGFjZShyZUh0dHBVcmwsICd3cyQxJykgKyAnOicgKyB1cmwpO1xuICB9XG5cbiAgcmV0dXJuIHVybC5yZXBsYWNlKHJlSHR0cFVybCwgJ3dzJDEnKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgLy8gbWVzc2VuZ2VyIGV2ZW50c1xuICBkYXRhRXZlbnQ6ICdkYXRhJyxcbiAgb3BlbkV2ZW50OiAnb3BlbicsXG4gIGNsb3NlRXZlbnQ6ICdjbG9zZScsXG4gIGVycm9yRXZlbnQ6ICdlcnJvcicsXG5cbiAgLy8gbWVzc2VuZ2VyIGZ1bmN0aW9uc1xuICB3cml0ZU1ldGhvZDogJ3dyaXRlJyxcbiAgY2xvc2VNZXRob2Q6ICdjbG9zZScsXG5cbiAgLy8gbGVhdmUgdGltZW91dCAobXMpXG4gIGxlYXZlVGltZW91dDogMzAwMFxufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG5cbi8qKlxuICAjIyMjIGFubm91bmNlXG5cbiAgYGBgXG4gIC9hbm5vdW5jZXwlbWV0YWRhdGElfHtcImlkXCI6IFwiLi4uXCIsIC4uLiB9XG4gIGBgYFxuXG4gIFdoZW4gYW4gYW5ub3VuY2UgbWVzc2FnZSBpcyByZWNlaXZlZCBieSB0aGUgc2lnbmFsbGVyLCB0aGUgYXR0YWNoZWRcbiAgb2JqZWN0IGRhdGEgaXMgZGVjb2RlZCBhbmQgdGhlIHNpZ25hbGxlciBlbWl0cyBhbiBgYW5ub3VuY2VgIG1lc3NhZ2UuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzaWduYWxsZXIpIHtcblxuICBmdW5jdGlvbiBkYXRhQWxsb3dlZChkYXRhKSB7XG4gICAgdmFyIGNsb25lZCA9IGV4dGVuZCh7IGFsbG93OiB0cnVlIH0sIGRhdGEpO1xuICAgIHNpZ25hbGxlcigncGVlcjpmaWx0ZXInLCBkYXRhLmlkLCBjbG9uZWQpO1xuXG4gICAgcmV0dXJuIGNsb25lZC5hbGxvdztcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihhcmdzLCBtZXNzYWdlVHlwZSwgc3JjRGF0YSwgc3JjU3RhdGUsIGlzRE0pIHtcbiAgICB2YXIgZGF0YSA9IGFyZ3NbMF07XG4gICAgdmFyIHBlZXI7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIHZhbGlkIGRhdGEgdGhlbiBwcm9jZXNzXG4gICAgaWYgKGRhdGEgJiYgZGF0YS5pZCAmJiBkYXRhLmlkICE9PSBzaWduYWxsZXIuaWQpIHtcbiAgICAgIGlmICghIGRhdGFBbGxvd2VkKGRhdGEpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIC8vIGNoZWNrIHRvIHNlZSBpZiB0aGlzIGlzIGEga25vd24gcGVlclxuICAgICAgcGVlciA9IHNpZ25hbGxlci5wZWVycy5nZXQoZGF0YS5pZCk7XG5cbiAgICAgIC8vIHRyaWdnZXIgdGhlIHBlZXIgY29ubmVjdGVkIGV2ZW50IHRvIGZsYWcgdGhhdCB3ZSBrbm93IGFib3V0IGFcbiAgICAgIC8vIHBlZXIgY29ubmVjdGlvbi4gVGhlIHBlZXIgaGFzIHBhc3NlZCB0aGUgXCJmaWx0ZXJcIiBjaGVjayBidXQgbWF5XG4gICAgICAvLyBiZSBhbm5vdW5jZWQgLyB1cGRhdGVkIGRlcGVuZGluZyBvbiBwcmV2aW91cyBjb25uZWN0aW9uIHN0YXR1c1xuICAgICAgc2lnbmFsbGVyKCdwZWVyOmNvbm5lY3RlZCcsIGRhdGEuaWQsIGRhdGEpO1xuXG4gICAgICAvLyBpZiB0aGUgcGVlciBpcyBleGlzdGluZywgdGhlbiB1cGRhdGUgdGhlIGRhdGFcbiAgICAgIGlmIChwZWVyICYmICghIHBlZXIuaW5hY3RpdmUpKSB7XG4gICAgICAgIC8vIHVwZGF0ZSB0aGUgZGF0YVxuICAgICAgICBleHRlbmQocGVlci5kYXRhLCBkYXRhKTtcblxuICAgICAgICAvLyB0cmlnZ2VyIHRoZSBwZWVyIHVwZGF0ZSBldmVudFxuICAgICAgICByZXR1cm4gc2lnbmFsbGVyKCdwZWVyOnVwZGF0ZScsIGRhdGEsIHNyY0RhdGEpO1xuICAgICAgfVxuXG4gICAgICAvLyBjcmVhdGUgYSBuZXcgcGVlclxuICAgICAgcGVlciA9IHtcbiAgICAgICAgaWQ6IGRhdGEuaWQsXG5cbiAgICAgICAgLy8gaW5pdGlhbGlzZSB0aGUgbG9jYWwgcm9sZSBpbmRleFxuICAgICAgICByb2xlSWR4OiBbZGF0YS5pZCwgc2lnbmFsbGVyLmlkXS5zb3J0KCkuaW5kZXhPZihkYXRhLmlkKSxcblxuICAgICAgICAvLyBpbml0aWFsaXNlIHRoZSBwZWVyIGRhdGFcbiAgICAgICAgZGF0YToge31cbiAgICAgIH07XG5cbiAgICAgIC8vIGluaXRpYWxpc2UgdGhlIHBlZXIgZGF0YVxuICAgICAgZXh0ZW5kKHBlZXIuZGF0YSwgZGF0YSk7XG5cbiAgICAgIC8vIHJlc2V0IGluYWN0aXZpdHkgc3RhdGVcbiAgICAgIGNsZWFyVGltZW91dChwZWVyLmxlYXZlVGltZXIpO1xuICAgICAgcGVlci5pbmFjdGl2ZSA9IGZhbHNlO1xuXG4gICAgICAvLyBzZXQgdGhlIHBlZXIgZGF0YVxuICAgICAgc2lnbmFsbGVyLnBlZXJzLnNldChkYXRhLmlkLCBwZWVyKTtcblxuICAgICAgLy8gaWYgdGhpcyBpcyBhbiBpbml0aWFsIGFubm91bmNlIG1lc3NhZ2UgKG5vIHZlY3RvciBjbG9jayBhdHRhY2hlZClcbiAgICAgIC8vIHRoZW4gc2VuZCBhIGFubm91bmNlIHJlcGx5XG4gICAgICBpZiAoc2lnbmFsbGVyLmF1dG9yZXBseSAmJiAoISBpc0RNKSkge1xuICAgICAgICBzaWduYWxsZXJcbiAgICAgICAgICAudG8oZGF0YS5pZClcbiAgICAgICAgICAuc2VuZCgnL2Fubm91bmNlJywgc2lnbmFsbGVyLmF0dHJpYnV0ZXMpO1xuICAgICAgfVxuXG4gICAgICAvLyBlbWl0IGEgbmV3IHBlZXIgYW5ub3VuY2UgZXZlbnRcbiAgICAgIHJldHVybiBzaWduYWxsZXIoJ3BlZXI6YW5ub3VuY2UnLCBkYXRhLCBwZWVyKTtcbiAgICB9XG4gIH07XG59O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMjIyBzaWduYWxsZXIgbWVzc2FnZSBoYW5kbGVyc1xuXG4qKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzaWduYWxsZXIsIG9wdHMpIHtcbiAgcmV0dXJuIHtcbiAgICBhbm5vdW5jZTogcmVxdWlyZSgnLi9hbm5vdW5jZScpKHNpZ25hbGxlciwgb3B0cylcbiAgfTtcbn07XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGV0ZWN0ID0gcmVxdWlyZSgncnRjLWNvcmUvZGV0ZWN0Jyk7XG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCdjb2cvZGVmYXVsdHMnKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG52YXIgbWJ1cyA9IHJlcXVpcmUoJ21idXMnKTtcbnZhciBnZXRhYmxlID0gcmVxdWlyZSgnY29nL2dldGFibGUnKTtcbnZhciB1dWlkID0gcmVxdWlyZSgnY3VpZCcpO1xudmFyIHB1bGwgPSByZXF1aXJlKCdwdWxsLXN0cmVhbScpO1xudmFyIHB1c2hhYmxlID0gcmVxdWlyZSgncHVsbC1wdXNoYWJsZScpO1xuXG4vLyByZWFkeSBzdGF0ZSBjb25zdGFudHNcbnZhciBSU19ESVNDT05ORUNURUQgPSAwO1xudmFyIFJTX0NPTk5FQ1RJTkcgPSAxO1xudmFyIFJTX0NPTk5FQ1RFRCA9IDI7XG5cbi8vIGluaXRpYWxpc2Ugc2lnbmFsbGVyIG1ldGFkYXRhIHNvIHdlIGRvbid0IGhhdmUgdG8gaW5jbHVkZSB0aGUgcGFja2FnZS5qc29uXG4vLyBUT0RPOiBtYWtlIHRoaXMgY2hlY2thYmxlIHdpdGggc29tZSBraW5kIG9mIHByZXB1Ymxpc2ggc2NyaXB0XG52YXIgbWV0YWRhdGEgPSB7XG4gIHZlcnNpb246ICc1LjIuNCdcbn07XG5cbi8qKlxuICAjIHJ0Yy1zaWduYWxsZXJcblxuICBUaGUgYHJ0Yy1zaWduYWxsZXJgIG1vZHVsZSBwcm92aWRlcyBhIHRyYW5zcG9ydGxlc3Mgc2lnbmFsbGluZ1xuICBtZWNoYW5pc20gZm9yIFdlYlJUQy5cblxuICAjIyBQdXJwb3NlXG5cbiAgPDw8IGRvY3MvcHVycG9zZS5tZFxuXG4gICMjIEdldHRpbmcgU3RhcnRlZFxuXG4gIFdoaWxlIHRoZSBzaWduYWxsZXIgaXMgY2FwYWJsZSBvZiBjb21tdW5pY2F0aW5nIGJ5IGEgbnVtYmVyIG9mIGRpZmZlcmVudFxuICBtZXNzZW5nZXJzIChpLmUuIGFueXRoaW5nIHRoYXQgY2FuIHNlbmQgYW5kIHJlY2VpdmUgbWVzc2FnZXMgb3ZlciBhIHdpcmUpXG4gIGl0IGNvbWVzIHdpdGggc3VwcG9ydCBmb3IgdW5kZXJzdGFuZGluZyBob3cgdG8gY29ubmVjdCB0byBhblxuICBbcnRjLXN3aXRjaGJvYXJkXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1zd2l0Y2hib2FyZCkgb3V0IG9mIHRoZSBib3guXG5cbiAgVGhlIGZvbGxvd2luZyBjb2RlIHNhbXBsZSBkZW1vbnN0cmF0ZXMgaG93OlxuXG4gIDw8PCBleGFtcGxlcy9nZXR0aW5nLXN0YXJ0ZWQuanNcblxuICA8PDwgZG9jcy9ldmVudHMubWRcblxuICA8PDwgZG9jcy9zaWduYWxmbG93LWRpYWdyYW1zLm1kXG5cbiAgIyMgUmVmZXJlbmNlXG5cbiAgVGhlIGBydGMtc2lnbmFsbGVyYCBtb2R1bGUgaXMgZGVzaWduZWQgdG8gYmUgdXNlZCBwcmltYXJpbHkgaW4gYSBmdW5jdGlvbmFsXG4gIHdheSBhbmQgd2hlbiBjYWxsZWQgaXQgY3JlYXRlcyBhIG5ldyBzaWduYWxsZXIgdGhhdCB3aWxsIGVuYWJsZVxuICB5b3UgdG8gY29tbXVuaWNhdGUgd2l0aCBvdGhlciBwZWVycyB2aWEgeW91ciBtZXNzYWdpbmcgbmV0d29yay5cblxuICBgYGBqc1xuICAvLyBjcmVhdGUgYSBzaWduYWxsZXIgZnJvbSBzb21ldGhpbmcgdGhhdCBrbm93cyBob3cgdG8gc2VuZCBtZXNzYWdlc1xuICB2YXIgc2lnbmFsbGVyID0gcmVxdWlyZSgncnRjLXNpZ25hbGxlcicpKG1lc3Nlbmdlcik7XG4gIGBgYFxuXG4gIEFzIGRlbW9uc3RyYXRlZCBpbiB0aGUgZ2V0dGluZyBzdGFydGVkIGd1aWRlLCB5b3UgY2FuIGFsc28gcGFzcyB0aHJvdWdoXG4gIGEgc3RyaW5nIHZhbHVlIGluc3RlYWQgb2YgYSBtZXNzZW5nZXIgaW5zdGFuY2UgaWYgeW91IHNpbXBseSB3YW50IHRvXG4gIGNvbm5lY3QgdG8gYW4gZXhpc3RpbmcgYHJ0Yy1zd2l0Y2hib2FyZGAgaW5zdGFuY2UuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihtZXNzZW5nZXIsIG9wdHMpIHtcbiAgLy8gZ2V0IHRoZSBhdXRvcmVwbHkgc2V0dGluZ1xuICB2YXIgYXV0b3JlcGx5ID0gKG9wdHMgfHwge30pLmF1dG9yZXBseTtcbiAgdmFyIGF1dG9jb25uZWN0ID0gKG9wdHMgfHwge30pLmF1dG9jb25uZWN0O1xuICB2YXIgcmVjb25uZWN0ID0gKG9wdHMgfHwge30pLnJlY29ubmVjdDtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBtZXRhZGF0YVxuICB2YXIgbG9jYWxNZXRhID0ge307XG5cbiAgLy8gY3JlYXRlIHRoZSBzaWduYWxsZXJcbiAgdmFyIHNpZ25hbGxlciA9IG1idXMoJycsIChvcHRzIHx8IHt9KS5sb2dnZXIpO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIGlkXG4gIHZhciBpZCA9IHNpZ25hbGxlci5pZCA9IChvcHRzIHx8IHt9KS5pZCB8fCB1dWlkKCk7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgYXR0cmlidXRlc1xuICB2YXIgYXR0cmlidXRlcyA9IHNpZ25hbGxlci5hdHRyaWJ1dGVzID0ge1xuICAgIGJyb3dzZXI6IGRldGVjdC5icm93c2VyLFxuICAgIGJyb3dzZXJWZXJzaW9uOiBkZXRlY3QuYnJvd3NlclZlcnNpb24sXG4gICAgaWQ6IGlkLFxuICAgIGFnZW50OiAnc2lnbmFsbGVyQCcgKyBtZXRhZGF0YS52ZXJzaW9uXG4gIH07XG5cbiAgLy8gY3JlYXRlIHRoZSBwZWVycyBtYXBcbiAgdmFyIHBlZXJzID0gc2lnbmFsbGVyLnBlZXJzID0gZ2V0YWJsZSh7fSk7XG5cbiAgLy8gY3JlYXRlIHRoZSBvdXRib3VuZCBtZXNzYWdlIHF1ZXVlXG4gIHZhciBxdWV1ZSA9IHJlcXVpcmUoJ3B1bGwtcHVzaGFibGUnKSgpO1xuXG4gIHZhciBwcm9jZXNzb3I7XG4gIHZhciBhbm5vdW5jZVRpbWVyID0gMDtcbiAgdmFyIHJlYWR5U3RhdGUgPSBSU19ESVNDT05ORUNURUQ7XG5cbiAgZnVuY3Rpb24gYW5ub3VuY2VPblJlY29ubmVjdCgpIHtcbiAgICBzaWduYWxsZXIuYW5ub3VuY2UoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJ1ZmZlck1lc3NhZ2UoYXJncykge1xuICAgIHF1ZXVlLnB1c2goY3JlYXRlRGF0YUxpbmUoYXJncykpO1xuXG4gICAgLy8gaWYgd2UgYXJlIG5vdCBjb25uZWN0ZWQgKGFuZCBzaG91bGQgYXV0b2Nvbm5lY3QpLCB0aGVuIGF0dGVtcHQgY29ubmVjdGlvblxuICAgIGlmIChyZWFkeVN0YXRlID09PSBSU19ESVNDT05ORUNURUQgJiYgKGF1dG9jb25uZWN0ID09PSB1bmRlZmluZWQgfHwgYXV0b2Nvbm5lY3QpKSB7XG4gICAgICBjb25uZWN0KCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlRGF0YUxpbmUoYXJncykge1xuICAgIHJldHVybiBhcmdzLm1hcChwcmVwYXJlQXJnKS5qb2luKCd8Jyk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVNZXRhZGF0YSgpIHtcbiAgICByZXR1cm4gZXh0ZW5kKHt9LCBsb2NhbE1ldGEsIHsgaWQ6IHNpZ25hbGxlci5pZCB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZURpc2Nvbm5lY3QoKSB7XG4gICAgaWYgKHJlY29ubmVjdCA9PT0gdW5kZWZpbmVkIHx8IHJlY29ubmVjdCkge1xuICAgICAgc2V0VGltZW91dChjb25uZWN0LCA1MCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcHJlcGFyZUFyZyhhcmcpIHtcbiAgICBpZiAodHlwZW9mIGFyZyA9PSAnb2JqZWN0JyAmJiAoISAoYXJnIGluc3RhbmNlb2YgU3RyaW5nKSkpIHtcbiAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmcpO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgYXJnID09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBhcmc7XG4gIH1cblxuICAvKipcbiAgICAjIyMgYHNpZ25hbGxlci5jb25uZWN0KClgXG5cbiAgICBNYW51YWxseSBjb25uZWN0IHRoZSBzaWduYWxsZXIgdXNpbmcgdGhlIHN1cHBsaWVkIG1lc3Nlbmdlci5cblxuICAgIF9fTk9URTpfXyBUaGlzIHNob3VsZCBuZXZlciBoYXZlIHRvIGJlIGNhbGxlZCBpZiB0aGUgZGVmYXVsdCBzZXR0aW5nXG4gICAgZm9yIGBhdXRvY29ubmVjdGAgaXMgdXNlZC5cbiAgKiovXG4gIHZhciBjb25uZWN0ID0gc2lnbmFsbGVyLmNvbm5lY3QgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBpZiB3ZSBhcmUgYWxyZWFkeSBjb25uZWN0aW5nIHRoZW4gZG8gbm90aGluZ1xuICAgIGlmIChyZWFkeVN0YXRlID09PSBSU19DT05ORUNUSU5HKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gaW5pdGlhdGUgdGhlIG1lc3NlbmdlclxuICAgIHJlYWR5U3RhdGUgPSBSU19DT05ORUNUSU5HO1xuICAgIG1lc3NlbmdlcihmdW5jdGlvbihlcnIsIHNvdXJjZSwgc2luaykge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZWFkeVN0YXRlID0gUlNfRElTQ09OTkVDVEVEO1xuICAgICAgICByZXR1cm4gc2lnbmFsbGVyKCdlcnJvcicsIGVycik7XG4gICAgICB9XG5cbiAgICAgIC8vIGZsYWcgYXMgY29ubmVjdGVkXG4gICAgICByZWFkeVN0YXRlID0gUlNfQ09OTkVDVEVEO1xuXG4gICAgICAvLyBwYXNzIG1lc3NhZ2VzIHRvIHRoZSBwcm9jZXNzb3JcbiAgICAgIHB1bGwoXG4gICAgICAgIHNvdXJjZSxcblxuICAgICAgICAvLyBtb25pdG9yIGRpc2Nvbm5lY3Rpb25cbiAgICAgICAgcHVsbC50aHJvdWdoKG51bGwsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJlYWR5U3RhdGUgPSBSU19ESVNDT05ORUNURUQ7XG4gICAgICAgICAgc2lnbmFsbGVyKCdkaXNjb25uZWN0ZWQnKTtcbiAgICAgICAgfSksXG4gICAgICAgIHB1bGwuZHJhaW4ocHJvY2Vzc29yKVxuICAgICAgKTtcblxuICAgICAgLy8gcGFzcyB0aGUgcXVldWUgdG8gdGhlIHNpbmtcbiAgICAgIHB1bGwocXVldWUsIHNpbmspO1xuXG4gICAgICAvLyBoYW5kbGUgZGlzY29ubmVjdGlvblxuICAgICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCdkaXNjb25uZWN0ZWQnLCBoYW5kbGVEaXNjb25uZWN0KTtcbiAgICAgIHNpZ25hbGxlci5vbignZGlzY29ubmVjdGVkJywgaGFuZGxlRGlzY29ubmVjdCk7XG5cbiAgICAgIC8vIHRyaWdnZXIgdGhlIGNvbm5lY3RlZCBldmVudFxuICAgICAgc2lnbmFsbGVyKCdjb25uZWN0ZWQnKTtcbiAgICB9KTtcbiAgfTtcblxuICAvKipcbiAgICAjIyMgc2lnbmFsbGVyI3NlbmQobWVzc2FnZSwgZGF0YSopXG5cbiAgICBVc2UgdGhlIHNlbmQgZnVuY3Rpb24gdG8gc2VuZCBhIG1lc3NhZ2UgdG8gb3RoZXIgcGVlcnMgaW4gdGhlIGN1cnJlbnRcbiAgICBzaWduYWxsaW5nIHNjb3BlIChpZiBhbm5vdW5jZWQgaW4gYSByb29tIHRoaXMgd2lsbCBiZSBhIHJvb20sIG90aGVyd2lzZVxuICAgIGJyb2FkY2FzdCB0byBhbGwgcGVlcnMgY29ubmVjdGVkIHRvIHRoZSBzaWduYWxsaW5nIHNlcnZlcikuXG5cbiAgKiovXG4gIHZhciBzZW5kID0gc2lnbmFsbGVyLnNlbmQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBpdGVyYXRlIG92ZXIgdGhlIGFyZ3VtZW50cyBhbmQgc3RyaW5naWZ5IGFzIHJlcXVpcmVkXG4gICAgLy8gdmFyIG1ldGFkYXRhID0geyBpZDogc2lnbmFsbGVyLmlkIH07XG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG5cbiAgICAvLyBpbmplY3QgdGhlIG1ldGFkYXRhXG4gICAgYXJncy5zcGxpY2UoMSwgMCwgY3JlYXRlTWV0YWRhdGEoKSk7XG4gICAgYnVmZmVyTWVzc2FnZShhcmdzKTtcbiAgfTtcblxuICAvKipcbiAgICAjIyMgYW5ub3VuY2UoZGF0YT8pXG5cbiAgICBUaGUgYGFubm91bmNlYCBmdW5jdGlvbiBvZiB0aGUgc2lnbmFsbGVyIHdpbGwgcGFzcyBhbiBgL2Fubm91bmNlYCBtZXNzYWdlXG4gICAgdGhyb3VnaCB0aGUgbWVzc2VuZ2VyIG5ldHdvcmsuICBXaGVuIG5vIGFkZGl0aW9uYWwgZGF0YSBpcyBzdXBwbGllZCB0b1xuICAgIHRoaXMgZnVuY3Rpb24gdGhlbiBvbmx5IHRoZSBpZCBvZiB0aGUgc2lnbmFsbGVyIGlzIHNlbnQgdG8gYWxsIGFjdGl2ZVxuICAgIG1lbWJlcnMgb2YgdGhlIG1lc3NlbmdpbmcgbmV0d29yay5cblxuICAgICMjIyMgSm9pbmluZyBSb29tc1xuXG4gICAgVG8gam9pbiBhIHJvb20gdXNpbmcgYW4gYW5ub3VuY2UgY2FsbCB5b3Ugc2ltcGx5IHByb3ZpZGUgdGhlIG5hbWUgb2YgdGhlXG4gICAgcm9vbSB5b3Ugd2lzaCB0byBqb2luIGFzIHBhcnQgb2YgdGhlIGRhdGEgYmxvY2sgdGhhdCB5b3UgYW5ub3VjZSwgZm9yXG4gICAgZXhhbXBsZTpcblxuICAgIGBgYGpzXG4gICAgc2lnbmFsbGVyLmFubm91bmNlKHsgcm9vbTogJ3Rlc3Ryb29tJyB9KTtcbiAgICBgYGBcblxuICAgIFNpZ25hbGxpbmcgc2VydmVycyAoc3VjaCBhc1xuICAgIFtydGMtc3dpdGNoYm9hcmRdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLXN3aXRjaGJvYXJkKSkgd2lsbCB0aGVuXG4gICAgcGxhY2UgeW91ciBwZWVyIGNvbm5lY3Rpb24gaW50byBhIHJvb20gd2l0aCBvdGhlciBwZWVycyB0aGF0IGhhdmUgYWxzb1xuICAgIGFubm91bmNlZCBpbiB0aGlzIHJvb20uXG5cbiAgICBPbmNlIHlvdSBoYXZlIGpvaW5lZCBhIHJvb20sIHRoZSBzZXJ2ZXIgd2lsbCBvbmx5IGRlbGl2ZXIgbWVzc2FnZXMgdGhhdFxuICAgIHlvdSBgc2VuZGAgdG8gb3RoZXIgcGVlcnMgd2l0aGluIHRoYXQgcm9vbS5cblxuICAgICMjIyMgUHJvdmlkaW5nIEFkZGl0aW9uYWwgQW5ub3VuY2UgRGF0YVxuXG4gICAgVGhlcmUgbWF5IGJlIGluc3RhbmNlcyB3aGVyZSB5b3Ugd2lzaCB0byBzZW5kIGFkZGl0aW9uYWwgZGF0YSBhcyBwYXJ0IG9mXG4gICAgeW91ciBhbm5vdW5jZSBtZXNzYWdlIGluIHlvdXIgYXBwbGljYXRpb24uICBGb3IgaW5zdGFuY2UsIG1heWJlIHlvdSB3YW50XG4gICAgdG8gc2VuZCBhbiBhbGlhcyBvciBuaWNrIGFzIHBhcnQgb2YgeW91ciBhbm5vdW5jZSBtZXNzYWdlIHJhdGhlciB0aGFuIGp1c3RcbiAgICB1c2UgdGhlIHNpZ25hbGxlcidzIGdlbmVyYXRlZCBpZC5cblxuICAgIElmIGZvciBpbnN0YW5jZSB5b3Ugd2VyZSB3cml0aW5nIGEgc2ltcGxlIGNoYXQgYXBwbGljYXRpb24geW91IGNvdWxkIGpvaW5cbiAgICB0aGUgYHdlYnJ0Y2Agcm9vbSBhbmQgdGVsbCBldmVyeW9uZSB5b3VyIG5hbWUgd2l0aCB0aGUgZm9sbG93aW5nIGFubm91bmNlXG4gICAgY2FsbDpcblxuICAgIGBgYGpzXG4gICAgc2lnbmFsbGVyLmFubm91bmNlKHtcbiAgICAgIHJvb206ICd3ZWJydGMnLFxuICAgICAgbmljazogJ0RhbW9uJ1xuICAgIH0pO1xuICAgIGBgYFxuXG4gICAgIyMjIyBBbm5vdW5jaW5nIFVwZGF0ZXNcblxuICAgIFRoZSBzaWduYWxsZXIgaXMgd3JpdHRlbiB0byBkaXN0aW5ndWlzaCBiZXR3ZWVuIGluaXRpYWwgcGVlciBhbm5vdW5jZW1lbnRzXG4gICAgYW5kIHBlZXIgZGF0YSB1cGRhdGVzIChzZWUgdGhlIGRvY3Mgb24gdGhlIGFubm91bmNlIGhhbmRsZXIgYmVsb3cpLiBBc1xuICAgIHN1Y2ggaXQgaXMgb2sgdG8gcHJvdmlkZSBhbnkgZGF0YSB1cGRhdGVzIHVzaW5nIHRoZSBhbm5vdW5jZSBtZXRob2QgYWxzby5cblxuICAgIEZvciBpbnN0YW5jZSwgSSBjb3VsZCBzZW5kIGEgc3RhdHVzIHVwZGF0ZSBhcyBhbiBhbm5vdW5jZSBtZXNzYWdlIHRvIGZsYWdcbiAgICB0aGF0IEkgYW0gZ29pbmcgb2ZmbGluZTpcblxuICAgIGBgYGpzXG4gICAgc2lnbmFsbGVyLmFubm91bmNlKHsgc3RhdHVzOiAnb2ZmbGluZScgfSk7XG4gICAgYGBgXG5cbiAgKiovXG4gIHNpZ25hbGxlci5hbm5vdW5jZSA9IGZ1bmN0aW9uKGRhdGEsIHNlbmRlcikge1xuXG4gICAgZnVuY3Rpb24gc2VuZEFubm91bmNlKCkge1xuICAgICAgKHNlbmRlciB8fCBzZW5kKSgnL2Fubm91bmNlJywgYXR0cmlidXRlcyk7XG4gICAgICBzaWduYWxsZXIoJ2xvY2FsOmFubm91bmNlJywgYXR0cmlidXRlcyk7XG4gICAgfVxuXG4gICAgLy8gaWYgd2UgYXJlIGFscmVhZHkgY29ubmVjdGVkLCB0aGVuIGVuc3VyZSB3ZSBhbm5vdW5jZSBvbiByZWNvbm5lY3RcbiAgICBpZiAocmVhZHlTdGF0ZSA9PT0gUlNfQ09OTkVDVEVEKSB7XG4gICAgICAvLyBhbHdheXMgYW5ub3VuY2Ugb24gcmVjb25uZWN0XG4gICAgICBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIoJ2Nvbm5lY3RlZCcsIGFubm91bmNlT25SZWNvbm5lY3QpO1xuICAgICAgc2lnbmFsbGVyLm9uKCdjb25uZWN0ZWQnLCBhbm5vdW5jZU9uUmVjb25uZWN0KTtcbiAgICB9XG5cbiAgICBjbGVhclRpbWVvdXQoYW5ub3VuY2VUaW1lcik7XG5cbiAgICAvLyB1cGRhdGUgaW50ZXJuYWwgYXR0cmlidXRlc1xuICAgIGV4dGVuZChhdHRyaWJ1dGVzLCBkYXRhLCB7IGlkOiBzaWduYWxsZXIuaWQgfSk7XG5cbiAgICAvLyBzZW5kIHRoZSBhdHRyaWJ1dGVzIG92ZXIgdGhlIG5ldHdvcmtcbiAgICByZXR1cm4gYW5ub3VuY2VUaW1lciA9IHNldFRpbWVvdXQoc2VuZEFubm91bmNlLCAob3B0cyB8fCB7fSkuYW5ub3VuY2VEZWxheSB8fCAxMCk7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIGlzTWFzdGVyKHRhcmdldElkKVxuXG4gICAgQSBzaW1wbGUgZnVuY3Rpb24gdGhhdCBpbmRpY2F0ZXMgd2hldGhlciB0aGUgbG9jYWwgc2lnbmFsbGVyIGlzIHRoZSBtYXN0ZXJcbiAgICBmb3IgaXQncyByZWxhdGlvbnNoaXAgd2l0aCBwZWVyIHNpZ25hbGxlciBpbmRpY2F0ZWQgYnkgYHRhcmdldElkYC4gIFJvbGVzXG4gICAgYXJlIGRldGVybWluZWQgYXQgdGhlIHBvaW50IGF0IHdoaWNoIHNpZ25hbGxpbmcgcGVlcnMgZGlzY292ZXIgZWFjaCBvdGhlcixcbiAgICBhbmQgYXJlIHNpbXBseSB3b3JrZWQgb3V0IGJ5IHdoaWNoZXZlciBwZWVyIGhhcyB0aGUgbG93ZXN0IHNpZ25hbGxlciBpZFxuICAgIHdoZW4gbGV4aWdyYXBoaWNhbGx5IHNvcnRlZC5cblxuICAgIEZvciBleGFtcGxlLCBpZiB3ZSBoYXZlIHR3byBzaWduYWxsZXIgcGVlcnMgdGhhdCBoYXZlIGRpc2NvdmVyZWQgZWFjaFxuICAgIG90aGVycyB3aXRoIHRoZSBmb2xsb3dpbmcgaWRzOlxuXG4gICAgLSBgYjExZjRmZDAtZmViNS00NDdjLTgwYzgtYzUxZDhjM2NjZWQyYFxuICAgIC0gYDhhMDdmODJlLTQ5YTUtNGI5Yi1hMDJlLTQzZDkxMTM4MmJlNmBcblxuICAgIFRoZXkgd291bGQgYmUgYXNzaWduZWQgcm9sZXM6XG5cbiAgICAtIGBiMTFmNGZkMC1mZWI1LTQ0N2MtODBjOC1jNTFkOGMzY2NlZDJgXG4gICAgLSBgOGEwN2Y4MmUtNDlhNS00YjliLWEwMmUtNDNkOTExMzgyYmU2YCAobWFzdGVyKVxuXG4gICoqL1xuICBzaWduYWxsZXIuaXNNYXN0ZXIgPSBmdW5jdGlvbih0YXJnZXRJZCkge1xuICAgIHZhciBwZWVyID0gcGVlcnMuZ2V0KHRhcmdldElkKTtcblxuICAgIHJldHVybiBwZWVyICYmIHBlZXIucm9sZUlkeCAhPT0gMDtcbiAgfTtcblxuICAvKipcbiAgICAjIyMgbGVhdmUoKVxuXG4gICAgVGVsbCB0aGUgc2lnbmFsbGluZyBzZXJ2ZXIgd2UgYXJlIGxlYXZpbmcuICBDYWxsaW5nIHRoaXMgZnVuY3Rpb24gaXNcbiAgICB1c3VhbGx5IG5vdCByZXF1aXJlZCB0aG91Z2ggYXMgdGhlIHNpZ25hbGxpbmcgc2VydmVyIHNob3VsZCBpc3N1ZSBjb3JyZWN0XG4gICAgYC9sZWF2ZWAgbWVzc2FnZXMgd2hlbiBpdCBkZXRlY3RzIGEgZGlzY29ubmVjdCBldmVudC5cblxuICAqKi9cbiAgc2lnbmFsbGVyLmxlYXZlID0gc2lnbmFsbGVyLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gc2VuZCB0aGUgbGVhdmUgc2lnbmFsXG4gICAgc2VuZCgnL2xlYXZlJywgeyBpZDogaWQgfSk7XG5cbiAgICAvLyBzdG9wIGFubm91bmNpbmcgb24gcmVjb25uZWN0XG4gICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCdkaXNjb25uZWN0ZWQnLCBoYW5kbGVEaXNjb25uZWN0KTtcbiAgICBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIoJ2Nvbm5lY3RlZCcsIGFubm91bmNlT25SZWNvbm5lY3QpO1xuXG4gICAgLy8gZW5kIG91ciBjdXJyZW50IHF1ZXVlXG4gICAgcXVldWUuZW5kKCk7XG5cbiAgICAvLyBjcmVhdGUgYSBuZXcgcXVldWUgdG8gYnVmZmVyIG5ldyBtZXNzYWdlc1xuICAgIHF1ZXVlID0gcHVzaGFibGUoKTtcblxuICAgIC8vIHNldCBjb25uZWN0ZWQgdG8gZmFsc2VcbiAgICByZWFkeVN0YXRlID0gUlNfRElTQ09OTkVDVEVEO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyBtZXRhZGF0YShkYXRhPylcblxuICAgIEdldCAocGFzcyBubyBkYXRhKSBvciBzZXQgdGhlIG1ldGFkYXRhIHRoYXQgaXMgcGFzc2VkIHRocm91Z2ggd2l0aCBlYWNoXG4gICAgcmVxdWVzdCBzZW50IGJ5IHRoZSBzaWduYWxsZXIuXG5cbiAgICBfX05PVEU6X18gUmVnYXJkbGVzcyBvZiB3aGF0IGlzIHBhc3NlZCB0byB0aGlzIGZ1bmN0aW9uLCBtZXRhZGF0YVxuICAgIGdlbmVyYXRlZCBieSB0aGUgc2lnbmFsbGVyIHdpbGwgKiphbHdheXMqKiBpbmNsdWRlIHRoZSBpZCBvZiB0aGUgc2lnbmFsbGVyXG4gICAgYW5kIHRoaXMgY2Fubm90IGJlIG1vZGlmaWVkLlxuICAqKi9cbiAgc2lnbmFsbGVyLm1ldGFkYXRhID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIGNvbnNvbGUud2FybignbWV0YWRhdGEgaXMgZGVwcmVjYXRlZCwgcGxlYXNlIGRvIG5vdCB1c2UnKTtcblxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gZXh0ZW5kKHt9LCBsb2NhbE1ldGEpO1xuICAgIH1cblxuICAgIGxvY2FsTWV0YSA9IGV4dGVuZCh7fSwgZGF0YSk7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIHRvKHRhcmdldElkKVxuXG4gICAgVXNlIHRoZSBgdG9gIGZ1bmN0aW9uIHRvIHNlbmQgYSBtZXNzYWdlIHRvIHRoZSBzcGVjaWZpZWQgdGFyZ2V0IHBlZXIuXG4gICAgQSBsYXJnZSBwYXJnZSBvZiBuZWdvdGlhdGluZyBhIFdlYlJUQyBwZWVyIGNvbm5lY3Rpb24gaW52b2x2ZXMgZGlyZWN0XG4gICAgY29tbXVuaWNhdGlvbiBiZXR3ZWVuIHR3byBwYXJ0aWVzIHdoaWNoIG11c3QgYmUgZG9uZSBieSB0aGUgc2lnbmFsbGluZ1xuICAgIHNlcnZlci4gIFRoZSBgdG9gIGZ1bmN0aW9uIHByb3ZpZGVzIGEgc2ltcGxlIHdheSB0byBwcm92aWRlIGEgbG9naWNhbFxuICAgIGNvbW11bmljYXRpb24gY2hhbm5lbCBiZXR3ZWVuIHRoZSB0d28gcGFydGllczpcblxuICAgIGBgYGpzXG4gICAgdmFyIHNlbmQgPSBzaWduYWxsZXIudG8oJ2U5NWZhMDViLTkwNjItNDVjNi1iZmEyLTUwNTViZjY2MjVmNCcpLnNlbmQ7XG5cbiAgICAvLyBjcmVhdGUgYW4gb2ZmZXIgb24gYSBsb2NhbCBwZWVyIGNvbm5lY3Rpb25cbiAgICBwYy5jcmVhdGVPZmZlcihcbiAgICAgIGZ1bmN0aW9uKGRlc2MpIHtcbiAgICAgICAgLy8gc2V0IHRoZSBsb2NhbCBkZXNjcmlwdGlvbiB1c2luZyB0aGUgb2ZmZXIgc2RwXG4gICAgICAgIC8vIGlmIHRoaXMgb2NjdXJzIHN1Y2Nlc3NmdWxseSBzZW5kIHRoaXMgdG8gb3VyIHBlZXJcbiAgICAgICAgcGMuc2V0TG9jYWxEZXNjcmlwdGlvbihcbiAgICAgICAgICBkZXNjLFxuICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc2VuZCgnL3NkcCcsIGRlc2MpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgaGFuZGxlRmFpbFxuICAgICAgICApO1xuICAgICAgfSxcbiAgICAgIGhhbmRsZUZhaWxcbiAgICApO1xuICAgIGBgYFxuXG4gICoqL1xuICBzaWduYWxsZXIudG8gPSBmdW5jdGlvbih0YXJnZXRJZCkge1xuICAgIC8vIGNyZWF0ZSBhIHNlbmRlciB0aGF0IHdpbGwgcHJlcGVuZCBtZXNzYWdlcyB3aXRoIC90b3x0YXJnZXRJZHxcbiAgICB2YXIgc2VuZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBnZXQgdGhlIHBlZXIgKHllcyB3aGVuIHNlbmQgaXMgY2FsbGVkIHRvIG1ha2Ugc3VyZSBpdCBoYXNuJ3QgbGVmdClcbiAgICAgIHZhciBwZWVyID0gc2lnbmFsbGVyLnBlZXJzLmdldCh0YXJnZXRJZCk7XG4gICAgICB2YXIgYXJncztcblxuICAgICAgaWYgKCEgcGVlcikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gcGVlcjogJyArIHRhcmdldElkKTtcbiAgICAgIH1cblxuICAgICAgLy8gaWYgdGhlIHBlZXIgaXMgaW5hY3RpdmUsIHRoZW4gYWJvcnRcbiAgICAgIGlmIChwZWVyLmluYWN0aXZlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgYXJncyA9IFtcbiAgICAgICAgJy90bycsXG4gICAgICAgIHRhcmdldElkXG4gICAgICBdLmNvbmNhdChbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuXG4gICAgICAvLyBpbmplY3QgbWV0YWRhdGFcbiAgICAgIGFyZ3Muc3BsaWNlKDMsIDAsIGNyZWF0ZU1ldGFkYXRhKCkpO1xuICAgICAgYnVmZmVyTWVzc2FnZShhcmdzKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFubm91bmNlOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIHJldHVybiBzaWduYWxsZXIuYW5ub3VuY2UoZGF0YSwgc2VuZGVyKTtcbiAgICAgIH0sXG5cbiAgICAgIHNlbmQ6IHNlbmRlcixcbiAgICB9O1xuICB9O1xuXG4gIC8vIGluaXRpYWxpc2Ugb3B0cyBkZWZhdWx0c1xuICBvcHRzID0gZGVmYXVsdHMoe30sIG9wdHMsIHJlcXVpcmUoJy4vZGVmYXVsdHMnKSk7XG5cbiAgLy8gc2V0IHRoZSBhdXRvcmVwbHkgZmxhZ1xuICBzaWduYWxsZXIuYXV0b3JlcGx5ID0gYXV0b3JlcGx5ID09PSB1bmRlZmluZWQgfHwgYXV0b3JlcGx5O1xuXG4gIC8vIGNyZWF0ZSB0aGUgcHJvY2Vzc29yXG4gIHNpZ25hbGxlci5wcm9jZXNzID0gcHJvY2Vzc29yID0gcmVxdWlyZSgnLi9wcm9jZXNzb3InKShzaWduYWxsZXIsIG9wdHMpO1xuXG4gIC8vIGF1dG9jb25uZWN0XG4gIGlmIChhdXRvY29ubmVjdCA9PT0gdW5kZWZpbmVkIHx8IGF1dG9jb25uZWN0KSB7XG4gICAgY29ubmVjdCgpO1xuICB9XG5cbiAgcmV0dXJuIHNpZ25hbGxlcjtcbn07XG4iLCIvKipcbiAqIGN1aWQuanNcbiAqIENvbGxpc2lvbi1yZXNpc3RhbnQgVUlEIGdlbmVyYXRvciBmb3IgYnJvd3NlcnMgYW5kIG5vZGUuXG4gKiBTZXF1ZW50aWFsIGZvciBmYXN0IGRiIGxvb2t1cHMgYW5kIHJlY2VuY3kgc29ydGluZy5cbiAqIFNhZmUgZm9yIGVsZW1lbnQgSURzIGFuZCBzZXJ2ZXItc2lkZSBsb29rdXBzLlxuICpcbiAqIEV4dHJhY3RlZCBmcm9tIENMQ1RSXG4gKiBcbiAqIENvcHlyaWdodCAoYykgRXJpYyBFbGxpb3R0IDIwMTJcbiAqIE1JVCBMaWNlbnNlXG4gKi9cblxuLypnbG9iYWwgd2luZG93LCBuYXZpZ2F0b3IsIGRvY3VtZW50LCByZXF1aXJlLCBwcm9jZXNzLCBtb2R1bGUgKi9cbihmdW5jdGlvbiAoYXBwKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyIG5hbWVzcGFjZSA9ICdjdWlkJyxcbiAgICBjID0gMCxcbiAgICBibG9ja1NpemUgPSA0LFxuICAgIGJhc2UgPSAzNixcbiAgICBkaXNjcmV0ZVZhbHVlcyA9IE1hdGgucG93KGJhc2UsIGJsb2NrU2l6ZSksXG5cbiAgICBwYWQgPSBmdW5jdGlvbiBwYWQobnVtLCBzaXplKSB7XG4gICAgICB2YXIgcyA9IFwiMDAwMDAwMDAwXCIgKyBudW07XG4gICAgICByZXR1cm4gcy5zdWJzdHIocy5sZW5ndGgtc2l6ZSk7XG4gICAgfSxcblxuICAgIHJhbmRvbUJsb2NrID0gZnVuY3Rpb24gcmFuZG9tQmxvY2soKSB7XG4gICAgICByZXR1cm4gcGFkKChNYXRoLnJhbmRvbSgpICpcbiAgICAgICAgICAgIGRpc2NyZXRlVmFsdWVzIDw8IDApXG4gICAgICAgICAgICAudG9TdHJpbmcoYmFzZSksIGJsb2NrU2l6ZSk7XG4gICAgfSxcblxuICAgIHNhZmVDb3VudGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgYyA9IChjIDwgZGlzY3JldGVWYWx1ZXMpID8gYyA6IDA7XG4gICAgICBjKys7IC8vIHRoaXMgaXMgbm90IHN1YmxpbWluYWxcbiAgICAgIHJldHVybiBjIC0gMTtcbiAgICB9LFxuXG4gICAgYXBpID0gZnVuY3Rpb24gY3VpZCgpIHtcbiAgICAgIC8vIFN0YXJ0aW5nIHdpdGggYSBsb3dlcmNhc2UgbGV0dGVyIG1ha2VzXG4gICAgICAvLyBpdCBIVE1MIGVsZW1lbnQgSUQgZnJpZW5kbHkuXG4gICAgICB2YXIgbGV0dGVyID0gJ2MnLCAvLyBoYXJkLWNvZGVkIGFsbG93cyBmb3Igc2VxdWVudGlhbCBhY2Nlc3NcblxuICAgICAgICAvLyB0aW1lc3RhbXBcbiAgICAgICAgLy8gd2FybmluZzogdGhpcyBleHBvc2VzIHRoZSBleGFjdCBkYXRlIGFuZCB0aW1lXG4gICAgICAgIC8vIHRoYXQgdGhlIHVpZCB3YXMgY3JlYXRlZC5cbiAgICAgICAgdGltZXN0YW1wID0gKG5ldyBEYXRlKCkuZ2V0VGltZSgpKS50b1N0cmluZyhiYXNlKSxcblxuICAgICAgICAvLyBQcmV2ZW50IHNhbWUtbWFjaGluZSBjb2xsaXNpb25zLlxuICAgICAgICBjb3VudGVyLFxuXG4gICAgICAgIC8vIEEgZmV3IGNoYXJzIHRvIGdlbmVyYXRlIGRpc3RpbmN0IGlkcyBmb3IgZGlmZmVyZW50XG4gICAgICAgIC8vIGNsaWVudHMgKHNvIGRpZmZlcmVudCBjb21wdXRlcnMgYXJlIGZhciBsZXNzXG4gICAgICAgIC8vIGxpa2VseSB0byBnZW5lcmF0ZSB0aGUgc2FtZSBpZClcbiAgICAgICAgZmluZ2VycHJpbnQgPSBhcGkuZmluZ2VycHJpbnQoKSxcblxuICAgICAgICAvLyBHcmFiIHNvbWUgbW9yZSBjaGFycyBmcm9tIE1hdGgucmFuZG9tKClcbiAgICAgICAgcmFuZG9tID0gcmFuZG9tQmxvY2soKSArIHJhbmRvbUJsb2NrKCk7XG5cbiAgICAgICAgY291bnRlciA9IHBhZChzYWZlQ291bnRlcigpLnRvU3RyaW5nKGJhc2UpLCBibG9ja1NpemUpO1xuXG4gICAgICByZXR1cm4gIChsZXR0ZXIgKyB0aW1lc3RhbXAgKyBjb3VudGVyICsgZmluZ2VycHJpbnQgKyByYW5kb20pO1xuICAgIH07XG5cbiAgYXBpLnNsdWcgPSBmdW5jdGlvbiBzbHVnKCkge1xuICAgIHZhciBkYXRlID0gbmV3IERhdGUoKS5nZXRUaW1lKCkudG9TdHJpbmcoMzYpLFxuICAgICAgY291bnRlcixcbiAgICAgIHByaW50ID0gYXBpLmZpbmdlcnByaW50KCkuc2xpY2UoMCwxKSArXG4gICAgICAgIGFwaS5maW5nZXJwcmludCgpLnNsaWNlKC0xKSxcbiAgICAgIHJhbmRvbSA9IHJhbmRvbUJsb2NrKCkuc2xpY2UoLTIpO1xuXG4gICAgICBjb3VudGVyID0gc2FmZUNvdW50ZXIoKS50b1N0cmluZygzNikuc2xpY2UoLTQpO1xuXG4gICAgcmV0dXJuIGRhdGUuc2xpY2UoLTIpICsgXG4gICAgICBjb3VudGVyICsgcHJpbnQgKyByYW5kb207XG4gIH07XG5cbiAgYXBpLmdsb2JhbENvdW50ID0gZnVuY3Rpb24gZ2xvYmFsQ291bnQoKSB7XG4gICAgLy8gV2Ugd2FudCB0byBjYWNoZSB0aGUgcmVzdWx0cyBvZiB0aGlzXG4gICAgdmFyIGNhY2hlID0gKGZ1bmN0aW9uIGNhbGMoKSB7XG4gICAgICAgIHZhciBpLFxuICAgICAgICAgIGNvdW50ID0gMDtcblxuICAgICAgICBmb3IgKGkgaW4gd2luZG93KSB7XG4gICAgICAgICAgY291bnQrKztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjb3VudDtcbiAgICAgIH0oKSk7XG5cbiAgICBhcGkuZ2xvYmFsQ291bnQgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBjYWNoZTsgfTtcbiAgICByZXR1cm4gY2FjaGU7XG4gIH07XG5cbiAgYXBpLmZpbmdlcnByaW50ID0gZnVuY3Rpb24gYnJvd3NlclByaW50KCkge1xuICAgIHJldHVybiBwYWQoKG5hdmlnYXRvci5taW1lVHlwZXMubGVuZ3RoICtcbiAgICAgIG5hdmlnYXRvci51c2VyQWdlbnQubGVuZ3RoKS50b1N0cmluZygzNikgK1xuICAgICAgYXBpLmdsb2JhbENvdW50KCkudG9TdHJpbmcoMzYpLCA0KTtcbiAgfTtcblxuICAvLyBkb24ndCBjaGFuZ2UgYW55dGhpbmcgZnJvbSBoZXJlIGRvd24uXG4gIGlmIChhcHAucmVnaXN0ZXIpIHtcbiAgICBhcHAucmVnaXN0ZXIobmFtZXNwYWNlLCBhcGkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBhcGk7XG4gIH0gZWxzZSB7XG4gICAgYXBwW25hbWVzcGFjZV0gPSBhcGk7XG4gIH1cblxufSh0aGlzLmFwcGxpdHVkZSB8fCB0aGlzKSk7XG4iLCJ2YXIgcHVsbCA9IHJlcXVpcmUoJ3B1bGwtc3RyZWFtJylcblxubW9kdWxlLmV4cG9ydHMgPSBwdWxsLlNvdXJjZShmdW5jdGlvbiAob25DbG9zZSkge1xuICB2YXIgYnVmZmVyID0gW10sIGNicyA9IFtdLCB3YWl0aW5nID0gW10sIGVuZGVkXG5cbiAgZnVuY3Rpb24gZHJhaW4oKSB7XG4gICAgdmFyIGxcbiAgICB3aGlsZSh3YWl0aW5nLmxlbmd0aCAmJiAoKGwgPSBidWZmZXIubGVuZ3RoKSB8fCBlbmRlZCkpIHtcbiAgICAgIHZhciBkYXRhID0gYnVmZmVyLnNoaWZ0KClcbiAgICAgIHZhciBjYiAgID0gY2JzLnNoaWZ0KClcbiAgICAgIHdhaXRpbmcuc2hpZnQoKShsID8gbnVsbCA6IGVuZGVkLCBkYXRhKVxuICAgICAgY2IgJiYgY2IoZW5kZWQgPT09IHRydWUgPyBudWxsIDogZW5kZWQpXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZCAoZW5kLCBjYikge1xuICAgIGVuZGVkID0gZW5kZWQgfHwgZW5kXG4gICAgd2FpdGluZy5wdXNoKGNiKVxuICAgIGRyYWluKClcbiAgICBpZihlbmRlZClcbiAgICAgIG9uQ2xvc2UgJiYgb25DbG9zZShlbmRlZCA9PT0gdHJ1ZSA/IG51bGwgOiBlbmRlZClcbiAgfVxuXG4gIHJlYWQucHVzaCA9IGZ1bmN0aW9uIChkYXRhLCBjYikge1xuICAgIGlmKGVuZGVkKVxuICAgICAgcmV0dXJuIGNiICYmIGNiKGVuZGVkID09PSB0cnVlID8gbnVsbCA6IGVuZGVkKVxuICAgIGJ1ZmZlci5wdXNoKGRhdGEpOyBjYnMucHVzaChjYilcbiAgICBkcmFpbigpXG4gIH1cblxuICByZWFkLmVuZCA9IGZ1bmN0aW9uIChlbmQsIGNiKSB7XG4gICAgaWYoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGVuZClcbiAgICAgIGNiID0gZW5kLCBlbmQgPSB0cnVlXG4gICAgZW5kZWQgPSBlbmRlZCB8fCBlbmQgfHwgdHJ1ZTtcbiAgICBpZihjYikgY2JzLnB1c2goY2IpXG4gICAgZHJhaW4oKVxuICAgIGlmKGVuZGVkKVxuICAgICAgb25DbG9zZSAmJiBvbkNsb3NlKGVuZGVkID09PSB0cnVlID8gbnVsbCA6IGVuZGVkKVxuICB9XG5cbiAgcmV0dXJuIHJlYWRcbn0pXG5cbiIsIlxudmFyIHNvdXJjZXMgID0gcmVxdWlyZSgnLi9zb3VyY2VzJylcbnZhciBzaW5rcyAgICA9IHJlcXVpcmUoJy4vc2lua3MnKVxudmFyIHRocm91Z2hzID0gcmVxdWlyZSgnLi90aHJvdWdocycpXG52YXIgdSAgICAgICAgPSByZXF1aXJlKCdwdWxsLWNvcmUnKVxuXG5mb3IodmFyIGsgaW4gc291cmNlcylcbiAgZXhwb3J0c1trXSA9IHUuU291cmNlKHNvdXJjZXNba10pXG5cbmZvcih2YXIgayBpbiB0aHJvdWdocylcbiAgZXhwb3J0c1trXSA9IHUuVGhyb3VnaCh0aHJvdWdoc1trXSlcblxuZm9yKHZhciBrIGluIHNpbmtzKVxuICBleHBvcnRzW2tdID0gdS5TaW5rKHNpbmtzW2tdKVxuXG52YXIgbWF5YmUgPSByZXF1aXJlKCcuL21heWJlJykoZXhwb3J0cylcblxuZm9yKHZhciBrIGluIG1heWJlKVxuICBleHBvcnRzW2tdID0gbWF5YmVba11cblxuZXhwb3J0cy5EdXBsZXggID0gXG5leHBvcnRzLlRocm91Z2ggPSBleHBvcnRzLnBpcGVhYmxlICAgICAgID0gdS5UaHJvdWdoXG5leHBvcnRzLlNvdXJjZSAgPSBleHBvcnRzLnBpcGVhYmxlU291cmNlID0gdS5Tb3VyY2VcbmV4cG9ydHMuU2luayAgICA9IGV4cG9ydHMucGlwZWFibGVTaW5rICAgPSB1LlNpbmtcblxuXG4iLCJ2YXIgdSA9IHJlcXVpcmUoJ3B1bGwtY29yZScpXG52YXIgcHJvcCA9IHUucHJvcFxudmFyIGlkICAgPSB1LmlkXG52YXIgbWF5YmVTaW5rID0gdS5tYXliZVNpbmtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAocHVsbCkge1xuXG4gIHZhciBleHBvcnRzID0ge31cbiAgdmFyIGRyYWluID0gcHVsbC5kcmFpblxuXG4gIHZhciBmaW5kID0gXG4gIGV4cG9ydHMuZmluZCA9IGZ1bmN0aW9uICh0ZXN0LCBjYikge1xuICAgIHJldHVybiBtYXliZVNpbmsoZnVuY3Rpb24gKGNiKSB7XG4gICAgICB2YXIgZW5kZWQgPSBmYWxzZVxuICAgICAgaWYoIWNiKVxuICAgICAgICBjYiA9IHRlc3QsIHRlc3QgPSBpZFxuICAgICAgZWxzZVxuICAgICAgICB0ZXN0ID0gcHJvcCh0ZXN0KSB8fCBpZFxuXG4gICAgICByZXR1cm4gZHJhaW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgaWYodGVzdChkYXRhKSkge1xuICAgICAgICAgIGVuZGVkID0gdHJ1ZVxuICAgICAgICAgIGNiKG51bGwsIGRhdGEpXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIGlmKGVuZGVkKSByZXR1cm4gLy9hbHJlYWR5IGNhbGxlZCBiYWNrXG4gICAgICAgIGNiKGVyciA9PT0gdHJ1ZSA/IG51bGwgOiBlcnIsIG51bGwpXG4gICAgICB9KVxuXG4gICAgfSwgY2IpXG4gIH1cblxuICB2YXIgcmVkdWNlID0gZXhwb3J0cy5yZWR1Y2UgPSBcbiAgZnVuY3Rpb24gKHJlZHVjZSwgYWNjLCBjYikge1xuICAgIFxuICAgIHJldHVybiBtYXliZVNpbmsoZnVuY3Rpb24gKGNiKSB7XG4gICAgICByZXR1cm4gZHJhaW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgYWNjID0gcmVkdWNlKGFjYywgZGF0YSlcbiAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgY2IoZXJyLCBhY2MpXG4gICAgICB9KVxuXG4gICAgfSwgY2IpXG4gIH1cblxuICB2YXIgY29sbGVjdCA9IGV4cG9ydHMuY29sbGVjdCA9IGV4cG9ydHMud3JpdGVBcnJheSA9XG4gIGZ1bmN0aW9uIChjYikge1xuICAgIHJldHVybiByZWR1Y2UoZnVuY3Rpb24gKGFyciwgaXRlbSkge1xuICAgICAgYXJyLnB1c2goaXRlbSlcbiAgICAgIHJldHVybiBhcnJcbiAgICB9LCBbXSwgY2IpXG4gIH1cblxuICByZXR1cm4gZXhwb3J0c1xufVxuIiwiZXhwb3J0cy5pZCA9IFxuZnVuY3Rpb24gKGl0ZW0pIHtcbiAgcmV0dXJuIGl0ZW1cbn1cblxuZXhwb3J0cy5wcm9wID0gXG5mdW5jdGlvbiAobWFwKSB7ICBcbiAgaWYoJ3N0cmluZycgPT0gdHlwZW9mIG1hcCkge1xuICAgIHZhciBrZXkgPSBtYXBcbiAgICByZXR1cm4gZnVuY3Rpb24gKGRhdGEpIHsgcmV0dXJuIGRhdGFba2V5XSB9XG4gIH1cbiAgcmV0dXJuIG1hcFxufVxuXG5leHBvcnRzLnRlc3RlciA9IGZ1bmN0aW9uICh0ZXN0KSB7XG4gIGlmKCF0ZXN0KSByZXR1cm4gZXhwb3J0cy5pZFxuICBpZignb2JqZWN0JyA9PT0gdHlwZW9mIHRlc3RcbiAgICAmJiAnZnVuY3Rpb24nID09PSB0eXBlb2YgdGVzdC50ZXN0KVxuICAgICAgcmV0dXJuIHRlc3QudGVzdC5iaW5kKHRlc3QpXG4gIHJldHVybiBleHBvcnRzLnByb3AodGVzdCkgfHwgZXhwb3J0cy5pZFxufVxuXG5leHBvcnRzLmFkZFBpcGUgPSBhZGRQaXBlXG5cbmZ1bmN0aW9uIGFkZFBpcGUocmVhZCkge1xuICBpZignZnVuY3Rpb24nICE9PSB0eXBlb2YgcmVhZClcbiAgICByZXR1cm4gcmVhZFxuXG4gIHJlYWQucGlwZSA9IHJlYWQucGlwZSB8fCBmdW5jdGlvbiAocmVhZGVyKSB7XG4gICAgaWYoJ2Z1bmN0aW9uJyAhPSB0eXBlb2YgcmVhZGVyKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdtdXN0IHBpcGUgdG8gcmVhZGVyJylcbiAgICByZXR1cm4gYWRkUGlwZShyZWFkZXIocmVhZCkpXG4gIH1cbiAgcmVhZC50eXBlID0gJ1NvdXJjZSdcbiAgcmV0dXJuIHJlYWRcbn1cblxudmFyIFNvdXJjZSA9XG5leHBvcnRzLlNvdXJjZSA9XG5mdW5jdGlvbiBTb3VyY2UgKGNyZWF0ZVJlYWQpIHtcbiAgZnVuY3Rpb24gcygpIHtcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgIHJldHVybiBhZGRQaXBlKGNyZWF0ZVJlYWQuYXBwbHkobnVsbCwgYXJncykpXG4gIH1cbiAgcy50eXBlID0gJ1NvdXJjZSdcbiAgcmV0dXJuIHNcbn1cblxuXG52YXIgVGhyb3VnaCA9XG5leHBvcnRzLlRocm91Z2ggPSBcbmZ1bmN0aW9uIChjcmVhdGVSZWFkKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICB2YXIgcGlwZWQgPSBbXVxuICAgIGZ1bmN0aW9uIHJlYWRlciAocmVhZCkge1xuICAgICAgYXJncy51bnNoaWZ0KHJlYWQpXG4gICAgICByZWFkID0gY3JlYXRlUmVhZC5hcHBseShudWxsLCBhcmdzKVxuICAgICAgd2hpbGUocGlwZWQubGVuZ3RoKVxuICAgICAgICByZWFkID0gcGlwZWQuc2hpZnQoKShyZWFkKVxuICAgICAgcmV0dXJuIHJlYWRcbiAgICAgIC8vcGlwZWluZyB0byBmcm9tIHRoaXMgcmVhZGVyIHNob3VsZCBjb21wb3NlLi4uXG4gICAgfVxuICAgIHJlYWRlci5waXBlID0gZnVuY3Rpb24gKHJlYWQpIHtcbiAgICAgIHBpcGVkLnB1c2gocmVhZCkgXG4gICAgICBpZihyZWFkLnR5cGUgPT09ICdTb3VyY2UnKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Nhbm5vdCBwaXBlICcgKyByZWFkZXIudHlwZSArICcgdG8gU291cmNlJylcbiAgICAgIHJlYWRlci50eXBlID0gcmVhZC50eXBlID09PSAnU2luaycgPyAnU2luaycgOiAnVGhyb3VnaCdcbiAgICAgIHJldHVybiByZWFkZXJcbiAgICB9XG4gICAgcmVhZGVyLnR5cGUgPSAnVGhyb3VnaCdcbiAgICByZXR1cm4gcmVhZGVyXG4gIH1cbn1cblxudmFyIFNpbmsgPVxuZXhwb3J0cy5TaW5rID0gXG5mdW5jdGlvbiBTaW5rKGNyZWF0ZVJlYWRlcikge1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgaWYoIWNyZWF0ZVJlYWRlcilcbiAgICAgIHRocm93IG5ldyBFcnJvcignbXVzdCBiZSBjcmVhdGVSZWFkZXIgZnVuY3Rpb24nKVxuICAgIGZ1bmN0aW9uIHMgKHJlYWQpIHtcbiAgICAgIGFyZ3MudW5zaGlmdChyZWFkKVxuICAgICAgcmV0dXJuIGNyZWF0ZVJlYWRlci5hcHBseShudWxsLCBhcmdzKVxuICAgIH1cbiAgICBzLnR5cGUgPSAnU2luaydcbiAgICByZXR1cm4gc1xuICB9XG59XG5cblxuZXhwb3J0cy5tYXliZVNpbmsgPSBcbmV4cG9ydHMubWF5YmVEcmFpbiA9IFxuZnVuY3Rpb24gKGNyZWF0ZVNpbmssIGNiKSB7XG4gIGlmKCFjYilcbiAgICByZXR1cm4gVGhyb3VnaChmdW5jdGlvbiAocmVhZCkge1xuICAgICAgdmFyIGVuZGVkXG4gICAgICByZXR1cm4gZnVuY3Rpb24gKGNsb3NlLCBjYikge1xuICAgICAgICBpZihjbG9zZSkgcmV0dXJuIHJlYWQoY2xvc2UsIGNiKVxuICAgICAgICBpZihlbmRlZCkgcmV0dXJuIGNiKGVuZGVkKVxuXG4gICAgICAgIGNyZWF0ZVNpbmsoZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgICAgICAgIGVuZGVkID0gZXJyIHx8IHRydWVcbiAgICAgICAgICBpZighZXJyKSBjYihudWxsLCBkYXRhKVxuICAgICAgICAgIGVsc2UgICAgIGNiKGVuZGVkKVxuICAgICAgICB9KSAocmVhZClcbiAgICAgIH1cbiAgICB9KSgpXG5cbiAgcmV0dXJuIFNpbmsoZnVuY3Rpb24gKHJlYWQpIHtcbiAgICByZXR1cm4gY3JlYXRlU2luayhjYikgKHJlYWQpXG4gIH0pKClcbn1cblxuIiwidmFyIGRyYWluID0gZXhwb3J0cy5kcmFpbiA9IGZ1bmN0aW9uIChyZWFkLCBvcCwgZG9uZSkge1xuXG4gIDsoZnVuY3Rpb24gbmV4dCgpIHtcbiAgICB2YXIgbG9vcCA9IHRydWUsIGNiZWQgPSBmYWxzZVxuICAgIHdoaWxlKGxvb3ApIHtcbiAgICAgIGNiZWQgPSBmYWxzZVxuICAgICAgcmVhZChudWxsLCBmdW5jdGlvbiAoZW5kLCBkYXRhKSB7XG4gICAgICAgIGNiZWQgPSB0cnVlXG4gICAgICAgIGlmKGVuZCkge1xuICAgICAgICAgIGxvb3AgPSBmYWxzZVxuICAgICAgICAgIGRvbmUgJiYgZG9uZShlbmQgPT09IHRydWUgPyBudWxsIDogZW5kKVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYob3AgJiYgZmFsc2UgPT09IG9wKGRhdGEpKSB7XG4gICAgICAgICAgbG9vcCA9IGZhbHNlXG4gICAgICAgICAgcmVhZCh0cnVlLCBkb25lIHx8IGZ1bmN0aW9uICgpIHt9KVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYoIWxvb3Ape1xuICAgICAgICAgIG5leHQoKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgaWYoIWNiZWQpIHtcbiAgICAgICAgbG9vcCA9IGZhbHNlXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgIH1cbiAgfSkoKVxufVxuXG52YXIgb25FbmQgPSBleHBvcnRzLm9uRW5kID0gZnVuY3Rpb24gKHJlYWQsIGRvbmUpIHtcbiAgcmV0dXJuIGRyYWluKHJlYWQsIG51bGwsIGRvbmUpXG59XG5cbnZhciBsb2cgPSBleHBvcnRzLmxvZyA9IGZ1bmN0aW9uIChyZWFkLCBkb25lKSB7XG4gIHJldHVybiBkcmFpbihyZWFkLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgIGNvbnNvbGUubG9nKGRhdGEpXG4gIH0sIGRvbmUpXG59XG5cbiIsIlxudmFyIGtleXMgPSBleHBvcnRzLmtleXMgPVxuZnVuY3Rpb24gKG9iamVjdCkge1xuICByZXR1cm4gdmFsdWVzKE9iamVjdC5rZXlzKG9iamVjdCkpXG59XG5cbnZhciBvbmNlID0gZXhwb3J0cy5vbmNlID1cbmZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24gKGFib3J0LCBjYikge1xuICAgIGlmKGFib3J0KSByZXR1cm4gY2IoYWJvcnQpXG4gICAgaWYodmFsdWUgIT0gbnVsbCkge1xuICAgICAgdmFyIF92YWx1ZSA9IHZhbHVlOyB2YWx1ZSA9IG51bGxcbiAgICAgIGNiKG51bGwsIF92YWx1ZSlcbiAgICB9IGVsc2VcbiAgICAgIGNiKHRydWUpXG4gIH1cbn1cblxudmFyIHZhbHVlcyA9IGV4cG9ydHMudmFsdWVzID0gZXhwb3J0cy5yZWFkQXJyYXkgPVxuZnVuY3Rpb24gKGFycmF5KSB7XG4gIGlmKCFBcnJheS5pc0FycmF5KGFycmF5KSlcbiAgICBhcnJheSA9IE9iamVjdC5rZXlzKGFycmF5KS5tYXAoZnVuY3Rpb24gKGspIHtcbiAgICAgIHJldHVybiBhcnJheVtrXVxuICAgIH0pXG4gIHZhciBpID0gMFxuICByZXR1cm4gZnVuY3Rpb24gKGVuZCwgY2IpIHtcbiAgICBpZihlbmQpXG4gICAgICByZXR1cm4gY2IgJiYgY2IoZW5kKSAgXG4gICAgY2IoaSA+PSBhcnJheS5sZW5ndGggfHwgbnVsbCwgYXJyYXlbaSsrXSlcbiAgfVxufVxuXG5cbnZhciBjb3VudCA9IGV4cG9ydHMuY291bnQgPSBcbmZ1bmN0aW9uIChtYXgpIHtcbiAgdmFyIGkgPSAwOyBtYXggPSBtYXggfHwgSW5maW5pdHlcbiAgcmV0dXJuIGZ1bmN0aW9uIChlbmQsIGNiKSB7XG4gICAgaWYoZW5kKSByZXR1cm4gY2IgJiYgY2IoZW5kKVxuICAgIGlmKGkgPiBtYXgpXG4gICAgICByZXR1cm4gY2IodHJ1ZSlcbiAgICBjYihudWxsLCBpKyspXG4gIH1cbn1cblxudmFyIGluZmluaXRlID0gZXhwb3J0cy5pbmZpbml0ZSA9IFxuZnVuY3Rpb24gKGdlbmVyYXRlKSB7XG4gIGdlbmVyYXRlID0gZ2VuZXJhdGUgfHwgTWF0aC5yYW5kb21cbiAgcmV0dXJuIGZ1bmN0aW9uIChlbmQsIGNiKSB7XG4gICAgaWYoZW5kKSByZXR1cm4gY2IgJiYgY2IoZW5kKVxuICAgIHJldHVybiBjYihudWxsLCBnZW5lcmF0ZSgpKVxuICB9XG59XG5cbnZhciBkZWZlciA9IGV4cG9ydHMuZGVmZXIgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBfcmVhZCwgY2JzID0gW10sIF9lbmRcblxuICB2YXIgcmVhZCA9IGZ1bmN0aW9uIChlbmQsIGNiKSB7XG4gICAgaWYoIV9yZWFkKSB7XG4gICAgICBfZW5kID0gZW5kXG4gICAgICBjYnMucHVzaChjYilcbiAgICB9IFxuICAgIGVsc2UgX3JlYWQoZW5kLCBjYilcbiAgfVxuICByZWFkLnJlc29sdmUgPSBmdW5jdGlvbiAocmVhZCkge1xuICAgIGlmKF9yZWFkKSB0aHJvdyBuZXcgRXJyb3IoJ2FscmVhZHkgcmVzb2x2ZWQnKVxuICAgIF9yZWFkID0gcmVhZFxuICAgIGlmKCFfcmVhZCkgdGhyb3cgbmV3IEVycm9yKCdubyByZWFkIGNhbm5vdCByZXNvbHZlIScgKyBfcmVhZClcbiAgICB3aGlsZShjYnMubGVuZ3RoKVxuICAgICAgX3JlYWQoX2VuZCwgY2JzLnNoaWZ0KCkpXG4gIH1cbiAgcmVhZC5hYm9ydCA9IGZ1bmN0aW9uKGVycikge1xuICAgIHJlYWQucmVzb2x2ZShmdW5jdGlvbiAoXywgY2IpIHtcbiAgICAgIGNiKGVyciB8fCB0cnVlKVxuICAgIH0pXG4gIH1cbiAgcmV0dXJuIHJlYWRcbn1cblxudmFyIGVtcHR5ID0gZXhwb3J0cy5lbXB0eSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIChhYm9ydCwgY2IpIHtcbiAgICBjYih0cnVlKVxuICB9XG59XG5cbnZhciBkZXB0aEZpcnN0ID0gZXhwb3J0cy5kZXB0aEZpcnN0ID1cbmZ1bmN0aW9uIChzdGFydCwgY3JlYXRlU3RyZWFtKSB7XG4gIHZhciByZWFkcyA9IFtdXG5cbiAgcmVhZHMudW5zaGlmdChvbmNlKHN0YXJ0KSlcblxuICByZXR1cm4gZnVuY3Rpb24gbmV4dCAoZW5kLCBjYikge1xuICAgIGlmKCFyZWFkcy5sZW5ndGgpXG4gICAgICByZXR1cm4gY2IodHJ1ZSlcbiAgICByZWFkc1swXShlbmQsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgIGlmKGVuZCkge1xuICAgICAgICAvL2lmIHRoaXMgc3RyZWFtIGhhcyBlbmRlZCwgZ28gdG8gdGhlIG5leHQgcXVldWVcbiAgICAgICAgcmVhZHMuc2hpZnQoKVxuICAgICAgICByZXR1cm4gbmV4dChudWxsLCBjYilcbiAgICAgIH1cbiAgICAgIHJlYWRzLnVuc2hpZnQoY3JlYXRlU3RyZWFtKGRhdGEpKVxuICAgICAgY2IoZW5kLCBkYXRhKVxuICAgIH0pXG4gIH1cbn1cbi8vd2lkdGggZmlyc3QgaXMganVzdCBsaWtlIGRlcHRoIGZpcnN0LFxuLy9idXQgcHVzaCBlYWNoIG5ldyBzdHJlYW0gb250byB0aGUgZW5kIG9mIHRoZSBxdWV1ZVxudmFyIHdpZHRoRmlyc3QgPSBleHBvcnRzLndpZHRoRmlyc3QgPSBcbmZ1bmN0aW9uIChzdGFydCwgY3JlYXRlU3RyZWFtKSB7XG4gIHZhciByZWFkcyA9IFtdXG5cbiAgcmVhZHMucHVzaChvbmNlKHN0YXJ0KSlcblxuICByZXR1cm4gZnVuY3Rpb24gbmV4dCAoZW5kLCBjYikge1xuICAgIGlmKCFyZWFkcy5sZW5ndGgpXG4gICAgICByZXR1cm4gY2IodHJ1ZSlcbiAgICByZWFkc1swXShlbmQsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgIGlmKGVuZCkge1xuICAgICAgICByZWFkcy5zaGlmdCgpXG4gICAgICAgIHJldHVybiBuZXh0KG51bGwsIGNiKVxuICAgICAgfVxuICAgICAgcmVhZHMucHVzaChjcmVhdGVTdHJlYW0oZGF0YSkpXG4gICAgICBjYihlbmQsIGRhdGEpXG4gICAgfSlcbiAgfVxufVxuXG4vL3RoaXMgY2FtZSBvdXQgZGlmZmVyZW50IHRvIHRoZSBmaXJzdCAoc3RybSlcbi8vYXR0ZW1wdCBhdCBsZWFmRmlyc3QsIGJ1dCBpdCdzIHN0aWxsIGEgdmFsaWRcbi8vdG9wb2xvZ2ljYWwgc29ydC5cbnZhciBsZWFmRmlyc3QgPSBleHBvcnRzLmxlYWZGaXJzdCA9IFxuZnVuY3Rpb24gKHN0YXJ0LCBjcmVhdGVTdHJlYW0pIHtcbiAgdmFyIHJlYWRzID0gW11cbiAgdmFyIG91dHB1dCA9IFtdXG4gIHJlYWRzLnB1c2gob25jZShzdGFydCkpXG4gIFxuICByZXR1cm4gZnVuY3Rpb24gbmV4dCAoZW5kLCBjYikge1xuICAgIHJlYWRzWzBdKGVuZCwgZnVuY3Rpb24gKGVuZCwgZGF0YSkge1xuICAgICAgaWYoZW5kKSB7XG4gICAgICAgIHJlYWRzLnNoaWZ0KClcbiAgICAgICAgaWYoIW91dHB1dC5sZW5ndGgpXG4gICAgICAgICAgcmV0dXJuIGNiKHRydWUpXG4gICAgICAgIHJldHVybiBjYihudWxsLCBvdXRwdXQuc2hpZnQoKSlcbiAgICAgIH1cbiAgICAgIHJlYWRzLnVuc2hpZnQoY3JlYXRlU3RyZWFtKGRhdGEpKVxuICAgICAgb3V0cHV0LnVuc2hpZnQoZGF0YSlcbiAgICAgIG5leHQobnVsbCwgY2IpXG4gICAgfSlcbiAgfVxufVxuXG4iLCJ2YXIgdSAgICAgID0gcmVxdWlyZSgncHVsbC1jb3JlJylcbnZhciBzb3VyY2VzID0gcmVxdWlyZSgnLi9zb3VyY2VzJylcbnZhciBzaW5rcyA9IHJlcXVpcmUoJy4vc2lua3MnKVxuXG52YXIgcHJvcCAgID0gdS5wcm9wXG52YXIgaWQgICAgID0gdS5pZFxudmFyIHRlc3RlciA9IHUudGVzdGVyXG5cbnZhciBtYXAgPSBleHBvcnRzLm1hcCA9IFxuZnVuY3Rpb24gKHJlYWQsIG1hcCkge1xuICBtYXAgPSBwcm9wKG1hcCkgfHwgaWRcbiAgcmV0dXJuIGZ1bmN0aW9uIChlbmQsIGNiKSB7XG4gICAgcmVhZChlbmQsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgIHZhciBkYXRhID0gIWVuZCA/IG1hcChkYXRhKSA6IG51bGxcbiAgICAgIGNiKGVuZCwgZGF0YSlcbiAgICB9KVxuICB9XG59XG5cbnZhciBhc3luY01hcCA9IGV4cG9ydHMuYXN5bmNNYXAgPVxuZnVuY3Rpb24gKHJlYWQsIG1hcCkge1xuICBpZighbWFwKSByZXR1cm4gcmVhZFxuICByZXR1cm4gZnVuY3Rpb24gKGVuZCwgY2IpIHtcbiAgICBpZihlbmQpIHJldHVybiByZWFkKGVuZCwgY2IpIC8vYWJvcnRcbiAgICByZWFkKG51bGwsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgIGlmKGVuZCkgcmV0dXJuIGNiKGVuZCwgZGF0YSlcbiAgICAgIG1hcChkYXRhLCBjYilcbiAgICB9KVxuICB9XG59XG5cbnZhciBwYXJhTWFwID0gZXhwb3J0cy5wYXJhTWFwID1cbmZ1bmN0aW9uIChyZWFkLCBtYXAsIHdpZHRoKSB7XG4gIGlmKCFtYXApIHJldHVybiByZWFkXG4gIHZhciBlbmRlZCA9IGZhbHNlLCBxdWV1ZSA9IFtdLCBfY2JcblxuICBmdW5jdGlvbiBkcmFpbiAoKSB7XG4gICAgaWYoIV9jYikgcmV0dXJuXG4gICAgdmFyIGNiID0gX2NiXG4gICAgX2NiID0gbnVsbFxuICAgIGlmKHF1ZXVlLmxlbmd0aClcbiAgICAgIHJldHVybiBjYihudWxsLCBxdWV1ZS5zaGlmdCgpKVxuICAgIGVsc2UgaWYoZW5kZWQgJiYgIW4pXG4gICAgICByZXR1cm4gY2IoZW5kZWQpXG4gICAgX2NiID0gY2JcbiAgfVxuXG4gIGZ1bmN0aW9uIHB1bGwgKCkge1xuICAgIHJlYWQobnVsbCwgZnVuY3Rpb24gKGVuZCwgZGF0YSkge1xuICAgICAgaWYoZW5kKSB7XG4gICAgICAgIGVuZGVkID0gZW5kXG4gICAgICAgIHJldHVybiBkcmFpbigpXG4gICAgICB9XG4gICAgICBuKytcbiAgICAgIG1hcChkYXRhLCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG4gICAgICAgIG4tLVxuXG4gICAgICAgIHF1ZXVlLnB1c2goZGF0YSlcbiAgICAgICAgZHJhaW4oKVxuICAgICAgfSlcblxuICAgICAgaWYobiA8IHdpZHRoICYmICFlbmRlZClcbiAgICAgICAgcHVsbCgpXG4gICAgfSlcbiAgfVxuXG4gIHZhciBuID0gMFxuICByZXR1cm4gZnVuY3Rpb24gKGVuZCwgY2IpIHtcbiAgICBpZihlbmQpIHJldHVybiByZWFkKGVuZCwgY2IpIC8vYWJvcnRcbiAgICAvL2NvbnRpbnVlIHRvIHJlYWQgd2hpbGUgdGhlcmUgYXJlIGxlc3MgdGhhbiAzIG1hcHMgaW4gZmxpZ2h0XG4gICAgX2NiID0gY2JcbiAgICBpZihxdWV1ZS5sZW5ndGggfHwgZW5kZWQpXG4gICAgICBwdWxsKCksIGRyYWluKClcbiAgICBlbHNlIHB1bGwoKVxuICB9XG4gIHJldHVybiBoaWdoV2F0ZXJNYXJrKGFzeW5jTWFwKHJlYWQsIG1hcCksIHdpZHRoKVxufVxuXG52YXIgZmlsdGVyID0gZXhwb3J0cy5maWx0ZXIgPVxuZnVuY3Rpb24gKHJlYWQsIHRlc3QpIHtcbiAgLy9yZWdleHBcbiAgdGVzdCA9IHRlc3Rlcih0ZXN0KVxuICByZXR1cm4gZnVuY3Rpb24gbmV4dCAoZW5kLCBjYikge1xuICAgIHJlYWQoZW5kLCBmdW5jdGlvbiAoZW5kLCBkYXRhKSB7XG4gICAgICBpZighZW5kICYmICF0ZXN0KGRhdGEpKVxuICAgICAgICByZXR1cm4gbmV4dChlbmQsIGNiKVxuICAgICAgY2IoZW5kLCBkYXRhKVxuICAgIH0pXG4gIH1cbn1cblxudmFyIGZpbHRlck5vdCA9IGV4cG9ydHMuZmlsdGVyTm90ID1cbmZ1bmN0aW9uIChyZWFkLCB0ZXN0KSB7XG4gIHRlc3QgPSB0ZXN0ZXIodGVzdClcbiAgcmV0dXJuIGZpbHRlcihyZWFkLCBmdW5jdGlvbiAoZSkge1xuICAgIHJldHVybiAhdGVzdChlKVxuICB9KVxufVxuXG52YXIgdGhyb3VnaCA9IGV4cG9ydHMudGhyb3VnaCA9IFxuZnVuY3Rpb24gKHJlYWQsIG9wLCBvbkVuZCkge1xuICB2YXIgYSA9IGZhbHNlXG4gIGZ1bmN0aW9uIG9uY2UgKGFib3J0KSB7XG4gICAgaWYoYSB8fCAhb25FbmQpIHJldHVyblxuICAgIGEgPSB0cnVlXG4gICAgb25FbmQoYWJvcnQgPT09IHRydWUgPyBudWxsIDogYWJvcnQpXG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24gKGVuZCwgY2IpIHtcbiAgICBpZihlbmQpIG9uY2UoZW5kKVxuICAgIHJldHVybiByZWFkKGVuZCwgZnVuY3Rpb24gKGVuZCwgZGF0YSkge1xuICAgICAgaWYoIWVuZCkgb3AgJiYgb3AoZGF0YSlcbiAgICAgIGVsc2Ugb25jZShlbmQpXG4gICAgICBjYihlbmQsIGRhdGEpXG4gICAgfSlcbiAgfVxufVxuXG52YXIgdGFrZSA9IGV4cG9ydHMudGFrZSA9XG5mdW5jdGlvbiAocmVhZCwgdGVzdCkge1xuICB2YXIgZW5kZWQgPSBmYWxzZVxuICBpZignbnVtYmVyJyA9PT0gdHlwZW9mIHRlc3QpIHtcbiAgICB2YXIgbiA9IHRlc3Q7IHRlc3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbiAtLVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiAoZW5kLCBjYikge1xuICAgIGlmKGVuZGVkKSByZXR1cm4gY2IoZW5kZWQpXG4gICAgaWYoZW5kZWQgPSBlbmQpIHJldHVybiByZWFkKGVuZGVkLCBjYilcblxuICAgIHJlYWQobnVsbCwgZnVuY3Rpb24gKGVuZCwgZGF0YSkge1xuICAgICAgaWYoZW5kZWQgPSBlbmRlZCB8fCBlbmQpIHJldHVybiBjYihlbmRlZClcbiAgICAgIGlmKCF0ZXN0KGRhdGEpKSB7XG4gICAgICAgIGVuZGVkID0gdHJ1ZVxuICAgICAgICByZWFkKHRydWUsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgICAgICBjYihlbmRlZCwgZGF0YSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2VcbiAgICAgICAgY2IobnVsbCwgZGF0YSlcbiAgICB9KVxuICB9XG59XG5cbnZhciB1bmlxdWUgPSBleHBvcnRzLnVuaXF1ZSA9IGZ1bmN0aW9uIChyZWFkLCBmaWVsZCwgaW52ZXJ0KSB7XG4gIGZpZWxkID0gcHJvcChmaWVsZCkgfHwgaWRcbiAgdmFyIHNlZW4gPSB7fVxuICByZXR1cm4gZmlsdGVyKHJlYWQsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGtleSA9IGZpZWxkKGRhdGEpXG4gICAgaWYoc2VlbltrZXldKSByZXR1cm4gISFpbnZlcnQgLy9mYWxzZSwgYnkgZGVmYXVsdFxuICAgIGVsc2Ugc2VlbltrZXldID0gdHJ1ZVxuICAgIHJldHVybiAhaW52ZXJ0IC8vdHJ1ZSBieSBkZWZhdWx0XG4gIH0pXG59XG5cbnZhciBub25VbmlxdWUgPSBleHBvcnRzLm5vblVuaXF1ZSA9IGZ1bmN0aW9uIChyZWFkLCBmaWVsZCkge1xuICByZXR1cm4gdW5pcXVlKHJlYWQsIGZpZWxkLCB0cnVlKVxufVxuXG52YXIgZ3JvdXAgPSBleHBvcnRzLmdyb3VwID1cbmZ1bmN0aW9uIChyZWFkLCBzaXplKSB7XG4gIHZhciBlbmRlZDsgc2l6ZSA9IHNpemUgfHwgNVxuICB2YXIgcXVldWUgPSBbXVxuXG4gIHJldHVybiBmdW5jdGlvbiAoZW5kLCBjYikge1xuICAgIC8vdGhpcyBtZWFucyB0aGF0IHRoZSB1cHN0cmVhbSBpcyBzZW5kaW5nIGFuIGVycm9yLlxuICAgIGlmKGVuZCkgcmV0dXJuIHJlYWQoZW5kZWQgPSBlbmQsIGNiKVxuICAgIC8vdGhpcyBtZWFucyB0aGF0IHdlIHJlYWQgYW4gZW5kIGJlZm9yZS5cbiAgICBpZihlbmRlZCkgcmV0dXJuIGNiKGVuZGVkKVxuXG4gICAgcmVhZChudWxsLCBmdW5jdGlvbiBuZXh0KGVuZCwgZGF0YSkge1xuICAgICAgaWYoZW5kZWQgPSBlbmRlZCB8fCBlbmQpIHtcbiAgICAgICAgaWYoIXF1ZXVlLmxlbmd0aClcbiAgICAgICAgICByZXR1cm4gY2IoZW5kZWQpXG5cbiAgICAgICAgdmFyIF9xdWV1ZSA9IHF1ZXVlOyBxdWV1ZSA9IFtdXG4gICAgICAgIHJldHVybiBjYihudWxsLCBfcXVldWUpXG4gICAgICB9XG4gICAgICBxdWV1ZS5wdXNoKGRhdGEpXG4gICAgICBpZihxdWV1ZS5sZW5ndGggPCBzaXplKVxuICAgICAgICByZXR1cm4gcmVhZChudWxsLCBuZXh0KVxuXG4gICAgICB2YXIgX3F1ZXVlID0gcXVldWU7IHF1ZXVlID0gW11cbiAgICAgIGNiKG51bGwsIF9xdWV1ZSlcbiAgICB9KVxuICB9XG59XG5cbnZhciBmbGF0dGVuID0gZXhwb3J0cy5mbGF0dGVuID0gZnVuY3Rpb24gKHJlYWQpIHtcbiAgdmFyIF9yZWFkXG4gIHJldHVybiBmdW5jdGlvbiAoYWJvcnQsIGNiKSB7XG4gICAgaWYoX3JlYWQpIG5leHRDaHVuaygpXG4gICAgZWxzZSAgICAgIG5leHRTdHJlYW0oKVxuXG4gICAgZnVuY3Rpb24gbmV4dENodW5rICgpIHtcbiAgICAgIF9yZWFkKG51bGwsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgICAgaWYoZW5kKSBuZXh0U3RyZWFtKClcbiAgICAgICAgZWxzZSAgICBjYihudWxsLCBkYXRhKVxuICAgICAgfSlcbiAgICB9XG4gICAgZnVuY3Rpb24gbmV4dFN0cmVhbSAoKSB7XG4gICAgICByZWFkKG51bGwsIGZ1bmN0aW9uIChlbmQsIHN0cmVhbSkge1xuICAgICAgICBpZihlbmQpXG4gICAgICAgICAgcmV0dXJuIGNiKGVuZClcbiAgICAgICAgaWYoQXJyYXkuaXNBcnJheShzdHJlYW0pKVxuICAgICAgICAgIHN0cmVhbSA9IHNvdXJjZXMudmFsdWVzKHN0cmVhbSlcbiAgICAgICAgZWxzZSBpZignZnVuY3Rpb24nICE9IHR5cGVvZiBzdHJlYW0pXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdleHBlY3RlZCBzdHJlYW0gb2Ygc3RyZWFtcycpXG4gICAgICAgIFxuICAgICAgICBfcmVhZCA9IHN0cmVhbVxuICAgICAgICBuZXh0Q2h1bmsoKVxuICAgICAgfSlcbiAgICB9XG4gIH1cbn1cblxudmFyIHByZXBlbmQgPVxuZXhwb3J0cy5wcmVwZW5kID1cbmZ1bmN0aW9uIChyZWFkLCBoZWFkKSB7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChhYm9ydCwgY2IpIHtcbiAgICBpZihoZWFkICE9PSBudWxsKSB7XG4gICAgICBpZihhYm9ydClcbiAgICAgICAgcmV0dXJuIHJlYWQoYWJvcnQsIGNiKVxuICAgICAgdmFyIF9oZWFkID0gaGVhZFxuICAgICAgaGVhZCA9IG51bGxcbiAgICAgIGNiKG51bGwsIF9oZWFkKVxuICAgIH0gZWxzZSB7XG4gICAgICByZWFkKGFib3J0LCBjYilcbiAgICB9XG4gIH1cblxufVxuXG4vL3ZhciBkcmFpbklmID0gZXhwb3J0cy5kcmFpbklmID0gZnVuY3Rpb24gKG9wLCBkb25lKSB7XG4vLyAgc2lua3MuZHJhaW4oXG4vL31cblxudmFyIF9yZWR1Y2UgPSBleHBvcnRzLl9yZWR1Y2UgPSBmdW5jdGlvbiAocmVhZCwgcmVkdWNlLCBpbml0aWFsKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoY2xvc2UsIGNiKSB7XG4gICAgaWYoY2xvc2UpIHJldHVybiByZWFkKGNsb3NlLCBjYilcbiAgICBpZihlbmRlZCkgcmV0dXJuIGNiKGVuZGVkKVxuXG4gICAgc2lua3MuZHJhaW4oZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIGluaXRpYWwgPSByZWR1Y2UoaW5pdGlhbCwgaXRlbSlcbiAgICB9LCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG4gICAgICBlbmRlZCA9IGVyciB8fCB0cnVlXG4gICAgICBpZighZXJyKSBjYihudWxsLCBpbml0aWFsKVxuICAgICAgZWxzZSAgICAgY2IoZW5kZWQpXG4gICAgfSlcbiAgICAocmVhZClcbiAgfVxufVxuXG52YXIgbmV4dFRpY2sgPSBwcm9jZXNzLm5leHRUaWNrXG5cbnZhciBoaWdoV2F0ZXJNYXJrID0gZXhwb3J0cy5oaWdoV2F0ZXJNYXJrID0gXG5mdW5jdGlvbiAocmVhZCwgaGlnaFdhdGVyTWFyaykge1xuICB2YXIgYnVmZmVyID0gW10sIHdhaXRpbmcgPSBbXSwgZW5kZWQsIHJlYWRpbmcgPSBmYWxzZVxuICBoaWdoV2F0ZXJNYXJrID0gaGlnaFdhdGVyTWFyayB8fCAxMFxuXG4gIGZ1bmN0aW9uIHJlYWRBaGVhZCAoKSB7XG4gICAgd2hpbGUod2FpdGluZy5sZW5ndGggJiYgKGJ1ZmZlci5sZW5ndGggfHwgZW5kZWQpKVxuICAgICAgd2FpdGluZy5zaGlmdCgpKGVuZGVkLCBlbmRlZCA/IG51bGwgOiBidWZmZXIuc2hpZnQoKSlcbiAgfVxuXG4gIGZ1bmN0aW9uIG5leHQgKCkge1xuICAgIGlmKGVuZGVkIHx8IHJlYWRpbmcgfHwgYnVmZmVyLmxlbmd0aCA+PSBoaWdoV2F0ZXJNYXJrKVxuICAgICAgcmV0dXJuXG4gICAgcmVhZGluZyA9IHRydWVcbiAgICByZXR1cm4gcmVhZChlbmRlZCwgZnVuY3Rpb24gKGVuZCwgZGF0YSkge1xuICAgICAgcmVhZGluZyA9IGZhbHNlXG4gICAgICBlbmRlZCA9IGVuZGVkIHx8IGVuZFxuICAgICAgaWYoZGF0YSAhPSBudWxsKSBidWZmZXIucHVzaChkYXRhKVxuICAgICAgXG4gICAgICBuZXh0KCk7IHJlYWRBaGVhZCgpXG4gICAgfSlcbiAgfVxuXG4gIG5leHRUaWNrKG5leHQpXG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChlbmQsIGNiKSB7XG4gICAgZW5kZWQgPSBlbmRlZCB8fCBlbmRcbiAgICB3YWl0aW5nLnB1c2goY2IpXG5cbiAgICBuZXh0KCk7IHJlYWRBaGVhZCgpXG4gIH1cbn1cblxuXG5cbiIsInZhciBzb3VyY2VzICA9IHJlcXVpcmUoJy4vc291cmNlcycpXG52YXIgc2lua3MgICAgPSByZXF1aXJlKCcuL3NpbmtzJylcbnZhciB0aHJvdWdocyA9IHJlcXVpcmUoJy4vdGhyb3VnaHMnKVxudmFyIHUgICAgICAgID0gcmVxdWlyZSgncHVsbC1jb3JlJylcblxuZnVuY3Rpb24gaXNGdW5jdGlvbiAoZnVuKSB7XG4gIHJldHVybiAnZnVuY3Rpb24nID09PSB0eXBlb2YgZnVuXG59XG5cbmZ1bmN0aW9uIGlzUmVhZGVyIChmdW4pIHtcbiAgcmV0dXJuIGZ1biAmJiAoZnVuLnR5cGUgPT09IFwiVGhyb3VnaFwiIHx8IGZ1bi5sZW5ndGggPT09IDEpXG59XG52YXIgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcHVsbCAoKSB7XG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXG5cbiAgaWYoaXNSZWFkZXIoYXJnc1swXSkpXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChyZWFkKSB7XG4gICAgICBhcmdzLnVuc2hpZnQocmVhZClcbiAgICAgIHJldHVybiBwdWxsLmFwcGx5KG51bGwsIGFyZ3MpXG4gICAgfVxuXG4gIHZhciByZWFkID0gYXJncy5zaGlmdCgpXG5cbiAgLy9pZiB0aGUgZmlyc3QgZnVuY3Rpb24gaXMgYSBkdXBsZXggc3RyZWFtLFxuICAvL3BpcGUgZnJvbSB0aGUgc291cmNlLlxuICBpZihpc0Z1bmN0aW9uKHJlYWQuc291cmNlKSlcbiAgICByZWFkID0gcmVhZC5zb3VyY2VcblxuICBmdW5jdGlvbiBuZXh0ICgpIHtcbiAgICB2YXIgcyA9IGFyZ3Muc2hpZnQoKVxuXG4gICAgaWYobnVsbCA9PSBzKVxuICAgICAgcmV0dXJuIG5leHQoKVxuXG4gICAgaWYoaXNGdW5jdGlvbihzKSkgcmV0dXJuIHNcblxuICAgIHJldHVybiBmdW5jdGlvbiAocmVhZCkge1xuICAgICAgcy5zaW5rKHJlYWQpXG4gICAgICAvL3RoaXMgc3VwcG9ydHMgcGlwZWluZyB0aHJvdWdoIGEgZHVwbGV4IHN0cmVhbVxuICAgICAgLy9wdWxsKGEsIGIsIGEpIFwidGVsZXBob25lIHN0eWxlXCIuXG4gICAgICAvL2lmIHRoaXMgc3RyZWFtIGlzIGluIHRoZSBhIChmaXJzdCAmIGxhc3QgcG9zaXRpb24pXG4gICAgICAvL3Muc291cmNlIHdpbGwgaGF2ZSBhbHJlYWR5IGJlZW4gdXNlZCwgYnV0IHRoaXMgc2hvdWxkIG5ldmVyIGJlIGNhbGxlZFxuICAgICAgLy9zbyB0aGF0IGlzIG9rYXkuXG4gICAgICByZXR1cm4gcy5zb3VyY2VcbiAgICB9XG4gIH1cblxuICB3aGlsZShhcmdzLmxlbmd0aClcbiAgICByZWFkID0gbmV4dCgpIChyZWFkKVxuXG4gIHJldHVybiByZWFkXG59XG5cblxuZm9yKHZhciBrIGluIHNvdXJjZXMpXG4gIGV4cG9ydHNba10gPSB1LlNvdXJjZShzb3VyY2VzW2tdKVxuXG5mb3IodmFyIGsgaW4gdGhyb3VnaHMpXG4gIGV4cG9ydHNba10gPSB1LlRocm91Z2godGhyb3VnaHNba10pXG5cbmZvcih2YXIgayBpbiBzaW5rcylcbiAgZXhwb3J0c1trXSA9IHUuU2luayhzaW5rc1trXSlcblxudmFyIG1heWJlID0gcmVxdWlyZSgnLi9tYXliZScpKGV4cG9ydHMpXG5cbmZvcih2YXIgayBpbiBtYXliZSlcbiAgZXhwb3J0c1trXSA9IG1heWJlW2tdXG5cbmV4cG9ydHMuRHVwbGV4ICA9IFxuZXhwb3J0cy5UaHJvdWdoID0gZXhwb3J0cy5waXBlYWJsZSAgICAgICA9IHUuVGhyb3VnaFxuZXhwb3J0cy5Tb3VyY2UgID0gZXhwb3J0cy5waXBlYWJsZVNvdXJjZSA9IHUuU291cmNlXG5leHBvcnRzLlNpbmsgICAgPSBleHBvcnRzLnBpcGVhYmxlU2luayAgID0gdS5TaW5rXG5cblxuIiwidmFyIHUgPSByZXF1aXJlKCdwdWxsLWNvcmUnKVxudmFyIHByb3AgPSB1LnByb3BcbnZhciBpZCAgID0gdS5pZFxudmFyIG1heWJlU2luayA9IHUubWF5YmVTaW5rXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHB1bGwpIHtcblxuICB2YXIgZXhwb3J0cyA9IHt9XG4gIHZhciBkcmFpbiA9IHB1bGwuZHJhaW5cblxuICB2YXIgZmluZCA9XG4gIGV4cG9ydHMuZmluZCA9IGZ1bmN0aW9uICh0ZXN0LCBjYikge1xuICAgIHJldHVybiBtYXliZVNpbmsoZnVuY3Rpb24gKGNiKSB7XG4gICAgICB2YXIgZW5kZWQgPSBmYWxzZVxuICAgICAgaWYoIWNiKVxuICAgICAgICBjYiA9IHRlc3QsIHRlc3QgPSBpZFxuICAgICAgZWxzZVxuICAgICAgICB0ZXN0ID0gcHJvcCh0ZXN0KSB8fCBpZFxuXG4gICAgICByZXR1cm4gZHJhaW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgaWYodGVzdChkYXRhKSkge1xuICAgICAgICAgIGVuZGVkID0gdHJ1ZVxuICAgICAgICAgIGNiKG51bGwsIGRhdGEpXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIGlmKGVuZGVkKSByZXR1cm4gLy9hbHJlYWR5IGNhbGxlZCBiYWNrXG4gICAgICAgIGNiKGVyciA9PT0gdHJ1ZSA/IG51bGwgOiBlcnIsIG51bGwpXG4gICAgICB9KVxuXG4gICAgfSwgY2IpXG4gIH1cblxuICB2YXIgcmVkdWNlID0gZXhwb3J0cy5yZWR1Y2UgPVxuICBmdW5jdGlvbiAocmVkdWNlLCBhY2MsIGNiKSB7XG5cbiAgICByZXR1cm4gbWF5YmVTaW5rKGZ1bmN0aW9uIChjYikge1xuICAgICAgcmV0dXJuIGRyYWluKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGFjYyA9IHJlZHVjZShhY2MsIGRhdGEpXG4gICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgIGNiKGVyciwgYWNjKVxuICAgICAgfSlcblxuICAgIH0sIGNiKVxuICB9XG5cbiAgdmFyIGNvbGxlY3QgPSBleHBvcnRzLmNvbGxlY3QgPSBleHBvcnRzLndyaXRlQXJyYXkgPVxuICBmdW5jdGlvbiAoY2IpIHtcbiAgICByZXR1cm4gcmVkdWNlKGZ1bmN0aW9uIChhcnIsIGl0ZW0pIHtcbiAgICAgIGFyci5wdXNoKGl0ZW0pXG4gICAgICByZXR1cm4gYXJyXG4gICAgfSwgW10sIGNiKVxuICB9XG5cbiAgdmFyIGNvbmNhdCA9IGV4cG9ydHMuY29uY2F0ID1cbiAgZnVuY3Rpb24gKGNiKSB7XG4gICAgcmV0dXJuIHJlZHVjZShmdW5jdGlvbiAoYSwgYikge1xuICAgICAgcmV0dXJuIGEgKyBiXG4gICAgfSwgJycsIGNiKVxuICB9XG5cbiAgcmV0dXJuIGV4cG9ydHNcbn1cbiIsInZhciBkcmFpbiA9IGV4cG9ydHMuZHJhaW4gPSBmdW5jdGlvbiAocmVhZCwgb3AsIGRvbmUpIHtcblxuICA7KGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgdmFyIGxvb3AgPSB0cnVlLCBjYmVkID0gZmFsc2VcbiAgICB3aGlsZShsb29wKSB7XG4gICAgICBjYmVkID0gZmFsc2VcbiAgICAgIHJlYWQobnVsbCwgZnVuY3Rpb24gKGVuZCwgZGF0YSkge1xuICAgICAgICBjYmVkID0gdHJ1ZVxuICAgICAgICBpZihlbmQpIHtcbiAgICAgICAgICBsb29wID0gZmFsc2VcbiAgICAgICAgICBpZihkb25lKSBkb25lKGVuZCA9PT0gdHJ1ZSA/IG51bGwgOiBlbmQpXG4gICAgICAgICAgZWxzZSBpZihlbmQgJiYgZW5kICE9PSB0cnVlKVxuICAgICAgICAgICAgdGhyb3cgZW5kXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZihvcCAmJiBmYWxzZSA9PT0gb3AoZGF0YSkpIHtcbiAgICAgICAgICBsb29wID0gZmFsc2VcbiAgICAgICAgICByZWFkKHRydWUsIGRvbmUgfHwgZnVuY3Rpb24gKCkge30pXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZighbG9vcCl7XG4gICAgICAgICAgbmV4dCgpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICBpZighY2JlZCkge1xuICAgICAgICBsb29wID0gZmFsc2VcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgfVxuICB9KSgpXG59XG5cbnZhciBvbkVuZCA9IGV4cG9ydHMub25FbmQgPSBmdW5jdGlvbiAocmVhZCwgZG9uZSkge1xuICByZXR1cm4gZHJhaW4ocmVhZCwgbnVsbCwgZG9uZSlcbn1cblxudmFyIGxvZyA9IGV4cG9ydHMubG9nID0gZnVuY3Rpb24gKHJlYWQsIGRvbmUpIHtcbiAgcmV0dXJuIGRyYWluKHJlYWQsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgY29uc29sZS5sb2coZGF0YSlcbiAgfSwgZG9uZSlcbn1cblxuIiwiXG52YXIga2V5cyA9IGV4cG9ydHMua2V5cyA9XG5mdW5jdGlvbiAob2JqZWN0KSB7XG4gIHJldHVybiB2YWx1ZXMoT2JqZWN0LmtleXMob2JqZWN0KSlcbn1cblxudmFyIG9uY2UgPSBleHBvcnRzLm9uY2UgPVxuZnVuY3Rpb24gKHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoYWJvcnQsIGNiKSB7XG4gICAgaWYoYWJvcnQpIHJldHVybiBjYihhYm9ydClcbiAgICBpZih2YWx1ZSAhPSBudWxsKSB7XG4gICAgICB2YXIgX3ZhbHVlID0gdmFsdWU7IHZhbHVlID0gbnVsbFxuICAgICAgY2IobnVsbCwgX3ZhbHVlKVxuICAgIH0gZWxzZVxuICAgICAgY2IodHJ1ZSlcbiAgfVxufVxuXG52YXIgdmFsdWVzID0gZXhwb3J0cy52YWx1ZXMgPSBleHBvcnRzLnJlYWRBcnJheSA9XG5mdW5jdGlvbiAoYXJyYXkpIHtcbiAgaWYoIUFycmF5LmlzQXJyYXkoYXJyYXkpKVxuICAgIGFycmF5ID0gT2JqZWN0LmtleXMoYXJyYXkpLm1hcChmdW5jdGlvbiAoaykge1xuICAgICAgcmV0dXJuIGFycmF5W2tdXG4gICAgfSlcbiAgdmFyIGkgPSAwXG4gIHJldHVybiBmdW5jdGlvbiAoZW5kLCBjYikge1xuICAgIGlmKGVuZClcbiAgICAgIHJldHVybiBjYiAmJiBjYihlbmQpXG4gICAgY2IoaSA+PSBhcnJheS5sZW5ndGggfHwgbnVsbCwgYXJyYXlbaSsrXSlcbiAgfVxufVxuXG5cbnZhciBjb3VudCA9IGV4cG9ydHMuY291bnQgPVxuZnVuY3Rpb24gKG1heCkge1xuICB2YXIgaSA9IDA7IG1heCA9IG1heCB8fCBJbmZpbml0eVxuICByZXR1cm4gZnVuY3Rpb24gKGVuZCwgY2IpIHtcbiAgICBpZihlbmQpIHJldHVybiBjYiAmJiBjYihlbmQpXG4gICAgaWYoaSA+IG1heClcbiAgICAgIHJldHVybiBjYih0cnVlKVxuICAgIGNiKG51bGwsIGkrKylcbiAgfVxufVxuXG52YXIgaW5maW5pdGUgPSBleHBvcnRzLmluZmluaXRlID1cbmZ1bmN0aW9uIChnZW5lcmF0ZSkge1xuICBnZW5lcmF0ZSA9IGdlbmVyYXRlIHx8IE1hdGgucmFuZG9tXG4gIHJldHVybiBmdW5jdGlvbiAoZW5kLCBjYikge1xuICAgIGlmKGVuZCkgcmV0dXJuIGNiICYmIGNiKGVuZClcbiAgICByZXR1cm4gY2IobnVsbCwgZ2VuZXJhdGUoKSlcbiAgfVxufVxuXG52YXIgZGVmZXIgPSBleHBvcnRzLmRlZmVyID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX3JlYWQsIGNicyA9IFtdLCBfZW5kXG5cbiAgdmFyIHJlYWQgPSBmdW5jdGlvbiAoZW5kLCBjYikge1xuICAgIGlmKCFfcmVhZCkge1xuICAgICAgX2VuZCA9IGVuZFxuICAgICAgY2JzLnB1c2goY2IpXG4gICAgfSBcbiAgICBlbHNlIF9yZWFkKGVuZCwgY2IpXG4gIH1cbiAgcmVhZC5yZXNvbHZlID0gZnVuY3Rpb24gKHJlYWQpIHtcbiAgICBpZihfcmVhZCkgdGhyb3cgbmV3IEVycm9yKCdhbHJlYWR5IHJlc29sdmVkJylcbiAgICBfcmVhZCA9IHJlYWRcbiAgICBpZighX3JlYWQpIHRocm93IG5ldyBFcnJvcignbm8gcmVhZCBjYW5ub3QgcmVzb2x2ZSEnICsgX3JlYWQpXG4gICAgd2hpbGUoY2JzLmxlbmd0aClcbiAgICAgIF9yZWFkKF9lbmQsIGNicy5zaGlmdCgpKVxuICB9XG4gIHJlYWQuYWJvcnQgPSBmdW5jdGlvbihlcnIpIHtcbiAgICByZWFkLnJlc29sdmUoZnVuY3Rpb24gKF8sIGNiKSB7XG4gICAgICBjYihlcnIgfHwgdHJ1ZSlcbiAgICB9KVxuICB9XG4gIHJldHVybiByZWFkXG59XG5cbnZhciBlbXB0eSA9IGV4cG9ydHMuZW1wdHkgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoYWJvcnQsIGNiKSB7XG4gICAgY2IodHJ1ZSlcbiAgfVxufVxuXG52YXIgZXJyb3IgPSBleHBvcnRzLmVycm9yID0gZnVuY3Rpb24gKGVycikge1xuICByZXR1cm4gZnVuY3Rpb24gKGFib3J0LCBjYikge1xuICAgIGNiKGVycilcbiAgfVxufVxuXG52YXIgZGVwdGhGaXJzdCA9IGV4cG9ydHMuZGVwdGhGaXJzdCA9XG5mdW5jdGlvbiAoc3RhcnQsIGNyZWF0ZVN0cmVhbSkge1xuICB2YXIgcmVhZHMgPSBbXVxuXG4gIHJlYWRzLnVuc2hpZnQob25jZShzdGFydCkpXG5cbiAgcmV0dXJuIGZ1bmN0aW9uIG5leHQgKGVuZCwgY2IpIHtcbiAgICBpZighcmVhZHMubGVuZ3RoKVxuICAgICAgcmV0dXJuIGNiKHRydWUpXG4gICAgcmVhZHNbMF0oZW5kLCBmdW5jdGlvbiAoZW5kLCBkYXRhKSB7XG4gICAgICBpZihlbmQpIHtcbiAgICAgICAgLy9pZiB0aGlzIHN0cmVhbSBoYXMgZW5kZWQsIGdvIHRvIHRoZSBuZXh0IHF1ZXVlXG4gICAgICAgIHJlYWRzLnNoaWZ0KClcbiAgICAgICAgcmV0dXJuIG5leHQobnVsbCwgY2IpXG4gICAgICB9XG4gICAgICByZWFkcy51bnNoaWZ0KGNyZWF0ZVN0cmVhbShkYXRhKSlcbiAgICAgIGNiKGVuZCwgZGF0YSlcbiAgICB9KVxuICB9XG59XG4vL3dpZHRoIGZpcnN0IGlzIGp1c3QgbGlrZSBkZXB0aCBmaXJzdCxcbi8vYnV0IHB1c2ggZWFjaCBuZXcgc3RyZWFtIG9udG8gdGhlIGVuZCBvZiB0aGUgcXVldWVcbnZhciB3aWR0aEZpcnN0ID0gZXhwb3J0cy53aWR0aEZpcnN0ID1cbmZ1bmN0aW9uIChzdGFydCwgY3JlYXRlU3RyZWFtKSB7XG4gIHZhciByZWFkcyA9IFtdXG5cbiAgcmVhZHMucHVzaChvbmNlKHN0YXJ0KSlcblxuICByZXR1cm4gZnVuY3Rpb24gbmV4dCAoZW5kLCBjYikge1xuICAgIGlmKCFyZWFkcy5sZW5ndGgpXG4gICAgICByZXR1cm4gY2IodHJ1ZSlcbiAgICByZWFkc1swXShlbmQsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgIGlmKGVuZCkge1xuICAgICAgICByZWFkcy5zaGlmdCgpXG4gICAgICAgIHJldHVybiBuZXh0KG51bGwsIGNiKVxuICAgICAgfVxuICAgICAgcmVhZHMucHVzaChjcmVhdGVTdHJlYW0oZGF0YSkpXG4gICAgICBjYihlbmQsIGRhdGEpXG4gICAgfSlcbiAgfVxufVxuXG4vL3RoaXMgY2FtZSBvdXQgZGlmZmVyZW50IHRvIHRoZSBmaXJzdCAoc3RybSlcbi8vYXR0ZW1wdCBhdCBsZWFmRmlyc3QsIGJ1dCBpdCdzIHN0aWxsIGEgdmFsaWRcbi8vdG9wb2xvZ2ljYWwgc29ydC5cbnZhciBsZWFmRmlyc3QgPSBleHBvcnRzLmxlYWZGaXJzdCA9XG5mdW5jdGlvbiAoc3RhcnQsIGNyZWF0ZVN0cmVhbSkge1xuICB2YXIgcmVhZHMgPSBbXVxuICB2YXIgb3V0cHV0ID0gW11cbiAgcmVhZHMucHVzaChvbmNlKHN0YXJ0KSlcblxuICByZXR1cm4gZnVuY3Rpb24gbmV4dCAoZW5kLCBjYikge1xuICAgIHJlYWRzWzBdKGVuZCwgZnVuY3Rpb24gKGVuZCwgZGF0YSkge1xuICAgICAgaWYoZW5kKSB7XG4gICAgICAgIHJlYWRzLnNoaWZ0KClcbiAgICAgICAgaWYoIW91dHB1dC5sZW5ndGgpXG4gICAgICAgICAgcmV0dXJuIGNiKHRydWUpXG4gICAgICAgIHJldHVybiBjYihudWxsLCBvdXRwdXQuc2hpZnQoKSlcbiAgICAgIH1cbiAgICAgIHJlYWRzLnVuc2hpZnQoY3JlYXRlU3RyZWFtKGRhdGEpKVxuICAgICAgb3V0cHV0LnVuc2hpZnQoZGF0YSlcbiAgICAgIG5leHQobnVsbCwgY2IpXG4gICAgfSlcbiAgfVxufVxuXG4iLCJ2YXIgdSAgICAgID0gcmVxdWlyZSgncHVsbC1jb3JlJylcbnZhciBzb3VyY2VzID0gcmVxdWlyZSgnLi9zb3VyY2VzJylcbnZhciBzaW5rcyA9IHJlcXVpcmUoJy4vc2lua3MnKVxuXG52YXIgcHJvcCAgID0gdS5wcm9wXG52YXIgaWQgICAgID0gdS5pZFxudmFyIHRlc3RlciA9IHUudGVzdGVyXG5cbnZhciBtYXAgPSBleHBvcnRzLm1hcCA9XG5mdW5jdGlvbiAocmVhZCwgbWFwKSB7XG4gIG1hcCA9IHByb3AobWFwKSB8fCBpZFxuICByZXR1cm4gZnVuY3Rpb24gKGFib3J0LCBjYikge1xuICAgIHJlYWQoYWJvcnQsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgIHRyeSB7XG4gICAgICBkYXRhID0gIWVuZCA/IG1hcChkYXRhKSA6IG51bGxcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZXR1cm4gcmVhZChlcnIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gY2IoZXJyKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgY2IoZW5kLCBkYXRhKVxuICAgIH0pXG4gIH1cbn1cblxudmFyIGFzeW5jTWFwID0gZXhwb3J0cy5hc3luY01hcCA9XG5mdW5jdGlvbiAocmVhZCwgbWFwKSB7XG4gIGlmKCFtYXApIHJldHVybiByZWFkXG4gIHJldHVybiBmdW5jdGlvbiAoZW5kLCBjYikge1xuICAgIGlmKGVuZCkgcmV0dXJuIHJlYWQoZW5kLCBjYikgLy9hYm9ydFxuICAgIHJlYWQobnVsbCwgZnVuY3Rpb24gKGVuZCwgZGF0YSkge1xuICAgICAgaWYoZW5kKSByZXR1cm4gY2IoZW5kLCBkYXRhKVxuICAgICAgbWFwKGRhdGEsIGNiKVxuICAgIH0pXG4gIH1cbn1cblxudmFyIHBhcmFNYXAgPSBleHBvcnRzLnBhcmFNYXAgPVxuZnVuY3Rpb24gKHJlYWQsIG1hcCwgd2lkdGgpIHtcbiAgaWYoIW1hcCkgcmV0dXJuIHJlYWRcbiAgdmFyIGVuZGVkID0gZmFsc2UsIHF1ZXVlID0gW10sIF9jYlxuXG4gIGZ1bmN0aW9uIGRyYWluICgpIHtcbiAgICBpZighX2NiKSByZXR1cm5cbiAgICB2YXIgY2IgPSBfY2JcbiAgICBfY2IgPSBudWxsXG4gICAgaWYocXVldWUubGVuZ3RoKVxuICAgICAgcmV0dXJuIGNiKG51bGwsIHF1ZXVlLnNoaWZ0KCkpXG4gICAgZWxzZSBpZihlbmRlZCAmJiAhbilcbiAgICAgIHJldHVybiBjYihlbmRlZClcbiAgICBfY2IgPSBjYlxuICB9XG5cbiAgZnVuY3Rpb24gcHVsbCAoKSB7XG4gICAgcmVhZChudWxsLCBmdW5jdGlvbiAoZW5kLCBkYXRhKSB7XG4gICAgICBpZihlbmQpIHtcbiAgICAgICAgZW5kZWQgPSBlbmRcbiAgICAgICAgcmV0dXJuIGRyYWluKClcbiAgICAgIH1cbiAgICAgIG4rK1xuICAgICAgbWFwKGRhdGEsIGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcbiAgICAgICAgbi0tXG5cbiAgICAgICAgcXVldWUucHVzaChkYXRhKVxuICAgICAgICBkcmFpbigpXG4gICAgICB9KVxuXG4gICAgICBpZihuIDwgd2lkdGggJiYgIWVuZGVkKVxuICAgICAgICBwdWxsKClcbiAgICB9KVxuICB9XG5cbiAgdmFyIG4gPSAwXG4gIHJldHVybiBmdW5jdGlvbiAoZW5kLCBjYikge1xuICAgIGlmKGVuZCkgcmV0dXJuIHJlYWQoZW5kLCBjYikgLy9hYm9ydFxuICAgIC8vY29udGludWUgdG8gcmVhZCB3aGlsZSB0aGVyZSBhcmUgbGVzcyB0aGFuIDMgbWFwcyBpbiBmbGlnaHRcbiAgICBfY2IgPSBjYlxuICAgIGlmKHF1ZXVlLmxlbmd0aCB8fCBlbmRlZClcbiAgICAgIHB1bGwoKSwgZHJhaW4oKVxuICAgIGVsc2UgcHVsbCgpXG4gIH1cbiAgcmV0dXJuIGhpZ2hXYXRlck1hcmsoYXN5bmNNYXAocmVhZCwgbWFwKSwgd2lkdGgpXG59XG5cbnZhciBmaWx0ZXIgPSBleHBvcnRzLmZpbHRlciA9XG5mdW5jdGlvbiAocmVhZCwgdGVzdCkge1xuICAvL3JlZ2V4cFxuICB0ZXN0ID0gdGVzdGVyKHRlc3QpXG4gIHJldHVybiBmdW5jdGlvbiBuZXh0IChlbmQsIGNiKSB7XG4gICAgdmFyIHN5bmMsIGxvb3AgPSB0cnVlXG4gICAgd2hpbGUobG9vcCkge1xuICAgICAgbG9vcCA9IGZhbHNlXG4gICAgICBzeW5jID0gdHJ1ZVxuICAgICAgcmVhZChlbmQsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgICAgaWYoIWVuZCAmJiAhdGVzdChkYXRhKSlcbiAgICAgICAgICByZXR1cm4gc3luYyA/IGxvb3AgPSB0cnVlIDogbmV4dChlbmQsIGNiKVxuICAgICAgICBjYihlbmQsIGRhdGEpXG4gICAgICB9KVxuICAgICAgc3luYyA9IGZhbHNlXG4gICAgfVxuICB9XG59XG5cbnZhciBmaWx0ZXJOb3QgPSBleHBvcnRzLmZpbHRlck5vdCA9XG5mdW5jdGlvbiAocmVhZCwgdGVzdCkge1xuICB0ZXN0ID0gdGVzdGVyKHRlc3QpXG4gIHJldHVybiBmaWx0ZXIocmVhZCwgZnVuY3Rpb24gKGUpIHtcbiAgICByZXR1cm4gIXRlc3QoZSlcbiAgfSlcbn1cblxudmFyIHRocm91Z2ggPSBleHBvcnRzLnRocm91Z2ggPVxuZnVuY3Rpb24gKHJlYWQsIG9wLCBvbkVuZCkge1xuICB2YXIgYSA9IGZhbHNlXG4gIGZ1bmN0aW9uIG9uY2UgKGFib3J0KSB7XG4gICAgaWYoYSB8fCAhb25FbmQpIHJldHVyblxuICAgIGEgPSB0cnVlXG4gICAgb25FbmQoYWJvcnQgPT09IHRydWUgPyBudWxsIDogYWJvcnQpXG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24gKGVuZCwgY2IpIHtcbiAgICBpZihlbmQpIG9uY2UoZW5kKVxuICAgIHJldHVybiByZWFkKGVuZCwgZnVuY3Rpb24gKGVuZCwgZGF0YSkge1xuICAgICAgaWYoIWVuZCkgb3AgJiYgb3AoZGF0YSlcbiAgICAgIGVsc2Ugb25jZShlbmQpXG4gICAgICBjYihlbmQsIGRhdGEpXG4gICAgfSlcbiAgfVxufVxuXG52YXIgdGFrZSA9IGV4cG9ydHMudGFrZSA9XG5mdW5jdGlvbiAocmVhZCwgdGVzdCkge1xuICB2YXIgZW5kZWQgPSBmYWxzZVxuICBpZignbnVtYmVyJyA9PT0gdHlwZW9mIHRlc3QpIHtcbiAgICB2YXIgbiA9IHRlc3Q7IHRlc3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbiAtLVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiAoZW5kLCBjYikge1xuICAgIGlmKGVuZGVkKSByZXR1cm4gY2IoZW5kZWQpXG4gICAgaWYoZW5kZWQgPSBlbmQpIHJldHVybiByZWFkKGVuZGVkLCBjYilcblxuICAgIHJlYWQobnVsbCwgZnVuY3Rpb24gKGVuZCwgZGF0YSkge1xuICAgICAgaWYoZW5kZWQgPSBlbmRlZCB8fCBlbmQpIHJldHVybiBjYihlbmRlZClcbiAgICAgIGlmKCF0ZXN0KGRhdGEpKSB7XG4gICAgICAgIGVuZGVkID0gdHJ1ZVxuICAgICAgICByZWFkKHRydWUsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgICAgICBjYihlbmRlZCwgZGF0YSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGVsc2VcbiAgICAgICAgY2IobnVsbCwgZGF0YSlcbiAgICB9KVxuICB9XG59XG5cbnZhciB1bmlxdWUgPSBleHBvcnRzLnVuaXF1ZSA9IGZ1bmN0aW9uIChyZWFkLCBmaWVsZCwgaW52ZXJ0KSB7XG4gIGZpZWxkID0gcHJvcChmaWVsZCkgfHwgaWRcbiAgdmFyIHNlZW4gPSB7fVxuICByZXR1cm4gZmlsdGVyKHJlYWQsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGtleSA9IGZpZWxkKGRhdGEpXG4gICAgaWYoc2VlbltrZXldKSByZXR1cm4gISFpbnZlcnQgLy9mYWxzZSwgYnkgZGVmYXVsdFxuICAgIGVsc2Ugc2VlbltrZXldID0gdHJ1ZVxuICAgIHJldHVybiAhaW52ZXJ0IC8vdHJ1ZSBieSBkZWZhdWx0XG4gIH0pXG59XG5cbnZhciBub25VbmlxdWUgPSBleHBvcnRzLm5vblVuaXF1ZSA9IGZ1bmN0aW9uIChyZWFkLCBmaWVsZCkge1xuICByZXR1cm4gdW5pcXVlKHJlYWQsIGZpZWxkLCB0cnVlKVxufVxuXG52YXIgZ3JvdXAgPSBleHBvcnRzLmdyb3VwID1cbmZ1bmN0aW9uIChyZWFkLCBzaXplKSB7XG4gIHZhciBlbmRlZDsgc2l6ZSA9IHNpemUgfHwgNVxuICB2YXIgcXVldWUgPSBbXVxuXG4gIHJldHVybiBmdW5jdGlvbiAoZW5kLCBjYikge1xuICAgIC8vdGhpcyBtZWFucyB0aGF0IHRoZSB1cHN0cmVhbSBpcyBzZW5kaW5nIGFuIGVycm9yLlxuICAgIGlmKGVuZCkgcmV0dXJuIHJlYWQoZW5kZWQgPSBlbmQsIGNiKVxuICAgIC8vdGhpcyBtZWFucyB0aGF0IHdlIHJlYWQgYW4gZW5kIGJlZm9yZS5cbiAgICBpZihlbmRlZCkgcmV0dXJuIGNiKGVuZGVkKVxuXG4gICAgcmVhZChudWxsLCBmdW5jdGlvbiBuZXh0KGVuZCwgZGF0YSkge1xuICAgICAgaWYoZW5kZWQgPSBlbmRlZCB8fCBlbmQpIHtcbiAgICAgICAgaWYoIXF1ZXVlLmxlbmd0aClcbiAgICAgICAgICByZXR1cm4gY2IoZW5kZWQpXG5cbiAgICAgICAgdmFyIF9xdWV1ZSA9IHF1ZXVlOyBxdWV1ZSA9IFtdXG4gICAgICAgIHJldHVybiBjYihudWxsLCBfcXVldWUpXG4gICAgICB9XG4gICAgICBxdWV1ZS5wdXNoKGRhdGEpXG4gICAgICBpZihxdWV1ZS5sZW5ndGggPCBzaXplKVxuICAgICAgICByZXR1cm4gcmVhZChudWxsLCBuZXh0KVxuXG4gICAgICB2YXIgX3F1ZXVlID0gcXVldWU7IHF1ZXVlID0gW11cbiAgICAgIGNiKG51bGwsIF9xdWV1ZSlcbiAgICB9KVxuICB9XG59XG5cbnZhciBmbGF0dGVuID0gZXhwb3J0cy5mbGF0dGVuID0gZnVuY3Rpb24gKHJlYWQpIHtcbiAgdmFyIF9yZWFkXG4gIHJldHVybiBmdW5jdGlvbiAoYWJvcnQsIGNiKSB7XG4gICAgaWYoX3JlYWQpIG5leHRDaHVuaygpXG4gICAgZWxzZSAgICAgIG5leHRTdHJlYW0oKVxuXG4gICAgZnVuY3Rpb24gbmV4dENodW5rICgpIHtcbiAgICAgIF9yZWFkKG51bGwsIGZ1bmN0aW9uIChlbmQsIGRhdGEpIHtcbiAgICAgICAgaWYoZW5kKSBuZXh0U3RyZWFtKClcbiAgICAgICAgZWxzZSAgICBjYihudWxsLCBkYXRhKVxuICAgICAgfSlcbiAgICB9XG4gICAgZnVuY3Rpb24gbmV4dFN0cmVhbSAoKSB7XG4gICAgICByZWFkKG51bGwsIGZ1bmN0aW9uIChlbmQsIHN0cmVhbSkge1xuICAgICAgICBpZihlbmQpXG4gICAgICAgICAgcmV0dXJuIGNiKGVuZClcbiAgICAgICAgaWYoQXJyYXkuaXNBcnJheShzdHJlYW0pIHx8IHN0cmVhbSAmJiAnb2JqZWN0JyA9PT0gdHlwZW9mIHN0cmVhbSlcbiAgICAgICAgICBzdHJlYW0gPSBzb3VyY2VzLnZhbHVlcyhzdHJlYW0pXG4gICAgICAgIGVsc2UgaWYoJ2Z1bmN0aW9uJyAhPSB0eXBlb2Ygc3RyZWFtKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignZXhwZWN0ZWQgc3RyZWFtIG9mIHN0cmVhbXMnKVxuICAgICAgICBfcmVhZCA9IHN0cmVhbVxuICAgICAgICBuZXh0Q2h1bmsoKVxuICAgICAgfSlcbiAgICB9XG4gIH1cbn1cblxudmFyIHByZXBlbmQgPVxuZXhwb3J0cy5wcmVwZW5kID1cbmZ1bmN0aW9uIChyZWFkLCBoZWFkKSB7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChhYm9ydCwgY2IpIHtcbiAgICBpZihoZWFkICE9PSBudWxsKSB7XG4gICAgICBpZihhYm9ydClcbiAgICAgICAgcmV0dXJuIHJlYWQoYWJvcnQsIGNiKVxuICAgICAgdmFyIF9oZWFkID0gaGVhZFxuICAgICAgaGVhZCA9IG51bGxcbiAgICAgIGNiKG51bGwsIF9oZWFkKVxuICAgIH0gZWxzZSB7XG4gICAgICByZWFkKGFib3J0LCBjYilcbiAgICB9XG4gIH1cblxufVxuXG4vL3ZhciBkcmFpbklmID0gZXhwb3J0cy5kcmFpbklmID0gZnVuY3Rpb24gKG9wLCBkb25lKSB7XG4vLyAgc2lua3MuZHJhaW4oXG4vL31cblxudmFyIF9yZWR1Y2UgPSBleHBvcnRzLl9yZWR1Y2UgPSBmdW5jdGlvbiAocmVhZCwgcmVkdWNlLCBpbml0aWFsKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoY2xvc2UsIGNiKSB7XG4gICAgaWYoY2xvc2UpIHJldHVybiByZWFkKGNsb3NlLCBjYilcbiAgICBpZihlbmRlZCkgcmV0dXJuIGNiKGVuZGVkKVxuXG4gICAgc2lua3MuZHJhaW4oZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIGluaXRpYWwgPSByZWR1Y2UoaW5pdGlhbCwgaXRlbSlcbiAgICB9LCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG4gICAgICBlbmRlZCA9IGVyciB8fCB0cnVlXG4gICAgICBpZighZXJyKSBjYihudWxsLCBpbml0aWFsKVxuICAgICAgZWxzZSAgICAgY2IoZW5kZWQpXG4gICAgfSlcbiAgICAocmVhZClcbiAgfVxufVxuXG52YXIgbmV4dFRpY2sgPSBwcm9jZXNzLm5leHRUaWNrXG5cbnZhciBoaWdoV2F0ZXJNYXJrID0gZXhwb3J0cy5oaWdoV2F0ZXJNYXJrID1cbmZ1bmN0aW9uIChyZWFkLCBoaWdoV2F0ZXJNYXJrKSB7XG4gIHZhciBidWZmZXIgPSBbXSwgd2FpdGluZyA9IFtdLCBlbmRlZCwgZW5kaW5nLCByZWFkaW5nID0gZmFsc2VcbiAgaGlnaFdhdGVyTWFyayA9IGhpZ2hXYXRlck1hcmsgfHwgMTBcblxuICBmdW5jdGlvbiByZWFkQWhlYWQgKCkge1xuICAgIHdoaWxlKHdhaXRpbmcubGVuZ3RoICYmIChidWZmZXIubGVuZ3RoIHx8IGVuZGVkKSlcbiAgICAgIHdhaXRpbmcuc2hpZnQoKShlbmRlZCwgZW5kZWQgPyBudWxsIDogYnVmZmVyLnNoaWZ0KCkpXG5cbiAgICBpZiAoIWJ1ZmZlci5sZW5ndGggJiYgZW5kaW5nKSBlbmRlZCA9IGVuZGluZztcbiAgfVxuXG4gIGZ1bmN0aW9uIG5leHQgKCkge1xuICAgIGlmKGVuZGVkIHx8IGVuZGluZyB8fCByZWFkaW5nIHx8IGJ1ZmZlci5sZW5ndGggPj0gaGlnaFdhdGVyTWFyaylcbiAgICAgIHJldHVyblxuICAgIHJlYWRpbmcgPSB0cnVlXG4gICAgcmV0dXJuIHJlYWQoZW5kZWQgfHwgZW5kaW5nLCBmdW5jdGlvbiAoZW5kLCBkYXRhKSB7XG4gICAgICByZWFkaW5nID0gZmFsc2VcbiAgICAgIGVuZGluZyA9IGVuZGluZyB8fCBlbmRcbiAgICAgIGlmKGRhdGEgIT0gbnVsbCkgYnVmZmVyLnB1c2goZGF0YSlcblxuICAgICAgbmV4dCgpOyByZWFkQWhlYWQoKVxuICAgIH0pXG4gIH1cblxuICBwcm9jZXNzLm5leHRUaWNrKG5leHQpXG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChlbmQsIGNiKSB7XG4gICAgZW5kZWQgPSBlbmRlZCB8fCBlbmRcbiAgICB3YWl0aW5nLnB1c2goY2IpXG5cbiAgICBuZXh0KCk7IHJlYWRBaGVhZCgpXG4gIH1cbn1cblxudmFyIGZsYXRNYXAgPSBleHBvcnRzLmZsYXRNYXAgPVxuZnVuY3Rpb24gKHJlYWQsIG1hcHBlcikge1xuICBtYXBwZXIgPSBtYXBwZXIgfHwgaWRcbiAgdmFyIHF1ZXVlID0gW10sIGVuZGVkXG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChhYm9ydCwgY2IpIHtcbiAgICBpZihxdWV1ZS5sZW5ndGgpIHJldHVybiBjYihudWxsLCBxdWV1ZS5zaGlmdCgpKVxuICAgIGVsc2UgaWYoZW5kZWQpICAgcmV0dXJuIGNiKGVuZGVkKVxuXG4gICAgcmVhZChhYm9ydCwgZnVuY3Rpb24gbmV4dCAoZW5kLCBkYXRhKSB7XG4gICAgICBpZihlbmQpIGVuZGVkID0gZW5kXG4gICAgICBlbHNlIHtcbiAgICAgICAgdmFyIGFkZCA9IG1hcHBlcihkYXRhKVxuICAgICAgICB3aGlsZShhZGQgJiYgYWRkLmxlbmd0aClcbiAgICAgICAgICBxdWV1ZS5wdXNoKGFkZC5zaGlmdCgpKVxuICAgICAgfVxuXG4gICAgICBpZihxdWV1ZS5sZW5ndGgpIGNiKG51bGwsIHF1ZXVlLnNoaWZ0KCkpXG4gICAgICBlbHNlIGlmKGVuZGVkKSAgIGNiKGVuZGVkKVxuICAgICAgZWxzZSAgICAgICAgICAgICByZWFkKG51bGwsIG5leHQpXG4gICAgfSlcbiAgfVxufVxuXG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIganNvbnBhcnNlID0gcmVxdWlyZSgnY29nL2pzb25wYXJzZScpO1xuXG4vKipcbiAgIyMjIHNpZ25hbGxlciBwcm9jZXNzIGhhbmRsaW5nXG5cbiAgV2hlbiBhIHNpZ25hbGxlcidzIHVuZGVybGluZyBtZXNzZW5nZXIgZW1pdHMgYSBgZGF0YWAgZXZlbnQgdGhpcyBpc1xuICBkZWxlZ2F0ZWQgdG8gYSBzaW1wbGUgbWVzc2FnZSBwYXJzZXIsIHdoaWNoIGFwcGxpZXMgdGhlIGZvbGxvd2luZyBzaW1wbGVcbiAgbG9naWM6XG5cbiAgLSBJcyB0aGUgbWVzc2FnZSBhIGAvdG9gIG1lc3NhZ2UuIElmIHNvLCBzZWUgaWYgdGhlIG1lc3NhZ2UgaXMgZm9yIHRoaXNcbiAgICBzaWduYWxsZXIgKGNoZWNraW5nIHRoZSB0YXJnZXQgaWQgLSAybmQgYXJnKS4gIElmIHNvIHBhc3MgdGhlXG4gICAgcmVtYWluZGVyIG9mIHRoZSBtZXNzYWdlIG9udG8gdGhlIHN0YW5kYXJkIHByb2Nlc3NpbmcgY2hhaW4uICBJZiBub3QsXG4gICAgZGlzY2FyZCB0aGUgbWVzc2FnZS5cblxuICAtIElzIHRoZSBtZXNzYWdlIGEgY29tbWFuZCBtZXNzYWdlIChwcmVmaXhlZCB3aXRoIGEgZm9yd2FyZCBzbGFzaCkuIElmIHNvLFxuICAgIGxvb2sgZm9yIGFuIGFwcHJvcHJpYXRlIG1lc3NhZ2UgaGFuZGxlciBhbmQgcGFzcyB0aGUgbWVzc2FnZSBwYXlsb2FkIG9uXG4gICAgdG8gaXQuXG5cbiAgLSBGaW5hbGx5LCBkb2VzIHRoZSBtZXNzYWdlIG1hdGNoIGFueSBwYXR0ZXJucyB0aGF0IHdlIGFyZSBsaXN0ZW5pbmcgZm9yP1xuICAgIElmIHNvLCB0aGVuIHBhc3MgdGhlIGVudGlyZSBtZXNzYWdlIGNvbnRlbnRzIG9udG8gdGhlIHJlZ2lzdGVyZWQgaGFuZGxlci5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzaWduYWxsZXIsIG9wdHMpIHtcbiAgdmFyIGhhbmRsZXJzID0gcmVxdWlyZSgnLi9oYW5kbGVycycpKHNpZ25hbGxlciwgb3B0cyk7XG5cbiAgZnVuY3Rpb24gc2VuZEV2ZW50KHBhcnRzLCBzcmNTdGF0ZSwgZGF0YSkge1xuICAgIC8vIGluaXRpYWxpc2UgdGhlIGV2ZW50IG5hbWVcbiAgICB2YXIgZXZ0TmFtZSA9ICdtZXNzYWdlOicgKyBwYXJ0c1swXS5zbGljZSgxKTtcblxuICAgIC8vIGNvbnZlcnQgYW55IHZhbGlkIGpzb24gb2JqZWN0cyB0byBqc29uXG4gICAgdmFyIGFyZ3MgPSBwYXJ0cy5zbGljZSgyKS5tYXAoanNvbnBhcnNlKTtcblxuICAgIHNpZ25hbGxlci5hcHBseShcbiAgICAgIHNpZ25hbGxlcixcbiAgICAgIFtldnROYW1lXS5jb25jYXQoYXJncykuY29uY2F0KFtzcmNTdGF0ZSwgZGF0YV0pXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihvcmlnaW5hbERhdGEpIHtcbiAgICB2YXIgZGF0YSA9IG9yaWdpbmFsRGF0YTtcbiAgICB2YXIgaXNNYXRjaCA9IHRydWU7XG4gICAgdmFyIHBhcnRzO1xuICAgIHZhciBoYW5kbGVyO1xuICAgIHZhciBzcmNEYXRhO1xuICAgIHZhciBzcmNTdGF0ZTtcbiAgICB2YXIgaXNEaXJlY3RNZXNzYWdlID0gZmFsc2U7XG5cbiAgICAvLyBkaXNjYXJkIHByaW11cyBtZXNzYWdlc1xuICAgIGlmIChkYXRhICYmIGRhdGEuc2xpY2UoMCwgNikgPT09ICdwcmltdXMnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gZm9yY2UgdGhlIGlkIGludG8gc3RyaW5nIGZvcm1hdCBzbyB3ZSBjYW4gcnVuIGxlbmd0aCBhbmQgY29tcGFyaXNvbiB0ZXN0cyBvbiBpdFxuICAgIHZhciBpZCA9IHNpZ25hbGxlci5pZCArICcnO1xuXG4gICAgLy8gcHJvY2VzcyAvdG8gbWVzc2FnZXNcbiAgICBpZiAoZGF0YS5zbGljZSgwLCAzKSA9PT0gJy90bycpIHtcbiAgICAgIGlzTWF0Y2ggPSBkYXRhLnNsaWNlKDQsIGlkLmxlbmd0aCArIDQpID09PSBpZDtcbiAgICAgIGlmIChpc01hdGNoKSB7XG4gICAgICAgIHBhcnRzID0gZGF0YS5zbGljZSg1ICsgaWQubGVuZ3RoKS5zcGxpdCgnfCcpLm1hcChqc29ucGFyc2UpO1xuXG4gICAgICAgIC8vIGdldCB0aGUgc291cmNlIGRhdGFcbiAgICAgICAgaXNEaXJlY3RNZXNzYWdlID0gdHJ1ZTtcblxuICAgICAgICAvLyBleHRyYWN0IHRoZSB2ZWN0b3IgY2xvY2sgYW5kIHVwZGF0ZSB0aGUgcGFydHNcbiAgICAgICAgcGFydHMgPSBwYXJ0cy5tYXAoanNvbnBhcnNlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBpZiB0aGlzIGlzIG5vdCBhIG1hdGNoLCB0aGVuIGJhaWxcbiAgICBpZiAoISBpc01hdGNoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gY2hvcCB0aGUgZGF0YSBpbnRvIHBhcnRzXG4gICAgc2lnbmFsbGVyKCdyYXdkYXRhJywgZGF0YSk7XG4gICAgcGFydHMgPSBwYXJ0cyB8fCBkYXRhLnNwbGl0KCd8JykubWFwKGpzb25wYXJzZSk7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGEgc3BlY2lmaWMgaGFuZGxlciBmb3IgdGhlIGFjdGlvbiwgdGhlbiBpbnZva2VcbiAgICBpZiAodHlwZW9mIHBhcnRzWzBdID09ICdzdHJpbmcnKSB7XG4gICAgICAvLyBleHRyYWN0IHRoZSBtZXRhZGF0YSBmcm9tIHRoZSBpbnB1dCBkYXRhXG4gICAgICBzcmNEYXRhID0gcGFydHNbMV07XG5cbiAgICAgIC8vIGlmIHdlIGdvdCBkYXRhIGZyb20gb3Vyc2VsZiwgdGhlbiB0aGlzIGlzIHByZXR0eSBkdW1iXG4gICAgICAvLyBidXQgaWYgd2UgaGF2ZSB0aGVuIHRocm93IGl0IGF3YXlcbiAgICAgIGlmIChzcmNEYXRhICYmIHNyY0RhdGEuaWQgPT09IHNpZ25hbGxlci5pZCkge1xuICAgICAgICByZXR1cm4gY29uc29sZS53YXJuKCdnb3QgZGF0YSBmcm9tIG91cnNlbGYsIGRpc2NhcmRpbmcnKTtcbiAgICAgIH1cblxuICAgICAgLy8gZ2V0IHRoZSBzb3VyY2Ugc3RhdGVcbiAgICAgIHNyY1N0YXRlID0gc2lnbmFsbGVyLnBlZXJzLmdldChzcmNEYXRhICYmIHNyY0RhdGEuaWQpIHx8IHNyY0RhdGE7XG5cbiAgICAgIC8vIGhhbmRsZSBjb21tYW5kc1xuICAgICAgaWYgKHBhcnRzWzBdLmNoYXJBdCgwKSA9PT0gJy8nKSB7XG4gICAgICAgIC8vIGxvb2sgZm9yIGEgaGFuZGxlciBmb3IgdGhlIG1lc3NhZ2UgdHlwZVxuICAgICAgICBoYW5kbGVyID0gaGFuZGxlcnNbcGFydHNbMF0uc2xpY2UoMSldO1xuXG4gICAgICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgaGFuZGxlcihcbiAgICAgICAgICAgIHBhcnRzLnNsaWNlKDIpLFxuICAgICAgICAgICAgcGFydHNbMF0uc2xpY2UoMSksXG4gICAgICAgICAgICBzcmNEYXRhLFxuICAgICAgICAgICAgc3JjU3RhdGUsXG4gICAgICAgICAgICBpc0RpcmVjdE1lc3NhZ2VcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHNlbmRFdmVudChwYXJ0cywgc3JjU3RhdGUsIG9yaWdpbmFsRGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIG90aGVyd2lzZSwgZW1pdCBkYXRhXG4gICAgICBlbHNlIHtcbiAgICAgICAgc2lnbmFsbGVyKFxuICAgICAgICAgICdkYXRhJyxcbiAgICAgICAgICBwYXJ0cy5zbGljZSgwLCAxKS5jb25jYXQocGFydHMuc2xpY2UoMikpLFxuICAgICAgICAgIHNyY0RhdGEsXG4gICAgICAgICAgc3JjU3RhdGUsXG4gICAgICAgICAgaXNEaXJlY3RNZXNzYWdlXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICB9O1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKSgncnRjL2NsZWFudXAnKTtcblxudmFyIENBTk5PVF9DTE9TRV9TVEFURVMgPSBbXG4gICdjbG9zZWQnXG5dO1xuXG52YXIgRVZFTlRTX0RFQ09VUExFX0JDID0gW1xuICAnYWRkc3RyZWFtJyxcbiAgJ2RhdGFjaGFubmVsJyxcbiAgJ2ljZWNhbmRpZGF0ZScsXG4gICduZWdvdGlhdGlvbm5lZWRlZCcsXG4gICdyZW1vdmVzdHJlYW0nLFxuICAnc2lnbmFsaW5nc3RhdGVjaGFuZ2UnXG5dO1xuXG52YXIgRVZFTlRTX0RFQ09VUExFX0FDID0gW1xuICAnaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlJ1xuXTtcblxuLyoqXG4gICMjIyBydGMtdG9vbHMvY2xlYW51cFxuXG4gIGBgYFxuICBjbGVhbnVwKHBjKVxuICBgYGBcblxuICBUaGUgYGNsZWFudXBgIGZ1bmN0aW9uIGlzIHVzZWQgdG8gZW5zdXJlIHRoYXQgYSBwZWVyIGNvbm5lY3Rpb24gaXMgcHJvcGVybHlcbiAgY2xvc2VkIGFuZCByZWFkeSB0byBiZSBjbGVhbmVkIHVwIGJ5IHRoZSBicm93c2VyLlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocGMpIHtcbiAgLy8gc2VlIGlmIHdlIGNhbiBjbG9zZSB0aGUgY29ubmVjdGlvblxuICB2YXIgY3VycmVudFN0YXRlID0gcGMuaWNlQ29ubmVjdGlvblN0YXRlO1xuICB2YXIgY2FuQ2xvc2UgPSBDQU5OT1RfQ0xPU0VfU1RBVEVTLmluZGV4T2YoY3VycmVudFN0YXRlKSA8IDA7XG5cbiAgZnVuY3Rpb24gZGVjb3VwbGUoZXZlbnRzKSB7XG4gICAgZXZlbnRzLmZvckVhY2goZnVuY3Rpb24oZXZ0TmFtZSkge1xuICAgICAgaWYgKHBjWydvbicgKyBldnROYW1lXSkge1xuICAgICAgICBwY1snb24nICsgZXZ0TmFtZV0gPSBudWxsO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8gZGVjb3VwbGUgXCJiZWZvcmUgY2xvc2VcIiBldmVudHNcbiAgZGVjb3VwbGUoRVZFTlRTX0RFQ09VUExFX0JDKTtcblxuICBpZiAoY2FuQ2xvc2UpIHtcbiAgICBkZWJ1ZygnYXR0ZW1wdGluZyBjb25uZWN0aW9uIGNsb3NlLCBjdXJyZW50IHN0YXRlOiAnKyBwYy5pY2VDb25uZWN0aW9uU3RhdGUpO1xuICAgIHBjLmNsb3NlKCk7XG4gIH1cblxuICAvLyByZW1vdmUgdGhlIGV2ZW50IGxpc3RlbmVyc1xuICAvLyBhZnRlciBhIHNob3J0IGRlbGF5IGdpdmluZyB0aGUgY29ubmVjdGlvbiB0aW1lIHRvIHRyaWdnZXJcbiAgLy8gY2xvc2UgYW5kIGljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZSBldmVudHNcbiAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICBkZWNvdXBsZShFVkVOVFNfREVDT1VQTEVfQUMpO1xuICB9LCAxMDApO1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBtYnVzID0gcmVxdWlyZSgnbWJ1cycpO1xudmFyIHF1ZXVlID0gcmVxdWlyZSgncnRjLXRhc2txdWV1ZScpO1xudmFyIGNsZWFudXAgPSByZXF1aXJlKCcuL2NsZWFudXAnKTtcbnZhciBtb25pdG9yID0gcmVxdWlyZSgnLi9tb25pdG9yJyk7XG52YXIgdGhyb3R0bGUgPSByZXF1aXJlKCdjb2cvdGhyb3R0bGUnKTtcbnZhciBwbHVjayA9IHJlcXVpcmUoJ3doaXNrL3BsdWNrJyk7XG52YXIgcGx1Y2tDYW5kaWRhdGUgPSBwbHVjaygnY2FuZGlkYXRlJywgJ3NkcE1pZCcsICdzZHBNTGluZUluZGV4Jyk7XG52YXIgQ0xPU0VEX1NUQVRFUyA9IFsgJ2Nsb3NlZCcsICdmYWlsZWQnIF07XG52YXIgQ0hFQ0tJTkdfU1RBVEVTID0gWyAnY2hlY2tpbmcnIF07XG5cbi8qKlxuICAjIyMgcnRjLXRvb2xzL2NvdXBsZVxuXG4gICMjIyMgY291cGxlKHBjLCB0YXJnZXRJZCwgc2lnbmFsbGVyLCBvcHRzPylcblxuICBDb3VwbGUgYSBXZWJSVEMgY29ubmVjdGlvbiB3aXRoIGFub3RoZXIgd2VicnRjIGNvbm5lY3Rpb24gaWRlbnRpZmllZCBieVxuICBgdGFyZ2V0SWRgIHZpYSB0aGUgc2lnbmFsbGVyLlxuXG4gIFRoZSBmb2xsb3dpbmcgb3B0aW9ucyBjYW4gYmUgcHJvdmlkZWQgaW4gdGhlIGBvcHRzYCBhcmd1bWVudDpcblxuICAtIGBzZHBmaWx0ZXJgIChkZWZhdWx0OiBudWxsKVxuXG4gICAgQSBzaW1wbGUgZnVuY3Rpb24gZm9yIGZpbHRlcmluZyBTRFAgYXMgcGFydCBvZiB0aGUgcGVlclxuICAgIGNvbm5lY3Rpb24gaGFuZHNoYWtlIChzZWUgdGhlIFVzaW5nIEZpbHRlcnMgZGV0YWlscyBiZWxvdykuXG5cbiAgIyMjIyMgRXhhbXBsZSBVc2FnZVxuXG4gIGBgYGpzXG4gIHZhciBjb3VwbGUgPSByZXF1aXJlKCdydGMvY291cGxlJyk7XG5cbiAgY291cGxlKHBjLCAnNTQ4Nzk5NjUtY2U0My00MjZlLWE4ZWYtMDlhYzFlMzlhMTZkJywgc2lnbmFsbGVyKTtcbiAgYGBgXG5cbiAgIyMjIyMgVXNpbmcgRmlsdGVyc1xuXG4gIEluIGNlcnRhaW4gaW5zdGFuY2VzIHlvdSBtYXkgd2lzaCB0byBtb2RpZnkgdGhlIHJhdyBTRFAgdGhhdCBpcyBwcm92aWRlZFxuICBieSB0aGUgYGNyZWF0ZU9mZmVyYCBhbmQgYGNyZWF0ZUFuc3dlcmAgY2FsbHMuICBUaGlzIGNhbiBiZSBkb25lIGJ5IHBhc3NpbmdcbiAgYSBgc2RwZmlsdGVyYCBmdW5jdGlvbiAob3IgYXJyYXkpIGluIHRoZSBvcHRpb25zLiAgRm9yIGV4YW1wbGU6XG5cbiAgYGBganNcbiAgLy8gcnVuIHRoZSBzZHAgZnJvbSB0aHJvdWdoIGEgbG9jYWwgdHdlYWtTZHAgZnVuY3Rpb24uXG4gIGNvdXBsZShwYywgJzU0ODc5OTY1LWNlNDMtNDI2ZS1hOGVmLTA5YWMxZTM5YTE2ZCcsIHNpZ25hbGxlciwge1xuICAgIHNkcGZpbHRlcjogdHdlYWtTZHBcbiAgfSk7XG4gIGBgYFxuXG4qKi9cbmZ1bmN0aW9uIGNvdXBsZShwYywgdGFyZ2V0SWQsIHNpZ25hbGxlciwgb3B0cykge1xuICB2YXIgZGVidWdMYWJlbCA9IChvcHRzIHx8IHt9KS5kZWJ1Z0xhYmVsIHx8ICdydGMnO1xuICB2YXIgZGVidWcgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJykoZGVidWdMYWJlbCArICcvY291cGxlJyk7XG5cbiAgLy8gY3JlYXRlIGEgbW9uaXRvciBmb3IgdGhlIGNvbm5lY3Rpb25cbiAgdmFyIG1vbiA9IG1vbml0b3IocGMsIHRhcmdldElkLCBzaWduYWxsZXIsIChvcHRzIHx8IHt9KS5sb2dnZXIpO1xuICB2YXIgZW1pdCA9IG1idXMoJycsIG1vbik7XG4gIHZhciByZWFjdGl2ZSA9IChvcHRzIHx8IHt9KS5yZWFjdGl2ZTtcbiAgdmFyIGVuZE9mQ2FuZGlkYXRlcyA9IHRydWU7XG5cbiAgLy8gY29uZmlndXJlIHRoZSB0aW1lIHRvIHdhaXQgYmV0d2VlbiByZWNlaXZpbmcgYSAnZGlzY29ubmVjdCdcbiAgLy8gaWNlQ29ubmVjdGlvblN0YXRlIGFuZCBkZXRlcm1pbmluZyB0aGF0IHdlIGFyZSBjbG9zZWRcbiAgdmFyIGRpc2Nvbm5lY3RUaW1lb3V0ID0gKG9wdHMgfHwge30pLmRpc2Nvbm5lY3RUaW1lb3V0IHx8IDEwMDAwO1xuICB2YXIgZGlzY29ubmVjdFRpbWVyO1xuXG4gIC8vIGluaXRpbGFpc2UgdGhlIG5lZ290aWF0aW9uIGhlbHBlcnNcbiAgdmFyIGlzTWFzdGVyID0gc2lnbmFsbGVyLmlzTWFzdGVyKHRhcmdldElkKTtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBwcm9jZXNzaW5nIHF1ZXVlIChvbmUgYXQgYSB0aW1lIHBsZWFzZSlcbiAgdmFyIHEgPSBxdWV1ZShwYywgb3B0cyk7XG5cbiAgdmFyIGNyZWF0ZU9yUmVxdWVzdE9mZmVyID0gdGhyb3R0bGUoZnVuY3Rpb24oKSB7XG4gICAgaWYgKCEgaXNNYXN0ZXIpIHtcbiAgICAgIHJldHVybiBzaWduYWxsZXIudG8odGFyZ2V0SWQpLnNlbmQoJy9uZWdvdGlhdGUnKTtcbiAgICB9XG5cbiAgICBxLmNyZWF0ZU9mZmVyKCk7XG4gIH0sIDEwMCwgeyBsZWFkaW5nOiBmYWxzZSB9KTtcblxuICB2YXIgZGVib3VuY2VPZmZlciA9IHRocm90dGxlKHEuY3JlYXRlT2ZmZXIsIDEwMCwgeyBsZWFkaW5nOiBmYWxzZSB9KTtcblxuICBmdW5jdGlvbiBkZWNvdXBsZSgpIHtcbiAgICBkZWJ1ZygnZGVjb3VwbGluZyAnICsgc2lnbmFsbGVyLmlkICsgJyBmcm9tICcgKyB0YXJnZXRJZCk7XG5cbiAgICAvLyBzdG9wIHRoZSBtb25pdG9yXG4vLyAgICAgbW9uLnJlbW92ZUFsbExpc3RlbmVycygpO1xuICAgIG1vbi5zdG9wKCk7XG5cbiAgICAvLyBjbGVhbnVwIHRoZSBwZWVyY29ubmVjdGlvblxuICAgIGNsZWFudXAocGMpO1xuXG4gICAgLy8gcmVtb3ZlIGxpc3RlbmVyc1xuICAgIHNpZ25hbGxlci5yZW1vdmVMaXN0ZW5lcignc2RwJywgaGFuZGxlU2RwKTtcbiAgICBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIoJ2NhbmRpZGF0ZScsIGhhbmRsZUNhbmRpZGF0ZSk7XG4gICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCduZWdvdGlhdGUnLCBoYW5kbGVOZWdvdGlhdGVSZXF1ZXN0KTtcblxuICAgIC8vIHJlbW92ZSBsaXN0ZW5lcnMgKHZlcnNpb24gPj0gNSlcbiAgICBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIoJ21lc3NhZ2U6c2RwJywgaGFuZGxlU2RwKTtcbiAgICBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIoJ21lc3NhZ2U6Y2FuZGlkYXRlJywgaGFuZGxlQ2FuZGlkYXRlKTtcbiAgICBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIoJ21lc3NhZ2U6bmVnb3RpYXRlJywgaGFuZGxlTmVnb3RpYXRlUmVxdWVzdCk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVDYW5kaWRhdGUoZGF0YSkge1xuICAgIHEuYWRkSWNlQ2FuZGlkYXRlKGRhdGEpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlU2RwKHNkcCwgc3JjKSB7XG4gICAgZW1pdCgnc2RwLnJlbW90ZScsIHNkcCk7XG5cbiAgICAvLyBpZiB0aGUgc291cmNlIGlzIHVua25vd24gb3Igbm90IGEgbWF0Y2gsIHRoZW4gZG9uJ3QgcHJvY2Vzc1xuICAgIGlmICgoISBzcmMpIHx8IChzcmMuaWQgIT09IHRhcmdldElkKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHEuc2V0UmVtb3RlRGVzY3JpcHRpb24oc2RwKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZUNvbm5lY3Rpb25DbG9zZSgpIHtcbiAgICBkZWJ1ZygnY2FwdHVyZWQgcGMgY2xvc2UsIGljZUNvbm5lY3Rpb25TdGF0ZSA9ICcgKyBwYy5pY2VDb25uZWN0aW9uU3RhdGUpO1xuICAgIGRlY291cGxlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVEaXNjb25uZWN0KCkge1xuICAgIGRlYnVnKCdjYXB0dXJlZCBwYyBkaXNjb25uZWN0LCBtb25pdG9yaW5nIGNvbm5lY3Rpb24gc3RhdHVzJyk7XG5cbiAgICAvLyBzdGFydCB0aGUgZGlzY29ubmVjdCB0aW1lclxuICAgIGRpc2Nvbm5lY3RUaW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICBkZWJ1ZygnbWFudWFsbHkgY2xvc2luZyBjb25uZWN0aW9uIGFmdGVyIGRpc2Nvbm5lY3QgdGltZW91dCcpO1xuICAgICAgY2xlYW51cChwYyk7XG4gICAgfSwgZGlzY29ubmVjdFRpbWVvdXQpO1xuXG4gICAgbW9uLm9uKCdzdGF0ZWNoYW5nZScsIGhhbmRsZURpc2Nvbm5lY3RBYm9ydCk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVEaXNjb25uZWN0QWJvcnQoKSB7XG4gICAgZGVidWcoJ2Nvbm5lY3Rpb24gc3RhdGUgY2hhbmdlZCB0bzogJyArIHBjLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG5cbiAgICAvLyBpZiB0aGUgc3RhdGUgaXMgY2hlY2tpbmcsIHRoZW4gZG8gbm90IHJlc2V0IHRoZSBkaXNjb25uZWN0IHRpbWVyIGFzXG4gICAgLy8gd2UgYXJlIGRvaW5nIG91ciBvd24gY2hlY2tpbmdcbiAgICBpZiAoQ0hFQ0tJTkdfU1RBVEVTLmluZGV4T2YocGMuaWNlQ29ubmVjdGlvblN0YXRlKSA+PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgcmVzZXREaXNjb25uZWN0VGltZXIoKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYSBjbG9zZWQgb3IgZmFpbGVkIHN0YXR1cywgdGhlbiBjbG9zZSB0aGUgY29ubmVjdGlvblxuICAgIGlmIChDTE9TRURfU1RBVEVTLmluZGV4T2YocGMuaWNlQ29ubmVjdGlvblN0YXRlKSA+PSAwKSB7XG4gICAgICByZXR1cm4gbW9uKCdjbG9zZWQnKTtcbiAgICB9XG5cbiAgICBtb24ub25jZSgnZGlzY29ubmVjdCcsIGhhbmRsZURpc2Nvbm5lY3QpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlTG9jYWxDYW5kaWRhdGUoZXZ0KSB7XG4gICAgdmFyIGRhdGEgPSBldnQuY2FuZGlkYXRlICYmIHBsdWNrQ2FuZGlkYXRlKGV2dC5jYW5kaWRhdGUpO1xuXG4gICAgaWYgKGV2dC5jYW5kaWRhdGUpIHtcbiAgICAgIHJlc2V0RGlzY29ubmVjdFRpbWVyKCk7XG4gICAgICBlbWl0KCdpY2UubG9jYWwnLCBkYXRhKTtcbiAgICAgIHNpZ25hbGxlci50byh0YXJnZXRJZCkuc2VuZCgnL2NhbmRpZGF0ZScsIGRhdGEpO1xuICAgICAgZW5kT2ZDYW5kaWRhdGVzID0gZmFsc2U7XG4gICAgfVxuICAgIGVsc2UgaWYgKCEgZW5kT2ZDYW5kaWRhdGVzKSB7XG4gICAgICBlbmRPZkNhbmRpZGF0ZXMgPSB0cnVlO1xuICAgICAgZW1pdCgnaWNlLmdhdGhlcmNvbXBsZXRlJyk7XG4gICAgICBzaWduYWxsZXIudG8odGFyZ2V0SWQpLnNlbmQoJy9lbmRvZmNhbmRpZGF0ZXMnLCB7fSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlTmVnb3RpYXRlUmVxdWVzdChzcmMpIHtcbiAgICBpZiAoc3JjLmlkID09PSB0YXJnZXRJZCkge1xuICAgICAgZW1pdCgnbmVnb3RpYXRlLnJlcXVlc3QnLCBzcmMuaWQpO1xuICAgICAgZGVib3VuY2VPZmZlcigpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlc2V0RGlzY29ubmVjdFRpbWVyKCkge1xuICAgIG1vbi5vZmYoJ3N0YXRlY2hhbmdlJywgaGFuZGxlRGlzY29ubmVjdEFib3J0KTtcblxuICAgIC8vIGNsZWFyIHRoZSBkaXNjb25uZWN0IHRpbWVyXG4gICAgZGVidWcoJ3Jlc2V0IGRpc2Nvbm5lY3QgdGltZXIsIHN0YXRlOiAnICsgcGMuaWNlQ29ubmVjdGlvblN0YXRlKTtcbiAgICBjbGVhclRpbWVvdXQoZGlzY29ubmVjdFRpbWVyKTtcbiAgfVxuXG4gIC8vIHdoZW4gcmVnb3RpYXRpb24gaXMgbmVlZGVkIGxvb2sgZm9yIHRoZSBwZWVyXG4gIGlmIChyZWFjdGl2ZSkge1xuICAgIHBjLm9ubmVnb3RpYXRpb25uZWVkZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgIGVtaXQoJ25lZ290aWF0ZS5yZW5lZ290aWF0ZScpO1xuICAgICAgY3JlYXRlT3JSZXF1ZXN0T2ZmZXIoKTtcbiAgICB9O1xuICB9XG5cbiAgcGMub25pY2VjYW5kaWRhdGUgPSBoYW5kbGVMb2NhbENhbmRpZGF0ZTtcblxuICAvLyB3aGVuIHRoZSB0YXNrIHF1ZXVlIHRlbGxzIHVzIHdlIGhhdmUgc2RwIGF2YWlsYWJsZSwgc2VuZCB0aGF0IG92ZXIgdGhlIHdpcmVcbiAgcS5vbignc2RwLmxvY2FsJywgZnVuY3Rpb24oZGVzYykge1xuICAgIHNpZ25hbGxlci50byh0YXJnZXRJZCkuc2VuZCgnL3NkcCcsIGRlc2MpO1xuICB9KTtcblxuICAvLyB3aGVuIHdlIHJlY2VpdmUgc2RwLCB0aGVuXG4gIHNpZ25hbGxlci5vbignc2RwJywgaGFuZGxlU2RwKTtcbiAgc2lnbmFsbGVyLm9uKCdjYW5kaWRhdGUnLCBoYW5kbGVDYW5kaWRhdGUpO1xuXG4gIC8vIGxpc3RlbmVycyAoc2lnbmFsbGVyID49IDUpXG4gIHNpZ25hbGxlci5vbignbWVzc2FnZTpzZHAnLCBoYW5kbGVTZHApO1xuICBzaWduYWxsZXIub24oJ21lc3NhZ2U6Y2FuZGlkYXRlJywgaGFuZGxlQ2FuZGlkYXRlKTtcblxuICAvLyBpZiB0aGlzIGlzIGEgbWFzdGVyIGNvbm5lY3Rpb24sIGxpc3RlbiBmb3IgbmVnb3RpYXRlIGV2ZW50c1xuICBpZiAoaXNNYXN0ZXIpIHtcbiAgICBzaWduYWxsZXIub24oJ25lZ290aWF0ZScsIGhhbmRsZU5lZ290aWF0ZVJlcXVlc3QpO1xuICAgIHNpZ25hbGxlci5vbignbWVzc2FnZTpuZWdvdGlhdGUnLCBoYW5kbGVOZWdvdGlhdGVSZXF1ZXN0KTsgLy8gc2lnbmFsbGVyID49IDVcbiAgfVxuXG4gIC8vIHdoZW4gdGhlIGNvbm5lY3Rpb24gY2xvc2VzLCByZW1vdmUgZXZlbnQgaGFuZGxlcnNcbiAgbW9uLm9uY2UoJ2Nsb3NlZCcsIGhhbmRsZUNvbm5lY3Rpb25DbG9zZSk7XG4gIG1vbi5vbmNlKCdkaXNjb25uZWN0ZWQnLCBoYW5kbGVEaXNjb25uZWN0KTtcblxuICAvLyBwYXRjaCBpbiB0aGUgY3JlYXRlIG9mZmVyIGZ1bmN0aW9uc1xuICBtb24uY3JlYXRlT2ZmZXIgPSBjcmVhdGVPclJlcXVlc3RPZmZlcjtcblxuICByZXR1cm4gbW9uO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNvdXBsZTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIyMgcnRjLXRvb2xzL2RldGVjdFxuXG4gIFByb3ZpZGUgdGhlIFtydGMtY29yZS9kZXRlY3RdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLWNvcmUjZGV0ZWN0KVxuICBmdW5jdGlvbmFsaXR5LlxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJ3J0Yy1jb3JlL2RldGVjdCcpO1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpKCdnZW5lcmF0b3JzJyk7XG52YXIgZGV0ZWN0ID0gcmVxdWlyZSgnLi9kZXRlY3QnKTtcbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJ2NvZy9kZWZhdWx0cycpO1xuXG52YXIgbWFwcGluZ3MgPSB7XG4gIGNyZWF0ZToge1xuICAgIGR0bHM6IGZ1bmN0aW9uKGMpIHtcbiAgICAgIGlmICghIGRldGVjdC5tb3opIHtcbiAgICAgICAgYy5vcHRpb25hbCA9IChjLm9wdGlvbmFsIHx8IFtdKS5jb25jYXQoeyBEdGxzU3J0cEtleUFncmVlbWVudDogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICAjIyMgcnRjLXRvb2xzL2dlbmVyYXRvcnNcblxuICBUaGUgZ2VuZXJhdG9ycyBwYWNrYWdlIHByb3ZpZGVzIHNvbWUgdXRpbGl0eSBtZXRob2RzIGZvciBnZW5lcmF0aW5nXG4gIGNvbnN0cmFpbnQgb2JqZWN0cyBhbmQgc2ltaWxhciBjb25zdHJ1Y3RzLlxuXG4gIGBgYGpzXG4gIHZhciBnZW5lcmF0b3JzID0gcmVxdWlyZSgncnRjL2dlbmVyYXRvcnMnKTtcbiAgYGBgXG5cbioqL1xuXG4vKipcbiAgIyMjIyBnZW5lcmF0b3JzLmNvbmZpZyhjb25maWcpXG5cbiAgR2VuZXJhdGUgYSBjb25maWd1cmF0aW9uIG9iamVjdCBzdWl0YWJsZSBmb3IgcGFzc2luZyBpbnRvIGFuIFczQ1xuICBSVENQZWVyQ29ubmVjdGlvbiBjb25zdHJ1Y3RvciBmaXJzdCBhcmd1bWVudCwgYmFzZWQgb24gb3VyIGN1c3RvbSBjb25maWcuXG5cbiAgSW4gdGhlIGV2ZW50IHRoYXQgeW91IHVzZSBzaG9ydCB0ZXJtIGF1dGhlbnRpY2F0aW9uIGZvciBUVVJOLCBhbmQgeW91IHdhbnRcbiAgdG8gZ2VuZXJhdGUgbmV3IGBpY2VTZXJ2ZXJzYCByZWd1bGFybHksIHlvdSBjYW4gc3BlY2lmeSBhbiBpY2VTZXJ2ZXJHZW5lcmF0b3JcbiAgdGhhdCB3aWxsIGJlIHVzZWQgcHJpb3IgdG8gY291cGxpbmcuIFRoaXMgZ2VuZXJhdG9yIHNob3VsZCByZXR1cm4gYSBmdWxseVxuICBjb21wbGlhbnQgVzNDIChSVENJY2VTZXJ2ZXIgZGljdGlvbmFyeSlbaHR0cDovL3d3dy53My5vcmcvVFIvd2VicnRjLyNpZGwtZGVmLVJUQ0ljZVNlcnZlcl0uXG5cbiAgSWYgeW91IHBhc3MgaW4gYm90aCBhIGdlbmVyYXRvciBhbmQgaWNlU2VydmVycywgdGhlIGljZVNlcnZlcnMgX3dpbGwgYmVcbiAgaWdub3JlZCBhbmQgdGhlIGdlbmVyYXRvciB1c2VkIGluc3RlYWQuXG4qKi9cblxuZXhwb3J0cy5jb25maWcgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgdmFyIGljZVNlcnZlckdlbmVyYXRvciA9IChjb25maWcgfHwge30pLmljZVNlcnZlckdlbmVyYXRvcjtcblxuICByZXR1cm4gZGVmYXVsdHMoe30sIGNvbmZpZywge1xuICAgIGljZVNlcnZlcnM6IHR5cGVvZiBpY2VTZXJ2ZXJHZW5lcmF0b3IgPT0gJ2Z1bmN0aW9uJyA/IGljZVNlcnZlckdlbmVyYXRvcigpIDogW11cbiAgfSk7XG59O1xuXG4vKipcbiAgIyMjIyBnZW5lcmF0b3JzLmNvbm5lY3Rpb25Db25zdHJhaW50cyhmbGFncywgY29uc3RyYWludHMpXG5cbiAgVGhpcyBpcyBhIGhlbHBlciBmdW5jdGlvbiB0aGF0IHdpbGwgZ2VuZXJhdGUgYXBwcm9wcmlhdGUgY29ubmVjdGlvblxuICBjb25zdHJhaW50cyBmb3IgYSBuZXcgYFJUQ1BlZXJDb25uZWN0aW9uYCBvYmplY3Qgd2hpY2ggaXMgY29uc3RydWN0ZWRcbiAgaW4gdGhlIGZvbGxvd2luZyB3YXk6XG5cbiAgYGBganNcbiAgdmFyIGNvbm4gPSBuZXcgUlRDUGVlckNvbm5lY3Rpb24oZmxhZ3MsIGNvbnN0cmFpbnRzKTtcbiAgYGBgXG5cbiAgSW4gbW9zdCBjYXNlcyB0aGUgY29uc3RyYWludHMgb2JqZWN0IGNhbiBiZSBsZWZ0IGVtcHR5LCBidXQgd2hlbiBjcmVhdGluZ1xuICBkYXRhIGNoYW5uZWxzIHNvbWUgYWRkaXRpb25hbCBvcHRpb25zIGFyZSByZXF1aXJlZC4gIFRoaXMgZnVuY3Rpb25cbiAgY2FuIGdlbmVyYXRlIHRob3NlIGFkZGl0aW9uYWwgb3B0aW9ucyBhbmQgaW50ZWxsaWdlbnRseSBjb21iaW5lIGFueVxuICB1c2VyIGRlZmluZWQgY29uc3RyYWludHMgKGluIGBjb25zdHJhaW50c2ApIHdpdGggc2hvcnRoYW5kIGZsYWdzIHRoYXRcbiAgbWlnaHQgYmUgcGFzc2VkIHdoaWxlIHVzaW5nIHRoZSBgcnRjLmNyZWF0ZUNvbm5lY3Rpb25gIGhlbHBlci5cbioqL1xuZXhwb3J0cy5jb25uZWN0aW9uQ29uc3RyYWludHMgPSBmdW5jdGlvbihmbGFncywgY29uc3RyYWludHMpIHtcbiAgdmFyIGdlbmVyYXRlZCA9IHt9O1xuICB2YXIgbSA9IG1hcHBpbmdzLmNyZWF0ZTtcbiAgdmFyIG91dDtcblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIGZsYWdzIGFuZCBhcHBseSB0aGUgY3JlYXRlIG1hcHBpbmdzXG4gIE9iamVjdC5rZXlzKGZsYWdzIHx8IHt9KS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmIChtW2tleV0pIHtcbiAgICAgIG1ba2V5XShnZW5lcmF0ZWQpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gZ2VuZXJhdGUgdGhlIGNvbm5lY3Rpb24gY29uc3RyYWludHNcbiAgb3V0ID0gZGVmYXVsdHMoe30sIGNvbnN0cmFpbnRzLCBnZW5lcmF0ZWQpO1xuICBkZWJ1ZygnZ2VuZXJhdGVkIGNvbm5lY3Rpb24gY29uc3RyYWludHM6ICcsIG91dCk7XG5cbiAgcmV0dXJuIG91dDtcbn07XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIHJ0Yy10b29sc1xuXG4gIFRoZSBgcnRjLXRvb2xzYCBtb2R1bGUgZG9lcyBtb3N0IG9mIHRoZSBoZWF2eSBsaWZ0aW5nIHdpdGhpbiB0aGVcbiAgW3J0Yy5pb10oaHR0cDovL3J0Yy5pbykgc3VpdGUuICBQcmltYXJpbHkgaXQgaGFuZGxlcyB0aGUgbG9naWMgb2YgY291cGxpbmdcbiAgYSBsb2NhbCBgUlRDUGVlckNvbm5lY3Rpb25gIHdpdGggaXQncyByZW1vdGUgY291bnRlcnBhcnQgdmlhIGFuXG4gIFtydGMtc2lnbmFsbGVyXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1zaWduYWxsZXIpIHNpZ25hbGxpbmdcbiAgY2hhbm5lbC5cblxuICAjIyBHZXR0aW5nIFN0YXJ0ZWRcblxuICBJZiB5b3UgZGVjaWRlIHRoYXQgdGhlIGBydGMtdG9vbHNgIG1vZHVsZSBpcyBhIGJldHRlciBmaXQgZm9yIHlvdSB0aGFuIGVpdGhlclxuICBbcnRjLXF1aWNrY29ubmVjdF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtcXVpY2tjb25uZWN0KSBvclxuICBbcnRjXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0YykgdGhlbiB0aGUgY29kZSBzbmlwcGV0IGJlbG93XG4gIHdpbGwgcHJvdmlkZSB5b3UgYSBndWlkZSBvbiBob3cgdG8gZ2V0IHN0YXJ0ZWQgdXNpbmcgaXQgaW4gY29uanVuY3Rpb24gd2l0aFxuICB0aGUgW3J0Yy1zaWduYWxsZXJdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLXNpZ25hbGxlcikgKHZlcnNpb24gNS4wIGFuZCBhYm92ZSlcbiAgYW5kIFtydGMtbWVkaWFdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLW1lZGlhKSBtb2R1bGVzOlxuXG4gIDw8PCBleGFtcGxlcy9nZXR0aW5nLXN0YXJ0ZWQuanNcblxuICBUaGlzIGNvZGUgZGVmaW5pdGVseSBkb2Vzbid0IGNvdmVyIGFsbCB0aGUgY2FzZXMgdGhhdCB5b3UgbmVlZCB0byBjb25zaWRlclxuICAoaS5lLiBwZWVycyBsZWF2aW5nLCBldGMpIGJ1dCBpdCBzaG91bGQgZGVtb25zdHJhdGUgaG93IHRvOlxuXG4gIDEuIENhcHR1cmUgdmlkZW8gYW5kIGFkZCBpdCB0byBhIHBlZXIgY29ubmVjdGlvblxuICAyLiBDb3VwbGUgYSBsb2NhbCBwZWVyIGNvbm5lY3Rpb24gd2l0aCBhIHJlbW90ZSBwZWVyIGNvbm5lY3Rpb25cbiAgMy4gRGVhbCB3aXRoIHRoZSByZW1vdGUgc3RlYW0gYmVpbmcgZGlzY292ZXJlZCBhbmQgaG93IHRvIHJlbmRlclxuICAgICB0aGF0IHRvIHRoZSBsb2NhbCBpbnRlcmZhY2UuXG5cbiAgIyMgUmVmZXJlbmNlXG5cbioqL1xuXG52YXIgZ2VuID0gcmVxdWlyZSgnLi9nZW5lcmF0b3JzJyk7XG5cbi8vIGV4cG9ydCBkZXRlY3RcbnZhciBkZXRlY3QgPSBleHBvcnRzLmRldGVjdCA9IHJlcXVpcmUoJy4vZGV0ZWN0Jyk7XG52YXIgZmluZFBsdWdpbiA9IHJlcXVpcmUoJ3J0Yy1jb3JlL3BsdWdpbicpO1xuXG4vLyBleHBvcnQgY29nIGxvZ2dlciBmb3IgY29udmVuaWVuY2VcbmV4cG9ydHMubG9nZ2VyID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpO1xuXG4vLyBleHBvcnQgcGVlciBjb25uZWN0aW9uXG52YXIgUlRDUGVlckNvbm5lY3Rpb24gPVxuZXhwb3J0cy5SVENQZWVyQ29ubmVjdGlvbiA9IGRldGVjdCgnUlRDUGVlckNvbm5lY3Rpb24nKTtcblxuLy8gYWRkIHRoZSBjb3VwbGUgdXRpbGl0eVxuZXhwb3J0cy5jb3VwbGUgPSByZXF1aXJlKCcuL2NvdXBsZScpO1xuXG4vKipcbiAgIyMjIGNyZWF0ZUNvbm5lY3Rpb25cblxuICBgYGBcbiAgY3JlYXRlQ29ubmVjdGlvbihvcHRzPywgY29uc3RyYWludHM/KSA9PiBSVENQZWVyQ29ubmVjdGlvblxuICBgYGBcblxuICBDcmVhdGUgYSBuZXcgYFJUQ1BlZXJDb25uZWN0aW9uYCBhdXRvIGdlbmVyYXRpbmcgZGVmYXVsdCBvcHRzIGFzIHJlcXVpcmVkLlxuXG4gIGBgYGpzXG4gIHZhciBjb25uO1xuXG4gIC8vIHRoaXMgaXMgb2tcbiAgY29ubiA9IHJ0Yy5jcmVhdGVDb25uZWN0aW9uKCk7XG5cbiAgLy8gYW5kIHNvIGlzIHRoaXNcbiAgY29ubiA9IHJ0Yy5jcmVhdGVDb25uZWN0aW9uKHtcbiAgICBpY2VTZXJ2ZXJzOiBbXVxuICB9KTtcbiAgYGBgXG4qKi9cbmV4cG9ydHMuY3JlYXRlQ29ubmVjdGlvbiA9IGZ1bmN0aW9uKG9wdHMsIGNvbnN0cmFpbnRzKSB7XG4gIHZhciBwbHVnaW4gPSBmaW5kUGx1Z2luKChvcHRzIHx8IHt9KS5wbHVnaW5zKTtcbiAgdmFyIFBlZXJDb25uZWN0aW9uID0gKG9wdHMgfHwge30pLlJUQ1BlZXJDb25uZWN0aW9uIHx8IFJUQ1BlZXJDb25uZWN0aW9uO1xuXG4gIC8vIGdlbmVyYXRlIHRoZSBjb25maWcgYmFzZWQgb24gb3B0aW9ucyBwcm92aWRlZFxuICB2YXIgY29uZmlnID0gZ2VuLmNvbmZpZyhvcHRzKTtcblxuICAvLyBnZW5lcmF0ZSBhcHByb3ByaWF0ZSBjb25uZWN0aW9uIGNvbnN0cmFpbnRzXG4gIGNvbnN0cmFpbnRzID0gZ2VuLmNvbm5lY3Rpb25Db25zdHJhaW50cyhvcHRzLCBjb25zdHJhaW50cyk7XG5cbiAgaWYgKHBsdWdpbiAmJiB0eXBlb2YgcGx1Z2luLmNyZWF0ZUNvbm5lY3Rpb24gPT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBwbHVnaW4uY3JlYXRlQ29ubmVjdGlvbihjb25maWcsIGNvbnN0cmFpbnRzKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgUGVlckNvbm5lY3Rpb24oY29uZmlnLCBjb25zdHJhaW50cyk7XG59O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIG1idXMgPSByZXF1aXJlKCdtYnVzJyk7XG5cbi8vIGRlZmluZSBzb21lIHN0YXRlIG1hcHBpbmdzIHRvIHNpbXBsaWZ5IHRoZSBldmVudHMgd2UgZ2VuZXJhdGVcbnZhciBzdGF0ZU1hcHBpbmdzID0ge1xuICBjb21wbGV0ZWQ6ICdjb25uZWN0ZWQnXG59O1xuXG4vLyBkZWZpbmUgdGhlIGV2ZW50cyB0aGF0IHdlIG5lZWQgdG8gd2F0Y2ggZm9yIHBlZXIgY29ubmVjdGlvblxuLy8gc3RhdGUgY2hhbmdlc1xudmFyIHBlZXJTdGF0ZUV2ZW50cyA9IFtcbiAgJ3NpZ25hbGluZ3N0YXRlY2hhbmdlJyxcbiAgJ2ljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZScsXG5dO1xuXG4vKipcbiAgIyMjIHJ0Yy10b29scy9tb25pdG9yXG5cbiAgYGBgXG4gIG1vbml0b3IocGMsIHRhcmdldElkLCBzaWduYWxsZXIsIHBhcmVudEJ1cykgPT4gbWJ1c1xuICBgYGBcblxuICBUaGUgbW9uaXRvciBpcyBhIHVzZWZ1bCB0b29sIGZvciBkZXRlcm1pbmluZyB0aGUgc3RhdGUgb2YgYHBjYCAoYW5cbiAgYFJUQ1BlZXJDb25uZWN0aW9uYCkgaW5zdGFuY2UgaW4gdGhlIGNvbnRleHQgb2YgeW91ciBhcHBsaWNhdGlvbi4gVGhlXG4gIG1vbml0b3IgdXNlcyBib3RoIHRoZSBgaWNlQ29ubmVjdGlvblN0YXRlYCBpbmZvcm1hdGlvbiBvZiB0aGUgcGVlclxuICBjb25uZWN0aW9uIGFuZCBhbHNvIHRoZSB2YXJpb3VzXG4gIFtzaWduYWxsZXIgZXZlbnRzXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1zaWduYWxsZXIjc2lnbmFsbGVyLWV2ZW50cylcbiAgdG8gZGV0ZXJtaW5lIHdoZW4gdGhlIGNvbm5lY3Rpb24gaGFzIGJlZW4gYGNvbm5lY3RlZGAgYW5kIHdoZW4gaXQgaGFzXG4gIGJlZW4gYGRpc2Nvbm5lY3RlZGAuXG5cbiAgQSBtb25pdG9yIGNyZWF0ZWQgYG1idXNgIGlzIHJldHVybmVkIGFzIHRoZSByZXN1bHQgb2YgYVxuICBbY291cGxlXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0YyNydGNjb3VwbGUpIGJldHdlZW4gYSBsb2NhbCBwZWVyXG4gIGNvbm5lY3Rpb24gYW5kIGl0J3MgcmVtb3RlIGNvdW50ZXJwYXJ0LlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocGMsIHRhcmdldElkLCBzaWduYWxsZXIsIHBhcmVudEJ1cykge1xuICB2YXIgbW9uaXRvciA9IG1idXMoJycsIHBhcmVudEJ1cyk7XG4gIHZhciBzdGF0ZTtcblxuICBmdW5jdGlvbiBjaGVja1N0YXRlKCkge1xuICAgIHZhciBuZXdTdGF0ZSA9IGdldE1hcHBlZFN0YXRlKHBjLmljZUNvbm5lY3Rpb25TdGF0ZSk7XG5cbiAgICAvLyBmbGFnIHRoZSB3ZSBoYWQgYSBzdGF0ZSBjaGFuZ2VcbiAgICBtb25pdG9yKCdzdGF0ZWNoYW5nZScsIHBjLCBuZXdTdGF0ZSk7XG5cbiAgICAvLyBpZiB0aGUgYWN0aXZlIHN0YXRlIGhhcyBjaGFuZ2VkLCB0aGVuIHNlbmQgdGhlIGFwcG9wcmlhdGUgbWVzc2FnZVxuICAgIGlmIChzdGF0ZSAhPT0gbmV3U3RhdGUpIHtcbiAgICAgIG1vbml0b3IobmV3U3RhdGUpO1xuICAgICAgc3RhdGUgPSBuZXdTdGF0ZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVDbG9zZSgpIHtcbiAgICBtb25pdG9yKCdjbG9zZWQnKTtcbiAgfVxuXG4gIHBjLm9uY2xvc2UgPSBoYW5kbGVDbG9zZTtcbiAgcGVlclN0YXRlRXZlbnRzLmZvckVhY2goZnVuY3Rpb24oZXZ0TmFtZSkge1xuICAgIHBjWydvbicgKyBldnROYW1lXSA9IGNoZWNrU3RhdGU7XG4gIH0pO1xuXG4gIG1vbml0b3Iuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIHBjLm9uY2xvc2UgPSBudWxsO1xuICAgIHBlZXJTdGF0ZUV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2dE5hbWUpIHtcbiAgICAgIHBjWydvbicgKyBldnROYW1lXSA9IG51bGw7XG4gICAgfSk7XG4gIH07XG5cbiAgbW9uaXRvci5jaGVja1N0YXRlID0gY2hlY2tTdGF0ZTtcblxuICAvLyBpZiB3ZSBoYXZlbid0IGJlZW4gcHJvdmlkZWQgYSB2YWxpZCBwZWVyIGNvbm5lY3Rpb24sIGFib3J0XG4gIGlmICghIHBjKSB7XG4gICAgcmV0dXJuIG1vbml0b3I7XG4gIH1cblxuICAvLyBkZXRlcm1pbmUgdGhlIGluaXRpYWwgaXMgYWN0aXZlIHN0YXRlXG4gIHN0YXRlID0gZ2V0TWFwcGVkU3RhdGUocGMuaWNlQ29ubmVjdGlvblN0YXRlKTtcblxuICByZXR1cm4gbW9uaXRvcjtcbn07XG5cbi8qIGludGVybmFsIGhlbHBlcnMgKi9cblxuZnVuY3Rpb24gZ2V0TWFwcGVkU3RhdGUoc3RhdGUpIHtcbiAgcmV0dXJuIHN0YXRlTWFwcGluZ3Nbc3RhdGVdIHx8IHN0YXRlO1xufVxuIiwidmFyIGRldGVjdCA9IHJlcXVpcmUoJ3J0Yy1jb3JlL2RldGVjdCcpO1xudmFyIGZpbmRQbHVnaW4gPSByZXF1aXJlKCdydGMtY29yZS9wbHVnaW4nKTtcbnZhciBQcmlvcml0eVF1ZXVlID0gcmVxdWlyZSgncHJpb3JpdHlxdWV1ZWpzJyk7XG52YXIgcGx1Y2sgPSByZXF1aXJlKCd3aGlzay9wbHVjaycpO1xudmFyIHBsdWNrU2Vzc2lvbkRlc2MgPSBwbHVjaygnc2RwJywgJ3R5cGUnKTtcblxuLy8gc29tZSB2YWxpZGF0aW9uIHJvdXRpbmVzXG52YXIgY2hlY2tDYW5kaWRhdGUgPSByZXF1aXJlKCdydGMtdmFsaWRhdG9yL2NhbmRpZGF0ZScpO1xuXG4vLyB0aGUgc2RwIGNsZWFuZXJcbnZhciBzZHBjbGVhbiA9IHJlcXVpcmUoJ3J0Yy1zZHBjbGVhbicpO1xudmFyIHBhcnNlU2RwID0gcmVxdWlyZSgncnRjLXNkcCcpO1xuXG52YXIgUFJJT1JJVFlfTE9XID0gMTAwO1xudmFyIFBSSU9SSVRZX1dBSVQgPSAxMDAwO1xuXG4vLyBwcmlvcml0eSBvcmRlciAobG93ZXIgaXMgYmV0dGVyKVxudmFyIERFRkFVTFRfUFJJT1JJVElFUyA9IFtcbiAgJ2NhbmRpZGF0ZScsXG4gICdzZXRMb2NhbERlc2NyaXB0aW9uJyxcbiAgJ3NldFJlbW90ZURlc2NyaXB0aW9uJyxcbiAgJ2NyZWF0ZUFuc3dlcicsXG4gICdjcmVhdGVPZmZlcidcbl07XG5cbi8vIGRlZmluZSBldmVudCBtYXBwaW5nc1xudmFyIE1FVEhPRF9FVkVOVFMgPSB7XG4gIHNldExvY2FsRGVzY3JpcHRpb246ICdzZXRsb2NhbGRlc2MnLFxuICBzZXRSZW1vdGVEZXNjcmlwdGlvbjogJ3NldHJlbW90ZWRlc2MnLFxuICBjcmVhdGVPZmZlcjogJ29mZmVyJyxcbiAgY3JlYXRlQW5zd2VyOiAnYW5zd2VyJ1xufTtcblxudmFyIE1FRElBX01BUFBJTkdTID0ge1xuICBkYXRhOiAnYXBwbGljYXRpb24nXG59O1xuXG4vLyBkZWZpbmUgc3RhdGVzIGluIHdoaWNoIHdlIHdpbGwgYXR0ZW1wdCB0byBmaW5hbGl6ZSBhIGNvbm5lY3Rpb24gb24gcmVjZWl2aW5nIGEgcmVtb3RlIG9mZmVyXG52YXIgVkFMSURfUkVTUE9OU0VfU1RBVEVTID0gWydoYXZlLXJlbW90ZS1vZmZlcicsICdoYXZlLWxvY2FsLXByYW5zd2VyJ107XG5cbi8qKlxuICAjIHJ0Yy10YXNrcXVldWVcblxuICBUaGlzIGlzIGEgcGFja2FnZSB0aGF0IGFzc2lzdHMgd2l0aCBhcHBseWluZyBhY3Rpb25zIHRvIGFuIGBSVENQZWVyQ29ubmVjdGlvbmBcbiAgaW4gYXMgcmVsaWFibGUgb3JkZXIgYXMgcG9zc2libGUuIEl0IGlzIHByaW1hcmlseSB1c2VkIGJ5IHRoZSBjb3VwbGluZyBsb2dpY1xuICBvZiB0aGUgW2BydGMtdG9vbHNgXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy10b29scykuXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIEZvciB0aGUgbW9tZW50LCByZWZlciB0byB0aGUgc2ltcGxlIGNvdXBsaW5nIHRlc3QgYXMgYW4gZXhhbXBsZSBvZiBob3cgdG8gdXNlXG4gIHRoaXMgcGFja2FnZSAoc2VlIGJlbG93KTpcblxuICA8PDwgdGVzdC9jb3VwbGUuanNcblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHBjLCBvcHRzKSB7XG4gIC8vIGNyZWF0ZSB0aGUgdGFzayBxdWV1ZVxuICB2YXIgcXVldWUgPSBuZXcgUHJpb3JpdHlRdWV1ZShvcmRlclRhc2tzKTtcbiAgdmFyIHRxID0gcmVxdWlyZSgnbWJ1cycpKCcnLCAob3B0cyB8fCB7fSkubG9nZ2VyKTtcblxuICAvLyBpbml0aWFsaXNlIHRhc2sgaW1wb3J0YW5jZVxuICB2YXIgcHJpb3JpdGllcyA9IChvcHRzIHx8IHt9KS5wcmlvcml0aWVzIHx8IERFRkFVTFRfUFJJT1JJVElFUztcblxuICAvLyBjaGVjayBmb3IgcGx1Z2luIHVzYWdlXG4gIHZhciBwbHVnaW4gPSBmaW5kUGx1Z2luKChvcHRzIHx8IHt9KS5wbHVnaW5zKTtcblxuICAvLyBpbml0aWFsaXNlIHN0YXRlIHRyYWNraW5nXG4gIHZhciBjaGVja1F1ZXVlVGltZXIgPSAwO1xuICB2YXIgY3VycmVudFRhc2s7XG4gIHZhciBkZWZhdWx0RmFpbCA9IHRxLmJpbmQodHEsICdmYWlsJyk7XG5cbiAgLy8gbG9vayBmb3IgYW4gc2RwZmlsdGVyIGZ1bmN0aW9uIChhbGxvdyBzbGlnaHQgbWlzLXNwZWxsaW5ncylcbiAgdmFyIHNkcEZpbHRlciA9IChvcHRzIHx8IHt9KS5zZHBmaWx0ZXIgfHwgKG9wdHMgfHwge30pLnNkcEZpbHRlcjtcblxuICAvLyBpbml0aWFsaXNlIHNlc3Npb24gZGVzY3JpcHRpb24gYW5kIGljZWNhbmRpZGF0ZSBvYmplY3RzXG4gIHZhciBSVENTZXNzaW9uRGVzY3JpcHRpb24gPSAob3B0cyB8fCB7fSkuUlRDU2Vzc2lvbkRlc2NyaXB0aW9uIHx8XG4gICAgZGV0ZWN0KCdSVENTZXNzaW9uRGVzY3JpcHRpb24nKTtcblxuICB2YXIgUlRDSWNlQ2FuZGlkYXRlID0gKG9wdHMgfHwge30pLlJUQ0ljZUNhbmRpZGF0ZSB8fFxuICAgIGRldGVjdCgnUlRDSWNlQ2FuZGlkYXRlJyk7XG5cbiAgZnVuY3Rpb24gYWJvcnRRdWV1ZShlcnIpIHtcbiAgICBjb25zb2xlLmVycm9yKGVycik7XG4gIH1cblxuICBmdW5jdGlvbiBhcHBseUNhbmRpZGF0ZSh0YXNrLCBuZXh0KSB7XG4gICAgdmFyIGRhdGEgPSB0YXNrLmFyZ3NbMF07XG4gICAgdmFyIGNhbmRpZGF0ZSA9IGRhdGEgJiYgZGF0YS5jYW5kaWRhdGUgJiYgY3JlYXRlSWNlQ2FuZGlkYXRlKGRhdGEpO1xuXG4gICAgZnVuY3Rpb24gaGFuZGxlT2soKSB7XG4gICAgICB0cSgnaWNlLnJlbW90ZS5hcHBsaWVkJywgY2FuZGlkYXRlKTtcbiAgICAgIG5leHQoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoYW5kbGVGYWlsKGVycikge1xuICAgICAgdHEoJ2ljZS5yZW1vdGUuaW52YWxpZCcsIGNhbmRpZGF0ZSk7XG4gICAgICBuZXh0KGVycik7XG4gICAgfVxuXG4gICAgLy8gd2UgaGF2ZSBhIG51bGwgY2FuZGlkYXRlLCB3ZSBoYXZlIGZpbmlzaGVkIGdhdGhlcmluZyBjYW5kaWRhdGVzXG4gICAgaWYgKCEgY2FuZGlkYXRlKSB7XG4gICAgICByZXR1cm4gbmV4dCgpO1xuICAgIH1cblxuICAgIHBjLmFkZEljZUNhbmRpZGF0ZShjYW5kaWRhdGUsIGhhbmRsZU9rLCBoYW5kbGVGYWlsKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNoZWNrUXVldWUoKSB7XG4gICAgLy8gcGVlayBhdCB0aGUgbmV4dCBpdGVtIG9uIHRoZSBxdWV1ZVxuICAgIHZhciBuZXh0ID0gKCEgcXVldWUuaXNFbXB0eSgpKSAmJiAoISBjdXJyZW50VGFzaykgJiYgcXVldWUucGVlaygpO1xuICAgIHZhciByZWFkeSA9IG5leHQgJiYgdGVzdFJlYWR5KG5leHQpO1xuICAgIHZhciByZXRyeSA9ICghIHF1ZXVlLmlzRW1wdHkoKSkgJiYgaXNOb3RDbG9zZWQocGMpO1xuXG4gICAgLy8gcmVzZXQgdGhlIHF1ZXVlIHRpbWVyXG4gICAgY2hlY2tRdWV1ZVRpbWVyID0gMDtcblxuICAgIC8vIGlmIHdlIGRvbid0IGhhdmUgYSB0YXNrIHJlYWR5LCB0aGVuIGFib3J0XG4gICAgaWYgKCEgcmVhZHkpIHtcbiAgICAgIHJldHVybiByZXRyeSAmJiB0cmlnZ2VyUXVldWVDaGVjaygpO1xuICAgIH1cblxuICAgIC8vIHVwZGF0ZSB0aGUgY3VycmVudCB0YXNrIChkZXF1ZXVlKVxuICAgIGN1cnJlbnRUYXNrID0gcXVldWUuZGVxKCk7XG5cbiAgICAvLyBwcm9jZXNzIHRoZSB0YXNrXG4gICAgY3VycmVudFRhc2suZm4oY3VycmVudFRhc2ssIGZ1bmN0aW9uKGVycikge1xuICAgICAgdmFyIGZhaWwgPSBjdXJyZW50VGFzay5mYWlsIHx8IGRlZmF1bHRGYWlsO1xuICAgICAgdmFyIHBhc3MgPSBjdXJyZW50VGFzay5wYXNzO1xuICAgICAgdmFyIHRhc2tOYW1lID0gY3VycmVudFRhc2submFtZTtcblxuICAgICAgLy8gaWYgZXJyb3JlZCwgZmFpbFxuICAgICAgaWYgKGVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKHRhc2tOYW1lICsgJyB0YXNrIGZhaWxlZDogJywgZXJyKTtcbiAgICAgICAgcmV0dXJuIGZhaWwoZXJyKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBwYXNzID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcGFzcy5hcHBseShjdXJyZW50VGFzaywgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICAgIH1cblxuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgY3VycmVudFRhc2sgPSBudWxsO1xuICAgICAgICB0cmlnZ2VyUXVldWVDaGVjaygpO1xuICAgICAgfSwgMCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjbGVhbnNkcChkZXNjKSB7XG4gICAgLy8gZW5zdXJlIHdlIGhhdmUgY2xlYW4gc2RwXG4gICAgdmFyIHNkcEVycm9ycyA9IFtdO1xuICAgIHZhciBzZHAgPSBkZXNjICYmIHNkcGNsZWFuKGRlc2Muc2RwLCB7IGNvbGxlY3Rvcjogc2RwRXJyb3JzIH0pO1xuXG4gICAgLy8gaWYgd2UgZG9uJ3QgaGF2ZSBhIG1hdGNoLCBsb2cgc29tZSBpbmZvXG4gICAgaWYgKGRlc2MgJiYgc2RwICE9PSBkZXNjLnNkcCkge1xuICAgICAgY29uc29sZS5pbmZvKCdpbnZhbGlkIGxpbmVzIHJlbW92ZWQgZnJvbSBzZHA6ICcsIHNkcEVycm9ycyk7XG4gICAgICBkZXNjLnNkcCA9IHNkcDtcbiAgICB9XG5cbiAgICAvLyBpZiBhIGZpbHRlciBoYXMgYmVlbiBzcGVjaWZpZWQsIHRoZW4gYXBwbHkgdGhlIGZpbHRlclxuICAgIGlmICh0eXBlb2Ygc2RwRmlsdGVyID09ICdmdW5jdGlvbicpIHtcbiAgICAgIGRlc2Muc2RwID0gc2RwRmlsdGVyKGRlc2Muc2RwLCBwYyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlc2M7XG4gIH1cblxuICBmdW5jdGlvbiBjb21wbGV0ZUNvbm5lY3Rpb24oKSB7XG4gICAgaWYgKFZBTElEX1JFU1BPTlNFX1NUQVRFUy5pbmRleE9mKHBjLnNpZ25hbGluZ1N0YXRlKSA+PSAwKSB7XG4gICAgICByZXR1cm4gdHEuY3JlYXRlQW5zd2VyKCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlSWNlQ2FuZGlkYXRlKGRhdGEpIHtcbiAgICBpZiAocGx1Z2luICYmIHR5cGVvZiBwbHVnaW4uY3JlYXRlSWNlQ2FuZGlkYXRlID09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBwbHVnaW4uY3JlYXRlSWNlQ2FuZGlkYXRlKGRhdGEpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUlRDSWNlQ2FuZGlkYXRlKGRhdGEpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlU2Vzc2lvbkRlc2NyaXB0aW9uKGRhdGEpIHtcbiAgICBpZiAocGx1Z2luICYmIHR5cGVvZiBwbHVnaW4uY3JlYXRlU2Vzc2lvbkRlc2NyaXB0aW9uID09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBwbHVnaW4uY3JlYXRlU2Vzc2lvbkRlc2NyaXB0aW9uKGRhdGEpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKGRhdGEpO1xuICB9XG5cbiAgZnVuY3Rpb24gZW1pdFNkcCgpIHtcbiAgICB0cSgnc2RwLmxvY2FsJywgcGx1Y2tTZXNzaW9uRGVzYyh0aGlzLmFyZ3NbMF0pKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGVucXVldWUobmFtZSwgaGFuZGxlciwgb3B0cykge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXG4gICAgICBpZiAob3B0cyAmJiB0eXBlb2Ygb3B0cy5wcm9jZXNzQXJncyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGFyZ3MgPSBhcmdzLm1hcChvcHRzLnByb2Nlc3NBcmdzKTtcbiAgICAgIH1cblxuICAgICAgcXVldWUuZW5xKHtcbiAgICAgICAgYXJnczogYXJncyxcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgZm46IGhhbmRsZXIsXG5cbiAgICAgICAgLy8gaW5pdGlsYWlzZSBhbnkgY2hlY2tzIHRoYXQgbmVlZCB0byBiZSBkb25lIHByaW9yXG4gICAgICAgIC8vIHRvIHRoZSB0YXNrIGV4ZWN1dGluZ1xuICAgICAgICBjaGVja3M6IFsgaXNOb3RDbG9zZWQgXS5jb25jYXQoKG9wdHMgfHwge30pLmNoZWNrcyB8fCBbXSksXG5cbiAgICAgICAgLy8gaW5pdGlhbGlzZSB0aGUgcGFzcyBhbmQgZmFpbCBoYW5kbGVyc1xuICAgICAgICBwYXNzOiAob3B0cyB8fCB7fSkucGFzcyxcbiAgICAgICAgZmFpbDogKG9wdHMgfHwge30pLmZhaWxcbiAgICAgIH0pO1xuXG4gICAgICB0cmlnZ2VyUXVldWVDaGVjaygpO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBleGVjTWV0aG9kKHRhc2ssIG5leHQpIHtcbiAgICB2YXIgZm4gPSBwY1t0YXNrLm5hbWVdO1xuICAgIHZhciBldmVudE5hbWUgPSBNRVRIT0RfRVZFTlRTW3Rhc2submFtZV0gfHwgKHRhc2submFtZSB8fCAnJykudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgY2JBcmdzID0gWyBzdWNjZXNzLCBmYWlsIF07XG4gICAgdmFyIGlzT2ZmZXIgPSB0YXNrLm5hbWUgPT09ICdjcmVhdGVPZmZlcic7XG5cbiAgICBmdW5jdGlvbiBmYWlsKGVycikge1xuICAgICAgdHEuYXBwbHkodHEsIFsgJ25lZ290aWF0ZS5lcnJvcicsIHRhc2submFtZSwgZXJyIF0uY29uY2F0KHRhc2suYXJncykpO1xuICAgICAgbmV4dChlcnIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN1Y2Nlc3MoKSB7XG4gICAgICB0cS5hcHBseSh0cSwgWyBbJ25lZ290aWF0ZScsIGV2ZW50TmFtZSwgJ29rJ10sIHRhc2submFtZSBdLmNvbmNhdCh0YXNrLmFyZ3MpKTtcbiAgICAgIG5leHQuYXBwbHkobnVsbCwgW251bGxdLmNvbmNhdChbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICB9XG5cbiAgICBpZiAoISBmbikge1xuICAgICAgcmV0dXJuIG5leHQobmV3IEVycm9yKCdjYW5ub3QgY2FsbCBcIicgKyB0YXNrLm5hbWUgKyAnXCIgb24gUlRDUGVlckNvbm5lY3Rpb24nKSk7XG4gICAgfVxuXG4gICAgLy8gaW52b2tlIHRoZSBmdW5jdGlvblxuICAgIHRxLmFwcGx5KHRxLCBbJ25lZ290aWF0ZS4nICsgZXZlbnROYW1lXS5jb25jYXQodGFzay5hcmdzKSk7XG4gICAgZm4uYXBwbHkoXG4gICAgICBwYyxcbiAgICAgIHRhc2suYXJncy5jb25jYXQoY2JBcmdzKS5jb25jYXQoaXNPZmZlciA/IGdlbmVyYXRlQ29uc3RyYWludHMoKSA6IFtdKVxuICAgICk7XG4gIH1cblxuICBmdW5jdGlvbiBleHRyYWN0Q2FuZGlkYXRlRXZlbnREYXRhKGRhdGEpIHtcbiAgICAvLyBleHRyYWN0IG5lc3RlZCBjYW5kaWRhdGUgZGF0YSAobGlrZSB3ZSB3aWxsIHNlZSBpbiBhbiBldmVudCBiZWluZyBwYXNzZWQgdG8gdGhpcyBmdW5jdGlvbilcbiAgICB3aGlsZSAoZGF0YSAmJiBkYXRhLmNhbmRpZGF0ZSAmJiBkYXRhLmNhbmRpZGF0ZS5jYW5kaWRhdGUpIHtcbiAgICAgIGRhdGEgPSBkYXRhLmNhbmRpZGF0ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdlbmVyYXRlQ29uc3RyYWludHMoKSB7XG4gICAgdmFyIGFsbG93ZWRLZXlzID0ge1xuICAgICAgb2ZmZXJ0b3JlY2VpdmV2aWRlbzogJ09mZmVyVG9SZWNlaXZlVmlkZW8nLFxuICAgICAgb2ZmZXJ0b3JlY2VpdmVhdWRpbzogJ09mZmVyVG9SZWNlaXZlQXVkaW8nLFxuICAgICAgaWNlcmVzdGFydDogJ0ljZVJlc3RhcnQnLFxuICAgICAgdm9pY2VhY3Rpdml0eWRldGVjdGlvbjogJ1ZvaWNlQWN0aXZpdHlEZXRlY3Rpb24nXG4gICAgfTtcblxuICAgIHZhciBjb25zdHJhaW50cyA9IHtcbiAgICAgIE9mZmVyVG9SZWNlaXZlVmlkZW86IHRydWUsXG4gICAgICBPZmZlclRvUmVjZWl2ZUF1ZGlvOiB0cnVlXG4gICAgfTtcblxuICAgIC8vIHVwZGF0ZSBrbm93biBrZXlzIHRvIG1hdGNoXG4gICAgT2JqZWN0LmtleXMob3B0cyB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgIGlmIChhbGxvd2VkS2V5c1trZXkudG9Mb3dlckNhc2UoKV0pIHtcbiAgICAgICAgY29uc3RyYWludHNbYWxsb3dlZEtleXNba2V5LnRvTG93ZXJDYXNlKCldXSA9IG9wdHNba2V5XTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiB7IG1hbmRhdG9yeTogY29uc3RyYWludHMgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhc0xvY2FsT3JSZW1vdGVEZXNjKHBjLCB0YXNrKSB7XG4gICAgcmV0dXJuIHBjLl9faGFzRGVzYyB8fCAocGMuX19oYXNEZXNjID0gISFwYy5yZW1vdGVEZXNjcmlwdGlvbik7XG4gIH1cblxuICBmdW5jdGlvbiBpc05vdE5lZ290aWF0aW5nKHBjKSB7XG4gICAgcmV0dXJuIHBjLnNpZ25hbGluZ1N0YXRlICE9PSAnaGF2ZS1sb2NhbC1vZmZlcic7XG4gIH1cblxuICBmdW5jdGlvbiBpc05vdENsb3NlZChwYykge1xuICAgIHJldHVybiBwYy5zaWduYWxpbmdTdGF0ZSAhPT0gJ2Nsb3NlZCc7XG4gIH1cblxuICBmdW5jdGlvbiBpc1N0YWJsZShwYykge1xuICAgIHJldHVybiBwYy5zaWduYWxpbmdTdGF0ZSA9PT0gJ3N0YWJsZSc7XG4gIH1cblxuICBmdW5jdGlvbiBpc1ZhbGlkQ2FuZGlkYXRlKHBjLCBkYXRhKSB7XG4gICAgcmV0dXJuIGRhdGEuX192YWxpZCB8fFxuICAgICAgKGRhdGEuX192YWxpZCA9IGNoZWNrQ2FuZGlkYXRlKGRhdGEuYXJnc1swXSkubGVuZ3RoID09PSAwKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzQ29ublJlYWR5Rm9yQ2FuZGlkYXRlKHBjLCBkYXRhKSB7XG4gICAgdmFyIHNkcCA9IHBhcnNlU2RwKHBjLnJlbW90ZURlc2NyaXB0aW9uICYmIHBjLnJlbW90ZURlc2NyaXB0aW9uLnNkcCk7XG4gICAgdmFyIG1lZGlhVHlwZXMgPSBzZHAuZ2V0TWVkaWFUeXBlcygpO1xuICAgIHZhciBzZHBNaWQgPSBkYXRhLmFyZ3NbMF0gJiYgZGF0YS5hcmdzWzBdLnNkcE1pZDtcblxuICAgIC8vIHJlbWFwIG1lZGlhIHR5cGVzIGFzIGFwcHJvcHJpYXRlXG4gICAgc2RwTWlkID0gTUVESUFfTUFQUElOR1Nbc2RwTWlkXSB8fCBzZHBNaWQ7XG5cbiAgICAvLyB0aGUgY2FuZGlkYXRlIGlzIHZhbGlkIGlmIHdlIGtub3cgYWJvdXQgdGhlIG1lZGlhIHR5cGVcbiAgICByZXR1cm4gKHNkcE1pZCA9PT0gJycpIHx8IG1lZGlhVHlwZXMuaW5kZXhPZihzZHBNaWQpID49IDA7XG4gIH1cblxuICBmdW5jdGlvbiBvcmRlclRhc2tzKGEsIGIpIHtcbiAgICAvLyBhcHBseSBlYWNoIG9mIHRoZSBjaGVja3MgZm9yIGVhY2ggdGFza1xuICAgIHZhciB0YXNrcyA9IFthLGJdO1xuICAgIHZhciByZWFkaW5lc3MgPSB0YXNrcy5tYXAodGVzdFJlYWR5KTtcbiAgICB2YXIgdGFza1ByaW9yaXRpZXMgPSB0YXNrcy5tYXAoZnVuY3Rpb24odGFzaywgaWR4KSB7XG4gICAgICB2YXIgcmVhZHkgPSByZWFkaW5lc3NbaWR4XTtcbiAgICAgIHZhciBwcmlvcml0eSA9IHJlYWR5ICYmIHByaW9yaXRpZXMuaW5kZXhPZih0YXNrLm5hbWUpO1xuXG4gICAgICByZXR1cm4gcmVhZHkgPyAocHJpb3JpdHkgPj0gMCA/IHByaW9yaXR5IDogUFJJT1JJVFlfTE9XKSA6IFBSSU9SSVRZX1dBSVQ7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGFza1ByaW9yaXRpZXNbMV0gLSB0YXNrUHJpb3JpdGllc1swXTtcbiAgfVxuXG4gIC8vIGNoZWNrIHdoZXRoZXIgYSB0YXNrIGlzIHJlYWR5IChkb2VzIGl0IHBhc3MgYWxsIHRoZSBjaGVja3MpXG4gIGZ1bmN0aW9uIHRlc3RSZWFkeSh0YXNrKSB7XG4gICAgcmV0dXJuICh0YXNrLmNoZWNrcyB8fCBbXSkucmVkdWNlKGZ1bmN0aW9uKG1lbW8sIGNoZWNrKSB7XG4gICAgICByZXR1cm4gbWVtbyAmJiBjaGVjayhwYywgdGFzayk7XG4gICAgfSwgdHJ1ZSk7XG4gIH1cblxuICBmdW5jdGlvbiB0cmlnZ2VyUXVldWVDaGVjaygpIHtcbiAgICBpZiAoY2hlY2tRdWV1ZVRpbWVyKSByZXR1cm47XG4gICAgY2hlY2tRdWV1ZVRpbWVyID0gc2V0VGltZW91dChjaGVja1F1ZXVlLCA1MCk7XG4gIH1cblxuICAvLyBwYXRjaCBpbiB0aGUgcXVldWUgaGVscGVyIG1ldGhvZHNcbiAgdHEuYWRkSWNlQ2FuZGlkYXRlID0gZW5xdWV1ZSgnYWRkSWNlQ2FuZGlkYXRlJywgYXBwbHlDYW5kaWRhdGUsIHtcbiAgICBwcm9jZXNzQXJnczogZXh0cmFjdENhbmRpZGF0ZUV2ZW50RGF0YSxcbiAgICBjaGVja3M6IFtoYXNMb2NhbE9yUmVtb3RlRGVzYywgaXNWYWxpZENhbmRpZGF0ZSwgaXNDb25uUmVhZHlGb3JDYW5kaWRhdGUgXVxuICB9KTtcblxuICB0cS5zZXRMb2NhbERlc2NyaXB0aW9uID0gZW5xdWV1ZSgnc2V0TG9jYWxEZXNjcmlwdGlvbicsIGV4ZWNNZXRob2QsIHtcbiAgICBwcm9jZXNzQXJnczogY2xlYW5zZHAsXG4gICAgcGFzczogZW1pdFNkcFxuICB9KTtcblxuICB0cS5zZXRSZW1vdGVEZXNjcmlwdGlvbiA9IGVucXVldWUoJ3NldFJlbW90ZURlc2NyaXB0aW9uJywgZXhlY01ldGhvZCwge1xuICAgIHByb2Nlc3NBcmdzOiBjcmVhdGVTZXNzaW9uRGVzY3JpcHRpb24sXG4gICAgcGFzczogY29tcGxldGVDb25uZWN0aW9uXG4gIH0pO1xuXG4gIHRxLmNyZWF0ZU9mZmVyID0gZW5xdWV1ZSgnY3JlYXRlT2ZmZXInLCBleGVjTWV0aG9kLCB7XG4gICAgY2hlY2tzOiBbIGlzTm90TmVnb3RpYXRpbmcgXSxcbiAgICBwYXNzOiB0cS5zZXRMb2NhbERlc2NyaXB0aW9uXG4gIH0pO1xuXG4gIHRxLmNyZWF0ZUFuc3dlciA9IGVucXVldWUoJ2NyZWF0ZUFuc3dlcicsIGV4ZWNNZXRob2QsIHtcbiAgICBwYXNzOiB0cS5zZXRMb2NhbERlc2NyaXB0aW9uXG4gIH0pO1xuXG4gIHJldHVybiB0cTtcbn07XG4iLCIvKipcbiAqIEV4cG9zZSBgUHJpb3JpdHlRdWV1ZWAuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gUHJpb3JpdHlRdWV1ZTtcblxuLyoqXG4gKiBJbml0aWFsaXplcyBhIG5ldyBlbXB0eSBgUHJpb3JpdHlRdWV1ZWAgd2l0aCB0aGUgZ2l2ZW4gYGNvbXBhcmF0b3IoYSwgYilgXG4gKiBmdW5jdGlvbiwgdXNlcyBgLkRFRkFVTFRfQ09NUEFSQVRPUigpYCB3aGVuIG5vIGZ1bmN0aW9uIGlzIHByb3ZpZGVkLlxuICpcbiAqIFRoZSBjb21wYXJhdG9yIGZ1bmN0aW9uIG11c3QgcmV0dXJuIGEgcG9zaXRpdmUgbnVtYmVyIHdoZW4gYGEgPiBiYCwgMCB3aGVuXG4gKiBgYSA9PSBiYCBhbmQgYSBuZWdhdGl2ZSBudW1iZXIgd2hlbiBgYSA8IGJgLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259XG4gKiBAcmV0dXJuIHtQcmlvcml0eVF1ZXVlfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gUHJpb3JpdHlRdWV1ZShjb21wYXJhdG9yKSB7XG4gIHRoaXMuX2NvbXBhcmF0b3IgPSBjb21wYXJhdG9yIHx8IFByaW9yaXR5UXVldWUuREVGQVVMVF9DT01QQVJBVE9SO1xuICB0aGlzLl9lbGVtZW50cyA9IFtdO1xufVxuXG4vKipcbiAqIENvbXBhcmVzIGBhYCBhbmQgYGJgLCB3aGVuIGBhID4gYmAgaXQgcmV0dXJucyBhIHBvc2l0aXZlIG51bWJlciwgd2hlblxuICogaXQgcmV0dXJucyAwIGFuZCB3aGVuIGBhIDwgYmAgaXQgcmV0dXJucyBhIG5lZ2F0aXZlIG51bWJlci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xOdW1iZXJ9IGFcbiAqIEBwYXJhbSB7U3RyaW5nfE51bWJlcn0gYlxuICogQHJldHVybiB7TnVtYmVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuUHJpb3JpdHlRdWV1ZS5ERUZBVUxUX0NPTVBBUkFUT1IgPSBmdW5jdGlvbihhLCBiKSB7XG4gIGlmICh0eXBlb2YgYSA9PT0gJ251bWJlcicgJiYgdHlwZW9mIGIgPT09ICdudW1iZXInKSB7XG4gICAgcmV0dXJuIGEgLSBiO1xuICB9IGVsc2Uge1xuICAgIGEgPSBhLnRvU3RyaW5nKCk7XG4gICAgYiA9IGIudG9TdHJpbmcoKTtcblxuICAgIGlmIChhID09IGIpIHJldHVybiAwO1xuXG4gICAgcmV0dXJuIChhID4gYikgPyAxIDogLTE7XG4gIH1cbn07XG5cbi8qKlxuICogUmV0dXJucyB3aGV0aGVyIHRoZSBwcmlvcml0eSBxdWV1ZSBpcyBlbXB0eSBvciBub3QuXG4gKlxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblByaW9yaXR5UXVldWUucHJvdG90eXBlLmlzRW1wdHkgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuc2l6ZSgpID09PSAwO1xufTtcblxuLyoqXG4gKiBQZWVrcyBhdCB0aGUgdG9wIGVsZW1lbnQgb2YgdGhlIHByaW9yaXR5IHF1ZXVlLlxuICpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEB0aHJvd3Mge0Vycm9yfSB3aGVuIHRoZSBxdWV1ZSBpcyBlbXB0eS5cbiAqIEBhcGkgcHVibGljXG4gKi9cblByaW9yaXR5UXVldWUucHJvdG90eXBlLnBlZWsgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuaXNFbXB0eSgpKSB0aHJvdyBuZXcgRXJyb3IoJ1ByaW9yaXR5UXVldWUgaXMgZW1wdHknKTtcblxuICByZXR1cm4gdGhpcy5fZWxlbWVudHNbMF07XG59O1xuXG4vKipcbiAqIERlcXVldWVzIHRoZSB0b3AgZWxlbWVudCBvZiB0aGUgcHJpb3JpdHkgcXVldWUuXG4gKlxuICogQHJldHVybiB7T2JqZWN0fVxuICogQHRocm93cyB7RXJyb3J9IHdoZW4gdGhlIHF1ZXVlIGlzIGVtcHR5LlxuICogQGFwaSBwdWJsaWNcbiAqL1xuUHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUuZGVxID0gZnVuY3Rpb24oKSB7XG4gIHZhciBmaXJzdCA9IHRoaXMucGVlaygpO1xuICB2YXIgbGFzdCA9IHRoaXMuX2VsZW1lbnRzLnBvcCgpO1xuICB2YXIgc2l6ZSA9IHRoaXMuc2l6ZSgpO1xuXG4gIGlmIChzaXplID09PSAwKSByZXR1cm4gZmlyc3Q7XG5cbiAgdGhpcy5fZWxlbWVudHNbMF0gPSBsYXN0O1xuICB2YXIgY3VycmVudCA9IDA7XG5cbiAgd2hpbGUgKGN1cnJlbnQgPCBzaXplKSB7XG4gICAgdmFyIGxhcmdlc3QgPSBjdXJyZW50O1xuICAgIHZhciBsZWZ0ID0gKDIgKiBjdXJyZW50KSArIDE7XG4gICAgdmFyIHJpZ2h0ID0gKDIgKiBjdXJyZW50KSArIDI7XG5cbiAgICBpZiAobGVmdCA8IHNpemUgJiYgdGhpcy5fY29tcGFyZShsZWZ0LCBsYXJnZXN0KSA+PSAwKSB7XG4gICAgICBsYXJnZXN0ID0gbGVmdDtcbiAgICB9XG5cbiAgICBpZiAocmlnaHQgPCBzaXplICYmIHRoaXMuX2NvbXBhcmUocmlnaHQsIGxhcmdlc3QpID49IDApIHtcbiAgICAgIGxhcmdlc3QgPSByaWdodDtcbiAgICB9XG5cbiAgICBpZiAobGFyZ2VzdCA9PT0gY3VycmVudCkgYnJlYWs7XG5cbiAgICB0aGlzLl9zd2FwKGxhcmdlc3QsIGN1cnJlbnQpO1xuICAgIGN1cnJlbnQgPSBsYXJnZXN0O1xuICB9XG5cbiAgcmV0dXJuIGZpcnN0O1xufTtcblxuLyoqXG4gKiBFbnF1ZXVlcyB0aGUgYGVsZW1lbnRgIGF0IHRoZSBwcmlvcml0eSBxdWV1ZSBhbmQgcmV0dXJucyBpdHMgbmV3IHNpemUuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnRcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblByaW9yaXR5UXVldWUucHJvdG90eXBlLmVucSA9IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgdmFyIHNpemUgPSB0aGlzLl9lbGVtZW50cy5wdXNoKGVsZW1lbnQpO1xuICB2YXIgY3VycmVudCA9IHNpemUgLSAxO1xuXG4gIHdoaWxlIChjdXJyZW50ID4gMCkge1xuICAgIHZhciBwYXJlbnQgPSBNYXRoLmZsb29yKChjdXJyZW50IC0gMSkgLyAyKTtcblxuICAgIGlmICh0aGlzLl9jb21wYXJlKGN1cnJlbnQsIHBhcmVudCkgPD0gMCkgYnJlYWs7XG5cbiAgICB0aGlzLl9zd2FwKHBhcmVudCwgY3VycmVudCk7XG4gICAgY3VycmVudCA9IHBhcmVudDtcbiAgfVxuXG4gIHJldHVybiBzaXplO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBzaXplIG9mIHRoZSBwcmlvcml0eSBxdWV1ZS5cbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLl9lbGVtZW50cy5sZW5ndGg7XG59O1xuXG4vKipcbiAqICBJdGVyYXRlcyBvdmVyIHF1ZXVlIGVsZW1lbnRzXG4gKlxuICogIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKi9cblByaW9yaXR5UXVldWUucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbihmbikge1xuICByZXR1cm4gdGhpcy5fZWxlbWVudHMuZm9yRWFjaChmbik7XG59O1xuXG4vKipcbiAqIENvbXBhcmVzIHRoZSB2YWx1ZXMgYXQgcG9zaXRpb24gYGFgIGFuZCBgYmAgaW4gdGhlIHByaW9yaXR5IHF1ZXVlIHVzaW5nIGl0c1xuICogY29tcGFyYXRvciBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gYVxuICogQHBhcmFtIHtOdW1iZXJ9IGJcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5fY29tcGFyZSA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgcmV0dXJuIHRoaXMuX2NvbXBhcmF0b3IodGhpcy5fZWxlbWVudHNbYV0sIHRoaXMuX2VsZW1lbnRzW2JdKTtcbn07XG5cbi8qKlxuICogU3dhcHMgdGhlIHZhbHVlcyBhdCBwb3NpdGlvbiBgYWAgYW5kIGBiYCBpbiB0aGUgcHJpb3JpdHkgcXVldWUuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGFcbiAqIEBwYXJhbSB7TnVtYmVyfSBiXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuUHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUuX3N3YXAgPSBmdW5jdGlvbihhLCBiKSB7XG4gIHZhciBhdXggPSB0aGlzLl9lbGVtZW50c1thXTtcbiAgdGhpcy5fZWxlbWVudHNbYV0gPSB0aGlzLl9lbGVtZW50c1tiXTtcbiAgdGhpcy5fZWxlbWVudHNbYl0gPSBhdXg7XG59O1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIG51YiA9IHJlcXVpcmUoJ3doaXNrL251YicpO1xudmFyIHBsdWNrID0gcmVxdWlyZSgnd2hpc2svcGx1Y2snKTtcbnZhciBmbGF0dGVuID0gcmVxdWlyZSgnd2hpc2svZmxhdHRlbicpO1xudmFyIHJlTGluZUJyZWFrID0gL1xccj9cXG4vO1xudmFyIHJlVHJhaWxpbmdOZXdsaW5lcyA9IC9cXHI/XFxuJC87XG5cbi8vIGxpc3Qgc2RwIGxpbmUgdHlwZXMgdGhhdCBhcmUgbm90IFwic2lnbmlmaWNhbnRcIlxudmFyIG5vbkhlYWRlckxpbmVzID0gWyAnYScsICdjJywgJ2InLCAnaycgXTtcbnZhciBwYXJzZXJzID0gcmVxdWlyZSgnLi9wYXJzZXJzJyk7XG5cbi8qKlxuICAjIHJ0Yy1zZHBcblxuICBUaGlzIGlzIGEgdXRpbGl0eSBtb2R1bGUgZm9yIGludGVwcmV0aW5nIGFuZCBwYXRjaGluZyBzZHAuXG5cbiAgIyMgVXNhZ2VcblxuICBUaGUgYHJ0Yy1zZHBgIG1haW4gbW9kdWxlIGV4cG9zZXMgYSBzaW5nbGUgZnVuY3Rpb24gdGhhdCBpcyBjYXBhYmxlIG9mXG4gIHBhcnNpbmcgbGluZXMgb2YgU0RQLCBhbmQgcHJvdmlkaW5nIGFuIG9iamVjdCBhbGxvd2luZyB5b3UgdG8gcGVyZm9ybVxuICBvcGVyYXRpb25zIG9uIHRob3NlIHBhcnNlZCBsaW5lczpcblxuICBgYGBqc1xuICB2YXIgc2RwID0gcmVxdWlyZSgncnRjLXNkcCcpKGxpbmVzKTtcbiAgYGBgXG5cbiAgVGhlIGN1cnJlbnRseSBzdXBwb3J0ZWQgb3BlcmF0aW9ucyBhcmUgbGlzdGVkIGJlbG93OlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2RwKSB7XG4gIHZhciBvcHMgPSB7fTtcbiAgdmFyIHBhcnNlZCA9IFtdO1xuICB2YXIgYWN0aXZlQ29sbGVjdG9yO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIGxpbmVzXG4gIHZhciBsaW5lcyA9IHNkcC5zcGxpdChyZUxpbmVCcmVhaykuZmlsdGVyKEJvb2xlYW4pLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgcmV0dXJuIGxpbmUuc3BsaXQoJz0nKTtcbiAgfSk7XG5cbiAgdmFyIGlucHV0T3JkZXIgPSBudWIobGluZXMuZmlsdGVyKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICByZXR1cm4gbGluZVswXSAmJiBub25IZWFkZXJMaW5lcy5pbmRleE9mKGxpbmVbMF0pIDwgMDtcbiAgfSkubWFwKHBsdWNrKDApKSk7XG5cbiAgdmFyIGZpbmRMaW5lID0gb3BzLmZpbmRMaW5lID0gZnVuY3Rpb24odHlwZSwgaW5kZXgpIHtcbiAgICB2YXIgbGluZURhdGEgPSBwYXJzZWQuZmlsdGVyKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgIHJldHVybiBsaW5lWzBdID09PSB0eXBlO1xuICAgIH0pW2luZGV4IHx8IDBdO1xuXG4gICAgcmV0dXJuIGxpbmVEYXRhICYmIGxpbmVEYXRhWzFdO1xuICB9O1xuXG4gIC8vIHB1c2ggaW50byBwYXJzZWQgc2VjdGlvbnNcbiAgbGluZXMuZm9yRWFjaChmdW5jdGlvbihsaW5lKSB7XG4gICAgdmFyIGN1c3RvbVBhcnNlciA9IHBhcnNlcnNbbGluZVswXV07XG5cbiAgICBpZiAoY3VzdG9tUGFyc2VyKSB7XG4gICAgICBhY3RpdmVDb2xsZWN0b3IgPSBjdXN0b21QYXJzZXIocGFyc2VkLCBsaW5lKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoYWN0aXZlQ29sbGVjdG9yKSB7XG4gICAgICBhY3RpdmVDb2xsZWN0b3IgPSBhY3RpdmVDb2xsZWN0b3IobGluZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcGFyc2VkLnB1c2gobGluZSk7XG4gICAgfVxuICB9KTtcblxuICAvKipcbiAgICAjIyMgYHNkcC5hZGRJY2VDYW5kaWRhdGUoZGF0YSlgXG5cbiAgICBNb2RpZnkgdGhlIHNkcCB0byBpbmNsdWRlIGNhbmRpZGF0ZXMgYXMgZGVub3RlZCBieSB0aGUgZGF0YS5cblxuKiovXG4gIG9wcy5hZGRJY2VDYW5kaWRhdGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgdmFyIGxpbmVJbmRleCA9IChkYXRhIHx8IHt9KS5saW5lSW5kZXggfHwgKGRhdGEgfHwge30pLnNkcE1MaW5lSW5kZXg7XG4gICAgdmFyIG1MaW5lID0gdHlwZW9mIGxpbmVJbmRleCAhPSAndW5kZWZpbmVkJyAmJiBmaW5kTGluZSgnbScsIGxpbmVJbmRleCk7XG4gICAgdmFyIGNhbmRpZGF0ZSA9IChkYXRhIHx8IHt9KS5jYW5kaWRhdGU7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIHRoZSBtTGluZSBhZGQgdGhlIG5ldyBjYW5kaWRhdGVcbiAgICBpZiAobUxpbmUgJiYgY2FuZGlkYXRlKSB7XG4gICAgICBtTGluZS5jaGlsZGxpbmVzLnB1c2goY2FuZGlkYXRlLnJlcGxhY2UocmVUcmFpbGluZ05ld2xpbmVzLCAnJykuc3BsaXQoJz0nKSk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgICMjIyBgc2RwLmdldE1lZGlhVHlwZXMoKSA9PiBbXWBcblxuICAgIFJldHJpZXZlIHRoZSBsaXN0IG9mIG1lZGlhIHR5cGVzIHRoYXQgaGF2ZSBiZWVuIGRlZmluZWQgaW4gdGhlIHNkcCB2aWFcbiAgICBgbT1gIGxpbmVzLlxuICAqKi9cbiAgb3BzLmdldE1lZGlhVHlwZXMgPSBmdW5jdGlvbigpIHtcbiAgICBmdW5jdGlvbiBnZXRNZWRpYVR5cGUoZGF0YSkge1xuICAgICAgcmV0dXJuIGRhdGFbMV0uZGVmLnNwbGl0KC9cXHMvKVswXTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyc2VkLmZpbHRlcihmdW5jdGlvbihwYXJ0cykge1xuICAgICAgcmV0dXJuIHBhcnRzWzBdID09PSAnbScgJiYgcGFydHNbMV0gJiYgcGFydHNbMV0uZGVmO1xuICAgIH0pLm1hcChnZXRNZWRpYVR5cGUpO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyBgc2RwLnRvU3RyaW5nKClgXG5cbiAgICBDb252ZXJ0IHRoZSBTRFAgc3RydWN0dXJlIHRoYXQgaXMgY3VycmVudGx5IHJldGFpbmVkIGluIG1lbW9yeSwgaW50byBhIHN0cmluZ1xuICAgIHRoYXQgY2FuIGJlIHByb3ZpZGVkIHRvIGEgYHNldExvY2FsRGVzY3JpcHRpb25gIChvciBgc2V0UmVtb3RlRGVzY3JpcHRpb25gKVxuICAgIFdlYlJUQyBjYWxsLlxuXG4gICoqL1xuICBvcHMudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gcGFyc2VkLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICByZXR1cm4gdHlwZW9mIGxpbmVbMV0udG9BcnJheSA9PSAnZnVuY3Rpb24nID8gbGluZVsxXS50b0FycmF5KCkgOiBbIGxpbmUgXTtcbiAgICB9KS5yZWR1Y2UoZmxhdHRlbikubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgIHJldHVybiBsaW5lLmpvaW4oJz0nKTtcbiAgICB9KS5qb2luKCdcXG4nKTtcbiAgfTtcblxuICAvKipcbiAgICAjIyBTRFAgRmlsdGVyaW5nIC8gTXVuZ2luZyBGdW5jdGlvbnNcblxuICAgIFRoZXJlIGFyZSBhZGRpdGlvbmFsIGZ1bmN0aW9ucyBpbmNsdWRlZCBpbiB0aGUgbW9kdWxlIHRvIGFzc2lnbiB3aXRoXG4gICAgcGVyZm9ybWluZyBcInNpbmdsZS1zaG90XCIgU0RQIGZpbHRlcmluZyAob3IgbXVuZ2luZykgb3BlcmF0aW9uczpcblxuICAqKi9cblxuICByZXR1cm4gb3BzO1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMubSA9IGZ1bmN0aW9uKHBhcnNlZCwgbGluZSkge1xuICB2YXIgbWVkaWEgPSB7XG4gICAgZGVmOiBsaW5lWzFdLFxuICAgIGNoaWxkbGluZXM6IFtdLFxuXG4gICAgdG9BcnJheTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gW1xuICAgICAgICBbJ20nLCBtZWRpYS5kZWYgXVxuICAgICAgXS5jb25jYXQobWVkaWEuY2hpbGRsaW5lcyk7XG4gICAgfVxuICB9O1xuXG4gIGZ1bmN0aW9uIGFkZENoaWxkTGluZShjaGlsZExpbmUpIHtcbiAgICBtZWRpYS5jaGlsZGxpbmVzLnB1c2goY2hpbGRMaW5lKTtcbiAgICByZXR1cm4gYWRkQ2hpbGRMaW5lO1xuICB9XG5cbiAgcGFyc2VkLnB1c2goWyAnbScsIG1lZGlhIF0pO1xuXG4gIHJldHVybiBhZGRDaGlsZExpbmU7XG59OyIsInZhciB2YWxpZGF0b3JzID0gW1xuICBbIC9eKGFcXD1jYW5kaWRhdGUuKikkLywgcmVxdWlyZSgncnRjLXZhbGlkYXRvci9jYW5kaWRhdGUnKSBdXG5dO1xuXG52YXIgcmVTZHBMaW5lQnJlYWsgPSAvKFxccj9cXG58XFxcXHJcXFxcbikvO1xuXG4vKipcbiAgIyBydGMtc2RwY2xlYW5cblxuICBSZW1vdmUgaW52YWxpZCBsaW5lcyBmcm9tIHlvdXIgU0RQLlxuXG4gICMjIFdoeT9cblxuICBUaGlzIG1vZHVsZSByZW1vdmVzIHRoZSBvY2Nhc2lvbmFsIFwiYmFkIGVnZ1wiIHRoYXQgd2lsbCBzbGlwIGludG8gU0RQIHdoZW4gaXRcbiAgaXMgZ2VuZXJhdGVkIGJ5IHRoZSBicm93c2VyLiAgSW4gcGFydGljdWxhciB0aGVzZSBzaXR1YXRpb25zIGFyZSBjYXRlcmVkIGZvcjpcblxuICAtIGludmFsaWQgSUNFIGNhbmRpZGF0ZXNcblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGlucHV0LCBvcHRzKSB7XG4gIHZhciBsaW5lQnJlYWsgPSBkZXRlY3RMaW5lQnJlYWsoaW5wdXQpO1xuICB2YXIgbGluZXMgPSBpbnB1dC5zcGxpdChsaW5lQnJlYWspO1xuICB2YXIgY29sbGVjdG9yID0gKG9wdHMgfHwge30pLmNvbGxlY3RvcjtcblxuICAvLyBmaWx0ZXIgb3V0IGludmFsaWQgbGluZXNcbiAgbGluZXMgPSBsaW5lcy5maWx0ZXIoZnVuY3Rpb24obGluZSkge1xuICAgIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgdmFsaWRhdG9ycyBhbmQgdXNlIHRoZSBvbmUgdGhhdCBtYXRjaGVzXG4gICAgdmFyIHZhbGlkYXRvciA9IHZhbGlkYXRvcnMucmVkdWNlKGZ1bmN0aW9uKG1lbW8sIGRhdGEsIGlkeCkge1xuICAgICAgcmV0dXJuIHR5cGVvZiBtZW1vICE9ICd1bmRlZmluZWQnID8gbWVtbyA6IChkYXRhWzBdLmV4ZWMobGluZSkgJiYge1xuICAgICAgICBsaW5lOiBsaW5lLnJlcGxhY2UoZGF0YVswXSwgJyQxJyksXG4gICAgICAgIGZuOiBkYXRhWzFdXG4gICAgICB9KTtcbiAgICB9LCB1bmRlZmluZWQpO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSBhIHZhbGlkYXRvciwgZW5zdXJlIHdlIGhhdmUgbm8gZXJyb3JzXG4gICAgdmFyIGVycm9ycyA9IHZhbGlkYXRvciA/IHZhbGlkYXRvci5mbih2YWxpZGF0b3IubGluZSkgOiBbXTtcblxuICAgIC8vIGlmIHdlIGhhdmUgZXJyb3JzIGFuZCBhbiBlcnJvciBjb2xsZWN0b3IsIHRoZW4gYWRkIHRvIHRoZSBjb2xsZWN0b3JcbiAgICBpZiAoY29sbGVjdG9yKSB7XG4gICAgICBlcnJvcnMuZm9yRWFjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgY29sbGVjdG9yLnB1c2goZXJyKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBlcnJvcnMubGVuZ3RoID09PSAwO1xuICB9KTtcblxuICByZXR1cm4gbGluZXMuam9pbihsaW5lQnJlYWspO1xufTtcblxuZnVuY3Rpb24gZGV0ZWN0TGluZUJyZWFrKGlucHV0KSB7XG4gIHZhciBtYXRjaCA9IHJlU2RwTGluZUJyZWFrLmV4ZWMoaW5wdXQpO1xuXG4gIHJldHVybiBtYXRjaCAmJiBtYXRjaFswXTtcbn1cbiIsInZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKSgncnRjLXZhbGlkYXRvcicpO1xudmFyIHJlUHJlZml4ID0gL14oPzphPSk/Y2FuZGlkYXRlOi87XG52YXIgcmVJUCA9IC9eKChcXGQrXFwuKXszfVxcZCt8KFthLWZBLUYwLTldK1xcOil7N31bYS1mQS1GMC05XSspJC87XG5cbi8qXG5cbnZhbGlkYXRpb24gcnVsZXMgYXMgcGVyOlxuaHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvZHJhZnQtaWV0Zi1tbXVzaWMtaWNlLXNpcC1zZHAtMDMjc2VjdGlvbi04LjFcblxuICAgY2FuZGlkYXRlLWF0dHJpYnV0ZSAgID0gXCJjYW5kaWRhdGVcIiBcIjpcIiBmb3VuZGF0aW9uIFNQIGNvbXBvbmVudC1pZCBTUFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNwb3J0IFNQXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBwcmlvcml0eSBTUFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbi1hZGRyZXNzIFNQICAgICA7ZnJvbSBSRkMgNDU2NlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9ydCAgICAgICAgIDtwb3J0IGZyb20gUkZDIDQ1NjZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFNQIGNhbmQtdHlwZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgW1NQIHJlbC1hZGRyXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgW1NQIHJlbC1wb3J0XVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgKihTUCBleHRlbnNpb24tYXR0LW5hbWUgU1BcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uLWF0dC12YWx1ZSlcblxuICAgZm91bmRhdGlvbiAgICAgICAgICAgID0gMSozMmljZS1jaGFyXG4gICBjb21wb25lbnQtaWQgICAgICAgICAgPSAxKjVESUdJVFxuICAgdHJhbnNwb3J0ICAgICAgICAgICAgID0gXCJVRFBcIiAvIHRyYW5zcG9ydC1leHRlbnNpb25cbiAgIHRyYW5zcG9ydC1leHRlbnNpb24gICA9IHRva2VuICAgICAgICAgICAgICA7IGZyb20gUkZDIDMyNjFcbiAgIHByaW9yaXR5ICAgICAgICAgICAgICA9IDEqMTBESUdJVFxuICAgY2FuZC10eXBlICAgICAgICAgICAgID0gXCJ0eXBcIiBTUCBjYW5kaWRhdGUtdHlwZXNcbiAgIGNhbmRpZGF0ZS10eXBlcyAgICAgICA9IFwiaG9zdFwiIC8gXCJzcmZseFwiIC8gXCJwcmZseFwiIC8gXCJyZWxheVwiIC8gdG9rZW5cbiAgIHJlbC1hZGRyICAgICAgICAgICAgICA9IFwicmFkZHJcIiBTUCBjb25uZWN0aW9uLWFkZHJlc3NcbiAgIHJlbC1wb3J0ICAgICAgICAgICAgICA9IFwicnBvcnRcIiBTUCBwb3J0XG4gICBleHRlbnNpb24tYXR0LW5hbWUgICAgPSB0b2tlblxuICAgZXh0ZW5zaW9uLWF0dC12YWx1ZSAgID0gKlZDSEFSXG4gICBpY2UtY2hhciAgICAgICAgICAgICAgPSBBTFBIQSAvIERJR0lUIC8gXCIrXCIgLyBcIi9cIlxuKi9cbnZhciBwYXJ0VmFsaWRhdGlvbiA9IFtcbiAgWyAvLisvLCAnaW52YWxpZCBmb3VuZGF0aW9uIGNvbXBvbmVudCcsICdmb3VuZGF0aW9uJyBdLFxuICBbIC9cXGQrLywgJ2ludmFsaWQgY29tcG9uZW50IGlkJywgJ2NvbXBvbmVudC1pZCcgXSxcbiAgWyAvKFVEUHxUQ1ApL2ksICd0cmFuc3BvcnQgbXVzdCBiZSBUQ1Agb3IgVURQJywgJ3RyYW5zcG9ydCcgXSxcbiAgWyAvXFxkKy8sICdudW1lcmljIHByaW9yaXR5IGV4cGVjdGVkJywgJ3ByaW9yaXR5JyBdLFxuICBbIHJlSVAsICdpbnZhbGlkIGNvbm5lY3Rpb24gYWRkcmVzcycsICdjb25uZWN0aW9uLWFkZHJlc3MnIF0sXG4gIFsgL1xcZCsvLCAnaW52YWxpZCBjb25uZWN0aW9uIHBvcnQnLCAnY29ubmVjdGlvbi1wb3J0JyBdLFxuICBbIC90eXAvLCAnRXhwZWN0ZWQgXCJ0eXBcIiBpZGVudGlmaWVyJywgJ3R5cGUgY2xhc3NpZmllcicgXSxcbiAgWyAvLisvLCAnSW52YWxpZCBjYW5kaWRhdGUgdHlwZSBzcGVjaWZpZWQnLCAnY2FuZGlkYXRlLXR5cGUnIF1cbl07XG5cbi8qKlxuICAjIyMgYHJ0Yy12YWxpZGF0b3IvY2FuZGlkYXRlYFxuXG4gIFZhbGlkYXRlIHRoYXQgYW4gYFJUQ0ljZUNhbmRpZGF0ZWAgKG9yIHBsYWluIG9sZCBvYmplY3Qgd2l0aCBkYXRhLCBzZHBNaWQsXG4gIGV0YyBhdHRyaWJ1dGVzKSBpcyBhIHZhbGlkIGljZSBjYW5kaWRhdGUuXG5cbiAgU3BlY3MgcmV2aWV3ZWQgYXMgcGFydCBvZiB0aGUgdmFsaWRhdGlvbiBpbXBsZW1lbnRhdGlvbjpcblxuICAtIDxodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9kcmFmdC1pZXRmLW1tdXNpYy1pY2Utc2lwLXNkcC0wMyNzZWN0aW9uLTguMT5cbiAgLSA8aHR0cDovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjNTI0NT5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgdmFyIGVycm9ycyA9IFtdO1xuICB2YXIgY2FuZGlkYXRlID0gZGF0YSAmJiAoZGF0YS5jYW5kaWRhdGUgfHwgZGF0YSk7XG4gIHZhciBwcmVmaXhNYXRjaCA9IGNhbmRpZGF0ZSAmJiByZVByZWZpeC5leGVjKGNhbmRpZGF0ZSk7XG4gIHZhciBwYXJ0cyA9IHByZWZpeE1hdGNoICYmIGNhbmRpZGF0ZS5zbGljZShwcmVmaXhNYXRjaFswXS5sZW5ndGgpLnNwbGl0KC9cXHMvKTtcblxuICBpZiAoISBjYW5kaWRhdGUpIHtcbiAgICByZXR1cm4gWyBuZXcgRXJyb3IoJ2VtcHR5IGNhbmRpZGF0ZScpIF07XG4gIH1cblxuICAvLyBjaGVjayB0aGF0IHRoZSBwcmVmaXggbWF0Y2hlcyBleHBlY3RlZFxuICBpZiAoISBwcmVmaXhNYXRjaCkge1xuICAgIHJldHVybiBbIG5ldyBFcnJvcignY2FuZGlkYXRlIGRpZCBub3QgbWF0Y2ggZXhwZWN0ZWQgc2RwIGxpbmUgZm9ybWF0JykgXTtcbiAgfVxuXG4gIC8vIHBlcmZvcm0gdGhlIHBhcnQgdmFsaWRhdGlvblxuICBlcnJvcnMgPSBlcnJvcnMuY29uY2F0KHBhcnRzLm1hcCh2YWxpZGF0ZVBhcnRzKSkuZmlsdGVyKEJvb2xlYW4pO1xuXG4gIHJldHVybiBlcnJvcnM7XG59O1xuXG5mdW5jdGlvbiB2YWxpZGF0ZVBhcnRzKHBhcnQsIGlkeCkge1xuICB2YXIgdmFsaWRhdG9yID0gcGFydFZhbGlkYXRpb25baWR4XTtcblxuICBpZiAodmFsaWRhdG9yICYmICghIHZhbGlkYXRvclswXS50ZXN0KHBhcnQpKSkge1xuICAgIGRlYnVnKHZhbGlkYXRvclsyXSArICcgcGFydCBmYWlsZWQgdmFsaWRhdGlvbjogJyArIHBhcnQpO1xuICAgIHJldHVybiBuZXcgRXJyb3IodmFsaWRhdG9yWzFdKTtcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhLCBiKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGEgPT09IGIgOiBmdW5jdGlvbihiKSB7XG4gICAgcmV0dXJuIGEgPT09IGI7XG4gIH07XG59O1xuIiwiLyoqXG4gICMjIGZsYXR0ZW5cblxuICBGbGF0dGVuIGFuIGFycmF5IHVzaW5nIGBbXS5yZWR1Y2VgXG5cbiAgPDw8IGV4YW1wbGVzL2ZsYXR0ZW4uanNcblxuKiovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYSwgYikge1xuICAvLyBpZiBhIGlzIG5vdCBhbHJlYWR5IGFuIGFycmF5LCBtYWtlIGl0IG9uZVxuICBhID0gQXJyYXkuaXNBcnJheShhKSA/IGEgOiBbYV07XG5cbiAgLy8gY29uY2F0IGIgd2l0aCBhXG4gIHJldHVybiBhLmNvbmNhdChiKTtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb21wYXJhdG9yKSB7XG4gIHJldHVybiBmdW5jdGlvbihpbnB1dCkge1xuICAgIHZhciBvdXRwdXQgPSBbXTtcbiAgICBmb3IgKHZhciBpaSA9IDAsIGNvdW50ID0gaW5wdXQubGVuZ3RoOyBpaSA8IGNvdW50OyBpaSsrKSB7XG4gICAgICB2YXIgZm91bmQgPSBmYWxzZTtcbiAgICAgIGZvciAodmFyIGpqID0gb3V0cHV0Lmxlbmd0aDsgamotLTsgKSB7XG4gICAgICAgIGZvdW5kID0gZm91bmQgfHwgY29tcGFyYXRvcihpbnB1dFtpaV0sIG91dHB1dFtqal0pO1xuICAgICAgfVxuXG4gICAgICBpZiAoZm91bmQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIG91dHB1dFtvdXRwdXQubGVuZ3RoXSA9IGlucHV0W2lpXTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0cHV0O1xuICB9O1xufSIsIi8qKlxuICAjIyBudWJcblxuICBSZXR1cm4gb25seSB0aGUgdW5pcXVlIGVsZW1lbnRzIG9mIHRoZSBsaXN0LlxuXG4gIDw8PCBleGFtcGxlcy9udWIuanNcblxuKiovXG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9udWItYnknKShyZXF1aXJlKCcuL2VxdWFsaXR5JykpOyIsIi8qKlxuICAjIyBwbHVja1xuXG4gIEV4dHJhY3QgdGFyZ2V0ZWQgcHJvcGVydGllcyBmcm9tIGEgc291cmNlIG9iamVjdC4gV2hlbiBhIHNpbmdsZSBwcm9wZXJ0eVxuICB2YWx1ZSBpcyByZXF1ZXN0ZWQsIHRoZW4ganVzdCB0aGF0IHZhbHVlIGlzIHJldHVybmVkLlxuXG4gIEluIHRoZSBjYXNlIHdoZXJlIG11bHRpcGxlIHByb3BlcnRpZXMgYXJlIHJlcXVlc3RlZCAoaW4gYSB2YXJhcmdzIGNhbGxpbmdcbiAgc3R5bGUpIGEgbmV3IG9iamVjdCB3aWxsIGJlIGNyZWF0ZWQgd2l0aCB0aGUgcmVxdWVzdGVkIHByb3BlcnRpZXMgY29waWVkXG4gIGFjcm9zcy5cblxuICBfX05PVEU6X18gSW4gdGhlIHNlY29uZCBmb3JtIGV4dHJhY3Rpb24gb2YgbmVzdGVkIHByb3BlcnRpZXMgaXNcbiAgbm90IHN1cHBvcnRlZC5cblxuICA8PDwgZXhhbXBsZXMvcGx1Y2suanNcblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZmllbGRzID0gW107XG5cbiAgZnVuY3Rpb24gZXh0cmFjdG9yKHBhcnRzLCBtYXhJZHgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oaXRlbSkge1xuICAgICAgdmFyIHBhcnRJZHggPSAwO1xuICAgICAgdmFyIHZhbCA9IGl0ZW07XG5cbiAgICAgIGRvIHtcbiAgICAgICAgdmFsID0gdmFsICYmIHZhbFtwYXJ0c1twYXJ0SWR4KytdXTtcbiAgICAgIH0gd2hpbGUgKHZhbCAmJiBwYXJ0SWR4IDw9IG1heElkeCk7XG5cbiAgICAgIHJldHVybiB2YWw7XG4gICAgfTtcbiAgfVxuXG4gIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKS5mb3JFYWNoKGZ1bmN0aW9uKHBhdGgpIHtcbiAgICB2YXIgcGFydHMgPSB0eXBlb2YgcGF0aCA9PSAnbnVtYmVyJyA/IFsgcGF0aCBdIDogKHBhdGggfHwgJycpLnNwbGl0KCcuJyk7XG5cbiAgICBmaWVsZHNbZmllbGRzLmxlbmd0aF0gPSB7XG4gICAgICBuYW1lOiBwYXJ0c1swXSxcbiAgICAgIHBhcnRzOiBwYXJ0cyxcbiAgICAgIG1heElkeDogcGFydHMubGVuZ3RoIC0gMVxuICAgIH07XG4gIH0pO1xuXG4gIGlmIChmaWVsZHMubGVuZ3RoIDw9IDEpIHtcbiAgICByZXR1cm4gZXh0cmFjdG9yKGZpZWxkc1swXS5wYXJ0cywgZmllbGRzWzBdLm1heElkeCk7XG4gIH1cbiAgZWxzZSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIHZhciBkYXRhID0ge307XG5cbiAgICAgIGZvciAodmFyIGlpID0gMCwgbGVuID0gZmllbGRzLmxlbmd0aDsgaWkgPCBsZW47IGlpKyspIHtcbiAgICAgICAgZGF0YVtmaWVsZHNbaWldLm5hbWVdID0gZXh0cmFjdG9yKFtmaWVsZHNbaWldLnBhcnRzWzBdXSwgMCkoaXRlbSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBkYXRhO1xuICAgIH07XG4gIH1cbn07Il19
