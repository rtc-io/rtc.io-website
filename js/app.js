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
  'https://rtcjs.io/socket.io/socket.io.js'
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
        'body { width: 820px; margin: 5px auto 0; }',
        'body video { width: 100% }'
      ].join('\n');
      
      doc.head.appendChild(style);

      // load the required scripts
      loader(baseScripts, function() {
        loader('js/samples/' + sample + '.js');

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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMuaW8vbm9kZV9tb2R1bGVzL2NvZy9sb2FkZXIuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMuaW8vbm9kZV9tb2R1bGVzL2NvZy9xc2EuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMuaW8vbm9kZV9tb2R1bGVzL2NyZWwvY3JlbC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy5pby9zcmMvYXBwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBqc2hpbnQgbm9kZTogdHJ1ZSAqL1xuLyogZ2xvYmFsIGRvY3VtZW50OiBmYWxzZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAgIyMgY29nL2xvYWRlclxuXG4gIGBgYGpzXG4gIHZhciBsb2FkZXIgPSByZXF1aXJlKCdjb2cvbG9hZGVyJyk7XG4gIGBgYFxuXG4gICMjIyBsb2FkZXIodXJscywgb3B0cz8sIGNhbGxiYWNrKVxuXG4gIFRoaXMgaXMgYSBzaW1wbGUgc2NyaXB0IGxvYWRlciB0aGF0IHdpbGwgbG9hZCB0aGUgdXJscyBzcGVjaWZpZWRcbiAgYW5kIHRyaWdnZXIgdGhlIGNhbGxiYWNrIG9uY2UgYWxsIHRob3NlIHNjcmlwdHMgaGF2ZSBiZWVuIGxvYWRlZCAob3JcbiAgbG9hZGluZyBoYXMgZmFpbGVkIGluIG9uZSBpbnN0YW5jZSkuXG5cbioqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHVybHMsIG9wdHMsIGNhbGxiYWNrKSB7XG4gIHZhciBwZW5kaW5nO1xuICB2YXIgdGFyZ2V0O1xuXG4gIGZ1bmN0aW9uIGhhbmRsZUxvYWRlZChldnQpIHtcbiAgICAvLyBkZWNyZW1lbnQgdGhlIHBlbmRpbmcgY291bnRcbiAgICBwZW5kaW5nIC09IDE7XG5cbiAgICAvLyBpZiB3ZSBoYXZlIGZpbmlzaGVkLCB0cmlnZ2VyIHRoZSBjYWxsYmFja1xuICAgIGlmIChwZW5kaW5nIDw9IDAgJiYgdHlwZW9mIGNhbGxiYWNrID09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIFRPRE86IGRldGVjdCBhbmQgc2VuZCB0aHJvdWdoIGVycm9yc1xuICAgICAgY2FsbGJhY2soKTtcbiAgICB9IFxuICB9XG5cbiAgLy8gZW5zdXJlIHdlIGhhdmUgYW4gYXJyYXkgZm9yIHNjcmlwdHNcbiAgdXJscyA9IFtdLmNvbmNhdCh1cmxzIHx8IFtdKTtcblxuICAvLyBjaGVjayB0aGUgbm8gb3B0cyBjYXNlXG4gIGlmICh0eXBlb2Ygb3B0cyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRzO1xuICAgIG9wdHMgPSB7fTtcbiAgfVxuXG4gIC8vIHNldCBob3cgbWFueSB1cmxzIHdlIGFyZSB3YWl0aW5nIGZvclxuICBwZW5kaW5nID0gdXJscy5sZW5ndGg7XG5cbiAgLy8gaW5pdGlhbGlzZSB0aGUgdGFyZ2V0IChkZWZhdWx0IHRvIGRvY3VtZW50LmJvZHkpXG4gIHRhcmdldCA9IChvcHRzIHx8IHt9KS50YXJnZXQgfHwgZG9jdW1lbnQuYm9keTtcblxuICAvLyBjcmVhdGUgdGhlIHNjcmlwdCBlbGVtZW50c1xuICB1cmxzLm1hcChmdW5jdGlvbih1cmwpIHtcbiAgICB2YXIgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG4gICAgc2NyaXB0LnNyYyA9IHVybDtcbiAgICBzY3JpcHQuYXN5bmMgPSB0cnVlO1xuICAgIHNjcmlwdC5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgaGFuZGxlTG9hZGVkKTtcblxuICAgIHJldHVybiBzY3JpcHQ7XG4gIH0pXG4gIC8vIGFkZCB0aGVtIHRvIHRoZSB0YXJnZXRcbiAgLmZvckVhY2godGFyZ2V0LmFwcGVuZENoaWxkLmJpbmQodGFyZ2V0KSk7XG59OyIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgZG9jdW1lbnQ6IGZhbHNlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBjbGFzc1NlbGVjdG9yUkUgPSAvXlxcLihbXFx3XFwtXSspJC87XG52YXIgaWRTZWxlY3RvclJFID0gL14jKFtcXHdcXC1dKykkLztcbnZhciB0YWdTZWxlY3RvclJFID0gL15bXFx3XFwtXSskLztcblxuLyoqXG4gICMjIGNvZy9xc2FcblxuICBgYGBqc1xuICB2YXIgcXNhID0gcmVxdWlyZSgnY29nL3FzYScpO1xuICBgYGBcblxuICAjIyMgcXNhKHNlbGVjdG9yLCBzY29wZT8pXG5cbiAgVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRvIGdldCB0aGUgcmVzdWx0cyBvZiB0aGUgcXVlcnlTZWxlY3RvckFsbCBvdXRwdXQgXG4gIGluIHRoZSBmYXN0ZXN0IHBvc3NpYmxlIHdheS4gIFRoaXMgY29kZSBpcyB2ZXJ5IG11Y2ggYmFzZWQgb24gdGhlXG4gIGltcGxlbWVudGF0aW9uIGluXG4gIFt6ZXB0b10oaHR0cHM6Ly9naXRodWIuY29tL21hZHJvYmJ5L3plcHRvL2Jsb2IvbWFzdGVyL3NyYy96ZXB0by5qcyNMMTA0KSxcbiAgYnV0IHBlcmhhcHMgbm90IHF1aXRlIGFzIHRlcnNlLlxuKiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNlbGVjdG9yLCBzY29wZSkge1xuICB2YXIgaWRTZWFyY2g7XG5cbiAgLy8gZGVmYXVsdCB0aGUgZWxlbWVudCB0byB0aGUgZG9jdW1lbnRcbiAgc2NvcGUgPSBzY29wZSB8fCBkb2N1bWVudDtcblxuICAvLyBkZXRlcm1pbmUgd2hldGhlciB3ZSBhcmUgZG9pbmcgYW4gaWQgc2VhcmNoIG9yIG5vdFxuICBpZFNlYXJjaCA9IHNjb3BlID09PSBkb2N1bWVudCAmJiBpZFNlbGVjdG9yUkUudGVzdChzZWxlY3Rvcik7XG5cbiAgLy8gcGVyZm9ybSB0aGUgc2VhcmNoXG4gIHJldHVybiBpZFNlYXJjaCA/XG4gICAgLy8gd2UgYXJlIGRvaW5nIGFuIGlkIHNlYXJjaCwgcmV0dXJuIHRoZSBlbGVtZW50IHNlYXJjaCBpbiBhbiBhcnJheVxuICAgIFtzY29wZS5nZXRFbGVtZW50QnlJZChSZWdFeHAuJDEpXSA6XG4gICAgLy8gbm90IGFuIGlkIHNlYXJjaCwgY2FsbCB0aGUgYXBwcm9wcmlhdGUgc2VsZWN0b3JcbiAgICBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChcbiAgICAgICAgY2xhc3NTZWxlY3RvclJFLnRlc3Qoc2VsZWN0b3IpID9cbiAgICAgICAgICBzY29wZS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFJlZ0V4cC4kMSkgOlxuICAgICAgICAgICAgdGFnU2VsZWN0b3JSRS50ZXN0KHNlbGVjdG9yKSA/XG4gICAgICAgICAgICAgIHNjb3BlLmdldEVsZW1lbnRzQnlUYWdOYW1lKHNlbGVjdG9yKSA6XG4gICAgICAgICAgICAgIHNjb3BlLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpXG4gICAgKTtcbn07IiwiLy9Db3B5cmlnaHQgKEMpIDIwMTIgS29yeSBOdW5uXHJcblxyXG4vL1Blcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XHJcblxyXG4vL1RoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxyXG5cclxuLy9USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cclxuXHJcbi8qXHJcblxyXG4gICAgVGhpcyBjb2RlIGlzIG5vdCBmb3JtYXR0ZWQgZm9yIHJlYWRhYmlsaXR5LCBidXQgcmF0aGVyIHJ1bi1zcGVlZCBhbmQgdG8gYXNzaXN0IGNvbXBpbGVycy5cclxuICAgIFxyXG4gICAgSG93ZXZlciwgdGhlIGNvZGUncyBpbnRlbnRpb24gc2hvdWxkIGJlIHRyYW5zcGFyZW50LlxyXG4gICAgXHJcbiAgICAqKiogSUUgU1VQUE9SVCAqKipcclxuICAgIFxyXG4gICAgSWYgeW91IHJlcXVpcmUgdGhpcyBsaWJyYXJ5IHRvIHdvcmsgaW4gSUU3LCBhZGQgdGhlIGZvbGxvd2luZyBhZnRlciBkZWNsYXJpbmcgY3JlbC5cclxuICAgIFxyXG4gICAgdmFyIHRlc3REaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSxcclxuICAgICAgICB0ZXN0TGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsYWJlbCcpO1xyXG5cclxuICAgIHRlc3REaXYuc2V0QXR0cmlidXRlKCdjbGFzcycsICdhJyk7ICAgIFxyXG4gICAgdGVzdERpdlsnY2xhc3NOYW1lJ10gIT09ICdhJyA/IGNyZWwuYXR0ck1hcFsnY2xhc3MnXSA9ICdjbGFzc05hbWUnOnVuZGVmaW5lZDtcclxuICAgIHRlc3REaXYuc2V0QXR0cmlidXRlKCduYW1lJywnYScpO1xyXG4gICAgdGVzdERpdlsnbmFtZSddICE9PSAnYScgPyBjcmVsLmF0dHJNYXBbJ25hbWUnXSA9IGZ1bmN0aW9uKGVsZW1lbnQsIHZhbHVlKXtcclxuICAgICAgICBlbGVtZW50LmlkID0gdmFsdWU7XHJcbiAgICB9OnVuZGVmaW5lZDtcclxuICAgIFxyXG5cclxuICAgIHRlc3RMYWJlbC5zZXRBdHRyaWJ1dGUoJ2ZvcicsICdhJyk7XHJcbiAgICB0ZXN0TGFiZWxbJ2h0bWxGb3InXSAhPT0gJ2EnID8gY3JlbC5hdHRyTWFwWydmb3InXSA9ICdodG1sRm9yJzp1bmRlZmluZWQ7XHJcbiAgICBcclxuICAgIFxyXG5cclxuKi9cclxuXHJcbi8vIGlmIHRoZSBtb2R1bGUgaGFzIG5vIGRlcGVuZGVuY2llcywgdGhlIGFib3ZlIHBhdHRlcm4gY2FuIGJlIHNpbXBsaWZpZWQgdG9cclxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XHJcbiAgICBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgICAgIGRlZmluZShmYWN0b3J5KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcm9vdC5jcmVsID0gZmFjdG9yeSgpO1xyXG4gIH1cclxufSh0aGlzLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAvLyBiYXNlZCBvbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzM4NDI4Ni9qYXZhc2NyaXB0LWlzZG9tLWhvdy1kby15b3UtY2hlY2staWYtYS1qYXZhc2NyaXB0LW9iamVjdC1pcy1hLWRvbS1vYmplY3RcclxuICAgIHZhciBpc05vZGUgPSB0eXBlb2YgTm9kZSA9PT0gJ29iamVjdCdcclxuICAgICAgICA/IGZ1bmN0aW9uIChvYmplY3QpIHsgcmV0dXJuIG9iamVjdCBpbnN0YW5jZW9mIE5vZGUgfVxyXG4gICAgICAgIDogZnVuY3Rpb24gKG9iamVjdCkge1xyXG4gICAgICAgICAgICByZXR1cm4gb2JqZWN0XHJcbiAgICAgICAgICAgICAgICAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0J1xyXG4gICAgICAgICAgICAgICAgJiYgdHlwZW9mIG9iamVjdC5ub2RlVHlwZSA9PT0gJ251bWJlcidcclxuICAgICAgICAgICAgICAgICYmIHR5cGVvZiBvYmplY3Qubm9kZU5hbWUgPT09ICdzdHJpbmcnO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgZnVuY3Rpb24gY3JlbCgpe1xyXG4gICAgICAgIHZhciBkb2N1bWVudCA9IHdpbmRvdy5kb2N1bWVudCxcclxuICAgICAgICAgICAgYXJncyA9IGFyZ3VtZW50cywgLy9Ob3RlOiBhc3NpZ25lZCB0byBhIHZhcmlhYmxlIHRvIGFzc2lzdCBjb21waWxlcnMuIFNhdmVzIGFib3V0IDQwIGJ5dGVzIGluIGNsb3N1cmUgY29tcGlsZXIuIEhhcyBuZWdsaWdhYmxlIGVmZmVjdCBvbiBwZXJmb3JtYW5jZS5cclxuICAgICAgICAgICAgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoYXJnc1swXSksXHJcbiAgICAgICAgICAgIGNoaWxkLFxyXG4gICAgICAgICAgICBzZXR0aW5ncyA9IGFyZ3NbMV0sXHJcbiAgICAgICAgICAgIGNoaWxkSW5kZXggPSAyLFxyXG4gICAgICAgICAgICBhcmd1bWVudHNMZW5ndGggPSBhcmdzLmxlbmd0aCxcclxuICAgICAgICAgICAgYXR0cmlidXRlTWFwID0gY3JlbC5hdHRyTWFwO1xyXG5cclxuICAgICAgICAvLyBzaG9ydGN1dFxyXG4gICAgICAgIGlmKGFyZ3VtZW50c0xlbmd0aCA9PT0gMSl7XHJcbiAgICAgICAgICAgIHJldHVybiBlbGVtZW50O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYodHlwZW9mIHNldHRpbmdzICE9PSAnb2JqZWN0JyB8fCBpc05vZGUoc2V0dGluZ3MpKSB7XHJcbiAgICAgICAgICAgIC0tY2hpbGRJbmRleDtcclxuICAgICAgICAgICAgc2V0dGluZ3MgPSBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gc2hvcnRjdXQgaWYgdGhlcmUgaXMgb25seSBvbmUgY2hpbGQgdGhhdCBpcyBhIHN0cmluZyAgICBcclxuICAgICAgICBpZigoYXJndW1lbnRzTGVuZ3RoIC0gY2hpbGRJbmRleCkgPT09IDEgJiYgdHlwZW9mIGFyZ3NbY2hpbGRJbmRleF0gPT09ICdzdHJpbmcnICYmIGVsZW1lbnQudGV4dENvbnRlbnQgIT09IHVuZGVmaW5lZCl7XHJcbiAgICAgICAgICAgIGVsZW1lbnQudGV4dENvbnRlbnQgPSBhcmdzW2NoaWxkSW5kZXhdO1xyXG4gICAgICAgIH1lbHNleyAgICBcclxuICAgICAgICAgICAgZm9yKDsgY2hpbGRJbmRleCA8IGFyZ3VtZW50c0xlbmd0aDsgKytjaGlsZEluZGV4KXtcclxuICAgICAgICAgICAgICAgIGNoaWxkID0gYXJnc1tjaGlsZEluZGV4XTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYoY2hpbGQgPT0gbnVsbCl7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmKCFpc05vZGUoY2hpbGQpKXtcclxuICAgICAgICAgICAgICAgICAgICBjaGlsZCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNoaWxkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5hcHBlbmRDaGlsZChjaGlsZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgZm9yKHZhciBrZXkgaW4gc2V0dGluZ3Mpe1xyXG4gICAgICAgICAgICBpZighYXR0cmlidXRlTWFwW2tleV0pe1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoa2V5LCBzZXR0aW5nc1trZXldKTtcclxuICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXR0ciA9IGNyZWwuYXR0ck1hcFtrZXldO1xyXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIGF0dHIgPT09ICdmdW5jdGlvbicpeyAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgYXR0cihlbGVtZW50LCBzZXR0aW5nc1trZXldKTsgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIH1lbHNleyAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKGF0dHIsIHNldHRpbmdzW2tleV0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBlbGVtZW50O1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBVc2VkIGZvciBtYXBwaW5nIG9uZSBraW5kIG9mIGF0dHJpYnV0ZSB0byB0aGUgc3VwcG9ydGVkIHZlcnNpb24gb2YgdGhhdCBpbiBiYWQgYnJvd3NlcnMuXHJcbiAgICAvLyBTdHJpbmcgcmVmZXJlbmNlZCBzbyB0aGF0IGNvbXBpbGVycyBtYWludGFpbiB0aGUgcHJvcGVydHkgbmFtZS5cclxuICAgIGNyZWxbJ2F0dHJNYXAnXSA9IHt9O1xyXG4gICAgXHJcbiAgICAvLyBTdHJpbmcgcmVmZXJlbmNlZCBzbyB0aGF0IGNvbXBpbGVycyBtYWludGFpbiB0aGUgcHJvcGVydHkgbmFtZS5cclxuICAgIGNyZWxbXCJpc05vZGVcIl0gPSBpc05vZGU7XHJcbiAgICBcclxuICAgIHJldHVybiBjcmVsO1xyXG59KSk7XHJcbiIsInZhciBjcmVsID0gcmVxdWlyZSgnY3JlbCcpO1xudmFyIHFzYSA9IHJlcXVpcmUoJ2NvZy9xc2EnKTtcbnZhciBsb2FkZXIgPSByZXF1aXJlKCdjb2cvbG9hZGVyJyk7XG52YXIgbWFpbiA9IHFzYSgnLm1haW4nKVswXTtcbnZhciByZVN0YXR1c09LID0gL14oMnwzKVxcZHsyfSQvO1xudmFyIHJlU3RyaXBFeHQgPSAvXiguKilcXC5qcyQvO1xudmFyIGJhc2VTY3JpcHRzID0gW1xuICAnaHR0cHM6Ly9ydGNqcy5pby9zb2NrZXQuaW8vc29ja2V0LmlvLmpzJ1xuXTtcblxuZnVuY3Rpb24gY3JlYXRlQ29kZUZyYW1lKHNhbXBsZSwgYW5jaG9yLCBjYWxsYmFjaykge1xuICB2YXIgZnJhbWVDb250YWluZXI7XG4gIHZhciBmcmFtZTtcbiAgdmFyIGNsb3NlQmFyO1xuICB2YXIgY29udGVudDtcbiAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICB2YXIgc2FtcGxlSFRNTCA9ICc8aHRtbD48Ym9keT48L2JvZHk+PC9odG1sPic7XG5cbiAgZnJhbWVDb250YWluZXIgPSBjcmVsKCdkaXYnLCB7IGNsYXNzOiAnY29kZWZyYW1lJyB9LFxuICAgIGNsb3NlQmFyID0gY3JlbCgnZGl2JywgeyBjbGFzczogJ2Nsb3NlcicgfSwgJ2Nsb3NlIHNhbXBsZScpLFxuICAgIGZyYW1lID0gY3JlbCgnaWZyYW1lJylcbiAgKTtcblxuICAvLyBpbnNlcnQgdGhlIGNvZGUgZnJhbWVcbiAgZG9jdW1lbnQuYm9keS5pbnNlcnRCZWZvcmUoZnJhbWVDb250YWluZXIsIG1haW4pO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIGNvbnRlbnRcbiAgY29udGVudCA9IGZyYW1lLmNvbnRlbnREb2N1bWVudCB8fCBmcmFtZS5jb250ZW50V2luZG93LmRvY3VtZW50O1xuXG4gIC8vIGNoZWNrIGlmIHdlIGhhdmUgY3VzdG9tIGh0bWwgZm9yIHRoaXMgZGVtb1xuICB4aHIub3BlbignR0VUJywgJ2NvZGUvJyArIHNhbXBsZSArICcuaHRtbCcpO1xuICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gaWYgd2UgZ290IGl0LCB0aGVuIHVzZSB0aGF0IGFzIHRoZSBkb2N1bWVudCBcbiAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgc2FtcGxlSFRNTCA9IHRoaXMucmVzcG9uc2U7XG4gICAgfVxuXG4gICAgLy8gd3JpdGUgdGhlIHNhbXBsZSBodG1sIGludG8gdGhlIGZyYW1lXG4gICAgY29udGVudC5vcGVuKCk7XG4gICAgY29udGVudC53cml0ZShzYW1wbGVIVE1MKTtcbiAgICBjb250ZW50LmNsb3NlKCk7XG5cbiAgICAvLyB0cmlnZ2VyIHRoZSBjYWxsYmFja1xuICAgIGNhbGxiYWNrKGZyYW1lQ29udGFpbmVyLCBjb250ZW50KTtcbiAgfTtcblxuICB4aHIuc2VuZCgpO1xufVxuXG5mdW5jdGlvbiBpbml0U2FtcGxlKGFuY2hvcikge1xuXG4gIGZ1bmN0aW9uIGNsb3NlQ29kZSgpIHtcbiAgICB2YXIgZnJhbWUgPSBhbmNob3IuY29kZWZyYW1lO1xuXG4gICAgLy8gaWYgdGhlIGFuY2hvciBhbHJlYWR5IGhhcyBhIGNvZGVmcmFtZSBhc3NvY2lhdGVkIHdpdGggaXQgZHJvcGl0XG4gICAgaWYgKGZyYW1lKSB7XG4gICAgICBmcmFtZS5jbGFzc05hbWUgPSAnY29kZWZyYW1lJztcbiAgICAgIGFuY2hvci5jb2RlZnJhbWUgPSBudWxsO1xuXG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBmcmFtZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGZyYW1lKTtcbiAgICAgIH0sIDUwMCk7XG4gICAgfVxuICB9XG5cbiAgYW5jaG9yLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAgdmFyIHNhbXBsZSA9IChhbmNob3IuZGF0YXNldC5zYW1wbGUgfHwgJycpLnJlcGxhY2UocmVTdHJpcEV4dCwgJyQxJyk7XG4gICAgdmFyIGZyYW1lO1xuXG4gICAgLy8gZG9uJ3QgZG8gdGhlIGRlZmF1bHQgY2xpY2sgYW5jaG9yIHRoaW5nLi4uXG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAvLyBjcmVhdGUgdGhlIGNvZGUgZnJhbWVcbiAgICBjcmVhdGVDb2RlRnJhbWUoc2FtcGxlLCBhbmNob3IsIGZ1bmN0aW9uKGZyYW1lLCBkb2MpIHtcbiAgICAgIHZhciBzdHlsZSA9IGRvYy5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgICAgc3R5bGUuaW5uZXJIVE1MID0gW1xuICAgICAgICAnYm9keSB7IHdpZHRoOiA4MjBweDsgbWFyZ2luOiA1cHggYXV0byAwOyB9JyxcbiAgICAgICAgJ2JvZHkgdmlkZW8geyB3aWR0aDogMTAwJSB9J1xuICAgICAgXS5qb2luKCdcXG4nKTtcbiAgICAgIFxuICAgICAgZG9jLmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuXG4gICAgICAvLyBsb2FkIHRoZSByZXF1aXJlZCBzY3JpcHRzXG4gICAgICBsb2FkZXIoYmFzZVNjcmlwdHMsIGZ1bmN0aW9uKCkge1xuICAgICAgICBsb2FkZXIoJ2pzL3NhbXBsZXMvJyArIHNhbXBsZSArICcuanMnKTtcblxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGZyYW1lLmNsYXNzTmFtZSArPSAnIGFjdGl2ZSc7XG4gICAgICAgIH0sIDEwMCk7XG4gICAgICB9KTtcblxuICAgICAgLy8gYXNzb2NpYXRlIHRoZSBjb2RlIGZyYW1lIHdpdGggdGhlIGZyYW1lXG4gICAgICBhbmNob3IuY29kZWZyYW1lID0gZnJhbWU7XG4gICAgICBxc2EoJy5jbG9zZXInLCBmcmFtZSlbMF0uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjbG9zZUNvZGUpO1xuICAgIH0pO1xuICB9KTtcbn1cblxucXNhKCcuc2FtcGxlJykuZm9yRWFjaChpbml0U2FtcGxlKTtcbiJdfQ==
;