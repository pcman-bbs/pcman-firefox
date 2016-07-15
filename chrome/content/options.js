'use strict';

var pcmanOptions = null;

function eventHandler(event, target) {
    var targetId = '';
    if (event.target == document || target == window) targetId = 'topwin';
    else if (!target) targetId = event.target.id;
    else targetId = target.id;
    switch (targetId) {
        case 'topwin':
            switch (event.type) {
                case 'load':
                    //modules.import();
                    pcmanOptions = new PCManOptions(window);
                    return;
                case 'unload':
                    pcmanOptions.close();
                    pcmanOptions = null;
                    //modules.unload();
                    return;
                default:
            }
            break;
        case 'siteList': // event.type == 'change'
            return pcmanOptions.siteChanged();
        case 'addSite': // event.type == 'click'
            return pcmanOptions.addSite();
        case 'delSite': // event.type == 'click'
            return pcmanOptions.delSite();
        case 'submit': // event.type == 'click'
            return pcmanOptions.save();
        default:
    }
}

/*var modules = {
    import: function() {
        Components.utils.import("chrome://pcmanfx2/content/browserutils.js");
        Components.utils.import("chrome://pcmanfx2/content/browserstorage.js");
        Components.utils.import("chrome://pcmanfx2/content/prefdefault.js");
        Components.utils.import("chrome://pcmanfx2/content/preferences.js");
    },

    unload: function() {
        Components.utils.unload("chrome://pcmanfx2/content/browserutils.js");
        Components.utils.unload("chrome://pcmanfx2/content/browserstorage.js");
        Components.utils.unload("chrome://pcmanfx2/content/prefdefault.js");
        Components.utils.unload("chrome://pcmanfx2/content/preferences.js");
    }
};*/

window.onload = eventHandler;
window.onunload = eventHandler;

document.getElementById('siteList').onchange = eventHandler;
document.getElementById('addSite').onclick = eventHandler;
document.getElementById('delSite').onclick = eventHandler;
document.getElementById('submit').onclick = eventHandler;

