var PCMan = {
  _updateIcon : null,
  
  init : function () {
    if (gBrowser && gBrowser.updateIcon) {
      PCMan._updateIcon = gBrowser.updateIcon;
      gBrowser.updateIcon = PCMan.updateIcon;
    }
  },
  
  uninit : function () {
    if (PCMan._updateIcon) {
      gBrowser.updateIcon = PCMan._updateIcon;
      PCMan._updateIcon = null;
    }
  },
  
  updateIcon : function (aTab) {
    var browser = gBrowser.getBrowserForTab(aTab);

    // -------------------
    try {
      if (browser.currentURI.scheme == 'telnet') {
        return;   // let pcman handle it
    }
    } catch(e) {}
    // -------------------
    
    if (!aTab.hasAttribute("busy") && browser.mIconURL)
      aTab.setAttribute("image", browser.mIconURL);
    else
      aTab.removeAttribute("image");
  }
}

window.addEventListener("load", PCMan.init, false);
window.addEventListener("unload", PCMan.uninit, false);

