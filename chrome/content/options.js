// process prefwindow and handle all access to preference
//
// Little part of the code is taken from BBSFox developed by
// Ett Chung <ettoolong@hotmail.com>
// https://addons.mozilla.org/zh-TW/firefox/addon/179388/

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
    if( !this.prefs.groups['default'] ) // Just created config file
        this.create(null); // Create default prefs and set initial value
}

PCManOptions.prototype = {
    setupDefault: {
        'Encoding': 'big5'
    },

    // Determine group name by url
    // and optionally return default for not create site
    getGroupName: function(url, realName) {
        var browserutils = new BrowserUtils();
        var bookmarkID = browserutils.findBookmarkID(url);
        var group = bookmarkID ? ('rdf:#$' + bookmarkID) : 'default';
        if(!realName && !this.prefs.groups[group]) // Not created, use default
            group = 'default';
        return group;
    },

    // Create one group of preferences for one site (and save to file)
    // If this group of preferences is created it will be reset to default
    create: function(url) {
        // Show the real group name even if it is not created
        var group = this.getGroupName(url, true);
        this.reset(group); // Create prefs and set initial value
        this.prefs.save(this.confFile);
    },

    // Create the list of valid bookmarkIDs and return their titles 
    // For invalid IDs delete their groups
    getItemTitles: function() {
        var names = this.prefs.getGroupNames();
        var browserutils = new BrowserUtils();
        var bookmarkService = browserutils._bookmarkService;
        var bookmarkTitles = [];
        this.bookmarkIDs = [];
        for(var i=0; i<names.length; ++i) {
            if(names[i] == 'default') continue;
            var id = parseInt(names[i].substr(6));
            try {
                var bookmarkTitle = bookmarkService.getItemTitle(id);
                bookmarkTitles.push(bookmarkTitle);
                this.bookmarkIDs.push(id);
            } catch (e) { // the bookmark may be removed
                delete this.prefs.groups['rdf:#$' + id];
            }
        }
        return bookmarkTitles;
    },

    // Fill bookmark titles in siteList
    init: function() {
        var bookmarkTitles = this.getItemTitles();
        for(var i=0; i<bookmarkTitles.length; ++i)
            document.getElementById('siteList').appendItem(bookmarkTitles[i]);
        this.recentGroup = 'default';
        this.load(this.recentGroup);
    },

    // Change the content of prefwindow to that of another group
    siteChanged: function() {
        this.save(this.recentGroup);
        var siteList = document.getElementById('siteList');
        var siteIndex = siteList.getIndexOfItem(siteList.selectedItems[0]);
        if(siteIndex == 0)
            var groupname = 'default';
        else
            var groupname = 'rdf:#$' + this.bookmarkIDs[siteIndex-1];
        this.recentGroup = groupname;
        this.load(this.recentGroup);
    },

    // save all changes to file and notify the main program
    accept: function() {
        this.save(this.recentGroup);
        this.prefs.save(this.confFile);
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
            switch(typeof(value)) {
            case 'string':
                element.value = this.prefs.getStr(group, key, value);
                break;
            case 'number':
                element.value = this.prefs.getInt(group, key, value);
                break;
            case 'boolean':
                element.checked = this.prefs.getBool(group, key, value);
                break;
            default:
            }
        }
    },

    save: function(group) {
        for(key in this.setupDefault) {
            var element = document.getElementById(key);
            switch(typeof(this.setupDefault[key])) {
            case 'string':
                this.prefs.setStr(group, key, element.value);
                break;
            case 'number':
                this.prefs.setInt(group, key, element.value);
                break;
            case 'boolean':
                this.prefs.setBool(group, key, element.checked);
                break;
            default:
            }
        }
    },

    reset: function(group) {
        for(key in this.setupDefault) {
            var value = this.setupDefault[key];
            switch(typeof(value)) {
            case 'string':
                this.prefs.setStr(group, key, value);
                break;
            case 'number':
                this.prefs.setInt(group, key, value);
                break;
            case 'boolean':
                this.prefs.setBool(group, key, value);
                break;
            default:
            }
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
