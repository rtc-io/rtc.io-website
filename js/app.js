(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* jshint node: true */
/* global document: false */
'use strict';

/**
  ## cog/loader

  ```js
  var loader = require('cog/loader');
  ```

  ### loader(urls, opts?, callback)

  This is a simple script loader that will load the urls specified
  and trigger the callback once all those scripts have been loaded (or
  loading has failed in one instance).

  __NOTE:__ Deprecated, moved into [dd](https://github.com/DamonOehlman/dd)

**/

module.exports = function(urls, opts, callback) {
  var pending;
  var target;

  function handleLoaded(evt) {
    // decrement the pending count
    pending -= 1;

    // if we have finished, trigger the callback
    if (pending <= 0 && typeof callback == 'function') {
      // TODO: detect and send through errors
      callback();
    }
  }

  // ensure we have an array for scripts
  urls = [].concat(urls || []);

  // check the no opts case
  if (typeof opts == 'function') {
    callback = opts;
    opts = {};
  }

  // set how many urls we are waiting for
  pending = urls.length;

  // initialise the target (default to document.body)
  target = (opts || {}).target || document.body;

  // create the script elements
  urls.map(function(url) {
    var script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.addEventListener('load', handleLoaded);

    return script;
  })
  // add them to the target
  .forEach(target.appendChild.bind(target));
};
},{}],2:[function(require,module,exports){
/* jshint node: true */
/* global document: false */
'use strict';

var classSelectorRE = /^\.([\w\-]+)$/;
var idSelectorRE = /^#([\w\-]+)$/;
var tagSelectorRE = /^[\w\-]+$/;

/**
  ## cog/qsa

  ```js
  var qsa = require('cog/qsa');
  ```

  ### qsa(selector, scope?)

  This function is used to get the results of the querySelectorAll output
  in the fastest possible way.  This code is very much based on the
  implementation in
  [zepto](https://github.com/madrobby/zepto/blob/master/src/zepto.js#L104),
  but perhaps not quite as terse.

  __NOTE:__ Deprecated, moved into [dd](https://github.com/DamonOehlman/dd)
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
},{}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
var crel = require('crel');
var qsa = require('cog/qsa');
var loader = require('cog/loader');
var main = qsa('.main')[0];
var reStatusOK = /^(2|3)\d{2}$/;
var reStripExt = /^(.*)\.js$/;
var baseScripts = [
  '//rtc.io/switchboard/rtc.io/primus.js'
];

function createCodeFrame(sample, anchor, callback) {
  var frameContainer;
  var frame;
  var closeBar;
  var content;
  var xhr = new XMLHttpRequest();
  var sampleHTML = '<html><body></body></html>';

  frameContainer = crel('div', { class: 'codeframe' },
    closeBar = crel('div', { class: 'closer' }, 'close sample'),
    frame = crel('iframe')
  );

  // insert the code frame
  document.body.insertBefore(frameContainer, main);

  // initialise the content
  content = frame.contentDocument || frame.contentWindow.document;

  // check if we have custom html for this demo
  xhr.open('GET', 'code/' + sample + '.html');
  xhr.onload = function() {
    // if we got it, then use that as the document
    if (this.status === 200) {
      sampleHTML = this.response;
    }

    // write the sample html into the frame
    content.open();
    content.write(sampleHTML);
    content.close();

    // trigger the callback
    callback(frameContainer, content);
  };

  xhr.send();
}

function initSample(anchor) {

  function closeCode() {
    var frame = anchor.codeframe;

    // if the anchor already has a codeframe associated with it dropit
    if (frame) {
      frame.className = 'codeframe';
      anchor.codeframe = null;

      setTimeout(function() {
        frame.parentNode.removeChild(frame);
      }, 500);
    }
  }

  anchor.addEventListener('click', function(evt) {
    var sample = (anchor.dataset.sample || '').replace(reStripExt, '$1');
    var frame;

    // don't do the default click anchor thing...
    evt.preventDefault();

    // create the code frame
    createCodeFrame(sample, anchor, function(frame, doc) {
      var style = doc.createElement('style');
      style.innerHTML = [
        'html { overflow: hidden; }',
        'body { width: 820px; margin: 5px auto 0; }',
        'body video { width: 100% }',
        'body canvas { width: 100% }'
      ].join('\n');

      doc.head.appendChild(style);

      // load the required scripts
      loader(baseScripts, { target: doc.body }, function() {
        loader('js/samples/' + sample + '.js', { target: doc.body });

        setTimeout(function() {
          frame.className += ' active';
        }, 100);
      });

      // associate the code frame with the frame
      anchor.codeframe = frame;
      qsa('.closer', frame)[0].addEventListener('click', closeCode);
    });
  });
}

qsa('.sample').forEach(initSample);

},{"cog/loader":1,"cog/qsa":2,"crel":3}]},{},[4])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvY2xpbGwvU2VydmVyL3J0Yy5pby9ydGMuaW8td2Vic2l0ZS9ub2RlX21vZHVsZXMvY29nL2xvYWRlci5qcyIsIi9Vc2Vycy9jbGlsbC9TZXJ2ZXIvcnRjLmlvL3J0Yy5pby13ZWJzaXRlL25vZGVfbW9kdWxlcy9jb2cvcXNhLmpzIiwiL1VzZXJzL2NsaWxsL1NlcnZlci9ydGMuaW8vcnRjLmlvLXdlYnNpdGUvbm9kZV9tb2R1bGVzL2NyZWwvY3JlbC5qcyIsIi9Vc2Vycy9jbGlsbC9TZXJ2ZXIvcnRjLmlvL3J0Yy5pby13ZWJzaXRlL3NyYy9hcHAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIGRvY3VtZW50OiBmYWxzZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyMgY29nL2xvYWRlclxuXG4gIGBgYGpzXG4gIHZhciBsb2FkZXIgPSByZXF1aXJlKCdjb2cvbG9hZGVyJyk7XG4gIGBgYFxuXG4gICMjIyBsb2FkZXIodXJscywgb3B0cz8sIGNhbGxiYWNrKVxuXG4gIFRoaXMgaXMgYSBzaW1wbGUgc2NyaXB0IGxvYWRlciB0aGF0IHdpbGwgbG9hZCB0aGUgdXJscyBzcGVjaWZpZWRcbiAgYW5kIHRyaWdnZXIgdGhlIGNhbGxiYWNrIG9uY2UgYWxsIHRob3NlIHNjcmlwdHMgaGF2ZSBiZWVuIGxvYWRlZCAob3JcbiAgbG9hZGluZyBoYXMgZmFpbGVkIGluIG9uZSBpbnN0YW5jZSkuXG5cbiAgX19OT1RFOl9fIERlcHJlY2F0ZWQsIG1vdmVkIGludG8gW2RkXShodHRwczovL2dpdGh1Yi5jb20vRGFtb25PZWhsbWFuL2RkKVxuXG4qKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih1cmxzLCBvcHRzLCBjYWxsYmFjaykge1xuICB2YXIgcGVuZGluZztcbiAgdmFyIHRhcmdldDtcblxuICBmdW5jdGlvbiBoYW5kbGVMb2FkZWQoZXZ0KSB7XG4gICAgLy8gZGVjcmVtZW50IHRoZSBwZW5kaW5nIGNvdW50XG4gICAgcGVuZGluZyAtPSAxO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSBmaW5pc2hlZCwgdHJpZ2dlciB0aGUgY2FsbGJhY2tcbiAgICBpZiAocGVuZGluZyA8PSAwICYmIHR5cGVvZiBjYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAvLyBUT0RPOiBkZXRlY3QgYW5kIHNlbmQgdGhyb3VnaCBlcnJvcnNcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgfVxuICB9XG5cbiAgLy8gZW5zdXJlIHdlIGhhdmUgYW4gYXJyYXkgZm9yIHNjcmlwdHNcbiAgdXJscyA9IFtdLmNvbmNhdCh1cmxzIHx8IFtdKTtcblxuICAvLyBjaGVjayB0aGUgbm8gb3B0cyBjYXNlXG4gIGlmICh0eXBlb2Ygb3B0cyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRzO1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIC8vIHNldCBob3cgbWFueSB1cmxzIHdlIGFyZSB3YWl0aW5nIGZvclxuICBwZW5kaW5nID0gdXJscy5sZW5ndGg7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgdGFyZ2V0IChkZWZhdWx0IHRvIGRvY3VtZW50LmJvZHkpXG4gIHRhcmdldCA9IChvcHRzIHx8IHt9KS50YXJnZXQgfHwgZG9jdW1lbnQuYm9keTtcblxuICAvLyBjcmVhdGUgdGhlIHNjcmlwdCBlbGVtZW50c1xuICB1cmxzLm1hcChmdW5jdGlvbih1cmwpIHtcbiAgICB2YXIgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG4gICAgc2NyaXB0LnNyYyA9IHVybDtcbiAgICBzY3JpcHQuYXN5bmMgPSB0cnVlO1xuICAgIHNjcmlwdC5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgaGFuZGxlTG9hZGVkKTtcblxuICAgIHJldHVybiBzY3JpcHQ7XG4gIH0pXG4gIC8vIGFkZCB0aGVtIHRvIHRoZSB0YXJnZXRcbiAgLmZvckVhY2godGFyZ2V0LmFwcGVuZENoaWxkLmJpbmQodGFyZ2V0KSk7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgZG9jdW1lbnQ6IGZhbHNlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBjbGFzc1NlbGVjdG9yUkUgPSAvXlxcLihbXFx3XFwtXSspJC87XG52YXIgaWRTZWxlY3RvclJFID0gL14jKFtcXHdcXC1dKykkLztcbnZhciB0YWdTZWxlY3RvclJFID0gL15bXFx3XFwtXSskLztcblxuLyoqXG4gICMjIGNvZy9xc2FcblxuICBgYGBqc1xuICB2YXIgcXNhID0gcmVxdWlyZSgnY29nL3FzYScpO1xuICBgYGBcblxuICAjIyMgcXNhKHNlbGVjdG9yLCBzY29wZT8pXG5cbiAgVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIGdldCB0aGUgcmVzdWx0cyBvZiB0aGUgcXVlcnlTZWxlY3RvckFsbCBvdXRwdXRcbiAgaW4gdGhlIGZhc3Rlc3QgcG9zc2libGUgd2F5LiAgVGhpcyBjb2RlIGlzIHZlcnkgbXVjaCBiYXNlZCBvbiB0aGVcbiAgaW1wbGVtZW50YXRpb24gaW5cbiAgW3plcHRvXShodHRwczovL2dpdGh1Yi5jb20vbWFkcm9iYnkvemVwdG8vYmxvYi9tYXN0ZXIvc3JjL3plcHRvLmpzI0wxMDQpLFxuICBidXQgcGVyaGFwcyBub3QgcXVpdGUgYXMgdGVyc2UuXG5cbiAgX19OT1RFOl9fIERlcHJlY2F0ZWQsIG1vdmVkIGludG8gW2RkXShodHRwczovL2dpdGh1Yi5jb20vRGFtb25PZWhsbWFuL2RkKVxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNlbGVjdG9yLCBzY29wZSkge1xuICB2YXIgaWRTZWFyY2g7XG5cbiAgLy8gZGVmYXVsdCB0aGUgZWxlbWVudCB0byB0aGUgZG9jdW1lbnRcbiAgc2NvcGUgPSBzY29wZSB8fCBkb2N1bWVudDtcblxuICAvLyBkZXRlcm1pbmUgd2hldGhlciB3ZSBhcmUgZG9pbmcgYW4gaWQgc2VhcmNoIG9yIG5vdFxuICBpZFNlYXJjaCA9IHNjb3BlID09PSBkb2N1bWVudCAmJiBpZFNlbGVjdG9yUkUudGVzdChzZWxlY3Rvcik7XG5cbiAgLy8gcGVyZm9ybSB0aGUgc2VhcmNoXG4gIHJldHVybiBpZFNlYXJjaCA/XG4gICAgLy8gd2UgYXJlIGRvaW5nIGFuIGlkIHNlYXJjaCwgcmV0dXJuIHRoZSBlbGVtZW50IHNlYXJjaCBpbiBhbiBhcnJheVxuICAgIFtzY29wZS5nZXRFbGVtZW50QnlJZChSZWdFeHAuJDEpXSA6XG4gICAgLy8gbm90IGFuIGlkIHNlYXJjaCwgY2FsbCB0aGUgYXBwcm9wcmlhdGUgc2VsZWN0b3JcbiAgICBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChcbiAgICAgICAgY2xhc3NTZWxlY3RvclJFLnRlc3Qoc2VsZWN0b3IpID9cbiAgICAgICAgICBzY29wZS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFJlZ0V4cC4kMSkgOlxuICAgICAgICAgICAgdGFnU2VsZWN0b3JSRS50ZXN0KHNlbGVjdG9yKSA/XG4gICAgICAgICAgICAgIHNjb3BlLmdldEVsZW1lbnRzQnlUYWdOYW1lKHNlbGVjdG9yKSA6XG4gICAgICAgICAgICAgIHNjb3BlLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpXG4gICAgKTtcbn07IiwiLy9Db3B5cmlnaHQgKEMpIDIwMTIgS29yeSBOdW5uXHJcblxyXG4vL1Blcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XHJcblxyXG4vL1RoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxyXG5cclxuLy9USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cclxuXHJcbi8qXHJcblxyXG4gICAgVGhpcyBjb2RlIGlzIG5vdCBmb3JtYXR0ZWQgZm9yIHJlYWRhYmlsaXR5LCBidXQgcmF0aGVyIHJ1bi1zcGVlZCBhbmQgdG8gYXNzaXN0IGNvbXBpbGVycy5cclxuXHJcbiAgICBIb3dldmVyLCB0aGUgY29kZSdzIGludGVudGlvbiBzaG91bGQgYmUgdHJhbnNwYXJlbnQuXHJcblxyXG4gICAgKioqIElFIFNVUFBPUlQgKioqXHJcblxyXG4gICAgSWYgeW91IHJlcXVpcmUgdGhpcyBsaWJyYXJ5IHRvIHdvcmsgaW4gSUU3LCBhZGQgdGhlIGZvbGxvd2luZyBhZnRlciBkZWNsYXJpbmcgY3JlbC5cclxuXHJcbiAgICB2YXIgdGVzdERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLFxyXG4gICAgICAgIHRlc3RMYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xhYmVsJyk7XHJcblxyXG4gICAgdGVzdERpdi5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2EnKTtcclxuICAgIHRlc3REaXZbJ2NsYXNzTmFtZSddICE9PSAnYScgPyBjcmVsLmF0dHJNYXBbJ2NsYXNzJ10gPSAnY2xhc3NOYW1lJzp1bmRlZmluZWQ7XHJcbiAgICB0ZXN0RGl2LnNldEF0dHJpYnV0ZSgnbmFtZScsJ2EnKTtcclxuICAgIHRlc3REaXZbJ25hbWUnXSAhPT0gJ2EnID8gY3JlbC5hdHRyTWFwWyduYW1lJ10gPSBmdW5jdGlvbihlbGVtZW50LCB2YWx1ZSl7XHJcbiAgICAgICAgZWxlbWVudC5pZCA9IHZhbHVlO1xyXG4gICAgfTp1bmRlZmluZWQ7XHJcblxyXG5cclxuICAgIHRlc3RMYWJlbC5zZXRBdHRyaWJ1dGUoJ2ZvcicsICdhJyk7XHJcbiAgICB0ZXN0TGFiZWxbJ2h0bWxGb3InXSAhPT0gJ2EnID8gY3JlbC5hdHRyTWFwWydmb3InXSA9ICdodG1sRm9yJzp1bmRlZmluZWQ7XHJcblxyXG5cclxuXHJcbiovXHJcblxyXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcclxuICAgIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAgICAgZGVmaW5lKGZhY3RvcnkpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByb290LmNyZWwgPSBmYWN0b3J5KCk7XHJcbiAgICB9XHJcbn0odGhpcywgZnVuY3Rpb24gKCkge1xyXG4gICAgLy8gYmFzZWQgb24gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8zODQyODYvamF2YXNjcmlwdC1pc2RvbS1ob3ctZG8teW91LWNoZWNrLWlmLWEtamF2YXNjcmlwdC1vYmplY3QtaXMtYS1kb20tb2JqZWN0XHJcbiAgICB2YXIgaXNOb2RlID0gdHlwZW9mIE5vZGUgPT09ICdmdW5jdGlvbidcclxuICAgICAgICA/IGZ1bmN0aW9uIChvYmplY3QpIHsgcmV0dXJuIG9iamVjdCBpbnN0YW5jZW9mIE5vZGU7IH1cclxuICAgICAgICA6IGZ1bmN0aW9uIChvYmplY3QpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdFxyXG4gICAgICAgICAgICAgICAgJiYgdHlwZW9mIG9iamVjdCA9PT0gJ29iamVjdCdcclxuICAgICAgICAgICAgICAgICYmIHR5cGVvZiBvYmplY3Qubm9kZVR5cGUgPT09ICdudW1iZXInXHJcbiAgICAgICAgICAgICAgICAmJiB0eXBlb2Ygb2JqZWN0Lm5vZGVOYW1lID09PSAnc3RyaW5nJztcclxuICAgICAgICB9O1xyXG4gICAgdmFyIGlzQXJyYXkgPSBmdW5jdGlvbihhKXsgcmV0dXJuIGEgaW5zdGFuY2VvZiBBcnJheTsgfTtcclxuICAgIHZhciBhcHBlbmRDaGlsZCA9IGZ1bmN0aW9uKGVsZW1lbnQsIGNoaWxkKSB7XHJcbiAgICAgIGlmKCFpc05vZGUoY2hpbGQpKXtcclxuICAgICAgICAgIGNoaWxkID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY2hpbGQpO1xyXG4gICAgICB9XHJcbiAgICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQoY2hpbGQpO1xyXG4gICAgfTtcclxuXHJcblxyXG4gICAgZnVuY3Rpb24gY3JlbCgpe1xyXG4gICAgICAgIHZhciBkb2N1bWVudCA9IHdpbmRvdy5kb2N1bWVudCxcclxuICAgICAgICAgICAgYXJncyA9IGFyZ3VtZW50cywgLy9Ob3RlOiBhc3NpZ25lZCB0byBhIHZhcmlhYmxlIHRvIGFzc2lzdCBjb21waWxlcnMuIFNhdmVzIGFib3V0IDQwIGJ5dGVzIGluIGNsb3N1cmUgY29tcGlsZXIuIEhhcyBuZWdsaWdhYmxlIGVmZmVjdCBvbiBwZXJmb3JtYW5jZS5cclxuICAgICAgICAgICAgZWxlbWVudCA9IGFyZ3NbMF0sXHJcbiAgICAgICAgICAgIGNoaWxkLFxyXG4gICAgICAgICAgICBzZXR0aW5ncyA9IGFyZ3NbMV0sXHJcbiAgICAgICAgICAgIGNoaWxkSW5kZXggPSAyLFxyXG4gICAgICAgICAgICBhcmd1bWVudHNMZW5ndGggPSBhcmdzLmxlbmd0aCxcclxuICAgICAgICAgICAgYXR0cmlidXRlTWFwID0gY3JlbC5hdHRyTWFwO1xyXG5cclxuICAgICAgICBlbGVtZW50ID0gaXNOb2RlKGVsZW1lbnQpID8gZWxlbWVudCA6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZWxlbWVudCk7XHJcbiAgICAgICAgLy8gc2hvcnRjdXRcclxuICAgICAgICBpZihhcmd1bWVudHNMZW5ndGggPT09IDEpe1xyXG4gICAgICAgICAgICByZXR1cm4gZWxlbWVudDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKHR5cGVvZiBzZXR0aW5ncyAhPT0gJ29iamVjdCcgfHwgaXNOb2RlKHNldHRpbmdzKSB8fCBpc0FycmF5KHNldHRpbmdzKSkge1xyXG4gICAgICAgICAgICAtLWNoaWxkSW5kZXg7XHJcbiAgICAgICAgICAgIHNldHRpbmdzID0gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHNob3J0Y3V0IGlmIHRoZXJlIGlzIG9ubHkgb25lIGNoaWxkIHRoYXQgaXMgYSBzdHJpbmdcclxuICAgICAgICBpZigoYXJndW1lbnRzTGVuZ3RoIC0gY2hpbGRJbmRleCkgPT09IDEgJiYgdHlwZW9mIGFyZ3NbY2hpbGRJbmRleF0gPT09ICdzdHJpbmcnICYmIGVsZW1lbnQudGV4dENvbnRlbnQgIT09IHVuZGVmaW5lZCl7XHJcbiAgICAgICAgICAgIGVsZW1lbnQudGV4dENvbnRlbnQgPSBhcmdzW2NoaWxkSW5kZXhdO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICBmb3IoOyBjaGlsZEluZGV4IDwgYXJndW1lbnRzTGVuZ3RoOyArK2NoaWxkSW5kZXgpe1xyXG4gICAgICAgICAgICAgICAgY2hpbGQgPSBhcmdzW2NoaWxkSW5kZXhdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKGNoaWxkID09IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChpc0FycmF5KGNoaWxkKSkge1xyXG4gICAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBjaGlsZC5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGFwcGVuZENoaWxkKGVsZW1lbnQsIGNoaWxkW2ldKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgYXBwZW5kQ2hpbGQoZWxlbWVudCwgY2hpbGQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IodmFyIGtleSBpbiBzZXR0aW5ncyl7XHJcbiAgICAgICAgICAgIGlmKCFhdHRyaWJ1dGVNYXBba2V5XSl7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShrZXksIHNldHRpbmdzW2tleV0pO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHZhciBhdHRyID0gY3JlbC5hdHRyTWFwW2tleV07XHJcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgYXR0ciA9PT0gJ2Z1bmN0aW9uJyl7XHJcbiAgICAgICAgICAgICAgICAgICAgYXR0cihlbGVtZW50LCBzZXR0aW5nc1trZXldKTtcclxuICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKGF0dHIsIHNldHRpbmdzW2tleV0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZWxlbWVudDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBVc2VkIGZvciBtYXBwaW5nIG9uZSBraW5kIG9mIGF0dHJpYnV0ZSB0byB0aGUgc3VwcG9ydGVkIHZlcnNpb24gb2YgdGhhdCBpbiBiYWQgYnJvd3NlcnMuXHJcbiAgICAvLyBTdHJpbmcgcmVmZXJlbmNlZCBzbyB0aGF0IGNvbXBpbGVycyBtYWludGFpbiB0aGUgcHJvcGVydHkgbmFtZS5cclxuICAgIGNyZWxbJ2F0dHJNYXAnXSA9IHt9O1xyXG5cclxuICAgIC8vIFN0cmluZyByZWZlcmVuY2VkIHNvIHRoYXQgY29tcGlsZXJzIG1haW50YWluIHRoZSBwcm9wZXJ0eSBuYW1lLlxyXG4gICAgY3JlbFtcImlzTm9kZVwiXSA9IGlzTm9kZTtcclxuXHJcbiAgICByZXR1cm4gY3JlbDtcclxufSkpO1xyXG4iLCJ2YXIgY3JlbCA9IHJlcXVpcmUoJ2NyZWwnKTtcbnZhciBxc2EgPSByZXF1aXJlKCdjb2cvcXNhJyk7XG52YXIgbG9hZGVyID0gcmVxdWlyZSgnY29nL2xvYWRlcicpO1xudmFyIG1haW4gPSBxc2EoJy5tYWluJylbMF07XG52YXIgcmVTdGF0dXNPSyA9IC9eKDJ8MylcXGR7Mn0kLztcbnZhciByZVN0cmlwRXh0ID0gL14oLiopXFwuanMkLztcbnZhciBiYXNlU2NyaXB0cyA9IFtcbiAgJy8vcnRjLmlvL3N3aXRjaGJvYXJkL3J0Yy5pby9wcmltdXMuanMnXG5dO1xuXG5mdW5jdGlvbiBjcmVhdGVDb2RlRnJhbWUoc2FtcGxlLCBhbmNob3IsIGNhbGxiYWNrKSB7XG4gIHZhciBmcmFtZUNvbnRhaW5lcjtcbiAgdmFyIGZyYW1lO1xuICB2YXIgY2xvc2VCYXI7XG4gIHZhciBjb250ZW50O1xuICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gIHZhciBzYW1wbGVIVE1MID0gJzxodG1sPjxib2R5PjwvYm9keT48L2h0bWw+JztcblxuICBmcmFtZUNvbnRhaW5lciA9IGNyZWwoJ2RpdicsIHsgY2xhc3M6ICdjb2RlZnJhbWUnIH0sXG4gICAgY2xvc2VCYXIgPSBjcmVsKCdkaXYnLCB7IGNsYXNzOiAnY2xvc2VyJyB9LCAnY2xvc2Ugc2FtcGxlJyksXG4gICAgZnJhbWUgPSBjcmVsKCdpZnJhbWUnKVxuICApO1xuXG4gIC8vIGluc2VydCB0aGUgY29kZSBmcmFtZVxuICBkb2N1bWVudC5ib2R5Lmluc2VydEJlZm9yZShmcmFtZUNvbnRhaW5lciwgbWFpbik7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgY29udGVudFxuICBjb250ZW50ID0gZnJhbWUuY29udGVudERvY3VtZW50IHx8IGZyYW1lLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQ7XG5cbiAgLy8gY2hlY2sgaWYgd2UgaGF2ZSBjdXN0b20gaHRtbCBmb3IgdGhpcyBkZW1vXG4gIHhoci5vcGVuKCdHRVQnLCAnY29kZS8nICsgc2FtcGxlICsgJy5odG1sJyk7XG4gIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBpZiB3ZSBnb3QgaXQsIHRoZW4gdXNlIHRoYXQgYXMgdGhlIGRvY3VtZW50XG4gICAgaWYgKHRoaXMuc3RhdHVzID09PSAyMDApIHtcbiAgICAgIHNhbXBsZUhUTUwgPSB0aGlzLnJlc3BvbnNlO1xuICAgIH1cblxuICAgIC8vIHdyaXRlIHRoZSBzYW1wbGUgaHRtbCBpbnRvIHRoZSBmcmFtZVxuICAgIGNvbnRlbnQub3BlbigpO1xuICAgIGNvbnRlbnQud3JpdGUoc2FtcGxlSFRNTCk7XG4gICAgY29udGVudC5jbG9zZSgpO1xuXG4gICAgLy8gdHJpZ2dlciB0aGUgY2FsbGJhY2tcbiAgICBjYWxsYmFjayhmcmFtZUNvbnRhaW5lciwgY29udGVudCk7XG4gIH07XG5cbiAgeGhyLnNlbmQoKTtcbn1cblxuZnVuY3Rpb24gaW5pdFNhbXBsZShhbmNob3IpIHtcblxuICBmdW5jdGlvbiBjbG9zZUNvZGUoKSB7XG4gICAgdmFyIGZyYW1lID0gYW5jaG9yLmNvZGVmcmFtZTtcblxuICAgIC8vIGlmIHRoZSBhbmNob3IgYWxyZWFkeSBoYXMgYSBjb2RlZnJhbWUgYXNzb2NpYXRlZCB3aXRoIGl0IGRyb3BpdFxuICAgIGlmIChmcmFtZSkge1xuICAgICAgZnJhbWUuY2xhc3NOYW1lID0gJ2NvZGVmcmFtZSc7XG4gICAgICBhbmNob3IuY29kZWZyYW1lID0gbnVsbDtcblxuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgZnJhbWUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChmcmFtZSk7XG4gICAgICB9LCA1MDApO1xuICAgIH1cbiAgfVxuXG4gIGFuY2hvci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGV2dCkge1xuICAgIHZhciBzYW1wbGUgPSAoYW5jaG9yLmRhdGFzZXQuc2FtcGxlIHx8ICcnKS5yZXBsYWNlKHJlU3RyaXBFeHQsICckMScpO1xuICAgIHZhciBmcmFtZTtcblxuICAgIC8vIGRvbid0IGRvIHRoZSBkZWZhdWx0IGNsaWNrIGFuY2hvciB0aGluZy4uLlxuICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgLy8gY3JlYXRlIHRoZSBjb2RlIGZyYW1lXG4gICAgY3JlYXRlQ29kZUZyYW1lKHNhbXBsZSwgYW5jaG9yLCBmdW5jdGlvbihmcmFtZSwgZG9jKSB7XG4gICAgICB2YXIgc3R5bGUgPSBkb2MuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICAgIHN0eWxlLmlubmVySFRNTCA9IFtcbiAgICAgICAgJ2h0bWwgeyBvdmVyZmxvdzogaGlkZGVuOyB9JyxcbiAgICAgICAgJ2JvZHkgeyB3aWR0aDogODIwcHg7IG1hcmdpbjogNXB4IGF1dG8gMDsgfScsXG4gICAgICAgICdib2R5IHZpZGVvIHsgd2lkdGg6IDEwMCUgfScsXG4gICAgICAgICdib2R5IGNhbnZhcyB7IHdpZHRoOiAxMDAlIH0nXG4gICAgICBdLmpvaW4oJ1xcbicpO1xuXG4gICAgICBkb2MuaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG5cbiAgICAgIC8vIGxvYWQgdGhlIHJlcXVpcmVkIHNjcmlwdHNcbiAgICAgIGxvYWRlcihiYXNlU2NyaXB0cywgeyB0YXJnZXQ6IGRvYy5ib2R5IH0sIGZ1bmN0aW9uKCkge1xuICAgICAgICBsb2FkZXIoJ2pzL3NhbXBsZXMvJyArIHNhbXBsZSArICcuanMnLCB7IHRhcmdldDogZG9jLmJvZHkgfSk7XG5cbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICBmcmFtZS5jbGFzc05hbWUgKz0gJyBhY3RpdmUnO1xuICAgICAgICB9LCAxMDApO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIGFzc29jaWF0ZSB0aGUgY29kZSBmcmFtZSB3aXRoIHRoZSBmcmFtZVxuICAgICAgYW5jaG9yLmNvZGVmcmFtZSA9IGZyYW1lO1xuICAgICAgcXNhKCcuY2xvc2VyJywgZnJhbWUpWzBdLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2xvc2VDb2RlKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbnFzYSgnLnNhbXBsZScpLmZvckVhY2goaW5pdFNhbXBsZSk7XG4iXX0=
