// Main Program

function PCMan() {
    var canvas = document.getElementById("canvas");
    this.conn=new Conn(this);
    this.view=new TermView(canvas);
    this.buf=new TermBuf(80, 24);
    this.buf.setView(this.view);
    this.view.setBuf(this.buf);
    this.view.setConn(this.conn);
    this.parser=new AnsiParser(this.buf);
    this.stringBundle = document.getElementById("pcman-string-bundle");
    this.view.input.controllers.insertControllerAt(0, this.textboxControllers);   // to override default commands for inputbox
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
        this.parser.feed(data);
        //alert('end data');
    },

    onClose: function(conn) {
        alert(this.stringBundle.getString("alert_conn_close"));
        this.updateTabIcon('disconnect');
    },
    
    copy: function(){
        alert('Not yet supported');
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
                this.conn.convSend(s, 'big5');
            }
        }
    },
    
    selAll: function() {
        alert('Not yet supported');
    },

    //Here comes mouse events

    //click to open in a new tab
    click: function(event) {
        var relX = event.pageX - this.view.canvas.offsetLeft;
        var relY = event.pageY - this.view.canvas.offsetTop;
        var PosX = (relX - relX % this.view.chw) / this.view.chw;//too slow?
        var PosY = (relY - relY % this.view.chh) / this.view.chh;
        var uris = this.buf.lines[PosY].uris;
        if (!uris) return;
        for (var i=0;i<uris.length;i++) {
          if (PosX >= uris[i][0] && PosX < uris[i][1]) { //@ < or <<
            var uri = "";
            for (var j=uris[i][0];j<uris[i][1];j++)
              uri = uri + this.buf.lines[PosY][j].ch;
            var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
            var gBrowser = wm.getMostRecentWindow("navigator:browser").gBrowser;
            // gBrowser.selectedTab = gBrowser.addTab(uri);
            gBrowser.addTab(uri, gBrowser.currentURI);
          }
        }
    },
    //detect current location and change mouse cursor  
    mousemove: function(event) {
        var relX = event.pageX - this.view.canvas.offsetLeft;
        var relY = event.pageY - this.view.canvas.offsetTop;
        var PosX = (relX - relX % this.view.chw) / this.view.chw;//too slow?
        var PosY = (relY - relY % this.view.chh) / this.view.chh;
        if(PosY >= 24) return;   // ignore events out of "rows" range, it's possible since we don't resize canvas height to fit chh*24
        var uris = this.buf.lines[PosY].uris;
        if (!uris) {
          this.view.canvas.style.cursor = "default";
          return;
        }
        for (var i=0;i<uris.length;i++) {
          if (PosX >= uris[i][0] && PosX < uris[i][1]) { //@ < or <<
            this.view.canvas.style.cursor = "pointer";
            return
          }
        }
        this.view.canvas.style.cursor = "default";
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
