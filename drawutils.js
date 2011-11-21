// Utility functions making painting with Canvas easier

function fillTriangle(ctx, x1, y1, x2, y2, x3, y3) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.lineTo(x3,y3);
    ctx.fill();
    ctx.restore();
}

// http://www.unicode.org/cgi-bin/UnihanGrid.pl?codepoint=U+2581&useutf8=true
function tryDrawIdeograph(ctx, ch, x, y, w, h) {
    var code = ch.charCodeAt(0);
    // We can draw some idographic characters with specialized painting code
    // to make them prettier.
    if(code >= 0x2581 && code <= 0x258f) { // ▁▂▃▄▅▆▇█  ▏▎▍▌▋▊▉
        var idx;
        if(code < 0x2589) {
            idx = code - 0x2580;
            y += h;
            h *= (idx/8);
            y -= h;
        }
        else {
            idx = code - 0x2588; // 0x2589 is ▉
            // block width = (1 - idx/8) * cell width
            w *= ((8 - idx) / 8);
        }
        ctx.fillRect(x, y, w, h);
    }
    else if(code >= 0x25e2 && code <= 0x25e5) { // ◢◣◥◤
        var x1, y1, x2, y2, x3, y3;
        switch(code) {
        case 0x25e2: // ◢
            x1 = x;
            y1 = y + h;
            x2 = x + w;
            y2 = y1;
            x3 = x2;
            y3 = y;
            break;
        case 0x25e3: // ◣
            x1 = x;
            y1 = y;
            x2 = x;
            y2 = y + h;
            x3 = x + w;
            y3 = y2;
            break;
        case 0x25e4: // ◤
            x1 = x;
            y1 = y;
            x2 = x;
            y2 = y + h;
            x3 = x + w;
            y3 = y;
            break;
        case 0x25e5: // ◥
            x1 = x;
            y1 = y;
            x2 = x + w;
            y2 = y;
            x3 = x2;
            y3 = y + h;
            break;
        }
        fillTriangle(ctx, x1, y1, x2, y2, x3, y3);
    }
    /*else if(code == 0x25a0) { // ■  0x25fc and 0x25fe are also black square, but they're not used in big5.
        ctx.fillRect(x, y, w, h);
    }*/
    else
        return false;
    return true;
}

// draw unicode character with clipping
function drawClippedChar(ctx, unichar, style, x, y, maxw, clipx, clipy, clipw, cliph){
    ctx.save();
    ctx.beginPath();
    ctx.rect(clipx, clipy, clipw, cliph);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle=style;
    // if this character is a CJK ideographic character (填色方塊)
    if(!tryDrawIdeograph(ctx, unichar, x, y, maxw, cliph)) // FIXME: use cliph instead of expected height is not very good.
        ctx.fillText(unichar, x, y, maxw);
    ctx.restore();
}
