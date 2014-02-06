var quickconnect = require('rtc-quickconnect');

quickconnect('http://rtc.io/switchboard/', { room: 'chat-tutorial' })
  .createDataChannel('chat')
  .on('chat:open', function(dc, id) {
    console.log('a data channel has been opened to peer: ' + id);
  });