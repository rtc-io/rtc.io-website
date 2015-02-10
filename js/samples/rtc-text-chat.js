(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Set RTC options.
var rtcOpts = {
	room: 'test-data',
	signaller: 'https://switchboard.rtc.io',
	capture: false
};

// call RTC module
var rtc = RTC(rtcOpts);

// A contenteditable element to show our messages
var messages = document.getElementById('messages');

// Bind to events happening on the data channel
function bindDataChannelEvents(id, channel, attributes, connection) {

	// Receive message
	channel.onmessage = function (evt) {
	    messages.innerHTML = evt.data;
	};

	// Send message
	messages.onkeyup = function () {
		channel.send(this.innerHTML);
	};
}

// Start working with the established session
function init(session) {
	session.createDataChannel('chat', {
  		ordered: true,
  		maxRetransmits: 12
 	});
  	session.on('channel:opened:chat', bindDataChannelEvents);
}

// Detect when RTC has established a session
rtc.on('ready', init);

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5udm0vdjAuMTAuMzMvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjb2RlL3J0Yy10ZXh0LWNoYXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gU2V0IFJUQyBvcHRpb25zLlxudmFyIHJ0Y09wdHMgPSB7XG5cdHJvb206ICd0ZXN0LWRhdGEnLFxuXHRzaWduYWxsZXI6ICdodHRwczovL3N3aXRjaGJvYXJkLnJ0Yy5pbycsXG5cdGNhcHR1cmU6IGZhbHNlXG59O1xuXG4vLyBjYWxsIFJUQyBtb2R1bGVcbnZhciBydGMgPSBSVEMocnRjT3B0cyk7XG5cbi8vIEEgY29udGVudGVkaXRhYmxlIGVsZW1lbnQgdG8gc2hvdyBvdXIgbWVzc2FnZXNcbnZhciBtZXNzYWdlcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtZXNzYWdlcycpO1xuXG4vLyBCaW5kIHRvIGV2ZW50cyBoYXBwZW5pbmcgb24gdGhlIGRhdGEgY2hhbm5lbFxuZnVuY3Rpb24gYmluZERhdGFDaGFubmVsRXZlbnRzKGlkLCBjaGFubmVsLCBhdHRyaWJ1dGVzLCBjb25uZWN0aW9uKSB7XG5cblx0Ly8gUmVjZWl2ZSBtZXNzYWdlXG5cdGNoYW5uZWwub25tZXNzYWdlID0gZnVuY3Rpb24gKGV2dCkge1xuXHQgICAgbWVzc2FnZXMuaW5uZXJIVE1MID0gZXZ0LmRhdGE7XG5cdH07XG5cblx0Ly8gU2VuZCBtZXNzYWdlXG5cdG1lc3NhZ2VzLm9ua2V5dXAgPSBmdW5jdGlvbiAoKSB7XG5cdFx0Y2hhbm5lbC5zZW5kKHRoaXMuaW5uZXJIVE1MKTtcblx0fTtcbn1cblxuLy8gU3RhcnQgd29ya2luZyB3aXRoIHRoZSBlc3RhYmxpc2hlZCBzZXNzaW9uXG5mdW5jdGlvbiBpbml0KHNlc3Npb24pIHtcblx0c2Vzc2lvbi5jcmVhdGVEYXRhQ2hhbm5lbCgnY2hhdCcsIHtcbiAgXHRcdG9yZGVyZWQ6IHRydWUsXG4gIFx0XHRtYXhSZXRyYW5zbWl0czogMTJcbiBcdH0pO1xuICBcdHNlc3Npb24ub24oJ2NoYW5uZWw6b3BlbmVkOmNoYXQnLCBiaW5kRGF0YUNoYW5uZWxFdmVudHMpO1xufVxuXG4vLyBEZXRlY3Qgd2hlbiBSVEMgaGFzIGVzdGFibGlzaGVkIGEgc2Vzc2lvblxucnRjLm9uKCdyZWFkeScsIGluaXQpO1xuIl19
