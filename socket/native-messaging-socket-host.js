#!/usr/local/bin/node

// Might be good to use an explicit path to node on the shebang line in case
// it isn't in PATH when launched by Chrome.

var net = require('net'); // Node.js v0.11.13+
var socket = null;

var nativeMessage = require('./chrome-native-messaging.js');

var input = new nativeMessage.Input();
var transform = new nativeMessage.Transform(messageHandler);
var output = new nativeMessage.Output();

process.stdin
    .pipe(input)
    .pipe(transform)
    .pipe(output)
    .pipe(process.stdout);

input.on('end', function() {
    if (!socket) return;
    socket.destroy();
    socket = null;
});

function messageHandler(msg, push, done) {
    switch (msg.action) {
        case "connect":
            socket = net.createConnection(msg.port, msg.host, function() {
                push({
                    action: "connected"
                });
            }).on('data', function(data) {
                var str = Buffer.from(data, 'binary').toString('base64');
                //FIXME: split data for the maximum size of str is 1 MB
                push({
                    action: "data",
                    content: str
                });
            }).on('error', function(error) {
                // 'close' event will be called directly following this event 
                //console.error(error);
            }).on('close', function(had_error) {
                if (!socket) // input got EOF
                    return;
                push({
                    action: "disconnected"
                });
            });
            break;
        case "data":
            var data = Buffer.from(msg.content, 'base64').toString('binary');
            socket.write(data, 'binary');
            break;
        case "disconnect":
            socket.destroy();
            socket = null;
            break;
        default:
    }
    done();
}

if (!Buffer.from) { // before Node.js v4.5.0
    Buffer.from = function(str, encoding) {
        return new Buffer(str, encoding); // deprecated from Node.js v6.x
    };
}

