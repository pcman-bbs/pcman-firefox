// Handle Telnet Connections according to RFC 855

'use strict';

var EXPORTED_SYMBOLS = ["Conn"];

// Telnet commands
const SE = '\xf0';
const NOP = '\xf1';
const DATA_MARK = '\xf2';
const BREAK = '\xf3';
const INTERRUPT_PROCESS = '\xf4';
const ABORT_OUTPUT = '\xf5';
const ARE_YOU_THERE = '\xf6';
const ERASE_CHARACTER = '\xf7';
const ERASE_LINE = '\xf8';
const GO_AHEAD = '\xf9';
const SB = '\xfa';

// Option commands
const WILL = '\xfb';
const WONT = '\xfc';
const DO = '\xfd';
const DONT = '\xfe';
const IAC = '\xff';

// Telnet options
const ECHO = '\x01';
const SUPRESS_GO_AHEAD = '\x03';
const TERM_TYPE = '\x18';
const IS = '\x00';
const SEND = '\x01';
const NAWS = '\x1f';

// state
const STATE_DATA = 0;
const STATE_IAC = 1;
const STATE_WILL = 2;
const STATE_WONT = 3;
const STATE_DO = 4;
const STATE_DONT = 5;
const STATE_SB = 6;

function Conn(listener) {
    this.host = null;
    this.port = 23;

    this.connectCount = 0;

    this.listener = listener;

    this.state = STATE_DATA;
    this.iac_sb = '';

    this.app = null;
}

Conn.prototype = {
    oconv: null,

    connect: function(host, port) {
        if (host) {
            this.host = host;
            this.port = port;
        }
        this.isConnected = false;

        this.app.connect(host, port);

        this.connectTime = Date.now();
        this.connectCount++;
    },

    close: function() {
        if (!this.app.ws)
            return;

        this.app.onunload();

        if (this.listener.abnormalClose)
            return;

        if (this.connectCount >= 100) {
            this.connectFailed = true; //FIXME: show something on UI?
            return;
        }

        // reconnect automatically if the site is disconnected in 15 seconds
        var time = Date.now();
        if (time - this.connectTime < 15000) {
            this.listener.buf.clear(2);
            this.listener.buf.attr.resetAttr();
            var connectDelay = 0;
            if (this.reconnectTimer) {
                this.reconnectTimer.cancel(); // wait for this reconnection
                delete this.reconnectTimer;
            }
            if (!connectDelay) {
                this.connect();
            } else {
                var _this = this;
                this.reconnectTimer = this.listener.ui.setTimer(false, function() {
                    delete _this.reconnectTimer;
                    _this.connect();
                }, connectDelay * 1000);
            }
        }
    },

    // data listener
    onStartRequest: function() {
        if (!this.isConnected) {
            this.isConnected = true;
        }
        this.listener.onConnect(this);
    },

    onStopRequest: function() {
        this.close();
        this.listener.onClose(this);
    },

    onDataAvailable: function(content) {
        var data = '';
        var n = content.length;
        for (var i = 0; i < n; ++i) {
            var ch = content[i];
            switch (this.state) {
                case STATE_DATA:
                    if (ch == IAC) {
                        if (data) {
                            this.listener.onData(this, data);
                            data = '';
                        }
                        this.state = STATE_IAC;
                    } else
                        data += ch;
                    break;
                case STATE_IAC:
                    switch (ch) {
                        case WILL:
                            this.state = STATE_WILL;
                            break;
                        case WONT:
                            this.state = STATE_WONT;
                            break;
                        case DO:
                            this.state = STATE_DO;
                            break;
                        case DONT:
                            this.state = STATE_DONT;
                            break;
                        case SB:
                            this.state = STATE_SB;
                            break;
                        default:
                            this.state = STATE_DATA;
                    }
                    break;
                case STATE_WILL:
                    switch (ch) {
                        case ECHO:
                        case SUPRESS_GO_AHEAD:
                            this.send(IAC + DO + ch);
                            break;
                        default:
                            this.send(IAC + DONT + ch);
                    }
                    this.state = STATE_DATA;
                    break;
                case STATE_DO:
                    switch (ch) {
                        case TERM_TYPE:
                            this.send(IAC + WILL + ch);
                            break;
                        case NAWS: // RFC 1073
                            this.send(IAC + WILL + ch);
                            this.sendNaws();
                            break;
                        default:
                            this.send(IAC + WONT + ch);
                    }
                    this.state = STATE_DATA;
                    break;
                case STATE_DONT:
                case STATE_WONT:
                    this.state = STATE_DATA;
                    break;
                case STATE_SB: // sub negotiation
                    this.iac_sb += ch;
                    if (this.iac_sb.slice(-2) == IAC + SE) {
                        // end of sub negotiation
                        switch (this.iac_sb[0]) {
                            case TERM_TYPE:
                                // FIXME: support other terminal types
                                var rep = IAC + SB + TERM_TYPE + IS + 'VT100' + IAC + SE;
                                this.send(rep);
                                break;
                        }
                        this.state = STATE_DATA;
                        this.iac_sb = '';
                        break;
                    }
            }
        }
        if (data) {
            this.listener.onData(this, data);
            data = '';
        }
    },

    sendNaws: function() {
        var cols = 80;
        var rows = 24;
        var nawsStr = String.fromCharCode(cols >> 8, cols % 256, rows >> 8, rows % 256).replace(/(\xff)/g, '\xff\xff');
        var rep = IAC + SB + NAWS + nawsStr + IAC + SE;
        this.send(rep);
    },

    send: function(str) {
        // added by Hemiola SUN
        if (!this.app.ws)
            return;

        this.idleTimeout.cancel();

        if (str)
            this.app.send(str)

        var temp = this;
        this.idleTimeout = this.listener.ui.setTimer(false, function() {
            temp.sendIdleString();
        }, 180000);
    },

    convSend: function(unicode_str, charset) {
        var s;

        this.oconv.charset = charset;
        s = this.oconv.ConvertFromUnicode(unicode_str);

        if (s)
            this.send(s);
    },

    sendIdleString: function() {
        this.send("\x1b[A\x1b[B"); // Arrow Up and Arrow Down
    }
};

