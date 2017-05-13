// Terminal Screen Buffer, displayed by TermView

'use strict';

var EXPORTED_SYMBOLS = ["TermBuf"];

function TermChar(ch) {
    this.ch = ch;
    this.resetAttr();
    this.needUpdate = false;
    this.isLeadByte = false;
    this.isSelected = false;
}

TermChar.prototype = {
    copyFrom: function(attr) {
        this.ch = attr.ch;
        this.isLeadByte = attr.isLeadByte;
        this.copyAttr(attr);
    },
    copyAttr: function(attr) {
        this.fg = attr.fg;
        this.bg = attr.bg;
        this.bright = attr.bright;
        this.invert = attr.invert;
        this.blink = attr.blink;
        this.underLine = attr.underLine;
    },
    resetAttr: function() {
        this.fg = 7;
        this.bg = 0;
        this.bright = false;
        this.invert = false;
        this.blink = false;
        this.underLine = false;
    },
    getFg: function() {
        if (this.invert)
            return this.bg;
        return this.bright ? (this.fg + 8) : this.fg;
    },
    getBg: function() {
        return this.invert ? this.fg : this.bg;
    }
};

function TermBuf(listener) {
    this.listener = listener;
    this.listener.view.buf = this;
    // numbers of columns and rows
    var cols = this.listener.prefs.get('Cols');
    var rows = this.listener.prefs.get('Rows');
    this.cols = cols;
    this.rows = rows;
    // curcor position
    this.curX = 0;
    this.curY = 0;
    // scroll region
    this.top = 0;
    this.bottom = rows - 1;
    // current character attribute
    this.attr = new TermChar(' ');
    // default chracter attribute
    this.newChar = new TermChar(' ');
    this.changed = false;
    this.posChanged = false;
    // the buffer
    this.lines = new Array(rows);
    while (--rows >= 0) {
        var line = new Array(cols);
        var c = cols;
        while (--c >= 0) {
            line[c] = new TermChar(' ');
        }
        this.lines[rows] = line;
    }
}

