## Introducing rtc.io

rtc.io is a collection of node.js modules that simplify WebRTC development.

- access local camera and microphone
- create audio and video calls between browsers
- set up data channels between browsers
- provide communication management
- set up a signalling server

## Getting started with rtc.io

rtc.io uses npm for dependency management. You'll also need Browserify to prepare node modules for the browser.

- Install [Node and NPM](https://www.npmjs.org/)
- Install [Browserify](http://http://browserify.org/)
- `npm install -g rtc-quickconnect`
- `npm install -g rtc-media`

You can install any rtc.io module via npm. `rtc-quickconnect` and `rtc-media` are the modules you will need to complete our 'Getting Started' tutorial.

The [Tutorial](tutorials.html) page has a step by step guide to introduce you to the basics of building WebRTC apps with rtc.io. If you already know what you're looking for, check out our complete [module list](modules.html)

## Testing and WebRTC

All of the stable modules in the rtc.io suite (and some of the unstable ones too) are being tested using continuous integration (a big thanks to [Travis CI](https://travis-ci.org/) for their excellent service).  We have further information on [our testing process](testing-process.html) if you are interested, and the current build status is displayed with each of our [modules](modules.html).