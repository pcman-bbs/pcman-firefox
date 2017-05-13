// handle some direct access to preference

'use strict';

var EXPORTED_SYMBOLS = ["Preferences"];

function Preferences(listener, setupDefault, callback) {
    this.listener = listener;
    this.default = setupDefault;
    this.storage = listener.ui.storage;
    this.prefsKey = "PCManOptions";

    this.siteHash = {};
    this.sites = [];
    this.recent = setupDefault._url;

    this.handler = null;

    if (!callback) {
        this.load(this.storage.get(this.prefsKey));
    } else {
        var _this = this;
        this.storage.get(this.prefsKey, function(result) {
            _this.load(result);
            callback(_this);
        });
    }
}

Preferences.prototype = {
    // get pref object from the database
    load: function(prefs) {
        this.siteHash = {};
        this.sites = [];
        var data = prefs ? prefs[this.prefsKey] : {};
        if (!Array.isArray(data) || data.length < 1)
            data = [];
        for (var i = 0; i < data.length; ++i) {
            if (typeof(data[i]) != 'object')
                continue;
            if (!data[i]._url)
                data[i]._url = this.default._url;
            if (this.siteHash[data[i]._url]) // duplicate sitepref
                continue;
            var site = Object.create(this.default); // FX 4+
            for (var key in this.default) {
                if (typeof(data[i][key]) != 'undefined' && data[i][key] != this.default[key])
                    site[key] = data[i][key];
            }
            this.siteHash[data[i]._url] = site;
            if (site._url == this.default._url)
                this.sites.unshift(site);
            else
                this.sites.push(site);
        }
        if (!this.sites[0] || this.sites[0]._url != this.default._url) {
            var site = Object.create(this.default); // FX 4+
            this.siteHash[this.default._url] = site;
            this.sites.unshift(site);
        }
    },

    // save prefs to database
    save: function(data, callback) {
        var prefs = {};
        prefs[this.prefsKey] = this.sites;
        if (typeof(data) == 'object') {
            prefs[this.prefsKey] = data;
            this.load(prefs);
        }
        if (typeof(callback) == 'undefined') // maybe argument 'data' is missing
            callback = (typeof(data) == 'function') ? data : function() {};
        if (this.sites.length == 1 && Object.keys(this.sites[0]).length == 0)
            this.storage.remove(this.prefsKey, callback);
        else
            this.storage.set(prefs, callback);
    },

    // set recent site
    setSite: function(url) {
        switch (typeof(url)) {
            case 'number':
                if (url >= 0 && url < this.sites.length)
                    this.recent = this.sites[url]._url;
                break;
            case 'string':
                this.recent = url
                break;
            default:
        }
        if (!this.siteHash[this.recent])
            return this.sites[0];
        return this.siteHash[this.recent];
    },

    // preprocess the values of the prefs
    getter: function(key, value) {
        return value; // to be override in main program
    },

    // get the value of the key in recent site
    get: function(key, group) {
        if (typeof(group) == 'undefined')
            group = this.sites.indexOf(this.setSite());
        return this.getter(key, this.sites[group][key]);
    },

    // handle the callback from the event listener
    observer: null,

    // listen storage event
    onChanged: function(callback) {
        if (callback && !this.observer) {
            var _this = this;
            this.observer = this.storage.addListener(function(changes) {
                if (!changes[_this.prefsKey])
                    return;
                var oldValues = _this.setSite();
                var newPrefs = {};
                newPrefs[_this.prefsKey] = changes[_this.prefsKey].newValue;
                _this.load(newPrefs);
                var newValues = _this.setSite();
                for (var key in _this.default) {
                    if (oldValues[key] != newValues[key])
                        callback(key, oldValues[key], newValues[key]);
                }
            });
        } else if (this.observer) {
            this.storage.removeListener(this.observer);
            this.observer = null;
        }
    }
};

