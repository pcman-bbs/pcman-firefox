// create socket to server or agent

'use strict';

var EXPORTED_SYMBOLS = ["BrowserSocket"];

function BrowserSocket(ui) {
    this.listener = ui.listener;
    this.ws = null;
    this.onload();
}

BrowserSocket.prototype.onload = function() {
    if (this.ws)
        this.onunload();
};

BrowserSocket.prototype.connect = function(conn, host, port) {
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

BrowserSocket.prototype.send = function(output) {
    if (!this.ws)
        return;
    this.ws.outs.write(output, output.length);
    this.ws.outs.flush();
};

BrowserSocket.prototype.onunload = function() {
    if (!this.ws)
        return;
    this.ws.ins.close();
    this.ws.outs.close();
    this.ws = null;
};

BrowserSocket.prototype.copy = function(text, callback) {
    /*if(!this.ws)
        return;*/
    var clipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
        .getService(Components.interfaces.nsIClipboardHelper);
    var os = Components.classes["@mozilla.org/xre/app-info;1"]
        .getService(Components.interfaces.nsIXULRuntime).OS;
    if (os == 'WINNT') // handle CRLF
        text = text.replace(/\n/g, "\r\n");
    clipboardHelper.copyString(text);
    if (callback)
        callback();
};

BrowserSocket.prototype.paste = function(callback) {
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
    s = s.replace(/\r\n/g, '\r');
    s = s.replace(/\n/g, '\r');
    if (callback)
        callback(s);
    else
        return s;
};

