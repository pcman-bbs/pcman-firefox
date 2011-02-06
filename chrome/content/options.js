// Process prefwindow and handle all access to preference

function PCManOptions() {
    this.defaultGroup = 'default';

    this.setupDefault = {
        'Encoding': 'big5'
    };

    this.initGroups();
}

PCManOptions.prototype = {
    // Initialize the prefwindow (fill bookmark titles in siteList)
    initPrefWin: function() {
        this.itemTitles = this.listGroups();
        for(var i=1; i<this.itemTitles.length; ++i) // Exclude the default group
            document.getElementById('siteList').appendItem(this.itemTitles[i]);
        this.recentGroup = this.defaultGroup;
        this.load(this.recentGroup);
    },

    // Change the content of prefwindow to that of another group
    siteChanged: function() {
        this.save(this.recentGroup);
        var siteList = document.getElementById('siteList');
        var siteIndex = siteList.getIndexOfItem(siteList.selectedItems[0]);
        if(siteIndex == 0)
            var groupname = this.defaultGroup;
        else
            var groupname = this.itemTitles[siteIndex];
        this.recentGroup = groupname;
        this.load(this.recentGroup);
    },

    // Save all changes to file
    accept: function() {
        this.save(this.recentGroup);
        this.saveFile();
    },

    // Create one group of preferences for one site (and save to file)
    // If this group of preferences is created it will be removed
    create: function(url) {
        // Show the real group name even if it is not created
        var group = this.getGroupName(url, true);
        if(this.hasGroup(group))
            this.removeGroup(group);
        else
            this.reset(group); // Create prefs and set initial value
        this.saveFile();
    },

//////// Processing the accessing to the groups and the values

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

    load: function(group) {
        for(key in this.setupDefault) {
            var value = this.setupDefault[key];
            var element = document.getElementById(key);
            if(typeof(this.setupDefault[key]) == 'boolean')
                element.checked = this.getVal(group, key, value);
            else
                element.value = this.getVal(group, key, value);
        }
    },

    save: function(group) {
        for(key in this.setupDefault) {
            var element = document.getElementById(key);
            if(typeof(this.setupDefault[key]) == 'boolean')
                this.setVal(group, key, element.checked);
            else
                this.setVal(group, key, element.value);
        }
    },

    // Reset an existed group or create a new group
    reset: function(group) {
        for(key in this.setupDefault) {
            var value = this.setupDefault[key];
            this.setVal(group, key, value);
        }
    },

    hasGroup: function(group) {
        return this.prefs.groups[group] ? true : false;
    },

    removeGroup: function(group) {
        if(group == this.defaultGroup) return;
        delete this.prefs.groups[group];
    },

////////// Handling the database and the group name (the key for the database)

    // Create objects storing the present values in the prefwindow
    // and load the values from the database
    initGroups: function() {
        this.prefService = Components.classes["@mozilla.org/content-pref/service;1"]
                           .getService(Components.interfaces.nsIContentPrefService);
        this.prefs = {};
        this.prefs.groups = {};
        var groups = this.listGroups();
        for(var i = groups.length - 1; i >= 0; --i) {
            var group = groups[i];
            this.prefs.groups[group] = {};
            var uri = null;
            if(group != this.defaultGroup)
                uri = this.getURI(group);
            for(var key in this.setupDefault) {
                if(this.prefService.hasPref(uri, key))
                    var value = this.prefService.getPref(uri, key);
                else
                    var value = this.setupDefault[key];
                this.prefs.groups[group][key] = value;
            }
        }
        if(!this.prefService.hasPref(null, 'Encoding'))
            this.create(null);
    },

    // Determine the group name (displayed name) by url
    // and optionally return default for not created site
    getGroupName: function(url, realName) {
        if(!url) return this.defaultGroup;
        var ios = Components.classes['@mozilla.org/network/io-service;1']
                  .getService(Components.interfaces.nsIIOService);
        var uri = ios.newURI(url, null, null);
        var group = uri.host;
        if(!realName && !this.hasGroup(group)) // Not created, use default
            group = this.defaultGroup;
        return group;
    },

    // Get the key for the database from the group name
    getURI: function(group) {
        var ios = Components.classes['@mozilla.org/network/io-service;1']
                  .getService(Components.interfaces.nsIIOService);
        return ios.newURI('telnet://'+group, null, null);
    },

    // List all groups in the database
    listGroups: function() {
        var groups = [];
        groups.push(this.defaultGroup);
        var groupedPrefs = this.prefService.getPrefsByName('Encoding');
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

    // save data into database
    saveFile: function() {
        var groups = this.listGroups();
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
    }
}

// Detect whether the page loading this script is prefwindow or not
// Other page may load this script for creating SitePref or something else
if(document.getElementById('pcmanOption')) {

    // Find the version of PCManFx
    function getVersion() {
        var app = Components.classes["@mozilla.org/fuel/application;1"]
                            .getService(Components.interfaces.fuelIApplication);
        if(app.extensions) { // for firefox 3.x
            var ver = app.extensions.get('pcmanfx2@pcman.org').version;
            document.getElementById('version').value = ver;
        } else { // for firefox 4.0+ 
            Components.utils.import("resource://gre/modules/AddonManager.jsm");
            AddonManager.getAddonByID('pcmanfx2@pcman.org', function(addon) {
                document.getElementById('version').value = addon.version;
            });
        }
    }

    function load() {
        options = new PCManOptions();
        options.initPrefWin();
        getVersion();
    }

    function siteChanged() { options.siteChanged(); }

    function save() { options.accept(); }

}
