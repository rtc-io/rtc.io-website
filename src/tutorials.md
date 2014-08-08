# Tutorials

These tutorials will step you through some basic demos to get you up to speed quickly using rtc.io. If you are looking for more advanced demos check our [demos](demos.html) page or see the full list of [modules](modules.html) for detailed documentation.

## Getting Started

Use the bundled rtc module to create a simple video chat with shared text box.

- [Basic video chat](tutorial-rtc-video-chat.html)

- [Text chat using the data channel](tutorial-rtc-text-chat.html)

## rtc.io Component Demos

rtc.io components are CommonJS modules which can be installed via npm and included as dependencies in your project using `require()`. We'll need to use Browserify to bundle our app with it's dependencies to run in the browser - see the [Browserify site](http://http://browserify.org/) for usage instructions.

Establishing a connection with rtc-quickconnect
- [Shared text box](tutorial-simple-text-share.html)

Establishing a data channel connection with rtc-quickconnect
- [Creating a simple WebRTC chat application](tutorial-quickconnect-chat.html)

Capturing user video and audio with rtc-media
- [Video mirror](tutorial-simple-video-mirror.html)

Stream Processing
- [Simple Video Manipulation](tutorial-simple-manipulation.html)


<!--
- [Creating a simple video conferencing application](tutorial-quickconnect-videoconferencing.html)
-->

<!-- ### Signalling

- [Simple Signalling using Socket.IO (Part 1)](tutorial-simple-signalling-socket-io-part1.html)
- [Simple Signalling using Socket.IO (Part 2)](tutorial-simple-signalling-socket-io-part2.html)
 -->

## Further Reading

Some presentations on the core capabilities of the rtc.io toolset:

- [http://rtc.io/presentations/lca_2014_webrtc/](http://rtc.io/presentations/lca_2014_webrtc/). More info about this in [Silvia's blog post](http://gingertech.net/2014/01/08/use-deck-js-as-a-remote-presentation-tool/), though we have since deprecated rtc-glue and are now recommending the use of rtc.

- [http://rtc.io/presentations/WDCNZ2014/](http://rtc.io/presentations/WDCNZ2014/). This presentation uses rtc for its demos.
