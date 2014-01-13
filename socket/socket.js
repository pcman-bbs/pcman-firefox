var whitelist = "";
chrome.storage.local.get("whitelist", function(data) {
    whitelist = data.whitelist;
});
chrome.storage.onChanged.addListener(function(changes, namespace) {
    for(key in changes) {
        switch(key) {
        case "whitelist":
            //if(whitelist == changes[key].oldValue);
            whitelist = changes[key].newValue;
            break;
        default:
        }
    }
});

chrome.runtime.onMessageExternal.addListener(
    function(request, sender, sendResponse) {
        if(chrome.runtime.id != sender.id && whitelist.indexOf(sender.id) == -1)
            return;  // don't allow this extension access
        switch(request.action) {
        case "wake":
            sendResponse({action: "waked"});
            break;
        case "close":
            sendResponse({action: "closing"});
            window.close();
            break;
        default:
        }
    }
);

chrome.runtime.onConnectExternal.addListener(function(port) {
    if(whitelist.indexOf(port.sender.id) == -1)
        return;
    port.onMessage.addListener(function(msg) {
        switch(msg.action) {
        case "connect":
            var readSocket = function(port) {
                if(!port.name)
                    return;
                chrome.socket.read(port.name, 4096, function(readInfo) {
                    if(readInfo.resultCode > 0) { // has new data
                        var str = String.fromCharCode.apply(null, new Uint8Array(readInfo.data));
                        port.postMessage({
                            action: "data",
                            content: str
                        });
                        setTimeout(function() { readSocket(port); }, 40); // keep reading
                    } else if (readInfo.resultCode == -15) { // socket is closed
                        port.postMessage({ action: "disconnected" });
                    } else { // other errors
                        // dump('Unknown errors');
                    }
                });
            }
            chrome.socket.create('tcp', {}, function(createInfo) {
                port.name = createInfo.socketId;
                if(port.name > 0) {
                    chrome.socket.connect(port.name, msg.host, msg.port,
                        function(result) {
                            port.postMessage({ action: "connected" });
                            readSocket(port);
                        }
                    );
                } else {
                    // dump('Unable to create socket');
                }
            });
            break;
        case "data":
            if(!port.name)
                break;
            var byteArray = new Uint8Array(msg.content.split('').map(function(x){
                    return x.charCodeAt(0);
                }));
            chrome.socket.write(port.name, byteArray.buffer, function(writeInfo) {
                if(writeInfo.bytesWritten > 0) { // write successfully
                } else if (writeInfo.bytesWritten == -15) { // socket is closed
                    port.postMessage({ action: "disconnected" });
                } else { // other errors
                    // dump('Unknown errors');
                }
            });
            break;
        case "disconnect":
            if(!port.name)
                break;
            chrome.socket.disconnect(port.name);
            chrome.socket.destroy(port.name);
            port.name = null;
            break;
        default:
        }
    });
});
