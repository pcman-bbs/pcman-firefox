// The module of flash socket is written by
// Ett Chung <ettoolong@hotmail.com>
// and modified by
// u881831 <u881831@hotmail.com>

function flashUtils(conn) {
    this.conn = conn;

    this.socket = null;
    this.path = "pcman.conn.flash.";
    this.isLoaded = false;

    this.ins.setFlash(this);
    this.outs.setFlash(this);
    this.conv.setFlash(this);
    this.oconv.setFlash(this);
}

flashUtils.prototype = {
    connect: function(host, port) {
        if(this.socket) {
            //FIXME: improve the reconnect efficiency (Maybe write into swf?)
            document.getElementById("flashcontent").innerHTML = "";
            this.socket = null;
        }

        var href = document.location.protocol + '//' + document.location.host;
        this.conn.listener.onData(this.conn,
            'Please set this url as trusted location in Flash global setting:\r\n' +
            '\x1b[1;34;47m' + href + '\x1b[m\r\n' +
            'The setting is also accessable in this page:\r\n' +
            '\x1b[1;34mhttp://www.macromedia.com/support/documentation/tw/flashplayer/help/settings_manager04a.html#119065\x1b[m\r\n' +
            'Shortened url:\r\n' +
            '\x1b[1;34mhttp://goo.gl/w31tL\x1b[m\r\n' +
            '\r\n' +
            'BTW, please set the monospace font in GC settings first\r\n' +
            'To open the context menu, double click the right mouse button\r\n' +
            '\r\n' +
            '\x1b[1mIf the url is set, Flash will connect immediately.\x1b[m\r\n'
        );

        var policyFilePath = '';
        var policy = policyFilePath ? ('&PolicyFile='+policyFilePath) : '';
        document.getElementById("flashcontent").innerHTML = [
            '<embed type="application/x-shockwave-flash"',
            '    id="bbsfoxsoc" name="bbsfoxsoc"',
            '    src="bbsfoxsocket.swf?onloadcallback='+this.path+'soc_init"'+policy,
            '    width="1" height="1" bgcolor="#FFFFFF"',
            '    allowscriptaccess="always" />'
        ].join('\n');
    },

    ins: {
        setFlash: function(flash) {
            this.flash = flash;
        },
        buffer: '',
        writeBuffer: function(byteArray) {
            this.buffer += byteArray.map(function(x) {
                return String.fromCharCode((x+256)%256);
            }).join('');
        },
        readBytes: function(count) {
            var input = this.buffer.substr(0, count);
            this.buffer = this.buffer.substr(count);
            return input;
        },
        close: function() {
            if(this.flash.isConnected)
                this.flash.socket.close();
            this.flash.isConnected = false;
        }
    },

    outs: {
        setFlash: function(flash) {
            this.flash = flash;
        },
        write: function(str, length) {
            for(var i=0; i<str.length; ++i)
                this.flash.socket.write(str.charCodeAt(i));
        },
        flush: function() {
            this.flash.socket.flush();
        },
        close: function() {
            if(this.flash.isConnected)
                this.flash.socket.close();
            this.flash.isConnected = false;
        }
    },

    // Flash callback functions

    soc_init: function(error) {
        if(error) {
            dump(error);
            return;
        }

        this.socket = document.getElementById("bbsfoxsoc");
        if(this.socket == null)
            return;

        this.socket.setCallback('connect', this.path+'soc_connect');
        this.socket.setCallback('disconnect', this.path+'soc_closed');
        this.socket.setCallback('recieve', this.path+'soc_recieve');
        this.socket.setCallback('ioerror', this.path+'soc_ioerror');
        this.socket.setCallback('securityerror', this.path+'soc_securityerror');

        this.socket.connect(this.conn.host, this.conn.port);
    },

    soc_connect: function() {
        this.conn.listener.buf.clear(2);
        this.conn.listener.buf.attr.resetAttr();
        this.conn.onStartRequest(null, null);
        this.isConnected = true;
    },

    soc_ioerror: function(errMsg) {
        dump("socket ioerror!\n" + errMsg);
    },

    soc_securityerror: function(errMsg){
        //FIXME: it takes 9 seconds to show this message
        this.conn.listener.onData(this.conn,
            "\x1b[1;31mThe url may be not set,\x1b[m\r\n" +
            "\x1b[1;5;31myou MUST set it before running this extension.\x1b[m\r\n"
        );
        dump("socket securityerror!\n" + errMsg);
    },

    soc_closed: function() {
        this.isConnected = false;
        this.conn.onStopRequest(null, null, null);
    },

    soc_recieve: function(byteArray) {
        this.ins.writeBuffer(byteArray);
        this.conn.onDataAvailable(null, null, this.ins, 0, this.ins.buffer.length);
    },

    // charset converter

    conv: {
        setFlash: function(flash) {
            this.flash = flash;
        },

        convertStringToUTF8: function(data, charset, skipCheck) {
            if(charset != 'big5' && !window['a2u_'+charset])
                window['a2u_'+charset] = {}

            var str = '';
            for(var i=0; i<data.length; ++i) {
                var ch = data.charAt(i);
                if(ch < '\x80' || i == data.length-1) {
                    str += ch;
                    continue;
                }

                var b0 = ch.charCodeAt(0);
                var b0str = b0.toString(16);
                ++i;
                ch = data.charAt(i);
                var b1 = ch.charCodeAt(0);
                var b1str = b1.toString(16);

                if(charset == 'big5' && uao_b2u['x'+b0str+b1str]) {
                    str += uao_b2u['x'+b0str+b1str];
                } else if(charset != 'big5' && window['a2u_'+charset]['x'+b0str+b1str]) {
                    str += window['a2u_'+charset]['x'+b0str+b1str];
                } else {
                    var result = this.flash.socket.convToUTF8(b0, b1, charset);
                    if(charset == 'big5')
                        uao_b2u['x'+b0str+b1str] = result;
                    else
                        window['a2u_'+charset]['x'+b0str+b1str] = result;
                    str += result;
                }
            }
            return str;
        }
    },

    oconv: {
        setFlash: function(flash) {
            this.flash = flash;
        },

        charset: '',
        ConvertFromUnicode: function(str) {
            var charset = this.charset;

            if(charset != 'big5' && !window['u2a_'+charset])
                window['u2a_'+charset] = {}

            var data = '';
            for(var i=0; i<str.length; ++i) {
                var ch = str.charAt(i);
                if(ch < '\x80') {
                    data += ch;
                    continue;
                }

                var charCodeStr = ch.charCodeAt(0).toString(16);
                charCodeStr = 'x' + ('000' + charCodeStr).substr(-4);

                if(charset == 'big5' && uao_u2b[charCodeStr]) {
                    data += uao_u2b[charCodeStr];
                } else if(charset != 'big5' && window['u2a_'+charset][charCodeStr]) {
                    data += window['u2a_'+charset][charCodeStr];
                } else {
                    var byteArray = this.flash.socket.convFromUTF8(ch, charset);
                    var result = byteArray.map(function(x) {
                        return String.fromCharCode((x+256)%256);
                    }).join('');
                    if(charset == 'big5')
                        uao_u2b[charCodeStr] = result;
                    else
                        window['u2a_'+charset][charCodeStr] = result;
                    data += result;
                }
            }
            return data;
        }
    }
}
