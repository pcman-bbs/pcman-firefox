// Browser utilities, including preferences API access, site-depedent setting through Places API

'use strict';

var EXPORTED_SYMBOLS = ["BrowserUtils"];

if (typeof(Components) == 'undefined')
    var Components = null;

const Cc = Components ? Components.classes : null;
const Ci = Components ? Components.interfaces : null;
const Cu = Components ? Components.utils : null;

function BrowserUtils(listener) {
    this.listener = listener;
    this.document = listener.global.document;

    if (Cu) {
        Cu.import("resource://gre/modules/Services.jsm");
        this.e10sEnabled = Services.appinfo.processType ===
            Services.appinfo.PROCESS_TYPE_CONTENT;
    } else {
        this.e10sEnabled = true;
    }

    this.uaoConv = listener.global.uaoConv;
    this.storage = null;
    this.menu = null;
    this.socket = null;

    this.cont = '';
    this.skin = 'skin/'
    this.getPath();

    if (!Cc) // not in firefox extension
        return;

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
        var loc = this.document.location;
        var url = Cc ? loc.host : loc.hash.substr(1); // web pages use hash
        return url || 'ptt.cc';
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
        if (Cu) { // in firefox extension
            Cu.import("resource://gre/modules/AddonManager.jsm");
            AddonManager.getAddonByID('pcmanfx2@pcman.org', function(addon) {
                callback(addon.version);
            });
        } else { // normal web pages
            var req = new XMLHttpRequest();
            req.open('GET', '/version', true);
            req.onreadystatechange = function(event) {
                if (req.readyState != 4 || req.status != 200)
                    return;
                callback(req.response);
            };
            req.send();
        }
    },

    getPath: function() {
        var link = this.document.querySelector("link[rel~='icon']");
        var url = link.getAttribute("href");
        this.skin = url.substr(0, url.lastIndexOf('/') + 1);
        var scripts = this.document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; ++i) {
            url = scripts[i].getAttribute("src");
            if (url.search(/pcman\w*\.js/) > -1)
                this.cont = url.substr(0, url.lastIndexOf('/') + 1);
        }
    },

    getDevicePixelRatio: function() {
        /*
        //XXX: untested in High DPI display
        if (Ci && Ci.nsIInterfaceRequestor) { // FX extension
            // this.listener.global.devicePixelRatio may be unreliable
            return this.listener.global.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils).screenPixelsPerCSSPixel || 1;
        }
        //FIXME: get the devicePixelRatio independent of zoom in web pages
        return this.listener.global.devicePixelRatio || 1;
        */

        return 1; // turn off temporarily
    },

    l10n: function(str) {
        var global = this.listener.global;
        if (!str)
            return global.navigator.language;
        var stringbundle = this.getElementById("pcman-string-bundle");
        if (stringbundle) {
            try {
                return stringbundle.getString(str);
            } catch (e) { // str is not found in stringbundle
                return '';
            }
        }
        switch (global.navigator.language) { // normal web page
            case 'zh-TW':
                if (global.locale_zh_TW && global.locale_zh_TW[str])
                    return global.locale_zh_TW[str].message;
            default:
                if (global.locale_en_US && global.locale_en_US[str])
                    return global.locale_en_US[str].message;
        }
        return '';
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
        if (!callback)
            return;
        if (this.uaoConv.buildCache) {
            var uaoConv = this.uaoConv;
            var Encoding = this.listener.prefs.get('Encoding');
            uaoConv.buildCache('a2u', Encoding, function(b2ustatus) {
                uaoConv.buildCache('u2a', Encoding, function(u2bstatus) {
                    callback();
                });
            });
        } else {
            callback();
        }
    },

    getLocalFilePath: function(name) {
        if (this.e10sEnabled)
            return ''; // stop loading file in paramikojs
        var file = Cc["@mozilla.org/file/directory_service;1"]
            .createInstance(Ci.nsIProperties).get("ProfD", Ci.nsILocalFile);
        file.append(name);
        return file.path;
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
        var icon = 'tab-connecting.png';
        switch (aStatus) {
            case 'connect':
                icon = 'tab-connect.png';
                break;
            case 'disconnect':
                icon = 'tab-disconnect.png';
                break;
            case 'idle': // Not used yet
                icon = 'tab-idle.png';
                break;
            case 'connecting': // Not used yet
            default:
        }

        // Works in GC, IE, and FX 33+
        var link = this.document.querySelector("link[rel~='icon']");
        if (!link) {
            link = this.document.createElement("link");
            link.setAttribute("rel", "icon");
            link.setAttribute("href", this.skin + icon);
            this.document.head.appendChild(link);
        } else {
            link.setAttribute("href", this.skin + icon);
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

    sitepref: function() {
        var file = Cc ? 'options.xhtml' : 'options.htm'; // xhtml is for l10n
        var url = this.cont + file + '?url=' + this.getUrl();
        return this.openURI(url, true, null);
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
        return tab;
    },

    setTimer: function(repeat, func, timelimit) {
        var _this = this;
        if (repeat) {
            return {
                timer: _this.listener.global.setInterval(func, timelimit),
                cancel: function() {
                    _this.listener.global.clearInterval(this.timer);
                }
            };
        } else {
            return {
                timer: _this.listener.global.setTimeout(func, timelimit),
                cancel: function() {
                    _this.listener.global.clearTimeout(this.timer);
                }
            };
        }
    },

    debug: function(text) {
        if (typeof(Application) != 'undefined')
            return Application.console.log(text);
        if (Cu) // in firefox extension
            Cu.import("resource://gre/modules/Console.jsm");
        return console.log(text);
    }
};

