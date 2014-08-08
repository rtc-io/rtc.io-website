# Video chat with shared text area

This demo shows how to use the [rtc](https://github.com/rtc-io/rtc) module to start a shared session, render the local and remote users' video streams, and use a data channel to create a shared text area for users.

Include the bundled rtc module in your HTML page (get the latest build from https://github.com/rtc-io/rtc/build). The rtc module can also be loaded using require.js.

```html
<script src="path/to/rtc.js"></script>
```
First we will need to define the options to pass into RTC. A room and a signalling server are required - you can use our hosted signalling server `//switchboard.rtc.io` for testing purposes. The [rtc-switchboard](module-rtc-switchboard.html) module is also available to deploy on your own servers.

<<< code/rtc-video-chat.js[2:5]

Now we can call `RTC` to start a session. This will automatically create the local and remote video streams, which we will add to our page later.

<<< code/rtc-video-chat.js[7:7]

We'll need references to the DOM elements that we want to add our video streams to.

<<< code/rtc-video-chat.js[8:11]

Then we can append the rendered video streams that RTC has created.

<<< code/rtc-video-chat.js[35:37]

We'll also need a reference to a contenteditable element for our users to share text with each other.

<<< code/rtc-video-chat.js[12:13]

Before we can start sharing text via a data channel we need to wait for the signalling server to create our session. The rtc module fires a `ready` event when our session is ready to work with.

<<< code/rtc-video-chat.js[39:40]

Once a session is established we can create a data channel and listen for it's `opened` event.

<<< code/rtc-video-chat.js[29:33]

Finally, bind the data channel events so that our users can update the shared text box.

<<< code/rtc-video-chat.js[15:27]

Here's the full script:

<<< code/rtc-video-chat.js

And here's the full HTML page to go with it:

<<< code/rtc-video-chat.html