// create socket to server or agent

'use strict';

var EXPORTED_SYMBOLS = ["BrowserComm"];

function BrowserComm(ui) {
    this.listener = ui.listener;
    this.ws = null;
    this.onload();
}

BrowserComm.prototype.onload = function() {
    if (this.ws)
        return this.onunload();
    if (Components && Components.classes) {
        this.connect = this.connectXUL;
        this.send = this.sendXUL;
        this.onunload = this.onunloadXUL;
        this.copy = this.copyXUL;
        this.paste = this.pasteXUL;
    } else if (!chrome || !chrome.extension) {
        this.connect = this.connectWebSocket;
        this.send = this.sendWebSocket;
        this.onunload = this.onunloadWebSocket;
        this.copy = this.copyWebSocket; // not used
        this.paste = this.pasteWebSocket;
    } else {
        this.connect = this.connectNative;
        this.send = this.sendNative;
        this.onunload = this.onunloadNative;
        this.copy = this.copyNative; // not used
        this.paste = this.pasteNative; // not used
    }
};

BrowserComm.prototype.connectXUL = function(conn, host, port) {
    if (this.ws)
        this.onunload();

    this.ws = {};
    this.ws.ts = Components.classes["@mozilla.org/network/socket-transport-service;1"]
        .getService(Components.interfaces.nsISocketTransportService);

    // create the socket
    this.ws.trans = this.ws.ts.createTransport(null, 0, host, port, null);
    this.ws._ins = this.ws.trans.openInputStream(0, 0, 0);
    this.ws.outs = this.ws.trans.openOutputStream(0, 0, 0);

    // initialize input stream
    this.ws.ins = Components.classes["@mozilla.org/binaryinputstream;1"]
        .createInstance(Components.interfaces.nsIBinaryInputStream);
    this.ws.ins.setInputStream(this.ws._ins);

    // data handler
    var _this = this;
    var callback = {
        onStartRequest: function(req, ctx) {
            conn.onStartRequest();
        },

        onStopRequest: function(req, ctx, status) {
            conn.onStopRequest();
        },

        onDataAvailable: function(req, ctx, ins, off, count) {
            var content = '';
            while (count > content.length)
                content += _this.ws.ins.readBytes(count - content.length);
            conn.onDataAvailable(content);
        }
    };

    // data listener
    var pump = Components.classes["@mozilla.org/network/input-stream-pump;1"]
        .createInstance(Components.interfaces.nsIInputStreamPump);
    pump.init(this.ws._ins, -1, -1, 0, 0, false);
    pump.asyncRead(callback, null);
    this.ws.ipump = pump;
};

BrowserComm.prototype.sendXUL = function(output) {
    if (!this.ws)
        return;
    this.ws.outs.write(output, output.length);
    this.ws.outs.flush();
};

BrowserComm.prototype.onunloadXUL = function() {
    if (!this.ws)
        return;
    this.ws.ins.close();
    this.ws.outs.close();
    this.ws = null;
};

BrowserComm.prototype.copyXUL = function(text, callback) {
    var clipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
        .getService(Components.interfaces.nsIClipboardHelper);
    clipboardHelper.copyString(text);
    if (callback)
        callback();
};

BrowserComm.prototype.pasteXUL = function(callback) {
    // From: https://developer.mozilla.org/en/Using_the_Clipboard
    var clip = Components.classes["@mozilla.org/widget/clipboard;1"]
        .getService(Components.interfaces.nsIClipboard);
    if (!clip)
        return false;
    var trans = Components.classes["@mozilla.org/widget/transferable;1"]
        .createInstance(Components.interfaces.nsITransferable);
    if (!trans)
        return false;
    trans.addDataFlavor("text/unicode");
    clip.getData(trans, clip.kGlobalClipboard);
    var data = {};
    var len = {};
    trans.getTransferData("text/unicode", data, len);
    if (!data || !data.value)
        return;
    var s = data.value.QueryInterface(Components.interfaces.nsISupportsString);
    s = s.data.substring(0, len.value / 2);
    if (callback)
        callback(s);
    else
        return s;
};

BrowserComm.prototype.connectWebSocket = function(conn, host, port) {
    if (this.ws)
        this.onunload();

    var wsUri = window.location.href.replace('http', 'ws');
    if (wsUri.indexOf('#') >= 0)
        wsUri = wsUri.substr(0, wsUri.indexOf('#'));
    if (wsUri.indexOf('?') >= 0)
        wsUri = wsUri.substr(0, wsUri.indexOf('?'));
    wsUri = wsUri.replace(/\/$/, '') + '/hostPort_' + host + ':' + port;
    var ws = new WebSocket(wsUri);
    ws.binaryType = 'arraybuffer';

    var remoteConnected = false;
    ws.onopen = function(event) {
        if (ws.readyState == 1)
            remoteConnected = false;
    };
    ws.onclose = function(event) {
        ws = null;
        if (conn.socket.ws) // socket abnormal close
            conn.onStopRequest();
    };
    ws.onerror = function(event) {
        //conn.listener.ui.debug(event.data);
        ws = null;
        conn.onStopRequest();
    };
    ws.onmessage = function(event) {
        if (!remoteConnected)
            conn.onStartRequest();
        remoteConnected = true;
        var data = String.fromCharCode.apply(null, new Uint8Array(event.data));
        conn.onDataAvailable(data);
    };
    this.ws = ws;
};

