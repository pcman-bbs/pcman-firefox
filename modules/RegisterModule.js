// Import and unload Firefox modules

'use strict';

var EXPORTED_SYMBOLS = ["RegisterModule"];

var RegisterModule = {
  path: "chrome://pcmanfx2/content/",

  import: function(target) {
    Components.utils.import(this.path + "uao/uao.js", target);
    Components.utils.import(this.path + "browserutils.js", target);
    Components.utils.import(this.path + "browserstorage.js", target);
    Components.utils.import(this.path + "browsermenus.js", target);
    Components.utils.import(this.path + "contextmenu.js", target);
    Components.utils.import(this.path + "browsercomm.js", target);
    Components.utils.import(this.path + "prefdefault.js", target);
    Components.utils.import(this.path + "preferences.js", target);
    Components.utils.import(this.path + "prefhandler.js", target);
    Components.utils.import(this.path + "conn.js", target);
    Components.utils.import(this.path + "termview.js", target);
    Components.utils.import(this.path + "termsel.js", target);
    Components.utils.import(this.path + "termbuf.js", target);
    Components.utils.import(this.path + "ansiparser.js", target);
    Components.utils.import(this.path + "ssh.js", target);
  },

  unload: function(target) {
    Components.utils.unload(this.path + "uao/uao.js", target);
    Components.utils.unload(this.path + "browserutils.js", target);
    Components.utils.unload(this.path + "browserstorage.js", target);
    Components.utils.unload(this.path + "browsermenus.js", target);
    Components.utils.unload(this.path + "contextmenu.js", target);
    Components.utils.unload(this.path + "browsercomm.js", target);
    Components.utils.unload(this.path + "prefdefault.js", target);
    Components.utils.unload(this.path + "preferences.js", target);
    Components.utils.unload(this.path + "prefhandler.js", target);
    Components.utils.unload(this.path + "conn.js", target);
    Components.utils.unload(this.path + "termview.js", target);
    Components.utils.unload(this.path + "termsel.js", target);
    Components.utils.unload(this.path + "termbuf.js", target);
    Components.utils.unload(this.path + "ansiparser.js", target);
    Components.utils.unload(this.path + "ssh.js", target);
  }
};

