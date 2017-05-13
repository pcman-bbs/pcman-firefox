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
    } else {
        this.connect = this.connectWebSocket;
        this.send = this.sendWebSocket;
        this.onunload = this.onunloadWebSocket;
        this.copy = this.copyWebSocket;
        this.paste = this.pasteWebSocket;
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
    /*if(!this.ws)
        return;*/
    var clipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
        .getService(Components.interfaces.nsIClipboardHelper);
    clipboardHelper.copyString(text);
    if (callback)
        callback();
};

BrowserComm.prototype.pasteXUL = function(callback) {
    /*if(!this.ws)
        return;*/
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
    var ws = new WebSocket(wsUri);
    ws.binaryType = 'arraybuffer';

    ws.onopen = function(event) {
        if (ws.readyState == 1)
            conn.socket.send(host + ':' + port, 'con');
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
        var data = String.fromCharCode.apply(null, new Uint8Array(event.data));
        var action = data.substr(0, 3);
        var content = data.substr(3);
        switch (action) {
            case "con":
                conn.onStartRequest();
                break;
            case "dat":
                conn.onDataAvailable(content);
                break;
            case "dis":
                conn.onStopRequest();
                break;
            case "cop":
                conn.socket.copyCallback();
                break;
            case "pas":
                conn.socket.pasteCallback(decodeURIComponent(escape(content)));
                break;
            default:
        }
    };
    this.ws = ws;
};

BrowserComm.prototype.sendWebSocket = function(output, action) {
    if (!this.ws)
        return;
    if (this.ws.readyState != 1)
        return;
    if (!action)
        action = 'dat';
    this.ws.send((new Uint8Array(Array.prototype.map.call(
        action + output,
        function(x) {
            return x.charCodeAt(0);
        }
    ))).buffer);
};

BrowserComm.prototype.onunloadWebSocket = function() {
    if (!this.ws)
        return;
    this.send('', 'dis');
    this.ws.close();
    this.ws = null;
};

BrowserComm.prototype.copyWebSocket = function(text, callback) {
    if (!this.ws)
        return;
    this.send(unescape(encodeURIComponent(text)), 'cop');
    this.copyCallback = callback;
};

BrowserComm.prototype.pasteWebSocket = function(callback) {
    if (!this.ws)
        return;
    this.send('', 'pas');
    this.pasteCallback = callback;
};

