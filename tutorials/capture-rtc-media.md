# Using rtc-media for WebRTC media capture

In the our [previous tutorial](tutorial-capture-media.html) we looked at what was involved with capturing media in the browser using the vanilla `getUserMedia` API.

In this tutorial we will make use of the [rtc-media](/module-rtc-media.html) module to do most of the heavy lifting for us.  Consider the following code example:

<<< code/capture-rtc-media.js

This example performs exactly the same functionality (with a few additional smarts) as the code in our previous example.