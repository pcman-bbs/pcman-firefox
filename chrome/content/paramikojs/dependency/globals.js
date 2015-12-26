// XXX this is some crap but it'll work for now. see rsakey.js for more details
var gRsaKeyWorkerJs = 'paramikojs/sign_ssh_data_worker.js';
if(navigator.userAgent.indexOf('Firefox') > -1 && Components.classes) // Mozilla
    gRsaKeyWorkerJs = 'chrome://pcmanfx2/content/' + gRsaKeyWorkerJs;
else // Chrome, etc
    var Components = null;
if(!Components && typeof(chrome) == 'undefined') // normal web page
    var chrome = {};
if(!Components && !chrome.storage) { // normal web page
    chrome.storage = {
        local: {
            set: function(data) {
                for(var key in data)
                    localStorage.setItem(key, data[key]);
            },

            get: function(keys, callback) {
                if(typeof(keys) == 'string')
                    keys = [keys];
                var ret = {};
                for(var i=0; i<keys.length; ++i)
                    ret[keys[i]] = localStorage.getItem(keys[i]);
                callback(ret);
            }
        }
    };
}
if(typeof(crypto) == 'undefined') // IE11+
    var crypto = msCrypto;
var gDebugMode = false;
var gStrbundle = {getFormattedString: function() {return '';}} // sftp_client.js
