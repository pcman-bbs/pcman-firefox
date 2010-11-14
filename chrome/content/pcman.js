// Main Program

function PCMan() {
    var canvas = document.getElementById("canvas");
    this.prefs=new PrefHandler(this);
    this.conn=new Conn(this);
    this.view=new TermView(canvas);
    this.buf=new TermBuf(80, 24);
    this.buf.setView(this.view);
    this.view.setBuf(this.buf);
    this.view.setConn(this.conn);
    this.parser=new AnsiParser(this.buf);
    this.stringBundle = document.getElementById("pcman-string-bundle");
    this.view.input.controllers.insertControllerAt(0, this.textboxControllers);   // to override default commands for inputbox
    this.os = Components.classes["@mozilla.org/xre/app-info;1"]
                 .getService(Components.interfaces.nsIXULRuntime).OS;

    this.prefs.observe();
}

PCMan.prototype={

    connect: function(url) {
        var parts = url.split(':');
        var port = 23;
        if(parts.length > 1)
            port=parseInt(parts[1], 10);
        this.conn.connect(parts[0], port);
    },

    close: function() {
        this.conn.close();
    },

    onConnect: function(conn) {
        this.updateTabIcon('connect');
    },

    onData: function(conn, data) {
        //alert('data('+data.length +') ' +data);
        this.parser.feed(data); // parse the received data
        this.view.update(); // update the view
        //alert('end data');
    },

    onClose: function(conn) {
        /* alert(this.stringBundle.getString("alert_conn_close")); */
        this.updateTabIcon('disconnect');
    },

    copy: function(){
        var clipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                                    .getService(Components.interfaces.nsIClipboardHelper);
        if(this.view.selection.hasSelection()) {
            var text = this.view.selection.getText();
            if(this.os == 'WINNT') // handle CRLF
                text = text.replace(/\n/g, "\r\n");
            clipboardHelper.copyString( text );
            var evt = document.createEvent("HTMLEvents");
            evt.initEvent('copy', true, true);
            this.view.input.dispatchEvent(evt);
            this.view.selection.cancelSel(true);
        }
    },

    paste: function() {
        if(this.conn) {
            // From: https://developer.mozilla.org/en/Using_the_Clipboard
            var clip = Components.classes["@mozilla.org/widget/clipboard;1"]
                            .getService(Components.interfaces.nsIClipboard);
            if(!clip)
                return false;
            var trans = Components.classes["@mozilla.org/widget/transferable;1"]
                            .createInstance(Components.interfaces.nsITransferable);
            if (!trans)
                return false;
            trans.addDataFlavor("text/unicode");
            clip.getData(trans, clip.kGlobalClipboard);
            var data={};
            var len={};
            trans.getTransferData("text/unicode", data, len);
            if(data && data.value) {
                var s=data.value.QueryInterface(Components.interfaces.nsISupportsString);
                s = s.data.substring(0, len.value / 2);
                s=s.replace(/\r\n/g, '\r');
                s=s.replace(/\n/g, '\r');
                var charset = this.prefs.Encoding;
                this.conn.convSend(s, charset);
            }
        }
    },

    selAll: function() {
        this.view.selection.selectAll();
    },

    textboxControllers: {
      supportsCommand: function(cmd){
        switch (cmd) {
          case "cmd_undo":
          case "cmd_redo":
          case "cmd_cut":
          case "cmd_copy":
          case "cmd_paste":
          case "cmd_selectAll":
          case "cmd_delete":
          case "cmd_switchTextDirection":
          case "cmd_find":
          case "cmd_findAgain":
            return true;
        }
      },
      isCommandEnabled: function(cmd){
        switch (cmd) {
          case "cmd_copy":
          case "cmd_paste":
          case "cmd_selectAll":
            return true;
          default:
            return false;
        }
      },
      doCommand: function(cmd){
        switch (cmd) {
          case "cmd_undo":
          case "cmd_redo":
          case "cmd_cut":
            return true;
          case "cmd_copy":
            pcman.copy();
            break;
          case "cmd_paste":
            pcman.paste();
            break;
          case "cmd_selectAll":
            pcman.selAll();
            break;
          case "cmd_delete":
          case "cmd_switchTextDirection":
          case "cmd_find":
          case "cmd_findAgain":
            return true;
        }
      },
      onEvent: function(e){ }
    },

    updateTabIcon: function(aStatus) {
      var icon = 'chrome://pcmanfx2/skin/tab-connecting.png';
      switch (aStatus) {
        case 'connect':
          icon =  'chrome://pcmanfx2/skin/tab-connect.png';
          break;
        case 'disconnect':
          icon =  'chrome://pcmanfx2/skin/tab-disconnect.png';
          break;
        case 'idle':  // Not used yet
          icon =  'chrome://pcmanfx2/skin/tab-idle.png';
          break;
        case 'connecting':  // Not used yet
        default:
      }
      var rw = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");
      var browserIndex = rw.gBrowser.getBrowserIndexForDocument(document);
      if (browserIndex > -1) {
        rw.gBrowser.mTabContainer.childNodes[browserIndex].image = icon;
      }
    }

}
