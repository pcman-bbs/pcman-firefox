// Process the operations of prefwindow

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
    itemTitles = options.getGroupNames();
    // Fetch title from bookmarks. XXX: Places API can be slow!
    var browserutils = new BrowserUtils();
    for(var i=1; i<itemTitles.length; ++i) { // Exclude the default group
        var title = browserutils.findBookmarkTitle('telnet://'+itemTitles[i]);
        document.getElementById('siteList').appendItem(title);
    }
    recentGroup = options.defaultGroup;
    loadObject();
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
