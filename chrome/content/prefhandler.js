// get settings from preferences and apply it immediately

function PrefHandler(listener) {
    this.listener=listener;
    this.observer = {};
    this.load(); // load values from ini file
}

PrefHandler.prototype={
    observe: function(startObserve) {
        var options = new PCManOptions();
        if(!startObserve) {
            for(var key in options.setupDefault) {
                options.prefService.removeObserver(key, this.observer[key]);
            }
            return;
        }
        for(var key in options.setupDefault) {
            //FIXME: improve the efficiency
            this.observer[key] = {
                view: this,
                onContentPrefSet: function(group, name, value) {
                    return this.view.onPrefChange();
                },
                onContentPrefRemoved: function(group, name) {
                    return this.view.onPrefChange();
                },
            }
            options.prefService.addObserver(key, this.observer[key]);
        }
    },

    load: function() {
        var options = new PCManOptions();
        var group = options.getGroup(document.location.href);
        for(var key in options.setupDefault)
            this[key] = options.getVal(group, key, options.setupDefault[key]);
    },

    onPrefChange: function() {
        var options = new PCManOptions();
        var group = options.getGroup(document.location.href);
        for(var key in options.setupDefault) {
            var newVal = options.getVal(group, key, this[key]);
            if(newVal != this[key]) // setting is changed
                this['set'+key](newVal);
        }
    },

    /*load: function() {
        var options = new PCManOptions();
        var group = options.getGroup(document.location.href);
        this.Encoding =
           options.getVal(group, 'Encoding', options.setupDefault.Encoding);
        this.Cols =
           options.getVal(group, 'Cols', options.setupDefault.Cols);
        this.Rows =
           options.getVal(group, 'Rows', options.setupDefault.Rows);
        this.NewTab =
           options.getVal(group, 'NewTab', options.setupDefault.NewTab);
    },

    onPrefChange: function(initial) {
        var options = new PCManOptions();
        var group = options.getGroup(document.location.href);
        var newVal;
        newVal = options.getVal(group, 'Encoding', this.Encoding);
        if(newVal != this.Encoding) this.setEncoding(newVal);
        newVal = options.getVal(group, 'Cols', this.Cols);
        if(newVal != this.Cols) this.setCols(newVal);
        newVal = options.getVal(group, 'Rows', this.Rows);
        if(newVal != this.Rows) this.setRows(newVal);
        newVal = options.getVal(group, 'NewTab', this.NewTab);
        if(newVal != this.NewTab) this.setNewTab(newVal);
    },*/

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
    },

    setNewTab: function(isNewTab) {
        this.NewTab = isNewTab;
    }
}
