'use strict';

var pcmanOptions = null;

if (Components && Components.utils) {
    Components.utils.import("resource://pcmanfx2/RegisterModule.js");
    RegisterModule.import(window);
    Components.utils.unload("resource://pcmanfx2/RegisterModule.js");
}

function eventHandler(event) {
    switch (event.type) {
        case 'load':
            pcmanOptions = new PCManOptions(window);
            return;
        case 'unload':
            pcmanOptions.close();
            pcmanOptions = null;
            return;
        case 'change': // this.id: 'siteList'
            return pcmanOptions.siteChanged();
        case 'click':
            switch (this.id) {
                case 'addSite':
                    return pcmanOptions.addSite();
                case 'delSite':
                    return pcmanOptions.delSite();
                case 'submit':
                    return pcmanOptions.save();
                default:
            }
        default:
    }
}

window.onload = eventHandler;
window.onunload = eventHandler;

document.getElementById('siteList').onchange = eventHandler;
document.getElementById('addSite').onclick = eventHandler;
document.getElementById('delSite').onclick = eventHandler;
document.getElementById('submit').onclick = eventHandler;

