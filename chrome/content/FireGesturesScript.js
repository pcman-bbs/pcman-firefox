// Generate scripts for FireGestures
//
// Some part of the code is taken from BBSFox developed by
// Ett Chung <ettoolong@hotmail.com>
// https://addons.mozilla.org/zh-TW/firefox/addon/179388/

//FIXME: load gesture mapping names from FireGestures directly

function setData(event) {
    var scriptLink = document.getElementById('scriptLink');

    event.dataTransfer.setData(
        'text/x-moz-url',
        scriptLink.getAttribute('hrefdata') + '\n' + scriptLink.innerHTML
    );
}

function createScript() {
    var scriptLink = document.getElementById('scriptLink');
    var BBSGesture = document.getElementById('BBSGesture').value;
    var HTMLGesture = document.getElementById('HTMLGesture').value;

    var bbsStr = document.getElementById('BBSGesture').selectedItem.label;
    //var httpstr = document.getElementById('HTMLGesture').selectedItem.label;
    var httpStr = HTMLGesture;

    // Set the text within the link

    if(BBSGesture == '')
        var scriptCaption = '';
    else if(HTMLGesture != '')
        var scriptCaption = httpStr + ' / BBS - ' + bbsStr;
    else
        var scriptCaption = 'BBS: ' + bbsStr;
    scriptLink.textContent = scriptCaption;
    scriptLink.style.paddingLeft = "10px";
    scriptLink.style.textDecoration = "underline";
    scriptLink.style.color = "blue";

    // Set the hrefdata of the link

    if(BBSGesture == '') {
        scriptLink.setAttribute('hrefdata', '');
        return;
    }

    var scriptContent = [
        'var aBrowser = gBrowser;',
        'var uri = aBrowser.currentURI;',
        'var doc = aBrowser.contentDocument;',
        'if(aBrowser && uri && doc) {',
        '    var url = uri.spec.toLowerCase();',
            // this id is chosen because it seldom appears in general HTML pages
        '    var isPCMan = doc.getElementById("pcman-string-bundle");',
        '    if(url.indexOf("telnet://") == 0 && isPCMan) {',
        '        if("createEvent" in doc) {',
        '            var evt = doc.createEvent("datacontainerevents");',
        '            evt.initEvent("FireGesturesCommand", false, false);',
        '            evt.setData("command", "'+BBSGesture+'");',
        '            doc.dispatchEvent(evt);',
        '        }',
        '        return;',
        '    }',
        '}'
    ];

    if(HTMLGesture != '') {
        scriptContent.push(
        'FireGestures._performAction(event, "'+HTMLGesture+'");'
        );
    }

    var scriptData = escape(scriptContent.join('\r'));
    scriptLink.setAttribute('hrefdata', 'data:text/javascript,' + scriptData);
}
