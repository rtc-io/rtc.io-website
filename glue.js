!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.glue=e():"undefined"!=typeof global?global.glue=e():"undefined"!=typeof self&&(self.glue=e())}(function(){var define,module,exports;
return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){


//
// The shims in this file are not fully implemented shims for the ES5
// features, but do work for the particular usecases there is in
// the other modules.
//

var toString = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

// Array.isArray is supported in IE9
function isArray(xs) {
  return toString.call(xs) === '[object Array]';
}
exports.isArray = typeof Array.isArray === 'function' ? Array.isArray : isArray;

// Array.prototype.indexOf is supported in IE9
exports.indexOf = function indexOf(xs, x) {
  if (xs.indexOf) return xs.indexOf(x);
  for (var i = 0; i < xs.length; i++) {
    if (x === xs[i]) return i;
  }
  return -1;
};

// Array.prototype.filter is supported in IE9
exports.filter = function filter(xs, fn) {
  if (xs.filter) return xs.filter(fn);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    if (fn(xs[i], i, xs)) res.push(xs[i]);
  }
  return res;
};

// Array.prototype.forEach is supported in IE9
exports.forEach = function forEach(xs, fn, self) {
  if (xs.forEach) return xs.forEach(fn, self);
  for (var i = 0; i < xs.length; i++) {
    fn.call(self, xs[i], i, xs);
  }
};

// Array.prototype.map is supported in IE9
exports.map = function map(xs, fn) {
  if (xs.map) return xs.map(fn);
  var out = new Array(xs.length);
  for (var i = 0; i < xs.length; i++) {
    out[i] = fn(xs[i], i, xs);
  }
  return out;
};

// Array.prototype.reduce is supported in IE9
exports.reduce = function reduce(array, callback, opt_initialValue) {
  if (array.reduce) return array.reduce(callback, opt_initialValue);
  var value, isValueSet = false;

  if (2 < arguments.length) {
    value = opt_initialValue;
    isValueSet = true;
  }
  for (var i = 0, l = array.length; l > i; ++i) {
    if (array.hasOwnProperty(i)) {
      if (isValueSet) {
        value = callback(value, array[i], i, array);
      }
      else {
        value = array[i];
        isValueSet = true;
      }
    }
  }

  return value;
};

// String.prototype.substr - negative index don't work in IE8
if ('ab'.substr(-1) !== 'b') {
  exports.substr = function (str, start, length) {
    // did we get a negative start, calculate how much it is from the beginning of the string
    if (start < 0) start = str.length + start;

    // call the original function
    return str.substr(start, length);
  };
} else {
  exports.substr = function (str, start, length) {
    return str.substr(start, length);
  };
}

// String.prototype.trim is supported in IE9
exports.trim = function (str) {
  if (str.trim) return str.trim();
  return str.replace(/^\s+|\s+$/g, '');
};

// Function.prototype.bind is supported in IE9
exports.bind = function () {
  var args = Array.prototype.slice.call(arguments);
  var fn = args.shift();
  if (fn.bind) return fn.bind.apply(fn, args);
  var self = args.shift();
  return function () {
    fn.apply(self, args.concat([Array.prototype.slice.call(arguments)]));
  };
};

// Object.create is supported in IE9
function create(prototype, properties) {
  var object;
  if (prototype === null) {
    object = { '__proto__' : null };
  }
  else {
    if (typeof prototype !== 'object') {
      throw new TypeError(
        'typeof prototype[' + (typeof prototype) + '] != \'object\''
      );
    }
    var Type = function () {};
    Type.prototype = prototype;
    object = new Type();
    object.__proto__ = prototype;
  }
  if (typeof properties !== 'undefined' && Object.defineProperties) {
    Object.defineProperties(object, properties);
  }
  return object;
}
exports.create = typeof Object.create === 'function' ? Object.create : create;

// Object.keys and Object.getOwnPropertyNames is supported in IE9 however
// they do show a description and number property on Error objects
function notObject(object) {
  return ((typeof object != "object" && typeof object != "function") || object === null);
}

function keysShim(object) {
  if (notObject(object)) {
    throw new TypeError("Object.keys called on a non-object");
  }

  var result = [];
  for (var name in object) {
    if (hasOwnProperty.call(object, name)) {
      result.push(name);
    }
  }
  return result;
}

// getOwnPropertyNames is almost the same as Object.keys one key feature
//  is that it returns hidden properties, since that can't be implemented,
//  this feature gets reduced so it just shows the length property on arrays
function propertyShim(object) {
  if (notObject(object)) {
    throw new TypeError("Object.getOwnPropertyNames called on a non-object");
  }

  var result = keysShim(object);
  if (exports.isArray(object) && exports.indexOf(object, 'length') === -1) {
    result.push('length');
  }
  return result;
}

var keys = typeof Object.keys === 'function' ? Object.keys : keysShim;
var getOwnPropertyNames = typeof Object.getOwnPropertyNames === 'function' ?
  Object.getOwnPropertyNames : propertyShim;

if (new Error().hasOwnProperty('description')) {
  var ERROR_PROPERTY_FILTER = function (obj, array) {
    if (toString.call(obj) === '[object Error]') {
      array = exports.filter(array, function (name) {
        return name !== 'description' && name !== 'number' && name !== 'message';
      });
    }
    return array;
  };

  exports.keys = function (object) {
    return ERROR_PROPERTY_FILTER(object, keys(object));
  };
  exports.getOwnPropertyNames = function (object) {
    return ERROR_PROPERTY_FILTER(object, getOwnPropertyNames(object));
  };
} else {
  exports.keys = keys;
  exports.getOwnPropertyNames = getOwnPropertyNames;
}

// Object.getOwnPropertyDescriptor - supported in IE8 but only on dom elements
function valueObject(value, key) {
  return { value: value[key] };
}

if (typeof Object.getOwnPropertyDescriptor === 'function') {
  try {
    Object.getOwnPropertyDescriptor({'a': 1}, 'a');
    exports.getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  } catch (e) {
    // IE8 dom element issue - use a try catch and default to valueObject
    exports.getOwnPropertyDescriptor = function (value, key) {
      try {
        return Object.getOwnPropertyDescriptor(value, key);
      } catch (e) {
        return valueObject(value, key);
      }
    };
  }
} else {
  exports.getOwnPropertyDescriptor = valueObject;
}

},{}],2:[function(require,module,exports){
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

// UTILITY
var util = require('util');
var shims = require('_shims');
var pSlice = Array.prototype.slice;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  this.message = options.message || getMessage(this);
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = shims.keys(a),
        kb = shims.keys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};
},{"_shims":1,"util":6}],3:[function(require,module,exports){
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

var util = require('util');

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
  if (!util.isNumber(n) || n < 0)
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
        (util.isObject(this._events.error) && !this._events.error.length)) {
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

  if (util.isUndefined(handler))
    return false;

  if (util.isFunction(handler)) {
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
  } else if (util.isObject(handler)) {
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

  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              util.isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (util.isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (util.isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!util.isUndefined(this._maxListeners)) {
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
  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  function g() {
    this.removeListener(type, g);
    listener.apply(this, arguments);
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (util.isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (util.isObject(list)) {
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

  if (util.isFunction(listeners)) {
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
  else if (util.isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (util.isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};
},{"util":6}],4:[function(require,module,exports){
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

// Query String Utilities

var QueryString = exports;
var util = require('util');
var shims = require('_shims');
var Buffer = require('buffer').Buffer;

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}


function charCode(c) {
  return c.charCodeAt(0);
}


// a safe fast alternative to decodeURIComponent
QueryString.unescapeBuffer = function(s, decodeSpaces) {
  var out = new Buffer(s.length);
  var state = 'CHAR'; // states: CHAR, HEX0, HEX1
  var n, m, hexchar;

  for (var inIndex = 0, outIndex = 0; inIndex <= s.length; inIndex++) {
    var c = s.charCodeAt(inIndex);
    switch (state) {
      case 'CHAR':
        switch (c) {
          case charCode('%'):
            n = 0;
            m = 0;
            state = 'HEX0';
            break;
          case charCode('+'):
            if (decodeSpaces) c = charCode(' ');
            // pass thru
          default:
            out[outIndex++] = c;
            break;
        }
        break;

      case 'HEX0':
        state = 'HEX1';
        hexchar = c;
        if (charCode('0') <= c && c <= charCode('9')) {
          n = c - charCode('0');
        } else if (charCode('a') <= c && c <= charCode('f')) {
          n = c - charCode('a') + 10;
        } else if (charCode('A') <= c && c <= charCode('F')) {
          n = c - charCode('A') + 10;
        } else {
          out[outIndex++] = charCode('%');
          out[outIndex++] = c;
          state = 'CHAR';
          break;
        }
        break;

      case 'HEX1':
        state = 'CHAR';
        if (charCode('0') <= c && c <= charCode('9')) {
          m = c - charCode('0');
        } else if (charCode('a') <= c && c <= charCode('f')) {
          m = c - charCode('a') + 10;
        } else if (charCode('A') <= c && c <= charCode('F')) {
          m = c - charCode('A') + 10;
        } else {
          out[outIndex++] = charCode('%');
          out[outIndex++] = hexchar;
          out[outIndex++] = c;
          break;
        }
        out[outIndex++] = 16 * n + m;
        break;
    }
  }

  // TODO support returning arbitrary buffers.

  return out.slice(0, outIndex - 1);
};


QueryString.unescape = function(s, decodeSpaces) {
  return QueryString.unescapeBuffer(s, decodeSpaces).toString();
};


QueryString.escape = function(str) {
  return encodeURIComponent(str);
};

var stringifyPrimitive = function(v) {
  if (util.isString(v))
    return v;
  if (util.isBoolean(v))
    return v ? 'true' : 'false';
  if (util.isNumber(v))
    return isFinite(v) ? v : '';
  return '';
};


QueryString.stringify = QueryString.encode = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (util.isNull(obj)) {
    obj = undefined;
  }

  if (util.isObject(obj)) {
    return shims.map(shims.keys(obj), function(k) {
      var ks = QueryString.escape(stringifyPrimitive(k)) + eq;
      if (util.isArray(obj[k])) {
        return shims.map(obj[k], function(v) {
          return ks + QueryString.escape(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + QueryString.escape(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return QueryString.escape(stringifyPrimitive(name)) + eq +
         QueryString.escape(stringifyPrimitive(obj));
};

// Parse a key=val string.
QueryString.parse = QueryString.decode = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (!util.isString(qs) || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && util.isNumber(options.maxKeys)) {
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

    try {
      k = decodeURIComponent(kstr);
      v = decodeURIComponent(vstr);
    } catch (e) {
      k = QueryString.unescape(kstr, true);
      v = QueryString.unescape(vstr, true);
    }

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (util.isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};
},{"_shims":1,"buffer":8,"util":6}],5:[function(require,module,exports){
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

var punycode = { encode : function (s) { return s } };
var util = require('util');
var shims = require('_shims');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
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
  if (url && util.isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!util.isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = shims.trim(rest);

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
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
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
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
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a puny coded representation of "domain".
      // It only converts the part of the domain name that
      // has non ASCII characters. I.e. it dosent matter if
      // you call it with a domain that already is in ASCII.
      var domainArray = this.hostname.split('.');
      var newOut = [];
      for (var i = 0; i < domainArray.length; ++i) {
        var s = domainArray[i];
        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
            'xn--' + punycode.encode(s) : s);
      }
      this.hostname = newOut.join('.');
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
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
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (util.isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      util.isObject(this.query) &&
      shims.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && shims.substr(protocol, -1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (util.isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  shims.forEach(shims.keys(this), function(k) {
    result[k] = this[k];
  }, this);

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    shims.forEach(shims.keys(relative), function(k) {
      if (k !== 'protocol')
        result[k] = relative[k];
    });

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      shims.forEach(shims.keys(relative), function(k) {
        result[k] = relative[k];
      });
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!util.isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host) && (last === '.' || last === '..') ||
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

  if (hasTrailingSlash && (shims.substr(srcPath.join('/'), -1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};
},{"_shims":1,"querystring":4,"util":6}],6:[function(require,module,exports){
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

var shims = require('_shims');

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

  shims.forEach(array, function(val, idx) {
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
    var ret = value.inspect(recurseTimes);
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
  var keys = shims.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = shims.getOwnPropertyNames(value);
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

  shims.forEach(keys, function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = shims.getOwnPropertyDescriptor(value, key) || { value: value[key] };
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
    if (shims.indexOf(ctx.seen, desc.value) < 0) {
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
  var length = shims.reduce(output, function(prev, cur) {
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
  return shims.isArray(ar);
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
  return typeof arg === 'object' && arg;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) && objectToString(e) === '[object Error]';
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

function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.binarySlice === 'function'
  ;
}
exports.isBuffer = isBuffer;

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
exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = shims.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = shims.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

},{"_shims":1}],7:[function(require,module,exports){
exports.readIEEE754 = function(buffer, offset, isBE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isBE ? 0 : (nBytes - 1),
      d = isBE ? 1 : -1,
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

exports.writeIEEE754 = function(buffer, value, offset, isBE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isBE ? (nBytes - 1) : 0,
      d = isBE ? -1 : 1,
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

},{}],8:[function(require,module,exports){
var assert;
exports.Buffer = Buffer;
exports.SlowBuffer = Buffer;
Buffer.poolSize = 8192;
exports.INSPECT_MAX_BYTES = 50;

function stringtrim(str) {
  if (str.trim) return str.trim();
  return str.replace(/^\s+|\s+$/g, '');
}

function Buffer(subject, encoding, offset) {
  if(!assert) assert= require('assert');
  if (!(this instanceof Buffer)) {
    return new Buffer(subject, encoding, offset);
  }
  this.parent = this;
  this.offset = 0;

  // Work-around: node's base64 implementation
  // allows for non-padded strings while base64-js
  // does not..
  if (encoding == "base64" && typeof subject == "string") {
    subject = stringtrim(subject);
    while (subject.length % 4 != 0) {
      subject = subject + "="; 
    }
  }

  var type;

  // Are we slicing?
  if (typeof offset === 'number') {
    this.length = coerce(encoding);
    // slicing works, with limitations (no parent tracking/update)
    // check https://github.com/toots/buffer-browserify/issues/19
    for (var i = 0; i < this.length; i++) {
        this[i] = subject.get(i+offset);
    }
  } else {
    // Find the length
    switch (type = typeof subject) {
      case 'number':
        this.length = coerce(subject);
        break;

      case 'string':
        this.length = Buffer.byteLength(subject, encoding);
        break;

      case 'object': // Assume object is an array
        this.length = coerce(subject.length);
        break;

      default:
        throw new Error('First argument needs to be a number, ' +
                        'array or string.');
    }

    // Treat array-ish objects as a byte array.
    if (isArrayIsh(subject)) {
      for (var i = 0; i < this.length; i++) {
        if (subject instanceof Buffer) {
          this[i] = subject.readUInt8(i);
        }
        else {
          this[i] = subject[i];
        }
      }
    } else if (type == 'string') {
      // We are a string
      this.length = this.write(subject, 0, encoding);
    } else if (type === 'number') {
      for (var i = 0; i < this.length; i++) {
        this[i] = 0;
      }
    }
  }
}

Buffer.prototype.get = function get(i) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this[i];
};

Buffer.prototype.set = function set(i, v) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this[i] = v;
};

Buffer.byteLength = function (str, encoding) {
  switch (encoding || "utf8") {
    case 'hex':
      return str.length / 2;

    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(str).length;

    case 'ascii':
    case 'binary':
      return str.length;

    case 'base64':
      return base64ToBytes(str).length;

    default:
      throw new Error('Unknown encoding');
  }
};

Buffer.prototype.utf8Write = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten =  blitBuffer(utf8ToBytes(string), this, offset, length);
};

Buffer.prototype.asciiWrite = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten =  blitBuffer(asciiToBytes(string), this, offset, length);
};

Buffer.prototype.binaryWrite = Buffer.prototype.asciiWrite;

Buffer.prototype.base64Write = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten = blitBuffer(base64ToBytes(string), this, offset, length);
};

Buffer.prototype.base64Slice = function (start, end) {
  var bytes = Array.prototype.slice.apply(this, arguments)
  return require("base64-js").fromByteArray(bytes);
};

Buffer.prototype.utf8Slice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var res = "";
  var tmp = "";
  var i = 0;
  while (i < bytes.length) {
    if (bytes[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(bytes[i]);
      tmp = "";
    } else
      tmp += "%" + bytes[i].toString(16);

    i++;
  }

  return res + decodeUtf8Char(tmp);
}

Buffer.prototype.asciiSlice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var ret = "";
  for (var i = 0; i < bytes.length; i++)
    ret += String.fromCharCode(bytes[i]);
  return ret;
}

Buffer.prototype.binarySlice = Buffer.prototype.asciiSlice;

Buffer.prototype.inspect = function() {
  var out = [],
      len = this.length;
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }
  return '<Buffer ' + out.join(' ') + '>';
};


Buffer.prototype.hexSlice = function(start, end) {
  var len = this.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; i++) {
    out += toHex(this[i]);
  }
  return out;
};


Buffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();
  start = +start || 0;
  if (typeof end == 'undefined') end = this.length;

  // Fastpath empty strings
  if (+end == start) {
    return '';
  }

  switch (encoding) {
    case 'hex':
      return this.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.utf8Slice(start, end);

    case 'ascii':
      return this.asciiSlice(start, end);

    case 'binary':
      return this.binarySlice(start, end);

    case 'base64':
      return this.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


Buffer.prototype.hexWrite = function(string, offset, length) {
  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2) {
    throw new Error('Invalid hex string');
  }
  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(byte)) throw new Error('Invalid hex string');
    this[offset + i] = byte;
  }
  Buffer._charsWritten = i * 2;
  return i;
};


Buffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  switch (encoding) {
    case 'hex':
      return this.hexWrite(string, offset, length);

    case 'utf8':
    case 'utf-8':
      return this.utf8Write(string, offset, length);

    case 'ascii':
      return this.asciiWrite(string, offset, length);

    case 'binary':
      return this.binaryWrite(string, offset, length);

    case 'base64':
      return this.base64Write(string, offset, length);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Write(string, offset, length);

    default:
      throw new Error('Unknown encoding');
  }
};

// slice(start, end)
function clamp(index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue;
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len;
  if (index >= 0) return index;
  index += len;
  if (index >= 0) return index;
  return 0;
}

Buffer.prototype.slice = function(start, end) {
  var len = this.length;
  start = clamp(start, len, 0);
  end = clamp(end, len, len);
  return new Buffer(this, end - start, +start);
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function(target, target_start, start, end) {
  var source = this;
  start || (start = 0);
  if (end === undefined || isNaN(end)) {
    end = this.length;
  }
  target_start || (target_start = 0);

  if (end < start) throw new Error('sourceEnd < sourceStart');

  // Copy 0 bytes; we're done
  if (end === start) return 0;
  if (target.length == 0 || source.length == 0) return 0;

  if (target_start < 0 || target_start >= target.length) {
    throw new Error('targetStart out of bounds');
  }

  if (start < 0 || start >= source.length) {
    throw new Error('sourceStart out of bounds');
  }

  if (end < 0 || end > source.length) {
    throw new Error('sourceEnd out of bounds');
  }

  // Are we oob?
  if (end > this.length) {
    end = this.length;
  }

  if (target.length - target_start < end - start) {
    end = target.length - target_start + start;
  }

  var temp = [];
  for (var i=start; i<end; i++) {
    assert.ok(typeof this[i] !== 'undefined', "copying undefined buffer bytes!");
    temp.push(this[i]);
  }

  for (var i=target_start; i<target_start+temp.length; i++) {
    target[i] = temp[i-target_start];
  }
};

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill(value, start, end) {
  value || (value = 0);
  start || (start = 0);
  end || (end = this.length);

  if (typeof value === 'string') {
    value = value.charCodeAt(0);
  }
  if (!(typeof value === 'number') || isNaN(value)) {
    throw new Error('value is not a number');
  }

  if (end < start) throw new Error('end < start');

  // Fill 0 bytes; we're done
  if (end === start) return 0;
  if (this.length == 0) return 0;

  if (start < 0 || start >= this.length) {
    throw new Error('start out of bounds');
  }

  if (end < 0 || end > this.length) {
    throw new Error('end out of bounds');
  }

  for (var i = start; i < end; i++) {
    this[i] = value;
  }
}

// Static methods
Buffer.isBuffer = function isBuffer(b) {
  return b instanceof Buffer || b instanceof Buffer;
};

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) {
    throw new Error("Usage: Buffer.concat(list, [totalLength])\n \
      list should be an Array.");
  }

  if (list.length === 0) {
    return new Buffer(0);
  } else if (list.length === 1) {
    return list[0];
  }

  if (typeof totalLength !== 'number') {
    totalLength = 0;
    for (var i = 0; i < list.length; i++) {
      var buf = list[i];
      totalLength += buf.length;
    }
  }

  var buffer = new Buffer(totalLength);
  var pos = 0;
  for (var i = 0; i < list.length; i++) {
    var buf = list[i];
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer;
};

Buffer.isEncoding = function(encoding) {
  switch ((encoding + '').toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
    case 'raw':
      return true;

    default:
      return false;
  }
};

// helpers

function coerce(length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length);
  return length < 0 ? 0 : length;
}

function isArray(subject) {
  return (Array.isArray ||
    function(subject){
      return {}.toString.apply(subject) == '[object Array]'
    })
    (subject)
}

function isArrayIsh(subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
         subject && typeof subject === 'object' &&
         typeof subject.length === 'number';
}

function toHex(n) {
  if (n < 16) return '0' + n.toString(16);
  return n.toString(16);
}

function utf8ToBytes(str) {
  var byteArray = [];
  for (var i = 0; i < str.length; i++)
    if (str.charCodeAt(i) <= 0x7F)
      byteArray.push(str.charCodeAt(i));
    else {
      var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16));
    }

  return byteArray;
}

function asciiToBytes(str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++ )
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push( str.charCodeAt(i) & 0xFF );

  return byteArray;
}

function base64ToBytes(str) {
  return require("base64-js").toByteArray(str);
}

function blitBuffer(src, dst, offset, length) {
  var pos, i = 0;
  while (i < length) {
    if ((i+offset >= dst.length) || (i >= src.length))
      break;

    dst[i + offset] = src[i];
    i++;
  }
  return i;
}

function decodeUtf8Char(str) {
  try {
    return decodeURIComponent(str);
  } catch (err) {
    return String.fromCharCode(0xFFFD); // UTF 8 invalid char
  }
}

// read/write bit-twiddling

Buffer.prototype.readUInt8 = function(offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  return buffer[offset];
};

function readUInt16(buffer, offset, isBigEndian, noAssert) {
  var val = 0;


  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    val = buffer[offset] << 8;
    if (offset + 1 < buffer.length) {
      val |= buffer[offset + 1];
    }
  } else {
    val = buffer[offset];
    if (offset + 1 < buffer.length) {
      val |= buffer[offset + 1] << 8;
    }
  }

  return val;
}

Buffer.prototype.readUInt16LE = function(offset, noAssert) {
  return readUInt16(this, offset, false, noAssert);
};

Buffer.prototype.readUInt16BE = function(offset, noAssert) {
  return readUInt16(this, offset, true, noAssert);
};

function readUInt32(buffer, offset, isBigEndian, noAssert) {
  var val = 0;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    if (offset + 1 < buffer.length)
      val = buffer[offset + 1] << 16;
    if (offset + 2 < buffer.length)
      val |= buffer[offset + 2] << 8;
    if (offset + 3 < buffer.length)
      val |= buffer[offset + 3];
    val = val + (buffer[offset] << 24 >>> 0);
  } else {
    if (offset + 2 < buffer.length)
      val = buffer[offset + 2] << 16;
    if (offset + 1 < buffer.length)
      val |= buffer[offset + 1] << 8;
    val |= buffer[offset];
    if (offset + 3 < buffer.length)
      val = val + (buffer[offset + 3] << 24 >>> 0);
  }

  return val;
}

Buffer.prototype.readUInt32LE = function(offset, noAssert) {
  return readUInt32(this, offset, false, noAssert);
};

Buffer.prototype.readUInt32BE = function(offset, noAssert) {
  return readUInt32(this, offset, true, noAssert);
};


/*
 * Signed integer types, yay team! A reminder on how two's complement actually
 * works. The first bit is the signed bit, i.e. tells us whether or not the
 * number should be positive or negative. If the two's complement value is
 * positive, then we're done, as it's equivalent to the unsigned representation.
 *
 * Now if the number is positive, you're pretty much done, you can just leverage
 * the unsigned translations and return those. Unfortunately, negative numbers
 * aren't quite that straightforward.
 *
 * At first glance, one might be inclined to use the traditional formula to
 * translate binary numbers between the positive and negative values in two's
 * complement. (Though it doesn't quite work for the most negative value)
 * Mainly:
 *  - invert all the bits
 *  - add one to the result
 *
 * Of course, this doesn't quite work in Javascript. Take for example the value
 * of -128. This could be represented in 16 bits (big-endian) as 0xff80. But of
 * course, Javascript will do the following:
 *
 * > ~0xff80
 * -65409
 *
 * Whoh there, Javascript, that's not quite right. But wait, according to
 * Javascript that's perfectly correct. When Javascript ends up seeing the
 * constant 0xff80, it has no notion that it is actually a signed number. It
 * assumes that we've input the unsigned value 0xff80. Thus, when it does the
 * binary negation, it casts it into a signed value, (positive 0xff80). Then
 * when you perform binary negation on that, it turns it into a negative number.
 *
 * Instead, we're going to have to use the following general formula, that works
 * in a rather Javascript friendly way. I'm glad we don't support this kind of
 * weird numbering scheme in the kernel.
 *
 * (BIT-MAX - (unsigned)val + 1) * -1
 *
 * The astute observer, may think that this doesn't make sense for 8-bit numbers
 * (really it isn't necessary for them). However, when you get 16-bit numbers,
 * you do. Let's go back to our prior example and see how this will look:
 *
 * (0xffff - 0xff80 + 1) * -1
 * (0x007f + 1) * -1
 * (0x0080) * -1
 */
Buffer.prototype.readInt8 = function(offset, noAssert) {
  var buffer = this;
  var neg;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  neg = buffer[offset] & 0x80;
  if (!neg) {
    return (buffer[offset]);
  }

  return ((0xff - buffer[offset] + 1) * -1);
};

function readInt16(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt16(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x8000;
  if (!neg) {
    return val;
  }

  return (0xffff - val + 1) * -1;
}

Buffer.prototype.readInt16LE = function(offset, noAssert) {
  return readInt16(this, offset, false, noAssert);
};

Buffer.prototype.readInt16BE = function(offset, noAssert) {
  return readInt16(this, offset, true, noAssert);
};

function readInt32(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt32(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x80000000;
  if (!neg) {
    return (val);
  }

  return (0xffffffff - val + 1) * -1;
}

Buffer.prototype.readInt32LE = function(offset, noAssert) {
  return readInt32(this, offset, false, noAssert);
};

Buffer.prototype.readInt32BE = function(offset, noAssert) {
  return readInt32(this, offset, true, noAssert);
};

function readFloat(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.readFloatLE = function(offset, noAssert) {
  return readFloat(this, offset, false, noAssert);
};

Buffer.prototype.readFloatBE = function(offset, noAssert) {
  return readFloat(this, offset, true, noAssert);
};

function readDouble(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 7 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.readDoubleLE = function(offset, noAssert) {
  return readDouble(this, offset, false, noAssert);
};

Buffer.prototype.readDoubleBE = function(offset, noAssert) {
  return readDouble(this, offset, true, noAssert);
};


/*
 * We have to make sure that the value is a valid integer. This means that it is
 * non-negative. It has no fractional component and that it does not exceed the
 * maximum allowed value.
 *
 *      value           The number to check for validity
 *
 *      max             The maximum value
 */
function verifuint(value, max) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value >= 0,
      'specified a negative value for writing an unsigned value');

  assert.ok(value <= max, 'value is larger than maximum value for type');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

Buffer.prototype.writeUInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xff);
  }

  if (offset < buffer.length) {
    buffer[offset] = value;
  }
};

function writeUInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 2); i++) {
    buffer[offset + i] =
        (value & (0xff << (8 * (isBigEndian ? 1 - i : i)))) >>>
            (isBigEndian ? 1 - i : i) * 8;
  }

}

Buffer.prototype.writeUInt16LE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt16BE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, true, noAssert);
};

function writeUInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffffffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 4); i++) {
    buffer[offset + i] =
        (value >>> (isBigEndian ? 3 - i : i) * 8) & 0xff;
  }
}

Buffer.prototype.writeUInt32LE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt32BE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, true, noAssert);
};


/*
 * We now move onto our friends in the signed number category. Unlike unsigned
 * numbers, we're going to have to worry a bit more about how we put values into
 * arrays. Since we are only worrying about signed 32-bit values, we're in
 * slightly better shape. Unfortunately, we really can't do our favorite binary
 * & in this system. It really seems to do the wrong thing. For example:
 *
 * > -32 & 0xff
 * 224
 *
 * What's happening above is really: 0xe0 & 0xff = 0xe0. However, the results of
 * this aren't treated as a signed number. Ultimately a bad thing.
 *
 * What we're going to want to do is basically create the unsigned equivalent of
 * our representation and pass that off to the wuint* functions. To do that
 * we're going to do the following:
 *
 *  - if the value is positive
 *      we can pass it directly off to the equivalent wuint
 *  - if the value is negative
 *      we do the following computation:
 *         mb + val + 1, where
 *         mb   is the maximum unsigned value in that byte size
 *         val  is the Javascript negative integer
 *
 *
 * As a concrete value, take -128. In signed 16 bits this would be 0xff80. If
 * you do out the computations:
 *
 * 0xffff - 128 + 1
 * 0xffff - 127
 * 0xff80
 *
 * You can then encode this value as the signed version. This is really rather
 * hacky, but it should work and get the job done which is our goal here.
 */

/*
 * A series of checks to make sure we actually have a signed 32-bit number
 */
function verifsint(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

function verifIEEE754(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');
}

Buffer.prototype.writeInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7f, -0x80);
  }

  if (value >= 0) {
    buffer.writeUInt8(value, offset, noAssert);
  } else {
    buffer.writeUInt8(0xff + value + 1, offset, noAssert);
  }
};

function writeInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fff, -0x8000);
  }

  if (value >= 0) {
    writeUInt16(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt16(buffer, 0xffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt16LE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt16BE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, true, noAssert);
};

function writeInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fffffff, -0x80000000);
  }

  if (value >= 0) {
    writeUInt32(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt32(buffer, 0xffffffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt32LE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt32BE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, true, noAssert);
};

function writeFloat(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.writeFloatLE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, false, noAssert);
};

Buffer.prototype.writeFloatBE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, true, noAssert);
};

function writeDouble(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 7 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.writeDoubleLE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, false, noAssert);
};

Buffer.prototype.writeDoubleBE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, true, noAssert);
};

},{"./buffer_ieee754":7,"assert":2,"base64-js":9}],9:[function(require,module,exports){
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
		placeHolders = b64.indexOf('=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (lookup.indexOf(b64[i]) << 18) | (lookup.indexOf(b64[i + 1]) << 12) | (lookup.indexOf(b64[i + 2]) << 6) | lookup.indexOf(b64[i + 3]);
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (lookup.indexOf(b64[i]) << 2) | (lookup.indexOf(b64[i + 1]) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (lookup.indexOf(b64[i]) << 10) | (lookup.indexOf(b64[i + 1]) << 4) | (lookup.indexOf(b64[i + 2]) >> 2);
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
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
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
				output += lookup[temp >> 2];
				output += lookup[(temp << 4) & 0x3F];
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup[temp >> 10];
				output += lookup[(temp >> 4) & 0x3F];
				output += lookup[(temp << 2) & 0x3F];
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

},{}],10:[function(require,module,exports){
require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
exports.readIEEE754 = function(buffer, offset, isBE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isBE ? 0 : (nBytes - 1),
      d = isBE ? 1 : -1,
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

exports.writeIEEE754 = function(buffer, value, offset, isBE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isBE ? (nBytes - 1) : 0,
      d = isBE ? -1 : 1,
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

},{}],"q9TxCC":[function(require,module,exports){
var assert;
exports.Buffer = Buffer;
exports.SlowBuffer = Buffer;
Buffer.poolSize = 8192;
exports.INSPECT_MAX_BYTES = 50;

function stringtrim(str) {
  if (str.trim) return str.trim();
  return str.replace(/^\s+|\s+$/g, '');
}

function Buffer(subject, encoding, offset) {
  if(!assert) assert= require('assert');
  if (!(this instanceof Buffer)) {
    return new Buffer(subject, encoding, offset);
  }
  this.parent = this;
  this.offset = 0;

  // Work-around: node's base64 implementation
  // allows for non-padded strings while base64-js
  // does not..
  if (encoding == "base64" && typeof subject == "string") {
    subject = stringtrim(subject);
    while (subject.length % 4 != 0) {
      subject = subject + "="; 
    }
  }

  var type;

  // Are we slicing?
  if (typeof offset === 'number') {
    this.length = coerce(encoding);
    // slicing works, with limitations (no parent tracking/update)
    // check https://github.com/toots/buffer-browserify/issues/19
    for (var i = 0; i < this.length; i++) {
        this[i] = subject.get(i+offset);
    }
  } else {
    // Find the length
    switch (type = typeof subject) {
      case 'number':
        this.length = coerce(subject);
        break;

      case 'string':
        this.length = Buffer.byteLength(subject, encoding);
        break;

      case 'object': // Assume object is an array
        this.length = coerce(subject.length);
        break;

      default:
        throw new Error('First argument needs to be a number, ' +
                        'array or string.');
    }

    // Treat array-ish objects as a byte array.
    if (isArrayIsh(subject)) {
      for (var i = 0; i < this.length; i++) {
        if (subject instanceof Buffer) {
          this[i] = subject.readUInt8(i);
        }
        else {
          this[i] = subject[i];
        }
      }
    } else if (type == 'string') {
      // We are a string
      this.length = this.write(subject, 0, encoding);
    } else if (type === 'number') {
      for (var i = 0; i < this.length; i++) {
        this[i] = 0;
      }
    }
  }
}

Buffer.prototype.get = function get(i) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this[i];
};

Buffer.prototype.set = function set(i, v) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this[i] = v;
};

Buffer.byteLength = function (str, encoding) {
  switch (encoding || "utf8") {
    case 'hex':
      return str.length / 2;

    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(str).length;

    case 'ascii':
    case 'binary':
      return str.length;

    case 'base64':
      return base64ToBytes(str).length;

    default:
      throw new Error('Unknown encoding');
  }
};

Buffer.prototype.utf8Write = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten =  blitBuffer(utf8ToBytes(string), this, offset, length);
};

Buffer.prototype.asciiWrite = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten =  blitBuffer(asciiToBytes(string), this, offset, length);
};

Buffer.prototype.binaryWrite = Buffer.prototype.asciiWrite;

Buffer.prototype.base64Write = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten = blitBuffer(base64ToBytes(string), this, offset, length);
};

Buffer.prototype.base64Slice = function (start, end) {
  var bytes = Array.prototype.slice.apply(this, arguments)
  return require("base64-js").fromByteArray(bytes);
};

Buffer.prototype.utf8Slice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var res = "";
  var tmp = "";
  var i = 0;
  while (i < bytes.length) {
    if (bytes[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(bytes[i]);
      tmp = "";
    } else
      tmp += "%" + bytes[i].toString(16);

    i++;
  }

  return res + decodeUtf8Char(tmp);
}

Buffer.prototype.asciiSlice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var ret = "";
  for (var i = 0; i < bytes.length; i++)
    ret += String.fromCharCode(bytes[i]);
  return ret;
}

Buffer.prototype.binarySlice = Buffer.prototype.asciiSlice;

Buffer.prototype.inspect = function() {
  var out = [],
      len = this.length;
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }
  return '<Buffer ' + out.join(' ') + '>';
};


Buffer.prototype.hexSlice = function(start, end) {
  var len = this.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; i++) {
    out += toHex(this[i]);
  }
  return out;
};


Buffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();
  start = +start || 0;
  if (typeof end == 'undefined') end = this.length;

  // Fastpath empty strings
  if (+end == start) {
    return '';
  }

  switch (encoding) {
    case 'hex':
      return this.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.utf8Slice(start, end);

    case 'ascii':
      return this.asciiSlice(start, end);

    case 'binary':
      return this.binarySlice(start, end);

    case 'base64':
      return this.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


Buffer.prototype.hexWrite = function(string, offset, length) {
  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2) {
    throw new Error('Invalid hex string');
  }
  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(byte)) throw new Error('Invalid hex string');
    this[offset + i] = byte;
  }
  Buffer._charsWritten = i * 2;
  return i;
};


Buffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  switch (encoding) {
    case 'hex':
      return this.hexWrite(string, offset, length);

    case 'utf8':
    case 'utf-8':
      return this.utf8Write(string, offset, length);

    case 'ascii':
      return this.asciiWrite(string, offset, length);

    case 'binary':
      return this.binaryWrite(string, offset, length);

    case 'base64':
      return this.base64Write(string, offset, length);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Write(string, offset, length);

    default:
      throw new Error('Unknown encoding');
  }
};

// slice(start, end)
function clamp(index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue;
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len;
  if (index >= 0) return index;
  index += len;
  if (index >= 0) return index;
  return 0;
}

Buffer.prototype.slice = function(start, end) {
  var len = this.length;
  start = clamp(start, len, 0);
  end = clamp(end, len, len);
  return new Buffer(this, end - start, +start);
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function(target, target_start, start, end) {
  var source = this;
  start || (start = 0);
  if (end === undefined || isNaN(end)) {
    end = this.length;
  }
  target_start || (target_start = 0);

  if (end < start) throw new Error('sourceEnd < sourceStart');

  // Copy 0 bytes; we're done
  if (end === start) return 0;
  if (target.length == 0 || source.length == 0) return 0;

  if (target_start < 0 || target_start >= target.length) {
    throw new Error('targetStart out of bounds');
  }

  if (start < 0 || start >= source.length) {
    throw new Error('sourceStart out of bounds');
  }

  if (end < 0 || end > source.length) {
    throw new Error('sourceEnd out of bounds');
  }

  // Are we oob?
  if (end > this.length) {
    end = this.length;
  }

  if (target.length - target_start < end - start) {
    end = target.length - target_start + start;
  }

  var temp = [];
  for (var i=start; i<end; i++) {
    assert.ok(typeof this[i] !== 'undefined', "copying undefined buffer bytes!");
    temp.push(this[i]);
  }

  for (var i=target_start; i<target_start+temp.length; i++) {
    target[i] = temp[i-target_start];
  }
};

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill(value, start, end) {
  value || (value = 0);
  start || (start = 0);
  end || (end = this.length);

  if (typeof value === 'string') {
    value = value.charCodeAt(0);
  }
  if (!(typeof value === 'number') || isNaN(value)) {
    throw new Error('value is not a number');
  }

  if (end < start) throw new Error('end < start');

  // Fill 0 bytes; we're done
  if (end === start) return 0;
  if (this.length == 0) return 0;

  if (start < 0 || start >= this.length) {
    throw new Error('start out of bounds');
  }

  if (end < 0 || end > this.length) {
    throw new Error('end out of bounds');
  }

  for (var i = start; i < end; i++) {
    this[i] = value;
  }
}

// Static methods
Buffer.isBuffer = function isBuffer(b) {
  return b instanceof Buffer || b instanceof Buffer;
};

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) {
    throw new Error("Usage: Buffer.concat(list, [totalLength])\n \
      list should be an Array.");
  }

  if (list.length === 0) {
    return new Buffer(0);
  } else if (list.length === 1) {
    return list[0];
  }

  if (typeof totalLength !== 'number') {
    totalLength = 0;
    for (var i = 0; i < list.length; i++) {
      var buf = list[i];
      totalLength += buf.length;
    }
  }

  var buffer = new Buffer(totalLength);
  var pos = 0;
  for (var i = 0; i < list.length; i++) {
    var buf = list[i];
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer;
};

Buffer.isEncoding = function(encoding) {
  switch ((encoding + '').toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
    case 'raw':
      return true;

    default:
      return false;
  }
};

// helpers

function coerce(length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length);
  return length < 0 ? 0 : length;
}

function isArray(subject) {
  return (Array.isArray ||
    function(subject){
      return {}.toString.apply(subject) == '[object Array]'
    })
    (subject)
}

function isArrayIsh(subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
         subject && typeof subject === 'object' &&
         typeof subject.length === 'number';
}

function toHex(n) {
  if (n < 16) return '0' + n.toString(16);
  return n.toString(16);
}

function utf8ToBytes(str) {
  var byteArray = [];
  for (var i = 0; i < str.length; i++)
    if (str.charCodeAt(i) <= 0x7F)
      byteArray.push(str.charCodeAt(i));
    else {
      var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16));
    }

  return byteArray;
}

function asciiToBytes(str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++ )
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push( str.charCodeAt(i) & 0xFF );

  return byteArray;
}

function base64ToBytes(str) {
  return require("base64-js").toByteArray(str);
}

function blitBuffer(src, dst, offset, length) {
  var pos, i = 0;
  while (i < length) {
    if ((i+offset >= dst.length) || (i >= src.length))
      break;

    dst[i + offset] = src[i];
    i++;
  }
  return i;
}

function decodeUtf8Char(str) {
  try {
    return decodeURIComponent(str);
  } catch (err) {
    return String.fromCharCode(0xFFFD); // UTF 8 invalid char
  }
}

// read/write bit-twiddling

Buffer.prototype.readUInt8 = function(offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  return buffer[offset];
};

function readUInt16(buffer, offset, isBigEndian, noAssert) {
  var val = 0;


  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    val = buffer[offset] << 8;
    if (offset + 1 < buffer.length) {
      val |= buffer[offset + 1];
    }
  } else {
    val = buffer[offset];
    if (offset + 1 < buffer.length) {
      val |= buffer[offset + 1] << 8;
    }
  }

  return val;
}

Buffer.prototype.readUInt16LE = function(offset, noAssert) {
  return readUInt16(this, offset, false, noAssert);
};

Buffer.prototype.readUInt16BE = function(offset, noAssert) {
  return readUInt16(this, offset, true, noAssert);
};

function readUInt32(buffer, offset, isBigEndian, noAssert) {
  var val = 0;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    if (offset + 1 < buffer.length)
      val = buffer[offset + 1] << 16;
    if (offset + 2 < buffer.length)
      val |= buffer[offset + 2] << 8;
    if (offset + 3 < buffer.length)
      val |= buffer[offset + 3];
    val = val + (buffer[offset] << 24 >>> 0);
  } else {
    if (offset + 2 < buffer.length)
      val = buffer[offset + 2] << 16;
    if (offset + 1 < buffer.length)
      val |= buffer[offset + 1] << 8;
    val |= buffer[offset];
    if (offset + 3 < buffer.length)
      val = val + (buffer[offset + 3] << 24 >>> 0);
  }

  return val;
}

Buffer.prototype.readUInt32LE = function(offset, noAssert) {
  return readUInt32(this, offset, false, noAssert);
};

Buffer.prototype.readUInt32BE = function(offset, noAssert) {
  return readUInt32(this, offset, true, noAssert);
};


/*
 * Signed integer types, yay team! A reminder on how two's complement actually
 * works. The first bit is the signed bit, i.e. tells us whether or not the
 * number should be positive or negative. If the two's complement value is
 * positive, then we're done, as it's equivalent to the unsigned representation.
 *
 * Now if the number is positive, you're pretty much done, you can just leverage
 * the unsigned translations and return those. Unfortunately, negative numbers
 * aren't quite that straightforward.
 *
 * At first glance, one might be inclined to use the traditional formula to
 * translate binary numbers between the positive and negative values in two's
 * complement. (Though it doesn't quite work for the most negative value)
 * Mainly:
 *  - invert all the bits
 *  - add one to the result
 *
 * Of course, this doesn't quite work in Javascript. Take for example the value
 * of -128. This could be represented in 16 bits (big-endian) as 0xff80. But of
 * course, Javascript will do the following:
 *
 * > ~0xff80
 * -65409
 *
 * Whoh there, Javascript, that's not quite right. But wait, according to
 * Javascript that's perfectly correct. When Javascript ends up seeing the
 * constant 0xff80, it has no notion that it is actually a signed number. It
 * assumes that we've input the unsigned value 0xff80. Thus, when it does the
 * binary negation, it casts it into a signed value, (positive 0xff80). Then
 * when you perform binary negation on that, it turns it into a negative number.
 *
 * Instead, we're going to have to use the following general formula, that works
 * in a rather Javascript friendly way. I'm glad we don't support this kind of
 * weird numbering scheme in the kernel.
 *
 * (BIT-MAX - (unsigned)val + 1) * -1
 *
 * The astute observer, may think that this doesn't make sense for 8-bit numbers
 * (really it isn't necessary for them). However, when you get 16-bit numbers,
 * you do. Let's go back to our prior example and see how this will look:
 *
 * (0xffff - 0xff80 + 1) * -1
 * (0x007f + 1) * -1
 * (0x0080) * -1
 */
Buffer.prototype.readInt8 = function(offset, noAssert) {
  var buffer = this;
  var neg;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  neg = buffer[offset] & 0x80;
  if (!neg) {
    return (buffer[offset]);
  }

  return ((0xff - buffer[offset] + 1) * -1);
};

function readInt16(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt16(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x8000;
  if (!neg) {
    return val;
  }

  return (0xffff - val + 1) * -1;
}

Buffer.prototype.readInt16LE = function(offset, noAssert) {
  return readInt16(this, offset, false, noAssert);
};

Buffer.prototype.readInt16BE = function(offset, noAssert) {
  return readInt16(this, offset, true, noAssert);
};

function readInt32(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt32(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x80000000;
  if (!neg) {
    return (val);
  }

  return (0xffffffff - val + 1) * -1;
}

Buffer.prototype.readInt32LE = function(offset, noAssert) {
  return readInt32(this, offset, false, noAssert);
};

Buffer.prototype.readInt32BE = function(offset, noAssert) {
  return readInt32(this, offset, true, noAssert);
};

function readFloat(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.readFloatLE = function(offset, noAssert) {
  return readFloat(this, offset, false, noAssert);
};

Buffer.prototype.readFloatBE = function(offset, noAssert) {
  return readFloat(this, offset, true, noAssert);
};

function readDouble(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 7 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.readDoubleLE = function(offset, noAssert) {
  return readDouble(this, offset, false, noAssert);
};

Buffer.prototype.readDoubleBE = function(offset, noAssert) {
  return readDouble(this, offset, true, noAssert);
};


/*
 * We have to make sure that the value is a valid integer. This means that it is
 * non-negative. It has no fractional component and that it does not exceed the
 * maximum allowed value.
 *
 *      value           The number to check for validity
 *
 *      max             The maximum value
 */
function verifuint(value, max) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value >= 0,
      'specified a negative value for writing an unsigned value');

  assert.ok(value <= max, 'value is larger than maximum value for type');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

Buffer.prototype.writeUInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xff);
  }

  if (offset < buffer.length) {
    buffer[offset] = value;
  }
};

function writeUInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 2); i++) {
    buffer[offset + i] =
        (value & (0xff << (8 * (isBigEndian ? 1 - i : i)))) >>>
            (isBigEndian ? 1 - i : i) * 8;
  }

}

Buffer.prototype.writeUInt16LE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt16BE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, true, noAssert);
};

function writeUInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffffffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 4); i++) {
    buffer[offset + i] =
        (value >>> (isBigEndian ? 3 - i : i) * 8) & 0xff;
  }
}

Buffer.prototype.writeUInt32LE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt32BE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, true, noAssert);
};


/*
 * We now move onto our friends in the signed number category. Unlike unsigned
 * numbers, we're going to have to worry a bit more about how we put values into
 * arrays. Since we are only worrying about signed 32-bit values, we're in
 * slightly better shape. Unfortunately, we really can't do our favorite binary
 * & in this system. It really seems to do the wrong thing. For example:
 *
 * > -32 & 0xff
 * 224
 *
 * What's happening above is really: 0xe0 & 0xff = 0xe0. However, the results of
 * this aren't treated as a signed number. Ultimately a bad thing.
 *
 * What we're going to want to do is basically create the unsigned equivalent of
 * our representation and pass that off to the wuint* functions. To do that
 * we're going to do the following:
 *
 *  - if the value is positive
 *      we can pass it directly off to the equivalent wuint
 *  - if the value is negative
 *      we do the following computation:
 *         mb + val + 1, where
 *         mb   is the maximum unsigned value in that byte size
 *         val  is the Javascript negative integer
 *
 *
 * As a concrete value, take -128. In signed 16 bits this would be 0xff80. If
 * you do out the computations:
 *
 * 0xffff - 128 + 1
 * 0xffff - 127
 * 0xff80
 *
 * You can then encode this value as the signed version. This is really rather
 * hacky, but it should work and get the job done which is our goal here.
 */

/*
 * A series of checks to make sure we actually have a signed 32-bit number
 */
function verifsint(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

function verifIEEE754(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');
}

Buffer.prototype.writeInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7f, -0x80);
  }

  if (value >= 0) {
    buffer.writeUInt8(value, offset, noAssert);
  } else {
    buffer.writeUInt8(0xff + value + 1, offset, noAssert);
  }
};

function writeInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fff, -0x8000);
  }

  if (value >= 0) {
    writeUInt16(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt16(buffer, 0xffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt16LE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt16BE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, true, noAssert);
};

function writeInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fffffff, -0x80000000);
  }

  if (value >= 0) {
    writeUInt32(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt32(buffer, 0xffffffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt32LE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt32BE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, true, noAssert);
};

function writeFloat(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.writeFloatLE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, false, noAssert);
};

Buffer.prototype.writeFloatBE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, true, noAssert);
};

function writeDouble(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 7 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.writeDoubleLE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, false, noAssert);
};

Buffer.prototype.writeDoubleBE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, true, noAssert);
};

},{"./buffer_ieee754":1,"assert":6,"base64-js":4}],"buffer-browserify":[function(require,module,exports){
module.exports=require('q9TxCC');
},{}],4:[function(require,module,exports){
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
		placeHolders = b64.indexOf('=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (lookup.indexOf(b64[i]) << 18) | (lookup.indexOf(b64[i + 1]) << 12) | (lookup.indexOf(b64[i + 2]) << 6) | lookup.indexOf(b64[i + 3]);
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (lookup.indexOf(b64[i]) << 2) | (lookup.indexOf(b64[i + 1]) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (lookup.indexOf(b64[i]) << 10) | (lookup.indexOf(b64[i + 1]) << 4) | (lookup.indexOf(b64[i + 2]) >> 2);
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
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
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
				output += lookup[temp >> 2];
				output += lookup[(temp << 4) & 0x3F];
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup[temp >> 10];
				output += lookup[(temp >> 4) & 0x3F];
				output += lookup[(temp << 2) & 0x3F];
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

},{}],5:[function(require,module,exports){


//
// The shims in this file are not fully implemented shims for the ES5
// features, but do work for the particular usecases there is in
// the other modules.
//

var toString = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

// Array.isArray is supported in IE9
function isArray(xs) {
  return toString.call(xs) === '[object Array]';
}
exports.isArray = typeof Array.isArray === 'function' ? Array.isArray : isArray;

// Array.prototype.indexOf is supported in IE9
exports.indexOf = function indexOf(xs, x) {
  if (xs.indexOf) return xs.indexOf(x);
  for (var i = 0; i < xs.length; i++) {
    if (x === xs[i]) return i;
  }
  return -1;
};

// Array.prototype.filter is supported in IE9
exports.filter = function filter(xs, fn) {
  if (xs.filter) return xs.filter(fn);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    if (fn(xs[i], i, xs)) res.push(xs[i]);
  }
  return res;
};

// Array.prototype.forEach is supported in IE9
exports.forEach = function forEach(xs, fn, self) {
  if (xs.forEach) return xs.forEach(fn, self);
  for (var i = 0; i < xs.length; i++) {
    fn.call(self, xs[i], i, xs);
  }
};

// Array.prototype.map is supported in IE9
exports.map = function map(xs, fn) {
  if (xs.map) return xs.map(fn);
  var out = new Array(xs.length);
  for (var i = 0; i < xs.length; i++) {
    out[i] = fn(xs[i], i, xs);
  }
  return out;
};

// Array.prototype.reduce is supported in IE9
exports.reduce = function reduce(array, callback, opt_initialValue) {
  if (array.reduce) return array.reduce(callback, opt_initialValue);
  var value, isValueSet = false;

  if (2 < arguments.length) {
    value = opt_initialValue;
    isValueSet = true;
  }
  for (var i = 0, l = array.length; l > i; ++i) {
    if (array.hasOwnProperty(i)) {
      if (isValueSet) {
        value = callback(value, array[i], i, array);
      }
      else {
        value = array[i];
        isValueSet = true;
      }
    }
  }

  return value;
};

// String.prototype.substr - negative index don't work in IE8
if ('ab'.substr(-1) !== 'b') {
  exports.substr = function (str, start, length) {
    // did we get a negative start, calculate how much it is from the beginning of the string
    if (start < 0) start = str.length + start;

    // call the original function
    return str.substr(start, length);
  };
} else {
  exports.substr = function (str, start, length) {
    return str.substr(start, length);
  };
}

// String.prototype.trim is supported in IE9
exports.trim = function (str) {
  if (str.trim) return str.trim();
  return str.replace(/^\s+|\s+$/g, '');
};

// Function.prototype.bind is supported in IE9
exports.bind = function () {
  var args = Array.prototype.slice.call(arguments);
  var fn = args.shift();
  if (fn.bind) return fn.bind.apply(fn, args);
  var self = args.shift();
  return function () {
    fn.apply(self, args.concat([Array.prototype.slice.call(arguments)]));
  };
};

// Object.create is supported in IE9
function create(prototype, properties) {
  var object;
  if (prototype === null) {
    object = { '__proto__' : null };
  }
  else {
    if (typeof prototype !== 'object') {
      throw new TypeError(
        'typeof prototype[' + (typeof prototype) + '] != \'object\''
      );
    }
    var Type = function () {};
    Type.prototype = prototype;
    object = new Type();
    object.__proto__ = prototype;
  }
  if (typeof properties !== 'undefined' && Object.defineProperties) {
    Object.defineProperties(object, properties);
  }
  return object;
}
exports.create = typeof Object.create === 'function' ? Object.create : create;

// Object.keys and Object.getOwnPropertyNames is supported in IE9 however
// they do show a description and number property on Error objects
function notObject(object) {
  return ((typeof object != "object" && typeof object != "function") || object === null);
}

function keysShim(object) {
  if (notObject(object)) {
    throw new TypeError("Object.keys called on a non-object");
  }

  var result = [];
  for (var name in object) {
    if (hasOwnProperty.call(object, name)) {
      result.push(name);
    }
  }
  return result;
}

// getOwnPropertyNames is almost the same as Object.keys one key feature
//  is that it returns hidden properties, since that can't be implemented,
//  this feature gets reduced so it just shows the length property on arrays
function propertyShim(object) {
  if (notObject(object)) {
    throw new TypeError("Object.getOwnPropertyNames called on a non-object");
  }

  var result = keysShim(object);
  if (exports.isArray(object) && exports.indexOf(object, 'length') === -1) {
    result.push('length');
  }
  return result;
}

var keys = typeof Object.keys === 'function' ? Object.keys : keysShim;
var getOwnPropertyNames = typeof Object.getOwnPropertyNames === 'function' ?
  Object.getOwnPropertyNames : propertyShim;

if (new Error().hasOwnProperty('description')) {
  var ERROR_PROPERTY_FILTER = function (obj, array) {
    if (toString.call(obj) === '[object Error]') {
      array = exports.filter(array, function (name) {
        return name !== 'description' && name !== 'number' && name !== 'message';
      });
    }
    return array;
  };

  exports.keys = function (object) {
    return ERROR_PROPERTY_FILTER(object, keys(object));
  };
  exports.getOwnPropertyNames = function (object) {
    return ERROR_PROPERTY_FILTER(object, getOwnPropertyNames(object));
  };
} else {
  exports.keys = keys;
  exports.getOwnPropertyNames = getOwnPropertyNames;
}

// Object.getOwnPropertyDescriptor - supported in IE8 but only on dom elements
function valueObject(value, key) {
  return { value: value[key] };
}

if (typeof Object.getOwnPropertyDescriptor === 'function') {
  try {
    Object.getOwnPropertyDescriptor({'a': 1}, 'a');
    exports.getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  } catch (e) {
    // IE8 dom element issue - use a try catch and default to valueObject
    exports.getOwnPropertyDescriptor = function (value, key) {
      try {
        return Object.getOwnPropertyDescriptor(value, key);
      } catch (e) {
        return valueObject(value, key);
      }
    };
  }
} else {
  exports.getOwnPropertyDescriptor = valueObject;
}

},{}],6:[function(require,module,exports){
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

// UTILITY
var util = require('util');
var shims = require('_shims');
var pSlice = Array.prototype.slice;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  this.message = options.message || getMessage(this);
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = shims.keys(a),
        kb = shims.keys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};
},{"_shims":5,"util":7}],7:[function(require,module,exports){
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

var shims = require('_shims');

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

  shims.forEach(array, function(val, idx) {
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
    var ret = value.inspect(recurseTimes);
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
  var keys = shims.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = shims.getOwnPropertyNames(value);
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

  shims.forEach(keys, function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = shims.getOwnPropertyDescriptor(value, key) || { value: value[key] };
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
    if (shims.indexOf(ctx.seen, desc.value) < 0) {
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
  var length = shims.reduce(output, function(prev, cur) {
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
  return shims.isArray(ar);
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
  return typeof arg === 'object' && arg;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) && objectToString(e) === '[object Error]';
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

function isBuffer(arg) {
  return arg instanceof Buffer;
}
exports.isBuffer = isBuffer;

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
exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = shims.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = shims.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

},{"_shims":5}]},{},[])
;;module.exports=require("buffer-browserify")

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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
},{"eve":18}],13:[function(require,module,exports){
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
var logger = require('cog/logger')('glue');
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
  signalhost: location.origin || 'http://rtcjs.io:50000'
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

  // initialise the remote elements
  var peers = qsa('*[rtc-peer]', scope).map(initPeer);

  // if we have peers, then we are going to need primus
  if (peers.length > 0) {
    startupOps.push(loadPrimus);
  }

  // apply any external opts to the configuration
  extend(config, opts);

  // run the startup operations
  async.parallel(startupOps, function(err) {
    // TODO: check errors
    logger('startup ops completed, starting glue', config);
    eve('glue.ready');

    // if we don't have a room name, generate a room name
    if (! config.room) {
      config.room = generateRoomName();
    }

    // create the session manager
    sessionMgr = typeof Primus != 'undefined' && new SessionManager(config);

    // initialise the capture elements
    qsa('*[rtc-capture]', scope).forEach(initCapture);

    // if we have any peers, then announce ourselves via the session manager
    if (peers.length > 0) {
      sessionMgr.announce();
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

require('cog/logger').enable('*');

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
    logger('attaching stream');
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
      logger('requesting stream data');
      sessionMgr.getStreamData(stream, function(data) {
        logger('got stream data', data);

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

      logger('peer active', peer.getRemoteStreams());

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
},{"./events":12,"./sessionmanager":48,"async":14,"cog/defaults":15,"cog/extend":16,"cog/logger":17,"eve":18,"fdom/meta":19,"fdom/on":20,"fdom/qsa":21,"rtc-captureconfig":22,"rtc-core/reset":24,"rtc-media":25,"rtc-signaller":29,"sdp-transform":44,"url":5}],14:[function(require,module,exports){
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

},{"__browserify_process":11}],15:[function(require,module,exports){
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
},{}],16:[function(require,module,exports){
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
},{}],17:[function(require,module,exports){
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
},{}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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
},{"./qsa":21}],20:[function(require,module,exports){
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
},{}],21:[function(require,module,exports){
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
},{}],22:[function(require,module,exports){
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
},{}],23:[function(require,module,exports){
/* jshint node: true */
/* global window: false */
/* global navigator: false */

'use strict';

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
  var hostObject = this || window;

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

// initialise the prefix as unknown
detect.browser = undefined;
},{}],24:[function(require,module,exports){
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
},{}],25:[function(require,module,exports){
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

  <<<js gist://6085450

  [run on requirebin](http://requirebin.com/?gist=6085450)

  In the code above, we are creating a new instance of our userMedia wrapper
  using the `media()` call and then telling it to render to the
  `document.body` once video starts streaming.  We can further expand the
  code out to the following to aid our understanding of what is going on:

  ```js
  var Media = require('rtc-media');
  var userMedia = new Media({ start: true });

  userMedia.render(document.body);
  ```

  The code above is written in a more traditional JS style, but feel free
  to use the first style as it's quite safe (thanks to some checks in the
  code).

  ### Events

  Once a media object has been created, it will provide a number of events
  through the standard node EventEmitter API.

  #### `capture`

  The `capture` event is triggered once the requested media stream has
  been captured by the browser.

  ```js
  media().once('capture', function(stream) {
    // stream references underlying media stream that was captured
  });
  ```

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
navigator.getUserMedia = detect.call(navigator, 'getUserMedia');

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

  ```js
  var media = require('rtc-media'); // or require('rtc/media')

  // start the stream and render to the document body once active
  media().render(document.body);
  ```

  You may optionally provide a callback to this function, which is
  will be triggered once each of the media elements has started playing
  the stream:

  ```js
  media().render(document.body, function(elements) {
    console.log('captured and playing');
  });
  ```

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
      media.emit('render', elements);

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
Media.prototype._handleFail = function() {
  // TODO: make this more friendly
  this.emit('error', new Error('Unable to capture requested media'));
};
},{"cog/extend":16,"cog/logger":17,"events":3,"rtc-core/detect":23,"util":6}],26:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ### announce

  ```
  /announce|{}
  ```

  When an announce message is received by the socket scope, the attached
  object data is decoded and the scope emits an `announce` message.

**/
module.exports = function(scope) {
  return function(args) {
    var payload;

    try {
      payload = JSON.parse(args[0]);
    }
    catch (e) {
    }

    if (! payload) {
      return scope.emit('error', 'Unable to announce, invalid JSON: ' + args[0]);
    }

    return scope.emit('announce', payload);
  };
};
},{}],27:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ## signaller message handlers

**/

module.exports = function(scope) {
  return {
    announce: require('./announce')(scope),
    request: require('./request')(scope)
  };
};
},{"./announce":26,"./request":28}],28:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ### request

  ```
  /request|{"key":"value","__srcid": "", "__reqid": ""}
  ```

  A request is basically a "search for a friend" message.  This is where one
  peer in the mesh is searching for another peer based on particular criteria.
  In general, a request message is delivered to all peers within the mesh
  and then those peers that are not in a blocked state will respond.

**/
module.exports = function(scope) {
  var attributes = scope.attributes;

  function ackRequest(data) {
    // look for request listeners
    var listeners = scope.listeners('request');

    // TODO: trigger listeners, wait for completion
    if (listeners && listeners.length > 0) {
    }

    // send the ack request
    scope.send(
      '/to', data.__srcid,
      '/ackreq', data.__reqid, scope.id
    );
  }

  return function(data) {
    var match = true;
    var testKeys;

    try {
      // convert to JSON
      data = JSON.parse(data);
    }
    catch (e) {
      return false;
    }

    // get the testkeys
    testKeys = Object.keys(data).filter(function(key) {
      return key.charAt(0) !== '_';
    });

    // iterate through the test keys and look for a match
    match = testKeys.reduce(function(memo, key) {
      // check for a match
      return memo && attributes[key] === data[key];
    }, match);

    // if we have a match, then acknowledge the request
    if (match) {
      // if there are active blocks, return
      if (scope.blocks.length) {
        return scope.on('unblock', function() {
          ackRequest(data);
        });
      }

      return ackRequest(data);
    }

    return false;
  };
};
},{}],29:[function(require,module,exports){
/* jshint node: true */
'use strict';

var EventEmitter = require('events').EventEmitter;
var uuid = require('uuid');
var extend = require('cog/extend');

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

  // create the signaller
  var signaller = new EventEmitter();

  // initialise the id
  var id = signaller.id = uuid.v4();

  // initialise the attributes
  var attributes = signaller.attributes = {
    id: id
  };

  // initialise the data event name
  var dataEvent = (opts || {}).dataEvent || 'data';
  var openEvent = (opts || {}).openEvent || 'open';

  // determine whether we should use a write or send function
  var write = typeof messenger.write == 'function' ?
                messenger.write :
                messenger.send;

  // determine a close handler
  var close = typeof messenger.close == 'function' ?
                messenger.close :
                messenger.end;

  // initialise blocks and matchers
  signaller.blocks = [];
  signaller.matchers = [];

  function createChannel(targetId) {
    return {
      send: function() {
        send.apply(null, ['/to', targetId].concat([].slice.call(arguments)));
      }
    };
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

  function once(prefix, handler) {
    signaller.matchers.push({
      prefix: prefix,
      handler: handler
    });
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
    extend(attributes, data, { id: id });

    // send the attributes over the network
    return (sender || send)('/announce', attributes);
  };

  /**
    ### signaller#block()

    Prevent the signaller from responding to requests until the block
    is cleared with a clearBlock call.
  **/
  signaller.block = function() {
    // create a block id
    var id = uuid.v4();

    // add the active block
    signaller.blocks.push(id);

    // return the id
    return id;
  };

  /**
    ### signaller#clearBlock(id)

    Clear the specified block id.  Think `clearTimeout` but for signalling
    blocks
  **/
  signaller.clearBlock = function(id) {
    var wasBlocked = signaller.blocks.length > 0;

    // remove blocks matching the id
    signaller.blocks = signaller.blocks.filter(function(blockId) {
      return blockId !== id;
    });

    // if unblocked, trigger the unblock event
    if (wasBlocked && signaller.blocks.length === 0) {
      signaller.emit('unblock');
    }
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
    ### signaller#request(data)

    The `signaller.request` call is where one peer goes looking for a target
    peer that satisfies specific search parameters.  This may be a search
    for a peer with a particular id, or something more general such as
    a request for a peer with a particular name or role.

    Once a suitable match has been found from within the messenging network
    the callback will fire and provide a discrete messaging channel to that
    particular peer.

    __NOTE:__ The discreteness of the message needs to be programmed at the
    mesh level if required. Signallers will not attempt to parse a message
    destined for another signaller, but they are visible by default.  This
    can easily be handled however, by filtering `/to` messages.
  **/
  signaller.request = function(data, opts, callback) {
    // initialise a request id
    var reqid = uuid.v4();

    // handle 2 arg form
    if (typeof opts == 'function') {
      callback = opts;
      opts = {};
    }

    // TODO: inspect known peers for a match

    // handle request acknowledge
    once('/ackreq|' + reqid, function(data) {
      var targetId = data.split('|')[2];

      // trigger the callback with the send function wired
      callback(null, createChannel(targetId));
    });

    // send out a request across the network
    send('/request', extend({}, data, {
      __srcid: id,
      __reqid: reqid
    }));
  };

  /**
    ### signaller#to(targetId)

    The to method returns an encapsulated

  **/
  signaller.to = function(targetId) {
    // create a sender that will prepend messages with /to|targetId|
    var sender = function() {
      var args = ['/to', targetId].concat([].slice.call(arguments));
      return write.call(messenger, args.map(prepareArg).filter(Boolean).join('|'));
    };

    return {
      announce: function(data) {
        return signaller.announce(data, sender);
      },

      send: sender,
    }
  };

  // handle message data events
  messenger.on(dataEvent, require('./processor')(signaller));

  // handle open / connect events
  messenger.on(openEvent, function() {
    signaller.emit('open');
  });

  return signaller;
};

sig.loadPrimus = require('./primus-loader');
},{"./primus-loader":33,"./processor":34,"cog/extend":30,"events":3,"uuid":32}],30:[function(require,module,exports){
module.exports=require(16)
},{}],31:[function(require,module,exports){
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


},{}],32:[function(require,module,exports){
var Buffer=require("__browserify_Buffer").Buffer;//     uuid.js
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

},{"./rng":31,"__browserify_Buffer":10}],33:[function(require,module,exports){
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
},{"url":5}],34:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ## signaller process handling

  When a signaller's underling messenger emits a `data` event this is
  delegated to a simple message parser, which applies the following simple
  logic:

  - Is the message a `/to` message. If so, see if the message is for this
    signaller scope (checking the target id - 2nd arg).  If so pass the
    remainder of the message onto the standard processing chain.  If not,
    discard the message.

  - Is the message a command message (prefixed with a forward slash). If so,
    look for an appropriate message handler and pass the message payload on
    to it.

  - Finally, does the message match any patterns that we are listening for?
    If so, then pass the entire message contents onto the registered handler.
**/
module.exports = function(scope) {
  var id = scope.id;
  var handlers = require('./handlers')(scope);

  function sendEvent(parts) {
    // initialise the event name
    var evtName = parts[0].slice(1);

    // convert any valid json objects to json
    var args = parts.slice(1).map(function(part) {
      if (part.charAt(0) === '{') {
        try {
          part = JSON.parse(part);
        }
        catch (e) {
        }
      }

      return part;
    });

    scope.emit.apply(scope, [evtName].concat(args));
  }

  return function(data) {
    var isMatch = true;
    var parts;
    var handler;

    // process /to messages
    if (data.slice(0, 3) === '/to') {
      isMatch = data.slice(4, id.length + 4) === id;
      if (isMatch) {
        data = data.slice(5 + id.length);
      }
    }

    // if this is not a match, then bail
    if (! isMatch) {
      return;
    }

    // chop the data into parts
    parts = data.split('|');

    // if we have a specific handler for the action, then invoke
    if (parts[0].charAt(0) === '/') {
      handler = handlers[parts[0].slice(1)];

      if (typeof handler == 'function') {
        handler(parts.slice(1));
      }
      else {
        sendEvent(parts);
      }
    }

    // process matchers
    scope.matchers = scope.matchers.filter(function(rule) {
      var exec = data.slice(0, rule.prefix.length) === rule.prefix;

      if (exec && typeof rule.handler == 'function') {
        rule.handler(data);
      }

      // only keep if not executed
      return !exec;
    });
  };
};
},{"./handlers":27}],35:[function(require,module,exports){
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

  ### couple(pc, targetAttr, signaller, opts?)

  Couple a WebRTC connection with another webrtc connection via a
  signalling scope.  The `targetAttr` argument specifies the criteria that
  are passed onto a `/request` command when looking for remote peer
  to couple and exchange messages with.

  ### Example Usage

  ```js
  var couple = require('rtc/couple');

  couple(new RTCPeerConnection(), { id: 'test' }, signaller);
  ```

  ### Using Filters

  In certain instances you may wish to modify the raw SDP that is provided
  by the `createOffer` and `createAnswer` calls.  This can be done by passing
  a `sdpfilter` function (or array) in the options.  For example:

  ```js
  // run the sdp from through a local tweakSdp function.
  couple(pc, { id: 'blah' }, signaller, { sdpfilter: tweakSdp });
  ```

**/
function couple(conn, targetAttr, signaller, opts) {
  // create a monitor for the connection
  var mon = monitor(conn);
  var blockId;
  var stages = {};
  var openChannel;
  var queuedCandidates = [];
  var sdpFilter = (opts || {}).sdpfilter;

  // retry implementation
  var maxAttempts = (opts || {}).maxAttempts || 3;
  var attemptDelay = (opts || {}).attemptDelay || 3000;
  var attempt = 1;
  var attemptTimer;

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

      // clear any block
      signaller.clearBlock(blockId);

      // TODO: report the data

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

  function createHandshaker(methodName) {
    var hsDebug = require('cog/logger')('handshake-' + methodName);

    return q.push.bind(q, { op: function(task, cb) {
      // clear the open channel
      openChannel = null;

      hsDebug('starting, making signaller request', conn.signalingState);
      signaller.request(targetAttr, function(err, channel) {
        if (err) {
          return;
        }

        hsDebug('request ok');

        // block the signalling scope
        blockId = signaller.block();

        // create the offer
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
                // save the channel as open
                openChannel = channel;

                // send the sdp
                channel.send('/sdp', desc);

                // clear the block
                signaller.clearBlock(blockId);
                hsDebug('block cleared');

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
      });
    }});
  }

  function handleLocalCandidate(evt) {
    if (evt.candidate && openChannel) {
      openChannel.send('/candidate', evt.candidate);
    }
  }

  function handleRemoteCandidate(data) {
    if (! conn.remoteDescription) {
      return queuedCandidates.push(data);
    }

    debug('adding remote candidate');
    try {
      conn.addIceCandidate(new RTCIceCandidate(data));
    }
    catch (e) {
      debug('invalidate candidate specified: ', data);
    }
  }

  function handleSdp(data) {
    // queue the remote description operation
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
            stages.createAnswer();
          }

          // trigger the callback
          cb();
        },

        abort(data.type === 'offer' ? 'createAnswer' : 'createOffer', data.sdp, cb)
      );
    }});
  }

  // create the stages
  ['createOffer', 'createAnswer'].forEach(function(stage) {
    stages[stage] = createHandshaker(stage);
  });

  // when regotiation is needed look for the peer
  conn.addEventListener('negotiationneeded', stages.createOffer);
  conn.addEventListener('icecandidate', handleLocalCandidate);

  // when we receive sdp, then
  signaller.on('sdp', handleSdp);
  signaller.on('candidate', handleRemoteCandidate);

  // when the connection closes, remove event handlers
  mon.once('closed', function() {
    debug('closed');

    // remove listeners
    signaller.removeListener('sdp', handleSdp);
    signaller.removeListener('candidate', handleRemoteCandidate);
  });

  // patch in the create offer functions
  mon.createOffer = stages.createOffer;

  return mon;
}

module.exports = couple;
},{"./detect":36,"./monitor":39,"async":40,"cog/logger":42}],36:[function(require,module,exports){
/* jshint node: true */
'use strict';

/**
  ## rtc/detect

  Provide the [rtc-core/detect](https://github.com/rtc-io/rtc-core#detect) 
  functionality.
**/
module.exports = require('rtc-core/detect');
},{"rtc-core/detect":43}],37:[function(require,module,exports){
/* jshint node: true */
'use strict';

var detect = require('./detect');
var defaults = require('cog/defaults');

var mappings = {
  offer: {
    // audio toggle
    // { audio: false } in peer connection config turns off audio
    audio: function(c) {
      c.mandatory = c.mandatory || {};
      c.mandatory.OfferToReceiveAudio = true;
    },

    // video toggle
    // { video: false } in peer connection config turns off video
    video: function(c) {
      c.mandatory = c.mandatory || {};
      c.mandatory.OfferToReceiveVideo = true;
    }
  },

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

  // iterate through the flags and apply the create mappings
  Object.keys(flags || {}).forEach(function(key) {
    if (m[key]) {
      m[key](generated);
    }
  });

  return defaults({}, constraints, generated);
};

/**
  ### generators.mediaConstraints(flags, context)

  Generate mediaConstraints appropriate for the context in which they are 
  being called (i.e. either constructing an RTCPeerConnection object, or
  on the `createOffer` or `createAnswer` calls).
**/
exports.mediaConstraints = function(flags, context) {
  // create an empty constraints object
  var constraints = {
    optional: [{ DtlsSrtpKeyAgreement: true }]
  };

  // provide default mandatory constraints for the offer
  if (context === 'offer') {
    constraints.mandatory = {
      OfferToReceiveVideo: false,
      OfferToReceiveAudio: false
    };
  }

  // get the mappings for the context (defaulting to the offer context)
  var contextMappings = mappings[context || 'offer'] || {};

  // if we haven't been passed an array for flags, then return the constraints
  if (! Array.isArray(flags)) {
    flags = parseFlags(flags);
  }

  flags.map(function(flag) {
    if (typeof contextMappings[flag] == 'function') {
      // mutate the constraints
      contextMappings[flag](constraints);
    }
  });

  return constraints;
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
},{"./detect":36,"cog/defaults":41}],38:[function(require,module,exports){
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
},{"./couple":35,"./detect":36,"./generators":37,"cog/logger":42}],39:[function(require,module,exports){
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
},{"__browserify_process":11,"cog/logger":42,"events":3}],40:[function(require,module,exports){
module.exports=require(14)
},{"__browserify_process":11}],41:[function(require,module,exports){
module.exports=require(15)
},{}],42:[function(require,module,exports){
module.exports=require(17)
},{}],43:[function(require,module,exports){
module.exports=require(23)
},{}],44:[function(require,module,exports){
var parser = require('./lib/parser');
var writer = require('./lib/writer');

exports.write = writer;
exports.parse = parser.parse;
exports.parseFmtpConfig = parser.parseFmtpConfig;
exports.parsePayloads = parser.parsePayloads;
exports.parseRemoteCandidates = parser.parseRemoteCandidates;

},{"./lib/parser":46,"./lib/writer":47}],45:[function(require,module,exports){
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
      name: 'sendrecv',
      reg: /^(sendrecv|recvonly|sendonly|inactive)/
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

},{}],46:[function(require,module,exports){
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

},{"./grammar":45}],47:[function(require,module,exports){
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
  'b', 'z', 'a', 't', 'r'
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

},{"./grammar":45,"util":6}],48:[function(require,module,exports){
/* jshint node: true */
/* global io: false */
'use strict';

var eve = require('eve');
var rtc = require('rtc');
var logger = require('cog/logger')('glue-sessionmanager');
var createSignaller = require('rtc-signaller');
var extend = require('cog/extend');

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

  // create our signalling interface
  this.signaller = createSignaller(this.socket);

  // hook up signaller events
  this._bindEvents(this.signaller);
}

module.exports = SessionManager;

/**
  #### announce()

  Announce ourselves on the signalling channel
**/
SessionManager.prototype.announce = function(targetId) {
  var scope = targetId ? this.signaller.to(targetId) : this.signaller;

  logger('announcing self to: ' + (targetId || 'all'));
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
      logger('captured error attempting to add stream: ', e);
    }
  }

  // add to existing streams
  Object.keys(peers).forEach(function(peerId) {
    if (peers[peerId]) {
      connectPeer(peers[peerId], peerId);
    }
  });

  // when a new peer arrives, add it to that peer also
  eve.on('glue.peer.join', connectPeer);

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

SessionManager.prototype._bindEvents = function(signaller) {
  var mgr = this;

  // TODO: extract the meaningful parts from the config
  // var opts = this.cfg;
  logger('initializing event handlers');

  signaller.on('announce', function(data) {
    var ns = 'glue.peer.join.' + (data.role || 'none')
    var peer;
    var monitor;

    // if the room does not match our room
    // OR, we already have an active peer for that id, then abort
    if (data.room !== mgr.room) {
      return logger('received announce for incorrect room');
    }

    if (mgr.peers[data.id]) {
      return logger('known peer');
    }

    // create our peer connection
    peer = mgr.peers[data.id] = rtc.createConnection();

    // couple the connections
    monitor = rtc.couple(peer, { id: data.id }, signaller);

    // wait for the monitor to tell us we have an active connection
    // before attempting to bind to any UI elements
    monitor.once('active', function() {
      eve('glue.peer.active.' + (data.role || 'none'), null, peer, data.id);
    });

    eve('glue.peer.join.' + (data.role || 'none'), null, peer, data.id);

    // introduce ourself to the new peer
    mgr.announce(data.id);
  });

  signaller.on('leave', function(id) {
    // get the peer
    var peer = mgr.peers[id];

    // if this is a peer we know about, then close and send a notification
    if (peer) {
      peer.close();
      mgr.peers[id] = undefined;

      // trigger the notification
      eve('glue.peer.leave', null, peer, id);
    }
  });

  signaller.on('streamdata', function(data) {
    // save the stream data to the local stream
    mgr.streams[data.id] = data;
    eve('glue.streamdata.' + data.id, null, data);
  });
};
},{"cog/extend":16,"cog/logger":17,"eve":18,"rtc":38,"rtc-signaller":29}]},{},[13])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9kb2VobG1hbi8uYmFzaGluYXRlL2luc3RhbGwvbm9kZS8wLjEwLjIyL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1idWlsdGlucy9idWlsdGluL19zaGltcy5qcyIsIi9ob21lL2RvZWhsbWFuLy5iYXNoaW5hdGUvaW5zdGFsbC9ub2RlLzAuMTAuMjIvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLWJ1aWx0aW5zL2J1aWx0aW4vYXNzZXJ0LmpzIiwiL2hvbWUvZG9laGxtYW4vLmJhc2hpbmF0ZS9pbnN0YWxsL25vZGUvMC4xMC4yMi9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItYnVpbHRpbnMvYnVpbHRpbi9ldmVudHMuanMiLCIvaG9tZS9kb2VobG1hbi8uYmFzaGluYXRlL2luc3RhbGwvbm9kZS8wLjEwLjIyL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1idWlsdGlucy9idWlsdGluL3F1ZXJ5c3RyaW5nLmpzIiwiL2hvbWUvZG9laGxtYW4vLmJhc2hpbmF0ZS9pbnN0YWxsL25vZGUvMC4xMC4yMi9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItYnVpbHRpbnMvYnVpbHRpbi91cmwuanMiLCIvaG9tZS9kb2VobG1hbi8uYmFzaGluYXRlL2luc3RhbGwvbm9kZS8wLjEwLjIyL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1idWlsdGlucy9idWlsdGluL3V0aWwuanMiLCIvaG9tZS9kb2VobG1hbi8uYmFzaGluYXRlL2luc3RhbGwvbm9kZS8wLjEwLjIyL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1idWlsdGlucy9ub2RlX21vZHVsZXMvYnVmZmVyLWJyb3dzZXJpZnkvYnVmZmVyX2llZWU3NTQuanMiLCIvaG9tZS9kb2VobG1hbi8uYmFzaGluYXRlL2luc3RhbGwvbm9kZS8wLjEwLjIyL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1idWlsdGlucy9ub2RlX21vZHVsZXMvYnVmZmVyLWJyb3dzZXJpZnkvaW5kZXguanMiLCIvaG9tZS9kb2VobG1hbi8uYmFzaGluYXRlL2luc3RhbGwvbm9kZS8wLjEwLjIyL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1idWlsdGlucy9ub2RlX21vZHVsZXMvYnVmZmVyLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9saWIvYjY0LmpzIiwiL2hvbWUvZG9laGxtYW4vLmJhc2hpbmF0ZS9pbnN0YWxsL25vZGUvMC4xMC4yMi9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luc2VydC1tb2R1bGUtZ2xvYmFscy9idWZmZXIuanMiLCIvaG9tZS9kb2VobG1hbi8uYmFzaGluYXRlL2luc3RhbGwvbm9kZS8wLjEwLjIyL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5zZXJ0LW1vZHVsZS1nbG9iYWxzL25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9nbHVlL2V2ZW50cy5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL2dsdWUvaW5kZXguanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9hc3luYy9saWIvYXN5bmMuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9jb2cvZGVmYXVsdHMuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9jb2cvZXh0ZW5kLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvY29nL2xvZ2dlci5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL2V2ZS9ldmUuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9mZG9tL21ldGEuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9mZG9tL29uLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvZmRvbS9xc2EuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9ydGMtY2FwdHVyZWNvbmZpZy9pbmRleC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy1jb3JlL2RldGVjdC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy1jb3JlL3Jlc2V0LmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvcnRjLW1lZGlhL2luZGV4LmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9oYW5kbGVycy9hbm5vdW5jZS5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvaGFuZGxlcnMvaW5kZXguanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL2hhbmRsZXJzL3JlcXVlc3QuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9ydGMtc2lnbmFsbGVyL2luZGV4LmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvcnRjLXNpZ25hbGxlci9ub2RlX21vZHVsZXMvdXVpZC9ybmctYnJvd3Nlci5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvbm9kZV9tb2R1bGVzL3V1aWQvdXVpZC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvcHJpbXVzLWxvYWRlci5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy1zaWduYWxsZXIvcHJvY2Vzc29yLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvcnRjL2NvdXBsZS5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy9kZXRlY3QuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9ydGMvZ2VuZXJhdG9ycy5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy9pbmRleC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3J0Yy9tb25pdG9yLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vZ2x1ZS9ub2RlX21vZHVsZXMvc2RwLXRyYW5zZm9ybS9pbmRleC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL2dsdWUvbm9kZV9tb2R1bGVzL3NkcC10cmFuc2Zvcm0vbGliL2dyYW1tYXIuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9zZHAtdHJhbnNmb3JtL2xpYi9wYXJzZXIuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9nbHVlL25vZGVfbW9kdWxlcy9zZHAtdHJhbnNmb3JtL2xpYi93cml0ZXIuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9nbHVlL3Nlc3Npb25tYW5hZ2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BtQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxMEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL2lCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDblNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7OztBQzdKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJcblxuLy9cbi8vIFRoZSBzaGltcyBpbiB0aGlzIGZpbGUgYXJlIG5vdCBmdWxseSBpbXBsZW1lbnRlZCBzaGltcyBmb3IgdGhlIEVTNVxuLy8gZmVhdHVyZXMsIGJ1dCBkbyB3b3JrIGZvciB0aGUgcGFydGljdWxhciB1c2VjYXNlcyB0aGVyZSBpcyBpblxuLy8gdGhlIG90aGVyIG1vZHVsZXMuXG4vL1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLy8gQXJyYXkuaXNBcnJheSBpcyBzdXBwb3J0ZWQgaW4gSUU5XG5mdW5jdGlvbiBpc0FycmF5KHhzKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHhzKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn1cbmV4cG9ydHMuaXNBcnJheSA9IHR5cGVvZiBBcnJheS5pc0FycmF5ID09PSAnZnVuY3Rpb24nID8gQXJyYXkuaXNBcnJheSA6IGlzQXJyYXk7XG5cbi8vIEFycmF5LnByb3RvdHlwZS5pbmRleE9mIGlzIHN1cHBvcnRlZCBpbiBJRTlcbmV4cG9ydHMuaW5kZXhPZiA9IGZ1bmN0aW9uIGluZGV4T2YoeHMsIHgpIHtcbiAgaWYgKHhzLmluZGV4T2YpIHJldHVybiB4cy5pbmRleE9mKHgpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHggPT09IHhzW2ldKSByZXR1cm4gaTtcbiAgfVxuICByZXR1cm4gLTE7XG59O1xuXG4vLyBBcnJheS5wcm90b3R5cGUuZmlsdGVyIGlzIHN1cHBvcnRlZCBpbiBJRTlcbmV4cG9ydHMuZmlsdGVyID0gZnVuY3Rpb24gZmlsdGVyKHhzLCBmbikge1xuICBpZiAoeHMuZmlsdGVyKSByZXR1cm4geHMuZmlsdGVyKGZuKTtcbiAgdmFyIHJlcyA9IFtdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGZuKHhzW2ldLCBpLCB4cykpIHJlcy5wdXNoKHhzW2ldKTtcbiAgfVxuICByZXR1cm4gcmVzO1xufTtcblxuLy8gQXJyYXkucHJvdG90eXBlLmZvckVhY2ggaXMgc3VwcG9ydGVkIGluIElFOVxuZXhwb3J0cy5mb3JFYWNoID0gZnVuY3Rpb24gZm9yRWFjaCh4cywgZm4sIHNlbGYpIHtcbiAgaWYgKHhzLmZvckVhY2gpIHJldHVybiB4cy5mb3JFYWNoKGZuLCBzZWxmKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgIGZuLmNhbGwoc2VsZiwgeHNbaV0sIGksIHhzKTtcbiAgfVxufTtcblxuLy8gQXJyYXkucHJvdG90eXBlLm1hcCBpcyBzdXBwb3J0ZWQgaW4gSUU5XG5leHBvcnRzLm1hcCA9IGZ1bmN0aW9uIG1hcCh4cywgZm4pIHtcbiAgaWYgKHhzLm1hcCkgcmV0dXJuIHhzLm1hcChmbik7XG4gIHZhciBvdXQgPSBuZXcgQXJyYXkoeHMubGVuZ3RoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgIG91dFtpXSA9IGZuKHhzW2ldLCBpLCB4cyk7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn07XG5cbi8vIEFycmF5LnByb3RvdHlwZS5yZWR1Y2UgaXMgc3VwcG9ydGVkIGluIElFOVxuZXhwb3J0cy5yZWR1Y2UgPSBmdW5jdGlvbiByZWR1Y2UoYXJyYXksIGNhbGxiYWNrLCBvcHRfaW5pdGlhbFZhbHVlKSB7XG4gIGlmIChhcnJheS5yZWR1Y2UpIHJldHVybiBhcnJheS5yZWR1Y2UoY2FsbGJhY2ssIG9wdF9pbml0aWFsVmFsdWUpO1xuICB2YXIgdmFsdWUsIGlzVmFsdWVTZXQgPSBmYWxzZTtcblxuICBpZiAoMiA8IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICB2YWx1ZSA9IG9wdF9pbml0aWFsVmFsdWU7XG4gICAgaXNWYWx1ZVNldCA9IHRydWU7XG4gIH1cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhcnJheS5sZW5ndGg7IGwgPiBpOyArK2kpIHtcbiAgICBpZiAoYXJyYXkuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgIGlmIChpc1ZhbHVlU2V0KSB7XG4gICAgICAgIHZhbHVlID0gY2FsbGJhY2sodmFsdWUsIGFycmF5W2ldLCBpLCBhcnJheSk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdmFsdWUgPSBhcnJheVtpXTtcbiAgICAgICAgaXNWYWx1ZVNldCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHZhbHVlO1xufTtcblxuLy8gU3RyaW5nLnByb3RvdHlwZS5zdWJzdHIgLSBuZWdhdGl2ZSBpbmRleCBkb24ndCB3b3JrIGluIElFOFxuaWYgKCdhYicuc3Vic3RyKC0xKSAhPT0gJ2InKSB7XG4gIGV4cG9ydHMuc3Vic3RyID0gZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbmd0aCkge1xuICAgIC8vIGRpZCB3ZSBnZXQgYSBuZWdhdGl2ZSBzdGFydCwgY2FsY3VsYXRlIGhvdyBtdWNoIGl0IGlzIGZyb20gdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyaW5nXG4gICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSBzdHIubGVuZ3RoICsgc3RhcnQ7XG5cbiAgICAvLyBjYWxsIHRoZSBvcmlnaW5hbCBmdW5jdGlvblxuICAgIHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW5ndGgpO1xuICB9O1xufSBlbHNlIHtcbiAgZXhwb3J0cy5zdWJzdHIgPSBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuZ3RoKSB7XG4gICAgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbmd0aCk7XG4gIH07XG59XG5cbi8vIFN0cmluZy5wcm90b3R5cGUudHJpbSBpcyBzdXBwb3J0ZWQgaW4gSUU5XG5leHBvcnRzLnRyaW0gPSBmdW5jdGlvbiAoc3RyKSB7XG4gIGlmIChzdHIudHJpbSkgcmV0dXJuIHN0ci50cmltKCk7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpO1xufTtcblxuLy8gRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgaXMgc3VwcG9ydGVkIGluIElFOVxuZXhwb3J0cy5iaW5kID0gZnVuY3Rpb24gKCkge1xuICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gIHZhciBmbiA9IGFyZ3Muc2hpZnQoKTtcbiAgaWYgKGZuLmJpbmQpIHJldHVybiBmbi5iaW5kLmFwcGx5KGZuLCBhcmdzKTtcbiAgdmFyIHNlbGYgPSBhcmdzLnNoaWZ0KCk7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgZm4uYXBwbHkoc2VsZiwgYXJncy5jb25jYXQoW0FycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyldKSk7XG4gIH07XG59O1xuXG4vLyBPYmplY3QuY3JlYXRlIGlzIHN1cHBvcnRlZCBpbiBJRTlcbmZ1bmN0aW9uIGNyZWF0ZShwcm90b3R5cGUsIHByb3BlcnRpZXMpIHtcbiAgdmFyIG9iamVjdDtcbiAgaWYgKHByb3RvdHlwZSA9PT0gbnVsbCkge1xuICAgIG9iamVjdCA9IHsgJ19fcHJvdG9fXycgOiBudWxsIH07XG4gIH1cbiAgZWxzZSB7XG4gICAgaWYgKHR5cGVvZiBwcm90b3R5cGUgIT09ICdvYmplY3QnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAndHlwZW9mIHByb3RvdHlwZVsnICsgKHR5cGVvZiBwcm90b3R5cGUpICsgJ10gIT0gXFwnb2JqZWN0XFwnJ1xuICAgICAgKTtcbiAgICB9XG4gICAgdmFyIFR5cGUgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICBUeXBlLnByb3RvdHlwZSA9IHByb3RvdHlwZTtcbiAgICBvYmplY3QgPSBuZXcgVHlwZSgpO1xuICAgIG9iamVjdC5fX3Byb3RvX18gPSBwcm90b3R5cGU7XG4gIH1cbiAgaWYgKHR5cGVvZiBwcm9wZXJ0aWVzICE9PSAndW5kZWZpbmVkJyAmJiBPYmplY3QuZGVmaW5lUHJvcGVydGllcykge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG9iamVjdCwgcHJvcGVydGllcyk7XG4gIH1cbiAgcmV0dXJuIG9iamVjdDtcbn1cbmV4cG9ydHMuY3JlYXRlID0gdHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicgPyBPYmplY3QuY3JlYXRlIDogY3JlYXRlO1xuXG4vLyBPYmplY3Qua2V5cyBhbmQgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMgaXMgc3VwcG9ydGVkIGluIElFOSBob3dldmVyXG4vLyB0aGV5IGRvIHNob3cgYSBkZXNjcmlwdGlvbiBhbmQgbnVtYmVyIHByb3BlcnR5IG9uIEVycm9yIG9iamVjdHNcbmZ1bmN0aW9uIG5vdE9iamVjdChvYmplY3QpIHtcbiAgcmV0dXJuICgodHlwZW9mIG9iamVjdCAhPSBcIm9iamVjdFwiICYmIHR5cGVvZiBvYmplY3QgIT0gXCJmdW5jdGlvblwiKSB8fCBvYmplY3QgPT09IG51bGwpO1xufVxuXG5mdW5jdGlvbiBrZXlzU2hpbShvYmplY3QpIHtcbiAgaWYgKG5vdE9iamVjdChvYmplY3QpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdC5rZXlzIGNhbGxlZCBvbiBhIG5vbi1vYmplY3RcIik7XG4gIH1cblxuICB2YXIgcmVzdWx0ID0gW107XG4gIGZvciAodmFyIG5hbWUgaW4gb2JqZWN0KSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBuYW1lKSkge1xuICAgICAgcmVzdWx0LnB1c2gobmFtZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8vIGdldE93blByb3BlcnR5TmFtZXMgaXMgYWxtb3N0IHRoZSBzYW1lIGFzIE9iamVjdC5rZXlzIG9uZSBrZXkgZmVhdHVyZVxuLy8gIGlzIHRoYXQgaXQgcmV0dXJucyBoaWRkZW4gcHJvcGVydGllcywgc2luY2UgdGhhdCBjYW4ndCBiZSBpbXBsZW1lbnRlZCxcbi8vICB0aGlzIGZlYXR1cmUgZ2V0cyByZWR1Y2VkIHNvIGl0IGp1c3Qgc2hvd3MgdGhlIGxlbmd0aCBwcm9wZXJ0eSBvbiBhcnJheXNcbmZ1bmN0aW9uIHByb3BlcnR5U2hpbShvYmplY3QpIHtcbiAgaWYgKG5vdE9iamVjdChvYmplY3QpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzIGNhbGxlZCBvbiBhIG5vbi1vYmplY3RcIik7XG4gIH1cblxuICB2YXIgcmVzdWx0ID0ga2V5c1NoaW0ob2JqZWN0KTtcbiAgaWYgKGV4cG9ydHMuaXNBcnJheShvYmplY3QpICYmIGV4cG9ydHMuaW5kZXhPZihvYmplY3QsICdsZW5ndGgnKSA9PT0gLTEpIHtcbiAgICByZXN1bHQucHVzaCgnbGVuZ3RoJyk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxudmFyIGtleXMgPSB0eXBlb2YgT2JqZWN0LmtleXMgPT09ICdmdW5jdGlvbicgPyBPYmplY3Qua2V5cyA6IGtleXNTaGltO1xudmFyIGdldE93blByb3BlcnR5TmFtZXMgPSB0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMgPT09ICdmdW5jdGlvbicgP1xuICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyA6IHByb3BlcnR5U2hpbTtcblxuaWYgKG5ldyBFcnJvcigpLmhhc093blByb3BlcnR5KCdkZXNjcmlwdGlvbicpKSB7XG4gIHZhciBFUlJPUl9QUk9QRVJUWV9GSUxURVIgPSBmdW5jdGlvbiAob2JqLCBhcnJheSkge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEVycm9yXScpIHtcbiAgICAgIGFycmF5ID0gZXhwb3J0cy5maWx0ZXIoYXJyYXksIGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHJldHVybiBuYW1lICE9PSAnZGVzY3JpcHRpb24nICYmIG5hbWUgIT09ICdudW1iZXInICYmIG5hbWUgIT09ICdtZXNzYWdlJztcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gYXJyYXk7XG4gIH07XG5cbiAgZXhwb3J0cy5rZXlzID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIHJldHVybiBFUlJPUl9QUk9QRVJUWV9GSUxURVIob2JqZWN0LCBrZXlzKG9iamVjdCkpO1xuICB9O1xuICBleHBvcnRzLmdldE93blByb3BlcnR5TmFtZXMgPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgcmV0dXJuIEVSUk9SX1BST1BFUlRZX0ZJTFRFUihvYmplY3QsIGdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KSk7XG4gIH07XG59IGVsc2Uge1xuICBleHBvcnRzLmtleXMgPSBrZXlzO1xuICBleHBvcnRzLmdldE93blByb3BlcnR5TmFtZXMgPSBnZXRPd25Qcm9wZXJ0eU5hbWVzO1xufVxuXG4vLyBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIC0gc3VwcG9ydGVkIGluIElFOCBidXQgb25seSBvbiBkb20gZWxlbWVudHNcbmZ1bmN0aW9uIHZhbHVlT2JqZWN0KHZhbHVlLCBrZXkpIHtcbiAgcmV0dXJuIHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbn1cblxuaWYgKHR5cGVvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID09PSAnZnVuY3Rpb24nKSB7XG4gIHRyeSB7XG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih7J2EnOiAxfSwgJ2EnKTtcbiAgICBleHBvcnRzLmdldE93blByb3BlcnR5RGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyBJRTggZG9tIGVsZW1lbnQgaXNzdWUgLSB1c2UgYSB0cnkgY2F0Y2ggYW5kIGRlZmF1bHQgdG8gdmFsdWVPYmplY3RcbiAgICBleHBvcnRzLmdldE93blByb3BlcnR5RGVzY3JpcHRvciA9IGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlT2JqZWN0KHZhbHVlLCBrZXkpO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn0gZWxzZSB7XG4gIGV4cG9ydHMuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID0gdmFsdWVPYmplY3Q7XG59XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gVVRJTElUWVxudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG52YXIgc2hpbXMgPSByZXF1aXJlKCdfc2hpbXMnKTtcbnZhciBwU2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5cbi8vIDEuIFRoZSBhc3NlcnQgbW9kdWxlIHByb3ZpZGVzIGZ1bmN0aW9ucyB0aGF0IHRocm93XG4vLyBBc3NlcnRpb25FcnJvcidzIHdoZW4gcGFydGljdWxhciBjb25kaXRpb25zIGFyZSBub3QgbWV0LiBUaGVcbi8vIGFzc2VydCBtb2R1bGUgbXVzdCBjb25mb3JtIHRvIHRoZSBmb2xsb3dpbmcgaW50ZXJmYWNlLlxuXG52YXIgYXNzZXJ0ID0gbW9kdWxlLmV4cG9ydHMgPSBvaztcblxuLy8gMi4gVGhlIEFzc2VydGlvbkVycm9yIGlzIGRlZmluZWQgaW4gYXNzZXJ0LlxuLy8gbmV3IGFzc2VydC5Bc3NlcnRpb25FcnJvcih7IG1lc3NhZ2U6IG1lc3NhZ2UsXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0dWFsOiBhY3R1YWwsXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IGV4cGVjdGVkIH0pXG5cbmFzc2VydC5Bc3NlcnRpb25FcnJvciA9IGZ1bmN0aW9uIEFzc2VydGlvbkVycm9yKG9wdGlvbnMpIHtcbiAgdGhpcy5uYW1lID0gJ0Fzc2VydGlvbkVycm9yJztcbiAgdGhpcy5hY3R1YWwgPSBvcHRpb25zLmFjdHVhbDtcbiAgdGhpcy5leHBlY3RlZCA9IG9wdGlvbnMuZXhwZWN0ZWQ7XG4gIHRoaXMub3BlcmF0b3IgPSBvcHRpb25zLm9wZXJhdG9yO1xuICB0aGlzLm1lc3NhZ2UgPSBvcHRpb25zLm1lc3NhZ2UgfHwgZ2V0TWVzc2FnZSh0aGlzKTtcbn07XG5cbi8vIGFzc2VydC5Bc3NlcnRpb25FcnJvciBpbnN0YW5jZW9mIEVycm9yXG51dGlsLmluaGVyaXRzKGFzc2VydC5Bc3NlcnRpb25FcnJvciwgRXJyb3IpO1xuXG5mdW5jdGlvbiByZXBsYWNlcihrZXksIHZhbHVlKSB7XG4gIGlmICh1dGlsLmlzVW5kZWZpbmVkKHZhbHVlKSkge1xuICAgIHJldHVybiAnJyArIHZhbHVlO1xuICB9XG4gIGlmICh1dGlsLmlzTnVtYmVyKHZhbHVlKSAmJiAoaXNOYU4odmFsdWUpIHx8ICFpc0Zpbml0ZSh2YWx1ZSkpKSB7XG4gICAgcmV0dXJuIHZhbHVlLnRvU3RyaW5nKCk7XG4gIH1cbiAgaWYgKHV0aWwuaXNGdW5jdGlvbih2YWx1ZSkgfHwgdXRpbC5pc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWUudG9TdHJpbmcoKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIHRydW5jYXRlKHMsIG4pIHtcbiAgaWYgKHV0aWwuaXNTdHJpbmcocykpIHtcbiAgICByZXR1cm4gcy5sZW5ndGggPCBuID8gcyA6IHMuc2xpY2UoMCwgbik7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHM7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0TWVzc2FnZShzZWxmKSB7XG4gIHJldHVybiB0cnVuY2F0ZShKU09OLnN0cmluZ2lmeShzZWxmLmFjdHVhbCwgcmVwbGFjZXIpLCAxMjgpICsgJyAnICtcbiAgICAgICAgIHNlbGYub3BlcmF0b3IgKyAnICcgK1xuICAgICAgICAgdHJ1bmNhdGUoSlNPTi5zdHJpbmdpZnkoc2VsZi5leHBlY3RlZCwgcmVwbGFjZXIpLCAxMjgpO1xufVxuXG4vLyBBdCBwcmVzZW50IG9ubHkgdGhlIHRocmVlIGtleXMgbWVudGlvbmVkIGFib3ZlIGFyZSB1c2VkIGFuZFxuLy8gdW5kZXJzdG9vZCBieSB0aGUgc3BlYy4gSW1wbGVtZW50YXRpb25zIG9yIHN1YiBtb2R1bGVzIGNhbiBwYXNzXG4vLyBvdGhlciBrZXlzIHRvIHRoZSBBc3NlcnRpb25FcnJvcidzIGNvbnN0cnVjdG9yIC0gdGhleSB3aWxsIGJlXG4vLyBpZ25vcmVkLlxuXG4vLyAzLiBBbGwgb2YgdGhlIGZvbGxvd2luZyBmdW5jdGlvbnMgbXVzdCB0aHJvdyBhbiBBc3NlcnRpb25FcnJvclxuLy8gd2hlbiBhIGNvcnJlc3BvbmRpbmcgY29uZGl0aW9uIGlzIG5vdCBtZXQsIHdpdGggYSBtZXNzYWdlIHRoYXRcbi8vIG1heSBiZSB1bmRlZmluZWQgaWYgbm90IHByb3ZpZGVkLiAgQWxsIGFzc2VydGlvbiBtZXRob2RzIHByb3ZpZGVcbi8vIGJvdGggdGhlIGFjdHVhbCBhbmQgZXhwZWN0ZWQgdmFsdWVzIHRvIHRoZSBhc3NlcnRpb24gZXJyb3IgZm9yXG4vLyBkaXNwbGF5IHB1cnBvc2VzLlxuXG5mdW5jdGlvbiBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsIG9wZXJhdG9yLCBzdGFja1N0YXJ0RnVuY3Rpb24pIHtcbiAgdGhyb3cgbmV3IGFzc2VydC5Bc3NlcnRpb25FcnJvcih7XG4gICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICBhY3R1YWw6IGFjdHVhbCxcbiAgICBleHBlY3RlZDogZXhwZWN0ZWQsXG4gICAgb3BlcmF0b3I6IG9wZXJhdG9yLFxuICAgIHN0YWNrU3RhcnRGdW5jdGlvbjogc3RhY2tTdGFydEZ1bmN0aW9uXG4gIH0pO1xufVxuXG4vLyBFWFRFTlNJT04hIGFsbG93cyBmb3Igd2VsbCBiZWhhdmVkIGVycm9ycyBkZWZpbmVkIGVsc2V3aGVyZS5cbmFzc2VydC5mYWlsID0gZmFpbDtcblxuLy8gNC4gUHVyZSBhc3NlcnRpb24gdGVzdHMgd2hldGhlciBhIHZhbHVlIGlzIHRydXRoeSwgYXMgZGV0ZXJtaW5lZFxuLy8gYnkgISFndWFyZC5cbi8vIGFzc2VydC5vayhndWFyZCwgbWVzc2FnZV9vcHQpO1xuLy8gVGhpcyBzdGF0ZW1lbnQgaXMgZXF1aXZhbGVudCB0byBhc3NlcnQuZXF1YWwodHJ1ZSwgISFndWFyZCxcbi8vIG1lc3NhZ2Vfb3B0KTsuIFRvIHRlc3Qgc3RyaWN0bHkgZm9yIHRoZSB2YWx1ZSB0cnVlLCB1c2Vcbi8vIGFzc2VydC5zdHJpY3RFcXVhbCh0cnVlLCBndWFyZCwgbWVzc2FnZV9vcHQpOy5cblxuZnVuY3Rpb24gb2sodmFsdWUsIG1lc3NhZ2UpIHtcbiAgaWYgKCF2YWx1ZSkgZmFpbCh2YWx1ZSwgdHJ1ZSwgbWVzc2FnZSwgJz09JywgYXNzZXJ0Lm9rKTtcbn1cbmFzc2VydC5vayA9IG9rO1xuXG4vLyA1LiBUaGUgZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIHNoYWxsb3csIGNvZXJjaXZlIGVxdWFsaXR5IHdpdGhcbi8vID09LlxuLy8gYXNzZXJ0LmVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LmVxdWFsID0gZnVuY3Rpb24gZXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsICE9IGV4cGVjdGVkKSBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICc9PScsIGFzc2VydC5lcXVhbCk7XG59O1xuXG4vLyA2LiBUaGUgbm9uLWVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBmb3Igd2hldGhlciB0d28gb2JqZWN0cyBhcmUgbm90IGVxdWFsXG4vLyB3aXRoICE9IGFzc2VydC5ub3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5ub3RFcXVhbCA9IGZ1bmN0aW9uIG5vdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCA9PSBleHBlY3RlZCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJyE9JywgYXNzZXJ0Lm5vdEVxdWFsKTtcbiAgfVxufTtcblxuLy8gNy4gVGhlIGVxdWl2YWxlbmNlIGFzc2VydGlvbiB0ZXN0cyBhIGRlZXAgZXF1YWxpdHkgcmVsYXRpb24uXG4vLyBhc3NlcnQuZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LmRlZXBFcXVhbCA9IGZ1bmN0aW9uIGRlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmICghX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkKSkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJ2RlZXBFcXVhbCcsIGFzc2VydC5kZWVwRXF1YWwpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBfZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQpIHtcbiAgLy8gNy4xLiBBbGwgaWRlbnRpY2FsIHZhbHVlcyBhcmUgZXF1aXZhbGVudCwgYXMgZGV0ZXJtaW5lZCBieSA9PT0uXG4gIGlmIChhY3R1YWwgPT09IGV4cGVjdGVkKSB7XG4gICAgcmV0dXJuIHRydWU7XG5cbiAgfSBlbHNlIGlmICh1dGlsLmlzQnVmZmVyKGFjdHVhbCkgJiYgdXRpbC5pc0J1ZmZlcihleHBlY3RlZCkpIHtcbiAgICBpZiAoYWN0dWFsLmxlbmd0aCAhPSBleHBlY3RlZC5sZW5ndGgpIHJldHVybiBmYWxzZTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYWN0dWFsLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYWN0dWFsW2ldICE9PSBleHBlY3RlZFtpXSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuXG4gIC8vIDcuMi4gSWYgdGhlIGV4cGVjdGVkIHZhbHVlIGlzIGEgRGF0ZSBvYmplY3QsIHRoZSBhY3R1YWwgdmFsdWUgaXNcbiAgLy8gZXF1aXZhbGVudCBpZiBpdCBpcyBhbHNvIGEgRGF0ZSBvYmplY3QgdGhhdCByZWZlcnMgdG8gdGhlIHNhbWUgdGltZS5cbiAgfSBlbHNlIGlmICh1dGlsLmlzRGF0ZShhY3R1YWwpICYmIHV0aWwuaXNEYXRlKGV4cGVjdGVkKSkge1xuICAgIHJldHVybiBhY3R1YWwuZ2V0VGltZSgpID09PSBleHBlY3RlZC5nZXRUaW1lKCk7XG5cbiAgLy8gNy4zIElmIHRoZSBleHBlY3RlZCB2YWx1ZSBpcyBhIFJlZ0V4cCBvYmplY3QsIHRoZSBhY3R1YWwgdmFsdWUgaXNcbiAgLy8gZXF1aXZhbGVudCBpZiBpdCBpcyBhbHNvIGEgUmVnRXhwIG9iamVjdCB3aXRoIHRoZSBzYW1lIHNvdXJjZSBhbmRcbiAgLy8gcHJvcGVydGllcyAoYGdsb2JhbGAsIGBtdWx0aWxpbmVgLCBgbGFzdEluZGV4YCwgYGlnbm9yZUNhc2VgKS5cbiAgfSBlbHNlIGlmICh1dGlsLmlzUmVnRXhwKGFjdHVhbCkgJiYgdXRpbC5pc1JlZ0V4cChleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gYWN0dWFsLnNvdXJjZSA9PT0gZXhwZWN0ZWQuc291cmNlICYmXG4gICAgICAgICAgIGFjdHVhbC5nbG9iYWwgPT09IGV4cGVjdGVkLmdsb2JhbCAmJlxuICAgICAgICAgICBhY3R1YWwubXVsdGlsaW5lID09PSBleHBlY3RlZC5tdWx0aWxpbmUgJiZcbiAgICAgICAgICAgYWN0dWFsLmxhc3RJbmRleCA9PT0gZXhwZWN0ZWQubGFzdEluZGV4ICYmXG4gICAgICAgICAgIGFjdHVhbC5pZ25vcmVDYXNlID09PSBleHBlY3RlZC5pZ25vcmVDYXNlO1xuXG4gIC8vIDcuNC4gT3RoZXIgcGFpcnMgdGhhdCBkbyBub3QgYm90aCBwYXNzIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0JyxcbiAgLy8gZXF1aXZhbGVuY2UgaXMgZGV0ZXJtaW5lZCBieSA9PS5cbiAgfSBlbHNlIGlmICghdXRpbC5pc09iamVjdChhY3R1YWwpICYmICF1dGlsLmlzT2JqZWN0KGV4cGVjdGVkKSkge1xuICAgIHJldHVybiBhY3R1YWwgPT0gZXhwZWN0ZWQ7XG5cbiAgLy8gNy41IEZvciBhbGwgb3RoZXIgT2JqZWN0IHBhaXJzLCBpbmNsdWRpbmcgQXJyYXkgb2JqZWN0cywgZXF1aXZhbGVuY2UgaXNcbiAgLy8gZGV0ZXJtaW5lZCBieSBoYXZpbmcgdGhlIHNhbWUgbnVtYmVyIG9mIG93bmVkIHByb3BlcnRpZXMgKGFzIHZlcmlmaWVkXG4gIC8vIHdpdGggT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKSwgdGhlIHNhbWUgc2V0IG9mIGtleXNcbiAgLy8gKGFsdGhvdWdoIG5vdCBuZWNlc3NhcmlseSB0aGUgc2FtZSBvcmRlciksIGVxdWl2YWxlbnQgdmFsdWVzIGZvciBldmVyeVxuICAvLyBjb3JyZXNwb25kaW5nIGtleSwgYW5kIGFuIGlkZW50aWNhbCAncHJvdG90eXBlJyBwcm9wZXJ0eS4gTm90ZTogdGhpc1xuICAvLyBhY2NvdW50cyBmb3IgYm90aCBuYW1lZCBhbmQgaW5kZXhlZCBwcm9wZXJ0aWVzIG9uIEFycmF5cy5cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gb2JqRXF1aXYoYWN0dWFsLCBleHBlY3RlZCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNBcmd1bWVudHMob2JqZWN0KSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PSAnW29iamVjdCBBcmd1bWVudHNdJztcbn1cblxuZnVuY3Rpb24gb2JqRXF1aXYoYSwgYikge1xuICBpZiAodXRpbC5pc051bGxPclVuZGVmaW5lZChhKSB8fCB1dGlsLmlzTnVsbE9yVW5kZWZpbmVkKGIpKVxuICAgIHJldHVybiBmYWxzZTtcbiAgLy8gYW4gaWRlbnRpY2FsICdwcm90b3R5cGUnIHByb3BlcnR5LlxuICBpZiAoYS5wcm90b3R5cGUgIT09IGIucHJvdG90eXBlKSByZXR1cm4gZmFsc2U7XG4gIC8vfn5+SSd2ZSBtYW5hZ2VkIHRvIGJyZWFrIE9iamVjdC5rZXlzIHRocm91Z2ggc2NyZXd5IGFyZ3VtZW50cyBwYXNzaW5nLlxuICAvLyAgIENvbnZlcnRpbmcgdG8gYXJyYXkgc29sdmVzIHRoZSBwcm9ibGVtLlxuICBpZiAoaXNBcmd1bWVudHMoYSkpIHtcbiAgICBpZiAoIWlzQXJndW1lbnRzKGIpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGEgPSBwU2xpY2UuY2FsbChhKTtcbiAgICBiID0gcFNsaWNlLmNhbGwoYik7XG4gICAgcmV0dXJuIF9kZWVwRXF1YWwoYSwgYik7XG4gIH1cbiAgdHJ5IHtcbiAgICB2YXIga2EgPSBzaGltcy5rZXlzKGEpLFxuICAgICAgICBrYiA9IHNoaW1zLmtleXMoYiksXG4gICAgICAgIGtleSwgaTtcbiAgfSBjYXRjaCAoZSkgey8vaGFwcGVucyB3aGVuIG9uZSBpcyBhIHN0cmluZyBsaXRlcmFsIGFuZCB0aGUgb3RoZXIgaXNuJ3RcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLy8gaGF2aW5nIHRoZSBzYW1lIG51bWJlciBvZiBvd25lZCBwcm9wZXJ0aWVzIChrZXlzIGluY29ycG9yYXRlc1xuICAvLyBoYXNPd25Qcm9wZXJ0eSlcbiAgaWYgKGthLmxlbmd0aCAhPSBrYi5sZW5ndGgpXG4gICAgcmV0dXJuIGZhbHNlO1xuICAvL3RoZSBzYW1lIHNldCBvZiBrZXlzIChhbHRob3VnaCBub3QgbmVjZXNzYXJpbHkgdGhlIHNhbWUgb3JkZXIpLFxuICBrYS5zb3J0KCk7XG4gIGtiLnNvcnQoKTtcbiAgLy9+fn5jaGVhcCBrZXkgdGVzdFxuICBmb3IgKGkgPSBrYS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGlmIChrYVtpXSAhPSBrYltpXSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAvL2VxdWl2YWxlbnQgdmFsdWVzIGZvciBldmVyeSBjb3JyZXNwb25kaW5nIGtleSwgYW5kXG4gIC8vfn5+cG9zc2libHkgZXhwZW5zaXZlIGRlZXAgdGVzdFxuICBmb3IgKGkgPSBrYS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGtleSA9IGthW2ldO1xuICAgIGlmICghX2RlZXBFcXVhbChhW2tleV0sIGJba2V5XSkpIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLy8gOC4gVGhlIG5vbi1lcXVpdmFsZW5jZSBhc3NlcnRpb24gdGVzdHMgZm9yIGFueSBkZWVwIGluZXF1YWxpdHkuXG4vLyBhc3NlcnQubm90RGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0Lm5vdERlZXBFcXVhbCA9IGZ1bmN0aW9uIG5vdERlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChfZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQpKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnbm90RGVlcEVxdWFsJywgYXNzZXJ0Lm5vdERlZXBFcXVhbCk7XG4gIH1cbn07XG5cbi8vIDkuIFRoZSBzdHJpY3QgZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIHN0cmljdCBlcXVhbGl0eSwgYXMgZGV0ZXJtaW5lZCBieSA9PT0uXG4vLyBhc3NlcnQuc3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQuc3RyaWN0RXF1YWwgPSBmdW5jdGlvbiBzdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgIT09IGV4cGVjdGVkKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnPT09JywgYXNzZXJ0LnN0cmljdEVxdWFsKTtcbiAgfVxufTtcblxuLy8gMTAuIFRoZSBzdHJpY3Qgbm9uLWVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBmb3Igc3RyaWN0IGluZXF1YWxpdHksIGFzXG4vLyBkZXRlcm1pbmVkIGJ5ICE9PS4gIGFzc2VydC5ub3RTdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5ub3RTdHJpY3RFcXVhbCA9IGZ1bmN0aW9uIG5vdFN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCA9PT0gZXhwZWN0ZWQpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICchPT0nLCBhc3NlcnQubm90U3RyaWN0RXF1YWwpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBleHBlY3RlZEV4Y2VwdGlvbihhY3R1YWwsIGV4cGVjdGVkKSB7XG4gIGlmICghYWN0dWFsIHx8ICFleHBlY3RlZCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZXhwZWN0ZWQpID09ICdbb2JqZWN0IFJlZ0V4cF0nKSB7XG4gICAgcmV0dXJuIGV4cGVjdGVkLnRlc3QoYWN0dWFsKTtcbiAgfSBlbHNlIGlmIChhY3R1YWwgaW5zdGFuY2VvZiBleHBlY3RlZCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKGV4cGVjdGVkLmNhbGwoe30sIGFjdHVhbCkgPT09IHRydWUpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gX3Rocm93cyhzaG91bGRUaHJvdywgYmxvY2ssIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIHZhciBhY3R1YWw7XG5cbiAgaWYgKHV0aWwuaXNTdHJpbmcoZXhwZWN0ZWQpKSB7XG4gICAgbWVzc2FnZSA9IGV4cGVjdGVkO1xuICAgIGV4cGVjdGVkID0gbnVsbDtcbiAgfVxuXG4gIHRyeSB7XG4gICAgYmxvY2soKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGFjdHVhbCA9IGU7XG4gIH1cblxuICBtZXNzYWdlID0gKGV4cGVjdGVkICYmIGV4cGVjdGVkLm5hbWUgPyAnICgnICsgZXhwZWN0ZWQubmFtZSArICcpLicgOiAnLicpICtcbiAgICAgICAgICAgIChtZXNzYWdlID8gJyAnICsgbWVzc2FnZSA6ICcuJyk7XG5cbiAgaWYgKHNob3VsZFRocm93ICYmICFhY3R1YWwpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsICdNaXNzaW5nIGV4cGVjdGVkIGV4Y2VwdGlvbicgKyBtZXNzYWdlKTtcbiAgfVxuXG4gIGlmICghc2hvdWxkVGhyb3cgJiYgZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLCBleHBlY3RlZCkpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsICdHb3QgdW53YW50ZWQgZXhjZXB0aW9uJyArIG1lc3NhZ2UpO1xuICB9XG5cbiAgaWYgKChzaG91bGRUaHJvdyAmJiBhY3R1YWwgJiYgZXhwZWN0ZWQgJiZcbiAgICAgICFleHBlY3RlZEV4Y2VwdGlvbihhY3R1YWwsIGV4cGVjdGVkKSkgfHwgKCFzaG91bGRUaHJvdyAmJiBhY3R1YWwpKSB7XG4gICAgdGhyb3cgYWN0dWFsO1xuICB9XG59XG5cbi8vIDExLiBFeHBlY3RlZCB0byB0aHJvdyBhbiBlcnJvcjpcbi8vIGFzc2VydC50aHJvd3MoYmxvY2ssIEVycm9yX29wdCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQudGhyb3dzID0gZnVuY3Rpb24oYmxvY2ssIC8qb3B0aW9uYWwqL2Vycm9yLCAvKm9wdGlvbmFsKi9tZXNzYWdlKSB7XG4gIF90aHJvd3MuYXBwbHkodGhpcywgW3RydWVdLmNvbmNhdChwU2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG59O1xuXG4vLyBFWFRFTlNJT04hIFRoaXMgaXMgYW5ub3lpbmcgdG8gd3JpdGUgb3V0c2lkZSB0aGlzIG1vZHVsZS5cbmFzc2VydC5kb2VzTm90VGhyb3cgPSBmdW5jdGlvbihibG9jaywgLypvcHRpb25hbCovbWVzc2FnZSkge1xuICBfdGhyb3dzLmFwcGx5KHRoaXMsIFtmYWxzZV0uY29uY2F0KHBTbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbn07XG5cbmFzc2VydC5pZkVycm9yID0gZnVuY3Rpb24oZXJyKSB7IGlmIChlcnIpIHt0aHJvdyBlcnI7fX07IiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIXV0aWwuaXNOdW1iZXIobikgfHwgbiA8IDApXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgICh1dGlsLmlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKHV0aWwuaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmICh1dGlsLmlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmICh1dGlsLmlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCF1dGlsLmlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICB1dGlsLmlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKHV0aWwuaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmICh1dGlsLmlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIXV0aWwuaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghdXRpbC5pc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcbiAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIXV0aWwuaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKHV0aWwuaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAodXRpbC5pc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKHV0aWwuaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmICh1dGlsLmlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAodXRpbC5pc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59OyIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyBRdWVyeSBTdHJpbmcgVXRpbGl0aWVzXG5cbnZhciBRdWVyeVN0cmluZyA9IGV4cG9ydHM7XG52YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKTtcbnZhciBzaGltcyA9IHJlcXVpcmUoJ19zaGltcycpO1xudmFyIEJ1ZmZlciA9IHJlcXVpcmUoJ2J1ZmZlcicpLkJ1ZmZlcjtcblxuLy8gSWYgb2JqLmhhc093blByb3BlcnR5IGhhcyBiZWVuIG92ZXJyaWRkZW4sIHRoZW4gY2FsbGluZ1xuLy8gb2JqLmhhc093blByb3BlcnR5KHByb3ApIHdpbGwgYnJlYWsuXG4vLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9qb3llbnQvbm9kZS9pc3N1ZXMvMTcwN1xuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cblxuXG5mdW5jdGlvbiBjaGFyQ29kZShjKSB7XG4gIHJldHVybiBjLmNoYXJDb2RlQXQoMCk7XG59XG5cblxuLy8gYSBzYWZlIGZhc3QgYWx0ZXJuYXRpdmUgdG8gZGVjb2RlVVJJQ29tcG9uZW50XG5RdWVyeVN0cmluZy51bmVzY2FwZUJ1ZmZlciA9IGZ1bmN0aW9uKHMsIGRlY29kZVNwYWNlcykge1xuICB2YXIgb3V0ID0gbmV3IEJ1ZmZlcihzLmxlbmd0aCk7XG4gIHZhciBzdGF0ZSA9ICdDSEFSJzsgLy8gc3RhdGVzOiBDSEFSLCBIRVgwLCBIRVgxXG4gIHZhciBuLCBtLCBoZXhjaGFyO1xuXG4gIGZvciAodmFyIGluSW5kZXggPSAwLCBvdXRJbmRleCA9IDA7IGluSW5kZXggPD0gcy5sZW5ndGg7IGluSW5kZXgrKykge1xuICAgIHZhciBjID0gcy5jaGFyQ29kZUF0KGluSW5kZXgpO1xuICAgIHN3aXRjaCAoc3RhdGUpIHtcbiAgICAgIGNhc2UgJ0NIQVInOlxuICAgICAgICBzd2l0Y2ggKGMpIHtcbiAgICAgICAgICBjYXNlIGNoYXJDb2RlKCclJyk6XG4gICAgICAgICAgICBuID0gMDtcbiAgICAgICAgICAgIG0gPSAwO1xuICAgICAgICAgICAgc3RhdGUgPSAnSEVYMCc7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIGNoYXJDb2RlKCcrJyk6XG4gICAgICAgICAgICBpZiAoZGVjb2RlU3BhY2VzKSBjID0gY2hhckNvZGUoJyAnKTtcbiAgICAgICAgICAgIC8vIHBhc3MgdGhydVxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBvdXRbb3V0SW5kZXgrK10gPSBjO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ0hFWDAnOlxuICAgICAgICBzdGF0ZSA9ICdIRVgxJztcbiAgICAgICAgaGV4Y2hhciA9IGM7XG4gICAgICAgIGlmIChjaGFyQ29kZSgnMCcpIDw9IGMgJiYgYyA8PSBjaGFyQ29kZSgnOScpKSB7XG4gICAgICAgICAgbiA9IGMgLSBjaGFyQ29kZSgnMCcpO1xuICAgICAgICB9IGVsc2UgaWYgKGNoYXJDb2RlKCdhJykgPD0gYyAmJiBjIDw9IGNoYXJDb2RlKCdmJykpIHtcbiAgICAgICAgICBuID0gYyAtIGNoYXJDb2RlKCdhJykgKyAxMDtcbiAgICAgICAgfSBlbHNlIGlmIChjaGFyQ29kZSgnQScpIDw9IGMgJiYgYyA8PSBjaGFyQ29kZSgnRicpKSB7XG4gICAgICAgICAgbiA9IGMgLSBjaGFyQ29kZSgnQScpICsgMTA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0W291dEluZGV4KytdID0gY2hhckNvZGUoJyUnKTtcbiAgICAgICAgICBvdXRbb3V0SW5kZXgrK10gPSBjO1xuICAgICAgICAgIHN0YXRlID0gJ0NIQVInO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdIRVgxJzpcbiAgICAgICAgc3RhdGUgPSAnQ0hBUic7XG4gICAgICAgIGlmIChjaGFyQ29kZSgnMCcpIDw9IGMgJiYgYyA8PSBjaGFyQ29kZSgnOScpKSB7XG4gICAgICAgICAgbSA9IGMgLSBjaGFyQ29kZSgnMCcpO1xuICAgICAgICB9IGVsc2UgaWYgKGNoYXJDb2RlKCdhJykgPD0gYyAmJiBjIDw9IGNoYXJDb2RlKCdmJykpIHtcbiAgICAgICAgICBtID0gYyAtIGNoYXJDb2RlKCdhJykgKyAxMDtcbiAgICAgICAgfSBlbHNlIGlmIChjaGFyQ29kZSgnQScpIDw9IGMgJiYgYyA8PSBjaGFyQ29kZSgnRicpKSB7XG4gICAgICAgICAgbSA9IGMgLSBjaGFyQ29kZSgnQScpICsgMTA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3V0W291dEluZGV4KytdID0gY2hhckNvZGUoJyUnKTtcbiAgICAgICAgICBvdXRbb3V0SW5kZXgrK10gPSBoZXhjaGFyO1xuICAgICAgICAgIG91dFtvdXRJbmRleCsrXSA9IGM7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgb3V0W291dEluZGV4KytdID0gMTYgKiBuICsgbTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgLy8gVE9ETyBzdXBwb3J0IHJldHVybmluZyBhcmJpdHJhcnkgYnVmZmVycy5cblxuICByZXR1cm4gb3V0LnNsaWNlKDAsIG91dEluZGV4IC0gMSk7XG59O1xuXG5cblF1ZXJ5U3RyaW5nLnVuZXNjYXBlID0gZnVuY3Rpb24ocywgZGVjb2RlU3BhY2VzKSB7XG4gIHJldHVybiBRdWVyeVN0cmluZy51bmVzY2FwZUJ1ZmZlcihzLCBkZWNvZGVTcGFjZXMpLnRvU3RyaW5nKCk7XG59O1xuXG5cblF1ZXJ5U3RyaW5nLmVzY2FwZSA9IGZ1bmN0aW9uKHN0cikge1xuICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KHN0cik7XG59O1xuXG52YXIgc3RyaW5naWZ5UHJpbWl0aXZlID0gZnVuY3Rpb24odikge1xuICBpZiAodXRpbC5pc1N0cmluZyh2KSlcbiAgICByZXR1cm4gdjtcbiAgaWYgKHV0aWwuaXNCb29sZWFuKHYpKVxuICAgIHJldHVybiB2ID8gJ3RydWUnIDogJ2ZhbHNlJztcbiAgaWYgKHV0aWwuaXNOdW1iZXIodikpXG4gICAgcmV0dXJuIGlzRmluaXRlKHYpID8gdiA6ICcnO1xuICByZXR1cm4gJyc7XG59O1xuXG5cblF1ZXJ5U3RyaW5nLnN0cmluZ2lmeSA9IFF1ZXJ5U3RyaW5nLmVuY29kZSA9IGZ1bmN0aW9uKG9iaiwgc2VwLCBlcSwgbmFtZSkge1xuICBzZXAgPSBzZXAgfHwgJyYnO1xuICBlcSA9IGVxIHx8ICc9JztcbiAgaWYgKHV0aWwuaXNOdWxsKG9iaikpIHtcbiAgICBvYmogPSB1bmRlZmluZWQ7XG4gIH1cblxuICBpZiAodXRpbC5pc09iamVjdChvYmopKSB7XG4gICAgcmV0dXJuIHNoaW1zLm1hcChzaGltcy5rZXlzKG9iaiksIGZ1bmN0aW9uKGspIHtcbiAgICAgIHZhciBrcyA9IFF1ZXJ5U3RyaW5nLmVzY2FwZShzdHJpbmdpZnlQcmltaXRpdmUoaykpICsgZXE7XG4gICAgICBpZiAodXRpbC5pc0FycmF5KG9ialtrXSkpIHtcbiAgICAgICAgcmV0dXJuIHNoaW1zLm1hcChvYmpba10sIGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICByZXR1cm4ga3MgKyBRdWVyeVN0cmluZy5lc2NhcGUoc3RyaW5naWZ5UHJpbWl0aXZlKHYpKTtcbiAgICAgICAgfSkuam9pbihzZXApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGtzICsgUXVlcnlTdHJpbmcuZXNjYXBlKHN0cmluZ2lmeVByaW1pdGl2ZShvYmpba10pKTtcbiAgICAgIH1cbiAgICB9KS5qb2luKHNlcCk7XG5cbiAgfVxuXG4gIGlmICghbmFtZSkgcmV0dXJuICcnO1xuICByZXR1cm4gUXVlcnlTdHJpbmcuZXNjYXBlKHN0cmluZ2lmeVByaW1pdGl2ZShuYW1lKSkgKyBlcSArXG4gICAgICAgICBRdWVyeVN0cmluZy5lc2NhcGUoc3RyaW5naWZ5UHJpbWl0aXZlKG9iaikpO1xufTtcblxuLy8gUGFyc2UgYSBrZXk9dmFsIHN0cmluZy5cblF1ZXJ5U3RyaW5nLnBhcnNlID0gUXVlcnlTdHJpbmcuZGVjb2RlID0gZnVuY3Rpb24ocXMsIHNlcCwgZXEsIG9wdGlvbnMpIHtcbiAgc2VwID0gc2VwIHx8ICcmJztcbiAgZXEgPSBlcSB8fCAnPSc7XG4gIHZhciBvYmogPSB7fTtcblxuICBpZiAoIXV0aWwuaXNTdHJpbmcocXMpIHx8IHFzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICB2YXIgcmVnZXhwID0gL1xcKy9nO1xuICBxcyA9IHFzLnNwbGl0KHNlcCk7XG5cbiAgdmFyIG1heEtleXMgPSAxMDAwO1xuICBpZiAob3B0aW9ucyAmJiB1dGlsLmlzTnVtYmVyKG9wdGlvbnMubWF4S2V5cykpIHtcbiAgICBtYXhLZXlzID0gb3B0aW9ucy5tYXhLZXlzO1xuICB9XG5cbiAgdmFyIGxlbiA9IHFzLmxlbmd0aDtcbiAgLy8gbWF4S2V5cyA8PSAwIG1lYW5zIHRoYXQgd2Ugc2hvdWxkIG5vdCBsaW1pdCBrZXlzIGNvdW50XG4gIGlmIChtYXhLZXlzID4gMCAmJiBsZW4gPiBtYXhLZXlzKSB7XG4gICAgbGVuID0gbWF4S2V5cztcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICB2YXIgeCA9IHFzW2ldLnJlcGxhY2UocmVnZXhwLCAnJTIwJyksXG4gICAgICAgIGlkeCA9IHguaW5kZXhPZihlcSksXG4gICAgICAgIGtzdHIsIHZzdHIsIGssIHY7XG5cbiAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgIGtzdHIgPSB4LnN1YnN0cigwLCBpZHgpO1xuICAgICAgdnN0ciA9IHguc3Vic3RyKGlkeCArIDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBrc3RyID0geDtcbiAgICAgIHZzdHIgPSAnJztcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgayA9IGRlY29kZVVSSUNvbXBvbmVudChrc3RyKTtcbiAgICAgIHYgPSBkZWNvZGVVUklDb21wb25lbnQodnN0cik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgayA9IFF1ZXJ5U3RyaW5nLnVuZXNjYXBlKGtzdHIsIHRydWUpO1xuICAgICAgdiA9IFF1ZXJ5U3RyaW5nLnVuZXNjYXBlKHZzdHIsIHRydWUpO1xuICAgIH1cblxuICAgIGlmICghaGFzT3duUHJvcGVydHkob2JqLCBrKSkge1xuICAgICAgb2JqW2tdID0gdjtcbiAgICB9IGVsc2UgaWYgKHV0aWwuaXNBcnJheShvYmpba10pKSB7XG4gICAgICBvYmpba10ucHVzaCh2KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqW2tdID0gW29ialtrXSwgdl07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9iajtcbn07IiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBwdW55Y29kZSA9IHsgZW5jb2RlIDogZnVuY3Rpb24gKHMpIHsgcmV0dXJuIHMgfSB9O1xudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG52YXIgc2hpbXMgPSByZXF1aXJlKCdfc2hpbXMnKTtcblxuZXhwb3J0cy5wYXJzZSA9IHVybFBhcnNlO1xuZXhwb3J0cy5yZXNvbHZlID0gdXJsUmVzb2x2ZTtcbmV4cG9ydHMucmVzb2x2ZU9iamVjdCA9IHVybFJlc29sdmVPYmplY3Q7XG5leHBvcnRzLmZvcm1hdCA9IHVybEZvcm1hdDtcblxuZXhwb3J0cy5VcmwgPSBVcmw7XG5cbmZ1bmN0aW9uIFVybCgpIHtcbiAgdGhpcy5wcm90b2NvbCA9IG51bGw7XG4gIHRoaXMuc2xhc2hlcyA9IG51bGw7XG4gIHRoaXMuYXV0aCA9IG51bGw7XG4gIHRoaXMuaG9zdCA9IG51bGw7XG4gIHRoaXMucG9ydCA9IG51bGw7XG4gIHRoaXMuaG9zdG5hbWUgPSBudWxsO1xuICB0aGlzLmhhc2ggPSBudWxsO1xuICB0aGlzLnNlYXJjaCA9IG51bGw7XG4gIHRoaXMucXVlcnkgPSBudWxsO1xuICB0aGlzLnBhdGhuYW1lID0gbnVsbDtcbiAgdGhpcy5wYXRoID0gbnVsbDtcbiAgdGhpcy5ocmVmID0gbnVsbDtcbn1cblxuLy8gUmVmZXJlbmNlOiBSRkMgMzk4NiwgUkZDIDE4MDgsIFJGQyAyMzk2XG5cbi8vIGRlZmluZSB0aGVzZSBoZXJlIHNvIGF0IGxlYXN0IHRoZXkgb25seSBoYXZlIHRvIGJlXG4vLyBjb21waWxlZCBvbmNlIG9uIHRoZSBmaXJzdCBtb2R1bGUgbG9hZC5cbnZhciBwcm90b2NvbFBhdHRlcm4gPSAvXihbYS16MC05ListXSs6KS9pLFxuICAgIHBvcnRQYXR0ZXJuID0gLzpbMC05XSokLyxcblxuICAgIC8vIFJGQyAyMzk2OiBjaGFyYWN0ZXJzIHJlc2VydmVkIGZvciBkZWxpbWl0aW5nIFVSTHMuXG4gICAgLy8gV2UgYWN0dWFsbHkganVzdCBhdXRvLWVzY2FwZSB0aGVzZS5cbiAgICBkZWxpbXMgPSBbJzwnLCAnPicsICdcIicsICdgJywgJyAnLCAnXFxyJywgJ1xcbicsICdcXHQnXSxcblxuICAgIC8vIFJGQyAyMzk2OiBjaGFyYWN0ZXJzIG5vdCBhbGxvd2VkIGZvciB2YXJpb3VzIHJlYXNvbnMuXG4gICAgdW53aXNlID0gWyd7JywgJ30nLCAnfCcsICdcXFxcJywgJ14nLCAnYCddLmNvbmNhdChkZWxpbXMpLFxuXG4gICAgLy8gQWxsb3dlZCBieSBSRkNzLCBidXQgY2F1c2Ugb2YgWFNTIGF0dGFja3MuICBBbHdheXMgZXNjYXBlIHRoZXNlLlxuICAgIGF1dG9Fc2NhcGUgPSBbJ1xcJyddLmNvbmNhdCh1bndpc2UpLFxuICAgIC8vIENoYXJhY3RlcnMgdGhhdCBhcmUgbmV2ZXIgZXZlciBhbGxvd2VkIGluIGEgaG9zdG5hbWUuXG4gICAgLy8gTm90ZSB0aGF0IGFueSBpbnZhbGlkIGNoYXJzIGFyZSBhbHNvIGhhbmRsZWQsIGJ1dCB0aGVzZVxuICAgIC8vIGFyZSB0aGUgb25lcyB0aGF0IGFyZSAqZXhwZWN0ZWQqIHRvIGJlIHNlZW4sIHNvIHdlIGZhc3QtcGF0aFxuICAgIC8vIHRoZW0uXG4gICAgbm9uSG9zdENoYXJzID0gWyclJywgJy8nLCAnPycsICc7JywgJyMnXS5jb25jYXQoYXV0b0VzY2FwZSksXG4gICAgaG9zdEVuZGluZ0NoYXJzID0gWycvJywgJz8nLCAnIyddLFxuICAgIGhvc3RuYW1lTWF4TGVuID0gMjU1LFxuICAgIGhvc3RuYW1lUGFydFBhdHRlcm4gPSAvXlthLXowLTlBLVpfLV17MCw2M30kLyxcbiAgICBob3N0bmFtZVBhcnRTdGFydCA9IC9eKFthLXowLTlBLVpfLV17MCw2M30pKC4qKSQvLFxuICAgIC8vIHByb3RvY29scyB0aGF0IGNhbiBhbGxvdyBcInVuc2FmZVwiIGFuZCBcInVud2lzZVwiIGNoYXJzLlxuICAgIHVuc2FmZVByb3RvY29sID0ge1xuICAgICAgJ2phdmFzY3JpcHQnOiB0cnVlLFxuICAgICAgJ2phdmFzY3JpcHQ6JzogdHJ1ZVxuICAgIH0sXG4gICAgLy8gcHJvdG9jb2xzIHRoYXQgbmV2ZXIgaGF2ZSBhIGhvc3RuYW1lLlxuICAgIGhvc3RsZXNzUHJvdG9jb2wgPSB7XG4gICAgICAnamF2YXNjcmlwdCc6IHRydWUsXG4gICAgICAnamF2YXNjcmlwdDonOiB0cnVlXG4gICAgfSxcbiAgICAvLyBwcm90b2NvbHMgdGhhdCBhbHdheXMgY29udGFpbiBhIC8vIGJpdC5cbiAgICBzbGFzaGVkUHJvdG9jb2wgPSB7XG4gICAgICAnaHR0cCc6IHRydWUsXG4gICAgICAnaHR0cHMnOiB0cnVlLFxuICAgICAgJ2Z0cCc6IHRydWUsXG4gICAgICAnZ29waGVyJzogdHJ1ZSxcbiAgICAgICdmaWxlJzogdHJ1ZSxcbiAgICAgICdodHRwOic6IHRydWUsXG4gICAgICAnaHR0cHM6JzogdHJ1ZSxcbiAgICAgICdmdHA6JzogdHJ1ZSxcbiAgICAgICdnb3BoZXI6JzogdHJ1ZSxcbiAgICAgICdmaWxlOic6IHRydWVcbiAgICB9LFxuICAgIHF1ZXJ5c3RyaW5nID0gcmVxdWlyZSgncXVlcnlzdHJpbmcnKTtcblxuZnVuY3Rpb24gdXJsUGFyc2UodXJsLCBwYXJzZVF1ZXJ5U3RyaW5nLCBzbGFzaGVzRGVub3RlSG9zdCkge1xuICBpZiAodXJsICYmIHV0aWwuaXNPYmplY3QodXJsKSAmJiB1cmwgaW5zdGFuY2VvZiBVcmwpIHJldHVybiB1cmw7XG5cbiAgdmFyIHUgPSBuZXcgVXJsO1xuICB1LnBhcnNlKHVybCwgcGFyc2VRdWVyeVN0cmluZywgc2xhc2hlc0Rlbm90ZUhvc3QpO1xuICByZXR1cm4gdTtcbn1cblxuVXJsLnByb3RvdHlwZS5wYXJzZSA9IGZ1bmN0aW9uKHVybCwgcGFyc2VRdWVyeVN0cmluZywgc2xhc2hlc0Rlbm90ZUhvc3QpIHtcbiAgaWYgKCF1dGlsLmlzU3RyaW5nKHVybCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUGFyYW1ldGVyICd1cmwnIG11c3QgYmUgYSBzdHJpbmcsIG5vdCBcIiArIHR5cGVvZiB1cmwpO1xuICB9XG5cbiAgdmFyIHJlc3QgPSB1cmw7XG5cbiAgLy8gdHJpbSBiZWZvcmUgcHJvY2VlZGluZy5cbiAgLy8gVGhpcyBpcyB0byBzdXBwb3J0IHBhcnNlIHN0dWZmIGxpa2UgXCIgIGh0dHA6Ly9mb28uY29tICBcXG5cIlxuICByZXN0ID0gc2hpbXMudHJpbShyZXN0KTtcblxuICB2YXIgcHJvdG8gPSBwcm90b2NvbFBhdHRlcm4uZXhlYyhyZXN0KTtcbiAgaWYgKHByb3RvKSB7XG4gICAgcHJvdG8gPSBwcm90b1swXTtcbiAgICB2YXIgbG93ZXJQcm90byA9IHByb3RvLnRvTG93ZXJDYXNlKCk7XG4gICAgdGhpcy5wcm90b2NvbCA9IGxvd2VyUHJvdG87XG4gICAgcmVzdCA9IHJlc3Quc3Vic3RyKHByb3RvLmxlbmd0aCk7XG4gIH1cblxuICAvLyBmaWd1cmUgb3V0IGlmIGl0J3MgZ290IGEgaG9zdFxuICAvLyB1c2VyQHNlcnZlciBpcyAqYWx3YXlzKiBpbnRlcnByZXRlZCBhcyBhIGhvc3RuYW1lLCBhbmQgdXJsXG4gIC8vIHJlc29sdXRpb24gd2lsbCB0cmVhdCAvL2Zvby9iYXIgYXMgaG9zdD1mb28scGF0aD1iYXIgYmVjYXVzZSB0aGF0J3NcbiAgLy8gaG93IHRoZSBicm93c2VyIHJlc29sdmVzIHJlbGF0aXZlIFVSTHMuXG4gIGlmIChzbGFzaGVzRGVub3RlSG9zdCB8fCBwcm90byB8fCByZXN0Lm1hdGNoKC9eXFwvXFwvW15AXFwvXStAW15AXFwvXSsvKSkge1xuICAgIHZhciBzbGFzaGVzID0gcmVzdC5zdWJzdHIoMCwgMikgPT09ICcvLyc7XG4gICAgaWYgKHNsYXNoZXMgJiYgIShwcm90byAmJiBob3N0bGVzc1Byb3RvY29sW3Byb3RvXSkpIHtcbiAgICAgIHJlc3QgPSByZXN0LnN1YnN0cigyKTtcbiAgICAgIHRoaXMuc2xhc2hlcyA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFob3N0bGVzc1Byb3RvY29sW3Byb3RvXSAmJlxuICAgICAgKHNsYXNoZXMgfHwgKHByb3RvICYmICFzbGFzaGVkUHJvdG9jb2xbcHJvdG9dKSkpIHtcblxuICAgIC8vIHRoZXJlJ3MgYSBob3N0bmFtZS5cbiAgICAvLyB0aGUgZmlyc3QgaW5zdGFuY2Ugb2YgLywgPywgOywgb3IgIyBlbmRzIHRoZSBob3N0LlxuICAgIC8vXG4gICAgLy8gSWYgdGhlcmUgaXMgYW4gQCBpbiB0aGUgaG9zdG5hbWUsIHRoZW4gbm9uLWhvc3QgY2hhcnMgKmFyZSogYWxsb3dlZFxuICAgIC8vIHRvIHRoZSBsZWZ0IG9mIHRoZSBsYXN0IEAgc2lnbiwgdW5sZXNzIHNvbWUgaG9zdC1lbmRpbmcgY2hhcmFjdGVyXG4gICAgLy8gY29tZXMgKmJlZm9yZSogdGhlIEAtc2lnbi5cbiAgICAvLyBVUkxzIGFyZSBvYm5veGlvdXMuXG4gICAgLy9cbiAgICAvLyBleDpcbiAgICAvLyBodHRwOi8vYUBiQGMvID0+IHVzZXI6YUBiIGhvc3Q6Y1xuICAgIC8vIGh0dHA6Ly9hQGI/QGMgPT4gdXNlcjphIGhvc3Q6YyBwYXRoOi8/QGNcblxuICAgIC8vIHYwLjEyIFRPRE8oaXNhYWNzKTogVGhpcyBpcyBub3QgcXVpdGUgaG93IENocm9tZSBkb2VzIHRoaW5ncy5cbiAgICAvLyBSZXZpZXcgb3VyIHRlc3QgY2FzZSBhZ2FpbnN0IGJyb3dzZXJzIG1vcmUgY29tcHJlaGVuc2l2ZWx5LlxuXG4gICAgLy8gZmluZCB0aGUgZmlyc3QgaW5zdGFuY2Ugb2YgYW55IGhvc3RFbmRpbmdDaGFyc1xuICAgIHZhciBob3N0RW5kID0gLTE7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBob3N0RW5kaW5nQ2hhcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBoZWMgPSByZXN0LmluZGV4T2YoaG9zdEVuZGluZ0NoYXJzW2ldKTtcbiAgICAgIGlmIChoZWMgIT09IC0xICYmIChob3N0RW5kID09PSAtMSB8fCBoZWMgPCBob3N0RW5kKSlcbiAgICAgICAgaG9zdEVuZCA9IGhlYztcbiAgICB9XG5cbiAgICAvLyBhdCB0aGlzIHBvaW50LCBlaXRoZXIgd2UgaGF2ZSBhbiBleHBsaWNpdCBwb2ludCB3aGVyZSB0aGVcbiAgICAvLyBhdXRoIHBvcnRpb24gY2Fubm90IGdvIHBhc3QsIG9yIHRoZSBsYXN0IEAgY2hhciBpcyB0aGUgZGVjaWRlci5cbiAgICB2YXIgYXV0aCwgYXRTaWduO1xuICAgIGlmIChob3N0RW5kID09PSAtMSkge1xuICAgICAgLy8gYXRTaWduIGNhbiBiZSBhbnl3aGVyZS5cbiAgICAgIGF0U2lnbiA9IHJlc3QubGFzdEluZGV4T2YoJ0AnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gYXRTaWduIG11c3QgYmUgaW4gYXV0aCBwb3J0aW9uLlxuICAgICAgLy8gaHR0cDovL2FAYi9jQGQgPT4gaG9zdDpiIGF1dGg6YSBwYXRoOi9jQGRcbiAgICAgIGF0U2lnbiA9IHJlc3QubGFzdEluZGV4T2YoJ0AnLCBob3N0RW5kKTtcbiAgICB9XG5cbiAgICAvLyBOb3cgd2UgaGF2ZSBhIHBvcnRpb24gd2hpY2ggaXMgZGVmaW5pdGVseSB0aGUgYXV0aC5cbiAgICAvLyBQdWxsIHRoYXQgb2ZmLlxuICAgIGlmIChhdFNpZ24gIT09IC0xKSB7XG4gICAgICBhdXRoID0gcmVzdC5zbGljZSgwLCBhdFNpZ24pO1xuICAgICAgcmVzdCA9IHJlc3Quc2xpY2UoYXRTaWduICsgMSk7XG4gICAgICB0aGlzLmF1dGggPSBkZWNvZGVVUklDb21wb25lbnQoYXV0aCk7XG4gICAgfVxuXG4gICAgLy8gdGhlIGhvc3QgaXMgdGhlIHJlbWFpbmluZyB0byB0aGUgbGVmdCBvZiB0aGUgZmlyc3Qgbm9uLWhvc3QgY2hhclxuICAgIGhvc3RFbmQgPSAtMTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vbkhvc3RDaGFycy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGhlYyA9IHJlc3QuaW5kZXhPZihub25Ib3N0Q2hhcnNbaV0pO1xuICAgICAgaWYgKGhlYyAhPT0gLTEgJiYgKGhvc3RFbmQgPT09IC0xIHx8IGhlYyA8IGhvc3RFbmQpKVxuICAgICAgICBob3N0RW5kID0gaGVjO1xuICAgIH1cbiAgICAvLyBpZiB3ZSBzdGlsbCBoYXZlIG5vdCBoaXQgaXQsIHRoZW4gdGhlIGVudGlyZSB0aGluZyBpcyBhIGhvc3QuXG4gICAgaWYgKGhvc3RFbmQgPT09IC0xKVxuICAgICAgaG9zdEVuZCA9IHJlc3QubGVuZ3RoO1xuXG4gICAgdGhpcy5ob3N0ID0gcmVzdC5zbGljZSgwLCBob3N0RW5kKTtcbiAgICByZXN0ID0gcmVzdC5zbGljZShob3N0RW5kKTtcblxuICAgIC8vIHB1bGwgb3V0IHBvcnQuXG4gICAgdGhpcy5wYXJzZUhvc3QoKTtcblxuICAgIC8vIHdlJ3ZlIGluZGljYXRlZCB0aGF0IHRoZXJlIGlzIGEgaG9zdG5hbWUsXG4gICAgLy8gc28gZXZlbiBpZiBpdCdzIGVtcHR5LCBpdCBoYXMgdG8gYmUgcHJlc2VudC5cbiAgICB0aGlzLmhvc3RuYW1lID0gdGhpcy5ob3N0bmFtZSB8fCAnJztcblxuICAgIC8vIGlmIGhvc3RuYW1lIGJlZ2lucyB3aXRoIFsgYW5kIGVuZHMgd2l0aCBdXG4gICAgLy8gYXNzdW1lIHRoYXQgaXQncyBhbiBJUHY2IGFkZHJlc3MuXG4gICAgdmFyIGlwdjZIb3N0bmFtZSA9IHRoaXMuaG9zdG5hbWVbMF0gPT09ICdbJyAmJlxuICAgICAgICB0aGlzLmhvc3RuYW1lW3RoaXMuaG9zdG5hbWUubGVuZ3RoIC0gMV0gPT09ICddJztcblxuICAgIC8vIHZhbGlkYXRlIGEgbGl0dGxlLlxuICAgIGlmICghaXB2Nkhvc3RuYW1lKSB7XG4gICAgICB2YXIgaG9zdHBhcnRzID0gdGhpcy5ob3N0bmFtZS5zcGxpdCgvXFwuLyk7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGhvc3RwYXJ0cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdmFyIHBhcnQgPSBob3N0cGFydHNbaV07XG4gICAgICAgIGlmICghcGFydCkgY29udGludWU7XG4gICAgICAgIGlmICghcGFydC5tYXRjaChob3N0bmFtZVBhcnRQYXR0ZXJuKSkge1xuICAgICAgICAgIHZhciBuZXdwYXJ0ID0gJyc7XG4gICAgICAgICAgZm9yICh2YXIgaiA9IDAsIGsgPSBwYXJ0Lmxlbmd0aDsgaiA8IGs7IGorKykge1xuICAgICAgICAgICAgaWYgKHBhcnQuY2hhckNvZGVBdChqKSA+IDEyNykge1xuICAgICAgICAgICAgICAvLyB3ZSByZXBsYWNlIG5vbi1BU0NJSSBjaGFyIHdpdGggYSB0ZW1wb3JhcnkgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgLy8gd2UgbmVlZCB0aGlzIHRvIG1ha2Ugc3VyZSBzaXplIG9mIGhvc3RuYW1lIGlzIG5vdFxuICAgICAgICAgICAgICAvLyBicm9rZW4gYnkgcmVwbGFjaW5nIG5vbi1BU0NJSSBieSBub3RoaW5nXG4gICAgICAgICAgICAgIG5ld3BhcnQgKz0gJ3gnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbmV3cGFydCArPSBwYXJ0W2pdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyB3ZSB0ZXN0IGFnYWluIHdpdGggQVNDSUkgY2hhciBvbmx5XG4gICAgICAgICAgaWYgKCFuZXdwYXJ0Lm1hdGNoKGhvc3RuYW1lUGFydFBhdHRlcm4pKSB7XG4gICAgICAgICAgICB2YXIgdmFsaWRQYXJ0cyA9IGhvc3RwYXJ0cy5zbGljZSgwLCBpKTtcbiAgICAgICAgICAgIHZhciBub3RIb3N0ID0gaG9zdHBhcnRzLnNsaWNlKGkgKyAxKTtcbiAgICAgICAgICAgIHZhciBiaXQgPSBwYXJ0Lm1hdGNoKGhvc3RuYW1lUGFydFN0YXJ0KTtcbiAgICAgICAgICAgIGlmIChiaXQpIHtcbiAgICAgICAgICAgICAgdmFsaWRQYXJ0cy5wdXNoKGJpdFsxXSk7XG4gICAgICAgICAgICAgIG5vdEhvc3QudW5zaGlmdChiaXRbMl0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5vdEhvc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHJlc3QgPSAnLycgKyBub3RIb3N0LmpvaW4oJy4nKSArIHJlc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmhvc3RuYW1lID0gdmFsaWRQYXJ0cy5qb2luKCcuJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5ob3N0bmFtZS5sZW5ndGggPiBob3N0bmFtZU1heExlbikge1xuICAgICAgdGhpcy5ob3N0bmFtZSA9ICcnO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBob3N0bmFtZXMgYXJlIGFsd2F5cyBsb3dlciBjYXNlLlxuICAgICAgdGhpcy5ob3N0bmFtZSA9IHRoaXMuaG9zdG5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICB9XG5cbiAgICBpZiAoIWlwdjZIb3N0bmFtZSkge1xuICAgICAgLy8gSUROQSBTdXBwb3J0OiBSZXR1cm5zIGEgcHVueSBjb2RlZCByZXByZXNlbnRhdGlvbiBvZiBcImRvbWFpblwiLlxuICAgICAgLy8gSXQgb25seSBjb252ZXJ0cyB0aGUgcGFydCBvZiB0aGUgZG9tYWluIG5hbWUgdGhhdFxuICAgICAgLy8gaGFzIG5vbiBBU0NJSSBjaGFyYWN0ZXJzLiBJLmUuIGl0IGRvc2VudCBtYXR0ZXIgaWZcbiAgICAgIC8vIHlvdSBjYWxsIGl0IHdpdGggYSBkb21haW4gdGhhdCBhbHJlYWR5IGlzIGluIEFTQ0lJLlxuICAgICAgdmFyIGRvbWFpbkFycmF5ID0gdGhpcy5ob3N0bmFtZS5zcGxpdCgnLicpO1xuICAgICAgdmFyIG5ld091dCA9IFtdO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkb21haW5BcnJheS5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgcyA9IGRvbWFpbkFycmF5W2ldO1xuICAgICAgICBuZXdPdXQucHVzaChzLm1hdGNoKC9bXkEtWmEtejAtOV8tXS8pID9cbiAgICAgICAgICAgICd4bi0tJyArIHB1bnljb2RlLmVuY29kZShzKSA6IHMpO1xuICAgICAgfVxuICAgICAgdGhpcy5ob3N0bmFtZSA9IG5ld091dC5qb2luKCcuJyk7XG4gICAgfVxuXG4gICAgdmFyIHAgPSB0aGlzLnBvcnQgPyAnOicgKyB0aGlzLnBvcnQgOiAnJztcbiAgICB2YXIgaCA9IHRoaXMuaG9zdG5hbWUgfHwgJyc7XG4gICAgdGhpcy5ob3N0ID0gaCArIHA7XG4gICAgdGhpcy5ocmVmICs9IHRoaXMuaG9zdDtcblxuICAgIC8vIHN0cmlwIFsgYW5kIF0gZnJvbSB0aGUgaG9zdG5hbWVcbiAgICAvLyB0aGUgaG9zdCBmaWVsZCBzdGlsbCByZXRhaW5zIHRoZW0sIHRob3VnaFxuICAgIGlmIChpcHY2SG9zdG5hbWUpIHtcbiAgICAgIHRoaXMuaG9zdG5hbWUgPSB0aGlzLmhvc3RuYW1lLnN1YnN0cigxLCB0aGlzLmhvc3RuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgaWYgKHJlc3RbMF0gIT09ICcvJykge1xuICAgICAgICByZXN0ID0gJy8nICsgcmVzdDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBub3cgcmVzdCBpcyBzZXQgdG8gdGhlIHBvc3QtaG9zdCBzdHVmZi5cbiAgLy8gY2hvcCBvZmYgYW55IGRlbGltIGNoYXJzLlxuICBpZiAoIXVuc2FmZVByb3RvY29sW2xvd2VyUHJvdG9dKSB7XG5cbiAgICAvLyBGaXJzdCwgbWFrZSAxMDAlIHN1cmUgdGhhdCBhbnkgXCJhdXRvRXNjYXBlXCIgY2hhcnMgZ2V0XG4gICAgLy8gZXNjYXBlZCwgZXZlbiBpZiBlbmNvZGVVUklDb21wb25lbnQgZG9lc24ndCB0aGluayB0aGV5XG4gICAgLy8gbmVlZCB0byBiZS5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGF1dG9Fc2NhcGUubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB2YXIgYWUgPSBhdXRvRXNjYXBlW2ldO1xuICAgICAgdmFyIGVzYyA9IGVuY29kZVVSSUNvbXBvbmVudChhZSk7XG4gICAgICBpZiAoZXNjID09PSBhZSkge1xuICAgICAgICBlc2MgPSBlc2NhcGUoYWUpO1xuICAgICAgfVxuICAgICAgcmVzdCA9IHJlc3Quc3BsaXQoYWUpLmpvaW4oZXNjKTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIGNob3Agb2ZmIGZyb20gdGhlIHRhaWwgZmlyc3QuXG4gIHZhciBoYXNoID0gcmVzdC5pbmRleE9mKCcjJyk7XG4gIGlmIChoYXNoICE9PSAtMSkge1xuICAgIC8vIGdvdCBhIGZyYWdtZW50IHN0cmluZy5cbiAgICB0aGlzLmhhc2ggPSByZXN0LnN1YnN0cihoYXNoKTtcbiAgICByZXN0ID0gcmVzdC5zbGljZSgwLCBoYXNoKTtcbiAgfVxuICB2YXIgcW0gPSByZXN0LmluZGV4T2YoJz8nKTtcbiAgaWYgKHFtICE9PSAtMSkge1xuICAgIHRoaXMuc2VhcmNoID0gcmVzdC5zdWJzdHIocW0pO1xuICAgIHRoaXMucXVlcnkgPSByZXN0LnN1YnN0cihxbSArIDEpO1xuICAgIGlmIChwYXJzZVF1ZXJ5U3RyaW5nKSB7XG4gICAgICB0aGlzLnF1ZXJ5ID0gcXVlcnlzdHJpbmcucGFyc2UodGhpcy5xdWVyeSk7XG4gICAgfVxuICAgIHJlc3QgPSByZXN0LnNsaWNlKDAsIHFtKTtcbiAgfSBlbHNlIGlmIChwYXJzZVF1ZXJ5U3RyaW5nKSB7XG4gICAgLy8gbm8gcXVlcnkgc3RyaW5nLCBidXQgcGFyc2VRdWVyeVN0cmluZyBzdGlsbCByZXF1ZXN0ZWRcbiAgICB0aGlzLnNlYXJjaCA9ICcnO1xuICAgIHRoaXMucXVlcnkgPSB7fTtcbiAgfVxuICBpZiAocmVzdCkgdGhpcy5wYXRobmFtZSA9IHJlc3Q7XG4gIGlmIChzbGFzaGVkUHJvdG9jb2xbbG93ZXJQcm90b10gJiZcbiAgICAgIHRoaXMuaG9zdG5hbWUgJiYgIXRoaXMucGF0aG5hbWUpIHtcbiAgICB0aGlzLnBhdGhuYW1lID0gJy8nO1xuICB9XG5cbiAgLy90byBzdXBwb3J0IGh0dHAucmVxdWVzdFxuICBpZiAodGhpcy5wYXRobmFtZSB8fCB0aGlzLnNlYXJjaCkge1xuICAgIHZhciBwID0gdGhpcy5wYXRobmFtZSB8fCAnJztcbiAgICB2YXIgcyA9IHRoaXMuc2VhcmNoIHx8ICcnO1xuICAgIHRoaXMucGF0aCA9IHAgKyBzO1xuICB9XG5cbiAgLy8gZmluYWxseSwgcmVjb25zdHJ1Y3QgdGhlIGhyZWYgYmFzZWQgb24gd2hhdCBoYXMgYmVlbiB2YWxpZGF0ZWQuXG4gIHRoaXMuaHJlZiA9IHRoaXMuZm9ybWF0KCk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZm9ybWF0IGEgcGFyc2VkIG9iamVjdCBpbnRvIGEgdXJsIHN0cmluZ1xuZnVuY3Rpb24gdXJsRm9ybWF0KG9iaikge1xuICAvLyBlbnN1cmUgaXQncyBhbiBvYmplY3QsIGFuZCBub3QgYSBzdHJpbmcgdXJsLlxuICAvLyBJZiBpdCdzIGFuIG9iaiwgdGhpcyBpcyBhIG5vLW9wLlxuICAvLyB0aGlzIHdheSwgeW91IGNhbiBjYWxsIHVybF9mb3JtYXQoKSBvbiBzdHJpbmdzXG4gIC8vIHRvIGNsZWFuIHVwIHBvdGVudGlhbGx5IHdvbmt5IHVybHMuXG4gIGlmICh1dGlsLmlzU3RyaW5nKG9iaikpIG9iaiA9IHVybFBhcnNlKG9iaik7XG4gIGlmICghKG9iaiBpbnN0YW5jZW9mIFVybCkpIHJldHVybiBVcmwucHJvdG90eXBlLmZvcm1hdC5jYWxsKG9iaik7XG4gIHJldHVybiBvYmouZm9ybWF0KCk7XG59XG5cblVybC5wcm90b3R5cGUuZm9ybWF0ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBhdXRoID0gdGhpcy5hdXRoIHx8ICcnO1xuICBpZiAoYXV0aCkge1xuICAgIGF1dGggPSBlbmNvZGVVUklDb21wb25lbnQoYXV0aCk7XG4gICAgYXV0aCA9IGF1dGgucmVwbGFjZSgvJTNBL2ksICc6Jyk7XG4gICAgYXV0aCArPSAnQCc7XG4gIH1cblxuICB2YXIgcHJvdG9jb2wgPSB0aGlzLnByb3RvY29sIHx8ICcnLFxuICAgICAgcGF0aG5hbWUgPSB0aGlzLnBhdGhuYW1lIHx8ICcnLFxuICAgICAgaGFzaCA9IHRoaXMuaGFzaCB8fCAnJyxcbiAgICAgIGhvc3QgPSBmYWxzZSxcbiAgICAgIHF1ZXJ5ID0gJyc7XG5cbiAgaWYgKHRoaXMuaG9zdCkge1xuICAgIGhvc3QgPSBhdXRoICsgdGhpcy5ob3N0O1xuICB9IGVsc2UgaWYgKHRoaXMuaG9zdG5hbWUpIHtcbiAgICBob3N0ID0gYXV0aCArICh0aGlzLmhvc3RuYW1lLmluZGV4T2YoJzonKSA9PT0gLTEgP1xuICAgICAgICB0aGlzLmhvc3RuYW1lIDpcbiAgICAgICAgJ1snICsgdGhpcy5ob3N0bmFtZSArICddJyk7XG4gICAgaWYgKHRoaXMucG9ydCkge1xuICAgICAgaG9zdCArPSAnOicgKyB0aGlzLnBvcnQ7XG4gICAgfVxuICB9XG5cbiAgaWYgKHRoaXMucXVlcnkgJiZcbiAgICAgIHV0aWwuaXNPYmplY3QodGhpcy5xdWVyeSkgJiZcbiAgICAgIHNoaW1zLmtleXModGhpcy5xdWVyeSkubGVuZ3RoKSB7XG4gICAgcXVlcnkgPSBxdWVyeXN0cmluZy5zdHJpbmdpZnkodGhpcy5xdWVyeSk7XG4gIH1cblxuICB2YXIgc2VhcmNoID0gdGhpcy5zZWFyY2ggfHwgKHF1ZXJ5ICYmICgnPycgKyBxdWVyeSkpIHx8ICcnO1xuXG4gIGlmIChwcm90b2NvbCAmJiBzaGltcy5zdWJzdHIocHJvdG9jb2wsIC0xKSAhPT0gJzonKSBwcm90b2NvbCArPSAnOic7XG5cbiAgLy8gb25seSB0aGUgc2xhc2hlZFByb3RvY29scyBnZXQgdGhlIC8vLiAgTm90IG1haWx0bzosIHhtcHA6LCBldGMuXG4gIC8vIHVubGVzcyB0aGV5IGhhZCB0aGVtIHRvIGJlZ2luIHdpdGguXG4gIGlmICh0aGlzLnNsYXNoZXMgfHxcbiAgICAgICghcHJvdG9jb2wgfHwgc2xhc2hlZFByb3RvY29sW3Byb3RvY29sXSkgJiYgaG9zdCAhPT0gZmFsc2UpIHtcbiAgICBob3N0ID0gJy8vJyArIChob3N0IHx8ICcnKTtcbiAgICBpZiAocGF0aG5hbWUgJiYgcGF0aG5hbWUuY2hhckF0KDApICE9PSAnLycpIHBhdGhuYW1lID0gJy8nICsgcGF0aG5hbWU7XG4gIH0gZWxzZSBpZiAoIWhvc3QpIHtcbiAgICBob3N0ID0gJyc7XG4gIH1cblxuICBpZiAoaGFzaCAmJiBoYXNoLmNoYXJBdCgwKSAhPT0gJyMnKSBoYXNoID0gJyMnICsgaGFzaDtcbiAgaWYgKHNlYXJjaCAmJiBzZWFyY2guY2hhckF0KDApICE9PSAnPycpIHNlYXJjaCA9ICc/JyArIHNlYXJjaDtcblxuICBwYXRobmFtZSA9IHBhdGhuYW1lLnJlcGxhY2UoL1s/I10vZywgZnVuY3Rpb24obWF0Y2gpIHtcbiAgICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KG1hdGNoKTtcbiAgfSk7XG4gIHNlYXJjaCA9IHNlYXJjaC5yZXBsYWNlKCcjJywgJyUyMycpO1xuXG4gIHJldHVybiBwcm90b2NvbCArIGhvc3QgKyBwYXRobmFtZSArIHNlYXJjaCArIGhhc2g7XG59O1xuXG5mdW5jdGlvbiB1cmxSZXNvbHZlKHNvdXJjZSwgcmVsYXRpdmUpIHtcbiAgcmV0dXJuIHVybFBhcnNlKHNvdXJjZSwgZmFsc2UsIHRydWUpLnJlc29sdmUocmVsYXRpdmUpO1xufVxuXG5VcmwucHJvdG90eXBlLnJlc29sdmUgPSBmdW5jdGlvbihyZWxhdGl2ZSkge1xuICByZXR1cm4gdGhpcy5yZXNvbHZlT2JqZWN0KHVybFBhcnNlKHJlbGF0aXZlLCBmYWxzZSwgdHJ1ZSkpLmZvcm1hdCgpO1xufTtcblxuZnVuY3Rpb24gdXJsUmVzb2x2ZU9iamVjdChzb3VyY2UsIHJlbGF0aXZlKSB7XG4gIGlmICghc291cmNlKSByZXR1cm4gcmVsYXRpdmU7XG4gIHJldHVybiB1cmxQYXJzZShzb3VyY2UsIGZhbHNlLCB0cnVlKS5yZXNvbHZlT2JqZWN0KHJlbGF0aXZlKTtcbn1cblxuVXJsLnByb3RvdHlwZS5yZXNvbHZlT2JqZWN0ID0gZnVuY3Rpb24ocmVsYXRpdmUpIHtcbiAgaWYgKHV0aWwuaXNTdHJpbmcocmVsYXRpdmUpKSB7XG4gICAgdmFyIHJlbCA9IG5ldyBVcmwoKTtcbiAgICByZWwucGFyc2UocmVsYXRpdmUsIGZhbHNlLCB0cnVlKTtcbiAgICByZWxhdGl2ZSA9IHJlbDtcbiAgfVxuXG4gIHZhciByZXN1bHQgPSBuZXcgVXJsKCk7XG4gIHNoaW1zLmZvckVhY2goc2hpbXMua2V5cyh0aGlzKSwgZnVuY3Rpb24oaykge1xuICAgIHJlc3VsdFtrXSA9IHRoaXNba107XG4gIH0sIHRoaXMpO1xuXG4gIC8vIGhhc2ggaXMgYWx3YXlzIG92ZXJyaWRkZW4sIG5vIG1hdHRlciB3aGF0LlxuICAvLyBldmVuIGhyZWY9XCJcIiB3aWxsIHJlbW92ZSBpdC5cbiAgcmVzdWx0Lmhhc2ggPSByZWxhdGl2ZS5oYXNoO1xuXG4gIC8vIGlmIHRoZSByZWxhdGl2ZSB1cmwgaXMgZW1wdHksIHRoZW4gdGhlcmUncyBub3RoaW5nIGxlZnQgdG8gZG8gaGVyZS5cbiAgaWYgKHJlbGF0aXZlLmhyZWYgPT09ICcnKSB7XG4gICAgcmVzdWx0LmhyZWYgPSByZXN1bHQuZm9ybWF0KCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIGhyZWZzIGxpa2UgLy9mb28vYmFyIGFsd2F5cyBjdXQgdG8gdGhlIHByb3RvY29sLlxuICBpZiAocmVsYXRpdmUuc2xhc2hlcyAmJiAhcmVsYXRpdmUucHJvdG9jb2wpIHtcbiAgICAvLyB0YWtlIGV2ZXJ5dGhpbmcgZXhjZXB0IHRoZSBwcm90b2NvbCBmcm9tIHJlbGF0aXZlXG4gICAgc2hpbXMuZm9yRWFjaChzaGltcy5rZXlzKHJlbGF0aXZlKSwgZnVuY3Rpb24oaykge1xuICAgICAgaWYgKGsgIT09ICdwcm90b2NvbCcpXG4gICAgICAgIHJlc3VsdFtrXSA9IHJlbGF0aXZlW2tdO1xuICAgIH0pO1xuXG4gICAgLy91cmxQYXJzZSBhcHBlbmRzIHRyYWlsaW5nIC8gdG8gdXJscyBsaWtlIGh0dHA6Ly93d3cuZXhhbXBsZS5jb21cbiAgICBpZiAoc2xhc2hlZFByb3RvY29sW3Jlc3VsdC5wcm90b2NvbF0gJiZcbiAgICAgICAgcmVzdWx0Lmhvc3RuYW1lICYmICFyZXN1bHQucGF0aG5hbWUpIHtcbiAgICAgIHJlc3VsdC5wYXRoID0gcmVzdWx0LnBhdGhuYW1lID0gJy8nO1xuICAgIH1cblxuICAgIHJlc3VsdC5ocmVmID0gcmVzdWx0LmZvcm1hdCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBpZiAocmVsYXRpdmUucHJvdG9jb2wgJiYgcmVsYXRpdmUucHJvdG9jb2wgIT09IHJlc3VsdC5wcm90b2NvbCkge1xuICAgIC8vIGlmIGl0J3MgYSBrbm93biB1cmwgcHJvdG9jb2wsIHRoZW4gY2hhbmdpbmdcbiAgICAvLyB0aGUgcHJvdG9jb2wgZG9lcyB3ZWlyZCB0aGluZ3NcbiAgICAvLyBmaXJzdCwgaWYgaXQncyBub3QgZmlsZTosIHRoZW4gd2UgTVVTVCBoYXZlIGEgaG9zdCxcbiAgICAvLyBhbmQgaWYgdGhlcmUgd2FzIGEgcGF0aFxuICAgIC8vIHRvIGJlZ2luIHdpdGgsIHRoZW4gd2UgTVVTVCBoYXZlIGEgcGF0aC5cbiAgICAvLyBpZiBpdCBpcyBmaWxlOiwgdGhlbiB0aGUgaG9zdCBpcyBkcm9wcGVkLFxuICAgIC8vIGJlY2F1c2UgdGhhdCdzIGtub3duIHRvIGJlIGhvc3RsZXNzLlxuICAgIC8vIGFueXRoaW5nIGVsc2UgaXMgYXNzdW1lZCB0byBiZSBhYnNvbHV0ZS5cbiAgICBpZiAoIXNsYXNoZWRQcm90b2NvbFtyZWxhdGl2ZS5wcm90b2NvbF0pIHtcbiAgICAgIHNoaW1zLmZvckVhY2goc2hpbXMua2V5cyhyZWxhdGl2ZSksIGZ1bmN0aW9uKGspIHtcbiAgICAgICAgcmVzdWx0W2tdID0gcmVsYXRpdmVba107XG4gICAgICB9KTtcbiAgICAgIHJlc3VsdC5ocmVmID0gcmVzdWx0LmZvcm1hdCgpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICByZXN1bHQucHJvdG9jb2wgPSByZWxhdGl2ZS5wcm90b2NvbDtcbiAgICBpZiAoIXJlbGF0aXZlLmhvc3QgJiYgIWhvc3RsZXNzUHJvdG9jb2xbcmVsYXRpdmUucHJvdG9jb2xdKSB7XG4gICAgICB2YXIgcmVsUGF0aCA9IChyZWxhdGl2ZS5wYXRobmFtZSB8fCAnJykuc3BsaXQoJy8nKTtcbiAgICAgIHdoaWxlIChyZWxQYXRoLmxlbmd0aCAmJiAhKHJlbGF0aXZlLmhvc3QgPSByZWxQYXRoLnNoaWZ0KCkpKTtcbiAgICAgIGlmICghcmVsYXRpdmUuaG9zdCkgcmVsYXRpdmUuaG9zdCA9ICcnO1xuICAgICAgaWYgKCFyZWxhdGl2ZS5ob3N0bmFtZSkgcmVsYXRpdmUuaG9zdG5hbWUgPSAnJztcbiAgICAgIGlmIChyZWxQYXRoWzBdICE9PSAnJykgcmVsUGF0aC51bnNoaWZ0KCcnKTtcbiAgICAgIGlmIChyZWxQYXRoLmxlbmd0aCA8IDIpIHJlbFBhdGgudW5zaGlmdCgnJyk7XG4gICAgICByZXN1bHQucGF0aG5hbWUgPSByZWxQYXRoLmpvaW4oJy8nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0LnBhdGhuYW1lID0gcmVsYXRpdmUucGF0aG5hbWU7XG4gICAgfVxuICAgIHJlc3VsdC5zZWFyY2ggPSByZWxhdGl2ZS5zZWFyY2g7XG4gICAgcmVzdWx0LnF1ZXJ5ID0gcmVsYXRpdmUucXVlcnk7XG4gICAgcmVzdWx0Lmhvc3QgPSByZWxhdGl2ZS5ob3N0IHx8ICcnO1xuICAgIHJlc3VsdC5hdXRoID0gcmVsYXRpdmUuYXV0aDtcbiAgICByZXN1bHQuaG9zdG5hbWUgPSByZWxhdGl2ZS5ob3N0bmFtZSB8fCByZWxhdGl2ZS5ob3N0O1xuICAgIHJlc3VsdC5wb3J0ID0gcmVsYXRpdmUucG9ydDtcbiAgICAvLyB0byBzdXBwb3J0IGh0dHAucmVxdWVzdFxuICAgIGlmIChyZXN1bHQucGF0aG5hbWUgfHwgcmVzdWx0LnNlYXJjaCkge1xuICAgICAgdmFyIHAgPSByZXN1bHQucGF0aG5hbWUgfHwgJyc7XG4gICAgICB2YXIgcyA9IHJlc3VsdC5zZWFyY2ggfHwgJyc7XG4gICAgICByZXN1bHQucGF0aCA9IHAgKyBzO1xuICAgIH1cbiAgICByZXN1bHQuc2xhc2hlcyA9IHJlc3VsdC5zbGFzaGVzIHx8IHJlbGF0aXZlLnNsYXNoZXM7XG4gICAgcmVzdWx0LmhyZWYgPSByZXN1bHQuZm9ybWF0KCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHZhciBpc1NvdXJjZUFicyA9IChyZXN1bHQucGF0aG5hbWUgJiYgcmVzdWx0LnBhdGhuYW1lLmNoYXJBdCgwKSA9PT0gJy8nKSxcbiAgICAgIGlzUmVsQWJzID0gKFxuICAgICAgICAgIHJlbGF0aXZlLmhvc3QgfHxcbiAgICAgICAgICByZWxhdGl2ZS5wYXRobmFtZSAmJiByZWxhdGl2ZS5wYXRobmFtZS5jaGFyQXQoMCkgPT09ICcvJ1xuICAgICAgKSxcbiAgICAgIG11c3RFbmRBYnMgPSAoaXNSZWxBYnMgfHwgaXNTb3VyY2VBYnMgfHxcbiAgICAgICAgICAgICAgICAgICAgKHJlc3VsdC5ob3N0ICYmIHJlbGF0aXZlLnBhdGhuYW1lKSksXG4gICAgICByZW1vdmVBbGxEb3RzID0gbXVzdEVuZEFicyxcbiAgICAgIHNyY1BhdGggPSByZXN1bHQucGF0aG5hbWUgJiYgcmVzdWx0LnBhdGhuYW1lLnNwbGl0KCcvJykgfHwgW10sXG4gICAgICByZWxQYXRoID0gcmVsYXRpdmUucGF0aG5hbWUgJiYgcmVsYXRpdmUucGF0aG5hbWUuc3BsaXQoJy8nKSB8fCBbXSxcbiAgICAgIHBzeWNob3RpYyA9IHJlc3VsdC5wcm90b2NvbCAmJiAhc2xhc2hlZFByb3RvY29sW3Jlc3VsdC5wcm90b2NvbF07XG5cbiAgLy8gaWYgdGhlIHVybCBpcyBhIG5vbi1zbGFzaGVkIHVybCwgdGhlbiByZWxhdGl2ZVxuICAvLyBsaW5rcyBsaWtlIC4uLy4uIHNob3VsZCBiZSBhYmxlXG4gIC8vIHRvIGNyYXdsIHVwIHRvIHRoZSBob3N0bmFtZSwgYXMgd2VsbC4gIFRoaXMgaXMgc3RyYW5nZS5cbiAgLy8gcmVzdWx0LnByb3RvY29sIGhhcyBhbHJlYWR5IGJlZW4gc2V0IGJ5IG5vdy5cbiAgLy8gTGF0ZXIgb24sIHB1dCB0aGUgZmlyc3QgcGF0aCBwYXJ0IGludG8gdGhlIGhvc3QgZmllbGQuXG4gIGlmIChwc3ljaG90aWMpIHtcbiAgICByZXN1bHQuaG9zdG5hbWUgPSAnJztcbiAgICByZXN1bHQucG9ydCA9IG51bGw7XG4gICAgaWYgKHJlc3VsdC5ob3N0KSB7XG4gICAgICBpZiAoc3JjUGF0aFswXSA9PT0gJycpIHNyY1BhdGhbMF0gPSByZXN1bHQuaG9zdDtcbiAgICAgIGVsc2Ugc3JjUGF0aC51bnNoaWZ0KHJlc3VsdC5ob3N0KTtcbiAgICB9XG4gICAgcmVzdWx0Lmhvc3QgPSAnJztcbiAgICBpZiAocmVsYXRpdmUucHJvdG9jb2wpIHtcbiAgICAgIHJlbGF0aXZlLmhvc3RuYW1lID0gbnVsbDtcbiAgICAgIHJlbGF0aXZlLnBvcnQgPSBudWxsO1xuICAgICAgaWYgKHJlbGF0aXZlLmhvc3QpIHtcbiAgICAgICAgaWYgKHJlbFBhdGhbMF0gPT09ICcnKSByZWxQYXRoWzBdID0gcmVsYXRpdmUuaG9zdDtcbiAgICAgICAgZWxzZSByZWxQYXRoLnVuc2hpZnQocmVsYXRpdmUuaG9zdCk7XG4gICAgICB9XG4gICAgICByZWxhdGl2ZS5ob3N0ID0gbnVsbDtcbiAgICB9XG4gICAgbXVzdEVuZEFicyA9IG11c3RFbmRBYnMgJiYgKHJlbFBhdGhbMF0gPT09ICcnIHx8IHNyY1BhdGhbMF0gPT09ICcnKTtcbiAgfVxuXG4gIGlmIChpc1JlbEFicykge1xuICAgIC8vIGl0J3MgYWJzb2x1dGUuXG4gICAgcmVzdWx0Lmhvc3QgPSAocmVsYXRpdmUuaG9zdCB8fCByZWxhdGl2ZS5ob3N0ID09PSAnJykgP1xuICAgICAgICAgICAgICAgICAgcmVsYXRpdmUuaG9zdCA6IHJlc3VsdC5ob3N0O1xuICAgIHJlc3VsdC5ob3N0bmFtZSA9IChyZWxhdGl2ZS5ob3N0bmFtZSB8fCByZWxhdGl2ZS5ob3N0bmFtZSA9PT0gJycpID9cbiAgICAgICAgICAgICAgICAgICAgICByZWxhdGl2ZS5ob3N0bmFtZSA6IHJlc3VsdC5ob3N0bmFtZTtcbiAgICByZXN1bHQuc2VhcmNoID0gcmVsYXRpdmUuc2VhcmNoO1xuICAgIHJlc3VsdC5xdWVyeSA9IHJlbGF0aXZlLnF1ZXJ5O1xuICAgIHNyY1BhdGggPSByZWxQYXRoO1xuICAgIC8vIGZhbGwgdGhyb3VnaCB0byB0aGUgZG90LWhhbmRsaW5nIGJlbG93LlxuICB9IGVsc2UgaWYgKHJlbFBhdGgubGVuZ3RoKSB7XG4gICAgLy8gaXQncyByZWxhdGl2ZVxuICAgIC8vIHRocm93IGF3YXkgdGhlIGV4aXN0aW5nIGZpbGUsIGFuZCB0YWtlIHRoZSBuZXcgcGF0aCBpbnN0ZWFkLlxuICAgIGlmICghc3JjUGF0aCkgc3JjUGF0aCA9IFtdO1xuICAgIHNyY1BhdGgucG9wKCk7XG4gICAgc3JjUGF0aCA9IHNyY1BhdGguY29uY2F0KHJlbFBhdGgpO1xuICAgIHJlc3VsdC5zZWFyY2ggPSByZWxhdGl2ZS5zZWFyY2g7XG4gICAgcmVzdWx0LnF1ZXJ5ID0gcmVsYXRpdmUucXVlcnk7XG4gIH0gZWxzZSBpZiAoIXV0aWwuaXNOdWxsT3JVbmRlZmluZWQocmVsYXRpdmUuc2VhcmNoKSkge1xuICAgIC8vIGp1c3QgcHVsbCBvdXQgdGhlIHNlYXJjaC5cbiAgICAvLyBsaWtlIGhyZWY9Jz9mb28nLlxuICAgIC8vIFB1dCB0aGlzIGFmdGVyIHRoZSBvdGhlciB0d28gY2FzZXMgYmVjYXVzZSBpdCBzaW1wbGlmaWVzIHRoZSBib29sZWFuc1xuICAgIGlmIChwc3ljaG90aWMpIHtcbiAgICAgIHJlc3VsdC5ob3N0bmFtZSA9IHJlc3VsdC5ob3N0ID0gc3JjUGF0aC5zaGlmdCgpO1xuICAgICAgLy9vY2NhdGlvbmFseSB0aGUgYXV0aCBjYW4gZ2V0IHN0dWNrIG9ubHkgaW4gaG9zdFxuICAgICAgLy90aGlzIGVzcGVjaWFseSBoYXBwZW5zIGluIGNhc2VzIGxpa2VcbiAgICAgIC8vdXJsLnJlc29sdmVPYmplY3QoJ21haWx0bzpsb2NhbDFAZG9tYWluMScsICdsb2NhbDJAZG9tYWluMicpXG4gICAgICB2YXIgYXV0aEluSG9zdCA9IHJlc3VsdC5ob3N0ICYmIHJlc3VsdC5ob3N0LmluZGV4T2YoJ0AnKSA+IDAgP1xuICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuaG9zdC5zcGxpdCgnQCcpIDogZmFsc2U7XG4gICAgICBpZiAoYXV0aEluSG9zdCkge1xuICAgICAgICByZXN1bHQuYXV0aCA9IGF1dGhJbkhvc3Quc2hpZnQoKTtcbiAgICAgICAgcmVzdWx0Lmhvc3QgPSByZXN1bHQuaG9zdG5hbWUgPSBhdXRoSW5Ib3N0LnNoaWZ0KCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJlc3VsdC5zZWFyY2ggPSByZWxhdGl2ZS5zZWFyY2g7XG4gICAgcmVzdWx0LnF1ZXJ5ID0gcmVsYXRpdmUucXVlcnk7XG4gICAgLy90byBzdXBwb3J0IGh0dHAucmVxdWVzdFxuICAgIGlmICghdXRpbC5pc051bGwocmVzdWx0LnBhdGhuYW1lKSB8fCAhdXRpbC5pc051bGwocmVzdWx0LnNlYXJjaCkpIHtcbiAgICAgIHJlc3VsdC5wYXRoID0gKHJlc3VsdC5wYXRobmFtZSA/IHJlc3VsdC5wYXRobmFtZSA6ICcnKSArXG4gICAgICAgICAgICAgICAgICAgIChyZXN1bHQuc2VhcmNoID8gcmVzdWx0LnNlYXJjaCA6ICcnKTtcbiAgICB9XG4gICAgcmVzdWx0LmhyZWYgPSByZXN1bHQuZm9ybWF0KCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGlmICghc3JjUGF0aC5sZW5ndGgpIHtcbiAgICAvLyBubyBwYXRoIGF0IGFsbC4gIGVhc3kuXG4gICAgLy8gd2UndmUgYWxyZWFkeSBoYW5kbGVkIHRoZSBvdGhlciBzdHVmZiBhYm92ZS5cbiAgICByZXN1bHQucGF0aG5hbWUgPSBudWxsO1xuICAgIC8vdG8gc3VwcG9ydCBodHRwLnJlcXVlc3RcbiAgICBpZiAocmVzdWx0LnNlYXJjaCkge1xuICAgICAgcmVzdWx0LnBhdGggPSAnLycgKyByZXN1bHQuc2VhcmNoO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQucGF0aCA9IG51bGw7XG4gICAgfVxuICAgIHJlc3VsdC5ocmVmID0gcmVzdWx0LmZvcm1hdCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvLyBpZiBhIHVybCBFTkRzIGluIC4gb3IgLi4sIHRoZW4gaXQgbXVzdCBnZXQgYSB0cmFpbGluZyBzbGFzaC5cbiAgLy8gaG93ZXZlciwgaWYgaXQgZW5kcyBpbiBhbnl0aGluZyBlbHNlIG5vbi1zbGFzaHksXG4gIC8vIHRoZW4gaXQgbXVzdCBOT1QgZ2V0IGEgdHJhaWxpbmcgc2xhc2guXG4gIHZhciBsYXN0ID0gc3JjUGF0aC5zbGljZSgtMSlbMF07XG4gIHZhciBoYXNUcmFpbGluZ1NsYXNoID0gKFxuICAgICAgKHJlc3VsdC5ob3N0IHx8IHJlbGF0aXZlLmhvc3QpICYmIChsYXN0ID09PSAnLicgfHwgbGFzdCA9PT0gJy4uJykgfHxcbiAgICAgIGxhc3QgPT09ICcnKTtcblxuICAvLyBzdHJpcCBzaW5nbGUgZG90cywgcmVzb2x2ZSBkb3VibGUgZG90cyB0byBwYXJlbnQgZGlyXG4gIC8vIGlmIHRoZSBwYXRoIHRyaWVzIHRvIGdvIGFib3ZlIHRoZSByb290LCBgdXBgIGVuZHMgdXAgPiAwXG4gIHZhciB1cCA9IDA7XG4gIGZvciAodmFyIGkgPSBzcmNQYXRoLmxlbmd0aDsgaSA+PSAwOyBpLS0pIHtcbiAgICBsYXN0ID0gc3JjUGF0aFtpXTtcbiAgICBpZiAobGFzdCA9PSAnLicpIHtcbiAgICAgIHNyY1BhdGguc3BsaWNlKGksIDEpO1xuICAgIH0gZWxzZSBpZiAobGFzdCA9PT0gJy4uJykge1xuICAgICAgc3JjUGF0aC5zcGxpY2UoaSwgMSk7XG4gICAgICB1cCsrO1xuICAgIH0gZWxzZSBpZiAodXApIHtcbiAgICAgIHNyY1BhdGguc3BsaWNlKGksIDEpO1xuICAgICAgdXAtLTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB0aGUgcGF0aCBpcyBhbGxvd2VkIHRvIGdvIGFib3ZlIHRoZSByb290LCByZXN0b3JlIGxlYWRpbmcgLi5zXG4gIGlmICghbXVzdEVuZEFicyAmJiAhcmVtb3ZlQWxsRG90cykge1xuICAgIGZvciAoOyB1cC0tOyB1cCkge1xuICAgICAgc3JjUGF0aC51bnNoaWZ0KCcuLicpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChtdXN0RW5kQWJzICYmIHNyY1BhdGhbMF0gIT09ICcnICYmXG4gICAgICAoIXNyY1BhdGhbMF0gfHwgc3JjUGF0aFswXS5jaGFyQXQoMCkgIT09ICcvJykpIHtcbiAgICBzcmNQYXRoLnVuc2hpZnQoJycpO1xuICB9XG5cbiAgaWYgKGhhc1RyYWlsaW5nU2xhc2ggJiYgKHNoaW1zLnN1YnN0cihzcmNQYXRoLmpvaW4oJy8nKSwgLTEpICE9PSAnLycpKSB7XG4gICAgc3JjUGF0aC5wdXNoKCcnKTtcbiAgfVxuXG4gIHZhciBpc0Fic29sdXRlID0gc3JjUGF0aFswXSA9PT0gJycgfHxcbiAgICAgIChzcmNQYXRoWzBdICYmIHNyY1BhdGhbMF0uY2hhckF0KDApID09PSAnLycpO1xuXG4gIC8vIHB1dCB0aGUgaG9zdCBiYWNrXG4gIGlmIChwc3ljaG90aWMpIHtcbiAgICByZXN1bHQuaG9zdG5hbWUgPSByZXN1bHQuaG9zdCA9IGlzQWJzb2x1dGUgPyAnJyA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcmNQYXRoLmxlbmd0aCA/IHNyY1BhdGguc2hpZnQoKSA6ICcnO1xuICAgIC8vb2NjYXRpb25hbHkgdGhlIGF1dGggY2FuIGdldCBzdHVjayBvbmx5IGluIGhvc3RcbiAgICAvL3RoaXMgZXNwZWNpYWx5IGhhcHBlbnMgaW4gY2FzZXMgbGlrZVxuICAgIC8vdXJsLnJlc29sdmVPYmplY3QoJ21haWx0bzpsb2NhbDFAZG9tYWluMScsICdsb2NhbDJAZG9tYWluMicpXG4gICAgdmFyIGF1dGhJbkhvc3QgPSByZXN1bHQuaG9zdCAmJiByZXN1bHQuaG9zdC5pbmRleE9mKCdAJykgPiAwID9cbiAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5ob3N0LnNwbGl0KCdAJykgOiBmYWxzZTtcbiAgICBpZiAoYXV0aEluSG9zdCkge1xuICAgICAgcmVzdWx0LmF1dGggPSBhdXRoSW5Ib3N0LnNoaWZ0KCk7XG4gICAgICByZXN1bHQuaG9zdCA9IHJlc3VsdC5ob3N0bmFtZSA9IGF1dGhJbkhvc3Quc2hpZnQoKTtcbiAgICB9XG4gIH1cblxuICBtdXN0RW5kQWJzID0gbXVzdEVuZEFicyB8fCAocmVzdWx0Lmhvc3QgJiYgc3JjUGF0aC5sZW5ndGgpO1xuXG4gIGlmIChtdXN0RW5kQWJzICYmICFpc0Fic29sdXRlKSB7XG4gICAgc3JjUGF0aC51bnNoaWZ0KCcnKTtcbiAgfVxuXG4gIGlmICghc3JjUGF0aC5sZW5ndGgpIHtcbiAgICByZXN1bHQucGF0aG5hbWUgPSBudWxsO1xuICAgIHJlc3VsdC5wYXRoID0gbnVsbDtcbiAgfSBlbHNlIHtcbiAgICByZXN1bHQucGF0aG5hbWUgPSBzcmNQYXRoLmpvaW4oJy8nKTtcbiAgfVxuXG4gIC8vdG8gc3VwcG9ydCByZXF1ZXN0Lmh0dHBcbiAgaWYgKCF1dGlsLmlzTnVsbChyZXN1bHQucGF0aG5hbWUpIHx8ICF1dGlsLmlzTnVsbChyZXN1bHQuc2VhcmNoKSkge1xuICAgIHJlc3VsdC5wYXRoID0gKHJlc3VsdC5wYXRobmFtZSA/IHJlc3VsdC5wYXRobmFtZSA6ICcnKSArXG4gICAgICAgICAgICAgICAgICAocmVzdWx0LnNlYXJjaCA/IHJlc3VsdC5zZWFyY2ggOiAnJyk7XG4gIH1cbiAgcmVzdWx0LmF1dGggPSByZWxhdGl2ZS5hdXRoIHx8IHJlc3VsdC5hdXRoO1xuICByZXN1bHQuc2xhc2hlcyA9IHJlc3VsdC5zbGFzaGVzIHx8IHJlbGF0aXZlLnNsYXNoZXM7XG4gIHJlc3VsdC5ocmVmID0gcmVzdWx0LmZvcm1hdCgpO1xuICByZXR1cm4gcmVzdWx0O1xufTtcblxuVXJsLnByb3RvdHlwZS5wYXJzZUhvc3QgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGhvc3QgPSB0aGlzLmhvc3Q7XG4gIHZhciBwb3J0ID0gcG9ydFBhdHRlcm4uZXhlYyhob3N0KTtcbiAgaWYgKHBvcnQpIHtcbiAgICBwb3J0ID0gcG9ydFswXTtcbiAgICBpZiAocG9ydCAhPT0gJzonKSB7XG4gICAgICB0aGlzLnBvcnQgPSBwb3J0LnN1YnN0cigxKTtcbiAgICB9XG4gICAgaG9zdCA9IGhvc3Quc3Vic3RyKDAsIGhvc3QubGVuZ3RoIC0gcG9ydC5sZW5ndGgpO1xuICB9XG4gIGlmIChob3N0KSB0aGlzLmhvc3RuYW1lID0gaG9zdDtcbn07IiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBzaGltcyA9IHJlcXVpcmUoJ19zaGltcycpO1xuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QgdGhhdCBhbHRlcnMgdGhlIG91dHB1dC5cbiAqL1xuLyogbGVnYWN5OiBvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIG9wdHMpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25zXG4gIHZhciBjdHggPSB7XG4gICAgc2VlbjogW10sXG4gICAgc3R5bGl6ZTogc3R5bGl6ZU5vQ29sb3JcbiAgfTtcbiAgLy8gbGVnYWN5Li4uXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIGN0eC5kZXB0aCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gNCkgY3R4LmNvbG9ycyA9IGFyZ3VtZW50c1szXTtcbiAgaWYgKGlzQm9vbGVhbihvcHRzKSkge1xuICAgIC8vIGxlZ2FjeS4uLlxuICAgIGN0eC5zaG93SGlkZGVuID0gb3B0cztcbiAgfSBlbHNlIGlmIChvcHRzKSB7XG4gICAgLy8gZ290IGFuIFwib3B0aW9uc1wiIG9iamVjdFxuICAgIGV4cG9ydHMuX2V4dGVuZChjdHgsIG9wdHMpO1xuICB9XG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5zaG93SGlkZGVuKSkgY3R4LnNob3dIaWRkZW4gPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpIGN0eC5kZXB0aCA9IDI7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY29sb3JzKSkgY3R4LmNvbG9ycyA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmN1c3RvbUluc3BlY3QpKSBjdHguY3VzdG9tSW5zcGVjdCA9IHRydWU7XG4gIGlmIChjdHguY29sb3JzKSBjdHguc3R5bGl6ZSA9IHN0eWxpemVXaXRoQ29sb3I7XG4gIHJldHVybiBmb3JtYXRWYWx1ZShjdHgsIG9iaiwgY3R4LmRlcHRoKTtcbn1cbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cblxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG5pbnNwZWN0LmNvbG9ycyA9IHtcbiAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAndW5kZXJsaW5lJyA6IFs0LCAyNF0sXG4gICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgJ2dyZXknIDogWzkwLCAzOV0sXG4gICdibGFjaycgOiBbMzAsIDM5XSxcbiAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICdjeWFuJyA6IFszNiwgMzldLFxuICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAncmVkJyA6IFszMSwgMzldLFxuICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG4vLyBEb24ndCB1c2UgJ2JsdWUnIG5vdCB2aXNpYmxlIG9uIGNtZC5leGVcbmluc3BlY3Quc3R5bGVzID0ge1xuICAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgJ251bWJlcic6ICd5ZWxsb3cnLFxuICAnYm9vbGVhbic6ICd5ZWxsb3cnLFxuICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAnbnVsbCc6ICdib2xkJyxcbiAgJ3N0cmluZyc6ICdncmVlbicsXG4gICdkYXRlJzogJ21hZ2VudGEnLFxuICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAncmVnZXhwJzogJ3JlZCdcbn07XG5cblxuZnVuY3Rpb24gc3R5bGl6ZVdpdGhDb2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICB2YXIgc3R5bGUgPSBpbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO1xuXG4gIGlmIChzdHlsZSkge1xuICAgIHJldHVybiAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVsxXSArICdtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc3R5bGl6ZU5vQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgcmV0dXJuIHN0cjtcbn1cblxuXG5mdW5jdGlvbiBhcnJheVRvSGFzaChhcnJheSkge1xuICB2YXIgaGFzaCA9IHt9O1xuXG4gIHNoaW1zLmZvckVhY2goYXJyYXksIGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBzaGltcy5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IHNoaW1zLmdldE93blByb3BlcnR5TmFtZXModmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG5cbiAgc2hpbXMuZm9yRWFjaChrZXlzLCBmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBzaGltcy5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIGtleSkgfHwgeyB2YWx1ZTogdmFsdWVba2V5XSB9O1xuICBpZiAoZGVzYy5nZXQpIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoc2hpbXMuaW5kZXhPZihjdHguc2VlbiwgZGVzYy52YWx1ZSkgPCAwKSB7XG4gICAgICBpZiAoaXNOdWxsKHJlY3Vyc2VUaW1lcykpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBpZiAoYXJyYXkgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cigxLCBuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICduYW1lJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG59XG5cblxuZnVuY3Rpb24gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpIHtcbiAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgdmFyIGxlbmd0aCA9IHNoaW1zLnJlZHVjZShvdXRwdXQsIGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBzaGltcy5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZztcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJiBvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJztcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5iaW5hcnlTbGljZSA9PT0gJ2Z1bmN0aW9uJ1xuICA7XG59XG5leHBvcnRzLmlzQnVmZmVyID0gaXNCdWZmZXI7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuXG5mdW5jdGlvbiBwYWQobikge1xuICByZXR1cm4gbiA8IDEwID8gJzAnICsgbi50b1N0cmluZygxMCkgOiBuLnRvU3RyaW5nKDEwKTtcbn1cblxuXG52YXIgbW9udGhzID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG4vLyAyNiBGZWIgMTY6MTk6MzRcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICB2YXIgdGltZSA9IFtwYWQoZC5nZXRIb3VycygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0TWludXRlcygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0U2Vjb25kcygpKV0uam9pbignOicpO1xuICByZXR1cm4gW2QuZ2V0RGF0ZSgpLCBtb250aHNbZC5nZXRNb250aCgpXSwgdGltZV0uam9pbignICcpO1xufVxuXG5cbi8vIGxvZyBpcyBqdXN0IGEgdGhpbiB3cmFwcGVyIHRvIGNvbnNvbGUubG9nIHRoYXQgcHJlcGVuZHMgYSB0aW1lc3RhbXBcbmV4cG9ydHMubG9nID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCclcyAtICVzJywgdGltZXN0YW1wKCksIGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cykpO1xufTtcblxuXG4vKipcbiAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAqXG4gKiBUaGUgRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzIGZyb20gbGFuZy5qcyByZXdyaXR0ZW4gYXMgYSBzdGFuZGFsb25lXG4gKiBmdW5jdGlvbiAobm90IG9uIEZ1bmN0aW9uLnByb3RvdHlwZSkuIE5PVEU6IElmIHRoaXMgZmlsZSBpcyB0byBiZSBsb2FkZWRcbiAqIGR1cmluZyBib290c3RyYXBwaW5nIHRoaXMgZnVuY3Rpb24gbmVlZHMgdG8gYmUgcmV3cml0dGVuIHVzaW5nIHNvbWUgbmF0aXZlXG4gKiBmdW5jdGlvbnMgYXMgcHJvdG90eXBlIHNldHVwIHVzaW5nIG5vcm1hbCBKYXZhU2NyaXB0IGRvZXMgbm90IHdvcmsgYXNcbiAqIGV4cGVjdGVkIGR1cmluZyBib290c3RyYXBwaW5nIChzZWUgbWlycm9yLmpzIGluIHIxMTQ5MDMpLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gd2hpY2ggbmVlZHMgdG8gaW5oZXJpdCB0aGVcbiAqICAgICBwcm90b3R5cGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gdG8gaW5oZXJpdCBwcm90b3R5cGUgZnJvbS5cbiAqL1xuZXhwb3J0cy5pbmhlcml0cyA9IGZ1bmN0aW9uKGN0b3IsIHN1cGVyQ3Rvcikge1xuICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvcjtcbiAgY3Rvci5wcm90b3R5cGUgPSBzaGltcy5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICB2YWx1ZTogY3RvcixcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9XG4gIH0pO1xufTtcblxuZXhwb3J0cy5fZXh0ZW5kID0gZnVuY3Rpb24ob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCAhaXNPYmplY3QoYWRkKSkgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IHNoaW1zLmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cbiIsImV4cG9ydHMucmVhZElFRUU3NTQgPSBmdW5jdGlvbihidWZmZXIsIG9mZnNldCwgaXNCRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLFxuICAgICAgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMSxcbiAgICAgIGVNYXggPSAoMSA8PCBlTGVuKSAtIDEsXG4gICAgICBlQmlhcyA9IGVNYXggPj4gMSxcbiAgICAgIG5CaXRzID0gLTcsXG4gICAgICBpID0gaXNCRSA/IDAgOiAobkJ5dGVzIC0gMSksXG4gICAgICBkID0gaXNCRSA/IDEgOiAtMSxcbiAgICAgIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV07XG5cbiAgaSArPSBkO1xuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpO1xuICBzID4+PSAoLW5CaXRzKTtcbiAgbkJpdHMgKz0gZUxlbjtcbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IGUgKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCk7XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIGUgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBtTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gbSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXM7XG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KTtcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pO1xuICAgIGUgPSBlIC0gZUJpYXM7XG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbik7XG59O1xuXG5leHBvcnRzLndyaXRlSUVFRTc1NCA9IGZ1bmN0aW9uKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNCRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjLFxuICAgICAgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMSxcbiAgICAgIGVNYXggPSAoMSA8PCBlTGVuKSAtIDEsXG4gICAgICBlQmlhcyA9IGVNYXggPj4gMSxcbiAgICAgIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKSxcbiAgICAgIGkgPSBpc0JFID8gKG5CeXRlcyAtIDEpIDogMCxcbiAgICAgIGQgPSBpc0JFID8gLTEgOiAxLFxuICAgICAgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMDtcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKTtcblxuICBpZiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSBJbmZpbml0eSkge1xuICAgIG0gPSBpc05hTih2YWx1ZSkgPyAxIDogMDtcbiAgICBlID0gZU1heDtcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMik7XG4gICAgaWYgKHZhbHVlICogKGMgPSBNYXRoLnBvdygyLCAtZSkpIDwgMSkge1xuICAgICAgZS0tO1xuICAgICAgYyAqPSAyO1xuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gYztcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgKz0gcnQgKiBNYXRoLnBvdygyLCAxIC0gZUJpYXMpO1xuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrKztcbiAgICAgIGMgLz0gMjtcbiAgICB9XG5cbiAgICBpZiAoZSArIGVCaWFzID49IGVNYXgpIHtcbiAgICAgIG0gPSAwO1xuICAgICAgZSA9IGVNYXg7XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICh2YWx1ZSAqIGMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pO1xuICAgICAgZSA9IGUgKyBlQmlhcztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pO1xuICAgICAgZSA9IDA7XG4gICAgfVxuICB9XG5cbiAgZm9yICg7IG1MZW4gPj0gODsgYnVmZmVyW29mZnNldCArIGldID0gbSAmIDB4ZmYsIGkgKz0gZCwgbSAvPSAyNTYsIG1MZW4gLT0gOCk7XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbTtcbiAgZUxlbiArPSBtTGVuO1xuICBmb3IgKDsgZUxlbiA+IDA7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IGUgJiAweGZmLCBpICs9IGQsIGUgLz0gMjU2LCBlTGVuIC09IDgpO1xuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyODtcbn07XG4iLCJ2YXIgYXNzZXJ0O1xuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXI7XG5leHBvcnRzLlNsb3dCdWZmZXIgPSBCdWZmZXI7XG5CdWZmZXIucG9vbFNpemUgPSA4MTkyO1xuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwO1xuXG5mdW5jdGlvbiBzdHJpbmd0cmltKHN0cikge1xuICBpZiAoc3RyLnRyaW0pIHJldHVybiBzdHIudHJpbSgpO1xuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKTtcbn1cblxuZnVuY3Rpb24gQnVmZmVyKHN1YmplY3QsIGVuY29kaW5nLCBvZmZzZXQpIHtcbiAgaWYoIWFzc2VydCkgYXNzZXJ0PSByZXF1aXJlKCdhc3NlcnQnKTtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEJ1ZmZlcikpIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgb2Zmc2V0KTtcbiAgfVxuICB0aGlzLnBhcmVudCA9IHRoaXM7XG4gIHRoaXMub2Zmc2V0ID0gMDtcblxuICAvLyBXb3JrLWFyb3VuZDogbm9kZSdzIGJhc2U2NCBpbXBsZW1lbnRhdGlvblxuICAvLyBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgc3RyaW5ncyB3aGlsZSBiYXNlNjQtanNcbiAgLy8gZG9lcyBub3QuLlxuICBpZiAoZW5jb2RpbmcgPT0gXCJiYXNlNjRcIiAmJiB0eXBlb2Ygc3ViamVjdCA9PSBcInN0cmluZ1wiKSB7XG4gICAgc3ViamVjdCA9IHN0cmluZ3RyaW0oc3ViamVjdCk7XG4gICAgd2hpbGUgKHN1YmplY3QubGVuZ3RoICUgNCAhPSAwKSB7XG4gICAgICBzdWJqZWN0ID0gc3ViamVjdCArIFwiPVwiOyBcbiAgICB9XG4gIH1cblxuICB2YXIgdHlwZTtcblxuICAvLyBBcmUgd2Ugc2xpY2luZz9cbiAgaWYgKHR5cGVvZiBvZmZzZXQgPT09ICdudW1iZXInKSB7XG4gICAgdGhpcy5sZW5ndGggPSBjb2VyY2UoZW5jb2RpbmcpO1xuICAgIC8vIHNsaWNpbmcgd29ya3MsIHdpdGggbGltaXRhdGlvbnMgKG5vIHBhcmVudCB0cmFja2luZy91cGRhdGUpXG4gICAgLy8gY2hlY2sgaHR0cHM6Ly9naXRodWIuY29tL3Rvb3RzL2J1ZmZlci1icm93c2VyaWZ5L2lzc3Vlcy8xOVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzW2ldID0gc3ViamVjdC5nZXQoaStvZmZzZXQpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBGaW5kIHRoZSBsZW5ndGhcbiAgICBzd2l0Y2ggKHR5cGUgPSB0eXBlb2Ygc3ViamVjdCkge1xuICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgdGhpcy5sZW5ndGggPSBjb2VyY2Uoc3ViamVjdCk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICB0aGlzLmxlbmd0aCA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHN1YmplY3QsIGVuY29kaW5nKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ29iamVjdCc6IC8vIEFzc3VtZSBvYmplY3QgaXMgYW4gYXJyYXlcbiAgICAgICAgdGhpcy5sZW5ndGggPSBjb2VyY2Uoc3ViamVjdC5sZW5ndGgpO1xuICAgICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGaXJzdCBhcmd1bWVudCBuZWVkcyB0byBiZSBhIG51bWJlciwgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnYXJyYXkgb3Igc3RyaW5nLicpO1xuICAgIH1cblxuICAgIC8vIFRyZWF0IGFycmF5LWlzaCBvYmplY3RzIGFzIGEgYnl0ZSBhcnJheS5cbiAgICBpZiAoaXNBcnJheUlzaChzdWJqZWN0KSkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChzdWJqZWN0IGluc3RhbmNlb2YgQnVmZmVyKSB7XG4gICAgICAgICAgdGhpc1tpXSA9IHN1YmplY3QucmVhZFVJbnQ4KGkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHRoaXNbaV0gPSBzdWJqZWN0W2ldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlID09ICdzdHJpbmcnKSB7XG4gICAgICAvLyBXZSBhcmUgYSBzdHJpbmdcbiAgICAgIHRoaXMubGVuZ3RoID0gdGhpcy53cml0ZShzdWJqZWN0LCAwLCBlbmNvZGluZyk7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJykge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXNbaV0gPSAwO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIGdldChpKSB7XG4gIGlmIChpIDwgMCB8fCBpID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoJ29vYicpO1xuICByZXR1cm4gdGhpc1tpXTtcbn07XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gc2V0KGksIHYpIHtcbiAgaWYgKGkgPCAwIHx8IGkgPj0gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBFcnJvcignb29iJyk7XG4gIHJldHVybiB0aGlzW2ldID0gdjtcbn07XG5cbkJ1ZmZlci5ieXRlTGVuZ3RoID0gZnVuY3Rpb24gKHN0ciwgZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChlbmNvZGluZyB8fCBcInV0ZjhcIikge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXR1cm4gc3RyLmxlbmd0aCAvIDI7XG5cbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgICByZXR1cm4gdXRmOFRvQnl0ZXMoc3RyKS5sZW5ndGg7XG5cbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgIHJldHVybiBzdHIubGVuZ3RoO1xuXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldHVybiBiYXNlNjRUb0J5dGVzKHN0cikubGVuZ3RoO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpO1xuICB9XG59O1xuXG5CdWZmZXIucHJvdG90eXBlLnV0ZjhXcml0ZSA9IGZ1bmN0aW9uIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBieXRlcywgcG9zO1xuICByZXR1cm4gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPSAgYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcpLCB0aGlzLCBvZmZzZXQsIGxlbmd0aCk7XG59O1xuXG5CdWZmZXIucHJvdG90eXBlLmFzY2lpV3JpdGUgPSBmdW5jdGlvbiAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgYnl0ZXMsIHBvcztcbiAgcmV0dXJuIEJ1ZmZlci5fY2hhcnNXcml0dGVuID0gIGJsaXRCdWZmZXIoYXNjaWlUb0J5dGVzKHN0cmluZyksIHRoaXMsIG9mZnNldCwgbGVuZ3RoKTtcbn07XG5cbkJ1ZmZlci5wcm90b3R5cGUuYmluYXJ5V3JpdGUgPSBCdWZmZXIucHJvdG90eXBlLmFzY2lpV3JpdGU7XG5cbkJ1ZmZlci5wcm90b3R5cGUuYmFzZTY0V3JpdGUgPSBmdW5jdGlvbiAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgYnl0ZXMsIHBvcztcbiAgcmV0dXJuIEJ1ZmZlci5fY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIHRoaXMsIG9mZnNldCwgbGVuZ3RoKTtcbn07XG5cbkJ1ZmZlci5wcm90b3R5cGUuYmFzZTY0U2xpY2UgPSBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICByZXR1cm4gcmVxdWlyZShcImJhc2U2NC1qc1wiKS5mcm9tQnl0ZUFycmF5KGJ5dGVzKTtcbn07XG5cbkJ1ZmZlci5wcm90b3R5cGUudXRmOFNsaWNlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgYnl0ZXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgdmFyIHJlcyA9IFwiXCI7XG4gIHZhciB0bXAgPSBcIlwiO1xuICB2YXIgaSA9IDA7XG4gIHdoaWxlIChpIDwgYnl0ZXMubGVuZ3RoKSB7XG4gICAgaWYgKGJ5dGVzW2ldIDw9IDB4N0YpIHtcbiAgICAgIHJlcyArPSBkZWNvZGVVdGY4Q2hhcih0bXApICsgU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSk7XG4gICAgICB0bXAgPSBcIlwiO1xuICAgIH0gZWxzZVxuICAgICAgdG1wICs9IFwiJVwiICsgYnl0ZXNbaV0udG9TdHJpbmcoMTYpO1xuXG4gICAgaSsrO1xuICB9XG5cbiAgcmV0dXJuIHJlcyArIGRlY29kZVV0ZjhDaGFyKHRtcCk7XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuYXNjaWlTbGljZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGJ5dGVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIHZhciByZXQgPSBcIlwiO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSsrKVxuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldKTtcbiAgcmV0dXJuIHJldDtcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5iaW5hcnlTbGljZSA9IEJ1ZmZlci5wcm90b3R5cGUuYXNjaWlTbGljZTtcblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBvdXQgPSBbXSxcbiAgICAgIGxlbiA9IHRoaXMubGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgb3V0W2ldID0gdG9IZXgodGhpc1tpXSk7XG4gICAgaWYgKGkgPT0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUykge1xuICAgICAgb3V0W2kgKyAxXSA9ICcuLi4nO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgb3V0LmpvaW4oJyAnKSArICc+Jztcbn07XG5cblxuQnVmZmVyLnByb3RvdHlwZS5oZXhTbGljZSA9IGZ1bmN0aW9uKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoO1xuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDA7XG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW47XG5cbiAgdmFyIG91dCA9ICcnO1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIG91dCArPSB0b0hleCh0aGlzW2ldKTtcbiAgfVxuICByZXR1cm4gb3V0O1xufTtcblxuXG5CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpO1xuICBzdGFydCA9ICtzdGFydCB8fCAwO1xuICBpZiAodHlwZW9mIGVuZCA9PSAndW5kZWZpbmVkJykgZW5kID0gdGhpcy5sZW5ndGg7XG5cbiAgLy8gRmFzdHBhdGggZW1wdHkgc3RyaW5nc1xuICBpZiAoK2VuZCA9PSBzdGFydCkge1xuICAgIHJldHVybiAnJztcbiAgfVxuXG4gIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgICAgcmV0dXJuIHRoaXMuaGV4U2xpY2Uoc3RhcnQsIGVuZCk7XG5cbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgICByZXR1cm4gdGhpcy51dGY4U2xpY2Uoc3RhcnQsIGVuZCk7XG5cbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXR1cm4gdGhpcy5hc2NpaVNsaWNlKHN0YXJ0LCBlbmQpO1xuXG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgIHJldHVybiB0aGlzLmJpbmFyeVNsaWNlKHN0YXJ0LCBlbmQpO1xuXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldHVybiB0aGlzLmJhc2U2NFNsaWNlKHN0YXJ0LCBlbmQpO1xuXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgICAgcmV0dXJuIHRoaXMudWNzMlNsaWNlKHN0YXJ0LCBlbmQpO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpO1xuICB9XG59O1xuXG5cbkJ1ZmZlci5wcm90b3R5cGUuaGV4V3JpdGUgPSBmdW5jdGlvbihzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9ICtvZmZzZXQgfHwgMDtcbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0O1xuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZztcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSArbGVuZ3RoO1xuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZztcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aDtcbiAgaWYgKHN0ckxlbiAlIDIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpO1xuICB9XG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMjtcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGJ5dGUgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpO1xuICAgIGlmIChpc05hTihieXRlKSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKTtcbiAgICB0aGlzW29mZnNldCArIGldID0gYnl0ZTtcbiAgfVxuICBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9IGkgKiAyO1xuICByZXR1cm4gaTtcbn07XG5cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIFN1cHBvcnQgYm90aCAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpXG4gIC8vIGFuZCB0aGUgbGVnYWN5IChzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBpZiAoIWlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoO1xuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfSBlbHNlIHsgIC8vIGxlZ2FjeVxuICAgIHZhciBzd2FwID0gZW5jb2Rpbmc7XG4gICAgZW5jb2RpbmcgPSBvZmZzZXQ7XG4gICAgb2Zmc2V0ID0gbGVuZ3RoO1xuICAgIGxlbmd0aCA9IHN3YXA7XG4gIH1cblxuICBvZmZzZXQgPSArb2Zmc2V0IHx8IDA7XG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldDtcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmc7XG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gK2xlbmd0aDtcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmc7XG4gICAgfVxuICB9XG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKTtcblxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldHVybiB0aGlzLmhleFdyaXRlKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpO1xuXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0dXJuIHRoaXMudXRmOFdyaXRlKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpO1xuXG4gICAgY2FzZSAnYXNjaWknOlxuICAgICAgcmV0dXJuIHRoaXMuYXNjaWlXcml0ZShzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKTtcblxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXR1cm4gdGhpcy5iaW5hcnlXcml0ZShzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKTtcblxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXR1cm4gdGhpcy5iYXNlNjRXcml0ZShzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKTtcblxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIHJldHVybiB0aGlzLnVjczJXcml0ZShzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKTtcblxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2RpbmcnKTtcbiAgfVxufTtcblxuLy8gc2xpY2Uoc3RhcnQsIGVuZClcbmZ1bmN0aW9uIGNsYW1wKGluZGV4LCBsZW4sIGRlZmF1bHRWYWx1ZSkge1xuICBpZiAodHlwZW9mIGluZGV4ICE9PSAnbnVtYmVyJykgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgaW5kZXggPSB+fmluZGV4OyAgLy8gQ29lcmNlIHRvIGludGVnZXIuXG4gIGlmIChpbmRleCA+PSBsZW4pIHJldHVybiBsZW47XG4gIGlmIChpbmRleCA+PSAwKSByZXR1cm4gaW5kZXg7XG4gIGluZGV4ICs9IGxlbjtcbiAgaWYgKGluZGV4ID49IDApIHJldHVybiBpbmRleDtcbiAgcmV0dXJuIDA7XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aDtcbiAgc3RhcnQgPSBjbGFtcChzdGFydCwgbGVuLCAwKTtcbiAgZW5kID0gY2xhbXAoZW5kLCBsZW4sIGxlbik7XG4gIHJldHVybiBuZXcgQnVmZmVyKHRoaXMsIGVuZCAtIHN0YXJ0LCArc3RhcnQpO1xufTtcblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24odGFyZ2V0LCB0YXJnZXRfc3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHNvdXJjZSA9IHRoaXM7XG4gIHN0YXJ0IHx8IChzdGFydCA9IDApO1xuICBpZiAoZW5kID09PSB1bmRlZmluZWQgfHwgaXNOYU4oZW5kKSkge1xuICAgIGVuZCA9IHRoaXMubGVuZ3RoO1xuICB9XG4gIHRhcmdldF9zdGFydCB8fCAodGFyZ2V0X3N0YXJ0ID0gMCk7XG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSB0aHJvdyBuZXcgRXJyb3IoJ3NvdXJjZUVuZCA8IHNvdXJjZVN0YXJ0Jyk7XG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm4gMDtcbiAgaWYgKHRhcmdldC5sZW5ndGggPT0gMCB8fCBzb3VyY2UubGVuZ3RoID09IDApIHJldHVybiAwO1xuXG4gIGlmICh0YXJnZXRfc3RhcnQgPCAwIHx8IHRhcmdldF9zdGFydCA+PSB0YXJnZXQubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJyk7XG4gIH1cblxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHNvdXJjZS5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKTtcbiAgfVxuXG4gIGlmIChlbmQgPCAwIHx8IGVuZCA+IHNvdXJjZS5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJyk7XG4gIH1cblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpIHtcbiAgICBlbmQgPSB0aGlzLmxlbmd0aDtcbiAgfVxuXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0IDwgZW5kIC0gc3RhcnQpIHtcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0ICsgc3RhcnQ7XG4gIH1cblxuICB2YXIgdGVtcCA9IFtdO1xuICBmb3IgKHZhciBpPXN0YXJ0OyBpPGVuZDsgaSsrKSB7XG4gICAgYXNzZXJ0Lm9rKHR5cGVvZiB0aGlzW2ldICE9PSAndW5kZWZpbmVkJywgXCJjb3B5aW5nIHVuZGVmaW5lZCBidWZmZXIgYnl0ZXMhXCIpO1xuICAgIHRlbXAucHVzaCh0aGlzW2ldKTtcbiAgfVxuXG4gIGZvciAodmFyIGk9dGFyZ2V0X3N0YXJ0OyBpPHRhcmdldF9zdGFydCt0ZW1wLmxlbmd0aDsgaSsrKSB7XG4gICAgdGFyZ2V0W2ldID0gdGVtcFtpLXRhcmdldF9zdGFydF07XG4gIH1cbn07XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gZmlsbCh2YWx1ZSwgc3RhcnQsIGVuZCkge1xuICB2YWx1ZSB8fCAodmFsdWUgPSAwKTtcbiAgc3RhcnQgfHwgKHN0YXJ0ID0gMCk7XG4gIGVuZCB8fCAoZW5kID0gdGhpcy5sZW5ndGgpO1xuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFsdWUgPSB2YWx1ZS5jaGFyQ29kZUF0KDApO1xuICB9XG4gIGlmICghKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHx8IGlzTmFOKHZhbHVlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcigndmFsdWUgaXMgbm90IGEgbnVtYmVyJyk7XG4gIH1cblxuICBpZiAoZW5kIDwgc3RhcnQpIHRocm93IG5ldyBFcnJvcignZW5kIDwgc3RhcnQnKTtcblxuICAvLyBGaWxsIDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVybiAwO1xuICBpZiAodGhpcy5sZW5ndGggPT0gMCkgcmV0dXJuIDA7XG5cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc3RhcnQgb3V0IG9mIGJvdW5kcycpO1xuICB9XG5cbiAgaWYgKGVuZCA8IDAgfHwgZW5kID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2VuZCBvdXQgb2YgYm91bmRzJyk7XG4gIH1cblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHRoaXNbaV0gPSB2YWx1ZTtcbiAgfVxufVxuXG4vLyBTdGF0aWMgbWV0aG9kc1xuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gaXNCdWZmZXIoYikge1xuICByZXR1cm4gYiBpbnN0YW5jZW9mIEJ1ZmZlciB8fCBiIGluc3RhbmNlb2YgQnVmZmVyO1xufTtcblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIChsaXN0LCB0b3RhbExlbmd0aCkge1xuICBpZiAoIWlzQXJyYXkobGlzdCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJVc2FnZTogQnVmZmVyLmNvbmNhdChsaXN0LCBbdG90YWxMZW5ndGhdKVxcbiBcXFxuICAgICAgbGlzdCBzaG91bGQgYmUgYW4gQXJyYXkuXCIpO1xuICB9XG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoMCk7XG4gIH0gZWxzZSBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbGlzdFswXTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgdG90YWxMZW5ndGggIT09ICdudW1iZXInKSB7XG4gICAgdG90YWxMZW5ndGggPSAwO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGJ1ZiA9IGxpc3RbaV07XG4gICAgICB0b3RhbExlbmd0aCArPSBidWYubGVuZ3RoO1xuICAgIH1cbiAgfVxuXG4gIHZhciBidWZmZXIgPSBuZXcgQnVmZmVyKHRvdGFsTGVuZ3RoKTtcbiAgdmFyIHBvcyA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBidWYgPSBsaXN0W2ldO1xuICAgIGJ1Zi5jb3B5KGJ1ZmZlciwgcG9zKTtcbiAgICBwb3MgKz0gYnVmLmxlbmd0aDtcbiAgfVxuICByZXR1cm4gYnVmZmVyO1xufTtcblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbihlbmNvZGluZykge1xuICBzd2l0Y2ggKChlbmNvZGluZyArICcnKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgICByZXR1cm4gdHJ1ZTtcblxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn07XG5cbi8vIGhlbHBlcnNcblxuZnVuY3Rpb24gY29lcmNlKGxlbmd0aCkge1xuICAvLyBDb2VyY2UgbGVuZ3RoIHRvIGEgbnVtYmVyIChwb3NzaWJseSBOYU4pLCByb3VuZCB1cFxuICAvLyBpbiBjYXNlIGl0J3MgZnJhY3Rpb25hbCAoZS5nLiAxMjMuNDU2KSB0aGVuIGRvIGFcbiAgLy8gZG91YmxlIG5lZ2F0ZSB0byBjb2VyY2UgYSBOYU4gdG8gMC4gRWFzeSwgcmlnaHQ/XG4gIGxlbmd0aCA9IH5+TWF0aC5jZWlsKCtsZW5ndGgpO1xuICByZXR1cm4gbGVuZ3RoIDwgMCA/IDAgOiBsZW5ndGg7XG59XG5cbmZ1bmN0aW9uIGlzQXJyYXkoc3ViamVjdCkge1xuICByZXR1cm4gKEFycmF5LmlzQXJyYXkgfHxcbiAgICBmdW5jdGlvbihzdWJqZWN0KXtcbiAgICAgIHJldHVybiB7fS50b1N0cmluZy5hcHBseShzdWJqZWN0KSA9PSAnW29iamVjdCBBcnJheV0nXG4gICAgfSlcbiAgICAoc3ViamVjdClcbn1cblxuZnVuY3Rpb24gaXNBcnJheUlzaChzdWJqZWN0KSB7XG4gIHJldHVybiBpc0FycmF5KHN1YmplY3QpIHx8IEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSB8fFxuICAgICAgICAgc3ViamVjdCAmJiB0eXBlb2Ygc3ViamVjdCA9PT0gJ29iamVjdCcgJiZcbiAgICAgICAgIHR5cGVvZiBzdWJqZWN0Lmxlbmd0aCA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIHRvSGV4KG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpO1xuICByZXR1cm4gbi50b1N0cmluZygxNik7XG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKVxuICAgIGlmIChzdHIuY2hhckNvZGVBdChpKSA8PSAweDdGKVxuICAgICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpO1xuICAgIGVsc2Uge1xuICAgICAgdmFyIGggPSBlbmNvZGVVUklDb21wb25lbnQoc3RyLmNoYXJBdChpKSkuc3Vic3RyKDEpLnNwbGl0KCclJyk7XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGgubGVuZ3RoOyBqKyspXG4gICAgICAgIGJ5dGVBcnJheS5wdXNoKHBhcnNlSW50KGhbal0sIDE2KSk7XG4gICAgfVxuXG4gIHJldHVybiBieXRlQXJyYXk7XG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyhzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrIClcbiAgICAvLyBOb2RlJ3MgY29kZSBzZWVtcyB0byBiZSBkb2luZyB0aGlzIGFuZCBub3QgJiAweDdGLi5cbiAgICBieXRlQXJyYXkucHVzaCggc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGICk7XG5cbiAgcmV0dXJuIGJ5dGVBcnJheTtcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyhzdHIpIHtcbiAgcmV0dXJuIHJlcXVpcmUoXCJiYXNlNjQtanNcIikudG9CeXRlQXJyYXkoc3RyKTtcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlcihzcmMsIGRzdCwgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIHBvcywgaSA9IDA7XG4gIHdoaWxlIChpIDwgbGVuZ3RoKSB7XG4gICAgaWYgKChpK29mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSlcbiAgICAgIGJyZWFrO1xuXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldO1xuICAgIGkrKztcbiAgfVxuICByZXR1cm4gaTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlVXRmOENoYXIoc3RyKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChzdHIpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgweEZGRkQpOyAvLyBVVEYgOCBpbnZhbGlkIGNoYXJcbiAgfVxufVxuXG4vLyByZWFkL3dyaXRlIGJpdC10d2lkZGxpbmdcblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbihvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhciBidWZmZXIgPSB0aGlzO1xuXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQub2sob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLFxuICAgICAgICAnbWlzc2luZyBvZmZzZXQnKTtcblxuICAgIGFzc2VydC5vayhvZmZzZXQgPCBidWZmZXIubGVuZ3RoLFxuICAgICAgICAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKTtcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gYnVmZmVyLmxlbmd0aCkgcmV0dXJuO1xuXG4gIHJldHVybiBidWZmZXJbb2Zmc2V0XTtcbn07XG5cbmZ1bmN0aW9uIHJlYWRVSW50MTYoYnVmZmVyLCBvZmZzZXQsIGlzQmlnRW5kaWFuLCBub0Fzc2VydCkge1xuICB2YXIgdmFsID0gMDtcblxuXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQub2sodHlwZW9mIChpc0JpZ0VuZGlhbikgPT09ICdib29sZWFuJyxcbiAgICAgICAgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKTtcblxuICAgIGFzc2VydC5vayhvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsXG4gICAgICAgICdtaXNzaW5nIG9mZnNldCcpO1xuXG4gICAgYXNzZXJ0Lm9rKG9mZnNldCArIDEgPCBidWZmZXIubGVuZ3RoLFxuICAgICAgICAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKTtcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gYnVmZmVyLmxlbmd0aCkgcmV0dXJuIDA7XG5cbiAgaWYgKGlzQmlnRW5kaWFuKSB7XG4gICAgdmFsID0gYnVmZmVyW29mZnNldF0gPDwgODtcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGJ1ZmZlci5sZW5ndGgpIHtcbiAgICAgIHZhbCB8PSBidWZmZXJbb2Zmc2V0ICsgMV07XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhbCA9IGJ1ZmZlcltvZmZzZXRdO1xuICAgIGlmIChvZmZzZXQgKyAxIDwgYnVmZmVyLmxlbmd0aCkge1xuICAgICAgdmFsIHw9IGJ1ZmZlcltvZmZzZXQgKyAxXSA8PCA4O1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB2YWw7XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkxFID0gZnVuY3Rpb24ob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gcmVhZFVJbnQxNih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydCk7XG59O1xuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHJlYWRVSW50MTYodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydCk7XG59O1xuXG5mdW5jdGlvbiByZWFkVUludDMyKGJ1ZmZlciwgb2Zmc2V0LCBpc0JpZ0VuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgdmFyIHZhbCA9IDA7XG5cbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydC5vayh0eXBlb2YgKGlzQmlnRW5kaWFuKSA9PT0gJ2Jvb2xlYW4nLFxuICAgICAgICAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpO1xuXG4gICAgYXNzZXJ0Lm9rKG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3Npbmcgb2Zmc2V0Jyk7XG5cbiAgICBhc3NlcnQub2sob2Zmc2V0ICsgMyA8IGJ1ZmZlci5sZW5ndGgsXG4gICAgICAgICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpO1xuICB9XG5cbiAgaWYgKG9mZnNldCA+PSBidWZmZXIubGVuZ3RoKSByZXR1cm4gMDtcblxuICBpZiAoaXNCaWdFbmRpYW4pIHtcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGJ1ZmZlci5sZW5ndGgpXG4gICAgICB2YWwgPSBidWZmZXJbb2Zmc2V0ICsgMV0gPDwgMTY7XG4gICAgaWYgKG9mZnNldCArIDIgPCBidWZmZXIubGVuZ3RoKVxuICAgICAgdmFsIHw9IGJ1ZmZlcltvZmZzZXQgKyAyXSA8PCA4O1xuICAgIGlmIChvZmZzZXQgKyAzIDwgYnVmZmVyLmxlbmd0aClcbiAgICAgIHZhbCB8PSBidWZmZXJbb2Zmc2V0ICsgM107XG4gICAgdmFsID0gdmFsICsgKGJ1ZmZlcltvZmZzZXRdIDw8IDI0ID4+PiAwKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAob2Zmc2V0ICsgMiA8IGJ1ZmZlci5sZW5ndGgpXG4gICAgICB2YWwgPSBidWZmZXJbb2Zmc2V0ICsgMl0gPDwgMTY7XG4gICAgaWYgKG9mZnNldCArIDEgPCBidWZmZXIubGVuZ3RoKVxuICAgICAgdmFsIHw9IGJ1ZmZlcltvZmZzZXQgKyAxXSA8PCA4O1xuICAgIHZhbCB8PSBidWZmZXJbb2Zmc2V0XTtcbiAgICBpZiAob2Zmc2V0ICsgMyA8IGJ1ZmZlci5sZW5ndGgpXG4gICAgICB2YWwgPSB2YWwgKyAoYnVmZmVyW29mZnNldCArIDNdIDw8IDI0ID4+PiAwKTtcbiAgfVxuXG4gIHJldHVybiB2YWw7XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24ob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gcmVhZFVJbnQzMih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydCk7XG59O1xuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHJlYWRVSW50MzIodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydCk7XG59O1xuXG5cbi8qXG4gKiBTaWduZWQgaW50ZWdlciB0eXBlcywgeWF5IHRlYW0hIEEgcmVtaW5kZXIgb24gaG93IHR3bydzIGNvbXBsZW1lbnQgYWN0dWFsbHlcbiAqIHdvcmtzLiBUaGUgZmlyc3QgYml0IGlzIHRoZSBzaWduZWQgYml0LCBpLmUuIHRlbGxzIHVzIHdoZXRoZXIgb3Igbm90IHRoZVxuICogbnVtYmVyIHNob3VsZCBiZSBwb3NpdGl2ZSBvciBuZWdhdGl2ZS4gSWYgdGhlIHR3bydzIGNvbXBsZW1lbnQgdmFsdWUgaXNcbiAqIHBvc2l0aXZlLCB0aGVuIHdlJ3JlIGRvbmUsIGFzIGl0J3MgZXF1aXZhbGVudCB0byB0aGUgdW5zaWduZWQgcmVwcmVzZW50YXRpb24uXG4gKlxuICogTm93IGlmIHRoZSBudW1iZXIgaXMgcG9zaXRpdmUsIHlvdSdyZSBwcmV0dHkgbXVjaCBkb25lLCB5b3UgY2FuIGp1c3QgbGV2ZXJhZ2VcbiAqIHRoZSB1bnNpZ25lZCB0cmFuc2xhdGlvbnMgYW5kIHJldHVybiB0aG9zZS4gVW5mb3J0dW5hdGVseSwgbmVnYXRpdmUgbnVtYmVyc1xuICogYXJlbid0IHF1aXRlIHRoYXQgc3RyYWlnaHRmb3J3YXJkLlxuICpcbiAqIEF0IGZpcnN0IGdsYW5jZSwgb25lIG1pZ2h0IGJlIGluY2xpbmVkIHRvIHVzZSB0aGUgdHJhZGl0aW9uYWwgZm9ybXVsYSB0b1xuICogdHJhbnNsYXRlIGJpbmFyeSBudW1iZXJzIGJldHdlZW4gdGhlIHBvc2l0aXZlIGFuZCBuZWdhdGl2ZSB2YWx1ZXMgaW4gdHdvJ3NcbiAqIGNvbXBsZW1lbnQuIChUaG91Z2ggaXQgZG9lc24ndCBxdWl0ZSB3b3JrIGZvciB0aGUgbW9zdCBuZWdhdGl2ZSB2YWx1ZSlcbiAqIE1haW5seTpcbiAqICAtIGludmVydCBhbGwgdGhlIGJpdHNcbiAqICAtIGFkZCBvbmUgdG8gdGhlIHJlc3VsdFxuICpcbiAqIE9mIGNvdXJzZSwgdGhpcyBkb2Vzbid0IHF1aXRlIHdvcmsgaW4gSmF2YXNjcmlwdC4gVGFrZSBmb3IgZXhhbXBsZSB0aGUgdmFsdWVcbiAqIG9mIC0xMjguIFRoaXMgY291bGQgYmUgcmVwcmVzZW50ZWQgaW4gMTYgYml0cyAoYmlnLWVuZGlhbikgYXMgMHhmZjgwLiBCdXQgb2ZcbiAqIGNvdXJzZSwgSmF2YXNjcmlwdCB3aWxsIGRvIHRoZSBmb2xsb3dpbmc6XG4gKlxuICogPiB+MHhmZjgwXG4gKiAtNjU0MDlcbiAqXG4gKiBXaG9oIHRoZXJlLCBKYXZhc2NyaXB0LCB0aGF0J3Mgbm90IHF1aXRlIHJpZ2h0LiBCdXQgd2FpdCwgYWNjb3JkaW5nIHRvXG4gKiBKYXZhc2NyaXB0IHRoYXQncyBwZXJmZWN0bHkgY29ycmVjdC4gV2hlbiBKYXZhc2NyaXB0IGVuZHMgdXAgc2VlaW5nIHRoZVxuICogY29uc3RhbnQgMHhmZjgwLCBpdCBoYXMgbm8gbm90aW9uIHRoYXQgaXQgaXMgYWN0dWFsbHkgYSBzaWduZWQgbnVtYmVyLiBJdFxuICogYXNzdW1lcyB0aGF0IHdlJ3ZlIGlucHV0IHRoZSB1bnNpZ25lZCB2YWx1ZSAweGZmODAuIFRodXMsIHdoZW4gaXQgZG9lcyB0aGVcbiAqIGJpbmFyeSBuZWdhdGlvbiwgaXQgY2FzdHMgaXQgaW50byBhIHNpZ25lZCB2YWx1ZSwgKHBvc2l0aXZlIDB4ZmY4MCkuIFRoZW5cbiAqIHdoZW4geW91IHBlcmZvcm0gYmluYXJ5IG5lZ2F0aW9uIG9uIHRoYXQsIGl0IHR1cm5zIGl0IGludG8gYSBuZWdhdGl2ZSBudW1iZXIuXG4gKlxuICogSW5zdGVhZCwgd2UncmUgZ29pbmcgdG8gaGF2ZSB0byB1c2UgdGhlIGZvbGxvd2luZyBnZW5lcmFsIGZvcm11bGEsIHRoYXQgd29ya3NcbiAqIGluIGEgcmF0aGVyIEphdmFzY3JpcHQgZnJpZW5kbHkgd2F5LiBJJ20gZ2xhZCB3ZSBkb24ndCBzdXBwb3J0IHRoaXMga2luZCBvZlxuICogd2VpcmQgbnVtYmVyaW5nIHNjaGVtZSBpbiB0aGUga2VybmVsLlxuICpcbiAqIChCSVQtTUFYIC0gKHVuc2lnbmVkKXZhbCArIDEpICogLTFcbiAqXG4gKiBUaGUgYXN0dXRlIG9ic2VydmVyLCBtYXkgdGhpbmsgdGhhdCB0aGlzIGRvZXNuJ3QgbWFrZSBzZW5zZSBmb3IgOC1iaXQgbnVtYmVyc1xuICogKHJlYWxseSBpdCBpc24ndCBuZWNlc3NhcnkgZm9yIHRoZW0pLiBIb3dldmVyLCB3aGVuIHlvdSBnZXQgMTYtYml0IG51bWJlcnMsXG4gKiB5b3UgZG8uIExldCdzIGdvIGJhY2sgdG8gb3VyIHByaW9yIGV4YW1wbGUgYW5kIHNlZSBob3cgdGhpcyB3aWxsIGxvb2s6XG4gKlxuICogKDB4ZmZmZiAtIDB4ZmY4MCArIDEpICogLTFcbiAqICgweDAwN2YgKyAxKSAqIC0xXG4gKiAoMHgwMDgwKSAqIC0xXG4gKi9cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbihvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhciBidWZmZXIgPSB0aGlzO1xuICB2YXIgbmVnO1xuXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQub2sob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLFxuICAgICAgICAnbWlzc2luZyBvZmZzZXQnKTtcblxuICAgIGFzc2VydC5vayhvZmZzZXQgPCBidWZmZXIubGVuZ3RoLFxuICAgICAgICAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKTtcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gYnVmZmVyLmxlbmd0aCkgcmV0dXJuO1xuXG4gIG5lZyA9IGJ1ZmZlcltvZmZzZXRdICYgMHg4MDtcbiAgaWYgKCFuZWcpIHtcbiAgICByZXR1cm4gKGJ1ZmZlcltvZmZzZXRdKTtcbiAgfVxuXG4gIHJldHVybiAoKDB4ZmYgLSBidWZmZXJbb2Zmc2V0XSArIDEpICogLTEpO1xufTtcblxuZnVuY3Rpb24gcmVhZEludDE2KGJ1ZmZlciwgb2Zmc2V0LCBpc0JpZ0VuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgdmFyIG5lZywgdmFsO1xuXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQub2sodHlwZW9mIChpc0JpZ0VuZGlhbikgPT09ICdib29sZWFuJyxcbiAgICAgICAgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKTtcblxuICAgIGFzc2VydC5vayhvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsXG4gICAgICAgICdtaXNzaW5nIG9mZnNldCcpO1xuXG4gICAgYXNzZXJ0Lm9rKG9mZnNldCArIDEgPCBidWZmZXIubGVuZ3RoLFxuICAgICAgICAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKTtcbiAgfVxuXG4gIHZhbCA9IHJlYWRVSW50MTYoYnVmZmVyLCBvZmZzZXQsIGlzQmlnRW5kaWFuLCBub0Fzc2VydCk7XG4gIG5lZyA9IHZhbCAmIDB4ODAwMDtcbiAgaWYgKCFuZWcpIHtcbiAgICByZXR1cm4gdmFsO1xuICB9XG5cbiAgcmV0dXJuICgweGZmZmYgLSB2YWwgKyAxKSAqIC0xO1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24ob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gcmVhZEludDE2KHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KTtcbn07XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbihvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiByZWFkSW50MTYodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydCk7XG59O1xuXG5mdW5jdGlvbiByZWFkSW50MzIoYnVmZmVyLCBvZmZzZXQsIGlzQmlnRW5kaWFuLCBub0Fzc2VydCkge1xuICB2YXIgbmVnLCB2YWw7XG5cbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydC5vayh0eXBlb2YgKGlzQmlnRW5kaWFuKSA9PT0gJ2Jvb2xlYW4nLFxuICAgICAgICAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpO1xuXG4gICAgYXNzZXJ0Lm9rKG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3Npbmcgb2Zmc2V0Jyk7XG5cbiAgICBhc3NlcnQub2sob2Zmc2V0ICsgMyA8IGJ1ZmZlci5sZW5ndGgsXG4gICAgICAgICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpO1xuICB9XG5cbiAgdmFsID0gcmVhZFVJbnQzMihidWZmZXIsIG9mZnNldCwgaXNCaWdFbmRpYW4sIG5vQXNzZXJ0KTtcbiAgbmVnID0gdmFsICYgMHg4MDAwMDAwMDtcbiAgaWYgKCFuZWcpIHtcbiAgICByZXR1cm4gKHZhbCk7XG4gIH1cblxuICByZXR1cm4gKDB4ZmZmZmZmZmYgLSB2YWwgKyAxKSAqIC0xO1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24ob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gcmVhZEludDMyKHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KTtcbn07XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbihvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiByZWFkSW50MzIodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydCk7XG59O1xuXG5mdW5jdGlvbiByZWFkRmxvYXQoYnVmZmVyLCBvZmZzZXQsIGlzQmlnRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0Lm9rKHR5cGVvZiAoaXNCaWdFbmRpYW4pID09PSAnYm9vbGVhbicsXG4gICAgICAgICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJyk7XG5cbiAgICBhc3NlcnQub2sob2Zmc2V0ICsgMyA8IGJ1ZmZlci5sZW5ndGgsXG4gICAgICAgICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpO1xuICB9XG5cbiAgcmV0dXJuIHJlcXVpcmUoJy4vYnVmZmVyX2llZWU3NTQnKS5yZWFkSUVFRTc1NChidWZmZXIsIG9mZnNldCwgaXNCaWdFbmRpYW4sXG4gICAgICAyMywgNCk7XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbihvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiByZWFkRmxvYXQodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpO1xufTtcblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHJlYWRGbG9hdCh0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KTtcbn07XG5cbmZ1bmN0aW9uIHJlYWREb3VibGUoYnVmZmVyLCBvZmZzZXQsIGlzQmlnRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0Lm9rKHR5cGVvZiAoaXNCaWdFbmRpYW4pID09PSAnYm9vbGVhbicsXG4gICAgICAgICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJyk7XG5cbiAgICBhc3NlcnQub2sob2Zmc2V0ICsgNyA8IGJ1ZmZlci5sZW5ndGgsXG4gICAgICAgICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpO1xuICB9XG5cbiAgcmV0dXJuIHJlcXVpcmUoJy4vYnVmZmVyX2llZWU3NTQnKS5yZWFkSUVFRTc1NChidWZmZXIsIG9mZnNldCwgaXNCaWdFbmRpYW4sXG4gICAgICA1MiwgOCk7XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24ob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gcmVhZERvdWJsZSh0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydCk7XG59O1xuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHJlYWREb3VibGUodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydCk7XG59O1xuXG5cbi8qXG4gKiBXZSBoYXZlIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSB2YWx1ZSBpcyBhIHZhbGlkIGludGVnZXIuIFRoaXMgbWVhbnMgdGhhdCBpdCBpc1xuICogbm9uLW5lZ2F0aXZlLiBJdCBoYXMgbm8gZnJhY3Rpb25hbCBjb21wb25lbnQgYW5kIHRoYXQgaXQgZG9lcyBub3QgZXhjZWVkIHRoZVxuICogbWF4aW11bSBhbGxvd2VkIHZhbHVlLlxuICpcbiAqICAgICAgdmFsdWUgICAgICAgICAgIFRoZSBudW1iZXIgdG8gY2hlY2sgZm9yIHZhbGlkaXR5XG4gKlxuICogICAgICBtYXggICAgICAgICAgICAgVGhlIG1heGltdW0gdmFsdWVcbiAqL1xuZnVuY3Rpb24gdmVyaWZ1aW50KHZhbHVlLCBtYXgpIHtcbiAgYXNzZXJ0Lm9rKHR5cGVvZiAodmFsdWUpID09ICdudW1iZXInLFxuICAgICAgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKTtcblxuICBhc3NlcnQub2sodmFsdWUgPj0gMCxcbiAgICAgICdzcGVjaWZpZWQgYSBuZWdhdGl2ZSB2YWx1ZSBmb3Igd3JpdGluZyBhbiB1bnNpZ25lZCB2YWx1ZScpO1xuXG4gIGFzc2VydC5vayh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBpcyBsYXJnZXIgdGhhbiBtYXhpbXVtIHZhbHVlIGZvciB0eXBlJyk7XG5cbiAgYXNzZXJ0Lm9rKE1hdGguZmxvb3IodmFsdWUpID09PSB2YWx1ZSwgJ3ZhbHVlIGhhcyBhIGZyYWN0aW9uYWwgY29tcG9uZW50Jyk7XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhciBidWZmZXIgPSB0aGlzO1xuXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQub2sodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3NpbmcgdmFsdWUnKTtcblxuICAgIGFzc2VydC5vayhvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsXG4gICAgICAgICdtaXNzaW5nIG9mZnNldCcpO1xuXG4gICAgYXNzZXJ0Lm9rKG9mZnNldCA8IGJ1ZmZlci5sZW5ndGgsXG4gICAgICAgICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKTtcblxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZik7XG4gIH1cblxuICBpZiAob2Zmc2V0IDwgYnVmZmVyLmxlbmd0aCkge1xuICAgIGJ1ZmZlcltvZmZzZXRdID0gdmFsdWU7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHdyaXRlVUludDE2KGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNCaWdFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQub2sodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3NpbmcgdmFsdWUnKTtcblxuICAgIGFzc2VydC5vayh0eXBlb2YgKGlzQmlnRW5kaWFuKSA9PT0gJ2Jvb2xlYW4nLFxuICAgICAgICAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpO1xuXG4gICAgYXNzZXJ0Lm9rKG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3Npbmcgb2Zmc2V0Jyk7XG5cbiAgICBhc3NlcnQub2sob2Zmc2V0ICsgMSA8IGJ1ZmZlci5sZW5ndGgsXG4gICAgICAgICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKTtcblxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZmZmKTtcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgTWF0aC5taW4oYnVmZmVyLmxlbmd0aCAtIG9mZnNldCwgMik7IGkrKykge1xuICAgIGJ1ZmZlcltvZmZzZXQgKyBpXSA9XG4gICAgICAgICh2YWx1ZSAmICgweGZmIDw8ICg4ICogKGlzQmlnRW5kaWFuID8gMSAtIGkgOiBpKSkpKSA+Pj5cbiAgICAgICAgICAgIChpc0JpZ0VuZGlhbiA/IDEgLSBpIDogaSkgKiA4O1xuICB9XG5cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24odmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgd3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KTtcbn07XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KTtcbn07XG5cbmZ1bmN0aW9uIHdyaXRlVUludDMyKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNCaWdFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQub2sodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3NpbmcgdmFsdWUnKTtcblxuICAgIGFzc2VydC5vayh0eXBlb2YgKGlzQmlnRW5kaWFuKSA9PT0gJ2Jvb2xlYW4nLFxuICAgICAgICAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpO1xuXG4gICAgYXNzZXJ0Lm9rKG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3Npbmcgb2Zmc2V0Jyk7XG5cbiAgICBhc3NlcnQub2sob2Zmc2V0ICsgMyA8IGJ1ZmZlci5sZW5ndGgsXG4gICAgICAgICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKTtcblxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZmZmZmZmZik7XG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IE1hdGgubWluKGJ1ZmZlci5sZW5ndGggLSBvZmZzZXQsIDQpOyBpKyspIHtcbiAgICBidWZmZXJbb2Zmc2V0ICsgaV0gPVxuICAgICAgICAodmFsdWUgPj4+IChpc0JpZ0VuZGlhbiA/IDMgLSBpIDogaSkgKiA4KSAmIDB4ZmY7XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24odmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgd3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KTtcbn07XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KTtcbn07XG5cblxuLypcbiAqIFdlIG5vdyBtb3ZlIG9udG8gb3VyIGZyaWVuZHMgaW4gdGhlIHNpZ25lZCBudW1iZXIgY2F0ZWdvcnkuIFVubGlrZSB1bnNpZ25lZFxuICogbnVtYmVycywgd2UncmUgZ29pbmcgdG8gaGF2ZSB0byB3b3JyeSBhIGJpdCBtb3JlIGFib3V0IGhvdyB3ZSBwdXQgdmFsdWVzIGludG9cbiAqIGFycmF5cy4gU2luY2Ugd2UgYXJlIG9ubHkgd29ycnlpbmcgYWJvdXQgc2lnbmVkIDMyLWJpdCB2YWx1ZXMsIHdlJ3JlIGluXG4gKiBzbGlnaHRseSBiZXR0ZXIgc2hhcGUuIFVuZm9ydHVuYXRlbHksIHdlIHJlYWxseSBjYW4ndCBkbyBvdXIgZmF2b3JpdGUgYmluYXJ5XG4gKiAmIGluIHRoaXMgc3lzdGVtLiBJdCByZWFsbHkgc2VlbXMgdG8gZG8gdGhlIHdyb25nIHRoaW5nLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiA+IC0zMiAmIDB4ZmZcbiAqIDIyNFxuICpcbiAqIFdoYXQncyBoYXBwZW5pbmcgYWJvdmUgaXMgcmVhbGx5OiAweGUwICYgMHhmZiA9IDB4ZTAuIEhvd2V2ZXIsIHRoZSByZXN1bHRzIG9mXG4gKiB0aGlzIGFyZW4ndCB0cmVhdGVkIGFzIGEgc2lnbmVkIG51bWJlci4gVWx0aW1hdGVseSBhIGJhZCB0aGluZy5cbiAqXG4gKiBXaGF0IHdlJ3JlIGdvaW5nIHRvIHdhbnQgdG8gZG8gaXMgYmFzaWNhbGx5IGNyZWF0ZSB0aGUgdW5zaWduZWQgZXF1aXZhbGVudCBvZlxuICogb3VyIHJlcHJlc2VudGF0aW9uIGFuZCBwYXNzIHRoYXQgb2ZmIHRvIHRoZSB3dWludCogZnVuY3Rpb25zLiBUbyBkbyB0aGF0XG4gKiB3ZSdyZSBnb2luZyB0byBkbyB0aGUgZm9sbG93aW5nOlxuICpcbiAqICAtIGlmIHRoZSB2YWx1ZSBpcyBwb3NpdGl2ZVxuICogICAgICB3ZSBjYW4gcGFzcyBpdCBkaXJlY3RseSBvZmYgdG8gdGhlIGVxdWl2YWxlbnQgd3VpbnRcbiAqICAtIGlmIHRoZSB2YWx1ZSBpcyBuZWdhdGl2ZVxuICogICAgICB3ZSBkbyB0aGUgZm9sbG93aW5nIGNvbXB1dGF0aW9uOlxuICogICAgICAgICBtYiArIHZhbCArIDEsIHdoZXJlXG4gKiAgICAgICAgIG1iICAgaXMgdGhlIG1heGltdW0gdW5zaWduZWQgdmFsdWUgaW4gdGhhdCBieXRlIHNpemVcbiAqICAgICAgICAgdmFsICBpcyB0aGUgSmF2YXNjcmlwdCBuZWdhdGl2ZSBpbnRlZ2VyXG4gKlxuICpcbiAqIEFzIGEgY29uY3JldGUgdmFsdWUsIHRha2UgLTEyOC4gSW4gc2lnbmVkIDE2IGJpdHMgdGhpcyB3b3VsZCBiZSAweGZmODAuIElmXG4gKiB5b3UgZG8gb3V0IHRoZSBjb21wdXRhdGlvbnM6XG4gKlxuICogMHhmZmZmIC0gMTI4ICsgMVxuICogMHhmZmZmIC0gMTI3XG4gKiAweGZmODBcbiAqXG4gKiBZb3UgY2FuIHRoZW4gZW5jb2RlIHRoaXMgdmFsdWUgYXMgdGhlIHNpZ25lZCB2ZXJzaW9uLiBUaGlzIGlzIHJlYWxseSByYXRoZXJcbiAqIGhhY2t5LCBidXQgaXQgc2hvdWxkIHdvcmsgYW5kIGdldCB0aGUgam9iIGRvbmUgd2hpY2ggaXMgb3VyIGdvYWwgaGVyZS5cbiAqL1xuXG4vKlxuICogQSBzZXJpZXMgb2YgY2hlY2tzIHRvIG1ha2Ugc3VyZSB3ZSBhY3R1YWxseSBoYXZlIGEgc2lnbmVkIDMyLWJpdCBudW1iZXJcbiAqL1xuZnVuY3Rpb24gdmVyaWZzaW50KHZhbHVlLCBtYXgsIG1pbikge1xuICBhc3NlcnQub2sodHlwZW9mICh2YWx1ZSkgPT0gJ251bWJlcicsXG4gICAgICAnY2Fubm90IHdyaXRlIGEgbm9uLW51bWJlciBhcyBhIG51bWJlcicpO1xuXG4gIGFzc2VydC5vayh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBsYXJnZXIgdGhhbiBtYXhpbXVtIGFsbG93ZWQgdmFsdWUnKTtcblxuICBhc3NlcnQub2sodmFsdWUgPj0gbWluLCAndmFsdWUgc21hbGxlciB0aGFuIG1pbmltdW0gYWxsb3dlZCB2YWx1ZScpO1xuXG4gIGFzc2VydC5vayhNYXRoLmZsb29yKHZhbHVlKSA9PT0gdmFsdWUsICd2YWx1ZSBoYXMgYSBmcmFjdGlvbmFsIGNvbXBvbmVudCcpO1xufVxuXG5mdW5jdGlvbiB2ZXJpZklFRUU3NTQodmFsdWUsIG1heCwgbWluKSB7XG4gIGFzc2VydC5vayh0eXBlb2YgKHZhbHVlKSA9PSAnbnVtYmVyJyxcbiAgICAgICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJyk7XG5cbiAgYXNzZXJ0Lm9rKHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGxhcmdlciB0aGFuIG1heGltdW0gYWxsb3dlZCB2YWx1ZScpO1xuXG4gIGFzc2VydC5vayh2YWx1ZSA+PSBtaW4sICd2YWx1ZSBzbWFsbGVyIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlJyk7XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQ4ID0gZnVuY3Rpb24odmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFyIGJ1ZmZlciA9IHRoaXM7XG5cbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydC5vayh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLFxuICAgICAgICAnbWlzc2luZyB2YWx1ZScpO1xuXG4gICAgYXNzZXJ0Lm9rKG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3Npbmcgb2Zmc2V0Jyk7XG5cbiAgICBhc3NlcnQub2sob2Zmc2V0IDwgYnVmZmVyLmxlbmd0aCxcbiAgICAgICAgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpO1xuXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmLCAtMHg4MCk7XG4gIH1cblxuICBpZiAodmFsdWUgPj0gMCkge1xuICAgIGJ1ZmZlci53cml0ZVVJbnQ4KHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KTtcbiAgfSBlbHNlIHtcbiAgICBidWZmZXIud3JpdGVVSW50OCgweGZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIG5vQXNzZXJ0KTtcbiAgfVxufTtcblxuZnVuY3Rpb24gd3JpdGVJbnQxNihidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzQmlnRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0Lm9rKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsXG4gICAgICAgICdtaXNzaW5nIHZhbHVlJyk7XG5cbiAgICBhc3NlcnQub2sodHlwZW9mIChpc0JpZ0VuZGlhbikgPT09ICdib29sZWFuJyxcbiAgICAgICAgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKTtcblxuICAgIGFzc2VydC5vayhvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsXG4gICAgICAgICdtaXNzaW5nIG9mZnNldCcpO1xuXG4gICAgYXNzZXJ0Lm9rKG9mZnNldCArIDEgPCBidWZmZXIubGVuZ3RoLFxuICAgICAgICAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJyk7XG5cbiAgICB2ZXJpZnNpbnQodmFsdWUsIDB4N2ZmZiwgLTB4ODAwMCk7XG4gIH1cblxuICBpZiAodmFsdWUgPj0gMCkge1xuICAgIHdyaXRlVUludDE2KGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNCaWdFbmRpYW4sIG5vQXNzZXJ0KTtcbiAgfSBlbHNlIHtcbiAgICB3cml0ZVVJbnQxNihidWZmZXIsIDB4ZmZmZiArIHZhbHVlICsgMSwgb2Zmc2V0LCBpc0JpZ0VuZGlhbiwgbm9Bc3NlcnQpO1xuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24odmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgd3JpdGVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpO1xufTtcblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbih2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB3cml0ZUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KTtcbn07XG5cbmZ1bmN0aW9uIHdyaXRlSW50MzIoYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0JpZ0VuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydC5vayh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLFxuICAgICAgICAnbWlzc2luZyB2YWx1ZScpO1xuXG4gICAgYXNzZXJ0Lm9rKHR5cGVvZiAoaXNCaWdFbmRpYW4pID09PSAnYm9vbGVhbicsXG4gICAgICAgICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJyk7XG5cbiAgICBhc3NlcnQub2sob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLFxuICAgICAgICAnbWlzc2luZyBvZmZzZXQnKTtcblxuICAgIGFzc2VydC5vayhvZmZzZXQgKyAzIDwgYnVmZmVyLmxlbmd0aCxcbiAgICAgICAgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpO1xuXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMCk7XG4gIH1cblxuICBpZiAodmFsdWUgPj0gMCkge1xuICAgIHdyaXRlVUludDMyKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNCaWdFbmRpYW4sIG5vQXNzZXJ0KTtcbiAgfSBlbHNlIHtcbiAgICB3cml0ZVVJbnQzMihidWZmZXIsIDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgaXNCaWdFbmRpYW4sIG5vQXNzZXJ0KTtcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHdyaXRlSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KTtcbn07XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24odmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgd3JpdGVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydCk7XG59O1xuXG5mdW5jdGlvbiB3cml0ZUZsb2F0KGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNCaWdFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQub2sodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3NpbmcgdmFsdWUnKTtcblxuICAgIGFzc2VydC5vayh0eXBlb2YgKGlzQmlnRW5kaWFuKSA9PT0gJ2Jvb2xlYW4nLFxuICAgICAgICAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpO1xuXG4gICAgYXNzZXJ0Lm9rKG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3Npbmcgb2Zmc2V0Jyk7XG5cbiAgICBhc3NlcnQub2sob2Zmc2V0ICsgMyA8IGJ1ZmZlci5sZW5ndGgsXG4gICAgICAgICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKTtcblxuICAgIHZlcmlmSUVFRTc1NCh2YWx1ZSwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpO1xuICB9XG5cbiAgcmVxdWlyZSgnLi9idWZmZXJfaWVlZTc1NCcpLndyaXRlSUVFRTc1NChidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzQmlnRW5kaWFuLFxuICAgICAgMjMsIDQpO1xufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KTtcbn07XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24odmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydCk7XG59O1xuXG5mdW5jdGlvbiB3cml0ZURvdWJsZShidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzQmlnRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0Lm9rKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsXG4gICAgICAgICdtaXNzaW5nIHZhbHVlJyk7XG5cbiAgICBhc3NlcnQub2sodHlwZW9mIChpc0JpZ0VuZGlhbikgPT09ICdib29sZWFuJyxcbiAgICAgICAgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKTtcblxuICAgIGFzc2VydC5vayhvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsXG4gICAgICAgICdtaXNzaW5nIG9mZnNldCcpO1xuXG4gICAgYXNzZXJ0Lm9rKG9mZnNldCArIDcgPCBidWZmZXIubGVuZ3RoLFxuICAgICAgICAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJyk7XG5cbiAgICB2ZXJpZklFRUU3NTQodmFsdWUsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpO1xuICB9XG5cbiAgcmVxdWlyZSgnLi9idWZmZXJfaWVlZTc1NCcpLndyaXRlSUVFRTc1NChidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzQmlnRW5kaWFuLFxuICAgICAgNTIsIDgpO1xufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbih2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpO1xufTtcblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24odmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpO1xufTtcbiIsIihmdW5jdGlvbiAoZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIGxvb2t1cCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcblxuXHRmdW5jdGlvbiBiNjRUb0J5dGVBcnJheShiNjQpIHtcblx0XHR2YXIgaSwgaiwgbCwgdG1wLCBwbGFjZUhvbGRlcnMsIGFycjtcblx0XG5cdFx0aWYgKGI2NC5sZW5ndGggJSA0ID4gMCkge1xuXHRcdFx0dGhyb3cgJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnO1xuXHRcdH1cblxuXHRcdC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuXHRcdC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuXHRcdC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuXHRcdC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2Vcblx0XHRwbGFjZUhvbGRlcnMgPSBiNjQuaW5kZXhPZignPScpO1xuXHRcdHBsYWNlSG9sZGVycyA9IHBsYWNlSG9sZGVycyA+IDAgPyBiNjQubGVuZ3RoIC0gcGxhY2VIb2xkZXJzIDogMDtcblxuXHRcdC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuXHRcdGFyciA9IFtdOy8vbmV3IFVpbnQ4QXJyYXkoYjY0Lmxlbmd0aCAqIDMgLyA0IC0gcGxhY2VIb2xkZXJzKTtcblxuXHRcdC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcblx0XHRsID0gcGxhY2VIb2xkZXJzID4gMCA/IGI2NC5sZW5ndGggLSA0IDogYjY0Lmxlbmd0aDtcblxuXHRcdGZvciAoaSA9IDAsIGogPSAwOyBpIDwgbDsgaSArPSA0LCBqICs9IDMpIHtcblx0XHRcdHRtcCA9IChsb29rdXAuaW5kZXhPZihiNjRbaV0pIDw8IDE4KSB8IChsb29rdXAuaW5kZXhPZihiNjRbaSArIDFdKSA8PCAxMikgfCAobG9va3VwLmluZGV4T2YoYjY0W2kgKyAyXSkgPDwgNikgfCBsb29rdXAuaW5kZXhPZihiNjRbaSArIDNdKTtcblx0XHRcdGFyci5wdXNoKCh0bXAgJiAweEZGMDAwMCkgPj4gMTYpO1xuXHRcdFx0YXJyLnB1c2goKHRtcCAmIDB4RkYwMCkgPj4gOCk7XG5cdFx0XHRhcnIucHVzaCh0bXAgJiAweEZGKTtcblx0XHR9XG5cblx0XHRpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG5cdFx0XHR0bXAgPSAobG9va3VwLmluZGV4T2YoYjY0W2ldKSA8PCAyKSB8IChsb29rdXAuaW5kZXhPZihiNjRbaSArIDFdKSA+PiA0KTtcblx0XHRcdGFyci5wdXNoKHRtcCAmIDB4RkYpO1xuXHRcdH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG5cdFx0XHR0bXAgPSAobG9va3VwLmluZGV4T2YoYjY0W2ldKSA8PCAxMCkgfCAobG9va3VwLmluZGV4T2YoYjY0W2kgKyAxXSkgPDwgNCkgfCAobG9va3VwLmluZGV4T2YoYjY0W2kgKyAyXSkgPj4gMik7XG5cdFx0XHRhcnIucHVzaCgodG1wID4+IDgpICYgMHhGRik7XG5cdFx0XHRhcnIucHVzaCh0bXAgJiAweEZGKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gYXJyO1xuXHR9XG5cblx0ZnVuY3Rpb24gdWludDhUb0Jhc2U2NCh1aW50OCkge1xuXHRcdHZhciBpLFxuXHRcdFx0ZXh0cmFCeXRlcyA9IHVpbnQ4Lmxlbmd0aCAlIDMsIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG5cdFx0XHRvdXRwdXQgPSBcIlwiLFxuXHRcdFx0dGVtcCwgbGVuZ3RoO1xuXG5cdFx0ZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcblx0XHRcdHJldHVybiBsb29rdXBbbnVtID4+IDE4ICYgMHgzRl0gKyBsb29rdXBbbnVtID4+IDEyICYgMHgzRl0gKyBsb29rdXBbbnVtID4+IDYgJiAweDNGXSArIGxvb2t1cFtudW0gJiAweDNGXTtcblx0XHR9O1xuXG5cdFx0Ly8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuXHRcdGZvciAoaSA9IDAsIGxlbmd0aCA9IHVpbnQ4Lmxlbmd0aCAtIGV4dHJhQnl0ZXM7IGkgPCBsZW5ndGg7IGkgKz0gMykge1xuXHRcdFx0dGVtcCA9ICh1aW50OFtpXSA8PCAxNikgKyAodWludDhbaSArIDFdIDw8IDgpICsgKHVpbnQ4W2kgKyAyXSk7XG5cdFx0XHRvdXRwdXQgKz0gdHJpcGxldFRvQmFzZTY0KHRlbXApO1xuXHRcdH1cblxuXHRcdC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcblx0XHRzd2l0Y2ggKGV4dHJhQnl0ZXMpIHtcblx0XHRcdGNhc2UgMTpcblx0XHRcdFx0dGVtcCA9IHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdO1xuXHRcdFx0XHRvdXRwdXQgKz0gbG9va3VwW3RlbXAgPj4gMl07XG5cdFx0XHRcdG91dHB1dCArPSBsb29rdXBbKHRlbXAgPDwgNCkgJiAweDNGXTtcblx0XHRcdFx0b3V0cHV0ICs9ICc9PSc7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHR0ZW1wID0gKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDJdIDw8IDgpICsgKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdKTtcblx0XHRcdFx0b3V0cHV0ICs9IGxvb2t1cFt0ZW1wID4+IDEwXTtcblx0XHRcdFx0b3V0cHV0ICs9IGxvb2t1cFsodGVtcCA+PiA0KSAmIDB4M0ZdO1xuXHRcdFx0XHRvdXRwdXQgKz0gbG9va3VwWyh0ZW1wIDw8IDIpICYgMHgzRl07XG5cdFx0XHRcdG91dHB1dCArPSAnPSc7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH1cblxuXHRtb2R1bGUuZXhwb3J0cy50b0J5dGVBcnJheSA9IGI2NFRvQnl0ZUFycmF5O1xuXHRtb2R1bGUuZXhwb3J0cy5mcm9tQnl0ZUFycmF5ID0gdWludDhUb0Jhc2U2NDtcbn0oKSk7XG4iLCJyZXF1aXJlPShmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pKHsxOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbmV4cG9ydHMucmVhZElFRUU3NTQgPSBmdW5jdGlvbihidWZmZXIsIG9mZnNldCwgaXNCRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLFxuICAgICAgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMSxcbiAgICAgIGVNYXggPSAoMSA8PCBlTGVuKSAtIDEsXG4gICAgICBlQmlhcyA9IGVNYXggPj4gMSxcbiAgICAgIG5CaXRzID0gLTcsXG4gICAgICBpID0gaXNCRSA/IDAgOiAobkJ5dGVzIC0gMSksXG4gICAgICBkID0gaXNCRSA/IDEgOiAtMSxcbiAgICAgIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV07XG5cbiAgaSArPSBkO1xuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpO1xuICBzID4+PSAoLW5CaXRzKTtcbiAgbkJpdHMgKz0gZUxlbjtcbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IGUgKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCk7XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIGUgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBtTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gbSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXM7XG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KTtcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pO1xuICAgIGUgPSBlIC0gZUJpYXM7XG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbik7XG59O1xuXG5leHBvcnRzLndyaXRlSUVFRTc1NCA9IGZ1bmN0aW9uKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNCRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjLFxuICAgICAgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMSxcbiAgICAgIGVNYXggPSAoMSA8PCBlTGVuKSAtIDEsXG4gICAgICBlQmlhcyA9IGVNYXggPj4gMSxcbiAgICAgIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKSxcbiAgICAgIGkgPSBpc0JFID8gKG5CeXRlcyAtIDEpIDogMCxcbiAgICAgIGQgPSBpc0JFID8gLTEgOiAxLFxuICAgICAgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMDtcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKTtcblxuICBpZiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSBJbmZpbml0eSkge1xuICAgIG0gPSBpc05hTih2YWx1ZSkgPyAxIDogMDtcbiAgICBlID0gZU1heDtcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMik7XG4gICAgaWYgKHZhbHVlICogKGMgPSBNYXRoLnBvdygyLCAtZSkpIDwgMSkge1xuICAgICAgZS0tO1xuICAgICAgYyAqPSAyO1xuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gYztcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgKz0gcnQgKiBNYXRoLnBvdygyLCAxIC0gZUJpYXMpO1xuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrKztcbiAgICAgIGMgLz0gMjtcbiAgICB9XG5cbiAgICBpZiAoZSArIGVCaWFzID49IGVNYXgpIHtcbiAgICAgIG0gPSAwO1xuICAgICAgZSA9IGVNYXg7XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICh2YWx1ZSAqIGMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pO1xuICAgICAgZSA9IGUgKyBlQmlhcztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pO1xuICAgICAgZSA9IDA7XG4gICAgfVxuICB9XG5cbiAgZm9yICg7IG1MZW4gPj0gODsgYnVmZmVyW29mZnNldCArIGldID0gbSAmIDB4ZmYsIGkgKz0gZCwgbSAvPSAyNTYsIG1MZW4gLT0gOCk7XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbTtcbiAgZUxlbiArPSBtTGVuO1xuICBmb3IgKDsgZUxlbiA+IDA7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IGUgJiAweGZmLCBpICs9IGQsIGUgLz0gMjU2LCBlTGVuIC09IDgpO1xuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyODtcbn07XG5cbn0se31dLFwicTlUeENDXCI6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xudmFyIGFzc2VydDtcbmV4cG9ydHMuQnVmZmVyID0gQnVmZmVyO1xuZXhwb3J0cy5TbG93QnVmZmVyID0gQnVmZmVyO1xuQnVmZmVyLnBvb2xTaXplID0gODE5MjtcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MDtcblxuZnVuY3Rpb24gc3RyaW5ndHJpbShzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKTtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJyk7XG59XG5cbmZ1bmN0aW9uIEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgb2Zmc2V0KSB7XG4gIGlmKCFhc3NlcnQpIGFzc2VydD0gcmVxdWlyZSgnYXNzZXJ0Jyk7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBCdWZmZXIpKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoc3ViamVjdCwgZW5jb2RpbmcsIG9mZnNldCk7XG4gIH1cbiAgdGhpcy5wYXJlbnQgPSB0aGlzO1xuICB0aGlzLm9mZnNldCA9IDA7XG5cbiAgLy8gV29yay1hcm91bmQ6IG5vZGUncyBiYXNlNjQgaW1wbGVtZW50YXRpb25cbiAgLy8gYWxsb3dzIGZvciBub24tcGFkZGVkIHN0cmluZ3Mgd2hpbGUgYmFzZTY0LWpzXG4gIC8vIGRvZXMgbm90Li5cbiAgaWYgKGVuY29kaW5nID09IFwiYmFzZTY0XCIgJiYgdHlwZW9mIHN1YmplY3QgPT0gXCJzdHJpbmdcIikge1xuICAgIHN1YmplY3QgPSBzdHJpbmd0cmltKHN1YmplY3QpO1xuICAgIHdoaWxlIChzdWJqZWN0Lmxlbmd0aCAlIDQgIT0gMCkge1xuICAgICAgc3ViamVjdCA9IHN1YmplY3QgKyBcIj1cIjsgXG4gICAgfVxuICB9XG5cbiAgdmFyIHR5cGU7XG5cbiAgLy8gQXJlIHdlIHNsaWNpbmc/XG4gIGlmICh0eXBlb2Ygb2Zmc2V0ID09PSAnbnVtYmVyJykge1xuICAgIHRoaXMubGVuZ3RoID0gY29lcmNlKGVuY29kaW5nKTtcbiAgICAvLyBzbGljaW5nIHdvcmtzLCB3aXRoIGxpbWl0YXRpb25zIChubyBwYXJlbnQgdHJhY2tpbmcvdXBkYXRlKVxuICAgIC8vIGNoZWNrIGh0dHBzOi8vZ2l0aHViLmNvbS90b290cy9idWZmZXItYnJvd3NlcmlmeS9pc3N1ZXMvMTlcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpc1tpXSA9IHN1YmplY3QuZ2V0KGkrb2Zmc2V0KTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gRmluZCB0aGUgbGVuZ3RoXG4gICAgc3dpdGNoICh0eXBlID0gdHlwZW9mIHN1YmplY3QpIHtcbiAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgIHRoaXMubGVuZ3RoID0gY29lcmNlKHN1YmplY3QpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgdGhpcy5sZW5ndGggPSBCdWZmZXIuYnl0ZUxlbmd0aChzdWJqZWN0LCBlbmNvZGluZyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdvYmplY3QnOiAvLyBBc3N1bWUgb2JqZWN0IGlzIGFuIGFycmF5XG4gICAgICAgIHRoaXMubGVuZ3RoID0gY29lcmNlKHN1YmplY3QubGVuZ3RoKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmlyc3QgYXJndW1lbnQgbmVlZHMgdG8gYmUgYSBudW1iZXIsICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2FycmF5IG9yIHN0cmluZy4nKTtcbiAgICB9XG5cbiAgICAvLyBUcmVhdCBhcnJheS1pc2ggb2JqZWN0cyBhcyBhIGJ5dGUgYXJyYXkuXG4gICAgaWYgKGlzQXJyYXlJc2goc3ViamVjdCkpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoc3ViamVjdCBpbnN0YW5jZW9mIEJ1ZmZlcikge1xuICAgICAgICAgIHRoaXNbaV0gPSBzdWJqZWN0LnJlYWRVSW50OChpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0aGlzW2ldID0gc3ViamVjdFtpXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZSA9PSAnc3RyaW5nJykge1xuICAgICAgLy8gV2UgYXJlIGEgc3RyaW5nXG4gICAgICB0aGlzLmxlbmd0aCA9IHRoaXMud3JpdGUoc3ViamVjdCwgMCwgZW5jb2RpbmcpO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzW2ldID0gMDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiBnZXQoaSkge1xuICBpZiAoaSA8IDAgfHwgaSA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IEVycm9yKCdvb2InKTtcbiAgcmV0dXJuIHRoaXNbaV07XG59O1xuXG5CdWZmZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldChpLCB2KSB7XG4gIGlmIChpIDwgMCB8fCBpID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgRXJyb3IoJ29vYicpO1xuICByZXR1cm4gdGhpc1tpXSA9IHY7XG59O1xuXG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGZ1bmN0aW9uIChzdHIsIGVuY29kaW5nKSB7XG4gIHN3aXRjaCAoZW5jb2RpbmcgfHwgXCJ1dGY4XCIpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgICAgcmV0dXJuIHN0ci5sZW5ndGggLyAyO1xuXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cikubGVuZ3RoO1xuXG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXR1cm4gc3RyLmxlbmd0aDtcblxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXR1cm4gYmFzZTY0VG9CeXRlcyhzdHIpLmxlbmd0aDtcblxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2RpbmcnKTtcbiAgfVxufTtcblxuQnVmZmVyLnByb3RvdHlwZS51dGY4V3JpdGUgPSBmdW5jdGlvbiAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgYnl0ZXMsIHBvcztcbiAgcmV0dXJuIEJ1ZmZlci5fY2hhcnNXcml0dGVuID0gIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nKSwgdGhpcywgb2Zmc2V0LCBsZW5ndGgpO1xufTtcblxuQnVmZmVyLnByb3RvdHlwZS5hc2NpaVdyaXRlID0gZnVuY3Rpb24gKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGJ5dGVzLCBwb3M7XG4gIHJldHVybiBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9ICBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCB0aGlzLCBvZmZzZXQsIGxlbmd0aCk7XG59O1xuXG5CdWZmZXIucHJvdG90eXBlLmJpbmFyeVdyaXRlID0gQnVmZmVyLnByb3RvdHlwZS5hc2NpaVdyaXRlO1xuXG5CdWZmZXIucHJvdG90eXBlLmJhc2U2NFdyaXRlID0gZnVuY3Rpb24gKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGJ5dGVzLCBwb3M7XG4gIHJldHVybiBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9IGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCB0aGlzLCBvZmZzZXQsIGxlbmd0aCk7XG59O1xuXG5CdWZmZXIucHJvdG90eXBlLmJhc2U2NFNsaWNlID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgcmV0dXJuIHJlcXVpcmUoXCJiYXNlNjQtanNcIikuZnJvbUJ5dGVBcnJheShieXRlcyk7XG59O1xuXG5CdWZmZXIucHJvdG90eXBlLnV0ZjhTbGljZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGJ5dGVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIHZhciByZXMgPSBcIlwiO1xuICB2YXIgdG1wID0gXCJcIjtcbiAgdmFyIGkgPSAwO1xuICB3aGlsZSAoaSA8IGJ5dGVzLmxlbmd0aCkge1xuICAgIGlmIChieXRlc1tpXSA8PSAweDdGKSB7XG4gICAgICByZXMgKz0gZGVjb2RlVXRmOENoYXIodG1wKSArIFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0pO1xuICAgICAgdG1wID0gXCJcIjtcbiAgICB9IGVsc2VcbiAgICAgIHRtcCArPSBcIiVcIiArIGJ5dGVzW2ldLnRvU3RyaW5nKDE2KTtcblxuICAgIGkrKztcbiAgfVxuXG4gIHJldHVybiByZXMgKyBkZWNvZGVVdGY4Q2hhcih0bXApO1xufVxuXG5CdWZmZXIucHJvdG90eXBlLmFzY2lpU2xpY2UgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBieXRlcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB2YXIgcmV0ID0gXCJcIjtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkrKylcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSk7XG4gIHJldHVybiByZXQ7XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuYmluYXJ5U2xpY2UgPSBCdWZmZXIucHJvdG90eXBlLmFzY2lpU2xpY2U7XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgb3V0ID0gW10sXG4gICAgICBsZW4gPSB0aGlzLmxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIG91dFtpXSA9IHRvSGV4KHRoaXNbaV0pO1xuICAgIGlmIChpID09IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMpIHtcbiAgICAgIG91dFtpICsgMV0gPSAnLi4uJztcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIG91dC5qb2luKCcgJykgKyAnPic7XG59O1xuXG5cbkJ1ZmZlci5wcm90b3R5cGUuaGV4U2xpY2UgPSBmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aDtcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwO1xuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuO1xuXG4gIHZhciBvdXQgPSAnJztcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBvdXQgKz0gdG9IZXgodGhpc1tpXSk7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn07XG5cblxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKTtcbiAgc3RhcnQgPSArc3RhcnQgfHwgMDtcbiAgaWYgKHR5cGVvZiBlbmQgPT0gJ3VuZGVmaW5lZCcpIGVuZCA9IHRoaXMubGVuZ3RoO1xuXG4gIC8vIEZhc3RwYXRoIGVtcHR5IHN0cmluZ3NcbiAgaWYgKCtlbmQgPT0gc3RhcnQpIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldHVybiB0aGlzLmhleFNsaWNlKHN0YXJ0LCBlbmQpO1xuXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0dXJuIHRoaXMudXRmOFNsaWNlKHN0YXJ0LCBlbmQpO1xuXG4gICAgY2FzZSAnYXNjaWknOlxuICAgICAgcmV0dXJuIHRoaXMuYXNjaWlTbGljZShzdGFydCwgZW5kKTtcblxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXR1cm4gdGhpcy5iaW5hcnlTbGljZShzdGFydCwgZW5kKTtcblxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXR1cm4gdGhpcy5iYXNlNjRTbGljZShzdGFydCwgZW5kKTtcblxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIHJldHVybiB0aGlzLnVjczJTbGljZShzdGFydCwgZW5kKTtcblxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2RpbmcnKTtcbiAgfVxufTtcblxuXG5CdWZmZXIucHJvdG90eXBlLmhleFdyaXRlID0gZnVuY3Rpb24oc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSArb2Zmc2V0IHx8IDA7XG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldDtcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmc7XG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gK2xlbmd0aDtcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmc7XG4gICAgfVxuICB9XG5cbiAgLy8gbXVzdCBiZSBhbiBldmVuIG51bWJlciBvZiBkaWdpdHNcbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGg7XG4gIGlmIChzdHJMZW4gJSAyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKTtcbiAgfVxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDI7XG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHZhciBieXRlID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KTtcbiAgICBpZiAoaXNOYU4oYnl0ZSkpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBoZXggc3RyaW5nJyk7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9IGJ5dGU7XG4gIH1cbiAgQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPSBpICogMjtcbiAgcmV0dXJuIGk7XG59O1xuXG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbihzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZykge1xuICAvLyBTdXBwb3J0IGJvdGggKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKVxuICAvLyBhbmQgdGhlIGxlZ2FjeSAoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0LCBsZW5ndGgpXG4gIGlmIChpc0Zpbml0ZShvZmZzZXQpKSB7XG4gICAgaWYgKCFpc0Zpbml0ZShsZW5ndGgpKSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aDtcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH0gZWxzZSB7ICAvLyBsZWdhY3lcbiAgICB2YXIgc3dhcCA9IGVuY29kaW5nO1xuICAgIGVuY29kaW5nID0gb2Zmc2V0O1xuICAgIG9mZnNldCA9IGxlbmd0aDtcbiAgICBsZW5ndGggPSBzd2FwO1xuICB9XG5cbiAgb2Zmc2V0ID0gK29mZnNldCB8fCAwO1xuICB2YXIgcmVtYWluaW5nID0gdGhpcy5sZW5ndGggLSBvZmZzZXQ7XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nO1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9ICtsZW5ndGg7XG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nO1xuICAgIH1cbiAgfVxuICBlbmNvZGluZyA9IFN0cmluZyhlbmNvZGluZyB8fCAndXRmOCcpLnRvTG93ZXJDYXNlKCk7XG5cbiAgc3dpdGNoIChlbmNvZGluZykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXR1cm4gdGhpcy5oZXhXcml0ZShzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKTtcblxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldHVybiB0aGlzLnV0ZjhXcml0ZShzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKTtcblxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIHJldHVybiB0aGlzLmFzY2lpV3JpdGUoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCk7XG5cbiAgICBjYXNlICdiaW5hcnknOlxuICAgICAgcmV0dXJuIHRoaXMuYmluYXJ5V3JpdGUoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCk7XG5cbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0dXJuIHRoaXMuYmFzZTY0V3JpdGUoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCk7XG5cbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgICByZXR1cm4gdGhpcy51Y3MyV3JpdGUoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCk7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJyk7XG4gIH1cbn07XG5cbi8vIHNsaWNlKHN0YXJ0LCBlbmQpXG5mdW5jdGlvbiBjbGFtcChpbmRleCwgbGVuLCBkZWZhdWx0VmFsdWUpIHtcbiAgaWYgKHR5cGVvZiBpbmRleCAhPT0gJ251bWJlcicpIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gIGluZGV4ID0gfn5pbmRleDsgIC8vIENvZXJjZSB0byBpbnRlZ2VyLlxuICBpZiAoaW5kZXggPj0gbGVuKSByZXR1cm4gbGVuO1xuICBpZiAoaW5kZXggPj0gMCkgcmV0dXJuIGluZGV4O1xuICBpbmRleCArPSBsZW47XG4gIGlmIChpbmRleCA+PSAwKSByZXR1cm4gaW5kZXg7XG4gIHJldHVybiAwO1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGg7XG4gIHN0YXJ0ID0gY2xhbXAoc3RhcnQsIGxlbiwgMCk7XG4gIGVuZCA9IGNsYW1wKGVuZCwgbGVuLCBsZW4pO1xuICByZXR1cm4gbmV3IEJ1ZmZlcih0aGlzLCBlbmQgLSBzdGFydCwgK3N0YXJ0KTtcbn07XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uKHRhcmdldCwgdGFyZ2V0X3N0YXJ0LCBzdGFydCwgZW5kKSB7XG4gIHZhciBzb3VyY2UgPSB0aGlzO1xuICBzdGFydCB8fCAoc3RhcnQgPSAwKTtcbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkIHx8IGlzTmFOKGVuZCkpIHtcbiAgICBlbmQgPSB0aGlzLmxlbmd0aDtcbiAgfVxuICB0YXJnZXRfc3RhcnQgfHwgKHRhcmdldF9zdGFydCA9IDApO1xuXG4gIGlmIChlbmQgPCBzdGFydCkgdGhyb3cgbmV3IEVycm9yKCdzb3VyY2VFbmQgPCBzb3VyY2VTdGFydCcpO1xuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuIDA7XG4gIGlmICh0YXJnZXQubGVuZ3RoID09IDAgfHwgc291cmNlLmxlbmd0aCA9PSAwKSByZXR1cm4gMDtcblxuICBpZiAodGFyZ2V0X3N0YXJ0IDwgMCB8fCB0YXJnZXRfc3RhcnQgPj0gdGFyZ2V0Lmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpO1xuICB9XG5cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSBzb3VyY2UubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzb3VyY2VTdGFydCBvdXQgb2YgYm91bmRzJyk7XG4gIH1cblxuICBpZiAoZW5kIDwgMCB8fCBlbmQgPiBzb3VyY2UubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpO1xuICB9XG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgZW5kID0gdGhpcy5sZW5ndGg7XG4gIH1cblxuICBpZiAodGFyZ2V0Lmxlbmd0aCAtIHRhcmdldF9zdGFydCA8IGVuZCAtIHN0YXJ0KSB7XG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldF9zdGFydCArIHN0YXJ0O1xuICB9XG5cbiAgdmFyIHRlbXAgPSBbXTtcbiAgZm9yICh2YXIgaT1zdGFydDsgaTxlbmQ7IGkrKykge1xuICAgIGFzc2VydC5vayh0eXBlb2YgdGhpc1tpXSAhPT0gJ3VuZGVmaW5lZCcsIFwiY29weWluZyB1bmRlZmluZWQgYnVmZmVyIGJ5dGVzIVwiKTtcbiAgICB0ZW1wLnB1c2godGhpc1tpXSk7XG4gIH1cblxuICBmb3IgKHZhciBpPXRhcmdldF9zdGFydDsgaTx0YXJnZXRfc3RhcnQrdGVtcC5sZW5ndGg7IGkrKykge1xuICAgIHRhcmdldFtpXSA9IHRlbXBbaS10YXJnZXRfc3RhcnRdO1xuICB9XG59O1xuXG4vLyBmaWxsKHZhbHVlLCBzdGFydD0wLCBlbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uIGZpbGwodmFsdWUsIHN0YXJ0LCBlbmQpIHtcbiAgdmFsdWUgfHwgKHZhbHVlID0gMCk7XG4gIHN0YXJ0IHx8IChzdGFydCA9IDApO1xuICBlbmQgfHwgKGVuZCA9IHRoaXMubGVuZ3RoKTtcblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIHZhbHVlID0gdmFsdWUuY2hhckNvZGVBdCgwKTtcbiAgfVxuICBpZiAoISh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB8fCBpc05hTih2YWx1ZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3ZhbHVlIGlzIG5vdCBhIG51bWJlcicpO1xuICB9XG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSB0aHJvdyBuZXcgRXJyb3IoJ2VuZCA8IHN0YXJ0Jyk7XG5cbiAgLy8gRmlsbCAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm4gMDtcbiAgaWYgKHRoaXMubGVuZ3RoID09IDApIHJldHVybiAwO1xuXG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3N0YXJ0IG91dCBvZiBib3VuZHMnKTtcbiAgfVxuXG4gIGlmIChlbmQgPCAwIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdlbmQgb3V0IG9mIGJvdW5kcycpO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICB0aGlzW2ldID0gdmFsdWU7XG4gIH1cbn1cblxuLy8gU3RhdGljIG1ldGhvZHNcbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIGlzQnVmZmVyKGIpIHtcbiAgcmV0dXJuIGIgaW5zdGFuY2VvZiBCdWZmZXIgfHwgYiBpbnN0YW5jZW9mIEJ1ZmZlcjtcbn07XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiAobGlzdCwgdG90YWxMZW5ndGgpIHtcbiAgaWYgKCFpc0FycmF5KGxpc3QpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiVXNhZ2U6IEJ1ZmZlci5jb25jYXQobGlzdCwgW3RvdGFsTGVuZ3RoXSlcXG4gXFxcbiAgICAgIGxpc3Qgc2hvdWxkIGJlIGFuIEFycmF5LlwiKTtcbiAgfVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKDApO1xuICB9IGVsc2UgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGxpc3RbMF07XG4gIH1cblxuICBpZiAodHlwZW9mIHRvdGFsTGVuZ3RoICE9PSAnbnVtYmVyJykge1xuICAgIHRvdGFsTGVuZ3RoID0gMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBidWYgPSBsaXN0W2ldO1xuICAgICAgdG90YWxMZW5ndGggKz0gYnVmLmxlbmd0aDtcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmZmVyID0gbmV3IEJ1ZmZlcih0b3RhbExlbmd0aCk7XG4gIHZhciBwb3MgPSAwO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYnVmID0gbGlzdFtpXTtcbiAgICBidWYuY29weShidWZmZXIsIHBvcyk7XG4gICAgcG9zICs9IGJ1Zi5sZW5ndGg7XG4gIH1cbiAgcmV0dXJuIGJ1ZmZlcjtcbn07XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24oZW5jb2RpbmcpIHtcbiAgc3dpdGNoICgoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICBjYXNlICdyYXcnOlxuICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG4vLyBoZWxwZXJzXG5cbmZ1bmN0aW9uIGNvZXJjZShsZW5ndGgpIHtcbiAgLy8gQ29lcmNlIGxlbmd0aCB0byBhIG51bWJlciAocG9zc2libHkgTmFOKSwgcm91bmQgdXBcbiAgLy8gaW4gY2FzZSBpdCdzIGZyYWN0aW9uYWwgKGUuZy4gMTIzLjQ1NikgdGhlbiBkbyBhXG4gIC8vIGRvdWJsZSBuZWdhdGUgdG8gY29lcmNlIGEgTmFOIHRvIDAuIEVhc3ksIHJpZ2h0P1xuICBsZW5ndGggPSB+fk1hdGguY2VpbCgrbGVuZ3RoKTtcbiAgcmV0dXJuIGxlbmd0aCA8IDAgPyAwIDogbGVuZ3RoO1xufVxuXG5mdW5jdGlvbiBpc0FycmF5KHN1YmplY3QpIHtcbiAgcmV0dXJuIChBcnJheS5pc0FycmF5IHx8XG4gICAgZnVuY3Rpb24oc3ViamVjdCl7XG4gICAgICByZXR1cm4ge30udG9TdHJpbmcuYXBwbHkoc3ViamVjdCkgPT0gJ1tvYmplY3QgQXJyYXldJ1xuICAgIH0pXG4gICAgKHN1YmplY3QpXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXlJc2goc3ViamVjdCkge1xuICByZXR1cm4gaXNBcnJheShzdWJqZWN0KSB8fCBCdWZmZXIuaXNCdWZmZXIoc3ViamVjdCkgfHxcbiAgICAgICAgIHN1YmplY3QgJiYgdHlwZW9mIHN1YmplY3QgPT09ICdvYmplY3QnICYmXG4gICAgICAgICB0eXBlb2Ygc3ViamVjdC5sZW5ndGggPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiB0b0hleChuKSB7XG4gIGlmIChuIDwgMTYpIHJldHVybiAnMCcgKyBuLnRvU3RyaW5nKDE2KTtcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpO1xufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyhzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKylcbiAgICBpZiAoc3RyLmNoYXJDb2RlQXQoaSkgPD0gMHg3RilcbiAgICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpKTtcbiAgICBlbHNlIHtcbiAgICAgIHZhciBoID0gZW5jb2RlVVJJQ29tcG9uZW50KHN0ci5jaGFyQXQoaSkpLnN1YnN0cigxKS5zcGxpdCgnJScpO1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBoLmxlbmd0aDsgaisrKVxuICAgICAgICBieXRlQXJyYXkucHVzaChwYXJzZUludChoW2pdLCAxNikpO1xuICAgIH1cblxuICByZXR1cm4gYnl0ZUFycmF5O1xufVxuXG5mdW5jdGlvbiBhc2NpaVRvQnl0ZXMoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKyApXG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goIHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRiApO1xuXG4gIHJldHVybiBieXRlQXJyYXk7XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMoc3RyKSB7XG4gIHJldHVybiByZXF1aXJlKFwiYmFzZTY0LWpzXCIpLnRvQnl0ZUFycmF5KHN0cik7XG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBwb3MsIGkgPSAwO1xuICB3aGlsZSAoaSA8IGxlbmd0aCkge1xuICAgIGlmICgoaStvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpXG4gICAgICBicmVhaztcblxuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXTtcbiAgICBpKys7XG4gIH1cbiAgcmV0dXJuIGk7XG59XG5cbmZ1bmN0aW9uIGRlY29kZVV0ZjhDaGFyKHN0cikge1xuICB0cnkge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoMHhGRkZEKTsgLy8gVVRGIDggaW52YWxpZCBjaGFyXG4gIH1cbn1cblxuLy8gcmVhZC93cml0ZSBiaXQtdHdpZGRsaW5nXG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQ4ID0gZnVuY3Rpb24ob2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YXIgYnVmZmVyID0gdGhpcztcblxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0Lm9rKG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3Npbmcgb2Zmc2V0Jyk7XG5cbiAgICBhc3NlcnQub2sob2Zmc2V0IDwgYnVmZmVyLmxlbmd0aCxcbiAgICAgICAgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJyk7XG4gIH1cblxuICBpZiAob2Zmc2V0ID49IGJ1ZmZlci5sZW5ndGgpIHJldHVybjtcblxuICByZXR1cm4gYnVmZmVyW29mZnNldF07XG59O1xuXG5mdW5jdGlvbiByZWFkVUludDE2KGJ1ZmZlciwgb2Zmc2V0LCBpc0JpZ0VuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgdmFyIHZhbCA9IDA7XG5cblxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0Lm9rKHR5cGVvZiAoaXNCaWdFbmRpYW4pID09PSAnYm9vbGVhbicsXG4gICAgICAgICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJyk7XG5cbiAgICBhc3NlcnQub2sob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLFxuICAgICAgICAnbWlzc2luZyBvZmZzZXQnKTtcblxuICAgIGFzc2VydC5vayhvZmZzZXQgKyAxIDwgYnVmZmVyLmxlbmd0aCxcbiAgICAgICAgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJyk7XG4gIH1cblxuICBpZiAob2Zmc2V0ID49IGJ1ZmZlci5sZW5ndGgpIHJldHVybiAwO1xuXG4gIGlmIChpc0JpZ0VuZGlhbikge1xuICAgIHZhbCA9IGJ1ZmZlcltvZmZzZXRdIDw8IDg7XG4gICAgaWYgKG9mZnNldCArIDEgPCBidWZmZXIubGVuZ3RoKSB7XG4gICAgICB2YWwgfD0gYnVmZmVyW29mZnNldCArIDFdO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YWwgPSBidWZmZXJbb2Zmc2V0XTtcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGJ1ZmZlci5sZW5ndGgpIHtcbiAgICAgIHZhbCB8PSBidWZmZXJbb2Zmc2V0ICsgMV0gPDwgODtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdmFsO1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHJlYWRVSW50MTYodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpO1xufTtcblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbihvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiByZWFkVUludDE2KHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpO1xufTtcblxuZnVuY3Rpb24gcmVhZFVJbnQzMihidWZmZXIsIG9mZnNldCwgaXNCaWdFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIHZhciB2YWwgPSAwO1xuXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQub2sodHlwZW9mIChpc0JpZ0VuZGlhbikgPT09ICdib29sZWFuJyxcbiAgICAgICAgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKTtcblxuICAgIGFzc2VydC5vayhvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsXG4gICAgICAgICdtaXNzaW5nIG9mZnNldCcpO1xuXG4gICAgYXNzZXJ0Lm9rKG9mZnNldCArIDMgPCBidWZmZXIubGVuZ3RoLFxuICAgICAgICAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKTtcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gYnVmZmVyLmxlbmd0aCkgcmV0dXJuIDA7XG5cbiAgaWYgKGlzQmlnRW5kaWFuKSB7XG4gICAgaWYgKG9mZnNldCArIDEgPCBidWZmZXIubGVuZ3RoKVxuICAgICAgdmFsID0gYnVmZmVyW29mZnNldCArIDFdIDw8IDE2O1xuICAgIGlmIChvZmZzZXQgKyAyIDwgYnVmZmVyLmxlbmd0aClcbiAgICAgIHZhbCB8PSBidWZmZXJbb2Zmc2V0ICsgMl0gPDwgODtcbiAgICBpZiAob2Zmc2V0ICsgMyA8IGJ1ZmZlci5sZW5ndGgpXG4gICAgICB2YWwgfD0gYnVmZmVyW29mZnNldCArIDNdO1xuICAgIHZhbCA9IHZhbCArIChidWZmZXJbb2Zmc2V0XSA8PCAyNCA+Pj4gMCk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKG9mZnNldCArIDIgPCBidWZmZXIubGVuZ3RoKVxuICAgICAgdmFsID0gYnVmZmVyW29mZnNldCArIDJdIDw8IDE2O1xuICAgIGlmIChvZmZzZXQgKyAxIDwgYnVmZmVyLmxlbmd0aClcbiAgICAgIHZhbCB8PSBidWZmZXJbb2Zmc2V0ICsgMV0gPDwgODtcbiAgICB2YWwgfD0gYnVmZmVyW29mZnNldF07XG4gICAgaWYgKG9mZnNldCArIDMgPCBidWZmZXIubGVuZ3RoKVxuICAgICAgdmFsID0gdmFsICsgKGJ1ZmZlcltvZmZzZXQgKyAzXSA8PCAyNCA+Pj4gMCk7XG4gIH1cblxuICByZXR1cm4gdmFsO1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHJlYWRVSW50MzIodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpO1xufTtcblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbihvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiByZWFkVUludDMyKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpO1xufTtcblxuXG4vKlxuICogU2lnbmVkIGludGVnZXIgdHlwZXMsIHlheSB0ZWFtISBBIHJlbWluZGVyIG9uIGhvdyB0d28ncyBjb21wbGVtZW50IGFjdHVhbGx5XG4gKiB3b3Jrcy4gVGhlIGZpcnN0IGJpdCBpcyB0aGUgc2lnbmVkIGJpdCwgaS5lLiB0ZWxscyB1cyB3aGV0aGVyIG9yIG5vdCB0aGVcbiAqIG51bWJlciBzaG91bGQgYmUgcG9zaXRpdmUgb3IgbmVnYXRpdmUuIElmIHRoZSB0d28ncyBjb21wbGVtZW50IHZhbHVlIGlzXG4gKiBwb3NpdGl2ZSwgdGhlbiB3ZSdyZSBkb25lLCBhcyBpdCdzIGVxdWl2YWxlbnQgdG8gdGhlIHVuc2lnbmVkIHJlcHJlc2VudGF0aW9uLlxuICpcbiAqIE5vdyBpZiB0aGUgbnVtYmVyIGlzIHBvc2l0aXZlLCB5b3UncmUgcHJldHR5IG11Y2ggZG9uZSwgeW91IGNhbiBqdXN0IGxldmVyYWdlXG4gKiB0aGUgdW5zaWduZWQgdHJhbnNsYXRpb25zIGFuZCByZXR1cm4gdGhvc2UuIFVuZm9ydHVuYXRlbHksIG5lZ2F0aXZlIG51bWJlcnNcbiAqIGFyZW4ndCBxdWl0ZSB0aGF0IHN0cmFpZ2h0Zm9yd2FyZC5cbiAqXG4gKiBBdCBmaXJzdCBnbGFuY2UsIG9uZSBtaWdodCBiZSBpbmNsaW5lZCB0byB1c2UgdGhlIHRyYWRpdGlvbmFsIGZvcm11bGEgdG9cbiAqIHRyYW5zbGF0ZSBiaW5hcnkgbnVtYmVycyBiZXR3ZWVuIHRoZSBwb3NpdGl2ZSBhbmQgbmVnYXRpdmUgdmFsdWVzIGluIHR3bydzXG4gKiBjb21wbGVtZW50LiAoVGhvdWdoIGl0IGRvZXNuJ3QgcXVpdGUgd29yayBmb3IgdGhlIG1vc3QgbmVnYXRpdmUgdmFsdWUpXG4gKiBNYWlubHk6XG4gKiAgLSBpbnZlcnQgYWxsIHRoZSBiaXRzXG4gKiAgLSBhZGQgb25lIHRvIHRoZSByZXN1bHRcbiAqXG4gKiBPZiBjb3Vyc2UsIHRoaXMgZG9lc24ndCBxdWl0ZSB3b3JrIGluIEphdmFzY3JpcHQuIFRha2UgZm9yIGV4YW1wbGUgdGhlIHZhbHVlXG4gKiBvZiAtMTI4LiBUaGlzIGNvdWxkIGJlIHJlcHJlc2VudGVkIGluIDE2IGJpdHMgKGJpZy1lbmRpYW4pIGFzIDB4ZmY4MC4gQnV0IG9mXG4gKiBjb3Vyc2UsIEphdmFzY3JpcHQgd2lsbCBkbyB0aGUgZm9sbG93aW5nOlxuICpcbiAqID4gfjB4ZmY4MFxuICogLTY1NDA5XG4gKlxuICogV2hvaCB0aGVyZSwgSmF2YXNjcmlwdCwgdGhhdCdzIG5vdCBxdWl0ZSByaWdodC4gQnV0IHdhaXQsIGFjY29yZGluZyB0b1xuICogSmF2YXNjcmlwdCB0aGF0J3MgcGVyZmVjdGx5IGNvcnJlY3QuIFdoZW4gSmF2YXNjcmlwdCBlbmRzIHVwIHNlZWluZyB0aGVcbiAqIGNvbnN0YW50IDB4ZmY4MCwgaXQgaGFzIG5vIG5vdGlvbiB0aGF0IGl0IGlzIGFjdHVhbGx5IGEgc2lnbmVkIG51bWJlci4gSXRcbiAqIGFzc3VtZXMgdGhhdCB3ZSd2ZSBpbnB1dCB0aGUgdW5zaWduZWQgdmFsdWUgMHhmZjgwLiBUaHVzLCB3aGVuIGl0IGRvZXMgdGhlXG4gKiBiaW5hcnkgbmVnYXRpb24sIGl0IGNhc3RzIGl0IGludG8gYSBzaWduZWQgdmFsdWUsIChwb3NpdGl2ZSAweGZmODApLiBUaGVuXG4gKiB3aGVuIHlvdSBwZXJmb3JtIGJpbmFyeSBuZWdhdGlvbiBvbiB0aGF0LCBpdCB0dXJucyBpdCBpbnRvIGEgbmVnYXRpdmUgbnVtYmVyLlxuICpcbiAqIEluc3RlYWQsIHdlJ3JlIGdvaW5nIHRvIGhhdmUgdG8gdXNlIHRoZSBmb2xsb3dpbmcgZ2VuZXJhbCBmb3JtdWxhLCB0aGF0IHdvcmtzXG4gKiBpbiBhIHJhdGhlciBKYXZhc2NyaXB0IGZyaWVuZGx5IHdheS4gSSdtIGdsYWQgd2UgZG9uJ3Qgc3VwcG9ydCB0aGlzIGtpbmQgb2ZcbiAqIHdlaXJkIG51bWJlcmluZyBzY2hlbWUgaW4gdGhlIGtlcm5lbC5cbiAqXG4gKiAoQklULU1BWCAtICh1bnNpZ25lZCl2YWwgKyAxKSAqIC0xXG4gKlxuICogVGhlIGFzdHV0ZSBvYnNlcnZlciwgbWF5IHRoaW5rIHRoYXQgdGhpcyBkb2Vzbid0IG1ha2Ugc2Vuc2UgZm9yIDgtYml0IG51bWJlcnNcbiAqIChyZWFsbHkgaXQgaXNuJ3QgbmVjZXNzYXJ5IGZvciB0aGVtKS4gSG93ZXZlciwgd2hlbiB5b3UgZ2V0IDE2LWJpdCBudW1iZXJzLFxuICogeW91IGRvLiBMZXQncyBnbyBiYWNrIHRvIG91ciBwcmlvciBleGFtcGxlIGFuZCBzZWUgaG93IHRoaXMgd2lsbCBsb29rOlxuICpcbiAqICgweGZmZmYgLSAweGZmODAgKyAxKSAqIC0xXG4gKiAoMHgwMDdmICsgMSkgKiAtMVxuICogKDB4MDA4MCkgKiAtMVxuICovXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24ob2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YXIgYnVmZmVyID0gdGhpcztcbiAgdmFyIG5lZztcblxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0Lm9rKG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3Npbmcgb2Zmc2V0Jyk7XG5cbiAgICBhc3NlcnQub2sob2Zmc2V0IDwgYnVmZmVyLmxlbmd0aCxcbiAgICAgICAgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJyk7XG4gIH1cblxuICBpZiAob2Zmc2V0ID49IGJ1ZmZlci5sZW5ndGgpIHJldHVybjtcblxuICBuZWcgPSBidWZmZXJbb2Zmc2V0XSAmIDB4ODA7XG4gIGlmICghbmVnKSB7XG4gICAgcmV0dXJuIChidWZmZXJbb2Zmc2V0XSk7XG4gIH1cblxuICByZXR1cm4gKCgweGZmIC0gYnVmZmVyW29mZnNldF0gKyAxKSAqIC0xKTtcbn07XG5cbmZ1bmN0aW9uIHJlYWRJbnQxNihidWZmZXIsIG9mZnNldCwgaXNCaWdFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIHZhciBuZWcsIHZhbDtcblxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0Lm9rKHR5cGVvZiAoaXNCaWdFbmRpYW4pID09PSAnYm9vbGVhbicsXG4gICAgICAgICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJyk7XG5cbiAgICBhc3NlcnQub2sob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLFxuICAgICAgICAnbWlzc2luZyBvZmZzZXQnKTtcblxuICAgIGFzc2VydC5vayhvZmZzZXQgKyAxIDwgYnVmZmVyLmxlbmd0aCxcbiAgICAgICAgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJyk7XG4gIH1cblxuICB2YWwgPSByZWFkVUludDE2KGJ1ZmZlciwgb2Zmc2V0LCBpc0JpZ0VuZGlhbiwgbm9Bc3NlcnQpO1xuICBuZWcgPSB2YWwgJiAweDgwMDA7XG4gIGlmICghbmVnKSB7XG4gICAgcmV0dXJuIHZhbDtcbiAgfVxuXG4gIHJldHVybiAoMHhmZmZmIC0gdmFsICsgMSkgKiAtMTtcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHJlYWRJbnQxNih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydCk7XG59O1xuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24ob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gcmVhZEludDE2KHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpO1xufTtcblxuZnVuY3Rpb24gcmVhZEludDMyKGJ1ZmZlciwgb2Zmc2V0LCBpc0JpZ0VuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgdmFyIG5lZywgdmFsO1xuXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQub2sodHlwZW9mIChpc0JpZ0VuZGlhbikgPT09ICdib29sZWFuJyxcbiAgICAgICAgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKTtcblxuICAgIGFzc2VydC5vayhvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsXG4gICAgICAgICdtaXNzaW5nIG9mZnNldCcpO1xuXG4gICAgYXNzZXJ0Lm9rKG9mZnNldCArIDMgPCBidWZmZXIubGVuZ3RoLFxuICAgICAgICAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKTtcbiAgfVxuXG4gIHZhbCA9IHJlYWRVSW50MzIoYnVmZmVyLCBvZmZzZXQsIGlzQmlnRW5kaWFuLCBub0Fzc2VydCk7XG4gIG5lZyA9IHZhbCAmIDB4ODAwMDAwMDA7XG4gIGlmICghbmVnKSB7XG4gICAgcmV0dXJuICh2YWwpO1xuICB9XG5cbiAgcmV0dXJuICgweGZmZmZmZmZmIC0gdmFsICsgMSkgKiAtMTtcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHJlYWRJbnQzMih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydCk7XG59O1xuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24ob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gcmVhZEludDMyKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpO1xufTtcblxuZnVuY3Rpb24gcmVhZEZsb2F0KGJ1ZmZlciwgb2Zmc2V0LCBpc0JpZ0VuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydC5vayh0eXBlb2YgKGlzQmlnRW5kaWFuKSA9PT0gJ2Jvb2xlYW4nLFxuICAgICAgICAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpO1xuXG4gICAgYXNzZXJ0Lm9rKG9mZnNldCArIDMgPCBidWZmZXIubGVuZ3RoLFxuICAgICAgICAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKTtcbiAgfVxuXG4gIHJldHVybiByZXF1aXJlKCcuL2J1ZmZlcl9pZWVlNzU0JykucmVhZElFRUU3NTQoYnVmZmVyLCBvZmZzZXQsIGlzQmlnRW5kaWFuLFxuICAgICAgMjMsIDQpO1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24ob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gcmVhZEZsb2F0KHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KTtcbn07XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbihvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiByZWFkRmxvYXQodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydCk7XG59O1xuXG5mdW5jdGlvbiByZWFkRG91YmxlKGJ1ZmZlciwgb2Zmc2V0LCBpc0JpZ0VuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydC5vayh0eXBlb2YgKGlzQmlnRW5kaWFuKSA9PT0gJ2Jvb2xlYW4nLFxuICAgICAgICAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpO1xuXG4gICAgYXNzZXJ0Lm9rKG9mZnNldCArIDcgPCBidWZmZXIubGVuZ3RoLFxuICAgICAgICAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKTtcbiAgfVxuXG4gIHJldHVybiByZXF1aXJlKCcuL2J1ZmZlcl9pZWVlNzU0JykucmVhZElFRUU3NTQoYnVmZmVyLCBvZmZzZXQsIGlzQmlnRW5kaWFuLFxuICAgICAgNTIsIDgpO1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHJlYWREb3VibGUodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpO1xufTtcblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlQkUgPSBmdW5jdGlvbihvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiByZWFkRG91YmxlKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpO1xufTtcblxuXG4vKlxuICogV2UgaGF2ZSB0byBtYWtlIHN1cmUgdGhhdCB0aGUgdmFsdWUgaXMgYSB2YWxpZCBpbnRlZ2VyLiBUaGlzIG1lYW5zIHRoYXQgaXQgaXNcbiAqIG5vbi1uZWdhdGl2ZS4gSXQgaGFzIG5vIGZyYWN0aW9uYWwgY29tcG9uZW50IGFuZCB0aGF0IGl0IGRvZXMgbm90IGV4Y2VlZCB0aGVcbiAqIG1heGltdW0gYWxsb3dlZCB2YWx1ZS5cbiAqXG4gKiAgICAgIHZhbHVlICAgICAgICAgICBUaGUgbnVtYmVyIHRvIGNoZWNrIGZvciB2YWxpZGl0eVxuICpcbiAqICAgICAgbWF4ICAgICAgICAgICAgIFRoZSBtYXhpbXVtIHZhbHVlXG4gKi9cbmZ1bmN0aW9uIHZlcmlmdWludCh2YWx1ZSwgbWF4KSB7XG4gIGFzc2VydC5vayh0eXBlb2YgKHZhbHVlKSA9PSAnbnVtYmVyJyxcbiAgICAgICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJyk7XG5cbiAgYXNzZXJ0Lm9rKHZhbHVlID49IDAsXG4gICAgICAnc3BlY2lmaWVkIGEgbmVnYXRpdmUgdmFsdWUgZm9yIHdyaXRpbmcgYW4gdW5zaWduZWQgdmFsdWUnKTtcblxuICBhc3NlcnQub2sodmFsdWUgPD0gbWF4LCAndmFsdWUgaXMgbGFyZ2VyIHRoYW4gbWF4aW11bSB2YWx1ZSBmb3IgdHlwZScpO1xuXG4gIGFzc2VydC5vayhNYXRoLmZsb29yKHZhbHVlKSA9PT0gdmFsdWUsICd2YWx1ZSBoYXMgYSBmcmFjdGlvbmFsIGNvbXBvbmVudCcpO1xufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbih2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YXIgYnVmZmVyID0gdGhpcztcblxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0Lm9rKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsXG4gICAgICAgICdtaXNzaW5nIHZhbHVlJyk7XG5cbiAgICBhc3NlcnQub2sob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLFxuICAgICAgICAnbWlzc2luZyBvZmZzZXQnKTtcblxuICAgIGFzc2VydC5vayhvZmZzZXQgPCBidWZmZXIubGVuZ3RoLFxuICAgICAgICAndHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJyk7XG5cbiAgICB2ZXJpZnVpbnQodmFsdWUsIDB4ZmYpO1xuICB9XG5cbiAgaWYgKG9mZnNldCA8IGJ1ZmZlci5sZW5ndGgpIHtcbiAgICBidWZmZXJbb2Zmc2V0XSA9IHZhbHVlO1xuICB9XG59O1xuXG5mdW5jdGlvbiB3cml0ZVVJbnQxNihidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzQmlnRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0Lm9rKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsXG4gICAgICAgICdtaXNzaW5nIHZhbHVlJyk7XG5cbiAgICBhc3NlcnQub2sodHlwZW9mIChpc0JpZ0VuZGlhbikgPT09ICdib29sZWFuJyxcbiAgICAgICAgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKTtcblxuICAgIGFzc2VydC5vayhvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsXG4gICAgICAgICdtaXNzaW5nIG9mZnNldCcpO1xuXG4gICAgYXNzZXJ0Lm9rKG9mZnNldCArIDEgPCBidWZmZXIubGVuZ3RoLFxuICAgICAgICAndHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJyk7XG5cbiAgICB2ZXJpZnVpbnQodmFsdWUsIDB4ZmZmZik7XG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IE1hdGgubWluKGJ1ZmZlci5sZW5ndGggLSBvZmZzZXQsIDIpOyBpKyspIHtcbiAgICBidWZmZXJbb2Zmc2V0ICsgaV0gPVxuICAgICAgICAodmFsdWUgJiAoMHhmZiA8PCAoOCAqIChpc0JpZ0VuZGlhbiA/IDEgLSBpIDogaSkpKSkgPj4+XG4gICAgICAgICAgICAoaXNCaWdFbmRpYW4gPyAxIC0gaSA6IGkpICogODtcbiAgfVxuXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydCk7XG59O1xuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbih2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB3cml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydCk7XG59O1xuXG5mdW5jdGlvbiB3cml0ZVVJbnQzMihidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzQmlnRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0Lm9rKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsXG4gICAgICAgICdtaXNzaW5nIHZhbHVlJyk7XG5cbiAgICBhc3NlcnQub2sodHlwZW9mIChpc0JpZ0VuZGlhbikgPT09ICdib29sZWFuJyxcbiAgICAgICAgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKTtcblxuICAgIGFzc2VydC5vayhvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsXG4gICAgICAgICdtaXNzaW5nIG9mZnNldCcpO1xuXG4gICAgYXNzZXJ0Lm9rKG9mZnNldCArIDMgPCBidWZmZXIubGVuZ3RoLFxuICAgICAgICAndHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJyk7XG5cbiAgICB2ZXJpZnVpbnQodmFsdWUsIDB4ZmZmZmZmZmYpO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBNYXRoLm1pbihidWZmZXIubGVuZ3RoIC0gb2Zmc2V0LCA0KTsgaSsrKSB7XG4gICAgYnVmZmVyW29mZnNldCArIGldID1cbiAgICAgICAgKHZhbHVlID4+PiAoaXNCaWdFbmRpYW4gPyAzIC0gaSA6IGkpICogOCkgJiAweGZmO1xuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydCk7XG59O1xuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbih2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB3cml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydCk7XG59O1xuXG5cbi8qXG4gKiBXZSBub3cgbW92ZSBvbnRvIG91ciBmcmllbmRzIGluIHRoZSBzaWduZWQgbnVtYmVyIGNhdGVnb3J5LiBVbmxpa2UgdW5zaWduZWRcbiAqIG51bWJlcnMsIHdlJ3JlIGdvaW5nIHRvIGhhdmUgdG8gd29ycnkgYSBiaXQgbW9yZSBhYm91dCBob3cgd2UgcHV0IHZhbHVlcyBpbnRvXG4gKiBhcnJheXMuIFNpbmNlIHdlIGFyZSBvbmx5IHdvcnJ5aW5nIGFib3V0IHNpZ25lZCAzMi1iaXQgdmFsdWVzLCB3ZSdyZSBpblxuICogc2xpZ2h0bHkgYmV0dGVyIHNoYXBlLiBVbmZvcnR1bmF0ZWx5LCB3ZSByZWFsbHkgY2FuJ3QgZG8gb3VyIGZhdm9yaXRlIGJpbmFyeVxuICogJiBpbiB0aGlzIHN5c3RlbS4gSXQgcmVhbGx5IHNlZW1zIHRvIGRvIHRoZSB3cm9uZyB0aGluZy4gRm9yIGV4YW1wbGU6XG4gKlxuICogPiAtMzIgJiAweGZmXG4gKiAyMjRcbiAqXG4gKiBXaGF0J3MgaGFwcGVuaW5nIGFib3ZlIGlzIHJlYWxseTogMHhlMCAmIDB4ZmYgPSAweGUwLiBIb3dldmVyLCB0aGUgcmVzdWx0cyBvZlxuICogdGhpcyBhcmVuJ3QgdHJlYXRlZCBhcyBhIHNpZ25lZCBudW1iZXIuIFVsdGltYXRlbHkgYSBiYWQgdGhpbmcuXG4gKlxuICogV2hhdCB3ZSdyZSBnb2luZyB0byB3YW50IHRvIGRvIGlzIGJhc2ljYWxseSBjcmVhdGUgdGhlIHVuc2lnbmVkIGVxdWl2YWxlbnQgb2ZcbiAqIG91ciByZXByZXNlbnRhdGlvbiBhbmQgcGFzcyB0aGF0IG9mZiB0byB0aGUgd3VpbnQqIGZ1bmN0aW9ucy4gVG8gZG8gdGhhdFxuICogd2UncmUgZ29pbmcgdG8gZG8gdGhlIGZvbGxvd2luZzpcbiAqXG4gKiAgLSBpZiB0aGUgdmFsdWUgaXMgcG9zaXRpdmVcbiAqICAgICAgd2UgY2FuIHBhc3MgaXQgZGlyZWN0bHkgb2ZmIHRvIHRoZSBlcXVpdmFsZW50IHd1aW50XG4gKiAgLSBpZiB0aGUgdmFsdWUgaXMgbmVnYXRpdmVcbiAqICAgICAgd2UgZG8gdGhlIGZvbGxvd2luZyBjb21wdXRhdGlvbjpcbiAqICAgICAgICAgbWIgKyB2YWwgKyAxLCB3aGVyZVxuICogICAgICAgICBtYiAgIGlzIHRoZSBtYXhpbXVtIHVuc2lnbmVkIHZhbHVlIGluIHRoYXQgYnl0ZSBzaXplXG4gKiAgICAgICAgIHZhbCAgaXMgdGhlIEphdmFzY3JpcHQgbmVnYXRpdmUgaW50ZWdlclxuICpcbiAqXG4gKiBBcyBhIGNvbmNyZXRlIHZhbHVlLCB0YWtlIC0xMjguIEluIHNpZ25lZCAxNiBiaXRzIHRoaXMgd291bGQgYmUgMHhmZjgwLiBJZlxuICogeW91IGRvIG91dCB0aGUgY29tcHV0YXRpb25zOlxuICpcbiAqIDB4ZmZmZiAtIDEyOCArIDFcbiAqIDB4ZmZmZiAtIDEyN1xuICogMHhmZjgwXG4gKlxuICogWW91IGNhbiB0aGVuIGVuY29kZSB0aGlzIHZhbHVlIGFzIHRoZSBzaWduZWQgdmVyc2lvbi4gVGhpcyBpcyByZWFsbHkgcmF0aGVyXG4gKiBoYWNreSwgYnV0IGl0IHNob3VsZCB3b3JrIGFuZCBnZXQgdGhlIGpvYiBkb25lIHdoaWNoIGlzIG91ciBnb2FsIGhlcmUuXG4gKi9cblxuLypcbiAqIEEgc2VyaWVzIG9mIGNoZWNrcyB0byBtYWtlIHN1cmUgd2UgYWN0dWFsbHkgaGF2ZSBhIHNpZ25lZCAzMi1iaXQgbnVtYmVyXG4gKi9cbmZ1bmN0aW9uIHZlcmlmc2ludCh2YWx1ZSwgbWF4LCBtaW4pIHtcbiAgYXNzZXJ0Lm9rKHR5cGVvZiAodmFsdWUpID09ICdudW1iZXInLFxuICAgICAgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKTtcblxuICBhc3NlcnQub2sodmFsdWUgPD0gbWF4LCAndmFsdWUgbGFyZ2VyIHRoYW4gbWF4aW11bSBhbGxvd2VkIHZhbHVlJyk7XG5cbiAgYXNzZXJ0Lm9rKHZhbHVlID49IG1pbiwgJ3ZhbHVlIHNtYWxsZXIgdGhhbiBtaW5pbXVtIGFsbG93ZWQgdmFsdWUnKTtcblxuICBhc3NlcnQub2soTWF0aC5mbG9vcih2YWx1ZSkgPT09IHZhbHVlLCAndmFsdWUgaGFzIGEgZnJhY3Rpb25hbCBjb21wb25lbnQnKTtcbn1cblxuZnVuY3Rpb24gdmVyaWZJRUVFNzU0KHZhbHVlLCBtYXgsIG1pbikge1xuICBhc3NlcnQub2sodHlwZW9mICh2YWx1ZSkgPT0gJ251bWJlcicsXG4gICAgICAnY2Fubm90IHdyaXRlIGEgbm9uLW51bWJlciBhcyBhIG51bWJlcicpO1xuXG4gIGFzc2VydC5vayh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBsYXJnZXIgdGhhbiBtYXhpbXVtIGFsbG93ZWQgdmFsdWUnKTtcblxuICBhc3NlcnQub2sodmFsdWUgPj0gbWluLCAndmFsdWUgc21hbGxlciB0aGFuIG1pbmltdW0gYWxsb3dlZCB2YWx1ZScpO1xufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhciBidWZmZXIgPSB0aGlzO1xuXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQub2sodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3NpbmcgdmFsdWUnKTtcblxuICAgIGFzc2VydC5vayhvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsXG4gICAgICAgICdtaXNzaW5nIG9mZnNldCcpO1xuXG4gICAgYXNzZXJ0Lm9rKG9mZnNldCA8IGJ1ZmZlci5sZW5ndGgsXG4gICAgICAgICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKTtcblxuICAgIHZlcmlmc2ludCh2YWx1ZSwgMHg3ZiwgLTB4ODApO1xuICB9XG5cbiAgaWYgKHZhbHVlID49IDApIHtcbiAgICBidWZmZXIud3JpdGVVSW50OCh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCk7XG4gIH0gZWxzZSB7XG4gICAgYnVmZmVyLndyaXRlVUludDgoMHhmZiArIHZhbHVlICsgMSwgb2Zmc2V0LCBub0Fzc2VydCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHdyaXRlSW50MTYoYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0JpZ0VuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydC5vayh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLFxuICAgICAgICAnbWlzc2luZyB2YWx1ZScpO1xuXG4gICAgYXNzZXJ0Lm9rKHR5cGVvZiAoaXNCaWdFbmRpYW4pID09PSAnYm9vbGVhbicsXG4gICAgICAgICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJyk7XG5cbiAgICBhc3NlcnQub2sob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLFxuICAgICAgICAnbWlzc2luZyBvZmZzZXQnKTtcblxuICAgIGFzc2VydC5vayhvZmZzZXQgKyAxIDwgYnVmZmVyLmxlbmd0aCxcbiAgICAgICAgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpO1xuXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmZmYsIC0weDgwMDApO1xuICB9XG5cbiAgaWYgKHZhbHVlID49IDApIHtcbiAgICB3cml0ZVVJbnQxNihidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzQmlnRW5kaWFuLCBub0Fzc2VydCk7XG4gIH0gZWxzZSB7XG4gICAgd3JpdGVVSW50MTYoYnVmZmVyLCAweGZmZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgaXNCaWdFbmRpYW4sIG5vQXNzZXJ0KTtcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRSA9IGZ1bmN0aW9uKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHdyaXRlSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KTtcbn07XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFID0gZnVuY3Rpb24odmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgd3JpdGVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydCk7XG59O1xuXG5mdW5jdGlvbiB3cml0ZUludDMyKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNCaWdFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQub2sodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3NpbmcgdmFsdWUnKTtcblxuICAgIGFzc2VydC5vayh0eXBlb2YgKGlzQmlnRW5kaWFuKSA9PT0gJ2Jvb2xlYW4nLFxuICAgICAgICAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpO1xuXG4gICAgYXNzZXJ0Lm9rKG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3Npbmcgb2Zmc2V0Jyk7XG5cbiAgICBhc3NlcnQub2sob2Zmc2V0ICsgMyA8IGJ1ZmZlci5sZW5ndGgsXG4gICAgICAgICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKTtcblxuICAgIHZlcmlmc2ludCh2YWx1ZSwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApO1xuICB9XG5cbiAgaWYgKHZhbHVlID49IDApIHtcbiAgICB3cml0ZVVJbnQzMihidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzQmlnRW5kaWFuLCBub0Fzc2VydCk7XG4gIH0gZWxzZSB7XG4gICAgd3JpdGVVSW50MzIoYnVmZmVyLCAweGZmZmZmZmZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIGlzQmlnRW5kaWFuLCBub0Fzc2VydCk7XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbih2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB3cml0ZUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydCk7XG59O1xuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHdyaXRlSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpO1xufTtcblxuZnVuY3Rpb24gd3JpdGVGbG9hdChidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzQmlnRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0Lm9rKHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsXG4gICAgICAgICdtaXNzaW5nIHZhbHVlJyk7XG5cbiAgICBhc3NlcnQub2sodHlwZW9mIChpc0JpZ0VuZGlhbikgPT09ICdib29sZWFuJyxcbiAgICAgICAgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKTtcblxuICAgIGFzc2VydC5vayhvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsXG4gICAgICAgICdtaXNzaW5nIG9mZnNldCcpO1xuXG4gICAgYXNzZXJ0Lm9rKG9mZnNldCArIDMgPCBidWZmZXIubGVuZ3RoLFxuICAgICAgICAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJyk7XG5cbiAgICB2ZXJpZklFRUU3NTQodmFsdWUsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KTtcbiAgfVxuXG4gIHJlcXVpcmUoJy4vYnVmZmVyX2llZWU3NTQnKS53cml0ZUlFRUU3NTQoYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0JpZ0VuZGlhbixcbiAgICAgIDIzLCA0KTtcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbih2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydCk7XG59O1xuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpO1xufTtcblxuZnVuY3Rpb24gd3JpdGVEb3VibGUoYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0JpZ0VuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydC5vayh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLFxuICAgICAgICAnbWlzc2luZyB2YWx1ZScpO1xuXG4gICAgYXNzZXJ0Lm9rKHR5cGVvZiAoaXNCaWdFbmRpYW4pID09PSAnYm9vbGVhbicsXG4gICAgICAgICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJyk7XG5cbiAgICBhc3NlcnQub2sob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLFxuICAgICAgICAnbWlzc2luZyBvZmZzZXQnKTtcblxuICAgIGFzc2VydC5vayhvZmZzZXQgKyA3IDwgYnVmZmVyLmxlbmd0aCxcbiAgICAgICAgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpO1xuXG4gICAgdmVyaWZJRUVFNzU0KHZhbHVlLCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KTtcbiAgfVxuXG4gIHJlcXVpcmUoJy4vYnVmZmVyX2llZWU3NTQnKS53cml0ZUlFRUU3NTQoYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0JpZ0VuZGlhbixcbiAgICAgIDUyLCA4KTtcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24odmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KTtcbn07XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVCRSA9IGZ1bmN0aW9uKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KTtcbn07XG5cbn0se1wiLi9idWZmZXJfaWVlZTc1NFwiOjEsXCJhc3NlcnRcIjo2LFwiYmFzZTY0LWpzXCI6NH1dLFwiYnVmZmVyLWJyb3dzZXJpZnlcIjpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5tb2R1bGUuZXhwb3J0cz1yZXF1aXJlKCdxOVR4Q0MnKTtcbn0se31dLDQ6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuKGZ1bmN0aW9uIChleHBvcnRzKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuXHR2YXIgbG9va3VwID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nO1xuXG5cdGZ1bmN0aW9uIGI2NFRvQnl0ZUFycmF5KGI2NCkge1xuXHRcdHZhciBpLCBqLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyO1xuXHRcblx0XHRpZiAoYjY0Lmxlbmd0aCAlIDQgPiAwKSB7XG5cdFx0XHR0aHJvdyAnSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCc7XG5cdFx0fVxuXG5cdFx0Ly8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcblx0XHQvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG5cdFx0Ly8gcmVwcmVzZW50IG9uZSBieXRlXG5cdFx0Ly8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG5cdFx0Ly8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuXHRcdHBsYWNlSG9sZGVycyA9IGI2NC5pbmRleE9mKCc9Jyk7XG5cdFx0cGxhY2VIb2xkZXJzID0gcGxhY2VIb2xkZXJzID4gMCA/IGI2NC5sZW5ndGggLSBwbGFjZUhvbGRlcnMgOiAwO1xuXG5cdFx0Ly8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG5cdFx0YXJyID0gW107Ly9uZXcgVWludDhBcnJheShiNjQubGVuZ3RoICogMyAvIDQgLSBwbGFjZUhvbGRlcnMpO1xuXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuXHRcdGwgPSBwbGFjZUhvbGRlcnMgPiAwID8gYjY0Lmxlbmd0aCAtIDQgOiBiNjQubGVuZ3RoO1xuXG5cdFx0Zm9yIChpID0gMCwgaiA9IDA7IGkgPCBsOyBpICs9IDQsIGogKz0gMykge1xuXHRcdFx0dG1wID0gKGxvb2t1cC5pbmRleE9mKGI2NFtpXSkgPDwgMTgpIHwgKGxvb2t1cC5pbmRleE9mKGI2NFtpICsgMV0pIDw8IDEyKSB8IChsb29rdXAuaW5kZXhPZihiNjRbaSArIDJdKSA8PCA2KSB8IGxvb2t1cC5pbmRleE9mKGI2NFtpICsgM10pO1xuXHRcdFx0YXJyLnB1c2goKHRtcCAmIDB4RkYwMDAwKSA+PiAxNik7XG5cdFx0XHRhcnIucHVzaCgodG1wICYgMHhGRjAwKSA+PiA4KTtcblx0XHRcdGFyci5wdXNoKHRtcCAmIDB4RkYpO1xuXHRcdH1cblxuXHRcdGlmIChwbGFjZUhvbGRlcnMgPT09IDIpIHtcblx0XHRcdHRtcCA9IChsb29rdXAuaW5kZXhPZihiNjRbaV0pIDw8IDIpIHwgKGxvb2t1cC5pbmRleE9mKGI2NFtpICsgMV0pID4+IDQpO1xuXHRcdFx0YXJyLnB1c2godG1wICYgMHhGRik7XG5cdFx0fSBlbHNlIGlmIChwbGFjZUhvbGRlcnMgPT09IDEpIHtcblx0XHRcdHRtcCA9IChsb29rdXAuaW5kZXhPZihiNjRbaV0pIDw8IDEwKSB8IChsb29rdXAuaW5kZXhPZihiNjRbaSArIDFdKSA8PCA0KSB8IChsb29rdXAuaW5kZXhPZihiNjRbaSArIDJdKSA+PiAyKTtcblx0XHRcdGFyci5wdXNoKCh0bXAgPj4gOCkgJiAweEZGKTtcblx0XHRcdGFyci5wdXNoKHRtcCAmIDB4RkYpO1xuXHRcdH1cblxuXHRcdHJldHVybiBhcnI7XG5cdH1cblxuXHRmdW5jdGlvbiB1aW50OFRvQmFzZTY0KHVpbnQ4KSB7XG5cdFx0dmFyIGksXG5cdFx0XHRleHRyYUJ5dGVzID0gdWludDgubGVuZ3RoICUgMywgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcblx0XHRcdG91dHB1dCA9IFwiXCIsXG5cdFx0XHR0ZW1wLCBsZW5ndGg7XG5cblx0XHRmdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuXHRcdFx0cmV0dXJuIGxvb2t1cFtudW0gPj4gMTggJiAweDNGXSArIGxvb2t1cFtudW0gPj4gMTIgJiAweDNGXSArIGxvb2t1cFtudW0gPj4gNiAmIDB4M0ZdICsgbG9va3VwW251bSAmIDB4M0ZdO1xuXHRcdH07XG5cblx0XHQvLyBnbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG5cdFx0Zm9yIChpID0gMCwgbGVuZ3RoID0gdWludDgubGVuZ3RoIC0gZXh0cmFCeXRlczsgaSA8IGxlbmd0aDsgaSArPSAzKSB7XG5cdFx0XHR0ZW1wID0gKHVpbnQ4W2ldIDw8IDE2KSArICh1aW50OFtpICsgMV0gPDwgOCkgKyAodWludDhbaSArIDJdKTtcblx0XHRcdG91dHB1dCArPSB0cmlwbGV0VG9CYXNlNjQodGVtcCk7XG5cdFx0fVxuXG5cdFx0Ly8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuXHRcdHN3aXRjaCAoZXh0cmFCeXRlcykge1xuXHRcdFx0Y2FzZSAxOlxuXHRcdFx0XHR0ZW1wID0gdWludDhbdWludDgubGVuZ3RoIC0gMV07XG5cdFx0XHRcdG91dHB1dCArPSBsb29rdXBbdGVtcCA+PiAyXTtcblx0XHRcdFx0b3V0cHV0ICs9IGxvb2t1cFsodGVtcCA8PCA0KSAmIDB4M0ZdO1xuXHRcdFx0XHRvdXRwdXQgKz0gJz09Jztcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHRlbXAgPSAodWludDhbdWludDgubGVuZ3RoIC0gMl0gPDwgOCkgKyAodWludDhbdWludDgubGVuZ3RoIC0gMV0pO1xuXHRcdFx0XHRvdXRwdXQgKz0gbG9va3VwW3RlbXAgPj4gMTBdO1xuXHRcdFx0XHRvdXRwdXQgKz0gbG9va3VwWyh0ZW1wID4+IDQpICYgMHgzRl07XG5cdFx0XHRcdG91dHB1dCArPSBsb29rdXBbKHRlbXAgPDwgMikgJiAweDNGXTtcblx0XHRcdFx0b3V0cHV0ICs9ICc9Jztcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG91dHB1dDtcblx0fVxuXG5cdG1vZHVsZS5leHBvcnRzLnRvQnl0ZUFycmF5ID0gYjY0VG9CeXRlQXJyYXk7XG5cdG1vZHVsZS5leHBvcnRzLmZyb21CeXRlQXJyYXkgPSB1aW50OFRvQmFzZTY0O1xufSgpKTtcblxufSx7fV0sNTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XG5cblxuLy9cbi8vIFRoZSBzaGltcyBpbiB0aGlzIGZpbGUgYXJlIG5vdCBmdWxseSBpbXBsZW1lbnRlZCBzaGltcyBmb3IgdGhlIEVTNVxuLy8gZmVhdHVyZXMsIGJ1dCBkbyB3b3JrIGZvciB0aGUgcGFydGljdWxhciB1c2VjYXNlcyB0aGVyZSBpcyBpblxuLy8gdGhlIG90aGVyIG1vZHVsZXMuXG4vL1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLy8gQXJyYXkuaXNBcnJheSBpcyBzdXBwb3J0ZWQgaW4gSUU5XG5mdW5jdGlvbiBpc0FycmF5KHhzKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHhzKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn1cbmV4cG9ydHMuaXNBcnJheSA9IHR5cGVvZiBBcnJheS5pc0FycmF5ID09PSAnZnVuY3Rpb24nID8gQXJyYXkuaXNBcnJheSA6IGlzQXJyYXk7XG5cbi8vIEFycmF5LnByb3RvdHlwZS5pbmRleE9mIGlzIHN1cHBvcnRlZCBpbiBJRTlcbmV4cG9ydHMuaW5kZXhPZiA9IGZ1bmN0aW9uIGluZGV4T2YoeHMsIHgpIHtcbiAgaWYgKHhzLmluZGV4T2YpIHJldHVybiB4cy5pbmRleE9mKHgpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKHggPT09IHhzW2ldKSByZXR1cm4gaTtcbiAgfVxuICByZXR1cm4gLTE7XG59O1xuXG4vLyBBcnJheS5wcm90b3R5cGUuZmlsdGVyIGlzIHN1cHBvcnRlZCBpbiBJRTlcbmV4cG9ydHMuZmlsdGVyID0gZnVuY3Rpb24gZmlsdGVyKHhzLCBmbikge1xuICBpZiAoeHMuZmlsdGVyKSByZXR1cm4geHMuZmlsdGVyKGZuKTtcbiAgdmFyIHJlcyA9IFtdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGZuKHhzW2ldLCBpLCB4cykpIHJlcy5wdXNoKHhzW2ldKTtcbiAgfVxuICByZXR1cm4gcmVzO1xufTtcblxuLy8gQXJyYXkucHJvdG90eXBlLmZvckVhY2ggaXMgc3VwcG9ydGVkIGluIElFOVxuZXhwb3J0cy5mb3JFYWNoID0gZnVuY3Rpb24gZm9yRWFjaCh4cywgZm4sIHNlbGYpIHtcbiAgaWYgKHhzLmZvckVhY2gpIHJldHVybiB4cy5mb3JFYWNoKGZuLCBzZWxmKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgIGZuLmNhbGwoc2VsZiwgeHNbaV0sIGksIHhzKTtcbiAgfVxufTtcblxuLy8gQXJyYXkucHJvdG90eXBlLm1hcCBpcyBzdXBwb3J0ZWQgaW4gSUU5XG5leHBvcnRzLm1hcCA9IGZ1bmN0aW9uIG1hcCh4cywgZm4pIHtcbiAgaWYgKHhzLm1hcCkgcmV0dXJuIHhzLm1hcChmbik7XG4gIHZhciBvdXQgPSBuZXcgQXJyYXkoeHMubGVuZ3RoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgIG91dFtpXSA9IGZuKHhzW2ldLCBpLCB4cyk7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn07XG5cbi8vIEFycmF5LnByb3RvdHlwZS5yZWR1Y2UgaXMgc3VwcG9ydGVkIGluIElFOVxuZXhwb3J0cy5yZWR1Y2UgPSBmdW5jdGlvbiByZWR1Y2UoYXJyYXksIGNhbGxiYWNrLCBvcHRfaW5pdGlhbFZhbHVlKSB7XG4gIGlmIChhcnJheS5yZWR1Y2UpIHJldHVybiBhcnJheS5yZWR1Y2UoY2FsbGJhY2ssIG9wdF9pbml0aWFsVmFsdWUpO1xuICB2YXIgdmFsdWUsIGlzVmFsdWVTZXQgPSBmYWxzZTtcblxuICBpZiAoMiA8IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICB2YWx1ZSA9IG9wdF9pbml0aWFsVmFsdWU7XG4gICAgaXNWYWx1ZVNldCA9IHRydWU7XG4gIH1cbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhcnJheS5sZW5ndGg7IGwgPiBpOyArK2kpIHtcbiAgICBpZiAoYXJyYXkuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgIGlmIChpc1ZhbHVlU2V0KSB7XG4gICAgICAgIHZhbHVlID0gY2FsbGJhY2sodmFsdWUsIGFycmF5W2ldLCBpLCBhcnJheSk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdmFsdWUgPSBhcnJheVtpXTtcbiAgICAgICAgaXNWYWx1ZVNldCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHZhbHVlO1xufTtcblxuLy8gU3RyaW5nLnByb3RvdHlwZS5zdWJzdHIgLSBuZWdhdGl2ZSBpbmRleCBkb24ndCB3b3JrIGluIElFOFxuaWYgKCdhYicuc3Vic3RyKC0xKSAhPT0gJ2InKSB7XG4gIGV4cG9ydHMuc3Vic3RyID0gZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbmd0aCkge1xuICAgIC8vIGRpZCB3ZSBnZXQgYSBuZWdhdGl2ZSBzdGFydCwgY2FsY3VsYXRlIGhvdyBtdWNoIGl0IGlzIGZyb20gdGhlIGJlZ2lubmluZyBvZiB0aGUgc3RyaW5nXG4gICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSBzdHIubGVuZ3RoICsgc3RhcnQ7XG5cbiAgICAvLyBjYWxsIHRoZSBvcmlnaW5hbCBmdW5jdGlvblxuICAgIHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW5ndGgpO1xuICB9O1xufSBlbHNlIHtcbiAgZXhwb3J0cy5zdWJzdHIgPSBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuZ3RoKSB7XG4gICAgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbmd0aCk7XG4gIH07XG59XG5cbi8vIFN0cmluZy5wcm90b3R5cGUudHJpbSBpcyBzdXBwb3J0ZWQgaW4gSUU5XG5leHBvcnRzLnRyaW0gPSBmdW5jdGlvbiAoc3RyKSB7XG4gIGlmIChzdHIudHJpbSkgcmV0dXJuIHN0ci50cmltKCk7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpO1xufTtcblxuLy8gRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgaXMgc3VwcG9ydGVkIGluIElFOVxuZXhwb3J0cy5iaW5kID0gZnVuY3Rpb24gKCkge1xuICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gIHZhciBmbiA9IGFyZ3Muc2hpZnQoKTtcbiAgaWYgKGZuLmJpbmQpIHJldHVybiBmbi5iaW5kLmFwcGx5KGZuLCBhcmdzKTtcbiAgdmFyIHNlbGYgPSBhcmdzLnNoaWZ0KCk7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgZm4uYXBwbHkoc2VsZiwgYXJncy5jb25jYXQoW0FycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyldKSk7XG4gIH07XG59O1xuXG4vLyBPYmplY3QuY3JlYXRlIGlzIHN1cHBvcnRlZCBpbiBJRTlcbmZ1bmN0aW9uIGNyZWF0ZShwcm90b3R5cGUsIHByb3BlcnRpZXMpIHtcbiAgdmFyIG9iamVjdDtcbiAgaWYgKHByb3RvdHlwZSA9PT0gbnVsbCkge1xuICAgIG9iamVjdCA9IHsgJ19fcHJvdG9fXycgOiBudWxsIH07XG4gIH1cbiAgZWxzZSB7XG4gICAgaWYgKHR5cGVvZiBwcm90b3R5cGUgIT09ICdvYmplY3QnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAndHlwZW9mIHByb3RvdHlwZVsnICsgKHR5cGVvZiBwcm90b3R5cGUpICsgJ10gIT0gXFwnb2JqZWN0XFwnJ1xuICAgICAgKTtcbiAgICB9XG4gICAgdmFyIFR5cGUgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICBUeXBlLnByb3RvdHlwZSA9IHByb3RvdHlwZTtcbiAgICBvYmplY3QgPSBuZXcgVHlwZSgpO1xuICAgIG9iamVjdC5fX3Byb3RvX18gPSBwcm90b3R5cGU7XG4gIH1cbiAgaWYgKHR5cGVvZiBwcm9wZXJ0aWVzICE9PSAndW5kZWZpbmVkJyAmJiBPYmplY3QuZGVmaW5lUHJvcGVydGllcykge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG9iamVjdCwgcHJvcGVydGllcyk7XG4gIH1cbiAgcmV0dXJuIG9iamVjdDtcbn1cbmV4cG9ydHMuY3JlYXRlID0gdHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicgPyBPYmplY3QuY3JlYXRlIDogY3JlYXRlO1xuXG4vLyBPYmplY3Qua2V5cyBhbmQgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMgaXMgc3VwcG9ydGVkIGluIElFOSBob3dldmVyXG4vLyB0aGV5IGRvIHNob3cgYSBkZXNjcmlwdGlvbiBhbmQgbnVtYmVyIHByb3BlcnR5IG9uIEVycm9yIG9iamVjdHNcbmZ1bmN0aW9uIG5vdE9iamVjdChvYmplY3QpIHtcbiAgcmV0dXJuICgodHlwZW9mIG9iamVjdCAhPSBcIm9iamVjdFwiICYmIHR5cGVvZiBvYmplY3QgIT0gXCJmdW5jdGlvblwiKSB8fCBvYmplY3QgPT09IG51bGwpO1xufVxuXG5mdW5jdGlvbiBrZXlzU2hpbShvYmplY3QpIHtcbiAgaWYgKG5vdE9iamVjdChvYmplY3QpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdC5rZXlzIGNhbGxlZCBvbiBhIG5vbi1vYmplY3RcIik7XG4gIH1cblxuICB2YXIgcmVzdWx0ID0gW107XG4gIGZvciAodmFyIG5hbWUgaW4gb2JqZWN0KSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBuYW1lKSkge1xuICAgICAgcmVzdWx0LnB1c2gobmFtZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8vIGdldE93blByb3BlcnR5TmFtZXMgaXMgYWxtb3N0IHRoZSBzYW1lIGFzIE9iamVjdC5rZXlzIG9uZSBrZXkgZmVhdHVyZVxuLy8gIGlzIHRoYXQgaXQgcmV0dXJucyBoaWRkZW4gcHJvcGVydGllcywgc2luY2UgdGhhdCBjYW4ndCBiZSBpbXBsZW1lbnRlZCxcbi8vICB0aGlzIGZlYXR1cmUgZ2V0cyByZWR1Y2VkIHNvIGl0IGp1c3Qgc2hvd3MgdGhlIGxlbmd0aCBwcm9wZXJ0eSBvbiBhcnJheXNcbmZ1bmN0aW9uIHByb3BlcnR5U2hpbShvYmplY3QpIHtcbiAgaWYgKG5vdE9iamVjdChvYmplY3QpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzIGNhbGxlZCBvbiBhIG5vbi1vYmplY3RcIik7XG4gIH1cblxuICB2YXIgcmVzdWx0ID0ga2V5c1NoaW0ob2JqZWN0KTtcbiAgaWYgKGV4cG9ydHMuaXNBcnJheShvYmplY3QpICYmIGV4cG9ydHMuaW5kZXhPZihvYmplY3QsICdsZW5ndGgnKSA9PT0gLTEpIHtcbiAgICByZXN1bHQucHVzaCgnbGVuZ3RoJyk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxudmFyIGtleXMgPSB0eXBlb2YgT2JqZWN0LmtleXMgPT09ICdmdW5jdGlvbicgPyBPYmplY3Qua2V5cyA6IGtleXNTaGltO1xudmFyIGdldE93blByb3BlcnR5TmFtZXMgPSB0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMgPT09ICdmdW5jdGlvbicgP1xuICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyA6IHByb3BlcnR5U2hpbTtcblxuaWYgKG5ldyBFcnJvcigpLmhhc093blByb3BlcnR5KCdkZXNjcmlwdGlvbicpKSB7XG4gIHZhciBFUlJPUl9QUk9QRVJUWV9GSUxURVIgPSBmdW5jdGlvbiAob2JqLCBhcnJheSkge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEVycm9yXScpIHtcbiAgICAgIGFycmF5ID0gZXhwb3J0cy5maWx0ZXIoYXJyYXksIGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHJldHVybiBuYW1lICE9PSAnZGVzY3JpcHRpb24nICYmIG5hbWUgIT09ICdudW1iZXInICYmIG5hbWUgIT09ICdtZXNzYWdlJztcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gYXJyYXk7XG4gIH07XG5cbiAgZXhwb3J0cy5rZXlzID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgIHJldHVybiBFUlJPUl9QUk9QRVJUWV9GSUxURVIob2JqZWN0LCBrZXlzKG9iamVjdCkpO1xuICB9O1xuICBleHBvcnRzLmdldE93blByb3BlcnR5TmFtZXMgPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgcmV0dXJuIEVSUk9SX1BST1BFUlRZX0ZJTFRFUihvYmplY3QsIGdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KSk7XG4gIH07XG59IGVsc2Uge1xuICBleHBvcnRzLmtleXMgPSBrZXlzO1xuICBleHBvcnRzLmdldE93blByb3BlcnR5TmFtZXMgPSBnZXRPd25Qcm9wZXJ0eU5hbWVzO1xufVxuXG4vLyBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIC0gc3VwcG9ydGVkIGluIElFOCBidXQgb25seSBvbiBkb20gZWxlbWVudHNcbmZ1bmN0aW9uIHZhbHVlT2JqZWN0KHZhbHVlLCBrZXkpIHtcbiAgcmV0dXJuIHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbn1cblxuaWYgKHR5cGVvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID09PSAnZnVuY3Rpb24nKSB7XG4gIHRyeSB7XG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih7J2EnOiAxfSwgJ2EnKTtcbiAgICBleHBvcnRzLmdldE93blByb3BlcnR5RGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyBJRTggZG9tIGVsZW1lbnQgaXNzdWUgLSB1c2UgYSB0cnkgY2F0Y2ggYW5kIGRlZmF1bHQgdG8gdmFsdWVPYmplY3RcbiAgICBleHBvcnRzLmdldE93blByb3BlcnR5RGVzY3JpcHRvciA9IGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlT2JqZWN0KHZhbHVlLCBrZXkpO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn0gZWxzZSB7XG4gIGV4cG9ydHMuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID0gdmFsdWVPYmplY3Q7XG59XG5cbn0se31dLDY6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIFVUSUxJVFlcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xudmFyIHNoaW1zID0gcmVxdWlyZSgnX3NoaW1zJyk7XG52YXIgcFNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuXG4vLyAxLiBUaGUgYXNzZXJ0IG1vZHVsZSBwcm92aWRlcyBmdW5jdGlvbnMgdGhhdCB0aHJvd1xuLy8gQXNzZXJ0aW9uRXJyb3IncyB3aGVuIHBhcnRpY3VsYXIgY29uZGl0aW9ucyBhcmUgbm90IG1ldC4gVGhlXG4vLyBhc3NlcnQgbW9kdWxlIG11c3QgY29uZm9ybSB0byB0aGUgZm9sbG93aW5nIGludGVyZmFjZS5cblxudmFyIGFzc2VydCA9IG1vZHVsZS5leHBvcnRzID0gb2s7XG5cbi8vIDIuIFRoZSBBc3NlcnRpb25FcnJvciBpcyBkZWZpbmVkIGluIGFzc2VydC5cbi8vIG5ldyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IoeyBtZXNzYWdlOiBtZXNzYWdlLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdHVhbDogYWN0dWFsLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBleHBlY3RlZCB9KVxuXG5hc3NlcnQuQXNzZXJ0aW9uRXJyb3IgPSBmdW5jdGlvbiBBc3NlcnRpb25FcnJvcihvcHRpb25zKSB7XG4gIHRoaXMubmFtZSA9ICdBc3NlcnRpb25FcnJvcic7XG4gIHRoaXMuYWN0dWFsID0gb3B0aW9ucy5hY3R1YWw7XG4gIHRoaXMuZXhwZWN0ZWQgPSBvcHRpb25zLmV4cGVjdGVkO1xuICB0aGlzLm9wZXJhdG9yID0gb3B0aW9ucy5vcGVyYXRvcjtcbiAgdGhpcy5tZXNzYWdlID0gb3B0aW9ucy5tZXNzYWdlIHx8IGdldE1lc3NhZ2UodGhpcyk7XG59O1xuXG4vLyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IgaW5zdGFuY2VvZiBFcnJvclxudXRpbC5pbmhlcml0cyhhc3NlcnQuQXNzZXJ0aW9uRXJyb3IsIEVycm9yKTtcblxuZnVuY3Rpb24gcmVwbGFjZXIoa2V5LCB2YWx1ZSkge1xuICBpZiAodXRpbC5pc1VuZGVmaW5lZCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gJycgKyB2YWx1ZTtcbiAgfVxuICBpZiAodXRpbC5pc051bWJlcih2YWx1ZSkgJiYgKGlzTmFOKHZhbHVlKSB8fCAhaXNGaW5pdGUodmFsdWUpKSkge1xuICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpO1xuICB9XG4gIGlmICh1dGlsLmlzRnVuY3Rpb24odmFsdWUpIHx8IHV0aWwuaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlLnRvU3RyaW5nKCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiB0cnVuY2F0ZShzLCBuKSB7XG4gIGlmICh1dGlsLmlzU3RyaW5nKHMpKSB7XG4gICAgcmV0dXJuIHMubGVuZ3RoIDwgbiA/IHMgOiBzLnNsaWNlKDAsIG4pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldE1lc3NhZ2Uoc2VsZikge1xuICByZXR1cm4gdHJ1bmNhdGUoSlNPTi5zdHJpbmdpZnkoc2VsZi5hY3R1YWwsIHJlcGxhY2VyKSwgMTI4KSArICcgJyArXG4gICAgICAgICBzZWxmLm9wZXJhdG9yICsgJyAnICtcbiAgICAgICAgIHRydW5jYXRlKEpTT04uc3RyaW5naWZ5KHNlbGYuZXhwZWN0ZWQsIHJlcGxhY2VyKSwgMTI4KTtcbn1cblxuLy8gQXQgcHJlc2VudCBvbmx5IHRoZSB0aHJlZSBrZXlzIG1lbnRpb25lZCBhYm92ZSBhcmUgdXNlZCBhbmRcbi8vIHVuZGVyc3Rvb2QgYnkgdGhlIHNwZWMuIEltcGxlbWVudGF0aW9ucyBvciBzdWIgbW9kdWxlcyBjYW4gcGFzc1xuLy8gb3RoZXIga2V5cyB0byB0aGUgQXNzZXJ0aW9uRXJyb3IncyBjb25zdHJ1Y3RvciAtIHRoZXkgd2lsbCBiZVxuLy8gaWdub3JlZC5cblxuLy8gMy4gQWxsIG9mIHRoZSBmb2xsb3dpbmcgZnVuY3Rpb25zIG11c3QgdGhyb3cgYW4gQXNzZXJ0aW9uRXJyb3Jcbi8vIHdoZW4gYSBjb3JyZXNwb25kaW5nIGNvbmRpdGlvbiBpcyBub3QgbWV0LCB3aXRoIGEgbWVzc2FnZSB0aGF0XG4vLyBtYXkgYmUgdW5kZWZpbmVkIGlmIG5vdCBwcm92aWRlZC4gIEFsbCBhc3NlcnRpb24gbWV0aG9kcyBwcm92aWRlXG4vLyBib3RoIHRoZSBhY3R1YWwgYW5kIGV4cGVjdGVkIHZhbHVlcyB0byB0aGUgYXNzZXJ0aW9uIGVycm9yIGZvclxuLy8gZGlzcGxheSBwdXJwb3Nlcy5cblxuZnVuY3Rpb24gZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCBvcGVyYXRvciwgc3RhY2tTdGFydEZ1bmN0aW9uKSB7XG4gIHRocm93IG5ldyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3Ioe1xuICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgYWN0dWFsOiBhY3R1YWwsXG4gICAgZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuICAgIG9wZXJhdG9yOiBvcGVyYXRvcixcbiAgICBzdGFja1N0YXJ0RnVuY3Rpb246IHN0YWNrU3RhcnRGdW5jdGlvblxuICB9KTtcbn1cblxuLy8gRVhURU5TSU9OISBhbGxvd3MgZm9yIHdlbGwgYmVoYXZlZCBlcnJvcnMgZGVmaW5lZCBlbHNld2hlcmUuXG5hc3NlcnQuZmFpbCA9IGZhaWw7XG5cbi8vIDQuIFB1cmUgYXNzZXJ0aW9uIHRlc3RzIHdoZXRoZXIgYSB2YWx1ZSBpcyB0cnV0aHksIGFzIGRldGVybWluZWRcbi8vIGJ5ICEhZ3VhcmQuXG4vLyBhc3NlcnQub2soZ3VhcmQsIG1lc3NhZ2Vfb3B0KTtcbi8vIFRoaXMgc3RhdGVtZW50IGlzIGVxdWl2YWxlbnQgdG8gYXNzZXJ0LmVxdWFsKHRydWUsICEhZ3VhcmQsXG4vLyBtZXNzYWdlX29wdCk7LiBUbyB0ZXN0IHN0cmljdGx5IGZvciB0aGUgdmFsdWUgdHJ1ZSwgdXNlXG4vLyBhc3NlcnQuc3RyaWN0RXF1YWwodHJ1ZSwgZ3VhcmQsIG1lc3NhZ2Vfb3B0KTsuXG5cbmZ1bmN0aW9uIG9rKHZhbHVlLCBtZXNzYWdlKSB7XG4gIGlmICghdmFsdWUpIGZhaWwodmFsdWUsIHRydWUsIG1lc3NhZ2UsICc9PScsIGFzc2VydC5vayk7XG59XG5hc3NlcnQub2sgPSBvaztcblxuLy8gNS4gVGhlIGVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBzaGFsbG93LCBjb2VyY2l2ZSBlcXVhbGl0eSB3aXRoXG4vLyA9PS5cbi8vIGFzc2VydC5lcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5lcXVhbCA9IGZ1bmN0aW9uIGVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCAhPSBleHBlY3RlZCkgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnPT0nLCBhc3NlcnQuZXF1YWwpO1xufTtcblxuLy8gNi4gVGhlIG5vbi1lcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgZm9yIHdoZXRoZXIgdHdvIG9iamVjdHMgYXJlIG5vdCBlcXVhbFxuLy8gd2l0aCAhPSBhc3NlcnQubm90RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQubm90RXF1YWwgPSBmdW5jdGlvbiBub3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgPT0gZXhwZWN0ZWQpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICchPScsIGFzc2VydC5ub3RFcXVhbCk7XG4gIH1cbn07XG5cbi8vIDcuIFRoZSBlcXVpdmFsZW5jZSBhc3NlcnRpb24gdGVzdHMgYSBkZWVwIGVxdWFsaXR5IHJlbGF0aW9uLlxuLy8gYXNzZXJ0LmRlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5kZWVwRXF1YWwgPSBmdW5jdGlvbiBkZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoIV9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCkpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICdkZWVwRXF1YWwnLCBhc3NlcnQuZGVlcEVxdWFsKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkKSB7XG4gIC8vIDcuMS4gQWxsIGlkZW50aWNhbCB2YWx1ZXMgYXJlIGVxdWl2YWxlbnQsIGFzIGRldGVybWluZWQgYnkgPT09LlxuICBpZiAoYWN0dWFsID09PSBleHBlY3RlZCkge1xuICAgIHJldHVybiB0cnVlO1xuXG4gIH0gZWxzZSBpZiAodXRpbC5pc0J1ZmZlcihhY3R1YWwpICYmIHV0aWwuaXNCdWZmZXIoZXhwZWN0ZWQpKSB7XG4gICAgaWYgKGFjdHVhbC5sZW5ndGggIT0gZXhwZWN0ZWQubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFjdHVhbC5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFjdHVhbFtpXSAhPT0gZXhwZWN0ZWRbaV0pIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcblxuICAvLyA3LjIuIElmIHRoZSBleHBlY3RlZCB2YWx1ZSBpcyBhIERhdGUgb2JqZWN0LCB0aGUgYWN0dWFsIHZhbHVlIGlzXG4gIC8vIGVxdWl2YWxlbnQgaWYgaXQgaXMgYWxzbyBhIERhdGUgb2JqZWN0IHRoYXQgcmVmZXJzIHRvIHRoZSBzYW1lIHRpbWUuXG4gIH0gZWxzZSBpZiAodXRpbC5pc0RhdGUoYWN0dWFsKSAmJiB1dGlsLmlzRGF0ZShleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gYWN0dWFsLmdldFRpbWUoKSA9PT0gZXhwZWN0ZWQuZ2V0VGltZSgpO1xuXG4gIC8vIDcuMyBJZiB0aGUgZXhwZWN0ZWQgdmFsdWUgaXMgYSBSZWdFeHAgb2JqZWN0LCB0aGUgYWN0dWFsIHZhbHVlIGlzXG4gIC8vIGVxdWl2YWxlbnQgaWYgaXQgaXMgYWxzbyBhIFJlZ0V4cCBvYmplY3Qgd2l0aCB0aGUgc2FtZSBzb3VyY2UgYW5kXG4gIC8vIHByb3BlcnRpZXMgKGBnbG9iYWxgLCBgbXVsdGlsaW5lYCwgYGxhc3RJbmRleGAsIGBpZ25vcmVDYXNlYCkuXG4gIH0gZWxzZSBpZiAodXRpbC5pc1JlZ0V4cChhY3R1YWwpICYmIHV0aWwuaXNSZWdFeHAoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGFjdHVhbC5zb3VyY2UgPT09IGV4cGVjdGVkLnNvdXJjZSAmJlxuICAgICAgICAgICBhY3R1YWwuZ2xvYmFsID09PSBleHBlY3RlZC5nbG9iYWwgJiZcbiAgICAgICAgICAgYWN0dWFsLm11bHRpbGluZSA9PT0gZXhwZWN0ZWQubXVsdGlsaW5lICYmXG4gICAgICAgICAgIGFjdHVhbC5sYXN0SW5kZXggPT09IGV4cGVjdGVkLmxhc3RJbmRleCAmJlxuICAgICAgICAgICBhY3R1YWwuaWdub3JlQ2FzZSA9PT0gZXhwZWN0ZWQuaWdub3JlQ2FzZTtcblxuICAvLyA3LjQuIE90aGVyIHBhaXJzIHRoYXQgZG8gbm90IGJvdGggcGFzcyB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCcsXG4gIC8vIGVxdWl2YWxlbmNlIGlzIGRldGVybWluZWQgYnkgPT0uXG4gIH0gZWxzZSBpZiAoIXV0aWwuaXNPYmplY3QoYWN0dWFsKSAmJiAhdXRpbC5pc09iamVjdChleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gYWN0dWFsID09IGV4cGVjdGVkO1xuXG4gIC8vIDcuNSBGb3IgYWxsIG90aGVyIE9iamVjdCBwYWlycywgaW5jbHVkaW5nIEFycmF5IG9iamVjdHMsIGVxdWl2YWxlbmNlIGlzXG4gIC8vIGRldGVybWluZWQgYnkgaGF2aW5nIHRoZSBzYW1lIG51bWJlciBvZiBvd25lZCBwcm9wZXJ0aWVzIChhcyB2ZXJpZmllZFxuICAvLyB3aXRoIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCksIHRoZSBzYW1lIHNldCBvZiBrZXlzXG4gIC8vIChhbHRob3VnaCBub3QgbmVjZXNzYXJpbHkgdGhlIHNhbWUgb3JkZXIpLCBlcXVpdmFsZW50IHZhbHVlcyBmb3IgZXZlcnlcbiAgLy8gY29ycmVzcG9uZGluZyBrZXksIGFuZCBhbiBpZGVudGljYWwgJ3Byb3RvdHlwZScgcHJvcGVydHkuIE5vdGU6IHRoaXNcbiAgLy8gYWNjb3VudHMgZm9yIGJvdGggbmFtZWQgYW5kIGluZGV4ZWQgcHJvcGVydGllcyBvbiBBcnJheXMuXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG9iakVxdWl2KGFjdHVhbCwgZXhwZWN0ZWQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzQXJndW1lbnRzKG9iamVjdCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iamVjdCkgPT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG59XG5cbmZ1bmN0aW9uIG9iakVxdWl2KGEsIGIpIHtcbiAgaWYgKHV0aWwuaXNOdWxsT3JVbmRlZmluZWQoYSkgfHwgdXRpbC5pc051bGxPclVuZGVmaW5lZChiKSlcbiAgICByZXR1cm4gZmFsc2U7XG4gIC8vIGFuIGlkZW50aWNhbCAncHJvdG90eXBlJyBwcm9wZXJ0eS5cbiAgaWYgKGEucHJvdG90eXBlICE9PSBiLnByb3RvdHlwZSkgcmV0dXJuIGZhbHNlO1xuICAvL35+fkkndmUgbWFuYWdlZCB0byBicmVhayBPYmplY3Qua2V5cyB0aHJvdWdoIHNjcmV3eSBhcmd1bWVudHMgcGFzc2luZy5cbiAgLy8gICBDb252ZXJ0aW5nIHRvIGFycmF5IHNvbHZlcyB0aGUgcHJvYmxlbS5cbiAgaWYgKGlzQXJndW1lbnRzKGEpKSB7XG4gICAgaWYgKCFpc0FyZ3VtZW50cyhiKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBhID0gcFNsaWNlLmNhbGwoYSk7XG4gICAgYiA9IHBTbGljZS5jYWxsKGIpO1xuICAgIHJldHVybiBfZGVlcEVxdWFsKGEsIGIpO1xuICB9XG4gIHRyeSB7XG4gICAgdmFyIGthID0gc2hpbXMua2V5cyhhKSxcbiAgICAgICAga2IgPSBzaGltcy5rZXlzKGIpLFxuICAgICAgICBrZXksIGk7XG4gIH0gY2F0Y2ggKGUpIHsvL2hhcHBlbnMgd2hlbiBvbmUgaXMgYSBzdHJpbmcgbGl0ZXJhbCBhbmQgdGhlIG90aGVyIGlzbid0XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vIGhhdmluZyB0aGUgc2FtZSBudW1iZXIgb2Ygb3duZWQgcHJvcGVydGllcyAoa2V5cyBpbmNvcnBvcmF0ZXNcbiAgLy8gaGFzT3duUHJvcGVydHkpXG4gIGlmIChrYS5sZW5ndGggIT0ga2IubGVuZ3RoKVxuICAgIHJldHVybiBmYWxzZTtcbiAgLy90aGUgc2FtZSBzZXQgb2Yga2V5cyAoYWx0aG91Z2ggbm90IG5lY2Vzc2FyaWx5IHRoZSBzYW1lIG9yZGVyKSxcbiAga2Euc29ydCgpO1xuICBrYi5zb3J0KCk7XG4gIC8vfn5+Y2hlYXAga2V5IHRlc3RcbiAgZm9yIChpID0ga2EubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBpZiAoa2FbaV0gIT0ga2JbaV0pXG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLy9lcXVpdmFsZW50IHZhbHVlcyBmb3IgZXZlcnkgY29ycmVzcG9uZGluZyBrZXksIGFuZFxuICAvL35+fnBvc3NpYmx5IGV4cGVuc2l2ZSBkZWVwIHRlc3RcbiAgZm9yIChpID0ga2EubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBrZXkgPSBrYVtpXTtcbiAgICBpZiAoIV9kZWVwRXF1YWwoYVtrZXldLCBiW2tleV0pKSByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8vIDguIFRoZSBub24tZXF1aXZhbGVuY2UgYXNzZXJ0aW9uIHRlc3RzIGZvciBhbnkgZGVlcCBpbmVxdWFsaXR5LlxuLy8gYXNzZXJ0Lm5vdERlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5ub3REZWVwRXF1YWwgPSBmdW5jdGlvbiBub3REZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkKSkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJ25vdERlZXBFcXVhbCcsIGFzc2VydC5ub3REZWVwRXF1YWwpO1xuICB9XG59O1xuXG4vLyA5LiBUaGUgc3RyaWN0IGVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBzdHJpY3QgZXF1YWxpdHksIGFzIGRldGVybWluZWQgYnkgPT09LlxuLy8gYXNzZXJ0LnN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LnN0cmljdEVxdWFsID0gZnVuY3Rpb24gc3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsICE9PSBleHBlY3RlZCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJz09PScsIGFzc2VydC5zdHJpY3RFcXVhbCk7XG4gIH1cbn07XG5cbi8vIDEwLiBUaGUgc3RyaWN0IG5vbi1lcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgZm9yIHN0cmljdCBpbmVxdWFsaXR5LCBhc1xuLy8gZGV0ZXJtaW5lZCBieSAhPT0uICBhc3NlcnQubm90U3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQubm90U3RyaWN0RXF1YWwgPSBmdW5jdGlvbiBub3RTdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgPT09IGV4cGVjdGVkKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnIT09JywgYXNzZXJ0Lm5vdFN0cmljdEVxdWFsKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLCBleHBlY3RlZCkge1xuICBpZiAoIWFjdHVhbCB8fCAhZXhwZWN0ZWQpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGV4cGVjdGVkKSA9PSAnW29iamVjdCBSZWdFeHBdJykge1xuICAgIHJldHVybiBleHBlY3RlZC50ZXN0KGFjdHVhbCk7XG4gIH0gZWxzZSBpZiAoYWN0dWFsIGluc3RhbmNlb2YgZXhwZWN0ZWQpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChleHBlY3RlZC5jYWxsKHt9LCBhY3R1YWwpID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIF90aHJvd3Moc2hvdWxkVGhyb3csIGJsb2NrLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICB2YXIgYWN0dWFsO1xuXG4gIGlmICh1dGlsLmlzU3RyaW5nKGV4cGVjdGVkKSkge1xuICAgIG1lc3NhZ2UgPSBleHBlY3RlZDtcbiAgICBleHBlY3RlZCA9IG51bGw7XG4gIH1cblxuICB0cnkge1xuICAgIGJsb2NrKCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBhY3R1YWwgPSBlO1xuICB9XG5cbiAgbWVzc2FnZSA9IChleHBlY3RlZCAmJiBleHBlY3RlZC5uYW1lID8gJyAoJyArIGV4cGVjdGVkLm5hbWUgKyAnKS4nIDogJy4nKSArXG4gICAgICAgICAgICAobWVzc2FnZSA/ICcgJyArIG1lc3NhZ2UgOiAnLicpO1xuXG4gIGlmIChzaG91bGRUaHJvdyAmJiAhYWN0dWFsKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCAnTWlzc2luZyBleHBlY3RlZCBleGNlcHRpb24nICsgbWVzc2FnZSk7XG4gIH1cblxuICBpZiAoIXNob3VsZFRocm93ICYmIGV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCwgZXhwZWN0ZWQpKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCAnR290IHVud2FudGVkIGV4Y2VwdGlvbicgKyBtZXNzYWdlKTtcbiAgfVxuXG4gIGlmICgoc2hvdWxkVGhyb3cgJiYgYWN0dWFsICYmIGV4cGVjdGVkICYmXG4gICAgICAhZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLCBleHBlY3RlZCkpIHx8ICghc2hvdWxkVGhyb3cgJiYgYWN0dWFsKSkge1xuICAgIHRocm93IGFjdHVhbDtcbiAgfVxufVxuXG4vLyAxMS4gRXhwZWN0ZWQgdG8gdGhyb3cgYW4gZXJyb3I6XG4vLyBhc3NlcnQudGhyb3dzKGJsb2NrLCBFcnJvcl9vcHQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LnRocm93cyA9IGZ1bmN0aW9uKGJsb2NrLCAvKm9wdGlvbmFsKi9lcnJvciwgLypvcHRpb25hbCovbWVzc2FnZSkge1xuICBfdGhyb3dzLmFwcGx5KHRoaXMsIFt0cnVlXS5jb25jYXQocFNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xufTtcblxuLy8gRVhURU5TSU9OISBUaGlzIGlzIGFubm95aW5nIHRvIHdyaXRlIG91dHNpZGUgdGhpcyBtb2R1bGUuXG5hc3NlcnQuZG9lc05vdFRocm93ID0gZnVuY3Rpb24oYmxvY2ssIC8qb3B0aW9uYWwqL21lc3NhZ2UpIHtcbiAgX3Rocm93cy5hcHBseSh0aGlzLCBbZmFsc2VdLmNvbmNhdChwU2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG59O1xuXG5hc3NlcnQuaWZFcnJvciA9IGZ1bmN0aW9uKGVycikgeyBpZiAoZXJyKSB7dGhyb3cgZXJyO319O1xufSx7XCJfc2hpbXNcIjo1LFwidXRpbFwiOjd9XSw3OltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcbi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgc2hpbXMgPSByZXF1aXJlKCdfc2hpbXMnKTtcblxudmFyIGZvcm1hdFJlZ0V4cCA9IC8lW3NkaiVdL2c7XG5leHBvcnRzLmZvcm1hdCA9IGZ1bmN0aW9uKGYpIHtcbiAgaWYgKCFpc1N0cmluZyhmKSkge1xuICAgIHZhciBvYmplY3RzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG9iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gIH1cblxuICB2YXIgaSA9IDE7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCA9PT0gJyUlJykgcmV0dXJuICclJztcbiAgICBpZiAoaSA+PSBsZW4pIHJldHVybiB4O1xuICAgIHN3aXRjaCAoeCkge1xuICAgICAgY2FzZSAnJXMnOiByZXR1cm4gU3RyaW5nKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVqJzpcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnc1tpKytdKTtcbiAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfSk7XG4gIGZvciAodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKSB7XG4gICAgaWYgKGlzTnVsbCh4KSB8fCAhaXNPYmplY3QoeCkpIHtcbiAgICAgIHN0ciArPSAnICcgKyB4O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAnICsgaW5zcGVjdCh4KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cbi8qKlxuICogRWNob3MgdGhlIHZhbHVlIG9mIGEgdmFsdWUuIFRyeXMgdG8gcHJpbnQgdGhlIHZhbHVlIG91dFxuICogaW4gdGhlIGJlc3Qgd2F5IHBvc3NpYmxlIGdpdmVuIHRoZSBkaWZmZXJlbnQgdHlwZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHByaW50IG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHRoYXQgYWx0ZXJzIHRoZSBvdXRwdXQuXG4gKi9cbi8qIGxlZ2FjeTogb2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKi9cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBvcHRzKSB7XG4gIC8vIGRlZmF1bHQgb3B0aW9uc1xuICB2YXIgY3R4ID0ge1xuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IHN0eWxpemVOb0NvbG9yXG4gIH07XG4gIC8vIGxlZ2FjeS4uLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSBjdHguZGVwdGggPSBhcmd1bWVudHNbMl07XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDQpIGN0eC5jb2xvcnMgPSBhcmd1bWVudHNbM107XG4gIGlmIChpc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAvLyBsZWdhY3kuLi5cbiAgICBjdHguc2hvd0hpZGRlbiA9IG9wdHM7XG4gIH0gZWxzZSBpZiAob3B0cykge1xuICAgIC8vIGdvdCBhbiBcIm9wdGlvbnNcIiBvYmplY3RcbiAgICBleHBvcnRzLl9leHRlbmQoY3R4LCBvcHRzKTtcbiAgfVxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmIChpc1VuZGVmaW5lZChjdHguc2hvd0hpZGRlbikpIGN0eC5zaG93SGlkZGVuID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguZGVwdGgpKSBjdHguZGVwdGggPSAyO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpIGN0eC5jb2xvcnMgPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jdXN0b21JbnNwZWN0KSkgY3R4LmN1c3RvbUluc3BlY3QgPSB0cnVlO1xuICBpZiAoY3R4LmNvbG9ycykgY3R4LnN0eWxpemUgPSBzdHlsaXplV2l0aENvbG9yO1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosIGN0eC5kZXB0aCk7XG59XG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXG5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuaW5zcGVjdC5jb2xvcnMgPSB7XG4gICdib2xkJyA6IFsxLCAyMl0sXG4gICdpdGFsaWMnIDogWzMsIDIzXSxcbiAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAnd2hpdGUnIDogWzM3LCAzOV0sXG4gICdncmV5JyA6IFs5MCwgMzldLFxuICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICdibHVlJyA6IFszNCwgMzldLFxuICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAnbWFnZW50YScgOiBbMzUsIDM5XSxcbiAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgJ3llbGxvdycgOiBbMzMsIDM5XVxufTtcblxuLy8gRG9uJ3QgdXNlICdibHVlJyBub3QgdmlzaWJsZSBvbiBjbWQuZXhlXG5pbnNwZWN0LnN0eWxlcyA9IHtcbiAgJ3NwZWNpYWwnOiAnY3lhbicsXG4gICdudW1iZXInOiAneWVsbG93JyxcbiAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgJ251bGwnOiAnYm9sZCcsXG4gICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgLy8gXCJuYW1lXCI6IGludGVudGlvbmFsbHkgbm90IHN0eWxpbmdcbiAgJ3JlZ2V4cCc6ICdyZWQnXG59O1xuXG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRoQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgdmFyIHN0eWxlID0gaW5zcGVjdC5zdHlsZXNbc3R5bGVUeXBlXTtcblxuICBpZiAoc3R5bGUpIHtcbiAgICByZXR1cm4gJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMV0gKyAnbSc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblxuZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpIHtcbiAgdmFyIGhhc2ggPSB7fTtcblxuICBzaGltcy5mb3JFYWNoKGFycmF5LCBmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzKTtcbiAgICBpZiAoIWlzU3RyaW5nKHJldCkpIHtcbiAgICAgIHJldCA9IGZvcm1hdFZhbHVlKGN0eCwgcmV0LCByZWN1cnNlVGltZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgdmFyIHByaW1pdGl2ZSA9IGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKTtcbiAgaWYgKHByaW1pdGl2ZSkge1xuICAgIHJldHVybiBwcmltaXRpdmU7XG4gIH1cblxuICAvLyBMb29rIHVwIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QuXG4gIHZhciBrZXlzID0gc2hpbXMua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBzaGltcy5nZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuXG4gIHNoaW1zLmZvckVhY2goa2V5cywgZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gc2hpbXMuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpIHx8IHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbiAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGlmICghaGFzT3duUHJvcGVydHkodmlzaWJsZUtleXMsIGtleSkpIHtcbiAgICBuYW1lID0gJ1snICsga2V5ICsgJ10nO1xuICB9XG4gIGlmICghc3RyKSB7XG4gICAgaWYgKHNoaW1zLmluZGV4T2YoY3R4LnNlZW4sIGRlc2MudmFsdWUpIDwgMCkge1xuICAgICAgaWYgKGlzTnVsbChyZWN1cnNlVGltZXMpKSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgfVxuICAgICAgaWYgKHN0ci5pbmRleE9mKCdcXG4nKSA+IC0xKSB7XG4gICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zdWJzdHIoMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyID0gJ1xcbicgKyBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbQ2lyY3VsYXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgaWYgKGFycmF5ICYmIGtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIG5hbWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIGtleSk7XG4gICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBzaGltcy5yZWR1Y2Uob3V0cHV0LCBmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gc2hpbXMuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmc7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiYgb2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXSc7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5mdW5jdGlvbiBpc0J1ZmZlcihhcmcpIHtcbiAgcmV0dXJuIGFyZyBpbnN0YW5jZW9mIEJ1ZmZlcjtcbn1cbmV4cG9ydHMuaXNCdWZmZXIgPSBpc0J1ZmZlcjtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5cbmZ1bmN0aW9uIHBhZChuKSB7XG4gIHJldHVybiBuIDwgMTAgPyAnMCcgKyBuLnRvU3RyaW5nKDEwKSA6IG4udG9TdHJpbmcoMTApO1xufVxuXG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cblxuLy8gbG9nIGlzIGp1c3QgYSB0aGluIHdyYXBwZXIgdG8gY29uc29sZS5sb2cgdGhhdCBwcmVwZW5kcyBhIHRpbWVzdGFtcFxuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJyVzIC0gJXMnLCB0aW1lc3RhbXAoKSwgZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKSk7XG59O1xuXG5cbi8qKlxuICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICpcbiAqIFRoZSBGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgZnJvbSBsYW5nLmpzIHJld3JpdHRlbiBhcyBhIHN0YW5kYWxvbmVcbiAqIGZ1bmN0aW9uIChub3Qgb24gRnVuY3Rpb24ucHJvdG90eXBlKS4gTk9URTogSWYgdGhpcyBmaWxlIGlzIHRvIGJlIGxvYWRlZFxuICogZHVyaW5nIGJvb3RzdHJhcHBpbmcgdGhpcyBmdW5jdGlvbiBuZWVkcyB0byBiZSByZXdyaXR0ZW4gdXNpbmcgc29tZSBuYXRpdmVcbiAqIGZ1bmN0aW9ucyBhcyBwcm90b3R5cGUgc2V0dXAgdXNpbmcgbm9ybWFsIEphdmFTY3JpcHQgZG9lcyBub3Qgd29yayBhc1xuICogZXhwZWN0ZWQgZHVyaW5nIGJvb3RzdHJhcHBpbmcgKHNlZSBtaXJyb3IuanMgaW4gcjExNDkwMykuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZVxuICogICAgIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1cGVyQ3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBpbmhlcml0IHByb3RvdHlwZSBmcm9tLlxuICovXG5leHBvcnRzLmluaGVyaXRzID0gZnVuY3Rpb24oY3Rvciwgc3VwZXJDdG9yKSB7XG4gIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yO1xuICBjdG9yLnByb3RvdHlwZSA9IHNoaW1zLmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgY29uc3RydWN0b3I6IHtcbiAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH1cbiAgfSk7XG59O1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gc2hpbXMua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59O1xuXG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuXG59LHtcIl9zaGltc1wiOjV9XX0se30sW10pXG47O21vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJidWZmZXItYnJvd3NlcmlmeVwiKVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIGlmIChldi5zb3VyY2UgPT09IHdpbmRvdyAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZXZlID0gcmVxdWlyZSgnZXZlJyk7XG52YXIgcmVQcmVmaXhlZCA9IC9eZ2x1ZVxcLi87XG5cbi8qKlxuICAjIyBFdmVudHNcblxuICBHbHVlIHVzZXMgW2V2ZV0oaHR0cHM6Ly9naXRodWIuY29tL2Fkb2JlLXdlYnBsYXRmb3JtL2V2ZSkgdW5kZXIgdGhlIGhvb2QsXG4gIGFuZCBleHBvc2VzIGEgc2ltcGxlIGludGVyZmFjZSB0byBldmUgZXZlbnRzIHRocm91Z2ggdGhlIGBnbHVlLmV2ZW50c2BcbiAgaW50ZXJmYWNlLlxuXG4gIElmIHVzaW5nIGV2ZSBkaXJlY3RseSB0aGVzZSBldmVudHMgYXJlIG5hbWVzcGFjZWQgd2l0aCB0aGUgcHJlZml4IG9mXG4gIGBnbHVlLmAgdG8gYXZvaWQgZXZlbnQgbmFtZSBjbGFzaGVzIG9uIHRoZSBidXMsIGJ1dCB5b3UgY2FuIHVzZSB0aGVcbiAgYGdsdWUuZXZlbnRzYCBlbmRwb2ludCB0byBhdHRhY2ggdG8gZXZlIHdpdGhvdXQgdGhlIG5hbWVzcGFjZSBpZiB5b3UgcHJlZmVyLlxuXG4gIEZvciBleGFtcGxlOlxuXG4gIDw8PCBleGFtcGxlcy9ldmVudC1uYW1lc3BhY2luZy5qc1xuXG4qKi9cblsnb24nLCAnb25jZScsICdvZmYnXS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZCkge1xuICBleHBvcnRzW21ldGhvZF0gPSBmdW5jdGlvbihuYW1lLCBoYW5kbGVyKSB7XG4gICAgaWYgKCEgcmVQcmVmaXhlZC50ZXN0KG5hbWUpKSB7XG4gICAgICBuYW1lID0gJ2dsdWUuJyArIG5hbWU7XG4gICAgfVxuXG4gICAgLy8gcmVnaXN0ZXIgdGhlIGhhbmRsZXJcbiAgICBldmVbbWV0aG9kXShuYW1lLCBoYW5kbGVyKTtcbiAgfTtcbn0pOyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgd2luZG93OiBmYWxzZSAqL1xuLyogZ2xvYmFsIGRvY3VtZW50OiBmYWxzZSAqL1xuLyogZ2xvYmFsIGxvY2F0aW9uOiBmYWxzZSAqL1xuLyogZ2xvYmFsIEN1c3RvbUV2ZW50OiBmYWxzZSAqL1xuLyogZ2xvYmFsIGlvOiBmYWxzZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgYXN5bmMgPSByZXF1aXJlKCdhc3luYycpO1xudmFyIHVybCA9IHJlcXVpcmUoJ3VybCcpO1xudmFyIGV2ZSA9IHJlcXVpcmUoJ2V2ZScpO1xudmFyIHFzYSA9IHJlcXVpcmUoJ2Zkb20vcXNhJyk7XG52YXIgb24gPSByZXF1aXJlKCdmZG9tL29uJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnY29nL2RlZmF1bHRzJyk7XG52YXIgbG9nZ2VyID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpKCdnbHVlJyk7XG52YXIgc2lnbmFsbGVyID0gcmVxdWlyZSgncnRjLXNpZ25hbGxlcicpO1xudmFyIG1lZGlhID0gcmVxdWlyZSgncnRjLW1lZGlhJyk7XG52YXIgY2FwdHVyZUNvbmZpZyA9IHJlcXVpcmUoJ3J0Yy1jYXB0dXJlY29uZmlnJyk7XG52YXIgdHJhbnNmb3JtID0gcmVxdWlyZSgnc2RwLXRyYW5zZm9ybScpO1xudmFyIHJlc2V0RWwgPSByZXF1aXJlKCdydGMtY29yZS9yZXNldCcpO1xuLy8gdmFyIGxpbmVyID0gcmVxdWlyZSgnc2RwLWxpbmVzJyk7XG5cbnZhciByZVNlcCA9IC9bXFxzXFwsXVxccyovO1xudmFyIHJlVHJhaWxpbmdTbGFzaCA9IC9cXC8kLztcbnZhciBjYW5HZXRTb3VyY2VzID0gdHlwZW9mIE1lZGlhU3RyZWFtVHJhY2sgIT0gJ3VuZGVmaW5lZCcgJiZcbiAgTWVkaWFTdHJlYW1UcmFjay5nZXRTb3VyY2VzO1xuXG4vLyBpbml0aWFsaXNlIG91ciBjb25maWcgKHVzaW5nIHJ0Yy0gbmFtZWQgbWV0YWRhdGEgdGFncylcbnZhciBjb25maWcgPSBkZWZhdWx0cyh7fSwgcmVxdWlyZSgnZmRvbS9tZXRhJykoL15ydGMtKC4qKSQvKSwge1xuICByb29tOiBsb2NhdGlvbi5oYXNoLnNsaWNlKDEpLFxuICBzaWduYWxob3N0OiBsb2NhdGlvbi5vcmlnaW4gfHwgJ2h0dHA6Ly9ydGNqcy5pbzo1MDAwMCdcbn0pO1xuXG52YXIgU2Vzc2lvbk1hbmFnZXIgPSByZXF1aXJlKCcuL3Nlc3Npb25tYW5hZ2VyJyk7XG52YXIgc2Vzc2lvbk1ncjtcbnZhciBzb3VyY2VzO1xuXG4vKipcbiAgIyBydGMtZ2x1ZVxuXG4gIEdsdWUgaXMgYSBoaWdoLWxldmVsIGFwcHJvYWNoIHRvIGJ1aWxkaW5nIFdlYlJUQyBhcHBsaWNhdGlvbnMuIEl0IGlzXG4gIHByaW1hcmlseSBkZXNpZ25lZCBmb3Igd2ViIGFwcGxpY2F0aW9uIGNvZGVycyB3aG8gd291bGQgcHJlZmVyIHRvIHNwZW5kXG4gIHRoZWlyIHRpbWUgaW4gSFRNTCBhbmQgQ1NTIHJhdGhlciB0aGFuIEpTLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICBHbHVlIHdvcmtzIGJ5IGxvb2tpbmcgZm9yIEhUTUwgdGFncyB0aGF0IGZvbGxvdyBwYXJ0aWN1bGFyIGNvbnZlbnRpb25zXG4gIHdpdGggcmVnYXJkcyB0byBuYW1lZCBhdHRyaWJ1dGVkLCBldGMuICBGb3IgaW5zdGFuY2UsIGNvbnNpZGVyIHRoZVxuICBmb2xsb3dpbmcgSFRNTDpcblxuICA8PDwgZXhhbXBsZXMvY2FwdHVyZS1vbmx5Lmh0bWxcblxuICBJdCBpcyB0aGVuIHBvc3NpYmxlIHRvIHR3ZWFrIHRoZSBgZ2V0VXNlck1lZGlhYCBjb25zdHJhaW50cyB1c2luZyBzb21lXG4gIGZsYWdzIGluIHRoZSBgcnRjLWNhcHR1cmVgIGF0dHJpYnV0ZTpcblxuICA8PDwgZXhhbXBsZXMvY2FwdHVyZS10d2Vha3Jlcy5odG1sXG5cbiAgRm9yIHRob3NlIHdobyBwcmVmZXIgdXNpbmcgc2VwYXJhdGUgYXR0cmlidXRlcywgeW91IGNhbiBhY2hpZXZlIHNpbWlsYXJcbiAgYmVoYXZpb3VyIHVzaW5nIHRoZSBgcnRjLXJlc29sdXRpb25gIChvciBgcnRjLXJlc2ApIGF0dHJpYnV0ZTpcblxuICA8PDwgZXhhbXBsZXMvcmVzLWF0dHJpYnV0ZS5odG1sXG5cbiAgIyMgQ29uZmVyZW5jaW5nIEV4YW1wbGVcblxuICBUaGUgZm9sbG93aW5nIGlzIGEgc2ltcGxlIGV4YW1wbGUgb2YgY29uZmVyZW5jaW5nIHVzaW5nIHNvbWUgaG9zdGVkIHJ0Yy5pb1xuICBzaWduYWxsaW5nOlxuXG4gIDw8PCBleGFtcGxlcy9jb25mZXJlbmNlLXNpbXBsZS5odG1sXG5cbiAgIyMgR2V0dGluZyBHbHVlXG5cbiAgUHJpbWFyaWx5IGdsdWUgaXMgZGVzaWduZWQgZm9yIHVzZSBpbiBhIHN0YW5kYWxvbmUgc2l0dWF0aW9uLCBhbmQgdGh1c1xuICBjb21lcyBwcmUtcGFja2FnZWQgaW4gYSBVTURqc1xuICBbZGlzdHJpYnV0aW9uXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy1nbHVlL3RyZWUvbWFzdGVyL2Rpc3QpLiBJZlxuICB5b3UgcHJlZmVyIHdvcmtpbmcgd2l0aCBicm93c2VyaWZ5LCB0aGVuIGl0IHdpbGwgc3RpbGwgd29yayBxdWl0ZSBuaWNlbHlcbiAgYW5kIHlvdSBzaG91bGQganVzdCBgbnBtIGluc3RhbGwgcnRjLWdsdWVgIGxpa2UgeW91IHdvdWxkIHdpdGggb3RoZXJcbiAgbW9kdWxlcyBvZiB0aGUgcnRjLmlvIHN1aXRlLlxuXG4gICMjIFJ1bm5pbmcgdGhlIEV4YW1wbGVzXG5cbiAgVGhpcyBtb2R1bGUgb2YgdGhlIFtydGMuaW9dKGh0dHBzOi8vcnRjLmlvLykgc3VpdGUgaXMgYSBsaXR0bGUgZGlmZmVyZW50XG4gIHRvIG90aGVycyBpbiB0aGF0IGl0IGNvbWVzIHdpdGggYSByZWFkeSB0byBydW4ganMgZmlsZS4gIFNpbXBseSBzdGFydFxuICBhIHdlYnNlcnZlciBpbiB0aGUgcm9vdCBvZiB0aGUgZGlyZWN0b3J5IGFmdGVyIGNsb25pbmcuICBJZiB5b3UgYXJlIGxvb2tpbmdcbiAgZm9yIGEgZ29vZCBvbmUsIEknZCByZWNvbW1lbmQgW3N0XShodHRwczovL2dpdGh1Yi5jb20vaXNhYWNzL3N0KS5cblxuICAjIyBUYXJnZXRlZCBNZWRpYSBDYXB0dXJlXG5cbiAgVGhlIGRyYWZ0XG4gIFtNZWRpYSBDYXB0dXJlIHNwZWNdKGh0dHA6Ly9kZXYudzMub3JnLzIwMTEvd2VicnRjL2VkaXRvci9nZXR1c2VybWVkaWEuaHRtbClcbiAgaW50cm9kdWNlcyB0aGUgYWJpbGl0eSB0byBxdWVyeSBtZWRpYSBkZXZpY2VzIG9uIHRoZSBtYWNoaW5lLiAgVGhpcyBpc1xuICBjdXJyZW50bHkgYXZhaWxhYmxlIHRocm91Z2ggdGhlIGBNZWRpYVN0cmVhbVRyYWNrLmdldFNvdXJjZXNgIGZ1bmN0aW9uLlxuXG4gIElmIGF2YWlsYWJsZSB0aGVuIHlvdSBjYW4gdGFyZ2V0IHRoZSBjYXB0dXJlIG9mIGEgcGFydGljdWxhciBpbnB1dCBkZXZpY2VcbiAgdGhyb3VnaCB0aGUgdXNlIG9mIGEgbnVtYmVyZWQgZGV2aWNlIGNhcHR1cmUgc3BlY2lmaWNhdGlvbi4gIEZvciBleGFtcGxlOlxuXG4gIGBgYGh0bWxcbiAgPHZpZGVvIHJ0Yy1jYXB0dXJlPVwiY2FtZXJhOjFcIj48L3ZpZGVvPlxuICBgYGBcblxuICBXb3VsZCBhdHR0ZW1wdCB0byBjYXB0dXJlIHRoZSAybmQgKDAtaW5kZXhlZCkgY2FtZXJhIGF2YWlsYWJsZSBvbiB0aGVcbiAgbWFjaGluZSAoaWYgaXQgaXMgYWJsZSB0byBxdWVyeSBkZXZpY2VzKS4gIFRoZSBmb2xsb3dpbmcgaXMgYSBsYXJnZXJcbiAgZXhhbXBsZTpcblxuICA8PDwgZXhhbXBsZXMvY2FwdHVyZS1tdWx0aWNhbS5odG1sXG5cbiAgIyMgT24gQ3VzdG9tIEF0dHJpYnV0ZXNcblxuICBXaGlsZSB3ZSBoYXZlbid0IDEwMCUgZGVjaWRlZCB3ZSBhcmUgbGVhbmluZyB0b3dhcmRzIHRoZSB1c2Ugb2YgY3VzdG9tXG4gIGBydGMtKmAgYXR0cmlidXRlcyBmb3IgaW5mbHVlbmNpbmcgdGhlIGJlaGF2aW91ciBvZiB0aGUgYHJ0Yy1nbHVlYCBsaWJyYXJ5LlxuICBXaGlsZSBjdXJyZW50bHkgdGhpcyBpcyBpbiB2aW9sYXRpb24gd2l0aCB0aGUgSFRNTDUgc3BlYywgaXQgaXMgYW4gYXJlYVxuICBvZiBhY3RpdmUgZGlzY3Vzc2lvbiBpbiBXM0MgbGFuZCAoZ2l2ZW4gW0FuZ3VsYXJKU10oaHR0cDovL2FuZ3VsYXJqcy5vcmcvKVxuICBoYXMgYWRvcHRlZCB0aGUgYG5nLSpgIGF0dHJpYnV0ZXMgYW5kIGlzIHByb3ZpbmcgcG9wdWxhcikuXG5cbiAgIyMjIERvY3VtZW50IE1ldGFkYXRhXG5cbiAgSW4gdGhlIGBydGMtZ2x1ZWAgbGlicmFyeSB3ZSB1c2UgZG9jdW1lbnQgbGV2ZWwgYDxtZXRhPmAgdGFncyB0byBwcm92aWRlXG4gIGdsdWUgd2l0aCBjb25maWd1cmF0aW9uIGluZm9ybWF0aW9uLiAgVGhlcmUgYXJlIGEgbnVtYmVyIG9mIGNvbmZpZ3VyYWJsZVxuICBvcHRpb25zLCBlYWNoIHdoaWNoIGlzIHVzZWQgaW4gdGhlIGZvcm0gb2Y6XG5cbiAgYGBgaHRtbFxuICA8bWV0YSBuYW1lPVwicnRjLSVmbGFnbmFtZSVcIiBjb250ZW50PVwiY29uZmlnIGNvbnRlbnRcIiAvPlxuICBgYGBcblxuICAjIyMjIHJ0Yy1yb29tXG5cbiAgQSBjdXN0b20gcm9vbSB0aGF0IG5ldyBjb252ZXJzYXRpb25zIHdpbGwgYmUgY3JlYXRlZCBpbi4gIElmIG5vdCBzcGVjaWZpZWRcbiAgdGhpcyB3aWxsIGRlZmF1bHQgdG8gYSB2YWx1ZSBvZiBgYXV0b2AuXG5cbiAgIyMjIyBydGMtcm9sZVxuXG4gIEluIHNvbWUgY29uZmVyZW5jZSBzY2VuYXJpb3MsIGRpZmZlcmVudCBwYXJ0aWNpcGFudHMgYXJlIGFzc2lnbmVkIGRpZmZlcmVudFxuICByb2xlcyAoZS5nLiBzdHVkZW50L3RlYWNoZXIsIGNvbnN1bHRhbnQvY3VzdG9tZXIsIGV0YykuICBCeSBzcGVjaWZ5aW5nIHRoZVxuICBgcnRjLXJvbGVgIG1ldGFkYXRhIHlvdSB0aGlzIHJvbGUgaW5mb3JtYXRpb24gd2lsbCBiZSBhbm5vdW5jZWQgYXMgcGFydFxuICBvZiB0aGUgYHJ0Yy1xdWlja2Nvbm5lY3RgIGluaXRpYWxpemF0aW9uLlxuXG4gICMjIFJlZmVyZW5jZVxuXG4gICMjIyBFbGVtZW50IEF0dHJpYnV0ZXNcblxuICAjIyMjIHJ0Yy1jYXB0dXJlXG5cbiAgVGhlIHByZXNlbmNlIG9mIHRoZSBgcnRjLWNhcHR1cmVgIGF0dHJpYnV0ZSBpbiBhIGB2aWRlb2Agb3IgYGF1ZGlvYCBlbGVtZW50XG4gIGluZGljYXRlcyB0aGF0IGl0IGlzIGEgZ2V0VXNlck1lZGlhIGNhcHR1cmUgdGFyZ2V0LlxuXG4gICMjIyMgcnRjLXBlZXJcblxuICBUbyBiZSBjb21wbGV0ZWQuXG5cbioqL1xudmFyIGdsdWUgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNjb3BlLCBvcHRzKSB7XG4gIHZhciBzdGFydHVwT3BzID0gW107XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgcmVtb3RlIGVsZW1lbnRzXG4gIHZhciBwZWVycyA9IHFzYSgnKltydGMtcGVlcl0nLCBzY29wZSkubWFwKGluaXRQZWVyKTtcblxuICAvLyBpZiB3ZSBoYXZlIHBlZXJzLCB0aGVuIHdlIGFyZSBnb2luZyB0byBuZWVkIHByaW11c1xuICBpZiAocGVlcnMubGVuZ3RoID4gMCkge1xuICAgIHN0YXJ0dXBPcHMucHVzaChsb2FkUHJpbXVzKTtcbiAgfVxuXG4gIC8vIGFwcGx5IGFueSBleHRlcm5hbCBvcHRzIHRvIHRoZSBjb25maWd1cmF0aW9uXG4gIGV4dGVuZChjb25maWcsIG9wdHMpO1xuXG4gIC8vIHJ1biB0aGUgc3RhcnR1cCBvcGVyYXRpb25zXG4gIGFzeW5jLnBhcmFsbGVsKHN0YXJ0dXBPcHMsIGZ1bmN0aW9uKGVycikge1xuICAgIC8vIFRPRE86IGNoZWNrIGVycm9yc1xuICAgIGxvZ2dlcignc3RhcnR1cCBvcHMgY29tcGxldGVkLCBzdGFydGluZyBnbHVlJywgY29uZmlnKTtcbiAgICBldmUoJ2dsdWUucmVhZHknKTtcblxuICAgIC8vIGlmIHdlIGRvbid0IGhhdmUgYSByb29tIG5hbWUsIGdlbmVyYXRlIGEgcm9vbSBuYW1lXG4gICAgaWYgKCEgY29uZmlnLnJvb20pIHtcbiAgICAgIGNvbmZpZy5yb29tID0gZ2VuZXJhdGVSb29tTmFtZSgpO1xuICAgIH1cblxuICAgIC8vIGNyZWF0ZSB0aGUgc2Vzc2lvbiBtYW5hZ2VyXG4gICAgc2Vzc2lvbk1nciA9IHR5cGVvZiBQcmltdXMgIT0gJ3VuZGVmaW5lZCcgJiYgbmV3IFNlc3Npb25NYW5hZ2VyKGNvbmZpZyk7XG5cbiAgICAvLyBpbml0aWFsaXNlIHRoZSBjYXB0dXJlIGVsZW1lbnRzXG4gICAgcXNhKCcqW3J0Yy1jYXB0dXJlXScsIHNjb3BlKS5mb3JFYWNoKGluaXRDYXB0dXJlKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYW55IHBlZXJzLCB0aGVuIGFubm91bmNlIG91cnNlbHZlcyB2aWEgdGhlIHNlc3Npb24gbWFuYWdlclxuICAgIGlmIChwZWVycy5sZW5ndGggPiAwKSB7XG4gICAgICBzZXNzaW9uTWdyLmFubm91bmNlKCk7XG4gICAgfVxuICB9KTtcbn07XG5cbi8vIHdpcmUgaW4gdGhlIGV2ZW50cyBoZWxwZXJcbmdsdWUuZXZlbnRzID0gcmVxdWlyZSgnLi9ldmVudHMnKTtcblxuLy8gZXhwb3NlIHRoZSBjb25maWcgdGhyb3VnaCBnbHVlXG5nbHVlLmNvbmZpZyA9IGNvbmZpZztcblxuLy8gYXV0b2xvYWQgZ2x1ZVxuaWYgKHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgb24oJ2xvYWQnLCB3aW5kb3csIGZ1bmN0aW9uKCkge1xuICAgIC8vIGNoZWNrIGlmIHdlIGNhbiBhdXRvbG9hZFxuICAgIGlmIChjb25maWcuYXV0b2xvYWQgPT09IHVuZGVmaW5lZCB8fCBjb25maWcuYXV0b2xvYWQpIHtcbiAgICAgIGdsdWUoKTtcbiAgICB9XG4gIH0pO1xufVxuXG5yZXF1aXJlKCdjb2cvbG9nZ2VyJykuZW5hYmxlKCcqJyk7XG5cbi8qKlxuICAjIyMgSW50ZXJuYWwgRnVuY3Rpb25zXG4qKi9cblxuLyoqXG4gICMjIyMgaW5pdFBlZXIoZWwpXG5cbiAgSGFuZGxlIHRoZSBpbml0aWFsaXphdGlvbiBvZiBhIHJ0Yy1yZW1vdGUgdGFyZ2V0XG4qKi9cbmZ1bmN0aW9uIGluaXRQZWVyKGVsKSB7XG4gIHZhciBwcm9wVmFsdWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ3J0Yy1wZWVyJyk7XG4gIHZhciB0YXJnZXRTdHJlYW0gPSBlbC5nZXRBdHRyaWJ1dGUoJ3J0Yy1zdHJlYW0nKTtcbiAgdmFyIHBlZXJSb2xlcyA9IHByb3BWYWx1ZSA/IHByb3BWYWx1ZS5zcGxpdChyZVNlcCkgOiBbJyonXTtcblxuICAvLyBjcmVhdGUgYSBkYXRhIGNvbnRhaW5lciB0aGF0IHdlIHdpbGwgYXR0YWNoIHRvIHRoZSBlbGVtZW50XG4gIHZhciBkYXRhID0gZWwuX3J0YyB8fCAoZWwuX3J0YyA9IHt9KTtcblxuICBmdW5jdGlvbiBhdHRhY2hTdHJlYW0oc3RyZWFtKSB7XG4gICAgbG9nZ2VyKCdhdHRhY2hpbmcgc3RyZWFtJyk7XG4gICAgbWVkaWEoc3RyZWFtKS5yZW5kZXIoZWwpO1xuICAgIGRhdGEuc3RyZWFtSWQgPSBzdHJlYW0uaWQ7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRTdHJlYW0oc3RyZWFtLCBwZWVyKSB7XG4gICAgLy8gaWYgd2UgZG9uJ3QgaGF2ZSBhIHN0cmVhbSBvciBhbHJlYWR5IGhhdmUgYSBzdHJlYW0gaWQgdGhlbiBiYWlsXG4gICAgaWYgKGRhdGEuc3RyZWFtSWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGEgcGFydGljdWxhciB0YXJnZXQgc3RyZWFtLCB0aGVuIGdvIGxvb2tpbmcgZm9yIGl0XG4gICAgaWYgKHRhcmdldFN0cmVhbSkge1xuICAgICAgbG9nZ2VyKCdyZXF1ZXN0aW5nIHN0cmVhbSBkYXRhJyk7XG4gICAgICBzZXNzaW9uTWdyLmdldFN0cmVhbURhdGEoc3RyZWFtLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIGxvZ2dlcignZ290IHN0cmVhbSBkYXRhJywgZGF0YSk7XG5cbiAgICAgICAgLy8gaWYgaXQncyBhIG1hdGNoLCB0aGVuIGF0dGFjaFxuICAgICAgICBpZiAoZGF0YSAmJiBkYXRhLm5hbWUgPT09IHRhcmdldFN0cmVhbSkge1xuICAgICAgICAgIGF0dGFjaFN0cmVhbShzdHJlYW0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgLy8gb3RoZXJ3aXNlLCBhdXRvbWF0aWNhbGx5IGFzc29jaWF0ZSB3aXRoIHRoZSBlbGVtZW50XG4gICAgZWxzZSB7XG4gICAgICBhdHRhY2hTdHJlYW0oc3RyZWFtKTtcbiAgICB9XG4gIH1cblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHBlZXJzIGFuZCBtb25pdG9yIGV2ZW50cyBmb3IgdGhhdCBwZWVyXG4gIHBlZXJSb2xlcy5mb3JFYWNoKGZ1bmN0aW9uKHJvbGUpIHtcbiAgICBldmUub24oJ2dsdWUucGVlci5hY3RpdmUuJyArIHJvbGUsIGZ1bmN0aW9uKHBlZXIsIHBlZXJJZCkge1xuICAgICAgLy8gaWYgdGhlIGVsZW1lbnQgYWxyZWFkeSBoYXMgYSBwZWVyLCB0aGVuIGRvIG5vdGhpbmdcbiAgICAgIGlmIChkYXRhLnBlZXJJZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGxvZ2dlcigncGVlciBhY3RpdmUnLCBwZWVyLmdldFJlbW90ZVN0cmVhbXMoKSk7XG5cbiAgICAgIC8vIGFzc29jaWF0ZSB0aGUgcGVlciBpZCB3aXRoIHRoZSBlbGVtZW50XG4gICAgICBkYXRhLnBlZXJJZCA9IHBlZXJJZDtcblxuICAgICAgLy8gYWRkIGV4aXN0aW5nIHN0cmVhbXNcbiAgICAgIFtdLnNsaWNlLmNhbGwocGVlci5nZXRSZW1vdGVTdHJlYW1zKCkpLmZvckVhY2goYWRkU3RyZWFtKTtcblxuICAgICAgLy8gbGlzdGVuIGZvciBhZGQgc3RyYWVtIGV2ZW50c1xuICAgICAgcGVlci5hZGRFdmVudExpc3RlbmVyKCdhZGRzdHJlYW0nLCBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgYWRkU3RyZWFtKGV2dC5zdHJlYW0sIHBlZXIpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGV2ZS5vbignZ2x1ZS5wZWVyLmxlYXZlJywgZnVuY3Rpb24ocGVlciwgcGVlcklkKSB7XG4gICAgLy8gaWYgdGhlIHBlZXIgbGVhdmluZyBtYXRjaGVzIHRoZSByZW1vdGUgcGVlciwgdGhlbiBjbGVhbnVwXG4gICAgaWYgKGRhdGEucGVlcklkID09PSBwZWVySWQpIHtcbiAgICAgIC8vIHJlc2V0IHRoZSB0YXJnZXQgbWVkaWEgZWxlbWVudFxuICAgICAgcmVzZXRFbChlbCk7XG5cbiAgICAgIC8vIHJlc2V0IHRoZSBydGMgZGF0YVxuICAgICAgZGF0YSA9IGVsLl9ydGMgPSB7fTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBlbDtcbn1cblxuLyoqXG4gICMjIyMgaW5pdENhcHR1cmUoZWwpXG5cbiAgSGFuZGxlIHRoZSBpbml0aWFsaXphdGlvbiBvZiBhbiBydGMtY2FwdHVyZSB0YXJnZXRcbioqL1xuZnVuY3Rpb24gaW5pdENhcHR1cmUoZWwpIHtcbiAgLy8gcmVhZCB0aGUgY2FwdHVyZSBpbnN0cnVjdGlvbnNcbiAgdmFyIGNvbmZpZ1RleHQgPSBlbC5nZXRBdHRyaWJ1dGUoJ3J0Yy1jYXB0dXJlJykgfHwgJyc7XG4gIHZhciByZXMgPSBlbC5nZXRBdHRyaWJ1dGUoJ3J0Yy1yZXNvbHV0aW9uJykgfHwgZWwuZ2V0QXR0cmlidXRlKCdydGMtcmVzJyk7XG4gIHZhciBmcHMgPSBlbC5nZXRBdHRyaWJ1dGUoJ3J0Yy1mcHMnKTtcblxuICBpZiAocmVzKSB7XG4gICAgY29uZmlnVGV4dCArPSAnIG1pbjonICsgcmVzICsgJyBtYXg6JyArIHJlcztcbiAgfVxuXG4gIGlmIChmcHMpIHtcbiAgICBjb25maWdUZXh0ICs9ICcgbWluZnBzOicgKyBmcHMgKyAnIG1heGZwczonICsgZnBzO1xuICB9XG5cbiAgLy8gcGF0Y2ggaW4gYSBjYXB0dXJlIG1ldGhvZCB0byB0aGUgZWxlbWVudFxuICBlbC5jYXB0dXJlID0gZW5hYmxlQ2FwdHVyZShlbCwgY2FwdHVyZUNvbmZpZyhjb25maWdUZXh0KSk7XG5cbiAgLy8gdHJpZ2dlciBjYXB0dXJlXG4gIGVsLmNhcHR1cmUoZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgLy8gYnJvYWRjYXN0IHRoZSBzdHJlYW0gdGhyb3VnaCB0aGUgc2Vzc2lvbiBtYW5hZ2VyXG4gICAgaWYgKHNlc3Npb25NZ3IpIHtcbiAgICAgIHNlc3Npb25NZ3IuYnJvYWRjYXN0KHN0cmVhbSwgeyBuYW1lOiBlbC5pZCB9KTtcbiAgICB9XG4gIH0pO1xufVxuXG4vKiogaW50ZXJuYWwgaGVscGVycyAqL1xuXG5mdW5jdGlvbiBlbmFibGVDYXB0dXJlKGVsLCBjb25maWcpIHtcblxuICBmdW5jdGlvbiBjYXAoY2FsbGJhY2spIHtcbiAgICB2YXIgc3RyZWFtID0gbWVkaWEoe1xuICAgICAgY29uc3RyYWludHM6IGNvbmZpZy50b0NvbnN0cmFpbnRzKHtcbiAgICAgICAgc291cmNlczogc291cmNlc1xuICAgICAgfSlcbiAgICB9KTtcblxuICAgIC8vIHJlbmRlciB0aGUgc3RyZWFtIHRvIHRoZSB0YXJnZXQgZWxlbWVudFxuICAgIHN0cmVhbS5yZW5kZXIoZWwpO1xuXG4gICAgLy8gY2FwdHVyZSBhbmQgcmVwb3J0IGVycm9yc1xuICAgIHN0cmVhbS5vbignZXJyb3InLCBmdW5jdGlvbihlcnIpIHtcbiAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAnRXJyb3IgYXR0ZW1wdGluZyB0byBjYXB0dXJlIG1lZGlhLCByZXF1ZXN0ZWQgY29uc3RyYWludHMnLFxuICAgICAgICBzdHJlYW0uY29uc3RyYWludHNcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICAvLyBlbWl0IGEgY2FwdHVyZSBldmVudCB0aHJvdWdoIHRoZSBlbGVtZW50XG4gICAgc3RyZWFtLm9uKCdjYXB0dXJlJywgZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICAvLyBkaXNwYXRjaCB0aGUgY2FwdHVyZSBldmVudFxuICAgICAgZWwuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2NhcHR1cmUnLCB7XG4gICAgICAgIGRldGFpbDogeyBzdHJlYW06IHN0cmVhbSB9XG4gICAgICB9KSk7XG5cbiAgICAgIC8vIHRyaWdnZXIgdGhlIGNhbGxiYWNrIGlmIG9uZSBzdXBwbGllZFxuICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNhbGxiYWNrKHN0cmVhbSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAvLyBpZiB3ZSBhbHJlYWR5IGhhdmUgc291cmNlcywgb3IgY2Fubm90IGdldCBzb3VyY2UgaW5mb3JtYXRpb25cbiAgICAvLyB0aGVuIHNraXAgc3RyYWlnaHQgdG8gY2FwdHVyZVxuICAgIGlmIChzb3VyY2VzIHx8ICghIGNhbkdldFNvdXJjZXMpKSB7XG4gICAgICByZXR1cm4gY2FwKGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICAvLyBnZXQgYW5kIHVwZGF0ZSBzb3VyY2VzXG4gICAgTWVkaWFTdHJlYW1UcmFjay5nZXRTb3VyY2VzKGZ1bmN0aW9uKHMpIHtcbiAgICAgIC8vIHVwZGF0ZSB0aGUgc291cmNlc1xuICAgICAgc291cmNlcyA9IHM7XG5cbiAgICAgIC8vIGNhcHR1cmVcbiAgICAgIGNhcChjYWxsYmFjaylcbiAgICB9KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVSb29tTmFtZSgpIHtcbiAgbG9jYXRpb24uaGFzaCA9IE1hdGgucG93KDIsIDUzKSAqIE1hdGgucmFuZG9tKCk7XG5cbiAgcmV0dXJuIGxvY2F0aW9uLmhhc2guc2xpY2UoMSk7XG59XG5cbmZ1bmN0aW9uIGxvYWRQcmltdXMoY2FsbGJhY2spIHtcbiAgcmV0dXJuIHNpZ25hbGxlci5sb2FkUHJpbXVzKGNvbmZpZy5zaWduYWxob3N0LCBjYWxsYmFjayk7XG59IiwidmFyIHByb2Nlc3M9cmVxdWlyZShcIl9fYnJvd3NlcmlmeV9wcm9jZXNzXCIpOy8qZ2xvYmFsIHNldEltbWVkaWF0ZTogZmFsc2UsIHNldFRpbWVvdXQ6IGZhbHNlLCBjb25zb2xlOiBmYWxzZSAqL1xuKGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBhc3luYyA9IHt9O1xuXG4gICAgLy8gZ2xvYmFsIG9uIHRoZSBzZXJ2ZXIsIHdpbmRvdyBpbiB0aGUgYnJvd3NlclxuICAgIHZhciByb290LCBwcmV2aW91c19hc3luYztcblxuICAgIHJvb3QgPSB0aGlzO1xuICAgIGlmIChyb290ICE9IG51bGwpIHtcbiAgICAgIHByZXZpb3VzX2FzeW5jID0gcm9vdC5hc3luYztcbiAgICB9XG5cbiAgICBhc3luYy5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByb290LmFzeW5jID0gcHJldmlvdXNfYXN5bmM7XG4gICAgICAgIHJldHVybiBhc3luYztcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gb25seV9vbmNlKGZuKSB7XG4gICAgICAgIHZhciBjYWxsZWQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKGNhbGxlZCkgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGJhY2sgd2FzIGFscmVhZHkgY2FsbGVkLlwiKTtcbiAgICAgICAgICAgIGNhbGxlZCA9IHRydWU7XG4gICAgICAgICAgICBmbi5hcHBseShyb290LCBhcmd1bWVudHMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8vLyBjcm9zcy1icm93c2VyIGNvbXBhdGlibGl0eSBmdW5jdGlvbnMgLy8vL1xuXG4gICAgdmFyIF9lYWNoID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IpIHtcbiAgICAgICAgaWYgKGFyci5mb3JFYWNoKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJyLmZvckVhY2goaXRlcmF0b3IpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICBpdGVyYXRvcihhcnJbaV0sIGksIGFycik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIF9tYXAgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvcikge1xuICAgICAgICBpZiAoYXJyLm1hcCkge1xuICAgICAgICAgICAgcmV0dXJuIGFyci5tYXAoaXRlcmF0b3IpO1xuICAgICAgICB9XG4gICAgICAgIHZhciByZXN1bHRzID0gW107XG4gICAgICAgIF9lYWNoKGFyciwgZnVuY3Rpb24gKHgsIGksIGEpIHtcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaChpdGVyYXRvcih4LCBpLCBhKSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICB9O1xuXG4gICAgdmFyIF9yZWR1Y2UgPSBmdW5jdGlvbiAoYXJyLCBpdGVyYXRvciwgbWVtbykge1xuICAgICAgICBpZiAoYXJyLnJlZHVjZSkge1xuICAgICAgICAgICAgcmV0dXJuIGFyci5yZWR1Y2UoaXRlcmF0b3IsIG1lbW8pO1xuICAgICAgICB9XG4gICAgICAgIF9lYWNoKGFyciwgZnVuY3Rpb24gKHgsIGksIGEpIHtcbiAgICAgICAgICAgIG1lbW8gPSBpdGVyYXRvcihtZW1vLCB4LCBpLCBhKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBtZW1vO1xuICAgIH07XG5cbiAgICB2YXIgX2tleXMgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIGlmIChPYmplY3Qua2V5cykge1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKG9iaik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGtleXMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgayBpbiBvYmopIHtcbiAgICAgICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgICAgICBrZXlzLnB1c2goayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgfTtcblxuICAgIC8vLy8gZXhwb3J0ZWQgYXN5bmMgbW9kdWxlIGZ1bmN0aW9ucyAvLy8vXG5cbiAgICAvLy8vIG5leHRUaWNrIGltcGxlbWVudGF0aW9uIHdpdGggYnJvd3Nlci1jb21wYXRpYmxlIGZhbGxiYWNrIC8vLy9cbiAgICBpZiAodHlwZW9mIHByb2Nlc3MgPT09ICd1bmRlZmluZWQnIHx8ICEocHJvY2Vzcy5uZXh0VGljaykpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFzeW5jLm5leHRUaWNrID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgLy8gbm90IGEgZGlyZWN0IGFsaWFzIGZvciBJRTEwIGNvbXBhdGliaWxpdHlcbiAgICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUoZm4pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSA9IGFzeW5jLm5leHRUaWNrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYXN5bmMubmV4dFRpY2sgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhc3luYy5zZXRJbW1lZGlhdGUgPSBhc3luYy5uZXh0VGljaztcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgYXN5bmMubmV4dFRpY2sgPSBwcm9jZXNzLm5leHRUaWNrO1xuICAgICAgICBpZiAodHlwZW9mIHNldEltbWVkaWF0ZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSA9IHNldEltbWVkaWF0ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZSA9IGFzeW5jLm5leHRUaWNrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMuZWFjaCA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICBpZiAoIWFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjb21wbGV0ZWQgPSAwO1xuICAgICAgICBfZWFjaChhcnIsIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LCBvbmx5X29uY2UoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlZCArPSAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29tcGxldGVkID49IGFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIGFzeW5jLmZvckVhY2ggPSBhc3luYy5lYWNoO1xuXG4gICAgYXN5bmMuZWFjaFNlcmllcyA9IGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICBpZiAoIWFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjb21wbGV0ZWQgPSAwO1xuICAgICAgICB2YXIgaXRlcmF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKGFycltjb21wbGV0ZWRdLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29tcGxldGVkICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21wbGV0ZWQgPj0gYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVyYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgaXRlcmF0ZSgpO1xuICAgIH07XG4gICAgYXN5bmMuZm9yRWFjaFNlcmllcyA9IGFzeW5jLmVhY2hTZXJpZXM7XG5cbiAgICBhc3luYy5lYWNoTGltaXQgPSBmdW5jdGlvbiAoYXJyLCBsaW1pdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBmbiA9IF9lYWNoTGltaXQobGltaXQpO1xuICAgICAgICBmbi5hcHBseShudWxsLCBbYXJyLCBpdGVyYXRvciwgY2FsbGJhY2tdKTtcbiAgICB9O1xuICAgIGFzeW5jLmZvckVhY2hMaW1pdCA9IGFzeW5jLmVhY2hMaW1pdDtcblxuICAgIHZhciBfZWFjaExpbWl0ID0gZnVuY3Rpb24gKGxpbWl0KSB7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgIGlmICghYXJyLmxlbmd0aCB8fCBsaW1pdCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgY29tcGxldGVkID0gMDtcbiAgICAgICAgICAgIHZhciBzdGFydGVkID0gMDtcbiAgICAgICAgICAgIHZhciBydW5uaW5nID0gMDtcblxuICAgICAgICAgICAgKGZ1bmN0aW9uIHJlcGxlbmlzaCAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBsZXRlZCA+PSBhcnIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHdoaWxlIChydW5uaW5nIDwgbGltaXQgJiYgc3RhcnRlZCA8IGFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRlZCArPSAxO1xuICAgICAgICAgICAgICAgICAgICBydW5uaW5nICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGl0ZXJhdG9yKGFycltzdGFydGVkIC0gMV0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBydW5uaW5nIC09IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBsZXRlZCA+PSBhcnIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXBsZW5pc2goKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKCk7XG4gICAgICAgIH07XG4gICAgfTtcblxuXG4gICAgdmFyIGRvUGFyYWxsZWwgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHJldHVybiBmbi5hcHBseShudWxsLCBbYXN5bmMuZWFjaF0uY29uY2F0KGFyZ3MpKTtcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIHZhciBkb1BhcmFsbGVsTGltaXQgPSBmdW5jdGlvbihsaW1pdCwgZm4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHJldHVybiBmbi5hcHBseShudWxsLCBbX2VhY2hMaW1pdChsaW1pdCldLmNvbmNhdChhcmdzKSk7XG4gICAgICAgIH07XG4gICAgfTtcbiAgICB2YXIgZG9TZXJpZXMgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHJldHVybiBmbi5hcHBseShudWxsLCBbYXN5bmMuZWFjaFNlcmllc10uY29uY2F0KGFyZ3MpKTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG5cbiAgICB2YXIgX2FzeW5jTWFwID0gZnVuY3Rpb24gKGVhY2hmbiwgYXJyLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgYXJyID0gX21hcChhcnIsIGZ1bmN0aW9uICh4LCBpKSB7XG4gICAgICAgICAgICByZXR1cm4ge2luZGV4OiBpLCB2YWx1ZTogeH07XG4gICAgICAgIH0pO1xuICAgICAgICBlYWNoZm4oYXJyLCBmdW5jdGlvbiAoeCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKHgudmFsdWUsIGZ1bmN0aW9uIChlcnIsIHYpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRzW3guaW5kZXhdID0gdjtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgcmVzdWx0cyk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgYXN5bmMubWFwID0gZG9QYXJhbGxlbChfYXN5bmNNYXApO1xuICAgIGFzeW5jLm1hcFNlcmllcyA9IGRvU2VyaWVzKF9hc3luY01hcCk7XG4gICAgYXN5bmMubWFwTGltaXQgPSBmdW5jdGlvbiAoYXJyLCBsaW1pdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBfbWFwTGltaXQobGltaXQpKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgdmFyIF9tYXBMaW1pdCA9IGZ1bmN0aW9uKGxpbWl0KSB7XG4gICAgICAgIHJldHVybiBkb1BhcmFsbGVsTGltaXQobGltaXQsIF9hc3luY01hcCk7XG4gICAgfTtcblxuICAgIC8vIHJlZHVjZSBvbmx5IGhhcyBhIHNlcmllcyB2ZXJzaW9uLCBhcyBkb2luZyByZWR1Y2UgaW4gcGFyYWxsZWwgd29uJ3RcbiAgICAvLyB3b3JrIGluIG1hbnkgc2l0dWF0aW9ucy5cbiAgICBhc3luYy5yZWR1Y2UgPSBmdW5jdGlvbiAoYXJyLCBtZW1vLCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgYXN5bmMuZWFjaFNlcmllcyhhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IobWVtbywgeCwgZnVuY3Rpb24gKGVyciwgdikge1xuICAgICAgICAgICAgICAgIG1lbW8gPSB2O1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBtZW1vKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICAvLyBpbmplY3QgYWxpYXNcbiAgICBhc3luYy5pbmplY3QgPSBhc3luYy5yZWR1Y2U7XG4gICAgLy8gZm9sZGwgYWxpYXNcbiAgICBhc3luYy5mb2xkbCA9IGFzeW5jLnJlZHVjZTtcblxuICAgIGFzeW5jLnJlZHVjZVJpZ2h0ID0gZnVuY3Rpb24gKGFyciwgbWVtbywgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByZXZlcnNlZCA9IF9tYXAoYXJyLCBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgIH0pLnJldmVyc2UoKTtcbiAgICAgICAgYXN5bmMucmVkdWNlKHJldmVyc2VkLCBtZW1vLCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgIH07XG4gICAgLy8gZm9sZHIgYWxpYXNcbiAgICBhc3luYy5mb2xkciA9IGFzeW5jLnJlZHVjZVJpZ2h0O1xuXG4gICAgdmFyIF9maWx0ZXIgPSBmdW5jdGlvbiAoZWFjaGZuLCBhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgICAgICBhcnIgPSBfbWFwKGFyciwgZnVuY3Rpb24gKHgsIGkpIHtcbiAgICAgICAgICAgIHJldHVybiB7aW5kZXg6IGksIHZhbHVlOiB4fTtcbiAgICAgICAgfSk7XG4gICAgICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeC52YWx1ZSwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soX21hcChyZXN1bHRzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYS5pbmRleCAtIGIuaW5kZXg7XG4gICAgICAgICAgICB9KSwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geC52YWx1ZTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBhc3luYy5maWx0ZXIgPSBkb1BhcmFsbGVsKF9maWx0ZXIpO1xuICAgIGFzeW5jLmZpbHRlclNlcmllcyA9IGRvU2VyaWVzKF9maWx0ZXIpO1xuICAgIC8vIHNlbGVjdCBhbGlhc1xuICAgIGFzeW5jLnNlbGVjdCA9IGFzeW5jLmZpbHRlcjtcbiAgICBhc3luYy5zZWxlY3RTZXJpZXMgPSBhc3luYy5maWx0ZXJTZXJpZXM7XG5cbiAgICB2YXIgX3JlamVjdCA9IGZ1bmN0aW9uIChlYWNoZm4sIGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciByZXN1bHRzID0gW107XG4gICAgICAgIGFyciA9IF9tYXAoYXJyLCBmdW5jdGlvbiAoeCwgaSkge1xuICAgICAgICAgICAgcmV0dXJuIHtpbmRleDogaSwgdmFsdWU6IHh9O1xuICAgICAgICB9KTtcbiAgICAgICAgZWFjaGZuKGFyciwgZnVuY3Rpb24gKHgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpdGVyYXRvcih4LnZhbHVlLCBmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIGlmICghdikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY2FsbGJhY2soX21hcChyZXN1bHRzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYS5pbmRleCAtIGIuaW5kZXg7XG4gICAgICAgICAgICB9KSwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geC52YWx1ZTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBhc3luYy5yZWplY3QgPSBkb1BhcmFsbGVsKF9yZWplY3QpO1xuICAgIGFzeW5jLnJlamVjdFNlcmllcyA9IGRvU2VyaWVzKF9yZWplY3QpO1xuXG4gICAgdmFyIF9kZXRlY3QgPSBmdW5jdGlvbiAoZWFjaGZuLCBhcnIsIGl0ZXJhdG9yLCBtYWluX2NhbGxiYWNrKSB7XG4gICAgICAgIGVhY2hmbihhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeCwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFpbl9jYWxsYmFjayh4KTtcbiAgICAgICAgICAgICAgICAgICAgbWFpbl9jYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgbWFpbl9jYWxsYmFjaygpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIGFzeW5jLmRldGVjdCA9IGRvUGFyYWxsZWwoX2RldGVjdCk7XG4gICAgYXN5bmMuZGV0ZWN0U2VyaWVzID0gZG9TZXJpZXMoX2RldGVjdCk7XG5cbiAgICBhc3luYy5zb21lID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIG1haW5fY2FsbGJhY2spIHtcbiAgICAgICAgYXN5bmMuZWFjaChhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeCwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICBtYWluX2NhbGxiYWNrKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBtYWluX2NhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgbWFpbl9jYWxsYmFjayhmYWxzZSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgLy8gYW55IGFsaWFzXG4gICAgYXN5bmMuYW55ID0gYXN5bmMuc29tZTtcblxuICAgIGFzeW5jLmV2ZXJ5ID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIG1haW5fY2FsbGJhY2spIHtcbiAgICAgICAgYXN5bmMuZWFjaChhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeCwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXYpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFpbl9jYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIG1haW5fY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBtYWluX2NhbGxiYWNrKHRydWUpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIC8vIGFsbCBhbGlhc1xuICAgIGFzeW5jLmFsbCA9IGFzeW5jLmV2ZXJ5O1xuXG4gICAgYXN5bmMuc29ydEJ5ID0gZnVuY3Rpb24gKGFyciwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGFzeW5jLm1hcChhcnIsIGZ1bmN0aW9uICh4LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaXRlcmF0b3IoeCwgZnVuY3Rpb24gKGVyciwgY3JpdGVyaWEpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7dmFsdWU6IHgsIGNyaXRlcmlhOiBjcml0ZXJpYX0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyLCByZXN1bHRzKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgZm4gPSBmdW5jdGlvbiAobGVmdCwgcmlnaHQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGEgPSBsZWZ0LmNyaXRlcmlhLCBiID0gcmlnaHQuY3JpdGVyaWE7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhIDwgYiA/IC0xIDogYSA+IGIgPyAxIDogMDtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIF9tYXAocmVzdWx0cy5zb3J0KGZuKSwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHgudmFsdWU7XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgYXN5bmMuYXV0byA9IGZ1bmN0aW9uICh0YXNrcywgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgdmFyIGtleXMgPSBfa2V5cyh0YXNrcyk7XG4gICAgICAgIGlmICgha2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciByZXN1bHRzID0ge307XG5cbiAgICAgICAgdmFyIGxpc3RlbmVycyA9IFtdO1xuICAgICAgICB2YXIgYWRkTGlzdGVuZXIgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgIGxpc3RlbmVycy51bnNoaWZ0KGZuKTtcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIHJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lcnNbaV0gPT09IGZuKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHZhciB0YXNrQ29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBfZWFjaChsaXN0ZW5lcnMuc2xpY2UoMCksIGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBhZGRMaXN0ZW5lcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoX2tleXMocmVzdWx0cykubGVuZ3RoID09PSBrZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIF9lYWNoKGtleXMsIGZ1bmN0aW9uIChrKSB7XG4gICAgICAgICAgICB2YXIgdGFzayA9ICh0YXNrc1trXSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSA/IFt0YXNrc1trXV06IHRhc2tzW2tdO1xuICAgICAgICAgICAgdmFyIHRhc2tDYWxsYmFjayA9IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgYXJncyA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNhZmVSZXN1bHRzID0ge307XG4gICAgICAgICAgICAgICAgICAgIF9lYWNoKF9rZXlzKHJlc3VsdHMpLCBmdW5jdGlvbihya2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzYWZlUmVzdWx0c1tya2V5XSA9IHJlc3VsdHNbcmtleV07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzYWZlUmVzdWx0c1trXSA9IGFyZ3M7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgc2FmZVJlc3VsdHMpO1xuICAgICAgICAgICAgICAgICAgICAvLyBzdG9wIHN1YnNlcXVlbnQgZXJyb3JzIGhpdHRpbmcgY2FsbGJhY2sgbXVsdGlwbGUgdGltZXNcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHNba10gPSBhcmdzO1xuICAgICAgICAgICAgICAgICAgICBhc3luYy5zZXRJbW1lZGlhdGUodGFza0NvbXBsZXRlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIHJlcXVpcmVzID0gdGFzay5zbGljZSgwLCBNYXRoLmFicyh0YXNrLmxlbmd0aCAtIDEpKSB8fCBbXTtcbiAgICAgICAgICAgIHZhciByZWFkeSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gX3JlZHVjZShyZXF1aXJlcywgZnVuY3Rpb24gKGEsIHgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChhICYmIHJlc3VsdHMuaGFzT3duUHJvcGVydHkoeCkpO1xuICAgICAgICAgICAgICAgIH0sIHRydWUpICYmICFyZXN1bHRzLmhhc093blByb3BlcnR5KGspO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChyZWFkeSgpKSB7XG4gICAgICAgICAgICAgICAgdGFza1t0YXNrLmxlbmd0aCAtIDFdKHRhc2tDYWxsYmFjaywgcmVzdWx0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgbGlzdGVuZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWFkeSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVMaXN0ZW5lcihsaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXNrW3Rhc2subGVuZ3RoIC0gMV0odGFza0NhbGxiYWNrLCByZXN1bHRzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgYWRkTGlzdGVuZXIobGlzdGVuZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgYXN5bmMud2F0ZXJmYWxsID0gZnVuY3Rpb24gKHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICBpZiAodGFza3MuY29uc3RydWN0b3IgIT09IEFycmF5KSB7XG4gICAgICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcignRmlyc3QgYXJndW1lbnQgdG8gd2F0ZXJmYWxsIG11c3QgYmUgYW4gYXJyYXkgb2YgZnVuY3Rpb25zJyk7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0YXNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB3cmFwSXRlcmF0b3IgPSBmdW5jdGlvbiAoaXRlcmF0b3IpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MucHVzaCh3cmFwSXRlcmF0b3IobmV4dCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhc3luYy5zZXRJbW1lZGlhdGUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlcmF0b3IuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgICAgIHdyYXBJdGVyYXRvcihhc3luYy5pdGVyYXRvcih0YXNrcykpKCk7XG4gICAgfTtcblxuICAgIHZhciBfcGFyYWxsZWwgPSBmdW5jdGlvbihlYWNoZm4sIHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICBpZiAodGFza3MuY29uc3RydWN0b3IgPT09IEFycmF5KSB7XG4gICAgICAgICAgICBlYWNoZm4ubWFwKHRhc2tzLCBmdW5jdGlvbiAoZm4sIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZuKSB7XG4gICAgICAgICAgICAgICAgICAgIGZuKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJncyA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsKG51bGwsIGVyciwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciByZXN1bHRzID0ge307XG4gICAgICAgICAgICBlYWNoZm4uZWFjaChfa2V5cyh0YXNrcyksIGZ1bmN0aW9uIChrLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIHRhc2tzW2tdKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXJncyA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0c1trXSA9IGFyZ3M7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHRzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGFzeW5jLnBhcmFsbGVsID0gZnVuY3Rpb24gKHRhc2tzLCBjYWxsYmFjaykge1xuICAgICAgICBfcGFyYWxsZWwoeyBtYXA6IGFzeW5jLm1hcCwgZWFjaDogYXN5bmMuZWFjaCB9LCB0YXNrcywgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBhc3luYy5wYXJhbGxlbExpbWl0ID0gZnVuY3Rpb24odGFza3MsIGxpbWl0LCBjYWxsYmFjaykge1xuICAgICAgICBfcGFyYWxsZWwoeyBtYXA6IF9tYXBMaW1pdChsaW1pdCksIGVhY2g6IF9lYWNoTGltaXQobGltaXQpIH0sIHRhc2tzLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLnNlcmllcyA9IGZ1bmN0aW9uICh0YXNrcywgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgaWYgKHRhc2tzLmNvbnN0cnVjdG9yID09PSBBcnJheSkge1xuICAgICAgICAgICAgYXN5bmMubWFwU2VyaWVzKHRhc2tzLCBmdW5jdGlvbiAoZm4sIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZuKSB7XG4gICAgICAgICAgICAgICAgICAgIGZuKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJncyA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsKG51bGwsIGVyciwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciByZXN1bHRzID0ge307XG4gICAgICAgICAgICBhc3luYy5lYWNoU2VyaWVzKF9rZXlzKHRhc2tzKSwgZnVuY3Rpb24gKGssIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgdGFza3Nba10oZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzW2tdID0gYXJncztcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIHJlc3VsdHMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgYXN5bmMuaXRlcmF0b3IgPSBmdW5jdGlvbiAodGFza3MpIHtcbiAgICAgICAgdmFyIG1ha2VDYWxsYmFjayA9IGZ1bmN0aW9uIChpbmRleCkge1xuICAgICAgICAgICAgdmFyIGZuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICh0YXNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFza3NbaW5kZXhdLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmbi5uZXh0KCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZm4ubmV4dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGluZGV4IDwgdGFza3MubGVuZ3RoIC0gMSkgPyBtYWtlQ2FsbGJhY2soaW5kZXggKyAxKTogbnVsbDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZm47XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBtYWtlQ2FsbGJhY2soMCk7XG4gICAgfTtcblxuICAgIGFzeW5jLmFwcGx5ID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBmbi5hcHBseShcbiAgICAgICAgICAgICAgICBudWxsLCBhcmdzLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgdmFyIF9jb25jYXQgPSBmdW5jdGlvbiAoZWFjaGZuLCBhcnIsIGZuLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgciA9IFtdO1xuICAgICAgICBlYWNoZm4oYXJyLCBmdW5jdGlvbiAoeCwgY2IpIHtcbiAgICAgICAgICAgIGZuKHgsIGZ1bmN0aW9uIChlcnIsIHkpIHtcbiAgICAgICAgICAgICAgICByID0gci5jb25jYXQoeSB8fCBbXSk7XG4gICAgICAgICAgICAgICAgY2IoZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIsIHIpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIGFzeW5jLmNvbmNhdCA9IGRvUGFyYWxsZWwoX2NvbmNhdCk7XG4gICAgYXN5bmMuY29uY2F0U2VyaWVzID0gZG9TZXJpZXMoX2NvbmNhdCk7XG5cbiAgICBhc3luYy53aGlsc3QgPSBmdW5jdGlvbiAodGVzdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICh0ZXN0KCkpIHtcbiAgICAgICAgICAgIGl0ZXJhdG9yKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhc3luYy53aGlsc3QodGVzdCwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBhc3luYy5kb1doaWxzdCA9IGZ1bmN0aW9uIChpdGVyYXRvciwgdGVzdCwgY2FsbGJhY2spIHtcbiAgICAgICAgaXRlcmF0b3IoZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRlc3QoKSkge1xuICAgICAgICAgICAgICAgIGFzeW5jLmRvV2hpbHN0KGl0ZXJhdG9yLCB0ZXN0LCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgYXN5bmMudW50aWwgPSBmdW5jdGlvbiAodGVzdCwgaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICghdGVzdCgpKSB7XG4gICAgICAgICAgICBpdGVyYXRvcihmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXN5bmMudW50aWwodGVzdCwgaXRlcmF0b3IsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBhc3luYy5kb1VudGlsID0gZnVuY3Rpb24gKGl0ZXJhdG9yLCB0ZXN0LCBjYWxsYmFjaykge1xuICAgICAgICBpdGVyYXRvcihmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXRlc3QoKSkge1xuICAgICAgICAgICAgICAgIGFzeW5jLmRvVW50aWwoaXRlcmF0b3IsIHRlc3QsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBhc3luYy5xdWV1ZSA9IGZ1bmN0aW9uICh3b3JrZXIsIGNvbmN1cnJlbmN5KSB7XG4gICAgICAgIGlmIChjb25jdXJyZW5jeSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25jdXJyZW5jeSA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gX2luc2VydChxLCBkYXRhLCBwb3MsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgaWYoZGF0YS5jb25zdHJ1Y3RvciAhPT0gQXJyYXkpIHtcbiAgICAgICAgICAgICAgZGF0YSA9IFtkYXRhXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgX2VhY2goZGF0YSwgZnVuY3Rpb24odGFzaykge1xuICAgICAgICAgICAgICB2YXIgaXRlbSA9IHtcbiAgICAgICAgICAgICAgICAgIGRhdGE6IHRhc2ssXG4gICAgICAgICAgICAgICAgICBjYWxsYmFjazogdHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nID8gY2FsbGJhY2sgOiBudWxsXG4gICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgaWYgKHBvcykge1xuICAgICAgICAgICAgICAgIHEudGFza3MudW5zaGlmdChpdGVtKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBxLnRhc2tzLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBpZiAocS5zYXR1cmF0ZWQgJiYgcS50YXNrcy5sZW5ndGggPT09IGNvbmN1cnJlbmN5KSB7XG4gICAgICAgICAgICAgICAgICBxLnNhdHVyYXRlZCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShxLnByb2Nlc3MpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHdvcmtlcnMgPSAwO1xuICAgICAgICB2YXIgcSA9IHtcbiAgICAgICAgICAgIHRhc2tzOiBbXSxcbiAgICAgICAgICAgIGNvbmN1cnJlbmN5OiBjb25jdXJyZW5jeSxcbiAgICAgICAgICAgIHNhdHVyYXRlZDogbnVsbCxcbiAgICAgICAgICAgIGVtcHR5OiBudWxsLFxuICAgICAgICAgICAgZHJhaW46IG51bGwsXG4gICAgICAgICAgICBwdXNoOiBmdW5jdGlvbiAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgX2luc2VydChxLCBkYXRhLCBmYWxzZSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVuc2hpZnQ6IGZ1bmN0aW9uIChkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICBfaW5zZXJ0KHEsIGRhdGEsIHRydWUsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcm9jZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHdvcmtlcnMgPCBxLmNvbmN1cnJlbmN5ICYmIHEudGFza3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0YXNrID0gcS50YXNrcy5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocS5lbXB0eSAmJiBxLnRhc2tzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcS5lbXB0eSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHdvcmtlcnMgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3b3JrZXJzIC09IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFzay5jYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhc2suY2FsbGJhY2suYXBwbHkodGFzaywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChxLmRyYWluICYmIHEudGFza3MubGVuZ3RoICsgd29ya2VycyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHEuZHJhaW4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHEucHJvY2VzcygpO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2IgPSBvbmx5X29uY2UobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIHdvcmtlcih0YXNrLmRhdGEsIGNiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGVuZ3RoOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHEudGFza3MubGVuZ3RoO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJ1bm5pbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gd29ya2VycztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHE7XG4gICAgfTtcblxuICAgIGFzeW5jLmNhcmdvID0gZnVuY3Rpb24gKHdvcmtlciwgcGF5bG9hZCkge1xuICAgICAgICB2YXIgd29ya2luZyAgICAgPSBmYWxzZSxcbiAgICAgICAgICAgIHRhc2tzICAgICAgID0gW107XG5cbiAgICAgICAgdmFyIGNhcmdvID0ge1xuICAgICAgICAgICAgdGFza3M6IHRhc2tzLFxuICAgICAgICAgICAgcGF5bG9hZDogcGF5bG9hZCxcbiAgICAgICAgICAgIHNhdHVyYXRlZDogbnVsbCxcbiAgICAgICAgICAgIGVtcHR5OiBudWxsLFxuICAgICAgICAgICAgZHJhaW46IG51bGwsXG4gICAgICAgICAgICBwdXNoOiBmdW5jdGlvbiAoZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBpZihkYXRhLmNvbnN0cnVjdG9yICE9PSBBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICBkYXRhID0gW2RhdGFdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBfZWFjaChkYXRhLCBmdW5jdGlvbih0YXNrKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhc2tzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogdGFzayxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiB0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicgPyBjYWxsYmFjayA6IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjYXJnby5zYXR1cmF0ZWQgJiYgdGFza3MubGVuZ3RoID09PSBwYXlsb2FkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXJnby5zYXR1cmF0ZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGFzeW5jLnNldEltbWVkaWF0ZShjYXJnby5wcm9jZXNzKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcm9jZXNzOiBmdW5jdGlvbiBwcm9jZXNzKCkge1xuICAgICAgICAgICAgICAgIGlmICh3b3JraW5nKSByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKHRhc2tzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBpZihjYXJnby5kcmFpbikgY2FyZ28uZHJhaW4oKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciB0cyA9IHR5cGVvZiBwYXlsb2FkID09PSAnbnVtYmVyJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gdGFza3Muc3BsaWNlKDAsIHBheWxvYWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiB0YXNrcy5zcGxpY2UoMCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZHMgPSBfbWFwKHRzLCBmdW5jdGlvbiAodGFzaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFzay5kYXRhO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYoY2FyZ28uZW1wdHkpIGNhcmdvLmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgd29ya2luZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgd29ya2VyKGRzLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHdvcmtpbmcgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgICAgICAgICAgX2VhY2godHMsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YS5jYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEuY2FsbGJhY2suYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3MoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsZW5ndGg6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGFza3MubGVuZ3RoO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJ1bm5pbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gd29ya2luZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGNhcmdvO1xuICAgIH07XG5cbiAgICB2YXIgX2NvbnNvbGVfZm4gPSBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICBmbi5hcHBseShudWxsLCBhcmdzLmNvbmNhdChbZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb25zb2xlLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGNvbnNvbGVbbmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9lYWNoKGFyZ3MsIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZVtuYW1lXSh4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfV0pKTtcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIGFzeW5jLmxvZyA9IF9jb25zb2xlX2ZuKCdsb2cnKTtcbiAgICBhc3luYy5kaXIgPSBfY29uc29sZV9mbignZGlyJyk7XG4gICAgLyphc3luYy5pbmZvID0gX2NvbnNvbGVfZm4oJ2luZm8nKTtcbiAgICBhc3luYy53YXJuID0gX2NvbnNvbGVfZm4oJ3dhcm4nKTtcbiAgICBhc3luYy5lcnJvciA9IF9jb25zb2xlX2ZuKCdlcnJvcicpOyovXG5cbiAgICBhc3luYy5tZW1vaXplID0gZnVuY3Rpb24gKGZuLCBoYXNoZXIpIHtcbiAgICAgICAgdmFyIG1lbW8gPSB7fTtcbiAgICAgICAgdmFyIHF1ZXVlcyA9IHt9O1xuICAgICAgICBoYXNoZXIgPSBoYXNoZXIgfHwgZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICB9O1xuICAgICAgICB2YXIgbWVtb2l6ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICAgICAgdmFyIGtleSA9IGhhc2hlci5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgIGlmIChrZXkgaW4gbWVtbykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KG51bGwsIG1lbW9ba2V5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChrZXkgaW4gcXVldWVzKSB7XG4gICAgICAgICAgICAgICAgcXVldWVzW2tleV0ucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBxdWV1ZXNba2V5XSA9IFtjYWxsYmFja107XG4gICAgICAgICAgICAgICAgZm4uYXBwbHkobnVsbCwgYXJncy5jb25jYXQoW2Z1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgbWVtb1trZXldID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgICAgICAgICB2YXIgcSA9IHF1ZXVlc1trZXldO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgcXVldWVzW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gcS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICBxW2ldLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBtZW1vaXplZC5tZW1vID0gbWVtbztcbiAgICAgICAgbWVtb2l6ZWQudW5tZW1vaXplZCA9IGZuO1xuICAgICAgICByZXR1cm4gbWVtb2l6ZWQ7XG4gICAgfTtcblxuICAgIGFzeW5jLnVubWVtb2l6ZSA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIChmbi51bm1lbW9pemVkIHx8IGZuKS5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgfTtcbiAgICB9O1xuXG4gICAgYXN5bmMudGltZXMgPSBmdW5jdGlvbiAoY291bnQsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgY291bnRlciA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgICAgIGNvdW50ZXIucHVzaChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXN5bmMubWFwKGNvdW50ZXIsIGl0ZXJhdG9yLCBjYWxsYmFjayk7XG4gICAgfTtcblxuICAgIGFzeW5jLnRpbWVzU2VyaWVzID0gZnVuY3Rpb24gKGNvdW50LCBpdGVyYXRvciwgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGNvdW50ZXIgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgICAgICAgICBjb3VudGVyLnB1c2goaSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFzeW5jLm1hcFNlcmllcyhjb3VudGVyLCBpdGVyYXRvciwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICBhc3luYy5jb21wb3NlID0gZnVuY3Rpb24gKC8qIGZ1bmN0aW9ucy4uLiAqLykge1xuICAgICAgICB2YXIgZm5zID0gQXJyYXkucHJvdG90eXBlLnJldmVyc2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJncy5wb3AoKTtcbiAgICAgICAgICAgIGFzeW5jLnJlZHVjZShmbnMsIGFyZ3MsIGZ1bmN0aW9uIChuZXdhcmdzLCBmbiwgY2IpIHtcbiAgICAgICAgICAgICAgICBmbi5hcHBseSh0aGF0LCBuZXdhcmdzLmNvbmNhdChbZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXJyID0gYXJndW1lbnRzWzBdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICBjYihlcnIsIG5leHRhcmdzKTtcbiAgICAgICAgICAgICAgICB9XSkpXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKGVyciwgcmVzdWx0cykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KHRoYXQsIFtlcnJdLmNvbmNhdChyZXN1bHRzKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgdmFyIF9hcHBseUVhY2ggPSBmdW5jdGlvbiAoZWFjaGZuLCBmbnMgLyphcmdzLi4uKi8pIHtcbiAgICAgICAgdmFyIGdvID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gYXJncy5wb3AoKTtcbiAgICAgICAgICAgIHJldHVybiBlYWNoZm4oZm5zLCBmdW5jdGlvbiAoZm4sIGNiKSB7XG4gICAgICAgICAgICAgICAgZm4uYXBwbHkodGhhdCwgYXJncy5jb25jYXQoW2NiXSkpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNhbGxiYWNrKTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgICAgICAgICByZXR1cm4gZ28uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZ287XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGFzeW5jLmFwcGx5RWFjaCA9IGRvUGFyYWxsZWwoX2FwcGx5RWFjaCk7XG4gICAgYXN5bmMuYXBwbHlFYWNoU2VyaWVzID0gZG9TZXJpZXMoX2FwcGx5RWFjaCk7XG5cbiAgICBhc3luYy5mb3JldmVyID0gZnVuY3Rpb24gKGZuLCBjYWxsYmFjaykge1xuICAgICAgICBmdW5jdGlvbiBuZXh0KGVycikge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm4obmV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgbmV4dCgpO1xuICAgIH07XG5cbiAgICAvLyBBTUQgLyBSZXF1aXJlSlNcbiAgICBpZiAodHlwZW9mIGRlZmluZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoW10sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBhc3luYztcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vIE5vZGUuanNcbiAgICBlbHNlIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGFzeW5jO1xuICAgIH1cbiAgICAvLyBpbmNsdWRlZCBkaXJlY3RseSB2aWEgPHNjcmlwdD4gdGFnXG4gICAgZWxzZSB7XG4gICAgICAgIHJvb3QuYXN5bmMgPSBhc3luYztcbiAgICB9XG5cbn0oKSk7XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKiogXG4jIyBjb2cvZGVmYXVsdHNcblxuYGBganNcbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJ2NvZy9kZWZhdWx0cycpO1xuYGBgXG5cbiMjIyBkZWZhdWx0cyh0YXJnZXQsICopXG5cblNoYWxsb3cgY29weSBvYmplY3QgcHJvcGVydGllcyBmcm9tIHRoZSBzdXBwbGllZCBzb3VyY2Ugb2JqZWN0cyAoKikgaW50byBcbnRoZSB0YXJnZXQgb2JqZWN0LCByZXR1cm5pbmcgdGhlIHRhcmdldCBvYmplY3Qgb25jZSBjb21wbGV0ZWQuICBEbyBub3QsXG5ob3dldmVyLCBvdmVyd3JpdGUgZXhpc3Rpbmcga2V5cyB3aXRoIG5ldyB2YWx1ZXM6XG5cbmBgYGpzXG5kZWZhdWx0cyh7IGE6IDEsIGI6IDIgfSwgeyBjOiAzIH0sIHsgZDogNCB9LCB7IGI6IDUgfSkpO1xuYGBgXG5cblNlZSBhbiBleGFtcGxlIG9uIFtyZXF1aXJlYmluXShodHRwOi8vcmVxdWlyZWJpbi5jb20vP2dpc3Q9NjA3OTQ3NSkuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGFyZ2V0KSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIGEgdGFyZ2V0XG4gIHRhcmdldCA9IHRhcmdldCB8fCB7fTtcblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHNvdXJjZXMgYW5kIGNvcHkgdG8gdGhlIHRhcmdldFxuICBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkuZm9yRWFjaChmdW5jdGlvbihzb3VyY2UpIHtcbiAgICBpZiAoISBzb3VyY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgaWYgKHRhcmdldFtwcm9wXSA9PT0gdm9pZCAwKSB7XG4gICAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiB0YXJnZXQ7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKiBcbiMjIGNvZy9leHRlbmRcblxuYGBganNcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG5gYGBcblxuIyMjIGV4dGVuZCh0YXJnZXQsICopXG5cblNoYWxsb3cgY29weSBvYmplY3QgcHJvcGVydGllcyBmcm9tIHRoZSBzdXBwbGllZCBzb3VyY2Ugb2JqZWN0cyAoKikgaW50byBcbnRoZSB0YXJnZXQgb2JqZWN0LCByZXR1cm5pbmcgdGhlIHRhcmdldCBvYmplY3Qgb25jZSBjb21wbGV0ZWQ6XG5cbmBgYGpzXG5leHRlbmQoeyBhOiAxLCBiOiAyIH0sIHsgYzogMyB9LCB7IGQ6IDQgfSwgeyBiOiA1IH0pKTtcbmBgYFxuXG5TZWUgYW4gZXhhbXBsZSBvbiBbcmVxdWlyZWJpbl0oaHR0cDovL3JlcXVpcmViaW4uY29tLz9naXN0PTYwNzk0NzUpLlxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkuZm9yRWFjaChmdW5jdGlvbihzb3VyY2UpIHtcbiAgICBpZiAoISBzb3VyY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgdGFyZ2V0W3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHRhcmdldDtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMjIGNvZy9sb2dnZXJcblxuICBgYGBqc1xuICB2YXIgbG9nZ2VyID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpO1xuICBgYGBcblxuICBTaW1wbGUgYnJvd3NlciBsb2dnaW5nIG9mZmVyaW5nIHNpbWlsYXIgZnVuY3Rpb25hbGl0eSB0byB0aGVcbiAgW2RlYnVnXShodHRwczovL2dpdGh1Yi5jb20vdmlzaW9ubWVkaWEvZGVidWcpIG1vZHVsZS4gIFxuXG4gICMjIyBVc2FnZVxuXG4gIENyZWF0ZSB5b3VyIHNlbGYgYSBuZXcgbG9nZ2luZyBpbnN0YW5jZSBhbmQgZ2l2ZSBpdCBhIG5hbWU6XG5cbiAgYGBganNcbiAgdmFyIGRlYnVnID0gbG9nZ2VyKCdwaGlsJyk7XG4gIGBgYFxuXG4gIE5vdyBkbyBzb21lIGRlYnVnZ2luZzpcblxuICBgYGBqc1xuICBkZWJ1ZygnaGVsbG8nKTtcbiAgYGBgXG5cbiAgQXQgdGhpcyBzdGFnZSwgbm8gbG9nIG91dHB1dCB3aWxsIGJlIGdlbmVyYXRlZCBiZWNhdXNlIHlvdXIgbG9nZ2VyIGlzXG4gIGN1cnJlbnRseSBkaXNhYmxlZC4gIEVuYWJsZSBpdDpcblxuICBgYGBqc1xuICBsb2dnZXIuZW5hYmxlKCdwaGlsJyk7XG4gIGBgYFxuXG4gIE5vdyBkbyBzb21lIG1vcmUgbG9nZ2VyOlxuXG4gIGBgYGpzXG4gIGRlYnVnKCdPaCB0aGlzIGlzIHNvIG11Y2ggbmljZXIgOiknKTtcbiAgLy8gLS0+IHBoaWw6IE9oIHRoaXMgaXMgc29tZSBtdWNoIG5pY2VyIDopXG4gIGBgYFxuXG4gICMjIyBSZWZlcmVuY2VcbioqL1xuXG52YXIgYWN0aXZlID0gW107XG52YXIgdW5sZWFzaExpc3RlbmVycyA9IFtdO1xudmFyIHRhcmdldHMgPSBbIGNvbnNvbGUgXTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyKG5hbWUpXG5cbiAgQ3JlYXRlIGEgbmV3IGxvZ2dpbmcgaW5zdGFuY2UuXG4qKi9cbnZhciBsb2dnZXIgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgLy8gaW5pdGlhbCBlbmFibGVkIGNoZWNrXG4gIHZhciBlbmFibGVkID0gY2hlY2tBY3RpdmUoKTtcblxuICBmdW5jdGlvbiBjaGVja0FjdGl2ZSgpIHtcbiAgICByZXR1cm4gZW5hYmxlZCA9IGFjdGl2ZS5pbmRleE9mKCcqJykgPj0gMCB8fCBhY3RpdmUuaW5kZXhPZihuYW1lKSA+PSAwO1xuICB9XG5cbiAgLy8gcmVnaXN0ZXIgdGhlIGNoZWNrIGFjdGl2ZSB3aXRoIHRoZSBsaXN0ZW5lcnMgYXJyYXlcbiAgdW5sZWFzaExpc3RlbmVyc1t1bmxlYXNoTGlzdGVuZXJzLmxlbmd0aF0gPSBjaGVja0FjdGl2ZTtcblxuICAvLyByZXR1cm4gdGhlIGFjdHVhbCBsb2dnaW5nIGZ1bmN0aW9uXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYSBzdHJpbmcgbWVzc2FnZVxuICAgIGlmICh0eXBlb2YgYXJnc1swXSA9PSAnc3RyaW5nJyB8fCAoYXJnc1swXSBpbnN0YW5jZW9mIFN0cmluZykpIHtcbiAgICAgIGFyZ3NbMF0gPSBuYW1lICsgJzogJyArIGFyZ3NbMF07XG4gICAgfVxuXG4gICAgLy8gaWYgbm90IGVuYWJsZWQsIGJhaWxcbiAgICBpZiAoISBlbmFibGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gbG9nXG4gICAgdGFyZ2V0cy5mb3JFYWNoKGZ1bmN0aW9uKHRhcmdldCkge1xuICAgICAgdGFyZ2V0LmxvZy5hcHBseSh0YXJnZXQsIGFyZ3MpO1xuICAgIH0pO1xuICB9O1xufTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyLnJlc2V0KClcblxuICBSZXNldCBsb2dnaW5nIChyZW1vdmUgdGhlIGRlZmF1bHQgY29uc29sZSBsb2dnZXIsIGZsYWcgYWxsIGxvZ2dlcnMgYXMgXG4gIGluYWN0aXZlLCBldGMsIGV0Yy5cbioqL1xubG9nZ2VyLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gIC8vIHJlc2V0IHRhcmdldHMgYW5kIGFjdGl2ZSBzdGF0ZXNcbiAgdGFyZ2V0cyA9IFtdO1xuICBhY3RpdmUgPSBbXTtcblxuICByZXR1cm4gbG9nZ2VyLmVuYWJsZSgpO1xufTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyLnRvKHRhcmdldClcblxuICBBZGQgYSBsb2dnaW5nIHRhcmdldC4gIFRoZSBsb2dnZXIgbXVzdCBoYXZlIGEgYGxvZ2AgbWV0aG9kIGF0dGFjaGVkLlxuXG4qKi9cbmxvZ2dlci50byA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICB0YXJnZXRzID0gdGFyZ2V0cy5jb25jYXQodGFyZ2V0IHx8IFtdKTtcblxuICByZXR1cm4gbG9nZ2VyO1xufTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyLmVuYWJsZShuYW1lcyopXG5cbiAgRW5hYmxlIGxvZ2dpbmcgdmlhIHRoZSBuYW1lZCBsb2dnaW5nIGluc3RhbmNlcy4gIFRvIGVuYWJsZSBsb2dnaW5nIHZpYSBhbGxcbiAgaW5zdGFuY2VzLCB5b3UgY2FuIHBhc3MgYSB3aWxkY2FyZDpcblxuICBgYGBqc1xuICBsb2dnZXIuZW5hYmxlKCcqJyk7XG4gIGBgYFxuXG4gIF9fVE9ETzpfXyB3aWxkY2FyZCBlbmFibGVyc1xuKiovXG5sb2dnZXIuZW5hYmxlID0gZnVuY3Rpb24oKSB7XG4gIC8vIHVwZGF0ZSB0aGUgYWN0aXZlXG4gIGFjdGl2ZSA9IGFjdGl2ZS5jb25jYXQoW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcblxuICAvLyB0cmlnZ2VyIHRoZSB1bmxlYXNoIGxpc3RlbmVyc1xuICB1bmxlYXNoTGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24obGlzdGVuZXIpIHtcbiAgICBsaXN0ZW5lcigpO1xuICB9KTtcblxuICByZXR1cm4gbG9nZ2VyO1xufTsiLCIvLyBDb3B5cmlnaHQgKGMpIDIwMTMgQWRvYmUgU3lzdGVtcyBJbmNvcnBvcmF0ZWQuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4vLyBcbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vIFxuLy8gaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vLyBcbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbi8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4vLyDilIzilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilJAgXFxcXFxuLy8g4pSCIEV2ZSAwLjQuMiAtIEphdmFTY3JpcHQgRXZlbnRzIExpYnJhcnkgICAgICAgICAgICAgICAgICAgICAg4pSCIFxcXFxcbi8vIOKUnOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUpCBcXFxcXG4vLyDilIIgQXV0aG9yIERtaXRyeSBCYXJhbm92c2tpeSAoaHR0cDovL2RtaXRyeS5iYXJhbm92c2tpeS5jb20vKSDilIIgXFxcXFxuLy8g4pSU4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSYIFxcXFxcblxuKGZ1bmN0aW9uIChnbG9iKSB7XG4gICAgdmFyIHZlcnNpb24gPSBcIjAuNC4yXCIsXG4gICAgICAgIGhhcyA9IFwiaGFzT3duUHJvcGVydHlcIixcbiAgICAgICAgc2VwYXJhdG9yID0gL1tcXC5cXC9dLyxcbiAgICAgICAgd2lsZGNhcmQgPSBcIipcIixcbiAgICAgICAgZnVuID0gZnVuY3Rpb24gKCkge30sXG4gICAgICAgIG51bXNvcnQgPSBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgcmV0dXJuIGEgLSBiO1xuICAgICAgICB9LFxuICAgICAgICBjdXJyZW50X2V2ZW50LFxuICAgICAgICBzdG9wLFxuICAgICAgICBldmVudHMgPSB7bjoge319LFxuICAgIC8qXFxcbiAgICAgKiBldmVcbiAgICAgWyBtZXRob2QgXVxuXG4gICAgICogRmlyZXMgZXZlbnQgd2l0aCBnaXZlbiBgbmFtZWAsIGdpdmVuIHNjb3BlIGFuZCBvdGhlciBwYXJhbWV0ZXJzLlxuXG4gICAgID4gQXJndW1lbnRzXG5cbiAgICAgLSBuYW1lIChzdHJpbmcpIG5hbWUgb2YgdGhlICpldmVudCosIGRvdCAoYC5gKSBvciBzbGFzaCAoYC9gKSBzZXBhcmF0ZWRcbiAgICAgLSBzY29wZSAob2JqZWN0KSBjb250ZXh0IGZvciB0aGUgZXZlbnQgaGFuZGxlcnNcbiAgICAgLSB2YXJhcmdzICguLi4pIHRoZSByZXN0IG9mIGFyZ3VtZW50cyB3aWxsIGJlIHNlbnQgdG8gZXZlbnQgaGFuZGxlcnNcblxuICAgICA9IChvYmplY3QpIGFycmF5IG9mIHJldHVybmVkIHZhbHVlcyBmcm9tIHRoZSBsaXN0ZW5lcnNcbiAgICBcXCovXG4gICAgICAgIGV2ZSA9IGZ1bmN0aW9uIChuYW1lLCBzY29wZSkge1xuXHRcdFx0bmFtZSA9IFN0cmluZyhuYW1lKTtcbiAgICAgICAgICAgIHZhciBlID0gZXZlbnRzLFxuICAgICAgICAgICAgICAgIG9sZHN0b3AgPSBzdG9wLFxuICAgICAgICAgICAgICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpLFxuICAgICAgICAgICAgICAgIGxpc3RlbmVycyA9IGV2ZS5saXN0ZW5lcnMobmFtZSksXG4gICAgICAgICAgICAgICAgeiA9IDAsXG4gICAgICAgICAgICAgICAgZiA9IGZhbHNlLFxuICAgICAgICAgICAgICAgIGwsXG4gICAgICAgICAgICAgICAgaW5kZXhlZCA9IFtdLFxuICAgICAgICAgICAgICAgIHF1ZXVlID0ge30sXG4gICAgICAgICAgICAgICAgb3V0ID0gW10sXG4gICAgICAgICAgICAgICAgY2UgPSBjdXJyZW50X2V2ZW50LFxuICAgICAgICAgICAgICAgIGVycm9ycyA9IFtdO1xuICAgICAgICAgICAgY3VycmVudF9ldmVudCA9IG5hbWU7XG4gICAgICAgICAgICBzdG9wID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IGxpc3RlbmVycy5sZW5ndGg7IGkgPCBpaTsgaSsrKSBpZiAoXCJ6SW5kZXhcIiBpbiBsaXN0ZW5lcnNbaV0pIHtcbiAgICAgICAgICAgICAgICBpbmRleGVkLnB1c2gobGlzdGVuZXJzW2ldLnpJbmRleCk7XG4gICAgICAgICAgICAgICAgaWYgKGxpc3RlbmVyc1tpXS56SW5kZXggPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHF1ZXVlW2xpc3RlbmVyc1tpXS56SW5kZXhdID0gbGlzdGVuZXJzW2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGluZGV4ZWQuc29ydChudW1zb3J0KTtcbiAgICAgICAgICAgIHdoaWxlIChpbmRleGVkW3pdIDwgMCkge1xuICAgICAgICAgICAgICAgIGwgPSBxdWV1ZVtpbmRleGVkW3orK11dO1xuICAgICAgICAgICAgICAgIG91dC5wdXNoKGwuYXBwbHkoc2NvcGUsIGFyZ3MpKTtcbiAgICAgICAgICAgICAgICBpZiAoc3RvcCkge1xuICAgICAgICAgICAgICAgICAgICBzdG9wID0gb2xkc3RvcDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgIGwgPSBsaXN0ZW5lcnNbaV07XG4gICAgICAgICAgICAgICAgaWYgKFwiekluZGV4XCIgaW4gbCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobC56SW5kZXggPT0gaW5kZXhlZFt6XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2gobC5hcHBseShzY29wZSwgYXJncykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0b3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB6Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbCA9IHF1ZXVlW2luZGV4ZWRbel1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGwgJiYgb3V0LnB1c2gobC5hcHBseShzY29wZSwgYXJncykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdG9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gd2hpbGUgKGwpXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWV1ZVtsLnpJbmRleF0gPSBsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2gobC5hcHBseShzY29wZSwgYXJncykpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdG9wID0gb2xkc3RvcDtcbiAgICAgICAgICAgIGN1cnJlbnRfZXZlbnQgPSBjZTtcbiAgICAgICAgICAgIHJldHVybiBvdXQubGVuZ3RoID8gb3V0IDogbnVsbDtcbiAgICAgICAgfTtcblx0XHQvLyBVbmRvY3VtZW50ZWQuIERlYnVnIG9ubHkuXG5cdFx0ZXZlLl9ldmVudHMgPSBldmVudHM7XG4gICAgLypcXFxuICAgICAqIGV2ZS5saXN0ZW5lcnNcbiAgICAgWyBtZXRob2QgXVxuXG4gICAgICogSW50ZXJuYWwgbWV0aG9kIHdoaWNoIGdpdmVzIHlvdSBhcnJheSBvZiBhbGwgZXZlbnQgaGFuZGxlcnMgdGhhdCB3aWxsIGJlIHRyaWdnZXJlZCBieSB0aGUgZ2l2ZW4gYG5hbWVgLlxuXG4gICAgID4gQXJndW1lbnRzXG5cbiAgICAgLSBuYW1lIChzdHJpbmcpIG5hbWUgb2YgdGhlIGV2ZW50LCBkb3QgKGAuYCkgb3Igc2xhc2ggKGAvYCkgc2VwYXJhdGVkXG5cbiAgICAgPSAoYXJyYXkpIGFycmF5IG9mIGV2ZW50IGhhbmRsZXJzXG4gICAgXFwqL1xuICAgIGV2ZS5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KHNlcGFyYXRvciksXG4gICAgICAgICAgICBlID0gZXZlbnRzLFxuICAgICAgICAgICAgaXRlbSxcbiAgICAgICAgICAgIGl0ZW1zLFxuICAgICAgICAgICAgayxcbiAgICAgICAgICAgIGksXG4gICAgICAgICAgICBpaSxcbiAgICAgICAgICAgIGosXG4gICAgICAgICAgICBqaixcbiAgICAgICAgICAgIG5lcyxcbiAgICAgICAgICAgIGVzID0gW2VdLFxuICAgICAgICAgICAgb3V0ID0gW107XG4gICAgICAgIGZvciAoaSA9IDAsIGlpID0gbmFtZXMubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgbmVzID0gW107XG4gICAgICAgICAgICBmb3IgKGogPSAwLCBqaiA9IGVzLmxlbmd0aDsgaiA8IGpqOyBqKyspIHtcbiAgICAgICAgICAgICAgICBlID0gZXNbal0ubjtcbiAgICAgICAgICAgICAgICBpdGVtcyA9IFtlW25hbWVzW2ldXSwgZVt3aWxkY2FyZF1dO1xuICAgICAgICAgICAgICAgIGsgPSAyO1xuICAgICAgICAgICAgICAgIHdoaWxlIChrLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbSA9IGl0ZW1zW2tdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmVzLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQgPSBvdXQuY29uY2F0KGl0ZW0uZiB8fCBbXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlcyA9IG5lcztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH07XG4gICAgXG4gICAgLypcXFxuICAgICAqIGV2ZS5vblxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogQmluZHMgZ2l2ZW4gZXZlbnQgaGFuZGxlciB3aXRoIGEgZ2l2ZW4gbmFtZS4gWW91IGNhbiB1c2Ugd2lsZGNhcmRzIOKAnGAqYOKAnSBmb3IgdGhlIG5hbWVzOlxuICAgICB8IGV2ZS5vbihcIioudW5kZXIuKlwiLCBmKTtcbiAgICAgfCBldmUoXCJtb3VzZS51bmRlci5mbG9vclwiKTsgLy8gdHJpZ2dlcnMgZlxuICAgICAqIFVzZSBAZXZlIHRvIHRyaWdnZXIgdGhlIGxpc3RlbmVyLlxuICAgICAqKlxuICAgICA+IEFyZ3VtZW50c1xuICAgICAqKlxuICAgICAtIG5hbWUgKHN0cmluZykgbmFtZSBvZiB0aGUgZXZlbnQsIGRvdCAoYC5gKSBvciBzbGFzaCAoYC9gKSBzZXBhcmF0ZWQsIHdpdGggb3B0aW9uYWwgd2lsZGNhcmRzXG4gICAgIC0gZiAoZnVuY3Rpb24pIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb25cbiAgICAgKipcbiAgICAgPSAoZnVuY3Rpb24pIHJldHVybmVkIGZ1bmN0aW9uIGFjY2VwdHMgYSBzaW5nbGUgbnVtZXJpYyBwYXJhbWV0ZXIgdGhhdCByZXByZXNlbnRzIHotaW5kZXggb2YgdGhlIGhhbmRsZXIuIEl0IGlzIGFuIG9wdGlvbmFsIGZlYXR1cmUgYW5kIG9ubHkgdXNlZCB3aGVuIHlvdSBuZWVkIHRvIGVuc3VyZSB0aGF0IHNvbWUgc3Vic2V0IG9mIGhhbmRsZXJzIHdpbGwgYmUgaW52b2tlZCBpbiBhIGdpdmVuIG9yZGVyLCBkZXNwaXRlIG9mIHRoZSBvcmRlciBvZiBhc3NpZ25tZW50LiBcbiAgICAgPiBFeGFtcGxlOlxuICAgICB8IGV2ZS5vbihcIm1vdXNlXCIsIGVhdEl0KSgyKTtcbiAgICAgfCBldmUub24oXCJtb3VzZVwiLCBzY3JlYW0pO1xuICAgICB8IGV2ZS5vbihcIm1vdXNlXCIsIGNhdGNoSXQpKDEpO1xuICAgICAqIFRoaXMgd2lsbCBlbnN1cmUgdGhhdCBgY2F0Y2hJdCgpYCBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCBiZWZvcmUgYGVhdEl0KClgLlxuXHQgKlxuICAgICAqIElmIHlvdSB3YW50IHRvIHB1dCB5b3VyIGhhbmRsZXIgYmVmb3JlIG5vbi1pbmRleGVkIGhhbmRsZXJzLCBzcGVjaWZ5IGEgbmVnYXRpdmUgdmFsdWUuXG4gICAgICogTm90ZTogSSBhc3N1bWUgbW9zdCBvZiB0aGUgdGltZSB5b3UgZG9u4oCZdCBuZWVkIHRvIHdvcnJ5IGFib3V0IHotaW5kZXgsIGJ1dCBpdOKAmXMgbmljZSB0byBoYXZlIHRoaXMgZmVhdHVyZSDigJxqdXN0IGluIGNhc2XigJ0uXG4gICAgXFwqL1xuICAgIGV2ZS5vbiA9IGZ1bmN0aW9uIChuYW1lLCBmKSB7XG5cdFx0bmFtZSA9IFN0cmluZyhuYW1lKTtcblx0XHRpZiAodHlwZW9mIGYgIT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge307XG5cdFx0fVxuICAgICAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KHNlcGFyYXRvciksXG4gICAgICAgICAgICBlID0gZXZlbnRzO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBuYW1lcy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICBlID0gZS5uO1xuICAgICAgICAgICAgZSA9IGUuaGFzT3duUHJvcGVydHkobmFtZXNbaV0pICYmIGVbbmFtZXNbaV1dIHx8IChlW25hbWVzW2ldXSA9IHtuOiB7fX0pO1xuICAgICAgICB9XG4gICAgICAgIGUuZiA9IGUuZiB8fCBbXTtcbiAgICAgICAgZm9yIChpID0gMCwgaWkgPSBlLmYubGVuZ3RoOyBpIDwgaWk7IGkrKykgaWYgKGUuZltpXSA9PSBmKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuO1xuICAgICAgICB9XG4gICAgICAgIGUuZi5wdXNoKGYpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHpJbmRleCkge1xuICAgICAgICAgICAgaWYgKCt6SW5kZXggPT0gK3pJbmRleCkge1xuICAgICAgICAgICAgICAgIGYuekluZGV4ID0gK3pJbmRleDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBldmUuZlxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogUmV0dXJucyBmdW5jdGlvbiB0aGF0IHdpbGwgZmlyZSBnaXZlbiBldmVudCB3aXRoIG9wdGlvbmFsIGFyZ3VtZW50cy5cblx0ICogQXJndW1lbnRzIHRoYXQgd2lsbCBiZSBwYXNzZWQgdG8gdGhlIHJlc3VsdCBmdW5jdGlvbiB3aWxsIGJlIGFsc29cblx0ICogY29uY2F0ZWQgdG8gdGhlIGxpc3Qgb2YgZmluYWwgYXJndW1lbnRzLlxuIFx0IHwgZWwub25jbGljayA9IGV2ZS5mKFwiY2xpY2tcIiwgMSwgMik7XG4gXHQgfCBldmUub24oXCJjbGlja1wiLCBmdW5jdGlvbiAoYSwgYiwgYykge1xuIFx0IHwgICAgIGNvbnNvbGUubG9nKGEsIGIsIGMpOyAvLyAxLCAyLCBbZXZlbnQgb2JqZWN0XVxuIFx0IHwgfSk7XG4gICAgID4gQXJndW1lbnRzXG5cdCAtIGV2ZW50IChzdHJpbmcpIGV2ZW50IG5hbWVcblx0IC0gdmFyYXJncyAo4oCmKSBhbmQgYW55IG90aGVyIGFyZ3VtZW50c1xuXHQgPSAoZnVuY3Rpb24pIHBvc3NpYmxlIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb25cbiAgICBcXCovXG5cdGV2ZS5mID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0dmFyIGF0dHJzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXHRcdHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRldmUuYXBwbHkobnVsbCwgW2V2ZW50LCBudWxsXS5jb25jYXQoYXR0cnMpLmNvbmNhdChbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpKTtcblx0XHR9O1xuXHR9O1xuICAgIC8qXFxcbiAgICAgKiBldmUuc3RvcFxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogSXMgdXNlZCBpbnNpZGUgYW4gZXZlbnQgaGFuZGxlciB0byBzdG9wIHRoZSBldmVudCwgcHJldmVudGluZyBhbnkgc3Vic2VxdWVudCBsaXN0ZW5lcnMgZnJvbSBmaXJpbmcuXG4gICAgXFwqL1xuICAgIGV2ZS5zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBzdG9wID0gMTtcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBldmUubnRcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIENvdWxkIGJlIHVzZWQgaW5zaWRlIGV2ZW50IGhhbmRsZXIgdG8gZmlndXJlIG91dCBhY3R1YWwgbmFtZSBvZiB0aGUgZXZlbnQuXG4gICAgICoqXG4gICAgID4gQXJndW1lbnRzXG4gICAgICoqXG4gICAgIC0gc3VibmFtZSAoc3RyaW5nKSAjb3B0aW9uYWwgc3VibmFtZSBvZiB0aGUgZXZlbnRcbiAgICAgKipcbiAgICAgPSAoc3RyaW5nKSBuYW1lIG9mIHRoZSBldmVudCwgaWYgYHN1Ym5hbWVgIGlzIG5vdCBzcGVjaWZpZWRcbiAgICAgKiBvclxuICAgICA9IChib29sZWFuKSBgdHJ1ZWAsIGlmIGN1cnJlbnQgZXZlbnTigJlzIG5hbWUgY29udGFpbnMgYHN1Ym5hbWVgXG4gICAgXFwqL1xuICAgIGV2ZS5udCA9IGZ1bmN0aW9uIChzdWJuYW1lKSB7XG4gICAgICAgIGlmIChzdWJuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFJlZ0V4cChcIig/OlxcXFwufFxcXFwvfF4pXCIgKyBzdWJuYW1lICsgXCIoPzpcXFxcLnxcXFxcL3wkKVwiKS50ZXN0KGN1cnJlbnRfZXZlbnQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJyZW50X2V2ZW50O1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIGV2ZS5udHNcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIENvdWxkIGJlIHVzZWQgaW5zaWRlIGV2ZW50IGhhbmRsZXIgdG8gZmlndXJlIG91dCBhY3R1YWwgbmFtZSBvZiB0aGUgZXZlbnQuXG4gICAgICoqXG4gICAgICoqXG4gICAgID0gKGFycmF5KSBuYW1lcyBvZiB0aGUgZXZlbnRcbiAgICBcXCovXG4gICAgZXZlLm50cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGN1cnJlbnRfZXZlbnQuc3BsaXQoc2VwYXJhdG9yKTtcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBldmUub2ZmXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSZW1vdmVzIGdpdmVuIGZ1bmN0aW9uIGZyb20gdGhlIGxpc3Qgb2YgZXZlbnQgbGlzdGVuZXJzIGFzc2lnbmVkIHRvIGdpdmVuIG5hbWUuXG5cdCAqIElmIG5vIGFyZ3VtZW50cyBzcGVjaWZpZWQgYWxsIHRoZSBldmVudHMgd2lsbCBiZSBjbGVhcmVkLlxuICAgICAqKlxuICAgICA+IEFyZ3VtZW50c1xuICAgICAqKlxuICAgICAtIG5hbWUgKHN0cmluZykgbmFtZSBvZiB0aGUgZXZlbnQsIGRvdCAoYC5gKSBvciBzbGFzaCAoYC9gKSBzZXBhcmF0ZWQsIHdpdGggb3B0aW9uYWwgd2lsZGNhcmRzXG4gICAgIC0gZiAoZnVuY3Rpb24pIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb25cbiAgICBcXCovXG4gICAgLypcXFxuICAgICAqIGV2ZS51bmJpbmRcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFNlZSBAZXZlLm9mZlxuICAgIFxcKi9cbiAgICBldmUub2ZmID0gZXZlLnVuYmluZCA9IGZ1bmN0aW9uIChuYW1lLCBmKSB7XG5cdFx0aWYgKCFuYW1lKSB7XG5cdFx0ICAgIGV2ZS5fZXZlbnRzID0gZXZlbnRzID0ge246IHt9fTtcblx0XHRcdHJldHVybjtcblx0XHR9XG4gICAgICAgIHZhciBuYW1lcyA9IG5hbWUuc3BsaXQoc2VwYXJhdG9yKSxcbiAgICAgICAgICAgIGUsXG4gICAgICAgICAgICBrZXksXG4gICAgICAgICAgICBzcGxpY2UsXG4gICAgICAgICAgICBpLCBpaSwgaiwgamosXG4gICAgICAgICAgICBjdXIgPSBbZXZlbnRzXTtcbiAgICAgICAgZm9yIChpID0gMCwgaWkgPSBuYW1lcy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgY3VyLmxlbmd0aDsgaiArPSBzcGxpY2UubGVuZ3RoIC0gMikge1xuICAgICAgICAgICAgICAgIHNwbGljZSA9IFtqLCAxXTtcbiAgICAgICAgICAgICAgICBlID0gY3VyW2pdLm47XG4gICAgICAgICAgICAgICAgaWYgKG5hbWVzW2ldICE9IHdpbGRjYXJkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlW25hbWVzW2ldXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3BsaWNlLnB1c2goZVtuYW1lc1tpXV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChrZXkgaW4gZSkgaWYgKGVbaGFzXShrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzcGxpY2UucHVzaChlW2tleV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1ci5zcGxpY2UuYXBwbHkoY3VyLCBzcGxpY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIGlpID0gY3VyLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgIGUgPSBjdXJbaV07XG4gICAgICAgICAgICB3aGlsZSAoZS5uKSB7XG4gICAgICAgICAgICAgICAgaWYgKGYpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUuZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChqID0gMCwgamogPSBlLmYubGVuZ3RoOyBqIDwgamo7IGorKykgaWYgKGUuZltqXSA9PSBmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5mLnNwbGljZShqLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICFlLmYubGVuZ3RoICYmIGRlbGV0ZSBlLmY7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZm9yIChrZXkgaW4gZS5uKSBpZiAoZS5uW2hhc10oa2V5KSAmJiBlLm5ba2V5XS5mKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZnVuY3MgPSBlLm5ba2V5XS5mO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChqID0gMCwgamogPSBmdW5jcy5sZW5ndGg7IGogPCBqajsgaisrKSBpZiAoZnVuY3Nbal0gPT0gZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmNzLnNwbGljZShqLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICFmdW5jcy5sZW5ndGggJiYgZGVsZXRlIGUubltrZXldLmY7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgZS5mO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGtleSBpbiBlLm4pIGlmIChlLm5baGFzXShrZXkpICYmIGUubltrZXldLmYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBlLm5ba2V5XS5mO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGUgPSBlLm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBldmUub25jZVxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogQmluZHMgZ2l2ZW4gZXZlbnQgaGFuZGxlciB3aXRoIGEgZ2l2ZW4gbmFtZSB0byBvbmx5IHJ1biBvbmNlIHRoZW4gdW5iaW5kIGl0c2VsZi5cbiAgICAgfCBldmUub25jZShcImxvZ2luXCIsIGYpO1xuICAgICB8IGV2ZShcImxvZ2luXCIpOyAvLyB0cmlnZ2VycyBmXG4gICAgIHwgZXZlKFwibG9naW5cIik7IC8vIG5vIGxpc3RlbmVyc1xuICAgICAqIFVzZSBAZXZlIHRvIHRyaWdnZXIgdGhlIGxpc3RlbmVyLlxuICAgICAqKlxuICAgICA+IEFyZ3VtZW50c1xuICAgICAqKlxuICAgICAtIG5hbWUgKHN0cmluZykgbmFtZSBvZiB0aGUgZXZlbnQsIGRvdCAoYC5gKSBvciBzbGFzaCAoYC9gKSBzZXBhcmF0ZWQsIHdpdGggb3B0aW9uYWwgd2lsZGNhcmRzXG4gICAgIC0gZiAoZnVuY3Rpb24pIGV2ZW50IGhhbmRsZXIgZnVuY3Rpb25cbiAgICAgKipcbiAgICAgPSAoZnVuY3Rpb24pIHNhbWUgcmV0dXJuIGZ1bmN0aW9uIGFzIEBldmUub25cbiAgICBcXCovXG4gICAgZXZlLm9uY2UgPSBmdW5jdGlvbiAobmFtZSwgZikge1xuICAgICAgICB2YXIgZjIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBldmUudW5iaW5kKG5hbWUsIGYyKTtcbiAgICAgICAgICAgIHJldHVybiBmLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBldmUub24obmFtZSwgZjIpO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIGV2ZS52ZXJzaW9uXG4gICAgIFsgcHJvcGVydHkgKHN0cmluZykgXVxuICAgICAqKlxuICAgICAqIEN1cnJlbnQgdmVyc2lvbiBvZiB0aGUgbGlicmFyeS5cbiAgICBcXCovXG4gICAgZXZlLnZlcnNpb24gPSB2ZXJzaW9uO1xuICAgIGV2ZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIFwiWW91IGFyZSBydW5uaW5nIEV2ZSBcIiArIHZlcnNpb247XG4gICAgfTtcbiAgICAodHlwZW9mIG1vZHVsZSAhPSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZS5leHBvcnRzKSA/IChtb2R1bGUuZXhwb3J0cyA9IGV2ZSkgOiAodHlwZW9mIGRlZmluZSAhPSBcInVuZGVmaW5lZFwiID8gKGRlZmluZShcImV2ZVwiLCBbXSwgZnVuY3Rpb24oKSB7IHJldHVybiBldmU7IH0pKSA6IChnbG9iLmV2ZSA9IGV2ZSkpO1xufSkodGhpcyk7XG4iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcXNhID0gcmVxdWlyZSgnLi9xc2EnKTtcbnZhciByZUJvb2wgPSAvXih0cnVlfGZhbHNlKSQvaVxuXG4vKipcbiAgIyMjIG1ldGEocmVnZXg/KVxuXG4gIEZpbmQgYWxsIHRoZSBgPG1ldGE+YCB0YWdzIHRoYXQgaGF2ZSBhIG5hbWUgYXR0cmlidXRlIGFuZCBjb2xsYXRlIGFzIGFcbiAgc2ltcGxlIEpTIG9iamVjdHMgd2hldGhlciB0aGUgY29udGVudCBvZiB0aGUgdGFnIGlzIHRoZSB2YWx1ZS5cblxuICA8PDwgZXhhbXBsZXMvbWV0YS5qc1xuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocmVnZXgpIHtcbiAgdmFyIGRhdGEgPSB7fTtcblxuICAvLyBmaW5kIGFsbCB0aGUgbWV0YSB0YWdzIHdpdGggYSBuYW1lIGFuZCBleHRyYWN0IHRoZSBjb250ZW50XG4gIHFzYSgnbWV0YVtuYW1lXScpLmZvckVhY2goZnVuY3Rpb24odGFnKSB7XG4gICAgdmFyIG5hbWUgPSB0YWcuZ2V0QXR0cmlidXRlKCduYW1lJyk7XG4gICAgdmFyIG1hdGNoID0gcmVnZXggPyByZWdleC5leGVjKG5hbWUpIDogW25hbWUsIG5hbWVdO1xuXG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBkYXRhW21hdGNoWzFdIHx8IG1hdGNoWzBdXSA9IGNvZXJjZSh0YWcuZ2V0QXR0cmlidXRlKCdjb250ZW50JykgfHwgJycpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGRhdGE7XG59O1xuXG5mdW5jdGlvbiBjb2VyY2UodmFsdWUpIHtcbiAgdmFsdWUgPSBwYXJzZUZsb2F0KHZhbHVlKSB8fCB2YWx1ZTtcblxuICBpZiAocmVCb29sLnRlc3QodmFsdWUpKSB7XG4gICAgdmFsdWUgPSB2YWx1ZSA9PSAndHJ1ZSc7XG4gIH1cblxuICByZXR1cm4gdmFsdWU7XG59IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMjIyBvblxuXG4gIGBgYFxuICBmKG5hbWUsID0+IGVsLCA9PiBjYilcbiAgYGBgXG5cbiAgVGhlIGBvbmAgaGVscGVyIGFzc2lzdHMgd2l0aCB3b3JraW5nIHdpdGggRE9NIGV2ZW50cyBhbmQgYmVpbmcgYWJsZSB0byBtYXBcbiAgdGhvc2UgdG8gYSBub2RlIGNhbGxiYWNrIHN0eWxlIGZ1bmN0aW9uIGluIHRoZSBmb3JtOlxuXG4gIGBgYGpzXG4gIGZ1bmN0aW9uKGVyciwgZXZ0KSB7XG4gIH1cbiAgYGBgXG5cbiAgV2hlbiB0aGUgZXZlbnQgaXMgdHJpZ2dlcmVkIGJ5IHRoZSBgZWxgIHRoZSBjYWxsYmFjayBpcyBmaXJlZCBwYXNzaW5nXG4gIGEgbnVsbCB2YWx1ZSB0byB0aGUgYGVycmAgYXJndW1lbnQuXG5cbiAgPDw8IGV4YW1wbGVzL29uLmpzXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obmFtZSwgZWwsIGNhbGxiYWNrKSB7XG4gIGZ1bmN0aW9uIGJpbmQodCwgdHJpZ2dlcikge1xuICAgIHZhciBidWZmZXJlZCA9IFtdO1xuXG4gICAgZnVuY3Rpb24gaGFuZGxlRXZlbnQoZXZ0KSB7XG4gICAgICBpZiAodHlwZW9mIHRyaWdnZXIgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gdHJpZ2dlcihudWxsLCBldnQpO1xuICAgICAgfVxuXG4gICAgICAvLyBvdGhlcndpc2UsIGJ1ZmZlciB0aGUgZXZlbnRcbiAgICAgIGJ1ZmZlcmVkW2J1ZmZlcmVkLmxlbmd0aF0gPSBldnQ7XG4gICAgfVxuXG4gICAgLy8gbGlzdGVuIGZvciBldmVudHNcbiAgICB0LmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgaGFuZGxlRXZlbnQpO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSBiZWVuIHByb3ZpZGVkIGEgdHJpZ2dlciBmdW5jdGlvbiAobm90IGFuIGFycmF5IGluZGV4KVxuICAgIC8vIHRoZW4gcmV0dXJuIHRoZSBoYW5kbGUgZXZlbnQgY2FsbFxuICAgIHJldHVybiB0eXBlb2YgdHJpZ2dlciA9PSAnZnVuY3Rpb24nID8gaGFuZGxlRXZlbnQgOiBmdW5jdGlvbihjYikge1xuICAgICAgdHJpZ2dlciA9IGNiO1xuXG4gICAgICAvLyBpZiB3ZSBoYXZlIGEgYnVmZmVyZWQgcmVzdWx0cywgdHJpZ2dlciB0aG9zZSBub3dcbiAgICAgIGlmIChidWZmZXJlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgIGJ1ZmZlcmVkLnNwbGljZSgwKS5mb3JFYWNoKGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICAgIGNiKG51bGwsIGV2dCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICByZXR1cm4gZWwgPyBiaW5kKGVsLCBjYWxsYmFjaykgOiBiaW5kO1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIGRvY3VtZW50OiBmYWxzZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2xhc3NTZWxlY3RvclJFID0gL15cXC4oW1xcd1xcLV0rKSQvO1xudmFyIGlkU2VsZWN0b3JSRSA9IC9eIyhbXFx3XFwtXSspJC87XG52YXIgdGFnU2VsZWN0b3JSRSA9IC9eW1xcd1xcLV0rJC87XG5cbi8qKlxuICAjIyMgcXNhKHNlbGVjdG9yLCBzY29wZT8pXG5cbiAgVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIGdldCB0aGUgcmVzdWx0cyBvZiB0aGUgcXVlcnlTZWxlY3RvckFsbCBvdXRwdXRcbiAgaW4gdGhlIGZhc3Rlc3QgcG9zc2libGUgd2F5LiAgVGhpcyBjb2RlIGlzIHZlcnkgbXVjaCBiYXNlZCBvbiB0aGVcbiAgaW1wbGVtZW50YXRpb24gaW5cbiAgW3plcHRvXShodHRwczovL2dpdGh1Yi5jb20vbWFkcm9iYnkvemVwdG8vYmxvYi9tYXN0ZXIvc3JjL3plcHRvLmpzI0wxMDQpLFxuICBidXQgcGVyaGFwcyBub3QgcXVpdGUgYXMgdGVyc2UuXG5cbiAgPDw8IGV4YW1wbGVzL3FzYS5qc1xuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2VsZWN0b3IsIHNjb3BlKSB7XG4gIHZhciBpZFNlYXJjaDtcblxuICAvLyBkZWZhdWx0IHRoZSBlbGVtZW50IHRvIHRoZSBkb2N1bWVudFxuICBzY29wZSA9IHNjb3BlIHx8IGRvY3VtZW50O1xuXG4gIC8vIGRldGVybWluZSB3aGV0aGVyIHdlIGFyZSBkb2luZyBhbiBpZCBzZWFyY2ggb3Igbm90XG4gIGlkU2VhcmNoID0gc2NvcGUgPT09IGRvY3VtZW50ICYmIGlkU2VsZWN0b3JSRS50ZXN0KHNlbGVjdG9yKTtcblxuICAvLyBwZXJmb3JtIHRoZSBzZWFyY2hcbiAgcmV0dXJuIGlkU2VhcmNoID9cbiAgICAvLyB3ZSBhcmUgZG9pbmcgYW4gaWQgc2VhcmNoLCByZXR1cm4gdGhlIGVsZW1lbnQgc2VhcmNoIGluIGFuIGFycmF5XG4gICAgW3Njb3BlLmdldEVsZW1lbnRCeUlkKFJlZ0V4cC4kMSldIDpcbiAgICAvLyBub3QgYW4gaWQgc2VhcmNoLCBjYWxsIHRoZSBhcHByb3ByaWF0ZSBzZWxlY3RvclxuICAgIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKFxuICAgICAgICBjbGFzc1NlbGVjdG9yUkUudGVzdChzZWxlY3RvcikgP1xuICAgICAgICAgIHNjb3BlLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoUmVnRXhwLiQxKSA6XG4gICAgICAgICAgICB0YWdTZWxlY3RvclJFLnRlc3Qoc2VsZWN0b3IpID9cbiAgICAgICAgICAgICAgc2NvcGUuZ2V0RWxlbWVudHNCeVRhZ05hbWUoc2VsZWN0b3IpIDpcbiAgICAgICAgICAgICAgc2NvcGUucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcilcbiAgICApO1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVTZXBhcmF0b3IgPSAvW1xcLFxcc11cXHMqLztcbnZhciBvZmZGbGFncyA9IFsnZmFsc2UnLCAnbm9uZScsICdvZmYnXTtcblxuXG4vKipcbiAgIyBydGMtY2FwdHVyZWNvbmZpZ1xuXG4gIFRoaXMgaXMgYSBzaW1wbGUgcGFyc2VyIHRoYXQgdGFrZXMgYSBzdHJpbmcgb2YgdGV4dCBhbmQgZGV0ZXJtaW5lcyB3aGF0XG4gIHRoYXQgbWVhbnMgaW4gdGhlIGNvbnRleHQgb2YgV2ViUlRDLlxuXG4gICMjIFdoeT9cblxuICBJdCBwcm92aWRlcyBhIHNpbXBsZSwgdGV4dHVhbCB3YXkgb2YgZGVzY3JpYmluZyB5b3VyIHJlcXVpcmVtZW50cyBmb3JcbiAgbWVkaWEgY2FwdHVyZS4gIFRyeWluZyB0byByZW1lbWJlciB0aGUgc3RydWN0dXJlIG9mIHRoZSBjb25zdHJhaW50cyBvYmplY3RcbiAgaXMgcGFpbmZ1bC5cblxuICAjIyBIb3dcblxuICBBIHNpbXBsZSB0ZXh0IHN0cmluZyBpcyBjb252ZXJ0ZWQgdG8gYW4gaW50ZXJtZWRpYXRlIEpTIG9iamVjdFxuICByZXByZXNlbnRhdGlvbiwgd2hpY2ggY2FuIHRoZW4gYmUgY29udmVydGVkIHRvIGEgZ2V0VXNlck1lZGlhIGNvbnN0cmFpbnRzXG4gIGRhdGEgc3RydWN0dXJlIHVzaW5nIGEgYHRvQ29uc3RyYWludHMoKWAgY2FsbC5cblxuICBGb3IgZXhhbXBsZSwgdGhlIGZvbGxvd2luZyB0ZXh0IGlucHV0OlxuXG4gIGBgYFxuICBjYW1lcmEgbWluOjEyODB4NzIwIG1heDoxMjgweDcyMCBtaW46MTVmcHMgbWF4OjI1ZnBzXG4gIGBgYFxuXG4gIElzIGNvbnZlcnRlZCBpbnRvIGFuIGludGVybWVkaWEgcmVwcmVzZW50YXRpb24gKHZpYSB0aGUgYENhcHR1cmVDb25maWdgXG4gIHV0aWxpdHkgY2xhc3MpIHRoYXQgbG9va3MgbGlrZSB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGpzXG4gIHtcbiAgICBjYW1lcmE6IDAsXG4gICAgbWljcm9waG9uZTogMCxcbiAgICByZXM6IHtcbiAgICAgIG1pbjogeyB3OiAxMjgwLCBoOiA3MjAgfSxcbiAgICAgIG1heDogeyB3OiAxMjgwLCBoOiA3MjAgfVxuICAgIH0sXG5cbiAgICBmcHM6IHtcbiAgICAgIG1pbjogMTUsXG4gICAgICBtYXg6IDI1XG4gICAgfVxuICB9XG4gIGBgYFxuXG4gIFdoaWNoIGluIHR1cm4gaXMgY29udmVydGVkIGludG8gdGhlIGZvbGxvd2luZyBtZWRpYSBjb25zdHJhaW50cyBmb3JcbiAgYSBnZXRVc2VyTWVkaWEgY2FsbDpcblxuICBgYGBqc1xuICB7XG4gICAgYXVkaW86IHRydWUsXG4gICAgdmlkZW86IHtcbiAgICAgIG1hbmRhdG9yeToge1xuICAgICAgICBtaW5GcmFtZVJhdGU6IDE1LFxuICAgICAgICBtYXhGcmFtZVJhdGU6IDI1LFxuXG4gICAgICAgIG1pbldpZHRoOiAxMjgwLFxuICAgICAgICBtaW5IZWlnaHQ6IDcyMCxcbiAgICAgICAgbWF4V2lkdGg6IDEyODAsXG4gICAgICAgIG1heEhlaWdodDogNzIwXG4gICAgICB9LFxuXG4gICAgICBvcHRpb25hbDogW11cbiAgICB9XG4gIH1cbiAgYGBgXG5cbiAgIyMjIEV4cGVyaW1lbnRhbDogVGFyZ2V0ZWQgRGV2aWNlIENhcHR1cmVcblxuICBXaGlsZSB0aGUgYHJ0Yy1jYXB0dXJlY29uZmlnYCBtb2R1bGUgaXRzZWxmIGRvZXNuJ3QgY29udGFpbiBhbnkgbWVkaWFcbiAgaWRlbnRpZmljYXRpb24gbG9naWMsIGl0IGlzIGFibGUgdG8gdGhlIHNvdXJjZXMgaW5mb3JtYXRpb24gZnJvbSBhXG4gIGBNZWRpYVN0cmVhbVRyYWNrLmdldFNvdXJjZXNgIGNhbGwgdG8gZ2VuZXJhdGUgZGV2aWNlIHRhcmdldGVkIGNvbnN0cmFpbnRzLlxuXG4gIEZvciBpbnN0YW5jZSwgdGhlIGZvbGxvd2luZyBleGFtcGxlIGRlbW9uc3RyYXRlcyBob3cgd2UgY2FuIHJlcXVlc3RcbiAgYGNhbWVyYToxYCAodGhlIDJuZCB2aWRlbyBkZXZpY2Ugb24gb3VyIGxvY2FsIG1hY2hpbmUpIHdoZW4gd2UgYXJlIG1ha2luZ1xuICBhIGdldFVzZXJNZWRpYSBjYWxsOlxuXG4gIDw8PCBleGFtcGxlcy9jYW1lcmEtdHdvLmpzXG5cbiAgSXQncyB3b3J0aCBub3RpbmcgdGhhdCBpZiB0aGUgcmVxdWVzdGVkIGRldmljZSBkb2VzIG5vdCBleGlzdCBvbiB0aGVcbiAgbWFjaGluZSAoaW4gdGhlIGNhc2UgYWJvdmUsIGlmIHlvdXIgbWFjaGluZSBvbmx5IGhhcyBhIHNpbmdsZSB3ZWJjYW0gLSBhc1xuICBpcyBjb21tb24pIHRoZW4gbm8gZGV2aWNlIHNlbGVjdGlvbiBjb25zdHJhaW50cyB3aWxsIGJlIGdlbmVyYXRlZCAoaS5lLlxuICB0aGUgc3RhbmRhcmQgYHsgdmlkZW86IHRydWUsIGF1ZGlvOiB0cnVlIH1gIGNvbnN0cmFpbnRzIHdpbGwgYmUgcmV0dXJuZWRcbiAgZnJvbSB0aGUgYHRvQ29uc3RyYWludHNgIGNhbGwpLlxuXG4gICMjIyBFeHBlcmltZW50YWw6IFNjcmVlbiBDYXB0dXJlXG5cbiAgSWYgeW91IGFyZSB3b3JraW5nIHdpdGggY2hyb21lIGFuZCBzZXJ2aW5nIGNvbnRlbnQgb2YgYSBIVFRQUyBjb25uZWN0aW9uLFxuICB0aGVuIHlvdSB3aWxsIGJlIGFibGUgdG8gZXhwZXJpbWVudCB3aXRoIGV4cGVyaW1lbnRhbCBnZXRVc2VyTWVkaWEgc2NyZWVuXG4gIGNhcHR1cmUuXG5cbiAgSW4gdGhlIHNpbXBsZXN0IGNhc2UsIHNjcmVlbiBjYXB0dXJlIGNhbiBiZSBpbnZva2VkIGJ5IHVzaW5nIHRoZSBjYXB0dXJlXG4gIHN0cmluZyBvZjpcblxuICBgYGBcbiAgc2NyZWVuXG4gIGBgYFxuXG4gIFdoaWNoIGdlbmVyYXRlcyB0aGUgZm9sbG93aW5nIGNvbnRyYWludHM6XG5cbiAgYGBganNcbiAge1xuICAgIGF1ZGlvOiBmYWxzZSxcbiAgICB2aWRlbzoge1xuICAgICAgbWFuZGF0b3J5OiB7XG4gICAgICAgIGNocm9tZU1lZGlhU291cmNlOiAnc2NyZWVuJ1xuICAgICAgfSxcblxuICAgICAgb3B0aW9uYWw6IFtdXG4gICAgfVxuICB9XG4gIGBgYFxuXG4gICMjIFJlZmVyZW5jZVxuXG4qKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpbnB1dCkge1xuICAvLyBjcmVhdGUgYSBuZXcgY29uZmlndXJhdGlvbiBvYmplY3QgdXNpbmcgZGVmYXVsdHNcbiAgdmFyIGNvbmZpZyA9IG5ldyBDYXB0dXJlQ29uZmlnKCk7XG5cbiAgLy8gcHJvY2VzcyBlYWNoIG9mIHRoZSBkaXJlY3RpdmVzXG4gIChpbnB1dCB8fCAnJykuc3BsaXQocmVTZXBhcmF0b3IpLmZvckVhY2goZnVuY3Rpb24oZGlyZWN0aXZlKSB7XG4gICAgLy8gbm93IGZ1cnRoZXIgc3BsaXQgdGhlIGRpcmVjdGl2ZSBvbiB0aGUgOiBjaGFyYWN0ZXJcbiAgICB2YXIgcGFydHMgPSBkaXJlY3RpdmUuc3BsaXQoJzonKTtcbiAgICB2YXIgbWV0aG9kID0gY29uZmlnWyhwYXJ0c1swXSB8fCAnJykudG9Mb3dlckNhc2UoKV07XG5cbiAgICAvLyBpZiB3ZSBoYXZlIHRoZSBtZXRob2QgYXBwbHlcbiAgICBpZiAodHlwZW9mIG1ldGhvZCA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBtZXRob2QuYXBwbHkoY29uZmlnLCBwYXJ0cy5zbGljZSgxKSk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gY29uZmlnO1xufTtcblxuLyoqXG4gICMjIyBDYXB0dXJlQ29uZmlnXG5cbiAgVGhpcyBpcyBhIHV0aWxpdHkgY2xhc3MgdGhhdCBpcyB1c2VkIHRvIHVwZGF0ZSBjYXB0dXJlIGNvbmZpZ3VyYXRpb25cbiAgZGV0YWlscyBhbmQgaXMgYWJsZSB0byBnZW5lcmF0ZSBzdWl0YWJsZSBnZXRVc2VyTWVkaWEgY29uc3RyYWludHMgYmFzZWRcbiAgb24gdGhlIGNvbmZpZ3VyYXRpb24uXG5cbioqL1xuZnVuY3Rpb24gQ2FwdHVyZUNvbmZpZygpIHtcbiAgaWYgKCEgKHRoaXMgaW5zdGFuY2VvZiBDYXB0dXJlQ29uZmlnKSkge1xuICAgIHJldHVybiBuZXcgQ2FwdHVyZUNvbmZpZygpO1xuICB9XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgYmFzZSBjb25maWdcbiAgdGhpcy5jZmcgPSB7XG4gICAgbWljcm9waG9uZTogdHJ1ZVxuICB9O1xufVxuXG4vKipcbiAgIyMjIyBjYW1lcmEoaW5kZXgpXG5cbiAgVXBkYXRlIHRoZSBjYW1lcmEgY29uZmlndXJhdGlvbiB0byB0aGUgc3BlY2lmaWVkIGluZGV4XG4qKi9cbkNhcHR1cmVDb25maWcucHJvdG90eXBlLmNhbWVyYSA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gIHRoaXMuY2ZnLmNhbWVyYSA9IHRydWVPclZhbHVlKGluZGV4KTtcbn07XG5cbi8qKlxuICAjIyMjIG1pY3JvcGhvbmUoaW5kZXgpXG5cbiAgVXBkYXRlIHRoZSBtaWNyb3Bob25lIGNvbmZpZ3VyYXRpb24gdG8gdGhlIHNwZWNpZmllZCBpbmRleFxuKiovXG5DYXB0dXJlQ29uZmlnLnByb3RvdHlwZS5taWNyb3Bob25lID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgdGhpcy5jZmcubWljcm9waG9uZSA9IHRydWVPclZhbHVlKGluZGV4KTtcbn07XG5cbi8qKlxuICAjIyMjIHNjcmVlbih0YXJnZXQpXG5cbiAgU3BlY2lmeSB0aGF0IHdlIHdvdWxkIGxpa2UgdG8gY2FwdHVyZSB0aGUgc2NyZWVuXG4qKi9cbkNhcHR1cmVDb25maWcucHJvdG90eXBlLnNjcmVlbiA9IGZ1bmN0aW9uKCkge1xuICAvLyB1bnNldCB0aGUgbWljcm9waG9uZSBjb25maWdcbiAgZGVsZXRlIHRoaXMuY2ZnLm1pY3JvcGhvbmU7XG5cbiAgLy8gc2V0IHRoZSBzY3JlZW4gY29uZmlndXJhdGlvblxuICB0aGlzLmNmZy5zY3JlZW4gPSB0cnVlO1xufTtcblxuLyoqXG4gICMjIyMgbWF4KGRhdGEpXG5cbiAgVXBkYXRlIGEgbWF4aW11bSBjb25zdHJhaW50LiAgSWYgYW4gZnBzIGNvbnN0cmFpbnQgdGhpcyB3aWxsIGJlIGRpcmVjdGVkXG4gIHRvIHRoZSBgbWF4ZnBzYCBtb2RpZmllci5cblxuKiovXG5DYXB0dXJlQ29uZmlnLnByb3RvdHlwZS5tYXggPSBmdW5jdGlvbihkYXRhKSB7XG4gIHZhciByZXM7XG5cbiAgLy8gaWYgdGhpcyBpcyBhbiBmcHMgc3BlY2lmaWNhdGlvbiBwYXJzZVxuICBpZiAoZGF0YS5zbGljZSgtMykudG9Mb3dlckNhc2UoKSA9PSAnZnBzJykge1xuICAgIHJldHVybiB0aGlzLm1heGZwcyhkYXRhKTtcbiAgfVxuXG4gIC8vIHBhcnNlIHRoZSByZXNvbHV0aW9uXG4gIHJlcyA9IHRoaXMuX3BhcnNlUmVzKGRhdGEpO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIGZwcyBjb25maWcgc3R1ZmZcbiAgdGhpcy5jZmcucmVzID0gdGhpcy5jZmcucmVzIHx8IHt9O1xuICB0aGlzLmNmZy5yZXMubWF4ID0gcmVzO1xufTtcblxuLyoqXG4gICMjIyMgbWF4ZnBzKGRhdGEpXG5cbiAgVXBkYXRlIHRoZSBtYXhpbXVtIGZwc1xuKiovXG5DYXB0dXJlQ29uZmlnLnByb3RvdHlwZS5tYXhmcHMgPSBmdW5jdGlvbihkYXRhKSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIGFuIGZwcyBjb21wb25lbnRcbiAgdGhpcy5jZmcuZnBzID0gdGhpcy5jZmcuZnBzIHx8IHt9O1xuXG4gIC8vIHNldCB0aGUgbWF4IGZwc1xuICB0aGlzLmNmZy5mcHMubWF4ID0gcGFyc2VGbG9hdChkYXRhLnNsaWNlKDAsIC0zKSk7XG59O1xuXG4vKipcbiAgIyMjIyBtaW4oZGF0YSlcblxuICBVcGRhdGUgYSBtaW5pbXVtIGNvbnN0cmFpbnQuICBUaGlzIGNhbiBiZSBlaXRoZXIgcmVsYXRlZCB0byByZXNvbHV0aW9uXG4gIG9yIEZQUy5cbioqL1xuQ2FwdHVyZUNvbmZpZy5wcm90b3R5cGUubWluID0gZnVuY3Rpb24oZGF0YSkge1xuICB2YXIgcmVzO1xuXG4gIC8vIGlmIHRoaXMgaXMgYW4gZnBzIHNwZWNpZmljYXRpb24gcGFyc2VcbiAgaWYgKGRhdGEuc2xpY2UoLTMpLnRvTG93ZXJDYXNlKCkgPT0gJ2ZwcycpIHtcbiAgICByZXR1cm4gdGhpcy5taW5mcHMoZGF0YSk7XG4gIH1cblxuICAvLyBwYXJzZSB0aGUgcmVzb2x1dGlvblxuICByZXMgPSB0aGlzLl9wYXJzZVJlcyhkYXRhKTtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBmcHMgY29uZmlnIHN0dWZmXG4gIHRoaXMuY2ZnLnJlcyA9IHRoaXMuY2ZnLnJlcyB8fCB7fTtcblxuICAvLyBhZGQgdGhlIG1pblxuICB0aGlzLmNmZy5yZXMubWluID0gcmVzO1xufTtcblxuLyoqXG4gICMjIyMgbWluZnBzKGRhdGEpXG5cbiAgVXBkYXRlIHRoZSBtaW5pbXVtIGZwc1xuKiovXG5DYXB0dXJlQ29uZmlnLnByb3RvdHlwZS5taW5mcHMgPSBmdW5jdGlvbihkYXRhKSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIGFuIGZwcyBjb21wb25lbnRcbiAgdGhpcy5jZmcuZnBzID0gdGhpcy5jZmcuZnBzIHx8IHt9O1xuXG4gIC8vIHNldCB0aGUgbWF4IGZwc1xuICB0aGlzLmNmZy5mcHMubWluID0gcGFyc2VGbG9hdChkYXRhLnNsaWNlKDAsIC0zKSk7XG59O1xuXG4vKipcbiAgIyMjIyB0b0NvbnN0cmFpbnRzKG9wdHM/KVxuXG4gIENvbnZlcnQgdGhlIGludGVybmFsIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHRvIGEgdmFsaWQgbWVkaWEgY29uc3RyYWludHNcbiAgcmVwcmVzZW50YXRpb24uICBJbiBjb21wYXRpYmxlIGJyb3dzZXJzIGEgbGlzdCBvZiBtZWRpYSBzb3VyY2VzIGNhblxuICBiZSBwYXNzZWQgdGhyb3VnaCBpbiB0aGUgYG9wdHMuc291cmNlc2AgdG8gY3JlYXRlIGNvbnRyYWludHMgdGhhdCB3aWxsXG4gIHRhcmdldCBhIHNwZWNpZmljIGRldmljZSB3aGVuIGNhcHR1cmVkLlxuXG4gIDw8PCBleGFtcGxlcy9jYXB0dXJlLXRhcmdldHMuanNcblxuKiovXG5DYXB0dXJlQ29uZmlnLnByb3RvdHlwZS50b0NvbnN0cmFpbnRzID0gZnVuY3Rpb24ob3B0cykge1xuICB2YXIgY2ZnID0gdGhpcy5jZmc7XG4gIHZhciBjb25zdHJhaW50cyA9IHtcbiAgICBhdWRpbzogY2ZnLm1pY3JvcGhvbmUgPT09IHRydWUgfHxcbiAgICAgICh0eXBlb2YgY2ZnLm1pY3JvcGhvbmUgPT0gJ251bWJlcicgJiYgY2ZnLm1pY3JvcGhvbmUgPj0gMCksXG5cbiAgICB2aWRlbzogY2ZnLmNhbWVyYSA9PT0gdHJ1ZSB8fCBjZmcuc2NyZWVuIHx8XG4gICAgICAodHlwZW9mIGNmZy5jYW1lcmEgPT0gJ251bWJlcicgJiYgY2ZnLmNhbWVyYSA+PSAwKVxuICB9O1xuXG4gIC8vIG1hbmRhdG9yeSBjb25zdHJhaW50c1xuICB2YXIgbSA9IHtcbiAgICB2aWRlbzoge30sXG4gICAgYXVkaW86IHt9XG4gIH07XG5cbiAgLy8gb3B0aW9uYWwgY29uc3RyYWludHNcbiAgdmFyIG8gPSB7XG4gICAgdmlkZW86IFtdLFxuICAgIGF1ZGlvOiBbXVxuICB9O1xuXG4gIHZhciBzb3VyY2VzID0gKG9wdHMgfHwge30pLnNvdXJjZXMgfHwgW107XG4gIHZhciBjYW1lcmFzID0gc291cmNlcy5maWx0ZXIoZnVuY3Rpb24oaW5mbykge1xuICAgIHJldHVybiBpbmZvICYmIGluZm8ua2luZCA9PT0gJ3ZpZGVvJztcbiAgfSk7XG4gIHZhciBtaWNyb3Bob25lcyA9IHNvdXJjZXMuZmlsdGVyKGZ1bmN0aW9uKGluZm8pIHtcbiAgICByZXR1cm4gaW5mbyAmJiBpbmZvLmtpbmQgPT09ICdhdWRpbyc7XG4gIH0pO1xuICB2YXIgc2VsZWN0ZWRTb3VyY2U7XG5cbiAgZnVuY3Rpb24gY29tcGxleENvbnN0cmFpbnRzKHRhcmdldCkge1xuICAgIGlmIChjb25zdHJhaW50c1t0YXJnZXRdICYmIHR5cGVvZiBjb25zdHJhaW50c1t0YXJnZXRdICE9ICdvYmplY3QnKSB7XG4gICAgICBjb25zdHJhaW50c1t0YXJnZXRdID0ge1xuICAgICAgICBtYW5kYXRvcnk6IG1bdGFyZ2V0XSxcbiAgICAgICAgb3B0aW9uYWw6IG9bdGFyZ2V0XVxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvLyBmcHNcbiAgaWYgKGNmZy5mcHMpIHtcbiAgICBjb21wbGV4Q29uc3RyYWludHMoJ3ZpZGVvJyk7XG4gICAgY2ZnLmZwcy5taW4gJiYgKG0udmlkZW8ubWluRnJhbWVSYXRlID0gY2ZnLmZwcy5taW4pO1xuICAgIGNmZy5mcHMubWF4ICYmIChtLnZpZGVvLm1heEZyYW1lUmF0ZSA9IGNmZy5mcHMubWF4KTtcbiAgfVxuXG4gIC8vIG1pbiByZXMgc3BlY2lmaWVkXG4gIGlmIChjZmcucmVzICYmIGNmZy5yZXMubWluKSB7XG4gICAgY29tcGxleENvbnN0cmFpbnRzKCd2aWRlbycpO1xuICAgIG0udmlkZW8ubWluV2lkdGggPSBjZmcucmVzLm1pbi53O1xuICAgIG0udmlkZW8ubWluSGVpZ2h0ID0gY2ZnLnJlcy5taW4uaDtcbiAgfVxuXG4gIC8vIG1heCByZXMgc3BlY2lmaWVkXG4gIGlmIChjZmcucmVzICYmIGNmZy5yZXMubWF4KSB7XG4gICAgY29tcGxleENvbnN0cmFpbnRzKCd2aWRlbycpO1xuICAgIG0udmlkZW8ubWF4V2lkdGggPSBjZmcucmVzLm1heC53O1xuICAgIG0udmlkZW8ubWF4SGVpZ2h0ID0gY2ZnLnJlcy5tYXguaDtcbiAgfVxuXG4gIC8vIGlucHV0IGNhbWVyYSBzZWxlY3Rpb25cbiAgaWYgKHR5cGVvZiBjZmcuY2FtZXJhID09ICdudW1iZXInICYmIGNhbWVyYXMubGVuZ3RoKSB7XG4gICAgc2VsZWN0ZWRTb3VyY2UgPSBjYW1lcmFzW2NmZy5jYW1lcmFdO1xuXG4gICAgaWYgKHNlbGVjdGVkU291cmNlKSB7XG4gICAgICBjb21wbGV4Q29uc3RyYWludHMoJ3ZpZGVvJyk7XG4gICAgICBvLnZpZGVvLnB1c2goeyBzb3VyY2VJZDogc2VsZWN0ZWRTb3VyY2UuaWQgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gaW5wdXQgbWljcm9waG9uZSBzZWxlY3Rpb25cbiAgaWYgKHR5cGVvZiBjZmcubWljcm9waG9uZSA9PSAnbnVtYmVyJyAmJiBtaWNyb3Bob25lcy5sZW5ndGgpIHtcbiAgICBzZWxlY3RlZFNvdXJjZSA9IG1pY3JvcGhvbmVzW2NmZy5taWNyb3Bob25lXTtcblxuICAgIGlmIChzZWxlY3RlZFNvdXJjZSkge1xuICAgICAgY29tcGxleENvbnN0cmFpbnRzKCdhdWRpbycpO1xuICAgICAgby5hdWRpby5wdXNoKHsgc291cmNlSWQ6IHNlbGVjdGVkU291cmNlLmlkIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHdlIGhhdmUgc2NyZWVuIGNvbnN0cmFpbnRzLCBtYWtlIG1hZ2ljIGhhcHBlblxuICBpZiAodHlwZW9mIGNmZy5zY3JlZW4gIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBjb21wbGV4Q29uc3RyYWludHMoJ3ZpZGVvJyk7XG4gICAgbS52aWRlby5jaHJvbWVNZWRpYVNvdXJjZSA9ICdzY3JlZW4nO1xuICB9XG5cbiAgcmV0dXJuIGNvbnN0cmFpbnRzO1xufTtcblxuLyoqXG4gICMjIyBcIkludGVybmFsXCIgbWV0aG9kc1xuKiovXG5cbi8qKlxuICAjIyMjIF9wYXJzZVJlcyhkYXRhKVxuXG4gIFBhcnNlIGEgcmVzb2x1dGlvbiBzcGVjaWZpZXIgKGUuZy4gMTI4MHg3MjApIGludG8gYSBzaW1wbGUgSlMgb2JqZWN0XG4gIChlLmcuIHsgdzogMTI4MCwgaDogNzIwIH0pXG4qKi9cbkNhcHR1cmVDb25maWcucHJvdG90eXBlLl9wYXJzZVJlcyA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgLy8gc3BsaXQgdGhlIGRhdGEgb24gdGhlICd4JyBjaGFyYWN0ZXJcbiAgdmFyIHBhcnRzID0gZGF0YS5zcGxpdCgneCcpO1xuXG4gIC8vIGlmIHdlIGRvbid0IGhhdmUgdHdvIHBhcnRzLCB0aGVuIGNvbXBsYWluXG4gIGlmIChwYXJ0cy5sZW5ndGggPCAyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHJlc29sdXRpb24gc3BlY2lmaWNhdGlvbjogJyArIGRhdGEpO1xuICB9XG5cbiAgLy8gcmV0dXJuIHRoZSB3aWR0aCBhbmQgaGVpZ2h0IG9iamVjdFxuICByZXR1cm4ge1xuICAgIHc6IHBhcnNlSW50KHBhcnRzWzBdLCAxMCksXG4gICAgaDogcGFyc2VJbnQocGFydHNbMV0sIDEwKVxuICB9O1xufTtcblxuLyogaW50ZXJuYWwgaGVscGVyICovXG5cbmZ1bmN0aW9uIHRydWVPclZhbHVlKHZhbCkge1xuICBpZiAodHlwZW9mIHZhbCA9PSAnc3RyaW5nJyAmJiBvZmZGbGFncy5pbmRleE9mKHZhbC50b0xvd2VyQ2FzZSgpKSA+PSAwKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHZhbCA9PT0gdW5kZWZpbmVkIHx8IHZhbCA9PT0gJycgfHwgcGFyc2VJbnQodmFsIHx8IDAsIDEwKTtcbn0iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIHdpbmRvdzogZmFsc2UgKi9cbi8qIGdsb2JhbCBuYXZpZ2F0b3I6IGZhbHNlICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4jIyBydGMtY29yZS9kZXRlY3RcblxuQSBicm93c2VyIGRldGVjdGlvbiBoZWxwZXIgZm9yIGFjY2Vzc2luZyBwcmVmaXgtZnJlZSB2ZXJzaW9ucyBvZiB0aGUgdmFyaW91c1xuV2ViUlRDIHR5cGVzLiBcblxuIyMjIEV4YW1wbGUgVXNhZ2VcblxuSWYgeW91IHdhbnRlZCB0byBnZXQgdGhlIG5hdGl2ZSBgUlRDUGVlckNvbm5lY3Rpb25gIHByb3RvdHlwZSBpbiBhbnkgYnJvd3NlclxueW91IGNvdWxkIGRvIHRoZSBmb2xsb3dpbmc6XG5cbmBgYGpzXG52YXIgZGV0ZWN0ID0gcmVxdWlyZSgncnRjLWNvcmUvZGV0ZWN0Jyk7IC8vIGFsc28gYXZhaWxhYmxlIGluIHJ0Yy9kZXRlY3RcbnZhciBSVENQZWVyQ29ubmVjdGlvbiA9IGRldGVjdCgnUlRDUGVlckNvbm5lY3Rpb24nKTtcbmBgYFxuXG5UaGlzIHdvdWxkIHByb3ZpZGUgd2hhdGV2ZXIgdGhlIGJyb3dzZXIgcHJlZml4ZWQgdmVyc2lvbiBvZiB0aGVcblJUQ1BlZXJDb25uZWN0aW9uIGlzIGF2YWlsYWJsZSAoYHdlYmtpdFJUQ1BlZXJDb25uZWN0aW9uYCwgXG5gbW96UlRDUGVlckNvbm5lY3Rpb25gLCBldGMpLlxuKiovXG52YXIgZGV0ZWN0ID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0YXJnZXQsIHByZWZpeGVzKSB7XG4gIHZhciBwcmVmaXhJZHg7XG4gIHZhciBwcmVmaXg7XG4gIHZhciB0ZXN0TmFtZTtcbiAgdmFyIGhvc3RPYmplY3QgPSB0aGlzIHx8IHdpbmRvdztcblxuICAvLyBpbml0aWFsaXNlIHRvIGRlZmF1bHQgcHJlZml4ZXMgXG4gIC8vIChyZXZlcnNlIG9yZGVyIGFzIHdlIHVzZSBhIGRlY3JlbWVudGluZyBmb3IgbG9vcClcbiAgcHJlZml4ZXMgPSAocHJlZml4ZXMgfHwgWydtcycsICdvJywgJ21veicsICd3ZWJraXQnXSkuY29uY2F0KCcnKTtcblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHByZWZpeGVzIGFuZCByZXR1cm4gdGhlIGNsYXNzIGlmIGZvdW5kIGluIGdsb2JhbFxuICBmb3IgKHByZWZpeElkeCA9IHByZWZpeGVzLmxlbmd0aDsgcHJlZml4SWR4LS07ICkge1xuICAgIHByZWZpeCA9IHByZWZpeGVzW3ByZWZpeElkeF07XG5cbiAgICAvLyBjb25zdHJ1Y3QgdGhlIHRlc3QgY2xhc3MgbmFtZVxuICAgIC8vIGlmIHdlIGhhdmUgYSBwcmVmaXggZW5zdXJlIHRoZSB0YXJnZXQgaGFzIGFuIHVwcGVyY2FzZSBmaXJzdCBjaGFyYWN0ZXJcbiAgICAvLyBzdWNoIHRoYXQgYSB0ZXN0IGZvciBnZXRVc2VyTWVkaWEgd291bGQgcmVzdWx0IGluIGEgXG4gICAgLy8gc2VhcmNoIGZvciB3ZWJraXRHZXRVc2VyTWVkaWFcbiAgICB0ZXN0TmFtZSA9IHByZWZpeCArIChwcmVmaXggP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHRhcmdldC5zbGljZSgxKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0KTtcblxuICAgIGlmICh0eXBlb2YgaG9zdE9iamVjdFt0ZXN0TmFtZV0gIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIC8vIHVwZGF0ZSB0aGUgbGFzdCB1c2VkIHByZWZpeFxuICAgICAgZGV0ZWN0LmJyb3dzZXIgPSBkZXRlY3QuYnJvd3NlciB8fCBwcmVmaXgudG9Mb3dlckNhc2UoKTtcblxuICAgICAgLy8gcmV0dXJuIHRoZSBob3N0IG9iamVjdCBtZW1iZXJcbiAgICAgIHJldHVybiBob3N0T2JqZWN0W3RhcmdldF0gPSBob3N0T2JqZWN0W3Rlc3ROYW1lXTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIGRldGVjdCBtb3ppbGxhICh5ZXMsIHRoaXMgZmVlbHMgZGlydHkpXG5kZXRlY3QubW96ID0gdHlwZW9mIG5hdmlnYXRvciAhPSAndW5kZWZpbmVkJyAmJiAhIW5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWE7XG5cbi8vIGluaXRpYWxpc2UgdGhlIHByZWZpeCBhcyB1bmtub3duXG5kZXRlY3QuYnJvd3NlciA9IHVuZGVmaW5lZDsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyMgcnRjLWNvcmUvcmVzZXRcblxuICBUaGlzIGlzIGEgc2ltcGxlLCBjcm9zcy1icm93c2VyIG1ldGhvZCBmb3IgcmVzZXR0aW5nIGEgbWVkaWEgZWxlbWVudFxuICBiYWNrIHRvIGEgaW5pdGlhbCBzdGF0ZSBhZnRlciBoYXZpbmcgbWVkaWEgYXR0YWNoZWQuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihlbCkge1xuICAvLyByZW1vdmUgdGhlIHNvdXJjZVxuICBlbC5zcmMgPSBudWxsO1xuXG4gIC8vIGNoZWNrIGZvciBtb3pcbiAgaWYgKGVsLm1velNyY09iamVjdCkge1xuICAgIGVsLm1velNyY09iamVjdCA9IG51bGw7XG4gIH1cblxuICAvLyBjaGVjayBmb3IgY3VycmVudFNyY1xuICBpZiAoZWwuY3VycmVudFNyYykge1xuICAgIGVsLmN1cnJlbnRTcmMgPSBudWxsO1xuICB9XG5cbiAgLy8gcmV0dXJuIHRoZSBpbnB1dCAobWFwIGZyaWVuZGx5KVxuICByZXR1cm4gZWw7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgbmF2aWdhdG9yOiBmYWxzZSAqL1xuLyogZ2xvYmFsIHdpbmRvdzogZmFsc2UgKi9cbi8qIGdsb2JhbCBkb2N1bWVudDogZmFsc2UgKi9cbi8qIGdsb2JhbCBNZWRpYVN0cmVhbTogZmFsc2UgKi9cbi8qIGdsb2JhbCBIVE1MVmlkZW9FbGVtZW50OiBmYWxzZSAqL1xuLyogZ2xvYmFsIEhUTUxBdWRpb0VsZW1lbnQ6IGZhbHNlICovXG5cbi8qKlxuICAjIHJ0Yy1tZWRpYVxuXG4gIFNpbXBsZSBbZ2V0VXNlck1lZGlhXShodHRwOi8vZGV2LnczLm9yZy8yMDExL3dlYnJ0Yy9lZGl0b3IvZ2V0dXNlcm1lZGlhLmh0bWwpXG4gIGNyb3NzLWJyb3dzZXIgd3JhcHBlcnMuICBQYXJ0IG9mIHRoZSBbcnRjLmlvXShodHRwOi8vcnRjLmlvLykgc3VpdGUsIHdoaWNoIGlzXG4gIHNwb25zb3JlZCBieSBbTklDVEFdKGh0dHA6Ly9vcGVubmljdGEuY29tKSBhbmQgcmVsZWFzZWQgdW5kZXIgYW5cbiAgW0FwYWNoZSAyLjAgbGljZW5zZV0oL0xJQ0VOU0UpLlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICBDYXB0dXJpbmcgbWVkaWEgb24geW91ciBtYWNoaW5lIGlzIGFzIHNpbXBsZSBhczpcblxuICBgYGBqc1xuICByZXF1aXJlKCdydGMtbWVkaWEnKSgpO1xuICBgYGBcblxuICBXaGlsZSB0aGlzIHdpbGwgaW4gZmFjdCBzdGFydCB0aGUgdXNlciBtZWRpYSBjYXB0dXJlIHByb2Nlc3MsIGl0IHdvbid0XG4gIGRvIGFueXRoaW5nIHdpdGggaXQuICBMZXRzIHRha2UgYSBsb29rIGF0IGEgbW9yZSByZWFsaXN0aWMgZXhhbXBsZTpcblxuICA8PDxqcyBnaXN0Oi8vNjA4NTQ1MFxuXG4gIFtydW4gb24gcmVxdWlyZWJpbl0oaHR0cDovL3JlcXVpcmViaW4uY29tLz9naXN0PTYwODU0NTApXG5cbiAgSW4gdGhlIGNvZGUgYWJvdmUsIHdlIGFyZSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZSBvZiBvdXIgdXNlck1lZGlhIHdyYXBwZXJcbiAgdXNpbmcgdGhlIGBtZWRpYSgpYCBjYWxsIGFuZCB0aGVuIHRlbGxpbmcgaXQgdG8gcmVuZGVyIHRvIHRoZVxuICBgZG9jdW1lbnQuYm9keWAgb25jZSB2aWRlbyBzdGFydHMgc3RyZWFtaW5nLiAgV2UgY2FuIGZ1cnRoZXIgZXhwYW5kIHRoZVxuICBjb2RlIG91dCB0byB0aGUgZm9sbG93aW5nIHRvIGFpZCBvdXIgdW5kZXJzdGFuZGluZyBvZiB3aGF0IGlzIGdvaW5nIG9uOlxuXG4gIGBgYGpzXG4gIHZhciBNZWRpYSA9IHJlcXVpcmUoJ3J0Yy1tZWRpYScpO1xuICB2YXIgdXNlck1lZGlhID0gbmV3IE1lZGlhKHsgc3RhcnQ6IHRydWUgfSk7XG5cbiAgdXNlck1lZGlhLnJlbmRlcihkb2N1bWVudC5ib2R5KTtcbiAgYGBgXG5cbiAgVGhlIGNvZGUgYWJvdmUgaXMgd3JpdHRlbiBpbiBhIG1vcmUgdHJhZGl0aW9uYWwgSlMgc3R5bGUsIGJ1dCBmZWVsIGZyZWVcbiAgdG8gdXNlIHRoZSBmaXJzdCBzdHlsZSBhcyBpdCdzIHF1aXRlIHNhZmUgKHRoYW5rcyB0byBzb21lIGNoZWNrcyBpbiB0aGVcbiAgY29kZSkuXG5cbiAgIyMjIEV2ZW50c1xuXG4gIE9uY2UgYSBtZWRpYSBvYmplY3QgaGFzIGJlZW4gY3JlYXRlZCwgaXQgd2lsbCBwcm92aWRlIGEgbnVtYmVyIG9mIGV2ZW50c1xuICB0aHJvdWdoIHRoZSBzdGFuZGFyZCBub2RlIEV2ZW50RW1pdHRlciBBUEkuXG5cbiAgIyMjIyBgY2FwdHVyZWBcblxuICBUaGUgYGNhcHR1cmVgIGV2ZW50IGlzIHRyaWdnZXJlZCBvbmNlIHRoZSByZXF1ZXN0ZWQgbWVkaWEgc3RyZWFtIGhhc1xuICBiZWVuIGNhcHR1cmVkIGJ5IHRoZSBicm93c2VyLlxuXG4gIGBgYGpzXG4gIG1lZGlhKCkub25jZSgnY2FwdHVyZScsIGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgIC8vIHN0cmVhbSByZWZlcmVuY2VzIHVuZGVybHlpbmcgbWVkaWEgc3RyZWFtIHRoYXQgd2FzIGNhcHR1cmVkXG4gIH0pO1xuICBgYGBcblxuICAjIyMjIGByZW5kZXJgXG5cbiAgVGhlIGByZW5kZXJgIGV2ZW50IGlzIHRyaWdnZXJlZCBvbmNlIHRoZSBzdHJlYW0gaGFzIGJlZW4gcmVuZGVyZWRcbiAgdG8gdGhlIGFueSBzdXBwbGllZCAob3IgY3JlYXRlZCkgdmlkZW8gZWxlbWVudHMuXG5cbiAgV2hpbGUgaXQgbWlnaHQgc2VlbSBhIGxpdHRsZSBjb25mdXNpbmcgdGhhdCB3aGVuIHRoZSBgcmVuZGVyYCBldmVudFxuICBmaXJlcyB0aGF0IGl0IHJldHVybnMgYW4gYXJyYXkgb2YgZWxlbWVudHMgcmF0aGVyIHRoYW4gYSBzaW5nbGUgZWxlbWVudFxuICAod2hpY2ggaXMgd2hhdCBpcyBwcm92aWRlZCB3aGVuIGNhbGxpbmcgdGhlIGByZW5kZXJgIG1ldGhvZCkuXG5cbiAgVGhpcyBvY2N1cnMgYmVjYXVzZSBpdCBpcyBjb21wbGV0ZWx5IHZhbGlkIHRvIHJlbmRlciBhIHNpbmdsZSBjYXB0dXJlZFxuICBtZWRpYSBzdHJlYW0gdG8gbXVsdGlwbGUgbWVkaWEgZWxlbWVudHMgb24gYSBwYWdlLiAgVGhlIGByZW5kZXJgIGV2ZW50XG4gIGlzIHJlcG9ydGluZyBvbmNlIHRoZSByZW5kZXIgb3BlcmF0aW9uIGhhcyBjb21wbGV0ZWQgZm9yIGFsbCB0YXJnZXRzIHRoYXRcbiAgaGF2ZSBiZWVuIHJlZ2lzdGVyZWQgd2l0aCB0aGUgY2FwdHVyZSBzdHJlYW0uXG5cbiAgIyMgUmVmZXJlbmNlXG5cbioqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKSgnbWVkaWEnKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG52YXIgZGV0ZWN0ID0gcmVxdWlyZSgncnRjLWNvcmUvZGV0ZWN0Jyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG5cbi8vIG1vbmtleSBwYXRjaCBnZXRVc2VyTWVkaWEgZnJvbSB0aGUgcHJlZml4ZWQgdmVyc2lvblxubmF2aWdhdG9yLmdldFVzZXJNZWRpYSA9IGRldGVjdC5jYWxsKG5hdmlnYXRvciwgJ2dldFVzZXJNZWRpYScpO1xuXG4vLyBwYXRjaCB3aW5kb3cgdXJsXG53aW5kb3cuVVJMID0gd2luZG93LlVSTCB8fCBkZXRlY3QoJ1VSTCcpO1xuXG4vLyBwYXRjaCBtZWRpYSBzdHJlYW1cbndpbmRvdy5NZWRpYVN0cmVhbSA9IGRldGVjdCgnTWVkaWFTdHJlYW0nKTtcblxuLyoqXG4gICMjIyBtZWRpYVxuXG4gIGBgYFxuICBtZWRpYShvcHRzPylcbiAgYGBgXG5cbiAgQ2FwdHVyZSBtZWRpYSB1c2luZyB0aGUgdW5kZXJseWluZ1xuICBbZ2V0VXNlck1lZGlhXShodHRwOi8vd3d3LnczLm9yZy9UUi9tZWRpYWNhcHR1cmUtc3RyZWFtcy8pIEFQSS5cblxuICBUaGUgZnVuY3Rpb24gYWNjZXB0cyBhIHNpbmdsZSBhcmd1bWVudCB3aGljaCBjYW4gYmUgZWl0aGVyIGJlOlxuXG4gIC0gYS4gQW4gb3B0aW9ucyBvYmplY3QgKHNlZSBiZWxvdyksIG9yO1xuICAtIGIuIEFuIGV4aXN0aW5nXG4gICAgW01lZGlhU3RyZWFtXShodHRwOi8vd3d3LnczLm9yZy9UUi9tZWRpYWNhcHR1cmUtc3RyZWFtcy8jbWVkaWFzdHJlYW0pIHRoYXRcbiAgICB0aGUgbWVkaWEgb2JqZWN0IHdpbGwgYmluZCB0byBhbmQgcHJvdmlkZSB5b3Ugc29tZSBET00gaGVscGVycyBmb3IuXG5cbiAgVGhlIGZ1bmN0aW9uIHN1cHBvcnRzIHRoZSBmb2xsb3dpbmcgb3B0aW9uczpcblxuICAtIGBjYXB0dXJlYCAtIFdoZXRoZXIgY2FwdHVyZSBzaG91bGQgYmUgaW5pdGlhdGVkIGF1dG9tYXRpY2FsbHkuIERlZmF1bHRzXG4gICAgdG8gdHJ1ZSwgYnV0IHRvZ2dsZWQgdG8gZmFsc2UgYXV0b21hdGljYWxseSBpZiBhbiBleGlzdGluZyBzdHJlYW0gaXNcbiAgICBwcm92aWRlZC5cblxuICAtIGBtdXRlZGAgLSBXaGV0aGVyIHRoZSB2aWRlbyBlbGVtZW50IGNyZWF0ZWQgZm9yIHRoaXMgc3RyZWFtIHNob3VsZCBiZVxuICAgIG11dGVkLiAgRGVmYXVsdCBpcyB0cnVlIGJ1dCBpcyBzZXQgdG8gZmFsc2Ugd2hlbiBhbiBleGlzdGluZyBzdHJlYW0gaXNcbiAgICBwYXNzZWQuXG5cbiAgLSBgY29uc3RyYWludHNgIC0gVGhlIGNvbnN0cmFpbnQgb3B0aW9uIGFsbG93cyB5b3UgdG8gc3BlY2lmeSBwYXJ0aWN1bGFyXG4gICAgbWVkaWEgY2FwdHVyZSBjb25zdHJhaW50cyB3aGljaCBjYW4gYWxsb3cgeW91IGRvIGRvIHNvbWUgcHJldHR5IGNvb2xcbiAgICB0cmlja3MuICBCeSBkZWZhdWx0LCB0aGUgY29udHJhaW50cyB1c2VkIHRvIHJlcXVlc3QgdGhlIG1lZGlhIGFyZVxuICAgIGZhaXJseSBzdGFuZGFyZCBkZWZhdWx0czpcblxuICAgIGBgYGpzXG4gICAgICB7XG4gICAgICAgIHZpZGVvOiB7XG4gICAgICAgICAgbWFuZGF0b3J5OiB7fSxcbiAgICAgICAgICBvcHRpb25hbDogW11cbiAgICAgICAgfSxcbiAgICAgICAgYXVkaW86IHRydWVcbiAgICAgIH1cbiAgICBgYGBcblxuKiovXG5mdW5jdGlvbiBNZWRpYShvcHRzKSB7XG4gIGlmICghICh0aGlzIGluc3RhbmNlb2YgTWVkaWEpKSB7XG4gICAgcmV0dXJuIG5ldyBNZWRpYShvcHRzKTtcbiAgfVxuXG4gIC8vIGluaGVyaXRlZFxuICBFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblxuICAvLyBpZiB0aGUgb3B0cyBpcyBhIG1lZGlhIHN0cmVhbSBpbnN0YW5jZSwgdGhlbiBoYW5kbGUgdGhhdCBhcHByb3ByaWF0ZWx5XG4gIGlmIChvcHRzICYmIG9wdHMgaW5zdGFuY2VvZiBNZWRpYVN0cmVhbSkge1xuICAgIG9wdHMgPSB7XG4gICAgICBzdHJlYW06IG9wdHMsXG4gICAgICBjYXB0dXJlOiBmYWxzZSxcbiAgICAgIG11dGVkOiBmYWxzZVxuICAgIH07XG4gIH1cblxuICAvLyBpZiB3ZSd2ZSBiZWVuIHBhc3NlZCBvcHRzIGFuZCB0aGV5IGxvb2sgbGlrZSBjb25zdHJhaW50cywgbW92ZSB0aGluZ3NcbiAgLy8gYXJvdW5kIGEgbGl0dGxlXG4gIGlmIChvcHRzICYmIChvcHRzLmF1ZGlvIHx8IG9wdHMudmlkZW8pKSB7XG4gICAgb3B0cyA9IHtcbiAgICAgIGNvbnN0cmFpbnRzOiBvcHRzXG4gICAgfTtcbiAgfVxuXG4gIC8vIGVuc3VyZSB3ZSBoYXZlIG9wdHNcbiAgb3B0cyA9IGV4dGVuZCh7fSwge1xuICAgIGNhcHR1cmU6IHRydWUsXG4gICAgbXV0ZWQ6IHRydWUsXG4gICAgY29uc3RyYWludHM6IHtcbiAgICAgIHZpZGVvOiB7XG4gICAgICAgIG1hbmRhdG9yeToge30sXG4gICAgICAgIG9wdGlvbmFsOiBbXVxuICAgICAgfSxcbiAgICAgIGF1ZGlvOiB0cnVlXG4gICAgfVxuICB9LCBvcHRzKTtcblxuICAvLyBzYXZlIHRoZSBjb25zdHJhaW50c1xuICB0aGlzLmNvbnN0cmFpbnRzID0gb3B0cy5jb25zdHJhaW50cztcblxuICAvLyBpZiBhIG5hbWUgaGFzIGJlZW4gc3BlY2lmaWVkIGluIHRoZSBvcHRzLCBzYXZlIGl0IHRvIHRoZSBtZWRpYVxuICB0aGlzLm5hbWUgPSBvcHRzLm5hbWU7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgc3RyZWFtIHRvIG51bGxcbiAgdGhpcy5zdHJlYW0gPSBvcHRzLnN0cmVhbSB8fCBudWxsO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIG11dGVkIHN0YXRlXG4gIHRoaXMubXV0ZWQgPSB0eXBlb2Ygb3B0cy5tdXRlZCA9PSAndW5kZWZpbmVkJyB8fCBvcHRzLm11dGVkO1xuXG4gIC8vIGNyZWF0ZSBhIGJpbmRpbmdzIGFycmF5IHNvIHdlIGhhdmUgYSByb3VnaCBpZGVhIG9mIHdoZXJlXG4gIC8vIHdlIGhhdmUgYmVlbiBhdHRhY2hlZCB0b1xuICAvLyBUT0RPOiByZXZpc2l0IHdoZXRoZXIgdGhpcyBpcyB0aGUgYmVzdCB3YXkgdG8gbWFuYWdlIHRoaXNcbiAgdGhpcy5fYmluZGluZ3MgPSBbXTtcblxuICAvLyBpZiB3ZSBhcmUgYXV0b3N0YXJ0aW5nLCBjYXB0dXJlIG1lZGlhIG9uIHRoZSBuZXh0IHRpY2tcbiAgaWYgKG9wdHMuY2FwdHVyZSkge1xuICAgIHNldFRpbWVvdXQodGhpcy5jYXB0dXJlLmJpbmQodGhpcyksIDApO1xuICB9XG59XG5cbnV0aWwuaW5oZXJpdHMoTWVkaWEsIEV2ZW50RW1pdHRlcik7XG5tb2R1bGUuZXhwb3J0cyA9IE1lZGlhO1xuXG4vKipcbiAgIyMjIGNhcHR1cmVcblxuICBgYGBcbiAgY2FwdHVyZShjb25zdHJhaW50cywgY2FsbGJhY2spXG4gIGBgYFxuXG4gIENhcHR1cmUgbWVkaWEuICBJZiBjb25zdHJhaW50cyBhcmUgcHJvdmlkZWQsIHRoZW4gdGhleSB3aWxsXG4gIG92ZXJyaWRlIHRoZSBkZWZhdWx0IGNvbnN0cmFpbnRzIHRoYXQgd2VyZSB1c2VkIHdoZW4gdGhlIG1lZGlhIG9iamVjdCB3YXNcbiAgY3JlYXRlZC5cbioqL1xuTWVkaWEucHJvdG90eXBlLmNhcHR1cmUgPSBmdW5jdGlvbihjb25zdHJhaW50cywgY2FsbGJhY2spIHtcbiAgdmFyIG1lZGlhID0gdGhpcztcbiAgdmFyIGhhbmRsZUVuZCA9IHRoaXMuZW1pdC5iaW5kKHRoaXMsICdlbmQnKTtcblxuICAvLyBpZiB3ZSBhbHJlYWR5IGhhdmUgYSBzdHJlYW0sIHRoZW4gYWJvcnRcbiAgaWYgKHRoaXMuc3RyZWFtKSB7IHJldHVybjsgfVxuXG4gIC8vIGlmIG5vIGNvbnN0cmFpbnRzIGhhdmUgYmVlbiBwcm92aWRlZCwgYnV0IHdlIGhhdmVcbiAgLy8gYSBjYWxsYmFjaywgZGVhbCB3aXRoIGl0XG4gIGlmICh0eXBlb2YgY29uc3RyYWludHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gY29uc3RyYWludHM7XG4gICAgY29uc3RyYWludHMgPSB0aGlzLmNvbnN0cmFpbnRzO1xuICB9XG5cbiAgLy8gaWYgd2UgaGF2ZSBhIGNhbGxiYWNrLCBiaW5kIHRvIHRoZSBzdGFydCBldmVudFxuICBpZiAodHlwZW9mIGNhbGxiYWNrID09ICdmdW5jdGlvbicpIHtcbiAgICB0aGlzLm9uY2UoJ2NhcHR1cmUnLCBjYWxsYmFjay5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIC8vIGdldCB1c2VyIG1lZGlhLCB1c2luZyBlaXRoZXIgdGhlIHByb3ZpZGVkIGNvbnN0cmFpbnRzIG9yIHRoZVxuICAvLyBkZWZhdWx0IGNvbnN0cmFpbnRzXG4gIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEoXG4gICAgY29uc3RyYWludHMgfHwgdGhpcy5jb25zdHJhaW50cyxcbiAgICBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgIGlmICh0eXBlb2Ygc3RyZWFtLmFkZEV2ZW50TGlzdGVuZXIgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBzdHJlYW0uYWRkRXZlbnRMaXN0ZW5lcignZW5kZWQnLCBoYW5kbGVFbmQpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHN0cmVhbS5vbmVuZGVkID0gaGFuZGxlRW5kO1xuICAgICAgfVxuXG4gICAgICAvLyBzYXZlIHRoZSBzdHJlYW0gYW5kIGVtaXQgdGhlIHN0YXJ0IG1ldGhvZFxuICAgICAgbWVkaWEuc3RyZWFtID0gc3RyZWFtO1xuICAgICAgbWVkaWEuZW1pdCgnY2FwdHVyZScsIHN0cmVhbSk7XG4gICAgfSxcbiAgICB0aGlzLl9oYW5kbGVGYWlsLmJpbmQodGhpcylcbiAgKTtcbn07XG5cbi8qKlxuICAjIyMgcmVuZGVyXG5cbiAgYGBganNcbiAgcmVuZGVyKHRhcmdldCwgb3B0cz8sIGNhbGxiYWNrPylcbiAgYGBgXG5cbiAgUmVuZGVyIHRoZSBjYXB0dXJlZCBtZWRpYSB0byB0aGUgc3BlY2lmaWVkIHRhcmdldCBlbGVtZW50LiAgV2hpbGUgcHJldmlvdXNcbiAgdmVyc2lvbnMgb2YgcnRjLW1lZGlhIGFjY2VwdGVkIGEgc2VsZWN0b3Igc3RyaW5nIG9yIGFuIGFycmF5IG9mIGVsZW1lbnRzXG4gIHRoaXMgaGFzIGJlZW4gZHJvcHBlZCBpbiBmYXZvdXIgb2YgX19vbmUgc2luZ2xlIHRhcmdldCBlbGVtZW50X18uXG5cbiAgSWYgdGhlIHRhcmdldCBlbGVtZW50IGlzIGEgdmFsaWQgTWVkaWFFbGVtZW50IHRoZW4gaXQgd2lsbCBiZWNvbWUgdGhlXG4gIHRhcmdldCBvZiB0aGUgY2FwdHVyZWQgbWVkaWEgc3RyZWFtLiAgSWYsIGhvd2V2ZXIsIGl0IGlzIGEgZ2VuZXJpYyBET01cbiAgZWxlbWVudCBpdCB3aWxsIGEgbmV3IE1lZGlhIGVsZW1lbnQgd2lsbCBiZSBjcmVhdGVkIHRoYXQgdXNpbmcgdGhlIHRhcmdldFxuICBhcyBpdCdzIHBhcmVudC5cblxuICBBIHNpbXBsZSBleGFtcGxlIG9mIHJlcXVlc3RpbmcgZGVmYXVsdCBtZWRpYSBjYXB0dXJlIGFuZCByZW5kZXJpbmcgdG8gdGhlXG4gIGRvY3VtZW50IGJvZHkgaXMgc2hvd24gYmVsb3c6XG5cbiAgYGBganNcbiAgdmFyIG1lZGlhID0gcmVxdWlyZSgncnRjLW1lZGlhJyk7IC8vIG9yIHJlcXVpcmUoJ3J0Yy9tZWRpYScpXG5cbiAgLy8gc3RhcnQgdGhlIHN0cmVhbSBhbmQgcmVuZGVyIHRvIHRoZSBkb2N1bWVudCBib2R5IG9uY2UgYWN0aXZlXG4gIG1lZGlhKCkucmVuZGVyKGRvY3VtZW50LmJvZHkpO1xuICBgYGBcblxuICBZb3UgbWF5IG9wdGlvbmFsbHkgcHJvdmlkZSBhIGNhbGxiYWNrIHRvIHRoaXMgZnVuY3Rpb24sIHdoaWNoIGlzXG4gIHdpbGwgYmUgdHJpZ2dlcmVkIG9uY2UgZWFjaCBvZiB0aGUgbWVkaWEgZWxlbWVudHMgaGFzIHN0YXJ0ZWQgcGxheWluZ1xuICB0aGUgc3RyZWFtOlxuXG4gIGBgYGpzXG4gIG1lZGlhKCkucmVuZGVyKGRvY3VtZW50LmJvZHksIGZ1bmN0aW9uKGVsZW1lbnRzKSB7XG4gICAgY29uc29sZS5sb2coJ2NhcHR1cmVkIGFuZCBwbGF5aW5nJyk7XG4gIH0pO1xuICBgYGBcblxuKiovXG5NZWRpYS5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24odGFyZ2V0LCBvcHRzLCBjYWxsYmFjaykge1xuICAvLyBpZiB0aGUgdGFyZ2V0IGlzIGFuIGFycmF5LCBleHRyYWN0IHRoZSBmaXJzdCBlbGVtZW50XG4gIGlmIChBcnJheS5pc0FycmF5KHRhcmdldCkpIHtcbiAgICAvLyBsb2cgYSB3YXJuaW5nXG4gICAgY29uc29sZS5sb2coJ1dBUk5JTkc6IHJ0Yy1tZWRpYSByZW5kZXIgKGFzIG9mIDEueCkgZXhwZWN0cyBhIHNpbmdsZSB0YXJnZXQnKTtcbiAgICB0YXJnZXQgPSB0YXJnZXRbMF07XG4gIH1cblxuICBpZiAodHlwZW9mIG9wdHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICBvcHRzID0ge307XG4gIH1cblxuICAvLyBlbnN1cmUgd2UgaGF2ZSBvcHRzXG4gIG9wdHMgPSBvcHRzIHx8IHt9O1xuXG4gIC8vIGNyZWF0ZSB0aGUgdmlkZW8gLyBhdWRpbyBlbGVtZW50c1xuICB0YXJnZXQgPSB0aGlzLl9wcmVwYXJlRWxlbWVudChvcHRzLCB0YXJnZXQpO1xuXG4gIC8vIGlmIG5vIHN0cmVhbSB3YXMgc3BlY2lmaWVkLCB3YWl0IGZvciB0aGUgc3RyZWFtIHRvIGluaXRpYWxpemVcbiAgaWYgKCEgdGhpcy5zdHJlYW0pIHtcbiAgICB0aGlzLm9uY2UoJ2NhcHR1cmUnLCB0aGlzLl9iaW5kU3RyZWFtLmJpbmQodGhpcykpO1xuICB9XG4gIC8vIG90aGVyd2lzZSwgYmluZCB0aGUgc3RyZWFtIG5vd1xuICBlbHNlIHtcbiAgICB0aGlzLl9iaW5kU3RyZWFtKHRoaXMuc3RyZWFtKTtcbiAgfVxuXG4gIC8vIGlmIHdlIGhhdmUgYSBjYWxsYmFjayB0aGVuIHRyaWdnZXIgb24gdGhlIHJlbmRlciBldmVudFxuICBpZiAodHlwZW9mIGNhbGxiYWNrID09ICdmdW5jdGlvbicpIHtcbiAgICB0aGlzLm9uY2UoJ3JlbmRlcicsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIHJldHVybiB0YXJnZXQ7XG59O1xuXG4vKipcbiAgIyMjIHN0b3AoKVxuXG4gIFN0b3AgdGhlIG1lZGlhIHN0cmVhbVxuKiovXG5NZWRpYS5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgdmFyIG1lZGlhID0gdGhpcztcblxuICBpZiAoISB0aGlzLnN0cmVhbSkgeyByZXR1cm47IH1cblxuICAvLyByZW1vdmUgYmluZGluZ3NcbiAgdGhpcy5fdW5iaW5kKG9wdHMpO1xuXG4gIC8vIHN0b3AgdGhlIHN0cmVhbSwgYW5kIHRlbGwgdGhlIHdvcmxkXG4gIHRoaXMuc3RyZWFtLnN0b3AoKTtcblxuICAvLyBvbiBjYXB0dXJlIHJlYmluZFxuICB0aGlzLm9uY2UoJ2NhcHR1cmUnLCBtZWRpYS5fYmluZFN0cmVhbS5iaW5kKG1lZGlhKSk7XG5cbiAgLy8gcmVtb3ZlIHRoZSByZWZlcmVuY2UgdG8gdGhlIHN0cmVhbVxuICB0aGlzLnN0cmVhbSA9IG51bGw7XG59O1xuXG4vKipcbiAgIyMgRGVidWdnaW5nIFRpcHNcblxuICBDaHJvbWUgYW5kIENocm9taXVtIGNhbiBib3RoIGJlIHN0YXJ0ZWQgd2l0aCB0aGUgZm9sbG93aW5nIGZsYWc6XG5cbiAgYGBgXG4gIC0tdXNlLWZha2UtZGV2aWNlLWZvci1tZWRpYS1zdHJlYW1cbiAgYGBgXG5cbiAgVGhpcyB1c2VzIGEgZmFrZSBzdHJlYW0gZm9yIHRoZSBnZXRVc2VyTWVkaWEoKSBjYWxsIHJhdGhlciB0aGFuIGF0dGVtcHRpbmdcbiAgdG8gY2FwdHVyZSB0aGUgYWN0dWFsIGNhbWVyYS4gIFRoaXMgaXMgdXNlZnVsIHdoZW4gZG9pbmcgYXV0b21hdGVkIHRlc3RpbmdcbiAgYW5kIGFsc28gaWYgeW91IHdhbnQgdG8gdGVzdCBjb25uZWN0aXZpdHkgYmV0d2VlbiB0d28gYnJvd3NlciBpbnN0YW5jZXMgYW5kXG4gIHdhbnQgdG8gZGlzdGluZ3Vpc2ggYmV0d2VlbiB0aGUgdHdvIGxvY2FsIHZpZGVvcy5cblxuICAjIyBJbnRlcm5hbCBNZXRob2RzXG5cbiAgVGhlcmUgYXJlIGEgbnVtYmVyIG9mIGludGVybmFsIG1ldGhvZHMgdGhhdCBhcmUgdXNlZCBpbiB0aGUgYHJ0Yy1tZWRpYWBcbiAgaW1wbGVtZW50YXRpb24uIFRoZXNlIGFyZSBvdXRsaW5lZCBiZWxvdywgYnV0IG5vdCBleHBlY3RlZCB0byBiZSBvZlxuICBnZW5lcmFsIHVzZS5cblxuKiovXG5cbi8qKlxuICAjIyMgX3ByZXBhcmVFbGVtZW50KG9wdHMsIGVsZW1lbnQpXG5cbiAgVGhlIHByZXBhcmVFbGVtZW50IGZ1bmN0aW9uIGlzIHVzZWQgdG8gcHJlcGFyZSBET00gZWxlbWVudHMgdGhhdCB3aWxsXG4gIHJlY2VpdmUgdGhlIG1lZGlhIHN0cmVhbXMgb25jZSB0aGUgc3RyZWFtIGhhdmUgYmVlbiBzdWNjZXNzZnVsbHkgY2FwdHVyZWQuXG4qKi9cbk1lZGlhLnByb3RvdHlwZS5fcHJlcGFyZUVsZW1lbnQgPSBmdW5jdGlvbihvcHRzLCBlbGVtZW50KSB7XG4gIHZhciBwYXJlbnQ7XG4gIHZhciB2YWxpZEVsZW1lbnQgPSAoZWxlbWVudCBpbnN0YW5jZW9mIEhUTUxWaWRlb0VsZW1lbnQpIHx8XG4gICAgICAgIChlbGVtZW50IGluc3RhbmNlb2YgSFRNTEF1ZGlvRWxlbWVudCk7XG4gIHZhciBwcmVzZXJ2ZUFzcGVjdFJhdGlvID1cbiAgICAgICAgdHlwZW9mIG9wdHMucHJlc2VydmVBc3BlY3RSYXRpbyA9PSAndW5kZWZpbmVkJyB8fFxuICAgICAgICBvcHRzLnByZXNlcnZlQXNwZWN0UmF0aW87XG5cbiAgLy8gcGVyZm9ybSBzb21lIGFkZGl0aW9uYWwgY2hlY2tzIGZvciB0aGluZ3MgdGhhdCBcImxvb2tcIiBsaWtlIGFcbiAgLy8gbWVkaWEgZWxlbWVudFxuICB2YWxpZEVsZW1lbnQgPSB2YWxpZEVsZW1lbnQgfHwgKHR5cGVvZiBlbGVtZW50LnBsYXkgPT0gJ2Z1bmN0aW9uJykgJiYgKFxuICAgIHR5cGVvZiBlbGVtZW50Lm1velNyY09iamVjdCAhPSAndW5kZWZpbmVkJyB8fFxuICAgIHR5cGVvZiBlbGVtZW50LnNyYyAhPSAndW5kZWZpbmVkJyk7XG5cbiAgLy8gaWYgdGhlIGVsZW1lbnQgaXMgbm90IGEgdmlkZW8gZWxlbWVudCwgdGhlbiBjcmVhdGUgb25lXG4gIGlmICghIHZhbGlkRWxlbWVudCkge1xuICAgIHBhcmVudCA9IGVsZW1lbnQ7XG5cbiAgICAvLyBjcmVhdGUgYSBuZXcgdmlkZW8gZWxlbWVudFxuICAgIC8vIFRPRE86IGNyZWF0ZSBhbiBhcHByb3ByaWF0ZSBlbGVtZW50IGJhc2VkIG9uIHRoZSB0eXBlcyBvZiB0cmFja3NcbiAgICAvLyBhdmFpbGFibGVcbiAgICBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndmlkZW8nKTtcblxuICAgIC8vIGlmIHdlIGFyZSBwcmVzZXJ2aW5nIGFzcGVjdCByYXRpbyBkbyB0aGF0IG5vd1xuICAgIGlmIChwcmVzZXJ2ZUFzcGVjdFJhdGlvKSB7XG4gICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgncHJlc2VydmVBc3BlY3RSYXRpbycsICcnKTtcbiAgICB9XG5cbiAgICAvLyBhZGQgdG8gdGhlIHBhcmVudFxuICAgIHBhcmVudC5hcHBlbmRDaGlsZChlbGVtZW50KTtcbiAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnZGF0YS1wbGF5aW5nJywgZmFsc2UpO1xuICB9XG5cbiAgLy8gaWYgbXV0ZWQsIGluamVjdCB0aGUgbXV0ZWQgYXR0cmlidXRlXG4gIGlmIChlbGVtZW50ICYmIHRoaXMubXV0ZWQpIHtcbiAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnbXV0ZWQnLCAnJyk7XG4gIH1cblxuICAvLyBmbGFnIHRoZSBlbGVtZW50IGFzIGJvdW5kXG4gIHRoaXMuX2JpbmRpbmdzLnB1c2goe1xuICAgIGVsOiBlbGVtZW50LFxuICAgIG9wdHM6IG9wdHNcbiAgfSk7XG5cbiAgcmV0dXJuIGVsZW1lbnQ7XG59O1xuXG4vKipcbiAgIyMjIF9iaW5kU3RyZWFtKHN0cmVhbSlcblxuICBCaW5kIGEgc3RyZWFtIHRvIHByZXZpb3VzbHkgcHJlcGFyZWQgRE9NIGVsZW1lbnRzLlxuXG4qKi9cbk1lZGlhLnByb3RvdHlwZS5fYmluZFN0cmVhbSA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICB2YXIgbWVkaWEgPSB0aGlzO1xuICB2YXIgZWxlbWVudHMgPSBbXTtcbiAgdmFyIHdhaXRpbmcgPSBbXTtcblxuICBmdW5jdGlvbiBjaGVja1dhaXRpbmcoKSB7XG4gICAgLy8gaWYgd2UgaGF2ZSBubyB3YWl0aW5nIGVsZW1lbnRzLCBidXQgc29tZSBlbGVtZW50c1xuICAgIC8vIHRyaWdnZXIgdGhlIHN0YXJ0IGV2ZW50XG4gICAgaWYgKHdhaXRpbmcubGVuZ3RoID09PSAwICYmIGVsZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgIG1lZGlhLmVtaXQoJ3JlbmRlcicsIGVsZW1lbnRzKTtcblxuICAgICAgZWxlbWVudHMubWFwKGZ1bmN0aW9uKGVsKSB7XG4gICAgICAgIGVsLnNldEF0dHJpYnV0ZSgnZGF0YS1wbGF5aW5nJywgdHJ1ZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBwbGF5YmFja1N0YXJ0ZWQoZXZ0KSB7XG4gICAgdmFyIGVsID0gZXZ0LnRhcmdldCB8fCBldnQuc3JjRWxlbWVudDtcbiAgICB2YXIgdmlkZW9JbmRleCA9IGVsZW1lbnRzLmluZGV4T2YoZWwpO1xuXG4gICAgaWYgKHZpZGVvSW5kZXggPj0gMCkge1xuICAgICAgd2FpdGluZy5zcGxpY2UodmlkZW9JbmRleCwgMSk7XG4gICAgfVxuXG4gICAgZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcigncGxheWluZycsIHBsYXliYWNrU3RhcnRlZCk7XG4gICAgY2hlY2tXYWl0aW5nKCk7XG4gIH1cblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIGJpbmRpbmdzIGFuZCBiaW5kIHRoZSBzdHJlYW1cbiAgZWxlbWVudHMgPSB0aGlzLl9iaW5kaW5ncy5tYXAoZnVuY3Rpb24oYmluZGluZykge1xuICAgIC8vIGNoZWNrIGZvciBtb3pTcmNPYmplY3RcbiAgICBpZiAodHlwZW9mIGJpbmRpbmcuZWwubW96U3JjT2JqZWN0ICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICBiaW5kaW5nLmVsLm1velNyY09iamVjdCA9IHN0cmVhbTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBiaW5kaW5nLmVsLnNyYyA9IG1lZGlhLl9jcmVhdGVPYmplY3RVUkwoc3RyZWFtKSB8fCBzdHJlYW07XG4gICAgfVxuXG4gICAgLy8gYXR0ZW1wdCB0byBwbGF5IHRoZSB2aWRlb1xuICAgIGlmICh0eXBlb2YgYmluZGluZy5lbC5wbGF5ID09ICdmdW5jdGlvbicpIHtcbiAgICAgIGJpbmRpbmcuZWwucGxheSgpO1xuICAgIH1cblxuICAgIHJldHVybiBiaW5kaW5nLmVsO1xuICB9KTtcblxuICAvLyBmaW5kIHRoZSBlbGVtZW50cyB3ZSBhcmUgd2FpdGluZyBvblxuICB3YWl0aW5nID0gZWxlbWVudHMuZmlsdGVyKGZ1bmN0aW9uKGVsKSB7XG4gICAgcmV0dXJuIGVsLnJlYWR5U3RhdGUgPCAzOyAvLyByZWFkeXN0YXRlIDwgSEFWRV9GVVRVUkVfREFUQVxuICB9KTtcblxuICAvLyB3YWl0IGZvciBhbGwgdGhlIHZpZGVvIGVsZW1lbnRzXG4gIHdhaXRpbmcubWFwKGZ1bmN0aW9uKGVsKSB7XG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcigncGxheWluZycsIHBsYXliYWNrU3RhcnRlZCwgZmFsc2UpO1xuICB9KTtcblxuICBjaGVja1dhaXRpbmcoKTtcbn07XG5cbi8qKlxuICAjIyMgX3VuYmluZCgpXG5cbiAgR3JhY2VmdWxseSBkZXRhY2ggZWxlbWVudHMgdGhhdCBhcmUgdXNpbmcgdGhlIHN0cmVhbSBmcm9tIHRoZVxuICBjdXJyZW50IHN0cmVhbS5cbioqL1xuTWVkaWEucHJvdG90eXBlLl91bmJpbmQgPSBmdW5jdGlvbihvcHRzKSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIG9wdHNcbiAgb3B0cyA9IG9wdHMgfHwge307XG5cbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBiaW5kaW5ncyBhbmQgZGV0YWNoIHN0cmVhbXNcbiAgdGhpcy5fYmluZGluZ3MuZm9yRWFjaChmdW5jdGlvbihiaW5kaW5nKSB7XG4gICAgdmFyIGVsZW1lbnQgPSBiaW5kaW5nLmVsO1xuXG4gICAgLy8gcmVtb3ZlIHRoZSBzb3VyY2VcbiAgICBlbGVtZW50LnNyYyA9IG51bGw7XG5cbiAgICAvLyBjaGVjayBmb3IgbW96XG4gICAgaWYgKGVsZW1lbnQubW96U3JjT2JqZWN0KSB7XG4gICAgICBlbGVtZW50Lm1velNyY09iamVjdCA9IG51bGw7XG4gICAgfVxuXG4gICAgLy8gY2hlY2sgZm9yIGN1cnJlbnRTcmNcbiAgICBpZiAoZWxlbWVudC5jdXJyZW50U3JjKSB7XG4gICAgICBlbGVtZW50LmN1cnJlbnRTcmMgPSBudWxsO1xuICAgIH1cbiAgfSk7XG59O1xuXG4vKipcbiAgIyMjIF9jcmVhdGVPYmplY3RVcmwoc3RyZWFtKVxuXG4gIFRoaXMgbWV0aG9kIGlzIHVzZWQgdG8gY3JlYXRlIGFuIG9iamVjdCB1cmwgdGhhdCBjYW4gYmUgYXR0YWNoZWQgdG8gYSB2aWRlb1xuICBvciBhdWRpbyBlbGVtZW50LiAgT2JqZWN0IHVybHMgYXJlIGNhY2hlZCB0byBlbnN1cmUgb25seSBvbmUgaXMgY3JlYXRlZFxuICBwZXIgc3RyZWFtLlxuKiovXG5NZWRpYS5wcm90b3R5cGUuX2NyZWF0ZU9iamVjdFVSTCA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICB0cnkge1xuICAgIHJldHVybiB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChzdHJlYW0pO1xuICB9XG4gIGNhdGNoIChlKSB7XG4gIH1cbn07XG5cbi8qKlxuICAjIyMgX2hhbmRsZVN1Y2Nlc3Moc3RyZWFtKVxuXG4gIEhhbmRsZSB0aGUgc3VjY2VzcyBjb25kaXRpb24gb2YgYSBgZ2V0VXNlck1lZGlhYCBjYWxsLlxuXG4qKi9cbk1lZGlhLnByb3RvdHlwZS5faGFuZGxlU3VjY2VzcyA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICAvLyB1cGRhdGUgdGhlIGFjdGl2ZSBzdHJlYW0gdGhhdCB3ZSBhcmUgY29ubmVjdGVkIHRvXG4gIHRoaXMuc3RyZWFtID0gc3RyZWFtO1xuXG4gIC8vIGVtaXQgdGhlIHN0cmVhbSBldmVudFxuICB0aGlzLmVtaXQoJ3N0cmVhbScsIHN0cmVhbSk7XG59O1xuXG4vKipcbiAgIyMjIF9oYW5kbGVGYWlsKGV2dClcblxuICBIYW5kbGUgdGhlIGZhaWx1cmUgY29uZGl0aW9uIG9mIGEgYGdldFVzZXJNZWRpYWAgY2FsbC5cblxuKiovXG5NZWRpYS5wcm90b3R5cGUuX2hhbmRsZUZhaWwgPSBmdW5jdGlvbigpIHtcbiAgLy8gVE9ETzogbWFrZSB0aGlzIG1vcmUgZnJpZW5kbHlcbiAgdGhpcy5lbWl0KCdlcnJvcicsIG5ldyBFcnJvcignVW5hYmxlIHRvIGNhcHR1cmUgcmVxdWVzdGVkIG1lZGlhJykpO1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyMjIGFubm91bmNlXG5cbiAgYGBgXG4gIC9hbm5vdW5jZXx7fVxuICBgYGBcblxuICBXaGVuIGFuIGFubm91bmNlIG1lc3NhZ2UgaXMgcmVjZWl2ZWQgYnkgdGhlIHNvY2tldCBzY29wZSwgdGhlIGF0dGFjaGVkXG4gIG9iamVjdCBkYXRhIGlzIGRlY29kZWQgYW5kIHRoZSBzY29wZSBlbWl0cyBhbiBgYW5ub3VuY2VgIG1lc3NhZ2UuXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzY29wZSkge1xuICByZXR1cm4gZnVuY3Rpb24oYXJncykge1xuICAgIHZhciBwYXlsb2FkO1xuXG4gICAgdHJ5IHtcbiAgICAgIHBheWxvYWQgPSBKU09OLnBhcnNlKGFyZ3NbMF0pO1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgIH1cblxuICAgIGlmICghIHBheWxvYWQpIHtcbiAgICAgIHJldHVybiBzY29wZS5lbWl0KCdlcnJvcicsICdVbmFibGUgdG8gYW5ub3VuY2UsIGludmFsaWQgSlNPTjogJyArIGFyZ3NbMF0pO1xuICAgIH1cblxuICAgIHJldHVybiBzY29wZS5lbWl0KCdhbm5vdW5jZScsIHBheWxvYWQpO1xuICB9O1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyMgc2lnbmFsbGVyIG1lc3NhZ2UgaGFuZGxlcnNcblxuKiovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2NvcGUpIHtcbiAgcmV0dXJuIHtcbiAgICBhbm5vdW5jZTogcmVxdWlyZSgnLi9hbm5vdW5jZScpKHNjb3BlKSxcbiAgICByZXF1ZXN0OiByZXF1aXJlKCcuL3JlcXVlc3QnKShzY29wZSlcbiAgfTtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMjIyByZXF1ZXN0XG5cbiAgYGBgXG4gIC9yZXF1ZXN0fHtcImtleVwiOlwidmFsdWVcIixcIl9fc3JjaWRcIjogXCJcIiwgXCJfX3JlcWlkXCI6IFwiXCJ9XG4gIGBgYFxuXG4gIEEgcmVxdWVzdCBpcyBiYXNpY2FsbHkgYSBcInNlYXJjaCBmb3IgYSBmcmllbmRcIiBtZXNzYWdlLiAgVGhpcyBpcyB3aGVyZSBvbmVcbiAgcGVlciBpbiB0aGUgbWVzaCBpcyBzZWFyY2hpbmcgZm9yIGFub3RoZXIgcGVlciBiYXNlZCBvbiBwYXJ0aWN1bGFyIGNyaXRlcmlhLlxuICBJbiBnZW5lcmFsLCBhIHJlcXVlc3QgbWVzc2FnZSBpcyBkZWxpdmVyZWQgdG8gYWxsIHBlZXJzIHdpdGhpbiB0aGUgbWVzaFxuICBhbmQgdGhlbiB0aG9zZSBwZWVycyB0aGF0IGFyZSBub3QgaW4gYSBibG9ja2VkIHN0YXRlIHdpbGwgcmVzcG9uZC5cblxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNjb3BlKSB7XG4gIHZhciBhdHRyaWJ1dGVzID0gc2NvcGUuYXR0cmlidXRlcztcblxuICBmdW5jdGlvbiBhY2tSZXF1ZXN0KGRhdGEpIHtcbiAgICAvLyBsb29rIGZvciByZXF1ZXN0IGxpc3RlbmVyc1xuICAgIHZhciBsaXN0ZW5lcnMgPSBzY29wZS5saXN0ZW5lcnMoJ3JlcXVlc3QnKTtcblxuICAgIC8vIFRPRE86IHRyaWdnZXIgbGlzdGVuZXJzLCB3YWl0IGZvciBjb21wbGV0aW9uXG4gICAgaWYgKGxpc3RlbmVycyAmJiBsaXN0ZW5lcnMubGVuZ3RoID4gMCkge1xuICAgIH1cblxuICAgIC8vIHNlbmQgdGhlIGFjayByZXF1ZXN0XG4gICAgc2NvcGUuc2VuZChcbiAgICAgICcvdG8nLCBkYXRhLl9fc3JjaWQsXG4gICAgICAnL2Fja3JlcScsIGRhdGEuX19yZXFpZCwgc2NvcGUuaWRcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB2YXIgbWF0Y2ggPSB0cnVlO1xuICAgIHZhciB0ZXN0S2V5cztcblxuICAgIHRyeSB7XG4gICAgICAvLyBjb252ZXJ0IHRvIEpTT05cbiAgICAgIGRhdGEgPSBKU09OLnBhcnNlKGRhdGEpO1xuICAgIH1cbiAgICBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIGdldCB0aGUgdGVzdGtleXNcbiAgICB0ZXN0S2V5cyA9IE9iamVjdC5rZXlzKGRhdGEpLmZpbHRlcihmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBrZXkuY2hhckF0KDApICE9PSAnXyc7XG4gICAgfSk7XG5cbiAgICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHRlc3Qga2V5cyBhbmQgbG9vayBmb3IgYSBtYXRjaFxuICAgIG1hdGNoID0gdGVzdEtleXMucmVkdWNlKGZ1bmN0aW9uKG1lbW8sIGtleSkge1xuICAgICAgLy8gY2hlY2sgZm9yIGEgbWF0Y2hcbiAgICAgIHJldHVybiBtZW1vICYmIGF0dHJpYnV0ZXNba2V5XSA9PT0gZGF0YVtrZXldO1xuICAgIH0sIG1hdGNoKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYSBtYXRjaCwgdGhlbiBhY2tub3dsZWRnZSB0aGUgcmVxdWVzdFxuICAgIGlmIChtYXRjaCkge1xuICAgICAgLy8gaWYgdGhlcmUgYXJlIGFjdGl2ZSBibG9ja3MsIHJldHVyblxuICAgICAgaWYgKHNjb3BlLmJsb2Nrcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHNjb3BlLm9uKCd1bmJsb2NrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgYWNrUmVxdWVzdChkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBhY2tSZXF1ZXN0KGRhdGEpO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcbnZhciB1dWlkID0gcmVxdWlyZSgndXVpZCcpO1xudmFyIGV4dGVuZCA9IHJlcXVpcmUoJ2NvZy9leHRlbmQnKTtcblxuLyoqXG4gICMgcnRjLXNpZ25hbGxlclxuXG4gIFRoZSBgcnRjLXNpZ25hbGxlcmAgbW9kdWxlIHByb3ZpZGVzIGEgdHJhbnNwb3J0bGVzcyBzaWduYWxsaW5nXG4gIG1lY2hhbmlzbSBmb3IgV2ViUlRDLlxuXG4gICMjIFB1cnBvc2VcblxuICBUaGUgc2lnbmFsbGVyIHByb3ZpZGVzIHNldCBvZiBjbGllbnQtc2lkZSB0b29scyB0aGF0IGFzc2lzdCB3aXRoIHRoZVxuICBzZXR0aW5nIHVwIGFuIGBQZWVyQ29ubmVjdGlvbmAgYW5kIGhlbHBpbmcgdGhlbSBjb21tdW5pY2F0ZS4gQWxsIHRoYXQgaXNcbiAgcmVxdWlyZWQgZm9yIHRoZSBzaWduYWxsZXIgdG8gb3BlcmF0ZSBpcyBhIHN1aXRhYmxlIG1lc3Nlbmdlci5cblxuICBBIG1lc3NlbmdlciBpcyBhIHNpbXBsZSBvYmplY3QgdGhhdCBpbXBsZW1lbnRzIG5vZGVcbiAgW0V2ZW50RW1pdHRlcl0oaHR0cDovL25vZGVqcy5vcmcvYXBpL2V2ZW50cy5odG1sKSBzdHlsZSBgb25gIGV2ZW50cyBmb3JcbiAgYG9wZW5gLCBgY2xvc2VgLCBgbWVzc2FnZWAgZXZlbnRzLCBhbmQgYWxzbyBhIGBzZW5kYCBtZXRob2QgYnkgd2hpY2hcbiAgZGF0YSB3aWxsIGJlIHNlbmQgXCJvdmVyLXRoZS13aXJlXCIuXG5cbiAgQnkgdXNpbmcgdGhpcyBhcHByb2FjaCwgd2UgY2FuIGNvbmR1Y3Qgc2lnbmFsbGluZyBvdmVyIGFueSBudW1iZXIgb2ZcbiAgbWVjaGFuaXNtczpcblxuICAtIGxvY2FsLCBpbiBtZW1vcnkgbWVzc2FnZSBwYXNzaW5nXG4gIC0gdmlhIFdlYlNvY2tldHMgYW5kIGhpZ2hlciBsZXZlbCBhYnN0cmFjdGlvbnMgKHN1Y2ggYXNcbiAgICBbcHJpbXVzXShodHRwczovL2dpdGh1Yi5jb20vcHJpbXVzL3ByaW11cykpXG4gIC0gYWxzbyBvdmVyIFdlYlJUQyBkYXRhLWNoYW5uZWxzICh2ZXJ5IG1ldGEsIGFuZCBhZG1pdHRlZGx5IGEgbGl0dGxlXG4gICAgY29tcGxpY2F0ZWQpLlxuXG4gICMjIEdldHRpbmcgU3RhcnRlZFxuXG4gIFRvIHdvcmsgd2l0aCB0aGUgc2lnbmFsbGVyLCB5b3UgZmlyc3QgbmVlZCBhIG1lc3NlbmdlciBvZiBzb21lIGtpbmQuIElmIHlvdVxuICBoYXZlIHJ1biB1cCBhIHZlcnNpb24gb2YgdGhlXG4gIFtydGMtc3dpdGNoYm9hcmRdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLXN3aXRjaGJvYXJkKSBzb21ld2hlcmUgdGhlblxuICB0aGUgZm9sbG93aW5nIGV4YW1wbGUgc2hvdWxkIHdvcms6XG5cbiAgPDw8IGV4YW1wbGVzL3NpZ25hbGxpbmctdmlhLXN3aXRjaGJvYXJkLmpzXG5cbiAgV2hpbGUgdGhlIGV4YW1wbGUgYWJvdmUgZGVtb25zdHJhdGVzIGNvbW11bmljYXRpb24gYmV0d2VlbiB0d28gZW5kcG9pbnRzXG4gIHZpYSB3ZWJzb2NrZXRzLCBpdCBkb2VzIG5vdCBnbyBpbnRvIGRldGFpbCBvbiBzZXR0aW5nIHVwIGEgV2ViUlRDIHBlZXJcbiAgY29ubmVjdGlvbiAoYXMgdGhhdCBpcyBzaWduaWZpY2FudGx5IG1vcmUgaW52b2x2ZWQpLiAgSWYgeW91IGFyZSBsb29raW5nIGZvclxuICBhbiBlYXN5IHdheSB0byBkbyB0aGlzLCBJJ2QgcmVjb21tZW5kIGNoZWNraW5nIG91dFxuICBbcnRjLXF1aWNrY29ubmVjdF0oaHR0cHM6Ly9naXRodWIuY29tL3J0Yy1pby9ydGMtcXVpY2tjb25uZWN0KSBvclxuICBbcnRjLWdsdWVdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLWdsdWUpLlxuXG4gICMjIFJlZmVyZW5jZVxuXG4gIFRoZSBgcnRjLXNpZ25hbGxlcmAgbW9kdWxlIGlzIGRlc2lnbmVkIHRvIGJlIHVzZWQgcHJpbWFyaWx5IGluIGEgZnVuY3Rpb25hbFxuICB3YXkgYW5kIHdoZW4gY2FsbGVkIGl0IGNyZWF0ZXMgYSBuZXcgc2lnbmFsbGVyIHRoYXQgd2lsbCBlbmFibGVcbiAgeW91IHRvIGNvbW11bmljYXRlIHdpdGggb3RoZXIgcGVlcnMgdmlhIHlvdXIgbWVzc2FnaW5nIG5ldHdvcmsuXG5cbiAgYGBganNcbiAgLy8gY3JlYXRlIGEgc2lnbmFsbGVyIGZyb20gc29tZXRoaW5nIHRoYXQga25vd3MgaG93IHRvIHNlbmQgbWVzc2FnZXNcbiAgdmFyIHNpZ25hbGxlciA9IHJlcXVpcmUoJ3J0Yy1zaWduYWxsZXInKShtZXNzZW5nZXIpO1xuICBgYGBcblxuKiovXG52YXIgc2lnID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihtZXNzZW5nZXIsIG9wdHMpIHtcblxuICAvLyBjcmVhdGUgdGhlIHNpZ25hbGxlclxuICB2YXIgc2lnbmFsbGVyID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIGlkXG4gIHZhciBpZCA9IHNpZ25hbGxlci5pZCA9IHV1aWQudjQoKTtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBhdHRyaWJ1dGVzXG4gIHZhciBhdHRyaWJ1dGVzID0gc2lnbmFsbGVyLmF0dHJpYnV0ZXMgPSB7XG4gICAgaWQ6IGlkXG4gIH07XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgZGF0YSBldmVudCBuYW1lXG4gIHZhciBkYXRhRXZlbnQgPSAob3B0cyB8fCB7fSkuZGF0YUV2ZW50IHx8ICdkYXRhJztcbiAgdmFyIG9wZW5FdmVudCA9IChvcHRzIHx8IHt9KS5vcGVuRXZlbnQgfHwgJ29wZW4nO1xuXG4gIC8vIGRldGVybWluZSB3aGV0aGVyIHdlIHNob3VsZCB1c2UgYSB3cml0ZSBvciBzZW5kIGZ1bmN0aW9uXG4gIHZhciB3cml0ZSA9IHR5cGVvZiBtZXNzZW5nZXIud3JpdGUgPT0gJ2Z1bmN0aW9uJyA/XG4gICAgICAgICAgICAgICAgbWVzc2VuZ2VyLndyaXRlIDpcbiAgICAgICAgICAgICAgICBtZXNzZW5nZXIuc2VuZDtcblxuICAvLyBkZXRlcm1pbmUgYSBjbG9zZSBoYW5kbGVyXG4gIHZhciBjbG9zZSA9IHR5cGVvZiBtZXNzZW5nZXIuY2xvc2UgPT0gJ2Z1bmN0aW9uJyA/XG4gICAgICAgICAgICAgICAgbWVzc2VuZ2VyLmNsb3NlIDpcbiAgICAgICAgICAgICAgICBtZXNzZW5nZXIuZW5kO1xuXG4gIC8vIGluaXRpYWxpc2UgYmxvY2tzIGFuZCBtYXRjaGVyc1xuICBzaWduYWxsZXIuYmxvY2tzID0gW107XG4gIHNpZ25hbGxlci5tYXRjaGVycyA9IFtdO1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZUNoYW5uZWwodGFyZ2V0SWQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc2VuZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHNlbmQuYXBwbHkobnVsbCwgWycvdG8nLCB0YXJnZXRJZF0uY29uY2F0KFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBwcmVwYXJlQXJnKGFyZykge1xuICAgIGlmICh0eXBlb2YgYXJnID09ICdvYmplY3QnICYmICghIChhcmcgaW5zdGFuY2VvZiBTdHJpbmcpKSkge1xuICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBhcmcgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFyZztcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uY2UocHJlZml4LCBoYW5kbGVyKSB7XG4gICAgc2lnbmFsbGVyLm1hdGNoZXJzLnB1c2goe1xuICAgICAgcHJlZml4OiBwcmVmaXgsXG4gICAgICBoYW5kbGVyOiBoYW5kbGVyXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICAjIyMgc2lnbmFsbGVyI3NlbmQoZGF0YSlcblxuICAgIFNlbmQgZGF0YSBvdmVyIHRoZSBtZXNzZW5naW5nIGludGVyZmFjZS5cbiAgKiovXG4gIHZhciBzZW5kID0gc2lnbmFsbGVyLnNlbmQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBpdGVyYXRlIG92ZXIgdGhlIGFyZ3VtZW50cyBhbmQgc3RyaW5naWZ5IGFzIHJlcXVpcmVkXG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgdmFyIGRhdGFsaW5lID0gYXJncy5tYXAocHJlcGFyZUFyZykuZmlsdGVyKEJvb2xlYW4pLmpvaW4oJ3wnKTtcblxuICAgIC8vIHNlbmQgdGhlIGRhdGEgb3ZlciB0aGUgbWVzc2VuZ2VyXG4gICAgcmV0dXJuIHdyaXRlLmNhbGwobWVzc2VuZ2VyLCBkYXRhbGluZSk7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIHNpZ25hbGxlciNhbm5vdW5jZShkYXRhPylcblxuICAgIFRoZSBgYW5ub3VuY2VgIGZ1bmN0aW9uIG9mIHRoZSBzaWduYWxsZXIgd2lsbCBwYXNzIGFuIGAvYW5ub3VuY2VgIG1lc3NhZ2VcbiAgICB0aHJvdWdoIHRoZSBtZXNzZW5nZXIgbmV0d29yay4gIFdoZW4gbm8gYWRkaXRpb25hbCBkYXRhIGlzIHN1cHBsaWVkIHRvXG4gICAgdGhpcyBmdW5jdGlvbiB0aGVuIG9ubHkgdGhlIGlkIG9mIHRoZSBzaWduYWxsZXIgaXMgc2VudCB0byBhbGwgYWN0aXZlXG4gICAgbWVtYmVycyBvZiB0aGUgbWVzc2VuZ2luZyBuZXR3b3JrLlxuXG4gICAgQXMgYSB1bmlxdWUgaXQgaXMgZ2VuZXJhbGx5IGluc3VmZmljaWVudCBpbmZvcm1hdGlvbiB0byBkZXRlcm1pbmUgd2hldGhlclxuICAgIGEgcGVlciBpcyBhIGdvb2QgbWF0Y2ggZm9yIGFub3RoZXIgKGZvciBpbnN0YW5jZSwgIHlvdSBtaWdodCBiZSBsb29raW5nXG4gICAgZm9yIG90aGVyIHBhcnRpZXMgYnkgbmFtZSBvciByb2xlKSBpdCBpcyBnZW5lcmFsbHkgYSBnb29kIGlkZWEgdG8gcHJvdmlkZVxuICAgIHNvbWUgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiBkdXJpbmcgdGhpcyBhbm5vdW5jZSBjYWxsOlxuXG4gICAgYGBganNcbiAgICBzaWduYWxsZXIuYW5ub3VuY2UoeyByb2xlOiAndHJhbnNsYXRvcicgfSk7XG4gICAgYGBgXG5cbiAgICBfX05PVEU6X18gSW4gc29tZSBwYXJ0aWN1bGFyIG1lc3NlbmdlciB0eXBlcyBtYXkgYXR0YWNoIG9yIGluZmVyXG4gICAgYWRkaXRpb25hbCBkYXRhIGR1cmluZyB0aGUgYW5ub3VuY2UgcGhhc2UuICBGb3IgaW5zdGFuY2UsIHNvY2tldC5pb1xuICAgIGNvbm5lY3Rpb25zIGFyZSBnZW5lcmFsbHkgb3JnYW5pc2VkIGludG8gcm9vbXMgd2hpY2ggaXMgaW5mZXJyZWRcbiAgICBpbmZvcm1hdGlvbiB0aGF0IGxpbWl0cyB0aGUgbWVzc2FnaW5nIHNjb3BlLlxuICAqKi9cbiAgc2lnbmFsbGVyLmFubm91bmNlID0gZnVuY3Rpb24oZGF0YSwgc2VuZGVyKSB7XG4gICAgLy8gdXBkYXRlIGludGVybmFsIGF0dHJpYnV0ZXNcbiAgICBleHRlbmQoYXR0cmlidXRlcywgZGF0YSwgeyBpZDogaWQgfSk7XG5cbiAgICAvLyBzZW5kIHRoZSBhdHRyaWJ1dGVzIG92ZXIgdGhlIG5ldHdvcmtcbiAgICByZXR1cm4gKHNlbmRlciB8fCBzZW5kKSgnL2Fubm91bmNlJywgYXR0cmlidXRlcyk7XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIHNpZ25hbGxlciNibG9jaygpXG5cbiAgICBQcmV2ZW50IHRoZSBzaWduYWxsZXIgZnJvbSByZXNwb25kaW5nIHRvIHJlcXVlc3RzIHVudGlsIHRoZSBibG9ja1xuICAgIGlzIGNsZWFyZWQgd2l0aCBhIGNsZWFyQmxvY2sgY2FsbC5cbiAgKiovXG4gIHNpZ25hbGxlci5ibG9jayA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIGNyZWF0ZSBhIGJsb2NrIGlkXG4gICAgdmFyIGlkID0gdXVpZC52NCgpO1xuXG4gICAgLy8gYWRkIHRoZSBhY3RpdmUgYmxvY2tcbiAgICBzaWduYWxsZXIuYmxvY2tzLnB1c2goaWQpO1xuXG4gICAgLy8gcmV0dXJuIHRoZSBpZFxuICAgIHJldHVybiBpZDtcbiAgfTtcblxuICAvKipcbiAgICAjIyMgc2lnbmFsbGVyI2NsZWFyQmxvY2soaWQpXG5cbiAgICBDbGVhciB0aGUgc3BlY2lmaWVkIGJsb2NrIGlkLiAgVGhpbmsgYGNsZWFyVGltZW91dGAgYnV0IGZvciBzaWduYWxsaW5nXG4gICAgYmxvY2tzXG4gICoqL1xuICBzaWduYWxsZXIuY2xlYXJCbG9jayA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgdmFyIHdhc0Jsb2NrZWQgPSBzaWduYWxsZXIuYmxvY2tzLmxlbmd0aCA+IDA7XG5cbiAgICAvLyByZW1vdmUgYmxvY2tzIG1hdGNoaW5nIHRoZSBpZFxuICAgIHNpZ25hbGxlci5ibG9ja3MgPSBzaWduYWxsZXIuYmxvY2tzLmZpbHRlcihmdW5jdGlvbihibG9ja0lkKSB7XG4gICAgICByZXR1cm4gYmxvY2tJZCAhPT0gaWQ7XG4gICAgfSk7XG5cbiAgICAvLyBpZiB1bmJsb2NrZWQsIHRyaWdnZXIgdGhlIHVuYmxvY2sgZXZlbnRcbiAgICBpZiAod2FzQmxvY2tlZCAmJiBzaWduYWxsZXIuYmxvY2tzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgc2lnbmFsbGVyLmVtaXQoJ3VuYmxvY2snKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAgIyMjIHNpZ25hbGxlciNsZWF2ZSgpXG5cbiAgICBMZWF2ZSB0aGUgbWVzc2VuZ2VyIG1lc2hcbiAgKiovXG4gIHNpZ25hbGxlci5sZWF2ZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIHNlbmQgdGhlIGxlYXZlIHNpZ25hbFxuICAgIHNlbmQoJy9sZWF2ZScsIHsgaWQ6IGlkIH0pO1xuXG4gICAgLy8gY2FsbCB0aGUgY2xvc2UgbWV0aG9kXG4gICAgaWYgKHR5cGVvZiBjbG9zZSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjbG9zZS5jYWxsKG1lc3Nlbmdlcik7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgICMjIyBzaWduYWxsZXIjcmVxdWVzdChkYXRhKVxuXG4gICAgVGhlIGBzaWduYWxsZXIucmVxdWVzdGAgY2FsbCBpcyB3aGVyZSBvbmUgcGVlciBnb2VzIGxvb2tpbmcgZm9yIGEgdGFyZ2V0XG4gICAgcGVlciB0aGF0IHNhdGlzZmllcyBzcGVjaWZpYyBzZWFyY2ggcGFyYW1ldGVycy4gIFRoaXMgbWF5IGJlIGEgc2VhcmNoXG4gICAgZm9yIGEgcGVlciB3aXRoIGEgcGFydGljdWxhciBpZCwgb3Igc29tZXRoaW5nIG1vcmUgZ2VuZXJhbCBzdWNoIGFzXG4gICAgYSByZXF1ZXN0IGZvciBhIHBlZXIgd2l0aCBhIHBhcnRpY3VsYXIgbmFtZSBvciByb2xlLlxuXG4gICAgT25jZSBhIHN1aXRhYmxlIG1hdGNoIGhhcyBiZWVuIGZvdW5kIGZyb20gd2l0aGluIHRoZSBtZXNzZW5naW5nIG5ldHdvcmtcbiAgICB0aGUgY2FsbGJhY2sgd2lsbCBmaXJlIGFuZCBwcm92aWRlIGEgZGlzY3JldGUgbWVzc2FnaW5nIGNoYW5uZWwgdG8gdGhhdFxuICAgIHBhcnRpY3VsYXIgcGVlci5cblxuICAgIF9fTk9URTpfXyBUaGUgZGlzY3JldGVuZXNzIG9mIHRoZSBtZXNzYWdlIG5lZWRzIHRvIGJlIHByb2dyYW1tZWQgYXQgdGhlXG4gICAgbWVzaCBsZXZlbCBpZiByZXF1aXJlZC4gU2lnbmFsbGVycyB3aWxsIG5vdCBhdHRlbXB0IHRvIHBhcnNlIGEgbWVzc2FnZVxuICAgIGRlc3RpbmVkIGZvciBhbm90aGVyIHNpZ25hbGxlciwgYnV0IHRoZXkgYXJlIHZpc2libGUgYnkgZGVmYXVsdC4gIFRoaXNcbiAgICBjYW4gZWFzaWx5IGJlIGhhbmRsZWQgaG93ZXZlciwgYnkgZmlsdGVyaW5nIGAvdG9gIG1lc3NhZ2VzLlxuICAqKi9cbiAgc2lnbmFsbGVyLnJlcXVlc3QgPSBmdW5jdGlvbihkYXRhLCBvcHRzLCBjYWxsYmFjaykge1xuICAgIC8vIGluaXRpYWxpc2UgYSByZXF1ZXN0IGlkXG4gICAgdmFyIHJlcWlkID0gdXVpZC52NCgpO1xuXG4gICAgLy8gaGFuZGxlIDIgYXJnIGZvcm1cbiAgICBpZiAodHlwZW9mIG9wdHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sgPSBvcHRzO1xuICAgICAgb3B0cyA9IHt9O1xuICAgIH1cblxuICAgIC8vIFRPRE86IGluc3BlY3Qga25vd24gcGVlcnMgZm9yIGEgbWF0Y2hcblxuICAgIC8vIGhhbmRsZSByZXF1ZXN0IGFja25vd2xlZGdlXG4gICAgb25jZSgnL2Fja3JlcXwnICsgcmVxaWQsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHZhciB0YXJnZXRJZCA9IGRhdGEuc3BsaXQoJ3wnKVsyXTtcblxuICAgICAgLy8gdHJpZ2dlciB0aGUgY2FsbGJhY2sgd2l0aCB0aGUgc2VuZCBmdW5jdGlvbiB3aXJlZFxuICAgICAgY2FsbGJhY2sobnVsbCwgY3JlYXRlQ2hhbm5lbCh0YXJnZXRJZCkpO1xuICAgIH0pO1xuXG4gICAgLy8gc2VuZCBvdXQgYSByZXF1ZXN0IGFjcm9zcyB0aGUgbmV0d29ya1xuICAgIHNlbmQoJy9yZXF1ZXN0JywgZXh0ZW5kKHt9LCBkYXRhLCB7XG4gICAgICBfX3NyY2lkOiBpZCxcbiAgICAgIF9fcmVxaWQ6IHJlcWlkXG4gICAgfSkpO1xuICB9O1xuXG4gIC8qKlxuICAgICMjIyBzaWduYWxsZXIjdG8odGFyZ2V0SWQpXG5cbiAgICBUaGUgdG8gbWV0aG9kIHJldHVybnMgYW4gZW5jYXBzdWxhdGVkXG5cbiAgKiovXG4gIHNpZ25hbGxlci50byA9IGZ1bmN0aW9uKHRhcmdldElkKSB7XG4gICAgLy8gY3JlYXRlIGEgc2VuZGVyIHRoYXQgd2lsbCBwcmVwZW5kIG1lc3NhZ2VzIHdpdGggL3RvfHRhcmdldElkfFxuICAgIHZhciBzZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gWycvdG8nLCB0YXJnZXRJZF0uY29uY2F0KFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XG4gICAgICByZXR1cm4gd3JpdGUuY2FsbChtZXNzZW5nZXIsIGFyZ3MubWFwKHByZXBhcmVBcmcpLmZpbHRlcihCb29sZWFuKS5qb2luKCd8JykpO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgYW5ub3VuY2U6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIHNpZ25hbGxlci5hbm5vdW5jZShkYXRhLCBzZW5kZXIpO1xuICAgICAgfSxcblxuICAgICAgc2VuZDogc2VuZGVyLFxuICAgIH1cbiAgfTtcblxuICAvLyBoYW5kbGUgbWVzc2FnZSBkYXRhIGV2ZW50c1xuICBtZXNzZW5nZXIub24oZGF0YUV2ZW50LCByZXF1aXJlKCcuL3Byb2Nlc3NvcicpKHNpZ25hbGxlcikpO1xuXG4gIC8vIGhhbmRsZSBvcGVuIC8gY29ubmVjdCBldmVudHNcbiAgbWVzc2VuZ2VyLm9uKG9wZW5FdmVudCwgZnVuY3Rpb24oKSB7XG4gICAgc2lnbmFsbGVyLmVtaXQoJ29wZW4nKTtcbiAgfSk7XG5cbiAgcmV0dXJuIHNpZ25hbGxlcjtcbn07XG5cbnNpZy5sb2FkUHJpbXVzID0gcmVxdWlyZSgnLi9wcmltdXMtbG9hZGVyJyk7IiwidmFyIGdsb2JhbD10eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge307XG52YXIgcm5nO1xuXG5pZiAoZ2xvYmFsLmNyeXB0byAmJiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKSB7XG4gIC8vIFdIQVRXRyBjcnlwdG8tYmFzZWQgUk5HIC0gaHR0cDovL3dpa2kud2hhdHdnLm9yZy93aWtpL0NyeXB0b1xuICAvLyBNb2RlcmF0ZWx5IGZhc3QsIGhpZ2ggcXVhbGl0eVxuICB2YXIgX3JuZHM4ID0gbmV3IFVpbnQ4QXJyYXkoMTYpO1xuICBybmcgPSBmdW5jdGlvbiB3aGF0d2dSTkcoKSB7XG4gICAgY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhfcm5kczgpO1xuICAgIHJldHVybiBfcm5kczg7XG4gIH07XG59XG5cbmlmICghcm5nKSB7XG4gIC8vIE1hdGgucmFuZG9tKCktYmFzZWQgKFJORylcbiAgLy9cbiAgLy8gSWYgYWxsIGVsc2UgZmFpbHMsIHVzZSBNYXRoLnJhbmRvbSgpLiAgSXQncyBmYXN0LCBidXQgaXMgb2YgdW5zcGVjaWZpZWRcbiAgLy8gcXVhbGl0eS5cbiAgdmFyICBfcm5kcyA9IG5ldyBBcnJheSgxNik7XG4gIHJuZyA9IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIGkgPSAwLCByOyBpIDwgMTY7IGkrKykge1xuICAgICAgaWYgKChpICYgMHgwMykgPT09IDApIHIgPSBNYXRoLnJhbmRvbSgpICogMHgxMDAwMDAwMDA7XG4gICAgICBfcm5kc1tpXSA9IHIgPj4+ICgoaSAmIDB4MDMpIDw8IDMpICYgMHhmZjtcbiAgICB9XG5cbiAgICByZXR1cm4gX3JuZHM7XG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcm5nO1xuXG4iLCJ2YXIgQnVmZmVyPXJlcXVpcmUoXCJfX2Jyb3dzZXJpZnlfQnVmZmVyXCIpLkJ1ZmZlcjsvLyAgICAgdXVpZC5qc1xuLy9cbi8vICAgICBDb3B5cmlnaHQgKGMpIDIwMTAtMjAxMiBSb2JlcnQgS2llZmZlclxuLy8gICAgIE1JVCBMaWNlbnNlIC0gaHR0cDovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL21pdC1saWNlbnNlLnBocFxuXG4vLyBVbmlxdWUgSUQgY3JlYXRpb24gcmVxdWlyZXMgYSBoaWdoIHF1YWxpdHkgcmFuZG9tICMgZ2VuZXJhdG9yLiAgV2UgZmVhdHVyZVxuLy8gZGV0ZWN0IHRvIGRldGVybWluZSB0aGUgYmVzdCBSTkcgc291cmNlLCBub3JtYWxpemluZyB0byBhIGZ1bmN0aW9uIHRoYXRcbi8vIHJldHVybnMgMTI4LWJpdHMgb2YgcmFuZG9tbmVzcywgc2luY2UgdGhhdCdzIHdoYXQncyB1c3VhbGx5IHJlcXVpcmVkXG52YXIgX3JuZyA9IHJlcXVpcmUoJy4vcm5nJyk7XG5cbi8vIEJ1ZmZlciBjbGFzcyB0byB1c2VcbnZhciBCdWZmZXJDbGFzcyA9IHR5cGVvZihCdWZmZXIpID09ICdmdW5jdGlvbicgPyBCdWZmZXIgOiBBcnJheTtcblxuLy8gTWFwcyBmb3IgbnVtYmVyIDwtPiBoZXggc3RyaW5nIGNvbnZlcnNpb25cbnZhciBfYnl0ZVRvSGV4ID0gW107XG52YXIgX2hleFRvQnl0ZSA9IHt9O1xuZm9yICh2YXIgaSA9IDA7IGkgPCAyNTY7IGkrKykge1xuICBfYnl0ZVRvSGV4W2ldID0gKGkgKyAweDEwMCkudG9TdHJpbmcoMTYpLnN1YnN0cigxKTtcbiAgX2hleFRvQnl0ZVtfYnl0ZVRvSGV4W2ldXSA9IGk7XG59XG5cbi8vICoqYHBhcnNlKClgIC0gUGFyc2UgYSBVVUlEIGludG8gaXQncyBjb21wb25lbnQgYnl0ZXMqKlxuZnVuY3Rpb24gcGFyc2UocywgYnVmLCBvZmZzZXQpIHtcbiAgdmFyIGkgPSAoYnVmICYmIG9mZnNldCkgfHwgMCwgaWkgPSAwO1xuXG4gIGJ1ZiA9IGJ1ZiB8fCBbXTtcbiAgcy50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1swLTlhLWZdezJ9L2csIGZ1bmN0aW9uKG9jdCkge1xuICAgIGlmIChpaSA8IDE2KSB7IC8vIERvbid0IG92ZXJmbG93IVxuICAgICAgYnVmW2kgKyBpaSsrXSA9IF9oZXhUb0J5dGVbb2N0XTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIFplcm8gb3V0IHJlbWFpbmluZyBieXRlcyBpZiBzdHJpbmcgd2FzIHNob3J0XG4gIHdoaWxlIChpaSA8IDE2KSB7XG4gICAgYnVmW2kgKyBpaSsrXSA9IDA7XG4gIH1cblxuICByZXR1cm4gYnVmO1xufVxuXG4vLyAqKmB1bnBhcnNlKClgIC0gQ29udmVydCBVVUlEIGJ5dGUgYXJyYXkgKGFsYSBwYXJzZSgpKSBpbnRvIGEgc3RyaW5nKipcbmZ1bmN0aW9uIHVucGFyc2UoYnVmLCBvZmZzZXQpIHtcbiAgdmFyIGkgPSBvZmZzZXQgfHwgMCwgYnRoID0gX2J5dGVUb0hleDtcbiAgcmV0dXJuICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gKyAnLScgK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICsgJy0nICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArICctJyArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gKyAnLScgK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV07XG59XG5cbi8vICoqYHYxKClgIC0gR2VuZXJhdGUgdGltZS1iYXNlZCBVVUlEKipcbi8vXG4vLyBJbnNwaXJlZCBieSBodHRwczovL2dpdGh1Yi5jb20vTGlvc0svVVVJRC5qc1xuLy8gYW5kIGh0dHA6Ly9kb2NzLnB5dGhvbi5vcmcvbGlicmFyeS91dWlkLmh0bWxcblxuLy8gcmFuZG9tICMncyB3ZSBuZWVkIHRvIGluaXQgbm9kZSBhbmQgY2xvY2tzZXFcbnZhciBfc2VlZEJ5dGVzID0gX3JuZygpO1xuXG4vLyBQZXIgNC41LCBjcmVhdGUgYW5kIDQ4LWJpdCBub2RlIGlkLCAoNDcgcmFuZG9tIGJpdHMgKyBtdWx0aWNhc3QgYml0ID0gMSlcbnZhciBfbm9kZUlkID0gW1xuICBfc2VlZEJ5dGVzWzBdIHwgMHgwMSxcbiAgX3NlZWRCeXRlc1sxXSwgX3NlZWRCeXRlc1syXSwgX3NlZWRCeXRlc1szXSwgX3NlZWRCeXRlc1s0XSwgX3NlZWRCeXRlc1s1XVxuXTtcblxuLy8gUGVyIDQuMi4yLCByYW5kb21pemUgKDE0IGJpdCkgY2xvY2tzZXFcbnZhciBfY2xvY2tzZXEgPSAoX3NlZWRCeXRlc1s2XSA8PCA4IHwgX3NlZWRCeXRlc1s3XSkgJiAweDNmZmY7XG5cbi8vIFByZXZpb3VzIHV1aWQgY3JlYXRpb24gdGltZVxudmFyIF9sYXN0TVNlY3MgPSAwLCBfbGFzdE5TZWNzID0gMDtcblxuLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9icm9vZmEvbm9kZS11dWlkIGZvciBBUEkgZGV0YWlsc1xuZnVuY3Rpb24gdjEob3B0aW9ucywgYnVmLCBvZmZzZXQpIHtcbiAgdmFyIGkgPSBidWYgJiYgb2Zmc2V0IHx8IDA7XG4gIHZhciBiID0gYnVmIHx8IFtdO1xuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIHZhciBjbG9ja3NlcSA9IG9wdGlvbnMuY2xvY2tzZXEgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMuY2xvY2tzZXEgOiBfY2xvY2tzZXE7XG5cbiAgLy8gVVVJRCB0aW1lc3RhbXBzIGFyZSAxMDAgbmFuby1zZWNvbmQgdW5pdHMgc2luY2UgdGhlIEdyZWdvcmlhbiBlcG9jaCxcbiAgLy8gKDE1ODItMTAtMTUgMDA6MDApLiAgSlNOdW1iZXJzIGFyZW4ndCBwcmVjaXNlIGVub3VnaCBmb3IgdGhpcywgc29cbiAgLy8gdGltZSBpcyBoYW5kbGVkIGludGVybmFsbHkgYXMgJ21zZWNzJyAoaW50ZWdlciBtaWxsaXNlY29uZHMpIGFuZCAnbnNlY3MnXG4gIC8vICgxMDAtbmFub3NlY29uZHMgb2Zmc2V0IGZyb20gbXNlY3MpIHNpbmNlIHVuaXggZXBvY2gsIDE5NzAtMDEtMDEgMDA6MDAuXG4gIHZhciBtc2VjcyA9IG9wdGlvbnMubXNlY3MgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMubXNlY3MgOiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuICAvLyBQZXIgNC4yLjEuMiwgdXNlIGNvdW50IG9mIHV1aWQncyBnZW5lcmF0ZWQgZHVyaW5nIHRoZSBjdXJyZW50IGNsb2NrXG4gIC8vIGN5Y2xlIHRvIHNpbXVsYXRlIGhpZ2hlciByZXNvbHV0aW9uIGNsb2NrXG4gIHZhciBuc2VjcyA9IG9wdGlvbnMubnNlY3MgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMubnNlY3MgOiBfbGFzdE5TZWNzICsgMTtcblxuICAvLyBUaW1lIHNpbmNlIGxhc3QgdXVpZCBjcmVhdGlvbiAoaW4gbXNlY3MpXG4gIHZhciBkdCA9IChtc2VjcyAtIF9sYXN0TVNlY3MpICsgKG5zZWNzIC0gX2xhc3ROU2VjcykvMTAwMDA7XG5cbiAgLy8gUGVyIDQuMi4xLjIsIEJ1bXAgY2xvY2tzZXEgb24gY2xvY2sgcmVncmVzc2lvblxuICBpZiAoZHQgPCAwICYmIG9wdGlvbnMuY2xvY2tzZXEgPT09IHVuZGVmaW5lZCkge1xuICAgIGNsb2Nrc2VxID0gY2xvY2tzZXEgKyAxICYgMHgzZmZmO1xuICB9XG5cbiAgLy8gUmVzZXQgbnNlY3MgaWYgY2xvY2sgcmVncmVzc2VzIChuZXcgY2xvY2tzZXEpIG9yIHdlJ3ZlIG1vdmVkIG9udG8gYSBuZXdcbiAgLy8gdGltZSBpbnRlcnZhbFxuICBpZiAoKGR0IDwgMCB8fCBtc2VjcyA+IF9sYXN0TVNlY3MpICYmIG9wdGlvbnMubnNlY3MgPT09IHVuZGVmaW5lZCkge1xuICAgIG5zZWNzID0gMDtcbiAgfVxuXG4gIC8vIFBlciA0LjIuMS4yIFRocm93IGVycm9yIGlmIHRvbyBtYW55IHV1aWRzIGFyZSByZXF1ZXN0ZWRcbiAgaWYgKG5zZWNzID49IDEwMDAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd1dWlkLnYxKCk6IENhblxcJ3QgY3JlYXRlIG1vcmUgdGhhbiAxME0gdXVpZHMvc2VjJyk7XG4gIH1cblxuICBfbGFzdE1TZWNzID0gbXNlY3M7XG4gIF9sYXN0TlNlY3MgPSBuc2VjcztcbiAgX2Nsb2Nrc2VxID0gY2xvY2tzZXE7XG5cbiAgLy8gUGVyIDQuMS40IC0gQ29udmVydCBmcm9tIHVuaXggZXBvY2ggdG8gR3JlZ29yaWFuIGVwb2NoXG4gIG1zZWNzICs9IDEyMjE5MjkyODAwMDAwO1xuXG4gIC8vIGB0aW1lX2xvd2BcbiAgdmFyIHRsID0gKChtc2VjcyAmIDB4ZmZmZmZmZikgKiAxMDAwMCArIG5zZWNzKSAlIDB4MTAwMDAwMDAwO1xuICBiW2krK10gPSB0bCA+Pj4gMjQgJiAweGZmO1xuICBiW2krK10gPSB0bCA+Pj4gMTYgJiAweGZmO1xuICBiW2krK10gPSB0bCA+Pj4gOCAmIDB4ZmY7XG4gIGJbaSsrXSA9IHRsICYgMHhmZjtcblxuICAvLyBgdGltZV9taWRgXG4gIHZhciB0bWggPSAobXNlY3MgLyAweDEwMDAwMDAwMCAqIDEwMDAwKSAmIDB4ZmZmZmZmZjtcbiAgYltpKytdID0gdG1oID4+PiA4ICYgMHhmZjtcbiAgYltpKytdID0gdG1oICYgMHhmZjtcblxuICAvLyBgdGltZV9oaWdoX2FuZF92ZXJzaW9uYFxuICBiW2krK10gPSB0bWggPj4+IDI0ICYgMHhmIHwgMHgxMDsgLy8gaW5jbHVkZSB2ZXJzaW9uXG4gIGJbaSsrXSA9IHRtaCA+Pj4gMTYgJiAweGZmO1xuXG4gIC8vIGBjbG9ja19zZXFfaGlfYW5kX3Jlc2VydmVkYCAoUGVyIDQuMi4yIC0gaW5jbHVkZSB2YXJpYW50KVxuICBiW2krK10gPSBjbG9ja3NlcSA+Pj4gOCB8IDB4ODA7XG5cbiAgLy8gYGNsb2NrX3NlcV9sb3dgXG4gIGJbaSsrXSA9IGNsb2Nrc2VxICYgMHhmZjtcblxuICAvLyBgbm9kZWBcbiAgdmFyIG5vZGUgPSBvcHRpb25zLm5vZGUgfHwgX25vZGVJZDtcbiAgZm9yICh2YXIgbiA9IDA7IG4gPCA2OyBuKyspIHtcbiAgICBiW2kgKyBuXSA9IG5vZGVbbl07XG4gIH1cblxuICByZXR1cm4gYnVmID8gYnVmIDogdW5wYXJzZShiKTtcbn1cblxuLy8gKipgdjQoKWAgLSBHZW5lcmF0ZSByYW5kb20gVVVJRCoqXG5cbi8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYnJvb2ZhL25vZGUtdXVpZCBmb3IgQVBJIGRldGFpbHNcbmZ1bmN0aW9uIHY0KG9wdGlvbnMsIGJ1Ziwgb2Zmc2V0KSB7XG4gIC8vIERlcHJlY2F0ZWQgLSAnZm9ybWF0JyBhcmd1bWVudCwgYXMgc3VwcG9ydGVkIGluIHYxLjJcbiAgdmFyIGkgPSBidWYgJiYgb2Zmc2V0IHx8IDA7XG5cbiAgaWYgKHR5cGVvZihvcHRpb25zKSA9PSAnc3RyaW5nJykge1xuICAgIGJ1ZiA9IG9wdGlvbnMgPT0gJ2JpbmFyeScgPyBuZXcgQnVmZmVyQ2xhc3MoMTYpIDogbnVsbDtcbiAgICBvcHRpb25zID0gbnVsbDtcbiAgfVxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB2YXIgcm5kcyA9IG9wdGlvbnMucmFuZG9tIHx8IChvcHRpb25zLnJuZyB8fCBfcm5nKSgpO1xuXG4gIC8vIFBlciA0LjQsIHNldCBiaXRzIGZvciB2ZXJzaW9uIGFuZCBgY2xvY2tfc2VxX2hpX2FuZF9yZXNlcnZlZGBcbiAgcm5kc1s2XSA9IChybmRzWzZdICYgMHgwZikgfCAweDQwO1xuICBybmRzWzhdID0gKHJuZHNbOF0gJiAweDNmKSB8IDB4ODA7XG5cbiAgLy8gQ29weSBieXRlcyB0byBidWZmZXIsIGlmIHByb3ZpZGVkXG4gIGlmIChidWYpIHtcbiAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgMTY7IGlpKyspIHtcbiAgICAgIGJ1ZltpICsgaWldID0gcm5kc1tpaV07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ1ZiB8fCB1bnBhcnNlKHJuZHMpO1xufVxuXG4vLyBFeHBvcnQgcHVibGljIEFQSVxudmFyIHV1aWQgPSB2NDtcbnV1aWQudjEgPSB2MTtcbnV1aWQudjQgPSB2NDtcbnV1aWQucGFyc2UgPSBwYXJzZTtcbnV1aWQudW5wYXJzZSA9IHVucGFyc2U7XG51dWlkLkJ1ZmZlckNsYXNzID0gQnVmZmVyQ2xhc3M7XG5cbm1vZHVsZS5leHBvcnRzID0gdXVpZDtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgZG9jdW1lbnQsIGxvY2F0aW9uLCBQcmltdXM6IGZhbHNlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1cmwgPSByZXF1aXJlKCd1cmwnKTtcbnZhciByZVRyYWlsaW5nU2xhc2ggPSAvXFwvJC87XG5cbi8qKlxuICAjIyMgc2lnbmFsbGVyLmxvYWRQcmltdXMoc2lnbmFsaG9zdCwgY2FsbGJhY2spXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzaWduYWxob3N0LCBjYWxsYmFjaykge1xuICB2YXIgc2NyaXB0O1xuICB2YXIgYmFzZVVybDtcbiAgdmFyIGJhc2VQYXRoO1xuICB2YXIgc2NyaXB0U3JjO1xuXG4gIC8vIGlmIHRoZSBzaWduYWxob3N0IGlzIGEgZnVuY3Rpb24sIHdlIGFyZSBpbiBzaW5nbGUgYXJnIGNhbGxpbmcgbW9kZVxuICBpZiAodHlwZW9mIHNpZ25hbGhvc3QgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gc2lnbmFsaG9zdDtcbiAgICBzaWduYWxob3N0ID0gbG9jYXRpb24ub3JpZ2luO1xuICB9XG5cbiAgLy8gcmVhZCB0aGUgYmFzZSBwYXRoXG4gIGJhc2VVcmwgPSBzaWduYWxob3N0LnJlcGxhY2UocmVUcmFpbGluZ1NsYXNoLCAnJyk7XG4gIGJhc2VQYXRoID0gdXJsLnBhcnNlKHNpZ25hbGhvc3QpLnBhdGhuYW1lO1xuICBzY3JpcHRTcmMgPSBiYXNlVXJsICsgJy9ydGMuaW8vcHJpbXVzLmpzJztcblxuICAvLyBsb29rIGZvciB0aGUgc2NyaXB0IGZpcnN0XG4gIHNjcmlwdCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3NjcmlwdFtzcmM9XCInICsgc2NyaXB0U3JjICsgJ1wiXScpO1xuXG4gIC8vIGlmIHdlIGZvdW5kLCB0aGUgc2NyaXB0IHRyaWdnZXIgdGhlIGNhbGxiYWNrIGltbWVkaWF0ZWx5XG4gIGlmIChzY3JpcHQgJiYgdHlwZW9mIFByaW11cyAhPSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBQcmltdXMpO1xuICB9XG5cbiAgLy8gb3RoZXJ3aXNlIGNyZWF0ZSB0aGUgc2NyaXB0IGFuZCBsb2FkIHByaW11c1xuICBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgc2NyaXB0LnNyYyA9IHNjcmlwdFNyYztcblxuICBzY3JpcHQub25lcnJvciA9IGNhbGxiYWNrO1xuICBzY3JpcHQub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gaWYgd2UgaGF2ZSBhIHNpZ25hbGhvc3QgdGhhdCBpcyBub3QgYmFzZXBhdGhlZCBhdCAvXG4gICAgLy8gdGhlbiB0d2VhayB0aGUgcHJpbXVzIHByb3RvdHlwZVxuICAgIGlmIChiYXNlUGF0aCAhPT0gJy8nKSB7XG4gICAgICBQcmltdXMucHJvdG90eXBlLnBhdGhuYW1lID0gYmFzZVBhdGgucmVwbGFjZShyZVRyYWlsaW5nU2xhc2gsICcnKSArXG4gICAgICAgIFByaW11cy5wcm90b3R5cGUucGF0aG5hbWU7XG4gICAgfVxuXG4gICAgY2FsbGJhY2sobnVsbCwgUHJpbXVzKTtcbiAgfTtcblxuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcmlwdCk7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICAjIyBzaWduYWxsZXIgcHJvY2VzcyBoYW5kbGluZ1xuXG4gIFdoZW4gYSBzaWduYWxsZXIncyB1bmRlcmxpbmcgbWVzc2VuZ2VyIGVtaXRzIGEgYGRhdGFgIGV2ZW50IHRoaXMgaXNcbiAgZGVsZWdhdGVkIHRvIGEgc2ltcGxlIG1lc3NhZ2UgcGFyc2VyLCB3aGljaCBhcHBsaWVzIHRoZSBmb2xsb3dpbmcgc2ltcGxlXG4gIGxvZ2ljOlxuXG4gIC0gSXMgdGhlIG1lc3NhZ2UgYSBgL3RvYCBtZXNzYWdlLiBJZiBzbywgc2VlIGlmIHRoZSBtZXNzYWdlIGlzIGZvciB0aGlzXG4gICAgc2lnbmFsbGVyIHNjb3BlIChjaGVja2luZyB0aGUgdGFyZ2V0IGlkIC0gMm5kIGFyZykuICBJZiBzbyBwYXNzIHRoZVxuICAgIHJlbWFpbmRlciBvZiB0aGUgbWVzc2FnZSBvbnRvIHRoZSBzdGFuZGFyZCBwcm9jZXNzaW5nIGNoYWluLiAgSWYgbm90LFxuICAgIGRpc2NhcmQgdGhlIG1lc3NhZ2UuXG5cbiAgLSBJcyB0aGUgbWVzc2FnZSBhIGNvbW1hbmQgbWVzc2FnZSAocHJlZml4ZWQgd2l0aCBhIGZvcndhcmQgc2xhc2gpLiBJZiBzbyxcbiAgICBsb29rIGZvciBhbiBhcHByb3ByaWF0ZSBtZXNzYWdlIGhhbmRsZXIgYW5kIHBhc3MgdGhlIG1lc3NhZ2UgcGF5bG9hZCBvblxuICAgIHRvIGl0LlxuXG4gIC0gRmluYWxseSwgZG9lcyB0aGUgbWVzc2FnZSBtYXRjaCBhbnkgcGF0dGVybnMgdGhhdCB3ZSBhcmUgbGlzdGVuaW5nIGZvcj9cbiAgICBJZiBzbywgdGhlbiBwYXNzIHRoZSBlbnRpcmUgbWVzc2FnZSBjb250ZW50cyBvbnRvIHRoZSByZWdpc3RlcmVkIGhhbmRsZXIuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2NvcGUpIHtcbiAgdmFyIGlkID0gc2NvcGUuaWQ7XG4gIHZhciBoYW5kbGVycyA9IHJlcXVpcmUoJy4vaGFuZGxlcnMnKShzY29wZSk7XG5cbiAgZnVuY3Rpb24gc2VuZEV2ZW50KHBhcnRzKSB7XG4gICAgLy8gaW5pdGlhbGlzZSB0aGUgZXZlbnQgbmFtZVxuICAgIHZhciBldnROYW1lID0gcGFydHNbMF0uc2xpY2UoMSk7XG5cbiAgICAvLyBjb252ZXJ0IGFueSB2YWxpZCBqc29uIG9iamVjdHMgdG8ganNvblxuICAgIHZhciBhcmdzID0gcGFydHMuc2xpY2UoMSkubWFwKGZ1bmN0aW9uKHBhcnQpIHtcbiAgICAgIGlmIChwYXJ0LmNoYXJBdCgwKSA9PT0gJ3snKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcGFydCA9IEpTT04ucGFyc2UocGFydCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gcGFydDtcbiAgICB9KTtcblxuICAgIHNjb3BlLmVtaXQuYXBwbHkoc2NvcGUsIFtldnROYW1lXS5jb25jYXQoYXJncykpO1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB2YXIgaXNNYXRjaCA9IHRydWU7XG4gICAgdmFyIHBhcnRzO1xuICAgIHZhciBoYW5kbGVyO1xuXG4gICAgLy8gcHJvY2VzcyAvdG8gbWVzc2FnZXNcbiAgICBpZiAoZGF0YS5zbGljZSgwLCAzKSA9PT0gJy90bycpIHtcbiAgICAgIGlzTWF0Y2ggPSBkYXRhLnNsaWNlKDQsIGlkLmxlbmd0aCArIDQpID09PSBpZDtcbiAgICAgIGlmIChpc01hdGNoKSB7XG4gICAgICAgIGRhdGEgPSBkYXRhLnNsaWNlKDUgKyBpZC5sZW5ndGgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGlmIHRoaXMgaXMgbm90IGEgbWF0Y2gsIHRoZW4gYmFpbFxuICAgIGlmICghIGlzTWF0Y2gpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBjaG9wIHRoZSBkYXRhIGludG8gcGFydHNcbiAgICBwYXJ0cyA9IGRhdGEuc3BsaXQoJ3wnKTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYSBzcGVjaWZpYyBoYW5kbGVyIGZvciB0aGUgYWN0aW9uLCB0aGVuIGludm9rZVxuICAgIGlmIChwYXJ0c1swXS5jaGFyQXQoMCkgPT09ICcvJykge1xuICAgICAgaGFuZGxlciA9IGhhbmRsZXJzW3BhcnRzWzBdLnNsaWNlKDEpXTtcblxuICAgICAgaWYgKHR5cGVvZiBoYW5kbGVyID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaGFuZGxlcihwYXJ0cy5zbGljZSgxKSk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgc2VuZEV2ZW50KHBhcnRzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBwcm9jZXNzIG1hdGNoZXJzXG4gICAgc2NvcGUubWF0Y2hlcnMgPSBzY29wZS5tYXRjaGVycy5maWx0ZXIoZnVuY3Rpb24ocnVsZSkge1xuICAgICAgdmFyIGV4ZWMgPSBkYXRhLnNsaWNlKDAsIHJ1bGUucHJlZml4Lmxlbmd0aCkgPT09IHJ1bGUucHJlZml4O1xuXG4gICAgICBpZiAoZXhlYyAmJiB0eXBlb2YgcnVsZS5oYW5kbGVyID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcnVsZS5oYW5kbGVyKGRhdGEpO1xuICAgICAgfVxuXG4gICAgICAvLyBvbmx5IGtlZXAgaWYgbm90IGV4ZWN1dGVkXG4gICAgICByZXR1cm4gIWV4ZWM7XG4gICAgfSk7XG4gIH07XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgUlRDSWNlQ2FuZGlkYXRlOiBmYWxzZSAqL1xuLyogZ2xvYmFsIFJUQ1Nlc3Npb25EZXNjcmlwdGlvbjogZmFsc2UgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIGRlYnVnID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpKCdjb3VwbGUnKTtcbnZhciBhc3luYyA9IHJlcXVpcmUoJ2FzeW5jJyk7XG52YXIgbW9uaXRvciA9IHJlcXVpcmUoJy4vbW9uaXRvcicpO1xudmFyIGRldGVjdCA9IHJlcXVpcmUoJy4vZGV0ZWN0Jyk7XG5cbi8qKlxuICAjIyBydGMvY291cGxlXG5cbiAgIyMjIGNvdXBsZShwYywgdGFyZ2V0QXR0ciwgc2lnbmFsbGVyLCBvcHRzPylcblxuICBDb3VwbGUgYSBXZWJSVEMgY29ubmVjdGlvbiB3aXRoIGFub3RoZXIgd2VicnRjIGNvbm5lY3Rpb24gdmlhIGFcbiAgc2lnbmFsbGluZyBzY29wZS4gIFRoZSBgdGFyZ2V0QXR0cmAgYXJndW1lbnQgc3BlY2lmaWVzIHRoZSBjcml0ZXJpYSB0aGF0XG4gIGFyZSBwYXNzZWQgb250byBhIGAvcmVxdWVzdGAgY29tbWFuZCB3aGVuIGxvb2tpbmcgZm9yIHJlbW90ZSBwZWVyXG4gIHRvIGNvdXBsZSBhbmQgZXhjaGFuZ2UgbWVzc2FnZXMgd2l0aC5cblxuICAjIyMgRXhhbXBsZSBVc2FnZVxuXG4gIGBgYGpzXG4gIHZhciBjb3VwbGUgPSByZXF1aXJlKCdydGMvY291cGxlJyk7XG5cbiAgY291cGxlKG5ldyBSVENQZWVyQ29ubmVjdGlvbigpLCB7IGlkOiAndGVzdCcgfSwgc2lnbmFsbGVyKTtcbiAgYGBgXG5cbiAgIyMjIFVzaW5nIEZpbHRlcnNcblxuICBJbiBjZXJ0YWluIGluc3RhbmNlcyB5b3UgbWF5IHdpc2ggdG8gbW9kaWZ5IHRoZSByYXcgU0RQIHRoYXQgaXMgcHJvdmlkZWRcbiAgYnkgdGhlIGBjcmVhdGVPZmZlcmAgYW5kIGBjcmVhdGVBbnN3ZXJgIGNhbGxzLiAgVGhpcyBjYW4gYmUgZG9uZSBieSBwYXNzaW5nXG4gIGEgYHNkcGZpbHRlcmAgZnVuY3Rpb24gKG9yIGFycmF5KSBpbiB0aGUgb3B0aW9ucy4gIEZvciBleGFtcGxlOlxuXG4gIGBgYGpzXG4gIC8vIHJ1biB0aGUgc2RwIGZyb20gdGhyb3VnaCBhIGxvY2FsIHR3ZWFrU2RwIGZ1bmN0aW9uLlxuICBjb3VwbGUocGMsIHsgaWQ6ICdibGFoJyB9LCBzaWduYWxsZXIsIHsgc2RwZmlsdGVyOiB0d2Vha1NkcCB9KTtcbiAgYGBgXG5cbioqL1xuZnVuY3Rpb24gY291cGxlKGNvbm4sIHRhcmdldEF0dHIsIHNpZ25hbGxlciwgb3B0cykge1xuICAvLyBjcmVhdGUgYSBtb25pdG9yIGZvciB0aGUgY29ubmVjdGlvblxuICB2YXIgbW9uID0gbW9uaXRvcihjb25uKTtcbiAgdmFyIGJsb2NrSWQ7XG4gIHZhciBzdGFnZXMgPSB7fTtcbiAgdmFyIG9wZW5DaGFubmVsO1xuICB2YXIgcXVldWVkQ2FuZGlkYXRlcyA9IFtdO1xuICB2YXIgc2RwRmlsdGVyID0gKG9wdHMgfHwge30pLnNkcGZpbHRlcjtcblxuICAvLyByZXRyeSBpbXBsZW1lbnRhdGlvblxuICB2YXIgbWF4QXR0ZW1wdHMgPSAob3B0cyB8fCB7fSkubWF4QXR0ZW1wdHMgfHwgMztcbiAgdmFyIGF0dGVtcHREZWxheSA9IChvcHRzIHx8IHt9KS5hdHRlbXB0RGVsYXkgfHwgMzAwMDtcbiAgdmFyIGF0dGVtcHQgPSAxO1xuICB2YXIgYXR0ZW1wdFRpbWVyO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIHByb2Nlc3NpbmcgcXVldWUgKG9uZSBhdCBhIHRpbWUgcGxlYXNlKVxuICB2YXIgcSA9IGFzeW5jLnF1ZXVlKGZ1bmN0aW9uKHRhc2ssIGNiKSB7XG4gICAgLy8gaWYgdGhlIHRhc2sgaGFzIG5vIG9wZXJhdGlvbiwgdGhlbiB0cmlnZ2VyIHRoZSBjYWxsYmFjayBpbW1lZGlhdGVseVxuICAgIGlmICh0eXBlb2YgdGFzay5vcCAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gY2IoKTtcbiAgICB9XG5cbiAgICAvLyBwcm9jZXNzIHRoZSB0YXNrIG9wZXJhdGlvblxuICAgIHRhc2sub3AodGFzaywgY2IpO1xuICB9LCAxKTtcblxuICAvLyBpbml0aWFsaXNlIHNlc3Npb24gZGVzY3JpcHRpb24gYW5kIGljZWNhbmRpZGF0ZSBvYmplY3RzXG4gIHZhciBSVENTZXNzaW9uRGVzY3JpcHRpb24gPSAob3B0cyB8fCB7fSkuUlRDU2Vzc2lvbkRlc2NyaXB0aW9uIHx8XG4gICAgZGV0ZWN0KCdSVENTZXNzaW9uRGVzY3JpcHRpb24nKTtcblxuICB2YXIgUlRDSWNlQ2FuZGlkYXRlID0gKG9wdHMgfHwge30pLlJUQ0ljZUNhbmRpZGF0ZSB8fFxuICAgIGRldGVjdCgnUlRDSWNlQ2FuZGlkYXRlJyk7XG5cbiAgZnVuY3Rpb24gYWJvcnQoc3RhZ2UsIHNkcCwgY2IpIHtcbiAgICB2YXIgc3RhZ2VIYW5kbGVyID0gc3RhZ2VzW3N0YWdlXTtcblxuICAgIHJldHVybiBmdW5jdGlvbihlcnIpIHtcbiAgICAgIC8vIGxvZyB0aGUgZXJyb3JcbiAgICAgIGRlYnVnKCdjYXB0dXJlZCBlcnJvcjogJywgZXJyKTtcblxuICAgICAgLy8gY2xlYXIgYW55IGJsb2NrXG4gICAgICBzaWduYWxsZXIuY2xlYXJCbG9jayhibG9ja0lkKTtcblxuICAgICAgLy8gVE9ETzogcmVwb3J0IHRoZSBkYXRhXG5cbiAgICAgIC8vIHJlYXR0ZW1wdCBjb3VwbGluZz9cbiAgICAgIGlmIChzdGFnZUhhbmRsZXIgJiYgYXR0ZW1wdCA8IG1heEF0dGVtcHRzICYmICghIGF0dGVtcHRUaW1lcikpIHtcbiAgICAgICAgYXR0ZW1wdFRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICBhdHRlbXB0ICs9IDE7XG4gICAgICAgICAgYXR0ZW1wdFRpbWVyID0gMDtcblxuICAgICAgICAgIGRlYnVnKCdyZWF0dGVtcHRpbmcgY29ubmVjdGlvbiAoYXR0ZW1wdDogJyArIGF0dGVtcHQgKyAnKScpO1xuICAgICAgICAgIHN0YWdlSGFuZGxlcigpO1xuICAgICAgICB9LCBhdHRlbXB0RGVsYXkpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIGNiID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY2IoZXJyKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlSGFuZHNoYWtlcihtZXRob2ROYW1lKSB7XG4gICAgdmFyIGhzRGVidWcgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJykoJ2hhbmRzaGFrZS0nICsgbWV0aG9kTmFtZSk7XG5cbiAgICByZXR1cm4gcS5wdXNoLmJpbmQocSwgeyBvcDogZnVuY3Rpb24odGFzaywgY2IpIHtcbiAgICAgIC8vIGNsZWFyIHRoZSBvcGVuIGNoYW5uZWxcbiAgICAgIG9wZW5DaGFubmVsID0gbnVsbDtcblxuICAgICAgaHNEZWJ1Zygnc3RhcnRpbmcsIG1ha2luZyBzaWduYWxsZXIgcmVxdWVzdCcsIGNvbm4uc2lnbmFsaW5nU3RhdGUpO1xuICAgICAgc2lnbmFsbGVyLnJlcXVlc3QodGFyZ2V0QXR0ciwgZnVuY3Rpb24oZXJyLCBjaGFubmVsKSB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBoc0RlYnVnKCdyZXF1ZXN0IG9rJyk7XG5cbiAgICAgICAgLy8gYmxvY2sgdGhlIHNpZ25hbGxpbmcgc2NvcGVcbiAgICAgICAgYmxvY2tJZCA9IHNpZ25hbGxlci5ibG9jaygpO1xuXG4gICAgICAgIC8vIGNyZWF0ZSB0aGUgb2ZmZXJcbiAgICAgICAgY29ublttZXRob2ROYW1lXShcbiAgICAgICAgICBmdW5jdGlvbihkZXNjKSB7XG5cbiAgICAgICAgICAgIC8vIGlmIGEgZmlsdGVyIGhhcyBiZWVuIHNwZWNpZmllZCwgdGhlbiBhcHBseSB0aGUgZmlsdGVyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHNkcEZpbHRlciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgIGRlc2Muc2RwID0gc2RwRmlsdGVyKGRlc2Muc2RwLCBjb25uLCBtZXRob2ROYW1lKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaW5pdGlhbGlzZSB0aGUgbG9jYWwgZGVzY3JpcHRpb25cbiAgICAgICAgICAgIGNvbm4uc2V0TG9jYWxEZXNjcmlwdGlvbihcbiAgICAgICAgICAgICAgZGVzYyxcblxuICAgICAgICAgICAgICAvLyBpZiBzdWNjZXNzZnVsLCB0aGVuIHNlbmQgdGhlIHNkcCBvdmVyIHRoZSB3aXJlXG4gICAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIHNhdmUgdGhlIGNoYW5uZWwgYXMgb3BlblxuICAgICAgICAgICAgICAgIG9wZW5DaGFubmVsID0gY2hhbm5lbDtcblxuICAgICAgICAgICAgICAgIC8vIHNlbmQgdGhlIHNkcFxuICAgICAgICAgICAgICAgIGNoYW5uZWwuc2VuZCgnL3NkcCcsIGRlc2MpO1xuXG4gICAgICAgICAgICAgICAgLy8gY2xlYXIgdGhlIGJsb2NrXG4gICAgICAgICAgICAgICAgc2lnbmFsbGVyLmNsZWFyQmxvY2soYmxvY2tJZCk7XG4gICAgICAgICAgICAgICAgaHNEZWJ1ZygnYmxvY2sgY2xlYXJlZCcpO1xuXG4gICAgICAgICAgICAgICAgLy8gY2FsbGJhY2tcbiAgICAgICAgICAgICAgICBjYigpO1xuICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgIC8vIG9uIGVycm9yLCBhYm9ydFxuICAgICAgICAgICAgICBhYm9ydChtZXRob2ROYW1lLCBkZXNjLnNkcCwgY2IpXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0sXG5cbiAgICAgICAgICAvLyBvbiBlcnJvciwgYWJvcnRcbiAgICAgICAgICBhYm9ydChtZXRob2ROYW1lLCAnJywgY2IpXG4gICAgICAgICk7XG4gICAgICB9KTtcbiAgICB9fSk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVMb2NhbENhbmRpZGF0ZShldnQpIHtcbiAgICBpZiAoZXZ0LmNhbmRpZGF0ZSAmJiBvcGVuQ2hhbm5lbCkge1xuICAgICAgb3BlbkNoYW5uZWwuc2VuZCgnL2NhbmRpZGF0ZScsIGV2dC5jYW5kaWRhdGUpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZVJlbW90ZUNhbmRpZGF0ZShkYXRhKSB7XG4gICAgaWYgKCEgY29ubi5yZW1vdGVEZXNjcmlwdGlvbikge1xuICAgICAgcmV0dXJuIHF1ZXVlZENhbmRpZGF0ZXMucHVzaChkYXRhKTtcbiAgICB9XG5cbiAgICBkZWJ1ZygnYWRkaW5nIHJlbW90ZSBjYW5kaWRhdGUnKTtcbiAgICB0cnkge1xuICAgICAgY29ubi5hZGRJY2VDYW5kaWRhdGUobmV3IFJUQ0ljZUNhbmRpZGF0ZShkYXRhKSk7XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICBkZWJ1ZygnaW52YWxpZGF0ZSBjYW5kaWRhdGUgc3BlY2lmaWVkOiAnLCBkYXRhKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVTZHAoZGF0YSkge1xuICAgIC8vIHF1ZXVlIHRoZSByZW1vdGUgZGVzY3JpcHRpb24gb3BlcmF0aW9uXG4gICAgcS5wdXNoKHsgb3A6IGZ1bmN0aW9uKHRhc2ssIGNiKSB7XG4gICAgICAvLyB1cGRhdGUgdGhlIHJlbW90ZSBkZXNjcmlwdGlvblxuICAgICAgLy8gb25jZSBzdWNjZXNzZnVsLCBzZW5kIHRoZSBhbnN3ZXJcbiAgICAgIGNvbm4uc2V0UmVtb3RlRGVzY3JpcHRpb24oXG4gICAgICAgIG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24oZGF0YSksXG5cbiAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgLy8gYXBwbHkgYW55IHF1ZXVlZCBjYW5kaWRhdGVzXG4gICAgICAgICAgcXVldWVkQ2FuZGlkYXRlcy5zcGxpY2UoMCkuZm9yRWFjaChmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICBkZWJ1ZygnYXBwbHlpbmcgcXVldWVkIGNhbmRpZGF0ZScpO1xuICAgICAgICAgICAgY29ubi5hZGRJY2VDYW5kaWRhdGUobmV3IFJUQ0ljZUNhbmRpZGF0ZShkYXRhKSk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBjcmVhdGUgdGhlIGFuc3dlclxuICAgICAgICAgIGlmIChkYXRhLnR5cGUgPT09ICdvZmZlcicpIHtcbiAgICAgICAgICAgIHN0YWdlcy5jcmVhdGVBbnN3ZXIoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyB0cmlnZ2VyIHRoZSBjYWxsYmFja1xuICAgICAgICAgIGNiKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYWJvcnQoZGF0YS50eXBlID09PSAnb2ZmZXInID8gJ2NyZWF0ZUFuc3dlcicgOiAnY3JlYXRlT2ZmZXInLCBkYXRhLnNkcCwgY2IpXG4gICAgICApO1xuICAgIH19KTtcbiAgfVxuXG4gIC8vIGNyZWF0ZSB0aGUgc3RhZ2VzXG4gIFsnY3JlYXRlT2ZmZXInLCAnY3JlYXRlQW5zd2VyJ10uZm9yRWFjaChmdW5jdGlvbihzdGFnZSkge1xuICAgIHN0YWdlc1tzdGFnZV0gPSBjcmVhdGVIYW5kc2hha2VyKHN0YWdlKTtcbiAgfSk7XG5cbiAgLy8gd2hlbiByZWdvdGlhdGlvbiBpcyBuZWVkZWQgbG9vayBmb3IgdGhlIHBlZXJcbiAgY29ubi5hZGRFdmVudExpc3RlbmVyKCduZWdvdGlhdGlvbm5lZWRlZCcsIHN0YWdlcy5jcmVhdGVPZmZlcik7XG4gIGNvbm4uYWRkRXZlbnRMaXN0ZW5lcignaWNlY2FuZGlkYXRlJywgaGFuZGxlTG9jYWxDYW5kaWRhdGUpO1xuXG4gIC8vIHdoZW4gd2UgcmVjZWl2ZSBzZHAsIHRoZW5cbiAgc2lnbmFsbGVyLm9uKCdzZHAnLCBoYW5kbGVTZHApO1xuICBzaWduYWxsZXIub24oJ2NhbmRpZGF0ZScsIGhhbmRsZVJlbW90ZUNhbmRpZGF0ZSk7XG5cbiAgLy8gd2hlbiB0aGUgY29ubmVjdGlvbiBjbG9zZXMsIHJlbW92ZSBldmVudCBoYW5kbGVyc1xuICBtb24ub25jZSgnY2xvc2VkJywgZnVuY3Rpb24oKSB7XG4gICAgZGVidWcoJ2Nsb3NlZCcpO1xuXG4gICAgLy8gcmVtb3ZlIGxpc3RlbmVyc1xuICAgIHNpZ25hbGxlci5yZW1vdmVMaXN0ZW5lcignc2RwJywgaGFuZGxlU2RwKTtcbiAgICBzaWduYWxsZXIucmVtb3ZlTGlzdGVuZXIoJ2NhbmRpZGF0ZScsIGhhbmRsZVJlbW90ZUNhbmRpZGF0ZSk7XG4gIH0pO1xuXG4gIC8vIHBhdGNoIGluIHRoZSBjcmVhdGUgb2ZmZXIgZnVuY3Rpb25zXG4gIG1vbi5jcmVhdGVPZmZlciA9IHN0YWdlcy5jcmVhdGVPZmZlcjtcblxuICByZXR1cm4gbW9uO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNvdXBsZTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyMgcnRjL2RldGVjdFxuXG4gIFByb3ZpZGUgdGhlIFtydGMtY29yZS9kZXRlY3RdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLWNvcmUjZGV0ZWN0KSBcbiAgZnVuY3Rpb25hbGl0eS5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCdydGMtY29yZS9kZXRlY3QnKTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGV0ZWN0ID0gcmVxdWlyZSgnLi9kZXRlY3QnKTtcbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJ2NvZy9kZWZhdWx0cycpO1xuXG52YXIgbWFwcGluZ3MgPSB7XG4gIG9mZmVyOiB7XG4gICAgLy8gYXVkaW8gdG9nZ2xlXG4gICAgLy8geyBhdWRpbzogZmFsc2UgfSBpbiBwZWVyIGNvbm5lY3Rpb24gY29uZmlnIHR1cm5zIG9mZiBhdWRpb1xuICAgIGF1ZGlvOiBmdW5jdGlvbihjKSB7XG4gICAgICBjLm1hbmRhdG9yeSA9IGMubWFuZGF0b3J5IHx8IHt9O1xuICAgICAgYy5tYW5kYXRvcnkuT2ZmZXJUb1JlY2VpdmVBdWRpbyA9IHRydWU7XG4gICAgfSxcblxuICAgIC8vIHZpZGVvIHRvZ2dsZVxuICAgIC8vIHsgdmlkZW86IGZhbHNlIH0gaW4gcGVlciBjb25uZWN0aW9uIGNvbmZpZyB0dXJucyBvZmYgdmlkZW9cbiAgICB2aWRlbzogZnVuY3Rpb24oYykge1xuICAgICAgYy5tYW5kYXRvcnkgPSBjLm1hbmRhdG9yeSB8fCB7fTtcbiAgICAgIGMubWFuZGF0b3J5Lk9mZmVyVG9SZWNlaXZlVmlkZW8gPSB0cnVlO1xuICAgIH1cbiAgfSxcblxuICBjcmVhdGU6IHtcbiAgICAvLyBkYXRhIGVuYWJsZXJcbiAgICBkYXRhOiBmdW5jdGlvbihjKSB7XG4gICAgICBpZiAoISBkZXRlY3QubW96KSB7XG4gICAgICAgIGMub3B0aW9uYWwgPSAoYy5vcHRpb25hbCB8fCBbXSkuY29uY2F0KHsgUnRwRGF0YUNoYW5uZWxzOiB0cnVlIH0pO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBkdGxzOiBmdW5jdGlvbihjKSB7XG4gICAgICBpZiAoISBkZXRlY3QubW96KSB7XG4gICAgICAgIGMub3B0aW9uYWwgPSAoYy5vcHRpb25hbCB8fCBbXSkuY29uY2F0KHsgRHRsc1NydHBLZXlBZ3JlZW1lbnQ6IHRydWUgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vLyBpbml0aWFsaXNlIGtub3duIGZsYWdzXG52YXIga25vd25GbGFncyA9IFsndmlkZW8nLCAnYXVkaW8nLCAnZGF0YSddO1xuXG4vKipcbiAgIyMgcnRjL2dlbmVyYXRvcnNcblxuICBUaGUgZ2VuZXJhdG9ycyBwYWNrYWdlIHByb3ZpZGVzIHNvbWUgdXRpbGl0eSBtZXRob2RzIGZvciBnZW5lcmF0aW5nXG4gIGNvbnN0cmFpbnQgb2JqZWN0cyBhbmQgc2ltaWxhciBjb25zdHJ1Y3RzLlxuXG4gIGBgYGpzXG4gIHZhciBnZW5lcmF0b3JzID0gcmVxdWlyZSgncnRjL2dlbmVyYXRvcnMnKTtcbiAgYGBgXG5cbioqL1xuXG4vKipcbiAgIyMjIGdlbmVyYXRvcnMuY29uZmlnKGNvbmZpZylcblxuICBHZW5lcmF0ZSBhIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHN1aXRhYmxlIGZvciBwYXNzaW5nIGludG8gYW4gVzNDIFxuICBSVENQZWVyQ29ubmVjdGlvbiBjb25zdHJ1Y3RvciBmaXJzdCBhcmd1bWVudCwgYmFzZWQgb24gb3VyIGN1c3RvbSBjb25maWcuXG4qKi9cbmV4cG9ydHMuY29uZmlnID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gIHJldHVybiBkZWZhdWx0cyhjb25maWcsIHtcbiAgICBpY2VTZXJ2ZXJzOiBbXVxuICB9KTtcbn07XG5cbi8qKlxuICAjIyMgZ2VuZXJhdG9ycy5jb25uZWN0aW9uQ29uc3RyYWludHMoZmxhZ3MsIGNvbnN0cmFpbnRzKVxuXG4gIFRoaXMgaXMgYSBoZWxwZXIgZnVuY3Rpb24gdGhhdCB3aWxsIGdlbmVyYXRlIGFwcHJvcHJpYXRlIGNvbm5lY3Rpb25cbiAgY29uc3RyYWludHMgZm9yIGEgbmV3IGBSVENQZWVyQ29ubmVjdGlvbmAgb2JqZWN0IHdoaWNoIGlzIGNvbnN0cnVjdGVkXG4gIGluIHRoZSBmb2xsb3dpbmcgd2F5OlxuXG4gIGBgYGpzXG4gIHZhciBjb25uID0gbmV3IFJUQ1BlZXJDb25uZWN0aW9uKGZsYWdzLCBjb25zdHJhaW50cyk7XG4gIGBgYFxuXG4gIEluIG1vc3QgY2FzZXMgdGhlIGNvbnN0cmFpbnRzIG9iamVjdCBjYW4gYmUgbGVmdCBlbXB0eSwgYnV0IHdoZW4gY3JlYXRpbmdcbiAgZGF0YSBjaGFubmVscyBzb21lIGFkZGl0aW9uYWwgb3B0aW9ucyBhcmUgcmVxdWlyZWQuICBUaGlzIGZ1bmN0aW9uXG4gIGNhbiBnZW5lcmF0ZSB0aG9zZSBhZGRpdGlvbmFsIG9wdGlvbnMgYW5kIGludGVsbGlnZW50bHkgY29tYmluZSBhbnlcbiAgdXNlciBkZWZpbmVkIGNvbnN0cmFpbnRzIChpbiBgY29uc3RyYWludHNgKSB3aXRoIHNob3J0aGFuZCBmbGFncyB0aGF0XG4gIG1pZ2h0IGJlIHBhc3NlZCB3aGlsZSB1c2luZyB0aGUgYHJ0Yy5jcmVhdGVDb25uZWN0aW9uYCBoZWxwZXIuXG4qKi8gIFxuZXhwb3J0cy5jb25uZWN0aW9uQ29uc3RyYWludHMgPSBmdW5jdGlvbihmbGFncywgY29uc3RyYWludHMpIHtcbiAgdmFyIGdlbmVyYXRlZCA9IHt9O1xuICB2YXIgbSA9IG1hcHBpbmdzLmNyZWF0ZTtcblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIGZsYWdzIGFuZCBhcHBseSB0aGUgY3JlYXRlIG1hcHBpbmdzXG4gIE9iamVjdC5rZXlzKGZsYWdzIHx8IHt9KS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmIChtW2tleV0pIHtcbiAgICAgIG1ba2V5XShnZW5lcmF0ZWQpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGRlZmF1bHRzKHt9LCBjb25zdHJhaW50cywgZ2VuZXJhdGVkKTtcbn07XG5cbi8qKlxuICAjIyMgZ2VuZXJhdG9ycy5tZWRpYUNvbnN0cmFpbnRzKGZsYWdzLCBjb250ZXh0KVxuXG4gIEdlbmVyYXRlIG1lZGlhQ29uc3RyYWludHMgYXBwcm9wcmlhdGUgZm9yIHRoZSBjb250ZXh0IGluIHdoaWNoIHRoZXkgYXJlIFxuICBiZWluZyBjYWxsZWQgKGkuZS4gZWl0aGVyIGNvbnN0cnVjdGluZyBhbiBSVENQZWVyQ29ubmVjdGlvbiBvYmplY3QsIG9yXG4gIG9uIHRoZSBgY3JlYXRlT2ZmZXJgIG9yIGBjcmVhdGVBbnN3ZXJgIGNhbGxzKS5cbioqL1xuZXhwb3J0cy5tZWRpYUNvbnN0cmFpbnRzID0gZnVuY3Rpb24oZmxhZ3MsIGNvbnRleHQpIHtcbiAgLy8gY3JlYXRlIGFuIGVtcHR5IGNvbnN0cmFpbnRzIG9iamVjdFxuICB2YXIgY29uc3RyYWludHMgPSB7XG4gICAgb3B0aW9uYWw6IFt7IER0bHNTcnRwS2V5QWdyZWVtZW50OiB0cnVlIH1dXG4gIH07XG5cbiAgLy8gcHJvdmlkZSBkZWZhdWx0IG1hbmRhdG9yeSBjb25zdHJhaW50cyBmb3IgdGhlIG9mZmVyXG4gIGlmIChjb250ZXh0ID09PSAnb2ZmZXInKSB7XG4gICAgY29uc3RyYWludHMubWFuZGF0b3J5ID0ge1xuICAgICAgT2ZmZXJUb1JlY2VpdmVWaWRlbzogZmFsc2UsXG4gICAgICBPZmZlclRvUmVjZWl2ZUF1ZGlvOiBmYWxzZVxuICAgIH07XG4gIH1cblxuICAvLyBnZXQgdGhlIG1hcHBpbmdzIGZvciB0aGUgY29udGV4dCAoZGVmYXVsdGluZyB0byB0aGUgb2ZmZXIgY29udGV4dClcbiAgdmFyIGNvbnRleHRNYXBwaW5ncyA9IG1hcHBpbmdzW2NvbnRleHQgfHwgJ29mZmVyJ10gfHwge307XG5cbiAgLy8gaWYgd2UgaGF2ZW4ndCBiZWVuIHBhc3NlZCBhbiBhcnJheSBmb3IgZmxhZ3MsIHRoZW4gcmV0dXJuIHRoZSBjb25zdHJhaW50c1xuICBpZiAoISBBcnJheS5pc0FycmF5KGZsYWdzKSkge1xuICAgIGZsYWdzID0gcGFyc2VGbGFncyhmbGFncyk7XG4gIH1cblxuICBmbGFncy5tYXAoZnVuY3Rpb24oZmxhZykge1xuICAgIGlmICh0eXBlb2YgY29udGV4dE1hcHBpbmdzW2ZsYWddID09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIG11dGF0ZSB0aGUgY29uc3RyYWludHNcbiAgICAgIGNvbnRleHRNYXBwaW5nc1tmbGFnXShjb25zdHJhaW50cyk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gY29uc3RyYWludHM7XG59O1xuXG4vKipcbiAgIyMjIHBhcnNlRmxhZ3Mob3B0cylcblxuICBUaGlzIGlzIGEgaGVscGVyIGZ1bmN0aW9uIHRoYXQgd2lsbCBleHRyYWN0IGtub3duIGZsYWdzIGZyb20gYSBnZW5lcmljIFxuICBvcHRpb25zIG9iamVjdC5cbioqL1xudmFyIHBhcnNlRmxhZ3MgPSBleHBvcnRzLnBhcnNlRmxhZ3MgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIC8vIGVuc3VyZSB3ZSBoYXZlIG9wdHNcbiAgdmFyIG9wdHMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIC8vIGRlZmF1bHQgdmlkZW8gYW5kIGF1ZGlvIGZsYWdzIHRvIHRydWUgaWYgdW5kZWZpbmVkXG4gIG9wdHMudmlkZW8gPSBvcHRzLnZpZGVvIHx8IHR5cGVvZiBvcHRzLnZpZGVvID09ICd1bmRlZmluZWQnO1xuICBvcHRzLmF1ZGlvID0gb3B0cy5hdWRpbyB8fCB0eXBlb2Ygb3B0cy5hdWRpbyA9PSAndW5kZWZpbmVkJztcblxuICByZXR1cm4gT2JqZWN0LmtleXMob3B0cyB8fCB7fSlcbiAgICAuZmlsdGVyKGZ1bmN0aW9uKGZsYWcpIHtcbiAgICAgIHJldHVybiBvcHRzW2ZsYWddO1xuICAgIH0pXG4gICAgLm1hcChmdW5jdGlvbihmbGFnKSB7XG4gICAgICByZXR1cm4gZmxhZy50b0xvd2VyQ2FzZSgpO1xuICAgIH0pXG4gICAgLmZpbHRlcihmdW5jdGlvbihmbGFnKSB7XG4gICAgICByZXR1cm4ga25vd25GbGFncy5pbmRleE9mKGZsYWcpID49IDA7XG4gICAgfSk7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMgcnRjXG5cbiAgVGhlIGBydGNgIHBhY2thZ2UgaXMgYSBjb252ZW5pZW5jZSBsYXllciBmb3Igd29ya2luZyB3aXRoIHRoZSBydGMuaW8gdG9vbGtpdC5cbiAgQ29uc2lkZXIgaXQgYSBib3hlZCBzZXQgb2YgbGVnbyBvZiB0aGUgbW9zdCBjb21tb24gcGllY2VzIHJlcXVpcmVkIHRvIGJ1aWxkXG4gIHRoZSBmcm9udC1lbmQgY29tcG9uZW50IG9mIGEgV2ViUlRDIGFwcGxpY2F0aW9uLlxuXG4gICMjIEdldHRpbmcgU3RhcnRlZFxuXG4gIFRPIEJFIENPTVBMRVRFRC5cblxuKiovXG5cbnZhciBnZW4gPSByZXF1aXJlKCcuL2dlbmVyYXRvcnMnKTtcblxuLy8gZXhwb3J0IGRldGVjdFxudmFyIGRldGVjdCA9IGV4cG9ydHMuZGV0ZWN0ID0gcmVxdWlyZSgnLi9kZXRlY3QnKTtcblxuLy8gZXhwb3J0IGNvZyBsb2dnZXIgZm9yIGNvbnZlbmllbmNlXG5leHBvcnRzLmxvZ2dlciA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKTtcblxuLy8gZXhwb3J0IHBlZXIgY29ubmVjdGlvblxudmFyIFJUQ1BlZXJDb25uZWN0aW9uID1cbmV4cG9ydHMuUlRDUGVlckNvbm5lY3Rpb24gPSBkZXRlY3QoJ1JUQ1BlZXJDb25uZWN0aW9uJyk7XG5cbi8vIGFkZCB0aGUgY291cGxlIHV0aWxpdHlcbmV4cG9ydHMuY291cGxlID0gcmVxdWlyZSgnLi9jb3VwbGUnKTtcblxuLyoqXG4gICMjIEZhY3Rvcmllc1xuKiovXG5cbi8qKlxuICAjIyMgY3JlYXRlQ29ubmVjdGlvbihvcHRzPywgY29uc3RyYWludHM/KVxuXG4gIENyZWF0ZSBhIG5ldyBgUlRDUGVlckNvbm5lY3Rpb25gIGF1dG8gZ2VuZXJhdGluZyBkZWZhdWx0IG9wdHMgYXMgcmVxdWlyZWQuXG5cbiAgYGBganNcbiAgdmFyIGNvbm47XG5cbiAgLy8gdGhpcyBpcyBva1xuICBjb25uID0gcnRjLmNyZWF0ZUNvbm5lY3Rpb24oKTtcblxuICAvLyBhbmQgc28gaXMgdGhpc1xuICBjb25uID0gcnRjLmNyZWF0ZUNvbm5lY3Rpb24oe1xuICAgIGljZVNlcnZlcnM6IFtdXG4gIH0pO1xuICBgYGBcbioqL1xuZXhwb3J0cy5jcmVhdGVDb25uZWN0aW9uID0gZnVuY3Rpb24ob3B0cywgY29uc3RyYWludHMpIHtcbiAgcmV0dXJuIG5ldyBSVENQZWVyQ29ubmVjdGlvbihcbiAgICAvLyBnZW5lcmF0ZSB0aGUgY29uZmlnIGJhc2VkIG9uIG9wdGlvbnMgcHJvdmlkZWRcbiAgICBnZW4uY29uZmlnKG9wdHMpLFxuXG4gICAgLy8gZ2VuZXJhdGUgYXBwcm9wcmlhdGUgY29ubmVjdGlvbiBjb25zdHJhaW50c1xuICAgIGdlbi5jb25uZWN0aW9uQ29uc3RyYWludHMob3B0cywgY29uc3RyYWludHMpXG4gICk7XG59OyIsInZhciBwcm9jZXNzPXJlcXVpcmUoXCJfX2Jyb3dzZXJpZnlfcHJvY2Vzc1wiKTsvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgZGVidWcgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJykoJ21vbml0b3InKTtcbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG52YXIgVzNDX1NUQVRFUyA9IHtcbiAgTkVXOiAnbmV3JyxcbiAgTE9DQUxfT0ZGRVI6ICdoYXZlLWxvY2FsLW9mZmVyJyxcbiAgTE9DQUxfUFJBTlNXRVI6ICdoYXZlLWxvY2FsLXByYW5zd2VyJyxcbiAgUkVNT1RFX1BSQU5TV0VSOiAnaGF2ZS1yZW1vdGUtcHJhbnN3ZXInLFxuICBBQ1RJVkU6ICdhY3RpdmUnLFxuICBDTE9TRUQ6ICdjbG9zZWQnXG59O1xuXG4vKipcbiAgIyMgcnRjL21vbml0b3JcblxuICBJbiBtb3N0IGN1cnJlbnQgaW1wbGVtZW50YXRpb25zIG9mIGBSVENQZWVyQ29ubmVjdGlvbmAgaXQgaXMgcXVpdGVcbiAgZGlmZmljdWx0IHRvIGRldGVybWluZSB3aGV0aGVyIGEgcGVlciBjb25uZWN0aW9uIGlzIGFjdGl2ZSBhbmQgcmVhZHlcbiAgZm9yIHVzZSBvciBub3QuICBUaGUgbW9uaXRvciBwcm92aWRlcyBzb21lIGFzc2lzdGFuY2UgaGVyZSBieSBwcm92aWRpbmdcbiAgYSBzaW1wbGUgZnVuY3Rpb24gdGhhdCBwcm92aWRlcyBhbiBgRXZlbnRFbWl0dGVyYCB3aGljaCBnaXZlcyB1cGRhdGVzXG4gIG9uIGEgY29ubmVjdGlvbnMgc3RhdGUuXG5cbiAgIyMjIG1vbml0b3IocGMpIC0+IEV2ZW50RW1pdHRlclxuXG4gIGBgYGpzXG4gIHZhciBtb25pdG9yID0gcmVxdWlyZSgncnRjL21vbml0b3InKTtcbiAgdmFyIHBjID0gbmV3IFJUQ1BlZXJDb25uZWN0aW9uKGNvbmZpZyk7XG5cbiAgLy8gd2F0Y2ggcGMgYW5kIHdoZW4gYWN0aXZlIGRvIHNvbWV0aGluZ1xuICBtb25pdG9yKHBjKS5vbmNlKCdhY3RpdmUnLCBmdW5jdGlvbigpIHtcbiAgICAvLyBhY3RpdmUgYW5kIHJlYWR5IHRvIGdvXG4gIH0pO1xuICBgYGBcblxuICBFdmVudHMgcHJvdmlkZWQgYnkgdGhlIG1vbml0b3IgYXJlIGFzIGZvbGxvd3M6XG5cbiAgLSBgYWN0aXZlYDogdHJpZ2dlcmVkIHdoZW4gdGhlIGNvbm5lY3Rpb24gaXMgYWN0aXZlIGFuZCByZWFkeSBmb3IgdXNlXG4gIC0gYHN0YWJsZWA6IHRyaWdnZXJlZCB3aGVuIHRoZSBjb25uZWN0aW9uIGlzIGluIGEgc3RhYmxlIHNpZ25hbGxpbmcgc3RhdGVcbiAgLSBgdW5zdGFibGVgOiB0cmlnZ2VyIHdoZW4gdGhlIGNvbm5lY3Rpb24gaXMgcmVuZWdvdGlhdGluZy5cblxuICBJdCBzaG91bGQgYmUgbm90ZWQsIHRoYXQgdGhlIG1vbml0b3IgZG9lcyBhIGNoZWNrIHdoZW4gaXQgaXMgZmlyc3QgcGFzc2VkXG4gIGFuIGBSVENQZWVyQ29ubmVjdGlvbmAgb2JqZWN0IHRvIHNlZSBpZiB0aGUgYGFjdGl2ZWAgc3RhdGUgcGFzc2VzIGNoZWNrcy5cbiAgSWYgc28sIHRoZSBgYWN0aXZlYCBldmVudCB3aWxsIGJlIGZpcmVkIGluIHRoZSBuZXh0IHRpY2suXG5cbiAgSWYgeW91IHJlcXVpcmUgYSBzeW5jaHJvbm91cyBjaGVjayBvZiBhIGNvbm5lY3Rpb24ncyBcIm9wZW5uZXNzXCIgdGhlblxuICB1c2UgdGhlIGBtb25pdG9yLmlzQWN0aXZlYCB0ZXN0IG91dGxpbmVkIGJlbG93LlxuKiovXG52YXIgbW9uaXRvciA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocGMsIHRhZykge1xuICAvLyBjcmVhdGUgYSBuZXcgZXZlbnQgZW1pdHRlciB3aGljaCB3aWxsIGNvbW11bmljYXRlIGV2ZW50c1xuICB2YXIgbW9uID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICB2YXIgY3VycmVudFN0YXRlID0gZ2V0U3RhdGUocGMpO1xuICB2YXIgaXNBY3RpdmUgPSBtb24uYWN0aXZlID0gY3VycmVudFN0YXRlID09PSBXM0NfU1RBVEVTLkFDVElWRTtcblxuICBmdW5jdGlvbiBjaGVja1N0YXRlKCkge1xuICAgIHZhciBuZXdTdGF0ZSA9IGdldFN0YXRlKHBjLCB0YWcpO1xuICAgIGRlYnVnKCdjYXB0dXJlZCBzdGF0ZSBjaGFuZ2UsIG5ldyBzdGF0ZTogJyArIG5ld1N0YXRlICtcbiAgICAgICcsIGN1cnJlbnQgc3RhdGU6ICcgKyBjdXJyZW50U3RhdGUpO1xuXG4gICAgLy8gdXBkYXRlIHRoZSBtb25pdG9yIGFjdGl2ZSBmbGFnXG4gICAgbW9uLmFjdGl2ZSA9IG5ld1N0YXRlID09PSBXM0NfU1RBVEVTLkFDVElWRTtcblxuICAgIC8vIGlmIHdlIGhhdmUgYSBzdGF0ZSBjaGFuZ2UsIGVtaXQgYW4gZXZlbnQgZm9yIHRoZSBuZXcgc3RhdGVcbiAgICBpZiAobmV3U3RhdGUgIT09IGN1cnJlbnRTdGF0ZSkge1xuICAgICAgbW9uLmVtaXQoY3VycmVudFN0YXRlID0gbmV3U3RhdGUpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHRoZSBjdXJyZW50IHN0YXRlIGlzIGFjdGl2ZSwgdHJpZ2dlciB0aGUgYWN0aXZlIGV2ZW50XG4gIGlmIChpc0FjdGl2ZSkge1xuICAgIHByb2Nlc3MubmV4dFRpY2sobW9uLmVtaXQuYmluZChtb24sIFczQ19TVEFURVMuQUNUSVZFLCBwYykpO1xuICB9XG5cbiAgLy8gc3RhcnQgd2F0Y2hpbmcgc3R1ZmYgb24gdGhlIHBjXG4gIHBjLmFkZEV2ZW50TGlzdGVuZXIoJ3NpZ25hbGluZ3N0YXRlY2hhbmdlJywgY2hlY2tTdGF0ZSk7XG4gIHBjLmFkZEV2ZW50TGlzdGVuZXIoJ2ljZWNvbm5lY3Rpb25zdGF0ZWNoYW5nZScsIGNoZWNrU3RhdGUpO1xuXG4gIC8vIHBhdGNoIGluIGEgc3RvcCBtZXRob2QgaW50byB0aGUgZW1pdHRlclxuICBtb24uc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIHBjLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3NpZ25hbGluZ3N0YXRlY2hhbmdlJywgY2hlY2tTdGF0ZSk7XG4gICAgcGMucmVtb3ZlRXZlbnRMaXN0ZW5lcignaWNlY29ubmVjdGlvbnN0YXRlY2hhbmdlJywgY2hlY2tTdGF0ZSk7XG4gIH07XG5cbiAgcmV0dXJuIG1vbjtcbn07XG5cbi8qKlxuICAjIyMgbW9uaXRvci5nZXRTdGF0ZShwYylcblxuICBQcm92aWRlcyBhIHVuaWZpZWQgc3RhdGUgZGVmaW5pdGlvbiBmb3IgdGhlIFJUQ1BlZXJDb25uZWN0aW9uIGJhc2VkXG4gIG9uIGEgZmV3IGNoZWNrcy5cblxuICBJbiBlbWVyZ2luZyB2ZXJzaW9ucyBvZiB0aGUgc3BlYyB3ZSBoYXZlIHZhcmlvdXMgcHJvcGVydGllcyBzdWNoIGFzXG4gIGByZWFkeVN0YXRlYCB0aGF0IHByb3ZpZGUgYSBkZWZpbml0aXZlIGFuc3dlciBvbiB0aGUgc3RhdGUgb2YgdGhlIFxuICBjb25uZWN0aW9uLiAgSW4gb2xkZXIgdmVyc2lvbnMgd2UgbmVlZCB0byBsb29rIGF0IHRoaW5ncyBsaWtlXG4gIGBzaWduYWxpbmdTdGF0ZWAgYW5kIGBpY2VHYXRoZXJpbmdTdGF0ZWAgdG8gbWFrZSBhbiBlZHVjYXRlZCBndWVzcyBcbiAgYXMgdG8gdGhlIGNvbm5lY3Rpb24gc3RhdGUuXG4qKi9cbnZhciBnZXRTdGF0ZSA9IG1vbml0b3IuZ2V0U3RhdGUgPSBmdW5jdGlvbihwYywgdGFnKSB7XG4gIHZhciBzaWduYWxpbmdTdGF0ZSA9IHBjICYmIHBjLnNpZ25hbGluZ1N0YXRlO1xuICB2YXIgaWNlR2F0aGVyaW5nU3RhdGUgPSBwYyAmJiBwYy5pY2VHYXRoZXJpbmdTdGF0ZTtcbiAgdmFyIGljZUNvbm5lY3Rpb25TdGF0ZSA9IHBjICYmIHBjLmljZUNvbm5lY3Rpb25TdGF0ZTtcbiAgdmFyIGxvY2FsRGVzYztcbiAgdmFyIHJlbW90ZURlc2M7XG4gIHZhciBzdGF0ZTtcbiAgdmFyIGlzQWN0aXZlO1xuXG4gIC8vIGlmIG5vIGNvbm5lY3Rpb24gcmV0dXJuIGNsb3NlZFxuICBpZiAoISBwYykge1xuICAgIHJldHVybiBXM0NfU1RBVEVTLkNMT1NFRDtcbiAgfVxuXG4gIC8vIGluaXRpYWxpc2UgdGhlIHRhZyB0byBhbiBlbXB0eSBzdHJpbmcgaWYgbm90IHByb3ZpZGVkXG4gIHRhZyA9IHRhZyB8fCAnJztcblxuICAvLyBnZXQgdGhlIGNvbm5lY3Rpb24gbG9jYWwgYW5kIHJlbW90ZSBkZXNjcmlwdGlvblxuICBsb2NhbERlc2MgPSBwYy5sb2NhbERlc2NyaXB0aW9uO1xuICByZW1vdGVEZXNjID0gcGMucmVtb3RlRGVzY3JpcHRpb247XG5cbiAgLy8gdXNlIHRoZSBzaWduYWxsaW5nIHN0YXRlXG4gIHN0YXRlID0gc2lnbmFsaW5nU3RhdGU7XG5cbiAgLy8gaWYgc3RhdGUgPT0gJ3N0YWJsZScgdGhlbiBpbnZlc3RpZ2F0ZVxuICBpZiAoc3RhdGUgPT09ICdzdGFibGUnKSB7XG4gICAgLy8gaW5pdGlhbGlzZSB0aGUgc3RhdGUgdG8gbmV3XG4gICAgc3RhdGUgPSBXM0NfU1RBVEVTLk5FVztcblxuICAgIC8vIGlmIHdlIGhhdmUgYSBsb2NhbCBkZXNjcmlwdGlvbiBhbmQgcmVtb3RlIGRlc2NyaXB0aW9uIGZsYWdcbiAgICAvLyBhcyBwcmFuc3dlcmVkXG4gICAgaWYgKGxvY2FsRGVzYyAmJiByZW1vdGVEZXNjKSB7XG4gICAgICBzdGF0ZSA9IFczQ19TVEFURVMuUkVNT1RFX1BSQU5TV0VSO1xuICAgIH1cbiAgfVxuXG4gIC8vIGNoZWNrIHRvIHNlZSBpZiB3ZSBhcmUgaW4gdGhlIGFjdGl2ZSBzdGF0ZVxuICBpc0FjdGl2ZSA9IChzdGF0ZSA9PT0gVzNDX1NUQVRFUy5SRU1PVEVfUFJBTlNXRVIpICYmXG4gICAgKGljZUNvbm5lY3Rpb25TdGF0ZSA9PT0gJ2Nvbm5lY3RlZCcpO1xuXG4gIGRlYnVnKHRhZyArICdzaWduYWxpbmcgc3RhdGU6ICcgKyBzaWduYWxpbmdTdGF0ZSArXG4gICAgJywgaWNlR2F0aGVyaW5nU3RhdGU6ICcgKyBpY2VHYXRoZXJpbmdTdGF0ZSArXG4gICAgJywgaWNlQ29ubmVjdGlvblN0YXRlOiAnICsgaWNlQ29ubmVjdGlvblN0YXRlKTtcbiAgXG4gIHJldHVybiBpc0FjdGl2ZSA/IFczQ19TVEFURVMuQUNUSVZFIDogc3RhdGU7XG59O1xuXG4vKipcbiAgIyMjIG1vbml0b3IuaXNBY3RpdmUocGMpIC0+IEJvb2xlYW5cblxuICBUZXN0IGFuIGBSVENQZWVyQ29ubmVjdGlvbmAgdG8gc2VlIGlmIGl0J3MgY3VycmVudGx5IG9wZW4uICBUaGUgdGVzdCBmb3JcbiAgXCJvcGVubmVzc1wiIGxvb2tzIGF0IGEgY29tYmluYXRpb24gb2YgY3VycmVudCBgc2lnbmFsaW5nU3RhdGVgIGFuZFxuICBgaWNlR2F0aGVyaW5nU3RhdGVgLlxuKiovXG5tb25pdG9yLmlzQWN0aXZlID0gZnVuY3Rpb24ocGMpIHtcbiAgdmFyIGlzU3RhYmxlID0gcGMgJiYgcGMuc2lnbmFsaW5nU3RhdGUgPT09ICdzdGFibGUnO1xuXG4gIC8vIHJldHVybiB3aXRoIHRoZSBjb25uZWN0aW9uIGlzIGFjdGl2ZVxuICByZXR1cm4gaXNTdGFibGUgJiYgZ2V0U3RhdGUocGMpID09PSBXM0NfU1RBVEVTLkFDVElWRTtcbn07IiwidmFyIHBhcnNlciA9IHJlcXVpcmUoJy4vbGliL3BhcnNlcicpO1xudmFyIHdyaXRlciA9IHJlcXVpcmUoJy4vbGliL3dyaXRlcicpO1xuXG5leHBvcnRzLndyaXRlID0gd3JpdGVyO1xuZXhwb3J0cy5wYXJzZSA9IHBhcnNlci5wYXJzZTtcbmV4cG9ydHMucGFyc2VGbXRwQ29uZmlnID0gcGFyc2VyLnBhcnNlRm10cENvbmZpZztcbmV4cG9ydHMucGFyc2VQYXlsb2FkcyA9IHBhcnNlci5wYXJzZVBheWxvYWRzO1xuZXhwb3J0cy5wYXJzZVJlbW90ZUNhbmRpZGF0ZXMgPSBwYXJzZXIucGFyc2VSZW1vdGVDYW5kaWRhdGVzO1xuIiwidmFyIGdyYW1tYXIgPSBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgdjogW3tcbiAgICAgIG5hbWU6ICd2ZXJzaW9uJyxcbiAgICAgIHJlZzogL14oXFxkKikkL1xuICB9XSxcbiAgbzogW3sgLy9vPS0gMjA1MTggMCBJTiBJUDQgMjAzLjAuMTEzLjFcbiAgICAvLyBOQjogc2Vzc2lvbklkIHdpbGwgYmUgYSBTdHJpbmcgaW4gbW9zdCBjYXNlcyBiZWNhdXNlIGl0IGlzIGh1Z2VcbiAgICBuYW1lOiAnb3JpZ2luJyxcbiAgICByZWc6IC9eKFxcUyopIChcXGQqKSAoXFxkKikgKFxcUyopIElQKFxcZCkgKC4qKS8sXG4gICAgbmFtZXM6IFsndXNlcm5hbWUnLCAnc2Vzc2lvbklkJywgJ3Nlc3Npb25WZXJzaW9uJywgJ25ldFR5cGUnLCAnaXBWZXInLCAnYWRkcmVzcyddLFxuICAgIGZvcm1hdDogXCIlcyAlcyAlZCAlcyBJUCVkICVzXCJcbiAgfV0sXG4gIC8vIGRlZmF1bHQgcGFyc2luZyBvZiB0aGVzZSBvbmx5ICh0aG91Z2ggc29tZSBvZiB0aGVzZSBmZWVsIG91dGRhdGVkKVxuICBzOiBbeyBuYW1lOiAnbmFtZScgfV0sXG4gIGk6IFt7IG5hbWU6ICdkZXNjcmlwdGlvbicgfV0sXG4gIHU6IFt7IG5hbWU6ICd1cmknIH1dLFxuICBlOiBbeyBuYW1lOiAnZW1haWwnIH1dLFxuICBwOiBbeyBuYW1lOiAncGhvbmUnIH1dLFxuICB6OiBbeyBuYW1lOiAndGltZXpvbmVzJyB9XSwgLy8gVE9ETzogdGhpcyBvbmUgY2FuIGFjdHVhbGx5IGJlIHBhcnNlZCBwcm9wZXJseS4uXG4gIHI6IFt7IG5hbWU6ICdyZXBlYXRzJyB9XSwgICAvLyBUT0RPOiB0aGlzIG9uZSBjYW4gYWxzbyBiZSBwYXJzZWQgcHJvcGVybHlcbiAgLy9rOiBbe31dLCAvLyBvdXRkYXRlZCB0aGluZyBpZ25vcmVkXG4gIHQ6IFt7IC8vdD0wIDBcbiAgICBuYW1lOiAndGltaW5nJyxcbiAgICByZWc6IC9eKFxcZCopIChcXGQqKS8sXG4gICAgbmFtZXM6IFsnc3RhcnQnLCAnc3RvcCddLFxuICAgIGZvcm1hdDogXCIlZCAlZFwiXG4gIH1dLFxuICBjOiBbeyAvL2M9SU4gSVA0IDEwLjQ3LjE5Ny4yNlxuICAgICAgbmFtZTogJ2Nvbm5lY3Rpb24nLFxuICAgICAgcmVnOiAvXklOIElQKFxcZCkgKC4qKS8sXG4gICAgICBuYW1lczogWyd2ZXJzaW9uJywgJ2lwJ10sXG4gICAgICBmb3JtYXQ6IFwiSU4gSVAlZCAlc1wiXG4gIH1dLFxuICBiOiBbeyAvL2I9QVM6NDAwMFxuICAgICAgcHVzaDogJ2JhbmR3aWR0aCcsXG4gICAgICByZWc6IC9eKFRJQVN8QVN8Q1R8UlJ8UlMpXFw6KFxcZCopLyxcbiAgICAgIG5hbWVzOiBbJ3R5cGUnLCAnbGltaXQnXSxcbiAgICAgIGZvcm1hdDogXCIlczolc1wiXG4gIH1dLFxuICBtOiBbeyAvL209dmlkZW8gNTE3NDQgUlRQL0FWUCAxMjYgOTcgOTggMzQgMzFcbiAgICAgIC8vIE5COiBzcGVjaWFsIC0gcHVzaGVzIHRvIHNlc3Npb25cbiAgICAgIC8vIFRPRE86IHJ0cC9mbXRwIHNob3VsZCBiZSBmaWx0ZXJlZCBieSB0aGUgcGF5bG9hZHMgZm91bmQgaGVyZT9cbiAgICAgIHJlZzogL14oXFx3KikgKFxcZCopIChbXFx3XFwvXSopXFxzPyguKik/LyxcbiAgICAgIG5hbWVzOiBbJ3R5cGUnLCAncG9ydCcsICdwcm90b2NvbCcsICdwYXlsb2FkcyddLFxuICAgICAgZm9ybWF0OiBcIiVzICVkICVzICVzXCJcbiAgfV0sXG4gIGE6IFtcbiAgICB7IC8vYT1ydHBtYXA6MTEwIE1QNEEtTEFUTS85MDAwMFxuICAgICAgcHVzaDogJ3J0cCcsXG4gICAgICByZWc6IC9ecnRwbWFwXFw6KFxcZCopIChcXHcqKVxcLyhcXGQqKS8sXG4gICAgICBuYW1lczogWydwYXlsb2FkJywgJ2NvZGVjJywgJ3JhdGUnXSxcbiAgICAgIGZvcm1hdDogXCJydHBtYXA6JWQgJXMvJWRcIlxuICAgIH0sXG4gICAgeyAvL2E9Zm10cDoxMDggcHJvZmlsZS1sZXZlbC1pZD0yNDtvYmplY3Q9MjM7Yml0cmF0ZT02NDAwMFxuICAgICAgcHVzaDogJ2ZtdHAnLFxuICAgICAgcmVnOiAvXmZtdHBcXDooXFxkKikgKC4qKS8sXG4gICAgICBuYW1lczogWydwYXlsb2FkJywgJ2NvbmZpZyddLFxuICAgICAgZm9ybWF0OiBcImZtdHA6JWQgJXNcIlxuICAgIH0sXG4gICAgeyAvL2E9cnRjcC1mYjo5OCB0cnItaW50IDEwMFxuICAgICAgcHVzaDogJ3J0Y3BGYlRyckludCcsXG4gICAgICByZWc6IC9ecnRjcC1mYlxcOihcXCp8XFxkKikgdHJyLWludCAoXFxkKikvLFxuICAgICAgbmFtZXM6IFsncGF5bG9hZCcsICd2YWx1ZSddLFxuICAgICAgZm9ybWF0OiBcInJ0Y3AtZmI6JWQgdHJyLWludCAlZFwiXG4gICAgfSxcbiAgICB7IC8vYT1ydGNwLWZiOjk4IG5hY2sgcnBzaVxuICAgICAgcHVzaDogJ3J0Y3BGYicsXG4gICAgICByZWc6IC9ecnRjcC1mYlxcOihcXCp8XFxkKikgKFxcdyopID8oXFx3KikvLFxuICAgICAgbmFtZXM6IFsncGF5bG9hZCcsICd0eXBlJywgJ3N1YnR5cGUnXSxcbiAgICAgIGZvcm1hdDogXCJydGNwLWZiOiVzICVzICVzXCJcbiAgICB9LFxuICAgIHsgLy9hPWV4dG1hcDoyIHVybjppZXRmOnBhcmFtczpydHAtaGRyZXh0OnRvZmZzZXRcbiAgICAgIC8vYT1leHRtYXA6MS9yZWN2b25seSBVUkktZ3BzLXN0cmluZ1xuICAgICAgcHVzaDogJ2V4dCcsXG4gICAgICByZWc6IC9eZXh0bWFwOihbYS16QS1aMC05X1xcL10qKSAoW14gXSopID8oLiopLyxcbiAgICAgIG5hbWVzOiBbJ3ZhbHVlJywgJ3VyaScsICdjb25maWcnXSwgLy8gdmFsdWUgbWF5IGluY2x1ZGUgXCIvZGlyZWN0aW9uXCIgc3VmZml4XG4gICAgICBmb3JtYXQ6IFwiZXh0bWFwOiVzICVzICVzXCJcbiAgICB9LFxuICAgIHtcbiAgICAgIC8vYT1jcnlwdG86MSBBRVNfQ01fMTI4X0hNQUNfU0hBMV84MCBpbmxpbmU6UFMxdVFDVmVlQ0ZDYW5WbWNqa3BQeXdqTldoY1lEMG1YWHR4YVZCUnwyXjIwfDE6MzJcbiAgICAgIHB1c2g6ICdjcnlwdG8nLFxuICAgICAgcmVnOiAvXmNyeXB0bzooXFxkKikgKFthLXpBLVowLTlfXSopID8oW14gXSopID8oLiopLyxcbiAgICAgIG5hbWVzOiBbJ2lkJywgJ3N1aXRlJywgJ2NvbmZpZycsICdzZXNzaW9uQ29uZmlnJ10sXG4gICAgICBmb3JtYXQ6IFwiY3J5cHRvOiVkICVzICVzICVzXCJcbiAgICB9LFxuICAgIHsgLy9hPXNldHVwOmFjdHBhc3NcbiAgICAgIG5hbWU6ICdzZXR1cCcsXG4gICAgICByZWc6IC9ec2V0dXBcXDooXFx3KikvLFxuICAgICAgZm9ybWF0OiBcInNldHVwOiVzXCJcbiAgICB9LFxuICAgIHsgLy9hPW1pZDoxXG4gICAgICBuYW1lOiAnbWlkJyxcbiAgICAgIHJlZzogL15taWRcXDooXFx3KikvLFxuICAgICAgZm9ybWF0OiBcIm1pZDolc1wiXG4gICAgfSxcbiAgICB7IC8vYT1wdGltZToyMFxuICAgICAgbmFtZTogJ3B0aW1lJyxcbiAgICAgIHJlZzogL15wdGltZVxcOihcXGQqKS8sXG4gICAgICBmb3JtYXQ6IFwicHRpbWU6JWRcIlxuICAgIH0sXG4gICAgeyAvL2E9bWF4cHRpbWU6NjBcbiAgICAgIG5hbWU6ICdtYXhwdGltZScsXG4gICAgICByZWc6IC9ebWF4cHRpbWVcXDooXFxkKikvLFxuICAgICAgZm9ybWF0OiBcIm1heHB0aW1lOiVkXCJcbiAgICB9LFxuICAgIHsgLy9hPXNlbmRyZWN2XG4gICAgICBuYW1lOiAnc2VuZHJlY3YnLFxuICAgICAgcmVnOiAvXihzZW5kcmVjdnxyZWN2b25seXxzZW5kb25seXxpbmFjdGl2ZSkvXG4gICAgfSxcbiAgICB7IC8vYT1pY2UtdWZyYWc6RjdnSVxuICAgICAgbmFtZTogJ2ljZVVmcmFnJyxcbiAgICAgIHJlZzogL15pY2UtdWZyYWdcXDooLiopLyxcbiAgICAgIGZvcm1hdDogXCJpY2UtdWZyYWc6JXNcIlxuICAgIH0sXG4gICAgeyAvL2E9aWNlLXB3ZDp4OWNtbC9ZemljaFYyK1hsaGlNdThnXG4gICAgICBuYW1lOiAnaWNlUHdkJyxcbiAgICAgIHJlZzogL15pY2UtcHdkXFw6KC4qKS8sXG4gICAgICBmb3JtYXQ6IFwiaWNlLXB3ZDolc1wiXG4gICAgfSxcbiAgICB7IC8vYT1maW5nZXJwcmludDpTSEEtMSAwMDoxMToyMjozMzo0NDo1NTo2Njo3Nzo4ODo5OTpBQTpCQjpDQzpERDpFRTpGRjowMDoxMToyMjozM1xuICAgICAgbmFtZTogJ2ZpbmdlcnByaW50JyxcbiAgICAgIHJlZzogL15maW5nZXJwcmludFxcOihcXFMqKSAoLiopLyxcbiAgICAgIG5hbWVzOiBbJ3R5cGUnLCAnaGFzaCddLFxuICAgICAgZm9ybWF0OiBcImZpbmdlcnByaW50OiVzICVzXCJcbiAgICB9LFxuICAgIHsgLy9hPWNhbmRpZGF0ZTowIDEgVURQIDIxMTM2NjczMjcgMjAzLjAuMTEzLjEgNTQ0MDAgdHlwIGhvc3RcbiAgICAgIHB1c2g6ICdjYW5kaWRhdGVzJyxcbiAgICAgIHJlZzogL15jYW5kaWRhdGU6KFxcUyopIChcXGQqKSAoXFxTKikgKFxcZCopIChcXFMqKSAoXFxkKikgdHlwIChcXFMqKS8sXG4gICAgICBuYW1lczogWydmb3VuZGF0aW9uJywgJ2NvbXBvbmVudCcsICd0cmFuc3BvcnQnLCAncHJpb3JpdHknLCAnaXAnLCAncG9ydCcsICd0eXBlJ10sXG4gICAgICBmb3JtYXQ6IFwiY2FuZGlkYXRlOiVzICVkICVzICVkICVzICVkIHR5cCAlc1wiXG4gICAgfSxcbiAgICB7IC8vYT1yZW1vdGUtY2FuZGlkYXRlczoxIDIwMy4wLjExMy4xIDU0NDAwIDIgMjAzLjAuMTEzLjEgNTQ0MDEgLi4uXG4gICAgICBuYW1lOiAncmVtb3RlQ2FuZGlkYXRlcycsXG4gICAgICByZWc6IC9ecmVtb3RlLWNhbmRpZGF0ZXM6KC4qKS8sXG4gICAgICBmb3JtYXQ6IFwicmVtb3RlLWNhbmRpZGF0ZXM6JXNcIlxuICAgIH0sXG4gICAgeyAvL2E9aWNlLW9wdGlvbnM6Z29vZ2xlLWljZVxuICAgICAgbmFtZTogJ2ljZU9wdGlvbnMnLFxuICAgICAgcmVnOiAvXmljZS1vcHRpb25zXFw6KC4qKS8sXG4gICAgICBmb3JtYXQ6IFwiaWNlLW9wdGlvbnM6JXNcIlxuICAgIH0sXG4gICAgeyAvL2E9c3NyYzoyNTY2MTA3NTY5IGNuYW1lOnQ5WVU4TTFVeFRGOFkxQTFcbiAgICAgIHB1c2g6IFwic3NyY3NcIixcbiAgICAgIHJlZzogL15zc3JjXFw6KFxcZCopIChbYS16QS1aMC05X10qKVxcOiguKikvLFxuICAgICAgbmFtZXM6IFsnaWQnLCAnYXR0cmlidXRlJywgJ3ZhbHVlJ10sXG4gICAgICBmb3JtYXQ6IFwic3NyYzolZCAlczolc1wiXG4gICAgfSxcbiAgICB7IC8vYT1tc2lkLXNlbWFudGljOiBXTVMgSnZsYW01WDNTWDFPUDZwbjIweldvZ3ZhS0p6NUhqZjlPbmxWXG4gICAgICBuYW1lOiBcIm1zaWRTZW1hbnRpY1wiLFxuICAgICAgcmVnOiAvXm1zaWQtc2VtYW50aWNcXDogKFxcdyopICguKikvLFxuICAgICAgbmFtZXM6IFsnc2VtYW50aWMnLCAndG9rZW4nXSxcbiAgICAgIGZvcm1hdDogXCJtc2lkLXNlbWFudGljOiAlcyAlc1wiIC8vIHNwYWNlIGFmdGVyIFwiOlwiIGlzIG5vdCBhY2NpZGVudGFsXG4gICAgfSxcbiAgICB7IC8vYT1ncm91cDpCVU5ETEUgYXVkaW8gdmlkZW9cbiAgICAgIHB1c2g6ICdncm91cHMnLFxuICAgICAgcmVnOiAvXmdyb3VwXFw6KFxcdyopICguKikvLFxuICAgICAgbmFtZXM6IFsndHlwZScsICdtaWRzJ10sXG4gICAgICBmb3JtYXQ6IFwiZ3JvdXA6JXMgJXNcIlxuICAgIH0sXG4gICAgeyAvL2E9cnRjcC1tdXhcbiAgICAgIG5hbWU6ICdydGNwTXV4JyxcbiAgICAgIHJlZzogL14ocnRjcC1tdXgpL1xuICAgIH1cbiAgXVxufTtcblxuLy8gc2V0IHNlbnNpYmxlIGRlZmF1bHRzIHRvIGF2b2lkIHBvbGx1dGluZyB0aGUgZ3JhbW1hciB3aXRoIGJvcmluZyBkZXRhaWxzXG5PYmplY3Qua2V5cyhncmFtbWFyKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgdmFyIG9ianMgPSBncmFtbWFyW2tleV07XG4gIG9ianMuZm9yRWFjaChmdW5jdGlvbiAob2JqKSB7XG4gICAgaWYgKCFvYmoucmVnKSB7XG4gICAgICBvYmoucmVnID0gLyguKikvO1xuICAgIH1cbiAgICBpZiAoIW9iai5mb3JtYXQpIHtcbiAgICAgIG9iai5mb3JtYXQgPSBcIiVzXCI7XG4gICAgfVxuICB9KTtcbn0pOyBcbiIsInZhciB0b0ludElmSW50ID0gZnVuY3Rpb24gKHYpIHtcbiAgcmV0dXJuIFN0cmluZyhOdW1iZXIodikpID09PSB2ID8gTnVtYmVyKHYpIDogdjtcbn07XG5cbnZhciBhdHRhY2hQcm9wZXJ0aWVzID0gZnVuY3Rpb24gKG1hdGNoLCBsb2NhdGlvbiwgbmFtZXMsIHJhd05hbWUpIHtcbiAgaWYgKHJhd05hbWUgJiYgIW5hbWVzKSB7XG4gICAgbG9jYXRpb25bcmF3TmFtZV0gPSB0b0ludElmSW50KG1hdGNoWzFdKTtcbiAgfVxuICBlbHNlIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBsb2NhdGlvbltuYW1lc1tpXV0gPSB0b0ludElmSW50KG1hdGNoW2krMV0pO1xuICAgIH1cbiAgfVxufTtcblxudmFyIHBhcnNlUmVnID0gZnVuY3Rpb24gKG9iaiwgbG9jYXRpb24sIGNvbnRlbnQpIHtcbiAgdmFyIG5lZWRzQmxhbmsgPSBvYmoubmFtZSAmJiBvYmoubmFtZXM7XG4gIGlmIChvYmoucHVzaCAmJiAhbG9jYXRpb25bb2JqLnB1c2hdKSB7XG4gICAgbG9jYXRpb25bb2JqLnB1c2hdID0gW107XG4gIH1cbiAgZWxzZSBpZiAobmVlZHNCbGFuayAmJiAhbG9jYXRpb25bb2JqLm5hbWVdKSB7XG4gICAgbG9jYXRpb25bb2JqLm5hbWVdID0ge307XG4gIH1cbiAgdmFyIGtleUxvY2F0aW9uID0gb2JqLnB1c2ggP1xuICAgIHt9IDogIC8vIGJsYW5rIG9iamVjdCB0aGF0IHdpbGwgYmUgcHVzaGVkXG4gICAgbmVlZHNCbGFuayA/IGxvY2F0aW9uW29iai5uYW1lXSA6IGxvY2F0aW9uOyAvLyBvdGhlcndpc2UsIG5hbWVkIGxvY2F0aW9uIG9yIHJvb3RcblxuICBhdHRhY2hQcm9wZXJ0aWVzKGNvbnRlbnQubWF0Y2gob2JqLnJlZyksIGtleUxvY2F0aW9uLCBvYmoubmFtZXMsIG9iai5uYW1lKTtcblxuICBpZiAob2JqLnB1c2gpIHtcbiAgICBsb2NhdGlvbltvYmoucHVzaF0ucHVzaChrZXlMb2NhdGlvbik7XG4gIH1cbn07XG5cbnZhciBncmFtbWFyID0gcmVxdWlyZSgnLi9ncmFtbWFyJyk7XG52YXIgdmFsaWRMaW5lID0gUmVnRXhwLnByb3RvdHlwZS50ZXN0LmJpbmQoL14oW2Etel0pPSguKikvKTtcblxuZXhwb3J0cy5wYXJzZSA9IGZ1bmN0aW9uIChzZHApIHtcbiAgdmFyIHNlc3Npb24gPSB7fVxuICAgICwgbWVkaWEgPSBbXVxuICAgICwgbG9jYXRpb24gPSBzZXNzaW9uOyAvLyBwb2ludHMgYXQgd2hlcmUgcHJvcGVydGllcyBnbyB1bmRlciAob25lIG9mIHRoZSBhYm92ZSlcblxuICAvLyBwYXJzZSBsaW5lcyB3ZSB1bmRlcnN0YW5kXG4gIHNkcC5zcGxpdCgnXFxuJykuZmlsdGVyKHZhbGlkTGluZSkuZm9yRWFjaChmdW5jdGlvbiAobCkge1xuICAgIHZhciB0eXBlID0gbFswXTtcbiAgICB2YXIgY29udGVudCA9IGwuc2xpY2UoMik7XG4gICAgaWYgKHR5cGUgPT09ICdtJykge1xuICAgICAgbWVkaWEucHVzaCh7cnRwOiBbXSwgZm10cDogW119KTtcbiAgICAgIGxvY2F0aW9uID0gbWVkaWFbbWVkaWEubGVuZ3RoLTFdOyAvLyBwb2ludCBhdCBsYXRlc3QgbWVkaWEgbGluZVxuICAgIH1cblxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgKGdyYW1tYXJbdHlwZV0gfHwgW10pLmxlbmd0aDsgaiArPSAxKSB7XG4gICAgICB2YXIgb2JqID0gZ3JhbW1hclt0eXBlXVtqXTtcbiAgICAgIGlmIChvYmoucmVnLnRlc3QoY29udGVudCkpIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlUmVnKG9iaiwgbG9jYXRpb24sIGNvbnRlbnQpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgc2Vzc2lvbi5tZWRpYSA9IG1lZGlhOyAvLyBsaW5rIGl0IHVwXG4gIHJldHVybiBzZXNzaW9uO1xufTtcblxudmFyIGZtdHBSZWR1Y2VyID0gZnVuY3Rpb24gKGFjYywgZXhwcikge1xuICB2YXIgcyA9IGV4cHIuc3BsaXQoJz0nKTtcbiAgaWYgKHMubGVuZ3RoID09PSAyKSB7XG4gICAgYWNjW3NbMF1dID0gdG9JbnRJZkludChzWzFdKTtcbiAgfVxuICByZXR1cm4gYWNjO1xufTtcblxuZXhwb3J0cy5wYXJzZUZtdHBDb25maWcgPSBmdW5jdGlvbiAoc3RyKSB7XG4gIHJldHVybiBzdHIuc3BsaXQoJzsnKS5yZWR1Y2UoZm10cFJlZHVjZXIsIHt9KTtcbn07XG5cbmV4cG9ydHMucGFyc2VQYXlsb2FkcyA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgcmV0dXJuIHN0ci5zcGxpdCgnICcpLm1hcChOdW1iZXIpO1xufTtcblxuZXhwb3J0cy5wYXJzZVJlbW90ZUNhbmRpZGF0ZXMgPSBmdW5jdGlvbiAoc3RyKSB7XG4gIHZhciBjYW5kaWRhdGVzID0gW107XG4gIHZhciBwYXJ0cyA9IHN0ci5zcGxpdCgnICcpLm1hcCh0b0ludElmSW50KTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7IGkgKz0gMykge1xuICAgIGNhbmRpZGF0ZXMucHVzaCh7XG4gICAgICBjb21wb25lbnQ6IHBhcnRzW2ldLFxuICAgICAgaXA6IHBhcnRzW2kgKyAxXSxcbiAgICAgIHBvcnQ6IHBhcnRzW2kgKyAyXVxuICAgIH0pO1xuICB9XG4gIHJldHVybiBjYW5kaWRhdGVzO1xufTtcbiIsInZhciBncmFtbWFyID0gcmVxdWlyZSgnLi9ncmFtbWFyJyk7XG52YXIgZm9ybWF0ID0gcmVxdWlyZSgndXRpbCcpLmZvcm1hdDtcblxudmFyIG1ha2VMaW5lID0gZnVuY3Rpb24gKHR5cGUsIG9iaiwgbG9jYXRpb24pIHtcbiAgdmFyIGFyZ3MgPSBbdHlwZSArICc9JyArIG9iai5mb3JtYXRdO1xuICBpZiAob2JqLm5hbWVzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmoubmFtZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIHZhciBuID0gb2JqLm5hbWVzW2ldO1xuICAgICAgaWYgKG9iai5uYW1lKSB7XG4gICAgICAgIGFyZ3MucHVzaChsb2NhdGlvbltvYmoubmFtZV1bbl0pO1xuICAgICAgfVxuICAgICAgZWxzZSB7IC8vIGZvciBtTGluZSBhbmQgcHVzaCBhdHRyaWJ1dGVzXG4gICAgICAgIGFyZ3MucHVzaChsb2NhdGlvbltvYmoubmFtZXNbaV1dKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZWxzZSB7XG4gICAgYXJncy5wdXNoKGxvY2F0aW9uW29iai5uYW1lXSk7XG4gIH1cbiAgcmV0dXJuIGZvcm1hdC5hcHBseShudWxsLCBhcmdzKTtcbn07XG5cbi8vIFJGQyBzcGVjaWZpZWQgb3JkZXJcbi8vIFRPRE86IGV4dGVuZCB0aGlzIHdpdGggYWxsIHRoZSByZXN0XG52YXIgZGVmYXVsdE91dGVyT3JkZXIgPSBbXG4gICd2JywgJ28nLCAncycsICdpJyxcbiAgJ3UnLCAnZScsICdwJywgJ2MnLFxuICAnYicsICd6JywgJ2EnLCAndCcsICdyJ1xuXTtcbnZhciBkZWZhdWx0SW5uZXJPcmRlciA9IFsnaScsICdjJywgJ2InLCAnYSddO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHNlc3Npb24sIG9wdHMpIHtcbiAgb3B0cyA9IG9wdHMgfHwge307XG4gIC8vIGVuc3VyZSBjZXJ0YWluIHByb3BlcnRpZXMgZXhpc3RcbiAgaWYgKHNlc3Npb24udmVyc2lvbiA9PSBudWxsKSB7XG4gICAgc2Vzc2lvbi52ZXJzaW9uID0gMDsgLy8gXCJ2PTBcIiBtdXN0IGJlIHRoZXJlIChvbmx5IGRlZmluZWQgdmVyc2lvbiBhdG0pXG4gIH1cbiAgaWYgKHNlc3Npb24ubmFtZSA9PSBudWxsKSB7XG4gICAgc2Vzc2lvbi5uYW1lID0gXCIgXCI7IC8vIFwicz0gXCIgbXVzdCBiZSB0aGVyZSBpZiBubyBtZWFuaW5nZnVsIG5hbWUgc2V0XG4gIH1cbiAgc2Vzc2lvbi5tZWRpYS5mb3JFYWNoKGZ1bmN0aW9uIChtTGluZSkge1xuICAgIGlmIChtTGluZS5wYXlsb2FkcyA9PSBudWxsKSB7XG4gICAgICBtTGluZS5wYXlsb2FkcyA9IFwiXCI7XG4gICAgfVxuICB9KTtcblxuICB2YXIgb3V0ZXJPcmRlciA9IG9wdHMub3V0ZXJPcmRlciB8fCBkZWZhdWx0T3V0ZXJPcmRlcjtcbiAgdmFyIGlubmVyT3JkZXIgPSBvcHRzLmlubmVyT3JkZXIgfHwgZGVmYXVsdElubmVyT3JkZXI7XG4gIHZhciBzZHAgPSBbXTtcblxuICAvLyBsb29wIHRocm91Z2ggb3V0ZXJPcmRlciBmb3IgbWF0Y2hpbmcgcHJvcGVydGllcyBvbiBzZXNzaW9uXG4gIG91dGVyT3JkZXIuZm9yRWFjaChmdW5jdGlvbiAodHlwZSkge1xuICAgIGdyYW1tYXJbdHlwZV0uZm9yRWFjaChmdW5jdGlvbiAob2JqKSB7XG4gICAgICBpZiAob2JqLm5hbWUgaW4gc2Vzc2lvbikge1xuICAgICAgICBzZHAucHVzaChtYWtlTGluZSh0eXBlLCBvYmosIHNlc3Npb24pKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKG9iai5wdXNoIGluIHNlc3Npb24pIHtcbiAgICAgICAgc2Vzc2lvbltvYmoucHVzaF0uZm9yRWFjaChmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICBzZHAucHVzaChtYWtlTGluZSh0eXBlLCBvYmosIGVsKSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcblxuICAvLyB0aGVuIGZvciBlYWNoIG1lZGlhIGxpbmUsIGZvbGxvdyB0aGUgaW5uZXJPcmRlclxuICBzZXNzaW9uLm1lZGlhLmZvckVhY2goZnVuY3Rpb24gKG1MaW5lKSB7XG4gICAgc2RwLnB1c2gobWFrZUxpbmUoJ20nLCBncmFtbWFyLm1bMF0sIG1MaW5lKSk7XG5cbiAgICBpbm5lck9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHR5cGUpIHtcbiAgICAgIGdyYW1tYXJbdHlwZV0uZm9yRWFjaChmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIGlmIChvYmoubmFtZSBpbiBtTGluZSkge1xuICAgICAgICAgIHNkcC5wdXNoKG1ha2VMaW5lKHR5cGUsIG9iaiwgbUxpbmUpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChvYmoucHVzaCBpbiBtTGluZSkge1xuICAgICAgICAgIG1MaW5lW29iai5wdXNoXS5mb3JFYWNoKGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgc2RwLnB1c2gobWFrZUxpbmUodHlwZSwgb2JqLCBlbCkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIHNkcC5qb2luKCdcXG4nKSArICdcXG4nO1xufTtcbiIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgaW86IGZhbHNlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBldmUgPSByZXF1aXJlKCdldmUnKTtcbnZhciBydGMgPSByZXF1aXJlKCdydGMnKTtcbnZhciBsb2dnZXIgPSByZXF1aXJlKCdjb2cvbG9nZ2VyJykoJ2dsdWUtc2Vzc2lvbm1hbmFnZXInKTtcbnZhciBjcmVhdGVTaWduYWxsZXIgPSByZXF1aXJlKCdydGMtc2lnbmFsbGVyJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xuXG4vKipcbiAgIyMjIFNlc3Npb25NYW5hZ2VyXG5cbiAgVGhlIFNlc3Npb25NYW5hZ2VyIGNsYXNzIGFzc2lzdHMgd2l0aCBpbnRlcmFjdGluZyB3aXRoIHRoZSBzaWduYWxsaW5nXG4gIHNlcnZlciBhbmQgY3JlYXRpbmcgcGVlciBjb25uZWN0aW9ucyBiZXR3ZWVuIHZhbGlkIHBhcnRpZXMuICBJdCB1c2VzXG4gIGV2ZSB0byBjcmVhdGUgYSBkZWNvdXBsZWQgd2F5IHRvIGdldCBwZWVyIGluZm9ybWF0aW9uLlxuXG4qKi9cbmZ1bmN0aW9uIFNlc3Npb25NYW5hZ2VyKGNvbmZpZykge1xuICBpZiAoISAodGhpcyBpbnN0YW5jZW9mIFNlc3Npb25NYW5hZ2VyKSkge1xuICAgIHJldHVybiBuZXcgU2Vzc2lvbk1hbmFnZXIoY29uZmlnKTtcbiAgfVxuXG4gIC8vIGluaXRpYWxpc2UgdGhlIHJvb20gYW5kIG91ciByb2xlXG4gIHRoaXMucm9vbSA9IGNvbmZpZy5yb29tO1xuICB0aGlzLnJvbGUgPSBjb25maWcucm9sZTtcblxuICAvLyBzYXZlIHRoZSBjb25maWdcbiAgdGhpcy5jZmcgPSBjb25maWc7XG5cbiAgLy8gaW5pdGlhbGlzZSBvdXIgcGVlcnMgbGlzdFxuICB0aGlzLnBlZXJzID0ge307XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgc3RyZWFtcyBkYXRhIGxpc3RcbiAgdGhpcy5zdHJlYW1zID0ge307XG5cbiAgLy8gY3JlYXRlIG91ciB1bmRlcmx5aW5nIHNvY2tldCBjb25uZWN0aW9uXG4gIHRoaXMuc29ja2V0ID0gbmV3IFByaW11cyhjb25maWcuc2lnbmFsaG9zdCk7XG5cbiAgLy8gY3JlYXRlIG91ciBzaWduYWxsaW5nIGludGVyZmFjZVxuICB0aGlzLnNpZ25hbGxlciA9IGNyZWF0ZVNpZ25hbGxlcih0aGlzLnNvY2tldCk7XG5cbiAgLy8gaG9vayB1cCBzaWduYWxsZXIgZXZlbnRzXG4gIHRoaXMuX2JpbmRFdmVudHModGhpcy5zaWduYWxsZXIpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlc3Npb25NYW5hZ2VyO1xuXG4vKipcbiAgIyMjIyBhbm5vdW5jZSgpXG5cbiAgQW5ub3VuY2Ugb3Vyc2VsdmVzIG9uIHRoZSBzaWduYWxsaW5nIGNoYW5uZWxcbioqL1xuU2Vzc2lvbk1hbmFnZXIucHJvdG90eXBlLmFubm91bmNlID0gZnVuY3Rpb24odGFyZ2V0SWQpIHtcbiAgdmFyIHNjb3BlID0gdGFyZ2V0SWQgPyB0aGlzLnNpZ25hbGxlci50byh0YXJnZXRJZCkgOiB0aGlzLnNpZ25hbGxlcjtcblxuICBsb2dnZXIoJ2Fubm91bmNpbmcgc2VsZiB0bzogJyArICh0YXJnZXRJZCB8fCAnYWxsJykpO1xuICBzY29wZS5hbm5vdW5jZSh7IHJvb206IHRoaXMucm9vbSwgcm9sZTogdGhpcy5yb2xlIH0pO1xufTtcblxuLyoqXG4gICMjIyMgYnJvYWRjYXN0KHN0cmVhbSlcblxuICBCcm9hZGNhc3QgYSBzdHJlYW0gdG8gb3VyIGNvbm5lY3RlZCBwZWVycy5cblxuKiovXG5TZXNzaW9uTWFuYWdlci5wcm90b3R5cGUuYnJvYWRjYXN0ID0gZnVuY3Rpb24oc3RyZWFtLCBkYXRhKSB7XG4gIHZhciBwZWVycyA9IHRoaXMucGVlcnM7XG4gIHZhciBtZ3IgPSB0aGlzO1xuXG4gIGZ1bmN0aW9uIGNvbm5lY3RQZWVyKHBlZXIsIHBlZXJJZCkge1xuICAgIG1nci50YWdTdHJlYW0oc3RyZWFtLCBwZWVySWQsIGRhdGEpO1xuXG4gICAgdHJ5IHtcbiAgICAgIHBlZXIuYWRkU3RyZWFtKHN0cmVhbSk7XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICBsb2dnZXIoJ2NhcHR1cmVkIGVycm9yIGF0dGVtcHRpbmcgdG8gYWRkIHN0cmVhbTogJywgZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gYWRkIHRvIGV4aXN0aW5nIHN0cmVhbXNcbiAgT2JqZWN0LmtleXMocGVlcnMpLmZvckVhY2goZnVuY3Rpb24ocGVlcklkKSB7XG4gICAgaWYgKHBlZXJzW3BlZXJJZF0pIHtcbiAgICAgIGNvbm5lY3RQZWVyKHBlZXJzW3BlZXJJZF0sIHBlZXJJZCk7XG4gICAgfVxuICB9KTtcblxuICAvLyB3aGVuIGEgbmV3IHBlZXIgYXJyaXZlcywgYWRkIGl0IHRvIHRoYXQgcGVlciBhbHNvXG4gIGV2ZS5vbignZ2x1ZS5wZWVyLmpvaW4nLCBjb25uZWN0UGVlcik7XG5cbiAgLy8gd2hlbiB0aGUgc3RyZWFtIGVuZHMgZGlzY29ubmVjdCB0aGUgbGlzdGVuZXJcbiAgLy8gVE9ETzogdXNlIGFkZEV2ZW50TGlzdGVuZXIgb25jZSBzdXBwb3J0ZWRcbiAgc3RyZWFtLm9uZW5kZWQgPSBmdW5jdGlvbigpIHtcbiAgICBldmUub2ZmKCdnbHVlLnBlZXIuam9pbicsIGNvbm5lY3RQZWVyKTtcbiAgfTtcbn07XG5cbi8qKlxuICAjIyMjIGdldFN0cmVhbURhdGEoc3RyZWFtLCBjYWxsYmFjaylcblxuICBHaXZlbiB0aGUgaW5wdXQgc3RyZWFtIGBzdHJlYW1gLCByZXR1cm4gdGhlIGRhdGEgZm9yIHRoZSBzdHJlYW0uICBUaGVcbiAgcHJvdmlkZWQgYGNhbGxiYWNrYCB3aWxsIG5vdCBiZSBjYWxsZWQgdW50aWwgcmVsZXZhbnQgZGF0YSBpcyBoZWxkIGJ5XG4gIHRoZSBzZXNzaW9uIG1hbmFnZXIuXG5cbioqL1xuU2Vzc2lvbk1hbmFnZXIucHJvdG90eXBlLmdldFN0cmVhbURhdGEgPSBmdW5jdGlvbihzdHJlYW0sIGNhbGxiYWNrKSB7XG4gIHZhciBpZCA9IHN0cmVhbSAmJiBzdHJlYW0uaWQ7XG4gIHZhciBkYXRhID0gdGhpcy5zdHJlYW1zW2lkXTtcblxuICAvLyBpZiB3ZSBkb24ndCBoYXZlIGFuIGlkLCB0aGVuIGFib3J0XG4gIGlmICghIGlkKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gaWYgd2UgaGF2ZSBkYXRhIGFscmVhZHksIHJldHVybiBpdFxuICBpZiAoZGF0YSkge1xuICAgIGNhbGxiYWNrKGRhdGEpO1xuICB9XG4gIC8vIG90aGVyd2lzZSwgd2FpdCBmb3IgdGhlIGRhdGEgdG8gYmUgY3JlYXRlZFxuICBlbHNlIHtcbiAgICBldmUub25jZSgnZ2x1ZS5zdHJlYW1kYXRhLicgKyBpZCwgY2FsbGJhY2spO1xuICB9XG59O1xuXG4vKipcbiAgIyMjIyB0YWdTdHJlYW0oc3RyZWFtLCB0YXJnZXRJZCwgZGF0YSlcblxuICBUaGUgdGFnU3RyZWFtIGlzIHVzZWQgdG8gcGFzcyBzdHJlYW0gaWRlbnRpZmljYXRpb24gaW5mb3JtYXRpb24gYWxvbmcgdG8gdGhlXG4gIHRhcmdldCBwZWVyLiAgVGhpcyBpbmZvcm1hdGlvbiBpcyB1c2VmdWwgd2hlbiBhIHBhcnRpY3VsYXIgcmVtb3RlIG1lZGlhXG4gIGVsZW1lbnQgaXMgZXhwZWN0aW5nIHRoZSBjb250ZW50cyBvZiBhIHBhcnRpY3VsYXIgY2FwdHVyZSB0YXJnZXQuXG5cbioqL1xuU2Vzc2lvbk1hbmFnZXIucHJvdG90eXBlLnRhZ1N0cmVhbSA9IGZ1bmN0aW9uKHN0cmVhbSwgdGFyZ2V0SWQsIGRhdGEpIHtcbiAgdGhpcy5zaWduYWxsZXIudG8odGFyZ2V0SWQpLnNlbmQoJy9zdHJlYW1kYXRhJywgZXh0ZW5kKHt9LCBkYXRhLCB7XG4gICAgaWQ6IHN0cmVhbS5pZCxcbiAgICBsYWJlbDogc3RyZWFtLmxhYmVsXG4gIH0pKTtcbn07XG5cbi8qIGludGVybmFsIG1ldGhvZHMgKi9cblxuU2Vzc2lvbk1hbmFnZXIucHJvdG90eXBlLl9iaW5kRXZlbnRzID0gZnVuY3Rpb24oc2lnbmFsbGVyKSB7XG4gIHZhciBtZ3IgPSB0aGlzO1xuXG4gIC8vIFRPRE86IGV4dHJhY3QgdGhlIG1lYW5pbmdmdWwgcGFydHMgZnJvbSB0aGUgY29uZmlnXG4gIC8vIHZhciBvcHRzID0gdGhpcy5jZmc7XG4gIGxvZ2dlcignaW5pdGlhbGl6aW5nIGV2ZW50IGhhbmRsZXJzJyk7XG5cbiAgc2lnbmFsbGVyLm9uKCdhbm5vdW5jZScsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB2YXIgbnMgPSAnZ2x1ZS5wZWVyLmpvaW4uJyArIChkYXRhLnJvbGUgfHwgJ25vbmUnKVxuICAgIHZhciBwZWVyO1xuICAgIHZhciBtb25pdG9yO1xuXG4gICAgLy8gaWYgdGhlIHJvb20gZG9lcyBub3QgbWF0Y2ggb3VyIHJvb21cbiAgICAvLyBPUiwgd2UgYWxyZWFkeSBoYXZlIGFuIGFjdGl2ZSBwZWVyIGZvciB0aGF0IGlkLCB0aGVuIGFib3J0XG4gICAgaWYgKGRhdGEucm9vbSAhPT0gbWdyLnJvb20pIHtcbiAgICAgIHJldHVybiBsb2dnZXIoJ3JlY2VpdmVkIGFubm91bmNlIGZvciBpbmNvcnJlY3Qgcm9vbScpO1xuICAgIH1cblxuICAgIGlmIChtZ3IucGVlcnNbZGF0YS5pZF0pIHtcbiAgICAgIHJldHVybiBsb2dnZXIoJ2tub3duIHBlZXInKTtcbiAgICB9XG5cbiAgICAvLyBjcmVhdGUgb3VyIHBlZXIgY29ubmVjdGlvblxuICAgIHBlZXIgPSBtZ3IucGVlcnNbZGF0YS5pZF0gPSBydGMuY3JlYXRlQ29ubmVjdGlvbigpO1xuXG4gICAgLy8gY291cGxlIHRoZSBjb25uZWN0aW9uc1xuICAgIG1vbml0b3IgPSBydGMuY291cGxlKHBlZXIsIHsgaWQ6IGRhdGEuaWQgfSwgc2lnbmFsbGVyKTtcblxuICAgIC8vIHdhaXQgZm9yIHRoZSBtb25pdG9yIHRvIHRlbGwgdXMgd2UgaGF2ZSBhbiBhY3RpdmUgY29ubmVjdGlvblxuICAgIC8vIGJlZm9yZSBhdHRlbXB0aW5nIHRvIGJpbmQgdG8gYW55IFVJIGVsZW1lbnRzXG4gICAgbW9uaXRvci5vbmNlKCdhY3RpdmUnLCBmdW5jdGlvbigpIHtcbiAgICAgIGV2ZSgnZ2x1ZS5wZWVyLmFjdGl2ZS4nICsgKGRhdGEucm9sZSB8fCAnbm9uZScpLCBudWxsLCBwZWVyLCBkYXRhLmlkKTtcbiAgICB9KTtcblxuICAgIGV2ZSgnZ2x1ZS5wZWVyLmpvaW4uJyArIChkYXRhLnJvbGUgfHwgJ25vbmUnKSwgbnVsbCwgcGVlciwgZGF0YS5pZCk7XG5cbiAgICAvLyBpbnRyb2R1Y2Ugb3Vyc2VsZiB0byB0aGUgbmV3IHBlZXJcbiAgICBtZ3IuYW5ub3VuY2UoZGF0YS5pZCk7XG4gIH0pO1xuXG4gIHNpZ25hbGxlci5vbignbGVhdmUnLCBmdW5jdGlvbihpZCkge1xuICAgIC8vIGdldCB0aGUgcGVlclxuICAgIHZhciBwZWVyID0gbWdyLnBlZXJzW2lkXTtcblxuICAgIC8vIGlmIHRoaXMgaXMgYSBwZWVyIHdlIGtub3cgYWJvdXQsIHRoZW4gY2xvc2UgYW5kIHNlbmQgYSBub3RpZmljYXRpb25cbiAgICBpZiAocGVlcikge1xuICAgICAgcGVlci5jbG9zZSgpO1xuICAgICAgbWdyLnBlZXJzW2lkXSA9IHVuZGVmaW5lZDtcblxuICAgICAgLy8gdHJpZ2dlciB0aGUgbm90aWZpY2F0aW9uXG4gICAgICBldmUoJ2dsdWUucGVlci5sZWF2ZScsIG51bGwsIHBlZXIsIGlkKTtcbiAgICB9XG4gIH0pO1xuXG4gIHNpZ25hbGxlci5vbignc3RyZWFtZGF0YScsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAvLyBzYXZlIHRoZSBzdHJlYW0gZGF0YSB0byB0aGUgbG9jYWwgc3RyZWFtXG4gICAgbWdyLnN0cmVhbXNbZGF0YS5pZF0gPSBkYXRhO1xuICAgIGV2ZSgnZ2x1ZS5zdHJlYW1kYXRhLicgKyBkYXRhLmlkLCBudWxsLCBkYXRhKTtcbiAgfSk7XG59OyJdfQ==
(13)
});
;