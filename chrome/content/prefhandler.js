// get settings from preferences and apply it immediately

function PrefHandler(listener) {
    this.listener=listener;
    this.onPrefChange(true); // Initial, load values from ini file
}

PrefHandler.prototype={
    observe: function() {
        var options = new PCManOptions();
        this.observer = {};
        for(var key in options.setupDefault) {
            this.observer[key] = {
                view: this,
                onContentPrefSet: function(group, name, value) {
                    return this.view.onPrefChange(false);
                },
                onContentPrefRemoved: function(group, name) {}
            }
            options.prefService.addObserver(key, this.observer[key]);
        }
    },

    onPrefChange: function(initial) {
        var options = new PCManOptions();
        var group = options.getGroup(document.location.href);
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
    },

    setCols: function(cols) {
        this.Cols = cols;
        this.listener.buf.onResize();
    },

    setRows: function(rows) {
        this.Rows = rows;
        this.listener.buf.onResize();
    }
}
