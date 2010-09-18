// get settings from preferences and apply it immediately
// Created by ChihHao <u881831@hotmail.com>

function PrefHandler(listener) {
    this.listener=listener;

    this.Encoding = 'big5';

    this.onPrefChange(true); // Initial
}

PrefHandler.prototype={
    onPrefChange: function(initial) {
        var options = new PCManOptions();
        var group = options.getGroupName(document.location.href);
        var keys = options.prefs.getKeyNames(group);
        var len = keys.length;
        for(var i=0; i<len; ++i) {
            switch(typeof(this[keys[i]])) {
            case 'string':
                var newStr = options.prefs.getStr(group,keys[i],this[keys[i]]);
                if(newStr != this[keys[i]]) {
                    if(initial)
                        this[keys[i]] = newStr;
                    else
                        this['set'+keys[i]](newStr);
                }
                break;
            case 'number':
                var newInt = options.prefs.getInt(group,keys[i],this[keys[i]]);
                if(newInt != this[keys[i]]) {
                    if(initial)
                        this[keys[i]] = newInt;
                    else
                        this['set'+keys[i]](newInt);
                }
                break;
            case 'boolean':
                var newBool = options.prefs.getBool(group,keys[i],this[keys[i]]);
                if(newBool != this[keys[i]]) {
                    if(initial)
                        this[keys[i]] = newBool;
                    else
                        this['set'+keys[i]](newBool);
                }
                break;
            default: // unknown or undefined
            }
        }
    },

    setEncoding: function(charset) {
        this.Encoding = charset;
        this.listener.view.redraw(true);
    }
}