TermBuf.prototype = {
    // From: http://snippets.dzone.com/posts/show/452
    // Modified by Hemiola
    uriRegEx: /(ftp|http|https|telnet):\/\/(\w+:{0,1}\w*@)?([\w\.]+)(:[0-9]+)?([\w#!;:.,\(\)?+=&%@!~\-\/])*/ig,

    puts: function(str) {
        if (!str)
            return;
        var cols = this.cols;
        var rows = this.rows;
        var lines = this.lines;
        var n = str.length;
        var line = lines[this.curY];
        for (var i = 0; i < n; ++i) {
            var ch = str[i];
            switch (ch) {
                case '\x07':
                    this.listener.robot.popupMsg.alert();
                    continue;
                case '\b':
                    this.back();
                    continue;
                case '\r':
                    this.carriageReturn();
                    continue;
                case '\n':
                    this.lineFeed();
                    line = lines[this.curY];
                    continue;
                case '\0':
                    continue;
            }
            if (ch < ' ')
                this.listener.ui.debug('Unhandled invisible char' + ch.charCodeAt(0) + '\n');

            if (this.curX >= cols) {
                // next line
                if (this.listener.prefs.get('LineFeed'))
                    this.lineFeed(); // some poor-designed bbs don't need it
                this.curX = 0;
                line = lines[this.curY];
                this.posChanged = true;
            }
            switch (ch) {
                case '\t':
                    this.tab();
                    break;
                default:
                    var ch2 = line[this.curX];

                    // avoid the residues of incorrect DBCS chars for some BBS
                    if (ch2.isLeadByte)
                        line[this.curX + 1].needUpdate = true;

                    ch2.ch = ch;
                    ch2.copyAttr(this.attr);
                    ch2.needUpdate = true;
                    ++this.curX;
                    this.changed = true;
                    this.posChanged = true;
            }
        }
    },

    updateCharAttr: function() {
        var cols = this.cols;
        var rows = this.rows;
        var lines = this.lines;
        var needUpdate = [];
        for (var row = 0; row < rows; ++row) {
            var line = lines[row];
            needUpdate[row] = false;
            for (var col = 0; col < cols; ++col) {
                var ch = line[col];
                if (ch.needUpdate)
                    needUpdate[row] = true;
                // all chars > ASCII code are regarded as lead byte of DBCS.
                // FIXME: this is not correct, but works most of the times.
                if (ch.ch.charCodeAt(0) > 128 && (col + 1) < cols) {
                    ch.isLeadByte = true;
                    ++col;
                    var ch0 = ch;
                    ch = line[col];
                    if (ch.needUpdate)
                        needUpdate[row] = true;
                    // ensure simutaneous redraw of both bytes
                    if (ch0.needUpdate != ch.needUpdate) {
                        ch0.needUpdate = ch.needUpdate = true;
                    }
                }
                ch.isLeadByte = false;
            }

            if (needUpdate[row]) { // this line has been changed
                // perform URI detection again
                // remove all previously cached uri positions
                if (line.uris) {
                    var uris = line.uris;
                    var nuris = uris.length;
                    // FIXME: this is inefficient
                    for (var iuri = 0; iuri < nuris; ++iuri) {
                        var uri = uris[iuri];
                        for (var col = uri[0]; col < uri[1]; ++col)
                            line[col].needUpdate = true;
                    }
                    line.uris = null;
                }
                var s = '';
                for (var col = 0; col < cols; ++col)
                    s += line[col].ch;
                var res;
                var uris = null;
                // pairs of URI start and end positions are stored in line.uri.
                while ((res = this.uriRegEx.exec(s)) != null) {
                    if (!uris) uris = new Array();
                    var uri = [res.index, res.index + res[0].length];
                    uris.push(uri);
                }
                if (uris) {
                    line.uris = uris;
                }

                if (this.listener.conn.isConnected)
                    this.listener.robot.lineUpdated(row);
            }
        }
        this.listener.mouseBrowsing.setPageState(needUpdate);

        if (this.listener.view.selection.hasSelection())
            this.listener.view.selection.refreshSel();
    },

    clear: function(param) {
        var rows = this.rows;
        var cols = this.cols;
        var lines = this.lines;

        switch (param) {
            case 0:
                var line = lines[this.curY];
                var col, row;
                for (col = this.curX; col < cols; ++col) {
                    line[col].copyFrom(this.newChar);
                    line[col].needUpdate = true;
                }
                for (row = this.curY; row < rows; ++row) {
                    line = lines[row];
                    for (col = 0; col < cols; ++col) {
                        line[col].copyFrom(this.newChar);
                        line[col].needUpdate = true;
                    }
                }
                break;
            case 1:
                var line;
                var col, row;
                for (row = 0; row < this.curY; ++row) {
                    line = lines[row];
                    for (col = 0; col < cols; ++col) {
                        line[col].copyFrom(this.newChar);
                        line[col].needUpdate = true;
                    }
                }
                line = lines[this.curY];
                for (col = 0; col < this.curX; ++col) {
                    line[col].copyFrom(this.newChar);
                    line[col].needUpdate = true;
                }
                break;
            case 2:
                while (--rows >= 0) {
                    var col = cols;
                    var line = lines[rows];
                    while (--col >= 0) {
                        line[col].copyFrom(this.newChar);
                        line[col].needUpdate = true;
                    }
                }
                break;
        }
        this.changed = true;
        this.gotoPos(0, 0);
    },

    back: function() {
        if (this.curX > 0) {
            --this.curX;
            this.posChanged = true;
        }
    },

    tab: function(num) {
        var mod = this.curX % 4;
        this.curX += 4 - mod;
        if (num && num > 1)
            this.curX += 4 * (num - 1);
        if (this.curX >= this.cols)
            this.curX = this.cols - 1;
        this.posChanged = true;
    },

    backTab: function(num) {
        var mod = this.curX % 4;
        this.curX -= (mod > 0 ? mod : 4);
        if (num > 1)
            this.curX -= 4 * (num - 1);
        if (this.curX < 0)
            this.curX = 0;
        this.posChanged = true;
    },

    insert: function(num) {
        var line = this.lines[this.curY];
        var cols = this.cols;
        var curX = this.curX;
        if (curX > 0 && line[curX - 1].isLeadByte)
            ++curX;
        if (curX >= cols)
            return;
        if (curX + num >= cols) {
            for (var col = curX; col < cols; ++col) {
                line[col].copyFrom(this.newChar);
                line[col].needUpdate = true;
            }
        } else {
            while (--num >= 0) {
                var ch = line.pop();
                line.splice(curX, 0, ch);
                ch.copyFrom(this.newChar);
            }
            for (var col = curX; col < cols; ++col)
                line[col].needUpdate = true;
        }
        this.changed = true;
    },

    del: function(num) {
        var line = this.lines[this.curY];
        var cols = this.cols;
        var curX = this.curX;
        if (curX > 0 && line[curX - 1].isLeadByte)
            ++curX;
        if (curX >= cols)
            return;
        if (curX + num >= cols) {
            for (var col = curX; col < cols; ++col) {
                line[col].copyFrom(this.newChar);
                line[col].needUpdate = true;
            }
        } else {
            var n = cols - curX - num;
            while (--n >= 0)
                line.splice(curX, 0, line.pop());
            for (var col = cols - num; col < cols; ++col)
                line[col].copyFrom(this.newChar);
            for (var col = curX; col < cols; ++col)
                line[col].needUpdate = true;
        }
        this.changed = true;
    },

    eraseChar: function(num) {
        var line = this.lines[this.curY];
        var cols = this.cols;
        var curX = this.curX;
        if (curX > 0 && line[curX - 1].isLeadByte) ++curX;
        if (curX == cols) return;
        var n = (curX + param > cols) ? cols : curX + num;
        for (var col = curX; col < n; ++col) {
            line[col].copyFrom(this.newChar);
            line[col].needUpdate = true;
        }
        this.changed = true;
    },

    eraseLine: function(param) {
        var line = this.lines[this.curY];
        var cols = this.cols;
        switch (param) {
            case 0: // erase to right
                for (var col = this.curX; col < cols; ++col) {
                    line[col].copyFrom(this.newChar);
                    line[col].needUpdate = true;
                }
                break;
            case 1: //erase to left
                var curX = this.curX;
                for (var col = 0; col < curX; ++col) {
                    line[col].copyFrom(this.newChar);
                    line[col].needUpdate = true;
                }
                break;
            case 2: //erase all
                for (var col = 0; col < cols; ++col) {
                    line[col].copyFrom(this.newChar);
                    line[col].needUpdate = true;
                }
                break;
            default:
                return;
        }
        this.changed = true;
    },

    deleteLine: function(num) {
        var tmp = this.top;
        this.top = this.curY;
        this.scroll(false, num);
        this.top = tmp;
        this.changed = true;
    },

    insertLine: function(num) {
        var tmp = this.top;
        if (this.curY < this.bottom) {
            this.top = this.curY;
            this.scroll(true, num);
        }
        this.top = tmp;
        this.changed = true;
    },

    scroll: function(up, n) {
        // scroll more than 1 page = clear
        if (n > (this.bottom - this.top)) {
            if (this.top == 0 && this.bottom == this.rows - 1)
                this.clear(2)
            else {
                var lines = this.lines;
                var bottom = this.bottom;
                for (var row = this.top; row <= bottom; ++row) {
                    var line = lines[row];
                    for (var col = 0; col < cols; ++col) {
                        line[col].copyFrom(this.newChar);
                        line[col].needUpdate = true;
                    }
                }
            }
        } else {
            var lines = this.lines;
            var rows = this.rows;
            var cols = this.cols;

            if (up) { // move lines down
                while (--n >= 0) {
                    var line = lines[this.bottom];
                    lines.splice(this.bottom, 1); // remove the last line
                    lines.splice(this.top, 0, line); // insert it to top
                    for (var col = 0; col < cols; ++col)
                        line[col].copyFrom(this.newChar);
                }
            } else { // move lines up
                while (--n >= 0) {
                    var line = lines[this.top];
                    lines.splice(this.top, 1); // remove the first line
                    lines.splice(this.bottom, 0, line); // insert it to bottom
                    for (var col = 0; col < cols; ++col)
                        line[col].copyFrom(this.newChar);
                }
            }

            // update the whole scroll region
            for (var row = this.top; row <= this.bottom; ++row) {
                var line = lines[row];
                for (var col = 0; col < cols; ++col) {
                    line[col].needUpdate = true;
                }
            }
        }
        this.changed = true;
    },

    gotoPos: function(x, y) {
        // make sure the position is valid
        if (x < 0)
            x = 0;
        else if (x > this.cols)
            x = this.cols;
        if (y < 0)
            y = 0;
        else if (y >= this.rows)
            y = this.rows - 1;

        this.curX = x;
        this.curY = y;
        this.posChanged = true;
    },

    carriageReturn: function() {
        this.curX = 0;
        this.posChanged = true;
    },

    lineFeed: function() {
        if (this.curY < this.bottom) {
            ++this.curY;
            this.posChanged = true;
        } else { // at bottom of screen or scroll region
            this.scroll(false, 1);
        }

        this.listener.robot.downloadArticle.lineFeed(); // get data
    },

    setScrollRegion: function(top, bottom) {
        if (top < 0)
            top = 0;
        if (bottom >= this.rows)
            bottom = this.rows - 1;
        this.top = top;
        this.bottom = bottom;
    },

    saveCursor: function() {
        this.savedCurX = this.curX;
        this.savedCurY = this.curY;
        this.cursorSaved = true;
    },

    restoreCursor: function() {
        if (this.cursorSaved) {
            this.curX = this.savedCurX;
            this.curY = this.savedCurY;
            this.cursorPosChanged = true;

            delete this.savedCurX;
            delete this.savedCurY;
            this.cursorSaved = false;
        }
    },

    getRowText: function(row, colStart, colEnd, ansi) {
        var text = this.lines[row];
        // always start from leadByte, and end at second-byte of DBCS.
        // Note: this might change colStart and colEnd. But currently we don't return these changes.
        if (colStart > 0) {
            if (!text[colStart].isLeadByte && text[colStart - 1].isLeadByte) colStart--;
        } else colStart = 0;
        if (colEnd < this.cols) {
            if (text[colEnd].isLeadByte) colEnd++;
        } else colEnd = this.cols;

        text = text.slice(colStart, colEnd);
        var conv = this.listener.view.conv;
        var charset = this.listener.prefs.get('Encoding');
        var newChar = this.newChar;
        var _this = this;
        return text.map(function(c, col, line) {
            var ret = (col == 0) ? _this.ansiCmp(ansi, newChar, c, true) : '';
            if (!c.isLeadByte) {
                if (col >= 1 && line[col - 1].isLeadByte) { // second byte of DBCS char
                    var prevC = line[col - 1];
                    if (col >= 2)
                        ret += _this.ansiCmp(ansi, line[col - 2], prevC);
                    var b5 = prevC.ch + c.ch;
                    ret += conv.convertStringToUTF8(b5, charset, true);
                    ret += _this.ansiCmp(ansi, prevC, c).replace(/m$/, ';50m');
                } else {
                    if (col >= 1)
                        ret += _this.ansiCmp(ansi, line[col - 1], c);
                    ret += c.ch;
                }
            }
            if (col == line.length - 1)
                ret += _this.ansiCmp(ansi, c, newChar);
            return ret;
        }).join('');
    },

    ansiCmp: function(active, preChar, thisChar, forceReset) {
        if (!active)
            return '';
        var text = '';
        var reset = forceReset ||
            (preChar.bright && !thisChar.bright) ||
            (preChar.underLine && !thisChar.underLine) ||
            (preChar.blink && !thisChar.blink) ||
            (preChar.invert && !thisChar.invert) ||
            (preChar.fg != 7 && thisChar.fg == 7) ||
            (preChar.bg != 0 && thisChar.bg == 0);
        if (reset) text = ';';
        if ((reset || !preChar.bright) && thisChar.bright) text += '1;';
        if ((reset || !preChar.underLine) && thisChar.underLine) text += '4;';
        if ((reset || !preChar.blink) && thisChar.blink) text += '5;';
        if ((reset || !preChar.invert) && thisChar.invert) text += '7;';
        if (thisChar.fg != (reset ? 7 : preChar.fg))
            text += '3' + thisChar.fg + ';';
        if (thisChar.bg != (reset ? 0 : preChar.bg))
            text += '4' + thisChar.bg + ';';
        if (!text) return '';
        else return ('\x1b[' + text.replace(/;$/, 'm'));
    },

    fromMyFormat: function(b5str) {
        return b5str.replace(/(.)(\x1b\[[0-9;]*);50m/g, "$2m$1");
    },

    onResize: function() {
        var newcols = this.listener.prefs.get('Cols');
        var newrows = this.listener.prefs.get('Rows');
        if (newrows < this.rows) {
            for (var row = this.rows - 1;
                (row > newrows - 1 && row > this.curY); --row)
                this.lines.pop();
            for (row = 0; row < this.curY - newrows + 1; ++row)
                this.lines.shift();
            if (this.cursorSaved) {
                if (this.savedCurY < this.curY - newrows + 1) this.savedCurY = 0;
                else if (this.curY > newrows - 1)
                    this.savedCurY -= this.curY - newrows + 1;
                if (this.savedCurY >= newrows) this.savedCurY = newrows - 1;
            }
            if (this.curY >= newrows) this.curY = newrows - 1;
        } else {
            for (var row = this.rows - 1; row < newrows - 1; ++row) {
                var line = new Array(this.cols);
                for (var col = 0; col < this.cols; ++col)
                    line[col] = new TermChar(' ');
                this.lines.push(line);
            }
        }
        if (newcols < this.cols) {
            if (this.curX > newcols) this.curX = newcols - 1;
            if (this.cursorSaved && this.savedCurX > newcols)
                this.savedCurX = newcols - 1;
            for (var row = 0; row < newrows; ++row) {
                for (var col = this.cols - 1; col > newcols - 1; --col)
                    this.lines[row].pop();
                if (this.lines[row][newcols - 1].isLeadByte)
                    this.lines[row][newcols - 1].copyFrom(this.newChar);
                // force the url to be updated
                this.lines[row][newcols - 1].needUpdate = true;
                if (this.lines[row][newcols - 2].isLeadByte)
                    this.lines[row][newcols - 2].needUpdate = true;
            }
        } else {
            for (var row = 0; row < newrows; ++row) {
                for (var col = this.cols - 1; col < newcols - 1; ++col) {
                    var ch = new TermChar(' ');
                    this.lines[row].push(ch);
                }
            }
        }
        if (this.bottom == this.rows - 1) this.bottom = newrows - 1;
        this.cols = newcols;
        this.rows = newrows;
        this.listener.conn.sendNaws();
        // url may need to be updated to aviod url range overflow
        this.updateCharAttr();
        this.listener.view.onResize();
    }
};

