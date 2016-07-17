// Browser utilities, including preferences API access, site-depedent setting through Places API

'use strict';

var EXPORTED_SYMBOLS = ["BrowserUtils"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

function BrowserUtils(listener) {
    this.listener = listener;
    this.document = listener.global.document;

    Cu.import("resource://gre/modules/Services.jsm");
    this.e10sEnabled = Services.appinfo.processType ===
        Services.appinfo.PROCESS_TYPE_CONTENT;

    this.uaoConv = listener.global.uaoConv;
    this.storage = null;
    this.menu = null;
    this.socket = null;

    // XXX: UNUSED AND UNTESTED
    this.__defineGetter__('_prefBranch', function() {
        delete this['_prefBranch'];
        return this['_prefBranch'] = Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefService)
            .getBranch('extensions.pcmanfx.');
    });
    this.__defineGetter__('_bookmarkService', function() {
        delete this['_bookmarkService'];
        return this['_bookmarkService'] = Cc['@mozilla.org/browser/nav-bookmarks-service;1'].getService(Ci.nsINavBookmarksService);
    });
    this.__defineGetter__('_ioService', function() {
        delete this['_ioService'];
        return this['_ioService'] = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
    });
}

BrowserUtils.prototype = {
    getElementById: function(id) {
        return this.document.getElementById(id);
    },

    getUrl: function() {
        return this.document.location.host;
    },

    getSearch: function(key) {
        var search = this.listener.global.location.search;
        if (!search)
            return null;
        var parameters = {};
        decodeURIComponent(search).split(/[?|&]/).map(function(s) {
            if (s.indexOf('=') > 0)
                parameters[s.split('=')[0]] = s.split('=')[1];
        });
        return (key ? parameters[key] : parameters);
    },

    getVersion: function(callback) {
        Cu.import("resource://gre/modules/AddonManager.jsm");
        AddonManager.getAddonByID('pcmanfx2@pcman.org', function(addon) {
            callback(addon.version);
        });
    },

    l10n: function(str) {
        this.getElementById("pcman-string-bundle").getString(str);
    },

    findBookmarkTitle: function(url) {
        if (url.search(/.*:\/\/([^\/]*).*/) < 0)
            url = 'telnet://' + url;
        // Eat any errors
        try {
            var uri = this._ioService.newURI(url, null, null);
            var bookmarkArray = this._bookmarkService.getBookmarkIdsForURI(uri, {});
            // Return bookmark title if found; otherwise return the host name
            if (bookmarkArray.length > 0) {
                return this._bookmarkService.getItemTitle(bookmarkArray[0]);
            } else {
                return uri.host;
            }
        } catch (e) { // fails in e10s
            // The URL might be incorrect >"<
            return url.replace(/.*:\/\/([^\/]*).*/, '$1');
        }
    },

    setConverter: function(callback) {
        this.listener.view.conv = this.uaoConv;
        this.listener.conn.oconv = this.uaoConv;
        if (callback)
            callback();
    },

    dispatchCopyEvent: function(target) {
        var evt = this.document.createEvent("HTMLEvents");
        evt.initEvent('copy', true, true);
        target.dispatchEvent(evt);
    },

    // Fetch title from bookmarks. XXX: Places API can be slow!
    updateTabTitle: function() {
        this.document.title = this.findBookmarkTitle(this.document.location.href);
    },

    updateTabIcon: function(aStatus) {
        var icon = 'chrome://pcmanfx2/skin/tab-connecting.png';
        switch (aStatus) {
            case 'connect':
                icon = 'chrome://pcmanfx2/skin/tab-connect.png';
                break;
            case 'disconnect':
                icon = 'chrome://pcmanfx2/skin/tab-disconnect.png';
                break;
            case 'idle': // Not used yet
                icon = 'chrome://pcmanfx2/skin/tab-idle.png';
                break;
            case 'connecting': // Not used yet
            default:
        }

        // Works in GC, IE, and FX 33+
        var link = this.document.querySelector("link[rel~='icon']");
        if (!link) {
            link = this.document.createElement("link");
            link.setAttribute("rel", "icon");
            link.setAttribute("href", icon);
            this.document.head.appendChild(link);
        } else {
            link.setAttribute("href", icon);
        }

        if (this.e10sEnabled) return;

        // For FX 3.5-32
        var rw = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator).getMostRecentWindow("navigator:browser");
        var browserIndex = rw.gBrowser.getBrowserIndexForDocument(this.document);

        // Modified by Hemiola 
        if (browserIndex > -1) {
            var tab = rw.gBrowser.mTabContainer.childNodes[browserIndex];
            tab.image = icon;
            switch (aStatus) {
                case 'connect':
                    tab.setAttribute("protected", "true");
                    tab.setAttribute("locked", "true");
                    break;
                case 'disconnect':
                    tab.removeAttribute("protected");
                    tab.removeAttribute("locked");
                    break;
            }
        }
    },

    sitePref: function() {
        var url = 'chrome://pcmanfx2/content/options.xhtml?url=' + this.getUrl();
        this.openURI(url, true, null);
    },

    openURI: function(uri, activate, postData) {
        if (this.e10sEnabled)
            return this.listener.global.open(uri, '_blank');
        var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
            .getService(Ci.nsIWindowMediator);
        var gBrowser = wm.getMostRecentWindow("navigator:browser").gBrowser;
        var tab = postData ?
            gBrowser.addTab(uri, gBrowser.currentURI, null, postData) :
            gBrowser.addTab(uri, gBrowser.currentURI);
        if (activate)
            gBrowser.selectedTab = tab;
    },

    setTimer: function(repeat, func, timelimit) {
        var timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
        timer.initWithCallback({ notify: function(timer) { func(); } },
            timelimit,
            repeat ? Ci.nsITimer.TYPE_REPEATING_SLACK :
            Ci.nsITimer.TYPE_ONE_SHOT);
        return timer;
    },

    debug: function(text) {
        if (typeof(Application) != 'undefined')
            return Application.console.log(text);
        Cu.import("resource://gre/modules/Console.jsm");
        return console.log(text);
    }
};

