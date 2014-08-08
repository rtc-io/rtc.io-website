var quickconnect = require('rtc-quickconnect');

quickconnect('//switchboard.rtc.io/', { room: 'chat-tutorial' })
  .createDataChannel('chat')
  .on('channel:opened:chat', function(id, dc) {
    console.log('a data channel has been opened to peer: ' + id);
  });