BrowserComm.prototype.sendWebSocket = function(output) {
    if (!this.ws)
        return;
    if (this.ws.readyState != 1)
        return;
    this.ws.send((new Uint8Array(Array.prototype.map.call(output, function(x) {
        return x.charCodeAt(0);
    }))).buffer);
};

BrowserComm.prototype.onunloadWebSocket = function() {
    if (!this.ws)
        return;
    this.ws.close();
    this.ws = null;
};

BrowserComm.prototype.copyWebSocket = function(text, callback) {
    var _this = this;
    var split = 100;
    var copy = function(data) {
        var url = '/clipboard?' + (data == text ? 'copy' : 'appe') + '=';
        url += encodeURIComponent(data.substr(0, split));
        _this.listener.ui.read(url, function(msg) {
            if (!data.substr(split))
                return callback(msg);
            copy(data.substr(split));
        });
    };
    copy(text);
};

BrowserComm.prototype.pasteWebSocket = function(callback) {
    this.listener.ui.read('/clipboard', function(text) {
        callback(decodeURIComponent(text));
    });
};

BrowserComm.prototype.connectNative = function(conn, host, port) {
    if (this.ws)
        this.onunload();

    var wsUri = 'org.pcman.pcmanfx2.webextensions.socket';
    var ws = chrome.runtime.connectNative(wsUri);

    ws.onMessage.addListener(function(msg) {
        switch (msg.action) {
            case "connected":
                conn.onStartRequest();
                break;
            case "data":
                conn.onDataAvailable(atob(msg.content));
                break;
            case "disconnected":
                ws = null;
                if (conn.socket.ws) // socket abnormal close
                    conn.onStopRequest();
                break;
            default:
        }
    });

    ws.postMessage({
        action: "connect",
        host: host,
        port: port
    });

    this.ws = ws;
};

BrowserComm.prototype.sendNative = function(output, action) {
    if (!this.ws)
        return;
    this.ws.postMessage({
        action: "data",
        content: btoa(output.split('').map(function(x) {
            return String.fromCharCode(x.charCodeAt(0) % 0x100);
        }).join(''))
    });

};

BrowserComm.prototype.onunloadNative = function() {
    if (!this.ws)
        return;
    this.ws.postMessage({
        action: "disconnect"
    });
    this.ws.disconnect();
    this.ws = null;
};

BrowserComm.prototype.copyNative = function(text, callback) {
    var helper = this.systemClipboard(text);
    this.listener.ui.document.execCommand('copy');
    this.systemClipboard(text, helper);
    if (callback)
        callback();
};

BrowserComm.prototype.pasteNative = function(callback) {
    var helper = this.systemClipboard();
    this.listener.ui.document.execCommand('paste');
    var text = this.systemClipboard('', helper);
    if (callback)
        callback(text);
    else
        return text;
};

BrowserComm.prototype.systemClipboard = function(text, sandbox) {
    var initial = !sandbox;
    if (initial) {
        sandbox = this.listener.ui.document.createElement('textarea');
        sandbox.style.position = 'absolute';
        sandbox.style.left = '-100px';
        this.listener.view.input.parentNode.appendChild(sandbox);
    }
    if (text && initial) { // prepare copying string to system clipboard
        sandbox.value = text;
        sandbox.select();
        return sandbox;
    } else if (text) { // finalize copying
        sandbox.parentNode.removeChild(sandbox);
        this.listener.view.input.focus();
    } else if (initial) { // prepare pasting string from system clipboard
        sandbox.contentEditable = 'true'; // For Firefox
        sandbox.select();
        return sandbox;
    } else { // finalize pasting
        text = sandbox.value;
        sandbox.parentNode.removeChild(sandbox);
        this.listener.view.input.focus();
        return text;
    }
};

BrowserComm.prototype.pasteEnabled = function(event) {
    if (event.type == 'keydown') {
        var enabled = false;
        var preventDefault = true;
        if (chrome && chrome.extension) { // GC Extensions or WebExtensions
            enabled = true;
        } else if (chrome && chrome.runtime) { // normal web pages in GC
            preventDefault = false; // use browser default hotkey
            enabled = true; // document.execCommand('paste') should do nothing
        } else {
            try {
                var doc = this.listener.ui.document;
                enabled = doc.queryCommandSupported('paste') && doc.queryCommandEnabled('paste'); // true in IE and error before FX 41
            } catch (e) {}
        }
        if (preventDefault) {
            event.preventDefault();
            event.stopPropagation();
        }
        return enabled;
    }
    // event.type == 'click'
    if (chrome && chrome.extension) // GC Extensions or WebExtensions
        return true;
    try {
        var doc = this.listener.ui.document;
        return (doc.queryCommandSupported('paste') && doc.queryCommandEnabled('paste')); // true in IE and error before FX 41
    } catch (e) {}
    return false;
};

