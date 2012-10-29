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
    setDatalist();
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
        else
            options.setVal(recentGroup, key, element.value);
    }
}

// Update the siteList with the bookmark titles
function updateSiteList() {
    var siteList = document.getElementById('siteList');

    // Compatibility for the HTML pages in GC
    if(typeof(siteList.itemCount) == 'undefined') {
        siteList.appendItem = function(title) {
            var option = document.createElement("option");
            option.textContent = title;
            siteList.appendChild(option);
        }
        siteList.removeItemAt = function(siteIndex) {
            var option = siteList.options[siteIndex];
            siteList.removeChild(option);
        }
        siteList.__defineGetter__('itemCount', function() {
            return siteList.options.length;
        });
    }

    updattingSiteList = true; // disable siteChanged()
    while(siteList.itemCount > 1)
        siteList.removeItemAt(1);

    var groupNames = options.getGroupNames();
    // Fetch title from bookmarks. XXX: Places API can be slow!
//    var browserutils = new BrowserUtils();
    for(var i=1; i<groupNames.length; ++i) { // Exclude the default group
//        var title = browserutils.findBookmarkTitle('telnet://'+groupNames[i]);
//        if(!title) title = groupNames[i]; // Not a url
        var title = groupNames[i];
        siteList.appendItem(title);
    }
    siteList.selectedIndex = recentGroup;
    updattingSiteList = false; // enable siteChanged()

    document.getElementById('addSite').disabled = false;
}

// Initialize the prefwindow
function load() {
    href = window.location.search ? window.location.search.substr(5) : null;
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
//    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
//                            .getService(Components.interfaces.nsIPromptService);
//    var result = prompts.prompt(null,
//        document.getElementById("addSite").getAttribute("label"),
//        document.getElementById("siteAddress").getAttribute("label"),
//        newHref, null, {value: true});
//    if(!result || !newHref.value) // cancel is pressed or empty string
//        return;
    newHref.value = prompt(msg("options_address"), newHref.value);
    if(!newHref.value) // cancel is pressed (null) or empty string
        return;
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
