chrome.app.window.create('socket.htm', {
    id: 'socket',
    hidden : true
}, function(socket) {
    socket.hide();
});

chrome.app.runtime.onLaunched.addListener(function() {
    // replace these codes with chrome.app.window.get('socket') at GC 33+
    chrome.app.window.create('socket.htm', { // get existed window with same id
        id: 'socket', 
        hidden : true
    }, function(socket) {
        socket.hide();
        if(!socket.contentWindow.whitelist)
            return; // prevent the option window opening when GC restarts
        chrome.app.window.create('options.htm', {
            width: 300,
            height: 200
        }, function(options) {
        });
    });
});
