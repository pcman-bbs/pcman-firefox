function PCmanOptions() {
    this.confFile = Components.classes["@mozilla.org/file/directory_service;1"]
                             .getService(Components.interfaces.nsIProperties)
                             .get("ProfD", Components.interfaces.nsIFile);
    this.confFile.append('pcmanfx.ini');
    if( !this.confFile.exists() )
        this.confFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);

    this.prefs = new IniFile();
    this.prefs.load(this.confFile);
    if( !this.prefs.groups['default'] ) {
        this.reset('default');
        this.prefs.save(this.confFile);
    }
    this.getBookmarkIDs();
}

PCmanOptions.prototype = {
    getBookmarkIDs: function() {
        var names = this.prefs.getGroupNames();
        this.bookmarkIDs = [];
        for(var i=0; i<names.length; ++i) {
            if(names[i] != 'default') {
                var id = parseInt(names[i].substr(6));
                this.bookmarkIDs.push(id);
            }
        }
    },

    getGroupName: function(url) {
        var browserutils = new BrowserUtils();
        var bookmarkID = browserutils.findBookmarkID(url);
        var group = bookmarkID ? ('rdf:#$' + bookmarkID) : 'default';
        if( !this.prefs.groups[group] ) // Not created, use default
            group = 'default';
        return group;
    },

    create: function(url) {
        var browserutils = new BrowserUtils();
        var bookmarkID = browserutils.findBookmarkID(url);
        if(bookmarkID) {
            var group = 'rdf:#$' + bookmarkID;
            this.reset(group);
            this.prefs.save(this.confFile);
            return true;
        } else {
            return false;
        }
    },

    init: function() {
        var browserutils = new BrowserUtils();
        var bookmarkService = browserutils._bookmarkService;
        var validIDs = [];
        for(var i=0; i<this.bookmarkIDs.length; ++i) {
            try {
                var bookmarkTitle = bookmarkService.getItemTitle(this.bookmarkIDs[i]);
                document.getElementById('siteList').appendItem(bookmarkTitle);
                validIDs.push(this.bookmarkIDs[i]);
            } catch (e) { // the bookmark may be removed
                delete this.prefs.groups['rdf:#$' + this.bookmarkIDs[i]];
            }
        }
        this.bookmarkIDs = validIDs;
        this.recentGroup = 'default';
        this.load(this.recentGroup);
    },

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

    accept: function() {
        this.save(this.recentGroup);
        this.prefs.save(this.confFile);

        // TODO: create an event to notify the main program that prefs were changed
    },

    load: function(group) {
        document.getElementById('Charset').value = this.prefs.getStr(group, 'Encoding', 'big5');
    },

    save: function(group) {
        this.prefs.setStr(group, 'Encoding', document.getElementById('Charset').value);
    },

    reset: function(group) {
        this.prefs.setStr(group, 'Encoding', 'big5');
    }
}

// detect whether the page loading this script is prefwindow or not
// Other page may load this script for creating SitePref or something else
if(document.getElementById('pcmanOption')) {

    function load() {
        options = new PCmanOptions();
        options.init();

        var app = Components.classes["@mozilla.org/fuel/application;1"]
                            .getService(Components.interfaces.fuelIApplication);
        if(app.extensions) {
            var ver = app.extensions.get('pcmanfx2@pcman.org').version;
            document.getElementById('version').value = ver;
        } else {
            Components.utils.import("resource://gre/modules/AddonManager.jsm");
            AddonManager.getAddonByID('pcmanfx2@pcman.org', function(addon) {
                document.getElementById('version').value = addon.version;
            });
        }
    }

    function siteChanged() { options.siteChanged(); }

    function save() { options.accept(); }

}
