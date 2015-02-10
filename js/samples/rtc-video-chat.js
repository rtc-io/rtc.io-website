(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Set RTC options.
var rtcOpts = {
    room: 'test-room',
    signaller: 'https://switchboard.rtc.io'
  };
// call RTC module
var rtc = RTC(rtcOpts);
// A div element to show our local video stream
var localVideo = document.getElementById('l-video');
// A div element to show our remote video streams
var remoteVideo = document.getElementById('r-video');
// A contenteditable element to show our messages
var messageWindow = document.getElementById('messages');

// Bind to events happening on the data channel
function bindDataChannelEvents(id, channel, attributes, connection) {

  // Receive message
  channel.onmessage = function (evt) {
    messageWindow.innerHTML = evt.data;
  };

  // Send message
  messageWindow.onkeyup = function () {
    channel.send(this.innerHTML);
  };
}

// Start working with the established session
function init(session) {
  session.createDataChannel('chat');
  session.on('channel:opened:chat', bindDataChannelEvents);
}

// Display local and remote video streams
localVideo.appendChild(rtc.local);
remoteVideo.appendChild(rtc.remote);

// Detect when RTC has established a session
rtc.on('ready', init);

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5udm0vdjAuMTAuMzMvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjb2RlL3J0Yy12aWRlby1jaGF0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBTZXQgUlRDIG9wdGlvbnMuXG52YXIgcnRjT3B0cyA9IHtcbiAgICByb29tOiAndGVzdC1yb29tJyxcbiAgICBzaWduYWxsZXI6ICdodHRwczovL3N3aXRjaGJvYXJkLnJ0Yy5pbydcbiAgfTtcbi8vIGNhbGwgUlRDIG1vZHVsZVxudmFyIHJ0YyA9IFJUQyhydGNPcHRzKTtcbi8vIEEgZGl2IGVsZW1lbnQgdG8gc2hvdyBvdXIgbG9jYWwgdmlkZW8gc3RyZWFtXG52YXIgbG9jYWxWaWRlbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsLXZpZGVvJyk7XG4vLyBBIGRpdiBlbGVtZW50IHRvIHNob3cgb3VyIHJlbW90ZSB2aWRlbyBzdHJlYW1zXG52YXIgcmVtb3RlVmlkZW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnci12aWRlbycpO1xuLy8gQSBjb250ZW50ZWRpdGFibGUgZWxlbWVudCB0byBzaG93IG91ciBtZXNzYWdlc1xudmFyIG1lc3NhZ2VXaW5kb3cgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWVzc2FnZXMnKTtcblxuLy8gQmluZCB0byBldmVudHMgaGFwcGVuaW5nIG9uIHRoZSBkYXRhIGNoYW5uZWxcbmZ1bmN0aW9uIGJpbmREYXRhQ2hhbm5lbEV2ZW50cyhpZCwgY2hhbm5lbCwgYXR0cmlidXRlcywgY29ubmVjdGlvbikge1xuXG4gIC8vIFJlY2VpdmUgbWVzc2FnZVxuICBjaGFubmVsLm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChldnQpIHtcbiAgICBtZXNzYWdlV2luZG93LmlubmVySFRNTCA9IGV2dC5kYXRhO1xuICB9O1xuXG4gIC8vIFNlbmQgbWVzc2FnZVxuICBtZXNzYWdlV2luZG93Lm9ua2V5dXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgY2hhbm5lbC5zZW5kKHRoaXMuaW5uZXJIVE1MKTtcbiAgfTtcbn1cblxuLy8gU3RhcnQgd29ya2luZyB3aXRoIHRoZSBlc3RhYmxpc2hlZCBzZXNzaW9uXG5mdW5jdGlvbiBpbml0KHNlc3Npb24pIHtcbiAgc2Vzc2lvbi5jcmVhdGVEYXRhQ2hhbm5lbCgnY2hhdCcpO1xuICBzZXNzaW9uLm9uKCdjaGFubmVsOm9wZW5lZDpjaGF0JywgYmluZERhdGFDaGFubmVsRXZlbnRzKTtcbn1cblxuLy8gRGlzcGxheSBsb2NhbCBhbmQgcmVtb3RlIHZpZGVvIHN0cmVhbXNcbmxvY2FsVmlkZW8uYXBwZW5kQ2hpbGQocnRjLmxvY2FsKTtcbnJlbW90ZVZpZGVvLmFwcGVuZENoaWxkKHJ0Yy5yZW1vdGUpO1xuXG4vLyBEZXRlY3Qgd2hlbiBSVEMgaGFzIGVzdGFibGlzaGVkIGEgc2Vzc2lvblxucnRjLm9uKCdyZWFkeScsIGluaXQpO1xuIl19
