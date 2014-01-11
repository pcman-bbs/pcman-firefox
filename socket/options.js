document.getElementById('whitelist').form.onreset = function(event) {
    chrome.storage.local.get('whitelist', function(data) {
        document.getElementById('whitelist').value =
            data.whitelist.replace(/[^a-z\n]/g,'');
    });
};

document.getElementById('whitelist').form.onsubmit = function(event) {
    chrome.storage.local.set({
        whitelist: document.getElementById('whitelist').value.replace(/[^a-z\n]/g,'')
    }, function() {});
};

window.onload = document.getElementById('whitelist').form.onreset;
document.getElementById('options_whitelist').textContent = chrome.i18n.getMessage('options_whitelist');

