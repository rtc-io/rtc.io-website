(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// include the rtc-core detection helpers to assist with finding
// the correct browser variant of getUserMedia
var detect = require('rtc-core/detect');

// go find the browser specific version of getUserMedia and patch into navigator
navigator.getUserMedia = detect.call(navigator, 'getUserMedia');

// patch window url for creating blob urls
window.URL = window.URL || detect('URL');

// initialise the constraints we will pass to the getUserMedia call
var constraints = {
  video: {
    mandatory: {}, optional: []
  },

  audio: true
};

// make the getUserMedia request
// 1st arg constraints, 2nd success callback and 3rd failure callback
navigator.getUserMedia(constraints, renderMedia, function(err) {
  console.log('could not capture media: ', err);
});

function renderMedia(stream) {
  // create a video element
  var video = document.createElement('video');
  video.setAttribute('autoplay', true);
  video.setAttribute('muted', true);

  // if we have mozilla specific attributes, update the mozSrcObject
  if (typeof video.mozSrcObject != 'undefined') {
    video.mozSrcObject = stream;
  }
  else {
    video.src = URL.createObjectURL(stream);
  }

  // add the video element to the document
  document.body.appendChild(video);
}
},{"rtc-core/detect":2}],2:[function(require,module,exports){
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
},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9kb2VobG1hbi8uYmFzaGluYXRlL2luc3RhbGwvbm9kZS8wLjEwLjI0L2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL2hvbWUvZG9laGxtYW4vY29kZS9ydGMuaW8vcnRjLmlvL2NvZGUvY2FwdHVyZS1tZWRpYS5qcyIsIi9ob21lL2RvZWhsbWFuL2NvZGUvcnRjLmlvL3J0Yy5pby9ub2RlX21vZHVsZXMvcnRjLWNvcmUvZGV0ZWN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIGluY2x1ZGUgdGhlIHJ0Yy1jb3JlIGRldGVjdGlvbiBoZWxwZXJzIHRvIGFzc2lzdCB3aXRoIGZpbmRpbmdcbi8vIHRoZSBjb3JyZWN0IGJyb3dzZXIgdmFyaWFudCBvZiBnZXRVc2VyTWVkaWFcbnZhciBkZXRlY3QgPSByZXF1aXJlKCdydGMtY29yZS9kZXRlY3QnKTtcblxuLy8gZ28gZmluZCB0aGUgYnJvd3NlciBzcGVjaWZpYyB2ZXJzaW9uIG9mIGdldFVzZXJNZWRpYSBhbmQgcGF0Y2ggaW50byBuYXZpZ2F0b3Jcbm5hdmlnYXRvci5nZXRVc2VyTWVkaWEgPSBkZXRlY3QuY2FsbChuYXZpZ2F0b3IsICdnZXRVc2VyTWVkaWEnKTtcblxuLy8gcGF0Y2ggd2luZG93IHVybCBmb3IgY3JlYXRpbmcgYmxvYiB1cmxzXG53aW5kb3cuVVJMID0gd2luZG93LlVSTCB8fCBkZXRlY3QoJ1VSTCcpO1xuXG4vLyBpbml0aWFsaXNlIHRoZSBjb25zdHJhaW50cyB3ZSB3aWxsIHBhc3MgdG8gdGhlIGdldFVzZXJNZWRpYSBjYWxsXG52YXIgY29uc3RyYWludHMgPSB7XG4gIHZpZGVvOiB7XG4gICAgbWFuZGF0b3J5OiB7fSwgb3B0aW9uYWw6IFtdXG4gIH0sXG5cbiAgYXVkaW86IHRydWVcbn07XG5cbi8vIG1ha2UgdGhlIGdldFVzZXJNZWRpYSByZXF1ZXN0XG4vLyAxc3QgYXJnIGNvbnN0cmFpbnRzLCAybmQgc3VjY2VzcyBjYWxsYmFjayBhbmQgM3JkIGZhaWx1cmUgY2FsbGJhY2tcbm5hdmlnYXRvci5nZXRVc2VyTWVkaWEoY29uc3RyYWludHMsIHJlbmRlck1lZGlhLCBmdW5jdGlvbihlcnIpIHtcbiAgY29uc29sZS5sb2coJ2NvdWxkIG5vdCBjYXB0dXJlIG1lZGlhOiAnLCBlcnIpO1xufSk7XG5cbmZ1bmN0aW9uIHJlbmRlck1lZGlhKHN0cmVhbSkge1xuICAvLyBjcmVhdGUgYSB2aWRlbyBlbGVtZW50XG4gIHZhciB2aWRlbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3ZpZGVvJyk7XG4gIHZpZGVvLnNldEF0dHJpYnV0ZSgnYXV0b3BsYXknLCB0cnVlKTtcbiAgdmlkZW8uc2V0QXR0cmlidXRlKCdtdXRlZCcsIHRydWUpO1xuXG4gIC8vIGlmIHdlIGhhdmUgbW96aWxsYSBzcGVjaWZpYyBhdHRyaWJ1dGVzLCB1cGRhdGUgdGhlIG1velNyY09iamVjdFxuICBpZiAodHlwZW9mIHZpZGVvLm1velNyY09iamVjdCAhPSAndW5kZWZpbmVkJykge1xuICAgIHZpZGVvLm1velNyY09iamVjdCA9IHN0cmVhbTtcbiAgfVxuICBlbHNlIHtcbiAgICB2aWRlby5zcmMgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKHN0cmVhbSk7XG4gIH1cblxuICAvLyBhZGQgdGhlIHZpZGVvIGVsZW1lbnQgdG8gdGhlIGRvY3VtZW50XG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodmlkZW8pO1xufSIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgd2luZG93OiBmYWxzZSAqL1xuLyogZ2xvYmFsIG5hdmlnYXRvcjogZmFsc2UgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiMjIHJ0Yy1jb3JlL2RldGVjdFxuXG5BIGJyb3dzZXIgZGV0ZWN0aW9uIGhlbHBlciBmb3IgYWNjZXNzaW5nIHByZWZpeC1mcmVlIHZlcnNpb25zIG9mIHRoZSB2YXJpb3VzXG5XZWJSVEMgdHlwZXMuIFxuXG4jIyMgRXhhbXBsZSBVc2FnZVxuXG5JZiB5b3Ugd2FudGVkIHRvIGdldCB0aGUgbmF0aXZlIGBSVENQZWVyQ29ubmVjdGlvbmAgcHJvdG90eXBlIGluIGFueSBicm93c2VyXG55b3UgY291bGQgZG8gdGhlIGZvbGxvd2luZzpcblxuYGBganNcbnZhciBkZXRlY3QgPSByZXF1aXJlKCdydGMtY29yZS9kZXRlY3QnKTsgLy8gYWxzbyBhdmFpbGFibGUgaW4gcnRjL2RldGVjdFxudmFyIFJUQ1BlZXJDb25uZWN0aW9uID0gZGV0ZWN0KCdSVENQZWVyQ29ubmVjdGlvbicpO1xuYGBgXG5cblRoaXMgd291bGQgcHJvdmlkZSB3aGF0ZXZlciB0aGUgYnJvd3NlciBwcmVmaXhlZCB2ZXJzaW9uIG9mIHRoZVxuUlRDUGVlckNvbm5lY3Rpb24gaXMgYXZhaWxhYmxlIChgd2Via2l0UlRDUGVlckNvbm5lY3Rpb25gLCBcbmBtb3pSVENQZWVyQ29ubmVjdGlvbmAsIGV0YykuXG4qKi9cbnZhciBkZXRlY3QgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRhcmdldCwgcHJlZml4ZXMpIHtcbiAgdmFyIHByZWZpeElkeDtcbiAgdmFyIHByZWZpeDtcbiAgdmFyIHRlc3ROYW1lO1xuICB2YXIgaG9zdE9iamVjdCA9IHRoaXMgfHwgd2luZG93O1xuXG4gIC8vIGluaXRpYWxpc2UgdG8gZGVmYXVsdCBwcmVmaXhlcyBcbiAgLy8gKHJldmVyc2Ugb3JkZXIgYXMgd2UgdXNlIGEgZGVjcmVtZW50aW5nIGZvciBsb29wKVxuICBwcmVmaXhlcyA9IChwcmVmaXhlcyB8fCBbJ21zJywgJ28nLCAnbW96JywgJ3dlYmtpdCddKS5jb25jYXQoJycpO1xuXG4gIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgcHJlZml4ZXMgYW5kIHJldHVybiB0aGUgY2xhc3MgaWYgZm91bmQgaW4gZ2xvYmFsXG4gIGZvciAocHJlZml4SWR4ID0gcHJlZml4ZXMubGVuZ3RoOyBwcmVmaXhJZHgtLTsgKSB7XG4gICAgcHJlZml4ID0gcHJlZml4ZXNbcHJlZml4SWR4XTtcblxuICAgIC8vIGNvbnN0cnVjdCB0aGUgdGVzdCBjbGFzcyBuYW1lXG4gICAgLy8gaWYgd2UgaGF2ZSBhIHByZWZpeCBlbnN1cmUgdGhlIHRhcmdldCBoYXMgYW4gdXBwZXJjYXNlIGZpcnN0IGNoYXJhY3RlclxuICAgIC8vIHN1Y2ggdGhhdCBhIHRlc3QgZm9yIGdldFVzZXJNZWRpYSB3b3VsZCByZXN1bHQgaW4gYSBcbiAgICAvLyBzZWFyY2ggZm9yIHdlYmtpdEdldFVzZXJNZWRpYVxuICAgIHRlc3ROYW1lID0gcHJlZml4ICsgKHByZWZpeCA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdGFyZ2V0LnNsaWNlKDEpIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQpO1xuXG4gICAgaWYgKHR5cGVvZiBob3N0T2JqZWN0W3Rlc3ROYW1lXSAhPSAndW5kZWZpbmVkJykge1xuICAgICAgLy8gdXBkYXRlIHRoZSBsYXN0IHVzZWQgcHJlZml4XG4gICAgICBkZXRlY3QuYnJvd3NlciA9IGRldGVjdC5icm93c2VyIHx8IHByZWZpeC50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICAvLyByZXR1cm4gdGhlIGhvc3Qgb2JqZWN0IG1lbWJlclxuICAgICAgcmV0dXJuIGhvc3RPYmplY3RbdGFyZ2V0XSA9IGhvc3RPYmplY3RbdGVzdE5hbWVdO1xuICAgIH1cbiAgfVxufTtcblxuLy8gZGV0ZWN0IG1vemlsbGEgKHllcywgdGhpcyBmZWVscyBkaXJ0eSlcbmRldGVjdC5tb3ogPSB0eXBlb2YgbmF2aWdhdG9yICE9ICd1bmRlZmluZWQnICYmICEhbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYTtcblxuLy8gaW5pdGlhbGlzZSB0aGUgcHJlZml4IGFzIHVua25vd25cbmRldGVjdC5icm93c2VyID0gdW5kZWZpbmVkOyJdfQ==
