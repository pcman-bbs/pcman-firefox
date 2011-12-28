// Some part of the code is taken from BBSFox developed by
// Ett Chung <ettoolong@hotmail.com>
// https://addons.mozilla.org/zh-TW/firefox/addon/179388/

function MouseBrowsing(buf) {
    this.buf = buf;

    this.mouseX = -1;
    this.mouseY = -1;

    this.pageState = 'normal';
    this.cursorState = 'normal';

    this.nowHighlight = -1;

    var mouse_scroll ={
        view: this,
        handleEvent: function(e) {
            this.view.mouseScroll(e);
        }
    };
//    document.addEventListener('DOMMouseScroll', mouse_scroll, false);
    document.addEventListener('mousewheel', mouse_scroll, false);
}

MouseBrowsing.prototype={
    mouseScroll: function(event) {
        if(this.buf.view.conn.listener.prefs.MouseBrowsing == 0)
            return;
//        if(event.detail < 0)
        if(event.wheelDelta > 0)
            this.buf.view.conn.send('\x1b[A');
        else
            this.buf.view.conn.send('\x1b[B');
    },

    detectColsRows: function() {
      for(var row = this.buf.rows-1; row > 0; --row) {
          if(!this.isLineEmpty(row))
              break;
      }
      if(row < 23)
          row = 23;
      this.serverRows = row + 1;

      var maxcols = 0;
      for(var row = this.serverRows-1; row >= 0; --row) {
          var line = this.buf.lines[row];
          for(var col = this.buf.cols-1; col > maxcols; --col) {
              if(line[col].ch != ' ' || line[col].getBg())
                  break;
          }
          if(col > maxcols) maxcols = col;
      }
      if(maxcols < 79)
          maxcols = 79;
      this.serverCols = maxcols + 1;
    },

    isUnicolor: function(row, start, end) {
        if(end >= this.buf.cols)
            end = this.buf.cols - 1;
        var line = this.buf.lines[row];
        var bg0 = line[start].getBg();

        // a dirty hacking, because of the difference between maple and firebird bbs.
        for(var i = start; i < end; i++) {
            var bg = line[i].getBg();
            if(bg != bg0 || bg == 0)
                return false;
        }
        return true;
    },

    isLineEmpty: function(row) {
        var line = this.buf.lines[row];

        for(var col = 0; col < this.buf.cols; ++col) {
            if(line[col].ch != ' ' || line[col].getBg())
                return false;
        }
        return true;
    },

    setHighlight: function(row) {
        if(this.buf.view.conn.listener.prefs.MouseBrowsing != 3 ||
        this.buf.view.selection.hasSelection())
            row = -1;

        if(row == this.nowHighlight)
            return;

        //FIXME: Drawing highlight is not implemented now
/*
        if(this.nowHighlight >= 0) {
            var line = this.buf.lines[this.nowHighlight];
            for(var i=0; i<this.buf.cols; ++i)
                line[i].needUpdate = true;
        }
        if(row >= 0) {
            var line = this.buf.lines[row];
            for(var i=0; i<this.buf.cols; ++i)
                line[i].needUpdate = true;
        }
*/
        this.nowHighlight = row;

/*
        if(!this.buf.changed)
            this.buf.view.redraw(false);
*/
    },

    setPageState: function() {
        this.detectColsRows();
        var cols = this.serverCols + (this.serverCols % 2) //default: 80
        var rows = this.serverRows; //default: 24

        if(this.isUnicolor(0, 0, cols/2-11) &&
        this.isUnicolor(0, cols/2+20, cols-10)) {
            if(this.isUnicolor(2, 0, cols-10) &&
            !this.isLineEmpty(1) &&
            (this.buf.curX<19 || this.curY==rows-1)) {
                this.pageState = 'list';
            } else if(this.isLineEmpty(rows-2) &&
            this.buf.getRowText(0, 0, 12) == '【精華文章】' &&
            this.buf.getRowText(rows-1, 1, 11) == '【功能鍵】' &&
            (this.buf.curX<19 || this.buf.curY==rows-1)) {
                this.pageState = 'ptt-z';
            } else {
                this.pageState = 'menu';
            }
        } else if(this.isUnicolor(rows-1, 28, cols-27) &&
        this.buf.curY==rows-1) {
            this.pageState = 'reading';
        } else {
            this.pageState = 'normal';
        }

        if(!this.buf.view.selection.hasSelection())
            this.setCursorState();
    },

    setCursorState: function(col, row) {
        if(this.buf.view.selection.hasSelection())
            return;

        if(row > -1 || col > -1) {
            this.mouseX = col;
            this.mouseY = row;
        } else {
            col = this.mouseX;
            row = this.mouseY;
        }

        var cols = this.serverCols; //default: 80
        var rows = this.serverRows; //default: 24

        var extended = (this.buf.view.conn.listener.prefs.MouseBrowsing == 3);

        var hasHighlight = false;

        switch(this.pageState) {
        case 'list':
            if(row==0) {
                if(col<=1)
                    this.cursorState = extended ? 'firstpost' : 'home';
                else if(col<=cols-5)
                    this.cursorState = 'home';
                else
                    this.cursorState = extended ? 'nextpost' : 'home';
            } else if(row<=2) {
                if(col<=1)
                    this.cursorState = extended ? 'prevpost' : 'pageup';
                else if(col<=cols-5)
                    this.cursorState = 'pageup';
                else
                    this.cursorState = extended ? 'nextpost' : 'pageup';
            } else if(row<=rows-2) {
                if(col<=6) {
                    this.cursorState = 'back';
                } else if(col<=cols-17) {
                    if(!this.isLineEmpty(row)) { //list item
                        this.cursorState = 'enter_list';
                        this.setHighlight(row);
                        hasHighlight = true;
                    } else {
                        this.cursorState = 'normal';
                    }
                } else /*if(col>=cols-16)*/ {
                    if(row<=rows/2)
                        this.cursorState = 'pageup';
                    else
                        this.cursorState = 'pagedown';
                }
            } else /*if(row==rows-1)*/ {
                if(col<=1)
                    this.cursorState = extended ? 'refreshpost' : 'end';
                else if(col<=cols-5)
                    this.cursorState = 'end';
                else
                    this.cursorState = extended ? 'lastpost_list' : 'end';
            }
            break;
        case 'ptt-z':
            if(row==0) {
                this.cursorState = 'home';
            } else if(row==1) {
                this.cursorState = 'pageup';
            } else if(row<=rows-2) {
                if(col<=6) {
                    this.cursorState = 'back';
                } else if(col<=cols-17) {
                    if(!this.isLineEmpty(row)) { //list item
                        this.cursorState = 'enter_list';
                        this.setHighlight(row);
                        hasHighlight = true;
                    } else {
                        this.cursorState = 'normal';
                    }
                } else /*if(col>=cols-16)*/ {
                    if(row<=rows/2)
                        this.cursorState = 'pageup';
                    else
                        this.cursorState = 'pagedown';
                }
            } else /*if(row==rows-1)*/ {
                this.cursorState = 'end';
            }
            break;
        case 'menu':
            if(row==0) {
                this.cursorState = 'normal';
            } else if(row<=rows-2) {
                if(col<=7)
                    this.cursorState = 'back';
                else
                    this.cursorState = 'enter_menu';
            } else /*if(row==rows-1)*/ {
                this.cursorState = 'normal';
            }
            break;
        case 'reading':
            if(row==0) {
                if(col<=1)
                    this.cursorState = extended ? 'firstpost' : 'back';
                else if(col<=6)
                    this.cursorState = 'back';
                else if(col<=cols-5)
                    this.cursorState = 'pageup';
                else
                    this.cursorState = extended ? 'nextpost' : 'pageup';
            } else if(row<=2) {
                if(col<=1)
                    this.cursorState = extended ? 'prevpost' : 'back';
                else if(col<=6)
                    this.cursorState = 'back';
                else if(col<=cols-5)
                    this.cursorState = 'pageup';
                else
                    this.cursorState = extended ? 'nextpost' : 'pageup';
            } else if(row<=rows-2) {
                if(col<=6) {
                    this.cursorState = 'back';
                } else {
                    if(row<=rows/2)
                        this.cursorState = 'pageup';
                    else
                        this.cursorState = 'pagedown';
                }
            } else /*if(row==rows-1)*/ {
                if(col<=1)
                    this.cursorState = extended ? 'refreshpost' : 'end';
                else if(col<=cols-5)
                    this.cursorState = 'end';
                else
                    this.cursorState = extended ? 'lastpost_reading' : 'end';
            }
            break;
        case 'normal':
        default:
            this.cursorState = 'normal';
        }

        if(!hasHighlight)
            this.setHighlight(-1);

        if(this.buf.view.conn.listener.prefs.MouseBrowsing > 1)
            this.buf.view.canvas.style.cursor = this.getCursorStyle();
    },

    getCursorStyle: function(cursorState) {
        if(!cursorState)
            cursorState = this.cursorState;

        var extended = (this.buf.view.conn.listener.prefs.MouseBrowsing == 3);

        switch(cursorState) {
        case 'normal':
            return 'auto';
        case 'back':
            return 'url(cursor/back.png) 0 6,auto';
        case 'pageup':
            return 'url(cursor/pageup.png) 6 0,auto';
        case 'pagedown':
            return 'url(cursor/pagedown.png) 6 21,auto';
        case 'home':
            return 'url(cursor/home.png) 0 0,auto';
        case 'end':
            return 'url(cursor/end.png) 0 0,auto';
        case 'enter_list':
            return extended ? 'pointer' : 'url(cursor/enter.png) 0 6,auto';
        case 'enter_menu':
            return 'auto';
        case 'prevpost':
            return 'url(cursor/prevous.png) 6 0,auto';
        case 'nextpost':
            return 'url(cursor/next.png) 6 0,auto';
        case 'firstpost':
            return 'url(cursor/first.png) 0 0,auto';
        case 'lastpost_list':
            return 'url(cursor/last.png) 0 0,auto';
        case 'lastpost_reading':
            return 'url(cursor/last.png) 0 0,auto';
        case 'refreshpost':
            return 'url(cursor/refresh.png) 0 0,auto';
        default:
            return 'default';
        }
    },

    getCommand: function(cursorState) {
        if(!cursorState)
            cursorState = this.cursorState;

        switch(cursorState) {
        case 'normal': // set as back
        case 'back':
            return '\x1b[D';
        case 'pageup':
            return '\x1b[5~';
        case 'pagedown':
            return '\x1b[6~';
        case 'home':
            return '\x1b[1~';
        case 'end':
            return '\x1b[4~';
        case 'enter':
            return UnEscapeStr(this.buf.view.conn.listener.prefs.EnterKey);
        case 'enter_list':
        case 'enter_menu':
            var count = this.buf.curY - this.mouseY;
            var str = '';
            if(count >= 0) {
              for(var i=0; i<count; ++i)
                str += '\x1b[A'; //Arrow Up
            } else {
              for(var i=0; i>count; --i)
                str += '\x1b[B'; //Arrow Down
            }
            str += UnEscapeStr(this.buf.view.conn.listener.prefs.EnterKey);
            return str;
        case 'prevpost':
            return '[';
        case 'nextpost':
            return ']';
        case 'firstpost':
            return '=';
        case 'lastpost_list':
            return '\x1b[D\x1b[C\x1b[4~[]';
        case 'lastpost_reading':
            return '\x1b[D\x1b[4~[]\x1b[C';
        case 'refreshpost':
            return '\x1b[D\x1b[C\x1b[4~';
        default: // Do nothing
            return '';
        }
    }
}

