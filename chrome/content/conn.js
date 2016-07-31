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

    this.socket = listener.ui.socket;
    this.ssh = null;
}

Conn.prototype = {
    oconv: null,

    connect: function(host, port) {
        if (host) {
            this.host = host;
            this.port = port;
        }
        this.isConnected = false;

        //TODO: use prefs to setting the login and password
        this.ssh.host = this.host;
        this.ssh.port = this.port;
        if (port == 22) {
            switch (host) {
                case 'ptt.cc':
                case 'ptt2.cc':
                case 'ptt3.cc':
                    this.ssh.login = 'bbs';
                    this.ssh.password = 'bbs';
                    break;
                default:
            }
        }
        this.ssh.width = this.listener.buf.cols;
        this.ssh.height = this.listener.buf.rows;
        var _this = this;
        this.ssh.callback = function(status, message) {
            switch (status) {
                case 'onConnected':
                case 'loginAccepted':
                case 'loginDenied':
                    break;
                case 'onDisconnect':
                    _this.close();
                    break;
                case 'recv':
                    _this.onDataAvailable(message);
                    break;
                case 'send':
                default:
                    _this.send(message);
            }
        };

        this.socket.connect(this, this.host, this.port);

        this.connectTime = Date.now();
        this.connectCount++;

        var AntiIdleTime = this.listener.prefs.get('AntiIdleTime');
        if (!AntiIdleTime)
            return;
        var _this = this;
        this.idleTimeout = this.listener.ui.setTimer(false, function() {
            _this.sendIdleString();
        }, AntiIdleTime);
    },

    close: function() {
        if (this.idleTimeout)
            this.idleTimeout.cancel();

        if (this.reconnectTimer)
            this.reconnectTimer.cancel();

        if (!this.isConnected)
            return;

        this.socket.onunload();

        this.ssh.close(this.listener.abnormalClose);

        if (this.listener.abnormalClose)
            return;

        var ReconnectCount = this.listener.prefs.get('ReconnectCount');
        if (ReconnectCount && this.connectCount >= ReconnectCount) {
            this.connectFailed = true;
            return;
        }

        // reconnect automatically if the site disconnects in a certain time
        var ReconnectTime = this.listener.prefs.get('ReconnectTime');
        if (ReconnectTime && (Date.now() - this.connectTime) < ReconnectTime) {
            this.listener.buf.clear(2);
            this.listener.buf.attr.resetAttr();
            var connectDelay = this.listener.prefs.get('ReconnectDelay');
            if (!connectDelay) {
                this.connect();
            } else {
                var _this = this;
                this.reconnectTimer = this.listener.ui.setTimer(false, function() {
                    _this.connect();
                }, connectDelay);
            }
        }
    },

    // data listener
    onStartRequest: function() {
        if (!this.isConnected) {
            this.isConnected = true;
        }
        this.listener.onConnect(this);
        this.connectFailed = false;
    },

    onStopRequest: function() {
        this.close();
        this.listener.onClose(this);
        if (this.isConnected) {
            this.isConnected = false;
        }
    },

    onDataAvailable: function(content) {
        var data = '';
        var n = content.length;
        if (this.ssh.enable) { // use SSH
            data = this.ssh.input(content);
            n = 0; // bypass IAC
        }
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
                                var type = this.listener.prefs.get('TermType');
                                var rep = IAC + SB + TERM_TYPE + IS + type + IAC + SE;
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
        var cols = this.listener.buf.cols;
        var rows = this.listener.buf.rows;
        var nawsStr = String.fromCharCode(cols >> 8, cols % 256, rows >> 8, rows % 256).replace(/(\xff)/g, '\xff\xff');
        var rep = IAC + SB + NAWS + nawsStr + IAC + SE;
        this.send(this.ssh.sendNaws(rep));
    },

    send: function(str) {
        // added by Hemiola SUN
        if (!this.isConnected)
            return;

        if (this.idleTimeout)
            this.idleTimeout.cancel();

        if (this.ssh.enable && !this.ssh.client)
            str = str.replace(this.listener.prefs.get('EnterKey'), '\r');
        str = this.ssh.output(str);

        if (str)
            this.socket.send(str)

        var AntiIdleTime = this.listener.prefs.get('AntiIdleTime');
        if (!AntiIdleTime)
            return;
        var _this = this;
        this.idleTimeout = this.listener.ui.setTimer(false, function() {
            _this.sendIdleString();
        }, AntiIdleTime);
    },

    convSend: function(unicode_str, charset) {
        var s;

        this.oconv.charset = charset;
        s = this.oconv.ConvertFromUnicode(unicode_str);

        if (s)
            this.send(s);
    },

    sendIdleString: function() {
        this.send(this.listener.prefs.get('AntiIdleStr'));
    }
};

