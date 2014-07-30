# Video mirror

In order to share video streams we can use the [rtc-media](module-rtc-media.html) module to help us manage the video and audio feed for each user. This demo shows how to get access to the local user's video and audio stream and render it to the browser.

Include the rtc-media module. This will return a reference to the rtc-media object.

<<< code/simple-video-mirror.js[1:1]

Now we can call the returned media object to get access to user's local video and audio stream - in this case we just need to pass an option to tell the browser to start streaming media immediately.

<<< code/simple-video-mirror.js[2:2]

We'll also need a reference to the DOM element that we want to render the video stream to.

<<< code/simple-video-mirror.js[3:3]

Now we simply call `render` with the target element as the argument, to display the video feed. Given a `<video>` element, rtc-media will render the new stream to that element. Given any other element rtc-media will create a `<video>` element as a child element.

<<< code/simple-video-mirror.js[6:6]

To create a realistic mirror experience we will flip the rendered video.

<<< code/simple-video-mirror.js[10:10]

The result is a local video mirror!

<<< code/simple-video-mirror.js




