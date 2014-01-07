(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var rtc = require('rtc');

// create a websocket connection (using socket.io) on our signalling server
var socket = io.connect('http://rtcjs.io:50001');

// create a signalling instance using our messaging layer (socket.io)
// as the socket uses 'message' for 'data' event and 'connect' for 'open'
// we need to tell the signaller what to look for
var signaller = rtc.signaller(socket, {
  dataEvent: 'message',
  openEvent: 'connect'
});

// announce myself on the signalling channel
signaller.announce({ name: 'Bob' });

// create a new peer connection (with default constraints)
// that will be used for our peer connection with sue
var connection = rtc.createConnection();

// ok let's try and create this connection
var coupling = rtc.couple(connection, { name: 'Sue' }, signaller);

// track the connection state
coupling.once('active', function() {
  console.log('we have connected');
});
},{"rtc":8}],2:[function(require,module,exports){
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
/* jshint node: true */
/* global window: false */
/* global navigator: false */

'use strict';

var browsers = {
  chrome: /Chrom(?:e|ium)\/([0-9]+)\./,
  firefox: /Firefox\/([0-9]+)\./,
  opera: /Opera\/([0-9]+)\./
};

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

// time to do some useragent sniffing - it feels dirty because it is :/
if (typeof navigator != 'undefined') {
  Object.keys(browsers).forEach(function(key) {
    var match = browsers[key].exec(navigator.userAgent);
    if (match) {
      detect.browser = key;
      detect.browserVersion = detect.version = parseInt(match[1], 10);
    }
  });
}
else {
  detect.browser = 'node';
  detect.browserVersion = detect.version = '?'; // TODO: get node version
}
},{}],5:[function(require,module,exports){
/* jshint node: true */
/* global RTCIceCandidate: false */
/* global RTCSessionDescription: false */
'use strict';

var debug = require('cog/logger')('couple');
var async = require('async');
var monitor = require('./monitor');
var detect = require('./detect');

/**
  ## rtc/couple

  ### couple(pc, targetId, signaller, opts?)

  Couple a WebRTC connection with another webrtc connection identified by
  `targetId` via the signaller.

  The following options can be provided in the `opts` argument:

  - `sdpfilter` (default: null)

    A simple function for filtering SDP as part of the peer
    connection handshake (see the Using Filters details below).

  - `maxAttempts` (default: 1)

    How many times should negotiation be attempted.  This is
    **experimental** functionality for attempting connection negotiation
    if it fails.

  - `attemptDelay` (default: 3000)

    The amount of ms to wait between connection negotiation attempts.

  #### Example Usage

  ```js
  var couple = require('rtc/couple');

  couple(pc, '54879965-ce43-426e-a8ef-09ac1e39a16d', signaller);
  ```

  #### Using Filters

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
function couple(conn, targetId, signaller, opts) {
  // create a monitor for the connection
  var mon = monitor(conn);
  var blockId;
  var stages = {};
  var queuedCandidates = [];
  var sdpFilter = (opts || {}).sdpfilter;

  // retry implementation
  var offerTimeout;

  // if the signaller does not support this isMaster function throw an
  // exception
  if (typeof signaller.isMaster != 'function') {
    throw new Error('rtc-signaller instance >= 0.14.0 required');
  }

  // initilaise the negotiation helpers
  var isMaster = signaller.isMaster(targetId);
  var createOffer = negotiate('createOffer', isMaster, checkValidOfferState);
  var createAnswer = negotiate('createAnswer', true);

  // initialise the processing queue (one at a time please)
  var q = async.queue(function(task, cb) {
    // if the task has no operation, then trigger the callback immediately
    if (typeof task.op != 'function') {
      return cb();
    }

    // process the task operation
    task.op(task, cb);
  }, 1);

  // initialise session description and icecandidate objects
  var RTCSessionDescription = (opts || {}).RTCSessionDescription ||
    detect('RTCSessionDescription');

  var RTCIceCandidate = (opts || {}).RTCIceCandidate ||
    detect('RTCIceCandidate');

  function abort(stage, sdp, cb) {
    var stageHandler = stages[stage];

    return function(err) {
      // log the error
      console.error('rtc/couple error (' + stage + '): ', err);

      if (typeof cb == 'function') {
        cb(err);
      }
    };
  }

  function checkValidOfferState() {
    var sigState = conn.signalingState;
    var gatherState = conn.iceGatheringState;
    var connState = conn.iceConnectionState;

    function waitForStable() {
      if (conn.signalingState === 'stable') {
        q.push({ op: createOffer });
      }

      mon.removeListener('change', waitForStable);
    }

    if (sigState !== 'stable') {
      debug('cannot create offer, signaling state != stable, will retry');
      mon.on('change', waitForStable);

      return false;
    }

    // if the connection state is checking we should wait before creating
    // an offer also
    if (connState === 'checking') {
      debug('connection state is checking, will wait to create a new offer');
      mon.once('active', function() {
        q.push({ op: createOffer });
      });

      return false;
    }
    // console.log('checking gather state: ' + gatherState);
    // if (gatherState !== 'new' && gatherState !== 'complete') {
    //   console.warn('cannot create offer, intermediate ice gathering state, will retry', conn);
    //   mon.once('active', function() {
    //     console.log('connection is active');
    //     q.push({ op: createOffer });
    //   });

    //   return false;
    // }

    return true;
  }

  function negotiate(methodName, allowed, preflightChecks) {
    var hsDebug = require('cog/logger')('handshake-' + methodName);

    return function(task, cb) {
      // if the task is not allowed, then send a negotiate request to our
      // peer
      if (! allowed) {
        signaller.to(targetId).send('/negotiate');
        return cb();
      }

      // if we are creating an offer and not stable, then wait until stable
      if (typeof preflightChecks == 'function' && (! preflightChecks())) {
        return cb();
      }

      // create the offer
      debug('calling ' + methodName);
      conn[methodName](
        function(desc) {

          // if a filter has been specified, then apply the filter
          if (typeof sdpFilter == 'function') {
            desc.sdp = sdpFilter(desc.sdp, conn, methodName);
          }

          // initialise the local description
          conn.setLocalDescription(
            desc,

            // if successful, then send the sdp over the wire
            function() {
              // send the sdp
              signaller.to(targetId).send('/sdp', desc);

              // callback
              cb();
            },

            // on error, abort
            abort(methodName, desc.sdp, cb)
          );
        },

        // on error, abort
        abort(methodName, '', cb)
      );
    };
  }

  function handleLocalCandidate(evt) {
    if (evt.candidate) {
      signaller.to(targetId).send('/candidate', evt.candidate);
    }
    else if (conn.iceGatheringState === 'complete') {
      debug('ice gathering state complete')
    }
  }

  function handleRemoteCandidate(data, src) {
    if ((! src) || (src.id !== targetId)) {
      return;
    }

    if (! conn.remoteDescription) {
      return queuedCandidates.push(data);
    }

    try {
      conn.addIceCandidate(new RTCIceCandidate(data));
    }
    catch (e) {
      debug('invalidate candidate specified: ', data);
    }
  }

  function handleSdp(data, src) {
    // if the source is unknown or not a match, then abort
    if ((! src) || (src.id !== targetId)) {
      return;
    }

    // prioritize setting the remote description operation
    q.push({ op: function(task, cb) {
      // update the remote description
      // once successful, send the answer
      conn.setRemoteDescription(
        new RTCSessionDescription(data),

        function() {
          // apply any queued candidates
          queuedCandidates.splice(0).forEach(function(data) {
            debug('applying queued candidate');
            conn.addIceCandidate(new RTCIceCandidate(data));
          });

          // create the answer
          if (data.type === 'offer') {
            queue(createAnswer)();
          }

          // trigger the callback
          cb();
        },

        abort(data.type === 'offer' ? 'createAnswer' : 'createOffer', data.sdp, cb)
      );
    }});
  }

  function queue(negotiateTask) {
    return function() {
      q.push([
        { op: negotiateTask }
      ]);
    };
  }

  // if the target id is not a string, then complain
  if (typeof targetId != 'string' && (! (targetId instanceof String))) {
    throw new Error('2nd argument (targetId) should be a string');
  }

  // when regotiation is needed look for the peer
  conn.addEventListener('negotiationneeded', function() {
    debug('renegotiation required, will create offer in 50ms');
    clearTimeout(offerTimeout);
    offerTimeout = setTimeout(queue(createOffer), 50);
  });

  conn.addEventListener('icecandidate', handleLocalCandidate);

  // when we receive sdp, then
  signaller.on('sdp', handleSdp);
  signaller.on('candidate', handleRemoteCandidate);

  // if this is a master connection, listen for negotiate events
  if (isMaster) {
    signaller.on('negotiate', function(src) {
      if (src.id === targetId) {
        debug('got negotiate request from ' + targetId + ', creating offer');
        q.push({ op: createOffer });
      }
    });
  }

  // when the connection closes, remove event handlers
  mon.once('closed', function() {
    debug('closed');

    // remove listeners
    signaller.removeListener('sdp', handleSdp);
    signaller.removeListener('candidate', handleRemoteCandidate);
  });

  // patch in the create offer functions
  mon.createOffer = queue(createOffer);

  return mon;
}

module.exports = couple;
},{"./detect":6,"./monitor":9,"async":10,"cog/logger":3}],6:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ## rtc/detect

  Provide the [rtc-core/detect](https://github.com/rtc-io/rtc-core#detect) 
  functionality.
**/
module.exports = require('rtc-core/detect');
},{"rtc-core/detect":4}],7:[function(require,module,exports){
/* jshint node: true */
'use strict';

var debug = require('cog/logger')('generators');
var detect = require('./detect');
var defaults = require('cog/defaults');

var mappings = {
  create: {
    // data enabler
    data: function(c) {
      if (! detect.moz) {
        c.optional = (c.optional || []).concat({ RtpDataChannels: true });
      }
    },

    dtls: function(c) {
      if (! detect.moz) {
        c.optional = (c.optional || []).concat({ DtlsSrtpKeyAgreement: true });
      }
    }
  }
};

// initialise known flags
var knownFlags = ['video', 'audio', 'data'];

/**
  ## rtc/generators

  The generators package provides some utility methods for generating
  constraint objects and similar constructs.

  ```js
  var generators = require('rtc/generators');
  ```

**/

/**
  ### generators.config(config)

  Generate a configuration object suitable for passing into an W3C
  RTCPeerConnection constructor first argument, based on our custom config.
**/
exports.config = function(config) {
  return defaults(config, {
    iceServers: []
  });
};

/**
  ### generators.connectionConstraints(flags, constraints)

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

/**
  ### parseFlags(opts)

  This is a helper function that will extract known flags from a generic
  options object.
**/
var parseFlags = exports.parseFlags = function(options) {
  // ensure we have opts
  var opts = options || {};

  // default video and audio flags to true if undefined
  opts.video = opts.video || typeof opts.video == 'undefined';
  opts.audio = opts.audio || typeof opts.audio == 'undefined';

  return Object.keys(opts || {})
    .filter(function(flag) {
      return opts[flag];
    })
    .map(function(flag) {
      return flag.toLowerCase();
    })
    .filter(function(flag) {
      return knownFlags.indexOf(flag) >= 0;
    });
};
},{"./detect":6,"cog/defaults":2,"cog/logger":3}],8:[function(require,module,exports){
/* jshint node: true */

'use strict';

/**
  # rtc

  The `rtc` package is a convenience layer for working with the rtc.io toolkit.
  Consider it a boxed set of lego of the most common pieces required to build
  the front-end component of a WebRTC application.

  ## Getting Started

  TO BE COMPLETED.

**/

var gen = require('./generators');

// export detect
var detect = exports.detect = require('./detect');

// export cog logger for convenience
exports.logger = require('cog/logger');

// export peer connection
var RTCPeerConnection =
exports.RTCPeerConnection = detect('RTCPeerConnection');

// add the couple utility
exports.couple = require('./couple');

/**
  ## Factories
**/

/**
  ### createConnection(opts?, constraints?)

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
  return new RTCPeerConnection(
    // generate the config based on options provided
    gen.config(opts),

    // generate appropriate connection constraints
    gen.connectionConstraints(opts, constraints)
  );
};
},{"./couple":5,"./detect":6,"./generators":7,"cog/logger":3}],9:[function(require,module,exports){
var process=require("__browserify_process");/* jshint node: true */
'use strict';

var debug = require('cog/logger')('monitor');
var EventEmitter = require('events').EventEmitter;
var W3C_STATES = {
  NEW: 'new',
  LOCAL_OFFER: 'have-local-offer',
  LOCAL_PRANSWER: 'have-local-pranswer',
  REMOTE_PRANSWER: 'have-remote-pranswer',
  ACTIVE: 'active',
  CLOSED: 'closed'
};

/**
  ## rtc/monitor

  In most current implementations of `RTCPeerConnection` it is quite
  difficult to determine whether a peer connection is active and ready
  for use or not.  The monitor provides some assistance here by providing
  a simple function that provides an `EventEmitter` which gives updates
  on a connections state.

  ### monitor(pc) -> EventEmitter

  ```js
  var monitor = require('rtc/monitor');
  var pc = new RTCPeerConnection(config);

  // watch pc and when active do something
  monitor(pc).once('active', function() {
    // active and ready to go
  });
  ```

  Events provided by the monitor are as follows:

  - `active`: triggered when the connection is active and ready for use
  - `stable`: triggered when the connection is in a stable signalling state
  - `unstable`: trigger when the connection is renegotiating.

  It should be noted, that the monitor does a check when it is first passed
  an `RTCPeerConnection` object to see if the `active` state passes checks.
  If so, the `active` event will be fired in the next tick.

  If you require a synchronous check of a connection's "openness" then
  use the `monitor.isActive` test outlined below.
**/
var monitor = module.exports = function(pc, tag) {
  // create a new event emitter which will communicate events
  var mon = new EventEmitter();
  var currentState = getState(pc);
  var isActive = mon.active = currentState === W3C_STATES.ACTIVE;

  function checkState() {
    var newState = getState(pc, tag);
    debug('captured state change, new state: ' + newState +
      ', current state: ' + currentState);

    // update the monitor active flag
    mon.active = newState === W3C_STATES.ACTIVE;

    // if we have a state change, emit an event for the new state
    if (newState !== currentState) {
      mon.emit('change', newState);
      mon.emit(currentState = newState);
    }
  }

  // if the current state is active, trigger the active event
  if (isActive) {
    process.nextTick(mon.emit.bind(mon, W3C_STATES.ACTIVE, pc));
  }

  // start watching stuff on the pc
  pc.addEventListener('signalingstatechange', checkState);
  pc.addEventListener('iceconnectionstatechange', checkState);

  // patch in a stop method into the emitter
  mon.stop = function() {
    pc.removeEventListener('signalingstatechange', checkState);
    pc.removeEventListener('iceconnectionstatechange', checkState);
  };

  return mon;
};

/**
  ### monitor.getState(pc)

  Provides a unified state definition for the RTCPeerConnection based
  on a few checks.

  In emerging versions of the spec we have various properties such as
  `readyState` that provide a definitive answer on the state of the 
  connection.  In older versions we need to look at things like
  `signalingState` and `iceGatheringState` to make an educated guess 
  as to the connection state.
**/
var getState = monitor.getState = function(pc, tag) {
  var signalingState = pc && pc.signalingState;
  var iceGatheringState = pc && pc.iceGatheringState;
  var iceConnectionState = pc && pc.iceConnectionState;
  var localDesc;
  var remoteDesc;
  var state;
  var isActive;

  // if no connection return closed
  if (! pc) {
    return W3C_STATES.CLOSED;
  }

  // initialise the tag to an empty string if not provided
  tag = tag || '';

  // get the connection local and remote description
  localDesc = pc.localDescription;
  remoteDesc = pc.remoteDescription;

  // use the signalling state
  state = signalingState;

  // if state == 'stable' then investigate
  if (state === 'stable') {
    // initialise the state to new
    state = W3C_STATES.NEW;

    // if we have a local description and remote description flag
    // as pranswered
    if (localDesc && remoteDesc) {
      state = W3C_STATES.REMOTE_PRANSWER;
    }
  }

  // check to see if we are in the active state
  isActive = (state === W3C_STATES.REMOTE_PRANSWER) &&
    (iceConnectionState === 'connected');

  debug(tag + 'signaling state: ' + signalingState +
    ', iceGatheringState: ' + iceGatheringState +
    ', iceConnectionState: ' + iceConnectionState);
  
  return isActive ? W3C_STATES.ACTIVE : state;
};

/**
  ### monitor.isActive(pc) -> Boolean

  Test an `RTCPeerConnection` to see if it's currently open.  The test for
  "openness" looks at a combination of current `signalingState` and
  `iceGatheringState`.
**/
monitor.isActive = function(pc) {
  var isStable = pc && pc.signalingState === 'stable';

  // return with the connection is active
  return isStable && getState(pc) === W3C_STATES.ACTIVE;
};
},{"__browserify_process":12,"cog/logger":3,"events":11}],10:[function(require,module,exports){
var process=require("__browserify_process");/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = setImmediate;
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                }
            }));
        });
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (err, v) {
                results[x.index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        if (!keys.length) {
            return callback(null);
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (_keys(results).length === keys.length) {
                callback(null, results);
                callback = function () {};
            }
        });

        _each(keys, function (k) {
            var task = (tasks[k] instanceof Function) ? [tasks[k]]: tasks[k];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor !== Array) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (test()) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (!test()) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if(data.constructor !== Array) {
              data = [data];
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            }
        };
        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
                if(data.constructor !== Array) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain) cargo.drain();
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                callback.apply(null, memo[key]);
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.compose = function (/* functions... */) {
        var fns = Array.prototype.reverse.call(arguments);
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // AMD / RequireJS
    if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // Node.js
    else if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

},{"__browserify_process":12}],11:[function(require,module,exports){
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
      console.trace();
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

},{}],12:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9kYW1vLy5iYXNoaW5hdGUvaW5zdGFsbC9ub2RlLzAuMTAuMjQvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvY29kZS9ydGMuaW8vcnRjLmlvL2NvZGUvY29ubmVjdC5qcyIsIi9jb2RlL3J0Yy5pby9ydGMuaW8vbm9kZV9tb2R1bGVzL2NvZy9kZWZhdWx0cy5qcyIsIi9jb2RlL3J0Yy5pby9ydGMuaW8vbm9kZV9tb2R1bGVzL2NvZy9sb2dnZXIuanMiLCIvY29kZS9ydGMuaW8vcnRjLmlvL25vZGVfbW9kdWxlcy9ydGMtY29yZS9kZXRlY3QuanMiLCIvY29kZS9ydGMuaW8vcnRjLmlvL25vZGVfbW9kdWxlcy9ydGMvY291cGxlLmpzIiwiL2NvZGUvcnRjLmlvL3J0Yy5pby9ub2RlX21vZHVsZXMvcnRjL2RldGVjdC5qcyIsIi9jb2RlL3J0Yy5pby9ydGMuaW8vbm9kZV9tb2R1bGVzL3J0Yy9nZW5lcmF0b3JzLmpzIiwiL2NvZGUvcnRjLmlvL3J0Yy5pby9ub2RlX21vZHVsZXMvcnRjL2luZGV4LmpzIiwiL2NvZGUvcnRjLmlvL3J0Yy5pby9ub2RlX21vZHVsZXMvcnRjL21vbml0b3IuanMiLCIvY29kZS9ydGMuaW8vcnRjLmlvL25vZGVfbW9kdWxlcy9ydGMvbm9kZV9tb2R1bGVzL2FzeW5jL2xpYi9hc3luYy5qcyIsIi9ob21lL2RhbW8vLmJhc2hpbmF0ZS9pbnN0YWxsL25vZGUvMC4xMC4yNC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCIvaG9tZS9kYW1vLy5iYXNoaW5hdGUvaW5zdGFsbC9ub2RlLzAuMTAuMjQvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbnNlcnQtbW9kdWxlLWdsb2JhbHMvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIHJ0YyA9IHJlcXVpcmUoJ3J0YycpO1xuXG4vLyBjcmVhdGUgYSB3ZWJzb2NrZXQgY29ubmVjdGlvbiAodXNpbmcgc29ja2V0LmlvKSBvbiBvdXIgc2lnbmFsbGluZyBzZXJ2ZXJcbnZhciBzb2NrZXQgPSBpby5jb25uZWN0KCdodHRwOi8vcnRjanMuaW86NTAwMDEnKTtcblxuLy8gY3JlYXRlIGEgc2lnbmFsbGluZyBpbnN0YW5jZSB1c2luZyBvdXIgbWVzc2FnaW5nIGxheWVyIChzb2NrZXQuaW8pXG4vLyBhcyB0aGUgc29ja2V0IHVzZXMgJ21lc3NhZ2UnIGZvciAnZGF0YScgZXZlbnQgYW5kICdjb25uZWN0JyBmb3IgJ29wZW4nXG4vLyB3ZSBuZWVkIHRvIHRlbGwgdGhlIHNpZ25hbGxlciB3aGF0IHRvIGxvb2sgZm9yXG52YXIgc2lnbmFsbGVyID0gcnRjLnNpZ25hbGxlcihzb2NrZXQsIHtcbiAgZGF0YUV2ZW50OiAnbWVzc2FnZScsXG4gIG9wZW5FdmVudDogJ2Nvbm5lY3QnXG59KTtcblxuLy8gYW5ub3VuY2UgbXlzZWxmIG9uIHRoZSBzaWduYWxsaW5nIGNoYW5uZWxcbnNpZ25hbGxlci5hbm5vdW5jZSh7IG5hbWU6ICdCb2InIH0pO1xuXG4vLyBjcmVhdGUgYSBuZXcgcGVlciBjb25uZWN0aW9uICh3aXRoIGRlZmF1bHQgY29uc3RyYWludHMpXG4vLyB0aGF0IHdpbGwgYmUgdXNlZCBmb3Igb3VyIHBlZXIgY29ubmVjdGlvbiB3aXRoIHN1ZVxudmFyIGNvbm5lY3Rpb24gPSBydGMuY3JlYXRlQ29ubmVjdGlvbigpO1xuXG4vLyBvayBsZXQncyB0cnkgYW5kIGNyZWF0ZSB0aGlzIGNvbm5lY3Rpb25cbnZhciBjb3VwbGluZyA9IHJ0Yy5jb3VwbGUoY29ubmVjdGlvbiwgeyBuYW1lOiAnU3VlJyB9LCBzaWduYWxsZXIpO1xuXG4vLyB0cmFjayB0aGUgY29ubmVjdGlvbiBzdGF0ZVxuY291cGxpbmcub25jZSgnYWN0aXZlJywgZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCd3ZSBoYXZlIGNvbm5lY3RlZCcpO1xufSk7IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4jIyBjb2cvZGVmYXVsdHNcblxuYGBganNcbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJ2NvZy9kZWZhdWx0cycpO1xuYGBgXG5cbiMjIyBkZWZhdWx0cyh0YXJnZXQsICopXG5cblNoYWxsb3cgY29weSBvYmplY3QgcHJvcGVydGllcyBmcm9tIHRoZSBzdXBwbGllZCBzb3VyY2Ugb2JqZWN0cyAoKikgaW50b1xudGhlIHRhcmdldCBvYmplY3QsIHJldHVybmluZyB0aGUgdGFyZ2V0IG9iamVjdCBvbmNlIGNvbXBsZXRlZC4gIERvIG5vdCxcbmhvd2V2ZXIsIG92ZXJ3cml0ZSBleGlzdGluZyBrZXlzIHdpdGggbmV3IHZhbHVlczpcblxuYGBganNcbmRlZmF1bHRzKHsgYTogMSwgYjogMiB9LCB7IGM6IDMgfSwgeyBkOiA0IH0sIHsgYjogNSB9KSk7XG5gYGBcblxuU2VlIGFuIGV4YW1wbGUgb24gW3JlcXVpcmViaW5dKGh0dHA6Ly9yZXF1aXJlYmluLmNvbS8/Z2lzdD02MDc5NDc1KS5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0YXJnZXQpIHtcbiAgLy8gZW5zdXJlIHdlIGhhdmUgYSB0YXJnZXRcbiAgdGFyZ2V0ID0gdGFyZ2V0IHx8IHt9O1xuXG4gIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgc291cmNlcyBhbmQgY29weSB0byB0aGUgdGFyZ2V0XG4gIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKS5mb3JFYWNoKGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgIGlmICghIHNvdXJjZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICBpZiAodGFyZ2V0W3Byb3BdID09PSB2b2lkIDApIHtcbiAgICAgICAgdGFyZ2V0W3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHRhcmdldDtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMjIGNvZy9sb2dnZXJcblxuICBgYGBqc1xuICB2YXIgbG9nZ2VyID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpO1xuICBgYGBcblxuICBTaW1wbGUgYnJvd3NlciBsb2dnaW5nIG9mZmVyaW5nIHNpbWlsYXIgZnVuY3Rpb25hbGl0eSB0byB0aGVcbiAgW2RlYnVnXShodHRwczovL2dpdGh1Yi5jb20vdmlzaW9ubWVkaWEvZGVidWcpIG1vZHVsZS5cblxuICAjIyMgVXNhZ2VcblxuICBDcmVhdGUgeW91ciBzZWxmIGEgbmV3IGxvZ2dpbmcgaW5zdGFuY2UgYW5kIGdpdmUgaXQgYSBuYW1lOlxuXG4gIGBgYGpzXG4gIHZhciBkZWJ1ZyA9IGxvZ2dlcigncGhpbCcpO1xuICBgYGBcblxuICBOb3cgZG8gc29tZSBkZWJ1Z2dpbmc6XG5cbiAgYGBganNcbiAgZGVidWcoJ2hlbGxvJyk7XG4gIGBgYFxuXG4gIEF0IHRoaXMgc3RhZ2UsIG5vIGxvZyBvdXRwdXQgd2lsbCBiZSBnZW5lcmF0ZWQgYmVjYXVzZSB5b3VyIGxvZ2dlciBpc1xuICBjdXJyZW50bHkgZGlzYWJsZWQuICBFbmFibGUgaXQ6XG5cbiAgYGBganNcbiAgbG9nZ2VyLmVuYWJsZSgncGhpbCcpO1xuICBgYGBcblxuICBOb3cgZG8gc29tZSBtb3JlIGxvZ2dlcjpcblxuICBgYGBqc1xuICBkZWJ1ZygnT2ggdGhpcyBpcyBzbyBtdWNoIG5pY2VyIDopJyk7XG4gIC8vIC0tPiBwaGlsOiBPaCB0aGlzIGlzIHNvbWUgbXVjaCBuaWNlciA6KVxuICBgYGBcblxuICAjIyMgUmVmZXJlbmNlXG4qKi9cblxudmFyIGFjdGl2ZSA9IFtdO1xudmFyIHVubGVhc2hMaXN0ZW5lcnMgPSBbXTtcbnZhciB0YXJnZXRzID0gWyBjb25zb2xlIF07XG5cbi8qKlxuICAjIyMjIGxvZ2dlcihuYW1lKVxuXG4gIENyZWF0ZSBhIG5ldyBsb2dnaW5nIGluc3RhbmNlLlxuKiovXG52YXIgbG9nZ2VyID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihuYW1lKSB7XG4gIC8vIGluaXRpYWwgZW5hYmxlZCBjaGVja1xuICB2YXIgZW5hYmxlZCA9IGNoZWNrQWN0aXZlKCk7XG5cbiAgZnVuY3Rpb24gY2hlY2tBY3RpdmUoKSB7XG4gICAgcmV0dXJuIGVuYWJsZWQgPSBhY3RpdmUuaW5kZXhPZignKicpID49IDAgfHwgYWN0aXZlLmluZGV4T2YobmFtZSkgPj0gMDtcbiAgfVxuXG4gIC8vIHJlZ2lzdGVyIHRoZSBjaGVjayBhY3RpdmUgd2l0aCB0aGUgbGlzdGVuZXJzIGFycmF5XG4gIHVubGVhc2hMaXN0ZW5lcnNbdW5sZWFzaExpc3RlbmVycy5sZW5ndGhdID0gY2hlY2tBY3RpdmU7XG5cbiAgLy8gcmV0dXJuIHRoZSBhY3R1YWwgbG9nZ2luZyBmdW5jdGlvblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGEgc3RyaW5nIG1lc3NhZ2VcbiAgICBpZiAodHlwZW9mIGFyZ3NbMF0gPT0gJ3N0cmluZycgfHwgKGFyZ3NbMF0gaW5zdGFuY2VvZiBTdHJpbmcpKSB7XG4gICAgICBhcmdzWzBdID0gbmFtZSArICc6ICcgKyBhcmdzWzBdO1xuICAgIH1cblxuICAgIC8vIGlmIG5vdCBlbmFibGVkLCBiYWlsXG4gICAgaWYgKCEgZW5hYmxlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGxvZ1xuICAgIHRhcmdldHMuZm9yRWFjaChmdW5jdGlvbih0YXJnZXQpIHtcbiAgICAgIHRhcmdldC5sb2cuYXBwbHkodGFyZ2V0LCBhcmdzKTtcbiAgICB9KTtcbiAgfTtcbn07XG5cbi8qKlxuICAjIyMjIGxvZ2dlci5yZXNldCgpXG5cbiAgUmVzZXQgbG9nZ2luZyAocmVtb3ZlIHRoZSBkZWZhdWx0IGNvbnNvbGUgbG9nZ2VyLCBmbGFnIGFsbCBsb2dnZXJzIGFzXG4gIGluYWN0aXZlLCBldGMsIGV0Yy5cbioqL1xubG9nZ2VyLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gIC8vIHJlc2V0IHRhcmdldHMgYW5kIGFjdGl2ZSBzdGF0ZXNcbiAgdGFyZ2V0cyA9IFtdO1xuICBhY3RpdmUgPSBbXTtcblxuICByZXR1cm4gbG9nZ2VyLmVuYWJsZSgpO1xufTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyLnRvKHRhcmdldClcblxuICBBZGQgYSBsb2dnaW5nIHRhcmdldC4gIFRoZSBsb2dnZXIgbXVzdCBoYXZlIGEgYGxvZ2AgbWV0aG9kIGF0dGFjaGVkLlxuXG4qKi9cbmxvZ2dlci50byA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICB0YXJnZXRzID0gdGFyZ2V0cy5jb25jYXQodGFyZ2V0IHx8IFtdKTtcblxuICByZXR1cm4gbG9nZ2VyO1xufTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyLmVuYWJsZShuYW1lcyopXG5cbiAgRW5hYmxlIGxvZ2dpbmcgdmlhIHRoZSBuYW1lZCBsb2dnaW5nIGluc3RhbmNlcy4gIFRvIGVuYWJsZSBsb2dnaW5nIHZpYSBhbGxcbiAgaW5zdGFuY2VzLCB5b3UgY2FuIHBhc3MgYSB3aWxkY2FyZDpcblxuICBgYGBqc1xuICBsb2dnZXIuZW5hYmxlKCcqJyk7XG4gIGBgYFxuXG4gIF9fVE9ETzpfXyB3aWxkY2FyZCBlbmFibGVyc1xuKiovXG5sb2dnZXIuZW5hYmxlID0gZnVuY3Rpb24oKSB7XG4gIC8vIHVwZGF0ZSB0aGUgYWN0aXZlXG4gIGFjdGl2ZSA9IGFjdGl2ZS5jb25jYXQoW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcblxuICAvLyB0cmlnZ2VyIHRoZSB1bmxlYXNoIGxpc3RlbmVyc1xuICB1bmxlYXNoTGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24obGlzdGVuZXIpIHtcbiAgICBsaXN0ZW5lcigpO1xuICB9KTtcblxuICByZXR1cm4gbG9nZ2VyO1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIHdpbmRvdzogZmFsc2UgKi9cbi8qIGdsb2JhbCBuYXZpZ2F0b3I6IGZhbHNlICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGJyb3dzZXJzID0ge1xuICBjaHJvbWU6IC9DaHJvbSg/OmV8aXVtKVxcLyhbMC05XSspXFwuLyxcbiAgZmlyZWZveDogL0ZpcmVmb3hcXC8oWzAtOV0rKVxcLi8sXG4gIG9wZXJhOiAvT3BlcmFcXC8oWzAtOV0rKVxcLi9cbn07XG5cbi8qKlxuIyMgcnRjLWNvcmUvZGV0ZWN0XG5cbkEgYnJvd3NlciBkZXRlY3Rpb24gaGVscGVyIGZvciBhY2Nlc3NpbmcgcHJlZml4LWZyZWUgdmVyc2lvbnMgb2YgdGhlIHZhcmlvdXNcbldlYlJUQyB0eXBlcy5cblxuIyMjIEV4YW1wbGUgVXNhZ2VcblxuSWYgeW91IHdhbnRlZCB0byBnZXQgdGhlIG5hdGl2ZSBgUlRDUGVlckNvbm5lY3Rpb25gIHByb3RvdHlwZSBpbiBhbnkgYnJvd3NlclxueW91IGNvdWxkIGRvIHRoZSBmb2xsb3dpbmc6XG5cbmBgYGpzXG52YXIgZGV0ZWN0ID0gcmVxdWlyZSgncnRjLWNvcmUvZGV0ZWN0Jyk7IC8vIGFsc28gYXZhaWxhYmxlIGluIHJ0Yy9kZXRlY3RcbnZhciBSVENQZWVyQ29ubmVjdGlvbiA9IGRldGVjdCgnUlRDUGVlckNvbm5lY3Rpb24nKTtcbmBgYFxuXG5UaGlzIHdvdWxkIHByb3ZpZGUgd2hhdGV2ZXIgdGhlIGJyb3dzZXIgcHJlZml4ZWQgdmVyc2lvbiBvZiB0aGVcblJUQ1BlZXJDb25uZWN0aW9uIGlzIGF2YWlsYWJsZSAoYHdlYmtpdFJUQ1BlZXJDb25uZWN0aW9uYCxcbmBtb3pSVENQZWVyQ29ubmVjdGlvbmAsIGV0YykuXG4qKi9cbnZhciBkZXRlY3QgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCwgcHJlZml4ZXMpIHtcbiAgdmFyIHByZWZpeElkeDtcbiAgdmFyIHByZWZpeDtcbiAgdmFyIHRlc3ROYW1lO1xuICB2YXIgaG9zdE9iamVjdCA9IHRoaXMgfHwgKHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB1bmRlZmluZWQpO1xuXG4gIC8vIGlmIHdlIGhhdmUgbm8gaG9zdCBvYmplY3QsIHRoZW4gYWJvcnRcbiAgaWYgKCEgaG9zdE9iamVjdCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGluaXRpYWxpc2UgdG8gZGVmYXVsdCBwcmVmaXhlc1xuICAvLyAocmV2ZXJzZSBvcmRlciBhcyB3ZSB1c2UgYSBkZWNyZW1lbnRpbmcgZm9yIGxvb3ApXG4gIHByZWZpeGVzID0gKHByZWZpeGVzIHx8IFsnbXMnLCAnbycsICdtb3onLCAnd2Via2l0J10pLmNvbmNhdCgnJyk7XG5cbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBwcmVmaXhlcyBhbmQgcmV0dXJuIHRoZSBjbGFzcyBpZiBmb3VuZCBpbiBnbG9iYWxcbiAgZm9yIChwcmVmaXhJZHggPSBwcmVmaXhlcy5sZW5ndGg7IHByZWZpeElkeC0tOyApIHtcbiAgICBwcmVmaXggPSBwcmVmaXhlc1twcmVmaXhJZHhdO1xuXG4gICAgLy8gY29uc3RydWN0IHRoZSB0ZXN0IGNsYXNzIG5hbWVcbiAgICAvLyBpZiB3ZSBoYXZlIGEgcHJlZml4IGVuc3VyZSB0aGUgdGFyZ2V0IGhhcyBhbiB1cHBlcmNhc2UgZmlyc3QgY2hhcmFjdGVyXG4gICAgLy8gc3VjaCB0aGF0IGEgdGVzdCBmb3IgZ2V0VXNlck1lZGlhIHdvdWxkIHJlc3VsdCBpbiBhXG4gICAgLy8gc2VhcmNoIGZvciB3ZWJraXRHZXRVc2VyTWVkaWFcbiAgICB0ZXN0TmFtZSA9IHByZWZpeCArIChwcmVmaXggP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHRhcmdldC5zbGljZSgxKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0KTtcblxuICAgIGlmICh0eXBlb2YgaG9zdE9iamVjdFt0ZXN0TmFtZV0gIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIC8vIHVwZGF0ZSB0aGUgbGFzdCB1c2VkIHByZWZpeFxuICAgICAgZGV0ZWN0LmJyb3dzZXIgPSBkZXRlY3QuYnJvd3NlciB8fCBwcmVmaXgudG9Mb3dlckNhc2UoKTtcblxuICAgICAgLy8gcmV0dXJuIHRoZSBob3N0IG9iamVjdCBtZW1iZXJcbiAgICAgIHJldHVybiBob3N0T2JqZWN0W3RhcmdldF0gPSBob3N0T2JqZWN0W3Rlc3ROYW1lXTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIGRldGVjdCBtb3ppbGxhICh5ZXMsIHRoaXMgZmVlbHMgZGlydHkpXG5kZXRlY3QubW96ID0gdHlwZW9mIG5hdmlnYXRvciAhPSAndW5kZWZpbmVkJyAmJiAhIW5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWE7XG5cbi8vIHRpbWUgdG8gZG8gc29tZSB1c2VyYWdlbnQgc25pZmZpbmcgLSBpdCBmZWVscyBkaXJ0eSBiZWNhdXNlIGl0IGlzIDovXG5pZiAodHlwZW9mIG5hdmlnYXRvciAhPSAndW5kZWZpbmVkJykge1xuICBPYmplY3Qua2V5cyhicm93c2VycykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICB2YXIgbWF0Y2ggPSBicm93c2Vyc1trZXldLmV4ZWMobmF2aWdhdG9yLnVzZXJBZ2VudCk7XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBkZXRlY3QuYnJvd3NlciA9IGtleTtcbiAgICAgIGRldGVjdC5icm93c2VyVmVyc2lvbiA9IGRldGVjdC52ZXJzaW9uID0gcGFyc2VJbnQobWF0Y2hbMV0sIDEwKTtcbiAgICB9XG4gIH0pO1xufVxuZWxzZSB7XG4gIGRldGVjdC5icm93c2VyID0gJ25vZGUnO1xuICBkZXRlY3QuYnJvd3NlclZlcnNpb24gPSBkZXRlY3QudmVyc2lvbiA9ICc/JzsgLy8gVE9ETzogZ2V0IG5vZGUgdmVyc2lvblxufSIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgUlRDSWNlQ2FuZGlkYXRlOiBmYWxzZSAqL1xuLyogZ2xvYmFsIFJUQ1Nlc3Npb25EZXNjcmlwdGlvbjogZmFsc2UgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpKCdjb3VwbGUnKTtcbnZhciBhc3luYyA9IHJlcXVpcmUoJ2FzeW5jJyk7XG52YXIgbW9uaXRvciA9IHJlcXVpcmUoJy4vbW9uaXRvcicpO1xudmFyIGRldGVjdCA9IHJlcXVpcmUoJy4vZGV0ZWN0Jyk7XG5cbi8qKlxuICAjIyBydGMvY291cGxlXG5cbiAgIyMjIGNvdXBsZShwYywgdGFyZ2V0SWQsIHNpZ25hbGxlciwgb3B0cz8pXG5cbiAgQ291cGxlIGEgV2ViUlRDIGNvbm5lY3Rpb24gd2l0aCBhbm90aGVyIHdlYnJ0YyBjb25uZWN0aW9uIGlkZW50aWZpZWQgYnlcbiAgYHRhcmdldElkYCB2aWEgdGhlIHNpZ25hbGxlci5cblxuICBUaGUgZm9sbG93aW5nIG9wdGlvbnMgY2FuIGJlIHByb3ZpZGVkIGluIHRoZSBgb3B0c2AgYXJndW1lbnQ6XG5cbiAgLSBgc2RwZmlsdGVyYCAoZGVmYXVsdDogbnVsbClcblxuICAgIEEgc2ltcGxlIGZ1bmN0aW9uIGZvciBmaWx0ZXJpbmcgU0RQIGFzIHBhcnQgb2YgdGhlIHBlZXJcbiAgICBjb25uZWN0aW9uIGhhbmRzaGFrZSAoc2VlIHRoZSBVc2luZyBGaWx0ZXJzIGRldGFpbHMgYmVsb3cpLlxuXG4gIC0gYG1heEF0dGVtcHRzYCAoZGVmYXVsdDogMSlcblxuICAgIEhvdyBtYW55IHRpbWVzIHNob3VsZCBuZWdvdGlhdGlvbiBiZSBhdHRlbXB0ZWQuICBUaGlzIGlzXG4gICAgKipleHBlcmltZW50YWwqKiBmdW5jdGlvbmFsaXR5IGZvciBhdHRlbXB0aW5nIGNvbm5lY3Rpb24gbmVnb3RpYXRpb25cbiAgICBpZiBpdCBmYWlscy5cblxuICAtIGBhdHRlbXB0RGVsYXlgIChkZWZhdWx0OiAzMDAwKVxuXG4gICAgVGhlIGFtb3VudCBvZiBtcyB0byB3YWl0IGJldHdlZW4gY29ubmVjdGlvbiBuZWdvdGlhdGlvbiBhdHRlbXB0cy5cblxuICAjIyMjIEV4YW1wbGUgVXNhZ2VcblxuICBgYGBqc1xuICB2YXIgY291cGxlID0gcmVxdWlyZSgncnRjL2NvdXBsZScpO1xuXG4gIGNvdXBsZShwYywgJzU0ODc5OTY1LWNlNDMtNDI2ZS1hOGVmLTA5YWMxZTM5YTE2ZCcsIHNpZ25hbGxlcik7XG4gIGBgYFxuXG4gICMjIyMgVXNpbmcgRmlsdGVyc1xuXG4gIEluIGNlcnRhaW4gaW5zdGFuY2VzIHlvdSBtYXkgd2lzaCB0byBtb2RpZnkgdGhlIHJhdyBTRFAgdGhhdCBpcyBwcm92aWRlZFxuICBieSB0aGUgYGNyZWF0ZU9mZmVyYCBhbmQgYGNyZWF0ZUFuc3dlcmAgY2FsbHMuICBUaGlzIGNhbiBiZSBkb25lIGJ5IHBhc3NpbmdcbiAgYSBgc2RwZmlsdGVyYCBmdW5jdGlvbiAob3IgYXJyYXkpIGluIHRoZSBvcHRpb25zLiAgRm9yIGV4YW1wbGU6XG5cbiAgYGBganNcbiAgLy8gcnVuIHRoZSBzZHAgZnJvbSB0aHJvdWdoIGEgbG9jYWwgdHdlYWtTZHAgZnVuY3Rpb24uXG4gIGNvdXBsZShwYywgJzU0ODc5OTY1LWNlNDMtNDI2ZS1hOGVmLTA5YWMxZTM5YTE2ZCcsIHNpZ25hbGxlciwge1xuICAgIHNkcGZpbHRlcjogdHdlYWtTZHBcbiAgfSk7XG4gIGBgYFxuXG4qKi9cbmZ1bmN0aW9uIGNvdXBsZShjb25uLCB0YXJnZXRJZCwgc2lnbmFsbGVyLCBvcHRzKSB7XG4gIC8vIGNyZWF0ZSBhIG1vbml0b3IgZm9yIHRoZSBjb25uZWN0aW9uXG4gIHZhciBtb24gPSBtb25pdG9yKGNvbm4pO1xuICB2YXIgYmxvY2tJZDtcbiAgdmFyIHN0YWdlcyA9IHt9O1xuICB2YXIgcXVldWVkQ2FuZGlkYXRlcyA9IFtdO1xuICB2YXIgc2RwRmlsdGVyID0gKG9wdHMgfHwge30pLnNkcGZpbHRlcjtcblxuICAvLyByZXRyeSBpbXBsZW1lbnRhdGlvblxuICB2YXIgb2ZmZXJUaW1lb3V0O1xuXG4gIC8vIGlmIHRoZSBzaWduYWxsZXIgZG9lcyBub3Qgc3VwcG9ydCB0aGlzIGlzTWFzdGVyIGZ1bmN0aW9uIHRocm93IGFuXG4gIC8vIGV4Y2VwdGlvblxuICBpZiAodHlwZW9mIHNpZ25hbGxlci5pc01hc3RlciAhPSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdydGMtc2lnbmFsbGVyIGluc3RhbmNlID49IDAuMTQuMCByZXF1aXJlZCcpO1xuICB9XG5cbiAgLy8gaW5pdGlsYWlzZSB0aGUgbmVnb3RpYXRpb24gaGVscGVyc1xuICB2YXIgaXNNYXN0ZXIgPSBzaWduYWxsZXIuaXNNYXN0ZXIodGFyZ2V0SWQpO1xuICB2YXIgY3JlYXRlT2ZmZXIgPSBuZWdvdGlhdGUoJ2NyZWF0ZU9mZmVyJywgaXNNYXN0ZXIsIGNoZWNrVmFsaWRPZmZlclN0YXRlKTtcbiAgdmFyIGNyZWF0ZUFuc3dlciA9IG5lZ290aWF0ZSgnY3JlYXRlQW5zd2VyJywgdHJ1ZSk7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgcHJvY2Vzc2luZyBxdWV1ZSAob25lIGF0IGEgdGltZSBwbGVhc2UpXG4gIHZhciBxID0gYXN5bmMucXVldWUoZnVuY3Rpb24odGFzaywgY2IpIHtcbiAgICAvLyBpZiB0aGUgdGFzayBoYXMgbm8gb3BlcmF0aW9uLCB0aGVuIHRyaWdnZXIgdGhlIGNhbGxiYWNrIGltbWVkaWF0ZWx5XG4gICAgaWYgKHR5cGVvZiB0YXNrLm9wICE9ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBjYigpO1xuICAgIH1cblxuICAgIC8vIHByb2Nlc3MgdGhlIHRhc2sgb3BlcmF0aW9uXG4gICAgdGFzay5vcCh0YXNrLCBjYik7XG4gIH0sIDEpO1xuXG4gIC8vIGluaXRpYWxpc2Ugc2Vzc2lvbiBkZXNjcmlwdGlvbiBhbmQgaWNlY2FuZGlkYXRlIG9iamVjdHNcbiAgdmFyIFJUQ1Nlc3Npb25EZXNjcmlwdGlvbiA9IChvcHRzIHx8IHt9KS5SVENTZXNzaW9uRGVzY3JpcHRpb24gfHxcbiAgICBkZXRlY3QoJ1JUQ1Nlc3Npb25EZXNjcmlwdGlvbicpO1xuXG4gIHZhciBSVENJY2VDYW5kaWRhdGUgPSAob3B0cyB8fCB7fSkuUlRDSWNlQ2FuZGlkYXRlIHx8XG4gICAgZGV0ZWN0KCdSVENJY2VDYW5kaWRhdGUnKTtcblxuICBmdW5jdGlvbiBhYm9ydChzdGFnZSwgc2RwLCBjYikge1xuICAgIHZhciBzdGFnZUhhbmRsZXIgPSBzdGFnZXNbc3RhZ2VdO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGVycikge1xuICAgICAgLy8gbG9nIHRoZSBlcnJvclxuICAgICAgY29uc29sZS5lcnJvcigncnRjL2NvdXBsZSBlcnJvciAoJyArIHN0YWdlICsgJyk6ICcsIGVycik7XG5cbiAgICAgIGlmICh0eXBlb2YgY2IgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjYihlcnIpO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBjaGVja1ZhbGlkT2ZmZXJTdGF0ZSgpIHtcbiAgICB2YXIgc2lnU3RhdGUgPSBjb25uLnNpZ25hbGluZ1N0YXRlO1xuICAgIHZhciBnYXRoZXJTdGF0ZSA9IGNvbm4uaWNlR2F0aGVyaW5nU3RhdGU7XG4gICAgdmFyIGNvbm5TdGF0ZSA9IGNvbm4uaWNlQ29ubmVjdGlvblN0YXRlO1xuXG4gICAgZnVuY3Rpb24gd2FpdEZvclN0YWJsZSgpIHtcbiAgICAgIGlmIChjb25uLnNpZ25hbGluZ1N0YXRlID09PSAnc3RhYmxlJykge1xuICAgICAgICBxLnB1c2goeyBvcDogY3JlYXRlT2ZmZXIgfSk7XG4gICAgICB9XG5cbiAgICAgIG1vbi5yZW1vdmVMaXN0ZW5lcignY2hhbmdlJywgd2FpdEZvclN0YWJsZSk7XG4gICAgfVxuXG4gICAgaWYgKHNpZ1N0YXRlICE9PSAnc3RhYmxlJykge1xuICAgICAgZGVidWcoJ2Nhbm5vdCBjcmVhdGUgb2ZmZXIsIHNpZ25hbGluZyBzdGF0ZSAhPSBzdGFibGUsIHdpbGwgcmV0cnknKTtcbiAgICAgIG1vbi5vbignY2hhbmdlJywgd2FpdEZvclN0YWJsZSk7XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBpZiB0aGUgY29ubmVjdGlvbiBzdGF0ZSBpcyBjaGVja2luZyB3ZSBzaG91bGQgd2FpdCBiZWZvcmUgY3JlYXRpbmdcbiAgICAvLyBhbiBvZmZlciBhbHNvXG4gICAgaWYgKGNvbm5TdGF0ZSA9PT0gJ2NoZWNraW5nJykge1xuICAgICAgZGVidWcoJ2Nvbm5lY3Rpb24gc3RhdGUgaXMgY2hlY2tpbmcsIHdpbGwgd2FpdCB0byBjcmVhdGUgYSBuZXcgb2ZmZXInKTtcbiAgICAgIG1vbi5vbmNlKCdhY3RpdmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcS5wdXNoKHsgb3A6IGNyZWF0ZU9mZmVyIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gY29uc29sZS5sb2coJ2NoZWNraW5nIGdhdGhlciBzdGF0ZTogJyArIGdhdGhlclN0YXRlKTtcbiAgICAvLyBpZiAoZ2F0aGVyU3RhdGUgIT09ICduZXcnICYmIGdhdGhlclN0YXRlICE9PSAnY29tcGxldGUnKSB7XG4gICAgLy8gICBjb25zb2xlLndhcm4oJ2Nhbm5vdCBjcmVhdGUgb2ZmZXIsIGludGVybWVkaWF0ZSBpY2UgZ2F0aGVyaW5nIHN0YXRlLCB3aWxsIHJldHJ5JywgY29ubik7XG4gICAgLy8gICBtb24ub25jZSgnYWN0aXZlJywgZnVuY3Rpb24oKSB7XG4gICAgLy8gICAgIGNvbnNvbGUubG9nKCdjb25uZWN0aW9uIGlzIGFjdGl2ZScpO1xuICAgIC8vICAgICBxLnB1c2goeyBvcDogY3JlYXRlT2ZmZXIgfSk7XG4gICAgLy8gICB9KTtcblxuICAgIC8vICAgcmV0dXJuIGZhbHNlO1xuICAgIC8vIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgZnVuY3Rpb24gbmVnb3RpYXRlKG1ldGhvZE5hbWUsIGFsbG93ZWQsIHByZWZsaWdodENoZWNrcykge1xuICAgIHZhciBoc0RlYnVnID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpKCdoYW5kc2hha2UtJyArIG1ldGhvZE5hbWUpO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKHRhc2ssIGNiKSB7XG4gICAgICAvLyBpZiB0aGUgdGFzayBpcyBub3QgYWxsb3dlZCwgdGhlbiBzZW5kIGEgbmVnb3RpYXRlIHJlcXVlc3QgdG8gb3VyXG4gICAgICAvLyBwZWVyXG4gICAgICBpZiAoISBhbGxvd2VkKSB7XG4gICAgICAgIHNpZ25hbGxlci50byh0YXJnZXRJZCkuc2VuZCgnL25lZ290aWF0ZScpO1xuICAgICAgICByZXR1cm4gY2IoKTtcbiAgICAgIH1cblxuICAgICAgLy8gaWYgd2UgYXJlIGNyZWF0aW5nIGFuIG9mZmVyIGFuZCBub3Qgc3RhYmxlLCB0aGVuIHdhaXQgdW50aWwgc3RhYmxlXG4gICAgICBpZiAodHlwZW9mIHByZWZsaWdodENoZWNrcyA9PSAnZnVuY3Rpb24nICYmICghIHByZWZsaWdodENoZWNrcygpKSkge1xuICAgICAgICByZXR1cm4gY2IoKTtcbiAgICAgIH1cblxuICAgICAgLy8gY3JlYXRlIHRoZSBvZmZlclxuICAgICAgZGVidWcoJ2NhbGxpbmcgJyArIG1ldGhvZE5hbWUpO1xuICAgICAgY29ublttZXRob2ROYW1lXShcbiAgICAgICAgZnVuY3Rpb24oZGVzYykge1xuXG4gICAgICAgICAgLy8gaWYgYSBmaWx0ZXIgaGFzIGJlZW4gc3BlY2lmaWVkLCB0aGVuIGFwcGx5IHRoZSBmaWx0ZXJcbiAgICAgICAgICBpZiAodHlwZW9mIHNkcEZpbHRlciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBkZXNjLnNkcCA9IHNkcEZpbHRlcihkZXNjLnNkcCwgY29ubiwgbWV0aG9kTmFtZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gaW5pdGlhbGlzZSB0aGUgbG9jYWwgZGVzY3JpcHRpb25cbiAgICAgICAgICBjb25uLnNldExvY2FsRGVzY3JpcHRpb24oXG4gICAgICAgICAgICBkZXNjLFxuXG4gICAgICAgICAgICAvLyBpZiBzdWNjZXNzZnVsLCB0aGVuIHNlbmQgdGhlIHNkcCBvdmVyIHRoZSB3aXJlXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgLy8gc2VuZCB0aGUgc2RwXG4gICAgICAgICAgICAgIHNpZ25hbGxlci50byh0YXJnZXRJZCkuc2VuZCgnL3NkcCcsIGRlc2MpO1xuXG4gICAgICAgICAgICAgIC8vIGNhbGxiYWNrXG4gICAgICAgICAgICAgIGNiKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvLyBvbiBlcnJvciwgYWJvcnRcbiAgICAgICAgICAgIGFib3J0KG1ldGhvZE5hbWUsIGRlc2Muc2RwLCBjYilcbiAgICAgICAgICApO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIG9uIGVycm9yLCBhYm9ydFxuICAgICAgICBhYm9ydChtZXRob2ROYW1lLCAnJywgY2IpXG4gICAgICApO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVMb2NhbENhbmRpZGF0ZShldnQpIHtcbiAgICBpZiAoZXZ0LmNhbmRpZGF0ZSkge1xuICAgICAgc2lnbmFsbGVyLnRvKHRhcmdldElkKS5zZW5kKCcvY2FuZGlkYXRlJywgZXZ0LmNhbmRpZGF0ZSk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGNvbm4uaWNlR2F0aGVyaW5nU3RhdGUgPT09ICdjb21wbGV0ZScpIHtcbiAgICAgIGRlYnVnKCdpY2UgZ2F0aGVyaW5nIHN0YXRlIGNvbXBsZXRlJylcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVSZW1vdGVDYW5kaWRhdGUoZGF0YSwgc3JjKSB7XG4gICAgaWYgKCghIHNyYykgfHwgKHNyYy5pZCAhPT0gdGFyZ2V0SWQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCEgY29ubi5yZW1vdGVEZXNjcmlwdGlvbikge1xuICAgICAgcmV0dXJuIHF1ZXVlZENhbmRpZGF0ZXMucHVzaChkYXRhKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgY29ubi5hZGRJY2VDYW5kaWRhdGUobmV3IFJUQ0ljZUNhbmRpZGF0ZShkYXRhKSk7XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICBkZWJ1ZygnaW52YWxpZGF0ZSBjYW5kaWRhdGUgc3BlY2lmaWVkOiAnLCBkYXRhKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVTZHAoZGF0YSwgc3JjKSB7XG4gICAgLy8gaWYgdGhlIHNvdXJjZSBpcyB1bmtub3duIG9yIG5vdCBhIG1hdGNoLCB0aGVuIGFib3J0XG4gICAgaWYgKCghIHNyYykgfHwgKHNyYy5pZCAhPT0gdGFyZ2V0SWQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gcHJpb3JpdGl6ZSBzZXR0aW5nIHRoZSByZW1vdGUgZGVzY3JpcHRpb24gb3BlcmF0aW9uXG4gICAgcS5wdXNoKHsgb3A6IGZ1bmN0aW9uKHRhc2ssIGNiKSB7XG4gICAgICAvLyB1cGRhdGUgdGhlIHJlbW90ZSBkZXNjcmlwdGlvblxuICAgICAgLy8gb25jZSBzdWNjZXNzZnVsLCBzZW5kIHRoZSBhbnN3ZXJcbiAgICAgIGNvbm4uc2V0UmVtb3RlRGVzY3JpcHRpb24oXG4gICAgICAgIG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24oZGF0YSksXG5cbiAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgLy8gYXBwbHkgYW55IHF1ZXVlZCBjYW5kaWRhdGVzXG4gICAgICAgICAgcXVldWVkQ2FuZGlkYXRlcy5zcGxpY2UoMCkuZm9yRWFjaChmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICBkZWJ1ZygnYXBwbHlpbmcgcXVldWVkIGNhbmRpZGF0ZScpO1xuICAgICAgICAgICAgY29ubi5hZGRJY2VDYW5kaWRhdGUobmV3IFJUQ0ljZUNhbmRpZGF0ZShkYXRhKSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBjcmVhdGUgdGhlIGFuc3dlclxuICAgICAgICAgIGlmIChkYXRhLnR5cGUgPT09ICdvZmZlcicpIHtcbiAgICAgICAgICAgIHF1ZXVlKGNyZWF0ZUFuc3dlcikoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyB0cmlnZ2VyIHRoZSBjYWxsYmFja1xuICAgICAgICAgIGNiKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYWJvcnQoZGF0YS50eXBlID09PSAnb2ZmZXInID8gJ2NyZWF0ZUFuc3dlcicgOiAnY3JlYXRlT2ZmZXInLCBkYXRhLnNkcCwgY2IpXG4gICAgICApO1xuICAgIH19KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHF1ZXVlKG5lZ290aWF0ZVRhc2spIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBxLnB1c2goW1xuICAgICAgICB7IG9wOiBuZWdvdGlhdGVUYXNrIH1cbiAgICAgIF0pO1xuICAgIH07XG4gIH1cblxuICAvLyBpZiB0aGUgdGFyZ2V0IGlkIGlzIG5vdCBhIHN0cmluZywgdGhlbiBjb21wbGFpblxuICBpZiAodHlwZW9mIHRhcmdldElkICE9ICdzdHJpbmcnICYmICghICh0YXJnZXRJZCBpbnN0YW5jZW9mIFN0cmluZykpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCcybmQgYXJndW1lbnQgKHRhcmdldElkKSBzaG91bGQgYmUgYSBzdHJpbmcnKTtcbiAgfVxuXG4gIC8vIHdoZW4gcmVnb3RpYXRpb24gaXMgbmVlZGVkIGxvb2sgZm9yIHRoZSBwZWVyXG4gIGNvbm4uYWRkRXZlbnRMaXN0ZW5lcignbmVnb3RpYXRpb25uZWVkZWQnLCBmdW5jdGlvbigpIHtcbiAgICBkZWJ1ZygncmVuZWdvdGlhdGlvbiByZXF1aXJlZCwgd2lsbCBjcmVhdGUgb2ZmZXIgaW4gNTBtcycpO1xuICAgIGNsZWFyVGltZW91dChvZmZlclRpbWVvdXQpO1xuICAgIG9mZmVyVGltZW91dCA9IHNldFRpbWVvdXQocXVldWUoY3JlYXRlT2ZmZXIpLCA1MCk7XG4gIH0pO1xuXG4gIGNvbm4uYWRkRXZlbnRMaXN0ZW5lcignaWNlY2FuZGlkYXRlJywgaGFuZGxlTG9jYWxDYW5kaWRhdGUpO1xuXG4gIC8vIHdoZW4gd2UgcmVjZWl2ZSBzZHAsIHRoZW5cbiAgc2lnbmFsbGVyLm9uKCdzZHAnLCBoYW5kbGVTZHApO1xuICBzaWduYWxsZXIub24oJ2NhbmRpZGF0ZScsIGhhbmRsZVJlbW90ZUNhbmRpZGF0ZSk7XG5cbiAgLy8gaWYgdGhpcyBpcyBhIG1hc3RlciBjb25uZWN0aW9uLCBsaXN0ZW4gZm9yIG5lZ290aWF0ZSBldmVudHNcbiAgaWYgKGlzTWFzdGVyKSB7XG4gICAgc2lnbmFsbGVyLm9uKCduZWdvdGlhdGUnLCBmdW5jdGlvbihzcmMpIHtcbiAgICAgIGlmIChzcmMuaWQgPT09IHRhcmdldElkKSB7XG4gICAgICAgIGRlYnVnKCdnb3QgbmVnb3RpYXRlIHJlcXVlc3QgZnJvbSAnICsgdGFyZ2V0SWQgKyAnLCBjcmVhdGluZyBvZmZlcicpO1xuICAgICAgICBxLnB1c2goeyBvcDogY3JlYXRlT2ZmZXIgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvLyB3aGVuIHRoZSBjb25uZWN0aW9uIGNsb3NlcywgcmVtb3ZlIGV2ZW50IGhhbmRsZXJzXG4gIG1vbi5vbmNlKCdjbG9zZWQnLCBmdW5jdGlvbigpIHtcbiAgICBkZWJ1ZygnY2xvc2VkJyk7XG5cbiAgICAvLyByZW1vdmUgbGlzdGVuZXJzXG4gICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCdzZHAnLCBoYW5kbGVTZHApO1xuICAgIHNpZ25hbGxlci5yZW1vdmVMaXN0ZW5lcignY2FuZGlkYXRlJywgaGFuZGxlUmVtb3RlQ2FuZGlkYXRlKTtcbiAgfSk7XG5cbiAgLy8gcGF0Y2ggaW4gdGhlIGNyZWF0ZSBvZmZlciBmdW5jdGlvbnNcbiAgbW9uLmNyZWF0ZU9mZmVyID0gcXVldWUoY3JlYXRlT2ZmZXIpO1xuXG4gIHJldHVybiBtb247XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY291cGxlOyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIyBydGMvZGV0ZWN0XG5cbiAgUHJvdmlkZSB0aGUgW3J0Yy1jb3JlL2RldGVjdF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtY29yZSNkZXRlY3QpIFxuICBmdW5jdGlvbmFsaXR5LlxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJ3J0Yy1jb3JlL2RldGVjdCcpOyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKSgnZ2VuZXJhdG9ycycpO1xudmFyIGRldGVjdCA9IHJlcXVpcmUoJy4vZGV0ZWN0Jyk7XG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCdjb2cvZGVmYXVsdHMnKTtcblxudmFyIG1hcHBpbmdzID0ge1xuICBjcmVhdGU6IHtcbiAgICAvLyBkYXRhIGVuYWJsZXJcbiAgICBkYXRhOiBmdW5jdGlvbihjKSB7XG4gICAgICBpZiAoISBkZXRlY3QubW96KSB7XG4gICAgICAgIGMub3B0aW9uYWwgPSAoYy5vcHRpb25hbCB8fCBbXSkuY29uY2F0KHsgUnRwRGF0YUNoYW5uZWxzOiB0cnVlIH0pO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBkdGxzOiBmdW5jdGlvbihjKSB7XG4gICAgICBpZiAoISBkZXRlY3QubW96KSB7XG4gICAgICAgIGMub3B0aW9uYWwgPSAoYy5vcHRpb25hbCB8fCBbXSkuY29uY2F0KHsgRHRsc1NydHBLZXlBZ3JlZW1lbnQ6IHRydWUgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vLyBpbml0aWFsaXNlIGtub3duIGZsYWdzXG52YXIga25vd25GbGFncyA9IFsndmlkZW8nLCAnYXVkaW8nLCAnZGF0YSddO1xuXG4vKipcbiAgIyMgcnRjL2dlbmVyYXRvcnNcblxuICBUaGUgZ2VuZXJhdG9ycyBwYWNrYWdlIHByb3ZpZGVzIHNvbWUgdXRpbGl0eSBtZXRob2RzIGZvciBnZW5lcmF0aW5nXG4gIGNvbnN0cmFpbnQgb2JqZWN0cyBhbmQgc2ltaWxhciBjb25zdHJ1Y3RzLlxuXG4gIGBgYGpzXG4gIHZhciBnZW5lcmF0b3JzID0gcmVxdWlyZSgncnRjL2dlbmVyYXRvcnMnKTtcbiAgYGBgXG5cbioqL1xuXG4vKipcbiAgIyMjIGdlbmVyYXRvcnMuY29uZmlnKGNvbmZpZylcblxuICBHZW5lcmF0ZSBhIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHN1aXRhYmxlIGZvciBwYXNzaW5nIGludG8gYW4gVzNDXG4gIFJUQ1BlZXJDb25uZWN0aW9uIGNvbnN0cnVjdG9yIGZpcnN0IGFyZ3VtZW50LCBiYXNlZCBvbiBvdXIgY3VzdG9tIGNvbmZpZy5cbioqL1xuZXhwb3J0cy5jb25maWcgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgcmV0dXJuIGRlZmF1bHRzKGNvbmZpZywge1xuICAgIGljZVNlcnZlcnM6IFtdXG4gIH0pO1xufTtcblxuLyoqXG4gICMjIyBnZW5lcmF0b3JzLmNvbm5lY3Rpb25Db25zdHJhaW50cyhmbGFncywgY29uc3RyYWludHMpXG5cbiAgVGhpcyBpcyBhIGhlbHBlciBmdW5jdGlvbiB0aGF0IHdpbGwgZ2VuZXJhdGUgYXBwcm9wcmlhdGUgY29ubmVjdGlvblxuICBjb25zdHJhaW50cyBmb3IgYSBuZXcgYFJUQ1BlZXJDb25uZWN0aW9uYCBvYmplY3Qgd2hpY2ggaXMgY29uc3RydWN0ZWRcbiAgaW4gdGhlIGZvbGxvd2luZyB3YXk6XG5cbiAgYGBganNcbiAgdmFyIGNvbm4gPSBuZXcgUlRDUGVlckNvbm5lY3Rpb24oZmxhZ3MsIGNvbnN0cmFpbnRzKTtcbiAgYGBgXG5cbiAgSW4gbW9zdCBjYXNlcyB0aGUgY29uc3RyYWludHMgb2JqZWN0IGNhbiBiZSBsZWZ0IGVtcHR5LCBidXQgd2hlbiBjcmVhdGluZ1xuICBkYXRhIGNoYW5uZWxzIHNvbWUgYWRkaXRpb25hbCBvcHRpb25zIGFyZSByZXF1aXJlZC4gIFRoaXMgZnVuY3Rpb25cbiAgY2FuIGdlbmVyYXRlIHRob3NlIGFkZGl0aW9uYWwgb3B0aW9ucyBhbmQgaW50ZWxsaWdlbnRseSBjb21iaW5lIGFueVxuICB1c2VyIGRlZmluZWQgY29uc3RyYWludHMgKGluIGBjb25zdHJhaW50c2ApIHdpdGggc2hvcnRoYW5kIGZsYWdzIHRoYXRcbiAgbWlnaHQgYmUgcGFzc2VkIHdoaWxlIHVzaW5nIHRoZSBgcnRjLmNyZWF0ZUNvbm5lY3Rpb25gIGhlbHBlci5cbioqL1xuZXhwb3J0cy5jb25uZWN0aW9uQ29uc3RyYWludHMgPSBmdW5jdGlvbihmbGFncywgY29uc3RyYWludHMpIHtcbiAgdmFyIGdlbmVyYXRlZCA9IHt9O1xuICB2YXIgbSA9IG1hcHBpbmdzLmNyZWF0ZTtcbiAgdmFyIG91dDtcblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIGZsYWdzIGFuZCBhcHBseSB0aGUgY3JlYXRlIG1hcHBpbmdzXG4gIE9iamVjdC5rZXlzKGZsYWdzIHx8IHt9KS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmIChtW2tleV0pIHtcbiAgICAgIG1ba2V5XShnZW5lcmF0ZWQpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gZ2VuZXJhdGUgdGhlIGNvbm5lY3Rpb24gY29uc3RyYWludHNcbiAgb3V0ID0gZGVmYXVsdHMoe30sIGNvbnN0cmFpbnRzLCBnZW5lcmF0ZWQpO1xuICBkZWJ1ZygnZ2VuZXJhdGVkIGNvbm5lY3Rpb24gY29uc3RyYWludHM6ICcsIG91dCk7XG5cbiAgcmV0dXJuIG91dDtcbn07XG5cbi8qKlxuICAjIyMgcGFyc2VGbGFncyhvcHRzKVxuXG4gIFRoaXMgaXMgYSBoZWxwZXIgZnVuY3Rpb24gdGhhdCB3aWxsIGV4dHJhY3Qga25vd24gZmxhZ3MgZnJvbSBhIGdlbmVyaWNcbiAgb3B0aW9ucyBvYmplY3QuXG4qKi9cbnZhciBwYXJzZUZsYWdzID0gZXhwb3J0cy5wYXJzZUZsYWdzID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAvLyBlbnN1cmUgd2UgaGF2ZSBvcHRzXG4gIHZhciBvcHRzID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyBkZWZhdWx0IHZpZGVvIGFuZCBhdWRpbyBmbGFncyB0byB0cnVlIGlmIHVuZGVmaW5lZFxuICBvcHRzLnZpZGVvID0gb3B0cy52aWRlbyB8fCB0eXBlb2Ygb3B0cy52aWRlbyA9PSAndW5kZWZpbmVkJztcbiAgb3B0cy5hdWRpbyA9IG9wdHMuYXVkaW8gfHwgdHlwZW9mIG9wdHMuYXVkaW8gPT0gJ3VuZGVmaW5lZCc7XG5cbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9wdHMgfHwge30pXG4gICAgLmZpbHRlcihmdW5jdGlvbihmbGFnKSB7XG4gICAgICByZXR1cm4gb3B0c1tmbGFnXTtcbiAgICB9KVxuICAgIC5tYXAoZnVuY3Rpb24oZmxhZykge1xuICAgICAgcmV0dXJuIGZsYWcudG9Mb3dlckNhc2UoKTtcbiAgICB9KVxuICAgIC5maWx0ZXIoZnVuY3Rpb24oZmxhZykge1xuICAgICAgcmV0dXJuIGtub3duRmxhZ3MuaW5kZXhPZihmbGFnKSA+PSAwO1xuICAgIH0pO1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIHJ0Y1xuXG4gIFRoZSBgcnRjYCBwYWNrYWdlIGlzIGEgY29udmVuaWVuY2UgbGF5ZXIgZm9yIHdvcmtpbmcgd2l0aCB0aGUgcnRjLmlvIHRvb2xraXQuXG4gIENvbnNpZGVyIGl0IGEgYm94ZWQgc2V0IG9mIGxlZ28gb2YgdGhlIG1vc3QgY29tbW9uIHBpZWNlcyByZXF1aXJlZCB0byBidWlsZFxuICB0aGUgZnJvbnQtZW5kIGNvbXBvbmVudCBvZiBhIFdlYlJUQyBhcHBsaWNhdGlvbi5cblxuICAjIyBHZXR0aW5nIFN0YXJ0ZWRcblxuICBUTyBCRSBDT01QTEVURUQuXG5cbioqL1xuXG52YXIgZ2VuID0gcmVxdWlyZSgnLi9nZW5lcmF0b3JzJyk7XG5cbi8vIGV4cG9ydCBkZXRlY3RcbnZhciBkZXRlY3QgPSBleHBvcnRzLmRldGVjdCA9IHJlcXVpcmUoJy4vZGV0ZWN0Jyk7XG5cbi8vIGV4cG9ydCBjb2cgbG9nZ2VyIGZvciBjb252ZW5pZW5jZVxuZXhwb3J0cy5sb2dnZXIgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJyk7XG5cbi8vIGV4cG9ydCBwZWVyIGNvbm5lY3Rpb25cbnZhciBSVENQZWVyQ29ubmVjdGlvbiA9XG5leHBvcnRzLlJUQ1BlZXJDb25uZWN0aW9uID0gZGV0ZWN0KCdSVENQZWVyQ29ubmVjdGlvbicpO1xuXG4vLyBhZGQgdGhlIGNvdXBsZSB1dGlsaXR5XG5leHBvcnRzLmNvdXBsZSA9IHJlcXVpcmUoJy4vY291cGxlJyk7XG5cbi8qKlxuICAjIyBGYWN0b3JpZXNcbioqL1xuXG4vKipcbiAgIyMjIGNyZWF0ZUNvbm5lY3Rpb24ob3B0cz8sIGNvbnN0cmFpbnRzPylcblxuICBDcmVhdGUgYSBuZXcgYFJUQ1BlZXJDb25uZWN0aW9uYCBhdXRvIGdlbmVyYXRpbmcgZGVmYXVsdCBvcHRzIGFzIHJlcXVpcmVkLlxuXG4gIGBgYGpzXG4gIHZhciBjb25uO1xuXG4gIC8vIHRoaXMgaXMgb2tcbiAgY29ubiA9IHJ0Yy5jcmVhdGVDb25uZWN0aW9uKCk7XG5cbiAgLy8gYW5kIHNvIGlzIHRoaXNcbiAgY29ubiA9IHJ0Yy5jcmVhdGVDb25uZWN0aW9uKHtcbiAgICBpY2VTZXJ2ZXJzOiBbXVxuICB9KTtcbiAgYGBgXG4qKi9cbmV4cG9ydHMuY3JlYXRlQ29ubmVjdGlvbiA9IGZ1bmN0aW9uKG9wdHMsIGNvbnN0cmFpbnRzKSB7XG4gIHJldHVybiBuZXcgUlRDUGVlckNvbm5lY3Rpb24oXG4gICAgLy8gZ2VuZXJhdGUgdGhlIGNvbmZpZyBiYXNlZCBvbiBvcHRpb25zIHByb3ZpZGVkXG4gICAgZ2VuLmNvbmZpZyhvcHRzKSxcblxuICAgIC8vIGdlbmVyYXRlIGFwcHJvcHJpYXRlIGNvbm5lY3Rpb24gY29uc3RyYWludHNcbiAgICBnZW4uY29ubmVjdGlvbkNvbnN0cmFpbnRzKG9wdHMsIGNvbnN0cmFpbnRzKVxuICApO1xufTsiLCJ2YXIgcHJvY2Vzcz1yZXF1aXJlKFwiX19icm93c2VyaWZ5X3Byb2Nlc3NcIik7LyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpKCdtb25pdG9yJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xudmFyIFczQ19TVEFURVMgPSB7XG4gIE5FVzogJ25ldycsXG4gIExPQ0FMX09GRkVSOiAnaGF2ZS1sb2NhbC1vZmZlcicsXG4gIExPQ0FMX1BSQU5TV0VSOiAnaGF2ZS1sb2NhbC1wcmFuc3dlcicsXG4gIFJFTU9URV9QUkFOU1dFUjogJ2hhdmUtcmVtb3RlLXByYW5zd2VyJyxcbiAgQUNUSVZFOiAnYWN0aXZlJyxcbiAgQ0xPU0VEOiAnY2xvc2VkJ1xufTtcblxuLyoqXG4gICMjIHJ0Yy9tb25pdG9yXG5cbiAgSW4gbW9zdCBjdXJyZW50IGltcGxlbWVudGF0aW9ucyBvZiBgUlRDUGVlckNvbm5lY3Rpb25gIGl0IGlzIHF1aXRlXG4gIGRpZmZpY3VsdCB0byBkZXRlcm1pbmUgd2hldGhlciBhIHBlZXIgY29ubmVjdGlvbiBpcyBhY3RpdmUgYW5kIHJlYWR5XG4gIGZvciB1c2Ugb3Igbm90LiAgVGhlIG1vbml0b3IgcHJvdmlkZXMgc29tZSBhc3Npc3RhbmNlIGhlcmUgYnkgcHJvdmlkaW5nXG4gIGEgc2ltcGxlIGZ1bmN0aW9uIHRoYXQgcHJvdmlkZXMgYW4gYEV2ZW50RW1pdHRlcmAgd2hpY2ggZ2l2ZXMgdXBkYXRlc1xuICBvbiBhIGNvbm5lY3Rpb25zIHN0YXRlLlxuXG4gICMjIyBtb25pdG9yKHBjKSAtPiBFdmVudEVtaXR0ZXJcblxuICBgYGBqc1xuICB2YXIgbW9uaXRvciA9IHJlcXVpcmUoJ3J0Yy9tb25pdG9yJyk7XG4gIHZhciBwYyA9IG5ldyBSVENQZWVyQ29ubmVjdGlvbihjb25maWcpO1xuXG4gIC8vIHdhdGNoIHBjIGFuZCB3aGVuIGFjdGl2ZSBkbyBzb21ldGhpbmdcbiAgbW9uaXRvcihwYykub25jZSgnYWN0aXZlJywgZnVuY3Rpb24oKSB7XG4gICAgLy8gYWN0aXZlIGFuZCByZWFkeSB0byBnb1xuICB9KTtcbiAgYGBgXG5cbiAgRXZlbnRzIHByb3ZpZGVkIGJ5IHRoZSBtb25pdG9yIGFyZSBhcyBmb2xsb3dzOlxuXG4gIC0gYGFjdGl2ZWA6IHRyaWdnZXJlZCB3aGVuIHRoZSBjb25uZWN0aW9uIGlzIGFjdGl2ZSBhbmQgcmVhZHkgZm9yIHVzZVxuICAtIGBzdGFibGVgOiB0cmlnZ2VyZWQgd2hlbiB0aGUgY29ubmVjdGlvbiBpcyBpbiBhIHN0YWJsZSBzaWduYWxsaW5nIHN0YXRlXG4gIC0gYHVuc3RhYmxlYDogdHJpZ2dlciB3aGVuIHRoZSBjb25uZWN0aW9uIGlzIHJlbmVnb3RpYXRpbmcuXG5cbiAgSXQgc2hvdWxkIGJlIG5vdGVkLCB0aGF0IHRoZSBtb25pdG9yIGRvZXMgYSBjaGVjayB3aGVuIGl0IGlzIGZpcnN0IHBhc3NlZFxuICBhbiBgUlRDUGVlckNvbm5lY3Rpb25gIG9iamVjdCB0byBzZWUgaWYgdGhlIGBhY3RpdmVgIHN0YXRlIHBhc3NlcyBjaGVja3MuXG4gIElmIHNvLCB0aGUgYGFjdGl2ZWAgZXZlbnQgd2lsbCBiZSBmaXJlZCBpbiB0aGUgbmV4dCB0aWNrLlxuXG4gIElmIHlvdSByZXF1aXJlIGEgc3luY2hyb25vdXMgY2hlY2sgb2YgYSBjb25uZWN0aW9uJ3MgXCJvcGVubmVzc1wiIHRoZW5cbiAgdXNlIHRoZSBgbW9uaXRvci5pc0FjdGl2ZWAgdGVzdCBvdXRsaW5lZCBiZWxvdy5cbioqL1xudmFyIG1vbml0b3IgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHBjLCB0YWcpIHtcbiAgLy8gY3JlYXRlIGEgbmV3IGV2ZW50IGVtaXR0ZXIgd2hpY2ggd2lsbCBjb21tdW5pY2F0ZSBldmVudHNcbiAgdmFyIG1vbiA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgdmFyIGN1cnJlbnRTdGF0ZSA9IGdldFN0YXRlKHBjKTtcbiAgdmFyIGlzQWN0aXZlID0gbW9uLmFjdGl2ZSA9IGN1cnJlbnRTdGF0ZSA9PT0gVzNDX1NUQVRFUy5BQ1RJVkU7XG5cbiAgZnVuY3Rpb24gY2hlY2tTdGF0ZSgpIHtcbiAgICB2YXIgbmV3U3RhdGUgPSBnZXRTdGF0ZShwYywgdGFnKTtcbiAgICBkZWJ1ZygnY2FwdHVyZWQgc3RhdGUgY2hhbmdlLCBuZXcgc3RhdGU6ICcgKyBuZXdTdGF0ZSArXG4gICAgICAnLCBjdXJyZW50IHN0YXRlOiAnICsgY3VycmVudFN0YXRlKTtcblxuICAgIC8vIHVwZGF0ZSB0aGUgbW9uaXRvciBhY3RpdmUgZmxhZ1xuICAgIG1vbi5hY3RpdmUgPSBuZXdTdGF0ZSA9PT0gVzNDX1NUQVRFUy5BQ1RJVkU7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGEgc3RhdGUgY2hhbmdlLCBlbWl0IGFuIGV2ZW50IGZvciB0aGUgbmV3IHN0YXRlXG4gICAgaWYgKG5ld1N0YXRlICE9PSBjdXJyZW50U3RhdGUpIHtcbiAgICAgIG1vbi5lbWl0KCdjaGFuZ2UnLCBuZXdTdGF0ZSk7XG4gICAgICBtb24uZW1pdChjdXJyZW50U3RhdGUgPSBuZXdTdGF0ZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgdGhlIGN1cnJlbnQgc3RhdGUgaXMgYWN0aXZlLCB0cmlnZ2VyIHRoZSBhY3RpdmUgZXZlbnRcbiAgaWYgKGlzQWN0aXZlKSB7XG4gICAgcHJvY2Vzcy5uZXh0VGljayhtb24uZW1pdC5iaW5kKG1vbiwgVzNDX1NUQVRFUy5BQ1RJVkUsIHBjKSk7XG4gIH1cblxuICAvLyBzdGFydCB3YXRjaGluZyBzdHVmZiBvbiB0aGUgcGNcbiAgcGMuYWRkRXZlbnRMaXN0ZW5lcignc2lnbmFsaW5nc3RhdGVjaGFuZ2UnLCBjaGVja1N0YXRlKTtcbiAgcGMuYWRkRXZlbnRMaXN0ZW5lcignaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlJywgY2hlY2tTdGF0ZSk7XG5cbiAgLy8gcGF0Y2ggaW4gYSBzdG9wIG1ldGhvZCBpbnRvIHRoZSBlbWl0dGVyXG4gIG1vbi5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgcGMucmVtb3ZlRXZlbnRMaXN0ZW5lcignc2lnbmFsaW5nc3RhdGVjaGFuZ2UnLCBjaGVja1N0YXRlKTtcbiAgICBwYy5yZW1vdmVFdmVudExpc3RlbmVyKCdpY2Vjb25uZWN0aW9uc3RhdGVjaGFuZ2UnLCBjaGVja1N0YXRlKTtcbiAgfTtcblxuICByZXR1cm4gbW9uO1xufTtcblxuLyoqXG4gICMjIyBtb25pdG9yLmdldFN0YXRlKHBjKVxuXG4gIFByb3ZpZGVzIGEgdW5pZmllZCBzdGF0ZSBkZWZpbml0aW9uIGZvciB0aGUgUlRDUGVlckNvbm5lY3Rpb24gYmFzZWRcbiAgb24gYSBmZXcgY2hlY2tzLlxuXG4gIEluIGVtZXJnaW5nIHZlcnNpb25zIG9mIHRoZSBzcGVjIHdlIGhhdmUgdmFyaW91cyBwcm9wZXJ0aWVzIHN1Y2ggYXNcbiAgYHJlYWR5U3RhdGVgIHRoYXQgcHJvdmlkZSBhIGRlZmluaXRpdmUgYW5zd2VyIG9uIHRoZSBzdGF0ZSBvZiB0aGUgXG4gIGNvbm5lY3Rpb24uICBJbiBvbGRlciB2ZXJzaW9ucyB3ZSBuZWVkIHRvIGxvb2sgYXQgdGhpbmdzIGxpa2VcbiAgYHNpZ25hbGluZ1N0YXRlYCBhbmQgYGljZUdhdGhlcmluZ1N0YXRlYCB0byBtYWtlIGFuIGVkdWNhdGVkIGd1ZXNzIFxuICBhcyB0byB0aGUgY29ubmVjdGlvbiBzdGF0ZS5cbioqL1xudmFyIGdldFN0YXRlID0gbW9uaXRvci5nZXRTdGF0ZSA9IGZ1bmN0aW9uKHBjLCB0YWcpIHtcbiAgdmFyIHNpZ25hbGluZ1N0YXRlID0gcGMgJiYgcGMuc2lnbmFsaW5nU3RhdGU7XG4gIHZhciBpY2VHYXRoZXJpbmdTdGF0ZSA9IHBjICYmIHBjLmljZUdhdGhlcmluZ1N0YXRlO1xuICB2YXIgaWNlQ29ubmVjdGlvblN0YXRlID0gcGMgJiYgcGMuaWNlQ29ubmVjdGlvblN0YXRlO1xuICB2YXIgbG9jYWxEZXNjO1xuICB2YXIgcmVtb3RlRGVzYztcbiAgdmFyIHN0YXRlO1xuICB2YXIgaXNBY3RpdmU7XG5cbiAgLy8gaWYgbm8gY29ubmVjdGlvbiByZXR1cm4gY2xvc2VkXG4gIGlmICghIHBjKSB7XG4gICAgcmV0dXJuIFczQ19TVEFURVMuQ0xPU0VEO1xuICB9XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgdGFnIHRvIGFuIGVtcHR5IHN0cmluZyBpZiBub3QgcHJvdmlkZWRcbiAgdGFnID0gdGFnIHx8ICcnO1xuXG4gIC8vIGdldCB0aGUgY29ubmVjdGlvbiBsb2NhbCBhbmQgcmVtb3RlIGRlc2NyaXB0aW9uXG4gIGxvY2FsRGVzYyA9IHBjLmxvY2FsRGVzY3JpcHRpb247XG4gIHJlbW90ZURlc2MgPSBwYy5yZW1vdGVEZXNjcmlwdGlvbjtcblxuICAvLyB1c2UgdGhlIHNpZ25hbGxpbmcgc3RhdGVcbiAgc3RhdGUgPSBzaWduYWxpbmdTdGF0ZTtcblxuICAvLyBpZiBzdGF0ZSA9PSAnc3RhYmxlJyB0aGVuIGludmVzdGlnYXRlXG4gIGlmIChzdGF0ZSA9PT0gJ3N0YWJsZScpIHtcbiAgICAvLyBpbml0aWFsaXNlIHRoZSBzdGF0ZSB0byBuZXdcbiAgICBzdGF0ZSA9IFczQ19TVEFURVMuTkVXO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSBhIGxvY2FsIGRlc2NyaXB0aW9uIGFuZCByZW1vdGUgZGVzY3JpcHRpb24gZmxhZ1xuICAgIC8vIGFzIHByYW5zd2VyZWRcbiAgICBpZiAobG9jYWxEZXNjICYmIHJlbW90ZURlc2MpIHtcbiAgICAgIHN0YXRlID0gVzNDX1NUQVRFUy5SRU1PVEVfUFJBTlNXRVI7XG4gICAgfVxuICB9XG5cbiAgLy8gY2hlY2sgdG8gc2VlIGlmIHdlIGFyZSBpbiB0aGUgYWN0aXZlIHN0YXRlXG4gIGlzQWN0aXZlID0gKHN0YXRlID09PSBXM0NfU1RBVEVTLlJFTU9URV9QUkFOU1dFUikgJiZcbiAgICAoaWNlQ29ubmVjdGlvblN0YXRlID09PSAnY29ubmVjdGVkJyk7XG5cbiAgZGVidWcodGFnICsgJ3NpZ25hbGluZyBzdGF0ZTogJyArIHNpZ25hbGluZ1N0YXRlICtcbiAgICAnLCBpY2VHYXRoZXJpbmdTdGF0ZTogJyArIGljZUdhdGhlcmluZ1N0YXRlICtcbiAgICAnLCBpY2VDb25uZWN0aW9uU3RhdGU6ICcgKyBpY2VDb25uZWN0aW9uU3RhdGUpO1xuICBcbiAgcmV0dXJuIGlzQWN0aXZlID8gVzNDX1NUQVRFUy5BQ1RJVkUgOiBzdGF0ZTtcbn07XG5cbi8qKlxuICAjIyMgbW9uaXRvci5pc0FjdGl2ZShwYykgLT4gQm9vbGVhblxuXG4gIFRlc3QgYW4gYFJUQ1BlZXJDb25uZWN0aW9uYCB0byBzZWUgaWYgaXQncyBjdXJyZW50bHkgb3Blbi4gIFRoZSB0ZXN0IGZvclxuICBcIm9wZW5uZXNzXCIgbG9va3MgYXQgYSBjb21iaW5hdGlvbiBvZiBjdXJyZW50IGBzaWduYWxpbmdTdGF0ZWAgYW5kXG4gIGBpY2VHYXRoZXJpbmdTdGF0ZWAuXG4qKi9cbm1vbml0b3IuaXNBY3RpdmUgPSBmdW5jdGlvbihwYykge1xuICB2YXIgaXNTdGFibGUgPSBwYyAmJiBwYy5zaWduYWxpbmdTdGF0ZSA9PT0gJ3N0YWJsZSc7XG5cbiAgLy8gcmV0dXJuIHdpdGggdGhlIGNvbm5lY3Rpb24gaXMgYWN0aXZlXG4gIHJldHVybiBpc1N0YWJsZSAmJiBnZXRTdGF0ZShwYykgPT09IFczQ19TVEFURVMuQUNUSVZFO1xufTsiLCJ2YXIgcHJvY2Vzcz1yZXF1aXJlKFwiX19icm93c2VyaWZ5X3Byb2Nlc3NcIik7LypnbG9iYWwgc2V0SW1tZWRpYXRlOiBmYWxzZSwgc2V0VGltZW91dDogZmFsc2UsIGNvbnNvbGU6IGZhbHNlICovXG4oZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGFzeW5jID0ge307XG5cbiAgICAvLyBnbG9iYWwgb24gdGhlIHNlcnZlciwgd2luZG93IGluIHRoZSBicm93c2VyXG4gICAgdmFyIHJvb3QsIHByZXZpb3VzX2FzeW5jO1xuXG4gICAgcm9vdCA9IHRoaXM7XG4gICAgaWYgKHJvb3QgIT0gbnVsbCkge1xuICAgICAgcHJldmlvdXNfYXN5bmMgPSByb290LmFzeW5jO1xuICAgIH1cblxuICAgIGFzeW5jLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJvb3QuYXN5bmMgPSBwcmV2aW91c19hc3luYztcbiAgICAgICAgcmV0dXJuIGFzeW5jO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBvbmx5X29uY2UoZm4pIHtcbiAgICAgICAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoY2FsbGVkKSB0aHJvdyBuZXcgRXJyb3IoXCJDYWxsYmFjayB3YXMgYWxyZWFkeSBjYWxsZWQuXCIpO1xuICAgICAgICAgICAgY2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGZuLmFwcGx5KHJvb3QsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLy8vIGNyb3NzLWJyb3dzZXIgY29tcGF0aWJsaXR5IGZ1bmN0aW9ucyAvLy8vXG5cbiAgICB2YXIgX2VhY2ggPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvcikge1xuICAgICAgICBpZiAoYXJyLmZvckVhY2gpIHtcbiAgICAgICAgICAgIHJldHVybiBhcnIuZm9yRWFjaChpdGVyYXRvcik7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKGFycltpXSwgaSwgYXJyKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgX21hcCA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yKSB7XG4gICAgICAgIGlmIChhcnIubWFwKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJyLm1hcChpdGVyYXRvcik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgX2VhY2goYXJyLCBmdW5jdGlvbiAoeCwgaSwgYSkge1xuICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGl0ZXJhdG9yKHgsIGksIGEpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH07XG5cbiAgICB2YXIgX3JlZHVjZSA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yLCBtZW1vKSB7XG4gICAgICAgIGlmIChhcnIucmVkdWNlKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJyLnJlZHVjZShpdGVyYXRvciwgbWVtbyk7XG4gICAgICAgIH1cbiAgICAgICAgX2VhY2goYXJyLCBmdW5jdGlvbiAoeCwgaSwgYSkge1xuICAgICAgICAgICAgbWVtbyA9IGl0ZXJhdG9yKG1lbW8sIHgsIGksIGEpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgfTtcblxuICAgIHZhciBfa2V5cyA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKSB7XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMob2JqKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIga2V5cyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBrIGluIG9iaikge1xuICAgICAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgICAgIGtleXMucHVzaChrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ga2V5cztcbiAgICB9O1xuXG4gICAgLy8vLyBleHBvcnRlZCBhc3luYyBtb2R1bGUgZnVuY3Rpb25zIC8vLy9cblxuICAgIC8vLy8gbmV4dFRpY2sgaW1wbGVtZW50YXRpb24gd2l0aCBicm93c2VyLWNvbXBhdGlibGUgZmFsbGJhY2sgLy8vL1xuICAgIGlmICh0eXBlb2YgcHJvY2VzcyA9PT0gJ3VuZGVmaW5lZCcgfHwgIShwcm9jZXNzLm5leHRUaWNrKSkge1xuICAgICAgICBpZiAodHlwZW9mIHNldEltbWVkaWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYXN5bmMubmV4dFRpY2sgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICAvLyBub3QgYSBkaXJlY3QgYWxpYXMgZm9yIElFMTAgY29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgICAgIHNldEltbWVkaWF0ZShmbik7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlID0gYXN5bmMubmV4dFRpY2s7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBhc3luYy5uZXh0VGljayA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSA9IGFzeW5jLm5leHRUaWNrO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBhc3luYy5uZXh0VGljayA9IHByb2Nlc3MubmV4dFRpY2s7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0SW1tZWRpYXRlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlID0gc2V0SW1tZWRpYXRlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlID0gYXN5bmMubmV4dFRpY2s7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYy5lYWNoID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgIGlmICghYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNvbXBsZXRlZCA9IDA7XG4gICAgICAgIF9lYWNoKGFyciwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgsIG9ubHlfb25jZShmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29tcGxldGVkICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21wbGV0ZWQgPj0gYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgYXN5bmMuZm9yRWFjaCA9IGFzeW5jLmVhY2g7XG5cbiAgICBhc3luYy5lYWNoU2VyaWVzID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgIGlmICghYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNvbXBsZXRlZCA9IDA7XG4gICAgICAgIHZhciBpdGVyYXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaXRlcmF0b3IoYXJyW2NvbXBsZXRlZF0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBsZXRlZCA+PSBhcnIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZXJhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBpdGVyYXRlKCk7XG4gICAgfTtcbiAgICBhc3luYy5mb3JFYWNoU2VyaWVzID0gYXN5bmMuZWFjaFNlcmllcztcblxuICAgIGFzeW5jLmVhY2hMaW1pdCA9IGZ1bmN0aW9uIChhcnIsIGxpbWl0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGZuID0gX2VhY2hMaW1pdChsaW1pdCk7XG4gICAgICAgIGZuLmFwcGx5KG51bGwsIFthcnIsIGl0ZXJhdG9yLCBjYWxsYmFja10pO1xuICAgIH07XG4gICAgYXN5bmMuZm9yRWFjaExpbWl0ID0gYXN5bmMuZWFjaExpbWl0O1xuXG4gICAgdmFyIF9lYWNoTGltaXQgPSBmdW5jdGlvbiAobGltaXQpIHtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgaWYgKCFhcnIubGVuZ3RoIHx8IGxpbWl0IDw9IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBjb21wbGV0ZWQgPSAwO1xuICAgICAgICAgICAgdmFyIHN0YXJ0ZWQgPSAwO1xuICAgICAgICAgICAgdmFyIHJ1bm5pbmcgPSAwO1xuXG4gICAgICAgICAgICAoZnVuY3Rpb24gcmVwbGVuaXNoICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29tcGxldGVkID49IGFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgd2hpbGUgKHJ1bm5pbmcgPCBsaW1pdCAmJiBzdGFydGVkIDwgYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBzdGFydGVkICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIHJ1bm5pbmcgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgaXRlcmF0b3IoYXJyW3N0YXJ0ZWQgLSAxXSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlZCArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJ1bm5pbmcgLT0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tcGxldGVkID49IGFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxlbmlzaCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG5cbiAgICB2YXIgZG9QYXJhbGxlbCA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIFthc3luYy5lYWNoXS5jb25jYXQoYXJncykpO1xuICAgICAgICB9O1xuICAgIH07XG4gICAgdmFyIGRvUGFyYWxsZWxMaW1pdCA9IGZ1bmN0aW9uKGxpbWl0LCBmbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIFtfZWFjaExpbWl0KGxpbWl0KV0uY29uY2F0KGFyZ3MpKTtcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIHZhciBkb1NlcmllcyA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIFthc3luYy5lYWNoU2VyaWVzXS5jb25jYXQoYXJncykpO1xuICAgICAgICB9O1xuICAgIH07XG5cblxuICAgIHZhciBfYXN5bmNNYXAgPSBmdW5jdGlvbiAoZWFjaGZuLCBhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgICAgICBhcnIgPSBfbWFwKGFyciwgZnVuY3Rpb24gKHgsIGkpIHtcbiAgICAgICAgICAgIHJldHVybiB7aW5kZXg6IGksIHZhbHVlOiB4fTtcbiAgICAgICAgfSk7XG4gICAgICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeC52YWx1ZSwgZnVuY3Rpb24gKGVyciwgdikge1xuICAgICAgICAgICAgICAgIHJlc3VsdHNbeC5pbmRleF0gPSB2O1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHRzKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBhc3luYy5tYXAgPSBkb1BhcmFsbGVsKF9hc3luY01hcCk7XG4gICAgYXN5bmMubWFwU2VyaWVzID0gZG9TZXJpZXMoX2FzeW5jTWFwKTtcbiAgICBhc3luYy5tYXBMaW1pdCA9IGZ1bmN0aW9uIChhcnIsIGxpbWl0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIF9tYXBMaW1pdChsaW1pdCkoYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICB2YXIgX21hcExpbWl0ID0gZnVuY3Rpb24obGltaXQpIHtcbiAgICAgICAgcmV0dXJuIGRvUGFyYWxsZWxMaW1pdChsaW1pdCwgX2FzeW5jTWFwKTtcbiAgICB9O1xuXG4gICAgLy8gcmVkdWNlIG9ubHkgaGFzIGEgc2VyaWVzIHZlcnNpb24sIGFzIGRvaW5nIHJlZHVjZSBpbiBwYXJhbGxlbCB3b24ndFxuICAgIC8vIHdvcmsgaW4gbWFueSBzaXR1YXRpb25zLlxuICAgIGFzeW5jLnJlZHVjZSA9IGZ1bmN0aW9uIChhcnIsIG1lbW8sIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBhc3luYy5lYWNoU2VyaWVzKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcihtZW1vLCB4LCBmdW5jdGlvbiAoZXJyLCB2KSB7XG4gICAgICAgICAgICAgICAgbWVtbyA9IHY7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIsIG1lbW8pO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIC8vIGluamVjdCBhbGlhc1xuICAgIGFzeW5jLmluamVjdCA9IGFzeW5jLnJlZHVjZTtcbiAgICAvLyBmb2xkbCBhbGlhc1xuICAgIGFzeW5jLmZvbGRsID0gYXN5bmMucmVkdWNlO1xuXG4gICAgYXN5bmMucmVkdWNlUmlnaHQgPSBmdW5jdGlvbiAoYXJyLCBtZW1vLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHJldmVyc2VkID0gX21hcChhcnIsIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgfSkucmV2ZXJzZSgpO1xuICAgICAgICBhc3luYy5yZWR1Y2UocmV2ZXJzZWQsIG1lbW8sIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgfTtcbiAgICAvLyBmb2xkciBhbGlhc1xuICAgIGFzeW5jLmZvbGRyID0gYXN5bmMucmVkdWNlUmlnaHQ7XG5cbiAgICB2YXIgX2ZpbHRlciA9IGZ1bmN0aW9uIChlYWNoZm4sIGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByZXN1bHRzID0gW107XG4gICAgICAgIGFyciA9IF9tYXAoYXJyLCBmdW5jdGlvbiAoeCwgaSkge1xuICAgICAgICAgICAgcmV0dXJuIHtpbmRleDogaSwgdmFsdWU6IHh9O1xuICAgICAgICB9KTtcbiAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LnZhbHVlLCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhfbWFwKHJlc3VsdHMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgIHJldHVybiBhLmluZGV4IC0gYi5pbmRleDtcbiAgICAgICAgICAgIH0pLCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4LnZhbHVlO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIGFzeW5jLmZpbHRlciA9IGRvUGFyYWxsZWwoX2ZpbHRlcik7XG4gICAgYXN5bmMuZmlsdGVyU2VyaWVzID0gZG9TZXJpZXMoX2ZpbHRlcik7XG4gICAgLy8gc2VsZWN0IGFsaWFzXG4gICAgYXN5bmMuc2VsZWN0ID0gYXN5bmMuZmlsdGVyO1xuICAgIGFzeW5jLnNlbGVjdFNlcmllcyA9IGFzeW5jLmZpbHRlclNlcmllcztcblxuICAgIHZhciBfcmVqZWN0ID0gZnVuY3Rpb24gKGVhY2hmbiwgYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgYXJyID0gX21hcChhcnIsIGZ1bmN0aW9uICh4LCBpKSB7XG4gICAgICAgICAgICByZXR1cm4ge2luZGV4OiBpLCB2YWx1ZTogeH07XG4gICAgICAgIH0pO1xuICAgICAgICBlYWNoZm4oYXJyLCBmdW5jdGlvbiAoeCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgudmFsdWUsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgaWYgKCF2KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhfbWFwKHJlc3VsdHMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgIHJldHVybiBhLmluZGV4IC0gYi5pbmRleDtcbiAgICAgICAgICAgIH0pLCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4LnZhbHVlO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIGFzeW5jLnJlamVjdCA9IGRvUGFyYWxsZWwoX3JlamVjdCk7XG4gICAgYXN5bmMucmVqZWN0U2VyaWVzID0gZG9TZXJpZXMoX3JlamVjdCk7XG5cbiAgICB2YXIgX2RldGVjdCA9IGZ1bmN0aW9uIChlYWNoZm4sIGFyciwgaXRlcmF0b3IsIG1haW5fY2FsbGJhY2spIHtcbiAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBtYWluX2NhbGxiYWNrKHgpO1xuICAgICAgICAgICAgICAgICAgICBtYWluX2NhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBtYWluX2NhbGxiYWNrKCk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgYXN5bmMuZGV0ZWN0ID0gZG9QYXJhbGxlbChfZGV0ZWN0KTtcbiAgICBhc3luYy5kZXRlY3RTZXJpZXMgPSBkb1NlcmllcyhfZGV0ZWN0KTtcblxuICAgIGFzeW5jLnNvbWUgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgbWFpbl9jYWxsYmFjaykge1xuICAgICAgICBhc3luYy5lYWNoKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgIG1haW5fY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIG1haW5fY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBtYWluX2NhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICAvLyBhbnkgYWxpYXNcbiAgICBhc3luYy5hbnkgPSBhc3luYy5zb21lO1xuXG4gICAgYXN5bmMuZXZlcnkgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgbWFpbl9jYWxsYmFjaykge1xuICAgICAgICBhc3luYy5lYWNoKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIGlmICghdikge1xuICAgICAgICAgICAgICAgICAgICBtYWluX2NhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgbWFpbl9jYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIG1haW5fY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgLy8gYWxsIGFsaWFzXG4gICAgYXN5bmMuYWxsID0gYXN5bmMuZXZlcnk7XG5cbiAgICBhc3luYy5zb3J0QnkgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgYXN5bmMubWFwKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LCBmdW5jdGlvbiAoZXJyLCBjcml0ZXJpYSkge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHt2YWx1ZTogeCwgY3JpdGVyaWE6IGNyaXRlcmlhfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIsIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBmbiA9IGZ1bmN0aW9uIChsZWZ0LCByaWdodCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYSA9IGxlZnQuY3JpdGVyaWEsIGIgPSByaWdodC5jcml0ZXJpYTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiAwO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgX21hcChyZXN1bHRzLnNvcnQoZm4pLCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geC52YWx1ZTtcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhc3luYy5hdXRvID0gZnVuY3Rpb24gKHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICB2YXIga2V5cyA9IF9rZXlzKHRhc2tzKTtcbiAgICAgICAgaWYgKCFrZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJlc3VsdHMgPSB7fTtcblxuICAgICAgICB2YXIgbGlzdGVuZXJzID0gW107XG4gICAgICAgIHZhciBhZGRMaXN0ZW5lciA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgbGlzdGVuZXJzLnVuc2hpZnQoZm4pO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgcmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxpc3RlbmVyc1tpXSA9PT0gZm4pIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHRhc2tDb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIF9lYWNoKGxpc3RlbmVycy5zbGljZSgwKSwgZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGFkZExpc3RlbmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChfa2V5cyhyZXN1bHRzKS5sZW5ndGggPT09IGtleXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgX2VhY2goa2V5cywgZnVuY3Rpb24gKGspIHtcbiAgICAgICAgICAgIHZhciB0YXNrID0gKHRhc2tzW2tdIGluc3RhbmNlb2YgRnVuY3Rpb24pID8gW3Rhc2tzW2tdXTogdGFza3Nba107XG4gICAgICAgICAgICB2YXIgdGFza0NhbGxiYWNrID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2FmZVJlc3VsdHMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgX2VhY2goX2tleXMocmVzdWx0cyksIGZ1bmN0aW9uKHJrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhZmVSZXN1bHRzW3JrZXldID0gcmVzdWx0c1tya2V5XTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHNhZmVSZXN1bHRzW2tdID0gYXJncztcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBzYWZlUmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHN0b3Agc3Vic2VxdWVudCBlcnJvcnMgaGl0dGluZyBjYWxsYmFjayBtdWx0aXBsZSB0aW1lc1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0c1trXSA9IGFyZ3M7XG4gICAgICAgICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSh0YXNrQ29tcGxldGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgcmVxdWlyZXMgPSB0YXNrLnNsaWNlKDAsIE1hdGguYWJzKHRhc2subGVuZ3RoIC0gMSkpIHx8IFtdO1xuICAgICAgICAgICAgdmFyIHJlYWR5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBfcmVkdWNlKHJlcXVpcmVzLCBmdW5jdGlvbiAoYSwgeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKGEgJiYgcmVzdWx0cy5oYXNPd25Qcm9wZXJ0eSh4KSk7XG4gICAgICAgICAgICAgICAgfSwgdHJ1ZSkgJiYgIXJlc3VsdHMuaGFzT3duUHJvcGVydHkoayk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHJlYWR5KCkpIHtcbiAgICAgICAgICAgICAgICB0YXNrW3Rhc2subGVuZ3RoIC0gMV0odGFza0NhbGxiYWNrLCByZXN1bHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBsaXN0ZW5lciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlYWR5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhc2tbdGFzay5sZW5ndGggLSAxXSh0YXNrQ2FsbGJhY2ssIHJlc3VsdHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBhZGRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhc3luYy53YXRlcmZhbGwgPSBmdW5jdGlvbiAodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgIGlmICh0YXNrcy5jb25zdHJ1Y3RvciAhPT0gQXJyYXkpIHtcbiAgICAgICAgICB2YXIgZXJyID0gbmV3IEVycm9yKCdGaXJzdCBhcmd1bWVudCB0byB3YXRlcmZhbGwgbXVzdCBiZSBhbiBhcnJheSBvZiBmdW5jdGlvbnMnKTtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRhc2tzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHdyYXBJdGVyYXRvciA9IGZ1bmN0aW9uIChpdGVyYXRvcikge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXh0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5wdXNoKHdyYXBJdGVyYXRvcihuZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVyYXRvci5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICAgICAgd3JhcEl0ZXJhdG9yKGFzeW5jLml0ZXJhdG9yKHRhc2tzKSkoKTtcbiAgICB9O1xuXG4gICAgdmFyIF9wYXJhbGxlbCA9IGZ1bmN0aW9uKGVhY2hmbiwgdGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgIGlmICh0YXNrcy5jb25zdHJ1Y3RvciA9PT0gQXJyYXkpIHtcbiAgICAgICAgICAgIGVhY2hmbi5tYXAodGFza3MsIGZ1bmN0aW9uIChmbiwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoZm4pIHtcbiAgICAgICAgICAgICAgICAgICAgZm4oZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgZXJyLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSB7fTtcbiAgICAgICAgICAgIGVhY2hmbi5lYWNoKF9rZXlzKHRhc2tzKSwgZnVuY3Rpb24gKGssIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgdGFza3Nba10oZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzW2tdID0gYXJncztcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIHJlc3VsdHMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgYXN5bmMucGFyYWxsZWwgPSBmdW5jdGlvbiAodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIF9wYXJhbGxlbCh7IG1hcDogYXN5bmMubWFwLCBlYWNoOiBhc3luYy5lYWNoIH0sIHRhc2tzLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLnBhcmFsbGVsTGltaXQgPSBmdW5jdGlvbih0YXNrcywgbGltaXQsIGNhbGxiYWNrKSB7XG4gICAgICAgIF9wYXJhbGxlbCh7IG1hcDogX21hcExpbWl0KGxpbWl0KSwgZWFjaDogX2VhY2hMaW1pdChsaW1pdCkgfSwgdGFza3MsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuc2VyaWVzID0gZnVuY3Rpb24gKHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICBpZiAodGFza3MuY29uc3RydWN0b3IgPT09IEFycmF5KSB7XG4gICAgICAgICAgICBhc3luYy5tYXBTZXJpZXModGFza3MsIGZ1bmN0aW9uIChmbiwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoZm4pIHtcbiAgICAgICAgICAgICAgICAgICAgZm4oZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgZXJyLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSB7fTtcbiAgICAgICAgICAgIGFzeW5jLmVhY2hTZXJpZXMoX2tleXModGFza3MpLCBmdW5jdGlvbiAoaywgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICB0YXNrc1trXShmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MgPSBhcmdzWzBdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHNba10gPSBhcmdzO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgcmVzdWx0cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBhc3luYy5pdGVyYXRvciA9IGZ1bmN0aW9uICh0YXNrcykge1xuICAgICAgICB2YXIgbWFrZUNhbGxiYWNrID0gZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgICAgICAgICB2YXIgZm4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRhc2tzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0YXNrc1tpbmRleF0uYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuLm5leHQoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBmbi5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoaW5kZXggPCB0YXNrcy5sZW5ndGggLSAxKSA/IG1ha2VDYWxsYmFjayhpbmRleCArIDEpOiBudWxsO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBmbjtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIG1ha2VDYWxsYmFjaygwKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuYXBwbHkgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KFxuICAgICAgICAgICAgICAgIG51bGwsIGFyZ3MuY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpXG4gICAgICAgICAgICApO1xuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB2YXIgX2NvbmNhdCA9IGZ1bmN0aW9uIChlYWNoZm4sIGFyciwgZm4sIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByID0gW107XG4gICAgICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh4LCBjYikge1xuICAgICAgICAgICAgZm4oeCwgZnVuY3Rpb24gKGVyciwgeSkge1xuICAgICAgICAgICAgICAgIHIgPSByLmNvbmNhdCh5IHx8IFtdKTtcbiAgICAgICAgICAgICAgICBjYihlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgcik7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgYXN5bmMuY29uY2F0ID0gZG9QYXJhbGxlbChfY29uY2F0KTtcbiAgICBhc3luYy5jb25jYXRTZXJpZXMgPSBkb1NlcmllcyhfY29uY2F0KTtcblxuICAgIGFzeW5jLndoaWxzdCA9IGZ1bmN0aW9uICh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKHRlc3QoKSkge1xuICAgICAgICAgICAgaXRlcmF0b3IoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFzeW5jLndoaWxzdCh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGFzeW5jLmRvV2hpbHN0ID0gZnVuY3Rpb24gKGl0ZXJhdG9yLCB0ZXN0LCBjYWxsYmFjaykge1xuICAgICAgICBpdGVyYXRvcihmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGVzdCgpKSB7XG4gICAgICAgICAgICAgICAgYXN5bmMuZG9XaGlsc3QoaXRlcmF0b3IsIHRlc3QsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhc3luYy51bnRpbCA9IGZ1bmN0aW9uICh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCF0ZXN0KCkpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhc3luYy51bnRpbCh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGFzeW5jLmRvVW50aWwgPSBmdW5jdGlvbiAoaXRlcmF0b3IsIHRlc3QsIGNhbGxiYWNrKSB7XG4gICAgICAgIGl0ZXJhdG9yKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdGVzdCgpKSB7XG4gICAgICAgICAgICAgICAgYXN5bmMuZG9VbnRpbChpdGVyYXRvciwgdGVzdCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGFzeW5jLnF1ZXVlID0gZnVuY3Rpb24gKHdvcmtlciwgY29uY3VycmVuY3kpIHtcbiAgICAgICAgaWYgKGNvbmN1cnJlbmN5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbmN1cnJlbmN5ID0gMTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBfaW5zZXJ0KHEsIGRhdGEsIHBvcywgY2FsbGJhY2spIHtcbiAgICAgICAgICBpZihkYXRhLmNvbnN0cnVjdG9yICE9PSBBcnJheSkge1xuICAgICAgICAgICAgICBkYXRhID0gW2RhdGFdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBfZWFjaChkYXRhLCBmdW5jdGlvbih0YXNrKSB7XG4gICAgICAgICAgICAgIHZhciBpdGVtID0ge1xuICAgICAgICAgICAgICAgICAgZGF0YTogdGFzayxcbiAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiB0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicgPyBjYWxsYmFjayA6IG51bGxcbiAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICBpZiAocG9zKSB7XG4gICAgICAgICAgICAgICAgcS50YXNrcy51bnNoaWZ0KGl0ZW0pO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHEudGFza3MucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmIChxLnNhdHVyYXRlZCAmJiBxLnRhc2tzLmxlbmd0aCA9PT0gY29uY3VycmVuY3kpIHtcbiAgICAgICAgICAgICAgICAgIHEuc2F0dXJhdGVkKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlKHEucHJvY2Vzcyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgd29ya2VycyA9IDA7XG4gICAgICAgIHZhciBxID0ge1xuICAgICAgICAgICAgdGFza3M6IFtdLFxuICAgICAgICAgICAgY29uY3VycmVuY3k6IGNvbmN1cnJlbmN5LFxuICAgICAgICAgICAgc2F0dXJhdGVkOiBudWxsLFxuICAgICAgICAgICAgZW1wdHk6IG51bGwsXG4gICAgICAgICAgICBkcmFpbjogbnVsbCxcbiAgICAgICAgICAgIHB1c2g6IGZ1bmN0aW9uIChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICBfaW5zZXJ0KHEsIGRhdGEsIGZhbHNlLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdW5zaGlmdDogZnVuY3Rpb24gKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgIF9pbnNlcnQocSwgZGF0YSwgdHJ1ZSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByb2Nlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAod29ya2VycyA8IHEuY29uY3VycmVuY3kgJiYgcS50YXNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhc2sgPSBxLnRhc2tzLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChxLmVtcHR5ICYmIHEudGFza3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxLmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgd29ya2VycyArPSAxO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtlcnMgLT0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLmNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFzay5jYWxsYmFjay5hcHBseSh0YXNrLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHEuZHJhaW4gJiYgcS50YXNrcy5sZW5ndGggKyB3b3JrZXJzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcS5kcmFpbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcS5wcm9jZXNzKCk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHZhciBjYiA9IG9ubHlfb25jZShuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgd29ya2VyKHRhc2suZGF0YSwgY2IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsZW5ndGg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcS50YXNrcy5sZW5ndGg7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcnVubmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB3b3JrZXJzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcTtcbiAgICB9O1xuXG4gICAgYXN5bmMuY2FyZ28gPSBmdW5jdGlvbiAod29ya2VyLCBwYXlsb2FkKSB7XG4gICAgICAgIHZhciB3b3JraW5nICAgICA9IGZhbHNlLFxuICAgICAgICAgICAgdGFza3MgICAgICAgPSBbXTtcblxuICAgICAgICB2YXIgY2FyZ28gPSB7XG4gICAgICAgICAgICB0YXNrczogdGFza3MsXG4gICAgICAgICAgICBwYXlsb2FkOiBwYXlsb2FkLFxuICAgICAgICAgICAgc2F0dXJhdGVkOiBudWxsLFxuICAgICAgICAgICAgZW1wdHk6IG51bGwsXG4gICAgICAgICAgICBkcmFpbjogbnVsbCxcbiAgICAgICAgICAgIHB1c2g6IGZ1bmN0aW9uIChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIGlmKGRhdGEuY29uc3RydWN0b3IgIT09IEFycmF5KSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEgPSBbZGF0YV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF9lYWNoKGRhdGEsIGZ1bmN0aW9uKHRhc2spIHtcbiAgICAgICAgICAgICAgICAgICAgdGFza3MucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB0YXNrLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJyA/IGNhbGxiYWNrIDogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhcmdvLnNhdHVyYXRlZCAmJiB0YXNrcy5sZW5ndGggPT09IHBheWxvYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmdvLnNhdHVyYXRlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlKGNhcmdvLnByb2Nlc3MpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByb2Nlc3M6IGZ1bmN0aW9uIHByb2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHdvcmtpbmcpIHJldHVybjtcbiAgICAgICAgICAgICAgICBpZiAodGFza3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGNhcmdvLmRyYWluKSBjYXJnby5kcmFpbigpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIHRzID0gdHlwZW9mIHBheWxvYWQgPT09ICdudW1iZXInXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyB0YXNrcy5zcGxpY2UoMCwgcGF5bG9hZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IHRhc2tzLnNwbGljZSgwKTtcblxuICAgICAgICAgICAgICAgIHZhciBkcyA9IF9tYXAodHMsIGZ1bmN0aW9uICh0YXNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXNrLmRhdGE7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZihjYXJnby5lbXB0eSkgY2FyZ28uZW1wdHkoKTtcbiAgICAgICAgICAgICAgICB3b3JraW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB3b3JrZXIoZHMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgd29ya2luZyA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgICAgICAgICBfZWFjaCh0cywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5jYWxsYmFjay5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcHJvY2VzcygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxlbmd0aDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0YXNrcy5sZW5ndGg7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcnVubmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB3b3JraW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gY2FyZ287XG4gICAgfTtcblxuICAgIHZhciBfY29uc29sZV9mbiA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MuY29uY2F0KFtmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnNvbGUuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoY29uc29sZVtuYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX2VhY2goYXJncywgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlW25hbWVdKHgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XSkpO1xuICAgICAgICB9O1xuICAgIH07XG4gICAgYXN5bmMubG9nID0gX2NvbnNvbGVfZm4oJ2xvZycpO1xuICAgIGFzeW5jLmRpciA9IF9jb25zb2xlX2ZuKCdkaXInKTtcbiAgICAvKmFzeW5jLmluZm8gPSBfY29uc29sZV9mbignaW5mbycpO1xuICAgIGFzeW5jLndhcm4gPSBfY29uc29sZV9mbignd2FybicpO1xuICAgIGFzeW5jLmVycm9yID0gX2NvbnNvbGVfZm4oJ2Vycm9yJyk7Ki9cblxuICAgIGFzeW5jLm1lbW9pemUgPSBmdW5jdGlvbiAoZm4sIGhhc2hlcikge1xuICAgICAgICB2YXIgbWVtbyA9IHt9O1xuICAgICAgICB2YXIgcXVldWVzID0ge307XG4gICAgICAgIGhhc2hlciA9IGhhc2hlciB8fCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBtZW1vaXplZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3MucG9wKCk7XG4gICAgICAgICAgICB2YXIga2V5ID0gaGFzaGVyLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICAgICAgaWYgKGtleSBpbiBtZW1vKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgbWVtb1trZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGtleSBpbiBxdWV1ZXMpIHtcbiAgICAgICAgICAgICAgICBxdWV1ZXNba2V5XS5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHF1ZXVlc1trZXldID0gW2NhbGxiYWNrXTtcbiAgICAgICAgICAgICAgICBmbi5hcHBseShudWxsLCBhcmdzLmNvbmNhdChbZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBtZW1vW2tleV0gPSBhcmd1bWVudHM7XG4gICAgICAgICAgICAgICAgICAgIHZhciBxID0gcXVldWVzW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBxdWV1ZXNba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBxLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgIHFbaV0uYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1dKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIG1lbW9pemVkLm1lbW8gPSBtZW1vO1xuICAgICAgICBtZW1vaXplZC51bm1lbW9pemVkID0gZm47XG4gICAgICAgIHJldHVybiBtZW1vaXplZDtcbiAgICB9O1xuXG4gICAgYXN5bmMudW5tZW1vaXplID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gKGZuLnVubWVtb2l6ZWQgfHwgZm4pLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH07XG5cbiAgICBhc3luYy50aW1lcyA9IGZ1bmN0aW9uIChjb3VudCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBjb3VudGVyID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuICAgICAgICAgICAgY291bnRlci5wdXNoKGkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhc3luYy5tYXAoY291bnRlciwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMudGltZXNTZXJpZXMgPSBmdW5jdGlvbiAoY291bnQsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgY291bnRlciA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgICAgIGNvdW50ZXIucHVzaChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXN5bmMubWFwU2VyaWVzKGNvdW50ZXIsIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLmNvbXBvc2UgPSBmdW5jdGlvbiAoLyogZnVuY3Rpb25zLi4uICovKSB7XG4gICAgICAgIHZhciBmbnMgPSBBcnJheS5wcm90b3R5cGUucmV2ZXJzZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgYXN5bmMucmVkdWNlKGZucywgYXJncywgZnVuY3Rpb24gKG5ld2FyZ3MsIGZuLCBjYikge1xuICAgICAgICAgICAgICAgIGZuLmFwcGx5KHRoYXQsIG5ld2FyZ3MuY29uY2F0KFtmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlcnIgPSBhcmd1bWVudHNbMF07XG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXh0YXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgICAgIGNiKGVyciwgbmV4dGFyZ3MpO1xuICAgICAgICAgICAgICAgIH1dKSlcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbiAoZXJyLCByZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkodGhhdCwgW2Vycl0uY29uY2F0KHJlc3VsdHMpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB2YXIgX2FwcGx5RWFjaCA9IGZ1bmN0aW9uIChlYWNoZm4sIGZucyAvKmFyZ3MuLi4qLykge1xuICAgICAgICB2YXIgZ28gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgcmV0dXJuIGVhY2hmbihmbnMsIGZ1bmN0aW9uIChmbiwgY2IpIHtcbiAgICAgICAgICAgICAgICBmbi5hcHBseSh0aGF0LCBhcmdzLmNvbmNhdChbY2JdKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2FsbGJhY2spO1xuICAgICAgICB9O1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICAgICAgICAgIHJldHVybiBnby5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBnbztcbiAgICAgICAgfVxuICAgIH07XG4gICAgYXN5bmMuYXBwbHlFYWNoID0gZG9QYXJhbGxlbChfYXBwbHlFYWNoKTtcbiAgICBhc3luYy5hcHBseUVhY2hTZXJpZXMgPSBkb1NlcmllcyhfYXBwbHlFYWNoKTtcblxuICAgIGFzeW5jLmZvcmV2ZXIgPSBmdW5jdGlvbiAoZm4sIGNhbGxiYWNrKSB7XG4gICAgICAgIGZ1bmN0aW9uIG5leHQoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmbihuZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBuZXh0KCk7XG4gICAgfTtcblxuICAgIC8vIEFNRCAvIFJlcXVpcmVKU1xuICAgIGlmICh0eXBlb2YgZGVmaW5lICE9PSAndW5kZWZpbmVkJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShbXSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGFzeW5jO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gTm9kZS5qc1xuICAgIGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gYXN5bmM7XG4gICAgfVxuICAgIC8vIGluY2x1ZGVkIGRpcmVjdGx5IHZpYSA8c2NyaXB0PiB0YWdcbiAgICBlbHNlIHtcbiAgICAgICAgcm9vdC5hc3luYyA9IGFzeW5jO1xuICAgIH1cblxufSgpKTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICBpZiAoZXYuc291cmNlID09PSB3aW5kb3cgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIl19
