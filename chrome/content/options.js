// process prefwindow and handle all access to preference
//
// Little part of the code is taken from BBSFox developed by
// Ett Chung <ettoolong@hotmail.com>
// https://addons.mozilla.org/zh-TW/firefox/addon/179388/

/*
function PCManOptions() {
    // Load ini file or create one if the file doesn't exist
    // and then parse all available ids from the group names
    this.confFile = Components.classes["@mozilla.org/file/directory_service;1"]
                             .getService(Components.interfaces.nsIProperties)
                             .get("ProfD", Components.interfaces.nsIFile);
    this.confFile.append('pcmanfx.ini');
    if( !this.confFile.exists() )
        this.confFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);

    this.prefs = new IniFile();
    this.prefs.load(this.confFile);
    if( !this.hasGroup(this.getNameById(null)) ) // Just created config file
        this.create(null); // Create default prefs and set initial value
}
*/

///*
function PCManOptions() {
    var browserutils = new BrowserUtils();
    this.prefService = Components.classes["@mozilla.org/content-pref/service;1"]
                       .getService(Components.interfaces.nsIContentPrefService);
    this.prefs = {};
    this.prefs.groups = {};
    var groups = this.listGroups();
    for(var i = groups.length - 1; i >= 0; --i)
        this.prefs.groups[groups[i]] = {};
    for(var group in this.prefs.groups) {
        var uri = null;
        if(group != this.getNameById(null))
            uri = browserutils._ioService.newURI('telnet://'+group, null, null);
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
}
//*/

PCManOptions.prototype = {
    setupDefault: {
        'Encoding': 'big5'
    },

    /*
    getVal: function(group, key, value) {
        switch(typeof(value)) {
        case 'string':
            return this.prefs.getStr(group, key, value);
            break;
        case 'number':
            return this.prefs.getInt(group, key, value);
            break;
        case 'boolean':
            return this.prefs.getBool(group, key, value);
            break;
        default: // unknown type or undefined
            return value;
        }
    },

    setVal: function(group, key, value) {
        switch(typeof(value)) {
        case 'string':
            return this.prefs.setStr(group, key, value);
            break;
        case 'number':
            return this.prefs.setInt(group, key, value);
            break;
        case 'boolean':
            return this.prefs.setBool(group, key, value);
            break;
        default: // unknown type or undefined
            return null;
        }
    },

    listGroups: function() {
        return this.prefs.getGroupNames();
    },

    saveFile: function() {
        return this.prefs.save(this.confFile);
    },

    getNameById: function(id) {
        return (id ? ('rdf:#$' + id) : 'default');
    },

    getIdByName: function(name) {
        return parseInt(name.substr(6));
    },
    */

    ///*
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

    listGroups: function() {
        var groups = [];
        var groupedPrefs = this.prefService.getPrefsByName('Encoding');
        var enumerator = groupedPrefs.enumerator;
        while(enumerator.hasMoreElements()) {
            var property = enumerator.getNext()
                          .QueryInterface(Components.interfaces.nsIProperty);
            var group = property.name;
            if(!group)
                group = this.getNameById(null);
            groups.push(group);
        }
        return groups;
    },

    saveFile: function() {
        var browserutils = new BrowserUtils();
        var groups = this.listGroups();
        var existingGroups = {};
        for(var i = groups.length - 1; i >= 0; --i)
            existingGroups[groups[i]] = {};
        for(var group in this.prefs.groups) {
            var uri = null;
            if(group != this.getNameById(null))
                uri = browserutils._ioService.newURI('telnet://'+group, null, null);
            for(var key in this.setupDefault) {
                var value = this.prefs.groups[group][key];
                this.prefService.setPref(uri, key, value);
            }
            if(existingGroups[group])
                delete existingGroups[group];
        }
        for(var group in existingGroups) { // groups needed to be removed
            if(group != this.getNameById(null)) {
                var uri = browserutils._ioService.newURI('telnet://'+group, null, null);
                for(var key in this.setupDefault)
                    this.prefService.removePref(uri, key);
            }
        }
    },

    getNameById: function(id) {
        var browserutils = new BrowserUtils();
        if(id) {
            var uri = browserutils._bookmarkService.getBookmarkURI(id);
            return uri.host;
        }
        else
            return 'default';
    },

    getIdByName: function(name) {
        var browserutils = new BrowserUtils();
        return browserutils.findBookmarkID('telnet://'+name);
    },
    //*/ 

    hasGroup: function(group) {
        return this.prefs.groups[group] ? true : false;
    },

    removeGroup: function(group) {
        if(group == this.getNameById(null)) return;
        delete this.prefs.groups[group];
    },

    // Determine group name by url
    // and optionally return default for not create site
    getGroupName: function(url, realName) {
        var browserutils = new BrowserUtils();
        var bookmarkID = browserutils.findBookmarkID(url);
        var group = this.getNameById(bookmarkID);
        if(!realName && !this.hasGroup(group)) // Not created, use default
            group = this.getNameById(null);
        return group;
    },

    // Create one group of preferences for one site (and save to file)
    // If this group of preferences is created it will be reset to default
    create: function(url) {
        // Show the real group name even if it is not created
        var group = this.getGroupName(url, true);
        this.reset(group); // Create prefs and set initial value
        this.saveFile();
    },

    // Create the list of valid bookmarkIDs and return their titles 
    // For invalid IDs delete their groups
    getItemTitles: function() {
        var names = this.listGroups();
        var browserutils = new BrowserUtils();
        var bookmarkService = browserutils._bookmarkService;
        var bookmarkTitles = [];
        this.bookmarkIDs = [];
        for(var i=0; i<names.length; ++i) {
            if(names[i] == this.getNameById(null))
                continue;
            var id = this.getIdByName(names[i]);
            try {
                var bookmarkTitle = bookmarkService.getItemTitle(id);
                bookmarkTitles.push(bookmarkTitle);
                this.bookmarkIDs.push(id);
            } catch (e) { // the bookmark may be removed
                this.removeGroup(names[i]);
            }
        }
        return bookmarkTitles;
    },

    // Fill bookmark titles in siteList
    init: function() {
        var bookmarkTitles = this.getItemTitles();
        for(var i=0; i<bookmarkTitles.length; ++i)
            document.getElementById('siteList').appendItem(bookmarkTitles[i]);
        this.recentGroup = this.getNameById(null);
        this.load(this.recentGroup);
    },

    // Change the content of prefwindow to that of another group
    siteChanged: function() {
        this.save(this.recentGroup);
        var siteList = document.getElementById('siteList');
        var siteIndex = siteList.getIndexOfItem(siteList.selectedItems[0]);
        if(siteIndex == 0)
            var groupname = this.getNameById(null);
        else
            var groupname = this.getNameById(this.bookmarkIDs[siteIndex-1]);
        this.recentGroup = groupname;
        this.load(this.recentGroup);
    },

    // save all changes to file and notify the main program
    accept: function() {
        this.save(this.recentGroup);
        this.saveFile();
        this.notify();
    },

    // taken from BBSFox
    // Create an event to notify the main program that prefs were changed
    notify: function() {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                           .getService(Components.interfaces.nsIWindowMediator);

        var browserEnumerator = wm.getEnumerator("navigator:browser");
        // Iterate all browser windows
        while(browserEnumerator.hasMoreElements()) {
            var browserInstance = browserEnumerator.getNext().getBrowser();
            var numTabs = browserInstance.tabContainer.childNodes.length;
            // Iterate all tabs in a certain browser window
            for(var index=0; index<numTabs; index++) {
                var currentBrowser = browserInstance.getBrowserAtIndex(index);
                var urlstr = currentBrowser.currentURI.spec;
                if(urlstr.length<=9) // Invalid
                    continue;
                var urlheader = urlstr.substr(0,9);
                if(urlheader.toLowerCase()!="telnet://") // Not a BBS page
                    continue;
                var doc = currentBrowser.contentDocument;
                if(doc && ("createEvent" in doc)) {
                    var evt = doc.createEvent("Events");
                    evt.initEvent("PrefChanged", true, false);
                    doc.dispatchEvent(evt);
                }
            }
        }
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

    reset: function(group) {
        for(key in this.setupDefault) {
            var value = this.setupDefault[key];
            this.setVal(group, key, value);
        }
    }
}

// detect whether the page loading this script is prefwindow or not
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
        options.init();
        getVersion();
    }

    function siteChanged() { options.siteChanged(); }

    function save() { options.accept(); }

}
