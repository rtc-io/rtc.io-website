// rtc-quickconnect requires a signalling server location and a room name.
var quickConnectMod = require('rtc-quickconnect');
var quickConnectObj = quickConnectMod('http://rtc.io/switchboard/', { room: 'rtcio-text-demo' });
var messageWindow = document.getElementById('messages');

// Create a data channel and bind to it's events
quickConnectObj.createDataChannel('shared-text');
quickConnectObj.on('channel:opened:shared-text', function (id, dataChannel) {
  	bindDataEvents(dataChannel);
});

function bindDataEvents(channel) {
	// Receive message
	channel.onmessage = function (evt) {
		messageWindow.innerHTML = evt.data;
	};

	// Send message
	messageWindow.onkeyup = function (evt) {
		channel.send(this.innerHTML);
	};
}