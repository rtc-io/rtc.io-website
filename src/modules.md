# rtc.io Module Reference

The rtc.io suite is made up of a number of modules, which cater for different needs.

## Browser Modules

The following is a list of modules that are designed for use within a browser.  Each of these modules (unless otherwise specified) is designed to be built into an application using [browserify](http://browserify.org/). In our experience, using browserify in conjunction with [npm](https://npmjs.org/) provides a very smooth development experience.

### [rtc-quickconnect](module-rtc-quickconnect.html)

Provides a high level wrapper around the lower-level client libraries and is designed to get you building WebRTC applications very quickly.

### [rtc-glue](module-rtc-glue.html)

Designed to provide a pure HTML tag based approach to building WebRTC applications, `rtc-glue` does not require any Javascript code to be written to create an application.  Simply include the provided `glue.js` file in your HTML page, provide some additional HTML attributes on well known HTML elements and you will be well on your way to creating simple applications.

### [rtc-mesh](module-rtc-mesh.html)

This is an experimental module that provides a simple way to synchronize data across peer connections using data channels.  Our testing has shown that interoperability between Chrome 32+ (currently beta) and Firefox 26 data channels is now quite solid.  Which opens up the opportunity for broader experimentation using data channels.

### [rtc-dcstream](module-rtc-dcstream.html)

This is a node compatible stream (streams2) module for working with WebRTC data channels.  As per `rtc-mesh` this module has been tested against Chrome 32+ and Firefox 26 and shown excellent interoperability.

### [rtc](module-rtc.html)

The `rtc` module is a collection of reusable functions that assist developers wanting to work with WebRTC at a lower level.  It is designed to assist with some of the repetitive tasks that are associated with developing WebRTC applications.

### [rtc-signaller](module-rtc-signaller.html)

Signalling is a big part of any WebRTC application.  The `rtc-signaller` module is the rtc.io suites signalling layer, and is designed as a "transport agnostic" signalling mechanism.

While in almost all our WebRTC implementations we have used websockets for signalling, the `rtc-signaller` module is capable of signalling and coordinating connections over any bi-directional communication channel that supports sending text messages.

### [rtc-core](module-rtc-core.html)

The `rtc-core` module contains some lower-level, shared functionality that is used by most of the above client-side libraries.  It assists with cross-browser detection of `RTCPeerConnection` classes and other similar functions.

## rtc-quickconnect plugins

### [rtc-sharedcursor](module-rtc-sharedcursor.html)

This module provides a simple way to implement cursor sharing in a WebRTC application.
The module is designed to work in conjuction with `rtc-quickconnect` sends small (48-bit) payloads of relative
mouse (or touch) changes via a WebRTC data channel to connected peers.

## Browser Utility Modules

### [rtc-captureconfig](module-rtc-captureconfig.html)

The `rtc-captureconfig` module is used in `rtc-glue` to convert simple string based attributes to valid WebRTC constraints that can be used in for media capture.

## Browser Processing Modules

Once you are capturing realtime video and audio in the browser, there is a lot that can be done in terms of video and audio analysis. Listed below are modules that assist doing exactly that:

### [rtc-videoproc](module-rtc-videoproc.html)

The video processing module allows you to replace a standard video element with a simulated video element using a HTML5 canvas.  This custom canvas provides a video processing pipeline that permits analysis and optional modification of the pixel data that is being drawn to the canvas.

### [rtc-audioproc](module-rtc-audioproc.html)

The audio processing module allows you to render a canvas to visualize audio from an audio or video element, or a getUserMedia stream. It uses the Web Audio API. This can be useful to display audio visually, or to track down when a video or audio element does not behave as you expect.

## Server Modules

While the clientside modules make up 85% of the rtc.io suite, we do have some server-side node modules that are designed to work with our client side modules when building applications.

### [rtc-switchboard](module-rtc-switchboard.html)

This is the server-side companion to the `rtc-signaller` module.  If you are looking to host a simple in-memory signalling server this is an excellent place to start.

It has been constructed using [primus](https://github.com/primus/primus) for the websocket communication layer, which means that different node websocket implementations can be used in your applications.

The switchboard can either be incorporated into your node server application code, or hosted separately - whatever best suits your application architecture.