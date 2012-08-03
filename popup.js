function click(event) {
    setBGVar('url', event.target.id);
    openURI("pcman.htm", true);
    window.close();
}

window.onload = function(event) {
    var divs = getBGVar("buildSiteList")();

    for(var id in divs) {
        var newDiv = document.createElement('div');
        newDiv.id = id;
        newDiv.textContent = divs[id];
        newDiv.onclick = click;
        document.body.appendChild(newDiv);
    }
}
