var rtc = require('rtc');
var console = require('demo-console');

// create a websocket connection (using socket.io) on our signalling server
var socket = io.connect('http://localhost:3000');

// handle once connect
socket.once('connect', function() {
  console.log('connected');
});

// // create a signalling instance using our messaging layer (socket.io)
// // as the socket uses 'message' for 'data' event and 'connect' for 'open'
// // we need to tell the signaller what to look for
// var signaller = rtc.signaller(socket, {
//   dataEvent: 'message',
//   openEvent: 'connect'
// });

// // announce myself on the signalling channel
// signaller.announce({ name: 'Bob' });