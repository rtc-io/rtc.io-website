;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* jshint node: true */
/* global document: false */
'use strict';

var classSelectorRE = /^\.([\w\-]+)$/;
var idSelectorRE = /^#([\w\-]+)$/;
var tagSelectorRE = /^[\w\-]+$/;

/**
## qsa(selector, element)

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
},{}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
var crel = require('crel');
var qsa = require('cog/qsa');
var main = qsa('.main')[0];
var reStatusOK = /^(2|3)\d{2}$/;
var reStripExt = /^(.*)\.js$/;

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
      var script = doc.createElement('script');
      script.src = 'js/samples/' + sample + '.js';
      doc.body.appendChild(script);

      var style = doc.createElement('style');
      style.innerHTML = [
        'body { width: 820px; margin: 5px auto 0; }',
        'body video { width: 100% }'
      ].join('\n');
      
      doc.head.appendChild(style);

      // associate the code frame with the frame
      anchor.codeframe = frame;

      qsa('.closer', frame)[0].addEventListener('click', closeCode);

      setTimeout(function() {
        frame.className += ' active';
      }, 100);
    });
  });
}

qsa('.sample').forEach(initSample);

},{"cog/qsa":1,"crel":2}]},{},[3])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMuaW8vbm9kZV9tb2R1bGVzL2NvZy9xc2EuanMiLCIvaG9tZS9kb2VobG1hbi9jb2RlL3J0Yy5pby9ydGMuaW8vbm9kZV9tb2R1bGVzL2NyZWwvY3JlbC5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy5pby9zcmMvYXBwLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgZG9jdW1lbnQ6IGZhbHNlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBjbGFzc1NlbGVjdG9yUkUgPSAvXlxcLihbXFx3XFwtXSspJC87XG52YXIgaWRTZWxlY3RvclJFID0gL14jKFtcXHdcXC1dKykkLztcbnZhciB0YWdTZWxlY3RvclJFID0gL15bXFx3XFwtXSskLztcblxuLyoqXG4jIyBxc2Eoc2VsZWN0b3IsIGVsZW1lbnQpXG5cblRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBnZXQgdGhlIHJlc3VsdHMgb2YgdGhlIHF1ZXJ5U2VsZWN0b3JBbGwgb3V0cHV0IFxuaW4gdGhlIGZhc3Rlc3QgcG9zc2libGUgd2F5LiAgVGhpcyBjb2RlIGlzIHZlcnkgbXVjaCBiYXNlZCBvbiB0aGVcbmltcGxlbWVudGF0aW9uIGluXG5bemVwdG9dKGh0dHBzOi8vZ2l0aHViLmNvbS9tYWRyb2JieS96ZXB0by9ibG9iL21hc3Rlci9zcmMvemVwdG8uanMjTDEwNCksXG5idXQgcGVyaGFwcyBub3QgcXVpdGUgYXMgdGVyc2UuXG4qKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc2VsZWN0b3IsIHNjb3BlKSB7XG4gIHZhciBpZFNlYXJjaDtcblxuICAvLyBkZWZhdWx0IHRoZSBlbGVtZW50IHRvIHRoZSBkb2N1bWVudFxuICBzY29wZSA9IHNjb3BlIHx8IGRvY3VtZW50O1xuXG4gIC8vIGRldGVybWluZSB3aGV0aGVyIHdlIGFyZSBkb2luZyBhbiBpZCBzZWFyY2ggb3Igbm90XG4gIGlkU2VhcmNoID0gc2NvcGUgPT09IGRvY3VtZW50ICYmIGlkU2VsZWN0b3JSRS50ZXN0KHNlbGVjdG9yKTtcblxuICAvLyBwZXJmb3JtIHRoZSBzZWFyY2hcbiAgcmV0dXJuIGlkU2VhcmNoID9cbiAgICAvLyB3ZSBhcmUgZG9pbmcgYW4gaWQgc2VhcmNoLCByZXR1cm4gdGhlIGVsZW1lbnQgc2VhcmNoIGluIGFuIGFycmF5XG4gICAgW3Njb3BlLmdldEVsZW1lbnRCeUlkKFJlZ0V4cC4kMSldIDpcbiAgICAvLyBub3QgYW4gaWQgc2VhcmNoLCBjYWxsIHRoZSBhcHByb3ByaWF0ZSBzZWxlY3RvclxuICAgIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKFxuICAgICAgICBjbGFzc1NlbGVjdG9yUkUudGVzdChzZWxlY3RvcikgP1xuICAgICAgICAgIHNjb3BlLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoUmVnRXhwLiQxKSA6XG4gICAgICAgICAgICB0YWdTZWxlY3RvclJFLnRlc3Qoc2VsZWN0b3IpID9cbiAgICAgICAgICAgICAgc2NvcGUuZ2V0RWxlbWVudHNCeVRhZ05hbWUoc2VsZWN0b3IpIDpcbiAgICAgICAgICAgICAgc2NvcGUucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcilcbiAgICApO1xufTsiLCIvL0NvcHlyaWdodCAoQykgMjAxMiBLb3J5IE51bm5cclxuXHJcbi8vUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcclxuXHJcbi8vVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXHJcblxyXG4vL1RIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxyXG5cclxuLypcclxuXHJcbiAgICBUaGlzIGNvZGUgaXMgbm90IGZvcm1hdHRlZCBmb3IgcmVhZGFiaWxpdHksIGJ1dCByYXRoZXIgcnVuLXNwZWVkIGFuZCB0byBhc3Npc3QgY29tcGlsZXJzLlxyXG4gICAgXHJcbiAgICBIb3dldmVyLCB0aGUgY29kZSdzIGludGVudGlvbiBzaG91bGQgYmUgdHJhbnNwYXJlbnQuXHJcbiAgICBcclxuICAgICoqKiBJRSBTVVBQT1JUICoqKlxyXG4gICAgXHJcbiAgICBJZiB5b3UgcmVxdWlyZSB0aGlzIGxpYnJhcnkgdG8gd29yayBpbiBJRTcsIGFkZCB0aGUgZm9sbG93aW5nIGFmdGVyIGRlY2xhcmluZyBjcmVsLlxyXG4gICAgXHJcbiAgICB2YXIgdGVzdERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLFxyXG4gICAgICAgIHRlc3RMYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xhYmVsJyk7XHJcblxyXG4gICAgdGVzdERpdi5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2EnKTsgICAgXHJcbiAgICB0ZXN0RGl2WydjbGFzc05hbWUnXSAhPT0gJ2EnID8gY3JlbC5hdHRyTWFwWydjbGFzcyddID0gJ2NsYXNzTmFtZSc6dW5kZWZpbmVkO1xyXG4gICAgdGVzdERpdi5zZXRBdHRyaWJ1dGUoJ25hbWUnLCdhJyk7XHJcbiAgICB0ZXN0RGl2WyduYW1lJ10gIT09ICdhJyA/IGNyZWwuYXR0ck1hcFsnbmFtZSddID0gZnVuY3Rpb24oZWxlbWVudCwgdmFsdWUpe1xyXG4gICAgICAgIGVsZW1lbnQuaWQgPSB2YWx1ZTtcclxuICAgIH06dW5kZWZpbmVkO1xyXG4gICAgXHJcblxyXG4gICAgdGVzdExhYmVsLnNldEF0dHJpYnV0ZSgnZm9yJywgJ2EnKTtcclxuICAgIHRlc3RMYWJlbFsnaHRtbEZvciddICE9PSAnYScgPyBjcmVsLmF0dHJNYXBbJ2ZvciddID0gJ2h0bWxGb3InOnVuZGVmaW5lZDtcclxuICAgIFxyXG4gICAgXHJcblxyXG4qL1xyXG5cclxuLy8gaWYgdGhlIG1vZHVsZSBoYXMgbm8gZGVwZW5kZW5jaWVzLCB0aGUgYWJvdmUgcGF0dGVybiBjYW4gYmUgc2ltcGxpZmllZCB0b1xyXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcclxuICAgIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAgICAgZGVmaW5lKGZhY3RvcnkpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByb290LmNyZWwgPSBmYWN0b3J5KCk7XHJcbiAgfVxyXG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcclxuICAgIC8vIGJhc2VkIG9uIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMzg0Mjg2L2phdmFzY3JpcHQtaXNkb20taG93LWRvLXlvdS1jaGVjay1pZi1hLWphdmFzY3JpcHQtb2JqZWN0LWlzLWEtZG9tLW9iamVjdFxyXG4gICAgdmFyIGlzTm9kZSA9IHR5cGVvZiBOb2RlID09PSAnb2JqZWN0J1xyXG4gICAgICAgID8gZnVuY3Rpb24gKG9iamVjdCkgeyByZXR1cm4gb2JqZWN0IGluc3RhbmNlb2YgTm9kZSB9XHJcbiAgICAgICAgOiBmdW5jdGlvbiAob2JqZWN0KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBvYmplY3RcclxuICAgICAgICAgICAgICAgICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnXHJcbiAgICAgICAgICAgICAgICAmJiB0eXBlb2Ygb2JqZWN0Lm5vZGVUeXBlID09PSAnbnVtYmVyJ1xyXG4gICAgICAgICAgICAgICAgJiYgdHlwZW9mIG9iamVjdC5ub2RlTmFtZSA9PT0gJ3N0cmluZyc7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICBmdW5jdGlvbiBjcmVsKCl7XHJcbiAgICAgICAgdmFyIGRvY3VtZW50ID0gd2luZG93LmRvY3VtZW50LFxyXG4gICAgICAgICAgICBhcmdzID0gYXJndW1lbnRzLCAvL05vdGU6IGFzc2lnbmVkIHRvIGEgdmFyaWFibGUgdG8gYXNzaXN0IGNvbXBpbGVycy4gU2F2ZXMgYWJvdXQgNDAgYnl0ZXMgaW4gY2xvc3VyZSBjb21waWxlci4gSGFzIG5lZ2xpZ2FibGUgZWZmZWN0IG9uIHBlcmZvcm1hbmNlLlxyXG4gICAgICAgICAgICBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChhcmdzWzBdKSxcclxuICAgICAgICAgICAgY2hpbGQsXHJcbiAgICAgICAgICAgIHNldHRpbmdzID0gYXJnc1sxXSxcclxuICAgICAgICAgICAgY2hpbGRJbmRleCA9IDIsXHJcbiAgICAgICAgICAgIGFyZ3VtZW50c0xlbmd0aCA9IGFyZ3MubGVuZ3RoLFxyXG4gICAgICAgICAgICBhdHRyaWJ1dGVNYXAgPSBjcmVsLmF0dHJNYXA7XHJcblxyXG4gICAgICAgIC8vIHNob3J0Y3V0XHJcbiAgICAgICAgaWYoYXJndW1lbnRzTGVuZ3RoID09PSAxKXtcclxuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZih0eXBlb2Ygc2V0dGluZ3MgIT09ICdvYmplY3QnIHx8IGlzTm9kZShzZXR0aW5ncykpIHtcclxuICAgICAgICAgICAgLS1jaGlsZEluZGV4O1xyXG4gICAgICAgICAgICBzZXR0aW5ncyA9IG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBzaG9ydGN1dCBpZiB0aGVyZSBpcyBvbmx5IG9uZSBjaGlsZCB0aGF0IGlzIGEgc3RyaW5nICAgIFxyXG4gICAgICAgIGlmKChhcmd1bWVudHNMZW5ndGggLSBjaGlsZEluZGV4KSA9PT0gMSAmJiB0eXBlb2YgYXJnc1tjaGlsZEluZGV4XSA9PT0gJ3N0cmluZycgJiYgZWxlbWVudC50ZXh0Q29udGVudCAhPT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgICAgZWxlbWVudC50ZXh0Q29udGVudCA9IGFyZ3NbY2hpbGRJbmRleF07XHJcbiAgICAgICAgfWVsc2V7ICAgIFxyXG4gICAgICAgICAgICBmb3IoOyBjaGlsZEluZGV4IDwgYXJndW1lbnRzTGVuZ3RoOyArK2NoaWxkSW5kZXgpe1xyXG4gICAgICAgICAgICAgICAgY2hpbGQgPSBhcmdzW2NoaWxkSW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZihjaGlsZCA9PSBudWxsKXtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYoIWlzTm9kZShjaGlsZCkpe1xyXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY2hpbGQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmFwcGVuZENoaWxkKGNoaWxkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBmb3IodmFyIGtleSBpbiBzZXR0aW5ncyl7XHJcbiAgICAgICAgICAgIGlmKCFhdHRyaWJ1dGVNYXBba2V5XSl7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShrZXksIHNldHRpbmdzW2tleV0pO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIHZhciBhdHRyID0gY3JlbC5hdHRyTWFwW2tleV07XHJcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgYXR0ciA9PT0gJ2Z1bmN0aW9uJyl7ICAgICBcclxuICAgICAgICAgICAgICAgICAgICBhdHRyKGVsZW1lbnQsIHNldHRpbmdzW2tleV0pOyAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgfWVsc2V7ICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoYXR0ciwgc2V0dGluZ3Nba2V5XSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIFVzZWQgZm9yIG1hcHBpbmcgb25lIGtpbmQgb2YgYXR0cmlidXRlIHRvIHRoZSBzdXBwb3J0ZWQgdmVyc2lvbiBvZiB0aGF0IGluIGJhZCBicm93c2Vycy5cclxuICAgIC8vIFN0cmluZyByZWZlcmVuY2VkIHNvIHRoYXQgY29tcGlsZXJzIG1haW50YWluIHRoZSBwcm9wZXJ0eSBuYW1lLlxyXG4gICAgY3JlbFsnYXR0ck1hcCddID0ge307XHJcbiAgICBcclxuICAgIC8vIFN0cmluZyByZWZlcmVuY2VkIHNvIHRoYXQgY29tcGlsZXJzIG1haW50YWluIHRoZSBwcm9wZXJ0eSBuYW1lLlxyXG4gICAgY3JlbFtcImlzTm9kZVwiXSA9IGlzTm9kZTtcclxuICAgIFxyXG4gICAgcmV0dXJuIGNyZWw7XHJcbn0pKTtcclxuIiwidmFyIGNyZWwgPSByZXF1aXJlKCdjcmVsJyk7XG52YXIgcXNhID0gcmVxdWlyZSgnY29nL3FzYScpO1xudmFyIG1haW4gPSBxc2EoJy5tYWluJylbMF07XG52YXIgcmVTdGF0dXNPSyA9IC9eKDJ8MylcXGR7Mn0kLztcbnZhciByZVN0cmlwRXh0ID0gL14oLiopXFwuanMkLztcblxuZnVuY3Rpb24gY3JlYXRlQ29kZUZyYW1lKHNhbXBsZSwgYW5jaG9yLCBjYWxsYmFjaykge1xuICB2YXIgZnJhbWVDb250YWluZXI7XG4gIHZhciBmcmFtZTtcbiAgdmFyIGNsb3NlQmFyO1xuICB2YXIgY29udGVudDtcbiAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICB2YXIgc2FtcGxlSFRNTCA9ICc8aHRtbD48Ym9keT48L2JvZHk+PC9odG1sPic7XG5cbiAgZnJhbWVDb250YWluZXIgPSBjcmVsKCdkaXYnLCB7IGNsYXNzOiAnY29kZWZyYW1lJyB9LFxuICAgIGNsb3NlQmFyID0gY3JlbCgnZGl2JywgeyBjbGFzczogJ2Nsb3NlcicgfSwgJ2Nsb3NlIHNhbXBsZScpLFxuICAgIGZyYW1lID0gY3JlbCgnaWZyYW1lJylcbiAgKTtcblxuICAvLyBpbnNlcnQgdGhlIGNvZGUgZnJhbWVcbiAgZG9jdW1lbnQuYm9keS5pbnNlcnRCZWZvcmUoZnJhbWVDb250YWluZXIsIG1haW4pO1xuXG4gIC8vIGluaXRpYWxpc2UgdGhlIGNvbnRlbnRcbiAgY29udGVudCA9IGZyYW1lLmNvbnRlbnREb2N1bWVudCB8fCBmcmFtZS5jb250ZW50V2luZG93LmRvY3VtZW50O1xuXG4gIC8vIGNoZWNrIGlmIHdlIGhhdmUgY3VzdG9tIGh0bWwgZm9yIHRoaXMgZGVtb1xuICB4aHIub3BlbignR0VUJywgJ2NvZGUvJyArIHNhbXBsZSArICcuaHRtbCcpO1xuICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gaWYgd2UgZ290IGl0LCB0aGVuIHVzZSB0aGF0IGFzIHRoZSBkb2N1bWVudCBcbiAgICBpZiAodGhpcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgc2FtcGxlSFRNTCA9IHRoaXMucmVzcG9uc2U7XG4gICAgfVxuXG4gICAgLy8gd3JpdGUgdGhlIHNhbXBsZSBodG1sIGludG8gdGhlIGZyYW1lXG4gICAgY29udGVudC5vcGVuKCk7XG4gICAgY29udGVudC53cml0ZShzYW1wbGVIVE1MKTtcbiAgICBjb250ZW50LmNsb3NlKCk7XG5cbiAgICAvLyB0cmlnZ2VyIHRoZSBjYWxsYmFja1xuICAgIGNhbGxiYWNrKGZyYW1lQ29udGFpbmVyLCBjb250ZW50KTtcbiAgfTtcblxuICB4aHIuc2VuZCgpO1xufVxuXG5mdW5jdGlvbiBpbml0U2FtcGxlKGFuY2hvcikge1xuXG4gIGZ1bmN0aW9uIGNsb3NlQ29kZSgpIHtcbiAgICB2YXIgZnJhbWUgPSBhbmNob3IuY29kZWZyYW1lO1xuXG4gICAgLy8gaWYgdGhlIGFuY2hvciBhbHJlYWR5IGhhcyBhIGNvZGVmcmFtZSBhc3NvY2lhdGVkIHdpdGggaXQgZHJvcGl0XG4gICAgaWYgKGZyYW1lKSB7XG4gICAgICBmcmFtZS5jbGFzc05hbWUgPSAnY29kZWZyYW1lJztcbiAgICAgIGFuY2hvci5jb2RlZnJhbWUgPSBudWxsO1xuXG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBmcmFtZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGZyYW1lKTtcbiAgICAgIH0sIDUwMCk7XG4gICAgfVxuICB9XG5cbiAgYW5jaG9yLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAgdmFyIHNhbXBsZSA9IChhbmNob3IuZGF0YXNldC5zYW1wbGUgfHwgJycpLnJlcGxhY2UocmVTdHJpcEV4dCwgJyQxJyk7XG4gICAgdmFyIGZyYW1lO1xuXG4gICAgLy8gZG9uJ3QgZG8gdGhlIGRlZmF1bHQgY2xpY2sgYW5jaG9yIHRoaW5nLi4uXG4gICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG5cblxuICAgIC8vIGNyZWF0ZSB0aGUgY29kZSBmcmFtZVxuICAgIGNyZWF0ZUNvZGVGcmFtZShzYW1wbGUsIGFuY2hvciwgZnVuY3Rpb24oZnJhbWUsIGRvYykge1xuICAgICAgdmFyIHNjcmlwdCA9IGRvYy5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICAgIHNjcmlwdC5zcmMgPSAnanMvc2FtcGxlcy8nICsgc2FtcGxlICsgJy5qcyc7XG4gICAgICBkb2MuYm9keS5hcHBlbmRDaGlsZChzY3JpcHQpO1xuXG4gICAgICB2YXIgc3R5bGUgPSBkb2MuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICAgIHN0eWxlLmlubmVySFRNTCA9IFtcbiAgICAgICAgJ2JvZHkgeyB3aWR0aDogODIwcHg7IG1hcmdpbjogNXB4IGF1dG8gMDsgfScsXG4gICAgICAgICdib2R5IHZpZGVvIHsgd2lkdGg6IDEwMCUgfSdcbiAgICAgIF0uam9pbignXFxuJyk7XG4gICAgICBcbiAgICAgIGRvYy5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcblxuICAgICAgLy8gYXNzb2NpYXRlIHRoZSBjb2RlIGZyYW1lIHdpdGggdGhlIGZyYW1lXG4gICAgICBhbmNob3IuY29kZWZyYW1lID0gZnJhbWU7XG5cbiAgICAgIHFzYSgnLmNsb3NlcicsIGZyYW1lKVswXS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGNsb3NlQ29kZSk7XG5cbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGZyYW1lLmNsYXNzTmFtZSArPSAnIGFjdGl2ZSc7XG4gICAgICB9LCAxMDApO1xuICAgIH0pO1xuICB9KTtcbn1cblxucXNhKCcuc2FtcGxlJykuZm9yRWFjaChpbml0U2FtcGxlKTtcbiJdfQ==
;