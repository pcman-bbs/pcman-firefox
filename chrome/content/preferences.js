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
        if(!element)
            continue;
        if(typeof(options.setupDefault[key]) == 'boolean')
            element.checked = options.getVal(recentGroup, key, value);
        else
            element.value = options.getVal(recentGroup, key, value);
    }
    document.getElementById('delSite').disabled = false;
}

// Update values in the prefwindow to the object
function saveObject() {
    for(var key in options.setupDefault) {
        var element = document.getElementById(key);
        if(!element)
            continue;
        if(typeof(options.setupDefault[key]) == 'boolean')
            options.setVal(recentGroup, key, element.checked);
        else {
            options.setVal(recentGroup, key, element.value);
        }
    }
}

// Update the siteList with the bookmark titles
function updateSiteList() {
    var siteList = document.getElementById('siteList');

    updattingSiteList = true; // disable siteChanged()
    while(siteList.itemCount > 0)
        siteList.removeItemAt(0);

    var groupNames = options.getGroupNames();
    // Fetch title from bookmarks. XXX: Places API can be slow!
    var browserutils = new BrowserUtils();
    for(var i=0; i<groupNames.length; ++i) {
        var title = browserutils.findBookmarkTitle('telnet://'+groupNames[i]);
        if(!title) title = groupNames[i]; // Not a url
        siteList.appendItem(title);
    }
    siteList.selectedIndex = recentGroup;
    updattingSiteList = false; // enable siteChanged()

    document.getElementById('addSite').disabled = false;
}

// Initialize the prefwindow
function load() {
    href = window.arguments ? window.arguments[0] : null;
    options = new PCManOptions();
    recentGroup = options.findGroup(href);
    loadObject();
    updattingSiteList = false;
    updateSiteList();
}

// Change the content of prefwindow to that of another group
function siteChanged() {
    if(updattingSiteList) // stop unnecessary action
        return;
    saveObject();
    recentGroup = document.getElementById('siteList').selectedIndex;
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
    var newHref = {value: href};
    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                            .getService(Components.interfaces.nsIPromptService);
    var result = prompts.prompt(null,
        document.getElementById("addSite").getAttribute("label"),
        document.getElementById("siteAddress").getAttribute("label"),
        newHref, null, {value: true});
    if(!result || !newHref.value) // cancel is pressed or empty string
        return;
    var group = options.findGroup(newHref.value);
    if(options.findGroup(newHref.value) > 0) // the site pref is existed
        return;
    // Create prefs and set initial value
    saveObject();
    options.copyGroup(null, null, newHref.value);
    recentGroup = options.findGroup(newHref.value);
    loadObject();
    updateSiteList();
    save();
}

// Delete an existed site pref
function delSite() {
    options.removeGroup(recentGroup);
    recentGroup = 0;
    loadObject();
    updateSiteList();
    save();
}
