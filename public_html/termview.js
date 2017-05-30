// Terminal View

'use strict';

var EXPORTED_SYMBOLS = ["TermView"];

function TermView(listener) {
    this.listener = listener;
    this.topwin = listener.ui.getElementById("topwin");
    this.container = listener.ui.getElementById("box1");
    this.canvas = listener.ui.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.buf = null;

    // text selection
    this.selection = null;

    // Cursor
    this.cursorX = 0;
    this.cursorY = 0;
    this.cursorVisible = true; // false to hide the cursor
    this.cursorShow = false; // blinking state of cursor

    // Process the input events
    this.input = listener.ui.getElementById("input_proxy");
    this.input.focus();
    this.isComposing = false; // Fix for FX 12+

    // initialize
    var ctx = this.ctx;
    ctx.fillStyle = "#c0c0c0";
    this.onResize();

    this.complementary = false;
    this.complementaryColor = this.complementary;
    //TODO: set the colors in prefs system
    this.colors = [
        // dark
        '#000000', // black
        '#800000', // red
        '#008000', // green
        '#808000', // yellow
        '#000080', // blue
        '#800080', // magenta
        '#008080', // cyan
        '#c0c0c0', // light gray
        // bright
        '#808080', // gray
        '#ff0000', // red
        '#00ff00', // green
        '#ffff00', // yellow
        '#0000ff', // blue
        '#ff00ff', // magenta
        '#00ffff', // cyan
        '#ffffff', // white

        // complementary color
        // dark
        '#FFFFFF', // to black
        '#7FFFFF', // to red
        '#FF7FFF', // to green
        '#7F7FFF', // to yellow
        '#FFFF7F', // to blue
        '#7FFF7F', // to magenta
        '#FF7F7F', // to cyan
        '#3F3F3F', // to light gray
        // bright
        '#7F7F7F', // to gray
        '#00FFFF', // to red
        '#FF00FF', // to green
        '#0000FF', // to yellow
        '#FFFF00', // to blue
        '#00FF00', // to magenta
        '#FF0000', // to cyan
        '#000000', // to white

        // preserved
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',

        '#FF6600', // color used to draw URI underline
        'rgba(49, 106, 197, 0.6)', // selectedStyle
        '#008000' // highlightColor
    ];

    var _this = this;
    this.blinkTimeout = listener.ui.setTimer(true, function() {
        _this.onBlink();
    }, 600);
}

