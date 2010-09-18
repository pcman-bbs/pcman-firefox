// get settings from preferences and apply it immediately
// Created by ChihHao <u881831@hotmail.com>

function PrefHandler(listener) {
    this.listener=listener;

    // The following is for type checking and unexpected errors of reading file
    this.Encoding = 'big5';

    this.onPrefChange(true); // Initial, load values from ini file
}

PrefHandler.prototype={
    onPrefChange: function(initial) {
        var options = new PCManOptions();
        var group = options.getGroupName(document.location.href);
        var keys = options.prefs.getKeyNames(group);
        var len = keys.length;
        for(var i=0; i<len; ++i) {
            var key = keys[i];
            var value = this[keys[i]];
            switch(typeof(value)) {
            case 'string':
                var newStr = options.prefs.getStr(group, key, value);
                if(newStr != value) { // Setting is changed
                    if(initial)
                        this[keys[i]] = newStr;
                    else
                        this['set'+keys[i]](newStr);
                }
                break;
            case 'number':
                var newInt = options.prefs.getInt(group, key, value);
                if(newInt != value) { // Setting is changed
                    if(initial)
                        this[keys[i]] = newInt;
                    else
                        this['set'+keys[i]](newInt);
                }
                break;
            case 'boolean':
                var newBool = options.prefs.getBool(group, key, value);
                if(newBool != value) { // Setting is changed
                    if(initial)
                        this[keys[i]] = newBool;
                    else
                        this['set'+keys[i]](newBool);
                }
                break;
            default: // unknown type or undefined
            }
        }
    },

    // functions for applying prefs immediately
    // function with name 'set' + pref_name is the handler of pref_name

    setEncoding: function(charset) {
        this.Encoding = charset;
        this.listener.view.redraw(true);
    }
}
