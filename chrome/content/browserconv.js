// Javascript module for Unicode-at-on support
// Reference: http://moztw.org/docs/big5/
// http://moztw.org/docs/big5/table/uao250-u2b.txt

'use strict';

var EXPORTED_SYMBOLS = ["BrowserConv"];

function BrowserConv(ui) {
    this.ui = ui;
}

BrowserConv.prototype = {
    cache: {},
    buildCache: function(type, charset, callback) {
        var cache = this.cache;
        if (cache[type + '_' + charset])
            return callback(); // don't build again

        var url = '/uao/' + type.replace('a', 'b') + '.tab';
        if (charset != 'big5')
            url = '/charset/' + type + '.tab?charset=' + charset;

        if (callback) {
            this.ui.read(url, function(ret) {
                cache[type + '_' + charset] = ret;
                callback();
            });
        } else {
            cache[type + '_' + charset] = this.ui.read(url);
        }
    },

    conv: null,
    convertStringToUTF8: function(data, charset, skipCheck, allowSubstitution) {
        if (Components && Components.classes && charset.toLowerCase() != 'big5') {
            if (!this.conv) {
                this.conv = Components.classes["@mozilla.org/intl/utf8converterservice;1"]
                    .getService(Components.interfaces.nsIUTF8ConverterService);
            }
            return this.conv.convertStringToUTF8(data, charset, skipCheck, allowSubstitution);
        }

        if (!this.cache['a2u_' + charset])
            this.buildCache('a2u', charset); // sync building, which fails in IE

        var b2u = this.cache['a2u_' + charset]; // the table
        var ret = '',
            i, n = data.length;
        for (i = 0; i < n; ++i) {
            if (data.charCodeAt(i) >= 129 && i < n - 1) { // use UAO table
                var code = data.charCodeAt(i) * 0x100 + data.charCodeAt(i + 1);
                var idx = (code - 0x8001) * 2;
                var uni = b2u.charCodeAt(idx) * 0x100 + b2u.charCodeAt(idx + 1);
                ret += String.fromCharCode(uni);
                ++i;
            } else { // this is an ascii character
                ret += data[i];
            }
        }
        return ret;
    },

    oconv: null,
    charset: '',
    ConvertFromUnicode: function(str) {
        var charset = this.charset;

        if (Components && Components.classes && charset.toLowerCase() != 'big5') {
            if (!this.oconv) {
                this.oconv = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                    .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
            }
            this.oconv.charset = charset;
            return this.oconv.ConvertFromUnicode(str);
        }

        if (!this.cache['u2a_' + charset])
            this.buildCache('u2a', charset); // sync building, which fails in IE

        var u2b = this.cache['u2a_' + charset]; // the table
        var ret = '',
            i, n = str.length;
        for (i = 0; i < n; ++i) {
            var ch = str[i];
            var code = ch.charCodeAt(0);
            if (code >= 129) { // use UAO table
                var idx = (code - 129) * 2;
                if (idx < u2b.length) {
                    var big5 = u2b[idx] + u2b[idx + 1];
                    ret += big5;
                }
            } else { // this is an ascii character
                ret += ch;
            }
        }
        return ret;
    }
};

