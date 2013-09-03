# What is WebRTC?

WebRTC is enabling a revolution of web communications, but it can be tricky
to get started.

The rtc.io suite is a collection of open source node.js modules that can be installed with npm to:

- access local camera and microphone
- create audio and video calls between browsers
- set up data channels between browsers
- provide communication management
- set up a signalling server

You get to pick and choose as needed.

## Cherry picking the functionality you need

When browsing through the [demos](demos.html) you will probable notice that
the `rtc` module is referenced mostly.  By using [browserify](https://github.com/substack/browserify) only the functionality you need will be built into the final application code.

If, however, you want to make absolutely sure then you can manually pull in only the modules that you want.  You can use the following list as a guide to help map from the `rtc/specific` require statement to the relevant standalone module:

- `rtc/media` can be sourced from [rtc-media](module-rtc-media.html)
- `rtc/signaller` can be sourced from [rtc-signaller](module-rtc-signaller.html)