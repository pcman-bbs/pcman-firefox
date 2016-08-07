// automatically perform tasks

'use strict';

var EXPORTED_SYMBOLS = ["Robot"];

function Robot(listener) {
    this.listener = listener;

    this.replyCount = [];

    this.downloadArticle = new DownloadArticle(listener);
    this.popupMsg = new AlertsService(listener);

    var _this = this;
    this.eventListener = function(event) {
        _this.execExtCommand(event.getData("command"));
        if (_this.listener.gestures)
            _this.listener.gestures.cancelAll();
    }
    this.listener.ui.document.addEventListener("FireGesturesCommand", this.eventListener, false);
}

Robot.prototype = {
    onClose: function() {
        this.listener.mouseBrowsing.onClose();
        if (this.listener.gestures)
            this.listener.gestures.removeEventListener();
        this.listener.ui.document.removeEventListener("FireGesturesCommand", this.eventListener, false);
    },

    lineUpdated: function(row) {
        if (this.autoLoginStage > 0)
            this.checkAutoLogin(row);

        if (this.hasAutoReply())
            this.checkAutoReply(row);

        if (row == this.listener.buf.rows - 1)
            this.popupMsg.lineUpdated();
    },

    hasAutoReply: function() {
        var prefs = this.listener.prefs;
        for (var i = 0; i < 5; ++i) {
            if (prefs.get('ReplyPrompt' + i) && prefs.get('ReplyString' + i))
                return true;
        }
        return false;
    },

    checkAutoReply: function(row) {
        var line = this.listener.buf.getRowText(row, 0, this.listener.buf.cols);
        var Encoding = this.listener.prefs.get('Encoding');
        for (var i = 0; i < 5; ++i) {
            //FIXME: implement the UI of limiting the number of reply times
            // Reset the count if the strings change? 
            var replyStart = 1; // this.listener.prefs.get('ReplyStart' + i);
            var replyLimit = 1; // this.listener.prefs.get('ReplyLimit' + i);

            var replyPrompt = this.listener.prefs.get('ReplyPrompt' + i);
            var replyString = this.listener.prefs.get('ReplyString' + i);
            if (!this.replyCount[i])
                this.replyCount[i] = 0;

            if (!replyPrompt) // Stop auto-reply without prompt string
                continue;

            if (line.indexOf(replyPrompt) < 0) // Not found
                continue;

            ++this.replyCount[i];

            if (this.replyCount[i] < replyStart)
                continue;

            // setting the limit as negative numbers means unlimited
            if (replyLimit >= 0 && this.replyCount[i] >= replyStart + replyLimit)
                continue;

            this.listener.conn.convSend(replyString, Encoding);
            break; // Send only one string at the same time
        }
    },

    loginPrompt: function(num) {
        switch (num) {
            case 0:
                return this.listener.prefs.get('PreLoginPrompt');
            case 1:
                return this.listener.prefs.get('LoginPrompt');
            case 2:
                return this.listener.prefs.get('PasswdPrompt');
            default:
        }
    },

    loginStr: function(num) {
        switch (num) {
            case 0:
                return this.listener.prefs.get('PreLogin');
            case 1:
                return this.listener.prefs.get('Login');
            case 2:
                return this.listener.prefs.get('Passwd');
            case 3:
                return this.listener.prefs.get('PostLogin');
            default:
        }
    },

    // Modified from pcmanx-gtk2
    initialAutoLogin: function() {
        if (this.loginStr(1))
            this.autoLoginStage = this.loginStr(0) ? 1 : 2;
        else if (this.loginStr(2)) this.autoLoginStage = 3;
        else this.autoLoginStage = 0;
    },

    // Modified from pcmanx-gtk2
    checkAutoLogin: function(row) {
        if (this.autoLoginStage > 3 || this.autoLoginStage < 1) {
            this.autoLoginStage = 0;
            return;
        }

        var line = this.listener.buf.getRowText(row, 0, this.listener.buf.cols);
        if (line.indexOf(this.loginPrompt(this.autoLoginStage - 1)) < 0)
            return;

        var loginStr = this.loginStr(this.autoLoginStage - 1);

        ++this.autoLoginStage;

        var Encoding = this.listener.prefs.get('Encoding');
        var EnterKey = this.listener.prefs.get('EnterKey');
        this.listener.conn.convSend(loginStr + EnterKey, Encoding);

        if (this.autoLoginStage == 4) {
            if (this.loginStr(3))
                this.listener.conn.convSend(this.loginStr(3), Encoding);
            this.autoLoginStage = 0;
        }
    },

    execExtCommand: function(command) {
        var conn = this.listener.conn;

        switch (command) {
            case "Page Up":
                conn.send('\x1b[5~');
                break;
            case "Page Down":
                conn.send('\x1b[6~');
                break;
            case "End":
                conn.send('\x1b[4~');
                break;
            case "Home":
                conn.send('\x1b[1~');
                break;
            case "Arrow Left":
                conn.send(this.listener.view.detectDBCS(true, '\x1b[D'));
                break;
            case "Arrow Up":
                conn.send('\x1b[A');
                break;
            case "Arrow Right":
                conn.send(this.listener.view.detectDBCS(false, '\x1b[C'));
                break;
            case "Arrow Down":
                conn.send('\x1b[B');
                break;
            case "Enter":
                conn.send(this.listener.prefs.get('EnterKey'));
                break;
            case 'PreviousPost':
                conn.send('[');
                break;
            case 'NextPost':
                conn.send(']');
                break;
            case 'FirstPost':
                conn.send('=');
                break;
            case 'Lastpost@list':
                conn.send('\x1b[D\x1b[C\x1b[4~[]');
                break;
            case 'Lastpost@reading':
                conn.send('\x1b[D\x1b[4~[]\x1b[C');
                break;
            case 'RefreshPost':
                conn.send('\x1b[D\x1b[C\x1b[4~');
                break;
            case "Copy":
                this.listener.copy();
                break;
            case "ColoredCopy":
                this.listener.copy(true);
                break;
            case "Paste":
                this.listener.paste();
                break;
            case "SelectAll":
                this.listener.selAll();
                break;
            case "LoadFile":
                //TODO: open filepicker
                break;
            case "SaveFile":
                this.listener.save();
                break;
            case "SaveAnsiFile":
                this.listener.save('ansi');
                break;
            case "Preference":
                this.listener.ui.sitepref();
                break;
            default:
                if (command.indexOf('CustomStr') == 0) {
                    var id = command.substr(9);
                    var str = this.listener.prefs.get('ReplyString' + id);
                    var Encoding = this.listener.prefs.get('Encoding');
                    if (str)
                        conn.convSend(str, Encoding);
                } else if (command.indexOf('Enter') == 0) {
                    var count = parseInt(command.substr(5));
                    var str = '';
                    if (count >= 0) {
                        for (var i = 0; i < count; ++i)
                            str += '\x1b[A'; //Arrow Up
                    } else {
                        for (var i = 0; i > count; --i)
                            str += '\x1b[B'; //Arrow Down
                    }
                    str += this.listener.prefs.get('EnterKey');
                    conn.send(str);
                } else {
                    //XXX: arbitrary string is not supported for security
                }
                break;
        }
    }
}

