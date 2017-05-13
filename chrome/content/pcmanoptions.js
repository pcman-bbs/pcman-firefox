// Process the DOM operations of prefwindow

'use strict';

function PCManOptions(global) {
    this.global = global;

    this.ui = new BrowserUtils(this);
    this.ui.storage = new BrowserStorage(this.ui);

    this.siteList = this.ui.getElementById('siteList');

    var _this = this;
    this.ui.loadL10n(function() {
        var prefs = new Preferences(_this, PrefDefaults, function(prefs) {
            _this.load(prefs);
        });
    });
}

PCManOptions.prototype = {
    // Initialize the prefwindow
    load: function(prefs) {
        if (prefs) this.prefs = prefs;
        this.l10n();
        this.getVersion();
        for (var i = 0; i < this.prefs.sites.length; ++i) {
            this.createTabs(i, this.prefs.get('_url', i), 0);
            this.setElemValues(i);
        }
        this.siteList.selectedIndex = this.getSite(this.ui.getSearch('url'));
        this.siteChanged();
    },

    // Change the content of prefwindow to that of another group
    siteChanged: function() {
        var sites = this.ui.document.getElementsByTagName('article');
        for (var i = 0; i < sites.length; ++i)
            sites[i].className = 'tabs hide';
        this.ui.getElementById('_' + this.siteList.selectedIndex).className = 'tabs';

        var url = this.siteList.options[this.siteList.selectedIndex].value;
        if (url == this.siteList.options[0].value) {
            url = this.ui.getSearch('url');
            if (this.getSite(url) > 0)
                url = '';
        }
        this.ui.getElementById('siteAddr').value = url ? url : '';
    },

    // Create a new site pref
    addSite: function() {
        var newHref = this.ui.getElementById('siteAddr').value;
        if (!newHref) return;
        var newIndex = this.getSite(newHref, true); // -1 if not exist
        if (newIndex > -1) { // if the site pref is existed, just go there
            this.siteList.selectedIndex = this.getSite(newIndex);
            this.siteChanged();
            return;
        }
        // Create site prefs and set initial value
        newIndex = this.siteList.options.length;
        this.createTabs(newIndex, newHref, this.siteList.selectedIndex);
        this.siteList.selectedIndex = this.getSite(newIndex);
        this.siteChanged();
    },

    // Delete an existed site pref
    delSite: function() {
        if (this.siteList.selectedIndex == 0) {
            this.setElemValues(0, -1); // reset default site
            return;
        }
        this.removeTabs(this.siteList.selectedIndex);
        this.siteList.selectedIndex = 0;
        this.siteChanged();
    },

    // Save all changes to file
    save: function() {
        var data = [];
        for (var i = 0; i < this.siteList.options.length; ++i) {
            var site = this.getElemValues(i);
            site._url = this.siteList.options[i].value;
            data.push(site);
        }
        this.prefs.save(data);
    },

    // Finalize the prefwindow
    close: function() {},

    // get i18n strings for UI
    l10n: function() {
        // Override the contents in certain tags with from &xxx.label;
        var tags = ['label', 'option', 'header', 'title'];
        for (var i = 0; i < tags.length; ++i) {
            var elems = this.ui.document.getElementsByTagName(tags[i]);
            for (var j = 0; j < elems.length; ++j) {
                var textContent = elems[j].textContent;
                if (textContent.charAt(0) == '&') // substr(-7) == '.label;'
                    elems[j].textContent = this.ui.l10n(textContent.slice(1, -7));
            }
        }
        var downloads = this.ui.document.getElementsByTagName('a');
        for (var i = 0; i < downloads.length; ++i) {
            var href = downloads[i].getAttribute('href');
            if (href.charAt(0) == '&') // substr(-7) == '.label;'
                downloads[i].setAttribute('href', this.ui.l10n(href.slice(1, -7)));
        }
    },

    // get version info for ABOUT page
    getVersion: function() {
        var _this = this;
        this.ui.getVersion(function(ver) {
            var versions = _this.ui.document.getElementsByClassName('version');
            for (var i = 0; i < versions.length; ++i)
                versions[i].textContent = '' + ver;
        });
    },

    // Check if the site with the index or the url exists
    getSite: function(site, strict) {
        if (typeof(site) == 'undefined')
            return strict ? -1 : 0;
        if (typeof(site) == 'number') {
            if (site >= 0 && site < this.siteList.options.length)
                return site;
            return strict ? -1 : 0;
        }
        for (var i = 0; i < this.siteList.options.length; ++i) {
            if (this.siteList.options[i].value == site)
                return i;
        }
        return strict ? -1 : 0;
    },

    // initiate tab switching
    iniTabs: function(origin) {
        var tabheaders = origin.getElementsByTagName('header');
        for (var i = 0; i < tabheaders.length; ++i) {
            if (!tabheaders[i].parentNode.className)
                tabheaders[i].parentNode.className = 'inactive';
            tabheaders[i].onclick = function(event) {
                var tab = event.target.parentNode;
                for (var j = 0; j < tab.parentNode.childNodes.length; ++j) {
                    var node = tab.parentNode.childNodes[j];
                    if (node.tagName && (node.tagName.toLowerCase() == 'section'))
                        node.className = 'inactive';
                }
                tab.className = 'active';
            };
        }
    },

    // To avoid duplicate id after cloneNode
    modifyAttr: function(fromGrp, toGrp, orgTabs) {
        if (!orgTabs)
            orgTabs = this.ui.getElementById('_' + fromGrp);
        var modifyAttribute = function(parentNode, tag, attr, fromGrp, toGrp) {
            var nodes = parentNode.getElementsByTagName(tag);
            for (var i = 0; i < nodes.length; ++i) {
                var attribute = nodes[i].getAttribute(attr);
                if (!attribute) continue;
                nodes[i].setAttribute(
                    attr,
                    attribute.replace(new RegExp(fromGrp + '$'), toGrp)
                );
            }
        };
        modifyAttribute(orgTabs, 'label', 'for', fromGrp, toGrp);
        modifyAttribute(orgTabs, 'select', 'id', fromGrp, toGrp);
        modifyAttribute(orgTabs, 'datalist', 'id', fromGrp, toGrp);
        modifyAttribute(orgTabs, 'input', 'id', fromGrp, toGrp);
        modifyAttribute(orgTabs, 'input', 'list', fromGrp, toGrp);
        orgTabs.id = '_' + toGrp;
        return orgTabs;
    },

    // create a HTML Tab group
    createTabs: function(toGroup, url, fromGroup) {
        if (!toGroup) { // toGroup is 0
            this.siteList.options[0].value = this.prefs.default._url;
            this.iniTabs(this.ui.getElementById('_0'));
            return;
        }
        var newTabs = this.ui.getElementById('_' + toGroup);
        if (newTabs) return;

        // modifyAttr on newTabs may fail for async inserting newTabs
        var orgTabs = this.modifyAttr(fromGroup, toGroup);
        newTabs = orgTabs.cloneNode(true);
        newTabs.className = 'tabs hide';
        this.modifyAttr(toGroup, fromGroup, orgTabs);
        orgTabs.parentNode.insertBefore(
            newTabs,
            this.ui.getElementById('_' + (toGroup + 1)) // null if not exist
        );

        var option = this.ui.document.createElement("option");
        option.value = url;
        option.textContent = this.ui.findBookmarkTitle(url);
        siteList.insertBefore(
            option,
            (toGroup < this.siteList.options.length) ? this.siteList.options[toGroup] : null
        );

        this.iniTabs(newTabs);
    },

    // remove a HTML Tab group
    removeTabs: function(toGroup) {
        var newTabs = this.ui.getElementById('_' + toGroup);
        if (!newTabs) return;

        // remove toGroup and resequence the Tabs
        newTabs.parentNode.removeChild(newTabs);
        var option = this.siteList.options[toGroup];
        option.parentNode.removeChild(option);

        for (var i = toGroup; i < this.siteList.options.length; ++i)
            this.modifyAttr(i + 1, i);
    },

    // set values of HTML elements
    setElemValues: function(recentGroup, fromGroup) {
        for (var key in this.prefs.default) {
            var elem = this.ui.getElementById(key + '_' + recentGroup);
            if (!elem) continue;
            if (typeof(fromGroup) == 'undefined') {
                var value = this.prefs.get(key, recentGroup);
            } else if (fromGroup < 0) {
                var value = this.prefs.default[key];
            } else {
                var value = this.ui.getElementById(key + '_' + fromGroup);
                if (!value) continue;
            }
            if (typeof(this.prefs.default[key]) == 'boolean')
                elem.checked = (typeof(value) == 'object') ? value.checked : value;
            else
                elem.value = (typeof(value) == 'object') ? value.value : value;
        }
    },

    // get values of HTML elements
    getElemValues: function(recentGroup) {
        var output = {};
        for (var key in this.prefs.default) {
            var elem = this.ui.getElementById(key + '_' + recentGroup);
            if (!elem)
                continue;
            if (typeof(this.prefs.default[key]) == 'boolean')
                output[key] = elem.checked;
            else if (typeof(this.prefs.default[key]) == 'number')
                output[key] = parseFloat(elem.value);
            else
                output[key] = elem.value;
        }
        return output;
    }
};

