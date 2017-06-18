// Browser utilities, including preferences API access, site-depedent setting through Places API

'use strict';

var EXPORTED_SYMBOLS = ["BrowserUtils"];

if (typeof(chrome) == 'undefined')
    var chrome = null;

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

    this.locale = null;
    this.converter = null;
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

    getUrl: function(getDetail) {
        var loc = this.document.location;
        if (Cc)
            return getDetail ? loc : loc.host;
        var url = decodeURIComponent(loc.hash.substr(1)); // web pages use hash
        var detail = {};
        if (url.indexOf('//') > -1) { // full url
            detail.href = url;
            detail.protocol = url.split('//').shift();
            url = url.substr(detail.protocol.length + 2);
            var userPass = url.split('@');
            if (userPass[1]) {
                url = userPass[1];
                userPass = userPass[0].split(':')
                detail.username = userPass[0];
                detail.password = userPass[1];
            }
            detail.host = url.split('/').shift();
            url = url.substr(detail.host.length);
            var hostPort = detail.host.split(':');
            detail.hostname = hostPort[0];
            detail.port = hostPort[1];
            detail.pathname = url.split('?').shift();
            url = url.substr(detail.pathname.length);
            detail.search = url.split('#').shift();
            detail.hash = url.substr(detail.search.length);
            detail.origin = detail.protocol + '//' + detail.host;
        } else { // host
            detail.host = url;
            var hostPort = detail.host.split(':');
            detail.hostname = hostPort[0];
            detail.port = hostPort[1];
        }
        if (!detail.hostname)
            detail.host = detail.hostname = 'ptt.cc';
        if (detail.protocol == 'ssh:' && !detail.port) {
            detail.host += ':22';
            detail.port = '22';
        }
        return getDetail ? detail : detail.host;
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
        } else if (chrome && chrome.extension) { // GC Extension
            callback(chrome.runtime.getManifest().version);
        } else { // normal web pages
            this.read('/version', function(ret) {
                callback(ret);
            });
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

    read: function(url, callback) {
        var ret = '';
        if (Cc) { // FX extension
            var ioService = Cc["@mozilla.org/network/io-service;1"]
                .getService(Ci.nsIIOService);
            // load from resource:// instead of file path
            //var channel = ioService.newChannel('chrome://pcmanfx2/content/uao/' + type + '.tab', null, null);
            var channel = ioService.newChannel2(
                'chrome://pcmanfx2/content' + url, //aSpec
                null, //aOriginCharse
                null, //aBaseURI
                null, //aLoadingNode
                Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager).getSystemPrincipal(), //aLoadingPrincipal
                null, //aTriggeringPrincipal
                Ci.nsILoadInfo.SEC_NORMAL, //aSecurityFlags
                Ci.nsIContentPolicy.TYPE_OTHER //aContentPolicyType
            );
            var ins = channel.open();
            var bins = Cc["@mozilla.org/binaryinputstream;1"]
                .createInstance(Ci.nsIBinaryInputStream);
            bins.setInputStream(ins);
            while (bins.available())
                ret += bins.readBytes(bins.available());
            bins.close();
            return callback ? callback(ret) : ret;
        }
        if (chrome && chrome.extension) { // GC Extension
            if (url.indexOf('/charset/') == 0) {
                var type = url.substr(9, 3);
                var charset = url.substr(25);
                var bg = chrome.extension.getBackgroundPage();
                return bg[type + 'Cache'](charset, function(table) {
                    callback(table);
                });
            } else if (url.indexOf('/uao/') == 0) {
                url = url.substr(1);
            }
        }
        // normal web pages
        var req = new XMLHttpRequest();
        req.open('GET', url, !!callback);
        if (callback) {
            req.responseType = 'arraybuffer';
            req.onreadystatechange = function(event) {
                if (req.readyState != 4)
                    return;
                if (req.status == 200) {
                    ret = Array.prototype.map.call(
                        new Uint8Array(req.response),
                        function(x) {
                            return String.fromCharCode(x);
                        }
                    ).join('');
                }
                callback(ret);
            };
            req.send();
            return;
        }
        req.overrideMimeType('text\/plain; charset=x-user-defined'); // IE fails
        req.send();
        return req.responseText.split('').map(function(x) {
            return String.fromCharCode(x.charCodeAt(0) % 0x100);
        }).join('');
    },

    loadL10n: function(callback) {
        if (Cc)
            return callback();
        var language = this.listener.global.navigator.language;
        if (['en', 'es', 'pt', 'zh'].indexOf(language.substr(0, 2)) >= 0) {
            language = language.replace('-', '_');
        } else {
            language = language.substr(0, 2);
        }
        var _this = this;
        this.read('/_locales/' + language + '/messages.json', function(str) {
            if (str) {
                _this.locale = JSON.parse(decodeURIComponent(escape(str)));
                return callback();
            }
            _this.read('/_locales/en_US/messages.json', function(ENstr) {
                _this.locale = JSON.parse(ENstr);
                return callback();
            });
        });
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
        if (chrome && chrome.extension) // GC Extension
            return chrome.i18n.getMessage(str);
        if (this.locale) { // normal web page
            return this.locale[str].message;
        }
        return '';
    },

    findBookmarkTitle: function(url) {
        if (url.search(/.*:\/\/([^\/]*).*/) < 0)
            url = 'telnet://' + url;
        if (url.lastIndexOf('/') == 8) // no trailing '/'
            url += '/';
        // Eat any errors
        try {
            var uri = this._ioService.newURI(url, null, null);
            var bookmarkArray = this._bookmarkService.getBookmarkIdsForURI(uri, {});
            // Return bookmark title if found; otherwise return the host name
            if (bookmarkArray.length > 0) {
                return this._bookmarkService.getItemTitle(bookmarkArray[0]);
            } else {
                return uri.hostPort;
            }
        } catch (e) { // fails in e10s
            // The URL might be incorrect >"<
            return url.replace(/.*:\/\/([^\/]*).*/, '$1');
        }
    },

    setConverter: function(callback) {
        this.listener.view.conv = this.converter;
        this.listener.conn.oconv = this.converter;
        if (!callback)
            return;
        if (!Cc) {
            var converter = this.converter;
            var Encoding = this.listener.prefs.get('Encoding');
            converter.buildCache('a2u', Encoding, function() {
                converter.buildCache('u2a', Encoding, function() {
                    callback();
                });
            });
        } else {
            callback();
        }
    },

    formatCRLF: function(type, str) {
        if (type == 'paste') {
            str = str.replace(/\r\n/g, '\r').replace(/\n/g, '\r');
            return str;
        }
        if (Cc) {
            var os = Cc["@mozilla.org/xre/app-info;1"]
                .getService(Ci.nsIXULRuntime).OS;
            if (os == 'WINNT') // handle CRLF
                return str.replace(/\n/g, '\r\n');
        }
        return str; // API of copy in web page will handle it automatically
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
        this.document.title = this.findBookmarkTitle(this.getUrl());
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

    load: function(files, callback) {
        if (files.length == 0)
            return;

        // http://stackoverflow.com/questions/31391207/javascript-readasbinarystring-function-on-e11
        if (!FileReader.prototype.readAsBinaryString) { // for IE
            FileReader.prototype.readAsBinaryString = function(fileData) {
                var _this = this;
                var reader = new FileReader();
                reader.onload = function(e) {
                    _this.onloadend(String.fromCharCode.apply(null, new Uint8Array(reader.result)));
                }
                reader.readAsArrayBuffer(fileData);
            }
        }

        var reader = new FileReader();
        reader.onloadend = function(event) {
            if (typeof(event) == 'string')
                return callback(event);
            if (reader.readyState != FileReader.DONE)
                return;
            if (reader.result)
                callback(reader.result);
        }
        reader.readAsBinaryString(files[0]);
    },

    save: function(filename, data) {
        var URL = this.listener.global.URL || this.listener.global.webkitURL;

        var ia = new Uint8Array(data.length);
        for (var i = 0; i < data.length; ++i) {
            ia[i] = data.charCodeAt(i);
        }
        var Blob = this.listener.global.Blob;
        var bb = new Blob([ia], {
            "type": "application/octet-stream"
        });

        if (this.listener.global.navigator.msSaveOrOpenBlob) // for IE
            return this.listener.global.navigator.msSaveOrOpenBlob(bb, filename);
        var downloader = this.getElementById('downloader');
        downloader.download = filename; // for GC 14+, FX 20+, and Edge 13+
        downloader.href = URL.createObjectURL(bb);
        downloader.click();
        this.setTimer(false, function() {
            URL.revokeObjectURL(downloader.href);
        }, 1000); //XXX: how long it takes to download completely?
    },

    beep: function(msg) {
        if (this.e10sEnabled) {
            // https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API
            // GC 10+, FX 25+, IE isn't supported
            //FIXME: support different sound for received mail
            var global = this.listener.global;
            var audioContext = global.AudioContext || global.webkitAudioContext;
            if (!audioContext) return;
            var audioCtx = new audioContext();
            var oscillator = audioCtx.createOscillator();
            var gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.value = 2500; // value in hertz
            oscillator.start();
            this.setTimer(false, function() {
                oscillator.stop();
            }, 250);
            return;
        }
        var sound = Cc["@mozilla.org/sound;1"].createInstance(Ci.nsISound);
        if (msg) {
            sound.playEventSound(sound.EVENT_NEW_MAIL_RECEIVED);
        } else {
            sound.beep();
        }
        //FIXME: support custum sound:
        //https://developer.mozilla.org/en/nsISound#play()
    },

    showPopups: function(msg) {
        var column = msg.replace(/^ +/, "").split(" ");
        var summary = this.document.title + " - " + column.shift();
        var body = column.join(" ");
        if (!Cc) {
            var global = this.listener.global;
            var Notification = global.Notification || global.webkitNotifications || global.navigator.mozNotification;
            if (global.webkitNotifications) { // GC 5-21
                if (global.webkitNotifications.checkPermission() == 0) {
                    global.webkitNotifications.createNotification(
                        this.skin + 'PCMan.png', summary, body
                    ).show();
                } else {
                    global.webkitNotifications.requestPermission();
                }
            } else if (global.navigator.mozNotification) { // FX 4-21
                if (global.navigator.mozNotification.permission == "granted") {
                    global.navigator.mozNotification.createNotification(
                        summary, body, this.skin + 'PCMan.png'
                    ).show();
                } else if (global.navigator.mozNotification.permission != 'denied') {
                    global.navigator.mozNotification.requestPermission();
                }
            } else if (global.Notification) { // GC 22+, FX 22+
                if (global.Notification.permission == "granted") {
                    new global.Notification(summary, {
                        body: body,
                        icon: this.skin + 'PCMan.png'
                    });
                } else if (global.Notification.permission != 'denied') {
                    global.Notification.requestPermission();
                }
            } else { // IE
                global.alert(msg);
            }
            return;
        }
        //FIXME: PopupNotifications.jsm is an alternative but works only in FX4+
        // nsIPromptService is more flexible but more coding is needed
        Components.classes['@mozilla.org/alerts-service;1']
            .getService(Components.interfaces.nsIAlertsService)
            .showAlertNotification(null, summary, body, false, '', null);
        //FIXME: Should we set the active tab as this page?
        //https://developer.mozilla.org/En/NsIAlertsService
    },

    debug: function(text) {
        if (typeof(Application) != 'undefined')
            return Application.console.log(text);
        if (Cu) // in firefox extension
            Cu.import("resource://gre/modules/Console.jsm");
        return console.log(text);
    }
};

