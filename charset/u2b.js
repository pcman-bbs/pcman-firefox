window.onload = function(event) {
    if(location.search && parent)
        parent.document.getElementById(location.hash.substr(1)).callback(location.search);
}

