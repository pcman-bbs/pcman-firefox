// get settings from preferences and apply it immediately

'use strict';

var EXPORTED_SYMBOLS = ["PrefHandler"];

function PrefHandler(prefs) {
    this.listener = prefs.listener;
    prefs.setSite(prefs.listener.ui.getUrl());
    var _this = this;
    prefs.getter = function(key, value) {
        return _this.getter(key, value);
    };
    prefs.onChanged(function(key, oldValue, newValue) {
        _this.applyChanges(key, oldValue, newValue);
    });
}

PrefHandler.prototype = {
    // preprocess the values of the prefs
    getter: function(key, value) {
        switch (key) {
            case 'Encoding':
                switch (value) {
                    case 'system':
                        var language = this.listener.ui.l10n();
                        value = (language == 'zh-CN' ? 'gb2312' : 'big5');
                        break;
                    case 'utf-8':
                        this.listener.ui.converter.forceFullWidth = false;
                        break;
                    case 'utf-8_FullWidth':
                        this.listener.ui.converter.forceFullWidth = true;
                        value = 'utf-8';
                        break;
                    default:
                }
                return value;
            case 'AntiIdleTime':
            case 'ReconnectTime':
            case 'ReconnectDelay':
                return value * 1000; // Change unit from sec to msec
            case 'AntiIdleStr':
            case 'EnterKey':
            case 'EscapeString':
            case 'ReplyString0':
            case 'ReplyString1':
            case 'ReplyString2':
            case 'ReplyString3':
            case 'ReplyString4':
            case 'PreLogin':
            case 'PostLogin':
            case 'EscapeString':
                return this.unEscapeStr(value);
            default:
                return value;
        }
    },

    // functions for applying prefs immediately
    applyChanges: function(key, oldValue, newValue) {
        switch (key) {
            case 'Encoding':
                var _this = this;
                this.listener.ui.setConverter(function() {
                    _this.listener.view.redraw(true);
                });
                break;
            case 'Cols':
            case 'Rows':
                this.listener.buf.onResize();
                break;
            case 'HAlignCenter':
            case 'VAlignCenter':
                this.listener.view.onResize();
                break;
            case 'AntiIdleTime':
                this.listener.conn.send();
                break;
            default:
        }
    },

    // Support caret notations (^C, ^H, ^U, ^[, ^?, ...)
    // and hexadecimal notation (\x1b, \x7f, ...)
    // If you want to show \ and ^, use \\ and \^ respectively
    unEscapeStr: function(str) {
        var result = '';
        for (var i = 0; i < str.length; ++i) {
            switch (str.charAt(i)) {
                case '\\':
                    if (i == str.length - 1) { // independent \ at the end
                        result += '\\';
                        break;
                    }
                    switch (str.charAt(i + 1)) {
                        case '\\':
                            result += '\\\\';
                            ++i;
                            break;
                        case '^':
                            result += '^';
                            ++i;
                            break;
                        case 'x':
                            if (i > str.length - 4) {
                                result += '\\';
                                break;
                            }
                            var code = parseInt(str.substr(i + 2, 2), 16);
                            result += String.fromCharCode(code);
                            i += 3;
                            break;
                        default:
                            result += '\\';
                    }
                    break;
                case '^':
                    if (i == str.length - 1) { // independent ^ at the end
                        result += '^';
                        break;
                    }
                    if ('@' <= str.charAt(i + 1) && str.charAt(i + 1) <= '_') {
                        var code = str.charCodeAt(i + 1) - 64;
                        result += String.fromCharCode(code);
                        i++;
                    } else if (str.charAt(i + 1) == '?') {
                        result += '\x7f';
                        i++;
                    } else {
                        result += '^';
                    }
                    break;
                default:
                    result += str.charAt(i);
            }
        }
        return result;
    }
};

