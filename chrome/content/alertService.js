// notify for the new incoming messages
// modified from pcmanx-gtk2

function AlertsService(buf) {
    this.buf = buf;
    this.lastChanged = 0;
}

AlertsService.prototype={
    alert: function() {
        var prefs = this.buf.view.conn.listener.prefs;
        if(!prefs.Popup && !prefs.Beep)
            return;

        //FIXME: Distinguish the system alert and the message in a better way
        if(Date.now() - this.lastChanged > 500)
            var msgTimeout = true;

        if(this.timer) {
            //FIXME: some valid messages may miss
            this.timer.cancel();
            delete this.timer;
        }
        var _this = this;
        this.timer = setTimer(false, function() {
            var msg = msgTimeout ? "" : _this.getMsg();
            if(prefs.Beep) _this.beep(msg);
            if(prefs.Popup && msg) _this.showPopups(msg);
            delete _this.timer;
        }, 500);
    },

    getMsg: function() {
        var text = this.buf.getRowText(this.buf.rows-1, 0, this.buf.cols);
        return text.replace(/ +$/,"");
    },

    beep: function(msg) {
        var sound = Components.classes["@mozilla.org/sound;1"]
                              .createInstance(Components.interfaces.nsISound);
        if(msg) {
            sound.playEventSound(sound.EVENT_NEW_MAIL_RECEIVED);
        } else {
            sound.beep();
        }
        //FIXME: support custum sound:
        //https://developer.mozilla.org/en/nsISound#play()
    },

    showPopups: function(msg) {
        //FIXME: PopupNotifications.jsm is an alternative but works only in FX4+
        // nsIPromptService is more flexible but more coding is needed
        var column = msg.replace(/^ +/,"").split(" ");
        var summary = document.title + " - " + column.shift();
        var body = column.join(" ");
        Components.classes['@mozilla.org/alerts-service;1']
                  .getService(Components.interfaces.nsIAlertsService)
                  .showAlertNotification(null, summary, body, false, '', null);
        //FIXME: Should we set the active tab as this page?
        //https://developer.mozilla.org/En/NsIAlertsService

        this.lastChanged = 0; // Prevent unnecessary popups
    },

    lineUpdated: function() {
        this.lastChanged = Date.now();
    }
}
