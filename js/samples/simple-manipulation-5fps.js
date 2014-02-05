(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
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
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
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

},{}],4:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],5:[function(require,module,exports){
(function (process,global){// Copyright Joyent, Inc. and other Node contributors.
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
}).call(this,require("/home/doehlman/.bashinate/install/node/0.10.24/lib/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":4,"/home/doehlman/.bashinate/install/node/0.10.24/lib/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":3,"inherits":2}],6:[function(require,module,exports){
var media = require('rtc-media');
var canvas = require('rtc-videoproc');
var vid;

// capture media
media().render(vid = canvas(document.body, { fps: 5 }));

// add a draw handler to the pipeline
vid.pipeline.add(require('rtc-filter-grayscale'));
},{"rtc-filter-grayscale":10,"rtc-media":11,"rtc-videoproc":12}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
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
},{}],11:[function(require,module,exports){
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
},{"cog/extend":7,"cog/logger":8,"events":1,"rtc-core/detect":9,"util":5}],12:[function(require,module,exports){
/* jshint node: true */
/* global document: false */
/* global HTMLVideoElement: false */
'use strict';

var DEFAULT_FPS = 25;
var raf = require('fdom/raf');

/**
  # rtc-videoproc

  This is a small helper module that allows you to substitute a video
  element with a canvas element.  This can be useful when you want to
  do pixel manipulation of the rendered images, or in situations when
  a video element does not behave as you expect.

  ## Example Usage

  This was primarily written to work with the
  [rtc-media](https://github.com/rtc-io/rtc-media) library so here's an
  example of how it works there:

  <<< examples/rtc-media.js

  Normally, the `media().render` call will create a `<video>` element in
  the specified target container.  In this case, however, `rtc-canvas`
  intercepts the request and creates it's own fake video element that is
  passed back to the render call.

  ## Using the Processing Pipeline

  A processing pipeline has been included to assist with
  manipulating the canvas on the fly. Adding a processor to the pipeline is
  simply a matter of adding a pipeline processor available on the returned
  fake video:

  ```js
  // add a processor
  canvas.pipeline.add(function(imageData) {
    // examine the pixel data

    // if we've modified the pixel data and want to write that back
    // to the canvas then we must return a truthy value
    return true;
  });
  ```

  A more complete example is shown below:

  <<< examples/grayscale-filter.js

  ## Listening for custom `frame` events

  In addition to providing the opportunity to analyse and modify pixel data
  the `rtc-canvas` module also provides the a custom `frame` event for
  detecting when a new frame has been drawn to the canvas.

  A simple example can be found below:

  <<< examples/framelistener.js

  ## A Note with Regards to CPU Usage

  By default rtc-canvas will draw at 25fps but this can be modified to capture
  at a lower frame rate for slower devices, or increased if you have a
  machine with plenty of grunt.

  ## Reference

  ### canvas(target, opts)

  Create a fake video element for the specified target element.

  - `fps` - the redraw rate of the fake video (default = 25)

**/
module.exports = function(target, opts) {
  var canvas = (target instanceof HTMLCanvasElement) ?
    target :
    document.createElement('canvas');

  var vid = (target instanceof HTMLVideoElement) ?
    target :
    document.createElement('video');

  // if the target is a video
  if (target === vid) {
    // insert the canvas to the video parent element
    vid.parentNode.insertBefore(canvas, vid);
  }
  // otherwise, if the target was not a canvas add the canvas to the target
  else if (target !== canvas) {
    // append the canvas to the target
    target.appendChild(canvas);
  }

  // initialise the canvas width and height
  canvas.width = (opts || {}).width || 0;
  canvas.height = (opts || {}).height || 0;

  // hide the video element
  vid.style.display = 'none';

  // initialise the canvas pipeline
  canvas.pipeline = createFacade(canvas, vid, opts);

  return canvas;
};

/*
  ### createFacade(canvas, vid) ==> EventEmitter

  Inject the required fake properties onto the canvas and return a
  node-style EventEmitter that will provide updates on when the properties
  change.

*/
function createFacade(canvas, vid, opts) {
  var context = canvas.getContext('2d');
  var playing = false;
  var lastTick = 0;
  var tick;

  // initialise fps
  var fps = (opts || {}).fps || DEFAULT_FPS;

  // calaculate the draw delay, clamp as int
  var drawDelay = (1000 / fps) | 0;
  var drawWidth;
  var drawHeight;
  var drawX = 0;
  var drawY = 0;
  var drawData;

  var processors = [];
  var pIdx;
  var pCount = 0;
  var triggerFrameEvent = typeof CustomEvent != 'undefined';

  function addProcessor(processor) {
    pCount = processors.push(processor);
  }

  function redraw(tick) {
    var imageData;
    var tweaked;
    var evt;

    if (! playing) {
      return;
    }

    // get the current tick
    tick = tick || Date.now();

    // only draw as often as specified in the fps
    if (tick - lastTick > drawDelay) {
      // draw the image
      context.drawImage(vid, drawX, drawY, drawWidth, drawHeight);

      // create the frame event
      evt = triggerFrameEvent && new CustomEvent('frame', {
        detail: {
          tick: tick
        }
      });

      // if we have the frame event then dispatch
      if (evt) {
        canvas.dispatchEvent(evt);
      }

      // if we have processors, get the image data and pass it through
      if (pCount) {
        imageData = context.getImageData(0, 0, drawWidth, drawHeight);
        tweaked = false;

        // iterate through the processors
        for (pIdx = 0; pIdx < pCount; pIdx++) {
          // call the processor, and allow it to tell us if it has modified
          // the pipeline
          tweaked = processors[pIdx](imageData, context, canvas, drawData) ||
            tweaked;
        }

        if (tweaked) {
          // TODO: dirty area
          context.putImageData(imageData, 0, 0);
        }
      }

      // update the last tick
      lastTick = tick;
    }

    // queue up another redraw
    raf(redraw);
  }

  function handlePlaying() {
    var scale;
    var scaleX;
    var scaleY;

    // set the canvas the right size (if not already initialized)
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = vid.videoWidth;
      canvas.height = vid.videoHeight;
    }

    // if either width or height === 0 then bail
    if (canvas.width === 0 || canvas.height === 0) {
      return;
    }

    // calculate required scaling
    scale = Math.min(
      scaleX = (canvas.width / vid.videoWidth),
      scaleY = (canvas.height / vid.videoHeight)
    );

    // calculate the scaled draw width and height
    drawWidth = (vid.videoWidth * scale) | 0;
    drawHeight = (vid.videoHeight * scale) | 0;

    // calculate the offsetX and Y
    drawX = (canvas.width - drawWidth) >> 1;
    drawY = (canvas.height - drawHeight) >> 1;

    // save the draw data
    drawData = {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight
    };

    // flag as playing
    playing = true;

    // start the animation loop
    raf(redraw);
  }

  vid.addEventListener('playing', handlePlaying);

  // inject the fake properties
  ['mozSrcObject', 'src'].forEach(function(prop) {
    if (typeof vid[prop] == 'undefined') {
      return;
    }

    Object.defineProperty(canvas, prop, {
      get: function() {
        return vid[prop];
      },

      set: function(value) {
        vid[prop] = value;
      }
    });
  });

  // add a fake play function
  canvas.play = function() {
    // play the video
    vid.play();
  };

  return {
    add: addProcessor
  };
}
},{"fdom/raf":13}],13:[function(require,module,exports){
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
},{}]},{},[6])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9kb2VobG1hbi8uYmFzaGluYXRlL2luc3RhbGwvbm9kZS8wLjEwLjI0L2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL2hvbWUvZG9laGxtYW4vLmJhc2hpbmF0ZS9pbnN0YWxsL25vZGUvMC4xMC4yNC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCIvaG9tZS9kb2VobG1hbi8uYmFzaGluYXRlL2luc3RhbGwvbm9kZS8wLjEwLjI0L2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIi9ob21lL2RvZWhsbWFuLy5iYXNoaW5hdGUvaW5zdGFsbC9ub2RlLzAuMTAuMjQvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbnNlcnQtbW9kdWxlLWdsb2JhbHMvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9ob21lL2RvZWhsbWFuLy5iYXNoaW5hdGUvaW5zdGFsbC9ub2RlLzAuMTAuMjQvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3N1cHBvcnQvaXNCdWZmZXJCcm93c2VyLmpzIiwiL2hvbWUvZG9laGxtYW4vLmJhc2hpbmF0ZS9pbnN0YWxsL25vZGUvMC4xMC4yNC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvdXRpbC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy5pby9jb2RlL3NpbXBsZS1tYW5pcHVsYXRpb24tNWZwcy5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy5pby9ub2RlX21vZHVsZXMvY29nL2V4dGVuZC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy5pby9ub2RlX21vZHVsZXMvY29nL2xvZ2dlci5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy5pby9ub2RlX21vZHVsZXMvcnRjLWNvcmUvZGV0ZWN0LmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjLmlvL25vZGVfbW9kdWxlcy9ydGMtZmlsdGVyLWdyYXlzY2FsZS9pbmRleC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy5pby9ub2RlX21vZHVsZXMvcnRjLW1lZGlhL2luZGV4LmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjLmlvL25vZGVfbW9kdWxlcy9ydGMtdmlkZW9wcm9jL2luZGV4LmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjLmlvL25vZGVfbW9kdWxlcy9ydGMtdmlkZW9wcm9jL25vZGVfbW9kdWxlcy9mZG9tL3JhZi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMWtCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3aEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7Ly8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICghaXNTdHJpbmcoZikpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goaW5zcGVjdChhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHMuam9pbignICcpO1xuICB9XG5cbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICB2YXIgc3RyID0gU3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggPT09ICclJScpIHJldHVybiAnJSc7XG4gICAgaWYgKGkgPj0gbGVuKSByZXR1cm4geDtcbiAgICBzd2l0Y2ggKHgpIHtcbiAgICAgIGNhc2UgJyVzJzogcmV0dXJuIFN0cmluZyhhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWQnOiByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclaic6XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IgKHZhciB4ID0gYXJnc1tpXTsgaSA8IGxlbjsgeCA9IGFyZ3NbKytpXSkge1xuICAgIGlmIChpc051bGwoeCkgfHwgIWlzT2JqZWN0KHgpKSB7XG4gICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5cbi8vIE1hcmsgdGhhdCBhIG1ldGhvZCBzaG91bGQgbm90IGJlIHVzZWQuXG4vLyBSZXR1cm5zIGEgbW9kaWZpZWQgZnVuY3Rpb24gd2hpY2ggd2FybnMgb25jZSBieSBkZWZhdWx0LlxuLy8gSWYgLS1uby1kZXByZWNhdGlvbiBpcyBzZXQsIHRoZW4gaXQgaXMgYSBuby1vcC5cbmV4cG9ydHMuZGVwcmVjYXRlID0gZnVuY3Rpb24oZm4sIG1zZykge1xuICAvLyBBbGxvdyBmb3IgZGVwcmVjYXRpbmcgdGhpbmdzIGluIHRoZSBwcm9jZXNzIG9mIHN0YXJ0aW5nIHVwLlxuICBpZiAoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZGVwcmVjYXRlKGZuLCBtc2cpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLm5vRGVwcmVjYXRpb24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm47XG4gIH1cblxuICB2YXIgd2FybmVkID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGRlcHJlY2F0ZWQoKSB7XG4gICAgaWYgKCF3YXJuZWQpIHtcbiAgICAgIGlmIChwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgICB9IGVsc2UgaWYgKHByb2Nlc3MudHJhY2VEZXByZWNhdGlvbikge1xuICAgICAgICBjb25zb2xlLnRyYWNlKG1zZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICB9XG4gICAgICB3YXJuZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIHJldHVybiBkZXByZWNhdGVkO1xufTtcblxuXG52YXIgZGVidWdzID0ge307XG52YXIgZGVidWdFbnZpcm9uO1xuZXhwb3J0cy5kZWJ1Z2xvZyA9IGZ1bmN0aW9uKHNldCkge1xuICBpZiAoaXNVbmRlZmluZWQoZGVidWdFbnZpcm9uKSlcbiAgICBkZWJ1Z0Vudmlyb24gPSBwcm9jZXNzLmVudi5OT0RFX0RFQlVHIHx8ICcnO1xuICBzZXQgPSBzZXQudG9VcHBlckNhc2UoKTtcbiAgaWYgKCFkZWJ1Z3Nbc2V0XSkge1xuICAgIGlmIChuZXcgUmVnRXhwKCdcXFxcYicgKyBzZXQgKyAnXFxcXGInLCAnaScpLnRlc3QoZGVidWdFbnZpcm9uKSkge1xuICAgICAgdmFyIHBpZCA9IHByb2Nlc3MucGlkO1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1zZyA9IGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyVzICVkOiAlcycsIHNldCwgcGlkLCBtc2cpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHt9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVidWdzW3NldF07XG59O1xuXG5cbi8qKlxuICogRWNob3MgdGhlIHZhbHVlIG9mIGEgdmFsdWUuIFRyeXMgdG8gcHJpbnQgdGhlIHZhbHVlIG91dFxuICogaW4gdGhlIGJlc3Qgd2F5IHBvc3NpYmxlIGdpdmVuIHRoZSBkaWZmZXJlbnQgdHlwZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHByaW50IG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHRoYXQgYWx0ZXJzIHRoZSBvdXRwdXQuXG4gKi9cbi8qIGxlZ2FjeTogb2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKi9cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBvcHRzKSB7XG4gIC8vIGRlZmF1bHQgb3B0aW9uc1xuICB2YXIgY3R4ID0ge1xuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IHN0eWxpemVOb0NvbG9yXG4gIH07XG4gIC8vIGxlZ2FjeS4uLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSBjdHguZGVwdGggPSBhcmd1bWVudHNbMl07XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDQpIGN0eC5jb2xvcnMgPSBhcmd1bWVudHNbM107XG4gIGlmIChpc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAvLyBsZWdhY3kuLi5cbiAgICBjdHguc2hvd0hpZGRlbiA9IG9wdHM7XG4gIH0gZWxzZSBpZiAob3B0cykge1xuICAgIC8vIGdvdCBhbiBcIm9wdGlvbnNcIiBvYmplY3RcbiAgICBleHBvcnRzLl9leHRlbmQoY3R4LCBvcHRzKTtcbiAgfVxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmIChpc1VuZGVmaW5lZChjdHguc2hvd0hpZGRlbikpIGN0eC5zaG93SGlkZGVuID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguZGVwdGgpKSBjdHguZGVwdGggPSAyO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpIGN0eC5jb2xvcnMgPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jdXN0b21JbnNwZWN0KSkgY3R4LmN1c3RvbUluc3BlY3QgPSB0cnVlO1xuICBpZiAoY3R4LmNvbG9ycykgY3R4LnN0eWxpemUgPSBzdHlsaXplV2l0aENvbG9yO1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosIGN0eC5kZXB0aCk7XG59XG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXG5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuaW5zcGVjdC5jb2xvcnMgPSB7XG4gICdib2xkJyA6IFsxLCAyMl0sXG4gICdpdGFsaWMnIDogWzMsIDIzXSxcbiAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAnd2hpdGUnIDogWzM3LCAzOV0sXG4gICdncmV5JyA6IFs5MCwgMzldLFxuICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICdibHVlJyA6IFszNCwgMzldLFxuICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAnbWFnZW50YScgOiBbMzUsIDM5XSxcbiAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgJ3llbGxvdycgOiBbMzMsIDM5XVxufTtcblxuLy8gRG9uJ3QgdXNlICdibHVlJyBub3QgdmlzaWJsZSBvbiBjbWQuZXhlXG5pbnNwZWN0LnN0eWxlcyA9IHtcbiAgJ3NwZWNpYWwnOiAnY3lhbicsXG4gICdudW1iZXInOiAneWVsbG93JyxcbiAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgJ251bGwnOiAnYm9sZCcsXG4gICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgLy8gXCJuYW1lXCI6IGludGVudGlvbmFsbHkgbm90IHN0eWxpbmdcbiAgJ3JlZ2V4cCc6ICdyZWQnXG59O1xuXG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRoQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgdmFyIHN0eWxlID0gaW5zcGVjdC5zdHlsZXNbc3R5bGVUeXBlXTtcblxuICBpZiAoc3R5bGUpIHtcbiAgICByZXR1cm4gJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMV0gKyAnbSc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblxuZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpIHtcbiAgdmFyIGhhc2ggPSB7fTtcblxuICBhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMsIGN0eCk7XG4gICAgaWYgKCFpc1N0cmluZyhyZXQpKSB7XG4gICAgICByZXQgPSBmb3JtYXRWYWx1ZShjdHgsIHJldCwgcmVjdXJzZVRpbWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gIHZhciBwcmltaXRpdmUgPSBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSk7XG4gIGlmIChwcmltaXRpdmUpIHtcbiAgICByZXR1cm4gcHJpbWl0aXZlO1xuICB9XG5cbiAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKTtcbiAgfVxuXG4gIC8vIElFIGRvZXNuJ3QgbWFrZSBlcnJvciBmaWVsZHMgbm9uLWVudW1lcmFibGVcbiAgLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2llL2R3dzUyc2J0KHY9dnMuOTQpLmFzcHhcbiAgaWYgKGlzRXJyb3IodmFsdWUpXG4gICAgICAmJiAoa2V5cy5pbmRleE9mKCdtZXNzYWdlJykgPj0gMCB8fCBrZXlzLmluZGV4T2YoJ2Rlc2NyaXB0aW9uJykgPj0gMCkpIHtcbiAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG4gIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpIHx8IHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbiAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLCBrZXkpKSB7XG4gICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgfVxuICBpZiAoIXN0cikge1xuICAgIGlmIChjdHguc2Vlbi5pbmRleE9mKGRlc2MudmFsdWUpIDwgMCkge1xuICAgICAgaWYgKGlzTnVsbChyZWN1cnNlVGltZXMpKSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgfVxuICAgICAgaWYgKHN0ci5pbmRleE9mKCdcXG4nKSA+IC0xKSB7XG4gICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zdWJzdHIoMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyID0gJ1xcbicgKyBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbQ2lyY3VsYXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgaWYgKGFycmF5ICYmIGtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIG5hbWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIGtleSk7XG4gICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJlxuICAgICAgKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5leHBvcnRzLmlzQnVmZmVyID0gcmVxdWlyZSgnLi9zdXBwb3J0L2lzQnVmZmVyJyk7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuXG5mdW5jdGlvbiBwYWQobikge1xuICByZXR1cm4gbiA8IDEwID8gJzAnICsgbi50b1N0cmluZygxMCkgOiBuLnRvU3RyaW5nKDEwKTtcbn1cblxuXG52YXIgbW9udGhzID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG4vLyAyNiBGZWIgMTY6MTk6MzRcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICB2YXIgdGltZSA9IFtwYWQoZC5nZXRIb3VycygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0TWludXRlcygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0U2Vjb25kcygpKV0uam9pbignOicpO1xuICByZXR1cm4gW2QuZ2V0RGF0ZSgpLCBtb250aHNbZC5nZXRNb250aCgpXSwgdGltZV0uam9pbignICcpO1xufVxuXG5cbi8vIGxvZyBpcyBqdXN0IGEgdGhpbiB3cmFwcGVyIHRvIGNvbnNvbGUubG9nIHRoYXQgcHJlcGVuZHMgYSB0aW1lc3RhbXBcbmV4cG9ydHMubG9nID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCclcyAtICVzJywgdGltZXN0YW1wKCksIGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cykpO1xufTtcblxuXG4vKipcbiAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAqXG4gKiBUaGUgRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzIGZyb20gbGFuZy5qcyByZXdyaXR0ZW4gYXMgYSBzdGFuZGFsb25lXG4gKiBmdW5jdGlvbiAobm90IG9uIEZ1bmN0aW9uLnByb3RvdHlwZSkuIE5PVEU6IElmIHRoaXMgZmlsZSBpcyB0byBiZSBsb2FkZWRcbiAqIGR1cmluZyBib290c3RyYXBwaW5nIHRoaXMgZnVuY3Rpb24gbmVlZHMgdG8gYmUgcmV3cml0dGVuIHVzaW5nIHNvbWUgbmF0aXZlXG4gKiBmdW5jdGlvbnMgYXMgcHJvdG90eXBlIHNldHVwIHVzaW5nIG5vcm1hbCBKYXZhU2NyaXB0IGRvZXMgbm90IHdvcmsgYXNcbiAqIGV4cGVjdGVkIGR1cmluZyBib290c3RyYXBwaW5nIChzZWUgbWlycm9yLmpzIGluIHIxMTQ5MDMpLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gd2hpY2ggbmVlZHMgdG8gaW5oZXJpdCB0aGVcbiAqICAgICBwcm90b3R5cGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gdG8gaW5oZXJpdCBwcm90b3R5cGUgZnJvbS5cbiAqL1xuZXhwb3J0cy5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmV4cG9ydHMuX2V4dGVuZCA9IGZ1bmN0aW9uKG9yaWdpbiwgYWRkKSB7XG4gIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgaWYgKCFhZGQgfHwgIWlzT2JqZWN0KGFkZCkpIHJldHVybiBvcmlnaW47XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59O1xuXG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIvaG9tZS9kb2VobG1hbi8uYmFzaGluYXRlL2luc3RhbGwvbm9kZS8wLjEwLjI0L2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5zZXJ0LW1vZHVsZS1nbG9iYWxzL25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanNcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsInZhciBtZWRpYSA9IHJlcXVpcmUoJ3J0Yy1tZWRpYScpO1xudmFyIGNhbnZhcyA9IHJlcXVpcmUoJ3J0Yy12aWRlb3Byb2MnKTtcbnZhciB2aWQ7XG5cbi8vIGNhcHR1cmUgbWVkaWFcbm1lZGlhKCkucmVuZGVyKHZpZCA9IGNhbnZhcyhkb2N1bWVudC5ib2R5LCB7IGZwczogNSB9KSk7XG5cbi8vIGFkZCBhIGRyYXcgaGFuZGxlciB0byB0aGUgcGlwZWxpbmVcbnZpZC5waXBlbGluZS5hZGQocmVxdWlyZSgncnRjLWZpbHRlci1ncmF5c2NhbGUnKSk7IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4jIyBjb2cvZXh0ZW5kXG5cbmBgYGpzXG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnY29nL2V4dGVuZCcpO1xuYGBgXG5cbiMjIyBleHRlbmQodGFyZ2V0LCAqKVxuXG5TaGFsbG93IGNvcHkgb2JqZWN0IHByb3BlcnRpZXMgZnJvbSB0aGUgc3VwcGxpZWQgc291cmNlIG9iamVjdHMgKCopIGludG9cbnRoZSB0YXJnZXQgb2JqZWN0LCByZXR1cm5pbmcgdGhlIHRhcmdldCBvYmplY3Qgb25jZSBjb21wbGV0ZWQ6XG5cbmBgYGpzXG5leHRlbmQoeyBhOiAxLCBiOiAyIH0sIHsgYzogMyB9LCB7IGQ6IDQgfSwgeyBiOiA1IH0pKTtcbmBgYFxuXG5TZWUgYW4gZXhhbXBsZSBvbiBbcmVxdWlyZWJpbl0oaHR0cDovL3JlcXVpcmViaW4uY29tLz9naXN0PTYwNzk0NzUpLlxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkuZm9yRWFjaChmdW5jdGlvbihzb3VyY2UpIHtcbiAgICBpZiAoISBzb3VyY2UpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgdGFyZ2V0W3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHRhcmdldDtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMjIGNvZy9sb2dnZXJcblxuICBgYGBqc1xuICB2YXIgbG9nZ2VyID0gcmVxdWlyZSgnY29nL2xvZ2dlcicpO1xuICBgYGBcblxuICBTaW1wbGUgYnJvd3NlciBsb2dnaW5nIG9mZmVyaW5nIHNpbWlsYXIgZnVuY3Rpb25hbGl0eSB0byB0aGVcbiAgW2RlYnVnXShodHRwczovL2dpdGh1Yi5jb20vdmlzaW9ubWVkaWEvZGVidWcpIG1vZHVsZS5cblxuICAjIyMgVXNhZ2VcblxuICBDcmVhdGUgeW91ciBzZWxmIGEgbmV3IGxvZ2dpbmcgaW5zdGFuY2UgYW5kIGdpdmUgaXQgYSBuYW1lOlxuXG4gIGBgYGpzXG4gIHZhciBkZWJ1ZyA9IGxvZ2dlcigncGhpbCcpO1xuICBgYGBcblxuICBOb3cgZG8gc29tZSBkZWJ1Z2dpbmc6XG5cbiAgYGBganNcbiAgZGVidWcoJ2hlbGxvJyk7XG4gIGBgYFxuXG4gIEF0IHRoaXMgc3RhZ2UsIG5vIGxvZyBvdXRwdXQgd2lsbCBiZSBnZW5lcmF0ZWQgYmVjYXVzZSB5b3VyIGxvZ2dlciBpc1xuICBjdXJyZW50bHkgZGlzYWJsZWQuICBFbmFibGUgaXQ6XG5cbiAgYGBganNcbiAgbG9nZ2VyLmVuYWJsZSgncGhpbCcpO1xuICBgYGBcblxuICBOb3cgZG8gc29tZSBtb3JlIGxvZ2dlcjpcblxuICBgYGBqc1xuICBkZWJ1ZygnT2ggdGhpcyBpcyBzbyBtdWNoIG5pY2VyIDopJyk7XG4gIC8vIC0tPiBwaGlsOiBPaCB0aGlzIGlzIHNvbWUgbXVjaCBuaWNlciA6KVxuICBgYGBcblxuICAjIyMgUmVmZXJlbmNlXG4qKi9cblxudmFyIGFjdGl2ZSA9IFtdO1xudmFyIHVubGVhc2hMaXN0ZW5lcnMgPSBbXTtcbnZhciB0YXJnZXRzID0gWyBjb25zb2xlIF07XG5cbi8qKlxuICAjIyMjIGxvZ2dlcihuYW1lKVxuXG4gIENyZWF0ZSBhIG5ldyBsb2dnaW5nIGluc3RhbmNlLlxuKiovXG52YXIgbG9nZ2VyID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihuYW1lKSB7XG4gIC8vIGluaXRpYWwgZW5hYmxlZCBjaGVja1xuICB2YXIgZW5hYmxlZCA9IGNoZWNrQWN0aXZlKCk7XG5cbiAgZnVuY3Rpb24gY2hlY2tBY3RpdmUoKSB7XG4gICAgcmV0dXJuIGVuYWJsZWQgPSBhY3RpdmUuaW5kZXhPZignKicpID49IDAgfHwgYWN0aXZlLmluZGV4T2YobmFtZSkgPj0gMDtcbiAgfVxuXG4gIC8vIHJlZ2lzdGVyIHRoZSBjaGVjayBhY3RpdmUgd2l0aCB0aGUgbGlzdGVuZXJzIGFycmF5XG4gIHVubGVhc2hMaXN0ZW5lcnNbdW5sZWFzaExpc3RlbmVycy5sZW5ndGhdID0gY2hlY2tBY3RpdmU7XG5cbiAgLy8gcmV0dXJuIHRoZSBhY3R1YWwgbG9nZ2luZyBmdW5jdGlvblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGEgc3RyaW5nIG1lc3NhZ2VcbiAgICBpZiAodHlwZW9mIGFyZ3NbMF0gPT0gJ3N0cmluZycgfHwgKGFyZ3NbMF0gaW5zdGFuY2VvZiBTdHJpbmcpKSB7XG4gICAgICBhcmdzWzBdID0gbmFtZSArICc6ICcgKyBhcmdzWzBdO1xuICAgIH1cblxuICAgIC8vIGlmIG5vdCBlbmFibGVkLCBiYWlsXG4gICAgaWYgKCEgZW5hYmxlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGxvZ1xuICAgIHRhcmdldHMuZm9yRWFjaChmdW5jdGlvbih0YXJnZXQpIHtcbiAgICAgIHRhcmdldC5sb2cuYXBwbHkodGFyZ2V0LCBhcmdzKTtcbiAgICB9KTtcbiAgfTtcbn07XG5cbi8qKlxuICAjIyMjIGxvZ2dlci5yZXNldCgpXG5cbiAgUmVzZXQgbG9nZ2luZyAocmVtb3ZlIHRoZSBkZWZhdWx0IGNvbnNvbGUgbG9nZ2VyLCBmbGFnIGFsbCBsb2dnZXJzIGFzXG4gIGluYWN0aXZlLCBldGMsIGV0Yy5cbioqL1xubG9nZ2VyLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gIC8vIHJlc2V0IHRhcmdldHMgYW5kIGFjdGl2ZSBzdGF0ZXNcbiAgdGFyZ2V0cyA9IFtdO1xuICBhY3RpdmUgPSBbXTtcblxuICByZXR1cm4gbG9nZ2VyLmVuYWJsZSgpO1xufTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyLnRvKHRhcmdldClcblxuICBBZGQgYSBsb2dnaW5nIHRhcmdldC4gIFRoZSBsb2dnZXIgbXVzdCBoYXZlIGEgYGxvZ2AgbWV0aG9kIGF0dGFjaGVkLlxuXG4qKi9cbmxvZ2dlci50byA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICB0YXJnZXRzID0gdGFyZ2V0cy5jb25jYXQodGFyZ2V0IHx8IFtdKTtcblxuICByZXR1cm4gbG9nZ2VyO1xufTtcblxuLyoqXG4gICMjIyMgbG9nZ2VyLmVuYWJsZShuYW1lcyopXG5cbiAgRW5hYmxlIGxvZ2dpbmcgdmlhIHRoZSBuYW1lZCBsb2dnaW5nIGluc3RhbmNlcy4gIFRvIGVuYWJsZSBsb2dnaW5nIHZpYSBhbGxcbiAgaW5zdGFuY2VzLCB5b3UgY2FuIHBhc3MgYSB3aWxkY2FyZDpcblxuICBgYGBqc1xuICBsb2dnZXIuZW5hYmxlKCcqJyk7XG4gIGBgYFxuXG4gIF9fVE9ETzpfXyB3aWxkY2FyZCBlbmFibGVyc1xuKiovXG5sb2dnZXIuZW5hYmxlID0gZnVuY3Rpb24oKSB7XG4gIC8vIHVwZGF0ZSB0aGUgYWN0aXZlXG4gIGFjdGl2ZSA9IGFjdGl2ZS5jb25jYXQoW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcblxuICAvLyB0cmlnZ2VyIHRoZSB1bmxlYXNoIGxpc3RlbmVyc1xuICB1bmxlYXNoTGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24obGlzdGVuZXIpIHtcbiAgICBsaXN0ZW5lcigpO1xuICB9KTtcblxuICByZXR1cm4gbG9nZ2VyO1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIHdpbmRvdzogZmFsc2UgKi9cbi8qIGdsb2JhbCBuYXZpZ2F0b3I6IGZhbHNlICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGJyb3dzZXJzID0ge1xuICBjaHJvbWU6IC9DaHJvbSg/OmV8aXVtKVxcLyhbMC05XSspXFwuLyxcbiAgZmlyZWZveDogL0ZpcmVmb3hcXC8oWzAtOV0rKVxcLi8sXG4gIG9wZXJhOiAvT3BlcmFcXC8oWzAtOV0rKVxcLi9cbn07XG5cbi8qKlxuIyMgcnRjLWNvcmUvZGV0ZWN0XG5cbkEgYnJvd3NlciBkZXRlY3Rpb24gaGVscGVyIGZvciBhY2Nlc3NpbmcgcHJlZml4LWZyZWUgdmVyc2lvbnMgb2YgdGhlIHZhcmlvdXNcbldlYlJUQyB0eXBlcy5cblxuIyMjIEV4YW1wbGUgVXNhZ2VcblxuSWYgeW91IHdhbnRlZCB0byBnZXQgdGhlIG5hdGl2ZSBgUlRDUGVlckNvbm5lY3Rpb25gIHByb3RvdHlwZSBpbiBhbnkgYnJvd3NlclxueW91IGNvdWxkIGRvIHRoZSBmb2xsb3dpbmc6XG5cbmBgYGpzXG52YXIgZGV0ZWN0ID0gcmVxdWlyZSgncnRjLWNvcmUvZGV0ZWN0Jyk7IC8vIGFsc28gYXZhaWxhYmxlIGluIHJ0Yy9kZXRlY3RcbnZhciBSVENQZWVyQ29ubmVjdGlvbiA9IGRldGVjdCgnUlRDUGVlckNvbm5lY3Rpb24nKTtcbmBgYFxuXG5UaGlzIHdvdWxkIHByb3ZpZGUgd2hhdGV2ZXIgdGhlIGJyb3dzZXIgcHJlZml4ZWQgdmVyc2lvbiBvZiB0aGVcblJUQ1BlZXJDb25uZWN0aW9uIGlzIGF2YWlsYWJsZSAoYHdlYmtpdFJUQ1BlZXJDb25uZWN0aW9uYCxcbmBtb3pSVENQZWVyQ29ubmVjdGlvbmAsIGV0YykuXG4qKi9cbnZhciBkZXRlY3QgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCwgcHJlZml4ZXMpIHtcbiAgdmFyIHByZWZpeElkeDtcbiAgdmFyIHByZWZpeDtcbiAgdmFyIHRlc3ROYW1lO1xuICB2YXIgaG9zdE9iamVjdCA9IHRoaXMgfHwgKHR5cGVvZiB3aW5kb3cgIT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB1bmRlZmluZWQpO1xuXG4gIC8vIGlmIHdlIGhhdmUgbm8gaG9zdCBvYmplY3QsIHRoZW4gYWJvcnRcbiAgaWYgKCEgaG9zdE9iamVjdCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGluaXRpYWxpc2UgdG8gZGVmYXVsdCBwcmVmaXhlc1xuICAvLyAocmV2ZXJzZSBvcmRlciBhcyB3ZSB1c2UgYSBkZWNyZW1lbnRpbmcgZm9yIGxvb3ApXG4gIHByZWZpeGVzID0gKHByZWZpeGVzIHx8IFsnbXMnLCAnbycsICdtb3onLCAnd2Via2l0J10pLmNvbmNhdCgnJyk7XG5cbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBwcmVmaXhlcyBhbmQgcmV0dXJuIHRoZSBjbGFzcyBpZiBmb3VuZCBpbiBnbG9iYWxcbiAgZm9yIChwcmVmaXhJZHggPSBwcmVmaXhlcy5sZW5ndGg7IHByZWZpeElkeC0tOyApIHtcbiAgICBwcmVmaXggPSBwcmVmaXhlc1twcmVmaXhJZHhdO1xuXG4gICAgLy8gY29uc3RydWN0IHRoZSB0ZXN0IGNsYXNzIG5hbWVcbiAgICAvLyBpZiB3ZSBoYXZlIGEgcHJlZml4IGVuc3VyZSB0aGUgdGFyZ2V0IGhhcyBhbiB1cHBlcmNhc2UgZmlyc3QgY2hhcmFjdGVyXG4gICAgLy8gc3VjaCB0aGF0IGEgdGVzdCBmb3IgZ2V0VXNlck1lZGlhIHdvdWxkIHJlc3VsdCBpbiBhXG4gICAgLy8gc2VhcmNoIGZvciB3ZWJraXRHZXRVc2VyTWVkaWFcbiAgICB0ZXN0TmFtZSA9IHByZWZpeCArIChwcmVmaXggP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHRhcmdldC5zbGljZSgxKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0KTtcblxuICAgIGlmICh0eXBlb2YgaG9zdE9iamVjdFt0ZXN0TmFtZV0gIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIC8vIHVwZGF0ZSB0aGUgbGFzdCB1c2VkIHByZWZpeFxuICAgICAgZGV0ZWN0LmJyb3dzZXIgPSBkZXRlY3QuYnJvd3NlciB8fCBwcmVmaXgudG9Mb3dlckNhc2UoKTtcblxuICAgICAgLy8gcmV0dXJuIHRoZSBob3N0IG9iamVjdCBtZW1iZXJcbiAgICAgIHJldHVybiBob3N0T2JqZWN0W3RhcmdldF0gPSBob3N0T2JqZWN0W3Rlc3ROYW1lXTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIGRldGVjdCBtb3ppbGxhICh5ZXMsIHRoaXMgZmVlbHMgZGlydHkpXG5kZXRlY3QubW96ID0gdHlwZW9mIG5hdmlnYXRvciAhPSAndW5kZWZpbmVkJyAmJiAhIW5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWE7XG5cbi8vIHRpbWUgdG8gZG8gc29tZSB1c2VyYWdlbnQgc25pZmZpbmcgLSBpdCBmZWVscyBkaXJ0eSBiZWNhdXNlIGl0IGlzIDovXG5pZiAodHlwZW9mIG5hdmlnYXRvciAhPSAndW5kZWZpbmVkJykge1xuICBPYmplY3Qua2V5cyhicm93c2VycykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICB2YXIgbWF0Y2ggPSBicm93c2Vyc1trZXldLmV4ZWMobmF2aWdhdG9yLnVzZXJBZ2VudCk7XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBkZXRlY3QuYnJvd3NlciA9IGtleTtcbiAgICAgIGRldGVjdC5icm93c2VyVmVyc2lvbiA9IGRldGVjdC52ZXJzaW9uID0gcGFyc2VJbnQobWF0Y2hbMV0sIDEwKTtcbiAgICB9XG4gIH0pO1xufVxuZWxzZSB7XG4gIGRldGVjdC5icm93c2VyID0gJ25vZGUnO1xuICBkZXRlY3QuYnJvd3NlclZlcnNpb24gPSBkZXRlY3QudmVyc2lvbiA9ICc/JzsgLy8gVE9ETzogZ2V0IG5vZGUgdmVyc2lvblxufSIsIi8qKlxuICAjIHJ0Yy1maWx0ZXItZ3JheXNjYWxlXG5cbiAgQSBzaW1wbGUgZ3JheXNjYWxlIGZpbHRlciBmb3IgdXNlIHdpdGggdGhlXG4gIFtydGMtdmlkZW9wcm9jXShodHRwczovL2dpdGh1Yi5jb20vcnRjLWlvL3J0Yy12aWRlb3Byb2MpIG1vZHVsZS5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgVGhlIGZvbGxvd2luZyBleGFtcGxlIGNhbiBiZSBydW4gdXNpbmdcbiAgW2JlZWZ5XShodHRwczovL2dpdGh1Yi5jb20vY2hyaXNkaWNraW5zb24vYmVlZnkpIChgYmVlZnkgZXhhbXBsZS5qc2ApOlxuXG4gIDw8PCBleGFtcGxlLmpzXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpbWFnZURhdGEpIHtcbiAgdmFyIGNoYW5uZWxzID0gaW1hZ2VEYXRhLmRhdGE7XG4gIHZhciByZ2IgPSBbXTtcbiAgdmFyIHJnYkF2ZztcbiAgdmFyIGFscGhhO1xuICB2YXIgaWk7XG5cbiAgLy8gY2hlY2sgdGhhdCB3ZSBoYXZlIGNoYW5uZWxzIGlzIGRpdmlzaWJsZSBieSBmb3VyIChqdXN0IGFzIGEgc2FmZXR5KVxuICBpZiAoY2hhbm5lbHMubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgZGF0YVxuICAvLyBOT1RFOiBkZWNyZW1lbnRpbmcgbG9vcHMgYXJlIGZhc3QgYnV0IHlvdSBuZWVkIHRvIGtub3cgdGhhdCB5b3Ugd2lsbFxuICAvLyBoaXQgMCB1c2luZyB0aGlzIGxvZ2ljIG90aGVyd2lzZSBpdCB3aWxsIHJ1biBmb3JldmVyIChvbmx5IDAgaXMgZmFsc3kpXG4gIGZvciAoaWkgPSBjaGFubmVscy5sZW5ndGg7IGlpIC09IDQ7ICkge1xuICAgIC8vIGdldCB0aGUgcmdiIHR1cGxlXG4gICAgcmdiID0gW2NoYW5uZWxzW2lpXSwgY2hhbm5lbHNbaWkgKyAxXSwgY2hhbm5lbHNbaWkgKyAyXV07XG5cbiAgICAvLyBnZXQgdGhlIGFscGhhIHZhbHVlXG4gICAgYWxwaGEgPSBjaGFubmVsc1tpaSArIDNdO1xuXG4gICAgLy8gY2FsY3VsYXRlIHRoZSByZ2IgYXZlcmFnZVxuICAgIHJnYkF2ZyA9IChyZ2JbMF0gKyByZ2JbMV0gKyByZ2JbMl0gKSAvIDM7XG5cbiAgICAvLyB1cGRhdGUgdGhlIHZhbHVlcyB0byB0aGUgcmdiIGF2ZXJhZ2VcbiAgICBjaGFubmVsc1tpaV0gPSBjaGFubmVsc1tpaSArIDFdID0gY2hhbm5lbHNbaWkgKyAyXSA9IHJnYkF2ZztcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIG5hdmlnYXRvcjogZmFsc2UgKi9cbi8qIGdsb2JhbCB3aW5kb3c6IGZhbHNlICovXG4vKiBnbG9iYWwgZG9jdW1lbnQ6IGZhbHNlICovXG4vKiBnbG9iYWwgTWVkaWFTdHJlYW06IGZhbHNlICovXG4vKiBnbG9iYWwgSFRNTFZpZGVvRWxlbWVudDogZmFsc2UgKi9cbi8qIGdsb2JhbCBIVE1MQXVkaW9FbGVtZW50OiBmYWxzZSAqL1xuXG4vKipcbiAgIyBydGMtbWVkaWFcblxuICBTaW1wbGUgW2dldFVzZXJNZWRpYV0oaHR0cDovL2Rldi53My5vcmcvMjAxMS93ZWJydGMvZWRpdG9yL2dldHVzZXJtZWRpYS5odG1sKVxuICBjcm9zcy1icm93c2VyIHdyYXBwZXJzLiAgUGFydCBvZiB0aGUgW3J0Yy5pb10oaHR0cDovL3J0Yy5pby8pIHN1aXRlLCB3aGljaCBpc1xuICBzcG9uc29yZWQgYnkgW05JQ1RBXShodHRwOi8vb3Blbm5pY3RhLmNvbSkgYW5kIHJlbGVhc2VkIHVuZGVyIGFuXG4gIFtBcGFjaGUgMi4wIGxpY2Vuc2VdKC9MSUNFTlNFKS5cblxuICAjIyBFeGFtcGxlIFVzYWdlXG5cbiAgQ2FwdHVyaW5nIG1lZGlhIG9uIHlvdXIgbWFjaGluZSBpcyBhcyBzaW1wbGUgYXM6XG5cbiAgYGBganNcbiAgcmVxdWlyZSgncnRjLW1lZGlhJykoKTtcbiAgYGBgXG5cbiAgV2hpbGUgdGhpcyB3aWxsIGluIGZhY3Qgc3RhcnQgdGhlIHVzZXIgbWVkaWEgY2FwdHVyZSBwcm9jZXNzLCBpdCB3b24ndFxuICBkbyBhbnl0aGluZyB3aXRoIGl0LiAgTGV0cyB0YWtlIGEgbG9vayBhdCBhIG1vcmUgcmVhbGlzdGljIGV4YW1wbGU6XG5cbiAgPDw8IGV4YW1wbGVzL3JlbmRlci10by1ib2R5LmpzXG5cbiAgW3J1biBvbiByZXF1aXJlYmluXShodHRwOi8vcmVxdWlyZWJpbi5jb20vP2dpc3Q9NjA4NTQ1MClcblxuICBJbiB0aGUgY29kZSBhYm92ZSwgd2UgYXJlIGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlIG9mIG91ciB1c2VyTWVkaWEgd3JhcHBlclxuICB1c2luZyB0aGUgYG1lZGlhKClgIGNhbGwgYW5kIHRoZW4gdGVsbGluZyBpdCB0byByZW5kZXIgdG8gdGhlXG4gIGBkb2N1bWVudC5ib2R5YCBvbmNlIHZpZGVvIHN0YXJ0cyBzdHJlYW1pbmcuICBXZSBjYW4gZnVydGhlciBleHBhbmQgdGhlXG4gIGNvZGUgb3V0IHRvIHRoZSBmb2xsb3dpbmcgdG8gYWlkIG91ciB1bmRlcnN0YW5kaW5nIG9mIHdoYXQgaXMgZ29pbmcgb246XG5cbiAgPDw8IGV4YW1wbGVzL2NhcHR1cmUtZXhwbGljaXQuanNcblxuICBUaGUgY29kZSBhYm92ZSBpcyB3cml0dGVuIGluIGEgbW9yZSB0cmFkaXRpb25hbCBKUyBzdHlsZSwgYnV0IGZlZWwgZnJlZVxuICB0byB1c2UgdGhlIGZpcnN0IHN0eWxlIGFzIGl0J3MgcXVpdGUgc2FmZSAodGhhbmtzIHRvIHNvbWUgY2hlY2tzIGluIHRoZVxuICBjb2RlKS5cblxuICAjIyMgRXZlbnRzXG5cbiAgT25jZSBhIG1lZGlhIG9iamVjdCBoYXMgYmVlbiBjcmVhdGVkLCBpdCB3aWxsIHByb3ZpZGUgYSBudW1iZXIgb2YgZXZlbnRzXG4gIHRocm91Z2ggdGhlIHN0YW5kYXJkIG5vZGUgRXZlbnRFbWl0dGVyIEFQSS5cblxuICAjIyMjIGBjYXB0dXJlYFxuXG4gIFRoZSBgY2FwdHVyZWAgZXZlbnQgaXMgdHJpZ2dlcmVkIG9uY2UgdGhlIHJlcXVlc3RlZCBtZWRpYSBzdHJlYW0gaGFzXG4gIGJlZW4gY2FwdHVyZWQgYnkgdGhlIGJyb3dzZXIuXG5cbiAgPDw8IGV4YW1wbGVzL2NhcHR1cmUtZXZlbnQuanNcblxuICAjIyMjIGByZW5kZXJgXG5cbiAgVGhlIGByZW5kZXJgIGV2ZW50IGlzIHRyaWdnZXJlZCBvbmNlIHRoZSBzdHJlYW0gaGFzIGJlZW4gcmVuZGVyZWRcbiAgdG8gdGhlIGFueSBzdXBwbGllZCAob3IgY3JlYXRlZCkgdmlkZW8gZWxlbWVudHMuXG5cbiAgV2hpbGUgaXQgbWlnaHQgc2VlbSBhIGxpdHRsZSBjb25mdXNpbmcgdGhhdCB3aGVuIHRoZSBgcmVuZGVyYCBldmVudFxuICBmaXJlcyB0aGF0IGl0IHJldHVybnMgYW4gYXJyYXkgb2YgZWxlbWVudHMgcmF0aGVyIHRoYW4gYSBzaW5nbGUgZWxlbWVudFxuICAod2hpY2ggaXMgd2hhdCBpcyBwcm92aWRlZCB3aGVuIGNhbGxpbmcgdGhlIGByZW5kZXJgIG1ldGhvZCkuXG5cbiAgVGhpcyBvY2N1cnMgYmVjYXVzZSBpdCBpcyBjb21wbGV0ZWx5IHZhbGlkIHRvIHJlbmRlciBhIHNpbmdsZSBjYXB0dXJlZFxuICBtZWRpYSBzdHJlYW0gdG8gbXVsdGlwbGUgbWVkaWEgZWxlbWVudHMgb24gYSBwYWdlLiAgVGhlIGByZW5kZXJgIGV2ZW50XG4gIGlzIHJlcG9ydGluZyBvbmNlIHRoZSByZW5kZXIgb3BlcmF0aW9uIGhhcyBjb21wbGV0ZWQgZm9yIGFsbCB0YXJnZXRzIHRoYXRcbiAgaGF2ZSBiZWVuIHJlZ2lzdGVyZWQgd2l0aCB0aGUgY2FwdHVyZSBzdHJlYW0uXG5cbiAgIyMgUmVmZXJlbmNlXG5cbioqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2NvZy9sb2dnZXInKSgnbWVkaWEnKTtcbnZhciBleHRlbmQgPSByZXF1aXJlKCdjb2cvZXh0ZW5kJyk7XG52YXIgZGV0ZWN0ID0gcmVxdWlyZSgncnRjLWNvcmUvZGV0ZWN0Jyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG5cbi8vIG1vbmtleSBwYXRjaCBnZXRVc2VyTWVkaWEgZnJvbSB0aGUgcHJlZml4ZWQgdmVyc2lvblxubmF2aWdhdG9yLmdldFVzZXJNZWRpYSA9IG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgfHxcbiAgZGV0ZWN0LmNhbGwobmF2aWdhdG9yLCAnZ2V0VXNlck1lZGlhJyk7XG5cbi8vIHBhdGNoIHdpbmRvdyB1cmxcbndpbmRvdy5VUkwgPSB3aW5kb3cuVVJMIHx8IGRldGVjdCgnVVJMJyk7XG5cbi8vIHBhdGNoIG1lZGlhIHN0cmVhbVxud2luZG93Lk1lZGlhU3RyZWFtID0gZGV0ZWN0KCdNZWRpYVN0cmVhbScpO1xuXG4vKipcbiAgIyMjIG1lZGlhXG5cbiAgYGBgXG4gIG1lZGlhKG9wdHM/KVxuICBgYGBcblxuICBDYXB0dXJlIG1lZGlhIHVzaW5nIHRoZSB1bmRlcmx5aW5nXG4gIFtnZXRVc2VyTWVkaWFdKGh0dHA6Ly93d3cudzMub3JnL1RSL21lZGlhY2FwdHVyZS1zdHJlYW1zLykgQVBJLlxuXG4gIFRoZSBmdW5jdGlvbiBhY2NlcHRzIGEgc2luZ2xlIGFyZ3VtZW50IHdoaWNoIGNhbiBiZSBlaXRoZXIgYmU6XG5cbiAgLSBhLiBBbiBvcHRpb25zIG9iamVjdCAoc2VlIGJlbG93KSwgb3I7XG4gIC0gYi4gQW4gZXhpc3RpbmdcbiAgICBbTWVkaWFTdHJlYW1dKGh0dHA6Ly93d3cudzMub3JnL1RSL21lZGlhY2FwdHVyZS1zdHJlYW1zLyNtZWRpYXN0cmVhbSkgdGhhdFxuICAgIHRoZSBtZWRpYSBvYmplY3Qgd2lsbCBiaW5kIHRvIGFuZCBwcm92aWRlIHlvdSBzb21lIERPTSBoZWxwZXJzIGZvci5cblxuICBUaGUgZnVuY3Rpb24gc3VwcG9ydHMgdGhlIGZvbGxvd2luZyBvcHRpb25zOlxuXG4gIC0gYGNhcHR1cmVgIC0gV2hldGhlciBjYXB0dXJlIHNob3VsZCBiZSBpbml0aWF0ZWQgYXV0b21hdGljYWxseS4gRGVmYXVsdHNcbiAgICB0byB0cnVlLCBidXQgdG9nZ2xlZCB0byBmYWxzZSBhdXRvbWF0aWNhbGx5IGlmIGFuIGV4aXN0aW5nIHN0cmVhbSBpc1xuICAgIHByb3ZpZGVkLlxuXG4gIC0gYG11dGVkYCAtIFdoZXRoZXIgdGhlIHZpZGVvIGVsZW1lbnQgY3JlYXRlZCBmb3IgdGhpcyBzdHJlYW0gc2hvdWxkIGJlXG4gICAgbXV0ZWQuICBEZWZhdWx0IGlzIHRydWUgYnV0IGlzIHNldCB0byBmYWxzZSB3aGVuIGFuIGV4aXN0aW5nIHN0cmVhbSBpc1xuICAgIHBhc3NlZC5cblxuICAtIGBjb25zdHJhaW50c2AgLSBUaGUgY29uc3RyYWludCBvcHRpb24gYWxsb3dzIHlvdSB0byBzcGVjaWZ5IHBhcnRpY3VsYXJcbiAgICBtZWRpYSBjYXB0dXJlIGNvbnN0cmFpbnRzIHdoaWNoIGNhbiBhbGxvdyB5b3UgZG8gZG8gc29tZSBwcmV0dHkgY29vbFxuICAgIHRyaWNrcy4gIEJ5IGRlZmF1bHQsIHRoZSBjb250cmFpbnRzIHVzZWQgdG8gcmVxdWVzdCB0aGUgbWVkaWEgYXJlXG4gICAgZmFpcmx5IHN0YW5kYXJkIGRlZmF1bHRzOlxuXG4gICAgYGBganNcbiAgICAgIHtcbiAgICAgICAgdmlkZW86IHtcbiAgICAgICAgICBtYW5kYXRvcnk6IHt9LFxuICAgICAgICAgIG9wdGlvbmFsOiBbXVxuICAgICAgICB9LFxuICAgICAgICBhdWRpbzogdHJ1ZVxuICAgICAgfVxuICAgIGBgYFxuXG4qKi9cbmZ1bmN0aW9uIE1lZGlhKG9wdHMpIHtcbiAgaWYgKCEgKHRoaXMgaW5zdGFuY2VvZiBNZWRpYSkpIHtcbiAgICByZXR1cm4gbmV3IE1lZGlhKG9wdHMpO1xuICB9XG5cbiAgLy8gaW5oZXJpdGVkXG4gIEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xuXG4gIC8vIGlmIHRoZSBvcHRzIGlzIGEgbWVkaWEgc3RyZWFtIGluc3RhbmNlLCB0aGVuIGhhbmRsZSB0aGF0IGFwcHJvcHJpYXRlbHlcbiAgaWYgKG9wdHMgJiYgb3B0cyBpbnN0YW5jZW9mIE1lZGlhU3RyZWFtKSB7XG4gICAgb3B0cyA9IHtcbiAgICAgIHN0cmVhbTogb3B0cyxcbiAgICAgIGNhcHR1cmU6IGZhbHNlLFxuICAgICAgbXV0ZWQ6IGZhbHNlXG4gICAgfTtcbiAgfVxuXG4gIC8vIGlmIHdlJ3ZlIGJlZW4gcGFzc2VkIG9wdHMgYW5kIHRoZXkgbG9vayBsaWtlIGNvbnN0cmFpbnRzLCBtb3ZlIHRoaW5nc1xuICAvLyBhcm91bmQgYSBsaXR0bGVcbiAgaWYgKG9wdHMgJiYgKG9wdHMuYXVkaW8gfHwgb3B0cy52aWRlbykpIHtcbiAgICBvcHRzID0ge1xuICAgICAgY29uc3RyYWludHM6IG9wdHNcbiAgICB9O1xuICB9XG5cbiAgLy8gZW5zdXJlIHdlIGhhdmUgb3B0c1xuICBvcHRzID0gZXh0ZW5kKHt9LCB7XG4gICAgY2FwdHVyZTogdHJ1ZSxcbiAgICBtdXRlZDogdHJ1ZSxcbiAgICBjb25zdHJhaW50czoge1xuICAgICAgdmlkZW86IHtcbiAgICAgICAgbWFuZGF0b3J5OiB7fSxcbiAgICAgICAgb3B0aW9uYWw6IFtdXG4gICAgICB9LFxuICAgICAgYXVkaW86IHRydWVcbiAgICB9XG4gIH0sIG9wdHMpO1xuXG4gIC8vIHNhdmUgdGhlIGNvbnN0cmFpbnRzXG4gIHRoaXMuY29uc3RyYWludHMgPSBvcHRzLmNvbnN0cmFpbnRzO1xuXG4gIC8vIGlmIGEgbmFtZSBoYXMgYmVlbiBzcGVjaWZpZWQgaW4gdGhlIG9wdHMsIHNhdmUgaXQgdG8gdGhlIG1lZGlhXG4gIHRoaXMubmFtZSA9IG9wdHMubmFtZTtcblxuICAvLyBpbml0aWFsaXNlIHRoZSBzdHJlYW0gdG8gbnVsbFxuICB0aGlzLnN0cmVhbSA9IG9wdHMuc3RyZWFtIHx8IG51bGw7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgbXV0ZWQgc3RhdGVcbiAgdGhpcy5tdXRlZCA9IHR5cGVvZiBvcHRzLm11dGVkID09ICd1bmRlZmluZWQnIHx8IG9wdHMubXV0ZWQ7XG5cbiAgLy8gY3JlYXRlIGEgYmluZGluZ3MgYXJyYXkgc28gd2UgaGF2ZSBhIHJvdWdoIGlkZWEgb2Ygd2hlcmVcbiAgLy8gd2UgaGF2ZSBiZWVuIGF0dGFjaGVkIHRvXG4gIC8vIFRPRE86IHJldmlzaXQgd2hldGhlciB0aGlzIGlzIHRoZSBiZXN0IHdheSB0byBtYW5hZ2UgdGhpc1xuICB0aGlzLl9iaW5kaW5ncyA9IFtdO1xuXG4gIC8vIGlmIHdlIGFyZSBhdXRvc3RhcnRpbmcsIGNhcHR1cmUgbWVkaWEgb24gdGhlIG5leHQgdGlja1xuICBpZiAob3B0cy5jYXB0dXJlKSB7XG4gICAgc2V0VGltZW91dCh0aGlzLmNhcHR1cmUuYmluZCh0aGlzKSwgMCk7XG4gIH1cbn1cblxudXRpbC5pbmhlcml0cyhNZWRpYSwgRXZlbnRFbWl0dGVyKTtcbm1vZHVsZS5leHBvcnRzID0gTWVkaWE7XG5cbi8qKlxuICAjIyMgY2FwdHVyZVxuXG4gIGBgYFxuICBjYXB0dXJlKGNvbnN0cmFpbnRzLCBjYWxsYmFjaylcbiAgYGBgXG5cbiAgQ2FwdHVyZSBtZWRpYS4gIElmIGNvbnN0cmFpbnRzIGFyZSBwcm92aWRlZCwgdGhlbiB0aGV5IHdpbGxcbiAgb3ZlcnJpZGUgdGhlIGRlZmF1bHQgY29uc3RyYWludHMgdGhhdCB3ZXJlIHVzZWQgd2hlbiB0aGUgbWVkaWEgb2JqZWN0IHdhc1xuICBjcmVhdGVkLlxuKiovXG5NZWRpYS5wcm90b3R5cGUuY2FwdHVyZSA9IGZ1bmN0aW9uKGNvbnN0cmFpbnRzLCBjYWxsYmFjaykge1xuICB2YXIgbWVkaWEgPSB0aGlzO1xuICB2YXIgaGFuZGxlRW5kID0gdGhpcy5lbWl0LmJpbmQodGhpcywgJ2VuZCcpO1xuXG4gIC8vIGlmIHdlIGFscmVhZHkgaGF2ZSBhIHN0cmVhbSwgdGhlbiBhYm9ydFxuICBpZiAodGhpcy5zdHJlYW0pIHsgcmV0dXJuOyB9XG5cbiAgLy8gaWYgbm8gY29uc3RyYWludHMgaGF2ZSBiZWVuIHByb3ZpZGVkLCBidXQgd2UgaGF2ZVxuICAvLyBhIGNhbGxiYWNrLCBkZWFsIHdpdGggaXRcbiAgaWYgKHR5cGVvZiBjb25zdHJhaW50cyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBjb25zdHJhaW50cztcbiAgICBjb25zdHJhaW50cyA9IHRoaXMuY29uc3RyYWludHM7XG4gIH1cblxuICAvLyBpZiB3ZSBoYXZlIGEgY2FsbGJhY2ssIGJpbmQgdG8gdGhlIHN0YXJ0IGV2ZW50XG4gIGlmICh0eXBlb2YgY2FsbGJhY2sgPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRoaXMub25jZSgnY2FwdHVyZScsIGNhbGxiYWNrLmJpbmQodGhpcykpO1xuICB9XG5cbiAgLy8gZ2V0IHVzZXIgbWVkaWEsIHVzaW5nIGVpdGhlciB0aGUgcHJvdmlkZWQgY29uc3RyYWludHMgb3IgdGhlXG4gIC8vIGRlZmF1bHQgY29uc3RyYWludHNcbiAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYShcbiAgICBjb25zdHJhaW50cyB8fCB0aGlzLmNvbnN0cmFpbnRzLFxuICAgIGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgaWYgKHR5cGVvZiBzdHJlYW0uYWRkRXZlbnRMaXN0ZW5lciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHN0cmVhbS5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsIGhhbmRsZUVuZCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgc3RyZWFtLm9uZW5kZWQgPSBoYW5kbGVFbmQ7XG4gICAgICB9XG5cbiAgICAgIC8vIHNhdmUgdGhlIHN0cmVhbSBhbmQgZW1pdCB0aGUgc3RhcnQgbWV0aG9kXG4gICAgICBtZWRpYS5zdHJlYW0gPSBzdHJlYW07XG4gICAgICBtZWRpYS5lbWl0KCdjYXB0dXJlJywgc3RyZWFtKTtcbiAgICB9LFxuICAgIHRoaXMuX2hhbmRsZUZhaWwuYmluZCh0aGlzKVxuICApO1xufTtcblxuLyoqXG4gICMjIyByZW5kZXJcblxuICBgYGBqc1xuICByZW5kZXIodGFyZ2V0LCBvcHRzPywgY2FsbGJhY2s/KVxuICBgYGBcblxuICBSZW5kZXIgdGhlIGNhcHR1cmVkIG1lZGlhIHRvIHRoZSBzcGVjaWZpZWQgdGFyZ2V0IGVsZW1lbnQuICBXaGlsZSBwcmV2aW91c1xuICB2ZXJzaW9ucyBvZiBydGMtbWVkaWEgYWNjZXB0ZWQgYSBzZWxlY3RvciBzdHJpbmcgb3IgYW4gYXJyYXkgb2YgZWxlbWVudHNcbiAgdGhpcyBoYXMgYmVlbiBkcm9wcGVkIGluIGZhdm91ciBvZiBfX29uZSBzaW5nbGUgdGFyZ2V0IGVsZW1lbnRfXy5cblxuICBJZiB0aGUgdGFyZ2V0IGVsZW1lbnQgaXMgYSB2YWxpZCBNZWRpYUVsZW1lbnQgdGhlbiBpdCB3aWxsIGJlY29tZSB0aGVcbiAgdGFyZ2V0IG9mIHRoZSBjYXB0dXJlZCBtZWRpYSBzdHJlYW0uICBJZiwgaG93ZXZlciwgaXQgaXMgYSBnZW5lcmljIERPTVxuICBlbGVtZW50IGl0IHdpbGwgYSBuZXcgTWVkaWEgZWxlbWVudCB3aWxsIGJlIGNyZWF0ZWQgdGhhdCB1c2luZyB0aGUgdGFyZ2V0XG4gIGFzIGl0J3MgcGFyZW50LlxuXG4gIEEgc2ltcGxlIGV4YW1wbGUgb2YgcmVxdWVzdGluZyBkZWZhdWx0IG1lZGlhIGNhcHR1cmUgYW5kIHJlbmRlcmluZyB0byB0aGVcbiAgZG9jdW1lbnQgYm9keSBpcyBzaG93biBiZWxvdzpcblxuICA8PDwgZXhhbXBsZXMvcmVuZGVyLXRvLWJvZHkuanNcblxuICBZb3UgbWF5IG9wdGlvbmFsbHkgcHJvdmlkZSBhIGNhbGxiYWNrIHRvIHRoaXMgZnVuY3Rpb24sIHdoaWNoIGlzXG4gIHdpbGwgYmUgdHJpZ2dlcmVkIG9uY2UgZWFjaCBvZiB0aGUgbWVkaWEgZWxlbWVudHMgaGFzIHN0YXJ0ZWQgcGxheWluZ1xuICB0aGUgc3RyZWFtOlxuXG4gIDw8PCBleGFtcGxlcy9yZW5kZXItY2FwdHVyZS1jYWxsYmFjay5qc1xuXG4qKi9cbk1lZGlhLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbih0YXJnZXQsIG9wdHMsIGNhbGxiYWNrKSB7XG4gIC8vIGlmIHRoZSB0YXJnZXQgaXMgYW4gYXJyYXksIGV4dHJhY3QgdGhlIGZpcnN0IGVsZW1lbnRcbiAgaWYgKEFycmF5LmlzQXJyYXkodGFyZ2V0KSkge1xuICAgIC8vIGxvZyBhIHdhcm5pbmdcbiAgICBjb25zb2xlLmxvZygnV0FSTklORzogcnRjLW1lZGlhIHJlbmRlciAoYXMgb2YgMS54KSBleHBlY3RzIGEgc2luZ2xlIHRhcmdldCcpO1xuICAgIHRhcmdldCA9IHRhcmdldFswXTtcbiAgfVxuXG4gIGlmICh0eXBlb2Ygb3B0cyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRzO1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIC8vIGVuc3VyZSB3ZSBoYXZlIG9wdHNcbiAgb3B0cyA9IG9wdHMgfHwge307XG5cbiAgLy8gY3JlYXRlIHRoZSB2aWRlbyAvIGF1ZGlvIGVsZW1lbnRzXG4gIHRhcmdldCA9IHRoaXMuX3ByZXBhcmVFbGVtZW50KG9wdHMsIHRhcmdldCk7XG5cbiAgLy8gaWYgbm8gc3RyZWFtIHdhcyBzcGVjaWZpZWQsIHdhaXQgZm9yIHRoZSBzdHJlYW0gdG8gaW5pdGlhbGl6ZVxuICBpZiAoISB0aGlzLnN0cmVhbSkge1xuICAgIHRoaXMub25jZSgnY2FwdHVyZScsIHRoaXMuX2JpbmRTdHJlYW0uYmluZCh0aGlzKSk7XG4gIH1cbiAgLy8gb3RoZXJ3aXNlLCBiaW5kIHRoZSBzdHJlYW0gbm93XG4gIGVsc2Uge1xuICAgIHRoaXMuX2JpbmRTdHJlYW0odGhpcy5zdHJlYW0pO1xuICB9XG5cbiAgLy8gaWYgd2UgaGF2ZSBhIGNhbGxiYWNrIHRoZW4gdHJpZ2dlciBvbiB0aGUgcmVuZGVyIGV2ZW50XG4gIGlmICh0eXBlb2YgY2FsbGJhY2sgPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRoaXMub25jZSgncmVuZGVyJywgY2FsbGJhY2spO1xuICB9XG5cbiAgcmV0dXJuIHRhcmdldDtcbn07XG5cbi8qKlxuICAjIyMgc3RvcCgpXG5cbiAgU3RvcCB0aGUgbWVkaWEgc3RyZWFtXG4qKi9cbk1lZGlhLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24ob3B0cykge1xuICB2YXIgbWVkaWEgPSB0aGlzO1xuXG4gIGlmICghIHRoaXMuc3RyZWFtKSB7IHJldHVybjsgfVxuXG4gIC8vIHJlbW92ZSBiaW5kaW5nc1xuICB0aGlzLl91bmJpbmQob3B0cyk7XG5cbiAgLy8gc3RvcCB0aGUgc3RyZWFtLCBhbmQgdGVsbCB0aGUgd29ybGRcbiAgdGhpcy5zdHJlYW0uc3RvcCgpO1xuXG4gIC8vIG9uIGNhcHR1cmUgcmViaW5kXG4gIHRoaXMub25jZSgnY2FwdHVyZScsIG1lZGlhLl9iaW5kU3RyZWFtLmJpbmQobWVkaWEpKTtcblxuICAvLyByZW1vdmUgdGhlIHJlZmVyZW5jZSB0byB0aGUgc3RyZWFtXG4gIHRoaXMuc3RyZWFtID0gbnVsbDtcbn07XG5cbi8qKlxuICAjIyBEZWJ1Z2dpbmcgVGlwc1xuXG4gIENocm9tZSBhbmQgQ2hyb21pdW0gY2FuIGJvdGggYmUgc3RhcnRlZCB3aXRoIHRoZSBmb2xsb3dpbmcgZmxhZzpcblxuICBgYGBcbiAgLS11c2UtZmFrZS1kZXZpY2UtZm9yLW1lZGlhLXN0cmVhbVxuICBgYGBcblxuICBUaGlzIHVzZXMgYSBmYWtlIHN0cmVhbSBmb3IgdGhlIGdldFVzZXJNZWRpYSgpIGNhbGwgcmF0aGVyIHRoYW4gYXR0ZW1wdGluZ1xuICB0byBjYXB0dXJlIHRoZSBhY3R1YWwgY2FtZXJhLiAgVGhpcyBpcyB1c2VmdWwgd2hlbiBkb2luZyBhdXRvbWF0ZWQgdGVzdGluZ1xuICBhbmQgYWxzbyBpZiB5b3Ugd2FudCB0byB0ZXN0IGNvbm5lY3Rpdml0eSBiZXR3ZWVuIHR3byBicm93c2VyIGluc3RhbmNlcyBhbmRcbiAgd2FudCB0byBkaXN0aW5ndWlzaCBiZXR3ZWVuIHRoZSB0d28gbG9jYWwgdmlkZW9zLlxuXG4gICMjIEludGVybmFsIE1ldGhvZHNcblxuICBUaGVyZSBhcmUgYSBudW1iZXIgb2YgaW50ZXJuYWwgbWV0aG9kcyB0aGF0IGFyZSB1c2VkIGluIHRoZSBgcnRjLW1lZGlhYFxuICBpbXBsZW1lbnRhdGlvbi4gVGhlc2UgYXJlIG91dGxpbmVkIGJlbG93LCBidXQgbm90IGV4cGVjdGVkIHRvIGJlIG9mXG4gIGdlbmVyYWwgdXNlLlxuXG4qKi9cblxuLyoqXG4gICMjIyBfcHJlcGFyZUVsZW1lbnQob3B0cywgZWxlbWVudClcblxuICBUaGUgcHJlcGFyZUVsZW1lbnQgZnVuY3Rpb24gaXMgdXNlZCB0byBwcmVwYXJlIERPTSBlbGVtZW50cyB0aGF0IHdpbGxcbiAgcmVjZWl2ZSB0aGUgbWVkaWEgc3RyZWFtcyBvbmNlIHRoZSBzdHJlYW0gaGF2ZSBiZWVuIHN1Y2Nlc3NmdWxseSBjYXB0dXJlZC5cbioqL1xuTWVkaWEucHJvdG90eXBlLl9wcmVwYXJlRWxlbWVudCA9IGZ1bmN0aW9uKG9wdHMsIGVsZW1lbnQpIHtcbiAgdmFyIHBhcmVudDtcbiAgdmFyIHZhbGlkRWxlbWVudCA9IChlbGVtZW50IGluc3RhbmNlb2YgSFRNTFZpZGVvRWxlbWVudCkgfHxcbiAgICAgICAgKGVsZW1lbnQgaW5zdGFuY2VvZiBIVE1MQXVkaW9FbGVtZW50KTtcbiAgdmFyIHByZXNlcnZlQXNwZWN0UmF0aW8gPVxuICAgICAgICB0eXBlb2Ygb3B0cy5wcmVzZXJ2ZUFzcGVjdFJhdGlvID09ICd1bmRlZmluZWQnIHx8XG4gICAgICAgIG9wdHMucHJlc2VydmVBc3BlY3RSYXRpbztcblxuICAvLyBwZXJmb3JtIHNvbWUgYWRkaXRpb25hbCBjaGVja3MgZm9yIHRoaW5ncyB0aGF0IFwibG9va1wiIGxpa2UgYVxuICAvLyBtZWRpYSBlbGVtZW50XG4gIHZhbGlkRWxlbWVudCA9IHZhbGlkRWxlbWVudCB8fCAodHlwZW9mIGVsZW1lbnQucGxheSA9PSAnZnVuY3Rpb24nKSAmJiAoXG4gICAgdHlwZW9mIGVsZW1lbnQubW96U3JjT2JqZWN0ICE9ICd1bmRlZmluZWQnIHx8XG4gICAgdHlwZW9mIGVsZW1lbnQuc3JjICE9ICd1bmRlZmluZWQnKTtcblxuICAvLyBpZiB0aGUgZWxlbWVudCBpcyBub3QgYSB2aWRlbyBlbGVtZW50LCB0aGVuIGNyZWF0ZSBvbmVcbiAgaWYgKCEgdmFsaWRFbGVtZW50KSB7XG4gICAgcGFyZW50ID0gZWxlbWVudDtcblxuICAgIC8vIGNyZWF0ZSBhIG5ldyB2aWRlbyBlbGVtZW50XG4gICAgLy8gVE9ETzogY3JlYXRlIGFuIGFwcHJvcHJpYXRlIGVsZW1lbnQgYmFzZWQgb24gdGhlIHR5cGVzIG9mIHRyYWNrc1xuICAgIC8vIGF2YWlsYWJsZVxuICAgIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd2aWRlbycpO1xuXG4gICAgLy8gaWYgd2UgYXJlIHByZXNlcnZpbmcgYXNwZWN0IHJhdGlvIGRvIHRoYXQgbm93XG4gICAgaWYgKHByZXNlcnZlQXNwZWN0UmF0aW8pIHtcbiAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdwcmVzZXJ2ZUFzcGVjdFJhdGlvJywgJycpO1xuICAgIH1cblxuICAgIC8vIGFkZCB0byB0aGUgcGFyZW50XG4gICAgcGFyZW50LmFwcGVuZENoaWxkKGVsZW1lbnQpO1xuICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdkYXRhLXBsYXlpbmcnLCBmYWxzZSk7XG4gIH1cblxuICAvLyBpZiBtdXRlZCwgaW5qZWN0IHRoZSBtdXRlZCBhdHRyaWJ1dGVcbiAgaWYgKGVsZW1lbnQgJiYgdGhpcy5tdXRlZCkge1xuICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKCdtdXRlZCcsICcnKTtcbiAgfVxuXG4gIC8vIGZsYWcgdGhlIGVsZW1lbnQgYXMgYm91bmRcbiAgdGhpcy5fYmluZGluZ3MucHVzaCh7XG4gICAgZWw6IGVsZW1lbnQsXG4gICAgb3B0czogb3B0c1xuICB9KTtcblxuICByZXR1cm4gZWxlbWVudDtcbn07XG5cbi8qKlxuICAjIyMgX2JpbmRTdHJlYW0oc3RyZWFtKVxuXG4gIEJpbmQgYSBzdHJlYW0gdG8gcHJldmlvdXNseSBwcmVwYXJlZCBET00gZWxlbWVudHMuXG5cbioqL1xuTWVkaWEucHJvdG90eXBlLl9iaW5kU3RyZWFtID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gIHZhciBtZWRpYSA9IHRoaXM7XG4gIHZhciBlbGVtZW50cyA9IFtdO1xuICB2YXIgd2FpdGluZyA9IFtdO1xuXG4gIGZ1bmN0aW9uIGNoZWNrV2FpdGluZygpIHtcbiAgICAvLyBpZiB3ZSBoYXZlIG5vIHdhaXRpbmcgZWxlbWVudHMsIGJ1dCBzb21lIGVsZW1lbnRzXG4gICAgLy8gdHJpZ2dlciB0aGUgc3RhcnQgZXZlbnRcbiAgICBpZiAod2FpdGluZy5sZW5ndGggPT09IDAgJiYgZWxlbWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgbWVkaWEuZW1pdCgncmVuZGVyJywgZWxlbWVudHNbMF0pO1xuXG4gICAgICBlbGVtZW50cy5tYXAoZnVuY3Rpb24oZWwpIHtcbiAgICAgICAgZWwuc2V0QXR0cmlidXRlKCdkYXRhLXBsYXlpbmcnLCB0cnVlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBsYXliYWNrU3RhcnRlZChldnQpIHtcbiAgICB2YXIgZWwgPSBldnQudGFyZ2V0IHx8IGV2dC5zcmNFbGVtZW50O1xuICAgIHZhciB2aWRlb0luZGV4ID0gZWxlbWVudHMuaW5kZXhPZihlbCk7XG5cbiAgICBpZiAodmlkZW9JbmRleCA+PSAwKSB7XG4gICAgICB3YWl0aW5nLnNwbGljZSh2aWRlb0luZGV4LCAxKTtcbiAgICB9XG5cbiAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKCdwbGF5aW5nJywgcGxheWJhY2tTdGFydGVkKTtcbiAgICBjaGVja1dhaXRpbmcoKTtcbiAgfVxuXG4gIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgYmluZGluZ3MgYW5kIGJpbmQgdGhlIHN0cmVhbVxuICBlbGVtZW50cyA9IHRoaXMuX2JpbmRpbmdzLm1hcChmdW5jdGlvbihiaW5kaW5nKSB7XG4gICAgLy8gY2hlY2sgZm9yIG1velNyY09iamVjdFxuICAgIGlmICh0eXBlb2YgYmluZGluZy5lbC5tb3pTcmNPYmplY3QgIT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGJpbmRpbmcuZWwubW96U3JjT2JqZWN0ID0gc3RyZWFtO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGJpbmRpbmcuZWwuc3JjID0gbWVkaWEuX2NyZWF0ZU9iamVjdFVSTChzdHJlYW0pIHx8IHN0cmVhbTtcbiAgICB9XG5cbiAgICAvLyBhdHRlbXB0IHRvIHBsYXkgdGhlIHZpZGVvXG4gICAgaWYgKHR5cGVvZiBiaW5kaW5nLmVsLnBsYXkgPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgYmluZGluZy5lbC5wbGF5KCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJpbmRpbmcuZWw7XG4gIH0pO1xuXG4gIC8vIGZpbmQgdGhlIGVsZW1lbnRzIHdlIGFyZSB3YWl0aW5nIG9uXG4gIHdhaXRpbmcgPSBlbGVtZW50cy5maWx0ZXIoZnVuY3Rpb24oZWwpIHtcbiAgICByZXR1cm4gZWwucmVhZHlTdGF0ZSA8IDM7IC8vIHJlYWR5c3RhdGUgPCBIQVZFX0ZVVFVSRV9EQVRBXG4gIH0pO1xuXG4gIC8vIHdhaXQgZm9yIGFsbCB0aGUgdmlkZW8gZWxlbWVudHNcbiAgd2FpdGluZy5tYXAoZnVuY3Rpb24oZWwpIHtcbiAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdwbGF5aW5nJywgcGxheWJhY2tTdGFydGVkLCBmYWxzZSk7XG4gIH0pO1xuXG4gIGNoZWNrV2FpdGluZygpO1xufTtcblxuLyoqXG4gICMjIyBfdW5iaW5kKClcblxuICBHcmFjZWZ1bGx5IGRldGFjaCBlbGVtZW50cyB0aGF0IGFyZSB1c2luZyB0aGUgc3RyZWFtIGZyb20gdGhlXG4gIGN1cnJlbnQgc3RyZWFtLlxuKiovXG5NZWRpYS5wcm90b3R5cGUuX3VuYmluZCA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgLy8gZW5zdXJlIHdlIGhhdmUgb3B0c1xuICBvcHRzID0gb3B0cyB8fCB7fTtcblxuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIGJpbmRpbmdzIGFuZCBkZXRhY2ggc3RyZWFtc1xuICB0aGlzLl9iaW5kaW5ncy5mb3JFYWNoKGZ1bmN0aW9uKGJpbmRpbmcpIHtcbiAgICB2YXIgZWxlbWVudCA9IGJpbmRpbmcuZWw7XG5cbiAgICAvLyByZW1vdmUgdGhlIHNvdXJjZVxuICAgIGVsZW1lbnQuc3JjID0gbnVsbDtcblxuICAgIC8vIGNoZWNrIGZvciBtb3pcbiAgICBpZiAoZWxlbWVudC5tb3pTcmNPYmplY3QpIHtcbiAgICAgIGVsZW1lbnQubW96U3JjT2JqZWN0ID0gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBjaGVjayBmb3IgY3VycmVudFNyY1xuICAgIGlmIChlbGVtZW50LmN1cnJlbnRTcmMpIHtcbiAgICAgIGVsZW1lbnQuY3VycmVudFNyYyA9IG51bGw7XG4gICAgfVxuICB9KTtcbn07XG5cbi8qKlxuICAjIyMgX2NyZWF0ZU9iamVjdFVybChzdHJlYW0pXG5cbiAgVGhpcyBtZXRob2QgaXMgdXNlZCB0byBjcmVhdGUgYW4gb2JqZWN0IHVybCB0aGF0IGNhbiBiZSBhdHRhY2hlZCB0byBhIHZpZGVvXG4gIG9yIGF1ZGlvIGVsZW1lbnQuICBPYmplY3QgdXJscyBhcmUgY2FjaGVkIHRvIGVuc3VyZSBvbmx5IG9uZSBpcyBjcmVhdGVkXG4gIHBlciBzdHJlYW0uXG4qKi9cbk1lZGlhLnByb3RvdHlwZS5fY3JlYXRlT2JqZWN0VVJMID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKHN0cmVhbSk7XG4gIH1cbiAgY2F0Y2ggKGUpIHtcbiAgfVxufTtcblxuLyoqXG4gICMjIyBfaGFuZGxlU3VjY2VzcyhzdHJlYW0pXG5cbiAgSGFuZGxlIHRoZSBzdWNjZXNzIGNvbmRpdGlvbiBvZiBhIGBnZXRVc2VyTWVkaWFgIGNhbGwuXG5cbioqL1xuTWVkaWEucHJvdG90eXBlLl9oYW5kbGVTdWNjZXNzID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gIC8vIHVwZGF0ZSB0aGUgYWN0aXZlIHN0cmVhbSB0aGF0IHdlIGFyZSBjb25uZWN0ZWQgdG9cbiAgdGhpcy5zdHJlYW0gPSBzdHJlYW07XG5cbiAgLy8gZW1pdCB0aGUgc3RyZWFtIGV2ZW50XG4gIHRoaXMuZW1pdCgnc3RyZWFtJywgc3RyZWFtKTtcbn07XG5cbi8qKlxuICAjIyMgX2hhbmRsZUZhaWwoZXZ0KVxuXG4gIEhhbmRsZSB0aGUgZmFpbHVyZSBjb25kaXRpb24gb2YgYSBgZ2V0VXNlck1lZGlhYCBjYWxsLlxuXG4qKi9cbk1lZGlhLnByb3RvdHlwZS5faGFuZGxlRmFpbCA9IGZ1bmN0aW9uKGVycikge1xuICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbn07IiwiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbi8qIGdsb2JhbCBkb2N1bWVudDogZmFsc2UgKi9cbi8qIGdsb2JhbCBIVE1MVmlkZW9FbGVtZW50OiBmYWxzZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgREVGQVVMVF9GUFMgPSAyNTtcbnZhciByYWYgPSByZXF1aXJlKCdmZG9tL3JhZicpO1xuXG4vKipcbiAgIyBydGMtdmlkZW9wcm9jXG5cbiAgVGhpcyBpcyBhIHNtYWxsIGhlbHBlciBtb2R1bGUgdGhhdCBhbGxvd3MgeW91IHRvIHN1YnN0aXR1dGUgYSB2aWRlb1xuICBlbGVtZW50IHdpdGggYSBjYW52YXMgZWxlbWVudC4gIFRoaXMgY2FuIGJlIHVzZWZ1bCB3aGVuIHlvdSB3YW50IHRvXG4gIGRvIHBpeGVsIG1hbmlwdWxhdGlvbiBvZiB0aGUgcmVuZGVyZWQgaW1hZ2VzLCBvciBpbiBzaXR1YXRpb25zIHdoZW5cbiAgYSB2aWRlbyBlbGVtZW50IGRvZXMgbm90IGJlaGF2ZSBhcyB5b3UgZXhwZWN0LlxuXG4gICMjIEV4YW1wbGUgVXNhZ2VcblxuICBUaGlzIHdhcyBwcmltYXJpbHkgd3JpdHRlbiB0byB3b3JrIHdpdGggdGhlXG4gIFtydGMtbWVkaWFdKGh0dHBzOi8vZ2l0aHViLmNvbS9ydGMtaW8vcnRjLW1lZGlhKSBsaWJyYXJ5IHNvIGhlcmUncyBhblxuICBleGFtcGxlIG9mIGhvdyBpdCB3b3JrcyB0aGVyZTpcblxuICA8PDwgZXhhbXBsZXMvcnRjLW1lZGlhLmpzXG5cbiAgTm9ybWFsbHksIHRoZSBgbWVkaWEoKS5yZW5kZXJgIGNhbGwgd2lsbCBjcmVhdGUgYSBgPHZpZGVvPmAgZWxlbWVudCBpblxuICB0aGUgc3BlY2lmaWVkIHRhcmdldCBjb250YWluZXIuICBJbiB0aGlzIGNhc2UsIGhvd2V2ZXIsIGBydGMtY2FudmFzYFxuICBpbnRlcmNlcHRzIHRoZSByZXF1ZXN0IGFuZCBjcmVhdGVzIGl0J3Mgb3duIGZha2UgdmlkZW8gZWxlbWVudCB0aGF0IGlzXG4gIHBhc3NlZCBiYWNrIHRvIHRoZSByZW5kZXIgY2FsbC5cblxuICAjIyBVc2luZyB0aGUgUHJvY2Vzc2luZyBQaXBlbGluZVxuXG4gIEEgcHJvY2Vzc2luZyBwaXBlbGluZSBoYXMgYmVlbiBpbmNsdWRlZCB0byBhc3Npc3Qgd2l0aFxuICBtYW5pcHVsYXRpbmcgdGhlIGNhbnZhcyBvbiB0aGUgZmx5LiBBZGRpbmcgYSBwcm9jZXNzb3IgdG8gdGhlIHBpcGVsaW5lIGlzXG4gIHNpbXBseSBhIG1hdHRlciBvZiBhZGRpbmcgYSBwaXBlbGluZSBwcm9jZXNzb3IgYXZhaWxhYmxlIG9uIHRoZSByZXR1cm5lZFxuICBmYWtlIHZpZGVvOlxuXG4gIGBgYGpzXG4gIC8vIGFkZCBhIHByb2Nlc3NvclxuICBjYW52YXMucGlwZWxpbmUuYWRkKGZ1bmN0aW9uKGltYWdlRGF0YSkge1xuICAgIC8vIGV4YW1pbmUgdGhlIHBpeGVsIGRhdGFcblxuICAgIC8vIGlmIHdlJ3ZlIG1vZGlmaWVkIHRoZSBwaXhlbCBkYXRhIGFuZCB3YW50IHRvIHdyaXRlIHRoYXQgYmFja1xuICAgIC8vIHRvIHRoZSBjYW52YXMgdGhlbiB3ZSBtdXN0IHJldHVybiBhIHRydXRoeSB2YWx1ZVxuICAgIHJldHVybiB0cnVlO1xuICB9KTtcbiAgYGBgXG5cbiAgQSBtb3JlIGNvbXBsZXRlIGV4YW1wbGUgaXMgc2hvd24gYmVsb3c6XG5cbiAgPDw8IGV4YW1wbGVzL2dyYXlzY2FsZS1maWx0ZXIuanNcblxuICAjIyBMaXN0ZW5pbmcgZm9yIGN1c3RvbSBgZnJhbWVgIGV2ZW50c1xuXG4gIEluIGFkZGl0aW9uIHRvIHByb3ZpZGluZyB0aGUgb3Bwb3J0dW5pdHkgdG8gYW5hbHlzZSBhbmQgbW9kaWZ5IHBpeGVsIGRhdGFcbiAgdGhlIGBydGMtY2FudmFzYCBtb2R1bGUgYWxzbyBwcm92aWRlcyB0aGUgYSBjdXN0b20gYGZyYW1lYCBldmVudCBmb3JcbiAgZGV0ZWN0aW5nIHdoZW4gYSBuZXcgZnJhbWUgaGFzIGJlZW4gZHJhd24gdG8gdGhlIGNhbnZhcy5cblxuICBBIHNpbXBsZSBleGFtcGxlIGNhbiBiZSBmb3VuZCBiZWxvdzpcblxuICA8PDwgZXhhbXBsZXMvZnJhbWVsaXN0ZW5lci5qc1xuXG4gICMjIEEgTm90ZSB3aXRoIFJlZ2FyZHMgdG8gQ1BVIFVzYWdlXG5cbiAgQnkgZGVmYXVsdCBydGMtY2FudmFzIHdpbGwgZHJhdyBhdCAyNWZwcyBidXQgdGhpcyBjYW4gYmUgbW9kaWZpZWQgdG8gY2FwdHVyZVxuICBhdCBhIGxvd2VyIGZyYW1lIHJhdGUgZm9yIHNsb3dlciBkZXZpY2VzLCBvciBpbmNyZWFzZWQgaWYgeW91IGhhdmUgYVxuICBtYWNoaW5lIHdpdGggcGxlbnR5IG9mIGdydW50LlxuXG4gICMjIFJlZmVyZW5jZVxuXG4gICMjIyBjYW52YXModGFyZ2V0LCBvcHRzKVxuXG4gIENyZWF0ZSBhIGZha2UgdmlkZW8gZWxlbWVudCBmb3IgdGhlIHNwZWNpZmllZCB0YXJnZXQgZWxlbWVudC5cblxuICAtIGBmcHNgIC0gdGhlIHJlZHJhdyByYXRlIG9mIHRoZSBmYWtlIHZpZGVvIChkZWZhdWx0ID0gMjUpXG5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0YXJnZXQsIG9wdHMpIHtcbiAgdmFyIGNhbnZhcyA9ICh0YXJnZXQgaW5zdGFuY2VvZiBIVE1MQ2FudmFzRWxlbWVudCkgP1xuICAgIHRhcmdldCA6XG4gICAgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cbiAgdmFyIHZpZCA9ICh0YXJnZXQgaW5zdGFuY2VvZiBIVE1MVmlkZW9FbGVtZW50KSA/XG4gICAgdGFyZ2V0IDpcbiAgICBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd2aWRlbycpO1xuXG4gIC8vIGlmIHRoZSB0YXJnZXQgaXMgYSB2aWRlb1xuICBpZiAodGFyZ2V0ID09PSB2aWQpIHtcbiAgICAvLyBpbnNlcnQgdGhlIGNhbnZhcyB0byB0aGUgdmlkZW8gcGFyZW50IGVsZW1lbnRcbiAgICB2aWQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoY2FudmFzLCB2aWQpO1xuICB9XG4gIC8vIG90aGVyd2lzZSwgaWYgdGhlIHRhcmdldCB3YXMgbm90IGEgY2FudmFzIGFkZCB0aGUgY2FudmFzIHRvIHRoZSB0YXJnZXRcbiAgZWxzZSBpZiAodGFyZ2V0ICE9PSBjYW52YXMpIHtcbiAgICAvLyBhcHBlbmQgdGhlIGNhbnZhcyB0byB0aGUgdGFyZ2V0XG4gICAgdGFyZ2V0LmFwcGVuZENoaWxkKGNhbnZhcyk7XG4gIH1cblxuICAvLyBpbml0aWFsaXNlIHRoZSBjYW52YXMgd2lkdGggYW5kIGhlaWdodFxuICBjYW52YXMud2lkdGggPSAob3B0cyB8fCB7fSkud2lkdGggfHwgMDtcbiAgY2FudmFzLmhlaWdodCA9IChvcHRzIHx8IHt9KS5oZWlnaHQgfHwgMDtcblxuICAvLyBoaWRlIHRoZSB2aWRlbyBlbGVtZW50XG4gIHZpZC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIGNhbnZhcyBwaXBlbGluZVxuICBjYW52YXMucGlwZWxpbmUgPSBjcmVhdGVGYWNhZGUoY2FudmFzLCB2aWQsIG9wdHMpO1xuXG4gIHJldHVybiBjYW52YXM7XG59O1xuXG4vKlxuICAjIyMgY3JlYXRlRmFjYWRlKGNhbnZhcywgdmlkKSA9PT4gRXZlbnRFbWl0dGVyXG5cbiAgSW5qZWN0IHRoZSByZXF1aXJlZCBmYWtlIHByb3BlcnRpZXMgb250byB0aGUgY2FudmFzIGFuZCByZXR1cm4gYVxuICBub2RlLXN0eWxlIEV2ZW50RW1pdHRlciB0aGF0IHdpbGwgcHJvdmlkZSB1cGRhdGVzIG9uIHdoZW4gdGhlIHByb3BlcnRpZXNcbiAgY2hhbmdlLlxuXG4qL1xuZnVuY3Rpb24gY3JlYXRlRmFjYWRlKGNhbnZhcywgdmlkLCBvcHRzKSB7XG4gIHZhciBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gIHZhciBwbGF5aW5nID0gZmFsc2U7XG4gIHZhciBsYXN0VGljayA9IDA7XG4gIHZhciB0aWNrO1xuXG4gIC8vIGluaXRpYWxpc2UgZnBzXG4gIHZhciBmcHMgPSAob3B0cyB8fCB7fSkuZnBzIHx8IERFRkFVTFRfRlBTO1xuXG4gIC8vIGNhbGFjdWxhdGUgdGhlIGRyYXcgZGVsYXksIGNsYW1wIGFzIGludFxuICB2YXIgZHJhd0RlbGF5ID0gKDEwMDAgLyBmcHMpIHwgMDtcbiAgdmFyIGRyYXdXaWR0aDtcbiAgdmFyIGRyYXdIZWlnaHQ7XG4gIHZhciBkcmF3WCA9IDA7XG4gIHZhciBkcmF3WSA9IDA7XG4gIHZhciBkcmF3RGF0YTtcblxuICB2YXIgcHJvY2Vzc29ycyA9IFtdO1xuICB2YXIgcElkeDtcbiAgdmFyIHBDb3VudCA9IDA7XG4gIHZhciB0cmlnZ2VyRnJhbWVFdmVudCA9IHR5cGVvZiBDdXN0b21FdmVudCAhPSAndW5kZWZpbmVkJztcblxuICBmdW5jdGlvbiBhZGRQcm9jZXNzb3IocHJvY2Vzc29yKSB7XG4gICAgcENvdW50ID0gcHJvY2Vzc29ycy5wdXNoKHByb2Nlc3Nvcik7XG4gIH1cblxuICBmdW5jdGlvbiByZWRyYXcodGljaykge1xuICAgIHZhciBpbWFnZURhdGE7XG4gICAgdmFyIHR3ZWFrZWQ7XG4gICAgdmFyIGV2dDtcblxuICAgIGlmICghIHBsYXlpbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBnZXQgdGhlIGN1cnJlbnQgdGlja1xuICAgIHRpY2sgPSB0aWNrIHx8IERhdGUubm93KCk7XG5cbiAgICAvLyBvbmx5IGRyYXcgYXMgb2Z0ZW4gYXMgc3BlY2lmaWVkIGluIHRoZSBmcHNcbiAgICBpZiAodGljayAtIGxhc3RUaWNrID4gZHJhd0RlbGF5KSB7XG4gICAgICAvLyBkcmF3IHRoZSBpbWFnZVxuICAgICAgY29udGV4dC5kcmF3SW1hZ2UodmlkLCBkcmF3WCwgZHJhd1ksIGRyYXdXaWR0aCwgZHJhd0hlaWdodCk7XG5cbiAgICAgIC8vIGNyZWF0ZSB0aGUgZnJhbWUgZXZlbnRcbiAgICAgIGV2dCA9IHRyaWdnZXJGcmFtZUV2ZW50ICYmIG5ldyBDdXN0b21FdmVudCgnZnJhbWUnLCB7XG4gICAgICAgIGRldGFpbDoge1xuICAgICAgICAgIHRpY2s6IHRpY2tcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIGlmIHdlIGhhdmUgdGhlIGZyYW1lIGV2ZW50IHRoZW4gZGlzcGF0Y2hcbiAgICAgIGlmIChldnQpIHtcbiAgICAgICAgY2FudmFzLmRpc3BhdGNoRXZlbnQoZXZ0KTtcbiAgICAgIH1cblxuICAgICAgLy8gaWYgd2UgaGF2ZSBwcm9jZXNzb3JzLCBnZXQgdGhlIGltYWdlIGRhdGEgYW5kIHBhc3MgaXQgdGhyb3VnaFxuICAgICAgaWYgKHBDb3VudCkge1xuICAgICAgICBpbWFnZURhdGEgPSBjb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCBkcmF3V2lkdGgsIGRyYXdIZWlnaHQpO1xuICAgICAgICB0d2Vha2VkID0gZmFsc2U7XG5cbiAgICAgICAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBwcm9jZXNzb3JzXG4gICAgICAgIGZvciAocElkeCA9IDA7IHBJZHggPCBwQ291bnQ7IHBJZHgrKykge1xuICAgICAgICAgIC8vIGNhbGwgdGhlIHByb2Nlc3NvciwgYW5kIGFsbG93IGl0IHRvIHRlbGwgdXMgaWYgaXQgaGFzIG1vZGlmaWVkXG4gICAgICAgICAgLy8gdGhlIHBpcGVsaW5lXG4gICAgICAgICAgdHdlYWtlZCA9IHByb2Nlc3NvcnNbcElkeF0oaW1hZ2VEYXRhLCBjb250ZXh0LCBjYW52YXMsIGRyYXdEYXRhKSB8fFxuICAgICAgICAgICAgdHdlYWtlZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0d2Vha2VkKSB7XG4gICAgICAgICAgLy8gVE9ETzogZGlydHkgYXJlYVxuICAgICAgICAgIGNvbnRleHQucHV0SW1hZ2VEYXRhKGltYWdlRGF0YSwgMCwgMCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gdXBkYXRlIHRoZSBsYXN0IHRpY2tcbiAgICAgIGxhc3RUaWNrID0gdGljaztcbiAgICB9XG5cbiAgICAvLyBxdWV1ZSB1cCBhbm90aGVyIHJlZHJhd1xuICAgIHJhZihyZWRyYXcpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlUGxheWluZygpIHtcbiAgICB2YXIgc2NhbGU7XG4gICAgdmFyIHNjYWxlWDtcbiAgICB2YXIgc2NhbGVZO1xuXG4gICAgLy8gc2V0IHRoZSBjYW52YXMgdGhlIHJpZ2h0IHNpemUgKGlmIG5vdCBhbHJlYWR5IGluaXRpYWxpemVkKVxuICAgIGlmIChjYW52YXMud2lkdGggPT09IDAgfHwgY2FudmFzLmhlaWdodCA9PT0gMCkge1xuICAgICAgY2FudmFzLndpZHRoID0gdmlkLnZpZGVvV2lkdGg7XG4gICAgICBjYW52YXMuaGVpZ2h0ID0gdmlkLnZpZGVvSGVpZ2h0O1xuICAgIH1cblxuICAgIC8vIGlmIGVpdGhlciB3aWR0aCBvciBoZWlnaHQgPT09IDAgdGhlbiBiYWlsXG4gICAgaWYgKGNhbnZhcy53aWR0aCA9PT0gMCB8fCBjYW52YXMuaGVpZ2h0ID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gY2FsY3VsYXRlIHJlcXVpcmVkIHNjYWxpbmdcbiAgICBzY2FsZSA9IE1hdGgubWluKFxuICAgICAgc2NhbGVYID0gKGNhbnZhcy53aWR0aCAvIHZpZC52aWRlb1dpZHRoKSxcbiAgICAgIHNjYWxlWSA9IChjYW52YXMuaGVpZ2h0IC8gdmlkLnZpZGVvSGVpZ2h0KVxuICAgICk7XG5cbiAgICAvLyBjYWxjdWxhdGUgdGhlIHNjYWxlZCBkcmF3IHdpZHRoIGFuZCBoZWlnaHRcbiAgICBkcmF3V2lkdGggPSAodmlkLnZpZGVvV2lkdGggKiBzY2FsZSkgfCAwO1xuICAgIGRyYXdIZWlnaHQgPSAodmlkLnZpZGVvSGVpZ2h0ICogc2NhbGUpIHwgMDtcblxuICAgIC8vIGNhbGN1bGF0ZSB0aGUgb2Zmc2V0WCBhbmQgWVxuICAgIGRyYXdYID0gKGNhbnZhcy53aWR0aCAtIGRyYXdXaWR0aCkgPj4gMTtcbiAgICBkcmF3WSA9IChjYW52YXMuaGVpZ2h0IC0gZHJhd0hlaWdodCkgPj4gMTtcblxuICAgIC8vIHNhdmUgdGhlIGRyYXcgZGF0YVxuICAgIGRyYXdEYXRhID0ge1xuICAgICAgeDogZHJhd1gsXG4gICAgICB5OiBkcmF3WSxcbiAgICAgIHdpZHRoOiBkcmF3V2lkdGgsXG4gICAgICBoZWlnaHQ6IGRyYXdIZWlnaHRcbiAgICB9O1xuXG4gICAgLy8gZmxhZyBhcyBwbGF5aW5nXG4gICAgcGxheWluZyA9IHRydWU7XG5cbiAgICAvLyBzdGFydCB0aGUgYW5pbWF0aW9uIGxvb3BcbiAgICByYWYocmVkcmF3KTtcbiAgfVxuXG4gIHZpZC5hZGRFdmVudExpc3RlbmVyKCdwbGF5aW5nJywgaGFuZGxlUGxheWluZyk7XG5cbiAgLy8gaW5qZWN0IHRoZSBmYWtlIHByb3BlcnRpZXNcbiAgWydtb3pTcmNPYmplY3QnLCAnc3JjJ10uZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgaWYgKHR5cGVvZiB2aWRbcHJvcF0gPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoY2FudmFzLCBwcm9wLCB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdmlkW3Byb3BdO1xuICAgICAgfSxcblxuICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB2aWRbcHJvcF0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gYWRkIGEgZmFrZSBwbGF5IGZ1bmN0aW9uXG4gIGNhbnZhcy5wbGF5ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gcGxheSB0aGUgdmlkZW9cbiAgICB2aWQucGxheSgpO1xuICB9O1xuXG4gIHJldHVybiB7XG4gICAgYWRkOiBhZGRQcm9jZXNzb3JcbiAgfTtcbn0iLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIHdpbmRvdzogZmFsc2UgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIFRFU1RfUFJPUFMgPSBbJ3InLCAnd2Via2l0UicsICdtb3pSJywgJ29SJywgJ21zUiddO1xuXG4vKipcbiAgIyMjIHJhZihjYWxsYmFjaylcblxuICBSZXF1ZXN0IGFuaW1hdGlvbiBmcmFtZSBoZWxwZXIuXG5cbiAgPDw8IGV4YW1wbGVzL3JhZi5qc1xuXG4qKi9cblxubW9kdWxlLmV4cG9ydHMgPSB0eXBlb2Ygd2luZG93ICE9ICd1bmRlZmluZWQnICYmIChmdW5jdGlvbigpIHtcbiAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IFRFU1RfUFJPUFMubGVuZ3RoOyBpaSsrKSB7XG4gICAgd2luZG93LmFuaW1GcmFtZSA9IHdpbmRvdy5hbmltRnJhbWUgfHxcbiAgICAgIHdpbmRvd1tURVNUX1BST1BTW2lpXSArICdlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICB9IC8vIGZvclxuXG4gIHJldHVybiBhbmltRnJhbWU7XG59KSgpOyJdfQ==
