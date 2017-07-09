// Javascript module for Unicode-at-on support
// Reference: http://moztw.org/docs/big5/
// http://moztw.org/docs/big5/table/uao250-u2b.txt

'use strict';

var EXPORTED_SYMBOLS = ["BrowserConv"];

function BrowserConv(ui) {
    this.ui = ui;
    this.fontWidth = ''; // show UTF8 half-width chars as full-width
}

BrowserConv.prototype = {
    cache: {},
    buildCache: function(type, charset, callback) {
        if (charset.toLowerCase() == 'utf-8')
            return callback ? callback() : '';

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
        if (charset.toLowerCase() == 'utf-8')
            return data;

        this.charset = charset;

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

        if (charset.toLowerCase() == 'utf-8')
            return this.StringToUTF8(str);

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
    },

    preprocess: function(data) {
        var charset = this.charset;

        if (charset.toLowerCase() == 'utf-8')
            return this.UTF8ToString(data);
        return data;
    },
    isFillDummy: function(str) {
        var charset = this.charset;

        if (charset.toLowerCase() == 'utf-8')
            return this.isFullWidth(str);
        return false;
    },

    utf8Buffer: '',
    UTF8ToString: function(data) {
        var str = '';
        var utf8 = this.utf8Buffer + data.replace(/[\xC0-\xDF]$/, '')
            .replace(/[\xE0-\xEF][\x80-\xBF]?$/, '')
            .replace(/[\xF0-\xF7][\x80-\xBF]{0,2}$/, '')
            .replace(/[\xF8-\xFB][\x80-\xBF]{0,3}$/, '')
            .replace(/[\xFC-\xFD][\x80-\xBF]{0,4}$/, '');
        this.utf8Buffer = data.substr(utf8.length - this.utf8Buffer.length);
        try {
            str = decodeURIComponent(escape(utf8));
        } catch (e) { // not a valid utf8
            str = data; // hiding this may result in disorder of termbuf
        }
        return str;
    },
    StringToUTF8: function(str) {
        return unescape(encodeURIComponent(str));
    },
    isFullWidth: function(str) {
        var charset = this.charset;

        //FIXME: check the context to determine the width of ambiguous chars
        // without context information, they are set as narrow chars by default
        var table = '[' + this.wideFullwidth + ']';
        if (this.fontWidth == 'EastAsian')
            table = '[' + this.ambiguous + table.substr(1);
        if (!str)
            return table;

        var code = str.charCodeAt(0);
        if (charset.toLowerCase() != 'utf-8' || this.fontWidth == 'FullWidth')
            return (code > 0x7f);
        return (new RegExp(table)).test(str[0]);
    },

    // Unicode Standard 10.0.0
    // from http://www.unicode.org/reports/tr11/
    wideFullwidth: [
        '\u1100-\u115f',
        '\u231a-\u231b',
        '\u2329-\u232a',
        '\u23e9-\u23ec',
        '\u23f0',
        '\u23f3',
        '\u25fd-\u25fe',
        '\u2614-\u2615',
        '\u2648-\u2653',
        '\u267f',
        '\u2693',
        '\u26a1',
        '\u26aa-\u26ab',
        '\u26bd-\u26be',
        '\u26c4-\u26c5',
        '\u26ce',
        '\u26d4',
        '\u26ea',
        '\u26f2-\u26f3',
        '\u26f5',
        '\u26fa',
        '\u26fd',
        '\u2705',
        '\u270a-\u270b',
        '\u2728',
        '\u274c',
        '\u274e',
        '\u2753-\u2755',
        '\u2757',
        '\u2795-\u2797',
        '\u27b0',
        '\u27bf',
        '\u2b1b-\u2b1c',
        '\u2b50',
        '\u2b55',
        '\u2e80-\u2e99',
        '\u2e9b-\u2ef3',
        '\u2f00-\u2fd5',
        '\u2ff0-\u2ffb',
        '\u3000-\u303e',
        '\u3041-\u3096',
        '\u3099-\u30ff',
        '\u3105-\u312e',
        '\u3131-\u318e',
        '\u3190-\u31ba',
        '\u31c0-\u31e3',
        '\u31f0-\u321e',
        '\u3220-\u3247',
        '\u3250-\u32fe',
        '\u3300-\u4dbf',
        '\u4e00-\ua48c',
        '\ua490-\ua4c6',
        '\ua960-\ua97c',
        '\uac00-\ud7a3',
        '\uf900-\ufaff',
        '\ufe10-\ufe19',
        '\ufe30-\ufe52',
        '\ufe54-\ufe66',
        '\ufe68-\ufe6b',
        '\uff01-\uff60',
        '\uffe0-\uffe6'
    ].join(''),
    ambiguous: [
        '\u00a1',
        '\u00a4',
        '\u00a7-\u00a8',
        '\u00aa',
        '\u00ad-\u00ae',
        '\u00b0-\u00b4',
        '\u00b6-\u00ba',
        '\u00bc-\u00bf',
        '\u00c6',
        '\u00d0',
        '\u00d7-\u00d8',
        '\u00de-\u00e1',
        '\u00e6',
        '\u00e8-\u00ea',
        '\u00ec-\u00ed',
        '\u00f0',
        '\u00f2-\u00f3',
        '\u00f7-\u00fa',
        '\u00fc',
        '\u00fe',
        '\u0101',
        '\u0111',
        '\u0113',
        '\u011b',
        '\u0126-\u0127',
        '\u012b',
        '\u0131-\u0133',
        '\u0138',
        '\u013f-\u0142',
        '\u0144',
        '\u0148-\u014b',
        '\u014d',
        '\u0152-\u0153',
        '\u0166-\u0167',
        '\u016b',
        '\u01ce',
        '\u01d0',
        '\u01d2',
        '\u01d4',
        '\u01d6',
        '\u01d8',
        '\u01da',
        '\u01dc',
        '\u0251',
        '\u0261',
        '\u02c4',
        '\u02c7',
        '\u02c9-\u02cb',
        '\u02cd',
        '\u02d0',
        '\u02d8-\u02db',
        '\u02dd',
        '\u02df',
        '\u0300-\u036f',
        '\u0391-\u03a1',
        '\u03a3-\u03a9',
        '\u03b1-\u03c1',
        '\u03c3-\u03c9',
        '\u0401',
        '\u0410-\u044f',
        '\u0451',
        '\u2010',
        '\u2013-\u2016',
        '\u2018-\u2019',
        '\u201c-\u201d',
        '\u2020-\u2022',
        '\u2024-\u2027',
        '\u2030',
        '\u2032-\u2033',
        '\u2035',
        '\u203b',
        '\u203e',
        '\u2074',
        '\u207f',
        '\u2081-\u2084',
        '\u20ac',
        '\u2103',
        '\u2105',
        '\u2109',
        '\u2113',
        '\u2116',
        '\u2121-\u2122',
        '\u2126',
        '\u212b',
        '\u2153-\u2154',
        '\u215b-\u215e',
        '\u2160-\u216b',
        '\u2170-\u2179',
        '\u2189',
        '\u2190-\u2199',
        '\u21b8-\u21b9',
        '\u21d2',
        '\u21d4',
        '\u21e7',
        '\u2200',
        '\u2202-\u2203',
        '\u2207-\u2208',
        '\u220b',
        '\u220f',
        '\u2211',
        '\u2215',
        '\u221a',
        '\u221d-\u2220',
        '\u2223',
        '\u2225',
        '\u2227-\u222c',
        '\u222e',
        '\u2234-\u2237',
        '\u223c-\u223d',
        '\u2248',
        '\u224c',
        '\u2252',
        '\u2260-\u2261',
        '\u2264-\u2267',
        '\u226a-\u226b',
        '\u226e-\u226f',
        '\u2282-\u2283',
        '\u2286-\u2287',
        '\u2295',
        '\u2299',
        '\u22a5',
        '\u22bf',
        '\u2312',
        '\u2460-\u24e9',
        '\u24eb-\u254b',
        '\u2550-\u2573',
        '\u2580-\u258f',
        '\u2592-\u2595',
        '\u25a0-\u25a1',
        '\u25a3-\u25a9',
        '\u25b2-\u25b3',
        '\u25b6-\u25b7',
        '\u25bc-\u25bd',
        '\u25c0-\u25c1',
        '\u25c6-\u25c8',
        '\u25cb',
        '\u25ce-\u25d1',
        '\u25e2-\u25e5',
        '\u25ef',
        '\u2605-\u2606',
        '\u2609',
        '\u260e-\u260f',
        '\u261c',
        '\u261e',
        '\u2640',
        '\u2642',
        '\u2660-\u2661',
        '\u2663-\u2665',
        '\u2667-\u266a',
        '\u266c-\u266d',
        '\u266f',
        '\u269e-\u269f',
        '\u26bf',
        '\u26c6-\u26cd',
        '\u26cf-\u26d3',
        '\u26d5-\u26e1',
        '\u26e3',
        '\u26e8-\u26e9',
        '\u26eb-\u26f1',
        '\u26f4',
        '\u26f6-\u26f9',
        '\u26fb-\u26fc',
        '\u26fe-\u26ff',
        '\u273d',
        '\u2776-\u277f',
        '\u2b56-\u2b59',
        '\u3248-\u324f',
        '\ue000-\uf8ff',
        '\ufe00-\ufe0f',
        '\ufffd'
    ].join('')
};

