(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"detect-browser":3}],3:[function(require,module,exports){
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

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5udm0vdjAuMTAuMzMvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjb2RlL2NhcHR1cmUtbWVkaWEuanMiLCJub2RlX21vZHVsZXMvcnRjLWNvcmUvZGV0ZWN0LmpzIiwibm9kZV9tb2R1bGVzL3J0Yy1jb3JlL25vZGVfbW9kdWxlcy9kZXRlY3QtYnJvd3Nlci9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIGluY2x1ZGUgdGhlIHJ0Yy1jb3JlIGRldGVjdGlvbiBoZWxwZXJzIHRvIGFzc2lzdCB3aXRoIGZpbmRpbmdcbi8vIHRoZSBjb3JyZWN0IGJyb3dzZXIgdmFyaWFudCBvZiBnZXRVc2VyTWVkaWFcbnZhciBkZXRlY3QgPSByZXF1aXJlKCdydGMtY29yZS9kZXRlY3QnKTtcblxuLy8gZ28gZmluZCB0aGUgYnJvd3NlciBzcGVjaWZpYyB2ZXJzaW9uIG9mIGdldFVzZXJNZWRpYSBhbmQgcGF0Y2ggaW50byBuYXZpZ2F0b3Jcbm5hdmlnYXRvci5nZXRVc2VyTWVkaWEgPSBkZXRlY3QuY2FsbChuYXZpZ2F0b3IsICdnZXRVc2VyTWVkaWEnKTtcblxuLy8gcGF0Y2ggd2luZG93IHVybCBmb3IgY3JlYXRpbmcgYmxvYiB1cmxzXG53aW5kb3cuVVJMID0gd2luZG93LlVSTCB8fCBkZXRlY3QoJ1VSTCcpO1xuXG4vLyBpbml0aWFsaXNlIHRoZSBjb25zdHJhaW50cyB3ZSB3aWxsIHBhc3MgdG8gdGhlIGdldFVzZXJNZWRpYSBjYWxsXG52YXIgY29uc3RyYWludHMgPSB7XG4gIHZpZGVvOiB7XG4gICAgbWFuZGF0b3J5OiB7fSwgb3B0aW9uYWw6IFtdXG4gIH0sXG5cbiAgYXVkaW86IHRydWVcbn07XG5cbi8vIG1ha2UgdGhlIGdldFVzZXJNZWRpYSByZXF1ZXN0XG4vLyAxc3QgYXJnIGNvbnN0cmFpbnRzLCAybmQgc3VjY2VzcyBjYWxsYmFjayBhbmQgM3JkIGZhaWx1cmUgY2FsbGJhY2tcbm5hdmlnYXRvci5nZXRVc2VyTWVkaWEoY29uc3RyYWludHMsIHJlbmRlck1lZGlhLCBmdW5jdGlvbihlcnIpIHtcbiAgY29uc29sZS5sb2coJ2NvdWxkIG5vdCBjYXB0dXJlIG1lZGlhOiAnLCBlcnIpO1xufSk7XG5cbmZ1bmN0aW9uIHJlbmRlck1lZGlhKHN0cmVhbSkge1xuICAvLyBjcmVhdGUgYSB2aWRlbyBlbGVtZW50XG4gIHZhciB2aWRlbyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3ZpZGVvJyk7XG4gIHZpZGVvLnNldEF0dHJpYnV0ZSgnYXV0b3BsYXknLCB0cnVlKTtcbiAgdmlkZW8uc2V0QXR0cmlidXRlKCdtdXRlZCcsIHRydWUpO1xuXG4gIC8vIGlmIHdlIGhhdmUgbW96aWxsYSBzcGVjaWZpYyBhdHRyaWJ1dGVzLCB1cGRhdGUgdGhlIG1velNyY09iamVjdFxuICBpZiAodHlwZW9mIHZpZGVvLm1velNyY09iamVjdCAhPSAndW5kZWZpbmVkJykge1xuICAgIHZpZGVvLm1velNyY09iamVjdCA9IHN0cmVhbTtcbiAgfVxuICBlbHNlIHtcbiAgICB2aWRlby5zcmMgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKHN0cmVhbSk7XG4gIH1cblxuICAvLyBhZGQgdGhlIHZpZGVvIGVsZW1lbnQgdG8gdGhlIGRvY3VtZW50XG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodmlkZW8pO1xufSIsIi8qIGpzaGludCBub2RlOiB0cnVlICovXG4vKiBnbG9iYWwgd2luZG93OiBmYWxzZSAqL1xuLyogZ2xvYmFsIG5hdmlnYXRvcjogZmFsc2UgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgYnJvd3NlciA9IHJlcXVpcmUoJ2RldGVjdC1icm93c2VyJyk7XG5cbi8qKlxuICAjIyMgYHJ0Yy1jb3JlL2RldGVjdGBcblxuICBBIGJyb3dzZXIgZGV0ZWN0aW9uIGhlbHBlciBmb3IgYWNjZXNzaW5nIHByZWZpeC1mcmVlIHZlcnNpb25zIG9mIHRoZSB2YXJpb3VzXG4gIFdlYlJUQyB0eXBlcy5cblxuICAjIyMgRXhhbXBsZSBVc2FnZVxuXG4gIElmIHlvdSB3YW50ZWQgdG8gZ2V0IHRoZSBuYXRpdmUgYFJUQ1BlZXJDb25uZWN0aW9uYCBwcm90b3R5cGUgaW4gYW55IGJyb3dzZXJcbiAgeW91IGNvdWxkIGRvIHRoZSBmb2xsb3dpbmc6XG5cbiAgYGBganNcbiAgdmFyIGRldGVjdCA9IHJlcXVpcmUoJ3J0Yy1jb3JlL2RldGVjdCcpOyAvLyBhbHNvIGF2YWlsYWJsZSBpbiBydGMvZGV0ZWN0XG4gIHZhciBSVENQZWVyQ29ubmVjdGlvbiA9IGRldGVjdCgnUlRDUGVlckNvbm5lY3Rpb24nKTtcbiAgYGBgXG5cbiAgVGhpcyB3b3VsZCBwcm92aWRlIHdoYXRldmVyIHRoZSBicm93c2VyIHByZWZpeGVkIHZlcnNpb24gb2YgdGhlXG4gIFJUQ1BlZXJDb25uZWN0aW9uIGlzIGF2YWlsYWJsZSAoYHdlYmtpdFJUQ1BlZXJDb25uZWN0aW9uYCxcbiAgYG1velJUQ1BlZXJDb25uZWN0aW9uYCwgZXRjKS5cbioqL1xudmFyIGRldGVjdCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGFyZ2V0LCBvcHRzKSB7XG4gIHZhciBhdHRhY2ggPSAob3B0cyB8fCB7fSkuYXR0YWNoO1xuICB2YXIgcHJlZml4SWR4O1xuICB2YXIgcHJlZml4O1xuICB2YXIgdGVzdE5hbWU7XG4gIHZhciBob3N0T2JqZWN0ID0gdGhpcyB8fCAodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHVuZGVmaW5lZCk7XG5cbiAgLy8gaW5pdGlhbGlzZSB0byBkZWZhdWx0IHByZWZpeGVzXG4gIC8vIChyZXZlcnNlIG9yZGVyIGFzIHdlIHVzZSBhIGRlY3JlbWVudGluZyBmb3IgbG9vcClcbiAgdmFyIHByZWZpeGVzID0gKChvcHRzIHx8IHt9KS5wcmVmaXhlcyB8fCBbJ21zJywgJ28nLCAnbW96JywgJ3dlYmtpdCddKS5jb25jYXQoJycpO1xuXG4gIC8vIGlmIHdlIGhhdmUgbm8gaG9zdCBvYmplY3QsIHRoZW4gYWJvcnRcbiAgaWYgKCEgaG9zdE9iamVjdCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgcHJlZml4ZXMgYW5kIHJldHVybiB0aGUgY2xhc3MgaWYgZm91bmQgaW4gZ2xvYmFsXG4gIGZvciAocHJlZml4SWR4ID0gcHJlZml4ZXMubGVuZ3RoOyBwcmVmaXhJZHgtLTsgKSB7XG4gICAgcHJlZml4ID0gcHJlZml4ZXNbcHJlZml4SWR4XTtcblxuICAgIC8vIGNvbnN0cnVjdCB0aGUgdGVzdCBjbGFzcyBuYW1lXG4gICAgLy8gaWYgd2UgaGF2ZSBhIHByZWZpeCBlbnN1cmUgdGhlIHRhcmdldCBoYXMgYW4gdXBwZXJjYXNlIGZpcnN0IGNoYXJhY3RlclxuICAgIC8vIHN1Y2ggdGhhdCBhIHRlc3QgZm9yIGdldFVzZXJNZWRpYSB3b3VsZCByZXN1bHQgaW4gYVxuICAgIC8vIHNlYXJjaCBmb3Igd2Via2l0R2V0VXNlck1lZGlhXG4gICAgdGVzdE5hbWUgPSBwcmVmaXggKyAocHJlZml4ID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB0YXJnZXQuc2xpY2UoMSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldCk7XG5cbiAgICBpZiAodHlwZW9mIGhvc3RPYmplY3RbdGVzdE5hbWVdICE9ICd1bmRlZmluZWQnKSB7XG4gICAgICAvLyB1cGRhdGUgdGhlIGxhc3QgdXNlZCBwcmVmaXhcbiAgICAgIGRldGVjdC5icm93c2VyID0gZGV0ZWN0LmJyb3dzZXIgfHwgcHJlZml4LnRvTG93ZXJDYXNlKCk7XG5cbiAgICAgIGlmIChhdHRhY2gpIHtcbiAgICAgICAgIGhvc3RPYmplY3RbdGFyZ2V0XSA9IGhvc3RPYmplY3RbdGVzdE5hbWVdO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gaG9zdE9iamVjdFt0ZXN0TmFtZV07XG4gICAgfVxuICB9XG59O1xuXG4vLyBkZXRlY3QgbW96aWxsYSAoeWVzLCB0aGlzIGZlZWxzIGRpcnR5KVxuZGV0ZWN0Lm1veiA9IHR5cGVvZiBuYXZpZ2F0b3IgIT0gJ3VuZGVmaW5lZCcgJiYgISFuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhO1xuXG4vLyBzZXQgdGhlIGJyb3dzZXIgYW5kIGJyb3dzZXIgdmVyc2lvblxuZGV0ZWN0LmJyb3dzZXIgPSBicm93c2VyLm5hbWU7XG5kZXRlY3QuYnJvd3NlclZlcnNpb24gPSBkZXRlY3QudmVyc2lvbiA9IGJyb3dzZXIudmVyc2lvbjtcbiIsInZhciBicm93c2VycyA9IFtcbiAgWyAnY2hyb21lJywgL0Nocm9tKD86ZXxpdW0pXFwvKFswLTlcXC5dKykoOj9cXHN8JCkvIF0sXG4gIFsgJ2ZpcmVmb3gnLCAvRmlyZWZveFxcLyhbMC05XFwuXSspKD86XFxzfCQpLyBdLFxuICBbICdvcGVyYScsIC9PcGVyYVxcLyhbMC05XFwuXSspKD86XFxzfCQpLyBdLFxuICBbICdpZScsIC9UcmlkZW50XFwvN1xcLjAuKnJ2XFw6KFswLTlcXC5dKylcXCkuKkdlY2tvJC8gXSxcbiAgWyAnaWUnLCAvTVNJRVxccyhbMC05XFwuXSspOy4qVHJpZGVudFxcL1s0LTddLjAvIF0sXG4gIFsgJ2llJywgL01TSUVcXHMoN1xcLjApLyBdLFxuICBbICdiYjEwJywgL0JCMTA7XFxzVG91Y2guKlZlcnNpb25cXC8oWzAtOVxcLl0rKS8gXSxcbiAgWyAnYW5kcm9pZCcsIC9BbmRyb2lkXFxzKFswLTlcXC5dKykvIF0sXG4gIFsgJ2lvcycsIC9pUGFkXFw7XFxzQ1BVXFxzT1NcXHMoWzAtOVxcLl9dKykvIF0sXG4gIFsgJ2lvcycsICAvaVBob25lXFw7XFxzQ1BVXFxzaVBob25lXFxzT1NcXHMoWzAtOVxcLl9dKykvIF0sXG4gIFsgJ3NhZmFyaScsIC9TYWZhcmlcXC8oWzAtOVxcLl9dKykvIF1cbl07XG5cbnZhciBtYXRjaCA9IGJyb3dzZXJzLm1hcChtYXRjaCkuZmlsdGVyKGlzTWF0Y2gpWzBdO1xudmFyIHBhcnRzID0gbWF0Y2ggJiYgbWF0Y2hbM10uc3BsaXQoL1suX10vKS5zbGljZSgwLDMpO1xuXG53aGlsZSAocGFydHMgJiYgcGFydHMubGVuZ3RoIDwgMykge1xuICBwYXJ0cy5wdXNoKCcwJyk7XG59XG5cbi8vIHNldCB0aGUgbmFtZSBhbmQgdmVyc2lvblxuZXhwb3J0cy5uYW1lID0gbWF0Y2ggJiYgbWF0Y2hbMF07XG5leHBvcnRzLnZlcnNpb24gPSBwYXJ0cyAmJiBwYXJ0cy5qb2luKCcuJyk7XG5cbmZ1bmN0aW9uIG1hdGNoKHBhaXIpIHtcbiAgcmV0dXJuIHBhaXIuY29uY2F0KHBhaXJbMV0uZXhlYyhuYXZpZ2F0b3IudXNlckFnZW50KSk7XG59XG5cbmZ1bmN0aW9uIGlzTWF0Y2gocGFpcikge1xuICByZXR1cm4gISFwYWlyWzJdO1xufVxuIl19
