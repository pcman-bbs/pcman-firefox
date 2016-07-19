'use strict';

var pcmanOptions = null;

if (typeof(Components) != 'undefined' && Components.utils) {
    Components.utils.import("resource://pcmanfx2/RegisterModule.js");
    RegisterModule.import(window);
    Components.utils.unload("resource://pcmanfx2/RegisterModule.js");
}

function eventHandler(event, target) {
    var targetId = '';
    if (event.target == document || target == window) targetId = 'topwin';
    else if (!target) targetId = event.target.id;
    else targetId = target.id;
    switch (targetId) {
        case 'topwin':
            switch (event.type) {
                case 'load':
                    pcmanOptions = new PCManOptions(window);
                    return;
                case 'unload':
                    pcmanOptions.close();
                    pcmanOptions = null;
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

window.onload = eventHandler;
window.onunload = eventHandler;

document.getElementById('siteList').onchange = eventHandler;
document.getElementById('addSite').onclick = eventHandler;
document.getElementById('delSite').onclick = eventHandler;
document.getElementById('submit').onclick = eventHandler;

