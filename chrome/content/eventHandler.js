'use strict';

var pcman = null;

function eventHandler(event, target) {
    var targetId = '';
    if (event.target == window || target == window) targetId = 'topwin';
    else if (!target) targetId = event.target.id;
    else targetId = target.id;
    switch (targetId) {
        case 'topwin':
            switch (event.type) {
                case 'load':
                    //modules.import();
                    pcman = new PCMan(window);
                    return;
                case 'unload':
                    pcman.close();
                    pcman = null;
                    //modules.unload();
                    return;
                case 'resize':
                    return pcman.view.onResize();
                case 'contextmenu':
                    return pcman.ui.menu.onMenuPopupShowing();
                case 'mousedown':
                case 'mouseup':
                default:
                    pcman.view.input.focus();
            }
            break;
        case 'box1':
            switch (event.type) {
                case 'mousedown':
                    return pcman.view.onMouseDown(event);
                case 'mousemove':
                    return pcman.view.onMouseMove(event);
                case 'mouseup':
                    return pcman.view.onMouseUp(event);
                case 'click':
                    return pcman.view.onClick(event);
                case 'dblclick':
                    return pcman.view.onDblClick(event);
                default:
            }
            break;
        case 'popup-copy': // event.type == 'command'
            return pcman.copy();
        case 'popup-paste': // event.type == 'command'
            return pcman.paste();
        case 'popup-selAll': // event.type == 'command'
            return pcman.selAll();
        default: // !targetId
            if (event.type == 'command') // event.target == searchmenu
                pcman.ui.menu.onSearchItemCommand(event);
            else if (event.target == document) // event.type == 'focus'
                pcman.view.input.focus();
    }
}

/*var modules = {
    import: function() {
        Components.utils.import("chrome://pcmanfx2/content/browserutils.js");
        Components.utils.import("chrome://pcmanfx2/content/browsermenus.js");
        Components.utils.import("chrome://pcmanfx2/content/conn.js");
        Components.utils.import("chrome://pcmanfx2/content/app.js");
        Components.utils.import("chrome://pcmanfx2/content/termview.js");
        Components.utils.import("chrome://pcmanfx2/content/termsel.js");
        Components.utils.import("chrome://pcmanfx2/content/inputHandler.js");
        Components.utils.import("chrome://pcmanfx2/content/termbuf.js");
        Components.utils.import("chrome://pcmanfx2/content/ansiparser.js");
    },

    unload: function() {
        Components.utils.unload("chrome://pcmanfx2/content/browserutils.js");
        Components.utils.unload("chrome://pcmanfx2/content/browsermenus.js");
        Components.utils.unload("chrome://pcmanfx2/content/conn.js");
        Components.utils.unload("chrome://pcmanfx2/content/app.js");
        Components.utils.unload("chrome://pcmanfx2/content/termview.js");
        Components.utils.unload("chrome://pcmanfx2/content/termsel.js");
        Components.utils.unload("chrome://pcmanfx2/content/inputHandler.js");
        Components.utils.unload("chrome://pcmanfx2/content/termbuf.js");
        Components.utils.unload("chrome://pcmanfx2/content/ansiparser.js");
    }
};*/

