# Testing WebRTC

This is a set of scripts designed to help you get up and running testing WebRTC applications on [travis](http://travis-ci.org). The scripts themselves are designed to be fetched during a travis `before_install` process and used to prepare your environment.

[![Build Status](https://travis-ci.org/rtc-io/webrtc-testing-on-travis.svg?branch=master)](https://travis-ci.org/rtc-io/webrtc-testing-on-travis)

## Usage

First, create a `.travis.yml` folder in your project that looks similar to the followng:

```yaml
language: node_js
node_js:
- 0.10

env:
  matrix:
    - BROWSER=chrome  BVER=stable
    - BROWSER=chrome  BVER=beta
    - BROWSER=chrome  BVER=unstable
    - BROWSER=firefox BVER=stable
    - BROWSER=firefox BVER=beta
    - BROWSER=firefox BVER=nightly

matrix:
  fast_finish: true

  allowed_failures:
    - env: BROWSER=chrome  BVER=unstable
    - env: BROWSER=firefox BVER=nightly

before_install:
  - ./setup.sh

before_script:
  - export DISPLAY=:99.0
  - sh -e /etc/init.d/xvfb start

after_failure:
  - for file in *.log; do echo $file; echo "======================"; cat $file; done || true
```

The most interesting part of the configuration file above is definitely the [`before_install`](http://docs.travis-ci.com/user/build-configuration/#before_install) section which defines a number of commands that will be executed in the TRAVIS environment prior to running the language appropriate `install` command.

The commands above are used to pull down the contents of this repository into a `.travis` within the travis build environment.  Once this is completed, the `./travis/setup.sh` command is run which will knows how to provision a browser based on a `BROWSER` (specifying the browser name) and `BVER` which defines the version to test.  This script is an only very slightly modified version of the [.travis-setup.sh](https://github.com/web-animations/web-animations-js/blob/master/.travis-setup.sh) script written by [@mithro](https://github.com/mithro).

This is where the [`matrix`](http://docs.travis-ci.com/user/build-configuration/#The-Build-Matrix) section comes into play.  In the `.travis.yml` file above, I've used the matrix to tell travis that I want to a few variants of both chrome and firefox.  It should be noted that the original script does this is a slightly different way, but I wanted to use the `BROWSER` environment variable later when running my `npm test` command.

### Testing [rtc.io](https://github.com/rtc-io)

I'll now talk about how the scripts in this repo are used to test particular modules within the [rtc.io suite](https://github.com/rtc-io).  If you'd prefer to just dig around in a repo, then feel free to take a look at [rtc-quickconnect](https://github.com/rtc-io/rtc-quickconnect).

Up until now, everything here is useful to anyone wanting to do headless browser testing using travis.  We are about to take a more opinionated turn into the world of node, and specifically [browserify](https://github.com/substack/node-browserify), [testling](https://github.com/substack/testling) and [tape](https://github.com/substack/tape).  I won't cover *why* I've chosed to use this toolchain here, but simply cover how to use these tools to achieve a level of testing zen seldom discovered on the Internet.

Let's begin our journey by taking a look at the relevant bits of a `package.json` file from the `rtc-quickconnect` repo:

```json
{
  "scripts": {
    "test": "testling -x ./.travis/start-$BROWSER.sh",
  },
  "devDependencies": {
    "tape": "^2",
    "testling": "^1"
  },
  "testling": {
    "files": "test/all.js"
  }
}
```

I'm obvsiouly leaving out a whole pile of stuff here, but what you see above are the bits that are required to "make it go".  You can see in the `scripts.test` section we are defining our test command as:

```
testling -x ./.travis/start-$BROWSER.sh
```

Executing this command in combination with our previously defined matrix, will execute either `testling -x ./.travis/start-chrome.sh` or `testling -x ./.travis/start-firefox.sh` depending on the environment.  At this stage, the [`start-firefox.sh`](https://github.com/DamonOehlman/webrtc-testing-on-travis/blob/master/start-firefox.sh) file doesn't do anything clever at all, but the [`start-chrome.sh`](https://github.com/DamonOehlman/webrtc-testing-on-travis/blob/master/start-chrome.sh) starts chrome with a number of [command-line switches](http://peter.sh/experiments/chromium-command-line-switches/) enabled that make testing WebRTC a whole lot easier.

And that's it (more or less). Testling does all of the hard work by creating a bridge between the running browser instance and itself to monitor test success, reporting failure through an error code that travis will  pick up as build failure.

## Testing Locally

For testing locally, I have a cloned version of this repo checked out on my local machine and I then create a symlink from it to a `.travis` directory in each project that uses this approach.  It's then a simple matter of running a command similar to the following to have magic happen locally:

```
BROWSER=chrome npm start
```

## Understanding Fake Media Devices

Both chrome and firefox provide approaches for simulating media capture with "fake" media devices.  It is important to note, however, that the approach outlined here will only provide fake media streams on chrome.  When testing rtc.io modules we typically make use of [rtc-media](https://github.com/rtc-io/rtc-media) as we have enabled use of firefox's "fake" capture constraint when we detect that we are running in a testling run testing environment:

https://github.com/rtc-io/rtc-media/commit/7b6cbce0efb2010e5218dfef0ea53b514385a395

## Prior Art

None of this would have been possible without the docs and code listed below:

- [Automated testing in Travis CI for WebRTC](http://lynckia.com/licode/travis-webrtc.html)

- `.travis-setup.sh` from the [web-animations-js](https://github.com/web-animations/web-animations-js) project

- Travis docs on [GUI and Headless Browsers](http://docs.travis-ci.com/user/gui-and-headless-browsers/)
