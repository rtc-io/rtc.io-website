# WebRTC Media Capture Tutorial

This is a simple tutorial that looks at how to capture media from within
your browser using the [getUserMedia](http://www.w3.org/TR/mediacapture-streams/#dom-navigator-getusermedia) API.

The first thing we will do is work around the browser prefixing that exists
at the moment, you can do this manually if you prefer but in this tutorial we will make use of the [rtc-core](/modules-rtc-core.html) helper module:

<<< code/capture-media.js[:9]

Once we have everything ready to go, we can then make the request to capture the media:

<<< code/capture-media.js[11:24]

As outlined in the code comments, the `getUserMedia` function takes three arguments:

1. A constraints object which tells the browser the kind of media we are interested in.  This information can include specific requests such as video resolution.

2. A success callback that will be triggered if the request is successful.

3. A failure callback that is triggered if the request fails.

In our case we want to handle the success callback in our `renderMedia` function:

<<< code/capture-media.js[26:]

In our sample above, the `renderMedia` function simply creates a new `<video>` element and marks it to `autoplay` and then adds it to the DOM.  One point of note here is the different ways in which the browsers differ on how to associate the live stream with the video element.

Chrome uses a [blob URL](http://www.w3.org/TR/FileAPI/#url) whereas Mozilla uses the `mozSrcObject` to feed the media stream directly into the video element.

As you can see it takes a bit of code to capture media, using the standard browser APIs (even with a bit of detection help from `rtc-core`).  In our [next tutorial](/tutorial-capture-rtc-media.html) we will look at using the `rtc-media` module to take care of this functionality for us.