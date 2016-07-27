// Implement apis of chrome.storage.local of GC with data in localStorage

'use strict';

var EXPORTED_SYMBOLS = ["BrowserStorage"];

function BrowserStorage(ui) {
    this.listener = ui.listener;
    //this.global = ui.listener.global;

    this.initial(ui.listener.global);
}

BrowserStorage.prototype = {
    initial: function(global) {
        if (!Components || !Components.classes) {
            this.area = global.localStorage;
            this.global = global;
            return;
        }
        // share the same prefs of pcman-chrome
        //FIXME: get storage event from other origin
        /*var url = "http://127.0.0.1";
        var ios = Components.classes["@mozilla.org/network/io-service;1"]
            .getService(Components.interfaces.nsIIOService);
        var ssm = Components.classes["@mozilla.org/scriptsecuritymanager;1"]
            .getService(Components.interfaces.nsIScriptSecurityManager);
        var dsm = Components.classes["@mozilla.org/dom/storagemanager;1"]
            .getService(Components.interfaces.nsIDOMStorageManager);
        var uri = ios.newURI(url, "", null);
        var principal = ssm.getCodebasePrincipal(uri);
        this.area = dsm.getLocalStorageForPrincipal(principal, "");*/

        // implement apis of localStorage in web pages
        Components.utils.import("resource://gre/modules/Preferences.jsm", this);
        var prefs = this.Preferences;
        var root = 'extensions.pcmanfx.';
        this.area = {
            getItem: function(key) {
                return prefs.get(root + key);
            },
            setItem: function(key, str) {
                prefs.set(root + key, str);
            },
            removeItem: function(key) {
                prefs.resetBranch(root + key);
            }
        };
        this.global = {
            addEventListener: function(eventname, handler, useCapture) {
                var func = handler.handleEvent || handler;
                handler.callback = {
                    observe: function(subject, topic, data) {
                        func({
                            key: data.substr(root.length),
                            oldValue: '', // FIXME: get old data
                            newValue: prefs.get(data)
                        });
                    }
                };
                return prefs.observe(root, handler.callback, global.prefs);
            },
            removeEventListener: function(eventname, handler, useCapture) {
                prefs.ignore(root, handler.callback, global.prefs);
            }
        };
    },

    parse: function(str) {
        try {
            return JSON.parse(str);
        } catch (e) {
            return [];
        }
    },

    get: function(keys, callback) {
        var ret = {};
        if (typeof(keys) == 'string') {
            ret[keys] = this.parse(this.area.getItem(keys));
        } else if (Array.isArray(keys)) {
            for (var i = 0; i < keys.length; ++i)
                ret[keys[i]] = this.parse(this.area.getItem(keys[i]));
        } else {
            for (var key in keys) {
                ret[key] = this.parse(this.area.getItem(key));
                if (typeof(ret[key]) == 'undefined')
                    ret[key] = keys[key];
            }
        }
        if (callback)
            callback(ret);
        else
            return ret;
    },

    set: function(items, callback) {
        for (var key in items)
            this.area.setItem(key, JSON.stringify(items[key], null, 4));
        if (callback)
            callback();
    },

    remove: function(keys, callback) {
        if (typeof(keys) == 'string') {
            this.area.removeItem(keys);
        } else {
            for (var i = 0; i < keys.length; ++i)
                this.area.removeItem(keys[i]);
        }
        if (callback)
            callback();
    },

    addListener: function(callback) {
        var _this = this;
        var handler = {
            handleEvent: function(event) {
                var changes = {};
                changes[event.key] = {
                    oldValue: _this.parse(event.oldValue),
                    newValue: _this.parse(event.newValue)
                };
                callback(changes);
            }
        };
        this.global.addEventListener("storage", handler, false);
        return handler;
    },

    removeListener: function(handler) {
        this.global.removeEventListener("storage", handler, false);
    }
};

