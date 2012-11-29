var u2bTab = {
    u2bTab: '',
    init: function () {
        // load U2B table
        var req = new XMLHttpRequest();
        req.open('GET', '/charset/u2b.tab', false);
        req.overrideMimeType('text\/plain; charset=x-user-defined');
        req.send();
        this.u2bTab = req.responseText;
    },

    u2b: function(ustr) {
        var ret = '';
        if(!this.u2bTab)
            this.init(); // initialize UAO table
        var u2b = this.u2bTab; // the table
        var i, n = ustr.length;
        for(i = 0; i < n; ++i) {
            var ch = ustr[i];
            var code = ch.charCodeAt(0);
            if(code >= 129) { // use UAO table
                var idx = (code - 129) * 2;
                // dump('idx = ' + idx + ', len = ' + u2b.length + '\n');
                if(idx < u2b.length) {
                    var big5 = u2b[idx] + u2b[idx + 1];
                    ret += big5;
                }
            }
            else // this is an ascii character
                ret += ch;
        }
        return ret;
    }
}

var b2uTab = {
    b2uTab: '',
    init: function () {
        // load B2U table
        var req = new XMLHttpRequest();
        req.open('GET', '/charset/b2u.tab', false);
        req.overrideMimeType('text\/plain; charset=x-user-defined');
        req.send();
        this.b2uTab = req.responseText.split('').map(function(x) {
            return String.fromCharCode(x.charCodeAt(0) % 0x100);
        }).join('');
    },

    b2u: function(bstr) {
        var ret = '';
        if(!this.b2uTab)
            this.init(); // initialize UAO table
        var b2u = this.b2uTab; // the table
        var i, n = bstr.length;
        for(i = 0; i < n; ++i) {
            if(bstr.charCodeAt(i) >= 129 && i < n-1) { // use UAO table
                var code = bstr.charCodeAt(i)*0x100 + bstr.charCodeAt(i+1);
                var idx = (code - 0x8001) * 2;
                // dump('idx = ' + idx + ', len = ' + b2u.length + '\n');
                var uni = b2u.charCodeAt(idx)*0x100 + b2u.charCodeAt(idx+1);
                ret += String.fromCharCode(uni);
                ++i;
            }
            else // this is an ascii character
                ret += bstr[i];
        }
        return ret;
    }
}

var conv = {
    convertStringToUTF8: function(data, charset, skipCheck) {
        if(charset == 'big5')
            return b2uTab.b2u(data);

        if(!this.cache)
            this.cache = {};
        if(!this.cache['a2u_'+charset])
            this.cache['a2u_'+charset] = {}

        var str = '';
        for(var i=0; i<data.length; ++i) {
            var ch = data[i];
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

            if(this.cache['a2u_'+charset]['x'+b0str+b1str]) {
                str += this.cache['a2u_'+charset]['x'+b0str+b1str];
            } else {
                window.URL = window.URL || window.webkitURL;
                var bb = new Blob(
                    [new Uint8Array([b0, b1])],
                    {"type": "text/plain"}
                );
                var url = window.URL.createObjectURL(bb);
                var req = new XMLHttpRequest();
                req.open("GET", url, false);
                req.overrideMimeType("text/plain;charset="+charset);
                req.send();
                this.cache['a2u_'+charset]['x'+b0str+b1str] = req.responseText;
                str += req.responseText;
            }
        }
        return str;
    }
}

var oconv = {
    charset: '',
    ConvertFromUnicode: function(str) {
        var charset = this.charset;

        if(charset == 'big5')
            return u2bTab.u2b(str);

        if(!this.cache)
            this.cache = {};
        if(!this.cache['u2a_'+charset])
            this.cache['u2a_'+charset] = {}

        var data = '';
        if(!this.toBeConv)
            this.toBeConv = '';
        for(var i=0; i<str.length; ++i) {
            var ch = str[i];
            if(ch < '\x80') {
                data += ch;
                continue;
            }

            var charCodeStr = ch.charCodeAt(0).toString(16);
            charCodeStr = 'x' + ('000' + charCodeStr).substr(-4);

            if(this.cache['u2a_'+charset][charCodeStr])
                data += this.cache['u2a_'+charset][charCodeStr];
            else // only build table, recall this method later
                this.toBeConv += ch;
        }
        if(this.toBeConv) {
            if(this.locked)
                return ''; // converter is busy, recall this method later
            this.locked = true;
            var converter = document.getElementById("u2b_form");
            converter.setAttribute("accept-charset", charset);
            var toBeConv = this.toBeConv;
            this.toBeConv = '';
            document.getElementById("u2b_ustr").value = toBeConv;
            var table = this.cache['u2a_'+charset];
            var oconv = this;
            converter.callback = function(search) {
                var data = unescape(search.substr(10));
                for(var i=0; i<toBeConv.length; ++i) {
                    var ch = toBeConv[i];
                    var charCodeStr = ch.charCodeAt(0).toString(16);
                    charCodeStr = 'x' + ('000' + charCodeStr).substr(-4);
                    if(2*i < data.length)
                        table[charCodeStr] = data.substr(2*i,2);
                }
                delete oconv.locked;
            }
            converter.submit();
            return '';
        }
        return data;
    }
};

