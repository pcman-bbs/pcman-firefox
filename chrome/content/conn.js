// Handle Telnet Connections according to RFC 854

// Telnet commands
const SE = '\xf0'
const NOP = '\xf1';
const DATA_MARK = '\xf2';
const BREAK = '\xf3';
const INTERRUPT_PROCESS = '\xf4';
const ABORT_OUTPUT = '\xf5';
const ARE_YOU_THERE = '\xf6';
const ERASE_CHARACTER = '\xf7';
const ERASE_LINE = '\xf8';
const GO_AHEAD  = '\xf9';
const SB = '\xfa';

// Option commands
const WILL  = '\xfb';
const WONT  = '\xfc';
const DO = '\xfd';
const DONT = '\xfe';
const IAC = '\xff';

// Telnet options
const ECHO  = '\x01';
const SUPRESS_GO_AHEAD = '\x03';
const TERM_TYPE = '\x18';
const IS = '\x00';
const SEND = '\x01';
const NAWS = '\x1f';

// state
const STATE_DATA=0;
const STATE_IAC=1;
const STATE_WILL=2;
const STATE_WONT=3;
const STATE_DO=4;
const STATE_DONT=5;
const STATE_SB=6;

function Conn(listener) {
    this.tran = null;
    this.ins = null;
    this.outs = null;
    this.host = null;
    this.port = 23;

    this.connectCount = 0;

    this.listener=listener;

    this.state=STATE_DATA;
    this.iac_sb='';

    this.ssh = null;
}

