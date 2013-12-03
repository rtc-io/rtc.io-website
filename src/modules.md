# rtc.io Module Reference

The rtc.io suite is made up of a number of modules, which cater for different needs.

## Client Modules

The following is a list of modules that are designed for use within a browser.  Each of these modules (unless otherwise specified) is designed to be built into an application using [browserify](http://browserify.org/). In our experience, using browserify in conjunction with [npm](https://npmjs.org/) provides a very smooth development experience.

### [rtc-quickconnect](/module-rtc-quickconnect.html)

Provides a high level wrapper around the lower-level client libraries and is designed to get you building WebRTC applications very quickly.

### [rtc-glue](/module-rtc-glue.html)

Designed to provide a pure HTML tag based approach to building WebRTC applications, `rtc-glue` does not require any Javascript code to be written to create an application.  Simply include the provided `glue.js` file in your HTML page, provide some additional HTML attributes on well known HTML elements and you will be well on your way to creating simple applications.

### [rtc](/module-rtc.html)

The `rtc` module is a collection of reusable functions that assist developers wanting to work with WebRTC at a lower level.  It is designed to assist with some of the repetitive tasks that are associated with developing WebRTC applications.

### [rtc-signaller](/module-rtc-signaller.html)

Signalling is a big part of any WebRTC application.  The `rtc-signaller` module is the rtc.io suites signalling layer, and is designed as a "transport agnostic" signalling mechanism.

While in almost all our WebRTC implementations we have used websockets for signalling, the `rtc-signaller` module is capable of signalling and coordinating connections over any bi-directional communication channel that supports sending text messages.

### [rtc-core](/module-rtc-core.html)

The `rtc-core` module contains some lower-level, shared functionality that is used by most of the above client-side libraries.  It assists with cross-browser detection of `RTCPeerConnection` classes and other similar functions.

## Server Modules

While the clientside modules make up 85% of the rtc.io suite, we do have some server-side node modules that are designed to work with our client side modules when building applications.

### [rtc-switchboard](/module-rtc-switchboard.html)

This is the server-side companion to the `rtc-signaller` module.  If you are looking to host a simple in-memory signalling server this is an excellent place to start.

It has been constructed using [primus](https://github.com/primus/primus) for the websocket communication layer, which means that different node websocket implementations can be used in your applications.

The switchboard can either be incorporated into your node server application code, or hosted separately - whatever best suits your application architecture.