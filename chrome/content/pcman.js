// Main Program

'use strict';

function PCMan(global) {
    this.global = global;

    // use it as callback when async loading relevant data of initialization
    this.onload();
}

PCMan.prototype = {
    onload: function() {
        this.ui = new BrowserUtils(this);
        this.ui.menu = new BrowserMenus(this.ui);
        this.conn = new Conn(this);
        this.conn.app = new AppCom(this.conn);
        this.view = new TermView(this);
        this.view.selection = new TermSel(this.view);
        this.view.inputHandler = new InputHandler(this.view);
        this.buf = new TermBuf(this);
        this.parser = new AnsiParser(this.buf);
        this.stringBundle = this.ui.getElementById("pcman-string-bundle");

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
        this.ui.setFocus();
        this.view.onResize();

        var temp = this;
        this.conn.idleTimeout = this.ui.setTimer(false, function() {
            temp.conn.sendIdleString();
        }, 180000);
    },

    close: function() {
        if (this.conn.app.ws) {
            this.abnormalClose = true;
            this.conn.close();
        }

        this.view.removeEventListener();
        this.ui.menu.onClose();
        this.ui.setConverter();

        // added by Hemiola SUN 
        this.view.blinkTimeout.cancel();
        this.conn.idleTimeout.cancel();
    },

    onConnect: function(conn) {
        this.ui.updateTabIcon('connect');
    },

    onData: function(conn, data) {
        //alert('data('+data.length +') ' +data);
        this.parser.feed(data); // parse the received data
        this.view.update(); // update the view
        //alert('end data');
    },

    onClose: function(conn) {
        if (this.abnormalClose) return;

        /* alert(this.stringBundle.getString("alert_conn_close")); */
        this.ui.updateTabIcon('disconnect');
    },

    copy: function() {
        if (!this.view.selection.hasSelection())
            return;
        var text = this.view.selection.getText();

        var _this = this;
        this.conn.app.copy(text, function() {
            _this.ui.dispatchCopyEvent(_this.view.input);
        });
        this.view.selection.cancelSel(true);
    },

    paste: function() {
        var _this = this;
        this.conn.app.paste(function(text) {
            _this.conn.convSend(text, 'big5');
        });
    },

    selAll: function() {
        this.view.selection.selectAll();
    }
};

