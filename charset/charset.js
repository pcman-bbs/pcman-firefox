function a2uCache(charset, callback, decode) {
    if (!callback)
        return;

    var byteArray = new Uint8Array((0xFFFF - 0x8001 + 1) * 3 - 1);
    var idx = -1;
    for (var code = 0x8001; code <= 0xFFFF; code++) {
        if (code % 0x100 < 0x40) { // not valid char
            if (idx > -1)
                byteArray[idx] = 0x20;
            byteArray[idx + 1] = 0xFF;
            byteArray[idx + 2] = 0xFD;
        } else {
            byteArray[idx] = 0x20;
            byteArray[idx + 1] = Math.floor(code / 0x100);
            byteArray[idx + 2] = code % 0x100;
        }
        idx += 3;
    }

    var handler = function(text) {
        callback(text.split(' ').map(function(x) {
            if (x.length != 1 || x.charCodeAt(0) < 0x81) {
                return '\xFF\xFD';
            } else {
                var code = x.charCodeAt(0);
                var strCode = [Math.floor(code / 0x100), code % 0x100];
                return String.fromCharCode(strCode[0], strCode[1]);
            }
        }).join(''));
    };

    if (decode)
        return handler(decode(byteArray, charset));

    var url = URL.createObjectURL(new Blob([byteArray], {
        "type": "text/plain"
    }));
    var req = new XMLHttpRequest();
    req.open("GET", url, true);
    req.overrideMimeType("text/plain;charset=" + charset);
    req.onreadystatechange = function(event) {
        if (req.readyState != 4)
            return;
        URL.revokeObjectURL(url);
        var text = req.response.replace(/[^ ]\x3F/g, '\xFF\xFD '); // For MSIE
        handler(text);
    };
    req.send();
}

function u2aCache(charset, callback, encode) {
    if (!callback)
        return;

    var str = '';
    for (var i = 0x81; i <= 0xFFFF; i++) {
        str += String.fromCharCode(i) + ' ';
    }
    str = str.slice(0, -1); // remove the last ' '

    if (encode) {
        var data = String.fromCharCode.apply(null, encode(str, charset));
        return callback(data.split(' ').map(function(x) {
            return (x.length != 2) ? '\xFF\xFD' : x;
        }).join(''));
    }

    var converter = document.getElementById("u2b_form");
    if (converter.hasAttribute("locked"))
        return setTimeout(function() {
            u2aCache(charset, callback);
        }, 500);
    converter.setAttribute("locked", "true");

    if (charset.match(/^gb/i) && navigator.userAgent.indexOf('Firefox') >= 0)
        str = str.replace('\u20AC', '\uFFFD'); // Hack for GB2312 in FX
    var isIE = (navigator.userAgent.indexOf('Trident') >= 0);
    document.getElementById("u2b_ustr").value = str;
    converter.setAttribute("accept-charset", charset);
    converter.callback = function(event) {
        if (isIE) document.charset = 'utf-8';
        removeEventListener("message", converter.callback, false);
        converter.removeAttribute("locked");
        var data = unescape(event.data.substr(10));
        data = data.replace(/&#[0-9]+;/g, '\xFF\xFD');
        callback(data.split('+').map(function(x) {
            return (x.length != 2) ? '\xFF\xFD' : x;
        }).join(''));
    }
    addEventListener("message", converter.callback, false);
    if (isIE) document.charset = charset;
    converter.submit();
}

if (typeof(module) == 'object') { // in Node.js environment
    module.exports = {
        a2uCache: a2uCache,
        u2aCache: u2aCache,
    };
}

