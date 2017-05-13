window.onload = function(event) {
    if (location.search && parent)
        parent.postMessage(location.search, "*");
}

