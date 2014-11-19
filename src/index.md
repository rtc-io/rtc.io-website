## Introducing rtc.io

rtc.io is a collection of node.js modules that simplify WebRTC development.

rtc.io does not only target node.js developers. It also provides a JavaScript library in the rtc module that can be used by any frontend application. That library was created using browserify and lives in the dist directory of the [rtc repository](https://github.com/rtc-io/rtc).

Features supported by rtc.io:

- access to local camera(s) and microphone(s)
- create audio and video calls between browsers
- set up data channels between browsers
- provide communication management
- set up a signalling server


## Getting started with rtc.io

The [rtc](module-rtc.html) module is a pre-bundled collection of the essential rtc.io modules you need to get started building your own WebRTC application. You can load this module directly in your HTML page or include it as a require.js module.

Grab the latest build of [rtc](module-rtc.html) from https://github.com/rtc-io/rtc/.

```html
<script src="path/to/rtc.js"></script>
```

```js
var rtcSession = RTC({room: 'test-room' });

rtcSession.on('ready', yourInitFunction);
```

## Using CommonJS?

The full suite of rtc.io modules, including [rtc](module-rtc.html), are available individually via npm and can be included using `require()`. You'll need Browserify (or a similar service) to prepare your CommonJS modules for the browser.

- Install [Node and NPM](https://www.npmjs.org/)
- Install [Browserify](http://browserify.org/)
- `npm install rtc`

```js
var rtc = require('rtc');
var rtcSession = rtc({room: 'test-room'});

rtcSession.on('ready', yourInitFunction);
```

- `browserify yourjsfile.js -o bundle.js`

The [Tutorial](tutorials.html) page has a step by step guide to introduce you to the basics of building WebRTC apps with rtc.io. If you already know what you're looking for, check out our complete [module list](modules.html)

## Testing and WebRTC

All of the stable modules in the rtc.io suite (and some of the unstable ones too) are being tested using continuous integration (a big thanks to [Travis CI](https://travis-ci.org/) for their excellent service).  We have further information on [our testing process](testing-process.html) if you are interested, and the current build status is displayed with each of our [modules](modules.html).
