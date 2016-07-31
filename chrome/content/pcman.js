// Main Program

'use strict';

function PCMan(global) {
    this.global = global;

    this.ui = new BrowserUtils(this);
    this.ui.storage = new BrowserStorage(this.ui);
    //this.prefs = new Preferences(this, PrefDefaults);
    //this.onload();
    var _this = this;
    var prefs = new Preferences(this, PrefDefaults, function(prefs) {
        _this.onload(prefs);
    });
}

PCMan.prototype = {
    onload: function(prefs) {
        if (prefs) this.prefs = prefs;
        this.prefs.handler = new PrefHandler(this.prefs);
        this.ui.menu = new BrowserMenus(this.ui);
        this.ui.menu.setContextMenu(new ContextMenu(this.ui.menu));
        this.ui.socket = new BrowserComm(this.ui);
        this.conn = new Conn(this);
        this.conn.ssh = new SSH(this.conn);
        this.view = new TermView(this);
        this.view.selection = new TermSel(this.view);
        this.buf = new TermBuf(this);
        this.parser = new AnsiParser(this.buf);

        var _this = this;
        this.ui.setConverter(function() {
            _this.connect(_this.ui.getUrl());
        });
    },

    connect: function(url) {
        var parts = url.split(':');
        var port = 23;
        if (parts.length > 1)
            port = parseInt(parts[1], 10);
        this.conn.connect(parts[0], port);

        this.ui.updateTabTitle();
        this.view.onResize();
    },

    onbeforeunload: function(event) {
        if (this.prefs.get('AskForClose') && this.conn.isConnected) {
            event.returnValue = this.conn.host + ':' + this.conn.port;
            return event.returnValue;
        }
    },

    close: function() {
        if (this.conn.isConnected) {
            this.abnormalClose = true;
            this.conn.close();
        }

        this.view.onClose();
        this.ui.menu.onClose();
        this.prefs.onChanged();
    },

    onConnect: function(conn) {
        this.ui.updateTabIcon('connect');
    },

    onData: function(conn, data) {
        this.parser.feed(data); // parse the received data
        this.view.update(); // update the view
    },

    onClose: function(conn) {
        if (this.abnormalClose) return;

        this.ui.updateTabIcon(this.conn.connectFailed ? 'fail' : 'disconnect');
    },

    copy: function() {
        if (!this.view.selection.hasSelection())
            return;
        var text = this.view.selection.getText();

        var _this = this;
        this.conn.socket.copy(this.ui.formatCRLF('copy', text), function() {
            _this.ui.dispatchCopyEvent(_this.view.input);
        });
        if (this.prefs.get('ClearCopiedSel'))
            this.view.selection.cancelSel(true);
    },

    paste: function() {
        var _this = this;
        this.conn.socket.paste(function(text) {
            text = _this.ui.formatCRLF('paste', text);
            var EnterKey = _this.prefs.get('EnterKey');
            text = text.replace(/\r/g, EnterKey);
            var LineWrap = _this.prefs.get('LineWrap');
            if (text.indexOf('\x1b') > -1) // don't wrap ansi text
                LineWrap = 0;
            text = _this.prefs.handler.wrapText(text, LineWrap, EnterKey);
            //FIXME: stop user from pasting DBCS words with 2-color
            text = text.replace(/\x1b/g, _this.prefs.get('EscapeString'));
            var charset = _this.prefs.get('Encoding');
            _this.conn.convSend(text, charset);
        });
    },

    selAll: function() {
        this.view.selection.selectAll();
    }
};