function DownloadArticle(listener) {
    this.listener = listener;
    this.timer = null;
    this.interval = 100; // in mini second
    this.isLineFeed = false;
    this.article = [];
    this.callback = null;
}

DownloadArticle.prototype = {
    // Modified from pcmanx-gtk2
    startDownload: function(ansi, callback) {
        if (this.timer != null)
            this.stopDownload();
        this.callback = callback;
        var buf = this.listener.buf;
        this.listener.ui.updateTabIcon('idle');
        for (var row = 0; row < buf.rows - 1; ++row) {
            var text = buf.getRowText(row, 0, buf.cols, ansi);
            text = this.listener.view.selection.strStrip(text);
            this.article.push(text);
        }
        if (this.checkFinish())
            return;
        this.listener.conn.send('\x1b[B');
        var _this = this;
        this.timer = this.listener.ui.setTimer(true, function() {
            if (!_this.checkNewLine(ansi))
                return;
            if (!_this.checkFinish())
                _this.listener.conn.send('\x1b[B');
        }, this.interval);
    },

    // Modified from pcmanx-gtk2
    checkNewLine: function(ansi) {
        var buf = this.listener.buf;
        if (!this.isLineFeed || buf.row < buf.rows - 1 || buf.col < 40)
            return false; // not fully received

        var text = buf.getRowText(buf.rows - 2, 0, buf.cols, ansi);
        text = this.listener.view.selection.strStrip(text);

        // Hack for the double-line separator of PTT
        // Not always works, such as that repeated lines may not be detected
        // disabling double-line separator is recommended
        var downloaded = this.article[this.article.length - 1];
        var lastline = buf.getRowText(buf.rows - 3, 0, buf.cols, ansi);
        lastline = this.listener.view.selection.strStrip(lastline);
        if (downloaded != lastline) {
            var lastlastline = buf.getRowText(buf.rows - 4, 0, buf.cols, ansi);
            lastline = this.listener.view.selection.strStrip(lastline);
            if (downloaded == lastlastline)
                this.article.push(lastline);
        }

        this.article.push(text);
        this.isLineFeed = false;
        return true;
    },

    // Modified from pcmanx-gtk2
    checkFinish: function() {
        var buf = this.listener.buf;
        if (buf.getRowText(buf.rows - 1, 0, buf.cols).indexOf("100%") < 0)
            return false;
        var data = this.article.join('\n');
        this.stopDownload(true);

        this.callback(data);

        return true;
    },

    stopDownload: function(normal) {
        if (this.timer == null)
            return false;

        this.timer.cancel();
        this.timer = null;
        this.isLineFeed = false;
        this.article = [];

        if (!normal)
            this.listener.conn.send('\x1b[1~'); // HOME
        this.listener.ui.updateTabIcon('connect');

        return true;
    },

    lineFeed: function() {
        this.isLineFeed = true;
    }
}

// modified from pcmanx-gtk2
function AlertsService(listener) {
    this.listener = listener;
    this.lastChanged = 0;
}

AlertsService.prototype = {
    alert: function() {
        var prefs = this.listener.prefs;
        if (!prefs.get('Popup') && !prefs.get('Beep'))
            return;

        //FIXME: Distinguish the system alert and the message in a better way
        if (Date.now() - this.lastChanged > 500)
            var msgTimeout = true;

        if (this.timer) {
            //FIXME: some valid messages may miss
            this.timer.cancel();
            delete this.timer;
        }
        var _this = this;
        this.timer = this.listener.ui.setTimer(false, function() {
            var msg = msgTimeout ? "" : _this.getMsg();
            if (prefs.get('Beep')) _this.listener.ui.beep(msg);
            if (prefs.get('Popup') && msg) {
                _this.listener.ui.showPopups(msg);
                _this.lastChanged = 0; // Prevent unnecessary popups
            }
            delete _this.timer;
        }, 500);
    },

    getMsg: function() {
        var buf = this.listener.buf;
        var text = buf.getRowText(buf.rows - 1, 0, buf.cols);
        return text.replace(/ +$/, ""); // forced trimming
    },

    lineUpdated: function() {
        this.lastChanged = Date.now();
    }
}

