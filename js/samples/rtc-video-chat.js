(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Set RTC options.
var rtcOpts = {
    room: 'test-room',
    signaller: '//switchboard.rtc.io'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvY2xpbGwvU2VydmVyL3J0Yy5pby9ydGMuaW8td2Vic2l0ZS9jb2RlL3J0Yy12aWRlby1jaGF0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gU2V0IFJUQyBvcHRpb25zLlxudmFyIHJ0Y09wdHMgPSB7XG4gICAgcm9vbTogJ3Rlc3Qtcm9vbScsXG4gICAgc2lnbmFsbGVyOiAnLy9zd2l0Y2hib2FyZC5ydGMuaW8nXG4gIH07XG4vLyBjYWxsIFJUQyBtb2R1bGVcbnZhciBydGMgPSBSVEMocnRjT3B0cyk7XG4vLyBBIGRpdiBlbGVtZW50IHRvIHNob3cgb3VyIGxvY2FsIHZpZGVvIHN0cmVhbVxudmFyIGxvY2FsVmlkZW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbC12aWRlbycpO1xuLy8gQSBkaXYgZWxlbWVudCB0byBzaG93IG91ciByZW1vdGUgdmlkZW8gc3RyZWFtc1xudmFyIHJlbW90ZVZpZGVvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ItdmlkZW8nKTtcbi8vIEEgY29udGVudGVkaXRhYmxlIGVsZW1lbnQgdG8gc2hvdyBvdXIgbWVzc2FnZXNcbnZhciBtZXNzYWdlV2luZG93ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21lc3NhZ2VzJyk7XG5cbi8vIEJpbmQgdG8gZXZlbnRzIGhhcHBlbmluZyBvbiB0aGUgZGF0YSBjaGFubmVsXG5mdW5jdGlvbiBiaW5kRGF0YUNoYW5uZWxFdmVudHMoaWQsIGNoYW5uZWwsIGF0dHJpYnV0ZXMsIGNvbm5lY3Rpb24pIHtcblxuICAvLyBSZWNlaXZlIG1lc3NhZ2VcbiAgY2hhbm5lbC5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgbWVzc2FnZVdpbmRvdy5pbm5lckhUTUwgPSBldnQuZGF0YTtcbiAgfTtcblxuICAvLyBTZW5kIG1lc3NhZ2VcbiAgbWVzc2FnZVdpbmRvdy5vbmtleXVwID0gZnVuY3Rpb24gKCkge1xuICAgIGNoYW5uZWwuc2VuZCh0aGlzLmlubmVySFRNTCk7XG4gIH07XG59XG5cbi8vIFN0YXJ0IHdvcmtpbmcgd2l0aCB0aGUgZXN0YWJsaXNoZWQgc2Vzc2lvblxuZnVuY3Rpb24gaW5pdChzZXNzaW9uKSB7XG4gIHNlc3Npb24uY3JlYXRlRGF0YUNoYW5uZWwoJ2NoYXQnKTtcbiAgc2Vzc2lvbi5vbignY2hhbm5lbDpvcGVuZWQ6Y2hhdCcsIGJpbmREYXRhQ2hhbm5lbEV2ZW50cyk7XG59XG5cbi8vIERpc3BsYXkgbG9jYWwgYW5kIHJlbW90ZSB2aWRlbyBzdHJlYW1zXG5sb2NhbFZpZGVvLmFwcGVuZENoaWxkKHJ0Yy5sb2NhbCk7XG5yZW1vdGVWaWRlby5hcHBlbmRDaGlsZChydGMucmVtb3RlKTtcblxuLy8gRGV0ZWN0IHdoZW4gUlRDIGhhcyBlc3RhYmxpc2hlZCBhIHNlc3Npb25cbnJ0Yy5vbigncmVhZHknLCBpbml0KTsiXX0=
