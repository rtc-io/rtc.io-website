var http = require('http');

// create the http server and implement your custom logic here
var server = http.createServer(function(res, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('I am a signalling server');
});

// bring in socket.io and have it bind to the http server
var io = require('socket.io').listen(server);

// initialise the socket-io signaller, and add some custom handlers
var signaller = require('rtc-signaller-socket.io')(io);

// when we get a new socket connection, send it to the signaller
io.sockets.on('connection', signaller);

// make our server listen on the specified port (default to 3000)
server.listen(process.env.PORT || 3000);