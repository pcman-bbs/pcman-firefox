function a2uCache(charset, callback) {
    var byteArray = new Array((0xFFFF - 0x8001 + 1) * 3);
    var idx = 0;
    for (var code = 0x8001; code <= 0xFFFF; code++) {
        if (code % 0x100 < 0x40) { // not valid char
            byteArray[idx] = 0xFF;
            byteArray[idx + 1] = 0xFD;
            byteArray[idx + 2] = 0x20;
        } else {
            byteArray[idx] = Math.floor(code / 0x100);
            byteArray[idx + 1] = code % 0x100;
            byteArray[idx + 2] = 0x20;
        }
        idx += 3;
    }
    byteArray.pop();
    var bb = new Blob(
        [new Uint8Array(byteArray)], {
            "type": "text/plain"
        }
    );

    var handler = function(response) {
        var text = response.replace(/[^ ]\x3F/g, '\xFF\xFD '); // For MSIE
        var cache = text.split(' ').map(function(x) {
            if (x.length != 1 || x.charCodeAt(0) < 0x81) {
                return '\xFF\xFD';
            } else {
                var code = x.charCodeAt(0);
                var strCode = [Math.floor(code / 0x100), code % 0x100];
                return String.fromCharCode(strCode[0], strCode[1]);
            }
        }).join('');
        if (callback)
            callback(cache);
    };

    var url = URL.createObjectURL(bb);
    var req = new XMLHttpRequest();
    req.open("GET", url, true);
    req.overrideMimeType("text/plain;charset=" + charset);
    req.onreadystatechange = function(event) {
        if (req.readyState != 4)
            return;
        URL.revokeObjectURL(url);
        handler(req.response);
    };
    req.send();
}

function u2aCache(charset, callback) {
    var converter = document.getElementById("u2b_form");
    if (converter.hasAttribute("locked"))
        return setTimeout(function() {
            u2aCache(charset, callback);
        }, 500);
    converter.setAttribute("locked", "true");

    var str = '';
    for (var i = 0x81; i <= 0xFFFF; i++) {
        str += String.fromCharCode(i) + ' ';
    }
    str = str.substr(0, str.length - 1);
    if (charset.match(/^gb/i) && navigator.userAgent.indexOf('Firefox') >= 0)
        str = str.replace('\u20AC', '\uFFFD'); // Hack for GB2312 in FX

    var handler = function(search) {
        var data = unescape(search.substr(10));
        data = data.replace(/&#[0-9]+;/g, '\xFF\xFD');
        var cache = data.split('+').map(function(x) {
            if (x.length != 2) {
                return '\xFF\xFD';
            } else {
                return x;
            }
        }).join('');
        if (callback)
            callback(cache);
    };

    var isIE = (navigator.userAgent.indexOf('Trident') >= 0);
    document.getElementById("u2b_ustr").value = str;
    converter.setAttribute("accept-charset", charset);
    converter.callback = function(event) {
        if (isIE) document.charset = 'utf-8';
        removeEventListener("message", converter.callback, false);
        converter.removeAttribute("locked");
        handler(event.data);
    }
    addEventListener("message", converter.callback, false);
    if (isIE) document.charset = charset;
    converter.submit();
}

