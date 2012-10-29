// get settings from preferences and apply it immediately

function PrefHandler(listener) {
    this.listener=listener;
    this.handler=null; // handle the callback from the observer
    this.load();
    this.observer.observe(listener);
    //FIXME: The pollution of the namespace for the preferences
}

PrefHandler.prototype={
    // load prefs from the database
    load: function(triggerObserver) {
        var options = new PCManOptions();
        options.sync(document.location.href, this);
    },

    // Listen the changes of the prefs
    observe: function(startObserve) {
        var options = new PCManOptions();
        if(startObserve)
            return options.addObserver(document.location.href, this);
        else
            return options.removeObserver(this);
    },

    // functions for applying prefs immediately
    // for prefs without handler, only the pref value is set 

    observer : {
        //FIXME: The pollution of the namespace for the preferences
        observe: function(listener) {
            this.listener = listener;
        },

        handler: null, // wrap 'this' for FX 3.6 doesn't support bind() 

        Encoding: function() {
            this.listener.view.redraw(true);
        },

        Cols: function() {
            this.listener.buf.onResize();
        },
 
        Rows: function() {
            this.listener.buf.onResize();
        },
 
        HAlignCenter: function() {
            this.listener.view.setAlign();
        },
 
        VAlignCenter: function() {
            this.listener.view.setAlign();
        },
 
        MouseBrowsing: function() {
            this.listener.buf.mouseBrowsing.setPageState();
        },
 
        AntiIdleTime: function() {
            this.listener.conn.send();
        },
 
        AskForClose: function() {
            this.listener.conn.closeConfirm();
        }
    }
}
