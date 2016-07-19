'use strict';

var pcman = null;

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
                    pcman = new PCMan(window);
                    return;
                case 'unload':
                    pcman.close();
                    pcman = null;
                    return;
                case 'resize':
                    return pcman.view.onResize();
                case 'contextmenu':
                    return pcman.ui.menu.onMenuPopupShowing();
                case 'keydown':
                    return pcman.view.onkeyDown(event);
                case 'focus':
                case 'mousedown':
                case 'mouseup':
                default:
                    return document.getElementById('input_proxy').focus();
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
        case 'input_proxy':
            switch (event.type) {
                case 'compositionstart':
                    return pcman.view.onCompositionStart(event);
                case 'compositionend':
                    return pcman.view.onCompositionEnd(event);
                case 'input':
                    return pcman.view.onTextInput(event);
                default:
            }
            break;
        case 'popup-copy': // event.type == 'command'
            return pcman.copy();
        case 'popup-paste': // event.type == 'command'
            return pcman.paste();
        case 'popup-selAll': // event.type == 'command'
            return pcman.selAll();
        case 'sitePref': // event.type == 'command'
            return pcman.ui.sitePref();
        default:
            if (event.type == 'command') // event.target == searchmenu
                return pcman.ui.menu.onSearchItemCommand(event);
    }
}

