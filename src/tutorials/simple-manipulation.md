# Processing Video Streams

One of the really "fun" things that you can do with WebRTC and media capture in general, is to do some post-processing on the captured video. This is a reasonably simple process whereby, you draw the video frames to a `<canvas>` element and then get the pixel data, manipulate the data and then push it back to the canvas.

As with other parts of the rtc.io suite, we've tried to make this as simple as possible, and much of the magic is achieved by using the [rtc-canvas](module-rtc-canvas.html) helper module.

The `rtc-canvas` module allows you to render a captured `rtc-media` stream to a virtual `<video>` element which redraws it's content on a canvas.  This virtual video element also has a processing pipeline that you can add manipulation methods to using the `.pipeline.add(handler)` method.

For example, here is what you will commonly include if you wish to do some video manipulation using the `rtc-canvas` module:

<<< code/simple-manipulation.js[:9]

Next, let's take a look at our `handleDraw` function:

<<< code/simple-manipulation.js[10:]

This code takes the image data that has already been extracted via the canvas 2d context [getImageData](http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#dom-context-2d-getimagedata) method and applies some processing to it (in this case a simple grayscale filter).

By returning true at the end of the function, we are flagging to the `rtc-canvas` module that modifications have been made to the reference pixel data and that a [putImageData](http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#dom-context-2d-putimagedata) call should be made to replace the contents of the canvas.

<a class="sample" data-sample="simple-manipulation" href="#">Run Sample</a>

## Adjusting the Capture Rate

By default, the canvas is set to capture at 25 fps, but this can be adjusted if you feel like giving your CPU a bit of a rest:

```js
// capture media
media().render(vid = canvas(document.body, { fps: 5 }));
```