// handle some direct access to preference

function PCManOptions() {
    this.defaultGroup = 'default';
    this.specifiedKey = PrefDefault;
    this.setupDefault = PrefDefaults;
    this.useLoginMgr = PrefLoginMgr;
    this.prefsKey = "PCManOptions";

    this.prefService.setOptions(this);
    this.load();
}

PCManOptions.prototype = {
    prefService: {
        setOptions: function(options) {
            this.options = options;
        },

        addObserver: function(key, observer) {
            if(key != this.options.specifiedKey)
                return null; // only one observer is required in this case
            var prefsKey = this.options.prefsKey;
            observer.handler = {
                view: observer,
                handleEvent: function(event) {
                    if(event.key == prefsKey)
                        this.view.onContentPrefSet(null, null, null);
                    else if(event.key == null) // all localStoage is removed
                        this.view.onContentPrefRemoved(null, null);
                }
            }
            addEventListener("storage", observer.handler, false);
        },

        removeObserver: function(key, observer) {
            if(key != this.options.specifiedKey)
                return; // only one observer is required in this case
            removeEventListener("storage", observer.handler, false);
        }
    },

    // Create objects storing all pref values in every group
    // and load the values from the database
    load: function() {
        this.prefs = {};
        if(!localStorage[this.prefsKey])
            this.prefs.groups = {};
        else
            this.prefs.groups = JSON.parse(localStorage[this.prefsKey]);

        if(!this.prefs.groups[this.defaultGroup])
            this.prefs.groups[this.defaultGroup] = {};

        for(var group in this.prefs.groups) {
            for(var key in this.setupDefault) {
                if(typeof(this.prefs.groups[group][key]) == "undefined")
                    this.prefs.groups[group][key] = this.setupDefault[key];
            }
        }
    },

    // save data into database
    save: function() {
        localStorage[this.prefsKey] = JSON.stringify(this.prefs.groups);
    },

    // List all groups in the database (rather than these in this object!)
    getGroupNames: function(specifiedKey) {
        var groups = [];
        groups.push(this.defaultGroup);
        if(localStorage[this.prefsKey]) {
            var prefs = JSON.parse(localStorage[this.prefsKey]);
            for(var group in prefs) {
                if(group != this.defaultGroup)
                    groups.push(group);
            }
        }
        return groups;
    },

    hasGroup: function(group) {
        return this.prefs.groups[group] ? true : false;
    },

    // Determine the group name (displayed name) by url
    // and optionally return default for not created site
    getGroup: function(url, realName) {
        if(!url) return this.defaultGroup;
        var group = url;
        if(!realName && !this.hasGroup(group)) // Not created, use default
            group = this.defaultGroup;
        return group;
    },

    // Get the key for the database from the group name
    getURI: function(group) {
        return group;
    },

    getVal: function(group, key, value) {
        if(this.prefs.groups[group] && typeof(this.prefs.groups[group][key]) != 'undefined')
            return this.prefs.groups[group][key];
        else
            return value;
    },

    setVal: function(group, key, value) {
        if(!this.prefs.groups[group])
            this.prefs.groups[group] = {};
        this.prefs.groups[group][key] = value;
    },

    // Reset an existed group or create a new group
    resetGroup: function(group) {
        for(var key in this.setupDefault) {
            var value = this.setupDefault[key];
            this.setVal(group, key, value);
        }
    },

    removeGroup: function(group) {
        if(group == this.defaultGroup)
            return this.resetGroup(this.defaultGroup);
        delete this.prefs.groups[group];
    }
}

