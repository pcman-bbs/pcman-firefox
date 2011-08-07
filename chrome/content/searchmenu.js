// utilities for search menu

// From: https://developer.mozilla.org/en/Dynamically_modifying_XUL-based_user_interface
function createMenuItem(label, image) {
    const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
    var item = document.createElementNS(XUL_NS, "menuitem"); // create a new XUL menuitem
    item.setAttribute("label", label);
    if(image) {
        item.setAttribute('class', 'menuitem-iconic');
        item.setAttribute('image', image);
    }
    return item;
}

// FIXME: The way used here to implement search menu is very inefficient

function onSearchItemCommand(event, name) {
    var view = pcman.view;
    if(!view.selection.hasSelection())
        return;
    var text = view.selection.getText();
    var searchService = Components.classes["@mozilla.org/browser/search-service;1"]
                            .getService(Components.interfaces.nsIBrowserSearchService);
    if(searchService) {
        var engine = searchService.getEngineByName(name);
        var submission = engine.getSubmission(text, null);
        if(submission)
            openURI(submission.uri.spec, false, submission.postData);
    }
}

function createSearchMenu(menu) {
    while(menu.hasChildNodes()){
        menu.removeChild(menu.firstChild);
    }

    var searchService = Components.classes["@mozilla.org/browser/search-service;1"]
                            .getService(Components.interfaces.nsIBrowserSearchService);
    if(searchService) {
        var n = {};
        var engines = searchService.getVisibleEngines(n);
        var i;
        for(i = 0; i < n.value; ++i) {
            var engine = engines[i];
            var item = createMenuItem(engine.name, engine.iconURI.spec);
            var oncommand ={
                handleEvent: function(e) {
                    alert(this.engine.name);
                }
            };
            item.engine = engine;
            item.setAttribute("engine", engine);
            item.setAttribute('oncommand', "onSearchItemCommand(event, '" + engine.name + "');");
//            item.addEventListener('command', oncommand, false);
            menu.appendChild(item);
        }
    }
}
