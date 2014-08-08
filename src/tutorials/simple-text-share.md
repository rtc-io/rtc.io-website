# Simple shared text box

The essential part of any WebRTC application is a connection between peers. We will use the [rtc-quickconnect](module-rtc-quickconnect.html) module to allow us to easily create a connection and share data.

First, we need to include the rtc-quickconnect module:

<<< code/simple-text-share.js[2:2]

Next, call the quickconnect module with the location of your signalling server and your connection options - this will return a reference to our connection object. For now we will use the rtc.io signalling server at http://rtc.io/switchboard/ (for testing purposes only). The [rtc-switchboard](module-rtc-switchboard.html) module can be deployed on your own servers.

In our options object we will include a room name to tell the siganlling server which peers should be connected to each other.

<<< code/simple-text-share.js[3:3]

We'll also need to create and reference a contenteditable DOM element where our users will type text to share.

<<< code/simple-text-share.js[6:11]

Now that we have a reference to our connection object we use it to create a data channel to send our text over.

<<< code/simple-text-share.js[14:14]

Once our channel is created we can listen on our connection object for it's events. For a full list of the events available, see the documentation for the [rtc-quickconnect](module-rtc-quickconnect.html) module.

<<< code/simple-text-share.js[15:17]

Now that our peers are connected in a named room and have a data channel open we can start sending and receiving data over the connection.

<<< code/simple-text-share.js[19:]

This creates a basic shared text box.

<<< code/simple-text-share.js

