// Make paramikojs 20141113 compatible with normal web pages and Firefox e10s

'use strict';

// XXX this is some crap but it'll work for now. see rsakey.js for more details
var gRsaKeyWorkerJs = 'paramikojs/sign_ssh_data_worker.js';
if (navigator.userAgent.indexOf('Firefox') > -1 && Components.classes) { // Mozilla
    gRsaKeyWorkerJs = 'chrome://pcmanfx2/content/' + gRsaKeyWorkerJs;
} else { // Chrome, etc
    var Components = null;
    if (typeof(chrome) == 'undefined' || !chrome) // normal web page in IE and FX
        var chrome = {};
    if (!chrome.storage) { // normal web page in GC
        chrome.storage = {
            local: {
                set: function(data) {
                    for (var key in data)
                        localStorage.setItem(key, data[key]);
                },

                get: function(keys, callback) {
                    if (typeof(keys) == 'string')
                        keys = [keys];
                    var ret = {};
                    for (var i = 0; i < keys.length; ++i)
                        ret[keys[i]] = localStorage.getItem(keys[i]);
                    callback(ret);
                }
            }
        };
    }
}

if (typeof(crypto) == 'undefined') // IE11+
    var crypto = msCrypto;

var gDebugMode = false;
var gStrbundle = { // sftp_client.js
    getFormattedString: function() {
        return '';
    }
};

var localFile = {
    init: function(path) {
        if (!path) {
            return {
                exists: function() {
                    return false;
                }
            };
        }
        try {
            var file = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
            file.initWithPath(path);
            return file;
        } catch (ex) {
            return null;
        }
    }
};

function debug() { // used in client.js
    /* Override this as desired. */
}

