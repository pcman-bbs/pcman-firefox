// Terminal View

'use strict';

var EXPORTED_SYMBOLS = ["TermView"];

var uriColor = '#FF6600'; // color used to draw URI underline
var selectedStyle = 'rgba(49, 106, 197, 0.6)';

var termColors = [
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
    '#ffffff' // white
];

function TermView(listener) {
    this.listener = listener;
    this.topwin = listener.ui.getElementById("topwin");
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
            this.redraw(false); // do the redraw
            buf.changed = false;
        }
        if (buf.posChanged) { // cursor pos changed
            this.updateCursorPos();
            buf.posChanged = false;
        }
    },

    drawSelRect: function(ctx, x, y, w, h) {
        var tmp = ctx.fillStyle;
        ctx.fillStyle = selectedStyle;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = tmp;
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
        var fg = ch.getFg();
        var bg = ch.getBg();
        var ctx = this.ctx;
        ctx.save();

        if (ch.isLeadByte) { // first byte of DBCS char
            var cols = this.buf.cols;
            ++col;
            if (col < cols) {
                var ch2 = line[col]; // second byte of DBCS char
                // draw background color
                ctx.fillStyle = termColors[bg];
                var bg2 = ch2.getBg();
                if (bg == bg2) { // two bytes has the same bg
                    ctx.fillRect(x, y, chw * 2, chh);
                } else { // two bytes has different bg
                    ctx.fillRect(x, y, chw, chh); // lead byte
                    ctx.fillStyle = termColors[bg2];
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
                        var fg2 = ch2.getFg(); // fg of second byte
                        if (fg == fg2) { // two bytes have the same fg
                            if (visible1) { // first half is visible
                                if (visible2) // two bytes are all visible
                                    this.drawClippedChar(ctx, u, termColors[fg], x, y, chw2, x, y, chw2, chh);
                                else // only the first half is visible
                                    this.drawClippedChar(ctx, u, termColors[fg], x, y, chw2, x, y, chw, chh);
                            } else if (visible2) { // only the second half is visible
                                this.drawClippedChar(ctx, u, termColors[fg], x, y, chw2, x + chw, y, chw, chh);
                            }
                        } else {
                            // draw first half
                            if (visible1)
                                this.drawClippedChar(ctx, u, termColors[fg], x, y, chw2, x, y, chw, chh);
                            // draw second half
                            if (visible2)
                                this.drawClippedChar(ctx, u, termColors[fg2], x, y, chw2, x + chw, y, chw, chh);
                        }
                    }
                }
                // TODO: draw underline

                // draw selected color
                if (ch.isSelected)
                    this.drawSelRect(ctx, x, y, chw2, chh);

                line[col].needUpdate = false;
            }
        } else {
            ctx.fillStyle = termColors[bg];
            ctx.fillRect(x, y, chw, chh);
            // only draw visible chars to speed up
            if (ch.ch > ' ' && (!ch.blink || this.blinkShow))
                this.drawClippedChar(ctx, ch.ch, termColors[fg], x, y, chw, x, y, chw, chh);

            // TODO: draw underline

            // draw selected color
            if (ch.isSelected)
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
                        ctx.strokeStyle = uriColor;
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
        if (!e.target.value)
            return;
        var charset = this.listener.prefs.get('Encoding');
        this.listener.conn.convSend(e.target.value, charset);
        e.target.value = '';
    },

    onkeyDown: function(e) {
        var conn = this.listener.conn;

        // give keypress control back to Firefox
        if (!conn.socket.ws)
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
                    conn.send('\b');
                    break;
                case 9:
                    conn.send('\t');
                    // don't move input focus to next control
                    e.preventDefault();
                    e.stopPropagation();
                    break;
                case 13:
                    conn.send('\r');
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
                    conn.send('\x1b[D');
                    break;
                case 38: //Arrow Up
                    conn.send('\x1b[A');
                    break;
                case 39: //Arrow Right
                    conn.send('\x1b[C');
                    break;
                case 40: //Arrow Down
                    conn.send('\x1b[B');
                    break;
                case 45: //Insert
                    conn.send('\x1b[2~');
                    break;
                case 46: //DEL
                    conn.send('\x1b[3~');
                    break;
            }
        }
    },

    onResize: function() {
        this.canvas.height = this.topwin.clientHeight;
        var ctx = this.ctx;
        this.chh = Math.floor(this.canvas.height / 24);
        var font = this.chh + 'px monospace';
        ctx.font = font;
        ctx.textBaseline = 'top';

        var m = ctx.measureText('\u3000'); //全形空白
        this.chw = Math.round(m.width / 2);

        // if overflow, resize canvas again
        var overflowX = (this.chw * 80) - this.topwin.clientWidth;
        if (overflowX > 0) {
            this.canvas.width = this.topwin.clientWidth;
            this.chw = Math.floor(this.canvas.width / 80);
            this.chh = this.chw * 2; // is it necessary to measureText?
            font = this.chh + 'px monospace';
            ctx.font = font;
            this.canvas.height = this.chh * 24;
        }

        if (this.buf) {
            this.canvas.width = this.chw * this.buf.cols;
            // font needs to be reset after resizing canvas
            ctx.font = font;
            ctx.textBaseline = 'top';
            this.redraw(true);
        } else {
            this.canvas.width = this.chw * 80;
            // font needs to be reset after resizing canvas
            ctx.font = font;
            ctx.textBaseline = 'top';
        }

        var visible = this.cursorVisible;
        if (visible)
            this.hideCursor();

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

        // For compatibility of FX 10 and before
        this.onTextInput(e);
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
                ctx.fillStyle = termColors[fg];
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
                            ctx.strokeStyle = uriColor;
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
        return { col: col, row: row };
    },

    onMouseDown: function(event) {
        if (event.button == 0) { // left button
            var cursor = this.mouseToColRow(event.pageX, event.pageY);
            if (!cursor) return;
            // FIXME: only handle left button
            this.selection.selStart(event.shiftKey, cursor.col, cursor.row);
        }
    },

    onMouseMove: function(event) {
        var cursor = this.mouseToColRow(event.pageX, event.pageY);
        if (!cursor) return;

        // handle text selection
        if (this.selection.isSelecting)
            this.selection.selUpdate(cursor.col, cursor.row);

        // handle cursors for hyperlinks
        var col = cursor.col,
            row = cursor.row;
        var uris = this.buf.lines[row].uris;
        if (!uris) {
            this.canvas.style.cursor = "default";
            return;
        }
        for (var i = 0; i < uris.length; i++) {
            if (col >= uris[i][0] && col < uris[i][1]) { //@ < or <<
                this.canvas.style.cursor = "pointer";
                return
            }
        }
        this.canvas.style.cursor = "default";
    },

    onMouseUp: function(event) {
        if (event.button == 0) { // left button
            var cursor = this.mouseToColRow(event.pageX, event.pageY);
            if (!cursor) return;
            if (this.selection.isSelecting)
                this.selection.selEnd(cursor.col, cursor.row);
        }
    },

    onClick: function(event) {
        var cursor = this.mouseToColRow(event.pageX, event.pageY);
        if (!cursor) return;

        // Event dispatching order: mousedown -> mouseup -> click
        // For a common click, previous selection always collapses in mouseup
        if (this.selection.hasSelection()) return;

        var col = cursor.col,
            row = cursor.row;
        var uris = this.buf.lines[row].uris;
        if (!uris) return;
        for (var i = 0; i < uris.length; i++) {
            if (col >= uris[i][0] && col < uris[i][1]) { //@ < or <<
                var uri = "";
                for (var j = uris[i][0]; j < uris[i][1]; j++)
                    uri = uri + this.buf.lines[row][j].ch;
                this.listener.ui.openURI(uri);
            }
        }
    },

    onDblClick: function(event) {
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

    removeEventListener: function() {
        this.onCompositionEnd({ target: {} }); // Hide the input proxy
    }
};

