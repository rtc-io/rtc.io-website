# Simple Signalling with Socket.IO (Part 1)

While not part of the WebRTC spec, signalling is a very important part of WebRTC and allows peer A and peer B to locate each other and exchange data required to successfully form a peer connection.

In this tutorial we will look at how to setup and use the [rtc-signaller-socket.io](module-rtc-signaller-socket.io.html) module to leverage [Socket.IO](http://socket.io/) for our signalling comms.

## Creating the Server

Let's walk through the creation of the signalling server step-by-step.  First let's create a directory for your server:

```
mkdir signalling-test
cd signalling-test
```

Now, let's initialize the project as a npm project:

```
npm init
```

If you don't have `node` and `npm` installed, then you will need to do that now.  After answering the questions during the `npm init` step (feel free to use the default answers) you will find that your directory has a shiny new `package.json` file in it.   Let's continue by importing some modules required to make the project work:

```
npm install socket.io rtc-signaller-socket.io --save
```

This will ask npm to install the latest stable versions of both `socket.io` and `rtc-signaller-socket.io` and save them in your list of project dependencies.  All being well, your `package.json` file should look something like the one shown below after the command has completed:

<<< code/test-signaller/package.json

OK.  It's now time to create our `server.js` file that will fire up our test signalling server.

<<< code/test-signaller/server.js

With this file complete, you should then be able to run `npm start` in your project directory and see output similar to the following:

```
> test-signaller@0.0.0 start /home/doehlman/code/rtc.io/rtc.io/code/test-signaller
> node server.js

   info  - socket.io started
```

To test if your signalling server is working, you can load up the following page on rtc.io which will attempt to connect to a signalling server running on `localhost` at port `3000`.

<a class="sample" data-sample="test-connection" href="#">Test Connection to your Local Signalling Server</a>

Otherwise, feel free to move onto the next part of the tutorial, which looks at the client aspects:

[Simple Signalling with Socket.IO (Part 2)](tutorial-simple-signalling-socket-io-part2.html)