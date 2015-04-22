// firstly, require quickconnect (browserify will take care of that for us)
var quickconnect = require('rtc-quickconnect');

// now create a new "conference" using switchboard.rtc.io for signalling
var conf = quickconnect('https://switchboard.rtc.io', {
  // a room name that we will join on the signalling server
  // we will connect to other people who join the same room
  room: 'rtcio:dctest',

  // specify that we want some ice servers to assist with STUN connectivity
  // freeice is a package that will provide us some random known servers
  iceServers: require('freeice')()
});

// tell quickconnect we want a datachannel for each connection
conf.createDataChannel('test');

// when each data channel is opened, send a message
conf.on('channel:opened:test', function(id, dc) {
  // dc is a plain old RTCDataChannel object, so just hook into the browser events
  dc.addEventListener('message', function(evt) {
    console.log('received data: ', evt.data + ' from peer: ' + id);
  });

  // now just send a simple message
  dc.send('hello');
});
