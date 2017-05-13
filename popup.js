window.onload = function(event) {
    var bg = chrome.extension.getBackgroundPage();
    var divs = bg.buildSiteList();

    for (var id in divs) {
        var newDiv = document.createElement('div');
        newDiv.id = id;
        newDiv.textContent = divs[id];
        newDiv.onclick = function(e) {
            bg.url = e.target.id;
            chrome.tabs.create({
                url: "public_html/index.htm#" + e.target.id,
                active: true
            }, function(tab) {
                window.close();
            });
        };
        document.body.appendChild(newDiv);
    }
};

