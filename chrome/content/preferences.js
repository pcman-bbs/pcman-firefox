// Process the operations of prefwindow

function getVersion(app) {
    //var app = Components.classes["@mozilla.org/fuel/application;1"]
    //                    .getService(Components.interfaces.fuelIApplication);
    if(app.extensions) { // for firefox 3.x
        document.getElementById('addonID').value = 
            app.extensions.get('pcmanfx2@pcman.org').name;
        document.getElementById('version').value = 
            app.extensions.get('pcmanfx2@pcman.org').version;
    } else { // for firefox 4+
        //FIXME: get return value from this asynchronous function
        app.getExtensions(function(extensions) {
            document.getElementById('addonID').value = 
                extensions.get('pcmanfx2@pcman.org').name;
            document.getElementById('version').value = 
                extensions.get('pcmanfx2@pcman.org').version;
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
/*function loadObject() {
    document.getElementById('Encoding').value =
        options.getVal(recentGroup, 'Encoding', options.setupDefault.Encoding);
    document.getElementById('Cols').value =
        options.getVal(recentGroup, 'Cols', options.setupDefault.Cols);
    document.getElementById('Rows').value =
        options.getVal(recentGroup, 'Rows', options.setupDefault.Rows);
    document.getElementById('NewTab').checked =
        options.getVal(recentGroup, 'NewTab', options.setupDefault.NewTab);
}*/

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
/*function saveObject() {
    options.setVal(recentGroup, 'Encoding',
        document.getElementById('Encoding').value);
    options.setVal(recentGroup, 'Cols',
        document.getElementById('Cols').value);
    options.setVal(recentGroup, 'Rows',
        document.getElementById('Rows').value);
    options.setVal(recentGroup, 'NewTab',
        document.getElementById('NewTab').checked);
}*/

// Initialize the prefwindow (fill bookmark titles in siteList)
function load() {
    options = new PCManOptions();
    groupNames = options.getGroupNames();
    recentGroup = options.defaultGroup;
    loadObject();

    var href = window.arguments ? window.arguments[0] : null;
    callingGroup = href ? options.getGroup(href, true) : options.defaultGroup;
    if(!options.hasGroup(callingGroup))
        document.getElementById('addSite').disabled = false;

    var siteList = document.getElementById('siteList');
    // Fetch title from bookmarks. XXX: Places API can be slow!
    var browserutils = new BrowserUtils();
    for(var i=1; i<groupNames.length; ++i) {
        // Exclude groupNames[0], the default group
        var title = browserutils.findBookmarkTitle('telnet://'+groupNames[i]);
        if(!title) title = groupNames[i]; // Not a url
        siteList.appendItem(title);
        if(groupNames[i] == callingGroup) // siteChanged() will be fired automatically
            siteList.selectedIndex = siteList.itemCount-1;
    }
}

// Change the content of prefwindow to that of another group
function siteChanged() {
    saveObject();
    var siteIndex = document.getElementById('siteList').selectedIndex;
    if(siteIndex == 0) {
        recentGroup = options.defaultGroup;
        document.getElementById('delSite').disabled = true;
    } else {
        recentGroup = groupNames[siteIndex];
        document.getElementById('delSite').disabled = false;
    }
    loadObject();
}

// Save all changes to file
function save(force) {
    if(!document.documentElement.instantApply && !force)
        return;
    saveObject();
    options.save();
}

// Create a new site pref
function addSite() {
    document.getElementById('addSite').disabled = true;
    if(callingGroup == options.defaultGroup) return;
    options.resetGroup(callingGroup); // Create prefs and set initial value
    groupNames.push(callingGroup);
    var siteList = document.getElementById('siteList');
    // Fetch title from bookmarks. XXX: Places API can be slow!
    var browserutils = new BrowserUtils();
    var title = browserutils.findBookmarkTitle('telnet://'+callingGroup);
    if(!title) title = callingGroup; // Not a url
    siteList.appendItem(title);
    siteList.selectedIndex = siteList.itemCount-1;
    save();
}

// Delete an existed site pref
function delSite() {
    if(recentGroup == options.defaultGroup) return;
    var removeGroup = recentGroup;
    var siteList = document.getElementById('siteList');
    var siteIndex = siteList.selectedIndex;
    siteList.selectedIndex = 0;
    siteList.removeItemAt(siteIndex);
    groupNames.splice(siteIndex,1);
    options.removeGroup(removeGroup);
    save();
}
