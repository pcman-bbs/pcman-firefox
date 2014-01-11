function getBGVar(variable) {
    return chrome.extension.getBackgroundPage()[variable];
}

function setBGVar(variable, value) {
    chrome.extension.getBackgroundPage()[variable] = value;
}

function msg(str) {
    return chrome.i18n.getMessage(str);
}

var menuHandler = {};
chrome.contextMenus.onClicked.addListener(function(onClickData, tab) {
    menuHandler[onClickData.menuItemId]();
});
function createMenu(title, func, parentId, id) {
    if(!chrome || !chrome.contextMenus)
        return;

    if(!title)
        return chrome.contextMenus.removeAll();

    var createProperties = { "title": title, "id":(id?id:title) };
    if(func)
        menuHandler[createProperties.id] = func;
    if(parentId)
        createProperties.parentId = parentId;

    return chrome.contextMenus.create(createProperties, function() {});
}

function openURI(uri, activate, callback) {
    chrome.tabs.create({
        url: uri,
        selected: activate
    }, function(tab) {
        if(callback)
            callback(tab);
    });
}

function systemClipboard(text) {
    var sandbox = document.createElement('textarea');
    sandbox.style = "position:absolute; left: -100px;";
    document.getElementById('input_proxy').parentNode.appendChild(sandbox);
    if(text) { // copy string to system clipboard
        sandbox.value = text;
        sandbox.select();
        document.execCommand('copy');
        sandbox.parentNode.removeChild(sandbox);
        document.getElementById('input_proxy').focus();
    } else { // get string from system clipboard
        sandbox.select();
        document.execCommand('paste');
        text = sandbox.value;
        sandbox.parentNode.removeChild(sandbox);
        document.getElementById('input_proxy').focus();
        return text;
    }
}

function speak(text) {
    chrome.tts.speak(text);
}

function getDetails() {
    return chrome.runtime.getManifest();
}

function socket(socketHandler) {
    return chrome.runtime.connect(socketHandler);
}

function dump(str) {
    console.log(str);
}

var storage = chrome.storage;
