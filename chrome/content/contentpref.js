// handle some direct access to preference

function PCManOptions() {
    this.setupDefault = PrefDefaults;
    this.useLoginMgr = PrefLoginMgr;
    this.isFX3 = this.getVersion();
    this.load();
}

PCManOptions.prototype = {
    // Find the version of PCManFx
    getVersion: function() {
        var app = Components.classes["@mozilla.org/fuel/application;1"]
                            .getService(Components.interfaces.fuelIApplication);

        if(document.getElementById('pcmanOption'))
            getVersion(app);

        return Boolean(app.extensions);
    },

    load: function() {
        this.groups = [];
        this.prefService(false); // read preferences
        // repair the default group
        if(!this.groups[0]) {
            this.copyGroup(0, null, '_override_');
        } else if(this.groups[0].Name != this.setupDefault.Name) {
            this.groups.unshift({});
            this.copyGroup(0, null, '_override_');
        }
        for(var i=this.groups.length-1; i>=0; --i) {
            // remove the empty group
            if(!this.groups[i]) {
                this.removeGroup(i);
                continue;
            }
            // repair the references
            for(var key in this.setupDefault) {
                if(typeof(this.groups[i][key]) == "undefined")
                    this.setVal(i, key, this.setupDefault[key]);
            }
        }
        this.setLoginInfo(true);
    },

    save: function() {
        this.setLoginInfo(false);
        this.prefService(true); // write preferences
        this.setLoginInfo(true);
    },

    getGroupNames: function() {
        var groups = [];
        for(var i=0; i<this.groups.length; ++i)
            groups[i] = this.getVal(i, 'Name', this.setupDefault.Name);
        return groups;
    },

    // Determine the group index by the url
    findGroup: function(url) {
        if(!url) return 0;
        url = url.replace(/.*:\/\/([^\/]*).*/, '$1'); // Trim the protocol
        // search from the newest group
        for(var i=this.groups.length-1; i>=0; --i) {
            if(url == this.getVal(i, 'Name', null))
                return i;
        }
        return 0; // Not found
    },

    getVal: function(group, key, value) {
        if(this.groups[group] && typeof(this.groups[group][key])!='undefined') {
            if(typeof(this.setupDefault[key]) == 'number')
                return parseInt(this.groups[group][key]);
            else
                return this.groups[group][key];
        } else {
            return value;
        }
    },

    setVal: function(group, key, value) {
        if(!this.groups[group])
            this.groups[group] = {};
        this.groups[group][key] = value;
    },

    // Copy fromGroup to toGroup
    // Copy from setupDefault if fromGroup is null.
    // Add a new group if toGroup is null.
    // The name of the copied group can be set simultaneously
    // If the name is set as '_override_', use the name of fromGroup
    copyGroup: function(toGroup, fromGroup, name) {
        name = name.replace(/.*:\/\/([^\/]*).*/, '$1'); // Trim the protocol
        if(toGroup == null)
            toGroup = this.groups.length;
        if(fromGroup == null)
            var data = this.setupDefault;
        else
            var data = this.groups[fromGroup];
        for(var key in data) {
            if(key != 'Name' || name == '_override_')
                this.setVal(toGroup, key, data[key]);
            else if(name)
                this.setVal(toGroup, key, name); // key == 'Name'
        }
    },

    // Remove the group
    // For the default group, reset to the setupDefault 
    removeGroup: function(group) {
        if(group == 0)
            return this.copyGroup(0, null, '_override_');
        this.groups.splice(group,1);
    },

    // Read or write the content preferences

    prefService: function(isWrite) {
        var prefService = Components.classes["@mozilla.org/content-pref/service;1"]
                           .getService(Components.interfaces.nsIContentPrefService);
        var _this = this;
        var getURI = function(group) { // Only used in this function
            if(group == _this.setupDefault.Name)
                return null;
            try {
                var uri = Components.classes['@mozilla.org/network/io-service;1']
                          .getService(Components.interfaces.nsIIOService)
                          .newURI('telnet://'+group, null, null);
                return _this.isFX3 ? uri : uri.hostPort;
            } catch (e) { // incorrect group
                return null;
            }
        };
        var groupURIs = [null];
        var groupedPrefs = prefService.getPrefsByName('Name', null);
        var enumerator = groupedPrefs.enumerator;
        while(enumerator.hasMoreElements()) {
            var property = enumerator.getNext()
                          .QueryInterface(Components.interfaces.nsIProperty);
            var groupName = property.name;
            if(groupName && getURI(groupName))
                groupURIs.push(getURI(groupName));
        }
        if(!isWrite) { // read
            for(var i=0; i<groupURIs.length; ++i) {
                for(var key in this.setupDefault) {
                    if(!prefService.hasPref(groupURIs[i], key, null))
                        continue;
                    this.setVal(i, key, prefService.getPref(groupURIs[i], key, null));
                }
            }
            return;
        }
        // write
        for(var i=0; i<this.groups.length; ++i) {
            if(groupURIs.join(', ').indexOf(this.groups[i].Name) < 0)
                groupURIs.push(getURI(this.groups[i].Name)); // new groups
        }
        for(var i=0; i<groupURIs.length; ++i) {
            for(var key in this.setupDefault) {
                var groupName = groupURIs[i];
                if(this.isFX3 && groupName)
                    groupName = groupName.hostPort;
                var newVal = null;
                if(!groupName || this.findGroup(groupName)>0)
                    newVal = this.getVal(this.findGroup(groupName), key);
                if(prefService.hasPref(groupURIs[i], key, null)) {
                    var orgVal = prefService.getPref(groupURIs[i], key, null);
                    if(newVal == orgVal) // not changed
                        continue;
                    if(newVal == null)
                        prefService.removePref(groupURIs[i], key, null);
                    else
                        prefService.setPref(groupURIs[i], key, newVal, null);
                } else {
                    if(newVal != null)
                        prefService.setPref(groupURIs[i], key, newVal, null);
                }
            }
        }
    },

    // Observer for the changes of the prefs

    addObserver: function(url, prefHandler) {
        var prefService = Components.classes["@mozilla.org/content-pref/service;1"]
                           .getService(Components.interfaces.nsIContentPrefService);

        // reduce the call of sync
        var _this = this;
        var queueUpdate = function() {
            if(_this.queueTimeout)
                return;
            _this.queueTimeout = setTimer(false, function() {
                if(_this.queueTimeout) {
                    _this.queueTimeout.cancel();
                    delete _this.queueTimeout;
                }
                _this.sync(url, prefHandler);
            }, 100);
        };

        prefHandler.handler = {
            view: this,
            onContentPrefSet: function(group, name, value) {
                queueUpdate();
            },
            onContentPrefRemoved: function(group, name) {
                queueUpdate();
            }
        }
        for(var key in this.setupDefault)
            prefService.addObserver(key, prefHandler.handler);
        // the observer for the username and the password doesn't work here.
        // is it necessary observe the changes immediately?
        // https://developer.mozilla.org/en/Observer_Notifications#Login_Manager
    },

    removeObserver: function(prefHandler) {
        var prefService = Components.classes["@mozilla.org/content-pref/service;1"]
                           .getService(Components.interfaces.nsIContentPrefService);
        for(var key in this.setupDefault)
            prefService.removeObserver(key, prefHandler.handler);
    },

    sync: function(url, prefHandler) {
        var initial = (typeof(prefHandler.Name) == 'undefined');
        if(!initial)
            this.load(); // read new prefs from the database
        var group = this.findGroup(url);
        for(var key in this.setupDefault) {
            var newVal = this.getVal(group, key, this.setupDefault[key]);
            if(newVal != prefHandler[key]) { // setting is changed
                prefHandler[key] = newVal;
                if(!initial && prefHandler.observer[key]) {
                    prefHandler.observer.handler = prefHandler.observer[key];
                    prefHandler.observer.handler(); // wrap 'this'
                }
            }
        }
    },

    // Processing the Login information
    // https://developer.mozilla.org/En/Using_nsILoginManager

    setLoginInfo: function(show) {
        if(show) {
            this.logins = this.getGroupNames();
            for(var i=0; i<this.groups.length; ++i)
                this.getLoginMsg(this.getVal(i, 'Name', this.setupDefault.Name));
        } else { // hide
            for(var i=0; i<this.logins.length; ++i)
                this.delLoginMsg(this.logins[i]);
            delete this.logins;
            for(var i=0; i<this.groups.length; ++i) {
                this.setLoginMsg(this.getVal(i, 'Name', this.setupDefault.Name));
                for(var key in this.useLoginMgr)
                    this.setVal(i, key, this.setupDefault[key]);
            }
        }
    },

    getLoginMsg: function(groupName) {
        var url = (groupName == this.setupDefault.Name) ? 'chrome://pcmanfx2' : 'telnet://' + groupName;
        var group = this.findGroup(groupName);
        try {
            var logins = Components.classes["@mozilla.org/login-manager;1"]
                                   .getService(Components.interfaces.nsILoginManager)
                                   .findLogins({}, url, 'chrome://pcmanfx2', null);

            for(var key in this.useLoginMgr) {
                this.setVal(group, key, logins.length ?
                    logins[0][this.useLoginMgr[key]] :
                    this.setupDefault[key]);
            }
        } catch(e) {
            for(var key in this.useLoginMgr)
                this.setVal(group, key, this.setupDefault[key]);
        }
    },

    setLoginMsg: function(groupName) {
        this.delLoginMsg(groupName);
        var url = (groupName == this.setupDefault.Name) ? 'chrome://pcmanfx2' : 'telnet://' + groupName;
        var group = this.findGroup(groupName);
        var userPass = {}
        for(var key in this.useLoginMgr)
            userPass[this.useLoginMgr[key]] = this.getVal(group, key, this.setupDefault[key]);
        try {
            var myLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                                                         Components.interfaces.nsILoginInfo,
                                                         "init");
            var login = new myLoginInfo(url, 'chrome://pcmanfx2', null,
                                        userPass.username, userPass.password, '', '');

            Components.classes["@mozilla.org/login-manager;1"]
                      .getService(Components.interfaces.nsILoginManager)
                      .addLogin(login);
        } catch(e) {}
    },

    delLoginMsg: function(groupName) {
        var url = (groupName == this.setupDefault.Name) ? 'chrome://pcmanfx2' : 'telnet://' + groupName;
        try {
            var loginManager = Components.classes["@mozilla.org/login-manager;1"]
                                         .getService(Components.interfaces.nsILoginManager);
            var logins = loginManager.findLogins({}, url, 'chrome://pcmanfx2', null);

            for (var i = 0; i < logins.length; i++)
                loginManager.removeLogin(logins[i]);
        } catch(e) {}
    }
}

