#!/usr/local/bin/node

// Might be good to use an explicit path to node on the shebang line in case
// it isn't in PATH when launched by Chrome.

var net = require('net');
var socket = null;

var nativeMessage = require('./chrome-native-messaging.js');

var input = new nativeMessage.Input();
var transform = new nativeMessage.Transform(messageHandler);
var output = new nativeMessage.Output();

process.stdin
    .pipe(input)
    .pipe(transform)
    .pipe(output)
    .pipe(process.stdout)
;

input.on('end', function() {
    if (!socket) return;
    socket.destroy();
    socket = null;
});

function messageHandler(msg, push, done) {
    switch (msg.action) {
    case "connect":
        socket = new net.Socket();
        socket.connect(msg.port, msg.host, function() {
            push({ action: "connected" });
        });

        socket.on('data', function(data) {
            var str = Buffer.from(data, 'binary').toString('base64');
            //FIXME: split data for the maximum size of str is 1 MB
            push({ action: "data", content: str });
        });

        socket.on('close', function() {
            push({ action: "disconnected" });
        });

        done();
        break;
    case "data":
        var data = Buffer.from(msg.content, 'base64').toString('binary');
        socket.write(data, 'binary');
        done();
        break;
    case "disconnect":
        socket.destroy();
        socket = null;
        done();
        break;
    default:
    }
}
