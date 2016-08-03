'use strict';

var pcman = null;

if (Components && Components.utils) {
    Components.utils.import("resource://pcmanfx2/RegisterModule.js");
    RegisterModule.import(window);
    Components.utils.unload("resource://pcmanfx2/RegisterModule.js");
}

function eventHandler(event) {
    switch (event.type) {
        case 'load':
            pcman = new PCMan(window);
            pcman.view.input.addEventListener('compositionstart', eventHandler, false);
            pcman.view.input.addEventListener('compositionend', eventHandler, false);
            return;
        case 'beforeunload':
            return pcman.onbeforeunload(event);
        case 'unload':
            pcman.view.input.removeEventListener('compositionstart', eventHandler, false);
            pcman.view.input.removeEventListener('compositionend', eventHandler, false);
            pcman.close();
            pcman = null;
            return;
        case 'focus':
            return document.getElementById('input_proxy').focus();
        case 'resize':
            return pcman.view.onResize(event);
        case 'keydown':
            return pcman.view.onkeyDown(event);
        case 'compositionstart':
            return pcman.view.onCompositionStart(event);
        case 'compositionend':
            return pcman.view.onCompositionEnd(event);
        case 'input':
            return pcman.view.onTextInput(event);
        case 'contextmenu':
            if (pcman.ui.menu.contextmenu)
                return pcman.ui.menu.contextmenu.observer(event);
            return pcman.ui.menu.onMenuPopupShowing(event);
        case 'mousedown':
            if (this.id == 'box1') {
                if (pcman.ui.menu.contextmenu && pcman.ui.menu.contextmenu.onclick(event))
                    return;
                return pcman.view.onMouseDown(event);
            }
            return document.getElementById('input_proxy').focus();
        case 'mousemove':
            return pcman.view.onMouseMove(event);
        case 'mouseup':
            if (this.id == 'box1') {
                if (pcman.ui.menu.contextmenu && pcman.ui.menu.contextmenu.onclick(event))
                    return;
                return pcman.view.onMouseUp(event);
            }
            return document.getElementById('input_proxy').focus();
        case 'click':
            if (pcman.ui.menu.contextmenu && pcman.ui.menu.contextmenu.onclick(event))
                return;
            return pcman.view.onClick(event);
        case 'dblclick':
            return pcman.view.onDblClick(event);
        case 'command': // only xul use it
            switch (event.target.id) {
                case 'popup-copy': // this == window in xul
                    return pcman.copy();
                case 'popup-coloredCopy': // this == window in xul
                    return pcman.copy(true);
                case 'popup-paste': // this == window in xul
                    return pcman.paste();
                case 'popup-selAll': // this == window in xul
                    return pcman.selAll();
                case 'popup-loadfile': // this == window in xul
                    return document.getElementById('filepicker').click();
                case 'save-txt': // this == window in xul
                    return pcman.save();
                case 'save-ans': // this == window in xul
                    return pcman.save('ansi');
                case 'popup-sitepref': // this == window in xul
                    return pcman.ui.sitepref();
                default: // event.target == searchmenu
                    return pcman.ui.menu.onSearchItemCommand(event);
            }
        case 'change': // this == filepicker
            return pcman.load(event);
        default:
    }
}

// event.target is shown in comments
window.onload = eventHandler; // document
window.onbeforeunload = eventHandler; // document
window.onunload = eventHandler; // document
window.onresize = eventHandler; // window
window.onmousedown = eventHandler; // topwin/box1/canvas
window.onmouseup = eventHandler; // topwin/box1/canvas
window.onkeydown = eventHandler; // input_proxy
window.oncontextmenu = eventHandler; // topwin/box1/canvas
document.onfocus = eventHandler; // document

document.getElementById('box1').onmousedown = eventHandler; // box1/canvas
document.getElementById('box1').onmousemove = eventHandler; // box1/canvas
document.getElementById('box1').onmouseup = eventHandler; // box1/canvas
document.getElementById('box1').onclick = eventHandler; // box1/canvas
document.getElementById('box1').ondblclick = eventHandler; // box1/canvas

document.getElementById('input_proxy').oninput = eventHandler;
document.getElementById('filepicker').onchange = eventHandler;

