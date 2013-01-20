var pcman=null;
function setup() {
//    var url=document.location.host;
//    document.location.hash = '#' + getBGVar('url');
    pcman=new PCMan();
    pcman.connect(document.location.hash.substr(1));
    // Fetch title from bookmarks. XXX: Places API can be slow!
//    var browserutils = new BrowserUtils();
//    document.getElementById('topwin').setAttribute('title', browserutils.findBookmarkTitle(document.location.href));
    document.title = document.location.hash.substr(1);
    document.getElementById('input_proxy').focus();
    document.addEventListener('focus', set_focus, false);
    resize();
    pcmanMenuItems(true); // create
}

function set_focus(e) { document.getElementById('input_proxy').focus(); }

function finalize() {
    pcman.close();
    pcman=null;
    document.removeEventListener('focus', set_focus, false);
//    createSearchMenu(document.getElementById('search_menu'), true);
    pcmanMenuItems(false); // remove
}

function resize(){
    document.getElementById('topwin').style.height = window.innerHeight + 'px';
    pcman.view.onResize();
    pcman.view.setAlign();
}
/*
function prepare_popup(event) {
    var search_menu = document.getElementById('search_menu');
    createSearchMenu(search_menu);
}
*/
function searchText() {
    if(!pcman || !pcman.view.selection.hasSelection())
        return;
    var text = pcman.view.selection.getText();
    //Fixme: get search patterns from the preferences of GC
    var searchPattern = "http://www.google.com/search?q=%s";
    openURI(searchPattern.replace(/%s/g, encodeURIComponent(text)), true);
}

function sitePref() {
//    window.openDialog("chrome://pcmanfx2/content/preferences.xul", "", "", document.location.href);
    openURI('options.htm?url=' + document.location.hash.substr(1), true);
}

function eventHandler(event) {
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
}

function pcmanMenuItems(create) {
    createMenu(''); // remove previous items

    if(!create)
        return;

    // create the contentMenu item
    var popup_copy = createMenu(msg("menu_copy"), function() {
        pcman.copy();
    }, null, 'copy');
    var popup_coloredCopy = createMenu(msg("menu_coloredCopy"), function() {
        pcman.ansiColor.copy();
    }, null, 'ansiCopy');
    var popup_paste = createMenu(msg("menu_paste"), function() {
        pcman.paste();
    }, null, 'paste');
    var popup_selAll = createMenu(msg("menu_selAll"), function() {
        pcman.selAll();
    }, null, 'selAll');
    var popup_search = createMenu(msg("menu_search"), searchText, null, 'search');
    var popup_fileio = createMenu(msg("menu_fileio"), null, null, 'fileIO');
    var popup_loadfile = createMenu(msg("menu_loadfile"), function() {
        pcman.ansiColor.file.openFile();
    }, popup_fileio, 'loadFile');
    var popup_savefile = createMenu(msg("menu_savefile"), function() {
        pcman.ansiColor.file.savePage();
    }, popup_fileio, 'savePage');
    var popup_sitepref = createMenu(msg("menu_sitepref"), sitePref, null, 'pref');
}

window.onload = setup;
window.onunload = finalize;
window.onresize = resize;
window.onmousedown = set_focus;
window.onmouseup = set_focus;

// A dirty hack to show context menu only in bbs page
window.onfocus = function(event) {
    pcmanMenuItems(true); // create
};
window.onblur = function(event) {
    pcmanMenuItems(false); // remove
};

var box1 = document.getElementById('box1');
box1.onmousedown = eventHandler;
box1.onmousemove = eventHandler;
box1.onmouseup = eventHandler;
box1.onclick = eventHandler;
box1.ondblclick = eventHandler;

