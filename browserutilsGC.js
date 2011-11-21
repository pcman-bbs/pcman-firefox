function getBGVar(variable) {
    return chrome.extension.getBackgroundPage()[variable];
}

function setBGVar(variable, value) {
    chrome.extension.getBackgroundPage()[variable] = value;
}

function msg(str) {
    return chrome.i18n.getMessage(str);
}

function createMenu(title, func, parentId) {
    if(!chrome || !chrome.contextMenus)
        return;

    if(!title)
        return chrome.contextMenus.removeAll();

    var createProperties = { "title": title };
    if(func)
        createProperties.onclick = func;
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
    return chrome.extension.getBackgroundPage().systemClipboard(text);
}

function speak(text) {
    chrome.tts.speak(text);
}

function getDetails() {
    return chrome.app.getDetails();
}

function dump(str) {
    console.log(str);
}
