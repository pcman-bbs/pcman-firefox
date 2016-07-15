// get settings from preferences and apply it immediately

'use strict';

var EXPORTED_SYMBOLS = ["PrefHandler"];

function PrefHandler(prefs) {
    this.listener = prefs.listener;
    prefs.setSite(prefs.listener.ui.getUrl());
    prefs.getter = this.getter;
    var _this = this;
    prefs.onChanged(function(key, oldValue, newValue) {
        _this.applyChanges(key, oldValue, newValue);
    });
}

PrefHandler.prototype = {
    // preprocess the values of the prefs
    getter: function(key, value) {
        switch (key) {
            case 'Encoding':
                if (value == 'system') {
                    var language = this.listener.global.navigator.language;
                    value = (language == 'zh-CN' ? 'gb2312' : 'big5');
                }
                // fall through
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
            default:
        }
    }
}

