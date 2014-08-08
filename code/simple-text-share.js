// rtc-quickconnect requires a signalling server location and a room name.
var quickConnectMod = require('rtc-quickconnect');
var quickConnectObj = quickConnectMod('//switchboard.rtc.io', { room: 'rtcio-text-demo' });

// Create the text area for chatting
var messageWindow = document.createElement('textarea');
messageWindow.rows = 20;
messageWindow.cols = 80;

var bodyElement = document.getElementsByTagName('body')[0];
bodyElement.appendChild(messageWindow);

// Create a data channel and bind to it's events
quickConnectObj.createDataChannel('shared-text');
quickConnectObj.on('channel:opened:shared-text', function (id, dataChannel) {
  	bindDataEvents(dataChannel);
});

function bindDataEvents(channel) {
	// Receive message
	channel.onmessage = function (evt) {
		messageWindow.value = evt.data;
	};

	// Send message
	messageWindow.onkeyup = function (evt) {
		channel.send(this.value);
	};
}
