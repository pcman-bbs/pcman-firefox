// Javascript module for Unicode-at-on support
// Reference: http://moztw.org/docs/big5/
// http://moztw.org/docs/big5/table/uao250-u2b.txt

var EXPORTED_SYMBOLS = ["uaoConv"];

var uaoConv = {
    u2bTab: '',
    b2uTab: '',
    init: function (type) {
        // load U2B table
        var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                            .getService(Components.interfaces.nsIIOService);
        // load from resource:// instead of file path
        var channel = ioService.newChannel('resource://pcmanfx2/'+type+'.tab', null, null);
        var ins = channel.open();
        var bins = Components.classes["@mozilla.org/binaryinputstream;1"].
                       createInstance(Components.interfaces.nsIBinaryInputStream);
        bins.setInputStream(ins);
        while(bins.available())
            this[type+'Tab'] += bins.readBytes(bins.available());
        bins.close();
    },

    u2b: function(ustr) {
        var ret = '';
        if(!this.u2bTab)
            this.init('u2b'); // initialize UAO table
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
    },

    b2u: function(data) {
        var ret = '';
        if(!this.b2uTab)
            this.init('b2u'); // initialize UAO table
        var b2u = this.b2uTab; // the table
        var i, n = data.length;
        for(i = 0; i < n; ++i) {
            var ch = data[i];
            var code = ch.charCodeAt(0);
            if(code >= 129 && i < n-1) { // use UAO table
                code = code * 256 + data.charCodeAt(i+1);
                var idx = (code - 0x8001) * 2;
                // dump('idx = ' + idx + ', len = ' + b2u.length + '\n');
                if(idx < b2u.length) {
                    var uni = b2u.charCodeAt(idx) * 256 + b2u.charCodeAt(idx+1);
                    ret += String.fromCharCode(uni);
                    ++i;
                }
            }
            else // this is an ascii character
                ret += ch;
        }
        return ret;
    }
};
