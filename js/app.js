;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

// if the module has no dependencies, the above pattern can be simplified to
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
    var isNode = typeof Node === 'object'
        ? function (object) { return object instanceof Node }
        : function (object) {
            return object
                && typeof object === 'object'
                && typeof object.nodeType === 'number'
                && typeof object.nodeName === 'string';
        };

    function crel(){
        var document = window.document,
            args = arguments, //Note: assigned to a variable to assist compilers. Saves about 40 bytes in closure compiler. Has negligable effect on performance.
            element = document.createElement(args[0]),
            child,
            settings = args[1],
            childIndex = 2,
            argumentsLength = args.length,
            attributeMap = crel.attrMap;

        // shortcut
        if(argumentsLength === 1){
            return element;
        }

        if(typeof settings !== 'object' || isNode(settings)) {
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
                
                if(!isNode(child)){
                    child = document.createTextNode(child);
                }
                
                element.appendChild(child);
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
  'http://sig.rtc.io:50000/rtc.io/primus.js'
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMuaW8vbm9kZV9tb2R1bGVzL2NvZy9sb2FkZXIuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMuaW8vbm9kZV9tb2R1bGVzL2NvZy9xc2EuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMuaW8vbm9kZV9tb2R1bGVzL2NyZWwvY3JlbC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy5pby9zcmMvYXBwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiLyoganNoaW50IG5vZGU6IHRydWUgKi9cbi8qIGdsb2JhbCBkb2N1bWVudDogZmFsc2UgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gICMjIGNvZy9sb2FkZXJcblxuICBgYGBqc1xuICB2YXIgbG9hZGVyID0gcmVxdWlyZSgnY29nL2xvYWRlcicpO1xuICBgYGBcblxuICAjIyMgbG9hZGVyKHVybHMsIG9wdHM/LCBjYWxsYmFjaylcblxuICBUaGlzIGlzIGEgc2ltcGxlIHNjcmlwdCBsb2FkZXIgdGhhdCB3aWxsIGxvYWQgdGhlIHVybHMgc3BlY2lmaWVkXG4gIGFuZCB0cmlnZ2VyIHRoZSBjYWxsYmFjayBvbmNlIGFsbCB0aG9zZSBzY3JpcHRzIGhhdmUgYmVlbiBsb2FkZWQgKG9yXG4gIGxvYWRpbmcgaGFzIGZhaWxlZCBpbiBvbmUgaW5zdGFuY2UpLlxuXG4qKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih1cmxzLCBvcHRzLCBjYWxsYmFjaykge1xuICB2YXIgcGVuZGluZztcbiAgdmFyIHRhcmdldDtcblxuICBmdW5jdGlvbiBoYW5kbGVMb2FkZWQoZXZ0KSB7XG4gICAgLy8gZGVjcmVtZW50IHRoZSBwZW5kaW5nIGNvdW50XG4gICAgcGVuZGluZyAtPSAxO1xuXG4gICAgLy8gaWYgd2UgaGF2ZSBmaW5pc2hlZCwgdHJpZ2dlciB0aGUgY2FsbGJhY2tcbiAgICBpZiAocGVuZGluZyA8PSAwICYmIHR5cGVvZiBjYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAvLyBUT0RPOiBkZXRlY3QgYW5kIHNlbmQgdGhyb3VnaCBlcnJvcnNcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgfSBcbiAgfVxuXG4gIC8vIGVuc3VyZSB3ZSBoYXZlIGFuIGFycmF5IGZvciBzY3JpcHRzXG4gIHVybHMgPSBbXS5jb25jYXQodXJscyB8fCBbXSk7XG5cbiAgLy8gY2hlY2sgdGhlIG5vIG9wdHMgY2FzZVxuICBpZiAodHlwZW9mIG9wdHMgPT0gJ2Z1bmN0aW9uJykge1xuICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICBvcHRzID0ge307XG4gIH1cblxuICAvLyBzZXQgaG93IG1hbnkgdXJscyB3ZSBhcmUgd2FpdGluZyBmb3JcbiAgcGVuZGluZyA9IHVybHMubGVuZ3RoO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIHRhcmdldCAoZGVmYXVsdCB0byBkb2N1bWVudC5ib2R5KVxuICB0YXJnZXQgPSAob3B0cyB8fCB7fSkudGFyZ2V0IHx8IGRvY3VtZW50LmJvZHk7XG5cbiAgLy8gY3JlYXRlIHRoZSBzY3JpcHQgZWxlbWVudHNcbiAgdXJscy5tYXAoZnVuY3Rpb24odXJsKSB7XG4gICAgdmFyIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpO1xuICAgIHNjcmlwdC5zcmMgPSB1cmw7XG4gICAgc2NyaXB0LmFzeW5jID0gdHJ1ZTtcbiAgICBzY3JpcHQuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGhhbmRsZUxvYWRlZCk7XG5cbiAgICByZXR1cm4gc2NyaXB0O1xuICB9KVxuICAvLyBhZGQgdGhlbSB0byB0aGUgdGFyZ2V0XG4gIC5mb3JFYWNoKHRhcmdldC5hcHBlbmRDaGlsZC5iaW5kKHRhcmdldCkpO1xufTsiLCIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIGRvY3VtZW50OiBmYWxzZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2xhc3NTZWxlY3RvclJFID0gL15cXC4oW1xcd1xcLV0rKSQvO1xudmFyIGlkU2VsZWN0b3JSRSA9IC9eIyhbXFx3XFwtXSspJC87XG52YXIgdGFnU2VsZWN0b3JSRSA9IC9eW1xcd1xcLV0rJC87XG5cbi8qKlxuICAjIyBjb2cvcXNhXG5cbiAgYGBganNcbiAgdmFyIHFzYSA9IHJlcXVpcmUoJ2NvZy9xc2EnKTtcbiAgYGBgXG5cbiAgIyMjIHFzYShzZWxlY3Rvciwgc2NvcGU/KVxuXG4gIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBnZXQgdGhlIHJlc3VsdHMgb2YgdGhlIHF1ZXJ5U2VsZWN0b3JBbGwgb3V0cHV0IFxuICBpbiB0aGUgZmFzdGVzdCBwb3NzaWJsZSB3YXkuICBUaGlzIGNvZGUgaXMgdmVyeSBtdWNoIGJhc2VkIG9uIHRoZVxuICBpbXBsZW1lbnRhdGlvbiBpblxuICBbemVwdG9dKGh0dHBzOi8vZ2l0aHViLmNvbS9tYWRyb2JieS96ZXB0by9ibG9iL21hc3Rlci9zcmMvemVwdG8uanMjTDEwNCksXG4gIGJ1dCBwZXJoYXBzIG5vdCBxdWl0ZSBhcyB0ZXJzZS5cbioqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzZWxlY3Rvciwgc2NvcGUpIHtcbiAgdmFyIGlkU2VhcmNoO1xuXG4gIC8vIGRlZmF1bHQgdGhlIGVsZW1lbnQgdG8gdGhlIGRvY3VtZW50XG4gIHNjb3BlID0gc2NvcGUgfHwgZG9jdW1lbnQ7XG5cbiAgLy8gZGV0ZXJtaW5lIHdoZXRoZXIgd2UgYXJlIGRvaW5nIGFuIGlkIHNlYXJjaCBvciBub3RcbiAgaWRTZWFyY2ggPSBzY29wZSA9PT0gZG9jdW1lbnQgJiYgaWRTZWxlY3RvclJFLnRlc3Qoc2VsZWN0b3IpO1xuXG4gIC8vIHBlcmZvcm0gdGhlIHNlYXJjaFxuICByZXR1cm4gaWRTZWFyY2ggP1xuICAgIC8vIHdlIGFyZSBkb2luZyBhbiBpZCBzZWFyY2gsIHJldHVybiB0aGUgZWxlbWVudCBzZWFyY2ggaW4gYW4gYXJyYXlcbiAgICBbc2NvcGUuZ2V0RWxlbWVudEJ5SWQoUmVnRXhwLiQxKV0gOlxuICAgIC8vIG5vdCBhbiBpZCBzZWFyY2gsIGNhbGwgdGhlIGFwcHJvcHJpYXRlIHNlbGVjdG9yXG4gICAgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoXG4gICAgICAgIGNsYXNzU2VsZWN0b3JSRS50ZXN0KHNlbGVjdG9yKSA/XG4gICAgICAgICAgc2NvcGUuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShSZWdFeHAuJDEpIDpcbiAgICAgICAgICAgIHRhZ1NlbGVjdG9yUkUudGVzdChzZWxlY3RvcikgP1xuICAgICAgICAgICAgICBzY29wZS5nZXRFbGVtZW50c0J5VGFnTmFtZShzZWxlY3RvcikgOlxuICAgICAgICAgICAgICBzY29wZS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKVxuICAgICk7XG59OyIsIi8vQ29weXJpZ2h0IChDKSAyMDEyIEtvcnkgTnVublxyXG5cclxuLy9QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxyXG5cclxuLy9UaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cclxuXHJcbi8vVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXHJcblxyXG4vKlxyXG5cclxuICAgIFRoaXMgY29kZSBpcyBub3QgZm9ybWF0dGVkIGZvciByZWFkYWJpbGl0eSwgYnV0IHJhdGhlciBydW4tc3BlZWQgYW5kIHRvIGFzc2lzdCBjb21waWxlcnMuXHJcbiAgICBcclxuICAgIEhvd2V2ZXIsIHRoZSBjb2RlJ3MgaW50ZW50aW9uIHNob3VsZCBiZSB0cmFuc3BhcmVudC5cclxuICAgIFxyXG4gICAgKioqIElFIFNVUFBPUlQgKioqXHJcbiAgICBcclxuICAgIElmIHlvdSByZXF1aXJlIHRoaXMgbGlicmFyeSB0byB3b3JrIGluIElFNywgYWRkIHRoZSBmb2xsb3dpbmcgYWZ0ZXIgZGVjbGFyaW5nIGNyZWwuXHJcbiAgICBcclxuICAgIHZhciB0ZXN0RGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JyksXHJcbiAgICAgICAgdGVzdExhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGFiZWwnKTtcclxuXHJcbiAgICB0ZXN0RGl2LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnYScpOyAgICBcclxuICAgIHRlc3REaXZbJ2NsYXNzTmFtZSddICE9PSAnYScgPyBjcmVsLmF0dHJNYXBbJ2NsYXNzJ10gPSAnY2xhc3NOYW1lJzp1bmRlZmluZWQ7XHJcbiAgICB0ZXN0RGl2LnNldEF0dHJpYnV0ZSgnbmFtZScsJ2EnKTtcclxuICAgIHRlc3REaXZbJ25hbWUnXSAhPT0gJ2EnID8gY3JlbC5hdHRyTWFwWyduYW1lJ10gPSBmdW5jdGlvbihlbGVtZW50LCB2YWx1ZSl7XHJcbiAgICAgICAgZWxlbWVudC5pZCA9IHZhbHVlO1xyXG4gICAgfTp1bmRlZmluZWQ7XHJcbiAgICBcclxuXHJcbiAgICB0ZXN0TGFiZWwuc2V0QXR0cmlidXRlKCdmb3InLCAnYScpO1xyXG4gICAgdGVzdExhYmVsWydodG1sRm9yJ10gIT09ICdhJyA/IGNyZWwuYXR0ck1hcFsnZm9yJ10gPSAnaHRtbEZvcic6dW5kZWZpbmVkO1xyXG4gICAgXHJcbiAgICBcclxuXHJcbiovXHJcblxyXG4vLyBpZiB0aGUgbW9kdWxlIGhhcyBubyBkZXBlbmRlbmNpZXMsIHRoZSBhYm92ZSBwYXR0ZXJuIGNhbiBiZSBzaW1wbGlmaWVkIHRvXHJcbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xyXG4gICAgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xyXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgICAgICBkZWZpbmUoZmFjdG9yeSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJvb3QuY3JlbCA9IGZhY3RvcnkoKTtcclxuICB9XHJcbn0odGhpcywgZnVuY3Rpb24gKCkge1xyXG4gICAgLy8gYmFzZWQgb24gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8zODQyODYvamF2YXNjcmlwdC1pc2RvbS1ob3ctZG8teW91LWNoZWNrLWlmLWEtamF2YXNjcmlwdC1vYmplY3QtaXMtYS1kb20tb2JqZWN0XHJcbiAgICB2YXIgaXNOb2RlID0gdHlwZW9mIE5vZGUgPT09ICdvYmplY3QnXHJcbiAgICAgICAgPyBmdW5jdGlvbiAob2JqZWN0KSB7IHJldHVybiBvYmplY3QgaW5zdGFuY2VvZiBOb2RlIH1cclxuICAgICAgICA6IGZ1bmN0aW9uIChvYmplY3QpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdFxyXG4gICAgICAgICAgICAgICAgJiYgdHlwZW9mIG9iamVjdCA9PT0gJ29iamVjdCdcclxuICAgICAgICAgICAgICAgICYmIHR5cGVvZiBvYmplY3Qubm9kZVR5cGUgPT09ICdudW1iZXInXHJcbiAgICAgICAgICAgICAgICAmJiB0eXBlb2Ygb2JqZWN0Lm5vZGVOYW1lID09PSAnc3RyaW5nJztcclxuICAgICAgICB9O1xyXG5cclxuICAgIGZ1bmN0aW9uIGNyZWwoKXtcclxuICAgICAgICB2YXIgZG9jdW1lbnQgPSB3aW5kb3cuZG9jdW1lbnQsXHJcbiAgICAgICAgICAgIGFyZ3MgPSBhcmd1bWVudHMsIC8vTm90ZTogYXNzaWduZWQgdG8gYSB2YXJpYWJsZSB0byBhc3Npc3QgY29tcGlsZXJzLiBTYXZlcyBhYm91dCA0MCBieXRlcyBpbiBjbG9zdXJlIGNvbXBpbGVyLiBIYXMgbmVnbGlnYWJsZSBlZmZlY3Qgb24gcGVyZm9ybWFuY2UuXHJcbiAgICAgICAgICAgIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGFyZ3NbMF0pLFxyXG4gICAgICAgICAgICBjaGlsZCxcclxuICAgICAgICAgICAgc2V0dGluZ3MgPSBhcmdzWzFdLFxyXG4gICAgICAgICAgICBjaGlsZEluZGV4ID0gMixcclxuICAgICAgICAgICAgYXJndW1lbnRzTGVuZ3RoID0gYXJncy5sZW5ndGgsXHJcbiAgICAgICAgICAgIGF0dHJpYnV0ZU1hcCA9IGNyZWwuYXR0ck1hcDtcclxuXHJcbiAgICAgICAgLy8gc2hvcnRjdXRcclxuICAgICAgICBpZihhcmd1bWVudHNMZW5ndGggPT09IDEpe1xyXG4gICAgICAgICAgICByZXR1cm4gZWxlbWVudDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKHR5cGVvZiBzZXR0aW5ncyAhPT0gJ29iamVjdCcgfHwgaXNOb2RlKHNldHRpbmdzKSkge1xyXG4gICAgICAgICAgICAtLWNoaWxkSW5kZXg7XHJcbiAgICAgICAgICAgIHNldHRpbmdzID0gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHNob3J0Y3V0IGlmIHRoZXJlIGlzIG9ubHkgb25lIGNoaWxkIHRoYXQgaXMgYSBzdHJpbmcgICAgXHJcbiAgICAgICAgaWYoKGFyZ3VtZW50c0xlbmd0aCAtIGNoaWxkSW5kZXgpID09PSAxICYmIHR5cGVvZiBhcmdzW2NoaWxkSW5kZXhdID09PSAnc3RyaW5nJyAmJiBlbGVtZW50LnRleHRDb250ZW50ICE9PSB1bmRlZmluZWQpe1xyXG4gICAgICAgICAgICBlbGVtZW50LnRleHRDb250ZW50ID0gYXJnc1tjaGlsZEluZGV4XTtcclxuICAgICAgICB9ZWxzZXsgICAgXHJcbiAgICAgICAgICAgIGZvcig7IGNoaWxkSW5kZXggPCBhcmd1bWVudHNMZW5ndGg7ICsrY2hpbGRJbmRleCl7XHJcbiAgICAgICAgICAgICAgICBjaGlsZCA9IGFyZ3NbY2hpbGRJbmRleF07XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmKGNoaWxkID09IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZighaXNOb2RlKGNoaWxkKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hpbGQgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjaGlsZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQuYXBwZW5kQ2hpbGQoY2hpbGQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGZvcih2YXIga2V5IGluIHNldHRpbmdzKXtcclxuICAgICAgICAgICAgaWYoIWF0dHJpYnV0ZU1hcFtrZXldKXtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKGtleSwgc2V0dGluZ3Nba2V5XSk7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgdmFyIGF0dHIgPSBjcmVsLmF0dHJNYXBba2V5XTtcclxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBhdHRyID09PSAnZnVuY3Rpb24nKXsgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGF0dHIoZWxlbWVudCwgc2V0dGluZ3Nba2V5XSk7ICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB9ZWxzZXsgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShhdHRyLCBzZXR0aW5nc1trZXldKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4gZWxlbWVudDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gVXNlZCBmb3IgbWFwcGluZyBvbmUga2luZCBvZiBhdHRyaWJ1dGUgdG8gdGhlIHN1cHBvcnRlZCB2ZXJzaW9uIG9mIHRoYXQgaW4gYmFkIGJyb3dzZXJzLlxyXG4gICAgLy8gU3RyaW5nIHJlZmVyZW5jZWQgc28gdGhhdCBjb21waWxlcnMgbWFpbnRhaW4gdGhlIHByb3BlcnR5IG5hbWUuXHJcbiAgICBjcmVsWydhdHRyTWFwJ10gPSB7fTtcclxuICAgIFxyXG4gICAgLy8gU3RyaW5nIHJlZmVyZW5jZWQgc28gdGhhdCBjb21waWxlcnMgbWFpbnRhaW4gdGhlIHByb3BlcnR5IG5hbWUuXHJcbiAgICBjcmVsW1wiaXNOb2RlXCJdID0gaXNOb2RlO1xyXG4gICAgXHJcbiAgICByZXR1cm4gY3JlbDtcclxufSkpO1xyXG4iLCJ2YXIgY3JlbCA9IHJlcXVpcmUoJ2NyZWwnKTtcbnZhciBxc2EgPSByZXF1aXJlKCdjb2cvcXNhJyk7XG52YXIgbG9hZGVyID0gcmVxdWlyZSgnY29nL2xvYWRlcicpO1xudmFyIG1haW4gPSBxc2EoJy5tYWluJylbMF07XG52YXIgcmVTdGF0dXNPSyA9IC9eKDJ8MylcXGR7Mn0kLztcbnZhciByZVN0cmlwRXh0ID0gL14oLiopXFwuanMkLztcbnZhciBiYXNlU2NyaXB0cyA9IFtcbiAgJ2h0dHA6Ly9zaWcucnRjLmlvOjUwMDAwL3J0Yy5pby9wcmltdXMuanMnXG5dO1xuXG5mdW5jdGlvbiBjcmVhdGVDb2RlRnJhbWUoc2FtcGxlLCBhbmNob3IsIGNhbGxiYWNrKSB7XG4gIHZhciBmcmFtZUNvbnRhaW5lcjtcbiAgdmFyIGZyYW1lO1xuICB2YXIgY2xvc2VCYXI7XG4gIHZhciBjb250ZW50O1xuICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gIHZhciBzYW1wbGVIVE1MID0gJzxodG1sPjxib2R5PjwvYm9keT48L2h0bWw+JztcblxuICBmcmFtZUNvbnRhaW5lciA9IGNyZWwoJ2RpdicsIHsgY2xhc3M6ICdjb2RlZnJhbWUnIH0sXG4gICAgY2xvc2VCYXIgPSBjcmVsKCdkaXYnLCB7IGNsYXNzOiAnY2xvc2VyJyB9LCAnY2xvc2Ugc2FtcGxlJyksXG4gICAgZnJhbWUgPSBjcmVsKCdpZnJhbWUnKVxuICApO1xuXG4gIC8vIGluc2VydCB0aGUgY29kZSBmcmFtZVxuICBkb2N1bWVudC5ib2R5Lmluc2VydEJlZm9yZShmcmFtZUNvbnRhaW5lciwgbWFpbik7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgY29udGVudFxuICBjb250ZW50ID0gZnJhbWUuY29udGVudERvY3VtZW50IHx8IGZyYW1lLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQ7XG5cbiAgLy8gY2hlY2sgaWYgd2UgaGF2ZSBjdXN0b20gaHRtbCBmb3IgdGhpcyBkZW1vXG4gIHhoci5vcGVuKCdHRVQnLCAnY29kZS8nICsgc2FtcGxlICsgJy5odG1sJyk7XG4gIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBpZiB3ZSBnb3QgaXQsIHRoZW4gdXNlIHRoYXQgYXMgdGhlIGRvY3VtZW50XG4gICAgaWYgKHRoaXMuc3RhdHVzID09PSAyMDApIHtcbiAgICAgIHNhbXBsZUhUTUwgPSB0aGlzLnJlc3BvbnNlO1xuICAgIH1cblxuICAgIC8vIHdyaXRlIHRoZSBzYW1wbGUgaHRtbCBpbnRvIHRoZSBmcmFtZVxuICAgIGNvbnRlbnQub3BlbigpO1xuICAgIGNvbnRlbnQud3JpdGUoc2FtcGxlSFRNTCk7XG4gICAgY29udGVudC5jbG9zZSgpO1xuXG4gICAgLy8gdHJpZ2dlciB0aGUgY2FsbGJhY2tcbiAgICBjYWxsYmFjayhmcmFtZUNvbnRhaW5lciwgY29udGVudCk7XG4gIH07XG5cbiAgeGhyLnNlbmQoKTtcbn1cblxuZnVuY3Rpb24gaW5pdFNhbXBsZShhbmNob3IpIHtcblxuICBmdW5jdGlvbiBjbG9zZUNvZGUoKSB7XG4gICAgdmFyIGZyYW1lID0gYW5jaG9yLmNvZGVmcmFtZTtcblxuICAgIC8vIGlmIHRoZSBhbmNob3IgYWxyZWFkeSBoYXMgYSBjb2RlZnJhbWUgYXNzb2NpYXRlZCB3aXRoIGl0IGRyb3BpdFxuICAgIGlmIChmcmFtZSkge1xuICAgICAgZnJhbWUuY2xhc3NOYW1lID0gJ2NvZGVmcmFtZSc7XG4gICAgICBhbmNob3IuY29kZWZyYW1lID0gbnVsbDtcblxuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgZnJhbWUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChmcmFtZSk7XG4gICAgICB9LCA1MDApO1xuICAgIH1cbiAgfVxuXG4gIGFuY2hvci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGV2dCkge1xuICAgIHZhciBzYW1wbGUgPSAoYW5jaG9yLmRhdGFzZXQuc2FtcGxlIHx8ICcnKS5yZXBsYWNlKHJlU3RyaXBFeHQsICckMScpO1xuICAgIHZhciBmcmFtZTtcblxuICAgIC8vIGRvbid0IGRvIHRoZSBkZWZhdWx0IGNsaWNrIGFuY2hvciB0aGluZy4uLlxuICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgLy8gY3JlYXRlIHRoZSBjb2RlIGZyYW1lXG4gICAgY3JlYXRlQ29kZUZyYW1lKHNhbXBsZSwgYW5jaG9yLCBmdW5jdGlvbihmcmFtZSwgZG9jKSB7XG4gICAgICB2YXIgc3R5bGUgPSBkb2MuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICAgIHN0eWxlLmlubmVySFRNTCA9IFtcbiAgICAgICAgJ2h0bWwgeyBvdmVyZmxvdzogaGlkZGVuOyB9JyxcbiAgICAgICAgJ2JvZHkgeyB3aWR0aDogODIwcHg7IG1hcmdpbjogNXB4IGF1dG8gMDsgfScsXG4gICAgICAgICdib2R5IHZpZGVvIHsgd2lkdGg6IDEwMCUgfScsXG4gICAgICAgICdib2R5IGNhbnZhcyB7IHdpZHRoOiAxMDAlIH0nXG4gICAgICBdLmpvaW4oJ1xcbicpO1xuXG4gICAgICBkb2MuaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7XG5cbiAgICAgIC8vIGxvYWQgdGhlIHJlcXVpcmVkIHNjcmlwdHNcbiAgICAgIGxvYWRlcihiYXNlU2NyaXB0cywgeyB0YXJnZXQ6IGRvYy5ib2R5IH0sIGZ1bmN0aW9uKCkge1xuICAgICAgICBsb2FkZXIoJ2pzL3NhbXBsZXMvJyArIHNhbXBsZSArICcuanMnLCB7IHRhcmdldDogZG9jLmJvZHkgfSk7XG5cbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICBmcmFtZS5jbGFzc05hbWUgKz0gJyBhY3RpdmUnO1xuICAgICAgICB9LCAxMDApO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIGFzc29jaWF0ZSB0aGUgY29kZSBmcmFtZSB3aXRoIHRoZSBmcmFtZVxuICAgICAgYW5jaG9yLmNvZGVmcmFtZSA9IGZyYW1lO1xuICAgICAgcXNhKCcuY2xvc2VyJywgZnJhbWUpWzBdLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2xvc2VDb2RlKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbnFzYSgnLnNhbXBsZScpLmZvckVhY2goaW5pdFNhbXBsZSk7XG4iXX0=
;