TermView.prototype = {
    conv: null,

    /* update the canvas to reflect the change in TermBuf */
    update: function() {
        var buf = this.buf;
        if (buf.changed) { // content of TermBuf changed
            buf.updateCharAttr(); // prepare TermBuf
            this.getURI(); // update the link hover
            this.redraw(false); // do the redraw
            buf.changed = false;
        }
        if (buf.posChanged) { // cursor pos changed
            this.updateCursorPos();
            buf.posChanged = false;
        }
    },

    getFg: function(row, ch, ch2) {
        var fg = ch2 ? ch2.getFg() : ch.getFg();
        return (ch.isSelected && this.complementaryColor) ? fg + 16 : fg;
    },

    getBg: function(row, ch, ch2) {
        if (row == this.listener.mouseBrowsing.nowHighlight)
            return 42; // highlightColor
        var bg = ch2 ? ch2.getBg() : ch.getBg();
        return (ch.isSelected && this.complementaryColor) ? bg + 16 : bg;
    },

    drawSelRect: function(ctx, x, y, w, h) {
        var tmp = ctx.fillStyle;
        ctx.fillStyle = this.colors[41];
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = tmp;
    },

    drawHighlight: function(oldRow, row) {
        if (oldRow >= 0) {
            var line = this.buf.lines[oldRow];
            for (var i = 0; i < this.buf.cols; ++i)
                line[i].needUpdate = true;
        }
        if (row >= 0) {
            var line = this.buf.lines[row];
            for (var i = 0; i < this.buf.cols; ++i)
                line[i].needUpdate = true;
        }
        if (!this.buf.changed)
            this.redraw(false);
    },

    drawChar: function(row, col, x, y) {
        var line = this.buf.lines[row];
        if (line) {
            var ch = line[col];
            this.doDrawChar(line, ch, row, col, x, y);
        }
    },

    // http://www.unicode.org/cgi-bin/UnihanGrid.pl?codepoint=U+2581&useutf8=true
    tryDrawIdeograph: function(ctx, ch, x, y, w, h) {
        var code = ch.charCodeAt(0);
        // We can draw some idographic characters with specialized painting code
        // to make them prettier.
        if (code >= 0x2581 && code <= 0x258f) { // ▁▂▃▄▅▆▇█  ▏▎▍▌▋▊▉
            var idx;
            if (code < 0x2589) {
                idx = code - 0x2580;
                y += h;
                h *= (idx / 8);
                y -= h;
            } else {
                idx = code - 0x2588; // 0x2589 is ▉
                // block width = (1 - idx/8) * cell width
                w *= ((8 - idx) / 8);
            }
            ctx.fillRect(x, y, w, h);
        } else if (code >= 0x25e2 && code <= 0x25e5) { // ◢◣◥◤
            var x1, y1, x2, y2, x3, y3;
            switch (code) {
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
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.fill();
            ctx.restore();
        } else if (code == 0x25a0) { // ■  0x25fc and 0x25fe are also black square, but they're not used in big5.
            //ctx.fillRect(x, y, w, h);
            return false;
        } else
            return false;
        return true;
    },

    drawClippedChar: function(ctx, unichar, style, x, y, maxw, clipx, clipy, clipw, cliph) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(clipx, clipy, clipw, cliph);
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = style;
        // if this character is a CJK ideographic character (填色方塊)
        if (!this.tryDrawIdeograph(ctx, unichar, x, y, maxw, cliph)) // FIXME: use cliph instead of expected height is not very good.
            ctx.fillText(unichar, x, y, maxw);
        ctx.restore();
    },

    doDrawChar: function(line, ch, row, col, x, y) {
        var chw = this.chw;
        var chh = this.chh;
        if (!ch.isLeadByte) {
            // if this is second byte of DBCS char, draw the first byte together.
            if (col >= 1 && line[col - 1].isLeadByte) {
                --col;
                x -= chw;
                ch = line[col];
            }
        }
        var fg = this.getFg(row, ch);
        var bg = this.getBg(row, ch);
        var ctx = this.ctx;
        ctx.save();

        if (ch.isLeadByte) { // first byte of DBCS char
            var cols = this.buf.cols;
            ++col;
            if (col < cols) {
                var ch2 = line[col]; // second byte of DBCS char
                // draw background color
                ctx.fillStyle = this.colors[bg];
                var bg2 = this.getBg(row, ch, ch2);
                if (bg == bg2) { // two bytes has the same bg
                    ctx.fillRect(x, y, chw * 2, chh);
                } else { // two bytes has different bg
                    ctx.fillRect(x, y, chw, chh); // lead byte
                    ctx.fillStyle = this.colors[bg2];
                    ctx.fillRect(x + chw, y, chw, chh); // second byte
                }
                // draw text
                var chw2 = chw * 2;
                // blinking text needs to be hidden sometimes
                var visible1 = (!ch.blink || this.blinkShow); // ch1 is visible
                var visible2 = (!ch2.blink || this.blinkShow); // ch2 is visible
                // don't draw hidden text
                if (visible1 || visible2) { // at least one of the two bytes should be visible
                    var b5 = ch.ch + ch2.ch; // convert char to UTF-8 before drawing
                    var charset = this.listener.prefs.get('Encoding');
                    var u = this.conv.convertStringToUTF8(b5, charset, true); // UTF-8

                    if (u) { // ch can be converted to valid UTF-8
                        var fg2 = this.getFg(row, ch, ch2); // fg of second byte
                        if (fg == fg2) { // two bytes have the same fg
                            if (visible1) { // first half is visible
                                if (visible2) // two bytes are all visible
                                    this.drawClippedChar(ctx, u, this.colors[fg], x, y, chw2, x, y, chw2, chh);
                                else // only the first half is visible
                                    this.drawClippedChar(ctx, u, this.colors[fg], x, y, chw2, x, y, chw, chh);
                            } else if (visible2) { // only the second half is visible
                                this.drawClippedChar(ctx, u, this.colors[fg], x, y, chw2, x + chw, y, chw, chh);
                            }
                        } else {
                            // draw first half
                            if (visible1)
                                this.drawClippedChar(ctx, u, this.colors[fg], x, y, chw2, x, y, chw, chh);
                            // draw second half
                            if (visible2)
                                this.drawClippedChar(ctx, u, this.colors[fg2], x, y, chw2, x + chw, y, chw, chh);
                        }
                    }
                }
                // TODO: draw underline

                // draw selected color
                if (ch.isSelected && !this.complementaryColor)
                    this.drawSelRect(ctx, x, y, chw2, chh);

                line[col].needUpdate = false;
            }
        } else {
            ctx.fillStyle = this.colors[bg];
            ctx.fillRect(x, y, chw, chh);
            // only draw visible chars to speed up
            if (ch.ch > ' ' && (!ch.blink || this.blinkShow))
                this.drawClippedChar(ctx, ch.ch, this.colors[fg], x, y, chw, x, y, chw, chh);

            // TODO: draw underline

            // draw selected color
            if (ch.isSelected && !this.complementaryColor)
                this.drawSelRect(ctx, x, y, chw, chh);
        }
        ctx.restore();
        ch.needUpdate = false;
    },

    redraw: function(force) {
        var cursorShow = this.cursorShow;
        if (cursorShow)
            this.hideCursor();

        var cols = this.buf.cols;
        var rows = this.buf.rows;
        var ctx = this.ctx;

        var lines = this.buf.lines;

        for (var row = 0; row < rows; ++row) {
            var chh = this.chh;
            var y = row * chh;
            var x = 0;
            var line = lines[row];
            var lineUpdated = false;
            var chw = this.chw;
            for (var col = 0; col < cols;) {
                var ch = line[col];
                if (force || ch.needUpdate) {
                    this.doDrawChar(line, ch, row, col, x, y);
                    lineUpdated = true;
                }

                if (ch.isLeadByte) {
                    col += 2;
                    x += chw * 2;
                } else {
                    ++col;
                    x += chw;
                }
            }

            // draw underline for links
            if (lineUpdated) {
                var uris = line.uris;
                if (uris) {
                    for (var i = 0; i < uris.length; i++) {
                        ctx.save();
                        ctx.strokeStyle = this.colors[40];
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.lineTo(uris[i][0] * chw, y + chh - 1);
                        ctx.lineTo(uris[i][1] * chw, y + chh - 1);
                        ctx.stroke();
                        ctx.restore();
                    }
                }
                lineUpdated = false;
            }
        }
        if (cursorShow)
            this.showCursor();
    },

    onTextInput: function(e) {
        if (this.isComposing) // Fix for FX 12+; use e.isComposing in FX 31+
            return;
        if (!this.input.value)
            return;
        var charset = this.listener.prefs.get('Encoding');
        this.listener.conn.convSend(this.input.value, charset);
        this.input.value = '';
    },

    onkeyDown: function(e) {
        var conn = this.listener.conn;

        // give keypress control back to Firefox
        if (!conn.isConnected)
            return;

        if (this.listener.robot.downloadArticle.stopDownload())
            return;

        // Don't handle Shift Ctrl Alt keys for speed
        if (e.keyCode > 15 && e.keyCode < 19) return;

        // Control characters
        if (e.ctrlKey && !e.altKey && !e.shiftKey) {
            if (e.keyCode >= 65 && e.keyCode <= 90) { // A-Z
                if (e.keyCode == 67 && this.selection.hasSelection())
                    conn.listener.copy(); // ctrl+c
                else
                    conn.send(String.fromCharCode(e.keyCode - 64));
            } else if (e.keyCode >= 219 && e.keyCode <= 221) { // [ \ ]
                conn.send(String.fromCharCode(e.keyCode - 192));
            } else return; // don't stopPropagation
            e.preventDefault();
            e.stopPropagation();
        } else if (e.ctrlKey && !e.altKey && e.shiftKey) {
            switch (e.keyCode) {
                case 50: // @
                    conn.send(String.fromCharCode(0));
                    break;
                case 54: // ^
                    conn.send(String.fromCharCode(30));
                    break;
                case 109: // _
                    conn.send(String.fromCharCode(31));
                    break;
                case 191: // ?
                    conn.send(String.fromCharCode(127));
                    break;
                case 65: // ctrl+shift+a
                case 97: // ctrl+shift+A
                    conn.listener.selAll();
                    break;
                case 86: // ctrl+shift+v
                case 118: // ctrl+shift+V
                    conn.listener.paste();
                    break;
                default:
                    return; // don't stopPropagation
            }
            e.preventDefault();
            e.stopPropagation();
        } else if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
            switch (e.keyCode) {
                case 8:
                    conn.send(this.detectDBCS(true, '\b'));
                    break;
                case 9:
                    conn.send('\t');
                    // don't move input focus to next control
                    e.preventDefault();
                    e.stopPropagation();
                    break;
                case 13: //Enter, only xul need it
                    if (this.input.tagName == 'textbox') //TODO: find better way
                        conn.send(this.listener.prefs.get('EnterKey'));
                    break;
                case 27: //ESC
                    conn.send('\x1b');
                    break;
                case 33: //Page Up
                    conn.send('\x1b[5~');
                    break;
                case 34: //Page Down
                    conn.send('\x1b[6~');
                    break;
                case 35: //End
                    conn.send('\x1b[4~');
                    break;
                case 36: //Home
                    conn.send('\x1b[1~');
                    break;
                case 37: //Arrow Left
                    conn.send(this.detectDBCS(true, '\x1b[D'));
                    break;
                case 38: //Arrow Up
                    conn.send('\x1b[A');
                    break;
                case 39: //Arrow Right
                    conn.send(this.detectDBCS(false, '\x1b[C'));
                    break;
                case 40: //Arrow Down
                    conn.send('\x1b[B');
                    break;
                case 45: //Insert
                    conn.send('\x1b[2~');
                    break;
                case 46: //DEL
                    conn.send(this.detectDBCS(false, '\x1b[3~'));
                    break;
            }
        }
    },

    detectDBCS: function(back, key) {
        if (!this.listener.prefs.get('DetectDBCS') || !this.buf)
            return key;
        var line = this.buf.lines[this.buf.curY];
        if (back && this.buf.curX > 1)
            return line[this.buf.curX - 2].isLeadByte ? key + key : key;
        if (!back && this.buf.curX < this.buf.cols)
            return line[this.buf.curX].isLeadByte ? key + key : key;
        return key;
    },

    onResize: function() {
        var visible = this.cursorVisible;
        if (visible)
            this.hideCursor();

        var cols = this.buf ? this.buf.cols : 80;
        var rows = this.buf ? this.buf.rows : 24;
        this.topwin.style.height = this.listener.global.innerHeight + 'px';
        this.container.style.height = this.topwin.style.height;
        this.canvas.height = this.topwin.clientHeight;
        this.chh = Math.floor(this.canvas.height / rows);
        var ctx = this.ctx;
        var fontFamily = 'monospace';
        var textBaseline = 'top';
        ctx.font = this.chh + 'px ' + fontFamily;
        ctx.textBaseline = textBaseline;

        // test whether the monospace font is suitable for BBS
        var m = ctx.measureText('\u25cf'); //black circle
        if (m.width < 0.75 * this.chh) { // Not a chinese font
            fontFamily = 'MingLiU, ' + fontFamily; //FIXME: font in non-Windows
            ctx.font = this.chh + 'px ' + fontFamily;
        }

        m = ctx.measureText('\u3000'); //全形空白
        this.chw = Math.round(m.width / 2);

        // if overflow, resize canvas again
        if (this.chw * cols > this.topwin.clientWidth) {
            this.canvas.width = this.topwin.clientWidth;
            this.chw = Math.floor(this.canvas.width / cols);
            this.chh = this.chw * 2; // is it necessary to measureText?
            ctx.font = this.chh + 'px ' + fontFamily;
        }

        // Fix the blur from page zooming partially and vertical word stretch
        var ratio = this.listener.ui.getDevicePixelRatio();
        var left = this.listener.prefs.get('HAlignCenter') ?
            ((this.topwin.clientWidth - this.chw * cols) / 2) : 0;
        this.canvas.width = this.chw * cols * ratio;
        this.canvas.style.width = (this.chw * cols) + 'px';
        this.canvas.style.left = left + 'px';
        var top = this.listener.prefs.get('VAlignCenter') ?
            ((this.topwin.clientHeight - this.chh * rows) / 2) : 0;
        this.canvas.height = this.chh * rows * ratio;
        this.canvas.style.height = (this.chh * rows) + 'px';
        this.canvas.style.top = top + 'px';

        // font needs to be reset after resizing canvas
        ctx.font = this.chh + 'px ' + fontFamily;
        ctx.textBaseline = textBaseline;
        ctx.scale(ratio, ratio);
        if (this.buf)
            this.redraw(true);

        this.updateCursorPos();
        // should we set cursor height according to chh?
        this.setCursorSize(this.chw, 2);

        if (visible)
            this.showCursor();
    },

    // Cursor
    setCursorSize: function(w, h) {
        var visible = this.cursorVisible;
        if (visible)
            this.hideCursor();
        this.cursorW = w;
        this.cursorH = h;
        if (visible)
            this.showCursor();
    },

    updateCursorPos: function() {
        var visible = this.cursorVisible;
        if (visible)
            this.hideCursor();
        if (this.buf) {
            this.cursorX = this.buf.curX * this.chw;
            this.cursorY = (this.buf.curY + 1) * this.chh - this.cursorH;
        } else {
            this.cursorX = 0;
            this.cursorY = this.chh - this.cursorH;
        }
        if (visible)
            this.showCursor();
    },

    onCompositionStart: function(e) {
        var top = (this.buf.curY + 1) * this.chh;
        this.input.style.top = (this.canvas.offsetTop + (top + this.input.clientHeight > this.canvas.clientHeight ? top - this.input.clientHeight : top)) + 'px';
        this.input.style.left = (this.canvas.offsetLeft + this.buf.curX * this.chw) + 'px';
        this.isComposing = true; // Fix for FX 12+
    },

    onCompositionEnd: function(e) {
        this.input.style.top = '-100px';
        this.isComposing = false; // Fix for FX 12+

        // For compatibility of IE and FX 10-
        if (!e)
            return;
        var _this = this;
        this.listener.ui.setTimer(false, function() {
            _this.onTextInput(e);
        }, 100); // Make sure another onTextInput in GC clear this.input
    },

    onBlink: function() {
        this.blinkShow = !this.blinkShow;
        var buf = this.buf;

        // redraw the canvas first if needed
        if (buf.changed)
            this.update();

        var col, cols = buf.cols;
        var row, rows = buf.rows;
        var lines = buf.lines;

        // FIXME: draw blinking characters
        for (row = 0; row < rows; ++row) {
            var line = lines[row];
            for (col = 0; col < cols; ++col) {
                var ch = line[col];
                if (ch.blink)
                    ch.needUpdate = true;
                // two bytes of DBCS chars need to be updated together
                if (ch.isLeadByte) {
                    ++col;
                    if (ch.blink)
                        line[col].needUpdate = true;
                    // only second byte is blinking
                    else if (line[col].blink) {
                        ch.needUpdate = true;
                        line[col].needUpdate = true;
                    }
                }
            }
        }
        this.redraw(false);

        if (this.cursorVisible) {
            this.cursorShow = !this.cursorShow;
            this.drawCursor();
        }
    },

    showCursor: function() {
        this.cursorVisible = true;
        if (!this.cursorShow) {
            this.cursorShow = true;
            this.drawCursor();
        }
    },

    hideCursor: function() {
        if (this.cursorShow) { // the cursor is currently shown
            this.cursorShow = false;
            this.drawCursor();
        }
        this.cursorVisible = false;
    },

    drawCursor: function() {
        if (this.chh == 0 || this.chw == 0)
            return;

        var ctx = this.ctx;
        var row = Math.floor(this.cursorY / this.chh);
        var col = Math.floor(this.cursorX / this.chw);

        // Some BBS allow the cursor outside the screen range
        if (this.buf && this.buf.cols == col)
            return;

        if (this.cursorShow) {
            if (this.buf) {
                var line = this.buf.lines[row];
                if (!line)
                    return;
                var ch = line[col];
                var fg = ch.getFg();
                ctx.save();
                ctx.fillStyle = this.colors[fg];
                ctx.fillRect(this.cursorX, this.cursorY, this.cursorW, this.cursorH);
                ctx.restore();
            } else {

            }
        } else {
            if (this.buf) {
                var line = this.buf.lines[row];
                if (!line)
                    return;
                var ch = line[col];
                if (!ch.needUpdate)
                    this.doDrawChar(line, ch, row, col, this.cursorX, row * this.chh);
                if (line.uris) { // has URI in this line
                    var n = line.uris.length;
                    for (var i = 0; i < n; ++i) {
                        var uri = line.uris[i];
                        if (uri[0] <= col && uri[1] > col) { // the char is part of a URI
                            // draw underline for URI.
                            ctx.strokeStyle = this.colors[40];
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            var y = (row + 1) * this.chh - 1;
                            var x = col * this.chw;
                            ctx.lineTo(x, y);
                            ctx.lineTo(x + this.chw, y);
                            ctx.stroke();
                        }
                    }
                }
            } else {

            }
        }
    },

    // convert mouse pointer position (x, y) to (col, row)
    mouseToColRow: function(cX, cY) {
        var x = cX - this.canvas.offsetLeft;
        var y = cY - this.canvas.offsetTop;
        var col = Math.floor(x / this.chw);
        var row = Math.floor(y / this.chh);

        if (col < 0)
            col = 0;
        else if (col > this.buf.cols)
            col = this.buf.cols;

        if (row < 0)
            row = 0;
        else if (row >= this.buf.rows)
            row = this.buf.rows - 1;

        // FIXME: we shouldn't select half of a DBCS character
        return {
            col: col,
            row: row
        };
    },

    getURI: function(cursor) {
        if (cursor)
            this.cursor = cursor;
        if (!this.cursor)
            return;
        var col = this.cursor.col;
        var row = this.cursor.row;
        var uris = this.buf.lines[row].uris;
        if (!uris) uris = [];
        for (var i = 0; i < uris.length; i++) {
            if (col >= uris[i][0] && col < uris[i][1]) { //@ < or <<
                var uri = '';
                for (var j = uris[i][0]; j < uris[i][1]; j++)
                    uri += this.buf.lines[row][j].ch;
                this.setHover(row, uris[i][0], uris[i][1], uri);
                return uri;
            }
        }
        this.setHover(-1);
        return '';
    },

    setHover: function(row, colStart, colEnd, uri) { //FIXME: low performance
        var hover = this.listener.ui.getElementById('linkhover');
        if (row < 0) {
            hover.style.display = 'none';
            return;
        }
        if (!hover.onclick) {
            hover.onclick = function(event) {
                if (!event.ctrlKey && !event.altKey && !event.shiftKey && event.button != 1)
                    event.preventDefault(); // let this.onClick handle it
                else
                    event.stopPropagation(); // don't execute this.onClick
            };
        }
        hover.style.display = 'block';
        hover.style.left = (colStart * this.chw + this.canvas.offsetLeft) + 'px';
        hover.style.top = (row * this.chh + this.canvas.offsetTop) + 'px';
        hover.style.width = ((colEnd - colStart) * this.chw) + 'px';
        hover.style.height = this.chh + 'px';
        hover.href = uri;
    },

    onMouseDown: function(event) {
        if (event.button == 0) { // left button
            var cursor = this.mouseToColRow(event.pageX, event.pageY);
            if (!cursor) return;
            // FIXME: only handle left button
            this.selection.selStart(event.shiftKey, cursor.col, cursor.row);
            this.complementaryColor = (this.complementary != event.ctrlKey);
        }
    },

    onMouseMove: function(event) {
        var cursor = this.mouseToColRow(event.pageX, event.pageY);
        if (!cursor) return;

        // handle text selection
        if (this.selection.isSelecting)
            this.selection.selUpdate(cursor.col, cursor.row);

        // handle cursors for hyperlinks
        var uri = this.getURI(cursor);
        //this.canvas.style.cursor = uri ? "pointer" : "default";

        this.listener.mouseBrowsing.onMouseMove(cursor, uri);
    },

    onMouseUp: function(event) {
        var cursor = this.mouseToColRow(event.pageX, event.pageY);
        if (!cursor) return;
        if (event.button == 0) { // left button
            if (this.selection.isSelecting)
                this.selection.selEnd(cursor.col, cursor.row);
        } else if (event.button == 1) { // middle button
            if (this.getURI(cursor))
                return; // let onClick handle it
            else if (this.listener.mouseBrowsing.onMouseUp())
                return; // let mouseBrowsing handle it
            if (this.listener.prefs.get('PasteAsMidClick'))
                this.listener.paste();
        }
    },

    onClick: function(event) {
        var cursor = this.mouseToColRow(event.pageX, event.pageY);
        if (!cursor) return;

        // Event dispatching order: mousedown -> mouseup -> click
        // For a common click, previous selection always collapses in mouseup
        if (this.selection.hasSelection()) {
            this.selection.isSelected = true;
            return;
        }

        var uri = this.getURI(cursor);
        if (uri && event.button == 0)
            this.listener.ui.openURI(uri, this.listener.prefs.get('NewTab'));
        else if (!uri && event.button == 0 && !this.selection.isSelected)
            this.listener.mouseBrowsing.onClick();

        //FIXME: malfunction if selection is canceled by javascript
        this.selection.isSelected = false;
    },

    onDblClick: function(event) {
        if (this.listener.mouseBrowsing.onDblClick(event.button))
            return;

        var cursor = this.mouseToColRow(event.pageX, event.pageY);
        if (!cursor) return;
        this.selection.selectWordAt(cursor.col, cursor.row);
    },

    updateSel: function(force) {
        if (!force && this.buf.changed) // we're in the middle of screen update
            return;

        var col, row;
        var cols = this.buf.cols;
        var rows = this.buf.rows;
        var lines = this.buf.lines;

        for (row = 0; row < rows; ++row) {
            for (col = 0; col < cols; ++col) {
                var ch = lines[row][col];
                var is_sel = this.selection.isCharSelected(col, row);
                if (is_sel != ch.isSelected) {
                    ch.isSelected = is_sel;
                    ch.needUpdate = true;
                }
            }
        }
        if (!this.buf.changed)
            this.redraw(false);
    },

    onClose: function() {
        // added by Hemiola SUN 
        this.blinkTimeout.cancel();

        this.onCompositionEnd(); // Hide the input proxy
    }
};
