// Terminal Screen Buffer, displayed by TermView

const termColors=[
    // dark
    '#000000', // black
    '#800000', // red
    '#008000', // green
    '#808000',   // yellow
    '#000080', // blue
    '#800080', // magenta
    '#008080', // cyan
    '#c0c0c0', // light gray
    // bright
    '#808080',   // gray
    '#ff0000', // red
    '#00ff00', // green
    '#ffff00',   // yellow
    '#0000ff', // blue
    '#ff00ff', // magenta
    '#00ffff', // cyan
    '#ffffff' // white
];

function TermChar(ch) {
    this.ch=ch;
    this.resetAttr();
    this.needUpdate=false;
    this.isLeadByte=false;
    this.isSelected = false;
}

TermChar.prototype={
    copyFrom: function(attr) {
        this.ch=attr.ch;
        this.isLeadByte=attr.isLeadByte;
        this.copyAttr(attr);
    },
    copyAttr: function(attr) {
        this.fg=attr.fg;
        this.bg=attr.bg;
        this.bright=attr.bright;
        this.invert=attr.invert;
        this.blink=attr.blink;
        this.underLine=attr.underLine;
    },
    resetAttr: function() {
        this.fg=7;
        this.bg=0;
        this.bright=false;
        this.invert=false;
        this.blink=false;
        this.underLine=false;
    },
    getFg: function() {
        if(this.invert)
            return this.bg;
        return this.bright ? (this.fg + 8) : this.fg;
    },
    getBg: function() {
        return this.invert ? this.fg : this.bg;
    }
}

function TermBuf(cols, rows) {
    this.cols=cols;
    this.rows=rows;
    this.view=null;
    this.cur_x=0;
    this.cur_y=0;
    this.attr=new TermChar(' ');
    this.changed=false;
    this.posChanged=false;
    this.lines=new Array(rows);
    while(--rows >= 0) {
        var line=new Array(cols);
        var c=cols;
        while(--c >= 0) {
            line[c]=new TermChar(' ');
        }
        this.lines[rows]=line;
    }
}

