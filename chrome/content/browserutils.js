// Browser utilities, including preferences API access, site-depedent setting through Places API

const Cc = Components.classes;
const Ci = Components.interfaces;

function BrowserUtils() {
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
  findBookmarkID: function(url) {
    try {
      var uri = this._ioService.newURI(url, null, null);
      var bookmarkArray = this._bookmarkService.getBookmarkIdsForURI(uri, {});
      if (bookmarkArray.length <= 0)
        return null;
      return bookmarkArray[0];
    } catch (e) {
      // The URL might be incorrect >"<
      return null;
    }
  },

  findBookmarkTitle: function(url) {
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
    } catch (e) {
      // The URL might be incorrect >"<
      return '';
    }
  }
}

function openURI(uri, activate) {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                .getService(Components.interfaces.nsIWindowMediator);
    var gBrowser = wm.getMostRecentWindow("navigator:browser").gBrowser;
    var tab = gBrowser.addTab(uri, gBrowser.currentURI);
    if(activate)
        gBrowser.selectedTab = tab;
}
