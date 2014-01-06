!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.glue=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* jshint node: true */
'use strict';

var eve = require('eve');
var rePrefixed = /^glue\./;

/**
  ## Events

  Glue uses [eve](https://github.com/adobe-webplatform/eve) under the hood,
  and exposes a simple interface to eve events through the `glue.events`
  interface.

  If using eve directly these events are namespaced with the prefix of
  `glue.` to avoid event name clashes on the bus, but you can use the
  `glue.events` endpoint to attach to eve without the namespace if you prefer.

  For example:

  <<< examples/event-namespacing.js

**/
['on', 'once', 'off'].forEach(function(method) {
  exports[method] = function(name, handler) {
    if (! rePrefixed.test(name)) {
      name = 'glue.' + name;
    }

    // register the handler
    eve[method](name, handler);
  };
});
},{"eve":8}],2:[function(require,module,exports){
/* jshint node: true */
/* global window: false */
/* global document: false */
/* global location: false */
/* global CustomEvent: false */
/* global io: false */
'use strict';

var async = require('async');
var url = require('url');
var eve = require('eve');
var qsa = require('fdom/qsa');
var on = require('fdom/on');
var extend = require('cog/extend');
var defaults = require('cog/defaults');
var logger = require('cog/logger');
var debug = logger('glue');
var signaller = require('rtc-signaller');
var media = require('rtc-media');
var captureConfig = require('rtc-captureconfig');
var transform = require('sdp-transform');
var resetEl = require('rtc-core/reset');
// var liner = require('sdp-lines');

var reSep = /[\s\,]\s*/;
var reTrailingSlash = /\/$/;
var canGetSources = typeof MediaStreamTrack != 'undefined' &&
  MediaStreamTrack.getSources;

// initialise our config (using rtc- named metadata tags)
var config = defaults({}, require('fdom/meta')(/^rtc-(.*)$/), {
  room: location.hash.slice(1),
  signalhost: location.origin || 'http://rtc.io/switchboard/'
});

var SessionManager = require('./sessionmanager');
var sessionMgr;
var sources;

/**
  # rtc-glue

  Glue is a high-level approach to building WebRTC applications. It is
  primarily designed for web application coders who would prefer to spend
  their time in HTML and CSS rather than JS.

  ## Example Usage

  Glue works by looking for HTML tags that follow particular conventions
  with regards to named attributed, etc.  For instance, consider the
  following HTML:

  <<< examples/capture-only.html

  It is then possible to tweak the `getUserMedia` constraints using some
  flags in the `rtc-capture` attribute:

  <<< examples/capture-tweakres.html

  For those who prefer using separate attributes, you can achieve similar
  behaviour using the `rtc-resolution` (or `rtc-res`) attribute:

  <<< examples/res-attribute.html

  ## Conferencing Example

  The following is a simple example of conferencing using some hosted rtc.io
  signalling:

  <<< examples/conference-simple.html

  ## Getting Glue

  Primarily glue is designed for use in a standalone situation, and thus
  comes pre-packaged in a UMDjs
  [distribution](https://github.com/rtc-io/rtc-glue/tree/master/dist). If
  you prefer working with browserify, then it will still work quite nicely
  and you should just `npm install rtc-glue` like you would with other
  modules of the rtc.io suite.

  ## Running the Examples

  This module of the [rtc.io](https://rtc.io/) suite is a little different
  to others in that it comes with a ready to run js file.  Simply start
  a webserver in the root of the directory after cloning.  If you are looking
  for a good one, I'd recommend [st](https://github.com/isaacs/st).

  ## Targeted Media Capture

  The draft
  [Media Capture spec](http://dev.w3.org/2011/webrtc/editor/getusermedia.html)
  introduces the ability to query media devices on the machine.  This is
  currently available through the `MediaStreamTrack.getSources` function.

  If available then you can target the capture of a particular input device
  through the use of a numbered device capture specification.  For example:

  ```html
  <video rtc-capture="camera:1"></video>
  ```

  Would atttempt to capture the 2nd (0-indexed) camera available on the
  machine (if it is able to query devices).  The following is a larger
  example:

  <<< examples/capture-multicam.html

  ## On Custom Attributes

  While we haven't 100% decided we are leaning towards the use of custom
  `rtc-*` attributes for influencing the behaviour of the `rtc-glue` library.
  While currently this is in violation with the HTML5 spec, it is an area
  of active discussion in W3C land (given [AngularJS](http://angularjs.org/)
  has adopted the `ng-*` attributes and is proving popular).

  ### Document Metadata

  In the `rtc-glue` library we use document level `<meta>` tags to provide
  glue with configuration information.  There are a number of configurable
  options, each which is used in the form of:

  ```html
  <meta name="rtc-%flagname%" content="config content" />
  ```

  #### rtc-room

  A custom room that new conversations will be created in.  If not specified
  this will default to a value of `auto`.

  #### rtc-role

  In some conference scenarios, different participants are assigned different
  roles (e.g. student/teacher, consultant/customer, etc).  By specifying the
  `rtc-role` metadata you this role information will be announced as part
  of the `rtc-quickconnect` initialization.

  ## Reference

  ### Element Attributes

  #### rtc-capture

  The presence of the `rtc-capture` attribute in a `video` or `audio` element
  indicates that it is a getUserMedia capture target.

  #### rtc-peer

  To be completed.

**/
var glue = module.exports = function(scope, opts) {
  var startupOps = [];
  var debugTarget;

  // initialise the remote elements
  var peers = qsa('*[rtc-peer]', scope).map(initPeer);

  // if we have peers, then we are going to need primus
  if (peers.length > 0) {
    startupOps.push(loadPrimus);
  }

  // apply any external opts to the configuration
  extend(config, opts);

  // determine if we are debugging
  debugTarget = (config || {}).debug;
  if (debugTarget) {
    if (debugTarget === true) {
      logger.enable('*');
    }
    else if (Array.isArray(debugTarget)) {
      logger.enable.apply(logger, debugTarget);
    }
    else {
      logger.enable(debugTarget);
    }
  }

  // run the startup operations
  async.parallel(startupOps, function(err) {
    // TODO: check errors
    debug('startup ops completed, starting glue', config);
    eve('glue.ready');

    // if we don't have a room name, generate a room name
    if (! config.room) {
      config.room = generateRoomName();
    }

    // create the session manager
    sessionMgr = typeof Primus != 'undefined' && new SessionManager(config);

    if (sessionMgr) {
      sessionMgr.once('active', function() {
        qsa('*[rtc-capture]', scope).forEach(initCapture);

        // if we have any peers, then announce ourselves via the session manager
        if (peers.length > 0) {
          sessionMgr.announce();
        }

        // trigger a glue session active event
        eve('glue.connected', null, sessionMgr.signaller, sessionMgr);
      });
    }
    else {
      qsa('*[rtc-capture]', scope).forEach(initCapture);
    }
  });
};

// wire in the events helper
glue.events = require('./events');

// expose the config through glue
glue.config = config;

// autoload glue
if (typeof window != 'undefined') {
  on('load', window, function() {
    // check if we can autoload
    if (config.autoload === undefined || config.autoload) {
      glue();
    }
  });
}

/**
  ### Internal Functions
**/

/**
  #### initPeer(el)

  Handle the initialization of a rtc-remote target
**/
function initPeer(el) {
  var propValue = el.getAttribute('rtc-peer');
  var targetStream = el.getAttribute('rtc-stream');
  var peerRoles = propValue ? propValue.split(reSep) : ['*'];

  // create a data container that we will attach to the element
  var data = el._rtc || (el._rtc = {});

  function attachStream(stream) {
    debug('attaching stream');
    media(stream).render(el);
    data.streamId = stream.id;
  }

  function addStream(stream, peer) {
    // if we don't have a stream or already have a stream id then bail
    if (data.streamId) {
      return;
    }

    // if we have a particular target stream, then go looking for it
    if (targetStream) {
      debug('requesting stream data');
      sessionMgr.getStreamData(stream, function(data) {
        debug('got stream data', data);

        // if it's a match, then attach
        if (data && data.name === targetStream) {
          attachStream(stream);
        }
      });
    }
    // otherwise, automatically associate with the element
    else {
      attachStream(stream);
    }
  }

  // iterate through the peers and monitor events for that peer
  peerRoles.forEach(function(role) {
    eve.on('glue.peer.active.' + role, function(peer, peerId) {
      // if the element already has a peer, then do nothing
      if (data.peerId) {
        return;
      }

      debug('peer active', peer.getRemoteStreams());

      // associate the peer id with the element
      data.peerId = peerId;

      // add existing streams
      [].slice.call(peer.getRemoteStreams()).forEach(addStream);

      // listen for add straem events
      peer.addEventListener('addstream', function(evt) {
        addStream(evt.stream, peer);
      });
    });
  });

  eve.on('glue.peer.leave', function(peer, peerId) {
    // if the peer leaving matches the remote peer, then cleanup
    if (data.peerId === peerId) {
      // reset the target media element
      resetEl(el);

      // reset the rtc data
      data = el._rtc = {};
    }
  });

  return el;
}

/**
  #### initCapture(el)

  Handle the initialization of an rtc-capture target
**/
function initCapture(el) {
  // read the capture instructions
  var configText = el.getAttribute('rtc-capture') || '';
  var res = el.getAttribute('rtc-resolution') || el.getAttribute('rtc-res');
  var fps = el.getAttribute('rtc-fps');

  if (res) {
    configText += ' min:' + res + ' max:' + res;
  }

  if (fps) {
    configText += ' minfps:' + fps + ' maxfps:' + fps;
  }

  // patch in a capture method to the element
  el.capture = enableCapture(el, captureConfig(configText));

  // trigger capture
  el.capture(function(stream) {
    // broadcast the stream through the session manager
    if (sessionMgr) {
      sessionMgr.broadcast(stream, { name: el.id });
    }
  });
}

/** internal helpers */

function enableCapture(el, config) {

  function cap(callback) {
    var stream = media({
      constraints: config.toConstraints({
        sources: sources
      })
    });

    // render the stream to the target element
    stream.render(el);

    // capture and report errors
    stream.on('error', function(err) {
      console.log(
        'Error attempting to capture media, requested constraints',
        stream.constraints
      );
    });

    // emit a capture event through the element
    stream.on('capture', function(stream) {
      // dispatch the capture event
      el.dispatchEvent(new CustomEvent('capture', {
        detail: { stream: stream }
      }));

      // trigger the callback if one supplied
      if (typeof callback == 'function') {
        callback(stream);
      }
    });
  }

  return function(callback) {
    // if we already have sources, or cannot get source information
    // then skip straight to capture
    if (sources || (! canGetSources)) {
      return cap(callback);
    }

    // get and update sources
    MediaStreamTrack.getSources(function(s) {
      // update the sources
      sources = s;

      // capture
      cap(callback)
    });
  };
}

function generateRoomName() {
  location.hash = Math.pow(2, 53) * Math.random();

  return location.hash.slice(1);
}

function loadPrimus(callback) {
  return signaller.loadPrimus(config.signalhost, callback);
}
},{"./events":1,"./sessionmanager":56,"async":3,"cog/defaults":4,"cog/extend":5,"cog/logger":7,"eve":8,"fdom/meta":9,"fdom/on":10,"fdom/qsa":11,"rtc-captureconfig":12,"rtc-core/reset":14,"rtc-media":15,"rtc-signaller":21,"sdp-transform":52,"url":65}],3:[function(require,module,exports){
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

},{"__browserify_process":60}],4:[function(require,module,exports){
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
},{}],5:[function(require,module,exports){
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
    (firstChar == '[' && lastChar == ']');

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
// Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// ┌────────────────────────────────────────────────────────────┐ \\
// │ Eve 0.4.2 - JavaScript Events Library                      │ \\
// ├────────────────────────────────────────────────────────────┤ \\
// │ Author Dmitry Baranovskiy (http://dmitry.baranovskiy.com/) │ \\
// └────────────────────────────────────────────────────────────┘ \\

(function (glob) {
    var version = "0.4.2",
        has = "hasOwnProperty",
        separator = /[\.\/]/,
        wildcard = "*",
        fun = function () {},
        numsort = function (a, b) {
            return a - b;
        },
        current_event,
        stop,
        events = {n: {}},
    /*\
     * eve
     [ method ]

     * Fires event with given `name`, given scope and other parameters.

     > Arguments

     - name (string) name of the *event*, dot (`.`) or slash (`/`) separated
     - scope (object) context for the event handlers
     - varargs (...) the rest of arguments will be sent to event handlers

     = (object) array of returned values from the listeners
    \*/
        eve = function (name, scope) {
			name = String(name);
            var e = events,
                oldstop = stop,
                args = Array.prototype.slice.call(arguments, 2),
                listeners = eve.listeners(name),
                z = 0,
                f = false,
                l,
                indexed = [],
                queue = {},
                out = [],
                ce = current_event,
                errors = [];
            current_event = name;
            stop = 0;
            for (var i = 0, ii = listeners.length; i < ii; i++) if ("zIndex" in listeners[i]) {
                indexed.push(listeners[i].zIndex);
                if (listeners[i].zIndex < 0) {
                    queue[listeners[i].zIndex] = listeners[i];
                }
            }
            indexed.sort(numsort);
            while (indexed[z] < 0) {
                l = queue[indexed[z++]];
                out.push(l.apply(scope, args));
                if (stop) {
                    stop = oldstop;
                    return out;
                }
            }
            for (i = 0; i < ii; i++) {
                l = listeners[i];
                if ("zIndex" in l) {
                    if (l.zIndex == indexed[z]) {
                        out.push(l.apply(scope, args));
                        if (stop) {
                            break;
                        }
                        do {
                            z++;
                            l = queue[indexed[z]];
                            l && out.push(l.apply(scope, args));
                            if (stop) {
                                break;
                            }
                        } while (l)
                    } else {
                        queue[l.zIndex] = l;
                    }
                } else {
                    out.push(l.apply(scope, args));
                    if (stop) {
                        break;
                    }
                }
            }
            stop = oldstop;
            current_event = ce;
            return out.length ? out : null;
        };
		// Undocumented. Debug only.
		eve._events = events;
    /*\
     * eve.listeners
     [ method ]

     * Internal method which gives you array of all event handlers that will be triggered by the given `name`.

     > Arguments

     - name (string) name of the event, dot (`.`) or slash (`/`) separated

     = (array) array of event handlers
    \*/
    eve.listeners = function (name) {
        var names = name.split(separator),
            e = events,
            item,
            items,
            k,
            i,
            ii,
            j,
            jj,
            nes,
            es = [e],
            out = [];
        for (i = 0, ii = names.length; i < ii; i++) {
            nes = [];
            for (j = 0, jj = es.length; j < jj; j++) {
                e = es[j].n;
                items = [e[names[i]], e[wildcard]];
                k = 2;
                while (k--) {
                    item = items[k];
                    if (item) {
                        nes.push(item);
                        out = out.concat(item.f || []);
                    }
                }
            }
            es = nes;
        }
        return out;
    };
    
    /*\
     * eve.on
     [ method ]
     **
     * Binds given event handler with a given name. You can use wildcards “`*`” for the names:
     | eve.on("*.under.*", f);
     | eve("mouse.under.floor"); // triggers f
     * Use @eve to trigger the listener.
     **
     > Arguments
     **
     - name (string) name of the event, dot (`.`) or slash (`/`) separated, with optional wildcards
     - f (function) event handler function
     **
     = (function) returned function accepts a single numeric parameter that represents z-index of the handler. It is an optional feature and only used when you need to ensure that some subset of handlers will be invoked in a given order, despite of the order of assignment. 
     > Example:
     | eve.on("mouse", eatIt)(2);
     | eve.on("mouse", scream);
     | eve.on("mouse", catchIt)(1);
     * This will ensure that `catchIt()` function will be called before `eatIt()`.
	 *
     * If you want to put your handler before non-indexed handlers, specify a negative value.
     * Note: I assume most of the time you don’t need to worry about z-index, but it’s nice to have this feature “just in case”.
    \*/
    eve.on = function (name, f) {
		name = String(name);
		if (typeof f != "function") {
			return function () {};
		}
        var names = name.split(separator),
            e = events;
        for (var i = 0, ii = names.length; i < ii; i++) {
            e = e.n;
            e = e.hasOwnProperty(names[i]) && e[names[i]] || (e[names[i]] = {n: {}});
        }
        e.f = e.f || [];
        for (i = 0, ii = e.f.length; i < ii; i++) if (e.f[i] == f) {
            return fun;
        }
        e.f.push(f);
        return function (zIndex) {
            if (+zIndex == +zIndex) {
                f.zIndex = +zIndex;
            }
        };
    };
    /*\
     * eve.f
     [ method ]
     **
     * Returns function that will fire given event with optional arguments.
	 * Arguments that will be passed to the result function will be also
	 * concated to the list of final arguments.
 	 | el.onclick = eve.f("click", 1, 2);
 	 | eve.on("click", function (a, b, c) {
 	 |     console.log(a, b, c); // 1, 2, [event object]
 	 | });
     > Arguments
	 - event (string) event name
	 - varargs (…) and any other arguments
	 = (function) possible event handler function
    \*/
	eve.f = function (event) {
		var attrs = [].slice.call(arguments, 1);
		return function () {
			eve.apply(null, [event, null].concat(attrs).concat([].slice.call(arguments, 0)));
		};
	};
    /*\
     * eve.stop
     [ method ]
     **
     * Is used inside an event handler to stop the event, preventing any subsequent listeners from firing.
    \*/
    eve.stop = function () {
        stop = 1;
    };
    /*\
     * eve.nt
     [ method ]
     **
     * Could be used inside event handler to figure out actual name of the event.
     **
     > Arguments
     **
     - subname (string) #optional subname of the event
     **
     = (string) name of the event, if `subname` is not specified
     * or
     = (boolean) `true`, if current event’s name contains `subname`
    \*/
    eve.nt = function (subname) {
        if (subname) {
            return new RegExp("(?:\\.|\\/|^)" + subname + "(?:\\.|\\/|$)").test(current_event);
        }
        return current_event;
    };
    /*\
     * eve.nts
     [ method ]
     **
     * Could be used inside event handler to figure out actual name of the event.
     **
     **
     = (array) names of the event
    \*/
    eve.nts = function () {
        return current_event.split(separator);
    };
    /*\
     * eve.off
     [ method ]
     **
     * Removes given function from the list of event listeners assigned to given name.
	 * If no arguments specified all the events will be cleared.
     **
     > Arguments
     **
     - name (string) name of the event, dot (`.`) or slash (`/`) separated, with optional wildcards
     - f (function) event handler function
    \*/
    /*\
     * eve.unbind
     [ method ]
     **
     * See @eve.off
    \*/
    eve.off = eve.unbind = function (name, f) {
		if (!name) {
		    eve._events = events = {n: {}};
			return;
		}
        var names = name.split(separator),
            e,
            key,
            splice,
            i, ii, j, jj,
            cur = [events];
        for (i = 0, ii = names.length; i < ii; i++) {
            for (j = 0; j < cur.length; j += splice.length - 2) {
                splice = [j, 1];
                e = cur[j].n;
                if (names[i] != wildcard) {
                    if (e[names[i]]) {
                        splice.push(e[names[i]]);
                    }
                } else {
                    for (key in e) if (e[has](key)) {
                        splice.push(e[key]);
                    }
                }
                cur.splice.apply(cur, splice);
            }
        }
        for (i = 0, ii = cur.length; i < ii; i++) {
            e = cur[i];
            while (e.n) {
                if (f) {
                    if (e.f) {
                        for (j = 0, jj = e.f.length; j < jj; j++) if (e.f[j] == f) {
                            e.f.splice(j, 1);
                            break;
                        }
                        !e.f.length && delete e.f;
                    }
                    for (key in e.n) if (e.n[has](key) && e.n[key].f) {
                        var funcs = e.n[key].f;
                        for (j = 0, jj = funcs.length; j < jj; j++) if (funcs[j] == f) {
                            funcs.splice(j, 1);
                            break;
                        }
                        !funcs.length && delete e.n[key].f;
                    }
                } else {
                    delete e.f;
                    for (key in e.n) if (e.n[has](key) && e.n[key].f) {
                        delete e.n[key].f;
                    }
                }
                e = e.n;
            }
        }
    };
    /*\
     * eve.once
     [ method ]
     **
     * Binds given event handler with a given name to only run once then unbind itself.
     | eve.once("login", f);
     | eve("login"); // triggers f
     | eve("login"); // no listeners
     * Use @eve to trigger the listener.
     **
     > Arguments
     **
     - name (string) name of the event, dot (`.`) or slash (`/`) separated, with optional wildcards
     - f (function) event handler function
     **
     = (function) same return function as @eve.on
    \*/
    eve.once = function (name, f) {
        var f2 = function () {
            eve.unbind(name, f2);
            return f.apply(this, arguments);
        };
        return eve.on(name, f2);
    };
    /*\
     * eve.version
     [ property (string) ]
     **
     * Current version of the library.
    \*/
    eve.version = version;
    eve.toString = function () {
        return "You are running Eve " + version;
    };
    (typeof module != "undefined" && module.exports) ? (module.exports = eve) : (typeof define != "undefined" ? (define("eve", [], function() { return eve; })) : (glob.eve = eve));
})(this);

},{}],9:[function(require,module,exports){
/* jshint node: true */
'use strict';

var qsa = require('./qsa');
var reBool = /^(true|false)$/i

/**
  ### meta(regex?)

  Find all the `<meta>` tags that have a name attribute and collate as a
  simple JS objects whether the content of the tag is the value.

  <<< examples/meta.js

**/
module.exports = function(regex) {
  var data = {};

  // find all the meta tags with a name and extract the content
  qsa('meta[name]').forEach(function(tag) {
    var name = tag.getAttribute('name');
    var match = regex ? regex.exec(name) : [name, name];

    if (match) {
      data[match[1] || match[0]] = coerce(tag.getAttribute('content') || '');
    }
  });

  return data;
};

function coerce(value) {
  value = parseFloat(value) || value;

  if (reBool.test(value)) {
    value = value == 'true';
  }

  return value;
}
},{"./qsa":11}],10:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ### on

  ```
  f(name, => el, => cb)
  ```

  The `on` helper assists with working with DOM events and being able to map
  those to a node callback style function in the form:

  ```js
  function(err, evt) {
  }
  ```

  When the event is triggered by the `el` the callback is fired passing
  a null value to the `err` argument.

  <<< examples/on.js
**/
module.exports = function(name, el, callback) {
  function bind(t, trigger) {
    var buffered = [];

    function handleEvent(evt) {
      if (typeof trigger == 'function') {
        return trigger(null, evt);
      }

      // otherwise, buffer the event
      buffered[buffered.length] = evt;
    }

    // listen for events
    t.addEventListener(name, handleEvent);

    // if we have been provided a trigger function (not an array index)
    // then return the handle event call
    return typeof trigger == 'function' ? handleEvent : function(cb) {
      trigger = cb;

      // if we have a buffered results, trigger those now
      if (buffered.length > 0) {
        buffered.splice(0).forEach(function(evt) {
          cb(null, evt);
        });
      }
    };
  }

  return el ? bind(el, callback) : bind;
};
},{}],11:[function(require,module,exports){
/* jshint node: true */
/* global document: false */
'use strict';

var classSelectorRE = /^\.([\w\-]+)$/;
var idSelectorRE = /^#([\w\-]+)$/;
var tagSelectorRE = /^[\w\-]+$/;

/**
  ### qsa(selector, scope?)

  This function is used to get the results of the querySelectorAll output
  in the fastest possible way.  This code is very much based on the
  implementation in
  [zepto](https://github.com/madrobby/zepto/blob/master/src/zepto.js#L104),
  but perhaps not quite as terse.

  <<< examples/qsa.js

**/
module.exports = function(selector, scope) {
  var idSearch;

  // default the element to the document
  scope = scope || document;

  // determine whether we are doing an id search or not
  idSearch = scope === document && idSelectorRE.test(selector);

  // perform the search
  return idSearch ?
    // we are doing an id search, return the element search in an array
    [scope.getElementById(RegExp.$1)] :
    // not an id search, call the appropriate selector
    Array.prototype.slice.call(
        classSelectorRE.test(selector) ?
          scope.getElementsByClassName(RegExp.$1) :
            tagSelectorRE.test(selector) ?
              scope.getElementsByTagName(selector) :
              scope.querySelectorAll(selector)
    );
};
},{}],12:[function(require,module,exports){
/* jshint node: true */
'use strict';

var reSeparator = /[\,\s]\s*/;
var offFlags = ['false', 'none', 'off'];


/**
  # rtc-captureconfig

  This is a simple parser that takes a string of text and determines what
  that means in the context of WebRTC.

  ## Why?

  It provides a simple, textual way of describing your requirements for
  media capture.  Trying to remember the structure of the constraints object
  is painful.

  ## How

  A simple text string is converted to an intermediate JS object
  representation, which can then be converted to a getUserMedia constraints
  data structure using a `toConstraints()` call.

  For example, the following text input:

  ```
  camera min:1280x720 max:1280x720 min:15fps max:25fps
  ```

  Is converted into an intermedia representation (via the `CaptureConfig`
  utility class) that looks like the following:

  ```js
  {
    camera: 0,
    microphone: 0,
    res: {
      min: { w: 1280, h: 720 },
      max: { w: 1280, h: 720 }
    },

    fps: {
      min: 15,
      max: 25
    }
  }
  ```

  Which in turn is converted into the following media constraints for
  a getUserMedia call:

  ```js
  {
    audio: true,
    video: {
      mandatory: {
        minFrameRate: 15,
        maxFrameRate: 25,

        minWidth: 1280,
        minHeight: 720,
        maxWidth: 1280,
        maxHeight: 720
      },

      optional: []
    }
  }
  ```

  ### Experimental: Targeted Device Capture

  While the `rtc-captureconfig` module itself doesn't contain any media
  identification logic, it is able to the sources information from a
  `MediaStreamTrack.getSources` call to generate device targeted constraints.

  For instance, the following example demonstrates how we can request
  `camera:1` (the 2nd video device on our local machine) when we are making
  a getUserMedia call:

  <<< examples/camera-two.js

  It's worth noting that if the requested device does not exist on the
  machine (in the case above, if your machine only has a single webcam - as
  is common) then no device selection constraints will be generated (i.e.
  the standard `{ video: true, audio: true }` constraints will be returned
  from the `toConstraints` call).

  ### Experimental: Screen Capture

  If you are working with chrome and serving content of a HTTPS connection,
  then you will be able to experiment with experimental getUserMedia screen
  capture.

  In the simplest case, screen capture can be invoked by using the capture
  string of:

  ```
  screen
  ```

  Which generates the following contraints:

  ```js
  {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'screen'
      },

      optional: []
    }
  }
  ```

  ## Reference

**/

module.exports = function(input) {
  // create a new configuration object using defaults
  var config = new CaptureConfig();

  // process each of the directives
  (input || '').split(reSeparator).forEach(function(directive) {
    // now further split the directive on the : character
    var parts = directive.split(':');
    var method = config[(parts[0] || '').toLowerCase()];

    // if we have the method apply
    if (typeof method == 'function') {
      method.apply(config, parts.slice(1));
    }
  });

  return config;
};

/**
  ### CaptureConfig

  This is a utility class that is used to update capture configuration
  details and is able to generate suitable getUserMedia constraints based
  on the configuration.

**/
function CaptureConfig() {
  if (! (this instanceof CaptureConfig)) {
    return new CaptureConfig();
  }

  // initialise the base config
  this.cfg = {
    microphone: true
  };
}

/**
  #### camera(index)

  Update the camera configuration to the specified index
**/
CaptureConfig.prototype.camera = function(index) {
  this.cfg.camera = trueOrValue(index);
};

/**
  #### microphone(index)

  Update the microphone configuration to the specified index
**/
CaptureConfig.prototype.microphone = function(index) {
  this.cfg.microphone = trueOrValue(index);
};

/**
  #### screen(target)

  Specify that we would like to capture the screen
**/
CaptureConfig.prototype.screen = function() {
  // unset the microphone config
  delete this.cfg.microphone;

  // set the screen configuration
  this.cfg.screen = true;
};

/**
  #### max(data)

  Update a maximum constraint.  If an fps constraint this will be directed
  to the `maxfps` modifier.

**/
CaptureConfig.prototype.max = function(data) {
  var res;

  // if this is an fps specification parse
  if (data.slice(-3).toLowerCase() == 'fps') {
    return this.maxfps(data);
  }

  // parse the resolution
  res = this._parseRes(data);

  // initialise the fps config stuff
  this.cfg.res = this.cfg.res || {};
  this.cfg.res.max = res;
};

/**
  #### maxfps(data)

  Update the maximum fps
**/
CaptureConfig.prototype.maxfps = function(data) {
  // ensure we have an fps component
  this.cfg.fps = this.cfg.fps || {};

  // set the max fps
  this.cfg.fps.max = parseFloat(data.slice(0, -3));
};

/**
  #### min(data)

  Update a minimum constraint.  This can be either related to resolution
  or FPS.
**/
CaptureConfig.prototype.min = function(data) {
  var res;

  // if this is an fps specification parse
  if (data.slice(-3).toLowerCase() == 'fps') {
    return this.minfps(data);
  }

  // parse the resolution
  res = this._parseRes(data);

  // initialise the fps config stuff
  this.cfg.res = this.cfg.res || {};

  // add the min
  this.cfg.res.min = res;
};

/**
  #### minfps(data)

  Update the minimum fps
**/
CaptureConfig.prototype.minfps = function(data) {
  // ensure we have an fps component
  this.cfg.fps = this.cfg.fps || {};

  // set the max fps
  this.cfg.fps.min = parseFloat(data.slice(0, -3));
};

/**
  #### toConstraints(opts?)

  Convert the internal configuration object to a valid media constraints
  representation.  In compatible browsers a list of media sources can
  be passed through in the `opts.sources` to create contraints that will
  target a specific device when captured.

  <<< examples/capture-targets.js

**/
CaptureConfig.prototype.toConstraints = function(opts) {
  var cfg = this.cfg;
  var constraints = {
    audio: cfg.microphone === true ||
      (typeof cfg.microphone == 'number' && cfg.microphone >= 0),

    video: cfg.camera === true || cfg.screen ||
      (typeof cfg.camera == 'number' && cfg.camera >= 0)
  };

  // mandatory constraints
  var m = {
    video: {},
    audio: {}
  };

  // optional constraints
  var o = {
    video: [],
    audio: []
  };

  var sources = (opts || {}).sources || [];
  var cameras = sources.filter(function(info) {
    return info && info.kind === 'video';
  });
  var microphones = sources.filter(function(info) {
    return info && info.kind === 'audio';
  });
  var selectedSource;

  function complexConstraints(target) {
    if (constraints[target] && typeof constraints[target] != 'object') {
      constraints[target] = {
        mandatory: m[target],
        optional: o[target]
      };
    }
  }

  // fps
  if (cfg.fps) {
    complexConstraints('video');
    cfg.fps.min && (m.video.minFrameRate = cfg.fps.min);
    cfg.fps.max && (m.video.maxFrameRate = cfg.fps.max);
  }

  // min res specified
  if (cfg.res && cfg.res.min) {
    complexConstraints('video');
    m.video.minWidth = cfg.res.min.w;
    m.video.minHeight = cfg.res.min.h;
  }

  // max res specified
  if (cfg.res && cfg.res.max) {
    complexConstraints('video');
    m.video.maxWidth = cfg.res.max.w;
    m.video.maxHeight = cfg.res.max.h;
  }

  // input camera selection
  if (typeof cfg.camera == 'number' && cameras.length) {
    selectedSource = cameras[cfg.camera];

    if (selectedSource) {
      complexConstraints('video');
      o.video.push({ sourceId: selectedSource.id });
    }
  }

  // input microphone selection
  if (typeof cfg.microphone == 'number' && microphones.length) {
    selectedSource = microphones[cfg.microphone];

    if (selectedSource) {
      complexConstraints('audio');
      o.audio.push({ sourceId: selectedSource.id });
    }
  }

  // if we have screen constraints, make magic happen
  if (typeof cfg.screen != 'undefined') {
    complexConstraints('video');
    m.video.chromeMediaSource = 'screen';
  }

  return constraints;
};

/**
  ### "Internal" methods
**/

/**
  #### _parseRes(data)

  Parse a resolution specifier (e.g. 1280x720) into a simple JS object
  (e.g. { w: 1280, h: 720 })
**/
CaptureConfig.prototype._parseRes = function(data) {
  // split the data on the 'x' character
  var parts = data.split('x');

  // if we don't have two parts, then complain
  if (parts.length < 2) {
    throw new Error('Invalid resolution specification: ' + data);
  }

  // return the width and height object
  return {
    w: parseInt(parts[0], 10),
    h: parseInt(parts[1], 10)
  };
};

/* internal helper */

function trueOrValue(val) {
  if (typeof val == 'string' && offFlags.indexOf(val.toLowerCase()) >= 0) {
    return false;
  }

  return val === undefined || val === '' || parseInt(val || 0, 10);
}
},{}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ## rtc-core/reset

  This is a simple, cross-browser method for resetting a media element
  back to a initial state after having media attached.

**/
module.exports = function(el) {
  // remove the source
  el.src = null;

  // check for moz
  if (el.mozSrcObject) {
    el.mozSrcObject = null;
  }

  // check for currentSrc
  if (el.currentSrc) {
    el.currentSrc = null;
  }

  // return the input (map friendly)
  return el;
};
},{}],15:[function(require,module,exports){
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

var debug = require('cog/logger')('media');
var extend = require('cog/extend');
var detect = require('rtc-core/detect');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

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
  if (! (this instanceof Media)) {
    return new Media(opts);
  }

  // inherited
  EventEmitter.call(this);

  // if the opts is a media stream instance, then handle that appropriately
  if (opts && opts instanceof MediaStream) {
    opts = {
      stream: opts,
      capture: false,
      muted: false
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
    capture: true,
    muted: true,
    constraints: {
      video: {
        mandatory: {},
        optional: []
      },
      audio: true
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

  // if we are autostarting, capture media on the next tick
  if (opts.capture) {
    setTimeout(this.capture.bind(this), 0);
  }
}

util.inherits(Media, EventEmitter);
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

  // get user media, using either the provided constraints or the
  // default constraints
  navigator.getUserMedia(
    constraints || this.constraints,
    function(stream) {
      if (typeof stream.addEventListener == 'function') {
        stream.addEventListener('ended', handleEnd);
      }
      else {
        stream.onended = handleEnd;
      }

      // save the stream and emit the start method
      media.stream = stream;
      media.emit('capture', stream);
    },
    this._handleFail.bind(this)
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

  // perform some additional checks for things that "look" like a
  // media element
  validElement = validElement || (typeof element.play == 'function') && (
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
    element.setAttribute('muted', '');
  }

  // flag the element as bound
  this._bindings.push({
    el: element,
    opts: opts
  });

  return element;
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

  function playbackStarted(evt) {
    var el = evt.target || evt.srcElement;
    var videoIndex = elements.indexOf(el);

    if (videoIndex >= 0) {
      waiting.splice(videoIndex, 1);
    }

    el.removeEventListener('playing', playbackStarted);
    checkWaiting();
  }

  // iterate through the bindings and bind the stream
  elements = this._bindings.map(function(binding) {
    // check for mozSrcObject
    if (typeof binding.el.mozSrcObject != 'undefined') {
      binding.el.mozSrcObject = stream;
    }
    else {
      binding.el.src = media._createObjectURL(stream) || stream;
    }

    // attempt to play the video
    if (typeof binding.el.play == 'function') {
      binding.el.play();
    }

    return binding.el;
  });

  // find the elements we are waiting on
  waiting = elements.filter(function(el) {
    return el.readyState < 3; // readystate < HAVE_FUTURE_DATA
  });

  // wait for all the video elements
  waiting.map(function(el) {
    el.addEventListener('playing', playbackStarted, false);
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
  ### _handleFail(evt)

  Handle the failure condition of a `getUserMedia` call.

**/
Media.prototype._handleFail = function(err) {
  this.emit('error', err);
};
},{"cog/extend":5,"cog/logger":7,"events":57,"rtc-core/detect":13,"util":67}],16:[function(require,module,exports){
/* jshint node: true */
'use strict';

var debug = require('cog/logger')('rtc-signaller-announce');
var extend = require('cog/extend');
var roles = ['a', 'b'];

/**
  ### announce

  ```
  /announce|{"id": "...", ... }
  ```

  When an announce message is received by the signaller, the attached
  object data is decoded and the signaller emits an `announce` message.

  #### Events Triggered in response to `/announce`

  There are two different types of `peer:` events that can be triggered
  in on peer B to calling the `announce` method on peer A.

  - `peer:announce`

    The `peer:announce` event is triggered when a new peer has been
    discovered.  The data for the new peer (as an JS object) is provided
    as the first argument of the event handler.

  - `peer:update`

    If a peer "reannounces" then a `peer:update` event will be triggered
    rather than a `peer:announce` event.

**/
module.exports = function(signaller) {

  function copyData(target, source) {
    if (target && source) {
      for (var key in source) {
        if (key != 'clock') {
          target[key] = source[key];
        }
      }
    }

    return target;
  }

  return function(args, messageType, clock) {
    var data = args[0];
    var peer;

    // if we have valid data then process
    if (data && data.id) {
      // check to see if this is a known peer
      peer = signaller.peers.get(data.id);

      // if the peer is existing, then update the data
      if (peer) {
        debug('signaller: ' + signaller.id + ' received update, data: ', data);

        // update the data
        copyData(peer.data, data);

        // trigger the peer update event
        return signaller.emit('peer:update', data);
      }

      // create a new peer
      peer = {
        id: data.id,

        // initialise the local role index
        roleIdx: [data.id, signaller.id].sort().indexOf(data.id),

        // initialise the vector clock
        clock: clock || { a: 0, b: 0 },

        // initialise the peer data
        data: {}
      };

      // initialise the peer data
      copyData(peer.data, data);

      // set the peer data
      signaller.peers.set(data.id, peer);

      // if this is an initial announce message (no vector clock attached)
      // then send a announce reply
      if (signaller.autoreply && (! clock)) {
        signaller
          .to(data.id)
          .send('/announce', signaller.attributes);
      }

      // emit a new peer announce event
      return signaller.emit('peer:announce', data, peer);
    }
  };
};
},{"cog/extend":5,"cog/logger":7}],17:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ## signaller message handlers

**/

module.exports = function(signaller) {
  return {
    announce: require('./announce')(signaller),
    leave: require('./leave')(signaller),
    lock: require('./lock')(signaller),
    unlock: require('./unlock')(signaller)
  };
};
},{"./announce":16,"./leave":18,"./lock":19,"./unlock":20}],18:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ### leave

  ```
  /leave|{"id":"..."}
  ```

  When a leave message is received from a peer, we check to see if that is
  a peer that we are managing state information for and if we are then the
  peer state is removed.

  #### Events triggered in response to `/leave` messages

  The following event(s) are triggered when a `/leave` action is received
  from a peer signaller:

  - `peer:leave`

    The `peer:leave` event is emitted once a `/leave` message is captured
    from a peer.  Prior to the event being dispatched, the internal peers
    data in the signaller is removed but can be accessed in 2nd argument
    of the event handler.

**/
module.exports = function(signaller) {
  return function(args) {
    var data = args[0];
    var peer = signaller.peers.get(data && data.id);

    // remove the peer from the peers data
    if (peer) {
      signaller.peers.delete(data.id);
    }

    // emit the event
    signaller.emit('peer:leave', data.id, peer);
  };
};
},{}],19:[function(require,module,exports){
/* jshint node: true */
'use strict';

var debug = require('cog/logger')('rtc-signaller-lock');
var vc = require('vectorclock');
var FastMap = require('collections/fast-map');

/**
  ### lock

  ```
  /lock
  ```

  A `/lock` request can only be sent within the context of a `/to` message
  and thus must contain source data to be processed correctly.  The `/lock`
  message is used to coordinate betwen two remote peers in the case that
  both peers which to commence renegotiation at the same time.

  In the case that two peers attempt to renegotiate with each other at the
  same time, then the peer that has been identified as party `a` in the peer
  relationship will take on the role of the initiator in the negotiation and
  party `b` will respond to the offer sdp.

**/
module.exports = function(signaller) {
  return function(args, messageType, clock, srcState) {
    var clockComparison;
    var success = false;
    var label = args[0];

    // if we don't have a clock value or don't know about the source
    // then just drop the message
    if ((! clock) || (! srcState)) {
      return;
    }

    debug('received "' + label + '" lock request from src: ' + srcState.id);
    clockComparison = vc.compare(clock, srcState.clock);

    // if the remote clock is greater than the lock clock state
    // then the lock is automatically successful
    success = (! signaller.locks.get(label)) ||
      clockComparison > 0 ||
      (clockComparison === 0 && srcState.roleIdx === 0);

    debug('signaller ' + signaller.id + ' checking lock state');
    debug('clock value in message: ', clock);
    debug('cached peer clock state: ', srcState.clock);
    debug('clock comparison = ' + clockComparison + ' ok: ' + success, srcState);

    // if the lock is successful, then add the lock info to the srcState
    if (success) {
      // ensure we have a locks member
      srcState.locks = srcState.locks || new FastMap();

      // create the lock
      srcState.locks.set(label, { id: args[1] || '' });
    }

    // send the lock result
    signaller.to(srcState.id).send('/lockresult', {
      label: label,
      ok: success
    });
  };
};
},{"cog/logger":7,"collections/fast-map":23,"vectorclock":42}],20:[function(require,module,exports){
/* jshint node: true */
'use strict';

var debug = require('cog/logger')('rtc-signaller-lock');
var vc = require('vectorclock');

/**
  ### unlock

  ```
  /unlock|label
  ```

  Clear a remote lock

**/
module.exports = function(signaller) {
  return function(args, messageType, clock, srcState) {
    var label = args[0];
    var ok = false;

    // if we don't have a clock value or don't know about the source
    // then just drop the message
    if ((! clock) || (! srcState)) {
      return;
    }

    debug('received "' + label + '" unlock request from src: ' + srcState.id);

    // if the peer has an active lock, remove it
    if (srcState.locks) {
      // TODO: check for a matching lockid
      srcState.locks.delete(label);
      ok = true;
    }

    // send the lock message
    signaller.to(srcState.id).send('/unlockresult', {
      label: label,
      ok: ok
    });
  };
};
},{"cog/logger":7,"vectorclock":42}],21:[function(require,module,exports){
/* jshint node: true */
'use strict';

var debug = require('cog/logger')('rtc-signaller');
var detect = require('rtc-core/detect');
var EventEmitter = require('events').EventEmitter;
var uuid = require('uuid');
var extend = require('cog/extend');
var FastMap = require('collections/fast-map');
var vc = require('vectorclock');

/**
  # rtc-signaller

  The `rtc-signaller` module provides a transportless signalling
  mechanism for WebRTC.

  ## Purpose

  The signaller provides set of client-side tools that assist with the
  setting up an `PeerConnection` and helping them communicate. All that is
  required for the signaller to operate is a suitable messenger.

  A messenger is a simple object that implements node
  [EventEmitter](http://nodejs.org/api/events.html) style `on` events for
  `open`, `close`, `message` events, and also a `send` method by which
  data will be send "over-the-wire".

  By using this approach, we can conduct signalling over any number of
  mechanisms:

  - local, in memory message passing
  - via WebSockets and higher level abstractions (such as
    [primus](https://github.com/primus/primus))
  - also over WebRTC data-channels (very meta, and admittedly a little
    complicated).

  ## Getting Started

  To work with the signaller, you first need a messenger of some kind. If you
  have run up a version of the
  [rtc-switchboard](https://github.com/rtc-io/rtc-switchboard) somewhere then
  the following example should work:

  <<< examples/signalling-via-switchboard.js

  While the example above demonstrates communication between two endpoints
  via websockets, it does not go into detail on setting up a WebRTC peer
  connection (as that is significantly more involved).  If you are looking for
  an easy way to do this, I'd recommend checking out
  [rtc-quickconnect](https://github.com/rtc-io/rtc-quickconnect) or
  [rtc-glue](https://github.com/rtc-io/rtc-glue).

  ## Signal Flow Diagrams

  Displayed below are some diagrams how the signalling flow between peers
  behaves.  In each of the diagrams we illustrate three peers (A, B and C)
  participating discovery and coordinating RTCPeerConnection handshakes.

  In each case, only the interaction between the clients is represented not
  how a signalling server
  (such as [rtc-switchboard](https://github.com/rtc-io/rtc-switchboard)) would
  pass on broadcast messages, etc.  This is done for two reasons:

  1. It is out of scope of this documentation.
  2. The `rtc-signaller` has been designed to work without having to rely on
     any intelligence in the server side signalling component.  In the
     instance that a signaller broadcasts all messages to all connected peers
     then `rtc-signaller` should be smart enough to make sure everything works
     as expected.

  ### Peer Discovery / Announcement

  This diagram illustrates the process of how peer `A` announces itself to
  peers `B` and `C`, and in turn they announce themselves.

  ![](https://raw.github.com/rtc-io/rtc-signaller/master/docs/announce.png)

  ### Editing / Updating the Diagrams

  Each of the diagrams has been generated using
  [mscgen](http://www.mcternan.me.uk/mscgen/index.html) and the source for
  these documents can be found in the `docs/` folder of this repository.

  ## Reference

  The `rtc-signaller` module is designed to be used primarily in a functional
  way and when called it creates a new signaller that will enable
  you to communicate with other peers via your messaging network.

  ```js
  // create a signaller from something that knows how to send messages
  var signaller = require('rtc-signaller')(messenger);
  ```

**/
var sig = module.exports = function(messenger, opts) {

  // get the autoreply setting
  var autoreply = (opts || {}).autoreply;

  // create the signaller
  var signaller = new EventEmitter();

  // initialise the id
  var id = signaller.id = uuid.v4();

  // initialise the attributes
  var attributes = signaller.attributes = {
    browser: detect.browser,
    browserVersion: detect.browserVersion,
    id: id
  };

  // create the peers map
  var peers = signaller.peers = new FastMap();

  // create our locks map
  var locks = signaller.locks = new FastMap();

  // initialise the data event name
  var dataEvent = (opts || {}).dataEvent || 'data';
  var openEvent = (opts || {}).openEvent || 'open';
  var writeMethod = (opts || {}).writeMethod || 'write';
  var closeMethod = (opts || {}).closeMethod || 'close';

  // extract the write and close function references
  var write = messenger[writeMethod];
  var close = messenger[closeMethod];

  // set the autoreply flag
  signaller.autoreply = autoreply === undefined || autoreply;

  // create the processor
  var processor = require('./processor')(signaller);

  // if the messenger doesn't provide a valid write method, then complain
  if (typeof write != 'function') {
    throw new Error('provided messenger does not implement a "' +
      writeMethod + '" write method');
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
    ### signaller#send(data)

    Send data over the messenging interface.
  **/
  var send = signaller.send = function() {
    // iterate over the arguments and stringify as required
    var args = [].slice.call(arguments);
    var dataline = args.map(prepareArg).filter(Boolean).join('|');

    // send the data over the messenger
    return write.call(messenger, dataline);
  };

  /**
    ### signaller#announce(data?)

    The `announce` function of the signaller will pass an `/announce` message
    through the messenger network.  When no additional data is supplied to
    this function then only the id of the signaller is sent to all active
    members of the messenging network.

    As a unique it is generally insufficient information to determine whether
    a peer is a good match for another (for instance,  you might be looking
    for other parties by name or role) it is generally a good idea to provide
    some additional information during this announce call:

    ```js
    signaller.announce({ role: 'translator' });
    ```

    __NOTE:__ In some particular messenger types may attach or infer
    additional data during the announce phase.  For instance, socket.io
    connections are generally organised into rooms which is inferred
    information that limits the messaging scope.
  **/
  signaller.announce = function(data, sender) {
    // update internal attributes
    extend(attributes, data, { id: signaller.id });

    // send the attributes over the network
    return (sender || send)('/announce', attributes);
  };

  /**
    ### signaller#leave()

    Leave the messenger mesh
  **/
  signaller.leave = function() {
    // send the leave signal
    send('/leave', { id: id });

    // call the close method
    if (typeof close == 'function') {
      close.call(messenger);
    }
  };

  /**
    ### signaller#lock(targetId, opts?, callback?)

    Attempt to get a temporary exclusive lock on the communication
    channel between the local signaller and the specified target peer id.
  **/
  signaller.lock = function(targetId, opts, callback) {
    var peer = peers.get(targetId);
    var activeLock;
    var lockid = uuid.v4();
    var label;

    function handleLockResult(result, src) {
      var ok = result && result.ok;

      // if the source does not match the target then abort
      if ((! src) || (src.id !== targetId)) {
        return;
      }

      // if the result label is not a match, then abort
      if ((! result) || (result.label !== label)) {
        return;
      }

      // don't listen for any further lock result messages
      signaller.removeListener('lockresult', handleLockResult);

      // if we don't have an error condition, create an active local lock
      if (ok) {
        locks.set(label, activeLock = { id: lockid });
      }
      // otherwise, delete the local provisional lock
      else if (activeLock) {
        locks.delete(label);
      }

      callback(ok ? null : new Error('could not acquire lock'));
    }

    // check for no label being supplied
    if (typeof opts == 'function') {
      callback = opts;
      opts = {};
    }

    // ensure we have a callback
    callback = callback || function() {};

    // if the peer is not known, then we cannot initiate a lock
    if (! peer) {
      return callback(new Error('unknown target id - cannot initiate lock'));
    }

    // create a default label if none provided
    label = (opts || {}).label || (opts || {}).name || 'default';

    // if we have a local lock already in place, then return ok
    activeLock = locks.get(label);
    if (activeLock && (! activeLock.provisional)) {
      return callback();
    }

    // ensure we have locks for the peer
    peer.locks = peer.locks || new FastMap();

    // if a remote lock is in place, error out
    if (peer.locks.get(label)) {
      return callback(new Error('remote lock in place, cannot request lock'));
    }

    // create a provisional lock
    locks.set(label, activeLock = { id: lockid, provisional: true });

    // wait for the lock result
    signaller.on('lockresult', handleLockResult);

    // send the lock message
    signaller.to(targetId).send('/lock', label, lockid);
  };

  /**
    ### signaller#to(targetId)

    The to method returns an encapsulated

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

      args = [
        '/to',
        targetId,
        { id: signaller.id, clock: peer.clock }
      ].concat([].slice.call(arguments));

      // increment the peer clock, using the role of the local
      // signaller.  If the peer role is 0, then the signallers role is 1
      // and using xor (^) will generate the correct index
      vc.increment(peer, ['a', 'b'][peer.roleIdx ^ 1]);

      // write on next tick to ensure clock updates are handled correctly
      setTimeout(function() {
        var msg = args.map(prepareArg).filter(Boolean).join('|');
        debug('TX (' + targetId + '): ', msg);

        // include the current clock value in with the payload
        write.call(messenger, msg);
      }, 0);
    };

    return {
      announce: function(data) {
        return signaller.announce(data, sender);
      },

      send: sender,
    }
  };

  /**

    ### signaller#unlock(targetId, opts?)

  **/
  signaller.unlock = function(targetId, opts, callback) {
    var peer = peers.get(targetId);
    var label;

    function handleUnlockResult(result, src) {
      var ok = result && result.ok;

      // if not the correct source then abort
      if ((! src) || (src.id !== targetId)) {
        return;
      }

      // if this is not an unlock result for this label, then abort
      if ((! result) || (result.label !== label)) {
        return;
      }

      // remove the listener
      signaller.removeListener('unlockresult', handleUnlockResult);

      // if ok, remove our local lock
      if (ok) {
        locks.delete(label);
      }

      // trigger the callback
      callback(ok ? null : new Error('could not release lock: ' + label));
    }

    // handle the no opts case
    if (typeof opts == 'function') {
      callback = opts;
      opts = {};
    }

    // ensure we have a callback
    callback = callback || function() {};

    // set a default label value
    label = (opts || {}).label || (opts || {}).name || 'default';

    // if we have the peer and local lock then action the unlock
    if (peer && locks.get(label)) {
      signaller.on('unlockresult', handleUnlockResult);
      signaller.to(targetId).send('/unlock', label, locks.get(label));
    }
    else {
      return callback(new Error('no local lock with label ' + label));
    }
  };

  // handle message data events
  messenger.on(dataEvent, processor);

  // pass through open events
  messenger.on(openEvent, signaller.emit.bind(signaller, 'open'));

  return signaller;
};

sig.loadPrimus = require('./primus-loader');
},{"./primus-loader":43,"./processor":44,"cog/extend":5,"cog/logger":7,"collections/fast-map":23,"events":57,"rtc-core/detect":13,"uuid":41,"vectorclock":42}],22:[function(require,module,exports){
"use strict";

var Shim = require("./shim");
var GenericCollection = require("./generic-collection");
var GenericMap = require("./generic-map");
var PropertyChanges = require("./listen/property-changes");

// Burgled from https://github.com/domenic/dict

module.exports = Dict;
function Dict(values, getDefault) {
    if (!(this instanceof Dict)) {
        return new Dict(values, getDefault);
    }
    getDefault = getDefault || Function.noop;
    this.getDefault = getDefault;
    this.store = {};
    this.length = 0;
    this.addEach(values);
}

Dict.Dict = Dict; // hack so require("dict").Dict will work in MontageJS.

function mangle(key) {
    return "~" + key;
}

function unmangle(mangled) {
    return mangled.slice(1);
}

Object.addEach(Dict.prototype, GenericCollection.prototype);
Object.addEach(Dict.prototype, GenericMap.prototype);
Object.addEach(Dict.prototype, PropertyChanges.prototype);

Dict.prototype.constructClone = function (values) {
    return new this.constructor(values, this.mangle, this.getDefault);
};

Dict.prototype.assertString = function (key) {
    if (typeof key !== "string") {
        throw new TypeError("key must be a string but Got " + key);
    }
}

Dict.prototype.get = function (key, defaultValue) {
    this.assertString(key);
    var mangled = mangle(key);
    if (mangled in this.store) {
        return this.store[mangled];
    } else if (arguments.length > 1) {
        return defaultValue;
    } else {
        return this.getDefault(key);
    }
};

Dict.prototype.set = function (key, value) {
    this.assertString(key);
    var mangled = mangle(key);
    if (mangled in this.store) { // update
        if (this.dispatchesBeforeMapChanges) {
            this.dispatchBeforeMapChange(key, this.store[mangled]);
        }
        this.store[mangled] = value;
        if (this.dispatchesMapChanges) {
            this.dispatchMapChange(key, value);
        }
        return false;
    } else { // create
        if (this.dispatchesMapChanges) {
            this.dispatchBeforeMapChange(key, undefined);
        }
        this.length++;
        this.store[mangled] = value;
        if (this.dispatchesMapChanges) {
            this.dispatchMapChange(key, value);
        }
        return true;
    }
};

Dict.prototype.has = function (key) {
    this.assertString(key);
    var mangled = mangle(key);
    return mangled in this.store;
};

Dict.prototype["delete"] = function (key) {
    this.assertString(key);
    var mangled = mangle(key);
    if (mangled in this.store) {
        if (this.dispatchesMapChanges) {
            this.dispatchBeforeMapChange(key, this.store[mangled]);
        }
        delete this.store[mangle(key)];
        this.length--;
        if (this.dispatchesMapChanges) {
            this.dispatchMapChange(key, undefined);
        }
        return true;
    }
    return false;
};

Dict.prototype.clear = function () {
    var key, mangled;
    for (mangled in this.store) {
        key = unmangle(mangled);
        if (this.dispatchesMapChanges) {
            this.dispatchBeforeMapChange(key, this.store[mangled]);
        }
        delete this.store[mangled];
        if (this.dispatchesMapChanges) {
            this.dispatchMapChange(key, undefined);
        }
    }
    this.length = 0;
};

Dict.prototype.reduce = function (callback, basis, thisp) {
    for (var mangled in this.store) {
        basis = callback.call(thisp, basis, this.store[mangled], unmangle(mangled), this);
    }
    return basis;
};

Dict.prototype.reduceRight = function (callback, basis, thisp) {
    var self = this;
    var store = this.store;
    return Object.keys(this.store).reduceRight(function (basis, mangled) {
        return callback.call(thisp, basis, store[mangled], unmangle(mangled), self);
    }, basis);
};

Dict.prototype.one = function () {
    var key;
    for (key in this.store) {
        return this.store[key];
    }
};


},{"./generic-collection":25,"./generic-map":26,"./listen/property-changes":31,"./shim":38}],23:[function(require,module,exports){
"use strict";

var Shim = require("./shim");
var Set = require("./fast-set");
var GenericCollection = require("./generic-collection");
var GenericMap = require("./generic-map");
var PropertyChanges = require("./listen/property-changes");

module.exports = FastMap;

function FastMap(values, equals, hash, getDefault) {
    if (!(this instanceof FastMap)) {
        return new FastMap(values, equals, hash, getDefault);
    }
    equals = equals || Object.equals;
    hash = hash || Object.hash;
    getDefault = getDefault || Function.noop;
    this.contentEquals = equals;
    this.contentHash = hash;
    this.getDefault = getDefault;
    this.store = new Set(
        undefined,
        function keysEqual(a, b) {
            return equals(a.key, b.key);
        },
        function keyHash(item) {
            return hash(item.key);
        }
    );
    this.length = 0;
    this.addEach(values);
}

FastMap.FastMap = FastMap; // hack so require("fast-map").FastMap will work in MontageJS

Object.addEach(FastMap.prototype, GenericCollection.prototype);
Object.addEach(FastMap.prototype, GenericMap.prototype);
Object.addEach(FastMap.prototype, PropertyChanges.prototype);

FastMap.prototype.constructClone = function (values) {
    return new this.constructor(
        values,
        this.contentEquals,
        this.contentHash,
        this.getDefault
    );
};

FastMap.prototype.log = function (charmap, stringify) {
    stringify = stringify || this.stringify;
    this.store.log(charmap, stringify);
};

FastMap.prototype.stringify = function (item, leader) {
    return leader + JSON.stringify(item.key) + ": " + JSON.stringify(item.value);
}


},{"./fast-set":24,"./generic-collection":25,"./generic-map":26,"./listen/property-changes":31,"./shim":38}],24:[function(require,module,exports){
"use strict";

var Shim = require("./shim");
var Dict = require("./dict");
var List = require("./list");
var GenericCollection = require("./generic-collection");
var GenericSet = require("./generic-set");
var TreeLog = require("./tree-log");
var PropertyChanges = require("./listen/property-changes");

var object_has = Object.prototype.hasOwnProperty;

module.exports = FastSet;

function FastSet(values, equals, hash, getDefault) {
    if (!(this instanceof FastSet)) {
        return new FastSet(values, equals, hash, getDefault);
    }
    equals = equals || Object.equals;
    hash = hash || Object.hash;
    getDefault = getDefault || Function.noop;
    this.contentEquals = equals;
    this.contentHash = hash;
    this.getDefault = getDefault;
    this.buckets = new this.Buckets(null, this.Bucket);
    this.length = 0;
    this.addEach(values);
}

FastSet.FastSet = FastSet; // hack so require("fast-set").FastSet will work in MontageJS

Object.addEach(FastSet.prototype, GenericCollection.prototype);
Object.addEach(FastSet.prototype, GenericSet.prototype);
Object.addEach(FastSet.prototype, PropertyChanges.prototype);

FastSet.prototype.Buckets = Dict;
FastSet.prototype.Bucket = List;

FastSet.prototype.constructClone = function (values) {
    return new this.constructor(
        values,
        this.contentEquals,
        this.contentHash,
        this.getDefault
    );
};

FastSet.prototype.has = function (value) {
    var hash = this.contentHash(value);
    return this.buckets.get(hash).has(value);
};

FastSet.prototype.get = function (value) {
    var hash = this.contentHash(value);
    var buckets = this.buckets;
    if (buckets.has(hash)) {
        return buckets.get(hash).get(value);
    } else {
        return this.getDefault(value);
    }
};

FastSet.prototype['delete'] = function (value) {
    var hash = this.contentHash(value);
    var buckets = this.buckets;
    if (buckets.has(hash)) {
        var bucket = buckets.get(hash);
        if (bucket["delete"](value)) {
            this.length--;
            if (bucket.length === 0) {
                buckets["delete"](hash);
            }
            return true;
        }
    }
    return false;
};

FastSet.prototype.clear = function () {
    this.buckets.clear();
    this.length = 0;
};

FastSet.prototype.add = function (value) {
    var hash = this.contentHash(value);
    var buckets = this.buckets;
    if (!buckets.has(hash)) {
        buckets.set(hash, new this.Bucket(null, this.contentEquals));
    }
    if (!buckets.get(hash).has(value)) {
        buckets.get(hash).add(value);
        this.length++;
        return true;
    }
    return false;
};

FastSet.prototype.reduce = function (callback, basis /*, thisp*/) {
    var thisp = arguments[2];
    var buckets = this.buckets;
    var index = 0;
    return buckets.reduce(function (basis, bucket) {
        return bucket.reduce(function (basis, value) {
            return callback.call(thisp, basis, value, index++, this);
        }, basis, this);
    }, basis, this);
};

FastSet.prototype.one = function () {
    if (this.length > 0) {
        return this.buckets.one().one();
    }
};

FastSet.prototype.iterate = function () {
    return this.buckets.values().flatten().iterate();
};

FastSet.prototype.log = function (charmap, logNode, callback, thisp) {
    charmap = charmap || TreeLog.unicodeSharp;
    logNode = logNode || this.logNode;
    if (!callback) {
        callback = console.log;
        thisp = console;
    }
    callback = callback.bind(thisp);

    var buckets = this.buckets;
    var hashes = buckets.keys();
    hashes.forEach(function (hash, index) {
        var branch;
        var leader;
        if (index === hashes.length - 1) {
            branch = charmap.fromAbove;
            leader = ' ';
        } else if (index === 0) {
            branch = charmap.branchDown;
            leader = charmap.strafe;
        } else {
            branch = charmap.fromBoth;
            leader = charmap.strafe;
        }
        var bucket = buckets.get(hash);
        callback.call(thisp, branch + charmap.through + charmap.branchDown + ' ' + hash);
        bucket.forEach(function (value, node) {
            var branch, below;
            if (node === bucket.head.prev) {
                branch = charmap.fromAbove;
                below = ' ';
            } else {
                branch = charmap.fromBoth;
                below = charmap.strafe;
            }
            var written;
            logNode(
                node,
                function (line) {
                    if (!written) {
                        callback.call(thisp, leader + ' ' + branch + charmap.through + charmap.through + line);
                        written = true;
                    } else {
                        callback.call(thisp, leader + ' ' + below + '  ' + line);
                    }
                },
                function (line) {
                    callback.call(thisp, leader + ' ' + charmap.strafe + '  ' + line);
                }
            );
        });
    });
};

FastSet.prototype.logNode = function (node, write) {
    var value = node.value;
    if (Object(value) === value) {
        JSON.stringify(value, null, 4).split("\n").forEach(function (line) {
            write(" " + line);
        });
    } else {
        write(" " + value);
    }
};


},{"./dict":22,"./generic-collection":25,"./generic-set":28,"./list":29,"./listen/property-changes":31,"./shim":38,"./tree-log":39}],25:[function(require,module,exports){
"use strict";

module.exports = GenericCollection;
function GenericCollection() {
    throw new Error("Can't construct. GenericCollection is a mixin.");
}

GenericCollection.prototype.addEach = function (values) {
    if (values && Object(values) === values) {
        if (typeof values.forEach === "function") {
            values.forEach(this.add, this);
        } else if (typeof values.length === "number") {
            // Array-like objects that do not implement forEach, ergo,
            // Arguments
            for (var i = 0; i < values.length; i++) {
                this.add(values[i], i);
            }
        } else {
            Object.keys(values).forEach(function (key) {
                this.add(values[key], key);
            }, this);
        }
    }
    return this;
};

// This is sufficiently generic for Map (since the value may be a key)
// and ordered collections (since it forwards the equals argument)
GenericCollection.prototype.deleteEach = function (values, equals) {
    values.forEach(function (value) {
        this["delete"](value, equals);
    }, this);
    return this;
};

// all of the following functions are implemented in terms of "reduce".
// some need "constructClone".

GenericCollection.prototype.forEach = function (callback /*, thisp*/) {
    var thisp = arguments[1];
    return this.reduce(function (undefined, value, key, object, depth) {
        callback.call(thisp, value, key, object, depth);
    }, undefined);
};

GenericCollection.prototype.map = function (callback /*, thisp*/) {
    var thisp = arguments[1];
    var result = [];
    this.reduce(function (undefined, value, key, object, depth) {
        result.push(callback.call(thisp, value, key, object, depth));
    }, undefined);
    return result;
};

GenericCollection.prototype.enumerate = function (start) {
    if (start == null) {
        start = 0;
    }
    var result = [];
    this.reduce(function (undefined, value) {
        result.push([start++, value]);
    }, undefined);
    return result;
};

GenericCollection.prototype.group = function (callback, thisp, equals) {
    equals = equals || Object.equals;
    var groups = [];
    var keys = [];
    this.forEach(function (value, key, object) {
        var key = callback.call(thisp, value, key, object);
        var index = keys.indexOf(key, equals);
        var group;
        if (index === -1) {
            group = [];
            groups.push([key, group]);
            keys.push(key);
        } else {
            group = groups[index][1];
        }
        group.push(value);
    });
    return groups;
};

GenericCollection.prototype.toArray = function () {
    return this.map(Function.identity);
};

// this depends on stringable keys, which apply to Array and Iterator
// because they have numeric keys and all Maps since they may use
// strings as keys.  List, Set, and SortedSet have nodes for keys, so
// toObject would not be meaningful.
GenericCollection.prototype.toObject = function () {
    var object = {};
    this.reduce(function (undefined, value, key) {
        object[key] = value;
    }, undefined);
    return object;
};

GenericCollection.prototype.filter = function (callback /*, thisp*/) {
    var thisp = arguments[1];
    var result = this.constructClone();
    this.reduce(function (undefined, value, key, object, depth) {
        if (callback.call(thisp, value, key, object, depth)) {
            result.add(value);
        }
    }, undefined);
    return result;
};

GenericCollection.prototype.every = function (callback /*, thisp*/) {
    var thisp = arguments[1];
    return this.reduce(function (result, value, key, object, depth) {
        return result && callback.call(thisp, value, key, object, depth);
    }, true);
};

GenericCollection.prototype.some = function (callback /*, thisp*/) {
    var thisp = arguments[1];
    return this.reduce(function (result, value, key, object, depth) {
        return result || callback.call(thisp, value, key, object, depth);
    }, false);
};

GenericCollection.prototype.all = function () {
    return this.every(Boolean);
};

GenericCollection.prototype.any = function () {
    return this.some(Boolean);
};

GenericCollection.prototype.min = function (compare) {
    compare = compare || this.contentCompare || Object.compare;
    var first = true;
    return this.reduce(function (result, value) {
        if (first) {
            first = false;
            return value;
        } else {
            return compare(value, result) < 0 ? value : result;
        }
    }, undefined);
};

GenericCollection.prototype.max = function (compare) {
    compare = compare || this.contentCompare || Object.compare;
    var first = true;
    return this.reduce(function (result, value) {
        if (first) {
            first = false;
            return value;
        } else {
            return compare(value, result) > 0 ? value : result;
        }
    }, undefined);
};

GenericCollection.prototype.sum = function (zero) {
    zero = zero === undefined ? 0 : zero;
    return this.reduce(function (a, b) {
        return a + b;
    }, zero);
};

GenericCollection.prototype.average = function (zero) {
    var sum = zero === undefined ? 0 : zero;
    var count = zero === undefined ? 0 : zero;
    this.reduce(function (undefined, value) {
        sum += value;
        count += 1;
    }, undefined);
    return sum / count;
};

GenericCollection.prototype.concat = function () {
    var result = this.constructClone(this);
    for (var i = 0; i < arguments.length; i++) {
        result.addEach(arguments[i]);
    }
    return result;
};

GenericCollection.prototype.flatten = function () {
    var self = this;
    return this.reduce(function (result, array) {
        array.forEach(function (value) {
            this.push(value);
        }, result, self);
        return result;
    }, []);
};

GenericCollection.prototype.zip = function () {
    var table = Array.prototype.slice.call(arguments);
    table.unshift(this);
    return Array.unzip(table);
}

GenericCollection.prototype.join = function (delimiter) {
    return this.reduce(function (result, string) {
        return result + delimiter + string;
    });
};

GenericCollection.prototype.sorted = function (compare, by, order) {
    compare = compare || this.contentCompare || Object.compare;
    // account for comparators generated by Function.by
    if (compare.by) {
        by = compare.by;
        compare = compare.compare || this.contentCompare || Object.compare;
    } else {
        by = by || Function.identity;
    }
    if (order === undefined)
        order = 1;
    return this.map(function (item) {
        return {
            by: by(item),
            value: item
        };
    })
    .sort(function (a, b) {
        return compare(a.by, b.by) * order;
    })
    .map(function (pair) {
        return pair.value;
    });
};

GenericCollection.prototype.reversed = function () {
    return this.constructClone(this).reverse();
};

GenericCollection.prototype.clone = function (depth, memo) {
    if (depth === undefined) {
        depth = Infinity;
    } else if (depth === 0) {
        return this;
    }
    var clone = this.constructClone();
    this.forEach(function (value, key) {
        clone.add(Object.clone(value, depth - 1, memo), key);
    }, this);
    return clone;
};

GenericCollection.prototype.only = function () {
    if (this.length === 1) {
        return this.one();
    }
};

GenericCollection.prototype.iterator = function () {
    return this.iterate.apply(this, arguments);
};

require("./shim-array");


},{"./shim-array":34}],26:[function(require,module,exports){
"use strict";

var Object = require("./shim-object");
var MapChanges = require("./listen/map-changes");
var PropertyChanges = require("./listen/property-changes");

module.exports = GenericMap;
function GenericMap() {
    throw new Error("Can't construct. GenericMap is a mixin.");
}

Object.addEach(GenericMap.prototype, MapChanges.prototype);
Object.addEach(GenericMap.prototype, PropertyChanges.prototype);

// all of these methods depend on the constructor providing a `store` set

GenericMap.prototype.isMap = true;

GenericMap.prototype.addEach = function (values) {
    if (values && Object(values) === values) {
        if (typeof values.forEach === "function") {
            // copy map-alikes
            if (values.isMap === true) {
                values.forEach(function (value, key) {
                    this.set(key, value);
                }, this);
            // iterate key value pairs of other iterables
            } else {
                values.forEach(function (pair) {
                    this.set(pair[0], pair[1]);
                }, this);
            }
        } else {
            // copy other objects as map-alikes
            Object.keys(values).forEach(function (key) {
                this.set(key, values[key]);
            }, this);
        }
    }
    return this;
}

GenericMap.prototype.get = function (key, defaultValue) {
    var item = this.store.get(new this.Item(key));
    if (item) {
        return item.value;
    } else if (arguments.length > 1) {
        return defaultValue;
    } else {
        return this.getDefault(key);
    }
};

GenericMap.prototype.set = function (key, value) {
    var item = new this.Item(key, value);
    var found = this.store.get(item);
    var grew = false;
    if (found) { // update
        if (this.dispatchesMapChanges) {
            this.dispatchBeforeMapChange(key, found.value);
        }
        found.value = value;
        if (this.dispatchesMapChanges) {
            this.dispatchMapChange(key, value);
        }
    } else { // create
        if (this.dispatchesMapChanges) {
            this.dispatchBeforeMapChange(key, undefined);
        }
        if (this.store.add(item)) {
            this.length++;
            grew = true;
        }
        if (this.dispatchesMapChanges) {
            this.dispatchMapChange(key, value);
        }
    }
    return grew;
};

GenericMap.prototype.add = function (value, key) {
    return this.set(key, value);
};

GenericMap.prototype.has = function (key) {
    return this.store.has(new this.Item(key));
};

GenericMap.prototype['delete'] = function (key) {
    var item = new this.Item(key);
    if (this.store.has(item)) {
        var from = this.store.get(item).value;
        if (this.dispatchesMapChanges) {
            this.dispatchBeforeMapChange(key, from);
        }
        this.store["delete"](item);
        this.length--;
        if (this.dispatchesMapChanges) {
            this.dispatchMapChange(key, undefined);
        }
        return true;
    }
    return false;
};

GenericMap.prototype.clear = function () {
    var keys;
    if (this.dispatchesMapChanges) {
        this.forEach(function (value, key) {
            this.dispatchBeforeMapChange(key, value);
        }, this);
        keys = this.keys();
    }
    this.store.clear();
    this.length = 0;
    if (this.dispatchesMapChanges) {
        keys.forEach(function (key) {
            this.dispatchMapChange(key);
        }, this);
    }
};

GenericMap.prototype.reduce = function (callback, basis, thisp) {
    return this.store.reduce(function (basis, item) {
        return callback.call(thisp, basis, item.value, item.key, this);
    }, basis, this);
};

GenericMap.prototype.reduceRight = function (callback, basis, thisp) {
    return this.store.reduceRight(function (basis, item) {
        return callback.call(thisp, basis, item.value, item.key, this);
    }, basis, this);
};

GenericMap.prototype.keys = function () {
    return this.map(function (value, key) {
        return key;
    });
};

GenericMap.prototype.values = function () {
    return this.map(Function.identity);
};

GenericMap.prototype.entries = function () {
    return this.map(function (value, key) {
        return [key, value];
    });
};

// XXX deprecated
GenericMap.prototype.items = function () {
    return this.entries();
};

GenericMap.prototype.equals = function (that, equals) {
    equals = equals || Object.equals;
    if (this === that) {
        return true;
    } else if (Object.can(that, "every")) {
        return that.length === this.length && that.every(function (value, key) {
            return equals(this.get(key), value);
        }, this);
    } else {
        var keys = Object.keys(that);
        return keys.length === this.length && Object.keys(that).every(function (key) {
            return equals(this.get(key), that[key]);
        }, this);
    }
};

GenericMap.prototype.Item = Item;

function Item(key, value) {
    this.key = key;
    this.value = value;
}

Item.prototype.equals = function (that) {
    return Object.equals(this.key, that.key) && Object.equals(this.value, that.value);
};

Item.prototype.compare = function (that) {
    return Object.compare(this.key, that.key);
};


},{"./listen/map-changes":30,"./listen/property-changes":31,"./shim-object":36}],27:[function(require,module,exports){

var Object = require("./shim-object");

module.exports = GenericOrder;
function GenericOrder() {
    throw new Error("Can't construct. GenericOrder is a mixin.");
}

GenericOrder.prototype.equals = function (that, equals) {
    equals = equals || this.contentEquals || Object.equals;

    if (this === that) {
        return true;
    }
    if (!that) {
        return false;
    }

    var self = this;
    return (
        this.length === that.length &&
        this.zip(that).every(function (pair) {
            return equals(pair[0], pair[1]);
        })
    );
};

GenericOrder.prototype.compare = function (that, compare) {
    compare = compare || this.contentCompare || Object.compare;

    if (this === that) {
        return 0;
    }
    if (!that) {
        return 1;
    }

    var length = Math.min(this.length, that.length);
    var comparison = this.zip(that).reduce(function (comparison, pair, index) {
        if (comparison === 0) {
            if (index >= length) {
                return comparison;
            } else {
                return compare(pair[0], pair[1]);
            }
        } else {
            return comparison;
        }
    }, 0);
    if (comparison === 0) {
        return this.length - that.length;
    }
    return comparison;
};


},{"./shim-object":36}],28:[function(require,module,exports){

module.exports = GenericSet;
function GenericSet() {
    throw new Error("Can't construct. GenericSet is a mixin.");
}

GenericSet.prototype.union = function (that) {
    var union =  this.constructClone(this);
    union.addEach(that);
    return union;
};

GenericSet.prototype.intersection = function (that) {
    return this.constructClone(this.filter(function (value) {
        return that.has(value);
    }));
};

GenericSet.prototype.difference = function (that) {
    var union =  this.constructClone(this);
    union.deleteEach(that);
    return union;
};

GenericSet.prototype.symmetricDifference = function (that) {
    var union = this.union(that);
    var intersection = this.intersection(that);
    return union.difference(intersection);
};

GenericSet.prototype.equals = function (that, equals) {
    var self = this;
    return (
        Object.can(that, "reduce") &&
        this.length === that.length &&
        that.reduce(function (equal, value) {
            return equal && self.has(value, equals);
        }, true)
    );
};

// W3C DOMTokenList API overlap (does not handle variadic arguments)

GenericSet.prototype.contains = function (value) {
    return this.has(value);
};

GenericSet.prototype.remove = function (value) {
    return this["delete"](value);
};

GenericSet.prototype.toggle = function (value) {
    if (this.has(value)) {
        this["delete"](value);
    } else {
        this.add(value);
    }
};


},{}],29:[function(require,module,exports){
"use strict";

module.exports = List;

var Shim = require("./shim");
var GenericCollection = require("./generic-collection");
var GenericOrder = require("./generic-order");
var PropertyChanges = require("./listen/property-changes");
var RangeChanges = require("./listen/range-changes");

function List(values, equals, getDefault) {
    if (!(this instanceof List)) {
        return new List(values, equals, getDefault);
    }
    var head = this.head = new this.Node();
    head.next = head;
    head.prev = head;
    this.contentEquals = equals || Object.equals;
    this.getDefault = getDefault || Function.noop;
    this.length = 0;
    this.addEach(values);
}

List.List = List; // hack so require("list").List will work in MontageJS

Object.addEach(List.prototype, GenericCollection.prototype);
Object.addEach(List.prototype, GenericOrder.prototype);
Object.addEach(List.prototype, PropertyChanges.prototype);
Object.addEach(List.prototype, RangeChanges.prototype);

List.prototype.constructClone = function (values) {
    return new this.constructor(values, this.contentEquals, this.getDefault);
};

List.prototype.find = function (value, equals) {
    equals = equals || this.contentEquals;
    var head = this.head;
    var at = head.next;
    while (at !== head) {
        if (equals(at.value, value)) {
            return at;
        }
        at = at.next;
    }
};

List.prototype.findLast = function (value, equals) {
    equals = equals || this.contentEquals;
    var head = this.head;
    var at = head.prev;
    while (at !== head) {
        if (equals(at.value, value)) {
            return at;
        }
        at = at.prev;
    }
};

List.prototype.has = function (value, equals) {
    return !!this.find(value, equals);
};

List.prototype.get = function (value, equals) {
    var found = this.find(value, equals);
    if (found) {
        return found.value;
    }
    return this.getDefault(value);
};

// LIFO (delete removes the most recently added equivalent value)
List.prototype['delete'] = function (value, equals) {
    var found = this.findLast(value, equals);
    if (found) {
        if (this.dispatchesRangeChanges) {
            var plus = [];
            var minus = [value];
            this.dispatchBeforeRangeChange(plus, minus, found.index);
        }
        found['delete']();
        this.length--;
        if (this.dispatchesRangeChanges) {
            this.updateIndexes(found.next, found.index);
            this.dispatchRangeChange(plus, minus, found.index);
        }
        return true;
    }
    return false;
};

List.prototype.clear = function () {
    var plus, minus;
    if (this.dispatchesRangeChanges) {
        minus = this.toArray();
        plus = [];
        this.dispatchBeforeRangeChange(plus, minus, 0);
    }
    this.head.next = this.head.prev = this.head;
    this.length = 0;
    if (this.dispatchesRangeChanges) {
        this.dispatchRangeChange(plus, minus, 0);
    }
};

List.prototype.add = function (value) {
    var node = new this.Node(value)
    if (this.dispatchesRangeChanges) {
        node.index = this.length;
        this.dispatchBeforeRangeChange([value], [], node.index);
    }
    this.head.addBefore(node);
    this.length++;
    if (this.dispatchesRangeChanges) {
        this.dispatchRangeChange([value], [], node.index);
    }
    return true;
};

List.prototype.push = function () {
    var head = this.head;
    if (this.dispatchesRangeChanges) {
        var plus = Array.prototype.slice.call(arguments);
        var minus = []
        var index = this.length;
        this.dispatchBeforeRangeChange(plus, minus, index);
        var start = this.head.prev;
    }
    for (var i = 0; i < arguments.length; i++) {
        var value = arguments[i];
        var node = new this.Node(value);
        head.addBefore(node);
    }
    this.length += arguments.length;
    if (this.dispatchesRangeChanges) {
        this.updateIndexes(start.next, start.index === undefined ? 0 : start.index + 1);
        this.dispatchRangeChange(plus, minus, index);
    }
};

List.prototype.unshift = function () {
    if (this.dispatchesRangeChanges) {
        var plus = Array.prototype.slice.call(arguments);
        var minus = [];
        this.dispatchBeforeRangeChange(plus, minus, 0);
    }
    var at = this.head;
    for (var i = 0; i < arguments.length; i++) {
        var value = arguments[i];
        var node = new this.Node(value);
        at.addAfter(node);
        at = node;
    }
    this.length += arguments.length;
    if (this.dispatchesRangeChanges) {
        this.updateIndexes(this.head.next, 0);
        this.dispatchRangeChange(plus, minus, 0);
    }
};

List.prototype.pop = function () {
    var value;
    var head = this.head;
    if (head.prev !== head) {
        value = head.prev.value;
        if (this.dispatchesRangeChanges) {
            var plus = [];
            var minus = [value];
            var index = this.length - 1;
            this.dispatchBeforeRangeChange(plus, minus, index);
        }
        head.prev['delete']();
        this.length--;
        if (this.dispatchesRangeChanges) {
            this.dispatchRangeChange(plus, minus, index);
        }
    }
    return value;
};

List.prototype.shift = function () {
    var value;
    var head = this.head;
    if (head.prev !== head) {
        value = head.next.value;
        if (this.dispatchesRangeChanges) {
            var plus = [];
            var minus = [value];
            this.dispatchBeforeRangeChange(plus, minus, 0);
        }
        head.next['delete']();
        this.length--;
        if (this.dispatchesRangeChanges) {
            this.updateIndexes(this.head.next, 0);
            this.dispatchRangeChange(plus, minus, 0);
        }
    }
    return value;
};

List.prototype.peek = function () {
    if (this.head !== this.head.next) {
        return this.head.next.value;
    }
};

List.prototype.poke = function (value) {
    if (this.head !== this.head.next) {
        this.head.next.value = value;
    } else {
        this.push(value);
    }
};

List.prototype.one = function () {
    return this.peek();
};

// an internal utility for coercing index offsets to nodes
List.prototype.scan = function (at, fallback) {
    var head = this.head;
    if (typeof at === "number") {
        var count = at;
        if (count >= 0) {
            at = head.next;
            while (count) {
                count--;
                at = at.next;
                if (at == head) {
                    break;
                }
            }
        } else {
            at = head;
            while (count < 0) {
                count++;
                at = at.prev;
                if (at == head) {
                    break;
                }
            }
        }
        return at;
    } else {
        return at || fallback;
    }
};

// at and end may both be positive or negative numbers (in which cases they
// correspond to numeric indicies, or nodes)
List.prototype.slice = function (at, end) {
    var sliced = [];
    var head = this.head;
    at = this.scan(at, head.next);
    end = this.scan(end, head);

    while (at !== end && at !== head) {
        sliced.push(at.value);
        at = at.next;
    }

    return sliced;
};

List.prototype.splice = function (at, length /*...plus*/) {
    return this.swap(at, length, Array.prototype.slice.call(arguments, 2));
};

List.prototype.swap = function (start, length, plus) {
    var initial = start;
    // start will be head if start is null or -1 (meaning from the end), but
    // will be head.next if start is 0 (meaning from the beginning)
    start = this.scan(start, this.head);
    if (length == null) {
        length = Infinity;
    }
    plus = Array.from(plus);

    // collect the minus array
    var minus = [];
    var at = start;
    while (length-- && length >= 0 && at !== this.head) {
        minus.push(at.value);
        at = at.next;
    }

    // before range change
    var index, startNode;
    if (this.dispatchesRangeChanges) {
        if (start === this.head) {
            index = this.length;
        } else if (start.prev === this.head) {
            index = 0;
        } else {
            index = start.index;
        }
        startNode = start.prev;
        this.dispatchBeforeRangeChange(plus, minus, index);
    }

    // delete minus
    var at = start;
    for (var i = 0, at = start; i < minus.length; i++, at = at.next) {
        at["delete"]();
    }
    // add plus
    if (initial == null && at === this.head) {
        at = this.head.next;
    }
    for (var i = 0; i < plus.length; i++) {
        var node = new this.Node(plus[i]);
        at.addBefore(node);
    }
    // adjust length
    this.length += plus.length - minus.length;

    // after range change
    if (this.dispatchesRangeChanges) {
        if (start === this.head) {
            this.updateIndexes(this.head.next, 0);
        } else {
            this.updateIndexes(startNode.next, startNode.index + 1);
        }
        this.dispatchRangeChange(plus, minus, index);
    }

    return minus;
};

List.prototype.reverse = function () {
    if (this.dispatchesRangeChanges) {
        var minus = this.toArray();
        var plus = minus.reversed();
        this.dispatchBeforeRangeChange(plus, minus, 0);
    }
    var at = this.head;
    do {
        var temp = at.next;
        at.next = at.prev;
        at.prev = temp;
        at = at.next;
    } while (at !== this.head);
    if (this.dispatchesRangeChanges) {
        this.dispatchRangeChange(plus, minus, 0);
    }
    return this;
};

List.prototype.sort = function () {
    this.swap(0, this.length, this.sorted());
};

// TODO account for missing basis argument
List.prototype.reduce = function (callback, basis /*, thisp*/) {
    var thisp = arguments[2];
    var head = this.head;
    var at = head.next;
    while (at !== head) {
        basis = callback.call(thisp, basis, at.value, at, this);
        at = at.next;
    }
    return basis;
};

List.prototype.reduceRight = function (callback, basis /*, thisp*/) {
    var thisp = arguments[2];
    var head = this.head;
    var at = head.prev;
    while (at !== head) {
        basis = callback.call(thisp, basis, at.value, at, this);
        at = at.prev;
    }
    return basis;
};

List.prototype.updateIndexes = function (node, index) {
    while (node !== this.head) {
        node.index = index++;
        node = node.next;
    }
};

List.prototype.makeObservable = function () {
    this.head.index = -1;
    this.updateIndexes(this.head.next, 0);
    this.dispatchesRangeChanges = true;
};

List.prototype.iterate = function () {
    return new ListIterator(this.head);
};

function ListIterator(head) {
    this.head = head;
    this.at = head.next;
};

ListIterator.prototype.next = function () {
    if (this.at === this.head) {
        throw StopIteration;
    } else {
        var value = this.at.value;
        this.at = this.at.next;
        return value;
    }
};

List.prototype.Node = Node;

function Node(value) {
    this.value = value;
    this.prev = null;
    this.next = null;
};

Node.prototype['delete'] = function () {
    this.prev.next = this.next;
    this.next.prev = this.prev;
};

Node.prototype.addBefore = function (node) {
    var prev = this.prev;
    this.prev = node;
    node.prev = prev;
    prev.next = node;
    node.next = this;
};

Node.prototype.addAfter = function (node) {
    var next = this.next;
    this.next = node;
    node.next = next;
    next.prev = node;
    node.prev = this;
};


},{"./generic-collection":25,"./generic-order":27,"./listen/property-changes":31,"./listen/range-changes":32,"./shim":38}],30:[function(require,module,exports){
"use strict";

var WeakMap = require("weak-map");
var List = require("../list");

module.exports = MapChanges;
function MapChanges() {
    throw new Error("Can't construct. MapChanges is a mixin.");
}

var object_owns = Object.prototype.hasOwnProperty;

/*
    Object map change descriptors carry information necessary for adding,
    removing, dispatching, and shorting events to listeners for map changes
    for a particular key on a particular object.  These descriptors are used
    here for shallow map changes.

    {
        willChangeListeners:Array(Function)
        changeListeners:Array(Function)
    }
*/

var mapChangeDescriptors = new WeakMap();

MapChanges.prototype.getAllMapChangeDescriptors = function () {
    var Dict = require("../dict");
    if (!mapChangeDescriptors.has(this)) {
        mapChangeDescriptors.set(this, Dict());
    }
    return mapChangeDescriptors.get(this);
};

MapChanges.prototype.getMapChangeDescriptor = function (token) {
    var tokenChangeDescriptors = this.getAllMapChangeDescriptors();
    token = token || "";
    if (!tokenChangeDescriptors.has(token)) {
        tokenChangeDescriptors.set(token, {
            willChangeListeners: new List(),
            changeListeners: new List()
        });
    }
    return tokenChangeDescriptors.get(token);
};

MapChanges.prototype.addMapChangeListener = function (listener, token, beforeChange) {
    if (!this.isObservable && this.makeObservable) {
        // for Array
        this.makeObservable();
    }
    var descriptor = this.getMapChangeDescriptor(token);
    var listeners;
    if (beforeChange) {
        listeners = descriptor.willChangeListeners;
    } else {
        listeners = descriptor.changeListeners;
    }
    listeners.push(listener);
    Object.defineProperty(this, "dispatchesMapChanges", {
        value: true,
        writable: true,
        configurable: true,
        enumerable: false
    });

    var self = this;
    return function cancelMapChangeListener() {
        if (!self) {
            // TODO throw new Error("Can't remove map change listener again");
            return;
        }
        self.removeMapChangeListener(listener, token, beforeChange);
        self = null;
    };
};

MapChanges.prototype.removeMapChangeListener = function (listener, token, beforeChange) {
    var descriptor = this.getMapChangeDescriptor(token);

    var listeners;
    if (beforeChange) {
        listeners = descriptor.willChangeListeners;
    } else {
        listeners = descriptor.changeListeners;
    }

    var node = listeners.findLast(listener);
    if (!node) {
        throw new Error("Can't remove listener: does not exist.");
    }
    node["delete"]();
};

MapChanges.prototype.dispatchMapChange = function (key, value, beforeChange) {
    var descriptors = this.getAllMapChangeDescriptors();
    var changeName = "Map" + (beforeChange ? "WillChange" : "Change");
    descriptors.forEach(function (descriptor, token) {

        if (descriptor.isActive) {
            return;
        } else {
            descriptor.isActive = true;
        }

        var listeners;
        if (beforeChange) {
            listeners = descriptor.willChangeListeners;
        } else {
            listeners = descriptor.changeListeners;
        }

        var tokenName = "handle" + (
            token.slice(0, 1).toUpperCase() +
            token.slice(1)
        ) + changeName;

        try {
            // dispatch to each listener
            listeners.forEach(function (listener) {
                if (listener[tokenName]) {
                    listener[tokenName](value, key, this);
                } else if (listener.call) {
                    listener.call(listener, value, key, this);
                } else {
                    throw new Error("Handler " + listener + " has no method " + tokenName + " and is not callable");
                }
            }, this);
        } finally {
            descriptor.isActive = false;
        }

    }, this);
};

MapChanges.prototype.addBeforeMapChangeListener = function (listener, token) {
    return this.addMapChangeListener(listener, token, true);
};

MapChanges.prototype.removeBeforeMapChangeListener = function (listener, token) {
    return this.removeMapChangeListener(listener, token, true);
};

MapChanges.prototype.dispatchBeforeMapChange = function (key, value) {
    return this.dispatchMapChange(key, value, true);
};


},{"../dict":22,"../list":29,"weak-map":33}],31:[function(require,module,exports){
/*
    Based in part on observable arrays from Motorola Mobility’s Montage
    Copyright (c) 2012, Motorola Mobility LLC. All Rights Reserved.
    3-Clause BSD License
    https://github.com/motorola-mobility/montage/blob/master/LICENSE.md
*/

/*
    This module is responsible for observing changes to owned properties of
    objects and changes to the content of arrays caused by method calls.
    The interface for observing array content changes establishes the methods
    necessary for any collection with observable content.
*/

require("../shim");
var WeakMap = require("weak-map");

var object_owns = Object.prototype.hasOwnProperty;

/*
    Object property descriptors carry information necessary for adding,
    removing, dispatching, and shorting events to listeners for property changes
    for a particular key on a particular object.  These descriptors are used
    here for shallow property changes.

    {
        willChangeListeners:Array(Function)
        changeListeners:Array(Function)
    }
*/
var propertyChangeDescriptors = new WeakMap();

// Maybe remove entries from this table if the corresponding object no longer
// has any property change listeners for any key.  However, the cost of
// book-keeping is probably not warranted since it would be rare for an
// observed object to no longer be observed unless it was about to be disposed
// of or reused as an observable.  The only benefit would be in avoiding bulk
// calls to dispatchOwnPropertyChange events on objects that have no listeners.

/*
    To observe shallow property changes for a particular key of a particular
    object, we install a property descriptor on the object that overrides the previous
    descriptor.  The overridden descriptors are stored in this weak map.  The
    weak map associates an object with another object that maps property names
    to property descriptors.

    overriddenObjectDescriptors.get(object)[key]

    We retain the old descriptor for various purposes.  For one, if the property
    is no longer being observed by anyone, we revert the property descriptor to
    the original.  For "value" descriptors, we store the actual value of the
    descriptor on the overridden descriptor, so when the property is reverted, it
    retains the most recently set value.  For "get" and "set" descriptors,
    we observe then forward "get" and "set" operations to the original descriptor.
*/
var overriddenObjectDescriptors = new WeakMap();

module.exports = PropertyChanges;

function PropertyChanges() {
    throw new Error("This is an abstract interface. Mix it. Don't construct it");
}

PropertyChanges.debug = true;

PropertyChanges.prototype.getOwnPropertyChangeDescriptor = function (key) {
    if (!propertyChangeDescriptors.has(this)) {
        propertyChangeDescriptors.set(this, {});
    }
    var objectPropertyChangeDescriptors = propertyChangeDescriptors.get(this);
    if (!object_owns.call(objectPropertyChangeDescriptors, key)) {
        objectPropertyChangeDescriptors[key] = {
            willChangeListeners: [],
            changeListeners: []
        };
    }
    return objectPropertyChangeDescriptors[key];
};

PropertyChanges.prototype.hasOwnPropertyChangeDescriptor = function (key) {
    if (!propertyChangeDescriptors.has(this)) {
        return false;
    }
    if (!key) {
        return true;
    }
    var objectPropertyChangeDescriptors = propertyChangeDescriptors.get(this);
    if (!object_owns.call(objectPropertyChangeDescriptors, key)) {
        return false;
    }
    return true;
};

PropertyChanges.prototype.addOwnPropertyChangeListener = function (key, listener, beforeChange) {
    if (this.makeObservable && !this.isObservable) {
        this.makeObservable(); // particularly for observable arrays, for
        // their length property
    }
    var descriptor = PropertyChanges.getOwnPropertyChangeDescriptor(this, key);
    var listeners;
    if (beforeChange) {
        listeners = descriptor.willChangeListeners;
    } else {
        listeners = descriptor.changeListeners;
    }
    PropertyChanges.makePropertyObservable(this, key);
    listeners.push(listener);

    var self = this;
    return function cancelOwnPropertyChangeListener() {
        PropertyChanges.removeOwnPropertyChangeListener(self, key, listeners, beforeChange);
        self = null;
    };
};

PropertyChanges.prototype.addBeforeOwnPropertyChangeListener = function (key, listener) {
    return PropertyChanges.addOwnPropertyChangeListener(this, key, listener, true);
};

PropertyChanges.prototype.removeOwnPropertyChangeListener = function (key, listener, beforeChange) {
    var descriptor = PropertyChanges.getOwnPropertyChangeDescriptor(this, key);

    var listeners;
    if (beforeChange) {
        listeners = descriptor.willChangeListeners;
    } else {
        listeners = descriptor.changeListeners;
    }

    var index = listeners.lastIndexOf(listener);
    if (index === -1) {
        throw new Error("Can't remove listener: does not exist.");
    }
    listeners.splice(index, 1);

    if (descriptor.changeListeners.length + descriptor.willChangeListeners.length === 0) {
        PropertyChanges.makePropertyUnobservable(this, key);
    }
};

PropertyChanges.prototype.removeBeforeOwnPropertyChangeListener = function (key, listener) {
    return PropertyChanges.removeOwnPropertyChangeListener(this, key, listener, true);
};

PropertyChanges.prototype.dispatchOwnPropertyChange = function (key, value, beforeChange) {
    var descriptor = PropertyChanges.getOwnPropertyChangeDescriptor(this, key);

    if (descriptor.isActive) {
        return;
    }
    descriptor.isActive = true;

    var listeners;
    if (beforeChange) {
        listeners = descriptor.willChangeListeners;
    } else {
        listeners = descriptor.changeListeners;
    }

    var changeName = (beforeChange ? "Will" : "") + "Change";
    var genericHandlerName = "handleProperty" + changeName;
    var propertyName = String(key);
    propertyName = propertyName && propertyName[0].toUpperCase() + propertyName.slice(1);
    var specificHandlerName = "handle" + propertyName + changeName;

    try {
        // dispatch to each listener
        listeners.forEach(function (listener) {
            var thisp = listener;
            listener = (
                listener[specificHandlerName] ||
                listener[genericHandlerName] ||
                listener
            );
            if (!listener.call) {
                throw new Error("No event listener for " + specificHandlerName + " or " + genericHandlerName + " or call on " + listener);
            }
            listener.call(thisp, value, key, this);
        }, this);
    } finally {
        descriptor.isActive = false;
    }
};

PropertyChanges.prototype.dispatchBeforeOwnPropertyChange = function (key, listener) {
    return PropertyChanges.dispatchOwnPropertyChange(this, key, listener, true);
};

PropertyChanges.prototype.makePropertyObservable = function (key) {
    // arrays are special.  we do not support direct setting of properties
    // on an array.  instead, call .set(index, value).  this is observable.
    // 'length' property is observable for all mutating methods because
    // our overrides explicitly dispatch that change.
    if (Array.isArray(this)) {
        return;
    }

    if (!Object.isExtensible(this, key)) {
        throw new Error("Can't make property " + JSON.stringify(key) + " observable on " + this + " because object is not extensible");
    }

    var state;
    if (typeof this.__state__ === "object") {
        state = this.__state__;
    } else {
        state = {};
        if (Object.isExtensible(this, "__state__")) {
            Object.defineProperty(this, "__state__", {
                value: state,
                writable: true,
                enumerable: false
            });
        }
    }
    state[key] = this[key];

    // memoize overridden property descriptor table
    if (!overriddenObjectDescriptors.has(this)) {
        overriddenPropertyDescriptors = {};
        overriddenObjectDescriptors.set(this, overriddenPropertyDescriptors);
    }
    var overriddenPropertyDescriptors = overriddenObjectDescriptors.get(this);

    if (object_owns.call(overriddenPropertyDescriptors, key)) {
        // if we have already recorded an overridden property descriptor,
        // we have already installed the observer, so short-here
        return;
    }

    // walk up the prototype chain to find a property descriptor for
    // the property name
    var overriddenDescriptor;
    var attached = this;
    var formerDescriptor = Object.getOwnPropertyDescriptor(attached, key);
    do {
        overriddenDescriptor = Object.getOwnPropertyDescriptor(attached, key);
        if (overriddenDescriptor) {
            break;
        }
        attached = Object.getPrototypeOf(attached);
    } while (attached);
    // or default to an undefined value
    overriddenDescriptor = overriddenDescriptor || {
        value: undefined,
        enumerable: true,
        writable: true,
        configurable: true
    };

    if (!overriddenDescriptor.configurable) {
        throw new Error("Can't observe non-configurable properties");
    }

    // memoize the descriptor so we know not to install another layer,
    // and so we can reuse the overridden descriptor when uninstalling
    overriddenPropertyDescriptors[key] = overriddenDescriptor;

    // give up *after* storing the overridden property descriptor so it
    // can be restored by uninstall.  Unwritable properties are
    // silently not overriden.  Since success is indistinguishable from
    // failure, we let it pass but don't waste time on intercepting
    // get/set.
    if (!overriddenDescriptor.writable && !overriddenDescriptor.set) {
        return;
    }

    // TODO reflect current value on a displayed property

    var propertyListener;
    // in both of these new descriptor variants, we reuse the overridden
    // descriptor to either store the current value or apply getters
    // and setters.  this is handy since we can reuse the overridden
    // descriptor if we uninstall the observer.  We even preserve the
    // assignment semantics, where we get the value from up the
    // prototype chain, and set as an owned property.
    if ('value' in overriddenDescriptor) {
        propertyListener = {
            get: function () {
                return overriddenDescriptor.value
            },
            set: function (value) {
                if (value === overriddenDescriptor.value) {
                    return value;
                }
                PropertyChanges.dispatchBeforeOwnPropertyChange(this, key, overriddenDescriptor.value);
                overriddenDescriptor.value = value;
                state[key] = value;
                PropertyChanges.dispatchOwnPropertyChange(this, key, value);
                return value;
            },
            enumerable: overriddenDescriptor.enumerable,
            configurable: true
        };
    } else { // 'get' or 'set', but not necessarily both
        propertyListener = {
            get: function () {
                if (overriddenDescriptor.get) {
                    return overriddenDescriptor.get.apply(this, arguments);
                }
            },
            set: function (value) {
                var formerValue;

                // get the actual former value if possible
                if (overriddenDescriptor.get) {
                    formerValue = overriddenDescriptor.get.apply(this, arguments);
                }
                // call through to actual setter
                if (overriddenDescriptor.set) {
                    overriddenDescriptor.set.apply(this, arguments)
                }
                // use getter, if possible, to discover whether the set
                // was successful
                if (overriddenDescriptor.get) {
                    value = overriddenDescriptor.get.apply(this, arguments);
                    state[key] = value;
                }
                // if it has not changed, suppress a notification
                if (value === formerValue) {
                    return value;
                }
                PropertyChanges.dispatchBeforeOwnPropertyChange(this, key, formerValue);

                // dispatch the new value: the given value if there is
                // no getter, or the actual value if there is one
                PropertyChanges.dispatchOwnPropertyChange(this, key, value);
                return value;
            },
            enumerable: overriddenDescriptor.enumerable,
            configurable: true
        };
    }

    Object.defineProperty(this, key, propertyListener);
};

PropertyChanges.prototype.makePropertyUnobservable = function (key) {
    // arrays are special.  we do not support direct setting of properties
    // on an array.  instead, call .set(index, value).  this is observable.
    // 'length' property is observable for all mutating methods because
    // our overrides explicitly dispatch that change.
    if (Array.isArray(this)) {
        return;
    }

    if (!overriddenObjectDescriptors.has(this)) {
        throw new Error("Can't uninstall observer on property");
    }
    var overriddenPropertyDescriptors = overriddenObjectDescriptors.get(this);

    if (!overriddenPropertyDescriptors[key]) {
        throw new Error("Can't uninstall observer on property");
    }

    var overriddenDescriptor = overriddenPropertyDescriptors[key];
    delete overriddenPropertyDescriptors[key];

    var state;
    if (typeof this.__state__ === "object") {
        state = this.__state__;
    } else {
        state = {};
        if (Object.isExtensible(this, "__state__")) {
            Object.defineProperty(this, "__state__", {
                value: state,
                writable: true,
                enumerable: false
            });
        }
    }
    delete state[key];

    Object.defineProperty(this, key, overriddenDescriptor);
};

// constructor functions

PropertyChanges.getOwnPropertyChangeDescriptor = function (object, key) {
    if (object.getOwnPropertyChangeDescriptor) {
        return object.getOwnPropertyChangeDescriptor(key);
    } else {
        return PropertyChanges.prototype.getOwnPropertyChangeDescriptor.call(object, key);
    }
};

PropertyChanges.hasOwnPropertyChangeDescriptor = function (object, key) {
    if (object.hasOwnPropertyChangeDescriptor) {
        return object.hasOwnPropertyChangeDescriptor(key);
    } else {
        return PropertyChanges.prototype.hasOwnPropertyChangeDescriptor.call(object, key);
    }
};

PropertyChanges.addOwnPropertyChangeListener = function (object, key, listener, beforeChange) {
    if (!Object.isObject(object)) {
    } else if (object.addOwnPropertyChangeListener) {
        return object.addOwnPropertyChangeListener(key, listener, beforeChange);
    } else {
        return PropertyChanges.prototype.addOwnPropertyChangeListener.call(object, key, listener, beforeChange);
    }
};

PropertyChanges.removeOwnPropertyChangeListener = function (object, key, listener, beforeChange) {
    if (!Object.isObject(object)) {
    } else if (object.removeOwnPropertyChangeListener) {
        return object.removeOwnPropertyChangeListener(key, listener, beforeChange);
    } else {
        return PropertyChanges.prototype.removeOwnPropertyChangeListener.call(object, key, listener, beforeChange);
    }
};

PropertyChanges.dispatchOwnPropertyChange = function (object, key, value, beforeChange) {
    if (!Object.isObject(object)) {
    } else if (object.dispatchOwnPropertyChange) {
        return object.dispatchOwnPropertyChange(key, value, beforeChange);
    } else {
        return PropertyChanges.prototype.dispatchOwnPropertyChange.call(object, key, value, beforeChange);
    }
};

PropertyChanges.addBeforeOwnPropertyChangeListener = function (object, key, listener) {
    return PropertyChanges.addOwnPropertyChangeListener(object, key, listener, true);
};

PropertyChanges.removeBeforeOwnPropertyChangeListener = function (object, key, listener) {
    return PropertyChanges.removeOwnPropertyChangeListener(object, key, listener, true);
};

PropertyChanges.dispatchBeforeOwnPropertyChange = function (object, key, value) {
    return PropertyChanges.dispatchOwnPropertyChange(object, key, value, true);
};

PropertyChanges.makePropertyObservable = function (object, key) {
    if (object.makePropertyObservable) {
        return object.makePropertyObservable(key);
    } else {
        return PropertyChanges.prototype.makePropertyObservable.call(object, key);
    }
};

PropertyChanges.makePropertyUnobservable = function (object, key) {
    if (object.makePropertyUnobservable) {
        return object.makePropertyUnobservable(key);
    } else {
        return PropertyChanges.prototype.makePropertyUnobservable.call(object, key);
    }
};


},{"../shim":38,"weak-map":33}],32:[function(require,module,exports){
"use strict";

var WeakMap = require("weak-map");
var Dict = require("../dict");

var rangeChangeDescriptors = new WeakMap(); // {isActive, willChangeListeners, changeListeners}

module.exports = RangeChanges;
function RangeChanges() {
    throw new Error("Can't construct. RangeChanges is a mixin.");
}

RangeChanges.prototype.getAllRangeChangeDescriptors = function () {
    if (!rangeChangeDescriptors.has(this)) {
        rangeChangeDescriptors.set(this, Dict());
    }
    return rangeChangeDescriptors.get(this);
};

RangeChanges.prototype.getRangeChangeDescriptor = function (token) {
    var tokenChangeDescriptors = this.getAllRangeChangeDescriptors();
    token = token || "";
    if (!tokenChangeDescriptors.has(token)) {
        tokenChangeDescriptors.set(token, {
            isActive: false,
            changeListeners: [],
            willChangeListeners: []
        });
    }
    return tokenChangeDescriptors.get(token);
};

RangeChanges.prototype.addRangeChangeListener = function (listener, token, beforeChange) {
    // a concession for objects like Array that are not inherently observable
    if (!this.isObservable && this.makeObservable) {
        this.makeObservable();
    }

    var descriptor = this.getRangeChangeDescriptor(token);

    var listeners;
    if (beforeChange) {
        listeners = descriptor.willChangeListeners;
    } else {
        listeners = descriptor.changeListeners;
    }

    // even if already registered
    listeners.push(listener);
    Object.defineProperty(this, "dispatchesRangeChanges", {
        value: true,
        writable: true,
        configurable: true,
        enumerable: false
    });

    var self = this;
    return function cancelRangeChangeListener() {
        if (!self) {
            // TODO throw new Error("Range change listener " + JSON.stringify(token) + " has already been canceled");
            return;
        }
        self.removeRangeChangeListener(listener, token, beforeChange);
        self = null;
    };
};

RangeChanges.prototype.removeRangeChangeListener = function (listener, token, beforeChange) {
    var descriptor = this.getRangeChangeDescriptor(token);

    var listeners;
    if (beforeChange) {
        listeners = descriptor.willChangeListeners;
    } else {
        listeners = descriptor.changeListeners;
    }

    var index = listeners.lastIndexOf(listener);
    if (index === -1) {
        throw new Error("Can't remove listener: does not exist.");
    }
    listeners.splice(index, 1);
};

RangeChanges.prototype.dispatchRangeChange = function (plus, minus, index, beforeChange) {
    var descriptors = this.getAllRangeChangeDescriptors();
    var changeName = "Range" + (beforeChange ? "WillChange" : "Change");
    descriptors.forEach(function (descriptor, token) {

        if (descriptor.isActive) {
            return;
        } else {
            descriptor.isActive = true;
        }

        // before or after
        var listeners;
        if (beforeChange) {
            listeners = descriptor.willChangeListeners;
        } else {
            listeners = descriptor.changeListeners;
        }

        var tokenName = "handle" + (
            token.slice(0, 1).toUpperCase() +
            token.slice(1)
        ) + changeName;
        // notably, defaults to "handleRangeChange" or "handleRangeWillChange"
        // if token is "" (the default)

        // dispatch each listener
        try {
            listeners.forEach(function (listener) {
                if (listener[tokenName]) {
                    listener[tokenName](plus, minus, index, this, beforeChange);
                } else if (listener.call) {
                    listener.call(this, plus, minus, index, this, beforeChange);
                } else {
                    throw new Error("Handler " + listener + " has no method " + tokenName + " and is not callable");
                }
            }, this);
        } finally {
            descriptor.isActive = false;
        }
    }, this);
};

RangeChanges.prototype.addBeforeRangeChangeListener = function (listener, token) {
    return this.addRangeChangeListener(listener, token, true);
};

RangeChanges.prototype.removeBeforeRangeChangeListener = function (listener, token) {
    return this.removeRangeChangeListener(listener, token, true);
};

RangeChanges.prototype.dispatchBeforeRangeChange = function (plus, minus, index) {
    return this.dispatchRangeChange(plus, minus, index, true);
};


},{"../dict":22,"weak-map":33}],33:[function(require,module,exports){
// Copyright (C) 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Install a leaky WeakMap emulation on platforms that
 * don't provide a built-in one.
 *
 * <p>Assumes that an ES5 platform where, if {@code WeakMap} is
 * already present, then it conforms to the anticipated ES6
 * specification. To run this file on an ES5 or almost ES5
 * implementation where the {@code WeakMap} specification does not
 * quite conform, run <code>repairES5.js</code> first.
 *
 * <p> Even though WeakMapModule is not global, the linter thinks it
 * is, which is why it is in the overrides list below.
 *
 * @author Mark S. Miller
 * @requires crypto, ArrayBuffer, Uint8Array, navigator
 * @overrides WeakMap, ses, Proxy
 * @overrides WeakMapModule
 */

/**
 * This {@code WeakMap} emulation is observably equivalent to the
 * ES-Harmony WeakMap, but with leakier garbage collection properties.
 *
 * <p>As with true WeakMaps, in this emulation, a key does not
 * retain maps indexed by that key and (crucially) a map does not
 * retain the keys it indexes. A map by itself also does not retain
 * the values associated with that map.
 *
 * <p>However, the values associated with a key in some map are
 * retained so long as that key is retained and those associations are
 * not overridden. For example, when used to support membranes, all
 * values exported from a given membrane will live for the lifetime
 * they would have had in the absence of an interposed membrane. Even
 * when the membrane is revoked, all objects that would have been
 * reachable in the absence of revocation will still be reachable, as
 * far as the GC can tell, even though they will no longer be relevant
 * to ongoing computation.
 *
 * <p>The API implemented here is approximately the API as implemented
 * in FF6.0a1 and agreed to by MarkM, Andreas Gal, and Dave Herman,
 * rather than the offially approved proposal page. TODO(erights):
 * upgrade the ecmascript WeakMap proposal page to explain this API
 * change and present to EcmaScript committee for their approval.
 *
 * <p>The first difference between the emulation here and that in
 * FF6.0a1 is the presence of non enumerable {@code get___, has___,
 * set___, and delete___} methods on WeakMap instances to represent
 * what would be the hidden internal properties of a primitive
 * implementation. Whereas the FF6.0a1 WeakMap.prototype methods
 * require their {@code this} to be a genuine WeakMap instance (i.e.,
 * an object of {@code [[Class]]} "WeakMap}), since there is nothing
 * unforgeable about the pseudo-internal method names used here,
 * nothing prevents these emulated prototype methods from being
 * applied to non-WeakMaps with pseudo-internal methods of the same
 * names.
 *
 * <p>Another difference is that our emulated {@code
 * WeakMap.prototype} is not itself a WeakMap. A problem with the
 * current FF6.0a1 API is that WeakMap.prototype is itself a WeakMap
 * providing ambient mutability and an ambient communications
 * channel. Thus, if a WeakMap is already present and has this
 * problem, repairES5.js wraps it in a safe wrappper in order to
 * prevent access to this channel. (See
 * PATCH_MUTABLE_FROZEN_WEAKMAP_PROTO in repairES5.js).
 */

/**
 * If this is a full <a href=
 * "http://code.google.com/p/es-lab/wiki/SecureableES5"
 * >secureable ES5</a> platform and the ES-Harmony {@code WeakMap} is
 * absent, install an approximate emulation.
 *
 * <p>If WeakMap is present but cannot store some objects, use our approximate
 * emulation as a wrapper.
 *
 * <p>If this is almost a secureable ES5 platform, then WeakMap.js
 * should be run after repairES5.js.
 *
 * <p>See {@code WeakMap} for documentation of the garbage collection
 * properties of this WeakMap emulation.
 */
(function WeakMapModule() {
  "use strict";

  if (typeof ses !== 'undefined' && ses.ok && !ses.ok()) {
    // already too broken, so give up
    return;
  }

  /**
   * In some cases (current Firefox), we must make a choice betweeen a
   * WeakMap which is capable of using all varieties of host objects as
   * keys and one which is capable of safely using proxies as keys. See
   * comments below about HostWeakMap and DoubleWeakMap for details.
   *
   * This function (which is a global, not exposed to guests) marks a
   * WeakMap as permitted to do what is necessary to index all host
   * objects, at the cost of making it unsafe for proxies.
   *
   * Do not apply this function to anything which is not a genuine
   * fresh WeakMap.
   */
  function weakMapPermitHostObjects(map) {
    // identity of function used as a secret -- good enough and cheap
    if (map.permitHostObjects___) {
      map.permitHostObjects___(weakMapPermitHostObjects);
    }
  }
  if (typeof ses !== 'undefined') {
    ses.weakMapPermitHostObjects = weakMapPermitHostObjects;
  }

  // Check if there is already a good-enough WeakMap implementation, and if so
  // exit without replacing it.
  if (typeof WeakMap === 'function') {
    var HostWeakMap = WeakMap;
    // There is a WeakMap -- is it good enough?
    if (typeof navigator !== 'undefined' &&
        /Firefox/.test(navigator.userAgent)) {
      // We're now *assuming not*, because as of this writing (2013-05-06)
      // Firefox's WeakMaps have a miscellany of objects they won't accept, and
      // we don't want to make an exhaustive list, and testing for just one
      // will be a problem if that one is fixed alone (as they did for Event).

      // If there is a platform that we *can* reliably test on, here's how to
      // do it:
      //  var problematic = ... ;
      //  var testHostMap = new HostWeakMap();
      //  try {
      //    testHostMap.set(problematic, 1);  // Firefox 20 will throw here
      //    if (testHostMap.get(problematic) === 1) {
      //      return;
      //    }
      //  } catch (e) {}

      // Fall through to installing our WeakMap.
    } else {
      module.exports = WeakMap;
      return;
    }
  }

  var hop = Object.prototype.hasOwnProperty;
  var gopn = Object.getOwnPropertyNames;
  var defProp = Object.defineProperty;
  var isExtensible = Object.isExtensible;

  /**
   * Security depends on HIDDEN_NAME being both <i>unguessable</i> and
   * <i>undiscoverable</i> by untrusted code.
   *
   * <p>Given the known weaknesses of Math.random() on existing
   * browsers, it does not generate unguessability we can be confident
   * of.
   *
   * <p>It is the monkey patching logic in this file that is intended
   * to ensure undiscoverability. The basic idea is that there are
   * three fundamental means of discovering properties of an object:
   * The for/in loop, Object.keys(), and Object.getOwnPropertyNames(),
   * as well as some proposed ES6 extensions that appear on our
   * whitelist. The first two only discover enumerable properties, and
   * we only use HIDDEN_NAME to name a non-enumerable property, so the
   * only remaining threat should be getOwnPropertyNames and some
   * proposed ES6 extensions that appear on our whitelist. We monkey
   * patch them to remove HIDDEN_NAME from the list of properties they
   * returns.
   *
   * <p>TODO(erights): On a platform with built-in Proxies, proxies
   * could be used to trap and thereby discover the HIDDEN_NAME, so we
   * need to monkey patch Proxy.create, Proxy.createFunction, etc, in
   * order to wrap the provided handler with the real handler which
   * filters out all traps using HIDDEN_NAME.
   *
   * <p>TODO(erights): Revisit Mike Stay's suggestion that we use an
   * encapsulated function at a not-necessarily-secret name, which
   * uses the Stiegler shared-state rights amplification pattern to
   * reveal the associated value only to the WeakMap in which this key
   * is associated with that value. Since only the key retains the
   * function, the function can also remember the key without causing
   * leakage of the key, so this doesn't violate our general gc
   * goals. In addition, because the name need not be a guarded
   * secret, we could efficiently handle cross-frame frozen keys.
   */
  var HIDDEN_NAME_PREFIX = 'weakmap:';
  var HIDDEN_NAME = HIDDEN_NAME_PREFIX + 'ident:' + Math.random() + '___';

  if (typeof crypto !== 'undefined' &&
      typeof crypto.getRandomValues === 'function' &&
      typeof ArrayBuffer === 'function' &&
      typeof Uint8Array === 'function') {
    var ab = new ArrayBuffer(25);
    var u8s = new Uint8Array(ab);
    crypto.getRandomValues(u8s);
    HIDDEN_NAME = HIDDEN_NAME_PREFIX + 'rand:' +
      Array.prototype.map.call(u8s, function(u8) {
        return (u8 % 36).toString(36);
      }).join('') + '___';
  }

  function isNotHiddenName(name) {
    return !(
        name.substr(0, HIDDEN_NAME_PREFIX.length) == HIDDEN_NAME_PREFIX &&
        name.substr(name.length - 3) === '___');
  }

  /**
   * Monkey patch getOwnPropertyNames to avoid revealing the
   * HIDDEN_NAME.
   *
   * <p>The ES5.1 spec requires each name to appear only once, but as
   * of this writing, this requirement is controversial for ES6, so we
   * made this code robust against this case. If the resulting extra
   * search turns out to be expensive, we can probably relax this once
   * ES6 is adequately supported on all major browsers, iff no browser
   * versions we support at that time have relaxed this constraint
   * without providing built-in ES6 WeakMaps.
   */
  defProp(Object, 'getOwnPropertyNames', {
    value: function fakeGetOwnPropertyNames(obj) {
      return gopn(obj).filter(isNotHiddenName);
    }
  });

  /**
   * getPropertyNames is not in ES5 but it is proposed for ES6 and
   * does appear in our whitelist, so we need to clean it too.
   */
  if ('getPropertyNames' in Object) {
    var originalGetPropertyNames = Object.getPropertyNames;
    defProp(Object, 'getPropertyNames', {
      value: function fakeGetPropertyNames(obj) {
        return originalGetPropertyNames(obj).filter(isNotHiddenName);
      }
    });
  }

  /**
   * <p>To treat objects as identity-keys with reasonable efficiency
   * on ES5 by itself (i.e., without any object-keyed collections), we
   * need to add a hidden property to such key objects when we
   * can. This raises several issues:
   * <ul>
   * <li>Arranging to add this property to objects before we lose the
   *     chance, and
   * <li>Hiding the existence of this new property from most
   *     JavaScript code.
   * <li>Preventing <i>certification theft</i>, where one object is
   *     created falsely claiming to be the key of an association
   *     actually keyed by another object.
   * <li>Preventing <i>value theft</i>, where untrusted code with
   *     access to a key object but not a weak map nevertheless
   *     obtains access to the value associated with that key in that
   *     weak map.
   * </ul>
   * We do so by
   * <ul>
   * <li>Making the name of the hidden property unguessable, so "[]"
   *     indexing, which we cannot intercept, cannot be used to access
   *     a property without knowing the name.
   * <li>Making the hidden property non-enumerable, so we need not
   *     worry about for-in loops or {@code Object.keys},
   * <li>monkey patching those reflective methods that would
   *     prevent extensions, to add this hidden property first,
   * <li>monkey patching those methods that would reveal this
   *     hidden property.
   * </ul>
   * Unfortunately, because of same-origin iframes, we cannot reliably
   * add this hidden property before an object becomes
   * non-extensible. Instead, if we encounter a non-extensible object
   * without a hidden record that we can detect (whether or not it has
   * a hidden record stored under a name secret to us), then we just
   * use the key object itself to represent its identity in a brute
   * force leaky map stored in the weak map, losing all the advantages
   * of weakness for these.
   */
  function getHiddenRecord(key) {
    if (key !== Object(key)) {
      throw new TypeError('Not an object: ' + key);
    }
    var hiddenRecord = key[HIDDEN_NAME];
    if (hiddenRecord && hiddenRecord.key === key) { return hiddenRecord; }
    if (!isExtensible(key)) {
      // Weak map must brute force, as explained in doc-comment above.
      return void 0;
    }
    var gets = [];
    var vals = [];
    hiddenRecord = {
      key: key,   // self pointer for quick own check above.
      gets: gets, // get___ methods identifying weak maps
      vals: vals  // values associated with this key in each
                  // corresponding weak map.
    };
    defProp(key, HIDDEN_NAME, {
      value: hiddenRecord,
      writable: false,
      enumerable: false,
      configurable: false
    });
    return hiddenRecord;
  }


  /**
   * Monkey patch operations that would make their argument
   * non-extensible.
   *
   * <p>The monkey patched versions throw a TypeError if their
   * argument is not an object, so it should only be done to functions
   * that should throw a TypeError anyway if their argument is not an
   * object.
   */
  (function(){
    var oldFreeze = Object.freeze;
    defProp(Object, 'freeze', {
      value: function identifyingFreeze(obj) {
        getHiddenRecord(obj);
        return oldFreeze(obj);
      }
    });
    var oldSeal = Object.seal;
    defProp(Object, 'seal', {
      value: function identifyingSeal(obj) {
        getHiddenRecord(obj);
        return oldSeal(obj);
      }
    });
    var oldPreventExtensions = Object.preventExtensions;
    defProp(Object, 'preventExtensions', {
      value: function identifyingPreventExtensions(obj) {
        getHiddenRecord(obj);
        return oldPreventExtensions(obj);
      }
    });
  })();


  function constFunc(func) {
    func.prototype = null;
    return Object.freeze(func);
  }

  // Right now (12/25/2012) the histogram supports the current
  // representation. We should check this occasionally, as a true
  // constant time representation is easy.
  // var histogram = [];

  var OurWeakMap = function() {
    // We are currently (12/25/2012) never encountering any prematurely
    // non-extensible keys.
    var keys = []; // brute force for prematurely non-extensible keys.
    var vals = []; // brute force for corresponding values.

    function get___(key, opt_default) {
      var hr = getHiddenRecord(key);
      var i, vs;
      if (hr) {
        i = hr.gets.indexOf(get___);
        vs = hr.vals;
      } else {
        i = keys.indexOf(key);
        vs = vals;
      }
      return (i >= 0) ? vs[i] : opt_default;
    }

    function has___(key) {
      var hr = getHiddenRecord(key);
      var i;
      if (hr) {
        i = hr.gets.indexOf(get___);
      } else {
        i = keys.indexOf(key);
      }
      return i >= 0;
    }

    function set___(key, value) {
      var hr = getHiddenRecord(key);
      var i;
      if (hr) {
        i = hr.gets.indexOf(get___);
        if (i >= 0) {
          hr.vals[i] = value;
        } else {
//          i = hr.gets.length;
//          histogram[i] = (histogram[i] || 0) + 1;
          hr.gets.push(get___);
          hr.vals.push(value);
        }
      } else {
        i = keys.indexOf(key);
        if (i >= 0) {
          vals[i] = value;
        } else {
          keys.push(key);
          vals.push(value);
        }
      }
    }

    function delete___(key) {
      var hr = getHiddenRecord(key);
      var i;
      if (hr) {
        i = hr.gets.indexOf(get___);
        if (i >= 0) {
          hr.gets.splice(i, 1);
          hr.vals.splice(i, 1);
        }
      } else {
        i = keys.indexOf(key);
        if (i >= 0) {
          keys.splice(i, 1);
          vals.splice(i, 1);
        }
      }
      return true;
    }

    return Object.create(OurWeakMap.prototype, {
      get___:    { value: constFunc(get___) },
      has___:    { value: constFunc(has___) },
      set___:    { value: constFunc(set___) },
      delete___: { value: constFunc(delete___) }
    });
  };
  OurWeakMap.prototype = Object.create(Object.prototype, {
    get: {
      /**
       * Return the value most recently associated with key, or
       * opt_default if none.
       */
      value: function get(key, opt_default) {
        return this.get___(key, opt_default);
      },
      writable: true,
      configurable: true
    },

    has: {
      /**
       * Is there a value associated with key in this WeakMap?
       */
      value: function has(key) {
        return this.has___(key);
      },
      writable: true,
      configurable: true
    },

    set: {
      /**
       * Associate value with key in this WeakMap, overwriting any
       * previous association if present.
       */
      value: function set(key, value) {
        this.set___(key, value);
      },
      writable: true,
      configurable: true
    },

    'delete': {
      /**
       * Remove any association for key in this WeakMap, returning
       * whether there was one.
       *
       * <p>Note that the boolean return here does not work like the
       * {@code delete} operator. The {@code delete} operator returns
       * whether the deletion succeeds at bringing about a state in
       * which the deleted property is absent. The {@code delete}
       * operator therefore returns true if the property was already
       * absent, whereas this {@code delete} method returns false if
       * the association was already absent.
       */
      value: function remove(key) {
        return this.delete___(key);
      },
      writable: true,
      configurable: true
    }
  });

  if (typeof HostWeakMap === 'function') {
    (function() {
      // If we got here, then the platform has a WeakMap but we are concerned
      // that it may refuse to store some key types. Therefore, make a map
      // implementation which makes use of both as possible.

      function DoubleWeakMap() {
        // Preferable, truly weak map.
        var hmap = new HostWeakMap();

        // Our hidden-property-based pseudo-weak-map. Lazily initialized in the
        // 'set' implementation; thus we can avoid performing extra lookups if
        // we know all entries actually stored are entered in 'hmap'.
        var omap = undefined;

        // Hidden-property maps are not compatible with proxies because proxies
        // can observe the hidden name and either accidentally expose it or fail
        // to allow the hidden property to be set. Therefore, we do not allow
        // arbitrary WeakMaps to switch to using hidden properties, but only
        // those which need the ability, and unprivileged code is not allowed
        // to set the flag.
        var enableSwitching = false;

        function dget(key, opt_default) {
          if (omap) {
            return hmap.has(key) ? hmap.get(key)
                : omap.get___(key, opt_default);
          } else {
            return hmap.get(key, opt_default);
          }
        }

        function dhas(key) {
          return hmap.has(key) || (omap ? omap.has___(key) : false);
        }

        function dset(key, value) {
          if (enableSwitching) {
            try {
              hmap.set(key, value);
            } catch (e) {
              if (!omap) { omap = new OurWeakMap(); }
              omap.set___(key, value);
            }
          } else {
            hmap.set(key, value);
          }
        }

        function ddelete(key) {
          hmap['delete'](key);
          if (omap) { omap.delete___(key); }
        }

        return Object.create(OurWeakMap.prototype, {
          get___:    { value: constFunc(dget) },
          has___:    { value: constFunc(dhas) },
          set___:    { value: constFunc(dset) },
          delete___: { value: constFunc(ddelete) },
          permitHostObjects___: { value: constFunc(function(token) {
            if (token === weakMapPermitHostObjects) {
              enableSwitching = true;
            } else {
              throw new Error('bogus call to permitHostObjects___');
            }
          })}
        });
      }
      DoubleWeakMap.prototype = OurWeakMap.prototype;
      module.exports = DoubleWeakMap;

      // define .constructor to hide OurWeakMap ctor
      Object.defineProperty(WeakMap.prototype, 'constructor', {
        value: WeakMap,
        enumerable: false,  // as default .constructor is
        configurable: true,
        writable: true
      });
    })();
  } else {
    // There is no host WeakMap, so we must use the emulation.

    // Emulated WeakMaps are incompatible with native proxies (because proxies
    // can observe the hidden name), so we must disable Proxy usage (in
    // ArrayLike and Domado, currently).
    if (typeof Proxy !== 'undefined') {
      Proxy = undefined;
    }

    module.exports = OurWeakMap;
  }
})();

},{}],34:[function(require,module,exports){
"use strict";

/*
    Based in part on extras from Motorola Mobility’s Montage
    Copyright (c) 2012, Motorola Mobility LLC. All Rights Reserved.
    3-Clause BSD License
    https://github.com/motorola-mobility/montage/blob/master/LICENSE.md
*/

var Function = require("./shim-function");
var GenericCollection = require("./generic-collection");
var GenericOrder = require("./generic-order");
var WeakMap = require("weak-map");

module.exports = Array;

Array.empty = [];

if (Object.freeze) {
    Object.freeze(Array.empty);
}

Array.from = function (values) {
    var array = [];
    array.addEach(values);
    return array;
};

Array.unzip = function (table) {
    var transpose = [];
    var length = Infinity;
    // compute shortest row
    for (var i = 0; i < table.length; i++) {
        var row = table[i];
        table[i] = row.toArray();
        if (row.length < length) {
            length = row.length;
        }
    }
    for (var i = 0; i < table.length; i++) {
        var row = table[i];
        for (var j = 0; j < row.length; j++) {
            if (j < length && j in row) {
                transpose[j] = transpose[j] || [];
                transpose[j][i] = row[j];
            }
        }
    }
    return transpose;
};

function define(key, value) {
    Object.defineProperty(Array.prototype, key, {
        value: value,
        writable: true,
        configurable: true,
        enumerable: false
    });
}

define("addEach", GenericCollection.prototype.addEach);
define("deleteEach", GenericCollection.prototype.deleteEach);
define("toArray", GenericCollection.prototype.toArray);
define("toObject", GenericCollection.prototype.toObject);
define("all", GenericCollection.prototype.all);
define("any", GenericCollection.prototype.any);
define("min", GenericCollection.prototype.min);
define("max", GenericCollection.prototype.max);
define("sum", GenericCollection.prototype.sum);
define("average", GenericCollection.prototype.average);
define("only", GenericCollection.prototype.only);
define("flatten", GenericCollection.prototype.flatten);
define("zip", GenericCollection.prototype.zip);
define("enumerate", GenericCollection.prototype.enumerate);
define("group", GenericCollection.prototype.group);
define("sorted", GenericCollection.prototype.sorted);
define("reversed", GenericCollection.prototype.reversed);

define("constructClone", function (values) {
    var clone = new this.constructor();
    clone.addEach(values);
    return clone;
});

define("has", function (value, equals) {
    return this.find(value, equals) !== -1;
});

define("get", function (index, defaultValue) {
    if (+index !== index)
        throw new Error("Indicies must be numbers");
    if (!index in this) {
        return defaultValue;
    } else {
        return this[index];
    }
});

define("set", function (index, value) {
    this.splice(index, 1, value);
    return true;
});

define("add", function (value) {
    this.push(value);
    return true;
});

define("delete", function (value, equals) {
    var index = this.find(value, equals);
    if (index !== -1) {
        this.splice(index, 1);
        return true;
    }
    return false;
});

define("find", function (value, equals) {
    equals = equals || this.contentEquals || Object.equals;
    for (var index = 0; index < this.length; index++) {
        if (index in this && equals(this[index], value)) {
            return index;
        }
    }
    return -1;
});

define("findLast", function (value, equals) {
    equals = equals || this.contentEquals || Object.equals;
    var index = this.length;
    do {
        index--;
        if (index in this && equals(this[index], value)) {
            return index;
        }
    } while (index > 0);
    return -1;
});

define("swap", function (index, length, plus) {
    var args = Array.prototype.slice.call(arguments, 0, 2);
    if (plus) {
        if (!Array.isArray(plus)) {
            plus = Array.prototype.slice.call(plus);
        }
        args.push.apply(args, plus);
    }
    return this.splice.apply(this, args);
});

define("one", function () {
    for (var i in this) {
        if (Object.owns(this, i)) {
            return this[i];
        }
    }
});

define("clear", function () {
    this.length = 0;
    return this;
});

define("compare", function (that, compare) {
    compare = compare || Object.compare;
    var i;
    var length;
    var lhs;
    var rhs;
    var relative;

    if (this === that) {
        return 0;
    }

    if (!that || !Array.isArray(that)) {
        return GenericOrder.prototype.compare.call(this, that, compare);
    }

    length = Math.min(this.length, that.length);

    for (i = 0; i < length; i++) {
        if (i in this) {
            if (!(i in that)) {
                return -1;
            } else {
                lhs = this[i];
                rhs = that[i];
                relative = compare(lhs, rhs);
                if (relative) {
                    return relative;
                }
            }
        } else if (i in that) {
            return 1;
        }
    }

    return this.length - that.length;
});

define("equals", function (that, equals) {
    equals = equals || Object.equals;
    var i = 0;
    var length = this.length;
    var left;
    var right;

    if (this === that) {
        return true;
    }
    if (!that || !Array.isArray(that)) {
        return GenericOrder.prototype.equals.call(this, that);
    }

    if (length !== that.length) {
        return false;
    } else {
        for (; i < length; ++i) {
            if (i in this) {
                if (!(i in that)) {
                    return false;
                }
                left = this[i];
                right = that[i];
                if (!equals(left, right)) {
                    return false;
                }
            } else {
                if (i in that) {
                    return false;
                }
            }
        }
    }
    return true;
});

define("clone", function (depth, memo) {
    if (depth === undefined) {
        depth = Infinity;
    } else if (depth === 0) {
        return this;
    }
    memo = memo || new WeakMap();
    var clone = [];
    for (var i in this) {
        if (Object.owns(this, i)) {
            clone[i] = Object.clone(this[i], depth - 1, memo);
        }
    };
    return clone;
});

define("iterate", function (start, end) {
    return new ArrayIterator(this, start, end);
});

define("Iterator", ArrayIterator);

function ArrayIterator(array, start, end) {
    this.array = array;
    this.start = start == null ? 0 : start;
    this.end = end;
};

ArrayIterator.prototype.next = function () {
    if (this.start === (this.end == null ? this.array.length : this.end)) {
        throw StopIteration;
    } else {
        return this.array[this.start++];
    }
};


},{"./generic-collection":25,"./generic-order":27,"./shim-function":35,"weak-map":33}],35:[function(require,module,exports){

module.exports = Function;

/**
    A utility to reduce unnecessary allocations of <code>function () {}</code>
    in its many colorful variations.  It does nothing and returns
    <code>undefined</code> thus makes a suitable default in some circumstances.

    @function external:Function.noop
*/
Function.noop = function () {
};

/**
    A utility to reduce unnecessary allocations of <code>function (x) {return
    x}</code> in its many colorful but ultimately wasteful parameter name
    variations.

    @function external:Function.identity
    @param {Any} any value
    @returns {Any} that value
*/
Function.identity = function (value) {
    return value;
};

/**
    A utility for creating a comparator function for a particular aspect of a
    figurative class of objects.

    @function external:Function.by
    @param {Function} relation A function that accepts a value and returns a
    corresponding value to use as a representative when sorting that object.
    @param {Function} compare an alternate comparator for comparing the
    represented values.  The default is <code>Object.compare</code>, which
    does a deep, type-sensitive, polymorphic comparison.
    @returns {Function} a comparator that has been annotated with
    <code>by</code> and <code>compare</code> properties so
    <code>sorted</code> can perform a transform that reduces the need to call
    <code>by</code> on each sorted object to just once.
 */
Function.by = function (by , compare) {
    compare = compare || Object.compare;
    by = by || Function.identity;
    var compareBy = function (a, b) {
        return compare(by(a), by(b));
    };
    compareBy.compare = compare;
    compareBy.by = by;
    return compareBy;
};

// TODO document
Function.get = function (key) {
    return function (object) {
        return Object.get(object, key);
    };
};


},{}],36:[function(require,module,exports){
"use strict";

var WeakMap = require("weak-map");

module.exports = Object;

/*
    Based in part on extras from Motorola Mobility’s Montage
    Copyright (c) 2012, Motorola Mobility LLC. All Rights Reserved.
    3-Clause BSD License
    https://github.com/motorola-mobility/montage/blob/master/LICENSE.md
*/

/**
    Defines extensions to intrinsic <code>Object</code>.
    @see [Object class]{@link external:Object}
*/

/**
    A utility object to avoid unnecessary allocations of an empty object
    <code>{}</code>.  This object is frozen so it is safe to share.

    @object external:Object.empty
*/
Object.empty = Object.freeze(Object.create(null));

/**
    Returns whether the given value is an object, as opposed to a value.
    Unboxed numbers, strings, true, false, undefined, and null are not
    objects.  Arrays are objects.

    @function external:Object.isObject
    @param {Any} value
    @returns {Boolean} whether the given value is an object
*/
Object.isObject = function (object) {
    return Object(object) === object;
};

/**
    Returns the value of an any value, particularly objects that
    implement <code>valueOf</code>.

    <p>Note that, unlike the precedent of methods like
    <code>Object.equals</code> and <code>Object.compare</code> would suggest,
    this method is named <code>Object.getValueOf</code> instead of
    <code>valueOf</code>.  This is a delicate issue, but the basis of this
    decision is that the JavaScript runtime would be far more likely to
    accidentally call this method with no arguments, assuming that it would
    return the value of <code>Object</code> itself in various situations,
    whereas <code>Object.equals(Object, null)</code> protects against this case
    by noting that <code>Object</code> owns the <code>equals</code> property
    and therefore does not delegate to it.

    @function external:Object.getValueOf
    @param {Any} value a value or object wrapping a value
    @returns {Any} the primitive value of that object, if one exists, or passes
    the value through
*/
Object.getValueOf = function (value) {
    if (Object.can(value, "valueOf")) {
        value = value.valueOf();
    }
    return value;
};

var hashMap = new WeakMap();
Object.hash = function (object) {
    if (Object.can(object, "hash")) {
        return "" + object.hash();
    } else if (Object(object) === object) {
        if (!hashMap.has(object)) {
            hashMap.set(object, Math.random().toString(36).slice(2));
        }
        return hashMap.get(object);
    } else {
        return "" + object;
    }
};

/**
    A shorthand for <code>Object.prototype.hasOwnProperty.call(object,
    key)</code>.  Returns whether the object owns a property for the given key.
    It does not consult the prototype chain and works for any string (including
    "hasOwnProperty") except "__proto__".

    @function external:Object.owns
    @param {Object} object
    @param {String} key
    @returns {Boolean} whether the object owns a property wfor the given key.
*/
var owns = Object.prototype.hasOwnProperty;
Object.owns = function (object, key) {
    return owns.call(object, key);
};

/**
    Returns whether a value implements a particular duck-type method.

    <p>To qualify as a duck-type method, the value in question must have a
    method by the given name on the prototype chain.  To distinguish it from
    a property of an object literal, the property must not be owned by the
    object directly.

    <p>A value that implements a method is not necessarily an object, for
    example, numbers implement <code>valueOf</code>, so this is function
    does not imply <code>Object.isObject</code> of the same value.

    @function external:Object.can
    @param {Any} value a value
    @param {String} name a method name
    @returns {Boolean} whether the given value implements the given method

*/
Object.can = function (object, name) {
    return (
        object != null && // false only for null *and* undefined
        typeof object[name] === "function" &&
        !owns.call(object, name)
    );
};

/**
    A utility that is like Object.owns but is also useful for finding
    properties on the prototype chain, provided that they do not refer to
    methods on the Object prototype.  Works for all strings except "__proto__".

    <p>Alternately, you could use the "in" operator as long as the object
    descends from "null" instead of the Object.prototype, as with
    <code>Object.create(null)</code>.  However,
    <code>Object.create(null)</code> only works in fully compliant EcmaScript 5
    JavaScript engines and cannot be faithfully shimmed.

    <p>If the given object is an instance of a type that implements a method
    named "has", this function defers to the collection, so this method can be
    used to generically handle objects, arrays, or other collections.  In that
    case, the domain of the key depends on the instance.

    @param {Object} object
    @param {String} key
    @returns {Boolean} whether the object, or any of its prototypes except
    <code>Object.prototype</code>
    @function external:Object.has
*/
Object.has = function (object, key) {
    if (typeof object !== "object") {
        throw new Error("Object.has can't accept non-object: " + typeof object);
    }
    // forward to mapped collections that implement "has"
    if (Object.can(object, "has")) {
        return object.has(key);
    // otherwise report whether the key is on the prototype chain,
    // as long as it is not one of the methods on object.prototype
    } else if (typeof key === "string") {
        return key in object && object[key] !== Object.prototype[key];
    } else {
        throw new Error("Key must be a string for Object.has on plain objects");
    }
};

/**
    Gets the value for a corresponding key from an object.

    <p>Uses Object.has to determine whether there is a corresponding value for
    the given key.  As such, <code>Object.get</code> is capable of retriving
    values from the prototype chain as long as they are not from the
    <code>Object.prototype</code>.

    <p>If there is no corresponding value, returns the given default, which may
    be <code>undefined</code>.

    <p>If the given object is an instance of a type that implements a method
    named "get", this function defers to the collection, so this method can be
    used to generically handle objects, arrays, or other collections.  In that
    case, the domain of the key depends on the implementation.  For a `Map`,
    for example, the key might be any object.

    @param {Object} object
    @param {String} key
    @param {Any} value a default to return, <code>undefined</code> if omitted
    @returns {Any} value for key, or default value
    @function external:Object.get
*/
Object.get = function (object, key, value) {
    if (typeof object !== "object") {
        throw new Error("Object.get can't accept non-object: " + typeof object);
    }
    // forward to mapped collections that implement "get"
    if (Object.can(object, "get")) {
        return object.get(key, value);
    } else if (Object.has(object, key)) {
        return object[key];
    } else {
        return value;
    }
};

/**
    Sets the value for a given key on an object.

    <p>If the given object is an instance of a type that implements a method
    named "set", this function defers to the collection, so this method can be
    used to generically handle objects, arrays, or other collections.  As such,
    the key domain varies by the object type.

    @param {Object} object
    @param {String} key
    @param {Any} value
    @returns <code>undefined</code>
    @function external:Object.set
*/
Object.set = function (object, key, value) {
    if (Object.can(object, "set")) {
        object.set(key, value);
    } else {
        object[key] = value;
    }
};

Object.addEach = function (target, source) {
    if (!source) {
    } else if (Object.can(source, "forEach")) {
        // copy map-alikes
        if (typeof source.keys === "function") {
            source.forEach(function (value, key) {
                target[key] = value;
            });
        // iterate key value pairs of other iterables
        } else {
            source.forEach(function (pair) {
                target[pair[0]] = pair[1];
            });
        }
    } else {
        // copy other objects as map-alikes
        Object.keys(source).forEach(function (key) {
            target[key] = source[key];
        });
    }
    return target;
};

/**
    Iterates over the owned properties of an object.

    @function external:Object.forEach
    @param {Object} object an object to iterate.
    @param {Function} callback a function to call for every key and value
    pair in the object.  Receives <code>value</code>, <code>key</code>,
    and <code>object</code> as arguments.
    @param {Object} thisp the <code>this</code> to pass through to the
    callback
*/
Object.forEach = function (object, callback, thisp) {
    Object.keys(object).forEach(function (key) {
        callback.call(thisp, object[key], key, object);
    });
};

/**
    Iterates over the owned properties of a map, constructing a new array of
    mapped values.

    @function external:Object.map
    @param {Object} object an object to iterate.
    @param {Function} callback a function to call for every key and value
    pair in the object.  Receives <code>value</code>, <code>key</code>,
    and <code>object</code> as arguments.
    @param {Object} thisp the <code>this</code> to pass through to the
    callback
    @returns {Array} the respective values returned by the callback for each
    item in the object.
*/
Object.map = function (object, callback, thisp) {
    return Object.keys(object).map(function (key) {
        return callback.call(thisp, object[key], key, object);
    });
};

/**
    Returns the values for owned properties of an object.

    @function external:Object.map
    @param {Object} object
    @returns {Array} the respective value for each owned property of the
    object.
*/
Object.values = function (object) {
    return Object.map(object, Function.identity);
};

// TODO inline document concat
Object.concat = function () {
    var object = {};
    for (var i = 0; i < arguments.length; i++) {
        Object.addEach(object, arguments[i]);
    }
    return object;
};

Object.from = Object.concat;

/**
    Returns whether two values are identical.  Any value is identical to itself
    and only itself.  This is much more restictive than equivalence and subtly
    different than strict equality, <code>===</code> because of edge cases
    including negative zero and <code>NaN</code>.  Identity is useful for
    resolving collisions among keys in a mapping where the domain is any value.
    This method does not delgate to any method on an object and cannot be
    overridden.
    @see http://wiki.ecmascript.org/doku.php?id=harmony:egal
    @param {Any} this
    @param {Any} that
    @returns {Boolean} whether this and that are identical
    @function external:Object.is
*/
Object.is = function (x, y) {
    if (x === y) {
        // 0 === -0, but they are not identical
        return x !== 0 || 1 / x === 1 / y;
    }
    // NaN !== NaN, but they are identical.
    // NaNs are the only non-reflexive value, i.e., if x !== x,
    // then x is a NaN.
    // isNaN is broken: it converts its argument to number, so
    // isNaN("foo") => true
    return x !== x && y !== y;
};

/**
    Performs a polymorphic, type-sensitive deep equivalence comparison of any
    two values.

    <p>As a basic principle, any value is equivalent to itself (as in
    identity), any boxed version of itself (as a <code>new Number(10)</code> is
    to 10), and any deep clone of itself.

    <p>Equivalence has the following properties:

    <ul>
        <li><strong>polymorphic:</strong>
            If the given object is an instance of a type that implements a
            methods named "equals", this function defers to the method.  So,
            this function can safely compare any values regardless of type,
            including undefined, null, numbers, strings, any pair of objects
            where either implements "equals", or object literals that may even
            contain an "equals" key.
        <li><strong>type-sensitive:</strong>
            Incomparable types are not equal.  No object is equivalent to any
            array.  No string is equal to any other number.
        <li><strong>deep:</strong>
            Collections with equivalent content are equivalent, recursively.
        <li><strong>equivalence:</strong>
            Identical values and objects are equivalent, but so are collections
            that contain equivalent content.  Whether order is important varies
            by type.  For Arrays and lists, order is important.  For Objects,
            maps, and sets, order is not important.  Boxed objects are mutally
            equivalent with their unboxed values, by virtue of the standard
            <code>valueOf</code> method.
    </ul>
    @param this
    @param that
    @returns {Boolean} whether the values are deeply equivalent
    @function external:Object.equals
*/
Object.equals = function (a, b, equals) {
    equals = equals || Object.equals;
    // unbox objects, but do not confuse object literals
    a = Object.getValueOf(a);
    b = Object.getValueOf(b);
    if (a === b)
        // 0 === -0, but they are not equal
        return a !== 0 || 1 / a === 1 / b;
    if (a === null || b === null)
        return a === b;
    if (Object.can(a, "equals"))
        return a.equals(b, equals);
    // commutative
    if (Object.can(b, "equals"))
        return b.equals(a, equals);
    if (typeof a === "object" && typeof b === "object") {
        var aPrototype = Object.getPrototypeOf(a);
        var bPrototype = Object.getPrototypeOf(b);
        if (
            aPrototype === bPrototype && (
                aPrototype === Object.prototype ||
                aPrototype === null
            )
        ) {
            for (var key in a) {
                if (!equals(a[key], b[key])) {
                    return false;
                }
            }
            for (var key in b) {
                if (!equals(a[key], b[key])) {
                    return false;
                }
            }
            return true;
        }
    }
    // NaN !== NaN, but they are equal.
    // NaNs are the only non-reflexive value, i.e., if x !== x,
    // then x is a NaN.
    // isNaN is broken: it converts its argument to number, so
    // isNaN("foo") => true
    return a !== a && b !== b;
};

// Because a return value of 0 from a `compare` function  may mean either
// "equals" or "is incomparable", `equals` cannot be defined in terms of
// `compare`.  However, `compare` *can* be defined in terms of `equals` and
// `lessThan`.  Again however, more often it would be desirable to implement
// all of the comparison functions in terms of compare rather than the other
// way around.

/**
    Determines the order in which any two objects should be sorted by returning
    a number that has an analogous relationship to zero as the left value to
    the right.  That is, if the left is "less than" the right, the returned
    value will be "less than" zero, where "less than" may be any other
    transitive relationship.

    <p>Arrays are compared by the first diverging values, or by length.

    <p>Any two values that are incomparable return zero.  As such,
    <code>equals</code> should not be implemented with <code>compare</code>
    since incomparability is indistinguishable from equality.

    <p>Sorts strings lexicographically.  This is not suitable for any
    particular international setting.  Different locales sort their phone books
    in very different ways, particularly regarding diacritics and ligatures.

    <p>If the given object is an instance of a type that implements a method
    named "compare", this function defers to the instance.  The method does not
    need to be an owned property to distinguish it from an object literal since
    object literals are incomparable.  Unlike <code>Object</code> however,
    <code>Array</code> implements <code>compare</code>.

    @param {Any} left
    @param {Any} right
    @returns {Number} a value having the same transitive relationship to zero
    as the left and right values.
    @function external:Object.compare
*/
Object.compare = function (a, b) {
    // unbox objects, but do not confuse object literals
    // mercifully handles the Date case
    a = Object.getValueOf(a);
    b = Object.getValueOf(b);
    var aType = typeof a;
    var bType = typeof b;
    if (a === b)
        return 0;
    if (aType !== bType)
        return 0;
    if (aType === "number")
        return a - b;
    if (aType === "string")
        return a < b ? -1 : 1;
        // the possibility of equality elimiated above
    if (Object.can(a, "compare"))
        return a.compare(b);
    // not commutative, the relationship is reversed
    if (Object.can(b, "compare"))
        return -b.compare(a);
    return 0;
};

/**
    Creates a deep copy of any value.  Values, being immutable, are
    returned without alternation.  Forwards to <code>clone</code> on
    objects and arrays.

    @function external:Object.clone
    @param {Any} value a value to clone
    @param {Number} depth an optional traversal depth, defaults to infinity.
    A value of <code>0</code> means to make no clone and return the value
    directly.
    @param {Map} memo an optional memo of already visited objects to preserve
    reference cycles.  The cloned object will have the exact same shape as the
    original, but no identical objects.  Te map may be later used to associate
    all objects in the original object graph with their corresponding member of
    the cloned graph.
    @returns a copy of the value
*/
Object.clone = function (value, depth, memo) {
    value = Object.getValueOf(value);
    memo = memo || new WeakMap();
    if (depth === undefined) {
        depth = Infinity;
    } else if (depth === 0) {
        return value;
    }
    if (Object.isObject(value)) {
        if (!memo.has(value)) {
            if (Object.can(value, "clone")) {
                memo.set(value, value.clone(depth, memo));
            } else {
                var prototype = Object.getPrototypeOf(value);
                if (prototype === null || prototype === Object.prototype) {
                    var clone = Object.create(prototype);
                    memo.set(value, clone);
                    for (var key in value) {
                        clone[key] = Object.clone(value[key], depth - 1, memo);
                    }
                } else {
                    throw new Error("Can't clone " + value);
                }
            }
        }
        return memo.get(value);
    }
    return value;
};

/**
    Removes all properties owned by this object making the object suitable for
    reuse.

    @function external:Object.clear
    @returns this
*/
Object.clear = function (object) {
    if (Object.can(object, "clear")) {
        object.clear();
    } else {
        var keys = Object.keys(object),
            i = keys.length;
        while (i) {
            i--;
            delete object[keys[i]];
        }
    }
    return object;
};


},{"weak-map":33}],37:[function(require,module,exports){

/**
    accepts a string; returns the string with regex metacharacters escaped.
    the returned string can safely be used within a regex to match a literal
    string. escaped characters are [, ], {, }, (, ), -, *, +, ?, ., \, ^, $,
    |, #, [comma], and whitespace.
*/
if (!RegExp.escape) {
    var special = /[-[\]{}()*+?.\\^$|,#\s]/g;
    RegExp.escape = function (string) {
        return string.replace(special, "\\$&");
    };
}


},{}],38:[function(require,module,exports){

var Array = require("./shim-array");
var Object = require("./shim-object");
var Function = require("./shim-function");
var RegExp = require("./shim-regexp");


},{"./shim-array":34,"./shim-function":35,"./shim-object":36,"./shim-regexp":37}],39:[function(require,module,exports){
"use strict";

module.exports = TreeLog;

function TreeLog() {
}

TreeLog.ascii = {
    intersection: "+",
    through: "-",
    branchUp: "+",
    branchDown: "+",
    fromBelow: ".",
    fromAbove: "'",
    fromBoth: "+",
    strafe: "|"
};

TreeLog.unicodeRound = {
    intersection: "\u254b",
    through: "\u2501",
    branchUp: "\u253b",
    branchDown: "\u2533",
    fromBelow: "\u256d", // round corner
    fromAbove: "\u2570", // round corner
    fromBoth: "\u2523",
    strafe: "\u2503"
};

TreeLog.unicodeSharp = {
    intersection: "\u254b",
    through: "\u2501",
    branchUp: "\u253b",
    branchDown: "\u2533",
    fromBelow: "\u250f", // sharp corner
    fromAbove: "\u2517", // sharp corner
    fromBoth: "\u2523",
    strafe: "\u2503"
};


},{}],40:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};
var rng;

if (global.crypto && crypto.getRandomValues) {
  // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
  // Moderately fast, high quality
  var _rnds8 = new Uint8Array(16);
  rng = function whatwgRNG() {
    crypto.getRandomValues(_rnds8);
    return _rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var  _rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return _rnds;
  };
}

module.exports = rng;


},{}],41:[function(require,module,exports){
var Buffer=require("__browserify_Buffer");//     uuid.js
//
//     Copyright (c) 2010-2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

// Unique ID creation requires a high quality random # generator.  We feature
// detect to determine the best RNG source, normalizing to a function that
// returns 128-bits of randomness, since that's what's usually required
var _rng = require('./rng');

// Buffer class to use
var BufferClass = typeof(Buffer) == 'function' ? Buffer : Array;

// Maps for number <-> hex string conversion
var _byteToHex = [];
var _hexToByte = {};
for (var i = 0; i < 256; i++) {
  _byteToHex[i] = (i + 0x100).toString(16).substr(1);
  _hexToByte[_byteToHex[i]] = i;
}

// **`parse()` - Parse a UUID into it's component bytes**
function parse(s, buf, offset) {
  var i = (buf && offset) || 0, ii = 0;

  buf = buf || [];
  s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
    if (ii < 16) { // Don't overflow!
      buf[i + ii++] = _hexToByte[oct];
    }
  });

  // Zero out remaining bytes if string was short
  while (ii < 16) {
    buf[i + ii++] = 0;
  }

  return buf;
}

// **`unparse()` - Convert UUID byte array (ala parse()) into a string**
function unparse(buf, offset) {
  var i = offset || 0, bth = _byteToHex;
  return  bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var _seedBytes = _rng();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var _nodeId = [
  _seedBytes[0] | 0x01,
  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var _lastMSecs = 0, _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};

  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  var node = options.node || _nodeId;
  for (var n = 0; n < 6; n++) {
    b[i + n] = node[n];
  }

  return buf ? buf : unparse(b);
}

// **`v4()` - Generate random UUID**

// See https://github.com/broofa/node-uuid for API details
function v4(options, buf, offset) {
  // Deprecated - 'format' argument, as supported in v1.2
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new BufferClass(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || _rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ii++) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || unparse(rnds);
}

// Export public API
var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;
uuid.parse = parse;
uuid.unparse = unparse;
uuid.BufferClass = BufferClass;

module.exports = uuid;

},{"./rng":40,"__browserify_Buffer":59}],42:[function(require,module,exports){
// Params are containers,
// which have a clock key { clock: {} }

// increments the counter for nodeId
exports.increment = function(o, nodeId) {
  if(o.clock) {
    o.clock[nodeId] = (typeof o.clock[nodeId] == 'undefined' ? 1 : o.clock[nodeId] + 1);
  } else {
    o[nodeId] = (typeof o[nodeId] == 'undefined' ? 1 : o[nodeId] + 1);
  }
  return o;
};

function allKeys(a, b){
  var last = null;
  return Object.keys(a)
    .concat(Object.keys(b))
    .sort()
    .filter(function(item) {
      // to make a set of sorted keys unique, just check that consecutive keys are different
      var isDuplicate = (item == last);
      last = item;
      return !isDuplicate;
    });
}

// like a regular sort function, returns:
// if a < b: -1
// if a == b: 0
// if a > b: 1
// E.g. if used to sort an array of keys, will order them in ascending order (1, 2, 3 ..)
exports.ascSort = exports.compare = function(a, b) {
  var isGreater = false,
      isLess = false;

  // allow this function to be called with objects that contain clocks, or the clocks themselves
  if(a.clock) a = a.clock;
  if(b.clock) b = b.clock;

  allKeys(a, b).forEach(function(key) {
    var diff = (a[key] || 0) - (b[key] || 0);
    if(diff > 0) isGreater = true;
    if(diff < 0) isLess = true;
  });

  if(isGreater && isLess) return 0;
  if(isLess) return -1;
  if(isGreater) return 1;
  return 0; // neither is set, so equal
};

// sort in descending order (N, ... 3, 2, 1)
exports.descSort = function(a, b) {
  return 0 - exports.ascSort(a, b);
};

// equal, or not less and not greater than
exports.isConcurrent = function(a, b) {
  return !!(exports.compare(a, b) == 0);
};

// identical
exports.isIdentical = function(a, b) {
  // allow this function to be called with objects that contain clocks, or the clocks themselves
  if(a.clock) a = a.clock;
  if(b.clock) b = b.clock;

  return allKeys(a, b).every(function(key) {
    if(typeof a[key] == 'undefined' || typeof b[key] == 'undefined') return false;
    var diff = a[key] - b[key];
    if(diff != 0) return false;
    return true;
  });
};


// given two vector clocks, returns a new vector clock with all values greater than
// those of the merged clocks
exports.merge = function(a, b) {
  var last = null, result = {}, wantContainer = false;
  // allow this function to be called with objects that contain clocks, or the clocks themselves
  if(a.clock && b.clock) wantContainer = true;
  if(a.clock) a = a.clock;
  if(b.clock) b = b.clock;

  allKeys(a, b).forEach(function(key) {
    result[key] = Math.max(a[key] || 0, b[key] || 0);
  });
  if(wantContainer) {
    return { clock: result };
  }
  return result;
};

exports.GT = 1;
exports.LT = -1;
exports.CONCURRENT = 0;

},{}],43:[function(require,module,exports){
/* jshint node: true */
/* global document, location, Primus: false */
'use strict';

var url = require('url');
var reTrailingSlash = /\/$/;

/**
  ### signaller.loadPrimus(signalhost, callback)

**/
module.exports = function(signalhost, callback) {
  var script;
  var baseUrl;
  var basePath;
  var scriptSrc;

  // if the signalhost is a function, we are in single arg calling mode
  if (typeof signalhost == 'function') {
    callback = signalhost;
    signalhost = location.origin;
  }

  // read the base path
  baseUrl = signalhost.replace(reTrailingSlash, '');
  basePath = url.parse(signalhost).pathname;
  scriptSrc = baseUrl + '/rtc.io/primus.js';

  // look for the script first
  script = document.querySelector('script[src="' + scriptSrc + '"]');

  // if we found, the script trigger the callback immediately
  if (script && typeof Primus != 'undefined') {
    return callback(null, Primus);
  }

  // otherwise create the script and load primus
  script = document.createElement('script');
  script.src = scriptSrc;

  script.onerror = callback;
  script.onload = function() {
    // if we have a signalhost that is not basepathed at /
    // then tweak the primus prototype
    if (basePath !== '/') {
      Primus.prototype.pathname = basePath.replace(reTrailingSlash, '') +
        Primus.prototype.pathname;
    }

    callback(null, Primus);
  };

  document.body.appendChild(script);
};
},{"url":65}],44:[function(require,module,exports){
/* jshint node: true */
'use strict';

var debug = require('cog/logger')('rtc-signaller-processor');
var jsonparse = require('cog/jsonparse');
var vc = require('vectorclock');

/**
  ## signaller process handling

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
module.exports = function(signaller) {
  var handlers = require('./handlers')(signaller);

  function sendEvent(parts, srcState, data) {
    // initialise the event name
    var evtName = parts[0].slice(1);

    // convert any valid json objects to json
    var args = parts.slice(1).map(jsonparse);

    signaller.emit.apply(
      signaller,
      [evtName].concat(args).concat([srcState, data])
    );
  }

  return function(originalData) {
    var id = signaller.id;
    var data = originalData;
    var isMatch = true;
    var parts;
    var handler;
    var srcData;
    var srcState;

    debug('signaller ' + signaller.id + ' received data: ' + originalData);

    // process /to messages
    if (data.slice(0, 3) === '/to') {
      isMatch = data.slice(4, id.length + 4) === id;
      if (isMatch) {
        parts = data.slice(5 + id.length).split('|').map(jsonparse);

        // get the source data
        srcData = parts[0];
        srcState = signaller.peers.get(srcData && srcData.id);

        // extract the vector clock and update the parts
        parts = parts.slice(1).map(jsonparse);
      }
    }

    // if this is not a match, then bail
    if (! isMatch) {
      return;
    }

    // chop the data into parts
    parts = parts || data.split('|').map(jsonparse);

    // if we have a specific handler for the action, then invoke
    if (parts[0].charAt(0) === '/') {
      // look for a handler for the message type
      handler = handlers[parts[0].slice(1)];

      if (typeof handler == 'function') {
        handler(
          parts.slice(1),
          parts[0].slice(1),
          srcData && srcData.clock,
          srcState
        );
      }
      else {
        sendEvent(parts, srcState, originalData);
      }
    }

    // if we have a clock value (and a source peer), then merge the clock
    if (srcData && srcData.clock && srcState) {
      srcState.clock = vc.merge(srcState.clock, srcData.clock);
    }
  };
};
},{"./handlers":17,"cog/jsonparse":6,"cog/logger":7,"vectorclock":42}],45:[function(require,module,exports){
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
  var localCandidates = [];
  var queuedCandidates = [];
  var sdpFilter = (opts || {}).sdpfilter;

  // retry implementation
  var maxAttempts = (opts || {}).maxAttempts || 1;
  var attemptDelay = (opts || {}).attemptDelay || 3000;
  var attempt = 1;
  var attemptTimer;
  var offerTimeout;

  // initilaise the negotiation helpers
  var createOffer = negotiate('createOffer');
  var createAnswer = negotiate('createAnswer');

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
      debug('captured error: ', err);
      q.push({ op: lockRelease });

      // reattempt coupling?
      if (stageHandler && attempt < maxAttempts && (! attemptTimer)) {
        attemptTimer = setTimeout(function() {
          attempt += 1;
          attemptTimer = 0;

          debug('reattempting connection (attempt: ' + attempt + ')');
          stageHandler();
        }, attemptDelay);
      }

      if (typeof cb == 'function') {
        cb(err);
      }
    };
  }

  function negotiate(methodName) {
    var hsDebug = require('cog/logger')('handshake-' + methodName);

    return function(task, cb) {
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
      localCandidates.push(evt.candidate);
    }

    if (conn.iceGatheringState === 'complete') {
      debug('ice gathering state complete, sending candidates')
      signaller.to(targetId).send('/candidates', localCandidates.splice(0));
    }
  }

  function handleRemoteCandidate(targetId, data) {
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

  function handleRemoteCandidateArray(src, data) {
    if ((! src) || (src.id !== targetId)) {
      return;
    }

    data.forEach(function(candidate) {
      handleRemoteCandidate(targetId, candidate);
    });
  }

  function handleSdp(src, data) {
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

  function lockAcquire(task, cb) {
    debug('attempting to acquire negotiate lock with target: ' + targetId);
    signaller.lock(targetId, { label: 'negotiate' }, function(err) {
      if (err) {
        debug('error getting lock, resetting queue');
        queueReset();
      }

      cb(err);
    });
  }

  function lockRelease(task, cb) {
    signaller.unlock(targetId, { label: 'negotiate' }, cb);
  }

  function queue(negotiateTask) {
    return function() {
      q.push([
        { op: lockAcquire },
        { op: negotiateTask },
        { op: lockRelease }
      ]);
    };
  }

  function queueReset() {
    q.tasks.splice(0);
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
  signaller.on('candidates', handleRemoteCandidateArray);

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
},{"./detect":46,"./monitor":49,"async":3,"cog/logger":51}],46:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ## rtc/detect

  Provide the [rtc-core/detect](https://github.com/rtc-io/rtc-core#detect) 
  functionality.
**/
module.exports = require('rtc-core/detect');
},{"rtc-core/detect":13}],47:[function(require,module,exports){
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
},{"./detect":46,"cog/defaults":50,"cog/logger":51}],48:[function(require,module,exports){
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
},{"./couple":45,"./detect":46,"./generators":47,"cog/logger":51}],49:[function(require,module,exports){
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
},{"__browserify_process":60,"cog/logger":51,"events":57}],50:[function(require,module,exports){
module.exports=require(4)
},{}],51:[function(require,module,exports){
module.exports=require(7)
},{}],52:[function(require,module,exports){
var parser = require('./lib/parser');
var writer = require('./lib/writer');

exports.write = writer;
exports.parse = parser.parse;
exports.parseFmtpConfig = parser.parseFmtpConfig;
exports.parsePayloads = parser.parsePayloads;
exports.parseRemoteCandidates = parser.parseRemoteCandidates;

},{"./lib/parser":54,"./lib/writer":55}],53:[function(require,module,exports){
var grammar = module.exports = {
  v: [{
      name: 'version',
      reg: /^(\d*)$/
  }],
  o: [{ //o=- 20518 0 IN IP4 203.0.113.1
    // NB: sessionId will be a String in most cases because it is huge
    name: 'origin',
    reg: /^(\S*) (\d*) (\d*) (\S*) IP(\d) (.*)/,
    names: ['username', 'sessionId', 'sessionVersion', 'netType', 'ipVer', 'address'],
    format: "%s %s %d %s IP%d %s"
  }],
  // default parsing of these only (though some of these feel outdated)
  s: [{ name: 'name' }],
  i: [{ name: 'description' }],
  u: [{ name: 'uri' }],
  e: [{ name: 'email' }],
  p: [{ name: 'phone' }],
  z: [{ name: 'timezones' }], // TODO: this one can actually be parsed properly..
  r: [{ name: 'repeats' }],   // TODO: this one can also be parsed properly
  //k: [{}], // outdated thing ignored
  t: [{ //t=0 0
    name: 'timing',
    reg: /^(\d*) (\d*)/,
    names: ['start', 'stop'],
    format: "%d %d"
  }],
  c: [{ //c=IN IP4 10.47.197.26
      name: 'connection',
      reg: /^IN IP(\d) (.*)/,
      names: ['version', 'ip'],
      format: "IN IP%d %s"
  }],
  b: [{ //b=AS:4000
      push: 'bandwidth',
      reg: /^(TIAS|AS|CT|RR|RS)\:(\d*)/,
      names: ['type', 'limit'],
      format: "%s:%s"
  }],
  m: [{ //m=video 51744 RTP/AVP 126 97 98 34 31
      // NB: special - pushes to session
      // TODO: rtp/fmtp should be filtered by the payloads found here?
      reg: /^(\w*) (\d*) ([\w\/]*)\s?(.*)?/,
      names: ['type', 'port', 'protocol', 'payloads'],
      format: "%s %d %s %s"
  }],
  a: [
    { //a=rtpmap:110 MP4A-LATM/90000
      push: 'rtp',
      reg: /^rtpmap\:(\d*) (\w*)\/(\d*)/,
      names: ['payload', 'codec', 'rate'],
      format: "rtpmap:%d %s/%d"
    },
    { //a=fmtp:108 profile-level-id=24;object=23;bitrate=64000
      push: 'fmtp',
      reg: /^fmtp\:(\d*) (.*)/,
      names: ['payload', 'config'],
      format: "fmtp:%d %s"
    },
    { //a=rtcp-fb:98 trr-int 100
      push: 'rtcpFbTrrInt',
      reg: /^rtcp-fb\:(\*|\d*) trr-int (\d*)/,
      names: ['payload', 'value'],
      format: "rtcp-fb:%d trr-int %d"
    },
    { //a=rtcp-fb:98 nack rpsi
      push: 'rtcpFb',
      reg: /^rtcp-fb\:(\*|\d*) (\w*) ?(\w*)/,
      names: ['payload', 'type', 'subtype'],
      format: "rtcp-fb:%s %s %s"
    },
    { //a=extmap:2 urn:ietf:params:rtp-hdrext:toffset
      //a=extmap:1/recvonly URI-gps-string
      push: 'ext',
      reg: /^extmap:([a-zA-Z0-9_\/]*) ([^ ]*) ?(.*)/,
      names: ['value', 'uri', 'config'], // value may include "/direction" suffix
      format: "extmap:%s %s %s"
    },
    {
      //a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:PS1uQCVeeCFCanVmcjkpPywjNWhcYD0mXXtxaVBR|2^20|1:32
      push: 'crypto',
      reg: /^crypto:(\d*) ([a-zA-Z0-9_]*) ?([^ ]*) ?(.*)/,
      names: ['id', 'suite', 'config', 'sessionConfig'],
      format: "crypto:%d %s %s %s"
    },
    { //a=setup:actpass
      name: 'setup',
      reg: /^setup\:(\w*)/,
      format: "setup:%s"
    },
    { //a=mid:1
      name: 'mid',
      reg: /^mid\:(\w*)/,
      format: "mid:%s"
    },
    { //a=ptime:20
      name: 'ptime',
      reg: /^ptime\:(\d*)/,
      format: "ptime:%d"
    },
    { //a=maxptime:60
      name: 'maxptime',
      reg: /^maxptime\:(\d*)/,
      format: "maxptime:%d"
    },
    { //a=sendrecv
      name: 'direction',
      reg: /^(sendrecv|recvonly|sendonly|inactive)/,
      format: "%s"
    },
    { //a=ice-ufrag:F7gI
      name: 'iceUfrag',
      reg: /^ice-ufrag\:(.*)/,
      format: "ice-ufrag:%s"
    },
    { //a=ice-pwd:x9cml/YzichV2+XlhiMu8g
      name: 'icePwd',
      reg: /^ice-pwd\:(.*)/,
      format: "ice-pwd:%s"
    },
    { //a=fingerprint:SHA-1 00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33
      name: 'fingerprint',
      reg: /^fingerprint\:(\S*) (.*)/,
      names: ['type', 'hash'],
      format: "fingerprint:%s %s"
    },
    { //a=candidate:0 1 UDP 2113667327 203.0.113.1 54400 typ host
      push: 'candidates',
      reg: /^candidate:(\S*) (\d*) (\S*) (\d*) (\S*) (\d*) typ (\S*)/,
      names: ['foundation', 'component', 'transport', 'priority', 'ip', 'port', 'type'],
      format: "candidate:%s %d %s %d %s %d typ %s"
    },
    { //a=remote-candidates:1 203.0.113.1 54400 2 203.0.113.1 54401 ...
      name: 'remoteCandidates',
      reg: /^remote-candidates:(.*)/,
      format: "remote-candidates:%s"
    },
    { //a=ice-options:google-ice
      name: 'iceOptions',
      reg: /^ice-options\:(.*)/,
      format: "ice-options:%s"
    },
    { //a=ssrc:2566107569 cname:t9YU8M1UxTF8Y1A1
      push: "ssrcs",
      reg: /^ssrc\:(\d*) ([a-zA-Z0-9_]*)\:(.*)/,
      names: ['id', 'attribute', 'value'],
      format: "ssrc:%d %s:%s"
    },
    { //a=msid-semantic: WMS Jvlam5X3SX1OP6pn20zWogvaKJz5Hjf9OnlV
      name: "msidSemantic",
      reg: /^msid-semantic\: (\w*) (.*)/,
      names: ['semantic', 'token'],
      format: "msid-semantic: %s %s" // space after ":" is not accidental
    },
    { //a=group:BUNDLE audio video
      push: 'groups',
      reg: /^group\:(\w*) (.*)/,
      names: ['type', 'mids'],
      format: "group:%s %s"
    },
    { //a=rtcp-mux
      name: 'rtcpMux',
      reg: /^(rtcp-mux)/
    }
  ]
};

// set sensible defaults to avoid polluting the grammar with boring details
Object.keys(grammar).forEach(function (key) {
  var objs = grammar[key];
  objs.forEach(function (obj) {
    if (!obj.reg) {
      obj.reg = /(.*)/;
    }
    if (!obj.format) {
      obj.format = "%s";
    }
  });
}); 

},{}],54:[function(require,module,exports){
var toIntIfInt = function (v) {
  return String(Number(v)) === v ? Number(v) : v;
};

var attachProperties = function (match, location, names, rawName) {
  if (rawName && !names) {
    location[rawName] = toIntIfInt(match[1]);
  }
  else {
    for (var i = 0; i < names.length; i += 1) {
      location[names[i]] = toIntIfInt(match[i+1]);
    }
  }
};

var parseReg = function (obj, location, content) {
  var needsBlank = obj.name && obj.names;
  if (obj.push && !location[obj.push]) {
    location[obj.push] = [];
  }
  else if (needsBlank && !location[obj.name]) {
    location[obj.name] = {};
  }
  var keyLocation = obj.push ?
    {} :  // blank object that will be pushed
    needsBlank ? location[obj.name] : location; // otherwise, named location or root

  attachProperties(content.match(obj.reg), keyLocation, obj.names, obj.name);

  if (obj.push) {
    location[obj.push].push(keyLocation);
  }
};

var grammar = require('./grammar');
var validLine = RegExp.prototype.test.bind(/^([a-z])=(.*)/);

exports.parse = function (sdp) {
  var session = {}
    , media = []
    , location = session; // points at where properties go under (one of the above)

  // parse lines we understand
  sdp.split('\n').filter(validLine).forEach(function (l) {
    var type = l[0];
    var content = l.slice(2);
    if (type === 'm') {
      media.push({rtp: [], fmtp: []});
      location = media[media.length-1]; // point at latest media line
    }

    for (var j = 0; j < (grammar[type] || []).length; j += 1) {
      var obj = grammar[type][j];
      if (obj.reg.test(content)) {
        return parseReg(obj, location, content);
      }
    }
  });

  session.media = media; // link it up
  return session;
};

var fmtpReducer = function (acc, expr) {
  var s = expr.split('=');
  if (s.length === 2) {
    acc[s[0]] = toIntIfInt(s[1]);
  }
  return acc;
};

exports.parseFmtpConfig = function (str) {
  return str.split(';').reduce(fmtpReducer, {});
};

exports.parsePayloads = function (str) {
  return str.split(' ').map(Number);
};

exports.parseRemoteCandidates = function (str) {
  var candidates = [];
  var parts = str.split(' ').map(toIntIfInt);
  for (var i = 0; i < parts.length; i += 3) {
    candidates.push({
      component: parts[i],
      ip: parts[i + 1],
      port: parts[i + 2]
    });
  }
  return candidates;
};

},{"./grammar":53}],55:[function(require,module,exports){
var grammar = require('./grammar');
var format = require('util').format;

var makeLine = function (type, obj, location) {
  var args = [type + '=' + obj.format];
  if (obj.names) {
    for (var i = 0; i < obj.names.length; i += 1) {
      var n = obj.names[i];
      if (obj.name) {
        args.push(location[obj.name][n]);
      }
      else { // for mLine and push attributes
        args.push(location[obj.names[i]]);
      }
    }
  }
  else {
    args.push(location[obj.name]);
  }
  return format.apply(null, args);
};

// RFC specified order
// TODO: extend this with all the rest
var defaultOuterOrder = [
  'v', 'o', 's', 'i',
  'u', 'e', 'p', 'c',
  'b', 't', 'r', 'z', 'a'
];
var defaultInnerOrder = ['i', 'c', 'b', 'a'];


module.exports = function (session, opts) {
  opts = opts || {};
  // ensure certain properties exist
  if (session.version == null) {
    session.version = 0; // "v=0" must be there (only defined version atm)
  }
  if (session.name == null) {
    session.name = " "; // "s= " must be there if no meaningful name set
  }
  session.media.forEach(function (mLine) {
    if (mLine.payloads == null) {
      mLine.payloads = "";
    }
  });

  var outerOrder = opts.outerOrder || defaultOuterOrder;
  var innerOrder = opts.innerOrder || defaultInnerOrder;
  var sdp = [];

  // loop through outerOrder for matching properties on session
  outerOrder.forEach(function (type) {
    grammar[type].forEach(function (obj) {
      if (obj.name in session) {
        sdp.push(makeLine(type, obj, session));
      }
      else if (obj.push in session) {
        session[obj.push].forEach(function (el) {
          sdp.push(makeLine(type, obj, el));
        });
      }
    });
  });

  // then for each media line, follow the innerOrder
  session.media.forEach(function (mLine) {
    sdp.push(makeLine('m', grammar.m[0], mLine));

    innerOrder.forEach(function (type) {
      grammar[type].forEach(function (obj) {
        if (obj.name in mLine) {
          sdp.push(makeLine(type, obj, mLine));
        }
        else if (obj.push in mLine) {
          mLine[obj.push].forEach(function (el) {
            sdp.push(makeLine(type, obj, el));
          });
        }
      });
    });
  });

  return sdp.join('\n') + '\n';
};

},{"./grammar":53,"util":67}],56:[function(require,module,exports){
/* jshint node: true */
/* global io: false */
'use strict';

var eve = require('eve');
var EventEmitter = require('events').EventEmitter;
var rtc = require('rtc');
var debug = require('cog/logger')('glue-sessionmanager');
var createSignaller = require('rtc-signaller');
var extend = require('cog/extend');
var util = require('util');

/**
  ### SessionManager

  The SessionManager class assists with interacting with the signalling
  server and creating peer connections between valid parties.  It uses
  eve to create a decoupled way to get peer information.

**/
function SessionManager(config) {
  if (! (this instanceof SessionManager)) {
    return new SessionManager(config);
  }

  EventEmitter.call(this);

  // initialise the room and our role
  this.room = config.room;
  this.role = config.role;

  // save the config
  this.cfg = config;

  // initialise our peers list
  this.peers = {};

  // initialise the streams data list
  this.streams = {};

  // create our underlying socket connection
  this.socket = new Primus(config.signalhost);
  this.socket.on('open', this.emit.bind(this, 'active'));

  // create our signalling interface
  this.signaller = createSignaller(this.socket);

  // hook up signaller events
  this._bindEvents(this.signaller, config);
}

module.exports = SessionManager;
util.inherits(SessionManager, EventEmitter);

/**
  #### announce()

  Announce ourselves on the signalling channel
**/
SessionManager.prototype.announce = function(targetId) {
  var scope = targetId ? this.signaller.to(targetId) : this.signaller;

  debug('announcing self to: ' + (targetId || 'all'));
  scope.announce({ room: this.room, role: this.role });
};

/**
  #### broadcast(stream)

  Broadcast a stream to our connected peers.

**/
SessionManager.prototype.broadcast = function(stream, data) {
  var peers = this.peers;
  var mgr = this;

  function connectPeer(peer, peerId) {
    mgr.tagStream(stream, peerId, data);

    try {
      peer.addStream(stream);
    }
    catch (e) {
      debug('captured error attempting to add stream: ', e);
    }
  }

  // add to existing streams
  debug('broadcasting stream ' + stream.id + ' to existing peers');
  Object.keys(peers).forEach(function(peerId) {
    if (peers[peerId]) {
      debug('broadcasting to peer: ' + peerId);
      connectPeer(peers[peerId], peerId);
    }
  });

  // when a new peer arrives, add it to that peer also
  eve.on('glue.peer.join', function(peer, peerId) {
    debug('peer ' + peerId + ' joined, connecting to stream: ' + stream.id);

    connectPeer(peer, peerId);
  });

  // when the stream ends disconnect the listener
  // TODO: use addEventListener once supported
  stream.onended = function() {
    eve.off('glue.peer.join', connectPeer);
  };
};

/**
  #### getStreamData(stream, callback)

  Given the input stream `stream`, return the data for the stream.  The
  provided `callback` will not be called until relevant data is held by
  the session manager.

**/
SessionManager.prototype.getStreamData = function(stream, callback) {
  var id = stream && stream.id;
  var data = this.streams[id];

  // if we don't have an id, then abort
  if (! id) {
    return;
  }

  // if we have data already, return it
  if (data) {
    callback(data);
  }
  // otherwise, wait for the data to be created
  else {
    eve.once('glue.streamdata.' + id, callback);
  }
};

/**
  #### tagStream(stream, targetId, data)

  The tagStream is used to pass stream identification information along to the
  target peer.  This information is useful when a particular remote media
  element is expecting the contents of a particular capture target.

**/
SessionManager.prototype.tagStream = function(stream, targetId, data) {
  this.signaller.to(targetId).send('/streamdata', extend({}, data, {
    id: stream.id,
    label: stream.label
  }));
};

/* internal methods */

SessionManager.prototype._bindEvents = function(signaller, opts) {
  var mgr = this;

  // TODO: extract the meaningful parts from the config
  // var opts = this.cfg;
  debug('initializing event handlers');

  signaller.on('peer:announce', function(data) {
    var ns = 'glue.peer.join.' + (data.role || 'none')
    var peer;
    var monitor;

    // if the room does not match our room
    // OR, we already have an active peer for that id, then abort
    debug('captured announce event for peer: ' + data.id);
    if (data.room !== mgr.room) {
      return debug('received announce for incorrect room');
    }

    if (mgr.peers[data.id]) {
      return debug('known peer');
    }

    // create our peer connection
    peer = mgr.peers[data.id] = rtc.createConnection(
      opts,
      opts.constraints
    );

    // couple the connections
    monitor = rtc.couple(peer, data.id, signaller, opts);

    // wait for the monitor to tell us we have an active connection
    // before attempting to bind to any UI elements
    monitor.once('active', function() {
      eve('glue.peer.active.' + (data.role || 'none'), null, peer, data.id);
    });

    eve('glue.peer.join.' + (data.role || 'none'), null, peer, data.id);
  });

  signaller.on('peer:leave', function(id) {
    // get the peer
    var peer = mgr.peers[id];
    debug('captured leave event for peer: ' + id);

    // if this is a peer we know about, then close and send a notification
    if (peer) {
      peer.close();
      mgr.peers[id] = undefined;

      // trigger the notification
      eve('glue.peer.leave', null, peer, id);
    }
  });

  signaller.on('streamdata', function(src, data) {
    // save the stream data to the local stream
    mgr.streams[data.id] = data;
    eve('glue.streamdata.' + data.id, null, data);
  });
};
},{"cog/extend":5,"cog/logger":7,"eve":8,"events":57,"rtc":48,"rtc-signaller":21,"util":67}],57:[function(require,module,exports){
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

},{}],58:[function(require,module,exports){
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

},{}],59:[function(require,module,exports){
require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"PcZj9L":[function(require,module,exports){
var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `browserSupport`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
var browserSupport = (function () {
   // Detect if browser supports Typed Arrays. Supported browsers are IE 10+,
   // Firefox 4+, Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+.
   if (typeof Uint8Array === 'undefined' || typeof ArrayBuffer === 'undefined' ||
        typeof DataView === 'undefined')
      return false

  // Does the browser support adding properties to `Uint8Array` instances? If
  // not, then that's the same as no `Uint8Array` support. We need to be able to
  // add all the node Buffer API methods.
  // Relevant Firefox bug: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var arr = new Uint8Array(0)
    arr.foo = function () { return 42 }
    return 42 === arr.foo()
  } catch (e) {
    return false
  }
})()


/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // Assume object is an array
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (browserSupport) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = augment(new Uint8Array(length))
  } else {
    // Fallback: Return this instance of Buffer
    buf = this
    buf.length = length
  }

  var i
  if (Buffer.isBuffer(subject)) {
    // Speed optimization -- use set if we're copying from a Uint8Array
    buf.set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !browserSupport && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
      return true

    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return b && b._isBuffer
}

Buffer.byteLength = function (str, encoding) {
  switch (encoding || 'utf8') {
    case 'hex':
      return str.length / 2

    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(str).length

    case 'ascii':
    case 'binary':
      return str.length

    case 'base64':
      return base64ToBytes(str).length

    default:
      throw new Error('Unknown encoding')
  }
}

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) {
    throw new Error('Usage: Buffer.concat(list, [totalLength])\n' +
        'list should be an Array.')
  }

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) {
    throw new Error('Invalid hex string')
  }
  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(byte)) throw new Error('Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var bytes, pos
  return Buffer._charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
}

function _asciiWrite (buf, string, offset, length) {
  var bytes, pos
  return Buffer._charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var bytes, pos
  return Buffer._charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  switch (encoding) {
    case 'hex':
      return _hexWrite(this, string, offset, length)

    case 'utf8':
    case 'utf-8':
      return _utf8Write(this, string, offset, length)

    case 'ascii':
      return _asciiWrite(this, string, offset, length)

    case 'binary':
      return _binaryWrite(this, string, offset, length)

    case 'base64':
      return _base64Write(this, string, offset, length)

    default:
      throw new Error('Unknown encoding')
  }
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  switch (encoding) {
    case 'hex':
      return _hexSlice(self, start, end)

    case 'utf8':
    case 'utf-8':
      return _utf8Slice(self, start, end)

    case 'ascii':
      return _asciiSlice(self, start, end)

    case 'binary':
      return _binarySlice(self, start, end)

    case 'base64':
      return _base64Slice(self, start, end)

    default:
      throw new Error('Unknown encoding')
  }
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  if (end < start)
    throw new Error('sourceEnd < sourceStart')
  if (target_start < 0 || target_start >= target.length)
    throw new Error('targetStart out of bounds')
  if (start < 0 || start >= source.length)
    throw new Error('sourceStart out of bounds')
  if (end < 0 || end > source.length)
    throw new Error('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  // copy!
  for (var i = 0; i < end - start; i++)
    target[i + target_start] = this[i + start]
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

// TODO: add test that modifying the new buffer slice will modify memory in the
// original buffer! Use code from:
// http://nodejs.org/api/buffer.html#buffer_buf_slice_start_end
Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (browserSupport) {
    return augment(this.subarray(start, end))
  } else {
    // TODO: slicing works, with limitations (no parent tracking/update)
    // https://github.com/feross/native-buffer-browserify/issues/9
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  var buf = this
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < buf.length, 'Trying to read beyond buffer length')
  }

  if (offset >= buf.length)
    return

  return buf[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 1 < len) {
      return buf._dataview.getUint16(offset, littleEndian)
    } else {
      var dv = new DataView(new ArrayBuffer(2))
      dv.setUint8(0, buf[len - 1])
      return dv.getUint16(0, littleEndian)
    }
  } else {
    var val
    if (littleEndian) {
      val = buf[offset]
      if (offset + 1 < len)
        val |= buf[offset + 1] << 8
    } else {
      val = buf[offset] << 8
      if (offset + 1 < len)
        val |= buf[offset + 1]
    }
    return val
  }
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 3 < len) {
      return buf._dataview.getUint32(offset, littleEndian)
    } else {
      var dv = new DataView(new ArrayBuffer(4))
      for (var i = 0; i + offset < len; i++) {
        dv.setUint8(i, buf[i + offset])
      }
      return dv.getUint32(0, littleEndian)
    }
  } else {
    var val
    if (littleEndian) {
      if (offset + 2 < len)
        val = buf[offset + 2] << 16
      if (offset + 1 < len)
        val |= buf[offset + 1] << 8
      val |= buf[offset]
      if (offset + 3 < len)
        val = val + (buf[offset + 3] << 24 >>> 0)
    } else {
      if (offset + 1 < len)
        val = buf[offset + 1] << 16
      if (offset + 2 < len)
        val |= buf[offset + 2] << 8
      if (offset + 3 < len)
        val |= buf[offset + 3]
      val = val + (buf[offset] << 24 >>> 0)
    }
    return val
  }
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  var buf = this
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < buf.length, 'Trying to read beyond buffer length')
  }

  if (offset >= buf.length)
    return

  if (browserSupport) {
    return buf._dataview.getInt8(offset)
  } else {
    var neg = buf[offset] & 0x80
    if (neg)
      return (0xff - buf[offset] + 1) * -1
    else
      return buf[offset]
  }
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 1 === len) {
      var dv = new DataView(new ArrayBuffer(2))
      dv.setUint8(0, buf[len - 1])
      return dv.getInt16(0, littleEndian)
    } else {
      return buf._dataview.getInt16(offset, littleEndian)
    }
  } else {
    var val = _readUInt16(buf, offset, littleEndian, true)
    var neg = val & 0x8000
    if (neg)
      return (0xffff - val + 1) * -1
    else
      return val
  }
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 3 >= len) {
      var dv = new DataView(new ArrayBuffer(4))
      for (var i = 0; i + offset < len; i++) {
        dv.setUint8(i, buf[i + offset])
      }
      return dv.getInt32(0, littleEndian)
    } else {
      return buf._dataview.getInt32(offset, littleEndian)
    }
  } else {
    var val = _readUInt32(buf, offset, littleEndian, true)
    var neg = val & 0x80000000
    if (neg)
      return (0xffffffff - val + 1) * -1
    else
      return val
  }
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  if (browserSupport) {
    return buf._dataview.getFloat32(offset, littleEndian)
  } else {
    return ieee754.read(buf, offset, littleEndian, 23, 4)
  }
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  if (browserSupport) {
    return buf._dataview.getFloat64(offset, littleEndian)
  } else {
    return ieee754.read(buf, offset, littleEndian, 52, 8)
  }
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  var buf = this
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= buf.length) return

  buf[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 1 === len) {
      var dv = new DataView(new ArrayBuffer(2))
      dv.setUint16(0, value, littleEndian)
      buf[offset] = dv.getUint8(0)
    } else {
      buf._dataview.setUint16(offset, value, littleEndian)
    }
  } else {
    for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
      buf[offset + i] =
          (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
              (littleEndian ? i : 1 - i) * 8
    }
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  var i
  if (browserSupport) {
    if (offset + 3 >= len) {
      var dv = new DataView(new ArrayBuffer(4))
      dv.setUint32(0, value, littleEndian)
      for (i = 0; i + offset < len; i++) {
        buf[i + offset] = dv.getUint8(i)
      }
    } else {
      buf._dataview.setUint32(offset, value, littleEndian)
    }
  } else {
    for (i = 0, j = Math.min(len - offset, 4); i < j; i++) {
      buf[offset + i] =
          (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
    }
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  var buf = this
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= buf.length)
    return

  if (browserSupport) {
    buf._dataview.setInt8(offset, value)
  } else {
    if (value >= 0)
      buf.writeUInt8(value, offset, noAssert)
    else
      buf.writeUInt8(0xff + value + 1, offset, noAssert)
  }
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 1 === len) {
      var dv = new DataView(new ArrayBuffer(2))
      dv.setInt16(0, value, littleEndian)
      buf[offset] = dv.getUint8(0)
    } else {
      buf._dataview.setInt16(offset, value, littleEndian)
    }
  } else {
    if (value >= 0)
      _writeUInt16(buf, value, offset, littleEndian, noAssert)
    else
      _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
  }
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 3 >= len) {
      var dv = new DataView(new ArrayBuffer(4))
      dv.setInt32(0, value, littleEndian)
      for (var i = 0; i + offset < len; i++) {
        buf[i + offset] = dv.getUint8(i)
      }
    } else {
      buf._dataview.setInt32(offset, value, littleEndian)
    }
  } else {
    if (value >= 0)
      _writeUInt32(buf, value, offset, littleEndian, noAssert)
    else
      _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
  }
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 3 >= len) {
      var dv = new DataView(new ArrayBuffer(4))
      dv.setFloat32(0, value, littleEndian)
      for (var i = 0; i + offset < len; i++) {
        buf[i + offset] = dv.getUint8(i)
      }
    } else {
      buf._dataview.setFloat32(offset, value, littleEndian)
    }
  } else {
    ieee754.write(buf, value, offset, littleEndian, 23, 4)
  }
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (browserSupport) {
    if (offset + 7 >= len) {
      var dv = new DataView(new ArrayBuffer(8))
      dv.setFloat64(0, value, littleEndian)
      for (var i = 0; i + offset < len; i++) {
        buf[i + offset] = dv.getUint8(i)
      }
    } else {
      buf._dataview.setFloat64(offset, value, littleEndian)
    }
  } else {
    ieee754.write(buf, value, offset, littleEndian, 52, 8)
  }
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('value is not a number')
  }

  if (end < start) throw new Error('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) {
    throw new Error('start out of bounds')
  }

  if (end < 0 || end > this.length) {
    throw new Error('end out of bounds')
  }

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Not added to Buffer.prototype since it should only
 * be available in browsers that support ArrayBuffer.
 */
function BufferToArrayBuffer () {
  return (new Buffer(this)).buffer
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

function augment (arr) {
  arr._isBuffer = true

  // Augment the Uint8Array *instance* (not the class!) with Buffer methods
  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BufferToArrayBuffer

  if (arr.byteLength !== 0)
    arr._dataview = new DataView(arr.buffer, arr.byteOffset, arr.byteLength)

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++)
    if (str.charCodeAt(i) <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var h = encodeURIComponent(str.charAt(i)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value == 'number', 'cannot write a non-number as a number')
  assert(value >= 0,
      'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint(value, max, min) {
  assert(typeof value == 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754(value, max, min) {
  assert(typeof value == 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":3,"ieee754":4}],"native-buffer-browserify":[function(require,module,exports){
module.exports=require('PcZj9L');
},{}],3:[function(require,module,exports){
(function (exports) {
	'use strict';

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	function b64ToByteArray(b64) {
		var i, j, l, tmp, placeHolders, arr;
	
		if (b64.length % 4 > 0) {
			throw 'Invalid string. Length must be a multiple of 4';
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		placeHolders = indexOf(b64, '=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (indexOf(lookup, b64.charAt(i)) << 18) | (indexOf(lookup, b64.charAt(i + 1)) << 12) | (indexOf(lookup, b64.charAt(i + 2)) << 6) | indexOf(lookup, b64.charAt(i + 3));
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (indexOf(lookup, b64.charAt(i)) << 2) | (indexOf(lookup, b64.charAt(i + 1)) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (indexOf(lookup, b64.charAt(i)) << 10) | (indexOf(lookup, b64.charAt(i + 1)) << 4) | (indexOf(lookup, b64.charAt(i + 2)) >> 2);
			arr.push((tmp >> 8) & 0xFF);
			arr.push(tmp & 0xFF);
		}

		return arr;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup.charAt(num >> 18 & 0x3F) + lookup.charAt(num >> 12 & 0x3F) + lookup.charAt(num >> 6 & 0x3F) + lookup.charAt(num & 0x3F);
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1];
				output += lookup.charAt(temp >> 2);
				output += lookup.charAt((temp << 4) & 0x3F);
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup.charAt(temp >> 10);
				output += lookup.charAt((temp >> 4) & 0x3F);
				output += lookup.charAt((temp << 2) & 0x3F);
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

function indexOf (arr, elt /*, from*/) {
	var len = arr.length;

	var from = Number(arguments[1]) || 0;
	from = (from < 0)
		? Math.ceil(from)
		: Math.floor(from);
	if (from < 0)
		from += len;

	for (; from < len; from++) {
		if ((typeof arr === 'string' && arr.charAt(from) === elt) ||
				(typeof arr !== 'string' && arr[from] === elt)) {
			return from;
		}
	}
	return -1;
}

},{}],4:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}]},{},[])
;;module.exports=require("native-buffer-browserify").Buffer

},{}],60:[function(require,module,exports){
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

},{}],61:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};/*! http://mths.be/punycode v1.2.3 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports;
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^ -~]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /\x2E|\u3002|\uFF0E|\uFF61/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		while (length--) {
			array[length] = fn(array[length]);
		}
		return array;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings.
	 * @private
	 * @param {String} domain The domain name.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		return map(string.split(regexSeparators), fn).join('.');
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <http://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * http://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    length,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols to a Punycode string of ASCII-only
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name to Unicode. Only the
	 * Punycoded parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it on a string that has already been converted to
	 * Unicode.
	 * @memberOf punycode
	 * @param {String} domain The Punycode domain name to convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(domain) {
		return mapDomain(domain, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name to Punycode. Only the
	 * non-ASCII parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it with a domain that's already in ASCII.
	 * @memberOf punycode
	 * @param {String} domain The domain name to convert, as a Unicode string.
	 * @returns {String} The Punycode representation of the given domain name.
	 */
	function toASCII(domain) {
		return mapDomain(domain, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.2.3',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <http://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define(function() {
			return punycode;
		});
	}	else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

},{}],62:[function(require,module,exports){
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

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],63:[function(require,module,exports){
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

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return obj[k].map(function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],64:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":62,"./encode":63}],65:[function(require,module,exports){
/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

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

var punycode = require('punycode');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '~', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(delims),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#']
      .concat(unwise).concat(autoEscape),
    nonAuthChars = ['/', '@', '?', '#'].concat(delims),
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-zA-Z0-9][a-z0-9A-Z_-]{0,62}$/,
    hostnamePartStart = /^([a-zA-Z0-9][a-z0-9A-Z_-]{0,62})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always have a path component.
    pathedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && typeof(url) === 'object' && url.href) return url;

  if (typeof url !== 'string') {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var out = {},
      rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    out.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      out.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {
    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    // don't enforce full RFC correctness, just be unstupid about it.

    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the first @ sign, unless some non-auth character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    var atSign = rest.indexOf('@');
    if (atSign !== -1) {
      var auth = rest.slice(0, atSign);

      // there *may be* an auth
      var hasAuth = true;
      for (var i = 0, l = nonAuthChars.length; i < l; i++) {
        if (auth.indexOf(nonAuthChars[i]) !== -1) {
          // not a valid auth.  Something like http://foo.com/bar@baz/
          hasAuth = false;
          break;
        }
      }

      if (hasAuth) {
        // pluck off the auth portion.
        out.auth = decodeURIComponent(auth);
        rest = rest.substr(atSign + 1);
      }
    }

    var firstNonHost = -1;
    for (var i = 0, l = nonHostChars.length; i < l; i++) {
      var index = rest.indexOf(nonHostChars[i]);
      if (index !== -1 &&
          (firstNonHost < 0 || index < firstNonHost)) firstNonHost = index;
    }

    if (firstNonHost !== -1) {
      out.host = rest.substr(0, firstNonHost);
      rest = rest.substr(firstNonHost);
    } else {
      out.host = rest;
      rest = '';
    }

    // pull out port.
    var p = parseHost(out.host);
    var keys = Object.keys(p);
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i];
      out[key] = p[key];
    }

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    out.hostname = out.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = out.hostname[0] === '[' &&
        out.hostname[out.hostname.length - 1] === ']';

    // validate a little.
    if (out.hostname.length > hostnameMaxLen) {
      out.hostname = '';
    } else if (!ipv6Hostname) {
      var hostparts = out.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            out.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    // hostnames are always lower case.
    out.hostname = out.hostname.toLowerCase();

    if (!ipv6Hostname) {
      // IDNA Support: Returns a puny coded representation of "domain".
      // It only converts the part of the domain name that
      // has non ASCII characters. I.e. it dosent matter if
      // you call it with a domain that already is in ASCII.
      var domainArray = out.hostname.split('.');
      var newOut = [];
      for (var i = 0; i < domainArray.length; ++i) {
        var s = domainArray[i];
        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
            'xn--' + punycode.encode(s) : s);
      }
      out.hostname = newOut.join('.');
    }

    out.host = (out.hostname || '') +
        ((out.port) ? ':' + out.port : '');
    out.href += out.host;

    // strip [ and ] from the hostname
    if (ipv6Hostname) {
      out.hostname = out.hostname.substr(1, out.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    out.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    out.search = rest.substr(qm);
    out.query = rest.substr(qm + 1);
    if (parseQueryString) {
      out.query = querystring.parse(out.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    out.search = '';
    out.query = {};
  }
  if (rest) out.pathname = rest;
  if (slashedProtocol[proto] &&
      out.hostname && !out.pathname) {
    out.pathname = '/';
  }

  //to support http.request
  if (out.pathname || out.search) {
    out.path = (out.pathname ? out.pathname : '') +
               (out.search ? out.search : '');
  }

  // finally, reconstruct the href based on what has been validated.
  out.href = urlFormat(out);
  return out;
}

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (typeof(obj) === 'string') obj = urlParse(obj);

  var auth = obj.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = obj.protocol || '',
      pathname = obj.pathname || '',
      hash = obj.hash || '',
      host = false,
      query = '';

  if (obj.host !== undefined) {
    host = auth + obj.host;
  } else if (obj.hostname !== undefined) {
    host = auth + (obj.hostname.indexOf(':') === -1 ?
        obj.hostname :
        '[' + obj.hostname + ']');
    if (obj.port) {
      host += ':' + obj.port;
    }
  }

  if (obj.query && typeof obj.query === 'object' &&
      Object.keys(obj.query).length) {
    query = querystring.stringify(obj.query);
  }

  var search = obj.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (obj.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  return protocol + host + pathname + search + hash;
}

function urlResolve(source, relative) {
  return urlFormat(urlResolveObject(source, relative));
}

function urlResolveObject(source, relative) {
  if (!source) return relative;

  source = urlParse(urlFormat(source), false, true);
  relative = urlParse(urlFormat(relative), false, true);

  // hash is always overridden, no matter what.
  source.hash = relative.hash;

  if (relative.href === '') {
    source.href = urlFormat(source);
    return source;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    relative.protocol = source.protocol;
    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[relative.protocol] &&
        relative.hostname && !relative.pathname) {
      relative.path = relative.pathname = '/';
    }
    relative.href = urlFormat(relative);
    return relative;
  }

  if (relative.protocol && relative.protocol !== source.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      relative.href = urlFormat(relative);
      return relative;
    }
    source.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      relative.pathname = relPath.join('/');
    }
    source.pathname = relative.pathname;
    source.search = relative.search;
    source.query = relative.query;
    source.host = relative.host || '';
    source.auth = relative.auth;
    source.hostname = relative.hostname || relative.host;
    source.port = relative.port;
    //to support http.request
    if (source.pathname !== undefined || source.search !== undefined) {
      source.path = (source.pathname ? source.pathname : '') +
                    (source.search ? source.search : '');
    }
    source.slashes = source.slashes || relative.slashes;
    source.href = urlFormat(source);
    return source;
  }

  var isSourceAbs = (source.pathname && source.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host !== undefined ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (source.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = source.pathname && source.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = source.protocol &&
          !slashedProtocol[source.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // source.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {

    delete source.hostname;
    delete source.port;
    if (source.host) {
      if (srcPath[0] === '') srcPath[0] = source.host;
      else srcPath.unshift(source.host);
    }
    delete source.host;
    if (relative.protocol) {
      delete relative.hostname;
      delete relative.port;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      delete relative.host;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    source.host = (relative.host || relative.host === '') ?
                      relative.host : source.host;
    source.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : source.hostname;
    source.search = relative.search;
    source.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    source.search = relative.search;
    source.query = relative.query;
  } else if ('search' in relative) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      source.hostname = source.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = source.host && source.host.indexOf('@') > 0 ?
                       source.host.split('@') : false;
      if (authInHost) {
        source.auth = authInHost.shift();
        source.host = source.hostname = authInHost.shift();
      }
    }
    source.search = relative.search;
    source.query = relative.query;
    //to support http.request
    if (source.pathname !== undefined || source.search !== undefined) {
      source.path = (source.pathname ? source.pathname : '') +
                    (source.search ? source.search : '');
    }
    source.href = urlFormat(source);
    return source;
  }
  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    delete source.pathname;
    //to support http.request
    if (!source.search) {
      source.path = '/' + source.search;
    } else {
      delete source.path;
    }
    source.href = urlFormat(source);
    return source;
  }
  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (source.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    source.hostname = source.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = source.host && source.host.indexOf('@') > 0 ?
                     source.host.split('@') : false;
    if (authInHost) {
      source.auth = authInHost.shift();
      source.host = source.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (source.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  source.pathname = srcPath.join('/');
  //to support request.http
  if (source.pathname !== undefined || source.search !== undefined) {
    source.path = (source.pathname ? source.pathname : '') +
                  (source.search ? source.search : '');
  }
  source.auth = relative.auth || source.auth;
  source.slashes = source.slashes || relative.slashes;
  source.href = urlFormat(source);
  return source;
}

function parseHost(host) {
  var out = {};
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      out.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) out.hostname = host;
  return out;
}

}());

},{"punycode":61,"querystring":64}],66:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],67:[function(require,module,exports){
var process=require("__browserify_process"),global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};// Copyright Joyent, Inc. and other Node contributors.
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

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

},{"./support/isBuffer":66,"__browserify_process":60,"inherits":58}]},{},[2])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9kYW1vLy5iYXNoaW5hdGUvaW5zdGFsbC9ub2RlLzAuMTAuMjQvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvY29kZS9ydGMuaW8vZ2x1ZS9ldmVudHMuanMiLCIvY29kZS9ydGMuaW8vZ2x1ZS9pbmRleC5qcyIsIi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9hc3luYy9saWIvYXN5bmMuanMiLCIvY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvY29nL2RlZmF1bHRzLmpzIiwiL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL2NvZy9leHRlbmQuanMiLCIvY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvY29nL2pzb25wYXJzZS5qcyIsIi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9jb2cvbG9nZ2VyLmpzIiwiL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL2V2ZS9ldmUuanMiLCIvY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvZmRvbS9tZXRhLmpzIiwiL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL2Zkb20vb24uanMiLCIvY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvZmRvbS9xc2EuanMiLCIvY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvcnRjLWNhcHR1cmVjb25maWcvaW5kZXguanMiLCIvY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvcnRjLWNvcmUvZGV0ZWN0LmpzIiwiL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy1jb3JlL3Jlc2V0LmpzIiwiL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy1tZWRpYS9pbmRleC5qcyIsIi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL2hhbmRsZXJzL2Fubm91bmNlLmpzIiwiL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvaGFuZGxlcnMvaW5kZXguanMiLCIvY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9oYW5kbGVycy9sZWF2ZS5qcyIsIi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL2hhbmRsZXJzL2xvY2suanMiLCIvY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9oYW5kbGVycy91bmxvY2suanMiLCIvY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9pbmRleC5qcyIsIi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9jb2xsZWN0aW9ucy9kaWN0LmpzIiwiL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL2NvbGxlY3Rpb25zL2Zhc3QtbWFwLmpzIiwiL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL2NvbGxlY3Rpb25zL2Zhc3Qtc2V0LmpzIiwiL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL2NvbGxlY3Rpb25zL2dlbmVyaWMtY29sbGVjdGlvbi5qcyIsIi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9jb2xsZWN0aW9ucy9nZW5lcmljLW1hcC5qcyIsIi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9jb2xsZWN0aW9ucy9nZW5lcmljLW9yZGVyLmpzIiwiL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL2NvbGxlY3Rpb25zL2dlbmVyaWMtc2V0LmpzIiwiL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL2NvbGxlY3Rpb25zL2xpc3QuanMiLCIvY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9ub2RlX21vZHVsZXMvY29sbGVjdGlvbnMvbGlzdGVuL21hcC1jaGFuZ2VzLmpzIiwiL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL2NvbGxlY3Rpb25zL2xpc3Rlbi9wcm9wZXJ0eS1jaGFuZ2VzLmpzIiwiL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL2NvbGxlY3Rpb25zL2xpc3Rlbi9yYW5nZS1jaGFuZ2VzLmpzIiwiL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL2NvbGxlY3Rpb25zL25vZGVfbW9kdWxlcy93ZWFrLW1hcC93ZWFrLW1hcC5qcyIsIi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9jb2xsZWN0aW9ucy9zaGltLWFycmF5LmpzIiwiL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL2NvbGxlY3Rpb25zL3NoaW0tZnVuY3Rpb24uanMiLCIvY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9ub2RlX21vZHVsZXMvY29sbGVjdGlvbnMvc2hpbS1vYmplY3QuanMiLCIvY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9ub2RlX21vZHVsZXMvY29sbGVjdGlvbnMvc2hpbS1yZWdleHAuanMiLCIvY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9ub2RlX21vZHVsZXMvY29sbGVjdGlvbnMvc2hpbS5qcyIsIi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy9jb2xsZWN0aW9ucy90cmVlLWxvZy5qcyIsIi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy91dWlkL3JuZy1icm93c2VyLmpzIiwiL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL3V1aWQvdXVpZC5qcyIsIi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL25vZGVfbW9kdWxlcy92ZWN0b3JjbG9jay9pbmRleC5qcyIsIi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL3ByaW11cy1sb2FkZXIuanMiLCIvY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9wcm9jZXNzb3IuanMiLCIvY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvcnRjL2NvdXBsZS5qcyIsIi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9ydGMvZGV0ZWN0LmpzIiwiL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy9nZW5lcmF0b3JzLmpzIiwiL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy9pbmRleC5qcyIsIi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9ydGMvbW9uaXRvci5qcyIsIi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9zZHAtdHJhbnNmb3JtL2luZGV4LmpzIiwiL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3NkcC10cmFuc2Zvcm0vbGliL2dyYW1tYXIuanMiLCIvY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvc2RwLXRyYW5zZm9ybS9saWIvcGFyc2VyLmpzIiwiL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3NkcC10cmFuc2Zvcm0vbGliL3dyaXRlci5qcyIsIi9jb2RlL3J0Yy5pby9nbHVlL3Nlc3Npb25tYW5hZ2VyLmpzIiwiL2hvbWUvZGFtby8uYmFzaGluYXRlL2luc3RhbGwvbm9kZS8wLjEwLjI0L2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi9ob21lL2RhbW8vLmJhc2hpbmF0ZS9pbnN0YWxsL25vZGUvMC4xMC4yNC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCIvaG9tZS9kYW1vLy5iYXNoaW5hdGUvaW5zdGFsbC9ub2RlLzAuMTAuMjQvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbnNlcnQtbW9kdWxlLWdsb2JhbHMvYnVmZmVyLmpzIiwiL2hvbWUvZGFtby8uYmFzaGluYXRlL2luc3RhbGwvbm9kZS8wLjEwLjI0L2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5zZXJ0LW1vZHVsZS1nbG9iYWxzL25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvaG9tZS9kYW1vLy5iYXNoaW5hdGUvaW5zdGFsbC9ub2RlLzAuMTAuMjQvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wdW55Y29kZS9wdW55Y29kZS5qcyIsIi9ob21lL2RhbW8vLmJhc2hpbmF0ZS9pbnN0YWxsL25vZGUvMC4xMC4yNC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3F1ZXJ5c3RyaW5nL2RlY29kZS5qcyIsIi9ob21lL2RhbW8vLmJhc2hpbmF0ZS9pbnN0YWxsL25vZGUvMC4xMC4yNC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3F1ZXJ5c3RyaW5nL2VuY29kZS5qcyIsIi9ob21lL2RhbW8vLmJhc2hpbmF0ZS9pbnN0YWxsL25vZGUvMC4xMC4yNC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3F1ZXJ5c3RyaW5nL2luZGV4LmpzIiwiL2hvbWUvZGFtby8uYmFzaGluYXRlL2luc3RhbGwvbm9kZS8wLjEwLjI0L2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXJsL3VybC5qcyIsIi9ob21lL2RhbW8vLmJhc2hpbmF0ZS9pbnN0YWxsL25vZGUvMC4xMC4yNC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvc3VwcG9ydC9pc0J1ZmZlckJyb3dzZXIuanMiLCIvaG9tZS9kYW1vLy5iYXNoaW5hdGUvaW5zdGFsbC9ub2RlLzAuMTAuMjQvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbmJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hjQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOWtCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMWhCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7O0FDN0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNTBDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBldmUgPSByZXF1aXJlKCdldmUnKTtcbnZhciByZVByZWZpeGVkID0gL15nbHVlXFwuLztcblxuLyoqXG4gICMjIEV2ZW50c1xuXG4gIEdsdWUgdXNlcyBbZXZlXShodHRwczovL2dpdGh1Yi5jb20vYWRvYmUtd2VicGxhdGZvcm0vZXZlKSB1bmRlciB0aGUgaG9vZCxcbiAgYW5kIGV4cG9zZXMgYSBzaW1wbGUgaW50ZXJmYWNlIHRvIGV2ZSBldmVudHMgdGhyb3VnaCB0aGUgYGdsdWUuZXZlbnRzYFxuICBpbnRlcmZhY2UuXG5cbiAgSWYgdXNpbmcgZXZlIGRpcmVjdGx5IHRoZXNlIGV2ZW50cyBhcmUgbmFtZXNwYWNlZCB3aXRoIHRoZSBwcmVmaXggb2ZcbiAgYGdsdWUuYCB0byBhdm9pZCBldmVudCBuYW1lIGNsYXNoZXMgb24gdGhlIGJ1cywgYnV0IHlvdSBjYW4gdXNlIHRoZVxuICBgZ2x1ZS5ldmVudHNgIGVuZHBvaW50IHRvIGF0dGFjaCB0byBldmUgd2l0aG91dCB0aGUgbmFtZXNwYWNlIGlmIHlvdSBwcmVmZXIuXG5cbiAgRm9yIGV4YW1wbGU6XG5cbiAgPDw8IGV4YW1wbGVzL2V2ZW50LW5hbWVzcGFjaW5nLmpzXG5cbioqL1xuWydvbicsICdvbmNlJywgJ29mZiddLmZvckVhY2goZnVuY3Rpb24obWV0aG9kKSB7XG4gIGV4cG9ydHNbbWV0aG9kXSA9IGZ1bmN0aW9uKG5hbWUsIGhhbmRsZXIpIHtcbiAgICBpZiAoISByZVByZWZpeGVkLnRlc3QobmFtZSkpIHtcbiAgICAgIG5hbWUgPSAnZ2x1ZS4nICsgbmFtZTtcbiAgICB9XG5cbiAgICAvLyByZWdpc3RlciB0aGUgaGFuZGxlclxuICAgIGV2ZVttZXRob2RdKG5hbWUsIGhhbmRsZXIpO1xuICB9O1xufSk7IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbi8qIGdsb2JhbCB3aW5kb3c6IGZhbHNlICovXG4vKiBnbG9iYWwgZG9jdW1lbnQ6IGZhbHNlICovXG4vKiBnbG9iYWwgbG9jYXRpb246IGZhbHNlICovXG4vKiBnbG9iYWwgQ3VzdG9tRXZlbnQ6IGZhbHNlICovXG4vKiBnbG9iYWwgaW86IGZhbHNlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBhc3luYyA9IHJlcXVpcmUoJ2FzeW5jJyk7XG52YXIgdXJsID0gcmVxdWlyZSgndXJsJyk7XG52YXIgZXZlID0gcmVxdWlyZSgnZXZlJyk7XG52YXIgcXNhID0gcmVxdWlyZSgnZmRvbS9xc2EnKTtcbnZhciBvbiA9IHJlcXVpcmUoJ2Zkb20vb24nKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCdjb2cvZGVmYXVsdHMnKTtcbnZhciBsb2dnZXIgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJyk7XG52YXIgZGVidWcgPSBsb2dnZXIoJ2dsdWUnKTtcbnZhciBzaWduYWxsZXIgPSByZXF1aXJlKCdydGMtc2lnbmFsbGVyJyk7XG52YXIgbWVkaWEgPSByZXF1aXJlKCdydGMtbWVkaWEnKTtcbnZhciBjYXB0dXJlQ29uZmlnID0gcmVxdWlyZSgncnRjLWNhcHR1cmVjb25maWcnKTtcbnZhciB0cmFuc2Zvcm0gPSByZXF1aXJlKCdzZHAtdHJhbnNmb3JtJyk7XG52YXIgcmVzZXRFbCA9IHJlcXVpcmUoJ3J0Yy1jb3JlL3Jlc2V0Jyk7XG4vLyB2YXIgbGluZXIgPSByZXF1aXJlKCdzZHAtbGluZXMnKTtcblxudmFyIHJlU2VwID0gL1tcXHNcXCxdXFxzKi87XG52YXIgcmVUcmFpbGluZ1NsYXNoID0gL1xcLyQvO1xudmFyIGNhbkdldFNvdXJjZXMgPSB0eXBlb2YgTWVkaWFTdHJlYW1UcmFjayAhPSAndW5kZWZpbmVkJyAmJlxuICBNZWRpYVN0cmVhbVRyYWNrLmdldFNvdXJjZXM7XG5cbi8vIGluaXRpYWxpc2Ugb3VyIGNvbmZpZyAodXNpbmcgcnRjLSBuYW1lZCBtZXRhZGF0YSB0YWdzKVxudmFyIGNvbmZpZyA9IGRlZmF1bHRzKHt9LCByZXF1aXJlKCdmZG9tL21ldGEnKSgvXnJ0Yy0oLiopJC8pLCB7XG4gIHJvb206IGxvY2F0aW9uLmhhc2guc2xpY2UoMSksXG4gIHNpZ25hbGhvc3Q6IGxvY2F0aW9uLm9yaWdpbiB8fCAnaHR0cDovL3J0Yy5pby9zd2l0Y2hib2FyZC8nXG59KTtcblxudmFyIFNlc3Npb25NYW5hZ2VyID0gcmVxdWlyZSgnLi9zZXNzaW9ubWFuYWdlcicpO1xudmFyIHNlc3Npb25NZ3I7XG52YXIgc291cmNlcztcblxuLyoqXG4gICMgcnRjLWdsdWVcblxuICBHbHVlIGlzIGEgaGlnaC1sZXZlbCBhcHByb2FjaCB0byBidWlsZGluZyBXZWJSVEMgYXBwbGljYXRpb25zLiBJdCBpc1xuICBwcmltYXJpbHkgZGVzaWduZWQgZm9yIHdlYiBhcHBsaWNhdGlvbiBjb2RlcnMgd2hvIHdvdWxkIHByZWZlciB0byBzcGVuZFxuICB0aGVpciB0aW1lIGluIEhUTUwgYW5kIENTUyByYXRoZXIgdGhhbiBKUy5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgR2x1ZSB3b3JrcyBieSBsb29raW5nIGZvciBIVE1MIHRhZ3MgdGhhdCBmb2xsb3cgcGFydGljdWxhciBjb252ZW50aW9uc1xuICB3aXRoIHJlZ2FyZHMgdG8gbmFtZWQgYXR0cmlidXRlZCwgZXRjLiAgRm9yIGluc3RhbmNlLCBjb25zaWRlciB0aGVcbiAgZm9sbG93aW5nIEhUTUw6XG5cbiAgPDw8IGV4YW1wbGVzL2NhcHR1cmUtb25seS5odG1sXG5cbiAgSXQgaXMgdGhlbiBwb3NzaWJsZSB0byB0d2VhayB0aGUgYGdldFVzZXJNZWRpYWAgY29uc3RyYWludHMgdXNpbmcgc29tZVxuICBmbGFncyBpbiB0aGUgYHJ0Yy1jYXB0dXJlYCBhdHRyaWJ1dGU6XG5cbiAgPDw8IGV4YW1wbGVzL2NhcHR1cmUtdHdlYWtyZXMuaHRtbFxuXG4gIEZvciB0aG9zZSB3aG8gcHJlZmVyIHVzaW5nIHNlcGFyYXRlIGF0dHJpYnV0ZXMsIHlvdSBjYW4gYWNoaWV2ZSBzaW1pbGFyXG4gIGJlaGF2aW91ciB1c2luZyB0aGUgYHJ0Yy1yZXNvbHV0aW9uYCAob3IgYHJ0Yy1yZXNgKSBhdHRyaWJ1dGU6XG5cbiAgPDw8IGV4YW1wbGVzL3Jlcy1hdHRyaWJ1dGUuaHRtbFxuXG4gICMjIENvbmZlcmVuY2luZyBFeGFtcGxlXG5cbiAgVGhlIGZvbGxvd2luZyBpcyBhIHNpbXBsZSBleGFtcGxlIG9mIGNvbmZlcmVuY2luZyB1c2luZyBzb21lIGhvc3RlZCBydGMuaW9cbiAgc2lnbmFsbGluZzpcblxuICA8PDwgZXhhbXBsZXMvY29uZmVyZW5jZS1zaW1wbGUuaHRtbFxuXG4gICMjIEdldHRpbmcgR2x1ZVxuXG4gIFByaW1hcmlseSBnbHVlIGlzIGRlc2lnbmVkIGZvciB1c2UgaW4gYSBzdGFuZGFsb25lIHNpdHVhdGlvbiwgYW5kIHRodXNcbiAgY29tZXMgcHJlLXBhY2thZ2VkIGluIGEgVU1EanNcbiAgW2Rpc3RyaWJ1dGlvbl0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtZ2x1ZS90cmVlL21hc3Rlci9kaXN0KS4gSWZcbiAgeW91IHByZWZlciB3b3JraW5nIHdpdGggYnJvd3NlcmlmeSwgdGhlbiBpdCB3aWxsIHN0aWxsIHdvcmsgcXVpdGUgbmljZWx5XG4gIGFuZCB5b3Ugc2hvdWxkIGp1c3QgYG5wbSBpbnN0YWxsIHJ0Yy1nbHVlYCBsaWtlIHlvdSB3b3VsZCB3aXRoIG90aGVyXG4gIG1vZHVsZXMgb2YgdGhlIHJ0Yy5pbyBzdWl0ZS5cblxuICAjIyBSdW5uaW5nIHRoZSBFeGFtcGxlc1xuXG4gIFRoaXMgbW9kdWxlIG9mIHRoZSBbcnRjLmlvXShodHRwczovL3J0Yy5pby8pIHN1aXRlIGlzIGEgbGl0dGxlIGRpZmZlcmVudFxuICB0byBvdGhlcnMgaW4gdGhhdCBpdCBjb21lcyB3aXRoIGEgcmVhZHkgdG8gcnVuIGpzIGZpbGUuICBTaW1wbHkgc3RhcnRcbiAgYSB3ZWJzZXJ2ZXIgaW4gdGhlIHJvb3Qgb2YgdGhlIGRpcmVjdG9yeSBhZnRlciBjbG9uaW5nLiAgSWYgeW91IGFyZSBsb29raW5nXG4gIGZvciBhIGdvb2Qgb25lLCBJJ2QgcmVjb21tZW5kIFtzdF0oaHR0cHM6Ly9naXRodWIuY29tL2lzYWFjcy9zdCkuXG5cbiAgIyMgVGFyZ2V0ZWQgTWVkaWEgQ2FwdHVyZVxuXG4gIFRoZSBkcmFmdFxuICBbTWVkaWEgQ2FwdHVyZSBzcGVjXShodHRwOi8vZGV2LnczLm9yZy8yMDExL3dlYnJ0Yy9lZGl0b3IvZ2V0dXNlcm1lZGlhLmh0bWwpXG4gIGludHJvZHVjZXMgdGhlIGFiaWxpdHkgdG8gcXVlcnkgbWVkaWEgZGV2aWNlcyBvbiB0aGUgbWFjaGluZS4gIFRoaXMgaXNcbiAgY3VycmVudGx5IGF2YWlsYWJsZSB0aHJvdWdoIHRoZSBgTWVkaWFTdHJlYW1UcmFjay5nZXRTb3VyY2VzYCBmdW5jdGlvbi5cblxuICBJZiBhdmFpbGFibGUgdGhlbiB5b3UgY2FuIHRhcmdldCB0aGUgY2FwdHVyZSBvZiBhIHBhcnRpY3VsYXIgaW5wdXQgZGV2aWNlXG4gIHRocm91Z2ggdGhlIHVzZSBvZiBhIG51bWJlcmVkIGRldmljZSBjYXB0dXJlIHNwZWNpZmljYXRpb24uICBGb3IgZXhhbXBsZTpcblxuICBgYGBodG1sXG4gIDx2aWRlbyBydGMtY2FwdHVyZT1cImNhbWVyYToxXCI+PC92aWRlbz5cbiAgYGBgXG5cbiAgV291bGQgYXR0dGVtcHQgdG8gY2FwdHVyZSB0aGUgMm5kICgwLWluZGV4ZWQpIGNhbWVyYSBhdmFpbGFibGUgb24gdGhlXG4gIG1hY2hpbmUgKGlmIGl0IGlzIGFibGUgdG8gcXVlcnkgZGV2aWNlcykuICBUaGUgZm9sbG93aW5nIGlzIGEgbGFyZ2VyXG4gIGV4YW1wbGU6XG5cbiAgPDw8IGV4YW1wbGVzL2NhcHR1cmUtbXVsdGljYW0uaHRtbFxuXG4gICMjIE9uIEN1c3RvbSBBdHRyaWJ1dGVzXG5cbiAgV2hpbGUgd2UgaGF2ZW4ndCAxMDAlIGRlY2lkZWQgd2UgYXJlIGxlYW5pbmcgdG93YXJkcyB0aGUgdXNlIG9mIGN1c3RvbVxuICBgcnRjLSpgIGF0dHJpYnV0ZXMgZm9yIGluZmx1ZW5jaW5nIHRoZSBiZWhhdmlvdXIgb2YgdGhlIGBydGMtZ2x1ZWAgbGlicmFyeS5cbiAgV2hpbGUgY3VycmVudGx5IHRoaXMgaXMgaW4gdmlvbGF0aW9uIHdpdGggdGhlIEhUTUw1IHNwZWMsIGl0IGlzIGFuIGFyZWFcbiAgb2YgYWN0aXZlIGRpc2N1c3Npb24gaW4gVzNDIGxhbmQgKGdpdmVuIFtBbmd1bGFySlNdKGh0dHA6Ly9hbmd1bGFyanMub3JnLylcbiAgaGFzIGFkb3B0ZWQgdGhlIGBuZy0qYCBhdHRyaWJ1dGVzIGFuZCBpcyBwcm92aW5nIHBvcHVsYXIpLlxuXG4gICMjIyBEb2N1bWVudCBNZXRhZGF0YVxuXG4gIEluIHRoZSBgcnRjLWdsdWVgIGxpYnJhcnkgd2UgdXNlIGRvY3VtZW50IGxldmVsIGA8bWV0YT5gIHRhZ3MgdG8gcHJvdmlkZVxuICBnbHVlIHdpdGggY29uZmlndXJhdGlvbiBpbmZvcm1hdGlvbi4gIFRoZXJlIGFyZSBhIG51bWJlciBvZiBjb25maWd1cmFibGVcbiAgb3B0aW9ucywgZWFjaCB3aGljaCBpcyB1c2VkIGluIHRoZSBmb3JtIG9mOlxuXG4gIGBgYGh0bWxcbiAgPG1ldGEgbmFtZT1cInJ0Yy0lZmxhZ25hbWUlXCIgY29udGVudD1cImNvbmZpZyBjb250ZW50XCIgLz5cbiAgYGBgXG5cbiAgIyMjIyBydGMtcm9vbVxuXG4gIEEgY3VzdG9tIHJvb20gdGhhdCBuZXcgY29udmVyc2F0aW9ucyB3aWxsIGJlIGNyZWF0ZWQgaW4uICBJZiBub3Qgc3BlY2lmaWVkXG4gIHRoaXMgd2lsbCBkZWZhdWx0IHRvIGEgdmFsdWUgb2YgYGF1dG9gLlxuXG4gICMjIyMgcnRjLXJvbGVcblxuICBJbiBzb21lIGNvbmZlcmVuY2Ugc2NlbmFyaW9zLCBkaWZmZXJlbnQgcGFydGljaXBhbnRzIGFyZSBhc3NpZ25lZCBkaWZmZXJlbnRcbiAgcm9sZXMgKGUuZy4gc3R1ZGVudC90ZWFjaGVyLCBjb25zdWx0YW50L2N1c3RvbWVyLCBldGMpLiAgQnkgc3BlY2lmeWluZyB0aGVcbiAgYHJ0Yy1yb2xlYCBtZXRhZGF0YSB5b3UgdGhpcyByb2xlIGluZm9ybWF0aW9uIHdpbGwgYmUgYW5ub3VuY2VkIGFzIHBhcnRcbiAgb2YgdGhlIGBydGMtcXVpY2tjb25uZWN0YCBpbml0aWFsaXphdGlvbi5cblxuICAjIyBSZWZlcmVuY2VcblxuICAjIyMgRWxlbWVudCBBdHRyaWJ1dGVzXG5cbiAgIyMjIyBydGMtY2FwdHVyZVxuXG4gIFRoZSBwcmVzZW5jZSBvZiB0aGUgYHJ0Yy1jYXB0dXJlYCBhdHRyaWJ1dGUgaW4gYSBgdmlkZW9gIG9yIGBhdWRpb2AgZWxlbWVudFxuICBpbmRpY2F0ZXMgdGhhdCBpdCBpcyBhIGdldFVzZXJNZWRpYSBjYXB0dXJlIHRhcmdldC5cblxuICAjIyMjIHJ0Yy1wZWVyXG5cbiAgVG8gYmUgY29tcGxldGVkLlxuXG4qKi9cbnZhciBnbHVlID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzY29wZSwgb3B0cykge1xuICB2YXIgc3RhcnR1cE9wcyA9IFtdO1xuICB2YXIgZGVidWdUYXJnZXQ7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgcmVtb3RlIGVsZW1lbnRzXG4gIHZhciBwZWVycyA9IHFzYSgnKltydGMtcGVlcl0nLCBzY29wZSkubWFwKGluaXRQZWVyKTtcblxuICAvLyBpZiB3ZSBoYXZlIHBlZXJzLCB0aGVuIHdlIGFyZSBnb2luZyB0byBuZWVkIHByaW11c1xuICBpZiAocGVlcnMubGVuZ3RoID4gMCkge1xuICAgIHN0YXJ0dXBPcHMucHVzaChsb2FkUHJpbXVzKTtcbiAgfVxuXG4gIC8vIGFwcGx5IGFueSBleHRlcm5hbCBvcHRzIHRvIHRoZSBjb25maWd1cmF0aW9uXG4gIGV4dGVuZChjb25maWcsIG9wdHMpO1xuXG4gIC8vIGRldGVybWluZSBpZiB3ZSBhcmUgZGVidWdnaW5nXG4gIGRlYnVnVGFyZ2V0ID0gKGNvbmZpZyB8fCB7fSkuZGVidWc7XG4gIGlmIChkZWJ1Z1RhcmdldCkge1xuICAgIGlmIChkZWJ1Z1RhcmdldCA9PT0gdHJ1ZSkge1xuICAgICAgbG9nZ2VyLmVuYWJsZSgnKicpO1xuICAgIH1cbiAgICBlbHNlIGlmIChBcnJheS5pc0FycmF5KGRlYnVnVGFyZ2V0KSkge1xuICAgICAgbG9nZ2VyLmVuYWJsZS5hcHBseShsb2dnZXIsIGRlYnVnVGFyZ2V0KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBsb2dnZXIuZW5hYmxlKGRlYnVnVGFyZ2V0KTtcbiAgICB9XG4gIH1cblxuICAvLyBydW4gdGhlIHN0YXJ0dXAgb3BlcmF0aW9uc1xuICBhc3luYy5wYXJhbGxlbChzdGFydHVwT3BzLCBmdW5jdGlvbihlcnIpIHtcbiAgICAvLyBUT0RPOiBjaGVjayBlcnJvcnNcbiAgICBkZWJ1Zygnc3RhcnR1cCBvcHMgY29tcGxldGVkLCBzdGFydGluZyBnbHVlJywgY29uZmlnKTtcbiAgICBldmUoJ2dsdWUucmVhZHknKTtcblxuICAgIC8vIGlmIHdlIGRvbid0IGhhdmUgYSByb29tIG5hbWUsIGdlbmVyYXRlIGEgcm9vbSBuYW1lXG4gICAgaWYgKCEgY29uZmlnLnJvb20pIHtcbiAgICAgIGNvbmZpZy5yb29tID0gZ2VuZXJhdGVSb29tTmFtZSgpO1xuICAgIH1cblxuICAgIC8vIGNyZWF0ZSB0aGUgc2Vzc2lvbiBtYW5hZ2VyXG4gICAgc2Vzc2lvbk1nciA9IHR5cGVvZiBQcmltdXMgIT0gJ3VuZGVmaW5lZCcgJiYgbmV3IFNlc3Npb25NYW5hZ2VyKGNvbmZpZyk7XG5cbiAgICBpZiAoc2Vzc2lvbk1ncikge1xuICAgICAgc2Vzc2lvbk1nci5vbmNlKCdhY3RpdmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcXNhKCcqW3J0Yy1jYXB0dXJlXScsIHNjb3BlKS5mb3JFYWNoKGluaXRDYXB0dXJlKTtcblxuICAgICAgICAvLyBpZiB3ZSBoYXZlIGFueSBwZWVycywgdGhlbiBhbm5vdW5jZSBvdXJzZWx2ZXMgdmlhIHRoZSBzZXNzaW9uIG1hbmFnZXJcbiAgICAgICAgaWYgKHBlZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBzZXNzaW9uTWdyLmFubm91bmNlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyB0cmlnZ2VyIGEgZ2x1ZSBzZXNzaW9uIGFjdGl2ZSBldmVudFxuICAgICAgICBldmUoJ2dsdWUuY29ubmVjdGVkJywgbnVsbCwgc2Vzc2lvbk1nci5zaWduYWxsZXIsIHNlc3Npb25NZ3IpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcXNhKCcqW3J0Yy1jYXB0dXJlXScsIHNjb3BlKS5mb3JFYWNoKGluaXRDYXB0dXJlKTtcbiAgICB9XG4gIH0pO1xufTtcblxuLy8gd2lyZSBpbiB0aGUgZXZlbnRzIGhlbHBlclxuZ2x1ZS5ldmVudHMgPSByZXF1aXJlKCcuL2V2ZW50cycpO1xuXG4vLyBleHBvc2UgdGhlIGNvbmZpZyB0aHJvdWdoIGdsdWVcbmdsdWUuY29uZmlnID0gY29uZmlnO1xuXG4vLyBhdXRvbG9hZCBnbHVlXG5pZiAodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJykge1xuICBvbignbG9hZCcsIHdpbmRvdywgZnVuY3Rpb24oKSB7XG4gICAgLy8gY2hlY2sgaWYgd2UgY2FuIGF1dG9sb2FkXG4gICAgaWYgKGNvbmZpZy5hdXRvbG9hZCA9PT0gdW5kZWZpbmVkIHx8IGNvbmZpZy5hdXRvbG9hZCkge1xuICAgICAgZ2x1ZSgpO1xuICAgIH1cbiAgfSk7XG59XG5cbi8qKlxuICAjIyMgSW50ZXJuYWwgRnVuY3Rpb25zXG4qKi9cblxuLyoqXG4gICMjIyMgaW5pdFBlZXIoZWwpXG5cbiAgSGFuZGxlIHRoZSBpbml0aWFsaXphdGlvbiBvZiBhIHJ0Yy1yZW1vdGUgdGFyZ2V0XG4qKi9cbmZ1bmN0aW9uIGluaXRQZWVyKGVsKSB7XG4gIHZhciBwcm9wVmFsdWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ3J0Yy1wZWVyJyk7XG4gIHZhciB0YXJnZXRTdHJlYW0gPSBlbC5nZXRBdHRyaWJ1dGUoJ3J0Yy1zdHJlYW0nKTtcbiAgdmFyIHBlZXJSb2xlcyA9IHByb3BWYWx1ZSA/IHByb3BWYWx1ZS5zcGxpdChyZVNlcCkgOiBbJyonXTtcblxuICAvLyBjcmVhdGUgYSBkYXRhIGNvbnRhaW5lciB0aGF0IHdlIHdpbGwgYXR0YWNoIHRvIHRoZSBlbGVtZW50XG4gIHZhciBkYXRhID0gZWwuX3J0YyB8fCAoZWwuX3J0YyA9IHt9KTtcblxuICBmdW5jdGlvbiBhdHRhY2hTdHJlYW0oc3RyZWFtKSB7XG4gICAgZGVidWcoJ2F0dGFjaGluZyBzdHJlYW0nKTtcbiAgICBtZWRpYShzdHJlYW0pLnJlbmRlcihlbCk7XG4gICAgZGF0YS5zdHJlYW1JZCA9IHN0cmVhbS5pZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZFN0cmVhbShzdHJlYW0sIHBlZXIpIHtcbiAgICAvLyBpZiB3ZSBkb24ndCBoYXZlIGEgc3RyZWFtIG9yIGFscmVhZHkgaGF2ZSBhIHN0cmVhbSBpZCB0aGVuIGJhaWxcbiAgICBpZiAoZGF0YS5zdHJlYW1JZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGlmIHdlIGhhdmUgYSBwYXJ0aWN1bGFyIHRhcmdldCBzdHJlYW0sIHRoZW4gZ28gbG9va2luZyBmb3IgaXRcbiAgICBpZiAodGFyZ2V0U3RyZWFtKSB7XG4gICAgICBkZWJ1ZygncmVxdWVzdGluZyBzdHJlYW0gZGF0YScpO1xuICAgICAgc2Vzc2lvbk1nci5nZXRTdHJlYW1EYXRhKHN0cmVhbSwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICBkZWJ1ZygnZ290IHN0cmVhbSBkYXRhJywgZGF0YSk7XG5cbiAgICAgICAgLy8gaWYgaXQncyBhIG1hdGNoLCB0aGVuIGF0dGFjaFxuICAgICAgICBpZiAoZGF0YSAmJiBkYXRhLm5hbWUgPT09IHRhcmdldFN0cmVhbSkge1xuICAgICAgICAgIGF0dGFjaFN0cmVhbShzdHJlYW0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgLy8gb3RoZXJ3aXNlLCBhdXRvbWF0aWNhbGx5IGFzc29jaWF0ZSB3aXRoIHRoZSBlbGVtZW50XG4gICAgZWxzZSB7XG4gICAgICBhdHRhY2hTdHJlYW0oc3RyZWFtKTtcbiAgICB9XG4gIH1cblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHBlZXJzIGFuZCBtb25pdG9yIGV2ZW50cyBmb3IgdGhhdCBwZWVyXG4gIHBlZXJSb2xlcy5mb3JFYWNoKGZ1bmN0aW9uKHJvbGUpIHtcbiAgICBldmUub24oJ2dsdWUucGVlci5hY3RpdmUuJyArIHJvbGUsIGZ1bmN0aW9uKHBlZXIsIHBlZXJJZCkge1xuICAgICAgLy8gaWYgdGhlIGVsZW1lbnQgYWxyZWFkeSBoYXMgYSBwZWVyLCB0aGVuIGRvIG5vdGhpbmdcbiAgICAgIGlmIChkYXRhLnBlZXJJZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGRlYnVnKCdwZWVyIGFjdGl2ZScsIHBlZXIuZ2V0UmVtb3RlU3RyZWFtcygpKTtcblxuICAgICAgLy8gYXNzb2NpYXRlIHRoZSBwZWVyIGlkIHdpdGggdGhlIGVsZW1lbnRcbiAgICAgIGRhdGEucGVlcklkID0gcGVlcklkO1xuXG4gICAgICAvLyBhZGQgZXhpc3Rpbmcgc3RyZWFtc1xuICAgICAgW10uc2xpY2UuY2FsbChwZWVyLmdldFJlbW90ZVN0cmVhbXMoKSkuZm9yRWFjaChhZGRTdHJlYW0pO1xuXG4gICAgICAvLyBsaXN0ZW4gZm9yIGFkZCBzdHJhZW0gZXZlbnRzXG4gICAgICBwZWVyLmFkZEV2ZW50TGlzdGVuZXIoJ2FkZHN0cmVhbScsIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBhZGRTdHJlYW0oZXZ0LnN0cmVhbSwgcGVlcik7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZXZlLm9uKCdnbHVlLnBlZXIubGVhdmUnLCBmdW5jdGlvbihwZWVyLCBwZWVySWQpIHtcbiAgICAvLyBpZiB0aGUgcGVlciBsZWF2aW5nIG1hdGNoZXMgdGhlIHJlbW90ZSBwZWVyLCB0aGVuIGNsZWFudXBcbiAgICBpZiAoZGF0YS5wZWVySWQgPT09IHBlZXJJZCkge1xuICAgICAgLy8gcmVzZXQgdGhlIHRhcmdldCBtZWRpYSBlbGVtZW50XG4gICAgICByZXNldEVsKGVsKTtcblxuICAgICAgLy8gcmVzZXQgdGhlIHJ0YyBkYXRhXG4gICAgICBkYXRhID0gZWwuX3J0YyA9IHt9O1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGVsO1xufVxuXG4vKipcbiAgIyMjIyBpbml0Q2FwdHVyZShlbClcblxuICBIYW5kbGUgdGhlIGluaXRpYWxpemF0aW9uIG9mIGFuIHJ0Yy1jYXB0dXJlIHRhcmdldFxuKiovXG5mdW5jdGlvbiBpbml0Q2FwdHVyZShlbCkge1xuICAvLyByZWFkIHRoZSBjYXB0dXJlIGluc3RydWN0aW9uc1xuICB2YXIgY29uZmlnVGV4dCA9IGVsLmdldEF0dHJpYnV0ZSgncnRjLWNhcHR1cmUnKSB8fCAnJztcbiAgdmFyIHJlcyA9IGVsLmdldEF0dHJpYnV0ZSgncnRjLXJlc29sdXRpb24nKSB8fCBlbC5nZXRBdHRyaWJ1dGUoJ3J0Yy1yZXMnKTtcbiAgdmFyIGZwcyA9IGVsLmdldEF0dHJpYnV0ZSgncnRjLWZwcycpO1xuXG4gIGlmIChyZXMpIHtcbiAgICBjb25maWdUZXh0ICs9ICcgbWluOicgKyByZXMgKyAnIG1heDonICsgcmVzO1xuICB9XG5cbiAgaWYgKGZwcykge1xuICAgIGNvbmZpZ1RleHQgKz0gJyBtaW5mcHM6JyArIGZwcyArICcgbWF4ZnBzOicgKyBmcHM7XG4gIH1cblxuICAvLyBwYXRjaCBpbiBhIGNhcHR1cmUgbWV0aG9kIHRvIHRoZSBlbGVtZW50XG4gIGVsLmNhcHR1cmUgPSBlbmFibGVDYXB0dXJlKGVsLCBjYXB0dXJlQ29uZmlnKGNvbmZpZ1RleHQpKTtcblxuICAvLyB0cmlnZ2VyIGNhcHR1cmVcbiAgZWwuY2FwdHVyZShmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAvLyBicm9hZGNhc3QgdGhlIHN0cmVhbSB0aHJvdWdoIHRoZSBzZXNzaW9uIG1hbmFnZXJcbiAgICBpZiAoc2Vzc2lvbk1ncikge1xuICAgICAgc2Vzc2lvbk1nci5icm9hZGNhc3Qoc3RyZWFtLCB7IG5hbWU6IGVsLmlkIH0pO1xuICAgIH1cbiAgfSk7XG59XG5cbi8qKiBpbnRlcm5hbCBoZWxwZXJzICovXG5cbmZ1bmN0aW9uIGVuYWJsZUNhcHR1cmUoZWwsIGNvbmZpZykge1xuXG4gIGZ1bmN0aW9uIGNhcChjYWxsYmFjaykge1xuICAgIHZhciBzdHJlYW0gPSBtZWRpYSh7XG4gICAgICBjb25zdHJhaW50czogY29uZmlnLnRvQ29uc3RyYWludHMoe1xuICAgICAgICBzb3VyY2VzOiBzb3VyY2VzXG4gICAgICB9KVxuICAgIH0pO1xuXG4gICAgLy8gcmVuZGVyIHRoZSBzdHJlYW0gdG8gdGhlIHRhcmdldCBlbGVtZW50XG4gICAgc3RyZWFtLnJlbmRlcihlbCk7XG5cbiAgICAvLyBjYXB0dXJlIGFuZCByZXBvcnQgZXJyb3JzXG4gICAgc3RyZWFtLm9uKCdlcnJvcicsIGZ1bmN0aW9uKGVycikge1xuICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICdFcnJvciBhdHRlbXB0aW5nIHRvIGNhcHR1cmUgbWVkaWEsIHJlcXVlc3RlZCBjb25zdHJhaW50cycsXG4gICAgICAgIHN0cmVhbS5jb25zdHJhaW50c1xuICAgICAgKTtcbiAgICB9KTtcblxuICAgIC8vIGVtaXQgYSBjYXB0dXJlIGV2ZW50IHRocm91Z2ggdGhlIGVsZW1lbnRcbiAgICBzdHJlYW0ub24oJ2NhcHR1cmUnLCBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgIC8vIGRpc3BhdGNoIHRoZSBjYXB0dXJlIGV2ZW50XG4gICAgICBlbC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnY2FwdHVyZScsIHtcbiAgICAgICAgZGV0YWlsOiB7IHN0cmVhbTogc3RyZWFtIH1cbiAgICAgIH0pKTtcblxuICAgICAgLy8gdHJpZ2dlciB0aGUgY2FsbGJhY2sgaWYgb25lIHN1cHBsaWVkXG4gICAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY2FsbGJhY2soc3RyZWFtKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIC8vIGlmIHdlIGFscmVhZHkgaGF2ZSBzb3VyY2VzLCBvciBjYW5ub3QgZ2V0IHNvdXJjZSBpbmZvcm1hdGlvblxuICAgIC8vIHRoZW4gc2tpcCBzdHJhaWdodCB0byBjYXB0dXJlXG4gICAgaWYgKHNvdXJjZXMgfHwgKCEgY2FuR2V0U291cmNlcykpIHtcbiAgICAgIHJldHVybiBjYXAoY2FsbGJhY2spO1xuICAgIH1cblxuICAgIC8vIGdldCBhbmQgdXBkYXRlIHNvdXJjZXNcbiAgICBNZWRpYVN0cmVhbVRyYWNrLmdldFNvdXJjZXMoZnVuY3Rpb24ocykge1xuICAgICAgLy8gdXBkYXRlIHRoZSBzb3VyY2VzXG4gICAgICBzb3VyY2VzID0gcztcblxuICAgICAgLy8gY2FwdHVyZVxuICAgICAgY2FwKGNhbGxiYWNrKVxuICAgIH0pO1xuICB9O1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZVJvb21OYW1lKCkge1xuICBsb2NhdGlvbi5oYXNoID0gTWF0aC5wb3coMiwgNTMpICogTWF0aC5yYW5kb20oKTtcblxuICByZXR1cm4gbG9jYXRpb24uaGFzaC5zbGljZSgxKTtcbn1cblxuZnVuY3Rpb24gbG9hZFByaW11cyhjYWxsYmFjaykge1xuICByZXR1cm4gc2lnbmFsbGVyLmxvYWRQcmltdXMoY29uZmlnLnNpZ25hbGhvc3QsIGNhbGxiYWNrKTtcbn0iLCJ2YXIgcHJvY2Vzcz1yZXF1aXJlKFwiX19icm93c2VyaWZ5X3Byb2Nlc3NcIik7LypnbG9iYWwgc2V0SW1tZWRpYXRlOiBmYWxzZSwgc2V0VGltZW91dDogZmFsc2UsIGNvbnNvbGU6IGZhbHNlICovXG4oZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGFzeW5jID0ge307XG5cbiAgICAvLyBnbG9iYWwgb24gdGhlIHNlcnZlciwgd2luZG93IGluIHRoZSBicm93c2VyXG4gICAgdmFyIHJvb3QsIHByZXZpb3VzX2FzeW5jO1xuXG4gICAgcm9vdCA9IHRoaXM7XG4gICAgaWYgKHJvb3QgIT0gbnVsbCkge1xuICAgICAgcHJldmlvdXNfYXN5bmMgPSByb290LmFzeW5jO1xuICAgIH1cblxuICAgIGFzeW5jLm5vQ29uZmxpY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJvb3QuYXN5bmMgPSBwcmV2aW91c19hc3luYztcbiAgICAgICAgcmV0dXJuIGFzeW5jO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBvbmx5X29uY2UoZm4pIHtcbiAgICAgICAgdmFyIGNhbGxlZCA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoY2FsbGVkKSB0aHJvdyBuZXcgRXJyb3IoXCJDYWxsYmFjayB3YXMgYWxyZWFkeSBjYWxsZWQuXCIpO1xuICAgICAgICAgICAgY2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGZuLmFwcGx5KHJvb3QsIGFyZ3VtZW50cyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLy8vIGNyb3NzLWJyb3dzZXIgY29tcGF0aWJsaXR5IGZ1bmN0aW9ucyAvLy8vXG5cbiAgICB2YXIgX2VhY2ggPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvcikge1xuICAgICAgICBpZiAoYXJyLmZvckVhY2gpIHtcbiAgICAgICAgICAgIHJldHVybiBhcnIuZm9yRWFjaChpdGVyYXRvcik7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKGFycltpXSwgaSwgYXJyKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgX21hcCA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yKSB7XG4gICAgICAgIGlmIChhcnIubWFwKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJyLm1hcChpdGVyYXRvcik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgX2VhY2goYXJyLCBmdW5jdGlvbiAoeCwgaSwgYSkge1xuICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGl0ZXJhdG9yKHgsIGksIGEpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH07XG5cbiAgICB2YXIgX3JlZHVjZSA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yLCBtZW1vKSB7XG4gICAgICAgIGlmIChhcnIucmVkdWNlKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJyLnJlZHVjZShpdGVyYXRvciwgbWVtbyk7XG4gICAgICAgIH1cbiAgICAgICAgX2VhY2goYXJyLCBmdW5jdGlvbiAoeCwgaSwgYSkge1xuICAgICAgICAgICAgbWVtbyA9IGl0ZXJhdG9yKG1lbW8sIHgsIGksIGEpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgfTtcblxuICAgIHZhciBfa2V5cyA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKSB7XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMob2JqKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIga2V5cyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBrIGluIG9iaikge1xuICAgICAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgICAgIGtleXMucHVzaChrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ga2V5cztcbiAgICB9O1xuXG4gICAgLy8vLyBleHBvcnRlZCBhc3luYyBtb2R1bGUgZnVuY3Rpb25zIC8vLy9cblxuICAgIC8vLy8gbmV4dFRpY2sgaW1wbGVtZW50YXRpb24gd2l0aCBicm93c2VyLWNvbXBhdGlibGUgZmFsbGJhY2sgLy8vL1xuICAgIGlmICh0eXBlb2YgcHJvY2VzcyA9PT0gJ3VuZGVmaW5lZCcgfHwgIShwcm9jZXNzLm5leHRUaWNrKSkge1xuICAgICAgICBpZiAodHlwZW9mIHNldEltbWVkaWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYXN5bmMubmV4dFRpY2sgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICAvLyBub3QgYSBkaXJlY3QgYWxpYXMgZm9yIElFMTAgY29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgICAgIHNldEltbWVkaWF0ZShmbik7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlID0gYXN5bmMubmV4dFRpY2s7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBhc3luYy5uZXh0VGljayA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSA9IGFzeW5jLm5leHRUaWNrO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBhc3luYy5uZXh0VGljayA9IHByb2Nlc3MubmV4dFRpY2s7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0SW1tZWRpYXRlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlID0gc2V0SW1tZWRpYXRlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlID0gYXN5bmMubmV4dFRpY2s7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYy5lYWNoID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgIGlmICghYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNvbXBsZXRlZCA9IDA7XG4gICAgICAgIF9lYWNoKGFyciwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgsIG9ubHlfb25jZShmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29tcGxldGVkICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21wbGV0ZWQgPj0gYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgYXN5bmMuZm9yRWFjaCA9IGFzeW5jLmVhY2g7XG5cbiAgICBhc3luYy5lYWNoU2VyaWVzID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgIGlmICghYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNvbXBsZXRlZCA9IDA7XG4gICAgICAgIHZhciBpdGVyYXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaXRlcmF0b3IoYXJyW2NvbXBsZXRlZF0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBsZXRlZCA+PSBhcnIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZXJhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBpdGVyYXRlKCk7XG4gICAgfTtcbiAgICBhc3luYy5mb3JFYWNoU2VyaWVzID0gYXN5bmMuZWFjaFNlcmllcztcblxuICAgIGFzeW5jLmVhY2hMaW1pdCA9IGZ1bmN0aW9uIChhcnIsIGxpbWl0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGZuID0gX2VhY2hMaW1pdChsaW1pdCk7XG4gICAgICAgIGZuLmFwcGx5KG51bGwsIFthcnIsIGl0ZXJhdG9yLCBjYWxsYmFja10pO1xuICAgIH07XG4gICAgYXN5bmMuZm9yRWFjaExpbWl0ID0gYXN5bmMuZWFjaExpbWl0O1xuXG4gICAgdmFyIF9lYWNoTGltaXQgPSBmdW5jdGlvbiAobGltaXQpIHtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgaWYgKCFhcnIubGVuZ3RoIHx8IGxpbWl0IDw9IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBjb21wbGV0ZWQgPSAwO1xuICAgICAgICAgICAgdmFyIHN0YXJ0ZWQgPSAwO1xuICAgICAgICAgICAgdmFyIHJ1bm5pbmcgPSAwO1xuXG4gICAgICAgICAgICAoZnVuY3Rpb24gcmVwbGVuaXNoICgpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29tcGxldGVkID49IGFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgd2hpbGUgKHJ1bm5pbmcgPCBsaW1pdCAmJiBzdGFydGVkIDwgYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBzdGFydGVkICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIHJ1bm5pbmcgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgaXRlcmF0b3IoYXJyW3N0YXJ0ZWQgLSAxXSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlZCArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJ1bm5pbmcgLT0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tcGxldGVkID49IGFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxlbmlzaCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG5cbiAgICB2YXIgZG9QYXJhbGxlbCA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIFthc3luYy5lYWNoXS5jb25jYXQoYXJncykpO1xuICAgICAgICB9O1xuICAgIH07XG4gICAgdmFyIGRvUGFyYWxsZWxMaW1pdCA9IGZ1bmN0aW9uKGxpbWl0LCBmbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIFtfZWFjaExpbWl0KGxpbWl0KV0uY29uY2F0KGFyZ3MpKTtcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIHZhciBkb1NlcmllcyA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIFthc3luYy5lYWNoU2VyaWVzXS5jb25jYXQoYXJncykpO1xuICAgICAgICB9O1xuICAgIH07XG5cblxuICAgIHZhciBfYXN5bmNNYXAgPSBmdW5jdGlvbiAoZWFjaGZuLCBhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgICAgICBhcnIgPSBfbWFwKGFyciwgZnVuY3Rpb24gKHgsIGkpIHtcbiAgICAgICAgICAgIHJldHVybiB7aW5kZXg6IGksIHZhbHVlOiB4fTtcbiAgICAgICAgfSk7XG4gICAgICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeC52YWx1ZSwgZnVuY3Rpb24gKGVyciwgdikge1xuICAgICAgICAgICAgICAgIHJlc3VsdHNbeC5pbmRleF0gPSB2O1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHRzKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBhc3luYy5tYXAgPSBkb1BhcmFsbGVsKF9hc3luY01hcCk7XG4gICAgYXN5bmMubWFwU2VyaWVzID0gZG9TZXJpZXMoX2FzeW5jTWFwKTtcbiAgICBhc3luYy5tYXBMaW1pdCA9IGZ1bmN0aW9uIChhcnIsIGxpbWl0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIF9tYXBMaW1pdChsaW1pdCkoYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICB2YXIgX21hcExpbWl0ID0gZnVuY3Rpb24obGltaXQpIHtcbiAgICAgICAgcmV0dXJuIGRvUGFyYWxsZWxMaW1pdChsaW1pdCwgX2FzeW5jTWFwKTtcbiAgICB9O1xuXG4gICAgLy8gcmVkdWNlIG9ubHkgaGFzIGEgc2VyaWVzIHZlcnNpb24sIGFzIGRvaW5nIHJlZHVjZSBpbiBwYXJhbGxlbCB3b24ndFxuICAgIC8vIHdvcmsgaW4gbWFueSBzaXR1YXRpb25zLlxuICAgIGFzeW5jLnJlZHVjZSA9IGZ1bmN0aW9uIChhcnIsIG1lbW8sIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBhc3luYy5lYWNoU2VyaWVzKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcihtZW1vLCB4LCBmdW5jdGlvbiAoZXJyLCB2KSB7XG4gICAgICAgICAgICAgICAgbWVtbyA9IHY7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIsIG1lbW8pO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIC8vIGluamVjdCBhbGlhc1xuICAgIGFzeW5jLmluamVjdCA9IGFzeW5jLnJlZHVjZTtcbiAgICAvLyBmb2xkbCBhbGlhc1xuICAgIGFzeW5jLmZvbGRsID0gYXN5bmMucmVkdWNlO1xuXG4gICAgYXN5bmMucmVkdWNlUmlnaHQgPSBmdW5jdGlvbiAoYXJyLCBtZW1vLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHJldmVyc2VkID0gX21hcChhcnIsIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgfSkucmV2ZXJzZSgpO1xuICAgICAgICBhc3luYy5yZWR1Y2UocmV2ZXJzZWQsIG1lbW8sIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgfTtcbiAgICAvLyBmb2xkciBhbGlhc1xuICAgIGFzeW5jLmZvbGRyID0gYXN5bmMucmVkdWNlUmlnaHQ7XG5cbiAgICB2YXIgX2ZpbHRlciA9IGZ1bmN0aW9uIChlYWNoZm4sIGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByZXN1bHRzID0gW107XG4gICAgICAgIGFyciA9IF9tYXAoYXJyLCBmdW5jdGlvbiAoeCwgaSkge1xuICAgICAgICAgICAgcmV0dXJuIHtpbmRleDogaSwgdmFsdWU6IHh9O1xuICAgICAgICB9KTtcbiAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LnZhbHVlLCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhfbWFwKHJlc3VsdHMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgIHJldHVybiBhLmluZGV4IC0gYi5pbmRleDtcbiAgICAgICAgICAgIH0pLCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4LnZhbHVlO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIGFzeW5jLmZpbHRlciA9IGRvUGFyYWxsZWwoX2ZpbHRlcik7XG4gICAgYXN5bmMuZmlsdGVyU2VyaWVzID0gZG9TZXJpZXMoX2ZpbHRlcik7XG4gICAgLy8gc2VsZWN0IGFsaWFzXG4gICAgYXN5bmMuc2VsZWN0ID0gYXN5bmMuZmlsdGVyO1xuICAgIGFzeW5jLnNlbGVjdFNlcmllcyA9IGFzeW5jLmZpbHRlclNlcmllcztcblxuICAgIHZhciBfcmVqZWN0ID0gZnVuY3Rpb24gKGVhY2hmbiwgYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgYXJyID0gX21hcChhcnIsIGZ1bmN0aW9uICh4LCBpKSB7XG4gICAgICAgICAgICByZXR1cm4ge2luZGV4OiBpLCB2YWx1ZTogeH07XG4gICAgICAgIH0pO1xuICAgICAgICBlYWNoZm4oYXJyLCBmdW5jdGlvbiAoeCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgudmFsdWUsIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgaWYgKCF2KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhfbWFwKHJlc3VsdHMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgIHJldHVybiBhLmluZGV4IC0gYi5pbmRleDtcbiAgICAgICAgICAgIH0pLCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB4LnZhbHVlO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIGFzeW5jLnJlamVjdCA9IGRvUGFyYWxsZWwoX3JlamVjdCk7XG4gICAgYXN5bmMucmVqZWN0U2VyaWVzID0gZG9TZXJpZXMoX3JlamVjdCk7XG5cbiAgICB2YXIgX2RldGVjdCA9IGZ1bmN0aW9uIChlYWNoZm4sIGFyciwgaXRlcmF0b3IsIG1haW5fY2FsbGJhY2spIHtcbiAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBtYWluX2NhbGxiYWNrKHgpO1xuICAgICAgICAgICAgICAgICAgICBtYWluX2NhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBtYWluX2NhbGxiYWNrKCk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgYXN5bmMuZGV0ZWN0ID0gZG9QYXJhbGxlbChfZGV0ZWN0KTtcbiAgICBhc3luYy5kZXRlY3RTZXJpZXMgPSBkb1NlcmllcyhfZGV0ZWN0KTtcblxuICAgIGFzeW5jLnNvbWUgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgbWFpbl9jYWxsYmFjaykge1xuICAgICAgICBhc3luYy5lYWNoKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgIG1haW5fY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIG1haW5fY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBtYWluX2NhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICAvLyBhbnkgYWxpYXNcbiAgICBhc3luYy5hbnkgPSBhc3luYy5zb21lO1xuXG4gICAgYXN5bmMuZXZlcnkgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgbWFpbl9jYWxsYmFjaykge1xuICAgICAgICBhc3luYy5lYWNoKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIGlmICghdikge1xuICAgICAgICAgICAgICAgICAgICBtYWluX2NhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgbWFpbl9jYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIG1haW5fY2FsbGJhY2sodHJ1ZSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgLy8gYWxsIGFsaWFzXG4gICAgYXN5bmMuYWxsID0gYXN5bmMuZXZlcnk7XG5cbiAgICBhc3luYy5zb3J0QnkgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgYXN5bmMubWFwKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LCBmdW5jdGlvbiAoZXJyLCBjcml0ZXJpYSkge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHt2YWx1ZTogeCwgY3JpdGVyaWE6IGNyaXRlcmlhfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIsIHJlc3VsdHMpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBmbiA9IGZ1bmN0aW9uIChsZWZ0LCByaWdodCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYSA9IGxlZnQuY3JpdGVyaWEsIGIgPSByaWdodC5jcml0ZXJpYTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiAwO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgX21hcChyZXN1bHRzLnNvcnQoZm4pLCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geC52YWx1ZTtcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhc3luYy5hdXRvID0gZnVuY3Rpb24gKHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICB2YXIga2V5cyA9IF9rZXlzKHRhc2tzKTtcbiAgICAgICAgaWYgKCFrZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJlc3VsdHMgPSB7fTtcblxuICAgICAgICB2YXIgbGlzdGVuZXJzID0gW107XG4gICAgICAgIHZhciBhZGRMaXN0ZW5lciA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgbGlzdGVuZXJzLnVuc2hpZnQoZm4pO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgcmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxpc3RlbmVyc1tpXSA9PT0gZm4pIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHRhc2tDb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIF9lYWNoKGxpc3RlbmVycy5zbGljZSgwKSwgZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGFkZExpc3RlbmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChfa2V5cyhyZXN1bHRzKS5sZW5ndGggPT09IGtleXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgX2VhY2goa2V5cywgZnVuY3Rpb24gKGspIHtcbiAgICAgICAgICAgIHZhciB0YXNrID0gKHRhc2tzW2tdIGluc3RhbmNlb2YgRnVuY3Rpb24pID8gW3Rhc2tzW2tdXTogdGFza3Nba107XG4gICAgICAgICAgICB2YXIgdGFza0NhbGxiYWNrID0gZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2FmZVJlc3VsdHMgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgX2VhY2goX2tleXMocmVzdWx0cyksIGZ1bmN0aW9uKHJrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhZmVSZXN1bHRzW3JrZXldID0gcmVzdWx0c1tya2V5XTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHNhZmVSZXN1bHRzW2tdID0gYXJncztcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBzYWZlUmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHN0b3Agc3Vic2VxdWVudCBlcnJvcnMgaGl0dGluZyBjYWxsYmFjayBtdWx0aXBsZSB0aW1lc1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0c1trXSA9IGFyZ3M7XG4gICAgICAgICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSh0YXNrQ29tcGxldGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgcmVxdWlyZXMgPSB0YXNrLnNsaWNlKDAsIE1hdGguYWJzKHRhc2subGVuZ3RoIC0gMSkpIHx8IFtdO1xuICAgICAgICAgICAgdmFyIHJlYWR5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBfcmVkdWNlKHJlcXVpcmVzLCBmdW5jdGlvbiAoYSwgeCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKGEgJiYgcmVzdWx0cy5oYXNPd25Qcm9wZXJ0eSh4KSk7XG4gICAgICAgICAgICAgICAgfSwgdHJ1ZSkgJiYgIXJlc3VsdHMuaGFzT3duUHJvcGVydHkoayk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHJlYWR5KCkpIHtcbiAgICAgICAgICAgICAgICB0YXNrW3Rhc2subGVuZ3RoIC0gMV0odGFza0NhbGxiYWNrLCByZXN1bHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBsaXN0ZW5lciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlYWR5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZUxpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhc2tbdGFzay5sZW5ndGggLSAxXSh0YXNrQ2FsbGJhY2ssIHJlc3VsdHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBhZGRMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhc3luYy53YXRlcmZhbGwgPSBmdW5jdGlvbiAodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgIGlmICh0YXNrcy5jb25zdHJ1Y3RvciAhPT0gQXJyYXkpIHtcbiAgICAgICAgICB2YXIgZXJyID0gbmV3IEVycm9yKCdGaXJzdCBhcmd1bWVudCB0byB3YXRlcmZhbGwgbXVzdCBiZSBhbiBhcnJheSBvZiBmdW5jdGlvbnMnKTtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRhc2tzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHdyYXBJdGVyYXRvciA9IGZ1bmN0aW9uIChpdGVyYXRvcikge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXh0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5wdXNoKHdyYXBJdGVyYXRvcihuZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVyYXRvci5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICAgICAgd3JhcEl0ZXJhdG9yKGFzeW5jLml0ZXJhdG9yKHRhc2tzKSkoKTtcbiAgICB9O1xuXG4gICAgdmFyIF9wYXJhbGxlbCA9IGZ1bmN0aW9uKGVhY2hmbiwgdGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgICAgIGlmICh0YXNrcy5jb25zdHJ1Y3RvciA9PT0gQXJyYXkpIHtcbiAgICAgICAgICAgIGVhY2hmbi5tYXAodGFza3MsIGZ1bmN0aW9uIChmbiwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoZm4pIHtcbiAgICAgICAgICAgICAgICAgICAgZm4oZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgZXJyLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSB7fTtcbiAgICAgICAgICAgIGVhY2hmbi5lYWNoKF9rZXlzKHRhc2tzKSwgZnVuY3Rpb24gKGssIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgdGFza3Nba10oZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzW2tdID0gYXJncztcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIHJlc3VsdHMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgYXN5bmMucGFyYWxsZWwgPSBmdW5jdGlvbiAodGFza3MsIGNhbGxiYWNrKSB7XG4gICAgICAgIF9wYXJhbGxlbCh7IG1hcDogYXN5bmMubWFwLCBlYWNoOiBhc3luYy5lYWNoIH0sIHRhc2tzLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLnBhcmFsbGVsTGltaXQgPSBmdW5jdGlvbih0YXNrcywgbGltaXQsIGNhbGxiYWNrKSB7XG4gICAgICAgIF9wYXJhbGxlbCh7IG1hcDogX21hcExpbWl0KGxpbWl0KSwgZWFjaDogX2VhY2hMaW1pdChsaW1pdCkgfSwgdGFza3MsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuc2VyaWVzID0gZnVuY3Rpb24gKHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICBpZiAodGFza3MuY29uc3RydWN0b3IgPT09IEFycmF5KSB7XG4gICAgICAgICAgICBhc3luYy5tYXBTZXJpZXModGFza3MsIGZ1bmN0aW9uIChmbiwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoZm4pIHtcbiAgICAgICAgICAgICAgICAgICAgZm4oZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgZXJyLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHJlc3VsdHMgPSB7fTtcbiAgICAgICAgICAgIGFzeW5jLmVhY2hTZXJpZXMoX2tleXModGFza3MpLCBmdW5jdGlvbiAoaywgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICB0YXNrc1trXShmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MgPSBhcmdzWzBdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHNba10gPSBhcmdzO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgcmVzdWx0cyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBhc3luYy5pdGVyYXRvciA9IGZ1bmN0aW9uICh0YXNrcykge1xuICAgICAgICB2YXIgbWFrZUNhbGxiYWNrID0gZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgICAgICAgICB2YXIgZm4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRhc2tzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0YXNrc1tpbmRleF0uYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuLm5leHQoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBmbi5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoaW5kZXggPCB0YXNrcy5sZW5ndGggLSAxKSA/IG1ha2VDYWxsYmFjayhpbmRleCArIDEpOiBudWxsO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBmbjtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIG1ha2VDYWxsYmFjaygwKTtcbiAgICB9O1xuXG4gICAgYXN5bmMuYXBwbHkgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KFxuICAgICAgICAgICAgICAgIG51bGwsIGFyZ3MuY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpXG4gICAgICAgICAgICApO1xuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB2YXIgX2NvbmNhdCA9IGZ1bmN0aW9uIChlYWNoZm4sIGFyciwgZm4sIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByID0gW107XG4gICAgICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh4LCBjYikge1xuICAgICAgICAgICAgZm4oeCwgZnVuY3Rpb24gKGVyciwgeSkge1xuICAgICAgICAgICAgICAgIHIgPSByLmNvbmNhdCh5IHx8IFtdKTtcbiAgICAgICAgICAgICAgICBjYihlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgcik7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgYXN5bmMuY29uY2F0ID0gZG9QYXJhbGxlbChfY29uY2F0KTtcbiAgICBhc3luYy5jb25jYXRTZXJpZXMgPSBkb1NlcmllcyhfY29uY2F0KTtcblxuICAgIGFzeW5jLndoaWxzdCA9IGZ1bmN0aW9uICh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKHRlc3QoKSkge1xuICAgICAgICAgICAgaXRlcmF0b3IoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFzeW5jLndoaWxzdCh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGFzeW5jLmRvV2hpbHN0ID0gZnVuY3Rpb24gKGl0ZXJhdG9yLCB0ZXN0LCBjYWxsYmFjaykge1xuICAgICAgICBpdGVyYXRvcihmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGVzdCgpKSB7XG4gICAgICAgICAgICAgICAgYXN5bmMuZG9XaGlsc3QoaXRlcmF0b3IsIHRlc3QsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhc3luYy51bnRpbCA9IGZ1bmN0aW9uICh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCF0ZXN0KCkpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhc3luYy51bnRpbCh0ZXN0LCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGFzeW5jLmRvVW50aWwgPSBmdW5jdGlvbiAoaXRlcmF0b3IsIHRlc3QsIGNhbGxiYWNrKSB7XG4gICAgICAgIGl0ZXJhdG9yKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdGVzdCgpKSB7XG4gICAgICAgICAgICAgICAgYXN5bmMuZG9VbnRpbChpdGVyYXRvciwgdGVzdCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGFzeW5jLnF1ZXVlID0gZnVuY3Rpb24gKHdvcmtlciwgY29uY3VycmVuY3kpIHtcbiAgICAgICAgaWYgKGNvbmN1cnJlbmN5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbmN1cnJlbmN5ID0gMTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBfaW5zZXJ0KHEsIGRhdGEsIHBvcywgY2FsbGJhY2spIHtcbiAgICAgICAgICBpZihkYXRhLmNvbnN0cnVjdG9yICE9PSBBcnJheSkge1xuICAgICAgICAgICAgICBkYXRhID0gW2RhdGFdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBfZWFjaChkYXRhLCBmdW5jdGlvbih0YXNrKSB7XG4gICAgICAgICAgICAgIHZhciBpdGVtID0ge1xuICAgICAgICAgICAgICAgICAgZGF0YTogdGFzayxcbiAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiB0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicgPyBjYWxsYmFjayA6IG51bGxcbiAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICBpZiAocG9zKSB7XG4gICAgICAgICAgICAgICAgcS50YXNrcy51bnNoaWZ0KGl0ZW0pO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHEudGFza3MucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmIChxLnNhdHVyYXRlZCAmJiBxLnRhc2tzLmxlbmd0aCA9PT0gY29uY3VycmVuY3kpIHtcbiAgICAgICAgICAgICAgICAgIHEuc2F0dXJhdGVkKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlKHEucHJvY2Vzcyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgd29ya2VycyA9IDA7XG4gICAgICAgIHZhciBxID0ge1xuICAgICAgICAgICAgdGFza3M6IFtdLFxuICAgICAgICAgICAgY29uY3VycmVuY3k6IGNvbmN1cnJlbmN5LFxuICAgICAgICAgICAgc2F0dXJhdGVkOiBudWxsLFxuICAgICAgICAgICAgZW1wdHk6IG51bGwsXG4gICAgICAgICAgICBkcmFpbjogbnVsbCxcbiAgICAgICAgICAgIHB1c2g6IGZ1bmN0aW9uIChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICBfaW5zZXJ0KHEsIGRhdGEsIGZhbHNlLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdW5zaGlmdDogZnVuY3Rpb24gKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgIF9pbnNlcnQocSwgZGF0YSwgdHJ1ZSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByb2Nlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAod29ya2VycyA8IHEuY29uY3VycmVuY3kgJiYgcS50YXNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhc2sgPSBxLnRhc2tzLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChxLmVtcHR5ICYmIHEudGFza3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxLmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgd29ya2VycyArPSAxO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtlcnMgLT0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrLmNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFzay5jYWxsYmFjay5hcHBseSh0YXNrLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHEuZHJhaW4gJiYgcS50YXNrcy5sZW5ndGggKyB3b3JrZXJzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcS5kcmFpbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcS5wcm9jZXNzKCk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHZhciBjYiA9IG9ubHlfb25jZShuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgd29ya2VyKHRhc2suZGF0YSwgY2IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsZW5ndGg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcS50YXNrcy5sZW5ndGg7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcnVubmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB3b3JrZXJzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcTtcbiAgICB9O1xuXG4gICAgYXN5bmMuY2FyZ28gPSBmdW5jdGlvbiAod29ya2VyLCBwYXlsb2FkKSB7XG4gICAgICAgIHZhciB3b3JraW5nICAgICA9IGZhbHNlLFxuICAgICAgICAgICAgdGFza3MgICAgICAgPSBbXTtcblxuICAgICAgICB2YXIgY2FyZ28gPSB7XG4gICAgICAgICAgICB0YXNrczogdGFza3MsXG4gICAgICAgICAgICBwYXlsb2FkOiBwYXlsb2FkLFxuICAgICAgICAgICAgc2F0dXJhdGVkOiBudWxsLFxuICAgICAgICAgICAgZW1wdHk6IG51bGwsXG4gICAgICAgICAgICBkcmFpbjogbnVsbCxcbiAgICAgICAgICAgIHB1c2g6IGZ1bmN0aW9uIChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIGlmKGRhdGEuY29uc3RydWN0b3IgIT09IEFycmF5KSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEgPSBbZGF0YV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF9lYWNoKGRhdGEsIGZ1bmN0aW9uKHRhc2spIHtcbiAgICAgICAgICAgICAgICAgICAgdGFza3MucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB0YXNrLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJyA/IGNhbGxiYWNrIDogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhcmdvLnNhdHVyYXRlZCAmJiB0YXNrcy5sZW5ndGggPT09IHBheWxvYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcmdvLnNhdHVyYXRlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgYXN5bmMuc2V0SW1tZWRpYXRlKGNhcmdvLnByb2Nlc3MpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByb2Nlc3M6IGZ1bmN0aW9uIHByb2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHdvcmtpbmcpIHJldHVybjtcbiAgICAgICAgICAgICAgICBpZiAodGFza3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGNhcmdvLmRyYWluKSBjYXJnby5kcmFpbigpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIHRzID0gdHlwZW9mIHBheWxvYWQgPT09ICdudW1iZXInXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyB0YXNrcy5zcGxpY2UoMCwgcGF5bG9hZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IHRhc2tzLnNwbGljZSgwKTtcblxuICAgICAgICAgICAgICAgIHZhciBkcyA9IF9tYXAodHMsIGZ1bmN0aW9uICh0YXNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0YXNrLmRhdGE7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZihjYXJnby5lbXB0eSkgY2FyZ28uZW1wdHkoKTtcbiAgICAgICAgICAgICAgICB3b3JraW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB3b3JrZXIoZHMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgd29ya2luZyA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgICAgICAgICBfZWFjaCh0cywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhLmNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5jYWxsYmFjay5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcHJvY2VzcygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxlbmd0aDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0YXNrcy5sZW5ndGg7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcnVubmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB3b3JraW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gY2FyZ287XG4gICAgfTtcblxuICAgIHZhciBfY29uc29sZV9mbiA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MuY29uY2F0KFtmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnNvbGUuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoY29uc29sZVtuYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgX2VhY2goYXJncywgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlW25hbWVdKHgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XSkpO1xuICAgICAgICB9O1xuICAgIH07XG4gICAgYXN5bmMubG9nID0gX2NvbnNvbGVfZm4oJ2xvZycpO1xuICAgIGFzeW5jLmRpciA9IF9jb25zb2xlX2ZuKCdkaXInKTtcbiAgICAvKmFzeW5jLmluZm8gPSBfY29uc29sZV9mbignaW5mbycpO1xuICAgIGFzeW5jLndhcm4gPSBfY29uc29sZV9mbignd2FybicpO1xuICAgIGFzeW5jLmVycm9yID0gX2NvbnNvbGVfZm4oJ2Vycm9yJyk7Ki9cblxuICAgIGFzeW5jLm1lbW9pemUgPSBmdW5jdGlvbiAoZm4sIGhhc2hlcikge1xuICAgICAgICB2YXIgbWVtbyA9IHt9O1xuICAgICAgICB2YXIgcXVldWVzID0ge307XG4gICAgICAgIGhhc2hlciA9IGhhc2hlciB8fCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgIH07XG4gICAgICAgIHZhciBtZW1vaXplZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHZhciBjYWxsYmFjayA9IGFyZ3MucG9wKCk7XG4gICAgICAgICAgICB2YXIga2V5ID0gaGFzaGVyLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICAgICAgaWYgKGtleSBpbiBtZW1vKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgbWVtb1trZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGtleSBpbiBxdWV1ZXMpIHtcbiAgICAgICAgICAgICAgICBxdWV1ZXNba2V5XS5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHF1ZXVlc1trZXldID0gW2NhbGxiYWNrXTtcbiAgICAgICAgICAgICAgICBmbi5hcHBseShudWxsLCBhcmdzLmNvbmNhdChbZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBtZW1vW2tleV0gPSBhcmd1bWVudHM7XG4gICAgICAgICAgICAgICAgICAgIHZhciBxID0gcXVldWVzW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBxdWV1ZXNba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBxLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgIHFbaV0uYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1dKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIG1lbW9pemVkLm1lbW8gPSBtZW1vO1xuICAgICAgICBtZW1vaXplZC51bm1lbW9pemVkID0gZm47XG4gICAgICAgIHJldHVybiBtZW1vaXplZDtcbiAgICB9O1xuXG4gICAgYXN5bmMudW5tZW1vaXplID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gKGZuLnVubWVtb2l6ZWQgfHwgZm4pLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgIH07XG5cbiAgICBhc3luYy50aW1lcyA9IGZ1bmN0aW9uIChjb3VudCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBjb3VudGVyID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuICAgICAgICAgICAgY291bnRlci5wdXNoKGkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhc3luYy5tYXAoY291bnRlciwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgYXN5bmMudGltZXNTZXJpZXMgPSBmdW5jdGlvbiAoY291bnQsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgY291bnRlciA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgICAgIGNvdW50ZXIucHVzaChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXN5bmMubWFwU2VyaWVzKGNvdW50ZXIsIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLmNvbXBvc2UgPSBmdW5jdGlvbiAoLyogZnVuY3Rpb25zLi4uICovKSB7XG4gICAgICAgIHZhciBmbnMgPSBBcnJheS5wcm90b3R5cGUucmV2ZXJzZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgYXN5bmMucmVkdWNlKGZucywgYXJncywgZnVuY3Rpb24gKG5ld2FyZ3MsIGZuLCBjYikge1xuICAgICAgICAgICAgICAgIGZuLmFwcGx5KHRoYXQsIG5ld2FyZ3MuY29uY2F0KFtmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlcnIgPSBhcmd1bWVudHNbMF07XG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXh0YXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgICAgIGNiKGVyciwgbmV4dGFyZ3MpO1xuICAgICAgICAgICAgICAgIH1dKSlcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbiAoZXJyLCByZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkodGhhdCwgW2Vycl0uY29uY2F0KHJlc3VsdHMpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB2YXIgX2FwcGx5RWFjaCA9IGZ1bmN0aW9uIChlYWNoZm4sIGZucyAvKmFyZ3MuLi4qLykge1xuICAgICAgICB2YXIgZ28gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgcmV0dXJuIGVhY2hmbihmbnMsIGZ1bmN0aW9uIChmbiwgY2IpIHtcbiAgICAgICAgICAgICAgICBmbi5hcHBseSh0aGF0LCBhcmdzLmNvbmNhdChbY2JdKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2FsbGJhY2spO1xuICAgICAgICB9O1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICAgICAgICAgIHJldHVybiBnby5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBnbztcbiAgICAgICAgfVxuICAgIH07XG4gICAgYXN5bmMuYXBwbHlFYWNoID0gZG9QYXJhbGxlbChfYXBwbHlFYWNoKTtcbiAgICBhc3luYy5hcHBseUVhY2hTZXJpZXMgPSBkb1NlcmllcyhfYXBwbHlFYWNoKTtcblxuICAgIGFzeW5jLmZvcmV2ZXIgPSBmdW5jdGlvbiAoZm4sIGNhbGxiYWNrKSB7XG4gICAgICAgIGZ1bmN0aW9uIG5leHQoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmbihuZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBuZXh0KCk7XG4gICAgfTtcblxuICAgIC8vIEFNRCAvIFJlcXVpcmVKU1xuICAgIGlmICh0eXBlb2YgZGVmaW5lICE9PSAndW5kZWZpbmVkJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShbXSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGFzeW5jO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gTm9kZS5qc1xuICAgIGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gYXN5bmM7XG4gICAgfVxuICAgIC8vIGluY2x1ZGVkIGRpcmVjdGx5IHZpYSA8c2NyaXB0PiB0YWdcbiAgICBlbHNlIHtcbiAgICAgICAgcm9vdC5hc3luYyA9IGFzeW5jO1xuICAgIH1cblxufSgpKTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuIyMgY29nL2RlZmF1bHRzXG5cbmBgYGpzXG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCdjb2cvZGVmYXVsdHMnKTtcbmBgYFxuXG4jIyMgZGVmYXVsdHModGFyZ2V0LCAqKVxuXG5TaGFsbG93IGNvcHkgb2JqZWN0IHByb3BlcnRpZXMgZnJvbSB0aGUgc3VwcGxpZWQgc291cmNlIG9iamVjdHMgKCopIGludG9cbnRoZSB0YXJnZXQgb2JqZWN0LCByZXR1cm5pbmcgdGhlIHRhcmdldCBvYmplY3Qgb25jZSBjb21wbGV0ZWQuICBEbyBub3QsXG5ob3dldmVyLCBvdmVyd3JpdGUgZXhpc3Rpbmcga2V5cyB3aXRoIG5ldyB2YWx1ZXM6XG5cbmBgYGpzXG5kZWZhdWx0cyh7IGE6IDEsIGI6IDIgfSwgeyBjOiAzIH0sIHsgZDogNCB9LCB7IGI6IDUgfSkpO1xuYGBgXG5cblNlZSBhbiBleGFtcGxlIG9uIFtyZXF1aXJlYmluXShodHRwOi8vcmVxdWlyZWJpbi5jb20vP2dpc3Q9NjA3OTQ3NSkuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIGEgdGFyZ2V0XG4gIHRhcmdldCA9IHRhcmdldCB8fCB7fTtcblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHNvdXJjZXMgYW5kIGNvcHkgdG8gdGhlIHRhcmdldFxuICBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkuZm9yRWFjaChmdW5jdGlvbihzb3VyY2UpIHtcbiAgICBpZiAoISBzb3VyY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgaWYgKHRhcmdldFtwcm9wXSA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiB0YXJnZXQ7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuIyMgY29nL2V4dGVuZFxuXG5gYGBqc1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcbmBgYFxuXG4jIyMgZXh0ZW5kKHRhcmdldCwgKilcblxuU2hhbGxvdyBjb3B5IG9iamVjdCBwcm9wZXJ0aWVzIGZyb20gdGhlIHN1cHBsaWVkIHNvdXJjZSBvYmplY3RzICgqKSBpbnRvXG50aGUgdGFyZ2V0IG9iamVjdCwgcmV0dXJuaW5nIHRoZSB0YXJnZXQgb2JqZWN0IG9uY2UgY29tcGxldGVkOlxuXG5gYGBqc1xuZXh0ZW5kKHsgYTogMSwgYjogMiB9LCB7IGM6IDMgfSwgeyBkOiA0IH0sIHsgYjogNSB9KSk7XG5gYGBcblxuU2VlIGFuIGV4YW1wbGUgb24gW3JlcXVpcmViaW5dKGh0dHA6Ly9yZXF1aXJlYmluLmNvbS8/Z2lzdD02MDc5NDc1KS5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0YXJnZXQpIHtcbiAgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLmZvckVhY2goZnVuY3Rpb24oc291cmNlKSB7XG4gICAgaWYgKCEgc291cmNlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiB0YXJnZXQ7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIyBjb2cvanNvbnBhcnNlXG5cbiAgYGBganNcbiAgdmFyIGpzb25wYXJzZSA9IHJlcXVpcmUoJ2NvZy9qc29ucGFyc2UnKTtcbiAgYGBgXG5cbiAgIyMjIGpzb25wYXJzZShpbnB1dClcblxuICBUaGlzIGZ1bmN0aW9uIHdpbGwgYXR0ZW1wdCB0byBhdXRvbWF0aWNhbGx5IGRldGVjdCBzdHJpbmdpZmllZCBKU09OLCBhbmRcbiAgd2hlbiBkZXRlY3RlZCB3aWxsIHBhcnNlIGludG8gSlNPTiBvYmplY3RzLiAgVGhlIGZ1bmN0aW9uIGxvb2tzIGZvciBzdHJpbmdzXG4gIHRoYXQgbG9vayBhbmQgc21lbGwgbGlrZSBzdHJpbmdpZmllZCBKU09OLCBhbmQgaWYgZm91bmQgYXR0ZW1wdHMgdG9cbiAgYEpTT04ucGFyc2VgIHRoZSBpbnB1dCBpbnRvIGEgdmFsaWQgb2JqZWN0LlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgdmFyIGlzU3RyaW5nID0gdHlwZW9mIGlucHV0ID09ICdzdHJpbmcnIHx8IChpbnB1dCBpbnN0YW5jZW9mIFN0cmluZyk7XG4gIHZhciByZU51bWVyaWMgPSAvXlxcLT9cXGQrXFwuP1xcZCokLztcbiAgdmFyIHNob3VsZFBhcnNlIDtcbiAgdmFyIGZpcnN0Q2hhcjtcbiAgdmFyIGxhc3RDaGFyO1xuXG4gIGlmICgoISBpc1N0cmluZykgfHwgaW5wdXQubGVuZ3RoIDwgMikge1xuICAgIGlmIChpc1N0cmluZyAmJiByZU51bWVyaWMudGVzdChpbnB1dCkpIHtcbiAgICAgIHJldHVybiBwYXJzZUZsb2F0KGlucHV0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gaW5wdXQ7XG4gIH1cblxuICAvLyBjaGVjayBmb3IgdHJ1ZSBvciBmYWxzZVxuICBpZiAoaW5wdXQgPT09ICd0cnVlJyB8fCBpbnB1dCA9PT0gJ2ZhbHNlJykge1xuICAgIHJldHVybiBpbnB1dCA9PT0gJ3RydWUnO1xuICB9XG5cbiAgLy8gY2hlY2sgZm9yIG51bGxcbiAgaWYgKGlucHV0ID09PSAnbnVsbCcpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIGdldCB0aGUgZmlyc3QgYW5kIGxhc3QgY2hhcmFjdGVyc1xuICBmaXJzdENoYXIgPSBpbnB1dC5jaGFyQXQoMCk7XG4gIGxhc3RDaGFyID0gaW5wdXQuY2hhckF0KGlucHV0Lmxlbmd0aCAtIDEpO1xuXG4gIC8vIGRldGVybWluZSB3aGV0aGVyIHdlIHNob3VsZCBKU09OLnBhcnNlIHRoZSBpbnB1dFxuICBzaG91bGRQYXJzZSA9XG4gICAgKGZpcnN0Q2hhciA9PSAneycgJiYgbGFzdENoYXIgPT0gJ30nKSB8fFxuICAgIChmaXJzdENoYXIgPT0gJ1snICYmIGxhc3RDaGFyID09ICddJyk7XG5cbiAgaWYgKHNob3VsZFBhcnNlKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKGlucHV0KTtcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgIC8vIGFwcGFyZW50bHkgaXQgd2Fzbid0IHZhbGlkIGpzb24sIGNhcnJ5IG9uIHdpdGggcmVndWxhciBwcm9jZXNzaW5nXG4gICAgfVxuICB9XG5cblxuICByZXR1cm4gcmVOdW1lcmljLnRlc3QoaW5wdXQpID8gcGFyc2VGbG9hdChpbnB1dCkgOiBpbnB1dDtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMjIGNvZy9sb2dnZXJcblxuICBgYGBqc1xuICB2YXIgbG9nZ2VyID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpO1xuICBgYGBcblxuICBTaW1wbGUgYnJvd3NlciBsb2dnaW5nIG9mZmVyaW5nIHNpbWlsYXIgZnVuY3Rpb25hbGl0eSB0byB0aGVcbiAgW2RlYnVnXShodHRwczovL2dpdGh1Yi5jb20vdmlzaW9ubWVkaWEvZGVidWcpIG1vZHVsZS5cblxuICAjIyMgVXNhZ2VcblxuICBDcmVhdGUgeW91ciBzZWxmIGEgbmV3IGxvZ2dpbmcgaW5zdGFuY2UgYW5kIGdpdmUgaXQgYSBuYW1lOlxuXG4gIGBgYGpzXG4gIHZhciBkZWJ1ZyA9IGxvZ2dlcigncGhpbCcpO1xuICBgYGBcblxuICBOb3cgZG8gc29tZSBkZWJ1Z2dpbmc6XG5cbiAgYGBganNcbiAgZGVidWcoJ2hlbGxvJyk7XG4gIGBgYFxuXG4gIEF0IHRoaXMgc3RhZ2UsIG5vIGxvZyBvdXRwdXQgd2lsbCBiZSBnZW5lcmF0ZWQgYmVjYXVzZSB5b3VyIGxvZ2dlciBpc1xuICBjdXJyZW50bHkgZGlzYWJsZWQuICBFbmFibGUgaXQ6XG5cbiAgYGBganNcbiAgbG9nZ2VyLmVuYWJsZSgncGhpbCcpO1xuICBgYGBcblxuICBOb3cgZG8gc29tZSBtb3JlIGxvZ2dlcjpcblxuICBgYGBqc1xuICBkZWJ1ZygnT2ggdGhpcyBpcyBzbyBtdWNoIG5pY2VyIDopJyk7XG4gIC8vIC0tPiBwaGlsOiBPaCB0aGlzIGlzIHNvbWUgbXVjaCBuaWNlciA6KVxuICBgYGBcblxuICAjIyMgUmVmZXJlbmNlXG4qKi9cblxudmFyIGFjdGl2ZSA9IFtdO1xudmFyIHVubGVhc2hMaXN0ZW5lcnMgPSBbXTtcbnZhciB0YXJnZXRzID0gWyBjb25zb2xlIF07XG5cbi8qKlxuICAjIyMjIGxvZ2dlcihuYW1lKVxuXG4gIENyZWF0ZSBhIG5ldyBsb2dnaW5nIGluc3RhbmNlLlxuKiovXG52YXIgbG9nZ2VyID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihuYW1lKSB7XG4gIC8vIGluaXRpYWwgZW5hYmxlZCBjaGVja1xuICB2YXIgZW5hYmxlZCA9IGNoZWNrQWN0aXZlKCk7XG5cbiAgZnVuY3Rpb24gY2hlY2tBY3RpdmUoKSB7XG4gICAgcmV0dXJuIGVuYWJsZWQgPSBhY3RpdmUuaW5kZXhPZignKicpID49IDAgfHwgYWN0aXZlLmluZGV4T2YobmFtZSkgPj0gMDtcbiAgfVxuXG4gIC8vIHJlZ2lzdGVyIHRoZSBjaGVjayBhY3RpdmUgd2l0aCB0aGUgbGlzdGVuZXJzIGFycmF5XG4gIHVubGVhc2hMaXN0ZW5lcnNbdW5sZWFzaExpc3RlbmVycy5sZW5ndGhdID0gY2hlY2tBY3RpdmU7XG5cbiAgLy8gcmV0dXJuIHRoZSBhY3R1YWwgbG9nZ2luZyBmdW5jdGlvblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGEgc3RyaW5nIG1lc3NhZ2VcbiAgICBpZiAodHlwZW9mIGFyZ3NbMF0gPT0gJ3N0cmluZycgfHwgKGFyZ3NbMF0gaW5zdGFuY2VvZiBTdHJpbmcpKSB7XG4gICAgICBhcmdzWzBdID0gbmFtZSArICc6ICcgKyBhcmdzWzBdO1xuICAgIH1cblxuICAgIC8vIGlmIG5vdCBlbmFibGVkLCBiYWlsXG4gICAgaWYgKCEgZW5hYmxlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGxvZ1xuICAgIHRhcmdldHMuZm9yRWFjaChmdW5jdGlvbih0YXJnZXQpIHtcbiAgICAgIHRhcmdldC5sb2cuYXBwbHkodGFyZ2V0LCBhcmdzKTtcbiAgICB9KTtcbiAgfTtcbn07XG5cbi8qKlxuICAjIyMjIGxvZ2dlci5yZXNldCgpXG5cbiAgUmVzZXQgbG9nZ2luZyAocmVtb3ZlIHRoZSBkZWZhdWx0IGNvbnNvbGUgbG9nZ2VyLCBmbGFnIGFsbCBsb2dnZXJzIGFzXG4gIGluYWN0aXZlLCBldGMsIGV0Yy5cbioqL1xubG9nZ2VyLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gIC8vIHJlc2V0IHRhcmdldHMgYW5kIGFjdGl2ZSBzdGF0ZXNcbiAgdGFyZ2V0cyA9IFtdO1xuICBhY3RpdmUgPSBbXTtcblxuICByZXR1cm4gbG9nZ2VyLmVuYWJsZSgpO1xufTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyLnRvKHRhcmdldClcblxuICBBZGQgYSBsb2dnaW5nIHRhcmdldC4gIFRoZSBsb2dnZXIgbXVzdCBoYXZlIGEgYGxvZ2AgbWV0aG9kIGF0dGFjaGVkLlxuXG4qKi9cbmxvZ2dlci50byA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICB0YXJnZXRzID0gdGFyZ2V0cy5jb25jYXQodGFyZ2V0IHx8IFtdKTtcblxuICByZXR1cm4gbG9nZ2VyO1xufTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyLmVuYWJsZShuYW1lcyopXG5cbiAgRW5hYmxlIGxvZ2dpbmcgdmlhIHRoZSBuYW1lZCBsb2dnaW5nIGluc3RhbmNlcy4gIFRvIGVuYWJsZSBsb2dnaW5nIHZpYSBhbGxcbiAgaW5zdGFuY2VzLCB5b3UgY2FuIHBhc3MgYSB3aWxkY2FyZDpcblxuICBgYGBqc1xuICBsb2dnZXIuZW5hYmxlKCcqJyk7XG4gIGBgYFxuXG4gIF9fVE9ETzpfXyB3aWxkY2FyZCBlbmFibGVyc1xuKiovXG5sb2dnZXIuZW5hYmxlID0gZnVuY3Rpb24oKSB7XG4gIC8vIHVwZGF0ZSB0aGUgYWN0aXZlXG4gIGFjdGl2ZSA9IGFjdGl2ZS5jb25jYXQoW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcblxuICAvLyB0cmlnZ2VyIHRoZSB1bmxlYXNoIGxpc3RlbmVyc1xuICB1bmxlYXNoTGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24obGlzdGVuZXIpIHtcbiAgICBsaXN0ZW5lcigpO1xuICB9KTtcblxuICByZXR1cm4gbG9nZ2VyO1xufTsiLCIvLyBDb3B5cmlnaHQgKGMpIDIwMTMgQWRvYmUgU3lzdGVtcyBJbmNvcnBvcmF0ZWQuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4vLyBcbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vIFxuLy8gaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vLyBcbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbi8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4vLyDilIzilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilJAgXFxcXFxuLy8g4pSCIEV2ZSAwLjQuMiAtIEphdmFTY3JpcHQgRXZlbnRzIExpYnJhcnkgICAgICAgICAgICAgICAgICAgICAg4pSCIFxcXFxcbi8vIOKUnOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUpCBcXFxcXG4vLyDilIIgQXV0aG9yIERtaXRyeSBCYXJhbm92c2tpeSAoaHR0cDovL2RtaXRyeS5iYXJhbm92c2tpeS5jb20vKSDilIIgXFxcXFxuLy8g4pSU4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSYIFxcXFxcblxuKGZ1bmN0aW9uIChnbG9iKSB7XG4gICAgdmFyIHZlcnNpb24gPSBcIjAuNC4yXCIsXG4gICAgICAgIGhhcyA9IFwiaGFzT3duUHJvcGVydHlcIixcbiAgICAgICAgc2VwYXJhdG9yID0gL1tcXC5cXC9dLyxcbiAgICAgICAgd2lsZGNhcmQgPSBcIipcIixcbiAgICAgICAgZnVuID0gZnVuY3Rpb24gKCkge30sXG4gICAgICAgIG51bXNvcnQgPSBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgcmV0dXJuIGEgLSBiO1xuICAgICAgICB9LFxuICAgICAgICBjdXJyZW50X2V2ZW50LFxuICAgICAgICBzdG9wLFxuICAgICAgICBldmVudHMgPSB7bjoge319LFxuICAgIC8qXFxcbiAgICAgKiBldmVcbiAgICAgWyBtZXRob2QgXVxuXG4gICAgICogRmlyZXMgZXZlbnQgd2l0aCBnaXZlbiBgbmFtZWAsIGdpdmVuIHNjb3BlIGFuZCBvdGhlciBwYXJhbWV0ZXJzLlxuXG4gICAgID4gQXJndW1lbnRzXG5cbiAgICAgLSBuYW1lIChzdHJpbmcpIG5hbWUgb2YgdGhlICpldmVudCosIGRvdCAoYC5gKSBvciBzbGFzaCAoYC9gKSBzZXBhcmF0ZWRcbiAgICAgLSBzY29wZSAob2JqZWN0KSBjb250ZXh0IGZvciB0aGUgZXZlbnQgaGFuZGxlcnNcbiAgICAgLSB2YXJhcmdzICguLi4pIHRoZSByZXN0IG9mIGFyZ3VtZW50cyB3aWxsIGJlIHNlbnQgdG8gZXZlbnQgaGFuZGxlcnNcblxuICAgICA9IChvYmplY3QpIGFycmF5IG9mIHJldHVybmVkIHZhbHVlcyBmcm9tIHRoZSBsaXN0ZW5lcnNcbiAgICBcXCovXG4gICAgICAgIGV2ZSA9IGZ1bmN0aW9uIChuYW1lLCBzY29wZSkge1xuXHRcdFx0bmFtZSA9IFN0cmluZyhuYW1lKTtcbiAgICAgICAgICAgIHZhciBlID0gZXZlbnRzLFxuICAgICAgICAgICAgICAgIG9sZHN0b3AgPSBzdG9wLFxuICAgICAgICAgICAgICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpLFxuICAgICAgICAgICAgICAgIGxpc3RlbmVycyA9IGV2ZS5saXN0ZW5lcnMobmFtZSksXG4gICAgICAgICAgICAgICAgeiA9IDAsXG4gICAgICAgICAgICAgICAgZiA9IGZhbHNlLFxuICAgICAgICAgICAgICAgIGwsXG4gICAgICAgICAgICAgICAgaW5kZXhlZCA9IFtdLFxuICAgICAgICAgICAgICAgIHF1ZXVlID0ge30sXG4gICAgICAgICAgICAgICAgb3V0ID0gW10sXG4gICAgICAgICAgICAgICAgY2UgPSBjdXJyZW50X2V2ZW50LFxuICAgICAgICAgICAgICAgIGVycm9ycyA9IFtdO1xuICAgICAgICAgICAgY3VycmVudF9ldmVudCA9IG5hbWU7XG4gICAgICAgICAgICBzdG9wID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IGxpc3RlbmVycy5sZW5ndGg7IGkgPCBpaTsgaSsrKSBpZiAoXCJ6SW5kZXhcIiBpbiBsaXN0ZW5lcnNbaV0pIHtcbiAgICAgICAgICAgICAgICBpbmRleGVkLnB1c2gobGlzdGVuZXJzW2ldLnpJbmRleCk7XG4gICAgICAgICAgICAgICAgaWYgKGxpc3RlbmVyc1tpXS56SW5kZXggPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHF1ZXVlW2xpc3RlbmVyc1tpXS56SW5kZXhdID0gbGlzdGVuZXJzW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGluZGV4ZWQuc29ydChudW1zb3J0KTtcbiAgICAgICAgICAgIHdoaWxlIChpbmRleGVkW3pdIDwgMCkge1xuICAgICAgICAgICAgICAgIGwgPSBxdWV1ZVtpbmRleGVkW3orK11dO1xuICAgICAgICAgICAgICAgIG91dC5wdXNoKGwuYXBwbHkoc2NvcGUsIGFyZ3MpKTtcbiAgICAgICAgICAgICAgICBpZiAoc3RvcCkge1xuICAgICAgICAgICAgICAgICAgICBzdG9wID0gb2xkc3RvcDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgIGwgPSBsaXN0ZW5lcnNbaV07XG4gICAgICAgICAgICAgICAgaWYgKFwiekluZGV4XCIgaW4gbCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobC56SW5kZXggPT0gaW5kZXhlZFt6XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2gobC5hcHBseShzY29wZSwgYXJncykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0b3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB6Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbCA9IHF1ZXVlW2luZGV4ZWRbel1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGwgJiYgb3V0LnB1c2gobC5hcHBseShzY29wZSwgYXJncykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdG9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gd2hpbGUgKGwpXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWV1ZVtsLnpJbmRleF0gPSBsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2gobC5hcHBseShzY29wZSwgYXJncykpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdG9wID0gb2xkc3RvcDtcbiAgICAgICAgICAgIGN1cnJlbnRfZXZlbnQgPSBjZTtcbiAgICAgICAgICAgIHJldHVybiBvdXQubGVuZ3RoID8gb3V0IDogbnVsbDtcbiAgICAgICAgfTtcblx0XHQvLyBVbmRvY3VtZW50ZWQuIERlYnVnIG9ubHkuXG5cdFx0ZXZlLl9ldmVudHMgPSBldmVudHM7XG4gICAgLypcXFxuICAgICAqIGV2ZS5saXN0ZW5lcnNcbiAgICAgWyBtZXRob2QgXVxuXG4gICAgICogSW50ZXJuYWwgbWV0aG9kIHdoaWNoIGdpdmVzIHlvdSBhcnJheSBvZiBhbGwgZXZlbnQgaGFuZGxlcnMgdGhhdCB3aWxsIGJlIHRyaWdnZXJlZCBieSB0aGUgZ2l2ZW4gYG5hbWVgLlxuXG4gICAgID4gQXJndW1lbnRzXG5cbiAgICAgLSBuYW1lIChzdHJpbmcpIG5hbWUgb2YgdGhlIGV2ZW50LCBkb3QgKGAuYCkgb3Igc2xhc2ggKGAvYCkgc2VwYXJhdGVkXG5cbiAgICAgPSAoYXJyYXkpIGFycmF5IG9mIGV2ZW50IGhhbmRsZXJzXG4gICAgXFwqL1xuICAgIGV2ZS5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KHNlcGFyYXRvciksXG4gICAgICAgICAgICBlID0gZXZlbnRzLFxuICAgICAgICAgICAgaXRlbSxcbiAgICAgICAgICAgIGl0ZW1zLFxuICAgICAgICAgICAgayxcbiAgICAgICAgICAgIGksXG4gICAgICAgICAgICBpaSxcbiAgICAgICAgICAgIGosXG4gICAgICAgICAgICBqaixcbiAgICAgICAgICAgIG5lcyxcbiAgICAgICAgICAgIGVzID0gW2VdLFxuICAgICAgICAgICAgb3V0ID0gW107XG4gICAgICAgIGZvciAoaSA9IDAsIGlpID0gbmFtZXMubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgbmVzID0gW107XG4gICAgICAgICAgICBmb3IgKGogPSAwLCBqaiA9IGVzLmxlbmd0aDsgaiA8IGpqOyBqKyspIHtcbiAgICAgICAgICAgICAgICBlID0gZXNbal0ubjtcbiAgICAgICAgICAgICAgICBpdGVtcyA9IFtlW25hbWVzW2ldXSwgZVt3aWxkY2FyZF1dO1xuICAgICAgICAgICAgICAgIGsgPSAyO1xuICAgICAgICAgICAgICAgIHdoaWxlIChrLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbSA9IGl0ZW1zW2tdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmVzLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQgPSBvdXQuY29uY2F0KGl0ZW0uZiB8fCBbXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlcyA9IG5lcztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH07XG4gICAgXG4gICAgLypcXFxuICAgICAqIGV2ZS5vblxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogQmluZHMgZ2l2ZW4gZXZlbnQgaGFuZGxlciB3aXRoIGEgZ2l2ZW4gbmFtZS4gWW91IGNhbiB1c2Ugd2lsZGNhcmRzIOKAnGAqYOKAnSBmb3IgdGhlIG5hbWVzOlxuICAgICB8IGV2ZS5vbihcIioudW5kZXIuKlwiLCBmKTtcbiAgICAgfCBldmUoXCJtb3VzZS51bmRlci5mbG9vclwiKTsgLy8gdHJpZ2dlcnMgZlxuICAgICAqIFVzZSBAZXZlIHRvIHRyaWdnZXIgdGhlIGxpc3RlbmVyLlxuICAgICAqKlxuICAgICA+IEFyZ3VtZW50c1xuICAgICAqKlxuICAgICAtIG5hbWUgKHN0cmluZykgbmFtZSBvZiB0aGUgZXZlbnQsIGRvdCAoYC5gKSBvciBzbGFzaCAoYC9gKSBzZXBhcmF0ZWQsIHdpdGggb3B0aW9uYWwgd2lsZGNhcmRzXG4gICAgIC0gZiAoZnVuY3Rpb24pIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb25cbiAgICAgKipcbiAgICAgPSAoZnVuY3Rpb24pIHJldHVybmVkIGZ1bmN0aW9uIGFjY2VwdHMgYSBzaW5nbGUgbnVtZXJpYyBwYXJhbWV0ZXIgdGhhdCByZXByZXNlbnRzIHotaW5kZXggb2YgdGhlIGhhbmRsZXIuIEl0IGlzIGFuIG9wdGlvbmFsIGZlYXR1cmUgYW5kIG9ubHkgdXNlZCB3aGVuIHlvdSBuZWVkIHRvIGVuc3VyZSB0aGF0IHNvbWUgc3Vic2V0IG9mIGhhbmRsZXJzIHdpbGwgYmUgaW52b2tlZCBpbiBhIGdpdmVuIG9yZGVyLCBkZXNwaXRlIG9mIHRoZSBvcmRlciBvZiBhc3NpZ25tZW50LiBcbiAgICAgPiBFeGFtcGxlOlxuICAgICB8IGV2ZS5vbihcIm1vdXNlXCIsIGVhdEl0KSgyKTtcbiAgICAgfCBldmUub24oXCJtb3VzZVwiLCBzY3JlYW0pO1xuICAgICB8IGV2ZS5vbihcIm1vdXNlXCIsIGNhdGNoSXQpKDEpO1xuICAgICAqIFRoaXMgd2lsbCBlbnN1cmUgdGhhdCBgY2F0Y2hJdCgpYCBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCBiZWZvcmUgYGVhdEl0KClgLlxuXHQgKlxuICAgICAqIElmIHlvdSB3YW50IHRvIHB1dCB5b3VyIGhhbmRsZXIgYmVmb3JlIG5vbi1pbmRleGVkIGhhbmRsZXJzLCBzcGVjaWZ5IGEgbmVnYXRpdmUgdmFsdWUuXG4gICAgICogTm90ZTogSSBhc3N1bWUgbW9zdCBvZiB0aGUgdGltZSB5b3UgZG9u4oCZdCBuZWVkIHRvIHdvcnJ5IGFib3V0IHotaW5kZXgsIGJ1dCBpdOKAmXMgbmljZSB0byBoYXZlIHRoaXMgZmVhdHVyZSDigJxqdXN0IGluIGNhc2XigJ0uXG4gICAgXFwqL1xuICAgIGV2ZS5vbiA9IGZ1bmN0aW9uIChuYW1lLCBmKSB7XG5cdFx0bmFtZSA9IFN0cmluZyhuYW1lKTtcblx0XHRpZiAodHlwZW9mIGYgIT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge307XG5cdFx0fVxuICAgICAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KHNlcGFyYXRvciksXG4gICAgICAgICAgICBlID0gZXZlbnRzO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBuYW1lcy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICBlID0gZS5uO1xuICAgICAgICAgICAgZSA9IGUuaGFzT3duUHJvcGVydHkobmFtZXNbaV0pICYmIGVbbmFtZXNbaV1dIHx8IChlW25hbWVzW2ldXSA9IHtuOiB7fX0pO1xuICAgICAgICB9XG4gICAgICAgIGUuZiA9IGUuZiB8fCBbXTtcbiAgICAgICAgZm9yIChpID0gMCwgaWkgPSBlLmYubGVuZ3RoOyBpIDwgaWk7IGkrKykgaWYgKGUuZltpXSA9PSBmKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuO1xuICAgICAgICB9XG4gICAgICAgIGUuZi5wdXNoKGYpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHpJbmRleCkge1xuICAgICAgICAgICAgaWYgKCt6SW5kZXggPT0gK3pJbmRleCkge1xuICAgICAgICAgICAgICAgIGYuekluZGV4ID0gK3pJbmRleDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBldmUuZlxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogUmV0dXJucyBmdW5jdGlvbiB0aGF0IHdpbGwgZmlyZSBnaXZlbiBldmVudCB3aXRoIG9wdGlvbmFsIGFyZ3VtZW50cy5cblx0ICogQXJndW1lbnRzIHRoYXQgd2lsbCBiZSBwYXNzZWQgdG8gdGhlIHJlc3VsdCBmdW5jdGlvbiB3aWxsIGJlIGFsc29cblx0ICogY29uY2F0ZWQgdG8gdGhlIGxpc3Qgb2YgZmluYWwgYXJndW1lbnRzLlxuIFx0IHwgZWwub25jbGljayA9IGV2ZS5mKFwiY2xpY2tcIiwgMSwgMik7XG4gXHQgfCBldmUub24oXCJjbGlja1wiLCBmdW5jdGlvbiAoYSwgYiwgYykge1xuIFx0IHwgICAgIGNvbnNvbGUubG9nKGEsIGIsIGMpOyAvLyAxLCAyLCBbZXZlbnQgb2JqZWN0XVxuIFx0IHwgfSk7XG4gICAgID4gQXJndW1lbnRzXG5cdCAtIGV2ZW50IChzdHJpbmcpIGV2ZW50IG5hbWVcblx0IC0gdmFyYXJncyAo4oCmKSBhbmQgYW55IG90aGVyIGFyZ3VtZW50c1xuXHQgPSAoZnVuY3Rpb24pIHBvc3NpYmxlIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb25cbiAgICBcXCovXG5cdGV2ZS5mID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0dmFyIGF0dHJzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXHRcdHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRldmUuYXBwbHkobnVsbCwgW2V2ZW50LCBudWxsXS5jb25jYXQoYXR0cnMpLmNvbmNhdChbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpKTtcblx0XHR9O1xuXHR9O1xuICAgIC8qXFxcbiAgICAgKiBldmUuc3RvcFxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogSXMgdXNlZCBpbnNpZGUgYW4gZXZlbnQgaGFuZGxlciB0byBzdG9wIHRoZSBldmVudCwgcHJldmVudGluZyBhbnkgc3Vic2VxdWVudCBsaXN0ZW5lcnMgZnJvbSBmaXJpbmcuXG4gICAgXFwqL1xuICAgIGV2ZS5zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBzdG9wID0gMTtcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBldmUubnRcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIENvdWxkIGJlIHVzZWQgaW5zaWRlIGV2ZW50IGhhbmRsZXIgdG8gZmlndXJlIG91dCBhY3R1YWwgbmFtZSBvZiB0aGUgZXZlbnQuXG4gICAgICoqXG4gICAgID4gQXJndW1lbnRzXG4gICAgICoqXG4gICAgIC0gc3VibmFtZSAoc3RyaW5nKSAjb3B0aW9uYWwgc3VibmFtZSBvZiB0aGUgZXZlbnRcbiAgICAgKipcbiAgICAgPSAoc3RyaW5nKSBuYW1lIG9mIHRoZSBldmVudCwgaWYgYHN1Ym5hbWVgIGlzIG5vdCBzcGVjaWZpZWRcbiAgICAgKiBvclxuICAgICA9IChib29sZWFuKSBgdHJ1ZWAsIGlmIGN1cnJlbnQgZXZlbnTigJlzIG5hbWUgY29udGFpbnMgYHN1Ym5hbWVgXG4gICAgXFwqL1xuICAgIGV2ZS5udCA9IGZ1bmN0aW9uIChzdWJuYW1lKSB7XG4gICAgICAgIGlmIChzdWJuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFJlZ0V4cChcIig/OlxcXFwufFxcXFwvfF4pXCIgKyBzdWJuYW1lICsgXCIoPzpcXFxcLnxcXFxcL3wkKVwiKS50ZXN0KGN1cnJlbnRfZXZlbnQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJyZW50X2V2ZW50O1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIGV2ZS5udHNcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIENvdWxkIGJlIHVzZWQgaW5zaWRlIGV2ZW50IGhhbmRsZXIgdG8gZmlndXJlIG91dCBhY3R1YWwgbmFtZSBvZiB0aGUgZXZlbnQuXG4gICAgICoqXG4gICAgICoqXG4gICAgID0gKGFycmF5KSBuYW1lcyBvZiB0aGUgZXZlbnRcbiAgICBcXCovXG4gICAgZXZlLm50cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGN1cnJlbnRfZXZlbnQuc3BsaXQoc2VwYXJhdG9yKTtcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBldmUub2ZmXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSZW1vdmVzIGdpdmVuIGZ1bmN0aW9uIGZyb20gdGhlIGxpc3Qgb2YgZXZlbnQgbGlzdGVuZXJzIGFzc2lnbmVkIHRvIGdpdmVuIG5hbWUuXG5cdCAqIElmIG5vIGFyZ3VtZW50cyBzcGVjaWZpZWQgYWxsIHRoZSBldmVudHMgd2lsbCBiZSBjbGVhcmVkLlxuICAgICAqKlxuICAgICA+IEFyZ3VtZW50c1xuICAgICAqKlxuICAgICAtIG5hbWUgKHN0cmluZykgbmFtZSBvZiB0aGUgZXZlbnQsIGRvdCAoYC5gKSBvciBzbGFzaCAoYC9gKSBzZXBhcmF0ZWQsIHdpdGggb3B0aW9uYWwgd2lsZGNhcmRzXG4gICAgIC0gZiAoZnVuY3Rpb24pIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb25cbiAgICBcXCovXG4gICAgLypcXFxuICAgICAqIGV2ZS51bmJpbmRcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFNlZSBAZXZlLm9mZlxuICAgIFxcKi9cbiAgICBldmUub2ZmID0gZXZlLnVuYmluZCA9IGZ1bmN0aW9uIChuYW1lLCBmKSB7XG5cdFx0aWYgKCFuYW1lKSB7XG5cdFx0ICAgIGV2ZS5fZXZlbnRzID0gZXZlbnRzID0ge246IHt9fTtcblx0XHRcdHJldHVybjtcblx0XHR9XG4gICAgICAgIHZhciBuYW1lcyA9IG5hbWUuc3BsaXQoc2VwYXJhdG9yKSxcbiAgICAgICAgICAgIGUsXG4gICAgICAgICAgICBrZXksXG4gICAgICAgICAgICBzcGxpY2UsXG4gICAgICAgICAgICBpLCBpaSwgaiwgamosXG4gICAgICAgICAgICBjdXIgPSBbZXZlbnRzXTtcbiAgICAgICAgZm9yIChpID0gMCwgaWkgPSBuYW1lcy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgY3VyLmxlbmd0aDsgaiArPSBzcGxpY2UubGVuZ3RoIC0gMikge1xuICAgICAgICAgICAgICAgIHNwbGljZSA9IFtqLCAxXTtcbiAgICAgICAgICAgICAgICBlID0gY3VyW2pdLm47XG4gICAgICAgICAgICAgICAgaWYgKG5hbWVzW2ldICE9IHdpbGRjYXJkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlW25hbWVzW2ldXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3BsaWNlLnB1c2goZVtuYW1lc1tpXV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChrZXkgaW4gZSkgaWYgKGVbaGFzXShrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzcGxpY2UucHVzaChlW2tleV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1ci5zcGxpY2UuYXBwbHkoY3VyLCBzcGxpY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIGlpID0gY3VyLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgIGUgPSBjdXJbaV07XG4gICAgICAgICAgICB3aGlsZSAoZS5uKSB7XG4gICAgICAgICAgICAgICAgaWYgKGYpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUuZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChqID0gMCwgamogPSBlLmYubGVuZ3RoOyBqIDwgamo7IGorKykgaWYgKGUuZltqXSA9PSBmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5mLnNwbGljZShqLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICFlLmYubGVuZ3RoICYmIGRlbGV0ZSBlLmY7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZm9yIChrZXkgaW4gZS5uKSBpZiAoZS5uW2hhc10oa2V5KSAmJiBlLm5ba2V5XS5mKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZnVuY3MgPSBlLm5ba2V5XS5mO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChqID0gMCwgamogPSBmdW5jcy5sZW5ndGg7IGogPCBqajsgaisrKSBpZiAoZnVuY3Nbal0gPT0gZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmNzLnNwbGljZShqLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICFmdW5jcy5sZW5ndGggJiYgZGVsZXRlIGUubltrZXldLmY7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgZS5mO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGtleSBpbiBlLm4pIGlmIChlLm5baGFzXShrZXkpICYmIGUubltrZXldLmYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBlLm5ba2V5XS5mO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGUgPSBlLm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBldmUub25jZVxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogQmluZHMgZ2l2ZW4gZXZlbnQgaGFuZGxlciB3aXRoIGEgZ2l2ZW4gbmFtZSB0byBvbmx5IHJ1biBvbmNlIHRoZW4gdW5iaW5kIGl0c2VsZi5cbiAgICAgfCBldmUub25jZShcImxvZ2luXCIsIGYpO1xuICAgICB8IGV2ZShcImxvZ2luXCIpOyAvLyB0cmlnZ2VycyBmXG4gICAgIHwgZXZlKFwibG9naW5cIik7IC8vIG5vIGxpc3RlbmVyc1xuICAgICAqIFVzZSBAZXZlIHRvIHRyaWdnZXIgdGhlIGxpc3RlbmVyLlxuICAgICAqKlxuICAgICA+IEFyZ3VtZW50c1xuICAgICAqKlxuICAgICAtIG5hbWUgKHN0cmluZykgbmFtZSBvZiB0aGUgZXZlbnQsIGRvdCAoYC5gKSBvciBzbGFzaCAoYC9gKSBzZXBhcmF0ZWQsIHdpdGggb3B0aW9uYWwgd2lsZGNhcmRzXG4gICAgIC0gZiAoZnVuY3Rpb24pIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb25cbiAgICAgKipcbiAgICAgPSAoZnVuY3Rpb24pIHNhbWUgcmV0dXJuIGZ1bmN0aW9uIGFzIEBldmUub25cbiAgICBcXCovXG4gICAgZXZlLm9uY2UgPSBmdW5jdGlvbiAobmFtZSwgZikge1xuICAgICAgICB2YXIgZjIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBldmUudW5iaW5kKG5hbWUsIGYyKTtcbiAgICAgICAgICAgIHJldHVybiBmLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBldmUub24obmFtZSwgZjIpO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIGV2ZS52ZXJzaW9uXG4gICAgIFsgcHJvcGVydHkgKHN0cmluZykgXVxuICAgICAqKlxuICAgICAqIEN1cnJlbnQgdmVyc2lvbiBvZiB0aGUgbGlicmFyeS5cbiAgICBcXCovXG4gICAgZXZlLnZlcnNpb24gPSB2ZXJzaW9uO1xuICAgIGV2ZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIFwiWW91IGFyZSBydW5uaW5nIEV2ZSBcIiArIHZlcnNpb247XG4gICAgfTtcbiAgICAodHlwZW9mIG1vZHVsZSAhPSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZS5leHBvcnRzKSA/IChtb2R1bGUuZXhwb3J0cyA9IGV2ZSkgOiAodHlwZW9mIGRlZmluZSAhPSBcInVuZGVmaW5lZFwiID8gKGRlZmluZShcImV2ZVwiLCBbXSwgZnVuY3Rpb24oKSB7IHJldHVybiBldmU7IH0pKSA6IChnbG9iLmV2ZSA9IGV2ZSkpO1xufSkodGhpcyk7XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcXNhID0gcmVxdWlyZSgnLi9xc2EnKTtcbnZhciByZUJvb2wgPSAvXih0cnVlfGZhbHNlKSQvaVxuXG4vKipcbiAgIyMjIG1ldGEocmVnZXg/KVxuXG4gIEZpbmQgYWxsIHRoZSBgPG1ldGE+YCB0YWdzIHRoYXQgaGF2ZSBhIG5hbWUgYXR0cmlidXRlIGFuZCBjb2xsYXRlIGFzIGFcbiAgc2ltcGxlIEpTIG9iamVjdHMgd2hldGhlciB0aGUgY29udGVudCBvZiB0aGUgdGFnIGlzIHRoZSB2YWx1ZS5cblxuICA8PDwgZXhhbXBsZXMvbWV0YS5qc1xuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocmVnZXgpIHtcbiAgdmFyIGRhdGEgPSB7fTtcblxuICAvLyBmaW5kIGFsbCB0aGUgbWV0YSB0YWdzIHdpdGggYSBuYW1lIGFuZCBleHRyYWN0IHRoZSBjb250ZW50XG4gIHFzYSgnbWV0YVtuYW1lXScpLmZvckVhY2goZnVuY3Rpb24odGFnKSB7XG4gICAgdmFyIG5hbWUgPSB0YWcuZ2V0QXR0cmlidXRlKCduYW1lJyk7XG4gICAgdmFyIG1hdGNoID0gcmVnZXggPyByZWdleC5leGVjKG5hbWUpIDogW25hbWUsIG5hbWVdO1xuXG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBkYXRhW21hdGNoWzFdIHx8IG1hdGNoWzBdXSA9IGNvZXJjZSh0YWcuZ2V0QXR0cmlidXRlKCdjb250ZW50JykgfHwgJycpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGRhdGE7XG59O1xuXG5mdW5jdGlvbiBjb2VyY2UodmFsdWUpIHtcbiAgdmFsdWUgPSBwYXJzZUZsb2F0KHZhbHVlKSB8fCB2YWx1ZTtcblxuICBpZiAocmVCb29sLnRlc3QodmFsdWUpKSB7XG4gICAgdmFsdWUgPSB2YWx1ZSA9PSAndHJ1ZSc7XG4gIH1cblxuICByZXR1cm4gdmFsdWU7XG59IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMjIyBvblxuXG4gIGBgYFxuICBmKG5hbWUsID0+IGVsLCA9PiBjYilcbiAgYGBgXG5cbiAgVGhlIGBvbmAgaGVscGVyIGFzc2lzdHMgd2l0aCB3b3JraW5nIHdpdGggRE9NIGV2ZW50cyBhbmQgYmVpbmcgYWJsZSB0byBtYXBcbiAgdGhvc2UgdG8gYSBub2RlIGNhbGxiYWNrIHN0eWxlIGZ1bmN0aW9uIGluIHRoZSBmb3JtOlxuXG4gIGBgYGpzXG4gIGZ1bmN0aW9uKGVyciwgZXZ0KSB7XG4gIH1cbiAgYGBgXG5cbiAgV2hlbiB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkIGJ5IHRoZSBgZWxgIHRoZSBjYWxsYmFjayBpcyBmaXJlZCBwYXNzaW5nXG4gIGEgbnVsbCB2YWx1ZSB0byB0aGUgYGVycmAgYXJndW1lbnQuXG5cbiAgPDw8IGV4YW1wbGVzL29uLmpzXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obmFtZSwgZWwsIGNhbGxiYWNrKSB7XG4gIGZ1bmN0aW9uIGJpbmQodCwgdHJpZ2dlcikge1xuICAgIHZhciBidWZmZXJlZCA9IFtdO1xuXG4gICAgZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZ0KSB7XG4gICAgICBpZiAodHlwZW9mIHRyaWdnZXIgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gdHJpZ2dlcihudWxsLCBldnQpO1xuICAgICAgfVxuXG4gICAgICAvLyBvdGhlcndpc2UsIGJ1ZmZlciB0aGUgZXZlbnRcbiAgICAgIGJ1ZmZlcmVkW2J1ZmZlcmVkLmxlbmd0aF0gPSBldnQ7XG4gICAgfVxuXG4gICAgLy8gbGlzdGVuIGZvciBldmVudHNcbiAgICB0LmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgaGFuZGxlRXZlbnQpO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSBiZWVuIHByb3ZpZGVkIGEgdHJpZ2dlciBmdW5jdGlvbiAobm90IGFuIGFycmF5IGluZGV4KVxuICAgIC8vIHRoZW4gcmV0dXJuIHRoZSBoYW5kbGUgZXZlbnQgY2FsbFxuICAgIHJldHVybiB0eXBlb2YgdHJpZ2dlciA9PSAnZnVuY3Rpb24nID8gaGFuZGxlRXZlbnQgOiBmdW5jdGlvbihjYikge1xuICAgICAgdHJpZ2dlciA9IGNiO1xuXG4gICAgICAvLyBpZiB3ZSBoYXZlIGEgYnVmZmVyZWQgcmVzdWx0cywgdHJpZ2dlciB0aG9zZSBub3dcbiAgICAgIGlmIChidWZmZXJlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgIGJ1ZmZlcmVkLnNwbGljZSgwKS5mb3JFYWNoKGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgIGNiKG51bGwsIGV2dCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICByZXR1cm4gZWwgPyBiaW5kKGVsLCBjYWxsYmFjaykgOiBiaW5kO1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIGRvY3VtZW50OiBmYWxzZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2xhc3NTZWxlY3RvclJFID0gL15cXC4oW1xcd1xcLV0rKSQvO1xudmFyIGlkU2VsZWN0b3JSRSA9IC9eIyhbXFx3XFwtXSspJC87XG52YXIgdGFnU2VsZWN0b3JSRSA9IC9eW1xcd1xcLV0rJC87XG5cbi8qKlxuICAjIyMgcXNhKHNlbGVjdG9yLCBzY29wZT8pXG5cbiAgVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIGdldCB0aGUgcmVzdWx0cyBvZiB0aGUgcXVlcnlTZWxlY3RvckFsbCBvdXRwdXRcbiAgaW4gdGhlIGZhc3Rlc3QgcG9zc2libGUgd2F5LiAgVGhpcyBjb2RlIGlzIHZlcnkgbXVjaCBiYXNlZCBvbiB0aGVcbiAgaW1wbGVtZW50YXRpb24gaW5cbiAgW3plcHRvXShodHRwczovL2dpdGh1Yi5jb20vbWFkcm9iYnkvemVwdG8vYmxvYi9tYXN0ZXIvc3JjL3plcHRvLmpzI0wxMDQpLFxuICBidXQgcGVyaGFwcyBub3QgcXVpdGUgYXMgdGVyc2UuXG5cbiAgPDw8IGV4YW1wbGVzL3FzYS5qc1xuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2VsZWN0b3IsIHNjb3BlKSB7XG4gIHZhciBpZFNlYXJjaDtcblxuICAvLyBkZWZhdWx0IHRoZSBlbGVtZW50IHRvIHRoZSBkb2N1bWVudFxuICBzY29wZSA9IHNjb3BlIHx8IGRvY3VtZW50O1xuXG4gIC8vIGRldGVybWluZSB3aGV0aGVyIHdlIGFyZSBkb2luZyBhbiBpZCBzZWFyY2ggb3Igbm90XG4gIGlkU2VhcmNoID0gc2NvcGUgPT09IGRvY3VtZW50ICYmIGlkU2VsZWN0b3JSRS50ZXN0KHNlbGVjdG9yKTtcblxuICAvLyBwZXJmb3JtIHRoZSBzZWFyY2hcbiAgcmV0dXJuIGlkU2VhcmNoID9cbiAgICAvLyB3ZSBhcmUgZG9pbmcgYW4gaWQgc2VhcmNoLCByZXR1cm4gdGhlIGVsZW1lbnQgc2VhcmNoIGluIGFuIGFycmF5XG4gICAgW3Njb3BlLmdldEVsZW1lbnRCeUlkKFJlZ0V4cC4kMSldIDpcbiAgICAvLyBub3QgYW4gaWQgc2VhcmNoLCBjYWxsIHRoZSBhcHByb3ByaWF0ZSBzZWxlY3RvclxuICAgIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKFxuICAgICAgICBjbGFzc1NlbGVjdG9yUkUudGVzdChzZWxlY3RvcikgP1xuICAgICAgICAgIHNjb3BlLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoUmVnRXhwLiQxKSA6XG4gICAgICAgICAgICB0YWdTZWxlY3RvclJFLnRlc3Qoc2VsZWN0b3IpID9cbiAgICAgICAgICAgICAgc2NvcGUuZ2V0RWxlbWVudHNCeVRhZ05hbWUoc2VsZWN0b3IpIDpcbiAgICAgICAgICAgICAgc2NvcGUucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcilcbiAgICApO1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVTZXBhcmF0b3IgPSAvW1xcLFxcc11cXHMqLztcbnZhciBvZmZGbGFncyA9IFsnZmFsc2UnLCAnbm9uZScsICdvZmYnXTtcblxuXG4vKipcbiAgIyBydGMtY2FwdHVyZWNvbmZpZ1xuXG4gIFRoaXMgaXMgYSBzaW1wbGUgcGFyc2VyIHRoYXQgdGFrZXMgYSBzdHJpbmcgb2YgdGV4dCBhbmQgZGV0ZXJtaW5lcyB3aGF0XG4gIHRoYXQgbWVhbnMgaW4gdGhlIGNvbnRleHQgb2YgV2ViUlRDLlxuXG4gICMjIFdoeT9cblxuICBJdCBwcm92aWRlcyBhIHNpbXBsZSwgdGV4dHVhbCB3YXkgb2YgZGVzY3JpYmluZyB5b3VyIHJlcXVpcmVtZW50cyBmb3JcbiAgbWVkaWEgY2FwdHVyZS4gIFRyeWluZyB0byByZW1lbWJlciB0aGUgc3RydWN0dXJlIG9mIHRoZSBjb25zdHJhaW50cyBvYmplY3RcbiAgaXMgcGFpbmZ1bC5cblxuICAjIyBIb3dcblxuICBBIHNpbXBsZSB0ZXh0IHN0cmluZyBpcyBjb252ZXJ0ZWQgdG8gYW4gaW50ZXJtZWRpYXRlIEpTIG9iamVjdFxuICByZXByZXNlbnRhdGlvbiwgd2hpY2ggY2FuIHRoZW4gYmUgY29udmVydGVkIHRvIGEgZ2V0VXNlck1lZGlhIGNvbnN0cmFpbnRzXG4gIGRhdGEgc3RydWN0dXJlIHVzaW5nIGEgYHRvQ29uc3RyYWludHMoKWAgY2FsbC5cblxuICBGb3IgZXhhbXBsZSwgdGhlIGZvbGxvd2luZyB0ZXh0IGlucHV0OlxuXG4gIGBgYFxuICBjYW1lcmEgbWluOjEyODB4NzIwIG1heDoxMjgweDcyMCBtaW46MTVmcHMgbWF4OjI1ZnBzXG4gIGBgYFxuXG4gIElzIGNvbnZlcnRlZCBpbnRvIGFuIGludGVybWVkaWEgcmVwcmVzZW50YXRpb24gKHZpYSB0aGUgYENhcHR1cmVDb25maWdgXG4gIHV0aWxpdHkgY2xhc3MpIHRoYXQgbG9va3MgbGlrZSB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGpzXG4gIHtcbiAgICBjYW1lcmE6IDAsXG4gICAgbWljcm9waG9uZTogMCxcbiAgICByZXM6IHtcbiAgICAgIG1pbjogeyB3OiAxMjgwLCBoOiA3MjAgfSxcbiAgICAgIG1heDogeyB3OiAxMjgwLCBoOiA3MjAgfVxuICAgIH0sXG5cbiAgICBmcHM6IHtcbiAgICAgIG1pbjogMTUsXG4gICAgICBtYXg6IDI1XG4gICAgfVxuICB9XG4gIGBgYFxuXG4gIFdoaWNoIGluIHR1cm4gaXMgY29udmVydGVkIGludG8gdGhlIGZvbGxvd2luZyBtZWRpYSBjb25zdHJhaW50cyBmb3JcbiAgYSBnZXRVc2VyTWVkaWEgY2FsbDpcblxuICBgYGBqc1xuICB7XG4gICAgYXVkaW86IHRydWUsXG4gICAgdmlkZW86IHtcbiAgICAgIG1hbmRhdG9yeToge1xuICAgICAgICBtaW5GcmFtZVJhdGU6IDE1LFxuICAgICAgICBtYXhGcmFtZVJhdGU6IDI1LFxuXG4gICAgICAgIG1pbldpZHRoOiAxMjgwLFxuICAgICAgICBtaW5IZWlnaHQ6IDcyMCxcbiAgICAgICAgbWF4V2lkdGg6IDEyODAsXG4gICAgICAgIG1heEhlaWdodDogNzIwXG4gICAgICB9LFxuXG4gICAgICBvcHRpb25hbDogW11cbiAgICB9XG4gIH1cbiAgYGBgXG5cbiAgIyMjIEV4cGVyaW1lbnRhbDogVGFyZ2V0ZWQgRGV2aWNlIENhcHR1cmVcblxuICBXaGlsZSB0aGUgYHJ0Yy1jYXB0dXJlY29uZmlnYCBtb2R1bGUgaXRzZWxmIGRvZXNuJ3QgY29udGFpbiBhbnkgbWVkaWFcbiAgaWRlbnRpZmljYXRpb24gbG9naWMsIGl0IGlzIGFibGUgdG8gdGhlIHNvdXJjZXMgaW5mb3JtYXRpb24gZnJvbSBhXG4gIGBNZWRpYVN0cmVhbVRyYWNrLmdldFNvdXJjZXNgIGNhbGwgdG8gZ2VuZXJhdGUgZGV2aWNlIHRhcmdldGVkIGNvbnN0cmFpbnRzLlxuXG4gIEZvciBpbnN0YW5jZSwgdGhlIGZvbGxvd2luZyBleGFtcGxlIGRlbW9uc3RyYXRlcyBob3cgd2UgY2FuIHJlcXVlc3RcbiAgYGNhbWVyYToxYCAodGhlIDJuZCB2aWRlbyBkZXZpY2Ugb24gb3VyIGxvY2FsIG1hY2hpbmUpIHdoZW4gd2UgYXJlIG1ha2luZ1xuICBhIGdldFVzZXJNZWRpYSBjYWxsOlxuXG4gIDw8PCBleGFtcGxlcy9jYW1lcmEtdHdvLmpzXG5cbiAgSXQncyB3b3J0aCBub3RpbmcgdGhhdCBpZiB0aGUgcmVxdWVzdGVkIGRldmljZSBkb2VzIG5vdCBleGlzdCBvbiB0aGVcbiAgbWFjaGluZSAoaW4gdGhlIGNhc2UgYWJvdmUsIGlmIHlvdXIgbWFjaGluZSBvbmx5IGhhcyBhIHNpbmdsZSB3ZWJjYW0gLSBhc1xuICBpcyBjb21tb24pIHRoZW4gbm8gZGV2aWNlIHNlbGVjdGlvbiBjb25zdHJhaW50cyB3aWxsIGJlIGdlbmVyYXRlZCAoaS5lLlxuICB0aGUgc3RhbmRhcmQgYHsgdmlkZW86IHRydWUsIGF1ZGlvOiB0cnVlIH1gIGNvbnN0cmFpbnRzIHdpbGwgYmUgcmV0dXJuZWRcbiAgZnJvbSB0aGUgYHRvQ29uc3RyYWludHNgIGNhbGwpLlxuXG4gICMjIyBFeHBlcmltZW50YWw6IFNjcmVlbiBDYXB0dXJlXG5cbiAgSWYgeW91IGFyZSB3b3JraW5nIHdpdGggY2hyb21lIGFuZCBzZXJ2aW5nIGNvbnRlbnQgb2YgYSBIVFRQUyBjb25uZWN0aW9uLFxuICB0aGVuIHlvdSB3aWxsIGJlIGFibGUgdG8gZXhwZXJpbWVudCB3aXRoIGV4cGVyaW1lbnRhbCBnZXRVc2VyTWVkaWEgc2NyZWVuXG4gIGNhcHR1cmUuXG5cbiAgSW4gdGhlIHNpbXBsZXN0IGNhc2UsIHNjcmVlbiBjYXB0dXJlIGNhbiBiZSBpbnZva2VkIGJ5IHVzaW5nIHRoZSBjYXB0dXJlXG4gIHN0cmluZyBvZjpcblxuICBgYGBcbiAgc2NyZWVuXG4gIGBgYFxuXG4gIFdoaWNoIGdlbmVyYXRlcyB0aGUgZm9sbG93aW5nIGNvbnRyYWludHM6XG5cbiAgYGBganNcbiAge1xuICAgIGF1ZGlvOiBmYWxzZSxcbiAgICB2aWRlbzoge1xuICAgICAgbWFuZGF0b3J5OiB7XG4gICAgICAgIGNocm9tZU1lZGlhU291cmNlOiAnc2NyZWVuJ1xuICAgICAgfSxcblxuICAgICAgb3B0aW9uYWw6IFtdXG4gICAgfVxuICB9XG4gIGBgYFxuXG4gICMjIFJlZmVyZW5jZVxuXG4qKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpbnB1dCkge1xuICAvLyBjcmVhdGUgYSBuZXcgY29uZmlndXJhdGlvbiBvYmplY3QgdXNpbmcgZGVmYXVsdHNcbiAgdmFyIGNvbmZpZyA9IG5ldyBDYXB0dXJlQ29uZmlnKCk7XG5cbiAgLy8gcHJvY2VzcyBlYWNoIG9mIHRoZSBkaXJlY3RpdmVzXG4gIChpbnB1dCB8fCAnJykuc3BsaXQocmVTZXBhcmF0b3IpLmZvckVhY2goZnVuY3Rpb24oZGlyZWN0aXZlKSB7XG4gICAgLy8gbm93IGZ1cnRoZXIgc3BsaXQgdGhlIGRpcmVjdGl2ZSBvbiB0aGUgOiBjaGFyYWN0ZXJcbiAgICB2YXIgcGFydHMgPSBkaXJlY3RpdmUuc3BsaXQoJzonKTtcbiAgICB2YXIgbWV0aG9kID0gY29uZmlnWyhwYXJ0c1swXSB8fCAnJykudG9Mb3dlckNhc2UoKV07XG5cbiAgICAvLyBpZiB3ZSBoYXZlIHRoZSBtZXRob2QgYXBwbHlcbiAgICBpZiAodHlwZW9mIG1ldGhvZCA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBtZXRob2QuYXBwbHkoY29uZmlnLCBwYXJ0cy5zbGljZSgxKSk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gY29uZmlnO1xufTtcblxuLyoqXG4gICMjIyBDYXB0dXJlQ29uZmlnXG5cbiAgVGhpcyBpcyBhIHV0aWxpdHkgY2xhc3MgdGhhdCBpcyB1c2VkIHRvIHVwZGF0ZSBjYXB0dXJlIGNvbmZpZ3VyYXRpb25cbiAgZGV0YWlscyBhbmQgaXMgYWJsZSB0byBnZW5lcmF0ZSBzdWl0YWJsZSBnZXRVc2VyTWVkaWEgY29uc3RyYWludHMgYmFzZWRcbiAgb24gdGhlIGNvbmZpZ3VyYXRpb24uXG5cbioqL1xuZnVuY3Rpb24gQ2FwdHVyZUNvbmZpZygpIHtcbiAgaWYgKCEgKHRoaXMgaW5zdGFuY2VvZiBDYXB0dXJlQ29uZmlnKSkge1xuICAgIHJldHVybiBuZXcgQ2FwdHVyZUNvbmZpZygpO1xuICB9XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgYmFzZSBjb25maWdcbiAgdGhpcy5jZmcgPSB7XG4gICAgbWljcm9waG9uZTogdHJ1ZVxuICB9O1xufVxuXG4vKipcbiAgIyMjIyBjYW1lcmEoaW5kZXgpXG5cbiAgVXBkYXRlIHRoZSBjYW1lcmEgY29uZmlndXJhdGlvbiB0byB0aGUgc3BlY2lmaWVkIGluZGV4XG4qKi9cbkNhcHR1cmVDb25maWcucHJvdG90eXBlLmNhbWVyYSA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gIHRoaXMuY2ZnLmNhbWVyYSA9IHRydWVPclZhbHVlKGluZGV4KTtcbn07XG5cbi8qKlxuICAjIyMjIG1pY3JvcGhvbmUoaW5kZXgpXG5cbiAgVXBkYXRlIHRoZSBtaWNyb3Bob25lIGNvbmZpZ3VyYXRpb24gdG8gdGhlIHNwZWNpZmllZCBpbmRleFxuKiovXG5DYXB0dXJlQ29uZmlnLnByb3RvdHlwZS5taWNyb3Bob25lID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgdGhpcy5jZmcubWljcm9waG9uZSA9IHRydWVPclZhbHVlKGluZGV4KTtcbn07XG5cbi8qKlxuICAjIyMjIHNjcmVlbih0YXJnZXQpXG5cbiAgU3BlY2lmeSB0aGF0IHdlIHdvdWxkIGxpa2UgdG8gY2FwdHVyZSB0aGUgc2NyZWVuXG4qKi9cbkNhcHR1cmVDb25maWcucHJvdG90eXBlLnNjcmVlbiA9IGZ1bmN0aW9uKCkge1xuICAvLyB1bnNldCB0aGUgbWljcm9waG9uZSBjb25maWdcbiAgZGVsZXRlIHRoaXMuY2ZnLm1pY3JvcGhvbmU7XG5cbiAgLy8gc2V0IHRoZSBzY3JlZW4gY29uZmlndXJhdGlvblxuICB0aGlzLmNmZy5zY3JlZW4gPSB0cnVlO1xufTtcblxuLyoqXG4gICMjIyMgbWF4KGRhdGEpXG5cbiAgVXBkYXRlIGEgbWF4aW11bSBjb25zdHJhaW50LiAgSWYgYW4gZnBzIGNvbnN0cmFpbnQgdGhpcyB3aWxsIGJlIGRpcmVjdGVkXG4gIHRvIHRoZSBgbWF4ZnBzYCBtb2RpZmllci5cblxuKiovXG5DYXB0dXJlQ29uZmlnLnByb3RvdHlwZS5tYXggPSBmdW5jdGlvbihkYXRhKSB7XG4gIHZhciByZXM7XG5cbiAgLy8gaWYgdGhpcyBpcyBhbiBmcHMgc3BlY2lmaWNhdGlvbiBwYXJzZVxuICBpZiAoZGF0YS5zbGljZSgtMykudG9Mb3dlckNhc2UoKSA9PSAnZnBzJykge1xuICAgIHJldHVybiB0aGlzLm1heGZwcyhkYXRhKTtcbiAgfVxuXG4gIC8vIHBhcnNlIHRoZSByZXNvbHV0aW9uXG4gIHJlcyA9IHRoaXMuX3BhcnNlUmVzKGRhdGEpO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIGZwcyBjb25maWcgc3R1ZmZcbiAgdGhpcy5jZmcucmVzID0gdGhpcy5jZmcucmVzIHx8IHt9O1xuICB0aGlzLmNmZy5yZXMubWF4ID0gcmVzO1xufTtcblxuLyoqXG4gICMjIyMgbWF4ZnBzKGRhdGEpXG5cbiAgVXBkYXRlIHRoZSBtYXhpbXVtIGZwc1xuKiovXG5DYXB0dXJlQ29uZmlnLnByb3RvdHlwZS5tYXhmcHMgPSBmdW5jdGlvbihkYXRhKSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIGFuIGZwcyBjb21wb25lbnRcbiAgdGhpcy5jZmcuZnBzID0gdGhpcy5jZmcuZnBzIHx8IHt9O1xuXG4gIC8vIHNldCB0aGUgbWF4IGZwc1xuICB0aGlzLmNmZy5mcHMubWF4ID0gcGFyc2VGbG9hdChkYXRhLnNsaWNlKDAsIC0zKSk7XG59O1xuXG4vKipcbiAgIyMjIyBtaW4oZGF0YSlcblxuICBVcGRhdGUgYSBtaW5pbXVtIGNvbnN0cmFpbnQuICBUaGlzIGNhbiBiZSBlaXRoZXIgcmVsYXRlZCB0byByZXNvbHV0aW9uXG4gIG9yIEZQUy5cbioqL1xuQ2FwdHVyZUNvbmZpZy5wcm90b3R5cGUubWluID0gZnVuY3Rpb24oZGF0YSkge1xuICB2YXIgcmVzO1xuXG4gIC8vIGlmIHRoaXMgaXMgYW4gZnBzIHNwZWNpZmljYXRpb24gcGFyc2VcbiAgaWYgKGRhdGEuc2xpY2UoLTMpLnRvTG93ZXJDYXNlKCkgPT0gJ2ZwcycpIHtcbiAgICByZXR1cm4gdGhpcy5taW5mcHMoZGF0YSk7XG4gIH1cblxuICAvLyBwYXJzZSB0aGUgcmVzb2x1dGlvblxuICByZXMgPSB0aGlzLl9wYXJzZVJlcyhkYXRhKTtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBmcHMgY29uZmlnIHN0dWZmXG4gIHRoaXMuY2ZnLnJlcyA9IHRoaXMuY2ZnLnJlcyB8fCB7fTtcblxuICAvLyBhZGQgdGhlIG1pblxuICB0aGlzLmNmZy5yZXMubWluID0gcmVzO1xufTtcblxuLyoqXG4gICMjIyMgbWluZnBzKGRhdGEpXG5cbiAgVXBkYXRlIHRoZSBtaW5pbXVtIGZwc1xuKiovXG5DYXB0dXJlQ29uZmlnLnByb3RvdHlwZS5taW5mcHMgPSBmdW5jdGlvbihkYXRhKSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIGFuIGZwcyBjb21wb25lbnRcbiAgdGhpcy5jZmcuZnBzID0gdGhpcy5jZmcuZnBzIHx8IHt9O1xuXG4gIC8vIHNldCB0aGUgbWF4IGZwc1xuICB0aGlzLmNmZy5mcHMubWluID0gcGFyc2VGbG9hdChkYXRhLnNsaWNlKDAsIC0zKSk7XG59O1xuXG4vKipcbiAgIyMjIyB0b0NvbnN0cmFpbnRzKG9wdHM/KVxuXG4gIENvbnZlcnQgdGhlIGludGVybmFsIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHRvIGEgdmFsaWQgbWVkaWEgY29uc3RyYWludHNcbiAgcmVwcmVzZW50YXRpb24uICBJbiBjb21wYXRpYmxlIGJyb3dzZXJzIGEgbGlzdCBvZiBtZWRpYSBzb3VyY2VzIGNhblxuICBiZSBwYXNzZWQgdGhyb3VnaCBpbiB0aGUgYG9wdHMuc291cmNlc2AgdG8gY3JlYXRlIGNvbnRyYWludHMgdGhhdCB3aWxsXG4gIHRhcmdldCBhIHNwZWNpZmljIGRldmljZSB3aGVuIGNhcHR1cmVkLlxuXG4gIDw8PCBleGFtcGxlcy9jYXB0dXJlLXRhcmdldHMuanNcblxuKiovXG5DYXB0dXJlQ29uZmlnLnByb3RvdHlwZS50b0NvbnN0cmFpbnRzID0gZnVuY3Rpb24ob3B0cykge1xuICB2YXIgY2ZnID0gdGhpcy5jZmc7XG4gIHZhciBjb25zdHJhaW50cyA9IHtcbiAgICBhdWRpbzogY2ZnLm1pY3JvcGhvbmUgPT09IHRydWUgfHxcbiAgICAgICh0eXBlb2YgY2ZnLm1pY3JvcGhvbmUgPT0gJ251bWJlcicgJiYgY2ZnLm1pY3JvcGhvbmUgPj0gMCksXG5cbiAgICB2aWRlbzogY2ZnLmNhbWVyYSA9PT0gdHJ1ZSB8fCBjZmcuc2NyZWVuIHx8XG4gICAgICAodHlwZW9mIGNmZy5jYW1lcmEgPT0gJ251bWJlcicgJiYgY2ZnLmNhbWVyYSA+PSAwKVxuICB9O1xuXG4gIC8vIG1hbmRhdG9yeSBjb25zdHJhaW50c1xuICB2YXIgbSA9IHtcbiAgICB2aWRlbzoge30sXG4gICAgYXVkaW86IHt9XG4gIH07XG5cbiAgLy8gb3B0aW9uYWwgY29uc3RyYWludHNcbiAgdmFyIG8gPSB7XG4gICAgdmlkZW86IFtdLFxuICAgIGF1ZGlvOiBbXVxuICB9O1xuXG4gIHZhciBzb3VyY2VzID0gKG9wdHMgfHwge30pLnNvdXJjZXMgfHwgW107XG4gIHZhciBjYW1lcmFzID0gc291cmNlcy5maWx0ZXIoZnVuY3Rpb24oaW5mbykge1xuICAgIHJldHVybiBpbmZvICYmIGluZm8ua2luZCA9PT0gJ3ZpZGVvJztcbiAgfSk7XG4gIHZhciBtaWNyb3Bob25lcyA9IHNvdXJjZXMuZmlsdGVyKGZ1bmN0aW9uKGluZm8pIHtcbiAgICByZXR1cm4gaW5mbyAmJiBpbmZvLmtpbmQgPT09ICdhdWRpbyc7XG4gIH0pO1xuICB2YXIgc2VsZWN0ZWRTb3VyY2U7XG5cbiAgZnVuY3Rpb24gY29tcGxleENvbnN0cmFpbnRzKHRhcmdldCkge1xuICAgIGlmIChjb25zdHJhaW50c1t0YXJnZXRdICYmIHR5cGVvZiBjb25zdHJhaW50c1t0YXJnZXRdICE9ICdvYmplY3QnKSB7XG4gICAgICBjb25zdHJhaW50c1t0YXJnZXRdID0ge1xuICAgICAgICBtYW5kYXRvcnk6IG1bdGFyZ2V0XSxcbiAgICAgICAgb3B0aW9uYWw6IG9bdGFyZ2V0XVxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvLyBmcHNcbiAgaWYgKGNmZy5mcHMpIHtcbiAgICBjb21wbGV4Q29uc3RyYWludHMoJ3ZpZGVvJyk7XG4gICAgY2ZnLmZwcy5taW4gJiYgKG0udmlkZW8ubWluRnJhbWVSYXRlID0gY2ZnLmZwcy5taW4pO1xuICAgIGNmZy5mcHMubWF4ICYmIChtLnZpZGVvLm1heEZyYW1lUmF0ZSA9IGNmZy5mcHMubWF4KTtcbiAgfVxuXG4gIC8vIG1pbiByZXMgc3BlY2lmaWVkXG4gIGlmIChjZmcucmVzICYmIGNmZy5yZXMubWluKSB7XG4gICAgY29tcGxleENvbnN0cmFpbnRzKCd2aWRlbycpO1xuICAgIG0udmlkZW8ubWluV2lkdGggPSBjZmcucmVzLm1pbi53O1xuICAgIG0udmlkZW8ubWluSGVpZ2h0ID0gY2ZnLnJlcy5taW4uaDtcbiAgfVxuXG4gIC8vIG1heCByZXMgc3BlY2lmaWVkXG4gIGlmIChjZmcucmVzICYmIGNmZy5yZXMubWF4KSB7XG4gICAgY29tcGxleENvbnN0cmFpbnRzKCd2aWRlbycpO1xuICAgIG0udmlkZW8ubWF4V2lkdGggPSBjZmcucmVzLm1heC53O1xuICAgIG0udmlkZW8ubWF4SGVpZ2h0ID0gY2ZnLnJlcy5tYXguaDtcbiAgfVxuXG4gIC8vIGlucHV0IGNhbWVyYSBzZWxlY3Rpb25cbiAgaWYgKHR5cGVvZiBjZmcuY2FtZXJhID09ICdudW1iZXInICYmIGNhbWVyYXMubGVuZ3RoKSB7XG4gICAgc2VsZWN0ZWRTb3VyY2UgPSBjYW1lcmFzW2NmZy5jYW1lcmFdO1xuXG4gICAgaWYgKHNlbGVjdGVkU291cmNlKSB7XG4gICAgICBjb21wbGV4Q29uc3RyYWludHMoJ3ZpZGVvJyk7XG4gICAgICBvLnZpZGVvLnB1c2goeyBzb3VyY2VJZDogc2VsZWN0ZWRTb3VyY2UuaWQgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gaW5wdXQgbWljcm9waG9uZSBzZWxlY3Rpb25cbiAgaWYgKHR5cGVvZiBjZmcubWljcm9waG9uZSA9PSAnbnVtYmVyJyAmJiBtaWNyb3Bob25lcy5sZW5ndGgpIHtcbiAgICBzZWxlY3RlZFNvdXJjZSA9IG1pY3JvcGhvbmVzW2NmZy5taWNyb3Bob25lXTtcblxuICAgIGlmIChzZWxlY3RlZFNvdXJjZSkge1xuICAgICAgY29tcGxleENvbnN0cmFpbnRzKCdhdWRpbycpO1xuICAgICAgby5hdWRpby5wdXNoKHsgc291cmNlSWQ6IHNlbGVjdGVkU291cmNlLmlkIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHdlIGhhdmUgc2NyZWVuIGNvbnN0cmFpbnRzLCBtYWtlIG1hZ2ljIGhhcHBlblxuICBpZiAodHlwZW9mIGNmZy5zY3JlZW4gIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBjb21wbGV4Q29uc3RyYWludHMoJ3ZpZGVvJyk7XG4gICAgbS52aWRlby5jaHJvbWVNZWRpYVNvdXJjZSA9ICdzY3JlZW4nO1xuICB9XG5cbiAgcmV0dXJuIGNvbnN0cmFpbnRzO1xufTtcblxuLyoqXG4gICMjIyBcIkludGVybmFsXCIgbWV0aG9kc1xuKiovXG5cbi8qKlxuICAjIyMjIF9wYXJzZVJlcyhkYXRhKVxuXG4gIFBhcnNlIGEgcmVzb2x1dGlvbiBzcGVjaWZpZXIgKGUuZy4gMTI4MHg3MjApIGludG8gYSBzaW1wbGUgSlMgb2JqZWN0XG4gIChlLmcuIHsgdzogMTI4MCwgaDogNzIwIH0pXG4qKi9cbkNhcHR1cmVDb25maWcucHJvdG90eXBlLl9wYXJzZVJlcyA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgLy8gc3BsaXQgdGhlIGRhdGEgb24gdGhlICd4JyBjaGFyYWN0ZXJcbiAgdmFyIHBhcnRzID0gZGF0YS5zcGxpdCgneCcpO1xuXG4gIC8vIGlmIHdlIGRvbid0IGhhdmUgdHdvIHBhcnRzLCB0aGVuIGNvbXBsYWluXG4gIGlmIChwYXJ0cy5sZW5ndGggPCAyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHJlc29sdXRpb24gc3BlY2lmaWNhdGlvbjogJyArIGRhdGEpO1xuICB9XG5cbiAgLy8gcmV0dXJuIHRoZSB3aWR0aCBhbmQgaGVpZ2h0IG9iamVjdFxuICByZXR1cm4ge1xuICAgIHc6IHBhcnNlSW50KHBhcnRzWzBdLCAxMCksXG4gICAgaDogcGFyc2VJbnQocGFydHNbMV0sIDEwKVxuICB9O1xufTtcblxuLyogaW50ZXJuYWwgaGVscGVyICovXG5cbmZ1bmN0aW9uIHRydWVPclZhbHVlKHZhbCkge1xuICBpZiAodHlwZW9mIHZhbCA9PSAnc3RyaW5nJyAmJiBvZmZGbGFncy5pbmRleE9mKHZhbC50b0xvd2VyQ2FzZSgpKSA+PSAwKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHZhbCA9PT0gdW5kZWZpbmVkIHx8IHZhbCA9PT0gJycgfHwgcGFyc2VJbnQodmFsIHx8IDAsIDEwKTtcbn0iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIHdpbmRvdzogZmFsc2UgKi9cbi8qIGdsb2JhbCBuYXZpZ2F0b3I6IGZhbHNlICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGJyb3dzZXJzID0ge1xuICBjaHJvbWU6IC9DaHJvbSg/OmV8aXVtKVxcLyhbMC05XSspXFwuLyxcbiAgZmlyZWZveDogL0ZpcmVmb3hcXC8oWzAtOV0rKVxcLi8sXG4gIG9wZXJhOiAvT3BlcmFcXC8oWzAtOV0rKVxcLi9cbn07XG5cbi8qKlxuIyMgcnRjLWNvcmUvZGV0ZWN0XG5cbkEgYnJvd3NlciBkZXRlY3Rpb24gaGVscGVyIGZvciBhY2Nlc3NpbmcgcHJlZml4LWZyZWUgdmVyc2lvbnMgb2YgdGhlIHZhcmlvdXNcbldlYlJUQyB0eXBlcy5cblxuIyMjIEV4YW1wbGUgVXNhZ2VcblxuSWYgeW91IHdhbnRlZCB0byBnZXQgdGhlIG5hdGl2ZSBgUlRDUGVlckNvbm5lY3Rpb25gIHByb3RvdHlwZSBpbiBhbnkgYnJvd3NlclxueW91IGNvdWxkIGRvIHRoZSBmb2xsb3dpbmc6XG5cbmBgYGpzXG52YXIgZGV0ZWN0ID0gcmVxdWlyZSgncnRjLWNvcmUvZGV0ZWN0Jyk7IC8vIGFsc28gYXZhaWxhYmxlIGluIHJ0Yy9kZXRlY3RcbnZhciBSVENQZWVyQ29ubmVjdGlvbiA9IGRldGVjdCgnUlRDUGVlckNvbm5lY3Rpb24nKTtcbmBgYFxuXG5UaGlzIHdvdWxkIHByb3ZpZGUgd2hhdGV2ZXIgdGhlIGJyb3dzZXIgcHJlZml4ZWQgdmVyc2lvbiBvZiB0aGVcblJUQ1BlZXJDb25uZWN0aW9uIGlzIGF2YWlsYWJsZSAoYHdlYmtpdFJUQ1BlZXJDb25uZWN0aW9uYCxcbmBtb3pSVENQZWVyQ29ubmVjdGlvbmAsIGV0YykuXG4qKi9cbnZhciBkZXRlY3QgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCwgcHJlZml4ZXMpIHtcbiAgdmFyIHByZWZpeElkeDtcbiAgdmFyIHByZWZpeDtcbiAgdmFyIHRlc3ROYW1lO1xuICB2YXIgaG9zdE9iamVjdCA9IHRoaXMgfHwgKHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB1bmRlZmluZWQpO1xuXG4gIC8vIGlmIHdlIGhhdmUgbm8gaG9zdCBvYmplY3QsIHRoZW4gYWJvcnRcbiAgaWYgKCEgaG9zdE9iamVjdCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGluaXRpYWxpc2UgdG8gZGVmYXVsdCBwcmVmaXhlc1xuICAvLyAocmV2ZXJzZSBvcmRlciBhcyB3ZSB1c2UgYSBkZWNyZW1lbnRpbmcgZm9yIGxvb3ApXG4gIHByZWZpeGVzID0gKHByZWZpeGVzIHx8IFsnbXMnLCAnbycsICdtb3onLCAnd2Via2l0J10pLmNvbmNhdCgnJyk7XG5cbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBwcmVmaXhlcyBhbmQgcmV0dXJuIHRoZSBjbGFzcyBpZiBmb3VuZCBpbiBnbG9iYWxcbiAgZm9yIChwcmVmaXhJZHggPSBwcmVmaXhlcy5sZW5ndGg7IHByZWZpeElkeC0tOyApIHtcbiAgICBwcmVmaXggPSBwcmVmaXhlc1twcmVmaXhJZHhdO1xuXG4gICAgLy8gY29uc3RydWN0IHRoZSB0ZXN0IGNsYXNzIG5hbWVcbiAgICAvLyBpZiB3ZSBoYXZlIGEgcHJlZml4IGVuc3VyZSB0aGUgdGFyZ2V0IGhhcyBhbiB1cHBlcmNhc2UgZmlyc3QgY2hhcmFjdGVyXG4gICAgLy8gc3VjaCB0aGF0IGEgdGVzdCBmb3IgZ2V0VXNlck1lZGlhIHdvdWxkIHJlc3VsdCBpbiBhXG4gICAgLy8gc2VhcmNoIGZvciB3ZWJraXRHZXRVc2VyTWVkaWFcbiAgICB0ZXN0TmFtZSA9IHByZWZpeCArIChwcmVmaXggP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHRhcmdldC5zbGljZSgxKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0KTtcblxuICAgIGlmICh0eXBlb2YgaG9zdE9iamVjdFt0ZXN0TmFtZV0gIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIC8vIHVwZGF0ZSB0aGUgbGFzdCB1c2VkIHByZWZpeFxuICAgICAgZGV0ZWN0LmJyb3dzZXIgPSBkZXRlY3QuYnJvd3NlciB8fCBwcmVmaXgudG9Mb3dlckNhc2UoKTtcblxuICAgICAgLy8gcmV0dXJuIHRoZSBob3N0IG9iamVjdCBtZW1iZXJcbiAgICAgIHJldHVybiBob3N0T2JqZWN0W3RhcmdldF0gPSBob3N0T2JqZWN0W3Rlc3ROYW1lXTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIGRldGVjdCBtb3ppbGxhICh5ZXMsIHRoaXMgZmVlbHMgZGlydHkpXG5kZXRlY3QubW96ID0gdHlwZW9mIG5hdmlnYXRvciAhPSAndW5kZWZpbmVkJyAmJiAhIW5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWE7XG5cbi8vIHRpbWUgdG8gZG8gc29tZSB1c2VyYWdlbnQgc25pZmZpbmcgLSBpdCBmZWVscyBkaXJ0eSBiZWNhdXNlIGl0IGlzIDovXG5pZiAodHlwZW9mIG5hdmlnYXRvciAhPSAndW5kZWZpbmVkJykge1xuICBPYmplY3Qua2V5cyhicm93c2VycykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICB2YXIgbWF0Y2ggPSBicm93c2Vyc1trZXldLmV4ZWMobmF2aWdhdG9yLnVzZXJBZ2VudCk7XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBkZXRlY3QuYnJvd3NlciA9IGtleTtcbiAgICAgIGRldGVjdC5icm93c2VyVmVyc2lvbiA9IGRldGVjdC52ZXJzaW9uID0gcGFyc2VJbnQobWF0Y2hbMV0sIDEwKTtcbiAgICB9XG4gIH0pO1xufVxuZWxzZSB7XG4gIGRldGVjdC5icm93c2VyID0gJ25vZGUnO1xuICBkZXRlY3QuYnJvd3NlclZlcnNpb24gPSBkZXRlY3QudmVyc2lvbiA9ICc/JzsgLy8gVE9ETzogZ2V0IG5vZGUgdmVyc2lvblxufSIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIyBydGMtY29yZS9yZXNldFxuXG4gIFRoaXMgaXMgYSBzaW1wbGUsIGNyb3NzLWJyb3dzZXIgbWV0aG9kIGZvciByZXNldHRpbmcgYSBtZWRpYSBlbGVtZW50XG4gIGJhY2sgdG8gYSBpbml0aWFsIHN0YXRlIGFmdGVyIGhhdmluZyBtZWRpYSBhdHRhY2hlZC5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGVsKSB7XG4gIC8vIHJlbW92ZSB0aGUgc291cmNlXG4gIGVsLnNyYyA9IG51bGw7XG5cbiAgLy8gY2hlY2sgZm9yIG1velxuICBpZiAoZWwubW96U3JjT2JqZWN0KSB7XG4gICAgZWwubW96U3JjT2JqZWN0ID0gbnVsbDtcbiAgfVxuXG4gIC8vIGNoZWNrIGZvciBjdXJyZW50U3JjXG4gIGlmIChlbC5jdXJyZW50U3JjKSB7XG4gICAgZWwuY3VycmVudFNyYyA9IG51bGw7XG4gIH1cblxuICAvLyByZXR1cm4gdGhlIGlucHV0IChtYXAgZnJpZW5kbHkpXG4gIHJldHVybiBlbDtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbi8qIGdsb2JhbCBuYXZpZ2F0b3I6IGZhbHNlICovXG4vKiBnbG9iYWwgd2luZG93OiBmYWxzZSAqL1xuLyogZ2xvYmFsIGRvY3VtZW50OiBmYWxzZSAqL1xuLyogZ2xvYmFsIE1lZGlhU3RyZWFtOiBmYWxzZSAqL1xuLyogZ2xvYmFsIEhUTUxWaWRlb0VsZW1lbnQ6IGZhbHNlICovXG4vKiBnbG9iYWwgSFRNTEF1ZGlvRWxlbWVudDogZmFsc2UgKi9cblxuLyoqXG4gICMgcnRjLW1lZGlhXG5cbiAgU2ltcGxlIFtnZXRVc2VyTWVkaWFdKGh0dHA6Ly9kZXYudzMub3JnLzIwMTEvd2VicnRjL2VkaXRvci9nZXR1c2VybWVkaWEuaHRtbClcbiAgY3Jvc3MtYnJvd3NlciB3cmFwcGVycy4gIFBhcnQgb2YgdGhlIFtydGMuaW9dKGh0dHA6Ly9ydGMuaW8vKSBzdWl0ZSwgd2hpY2ggaXNcbiAgc3BvbnNvcmVkIGJ5IFtOSUNUQV0oaHR0cDovL29wZW5uaWN0YS5jb20pIGFuZCByZWxlYXNlZCB1bmRlciBhblxuICBbQXBhY2hlIDIuMCBsaWNlbnNlXSgvTElDRU5TRSkuXG5cbiAgIyMgRXhhbXBsZSBVc2FnZVxuXG4gIENhcHR1cmluZyBtZWRpYSBvbiB5b3VyIG1hY2hpbmUgaXMgYXMgc2ltcGxlIGFzOlxuXG4gIGBgYGpzXG4gIHJlcXVpcmUoJ3J0Yy1tZWRpYScpKCk7XG4gIGBgYFxuXG4gIFdoaWxlIHRoaXMgd2lsbCBpbiBmYWN0IHN0YXJ0IHRoZSB1c2VyIG1lZGlhIGNhcHR1cmUgcHJvY2VzcywgaXQgd29uJ3RcbiAgZG8gYW55dGhpbmcgd2l0aCBpdC4gIExldHMgdGFrZSBhIGxvb2sgYXQgYSBtb3JlIHJlYWxpc3RpYyBleGFtcGxlOlxuXG4gIDw8PCBleGFtcGxlcy9yZW5kZXItdG8tYm9keS5qc1xuXG4gIFtydW4gb24gcmVxdWlyZWJpbl0oaHR0cDovL3JlcXVpcmViaW4uY29tLz9naXN0PTYwODU0NTApXG5cbiAgSW4gdGhlIGNvZGUgYWJvdmUsIHdlIGFyZSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZSBvZiBvdXIgdXNlck1lZGlhIHdyYXBwZXJcbiAgdXNpbmcgdGhlIGBtZWRpYSgpYCBjYWxsIGFuZCB0aGVuIHRlbGxpbmcgaXQgdG8gcmVuZGVyIHRvIHRoZVxuICBgZG9jdW1lbnQuYm9keWAgb25jZSB2aWRlbyBzdGFydHMgc3RyZWFtaW5nLiAgV2UgY2FuIGZ1cnRoZXIgZXhwYW5kIHRoZVxuICBjb2RlIG91dCB0byB0aGUgZm9sbG93aW5nIHRvIGFpZCBvdXIgdW5kZXJzdGFuZGluZyBvZiB3aGF0IGlzIGdvaW5nIG9uOlxuXG4gIDw8PCBleGFtcGxlcy9jYXB0dXJlLWV4cGxpY2l0LmpzXG5cbiAgVGhlIGNvZGUgYWJvdmUgaXMgd3JpdHRlbiBpbiBhIG1vcmUgdHJhZGl0aW9uYWwgSlMgc3R5bGUsIGJ1dCBmZWVsIGZyZWVcbiAgdG8gdXNlIHRoZSBmaXJzdCBzdHlsZSBhcyBpdCdzIHF1aXRlIHNhZmUgKHRoYW5rcyB0byBzb21lIGNoZWNrcyBpbiB0aGVcbiAgY29kZSkuXG5cbiAgIyMjIEV2ZW50c1xuXG4gIE9uY2UgYSBtZWRpYSBvYmplY3QgaGFzIGJlZW4gY3JlYXRlZCwgaXQgd2lsbCBwcm92aWRlIGEgbnVtYmVyIG9mIGV2ZW50c1xuICB0aHJvdWdoIHRoZSBzdGFuZGFyZCBub2RlIEV2ZW50RW1pdHRlciBBUEkuXG5cbiAgIyMjIyBgY2FwdHVyZWBcblxuICBUaGUgYGNhcHR1cmVgIGV2ZW50IGlzIHRyaWdnZXJlZCBvbmNlIHRoZSByZXF1ZXN0ZWQgbWVkaWEgc3RyZWFtIGhhc1xuICBiZWVuIGNhcHR1cmVkIGJ5IHRoZSBicm93c2VyLlxuXG4gIDw8PCBleGFtcGxlcy9jYXB0dXJlLWV2ZW50LmpzXG5cbiAgIyMjIyBgcmVuZGVyYFxuXG4gIFRoZSBgcmVuZGVyYCBldmVudCBpcyB0cmlnZ2VyZWQgb25jZSB0aGUgc3RyZWFtIGhhcyBiZWVuIHJlbmRlcmVkXG4gIHRvIHRoZSBhbnkgc3VwcGxpZWQgKG9yIGNyZWF0ZWQpIHZpZGVvIGVsZW1lbnRzLlxuXG4gIFdoaWxlIGl0IG1pZ2h0IHNlZW0gYSBsaXR0bGUgY29uZnVzaW5nIHRoYXQgd2hlbiB0aGUgYHJlbmRlcmAgZXZlbnRcbiAgZmlyZXMgdGhhdCBpdCByZXR1cm5zIGFuIGFycmF5IG9mIGVsZW1lbnRzIHJhdGhlciB0aGFuIGEgc2luZ2xlIGVsZW1lbnRcbiAgKHdoaWNoIGlzIHdoYXQgaXMgcHJvdmlkZWQgd2hlbiBjYWxsaW5nIHRoZSBgcmVuZGVyYCBtZXRob2QpLlxuXG4gIFRoaXMgb2NjdXJzIGJlY2F1c2UgaXQgaXMgY29tcGxldGVseSB2YWxpZCB0byByZW5kZXIgYSBzaW5nbGUgY2FwdHVyZWRcbiAgbWVkaWEgc3RyZWFtIHRvIG11bHRpcGxlIG1lZGlhIGVsZW1lbnRzIG9uIGEgcGFnZS4gIFRoZSBgcmVuZGVyYCBldmVudFxuICBpcyByZXBvcnRpbmcgb25jZSB0aGUgcmVuZGVyIG9wZXJhdGlvbiBoYXMgY29tcGxldGVkIGZvciBhbGwgdGFyZ2V0cyB0aGF0XG4gIGhhdmUgYmVlbiByZWdpc3RlcmVkIHdpdGggdGhlIGNhcHR1cmUgc3RyZWFtLlxuXG4gICMjIFJlZmVyZW5jZVxuXG4qKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGVidWcgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJykoJ21lZGlhJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xudmFyIGRldGVjdCA9IHJlcXVpcmUoJ3J0Yy1jb3JlL2RldGVjdCcpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xuXG4vLyBtb25rZXkgcGF0Y2ggZ2V0VXNlck1lZGlhIGZyb20gdGhlIHByZWZpeGVkIHZlcnNpb25cbm5hdmlnYXRvci5nZXRVc2VyTWVkaWEgPSBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhIHx8XG4gIGRldGVjdC5jYWxsKG5hdmlnYXRvciwgJ2dldFVzZXJNZWRpYScpO1xuXG4vLyBwYXRjaCB3aW5kb3cgdXJsXG53aW5kb3cuVVJMID0gd2luZG93LlVSTCB8fCBkZXRlY3QoJ1VSTCcpO1xuXG4vLyBwYXRjaCBtZWRpYSBzdHJlYW1cbndpbmRvdy5NZWRpYVN0cmVhbSA9IGRldGVjdCgnTWVkaWFTdHJlYW0nKTtcblxuLyoqXG4gICMjIyBtZWRpYVxuXG4gIGBgYFxuICBtZWRpYShvcHRzPylcbiAgYGBgXG5cbiAgQ2FwdHVyZSBtZWRpYSB1c2luZyB0aGUgdW5kZXJseWluZ1xuICBbZ2V0VXNlck1lZGlhXShodHRwOi8vd3d3LnczLm9yZy9UUi9tZWRpYWNhcHR1cmUtc3RyZWFtcy8pIEFQSS5cblxuICBUaGUgZnVuY3Rpb24gYWNjZXB0cyBhIHNpbmdsZSBhcmd1bWVudCB3aGljaCBjYW4gYmUgZWl0aGVyIGJlOlxuXG4gIC0gYS4gQW4gb3B0aW9ucyBvYmplY3QgKHNlZSBiZWxvdyksIG9yO1xuICAtIGIuIEFuIGV4aXN0aW5nXG4gICAgW01lZGlhU3RyZWFtXShodHRwOi8vd3d3LnczLm9yZy9UUi9tZWRpYWNhcHR1cmUtc3RyZWFtcy8jbWVkaWFzdHJlYW0pIHRoYXRcbiAgICB0aGUgbWVkaWEgb2JqZWN0IHdpbGwgYmluZCB0byBhbmQgcHJvdmlkZSB5b3Ugc29tZSBET00gaGVscGVycyBmb3IuXG5cbiAgVGhlIGZ1bmN0aW9uIHN1cHBvcnRzIHRoZSBmb2xsb3dpbmcgb3B0aW9uczpcblxuICAtIGBjYXB0dXJlYCAtIFdoZXRoZXIgY2FwdHVyZSBzaG91bGQgYmUgaW5pdGlhdGVkIGF1dG9tYXRpY2FsbHkuIERlZmF1bHRzXG4gICAgdG8gdHJ1ZSwgYnV0IHRvZ2dsZWQgdG8gZmFsc2UgYXV0b21hdGljYWxseSBpZiBhbiBleGlzdGluZyBzdHJlYW0gaXNcbiAgICBwcm92aWRlZC5cblxuICAtIGBtdXRlZGAgLSBXaGV0aGVyIHRoZSB2aWRlbyBlbGVtZW50IGNyZWF0ZWQgZm9yIHRoaXMgc3RyZWFtIHNob3VsZCBiZVxuICAgIG11dGVkLiAgRGVmYXVsdCBpcyB0cnVlIGJ1dCBpcyBzZXQgdG8gZmFsc2Ugd2hlbiBhbiBleGlzdGluZyBzdHJlYW0gaXNcbiAgICBwYXNzZWQuXG5cbiAgLSBgY29uc3RyYWludHNgIC0gVGhlIGNvbnN0cmFpbnQgb3B0aW9uIGFsbG93cyB5b3UgdG8gc3BlY2lmeSBwYXJ0aWN1bGFyXG4gICAgbWVkaWEgY2FwdHVyZSBjb25zdHJhaW50cyB3aGljaCBjYW4gYWxsb3cgeW91IGRvIGRvIHNvbWUgcHJldHR5IGNvb2xcbiAgICB0cmlja3MuICBCeSBkZWZhdWx0LCB0aGUgY29udHJhaW50cyB1c2VkIHRvIHJlcXVlc3QgdGhlIG1lZGlhIGFyZVxuICAgIGZhaXJseSBzdGFuZGFyZCBkZWZhdWx0czpcblxuICAgIGBgYGpzXG4gICAgICB7XG4gICAgICAgIHZpZGVvOiB7XG4gICAgICAgICAgbWFuZGF0b3J5OiB7fSxcbiAgICAgICAgICBvcHRpb25hbDogW11cbiAgICAgICAgfSxcbiAgICAgICAgYXVkaW86IHRydWVcbiAgICAgIH1cbiAgICBgYGBcblxuKiovXG5mdW5jdGlvbiBNZWRpYShvcHRzKSB7XG4gIGlmICghICh0aGlzIGluc3RhbmNlb2YgTWVkaWEpKSB7XG4gICAgcmV0dXJuIG5ldyBNZWRpYShvcHRzKTtcbiAgfVxuXG4gIC8vIGluaGVyaXRlZFxuICBFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblxuICAvLyBpZiB0aGUgb3B0cyBpcyBhIG1lZGlhIHN0cmVhbSBpbnN0YW5jZSwgdGhlbiBoYW5kbGUgdGhhdCBhcHByb3ByaWF0ZWx5XG4gIGlmIChvcHRzICYmIG9wdHMgaW5zdGFuY2VvZiBNZWRpYVN0cmVhbSkge1xuICAgIG9wdHMgPSB7XG4gICAgICBzdHJlYW06IG9wdHMsXG4gICAgICBjYXB0dXJlOiBmYWxzZSxcbiAgICAgIG11dGVkOiBmYWxzZVxuICAgIH07XG4gIH1cblxuICAvLyBpZiB3ZSd2ZSBiZWVuIHBhc3NlZCBvcHRzIGFuZCB0aGV5IGxvb2sgbGlrZSBjb25zdHJhaW50cywgbW92ZSB0aGluZ3NcbiAgLy8gYXJvdW5kIGEgbGl0dGxlXG4gIGlmIChvcHRzICYmIChvcHRzLmF1ZGlvIHx8IG9wdHMudmlkZW8pKSB7XG4gICAgb3B0cyA9IHtcbiAgICAgIGNvbnN0cmFpbnRzOiBvcHRzXG4gICAgfTtcbiAgfVxuXG4gIC8vIGVuc3VyZSB3ZSBoYXZlIG9wdHNcbiAgb3B0cyA9IGV4dGVuZCh7fSwge1xuICAgIGNhcHR1cmU6IHRydWUsXG4gICAgbXV0ZWQ6IHRydWUsXG4gICAgY29uc3RyYWludHM6IHtcbiAgICAgIHZpZGVvOiB7XG4gICAgICAgIG1hbmRhdG9yeToge30sXG4gICAgICAgIG9wdGlvbmFsOiBbXVxuICAgICAgfSxcbiAgICAgIGF1ZGlvOiB0cnVlXG4gICAgfVxuICB9LCBvcHRzKTtcblxuICAvLyBzYXZlIHRoZSBjb25zdHJhaW50c1xuICB0aGlzLmNvbnN0cmFpbnRzID0gb3B0cy5jb25zdHJhaW50cztcblxuICAvLyBpZiBhIG5hbWUgaGFzIGJlZW4gc3BlY2lmaWVkIGluIHRoZSBvcHRzLCBzYXZlIGl0IHRvIHRoZSBtZWRpYVxuICB0aGlzLm5hbWUgPSBvcHRzLm5hbWU7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgc3RyZWFtIHRvIG51bGxcbiAgdGhpcy5zdHJlYW0gPSBvcHRzLnN0cmVhbSB8fCBudWxsO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIG11dGVkIHN0YXRlXG4gIHRoaXMubXV0ZWQgPSB0eXBlb2Ygb3B0cy5tdXRlZCA9PSAndW5kZWZpbmVkJyB8fCBvcHRzLm11dGVkO1xuXG4gIC8vIGNyZWF0ZSBhIGJpbmRpbmdzIGFycmF5IHNvIHdlIGhhdmUgYSByb3VnaCBpZGVhIG9mIHdoZXJlXG4gIC8vIHdlIGhhdmUgYmVlbiBhdHRhY2hlZCB0b1xuICAvLyBUT0RPOiByZXZpc2l0IHdoZXRoZXIgdGhpcyBpcyB0aGUgYmVzdCB3YXkgdG8gbWFuYWdlIHRoaXNcbiAgdGhpcy5fYmluZGluZ3MgPSBbXTtcblxuICAvLyBpZiB3ZSBhcmUgYXV0b3N0YXJ0aW5nLCBjYXB0dXJlIG1lZGlhIG9uIHRoZSBuZXh0IHRpY2tcbiAgaWYgKG9wdHMuY2FwdHVyZSkge1xuICAgIHNldFRpbWVvdXQodGhpcy5jYXB0dXJlLmJpbmQodGhpcyksIDApO1xuICB9XG59XG5cbnV0aWwuaW5oZXJpdHMoTWVkaWEsIEV2ZW50RW1pdHRlcik7XG5tb2R1bGUuZXhwb3J0cyA9IE1lZGlhO1xuXG4vKipcbiAgIyMjIGNhcHR1cmVcblxuICBgYGBcbiAgY2FwdHVyZShjb25zdHJhaW50cywgY2FsbGJhY2spXG4gIGBgYFxuXG4gIENhcHR1cmUgbWVkaWEuICBJZiBjb25zdHJhaW50cyBhcmUgcHJvdmlkZWQsIHRoZW4gdGhleSB3aWxsXG4gIG92ZXJyaWRlIHRoZSBkZWZhdWx0IGNvbnN0cmFpbnRzIHRoYXQgd2VyZSB1c2VkIHdoZW4gdGhlIG1lZGlhIG9iamVjdCB3YXNcbiAgY3JlYXRlZC5cbioqL1xuTWVkaWEucHJvdG90eXBlLmNhcHR1cmUgPSBmdW5jdGlvbihjb25zdHJhaW50cywgY2FsbGJhY2spIHtcbiAgdmFyIG1lZGlhID0gdGhpcztcbiAgdmFyIGhhbmRsZUVuZCA9IHRoaXMuZW1pdC5iaW5kKHRoaXMsICdlbmQnKTtcblxuICAvLyBpZiB3ZSBhbHJlYWR5IGhhdmUgYSBzdHJlYW0sIHRoZW4gYWJvcnRcbiAgaWYgKHRoaXMuc3RyZWFtKSB7IHJldHVybjsgfVxuXG4gIC8vIGlmIG5vIGNvbnN0cmFpbnRzIGhhdmUgYmVlbiBwcm92aWRlZCwgYnV0IHdlIGhhdmVcbiAgLy8gYSBjYWxsYmFjaywgZGVhbCB3aXRoIGl0XG4gIGlmICh0eXBlb2YgY29uc3RyYWludHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gY29uc3RyYWludHM7XG4gICAgY29uc3RyYWludHMgPSB0aGlzLmNvbnN0cmFpbnRzO1xuICB9XG5cbiAgLy8gaWYgd2UgaGF2ZSBhIGNhbGxiYWNrLCBiaW5kIHRvIHRoZSBzdGFydCBldmVudFxuICBpZiAodHlwZW9mIGNhbGxiYWNrID09ICdmdW5jdGlvbicpIHtcbiAgICB0aGlzLm9uY2UoJ2NhcHR1cmUnLCBjYWxsYmFjay5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIC8vIGdldCB1c2VyIG1lZGlhLCB1c2luZyBlaXRoZXIgdGhlIHByb3ZpZGVkIGNvbnN0cmFpbnRzIG9yIHRoZVxuICAvLyBkZWZhdWx0IGNvbnN0cmFpbnRzXG4gIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEoXG4gICAgY29uc3RyYWludHMgfHwgdGhpcy5jb25zdHJhaW50cyxcbiAgICBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgIGlmICh0eXBlb2Ygc3RyZWFtLmFkZEV2ZW50TGlzdGVuZXIgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBzdHJlYW0uYWRkRXZlbnRMaXN0ZW5lcignZW5kZWQnLCBoYW5kbGVFbmQpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHN0cmVhbS5vbmVuZGVkID0gaGFuZGxlRW5kO1xuICAgICAgfVxuXG4gICAgICAvLyBzYXZlIHRoZSBzdHJlYW0gYW5kIGVtaXQgdGhlIHN0YXJ0IG1ldGhvZFxuICAgICAgbWVkaWEuc3RyZWFtID0gc3RyZWFtO1xuICAgICAgbWVkaWEuZW1pdCgnY2FwdHVyZScsIHN0cmVhbSk7XG4gICAgfSxcbiAgICB0aGlzLl9oYW5kbGVGYWlsLmJpbmQodGhpcylcbiAgKTtcbn07XG5cbi8qKlxuICAjIyMgcmVuZGVyXG5cbiAgYGBganNcbiAgcmVuZGVyKHRhcmdldCwgb3B0cz8sIGNhbGxiYWNrPylcbiAgYGBgXG5cbiAgUmVuZGVyIHRoZSBjYXB0dXJlZCBtZWRpYSB0byB0aGUgc3BlY2lmaWVkIHRhcmdldCBlbGVtZW50LiAgV2hpbGUgcHJldmlvdXNcbiAgdmVyc2lvbnMgb2YgcnRjLW1lZGlhIGFjY2VwdGVkIGEgc2VsZWN0b3Igc3RyaW5nIG9yIGFuIGFycmF5IG9mIGVsZW1lbnRzXG4gIHRoaXMgaGFzIGJlZW4gZHJvcHBlZCBpbiBmYXZvdXIgb2YgX19vbmUgc2luZ2xlIHRhcmdldCBlbGVtZW50X18uXG5cbiAgSWYgdGhlIHRhcmdldCBlbGVtZW50IGlzIGEgdmFsaWQgTWVkaWFFbGVtZW50IHRoZW4gaXQgd2lsbCBiZWNvbWUgdGhlXG4gIHRhcmdldCBvZiB0aGUgY2FwdHVyZWQgbWVkaWEgc3RyZWFtLiAgSWYsIGhvd2V2ZXIsIGl0IGlzIGEgZ2VuZXJpYyBET01cbiAgZWxlbWVudCBpdCB3aWxsIGEgbmV3IE1lZGlhIGVsZW1lbnQgd2lsbCBiZSBjcmVhdGVkIHRoYXQgdXNpbmcgdGhlIHRhcmdldFxuICBhcyBpdCdzIHBhcmVudC5cblxuICBBIHNpbXBsZSBleGFtcGxlIG9mIHJlcXVlc3RpbmcgZGVmYXVsdCBtZWRpYSBjYXB0dXJlIGFuZCByZW5kZXJpbmcgdG8gdGhlXG4gIGRvY3VtZW50IGJvZHkgaXMgc2hvd24gYmVsb3c6XG5cbiAgPDw8IGV4YW1wbGVzL3JlbmRlci10by1ib2R5LmpzXG5cbiAgWW91IG1heSBvcHRpb25hbGx5IHByb3ZpZGUgYSBjYWxsYmFjayB0byB0aGlzIGZ1bmN0aW9uLCB3aGljaCBpc1xuICB3aWxsIGJlIHRyaWdnZXJlZCBvbmNlIGVhY2ggb2YgdGhlIG1lZGlhIGVsZW1lbnRzIGhhcyBzdGFydGVkIHBsYXlpbmdcbiAgdGhlIHN0cmVhbTpcblxuICA8PDwgZXhhbXBsZXMvcmVuZGVyLWNhcHR1cmUtY2FsbGJhY2suanNcblxuKiovXG5NZWRpYS5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24odGFyZ2V0LCBvcHRzLCBjYWxsYmFjaykge1xuICAvLyBpZiB0aGUgdGFyZ2V0IGlzIGFuIGFycmF5LCBleHRyYWN0IHRoZSBmaXJzdCBlbGVtZW50XG4gIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcbiAgICAvLyBsb2cgYSB3YXJuaW5nXG4gICAgY29uc29sZS5sb2coJ1dBUk5JTkc6IHJ0Yy1tZWRpYSByZW5kZXIgKGFzIG9mIDEueCkgZXhwZWN0cyBhIHNpbmdsZSB0YXJnZXQnKTtcbiAgICB0YXJnZXQgPSB0YXJnZXRbMF07XG4gIH1cblxuICBpZiAodHlwZW9mIG9wdHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICBvcHRzID0ge307XG4gIH1cblxuICAvLyBlbnN1cmUgd2UgaGF2ZSBvcHRzXG4gIG9wdHMgPSBvcHRzIHx8IHt9O1xuXG4gIC8vIGNyZWF0ZSB0aGUgdmlkZW8gLyBhdWRpbyBlbGVtZW50c1xuICB0YXJnZXQgPSB0aGlzLl9wcmVwYXJlRWxlbWVudChvcHRzLCB0YXJnZXQpO1xuXG4gIC8vIGlmIG5vIHN0cmVhbSB3YXMgc3BlY2lmaWVkLCB3YWl0IGZvciB0aGUgc3RyZWFtIHRvIGluaXRpYWxpemVcbiAgaWYgKCEgdGhpcy5zdHJlYW0pIHtcbiAgICB0aGlzLm9uY2UoJ2NhcHR1cmUnLCB0aGlzLl9iaW5kU3RyZWFtLmJpbmQodGhpcykpO1xuICB9XG4gIC8vIG90aGVyd2lzZSwgYmluZCB0aGUgc3RyZWFtIG5vd1xuICBlbHNlIHtcbiAgICB0aGlzLl9iaW5kU3RyZWFtKHRoaXMuc3RyZWFtKTtcbiAgfVxuXG4gIC8vIGlmIHdlIGhhdmUgYSBjYWxsYmFjayB0aGVuIHRyaWdnZXIgb24gdGhlIHJlbmRlciBldmVudFxuICBpZiAodHlwZW9mIGNhbGxiYWNrID09ICdmdW5jdGlvbicpIHtcbiAgICB0aGlzLm9uY2UoJ3JlbmRlcicsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIHJldHVybiB0YXJnZXQ7XG59O1xuXG4vKipcbiAgIyMjIHN0b3AoKVxuXG4gIFN0b3AgdGhlIG1lZGlhIHN0cmVhbVxuKiovXG5NZWRpYS5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgdmFyIG1lZGlhID0gdGhpcztcblxuICBpZiAoISB0aGlzLnN0cmVhbSkgeyByZXR1cm47IH1cblxuICAvLyByZW1vdmUgYmluZGluZ3NcbiAgdGhpcy5fdW5iaW5kKG9wdHMpO1xuXG4gIC8vIHN0b3AgdGhlIHN0cmVhbSwgYW5kIHRlbGwgdGhlIHdvcmxkXG4gIHRoaXMuc3RyZWFtLnN0b3AoKTtcblxuICAvLyBvbiBjYXB0dXJlIHJlYmluZFxuICB0aGlzLm9uY2UoJ2NhcHR1cmUnLCBtZWRpYS5fYmluZFN0cmVhbS5iaW5kKG1lZGlhKSk7XG5cbiAgLy8gcmVtb3ZlIHRoZSByZWZlcmVuY2UgdG8gdGhlIHN0cmVhbVxuICB0aGlzLnN0cmVhbSA9IG51bGw7XG59O1xuXG4vKipcbiAgIyMgRGVidWdnaW5nIFRpcHNcblxuICBDaHJvbWUgYW5kIENocm9taXVtIGNhbiBib3RoIGJlIHN0YXJ0ZWQgd2l0aCB0aGUgZm9sbG93aW5nIGZsYWc6XG5cbiAgYGBgXG4gIC0tdXNlLWZha2UtZGV2aWNlLWZvci1tZWRpYS1zdHJlYW1cbiAgYGBgXG5cbiAgVGhpcyB1c2VzIGEgZmFrZSBzdHJlYW0gZm9yIHRoZSBnZXRVc2VyTWVkaWEoKSBjYWxsIHJhdGhlciB0aGFuIGF0dGVtcHRpbmdcbiAgdG8gY2FwdHVyZSB0aGUgYWN0dWFsIGNhbWVyYS4gIFRoaXMgaXMgdXNlZnVsIHdoZW4gZG9pbmcgYXV0b21hdGVkIHRlc3RpbmdcbiAgYW5kIGFsc28gaWYgeW91IHdhbnQgdG8gdGVzdCBjb25uZWN0aXZpdHkgYmV0d2VlbiB0d28gYnJvd3NlciBpbnN0YW5jZXMgYW5kXG4gIHdhbnQgdG8gZGlzdGluZ3Vpc2ggYmV0d2VlbiB0aGUgdHdvIGxvY2FsIHZpZGVvcy5cblxuICAjIyBJbnRlcm5hbCBNZXRob2RzXG5cbiAgVGhlcmUgYXJlIGEgbnVtYmVyIG9mIGludGVybmFsIG1ldGhvZHMgdGhhdCBhcmUgdXNlZCBpbiB0aGUgYHJ0Yy1tZWRpYWBcbiAgaW1wbGVtZW50YXRpb24uIFRoZXNlIGFyZSBvdXRsaW5lZCBiZWxvdywgYnV0IG5vdCBleHBlY3RlZCB0byBiZSBvZlxuICBnZW5lcmFsIHVzZS5cblxuKiovXG5cbi8qKlxuICAjIyMgX3ByZXBhcmVFbGVtZW50KG9wdHMsIGVsZW1lbnQpXG5cbiAgVGhlIHByZXBhcmVFbGVtZW50IGZ1bmN0aW9uIGlzIHVzZWQgdG8gcHJlcGFyZSBET00gZWxlbWVudHMgdGhhdCB3aWxsXG4gIHJlY2VpdmUgdGhlIG1lZGlhIHN0cmVhbXMgb25jZSB0aGUgc3RyZWFtIGhhdmUgYmVlbiBzdWNjZXNzZnVsbHkgY2FwdHVyZWQuXG4qKi9cbk1lZGlhLnByb3RvdHlwZS5fcHJlcGFyZUVsZW1lbnQgPSBmdW5jdGlvbihvcHRzLCBlbGVtZW50KSB7XG4gIHZhciBwYXJlbnQ7XG4gIHZhciB2YWxpZEVsZW1lbnQgPSAoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxWaWRlb0VsZW1lbnQpIHx8XG4gICAgICAgIChlbGVtZW50IGluc3RhbmNlb2YgSFRNTEF1ZGlvRWxlbWVudCk7XG4gIHZhciBwcmVzZXJ2ZUFzcGVjdFJhdGlvID1cbiAgICAgICAgdHlwZW9mIG9wdHMucHJlc2VydmVBc3BlY3RSYXRpbyA9PSAndW5kZWZpbmVkJyB8fFxuICAgICAgICBvcHRzLnByZXNlcnZlQXNwZWN0UmF0aW87XG5cbiAgLy8gcGVyZm9ybSBzb21lIGFkZGl0aW9uYWwgY2hlY2tzIGZvciB0aGluZ3MgdGhhdCBcImxvb2tcIiBsaWtlIGFcbiAgLy8gbWVkaWEgZWxlbWVudFxuICB2YWxpZEVsZW1lbnQgPSB2YWxpZEVsZW1lbnQgfHwgKHR5cGVvZiBlbGVtZW50LnBsYXkgPT0gJ2Z1bmN0aW9uJykgJiYgKFxuICAgIHR5cGVvZiBlbGVtZW50Lm1velNyY09iamVjdCAhPSAndW5kZWZpbmVkJyB8fFxuICAgIHR5cGVvZiBlbGVtZW50LnNyYyAhPSAndW5kZWZpbmVkJyk7XG5cbiAgLy8gaWYgdGhlIGVsZW1lbnQgaXMgbm90IGEgdmlkZW8gZWxlbWVudCwgdGhlbiBjcmVhdGUgb25lXG4gIGlmICghIHZhbGlkRWxlbWVudCkge1xuICAgIHBhcmVudCA9IGVsZW1lbnQ7XG5cbiAgICAvLyBjcmVhdGUgYSBuZXcgdmlkZW8gZWxlbWVudFxuICAgIC8vIFRPRE86IGNyZWF0ZSBhbiBhcHByb3ByaWF0ZSBlbGVtZW50IGJhc2VkIG9uIHRoZSB0eXBlcyBvZiB0cmFja3NcbiAgICAvLyBhdmFpbGFibGVcbiAgICBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndmlkZW8nKTtcblxuICAgIC8vIGlmIHdlIGFyZSBwcmVzZXJ2aW5nIGFzcGVjdCByYXRpbyBkbyB0aGF0IG5vd1xuICAgIGlmIChwcmVzZXJ2ZUFzcGVjdFJhdGlvKSB7XG4gICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgncHJlc2VydmVBc3BlY3RSYXRpbycsICcnKTtcbiAgICB9XG5cbiAgICAvLyBhZGQgdG8gdGhlIHBhcmVudFxuICAgIHBhcmVudC5hcHBlbmRDaGlsZChlbGVtZW50KTtcbiAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnZGF0YS1wbGF5aW5nJywgZmFsc2UpO1xuICB9XG5cbiAgLy8gaWYgbXV0ZWQsIGluamVjdCB0aGUgbXV0ZWQgYXR0cmlidXRlXG4gIGlmIChlbGVtZW50ICYmIHRoaXMubXV0ZWQpIHtcbiAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnbXV0ZWQnLCAnJyk7XG4gIH1cblxuICAvLyBmbGFnIHRoZSBlbGVtZW50IGFzIGJvdW5kXG4gIHRoaXMuX2JpbmRpbmdzLnB1c2goe1xuICAgIGVsOiBlbGVtZW50LFxuICAgIG9wdHM6IG9wdHNcbiAgfSk7XG5cbiAgcmV0dXJuIGVsZW1lbnQ7XG59O1xuXG4vKipcbiAgIyMjIF9iaW5kU3RyZWFtKHN0cmVhbSlcblxuICBCaW5kIGEgc3RyZWFtIHRvIHByZXZpb3VzbHkgcHJlcGFyZWQgRE9NIGVsZW1lbnRzLlxuXG4qKi9cbk1lZGlhLnByb3RvdHlwZS5fYmluZFN0cmVhbSA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICB2YXIgbWVkaWEgPSB0aGlzO1xuICB2YXIgZWxlbWVudHMgPSBbXTtcbiAgdmFyIHdhaXRpbmcgPSBbXTtcblxuICBmdW5jdGlvbiBjaGVja1dhaXRpbmcoKSB7XG4gICAgLy8gaWYgd2UgaGF2ZSBubyB3YWl0aW5nIGVsZW1lbnRzLCBidXQgc29tZSBlbGVtZW50c1xuICAgIC8vIHRyaWdnZXIgdGhlIHN0YXJ0IGV2ZW50XG4gICAgaWYgKHdhaXRpbmcubGVuZ3RoID09PSAwICYmIGVsZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgIG1lZGlhLmVtaXQoJ3JlbmRlcicsIGVsZW1lbnRzWzBdKTtcblxuICAgICAgZWxlbWVudHMubWFwKGZ1bmN0aW9uKGVsKSB7XG4gICAgICAgIGVsLnNldEF0dHJpYnV0ZSgnZGF0YS1wbGF5aW5nJywgdHJ1ZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBwbGF5YmFja1N0YXJ0ZWQoZXZ0KSB7XG4gICAgdmFyIGVsID0gZXZ0LnRhcmdldCB8fCBldnQuc3JjRWxlbWVudDtcbiAgICB2YXIgdmlkZW9JbmRleCA9IGVsZW1lbnRzLmluZGV4T2YoZWwpO1xuXG4gICAgaWYgKHZpZGVvSW5kZXggPj0gMCkge1xuICAgICAgd2FpdGluZy5zcGxpY2UodmlkZW9JbmRleCwgMSk7XG4gICAgfVxuXG4gICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcigncGxheWluZycsIHBsYXliYWNrU3RhcnRlZCk7XG4gICAgY2hlY2tXYWl0aW5nKCk7XG4gIH1cblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIGJpbmRpbmdzIGFuZCBiaW5kIHRoZSBzdHJlYW1cbiAgZWxlbWVudHMgPSB0aGlzLl9iaW5kaW5ncy5tYXAoZnVuY3Rpb24oYmluZGluZykge1xuICAgIC8vIGNoZWNrIGZvciBtb3pTcmNPYmplY3RcbiAgICBpZiAodHlwZW9mIGJpbmRpbmcuZWwubW96U3JjT2JqZWN0ICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICBiaW5kaW5nLmVsLm1velNyY09iamVjdCA9IHN0cmVhbTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBiaW5kaW5nLmVsLnNyYyA9IG1lZGlhLl9jcmVhdGVPYmplY3RVUkwoc3RyZWFtKSB8fCBzdHJlYW07XG4gICAgfVxuXG4gICAgLy8gYXR0ZW1wdCB0byBwbGF5IHRoZSB2aWRlb1xuICAgIGlmICh0eXBlb2YgYmluZGluZy5lbC5wbGF5ID09ICdmdW5jdGlvbicpIHtcbiAgICAgIGJpbmRpbmcuZWwucGxheSgpO1xuICAgIH1cblxuICAgIHJldHVybiBiaW5kaW5nLmVsO1xuICB9KTtcblxuICAvLyBmaW5kIHRoZSBlbGVtZW50cyB3ZSBhcmUgd2FpdGluZyBvblxuICB3YWl0aW5nID0gZWxlbWVudHMuZmlsdGVyKGZ1bmN0aW9uKGVsKSB7XG4gICAgcmV0dXJuIGVsLnJlYWR5U3RhdGUgPCAzOyAvLyByZWFkeXN0YXRlIDwgSEFWRV9GVVRVUkVfREFUQVxuICB9KTtcblxuICAvLyB3YWl0IGZvciBhbGwgdGhlIHZpZGVvIGVsZW1lbnRzXG4gIHdhaXRpbmcubWFwKGZ1bmN0aW9uKGVsKSB7XG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcigncGxheWluZycsIHBsYXliYWNrU3RhcnRlZCwgZmFsc2UpO1xuICB9KTtcblxuICBjaGVja1dhaXRpbmcoKTtcbn07XG5cbi8qKlxuICAjIyMgX3VuYmluZCgpXG5cbiAgR3JhY2VmdWxseSBkZXRhY2ggZWxlbWVudHMgdGhhdCBhcmUgdXNpbmcgdGhlIHN0cmVhbSBmcm9tIHRoZVxuICBjdXJyZW50IHN0cmVhbS5cbioqL1xuTWVkaWEucHJvdG90eXBlLl91bmJpbmQgPSBmdW5jdGlvbihvcHRzKSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIG9wdHNcbiAgb3B0cyA9IG9wdHMgfHwge307XG5cbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBiaW5kaW5ncyBhbmQgZGV0YWNoIHN0cmVhbXNcbiAgdGhpcy5fYmluZGluZ3MuZm9yRWFjaChmdW5jdGlvbihiaW5kaW5nKSB7XG4gICAgdmFyIGVsZW1lbnQgPSBiaW5kaW5nLmVsO1xuXG4gICAgLy8gcmVtb3ZlIHRoZSBzb3VyY2VcbiAgICBlbGVtZW50LnNyYyA9IG51bGw7XG5cbiAgICAvLyBjaGVjayBmb3IgbW96XG4gICAgaWYgKGVsZW1lbnQubW96U3JjT2JqZWN0KSB7XG4gICAgICBlbGVtZW50Lm1velNyY09iamVjdCA9IG51bGw7XG4gICAgfVxuXG4gICAgLy8gY2hlY2sgZm9yIGN1cnJlbnRTcmNcbiAgICBpZiAoZWxlbWVudC5jdXJyZW50U3JjKSB7XG4gICAgICBlbGVtZW50LmN1cnJlbnRTcmMgPSBudWxsO1xuICAgIH1cbiAgfSk7XG59O1xuXG4vKipcbiAgIyMjIF9jcmVhdGVPYmplY3RVcmwoc3RyZWFtKVxuXG4gIFRoaXMgbWV0aG9kIGlzIHVzZWQgdG8gY3JlYXRlIGFuIG9iamVjdCB1cmwgdGhhdCBjYW4gYmUgYXR0YWNoZWQgdG8gYSB2aWRlb1xuICBvciBhdWRpbyBlbGVtZW50LiAgT2JqZWN0IHVybHMgYXJlIGNhY2hlZCB0byBlbnN1cmUgb25seSBvbmUgaXMgY3JlYXRlZFxuICBwZXIgc3RyZWFtLlxuKiovXG5NZWRpYS5wcm90b3R5cGUuX2NyZWF0ZU9iamVjdFVSTCA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICB0cnkge1xuICAgIHJldHVybiB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChzdHJlYW0pO1xuICB9XG4gIGNhdGNoIChlKSB7XG4gIH1cbn07XG5cbi8qKlxuICAjIyMgX2hhbmRsZVN1Y2Nlc3Moc3RyZWFtKVxuXG4gIEhhbmRsZSB0aGUgc3VjY2VzcyBjb25kaXRpb24gb2YgYSBgZ2V0VXNlck1lZGlhYCBjYWxsLlxuXG4qKi9cbk1lZGlhLnByb3RvdHlwZS5faGFuZGxlU3VjY2VzcyA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICAvLyB1cGRhdGUgdGhlIGFjdGl2ZSBzdHJlYW0gdGhhdCB3ZSBhcmUgY29ubmVjdGVkIHRvXG4gIHRoaXMuc3RyZWFtID0gc3RyZWFtO1xuXG4gIC8vIGVtaXQgdGhlIHN0cmVhbSBldmVudFxuICB0aGlzLmVtaXQoJ3N0cmVhbScsIHN0cmVhbSk7XG59O1xuXG4vKipcbiAgIyMjIF9oYW5kbGVGYWlsKGV2dClcblxuICBIYW5kbGUgdGhlIGZhaWx1cmUgY29uZGl0aW9uIG9mIGEgYGdldFVzZXJNZWRpYWAgY2FsbC5cblxuKiovXG5NZWRpYS5wcm90b3R5cGUuX2hhbmRsZUZhaWwgPSBmdW5jdGlvbihlcnIpIHtcbiAgdGhpcy5lbWl0KCdlcnJvcicsIGVycik7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKSgncnRjLXNpZ25hbGxlci1hbm5vdW5jZScpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcbnZhciByb2xlcyA9IFsnYScsICdiJ107XG5cbi8qKlxuICAjIyMgYW5ub3VuY2VcblxuICBgYGBcbiAgL2Fubm91bmNlfHtcImlkXCI6IFwiLi4uXCIsIC4uLiB9XG4gIGBgYFxuXG4gIFdoZW4gYW4gYW5ub3VuY2UgbWVzc2FnZSBpcyByZWNlaXZlZCBieSB0aGUgc2lnbmFsbGVyLCB0aGUgYXR0YWNoZWRcbiAgb2JqZWN0IGRhdGEgaXMgZGVjb2RlZCBhbmQgdGhlIHNpZ25hbGxlciBlbWl0cyBhbiBgYW5ub3VuY2VgIG1lc3NhZ2UuXG5cbiAgIyMjIyBFdmVudHMgVHJpZ2dlcmVkIGluIHJlc3BvbnNlIHRvIGAvYW5ub3VuY2VgXG5cbiAgVGhlcmUgYXJlIHR3byBkaWZmZXJlbnQgdHlwZXMgb2YgYHBlZXI6YCBldmVudHMgdGhhdCBjYW4gYmUgdHJpZ2dlcmVkXG4gIGluIG9uIHBlZXIgQiB0byBjYWxsaW5nIHRoZSBgYW5ub3VuY2VgIG1ldGhvZCBvbiBwZWVyIEEuXG5cbiAgLSBgcGVlcjphbm5vdW5jZWBcblxuICAgIFRoZSBgcGVlcjphbm5vdW5jZWAgZXZlbnQgaXMgdHJpZ2dlcmVkIHdoZW4gYSBuZXcgcGVlciBoYXMgYmVlblxuICAgIGRpc2NvdmVyZWQuICBUaGUgZGF0YSBmb3IgdGhlIG5ldyBwZWVyIChhcyBhbiBKUyBvYmplY3QpIGlzIHByb3ZpZGVkXG4gICAgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IG9mIHRoZSBldmVudCBoYW5kbGVyLlxuXG4gIC0gYHBlZXI6dXBkYXRlYFxuXG4gICAgSWYgYSBwZWVyIFwicmVhbm5vdW5jZXNcIiB0aGVuIGEgYHBlZXI6dXBkYXRlYCBldmVudCB3aWxsIGJlIHRyaWdnZXJlZFxuICAgIHJhdGhlciB0aGFuIGEgYHBlZXI6YW5ub3VuY2VgIGV2ZW50LlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2lnbmFsbGVyKSB7XG5cbiAgZnVuY3Rpb24gY29weURhdGEodGFyZ2V0LCBzb3VyY2UpIHtcbiAgICBpZiAodGFyZ2V0ICYmIHNvdXJjZSkge1xuICAgICAgZm9yICh2YXIga2V5IGluIHNvdXJjZSkge1xuICAgICAgICBpZiAoa2V5ICE9ICdjbG9jaycpIHtcbiAgICAgICAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihhcmdzLCBtZXNzYWdlVHlwZSwgY2xvY2spIHtcbiAgICB2YXIgZGF0YSA9IGFyZ3NbMF07XG4gICAgdmFyIHBlZXI7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIHZhbGlkIGRhdGEgdGhlbiBwcm9jZXNzXG4gICAgaWYgKGRhdGEgJiYgZGF0YS5pZCkge1xuICAgICAgLy8gY2hlY2sgdG8gc2VlIGlmIHRoaXMgaXMgYSBrbm93biBwZWVyXG4gICAgICBwZWVyID0gc2lnbmFsbGVyLnBlZXJzLmdldChkYXRhLmlkKTtcblxuICAgICAgLy8gaWYgdGhlIHBlZXIgaXMgZXhpc3RpbmcsIHRoZW4gdXBkYXRlIHRoZSBkYXRhXG4gICAgICBpZiAocGVlcikge1xuICAgICAgICBkZWJ1Zygnc2lnbmFsbGVyOiAnICsgc2lnbmFsbGVyLmlkICsgJyByZWNlaXZlZCB1cGRhdGUsIGRhdGE6ICcsIGRhdGEpO1xuXG4gICAgICAgIC8vIHVwZGF0ZSB0aGUgZGF0YVxuICAgICAgICBjb3B5RGF0YShwZWVyLmRhdGEsIGRhdGEpO1xuXG4gICAgICAgIC8vIHRyaWdnZXIgdGhlIHBlZXIgdXBkYXRlIGV2ZW50XG4gICAgICAgIHJldHVybiBzaWduYWxsZXIuZW1pdCgncGVlcjp1cGRhdGUnLCBkYXRhKTtcbiAgICAgIH1cblxuICAgICAgLy8gY3JlYXRlIGEgbmV3IHBlZXJcbiAgICAgIHBlZXIgPSB7XG4gICAgICAgIGlkOiBkYXRhLmlkLFxuXG4gICAgICAgIC8vIGluaXRpYWxpc2UgdGhlIGxvY2FsIHJvbGUgaW5kZXhcbiAgICAgICAgcm9sZUlkeDogW2RhdGEuaWQsIHNpZ25hbGxlci5pZF0uc29ydCgpLmluZGV4T2YoZGF0YS5pZCksXG5cbiAgICAgICAgLy8gaW5pdGlhbGlzZSB0aGUgdmVjdG9yIGNsb2NrXG4gICAgICAgIGNsb2NrOiBjbG9jayB8fCB7IGE6IDAsIGI6IDAgfSxcblxuICAgICAgICAvLyBpbml0aWFsaXNlIHRoZSBwZWVyIGRhdGFcbiAgICAgICAgZGF0YToge31cbiAgICAgIH07XG5cbiAgICAgIC8vIGluaXRpYWxpc2UgdGhlIHBlZXIgZGF0YVxuICAgICAgY29weURhdGEocGVlci5kYXRhLCBkYXRhKTtcblxuICAgICAgLy8gc2V0IHRoZSBwZWVyIGRhdGFcbiAgICAgIHNpZ25hbGxlci5wZWVycy5zZXQoZGF0YS5pZCwgcGVlcik7XG5cbiAgICAgIC8vIGlmIHRoaXMgaXMgYW4gaW5pdGlhbCBhbm5vdW5jZSBtZXNzYWdlIChubyB2ZWN0b3IgY2xvY2sgYXR0YWNoZWQpXG4gICAgICAvLyB0aGVuIHNlbmQgYSBhbm5vdW5jZSByZXBseVxuICAgICAgaWYgKHNpZ25hbGxlci5hdXRvcmVwbHkgJiYgKCEgY2xvY2spKSB7XG4gICAgICAgIHNpZ25hbGxlclxuICAgICAgICAgIC50byhkYXRhLmlkKVxuICAgICAgICAgIC5zZW5kKCcvYW5ub3VuY2UnLCBzaWduYWxsZXIuYXR0cmlidXRlcyk7XG4gICAgICB9XG5cbiAgICAgIC8vIGVtaXQgYSBuZXcgcGVlciBhbm5vdW5jZSBldmVudFxuICAgICAgcmV0dXJuIHNpZ25hbGxlci5lbWl0KCdwZWVyOmFubm91bmNlJywgZGF0YSwgcGVlcik7XG4gICAgfVxuICB9O1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyMgc2lnbmFsbGVyIG1lc3NhZ2UgaGFuZGxlcnNcblxuKiovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2lnbmFsbGVyKSB7XG4gIHJldHVybiB7XG4gICAgYW5ub3VuY2U6IHJlcXVpcmUoJy4vYW5ub3VuY2UnKShzaWduYWxsZXIpLFxuICAgIGxlYXZlOiByZXF1aXJlKCcuL2xlYXZlJykoc2lnbmFsbGVyKSxcbiAgICBsb2NrOiByZXF1aXJlKCcuL2xvY2snKShzaWduYWxsZXIpLFxuICAgIHVubG9jazogcmVxdWlyZSgnLi91bmxvY2snKShzaWduYWxsZXIpXG4gIH07XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIyMgbGVhdmVcblxuICBgYGBcbiAgL2xlYXZlfHtcImlkXCI6XCIuLi5cIn1cbiAgYGBgXG5cbiAgV2hlbiBhIGxlYXZlIG1lc3NhZ2UgaXMgcmVjZWl2ZWQgZnJvbSBhIHBlZXIsIHdlIGNoZWNrIHRvIHNlZSBpZiB0aGF0IGlzXG4gIGEgcGVlciB0aGF0IHdlIGFyZSBtYW5hZ2luZyBzdGF0ZSBpbmZvcm1hdGlvbiBmb3IgYW5kIGlmIHdlIGFyZSB0aGVuIHRoZVxuICBwZWVyIHN0YXRlIGlzIHJlbW92ZWQuXG5cbiAgIyMjIyBFdmVudHMgdHJpZ2dlcmVkIGluIHJlc3BvbnNlIHRvIGAvbGVhdmVgIG1lc3NhZ2VzXG5cbiAgVGhlIGZvbGxvd2luZyBldmVudChzKSBhcmUgdHJpZ2dlcmVkIHdoZW4gYSBgL2xlYXZlYCBhY3Rpb24gaXMgcmVjZWl2ZWRcbiAgZnJvbSBhIHBlZXIgc2lnbmFsbGVyOlxuXG4gIC0gYHBlZXI6bGVhdmVgXG5cbiAgICBUaGUgYHBlZXI6bGVhdmVgIGV2ZW50IGlzIGVtaXR0ZWQgb25jZSBhIGAvbGVhdmVgIG1lc3NhZ2UgaXMgY2FwdHVyZWRcbiAgICBmcm9tIGEgcGVlci4gIFByaW9yIHRvIHRoZSBldmVudCBiZWluZyBkaXNwYXRjaGVkLCB0aGUgaW50ZXJuYWwgcGVlcnNcbiAgICBkYXRhIGluIHRoZSBzaWduYWxsZXIgaXMgcmVtb3ZlZCBidXQgY2FuIGJlIGFjY2Vzc2VkIGluIDJuZCBhcmd1bWVudFxuICAgIG9mIHRoZSBldmVudCBoYW5kbGVyLlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2lnbmFsbGVyKSB7XG4gIHJldHVybiBmdW5jdGlvbihhcmdzKSB7XG4gICAgdmFyIGRhdGEgPSBhcmdzWzBdO1xuICAgIHZhciBwZWVyID0gc2lnbmFsbGVyLnBlZXJzLmdldChkYXRhICYmIGRhdGEuaWQpO1xuXG4gICAgLy8gcmVtb3ZlIHRoZSBwZWVyIGZyb20gdGhlIHBlZXJzIGRhdGFcbiAgICBpZiAocGVlcikge1xuICAgICAgc2lnbmFsbGVyLnBlZXJzLmRlbGV0ZShkYXRhLmlkKTtcbiAgICB9XG5cbiAgICAvLyBlbWl0IHRoZSBldmVudFxuICAgIHNpZ25hbGxlci5lbWl0KCdwZWVyOmxlYXZlJywgZGF0YS5pZCwgcGVlcik7XG4gIH07XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKSgncnRjLXNpZ25hbGxlci1sb2NrJyk7XG52YXIgdmMgPSByZXF1aXJlKCd2ZWN0b3JjbG9jaycpO1xudmFyIEZhc3RNYXAgPSByZXF1aXJlKCdjb2xsZWN0aW9ucy9mYXN0LW1hcCcpO1xuXG4vKipcbiAgIyMjIGxvY2tcblxuICBgYGBcbiAgL2xvY2tcbiAgYGBgXG5cbiAgQSBgL2xvY2tgIHJlcXVlc3QgY2FuIG9ubHkgYmUgc2VudCB3aXRoaW4gdGhlIGNvbnRleHQgb2YgYSBgL3RvYCBtZXNzYWdlXG4gIGFuZCB0aHVzIG11c3QgY29udGFpbiBzb3VyY2UgZGF0YSB0byBiZSBwcm9jZXNzZWQgY29ycmVjdGx5LiAgVGhlIGAvbG9ja2BcbiAgbWVzc2FnZSBpcyB1c2VkIHRvIGNvb3JkaW5hdGUgYmV0d2VuIHR3byByZW1vdGUgcGVlcnMgaW4gdGhlIGNhc2UgdGhhdFxuICBib3RoIHBlZXJzIHdoaWNoIHRvIGNvbW1lbmNlIHJlbmVnb3RpYXRpb24gYXQgdGhlIHNhbWUgdGltZS5cblxuICBJbiB0aGUgY2FzZSB0aGF0IHR3byBwZWVycyBhdHRlbXB0IHRvIHJlbmVnb3RpYXRlIHdpdGggZWFjaCBvdGhlciBhdCB0aGVcbiAgc2FtZSB0aW1lLCB0aGVuIHRoZSBwZWVyIHRoYXQgaGFzIGJlZW4gaWRlbnRpZmllZCBhcyBwYXJ0eSBgYWAgaW4gdGhlIHBlZXJcbiAgcmVsYXRpb25zaGlwIHdpbGwgdGFrZSBvbiB0aGUgcm9sZSBvZiB0aGUgaW5pdGlhdG9yIGluIHRoZSBuZWdvdGlhdGlvbiBhbmRcbiAgcGFydHkgYGJgIHdpbGwgcmVzcG9uZCB0byB0aGUgb2ZmZXIgc2RwLlxuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2lnbmFsbGVyKSB7XG4gIHJldHVybiBmdW5jdGlvbihhcmdzLCBtZXNzYWdlVHlwZSwgY2xvY2ssIHNyY1N0YXRlKSB7XG4gICAgdmFyIGNsb2NrQ29tcGFyaXNvbjtcbiAgICB2YXIgc3VjY2VzcyA9IGZhbHNlO1xuICAgIHZhciBsYWJlbCA9IGFyZ3NbMF07XG5cbiAgICAvLyBpZiB3ZSBkb24ndCBoYXZlIGEgY2xvY2sgdmFsdWUgb3IgZG9uJ3Qga25vdyBhYm91dCB0aGUgc291cmNlXG4gICAgLy8gdGhlbiBqdXN0IGRyb3AgdGhlIG1lc3NhZ2VcbiAgICBpZiAoKCEgY2xvY2spIHx8ICghIHNyY1N0YXRlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGRlYnVnKCdyZWNlaXZlZCBcIicgKyBsYWJlbCArICdcIiBsb2NrIHJlcXVlc3QgZnJvbSBzcmM6ICcgKyBzcmNTdGF0ZS5pZCk7XG4gICAgY2xvY2tDb21wYXJpc29uID0gdmMuY29tcGFyZShjbG9jaywgc3JjU3RhdGUuY2xvY2spO1xuXG4gICAgLy8gaWYgdGhlIHJlbW90ZSBjbG9jayBpcyBncmVhdGVyIHRoYW4gdGhlIGxvY2sgY2xvY2sgc3RhdGVcbiAgICAvLyB0aGVuIHRoZSBsb2NrIGlzIGF1dG9tYXRpY2FsbHkgc3VjY2Vzc2Z1bFxuICAgIHN1Y2Nlc3MgPSAoISBzaWduYWxsZXIubG9ja3MuZ2V0KGxhYmVsKSkgfHxcbiAgICAgIGNsb2NrQ29tcGFyaXNvbiA+IDAgfHxcbiAgICAgIChjbG9ja0NvbXBhcmlzb24gPT09IDAgJiYgc3JjU3RhdGUucm9sZUlkeCA9PT0gMCk7XG5cbiAgICBkZWJ1Zygnc2lnbmFsbGVyICcgKyBzaWduYWxsZXIuaWQgKyAnIGNoZWNraW5nIGxvY2sgc3RhdGUnKTtcbiAgICBkZWJ1ZygnY2xvY2sgdmFsdWUgaW4gbWVzc2FnZTogJywgY2xvY2spO1xuICAgIGRlYnVnKCdjYWNoZWQgcGVlciBjbG9jayBzdGF0ZTogJywgc3JjU3RhdGUuY2xvY2spO1xuICAgIGRlYnVnKCdjbG9jayBjb21wYXJpc29uID0gJyArIGNsb2NrQ29tcGFyaXNvbiArICcgb2s6ICcgKyBzdWNjZXNzLCBzcmNTdGF0ZSk7XG5cbiAgICAvLyBpZiB0aGUgbG9jayBpcyBzdWNjZXNzZnVsLCB0aGVuIGFkZCB0aGUgbG9jayBpbmZvIHRvIHRoZSBzcmNTdGF0ZVxuICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAvLyBlbnN1cmUgd2UgaGF2ZSBhIGxvY2tzIG1lbWJlclxuICAgICAgc3JjU3RhdGUubG9ja3MgPSBzcmNTdGF0ZS5sb2NrcyB8fCBuZXcgRmFzdE1hcCgpO1xuXG4gICAgICAvLyBjcmVhdGUgdGhlIGxvY2tcbiAgICAgIHNyY1N0YXRlLmxvY2tzLnNldChsYWJlbCwgeyBpZDogYXJnc1sxXSB8fCAnJyB9KTtcbiAgICB9XG5cbiAgICAvLyBzZW5kIHRoZSBsb2NrIHJlc3VsdFxuICAgIHNpZ25hbGxlci50byhzcmNTdGF0ZS5pZCkuc2VuZCgnL2xvY2tyZXN1bHQnLCB7XG4gICAgICBsYWJlbDogbGFiZWwsXG4gICAgICBvazogc3VjY2Vzc1xuICAgIH0pO1xuICB9O1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGVidWcgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJykoJ3J0Yy1zaWduYWxsZXItbG9jaycpO1xudmFyIHZjID0gcmVxdWlyZSgndmVjdG9yY2xvY2snKTtcblxuLyoqXG4gICMjIyB1bmxvY2tcblxuICBgYGBcbiAgL3VubG9ja3xsYWJlbFxuICBgYGBcblxuICBDbGVhciBhIHJlbW90ZSBsb2NrXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzaWduYWxsZXIpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGFyZ3MsIG1lc3NhZ2VUeXBlLCBjbG9jaywgc3JjU3RhdGUpIHtcbiAgICB2YXIgbGFiZWwgPSBhcmdzWzBdO1xuICAgIHZhciBvayA9IGZhbHNlO1xuXG4gICAgLy8gaWYgd2UgZG9uJ3QgaGF2ZSBhIGNsb2NrIHZhbHVlIG9yIGRvbid0IGtub3cgYWJvdXQgdGhlIHNvdXJjZVxuICAgIC8vIHRoZW4ganVzdCBkcm9wIHRoZSBtZXNzYWdlXG4gICAgaWYgKCghIGNsb2NrKSB8fCAoISBzcmNTdGF0ZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBkZWJ1ZygncmVjZWl2ZWQgXCInICsgbGFiZWwgKyAnXCIgdW5sb2NrIHJlcXVlc3QgZnJvbSBzcmM6ICcgKyBzcmNTdGF0ZS5pZCk7XG5cbiAgICAvLyBpZiB0aGUgcGVlciBoYXMgYW4gYWN0aXZlIGxvY2ssIHJlbW92ZSBpdFxuICAgIGlmIChzcmNTdGF0ZS5sb2Nrcykge1xuICAgICAgLy8gVE9ETzogY2hlY2sgZm9yIGEgbWF0Y2hpbmcgbG9ja2lkXG4gICAgICBzcmNTdGF0ZS5sb2Nrcy5kZWxldGUobGFiZWwpO1xuICAgICAgb2sgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIHNlbmQgdGhlIGxvY2sgbWVzc2FnZVxuICAgIHNpZ25hbGxlci50byhzcmNTdGF0ZS5pZCkuc2VuZCgnL3VubG9ja3Jlc3VsdCcsIHtcbiAgICAgIGxhYmVsOiBsYWJlbCxcbiAgICAgIG9rOiBva1xuICAgIH0pO1xuICB9O1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGVidWcgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJykoJ3J0Yy1zaWduYWxsZXInKTtcbnZhciBkZXRlY3QgPSByZXF1aXJlKCdydGMtY29yZS9kZXRlY3QnKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG52YXIgdXVpZCA9IHJlcXVpcmUoJ3V1aWQnKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG52YXIgRmFzdE1hcCA9IHJlcXVpcmUoJ2NvbGxlY3Rpb25zL2Zhc3QtbWFwJyk7XG52YXIgdmMgPSByZXF1aXJlKCd2ZWN0b3JjbG9jaycpO1xuXG4vKipcbiAgIyBydGMtc2lnbmFsbGVyXG5cbiAgVGhlIGBydGMtc2lnbmFsbGVyYCBtb2R1bGUgcHJvdmlkZXMgYSB0cmFuc3BvcnRsZXNzIHNpZ25hbGxpbmdcbiAgbWVjaGFuaXNtIGZvciBXZWJSVEMuXG5cbiAgIyMgUHVycG9zZVxuXG4gIFRoZSBzaWduYWxsZXIgcHJvdmlkZXMgc2V0IG9mIGNsaWVudC1zaWRlIHRvb2xzIHRoYXQgYXNzaXN0IHdpdGggdGhlXG4gIHNldHRpbmcgdXAgYW4gYFBlZXJDb25uZWN0aW9uYCBhbmQgaGVscGluZyB0aGVtIGNvbW11bmljYXRlLiBBbGwgdGhhdCBpc1xuICByZXF1aXJlZCBmb3IgdGhlIHNpZ25hbGxlciB0byBvcGVyYXRlIGlzIGEgc3VpdGFibGUgbWVzc2VuZ2VyLlxuXG4gIEEgbWVzc2VuZ2VyIGlzIGEgc2ltcGxlIG9iamVjdCB0aGF0IGltcGxlbWVudHMgbm9kZVxuICBbRXZlbnRFbWl0dGVyXShodHRwOi8vbm9kZWpzLm9yZy9hcGkvZXZlbnRzLmh0bWwpIHN0eWxlIGBvbmAgZXZlbnRzIGZvclxuICBgb3BlbmAsIGBjbG9zZWAsIGBtZXNzYWdlYCBldmVudHMsIGFuZCBhbHNvIGEgYHNlbmRgIG1ldGhvZCBieSB3aGljaFxuICBkYXRhIHdpbGwgYmUgc2VuZCBcIm92ZXItdGhlLXdpcmVcIi5cblxuICBCeSB1c2luZyB0aGlzIGFwcHJvYWNoLCB3ZSBjYW4gY29uZHVjdCBzaWduYWxsaW5nIG92ZXIgYW55IG51bWJlciBvZlxuICBtZWNoYW5pc21zOlxuXG4gIC0gbG9jYWwsIGluIG1lbW9yeSBtZXNzYWdlIHBhc3NpbmdcbiAgLSB2aWEgV2ViU29ja2V0cyBhbmQgaGlnaGVyIGxldmVsIGFic3RyYWN0aW9ucyAoc3VjaCBhc1xuICAgIFtwcmltdXNdKGh0dHBzOi8vZ2l0aHViLmNvbS9wcmltdXMvcHJpbXVzKSlcbiAgLSBhbHNvIG92ZXIgV2ViUlRDIGRhdGEtY2hhbm5lbHMgKHZlcnkgbWV0YSwgYW5kIGFkbWl0dGVkbHkgYSBsaXR0bGVcbiAgICBjb21wbGljYXRlZCkuXG5cbiAgIyMgR2V0dGluZyBTdGFydGVkXG5cbiAgVG8gd29yayB3aXRoIHRoZSBzaWduYWxsZXIsIHlvdSBmaXJzdCBuZWVkIGEgbWVzc2VuZ2VyIG9mIHNvbWUga2luZC4gSWYgeW91XG4gIGhhdmUgcnVuIHVwIGEgdmVyc2lvbiBvZiB0aGVcbiAgW3J0Yy1zd2l0Y2hib2FyZF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtc3dpdGNoYm9hcmQpIHNvbWV3aGVyZSB0aGVuXG4gIHRoZSBmb2xsb3dpbmcgZXhhbXBsZSBzaG91bGQgd29yazpcblxuICA8PDwgZXhhbXBsZXMvc2lnbmFsbGluZy12aWEtc3dpdGNoYm9hcmQuanNcblxuICBXaGlsZSB0aGUgZXhhbXBsZSBhYm92ZSBkZW1vbnN0cmF0ZXMgY29tbXVuaWNhdGlvbiBiZXR3ZWVuIHR3byBlbmRwb2ludHNcbiAgdmlhIHdlYnNvY2tldHMsIGl0IGRvZXMgbm90IGdvIGludG8gZGV0YWlsIG9uIHNldHRpbmcgdXAgYSBXZWJSVEMgcGVlclxuICBjb25uZWN0aW9uIChhcyB0aGF0IGlzIHNpZ25pZmljYW50bHkgbW9yZSBpbnZvbHZlZCkuICBJZiB5b3UgYXJlIGxvb2tpbmcgZm9yXG4gIGFuIGVhc3kgd2F5IHRvIGRvIHRoaXMsIEknZCByZWNvbW1lbmQgY2hlY2tpbmcgb3V0XG4gIFtydGMtcXVpY2tjb25uZWN0XShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1xdWlja2Nvbm5lY3QpIG9yXG4gIFtydGMtZ2x1ZV0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtZ2x1ZSkuXG5cbiAgIyMgU2lnbmFsIEZsb3cgRGlhZ3JhbXNcblxuICBEaXNwbGF5ZWQgYmVsb3cgYXJlIHNvbWUgZGlhZ3JhbXMgaG93IHRoZSBzaWduYWxsaW5nIGZsb3cgYmV0d2VlbiBwZWVyc1xuICBiZWhhdmVzLiAgSW4gZWFjaCBvZiB0aGUgZGlhZ3JhbXMgd2UgaWxsdXN0cmF0ZSB0aHJlZSBwZWVycyAoQSwgQiBhbmQgQylcbiAgcGFydGljaXBhdGluZyBkaXNjb3ZlcnkgYW5kIGNvb3JkaW5hdGluZyBSVENQZWVyQ29ubmVjdGlvbiBoYW5kc2hha2VzLlxuXG4gIEluIGVhY2ggY2FzZSwgb25seSB0aGUgaW50ZXJhY3Rpb24gYmV0d2VlbiB0aGUgY2xpZW50cyBpcyByZXByZXNlbnRlZCBub3RcbiAgaG93IGEgc2lnbmFsbGluZyBzZXJ2ZXJcbiAgKHN1Y2ggYXMgW3J0Yy1zd2l0Y2hib2FyZF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtc3dpdGNoYm9hcmQpKSB3b3VsZFxuICBwYXNzIG9uIGJyb2FkY2FzdCBtZXNzYWdlcywgZXRjLiAgVGhpcyBpcyBkb25lIGZvciB0d28gcmVhc29uczpcblxuICAxLiBJdCBpcyBvdXQgb2Ygc2NvcGUgb2YgdGhpcyBkb2N1bWVudGF0aW9uLlxuICAyLiBUaGUgYHJ0Yy1zaWduYWxsZXJgIGhhcyBiZWVuIGRlc2lnbmVkIHRvIHdvcmsgd2l0aG91dCBoYXZpbmcgdG8gcmVseSBvblxuICAgICBhbnkgaW50ZWxsaWdlbmNlIGluIHRoZSBzZXJ2ZXIgc2lkZSBzaWduYWxsaW5nIGNvbXBvbmVudC4gIEluIHRoZVxuICAgICBpbnN0YW5jZSB0aGF0IGEgc2lnbmFsbGVyIGJyb2FkY2FzdHMgYWxsIG1lc3NhZ2VzIHRvIGFsbCBjb25uZWN0ZWQgcGVlcnNcbiAgICAgdGhlbiBgcnRjLXNpZ25hbGxlcmAgc2hvdWxkIGJlIHNtYXJ0IGVub3VnaCB0byBtYWtlIHN1cmUgZXZlcnl0aGluZyB3b3Jrc1xuICAgICBhcyBleHBlY3RlZC5cblxuICAjIyMgUGVlciBEaXNjb3ZlcnkgLyBBbm5vdW5jZW1lbnRcblxuICBUaGlzIGRpYWdyYW0gaWxsdXN0cmF0ZXMgdGhlIHByb2Nlc3Mgb2YgaG93IHBlZXIgYEFgIGFubm91bmNlcyBpdHNlbGYgdG9cbiAgcGVlcnMgYEJgIGFuZCBgQ2AsIGFuZCBpbiB0dXJuIHRoZXkgYW5ub3VuY2UgdGhlbXNlbHZlcy5cblxuICAhW10oaHR0cHM6Ly9yYXcuZ2l0aHViLmNvbS9ydGMtaW8vcnRjLXNpZ25hbGxlci9tYXN0ZXIvZG9jcy9hbm5vdW5jZS5wbmcpXG5cbiAgIyMjIEVkaXRpbmcgLyBVcGRhdGluZyB0aGUgRGlhZ3JhbXNcblxuICBFYWNoIG9mIHRoZSBkaWFncmFtcyBoYXMgYmVlbiBnZW5lcmF0ZWQgdXNpbmdcbiAgW21zY2dlbl0oaHR0cDovL3d3dy5tY3Rlcm5hbi5tZS51ay9tc2NnZW4vaW5kZXguaHRtbCkgYW5kIHRoZSBzb3VyY2UgZm9yXG4gIHRoZXNlIGRvY3VtZW50cyBjYW4gYmUgZm91bmQgaW4gdGhlIGBkb2NzL2AgZm9sZGVyIG9mIHRoaXMgcmVwb3NpdG9yeS5cblxuICAjIyBSZWZlcmVuY2VcblxuICBUaGUgYHJ0Yy1zaWduYWxsZXJgIG1vZHVsZSBpcyBkZXNpZ25lZCB0byBiZSB1c2VkIHByaW1hcmlseSBpbiBhIGZ1bmN0aW9uYWxcbiAgd2F5IGFuZCB3aGVuIGNhbGxlZCBpdCBjcmVhdGVzIGEgbmV3IHNpZ25hbGxlciB0aGF0IHdpbGwgZW5hYmxlXG4gIHlvdSB0byBjb21tdW5pY2F0ZSB3aXRoIG90aGVyIHBlZXJzIHZpYSB5b3VyIG1lc3NhZ2luZyBuZXR3b3JrLlxuXG4gIGBgYGpzXG4gIC8vIGNyZWF0ZSBhIHNpZ25hbGxlciBmcm9tIHNvbWV0aGluZyB0aGF0IGtub3dzIGhvdyB0byBzZW5kIG1lc3NhZ2VzXG4gIHZhciBzaWduYWxsZXIgPSByZXF1aXJlKCdydGMtc2lnbmFsbGVyJykobWVzc2VuZ2VyKTtcbiAgYGBgXG5cbioqL1xudmFyIHNpZyA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obWVzc2VuZ2VyLCBvcHRzKSB7XG5cbiAgLy8gZ2V0IHRoZSBhdXRvcmVwbHkgc2V0dGluZ1xuICB2YXIgYXV0b3JlcGx5ID0gKG9wdHMgfHwge30pLmF1dG9yZXBseTtcblxuICAvLyBjcmVhdGUgdGhlIHNpZ25hbGxlclxuICB2YXIgc2lnbmFsbGVyID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIGlkXG4gIHZhciBpZCA9IHNpZ25hbGxlci5pZCA9IHV1aWQudjQoKTtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBhdHRyaWJ1dGVzXG4gIHZhciBhdHRyaWJ1dGVzID0gc2lnbmFsbGVyLmF0dHJpYnV0ZXMgPSB7XG4gICAgYnJvd3NlcjogZGV0ZWN0LmJyb3dzZXIsXG4gICAgYnJvd3NlclZlcnNpb246IGRldGVjdC5icm93c2VyVmVyc2lvbixcbiAgICBpZDogaWRcbiAgfTtcblxuICAvLyBjcmVhdGUgdGhlIHBlZXJzIG1hcFxuICB2YXIgcGVlcnMgPSBzaWduYWxsZXIucGVlcnMgPSBuZXcgRmFzdE1hcCgpO1xuXG4gIC8vIGNyZWF0ZSBvdXIgbG9ja3MgbWFwXG4gIHZhciBsb2NrcyA9IHNpZ25hbGxlci5sb2NrcyA9IG5ldyBGYXN0TWFwKCk7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgZGF0YSBldmVudCBuYW1lXG4gIHZhciBkYXRhRXZlbnQgPSAob3B0cyB8fCB7fSkuZGF0YUV2ZW50IHx8ICdkYXRhJztcbiAgdmFyIG9wZW5FdmVudCA9IChvcHRzIHx8IHt9KS5vcGVuRXZlbnQgfHwgJ29wZW4nO1xuICB2YXIgd3JpdGVNZXRob2QgPSAob3B0cyB8fCB7fSkud3JpdGVNZXRob2QgfHwgJ3dyaXRlJztcbiAgdmFyIGNsb3NlTWV0aG9kID0gKG9wdHMgfHwge30pLmNsb3NlTWV0aG9kIHx8ICdjbG9zZSc7XG5cbiAgLy8gZXh0cmFjdCB0aGUgd3JpdGUgYW5kIGNsb3NlIGZ1bmN0aW9uIHJlZmVyZW5jZXNcbiAgdmFyIHdyaXRlID0gbWVzc2VuZ2VyW3dyaXRlTWV0aG9kXTtcbiAgdmFyIGNsb3NlID0gbWVzc2VuZ2VyW2Nsb3NlTWV0aG9kXTtcblxuICAvLyBzZXQgdGhlIGF1dG9yZXBseSBmbGFnXG4gIHNpZ25hbGxlci5hdXRvcmVwbHkgPSBhdXRvcmVwbHkgPT09IHVuZGVmaW5lZCB8fCBhdXRvcmVwbHk7XG5cbiAgLy8gY3JlYXRlIHRoZSBwcm9jZXNzb3JcbiAgdmFyIHByb2Nlc3NvciA9IHJlcXVpcmUoJy4vcHJvY2Vzc29yJykoc2lnbmFsbGVyKTtcblxuICAvLyBpZiB0aGUgbWVzc2VuZ2VyIGRvZXNuJ3QgcHJvdmlkZSBhIHZhbGlkIHdyaXRlIG1ldGhvZCwgdGhlbiBjb21wbGFpblxuICBpZiAodHlwZW9mIHdyaXRlICE9ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb3ZpZGVkIG1lc3NlbmdlciBkb2VzIG5vdCBpbXBsZW1lbnQgYSBcIicgK1xuICAgICAgd3JpdGVNZXRob2QgKyAnXCIgd3JpdGUgbWV0aG9kJyk7XG4gIH1cblxuICBmdW5jdGlvbiBwcmVwYXJlQXJnKGFyZykge1xuICAgIGlmICh0eXBlb2YgYXJnID09ICdvYmplY3QnICYmICghIChhcmcgaW5zdGFuY2VvZiBTdHJpbmcpKSkge1xuICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBhcmcgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFyZztcbiAgfVxuXG4gIC8qKlxuICAgICMjIyBzaWduYWxsZXIjc2VuZChkYXRhKVxuXG4gICAgU2VuZCBkYXRhIG92ZXIgdGhlIG1lc3NlbmdpbmcgaW50ZXJmYWNlLlxuICAqKi9cbiAgdmFyIHNlbmQgPSBzaWduYWxsZXIuc2VuZCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIGl0ZXJhdGUgb3ZlciB0aGUgYXJndW1lbnRzIGFuZCBzdHJpbmdpZnkgYXMgcmVxdWlyZWRcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICB2YXIgZGF0YWxpbmUgPSBhcmdzLm1hcChwcmVwYXJlQXJnKS5maWx0ZXIoQm9vbGVhbikuam9pbignfCcpO1xuXG4gICAgLy8gc2VuZCB0aGUgZGF0YSBvdmVyIHRoZSBtZXNzZW5nZXJcbiAgICByZXR1cm4gd3JpdGUuY2FsbChtZXNzZW5nZXIsIGRhdGFsaW5lKTtcbiAgfTtcblxuICAvKipcbiAgICAjIyMgc2lnbmFsbGVyI2Fubm91bmNlKGRhdGE/KVxuXG4gICAgVGhlIGBhbm5vdW5jZWAgZnVuY3Rpb24gb2YgdGhlIHNpZ25hbGxlciB3aWxsIHBhc3MgYW4gYC9hbm5vdW5jZWAgbWVzc2FnZVxuICAgIHRocm91Z2ggdGhlIG1lc3NlbmdlciBuZXR3b3JrLiAgV2hlbiBubyBhZGRpdGlvbmFsIGRhdGEgaXMgc3VwcGxpZWQgdG9cbiAgICB0aGlzIGZ1bmN0aW9uIHRoZW4gb25seSB0aGUgaWQgb2YgdGhlIHNpZ25hbGxlciBpcyBzZW50IHRvIGFsbCBhY3RpdmVcbiAgICBtZW1iZXJzIG9mIHRoZSBtZXNzZW5naW5nIG5ldHdvcmsuXG5cbiAgICBBcyBhIHVuaXF1ZSBpdCBpcyBnZW5lcmFsbHkgaW5zdWZmaWNpZW50IGluZm9ybWF0aW9uIHRvIGRldGVybWluZSB3aGV0aGVyXG4gICAgYSBwZWVyIGlzIGEgZ29vZCBtYXRjaCBmb3IgYW5vdGhlciAoZm9yIGluc3RhbmNlLCAgeW91IG1pZ2h0IGJlIGxvb2tpbmdcbiAgICBmb3Igb3RoZXIgcGFydGllcyBieSBuYW1lIG9yIHJvbGUpIGl0IGlzIGdlbmVyYWxseSBhIGdvb2QgaWRlYSB0byBwcm92aWRlXG4gICAgc29tZSBhZGRpdGlvbmFsIGluZm9ybWF0aW9uIGR1cmluZyB0aGlzIGFubm91bmNlIGNhbGw6XG5cbiAgICBgYGBqc1xuICAgIHNpZ25hbGxlci5hbm5vdW5jZSh7IHJvbGU6ICd0cmFuc2xhdG9yJyB9KTtcbiAgICBgYGBcblxuICAgIF9fTk9URTpfXyBJbiBzb21lIHBhcnRpY3VsYXIgbWVzc2VuZ2VyIHR5cGVzIG1heSBhdHRhY2ggb3IgaW5mZXJcbiAgICBhZGRpdGlvbmFsIGRhdGEgZHVyaW5nIHRoZSBhbm5vdW5jZSBwaGFzZS4gIEZvciBpbnN0YW5jZSwgc29ja2V0LmlvXG4gICAgY29ubmVjdGlvbnMgYXJlIGdlbmVyYWxseSBvcmdhbmlzZWQgaW50byByb29tcyB3aGljaCBpcyBpbmZlcnJlZFxuICAgIGluZm9ybWF0aW9uIHRoYXQgbGltaXRzIHRoZSBtZXNzYWdpbmcgc2NvcGUuXG4gICoqL1xuICBzaWduYWxsZXIuYW5ub3VuY2UgPSBmdW5jdGlvbihkYXRhLCBzZW5kZXIpIHtcbiAgICAvLyB1cGRhdGUgaW50ZXJuYWwgYXR0cmlidXRlc1xuICAgIGV4dGVuZChhdHRyaWJ1dGVzLCBkYXRhLCB7IGlkOiBzaWduYWxsZXIuaWQgfSk7XG5cbiAgICAvLyBzZW5kIHRoZSBhdHRyaWJ1dGVzIG92ZXIgdGhlIG5ldHdvcmtcbiAgICByZXR1cm4gKHNlbmRlciB8fCBzZW5kKSgnL2Fubm91bmNlJywgYXR0cmlidXRlcyk7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIHNpZ25hbGxlciNsZWF2ZSgpXG5cbiAgICBMZWF2ZSB0aGUgbWVzc2VuZ2VyIG1lc2hcbiAgKiovXG4gIHNpZ25hbGxlci5sZWF2ZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIHNlbmQgdGhlIGxlYXZlIHNpZ25hbFxuICAgIHNlbmQoJy9sZWF2ZScsIHsgaWQ6IGlkIH0pO1xuXG4gICAgLy8gY2FsbCB0aGUgY2xvc2UgbWV0aG9kXG4gICAgaWYgKHR5cGVvZiBjbG9zZSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjbG9zZS5jYWxsKG1lc3Nlbmdlcik7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgICMjIyBzaWduYWxsZXIjbG9jayh0YXJnZXRJZCwgb3B0cz8sIGNhbGxiYWNrPylcblxuICAgIEF0dGVtcHQgdG8gZ2V0IGEgdGVtcG9yYXJ5IGV4Y2x1c2l2ZSBsb2NrIG9uIHRoZSBjb21tdW5pY2F0aW9uXG4gICAgY2hhbm5lbCBiZXR3ZWVuIHRoZSBsb2NhbCBzaWduYWxsZXIgYW5kIHRoZSBzcGVjaWZpZWQgdGFyZ2V0IHBlZXIgaWQuXG4gICoqL1xuICBzaWduYWxsZXIubG9jayA9IGZ1bmN0aW9uKHRhcmdldElkLCBvcHRzLCBjYWxsYmFjaykge1xuICAgIHZhciBwZWVyID0gcGVlcnMuZ2V0KHRhcmdldElkKTtcbiAgICB2YXIgYWN0aXZlTG9jaztcbiAgICB2YXIgbG9ja2lkID0gdXVpZC52NCgpO1xuICAgIHZhciBsYWJlbDtcblxuICAgIGZ1bmN0aW9uIGhhbmRsZUxvY2tSZXN1bHQocmVzdWx0LCBzcmMpIHtcbiAgICAgIHZhciBvayA9IHJlc3VsdCAmJiByZXN1bHQub2s7XG5cbiAgICAgIC8vIGlmIHRoZSBzb3VyY2UgZG9lcyBub3QgbWF0Y2ggdGhlIHRhcmdldCB0aGVuIGFib3J0XG4gICAgICBpZiAoKCEgc3JjKSB8fCAoc3JjLmlkICE9PSB0YXJnZXRJZCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBpZiB0aGUgcmVzdWx0IGxhYmVsIGlzIG5vdCBhIG1hdGNoLCB0aGVuIGFib3J0XG4gICAgICBpZiAoKCEgcmVzdWx0KSB8fCAocmVzdWx0LmxhYmVsICE9PSBsYWJlbCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBkb24ndCBsaXN0ZW4gZm9yIGFueSBmdXJ0aGVyIGxvY2sgcmVzdWx0IG1lc3NhZ2VzXG4gICAgICBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIoJ2xvY2tyZXN1bHQnLCBoYW5kbGVMb2NrUmVzdWx0KTtcblxuICAgICAgLy8gaWYgd2UgZG9uJ3QgaGF2ZSBhbiBlcnJvciBjb25kaXRpb24sIGNyZWF0ZSBhbiBhY3RpdmUgbG9jYWwgbG9ja1xuICAgICAgaWYgKG9rKSB7XG4gICAgICAgIGxvY2tzLnNldChsYWJlbCwgYWN0aXZlTG9jayA9IHsgaWQ6IGxvY2tpZCB9KTtcbiAgICAgIH1cbiAgICAgIC8vIG90aGVyd2lzZSwgZGVsZXRlIHRoZSBsb2NhbCBwcm92aXNpb25hbCBsb2NrXG4gICAgICBlbHNlIGlmIChhY3RpdmVMb2NrKSB7XG4gICAgICAgIGxvY2tzLmRlbGV0ZShsYWJlbCk7XG4gICAgICB9XG5cbiAgICAgIGNhbGxiYWNrKG9rID8gbnVsbCA6IG5ldyBFcnJvcignY291bGQgbm90IGFjcXVpcmUgbG9jaycpKTtcbiAgICB9XG5cbiAgICAvLyBjaGVjayBmb3Igbm8gbGFiZWwgYmVpbmcgc3VwcGxpZWRcbiAgICBpZiAodHlwZW9mIG9wdHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sgPSBvcHRzO1xuICAgICAgb3B0cyA9IHt9O1xuICAgIH1cblxuICAgIC8vIGVuc3VyZSB3ZSBoYXZlIGEgY2FsbGJhY2tcbiAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uKCkge307XG5cbiAgICAvLyBpZiB0aGUgcGVlciBpcyBub3Qga25vd24sIHRoZW4gd2UgY2Fubm90IGluaXRpYXRlIGEgbG9ja1xuICAgIGlmICghIHBlZXIpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ3Vua25vd24gdGFyZ2V0IGlkIC0gY2Fubm90IGluaXRpYXRlIGxvY2snKSk7XG4gICAgfVxuXG4gICAgLy8gY3JlYXRlIGEgZGVmYXVsdCBsYWJlbCBpZiBub25lIHByb3ZpZGVkXG4gICAgbGFiZWwgPSAob3B0cyB8fCB7fSkubGFiZWwgfHwgKG9wdHMgfHwge30pLm5hbWUgfHwgJ2RlZmF1bHQnO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSBhIGxvY2FsIGxvY2sgYWxyZWFkeSBpbiBwbGFjZSwgdGhlbiByZXR1cm4gb2tcbiAgICBhY3RpdmVMb2NrID0gbG9ja3MuZ2V0KGxhYmVsKTtcbiAgICBpZiAoYWN0aXZlTG9jayAmJiAoISBhY3RpdmVMb2NrLnByb3Zpc2lvbmFsKSkge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgLy8gZW5zdXJlIHdlIGhhdmUgbG9ja3MgZm9yIHRoZSBwZWVyXG4gICAgcGVlci5sb2NrcyA9IHBlZXIubG9ja3MgfHwgbmV3IEZhc3RNYXAoKTtcblxuICAgIC8vIGlmIGEgcmVtb3RlIGxvY2sgaXMgaW4gcGxhY2UsIGVycm9yIG91dFxuICAgIGlmIChwZWVyLmxvY2tzLmdldChsYWJlbCkpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ3JlbW90ZSBsb2NrIGluIHBsYWNlLCBjYW5ub3QgcmVxdWVzdCBsb2NrJykpO1xuICAgIH1cblxuICAgIC8vIGNyZWF0ZSBhIHByb3Zpc2lvbmFsIGxvY2tcbiAgICBsb2Nrcy5zZXQobGFiZWwsIGFjdGl2ZUxvY2sgPSB7IGlkOiBsb2NraWQsIHByb3Zpc2lvbmFsOiB0cnVlIH0pO1xuXG4gICAgLy8gd2FpdCBmb3IgdGhlIGxvY2sgcmVzdWx0XG4gICAgc2lnbmFsbGVyLm9uKCdsb2NrcmVzdWx0JywgaGFuZGxlTG9ja1Jlc3VsdCk7XG5cbiAgICAvLyBzZW5kIHRoZSBsb2NrIG1lc3NhZ2VcbiAgICBzaWduYWxsZXIudG8odGFyZ2V0SWQpLnNlbmQoJy9sb2NrJywgbGFiZWwsIGxvY2tpZCk7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIHNpZ25hbGxlciN0byh0YXJnZXRJZClcblxuICAgIFRoZSB0byBtZXRob2QgcmV0dXJucyBhbiBlbmNhcHN1bGF0ZWRcblxuICAqKi9cbiAgc2lnbmFsbGVyLnRvID0gZnVuY3Rpb24odGFyZ2V0SWQpIHtcbiAgICAvLyBjcmVhdGUgYSBzZW5kZXIgdGhhdCB3aWxsIHByZXBlbmQgbWVzc2FnZXMgd2l0aCAvdG98dGFyZ2V0SWR8XG4gICAgdmFyIHNlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gZ2V0IHRoZSBwZWVyICh5ZXMgd2hlbiBzZW5kIGlzIGNhbGxlZCB0byBtYWtlIHN1cmUgaXQgaGFzbid0IGxlZnQpXG4gICAgICB2YXIgcGVlciA9IHNpZ25hbGxlci5wZWVycy5nZXQodGFyZ2V0SWQpO1xuICAgICAgdmFyIGFyZ3M7XG5cbiAgICAgIGlmICghIHBlZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIHBlZXI6ICcgKyB0YXJnZXRJZCk7XG4gICAgICB9XG5cbiAgICAgIGFyZ3MgPSBbXG4gICAgICAgICcvdG8nLFxuICAgICAgICB0YXJnZXRJZCxcbiAgICAgICAgeyBpZDogc2lnbmFsbGVyLmlkLCBjbG9jazogcGVlci5jbG9jayB9XG4gICAgICBdLmNvbmNhdChbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuXG4gICAgICAvLyBpbmNyZW1lbnQgdGhlIHBlZXIgY2xvY2ssIHVzaW5nIHRoZSByb2xlIG9mIHRoZSBsb2NhbFxuICAgICAgLy8gc2lnbmFsbGVyLiAgSWYgdGhlIHBlZXIgcm9sZSBpcyAwLCB0aGVuIHRoZSBzaWduYWxsZXJzIHJvbGUgaXMgMVxuICAgICAgLy8gYW5kIHVzaW5nIHhvciAoXikgd2lsbCBnZW5lcmF0ZSB0aGUgY29ycmVjdCBpbmRleFxuICAgICAgdmMuaW5jcmVtZW50KHBlZXIsIFsnYScsICdiJ11bcGVlci5yb2xlSWR4IF4gMV0pO1xuXG4gICAgICAvLyB3cml0ZSBvbiBuZXh0IHRpY2sgdG8gZW5zdXJlIGNsb2NrIHVwZGF0ZXMgYXJlIGhhbmRsZWQgY29ycmVjdGx5XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXNnID0gYXJncy5tYXAocHJlcGFyZUFyZykuZmlsdGVyKEJvb2xlYW4pLmpvaW4oJ3wnKTtcbiAgICAgICAgZGVidWcoJ1RYICgnICsgdGFyZ2V0SWQgKyAnKTogJywgbXNnKTtcblxuICAgICAgICAvLyBpbmNsdWRlIHRoZSBjdXJyZW50IGNsb2NrIHZhbHVlIGluIHdpdGggdGhlIHBheWxvYWRcbiAgICAgICAgd3JpdGUuY2FsbChtZXNzZW5nZXIsIG1zZyk7XG4gICAgICB9LCAwKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFubm91bmNlOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIHJldHVybiBzaWduYWxsZXIuYW5ub3VuY2UoZGF0YSwgc2VuZGVyKTtcbiAgICAgIH0sXG5cbiAgICAgIHNlbmQ6IHNlbmRlcixcbiAgICB9XG4gIH07XG5cbiAgLyoqXG5cbiAgICAjIyMgc2lnbmFsbGVyI3VubG9jayh0YXJnZXRJZCwgb3B0cz8pXG5cbiAgKiovXG4gIHNpZ25hbGxlci51bmxvY2sgPSBmdW5jdGlvbih0YXJnZXRJZCwgb3B0cywgY2FsbGJhY2spIHtcbiAgICB2YXIgcGVlciA9IHBlZXJzLmdldCh0YXJnZXRJZCk7XG4gICAgdmFyIGxhYmVsO1xuXG4gICAgZnVuY3Rpb24gaGFuZGxlVW5sb2NrUmVzdWx0KHJlc3VsdCwgc3JjKSB7XG4gICAgICB2YXIgb2sgPSByZXN1bHQgJiYgcmVzdWx0Lm9rO1xuXG4gICAgICAvLyBpZiBub3QgdGhlIGNvcnJlY3Qgc291cmNlIHRoZW4gYWJvcnRcbiAgICAgIGlmICgoISBzcmMpIHx8IChzcmMuaWQgIT09IHRhcmdldElkKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGlmIHRoaXMgaXMgbm90IGFuIHVubG9jayByZXN1bHQgZm9yIHRoaXMgbGFiZWwsIHRoZW4gYWJvcnRcbiAgICAgIGlmICgoISByZXN1bHQpIHx8IChyZXN1bHQubGFiZWwgIT09IGxhYmVsKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIHJlbW92ZSB0aGUgbGlzdGVuZXJcbiAgICAgIHNpZ25hbGxlci5yZW1vdmVMaXN0ZW5lcigndW5sb2NrcmVzdWx0JywgaGFuZGxlVW5sb2NrUmVzdWx0KTtcblxuICAgICAgLy8gaWYgb2ssIHJlbW92ZSBvdXIgbG9jYWwgbG9ja1xuICAgICAgaWYgKG9rKSB7XG4gICAgICAgIGxvY2tzLmRlbGV0ZShsYWJlbCk7XG4gICAgICB9XG5cbiAgICAgIC8vIHRyaWdnZXIgdGhlIGNhbGxiYWNrXG4gICAgICBjYWxsYmFjayhvayA/IG51bGwgOiBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWxlYXNlIGxvY2s6ICcgKyBsYWJlbCkpO1xuICAgIH1cblxuICAgIC8vIGhhbmRsZSB0aGUgbm8gb3B0cyBjYXNlXG4gICAgaWYgKHR5cGVvZiBvcHRzID09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICAgIG9wdHMgPSB7fTtcbiAgICB9XG5cbiAgICAvLyBlbnN1cmUgd2UgaGF2ZSBhIGNhbGxiYWNrXG4gICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBmdW5jdGlvbigpIHt9O1xuXG4gICAgLy8gc2V0IGEgZGVmYXVsdCBsYWJlbCB2YWx1ZVxuICAgIGxhYmVsID0gKG9wdHMgfHwge30pLmxhYmVsIHx8IChvcHRzIHx8IHt9KS5uYW1lIHx8ICdkZWZhdWx0JztcblxuICAgIC8vIGlmIHdlIGhhdmUgdGhlIHBlZXIgYW5kIGxvY2FsIGxvY2sgdGhlbiBhY3Rpb24gdGhlIHVubG9ja1xuICAgIGlmIChwZWVyICYmIGxvY2tzLmdldChsYWJlbCkpIHtcbiAgICAgIHNpZ25hbGxlci5vbigndW5sb2NrcmVzdWx0JywgaGFuZGxlVW5sb2NrUmVzdWx0KTtcbiAgICAgIHNpZ25hbGxlci50byh0YXJnZXRJZCkuc2VuZCgnL3VubG9jaycsIGxhYmVsLCBsb2Nrcy5nZXQobGFiZWwpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdubyBsb2NhbCBsb2NrIHdpdGggbGFiZWwgJyArIGxhYmVsKSk7XG4gICAgfVxuICB9O1xuXG4gIC8vIGhhbmRsZSBtZXNzYWdlIGRhdGEgZXZlbnRzXG4gIG1lc3Nlbmdlci5vbihkYXRhRXZlbnQsIHByb2Nlc3Nvcik7XG5cbiAgLy8gcGFzcyB0aHJvdWdoIG9wZW4gZXZlbnRzXG4gIG1lc3Nlbmdlci5vbihvcGVuRXZlbnQsIHNpZ25hbGxlci5lbWl0LmJpbmQoc2lnbmFsbGVyLCAnb3BlbicpKTtcblxuICByZXR1cm4gc2lnbmFsbGVyO1xufTtcblxuc2lnLmxvYWRQcmltdXMgPSByZXF1aXJlKCcuL3ByaW11cy1sb2FkZXInKTsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIFNoaW0gPSByZXF1aXJlKFwiLi9zaGltXCIpO1xudmFyIEdlbmVyaWNDb2xsZWN0aW9uID0gcmVxdWlyZShcIi4vZ2VuZXJpYy1jb2xsZWN0aW9uXCIpO1xudmFyIEdlbmVyaWNNYXAgPSByZXF1aXJlKFwiLi9nZW5lcmljLW1hcFwiKTtcbnZhciBQcm9wZXJ0eUNoYW5nZXMgPSByZXF1aXJlKFwiLi9saXN0ZW4vcHJvcGVydHktY2hhbmdlc1wiKTtcblxuLy8gQnVyZ2xlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9kb21lbmljL2RpY3RcblxubW9kdWxlLmV4cG9ydHMgPSBEaWN0O1xuZnVuY3Rpb24gRGljdCh2YWx1ZXMsIGdldERlZmF1bHQpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRGljdCkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEaWN0KHZhbHVlcywgZ2V0RGVmYXVsdCk7XG4gICAgfVxuICAgIGdldERlZmF1bHQgPSBnZXREZWZhdWx0IHx8IEZ1bmN0aW9uLm5vb3A7XG4gICAgdGhpcy5nZXREZWZhdWx0ID0gZ2V0RGVmYXVsdDtcbiAgICB0aGlzLnN0b3JlID0ge307XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIHRoaXMuYWRkRWFjaCh2YWx1ZXMpO1xufVxuXG5EaWN0LkRpY3QgPSBEaWN0OyAvLyBoYWNrIHNvIHJlcXVpcmUoXCJkaWN0XCIpLkRpY3Qgd2lsbCB3b3JrIGluIE1vbnRhZ2VKUy5cblxuZnVuY3Rpb24gbWFuZ2xlKGtleSkge1xuICAgIHJldHVybiBcIn5cIiArIGtleTtcbn1cblxuZnVuY3Rpb24gdW5tYW5nbGUobWFuZ2xlZCkge1xuICAgIHJldHVybiBtYW5nbGVkLnNsaWNlKDEpO1xufVxuXG5PYmplY3QuYWRkRWFjaChEaWN0LnByb3RvdHlwZSwgR2VuZXJpY0NvbGxlY3Rpb24ucHJvdG90eXBlKTtcbk9iamVjdC5hZGRFYWNoKERpY3QucHJvdG90eXBlLCBHZW5lcmljTWFwLnByb3RvdHlwZSk7XG5PYmplY3QuYWRkRWFjaChEaWN0LnByb3RvdHlwZSwgUHJvcGVydHlDaGFuZ2VzLnByb3RvdHlwZSk7XG5cbkRpY3QucHJvdG90eXBlLmNvbnN0cnVjdENsb25lID0gZnVuY3Rpb24gKHZhbHVlcykge1xuICAgIHJldHVybiBuZXcgdGhpcy5jb25zdHJ1Y3Rvcih2YWx1ZXMsIHRoaXMubWFuZ2xlLCB0aGlzLmdldERlZmF1bHQpO1xufTtcblxuRGljdC5wcm90b3R5cGUuYXNzZXJ0U3RyaW5nID0gZnVuY3Rpb24gKGtleSkge1xuICAgIGlmICh0eXBlb2Yga2V5ICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJrZXkgbXVzdCBiZSBhIHN0cmluZyBidXQgR290IFwiICsga2V5KTtcbiAgICB9XG59XG5cbkRpY3QucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChrZXksIGRlZmF1bHRWYWx1ZSkge1xuICAgIHRoaXMuYXNzZXJ0U3RyaW5nKGtleSk7XG4gICAgdmFyIG1hbmdsZWQgPSBtYW5nbGUoa2V5KTtcbiAgICBpZiAobWFuZ2xlZCBpbiB0aGlzLnN0b3JlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnN0b3JlW21hbmdsZWRdO1xuICAgIH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXREZWZhdWx0KGtleSk7XG4gICAgfVxufTtcblxuRGljdC5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICB0aGlzLmFzc2VydFN0cmluZyhrZXkpO1xuICAgIHZhciBtYW5nbGVkID0gbWFuZ2xlKGtleSk7XG4gICAgaWYgKG1hbmdsZWQgaW4gdGhpcy5zdG9yZSkgeyAvLyB1cGRhdGVcbiAgICAgICAgaWYgKHRoaXMuZGlzcGF0Y2hlc0JlZm9yZU1hcENoYW5nZXMpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hCZWZvcmVNYXBDaGFuZ2Uoa2V5LCB0aGlzLnN0b3JlW21hbmdsZWRdKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN0b3JlW21hbmdsZWRdID0gdmFsdWU7XG4gICAgICAgIGlmICh0aGlzLmRpc3BhdGNoZXNNYXBDaGFuZ2VzKSB7XG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoTWFwQ2hhbmdlKGtleSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgeyAvLyBjcmVhdGVcbiAgICAgICAgaWYgKHRoaXMuZGlzcGF0Y2hlc01hcENoYW5nZXMpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hCZWZvcmVNYXBDaGFuZ2Uoa2V5LCB1bmRlZmluZWQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubGVuZ3RoKys7XG4gICAgICAgIHRoaXMuc3RvcmVbbWFuZ2xlZF0gPSB2YWx1ZTtcbiAgICAgICAgaWYgKHRoaXMuZGlzcGF0Y2hlc01hcENoYW5nZXMpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hNYXBDaGFuZ2Uoa2V5LCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxufTtcblxuRGljdC5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24gKGtleSkge1xuICAgIHRoaXMuYXNzZXJ0U3RyaW5nKGtleSk7XG4gICAgdmFyIG1hbmdsZWQgPSBtYW5nbGUoa2V5KTtcbiAgICByZXR1cm4gbWFuZ2xlZCBpbiB0aGlzLnN0b3JlO1xufTtcblxuRGljdC5wcm90b3R5cGVbXCJkZWxldGVcIl0gPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgdGhpcy5hc3NlcnRTdHJpbmcoa2V5KTtcbiAgICB2YXIgbWFuZ2xlZCA9IG1hbmdsZShrZXkpO1xuICAgIGlmIChtYW5nbGVkIGluIHRoaXMuc3RvcmUpIHtcbiAgICAgICAgaWYgKHRoaXMuZGlzcGF0Y2hlc01hcENoYW5nZXMpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hCZWZvcmVNYXBDaGFuZ2Uoa2V5LCB0aGlzLnN0b3JlW21hbmdsZWRdKTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgdGhpcy5zdG9yZVttYW5nbGUoa2V5KV07XG4gICAgICAgIHRoaXMubGVuZ3RoLS07XG4gICAgICAgIGlmICh0aGlzLmRpc3BhdGNoZXNNYXBDaGFuZ2VzKSB7XG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoTWFwQ2hhbmdlKGtleSwgdW5kZWZpbmVkKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuRGljdC5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGtleSwgbWFuZ2xlZDtcbiAgICBmb3IgKG1hbmdsZWQgaW4gdGhpcy5zdG9yZSkge1xuICAgICAgICBrZXkgPSB1bm1hbmdsZShtYW5nbGVkKTtcbiAgICAgICAgaWYgKHRoaXMuZGlzcGF0Y2hlc01hcENoYW5nZXMpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hCZWZvcmVNYXBDaGFuZ2Uoa2V5LCB0aGlzLnN0b3JlW21hbmdsZWRdKTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgdGhpcy5zdG9yZVttYW5nbGVkXTtcbiAgICAgICAgaWYgKHRoaXMuZGlzcGF0Y2hlc01hcENoYW5nZXMpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hNYXBDaGFuZ2Uoa2V5LCB1bmRlZmluZWQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMubGVuZ3RoID0gMDtcbn07XG5cbkRpY3QucHJvdG90eXBlLnJlZHVjZSA9IGZ1bmN0aW9uIChjYWxsYmFjaywgYmFzaXMsIHRoaXNwKSB7XG4gICAgZm9yICh2YXIgbWFuZ2xlZCBpbiB0aGlzLnN0b3JlKSB7XG4gICAgICAgIGJhc2lzID0gY2FsbGJhY2suY2FsbCh0aGlzcCwgYmFzaXMsIHRoaXMuc3RvcmVbbWFuZ2xlZF0sIHVubWFuZ2xlKG1hbmdsZWQpLCB0aGlzKTtcbiAgICB9XG4gICAgcmV0dXJuIGJhc2lzO1xufTtcblxuRGljdC5wcm90b3R5cGUucmVkdWNlUmlnaHQgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIGJhc2lzLCB0aGlzcCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgc3RvcmUgPSB0aGlzLnN0b3JlO1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLnN0b3JlKS5yZWR1Y2VSaWdodChmdW5jdGlvbiAoYmFzaXMsIG1hbmdsZWQpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmNhbGwodGhpc3AsIGJhc2lzLCBzdG9yZVttYW5nbGVkXSwgdW5tYW5nbGUobWFuZ2xlZCksIHNlbGYpO1xuICAgIH0sIGJhc2lzKTtcbn07XG5cbkRpY3QucHJvdG90eXBlLm9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIga2V5O1xuICAgIGZvciAoa2V5IGluIHRoaXMuc3RvcmUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RvcmVba2V5XTtcbiAgICB9XG59O1xuXG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIFNoaW0gPSByZXF1aXJlKFwiLi9zaGltXCIpO1xudmFyIFNldCA9IHJlcXVpcmUoXCIuL2Zhc3Qtc2V0XCIpO1xudmFyIEdlbmVyaWNDb2xsZWN0aW9uID0gcmVxdWlyZShcIi4vZ2VuZXJpYy1jb2xsZWN0aW9uXCIpO1xudmFyIEdlbmVyaWNNYXAgPSByZXF1aXJlKFwiLi9nZW5lcmljLW1hcFwiKTtcbnZhciBQcm9wZXJ0eUNoYW5nZXMgPSByZXF1aXJlKFwiLi9saXN0ZW4vcHJvcGVydHktY2hhbmdlc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBGYXN0TWFwO1xuXG5mdW5jdGlvbiBGYXN0TWFwKHZhbHVlcywgZXF1YWxzLCBoYXNoLCBnZXREZWZhdWx0KSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZhc3RNYXApKSB7XG4gICAgICAgIHJldHVybiBuZXcgRmFzdE1hcCh2YWx1ZXMsIGVxdWFscywgaGFzaCwgZ2V0RGVmYXVsdCk7XG4gICAgfVxuICAgIGVxdWFscyA9IGVxdWFscyB8fCBPYmplY3QuZXF1YWxzO1xuICAgIGhhc2ggPSBoYXNoIHx8IE9iamVjdC5oYXNoO1xuICAgIGdldERlZmF1bHQgPSBnZXREZWZhdWx0IHx8IEZ1bmN0aW9uLm5vb3A7XG4gICAgdGhpcy5jb250ZW50RXF1YWxzID0gZXF1YWxzO1xuICAgIHRoaXMuY29udGVudEhhc2ggPSBoYXNoO1xuICAgIHRoaXMuZ2V0RGVmYXVsdCA9IGdldERlZmF1bHQ7XG4gICAgdGhpcy5zdG9yZSA9IG5ldyBTZXQoXG4gICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgZnVuY3Rpb24ga2V5c0VxdWFsKGEsIGIpIHtcbiAgICAgICAgICAgIHJldHVybiBlcXVhbHMoYS5rZXksIGIua2V5KTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24ga2V5SGFzaChpdGVtKSB7XG4gICAgICAgICAgICByZXR1cm4gaGFzaChpdGVtLmtleSk7XG4gICAgICAgIH1cbiAgICApO1xuICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICB0aGlzLmFkZEVhY2godmFsdWVzKTtcbn1cblxuRmFzdE1hcC5GYXN0TWFwID0gRmFzdE1hcDsgLy8gaGFjayBzbyByZXF1aXJlKFwiZmFzdC1tYXBcIikuRmFzdE1hcCB3aWxsIHdvcmsgaW4gTW9udGFnZUpTXG5cbk9iamVjdC5hZGRFYWNoKEZhc3RNYXAucHJvdG90eXBlLCBHZW5lcmljQ29sbGVjdGlvbi5wcm90b3R5cGUpO1xuT2JqZWN0LmFkZEVhY2goRmFzdE1hcC5wcm90b3R5cGUsIEdlbmVyaWNNYXAucHJvdG90eXBlKTtcbk9iamVjdC5hZGRFYWNoKEZhc3RNYXAucHJvdG90eXBlLCBQcm9wZXJ0eUNoYW5nZXMucHJvdG90eXBlKTtcblxuRmFzdE1hcC5wcm90b3R5cGUuY29uc3RydWN0Q2xvbmUgPSBmdW5jdGlvbiAodmFsdWVzKSB7XG4gICAgcmV0dXJuIG5ldyB0aGlzLmNvbnN0cnVjdG9yKFxuICAgICAgICB2YWx1ZXMsXG4gICAgICAgIHRoaXMuY29udGVudEVxdWFscyxcbiAgICAgICAgdGhpcy5jb250ZW50SGFzaCxcbiAgICAgICAgdGhpcy5nZXREZWZhdWx0XG4gICAgKTtcbn07XG5cbkZhc3RNYXAucHJvdG90eXBlLmxvZyA9IGZ1bmN0aW9uIChjaGFybWFwLCBzdHJpbmdpZnkpIHtcbiAgICBzdHJpbmdpZnkgPSBzdHJpbmdpZnkgfHwgdGhpcy5zdHJpbmdpZnk7XG4gICAgdGhpcy5zdG9yZS5sb2coY2hhcm1hcCwgc3RyaW5naWZ5KTtcbn07XG5cbkZhc3RNYXAucHJvdG90eXBlLnN0cmluZ2lmeSA9IGZ1bmN0aW9uIChpdGVtLCBsZWFkZXIpIHtcbiAgICByZXR1cm4gbGVhZGVyICsgSlNPTi5zdHJpbmdpZnkoaXRlbS5rZXkpICsgXCI6IFwiICsgSlNPTi5zdHJpbmdpZnkoaXRlbS52YWx1ZSk7XG59XG5cbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgU2hpbSA9IHJlcXVpcmUoXCIuL3NoaW1cIik7XG52YXIgRGljdCA9IHJlcXVpcmUoXCIuL2RpY3RcIik7XG52YXIgTGlzdCA9IHJlcXVpcmUoXCIuL2xpc3RcIik7XG52YXIgR2VuZXJpY0NvbGxlY3Rpb24gPSByZXF1aXJlKFwiLi9nZW5lcmljLWNvbGxlY3Rpb25cIik7XG52YXIgR2VuZXJpY1NldCA9IHJlcXVpcmUoXCIuL2dlbmVyaWMtc2V0XCIpO1xudmFyIFRyZWVMb2cgPSByZXF1aXJlKFwiLi90cmVlLWxvZ1wiKTtcbnZhciBQcm9wZXJ0eUNoYW5nZXMgPSByZXF1aXJlKFwiLi9saXN0ZW4vcHJvcGVydHktY2hhbmdlc1wiKTtcblxudmFyIG9iamVjdF9oYXMgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZhc3RTZXQ7XG5cbmZ1bmN0aW9uIEZhc3RTZXQodmFsdWVzLCBlcXVhbHMsIGhhc2gsIGdldERlZmF1bHQpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmFzdFNldCkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBGYXN0U2V0KHZhbHVlcywgZXF1YWxzLCBoYXNoLCBnZXREZWZhdWx0KTtcbiAgICB9XG4gICAgZXF1YWxzID0gZXF1YWxzIHx8IE9iamVjdC5lcXVhbHM7XG4gICAgaGFzaCA9IGhhc2ggfHwgT2JqZWN0Lmhhc2g7XG4gICAgZ2V0RGVmYXVsdCA9IGdldERlZmF1bHQgfHwgRnVuY3Rpb24ubm9vcDtcbiAgICB0aGlzLmNvbnRlbnRFcXVhbHMgPSBlcXVhbHM7XG4gICAgdGhpcy5jb250ZW50SGFzaCA9IGhhc2g7XG4gICAgdGhpcy5nZXREZWZhdWx0ID0gZ2V0RGVmYXVsdDtcbiAgICB0aGlzLmJ1Y2tldHMgPSBuZXcgdGhpcy5CdWNrZXRzKG51bGwsIHRoaXMuQnVja2V0KTtcbiAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgdGhpcy5hZGRFYWNoKHZhbHVlcyk7XG59XG5cbkZhc3RTZXQuRmFzdFNldCA9IEZhc3RTZXQ7IC8vIGhhY2sgc28gcmVxdWlyZShcImZhc3Qtc2V0XCIpLkZhc3RTZXQgd2lsbCB3b3JrIGluIE1vbnRhZ2VKU1xuXG5PYmplY3QuYWRkRWFjaChGYXN0U2V0LnByb3RvdHlwZSwgR2VuZXJpY0NvbGxlY3Rpb24ucHJvdG90eXBlKTtcbk9iamVjdC5hZGRFYWNoKEZhc3RTZXQucHJvdG90eXBlLCBHZW5lcmljU2V0LnByb3RvdHlwZSk7XG5PYmplY3QuYWRkRWFjaChGYXN0U2V0LnByb3RvdHlwZSwgUHJvcGVydHlDaGFuZ2VzLnByb3RvdHlwZSk7XG5cbkZhc3RTZXQucHJvdG90eXBlLkJ1Y2tldHMgPSBEaWN0O1xuRmFzdFNldC5wcm90b3R5cGUuQnVja2V0ID0gTGlzdDtcblxuRmFzdFNldC5wcm90b3R5cGUuY29uc3RydWN0Q2xvbmUgPSBmdW5jdGlvbiAodmFsdWVzKSB7XG4gICAgcmV0dXJuIG5ldyB0aGlzLmNvbnN0cnVjdG9yKFxuICAgICAgICB2YWx1ZXMsXG4gICAgICAgIHRoaXMuY29udGVudEVxdWFscyxcbiAgICAgICAgdGhpcy5jb250ZW50SGFzaCxcbiAgICAgICAgdGhpcy5nZXREZWZhdWx0XG4gICAgKTtcbn07XG5cbkZhc3RTZXQucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBoYXNoID0gdGhpcy5jb250ZW50SGFzaCh2YWx1ZSk7XG4gICAgcmV0dXJuIHRoaXMuYnVja2V0cy5nZXQoaGFzaCkuaGFzKHZhbHVlKTtcbn07XG5cbkZhc3RTZXQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBoYXNoID0gdGhpcy5jb250ZW50SGFzaCh2YWx1ZSk7XG4gICAgdmFyIGJ1Y2tldHMgPSB0aGlzLmJ1Y2tldHM7XG4gICAgaWYgKGJ1Y2tldHMuaGFzKGhhc2gpKSB7XG4gICAgICAgIHJldHVybiBidWNrZXRzLmdldChoYXNoKS5nZXQodmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldERlZmF1bHQodmFsdWUpO1xuICAgIH1cbn07XG5cbkZhc3RTZXQucHJvdG90eXBlWydkZWxldGUnXSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciBoYXNoID0gdGhpcy5jb250ZW50SGFzaCh2YWx1ZSk7XG4gICAgdmFyIGJ1Y2tldHMgPSB0aGlzLmJ1Y2tldHM7XG4gICAgaWYgKGJ1Y2tldHMuaGFzKGhhc2gpKSB7XG4gICAgICAgIHZhciBidWNrZXQgPSBidWNrZXRzLmdldChoYXNoKTtcbiAgICAgICAgaWYgKGJ1Y2tldFtcImRlbGV0ZVwiXSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHRoaXMubGVuZ3RoLS07XG4gICAgICAgICAgICBpZiAoYnVja2V0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGJ1Y2tldHNbXCJkZWxldGVcIl0oaGFzaCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5GYXN0U2V0LnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmJ1Y2tldHMuY2xlYXIoKTtcbiAgICB0aGlzLmxlbmd0aCA9IDA7XG59O1xuXG5GYXN0U2V0LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgaGFzaCA9IHRoaXMuY29udGVudEhhc2godmFsdWUpO1xuICAgIHZhciBidWNrZXRzID0gdGhpcy5idWNrZXRzO1xuICAgIGlmICghYnVja2V0cy5oYXMoaGFzaCkpIHtcbiAgICAgICAgYnVja2V0cy5zZXQoaGFzaCwgbmV3IHRoaXMuQnVja2V0KG51bGwsIHRoaXMuY29udGVudEVxdWFscykpO1xuICAgIH1cbiAgICBpZiAoIWJ1Y2tldHMuZ2V0KGhhc2gpLmhhcyh2YWx1ZSkpIHtcbiAgICAgICAgYnVja2V0cy5nZXQoaGFzaCkuYWRkKHZhbHVlKTtcbiAgICAgICAgdGhpcy5sZW5ndGgrKztcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbkZhc3RTZXQucHJvdG90eXBlLnJlZHVjZSA9IGZ1bmN0aW9uIChjYWxsYmFjaywgYmFzaXMgLyosIHRoaXNwKi8pIHtcbiAgICB2YXIgdGhpc3AgPSBhcmd1bWVudHNbMl07XG4gICAgdmFyIGJ1Y2tldHMgPSB0aGlzLmJ1Y2tldHM7XG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICByZXR1cm4gYnVja2V0cy5yZWR1Y2UoZnVuY3Rpb24gKGJhc2lzLCBidWNrZXQpIHtcbiAgICAgICAgcmV0dXJuIGJ1Y2tldC5yZWR1Y2UoZnVuY3Rpb24gKGJhc2lzLCB2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmNhbGwodGhpc3AsIGJhc2lzLCB2YWx1ZSwgaW5kZXgrKywgdGhpcyk7XG4gICAgICAgIH0sIGJhc2lzLCB0aGlzKTtcbiAgICB9LCBiYXNpcywgdGhpcyk7XG59O1xuXG5GYXN0U2V0LnByb3RvdHlwZS5vbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gdGhpcy5idWNrZXRzLm9uZSgpLm9uZSgpO1xuICAgIH1cbn07XG5cbkZhc3RTZXQucHJvdG90eXBlLml0ZXJhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuYnVja2V0cy52YWx1ZXMoKS5mbGF0dGVuKCkuaXRlcmF0ZSgpO1xufTtcblxuRmFzdFNldC5wcm90b3R5cGUubG9nID0gZnVuY3Rpb24gKGNoYXJtYXAsIGxvZ05vZGUsIGNhbGxiYWNrLCB0aGlzcCkge1xuICAgIGNoYXJtYXAgPSBjaGFybWFwIHx8IFRyZWVMb2cudW5pY29kZVNoYXJwO1xuICAgIGxvZ05vZGUgPSBsb2dOb2RlIHx8IHRoaXMubG9nTm9kZTtcbiAgICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrID0gY29uc29sZS5sb2c7XG4gICAgICAgIHRoaXNwID0gY29uc29sZTtcbiAgICB9XG4gICAgY2FsbGJhY2sgPSBjYWxsYmFjay5iaW5kKHRoaXNwKTtcblxuICAgIHZhciBidWNrZXRzID0gdGhpcy5idWNrZXRzO1xuICAgIHZhciBoYXNoZXMgPSBidWNrZXRzLmtleXMoKTtcbiAgICBoYXNoZXMuZm9yRWFjaChmdW5jdGlvbiAoaGFzaCwgaW5kZXgpIHtcbiAgICAgICAgdmFyIGJyYW5jaDtcbiAgICAgICAgdmFyIGxlYWRlcjtcbiAgICAgICAgaWYgKGluZGV4ID09PSBoYXNoZXMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgYnJhbmNoID0gY2hhcm1hcC5mcm9tQWJvdmU7XG4gICAgICAgICAgICBsZWFkZXIgPSAnICc7XG4gICAgICAgIH0gZWxzZSBpZiAoaW5kZXggPT09IDApIHtcbiAgICAgICAgICAgIGJyYW5jaCA9IGNoYXJtYXAuYnJhbmNoRG93bjtcbiAgICAgICAgICAgIGxlYWRlciA9IGNoYXJtYXAuc3RyYWZlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnJhbmNoID0gY2hhcm1hcC5mcm9tQm90aDtcbiAgICAgICAgICAgIGxlYWRlciA9IGNoYXJtYXAuc3RyYWZlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBidWNrZXQgPSBidWNrZXRzLmdldChoYXNoKTtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzcCwgYnJhbmNoICsgY2hhcm1hcC50aHJvdWdoICsgY2hhcm1hcC5icmFuY2hEb3duICsgJyAnICsgaGFzaCk7XG4gICAgICAgIGJ1Y2tldC5mb3JFYWNoKGZ1bmN0aW9uICh2YWx1ZSwgbm9kZSkge1xuICAgICAgICAgICAgdmFyIGJyYW5jaCwgYmVsb3c7XG4gICAgICAgICAgICBpZiAobm9kZSA9PT0gYnVja2V0LmhlYWQucHJldikge1xuICAgICAgICAgICAgICAgIGJyYW5jaCA9IGNoYXJtYXAuZnJvbUFib3ZlO1xuICAgICAgICAgICAgICAgIGJlbG93ID0gJyAnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBicmFuY2ggPSBjaGFybWFwLmZyb21Cb3RoO1xuICAgICAgICAgICAgICAgIGJlbG93ID0gY2hhcm1hcC5zdHJhZmU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgd3JpdHRlbjtcbiAgICAgICAgICAgIGxvZ05vZGUoXG4gICAgICAgICAgICAgICAgbm9kZSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAobGluZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXdyaXR0ZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc3AsIGxlYWRlciArICcgJyArIGJyYW5jaCArIGNoYXJtYXAudGhyb3VnaCArIGNoYXJtYXAudGhyb3VnaCArIGxpbmUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgd3JpdHRlbiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNwLCBsZWFkZXIgKyAnICcgKyBiZWxvdyArICcgICcgKyBsaW5lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzcCwgbGVhZGVyICsgJyAnICsgY2hhcm1hcC5zdHJhZmUgKyAnICAnICsgbGluZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuXG5GYXN0U2V0LnByb3RvdHlwZS5sb2dOb2RlID0gZnVuY3Rpb24gKG5vZGUsIHdyaXRlKSB7XG4gICAgdmFyIHZhbHVlID0gbm9kZS52YWx1ZTtcbiAgICBpZiAoT2JqZWN0KHZhbHVlKSA9PT0gdmFsdWUpIHtcbiAgICAgICAgSlNPTi5zdHJpbmdpZnkodmFsdWUsIG51bGwsIDQpLnNwbGl0KFwiXFxuXCIpLmZvckVhY2goZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgICAgIHdyaXRlKFwiIFwiICsgbGluZSk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHdyaXRlKFwiIFwiICsgdmFsdWUpO1xuICAgIH1cbn07XG5cbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdlbmVyaWNDb2xsZWN0aW9uO1xuZnVuY3Rpb24gR2VuZXJpY0NvbGxlY3Rpb24oKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgY29uc3RydWN0LiBHZW5lcmljQ29sbGVjdGlvbiBpcyBhIG1peGluLlwiKTtcbn1cblxuR2VuZXJpY0NvbGxlY3Rpb24ucHJvdG90eXBlLmFkZEVhY2ggPSBmdW5jdGlvbiAodmFsdWVzKSB7XG4gICAgaWYgKHZhbHVlcyAmJiBPYmplY3QodmFsdWVzKSA9PT0gdmFsdWVzKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWVzLmZvckVhY2ggPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdmFsdWVzLmZvckVhY2godGhpcy5hZGQsIHRoaXMpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZXMubGVuZ3RoID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAvLyBBcnJheS1saWtlIG9iamVjdHMgdGhhdCBkbyBub3QgaW1wbGVtZW50IGZvckVhY2gsIGVyZ28sXG4gICAgICAgICAgICAvLyBBcmd1bWVudHNcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hZGQodmFsdWVzW2ldLCBpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKHZhbHVlcykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hZGQodmFsdWVzW2tleV0sIGtleSk7XG4gICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8vIFRoaXMgaXMgc3VmZmljaWVudGx5IGdlbmVyaWMgZm9yIE1hcCAoc2luY2UgdGhlIHZhbHVlIG1heSBiZSBhIGtleSlcbi8vIGFuZCBvcmRlcmVkIGNvbGxlY3Rpb25zIChzaW5jZSBpdCBmb3J3YXJkcyB0aGUgZXF1YWxzIGFyZ3VtZW50KVxuR2VuZXJpY0NvbGxlY3Rpb24ucHJvdG90eXBlLmRlbGV0ZUVhY2ggPSBmdW5jdGlvbiAodmFsdWVzLCBlcXVhbHMpIHtcbiAgICB2YWx1ZXMuZm9yRWFjaChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpc1tcImRlbGV0ZVwiXSh2YWx1ZSwgZXF1YWxzKTtcbiAgICB9LCB0aGlzKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGFsbCBvZiB0aGUgZm9sbG93aW5nIGZ1bmN0aW9ucyBhcmUgaW1wbGVtZW50ZWQgaW4gdGVybXMgb2YgXCJyZWR1Y2VcIi5cbi8vIHNvbWUgbmVlZCBcImNvbnN0cnVjdENsb25lXCIuXG5cbkdlbmVyaWNDb2xsZWN0aW9uLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24gKGNhbGxiYWNrIC8qLCB0aGlzcCovKSB7XG4gICAgdmFyIHRoaXNwID0gYXJndW1lbnRzWzFdO1xuICAgIHJldHVybiB0aGlzLnJlZHVjZShmdW5jdGlvbiAodW5kZWZpbmVkLCB2YWx1ZSwga2V5LCBvYmplY3QsIGRlcHRoKSB7XG4gICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc3AsIHZhbHVlLCBrZXksIG9iamVjdCwgZGVwdGgpO1xuICAgIH0sIHVuZGVmaW5lZCk7XG59O1xuXG5HZW5lcmljQ29sbGVjdGlvbi5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24gKGNhbGxiYWNrIC8qLCB0aGlzcCovKSB7XG4gICAgdmFyIHRoaXNwID0gYXJndW1lbnRzWzFdO1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB0aGlzLnJlZHVjZShmdW5jdGlvbiAodW5kZWZpbmVkLCB2YWx1ZSwga2V5LCBvYmplY3QsIGRlcHRoKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGNhbGxiYWNrLmNhbGwodGhpc3AsIHZhbHVlLCBrZXksIG9iamVjdCwgZGVwdGgpKTtcbiAgICB9LCB1bmRlZmluZWQpO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5HZW5lcmljQ29sbGVjdGlvbi5wcm90b3R5cGUuZW51bWVyYXRlID0gZnVuY3Rpb24gKHN0YXJ0KSB7XG4gICAgaWYgKHN0YXJ0ID09IG51bGwpIHtcbiAgICAgICAgc3RhcnQgPSAwO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdGhpcy5yZWR1Y2UoZnVuY3Rpb24gKHVuZGVmaW5lZCwgdmFsdWUpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goW3N0YXJ0KyssIHZhbHVlXSk7XG4gICAgfSwgdW5kZWZpbmVkKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuR2VuZXJpY0NvbGxlY3Rpb24ucHJvdG90eXBlLmdyb3VwID0gZnVuY3Rpb24gKGNhbGxiYWNrLCB0aGlzcCwgZXF1YWxzKSB7XG4gICAgZXF1YWxzID0gZXF1YWxzIHx8IE9iamVjdC5lcXVhbHM7XG4gICAgdmFyIGdyb3VwcyA9IFtdO1xuICAgIHZhciBrZXlzID0gW107XG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uICh2YWx1ZSwga2V5LCBvYmplY3QpIHtcbiAgICAgICAgdmFyIGtleSA9IGNhbGxiYWNrLmNhbGwodGhpc3AsIHZhbHVlLCBrZXksIG9iamVjdCk7XG4gICAgICAgIHZhciBpbmRleCA9IGtleXMuaW5kZXhPZihrZXksIGVxdWFscyk7XG4gICAgICAgIHZhciBncm91cDtcbiAgICAgICAgaWYgKGluZGV4ID09PSAtMSkge1xuICAgICAgICAgICAgZ3JvdXAgPSBbXTtcbiAgICAgICAgICAgIGdyb3Vwcy5wdXNoKFtrZXksIGdyb3VwXSk7XG4gICAgICAgICAgICBrZXlzLnB1c2goa2V5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdyb3VwID0gZ3JvdXBzW2luZGV4XVsxXTtcbiAgICAgICAgfVxuICAgICAgICBncm91cC5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gZ3JvdXBzO1xufTtcblxuR2VuZXJpY0NvbGxlY3Rpb24ucHJvdG90eXBlLnRvQXJyYXkgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwKEZ1bmN0aW9uLmlkZW50aXR5KTtcbn07XG5cbi8vIHRoaXMgZGVwZW5kcyBvbiBzdHJpbmdhYmxlIGtleXMsIHdoaWNoIGFwcGx5IHRvIEFycmF5IGFuZCBJdGVyYXRvclxuLy8gYmVjYXVzZSB0aGV5IGhhdmUgbnVtZXJpYyBrZXlzIGFuZCBhbGwgTWFwcyBzaW5jZSB0aGV5IG1heSB1c2Vcbi8vIHN0cmluZ3MgYXMga2V5cy4gIExpc3QsIFNldCwgYW5kIFNvcnRlZFNldCBoYXZlIG5vZGVzIGZvciBrZXlzLCBzb1xuLy8gdG9PYmplY3Qgd291bGQgbm90IGJlIG1lYW5pbmdmdWwuXG5HZW5lcmljQ29sbGVjdGlvbi5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG9iamVjdCA9IHt9O1xuICAgIHRoaXMucmVkdWNlKGZ1bmN0aW9uICh1bmRlZmluZWQsIHZhbHVlLCBrZXkpIHtcbiAgICAgICAgb2JqZWN0W2tleV0gPSB2YWx1ZTtcbiAgICB9LCB1bmRlZmluZWQpO1xuICAgIHJldHVybiBvYmplY3Q7XG59O1xuXG5HZW5lcmljQ29sbGVjdGlvbi5wcm90b3R5cGUuZmlsdGVyID0gZnVuY3Rpb24gKGNhbGxiYWNrIC8qLCB0aGlzcCovKSB7XG4gICAgdmFyIHRoaXNwID0gYXJndW1lbnRzWzFdO1xuICAgIHZhciByZXN1bHQgPSB0aGlzLmNvbnN0cnVjdENsb25lKCk7XG4gICAgdGhpcy5yZWR1Y2UoZnVuY3Rpb24gKHVuZGVmaW5lZCwgdmFsdWUsIGtleSwgb2JqZWN0LCBkZXB0aCkge1xuICAgICAgICBpZiAoY2FsbGJhY2suY2FsbCh0aGlzcCwgdmFsdWUsIGtleSwgb2JqZWN0LCBkZXB0aCkpIHtcbiAgICAgICAgICAgIHJlc3VsdC5hZGQodmFsdWUpO1xuICAgICAgICB9XG4gICAgfSwgdW5kZWZpbmVkKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuR2VuZXJpY0NvbGxlY3Rpb24ucHJvdG90eXBlLmV2ZXJ5ID0gZnVuY3Rpb24gKGNhbGxiYWNrIC8qLCB0aGlzcCovKSB7XG4gICAgdmFyIHRoaXNwID0gYXJndW1lbnRzWzFdO1xuICAgIHJldHVybiB0aGlzLnJlZHVjZShmdW5jdGlvbiAocmVzdWx0LCB2YWx1ZSwga2V5LCBvYmplY3QsIGRlcHRoKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQgJiYgY2FsbGJhY2suY2FsbCh0aGlzcCwgdmFsdWUsIGtleSwgb2JqZWN0LCBkZXB0aCk7XG4gICAgfSwgdHJ1ZSk7XG59O1xuXG5HZW5lcmljQ29sbGVjdGlvbi5wcm90b3R5cGUuc29tZSA9IGZ1bmN0aW9uIChjYWxsYmFjayAvKiwgdGhpc3AqLykge1xuICAgIHZhciB0aGlzcCA9IGFyZ3VtZW50c1sxXTtcbiAgICByZXR1cm4gdGhpcy5yZWR1Y2UoZnVuY3Rpb24gKHJlc3VsdCwgdmFsdWUsIGtleSwgb2JqZWN0LCBkZXB0aCkge1xuICAgICAgICByZXR1cm4gcmVzdWx0IHx8IGNhbGxiYWNrLmNhbGwodGhpc3AsIHZhbHVlLCBrZXksIG9iamVjdCwgZGVwdGgpO1xuICAgIH0sIGZhbHNlKTtcbn07XG5cbkdlbmVyaWNDb2xsZWN0aW9uLnByb3RvdHlwZS5hbGwgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZXZlcnkoQm9vbGVhbik7XG59O1xuXG5HZW5lcmljQ29sbGVjdGlvbi5wcm90b3R5cGUuYW55ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnNvbWUoQm9vbGVhbik7XG59O1xuXG5HZW5lcmljQ29sbGVjdGlvbi5wcm90b3R5cGUubWluID0gZnVuY3Rpb24gKGNvbXBhcmUpIHtcbiAgICBjb21wYXJlID0gY29tcGFyZSB8fCB0aGlzLmNvbnRlbnRDb21wYXJlIHx8IE9iamVjdC5jb21wYXJlO1xuICAgIHZhciBmaXJzdCA9IHRydWU7XG4gICAgcmV0dXJuIHRoaXMucmVkdWNlKGZ1bmN0aW9uIChyZXN1bHQsIHZhbHVlKSB7XG4gICAgICAgIGlmIChmaXJzdCkge1xuICAgICAgICAgICAgZmlyc3QgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBjb21wYXJlKHZhbHVlLCByZXN1bHQpIDwgMCA/IHZhbHVlIDogcmVzdWx0O1xuICAgICAgICB9XG4gICAgfSwgdW5kZWZpbmVkKTtcbn07XG5cbkdlbmVyaWNDb2xsZWN0aW9uLnByb3RvdHlwZS5tYXggPSBmdW5jdGlvbiAoY29tcGFyZSkge1xuICAgIGNvbXBhcmUgPSBjb21wYXJlIHx8IHRoaXMuY29udGVudENvbXBhcmUgfHwgT2JqZWN0LmNvbXBhcmU7XG4gICAgdmFyIGZpcnN0ID0gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcy5yZWR1Y2UoZnVuY3Rpb24gKHJlc3VsdCwgdmFsdWUpIHtcbiAgICAgICAgaWYgKGZpcnN0KSB7XG4gICAgICAgICAgICBmaXJzdCA9IGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGNvbXBhcmUodmFsdWUsIHJlc3VsdCkgPiAwID8gdmFsdWUgOiByZXN1bHQ7XG4gICAgICAgIH1cbiAgICB9LCB1bmRlZmluZWQpO1xufTtcblxuR2VuZXJpY0NvbGxlY3Rpb24ucHJvdG90eXBlLnN1bSA9IGZ1bmN0aW9uICh6ZXJvKSB7XG4gICAgemVybyA9IHplcm8gPT09IHVuZGVmaW5lZCA/IDAgOiB6ZXJvO1xuICAgIHJldHVybiB0aGlzLnJlZHVjZShmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICByZXR1cm4gYSArIGI7XG4gICAgfSwgemVybyk7XG59O1xuXG5HZW5lcmljQ29sbGVjdGlvbi5wcm90b3R5cGUuYXZlcmFnZSA9IGZ1bmN0aW9uICh6ZXJvKSB7XG4gICAgdmFyIHN1bSA9IHplcm8gPT09IHVuZGVmaW5lZCA/IDAgOiB6ZXJvO1xuICAgIHZhciBjb3VudCA9IHplcm8gPT09IHVuZGVmaW5lZCA/IDAgOiB6ZXJvO1xuICAgIHRoaXMucmVkdWNlKGZ1bmN0aW9uICh1bmRlZmluZWQsIHZhbHVlKSB7XG4gICAgICAgIHN1bSArPSB2YWx1ZTtcbiAgICAgICAgY291bnQgKz0gMTtcbiAgICB9LCB1bmRlZmluZWQpO1xuICAgIHJldHVybiBzdW0gLyBjb3VudDtcbn07XG5cbkdlbmVyaWNDb2xsZWN0aW9uLnByb3RvdHlwZS5jb25jYXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJlc3VsdCA9IHRoaXMuY29uc3RydWN0Q2xvbmUodGhpcyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcmVzdWx0LmFkZEVhY2goYXJndW1lbnRzW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbkdlbmVyaWNDb2xsZWN0aW9uLnByb3RvdHlwZS5mbGF0dGVuID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gdGhpcy5yZWR1Y2UoZnVuY3Rpb24gKHJlc3VsdCwgYXJyYXkpIHtcbiAgICAgICAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMucHVzaCh2YWx1ZSk7XG4gICAgICAgIH0sIHJlc3VsdCwgc2VsZik7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSwgW10pO1xufTtcblxuR2VuZXJpY0NvbGxlY3Rpb24ucHJvdG90eXBlLnppcCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdGFibGUgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgIHRhYmxlLnVuc2hpZnQodGhpcyk7XG4gICAgcmV0dXJuIEFycmF5LnVuemlwKHRhYmxlKTtcbn1cblxuR2VuZXJpY0NvbGxlY3Rpb24ucHJvdG90eXBlLmpvaW4gPSBmdW5jdGlvbiAoZGVsaW1pdGVyKSB7XG4gICAgcmV0dXJuIHRoaXMucmVkdWNlKGZ1bmN0aW9uIChyZXN1bHQsIHN0cmluZykge1xuICAgICAgICByZXR1cm4gcmVzdWx0ICsgZGVsaW1pdGVyICsgc3RyaW5nO1xuICAgIH0pO1xufTtcblxuR2VuZXJpY0NvbGxlY3Rpb24ucHJvdG90eXBlLnNvcnRlZCA9IGZ1bmN0aW9uIChjb21wYXJlLCBieSwgb3JkZXIpIHtcbiAgICBjb21wYXJlID0gY29tcGFyZSB8fCB0aGlzLmNvbnRlbnRDb21wYXJlIHx8IE9iamVjdC5jb21wYXJlO1xuICAgIC8vIGFjY291bnQgZm9yIGNvbXBhcmF0b3JzIGdlbmVyYXRlZCBieSBGdW5jdGlvbi5ieVxuICAgIGlmIChjb21wYXJlLmJ5KSB7XG4gICAgICAgIGJ5ID0gY29tcGFyZS5ieTtcbiAgICAgICAgY29tcGFyZSA9IGNvbXBhcmUuY29tcGFyZSB8fCB0aGlzLmNvbnRlbnRDb21wYXJlIHx8IE9iamVjdC5jb21wYXJlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGJ5ID0gYnkgfHwgRnVuY3Rpb24uaWRlbnRpdHk7XG4gICAgfVxuICAgIGlmIChvcmRlciA9PT0gdW5kZWZpbmVkKVxuICAgICAgICBvcmRlciA9IDE7XG4gICAgcmV0dXJuIHRoaXMubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBieTogYnkoaXRlbSksXG4gICAgICAgICAgICB2YWx1ZTogaXRlbVxuICAgICAgICB9O1xuICAgIH0pXG4gICAgLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGNvbXBhcmUoYS5ieSwgYi5ieSkgKiBvcmRlcjtcbiAgICB9KVxuICAgIC5tYXAoZnVuY3Rpb24gKHBhaXIpIHtcbiAgICAgICAgcmV0dXJuIHBhaXIudmFsdWU7XG4gICAgfSk7XG59O1xuXG5HZW5lcmljQ29sbGVjdGlvbi5wcm90b3R5cGUucmV2ZXJzZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29uc3RydWN0Q2xvbmUodGhpcykucmV2ZXJzZSgpO1xufTtcblxuR2VuZXJpY0NvbGxlY3Rpb24ucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24gKGRlcHRoLCBtZW1vKSB7XG4gICAgaWYgKGRlcHRoID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZGVwdGggPSBJbmZpbml0eTtcbiAgICB9IGVsc2UgaWYgKGRlcHRoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB2YXIgY2xvbmUgPSB0aGlzLmNvbnN0cnVjdENsb25lKCk7XG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICAgIGNsb25lLmFkZChPYmplY3QuY2xvbmUodmFsdWUsIGRlcHRoIC0gMSwgbWVtbyksIGtleSk7XG4gICAgfSwgdGhpcyk7XG4gICAgcmV0dXJuIGNsb25lO1xufTtcblxuR2VuZXJpY0NvbGxlY3Rpb24ucHJvdG90eXBlLm9ubHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9uZSgpO1xuICAgIH1cbn07XG5cbkdlbmVyaWNDb2xsZWN0aW9uLnByb3RvdHlwZS5pdGVyYXRvciA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5pdGVyYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG5yZXF1aXJlKFwiLi9zaGltLWFycmF5XCIpO1xuXG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIE9iamVjdCA9IHJlcXVpcmUoXCIuL3NoaW0tb2JqZWN0XCIpO1xudmFyIE1hcENoYW5nZXMgPSByZXF1aXJlKFwiLi9saXN0ZW4vbWFwLWNoYW5nZXNcIik7XG52YXIgUHJvcGVydHlDaGFuZ2VzID0gcmVxdWlyZShcIi4vbGlzdGVuL3Byb3BlcnR5LWNoYW5nZXNcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gR2VuZXJpY01hcDtcbmZ1bmN0aW9uIEdlbmVyaWNNYXAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgY29uc3RydWN0LiBHZW5lcmljTWFwIGlzIGEgbWl4aW4uXCIpO1xufVxuXG5PYmplY3QuYWRkRWFjaChHZW5lcmljTWFwLnByb3RvdHlwZSwgTWFwQ2hhbmdlcy5wcm90b3R5cGUpO1xuT2JqZWN0LmFkZEVhY2goR2VuZXJpY01hcC5wcm90b3R5cGUsIFByb3BlcnR5Q2hhbmdlcy5wcm90b3R5cGUpO1xuXG4vLyBhbGwgb2YgdGhlc2UgbWV0aG9kcyBkZXBlbmQgb24gdGhlIGNvbnN0cnVjdG9yIHByb3ZpZGluZyBhIGBzdG9yZWAgc2V0XG5cbkdlbmVyaWNNYXAucHJvdG90eXBlLmlzTWFwID0gdHJ1ZTtcblxuR2VuZXJpY01hcC5wcm90b3R5cGUuYWRkRWFjaCA9IGZ1bmN0aW9uICh2YWx1ZXMpIHtcbiAgICBpZiAodmFsdWVzICYmIE9iamVjdCh2YWx1ZXMpID09PSB2YWx1ZXMpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZXMuZm9yRWFjaCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAvLyBjb3B5IG1hcC1hbGlrZXNcbiAgICAgICAgICAgIGlmICh2YWx1ZXMuaXNNYXAgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuZm9yRWFjaChmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldChrZXksIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgICAgIC8vIGl0ZXJhdGUga2V5IHZhbHVlIHBhaXJzIG9mIG90aGVyIGl0ZXJhYmxlc1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMuZm9yRWFjaChmdW5jdGlvbiAocGFpcikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldChwYWlyWzBdLCBwYWlyWzFdKTtcbiAgICAgICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGNvcHkgb3RoZXIgb2JqZWN0cyBhcyBtYXAtYWxpa2VzXG4gICAgICAgICAgICBPYmplY3Qua2V5cyh2YWx1ZXMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0KGtleSwgdmFsdWVzW2tleV0pO1xuICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59XG5cbkdlbmVyaWNNYXAucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChrZXksIGRlZmF1bHRWYWx1ZSkge1xuICAgIHZhciBpdGVtID0gdGhpcy5zdG9yZS5nZXQobmV3IHRoaXMuSXRlbShrZXkpKTtcbiAgICBpZiAoaXRlbSkge1xuICAgICAgICByZXR1cm4gaXRlbS52YWx1ZTtcbiAgICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RGVmYXVsdChrZXkpO1xuICAgIH1cbn07XG5cbkdlbmVyaWNNYXAucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gICAgdmFyIGl0ZW0gPSBuZXcgdGhpcy5JdGVtKGtleSwgdmFsdWUpO1xuICAgIHZhciBmb3VuZCA9IHRoaXMuc3RvcmUuZ2V0KGl0ZW0pO1xuICAgIHZhciBncmV3ID0gZmFsc2U7XG4gICAgaWYgKGZvdW5kKSB7IC8vIHVwZGF0ZVxuICAgICAgICBpZiAodGhpcy5kaXNwYXRjaGVzTWFwQ2hhbmdlcykge1xuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEJlZm9yZU1hcENoYW5nZShrZXksIGZvdW5kLnZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBmb3VuZC52YWx1ZSA9IHZhbHVlO1xuICAgICAgICBpZiAodGhpcy5kaXNwYXRjaGVzTWFwQ2hhbmdlcykge1xuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaE1hcENoYW5nZShrZXksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7IC8vIGNyZWF0ZVxuICAgICAgICBpZiAodGhpcy5kaXNwYXRjaGVzTWFwQ2hhbmdlcykge1xuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEJlZm9yZU1hcENoYW5nZShrZXksIHVuZGVmaW5lZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuc3RvcmUuYWRkKGl0ZW0pKSB7XG4gICAgICAgICAgICB0aGlzLmxlbmd0aCsrO1xuICAgICAgICAgICAgZ3JldyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZGlzcGF0Y2hlc01hcENoYW5nZXMpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hNYXBDaGFuZ2Uoa2V5LCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGdyZXc7XG59O1xuXG5HZW5lcmljTWFwLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgIHJldHVybiB0aGlzLnNldChrZXksIHZhbHVlKTtcbn07XG5cbkdlbmVyaWNNYXAucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5zdG9yZS5oYXMobmV3IHRoaXMuSXRlbShrZXkpKTtcbn07XG5cbkdlbmVyaWNNYXAucHJvdG90eXBlWydkZWxldGUnXSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICB2YXIgaXRlbSA9IG5ldyB0aGlzLkl0ZW0oa2V5KTtcbiAgICBpZiAodGhpcy5zdG9yZS5oYXMoaXRlbSkpIHtcbiAgICAgICAgdmFyIGZyb20gPSB0aGlzLnN0b3JlLmdldChpdGVtKS52YWx1ZTtcbiAgICAgICAgaWYgKHRoaXMuZGlzcGF0Y2hlc01hcENoYW5nZXMpIHtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hCZWZvcmVNYXBDaGFuZ2Uoa2V5LCBmcm9tKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN0b3JlW1wiZGVsZXRlXCJdKGl0ZW0pO1xuICAgICAgICB0aGlzLmxlbmd0aC0tO1xuICAgICAgICBpZiAodGhpcy5kaXNwYXRjaGVzTWFwQ2hhbmdlcykge1xuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaE1hcENoYW5nZShrZXksIHVuZGVmaW5lZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbkdlbmVyaWNNYXAucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBrZXlzO1xuICAgIGlmICh0aGlzLmRpc3BhdGNoZXNNYXBDaGFuZ2VzKSB7XG4gICAgICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEJlZm9yZU1hcENoYW5nZShrZXksIHZhbHVlKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIGtleXMgPSB0aGlzLmtleXMoKTtcbiAgICB9XG4gICAgdGhpcy5zdG9yZS5jbGVhcigpO1xuICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICBpZiAodGhpcy5kaXNwYXRjaGVzTWFwQ2hhbmdlcykge1xuICAgICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaE1hcENoYW5nZShrZXkpO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9XG59O1xuXG5HZW5lcmljTWFwLnByb3RvdHlwZS5yZWR1Y2UgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIGJhc2lzLCB0aGlzcCkge1xuICAgIHJldHVybiB0aGlzLnN0b3JlLnJlZHVjZShmdW5jdGlvbiAoYmFzaXMsIGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmNhbGwodGhpc3AsIGJhc2lzLCBpdGVtLnZhbHVlLCBpdGVtLmtleSwgdGhpcyk7XG4gICAgfSwgYmFzaXMsIHRoaXMpO1xufTtcblxuR2VuZXJpY01hcC5wcm90b3R5cGUucmVkdWNlUmlnaHQgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIGJhc2lzLCB0aGlzcCkge1xuICAgIHJldHVybiB0aGlzLnN0b3JlLnJlZHVjZVJpZ2h0KGZ1bmN0aW9uIChiYXNpcywgaXRlbSkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2suY2FsbCh0aGlzcCwgYmFzaXMsIGl0ZW0udmFsdWUsIGl0ZW0ua2V5LCB0aGlzKTtcbiAgICB9LCBiYXNpcywgdGhpcyk7XG59O1xuXG5HZW5lcmljTWFwLnByb3RvdHlwZS5rZXlzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1hcChmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgICByZXR1cm4ga2V5O1xuICAgIH0pO1xufTtcblxuR2VuZXJpY01hcC5wcm90b3R5cGUudmFsdWVzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1hcChGdW5jdGlvbi5pZGVudGl0eSk7XG59O1xuXG5HZW5lcmljTWFwLnByb3RvdHlwZS5lbnRyaWVzID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1hcChmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgICByZXR1cm4gW2tleSwgdmFsdWVdO1xuICAgIH0pO1xufTtcblxuLy8gWFhYIGRlcHJlY2F0ZWRcbkdlbmVyaWNNYXAucHJvdG90eXBlLml0ZW1zID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmVudHJpZXMoKTtcbn07XG5cbkdlbmVyaWNNYXAucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uICh0aGF0LCBlcXVhbHMpIHtcbiAgICBlcXVhbHMgPSBlcXVhbHMgfHwgT2JqZWN0LmVxdWFscztcbiAgICBpZiAodGhpcyA9PT0gdGhhdCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKE9iamVjdC5jYW4odGhhdCwgXCJldmVyeVwiKSkge1xuICAgICAgICByZXR1cm4gdGhhdC5sZW5ndGggPT09IHRoaXMubGVuZ3RoICYmIHRoYXQuZXZlcnkoZnVuY3Rpb24gKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgICAgIHJldHVybiBlcXVhbHModGhpcy5nZXQoa2V5KSwgdmFsdWUpO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoYXQpO1xuICAgICAgICByZXR1cm4ga2V5cy5sZW5ndGggPT09IHRoaXMubGVuZ3RoICYmIE9iamVjdC5rZXlzKHRoYXQpLmV2ZXJ5KGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIHJldHVybiBlcXVhbHModGhpcy5nZXQoa2V5KSwgdGhhdFtrZXldKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfVxufTtcblxuR2VuZXJpY01hcC5wcm90b3R5cGUuSXRlbSA9IEl0ZW07XG5cbmZ1bmN0aW9uIEl0ZW0oa2V5LCB2YWx1ZSkge1xuICAgIHRoaXMua2V5ID0ga2V5O1xuICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbn1cblxuSXRlbS5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gKHRoYXQpIHtcbiAgICByZXR1cm4gT2JqZWN0LmVxdWFscyh0aGlzLmtleSwgdGhhdC5rZXkpICYmIE9iamVjdC5lcXVhbHModGhpcy52YWx1ZSwgdGhhdC52YWx1ZSk7XG59O1xuXG5JdGVtLnByb3RvdHlwZS5jb21wYXJlID0gZnVuY3Rpb24gKHRoYXQpIHtcbiAgICByZXR1cm4gT2JqZWN0LmNvbXBhcmUodGhpcy5rZXksIHRoYXQua2V5KTtcbn07XG5cbiIsIlxudmFyIE9iamVjdCA9IHJlcXVpcmUoXCIuL3NoaW0tb2JqZWN0XCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdlbmVyaWNPcmRlcjtcbmZ1bmN0aW9uIEdlbmVyaWNPcmRlcigpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBjb25zdHJ1Y3QuIEdlbmVyaWNPcmRlciBpcyBhIG1peGluLlwiKTtcbn1cblxuR2VuZXJpY09yZGVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAodGhhdCwgZXF1YWxzKSB7XG4gICAgZXF1YWxzID0gZXF1YWxzIHx8IHRoaXMuY29udGVudEVxdWFscyB8fCBPYmplY3QuZXF1YWxzO1xuXG4gICAgaWYgKHRoaXMgPT09IHRoYXQpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmICghdGhhdCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiAoXG4gICAgICAgIHRoaXMubGVuZ3RoID09PSB0aGF0Lmxlbmd0aCAmJlxuICAgICAgICB0aGlzLnppcCh0aGF0KS5ldmVyeShmdW5jdGlvbiAocGFpcikge1xuICAgICAgICAgICAgcmV0dXJuIGVxdWFscyhwYWlyWzBdLCBwYWlyWzFdKTtcbiAgICAgICAgfSlcbiAgICApO1xufTtcblxuR2VuZXJpY09yZGVyLnByb3RvdHlwZS5jb21wYXJlID0gZnVuY3Rpb24gKHRoYXQsIGNvbXBhcmUpIHtcbiAgICBjb21wYXJlID0gY29tcGFyZSB8fCB0aGlzLmNvbnRlbnRDb21wYXJlIHx8IE9iamVjdC5jb21wYXJlO1xuXG4gICAgaWYgKHRoaXMgPT09IHRoYXQpIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIGlmICghdGhhdCkge1xuICAgICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICB2YXIgbGVuZ3RoID0gTWF0aC5taW4odGhpcy5sZW5ndGgsIHRoYXQubGVuZ3RoKTtcbiAgICB2YXIgY29tcGFyaXNvbiA9IHRoaXMuemlwKHRoYXQpLnJlZHVjZShmdW5jdGlvbiAoY29tcGFyaXNvbiwgcGFpciwgaW5kZXgpIHtcbiAgICAgICAgaWYgKGNvbXBhcmlzb24gPT09IDApIHtcbiAgICAgICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29tcGFyaXNvbjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbXBhcmUocGFpclswXSwgcGFpclsxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gY29tcGFyaXNvbjtcbiAgICAgICAgfVxuICAgIH0sIDApO1xuICAgIGlmIChjb21wYXJpc29uID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmxlbmd0aCAtIHRoYXQubGVuZ3RoO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGFyaXNvbjtcbn07XG5cbiIsIlxubW9kdWxlLmV4cG9ydHMgPSBHZW5lcmljU2V0O1xuZnVuY3Rpb24gR2VuZXJpY1NldCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBjb25zdHJ1Y3QuIEdlbmVyaWNTZXQgaXMgYSBtaXhpbi5cIik7XG59XG5cbkdlbmVyaWNTZXQucHJvdG90eXBlLnVuaW9uID0gZnVuY3Rpb24gKHRoYXQpIHtcbiAgICB2YXIgdW5pb24gPSAgdGhpcy5jb25zdHJ1Y3RDbG9uZSh0aGlzKTtcbiAgICB1bmlvbi5hZGRFYWNoKHRoYXQpO1xuICAgIHJldHVybiB1bmlvbjtcbn07XG5cbkdlbmVyaWNTZXQucHJvdG90eXBlLmludGVyc2VjdGlvbiA9IGZ1bmN0aW9uICh0aGF0KSB7XG4gICAgcmV0dXJuIHRoaXMuY29uc3RydWN0Q2xvbmUodGhpcy5maWx0ZXIoZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB0aGF0Lmhhcyh2YWx1ZSk7XG4gICAgfSkpO1xufTtcblxuR2VuZXJpY1NldC5wcm90b3R5cGUuZGlmZmVyZW5jZSA9IGZ1bmN0aW9uICh0aGF0KSB7XG4gICAgdmFyIHVuaW9uID0gIHRoaXMuY29uc3RydWN0Q2xvbmUodGhpcyk7XG4gICAgdW5pb24uZGVsZXRlRWFjaCh0aGF0KTtcbiAgICByZXR1cm4gdW5pb247XG59O1xuXG5HZW5lcmljU2V0LnByb3RvdHlwZS5zeW1tZXRyaWNEaWZmZXJlbmNlID0gZnVuY3Rpb24gKHRoYXQpIHtcbiAgICB2YXIgdW5pb24gPSB0aGlzLnVuaW9uKHRoYXQpO1xuICAgIHZhciBpbnRlcnNlY3Rpb24gPSB0aGlzLmludGVyc2VjdGlvbih0aGF0KTtcbiAgICByZXR1cm4gdW5pb24uZGlmZmVyZW5jZShpbnRlcnNlY3Rpb24pO1xufTtcblxuR2VuZXJpY1NldC5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gKHRoYXQsIGVxdWFscykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gKFxuICAgICAgICBPYmplY3QuY2FuKHRoYXQsIFwicmVkdWNlXCIpICYmXG4gICAgICAgIHRoaXMubGVuZ3RoID09PSB0aGF0Lmxlbmd0aCAmJlxuICAgICAgICB0aGF0LnJlZHVjZShmdW5jdGlvbiAoZXF1YWwsIHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gZXF1YWwgJiYgc2VsZi5oYXModmFsdWUsIGVxdWFscyk7XG4gICAgICAgIH0sIHRydWUpXG4gICAgKTtcbn07XG5cbi8vIFczQyBET01Ub2tlbkxpc3QgQVBJIG92ZXJsYXAgKGRvZXMgbm90IGhhbmRsZSB2YXJpYWRpYyBhcmd1bWVudHMpXG5cbkdlbmVyaWNTZXQucHJvdG90eXBlLmNvbnRhaW5zID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuaGFzKHZhbHVlKTtcbn07XG5cbkdlbmVyaWNTZXQucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzW1wiZGVsZXRlXCJdKHZhbHVlKTtcbn07XG5cbkdlbmVyaWNTZXQucHJvdG90eXBlLnRvZ2dsZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICh0aGlzLmhhcyh2YWx1ZSkpIHtcbiAgICAgICAgdGhpc1tcImRlbGV0ZVwiXSh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5hZGQodmFsdWUpO1xuICAgIH1cbn07XG5cbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IExpc3Q7XG5cbnZhciBTaGltID0gcmVxdWlyZShcIi4vc2hpbVwiKTtcbnZhciBHZW5lcmljQ29sbGVjdGlvbiA9IHJlcXVpcmUoXCIuL2dlbmVyaWMtY29sbGVjdGlvblwiKTtcbnZhciBHZW5lcmljT3JkZXIgPSByZXF1aXJlKFwiLi9nZW5lcmljLW9yZGVyXCIpO1xudmFyIFByb3BlcnR5Q2hhbmdlcyA9IHJlcXVpcmUoXCIuL2xpc3Rlbi9wcm9wZXJ0eS1jaGFuZ2VzXCIpO1xudmFyIFJhbmdlQ2hhbmdlcyA9IHJlcXVpcmUoXCIuL2xpc3Rlbi9yYW5nZS1jaGFuZ2VzXCIpO1xuXG5mdW5jdGlvbiBMaXN0KHZhbHVlcywgZXF1YWxzLCBnZXREZWZhdWx0KSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIExpc3QpKSB7XG4gICAgICAgIHJldHVybiBuZXcgTGlzdCh2YWx1ZXMsIGVxdWFscywgZ2V0RGVmYXVsdCk7XG4gICAgfVxuICAgIHZhciBoZWFkID0gdGhpcy5oZWFkID0gbmV3IHRoaXMuTm9kZSgpO1xuICAgIGhlYWQubmV4dCA9IGhlYWQ7XG4gICAgaGVhZC5wcmV2ID0gaGVhZDtcbiAgICB0aGlzLmNvbnRlbnRFcXVhbHMgPSBlcXVhbHMgfHwgT2JqZWN0LmVxdWFscztcbiAgICB0aGlzLmdldERlZmF1bHQgPSBnZXREZWZhdWx0IHx8IEZ1bmN0aW9uLm5vb3A7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIHRoaXMuYWRkRWFjaCh2YWx1ZXMpO1xufVxuXG5MaXN0Lkxpc3QgPSBMaXN0OyAvLyBoYWNrIHNvIHJlcXVpcmUoXCJsaXN0XCIpLkxpc3Qgd2lsbCB3b3JrIGluIE1vbnRhZ2VKU1xuXG5PYmplY3QuYWRkRWFjaChMaXN0LnByb3RvdHlwZSwgR2VuZXJpY0NvbGxlY3Rpb24ucHJvdG90eXBlKTtcbk9iamVjdC5hZGRFYWNoKExpc3QucHJvdG90eXBlLCBHZW5lcmljT3JkZXIucHJvdG90eXBlKTtcbk9iamVjdC5hZGRFYWNoKExpc3QucHJvdG90eXBlLCBQcm9wZXJ0eUNoYW5nZXMucHJvdG90eXBlKTtcbk9iamVjdC5hZGRFYWNoKExpc3QucHJvdG90eXBlLCBSYW5nZUNoYW5nZXMucHJvdG90eXBlKTtcblxuTGlzdC5wcm90b3R5cGUuY29uc3RydWN0Q2xvbmUgPSBmdW5jdGlvbiAodmFsdWVzKSB7XG4gICAgcmV0dXJuIG5ldyB0aGlzLmNvbnN0cnVjdG9yKHZhbHVlcywgdGhpcy5jb250ZW50RXF1YWxzLCB0aGlzLmdldERlZmF1bHQpO1xufTtcblxuTGlzdC5wcm90b3R5cGUuZmluZCA9IGZ1bmN0aW9uICh2YWx1ZSwgZXF1YWxzKSB7XG4gICAgZXF1YWxzID0gZXF1YWxzIHx8IHRoaXMuY29udGVudEVxdWFscztcbiAgICB2YXIgaGVhZCA9IHRoaXMuaGVhZDtcbiAgICB2YXIgYXQgPSBoZWFkLm5leHQ7XG4gICAgd2hpbGUgKGF0ICE9PSBoZWFkKSB7XG4gICAgICAgIGlmIChlcXVhbHMoYXQudmFsdWUsIHZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGF0O1xuICAgICAgICB9XG4gICAgICAgIGF0ID0gYXQubmV4dDtcbiAgICB9XG59O1xuXG5MaXN0LnByb3RvdHlwZS5maW5kTGFzdCA9IGZ1bmN0aW9uICh2YWx1ZSwgZXF1YWxzKSB7XG4gICAgZXF1YWxzID0gZXF1YWxzIHx8IHRoaXMuY29udGVudEVxdWFscztcbiAgICB2YXIgaGVhZCA9IHRoaXMuaGVhZDtcbiAgICB2YXIgYXQgPSBoZWFkLnByZXY7XG4gICAgd2hpbGUgKGF0ICE9PSBoZWFkKSB7XG4gICAgICAgIGlmIChlcXVhbHMoYXQudmFsdWUsIHZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGF0O1xuICAgICAgICB9XG4gICAgICAgIGF0ID0gYXQucHJldjtcbiAgICB9XG59O1xuXG5MaXN0LnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbiAodmFsdWUsIGVxdWFscykge1xuICAgIHJldHVybiAhIXRoaXMuZmluZCh2YWx1ZSwgZXF1YWxzKTtcbn07XG5cbkxpc3QucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uICh2YWx1ZSwgZXF1YWxzKSB7XG4gICAgdmFyIGZvdW5kID0gdGhpcy5maW5kKHZhbHVlLCBlcXVhbHMpO1xuICAgIGlmIChmb3VuZCkge1xuICAgICAgICByZXR1cm4gZm91bmQudmFsdWU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmdldERlZmF1bHQodmFsdWUpO1xufTtcblxuLy8gTElGTyAoZGVsZXRlIHJlbW92ZXMgdGhlIG1vc3QgcmVjZW50bHkgYWRkZWQgZXF1aXZhbGVudCB2YWx1ZSlcbkxpc3QucHJvdG90eXBlWydkZWxldGUnXSA9IGZ1bmN0aW9uICh2YWx1ZSwgZXF1YWxzKSB7XG4gICAgdmFyIGZvdW5kID0gdGhpcy5maW5kTGFzdCh2YWx1ZSwgZXF1YWxzKTtcbiAgICBpZiAoZm91bmQpIHtcbiAgICAgICAgaWYgKHRoaXMuZGlzcGF0Y2hlc1JhbmdlQ2hhbmdlcykge1xuICAgICAgICAgICAgdmFyIHBsdXMgPSBbXTtcbiAgICAgICAgICAgIHZhciBtaW51cyA9IFt2YWx1ZV07XG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoQmVmb3JlUmFuZ2VDaGFuZ2UocGx1cywgbWludXMsIGZvdW5kLmluZGV4KTtcbiAgICAgICAgfVxuICAgICAgICBmb3VuZFsnZGVsZXRlJ10oKTtcbiAgICAgICAgdGhpcy5sZW5ndGgtLTtcbiAgICAgICAgaWYgKHRoaXMuZGlzcGF0Y2hlc1JhbmdlQ2hhbmdlcykge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVJbmRleGVzKGZvdW5kLm5leHQsIGZvdW5kLmluZGV4KTtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hSYW5nZUNoYW5nZShwbHVzLCBtaW51cywgZm91bmQuaW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5MaXN0LnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcGx1cywgbWludXM7XG4gICAgaWYgKHRoaXMuZGlzcGF0Y2hlc1JhbmdlQ2hhbmdlcykge1xuICAgICAgICBtaW51cyA9IHRoaXMudG9BcnJheSgpO1xuICAgICAgICBwbHVzID0gW107XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hCZWZvcmVSYW5nZUNoYW5nZShwbHVzLCBtaW51cywgMCk7XG4gICAgfVxuICAgIHRoaXMuaGVhZC5uZXh0ID0gdGhpcy5oZWFkLnByZXYgPSB0aGlzLmhlYWQ7XG4gICAgdGhpcy5sZW5ndGggPSAwO1xuICAgIGlmICh0aGlzLmRpc3BhdGNoZXNSYW5nZUNoYW5nZXMpIHtcbiAgICAgICAgdGhpcy5kaXNwYXRjaFJhbmdlQ2hhbmdlKHBsdXMsIG1pbnVzLCAwKTtcbiAgICB9XG59O1xuXG5MaXN0LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgbm9kZSA9IG5ldyB0aGlzLk5vZGUodmFsdWUpXG4gICAgaWYgKHRoaXMuZGlzcGF0Y2hlc1JhbmdlQ2hhbmdlcykge1xuICAgICAgICBub2RlLmluZGV4ID0gdGhpcy5sZW5ndGg7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hCZWZvcmVSYW5nZUNoYW5nZShbdmFsdWVdLCBbXSwgbm9kZS5pbmRleCk7XG4gICAgfVxuICAgIHRoaXMuaGVhZC5hZGRCZWZvcmUobm9kZSk7XG4gICAgdGhpcy5sZW5ndGgrKztcbiAgICBpZiAodGhpcy5kaXNwYXRjaGVzUmFuZ2VDaGFuZ2VzKSB7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hSYW5nZUNoYW5nZShbdmFsdWVdLCBbXSwgbm9kZS5pbmRleCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuTGlzdC5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgaGVhZCA9IHRoaXMuaGVhZDtcbiAgICBpZiAodGhpcy5kaXNwYXRjaGVzUmFuZ2VDaGFuZ2VzKSB7XG4gICAgICAgIHZhciBwbHVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIG1pbnVzID0gW11cbiAgICAgICAgdmFyIGluZGV4ID0gdGhpcy5sZW5ndGg7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hCZWZvcmVSYW5nZUNoYW5nZShwbHVzLCBtaW51cywgaW5kZXgpO1xuICAgICAgICB2YXIgc3RhcnQgPSB0aGlzLmhlYWQucHJldjtcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHZhbHVlID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB2YXIgbm9kZSA9IG5ldyB0aGlzLk5vZGUodmFsdWUpO1xuICAgICAgICBoZWFkLmFkZEJlZm9yZShub2RlKTtcbiAgICB9XG4gICAgdGhpcy5sZW5ndGggKz0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBpZiAodGhpcy5kaXNwYXRjaGVzUmFuZ2VDaGFuZ2VzKSB7XG4gICAgICAgIHRoaXMudXBkYXRlSW5kZXhlcyhzdGFydC5uZXh0LCBzdGFydC5pbmRleCA9PT0gdW5kZWZpbmVkID8gMCA6IHN0YXJ0LmluZGV4ICsgMSk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hSYW5nZUNoYW5nZShwbHVzLCBtaW51cywgaW5kZXgpO1xuICAgIH1cbn07XG5cbkxpc3QucHJvdG90eXBlLnVuc2hpZnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuZGlzcGF0Y2hlc1JhbmdlQ2hhbmdlcykge1xuICAgICAgICB2YXIgcGx1cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciBtaW51cyA9IFtdO1xuICAgICAgICB0aGlzLmRpc3BhdGNoQmVmb3JlUmFuZ2VDaGFuZ2UocGx1cywgbWludXMsIDApO1xuICAgIH1cbiAgICB2YXIgYXQgPSB0aGlzLmhlYWQ7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHZhbHVlID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB2YXIgbm9kZSA9IG5ldyB0aGlzLk5vZGUodmFsdWUpO1xuICAgICAgICBhdC5hZGRBZnRlcihub2RlKTtcbiAgICAgICAgYXQgPSBub2RlO1xuICAgIH1cbiAgICB0aGlzLmxlbmd0aCArPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGlmICh0aGlzLmRpc3BhdGNoZXNSYW5nZUNoYW5nZXMpIHtcbiAgICAgICAgdGhpcy51cGRhdGVJbmRleGVzKHRoaXMuaGVhZC5uZXh0LCAwKTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaFJhbmdlQ2hhbmdlKHBsdXMsIG1pbnVzLCAwKTtcbiAgICB9XG59O1xuXG5MaXN0LnByb3RvdHlwZS5wb3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZhbHVlO1xuICAgIHZhciBoZWFkID0gdGhpcy5oZWFkO1xuICAgIGlmIChoZWFkLnByZXYgIT09IGhlYWQpIHtcbiAgICAgICAgdmFsdWUgPSBoZWFkLnByZXYudmFsdWU7XG4gICAgICAgIGlmICh0aGlzLmRpc3BhdGNoZXNSYW5nZUNoYW5nZXMpIHtcbiAgICAgICAgICAgIHZhciBwbHVzID0gW107XG4gICAgICAgICAgICB2YXIgbWludXMgPSBbdmFsdWVdO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gdGhpcy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaEJlZm9yZVJhbmdlQ2hhbmdlKHBsdXMsIG1pbnVzLCBpbmRleCk7XG4gICAgICAgIH1cbiAgICAgICAgaGVhZC5wcmV2WydkZWxldGUnXSgpO1xuICAgICAgICB0aGlzLmxlbmd0aC0tO1xuICAgICAgICBpZiAodGhpcy5kaXNwYXRjaGVzUmFuZ2VDaGFuZ2VzKSB7XG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoUmFuZ2VDaGFuZ2UocGx1cywgbWludXMsIGluZGV4KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG59O1xuXG5MaXN0LnByb3RvdHlwZS5zaGlmdCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgdmFsdWU7XG4gICAgdmFyIGhlYWQgPSB0aGlzLmhlYWQ7XG4gICAgaWYgKGhlYWQucHJldiAhPT0gaGVhZCkge1xuICAgICAgICB2YWx1ZSA9IGhlYWQubmV4dC52YWx1ZTtcbiAgICAgICAgaWYgKHRoaXMuZGlzcGF0Y2hlc1JhbmdlQ2hhbmdlcykge1xuICAgICAgICAgICAgdmFyIHBsdXMgPSBbXTtcbiAgICAgICAgICAgIHZhciBtaW51cyA9IFt2YWx1ZV07XG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoQmVmb3JlUmFuZ2VDaGFuZ2UocGx1cywgbWludXMsIDApO1xuICAgICAgICB9XG4gICAgICAgIGhlYWQubmV4dFsnZGVsZXRlJ10oKTtcbiAgICAgICAgdGhpcy5sZW5ndGgtLTtcbiAgICAgICAgaWYgKHRoaXMuZGlzcGF0Y2hlc1JhbmdlQ2hhbmdlcykge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVJbmRleGVzKHRoaXMuaGVhZC5uZXh0LCAwKTtcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hSYW5nZUNoYW5nZShwbHVzLCBtaW51cywgMCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xufTtcblxuTGlzdC5wcm90b3R5cGUucGVlayA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5oZWFkICE9PSB0aGlzLmhlYWQubmV4dCkge1xuICAgICAgICByZXR1cm4gdGhpcy5oZWFkLm5leHQudmFsdWU7XG4gICAgfVxufTtcblxuTGlzdC5wcm90b3R5cGUucG9rZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICh0aGlzLmhlYWQgIT09IHRoaXMuaGVhZC5uZXh0KSB7XG4gICAgICAgIHRoaXMuaGVhZC5uZXh0LnZhbHVlID0gdmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5wdXNoKHZhbHVlKTtcbiAgICB9XG59O1xuXG5MaXN0LnByb3RvdHlwZS5vbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMucGVlaygpO1xufTtcblxuLy8gYW4gaW50ZXJuYWwgdXRpbGl0eSBmb3IgY29lcmNpbmcgaW5kZXggb2Zmc2V0cyB0byBub2Rlc1xuTGlzdC5wcm90b3R5cGUuc2NhbiA9IGZ1bmN0aW9uIChhdCwgZmFsbGJhY2spIHtcbiAgICB2YXIgaGVhZCA9IHRoaXMuaGVhZDtcbiAgICBpZiAodHlwZW9mIGF0ID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgIHZhciBjb3VudCA9IGF0O1xuICAgICAgICBpZiAoY291bnQgPj0gMCkge1xuICAgICAgICAgICAgYXQgPSBoZWFkLm5leHQ7XG4gICAgICAgICAgICB3aGlsZSAoY291bnQpIHtcbiAgICAgICAgICAgICAgICBjb3VudC0tO1xuICAgICAgICAgICAgICAgIGF0ID0gYXQubmV4dDtcbiAgICAgICAgICAgICAgICBpZiAoYXQgPT0gaGVhZCkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhdCA9IGhlYWQ7XG4gICAgICAgICAgICB3aGlsZSAoY291bnQgPCAwKSB7XG4gICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgICAgICBhdCA9IGF0LnByZXY7XG4gICAgICAgICAgICAgICAgaWYgKGF0ID09IGhlYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhdDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYXQgfHwgZmFsbGJhY2s7XG4gICAgfVxufTtcblxuLy8gYXQgYW5kIGVuZCBtYXkgYm90aCBiZSBwb3NpdGl2ZSBvciBuZWdhdGl2ZSBudW1iZXJzIChpbiB3aGljaCBjYXNlcyB0aGV5XG4vLyBjb3JyZXNwb25kIHRvIG51bWVyaWMgaW5kaWNpZXMsIG9yIG5vZGVzKVxuTGlzdC5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiAoYXQsIGVuZCkge1xuICAgIHZhciBzbGljZWQgPSBbXTtcbiAgICB2YXIgaGVhZCA9IHRoaXMuaGVhZDtcbiAgICBhdCA9IHRoaXMuc2NhbihhdCwgaGVhZC5uZXh0KTtcbiAgICBlbmQgPSB0aGlzLnNjYW4oZW5kLCBoZWFkKTtcblxuICAgIHdoaWxlIChhdCAhPT0gZW5kICYmIGF0ICE9PSBoZWFkKSB7XG4gICAgICAgIHNsaWNlZC5wdXNoKGF0LnZhbHVlKTtcbiAgICAgICAgYXQgPSBhdC5uZXh0O1xuICAgIH1cblxuICAgIHJldHVybiBzbGljZWQ7XG59O1xuXG5MaXN0LnByb3RvdHlwZS5zcGxpY2UgPSBmdW5jdGlvbiAoYXQsIGxlbmd0aCAvKi4uLnBsdXMqLykge1xuICAgIHJldHVybiB0aGlzLnN3YXAoYXQsIGxlbmd0aCwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKSk7XG59O1xuXG5MaXN0LnByb3RvdHlwZS5zd2FwID0gZnVuY3Rpb24gKHN0YXJ0LCBsZW5ndGgsIHBsdXMpIHtcbiAgICB2YXIgaW5pdGlhbCA9IHN0YXJ0O1xuICAgIC8vIHN0YXJ0IHdpbGwgYmUgaGVhZCBpZiBzdGFydCBpcyBudWxsIG9yIC0xIChtZWFuaW5nIGZyb20gdGhlIGVuZCksIGJ1dFxuICAgIC8vIHdpbGwgYmUgaGVhZC5uZXh0IGlmIHN0YXJ0IGlzIDAgKG1lYW5pbmcgZnJvbSB0aGUgYmVnaW5uaW5nKVxuICAgIHN0YXJ0ID0gdGhpcy5zY2FuKHN0YXJ0LCB0aGlzLmhlYWQpO1xuICAgIGlmIChsZW5ndGggPT0gbnVsbCkge1xuICAgICAgICBsZW5ndGggPSBJbmZpbml0eTtcbiAgICB9XG4gICAgcGx1cyA9IEFycmF5LmZyb20ocGx1cyk7XG5cbiAgICAvLyBjb2xsZWN0IHRoZSBtaW51cyBhcnJheVxuICAgIHZhciBtaW51cyA9IFtdO1xuICAgIHZhciBhdCA9IHN0YXJ0O1xuICAgIHdoaWxlIChsZW5ndGgtLSAmJiBsZW5ndGggPj0gMCAmJiBhdCAhPT0gdGhpcy5oZWFkKSB7XG4gICAgICAgIG1pbnVzLnB1c2goYXQudmFsdWUpO1xuICAgICAgICBhdCA9IGF0Lm5leHQ7XG4gICAgfVxuXG4gICAgLy8gYmVmb3JlIHJhbmdlIGNoYW5nZVxuICAgIHZhciBpbmRleCwgc3RhcnROb2RlO1xuICAgIGlmICh0aGlzLmRpc3BhdGNoZXNSYW5nZUNoYW5nZXMpIHtcbiAgICAgICAgaWYgKHN0YXJ0ID09PSB0aGlzLmhlYWQpIHtcbiAgICAgICAgICAgIGluZGV4ID0gdGhpcy5sZW5ndGg7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhcnQucHJldiA9PT0gdGhpcy5oZWFkKSB7XG4gICAgICAgICAgICBpbmRleCA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbmRleCA9IHN0YXJ0LmluZGV4O1xuICAgICAgICB9XG4gICAgICAgIHN0YXJ0Tm9kZSA9IHN0YXJ0LnByZXY7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hCZWZvcmVSYW5nZUNoYW5nZShwbHVzLCBtaW51cywgaW5kZXgpO1xuICAgIH1cblxuICAgIC8vIGRlbGV0ZSBtaW51c1xuICAgIHZhciBhdCA9IHN0YXJ0O1xuICAgIGZvciAodmFyIGkgPSAwLCBhdCA9IHN0YXJ0OyBpIDwgbWludXMubGVuZ3RoOyBpKyssIGF0ID0gYXQubmV4dCkge1xuICAgICAgICBhdFtcImRlbGV0ZVwiXSgpO1xuICAgIH1cbiAgICAvLyBhZGQgcGx1c1xuICAgIGlmIChpbml0aWFsID09IG51bGwgJiYgYXQgPT09IHRoaXMuaGVhZCkge1xuICAgICAgICBhdCA9IHRoaXMuaGVhZC5uZXh0O1xuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBsdXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIG5vZGUgPSBuZXcgdGhpcy5Ob2RlKHBsdXNbaV0pO1xuICAgICAgICBhdC5hZGRCZWZvcmUobm9kZSk7XG4gICAgfVxuICAgIC8vIGFkanVzdCBsZW5ndGhcbiAgICB0aGlzLmxlbmd0aCArPSBwbHVzLmxlbmd0aCAtIG1pbnVzLmxlbmd0aDtcblxuICAgIC8vIGFmdGVyIHJhbmdlIGNoYW5nZVxuICAgIGlmICh0aGlzLmRpc3BhdGNoZXNSYW5nZUNoYW5nZXMpIHtcbiAgICAgICAgaWYgKHN0YXJ0ID09PSB0aGlzLmhlYWQpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlSW5kZXhlcyh0aGlzLmhlYWQubmV4dCwgMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUluZGV4ZXMoc3RhcnROb2RlLm5leHQsIHN0YXJ0Tm9kZS5pbmRleCArIDEpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hSYW5nZUNoYW5nZShwbHVzLCBtaW51cywgaW5kZXgpO1xuICAgIH1cblxuICAgIHJldHVybiBtaW51cztcbn07XG5cbkxpc3QucHJvdG90eXBlLnJldmVyc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuZGlzcGF0Y2hlc1JhbmdlQ2hhbmdlcykge1xuICAgICAgICB2YXIgbWludXMgPSB0aGlzLnRvQXJyYXkoKTtcbiAgICAgICAgdmFyIHBsdXMgPSBtaW51cy5yZXZlcnNlZCgpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoQmVmb3JlUmFuZ2VDaGFuZ2UocGx1cywgbWludXMsIDApO1xuICAgIH1cbiAgICB2YXIgYXQgPSB0aGlzLmhlYWQ7XG4gICAgZG8ge1xuICAgICAgICB2YXIgdGVtcCA9IGF0Lm5leHQ7XG4gICAgICAgIGF0Lm5leHQgPSBhdC5wcmV2O1xuICAgICAgICBhdC5wcmV2ID0gdGVtcDtcbiAgICAgICAgYXQgPSBhdC5uZXh0O1xuICAgIH0gd2hpbGUgKGF0ICE9PSB0aGlzLmhlYWQpO1xuICAgIGlmICh0aGlzLmRpc3BhdGNoZXNSYW5nZUNoYW5nZXMpIHtcbiAgICAgICAgdGhpcy5kaXNwYXRjaFJhbmdlQ2hhbmdlKHBsdXMsIG1pbnVzLCAwKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5MaXN0LnByb3RvdHlwZS5zb3J0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc3dhcCgwLCB0aGlzLmxlbmd0aCwgdGhpcy5zb3J0ZWQoKSk7XG59O1xuXG4vLyBUT0RPIGFjY291bnQgZm9yIG1pc3NpbmcgYmFzaXMgYXJndW1lbnRcbkxpc3QucHJvdG90eXBlLnJlZHVjZSA9IGZ1bmN0aW9uIChjYWxsYmFjaywgYmFzaXMgLyosIHRoaXNwKi8pIHtcbiAgICB2YXIgdGhpc3AgPSBhcmd1bWVudHNbMl07XG4gICAgdmFyIGhlYWQgPSB0aGlzLmhlYWQ7XG4gICAgdmFyIGF0ID0gaGVhZC5uZXh0O1xuICAgIHdoaWxlIChhdCAhPT0gaGVhZCkge1xuICAgICAgICBiYXNpcyA9IGNhbGxiYWNrLmNhbGwodGhpc3AsIGJhc2lzLCBhdC52YWx1ZSwgYXQsIHRoaXMpO1xuICAgICAgICBhdCA9IGF0Lm5leHQ7XG4gICAgfVxuICAgIHJldHVybiBiYXNpcztcbn07XG5cbkxpc3QucHJvdG90eXBlLnJlZHVjZVJpZ2h0ID0gZnVuY3Rpb24gKGNhbGxiYWNrLCBiYXNpcyAvKiwgdGhpc3AqLykge1xuICAgIHZhciB0aGlzcCA9IGFyZ3VtZW50c1syXTtcbiAgICB2YXIgaGVhZCA9IHRoaXMuaGVhZDtcbiAgICB2YXIgYXQgPSBoZWFkLnByZXY7XG4gICAgd2hpbGUgKGF0ICE9PSBoZWFkKSB7XG4gICAgICAgIGJhc2lzID0gY2FsbGJhY2suY2FsbCh0aGlzcCwgYmFzaXMsIGF0LnZhbHVlLCBhdCwgdGhpcyk7XG4gICAgICAgIGF0ID0gYXQucHJldjtcbiAgICB9XG4gICAgcmV0dXJuIGJhc2lzO1xufTtcblxuTGlzdC5wcm90b3R5cGUudXBkYXRlSW5kZXhlcyA9IGZ1bmN0aW9uIChub2RlLCBpbmRleCkge1xuICAgIHdoaWxlIChub2RlICE9PSB0aGlzLmhlYWQpIHtcbiAgICAgICAgbm9kZS5pbmRleCA9IGluZGV4Kys7XG4gICAgICAgIG5vZGUgPSBub2RlLm5leHQ7XG4gICAgfVxufTtcblxuTGlzdC5wcm90b3R5cGUubWFrZU9ic2VydmFibGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5oZWFkLmluZGV4ID0gLTE7XG4gICAgdGhpcy51cGRhdGVJbmRleGVzKHRoaXMuaGVhZC5uZXh0LCAwKTtcbiAgICB0aGlzLmRpc3BhdGNoZXNSYW5nZUNoYW5nZXMgPSB0cnVlO1xufTtcblxuTGlzdC5wcm90b3R5cGUuaXRlcmF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IExpc3RJdGVyYXRvcih0aGlzLmhlYWQpO1xufTtcblxuZnVuY3Rpb24gTGlzdEl0ZXJhdG9yKGhlYWQpIHtcbiAgICB0aGlzLmhlYWQgPSBoZWFkO1xuICAgIHRoaXMuYXQgPSBoZWFkLm5leHQ7XG59O1xuXG5MaXN0SXRlcmF0b3IucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuYXQgPT09IHRoaXMuaGVhZCkge1xuICAgICAgICB0aHJvdyBTdG9wSXRlcmF0aW9uO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHRoaXMuYXQudmFsdWU7XG4gICAgICAgIHRoaXMuYXQgPSB0aGlzLmF0Lm5leHQ7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG59O1xuXG5MaXN0LnByb3RvdHlwZS5Ob2RlID0gTm9kZTtcblxuZnVuY3Rpb24gTm9kZSh2YWx1ZSkge1xuICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICB0aGlzLnByZXYgPSBudWxsO1xuICAgIHRoaXMubmV4dCA9IG51bGw7XG59O1xuXG5Ob2RlLnByb3RvdHlwZVsnZGVsZXRlJ10gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5wcmV2Lm5leHQgPSB0aGlzLm5leHQ7XG4gICAgdGhpcy5uZXh0LnByZXYgPSB0aGlzLnByZXY7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5hZGRCZWZvcmUgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgIHZhciBwcmV2ID0gdGhpcy5wcmV2O1xuICAgIHRoaXMucHJldiA9IG5vZGU7XG4gICAgbm9kZS5wcmV2ID0gcHJldjtcbiAgICBwcmV2Lm5leHQgPSBub2RlO1xuICAgIG5vZGUubmV4dCA9IHRoaXM7XG59O1xuXG5Ob2RlLnByb3RvdHlwZS5hZGRBZnRlciA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgdmFyIG5leHQgPSB0aGlzLm5leHQ7XG4gICAgdGhpcy5uZXh0ID0gbm9kZTtcbiAgICBub2RlLm5leHQgPSBuZXh0O1xuICAgIG5leHQucHJldiA9IG5vZGU7XG4gICAgbm9kZS5wcmV2ID0gdGhpcztcbn07XG5cbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgV2Vha01hcCA9IHJlcXVpcmUoXCJ3ZWFrLW1hcFwiKTtcbnZhciBMaXN0ID0gcmVxdWlyZShcIi4uL2xpc3RcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gTWFwQ2hhbmdlcztcbmZ1bmN0aW9uIE1hcENoYW5nZXMoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgY29uc3RydWN0LiBNYXBDaGFuZ2VzIGlzIGEgbWl4aW4uXCIpO1xufVxuXG52YXIgb2JqZWN0X293bnMgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG4vKlxuICAgIE9iamVjdCBtYXAgY2hhbmdlIGRlc2NyaXB0b3JzIGNhcnJ5IGluZm9ybWF0aW9uIG5lY2Vzc2FyeSBmb3IgYWRkaW5nLFxuICAgIHJlbW92aW5nLCBkaXNwYXRjaGluZywgYW5kIHNob3J0aW5nIGV2ZW50cyB0byBsaXN0ZW5lcnMgZm9yIG1hcCBjaGFuZ2VzXG4gICAgZm9yIGEgcGFydGljdWxhciBrZXkgb24gYSBwYXJ0aWN1bGFyIG9iamVjdC4gIFRoZXNlIGRlc2NyaXB0b3JzIGFyZSB1c2VkXG4gICAgaGVyZSBmb3Igc2hhbGxvdyBtYXAgY2hhbmdlcy5cblxuICAgIHtcbiAgICAgICAgd2lsbENoYW5nZUxpc3RlbmVyczpBcnJheShGdW5jdGlvbilcbiAgICAgICAgY2hhbmdlTGlzdGVuZXJzOkFycmF5KEZ1bmN0aW9uKVxuICAgIH1cbiovXG5cbnZhciBtYXBDaGFuZ2VEZXNjcmlwdG9ycyA9IG5ldyBXZWFrTWFwKCk7XG5cbk1hcENoYW5nZXMucHJvdG90eXBlLmdldEFsbE1hcENoYW5nZURlc2NyaXB0b3JzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBEaWN0ID0gcmVxdWlyZShcIi4uL2RpY3RcIik7XG4gICAgaWYgKCFtYXBDaGFuZ2VEZXNjcmlwdG9ycy5oYXModGhpcykpIHtcbiAgICAgICAgbWFwQ2hhbmdlRGVzY3JpcHRvcnMuc2V0KHRoaXMsIERpY3QoKSk7XG4gICAgfVxuICAgIHJldHVybiBtYXBDaGFuZ2VEZXNjcmlwdG9ycy5nZXQodGhpcyk7XG59O1xuXG5NYXBDaGFuZ2VzLnByb3RvdHlwZS5nZXRNYXBDaGFuZ2VEZXNjcmlwdG9yID0gZnVuY3Rpb24gKHRva2VuKSB7XG4gICAgdmFyIHRva2VuQ2hhbmdlRGVzY3JpcHRvcnMgPSB0aGlzLmdldEFsbE1hcENoYW5nZURlc2NyaXB0b3JzKCk7XG4gICAgdG9rZW4gPSB0b2tlbiB8fCBcIlwiO1xuICAgIGlmICghdG9rZW5DaGFuZ2VEZXNjcmlwdG9ycy5oYXModG9rZW4pKSB7XG4gICAgICAgIHRva2VuQ2hhbmdlRGVzY3JpcHRvcnMuc2V0KHRva2VuLCB7XG4gICAgICAgICAgICB3aWxsQ2hhbmdlTGlzdGVuZXJzOiBuZXcgTGlzdCgpLFxuICAgICAgICAgICAgY2hhbmdlTGlzdGVuZXJzOiBuZXcgTGlzdCgpXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdG9rZW5DaGFuZ2VEZXNjcmlwdG9ycy5nZXQodG9rZW4pO1xufTtcblxuTWFwQ2hhbmdlcy5wcm90b3R5cGUuYWRkTWFwQ2hhbmdlTGlzdGVuZXIgPSBmdW5jdGlvbiAobGlzdGVuZXIsIHRva2VuLCBiZWZvcmVDaGFuZ2UpIHtcbiAgICBpZiAoIXRoaXMuaXNPYnNlcnZhYmxlICYmIHRoaXMubWFrZU9ic2VydmFibGUpIHtcbiAgICAgICAgLy8gZm9yIEFycmF5XG4gICAgICAgIHRoaXMubWFrZU9ic2VydmFibGUoKTtcbiAgICB9XG4gICAgdmFyIGRlc2NyaXB0b3IgPSB0aGlzLmdldE1hcENoYW5nZURlc2NyaXB0b3IodG9rZW4pO1xuICAgIHZhciBsaXN0ZW5lcnM7XG4gICAgaWYgKGJlZm9yZUNoYW5nZSkge1xuICAgICAgICBsaXN0ZW5lcnMgPSBkZXNjcmlwdG9yLndpbGxDaGFuZ2VMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbGlzdGVuZXJzID0gZGVzY3JpcHRvci5jaGFuZ2VMaXN0ZW5lcnM7XG4gICAgfVxuICAgIGxpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJkaXNwYXRjaGVzTWFwQ2hhbmdlc1wiLCB7XG4gICAgICAgIHZhbHVlOiB0cnVlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgIH0pO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBmdW5jdGlvbiBjYW5jZWxNYXBDaGFuZ2VMaXN0ZW5lcigpIHtcbiAgICAgICAgaWYgKCFzZWxmKSB7XG4gICAgICAgICAgICAvLyBUT0RPIHRocm93IG5ldyBFcnJvcihcIkNhbid0IHJlbW92ZSBtYXAgY2hhbmdlIGxpc3RlbmVyIGFnYWluXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHNlbGYucmVtb3ZlTWFwQ2hhbmdlTGlzdGVuZXIobGlzdGVuZXIsIHRva2VuLCBiZWZvcmVDaGFuZ2UpO1xuICAgICAgICBzZWxmID0gbnVsbDtcbiAgICB9O1xufTtcblxuTWFwQ2hhbmdlcy5wcm90b3R5cGUucmVtb3ZlTWFwQ2hhbmdlTGlzdGVuZXIgPSBmdW5jdGlvbiAobGlzdGVuZXIsIHRva2VuLCBiZWZvcmVDaGFuZ2UpIHtcbiAgICB2YXIgZGVzY3JpcHRvciA9IHRoaXMuZ2V0TWFwQ2hhbmdlRGVzY3JpcHRvcih0b2tlbik7XG5cbiAgICB2YXIgbGlzdGVuZXJzO1xuICAgIGlmIChiZWZvcmVDaGFuZ2UpIHtcbiAgICAgICAgbGlzdGVuZXJzID0gZGVzY3JpcHRvci53aWxsQ2hhbmdlTGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGxpc3RlbmVycyA9IGRlc2NyaXB0b3IuY2hhbmdlTGlzdGVuZXJzO1xuICAgIH1cblxuICAgIHZhciBub2RlID0gbGlzdGVuZXJzLmZpbmRMYXN0KGxpc3RlbmVyKTtcbiAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgcmVtb3ZlIGxpc3RlbmVyOiBkb2VzIG5vdCBleGlzdC5cIik7XG4gICAgfVxuICAgIG5vZGVbXCJkZWxldGVcIl0oKTtcbn07XG5cbk1hcENoYW5nZXMucHJvdG90eXBlLmRpc3BhdGNoTWFwQ2hhbmdlID0gZnVuY3Rpb24gKGtleSwgdmFsdWUsIGJlZm9yZUNoYW5nZSkge1xuICAgIHZhciBkZXNjcmlwdG9ycyA9IHRoaXMuZ2V0QWxsTWFwQ2hhbmdlRGVzY3JpcHRvcnMoKTtcbiAgICB2YXIgY2hhbmdlTmFtZSA9IFwiTWFwXCIgKyAoYmVmb3JlQ2hhbmdlID8gXCJXaWxsQ2hhbmdlXCIgOiBcIkNoYW5nZVwiKTtcbiAgICBkZXNjcmlwdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChkZXNjcmlwdG9yLCB0b2tlbikge1xuXG4gICAgICAgIGlmIChkZXNjcmlwdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkZXNjcmlwdG9yLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBsaXN0ZW5lcnM7XG4gICAgICAgIGlmIChiZWZvcmVDaGFuZ2UpIHtcbiAgICAgICAgICAgIGxpc3RlbmVycyA9IGRlc2NyaXB0b3Iud2lsbENoYW5nZUxpc3RlbmVycztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxpc3RlbmVycyA9IGRlc2NyaXB0b3IuY2hhbmdlTGlzdGVuZXJzO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHRva2VuTmFtZSA9IFwiaGFuZGxlXCIgKyAoXG4gICAgICAgICAgICB0b2tlbi5zbGljZSgwLCAxKS50b1VwcGVyQ2FzZSgpICtcbiAgICAgICAgICAgIHRva2VuLnNsaWNlKDEpXG4gICAgICAgICkgKyBjaGFuZ2VOYW1lO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBkaXNwYXRjaCB0byBlYWNoIGxpc3RlbmVyXG4gICAgICAgICAgICBsaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAobGlzdGVuZXJbdG9rZW5OYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lclt0b2tlbk5hbWVdKHZhbHVlLCBrZXksIHRoaXMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobGlzdGVuZXIuY2FsbCkge1xuICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lci5jYWxsKGxpc3RlbmVyLCB2YWx1ZSwga2V5LCB0aGlzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJIYW5kbGVyIFwiICsgbGlzdGVuZXIgKyBcIiBoYXMgbm8gbWV0aG9kIFwiICsgdG9rZW5OYW1lICsgXCIgYW5kIGlzIG5vdCBjYWxsYWJsZVwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIGRlc2NyaXB0b3IuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgfSwgdGhpcyk7XG59O1xuXG5NYXBDaGFuZ2VzLnByb3RvdHlwZS5hZGRCZWZvcmVNYXBDaGFuZ2VMaXN0ZW5lciA9IGZ1bmN0aW9uIChsaXN0ZW5lciwgdG9rZW4pIHtcbiAgICByZXR1cm4gdGhpcy5hZGRNYXBDaGFuZ2VMaXN0ZW5lcihsaXN0ZW5lciwgdG9rZW4sIHRydWUpO1xufTtcblxuTWFwQ2hhbmdlcy5wcm90b3R5cGUucmVtb3ZlQmVmb3JlTWFwQ2hhbmdlTGlzdGVuZXIgPSBmdW5jdGlvbiAobGlzdGVuZXIsIHRva2VuKSB7XG4gICAgcmV0dXJuIHRoaXMucmVtb3ZlTWFwQ2hhbmdlTGlzdGVuZXIobGlzdGVuZXIsIHRva2VuLCB0cnVlKTtcbn07XG5cbk1hcENoYW5nZXMucHJvdG90eXBlLmRpc3BhdGNoQmVmb3JlTWFwQ2hhbmdlID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaE1hcENoYW5nZShrZXksIHZhbHVlLCB0cnVlKTtcbn07XG5cbiIsIi8qXG4gICAgQmFzZWQgaW4gcGFydCBvbiBvYnNlcnZhYmxlIGFycmF5cyBmcm9tIE1vdG9yb2xhIE1vYmlsaXR54oCZcyBNb250YWdlXG4gICAgQ29weXJpZ2h0IChjKSAyMDEyLCBNb3Rvcm9sYSBNb2JpbGl0eSBMTEMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gICAgMy1DbGF1c2UgQlNEIExpY2Vuc2VcbiAgICBodHRwczovL2dpdGh1Yi5jb20vbW90b3JvbGEtbW9iaWxpdHkvbW9udGFnZS9ibG9iL21hc3Rlci9MSUNFTlNFLm1kXG4qL1xuXG4vKlxuICAgIFRoaXMgbW9kdWxlIGlzIHJlc3BvbnNpYmxlIGZvciBvYnNlcnZpbmcgY2hhbmdlcyB0byBvd25lZCBwcm9wZXJ0aWVzIG9mXG4gICAgb2JqZWN0cyBhbmQgY2hhbmdlcyB0byB0aGUgY29udGVudCBvZiBhcnJheXMgY2F1c2VkIGJ5IG1ldGhvZCBjYWxscy5cbiAgICBUaGUgaW50ZXJmYWNlIGZvciBvYnNlcnZpbmcgYXJyYXkgY29udGVudCBjaGFuZ2VzIGVzdGFibGlzaGVzIHRoZSBtZXRob2RzXG4gICAgbmVjZXNzYXJ5IGZvciBhbnkgY29sbGVjdGlvbiB3aXRoIG9ic2VydmFibGUgY29udGVudC5cbiovXG5cbnJlcXVpcmUoXCIuLi9zaGltXCIpO1xudmFyIFdlYWtNYXAgPSByZXF1aXJlKFwid2Vhay1tYXBcIik7XG5cbnZhciBvYmplY3Rfb3ducyA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbi8qXG4gICAgT2JqZWN0IHByb3BlcnR5IGRlc2NyaXB0b3JzIGNhcnJ5IGluZm9ybWF0aW9uIG5lY2Vzc2FyeSBmb3IgYWRkaW5nLFxuICAgIHJlbW92aW5nLCBkaXNwYXRjaGluZywgYW5kIHNob3J0aW5nIGV2ZW50cyB0byBsaXN0ZW5lcnMgZm9yIHByb3BlcnR5IGNoYW5nZXNcbiAgICBmb3IgYSBwYXJ0aWN1bGFyIGtleSBvbiBhIHBhcnRpY3VsYXIgb2JqZWN0LiAgVGhlc2UgZGVzY3JpcHRvcnMgYXJlIHVzZWRcbiAgICBoZXJlIGZvciBzaGFsbG93IHByb3BlcnR5IGNoYW5nZXMuXG5cbiAgICB7XG4gICAgICAgIHdpbGxDaGFuZ2VMaXN0ZW5lcnM6QXJyYXkoRnVuY3Rpb24pXG4gICAgICAgIGNoYW5nZUxpc3RlbmVyczpBcnJheShGdW5jdGlvbilcbiAgICB9XG4qL1xudmFyIHByb3BlcnR5Q2hhbmdlRGVzY3JpcHRvcnMgPSBuZXcgV2Vha01hcCgpO1xuXG4vLyBNYXliZSByZW1vdmUgZW50cmllcyBmcm9tIHRoaXMgdGFibGUgaWYgdGhlIGNvcnJlc3BvbmRpbmcgb2JqZWN0IG5vIGxvbmdlclxuLy8gaGFzIGFueSBwcm9wZXJ0eSBjaGFuZ2UgbGlzdGVuZXJzIGZvciBhbnkga2V5LiAgSG93ZXZlciwgdGhlIGNvc3Qgb2Zcbi8vIGJvb2sta2VlcGluZyBpcyBwcm9iYWJseSBub3Qgd2FycmFudGVkIHNpbmNlIGl0IHdvdWxkIGJlIHJhcmUgZm9yIGFuXG4vLyBvYnNlcnZlZCBvYmplY3QgdG8gbm8gbG9uZ2VyIGJlIG9ic2VydmVkIHVubGVzcyBpdCB3YXMgYWJvdXQgdG8gYmUgZGlzcG9zZWRcbi8vIG9mIG9yIHJldXNlZCBhcyBhbiBvYnNlcnZhYmxlLiAgVGhlIG9ubHkgYmVuZWZpdCB3b3VsZCBiZSBpbiBhdm9pZGluZyBidWxrXG4vLyBjYWxscyB0byBkaXNwYXRjaE93blByb3BlcnR5Q2hhbmdlIGV2ZW50cyBvbiBvYmplY3RzIHRoYXQgaGF2ZSBubyBsaXN0ZW5lcnMuXG5cbi8qXG4gICAgVG8gb2JzZXJ2ZSBzaGFsbG93IHByb3BlcnR5IGNoYW5nZXMgZm9yIGEgcGFydGljdWxhciBrZXkgb2YgYSBwYXJ0aWN1bGFyXG4gICAgb2JqZWN0LCB3ZSBpbnN0YWxsIGEgcHJvcGVydHkgZGVzY3JpcHRvciBvbiB0aGUgb2JqZWN0IHRoYXQgb3ZlcnJpZGVzIHRoZSBwcmV2aW91c1xuICAgIGRlc2NyaXB0b3IuICBUaGUgb3ZlcnJpZGRlbiBkZXNjcmlwdG9ycyBhcmUgc3RvcmVkIGluIHRoaXMgd2VhayBtYXAuICBUaGVcbiAgICB3ZWFrIG1hcCBhc3NvY2lhdGVzIGFuIG9iamVjdCB3aXRoIGFub3RoZXIgb2JqZWN0IHRoYXQgbWFwcyBwcm9wZXJ0eSBuYW1lc1xuICAgIHRvIHByb3BlcnR5IGRlc2NyaXB0b3JzLlxuXG4gICAgb3ZlcnJpZGRlbk9iamVjdERlc2NyaXB0b3JzLmdldChvYmplY3QpW2tleV1cblxuICAgIFdlIHJldGFpbiB0aGUgb2xkIGRlc2NyaXB0b3IgZm9yIHZhcmlvdXMgcHVycG9zZXMuICBGb3Igb25lLCBpZiB0aGUgcHJvcGVydHlcbiAgICBpcyBubyBsb25nZXIgYmVpbmcgb2JzZXJ2ZWQgYnkgYW55b25lLCB3ZSByZXZlcnQgdGhlIHByb3BlcnR5IGRlc2NyaXB0b3IgdG9cbiAgICB0aGUgb3JpZ2luYWwuICBGb3IgXCJ2YWx1ZVwiIGRlc2NyaXB0b3JzLCB3ZSBzdG9yZSB0aGUgYWN0dWFsIHZhbHVlIG9mIHRoZVxuICAgIGRlc2NyaXB0b3Igb24gdGhlIG92ZXJyaWRkZW4gZGVzY3JpcHRvciwgc28gd2hlbiB0aGUgcHJvcGVydHkgaXMgcmV2ZXJ0ZWQsIGl0XG4gICAgcmV0YWlucyB0aGUgbW9zdCByZWNlbnRseSBzZXQgdmFsdWUuICBGb3IgXCJnZXRcIiBhbmQgXCJzZXRcIiBkZXNjcmlwdG9ycyxcbiAgICB3ZSBvYnNlcnZlIHRoZW4gZm9yd2FyZCBcImdldFwiIGFuZCBcInNldFwiIG9wZXJhdGlvbnMgdG8gdGhlIG9yaWdpbmFsIGRlc2NyaXB0b3IuXG4qL1xudmFyIG92ZXJyaWRkZW5PYmplY3REZXNjcmlwdG9ycyA9IG5ldyBXZWFrTWFwKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gUHJvcGVydHlDaGFuZ2VzO1xuXG5mdW5jdGlvbiBQcm9wZXJ0eUNoYW5nZXMoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiVGhpcyBpcyBhbiBhYnN0cmFjdCBpbnRlcmZhY2UuIE1peCBpdC4gRG9uJ3QgY29uc3RydWN0IGl0XCIpO1xufVxuXG5Qcm9wZXJ0eUNoYW5nZXMuZGVidWcgPSB0cnVlO1xuXG5Qcm9wZXJ0eUNoYW5nZXMucHJvdG90eXBlLmdldE93blByb3BlcnR5Q2hhbmdlRGVzY3JpcHRvciA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICBpZiAoIXByb3BlcnR5Q2hhbmdlRGVzY3JpcHRvcnMuaGFzKHRoaXMpKSB7XG4gICAgICAgIHByb3BlcnR5Q2hhbmdlRGVzY3JpcHRvcnMuc2V0KHRoaXMsIHt9KTtcbiAgICB9XG4gICAgdmFyIG9iamVjdFByb3BlcnR5Q2hhbmdlRGVzY3JpcHRvcnMgPSBwcm9wZXJ0eUNoYW5nZURlc2NyaXB0b3JzLmdldCh0aGlzKTtcbiAgICBpZiAoIW9iamVjdF9vd25zLmNhbGwob2JqZWN0UHJvcGVydHlDaGFuZ2VEZXNjcmlwdG9ycywga2V5KSkge1xuICAgICAgICBvYmplY3RQcm9wZXJ0eUNoYW5nZURlc2NyaXB0b3JzW2tleV0gPSB7XG4gICAgICAgICAgICB3aWxsQ2hhbmdlTGlzdGVuZXJzOiBbXSxcbiAgICAgICAgICAgIGNoYW5nZUxpc3RlbmVyczogW11cbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdFByb3BlcnR5Q2hhbmdlRGVzY3JpcHRvcnNba2V5XTtcbn07XG5cblByb3BlcnR5Q2hhbmdlcy5wcm90b3R5cGUuaGFzT3duUHJvcGVydHlDaGFuZ2VEZXNjcmlwdG9yID0gZnVuY3Rpb24gKGtleSkge1xuICAgIGlmICghcHJvcGVydHlDaGFuZ2VEZXNjcmlwdG9ycy5oYXModGhpcykpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIWtleSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdmFyIG9iamVjdFByb3BlcnR5Q2hhbmdlRGVzY3JpcHRvcnMgPSBwcm9wZXJ0eUNoYW5nZURlc2NyaXB0b3JzLmdldCh0aGlzKTtcbiAgICBpZiAoIW9iamVjdF9vd25zLmNhbGwob2JqZWN0UHJvcGVydHlDaGFuZ2VEZXNjcmlwdG9ycywga2V5KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuUHJvcGVydHlDaGFuZ2VzLnByb3RvdHlwZS5hZGRPd25Qcm9wZXJ0eUNoYW5nZUxpc3RlbmVyID0gZnVuY3Rpb24gKGtleSwgbGlzdGVuZXIsIGJlZm9yZUNoYW5nZSkge1xuICAgIGlmICh0aGlzLm1ha2VPYnNlcnZhYmxlICYmICF0aGlzLmlzT2JzZXJ2YWJsZSkge1xuICAgICAgICB0aGlzLm1ha2VPYnNlcnZhYmxlKCk7IC8vIHBhcnRpY3VsYXJseSBmb3Igb2JzZXJ2YWJsZSBhcnJheXMsIGZvclxuICAgICAgICAvLyB0aGVpciBsZW5ndGggcHJvcGVydHlcbiAgICB9XG4gICAgdmFyIGRlc2NyaXB0b3IgPSBQcm9wZXJ0eUNoYW5nZXMuZ2V0T3duUHJvcGVydHlDaGFuZ2VEZXNjcmlwdG9yKHRoaXMsIGtleSk7XG4gICAgdmFyIGxpc3RlbmVycztcbiAgICBpZiAoYmVmb3JlQ2hhbmdlKSB7XG4gICAgICAgIGxpc3RlbmVycyA9IGRlc2NyaXB0b3Iud2lsbENoYW5nZUxpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgICBsaXN0ZW5lcnMgPSBkZXNjcmlwdG9yLmNoYW5nZUxpc3RlbmVycztcbiAgICB9XG4gICAgUHJvcGVydHlDaGFuZ2VzLm1ha2VQcm9wZXJ0eU9ic2VydmFibGUodGhpcywga2V5KTtcbiAgICBsaXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGNhbmNlbE93blByb3BlcnR5Q2hhbmdlTGlzdGVuZXIoKSB7XG4gICAgICAgIFByb3BlcnR5Q2hhbmdlcy5yZW1vdmVPd25Qcm9wZXJ0eUNoYW5nZUxpc3RlbmVyKHNlbGYsIGtleSwgbGlzdGVuZXJzLCBiZWZvcmVDaGFuZ2UpO1xuICAgICAgICBzZWxmID0gbnVsbDtcbiAgICB9O1xufTtcblxuUHJvcGVydHlDaGFuZ2VzLnByb3RvdHlwZS5hZGRCZWZvcmVPd25Qcm9wZXJ0eUNoYW5nZUxpc3RlbmVyID0gZnVuY3Rpb24gKGtleSwgbGlzdGVuZXIpIHtcbiAgICByZXR1cm4gUHJvcGVydHlDaGFuZ2VzLmFkZE93blByb3BlcnR5Q2hhbmdlTGlzdGVuZXIodGhpcywga2V5LCBsaXN0ZW5lciwgdHJ1ZSk7XG59O1xuXG5Qcm9wZXJ0eUNoYW5nZXMucHJvdG90eXBlLnJlbW92ZU93blByb3BlcnR5Q2hhbmdlTGlzdGVuZXIgPSBmdW5jdGlvbiAoa2V5LCBsaXN0ZW5lciwgYmVmb3JlQ2hhbmdlKSB7XG4gICAgdmFyIGRlc2NyaXB0b3IgPSBQcm9wZXJ0eUNoYW5nZXMuZ2V0T3duUHJvcGVydHlDaGFuZ2VEZXNjcmlwdG9yKHRoaXMsIGtleSk7XG5cbiAgICB2YXIgbGlzdGVuZXJzO1xuICAgIGlmIChiZWZvcmVDaGFuZ2UpIHtcbiAgICAgICAgbGlzdGVuZXJzID0gZGVzY3JpcHRvci53aWxsQ2hhbmdlTGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGxpc3RlbmVycyA9IGRlc2NyaXB0b3IuY2hhbmdlTGlzdGVuZXJzO1xuICAgIH1cblxuICAgIHZhciBpbmRleCA9IGxpc3RlbmVycy5sYXN0SW5kZXhPZihsaXN0ZW5lcik7XG4gICAgaWYgKGluZGV4ID09PSAtMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCByZW1vdmUgbGlzdGVuZXI6IGRvZXMgbm90IGV4aXN0LlwiKTtcbiAgICB9XG4gICAgbGlzdGVuZXJzLnNwbGljZShpbmRleCwgMSk7XG5cbiAgICBpZiAoZGVzY3JpcHRvci5jaGFuZ2VMaXN0ZW5lcnMubGVuZ3RoICsgZGVzY3JpcHRvci53aWxsQ2hhbmdlTGlzdGVuZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBQcm9wZXJ0eUNoYW5nZXMubWFrZVByb3BlcnR5VW5vYnNlcnZhYmxlKHRoaXMsIGtleSk7XG4gICAgfVxufTtcblxuUHJvcGVydHlDaGFuZ2VzLnByb3RvdHlwZS5yZW1vdmVCZWZvcmVPd25Qcm9wZXJ0eUNoYW5nZUxpc3RlbmVyID0gZnVuY3Rpb24gKGtleSwgbGlzdGVuZXIpIHtcbiAgICByZXR1cm4gUHJvcGVydHlDaGFuZ2VzLnJlbW92ZU93blByb3BlcnR5Q2hhbmdlTGlzdGVuZXIodGhpcywga2V5LCBsaXN0ZW5lciwgdHJ1ZSk7XG59O1xuXG5Qcm9wZXJ0eUNoYW5nZXMucHJvdG90eXBlLmRpc3BhdGNoT3duUHJvcGVydHlDaGFuZ2UgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSwgYmVmb3JlQ2hhbmdlKSB7XG4gICAgdmFyIGRlc2NyaXB0b3IgPSBQcm9wZXJ0eUNoYW5nZXMuZ2V0T3duUHJvcGVydHlDaGFuZ2VEZXNjcmlwdG9yKHRoaXMsIGtleSk7XG5cbiAgICBpZiAoZGVzY3JpcHRvci5pc0FjdGl2ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRlc2NyaXB0b3IuaXNBY3RpdmUgPSB0cnVlO1xuXG4gICAgdmFyIGxpc3RlbmVycztcbiAgICBpZiAoYmVmb3JlQ2hhbmdlKSB7XG4gICAgICAgIGxpc3RlbmVycyA9IGRlc2NyaXB0b3Iud2lsbENoYW5nZUxpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgICBsaXN0ZW5lcnMgPSBkZXNjcmlwdG9yLmNoYW5nZUxpc3RlbmVycztcbiAgICB9XG5cbiAgICB2YXIgY2hhbmdlTmFtZSA9IChiZWZvcmVDaGFuZ2UgPyBcIldpbGxcIiA6IFwiXCIpICsgXCJDaGFuZ2VcIjtcbiAgICB2YXIgZ2VuZXJpY0hhbmRsZXJOYW1lID0gXCJoYW5kbGVQcm9wZXJ0eVwiICsgY2hhbmdlTmFtZTtcbiAgICB2YXIgcHJvcGVydHlOYW1lID0gU3RyaW5nKGtleSk7XG4gICAgcHJvcGVydHlOYW1lID0gcHJvcGVydHlOYW1lICYmIHByb3BlcnR5TmFtZVswXS50b1VwcGVyQ2FzZSgpICsgcHJvcGVydHlOYW1lLnNsaWNlKDEpO1xuICAgIHZhciBzcGVjaWZpY0hhbmRsZXJOYW1lID0gXCJoYW5kbGVcIiArIHByb3BlcnR5TmFtZSArIGNoYW5nZU5hbWU7XG5cbiAgICB0cnkge1xuICAgICAgICAvLyBkaXNwYXRjaCB0byBlYWNoIGxpc3RlbmVyXG4gICAgICAgIGxpc3RlbmVycy5mb3JFYWNoKGZ1bmN0aW9uIChsaXN0ZW5lcikge1xuICAgICAgICAgICAgdmFyIHRoaXNwID0gbGlzdGVuZXI7XG4gICAgICAgICAgICBsaXN0ZW5lciA9IChcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcltzcGVjaWZpY0hhbmRsZXJOYW1lXSB8fFxuICAgICAgICAgICAgICAgIGxpc3RlbmVyW2dlbmVyaWNIYW5kbGVyTmFtZV0gfHxcbiAgICAgICAgICAgICAgICBsaXN0ZW5lclxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlmICghbGlzdGVuZXIuY2FsbCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIGV2ZW50IGxpc3RlbmVyIGZvciBcIiArIHNwZWNpZmljSGFuZGxlck5hbWUgKyBcIiBvciBcIiArIGdlbmVyaWNIYW5kbGVyTmFtZSArIFwiIG9yIGNhbGwgb24gXCIgKyBsaXN0ZW5lcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsaXN0ZW5lci5jYWxsKHRoaXNwLCB2YWx1ZSwga2V5LCB0aGlzKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgZGVzY3JpcHRvci5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgIH1cbn07XG5cblByb3BlcnR5Q2hhbmdlcy5wcm90b3R5cGUuZGlzcGF0Y2hCZWZvcmVPd25Qcm9wZXJ0eUNoYW5nZSA9IGZ1bmN0aW9uIChrZXksIGxpc3RlbmVyKSB7XG4gICAgcmV0dXJuIFByb3BlcnR5Q2hhbmdlcy5kaXNwYXRjaE93blByb3BlcnR5Q2hhbmdlKHRoaXMsIGtleSwgbGlzdGVuZXIsIHRydWUpO1xufTtcblxuUHJvcGVydHlDaGFuZ2VzLnByb3RvdHlwZS5tYWtlUHJvcGVydHlPYnNlcnZhYmxlID0gZnVuY3Rpb24gKGtleSkge1xuICAgIC8vIGFycmF5cyBhcmUgc3BlY2lhbC4gIHdlIGRvIG5vdCBzdXBwb3J0IGRpcmVjdCBzZXR0aW5nIG9mIHByb3BlcnRpZXNcbiAgICAvLyBvbiBhbiBhcnJheS4gIGluc3RlYWQsIGNhbGwgLnNldChpbmRleCwgdmFsdWUpLiAgdGhpcyBpcyBvYnNlcnZhYmxlLlxuICAgIC8vICdsZW5ndGgnIHByb3BlcnR5IGlzIG9ic2VydmFibGUgZm9yIGFsbCBtdXRhdGluZyBtZXRob2RzIGJlY2F1c2VcbiAgICAvLyBvdXIgb3ZlcnJpZGVzIGV4cGxpY2l0bHkgZGlzcGF0Y2ggdGhhdCBjaGFuZ2UuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodGhpcykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghT2JqZWN0LmlzRXh0ZW5zaWJsZSh0aGlzLCBrZXkpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IG1ha2UgcHJvcGVydHkgXCIgKyBKU09OLnN0cmluZ2lmeShrZXkpICsgXCIgb2JzZXJ2YWJsZSBvbiBcIiArIHRoaXMgKyBcIiBiZWNhdXNlIG9iamVjdCBpcyBub3QgZXh0ZW5zaWJsZVwiKTtcbiAgICB9XG5cbiAgICB2YXIgc3RhdGU7XG4gICAgaWYgKHR5cGVvZiB0aGlzLl9fc3RhdGVfXyA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICBzdGF0ZSA9IHRoaXMuX19zdGF0ZV9fO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRlID0ge307XG4gICAgICAgIGlmIChPYmplY3QuaXNFeHRlbnNpYmxlKHRoaXMsIFwiX19zdGF0ZV9fXCIpKSB7XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJfX3N0YXRlX19cIiwge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBzdGF0ZSxcbiAgICAgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc3RhdGVba2V5XSA9IHRoaXNba2V5XTtcblxuICAgIC8vIG1lbW9pemUgb3ZlcnJpZGRlbiBwcm9wZXJ0eSBkZXNjcmlwdG9yIHRhYmxlXG4gICAgaWYgKCFvdmVycmlkZGVuT2JqZWN0RGVzY3JpcHRvcnMuaGFzKHRoaXMpKSB7XG4gICAgICAgIG92ZXJyaWRkZW5Qcm9wZXJ0eURlc2NyaXB0b3JzID0ge307XG4gICAgICAgIG92ZXJyaWRkZW5PYmplY3REZXNjcmlwdG9ycy5zZXQodGhpcywgb3ZlcnJpZGRlblByb3BlcnR5RGVzY3JpcHRvcnMpO1xuICAgIH1cbiAgICB2YXIgb3ZlcnJpZGRlblByb3BlcnR5RGVzY3JpcHRvcnMgPSBvdmVycmlkZGVuT2JqZWN0RGVzY3JpcHRvcnMuZ2V0KHRoaXMpO1xuXG4gICAgaWYgKG9iamVjdF9vd25zLmNhbGwob3ZlcnJpZGRlblByb3BlcnR5RGVzY3JpcHRvcnMsIGtleSkpIHtcbiAgICAgICAgLy8gaWYgd2UgaGF2ZSBhbHJlYWR5IHJlY29yZGVkIGFuIG92ZXJyaWRkZW4gcHJvcGVydHkgZGVzY3JpcHRvcixcbiAgICAgICAgLy8gd2UgaGF2ZSBhbHJlYWR5IGluc3RhbGxlZCB0aGUgb2JzZXJ2ZXIsIHNvIHNob3J0LWhlcmVcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIHdhbGsgdXAgdGhlIHByb3RvdHlwZSBjaGFpbiB0byBmaW5kIGEgcHJvcGVydHkgZGVzY3JpcHRvciBmb3JcbiAgICAvLyB0aGUgcHJvcGVydHkgbmFtZVxuICAgIHZhciBvdmVycmlkZGVuRGVzY3JpcHRvcjtcbiAgICB2YXIgYXR0YWNoZWQgPSB0aGlzO1xuICAgIHZhciBmb3JtZXJEZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihhdHRhY2hlZCwga2V5KTtcbiAgICBkbyB7XG4gICAgICAgIG92ZXJyaWRkZW5EZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihhdHRhY2hlZCwga2V5KTtcbiAgICAgICAgaWYgKG92ZXJyaWRkZW5EZXNjcmlwdG9yKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBhdHRhY2hlZCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihhdHRhY2hlZCk7XG4gICAgfSB3aGlsZSAoYXR0YWNoZWQpO1xuICAgIC8vIG9yIGRlZmF1bHQgdG8gYW4gdW5kZWZpbmVkIHZhbHVlXG4gICAgb3ZlcnJpZGRlbkRlc2NyaXB0b3IgPSBvdmVycmlkZGVuRGVzY3JpcHRvciB8fCB7XG4gICAgICAgIHZhbHVlOiB1bmRlZmluZWQsXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9O1xuXG4gICAgaWYgKCFvdmVycmlkZGVuRGVzY3JpcHRvci5jb25maWd1cmFibGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3Qgb2JzZXJ2ZSBub24tY29uZmlndXJhYmxlIHByb3BlcnRpZXNcIik7XG4gICAgfVxuXG4gICAgLy8gbWVtb2l6ZSB0aGUgZGVzY3JpcHRvciBzbyB3ZSBrbm93IG5vdCB0byBpbnN0YWxsIGFub3RoZXIgbGF5ZXIsXG4gICAgLy8gYW5kIHNvIHdlIGNhbiByZXVzZSB0aGUgb3ZlcnJpZGRlbiBkZXNjcmlwdG9yIHdoZW4gdW5pbnN0YWxsaW5nXG4gICAgb3ZlcnJpZGRlblByb3BlcnR5RGVzY3JpcHRvcnNba2V5XSA9IG92ZXJyaWRkZW5EZXNjcmlwdG9yO1xuXG4gICAgLy8gZ2l2ZSB1cCAqYWZ0ZXIqIHN0b3JpbmcgdGhlIG92ZXJyaWRkZW4gcHJvcGVydHkgZGVzY3JpcHRvciBzbyBpdFxuICAgIC8vIGNhbiBiZSByZXN0b3JlZCBieSB1bmluc3RhbGwuICBVbndyaXRhYmxlIHByb3BlcnRpZXMgYXJlXG4gICAgLy8gc2lsZW50bHkgbm90IG92ZXJyaWRlbi4gIFNpbmNlIHN1Y2Nlc3MgaXMgaW5kaXN0aW5ndWlzaGFibGUgZnJvbVxuICAgIC8vIGZhaWx1cmUsIHdlIGxldCBpdCBwYXNzIGJ1dCBkb24ndCB3YXN0ZSB0aW1lIG9uIGludGVyY2VwdGluZ1xuICAgIC8vIGdldC9zZXQuXG4gICAgaWYgKCFvdmVycmlkZGVuRGVzY3JpcHRvci53cml0YWJsZSAmJiAhb3ZlcnJpZGRlbkRlc2NyaXB0b3Iuc2V0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBUT0RPIHJlZmxlY3QgY3VycmVudCB2YWx1ZSBvbiBhIGRpc3BsYXllZCBwcm9wZXJ0eVxuXG4gICAgdmFyIHByb3BlcnR5TGlzdGVuZXI7XG4gICAgLy8gaW4gYm90aCBvZiB0aGVzZSBuZXcgZGVzY3JpcHRvciB2YXJpYW50cywgd2UgcmV1c2UgdGhlIG92ZXJyaWRkZW5cbiAgICAvLyBkZXNjcmlwdG9yIHRvIGVpdGhlciBzdG9yZSB0aGUgY3VycmVudCB2YWx1ZSBvciBhcHBseSBnZXR0ZXJzXG4gICAgLy8gYW5kIHNldHRlcnMuICB0aGlzIGlzIGhhbmR5IHNpbmNlIHdlIGNhbiByZXVzZSB0aGUgb3ZlcnJpZGRlblxuICAgIC8vIGRlc2NyaXB0b3IgaWYgd2UgdW5pbnN0YWxsIHRoZSBvYnNlcnZlci4gIFdlIGV2ZW4gcHJlc2VydmUgdGhlXG4gICAgLy8gYXNzaWdubWVudCBzZW1hbnRpY3MsIHdoZXJlIHdlIGdldCB0aGUgdmFsdWUgZnJvbSB1cCB0aGVcbiAgICAvLyBwcm90b3R5cGUgY2hhaW4sIGFuZCBzZXQgYXMgYW4gb3duZWQgcHJvcGVydHkuXG4gICAgaWYgKCd2YWx1ZScgaW4gb3ZlcnJpZGRlbkRlc2NyaXB0b3IpIHtcbiAgICAgICAgcHJvcGVydHlMaXN0ZW5lciA9IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBvdmVycmlkZGVuRGVzY3JpcHRvci52YWx1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09PSBvdmVycmlkZGVuRGVzY3JpcHRvci52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFByb3BlcnR5Q2hhbmdlcy5kaXNwYXRjaEJlZm9yZU93blByb3BlcnR5Q2hhbmdlKHRoaXMsIGtleSwgb3ZlcnJpZGRlbkRlc2NyaXB0b3IudmFsdWUpO1xuICAgICAgICAgICAgICAgIG92ZXJyaWRkZW5EZXNjcmlwdG9yLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgc3RhdGVba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIFByb3BlcnR5Q2hhbmdlcy5kaXNwYXRjaE93blByb3BlcnR5Q2hhbmdlKHRoaXMsIGtleSwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiBvdmVycmlkZGVuRGVzY3JpcHRvci5lbnVtZXJhYmxlLFxuICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAgIH07XG4gICAgfSBlbHNlIHsgLy8gJ2dldCcgb3IgJ3NldCcsIGJ1dCBub3QgbmVjZXNzYXJpbHkgYm90aFxuICAgICAgICBwcm9wZXJ0eUxpc3RlbmVyID0ge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKG92ZXJyaWRkZW5EZXNjcmlwdG9yLmdldCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3ZlcnJpZGRlbkRlc2NyaXB0b3IuZ2V0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZvcm1lclZhbHVlO1xuXG4gICAgICAgICAgICAgICAgLy8gZ2V0IHRoZSBhY3R1YWwgZm9ybWVyIHZhbHVlIGlmIHBvc3NpYmxlXG4gICAgICAgICAgICAgICAgaWYgKG92ZXJyaWRkZW5EZXNjcmlwdG9yLmdldCkge1xuICAgICAgICAgICAgICAgICAgICBmb3JtZXJWYWx1ZSA9IG92ZXJyaWRkZW5EZXNjcmlwdG9yLmdldC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBjYWxsIHRocm91Z2ggdG8gYWN0dWFsIHNldHRlclxuICAgICAgICAgICAgICAgIGlmIChvdmVycmlkZGVuRGVzY3JpcHRvci5zZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgb3ZlcnJpZGRlbkRlc2NyaXB0b3Iuc2V0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gdXNlIGdldHRlciwgaWYgcG9zc2libGUsIHRvIGRpc2NvdmVyIHdoZXRoZXIgdGhlIHNldFxuICAgICAgICAgICAgICAgIC8vIHdhcyBzdWNjZXNzZnVsXG4gICAgICAgICAgICAgICAgaWYgKG92ZXJyaWRkZW5EZXNjcmlwdG9yLmdldCkge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IG92ZXJyaWRkZW5EZXNjcmlwdG9yLmdldC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGlmIGl0IGhhcyBub3QgY2hhbmdlZCwgc3VwcHJlc3MgYSBub3RpZmljYXRpb25cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT09IGZvcm1lclZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgUHJvcGVydHlDaGFuZ2VzLmRpc3BhdGNoQmVmb3JlT3duUHJvcGVydHlDaGFuZ2UodGhpcywga2V5LCBmb3JtZXJWYWx1ZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBkaXNwYXRjaCB0aGUgbmV3IHZhbHVlOiB0aGUgZ2l2ZW4gdmFsdWUgaWYgdGhlcmUgaXNcbiAgICAgICAgICAgICAgICAvLyBubyBnZXR0ZXIsIG9yIHRoZSBhY3R1YWwgdmFsdWUgaWYgdGhlcmUgaXMgb25lXG4gICAgICAgICAgICAgICAgUHJvcGVydHlDaGFuZ2VzLmRpc3BhdGNoT3duUHJvcGVydHlDaGFuZ2UodGhpcywga2V5LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVudW1lcmFibGU6IG92ZXJyaWRkZW5EZXNjcmlwdG9yLmVudW1lcmFibGUsXG4gICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywga2V5LCBwcm9wZXJ0eUxpc3RlbmVyKTtcbn07XG5cblByb3BlcnR5Q2hhbmdlcy5wcm90b3R5cGUubWFrZVByb3BlcnR5VW5vYnNlcnZhYmxlID0gZnVuY3Rpb24gKGtleSkge1xuICAgIC8vIGFycmF5cyBhcmUgc3BlY2lhbC4gIHdlIGRvIG5vdCBzdXBwb3J0IGRpcmVjdCBzZXR0aW5nIG9mIHByb3BlcnRpZXNcbiAgICAvLyBvbiBhbiBhcnJheS4gIGluc3RlYWQsIGNhbGwgLnNldChpbmRleCwgdmFsdWUpLiAgdGhpcyBpcyBvYnNlcnZhYmxlLlxuICAgIC8vICdsZW5ndGgnIHByb3BlcnR5IGlzIG9ic2VydmFibGUgZm9yIGFsbCBtdXRhdGluZyBtZXRob2RzIGJlY2F1c2VcbiAgICAvLyBvdXIgb3ZlcnJpZGVzIGV4cGxpY2l0bHkgZGlzcGF0Y2ggdGhhdCBjaGFuZ2UuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodGhpcykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghb3ZlcnJpZGRlbk9iamVjdERlc2NyaXB0b3JzLmhhcyh0aGlzKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCB1bmluc3RhbGwgb2JzZXJ2ZXIgb24gcHJvcGVydHlcIik7XG4gICAgfVxuICAgIHZhciBvdmVycmlkZGVuUHJvcGVydHlEZXNjcmlwdG9ycyA9IG92ZXJyaWRkZW5PYmplY3REZXNjcmlwdG9ycy5nZXQodGhpcyk7XG5cbiAgICBpZiAoIW92ZXJyaWRkZW5Qcm9wZXJ0eURlc2NyaXB0b3JzW2tleV0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgdW5pbnN0YWxsIG9ic2VydmVyIG9uIHByb3BlcnR5XCIpO1xuICAgIH1cblxuICAgIHZhciBvdmVycmlkZGVuRGVzY3JpcHRvciA9IG92ZXJyaWRkZW5Qcm9wZXJ0eURlc2NyaXB0b3JzW2tleV07XG4gICAgZGVsZXRlIG92ZXJyaWRkZW5Qcm9wZXJ0eURlc2NyaXB0b3JzW2tleV07XG5cbiAgICB2YXIgc3RhdGU7XG4gICAgaWYgKHR5cGVvZiB0aGlzLl9fc3RhdGVfXyA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICBzdGF0ZSA9IHRoaXMuX19zdGF0ZV9fO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRlID0ge307XG4gICAgICAgIGlmIChPYmplY3QuaXNFeHRlbnNpYmxlKHRoaXMsIFwiX19zdGF0ZV9fXCIpKSB7XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJfX3N0YXRlX19cIiwge1xuICAgICAgICAgICAgICAgIHZhbHVlOiBzdGF0ZSxcbiAgICAgICAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZGVsZXRlIHN0YXRlW2tleV07XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywga2V5LCBvdmVycmlkZGVuRGVzY3JpcHRvcik7XG59O1xuXG4vLyBjb25zdHJ1Y3RvciBmdW5jdGlvbnNcblxuUHJvcGVydHlDaGFuZ2VzLmdldE93blByb3BlcnR5Q2hhbmdlRGVzY3JpcHRvciA9IGZ1bmN0aW9uIChvYmplY3QsIGtleSkge1xuICAgIGlmIChvYmplY3QuZ2V0T3duUHJvcGVydHlDaGFuZ2VEZXNjcmlwdG9yKSB7XG4gICAgICAgIHJldHVybiBvYmplY3QuZ2V0T3duUHJvcGVydHlDaGFuZ2VEZXNjcmlwdG9yKGtleSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb3BlcnR5Q2hhbmdlcy5wcm90b3R5cGUuZ2V0T3duUHJvcGVydHlDaGFuZ2VEZXNjcmlwdG9yLmNhbGwob2JqZWN0LCBrZXkpO1xuICAgIH1cbn07XG5cblByb3BlcnR5Q2hhbmdlcy5oYXNPd25Qcm9wZXJ0eUNoYW5nZURlc2NyaXB0b3IgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXkpIHtcbiAgICBpZiAob2JqZWN0Lmhhc093blByb3BlcnR5Q2hhbmdlRGVzY3JpcHRvcikge1xuICAgICAgICByZXR1cm4gb2JqZWN0Lmhhc093blByb3BlcnR5Q2hhbmdlRGVzY3JpcHRvcihrZXkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9wZXJ0eUNoYW5nZXMucHJvdG90eXBlLmhhc093blByb3BlcnR5Q2hhbmdlRGVzY3JpcHRvci5jYWxsKG9iamVjdCwga2V5KTtcbiAgICB9XG59O1xuXG5Qcm9wZXJ0eUNoYW5nZXMuYWRkT3duUHJvcGVydHlDaGFuZ2VMaXN0ZW5lciA9IGZ1bmN0aW9uIChvYmplY3QsIGtleSwgbGlzdGVuZXIsIGJlZm9yZUNoYW5nZSkge1xuICAgIGlmICghT2JqZWN0LmlzT2JqZWN0KG9iamVjdCkpIHtcbiAgICB9IGVsc2UgaWYgKG9iamVjdC5hZGRPd25Qcm9wZXJ0eUNoYW5nZUxpc3RlbmVyKSB7XG4gICAgICAgIHJldHVybiBvYmplY3QuYWRkT3duUHJvcGVydHlDaGFuZ2VMaXN0ZW5lcihrZXksIGxpc3RlbmVyLCBiZWZvcmVDaGFuZ2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9wZXJ0eUNoYW5nZXMucHJvdG90eXBlLmFkZE93blByb3BlcnR5Q2hhbmdlTGlzdGVuZXIuY2FsbChvYmplY3QsIGtleSwgbGlzdGVuZXIsIGJlZm9yZUNoYW5nZSk7XG4gICAgfVxufTtcblxuUHJvcGVydHlDaGFuZ2VzLnJlbW92ZU93blByb3BlcnR5Q2hhbmdlTGlzdGVuZXIgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXksIGxpc3RlbmVyLCBiZWZvcmVDaGFuZ2UpIHtcbiAgICBpZiAoIU9iamVjdC5pc09iamVjdChvYmplY3QpKSB7XG4gICAgfSBlbHNlIGlmIChvYmplY3QucmVtb3ZlT3duUHJvcGVydHlDaGFuZ2VMaXN0ZW5lcikge1xuICAgICAgICByZXR1cm4gb2JqZWN0LnJlbW92ZU93blByb3BlcnR5Q2hhbmdlTGlzdGVuZXIoa2V5LCBsaXN0ZW5lciwgYmVmb3JlQ2hhbmdlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvcGVydHlDaGFuZ2VzLnByb3RvdHlwZS5yZW1vdmVPd25Qcm9wZXJ0eUNoYW5nZUxpc3RlbmVyLmNhbGwob2JqZWN0LCBrZXksIGxpc3RlbmVyLCBiZWZvcmVDaGFuZ2UpO1xuICAgIH1cbn07XG5cblByb3BlcnR5Q2hhbmdlcy5kaXNwYXRjaE93blByb3BlcnR5Q2hhbmdlID0gZnVuY3Rpb24gKG9iamVjdCwga2V5LCB2YWx1ZSwgYmVmb3JlQ2hhbmdlKSB7XG4gICAgaWYgKCFPYmplY3QuaXNPYmplY3Qob2JqZWN0KSkge1xuICAgIH0gZWxzZSBpZiAob2JqZWN0LmRpc3BhdGNoT3duUHJvcGVydHlDaGFuZ2UpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdC5kaXNwYXRjaE93blByb3BlcnR5Q2hhbmdlKGtleSwgdmFsdWUsIGJlZm9yZUNoYW5nZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb3BlcnR5Q2hhbmdlcy5wcm90b3R5cGUuZGlzcGF0Y2hPd25Qcm9wZXJ0eUNoYW5nZS5jYWxsKG9iamVjdCwga2V5LCB2YWx1ZSwgYmVmb3JlQ2hhbmdlKTtcbiAgICB9XG59O1xuXG5Qcm9wZXJ0eUNoYW5nZXMuYWRkQmVmb3JlT3duUHJvcGVydHlDaGFuZ2VMaXN0ZW5lciA9IGZ1bmN0aW9uIChvYmplY3QsIGtleSwgbGlzdGVuZXIpIHtcbiAgICByZXR1cm4gUHJvcGVydHlDaGFuZ2VzLmFkZE93blByb3BlcnR5Q2hhbmdlTGlzdGVuZXIob2JqZWN0LCBrZXksIGxpc3RlbmVyLCB0cnVlKTtcbn07XG5cblByb3BlcnR5Q2hhbmdlcy5yZW1vdmVCZWZvcmVPd25Qcm9wZXJ0eUNoYW5nZUxpc3RlbmVyID0gZnVuY3Rpb24gKG9iamVjdCwga2V5LCBsaXN0ZW5lcikge1xuICAgIHJldHVybiBQcm9wZXJ0eUNoYW5nZXMucmVtb3ZlT3duUHJvcGVydHlDaGFuZ2VMaXN0ZW5lcihvYmplY3QsIGtleSwgbGlzdGVuZXIsIHRydWUpO1xufTtcblxuUHJvcGVydHlDaGFuZ2VzLmRpc3BhdGNoQmVmb3JlT3duUHJvcGVydHlDaGFuZ2UgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXksIHZhbHVlKSB7XG4gICAgcmV0dXJuIFByb3BlcnR5Q2hhbmdlcy5kaXNwYXRjaE93blByb3BlcnR5Q2hhbmdlKG9iamVjdCwga2V5LCB2YWx1ZSwgdHJ1ZSk7XG59O1xuXG5Qcm9wZXJ0eUNoYW5nZXMubWFrZVByb3BlcnR5T2JzZXJ2YWJsZSA9IGZ1bmN0aW9uIChvYmplY3QsIGtleSkge1xuICAgIGlmIChvYmplY3QubWFrZVByb3BlcnR5T2JzZXJ2YWJsZSkge1xuICAgICAgICByZXR1cm4gb2JqZWN0Lm1ha2VQcm9wZXJ0eU9ic2VydmFibGUoa2V5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUHJvcGVydHlDaGFuZ2VzLnByb3RvdHlwZS5tYWtlUHJvcGVydHlPYnNlcnZhYmxlLmNhbGwob2JqZWN0LCBrZXkpO1xuICAgIH1cbn07XG5cblByb3BlcnR5Q2hhbmdlcy5tYWtlUHJvcGVydHlVbm9ic2VydmFibGUgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXkpIHtcbiAgICBpZiAob2JqZWN0Lm1ha2VQcm9wZXJ0eVVub2JzZXJ2YWJsZSkge1xuICAgICAgICByZXR1cm4gb2JqZWN0Lm1ha2VQcm9wZXJ0eVVub2JzZXJ2YWJsZShrZXkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBQcm9wZXJ0eUNoYW5nZXMucHJvdG90eXBlLm1ha2VQcm9wZXJ0eVVub2JzZXJ2YWJsZS5jYWxsKG9iamVjdCwga2V5KTtcbiAgICB9XG59O1xuXG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIFdlYWtNYXAgPSByZXF1aXJlKFwid2Vhay1tYXBcIik7XG52YXIgRGljdCA9IHJlcXVpcmUoXCIuLi9kaWN0XCIpO1xuXG52YXIgcmFuZ2VDaGFuZ2VEZXNjcmlwdG9ycyA9IG5ldyBXZWFrTWFwKCk7IC8vIHtpc0FjdGl2ZSwgd2lsbENoYW5nZUxpc3RlbmVycywgY2hhbmdlTGlzdGVuZXJzfVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJhbmdlQ2hhbmdlcztcbmZ1bmN0aW9uIFJhbmdlQ2hhbmdlcygpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBjb25zdHJ1Y3QuIFJhbmdlQ2hhbmdlcyBpcyBhIG1peGluLlwiKTtcbn1cblxuUmFuZ2VDaGFuZ2VzLnByb3RvdHlwZS5nZXRBbGxSYW5nZUNoYW5nZURlc2NyaXB0b3JzID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICghcmFuZ2VDaGFuZ2VEZXNjcmlwdG9ycy5oYXModGhpcykpIHtcbiAgICAgICAgcmFuZ2VDaGFuZ2VEZXNjcmlwdG9ycy5zZXQodGhpcywgRGljdCgpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJhbmdlQ2hhbmdlRGVzY3JpcHRvcnMuZ2V0KHRoaXMpO1xufTtcblxuUmFuZ2VDaGFuZ2VzLnByb3RvdHlwZS5nZXRSYW5nZUNoYW5nZURlc2NyaXB0b3IgPSBmdW5jdGlvbiAodG9rZW4pIHtcbiAgICB2YXIgdG9rZW5DaGFuZ2VEZXNjcmlwdG9ycyA9IHRoaXMuZ2V0QWxsUmFuZ2VDaGFuZ2VEZXNjcmlwdG9ycygpO1xuICAgIHRva2VuID0gdG9rZW4gfHwgXCJcIjtcbiAgICBpZiAoIXRva2VuQ2hhbmdlRGVzY3JpcHRvcnMuaGFzKHRva2VuKSkge1xuICAgICAgICB0b2tlbkNoYW5nZURlc2NyaXB0b3JzLnNldCh0b2tlbiwge1xuICAgICAgICAgICAgaXNBY3RpdmU6IGZhbHNlLFxuICAgICAgICAgICAgY2hhbmdlTGlzdGVuZXJzOiBbXSxcbiAgICAgICAgICAgIHdpbGxDaGFuZ2VMaXN0ZW5lcnM6IFtdXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdG9rZW5DaGFuZ2VEZXNjcmlwdG9ycy5nZXQodG9rZW4pO1xufTtcblxuUmFuZ2VDaGFuZ2VzLnByb3RvdHlwZS5hZGRSYW5nZUNoYW5nZUxpc3RlbmVyID0gZnVuY3Rpb24gKGxpc3RlbmVyLCB0b2tlbiwgYmVmb3JlQ2hhbmdlKSB7XG4gICAgLy8gYSBjb25jZXNzaW9uIGZvciBvYmplY3RzIGxpa2UgQXJyYXkgdGhhdCBhcmUgbm90IGluaGVyZW50bHkgb2JzZXJ2YWJsZVxuICAgIGlmICghdGhpcy5pc09ic2VydmFibGUgJiYgdGhpcy5tYWtlT2JzZXJ2YWJsZSkge1xuICAgICAgICB0aGlzLm1ha2VPYnNlcnZhYmxlKCk7XG4gICAgfVxuXG4gICAgdmFyIGRlc2NyaXB0b3IgPSB0aGlzLmdldFJhbmdlQ2hhbmdlRGVzY3JpcHRvcih0b2tlbik7XG5cbiAgICB2YXIgbGlzdGVuZXJzO1xuICAgIGlmIChiZWZvcmVDaGFuZ2UpIHtcbiAgICAgICAgbGlzdGVuZXJzID0gZGVzY3JpcHRvci53aWxsQ2hhbmdlTGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGxpc3RlbmVycyA9IGRlc2NyaXB0b3IuY2hhbmdlTGlzdGVuZXJzO1xuICAgIH1cblxuICAgIC8vIGV2ZW4gaWYgYWxyZWFkeSByZWdpc3RlcmVkXG4gICAgbGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcImRpc3BhdGNoZXNSYW5nZUNoYW5nZXNcIiwge1xuICAgICAgICB2YWx1ZTogdHJ1ZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2VcbiAgICB9KTtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gZnVuY3Rpb24gY2FuY2VsUmFuZ2VDaGFuZ2VMaXN0ZW5lcigpIHtcbiAgICAgICAgaWYgKCFzZWxmKSB7XG4gICAgICAgICAgICAvLyBUT0RPIHRocm93IG5ldyBFcnJvcihcIlJhbmdlIGNoYW5nZSBsaXN0ZW5lciBcIiArIEpTT04uc3RyaW5naWZ5KHRva2VuKSArIFwiIGhhcyBhbHJlYWR5IGJlZW4gY2FuY2VsZWRcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc2VsZi5yZW1vdmVSYW5nZUNoYW5nZUxpc3RlbmVyKGxpc3RlbmVyLCB0b2tlbiwgYmVmb3JlQ2hhbmdlKTtcbiAgICAgICAgc2VsZiA9IG51bGw7XG4gICAgfTtcbn07XG5cblJhbmdlQ2hhbmdlcy5wcm90b3R5cGUucmVtb3ZlUmFuZ2VDaGFuZ2VMaXN0ZW5lciA9IGZ1bmN0aW9uIChsaXN0ZW5lciwgdG9rZW4sIGJlZm9yZUNoYW5nZSkge1xuICAgIHZhciBkZXNjcmlwdG9yID0gdGhpcy5nZXRSYW5nZUNoYW5nZURlc2NyaXB0b3IodG9rZW4pO1xuXG4gICAgdmFyIGxpc3RlbmVycztcbiAgICBpZiAoYmVmb3JlQ2hhbmdlKSB7XG4gICAgICAgIGxpc3RlbmVycyA9IGRlc2NyaXB0b3Iud2lsbENoYW5nZUxpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgICBsaXN0ZW5lcnMgPSBkZXNjcmlwdG9yLmNoYW5nZUxpc3RlbmVycztcbiAgICB9XG5cbiAgICB2YXIgaW5kZXggPSBsaXN0ZW5lcnMubGFzdEluZGV4T2YobGlzdGVuZXIpO1xuICAgIGlmIChpbmRleCA9PT0gLTEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgcmVtb3ZlIGxpc3RlbmVyOiBkb2VzIG5vdCBleGlzdC5cIik7XG4gICAgfVxuICAgIGxpc3RlbmVycy5zcGxpY2UoaW5kZXgsIDEpO1xufTtcblxuUmFuZ2VDaGFuZ2VzLnByb3RvdHlwZS5kaXNwYXRjaFJhbmdlQ2hhbmdlID0gZnVuY3Rpb24gKHBsdXMsIG1pbnVzLCBpbmRleCwgYmVmb3JlQ2hhbmdlKSB7XG4gICAgdmFyIGRlc2NyaXB0b3JzID0gdGhpcy5nZXRBbGxSYW5nZUNoYW5nZURlc2NyaXB0b3JzKCk7XG4gICAgdmFyIGNoYW5nZU5hbWUgPSBcIlJhbmdlXCIgKyAoYmVmb3JlQ2hhbmdlID8gXCJXaWxsQ2hhbmdlXCIgOiBcIkNoYW5nZVwiKTtcbiAgICBkZXNjcmlwdG9ycy5mb3JFYWNoKGZ1bmN0aW9uIChkZXNjcmlwdG9yLCB0b2tlbikge1xuXG4gICAgICAgIGlmIChkZXNjcmlwdG9yLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkZXNjcmlwdG9yLmlzQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGJlZm9yZSBvciBhZnRlclxuICAgICAgICB2YXIgbGlzdGVuZXJzO1xuICAgICAgICBpZiAoYmVmb3JlQ2hhbmdlKSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnMgPSBkZXNjcmlwdG9yLndpbGxDaGFuZ2VMaXN0ZW5lcnM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnMgPSBkZXNjcmlwdG9yLmNoYW5nZUxpc3RlbmVycztcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB0b2tlbk5hbWUgPSBcImhhbmRsZVwiICsgKFxuICAgICAgICAgICAgdG9rZW4uc2xpY2UoMCwgMSkudG9VcHBlckNhc2UoKSArXG4gICAgICAgICAgICB0b2tlbi5zbGljZSgxKVxuICAgICAgICApICsgY2hhbmdlTmFtZTtcbiAgICAgICAgLy8gbm90YWJseSwgZGVmYXVsdHMgdG8gXCJoYW5kbGVSYW5nZUNoYW5nZVwiIG9yIFwiaGFuZGxlUmFuZ2VXaWxsQ2hhbmdlXCJcbiAgICAgICAgLy8gaWYgdG9rZW4gaXMgXCJcIiAodGhlIGRlZmF1bHQpXG5cbiAgICAgICAgLy8gZGlzcGF0Y2ggZWFjaCBsaXN0ZW5lclxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24gKGxpc3RlbmVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxpc3RlbmVyW3Rva2VuTmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXJbdG9rZW5OYW1lXShwbHVzLCBtaW51cywgaW5kZXgsIHRoaXMsIGJlZm9yZUNoYW5nZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChsaXN0ZW5lci5jYWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVyLmNhbGwodGhpcywgcGx1cywgbWludXMsIGluZGV4LCB0aGlzLCBiZWZvcmVDaGFuZ2UpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkhhbmRsZXIgXCIgKyBsaXN0ZW5lciArIFwiIGhhcyBubyBtZXRob2QgXCIgKyB0b2tlbk5hbWUgKyBcIiBhbmQgaXMgbm90IGNhbGxhYmxlXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgZGVzY3JpcHRvci5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfSwgdGhpcyk7XG59O1xuXG5SYW5nZUNoYW5nZXMucHJvdG90eXBlLmFkZEJlZm9yZVJhbmdlQ2hhbmdlTGlzdGVuZXIgPSBmdW5jdGlvbiAobGlzdGVuZXIsIHRva2VuKSB7XG4gICAgcmV0dXJuIHRoaXMuYWRkUmFuZ2VDaGFuZ2VMaXN0ZW5lcihsaXN0ZW5lciwgdG9rZW4sIHRydWUpO1xufTtcblxuUmFuZ2VDaGFuZ2VzLnByb3RvdHlwZS5yZW1vdmVCZWZvcmVSYW5nZUNoYW5nZUxpc3RlbmVyID0gZnVuY3Rpb24gKGxpc3RlbmVyLCB0b2tlbikge1xuICAgIHJldHVybiB0aGlzLnJlbW92ZVJhbmdlQ2hhbmdlTGlzdGVuZXIobGlzdGVuZXIsIHRva2VuLCB0cnVlKTtcbn07XG5cblJhbmdlQ2hhbmdlcy5wcm90b3R5cGUuZGlzcGF0Y2hCZWZvcmVSYW5nZUNoYW5nZSA9IGZ1bmN0aW9uIChwbHVzLCBtaW51cywgaW5kZXgpIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaFJhbmdlQ2hhbmdlKHBsdXMsIG1pbnVzLCBpbmRleCwgdHJ1ZSk7XG59O1xuXG4iLCIvLyBDb3B5cmlnaHQgKEMpIDIwMTEgR29vZ2xlIEluYy5cbi8vXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxuLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IEluc3RhbGwgYSBsZWFreSBXZWFrTWFwIGVtdWxhdGlvbiBvbiBwbGF0Zm9ybXMgdGhhdFxuICogZG9uJ3QgcHJvdmlkZSBhIGJ1aWx0LWluIG9uZS5cbiAqXG4gKiA8cD5Bc3N1bWVzIHRoYXQgYW4gRVM1IHBsYXRmb3JtIHdoZXJlLCBpZiB7QGNvZGUgV2Vha01hcH0gaXNcbiAqIGFscmVhZHkgcHJlc2VudCwgdGhlbiBpdCBjb25mb3JtcyB0byB0aGUgYW50aWNpcGF0ZWQgRVM2XG4gKiBzcGVjaWZpY2F0aW9uLiBUbyBydW4gdGhpcyBmaWxlIG9uIGFuIEVTNSBvciBhbG1vc3QgRVM1XG4gKiBpbXBsZW1lbnRhdGlvbiB3aGVyZSB0aGUge0Bjb2RlIFdlYWtNYXB9IHNwZWNpZmljYXRpb24gZG9lcyBub3RcbiAqIHF1aXRlIGNvbmZvcm0sIHJ1biA8Y29kZT5yZXBhaXJFUzUuanM8L2NvZGU+IGZpcnN0LlxuICpcbiAqIDxwPiBFdmVuIHRob3VnaCBXZWFrTWFwTW9kdWxlIGlzIG5vdCBnbG9iYWwsIHRoZSBsaW50ZXIgdGhpbmtzIGl0XG4gKiBpcywgd2hpY2ggaXMgd2h5IGl0IGlzIGluIHRoZSBvdmVycmlkZXMgbGlzdCBiZWxvdy5cbiAqXG4gKiBAYXV0aG9yIE1hcmsgUy4gTWlsbGVyXG4gKiBAcmVxdWlyZXMgY3J5cHRvLCBBcnJheUJ1ZmZlciwgVWludDhBcnJheSwgbmF2aWdhdG9yXG4gKiBAb3ZlcnJpZGVzIFdlYWtNYXAsIHNlcywgUHJveHlcbiAqIEBvdmVycmlkZXMgV2Vha01hcE1vZHVsZVxuICovXG5cbi8qKlxuICogVGhpcyB7QGNvZGUgV2Vha01hcH0gZW11bGF0aW9uIGlzIG9ic2VydmFibHkgZXF1aXZhbGVudCB0byB0aGVcbiAqIEVTLUhhcm1vbnkgV2Vha01hcCwgYnV0IHdpdGggbGVha2llciBnYXJiYWdlIGNvbGxlY3Rpb24gcHJvcGVydGllcy5cbiAqXG4gKiA8cD5BcyB3aXRoIHRydWUgV2Vha01hcHMsIGluIHRoaXMgZW11bGF0aW9uLCBhIGtleSBkb2VzIG5vdFxuICogcmV0YWluIG1hcHMgaW5kZXhlZCBieSB0aGF0IGtleSBhbmQgKGNydWNpYWxseSkgYSBtYXAgZG9lcyBub3RcbiAqIHJldGFpbiB0aGUga2V5cyBpdCBpbmRleGVzLiBBIG1hcCBieSBpdHNlbGYgYWxzbyBkb2VzIG5vdCByZXRhaW5cbiAqIHRoZSB2YWx1ZXMgYXNzb2NpYXRlZCB3aXRoIHRoYXQgbWFwLlxuICpcbiAqIDxwPkhvd2V2ZXIsIHRoZSB2YWx1ZXMgYXNzb2NpYXRlZCB3aXRoIGEga2V5IGluIHNvbWUgbWFwIGFyZVxuICogcmV0YWluZWQgc28gbG9uZyBhcyB0aGF0IGtleSBpcyByZXRhaW5lZCBhbmQgdGhvc2UgYXNzb2NpYXRpb25zIGFyZVxuICogbm90IG92ZXJyaWRkZW4uIEZvciBleGFtcGxlLCB3aGVuIHVzZWQgdG8gc3VwcG9ydCBtZW1icmFuZXMsIGFsbFxuICogdmFsdWVzIGV4cG9ydGVkIGZyb20gYSBnaXZlbiBtZW1icmFuZSB3aWxsIGxpdmUgZm9yIHRoZSBsaWZldGltZVxuICogdGhleSB3b3VsZCBoYXZlIGhhZCBpbiB0aGUgYWJzZW5jZSBvZiBhbiBpbnRlcnBvc2VkIG1lbWJyYW5lLiBFdmVuXG4gKiB3aGVuIHRoZSBtZW1icmFuZSBpcyByZXZva2VkLCBhbGwgb2JqZWN0cyB0aGF0IHdvdWxkIGhhdmUgYmVlblxuICogcmVhY2hhYmxlIGluIHRoZSBhYnNlbmNlIG9mIHJldm9jYXRpb24gd2lsbCBzdGlsbCBiZSByZWFjaGFibGUsIGFzXG4gKiBmYXIgYXMgdGhlIEdDIGNhbiB0ZWxsLCBldmVuIHRob3VnaCB0aGV5IHdpbGwgbm8gbG9uZ2VyIGJlIHJlbGV2YW50XG4gKiB0byBvbmdvaW5nIGNvbXB1dGF0aW9uLlxuICpcbiAqIDxwPlRoZSBBUEkgaW1wbGVtZW50ZWQgaGVyZSBpcyBhcHByb3hpbWF0ZWx5IHRoZSBBUEkgYXMgaW1wbGVtZW50ZWRcbiAqIGluIEZGNi4wYTEgYW5kIGFncmVlZCB0byBieSBNYXJrTSwgQW5kcmVhcyBHYWwsIGFuZCBEYXZlIEhlcm1hbixcbiAqIHJhdGhlciB0aGFuIHRoZSBvZmZpYWxseSBhcHByb3ZlZCBwcm9wb3NhbCBwYWdlLiBUT0RPKGVyaWdodHMpOlxuICogdXBncmFkZSB0aGUgZWNtYXNjcmlwdCBXZWFrTWFwIHByb3Bvc2FsIHBhZ2UgdG8gZXhwbGFpbiB0aGlzIEFQSVxuICogY2hhbmdlIGFuZCBwcmVzZW50IHRvIEVjbWFTY3JpcHQgY29tbWl0dGVlIGZvciB0aGVpciBhcHByb3ZhbC5cbiAqXG4gKiA8cD5UaGUgZmlyc3QgZGlmZmVyZW5jZSBiZXR3ZWVuIHRoZSBlbXVsYXRpb24gaGVyZSBhbmQgdGhhdCBpblxuICogRkY2LjBhMSBpcyB0aGUgcHJlc2VuY2Ugb2Ygbm9uIGVudW1lcmFibGUge0Bjb2RlIGdldF9fXywgaGFzX19fLFxuICogc2V0X19fLCBhbmQgZGVsZXRlX19ffSBtZXRob2RzIG9uIFdlYWtNYXAgaW5zdGFuY2VzIHRvIHJlcHJlc2VudFxuICogd2hhdCB3b3VsZCBiZSB0aGUgaGlkZGVuIGludGVybmFsIHByb3BlcnRpZXMgb2YgYSBwcmltaXRpdmVcbiAqIGltcGxlbWVudGF0aW9uLiBXaGVyZWFzIHRoZSBGRjYuMGExIFdlYWtNYXAucHJvdG90eXBlIG1ldGhvZHNcbiAqIHJlcXVpcmUgdGhlaXIge0Bjb2RlIHRoaXN9IHRvIGJlIGEgZ2VudWluZSBXZWFrTWFwIGluc3RhbmNlIChpLmUuLFxuICogYW4gb2JqZWN0IG9mIHtAY29kZSBbW0NsYXNzXV19IFwiV2Vha01hcH0pLCBzaW5jZSB0aGVyZSBpcyBub3RoaW5nXG4gKiB1bmZvcmdlYWJsZSBhYm91dCB0aGUgcHNldWRvLWludGVybmFsIG1ldGhvZCBuYW1lcyB1c2VkIGhlcmUsXG4gKiBub3RoaW5nIHByZXZlbnRzIHRoZXNlIGVtdWxhdGVkIHByb3RvdHlwZSBtZXRob2RzIGZyb20gYmVpbmdcbiAqIGFwcGxpZWQgdG8gbm9uLVdlYWtNYXBzIHdpdGggcHNldWRvLWludGVybmFsIG1ldGhvZHMgb2YgdGhlIHNhbWVcbiAqIG5hbWVzLlxuICpcbiAqIDxwPkFub3RoZXIgZGlmZmVyZW5jZSBpcyB0aGF0IG91ciBlbXVsYXRlZCB7QGNvZGVcbiAqIFdlYWtNYXAucHJvdG90eXBlfSBpcyBub3QgaXRzZWxmIGEgV2Vha01hcC4gQSBwcm9ibGVtIHdpdGggdGhlXG4gKiBjdXJyZW50IEZGNi4wYTEgQVBJIGlzIHRoYXQgV2Vha01hcC5wcm90b3R5cGUgaXMgaXRzZWxmIGEgV2Vha01hcFxuICogcHJvdmlkaW5nIGFtYmllbnQgbXV0YWJpbGl0eSBhbmQgYW4gYW1iaWVudCBjb21tdW5pY2F0aW9uc1xuICogY2hhbm5lbC4gVGh1cywgaWYgYSBXZWFrTWFwIGlzIGFscmVhZHkgcHJlc2VudCBhbmQgaGFzIHRoaXNcbiAqIHByb2JsZW0sIHJlcGFpckVTNS5qcyB3cmFwcyBpdCBpbiBhIHNhZmUgd3JhcHBwZXIgaW4gb3JkZXIgdG9cbiAqIHByZXZlbnQgYWNjZXNzIHRvIHRoaXMgY2hhbm5lbC4gKFNlZVxuICogUEFUQ0hfTVVUQUJMRV9GUk9aRU5fV0VBS01BUF9QUk9UTyBpbiByZXBhaXJFUzUuanMpLlxuICovXG5cbi8qKlxuICogSWYgdGhpcyBpcyBhIGZ1bGwgPGEgaHJlZj1cbiAqIFwiaHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL2VzLWxhYi93aWtpL1NlY3VyZWFibGVFUzVcIlxuICogPnNlY3VyZWFibGUgRVM1PC9hPiBwbGF0Zm9ybSBhbmQgdGhlIEVTLUhhcm1vbnkge0Bjb2RlIFdlYWtNYXB9IGlzXG4gKiBhYnNlbnQsIGluc3RhbGwgYW4gYXBwcm94aW1hdGUgZW11bGF0aW9uLlxuICpcbiAqIDxwPklmIFdlYWtNYXAgaXMgcHJlc2VudCBidXQgY2Fubm90IHN0b3JlIHNvbWUgb2JqZWN0cywgdXNlIG91ciBhcHByb3hpbWF0ZVxuICogZW11bGF0aW9uIGFzIGEgd3JhcHBlci5cbiAqXG4gKiA8cD5JZiB0aGlzIGlzIGFsbW9zdCBhIHNlY3VyZWFibGUgRVM1IHBsYXRmb3JtLCB0aGVuIFdlYWtNYXAuanNcbiAqIHNob3VsZCBiZSBydW4gYWZ0ZXIgcmVwYWlyRVM1LmpzLlxuICpcbiAqIDxwPlNlZSB7QGNvZGUgV2Vha01hcH0gZm9yIGRvY3VtZW50YXRpb24gb2YgdGhlIGdhcmJhZ2UgY29sbGVjdGlvblxuICogcHJvcGVydGllcyBvZiB0aGlzIFdlYWtNYXAgZW11bGF0aW9uLlxuICovXG4oZnVuY3Rpb24gV2Vha01hcE1vZHVsZSgpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgaWYgKHR5cGVvZiBzZXMgIT09ICd1bmRlZmluZWQnICYmIHNlcy5vayAmJiAhc2VzLm9rKCkpIHtcbiAgICAvLyBhbHJlYWR5IHRvbyBicm9rZW4sIHNvIGdpdmUgdXBcbiAgICByZXR1cm47XG4gIH1cblxuICAvKipcbiAgICogSW4gc29tZSBjYXNlcyAoY3VycmVudCBGaXJlZm94KSwgd2UgbXVzdCBtYWtlIGEgY2hvaWNlIGJldHdlZWVuIGFcbiAgICogV2Vha01hcCB3aGljaCBpcyBjYXBhYmxlIG9mIHVzaW5nIGFsbCB2YXJpZXRpZXMgb2YgaG9zdCBvYmplY3RzIGFzXG4gICAqIGtleXMgYW5kIG9uZSB3aGljaCBpcyBjYXBhYmxlIG9mIHNhZmVseSB1c2luZyBwcm94aWVzIGFzIGtleXMuIFNlZVxuICAgKiBjb21tZW50cyBiZWxvdyBhYm91dCBIb3N0V2Vha01hcCBhbmQgRG91YmxlV2Vha01hcCBmb3IgZGV0YWlscy5cbiAgICpcbiAgICogVGhpcyBmdW5jdGlvbiAod2hpY2ggaXMgYSBnbG9iYWwsIG5vdCBleHBvc2VkIHRvIGd1ZXN0cykgbWFya3MgYVxuICAgKiBXZWFrTWFwIGFzIHBlcm1pdHRlZCB0byBkbyB3aGF0IGlzIG5lY2Vzc2FyeSB0byBpbmRleCBhbGwgaG9zdFxuICAgKiBvYmplY3RzLCBhdCB0aGUgY29zdCBvZiBtYWtpbmcgaXQgdW5zYWZlIGZvciBwcm94aWVzLlxuICAgKlxuICAgKiBEbyBub3QgYXBwbHkgdGhpcyBmdW5jdGlvbiB0byBhbnl0aGluZyB3aGljaCBpcyBub3QgYSBnZW51aW5lXG4gICAqIGZyZXNoIFdlYWtNYXAuXG4gICAqL1xuICBmdW5jdGlvbiB3ZWFrTWFwUGVybWl0SG9zdE9iamVjdHMobWFwKSB7XG4gICAgLy8gaWRlbnRpdHkgb2YgZnVuY3Rpb24gdXNlZCBhcyBhIHNlY3JldCAtLSBnb29kIGVub3VnaCBhbmQgY2hlYXBcbiAgICBpZiAobWFwLnBlcm1pdEhvc3RPYmplY3RzX19fKSB7XG4gICAgICBtYXAucGVybWl0SG9zdE9iamVjdHNfX18od2Vha01hcFBlcm1pdEhvc3RPYmplY3RzKTtcbiAgICB9XG4gIH1cbiAgaWYgKHR5cGVvZiBzZXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgc2VzLndlYWtNYXBQZXJtaXRIb3N0T2JqZWN0cyA9IHdlYWtNYXBQZXJtaXRIb3N0T2JqZWN0cztcbiAgfVxuXG4gIC8vIENoZWNrIGlmIHRoZXJlIGlzIGFscmVhZHkgYSBnb29kLWVub3VnaCBXZWFrTWFwIGltcGxlbWVudGF0aW9uLCBhbmQgaWYgc29cbiAgLy8gZXhpdCB3aXRob3V0IHJlcGxhY2luZyBpdC5cbiAgaWYgKHR5cGVvZiBXZWFrTWFwID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdmFyIEhvc3RXZWFrTWFwID0gV2Vha01hcDtcbiAgICAvLyBUaGVyZSBpcyBhIFdlYWtNYXAgLS0gaXMgaXQgZ29vZCBlbm91Z2g/XG4gICAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgIC9GaXJlZm94Ly50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKSB7XG4gICAgICAvLyBXZSdyZSBub3cgKmFzc3VtaW5nIG5vdCosIGJlY2F1c2UgYXMgb2YgdGhpcyB3cml0aW5nICgyMDEzLTA1LTA2KVxuICAgICAgLy8gRmlyZWZveCdzIFdlYWtNYXBzIGhhdmUgYSBtaXNjZWxsYW55IG9mIG9iamVjdHMgdGhleSB3b24ndCBhY2NlcHQsIGFuZFxuICAgICAgLy8gd2UgZG9uJ3Qgd2FudCB0byBtYWtlIGFuIGV4aGF1c3RpdmUgbGlzdCwgYW5kIHRlc3RpbmcgZm9yIGp1c3Qgb25lXG4gICAgICAvLyB3aWxsIGJlIGEgcHJvYmxlbSBpZiB0aGF0IG9uZSBpcyBmaXhlZCBhbG9uZSAoYXMgdGhleSBkaWQgZm9yIEV2ZW50KS5cblxuICAgICAgLy8gSWYgdGhlcmUgaXMgYSBwbGF0Zm9ybSB0aGF0IHdlICpjYW4qIHJlbGlhYmx5IHRlc3Qgb24sIGhlcmUncyBob3cgdG9cbiAgICAgIC8vIGRvIGl0OlxuICAgICAgLy8gIHZhciBwcm9ibGVtYXRpYyA9IC4uLiA7XG4gICAgICAvLyAgdmFyIHRlc3RIb3N0TWFwID0gbmV3IEhvc3RXZWFrTWFwKCk7XG4gICAgICAvLyAgdHJ5IHtcbiAgICAgIC8vICAgIHRlc3RIb3N0TWFwLnNldChwcm9ibGVtYXRpYywgMSk7ICAvLyBGaXJlZm94IDIwIHdpbGwgdGhyb3cgaGVyZVxuICAgICAgLy8gICAgaWYgKHRlc3RIb3N0TWFwLmdldChwcm9ibGVtYXRpYykgPT09IDEpIHtcbiAgICAgIC8vICAgICAgcmV0dXJuO1xuICAgICAgLy8gICAgfVxuICAgICAgLy8gIH0gY2F0Y2ggKGUpIHt9XG5cbiAgICAgIC8vIEZhbGwgdGhyb3VnaCB0byBpbnN0YWxsaW5nIG91ciBXZWFrTWFwLlxuICAgIH0gZWxzZSB7XG4gICAgICBtb2R1bGUuZXhwb3J0cyA9IFdlYWtNYXA7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG5cbiAgdmFyIGhvcCA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG4gIHZhciBnb3BuID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXM7XG4gIHZhciBkZWZQcm9wID0gT2JqZWN0LmRlZmluZVByb3BlcnR5O1xuICB2YXIgaXNFeHRlbnNpYmxlID0gT2JqZWN0LmlzRXh0ZW5zaWJsZTtcblxuICAvKipcbiAgICogU2VjdXJpdHkgZGVwZW5kcyBvbiBISURERU5fTkFNRSBiZWluZyBib3RoIDxpPnVuZ3Vlc3NhYmxlPC9pPiBhbmRcbiAgICogPGk+dW5kaXNjb3ZlcmFibGU8L2k+IGJ5IHVudHJ1c3RlZCBjb2RlLlxuICAgKlxuICAgKiA8cD5HaXZlbiB0aGUga25vd24gd2Vha25lc3NlcyBvZiBNYXRoLnJhbmRvbSgpIG9uIGV4aXN0aW5nXG4gICAqIGJyb3dzZXJzLCBpdCBkb2VzIG5vdCBnZW5lcmF0ZSB1bmd1ZXNzYWJpbGl0eSB3ZSBjYW4gYmUgY29uZmlkZW50XG4gICAqIG9mLlxuICAgKlxuICAgKiA8cD5JdCBpcyB0aGUgbW9ua2V5IHBhdGNoaW5nIGxvZ2ljIGluIHRoaXMgZmlsZSB0aGF0IGlzIGludGVuZGVkXG4gICAqIHRvIGVuc3VyZSB1bmRpc2NvdmVyYWJpbGl0eS4gVGhlIGJhc2ljIGlkZWEgaXMgdGhhdCB0aGVyZSBhcmVcbiAgICogdGhyZWUgZnVuZGFtZW50YWwgbWVhbnMgb2YgZGlzY292ZXJpbmcgcHJvcGVydGllcyBvZiBhbiBvYmplY3Q6XG4gICAqIFRoZSBmb3IvaW4gbG9vcCwgT2JqZWN0LmtleXMoKSwgYW5kIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKCksXG4gICAqIGFzIHdlbGwgYXMgc29tZSBwcm9wb3NlZCBFUzYgZXh0ZW5zaW9ucyB0aGF0IGFwcGVhciBvbiBvdXJcbiAgICogd2hpdGVsaXN0LiBUaGUgZmlyc3QgdHdvIG9ubHkgZGlzY292ZXIgZW51bWVyYWJsZSBwcm9wZXJ0aWVzLCBhbmRcbiAgICogd2Ugb25seSB1c2UgSElEREVOX05BTUUgdG8gbmFtZSBhIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5LCBzbyB0aGVcbiAgICogb25seSByZW1haW5pbmcgdGhyZWF0IHNob3VsZCBiZSBnZXRPd25Qcm9wZXJ0eU5hbWVzIGFuZCBzb21lXG4gICAqIHByb3Bvc2VkIEVTNiBleHRlbnNpb25zIHRoYXQgYXBwZWFyIG9uIG91ciB3aGl0ZWxpc3QuIFdlIG1vbmtleVxuICAgKiBwYXRjaCB0aGVtIHRvIHJlbW92ZSBISURERU5fTkFNRSBmcm9tIHRoZSBsaXN0IG9mIHByb3BlcnRpZXMgdGhleVxuICAgKiByZXR1cm5zLlxuICAgKlxuICAgKiA8cD5UT0RPKGVyaWdodHMpOiBPbiBhIHBsYXRmb3JtIHdpdGggYnVpbHQtaW4gUHJveGllcywgcHJveGllc1xuICAgKiBjb3VsZCBiZSB1c2VkIHRvIHRyYXAgYW5kIHRoZXJlYnkgZGlzY292ZXIgdGhlIEhJRERFTl9OQU1FLCBzbyB3ZVxuICAgKiBuZWVkIHRvIG1vbmtleSBwYXRjaCBQcm94eS5jcmVhdGUsIFByb3h5LmNyZWF0ZUZ1bmN0aW9uLCBldGMsIGluXG4gICAqIG9yZGVyIHRvIHdyYXAgdGhlIHByb3ZpZGVkIGhhbmRsZXIgd2l0aCB0aGUgcmVhbCBoYW5kbGVyIHdoaWNoXG4gICAqIGZpbHRlcnMgb3V0IGFsbCB0cmFwcyB1c2luZyBISURERU5fTkFNRS5cbiAgICpcbiAgICogPHA+VE9ETyhlcmlnaHRzKTogUmV2aXNpdCBNaWtlIFN0YXkncyBzdWdnZXN0aW9uIHRoYXQgd2UgdXNlIGFuXG4gICAqIGVuY2Fwc3VsYXRlZCBmdW5jdGlvbiBhdCBhIG5vdC1uZWNlc3NhcmlseS1zZWNyZXQgbmFtZSwgd2hpY2hcbiAgICogdXNlcyB0aGUgU3RpZWdsZXIgc2hhcmVkLXN0YXRlIHJpZ2h0cyBhbXBsaWZpY2F0aW9uIHBhdHRlcm4gdG9cbiAgICogcmV2ZWFsIHRoZSBhc3NvY2lhdGVkIHZhbHVlIG9ubHkgdG8gdGhlIFdlYWtNYXAgaW4gd2hpY2ggdGhpcyBrZXlcbiAgICogaXMgYXNzb2NpYXRlZCB3aXRoIHRoYXQgdmFsdWUuIFNpbmNlIG9ubHkgdGhlIGtleSByZXRhaW5zIHRoZVxuICAgKiBmdW5jdGlvbiwgdGhlIGZ1bmN0aW9uIGNhbiBhbHNvIHJlbWVtYmVyIHRoZSBrZXkgd2l0aG91dCBjYXVzaW5nXG4gICAqIGxlYWthZ2Ugb2YgdGhlIGtleSwgc28gdGhpcyBkb2Vzbid0IHZpb2xhdGUgb3VyIGdlbmVyYWwgZ2NcbiAgICogZ29hbHMuIEluIGFkZGl0aW9uLCBiZWNhdXNlIHRoZSBuYW1lIG5lZWQgbm90IGJlIGEgZ3VhcmRlZFxuICAgKiBzZWNyZXQsIHdlIGNvdWxkIGVmZmljaWVudGx5IGhhbmRsZSBjcm9zcy1mcmFtZSBmcm96ZW4ga2V5cy5cbiAgICovXG4gIHZhciBISURERU5fTkFNRV9QUkVGSVggPSAnd2Vha21hcDonO1xuICB2YXIgSElEREVOX05BTUUgPSBISURERU5fTkFNRV9QUkVGSVggKyAnaWRlbnQ6JyArIE1hdGgucmFuZG9tKCkgKyAnX19fJztcblxuICBpZiAodHlwZW9mIGNyeXB0byAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgIHR5cGVvZiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzID09PSAnZnVuY3Rpb24nICYmXG4gICAgICB0eXBlb2YgQXJyYXlCdWZmZXIgPT09ICdmdW5jdGlvbicgJiZcbiAgICAgIHR5cGVvZiBVaW50OEFycmF5ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdmFyIGFiID0gbmV3IEFycmF5QnVmZmVyKDI1KTtcbiAgICB2YXIgdThzID0gbmV3IFVpbnQ4QXJyYXkoYWIpO1xuICAgIGNyeXB0by5nZXRSYW5kb21WYWx1ZXModThzKTtcbiAgICBISURERU5fTkFNRSA9IEhJRERFTl9OQU1FX1BSRUZJWCArICdyYW5kOicgK1xuICAgICAgQXJyYXkucHJvdG90eXBlLm1hcC5jYWxsKHU4cywgZnVuY3Rpb24odTgpIHtcbiAgICAgICAgcmV0dXJuICh1OCAlIDM2KS50b1N0cmluZygzNik7XG4gICAgICB9KS5qb2luKCcnKSArICdfX18nO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNOb3RIaWRkZW5OYW1lKG5hbWUpIHtcbiAgICByZXR1cm4gIShcbiAgICAgICAgbmFtZS5zdWJzdHIoMCwgSElEREVOX05BTUVfUFJFRklYLmxlbmd0aCkgPT0gSElEREVOX05BTUVfUFJFRklYICYmXG4gICAgICAgIG5hbWUuc3Vic3RyKG5hbWUubGVuZ3RoIC0gMykgPT09ICdfX18nKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNb25rZXkgcGF0Y2ggZ2V0T3duUHJvcGVydHlOYW1lcyB0byBhdm9pZCByZXZlYWxpbmcgdGhlXG4gICAqIEhJRERFTl9OQU1FLlxuICAgKlxuICAgKiA8cD5UaGUgRVM1LjEgc3BlYyByZXF1aXJlcyBlYWNoIG5hbWUgdG8gYXBwZWFyIG9ubHkgb25jZSwgYnV0IGFzXG4gICAqIG9mIHRoaXMgd3JpdGluZywgdGhpcyByZXF1aXJlbWVudCBpcyBjb250cm92ZXJzaWFsIGZvciBFUzYsIHNvIHdlXG4gICAqIG1hZGUgdGhpcyBjb2RlIHJvYnVzdCBhZ2FpbnN0IHRoaXMgY2FzZS4gSWYgdGhlIHJlc3VsdGluZyBleHRyYVxuICAgKiBzZWFyY2ggdHVybnMgb3V0IHRvIGJlIGV4cGVuc2l2ZSwgd2UgY2FuIHByb2JhYmx5IHJlbGF4IHRoaXMgb25jZVxuICAgKiBFUzYgaXMgYWRlcXVhdGVseSBzdXBwb3J0ZWQgb24gYWxsIG1ham9yIGJyb3dzZXJzLCBpZmYgbm8gYnJvd3NlclxuICAgKiB2ZXJzaW9ucyB3ZSBzdXBwb3J0IGF0IHRoYXQgdGltZSBoYXZlIHJlbGF4ZWQgdGhpcyBjb25zdHJhaW50XG4gICAqIHdpdGhvdXQgcHJvdmlkaW5nIGJ1aWx0LWluIEVTNiBXZWFrTWFwcy5cbiAgICovXG4gIGRlZlByb3AoT2JqZWN0LCAnZ2V0T3duUHJvcGVydHlOYW1lcycsIHtcbiAgICB2YWx1ZTogZnVuY3Rpb24gZmFrZUdldE93blByb3BlcnR5TmFtZXMob2JqKSB7XG4gICAgICByZXR1cm4gZ29wbihvYmopLmZpbHRlcihpc05vdEhpZGRlbk5hbWUpO1xuICAgIH1cbiAgfSk7XG5cbiAgLyoqXG4gICAqIGdldFByb3BlcnR5TmFtZXMgaXMgbm90IGluIEVTNSBidXQgaXQgaXMgcHJvcG9zZWQgZm9yIEVTNiBhbmRcbiAgICogZG9lcyBhcHBlYXIgaW4gb3VyIHdoaXRlbGlzdCwgc28gd2UgbmVlZCB0byBjbGVhbiBpdCB0b28uXG4gICAqL1xuICBpZiAoJ2dldFByb3BlcnR5TmFtZXMnIGluIE9iamVjdCkge1xuICAgIHZhciBvcmlnaW5hbEdldFByb3BlcnR5TmFtZXMgPSBPYmplY3QuZ2V0UHJvcGVydHlOYW1lcztcbiAgICBkZWZQcm9wKE9iamVjdCwgJ2dldFByb3BlcnR5TmFtZXMnLCB7XG4gICAgICB2YWx1ZTogZnVuY3Rpb24gZmFrZUdldFByb3BlcnR5TmFtZXMob2JqKSB7XG4gICAgICAgIHJldHVybiBvcmlnaW5hbEdldFByb3BlcnR5TmFtZXMob2JqKS5maWx0ZXIoaXNOb3RIaWRkZW5OYW1lKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiA8cD5UbyB0cmVhdCBvYmplY3RzIGFzIGlkZW50aXR5LWtleXMgd2l0aCByZWFzb25hYmxlIGVmZmljaWVuY3lcbiAgICogb24gRVM1IGJ5IGl0c2VsZiAoaS5lLiwgd2l0aG91dCBhbnkgb2JqZWN0LWtleWVkIGNvbGxlY3Rpb25zKSwgd2VcbiAgICogbmVlZCB0byBhZGQgYSBoaWRkZW4gcHJvcGVydHkgdG8gc3VjaCBrZXkgb2JqZWN0cyB3aGVuIHdlXG4gICAqIGNhbi4gVGhpcyByYWlzZXMgc2V2ZXJhbCBpc3N1ZXM6XG4gICAqIDx1bD5cbiAgICogPGxpPkFycmFuZ2luZyB0byBhZGQgdGhpcyBwcm9wZXJ0eSB0byBvYmplY3RzIGJlZm9yZSB3ZSBsb3NlIHRoZVxuICAgKiAgICAgY2hhbmNlLCBhbmRcbiAgICogPGxpPkhpZGluZyB0aGUgZXhpc3RlbmNlIG9mIHRoaXMgbmV3IHByb3BlcnR5IGZyb20gbW9zdFxuICAgKiAgICAgSmF2YVNjcmlwdCBjb2RlLlxuICAgKiA8bGk+UHJldmVudGluZyA8aT5jZXJ0aWZpY2F0aW9uIHRoZWZ0PC9pPiwgd2hlcmUgb25lIG9iamVjdCBpc1xuICAgKiAgICAgY3JlYXRlZCBmYWxzZWx5IGNsYWltaW5nIHRvIGJlIHRoZSBrZXkgb2YgYW4gYXNzb2NpYXRpb25cbiAgICogICAgIGFjdHVhbGx5IGtleWVkIGJ5IGFub3RoZXIgb2JqZWN0LlxuICAgKiA8bGk+UHJldmVudGluZyA8aT52YWx1ZSB0aGVmdDwvaT4sIHdoZXJlIHVudHJ1c3RlZCBjb2RlIHdpdGhcbiAgICogICAgIGFjY2VzcyB0byBhIGtleSBvYmplY3QgYnV0IG5vdCBhIHdlYWsgbWFwIG5ldmVydGhlbGVzc1xuICAgKiAgICAgb2J0YWlucyBhY2Nlc3MgdG8gdGhlIHZhbHVlIGFzc29jaWF0ZWQgd2l0aCB0aGF0IGtleSBpbiB0aGF0XG4gICAqICAgICB3ZWFrIG1hcC5cbiAgICogPC91bD5cbiAgICogV2UgZG8gc28gYnlcbiAgICogPHVsPlxuICAgKiA8bGk+TWFraW5nIHRoZSBuYW1lIG9mIHRoZSBoaWRkZW4gcHJvcGVydHkgdW5ndWVzc2FibGUsIHNvIFwiW11cIlxuICAgKiAgICAgaW5kZXhpbmcsIHdoaWNoIHdlIGNhbm5vdCBpbnRlcmNlcHQsIGNhbm5vdCBiZSB1c2VkIHRvIGFjY2Vzc1xuICAgKiAgICAgYSBwcm9wZXJ0eSB3aXRob3V0IGtub3dpbmcgdGhlIG5hbWUuXG4gICAqIDxsaT5NYWtpbmcgdGhlIGhpZGRlbiBwcm9wZXJ0eSBub24tZW51bWVyYWJsZSwgc28gd2UgbmVlZCBub3RcbiAgICogICAgIHdvcnJ5IGFib3V0IGZvci1pbiBsb29wcyBvciB7QGNvZGUgT2JqZWN0LmtleXN9LFxuICAgKiA8bGk+bW9ua2V5IHBhdGNoaW5nIHRob3NlIHJlZmxlY3RpdmUgbWV0aG9kcyB0aGF0IHdvdWxkXG4gICAqICAgICBwcmV2ZW50IGV4dGVuc2lvbnMsIHRvIGFkZCB0aGlzIGhpZGRlbiBwcm9wZXJ0eSBmaXJzdCxcbiAgICogPGxpPm1vbmtleSBwYXRjaGluZyB0aG9zZSBtZXRob2RzIHRoYXQgd291bGQgcmV2ZWFsIHRoaXNcbiAgICogICAgIGhpZGRlbiBwcm9wZXJ0eS5cbiAgICogPC91bD5cbiAgICogVW5mb3J0dW5hdGVseSwgYmVjYXVzZSBvZiBzYW1lLW9yaWdpbiBpZnJhbWVzLCB3ZSBjYW5ub3QgcmVsaWFibHlcbiAgICogYWRkIHRoaXMgaGlkZGVuIHByb3BlcnR5IGJlZm9yZSBhbiBvYmplY3QgYmVjb21lc1xuICAgKiBub24tZXh0ZW5zaWJsZS4gSW5zdGVhZCwgaWYgd2UgZW5jb3VudGVyIGEgbm9uLWV4dGVuc2libGUgb2JqZWN0XG4gICAqIHdpdGhvdXQgYSBoaWRkZW4gcmVjb3JkIHRoYXQgd2UgY2FuIGRldGVjdCAod2hldGhlciBvciBub3QgaXQgaGFzXG4gICAqIGEgaGlkZGVuIHJlY29yZCBzdG9yZWQgdW5kZXIgYSBuYW1lIHNlY3JldCB0byB1cyksIHRoZW4gd2UganVzdFxuICAgKiB1c2UgdGhlIGtleSBvYmplY3QgaXRzZWxmIHRvIHJlcHJlc2VudCBpdHMgaWRlbnRpdHkgaW4gYSBicnV0ZVxuICAgKiBmb3JjZSBsZWFreSBtYXAgc3RvcmVkIGluIHRoZSB3ZWFrIG1hcCwgbG9zaW5nIGFsbCB0aGUgYWR2YW50YWdlc1xuICAgKiBvZiB3ZWFrbmVzcyBmb3IgdGhlc2UuXG4gICAqL1xuICBmdW5jdGlvbiBnZXRIaWRkZW5SZWNvcmQoa2V5KSB7XG4gICAgaWYgKGtleSAhPT0gT2JqZWN0KGtleSkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ05vdCBhbiBvYmplY3Q6ICcgKyBrZXkpO1xuICAgIH1cbiAgICB2YXIgaGlkZGVuUmVjb3JkID0ga2V5W0hJRERFTl9OQU1FXTtcbiAgICBpZiAoaGlkZGVuUmVjb3JkICYmIGhpZGRlblJlY29yZC5rZXkgPT09IGtleSkgeyByZXR1cm4gaGlkZGVuUmVjb3JkOyB9XG4gICAgaWYgKCFpc0V4dGVuc2libGUoa2V5KSkge1xuICAgICAgLy8gV2VhayBtYXAgbXVzdCBicnV0ZSBmb3JjZSwgYXMgZXhwbGFpbmVkIGluIGRvYy1jb21tZW50IGFib3ZlLlxuICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICB9XG4gICAgdmFyIGdldHMgPSBbXTtcbiAgICB2YXIgdmFscyA9IFtdO1xuICAgIGhpZGRlblJlY29yZCA9IHtcbiAgICAgIGtleToga2V5LCAgIC8vIHNlbGYgcG9pbnRlciBmb3IgcXVpY2sgb3duIGNoZWNrIGFib3ZlLlxuICAgICAgZ2V0czogZ2V0cywgLy8gZ2V0X19fIG1ldGhvZHMgaWRlbnRpZnlpbmcgd2VhayBtYXBzXG4gICAgICB2YWxzOiB2YWxzICAvLyB2YWx1ZXMgYXNzb2NpYXRlZCB3aXRoIHRoaXMga2V5IGluIGVhY2hcbiAgICAgICAgICAgICAgICAgIC8vIGNvcnJlc3BvbmRpbmcgd2VhayBtYXAuXG4gICAgfTtcbiAgICBkZWZQcm9wKGtleSwgSElEREVOX05BTUUsIHtcbiAgICAgIHZhbHVlOiBoaWRkZW5SZWNvcmQsXG4gICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2VcbiAgICB9KTtcbiAgICByZXR1cm4gaGlkZGVuUmVjb3JkO1xuICB9XG5cblxuICAvKipcbiAgICogTW9ua2V5IHBhdGNoIG9wZXJhdGlvbnMgdGhhdCB3b3VsZCBtYWtlIHRoZWlyIGFyZ3VtZW50XG4gICAqIG5vbi1leHRlbnNpYmxlLlxuICAgKlxuICAgKiA8cD5UaGUgbW9ua2V5IHBhdGNoZWQgdmVyc2lvbnMgdGhyb3cgYSBUeXBlRXJyb3IgaWYgdGhlaXJcbiAgICogYXJndW1lbnQgaXMgbm90IGFuIG9iamVjdCwgc28gaXQgc2hvdWxkIG9ubHkgYmUgZG9uZSB0byBmdW5jdGlvbnNcbiAgICogdGhhdCBzaG91bGQgdGhyb3cgYSBUeXBlRXJyb3IgYW55d2F5IGlmIHRoZWlyIGFyZ3VtZW50IGlzIG5vdCBhblxuICAgKiBvYmplY3QuXG4gICAqL1xuICAoZnVuY3Rpb24oKXtcbiAgICB2YXIgb2xkRnJlZXplID0gT2JqZWN0LmZyZWV6ZTtcbiAgICBkZWZQcm9wKE9iamVjdCwgJ2ZyZWV6ZScsIHtcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBpZGVudGlmeWluZ0ZyZWV6ZShvYmopIHtcbiAgICAgICAgZ2V0SGlkZGVuUmVjb3JkKG9iaik7XG4gICAgICAgIHJldHVybiBvbGRGcmVlemUob2JqKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB2YXIgb2xkU2VhbCA9IE9iamVjdC5zZWFsO1xuICAgIGRlZlByb3AoT2JqZWN0LCAnc2VhbCcsIHtcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBpZGVudGlmeWluZ1NlYWwob2JqKSB7XG4gICAgICAgIGdldEhpZGRlblJlY29yZChvYmopO1xuICAgICAgICByZXR1cm4gb2xkU2VhbChvYmopO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHZhciBvbGRQcmV2ZW50RXh0ZW5zaW9ucyA9IE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucztcbiAgICBkZWZQcm9wKE9iamVjdCwgJ3ByZXZlbnRFeHRlbnNpb25zJywge1xuICAgICAgdmFsdWU6IGZ1bmN0aW9uIGlkZW50aWZ5aW5nUHJldmVudEV4dGVuc2lvbnMob2JqKSB7XG4gICAgICAgIGdldEhpZGRlblJlY29yZChvYmopO1xuICAgICAgICByZXR1cm4gb2xkUHJldmVudEV4dGVuc2lvbnMob2JqKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSkoKTtcblxuXG4gIGZ1bmN0aW9uIGNvbnN0RnVuYyhmdW5jKSB7XG4gICAgZnVuYy5wcm90b3R5cGUgPSBudWxsO1xuICAgIHJldHVybiBPYmplY3QuZnJlZXplKGZ1bmMpO1xuICB9XG5cbiAgLy8gUmlnaHQgbm93ICgxMi8yNS8yMDEyKSB0aGUgaGlzdG9ncmFtIHN1cHBvcnRzIHRoZSBjdXJyZW50XG4gIC8vIHJlcHJlc2VudGF0aW9uLiBXZSBzaG91bGQgY2hlY2sgdGhpcyBvY2Nhc2lvbmFsbHksIGFzIGEgdHJ1ZVxuICAvLyBjb25zdGFudCB0aW1lIHJlcHJlc2VudGF0aW9uIGlzIGVhc3kuXG4gIC8vIHZhciBoaXN0b2dyYW0gPSBbXTtcblxuICB2YXIgT3VyV2Vha01hcCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFdlIGFyZSBjdXJyZW50bHkgKDEyLzI1LzIwMTIpIG5ldmVyIGVuY291bnRlcmluZyBhbnkgcHJlbWF0dXJlbHlcbiAgICAvLyBub24tZXh0ZW5zaWJsZSBrZXlzLlxuICAgIHZhciBrZXlzID0gW107IC8vIGJydXRlIGZvcmNlIGZvciBwcmVtYXR1cmVseSBub24tZXh0ZW5zaWJsZSBrZXlzLlxuICAgIHZhciB2YWxzID0gW107IC8vIGJydXRlIGZvcmNlIGZvciBjb3JyZXNwb25kaW5nIHZhbHVlcy5cblxuICAgIGZ1bmN0aW9uIGdldF9fXyhrZXksIG9wdF9kZWZhdWx0KSB7XG4gICAgICB2YXIgaHIgPSBnZXRIaWRkZW5SZWNvcmQoa2V5KTtcbiAgICAgIHZhciBpLCB2cztcbiAgICAgIGlmIChocikge1xuICAgICAgICBpID0gaHIuZ2V0cy5pbmRleE9mKGdldF9fXyk7XG4gICAgICAgIHZzID0gaHIudmFscztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGkgPSBrZXlzLmluZGV4T2Yoa2V5KTtcbiAgICAgICAgdnMgPSB2YWxzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIChpID49IDApID8gdnNbaV0gOiBvcHRfZGVmYXVsdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoYXNfX18oa2V5KSB7XG4gICAgICB2YXIgaHIgPSBnZXRIaWRkZW5SZWNvcmQoa2V5KTtcbiAgICAgIHZhciBpO1xuICAgICAgaWYgKGhyKSB7XG4gICAgICAgIGkgPSBoci5nZXRzLmluZGV4T2YoZ2V0X19fKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGkgPSBrZXlzLmluZGV4T2Yoa2V5KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpID49IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0X19fKGtleSwgdmFsdWUpIHtcbiAgICAgIHZhciBociA9IGdldEhpZGRlblJlY29yZChrZXkpO1xuICAgICAgdmFyIGk7XG4gICAgICBpZiAoaHIpIHtcbiAgICAgICAgaSA9IGhyLmdldHMuaW5kZXhPZihnZXRfX18pO1xuICAgICAgICBpZiAoaSA+PSAwKSB7XG4gICAgICAgICAgaHIudmFsc1tpXSA9IHZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuLy8gICAgICAgICAgaSA9IGhyLmdldHMubGVuZ3RoO1xuLy8gICAgICAgICAgaGlzdG9ncmFtW2ldID0gKGhpc3RvZ3JhbVtpXSB8fCAwKSArIDE7XG4gICAgICAgICAgaHIuZ2V0cy5wdXNoKGdldF9fXyk7XG4gICAgICAgICAgaHIudmFscy5wdXNoKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaSA9IGtleXMuaW5kZXhPZihrZXkpO1xuICAgICAgICBpZiAoaSA+PSAwKSB7XG4gICAgICAgICAgdmFsc1tpXSA9IHZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGtleXMucHVzaChrZXkpO1xuICAgICAgICAgIHZhbHMucHVzaCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZWxldGVfX18oa2V5KSB7XG4gICAgICB2YXIgaHIgPSBnZXRIaWRkZW5SZWNvcmQoa2V5KTtcbiAgICAgIHZhciBpO1xuICAgICAgaWYgKGhyKSB7XG4gICAgICAgIGkgPSBoci5nZXRzLmluZGV4T2YoZ2V0X19fKTtcbiAgICAgICAgaWYgKGkgPj0gMCkge1xuICAgICAgICAgIGhyLmdldHMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgIGhyLnZhbHMuc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpID0ga2V5cy5pbmRleE9mKGtleSk7XG4gICAgICAgIGlmIChpID49IDApIHtcbiAgICAgICAgICBrZXlzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICB2YWxzLnNwbGljZShpLCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIE9iamVjdC5jcmVhdGUoT3VyV2Vha01hcC5wcm90b3R5cGUsIHtcbiAgICAgIGdldF9fXzogICAgeyB2YWx1ZTogY29uc3RGdW5jKGdldF9fXykgfSxcbiAgICAgIGhhc19fXzogICAgeyB2YWx1ZTogY29uc3RGdW5jKGhhc19fXykgfSxcbiAgICAgIHNldF9fXzogICAgeyB2YWx1ZTogY29uc3RGdW5jKHNldF9fXykgfSxcbiAgICAgIGRlbGV0ZV9fXzogeyB2YWx1ZTogY29uc3RGdW5jKGRlbGV0ZV9fXykgfVxuICAgIH0pO1xuICB9O1xuICBPdXJXZWFrTWFwLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT2JqZWN0LnByb3RvdHlwZSwge1xuICAgIGdldDoge1xuICAgICAgLyoqXG4gICAgICAgKiBSZXR1cm4gdGhlIHZhbHVlIG1vc3QgcmVjZW50bHkgYXNzb2NpYXRlZCB3aXRoIGtleSwgb3JcbiAgICAgICAqIG9wdF9kZWZhdWx0IGlmIG5vbmUuXG4gICAgICAgKi9cbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBnZXQoa2V5LCBvcHRfZGVmYXVsdCkge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRfX18oa2V5LCBvcHRfZGVmYXVsdCk7XG4gICAgICB9LFxuICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9LFxuXG4gICAgaGFzOiB7XG4gICAgICAvKipcbiAgICAgICAqIElzIHRoZXJlIGEgdmFsdWUgYXNzb2NpYXRlZCB3aXRoIGtleSBpbiB0aGlzIFdlYWtNYXA/XG4gICAgICAgKi9cbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBoYXMoa2V5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmhhc19fXyhrZXkpO1xuICAgICAgfSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSxcblxuICAgIHNldDoge1xuICAgICAgLyoqXG4gICAgICAgKiBBc3NvY2lhdGUgdmFsdWUgd2l0aCBrZXkgaW4gdGhpcyBXZWFrTWFwLCBvdmVyd3JpdGluZyBhbnlcbiAgICAgICAqIHByZXZpb3VzIGFzc29jaWF0aW9uIGlmIHByZXNlbnQuXG4gICAgICAgKi9cbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBzZXQoa2V5LCB2YWx1ZSkge1xuICAgICAgICB0aGlzLnNldF9fXyhrZXksIHZhbHVlKTtcbiAgICAgIH0sXG4gICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0sXG5cbiAgICAnZGVsZXRlJzoge1xuICAgICAgLyoqXG4gICAgICAgKiBSZW1vdmUgYW55IGFzc29jaWF0aW9uIGZvciBrZXkgaW4gdGhpcyBXZWFrTWFwLCByZXR1cm5pbmdcbiAgICAgICAqIHdoZXRoZXIgdGhlcmUgd2FzIG9uZS5cbiAgICAgICAqXG4gICAgICAgKiA8cD5Ob3RlIHRoYXQgdGhlIGJvb2xlYW4gcmV0dXJuIGhlcmUgZG9lcyBub3Qgd29yayBsaWtlIHRoZVxuICAgICAgICoge0Bjb2RlIGRlbGV0ZX0gb3BlcmF0b3IuIFRoZSB7QGNvZGUgZGVsZXRlfSBvcGVyYXRvciByZXR1cm5zXG4gICAgICAgKiB3aGV0aGVyIHRoZSBkZWxldGlvbiBzdWNjZWVkcyBhdCBicmluZ2luZyBhYm91dCBhIHN0YXRlIGluXG4gICAgICAgKiB3aGljaCB0aGUgZGVsZXRlZCBwcm9wZXJ0eSBpcyBhYnNlbnQuIFRoZSB7QGNvZGUgZGVsZXRlfVxuICAgICAgICogb3BlcmF0b3IgdGhlcmVmb3JlIHJldHVybnMgdHJ1ZSBpZiB0aGUgcHJvcGVydHkgd2FzIGFscmVhZHlcbiAgICAgICAqIGFic2VudCwgd2hlcmVhcyB0aGlzIHtAY29kZSBkZWxldGV9IG1ldGhvZCByZXR1cm5zIGZhbHNlIGlmXG4gICAgICAgKiB0aGUgYXNzb2NpYXRpb24gd2FzIGFscmVhZHkgYWJzZW50LlxuICAgICAgICovXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gcmVtb3ZlKGtleSkge1xuICAgICAgICByZXR1cm4gdGhpcy5kZWxldGVfX18oa2V5KTtcbiAgICAgIH0sXG4gICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH1cbiAgfSk7XG5cbiAgaWYgKHR5cGVvZiBIb3N0V2Vha01hcCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIChmdW5jdGlvbigpIHtcbiAgICAgIC8vIElmIHdlIGdvdCBoZXJlLCB0aGVuIHRoZSBwbGF0Zm9ybSBoYXMgYSBXZWFrTWFwIGJ1dCB3ZSBhcmUgY29uY2VybmVkXG4gICAgICAvLyB0aGF0IGl0IG1heSByZWZ1c2UgdG8gc3RvcmUgc29tZSBrZXkgdHlwZXMuIFRoZXJlZm9yZSwgbWFrZSBhIG1hcFxuICAgICAgLy8gaW1wbGVtZW50YXRpb24gd2hpY2ggbWFrZXMgdXNlIG9mIGJvdGggYXMgcG9zc2libGUuXG5cbiAgICAgIGZ1bmN0aW9uIERvdWJsZVdlYWtNYXAoKSB7XG4gICAgICAgIC8vIFByZWZlcmFibGUsIHRydWx5IHdlYWsgbWFwLlxuICAgICAgICB2YXIgaG1hcCA9IG5ldyBIb3N0V2Vha01hcCgpO1xuXG4gICAgICAgIC8vIE91ciBoaWRkZW4tcHJvcGVydHktYmFzZWQgcHNldWRvLXdlYWstbWFwLiBMYXppbHkgaW5pdGlhbGl6ZWQgaW4gdGhlXG4gICAgICAgIC8vICdzZXQnIGltcGxlbWVudGF0aW9uOyB0aHVzIHdlIGNhbiBhdm9pZCBwZXJmb3JtaW5nIGV4dHJhIGxvb2t1cHMgaWZcbiAgICAgICAgLy8gd2Uga25vdyBhbGwgZW50cmllcyBhY3R1YWxseSBzdG9yZWQgYXJlIGVudGVyZWQgaW4gJ2htYXAnLlxuICAgICAgICB2YXIgb21hcCA9IHVuZGVmaW5lZDtcblxuICAgICAgICAvLyBIaWRkZW4tcHJvcGVydHkgbWFwcyBhcmUgbm90IGNvbXBhdGlibGUgd2l0aCBwcm94aWVzIGJlY2F1c2UgcHJveGllc1xuICAgICAgICAvLyBjYW4gb2JzZXJ2ZSB0aGUgaGlkZGVuIG5hbWUgYW5kIGVpdGhlciBhY2NpZGVudGFsbHkgZXhwb3NlIGl0IG9yIGZhaWxcbiAgICAgICAgLy8gdG8gYWxsb3cgdGhlIGhpZGRlbiBwcm9wZXJ0eSB0byBiZSBzZXQuIFRoZXJlZm9yZSwgd2UgZG8gbm90IGFsbG93XG4gICAgICAgIC8vIGFyYml0cmFyeSBXZWFrTWFwcyB0byBzd2l0Y2ggdG8gdXNpbmcgaGlkZGVuIHByb3BlcnRpZXMsIGJ1dCBvbmx5XG4gICAgICAgIC8vIHRob3NlIHdoaWNoIG5lZWQgdGhlIGFiaWxpdHksIGFuZCB1bnByaXZpbGVnZWQgY29kZSBpcyBub3QgYWxsb3dlZFxuICAgICAgICAvLyB0byBzZXQgdGhlIGZsYWcuXG4gICAgICAgIHZhciBlbmFibGVTd2l0Y2hpbmcgPSBmYWxzZTtcblxuICAgICAgICBmdW5jdGlvbiBkZ2V0KGtleSwgb3B0X2RlZmF1bHQpIHtcbiAgICAgICAgICBpZiAob21hcCkge1xuICAgICAgICAgICAgcmV0dXJuIGhtYXAuaGFzKGtleSkgPyBobWFwLmdldChrZXkpXG4gICAgICAgICAgICAgICAgOiBvbWFwLmdldF9fXyhrZXksIG9wdF9kZWZhdWx0KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGhtYXAuZ2V0KGtleSwgb3B0X2RlZmF1bHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGRoYXMoa2V5KSB7XG4gICAgICAgICAgcmV0dXJuIGhtYXAuaGFzKGtleSkgfHwgKG9tYXAgPyBvbWFwLmhhc19fXyhrZXkpIDogZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZHNldChrZXksIHZhbHVlKSB7XG4gICAgICAgICAgaWYgKGVuYWJsZVN3aXRjaGluZykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgaG1hcC5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgIGlmICghb21hcCkgeyBvbWFwID0gbmV3IE91cldlYWtNYXAoKTsgfVxuICAgICAgICAgICAgICBvbWFwLnNldF9fXyhrZXksIHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaG1hcC5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZGRlbGV0ZShrZXkpIHtcbiAgICAgICAgICBobWFwWydkZWxldGUnXShrZXkpO1xuICAgICAgICAgIGlmIChvbWFwKSB7IG9tYXAuZGVsZXRlX19fKGtleSk7IH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBPYmplY3QuY3JlYXRlKE91cldlYWtNYXAucHJvdG90eXBlLCB7XG4gICAgICAgICAgZ2V0X19fOiAgICB7IHZhbHVlOiBjb25zdEZ1bmMoZGdldCkgfSxcbiAgICAgICAgICBoYXNfX186ICAgIHsgdmFsdWU6IGNvbnN0RnVuYyhkaGFzKSB9LFxuICAgICAgICAgIHNldF9fXzogICAgeyB2YWx1ZTogY29uc3RGdW5jKGRzZXQpIH0sXG4gICAgICAgICAgZGVsZXRlX19fOiB7IHZhbHVlOiBjb25zdEZ1bmMoZGRlbGV0ZSkgfSxcbiAgICAgICAgICBwZXJtaXRIb3N0T2JqZWN0c19fXzogeyB2YWx1ZTogY29uc3RGdW5jKGZ1bmN0aW9uKHRva2VuKSB7XG4gICAgICAgICAgICBpZiAodG9rZW4gPT09IHdlYWtNYXBQZXJtaXRIb3N0T2JqZWN0cykge1xuICAgICAgICAgICAgICBlbmFibGVTd2l0Y2hpbmcgPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdib2d1cyBjYWxsIHRvIHBlcm1pdEhvc3RPYmplY3RzX19fJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSl9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgRG91YmxlV2Vha01hcC5wcm90b3R5cGUgPSBPdXJXZWFrTWFwLnByb3RvdHlwZTtcbiAgICAgIG1vZHVsZS5leHBvcnRzID0gRG91YmxlV2Vha01hcDtcblxuICAgICAgLy8gZGVmaW5lIC5jb25zdHJ1Y3RvciB0byBoaWRlIE91cldlYWtNYXAgY3RvclxuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFdlYWtNYXAucHJvdG90eXBlLCAnY29uc3RydWN0b3InLCB7XG4gICAgICAgIHZhbHVlOiBXZWFrTWFwLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSwgIC8vIGFzIGRlZmF1bHQgLmNvbnN0cnVjdG9yIGlzXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWVcbiAgICAgIH0pO1xuICAgIH0pKCk7XG4gIH0gZWxzZSB7XG4gICAgLy8gVGhlcmUgaXMgbm8gaG9zdCBXZWFrTWFwLCBzbyB3ZSBtdXN0IHVzZSB0aGUgZW11bGF0aW9uLlxuXG4gICAgLy8gRW11bGF0ZWQgV2Vha01hcHMgYXJlIGluY29tcGF0aWJsZSB3aXRoIG5hdGl2ZSBwcm94aWVzIChiZWNhdXNlIHByb3hpZXNcbiAgICAvLyBjYW4gb2JzZXJ2ZSB0aGUgaGlkZGVuIG5hbWUpLCBzbyB3ZSBtdXN0IGRpc2FibGUgUHJveHkgdXNhZ2UgKGluXG4gICAgLy8gQXJyYXlMaWtlIGFuZCBEb21hZG8sIGN1cnJlbnRseSkuXG4gICAgaWYgKHR5cGVvZiBQcm94eSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIFByb3h5ID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIG1vZHVsZS5leHBvcnRzID0gT3VyV2Vha01hcDtcbiAgfVxufSkoKTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vKlxuICAgIEJhc2VkIGluIHBhcnQgb24gZXh0cmFzIGZyb20gTW90b3JvbGEgTW9iaWxpdHnigJlzIE1vbnRhZ2VcbiAgICBDb3B5cmlnaHQgKGMpIDIwMTIsIE1vdG9yb2xhIE1vYmlsaXR5IExMQy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAgICAzLUNsYXVzZSBCU0QgTGljZW5zZVxuICAgIGh0dHBzOi8vZ2l0aHViLmNvbS9tb3Rvcm9sYS1tb2JpbGl0eS9tb250YWdlL2Jsb2IvbWFzdGVyL0xJQ0VOU0UubWRcbiovXG5cbnZhciBGdW5jdGlvbiA9IHJlcXVpcmUoXCIuL3NoaW0tZnVuY3Rpb25cIik7XG52YXIgR2VuZXJpY0NvbGxlY3Rpb24gPSByZXF1aXJlKFwiLi9nZW5lcmljLWNvbGxlY3Rpb25cIik7XG52YXIgR2VuZXJpY09yZGVyID0gcmVxdWlyZShcIi4vZ2VuZXJpYy1vcmRlclwiKTtcbnZhciBXZWFrTWFwID0gcmVxdWlyZShcIndlYWstbWFwXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFycmF5O1xuXG5BcnJheS5lbXB0eSA9IFtdO1xuXG5pZiAoT2JqZWN0LmZyZWV6ZSkge1xuICAgIE9iamVjdC5mcmVlemUoQXJyYXkuZW1wdHkpO1xufVxuXG5BcnJheS5mcm9tID0gZnVuY3Rpb24gKHZhbHVlcykge1xuICAgIHZhciBhcnJheSA9IFtdO1xuICAgIGFycmF5LmFkZEVhY2godmFsdWVzKTtcbiAgICByZXR1cm4gYXJyYXk7XG59O1xuXG5BcnJheS51bnppcCA9IGZ1bmN0aW9uICh0YWJsZSkge1xuICAgIHZhciB0cmFuc3Bvc2UgPSBbXTtcbiAgICB2YXIgbGVuZ3RoID0gSW5maW5pdHk7XG4gICAgLy8gY29tcHV0ZSBzaG9ydGVzdCByb3dcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhYmxlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciByb3cgPSB0YWJsZVtpXTtcbiAgICAgICAgdGFibGVbaV0gPSByb3cudG9BcnJheSgpO1xuICAgICAgICBpZiAocm93Lmxlbmd0aCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgbGVuZ3RoID0gcm93Lmxlbmd0aDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhYmxlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciByb3cgPSB0YWJsZVtpXTtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCByb3cubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGlmIChqIDwgbGVuZ3RoICYmIGogaW4gcm93KSB7XG4gICAgICAgICAgICAgICAgdHJhbnNwb3NlW2pdID0gdHJhbnNwb3NlW2pdIHx8IFtdO1xuICAgICAgICAgICAgICAgIHRyYW5zcG9zZVtqXVtpXSA9IHJvd1tqXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJhbnNwb3NlO1xufTtcblxuZnVuY3Rpb24gZGVmaW5lKGtleSwgdmFsdWUpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQXJyYXkucHJvdG90eXBlLCBrZXksIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgIH0pO1xufVxuXG5kZWZpbmUoXCJhZGRFYWNoXCIsIEdlbmVyaWNDb2xsZWN0aW9uLnByb3RvdHlwZS5hZGRFYWNoKTtcbmRlZmluZShcImRlbGV0ZUVhY2hcIiwgR2VuZXJpY0NvbGxlY3Rpb24ucHJvdG90eXBlLmRlbGV0ZUVhY2gpO1xuZGVmaW5lKFwidG9BcnJheVwiLCBHZW5lcmljQ29sbGVjdGlvbi5wcm90b3R5cGUudG9BcnJheSk7XG5kZWZpbmUoXCJ0b09iamVjdFwiLCBHZW5lcmljQ29sbGVjdGlvbi5wcm90b3R5cGUudG9PYmplY3QpO1xuZGVmaW5lKFwiYWxsXCIsIEdlbmVyaWNDb2xsZWN0aW9uLnByb3RvdHlwZS5hbGwpO1xuZGVmaW5lKFwiYW55XCIsIEdlbmVyaWNDb2xsZWN0aW9uLnByb3RvdHlwZS5hbnkpO1xuZGVmaW5lKFwibWluXCIsIEdlbmVyaWNDb2xsZWN0aW9uLnByb3RvdHlwZS5taW4pO1xuZGVmaW5lKFwibWF4XCIsIEdlbmVyaWNDb2xsZWN0aW9uLnByb3RvdHlwZS5tYXgpO1xuZGVmaW5lKFwic3VtXCIsIEdlbmVyaWNDb2xsZWN0aW9uLnByb3RvdHlwZS5zdW0pO1xuZGVmaW5lKFwiYXZlcmFnZVwiLCBHZW5lcmljQ29sbGVjdGlvbi5wcm90b3R5cGUuYXZlcmFnZSk7XG5kZWZpbmUoXCJvbmx5XCIsIEdlbmVyaWNDb2xsZWN0aW9uLnByb3RvdHlwZS5vbmx5KTtcbmRlZmluZShcImZsYXR0ZW5cIiwgR2VuZXJpY0NvbGxlY3Rpb24ucHJvdG90eXBlLmZsYXR0ZW4pO1xuZGVmaW5lKFwiemlwXCIsIEdlbmVyaWNDb2xsZWN0aW9uLnByb3RvdHlwZS56aXApO1xuZGVmaW5lKFwiZW51bWVyYXRlXCIsIEdlbmVyaWNDb2xsZWN0aW9uLnByb3RvdHlwZS5lbnVtZXJhdGUpO1xuZGVmaW5lKFwiZ3JvdXBcIiwgR2VuZXJpY0NvbGxlY3Rpb24ucHJvdG90eXBlLmdyb3VwKTtcbmRlZmluZShcInNvcnRlZFwiLCBHZW5lcmljQ29sbGVjdGlvbi5wcm90b3R5cGUuc29ydGVkKTtcbmRlZmluZShcInJldmVyc2VkXCIsIEdlbmVyaWNDb2xsZWN0aW9uLnByb3RvdHlwZS5yZXZlcnNlZCk7XG5cbmRlZmluZShcImNvbnN0cnVjdENsb25lXCIsIGZ1bmN0aW9uICh2YWx1ZXMpIHtcbiAgICB2YXIgY2xvbmUgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcigpO1xuICAgIGNsb25lLmFkZEVhY2godmFsdWVzKTtcbiAgICByZXR1cm4gY2xvbmU7XG59KTtcblxuZGVmaW5lKFwiaGFzXCIsIGZ1bmN0aW9uICh2YWx1ZSwgZXF1YWxzKSB7XG4gICAgcmV0dXJuIHRoaXMuZmluZCh2YWx1ZSwgZXF1YWxzKSAhPT0gLTE7XG59KTtcblxuZGVmaW5lKFwiZ2V0XCIsIGZ1bmN0aW9uIChpbmRleCwgZGVmYXVsdFZhbHVlKSB7XG4gICAgaWYgKCtpbmRleCAhPT0gaW5kZXgpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkluZGljaWVzIG11c3QgYmUgbnVtYmVyc1wiKTtcbiAgICBpZiAoIWluZGV4IGluIHRoaXMpIHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpc1tpbmRleF07XG4gICAgfVxufSk7XG5cbmRlZmluZShcInNldFwiLCBmdW5jdGlvbiAoaW5kZXgsIHZhbHVlKSB7XG4gICAgdGhpcy5zcGxpY2UoaW5kZXgsIDEsIHZhbHVlKTtcbiAgICByZXR1cm4gdHJ1ZTtcbn0pO1xuXG5kZWZpbmUoXCJhZGRcIiwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgdGhpcy5wdXNoKHZhbHVlKTtcbiAgICByZXR1cm4gdHJ1ZTtcbn0pO1xuXG5kZWZpbmUoXCJkZWxldGVcIiwgZnVuY3Rpb24gKHZhbHVlLCBlcXVhbHMpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLmZpbmQodmFsdWUsIGVxdWFscyk7XG4gICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICB0aGlzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59KTtcblxuZGVmaW5lKFwiZmluZFwiLCBmdW5jdGlvbiAodmFsdWUsIGVxdWFscykge1xuICAgIGVxdWFscyA9IGVxdWFscyB8fCB0aGlzLmNvbnRlbnRFcXVhbHMgfHwgT2JqZWN0LmVxdWFscztcbiAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgdGhpcy5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgICAgaWYgKGluZGV4IGluIHRoaXMgJiYgZXF1YWxzKHRoaXNbaW5kZXhdLCB2YWx1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBpbmRleDtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG59KTtcblxuZGVmaW5lKFwiZmluZExhc3RcIiwgZnVuY3Rpb24gKHZhbHVlLCBlcXVhbHMpIHtcbiAgICBlcXVhbHMgPSBlcXVhbHMgfHwgdGhpcy5jb250ZW50RXF1YWxzIHx8IE9iamVjdC5lcXVhbHM7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5sZW5ndGg7XG4gICAgZG8ge1xuICAgICAgICBpbmRleC0tO1xuICAgICAgICBpZiAoaW5kZXggaW4gdGhpcyAmJiBlcXVhbHModGhpc1tpbmRleF0sIHZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGluZGV4O1xuICAgICAgICB9XG4gICAgfSB3aGlsZSAoaW5kZXggPiAwKTtcbiAgICByZXR1cm4gLTE7XG59KTtcblxuZGVmaW5lKFwic3dhcFwiLCBmdW5jdGlvbiAoaW5kZXgsIGxlbmd0aCwgcGx1cykge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwLCAyKTtcbiAgICBpZiAocGx1cykge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkocGx1cykpIHtcbiAgICAgICAgICAgIHBsdXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChwbHVzKTtcbiAgICAgICAgfVxuICAgICAgICBhcmdzLnB1c2guYXBwbHkoYXJncywgcGx1cyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnNwbGljZS5hcHBseSh0aGlzLCBhcmdzKTtcbn0pO1xuXG5kZWZpbmUoXCJvbmVcIiwgZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcykge1xuICAgICAgICBpZiAoT2JqZWN0Lm93bnModGhpcywgaSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzW2ldO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbmRlZmluZShcImNsZWFyXCIsIGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgcmV0dXJuIHRoaXM7XG59KTtcblxuZGVmaW5lKFwiY29tcGFyZVwiLCBmdW5jdGlvbiAodGhhdCwgY29tcGFyZSkge1xuICAgIGNvbXBhcmUgPSBjb21wYXJlIHx8IE9iamVjdC5jb21wYXJlO1xuICAgIHZhciBpO1xuICAgIHZhciBsZW5ndGg7XG4gICAgdmFyIGxocztcbiAgICB2YXIgcmhzO1xuICAgIHZhciByZWxhdGl2ZTtcblxuICAgIGlmICh0aGlzID09PSB0aGF0KSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGlmICghdGhhdCB8fCAhQXJyYXkuaXNBcnJheSh0aGF0KSkge1xuICAgICAgICByZXR1cm4gR2VuZXJpY09yZGVyLnByb3RvdHlwZS5jb21wYXJlLmNhbGwodGhpcywgdGhhdCwgY29tcGFyZSk7XG4gICAgfVxuXG4gICAgbGVuZ3RoID0gTWF0aC5taW4odGhpcy5sZW5ndGgsIHRoYXQubGVuZ3RoKTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoaSBpbiB0aGlzKSB7XG4gICAgICAgICAgICBpZiAoIShpIGluIHRoYXQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsaHMgPSB0aGlzW2ldO1xuICAgICAgICAgICAgICAgIHJocyA9IHRoYXRbaV07XG4gICAgICAgICAgICAgICAgcmVsYXRpdmUgPSBjb21wYXJlKGxocywgcmhzKTtcbiAgICAgICAgICAgICAgICBpZiAocmVsYXRpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlbGF0aXZlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpIGluIHRoYXQpIHtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMubGVuZ3RoIC0gdGhhdC5sZW5ndGg7XG59KTtcblxuZGVmaW5lKFwiZXF1YWxzXCIsIGZ1bmN0aW9uICh0aGF0LCBlcXVhbHMpIHtcbiAgICBlcXVhbHMgPSBlcXVhbHMgfHwgT2JqZWN0LmVxdWFscztcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoO1xuICAgIHZhciBsZWZ0O1xuICAgIHZhciByaWdodDtcblxuICAgIGlmICh0aGlzID09PSB0aGF0KSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoIXRoYXQgfHwgIUFycmF5LmlzQXJyYXkodGhhdCkpIHtcbiAgICAgICAgcmV0dXJuIEdlbmVyaWNPcmRlci5wcm90b3R5cGUuZXF1YWxzLmNhbGwodGhpcywgdGhhdCk7XG4gICAgfVxuXG4gICAgaWYgKGxlbmd0aCAhPT0gdGhhdC5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAoOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChpIGluIHRoaXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIShpIGluIHRoYXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGVmdCA9IHRoaXNbaV07XG4gICAgICAgICAgICAgICAgcmlnaHQgPSB0aGF0W2ldO1xuICAgICAgICAgICAgICAgIGlmICghZXF1YWxzKGxlZnQsIHJpZ2h0KSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoaSBpbiB0aGF0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59KTtcblxuZGVmaW5lKFwiY2xvbmVcIiwgZnVuY3Rpb24gKGRlcHRoLCBtZW1vKSB7XG4gICAgaWYgKGRlcHRoID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZGVwdGggPSBJbmZpbml0eTtcbiAgICB9IGVsc2UgaWYgKGRlcHRoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBtZW1vID0gbWVtbyB8fCBuZXcgV2Vha01hcCgpO1xuICAgIHZhciBjbG9uZSA9IFtdO1xuICAgIGZvciAodmFyIGkgaW4gdGhpcykge1xuICAgICAgICBpZiAoT2JqZWN0Lm93bnModGhpcywgaSkpIHtcbiAgICAgICAgICAgIGNsb25lW2ldID0gT2JqZWN0LmNsb25lKHRoaXNbaV0sIGRlcHRoIC0gMSwgbWVtbyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBjbG9uZTtcbn0pO1xuXG5kZWZpbmUoXCJpdGVyYXRlXCIsIGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIG5ldyBBcnJheUl0ZXJhdG9yKHRoaXMsIHN0YXJ0LCBlbmQpO1xufSk7XG5cbmRlZmluZShcIkl0ZXJhdG9yXCIsIEFycmF5SXRlcmF0b3IpO1xuXG5mdW5jdGlvbiBBcnJheUl0ZXJhdG9yKGFycmF5LCBzdGFydCwgZW5kKSB7XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xuICAgIHRoaXMuc3RhcnQgPSBzdGFydCA9PSBudWxsID8gMCA6IHN0YXJ0O1xuICAgIHRoaXMuZW5kID0gZW5kO1xufTtcblxuQXJyYXlJdGVyYXRvci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5zdGFydCA9PT0gKHRoaXMuZW5kID09IG51bGwgPyB0aGlzLmFycmF5Lmxlbmd0aCA6IHRoaXMuZW5kKSkge1xuICAgICAgICB0aHJvdyBTdG9wSXRlcmF0aW9uO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLmFycmF5W3RoaXMuc3RhcnQrK107XG4gICAgfVxufTtcblxuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IEZ1bmN0aW9uO1xuXG4vKipcbiAgICBBIHV0aWxpdHkgdG8gcmVkdWNlIHVubmVjZXNzYXJ5IGFsbG9jYXRpb25zIG9mIDxjb2RlPmZ1bmN0aW9uICgpIHt9PC9jb2RlPlxuICAgIGluIGl0cyBtYW55IGNvbG9yZnVsIHZhcmlhdGlvbnMuICBJdCBkb2VzIG5vdGhpbmcgYW5kIHJldHVybnNcbiAgICA8Y29kZT51bmRlZmluZWQ8L2NvZGU+IHRodXMgbWFrZXMgYSBzdWl0YWJsZSBkZWZhdWx0IGluIHNvbWUgY2lyY3Vtc3RhbmNlcy5cblxuICAgIEBmdW5jdGlvbiBleHRlcm5hbDpGdW5jdGlvbi5ub29wXG4qL1xuRnVuY3Rpb24ubm9vcCA9IGZ1bmN0aW9uICgpIHtcbn07XG5cbi8qKlxuICAgIEEgdXRpbGl0eSB0byByZWR1Y2UgdW5uZWNlc3NhcnkgYWxsb2NhdGlvbnMgb2YgPGNvZGU+ZnVuY3Rpb24gKHgpIHtyZXR1cm5cbiAgICB4fTwvY29kZT4gaW4gaXRzIG1hbnkgY29sb3JmdWwgYnV0IHVsdGltYXRlbHkgd2FzdGVmdWwgcGFyYW1ldGVyIG5hbWVcbiAgICB2YXJpYXRpb25zLlxuXG4gICAgQGZ1bmN0aW9uIGV4dGVybmFsOkZ1bmN0aW9uLmlkZW50aXR5XG4gICAgQHBhcmFtIHtBbnl9IGFueSB2YWx1ZVxuICAgIEByZXR1cm5zIHtBbnl9IHRoYXQgdmFsdWVcbiovXG5GdW5jdGlvbi5pZGVudGl0eSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZTtcbn07XG5cbi8qKlxuICAgIEEgdXRpbGl0eSBmb3IgY3JlYXRpbmcgYSBjb21wYXJhdG9yIGZ1bmN0aW9uIGZvciBhIHBhcnRpY3VsYXIgYXNwZWN0IG9mIGFcbiAgICBmaWd1cmF0aXZlIGNsYXNzIG9mIG9iamVjdHMuXG5cbiAgICBAZnVuY3Rpb24gZXh0ZXJuYWw6RnVuY3Rpb24uYnlcbiAgICBAcGFyYW0ge0Z1bmN0aW9ufSByZWxhdGlvbiBBIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyBhIHZhbHVlIGFuZCByZXR1cm5zIGFcbiAgICBjb3JyZXNwb25kaW5nIHZhbHVlIHRvIHVzZSBhcyBhIHJlcHJlc2VudGF0aXZlIHdoZW4gc29ydGluZyB0aGF0IG9iamVjdC5cbiAgICBAcGFyYW0ge0Z1bmN0aW9ufSBjb21wYXJlIGFuIGFsdGVybmF0ZSBjb21wYXJhdG9yIGZvciBjb21wYXJpbmcgdGhlXG4gICAgcmVwcmVzZW50ZWQgdmFsdWVzLiAgVGhlIGRlZmF1bHQgaXMgPGNvZGU+T2JqZWN0LmNvbXBhcmU8L2NvZGU+LCB3aGljaFxuICAgIGRvZXMgYSBkZWVwLCB0eXBlLXNlbnNpdGl2ZSwgcG9seW1vcnBoaWMgY29tcGFyaXNvbi5cbiAgICBAcmV0dXJucyB7RnVuY3Rpb259IGEgY29tcGFyYXRvciB0aGF0IGhhcyBiZWVuIGFubm90YXRlZCB3aXRoXG4gICAgPGNvZGU+Ynk8L2NvZGU+IGFuZCA8Y29kZT5jb21wYXJlPC9jb2RlPiBwcm9wZXJ0aWVzIHNvXG4gICAgPGNvZGU+c29ydGVkPC9jb2RlPiBjYW4gcGVyZm9ybSBhIHRyYW5zZm9ybSB0aGF0IHJlZHVjZXMgdGhlIG5lZWQgdG8gY2FsbFxuICAgIDxjb2RlPmJ5PC9jb2RlPiBvbiBlYWNoIHNvcnRlZCBvYmplY3QgdG8ganVzdCBvbmNlLlxuICovXG5GdW5jdGlvbi5ieSA9IGZ1bmN0aW9uIChieSAsIGNvbXBhcmUpIHtcbiAgICBjb21wYXJlID0gY29tcGFyZSB8fCBPYmplY3QuY29tcGFyZTtcbiAgICBieSA9IGJ5IHx8IEZ1bmN0aW9uLmlkZW50aXR5O1xuICAgIHZhciBjb21wYXJlQnkgPSBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICByZXR1cm4gY29tcGFyZShieShhKSwgYnkoYikpO1xuICAgIH07XG4gICAgY29tcGFyZUJ5LmNvbXBhcmUgPSBjb21wYXJlO1xuICAgIGNvbXBhcmVCeS5ieSA9IGJ5O1xuICAgIHJldHVybiBjb21wYXJlQnk7XG59O1xuXG4vLyBUT0RPIGRvY3VtZW50XG5GdW5jdGlvbi5nZXQgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5nZXQob2JqZWN0LCBrZXkpO1xuICAgIH07XG59O1xuXG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIFdlYWtNYXAgPSByZXF1aXJlKFwid2Vhay1tYXBcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0O1xuXG4vKlxuICAgIEJhc2VkIGluIHBhcnQgb24gZXh0cmFzIGZyb20gTW90b3JvbGEgTW9iaWxpdHnigJlzIE1vbnRhZ2VcbiAgICBDb3B5cmlnaHQgKGMpIDIwMTIsIE1vdG9yb2xhIE1vYmlsaXR5IExMQy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAgICAzLUNsYXVzZSBCU0QgTGljZW5zZVxuICAgIGh0dHBzOi8vZ2l0aHViLmNvbS9tb3Rvcm9sYS1tb2JpbGl0eS9tb250YWdlL2Jsb2IvbWFzdGVyL0xJQ0VOU0UubWRcbiovXG5cbi8qKlxuICAgIERlZmluZXMgZXh0ZW5zaW9ucyB0byBpbnRyaW5zaWMgPGNvZGU+T2JqZWN0PC9jb2RlPi5cbiAgICBAc2VlIFtPYmplY3QgY2xhc3Nde0BsaW5rIGV4dGVybmFsOk9iamVjdH1cbiovXG5cbi8qKlxuICAgIEEgdXRpbGl0eSBvYmplY3QgdG8gYXZvaWQgdW5uZWNlc3NhcnkgYWxsb2NhdGlvbnMgb2YgYW4gZW1wdHkgb2JqZWN0XG4gICAgPGNvZGU+e308L2NvZGU+LiAgVGhpcyBvYmplY3QgaXMgZnJvemVuIHNvIGl0IGlzIHNhZmUgdG8gc2hhcmUuXG5cbiAgICBAb2JqZWN0IGV4dGVybmFsOk9iamVjdC5lbXB0eVxuKi9cbk9iamVjdC5lbXB0eSA9IE9iamVjdC5mcmVlemUoT2JqZWN0LmNyZWF0ZShudWxsKSk7XG5cbi8qKlxuICAgIFJldHVybnMgd2hldGhlciB0aGUgZ2l2ZW4gdmFsdWUgaXMgYW4gb2JqZWN0LCBhcyBvcHBvc2VkIHRvIGEgdmFsdWUuXG4gICAgVW5ib3hlZCBudW1iZXJzLCBzdHJpbmdzLCB0cnVlLCBmYWxzZSwgdW5kZWZpbmVkLCBhbmQgbnVsbCBhcmUgbm90XG4gICAgb2JqZWN0cy4gIEFycmF5cyBhcmUgb2JqZWN0cy5cblxuICAgIEBmdW5jdGlvbiBleHRlcm5hbDpPYmplY3QuaXNPYmplY3RcbiAgICBAcGFyYW0ge0FueX0gdmFsdWVcbiAgICBAcmV0dXJucyB7Qm9vbGVhbn0gd2hldGhlciB0aGUgZ2l2ZW4gdmFsdWUgaXMgYW4gb2JqZWN0XG4qL1xuT2JqZWN0LmlzT2JqZWN0ID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIHJldHVybiBPYmplY3Qob2JqZWN0KSA9PT0gb2JqZWN0O1xufTtcblxuLyoqXG4gICAgUmV0dXJucyB0aGUgdmFsdWUgb2YgYW4gYW55IHZhbHVlLCBwYXJ0aWN1bGFybHkgb2JqZWN0cyB0aGF0XG4gICAgaW1wbGVtZW50IDxjb2RlPnZhbHVlT2Y8L2NvZGU+LlxuXG4gICAgPHA+Tm90ZSB0aGF0LCB1bmxpa2UgdGhlIHByZWNlZGVudCBvZiBtZXRob2RzIGxpa2VcbiAgICA8Y29kZT5PYmplY3QuZXF1YWxzPC9jb2RlPiBhbmQgPGNvZGU+T2JqZWN0LmNvbXBhcmU8L2NvZGU+IHdvdWxkIHN1Z2dlc3QsXG4gICAgdGhpcyBtZXRob2QgaXMgbmFtZWQgPGNvZGU+T2JqZWN0LmdldFZhbHVlT2Y8L2NvZGU+IGluc3RlYWQgb2ZcbiAgICA8Y29kZT52YWx1ZU9mPC9jb2RlPi4gIFRoaXMgaXMgYSBkZWxpY2F0ZSBpc3N1ZSwgYnV0IHRoZSBiYXNpcyBvZiB0aGlzXG4gICAgZGVjaXNpb24gaXMgdGhhdCB0aGUgSmF2YVNjcmlwdCBydW50aW1lIHdvdWxkIGJlIGZhciBtb3JlIGxpa2VseSB0b1xuICAgIGFjY2lkZW50YWxseSBjYWxsIHRoaXMgbWV0aG9kIHdpdGggbm8gYXJndW1lbnRzLCBhc3N1bWluZyB0aGF0IGl0IHdvdWxkXG4gICAgcmV0dXJuIHRoZSB2YWx1ZSBvZiA8Y29kZT5PYmplY3Q8L2NvZGU+IGl0c2VsZiBpbiB2YXJpb3VzIHNpdHVhdGlvbnMsXG4gICAgd2hlcmVhcyA8Y29kZT5PYmplY3QuZXF1YWxzKE9iamVjdCwgbnVsbCk8L2NvZGU+IHByb3RlY3RzIGFnYWluc3QgdGhpcyBjYXNlXG4gICAgYnkgbm90aW5nIHRoYXQgPGNvZGU+T2JqZWN0PC9jb2RlPiBvd25zIHRoZSA8Y29kZT5lcXVhbHM8L2NvZGU+IHByb3BlcnR5XG4gICAgYW5kIHRoZXJlZm9yZSBkb2VzIG5vdCBkZWxlZ2F0ZSB0byBpdC5cblxuICAgIEBmdW5jdGlvbiBleHRlcm5hbDpPYmplY3QuZ2V0VmFsdWVPZlxuICAgIEBwYXJhbSB7QW55fSB2YWx1ZSBhIHZhbHVlIG9yIG9iamVjdCB3cmFwcGluZyBhIHZhbHVlXG4gICAgQHJldHVybnMge0FueX0gdGhlIHByaW1pdGl2ZSB2YWx1ZSBvZiB0aGF0IG9iamVjdCwgaWYgb25lIGV4aXN0cywgb3IgcGFzc2VzXG4gICAgdGhlIHZhbHVlIHRocm91Z2hcbiovXG5PYmplY3QuZ2V0VmFsdWVPZiA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmIChPYmplY3QuY2FuKHZhbHVlLCBcInZhbHVlT2ZcIikpIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS52YWx1ZU9mKCk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbn07XG5cbnZhciBoYXNoTWFwID0gbmV3IFdlYWtNYXAoKTtcbk9iamVjdC5oYXNoID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIGlmIChPYmplY3QuY2FuKG9iamVjdCwgXCJoYXNoXCIpKSB7XG4gICAgICAgIHJldHVybiBcIlwiICsgb2JqZWN0Lmhhc2goKTtcbiAgICB9IGVsc2UgaWYgKE9iamVjdChvYmplY3QpID09PSBvYmplY3QpIHtcbiAgICAgICAgaWYgKCFoYXNoTWFwLmhhcyhvYmplY3QpKSB7XG4gICAgICAgICAgICBoYXNoTWFwLnNldChvYmplY3QsIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaGFzaE1hcC5nZXQob2JqZWN0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gXCJcIiArIG9iamVjdDtcbiAgICB9XG59O1xuXG4vKipcbiAgICBBIHNob3J0aGFuZCBmb3IgPGNvZGU+T2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCxcbiAgICBrZXkpPC9jb2RlPi4gIFJldHVybnMgd2hldGhlciB0aGUgb2JqZWN0IG93bnMgYSBwcm9wZXJ0eSBmb3IgdGhlIGdpdmVuIGtleS5cbiAgICBJdCBkb2VzIG5vdCBjb25zdWx0IHRoZSBwcm90b3R5cGUgY2hhaW4gYW5kIHdvcmtzIGZvciBhbnkgc3RyaW5nIChpbmNsdWRpbmdcbiAgICBcImhhc093blByb3BlcnR5XCIpIGV4Y2VwdCBcIl9fcHJvdG9fX1wiLlxuXG4gICAgQGZ1bmN0aW9uIGV4dGVybmFsOk9iamVjdC5vd25zXG4gICAgQHBhcmFtIHtPYmplY3R9IG9iamVjdFxuICAgIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAgICBAcmV0dXJucyB7Qm9vbGVhbn0gd2hldGhlciB0aGUgb2JqZWN0IG93bnMgYSBwcm9wZXJ0eSB3Zm9yIHRoZSBnaXZlbiBrZXkuXG4qL1xudmFyIG93bnMgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuT2JqZWN0Lm93bnMgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXkpIHtcbiAgICByZXR1cm4gb3ducy5jYWxsKG9iamVjdCwga2V5KTtcbn07XG5cbi8qKlxuICAgIFJldHVybnMgd2hldGhlciBhIHZhbHVlIGltcGxlbWVudHMgYSBwYXJ0aWN1bGFyIGR1Y2stdHlwZSBtZXRob2QuXG5cbiAgICA8cD5UbyBxdWFsaWZ5IGFzIGEgZHVjay10eXBlIG1ldGhvZCwgdGhlIHZhbHVlIGluIHF1ZXN0aW9uIG11c3QgaGF2ZSBhXG4gICAgbWV0aG9kIGJ5IHRoZSBnaXZlbiBuYW1lIG9uIHRoZSBwcm90b3R5cGUgY2hhaW4uICBUbyBkaXN0aW5ndWlzaCBpdCBmcm9tXG4gICAgYSBwcm9wZXJ0eSBvZiBhbiBvYmplY3QgbGl0ZXJhbCwgdGhlIHByb3BlcnR5IG11c3Qgbm90IGJlIG93bmVkIGJ5IHRoZVxuICAgIG9iamVjdCBkaXJlY3RseS5cblxuICAgIDxwPkEgdmFsdWUgdGhhdCBpbXBsZW1lbnRzIGEgbWV0aG9kIGlzIG5vdCBuZWNlc3NhcmlseSBhbiBvYmplY3QsIGZvclxuICAgIGV4YW1wbGUsIG51bWJlcnMgaW1wbGVtZW50IDxjb2RlPnZhbHVlT2Y8L2NvZGU+LCBzbyB0aGlzIGlzIGZ1bmN0aW9uXG4gICAgZG9lcyBub3QgaW1wbHkgPGNvZGU+T2JqZWN0LmlzT2JqZWN0PC9jb2RlPiBvZiB0aGUgc2FtZSB2YWx1ZS5cblxuICAgIEBmdW5jdGlvbiBleHRlcm5hbDpPYmplY3QuY2FuXG4gICAgQHBhcmFtIHtBbnl9IHZhbHVlIGEgdmFsdWVcbiAgICBAcGFyYW0ge1N0cmluZ30gbmFtZSBhIG1ldGhvZCBuYW1lXG4gICAgQHJldHVybnMge0Jvb2xlYW59IHdoZXRoZXIgdGhlIGdpdmVuIHZhbHVlIGltcGxlbWVudHMgdGhlIGdpdmVuIG1ldGhvZFxuXG4qL1xuT2JqZWN0LmNhbiA9IGZ1bmN0aW9uIChvYmplY3QsIG5hbWUpIHtcbiAgICByZXR1cm4gKFxuICAgICAgICBvYmplY3QgIT0gbnVsbCAmJiAvLyBmYWxzZSBvbmx5IGZvciBudWxsICphbmQqIHVuZGVmaW5lZFxuICAgICAgICB0eXBlb2Ygb2JqZWN0W25hbWVdID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgICAgIW93bnMuY2FsbChvYmplY3QsIG5hbWUpXG4gICAgKTtcbn07XG5cbi8qKlxuICAgIEEgdXRpbGl0eSB0aGF0IGlzIGxpa2UgT2JqZWN0Lm93bnMgYnV0IGlzIGFsc28gdXNlZnVsIGZvciBmaW5kaW5nXG4gICAgcHJvcGVydGllcyBvbiB0aGUgcHJvdG90eXBlIGNoYWluLCBwcm92aWRlZCB0aGF0IHRoZXkgZG8gbm90IHJlZmVyIHRvXG4gICAgbWV0aG9kcyBvbiB0aGUgT2JqZWN0IHByb3RvdHlwZS4gIFdvcmtzIGZvciBhbGwgc3RyaW5ncyBleGNlcHQgXCJfX3Byb3RvX19cIi5cblxuICAgIDxwPkFsdGVybmF0ZWx5LCB5b3UgY291bGQgdXNlIHRoZSBcImluXCIgb3BlcmF0b3IgYXMgbG9uZyBhcyB0aGUgb2JqZWN0XG4gICAgZGVzY2VuZHMgZnJvbSBcIm51bGxcIiBpbnN0ZWFkIG9mIHRoZSBPYmplY3QucHJvdG90eXBlLCBhcyB3aXRoXG4gICAgPGNvZGU+T2JqZWN0LmNyZWF0ZShudWxsKTwvY29kZT4uICBIb3dldmVyLFxuICAgIDxjb2RlPk9iamVjdC5jcmVhdGUobnVsbCk8L2NvZGU+IG9ubHkgd29ya3MgaW4gZnVsbHkgY29tcGxpYW50IEVjbWFTY3JpcHQgNVxuICAgIEphdmFTY3JpcHQgZW5naW5lcyBhbmQgY2Fubm90IGJlIGZhaXRoZnVsbHkgc2hpbW1lZC5cblxuICAgIDxwPklmIHRoZSBnaXZlbiBvYmplY3QgaXMgYW4gaW5zdGFuY2Ugb2YgYSB0eXBlIHRoYXQgaW1wbGVtZW50cyBhIG1ldGhvZFxuICAgIG5hbWVkIFwiaGFzXCIsIHRoaXMgZnVuY3Rpb24gZGVmZXJzIHRvIHRoZSBjb2xsZWN0aW9uLCBzbyB0aGlzIG1ldGhvZCBjYW4gYmVcbiAgICB1c2VkIHRvIGdlbmVyaWNhbGx5IGhhbmRsZSBvYmplY3RzLCBhcnJheXMsIG9yIG90aGVyIGNvbGxlY3Rpb25zLiAgSW4gdGhhdFxuICAgIGNhc2UsIHRoZSBkb21haW4gb2YgdGhlIGtleSBkZXBlbmRzIG9uIHRoZSBpbnN0YW5jZS5cblxuICAgIEBwYXJhbSB7T2JqZWN0fSBvYmplY3RcbiAgICBAcGFyYW0ge1N0cmluZ30ga2V5XG4gICAgQHJldHVybnMge0Jvb2xlYW59IHdoZXRoZXIgdGhlIG9iamVjdCwgb3IgYW55IG9mIGl0cyBwcm90b3R5cGVzIGV4Y2VwdFxuICAgIDxjb2RlPk9iamVjdC5wcm90b3R5cGU8L2NvZGU+XG4gICAgQGZ1bmN0aW9uIGV4dGVybmFsOk9iamVjdC5oYXNcbiovXG5PYmplY3QuaGFzID0gZnVuY3Rpb24gKG9iamVjdCwga2V5KSB7XG4gICAgaWYgKHR5cGVvZiBvYmplY3QgIT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT2JqZWN0LmhhcyBjYW4ndCBhY2NlcHQgbm9uLW9iamVjdDogXCIgKyB0eXBlb2Ygb2JqZWN0KTtcbiAgICB9XG4gICAgLy8gZm9yd2FyZCB0byBtYXBwZWQgY29sbGVjdGlvbnMgdGhhdCBpbXBsZW1lbnQgXCJoYXNcIlxuICAgIGlmIChPYmplY3QuY2FuKG9iamVjdCwgXCJoYXNcIikpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdC5oYXMoa2V5KTtcbiAgICAvLyBvdGhlcndpc2UgcmVwb3J0IHdoZXRoZXIgdGhlIGtleSBpcyBvbiB0aGUgcHJvdG90eXBlIGNoYWluLFxuICAgIC8vIGFzIGxvbmcgYXMgaXQgaXMgbm90IG9uZSBvZiB0aGUgbWV0aG9kcyBvbiBvYmplY3QucHJvdG90eXBlXG4gICAgfSBlbHNlIGlmICh0eXBlb2Yga2V5ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHJldHVybiBrZXkgaW4gb2JqZWN0ICYmIG9iamVjdFtrZXldICE9PSBPYmplY3QucHJvdG90eXBlW2tleV07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiS2V5IG11c3QgYmUgYSBzdHJpbmcgZm9yIE9iamVjdC5oYXMgb24gcGxhaW4gb2JqZWN0c1wiKTtcbiAgICB9XG59O1xuXG4vKipcbiAgICBHZXRzIHRoZSB2YWx1ZSBmb3IgYSBjb3JyZXNwb25kaW5nIGtleSBmcm9tIGFuIG9iamVjdC5cblxuICAgIDxwPlVzZXMgT2JqZWN0LmhhcyB0byBkZXRlcm1pbmUgd2hldGhlciB0aGVyZSBpcyBhIGNvcnJlc3BvbmRpbmcgdmFsdWUgZm9yXG4gICAgdGhlIGdpdmVuIGtleS4gIEFzIHN1Y2gsIDxjb2RlPk9iamVjdC5nZXQ8L2NvZGU+IGlzIGNhcGFibGUgb2YgcmV0cml2aW5nXG4gICAgdmFsdWVzIGZyb20gdGhlIHByb3RvdHlwZSBjaGFpbiBhcyBsb25nIGFzIHRoZXkgYXJlIG5vdCBmcm9tIHRoZVxuICAgIDxjb2RlPk9iamVjdC5wcm90b3R5cGU8L2NvZGU+LlxuXG4gICAgPHA+SWYgdGhlcmUgaXMgbm8gY29ycmVzcG9uZGluZyB2YWx1ZSwgcmV0dXJucyB0aGUgZ2l2ZW4gZGVmYXVsdCwgd2hpY2ggbWF5XG4gICAgYmUgPGNvZGU+dW5kZWZpbmVkPC9jb2RlPi5cblxuICAgIDxwPklmIHRoZSBnaXZlbiBvYmplY3QgaXMgYW4gaW5zdGFuY2Ugb2YgYSB0eXBlIHRoYXQgaW1wbGVtZW50cyBhIG1ldGhvZFxuICAgIG5hbWVkIFwiZ2V0XCIsIHRoaXMgZnVuY3Rpb24gZGVmZXJzIHRvIHRoZSBjb2xsZWN0aW9uLCBzbyB0aGlzIG1ldGhvZCBjYW4gYmVcbiAgICB1c2VkIHRvIGdlbmVyaWNhbGx5IGhhbmRsZSBvYmplY3RzLCBhcnJheXMsIG9yIG90aGVyIGNvbGxlY3Rpb25zLiAgSW4gdGhhdFxuICAgIGNhc2UsIHRoZSBkb21haW4gb2YgdGhlIGtleSBkZXBlbmRzIG9uIHRoZSBpbXBsZW1lbnRhdGlvbi4gIEZvciBhIGBNYXBgLFxuICAgIGZvciBleGFtcGxlLCB0aGUga2V5IG1pZ2h0IGJlIGFueSBvYmplY3QuXG5cbiAgICBAcGFyYW0ge09iamVjdH0gb2JqZWN0XG4gICAgQHBhcmFtIHtTdHJpbmd9IGtleVxuICAgIEBwYXJhbSB7QW55fSB2YWx1ZSBhIGRlZmF1bHQgdG8gcmV0dXJuLCA8Y29kZT51bmRlZmluZWQ8L2NvZGU+IGlmIG9taXR0ZWRcbiAgICBAcmV0dXJucyB7QW55fSB2YWx1ZSBmb3Iga2V5LCBvciBkZWZhdWx0IHZhbHVlXG4gICAgQGZ1bmN0aW9uIGV4dGVybmFsOk9iamVjdC5nZXRcbiovXG5PYmplY3QuZ2V0ID0gZnVuY3Rpb24gKG9iamVjdCwga2V5LCB2YWx1ZSkge1xuICAgIGlmICh0eXBlb2Ygb2JqZWN0ICE9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk9iamVjdC5nZXQgY2FuJ3QgYWNjZXB0IG5vbi1vYmplY3Q6IFwiICsgdHlwZW9mIG9iamVjdCk7XG4gICAgfVxuICAgIC8vIGZvcndhcmQgdG8gbWFwcGVkIGNvbGxlY3Rpb25zIHRoYXQgaW1wbGVtZW50IFwiZ2V0XCJcbiAgICBpZiAoT2JqZWN0LmNhbihvYmplY3QsIFwiZ2V0XCIpKSB7XG4gICAgICAgIHJldHVybiBvYmplY3QuZ2V0KGtleSwgdmFsdWUpO1xuICAgIH0gZWxzZSBpZiAoT2JqZWN0LmhhcyhvYmplY3QsIGtleSkpIHtcbiAgICAgICAgcmV0dXJuIG9iamVjdFtrZXldO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG59O1xuXG4vKipcbiAgICBTZXRzIHRoZSB2YWx1ZSBmb3IgYSBnaXZlbiBrZXkgb24gYW4gb2JqZWN0LlxuXG4gICAgPHA+SWYgdGhlIGdpdmVuIG9iamVjdCBpcyBhbiBpbnN0YW5jZSBvZiBhIHR5cGUgdGhhdCBpbXBsZW1lbnRzIGEgbWV0aG9kXG4gICAgbmFtZWQgXCJzZXRcIiwgdGhpcyBmdW5jdGlvbiBkZWZlcnMgdG8gdGhlIGNvbGxlY3Rpb24sIHNvIHRoaXMgbWV0aG9kIGNhbiBiZVxuICAgIHVzZWQgdG8gZ2VuZXJpY2FsbHkgaGFuZGxlIG9iamVjdHMsIGFycmF5cywgb3Igb3RoZXIgY29sbGVjdGlvbnMuICBBcyBzdWNoLFxuICAgIHRoZSBrZXkgZG9tYWluIHZhcmllcyBieSB0aGUgb2JqZWN0IHR5cGUuXG5cbiAgICBAcGFyYW0ge09iamVjdH0gb2JqZWN0XG4gICAgQHBhcmFtIHtTdHJpbmd9IGtleVxuICAgIEBwYXJhbSB7QW55fSB2YWx1ZVxuICAgIEByZXR1cm5zIDxjb2RlPnVuZGVmaW5lZDwvY29kZT5cbiAgICBAZnVuY3Rpb24gZXh0ZXJuYWw6T2JqZWN0LnNldFxuKi9cbk9iamVjdC5zZXQgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXksIHZhbHVlKSB7XG4gICAgaWYgKE9iamVjdC5jYW4ob2JqZWN0LCBcInNldFwiKSkge1xuICAgICAgICBvYmplY3Quc2V0KGtleSwgdmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG9iamVjdFtrZXldID0gdmFsdWU7XG4gICAgfVxufTtcblxuT2JqZWN0LmFkZEVhY2ggPSBmdW5jdGlvbiAodGFyZ2V0LCBzb3VyY2UpIHtcbiAgICBpZiAoIXNvdXJjZSkge1xuICAgIH0gZWxzZSBpZiAoT2JqZWN0LmNhbihzb3VyY2UsIFwiZm9yRWFjaFwiKSkge1xuICAgICAgICAvLyBjb3B5IG1hcC1hbGlrZXNcbiAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2Uua2V5cyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBzb3VyY2UuZm9yRWFjaChmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgLy8gaXRlcmF0ZSBrZXkgdmFsdWUgcGFpcnMgb2Ygb3RoZXIgaXRlcmFibGVzXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzb3VyY2UuZm9yRWFjaChmdW5jdGlvbiAocGFpcikge1xuICAgICAgICAgICAgICAgIHRhcmdldFtwYWlyWzBdXSA9IHBhaXJbMV07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGNvcHkgb3RoZXIgb2JqZWN0cyBhcyBtYXAtYWxpa2VzXG4gICAgICAgIE9iamVjdC5rZXlzKHNvdXJjZSkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbn07XG5cbi8qKlxuICAgIEl0ZXJhdGVzIG92ZXIgdGhlIG93bmVkIHByb3BlcnRpZXMgb2YgYW4gb2JqZWN0LlxuXG4gICAgQGZ1bmN0aW9uIGV4dGVybmFsOk9iamVjdC5mb3JFYWNoXG4gICAgQHBhcmFtIHtPYmplY3R9IG9iamVjdCBhbiBvYmplY3QgdG8gaXRlcmF0ZS5cbiAgICBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBhIGZ1bmN0aW9uIHRvIGNhbGwgZm9yIGV2ZXJ5IGtleSBhbmQgdmFsdWVcbiAgICBwYWlyIGluIHRoZSBvYmplY3QuICBSZWNlaXZlcyA8Y29kZT52YWx1ZTwvY29kZT4sIDxjb2RlPmtleTwvY29kZT4sXG4gICAgYW5kIDxjb2RlPm9iamVjdDwvY29kZT4gYXMgYXJndW1lbnRzLlxuICAgIEBwYXJhbSB7T2JqZWN0fSB0aGlzcCB0aGUgPGNvZGU+dGhpczwvY29kZT4gdG8gcGFzcyB0aHJvdWdoIHRvIHRoZVxuICAgIGNhbGxiYWNrXG4qL1xuT2JqZWN0LmZvckVhY2ggPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaywgdGhpc3ApIHtcbiAgICBPYmplY3Qua2V5cyhvYmplY3QpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNwLCBvYmplY3Rba2V5XSwga2V5LCBvYmplY3QpO1xuICAgIH0pO1xufTtcblxuLyoqXG4gICAgSXRlcmF0ZXMgb3ZlciB0aGUgb3duZWQgcHJvcGVydGllcyBvZiBhIG1hcCwgY29uc3RydWN0aW5nIGEgbmV3IGFycmF5IG9mXG4gICAgbWFwcGVkIHZhbHVlcy5cblxuICAgIEBmdW5jdGlvbiBleHRlcm5hbDpPYmplY3QubWFwXG4gICAgQHBhcmFtIHtPYmplY3R9IG9iamVjdCBhbiBvYmplY3QgdG8gaXRlcmF0ZS5cbiAgICBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBhIGZ1bmN0aW9uIHRvIGNhbGwgZm9yIGV2ZXJ5IGtleSBhbmQgdmFsdWVcbiAgICBwYWlyIGluIHRoZSBvYmplY3QuICBSZWNlaXZlcyA8Y29kZT52YWx1ZTwvY29kZT4sIDxjb2RlPmtleTwvY29kZT4sXG4gICAgYW5kIDxjb2RlPm9iamVjdDwvY29kZT4gYXMgYXJndW1lbnRzLlxuICAgIEBwYXJhbSB7T2JqZWN0fSB0aGlzcCB0aGUgPGNvZGU+dGhpczwvY29kZT4gdG8gcGFzcyB0aHJvdWdoIHRvIHRoZVxuICAgIGNhbGxiYWNrXG4gICAgQHJldHVybnMge0FycmF5fSB0aGUgcmVzcGVjdGl2ZSB2YWx1ZXMgcmV0dXJuZWQgYnkgdGhlIGNhbGxiYWNrIGZvciBlYWNoXG4gICAgaXRlbSBpbiB0aGUgb2JqZWN0LlxuKi9cbk9iamVjdC5tYXAgPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaywgdGhpc3ApIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMob2JqZWN0KS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2suY2FsbCh0aGlzcCwgb2JqZWN0W2tleV0sIGtleSwgb2JqZWN0KTtcbiAgICB9KTtcbn07XG5cbi8qKlxuICAgIFJldHVybnMgdGhlIHZhbHVlcyBmb3Igb3duZWQgcHJvcGVydGllcyBvZiBhbiBvYmplY3QuXG5cbiAgICBAZnVuY3Rpb24gZXh0ZXJuYWw6T2JqZWN0Lm1hcFxuICAgIEBwYXJhbSB7T2JqZWN0fSBvYmplY3RcbiAgICBAcmV0dXJucyB7QXJyYXl9IHRoZSByZXNwZWN0aXZlIHZhbHVlIGZvciBlYWNoIG93bmVkIHByb3BlcnR5IG9mIHRoZVxuICAgIG9iamVjdC5cbiovXG5PYmplY3QudmFsdWVzID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIHJldHVybiBPYmplY3QubWFwKG9iamVjdCwgRnVuY3Rpb24uaWRlbnRpdHkpO1xufTtcblxuLy8gVE9ETyBpbmxpbmUgZG9jdW1lbnQgY29uY2F0XG5PYmplY3QuY29uY2F0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBvYmplY3QgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBPYmplY3QuYWRkRWFjaChvYmplY3QsIGFyZ3VtZW50c1tpXSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3Q7XG59O1xuXG5PYmplY3QuZnJvbSA9IE9iamVjdC5jb25jYXQ7XG5cbi8qKlxuICAgIFJldHVybnMgd2hldGhlciB0d28gdmFsdWVzIGFyZSBpZGVudGljYWwuICBBbnkgdmFsdWUgaXMgaWRlbnRpY2FsIHRvIGl0c2VsZlxuICAgIGFuZCBvbmx5IGl0c2VsZi4gIFRoaXMgaXMgbXVjaCBtb3JlIHJlc3RpY3RpdmUgdGhhbiBlcXVpdmFsZW5jZSBhbmQgc3VidGx5XG4gICAgZGlmZmVyZW50IHRoYW4gc3RyaWN0IGVxdWFsaXR5LCA8Y29kZT49PT08L2NvZGU+IGJlY2F1c2Ugb2YgZWRnZSBjYXNlc1xuICAgIGluY2x1ZGluZyBuZWdhdGl2ZSB6ZXJvIGFuZCA8Y29kZT5OYU48L2NvZGU+LiAgSWRlbnRpdHkgaXMgdXNlZnVsIGZvclxuICAgIHJlc29sdmluZyBjb2xsaXNpb25zIGFtb25nIGtleXMgaW4gYSBtYXBwaW5nIHdoZXJlIHRoZSBkb21haW4gaXMgYW55IHZhbHVlLlxuICAgIFRoaXMgbWV0aG9kIGRvZXMgbm90IGRlbGdhdGUgdG8gYW55IG1ldGhvZCBvbiBhbiBvYmplY3QgYW5kIGNhbm5vdCBiZVxuICAgIG92ZXJyaWRkZW4uXG4gICAgQHNlZSBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmVnYWxcbiAgICBAcGFyYW0ge0FueX0gdGhpc1xuICAgIEBwYXJhbSB7QW55fSB0aGF0XG4gICAgQHJldHVybnMge0Jvb2xlYW59IHdoZXRoZXIgdGhpcyBhbmQgdGhhdCBhcmUgaWRlbnRpY2FsXG4gICAgQGZ1bmN0aW9uIGV4dGVybmFsOk9iamVjdC5pc1xuKi9cbk9iamVjdC5pcyA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgaWYgKHggPT09IHkpIHtcbiAgICAgICAgLy8gMCA9PT0gLTAsIGJ1dCB0aGV5IGFyZSBub3QgaWRlbnRpY2FsXG4gICAgICAgIHJldHVybiB4ICE9PSAwIHx8IDEgLyB4ID09PSAxIC8geTtcbiAgICB9XG4gICAgLy8gTmFOICE9PSBOYU4sIGJ1dCB0aGV5IGFyZSBpZGVudGljYWwuXG4gICAgLy8gTmFOcyBhcmUgdGhlIG9ubHkgbm9uLXJlZmxleGl2ZSB2YWx1ZSwgaS5lLiwgaWYgeCAhPT0geCxcbiAgICAvLyB0aGVuIHggaXMgYSBOYU4uXG4gICAgLy8gaXNOYU4gaXMgYnJva2VuOiBpdCBjb252ZXJ0cyBpdHMgYXJndW1lbnQgdG8gbnVtYmVyLCBzb1xuICAgIC8vIGlzTmFOKFwiZm9vXCIpID0+IHRydWVcbiAgICByZXR1cm4geCAhPT0geCAmJiB5ICE9PSB5O1xufTtcblxuLyoqXG4gICAgUGVyZm9ybXMgYSBwb2x5bW9ycGhpYywgdHlwZS1zZW5zaXRpdmUgZGVlcCBlcXVpdmFsZW5jZSBjb21wYXJpc29uIG9mIGFueVxuICAgIHR3byB2YWx1ZXMuXG5cbiAgICA8cD5BcyBhIGJhc2ljIHByaW5jaXBsZSwgYW55IHZhbHVlIGlzIGVxdWl2YWxlbnQgdG8gaXRzZWxmIChhcyBpblxuICAgIGlkZW50aXR5KSwgYW55IGJveGVkIHZlcnNpb24gb2YgaXRzZWxmIChhcyBhIDxjb2RlPm5ldyBOdW1iZXIoMTApPC9jb2RlPiBpc1xuICAgIHRvIDEwKSwgYW5kIGFueSBkZWVwIGNsb25lIG9mIGl0c2VsZi5cblxuICAgIDxwPkVxdWl2YWxlbmNlIGhhcyB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG5cbiAgICA8dWw+XG4gICAgICAgIDxsaT48c3Ryb25nPnBvbHltb3JwaGljOjwvc3Ryb25nPlxuICAgICAgICAgICAgSWYgdGhlIGdpdmVuIG9iamVjdCBpcyBhbiBpbnN0YW5jZSBvZiBhIHR5cGUgdGhhdCBpbXBsZW1lbnRzIGFcbiAgICAgICAgICAgIG1ldGhvZHMgbmFtZWQgXCJlcXVhbHNcIiwgdGhpcyBmdW5jdGlvbiBkZWZlcnMgdG8gdGhlIG1ldGhvZC4gIFNvLFxuICAgICAgICAgICAgdGhpcyBmdW5jdGlvbiBjYW4gc2FmZWx5IGNvbXBhcmUgYW55IHZhbHVlcyByZWdhcmRsZXNzIG9mIHR5cGUsXG4gICAgICAgICAgICBpbmNsdWRpbmcgdW5kZWZpbmVkLCBudWxsLCBudW1iZXJzLCBzdHJpbmdzLCBhbnkgcGFpciBvZiBvYmplY3RzXG4gICAgICAgICAgICB3aGVyZSBlaXRoZXIgaW1wbGVtZW50cyBcImVxdWFsc1wiLCBvciBvYmplY3QgbGl0ZXJhbHMgdGhhdCBtYXkgZXZlblxuICAgICAgICAgICAgY29udGFpbiBhbiBcImVxdWFsc1wiIGtleS5cbiAgICAgICAgPGxpPjxzdHJvbmc+dHlwZS1zZW5zaXRpdmU6PC9zdHJvbmc+XG4gICAgICAgICAgICBJbmNvbXBhcmFibGUgdHlwZXMgYXJlIG5vdCBlcXVhbC4gIE5vIG9iamVjdCBpcyBlcXVpdmFsZW50IHRvIGFueVxuICAgICAgICAgICAgYXJyYXkuICBObyBzdHJpbmcgaXMgZXF1YWwgdG8gYW55IG90aGVyIG51bWJlci5cbiAgICAgICAgPGxpPjxzdHJvbmc+ZGVlcDo8L3N0cm9uZz5cbiAgICAgICAgICAgIENvbGxlY3Rpb25zIHdpdGggZXF1aXZhbGVudCBjb250ZW50IGFyZSBlcXVpdmFsZW50LCByZWN1cnNpdmVseS5cbiAgICAgICAgPGxpPjxzdHJvbmc+ZXF1aXZhbGVuY2U6PC9zdHJvbmc+XG4gICAgICAgICAgICBJZGVudGljYWwgdmFsdWVzIGFuZCBvYmplY3RzIGFyZSBlcXVpdmFsZW50LCBidXQgc28gYXJlIGNvbGxlY3Rpb25zXG4gICAgICAgICAgICB0aGF0IGNvbnRhaW4gZXF1aXZhbGVudCBjb250ZW50LiAgV2hldGhlciBvcmRlciBpcyBpbXBvcnRhbnQgdmFyaWVzXG4gICAgICAgICAgICBieSB0eXBlLiAgRm9yIEFycmF5cyBhbmQgbGlzdHMsIG9yZGVyIGlzIGltcG9ydGFudC4gIEZvciBPYmplY3RzLFxuICAgICAgICAgICAgbWFwcywgYW5kIHNldHMsIG9yZGVyIGlzIG5vdCBpbXBvcnRhbnQuICBCb3hlZCBvYmplY3RzIGFyZSBtdXRhbGx5XG4gICAgICAgICAgICBlcXVpdmFsZW50IHdpdGggdGhlaXIgdW5ib3hlZCB2YWx1ZXMsIGJ5IHZpcnR1ZSBvZiB0aGUgc3RhbmRhcmRcbiAgICAgICAgICAgIDxjb2RlPnZhbHVlT2Y8L2NvZGU+IG1ldGhvZC5cbiAgICA8L3VsPlxuICAgIEBwYXJhbSB0aGlzXG4gICAgQHBhcmFtIHRoYXRcbiAgICBAcmV0dXJucyB7Qm9vbGVhbn0gd2hldGhlciB0aGUgdmFsdWVzIGFyZSBkZWVwbHkgZXF1aXZhbGVudFxuICAgIEBmdW5jdGlvbiBleHRlcm5hbDpPYmplY3QuZXF1YWxzXG4qL1xuT2JqZWN0LmVxdWFscyA9IGZ1bmN0aW9uIChhLCBiLCBlcXVhbHMpIHtcbiAgICBlcXVhbHMgPSBlcXVhbHMgfHwgT2JqZWN0LmVxdWFscztcbiAgICAvLyB1bmJveCBvYmplY3RzLCBidXQgZG8gbm90IGNvbmZ1c2Ugb2JqZWN0IGxpdGVyYWxzXG4gICAgYSA9IE9iamVjdC5nZXRWYWx1ZU9mKGEpO1xuICAgIGIgPSBPYmplY3QuZ2V0VmFsdWVPZihiKTtcbiAgICBpZiAoYSA9PT0gYilcbiAgICAgICAgLy8gMCA9PT0gLTAsIGJ1dCB0aGV5IGFyZSBub3QgZXF1YWxcbiAgICAgICAgcmV0dXJuIGEgIT09IDAgfHwgMSAvIGEgPT09IDEgLyBiO1xuICAgIGlmIChhID09PSBudWxsIHx8IGIgPT09IG51bGwpXG4gICAgICAgIHJldHVybiBhID09PSBiO1xuICAgIGlmIChPYmplY3QuY2FuKGEsIFwiZXF1YWxzXCIpKVxuICAgICAgICByZXR1cm4gYS5lcXVhbHMoYiwgZXF1YWxzKTtcbiAgICAvLyBjb21tdXRhdGl2ZVxuICAgIGlmIChPYmplY3QuY2FuKGIsIFwiZXF1YWxzXCIpKVxuICAgICAgICByZXR1cm4gYi5lcXVhbHMoYSwgZXF1YWxzKTtcbiAgICBpZiAodHlwZW9mIGEgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIGIgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgdmFyIGFQcm90b3R5cGUgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoYSk7XG4gICAgICAgIHZhciBiUHJvdG90eXBlID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKGIpO1xuICAgICAgICBpZiAoXG4gICAgICAgICAgICBhUHJvdG90eXBlID09PSBiUHJvdG90eXBlICYmIChcbiAgICAgICAgICAgICAgICBhUHJvdG90eXBlID09PSBPYmplY3QucHJvdG90eXBlIHx8XG4gICAgICAgICAgICAgICAgYVByb3RvdHlwZSA9PT0gbnVsbFxuICAgICAgICAgICAgKVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBhKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFlcXVhbHMoYVtrZXldLCBiW2tleV0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gYikge1xuICAgICAgICAgICAgICAgIGlmICghZXF1YWxzKGFba2V5XSwgYltrZXldKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gTmFOICE9PSBOYU4sIGJ1dCB0aGV5IGFyZSBlcXVhbC5cbiAgICAvLyBOYU5zIGFyZSB0aGUgb25seSBub24tcmVmbGV4aXZlIHZhbHVlLCBpLmUuLCBpZiB4ICE9PSB4LFxuICAgIC8vIHRoZW4geCBpcyBhIE5hTi5cbiAgICAvLyBpc05hTiBpcyBicm9rZW46IGl0IGNvbnZlcnRzIGl0cyBhcmd1bWVudCB0byBudW1iZXIsIHNvXG4gICAgLy8gaXNOYU4oXCJmb29cIikgPT4gdHJ1ZVxuICAgIHJldHVybiBhICE9PSBhICYmIGIgIT09IGI7XG59O1xuXG4vLyBCZWNhdXNlIGEgcmV0dXJuIHZhbHVlIG9mIDAgZnJvbSBhIGBjb21wYXJlYCBmdW5jdGlvbiAgbWF5IG1lYW4gZWl0aGVyXG4vLyBcImVxdWFsc1wiIG9yIFwiaXMgaW5jb21wYXJhYmxlXCIsIGBlcXVhbHNgIGNhbm5vdCBiZSBkZWZpbmVkIGluIHRlcm1zIG9mXG4vLyBgY29tcGFyZWAuICBIb3dldmVyLCBgY29tcGFyZWAgKmNhbiogYmUgZGVmaW5lZCBpbiB0ZXJtcyBvZiBgZXF1YWxzYCBhbmRcbi8vIGBsZXNzVGhhbmAuICBBZ2FpbiBob3dldmVyLCBtb3JlIG9mdGVuIGl0IHdvdWxkIGJlIGRlc2lyYWJsZSB0byBpbXBsZW1lbnRcbi8vIGFsbCBvZiB0aGUgY29tcGFyaXNvbiBmdW5jdGlvbnMgaW4gdGVybXMgb2YgY29tcGFyZSByYXRoZXIgdGhhbiB0aGUgb3RoZXJcbi8vIHdheSBhcm91bmQuXG5cbi8qKlxuICAgIERldGVybWluZXMgdGhlIG9yZGVyIGluIHdoaWNoIGFueSB0d28gb2JqZWN0cyBzaG91bGQgYmUgc29ydGVkIGJ5IHJldHVybmluZ1xuICAgIGEgbnVtYmVyIHRoYXQgaGFzIGFuIGFuYWxvZ291cyByZWxhdGlvbnNoaXAgdG8gemVybyBhcyB0aGUgbGVmdCB2YWx1ZSB0b1xuICAgIHRoZSByaWdodC4gIFRoYXQgaXMsIGlmIHRoZSBsZWZ0IGlzIFwibGVzcyB0aGFuXCIgdGhlIHJpZ2h0LCB0aGUgcmV0dXJuZWRcbiAgICB2YWx1ZSB3aWxsIGJlIFwibGVzcyB0aGFuXCIgemVybywgd2hlcmUgXCJsZXNzIHRoYW5cIiBtYXkgYmUgYW55IG90aGVyXG4gICAgdHJhbnNpdGl2ZSByZWxhdGlvbnNoaXAuXG5cbiAgICA8cD5BcnJheXMgYXJlIGNvbXBhcmVkIGJ5IHRoZSBmaXJzdCBkaXZlcmdpbmcgdmFsdWVzLCBvciBieSBsZW5ndGguXG5cbiAgICA8cD5BbnkgdHdvIHZhbHVlcyB0aGF0IGFyZSBpbmNvbXBhcmFibGUgcmV0dXJuIHplcm8uICBBcyBzdWNoLFxuICAgIDxjb2RlPmVxdWFsczwvY29kZT4gc2hvdWxkIG5vdCBiZSBpbXBsZW1lbnRlZCB3aXRoIDxjb2RlPmNvbXBhcmU8L2NvZGU+XG4gICAgc2luY2UgaW5jb21wYXJhYmlsaXR5IGlzIGluZGlzdGluZ3Vpc2hhYmxlIGZyb20gZXF1YWxpdHkuXG5cbiAgICA8cD5Tb3J0cyBzdHJpbmdzIGxleGljb2dyYXBoaWNhbGx5LiAgVGhpcyBpcyBub3Qgc3VpdGFibGUgZm9yIGFueVxuICAgIHBhcnRpY3VsYXIgaW50ZXJuYXRpb25hbCBzZXR0aW5nLiAgRGlmZmVyZW50IGxvY2FsZXMgc29ydCB0aGVpciBwaG9uZSBib29rc1xuICAgIGluIHZlcnkgZGlmZmVyZW50IHdheXMsIHBhcnRpY3VsYXJseSByZWdhcmRpbmcgZGlhY3JpdGljcyBhbmQgbGlnYXR1cmVzLlxuXG4gICAgPHA+SWYgdGhlIGdpdmVuIG9iamVjdCBpcyBhbiBpbnN0YW5jZSBvZiBhIHR5cGUgdGhhdCBpbXBsZW1lbnRzIGEgbWV0aG9kXG4gICAgbmFtZWQgXCJjb21wYXJlXCIsIHRoaXMgZnVuY3Rpb24gZGVmZXJzIHRvIHRoZSBpbnN0YW5jZS4gIFRoZSBtZXRob2QgZG9lcyBub3RcbiAgICBuZWVkIHRvIGJlIGFuIG93bmVkIHByb3BlcnR5IHRvIGRpc3Rpbmd1aXNoIGl0IGZyb20gYW4gb2JqZWN0IGxpdGVyYWwgc2luY2VcbiAgICBvYmplY3QgbGl0ZXJhbHMgYXJlIGluY29tcGFyYWJsZS4gIFVubGlrZSA8Y29kZT5PYmplY3Q8L2NvZGU+IGhvd2V2ZXIsXG4gICAgPGNvZGU+QXJyYXk8L2NvZGU+IGltcGxlbWVudHMgPGNvZGU+Y29tcGFyZTwvY29kZT4uXG5cbiAgICBAcGFyYW0ge0FueX0gbGVmdFxuICAgIEBwYXJhbSB7QW55fSByaWdodFxuICAgIEByZXR1cm5zIHtOdW1iZXJ9IGEgdmFsdWUgaGF2aW5nIHRoZSBzYW1lIHRyYW5zaXRpdmUgcmVsYXRpb25zaGlwIHRvIHplcm9cbiAgICBhcyB0aGUgbGVmdCBhbmQgcmlnaHQgdmFsdWVzLlxuICAgIEBmdW5jdGlvbiBleHRlcm5hbDpPYmplY3QuY29tcGFyZVxuKi9cbk9iamVjdC5jb21wYXJlID0gZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAvLyB1bmJveCBvYmplY3RzLCBidXQgZG8gbm90IGNvbmZ1c2Ugb2JqZWN0IGxpdGVyYWxzXG4gICAgLy8gbWVyY2lmdWxseSBoYW5kbGVzIHRoZSBEYXRlIGNhc2VcbiAgICBhID0gT2JqZWN0LmdldFZhbHVlT2YoYSk7XG4gICAgYiA9IE9iamVjdC5nZXRWYWx1ZU9mKGIpO1xuICAgIHZhciBhVHlwZSA9IHR5cGVvZiBhO1xuICAgIHZhciBiVHlwZSA9IHR5cGVvZiBiO1xuICAgIGlmIChhID09PSBiKVxuICAgICAgICByZXR1cm4gMDtcbiAgICBpZiAoYVR5cGUgIT09IGJUeXBlKVxuICAgICAgICByZXR1cm4gMDtcbiAgICBpZiAoYVR5cGUgPT09IFwibnVtYmVyXCIpXG4gICAgICAgIHJldHVybiBhIC0gYjtcbiAgICBpZiAoYVR5cGUgPT09IFwic3RyaW5nXCIpXG4gICAgICAgIHJldHVybiBhIDwgYiA/IC0xIDogMTtcbiAgICAgICAgLy8gdGhlIHBvc3NpYmlsaXR5IG9mIGVxdWFsaXR5IGVsaW1pYXRlZCBhYm92ZVxuICAgIGlmIChPYmplY3QuY2FuKGEsIFwiY29tcGFyZVwiKSlcbiAgICAgICAgcmV0dXJuIGEuY29tcGFyZShiKTtcbiAgICAvLyBub3QgY29tbXV0YXRpdmUsIHRoZSByZWxhdGlvbnNoaXAgaXMgcmV2ZXJzZWRcbiAgICBpZiAoT2JqZWN0LmNhbihiLCBcImNvbXBhcmVcIikpXG4gICAgICAgIHJldHVybiAtYi5jb21wYXJlKGEpO1xuICAgIHJldHVybiAwO1xufTtcblxuLyoqXG4gICAgQ3JlYXRlcyBhIGRlZXAgY29weSBvZiBhbnkgdmFsdWUuICBWYWx1ZXMsIGJlaW5nIGltbXV0YWJsZSwgYXJlXG4gICAgcmV0dXJuZWQgd2l0aG91dCBhbHRlcm5hdGlvbi4gIEZvcndhcmRzIHRvIDxjb2RlPmNsb25lPC9jb2RlPiBvblxuICAgIG9iamVjdHMgYW5kIGFycmF5cy5cblxuICAgIEBmdW5jdGlvbiBleHRlcm5hbDpPYmplY3QuY2xvbmVcbiAgICBAcGFyYW0ge0FueX0gdmFsdWUgYSB2YWx1ZSB0byBjbG9uZVxuICAgIEBwYXJhbSB7TnVtYmVyfSBkZXB0aCBhbiBvcHRpb25hbCB0cmF2ZXJzYWwgZGVwdGgsIGRlZmF1bHRzIHRvIGluZmluaXR5LlxuICAgIEEgdmFsdWUgb2YgPGNvZGU+MDwvY29kZT4gbWVhbnMgdG8gbWFrZSBubyBjbG9uZSBhbmQgcmV0dXJuIHRoZSB2YWx1ZVxuICAgIGRpcmVjdGx5LlxuICAgIEBwYXJhbSB7TWFwfSBtZW1vIGFuIG9wdGlvbmFsIG1lbW8gb2YgYWxyZWFkeSB2aXNpdGVkIG9iamVjdHMgdG8gcHJlc2VydmVcbiAgICByZWZlcmVuY2UgY3ljbGVzLiAgVGhlIGNsb25lZCBvYmplY3Qgd2lsbCBoYXZlIHRoZSBleGFjdCBzYW1lIHNoYXBlIGFzIHRoZVxuICAgIG9yaWdpbmFsLCBidXQgbm8gaWRlbnRpY2FsIG9iamVjdHMuICBUZSBtYXAgbWF5IGJlIGxhdGVyIHVzZWQgdG8gYXNzb2NpYXRlXG4gICAgYWxsIG9iamVjdHMgaW4gdGhlIG9yaWdpbmFsIG9iamVjdCBncmFwaCB3aXRoIHRoZWlyIGNvcnJlc3BvbmRpbmcgbWVtYmVyIG9mXG4gICAgdGhlIGNsb25lZCBncmFwaC5cbiAgICBAcmV0dXJucyBhIGNvcHkgb2YgdGhlIHZhbHVlXG4qL1xuT2JqZWN0LmNsb25lID0gZnVuY3Rpb24gKHZhbHVlLCBkZXB0aCwgbWVtbykge1xuICAgIHZhbHVlID0gT2JqZWN0LmdldFZhbHVlT2YodmFsdWUpO1xuICAgIG1lbW8gPSBtZW1vIHx8IG5ldyBXZWFrTWFwKCk7XG4gICAgaWYgKGRlcHRoID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZGVwdGggPSBJbmZpbml0eTtcbiAgICB9IGVsc2UgaWYgKGRlcHRoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgaWYgKE9iamVjdC5pc09iamVjdCh2YWx1ZSkpIHtcbiAgICAgICAgaWYgKCFtZW1vLmhhcyh2YWx1ZSkpIHtcbiAgICAgICAgICAgIGlmIChPYmplY3QuY2FuKHZhbHVlLCBcImNsb25lXCIpKSB7XG4gICAgICAgICAgICAgICAgbWVtby5zZXQodmFsdWUsIHZhbHVlLmNsb25lKGRlcHRoLCBtZW1vKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBwcm90b3R5cGUgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmIChwcm90b3R5cGUgPT09IG51bGwgfHwgcHJvdG90eXBlID09PSBPYmplY3QucHJvdG90eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjbG9uZSA9IE9iamVjdC5jcmVhdGUocHJvdG90eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgbWVtby5zZXQodmFsdWUsIGNsb25lKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbG9uZVtrZXldID0gT2JqZWN0LmNsb25lKHZhbHVlW2tleV0sIGRlcHRoIC0gMSwgbWVtbyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBjbG9uZSBcIiArIHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1lbW8uZ2V0KHZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xufTtcblxuLyoqXG4gICAgUmVtb3ZlcyBhbGwgcHJvcGVydGllcyBvd25lZCBieSB0aGlzIG9iamVjdCBtYWtpbmcgdGhlIG9iamVjdCBzdWl0YWJsZSBmb3JcbiAgICByZXVzZS5cblxuICAgIEBmdW5jdGlvbiBleHRlcm5hbDpPYmplY3QuY2xlYXJcbiAgICBAcmV0dXJucyB0aGlzXG4qL1xuT2JqZWN0LmNsZWFyID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIGlmIChPYmplY3QuY2FuKG9iamVjdCwgXCJjbGVhclwiKSkge1xuICAgICAgICBvYmplY3QuY2xlYXIoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iamVjdCksXG4gICAgICAgICAgICBpID0ga2V5cy5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChpKSB7XG4gICAgICAgICAgICBpLS07XG4gICAgICAgICAgICBkZWxldGUgb2JqZWN0W2tleXNbaV1dO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmplY3Q7XG59O1xuXG4iLCJcbi8qKlxuICAgIGFjY2VwdHMgYSBzdHJpbmc7IHJldHVybnMgdGhlIHN0cmluZyB3aXRoIHJlZ2V4IG1ldGFjaGFyYWN0ZXJzIGVzY2FwZWQuXG4gICAgdGhlIHJldHVybmVkIHN0cmluZyBjYW4gc2FmZWx5IGJlIHVzZWQgd2l0aGluIGEgcmVnZXggdG8gbWF0Y2ggYSBsaXRlcmFsXG4gICAgc3RyaW5nLiBlc2NhcGVkIGNoYXJhY3RlcnMgYXJlIFssIF0sIHssIH0sICgsICksIC0sICosICssID8sIC4sIFxcLCBeLCAkLFxuICAgIHwsICMsIFtjb21tYV0sIGFuZCB3aGl0ZXNwYWNlLlxuKi9cbmlmICghUmVnRXhwLmVzY2FwZSkge1xuICAgIHZhciBzcGVjaWFsID0gL1stW1xcXXt9KCkqKz8uXFxcXF4kfCwjXFxzXS9nO1xuICAgIFJlZ0V4cC5lc2NhcGUgPSBmdW5jdGlvbiAoc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBzdHJpbmcucmVwbGFjZShzcGVjaWFsLCBcIlxcXFwkJlwiKTtcbiAgICB9O1xufVxuXG4iLCJcbnZhciBBcnJheSA9IHJlcXVpcmUoXCIuL3NoaW0tYXJyYXlcIik7XG52YXIgT2JqZWN0ID0gcmVxdWlyZShcIi4vc2hpbS1vYmplY3RcIik7XG52YXIgRnVuY3Rpb24gPSByZXF1aXJlKFwiLi9zaGltLWZ1bmN0aW9uXCIpO1xudmFyIFJlZ0V4cCA9IHJlcXVpcmUoXCIuL3NoaW0tcmVnZXhwXCIpO1xuXG4iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBUcmVlTG9nO1xuXG5mdW5jdGlvbiBUcmVlTG9nKCkge1xufVxuXG5UcmVlTG9nLmFzY2lpID0ge1xuICAgIGludGVyc2VjdGlvbjogXCIrXCIsXG4gICAgdGhyb3VnaDogXCItXCIsXG4gICAgYnJhbmNoVXA6IFwiK1wiLFxuICAgIGJyYW5jaERvd246IFwiK1wiLFxuICAgIGZyb21CZWxvdzogXCIuXCIsXG4gICAgZnJvbUFib3ZlOiBcIidcIixcbiAgICBmcm9tQm90aDogXCIrXCIsXG4gICAgc3RyYWZlOiBcInxcIlxufTtcblxuVHJlZUxvZy51bmljb2RlUm91bmQgPSB7XG4gICAgaW50ZXJzZWN0aW9uOiBcIlxcdTI1NGJcIixcbiAgICB0aHJvdWdoOiBcIlxcdTI1MDFcIixcbiAgICBicmFuY2hVcDogXCJcXHUyNTNiXCIsXG4gICAgYnJhbmNoRG93bjogXCJcXHUyNTMzXCIsXG4gICAgZnJvbUJlbG93OiBcIlxcdTI1NmRcIiwgLy8gcm91bmQgY29ybmVyXG4gICAgZnJvbUFib3ZlOiBcIlxcdTI1NzBcIiwgLy8gcm91bmQgY29ybmVyXG4gICAgZnJvbUJvdGg6IFwiXFx1MjUyM1wiLFxuICAgIHN0cmFmZTogXCJcXHUyNTAzXCJcbn07XG5cblRyZWVMb2cudW5pY29kZVNoYXJwID0ge1xuICAgIGludGVyc2VjdGlvbjogXCJcXHUyNTRiXCIsXG4gICAgdGhyb3VnaDogXCJcXHUyNTAxXCIsXG4gICAgYnJhbmNoVXA6IFwiXFx1MjUzYlwiLFxuICAgIGJyYW5jaERvd246IFwiXFx1MjUzM1wiLFxuICAgIGZyb21CZWxvdzogXCJcXHUyNTBmXCIsIC8vIHNoYXJwIGNvcm5lclxuICAgIGZyb21BYm92ZTogXCJcXHUyNTE3XCIsIC8vIHNoYXJwIGNvcm5lclxuICAgIGZyb21Cb3RoOiBcIlxcdTI1MjNcIixcbiAgICBzdHJhZmU6IFwiXFx1MjUwM1wiXG59O1xuXG4iLCJ2YXIgZ2xvYmFsPXR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fTtcbnZhciBybmc7XG5cbmlmIChnbG9iYWwuY3J5cHRvICYmIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMpIHtcbiAgLy8gV0hBVFdHIGNyeXB0by1iYXNlZCBSTkcgLSBodHRwOi8vd2lraS53aGF0d2cub3JnL3dpa2kvQ3J5cHRvXG4gIC8vIE1vZGVyYXRlbHkgZmFzdCwgaGlnaCBxdWFsaXR5XG4gIHZhciBfcm5kczggPSBuZXcgVWludDhBcnJheSgxNik7XG4gIHJuZyA9IGZ1bmN0aW9uIHdoYXR3Z1JORygpIHtcbiAgICBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKF9ybmRzOCk7XG4gICAgcmV0dXJuIF9ybmRzODtcbiAgfTtcbn1cblxuaWYgKCFybmcpIHtcbiAgLy8gTWF0aC5yYW5kb20oKS1iYXNlZCAoUk5HKVxuICAvL1xuICAvLyBJZiBhbGwgZWxzZSBmYWlscywgdXNlIE1hdGgucmFuZG9tKCkuICBJdCdzIGZhc3QsIGJ1dCBpcyBvZiB1bnNwZWNpZmllZFxuICAvLyBxdWFsaXR5LlxuICB2YXIgIF9ybmRzID0gbmV3IEFycmF5KDE2KTtcbiAgcm5nID0gZnVuY3Rpb24oKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIHI7IGkgPCAxNjsgaSsrKSB7XG4gICAgICBpZiAoKGkgJiAweDAzKSA9PT0gMCkgciA9IE1hdGgucmFuZG9tKCkgKiAweDEwMDAwMDAwMDtcbiAgICAgIF9ybmRzW2ldID0gciA+Pj4gKChpICYgMHgwMykgPDwgMykgJiAweGZmO1xuICAgIH1cblxuICAgIHJldHVybiBfcm5kcztcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBybmc7XG5cbiIsInZhciBCdWZmZXI9cmVxdWlyZShcIl9fYnJvd3NlcmlmeV9CdWZmZXJcIik7Ly8gICAgIHV1aWQuanNcbi8vXG4vLyAgICAgQ29weXJpZ2h0IChjKSAyMDEwLTIwMTIgUm9iZXJ0IEtpZWZmZXJcbi8vICAgICBNSVQgTGljZW5zZSAtIGh0dHA6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5waHBcblxuLy8gVW5pcXVlIElEIGNyZWF0aW9uIHJlcXVpcmVzIGEgaGlnaCBxdWFsaXR5IHJhbmRvbSAjIGdlbmVyYXRvci4gIFdlIGZlYXR1cmVcbi8vIGRldGVjdCB0byBkZXRlcm1pbmUgdGhlIGJlc3QgUk5HIHNvdXJjZSwgbm9ybWFsaXppbmcgdG8gYSBmdW5jdGlvbiB0aGF0XG4vLyByZXR1cm5zIDEyOC1iaXRzIG9mIHJhbmRvbW5lc3MsIHNpbmNlIHRoYXQncyB3aGF0J3MgdXN1YWxseSByZXF1aXJlZFxudmFyIF9ybmcgPSByZXF1aXJlKCcuL3JuZycpO1xuXG4vLyBCdWZmZXIgY2xhc3MgdG8gdXNlXG52YXIgQnVmZmVyQ2xhc3MgPSB0eXBlb2YoQnVmZmVyKSA9PSAnZnVuY3Rpb24nID8gQnVmZmVyIDogQXJyYXk7XG5cbi8vIE1hcHMgZm9yIG51bWJlciA8LT4gaGV4IHN0cmluZyBjb252ZXJzaW9uXG52YXIgX2J5dGVUb0hleCA9IFtdO1xudmFyIF9oZXhUb0J5dGUgPSB7fTtcbmZvciAodmFyIGkgPSAwOyBpIDwgMjU2OyBpKyspIHtcbiAgX2J5dGVUb0hleFtpXSA9IChpICsgMHgxMDApLnRvU3RyaW5nKDE2KS5zdWJzdHIoMSk7XG4gIF9oZXhUb0J5dGVbX2J5dGVUb0hleFtpXV0gPSBpO1xufVxuXG4vLyAqKmBwYXJzZSgpYCAtIFBhcnNlIGEgVVVJRCBpbnRvIGl0J3MgY29tcG9uZW50IGJ5dGVzKipcbmZ1bmN0aW9uIHBhcnNlKHMsIGJ1Ziwgb2Zmc2V0KSB7XG4gIHZhciBpID0gKGJ1ZiAmJiBvZmZzZXQpIHx8IDAsIGlpID0gMDtcblxuICBidWYgPSBidWYgfHwgW107XG4gIHMudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bMC05YS1mXXsyfS9nLCBmdW5jdGlvbihvY3QpIHtcbiAgICBpZiAoaWkgPCAxNikgeyAvLyBEb24ndCBvdmVyZmxvdyFcbiAgICAgIGJ1ZltpICsgaWkrK10gPSBfaGV4VG9CeXRlW29jdF07XG4gICAgfVxuICB9KTtcblxuICAvLyBaZXJvIG91dCByZW1haW5pbmcgYnl0ZXMgaWYgc3RyaW5nIHdhcyBzaG9ydFxuICB3aGlsZSAoaWkgPCAxNikge1xuICAgIGJ1ZltpICsgaWkrK10gPSAwO1xuICB9XG5cbiAgcmV0dXJuIGJ1Zjtcbn1cblxuLy8gKipgdW5wYXJzZSgpYCAtIENvbnZlcnQgVVVJRCBieXRlIGFycmF5IChhbGEgcGFyc2UoKSkgaW50byBhIHN0cmluZyoqXG5mdW5jdGlvbiB1bnBhcnNlKGJ1Ziwgb2Zmc2V0KSB7XG4gIHZhciBpID0gb2Zmc2V0IHx8IDAsIGJ0aCA9IF9ieXRlVG9IZXg7XG4gIHJldHVybiAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICsgJy0nICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArICctJyArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gKyAnLScgK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICsgJy0nICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dO1xufVxuXG4vLyAqKmB2MSgpYCAtIEdlbmVyYXRlIHRpbWUtYmFzZWQgVVVJRCoqXG4vL1xuLy8gSW5zcGlyZWQgYnkgaHR0cHM6Ly9naXRodWIuY29tL0xpb3NLL1VVSUQuanNcbi8vIGFuZCBodHRwOi8vZG9jcy5weXRob24ub3JnL2xpYnJhcnkvdXVpZC5odG1sXG5cbi8vIHJhbmRvbSAjJ3Mgd2UgbmVlZCB0byBpbml0IG5vZGUgYW5kIGNsb2Nrc2VxXG52YXIgX3NlZWRCeXRlcyA9IF9ybmcoKTtcblxuLy8gUGVyIDQuNSwgY3JlYXRlIGFuZCA0OC1iaXQgbm9kZSBpZCwgKDQ3IHJhbmRvbSBiaXRzICsgbXVsdGljYXN0IGJpdCA9IDEpXG52YXIgX25vZGVJZCA9IFtcbiAgX3NlZWRCeXRlc1swXSB8IDB4MDEsXG4gIF9zZWVkQnl0ZXNbMV0sIF9zZWVkQnl0ZXNbMl0sIF9zZWVkQnl0ZXNbM10sIF9zZWVkQnl0ZXNbNF0sIF9zZWVkQnl0ZXNbNV1cbl07XG5cbi8vIFBlciA0LjIuMiwgcmFuZG9taXplICgxNCBiaXQpIGNsb2Nrc2VxXG52YXIgX2Nsb2Nrc2VxID0gKF9zZWVkQnl0ZXNbNl0gPDwgOCB8IF9zZWVkQnl0ZXNbN10pICYgMHgzZmZmO1xuXG4vLyBQcmV2aW91cyB1dWlkIGNyZWF0aW9uIHRpbWVcbnZhciBfbGFzdE1TZWNzID0gMCwgX2xhc3ROU2VjcyA9IDA7XG5cbi8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYnJvb2ZhL25vZGUtdXVpZCBmb3IgQVBJIGRldGFpbHNcbmZ1bmN0aW9uIHYxKG9wdGlvbnMsIGJ1Ziwgb2Zmc2V0KSB7XG4gIHZhciBpID0gYnVmICYmIG9mZnNldCB8fCAwO1xuICB2YXIgYiA9IGJ1ZiB8fCBbXTtcblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB2YXIgY2xvY2tzZXEgPSBvcHRpb25zLmNsb2Nrc2VxICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmNsb2Nrc2VxIDogX2Nsb2Nrc2VxO1xuXG4gIC8vIFVVSUQgdGltZXN0YW1wcyBhcmUgMTAwIG5hbm8tc2Vjb25kIHVuaXRzIHNpbmNlIHRoZSBHcmVnb3JpYW4gZXBvY2gsXG4gIC8vICgxNTgyLTEwLTE1IDAwOjAwKS4gIEpTTnVtYmVycyBhcmVuJ3QgcHJlY2lzZSBlbm91Z2ggZm9yIHRoaXMsIHNvXG4gIC8vIHRpbWUgaXMgaGFuZGxlZCBpbnRlcm5hbGx5IGFzICdtc2VjcycgKGludGVnZXIgbWlsbGlzZWNvbmRzKSBhbmQgJ25zZWNzJ1xuICAvLyAoMTAwLW5hbm9zZWNvbmRzIG9mZnNldCBmcm9tIG1zZWNzKSBzaW5jZSB1bml4IGVwb2NoLCAxOTcwLTAxLTAxIDAwOjAwLlxuICB2YXIgbXNlY3MgPSBvcHRpb25zLm1zZWNzICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLm1zZWNzIDogbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgLy8gUGVyIDQuMi4xLjIsIHVzZSBjb3VudCBvZiB1dWlkJ3MgZ2VuZXJhdGVkIGR1cmluZyB0aGUgY3VycmVudCBjbG9ja1xuICAvLyBjeWNsZSB0byBzaW11bGF0ZSBoaWdoZXIgcmVzb2x1dGlvbiBjbG9ja1xuICB2YXIgbnNlY3MgPSBvcHRpb25zLm5zZWNzICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLm5zZWNzIDogX2xhc3ROU2VjcyArIDE7XG5cbiAgLy8gVGltZSBzaW5jZSBsYXN0IHV1aWQgY3JlYXRpb24gKGluIG1zZWNzKVxuICB2YXIgZHQgPSAobXNlY3MgLSBfbGFzdE1TZWNzKSArIChuc2VjcyAtIF9sYXN0TlNlY3MpLzEwMDAwO1xuXG4gIC8vIFBlciA0LjIuMS4yLCBCdW1wIGNsb2Nrc2VxIG9uIGNsb2NrIHJlZ3Jlc3Npb25cbiAgaWYgKGR0IDwgMCAmJiBvcHRpb25zLmNsb2Nrc2VxID09PSB1bmRlZmluZWQpIHtcbiAgICBjbG9ja3NlcSA9IGNsb2Nrc2VxICsgMSAmIDB4M2ZmZjtcbiAgfVxuXG4gIC8vIFJlc2V0IG5zZWNzIGlmIGNsb2NrIHJlZ3Jlc3NlcyAobmV3IGNsb2Nrc2VxKSBvciB3ZSd2ZSBtb3ZlZCBvbnRvIGEgbmV3XG4gIC8vIHRpbWUgaW50ZXJ2YWxcbiAgaWYgKChkdCA8IDAgfHwgbXNlY3MgPiBfbGFzdE1TZWNzKSAmJiBvcHRpb25zLm5zZWNzID09PSB1bmRlZmluZWQpIHtcbiAgICBuc2VjcyA9IDA7XG4gIH1cblxuICAvLyBQZXIgNC4yLjEuMiBUaHJvdyBlcnJvciBpZiB0b28gbWFueSB1dWlkcyBhcmUgcmVxdWVzdGVkXG4gIGlmIChuc2VjcyA+PSAxMDAwMCkge1xuICAgIHRocm93IG5ldyBFcnJvcigndXVpZC52MSgpOiBDYW5cXCd0IGNyZWF0ZSBtb3JlIHRoYW4gMTBNIHV1aWRzL3NlYycpO1xuICB9XG5cbiAgX2xhc3RNU2VjcyA9IG1zZWNzO1xuICBfbGFzdE5TZWNzID0gbnNlY3M7XG4gIF9jbG9ja3NlcSA9IGNsb2Nrc2VxO1xuXG4gIC8vIFBlciA0LjEuNCAtIENvbnZlcnQgZnJvbSB1bml4IGVwb2NoIHRvIEdyZWdvcmlhbiBlcG9jaFxuICBtc2VjcyArPSAxMjIxOTI5MjgwMDAwMDtcblxuICAvLyBgdGltZV9sb3dgXG4gIHZhciB0bCA9ICgobXNlY3MgJiAweGZmZmZmZmYpICogMTAwMDAgKyBuc2VjcykgJSAweDEwMDAwMDAwMDtcbiAgYltpKytdID0gdGwgPj4+IDI0ICYgMHhmZjtcbiAgYltpKytdID0gdGwgPj4+IDE2ICYgMHhmZjtcbiAgYltpKytdID0gdGwgPj4+IDggJiAweGZmO1xuICBiW2krK10gPSB0bCAmIDB4ZmY7XG5cbiAgLy8gYHRpbWVfbWlkYFxuICB2YXIgdG1oID0gKG1zZWNzIC8gMHgxMDAwMDAwMDAgKiAxMDAwMCkgJiAweGZmZmZmZmY7XG4gIGJbaSsrXSA9IHRtaCA+Pj4gOCAmIDB4ZmY7XG4gIGJbaSsrXSA9IHRtaCAmIDB4ZmY7XG5cbiAgLy8gYHRpbWVfaGlnaF9hbmRfdmVyc2lvbmBcbiAgYltpKytdID0gdG1oID4+PiAyNCAmIDB4ZiB8IDB4MTA7IC8vIGluY2x1ZGUgdmVyc2lvblxuICBiW2krK10gPSB0bWggPj4+IDE2ICYgMHhmZjtcblxuICAvLyBgY2xvY2tfc2VxX2hpX2FuZF9yZXNlcnZlZGAgKFBlciA0LjIuMiAtIGluY2x1ZGUgdmFyaWFudClcbiAgYltpKytdID0gY2xvY2tzZXEgPj4+IDggfCAweDgwO1xuXG4gIC8vIGBjbG9ja19zZXFfbG93YFxuICBiW2krK10gPSBjbG9ja3NlcSAmIDB4ZmY7XG5cbiAgLy8gYG5vZGVgXG4gIHZhciBub2RlID0gb3B0aW9ucy5ub2RlIHx8IF9ub2RlSWQ7XG4gIGZvciAodmFyIG4gPSAwOyBuIDwgNjsgbisrKSB7XG4gICAgYltpICsgbl0gPSBub2RlW25dO1xuICB9XG5cbiAgcmV0dXJuIGJ1ZiA/IGJ1ZiA6IHVucGFyc2UoYik7XG59XG5cbi8vICoqYHY0KClgIC0gR2VuZXJhdGUgcmFuZG9tIFVVSUQqKlxuXG4vLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2Jyb29mYS9ub2RlLXV1aWQgZm9yIEFQSSBkZXRhaWxzXG5mdW5jdGlvbiB2NChvcHRpb25zLCBidWYsIG9mZnNldCkge1xuICAvLyBEZXByZWNhdGVkIC0gJ2Zvcm1hdCcgYXJndW1lbnQsIGFzIHN1cHBvcnRlZCBpbiB2MS4yXG4gIHZhciBpID0gYnVmICYmIG9mZnNldCB8fCAwO1xuXG4gIGlmICh0eXBlb2Yob3B0aW9ucykgPT0gJ3N0cmluZycpIHtcbiAgICBidWYgPSBvcHRpb25zID09ICdiaW5hcnknID8gbmV3IEJ1ZmZlckNsYXNzKDE2KSA6IG51bGw7XG4gICAgb3B0aW9ucyA9IG51bGw7XG4gIH1cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgdmFyIHJuZHMgPSBvcHRpb25zLnJhbmRvbSB8fCAob3B0aW9ucy5ybmcgfHwgX3JuZykoKTtcblxuICAvLyBQZXIgNC40LCBzZXQgYml0cyBmb3IgdmVyc2lvbiBhbmQgYGNsb2NrX3NlcV9oaV9hbmRfcmVzZXJ2ZWRgXG4gIHJuZHNbNl0gPSAocm5kc1s2XSAmIDB4MGYpIHwgMHg0MDtcbiAgcm5kc1s4XSA9IChybmRzWzhdICYgMHgzZikgfCAweDgwO1xuXG4gIC8vIENvcHkgYnl0ZXMgdG8gYnVmZmVyLCBpZiBwcm92aWRlZFxuICBpZiAoYnVmKSB7XG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IDE2OyBpaSsrKSB7XG4gICAgICBidWZbaSArIGlpXSA9IHJuZHNbaWldO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBidWYgfHwgdW5wYXJzZShybmRzKTtcbn1cblxuLy8gRXhwb3J0IHB1YmxpYyBBUElcbnZhciB1dWlkID0gdjQ7XG51dWlkLnYxID0gdjE7XG51dWlkLnY0ID0gdjQ7XG51dWlkLnBhcnNlID0gcGFyc2U7XG51dWlkLnVucGFyc2UgPSB1bnBhcnNlO1xudXVpZC5CdWZmZXJDbGFzcyA9IEJ1ZmZlckNsYXNzO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHV1aWQ7XG4iLCIvLyBQYXJhbXMgYXJlIGNvbnRhaW5lcnMsXG4vLyB3aGljaCBoYXZlIGEgY2xvY2sga2V5IHsgY2xvY2s6IHt9IH1cblxuLy8gaW5jcmVtZW50cyB0aGUgY291bnRlciBmb3Igbm9kZUlkXG5leHBvcnRzLmluY3JlbWVudCA9IGZ1bmN0aW9uKG8sIG5vZGVJZCkge1xuICBpZihvLmNsb2NrKSB7XG4gICAgby5jbG9ja1tub2RlSWRdID0gKHR5cGVvZiBvLmNsb2NrW25vZGVJZF0gPT0gJ3VuZGVmaW5lZCcgPyAxIDogby5jbG9ja1tub2RlSWRdICsgMSk7XG4gIH0gZWxzZSB7XG4gICAgb1tub2RlSWRdID0gKHR5cGVvZiBvW25vZGVJZF0gPT0gJ3VuZGVmaW5lZCcgPyAxIDogb1tub2RlSWRdICsgMSk7XG4gIH1cbiAgcmV0dXJuIG87XG59O1xuXG5mdW5jdGlvbiBhbGxLZXlzKGEsIGIpe1xuICB2YXIgbGFzdCA9IG51bGw7XG4gIHJldHVybiBPYmplY3Qua2V5cyhhKVxuICAgIC5jb25jYXQoT2JqZWN0LmtleXMoYikpXG4gICAgLnNvcnQoKVxuICAgIC5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgLy8gdG8gbWFrZSBhIHNldCBvZiBzb3J0ZWQga2V5cyB1bmlxdWUsIGp1c3QgY2hlY2sgdGhhdCBjb25zZWN1dGl2ZSBrZXlzIGFyZSBkaWZmZXJlbnRcbiAgICAgIHZhciBpc0R1cGxpY2F0ZSA9IChpdGVtID09IGxhc3QpO1xuICAgICAgbGFzdCA9IGl0ZW07XG4gICAgICByZXR1cm4gIWlzRHVwbGljYXRlO1xuICAgIH0pO1xufVxuXG4vLyBsaWtlIGEgcmVndWxhciBzb3J0IGZ1bmN0aW9uLCByZXR1cm5zOlxuLy8gaWYgYSA8IGI6IC0xXG4vLyBpZiBhID09IGI6IDBcbi8vIGlmIGEgPiBiOiAxXG4vLyBFLmcuIGlmIHVzZWQgdG8gc29ydCBhbiBhcnJheSBvZiBrZXlzLCB3aWxsIG9yZGVyIHRoZW0gaW4gYXNjZW5kaW5nIG9yZGVyICgxLCAyLCAzIC4uKVxuZXhwb3J0cy5hc2NTb3J0ID0gZXhwb3J0cy5jb21wYXJlID0gZnVuY3Rpb24oYSwgYikge1xuICB2YXIgaXNHcmVhdGVyID0gZmFsc2UsXG4gICAgICBpc0xlc3MgPSBmYWxzZTtcblxuICAvLyBhbGxvdyB0aGlzIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIG9iamVjdHMgdGhhdCBjb250YWluIGNsb2Nrcywgb3IgdGhlIGNsb2NrcyB0aGVtc2VsdmVzXG4gIGlmKGEuY2xvY2spIGEgPSBhLmNsb2NrO1xuICBpZihiLmNsb2NrKSBiID0gYi5jbG9jaztcblxuICBhbGxLZXlzKGEsIGIpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgdmFyIGRpZmYgPSAoYVtrZXldIHx8IDApIC0gKGJba2V5XSB8fCAwKTtcbiAgICBpZihkaWZmID4gMCkgaXNHcmVhdGVyID0gdHJ1ZTtcbiAgICBpZihkaWZmIDwgMCkgaXNMZXNzID0gdHJ1ZTtcbiAgfSk7XG5cbiAgaWYoaXNHcmVhdGVyICYmIGlzTGVzcykgcmV0dXJuIDA7XG4gIGlmKGlzTGVzcykgcmV0dXJuIC0xO1xuICBpZihpc0dyZWF0ZXIpIHJldHVybiAxO1xuICByZXR1cm4gMDsgLy8gbmVpdGhlciBpcyBzZXQsIHNvIGVxdWFsXG59O1xuXG4vLyBzb3J0IGluIGRlc2NlbmRpbmcgb3JkZXIgKE4sIC4uLiAzLCAyLCAxKVxuZXhwb3J0cy5kZXNjU29ydCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgcmV0dXJuIDAgLSBleHBvcnRzLmFzY1NvcnQoYSwgYik7XG59O1xuXG4vLyBlcXVhbCwgb3Igbm90IGxlc3MgYW5kIG5vdCBncmVhdGVyIHRoYW5cbmV4cG9ydHMuaXNDb25jdXJyZW50ID0gZnVuY3Rpb24oYSwgYikge1xuICByZXR1cm4gISEoZXhwb3J0cy5jb21wYXJlKGEsIGIpID09IDApO1xufTtcblxuLy8gaWRlbnRpY2FsXG5leHBvcnRzLmlzSWRlbnRpY2FsID0gZnVuY3Rpb24oYSwgYikge1xuICAvLyBhbGxvdyB0aGlzIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIG9iamVjdHMgdGhhdCBjb250YWluIGNsb2Nrcywgb3IgdGhlIGNsb2NrcyB0aGVtc2VsdmVzXG4gIGlmKGEuY2xvY2spIGEgPSBhLmNsb2NrO1xuICBpZihiLmNsb2NrKSBiID0gYi5jbG9jaztcblxuICByZXR1cm4gYWxsS2V5cyhhLCBiKS5ldmVyeShmdW5jdGlvbihrZXkpIHtcbiAgICBpZih0eXBlb2YgYVtrZXldID09ICd1bmRlZmluZWQnIHx8IHR5cGVvZiBiW2tleV0gPT0gJ3VuZGVmaW5lZCcpIHJldHVybiBmYWxzZTtcbiAgICB2YXIgZGlmZiA9IGFba2V5XSAtIGJba2V5XTtcbiAgICBpZihkaWZmICE9IDApIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG59O1xuXG5cbi8vIGdpdmVuIHR3byB2ZWN0b3IgY2xvY2tzLCByZXR1cm5zIGEgbmV3IHZlY3RvciBjbG9jayB3aXRoIGFsbCB2YWx1ZXMgZ3JlYXRlciB0aGFuXG4vLyB0aG9zZSBvZiB0aGUgbWVyZ2VkIGNsb2Nrc1xuZXhwb3J0cy5tZXJnZSA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIGxhc3QgPSBudWxsLCByZXN1bHQgPSB7fSwgd2FudENvbnRhaW5lciA9IGZhbHNlO1xuICAvLyBhbGxvdyB0aGlzIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIG9iamVjdHMgdGhhdCBjb250YWluIGNsb2Nrcywgb3IgdGhlIGNsb2NrcyB0aGVtc2VsdmVzXG4gIGlmKGEuY2xvY2sgJiYgYi5jbG9jaykgd2FudENvbnRhaW5lciA9IHRydWU7XG4gIGlmKGEuY2xvY2spIGEgPSBhLmNsb2NrO1xuICBpZihiLmNsb2NrKSBiID0gYi5jbG9jaztcblxuICBhbGxLZXlzKGEsIGIpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgcmVzdWx0W2tleV0gPSBNYXRoLm1heChhW2tleV0gfHwgMCwgYltrZXldIHx8IDApO1xuICB9KTtcbiAgaWYod2FudENvbnRhaW5lcikge1xuICAgIHJldHVybiB7IGNsb2NrOiByZXN1bHQgfTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuZXhwb3J0cy5HVCA9IDE7XG5leHBvcnRzLkxUID0gLTE7XG5leHBvcnRzLkNPTkNVUlJFTlQgPSAwO1xuIiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbi8qIGdsb2JhbCBkb2N1bWVudCwgbG9jYXRpb24sIFByaW11czogZmFsc2UgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIHVybCA9IHJlcXVpcmUoJ3VybCcpO1xudmFyIHJlVHJhaWxpbmdTbGFzaCA9IC9cXC8kLztcblxuLyoqXG4gICMjIyBzaWduYWxsZXIubG9hZFByaW11cyhzaWduYWxob3N0LCBjYWxsYmFjaylcblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNpZ25hbGhvc3QsIGNhbGxiYWNrKSB7XG4gIHZhciBzY3JpcHQ7XG4gIHZhciBiYXNlVXJsO1xuICB2YXIgYmFzZVBhdGg7XG4gIHZhciBzY3JpcHRTcmM7XG5cbiAgLy8gaWYgdGhlIHNpZ25hbGhvc3QgaXMgYSBmdW5jdGlvbiwgd2UgYXJlIGluIHNpbmdsZSBhcmcgY2FsbGluZyBtb2RlXG4gIGlmICh0eXBlb2Ygc2lnbmFsaG9zdCA9PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBzaWduYWxob3N0O1xuICAgIHNpZ25hbGhvc3QgPSBsb2NhdGlvbi5vcmlnaW47XG4gIH1cblxuICAvLyByZWFkIHRoZSBiYXNlIHBhdGhcbiAgYmFzZVVybCA9IHNpZ25hbGhvc3QucmVwbGFjZShyZVRyYWlsaW5nU2xhc2gsICcnKTtcbiAgYmFzZVBhdGggPSB1cmwucGFyc2Uoc2lnbmFsaG9zdCkucGF0aG5hbWU7XG4gIHNjcmlwdFNyYyA9IGJhc2VVcmwgKyAnL3J0Yy5pby9wcmltdXMuanMnO1xuXG4gIC8vIGxvb2sgZm9yIHRoZSBzY3JpcHQgZmlyc3RcbiAgc2NyaXB0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcignc2NyaXB0W3NyYz1cIicgKyBzY3JpcHRTcmMgKyAnXCJdJyk7XG5cbiAgLy8gaWYgd2UgZm91bmQsIHRoZSBzY3JpcHQgdHJpZ2dlciB0aGUgY2FsbGJhY2sgaW1tZWRpYXRlbHlcbiAgaWYgKHNjcmlwdCAmJiB0eXBlb2YgUHJpbXVzICE9ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIFByaW11cyk7XG4gIH1cblxuICAvLyBvdGhlcndpc2UgY3JlYXRlIHRoZSBzY3JpcHQgYW5kIGxvYWQgcHJpbXVzXG4gIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICBzY3JpcHQuc3JjID0gc2NyaXB0U3JjO1xuXG4gIHNjcmlwdC5vbmVycm9yID0gY2FsbGJhY2s7XG4gIHNjcmlwdC5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBpZiB3ZSBoYXZlIGEgc2lnbmFsaG9zdCB0aGF0IGlzIG5vdCBiYXNlcGF0aGVkIGF0IC9cbiAgICAvLyB0aGVuIHR3ZWFrIHRoZSBwcmltdXMgcHJvdG90eXBlXG4gICAgaWYgKGJhc2VQYXRoICE9PSAnLycpIHtcbiAgICAgIFByaW11cy5wcm90b3R5cGUucGF0aG5hbWUgPSBiYXNlUGF0aC5yZXBsYWNlKHJlVHJhaWxpbmdTbGFzaCwgJycpICtcbiAgICAgICAgUHJpbXVzLnByb3RvdHlwZS5wYXRobmFtZTtcbiAgICB9XG5cbiAgICBjYWxsYmFjayhudWxsLCBQcmltdXMpO1xuICB9O1xuXG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc2NyaXB0KTtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpKCdydGMtc2lnbmFsbGVyLXByb2Nlc3NvcicpO1xudmFyIGpzb25wYXJzZSA9IHJlcXVpcmUoJ2NvZy9qc29ucGFyc2UnKTtcbnZhciB2YyA9IHJlcXVpcmUoJ3ZlY3RvcmNsb2NrJyk7XG5cbi8qKlxuICAjIyBzaWduYWxsZXIgcHJvY2VzcyBoYW5kbGluZ1xuXG4gIFdoZW4gYSBzaWduYWxsZXIncyB1bmRlcmxpbmcgbWVzc2VuZ2VyIGVtaXRzIGEgYGRhdGFgIGV2ZW50IHRoaXMgaXNcbiAgZGVsZWdhdGVkIHRvIGEgc2ltcGxlIG1lc3NhZ2UgcGFyc2VyLCB3aGljaCBhcHBsaWVzIHRoZSBmb2xsb3dpbmcgc2ltcGxlXG4gIGxvZ2ljOlxuXG4gIC0gSXMgdGhlIG1lc3NhZ2UgYSBgL3RvYCBtZXNzYWdlLiBJZiBzbywgc2VlIGlmIHRoZSBtZXNzYWdlIGlzIGZvciB0aGlzXG4gICAgc2lnbmFsbGVyIChjaGVja2luZyB0aGUgdGFyZ2V0IGlkIC0gMm5kIGFyZykuICBJZiBzbyBwYXNzIHRoZVxuICAgIHJlbWFpbmRlciBvZiB0aGUgbWVzc2FnZSBvbnRvIHRoZSBzdGFuZGFyZCBwcm9jZXNzaW5nIGNoYWluLiAgSWYgbm90LFxuICAgIGRpc2NhcmQgdGhlIG1lc3NhZ2UuXG5cbiAgLSBJcyB0aGUgbWVzc2FnZSBhIGNvbW1hbmQgbWVzc2FnZSAocHJlZml4ZWQgd2l0aCBhIGZvcndhcmQgc2xhc2gpLiBJZiBzbyxcbiAgICBsb29rIGZvciBhbiBhcHByb3ByaWF0ZSBtZXNzYWdlIGhhbmRsZXIgYW5kIHBhc3MgdGhlIG1lc3NhZ2UgcGF5bG9hZCBvblxuICAgIHRvIGl0LlxuXG4gIC0gRmluYWxseSwgZG9lcyB0aGUgbWVzc2FnZSBtYXRjaCBhbnkgcGF0dGVybnMgdGhhdCB3ZSBhcmUgbGlzdGVuaW5nIGZvcj9cbiAgICBJZiBzbywgdGhlbiBwYXNzIHRoZSBlbnRpcmUgbWVzc2FnZSBjb250ZW50cyBvbnRvIHRoZSByZWdpc3RlcmVkIGhhbmRsZXIuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2lnbmFsbGVyKSB7XG4gIHZhciBoYW5kbGVycyA9IHJlcXVpcmUoJy4vaGFuZGxlcnMnKShzaWduYWxsZXIpO1xuXG4gIGZ1bmN0aW9uIHNlbmRFdmVudChwYXJ0cywgc3JjU3RhdGUsIGRhdGEpIHtcbiAgICAvLyBpbml0aWFsaXNlIHRoZSBldmVudCBuYW1lXG4gICAgdmFyIGV2dE5hbWUgPSBwYXJ0c1swXS5zbGljZSgxKTtcblxuICAgIC8vIGNvbnZlcnQgYW55IHZhbGlkIGpzb24gb2JqZWN0cyB0byBqc29uXG4gICAgdmFyIGFyZ3MgPSBwYXJ0cy5zbGljZSgxKS5tYXAoanNvbnBhcnNlKTtcblxuICAgIHNpZ25hbGxlci5lbWl0LmFwcGx5KFxuICAgICAgc2lnbmFsbGVyLFxuICAgICAgW2V2dE5hbWVdLmNvbmNhdChhcmdzKS5jb25jYXQoW3NyY1N0YXRlLCBkYXRhXSlcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKG9yaWdpbmFsRGF0YSkge1xuICAgIHZhciBpZCA9IHNpZ25hbGxlci5pZDtcbiAgICB2YXIgZGF0YSA9IG9yaWdpbmFsRGF0YTtcbiAgICB2YXIgaXNNYXRjaCA9IHRydWU7XG4gICAgdmFyIHBhcnRzO1xuICAgIHZhciBoYW5kbGVyO1xuICAgIHZhciBzcmNEYXRhO1xuICAgIHZhciBzcmNTdGF0ZTtcblxuICAgIGRlYnVnKCdzaWduYWxsZXIgJyArIHNpZ25hbGxlci5pZCArICcgcmVjZWl2ZWQgZGF0YTogJyArIG9yaWdpbmFsRGF0YSk7XG5cbiAgICAvLyBwcm9jZXNzIC90byBtZXNzYWdlc1xuICAgIGlmIChkYXRhLnNsaWNlKDAsIDMpID09PSAnL3RvJykge1xuICAgICAgaXNNYXRjaCA9IGRhdGEuc2xpY2UoNCwgaWQubGVuZ3RoICsgNCkgPT09IGlkO1xuICAgICAgaWYgKGlzTWF0Y2gpIHtcbiAgICAgICAgcGFydHMgPSBkYXRhLnNsaWNlKDUgKyBpZC5sZW5ndGgpLnNwbGl0KCd8JykubWFwKGpzb25wYXJzZSk7XG5cbiAgICAgICAgLy8gZ2V0IHRoZSBzb3VyY2UgZGF0YVxuICAgICAgICBzcmNEYXRhID0gcGFydHNbMF07XG4gICAgICAgIHNyY1N0YXRlID0gc2lnbmFsbGVyLnBlZXJzLmdldChzcmNEYXRhICYmIHNyY0RhdGEuaWQpO1xuXG4gICAgICAgIC8vIGV4dHJhY3QgdGhlIHZlY3RvciBjbG9jayBhbmQgdXBkYXRlIHRoZSBwYXJ0c1xuICAgICAgICBwYXJ0cyA9IHBhcnRzLnNsaWNlKDEpLm1hcChqc29ucGFyc2UpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGlmIHRoaXMgaXMgbm90IGEgbWF0Y2gsIHRoZW4gYmFpbFxuICAgIGlmICghIGlzTWF0Y2gpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBjaG9wIHRoZSBkYXRhIGludG8gcGFydHNcbiAgICBwYXJ0cyA9IHBhcnRzIHx8IGRhdGEuc3BsaXQoJ3wnKS5tYXAoanNvbnBhcnNlKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYSBzcGVjaWZpYyBoYW5kbGVyIGZvciB0aGUgYWN0aW9uLCB0aGVuIGludm9rZVxuICAgIGlmIChwYXJ0c1swXS5jaGFyQXQoMCkgPT09ICcvJykge1xuICAgICAgLy8gbG9vayBmb3IgYSBoYW5kbGVyIGZvciB0aGUgbWVzc2FnZSB0eXBlXG4gICAgICBoYW5kbGVyID0gaGFuZGxlcnNbcGFydHNbMF0uc2xpY2UoMSldO1xuXG4gICAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBoYW5kbGVyKFxuICAgICAgICAgIHBhcnRzLnNsaWNlKDEpLFxuICAgICAgICAgIHBhcnRzWzBdLnNsaWNlKDEpLFxuICAgICAgICAgIHNyY0RhdGEgJiYgc3JjRGF0YS5jbG9jayxcbiAgICAgICAgICBzcmNTdGF0ZVxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHNlbmRFdmVudChwYXJ0cywgc3JjU3RhdGUsIG9yaWdpbmFsRGF0YSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gaWYgd2UgaGF2ZSBhIGNsb2NrIHZhbHVlIChhbmQgYSBzb3VyY2UgcGVlciksIHRoZW4gbWVyZ2UgdGhlIGNsb2NrXG4gICAgaWYgKHNyY0RhdGEgJiYgc3JjRGF0YS5jbG9jayAmJiBzcmNTdGF0ZSkge1xuICAgICAgc3JjU3RhdGUuY2xvY2sgPSB2Yy5tZXJnZShzcmNTdGF0ZS5jbG9jaywgc3JjRGF0YS5jbG9jayk7XG4gICAgfVxuICB9O1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIFJUQ0ljZUNhbmRpZGF0ZTogZmFsc2UgKi9cbi8qIGdsb2JhbCBSVENTZXNzaW9uRGVzY3JpcHRpb246IGZhbHNlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKSgnY291cGxlJyk7XG52YXIgYXN5bmMgPSByZXF1aXJlKCdhc3luYycpO1xudmFyIG1vbml0b3IgPSByZXF1aXJlKCcuL21vbml0b3InKTtcbnZhciBkZXRlY3QgPSByZXF1aXJlKCcuL2RldGVjdCcpO1xuXG4vKipcbiAgIyMgcnRjL2NvdXBsZVxuXG4gICMjIyBjb3VwbGUocGMsIHRhcmdldElkLCBzaWduYWxsZXIsIG9wdHM/KVxuXG4gIENvdXBsZSBhIFdlYlJUQyBjb25uZWN0aW9uIHdpdGggYW5vdGhlciB3ZWJydGMgY29ubmVjdGlvbiBpZGVudGlmaWVkIGJ5XG4gIGB0YXJnZXRJZGAgdmlhIHRoZSBzaWduYWxsZXIuXG5cbiAgVGhlIGZvbGxvd2luZyBvcHRpb25zIGNhbiBiZSBwcm92aWRlZCBpbiB0aGUgYG9wdHNgIGFyZ3VtZW50OlxuXG4gIC0gYHNkcGZpbHRlcmAgKGRlZmF1bHQ6IG51bGwpXG5cbiAgICBBIHNpbXBsZSBmdW5jdGlvbiBmb3IgZmlsdGVyaW5nIFNEUCBhcyBwYXJ0IG9mIHRoZSBwZWVyXG4gICAgY29ubmVjdGlvbiBoYW5kc2hha2UgKHNlZSB0aGUgVXNpbmcgRmlsdGVycyBkZXRhaWxzIGJlbG93KS5cblxuICAtIGBtYXhBdHRlbXB0c2AgKGRlZmF1bHQ6IDEpXG5cbiAgICBIb3cgbWFueSB0aW1lcyBzaG91bGQgbmVnb3RpYXRpb24gYmUgYXR0ZW1wdGVkLiAgVGhpcyBpc1xuICAgICoqZXhwZXJpbWVudGFsKiogZnVuY3Rpb25hbGl0eSBmb3IgYXR0ZW1wdGluZyBjb25uZWN0aW9uIG5lZ290aWF0aW9uXG4gICAgaWYgaXQgZmFpbHMuXG5cbiAgLSBgYXR0ZW1wdERlbGF5YCAoZGVmYXVsdDogMzAwMClcblxuICAgIFRoZSBhbW91bnQgb2YgbXMgdG8gd2FpdCBiZXR3ZWVuIGNvbm5lY3Rpb24gbmVnb3RpYXRpb24gYXR0ZW1wdHMuXG5cbiAgIyMjIyBFeGFtcGxlIFVzYWdlXG5cbiAgYGBganNcbiAgdmFyIGNvdXBsZSA9IHJlcXVpcmUoJ3J0Yy9jb3VwbGUnKTtcblxuICBjb3VwbGUocGMsICc1NDg3OTk2NS1jZTQzLTQyNmUtYThlZi0wOWFjMWUzOWExNmQnLCBzaWduYWxsZXIpO1xuICBgYGBcblxuICAjIyMjIFVzaW5nIEZpbHRlcnNcblxuICBJbiBjZXJ0YWluIGluc3RhbmNlcyB5b3UgbWF5IHdpc2ggdG8gbW9kaWZ5IHRoZSByYXcgU0RQIHRoYXQgaXMgcHJvdmlkZWRcbiAgYnkgdGhlIGBjcmVhdGVPZmZlcmAgYW5kIGBjcmVhdGVBbnN3ZXJgIGNhbGxzLiAgVGhpcyBjYW4gYmUgZG9uZSBieSBwYXNzaW5nXG4gIGEgYHNkcGZpbHRlcmAgZnVuY3Rpb24gKG9yIGFycmF5KSBpbiB0aGUgb3B0aW9ucy4gIEZvciBleGFtcGxlOlxuXG4gIGBgYGpzXG4gIC8vIHJ1biB0aGUgc2RwIGZyb20gdGhyb3VnaCBhIGxvY2FsIHR3ZWFrU2RwIGZ1bmN0aW9uLlxuICBjb3VwbGUocGMsICc1NDg3OTk2NS1jZTQzLTQyNmUtYThlZi0wOWFjMWUzOWExNmQnLCBzaWduYWxsZXIsIHtcbiAgICBzZHBmaWx0ZXI6IHR3ZWFrU2RwXG4gIH0pO1xuICBgYGBcblxuKiovXG5mdW5jdGlvbiBjb3VwbGUoY29ubiwgdGFyZ2V0SWQsIHNpZ25hbGxlciwgb3B0cykge1xuICAvLyBjcmVhdGUgYSBtb25pdG9yIGZvciB0aGUgY29ubmVjdGlvblxuICB2YXIgbW9uID0gbW9uaXRvcihjb25uKTtcbiAgdmFyIGJsb2NrSWQ7XG4gIHZhciBzdGFnZXMgPSB7fTtcbiAgdmFyIGxvY2FsQ2FuZGlkYXRlcyA9IFtdO1xuICB2YXIgcXVldWVkQ2FuZGlkYXRlcyA9IFtdO1xuICB2YXIgc2RwRmlsdGVyID0gKG9wdHMgfHwge30pLnNkcGZpbHRlcjtcblxuICAvLyByZXRyeSBpbXBsZW1lbnRhdGlvblxuICB2YXIgbWF4QXR0ZW1wdHMgPSAob3B0cyB8fCB7fSkubWF4QXR0ZW1wdHMgfHwgMTtcbiAgdmFyIGF0dGVtcHREZWxheSA9IChvcHRzIHx8IHt9KS5hdHRlbXB0RGVsYXkgfHwgMzAwMDtcbiAgdmFyIGF0dGVtcHQgPSAxO1xuICB2YXIgYXR0ZW1wdFRpbWVyO1xuICB2YXIgb2ZmZXJUaW1lb3V0O1xuXG4gIC8vIGluaXRpbGFpc2UgdGhlIG5lZ290aWF0aW9uIGhlbHBlcnNcbiAgdmFyIGNyZWF0ZU9mZmVyID0gbmVnb3RpYXRlKCdjcmVhdGVPZmZlcicpO1xuICB2YXIgY3JlYXRlQW5zd2VyID0gbmVnb3RpYXRlKCdjcmVhdGVBbnN3ZXInKTtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBwcm9jZXNzaW5nIHF1ZXVlIChvbmUgYXQgYSB0aW1lIHBsZWFzZSlcbiAgdmFyIHEgPSBhc3luYy5xdWV1ZShmdW5jdGlvbih0YXNrLCBjYikge1xuICAgIC8vIGlmIHRoZSB0YXNrIGhhcyBubyBvcGVyYXRpb24sIHRoZW4gdHJpZ2dlciB0aGUgY2FsbGJhY2sgaW1tZWRpYXRlbHlcbiAgICBpZiAodHlwZW9mIHRhc2sub3AgIT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIGNiKCk7XG4gICAgfVxuXG4gICAgLy8gcHJvY2VzcyB0aGUgdGFzayBvcGVyYXRpb25cbiAgICB0YXNrLm9wKHRhc2ssIGNiKTtcbiAgfSwgMSk7XG5cbiAgLy8gaW5pdGlhbGlzZSBzZXNzaW9uIGRlc2NyaXB0aW9uIGFuZCBpY2VjYW5kaWRhdGUgb2JqZWN0c1xuICB2YXIgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uID0gKG9wdHMgfHwge30pLlJUQ1Nlc3Npb25EZXNjcmlwdGlvbiB8fFxuICAgIGRldGVjdCgnUlRDU2Vzc2lvbkRlc2NyaXB0aW9uJyk7XG5cbiAgdmFyIFJUQ0ljZUNhbmRpZGF0ZSA9IChvcHRzIHx8IHt9KS5SVENJY2VDYW5kaWRhdGUgfHxcbiAgICBkZXRlY3QoJ1JUQ0ljZUNhbmRpZGF0ZScpO1xuXG4gIGZ1bmN0aW9uIGFib3J0KHN0YWdlLCBzZHAsIGNiKSB7XG4gICAgdmFyIHN0YWdlSGFuZGxlciA9IHN0YWdlc1tzdGFnZV07XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oZXJyKSB7XG4gICAgICAvLyBsb2cgdGhlIGVycm9yXG4gICAgICBkZWJ1ZygnY2FwdHVyZWQgZXJyb3I6ICcsIGVycik7XG4gICAgICBxLnB1c2goeyBvcDogbG9ja1JlbGVhc2UgfSk7XG5cbiAgICAgIC8vIHJlYXR0ZW1wdCBjb3VwbGluZz9cbiAgICAgIGlmIChzdGFnZUhhbmRsZXIgJiYgYXR0ZW1wdCA8IG1heEF0dGVtcHRzICYmICghIGF0dGVtcHRUaW1lcikpIHtcbiAgICAgICAgYXR0ZW1wdFRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICBhdHRlbXB0ICs9IDE7XG4gICAgICAgICAgYXR0ZW1wdFRpbWVyID0gMDtcblxuICAgICAgICAgIGRlYnVnKCdyZWF0dGVtcHRpbmcgY29ubmVjdGlvbiAoYXR0ZW1wdDogJyArIGF0dGVtcHQgKyAnKScpO1xuICAgICAgICAgIHN0YWdlSGFuZGxlcigpO1xuICAgICAgICB9LCBhdHRlbXB0RGVsYXkpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIGNiID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY2IoZXJyKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gbmVnb3RpYXRlKG1ldGhvZE5hbWUpIHtcbiAgICB2YXIgaHNEZWJ1ZyA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKSgnaGFuZHNoYWtlLScgKyBtZXRob2ROYW1lKTtcblxuICAgIHJldHVybiBmdW5jdGlvbih0YXNrLCBjYikge1xuICAgICAgLy8gY3JlYXRlIHRoZSBvZmZlclxuICAgICAgZGVidWcoJ2NhbGxpbmcgJyArIG1ldGhvZE5hbWUpO1xuICAgICAgY29ublttZXRob2ROYW1lXShcbiAgICAgICAgZnVuY3Rpb24oZGVzYykge1xuXG4gICAgICAgICAgLy8gaWYgYSBmaWx0ZXIgaGFzIGJlZW4gc3BlY2lmaWVkLCB0aGVuIGFwcGx5IHRoZSBmaWx0ZXJcbiAgICAgICAgICBpZiAodHlwZW9mIHNkcEZpbHRlciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBkZXNjLnNkcCA9IHNkcEZpbHRlcihkZXNjLnNkcCwgY29ubiwgbWV0aG9kTmFtZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gaW5pdGlhbGlzZSB0aGUgbG9jYWwgZGVzY3JpcHRpb25cbiAgICAgICAgICBjb25uLnNldExvY2FsRGVzY3JpcHRpb24oXG4gICAgICAgICAgICBkZXNjLFxuXG4gICAgICAgICAgICAvLyBpZiBzdWNjZXNzZnVsLCB0aGVuIHNlbmQgdGhlIHNkcCBvdmVyIHRoZSB3aXJlXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgLy8gc2VuZCB0aGUgc2RwXG4gICAgICAgICAgICAgIHNpZ25hbGxlci50byh0YXJnZXRJZCkuc2VuZCgnL3NkcCcsIGRlc2MpO1xuXG4gICAgICAgICAgICAgIC8vIGNhbGxiYWNrXG4gICAgICAgICAgICAgIGNiKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvLyBvbiBlcnJvciwgYWJvcnRcbiAgICAgICAgICAgIGFib3J0KG1ldGhvZE5hbWUsIGRlc2Muc2RwLCBjYilcbiAgICAgICAgICApO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vIG9uIGVycm9yLCBhYm9ydFxuICAgICAgICBhYm9ydChtZXRob2ROYW1lLCAnJywgY2IpXG4gICAgICApO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVMb2NhbENhbmRpZGF0ZShldnQpIHtcbiAgICBpZiAoZXZ0LmNhbmRpZGF0ZSkge1xuICAgICAgbG9jYWxDYW5kaWRhdGVzLnB1c2goZXZ0LmNhbmRpZGF0ZSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbm4uaWNlR2F0aGVyaW5nU3RhdGUgPT09ICdjb21wbGV0ZScpIHtcbiAgICAgIGRlYnVnKCdpY2UgZ2F0aGVyaW5nIHN0YXRlIGNvbXBsZXRlLCBzZW5kaW5nIGNhbmRpZGF0ZXMnKVxuICAgICAgc2lnbmFsbGVyLnRvKHRhcmdldElkKS5zZW5kKCcvY2FuZGlkYXRlcycsIGxvY2FsQ2FuZGlkYXRlcy5zcGxpY2UoMCkpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZVJlbW90ZUNhbmRpZGF0ZSh0YXJnZXRJZCwgZGF0YSkge1xuICAgIGlmICghIGNvbm4ucmVtb3RlRGVzY3JpcHRpb24pIHtcbiAgICAgIHJldHVybiBxdWV1ZWRDYW5kaWRhdGVzLnB1c2goZGF0YSk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbm4uYWRkSWNlQ2FuZGlkYXRlKG5ldyBSVENJY2VDYW5kaWRhdGUoZGF0YSkpO1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgZGVidWcoJ2ludmFsaWRhdGUgY2FuZGlkYXRlIHNwZWNpZmllZDogJywgZGF0YSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlUmVtb3RlQ2FuZGlkYXRlQXJyYXkoc3JjLCBkYXRhKSB7XG4gICAgaWYgKCghIHNyYykgfHwgKHNyYy5pZCAhPT0gdGFyZ2V0SWQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZGF0YS5mb3JFYWNoKGZ1bmN0aW9uKGNhbmRpZGF0ZSkge1xuICAgICAgaGFuZGxlUmVtb3RlQ2FuZGlkYXRlKHRhcmdldElkLCBjYW5kaWRhdGUpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlU2RwKHNyYywgZGF0YSkge1xuICAgIC8vIGlmIHRoZSBzb3VyY2UgaXMgdW5rbm93biBvciBub3QgYSBtYXRjaCwgdGhlbiBhYm9ydFxuICAgIGlmICgoISBzcmMpIHx8IChzcmMuaWQgIT09IHRhcmdldElkKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIHByaW9yaXRpemUgc2V0dGluZyB0aGUgcmVtb3RlIGRlc2NyaXB0aW9uIG9wZXJhdGlvblxuICAgIHEucHVzaCh7IG9wOiBmdW5jdGlvbih0YXNrLCBjYikge1xuICAgICAgLy8gdXBkYXRlIHRoZSByZW1vdGUgZGVzY3JpcHRpb25cbiAgICAgIC8vIG9uY2Ugc3VjY2Vzc2Z1bCwgc2VuZCB0aGUgYW5zd2VyXG4gICAgICBjb25uLnNldFJlbW90ZURlc2NyaXB0aW9uKFxuICAgICAgICBuZXcgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKGRhdGEpLFxuXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vIGFwcGx5IGFueSBxdWV1ZWQgY2FuZGlkYXRlc1xuICAgICAgICAgIHF1ZXVlZENhbmRpZGF0ZXMuc3BsaWNlKDApLmZvckVhY2goZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgZGVidWcoJ2FwcGx5aW5nIHF1ZXVlZCBjYW5kaWRhdGUnKTtcbiAgICAgICAgICAgIGNvbm4uYWRkSWNlQ2FuZGlkYXRlKG5ldyBSVENJY2VDYW5kaWRhdGUoZGF0YSkpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gY3JlYXRlIHRoZSBhbnN3ZXJcbiAgICAgICAgICBpZiAoZGF0YS50eXBlID09PSAnb2ZmZXInKSB7XG4gICAgICAgICAgICBxdWV1ZShjcmVhdGVBbnN3ZXIpKCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gdHJpZ2dlciB0aGUgY2FsbGJhY2tcbiAgICAgICAgICBjYigpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGFib3J0KGRhdGEudHlwZSA9PT0gJ29mZmVyJyA/ICdjcmVhdGVBbnN3ZXInIDogJ2NyZWF0ZU9mZmVyJywgZGF0YS5zZHAsIGNiKVxuICAgICAgKTtcbiAgICB9fSk7XG4gIH1cblxuICBmdW5jdGlvbiBsb2NrQWNxdWlyZSh0YXNrLCBjYikge1xuICAgIGRlYnVnKCdhdHRlbXB0aW5nIHRvIGFjcXVpcmUgbmVnb3RpYXRlIGxvY2sgd2l0aCB0YXJnZXQ6ICcgKyB0YXJnZXRJZCk7XG4gICAgc2lnbmFsbGVyLmxvY2sodGFyZ2V0SWQsIHsgbGFiZWw6ICduZWdvdGlhdGUnIH0sIGZ1bmN0aW9uKGVycikge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBkZWJ1ZygnZXJyb3IgZ2V0dGluZyBsb2NrLCByZXNldHRpbmcgcXVldWUnKTtcbiAgICAgICAgcXVldWVSZXNldCgpO1xuICAgICAgfVxuXG4gICAgICBjYihlcnIpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gbG9ja1JlbGVhc2UodGFzaywgY2IpIHtcbiAgICBzaWduYWxsZXIudW5sb2NrKHRhcmdldElkLCB7IGxhYmVsOiAnbmVnb3RpYXRlJyB9LCBjYik7XG4gIH1cblxuICBmdW5jdGlvbiBxdWV1ZShuZWdvdGlhdGVUYXNrKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcS5wdXNoKFtcbiAgICAgICAgeyBvcDogbG9ja0FjcXVpcmUgfSxcbiAgICAgICAgeyBvcDogbmVnb3RpYXRlVGFzayB9LFxuICAgICAgICB7IG9wOiBsb2NrUmVsZWFzZSB9XG4gICAgICBdKTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gcXVldWVSZXNldCgpIHtcbiAgICBxLnRhc2tzLnNwbGljZSgwKTtcbiAgfVxuXG4gIC8vIGlmIHRoZSB0YXJnZXQgaWQgaXMgbm90IGEgc3RyaW5nLCB0aGVuIGNvbXBsYWluXG4gIGlmICh0eXBlb2YgdGFyZ2V0SWQgIT0gJ3N0cmluZycgJiYgKCEgKHRhcmdldElkIGluc3RhbmNlb2YgU3RyaW5nKSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJzJuZCBhcmd1bWVudCAodGFyZ2V0SWQpIHNob3VsZCBiZSBhIHN0cmluZycpO1xuICB9XG5cbiAgLy8gd2hlbiByZWdvdGlhdGlvbiBpcyBuZWVkZWQgbG9vayBmb3IgdGhlIHBlZXJcbiAgY29ubi5hZGRFdmVudExpc3RlbmVyKCduZWdvdGlhdGlvbm5lZWRlZCcsIGZ1bmN0aW9uKCkge1xuICAgIGRlYnVnKCdyZW5lZ290aWF0aW9uIHJlcXVpcmVkLCB3aWxsIGNyZWF0ZSBvZmZlciBpbiA1MG1zJyk7XG4gICAgY2xlYXJUaW1lb3V0KG9mZmVyVGltZW91dCk7XG4gICAgb2ZmZXJUaW1lb3V0ID0gc2V0VGltZW91dChxdWV1ZShjcmVhdGVPZmZlciksIDUwKTtcbiAgfSk7XG5cbiAgY29ubi5hZGRFdmVudExpc3RlbmVyKCdpY2VjYW5kaWRhdGUnLCBoYW5kbGVMb2NhbENhbmRpZGF0ZSk7XG5cbiAgLy8gd2hlbiB3ZSByZWNlaXZlIHNkcCwgdGhlblxuICBzaWduYWxsZXIub24oJ3NkcCcsIGhhbmRsZVNkcCk7XG4gIHNpZ25hbGxlci5vbignY2FuZGlkYXRlJywgaGFuZGxlUmVtb3RlQ2FuZGlkYXRlKTtcbiAgc2lnbmFsbGVyLm9uKCdjYW5kaWRhdGVzJywgaGFuZGxlUmVtb3RlQ2FuZGlkYXRlQXJyYXkpO1xuXG4gIC8vIHdoZW4gdGhlIGNvbm5lY3Rpb24gY2xvc2VzLCByZW1vdmUgZXZlbnQgaGFuZGxlcnNcbiAgbW9uLm9uY2UoJ2Nsb3NlZCcsIGZ1bmN0aW9uKCkge1xuICAgIGRlYnVnKCdjbG9zZWQnKTtcblxuICAgIC8vIHJlbW92ZSBsaXN0ZW5lcnNcbiAgICBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIoJ3NkcCcsIGhhbmRsZVNkcCk7XG4gICAgc2lnbmFsbGVyLnJlbW92ZUxpc3RlbmVyKCdjYW5kaWRhdGUnLCBoYW5kbGVSZW1vdGVDYW5kaWRhdGUpO1xuICB9KTtcblxuICAvLyBwYXRjaCBpbiB0aGUgY3JlYXRlIG9mZmVyIGZ1bmN0aW9uc1xuICBtb24uY3JlYXRlT2ZmZXIgPSBxdWV1ZShjcmVhdGVPZmZlcik7XG5cbiAgcmV0dXJuIG1vbjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjb3VwbGU7IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMjIHJ0Yy9kZXRlY3RcblxuICBQcm92aWRlIHRoZSBbcnRjLWNvcmUvZGV0ZWN0XShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1jb3JlI2RldGVjdCkgXG4gIGZ1bmN0aW9uYWxpdHkuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgncnRjLWNvcmUvZGV0ZWN0Jyk7IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpKCdnZW5lcmF0b3JzJyk7XG52YXIgZGV0ZWN0ID0gcmVxdWlyZSgnLi9kZXRlY3QnKTtcbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJ2NvZy9kZWZhdWx0cycpO1xuXG52YXIgbWFwcGluZ3MgPSB7XG4gIGNyZWF0ZToge1xuICAgIC8vIGRhdGEgZW5hYmxlclxuICAgIGRhdGE6IGZ1bmN0aW9uKGMpIHtcbiAgICAgIGlmICghIGRldGVjdC5tb3opIHtcbiAgICAgICAgYy5vcHRpb25hbCA9IChjLm9wdGlvbmFsIHx8IFtdKS5jb25jYXQoeyBSdHBEYXRhQ2hhbm5lbHM6IHRydWUgfSk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGR0bHM6IGZ1bmN0aW9uKGMpIHtcbiAgICAgIGlmICghIGRldGVjdC5tb3opIHtcbiAgICAgICAgYy5vcHRpb25hbCA9IChjLm9wdGlvbmFsIHx8IFtdKS5jb25jYXQoeyBEdGxzU3J0cEtleUFncmVlbWVudDogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbi8vIGluaXRpYWxpc2Uga25vd24gZmxhZ3NcbnZhciBrbm93bkZsYWdzID0gWyd2aWRlbycsICdhdWRpbycsICdkYXRhJ107XG5cbi8qKlxuICAjIyBydGMvZ2VuZXJhdG9yc1xuXG4gIFRoZSBnZW5lcmF0b3JzIHBhY2thZ2UgcHJvdmlkZXMgc29tZSB1dGlsaXR5IG1ldGhvZHMgZm9yIGdlbmVyYXRpbmdcbiAgY29uc3RyYWludCBvYmplY3RzIGFuZCBzaW1pbGFyIGNvbnN0cnVjdHMuXG5cbiAgYGBganNcbiAgdmFyIGdlbmVyYXRvcnMgPSByZXF1aXJlKCdydGMvZ2VuZXJhdG9ycycpO1xuICBgYGBcblxuKiovXG5cbi8qKlxuICAjIyMgZ2VuZXJhdG9ycy5jb25maWcoY29uZmlnKVxuXG4gIEdlbmVyYXRlIGEgY29uZmlndXJhdGlvbiBvYmplY3Qgc3VpdGFibGUgZm9yIHBhc3NpbmcgaW50byBhbiBXM0NcbiAgUlRDUGVlckNvbm5lY3Rpb24gY29uc3RydWN0b3IgZmlyc3QgYXJndW1lbnQsIGJhc2VkIG9uIG91ciBjdXN0b20gY29uZmlnLlxuKiovXG5leHBvcnRzLmNvbmZpZyA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICByZXR1cm4gZGVmYXVsdHMoY29uZmlnLCB7XG4gICAgaWNlU2VydmVyczogW11cbiAgfSk7XG59O1xuXG4vKipcbiAgIyMjIGdlbmVyYXRvcnMuY29ubmVjdGlvbkNvbnN0cmFpbnRzKGZsYWdzLCBjb25zdHJhaW50cylcblxuICBUaGlzIGlzIGEgaGVscGVyIGZ1bmN0aW9uIHRoYXQgd2lsbCBnZW5lcmF0ZSBhcHByb3ByaWF0ZSBjb25uZWN0aW9uXG4gIGNvbnN0cmFpbnRzIGZvciBhIG5ldyBgUlRDUGVlckNvbm5lY3Rpb25gIG9iamVjdCB3aGljaCBpcyBjb25zdHJ1Y3RlZFxuICBpbiB0aGUgZm9sbG93aW5nIHdheTpcblxuICBgYGBqc1xuICB2YXIgY29ubiA9IG5ldyBSVENQZWVyQ29ubmVjdGlvbihmbGFncywgY29uc3RyYWludHMpO1xuICBgYGBcblxuICBJbiBtb3N0IGNhc2VzIHRoZSBjb25zdHJhaW50cyBvYmplY3QgY2FuIGJlIGxlZnQgZW1wdHksIGJ1dCB3aGVuIGNyZWF0aW5nXG4gIGRhdGEgY2hhbm5lbHMgc29tZSBhZGRpdGlvbmFsIG9wdGlvbnMgYXJlIHJlcXVpcmVkLiAgVGhpcyBmdW5jdGlvblxuICBjYW4gZ2VuZXJhdGUgdGhvc2UgYWRkaXRpb25hbCBvcHRpb25zIGFuZCBpbnRlbGxpZ2VudGx5IGNvbWJpbmUgYW55XG4gIHVzZXIgZGVmaW5lZCBjb25zdHJhaW50cyAoaW4gYGNvbnN0cmFpbnRzYCkgd2l0aCBzaG9ydGhhbmQgZmxhZ3MgdGhhdFxuICBtaWdodCBiZSBwYXNzZWQgd2hpbGUgdXNpbmcgdGhlIGBydGMuY3JlYXRlQ29ubmVjdGlvbmAgaGVscGVyLlxuKiovXG5leHBvcnRzLmNvbm5lY3Rpb25Db25zdHJhaW50cyA9IGZ1bmN0aW9uKGZsYWdzLCBjb25zdHJhaW50cykge1xuICB2YXIgZ2VuZXJhdGVkID0ge307XG4gIHZhciBtID0gbWFwcGluZ3MuY3JlYXRlO1xuICB2YXIgb3V0O1xuXG4gIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgZmxhZ3MgYW5kIGFwcGx5IHRoZSBjcmVhdGUgbWFwcGluZ3NcbiAgT2JqZWN0LmtleXMoZmxhZ3MgfHwge30pLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKG1ba2V5XSkge1xuICAgICAgbVtrZXldKGdlbmVyYXRlZCk7XG4gICAgfVxuICB9KTtcblxuICAvLyBnZW5lcmF0ZSB0aGUgY29ubmVjdGlvbiBjb25zdHJhaW50c1xuICBvdXQgPSBkZWZhdWx0cyh7fSwgY29uc3RyYWludHMsIGdlbmVyYXRlZCk7XG4gIGRlYnVnKCdnZW5lcmF0ZWQgY29ubmVjdGlvbiBjb25zdHJhaW50czogJywgb3V0KTtcblxuICByZXR1cm4gb3V0O1xufTtcblxuLyoqXG4gICMjIyBwYXJzZUZsYWdzKG9wdHMpXG5cbiAgVGhpcyBpcyBhIGhlbHBlciBmdW5jdGlvbiB0aGF0IHdpbGwgZXh0cmFjdCBrbm93biBmbGFncyBmcm9tIGEgZ2VuZXJpY1xuICBvcHRpb25zIG9iamVjdC5cbioqL1xudmFyIHBhcnNlRmxhZ3MgPSBleHBvcnRzLnBhcnNlRmxhZ3MgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIG9wdHNcbiAgdmFyIG9wdHMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vIGRlZmF1bHQgdmlkZW8gYW5kIGF1ZGlvIGZsYWdzIHRvIHRydWUgaWYgdW5kZWZpbmVkXG4gIG9wdHMudmlkZW8gPSBvcHRzLnZpZGVvIHx8IHR5cGVvZiBvcHRzLnZpZGVvID09ICd1bmRlZmluZWQnO1xuICBvcHRzLmF1ZGlvID0gb3B0cy5hdWRpbyB8fCB0eXBlb2Ygb3B0cy5hdWRpbyA9PSAndW5kZWZpbmVkJztcblxuICByZXR1cm4gT2JqZWN0LmtleXMob3B0cyB8fCB7fSlcbiAgICAuZmlsdGVyKGZ1bmN0aW9uKGZsYWcpIHtcbiAgICAgIHJldHVybiBvcHRzW2ZsYWddO1xuICAgIH0pXG4gICAgLm1hcChmdW5jdGlvbihmbGFnKSB7XG4gICAgICByZXR1cm4gZmxhZy50b0xvd2VyQ2FzZSgpO1xuICAgIH0pXG4gICAgLmZpbHRlcihmdW5jdGlvbihmbGFnKSB7XG4gICAgICByZXR1cm4ga25vd25GbGFncy5pbmRleE9mKGZsYWcpID49IDA7XG4gICAgfSk7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMgcnRjXG5cbiAgVGhlIGBydGNgIHBhY2thZ2UgaXMgYSBjb252ZW5pZW5jZSBsYXllciBmb3Igd29ya2luZyB3aXRoIHRoZSBydGMuaW8gdG9vbGtpdC5cbiAgQ29uc2lkZXIgaXQgYSBib3hlZCBzZXQgb2YgbGVnbyBvZiB0aGUgbW9zdCBjb21tb24gcGllY2VzIHJlcXVpcmVkIHRvIGJ1aWxkXG4gIHRoZSBmcm9udC1lbmQgY29tcG9uZW50IG9mIGEgV2ViUlRDIGFwcGxpY2F0aW9uLlxuXG4gICMjIEdldHRpbmcgU3RhcnRlZFxuXG4gIFRPIEJFIENPTVBMRVRFRC5cblxuKiovXG5cbnZhciBnZW4gPSByZXF1aXJlKCcuL2dlbmVyYXRvcnMnKTtcblxuLy8gZXhwb3J0IGRldGVjdFxudmFyIGRldGVjdCA9IGV4cG9ydHMuZGV0ZWN0ID0gcmVxdWlyZSgnLi9kZXRlY3QnKTtcblxuLy8gZXhwb3J0IGNvZyBsb2dnZXIgZm9yIGNvbnZlbmllbmNlXG5leHBvcnRzLmxvZ2dlciA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKTtcblxuLy8gZXhwb3J0IHBlZXIgY29ubmVjdGlvblxudmFyIFJUQ1BlZXJDb25uZWN0aW9uID1cbmV4cG9ydHMuUlRDUGVlckNvbm5lY3Rpb24gPSBkZXRlY3QoJ1JUQ1BlZXJDb25uZWN0aW9uJyk7XG5cbi8vIGFkZCB0aGUgY291cGxlIHV0aWxpdHlcbmV4cG9ydHMuY291cGxlID0gcmVxdWlyZSgnLi9jb3VwbGUnKTtcblxuLyoqXG4gICMjIEZhY3Rvcmllc1xuKiovXG5cbi8qKlxuICAjIyMgY3JlYXRlQ29ubmVjdGlvbihvcHRzPywgY29uc3RyYWludHM/KVxuXG4gIENyZWF0ZSBhIG5ldyBgUlRDUGVlckNvbm5lY3Rpb25gIGF1dG8gZ2VuZXJhdGluZyBkZWZhdWx0IG9wdHMgYXMgcmVxdWlyZWQuXG5cbiAgYGBganNcbiAgdmFyIGNvbm47XG5cbiAgLy8gdGhpcyBpcyBva1xuICBjb25uID0gcnRjLmNyZWF0ZUNvbm5lY3Rpb24oKTtcblxuICAvLyBhbmQgc28gaXMgdGhpc1xuICBjb25uID0gcnRjLmNyZWF0ZUNvbm5lY3Rpb24oe1xuICAgIGljZVNlcnZlcnM6IFtdXG4gIH0pO1xuICBgYGBcbioqL1xuZXhwb3J0cy5jcmVhdGVDb25uZWN0aW9uID0gZnVuY3Rpb24ob3B0cywgY29uc3RyYWludHMpIHtcbiAgcmV0dXJuIG5ldyBSVENQZWVyQ29ubmVjdGlvbihcbiAgICAvLyBnZW5lcmF0ZSB0aGUgY29uZmlnIGJhc2VkIG9uIG9wdGlvbnMgcHJvdmlkZWRcbiAgICBnZW4uY29uZmlnKG9wdHMpLFxuXG4gICAgLy8gZ2VuZXJhdGUgYXBwcm9wcmlhdGUgY29ubmVjdGlvbiBjb25zdHJhaW50c1xuICAgIGdlbi5jb25uZWN0aW9uQ29uc3RyYWludHMob3B0cywgY29uc3RyYWludHMpXG4gICk7XG59OyIsInZhciBwcm9jZXNzPXJlcXVpcmUoXCJfX2Jyb3dzZXJpZnlfcHJvY2Vzc1wiKTsvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGVidWcgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJykoJ21vbml0b3InKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG52YXIgVzNDX1NUQVRFUyA9IHtcbiAgTkVXOiAnbmV3JyxcbiAgTE9DQUxfT0ZGRVI6ICdoYXZlLWxvY2FsLW9mZmVyJyxcbiAgTE9DQUxfUFJBTlNXRVI6ICdoYXZlLWxvY2FsLXByYW5zd2VyJyxcbiAgUkVNT1RFX1BSQU5TV0VSOiAnaGF2ZS1yZW1vdGUtcHJhbnN3ZXInLFxuICBBQ1RJVkU6ICdhY3RpdmUnLFxuICBDTE9TRUQ6ICdjbG9zZWQnXG59O1xuXG4vKipcbiAgIyMgcnRjL21vbml0b3JcblxuICBJbiBtb3N0IGN1cnJlbnQgaW1wbGVtZW50YXRpb25zIG9mIGBSVENQZWVyQ29ubmVjdGlvbmAgaXQgaXMgcXVpdGVcbiAgZGlmZmljdWx0IHRvIGRldGVybWluZSB3aGV0aGVyIGEgcGVlciBjb25uZWN0aW9uIGlzIGFjdGl2ZSBhbmQgcmVhZHlcbiAgZm9yIHVzZSBvciBub3QuICBUaGUgbW9uaXRvciBwcm92aWRlcyBzb21lIGFzc2lzdGFuY2UgaGVyZSBieSBwcm92aWRpbmdcbiAgYSBzaW1wbGUgZnVuY3Rpb24gdGhhdCBwcm92aWRlcyBhbiBgRXZlbnRFbWl0dGVyYCB3aGljaCBnaXZlcyB1cGRhdGVzXG4gIG9uIGEgY29ubmVjdGlvbnMgc3RhdGUuXG5cbiAgIyMjIG1vbml0b3IocGMpIC0+IEV2ZW50RW1pdHRlclxuXG4gIGBgYGpzXG4gIHZhciBtb25pdG9yID0gcmVxdWlyZSgncnRjL21vbml0b3InKTtcbiAgdmFyIHBjID0gbmV3IFJUQ1BlZXJDb25uZWN0aW9uKGNvbmZpZyk7XG5cbiAgLy8gd2F0Y2ggcGMgYW5kIHdoZW4gYWN0aXZlIGRvIHNvbWV0aGluZ1xuICBtb25pdG9yKHBjKS5vbmNlKCdhY3RpdmUnLCBmdW5jdGlvbigpIHtcbiAgICAvLyBhY3RpdmUgYW5kIHJlYWR5IHRvIGdvXG4gIH0pO1xuICBgYGBcblxuICBFdmVudHMgcHJvdmlkZWQgYnkgdGhlIG1vbml0b3IgYXJlIGFzIGZvbGxvd3M6XG5cbiAgLSBgYWN0aXZlYDogdHJpZ2dlcmVkIHdoZW4gdGhlIGNvbm5lY3Rpb24gaXMgYWN0aXZlIGFuZCByZWFkeSBmb3IgdXNlXG4gIC0gYHN0YWJsZWA6IHRyaWdnZXJlZCB3aGVuIHRoZSBjb25uZWN0aW9uIGlzIGluIGEgc3RhYmxlIHNpZ25hbGxpbmcgc3RhdGVcbiAgLSBgdW5zdGFibGVgOiB0cmlnZ2VyIHdoZW4gdGhlIGNvbm5lY3Rpb24gaXMgcmVuZWdvdGlhdGluZy5cblxuICBJdCBzaG91bGQgYmUgbm90ZWQsIHRoYXQgdGhlIG1vbml0b3IgZG9lcyBhIGNoZWNrIHdoZW4gaXQgaXMgZmlyc3QgcGFzc2VkXG4gIGFuIGBSVENQZWVyQ29ubmVjdGlvbmAgb2JqZWN0IHRvIHNlZSBpZiB0aGUgYGFjdGl2ZWAgc3RhdGUgcGFzc2VzIGNoZWNrcy5cbiAgSWYgc28sIHRoZSBgYWN0aXZlYCBldmVudCB3aWxsIGJlIGZpcmVkIGluIHRoZSBuZXh0IHRpY2suXG5cbiAgSWYgeW91IHJlcXVpcmUgYSBzeW5jaHJvbm91cyBjaGVjayBvZiBhIGNvbm5lY3Rpb24ncyBcIm9wZW5uZXNzXCIgdGhlblxuICB1c2UgdGhlIGBtb25pdG9yLmlzQWN0aXZlYCB0ZXN0IG91dGxpbmVkIGJlbG93LlxuKiovXG52YXIgbW9uaXRvciA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocGMsIHRhZykge1xuICAvLyBjcmVhdGUgYSBuZXcgZXZlbnQgZW1pdHRlciB3aGljaCB3aWxsIGNvbW11bmljYXRlIGV2ZW50c1xuICB2YXIgbW9uID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICB2YXIgY3VycmVudFN0YXRlID0gZ2V0U3RhdGUocGMpO1xuICB2YXIgaXNBY3RpdmUgPSBtb24uYWN0aXZlID0gY3VycmVudFN0YXRlID09PSBXM0NfU1RBVEVTLkFDVElWRTtcblxuICBmdW5jdGlvbiBjaGVja1N0YXRlKCkge1xuICAgIHZhciBuZXdTdGF0ZSA9IGdldFN0YXRlKHBjLCB0YWcpO1xuICAgIGRlYnVnKCdjYXB0dXJlZCBzdGF0ZSBjaGFuZ2UsIG5ldyBzdGF0ZTogJyArIG5ld1N0YXRlICtcbiAgICAgICcsIGN1cnJlbnQgc3RhdGU6ICcgKyBjdXJyZW50U3RhdGUpO1xuXG4gICAgLy8gdXBkYXRlIHRoZSBtb25pdG9yIGFjdGl2ZSBmbGFnXG4gICAgbW9uLmFjdGl2ZSA9IG5ld1N0YXRlID09PSBXM0NfU1RBVEVTLkFDVElWRTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYSBzdGF0ZSBjaGFuZ2UsIGVtaXQgYW4gZXZlbnQgZm9yIHRoZSBuZXcgc3RhdGVcbiAgICBpZiAobmV3U3RhdGUgIT09IGN1cnJlbnRTdGF0ZSkge1xuICAgICAgbW9uLmVtaXQoY3VycmVudFN0YXRlID0gbmV3U3RhdGUpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHRoZSBjdXJyZW50IHN0YXRlIGlzIGFjdGl2ZSwgdHJpZ2dlciB0aGUgYWN0aXZlIGV2ZW50XG4gIGlmIChpc0FjdGl2ZSkge1xuICAgIHByb2Nlc3MubmV4dFRpY2sobW9uLmVtaXQuYmluZChtb24sIFczQ19TVEFURVMuQUNUSVZFLCBwYykpO1xuICB9XG5cbiAgLy8gc3RhcnQgd2F0Y2hpbmcgc3R1ZmYgb24gdGhlIHBjXG4gIHBjLmFkZEV2ZW50TGlzdGVuZXIoJ3NpZ25hbGluZ3N0YXRlY2hhbmdlJywgY2hlY2tTdGF0ZSk7XG4gIHBjLmFkZEV2ZW50TGlzdGVuZXIoJ2ljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZScsIGNoZWNrU3RhdGUpO1xuXG4gIC8vIHBhdGNoIGluIGEgc3RvcCBtZXRob2QgaW50byB0aGUgZW1pdHRlclxuICBtb24uc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIHBjLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3NpZ25hbGluZ3N0YXRlY2hhbmdlJywgY2hlY2tTdGF0ZSk7XG4gICAgcGMucmVtb3ZlRXZlbnRMaXN0ZW5lcignaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlJywgY2hlY2tTdGF0ZSk7XG4gIH07XG5cbiAgcmV0dXJuIG1vbjtcbn07XG5cbi8qKlxuICAjIyMgbW9uaXRvci5nZXRTdGF0ZShwYylcblxuICBQcm92aWRlcyBhIHVuaWZpZWQgc3RhdGUgZGVmaW5pdGlvbiBmb3IgdGhlIFJUQ1BlZXJDb25uZWN0aW9uIGJhc2VkXG4gIG9uIGEgZmV3IGNoZWNrcy5cblxuICBJbiBlbWVyZ2luZyB2ZXJzaW9ucyBvZiB0aGUgc3BlYyB3ZSBoYXZlIHZhcmlvdXMgcHJvcGVydGllcyBzdWNoIGFzXG4gIGByZWFkeVN0YXRlYCB0aGF0IHByb3ZpZGUgYSBkZWZpbml0aXZlIGFuc3dlciBvbiB0aGUgc3RhdGUgb2YgdGhlIFxuICBjb25uZWN0aW9uLiAgSW4gb2xkZXIgdmVyc2lvbnMgd2UgbmVlZCB0byBsb29rIGF0IHRoaW5ncyBsaWtlXG4gIGBzaWduYWxpbmdTdGF0ZWAgYW5kIGBpY2VHYXRoZXJpbmdTdGF0ZWAgdG8gbWFrZSBhbiBlZHVjYXRlZCBndWVzcyBcbiAgYXMgdG8gdGhlIGNvbm5lY3Rpb24gc3RhdGUuXG4qKi9cbnZhciBnZXRTdGF0ZSA9IG1vbml0b3IuZ2V0U3RhdGUgPSBmdW5jdGlvbihwYywgdGFnKSB7XG4gIHZhciBzaWduYWxpbmdTdGF0ZSA9IHBjICYmIHBjLnNpZ25hbGluZ1N0YXRlO1xuICB2YXIgaWNlR2F0aGVyaW5nU3RhdGUgPSBwYyAmJiBwYy5pY2VHYXRoZXJpbmdTdGF0ZTtcbiAgdmFyIGljZUNvbm5lY3Rpb25TdGF0ZSA9IHBjICYmIHBjLmljZUNvbm5lY3Rpb25TdGF0ZTtcbiAgdmFyIGxvY2FsRGVzYztcbiAgdmFyIHJlbW90ZURlc2M7XG4gIHZhciBzdGF0ZTtcbiAgdmFyIGlzQWN0aXZlO1xuXG4gIC8vIGlmIG5vIGNvbm5lY3Rpb24gcmV0dXJuIGNsb3NlZFxuICBpZiAoISBwYykge1xuICAgIHJldHVybiBXM0NfU1RBVEVTLkNMT1NFRDtcbiAgfVxuXG4gIC8vIGluaXRpYWxpc2UgdGhlIHRhZyB0byBhbiBlbXB0eSBzdHJpbmcgaWYgbm90IHByb3ZpZGVkXG4gIHRhZyA9IHRhZyB8fCAnJztcblxuICAvLyBnZXQgdGhlIGNvbm5lY3Rpb24gbG9jYWwgYW5kIHJlbW90ZSBkZXNjcmlwdGlvblxuICBsb2NhbERlc2MgPSBwYy5sb2NhbERlc2NyaXB0aW9uO1xuICByZW1vdGVEZXNjID0gcGMucmVtb3RlRGVzY3JpcHRpb247XG5cbiAgLy8gdXNlIHRoZSBzaWduYWxsaW5nIHN0YXRlXG4gIHN0YXRlID0gc2lnbmFsaW5nU3RhdGU7XG5cbiAgLy8gaWYgc3RhdGUgPT0gJ3N0YWJsZScgdGhlbiBpbnZlc3RpZ2F0ZVxuICBpZiAoc3RhdGUgPT09ICdzdGFibGUnKSB7XG4gICAgLy8gaW5pdGlhbGlzZSB0aGUgc3RhdGUgdG8gbmV3XG4gICAgc3RhdGUgPSBXM0NfU1RBVEVTLk5FVztcblxuICAgIC8vIGlmIHdlIGhhdmUgYSBsb2NhbCBkZXNjcmlwdGlvbiBhbmQgcmVtb3RlIGRlc2NyaXB0aW9uIGZsYWdcbiAgICAvLyBhcyBwcmFuc3dlcmVkXG4gICAgaWYgKGxvY2FsRGVzYyAmJiByZW1vdGVEZXNjKSB7XG4gICAgICBzdGF0ZSA9IFczQ19TVEFURVMuUkVNT1RFX1BSQU5TV0VSO1xuICAgIH1cbiAgfVxuXG4gIC8vIGNoZWNrIHRvIHNlZSBpZiB3ZSBhcmUgaW4gdGhlIGFjdGl2ZSBzdGF0ZVxuICBpc0FjdGl2ZSA9IChzdGF0ZSA9PT0gVzNDX1NUQVRFUy5SRU1PVEVfUFJBTlNXRVIpICYmXG4gICAgKGljZUNvbm5lY3Rpb25TdGF0ZSA9PT0gJ2Nvbm5lY3RlZCcpO1xuXG4gIGRlYnVnKHRhZyArICdzaWduYWxpbmcgc3RhdGU6ICcgKyBzaWduYWxpbmdTdGF0ZSArXG4gICAgJywgaWNlR2F0aGVyaW5nU3RhdGU6ICcgKyBpY2VHYXRoZXJpbmdTdGF0ZSArXG4gICAgJywgaWNlQ29ubmVjdGlvblN0YXRlOiAnICsgaWNlQ29ubmVjdGlvblN0YXRlKTtcbiAgXG4gIHJldHVybiBpc0FjdGl2ZSA/IFczQ19TVEFURVMuQUNUSVZFIDogc3RhdGU7XG59O1xuXG4vKipcbiAgIyMjIG1vbml0b3IuaXNBY3RpdmUocGMpIC0+IEJvb2xlYW5cblxuICBUZXN0IGFuIGBSVENQZWVyQ29ubmVjdGlvbmAgdG8gc2VlIGlmIGl0J3MgY3VycmVudGx5IG9wZW4uICBUaGUgdGVzdCBmb3JcbiAgXCJvcGVubmVzc1wiIGxvb2tzIGF0IGEgY29tYmluYXRpb24gb2YgY3VycmVudCBgc2lnbmFsaW5nU3RhdGVgIGFuZFxuICBgaWNlR2F0aGVyaW5nU3RhdGVgLlxuKiovXG5tb25pdG9yLmlzQWN0aXZlID0gZnVuY3Rpb24ocGMpIHtcbiAgdmFyIGlzU3RhYmxlID0gcGMgJiYgcGMuc2lnbmFsaW5nU3RhdGUgPT09ICdzdGFibGUnO1xuXG4gIC8vIHJldHVybiB3aXRoIHRoZSBjb25uZWN0aW9uIGlzIGFjdGl2ZVxuICByZXR1cm4gaXNTdGFibGUgJiYgZ2V0U3RhdGUocGMpID09PSBXM0NfU1RBVEVTLkFDVElWRTtcbn07IiwidmFyIHBhcnNlciA9IHJlcXVpcmUoJy4vbGliL3BhcnNlcicpO1xudmFyIHdyaXRlciA9IHJlcXVpcmUoJy4vbGliL3dyaXRlcicpO1xuXG5leHBvcnRzLndyaXRlID0gd3JpdGVyO1xuZXhwb3J0cy5wYXJzZSA9IHBhcnNlci5wYXJzZTtcbmV4cG9ydHMucGFyc2VGbXRwQ29uZmlnID0gcGFyc2VyLnBhcnNlRm10cENvbmZpZztcbmV4cG9ydHMucGFyc2VQYXlsb2FkcyA9IHBhcnNlci5wYXJzZVBheWxvYWRzO1xuZXhwb3J0cy5wYXJzZVJlbW90ZUNhbmRpZGF0ZXMgPSBwYXJzZXIucGFyc2VSZW1vdGVDYW5kaWRhdGVzO1xuIiwidmFyIGdyYW1tYXIgPSBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgdjogW3tcbiAgICAgIG5hbWU6ICd2ZXJzaW9uJyxcbiAgICAgIHJlZzogL14oXFxkKikkL1xuICB9XSxcbiAgbzogW3sgLy9vPS0gMjA1MTggMCBJTiBJUDQgMjAzLjAuMTEzLjFcbiAgICAvLyBOQjogc2Vzc2lvbklkIHdpbGwgYmUgYSBTdHJpbmcgaW4gbW9zdCBjYXNlcyBiZWNhdXNlIGl0IGlzIGh1Z2VcbiAgICBuYW1lOiAnb3JpZ2luJyxcbiAgICByZWc6IC9eKFxcUyopIChcXGQqKSAoXFxkKikgKFxcUyopIElQKFxcZCkgKC4qKS8sXG4gICAgbmFtZXM6IFsndXNlcm5hbWUnLCAnc2Vzc2lvbklkJywgJ3Nlc3Npb25WZXJzaW9uJywgJ25ldFR5cGUnLCAnaXBWZXInLCAnYWRkcmVzcyddLFxuICAgIGZvcm1hdDogXCIlcyAlcyAlZCAlcyBJUCVkICVzXCJcbiAgfV0sXG4gIC8vIGRlZmF1bHQgcGFyc2luZyBvZiB0aGVzZSBvbmx5ICh0aG91Z2ggc29tZSBvZiB0aGVzZSBmZWVsIG91dGRhdGVkKVxuICBzOiBbeyBuYW1lOiAnbmFtZScgfV0sXG4gIGk6IFt7IG5hbWU6ICdkZXNjcmlwdGlvbicgfV0sXG4gIHU6IFt7IG5hbWU6ICd1cmknIH1dLFxuICBlOiBbeyBuYW1lOiAnZW1haWwnIH1dLFxuICBwOiBbeyBuYW1lOiAncGhvbmUnIH1dLFxuICB6OiBbeyBuYW1lOiAndGltZXpvbmVzJyB9XSwgLy8gVE9ETzogdGhpcyBvbmUgY2FuIGFjdHVhbGx5IGJlIHBhcnNlZCBwcm9wZXJseS4uXG4gIHI6IFt7IG5hbWU6ICdyZXBlYXRzJyB9XSwgICAvLyBUT0RPOiB0aGlzIG9uZSBjYW4gYWxzbyBiZSBwYXJzZWQgcHJvcGVybHlcbiAgLy9rOiBbe31dLCAvLyBvdXRkYXRlZCB0aGluZyBpZ25vcmVkXG4gIHQ6IFt7IC8vdD0wIDBcbiAgICBuYW1lOiAndGltaW5nJyxcbiAgICByZWc6IC9eKFxcZCopIChcXGQqKS8sXG4gICAgbmFtZXM6IFsnc3RhcnQnLCAnc3RvcCddLFxuICAgIGZvcm1hdDogXCIlZCAlZFwiXG4gIH1dLFxuICBjOiBbeyAvL2M9SU4gSVA0IDEwLjQ3LjE5Ny4yNlxuICAgICAgbmFtZTogJ2Nvbm5lY3Rpb24nLFxuICAgICAgcmVnOiAvXklOIElQKFxcZCkgKC4qKS8sXG4gICAgICBuYW1lczogWyd2ZXJzaW9uJywgJ2lwJ10sXG4gICAgICBmb3JtYXQ6IFwiSU4gSVAlZCAlc1wiXG4gIH1dLFxuICBiOiBbeyAvL2I9QVM6NDAwMFxuICAgICAgcHVzaDogJ2JhbmR3aWR0aCcsXG4gICAgICByZWc6IC9eKFRJQVN8QVN8Q1R8UlJ8UlMpXFw6KFxcZCopLyxcbiAgICAgIG5hbWVzOiBbJ3R5cGUnLCAnbGltaXQnXSxcbiAgICAgIGZvcm1hdDogXCIlczolc1wiXG4gIH1dLFxuICBtOiBbeyAvL209dmlkZW8gNTE3NDQgUlRQL0FWUCAxMjYgOTcgOTggMzQgMzFcbiAgICAgIC8vIE5COiBzcGVjaWFsIC0gcHVzaGVzIHRvIHNlc3Npb25cbiAgICAgIC8vIFRPRE86IHJ0cC9mbXRwIHNob3VsZCBiZSBmaWx0ZXJlZCBieSB0aGUgcGF5bG9hZHMgZm91bmQgaGVyZT9cbiAgICAgIHJlZzogL14oXFx3KikgKFxcZCopIChbXFx3XFwvXSopXFxzPyguKik/LyxcbiAgICAgIG5hbWVzOiBbJ3R5cGUnLCAncG9ydCcsICdwcm90b2NvbCcsICdwYXlsb2FkcyddLFxuICAgICAgZm9ybWF0OiBcIiVzICVkICVzICVzXCJcbiAgfV0sXG4gIGE6IFtcbiAgICB7IC8vYT1ydHBtYXA6MTEwIE1QNEEtTEFUTS85MDAwMFxuICAgICAgcHVzaDogJ3J0cCcsXG4gICAgICByZWc6IC9ecnRwbWFwXFw6KFxcZCopIChcXHcqKVxcLyhcXGQqKS8sXG4gICAgICBuYW1lczogWydwYXlsb2FkJywgJ2NvZGVjJywgJ3JhdGUnXSxcbiAgICAgIGZvcm1hdDogXCJydHBtYXA6JWQgJXMvJWRcIlxuICAgIH0sXG4gICAgeyAvL2E9Zm10cDoxMDggcHJvZmlsZS1sZXZlbC1pZD0yNDtvYmplY3Q9MjM7Yml0cmF0ZT02NDAwMFxuICAgICAgcHVzaDogJ2ZtdHAnLFxuICAgICAgcmVnOiAvXmZtdHBcXDooXFxkKikgKC4qKS8sXG4gICAgICBuYW1lczogWydwYXlsb2FkJywgJ2NvbmZpZyddLFxuICAgICAgZm9ybWF0OiBcImZtdHA6JWQgJXNcIlxuICAgIH0sXG4gICAgeyAvL2E9cnRjcC1mYjo5OCB0cnItaW50IDEwMFxuICAgICAgcHVzaDogJ3J0Y3BGYlRyckludCcsXG4gICAgICByZWc6IC9ecnRjcC1mYlxcOihcXCp8XFxkKikgdHJyLWludCAoXFxkKikvLFxuICAgICAgbmFtZXM6IFsncGF5bG9hZCcsICd2YWx1ZSddLFxuICAgICAgZm9ybWF0OiBcInJ0Y3AtZmI6JWQgdHJyLWludCAlZFwiXG4gICAgfSxcbiAgICB7IC8vYT1ydGNwLWZiOjk4IG5hY2sgcnBzaVxuICAgICAgcHVzaDogJ3J0Y3BGYicsXG4gICAgICByZWc6IC9ecnRjcC1mYlxcOihcXCp8XFxkKikgKFxcdyopID8oXFx3KikvLFxuICAgICAgbmFtZXM6IFsncGF5bG9hZCcsICd0eXBlJywgJ3N1YnR5cGUnXSxcbiAgICAgIGZvcm1hdDogXCJydGNwLWZiOiVzICVzICVzXCJcbiAgICB9LFxuICAgIHsgLy9hPWV4dG1hcDoyIHVybjppZXRmOnBhcmFtczpydHAtaGRyZXh0OnRvZmZzZXRcbiAgICAgIC8vYT1leHRtYXA6MS9yZWN2b25seSBVUkktZ3BzLXN0cmluZ1xuICAgICAgcHVzaDogJ2V4dCcsXG4gICAgICByZWc6IC9eZXh0bWFwOihbYS16QS1aMC05X1xcL10qKSAoW14gXSopID8oLiopLyxcbiAgICAgIG5hbWVzOiBbJ3ZhbHVlJywgJ3VyaScsICdjb25maWcnXSwgLy8gdmFsdWUgbWF5IGluY2x1ZGUgXCIvZGlyZWN0aW9uXCIgc3VmZml4XG4gICAgICBmb3JtYXQ6IFwiZXh0bWFwOiVzICVzICVzXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIC8vYT1jcnlwdG86MSBBRVNfQ01fMTI4X0hNQUNfU0hBMV84MCBpbmxpbmU6UFMxdVFDVmVlQ0ZDYW5WbWNqa3BQeXdqTldoY1lEMG1YWHR4YVZCUnwyXjIwfDE6MzJcbiAgICAgIHB1c2g6ICdjcnlwdG8nLFxuICAgICAgcmVnOiAvXmNyeXB0bzooXFxkKikgKFthLXpBLVowLTlfXSopID8oW14gXSopID8oLiopLyxcbiAgICAgIG5hbWVzOiBbJ2lkJywgJ3N1aXRlJywgJ2NvbmZpZycsICdzZXNzaW9uQ29uZmlnJ10sXG4gICAgICBmb3JtYXQ6IFwiY3J5cHRvOiVkICVzICVzICVzXCJcbiAgICB9LFxuICAgIHsgLy9hPXNldHVwOmFjdHBhc3NcbiAgICAgIG5hbWU6ICdzZXR1cCcsXG4gICAgICByZWc6IC9ec2V0dXBcXDooXFx3KikvLFxuICAgICAgZm9ybWF0OiBcInNldHVwOiVzXCJcbiAgICB9LFxuICAgIHsgLy9hPW1pZDoxXG4gICAgICBuYW1lOiAnbWlkJyxcbiAgICAgIHJlZzogL15taWRcXDooXFx3KikvLFxuICAgICAgZm9ybWF0OiBcIm1pZDolc1wiXG4gICAgfSxcbiAgICB7IC8vYT1wdGltZToyMFxuICAgICAgbmFtZTogJ3B0aW1lJyxcbiAgICAgIHJlZzogL15wdGltZVxcOihcXGQqKS8sXG4gICAgICBmb3JtYXQ6IFwicHRpbWU6JWRcIlxuICAgIH0sXG4gICAgeyAvL2E9bWF4cHRpbWU6NjBcbiAgICAgIG5hbWU6ICdtYXhwdGltZScsXG4gICAgICByZWc6IC9ebWF4cHRpbWVcXDooXFxkKikvLFxuICAgICAgZm9ybWF0OiBcIm1heHB0aW1lOiVkXCJcbiAgICB9LFxuICAgIHsgLy9hPXNlbmRyZWN2XG4gICAgICBuYW1lOiAnZGlyZWN0aW9uJyxcbiAgICAgIHJlZzogL14oc2VuZHJlY3Z8cmVjdm9ubHl8c2VuZG9ubHl8aW5hY3RpdmUpLyxcbiAgICAgIGZvcm1hdDogXCIlc1wiXG4gICAgfSxcbiAgICB7IC8vYT1pY2UtdWZyYWc6RjdnSVxuICAgICAgbmFtZTogJ2ljZVVmcmFnJyxcbiAgICAgIHJlZzogL15pY2UtdWZyYWdcXDooLiopLyxcbiAgICAgIGZvcm1hdDogXCJpY2UtdWZyYWc6JXNcIlxuICAgIH0sXG4gICAgeyAvL2E9aWNlLXB3ZDp4OWNtbC9ZemljaFYyK1hsaGlNdThnXG4gICAgICBuYW1lOiAnaWNlUHdkJyxcbiAgICAgIHJlZzogL15pY2UtcHdkXFw6KC4qKS8sXG4gICAgICBmb3JtYXQ6IFwiaWNlLXB3ZDolc1wiXG4gICAgfSxcbiAgICB7IC8vYT1maW5nZXJwcmludDpTSEEtMSAwMDoxMToyMjozMzo0NDo1NTo2Njo3Nzo4ODo5OTpBQTpCQjpDQzpERDpFRTpGRjowMDoxMToyMjozM1xuICAgICAgbmFtZTogJ2ZpbmdlcnByaW50JyxcbiAgICAgIHJlZzogL15maW5nZXJwcmludFxcOihcXFMqKSAoLiopLyxcbiAgICAgIG5hbWVzOiBbJ3R5cGUnLCAnaGFzaCddLFxuICAgICAgZm9ybWF0OiBcImZpbmdlcnByaW50OiVzICVzXCJcbiAgICB9LFxuICAgIHsgLy9hPWNhbmRpZGF0ZTowIDEgVURQIDIxMTM2NjczMjcgMjAzLjAuMTEzLjEgNTQ0MDAgdHlwIGhvc3RcbiAgICAgIHB1c2g6ICdjYW5kaWRhdGVzJyxcbiAgICAgIHJlZzogL15jYW5kaWRhdGU6KFxcUyopIChcXGQqKSAoXFxTKikgKFxcZCopIChcXFMqKSAoXFxkKikgdHlwIChcXFMqKS8sXG4gICAgICBuYW1lczogWydmb3VuZGF0aW9uJywgJ2NvbXBvbmVudCcsICd0cmFuc3BvcnQnLCAncHJpb3JpdHknLCAnaXAnLCAncG9ydCcsICd0eXBlJ10sXG4gICAgICBmb3JtYXQ6IFwiY2FuZGlkYXRlOiVzICVkICVzICVkICVzICVkIHR5cCAlc1wiXG4gICAgfSxcbiAgICB7IC8vYT1yZW1vdGUtY2FuZGlkYXRlczoxIDIwMy4wLjExMy4xIDU0NDAwIDIgMjAzLjAuMTEzLjEgNTQ0MDEgLi4uXG4gICAgICBuYW1lOiAncmVtb3RlQ2FuZGlkYXRlcycsXG4gICAgICByZWc6IC9ecmVtb3RlLWNhbmRpZGF0ZXM6KC4qKS8sXG4gICAgICBmb3JtYXQ6IFwicmVtb3RlLWNhbmRpZGF0ZXM6JXNcIlxuICAgIH0sXG4gICAgeyAvL2E9aWNlLW9wdGlvbnM6Z29vZ2xlLWljZVxuICAgICAgbmFtZTogJ2ljZU9wdGlvbnMnLFxuICAgICAgcmVnOiAvXmljZS1vcHRpb25zXFw6KC4qKS8sXG4gICAgICBmb3JtYXQ6IFwiaWNlLW9wdGlvbnM6JXNcIlxuICAgIH0sXG4gICAgeyAvL2E9c3NyYzoyNTY2MTA3NTY5IGNuYW1lOnQ5WVU4TTFVeFRGOFkxQTFcbiAgICAgIHB1c2g6IFwic3NyY3NcIixcbiAgICAgIHJlZzogL15zc3JjXFw6KFxcZCopIChbYS16QS1aMC05X10qKVxcOiguKikvLFxuICAgICAgbmFtZXM6IFsnaWQnLCAnYXR0cmlidXRlJywgJ3ZhbHVlJ10sXG4gICAgICBmb3JtYXQ6IFwic3NyYzolZCAlczolc1wiXG4gICAgfSxcbiAgICB7IC8vYT1tc2lkLXNlbWFudGljOiBXTVMgSnZsYW01WDNTWDFPUDZwbjIweldvZ3ZhS0p6NUhqZjlPbmxWXG4gICAgICBuYW1lOiBcIm1zaWRTZW1hbnRpY1wiLFxuICAgICAgcmVnOiAvXm1zaWQtc2VtYW50aWNcXDogKFxcdyopICguKikvLFxuICAgICAgbmFtZXM6IFsnc2VtYW50aWMnLCAndG9rZW4nXSxcbiAgICAgIGZvcm1hdDogXCJtc2lkLXNlbWFudGljOiAlcyAlc1wiIC8vIHNwYWNlIGFmdGVyIFwiOlwiIGlzIG5vdCBhY2NpZGVudGFsXG4gICAgfSxcbiAgICB7IC8vYT1ncm91cDpCVU5ETEUgYXVkaW8gdmlkZW9cbiAgICAgIHB1c2g6ICdncm91cHMnLFxuICAgICAgcmVnOiAvXmdyb3VwXFw6KFxcdyopICguKikvLFxuICAgICAgbmFtZXM6IFsndHlwZScsICdtaWRzJ10sXG4gICAgICBmb3JtYXQ6IFwiZ3JvdXA6JXMgJXNcIlxuICAgIH0sXG4gICAgeyAvL2E9cnRjcC1tdXhcbiAgICAgIG5hbWU6ICdydGNwTXV4JyxcbiAgICAgIHJlZzogL14ocnRjcC1tdXgpL1xuICAgIH1cbiAgXVxufTtcblxuLy8gc2V0IHNlbnNpYmxlIGRlZmF1bHRzIHRvIGF2b2lkIHBvbGx1dGluZyB0aGUgZ3JhbW1hciB3aXRoIGJvcmluZyBkZXRhaWxzXG5PYmplY3Qua2V5cyhncmFtbWFyKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgdmFyIG9ianMgPSBncmFtbWFyW2tleV07XG4gIG9ianMuZm9yRWFjaChmdW5jdGlvbiAob2JqKSB7XG4gICAgaWYgKCFvYmoucmVnKSB7XG4gICAgICBvYmoucmVnID0gLyguKikvO1xuICAgIH1cbiAgICBpZiAoIW9iai5mb3JtYXQpIHtcbiAgICAgIG9iai5mb3JtYXQgPSBcIiVzXCI7XG4gICAgfVxuICB9KTtcbn0pOyBcbiIsInZhciB0b0ludElmSW50ID0gZnVuY3Rpb24gKHYpIHtcbiAgcmV0dXJuIFN0cmluZyhOdW1iZXIodikpID09PSB2ID8gTnVtYmVyKHYpIDogdjtcbn07XG5cbnZhciBhdHRhY2hQcm9wZXJ0aWVzID0gZnVuY3Rpb24gKG1hdGNoLCBsb2NhdGlvbiwgbmFtZXMsIHJhd05hbWUpIHtcbiAgaWYgKHJhd05hbWUgJiYgIW5hbWVzKSB7XG4gICAgbG9jYXRpb25bcmF3TmFtZV0gPSB0b0ludElmSW50KG1hdGNoWzFdKTtcbiAgfVxuICBlbHNlIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBsb2NhdGlvbltuYW1lc1tpXV0gPSB0b0ludElmSW50KG1hdGNoW2krMV0pO1xuICAgIH1cbiAgfVxufTtcblxudmFyIHBhcnNlUmVnID0gZnVuY3Rpb24gKG9iaiwgbG9jYXRpb24sIGNvbnRlbnQpIHtcbiAgdmFyIG5lZWRzQmxhbmsgPSBvYmoubmFtZSAmJiBvYmoubmFtZXM7XG4gIGlmIChvYmoucHVzaCAmJiAhbG9jYXRpb25bb2JqLnB1c2hdKSB7XG4gICAgbG9jYXRpb25bb2JqLnB1c2hdID0gW107XG4gIH1cbiAgZWxzZSBpZiAobmVlZHNCbGFuayAmJiAhbG9jYXRpb25bb2JqLm5hbWVdKSB7XG4gICAgbG9jYXRpb25bb2JqLm5hbWVdID0ge307XG4gIH1cbiAgdmFyIGtleUxvY2F0aW9uID0gb2JqLnB1c2ggP1xuICAgIHt9IDogIC8vIGJsYW5rIG9iamVjdCB0aGF0IHdpbGwgYmUgcHVzaGVkXG4gICAgbmVlZHNCbGFuayA/IGxvY2F0aW9uW29iai5uYW1lXSA6IGxvY2F0aW9uOyAvLyBvdGhlcndpc2UsIG5hbWVkIGxvY2F0aW9uIG9yIHJvb3RcblxuICBhdHRhY2hQcm9wZXJ0aWVzKGNvbnRlbnQubWF0Y2gob2JqLnJlZyksIGtleUxvY2F0aW9uLCBvYmoubmFtZXMsIG9iai5uYW1lKTtcblxuICBpZiAob2JqLnB1c2gpIHtcbiAgICBsb2NhdGlvbltvYmoucHVzaF0ucHVzaChrZXlMb2NhdGlvbik7XG4gIH1cbn07XG5cbnZhciBncmFtbWFyID0gcmVxdWlyZSgnLi9ncmFtbWFyJyk7XG52YXIgdmFsaWRMaW5lID0gUmVnRXhwLnByb3RvdHlwZS50ZXN0LmJpbmQoL14oW2Etel0pPSguKikvKTtcblxuZXhwb3J0cy5wYXJzZSA9IGZ1bmN0aW9uIChzZHApIHtcbiAgdmFyIHNlc3Npb24gPSB7fVxuICAgICwgbWVkaWEgPSBbXVxuICAgICwgbG9jYXRpb24gPSBzZXNzaW9uOyAvLyBwb2ludHMgYXQgd2hlcmUgcHJvcGVydGllcyBnbyB1bmRlciAob25lIG9mIHRoZSBhYm92ZSlcblxuICAvLyBwYXJzZSBsaW5lcyB3ZSB1bmRlcnN0YW5kXG4gIHNkcC5zcGxpdCgnXFxuJykuZmlsdGVyKHZhbGlkTGluZSkuZm9yRWFjaChmdW5jdGlvbiAobCkge1xuICAgIHZhciB0eXBlID0gbFswXTtcbiAgICB2YXIgY29udGVudCA9IGwuc2xpY2UoMik7XG4gICAgaWYgKHR5cGUgPT09ICdtJykge1xuICAgICAgbWVkaWEucHVzaCh7cnRwOiBbXSwgZm10cDogW119KTtcbiAgICAgIGxvY2F0aW9uID0gbWVkaWFbbWVkaWEubGVuZ3RoLTFdOyAvLyBwb2ludCBhdCBsYXRlc3QgbWVkaWEgbGluZVxuICAgIH1cblxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgKGdyYW1tYXJbdHlwZV0gfHwgW10pLmxlbmd0aDsgaiArPSAxKSB7XG4gICAgICB2YXIgb2JqID0gZ3JhbW1hclt0eXBlXVtqXTtcbiAgICAgIGlmIChvYmoucmVnLnRlc3QoY29udGVudCkpIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlUmVnKG9iaiwgbG9jYXRpb24sIGNvbnRlbnQpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgc2Vzc2lvbi5tZWRpYSA9IG1lZGlhOyAvLyBsaW5rIGl0IHVwXG4gIHJldHVybiBzZXNzaW9uO1xufTtcblxudmFyIGZtdHBSZWR1Y2VyID0gZnVuY3Rpb24gKGFjYywgZXhwcikge1xuICB2YXIgcyA9IGV4cHIuc3BsaXQoJz0nKTtcbiAgaWYgKHMubGVuZ3RoID09PSAyKSB7XG4gICAgYWNjW3NbMF1dID0gdG9JbnRJZkludChzWzFdKTtcbiAgfVxuICByZXR1cm4gYWNjO1xufTtcblxuZXhwb3J0cy5wYXJzZUZtdHBDb25maWcgPSBmdW5jdGlvbiAoc3RyKSB7XG4gIHJldHVybiBzdHIuc3BsaXQoJzsnKS5yZWR1Y2UoZm10cFJlZHVjZXIsIHt9KTtcbn07XG5cbmV4cG9ydHMucGFyc2VQYXlsb2FkcyA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgcmV0dXJuIHN0ci5zcGxpdCgnICcpLm1hcChOdW1iZXIpO1xufTtcblxuZXhwb3J0cy5wYXJzZVJlbW90ZUNhbmRpZGF0ZXMgPSBmdW5jdGlvbiAoc3RyKSB7XG4gIHZhciBjYW5kaWRhdGVzID0gW107XG4gIHZhciBwYXJ0cyA9IHN0ci5zcGxpdCgnICcpLm1hcCh0b0ludElmSW50KTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7IGkgKz0gMykge1xuICAgIGNhbmRpZGF0ZXMucHVzaCh7XG4gICAgICBjb21wb25lbnQ6IHBhcnRzW2ldLFxuICAgICAgaXA6IHBhcnRzW2kgKyAxXSxcbiAgICAgIHBvcnQ6IHBhcnRzW2kgKyAyXVxuICAgIH0pO1xuICB9XG4gIHJldHVybiBjYW5kaWRhdGVzO1xufTtcbiIsInZhciBncmFtbWFyID0gcmVxdWlyZSgnLi9ncmFtbWFyJyk7XG52YXIgZm9ybWF0ID0gcmVxdWlyZSgndXRpbCcpLmZvcm1hdDtcblxudmFyIG1ha2VMaW5lID0gZnVuY3Rpb24gKHR5cGUsIG9iaiwgbG9jYXRpb24pIHtcbiAgdmFyIGFyZ3MgPSBbdHlwZSArICc9JyArIG9iai5mb3JtYXRdO1xuICBpZiAob2JqLm5hbWVzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmoubmFtZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIHZhciBuID0gb2JqLm5hbWVzW2ldO1xuICAgICAgaWYgKG9iai5uYW1lKSB7XG4gICAgICAgIGFyZ3MucHVzaChsb2NhdGlvbltvYmoubmFtZV1bbl0pO1xuICAgICAgfVxuICAgICAgZWxzZSB7IC8vIGZvciBtTGluZSBhbmQgcHVzaCBhdHRyaWJ1dGVzXG4gICAgICAgIGFyZ3MucHVzaChsb2NhdGlvbltvYmoubmFtZXNbaV1dKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZWxzZSB7XG4gICAgYXJncy5wdXNoKGxvY2F0aW9uW29iai5uYW1lXSk7XG4gIH1cbiAgcmV0dXJuIGZvcm1hdC5hcHBseShudWxsLCBhcmdzKTtcbn07XG5cbi8vIFJGQyBzcGVjaWZpZWQgb3JkZXJcbi8vIFRPRE86IGV4dGVuZCB0aGlzIHdpdGggYWxsIHRoZSByZXN0XG52YXIgZGVmYXVsdE91dGVyT3JkZXIgPSBbXG4gICd2JywgJ28nLCAncycsICdpJyxcbiAgJ3UnLCAnZScsICdwJywgJ2MnLFxuICAnYicsICd0JywgJ3InLCAneicsICdhJ1xuXTtcbnZhciBkZWZhdWx0SW5uZXJPcmRlciA9IFsnaScsICdjJywgJ2InLCAnYSddO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHNlc3Npb24sIG9wdHMpIHtcbiAgb3B0cyA9IG9wdHMgfHwge307XG4gIC8vIGVuc3VyZSBjZXJ0YWluIHByb3BlcnRpZXMgZXhpc3RcbiAgaWYgKHNlc3Npb24udmVyc2lvbiA9PSBudWxsKSB7XG4gICAgc2Vzc2lvbi52ZXJzaW9uID0gMDsgLy8gXCJ2PTBcIiBtdXN0IGJlIHRoZXJlIChvbmx5IGRlZmluZWQgdmVyc2lvbiBhdG0pXG4gIH1cbiAgaWYgKHNlc3Npb24ubmFtZSA9PSBudWxsKSB7XG4gICAgc2Vzc2lvbi5uYW1lID0gXCIgXCI7IC8vIFwicz0gXCIgbXVzdCBiZSB0aGVyZSBpZiBubyBtZWFuaW5nZnVsIG5hbWUgc2V0XG4gIH1cbiAgc2Vzc2lvbi5tZWRpYS5mb3JFYWNoKGZ1bmN0aW9uIChtTGluZSkge1xuICAgIGlmIChtTGluZS5wYXlsb2FkcyA9PSBudWxsKSB7XG4gICAgICBtTGluZS5wYXlsb2FkcyA9IFwiXCI7XG4gICAgfVxuICB9KTtcblxuICB2YXIgb3V0ZXJPcmRlciA9IG9wdHMub3V0ZXJPcmRlciB8fCBkZWZhdWx0T3V0ZXJPcmRlcjtcbiAgdmFyIGlubmVyT3JkZXIgPSBvcHRzLmlubmVyT3JkZXIgfHwgZGVmYXVsdElubmVyT3JkZXI7XG4gIHZhciBzZHAgPSBbXTtcblxuICAvLyBsb29wIHRocm91Z2ggb3V0ZXJPcmRlciBmb3IgbWF0Y2hpbmcgcHJvcGVydGllcyBvbiBzZXNzaW9uXG4gIG91dGVyT3JkZXIuZm9yRWFjaChmdW5jdGlvbiAodHlwZSkge1xuICAgIGdyYW1tYXJbdHlwZV0uZm9yRWFjaChmdW5jdGlvbiAob2JqKSB7XG4gICAgICBpZiAob2JqLm5hbWUgaW4gc2Vzc2lvbikge1xuICAgICAgICBzZHAucHVzaChtYWtlTGluZSh0eXBlLCBvYmosIHNlc3Npb24pKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKG9iai5wdXNoIGluIHNlc3Npb24pIHtcbiAgICAgICAgc2Vzc2lvbltvYmoucHVzaF0uZm9yRWFjaChmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICBzZHAucHVzaChtYWtlTGluZSh0eXBlLCBvYmosIGVsKSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcblxuICAvLyB0aGVuIGZvciBlYWNoIG1lZGlhIGxpbmUsIGZvbGxvdyB0aGUgaW5uZXJPcmRlclxuICBzZXNzaW9uLm1lZGlhLmZvckVhY2goZnVuY3Rpb24gKG1MaW5lKSB7XG4gICAgc2RwLnB1c2gobWFrZUxpbmUoJ20nLCBncmFtbWFyLm1bMF0sIG1MaW5lKSk7XG5cbiAgICBpbm5lck9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHR5cGUpIHtcbiAgICAgIGdyYW1tYXJbdHlwZV0uZm9yRWFjaChmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIGlmIChvYmoubmFtZSBpbiBtTGluZSkge1xuICAgICAgICAgIHNkcC5wdXNoKG1ha2VMaW5lKHR5cGUsIG9iaiwgbUxpbmUpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChvYmoucHVzaCBpbiBtTGluZSkge1xuICAgICAgICAgIG1MaW5lW29iai5wdXNoXS5mb3JFYWNoKGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgc2RwLnB1c2gobWFrZUxpbmUodHlwZSwgb2JqLCBlbCkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIHNkcC5qb2luKCdcXG4nKSArICdcXG4nO1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgaW86IGZhbHNlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBldmUgPSByZXF1aXJlKCdldmUnKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG52YXIgcnRjID0gcmVxdWlyZSgncnRjJyk7XG52YXIgZGVidWcgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJykoJ2dsdWUtc2Vzc2lvbm1hbmFnZXInKTtcbnZhciBjcmVhdGVTaWduYWxsZXIgPSByZXF1aXJlKCdydGMtc2lnbmFsbGVyJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG5cbi8qKlxuICAjIyMgU2Vzc2lvbk1hbmFnZXJcblxuICBUaGUgU2Vzc2lvbk1hbmFnZXIgY2xhc3MgYXNzaXN0cyB3aXRoIGludGVyYWN0aW5nIHdpdGggdGhlIHNpZ25hbGxpbmdcbiAgc2VydmVyIGFuZCBjcmVhdGluZyBwZWVyIGNvbm5lY3Rpb25zIGJldHdlZW4gdmFsaWQgcGFydGllcy4gIEl0IHVzZXNcbiAgZXZlIHRvIGNyZWF0ZSBhIGRlY291cGxlZCB3YXkgdG8gZ2V0IHBlZXIgaW5mb3JtYXRpb24uXG5cbioqL1xuZnVuY3Rpb24gU2Vzc2lvbk1hbmFnZXIoY29uZmlnKSB7XG4gIGlmICghICh0aGlzIGluc3RhbmNlb2YgU2Vzc2lvbk1hbmFnZXIpKSB7XG4gICAgcmV0dXJuIG5ldyBTZXNzaW9uTWFuYWdlcihjb25maWcpO1xuICB9XG5cbiAgRXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgcm9vbSBhbmQgb3VyIHJvbGVcbiAgdGhpcy5yb29tID0gY29uZmlnLnJvb207XG4gIHRoaXMucm9sZSA9IGNvbmZpZy5yb2xlO1xuXG4gIC8vIHNhdmUgdGhlIGNvbmZpZ1xuICB0aGlzLmNmZyA9IGNvbmZpZztcblxuICAvLyBpbml0aWFsaXNlIG91ciBwZWVycyBsaXN0XG4gIHRoaXMucGVlcnMgPSB7fTtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBzdHJlYW1zIGRhdGEgbGlzdFxuICB0aGlzLnN0cmVhbXMgPSB7fTtcblxuICAvLyBjcmVhdGUgb3VyIHVuZGVybHlpbmcgc29ja2V0IGNvbm5lY3Rpb25cbiAgdGhpcy5zb2NrZXQgPSBuZXcgUHJpbXVzKGNvbmZpZy5zaWduYWxob3N0KTtcbiAgdGhpcy5zb2NrZXQub24oJ29wZW4nLCB0aGlzLmVtaXQuYmluZCh0aGlzLCAnYWN0aXZlJykpO1xuXG4gIC8vIGNyZWF0ZSBvdXIgc2lnbmFsbGluZyBpbnRlcmZhY2VcbiAgdGhpcy5zaWduYWxsZXIgPSBjcmVhdGVTaWduYWxsZXIodGhpcy5zb2NrZXQpO1xuXG4gIC8vIGhvb2sgdXAgc2lnbmFsbGVyIGV2ZW50c1xuICB0aGlzLl9iaW5kRXZlbnRzKHRoaXMuc2lnbmFsbGVyLCBjb25maWcpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlc3Npb25NYW5hZ2VyO1xudXRpbC5pbmhlcml0cyhTZXNzaW9uTWFuYWdlciwgRXZlbnRFbWl0dGVyKTtcblxuLyoqXG4gICMjIyMgYW5ub3VuY2UoKVxuXG4gIEFubm91bmNlIG91cnNlbHZlcyBvbiB0aGUgc2lnbmFsbGluZyBjaGFubmVsXG4qKi9cblNlc3Npb25NYW5hZ2VyLnByb3RvdHlwZS5hbm5vdW5jZSA9IGZ1bmN0aW9uKHRhcmdldElkKSB7XG4gIHZhciBzY29wZSA9IHRhcmdldElkID8gdGhpcy5zaWduYWxsZXIudG8odGFyZ2V0SWQpIDogdGhpcy5zaWduYWxsZXI7XG5cbiAgZGVidWcoJ2Fubm91bmNpbmcgc2VsZiB0bzogJyArICh0YXJnZXRJZCB8fCAnYWxsJykpO1xuICBzY29wZS5hbm5vdW5jZSh7IHJvb206IHRoaXMucm9vbSwgcm9sZTogdGhpcy5yb2xlIH0pO1xufTtcblxuLyoqXG4gICMjIyMgYnJvYWRjYXN0KHN0cmVhbSlcblxuICBCcm9hZGNhc3QgYSBzdHJlYW0gdG8gb3VyIGNvbm5lY3RlZCBwZWVycy5cblxuKiovXG5TZXNzaW9uTWFuYWdlci5wcm90b3R5cGUuYnJvYWRjYXN0ID0gZnVuY3Rpb24oc3RyZWFtLCBkYXRhKSB7XG4gIHZhciBwZWVycyA9IHRoaXMucGVlcnM7XG4gIHZhciBtZ3IgPSB0aGlzO1xuXG4gIGZ1bmN0aW9uIGNvbm5lY3RQZWVyKHBlZXIsIHBlZXJJZCkge1xuICAgIG1nci50YWdTdHJlYW0oc3RyZWFtLCBwZWVySWQsIGRhdGEpO1xuXG4gICAgdHJ5IHtcbiAgICAgIHBlZXIuYWRkU3RyZWFtKHN0cmVhbSk7XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICBkZWJ1ZygnY2FwdHVyZWQgZXJyb3IgYXR0ZW1wdGluZyB0byBhZGQgc3RyZWFtOiAnLCBlKTtcbiAgICB9XG4gIH1cblxuICAvLyBhZGQgdG8gZXhpc3Rpbmcgc3RyZWFtc1xuICBkZWJ1ZygnYnJvYWRjYXN0aW5nIHN0cmVhbSAnICsgc3RyZWFtLmlkICsgJyB0byBleGlzdGluZyBwZWVycycpO1xuICBPYmplY3Qua2V5cyhwZWVycykuZm9yRWFjaChmdW5jdGlvbihwZWVySWQpIHtcbiAgICBpZiAocGVlcnNbcGVlcklkXSkge1xuICAgICAgZGVidWcoJ2Jyb2FkY2FzdGluZyB0byBwZWVyOiAnICsgcGVlcklkKTtcbiAgICAgIGNvbm5lY3RQZWVyKHBlZXJzW3BlZXJJZF0sIHBlZXJJZCk7XG4gICAgfVxuICB9KTtcblxuICAvLyB3aGVuIGEgbmV3IHBlZXIgYXJyaXZlcywgYWRkIGl0IHRvIHRoYXQgcGVlciBhbHNvXG4gIGV2ZS5vbignZ2x1ZS5wZWVyLmpvaW4nLCBmdW5jdGlvbihwZWVyLCBwZWVySWQpIHtcbiAgICBkZWJ1ZygncGVlciAnICsgcGVlcklkICsgJyBqb2luZWQsIGNvbm5lY3RpbmcgdG8gc3RyZWFtOiAnICsgc3RyZWFtLmlkKTtcblxuICAgIGNvbm5lY3RQZWVyKHBlZXIsIHBlZXJJZCk7XG4gIH0pO1xuXG4gIC8vIHdoZW4gdGhlIHN0cmVhbSBlbmRzIGRpc2Nvbm5lY3QgdGhlIGxpc3RlbmVyXG4gIC8vIFRPRE86IHVzZSBhZGRFdmVudExpc3RlbmVyIG9uY2Ugc3VwcG9ydGVkXG4gIHN0cmVhbS5vbmVuZGVkID0gZnVuY3Rpb24oKSB7XG4gICAgZXZlLm9mZignZ2x1ZS5wZWVyLmpvaW4nLCBjb25uZWN0UGVlcik7XG4gIH07XG59O1xuXG4vKipcbiAgIyMjIyBnZXRTdHJlYW1EYXRhKHN0cmVhbSwgY2FsbGJhY2spXG5cbiAgR2l2ZW4gdGhlIGlucHV0IHN0cmVhbSBgc3RyZWFtYCwgcmV0dXJuIHRoZSBkYXRhIGZvciB0aGUgc3RyZWFtLiAgVGhlXG4gIHByb3ZpZGVkIGBjYWxsYmFja2Agd2lsbCBub3QgYmUgY2FsbGVkIHVudGlsIHJlbGV2YW50IGRhdGEgaXMgaGVsZCBieVxuICB0aGUgc2Vzc2lvbiBtYW5hZ2VyLlxuXG4qKi9cblNlc3Npb25NYW5hZ2VyLnByb3RvdHlwZS5nZXRTdHJlYW1EYXRhID0gZnVuY3Rpb24oc3RyZWFtLCBjYWxsYmFjaykge1xuICB2YXIgaWQgPSBzdHJlYW0gJiYgc3RyZWFtLmlkO1xuICB2YXIgZGF0YSA9IHRoaXMuc3RyZWFtc1tpZF07XG5cbiAgLy8gaWYgd2UgZG9uJ3QgaGF2ZSBhbiBpZCwgdGhlbiBhYm9ydFxuICBpZiAoISBpZCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGlmIHdlIGhhdmUgZGF0YSBhbHJlYWR5LCByZXR1cm4gaXRcbiAgaWYgKGRhdGEpIHtcbiAgICBjYWxsYmFjayhkYXRhKTtcbiAgfVxuICAvLyBvdGhlcndpc2UsIHdhaXQgZm9yIHRoZSBkYXRhIHRvIGJlIGNyZWF0ZWRcbiAgZWxzZSB7XG4gICAgZXZlLm9uY2UoJ2dsdWUuc3RyZWFtZGF0YS4nICsgaWQsIGNhbGxiYWNrKTtcbiAgfVxufTtcblxuLyoqXG4gICMjIyMgdGFnU3RyZWFtKHN0cmVhbSwgdGFyZ2V0SWQsIGRhdGEpXG5cbiAgVGhlIHRhZ1N0cmVhbSBpcyB1c2VkIHRvIHBhc3Mgc3RyZWFtIGlkZW50aWZpY2F0aW9uIGluZm9ybWF0aW9uIGFsb25nIHRvIHRoZVxuICB0YXJnZXQgcGVlci4gIFRoaXMgaW5mb3JtYXRpb24gaXMgdXNlZnVsIHdoZW4gYSBwYXJ0aWN1bGFyIHJlbW90ZSBtZWRpYVxuICBlbGVtZW50IGlzIGV4cGVjdGluZyB0aGUgY29udGVudHMgb2YgYSBwYXJ0aWN1bGFyIGNhcHR1cmUgdGFyZ2V0LlxuXG4qKi9cblNlc3Npb25NYW5hZ2VyLnByb3RvdHlwZS50YWdTdHJlYW0gPSBmdW5jdGlvbihzdHJlYW0sIHRhcmdldElkLCBkYXRhKSB7XG4gIHRoaXMuc2lnbmFsbGVyLnRvKHRhcmdldElkKS5zZW5kKCcvc3RyZWFtZGF0YScsIGV4dGVuZCh7fSwgZGF0YSwge1xuICAgIGlkOiBzdHJlYW0uaWQsXG4gICAgbGFiZWw6IHN0cmVhbS5sYWJlbFxuICB9KSk7XG59O1xuXG4vKiBpbnRlcm5hbCBtZXRob2RzICovXG5cblNlc3Npb25NYW5hZ2VyLnByb3RvdHlwZS5fYmluZEV2ZW50cyA9IGZ1bmN0aW9uKHNpZ25hbGxlciwgb3B0cykge1xuICB2YXIgbWdyID0gdGhpcztcblxuICAvLyBUT0RPOiBleHRyYWN0IHRoZSBtZWFuaW5nZnVsIHBhcnRzIGZyb20gdGhlIGNvbmZpZ1xuICAvLyB2YXIgb3B0cyA9IHRoaXMuY2ZnO1xuICBkZWJ1ZygnaW5pdGlhbGl6aW5nIGV2ZW50IGhhbmRsZXJzJyk7XG5cbiAgc2lnbmFsbGVyLm9uKCdwZWVyOmFubm91bmNlJywgZnVuY3Rpb24oZGF0YSkge1xuICAgIHZhciBucyA9ICdnbHVlLnBlZXIuam9pbi4nICsgKGRhdGEucm9sZSB8fCAnbm9uZScpXG4gICAgdmFyIHBlZXI7XG4gICAgdmFyIG1vbml0b3I7XG5cbiAgICAvLyBpZiB0aGUgcm9vbSBkb2VzIG5vdCBtYXRjaCBvdXIgcm9vbVxuICAgIC8vIE9SLCB3ZSBhbHJlYWR5IGhhdmUgYW4gYWN0aXZlIHBlZXIgZm9yIHRoYXQgaWQsIHRoZW4gYWJvcnRcbiAgICBkZWJ1ZygnY2FwdHVyZWQgYW5ub3VuY2UgZXZlbnQgZm9yIHBlZXI6ICcgKyBkYXRhLmlkKTtcbiAgICBpZiAoZGF0YS5yb29tICE9PSBtZ3Iucm9vbSkge1xuICAgICAgcmV0dXJuIGRlYnVnKCdyZWNlaXZlZCBhbm5vdW5jZSBmb3IgaW5jb3JyZWN0IHJvb20nKTtcbiAgICB9XG5cbiAgICBpZiAobWdyLnBlZXJzW2RhdGEuaWRdKSB7XG4gICAgICByZXR1cm4gZGVidWcoJ2tub3duIHBlZXInKTtcbiAgICB9XG5cbiAgICAvLyBjcmVhdGUgb3VyIHBlZXIgY29ubmVjdGlvblxuICAgIHBlZXIgPSBtZ3IucGVlcnNbZGF0YS5pZF0gPSBydGMuY3JlYXRlQ29ubmVjdGlvbihcbiAgICAgIG9wdHMsXG4gICAgICBvcHRzLmNvbnN0cmFpbnRzXG4gICAgKTtcblxuICAgIC8vIGNvdXBsZSB0aGUgY29ubmVjdGlvbnNcbiAgICBtb25pdG9yID0gcnRjLmNvdXBsZShwZWVyLCBkYXRhLmlkLCBzaWduYWxsZXIsIG9wdHMpO1xuXG4gICAgLy8gd2FpdCBmb3IgdGhlIG1vbml0b3IgdG8gdGVsbCB1cyB3ZSBoYXZlIGFuIGFjdGl2ZSBjb25uZWN0aW9uXG4gICAgLy8gYmVmb3JlIGF0dGVtcHRpbmcgdG8gYmluZCB0byBhbnkgVUkgZWxlbWVudHNcbiAgICBtb25pdG9yLm9uY2UoJ2FjdGl2ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgZXZlKCdnbHVlLnBlZXIuYWN0aXZlLicgKyAoZGF0YS5yb2xlIHx8ICdub25lJyksIG51bGwsIHBlZXIsIGRhdGEuaWQpO1xuICAgIH0pO1xuXG4gICAgZXZlKCdnbHVlLnBlZXIuam9pbi4nICsgKGRhdGEucm9sZSB8fCAnbm9uZScpLCBudWxsLCBwZWVyLCBkYXRhLmlkKTtcbiAgfSk7XG5cbiAgc2lnbmFsbGVyLm9uKCdwZWVyOmxlYXZlJywgZnVuY3Rpb24oaWQpIHtcbiAgICAvLyBnZXQgdGhlIHBlZXJcbiAgICB2YXIgcGVlciA9IG1nci5wZWVyc1tpZF07XG4gICAgZGVidWcoJ2NhcHR1cmVkIGxlYXZlIGV2ZW50IGZvciBwZWVyOiAnICsgaWQpO1xuXG4gICAgLy8gaWYgdGhpcyBpcyBhIHBlZXIgd2Uga25vdyBhYm91dCwgdGhlbiBjbG9zZSBhbmQgc2VuZCBhIG5vdGlmaWNhdGlvblxuICAgIGlmIChwZWVyKSB7XG4gICAgICBwZWVyLmNsb3NlKCk7XG4gICAgICBtZ3IucGVlcnNbaWRdID0gdW5kZWZpbmVkO1xuXG4gICAgICAvLyB0cmlnZ2VyIHRoZSBub3RpZmljYXRpb25cbiAgICAgIGV2ZSgnZ2x1ZS5wZWVyLmxlYXZlJywgbnVsbCwgcGVlciwgaWQpO1xuICAgIH1cbiAgfSk7XG5cbiAgc2lnbmFsbGVyLm9uKCdzdHJlYW1kYXRhJywgZnVuY3Rpb24oc3JjLCBkYXRhKSB7XG4gICAgLy8gc2F2ZSB0aGUgc3RyZWFtIGRhdGEgdG8gdGhlIGxvY2FsIHN0cmVhbVxuICAgIG1nci5zdHJlYW1zW2RhdGEuaWRdID0gZGF0YTtcbiAgICBldmUoJ2dsdWUuc3RyZWFtZGF0YS4nICsgZGF0YS5pZCwgbnVsbCwgZGF0YSk7XG4gIH0pO1xufTsiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsInJlcXVpcmU9KGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkoe1wiUGNaajlMXCI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTJcblxuLyoqXG4gKiBJZiBgYnJvd3NlclN1cHBvcnRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAoY29tcGF0aWJsZSBkb3duIHRvIElFNilcbiAqL1xudmFyIGJyb3dzZXJTdXBwb3J0ID0gKGZ1bmN0aW9uICgpIHtcbiAgIC8vIERldGVjdCBpZiBicm93c2VyIHN1cHBvcnRzIFR5cGVkIEFycmF5cy4gU3VwcG9ydGVkIGJyb3dzZXJzIGFyZSBJRSAxMCssXG4gICAvLyBGaXJlZm94IDQrLCBDaHJvbWUgNyssIFNhZmFyaSA1LjErLCBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gICBpZiAodHlwZW9mIFVpbnQ4QXJyYXkgPT09ICd1bmRlZmluZWQnIHx8IHR5cGVvZiBBcnJheUJ1ZmZlciA9PT0gJ3VuZGVmaW5lZCcgfHxcbiAgICAgICAgdHlwZW9mIERhdGFWaWV3ID09PSAndW5kZWZpbmVkJylcbiAgICAgIHJldHVybiBmYWxzZVxuXG4gIC8vIERvZXMgdGhlIGJyb3dzZXIgc3VwcG9ydCBhZGRpbmcgcHJvcGVydGllcyB0byBgVWludDhBcnJheWAgaW5zdGFuY2VzPyBJZlxuICAvLyBub3QsIHRoZW4gdGhhdCdzIHRoZSBzYW1lIGFzIG5vIGBVaW50OEFycmF5YCBzdXBwb3J0LiBXZSBuZWVkIHRvIGJlIGFibGUgdG9cbiAgLy8gYWRkIGFsbCB0aGUgbm9kZSBCdWZmZXIgQVBJIG1ldGhvZHMuXG4gIC8vIFJlbGV2YW50IEZpcmVmb3ggYnVnOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzhcbiAgdHJ5IHtcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoMClcbiAgICBhcnIuZm9vID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfVxuICAgIHJldHVybiA0MiA9PT0gYXJyLmZvbygpXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufSkoKVxuXG5cbi8qKlxuICogQ2xhc3M6IEJ1ZmZlclxuICogPT09PT09PT09PT09PVxuICpcbiAqIFRoZSBCdWZmZXIgY29uc3RydWN0b3IgcmV0dXJucyBpbnN0YW5jZXMgb2YgYFVpbnQ4QXJyYXlgIHRoYXQgYXJlIGF1Z21lbnRlZFxuICogd2l0aCBmdW5jdGlvbiBwcm9wZXJ0aWVzIGZvciBhbGwgdGhlIG5vZGUgYEJ1ZmZlcmAgQVBJIGZ1bmN0aW9ucy4gV2UgdXNlXG4gKiBgVWludDhBcnJheWAgc28gdGhhdCBzcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdCByZXR1cm5zXG4gKiBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBCeSBhdWdtZW50aW5nIHRoZSBpbnN0YW5jZXMsIHdlIGNhbiBhdm9pZCBtb2RpZnlpbmcgdGhlIGBVaW50OEFycmF5YFxuICogcHJvdG90eXBlLlxuICovXG5mdW5jdGlvbiBCdWZmZXIgKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEJ1ZmZlcikpXG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoc3ViamVjdCwgZW5jb2RpbmcsIG5vWmVybylcblxuICB2YXIgdHlwZSA9IHR5cGVvZiBzdWJqZWN0XG5cbiAgLy8gV29ya2Fyb3VuZDogbm9kZSdzIGJhc2U2NCBpbXBsZW1lbnRhdGlvbiBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgc3RyaW5nc1xuICAvLyB3aGlsZSBiYXNlNjQtanMgZG9lcyBub3QuXG4gIGlmIChlbmNvZGluZyA9PT0gJ2Jhc2U2NCcgJiYgdHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICBzdWJqZWN0ID0gc3RyaW5ndHJpbShzdWJqZWN0KVxuICAgIHdoaWxlIChzdWJqZWN0Lmxlbmd0aCAlIDQgIT09IDApIHtcbiAgICAgIHN1YmplY3QgPSBzdWJqZWN0ICsgJz0nXG4gICAgfVxuICB9XG5cbiAgLy8gRmluZCB0aGUgbGVuZ3RoXG4gIHZhciBsZW5ndGhcbiAgaWYgKHR5cGUgPT09ICdudW1iZXInKVxuICAgIGxlbmd0aCA9IGNvZXJjZShzdWJqZWN0KVxuICBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJylcbiAgICBsZW5ndGggPSBCdWZmZXIuYnl0ZUxlbmd0aChzdWJqZWN0LCBlbmNvZGluZylcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ29iamVjdCcpXG4gICAgbGVuZ3RoID0gY29lcmNlKHN1YmplY3QubGVuZ3RoKSAvLyBBc3N1bWUgb2JqZWN0IGlzIGFuIGFycmF5XG4gIGVsc2VcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcnN0IGFyZ3VtZW50IG5lZWRzIHRvIGJlIGEgbnVtYmVyLCBhcnJheSBvciBzdHJpbmcuJylcblxuICB2YXIgYnVmXG4gIGlmIChicm93c2VyU3VwcG9ydCkge1xuICAgIC8vIFByZWZlcnJlZDogUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2UgZm9yIGJlc3QgcGVyZm9ybWFuY2VcbiAgICBidWYgPSBhdWdtZW50KG5ldyBVaW50OEFycmF5KGxlbmd0aCkpXG4gIH0gZWxzZSB7XG4gICAgLy8gRmFsbGJhY2s6IFJldHVybiB0aGlzIGluc3RhbmNlIG9mIEJ1ZmZlclxuICAgIGJ1ZiA9IHRoaXNcbiAgICBidWYubGVuZ3RoID0gbGVuZ3RoXG4gIH1cblxuICB2YXIgaVxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpKSB7XG4gICAgLy8gU3BlZWQgb3B0aW1pemF0aW9uIC0tIHVzZSBzZXQgaWYgd2UncmUgY29weWluZyBmcm9tIGEgVWludDhBcnJheVxuICAgIGJ1Zi5zZXQoc3ViamVjdClcbiAgfSBlbHNlIGlmIChpc0FycmF5aXNoKHN1YmplY3QpKSB7XG4gICAgLy8gVHJlYXQgYXJyYXktaXNoIG9iamVjdHMgYXMgYSBieXRlIGFycmF5XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpKVxuICAgICAgICBidWZbaV0gPSBzdWJqZWN0LnJlYWRVSW50OChpKVxuICAgICAgZWxzZVxuICAgICAgICBidWZbaV0gPSBzdWJqZWN0W2ldXG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgYnVmLndyaXRlKHN1YmplY3QsIDAsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdudW1iZXInICYmICFicm93c2VyU3VwcG9ydCAmJiAhbm9aZXJvKSB7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBidWZbaV0gPSAwXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG4vLyBTVEFUSUMgTUVUSE9EU1xuLy8gPT09PT09PT09PT09PT1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgICByZXR1cm4gdHJ1ZVxuXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIChiKSB7XG4gIHJldHVybiBiICYmIGIuX2lzQnVmZmVyXG59XG5cbkJ1ZmZlci5ieXRlTGVuZ3RoID0gZnVuY3Rpb24gKHN0ciwgZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChlbmNvZGluZyB8fCAndXRmOCcpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgICAgcmV0dXJuIHN0ci5sZW5ndGggLyAyXG5cbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgICByZXR1cm4gdXRmOFRvQnl0ZXMoc3RyKS5sZW5ndGhcblxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgICAgcmV0dXJuIHN0ci5sZW5ndGhcblxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXR1cm4gYmFzZTY0VG9CeXRlcyhzdHIpLmxlbmd0aFxuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbn1cblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIChsaXN0LCB0b3RhbExlbmd0aCkge1xuICBpZiAoIWlzQXJyYXkobGlzdCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VzYWdlOiBCdWZmZXIuY29uY2F0KGxpc3QsIFt0b3RhbExlbmd0aF0pXFxuJyArXG4gICAgICAgICdsaXN0IHNob3VsZCBiZSBhbiBBcnJheS4nKVxuICB9XG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoMClcbiAgfSBlbHNlIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBsaXN0WzBdXG4gIH1cblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHRvdGFsTGVuZ3RoICE9PSAnbnVtYmVyJykge1xuICAgIHRvdGFsTGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB0b3RhbExlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKHRvdGFsTGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXVxuICAgIGl0ZW0uY29weShidWYsIHBvcylcbiAgICBwb3MgKz0gaXRlbS5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbi8vIEJVRkZFUiBJTlNUQU5DRSBNRVRIT0RTXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBfaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAoc3RyTGVuICUgMiAhPT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBoZXggc3RyaW5nJylcbiAgfVxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGJ5dGUgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgaWYgKGlzTmFOKGJ5dGUpKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG4gICAgYnVmW29mZnNldCArIGldID0gYnl0ZVxuICB9XG4gIEJ1ZmZlci5fY2hhcnNXcml0dGVuID0gaSAqIDJcbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gX3V0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBieXRlcywgcG9zXG4gIHJldHVybiBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9IGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gX2FzY2lpV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgYnl0ZXMsIHBvc1xuICByZXR1cm4gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPSBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBfYmluYXJ5V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gX2FzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBfYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgYnl0ZXMsIHBvc1xuICByZXR1cm4gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPSBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZykge1xuICAvLyBTdXBwb3J0IGJvdGggKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKVxuICAvLyBhbmQgdGhlIGxlZ2FjeSAoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0LCBsZW5ndGgpXG4gIGlmIChpc0Zpbml0ZShvZmZzZXQpKSB7XG4gICAgaWYgKCFpc0Zpbml0ZShsZW5ndGgpKSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICB9IGVsc2UgeyAgLy8gbGVnYWN5XG4gICAgdmFyIHN3YXAgPSBlbmNvZGluZ1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgb2Zmc2V0ID0gbGVuZ3RoXG4gICAgbGVuZ3RoID0gc3dhcFxuICB9XG5cbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gdGhpcy5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuICBlbmNvZGluZyA9IFN0cmluZyhlbmNvZGluZyB8fCAndXRmOCcpLnRvTG93ZXJDYXNlKClcblxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldHVybiBfaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldHVybiBfdXRmOFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXR1cm4gX2FzY2lpV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXR1cm4gX2JpbmFyeVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0dXJuIF9iYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgc2VsZiA9IHRoaXNcblxuICBlbmNvZGluZyA9IFN0cmluZyhlbmNvZGluZyB8fCAndXRmOCcpLnRvTG93ZXJDYXNlKClcbiAgc3RhcnQgPSBOdW1iZXIoc3RhcnQpIHx8IDBcbiAgZW5kID0gKGVuZCAhPT0gdW5kZWZpbmVkKVxuICAgID8gTnVtYmVyKGVuZClcbiAgICA6IGVuZCA9IHNlbGYubGVuZ3RoXG5cbiAgLy8gRmFzdHBhdGggZW1wdHkgc3RyaW5nc1xuICBpZiAoZW5kID09PSBzdGFydClcbiAgICByZXR1cm4gJydcblxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldHVybiBfaGV4U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcblxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldHVybiBfdXRmOFNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG5cbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXR1cm4gX2FzY2lpU2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcblxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXR1cm4gX2JpbmFyeVNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG5cbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0dXJuIF9iYXNlNjRTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gKHRhcmdldCwgdGFyZ2V0X3N0YXJ0LCBzdGFydCwgZW5kKSB7XG4gIHZhciBzb3VyY2UgPSB0aGlzXG5cbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kICYmIGVuZCAhPT0gMCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKCF0YXJnZXRfc3RhcnQpIHRhcmdldF9zdGFydCA9IDBcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVyblxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCBzb3VyY2UubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICAvLyBGYXRhbCBlcnJvciBjb25kaXRpb25zXG4gIGlmIChlbmQgPCBzdGFydClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NvdXJjZUVuZCA8IHNvdXJjZVN0YXJ0JylcbiAgaWYgKHRhcmdldF9zdGFydCA8IDAgfHwgdGFyZ2V0X3N0YXJ0ID49IHRhcmdldC5sZW5ndGgpXG4gICAgdGhyb3cgbmV3IEVycm9yKCd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSBzb3VyY2UubGVuZ3RoKVxuICAgIHRocm93IG5ldyBFcnJvcignc291cmNlU3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwIHx8IGVuZCA+IHNvdXJjZS5sZW5ndGgpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKVxuICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0IDwgZW5kIC0gc3RhcnQpXG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldF9zdGFydCArIHN0YXJ0XG5cbiAgLy8gY29weSFcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbmQgLSBzdGFydDsgaSsrKVxuICAgIHRhcmdldFtpICsgdGFyZ2V0X3N0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxufVxuXG5mdW5jdGlvbiBfYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIF91dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmVzID0gJydcbiAgdmFyIHRtcCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIGlmIChidWZbaV0gPD0gMHg3Rikge1xuICAgICAgcmVzICs9IGRlY29kZVV0ZjhDaGFyKHRtcCkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgICAgIHRtcCA9ICcnXG4gICAgfSBlbHNlIHtcbiAgICAgIHRtcCArPSAnJScgKyBidWZbaV0udG9TdHJpbmcoMTYpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlcyArIGRlY29kZVV0ZjhDaGFyKHRtcClcbn1cblxuZnVuY3Rpb24gX2FzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKVxuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBfYmluYXJ5U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICByZXR1cm4gX2FzY2lpU2xpY2UoYnVmLCBzdGFydCwgZW5kKVxufVxuXG5mdW5jdGlvbiBfaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG4vLyBUT0RPOiBhZGQgdGVzdCB0aGF0IG1vZGlmeWluZyB0aGUgbmV3IGJ1ZmZlciBzbGljZSB3aWxsIG1vZGlmeSBtZW1vcnkgaW4gdGhlXG4vLyBvcmlnaW5hbCBidWZmZXIhIFVzZSBjb2RlIGZyb206XG4vLyBodHRwOi8vbm9kZWpzLm9yZy9hcGkvYnVmZmVyLmh0bWwjYnVmZmVyX2J1Zl9zbGljZV9zdGFydF9lbmRcbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgc3RhcnQgPSBjbGFtcChzdGFydCwgbGVuLCAwKVxuICBlbmQgPSBjbGFtcChlbmQsIGxlbiwgbGVuKVxuXG4gIGlmIChicm93c2VyU3VwcG9ydCkge1xuICAgIHJldHVybiBhdWdtZW50KHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZCkpXG4gIH0gZWxzZSB7XG4gICAgLy8gVE9ETzogc2xpY2luZyB3b3Jrcywgd2l0aCBsaW1pdGF0aW9ucyAobm8gcGFyZW50IHRyYWNraW5nL3VwZGF0ZSlcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL25hdGl2ZS1idWZmZXItYnJvd3NlcmlmeS9pc3N1ZXMvOVxuICAgIHZhciBzbGljZUxlbiA9IGVuZCAtIHN0YXJ0XG4gICAgdmFyIG5ld0J1ZiA9IG5ldyBCdWZmZXIoc2xpY2VMZW4sIHVuZGVmaW5lZCwgdHJ1ZSlcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNsaWNlTGVuOyBpKyspIHtcbiAgICAgIG5ld0J1ZltpXSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgICByZXR1cm4gbmV3QnVmXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YXIgYnVmID0gdGhpc1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gYnVmLmxlbmd0aClcbiAgICByZXR1cm5cblxuICByZXR1cm4gYnVmW29mZnNldF1cbn1cblxuZnVuY3Rpb24gX3JlYWRVSW50MTYgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZiAoYnJvd3NlclN1cHBvcnQpIHtcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbikge1xuICAgICAgcmV0dXJuIGJ1Zi5fZGF0YXZpZXcuZ2V0VWludDE2KG9mZnNldCwgbGl0dGxlRW5kaWFuKVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZHYgPSBuZXcgRGF0YVZpZXcobmV3IEFycmF5QnVmZmVyKDIpKVxuICAgICAgZHYuc2V0VWludDgoMCwgYnVmW2xlbiAtIDFdKVxuICAgICAgcmV0dXJuIGR2LmdldFVpbnQxNigwLCBsaXR0bGVFbmRpYW4pXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciB2YWxcbiAgICBpZiAobGl0dGxlRW5kaWFuKSB7XG4gICAgICB2YWwgPSBidWZbb2Zmc2V0XVxuICAgICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMV0gPDwgOFxuICAgIH0gZWxzZSB7XG4gICAgICB2YWwgPSBidWZbb2Zmc2V0XSA8PCA4XG4gICAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXVxuICAgIH1cbiAgICByZXR1cm4gdmFsXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MTYodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MTYodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkVUludDMyIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWYgKGJyb3dzZXJTdXBwb3J0KSB7XG4gICAgaWYgKG9mZnNldCArIDMgPCBsZW4pIHtcbiAgICAgIHJldHVybiBidWYuX2RhdGF2aWV3LmdldFVpbnQzMihvZmZzZXQsIGxpdHRsZUVuZGlhbilcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGR2ID0gbmV3IERhdGFWaWV3KG5ldyBBcnJheUJ1ZmZlcig0KSlcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpICsgb2Zmc2V0IDwgbGVuOyBpKyspIHtcbiAgICAgICAgZHYuc2V0VWludDgoaSwgYnVmW2kgKyBvZmZzZXRdKVxuICAgICAgfVxuICAgICAgcmV0dXJuIGR2LmdldFVpbnQzMigwLCBsaXR0bGVFbmRpYW4pXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciB2YWxcbiAgICBpZiAobGl0dGxlRW5kaWFuKSB7XG4gICAgICBpZiAob2Zmc2V0ICsgMiA8IGxlbilcbiAgICAgICAgdmFsID0gYnVmW29mZnNldCArIDJdIDw8IDE2XG4gICAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXSA8PCA4XG4gICAgICB2YWwgfD0gYnVmW29mZnNldF1cbiAgICAgIGlmIChvZmZzZXQgKyAzIDwgbGVuKVxuICAgICAgICB2YWwgPSB2YWwgKyAoYnVmW29mZnNldCArIDNdIDw8IDI0ID4+PiAwKVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgICAgdmFsID0gYnVmW29mZnNldCArIDFdIDw8IDE2XG4gICAgICBpZiAob2Zmc2V0ICsgMiA8IGxlbilcbiAgICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAyXSA8PCA4XG4gICAgICBpZiAob2Zmc2V0ICsgMyA8IGxlbilcbiAgICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAzXVxuICAgICAgdmFsID0gdmFsICsgKGJ1ZltvZmZzZXRdIDw8IDI0ID4+PiAwKVxuICAgIH1cbiAgICByZXR1cm4gdmFsXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MzIodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MzIodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YXIgYnVmID0gdGhpc1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gYnVmLmxlbmd0aClcbiAgICByZXR1cm5cblxuICBpZiAoYnJvd3NlclN1cHBvcnQpIHtcbiAgICByZXR1cm4gYnVmLl9kYXRhdmlldy5nZXRJbnQ4KG9mZnNldClcbiAgfSBlbHNlIHtcbiAgICB2YXIgbmVnID0gYnVmW29mZnNldF0gJiAweDgwXG4gICAgaWYgKG5lZylcbiAgICAgIHJldHVybiAoMHhmZiAtIGJ1ZltvZmZzZXRdICsgMSkgKiAtMVxuICAgIGVsc2VcbiAgICAgIHJldHVybiBidWZbb2Zmc2V0XVxuICB9XG59XG5cbmZ1bmN0aW9uIF9yZWFkSW50MTYgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZiAoYnJvd3NlclN1cHBvcnQpIHtcbiAgICBpZiAob2Zmc2V0ICsgMSA9PT0gbGVuKSB7XG4gICAgICB2YXIgZHYgPSBuZXcgRGF0YVZpZXcobmV3IEFycmF5QnVmZmVyKDIpKVxuICAgICAgZHYuc2V0VWludDgoMCwgYnVmW2xlbiAtIDFdKVxuICAgICAgcmV0dXJuIGR2LmdldEludDE2KDAsIGxpdHRsZUVuZGlhbilcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGJ1Zi5fZGF0YXZpZXcuZ2V0SW50MTYob2Zmc2V0LCBsaXR0bGVFbmRpYW4pXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciB2YWwgPSBfcmVhZFVJbnQxNihidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCB0cnVlKVxuICAgIHZhciBuZWcgPSB2YWwgJiAweDgwMDBcbiAgICBpZiAobmVnKVxuICAgICAgcmV0dXJuICgweGZmZmYgLSB2YWwgKyAxKSAqIC0xXG4gICAgZWxzZVxuICAgICAgcmV0dXJuIHZhbFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQxNih0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkSW50MTYodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkSW50MzIgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZiAoYnJvd3NlclN1cHBvcnQpIHtcbiAgICBpZiAob2Zmc2V0ICsgMyA+PSBsZW4pIHtcbiAgICAgIHZhciBkdiA9IG5ldyBEYXRhVmlldyhuZXcgQXJyYXlCdWZmZXIoNCkpXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSArIG9mZnNldCA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGR2LnNldFVpbnQ4KGksIGJ1ZltpICsgb2Zmc2V0XSlcbiAgICAgIH1cbiAgICAgIHJldHVybiBkdi5nZXRJbnQzMigwLCBsaXR0bGVFbmRpYW4pXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBidWYuX2RhdGF2aWV3LmdldEludDMyKG9mZnNldCwgbGl0dGxlRW5kaWFuKVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgdmFsID0gX3JlYWRVSW50MzIoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgdHJ1ZSlcbiAgICB2YXIgbmVnID0gdmFsICYgMHg4MDAwMDAwMFxuICAgIGlmIChuZWcpXG4gICAgICByZXR1cm4gKDB4ZmZmZmZmZmYgLSB2YWwgKyAxKSAqIC0xXG4gICAgZWxzZVxuICAgICAgcmV0dXJuIHZhbFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQzMih0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkSW50MzIodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkRmxvYXQgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgaWYgKGJyb3dzZXJTdXBwb3J0KSB7XG4gICAgcmV0dXJuIGJ1Zi5fZGF0YXZpZXcuZ2V0RmxvYXQzMihvZmZzZXQsIGxpdHRsZUVuZGlhbilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gaWVlZTc1NC5yZWFkKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRGbG9hdCh0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRmxvYXQodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkRG91YmxlIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgKyA3IDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIGlmIChicm93c2VyU3VwcG9ydCkge1xuICAgIHJldHVybiBidWYuX2RhdGF2aWV3LmdldEZsb2F0NjQob2Zmc2V0LCBsaXR0bGVFbmRpYW4pXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGllZWU3NTQucmVhZChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZERvdWJsZSh0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZERvdWJsZSh0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhciBidWYgPSB0aGlzXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCA8IGJ1Zi5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZilcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gYnVmLmxlbmd0aCkgcmV0dXJuXG5cbiAgYnVmW29mZnNldF0gPSB2YWx1ZVxufVxuXG5mdW5jdGlvbiBfd3JpdGVVSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZmZmKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWYgKGJyb3dzZXJTdXBwb3J0KSB7XG4gICAgaWYgKG9mZnNldCArIDEgPT09IGxlbikge1xuICAgICAgdmFyIGR2ID0gbmV3IERhdGFWaWV3KG5ldyBBcnJheUJ1ZmZlcigyKSlcbiAgICAgIGR2LnNldFVpbnQxNigwLCB2YWx1ZSwgbGl0dGxlRW5kaWFuKVxuICAgICAgYnVmW29mZnNldF0gPSBkdi5nZXRVaW50OCgwKVxuICAgIH0gZWxzZSB7XG4gICAgICBidWYuX2RhdGF2aWV3LnNldFVpbnQxNihvZmZzZXQsIHZhbHVlLCBsaXR0bGVFbmRpYW4pXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4obGVuIC0gb2Zmc2V0LCAyKTsgaSA8IGo7IGkrKykge1xuICAgICAgYnVmW29mZnNldCArIGldID1cbiAgICAgICAgICAodmFsdWUgJiAoMHhmZiA8PCAoOCAqIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpKSkpID4+PlxuICAgICAgICAgICAgICAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSAqIDhcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZVVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ3RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZ1aW50KHZhbHVlLCAweGZmZmZmZmZmKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIGlcbiAgaWYgKGJyb3dzZXJTdXBwb3J0KSB7XG4gICAgaWYgKG9mZnNldCArIDMgPj0gbGVuKSB7XG4gICAgICB2YXIgZHYgPSBuZXcgRGF0YVZpZXcobmV3IEFycmF5QnVmZmVyKDQpKVxuICAgICAgZHYuc2V0VWludDMyKDAsIHZhbHVlLCBsaXR0bGVFbmRpYW4pXG4gICAgICBmb3IgKGkgPSAwOyBpICsgb2Zmc2V0IDwgbGVuOyBpKyspIHtcbiAgICAgICAgYnVmW2kgKyBvZmZzZXRdID0gZHYuZ2V0VWludDgoaSlcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgYnVmLl9kYXRhdmlldy5zZXRVaW50MzIob2Zmc2V0LCB2YWx1ZSwgbGl0dGxlRW5kaWFuKVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBmb3IgKGkgPSAwLCBqID0gTWF0aC5taW4obGVuIC0gb2Zmc2V0LCA0KTsgaSA8IGo7IGkrKykge1xuICAgICAgYnVmW29mZnNldCArIGldID1cbiAgICAgICAgICAodmFsdWUgPj4+IChsaXR0bGVFbmRpYW4gPyBpIDogMyAtIGkpICogOCkgJiAweGZmXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YXIgYnVmID0gdGhpc1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnNpbnQodmFsdWUsIDB4N2YsIC0weDgwKVxuICB9XG5cbiAgaWYgKG9mZnNldCA+PSBidWYubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIGlmIChicm93c2VyU3VwcG9ydCkge1xuICAgIGJ1Zi5fZGF0YXZpZXcuc2V0SW50OChvZmZzZXQsIHZhbHVlKVxuICB9IGVsc2Uge1xuICAgIGlmICh2YWx1ZSA+PSAwKVxuICAgICAgYnVmLndyaXRlVUludDgodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpXG4gICAgZWxzZVxuICAgICAgYnVmLndyaXRlVUludDgoMHhmZiArIHZhbHVlICsgMSwgb2Zmc2V0LCBub0Fzc2VydClcbiAgfVxufVxuXG5mdW5jdGlvbiBfd3JpdGVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmZmYsIC0weDgwMDApXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZiAoYnJvd3NlclN1cHBvcnQpIHtcbiAgICBpZiAob2Zmc2V0ICsgMSA9PT0gbGVuKSB7XG4gICAgICB2YXIgZHYgPSBuZXcgRGF0YVZpZXcobmV3IEFycmF5QnVmZmVyKDIpKVxuICAgICAgZHYuc2V0SW50MTYoMCwgdmFsdWUsIGxpdHRsZUVuZGlhbilcbiAgICAgIGJ1ZltvZmZzZXRdID0gZHYuZ2V0VWludDgoMClcbiAgICB9IGVsc2Uge1xuICAgICAgYnVmLl9kYXRhdmlldy5zZXRJbnQxNihvZmZzZXQsIHZhbHVlLCBsaXR0bGVFbmRpYW4pXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmICh2YWx1ZSA+PSAwKVxuICAgICAgX3dyaXRlVUludDE2KGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbiAgICBlbHNlXG4gICAgICBfd3JpdGVVSW50MTYoYnVmLCAweGZmZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGlmIChicm93c2VyU3VwcG9ydCkge1xuICAgIGlmIChvZmZzZXQgKyAzID49IGxlbikge1xuICAgICAgdmFyIGR2ID0gbmV3IERhdGFWaWV3KG5ldyBBcnJheUJ1ZmZlcig0KSlcbiAgICAgIGR2LnNldEludDMyKDAsIHZhbHVlLCBsaXR0bGVFbmRpYW4pXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSArIG9mZnNldCA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGJ1ZltpICsgb2Zmc2V0XSA9IGR2LmdldFVpbnQ4KGkpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGJ1Zi5fZGF0YXZpZXcuc2V0SW50MzIob2Zmc2V0LCB2YWx1ZSwgbGl0dGxlRW5kaWFuKVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAodmFsdWUgPj0gMClcbiAgICAgIF93cml0ZVVJbnQzMihidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG4gICAgZWxzZVxuICAgICAgX3dyaXRlVUludDMyKGJ1ZiwgMHhmZmZmZmZmZiArIHZhbHVlICsgMSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZklFRUU3NTQodmFsdWUsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWYgKGJyb3dzZXJTdXBwb3J0KSB7XG4gICAgaWYgKG9mZnNldCArIDMgPj0gbGVuKSB7XG4gICAgICB2YXIgZHYgPSBuZXcgRGF0YVZpZXcobmV3IEFycmF5QnVmZmVyKDQpKVxuICAgICAgZHYuc2V0RmxvYXQzMigwLCB2YWx1ZSwgbGl0dGxlRW5kaWFuKVxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgKyBvZmZzZXQgPCBsZW47IGkrKykge1xuICAgICAgICBidWZbaSArIG9mZnNldF0gPSBkdi5nZXRVaW50OChpKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBidWYuX2RhdGF2aWV3LnNldEZsb2F0MzIob2Zmc2V0LCB2YWx1ZSwgbGl0dGxlRW5kaWFuKVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgNyA8IGJ1Zi5sZW5ndGgsXG4gICAgICAgICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmSUVFRTc1NCh2YWx1ZSwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGlmIChicm93c2VyU3VwcG9ydCkge1xuICAgIGlmIChvZmZzZXQgKyA3ID49IGxlbikge1xuICAgICAgdmFyIGR2ID0gbmV3IERhdGFWaWV3KG5ldyBBcnJheUJ1ZmZlcig4KSlcbiAgICAgIGR2LnNldEZsb2F0NjQoMCwgdmFsdWUsIGxpdHRsZUVuZGlhbilcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpICsgb2Zmc2V0IDwgbGVuOyBpKyspIHtcbiAgICAgICAgYnVmW2kgKyBvZmZzZXRdID0gZHYuZ2V0VWludDgoaSlcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgYnVmLl9kYXRhdmlldy5zZXRGbG9hdDY0KG9mZnNldCwgdmFsdWUsIGxpdHRsZUVuZGlhbilcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gKHZhbHVlLCBzdGFydCwgZW5kKSB7XG4gIGlmICghdmFsdWUpIHZhbHVlID0gMFxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQpIGVuZCA9IHRoaXMubGVuZ3RoXG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICB2YWx1ZSA9IHZhbHVlLmNoYXJDb2RlQXQoMClcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdudW1iZXInIHx8IGlzTmFOKHZhbHVlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcigndmFsdWUgaXMgbm90IGEgbnVtYmVyJylcbiAgfVxuXG4gIGlmIChlbmQgPCBzdGFydCkgdGhyb3cgbmV3IEVycm9yKCdlbmQgPCBzdGFydCcpXG5cbiAgLy8gRmlsbCAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzdGFydCBvdXQgb2YgYm91bmRzJylcbiAgfVxuXG4gIGlmIChlbmQgPCAwIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdlbmQgb3V0IG9mIGJvdW5kcycpXG4gIH1cblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHRoaXNbaV0gPSB2YWx1ZVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG91dCA9IFtdXG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgb3V0W2ldID0gdG9IZXgodGhpc1tpXSlcbiAgICBpZiAoaSA9PT0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUykge1xuICAgICAgb3V0W2kgKyAxXSA9ICcuLi4nXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIG91dC5qb2luKCcgJykgKyAnPidcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGBBcnJheUJ1ZmZlcmAgd2l0aCB0aGUgKmNvcGllZCogbWVtb3J5IG9mIHRoZSBidWZmZXIgaW5zdGFuY2UuXG4gKiBBZGRlZCBpbiBOb2RlIDAuMTIuIE5vdCBhZGRlZCB0byBCdWZmZXIucHJvdG90eXBlIHNpbmNlIGl0IHNob3VsZCBvbmx5XG4gKiBiZSBhdmFpbGFibGUgaW4gYnJvd3NlcnMgdGhhdCBzdXBwb3J0IEFycmF5QnVmZmVyLlxuICovXG5mdW5jdGlvbiBCdWZmZXJUb0FycmF5QnVmZmVyICgpIHtcbiAgcmV0dXJuIChuZXcgQnVmZmVyKHRoaXMpKS5idWZmZXJcbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG52YXIgQlAgPSBCdWZmZXIucHJvdG90eXBlXG5cbmZ1bmN0aW9uIGF1Z21lbnQgKGFycikge1xuICBhcnIuX2lzQnVmZmVyID0gdHJ1ZVxuXG4gIC8vIEF1Z21lbnQgdGhlIFVpbnQ4QXJyYXkgKmluc3RhbmNlKiAobm90IHRoZSBjbGFzcyEpIHdpdGggQnVmZmVyIG1ldGhvZHNcbiAgYXJyLndyaXRlID0gQlAud3JpdGVcbiAgYXJyLnRvU3RyaW5nID0gQlAudG9TdHJpbmdcbiAgYXJyLnRvTG9jYWxlU3RyaW5nID0gQlAudG9TdHJpbmdcbiAgYXJyLnRvSlNPTiA9IEJQLnRvSlNPTlxuICBhcnIuY29weSA9IEJQLmNvcHlcbiAgYXJyLnNsaWNlID0gQlAuc2xpY2VcbiAgYXJyLnJlYWRVSW50OCA9IEJQLnJlYWRVSW50OFxuICBhcnIucmVhZFVJbnQxNkxFID0gQlAucmVhZFVJbnQxNkxFXG4gIGFyci5yZWFkVUludDE2QkUgPSBCUC5yZWFkVUludDE2QkVcbiAgYXJyLnJlYWRVSW50MzJMRSA9IEJQLnJlYWRVSW50MzJMRVxuICBhcnIucmVhZFVJbnQzMkJFID0gQlAucmVhZFVJbnQzMkJFXG4gIGFyci5yZWFkSW50OCA9IEJQLnJlYWRJbnQ4XG4gIGFyci5yZWFkSW50MTZMRSA9IEJQLnJlYWRJbnQxNkxFXG4gIGFyci5yZWFkSW50MTZCRSA9IEJQLnJlYWRJbnQxNkJFXG4gIGFyci5yZWFkSW50MzJMRSA9IEJQLnJlYWRJbnQzMkxFXG4gIGFyci5yZWFkSW50MzJCRSA9IEJQLnJlYWRJbnQzMkJFXG4gIGFyci5yZWFkRmxvYXRMRSA9IEJQLnJlYWRGbG9hdExFXG4gIGFyci5yZWFkRmxvYXRCRSA9IEJQLnJlYWRGbG9hdEJFXG4gIGFyci5yZWFkRG91YmxlTEUgPSBCUC5yZWFkRG91YmxlTEVcbiAgYXJyLnJlYWREb3VibGVCRSA9IEJQLnJlYWREb3VibGVCRVxuICBhcnIud3JpdGVVSW50OCA9IEJQLndyaXRlVUludDhcbiAgYXJyLndyaXRlVUludDE2TEUgPSBCUC53cml0ZVVJbnQxNkxFXG4gIGFyci53cml0ZVVJbnQxNkJFID0gQlAud3JpdGVVSW50MTZCRVxuICBhcnIud3JpdGVVSW50MzJMRSA9IEJQLndyaXRlVUludDMyTEVcbiAgYXJyLndyaXRlVUludDMyQkUgPSBCUC53cml0ZVVJbnQzMkJFXG4gIGFyci53cml0ZUludDggPSBCUC53cml0ZUludDhcbiAgYXJyLndyaXRlSW50MTZMRSA9IEJQLndyaXRlSW50MTZMRVxuICBhcnIud3JpdGVJbnQxNkJFID0gQlAud3JpdGVJbnQxNkJFXG4gIGFyci53cml0ZUludDMyTEUgPSBCUC53cml0ZUludDMyTEVcbiAgYXJyLndyaXRlSW50MzJCRSA9IEJQLndyaXRlSW50MzJCRVxuICBhcnIud3JpdGVGbG9hdExFID0gQlAud3JpdGVGbG9hdExFXG4gIGFyci53cml0ZUZsb2F0QkUgPSBCUC53cml0ZUZsb2F0QkVcbiAgYXJyLndyaXRlRG91YmxlTEUgPSBCUC53cml0ZURvdWJsZUxFXG4gIGFyci53cml0ZURvdWJsZUJFID0gQlAud3JpdGVEb3VibGVCRVxuICBhcnIuZmlsbCA9IEJQLmZpbGxcbiAgYXJyLmluc3BlY3QgPSBCUC5pbnNwZWN0XG4gIGFyci50b0FycmF5QnVmZmVyID0gQnVmZmVyVG9BcnJheUJ1ZmZlclxuXG4gIGlmIChhcnIuYnl0ZUxlbmd0aCAhPT0gMClcbiAgICBhcnIuX2RhdGF2aWV3ID0gbmV3IERhdGFWaWV3KGFyci5idWZmZXIsIGFyci5ieXRlT2Zmc2V0LCBhcnIuYnl0ZUxlbmd0aClcblxuICByZXR1cm4gYXJyXG59XG5cbi8vIHNsaWNlKHN0YXJ0LCBlbmQpXG5mdW5jdGlvbiBjbGFtcCAoaW5kZXgsIGxlbiwgZGVmYXVsdFZhbHVlKSB7XG4gIGlmICh0eXBlb2YgaW5kZXggIT09ICdudW1iZXInKSByZXR1cm4gZGVmYXVsdFZhbHVlXG4gIGluZGV4ID0gfn5pbmRleDsgIC8vIENvZXJjZSB0byBpbnRlZ2VyLlxuICBpZiAoaW5kZXggPj0gbGVuKSByZXR1cm4gbGVuXG4gIGlmIChpbmRleCA+PSAwKSByZXR1cm4gaW5kZXhcbiAgaW5kZXggKz0gbGVuXG4gIGlmIChpbmRleCA+PSAwKSByZXR1cm4gaW5kZXhcbiAgcmV0dXJuIDBcbn1cblxuZnVuY3Rpb24gY29lcmNlIChsZW5ndGgpIHtcbiAgLy8gQ29lcmNlIGxlbmd0aCB0byBhIG51bWJlciAocG9zc2libHkgTmFOKSwgcm91bmQgdXBcbiAgLy8gaW4gY2FzZSBpdCdzIGZyYWN0aW9uYWwgKGUuZy4gMTIzLjQ1NikgdGhlbiBkbyBhXG4gIC8vIGRvdWJsZSBuZWdhdGUgdG8gY29lcmNlIGEgTmFOIHRvIDAuIEVhc3ksIHJpZ2h0P1xuICBsZW5ndGggPSB+fk1hdGguY2VpbCgrbGVuZ3RoKVxuICByZXR1cm4gbGVuZ3RoIDwgMCA/IDAgOiBsZW5ndGhcbn1cblxuZnVuY3Rpb24gaXNBcnJheSAoc3ViamVjdCkge1xuICByZXR1cm4gKEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHN1YmplY3QpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHN1YmplY3QpID09PSAnW29iamVjdCBBcnJheV0nXG4gIH0pKHN1YmplY3QpXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXlpc2ggKHN1YmplY3QpIHtcbiAgcmV0dXJuIGlzQXJyYXkoc3ViamVjdCkgfHwgQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpIHx8XG4gICAgICBzdWJqZWN0ICYmIHR5cGVvZiBzdWJqZWN0ID09PSAnb2JqZWN0JyAmJlxuICAgICAgdHlwZW9mIHN1YmplY3QubGVuZ3RoID09PSAnbnVtYmVyJ1xufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKVxuICAgIGlmIChzdHIuY2hhckNvZGVBdChpKSA8PSAweDdGKVxuICAgICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpXG4gICAgZWxzZSB7XG4gICAgICB2YXIgaCA9IGVuY29kZVVSSUNvbXBvbmVudChzdHIuY2hhckF0KGkpKS5zdWJzdHIoMSkuc3BsaXQoJyUnKVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBoLmxlbmd0aDsgaisrKVxuICAgICAgICBieXRlQXJyYXkucHVzaChwYXJzZUludChoW2pdLCAxNikpXG4gICAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIC8vIE5vZGUncyBjb2RlIHNlZW1zIHRvIGJlIGRvaW5nIHRoaXMgYW5kIG5vdCAmIDB4N0YuLlxuICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRilcbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KHN0cilcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBwb3NcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSlcbiAgICAgIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gZGVjb2RlVXRmOENoYXIgKHN0cikge1xuICB0cnkge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgweEZGRkQpIC8vIFVURiA4IGludmFsaWQgY2hhclxuICB9XG59XG5cbi8qXG4gKiBXZSBoYXZlIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSB2YWx1ZSBpcyBhIHZhbGlkIGludGVnZXIuIFRoaXMgbWVhbnMgdGhhdCBpdFxuICogaXMgbm9uLW5lZ2F0aXZlLiBJdCBoYXMgbm8gZnJhY3Rpb25hbCBjb21wb25lbnQgYW5kIHRoYXQgaXQgZG9lcyBub3RcbiAqIGV4Y2VlZCB0aGUgbWF4aW11bSBhbGxvd2VkIHZhbHVlLlxuICovXG5mdW5jdGlvbiB2ZXJpZnVpbnQgKHZhbHVlLCBtYXgpIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PSAnbnVtYmVyJywgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKVxuICBhc3NlcnQodmFsdWUgPj0gMCxcbiAgICAgICdzcGVjaWZpZWQgYSBuZWdhdGl2ZSB2YWx1ZSBmb3Igd3JpdGluZyBhbiB1bnNpZ25lZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBpcyBsYXJnZXIgdGhhbiBtYXhpbXVtIHZhbHVlIGZvciB0eXBlJylcbiAgYXNzZXJ0KE1hdGguZmxvb3IodmFsdWUpID09PSB2YWx1ZSwgJ3ZhbHVlIGhhcyBhIGZyYWN0aW9uYWwgY29tcG9uZW50Jylcbn1cblxuZnVuY3Rpb24gdmVyaWZzaW50KHZhbHVlLCBtYXgsIG1pbikge1xuICBhc3NlcnQodHlwZW9mIHZhbHVlID09ICdudW1iZXInLCAnY2Fubm90IHdyaXRlIGEgbm9uLW51bWJlciBhcyBhIG51bWJlcicpXG4gIGFzc2VydCh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBsYXJnZXIgdGhhbiBtYXhpbXVtIGFsbG93ZWQgdmFsdWUnKVxuICBhc3NlcnQodmFsdWUgPj0gbWluLCAndmFsdWUgc21hbGxlciB0aGFuIG1pbmltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydChNYXRoLmZsb29yKHZhbHVlKSA9PT0gdmFsdWUsICd2YWx1ZSBoYXMgYSBmcmFjdGlvbmFsIGNvbXBvbmVudCcpXG59XG5cbmZ1bmN0aW9uIHZlcmlmSUVFRTc1NCh2YWx1ZSwgbWF4LCBtaW4pIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PSAnbnVtYmVyJywgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKVxuICBhc3NlcnQodmFsdWUgPD0gbWF4LCAndmFsdWUgbGFyZ2VyIHRoYW4gbWF4aW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KHZhbHVlID49IG1pbiwgJ3ZhbHVlIHNtYWxsZXIgdGhhbiBtaW5pbXVtIGFsbG93ZWQgdmFsdWUnKVxufVxuXG5mdW5jdGlvbiBhc3NlcnQgKHRlc3QsIG1lc3NhZ2UpIHtcbiAgaWYgKCF0ZXN0KSB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSB8fCAnRmFpbGVkIGFzc2VydGlvbicpXG59XG5cbn0se1wiYmFzZTY0LWpzXCI6MyxcImllZWU3NTRcIjo0fV0sXCJuYXRpdmUtYnVmZmVyLWJyb3dzZXJpZnlcIjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5tb2R1bGUuZXhwb3J0cz1yZXF1aXJlKCdQY1pqOUwnKTtcbn0se31dLDM6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uIChleHBvcnRzKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgbG9va3VwID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nO1xuXG5cdGZ1bmN0aW9uIGI2NFRvQnl0ZUFycmF5KGI2NCkge1xuXHRcdHZhciBpLCBqLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyO1xuXHRcblx0XHRpZiAoYjY0Lmxlbmd0aCAlIDQgPiAwKSB7XG5cdFx0XHR0aHJvdyAnSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCc7XG5cdFx0fVxuXG5cdFx0Ly8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcblx0XHQvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG5cdFx0Ly8gcmVwcmVzZW50IG9uZSBieXRlXG5cdFx0Ly8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG5cdFx0Ly8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuXHRcdHBsYWNlSG9sZGVycyA9IGluZGV4T2YoYjY0LCAnPScpO1xuXHRcdHBsYWNlSG9sZGVycyA9IHBsYWNlSG9sZGVycyA+IDAgPyBiNjQubGVuZ3RoIC0gcGxhY2VIb2xkZXJzIDogMDtcblxuXHRcdC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuXHRcdGFyciA9IFtdOy8vbmV3IFVpbnQ4QXJyYXkoYjY0Lmxlbmd0aCAqIDMgLyA0IC0gcGxhY2VIb2xkZXJzKTtcblxuXHRcdC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcblx0XHRsID0gcGxhY2VIb2xkZXJzID4gMCA/IGI2NC5sZW5ndGggLSA0IDogYjY0Lmxlbmd0aDtcblxuXHRcdGZvciAoaSA9IDAsIGogPSAwOyBpIDwgbDsgaSArPSA0LCBqICs9IDMpIHtcblx0XHRcdHRtcCA9IChpbmRleE9mKGxvb2t1cCwgYjY0LmNoYXJBdChpKSkgPDwgMTgpIHwgKGluZGV4T2YobG9va3VwLCBiNjQuY2hhckF0KGkgKyAxKSkgPDwgMTIpIHwgKGluZGV4T2YobG9va3VwLCBiNjQuY2hhckF0KGkgKyAyKSkgPDwgNikgfCBpbmRleE9mKGxvb2t1cCwgYjY0LmNoYXJBdChpICsgMykpO1xuXHRcdFx0YXJyLnB1c2goKHRtcCAmIDB4RkYwMDAwKSA+PiAxNik7XG5cdFx0XHRhcnIucHVzaCgodG1wICYgMHhGRjAwKSA+PiA4KTtcblx0XHRcdGFyci5wdXNoKHRtcCAmIDB4RkYpO1xuXHRcdH1cblxuXHRcdGlmIChwbGFjZUhvbGRlcnMgPT09IDIpIHtcblx0XHRcdHRtcCA9IChpbmRleE9mKGxvb2t1cCwgYjY0LmNoYXJBdChpKSkgPDwgMikgfCAoaW5kZXhPZihsb29rdXAsIGI2NC5jaGFyQXQoaSArIDEpKSA+PiA0KTtcblx0XHRcdGFyci5wdXNoKHRtcCAmIDB4RkYpO1xuXHRcdH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG5cdFx0XHR0bXAgPSAoaW5kZXhPZihsb29rdXAsIGI2NC5jaGFyQXQoaSkpIDw8IDEwKSB8IChpbmRleE9mKGxvb2t1cCwgYjY0LmNoYXJBdChpICsgMSkpIDw8IDQpIHwgKGluZGV4T2YobG9va3VwLCBiNjQuY2hhckF0KGkgKyAyKSkgPj4gMik7XG5cdFx0XHRhcnIucHVzaCgodG1wID4+IDgpICYgMHhGRik7XG5cdFx0XHRhcnIucHVzaCh0bXAgJiAweEZGKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gYXJyO1xuXHR9XG5cblx0ZnVuY3Rpb24gdWludDhUb0Jhc2U2NCh1aW50OCkge1xuXHRcdHZhciBpLFxuXHRcdFx0ZXh0cmFCeXRlcyA9IHVpbnQ4Lmxlbmd0aCAlIDMsIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG5cdFx0XHRvdXRwdXQgPSBcIlwiLFxuXHRcdFx0dGVtcCwgbGVuZ3RoO1xuXG5cdFx0ZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcblx0XHRcdHJldHVybiBsb29rdXAuY2hhckF0KG51bSA+PiAxOCAmIDB4M0YpICsgbG9va3VwLmNoYXJBdChudW0gPj4gMTIgJiAweDNGKSArIGxvb2t1cC5jaGFyQXQobnVtID4+IDYgJiAweDNGKSArIGxvb2t1cC5jaGFyQXQobnVtICYgMHgzRik7XG5cdFx0fTtcblxuXHRcdC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcblx0XHRmb3IgKGkgPSAwLCBsZW5ndGggPSB1aW50OC5sZW5ndGggLSBleHRyYUJ5dGVzOyBpIDwgbGVuZ3RoOyBpICs9IDMpIHtcblx0XHRcdHRlbXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pO1xuXHRcdFx0b3V0cHV0ICs9IHRyaXBsZXRUb0Jhc2U2NCh0ZW1wKTtcblx0XHR9XG5cblx0XHQvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG5cdFx0c3dpdGNoIChleHRyYUJ5dGVzKSB7XG5cdFx0XHRjYXNlIDE6XG5cdFx0XHRcdHRlbXAgPSB1aW50OFt1aW50OC5sZW5ndGggLSAxXTtcblx0XHRcdFx0b3V0cHV0ICs9IGxvb2t1cC5jaGFyQXQodGVtcCA+PiAyKTtcblx0XHRcdFx0b3V0cHV0ICs9IGxvb2t1cC5jaGFyQXQoKHRlbXAgPDwgNCkgJiAweDNGKTtcblx0XHRcdFx0b3V0cHV0ICs9ICc9PSc7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHR0ZW1wID0gKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDJdIDw8IDgpICsgKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdKTtcblx0XHRcdFx0b3V0cHV0ICs9IGxvb2t1cC5jaGFyQXQodGVtcCA+PiAxMCk7XG5cdFx0XHRcdG91dHB1dCArPSBsb29rdXAuY2hhckF0KCh0ZW1wID4+IDQpICYgMHgzRik7XG5cdFx0XHRcdG91dHB1dCArPSBsb29rdXAuY2hhckF0KCh0ZW1wIDw8IDIpICYgMHgzRik7XG5cdFx0XHRcdG91dHB1dCArPSAnPSc7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH1cblxuXHRtb2R1bGUuZXhwb3J0cy50b0J5dGVBcnJheSA9IGI2NFRvQnl0ZUFycmF5O1xuXHRtb2R1bGUuZXhwb3J0cy5mcm9tQnl0ZUFycmF5ID0gdWludDhUb0Jhc2U2NDtcbn0oKSk7XG5cbmZ1bmN0aW9uIGluZGV4T2YgKGFyciwgZWx0IC8qLCBmcm9tKi8pIHtcblx0dmFyIGxlbiA9IGFyci5sZW5ndGg7XG5cblx0dmFyIGZyb20gPSBOdW1iZXIoYXJndW1lbnRzWzFdKSB8fCAwO1xuXHRmcm9tID0gKGZyb20gPCAwKVxuXHRcdD8gTWF0aC5jZWlsKGZyb20pXG5cdFx0OiBNYXRoLmZsb29yKGZyb20pO1xuXHRpZiAoZnJvbSA8IDApXG5cdFx0ZnJvbSArPSBsZW47XG5cblx0Zm9yICg7IGZyb20gPCBsZW47IGZyb20rKykge1xuXHRcdGlmICgodHlwZW9mIGFyciA9PT0gJ3N0cmluZycgJiYgYXJyLmNoYXJBdChmcm9tKSA9PT0gZWx0KSB8fFxuXHRcdFx0XHQodHlwZW9mIGFyciAhPT0gJ3N0cmluZycgJiYgYXJyW2Zyb21dID09PSBlbHQpKSB7XG5cdFx0XHRyZXR1cm4gZnJvbTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIC0xO1xufVxuXG59LHt9XSw0OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbmV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sXG4gICAgICBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxLFxuICAgICAgZU1heCA9ICgxIDw8IGVMZW4pIC0gMSxcbiAgICAgIGVCaWFzID0gZU1heCA+PiAxLFxuICAgICAgbkJpdHMgPSAtNyxcbiAgICAgIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMCxcbiAgICAgIGQgPSBpc0xFID8gLTEgOiAxLFxuICAgICAgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXTtcblxuICBpICs9IGQ7XG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIHMgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBlTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKTtcbiAgZSA+Pj0gKC1uQml0cyk7XG4gIG5CaXRzICs9IG1MZW47XG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpO1xuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhcztcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpO1xuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbik7XG4gICAgZSA9IGUgLSBlQmlhcztcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKTtcbn07XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbihidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgYyxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMCksXG4gICAgICBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSksXG4gICAgICBkID0gaXNMRSA/IDEgOiAtMSxcbiAgICAgIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDA7XG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSk7XG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDA7XG4gICAgZSA9IGVNYXg7XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpO1xuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLTtcbiAgICAgIGMgKj0gMjtcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKys7XG4gICAgICBjIC89IDI7XG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMDtcbiAgICAgIGUgPSBlTWF4O1xuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAodmFsdWUgKiBjIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSBlICsgZUJpYXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSAwO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpO1xuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG07XG4gIGVMZW4gKz0gbUxlbjtcbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KTtcblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjg7XG59O1xuXG59LHt9XX0se30sW10pXG47O21vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJuYXRpdmUtYnVmZmVyLWJyb3dzZXJpZnlcIikuQnVmZmVyXG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgaWYgKGV2LnNvdXJjZSA9PT0gd2luZG93ICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsInZhciBnbG9iYWw9dHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9Oy8qISBodHRwOi8vbXRocy5iZS9wdW55Y29kZSB2MS4yLjMgYnkgQG1hdGhpYXMgKi9cbjsoZnVuY3Rpb24ocm9vdCkge1xuXG5cdC8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZXMgKi9cblx0dmFyIGZyZWVFeHBvcnRzID0gdHlwZW9mIGV4cG9ydHMgPT0gJ29iamVjdCcgJiYgZXhwb3J0cztcblx0dmFyIGZyZWVNb2R1bGUgPSB0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIG1vZHVsZSAmJlxuXHRcdG1vZHVsZS5leHBvcnRzID09IGZyZWVFeHBvcnRzICYmIG1vZHVsZTtcblx0dmFyIGZyZWVHbG9iYWwgPSB0eXBlb2YgZ2xvYmFsID09ICdvYmplY3QnICYmIGdsb2JhbDtcblx0aWYgKGZyZWVHbG9iYWwuZ2xvYmFsID09PSBmcmVlR2xvYmFsIHx8IGZyZWVHbG9iYWwud2luZG93ID09PSBmcmVlR2xvYmFsKSB7XG5cdFx0cm9vdCA9IGZyZWVHbG9iYWw7XG5cdH1cblxuXHQvKipcblx0ICogVGhlIGBwdW55Y29kZWAgb2JqZWN0LlxuXHQgKiBAbmFtZSBwdW55Y29kZVxuXHQgKiBAdHlwZSBPYmplY3Rcblx0ICovXG5cdHZhciBwdW55Y29kZSxcblxuXHQvKiogSGlnaGVzdCBwb3NpdGl2ZSBzaWduZWQgMzItYml0IGZsb2F0IHZhbHVlICovXG5cdG1heEludCA9IDIxNDc0ODM2NDcsIC8vIGFrYS4gMHg3RkZGRkZGRiBvciAyXjMxLTFcblxuXHQvKiogQm9vdHN0cmluZyBwYXJhbWV0ZXJzICovXG5cdGJhc2UgPSAzNixcblx0dE1pbiA9IDEsXG5cdHRNYXggPSAyNixcblx0c2tldyA9IDM4LFxuXHRkYW1wID0gNzAwLFxuXHRpbml0aWFsQmlhcyA9IDcyLFxuXHRpbml0aWFsTiA9IDEyOCwgLy8gMHg4MFxuXHRkZWxpbWl0ZXIgPSAnLScsIC8vICdcXHgyRCdcblxuXHQvKiogUmVndWxhciBleHByZXNzaW9ucyAqL1xuXHRyZWdleFB1bnljb2RlID0gL154bi0tLyxcblx0cmVnZXhOb25BU0NJSSA9IC9bXiAtfl0vLCAvLyB1bnByaW50YWJsZSBBU0NJSSBjaGFycyArIG5vbi1BU0NJSSBjaGFyc1xuXHRyZWdleFNlcGFyYXRvcnMgPSAvXFx4MkV8XFx1MzAwMnxcXHVGRjBFfFxcdUZGNjEvZywgLy8gUkZDIDM0OTAgc2VwYXJhdG9yc1xuXG5cdC8qKiBFcnJvciBtZXNzYWdlcyAqL1xuXHRlcnJvcnMgPSB7XG5cdFx0J292ZXJmbG93JzogJ092ZXJmbG93OiBpbnB1dCBuZWVkcyB3aWRlciBpbnRlZ2VycyB0byBwcm9jZXNzJyxcblx0XHQnbm90LWJhc2ljJzogJ0lsbGVnYWwgaW5wdXQgPj0gMHg4MCAobm90IGEgYmFzaWMgY29kZSBwb2ludCknLFxuXHRcdCdpbnZhbGlkLWlucHV0JzogJ0ludmFsaWQgaW5wdXQnXG5cdH0sXG5cblx0LyoqIENvbnZlbmllbmNlIHNob3J0Y3V0cyAqL1xuXHRiYXNlTWludXNUTWluID0gYmFzZSAtIHRNaW4sXG5cdGZsb29yID0gTWF0aC5mbG9vcixcblx0c3RyaW5nRnJvbUNoYXJDb2RlID0gU3RyaW5nLmZyb21DaGFyQ29kZSxcblxuXHQvKiogVGVtcG9yYXJ5IHZhcmlhYmxlICovXG5cdGtleTtcblxuXHQvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuXHQvKipcblx0ICogQSBnZW5lcmljIGVycm9yIHV0aWxpdHkgZnVuY3Rpb24uXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlIFRoZSBlcnJvciB0eXBlLlxuXHQgKiBAcmV0dXJucyB7RXJyb3J9IFRocm93cyBhIGBSYW5nZUVycm9yYCB3aXRoIHRoZSBhcHBsaWNhYmxlIGVycm9yIG1lc3NhZ2UuXG5cdCAqL1xuXHRmdW5jdGlvbiBlcnJvcih0eXBlKSB7XG5cdFx0dGhyb3cgUmFuZ2VFcnJvcihlcnJvcnNbdHlwZV0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIEEgZ2VuZXJpYyBgQXJyYXkjbWFwYCB1dGlsaXR5IGZ1bmN0aW9uLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge0FycmF5fSBhcnJheSBUaGUgYXJyYXkgdG8gaXRlcmF0ZSBvdmVyLlxuXHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdGhhdCBnZXRzIGNhbGxlZCBmb3IgZXZlcnkgYXJyYXlcblx0ICogaXRlbS5cblx0ICogQHJldHVybnMge0FycmF5fSBBIG5ldyBhcnJheSBvZiB2YWx1ZXMgcmV0dXJuZWQgYnkgdGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZnVuY3Rpb24gbWFwKGFycmF5LCBmbikge1xuXHRcdHZhciBsZW5ndGggPSBhcnJheS5sZW5ndGg7XG5cdFx0d2hpbGUgKGxlbmd0aC0tKSB7XG5cdFx0XHRhcnJheVtsZW5ndGhdID0gZm4oYXJyYXlbbGVuZ3RoXSk7XG5cdFx0fVxuXHRcdHJldHVybiBhcnJheTtcblx0fVxuXG5cdC8qKlxuXHQgKiBBIHNpbXBsZSBgQXJyYXkjbWFwYC1saWtlIHdyYXBwZXIgdG8gd29yayB3aXRoIGRvbWFpbiBuYW1lIHN0cmluZ3MuXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBkb21haW4gVGhlIGRvbWFpbiBuYW1lLlxuXHQgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdGhhdCBnZXRzIGNhbGxlZCBmb3IgZXZlcnlcblx0ICogY2hhcmFjdGVyLlxuXHQgKiBAcmV0dXJucyB7QXJyYXl9IEEgbmV3IHN0cmluZyBvZiBjaGFyYWN0ZXJzIHJldHVybmVkIGJ5IHRoZSBjYWxsYmFja1xuXHQgKiBmdW5jdGlvbi5cblx0ICovXG5cdGZ1bmN0aW9uIG1hcERvbWFpbihzdHJpbmcsIGZuKSB7XG5cdFx0cmV0dXJuIG1hcChzdHJpbmcuc3BsaXQocmVnZXhTZXBhcmF0b3JzKSwgZm4pLmpvaW4oJy4nKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIG51bWVyaWMgY29kZSBwb2ludHMgb2YgZWFjaCBVbmljb2RlXG5cdCAqIGNoYXJhY3RlciBpbiB0aGUgc3RyaW5nLiBXaGlsZSBKYXZhU2NyaXB0IHVzZXMgVUNTLTIgaW50ZXJuYWxseSxcblx0ICogdGhpcyBmdW5jdGlvbiB3aWxsIGNvbnZlcnQgYSBwYWlyIG9mIHN1cnJvZ2F0ZSBoYWx2ZXMgKGVhY2ggb2Ygd2hpY2hcblx0ICogVUNTLTIgZXhwb3NlcyBhcyBzZXBhcmF0ZSBjaGFyYWN0ZXJzKSBpbnRvIGEgc2luZ2xlIGNvZGUgcG9pbnQsXG5cdCAqIG1hdGNoaW5nIFVURi0xNi5cblx0ICogQHNlZSBgcHVueWNvZGUudWNzMi5lbmNvZGVgXG5cdCAqIEBzZWUgPGh0dHA6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2phdmFzY3JpcHQtZW5jb2Rpbmc+XG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZS51Y3MyXG5cdCAqIEBuYW1lIGRlY29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gc3RyaW5nIFRoZSBVbmljb2RlIGlucHV0IHN0cmluZyAoVUNTLTIpLlxuXHQgKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBuZXcgYXJyYXkgb2YgY29kZSBwb2ludHMuXG5cdCAqL1xuXHRmdW5jdGlvbiB1Y3MyZGVjb2RlKHN0cmluZykge1xuXHRcdHZhciBvdXRwdXQgPSBbXSxcblx0XHQgICAgY291bnRlciA9IDAsXG5cdFx0ICAgIGxlbmd0aCA9IHN0cmluZy5sZW5ndGgsXG5cdFx0ICAgIHZhbHVlLFxuXHRcdCAgICBleHRyYTtcblx0XHR3aGlsZSAoY291bnRlciA8IGxlbmd0aCkge1xuXHRcdFx0dmFsdWUgPSBzdHJpbmcuY2hhckNvZGVBdChjb3VudGVyKyspO1xuXHRcdFx0aWYgKHZhbHVlID49IDB4RDgwMCAmJiB2YWx1ZSA8PSAweERCRkYgJiYgY291bnRlciA8IGxlbmd0aCkge1xuXHRcdFx0XHQvLyBoaWdoIHN1cnJvZ2F0ZSwgYW5kIHRoZXJlIGlzIGEgbmV4dCBjaGFyYWN0ZXJcblx0XHRcdFx0ZXh0cmEgPSBzdHJpbmcuY2hhckNvZGVBdChjb3VudGVyKyspO1xuXHRcdFx0XHRpZiAoKGV4dHJhICYgMHhGQzAwKSA9PSAweERDMDApIHsgLy8gbG93IHN1cnJvZ2F0ZVxuXHRcdFx0XHRcdG91dHB1dC5wdXNoKCgodmFsdWUgJiAweDNGRikgPDwgMTApICsgKGV4dHJhICYgMHgzRkYpICsgMHgxMDAwMCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gdW5tYXRjaGVkIHN1cnJvZ2F0ZTsgb25seSBhcHBlbmQgdGhpcyBjb2RlIHVuaXQsIGluIGNhc2UgdGhlIG5leHRcblx0XHRcdFx0XHQvLyBjb2RlIHVuaXQgaXMgdGhlIGhpZ2ggc3Vycm9nYXRlIG9mIGEgc3Vycm9nYXRlIHBhaXJcblx0XHRcdFx0XHRvdXRwdXQucHVzaCh2YWx1ZSk7XG5cdFx0XHRcdFx0Y291bnRlci0tO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRvdXRwdXQucHVzaCh2YWx1ZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH1cblxuXHQvKipcblx0ICogQ3JlYXRlcyBhIHN0cmluZyBiYXNlZCBvbiBhbiBhcnJheSBvZiBudW1lcmljIGNvZGUgcG9pbnRzLlxuXHQgKiBAc2VlIGBwdW55Y29kZS51Y3MyLmRlY29kZWBcblx0ICogQG1lbWJlck9mIHB1bnljb2RlLnVjczJcblx0ICogQG5hbWUgZW5jb2RlXG5cdCAqIEBwYXJhbSB7QXJyYXl9IGNvZGVQb2ludHMgVGhlIGFycmF5IG9mIG51bWVyaWMgY29kZSBwb2ludHMuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBuZXcgVW5pY29kZSBzdHJpbmcgKFVDUy0yKS5cblx0ICovXG5cdGZ1bmN0aW9uIHVjczJlbmNvZGUoYXJyYXkpIHtcblx0XHRyZXR1cm4gbWFwKGFycmF5LCBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0dmFyIG91dHB1dCA9ICcnO1xuXHRcdFx0aWYgKHZhbHVlID4gMHhGRkZGKSB7XG5cdFx0XHRcdHZhbHVlIC09IDB4MTAwMDA7XG5cdFx0XHRcdG91dHB1dCArPSBzdHJpbmdGcm9tQ2hhckNvZGUodmFsdWUgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApO1xuXHRcdFx0XHR2YWx1ZSA9IDB4REMwMCB8IHZhbHVlICYgMHgzRkY7XG5cdFx0XHR9XG5cdFx0XHRvdXRwdXQgKz0gc3RyaW5nRnJvbUNoYXJDb2RlKHZhbHVlKTtcblx0XHRcdHJldHVybiBvdXRwdXQ7XG5cdFx0fSkuam9pbignJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBiYXNpYyBjb2RlIHBvaW50IGludG8gYSBkaWdpdC9pbnRlZ2VyLlxuXHQgKiBAc2VlIGBkaWdpdFRvQmFzaWMoKWBcblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGNvZGVQb2ludCBUaGUgYmFzaWMgbnVtZXJpYyBjb2RlIHBvaW50IHZhbHVlLlxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgbnVtZXJpYyB2YWx1ZSBvZiBhIGJhc2ljIGNvZGUgcG9pbnQgKGZvciB1c2UgaW5cblx0ICogcmVwcmVzZW50aW5nIGludGVnZXJzKSBpbiB0aGUgcmFuZ2UgYDBgIHRvIGBiYXNlIC0gMWAsIG9yIGBiYXNlYCBpZlxuXHQgKiB0aGUgY29kZSBwb2ludCBkb2VzIG5vdCByZXByZXNlbnQgYSB2YWx1ZS5cblx0ICovXG5cdGZ1bmN0aW9uIGJhc2ljVG9EaWdpdChjb2RlUG9pbnQpIHtcblx0XHRpZiAoY29kZVBvaW50IC0gNDggPCAxMCkge1xuXHRcdFx0cmV0dXJuIGNvZGVQb2ludCAtIDIyO1xuXHRcdH1cblx0XHRpZiAoY29kZVBvaW50IC0gNjUgPCAyNikge1xuXHRcdFx0cmV0dXJuIGNvZGVQb2ludCAtIDY1O1xuXHRcdH1cblx0XHRpZiAoY29kZVBvaW50IC0gOTcgPCAyNikge1xuXHRcdFx0cmV0dXJuIGNvZGVQb2ludCAtIDk3O1xuXHRcdH1cblx0XHRyZXR1cm4gYmFzZTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIGRpZ2l0L2ludGVnZXIgaW50byBhIGJhc2ljIGNvZGUgcG9pbnQuXG5cdCAqIEBzZWUgYGJhc2ljVG9EaWdpdCgpYFxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge051bWJlcn0gZGlnaXQgVGhlIG51bWVyaWMgdmFsdWUgb2YgYSBiYXNpYyBjb2RlIHBvaW50LlxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgYmFzaWMgY29kZSBwb2ludCB3aG9zZSB2YWx1ZSAod2hlbiB1c2VkIGZvclxuXHQgKiByZXByZXNlbnRpbmcgaW50ZWdlcnMpIGlzIGBkaWdpdGAsIHdoaWNoIG5lZWRzIHRvIGJlIGluIHRoZSByYW5nZVxuXHQgKiBgMGAgdG8gYGJhc2UgLSAxYC4gSWYgYGZsYWdgIGlzIG5vbi16ZXJvLCB0aGUgdXBwZXJjYXNlIGZvcm0gaXNcblx0ICogdXNlZDsgZWxzZSwgdGhlIGxvd2VyY2FzZSBmb3JtIGlzIHVzZWQuIFRoZSBiZWhhdmlvciBpcyB1bmRlZmluZWRcblx0ICogaWYgYGZsYWdgIGlzIG5vbi16ZXJvIGFuZCBgZGlnaXRgIGhhcyBubyB1cHBlcmNhc2UgZm9ybS5cblx0ICovXG5cdGZ1bmN0aW9uIGRpZ2l0VG9CYXNpYyhkaWdpdCwgZmxhZykge1xuXHRcdC8vICAwLi4yNSBtYXAgdG8gQVNDSUkgYS4ueiBvciBBLi5aXG5cdFx0Ly8gMjYuLjM1IG1hcCB0byBBU0NJSSAwLi45XG5cdFx0cmV0dXJuIGRpZ2l0ICsgMjIgKyA3NSAqIChkaWdpdCA8IDI2KSAtICgoZmxhZyAhPSAwKSA8PCA1KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBCaWFzIGFkYXB0YXRpb24gZnVuY3Rpb24gYXMgcGVyIHNlY3Rpb24gMy40IG9mIFJGQyAzNDkyLlxuXHQgKiBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNDkyI3NlY3Rpb24tMy40XG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRmdW5jdGlvbiBhZGFwdChkZWx0YSwgbnVtUG9pbnRzLCBmaXJzdFRpbWUpIHtcblx0XHR2YXIgayA9IDA7XG5cdFx0ZGVsdGEgPSBmaXJzdFRpbWUgPyBmbG9vcihkZWx0YSAvIGRhbXApIDogZGVsdGEgPj4gMTtcblx0XHRkZWx0YSArPSBmbG9vcihkZWx0YSAvIG51bVBvaW50cyk7XG5cdFx0Zm9yICgvKiBubyBpbml0aWFsaXphdGlvbiAqLzsgZGVsdGEgPiBiYXNlTWludXNUTWluICogdE1heCA+PiAxOyBrICs9IGJhc2UpIHtcblx0XHRcdGRlbHRhID0gZmxvb3IoZGVsdGEgLyBiYXNlTWludXNUTWluKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZsb29yKGsgKyAoYmFzZU1pbnVzVE1pbiArIDEpICogZGVsdGEgLyAoZGVsdGEgKyBza2V3KSk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzIHRvIGEgc3RyaW5nIG9mIFVuaWNvZGVcblx0ICogc3ltYm9scy5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBpbnB1dCBUaGUgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIHJlc3VsdGluZyBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzLlxuXHQgKi9cblx0ZnVuY3Rpb24gZGVjb2RlKGlucHV0KSB7XG5cdFx0Ly8gRG9uJ3QgdXNlIFVDUy0yXG5cdFx0dmFyIG91dHB1dCA9IFtdLFxuXHRcdCAgICBpbnB1dExlbmd0aCA9IGlucHV0Lmxlbmd0aCxcblx0XHQgICAgb3V0LFxuXHRcdCAgICBpID0gMCxcblx0XHQgICAgbiA9IGluaXRpYWxOLFxuXHRcdCAgICBiaWFzID0gaW5pdGlhbEJpYXMsXG5cdFx0ICAgIGJhc2ljLFxuXHRcdCAgICBqLFxuXHRcdCAgICBpbmRleCxcblx0XHQgICAgb2xkaSxcblx0XHQgICAgdyxcblx0XHQgICAgayxcblx0XHQgICAgZGlnaXQsXG5cdFx0ICAgIHQsXG5cdFx0ICAgIGxlbmd0aCxcblx0XHQgICAgLyoqIENhY2hlZCBjYWxjdWxhdGlvbiByZXN1bHRzICovXG5cdFx0ICAgIGJhc2VNaW51c1Q7XG5cblx0XHQvLyBIYW5kbGUgdGhlIGJhc2ljIGNvZGUgcG9pbnRzOiBsZXQgYGJhc2ljYCBiZSB0aGUgbnVtYmVyIG9mIGlucHV0IGNvZGVcblx0XHQvLyBwb2ludHMgYmVmb3JlIHRoZSBsYXN0IGRlbGltaXRlciwgb3IgYDBgIGlmIHRoZXJlIGlzIG5vbmUsIHRoZW4gY29weVxuXHRcdC8vIHRoZSBmaXJzdCBiYXNpYyBjb2RlIHBvaW50cyB0byB0aGUgb3V0cHV0LlxuXG5cdFx0YmFzaWMgPSBpbnB1dC5sYXN0SW5kZXhPZihkZWxpbWl0ZXIpO1xuXHRcdGlmIChiYXNpYyA8IDApIHtcblx0XHRcdGJhc2ljID0gMDtcblx0XHR9XG5cblx0XHRmb3IgKGogPSAwOyBqIDwgYmFzaWM7ICsraikge1xuXHRcdFx0Ly8gaWYgaXQncyBub3QgYSBiYXNpYyBjb2RlIHBvaW50XG5cdFx0XHRpZiAoaW5wdXQuY2hhckNvZGVBdChqKSA+PSAweDgwKSB7XG5cdFx0XHRcdGVycm9yKCdub3QtYmFzaWMnKTtcblx0XHRcdH1cblx0XHRcdG91dHB1dC5wdXNoKGlucHV0LmNoYXJDb2RlQXQoaikpO1xuXHRcdH1cblxuXHRcdC8vIE1haW4gZGVjb2RpbmcgbG9vcDogc3RhcnQganVzdCBhZnRlciB0aGUgbGFzdCBkZWxpbWl0ZXIgaWYgYW55IGJhc2ljIGNvZGVcblx0XHQvLyBwb2ludHMgd2VyZSBjb3BpZWQ7IHN0YXJ0IGF0IHRoZSBiZWdpbm5pbmcgb3RoZXJ3aXNlLlxuXG5cdFx0Zm9yIChpbmRleCA9IGJhc2ljID4gMCA/IGJhc2ljICsgMSA6IDA7IGluZGV4IDwgaW5wdXRMZW5ndGg7IC8qIG5vIGZpbmFsIGV4cHJlc3Npb24gKi8pIHtcblxuXHRcdFx0Ly8gYGluZGV4YCBpcyB0aGUgaW5kZXggb2YgdGhlIG5leHQgY2hhcmFjdGVyIHRvIGJlIGNvbnN1bWVkLlxuXHRcdFx0Ly8gRGVjb2RlIGEgZ2VuZXJhbGl6ZWQgdmFyaWFibGUtbGVuZ3RoIGludGVnZXIgaW50byBgZGVsdGFgLFxuXHRcdFx0Ly8gd2hpY2ggZ2V0cyBhZGRlZCB0byBgaWAuIFRoZSBvdmVyZmxvdyBjaGVja2luZyBpcyBlYXNpZXJcblx0XHRcdC8vIGlmIHdlIGluY3JlYXNlIGBpYCBhcyB3ZSBnbywgdGhlbiBzdWJ0cmFjdCBvZmYgaXRzIHN0YXJ0aW5nXG5cdFx0XHQvLyB2YWx1ZSBhdCB0aGUgZW5kIHRvIG9idGFpbiBgZGVsdGFgLlxuXHRcdFx0Zm9yIChvbGRpID0gaSwgdyA9IDEsIGsgPSBiYXNlOyAvKiBubyBjb25kaXRpb24gKi87IGsgKz0gYmFzZSkge1xuXG5cdFx0XHRcdGlmIChpbmRleCA+PSBpbnB1dExlbmd0aCkge1xuXHRcdFx0XHRcdGVycm9yKCdpbnZhbGlkLWlucHV0Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRkaWdpdCA9IGJhc2ljVG9EaWdpdChpbnB1dC5jaGFyQ29kZUF0KGluZGV4KyspKTtcblxuXHRcdFx0XHRpZiAoZGlnaXQgPj0gYmFzZSB8fCBkaWdpdCA+IGZsb29yKChtYXhJbnQgLSBpKSAvIHcpKSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpICs9IGRpZ2l0ICogdztcblx0XHRcdFx0dCA9IGsgPD0gYmlhcyA/IHRNaW4gOiAoayA+PSBiaWFzICsgdE1heCA/IHRNYXggOiBrIC0gYmlhcyk7XG5cblx0XHRcdFx0aWYgKGRpZ2l0IDwgdCkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YmFzZU1pbnVzVCA9IGJhc2UgLSB0O1xuXHRcdFx0XHRpZiAodyA+IGZsb29yKG1heEludCAvIGJhc2VNaW51c1QpKSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR3ICo9IGJhc2VNaW51c1Q7XG5cblx0XHRcdH1cblxuXHRcdFx0b3V0ID0gb3V0cHV0Lmxlbmd0aCArIDE7XG5cdFx0XHRiaWFzID0gYWRhcHQoaSAtIG9sZGksIG91dCwgb2xkaSA9PSAwKTtcblxuXHRcdFx0Ly8gYGlgIHdhcyBzdXBwb3NlZCB0byB3cmFwIGFyb3VuZCBmcm9tIGBvdXRgIHRvIGAwYCxcblx0XHRcdC8vIGluY3JlbWVudGluZyBgbmAgZWFjaCB0aW1lLCBzbyB3ZSdsbCBmaXggdGhhdCBub3c6XG5cdFx0XHRpZiAoZmxvb3IoaSAvIG91dCkgPiBtYXhJbnQgLSBuKSB7XG5cdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0fVxuXG5cdFx0XHRuICs9IGZsb29yKGkgLyBvdXQpO1xuXHRcdFx0aSAlPSBvdXQ7XG5cblx0XHRcdC8vIEluc2VydCBgbmAgYXQgcG9zaXRpb24gYGlgIG9mIHRoZSBvdXRwdXRcblx0XHRcdG91dHB1dC5zcGxpY2UoaSsrLCAwLCBuKTtcblxuXHRcdH1cblxuXHRcdHJldHVybiB1Y3MyZW5jb2RlKG91dHB1dCk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzIHRvIGEgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHlcblx0ICogc3ltYm9scy5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBpbnB1dCBUaGUgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIHJlc3VsdGluZyBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzLlxuXHQgKi9cblx0ZnVuY3Rpb24gZW5jb2RlKGlucHV0KSB7XG5cdFx0dmFyIG4sXG5cdFx0ICAgIGRlbHRhLFxuXHRcdCAgICBoYW5kbGVkQ1BDb3VudCxcblx0XHQgICAgYmFzaWNMZW5ndGgsXG5cdFx0ICAgIGJpYXMsXG5cdFx0ICAgIGosXG5cdFx0ICAgIG0sXG5cdFx0ICAgIHEsXG5cdFx0ICAgIGssXG5cdFx0ICAgIHQsXG5cdFx0ICAgIGN1cnJlbnRWYWx1ZSxcblx0XHQgICAgb3V0cHV0ID0gW10sXG5cdFx0ICAgIC8qKiBgaW5wdXRMZW5ndGhgIHdpbGwgaG9sZCB0aGUgbnVtYmVyIG9mIGNvZGUgcG9pbnRzIGluIGBpbnB1dGAuICovXG5cdFx0ICAgIGlucHV0TGVuZ3RoLFxuXHRcdCAgICAvKiogQ2FjaGVkIGNhbGN1bGF0aW9uIHJlc3VsdHMgKi9cblx0XHQgICAgaGFuZGxlZENQQ291bnRQbHVzT25lLFxuXHRcdCAgICBiYXNlTWludXNULFxuXHRcdCAgICBxTWludXNUO1xuXG5cdFx0Ly8gQ29udmVydCB0aGUgaW5wdXQgaW4gVUNTLTIgdG8gVW5pY29kZVxuXHRcdGlucHV0ID0gdWNzMmRlY29kZShpbnB1dCk7XG5cblx0XHQvLyBDYWNoZSB0aGUgbGVuZ3RoXG5cdFx0aW5wdXRMZW5ndGggPSBpbnB1dC5sZW5ndGg7XG5cblx0XHQvLyBJbml0aWFsaXplIHRoZSBzdGF0ZVxuXHRcdG4gPSBpbml0aWFsTjtcblx0XHRkZWx0YSA9IDA7XG5cdFx0YmlhcyA9IGluaXRpYWxCaWFzO1xuXG5cdFx0Ly8gSGFuZGxlIHRoZSBiYXNpYyBjb2RlIHBvaW50c1xuXHRcdGZvciAoaiA9IDA7IGogPCBpbnB1dExlbmd0aDsgKytqKSB7XG5cdFx0XHRjdXJyZW50VmFsdWUgPSBpbnB1dFtqXTtcblx0XHRcdGlmIChjdXJyZW50VmFsdWUgPCAweDgwKSB7XG5cdFx0XHRcdG91dHB1dC5wdXNoKHN0cmluZ0Zyb21DaGFyQ29kZShjdXJyZW50VmFsdWUpKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRoYW5kbGVkQ1BDb3VudCA9IGJhc2ljTGVuZ3RoID0gb3V0cHV0Lmxlbmd0aDtcblxuXHRcdC8vIGBoYW5kbGVkQ1BDb3VudGAgaXMgdGhlIG51bWJlciBvZiBjb2RlIHBvaW50cyB0aGF0IGhhdmUgYmVlbiBoYW5kbGVkO1xuXHRcdC8vIGBiYXNpY0xlbmd0aGAgaXMgdGhlIG51bWJlciBvZiBiYXNpYyBjb2RlIHBvaW50cy5cblxuXHRcdC8vIEZpbmlzaCB0aGUgYmFzaWMgc3RyaW5nIC0gaWYgaXQgaXMgbm90IGVtcHR5IC0gd2l0aCBhIGRlbGltaXRlclxuXHRcdGlmIChiYXNpY0xlbmd0aCkge1xuXHRcdFx0b3V0cHV0LnB1c2goZGVsaW1pdGVyKTtcblx0XHR9XG5cblx0XHQvLyBNYWluIGVuY29kaW5nIGxvb3A6XG5cdFx0d2hpbGUgKGhhbmRsZWRDUENvdW50IDwgaW5wdXRMZW5ndGgpIHtcblxuXHRcdFx0Ly8gQWxsIG5vbi1iYXNpYyBjb2RlIHBvaW50cyA8IG4gaGF2ZSBiZWVuIGhhbmRsZWQgYWxyZWFkeS4gRmluZCB0aGUgbmV4dFxuXHRcdFx0Ly8gbGFyZ2VyIG9uZTpcblx0XHRcdGZvciAobSA9IG1heEludCwgaiA9IDA7IGogPCBpbnB1dExlbmd0aDsgKytqKSB7XG5cdFx0XHRcdGN1cnJlbnRWYWx1ZSA9IGlucHV0W2pdO1xuXHRcdFx0XHRpZiAoY3VycmVudFZhbHVlID49IG4gJiYgY3VycmVudFZhbHVlIDwgbSkge1xuXHRcdFx0XHRcdG0gPSBjdXJyZW50VmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gSW5jcmVhc2UgYGRlbHRhYCBlbm91Z2ggdG8gYWR2YW5jZSB0aGUgZGVjb2RlcidzIDxuLGk+IHN0YXRlIHRvIDxtLDA+LFxuXHRcdFx0Ly8gYnV0IGd1YXJkIGFnYWluc3Qgb3ZlcmZsb3dcblx0XHRcdGhhbmRsZWRDUENvdW50UGx1c09uZSA9IGhhbmRsZWRDUENvdW50ICsgMTtcblx0XHRcdGlmIChtIC0gbiA+IGZsb29yKChtYXhJbnQgLSBkZWx0YSkgLyBoYW5kbGVkQ1BDb3VudFBsdXNPbmUpKSB7XG5cdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0fVxuXG5cdFx0XHRkZWx0YSArPSAobSAtIG4pICogaGFuZGxlZENQQ291bnRQbHVzT25lO1xuXHRcdFx0biA9IG07XG5cblx0XHRcdGZvciAoaiA9IDA7IGogPCBpbnB1dExlbmd0aDsgKytqKSB7XG5cdFx0XHRcdGN1cnJlbnRWYWx1ZSA9IGlucHV0W2pdO1xuXG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPCBuICYmICsrZGVsdGEgPiBtYXhJbnQpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPT0gbikge1xuXHRcdFx0XHRcdC8vIFJlcHJlc2VudCBkZWx0YSBhcyBhIGdlbmVyYWxpemVkIHZhcmlhYmxlLWxlbmd0aCBpbnRlZ2VyXG5cdFx0XHRcdFx0Zm9yIChxID0gZGVsdGEsIGsgPSBiYXNlOyAvKiBubyBjb25kaXRpb24gKi87IGsgKz0gYmFzZSkge1xuXHRcdFx0XHRcdFx0dCA9IGsgPD0gYmlhcyA/IHRNaW4gOiAoayA+PSBiaWFzICsgdE1heCA/IHRNYXggOiBrIC0gYmlhcyk7XG5cdFx0XHRcdFx0XHRpZiAocSA8IHQpIHtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRxTWludXNUID0gcSAtIHQ7XG5cdFx0XHRcdFx0XHRiYXNlTWludXNUID0gYmFzZSAtIHQ7XG5cdFx0XHRcdFx0XHRvdXRwdXQucHVzaChcblx0XHRcdFx0XHRcdFx0c3RyaW5nRnJvbUNoYXJDb2RlKGRpZ2l0VG9CYXNpYyh0ICsgcU1pbnVzVCAlIGJhc2VNaW51c1QsIDApKVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdHEgPSBmbG9vcihxTWludXNUIC8gYmFzZU1pbnVzVCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2goc3RyaW5nRnJvbUNoYXJDb2RlKGRpZ2l0VG9CYXNpYyhxLCAwKSkpO1xuXHRcdFx0XHRcdGJpYXMgPSBhZGFwdChkZWx0YSwgaGFuZGxlZENQQ291bnRQbHVzT25lLCBoYW5kbGVkQ1BDb3VudCA9PSBiYXNpY0xlbmd0aCk7XG5cdFx0XHRcdFx0ZGVsdGEgPSAwO1xuXHRcdFx0XHRcdCsraGFuZGxlZENQQ291bnQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0KytkZWx0YTtcblx0XHRcdCsrbjtcblxuXHRcdH1cblx0XHRyZXR1cm4gb3V0cHV0LmpvaW4oJycpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgUHVueWNvZGUgc3RyaW5nIHJlcHJlc2VudGluZyBhIGRvbWFpbiBuYW1lIHRvIFVuaWNvZGUuIE9ubHkgdGhlXG5cdCAqIFB1bnljb2RlZCBwYXJ0cyBvZiB0aGUgZG9tYWluIG5hbWUgd2lsbCBiZSBjb252ZXJ0ZWQsIGkuZS4gaXQgZG9lc24ndFxuXHQgKiBtYXR0ZXIgaWYgeW91IGNhbGwgaXQgb24gYSBzdHJpbmcgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIGNvbnZlcnRlZCB0b1xuXHQgKiBVbmljb2RlLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGRvbWFpbiBUaGUgUHVueWNvZGUgZG9tYWluIG5hbWUgdG8gY29udmVydCB0byBVbmljb2RlLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgVW5pY29kZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgZ2l2ZW4gUHVueWNvZGVcblx0ICogc3RyaW5nLlxuXHQgKi9cblx0ZnVuY3Rpb24gdG9Vbmljb2RlKGRvbWFpbikge1xuXHRcdHJldHVybiBtYXBEb21haW4oZG9tYWluLCBmdW5jdGlvbihzdHJpbmcpIHtcblx0XHRcdHJldHVybiByZWdleFB1bnljb2RlLnRlc3Qoc3RyaW5nKVxuXHRcdFx0XHQ/IGRlY29kZShzdHJpbmcuc2xpY2UoNCkudG9Mb3dlckNhc2UoKSlcblx0XHRcdFx0OiBzdHJpbmc7XG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBVbmljb2RlIHN0cmluZyByZXByZXNlbnRpbmcgYSBkb21haW4gbmFtZSB0byBQdW55Y29kZS4gT25seSB0aGVcblx0ICogbm9uLUFTQ0lJIHBhcnRzIG9mIHRoZSBkb21haW4gbmFtZSB3aWxsIGJlIGNvbnZlcnRlZCwgaS5lLiBpdCBkb2Vzbid0XG5cdCAqIG1hdHRlciBpZiB5b3UgY2FsbCBpdCB3aXRoIGEgZG9tYWluIHRoYXQncyBhbHJlYWR5IGluIEFTQ0lJLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGRvbWFpbiBUaGUgZG9tYWluIG5hbWUgdG8gY29udmVydCwgYXMgYSBVbmljb2RlIHN0cmluZy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIFB1bnljb2RlIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBnaXZlbiBkb21haW4gbmFtZS5cblx0ICovXG5cdGZ1bmN0aW9uIHRvQVNDSUkoZG9tYWluKSB7XG5cdFx0cmV0dXJuIG1hcERvbWFpbihkb21haW4sIGZ1bmN0aW9uKHN0cmluZykge1xuXHRcdFx0cmV0dXJuIHJlZ2V4Tm9uQVNDSUkudGVzdChzdHJpbmcpXG5cdFx0XHRcdD8gJ3huLS0nICsgZW5jb2RlKHN0cmluZylcblx0XHRcdFx0OiBzdHJpbmc7XG5cdFx0fSk7XG5cdH1cblxuXHQvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuXHQvKiogRGVmaW5lIHRoZSBwdWJsaWMgQVBJICovXG5cdHB1bnljb2RlID0ge1xuXHRcdC8qKlxuXHRcdCAqIEEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgY3VycmVudCBQdW55Y29kZS5qcyB2ZXJzaW9uIG51bWJlci5cblx0XHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0XHQgKiBAdHlwZSBTdHJpbmdcblx0XHQgKi9cblx0XHQndmVyc2lvbic6ICcxLjIuMycsXG5cdFx0LyoqXG5cdFx0ICogQW4gb2JqZWN0IG9mIG1ldGhvZHMgdG8gY29udmVydCBmcm9tIEphdmFTY3JpcHQncyBpbnRlcm5hbCBjaGFyYWN0ZXJcblx0XHQgKiByZXByZXNlbnRhdGlvbiAoVUNTLTIpIHRvIFVuaWNvZGUgY29kZSBwb2ludHMsIGFuZCBiYWNrLlxuXHRcdCAqIEBzZWUgPGh0dHA6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2phdmFzY3JpcHQtZW5jb2Rpbmc+XG5cdFx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdFx0ICogQHR5cGUgT2JqZWN0XG5cdFx0ICovXG5cdFx0J3VjczInOiB7XG5cdFx0XHQnZGVjb2RlJzogdWNzMmRlY29kZSxcblx0XHRcdCdlbmNvZGUnOiB1Y3MyZW5jb2RlXG5cdFx0fSxcblx0XHQnZGVjb2RlJzogZGVjb2RlLFxuXHRcdCdlbmNvZGUnOiBlbmNvZGUsXG5cdFx0J3RvQVNDSUknOiB0b0FTQ0lJLFxuXHRcdCd0b1VuaWNvZGUnOiB0b1VuaWNvZGVcblx0fTtcblxuXHQvKiogRXhwb3NlIGBwdW55Y29kZWAgKi9cblx0Ly8gU29tZSBBTUQgYnVpbGQgb3B0aW1pemVycywgbGlrZSByLmpzLCBjaGVjayBmb3Igc3BlY2lmaWMgY29uZGl0aW9uIHBhdHRlcm5zXG5cdC8vIGxpa2UgdGhlIGZvbGxvd2luZzpcblx0aWYgKFxuXHRcdHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJlxuXHRcdHR5cGVvZiBkZWZpbmUuYW1kID09ICdvYmplY3QnICYmXG5cdFx0ZGVmaW5lLmFtZFxuXHQpIHtcblx0XHRkZWZpbmUoZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gcHVueWNvZGU7XG5cdFx0fSk7XG5cdH1cdGVsc2UgaWYgKGZyZWVFeHBvcnRzICYmICFmcmVlRXhwb3J0cy5ub2RlVHlwZSkge1xuXHRcdGlmIChmcmVlTW9kdWxlKSB7IC8vIGluIE5vZGUuanMgb3IgUmluZ29KUyB2MC44LjArXG5cdFx0XHRmcmVlTW9kdWxlLmV4cG9ydHMgPSBwdW55Y29kZTtcblx0XHR9IGVsc2UgeyAvLyBpbiBOYXJ3aGFsIG9yIFJpbmdvSlMgdjAuNy4wLVxuXHRcdFx0Zm9yIChrZXkgaW4gcHVueWNvZGUpIHtcblx0XHRcdFx0cHVueWNvZGUuaGFzT3duUHJvcGVydHkoa2V5KSAmJiAoZnJlZUV4cG9ydHNba2V5XSA9IHB1bnljb2RlW2tleV0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fSBlbHNlIHsgLy8gaW4gUmhpbm8gb3IgYSB3ZWIgYnJvd3NlclxuXHRcdHJvb3QucHVueWNvZGUgPSBwdW55Y29kZTtcblx0fVxuXG59KHRoaXMpKTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4ndXNlIHN0cmljdCc7XG5cbi8vIElmIG9iai5oYXNPd25Qcm9wZXJ0eSBoYXMgYmVlbiBvdmVycmlkZGVuLCB0aGVuIGNhbGxpbmdcbi8vIG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSB3aWxsIGJyZWFrLlxuLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vam95ZW50L25vZGUvaXNzdWVzLzE3MDdcbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocXMsIHNlcCwgZXEsIG9wdGlvbnMpIHtcbiAgc2VwID0gc2VwIHx8ICcmJztcbiAgZXEgPSBlcSB8fCAnPSc7XG4gIHZhciBvYmogPSB7fTtcblxuICBpZiAodHlwZW9mIHFzICE9PSAnc3RyaW5nJyB8fCBxcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgdmFyIHJlZ2V4cCA9IC9cXCsvZztcbiAgcXMgPSBxcy5zcGxpdChzZXApO1xuXG4gIHZhciBtYXhLZXlzID0gMTAwMDtcbiAgaWYgKG9wdGlvbnMgJiYgdHlwZW9mIG9wdGlvbnMubWF4S2V5cyA9PT0gJ251bWJlcicpIHtcbiAgICBtYXhLZXlzID0gb3B0aW9ucy5tYXhLZXlzO1xuICB9XG5cbiAgdmFyIGxlbiA9IHFzLmxlbmd0aDtcbiAgLy8gbWF4S2V5cyA8PSAwIG1lYW5zIHRoYXQgd2Ugc2hvdWxkIG5vdCBsaW1pdCBrZXlzIGNvdW50XG4gIGlmIChtYXhLZXlzID4gMCAmJiBsZW4gPiBtYXhLZXlzKSB7XG4gICAgbGVuID0gbWF4S2V5cztcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICB2YXIgeCA9IHFzW2ldLnJlcGxhY2UocmVnZXhwLCAnJTIwJyksXG4gICAgICAgIGlkeCA9IHguaW5kZXhPZihlcSksXG4gICAgICAgIGtzdHIsIHZzdHIsIGssIHY7XG5cbiAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgIGtzdHIgPSB4LnN1YnN0cigwLCBpZHgpO1xuICAgICAgdnN0ciA9IHguc3Vic3RyKGlkeCArIDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBrc3RyID0geDtcbiAgICAgIHZzdHIgPSAnJztcbiAgICB9XG5cbiAgICBrID0gZGVjb2RlVVJJQ29tcG9uZW50KGtzdHIpO1xuICAgIHYgPSBkZWNvZGVVUklDb21wb25lbnQodnN0cik7XG5cbiAgICBpZiAoIWhhc093blByb3BlcnR5KG9iaiwgaykpIHtcbiAgICAgIG9ialtrXSA9IHY7XG4gICAgfSBlbHNlIGlmIChpc0FycmF5KG9ialtrXSkpIHtcbiAgICAgIG9ialtrXS5wdXNoKHYpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvYmpba10gPSBbb2JqW2tdLCB2XTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gb2JqO1xufTtcblxudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uICh4cykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHhzKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgc3RyaW5naWZ5UHJpbWl0aXZlID0gZnVuY3Rpb24odikge1xuICBzd2l0Y2ggKHR5cGVvZiB2KSB7XG4gICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgIHJldHVybiB2O1xuXG4gICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICByZXR1cm4gdiA/ICd0cnVlJyA6ICdmYWxzZSc7XG5cbiAgICBjYXNlICdudW1iZXInOlxuICAgICAgcmV0dXJuIGlzRmluaXRlKHYpID8gdiA6ICcnO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiAnJztcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvYmosIHNlcCwgZXEsIG5hbWUpIHtcbiAgc2VwID0gc2VwIHx8ICcmJztcbiAgZXEgPSBlcSB8fCAnPSc7XG4gIGlmIChvYmogPT09IG51bGwpIHtcbiAgICBvYmogPSB1bmRlZmluZWQ7XG4gIH1cblxuICBpZiAodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gbWFwKG9iamVjdEtleXMob2JqKSwgZnVuY3Rpb24oaykge1xuICAgICAgdmFyIGtzID0gZW5jb2RlVVJJQ29tcG9uZW50KHN0cmluZ2lmeVByaW1pdGl2ZShrKSkgKyBlcTtcbiAgICAgIGlmIChpc0FycmF5KG9ialtrXSkpIHtcbiAgICAgICAgcmV0dXJuIG9ialtrXS5tYXAoZnVuY3Rpb24odikge1xuICAgICAgICAgIHJldHVybiBrcyArIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUodikpO1xuICAgICAgICB9KS5qb2luKHNlcCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4ga3MgKyBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKG9ialtrXSkpO1xuICAgICAgfVxuICAgIH0pLmpvaW4oc2VwKTtcblxuICB9XG5cbiAgaWYgKCFuYW1lKSByZXR1cm4gJyc7XG4gIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKG5hbWUpKSArIGVxICtcbiAgICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUob2JqKSk7XG59O1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHhzKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcblxuZnVuY3Rpb24gbWFwICh4cywgZikge1xuICBpZiAoeHMubWFwKSByZXR1cm4geHMubWFwKGYpO1xuICB2YXIgcmVzID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICByZXMucHVzaChmKHhzW2ldLCBpKSk7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxudmFyIG9iamVjdEtleXMgPSBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciByZXMgPSBbXTtcbiAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSByZXMucHVzaChrZXkpO1xuICB9XG4gIHJldHVybiByZXM7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLmRlY29kZSA9IGV4cG9ydHMucGFyc2UgPSByZXF1aXJlKCcuL2RlY29kZScpO1xuZXhwb3J0cy5lbmNvZGUgPSBleHBvcnRzLnN0cmluZ2lmeSA9IHJlcXVpcmUoJy4vZW5jb2RlJyk7XG4iLCIvKmpzaGludCBzdHJpY3Q6dHJ1ZSBub2RlOnRydWUgZXM1OnRydWUgb25ldmFyOnRydWUgbGF4Y29tbWE6dHJ1ZSBsYXhicmVhazp0cnVlIGVxZXFlcTp0cnVlIGltbWVkOnRydWUgbGF0ZWRlZjp0cnVlKi9cbihmdW5jdGlvbiAoKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuXG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIHB1bnljb2RlID0gcmVxdWlyZSgncHVueWNvZGUnKTtcblxuZXhwb3J0cy5wYXJzZSA9IHVybFBhcnNlO1xuZXhwb3J0cy5yZXNvbHZlID0gdXJsUmVzb2x2ZTtcbmV4cG9ydHMucmVzb2x2ZU9iamVjdCA9IHVybFJlc29sdmVPYmplY3Q7XG5leHBvcnRzLmZvcm1hdCA9IHVybEZvcm1hdDtcblxuLy8gUmVmZXJlbmNlOiBSRkMgMzk4NiwgUkZDIDE4MDgsIFJGQyAyMzk2XG5cbi8vIGRlZmluZSB0aGVzZSBoZXJlIHNvIGF0IGxlYXN0IHRoZXkgb25seSBoYXZlIHRvIGJlXG4vLyBjb21waWxlZCBvbmNlIG9uIHRoZSBmaXJzdCBtb2R1bGUgbG9hZC5cbnZhciBwcm90b2NvbFBhdHRlcm4gPSAvXihbYS16MC05ListXSs6KS9pLFxuICAgIHBvcnRQYXR0ZXJuID0gLzpbMC05XSokLyxcblxuICAgIC8vIFJGQyAyMzk2OiBjaGFyYWN0ZXJzIHJlc2VydmVkIGZvciBkZWxpbWl0aW5nIFVSTHMuXG4gICAgLy8gV2UgYWN0dWFsbHkganVzdCBhdXRvLWVzY2FwZSB0aGVzZS5cbiAgICBkZWxpbXMgPSBbJzwnLCAnPicsICdcIicsICdgJywgJyAnLCAnXFxyJywgJ1xcbicsICdcXHQnXSxcblxuICAgIC8vIFJGQyAyMzk2OiBjaGFyYWN0ZXJzIG5vdCBhbGxvd2VkIGZvciB2YXJpb3VzIHJlYXNvbnMuXG4gICAgdW53aXNlID0gWyd7JywgJ30nLCAnfCcsICdcXFxcJywgJ14nLCAnficsICdgJ10uY29uY2F0KGRlbGltcyksXG5cbiAgICAvLyBBbGxvd2VkIGJ5IFJGQ3MsIGJ1dCBjYXVzZSBvZiBYU1MgYXR0YWNrcy4gIEFsd2F5cyBlc2NhcGUgdGhlc2UuXG4gICAgYXV0b0VzY2FwZSA9IFsnXFwnJ10uY29uY2F0KGRlbGltcyksXG4gICAgLy8gQ2hhcmFjdGVycyB0aGF0IGFyZSBuZXZlciBldmVyIGFsbG93ZWQgaW4gYSBob3N0bmFtZS5cbiAgICAvLyBOb3RlIHRoYXQgYW55IGludmFsaWQgY2hhcnMgYXJlIGFsc28gaGFuZGxlZCwgYnV0IHRoZXNlXG4gICAgLy8gYXJlIHRoZSBvbmVzIHRoYXQgYXJlICpleHBlY3RlZCogdG8gYmUgc2Vlbiwgc28gd2UgZmFzdC1wYXRoXG4gICAgLy8gdGhlbS5cbiAgICBub25Ib3N0Q2hhcnMgPSBbJyUnLCAnLycsICc/JywgJzsnLCAnIyddXG4gICAgICAuY29uY2F0KHVud2lzZSkuY29uY2F0KGF1dG9Fc2NhcGUpLFxuICAgIG5vbkF1dGhDaGFycyA9IFsnLycsICdAJywgJz8nLCAnIyddLmNvbmNhdChkZWxpbXMpLFxuICAgIGhvc3RuYW1lTWF4TGVuID0gMjU1LFxuICAgIGhvc3RuYW1lUGFydFBhdHRlcm4gPSAvXlthLXpBLVowLTldW2EtejAtOUEtWl8tXXswLDYyfSQvLFxuICAgIGhvc3RuYW1lUGFydFN0YXJ0ID0gL14oW2EtekEtWjAtOV1bYS16MC05QS1aXy1dezAsNjJ9KSguKikkLyxcbiAgICAvLyBwcm90b2NvbHMgdGhhdCBjYW4gYWxsb3cgXCJ1bnNhZmVcIiBhbmQgXCJ1bndpc2VcIiBjaGFycy5cbiAgICB1bnNhZmVQcm90b2NvbCA9IHtcbiAgICAgICdqYXZhc2NyaXB0JzogdHJ1ZSxcbiAgICAgICdqYXZhc2NyaXB0Oic6IHRydWVcbiAgICB9LFxuICAgIC8vIHByb3RvY29scyB0aGF0IG5ldmVyIGhhdmUgYSBob3N0bmFtZS5cbiAgICBob3N0bGVzc1Byb3RvY29sID0ge1xuICAgICAgJ2phdmFzY3JpcHQnOiB0cnVlLFxuICAgICAgJ2phdmFzY3JpcHQ6JzogdHJ1ZVxuICAgIH0sXG4gICAgLy8gcHJvdG9jb2xzIHRoYXQgYWx3YXlzIGhhdmUgYSBwYXRoIGNvbXBvbmVudC5cbiAgICBwYXRoZWRQcm90b2NvbCA9IHtcbiAgICAgICdodHRwJzogdHJ1ZSxcbiAgICAgICdodHRwcyc6IHRydWUsXG4gICAgICAnZnRwJzogdHJ1ZSxcbiAgICAgICdnb3BoZXInOiB0cnVlLFxuICAgICAgJ2ZpbGUnOiB0cnVlLFxuICAgICAgJ2h0dHA6JzogdHJ1ZSxcbiAgICAgICdmdHA6JzogdHJ1ZSxcbiAgICAgICdnb3BoZXI6JzogdHJ1ZSxcbiAgICAgICdmaWxlOic6IHRydWVcbiAgICB9LFxuICAgIC8vIHByb3RvY29scyB0aGF0IGFsd2F5cyBjb250YWluIGEgLy8gYml0LlxuICAgIHNsYXNoZWRQcm90b2NvbCA9IHtcbiAgICAgICdodHRwJzogdHJ1ZSxcbiAgICAgICdodHRwcyc6IHRydWUsXG4gICAgICAnZnRwJzogdHJ1ZSxcbiAgICAgICdnb3BoZXInOiB0cnVlLFxuICAgICAgJ2ZpbGUnOiB0cnVlLFxuICAgICAgJ2h0dHA6JzogdHJ1ZSxcbiAgICAgICdodHRwczonOiB0cnVlLFxuICAgICAgJ2Z0cDonOiB0cnVlLFxuICAgICAgJ2dvcGhlcjonOiB0cnVlLFxuICAgICAgJ2ZpbGU6JzogdHJ1ZVxuICAgIH0sXG4gICAgcXVlcnlzdHJpbmcgPSByZXF1aXJlKCdxdWVyeXN0cmluZycpO1xuXG5mdW5jdGlvbiB1cmxQYXJzZSh1cmwsIHBhcnNlUXVlcnlTdHJpbmcsIHNsYXNoZXNEZW5vdGVIb3N0KSB7XG4gIGlmICh1cmwgJiYgdHlwZW9mKHVybCkgPT09ICdvYmplY3QnICYmIHVybC5ocmVmKSByZXR1cm4gdXJsO1xuXG4gIGlmICh0eXBlb2YgdXJsICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQYXJhbWV0ZXIgJ3VybCcgbXVzdCBiZSBhIHN0cmluZywgbm90IFwiICsgdHlwZW9mIHVybCk7XG4gIH1cblxuICB2YXIgb3V0ID0ge30sXG4gICAgICByZXN0ID0gdXJsO1xuXG4gIC8vIHRyaW0gYmVmb3JlIHByb2NlZWRpbmcuXG4gIC8vIFRoaXMgaXMgdG8gc3VwcG9ydCBwYXJzZSBzdHVmZiBsaWtlIFwiICBodHRwOi8vZm9vLmNvbSAgXFxuXCJcbiAgcmVzdCA9IHJlc3QudHJpbSgpO1xuXG4gIHZhciBwcm90byA9IHByb3RvY29sUGF0dGVybi5leGVjKHJlc3QpO1xuICBpZiAocHJvdG8pIHtcbiAgICBwcm90byA9IHByb3RvWzBdO1xuICAgIHZhciBsb3dlclByb3RvID0gcHJvdG8udG9Mb3dlckNhc2UoKTtcbiAgICBvdXQucHJvdG9jb2wgPSBsb3dlclByb3RvO1xuICAgIHJlc3QgPSByZXN0LnN1YnN0cihwcm90by5sZW5ndGgpO1xuICB9XG5cbiAgLy8gZmlndXJlIG91dCBpZiBpdCdzIGdvdCBhIGhvc3RcbiAgLy8gdXNlckBzZXJ2ZXIgaXMgKmFsd2F5cyogaW50ZXJwcmV0ZWQgYXMgYSBob3N0bmFtZSwgYW5kIHVybFxuICAvLyByZXNvbHV0aW9uIHdpbGwgdHJlYXQgLy9mb28vYmFyIGFzIGhvc3Q9Zm9vLHBhdGg9YmFyIGJlY2F1c2UgdGhhdCdzXG4gIC8vIGhvdyB0aGUgYnJvd3NlciByZXNvbHZlcyByZWxhdGl2ZSBVUkxzLlxuICBpZiAoc2xhc2hlc0Rlbm90ZUhvc3QgfHwgcHJvdG8gfHwgcmVzdC5tYXRjaCgvXlxcL1xcL1teQFxcL10rQFteQFxcL10rLykpIHtcbiAgICB2YXIgc2xhc2hlcyA9IHJlc3Quc3Vic3RyKDAsIDIpID09PSAnLy8nO1xuICAgIGlmIChzbGFzaGVzICYmICEocHJvdG8gJiYgaG9zdGxlc3NQcm90b2NvbFtwcm90b10pKSB7XG4gICAgICByZXN0ID0gcmVzdC5zdWJzdHIoMik7XG4gICAgICBvdXQuc2xhc2hlcyA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFob3N0bGVzc1Byb3RvY29sW3Byb3RvXSAmJlxuICAgICAgKHNsYXNoZXMgfHwgKHByb3RvICYmICFzbGFzaGVkUHJvdG9jb2xbcHJvdG9dKSkpIHtcbiAgICAvLyB0aGVyZSdzIGEgaG9zdG5hbWUuXG4gICAgLy8gdGhlIGZpcnN0IGluc3RhbmNlIG9mIC8sID8sIDssIG9yICMgZW5kcyB0aGUgaG9zdC5cbiAgICAvLyBkb24ndCBlbmZvcmNlIGZ1bGwgUkZDIGNvcnJlY3RuZXNzLCBqdXN0IGJlIHVuc3R1cGlkIGFib3V0IGl0LlxuXG4gICAgLy8gSWYgdGhlcmUgaXMgYW4gQCBpbiB0aGUgaG9zdG5hbWUsIHRoZW4gbm9uLWhvc3QgY2hhcnMgKmFyZSogYWxsb3dlZFxuICAgIC8vIHRvIHRoZSBsZWZ0IG9mIHRoZSBmaXJzdCBAIHNpZ24sIHVubGVzcyBzb21lIG5vbi1hdXRoIGNoYXJhY3RlclxuICAgIC8vIGNvbWVzICpiZWZvcmUqIHRoZSBALXNpZ24uXG4gICAgLy8gVVJMcyBhcmUgb2Jub3hpb3VzLlxuICAgIHZhciBhdFNpZ24gPSByZXN0LmluZGV4T2YoJ0AnKTtcbiAgICBpZiAoYXRTaWduICE9PSAtMSkge1xuICAgICAgdmFyIGF1dGggPSByZXN0LnNsaWNlKDAsIGF0U2lnbik7XG5cbiAgICAgIC8vIHRoZXJlICptYXkgYmUqIGFuIGF1dGhcbiAgICAgIHZhciBoYXNBdXRoID0gdHJ1ZTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gbm9uQXV0aENoYXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZiAoYXV0aC5pbmRleE9mKG5vbkF1dGhDaGFyc1tpXSkgIT09IC0xKSB7XG4gICAgICAgICAgLy8gbm90IGEgdmFsaWQgYXV0aC4gIFNvbWV0aGluZyBsaWtlIGh0dHA6Ly9mb28uY29tL2JhckBiYXovXG4gICAgICAgICAgaGFzQXV0aCA9IGZhbHNlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChoYXNBdXRoKSB7XG4gICAgICAgIC8vIHBsdWNrIG9mZiB0aGUgYXV0aCBwb3J0aW9uLlxuICAgICAgICBvdXQuYXV0aCA9IGRlY29kZVVSSUNvbXBvbmVudChhdXRoKTtcbiAgICAgICAgcmVzdCA9IHJlc3Quc3Vic3RyKGF0U2lnbiArIDEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBmaXJzdE5vbkhvc3QgPSAtMTtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IG5vbkhvc3RDaGFycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHZhciBpbmRleCA9IHJlc3QuaW5kZXhPZihub25Ib3N0Q2hhcnNbaV0pO1xuICAgICAgaWYgKGluZGV4ICE9PSAtMSAmJlxuICAgICAgICAgIChmaXJzdE5vbkhvc3QgPCAwIHx8IGluZGV4IDwgZmlyc3ROb25Ib3N0KSkgZmlyc3ROb25Ib3N0ID0gaW5kZXg7XG4gICAgfVxuXG4gICAgaWYgKGZpcnN0Tm9uSG9zdCAhPT0gLTEpIHtcbiAgICAgIG91dC5ob3N0ID0gcmVzdC5zdWJzdHIoMCwgZmlyc3ROb25Ib3N0KTtcbiAgICAgIHJlc3QgPSByZXN0LnN1YnN0cihmaXJzdE5vbkhvc3QpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQuaG9zdCA9IHJlc3Q7XG4gICAgICByZXN0ID0gJyc7XG4gICAgfVxuXG4gICAgLy8gcHVsbCBvdXQgcG9ydC5cbiAgICB2YXIgcCA9IHBhcnNlSG9zdChvdXQuaG9zdCk7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhwKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGtleXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgIG91dFtrZXldID0gcFtrZXldO1xuICAgIH1cblxuICAgIC8vIHdlJ3ZlIGluZGljYXRlZCB0aGF0IHRoZXJlIGlzIGEgaG9zdG5hbWUsXG4gICAgLy8gc28gZXZlbiBpZiBpdCdzIGVtcHR5LCBpdCBoYXMgdG8gYmUgcHJlc2VudC5cbiAgICBvdXQuaG9zdG5hbWUgPSBvdXQuaG9zdG5hbWUgfHwgJyc7XG5cbiAgICAvLyBpZiBob3N0bmFtZSBiZWdpbnMgd2l0aCBbIGFuZCBlbmRzIHdpdGggXVxuICAgIC8vIGFzc3VtZSB0aGF0IGl0J3MgYW4gSVB2NiBhZGRyZXNzLlxuICAgIHZhciBpcHY2SG9zdG5hbWUgPSBvdXQuaG9zdG5hbWVbMF0gPT09ICdbJyAmJlxuICAgICAgICBvdXQuaG9zdG5hbWVbb3V0Lmhvc3RuYW1lLmxlbmd0aCAtIDFdID09PSAnXSc7XG5cbiAgICAvLyB2YWxpZGF0ZSBhIGxpdHRsZS5cbiAgICBpZiAob3V0Lmhvc3RuYW1lLmxlbmd0aCA+IGhvc3RuYW1lTWF4TGVuKSB7XG4gICAgICBvdXQuaG9zdG5hbWUgPSAnJztcbiAgICB9IGVsc2UgaWYgKCFpcHY2SG9zdG5hbWUpIHtcbiAgICAgIHZhciBob3N0cGFydHMgPSBvdXQuaG9zdG5hbWUuc3BsaXQoL1xcLi8pO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBob3N0cGFydHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHZhciBwYXJ0ID0gaG9zdHBhcnRzW2ldO1xuICAgICAgICBpZiAoIXBhcnQpIGNvbnRpbnVlO1xuICAgICAgICBpZiAoIXBhcnQubWF0Y2goaG9zdG5hbWVQYXJ0UGF0dGVybikpIHtcbiAgICAgICAgICB2YXIgbmV3cGFydCA9ICcnO1xuICAgICAgICAgIGZvciAodmFyIGogPSAwLCBrID0gcGFydC5sZW5ndGg7IGogPCBrOyBqKyspIHtcbiAgICAgICAgICAgIGlmIChwYXJ0LmNoYXJDb2RlQXQoaikgPiAxMjcpIHtcbiAgICAgICAgICAgICAgLy8gd2UgcmVwbGFjZSBub24tQVNDSUkgY2hhciB3aXRoIGEgdGVtcG9yYXJ5IHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgIC8vIHdlIG5lZWQgdGhpcyB0byBtYWtlIHN1cmUgc2l6ZSBvZiBob3N0bmFtZSBpcyBub3RcbiAgICAgICAgICAgICAgLy8gYnJva2VuIGJ5IHJlcGxhY2luZyBub24tQVNDSUkgYnkgbm90aGluZ1xuICAgICAgICAgICAgICBuZXdwYXJ0ICs9ICd4JztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG5ld3BhcnQgKz0gcGFydFtqXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gd2UgdGVzdCBhZ2FpbiB3aXRoIEFTQ0lJIGNoYXIgb25seVxuICAgICAgICAgIGlmICghbmV3cGFydC5tYXRjaChob3N0bmFtZVBhcnRQYXR0ZXJuKSkge1xuICAgICAgICAgICAgdmFyIHZhbGlkUGFydHMgPSBob3N0cGFydHMuc2xpY2UoMCwgaSk7XG4gICAgICAgICAgICB2YXIgbm90SG9zdCA9IGhvc3RwYXJ0cy5zbGljZShpICsgMSk7XG4gICAgICAgICAgICB2YXIgYml0ID0gcGFydC5tYXRjaChob3N0bmFtZVBhcnRTdGFydCk7XG4gICAgICAgICAgICBpZiAoYml0KSB7XG4gICAgICAgICAgICAgIHZhbGlkUGFydHMucHVzaChiaXRbMV0pO1xuICAgICAgICAgICAgICBub3RIb3N0LnVuc2hpZnQoYml0WzJdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChub3RIb3N0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICByZXN0ID0gJy8nICsgbm90SG9zdC5qb2luKCcuJykgKyByZXN0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0Lmhvc3RuYW1lID0gdmFsaWRQYXJ0cy5qb2luKCcuJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBob3N0bmFtZXMgYXJlIGFsd2F5cyBsb3dlciBjYXNlLlxuICAgIG91dC5ob3N0bmFtZSA9IG91dC5ob3N0bmFtZS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgaWYgKCFpcHY2SG9zdG5hbWUpIHtcbiAgICAgIC8vIElETkEgU3VwcG9ydDogUmV0dXJucyBhIHB1bnkgY29kZWQgcmVwcmVzZW50YXRpb24gb2YgXCJkb21haW5cIi5cbiAgICAgIC8vIEl0IG9ubHkgY29udmVydHMgdGhlIHBhcnQgb2YgdGhlIGRvbWFpbiBuYW1lIHRoYXRcbiAgICAgIC8vIGhhcyBub24gQVNDSUkgY2hhcmFjdGVycy4gSS5lLiBpdCBkb3NlbnQgbWF0dGVyIGlmXG4gICAgICAvLyB5b3UgY2FsbCBpdCB3aXRoIGEgZG9tYWluIHRoYXQgYWxyZWFkeSBpcyBpbiBBU0NJSS5cbiAgICAgIHZhciBkb21haW5BcnJheSA9IG91dC5ob3N0bmFtZS5zcGxpdCgnLicpO1xuICAgICAgdmFyIG5ld091dCA9IFtdO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkb21haW5BcnJheS5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgcyA9IGRvbWFpbkFycmF5W2ldO1xuICAgICAgICBuZXdPdXQucHVzaChzLm1hdGNoKC9bXkEtWmEtejAtOV8tXS8pID9cbiAgICAgICAgICAgICd4bi0tJyArIHB1bnljb2RlLmVuY29kZShzKSA6IHMpO1xuICAgICAgfVxuICAgICAgb3V0Lmhvc3RuYW1lID0gbmV3T3V0LmpvaW4oJy4nKTtcbiAgICB9XG5cbiAgICBvdXQuaG9zdCA9IChvdXQuaG9zdG5hbWUgfHwgJycpICtcbiAgICAgICAgKChvdXQucG9ydCkgPyAnOicgKyBvdXQucG9ydCA6ICcnKTtcbiAgICBvdXQuaHJlZiArPSBvdXQuaG9zdDtcblxuICAgIC8vIHN0cmlwIFsgYW5kIF0gZnJvbSB0aGUgaG9zdG5hbWVcbiAgICBpZiAoaXB2Nkhvc3RuYW1lKSB7XG4gICAgICBvdXQuaG9zdG5hbWUgPSBvdXQuaG9zdG5hbWUuc3Vic3RyKDEsIG91dC5ob3N0bmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIGlmIChyZXN0WzBdICE9PSAnLycpIHtcbiAgICAgICAgcmVzdCA9ICcvJyArIHJlc3Q7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gbm93IHJlc3QgaXMgc2V0IHRvIHRoZSBwb3N0LWhvc3Qgc3R1ZmYuXG4gIC8vIGNob3Agb2ZmIGFueSBkZWxpbSBjaGFycy5cbiAgaWYgKCF1bnNhZmVQcm90b2NvbFtsb3dlclByb3RvXSkge1xuXG4gICAgLy8gRmlyc3QsIG1ha2UgMTAwJSBzdXJlIHRoYXQgYW55IFwiYXV0b0VzY2FwZVwiIGNoYXJzIGdldFxuICAgIC8vIGVzY2FwZWQsIGV2ZW4gaWYgZW5jb2RlVVJJQ29tcG9uZW50IGRvZXNuJ3QgdGhpbmsgdGhleVxuICAgIC8vIG5lZWQgdG8gYmUuXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBhdXRvRXNjYXBlLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdmFyIGFlID0gYXV0b0VzY2FwZVtpXTtcbiAgICAgIHZhciBlc2MgPSBlbmNvZGVVUklDb21wb25lbnQoYWUpO1xuICAgICAgaWYgKGVzYyA9PT0gYWUpIHtcbiAgICAgICAgZXNjID0gZXNjYXBlKGFlKTtcbiAgICAgIH1cbiAgICAgIHJlc3QgPSByZXN0LnNwbGl0KGFlKS5qb2luKGVzYyk7XG4gICAgfVxuICB9XG5cblxuICAvLyBjaG9wIG9mZiBmcm9tIHRoZSB0YWlsIGZpcnN0LlxuICB2YXIgaGFzaCA9IHJlc3QuaW5kZXhPZignIycpO1xuICBpZiAoaGFzaCAhPT0gLTEpIHtcbiAgICAvLyBnb3QgYSBmcmFnbWVudCBzdHJpbmcuXG4gICAgb3V0Lmhhc2ggPSByZXN0LnN1YnN0cihoYXNoKTtcbiAgICByZXN0ID0gcmVzdC5zbGljZSgwLCBoYXNoKTtcbiAgfVxuICB2YXIgcW0gPSByZXN0LmluZGV4T2YoJz8nKTtcbiAgaWYgKHFtICE9PSAtMSkge1xuICAgIG91dC5zZWFyY2ggPSByZXN0LnN1YnN0cihxbSk7XG4gICAgb3V0LnF1ZXJ5ID0gcmVzdC5zdWJzdHIocW0gKyAxKTtcbiAgICBpZiAocGFyc2VRdWVyeVN0cmluZykge1xuICAgICAgb3V0LnF1ZXJ5ID0gcXVlcnlzdHJpbmcucGFyc2Uob3V0LnF1ZXJ5KTtcbiAgICB9XG4gICAgcmVzdCA9IHJlc3Quc2xpY2UoMCwgcW0pO1xuICB9IGVsc2UgaWYgKHBhcnNlUXVlcnlTdHJpbmcpIHtcbiAgICAvLyBubyBxdWVyeSBzdHJpbmcsIGJ1dCBwYXJzZVF1ZXJ5U3RyaW5nIHN0aWxsIHJlcXVlc3RlZFxuICAgIG91dC5zZWFyY2ggPSAnJztcbiAgICBvdXQucXVlcnkgPSB7fTtcbiAgfVxuICBpZiAocmVzdCkgb3V0LnBhdGhuYW1lID0gcmVzdDtcbiAgaWYgKHNsYXNoZWRQcm90b2NvbFtwcm90b10gJiZcbiAgICAgIG91dC5ob3N0bmFtZSAmJiAhb3V0LnBhdGhuYW1lKSB7XG4gICAgb3V0LnBhdGhuYW1lID0gJy8nO1xuICB9XG5cbiAgLy90byBzdXBwb3J0IGh0dHAucmVxdWVzdFxuICBpZiAob3V0LnBhdGhuYW1lIHx8IG91dC5zZWFyY2gpIHtcbiAgICBvdXQucGF0aCA9IChvdXQucGF0aG5hbWUgPyBvdXQucGF0aG5hbWUgOiAnJykgK1xuICAgICAgICAgICAgICAgKG91dC5zZWFyY2ggPyBvdXQuc2VhcmNoIDogJycpO1xuICB9XG5cbiAgLy8gZmluYWxseSwgcmVjb25zdHJ1Y3QgdGhlIGhyZWYgYmFzZWQgb24gd2hhdCBoYXMgYmVlbiB2YWxpZGF0ZWQuXG4gIG91dC5ocmVmID0gdXJsRm9ybWF0KG91dCk7XG4gIHJldHVybiBvdXQ7XG59XG5cbi8vIGZvcm1hdCBhIHBhcnNlZCBvYmplY3QgaW50byBhIHVybCBzdHJpbmdcbmZ1bmN0aW9uIHVybEZvcm1hdChvYmopIHtcbiAgLy8gZW5zdXJlIGl0J3MgYW4gb2JqZWN0LCBhbmQgbm90IGEgc3RyaW5nIHVybC5cbiAgLy8gSWYgaXQncyBhbiBvYmosIHRoaXMgaXMgYSBuby1vcC5cbiAgLy8gdGhpcyB3YXksIHlvdSBjYW4gY2FsbCB1cmxfZm9ybWF0KCkgb24gc3RyaW5nc1xuICAvLyB0byBjbGVhbiB1cCBwb3RlbnRpYWxseSB3b25reSB1cmxzLlxuICBpZiAodHlwZW9mKG9iaikgPT09ICdzdHJpbmcnKSBvYmogPSB1cmxQYXJzZShvYmopO1xuXG4gIHZhciBhdXRoID0gb2JqLmF1dGggfHwgJyc7XG4gIGlmIChhdXRoKSB7XG4gICAgYXV0aCA9IGVuY29kZVVSSUNvbXBvbmVudChhdXRoKTtcbiAgICBhdXRoID0gYXV0aC5yZXBsYWNlKC8lM0EvaSwgJzonKTtcbiAgICBhdXRoICs9ICdAJztcbiAgfVxuXG4gIHZhciBwcm90b2NvbCA9IG9iai5wcm90b2NvbCB8fCAnJyxcbiAgICAgIHBhdGhuYW1lID0gb2JqLnBhdGhuYW1lIHx8ICcnLFxuICAgICAgaGFzaCA9IG9iai5oYXNoIHx8ICcnLFxuICAgICAgaG9zdCA9IGZhbHNlLFxuICAgICAgcXVlcnkgPSAnJztcblxuICBpZiAob2JqLmhvc3QgIT09IHVuZGVmaW5lZCkge1xuICAgIGhvc3QgPSBhdXRoICsgb2JqLmhvc3Q7XG4gIH0gZWxzZSBpZiAob2JqLmhvc3RuYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICBob3N0ID0gYXV0aCArIChvYmouaG9zdG5hbWUuaW5kZXhPZignOicpID09PSAtMSA/XG4gICAgICAgIG9iai5ob3N0bmFtZSA6XG4gICAgICAgICdbJyArIG9iai5ob3N0bmFtZSArICddJyk7XG4gICAgaWYgKG9iai5wb3J0KSB7XG4gICAgICBob3N0ICs9ICc6JyArIG9iai5wb3J0O1xuICAgIH1cbiAgfVxuXG4gIGlmIChvYmoucXVlcnkgJiYgdHlwZW9mIG9iai5xdWVyeSA9PT0gJ29iamVjdCcgJiZcbiAgICAgIE9iamVjdC5rZXlzKG9iai5xdWVyeSkubGVuZ3RoKSB7XG4gICAgcXVlcnkgPSBxdWVyeXN0cmluZy5zdHJpbmdpZnkob2JqLnF1ZXJ5KTtcbiAgfVxuXG4gIHZhciBzZWFyY2ggPSBvYmouc2VhcmNoIHx8IChxdWVyeSAmJiAoJz8nICsgcXVlcnkpKSB8fCAnJztcblxuICBpZiAocHJvdG9jb2wgJiYgcHJvdG9jb2wuc3Vic3RyKC0xKSAhPT0gJzonKSBwcm90b2NvbCArPSAnOic7XG5cbiAgLy8gb25seSB0aGUgc2xhc2hlZFByb3RvY29scyBnZXQgdGhlIC8vLiAgTm90IG1haWx0bzosIHhtcHA6LCBldGMuXG4gIC8vIHVubGVzcyB0aGV5IGhhZCB0aGVtIHRvIGJlZ2luIHdpdGguXG4gIGlmIChvYmouc2xhc2hlcyB8fFxuICAgICAgKCFwcm90b2NvbCB8fCBzbGFzaGVkUHJvdG9jb2xbcHJvdG9jb2xdKSAmJiBob3N0ICE9PSBmYWxzZSkge1xuICAgIGhvc3QgPSAnLy8nICsgKGhvc3QgfHwgJycpO1xuICAgIGlmIChwYXRobmFtZSAmJiBwYXRobmFtZS5jaGFyQXQoMCkgIT09ICcvJykgcGF0aG5hbWUgPSAnLycgKyBwYXRobmFtZTtcbiAgfSBlbHNlIGlmICghaG9zdCkge1xuICAgIGhvc3QgPSAnJztcbiAgfVxuXG4gIGlmIChoYXNoICYmIGhhc2guY2hhckF0KDApICE9PSAnIycpIGhhc2ggPSAnIycgKyBoYXNoO1xuICBpZiAoc2VhcmNoICYmIHNlYXJjaC5jaGFyQXQoMCkgIT09ICc/Jykgc2VhcmNoID0gJz8nICsgc2VhcmNoO1xuXG4gIHJldHVybiBwcm90b2NvbCArIGhvc3QgKyBwYXRobmFtZSArIHNlYXJjaCArIGhhc2g7XG59XG5cbmZ1bmN0aW9uIHVybFJlc29sdmUoc291cmNlLCByZWxhdGl2ZSkge1xuICByZXR1cm4gdXJsRm9ybWF0KHVybFJlc29sdmVPYmplY3Qoc291cmNlLCByZWxhdGl2ZSkpO1xufVxuXG5mdW5jdGlvbiB1cmxSZXNvbHZlT2JqZWN0KHNvdXJjZSwgcmVsYXRpdmUpIHtcbiAgaWYgKCFzb3VyY2UpIHJldHVybiByZWxhdGl2ZTtcblxuICBzb3VyY2UgPSB1cmxQYXJzZSh1cmxGb3JtYXQoc291cmNlKSwgZmFsc2UsIHRydWUpO1xuICByZWxhdGl2ZSA9IHVybFBhcnNlKHVybEZvcm1hdChyZWxhdGl2ZSksIGZhbHNlLCB0cnVlKTtcblxuICAvLyBoYXNoIGlzIGFsd2F5cyBvdmVycmlkZGVuLCBubyBtYXR0ZXIgd2hhdC5cbiAgc291cmNlLmhhc2ggPSByZWxhdGl2ZS5oYXNoO1xuXG4gIGlmIChyZWxhdGl2ZS5ocmVmID09PSAnJykge1xuICAgIHNvdXJjZS5ocmVmID0gdXJsRm9ybWF0KHNvdXJjZSk7XG4gICAgcmV0dXJuIHNvdXJjZTtcbiAgfVxuXG4gIC8vIGhyZWZzIGxpa2UgLy9mb28vYmFyIGFsd2F5cyBjdXQgdG8gdGhlIHByb3RvY29sLlxuICBpZiAocmVsYXRpdmUuc2xhc2hlcyAmJiAhcmVsYXRpdmUucHJvdG9jb2wpIHtcbiAgICByZWxhdGl2ZS5wcm90b2NvbCA9IHNvdXJjZS5wcm90b2NvbDtcbiAgICAvL3VybFBhcnNlIGFwcGVuZHMgdHJhaWxpbmcgLyB0byB1cmxzIGxpa2UgaHR0cDovL3d3dy5leGFtcGxlLmNvbVxuICAgIGlmIChzbGFzaGVkUHJvdG9jb2xbcmVsYXRpdmUucHJvdG9jb2xdICYmXG4gICAgICAgIHJlbGF0aXZlLmhvc3RuYW1lICYmICFyZWxhdGl2ZS5wYXRobmFtZSkge1xuICAgICAgcmVsYXRpdmUucGF0aCA9IHJlbGF0aXZlLnBhdGhuYW1lID0gJy8nO1xuICAgIH1cbiAgICByZWxhdGl2ZS5ocmVmID0gdXJsRm9ybWF0KHJlbGF0aXZlKTtcbiAgICByZXR1cm4gcmVsYXRpdmU7XG4gIH1cblxuICBpZiAocmVsYXRpdmUucHJvdG9jb2wgJiYgcmVsYXRpdmUucHJvdG9jb2wgIT09IHNvdXJjZS5wcm90b2NvbCkge1xuICAgIC8vIGlmIGl0J3MgYSBrbm93biB1cmwgcHJvdG9jb2wsIHRoZW4gY2hhbmdpbmdcbiAgICAvLyB0aGUgcHJvdG9jb2wgZG9lcyB3ZWlyZCB0aGluZ3NcbiAgICAvLyBmaXJzdCwgaWYgaXQncyBub3QgZmlsZTosIHRoZW4gd2UgTVVTVCBoYXZlIGEgaG9zdCxcbiAgICAvLyBhbmQgaWYgdGhlcmUgd2FzIGEgcGF0aFxuICAgIC8vIHRvIGJlZ2luIHdpdGgsIHRoZW4gd2UgTVVTVCBoYXZlIGEgcGF0aC5cbiAgICAvLyBpZiBpdCBpcyBmaWxlOiwgdGhlbiB0aGUgaG9zdCBpcyBkcm9wcGVkLFxuICAgIC8vIGJlY2F1c2UgdGhhdCdzIGtub3duIHRvIGJlIGhvc3RsZXNzLlxuICAgIC8vIGFueXRoaW5nIGVsc2UgaXMgYXNzdW1lZCB0byBiZSBhYnNvbHV0ZS5cbiAgICBpZiAoIXNsYXNoZWRQcm90b2NvbFtyZWxhdGl2ZS5wcm90b2NvbF0pIHtcbiAgICAgIHJlbGF0aXZlLmhyZWYgPSB1cmxGb3JtYXQocmVsYXRpdmUpO1xuICAgICAgcmV0dXJuIHJlbGF0aXZlO1xuICAgIH1cbiAgICBzb3VyY2UucHJvdG9jb2wgPSByZWxhdGl2ZS5wcm90b2NvbDtcbiAgICBpZiAoIXJlbGF0aXZlLmhvc3QgJiYgIWhvc3RsZXNzUHJvdG9jb2xbcmVsYXRpdmUucHJvdG9jb2xdKSB7XG4gICAgICB2YXIgcmVsUGF0aCA9IChyZWxhdGl2ZS5wYXRobmFtZSB8fCAnJykuc3BsaXQoJy8nKTtcbiAgICAgIHdoaWxlIChyZWxQYXRoLmxlbmd0aCAmJiAhKHJlbGF0aXZlLmhvc3QgPSByZWxQYXRoLnNoaWZ0KCkpKTtcbiAgICAgIGlmICghcmVsYXRpdmUuaG9zdCkgcmVsYXRpdmUuaG9zdCA9ICcnO1xuICAgICAgaWYgKCFyZWxhdGl2ZS5ob3N0bmFtZSkgcmVsYXRpdmUuaG9zdG5hbWUgPSAnJztcbiAgICAgIGlmIChyZWxQYXRoWzBdICE9PSAnJykgcmVsUGF0aC51bnNoaWZ0KCcnKTtcbiAgICAgIGlmIChyZWxQYXRoLmxlbmd0aCA8IDIpIHJlbFBhdGgudW5zaGlmdCgnJyk7XG4gICAgICByZWxhdGl2ZS5wYXRobmFtZSA9IHJlbFBhdGguam9pbignLycpO1xuICAgIH1cbiAgICBzb3VyY2UucGF0aG5hbWUgPSByZWxhdGl2ZS5wYXRobmFtZTtcbiAgICBzb3VyY2Uuc2VhcmNoID0gcmVsYXRpdmUuc2VhcmNoO1xuICAgIHNvdXJjZS5xdWVyeSA9IHJlbGF0aXZlLnF1ZXJ5O1xuICAgIHNvdXJjZS5ob3N0ID0gcmVsYXRpdmUuaG9zdCB8fCAnJztcbiAgICBzb3VyY2UuYXV0aCA9IHJlbGF0aXZlLmF1dGg7XG4gICAgc291cmNlLmhvc3RuYW1lID0gcmVsYXRpdmUuaG9zdG5hbWUgfHwgcmVsYXRpdmUuaG9zdDtcbiAgICBzb3VyY2UucG9ydCA9IHJlbGF0aXZlLnBvcnQ7XG4gICAgLy90byBzdXBwb3J0IGh0dHAucmVxdWVzdFxuICAgIGlmIChzb3VyY2UucGF0aG5hbWUgIT09IHVuZGVmaW5lZCB8fCBzb3VyY2Uuc2VhcmNoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHNvdXJjZS5wYXRoID0gKHNvdXJjZS5wYXRobmFtZSA/IHNvdXJjZS5wYXRobmFtZSA6ICcnKSArXG4gICAgICAgICAgICAgICAgICAgIChzb3VyY2Uuc2VhcmNoID8gc291cmNlLnNlYXJjaCA6ICcnKTtcbiAgICB9XG4gICAgc291cmNlLnNsYXNoZXMgPSBzb3VyY2Uuc2xhc2hlcyB8fCByZWxhdGl2ZS5zbGFzaGVzO1xuICAgIHNvdXJjZS5ocmVmID0gdXJsRm9ybWF0KHNvdXJjZSk7XG4gICAgcmV0dXJuIHNvdXJjZTtcbiAgfVxuXG4gIHZhciBpc1NvdXJjZUFicyA9IChzb3VyY2UucGF0aG5hbWUgJiYgc291cmNlLnBhdGhuYW1lLmNoYXJBdCgwKSA9PT0gJy8nKSxcbiAgICAgIGlzUmVsQWJzID0gKFxuICAgICAgICAgIHJlbGF0aXZlLmhvc3QgIT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAgIHJlbGF0aXZlLnBhdGhuYW1lICYmIHJlbGF0aXZlLnBhdGhuYW1lLmNoYXJBdCgwKSA9PT0gJy8nXG4gICAgICApLFxuICAgICAgbXVzdEVuZEFicyA9IChpc1JlbEFicyB8fCBpc1NvdXJjZUFicyB8fFxuICAgICAgICAgICAgICAgICAgICAoc291cmNlLmhvc3QgJiYgcmVsYXRpdmUucGF0aG5hbWUpKSxcbiAgICAgIHJlbW92ZUFsbERvdHMgPSBtdXN0RW5kQWJzLFxuICAgICAgc3JjUGF0aCA9IHNvdXJjZS5wYXRobmFtZSAmJiBzb3VyY2UucGF0aG5hbWUuc3BsaXQoJy8nKSB8fCBbXSxcbiAgICAgIHJlbFBhdGggPSByZWxhdGl2ZS5wYXRobmFtZSAmJiByZWxhdGl2ZS5wYXRobmFtZS5zcGxpdCgnLycpIHx8IFtdLFxuICAgICAgcHN5Y2hvdGljID0gc291cmNlLnByb3RvY29sICYmXG4gICAgICAgICAgIXNsYXNoZWRQcm90b2NvbFtzb3VyY2UucHJvdG9jb2xdO1xuXG4gIC8vIGlmIHRoZSB1cmwgaXMgYSBub24tc2xhc2hlZCB1cmwsIHRoZW4gcmVsYXRpdmVcbiAgLy8gbGlua3MgbGlrZSAuLi8uLiBzaG91bGQgYmUgYWJsZVxuICAvLyB0byBjcmF3bCB1cCB0byB0aGUgaG9zdG5hbWUsIGFzIHdlbGwuICBUaGlzIGlzIHN0cmFuZ2UuXG4gIC8vIHNvdXJjZS5wcm90b2NvbCBoYXMgYWxyZWFkeSBiZWVuIHNldCBieSBub3cuXG4gIC8vIExhdGVyIG9uLCBwdXQgdGhlIGZpcnN0IHBhdGggcGFydCBpbnRvIHRoZSBob3N0IGZpZWxkLlxuICBpZiAocHN5Y2hvdGljKSB7XG5cbiAgICBkZWxldGUgc291cmNlLmhvc3RuYW1lO1xuICAgIGRlbGV0ZSBzb3VyY2UucG9ydDtcbiAgICBpZiAoc291cmNlLmhvc3QpIHtcbiAgICAgIGlmIChzcmNQYXRoWzBdID09PSAnJykgc3JjUGF0aFswXSA9IHNvdXJjZS5ob3N0O1xuICAgICAgZWxzZSBzcmNQYXRoLnVuc2hpZnQoc291cmNlLmhvc3QpO1xuICAgIH1cbiAgICBkZWxldGUgc291cmNlLmhvc3Q7XG4gICAgaWYgKHJlbGF0aXZlLnByb3RvY29sKSB7XG4gICAgICBkZWxldGUgcmVsYXRpdmUuaG9zdG5hbWU7XG4gICAgICBkZWxldGUgcmVsYXRpdmUucG9ydDtcbiAgICAgIGlmIChyZWxhdGl2ZS5ob3N0KSB7XG4gICAgICAgIGlmIChyZWxQYXRoWzBdID09PSAnJykgcmVsUGF0aFswXSA9IHJlbGF0aXZlLmhvc3Q7XG4gICAgICAgIGVsc2UgcmVsUGF0aC51bnNoaWZ0KHJlbGF0aXZlLmhvc3QpO1xuICAgICAgfVxuICAgICAgZGVsZXRlIHJlbGF0aXZlLmhvc3Q7XG4gICAgfVxuICAgIG11c3RFbmRBYnMgPSBtdXN0RW5kQWJzICYmIChyZWxQYXRoWzBdID09PSAnJyB8fCBzcmNQYXRoWzBdID09PSAnJyk7XG4gIH1cblxuICBpZiAoaXNSZWxBYnMpIHtcbiAgICAvLyBpdCdzIGFic29sdXRlLlxuICAgIHNvdXJjZS5ob3N0ID0gKHJlbGF0aXZlLmhvc3QgfHwgcmVsYXRpdmUuaG9zdCA9PT0gJycpID9cbiAgICAgICAgICAgICAgICAgICAgICByZWxhdGl2ZS5ob3N0IDogc291cmNlLmhvc3Q7XG4gICAgc291cmNlLmhvc3RuYW1lID0gKHJlbGF0aXZlLmhvc3RuYW1lIHx8IHJlbGF0aXZlLmhvc3RuYW1lID09PSAnJykgP1xuICAgICAgICAgICAgICAgICAgICAgIHJlbGF0aXZlLmhvc3RuYW1lIDogc291cmNlLmhvc3RuYW1lO1xuICAgIHNvdXJjZS5zZWFyY2ggPSByZWxhdGl2ZS5zZWFyY2g7XG4gICAgc291cmNlLnF1ZXJ5ID0gcmVsYXRpdmUucXVlcnk7XG4gICAgc3JjUGF0aCA9IHJlbFBhdGg7XG4gICAgLy8gZmFsbCB0aHJvdWdoIHRvIHRoZSBkb3QtaGFuZGxpbmcgYmVsb3cuXG4gIH0gZWxzZSBpZiAocmVsUGF0aC5sZW5ndGgpIHtcbiAgICAvLyBpdCdzIHJlbGF0aXZlXG4gICAgLy8gdGhyb3cgYXdheSB0aGUgZXhpc3RpbmcgZmlsZSwgYW5kIHRha2UgdGhlIG5ldyBwYXRoIGluc3RlYWQuXG4gICAgaWYgKCFzcmNQYXRoKSBzcmNQYXRoID0gW107XG4gICAgc3JjUGF0aC5wb3AoKTtcbiAgICBzcmNQYXRoID0gc3JjUGF0aC5jb25jYXQocmVsUGF0aCk7XG4gICAgc291cmNlLnNlYXJjaCA9IHJlbGF0aXZlLnNlYXJjaDtcbiAgICBzb3VyY2UucXVlcnkgPSByZWxhdGl2ZS5xdWVyeTtcbiAgfSBlbHNlIGlmICgnc2VhcmNoJyBpbiByZWxhdGl2ZSkge1xuICAgIC8vIGp1c3QgcHVsbCBvdXQgdGhlIHNlYXJjaC5cbiAgICAvLyBsaWtlIGhyZWY9Jz9mb28nLlxuICAgIC8vIFB1dCB0aGlzIGFmdGVyIHRoZSBvdGhlciB0d28gY2FzZXMgYmVjYXVzZSBpdCBzaW1wbGlmaWVzIHRoZSBib29sZWFuc1xuICAgIGlmIChwc3ljaG90aWMpIHtcbiAgICAgIHNvdXJjZS5ob3N0bmFtZSA9IHNvdXJjZS5ob3N0ID0gc3JjUGF0aC5zaGlmdCgpO1xuICAgICAgLy9vY2NhdGlvbmFseSB0aGUgYXV0aCBjYW4gZ2V0IHN0dWNrIG9ubHkgaW4gaG9zdFxuICAgICAgLy90aGlzIGVzcGVjaWFseSBoYXBwZW5zIGluIGNhc2VzIGxpa2VcbiAgICAgIC8vdXJsLnJlc29sdmVPYmplY3QoJ21haWx0bzpsb2NhbDFAZG9tYWluMScsICdsb2NhbDJAZG9tYWluMicpXG4gICAgICB2YXIgYXV0aEluSG9zdCA9IHNvdXJjZS5ob3N0ICYmIHNvdXJjZS5ob3N0LmluZGV4T2YoJ0AnKSA+IDAgP1xuICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2UuaG9zdC5zcGxpdCgnQCcpIDogZmFsc2U7XG4gICAgICBpZiAoYXV0aEluSG9zdCkge1xuICAgICAgICBzb3VyY2UuYXV0aCA9IGF1dGhJbkhvc3Quc2hpZnQoKTtcbiAgICAgICAgc291cmNlLmhvc3QgPSBzb3VyY2UuaG9zdG5hbWUgPSBhdXRoSW5Ib3N0LnNoaWZ0KCk7XG4gICAgICB9XG4gICAgfVxuICAgIHNvdXJjZS5zZWFyY2ggPSByZWxhdGl2ZS5zZWFyY2g7XG4gICAgc291cmNlLnF1ZXJ5ID0gcmVsYXRpdmUucXVlcnk7XG4gICAgLy90byBzdXBwb3J0IGh0dHAucmVxdWVzdFxuICAgIGlmIChzb3VyY2UucGF0aG5hbWUgIT09IHVuZGVmaW5lZCB8fCBzb3VyY2Uuc2VhcmNoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHNvdXJjZS5wYXRoID0gKHNvdXJjZS5wYXRobmFtZSA/IHNvdXJjZS5wYXRobmFtZSA6ICcnKSArXG4gICAgICAgICAgICAgICAgICAgIChzb3VyY2Uuc2VhcmNoID8gc291cmNlLnNlYXJjaCA6ICcnKTtcbiAgICB9XG4gICAgc291cmNlLmhyZWYgPSB1cmxGb3JtYXQoc291cmNlKTtcbiAgICByZXR1cm4gc291cmNlO1xuICB9XG4gIGlmICghc3JjUGF0aC5sZW5ndGgpIHtcbiAgICAvLyBubyBwYXRoIGF0IGFsbC4gIGVhc3kuXG4gICAgLy8gd2UndmUgYWxyZWFkeSBoYW5kbGVkIHRoZSBvdGhlciBzdHVmZiBhYm92ZS5cbiAgICBkZWxldGUgc291cmNlLnBhdGhuYW1lO1xuICAgIC8vdG8gc3VwcG9ydCBodHRwLnJlcXVlc3RcbiAgICBpZiAoIXNvdXJjZS5zZWFyY2gpIHtcbiAgICAgIHNvdXJjZS5wYXRoID0gJy8nICsgc291cmNlLnNlYXJjaDtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVsZXRlIHNvdXJjZS5wYXRoO1xuICAgIH1cbiAgICBzb3VyY2UuaHJlZiA9IHVybEZvcm1hdChzb3VyY2UpO1xuICAgIHJldHVybiBzb3VyY2U7XG4gIH1cbiAgLy8gaWYgYSB1cmwgRU5EcyBpbiAuIG9yIC4uLCB0aGVuIGl0IG11c3QgZ2V0IGEgdHJhaWxpbmcgc2xhc2guXG4gIC8vIGhvd2V2ZXIsIGlmIGl0IGVuZHMgaW4gYW55dGhpbmcgZWxzZSBub24tc2xhc2h5LFxuICAvLyB0aGVuIGl0IG11c3QgTk9UIGdldCBhIHRyYWlsaW5nIHNsYXNoLlxuICB2YXIgbGFzdCA9IHNyY1BhdGguc2xpY2UoLTEpWzBdO1xuICB2YXIgaGFzVHJhaWxpbmdTbGFzaCA9IChcbiAgICAgIChzb3VyY2UuaG9zdCB8fCByZWxhdGl2ZS5ob3N0KSAmJiAobGFzdCA9PT0gJy4nIHx8IGxhc3QgPT09ICcuLicpIHx8XG4gICAgICBsYXN0ID09PSAnJyk7XG5cbiAgLy8gc3RyaXAgc2luZ2xlIGRvdHMsIHJlc29sdmUgZG91YmxlIGRvdHMgdG8gcGFyZW50IGRpclxuICAvLyBpZiB0aGUgcGF0aCB0cmllcyB0byBnbyBhYm92ZSB0aGUgcm9vdCwgYHVwYCBlbmRzIHVwID4gMFxuICB2YXIgdXAgPSAwO1xuICBmb3IgKHZhciBpID0gc3JjUGF0aC5sZW5ndGg7IGkgPj0gMDsgaS0tKSB7XG4gICAgbGFzdCA9IHNyY1BhdGhbaV07XG4gICAgaWYgKGxhc3QgPT0gJy4nKSB7XG4gICAgICBzcmNQYXRoLnNwbGljZShpLCAxKTtcbiAgICB9IGVsc2UgaWYgKGxhc3QgPT09ICcuLicpIHtcbiAgICAgIHNyY1BhdGguc3BsaWNlKGksIDEpO1xuICAgICAgdXArKztcbiAgICB9IGVsc2UgaWYgKHVwKSB7XG4gICAgICBzcmNQYXRoLnNwbGljZShpLCAxKTtcbiAgICAgIHVwLS07XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgdGhlIHBhdGggaXMgYWxsb3dlZCB0byBnbyBhYm92ZSB0aGUgcm9vdCwgcmVzdG9yZSBsZWFkaW5nIC4uc1xuICBpZiAoIW11c3RFbmRBYnMgJiYgIXJlbW92ZUFsbERvdHMpIHtcbiAgICBmb3IgKDsgdXAtLTsgdXApIHtcbiAgICAgIHNyY1BhdGgudW5zaGlmdCgnLi4nKTtcbiAgICB9XG4gIH1cblxuICBpZiAobXVzdEVuZEFicyAmJiBzcmNQYXRoWzBdICE9PSAnJyAmJlxuICAgICAgKCFzcmNQYXRoWzBdIHx8IHNyY1BhdGhbMF0uY2hhckF0KDApICE9PSAnLycpKSB7XG4gICAgc3JjUGF0aC51bnNoaWZ0KCcnKTtcbiAgfVxuXG4gIGlmIChoYXNUcmFpbGluZ1NsYXNoICYmIChzcmNQYXRoLmpvaW4oJy8nKS5zdWJzdHIoLTEpICE9PSAnLycpKSB7XG4gICAgc3JjUGF0aC5wdXNoKCcnKTtcbiAgfVxuXG4gIHZhciBpc0Fic29sdXRlID0gc3JjUGF0aFswXSA9PT0gJycgfHxcbiAgICAgIChzcmNQYXRoWzBdICYmIHNyY1BhdGhbMF0uY2hhckF0KDApID09PSAnLycpO1xuXG4gIC8vIHB1dCB0aGUgaG9zdCBiYWNrXG4gIGlmIChwc3ljaG90aWMpIHtcbiAgICBzb3VyY2UuaG9zdG5hbWUgPSBzb3VyY2UuaG9zdCA9IGlzQWJzb2x1dGUgPyAnJyA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcmNQYXRoLmxlbmd0aCA/IHNyY1BhdGguc2hpZnQoKSA6ICcnO1xuICAgIC8vb2NjYXRpb25hbHkgdGhlIGF1dGggY2FuIGdldCBzdHVjayBvbmx5IGluIGhvc3RcbiAgICAvL3RoaXMgZXNwZWNpYWx5IGhhcHBlbnMgaW4gY2FzZXMgbGlrZVxuICAgIC8vdXJsLnJlc29sdmVPYmplY3QoJ21haWx0bzpsb2NhbDFAZG9tYWluMScsICdsb2NhbDJAZG9tYWluMicpXG4gICAgdmFyIGF1dGhJbkhvc3QgPSBzb3VyY2UuaG9zdCAmJiBzb3VyY2UuaG9zdC5pbmRleE9mKCdAJykgPiAwID9cbiAgICAgICAgICAgICAgICAgICAgIHNvdXJjZS5ob3N0LnNwbGl0KCdAJykgOiBmYWxzZTtcbiAgICBpZiAoYXV0aEluSG9zdCkge1xuICAgICAgc291cmNlLmF1dGggPSBhdXRoSW5Ib3N0LnNoaWZ0KCk7XG4gICAgICBzb3VyY2UuaG9zdCA9IHNvdXJjZS5ob3N0bmFtZSA9IGF1dGhJbkhvc3Quc2hpZnQoKTtcbiAgICB9XG4gIH1cblxuICBtdXN0RW5kQWJzID0gbXVzdEVuZEFicyB8fCAoc291cmNlLmhvc3QgJiYgc3JjUGF0aC5sZW5ndGgpO1xuXG4gIGlmIChtdXN0RW5kQWJzICYmICFpc0Fic29sdXRlKSB7XG4gICAgc3JjUGF0aC51bnNoaWZ0KCcnKTtcbiAgfVxuXG4gIHNvdXJjZS5wYXRobmFtZSA9IHNyY1BhdGguam9pbignLycpO1xuICAvL3RvIHN1cHBvcnQgcmVxdWVzdC5odHRwXG4gIGlmIChzb3VyY2UucGF0aG5hbWUgIT09IHVuZGVmaW5lZCB8fCBzb3VyY2Uuc2VhcmNoICE9PSB1bmRlZmluZWQpIHtcbiAgICBzb3VyY2UucGF0aCA9IChzb3VyY2UucGF0aG5hbWUgPyBzb3VyY2UucGF0aG5hbWUgOiAnJykgK1xuICAgICAgICAgICAgICAgICAgKHNvdXJjZS5zZWFyY2ggPyBzb3VyY2Uuc2VhcmNoIDogJycpO1xuICB9XG4gIHNvdXJjZS5hdXRoID0gcmVsYXRpdmUuYXV0aCB8fCBzb3VyY2UuYXV0aDtcbiAgc291cmNlLnNsYXNoZXMgPSBzb3VyY2Uuc2xhc2hlcyB8fCByZWxhdGl2ZS5zbGFzaGVzO1xuICBzb3VyY2UuaHJlZiA9IHVybEZvcm1hdChzb3VyY2UpO1xuICByZXR1cm4gc291cmNlO1xufVxuXG5mdW5jdGlvbiBwYXJzZUhvc3QoaG9zdCkge1xuICB2YXIgb3V0ID0ge307XG4gIHZhciBwb3J0ID0gcG9ydFBhdHRlcm4uZXhlYyhob3N0KTtcbiAgaWYgKHBvcnQpIHtcbiAgICBwb3J0ID0gcG9ydFswXTtcbiAgICBpZiAocG9ydCAhPT0gJzonKSB7XG4gICAgICBvdXQucG9ydCA9IHBvcnQuc3Vic3RyKDEpO1xuICAgIH1cbiAgICBob3N0ID0gaG9zdC5zdWJzdHIoMCwgaG9zdC5sZW5ndGggLSBwb3J0Lmxlbmd0aCk7XG4gIH1cbiAgaWYgKGhvc3QpIG91dC5ob3N0bmFtZSA9IGhvc3Q7XG4gIHJldHVybiBvdXQ7XG59XG5cbn0oKSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwidmFyIHByb2Nlc3M9cmVxdWlyZShcIl9fYnJvd3NlcmlmeV9wcm9jZXNzXCIpLGdsb2JhbD10eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge307Ly8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICghaXNTdHJpbmcoZikpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goaW5zcGVjdChhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHMuam9pbignICcpO1xuICB9XG5cbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICB2YXIgc3RyID0gU3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggPT09ICclJScpIHJldHVybiAnJSc7XG4gICAgaWYgKGkgPj0gbGVuKSByZXR1cm4geDtcbiAgICBzd2l0Y2ggKHgpIHtcbiAgICAgIGNhc2UgJyVzJzogcmV0dXJuIFN0cmluZyhhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWQnOiByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclaic6XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IgKHZhciB4ID0gYXJnc1tpXTsgaSA8IGxlbjsgeCA9IGFyZ3NbKytpXSkge1xuICAgIGlmIChpc051bGwoeCkgfHwgIWlzT2JqZWN0KHgpKSB7XG4gICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5cbi8vIE1hcmsgdGhhdCBhIG1ldGhvZCBzaG91bGQgbm90IGJlIHVzZWQuXG4vLyBSZXR1cm5zIGEgbW9kaWZpZWQgZnVuY3Rpb24gd2hpY2ggd2FybnMgb25jZSBieSBkZWZhdWx0LlxuLy8gSWYgLS1uby1kZXByZWNhdGlvbiBpcyBzZXQsIHRoZW4gaXQgaXMgYSBuby1vcC5cbmV4cG9ydHMuZGVwcmVjYXRlID0gZnVuY3Rpb24oZm4sIG1zZykge1xuICAvLyBBbGxvdyBmb3IgZGVwcmVjYXRpbmcgdGhpbmdzIGluIHRoZSBwcm9jZXNzIG9mIHN0YXJ0aW5nIHVwLlxuICBpZiAoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZGVwcmVjYXRlKGZuLCBtc2cpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLm5vRGVwcmVjYXRpb24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm47XG4gIH1cblxuICB2YXIgd2FybmVkID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGRlcHJlY2F0ZWQoKSB7XG4gICAgaWYgKCF3YXJuZWQpIHtcbiAgICAgIGlmIChwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgICB9IGVsc2UgaWYgKHByb2Nlc3MudHJhY2VEZXByZWNhdGlvbikge1xuICAgICAgICBjb25zb2xlLnRyYWNlKG1zZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICB9XG4gICAgICB3YXJuZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIHJldHVybiBkZXByZWNhdGVkO1xufTtcblxuXG52YXIgZGVidWdzID0ge307XG52YXIgZGVidWdFbnZpcm9uO1xuZXhwb3J0cy5kZWJ1Z2xvZyA9IGZ1bmN0aW9uKHNldCkge1xuICBpZiAoaXNVbmRlZmluZWQoZGVidWdFbnZpcm9uKSlcbiAgICBkZWJ1Z0Vudmlyb24gPSBwcm9jZXNzLmVudi5OT0RFX0RFQlVHIHx8ICcnO1xuICBzZXQgPSBzZXQudG9VcHBlckNhc2UoKTtcbiAgaWYgKCFkZWJ1Z3Nbc2V0XSkge1xuICAgIGlmIChuZXcgUmVnRXhwKCdcXFxcYicgKyBzZXQgKyAnXFxcXGInLCAnaScpLnRlc3QoZGVidWdFbnZpcm9uKSkge1xuICAgICAgdmFyIHBpZCA9IHByb2Nlc3MucGlkO1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1zZyA9IGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyVzICVkOiAlcycsIHNldCwgcGlkLCBtc2cpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHt9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVidWdzW3NldF07XG59O1xuXG5cbi8qKlxuICogRWNob3MgdGhlIHZhbHVlIG9mIGEgdmFsdWUuIFRyeXMgdG8gcHJpbnQgdGhlIHZhbHVlIG91dFxuICogaW4gdGhlIGJlc3Qgd2F5IHBvc3NpYmxlIGdpdmVuIHRoZSBkaWZmZXJlbnQgdHlwZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHByaW50IG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHRoYXQgYWx0ZXJzIHRoZSBvdXRwdXQuXG4gKi9cbi8qIGxlZ2FjeTogb2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKi9cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBvcHRzKSB7XG4gIC8vIGRlZmF1bHQgb3B0aW9uc1xuICB2YXIgY3R4ID0ge1xuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IHN0eWxpemVOb0NvbG9yXG4gIH07XG4gIC8vIGxlZ2FjeS4uLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSBjdHguZGVwdGggPSBhcmd1bWVudHNbMl07XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDQpIGN0eC5jb2xvcnMgPSBhcmd1bWVudHNbM107XG4gIGlmIChpc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAvLyBsZWdhY3kuLi5cbiAgICBjdHguc2hvd0hpZGRlbiA9IG9wdHM7XG4gIH0gZWxzZSBpZiAob3B0cykge1xuICAgIC8vIGdvdCBhbiBcIm9wdGlvbnNcIiBvYmplY3RcbiAgICBleHBvcnRzLl9leHRlbmQoY3R4LCBvcHRzKTtcbiAgfVxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmIChpc1VuZGVmaW5lZChjdHguc2hvd0hpZGRlbikpIGN0eC5zaG93SGlkZGVuID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguZGVwdGgpKSBjdHguZGVwdGggPSAyO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpIGN0eC5jb2xvcnMgPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jdXN0b21JbnNwZWN0KSkgY3R4LmN1c3RvbUluc3BlY3QgPSB0cnVlO1xuICBpZiAoY3R4LmNvbG9ycykgY3R4LnN0eWxpemUgPSBzdHlsaXplV2l0aENvbG9yO1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosIGN0eC5kZXB0aCk7XG59XG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXG5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuaW5zcGVjdC5jb2xvcnMgPSB7XG4gICdib2xkJyA6IFsxLCAyMl0sXG4gICdpdGFsaWMnIDogWzMsIDIzXSxcbiAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAnd2hpdGUnIDogWzM3LCAzOV0sXG4gICdncmV5JyA6IFs5MCwgMzldLFxuICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICdibHVlJyA6IFszNCwgMzldLFxuICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAnbWFnZW50YScgOiBbMzUsIDM5XSxcbiAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgJ3llbGxvdycgOiBbMzMsIDM5XVxufTtcblxuLy8gRG9uJ3QgdXNlICdibHVlJyBub3QgdmlzaWJsZSBvbiBjbWQuZXhlXG5pbnNwZWN0LnN0eWxlcyA9IHtcbiAgJ3NwZWNpYWwnOiAnY3lhbicsXG4gICdudW1iZXInOiAneWVsbG93JyxcbiAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgJ251bGwnOiAnYm9sZCcsXG4gICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgLy8gXCJuYW1lXCI6IGludGVudGlvbmFsbHkgbm90IHN0eWxpbmdcbiAgJ3JlZ2V4cCc6ICdyZWQnXG59O1xuXG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRoQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgdmFyIHN0eWxlID0gaW5zcGVjdC5zdHlsZXNbc3R5bGVUeXBlXTtcblxuICBpZiAoc3R5bGUpIHtcbiAgICByZXR1cm4gJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMV0gKyAnbSc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblxuZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpIHtcbiAgdmFyIGhhc2ggPSB7fTtcblxuICBhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMsIGN0eCk7XG4gICAgaWYgKCFpc1N0cmluZyhyZXQpKSB7XG4gICAgICByZXQgPSBmb3JtYXRWYWx1ZShjdHgsIHJldCwgcmVjdXJzZVRpbWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gIHZhciBwcmltaXRpdmUgPSBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSk7XG4gIGlmIChwcmltaXRpdmUpIHtcbiAgICByZXR1cm4gcHJpbWl0aXZlO1xuICB9XG5cbiAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKTtcbiAgfVxuXG4gIC8vIElFIGRvZXNuJ3QgbWFrZSBlcnJvciBmaWVsZHMgbm9uLWVudW1lcmFibGVcbiAgLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2llL2R3dzUyc2J0KHY9dnMuOTQpLmFzcHhcbiAgaWYgKGlzRXJyb3IodmFsdWUpXG4gICAgICAmJiAoa2V5cy5pbmRleE9mKCdtZXNzYWdlJykgPj0gMCB8fCBrZXlzLmluZGV4T2YoJ2Rlc2NyaXB0aW9uJykgPj0gMCkpIHtcbiAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG4gIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpIHx8IHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbiAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLCBrZXkpKSB7XG4gICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgfVxuICBpZiAoIXN0cikge1xuICAgIGlmIChjdHguc2Vlbi5pbmRleE9mKGRlc2MudmFsdWUpIDwgMCkge1xuICAgICAgaWYgKGlzTnVsbChyZWN1cnNlVGltZXMpKSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgfVxuICAgICAgaWYgKHN0ci5pbmRleE9mKCdcXG4nKSA+IC0xKSB7XG4gICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zdWJzdHIoMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyID0gJ1xcbicgKyBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbQ2lyY3VsYXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgaWYgKGFycmF5ICYmIGtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIG5hbWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIGtleSk7XG4gICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJlxuICAgICAgKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5leHBvcnRzLmlzQnVmZmVyID0gcmVxdWlyZSgnLi9zdXBwb3J0L2lzQnVmZmVyJyk7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuXG5mdW5jdGlvbiBwYWQobikge1xuICByZXR1cm4gbiA8IDEwID8gJzAnICsgbi50b1N0cmluZygxMCkgOiBuLnRvU3RyaW5nKDEwKTtcbn1cblxuXG52YXIgbW9udGhzID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG4vLyAyNiBGZWIgMTY6MTk6MzRcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICB2YXIgdGltZSA9IFtwYWQoZC5nZXRIb3VycygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0TWludXRlcygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0U2Vjb25kcygpKV0uam9pbignOicpO1xuICByZXR1cm4gW2QuZ2V0RGF0ZSgpLCBtb250aHNbZC5nZXRNb250aCgpXSwgdGltZV0uam9pbignICcpO1xufVxuXG5cbi8vIGxvZyBpcyBqdXN0IGEgdGhpbiB3cmFwcGVyIHRvIGNvbnNvbGUubG9nIHRoYXQgcHJlcGVuZHMgYSB0aW1lc3RhbXBcbmV4cG9ydHMubG9nID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCclcyAtICVzJywgdGltZXN0YW1wKCksIGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cykpO1xufTtcblxuXG4vKipcbiAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAqXG4gKiBUaGUgRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzIGZyb20gbGFuZy5qcyByZXdyaXR0ZW4gYXMgYSBzdGFuZGFsb25lXG4gKiBmdW5jdGlvbiAobm90IG9uIEZ1bmN0aW9uLnByb3RvdHlwZSkuIE5PVEU6IElmIHRoaXMgZmlsZSBpcyB0byBiZSBsb2FkZWRcbiAqIGR1cmluZyBib290c3RyYXBwaW5nIHRoaXMgZnVuY3Rpb24gbmVlZHMgdG8gYmUgcmV3cml0dGVuIHVzaW5nIHNvbWUgbmF0aXZlXG4gKiBmdW5jdGlvbnMgYXMgcHJvdG90eXBlIHNldHVwIHVzaW5nIG5vcm1hbCBKYXZhU2NyaXB0IGRvZXMgbm90IHdvcmsgYXNcbiAqIGV4cGVjdGVkIGR1cmluZyBib290c3RyYXBwaW5nIChzZWUgbWlycm9yLmpzIGluIHIxMTQ5MDMpLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gd2hpY2ggbmVlZHMgdG8gaW5oZXJpdCB0aGVcbiAqICAgICBwcm90b3R5cGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gdG8gaW5oZXJpdCBwcm90b3R5cGUgZnJvbS5cbiAqL1xuZXhwb3J0cy5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmV4cG9ydHMuX2V4dGVuZCA9IGZ1bmN0aW9uKG9yaWdpbiwgYWRkKSB7XG4gIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgaWYgKCFhZGQgfHwgIWlzT2JqZWN0KGFkZCkpIHJldHVybiBvcmlnaW47XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59O1xuXG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuIl19
(2)
});
