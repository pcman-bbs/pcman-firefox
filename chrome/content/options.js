// Process the operations of prefwindow

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

// Update values in the prefwindow from the object
function loadObject() {
    for(var key in options.setupDefault) {
        var value = options.setupDefault[key];
        var element = document.getElementById(key);
        if(typeof(options.setupDefault[key]) == 'boolean')
            element.checked = options.getVal(recentGroup, key, value);
        else
            element.value = options.getVal(recentGroup, key, value);
    }
}

// Update values in the prefwindow to the object
function saveObject() {
    for(var key in options.setupDefault) {
        var element = document.getElementById(key);
        if(typeof(options.setupDefault[key]) == 'boolean')
            options.setVal(recentGroup, key, element.checked);
        else
            options.setVal(recentGroup, key, element.value);
    }
}

// Initialize the prefwindow (fill bookmark titles in siteList)
function load() {
    options = new PCManOptions();
    itemTitles = options.getGroupNames();
    // Fetch title from bookmarks. XXX: Places API can be slow!
    var browserutils = new BrowserUtils();
    for(var i=1; i<itemTitles.length; ++i) { // Exclude the default group
        var title = browserutils.findBookmarkTitle('telnet://'+itemTitles[i]);
        document.getElementById('siteList').appendItem(title);
    }
    recentGroup = options.defaultGroup;
    loadObject();
    getVersion();
}

// Change the content of prefwindow to that of another group
function siteChanged() {
    saveObject();
    var siteList = document.getElementById('siteList');
    var siteIndex = siteList.getIndexOfItem(siteList.selectedItems[0]);
    if(siteIndex == 0)
        var groupname = options.defaultGroup;
    else
        var groupname = itemTitles[siteIndex];
    recentGroup = groupname;
    loadObject();
}

// Save all changes to file
function save() {
    saveObject();
    options.save();
}

