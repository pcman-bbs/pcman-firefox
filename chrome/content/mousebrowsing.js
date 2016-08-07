// Some part of the code is taken from BBSFox developed by
// Ett Chung <ettoolong@hotmail.com>
// https://addons.mozilla.org/zh-TW/firefox/addon/179388/

'use strict';

var EXPORTED_SYMBOLS = ["MouseBrowsing"];

function MouseBrowsing(listener) {
    this.listener = listener;

    this.mouseX = -1;
    this.mouseY = -1;

    this.pageState = 'normal';
    this.cursorState = 'normal';

    this.nowHighlight = -1;

    this.eventListener = {
        view: this,
        handleEvent: function(e) {
            this.view.mouseScroll(e);
        }
    };
    listener.ui.document.addEventListener('DOMMouseScroll', this.eventListener, false);
    listener.ui.document.addEventListener('mousewheel', this.eventListener, false);
}

MouseBrowsing.prototype = {
    mouseScroll: function(event) {
        if (this.listener.prefs.get('MouseBrowsing') == 0)
            return;

        // DOMMouseScroll(FX) uses detail and mousewheel(etc) uses wheelDelta
        if (event.detail < 0 || event.wheelDelta > 0)
            this.listener.robot.execExtCommand('Arrow Up');
        else
            this.listener.robot.execExtCommand('Arrow Down');
    },

    onMouseMove: function(cursor, uri) {
        if (uri)
            return this.setHighlight(-1);

        if (this.listener.view.selection.hasSelection())
            this.setHighlight(-1);
        else if (this.listener.prefs.get('MouseBrowsing') > 1)
            this.setCursorState(cursor.col, cursor.row);
    },

    onMouseUp: function() {
        if (this.listener.prefs.get('MouseBrowsing') != 1)
            return false;
        this.listener.robot.execExtCommand(this.getCommand('back'));
        return true;
    },

    onClick: function(cursor) {
        if (this.listener.prefs.get('MouseBrowsing') > 1)
            this.listener.robot.execExtCommand(this.getCommand());
        else if (this.listener.prefs.get('MouseBrowsing') == 1)
            this.listener.robot.execExtCommand(this.getCommand('enter'));
    },

    onDblClick: function(button) {
        if (this.listener.prefs.get('MouseBrowsing') == 1)
            return true;
        if (this.listener.prefs.get('MouseBrowsing') > 1 && button == 0)
            return true;
        return false;
    },

    onClose: function() {
        this.listener.ui.document.removeEventListener('DOMMouseScroll', this.eventListener, false);
        this.listener.ui.document.removeEventListener('mousewheel', this.eventListener, false);
    },

    detectColsRows: function() {
        for (var row = this.listener.buf.rows - 1; row > 0; --row) {
            if (!this.isLineEmpty(row))
                break;
        }
        if (row < 23)
            row = 23;
        this.serverRows = row + 1;

        var maxcols = 0;
        for (var row = this.serverRows - 1; row >= 0; --row) {
            var line = this.listener.buf.lines[row];
            for (var col = this.listener.buf.cols - 1; col > maxcols; --col) {
                if (line[col].ch != ' ' || line[col].getBg())
                    break;
            }
            if (col > maxcols) maxcols = col;
        }
        if (maxcols < 79)
            maxcols = 79;
        this.serverCols = maxcols + 1;
    },

    isUnicolor: function(row, start, end) {
        if (end >= this.listener.buf.cols)
            end = this.listener.buf.cols - 1;
        var line = this.listener.buf.lines[row];
        var bg0 = line[start].getBg();

        // a dirty hacking, because of the difference between maple and firebird bbs.
        for (var i = start; i < end; i++) {
            var bg = line[i].getBg();
            if (bg != bg0 || bg == 0)
                return false;
        }
        return true;
    },

    isLineEmpty: function(row) {
        var line = this.listener.buf.lines[row];

        for (var col = 0; col < this.listener.buf.cols; ++col) {
            if (line[col].ch != ' ' || line[col].getBg())
                return false;
        }
        return true;
    },

    setHighlight: function(row) {
        if (this.listener.prefs.get('MouseBrowsing') != 3 ||
            this.listener.view.selection.hasSelection())
            row = -1;

        if (row == this.nowHighlight)
            return;

        //FIXME: Drawing highlight is not implemented now
        /*
        if (this.nowHighlight >= 0) {
            var line = this.listener.buf.lines[this.nowHighlight];
            for(var i = 0; i < this.listener.buf.cols; ++i)
                line[i].needUpdate = true;
        }
        if (row >= 0) {
            var line = this.listener.buf.lines[row];
            for(var i = 0; i < this.listener.buf.cols; ++i)
                line[i].needUpdate = true;
        }
        */
        this.nowHighlight = row;

        /*
        if (!this.listener.buf.changed)
            this.listener.buf.view.redraw(false);
        */
    },

    setPageState: function(needUpdate) {
        var buf = this.listener.buf;
        if (!needUpdate[0]) { // row 0 is not updated
            if (needUpdate[this.mouseY])
                this.setCursorState();
            return;
        }
        this.detectColsRows();
        var cols = this.serverCols + (this.serverCols % 2) //default: 80
        var rows = this.serverRows; //default: 24

        if (this.isUnicolor(0, 0, cols / 2 - 11) &&
            this.isUnicolor(0, cols / 2 + 20, cols - 10)) {
            if (this.isUnicolor(2, 0, cols - 10) &&
                !this.isLineEmpty(1) &&
                (buf.curX < 19 || this.curY == rows - 1)) {
                this.pageState = 'list';
            } else if (this.isLineEmpty(rows - 2) &&
                buf.getRowText(0, 0, 12) == '\u3010\u7cbe\u83ef\u6587\u7ae0\u3011' &&
                buf.getRowText(rows - 1, 1, 11) == '\u3010\u529f\u80fd\u9375\u3011' &&
                (buf.curX < 19 || buf.curY == rows - 1)) {
                this.pageState = 'ptt-z';
            } else {
                this.pageState = 'menu';
            }
        } else if (this.isUnicolor(rows - 1, 28, cols - 27) && buf.curY == rows - 1) {
            this.pageState = 'reading';
        } else {
            this.pageState = 'normal';
        }

        this.setCursorState();
    },

    setCursorState: function(col, row) {
        if (this.listener.view.selection.hasSelection())
            return;

        if (row > -1 || col > -1) {
            this.mouseX = col;
            this.mouseY = row;
        } else {
            col = this.mouseX;
            row = this.mouseY;
        }

        var cols = this.serverCols; //default: 80
        var rows = this.serverRows; //default: 24

        var extended = (this.listener.prefs.get('MouseBrowsing') == 3);

        var hasHighlight = false;

        switch (this.pageState) {
            case 'list':
                if (row == 0) {
                    if (col <= 1)
                        this.cursorState = extended ? 'firstpost' : 'home';
                    else if (col <= cols - 5)
                        this.cursorState = 'home';
                    else
                        this.cursorState = extended ? 'nextpost' : 'home';
                } else if (row <= 2) {
                    if (col <= 1)
                        this.cursorState = extended ? 'prevpost' : 'pageup';
                    else if (col <= cols - 5)
                        this.cursorState = 'pageup';
                    else
                        this.cursorState = extended ? 'nextpost' : 'pageup';
                } else if (row <= rows - 2) {
                    if (col <= 6) {
                        this.cursorState = 'back';
                    } else if (col <= cols - 17) {
                        if (!this.isLineEmpty(row)) { //list item
                            this.cursorState = 'enter_list';
                            this.setHighlight(row);
                            hasHighlight = true;
                        } else {
                            this.cursorState = 'normal';
                        }
                    } else /*if (col >= cols - 16)*/ {
                        if (row <= rows / 2)
                            this.cursorState = 'pageup';
                        else
                            this.cursorState = 'pagedown';
                    }
                } else /*if (row == rows - 1)*/ {
                    if (col <= 1)
                        this.cursorState = extended ? 'refreshpost' : 'end';
                    else if (col <= cols - 5)
                        this.cursorState = 'end';
                    else
                        this.cursorState = extended ? 'lastpost_list' : 'end';
                }
                break;
            case 'ptt-z':
                if (row == 0) {
                    this.cursorState = 'home';
                } else if (row == 1) {
                    this.cursorState = 'pageup';
                } else if (row <= rows - 2) {
                    if (col <= 6) {
                        this.cursorState = 'back';
                    } else if (col <= cols - 17) {
                        if (!this.isLineEmpty(row)) { //list item
                            this.cursorState = 'enter_list';
                            this.setHighlight(row);
                            hasHighlight = true;
                        } else {
                            this.cursorState = 'normal';
                        }
                    } else /*if (col >= cols - 16)*/ {
                        if (row <= rows / 2)
                            this.cursorState = 'pageup';
                        else
                            this.cursorState = 'pagedown';
                    }
                } else /*if (row == rows - 1)*/ {
                    this.cursorState = 'end';
                }
                break;
            case 'menu':
                if (row == 0) {
                    this.cursorState = 'normal';
                } else if (row <= rows - 2) {
                    if (col <= 7)
                        this.cursorState = 'back';
                    else
                        this.cursorState = 'enter_menu';
                } else /*if (row == rows - 1)*/ {
                    this.cursorState = 'normal';
                }
                break;
            case 'reading':
                if (row == 0) {
                    if (col <= 1)
                        this.cursorState = extended ? 'firstpost' : 'back';
                    else if (col <= 6)
                        this.cursorState = 'back';
                    else if (col <= cols - 5)
                        this.cursorState = 'pageup';
                    else
                        this.cursorState = extended ? 'nextpost' : 'pageup';
                } else if (row <= 2) {
                    if (col <= 1)
                        this.cursorState = extended ? 'prevpost' : 'back';
                    else if (col <= 6)
                        this.cursorState = 'back';
                    else if (col <= cols - 5)
                        this.cursorState = 'pageup';
                    else
                        this.cursorState = extended ? 'nextpost' : 'pageup';
                } else if (row <= rows - 2) {
                    if (col <= 6) {
                        this.cursorState = 'back';
                    } else {
                        if (row <= rows / 2)
                            this.cursorState = 'pageup';
                        else
                            this.cursorState = 'pagedown';
                    }
                } else /*if (row == rows - 1)*/ {
                    if (col <= 1)
                        this.cursorState = extended ? 'refreshpost' : 'end';
                    else if (col <= cols - 5)
                        this.cursorState = 'end';
                    else
                        this.cursorState = extended ? 'lastpost_reading' : 'end';
                }
                break;
            case 'normal':
            default:
                this.cursorState = 'normal';
        }

        if (!hasHighlight)
            this.setHighlight(-1);

        if (this.listener.prefs.get('MouseBrowsing') > 1)
            this.listener.view.canvas.style.cursor = this.getCursorStyle();
    },

    getCursorStyle: function(cursorState) {
        if (!cursorState)
            cursorState = this.cursorState;

        var extended = (this.listener.prefs.get('MouseBrowsing') == 3);
        var path = this.listener.ui.skin;

        switch (cursorState) {
            case 'normal':
                return 'auto';
            case 'back':
                return 'url(' + path + 'cursor/back.png) 0 6,auto';
            case 'pageup':
                return 'url(' + path + 'cursor/pageup.png) 6 0,auto';
            case 'pagedown':
                return 'url(' + path + 'cursor/pagedown.png) 6 21,auto';
            case 'home':
                return 'url(' + path + 'cursor/home.png) 0 0,auto';
            case 'end':
                return 'url(' + path + 'cursor/end.png) 0 0,auto';
            case 'enter_list':
                return extended ? 'pointer' : 'url(' + path + 'cursor/enter.png) 0 6,auto';
            case 'enter_menu':
                return 'auto';
            case 'prevpost':
                return 'url(' + path + 'cursor/prevous.png) 6 0,auto';
            case 'nextpost':
                return 'url(' + path + 'cursor/next.png) 6 0,auto';
            case 'firstpost':
                return 'url(' + path + 'cursor/first.png) 0 0,auto';
            case 'lastpost_list':
                return 'url(' + path + 'cursor/last.png) 0 0,auto';
            case 'lastpost_reading':
                return 'url(' + path + 'cursor/last.png) 0 0,auto';
            case 'refreshpost':
                return 'url(' + path + 'cursor/refresh.png) 0 0,auto';
            default:
                return 'default';
        }
    },

    getCommand: function(cursorState) {
        if (!cursorState)
            cursorState = this.cursorState;

        switch (cursorState) {
            case 'normal': // set as back
            case 'back':
                return 'Arrow Left';
            case 'pageup':
                return 'Page Up';
            case 'pagedown':
                return 'Page Down';
            case 'home':
                return 'Home';
            case 'end':
                return 'End';
            case 'enter':
                return 'Enter';
            case 'enter_list':
            case 'enter_menu':
                return 'Enter' + (this.listener.buf.curY - this.mouseY);
            case 'prevpost':
                return 'PreviousPost';
            case 'nextpost':
                return 'NextPost';
            case 'firstpost':
                return 'FirstPost';
            case 'lastpost_list':
                return 'Lastpost@list';
            case 'lastpost_reading':
                return 'Lastpost@reading';
            case 'refreshpost':
                return 'RefreshPost';
            default: // Do nothing
                return '';
        }
    }
}

