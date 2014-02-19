function buildSiteList(preDefined) {
    //FIXME: load the list of the site without independent settings
    if(!preDefined) {
        preDefined = {
            'ptt.cc': 'PTT BBS',
            'ptt2.cc': 'PTT2 BBS',
            'bbs.gamer.com.tw': 'Bahamut BBS'
        };
    }
    var list = {};
    for(var key in preDefined)
        list[key] = preDefined[key];
    var options = new PCManOptions();
    var groups = options.getGroupNames();
    for(var i=1; i<groups.length; ++i) { // discard default group
        if(!list[groups[i]])
            list[groups[i]] = groups[i];
        //FIXME: get the title of each group from bookmark or etc.
    }
    return list;
}

var url = 'ptt.cc';

chrome.omnibox.onInputStarted.addListener(function() {
});

chrome.omnibox.onInputChanged.addListener(function(text, suggest) {
    url = text;

    chrome.omnibox.setDefaultSuggestion({
        description: '<url>telnet://<match>'+text+'</match></url>'
    });

    var list = buildSiteList();
    var suggestions = [];
    for(var id in list) {
        if(id.indexOf(text) != 0)
            continue;

        var suggestion = {
            content: id,
            description: '<url>telnet://<match>'+id+'</match></url> - <dim>'+list[id]+'</dim>'
        };
        suggestions.push(suggestion);
    }
    suggest(suggestions);
});

chrome.omnibox.onInputEntered.addListener(function(text) {
    url = text;
    if(!url)
        url = 'ptt.cc';

    chrome.tabs.getSelected(null, function(tab) {
        chrome.tabs.update(
            tab.id,
            {url: "pcman.htm#" + url},
            function(tab) {
            }
        );
    });
});

chrome.omnibox.onInputCancelled.addListener(function() {
});

// not used since popup.htm is introduced
chrome.browserAction.onClicked.addListener(function(tab) {
    if(!url)
        url = 'ptt.cc';

    chrome.tabs.create({
        url: "pcman.htm#" + url,
        selected: true
    }, function(tab) {
    });
});

var socketAgent = 'icogghjphidkpfkpkloecjooiknfkdbl';
function initialSocket(callback, skipCheckApp) {
    if(!skipCheckApp) {
        chrome.management.get(socketAgent, function(result) {
            if(result) {
                if(result.enabled) {
                    if(result.version.split('.').pop() >= 168)
                        initialSocket(callback, true);
                    else
                        callback('please upgrade socket app.');
                } else
                    callback('Please enable socket app.');
            } else
                callback('Please install socket app.');
        });
        return;
    }
    chrome.runtime.sendMessage(socketAgent, {action: 'wake'}, function(response) {
        if(response && response.action == 'waked')
            callback();
        else
            setTimeout(function() { initialSocket(callback, true); }, 100);
    });
}
initialSocket(function() {});

chrome.windows.onRemoved.addListener(function(windowId) {
    chrome.windows.getAll(function(windows) {
        if(windows.length > 0) // Not all browser windows are closed
            return;
        chrome.runtime.sendMessage(socketAgent, {action: 'close'}, function(response) {
            //if(response.action == 'closing');
        });
    });
});

