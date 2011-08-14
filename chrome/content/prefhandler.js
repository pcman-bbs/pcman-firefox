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
        // the observer for the username and the password doesn't work here.
        // is it necessary observe the changes immediately?
        // https://developer.mozilla.org/en/Observer_Notifications#Login_Manager
    },

    load: function(onlyLogin) {
        var options = new PCManOptions();
        var group = options.getGroup(document.location.href);
        var settings = onlyLogin ? options.useLoginMgr : options.setupDefault;
        for(var key in settings)
            this[key] = options.getVal(group, key, options.setupDefault[key]);
    },

    onPrefChange: function() {
        var options = new PCManOptions();
        var group = options.getGroup(document.location.href);
        for(var key in options.setupDefault) {
            var newVal = options.getVal(group, key, this[key]);
            if(newVal != this[key]) { // setting is changed
                this[key] = newVal;
                if(this['set'+key]) this['set'+key]();
            }
        }
    },

    // functions for applying prefs immediately
    // function with name 'set' + pref_name is the handler of pref_name
    // for prefs without handler, only the pref value is set 

    setEncoding: function() {
        this.listener.view.redraw(true);
    },

    setCols: function() {
        this.listener.buf.onResize();
    },

    setRows: function() {
        this.listener.buf.onResize();
    },

    setAntiIdleTime: function() {
        this.listener.conn.send();
    },

    setAskForClose: function() {
        this.listener.conn.closeConfirm();
    }
}