TermBuf.prototype={
    // From: http://snippets.dzone.com/posts/show/452
    uriRegEx: /(ftp|http|https|telnet):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/ig,

    setView: function(view) {
        this.view = view;
    },

    puts: function(str) {
        if(!str)
            return;
        var cols=this.cols;
        var rows=this.rows;
        var lines=this.lines;
        var n=str.length;
        var line = lines[this.cur_y];
        for(var i=0;i<n;++i) {
            var ch=str[i];
            switch(ch) {
            case '\x07':
                // FIXME: beep
                continue;
            case '\b':
                this.back();
                continue;
            case '\r':
                this.carriageReturn();
                continue;
            case '\n':
                this.lineFeed();
                line = lines[this.cur_y];
                continue;
            case '\0':
                continue;
            }
            if( ch < ' ')
                dump('Unhandled invisible char' + ch.charCodeAt(0)+ '\n');

            if(this.cur_x >= cols) {
                // next line
                this.lineFeed();
                this.cur_x=0;
                line = lines[this.cur_y];
                this.posChanged=true;
            }
            switch(ch) {
            case '\t':
                this.tab();
                break;
            default:
                var ch2 = line[this.cur_x];
                ch2.ch=ch;
                ch2.copyAttr(this.attr);
                ch2.needUpdate=true;
                ++this.cur_x;
                this.changed=true;
                this.posChanged=true;
            }
        }
        this.queueUpdate();
    },

    updateCharAttr: function() {
        var cols=this.cols;
        var rows=this.rows;
        var lines=this.lines;
        for(var row=0; row<rows; ++row) {
            var line=lines[row];
            var needUpdate=false;
            for(var col=0; col < cols; ++col) {
                var ch = line[col];
                if(ch.needUpdate)
                    needUpdate=true;
                // all chars > ASCII code are regarded as lead byte of DBCS.
                // FIXME: this is not correct, but works most of the times.
                if( ch.ch.charCodeAt(0) > 128 && (col + 1) < cols ) {
                    ch.isLeadByte=true;
                    ++col;
                    var ch0=ch;
                    ch=line[col];
                    if(ch.needUpdate)
                        needUpdate=true;
                    // ensure simutaneous redraw of both bytes
                    if( ch0.needUpdate != ch.needUpdate ) {
                        ch0.needUpdate = ch.needUpdate = true;
                    }
                }
                ch.isLeadByte=false;
            }

            if(needUpdate) { // this line has been changed
                // perform URI detection again
                // remove all previously cached uri positions
                if(line.uris) {
                    var uris=line.uris;
                    var nuris=uris.length;
                    // FIXME: this is inefficient
                    for(var iuri=0; iuri<nuris;++iuri) {
                        var uri=uris[iuri];
                        for(col=uri[0]; col < uri[1]; ++col)
                            line[col].needUpdate=true;
                    }
                    line.uris=null;
                }
                var s='';
                for(var col=0; col < cols; ++col)
                    s+=line[col].ch;
                var res;
                var uris=null;
                // pairs of URI start and end positions are stored in line.uri.
                while( (res=this.uriRegEx.exec(s)) != null ) {
                    if(!uris)   uris=new Array();
                    var uri=[res.index, res.index+res[0].length];
                    uris.push(uri);
                    // dump('found URI: ' + res[0] + '\n');
                }
                if(uris) {
                    line.uris=uris;
                    // dump(line.uris.length + "uris found\n");
                }
            }
        }
    },

    clear: function(param) {
        var rows=this.rows;
        var cols=this.cols;
        var lines=this.lines;

        switch(param) {
        case 0:
            var line = lines[this.cur_y];
            var col, row;
            for(col=this.cur_x; col< cols; ++col) {
                line[col].copyFrom(this.attr);
                line[col].needUpdate=true;
            }
            for(row=this.cur_y; row < rows; ++row) {
                for(col=0; col< cols; ++col) {
                    line[col].copyFrom(this.attr);
                    line[col].needUpdate=true;
                }
            }
            break;
        case 1:
            var line;
            var col, row;
            for(row=0; row < this.cur_y; ++row) {
                for(col=0; col< cols; ++col) {
                    line[col].copyFrom(this.attr);
                    line[col].needUpdate=true;
                }
            }
            line = lines[this.cur_y];
            for(col=0; col< this.cur_x; ++col) {
                line[col].copyFrom(this.attr);
                line[col].needUpdate=true;
            }
            break;
        case 2:
            while(--rows >= 0) {
                var col=cols;
                var line=lines[rows];
                while(--col >= 0) {
                    line[col].copyFrom(this.attr);
                    line[col].needUpdate=true;
                }
            }
            break;
        }
        this.changed=true;
        this.gotoPos(0, 0);
        this.queueUpdate();
    },

    back: function() {
        if(this.cur_x>0) {
            --this.cur_x;
            this.posChanged=true;
        }
    },

    tab: function() {
        var mod = this.cur_x % 4;
        this.cur_x += (this.cur_x - mod)/4 + 4;
        if(this.cur_x >= this.cols) {
            this.cur_x = this.cols-1;
            this.posChanged=true;
        }
    },

    insert: function() {

    },

    del: function() {

    },

    eraseLine: function(param) {
        var line = this.lines[this.cur_y];
        var cols = this.cols;
        switch(param) {
        case 0: // erase to rigth
            for(var col=this.cur_x;col < cols;++col) {
                line[col].copyFrom(this.attr);
                line[col].needUpdate=true;
            }
            break;
        case 1: //erase to left
            var cur_x = this.cur_x;
            for(var col=0;col < cur_x;++col) {
                line[col].copyFrom(this.attr);
                line[col].needUpdate=true;
            }
            break;
        case 2: //erase all
            for(var col=0;col < cols;++col) {
                line[col].copyFrom(this.attr);
                line[col].needUpdate=true;
            }
            break;
        default:
            return;
        }
        this.changed=true;
        this.queueUpdate();
    },

    scroll: function(up, n) {
        if(n>=this.rows) // scroll more than 1 page = clear
            this.clear(2)
        else {
            var lines=this.lines;
            var rows=this.rows;
            var cols=this.cols;

            if(up) { // move lines down
                while(--n >= 0) {
                    var line=lines.pop();
                    lines.unshift(line);
                    for(var col=0; col < cols;++col)
                        line[col].copyFrom(this.attr);
                }
            }
            else { // move lines up
                while(--n >= 0) {
                    var line=lines.shift();
                    lines.push(line);
                    for(var col=0; col < cols;++col) // clear the line
                        line[col].copyFrom(this.attr);
                }
            }

            // update the whole screen
            for(var row=0;row<rows;++row) {
                var line=lines[row];
                for(var col=0;col<cols;++col) {
                    line[col].needUpdate=true;
                }
            }
        }
        this.changed=true;
        this.queueUpdate();
    },

    gotoPos: function(x,y) {
        // dump('gotoPos: ' + x + ', ' + y + '\n');
        this.cur_x = x;
        this.cur_y = y;
        this.posChanged=true;
    },

    carriageReturn: function() {
        this.cur_x = 0;
        this.posChanged=true;
    },

    lineFeed: function() {
        if(this.cur_y < (this.rows-1)) {
            ++this.cur_y;
            this.posChanged=true;
        }
        else { // at bottom of screen
            this.scroll(false, 1);
        }
    },

    queueUpdate: function() {
        if(!this.timeout) {
            var _this=this;
            var func=function() {
                _this.onTimeout();
            }
            this.timeout = setTimeout(func, 40);
        }
    },

    isUpdateQueued: function() {
        return this.timeout != null;
    },

    onTimeout: function() {
        if(this.changed) // content changed
        {
            this.updateCharAttr();
            if(this.view) {
                this.view.update();
            }
            this.changed=false;
        }
        if(this.posChanged) { // cursor pos changed
            if(this.view) {
                this.view.updateCursorPos();
            }
            this.posChanged=false;
        }
        clearTimeout(this.timeout);
        this.timeout=null;
    },

    getRowText: function(row, colStart, colEnd) {
      var text = this.lines[row];
      // always start from leadByte, and end at second-byte of DBCS.
      // Note: this might change colStart and colEnd. But currently we don't return these changes.
      if( colStart > 0 ){
        if( !text[colStart].isLeadByte && text[colStart-1].isLeadByte ) colStart--;
      }
      else colStart = 0;
      if( colEnd < this.cols ){
        if( text[colEnd].isLeadByte ) colEnd++;
      }
      else colEnd = this.cols;

      text = text.slice(colStart, colEnd);
      var conv = Components.classes["@mozilla.org/intl/utf8converterservice;1"].getService(Components.interfaces.nsIUTF8ConverterService);
      return text.map( function(c, col, line){
        if(!c.isLeadByte) {
          if(col >=1 && line[col-1].isLeadByte) { // second byte of DBCS char
            var prevC = line[col-1];
            var b5 = prevC.ch + c.ch;
            return conv.convertStringToUTF8(b5, 'big5',  true);
          }
          else
            return c.ch;
        }
      }).join('');
    }
}
