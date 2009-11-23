// Terminal View

function TermView(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.buf=null;

    var ctx = this.ctx;
    ctx.fillStyle = "#c0c0c0";
    this.onResize();

    var input = document.getElementById('input_proxy');

    var key_press={
        view: this,
        handleEvent: function(e) {
            this.view.onkeyPress(e);
        }
    };
    addEventListener('keypress', key_press, false);

    var text_input={
        view: this,
        handleEvent: function(e) {
            if(e.target.value) {
                this.view.onTextInput(e.target.value);
            }
            e.target.value='';
        }
    };
    input.addEventListener('input', text_input, false);
}

TermView.prototype={
    conv: Components.classes["@mozilla.org/intl/utf8converterservice;1"]
                                                .getService(Components.interfaces.nsIUTF8ConverterService),

    setBuf: function(buf) {
        this.buf=buf;
    },
    
    setConn: function(conn) {
        this.conn=conn;
    },
    /*
    drawChar: function(ch, x, y) {
        var ctx = this.ctx;
        m=ctx.measureText(ch.ch);
        ctx.fillText(ch.ch, x, y);
    },
    */

    update: function() {
        this.redraw(false);
    },

    redraw: function(force) {
        var cols=this.buf.cols;
        var rows=this.buf.rows;
        var ctx = this.ctx;

        var lines = this.buf.lines;
        var old_color = -1;

        for(var row=0; row<rows; ++row) {
            var y=row * this.chh;
            var x = 0;
            var line = lines[row];
            for(var col=0; col<cols; ++col) {
                var ch = line[col];
                if(force || ch.needUpdate) {
                    var fg = ch.getFg();
                    var bg = ch.getBg();
                    if(ch.isLeadByte) {
                        ++col;
                        if(col < cols) {
                            if(bg != old_color) {
                                ctx.fillStyle=termColors[bg];
                                old_color=bg;
                            }
                            ctx.fillRect(x, y, this.chw * 2, this.chh);

                            var b5=ch.ch + line[col].ch;
                            var u=this.conv.convertStringToUTF8(b5, 'big5', true);
                            if(u) {
                                if(fg != old_color) {
                                    ctx.fillStyle=termColors[fg];
                                    ctx.fillText( u, x, y);
                                    old_color=fg;
                                }
                            }
                            x += this.chw;

                            line[col].needUpdate=false;
                        }
                    }
                    else { // FIXME: only draw visible chars to speed up
                        if(bg != old_color) {
                            ctx.fillStyle=termColors[bg];
                            old_color=bg;
                        }
                        ctx.fillRect(x, y, this.chw, this.chh);
                        if(ch.ch > ' ') {
                            if(fg != old_color) {
                                ctx.fillStyle=termColors[fg];
                                ctx.fillText( ch.ch, x, y );
                                old_color=fg;
                            }
                        }
                    }
                    ch.needUpdate=false;
                }
                x += this.chw;
            }
        }
    },

    onTextInput: function(text) {
        this.conn.convSend(text, 'big5');
    },

    onkeyPress: function(e) {
        // dump('onKeyPress:'+e.charCode + ', '+e.keyCode+'\n');
        var conn = this.conn;
        if(e.charCode){
            // Control characters
            if(e.ctrlKey && !e.altKey && !e.shiftKey) {
                // Ctrl + @, NUL, is not handled here
                if( e.charCode >= 65 && e.charCode <=90 ) { // A-Z
                    conn.send( String.fromCharCode(e.charCode - 64) );
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                else if( e.charCode >= 97 && e.charCode <=122 ) { // a-z
                    conn.send( String.fromCharCode(e.charCode - 96) );
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            }
        }
        else {
            switch(e.keyCode){
            case 8:
                conn.send('\b');
                break;
            case 9:
                conn.send('\t');
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
        var ctx = this.ctx;
        this.chh = (this.canvas.height - this.canvas.height % 24) / 24;
        var font = this.chh + "px monospace";
        ctx.font= font;
        ctx.textBaseline="top";

        var m=ctx.measureText('　'); //全形空白
        this.chw=Math.round(m.width/2);

        if(this.buf) {
            this.canvas.width = this.chw * this.buf.cols;
            // font needs to be reset after resizing canvas
            ctx.font= font;
            ctx.textBaseline="top";
            this.redraw(true);
        }
        else {
            dump(this.chw + ', ' + this.chw * 80 + '\n');
            this.canvas.width = this.chw * 80;;
            // font needs to be reset after resizing canvas
            ctx.font= font;
            ctx.textBaseline="top";
        }
    }
}