Conn.prototype={
    // transport service
    ts: Components.classes["@mozilla.org/network/socket-transport-service;1"]
                                    .getService(Components.interfaces.nsISocketTransportService),
    // encoding converter
    oconv: Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                                    .createInstance(Components.interfaces.nsIScriptableUnicodeConverter),

    connect: function(host, port) {
        if(host) {
            this.host = host;
            this.port = port;
        }
        this.isConnected = false;

        var login = '';
        var password = '';
        if(port == 22) {
            switch(host) {
            case 'ptt.cc':
            case 'ptt2.cc':
            case 'ptt3.cc':
                login = 'bbs';
                password = 'bbs';
                break;
            default:
            }
        }
        var _this = this;
        this.ssh = new SSH(_this, login, password, function(status, message){
            switch(status) {
            case 'onConnected':
            case 'loginAccepted':
            case 'loginDenied':
                break;
            case 'onDisconnect':
                _this.close();
                break;
            case 'recv':
                _this.onDataAvailable(null, null, message, 0, message.length);
                break;
            case 'send':
            default:
                _this.send(message);
            }
        });

        // create the socket
        this.trans=this.ts.createTransport(null, 0,
                                        this.host, this.port, null);
        this._ins=this.trans.openInputStream(0,0,0);
        this.outs=this.trans.openOutputStream(0,0,0);

        // initialize input stream
        this.ins = Components.classes["@mozilla.org/binaryinputstream;1"]
                        .createInstance(Components.interfaces.nsIBinaryInputStream);
        this.ins.setInputStream(this._ins);

        // data listener
        var pump = Components.classes["@mozilla.org/network/input-stream-pump;1"]
                                .createInstance(Components.interfaces.nsIInputStreamPump);
        pump.init(this._ins, -1, -1, 0, 0, false);
        pump.asyncRead(this, null);
        this.ipump = pump;
        
        this.connectTime = Date.now();
        this.connectCount++;

        this.closeConfirm();
    },

    close: function() {
        if ( !this.ins )
          return;

        this.ins.close();
        this.outs.close();
        delete this._ins;
        delete this.ins;
        delete this.outs;
        delete this.trans;

        this.closeConfirm();

        this.ssh.close(this.listener.abnormalClose);

        if(this.listener.abnormalClose)
            return;

        var ReconnectCount = this.listener.prefs.ReconnectCount;
        if(ReconnectCount && this.connectCount >= ReconnectCount) {
            this.connectFailed = true; //FIXME: show something on UI?
            return;
        }

        // reconnect automatically if the site is disconnected in 15 seconds
        let time = Date.now();
        if ( time - this.connectTime < this.listener.prefs.ReconnectTime * 1000 ) {
            this.listener.buf.clear(2);
            this.listener.buf.attr.resetAttr();
            var connectDelay = this.listener.prefs.ReconnectDelay;
            if(this.reconnectTimer) {
                this.reconnectTimer.cancel(); // wait for this reconnection
                delete this.reconnectTimer;
            }
            if(!connectDelay) {
                this.connect();
            } else {
                var _this = this;
                this.reconnectTimer = setTimer(false, function() {
                    delete _this.reconnectTimer;
                    _this.connect();
                }, connectDelay * 1000);
            }
        }
    },

    // data listener
    onStartRequest: function(req, ctx){
        if( ! this.isConnected ) {
            this.isConnected = true;
        }
        this.listener.onConnect(this);
    },

    onStopRequest: function(req, ctx, status){
        this.close();
        this.listener.onClose(this);
    },

    onDataAvailable: function(req, ctx, ins, off, count) {
        var data='';
        // dump(count + 'bytes available\n');
        while(count > 0) {
            var s = (typeof(ins) == 'string') ? ins : this.ins.readBytes(count);
            count -= s.length;
            // dump(count + 'bytes remaining\n');
            var n=s.length;
            // this.oconv.charset='big5';
            // dump('data ('+n+'): >>>\n'+ this.oconv.ConvertToUnicode(s) + '\n<<<\n');
            if(this.ssh.enable) { // use SSH
                data = this.ssh.input(s);
                n = 0; // bypass IAC
            }
            for(var i = 0;i<n; ++i) {
                var ch=s[i];
                switch(this.state) {
                case STATE_DATA:
                    if( ch == IAC ) {
                        if(data) {
                            this.listener.onData(this, data);
                            data='';
                        }
                        this.state = STATE_IAC;
                    }
                    else
                        data += ch;
                    break;
                case STATE_IAC:
                    switch(ch) {
                    case WILL:
                        this.state=STATE_WILL;
                        break;
                    case WONT:
                        this.state=STATE_WONT;
                        break;
                    case DO:
                        this.state=STATE_DO;
                        break;
                    case DONT:
                        this.state=STATE_DONT;
                        break;
                    case SB:
                        this.state=STATE_SB;
                        break;
                    default:
                        this.state=STATE_DATA;
                    }
                    break;
                case STATE_WILL:
                    switch(ch) {
                    case ECHO:
                    case SUPRESS_GO_AHEAD:
                        this.send( IAC + DO + ch );
                        break;
                    default:
                        this.send( IAC + DONT + ch );
                    }
                    this.state = STATE_DATA;
                    break;
                case STATE_DO:
                    switch(ch) {
                    case TERM_TYPE:
                        this.send( IAC + WILL + ch );
                        break;
                    case NAWS:
                        this.send( IAC + WILL + ch );
                        this.sendNaws();
                        break;
                    default:
                        this.send( IAC + WONT + ch );
                    }
                    this.state = STATE_DATA;
                    break;
                case STATE_DONT:
                case STATE_WONT:
                    this.state = STATE_DATA;
                    break;
                case STATE_SB: // sub negotiation
                    this.iac_sb += ch;
                    if( this.iac_sb.slice(-2) == IAC + SE ) {
                        // end of sub negotiation
                        switch(this.iac_sb[0]) {
                        case TERM_TYPE: {
                            // FIXME: support other terminal types
                            var termType = this.listener.prefs.TermType;
                            var rep = IAC + SB + TERM_TYPE + IS + termType + IAC + SE;
                            this.send( rep );
                            break;
                            }
                        }
                        this.state = STATE_DATA;
                        this.iac_sb = '';
                        break;
                    }
                }
            }
            if(data) {
                this.listener.onData(this, data);
                data='';
            }
        }
    },

    sendNaws: function() {
        var cols = this.listener.prefs.Cols;
        var rows = this.listener.prefs.Rows;
        var nawsStr = String.fromCharCode(Math.floor(cols/256), cols%256, Math.floor(rows/256), rows%256).replace(/(\xff)/g,'\xff\xff');
        var rep = IAC + SB + NAWS + nawsStr + IAC + SE;
        this.send(this.ssh.sendNaws(rep));
    },

    send: function(str) {
        // added by Hemiola SUN
        if ( !this.ins )
          return;

        if(this.idleTimeout)
            this.idleTimeout.cancel();

        if(this.ssh.enable && !this.ssh.client)
            str = str.replace(UnEscapeStr(this.listener.prefs.EnterKey), '\r');
        str = this.ssh.output(str);

        if(str) {
            this.outs.write(str, str.length);
            this.outs.flush();
        }

        if(this.listener.prefs.AntiIdleTime > 0) {
            let temp = this;
            this.idleTimeout = setTimer( false, function (){
                temp.sendIdleString();
            }, this.listener.prefs.AntiIdleTime * 1000 );
        }
    },

    convSend: function(unicode_str, charset) {
        // supports UAO
        var s;
        // when converting unicode to big5, use UAO.
        if(charset.toLowerCase() == 'big5') {
            if(!this.uaoConvLoaded) {
                Components.utils.import("resource://pcmanfx2/uao.js");
                this.uaoConvLoaded = true;
            }
            s = uaoConv.u2b(unicode_str);
        }
        else
        {
            this.oconv.charset=charset;
            s = this.oconv.ConvertFromUnicode(unicode_str);
        }
        if(s)
            this.send(s);
    },
    
    sendIdleString : function () {
        this.send(UnEscapeStr(this.listener.prefs.AntiIdleStr));
    },

    closeConfirm: function() {
        if(this.listener.prefs.AskForClose && this.ins) {
            //window.onbeforeunload = function() { return document.title; } // Warning in AMO
            this.beforeunload = function(e) {
                e.preventDefault();
            };
            window.addEventListener('beforeunload', this.beforeunload, false);
        } else {
            //window.onbeforeunload = null; // Warning in AMO
            if(this.beforeunload) {
                window.removeEventListener('beforeunload', this.beforeunload, false);
                delete this.beforeunload;
            }
        } 
    },

    showConnTime: function() {
        var show = this.listener.prefs.ShowConnTimer;
        if(!document.getElementById('connTimer')) {
            if(!show)
                return;
            var newDiv = document.createElement('div');
            this.listener.view.input.parentNode.appendChild(newDiv);
            newDiv.id = 'connTimer';
            newDiv.style.background = 'white';
            newDiv.style.position = 'fixed';
            newDiv.style.bottom = '5px';
            newDiv.style.right = '5px';
        } else if(!show) {
            var connTimerDiv = document.getElementById('connTimer');
            this.listener.view.input.parentNode.removeChild(connTimerDiv);
            return;
        }

        if(!this.ins) {
            document.getElementById('connTimer').textContent = '0:00:00';
            return;
        }

        var connectedTime = Math.floor((Date.now() - this.connectTime)/1000);
        var s = connectedTime % 60;
        var m = ((connectedTime - s) / 60) % 60;
        var h = (connectedTime - s - m * 60) / 3600;
        var str = h + ':' + ('00'+m).substr(-2) + ':' + ('00'+s).substr(-2);
        document.getElementById('connTimer').textContent = str;
    }
}
