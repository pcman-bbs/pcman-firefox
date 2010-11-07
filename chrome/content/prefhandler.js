// get settings from preferences and apply it immediately

function PrefHandler(listener) {
    this.listener=listener;
    this.onPrefChange(true); // Initial, load values from ini file
}

PrefHandler.prototype={
    onPrefChange: function(initial) {
        var options = new PCManOptions();
        var group = options.getGroupName(document.location.href);
        for(var key in options.setupDefault) {
            if(initial)
                this[key] = options.setupDefault[key];
            var newVal = options.getVal(group, key, this[key]);
            if(newVal != this[key]) { // Setting is changed
                if(initial)
                    this[key] = newVal;
                else
                    this['set'+key](newVal);
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
