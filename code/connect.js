var rtc = require('rtc');

// create a websocket connection (using socket.io) on our signalling server
var socket = io.connect('http://rtcjs.io:50001');

// create a signalling instance using our messaging layer (socket.io)
// as the socket uses 'message' for 'data' event and 'connect' for 'open'
// we need to tell the signaller what to look for
var signaller = rtc.signaller(socket, {
  dataEvent: 'message',
  openEvent: 'connect'
});

// announce myself on the signalling channel
signaller.announce({ name: 'Bob' });

// create a new peer connection (with default constraints)
// that will be used for our peer connection with sue
var connection = rtc.createConnection();

// ok let's try and create this connection
var coupling = rtc.couple(connection, { name: 'Sue' }, signaller);

// track the connection state
coupling.once('active', function() {
  console.log('we have connected');
});