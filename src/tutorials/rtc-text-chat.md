# Text chat using the data channel

This demo shows how to use the [rtc](https://github.com/rtc-io/rtc) module to set up a data channel and exchange text messages without requiring access to audio or video devices.

Include the bundled rtc module in your HTML page (get the latest build from https://github.com/rtc-io/rtc/build). The rtc module can also be loaded using require.js.

```html
<script src="path/to/rtc.js"></script>
```
First we will need to define the options to pass into RTC. A room and a signalling server are required - you can use our hosted signalling server `//switchboard.rtc.io` for testing purposes. Make sure to add the 'capture: false' option so you are not being asked to access a camera or microphone. The [rtc-switchboard](module-rtc-switchboard.html) module is also available to deploy on your own servers.

<<< code/rtc-text-chat.js[2:6]

Now we can call `RTC` to start a session. This will automatically set the room up for a data channel connection.

<<< code/rtc-text-chat.js[9:9]

We'll need a reference to the DOM element that we want to add our text messages to.

<<< code/rtc-text-chat.js[12:12]

Before we can start sharing text via a data channel we need to wait for the signalling server to create our session. The rtc module fires a `ready` event when our session is ready to work with.

<<< code/rtc-text-chat.js[38:38]

Once a session is established we can create a data channel and listen for it's `opened` event. The data channel in this example retains packet order and tries resending a lost packet a maximum of 12 times.

<<< code/rtc-text-chat.js[29:35]

Finally, bind the data channel events so that our users can update the shared text box.

<<< code/rtc-text-chat.js[15:26]

Here's the full script:

<<< code/rtc-text-chat.js

And here's the full HTML page to go with it:

<<< code/rtc-text-chat.html