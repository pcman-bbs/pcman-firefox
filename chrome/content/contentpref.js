// handle some direct access to preference

function PCManOptions() {
    this.defaultGroup = 'default';
    this.setupDefault = PrefDefault;
    this.isFX3 = this.getVersion();
    this.load();
}

PCManOptions.prototype = {
    // Find the version of PCManFx
    getVersion: function() {
        var app = Components.classes["@mozilla.org/fuel/application;1"]
                            .getService(Components.interfaces.fuelIApplication);

        if(document.getElementById('pcmanOption')) {
            if(app.extensions) { // for firefox 3.x
                document.getElementById('version').value = 
                    app.extensions.get('pcmanfx2@pcman.org').version;
            } else { // for firefox 4+ 
                //FIXME: get return value from this asynchronous function
                app.getExtensions(function(extensions) {
                    document.getElementById('version').value = 
                        extensions.get('pcmanfx2@pcman.org').version;
                });
            }
        }

        return Boolean(app.extensions);
    },

    // Create objects storing all pref values in every group
    // and load the values from the database
    load: function() {
        this.prefService = Components.classes["@mozilla.org/content-pref/service;1"]
                           .getService(Components.interfaces.nsIContentPrefService);
        this.prefs = {};
        this.prefs.groups = {};
        var groups = this.getGroupNames();
        for(var i = groups.length - 1; i >= 0; --i) {
            var group = groups[i];
            this.prefs.groups[group] = {};
            var uri = null;
            if(group != this.defaultGroup)
                uri = this.getURI(group);
            for(var key in this.setupDefault) {
                if(this.prefService.hasPref(uri, key)) {
                    var value = this.prefService.getPref(uri, key);
                } else {
                    var value = this.setupDefault[key];
                    this.prefService.setPref(uri, key, value);
                }
                this.prefs.groups[group][key] = value;
            }
        }
    },

    // save data into database
    save: function() {
        var groups = this.getGroupNames();
        for(var grp in this.prefs.groups) {
            if(!groups[grp]) groups.push(grp); // just added groups
        }
        for(var i = groups.length - 1; i >= 0; --i) {
            var group = groups[i];
            if(this.hasGroup(group)) { // check if the group was removed or not
                var uri = null;
                if(group != this.defaultGroup)
                    uri = this.getURI(group);
                for(var key in this.setupDefault) {
                    var value = this.prefs.groups[group][key];
                    this.prefService.setPref(uri, key, value);
                }
            } else { // to be removed groups
                if(group != this.defaultGroup) {
                    var uri = this.getURI(group);
                    for(var key in this.setupDefault)
                        this.prefService.removePref(uri, key);
                }
            }
        }
    },

    // List all groups in the database (rather than these in this object!)
    getGroupNames: function(specifiedKey) {
        var groups = [];
        groups.push(this.defaultGroup);
        if(!specifiedKey) {
            for(var key in this.setupDefault) { // Choose one key arbitrarily
                specifiedKey = key;
                break;
            }
        }
        // FIXME: Some groups may be missed for new prefs in upgraded version
        var groupedPrefs = this.prefService.getPrefsByName(specifiedKey);
        var enumerator = groupedPrefs.enumerator;
        while(enumerator.hasMoreElements()) {
            var property = enumerator.getNext()
                          .QueryInterface(Components.interfaces.nsIProperty);
            var group = property.name;
            if(group)
                groups.push(group);
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
        var ios = Components.classes['@mozilla.org/network/io-service;1']
                  .getService(Components.interfaces.nsIIOService);
        var uri = ios.newURI(url, null, null);
        var group = this.isFX3 ? uri.host : uri.hostPort;
        if(!realName && !this.hasGroup(group)) // Not created, use default
            group = this.defaultGroup;
        return group;
    },

    // Get the key for the database from the group name
    getURI: function(group) {
        var uri = Components.classes['@mozilla.org/network/io-service;1']
                  .getService(Components.interfaces.nsIIOService)
                  .newURI('telnet://'+group, null, null);
        return this.isFX3 ? uri : uri.hostPort;
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

