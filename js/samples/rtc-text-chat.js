(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Set RTC options.
var rtcOpts = {
	room: 'test-data',
	signaller: '//switchboard.rtc.io',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5udm0vdjAuMTAuMzMvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjb2RlL3J0Yy10ZXh0LWNoYXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIFNldCBSVEMgb3B0aW9ucy5cbnZhciBydGNPcHRzID0ge1xuXHRyb29tOiAndGVzdC1kYXRhJyxcblx0c2lnbmFsbGVyOiAnLy9zd2l0Y2hib2FyZC5ydGMuaW8nLFxuXHRjYXB0dXJlOiBmYWxzZVxufTtcblxuLy8gY2FsbCBSVEMgbW9kdWxlXG52YXIgcnRjID0gUlRDKHJ0Y09wdHMpO1xuXG4vLyBBIGNvbnRlbnRlZGl0YWJsZSBlbGVtZW50IHRvIHNob3cgb3VyIG1lc3NhZ2VzXG52YXIgbWVzc2FnZXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWVzc2FnZXMnKTtcblxuLy8gQmluZCB0byBldmVudHMgaGFwcGVuaW5nIG9uIHRoZSBkYXRhIGNoYW5uZWxcbmZ1bmN0aW9uIGJpbmREYXRhQ2hhbm5lbEV2ZW50cyhpZCwgY2hhbm5lbCwgYXR0cmlidXRlcywgY29ubmVjdGlvbikge1xuXG5cdC8vIFJlY2VpdmUgbWVzc2FnZVxuXHRjaGFubmVsLm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChldnQpIHtcblx0ICAgIG1lc3NhZ2VzLmlubmVySFRNTCA9IGV2dC5kYXRhO1xuXHR9O1xuXG5cdC8vIFNlbmQgbWVzc2FnZVxuXHRtZXNzYWdlcy5vbmtleXVwID0gZnVuY3Rpb24gKCkge1xuXHRcdGNoYW5uZWwuc2VuZCh0aGlzLmlubmVySFRNTCk7XG5cdH07XG59XG5cbi8vIFN0YXJ0IHdvcmtpbmcgd2l0aCB0aGUgZXN0YWJsaXNoZWQgc2Vzc2lvblxuZnVuY3Rpb24gaW5pdChzZXNzaW9uKSB7XG5cdHNlc3Npb24uY3JlYXRlRGF0YUNoYW5uZWwoJ2NoYXQnLCB7XG4gIFx0XHRvcmRlcmVkOiB0cnVlLFxuICBcdFx0bWF4UmV0cmFuc21pdHM6IDEyXG4gXHR9KTtcbiAgXHRzZXNzaW9uLm9uKCdjaGFubmVsOm9wZW5lZDpjaGF0JywgYmluZERhdGFDaGFubmVsRXZlbnRzKTtcbn1cblxuLy8gRGV0ZWN0IHdoZW4gUlRDIGhhcyBlc3RhYmxpc2hlZCBhIHNlc3Npb25cbnJ0Yy5vbigncmVhZHknLCBpbml0KTsiXX0=
