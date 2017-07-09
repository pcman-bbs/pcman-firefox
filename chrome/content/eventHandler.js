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
            var input = document.getElementById('input_proxy');
            input.addEventListener('compositionstart', eventHandler, false);
            input.addEventListener('compositionend', eventHandler, false);
            return;
        case 'beforeunload':
            return pcman.onbeforeunload(event);
        case 'unload':
            var input = document.getElementById('input_proxy');
            input.removeEventListener('compositionstart', eventHandler, false);
            input.removeEventListener('compositionend', eventHandler, false);
            pcman.close();
            pcman = null;
            return;
        case 'focus':
            return document.getElementById('input_proxy').focus();
        case 'resize':
            return pcman.view.onResize(event);
        case 'keydown':
            var hotkey = pcman.view.onkeyDown(event);
            if (hotkey == 'copy' && document.execCommand) { // not XUL
                var helper = pcman.copy(false, 'external');
                // supported in semi-trusted scripts of normal web pages
                document.execCommand('copy');
                pcman.copy(false, helper);
            } else if (hotkey == 'paste' && document.execCommand) { // not XUL
                if (!pcman.ui.socket.pasteEnabled(event)) { // normal web pages
                    pcman.paste(); // paste by websocket server
                    return hotkey;
                }
                var helper = pcman.paste('external');
                // not supported in normal web pages except IE
                document.execCommand('paste');
                pcman.paste(helper);
            } else if (hotkey) {
                eventHandler({
                    type: 'command',
                    target: {
                        id: 'popup-' + hotkey
                    }
                });
            }
            return hotkey;
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
            if (this.id == 'box1') {
                if (pcman.ui.menu.contextmenu && pcman.ui.menu.contextmenu.onclick(event))
                    return;
                return pcman.view.onClick(event);
            }
            if (!pcman.ui.menu.contextmenu)
                return;
            var clicked = pcman.ui.menu.contextmenu.getClicked();
            if (clicked == 'menu_copy' && document.execCommand) { // not XUL
                var helper = pcman.copy(false, 'external');
                // supported in semi-trusted scripts of normal web pages
                document.execCommand('copy');
                pcman.copy(false, helper);
            } else if (clicked == 'menu_coloredCopy' && document.execCommand) { // not XUL
                var helper = pcman.copy(true, 'external');
                // supported in semi-trusted scripts of normal web pages
                document.execCommand('copy');
                pcman.copy(true, helper);
            } else if (clicked == 'menu_paste' && document.execCommand) { // not XUL
                if (!pcman.ui.socket.pasteEnabled(event)) { // normal web pages
                    pcman.paste(); // paste by websocket server
                    return;
                }
                var helper = pcman.paste('external');
                // not supported in normal web pages except IE
                document.execCommand('paste');
                pcman.paste(helper);
            } else if (clicked && clicked.indexOf('SubMenu_') != 0) {
                clicked = clicked.replace('menu_', 'popup-');
                eventHandler({
                    type: 'command',
                    target: {
                        id: clicked.replace('_', '-')
                    }
                });
            }
            return;
        case 'dblclick':
            return pcman.view.onDblClick(event);
        case 'command':
            switch (event.target.id) {
                case 'popup-copy': // this == window in xul
                    return pcman.copy();
                case 'popup-coloredCopy': // this == window in xul
                    return pcman.copy(true);
                case 'popup-paste': // this == window in xul
                    return pcman.paste();
                case 'popup-selAll': // this == window in xul
                    return pcman.selAll();
                case 'search-google':
                    return pcman.ui.menu.search();
                case 'search-yahoo':
                    return pcman.ui.menu.search('Yahoo!');
                case 'search-bing':
                    return pcman.ui.menu.search('Bing');
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

document.getElementById('contextmenu').onclick = eventHandler;

document.getElementById('input_proxy').oninput = eventHandler;
document.getElementById('filepicker').onchange = eventHandler;

