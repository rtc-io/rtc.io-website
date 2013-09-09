# Establishing an RTCPeerConnection

There are a number of steps involved with establishing a successful `RTCPeerConnection` between two hosts on different networks.  In many of the WebRTC demos around the place, this is done quite transparently but we think it's worth taking you through the overall process so you are well armed for diagnosing connectivity problems.

__NOTE:__ This demo uses `rtc.io` specific libraries as opposed to a general implementation.  See the other articles at the end of this tutorial for alternative resources using different approaches.

Essentially there are three phases when connecting two peers:

## Peer Discovery

The first step in having two (or more) peers connect with one another is the discovery phase.  In simple cases, this is done in the rtc.io stack using a [signaller](module-rtc-signaller.html):

<<< code/connect.js[:15]

You can see in the above code that we have announced ourselves and provided some simple data. Supplying this data is completely optional, and is only provided as a means to help other clients on the same "broadcast network" find us.

Additionally, it's worth noting that if an `id` data attribute if not provided a generic `UUID` will be generated and supplied to represent this client id.

Here is what [socket.io](https://socket.io) broadcast for us on the connected socket in response to the code above:

```
3:::/announce|{"id":"27b340b8-8472-4b38-ab3e-7d2fe56716a6","name":"Bob"}
```

Here we can see that we have issued an `/announce` command with a JSON payload containing the data about our client.  Depending on the server implementation, this message will then be passed onto other clients on the same broadcast channel.

## Peer Handshaking

Handshaking with another peer is done in the `rtc.io` suite using a `/request` command that is issued by the signaller.  Additionally, some higher level functions have been provided to make the job of "coupling" one `RTCPeerConnection` to another via a signalling channel simple.

Consider the following example, where we are attempting to get in touch with a client that has the name of "Sue":

<<< code/connect.js[17:22]

So the first thing that is happening here is that we are using the `createConnection` factory function to create our `RTCPeerConnection` object using a default set of contraints and standard options.  This takes the amount of code we need to write down quite a bit.

We then issue a `/request` command through calling using the [couple](https://github.com/rtc-io/rtc/blob/master/couple.js) module within `rtc` package.

If one of the connected clients acknowledges this request (the behaviour is automatic within the signaller, i.e. no additional code is required) then the internal `rtc` module code will continue with joining our local peer connection with the remote, discovered connection.

__NOTE:__ At the present point in time this method does not return "failure" (or we couldn't find your requested peer) states.  As such is currently advised that the `rtc.couple` function only be used after the local signaller has "announced" the remote connection.  This is on the [todo](https://github.com/rtc-io/rtc/issues/2) list.

In the instance that Sue is online and connected to the broadcast channel, then we will be able to track the progress of the network negotiation and signalling state using the returned `coupling` (which is a node-style [EventEmitter](http://nodejs.org/api/events.html#events_class_events_eventemitter))

## Signalling (via SDP)

To be completed.

## Network Negotiation (using ICE)

To be completed.

<a class="sample" data-sample="connect" href="#">Run Sample</a>