## Introducing rtc.io

rtc.io is a collection of node.js modules that simplify WebRTC development.

- access local camera and microphone
- create audio and video calls between browsers
- set up data channels between browsers
- provide communication management
- set up a signalling server

## Getting started with rtc.io

The [rtc](module-rtc.html) module is a pre-bundled collection of the rtc.io modules you need to get started building your own WebRTC application. You can load this module directly in your HTML page or include it as a require.js module.

Grab the latest build of [rtc](module-rtc.html) from https://github.com/rtc-io/rtc.

```html
<script src="path/to/rtc.js"></script>
```

```js
var rtc = RTC({room: 'test-room' });

rtc.on('ready', yourInitFunction);
```

The full suite of rtc.io modules are available individually via npm and can be included using `require()`. You'll need Browserify to prepare your CommonJS modules for the browser. For exmaple, to use [rtc-quickconnect](module-rtc-quickconnect.html):

- Install [Node and NPM](https://www.npmjs.org/)
- Install [Browserify](http://http://browserify.org/)
- `npm install rtc-quickconnect`

```js
var qc = require('rtc-quickconnect');
var connection = qc(opts);
```

The [Tutorial](tutorials.html) page has a step by step guide to introduce you to the basics of building WebRTC apps with rtc.io. If you already know what you're looking for, check out our complete [module list](modules.html)

## Testing and WebRTC

All of the stable modules in the rtc.io suite (and some of the unstable ones too) are being tested using continuous integration (a big thanks to [Travis CI](https://travis-ci.org/) for their excellent service).  We have further information on [our testing process](testing-process.html) if you are interested, and the current build status is displayed with each of our [modules](modules.html).