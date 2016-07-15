// utilities for contextmenu and browser's menu

'use strict';

var EXPORTED_SYMBOLS = ["BrowserMenus"];

function BrowserMenus(ui) {
    this.listener = ui.listener;
    this.ui = ui;
    this.textboxControllers.listener = ui.listener;
    this.eventHandler = ui.listener.global.eventHandler;
    ui.getElementById('popup-copy').addEventListener("command", this.eventHandler, false);
    ui.getElementById('popup-paste').addEventListener("command", this.eventHandler, false);
    ui.getElementById('popup-selAll').addEventListener("command", this.eventHandler, false);
    ui.getElementById('sitePref').addEventListener("command", this.eventHandler, false);
    ui.getElementById('input_proxy').controllers.insertControllerAt(0, this.textboxControllers); // to override default commands for inputbox
    if (ui.e10sEnabled) {
        ui.getElementById('topwin').removeAttribute('context');
        ui.getElementById('topwin').removeAttribute('oncontextmenu');
    }
}

BrowserMenus.prototype = {
    textboxControllers: {
        supportsCommand: function(cmd) {
            switch (cmd) {
                case "cmd_undo":
                case "cmd_redo":
                case "cmd_cut":
                case "cmd_copy":
                case "cmd_paste":
                case "cmd_selectAll":
                case "cmd_delete":
                case "cmd_switchTextDirection":
                case "cmd_find":
                case "cmd_findAgain":
                    return true;
            }
        },
        isCommandEnabled: function(cmd) {
            switch (cmd) {
                case "cmd_copy":
                    return this.listener.view.selection.hasSelection();
                case "cmd_paste":
                    return true;
                case "cmd_selectAll":
                    return true;
                default:
                    return false;
            }
        },
        doCommand: function(cmd) {
            switch (cmd) {
                case "cmd_undo":
                case "cmd_redo":
                case "cmd_cut":
                    return true;
                case "cmd_copy":
                    this.listener.copy();
                    break;
                case "cmd_paste":
                    this.listener.paste();
                    break;
                case "cmd_selectAll":
                    this.listener.selAll();
                    break;
                case "cmd_delete":
                case "cmd_switchTextDirection":
                case "cmd_find":
                case "cmd_findAgain":
                    return true;
            }
        },
        onEvent: function(e) {}
    },

    onMenuPopupShowing: function() {
        var hasSelection = this.listener.view.selection.hasSelection();
        this.ui.getElementById("popup-copy").disabled = !hasSelection;
        this.ui.getElementById("popup-search").disabled = !hasSelection;
        this.createSearchMenu(this.ui.getElementById('search_menu'));
    },

    onClose: function() {
        this.ui.getElementById('popup-selAll').removeEventListener("command", this.eventHandler, false)
        this.ui.getElementById('popup-paste').removeEventListener("command", this.eventHandler, false);
        this.ui.getElementById('popup-copy').removeEventListener("command", this.eventHandler, false);
        this.ui.getElementById('sitePref').removeEventListener("command", this.eventHandler, false);
        this.ui.getElementById('input_proxy').controllers.removeController(this.textboxControllers);
        this.createSearchMenu(this.ui.getElementById('search_menu'), true);
    },

    // From: https://developer.mozilla.org/en/Dynamically_modifying_XUL-based_user_interface
    createMenuItem: function(label, image) {
        const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
        var item = this.ui.document.createElementNS(XUL_NS, "menuitem"); // create a new XUL menuitem
        item.setAttribute("label", label);
        if (image) {
            item.setAttribute('class', 'menuitem-iconic menuitem-with-favicon');
            item.setAttribute('image', image);
        }
        return item;
    },

    // FIXME: The way used here to implement search menu is very inefficient

    onSearchItemCommand: function(event) {
        if (!this.listener.view.selection.hasSelection())
            return;
        var text = this.listener.view.selection.getText();
        var searchService = Components.classes["@mozilla.org/browser/search-service;1"]
            .getService(Components.interfaces.nsIBrowserSearchService);
        if (!searchService) return;

        //var engine = event.target.engine;
        var engine = searchService.getEngineByName(event.target.getAttribute("engine"));
        var submission = engine.getSubmission(text, null);
        if (!submission) return;

        this.ui.openURI(submission.uri.spec, false, submission.postData);
    },

    createSearchMenu: function(menu, clear) {
        if (this.ui.e10sEnabled) return;

        while (menu.hasChildNodes()) {
            menu.firstChild.removeEventListener('command', this.eventHandler, false);
            menu.removeChild(menu.firstChild);
        }

        if (clear) return;

        var searchService = Components.classes["@mozilla.org/browser/search-service;1"]
            .getService(Components.interfaces.nsIBrowserSearchService);
        if (!searchService) return;

        var n = {};
        var engines = searchService.getVisibleEngines(n);
        for (var i = 0; i < n.value; ++i) {
            var engine = engines[i];
            var item = this.createMenuItem(engine.name, engine.iconURI ? engine.iconURI.spec : null);
            //item.engine = engine;
            item.setAttribute("engine", engine.name);
            item.addEventListener('command', this.eventHandler, false);
            menu.appendChild(item);
        }
    }
};

