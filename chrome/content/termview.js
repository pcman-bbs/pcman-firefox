// Terminal View

function TermView(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.buf=null;

    // Cursor
    this.cursorX=0;
    this.cursorY=0;
    this.cursorSaved=null;

    // initialize
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

    var _this=this;
    this.blinkTimeout=setInterval(function(){_this.onBlink();}, 600);
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
        this.setCursorVisible(false);

        var cols=this.buf.cols;
        var rows=this.buf.rows;
        var ctx = this.ctx;

        var lines = this.buf.lines;
        var old_color = -1;

        for(var row=0; row<rows; ++row) {
            var y=row * this.chh;
            var x = 0;
            var line = lines[row];
            var chw = this.chw;
            var chh = this.chh;
            for(var col=0; col<cols; ++col) {
                var ch = line[col];
                if(force || ch.needUpdate) {
                    var fg = ch.getFg();
                    var bg = ch.getBg();
                    if(ch.isLeadByte) { // first byte of DBCS char
                        ++col;
                        if(col < cols) {
                            var ch2 = line[col]; // second byte of DBCS char
                            
                            // draw background color
                            if(bg != old_color) {
                                ctx.fillStyle=termColors[bg];
                                old_color=bg;
                            }
                            var bg2 = ch2.getBg();
                            if(bg = bg2) { // two bytes has the same bg
                                ctx.fillRect(x, y, chw * 2, chh);
                            }
                            else { // two bytes has different bg
                                ctx.fillRect(x, y, chw, chh); // lead byte
                                ctx.fillStyle=termColors[bg2];
                                old_color=bg2;
                                ctx.fillRect(x + chw, y, chw, this.chh); // second byte
                            }

                            // draw text
                            var b5=ch.ch + ch2.ch; // convert char to UTF-8 before drawing
                            var u=this.conv.convertStringToUTF8(b5, 'big5',  true);
                            if(u) { // can be converted to valid UTF-8
                                var chw2 = this.chw * 2;
                                var fg2 = ch2.getFg(); // fg of second byte
                                if( fg == fg2 ) { // two bytes have the same fg
                                    if(fg != old_color) {
                                        ctx.fillStyle=termColors[fg];
                                        ctx.fillText( u, x, y, chw2);
                                        old_color=fg;
                                    }
                                }
                                else {
                                    // draw first half
                                    // set clip region
                                    ctx.save();
                                    ctx.beginPath();
                                    ctx.rect(x, y, chw, chh);
                                    ctx.closePath();
                                    ctx.clip();
                                    if(fg != old_color) {
                                        ctx.fillStyle=termColors[fg];
                                        ctx.fillText( u, x, y, chw2);
                                        // old_color=fg; // is this needed?
                                    }
                                    ctx.restore();

                                    // draw second half
                                    // set clip region
                                    ctx.save();
                                    ctx.beginPath();
                                    ctx.rect(x + chw, y, chw, chh);
                                    ctx.closePath();
                                    ctx.clip();
                                    ctx.fillStyle=termColors[fg2];
                                    ctx.fillText( u, x, y, chw2);
                                    // old_color=fg2; // is this needed?
                                    ctx.restore();
                                }
                            }
                            x += chw;
                            line[col].needUpdate=false;
                        }
                    }
                    else {
                        if(bg != old_color) {
                            ctx.fillStyle=termColors[bg];
                            old_color=bg;
                        }
                        ctx.fillRect(x, y, this.chw, this.chh);
                        // only draw visible chars to speed up
                        if(ch.ch > ' ') {
                            if(fg != old_color) {
                                ctx.fillStyle=termColors[fg];
                                ctx.fillText( ch.ch, x, y, this.chw );
                                old_color=fg;
                            }
                        }
                    }
                    ch.needUpdate=false;
                }
                x += chw;
            }
        }
        this.cursorSaved=null; // invalidate the cached image
//        this.setCursorVisible(this.blinkShow);
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
        this.chh = Math.floor(this.canvas.height / 24);
        var font = this.chh + 'px monospace';
        ctx.font= font;
        ctx.textBaseline='top';

        var m=ctx.measureText('　'); //全形空白
        this.chw=Math.round(m.width/2);

        if(this.buf) {
            this.canvas.width = this.chw * this.buf.cols;
            // font needs to be reset after resizing canvas
            ctx.font= font;
            ctx.textBaseline='top';
            this.redraw(true);
        }
        else {
            // dump(this.chw + ', ' + this.chw * 80 + '\n');
            this.canvas.width = this.chw * 80;;
            // font needs to be reset after resizing canvas
            ctx.font= font;
            ctx.textBaseline='top';
        }

        // should we set cursor height according to chh?
        this.setCursorSize(this.chw, 2);
    },

    // Cursor
    setCursorSize: function(w, h){
        this.cursorW=w;
        this.cursorH=h;
        this.updateCursorPos();
    },

    updateCursorPos: function(){
        this.setCursorVisible(false);
        if(this.buf) {
            this.cursorX=this.buf.cur_x * this.chw;
            this.cursorY=(this.buf.cur_y + 1)*this.chh - this.cursorH;
        }
        else {
            this.cursorX=0;
            this.cursorY=this.chh - this.cursorH;
        }
        this.cursorSaved=null; // invaldate cacahed image
        this.setCursorVisible(true);
    },

    setCursorVisible: function(visible){
        var ctx=this.ctx;
        if(this.cursorSaved){ // restore saved block from off-screen buffer if available.
            var saved=this.cursorSaved;
            // save cursor block to off-screen buffer
            // this.cursorSaved=ctx.getImageData(this.cursorX, this.cursorY, this.cursorW, this.cursorH);
            this.cursorSaved = null;
            // restore previously saved block
            ctx.putImageData(saved, this.cursorX, this.cursorY);
        }
        else { // otherwise, generate inverted image of cursor block
            if(visible) {
                // save cursor block to off-screen buffer
                // dump(this.cursorX+', '+this.cursorY+', '+this.cursorW+', '+this.cursorH+'\n');
                this.cursorSaved=ctx.getImageData(this.cursorX, this.cursorY, this.cursorW, this.cursorH);
                var src=this.cursorSaved.data;
                var img2=ctx.createImageData(this.cursorW, this.cursorH);
                var px=img2.data;
                // invert the image
                for(var i = 0, n = px.length; i < n; i += 4) {
                    px[i] = 255 - src[i];
                    px[i+1] = 255 - src[i+1];
                    px[i+2] = 255 - src[i+2];
                    px[i+3] = 255;
                }
                ctx.putImageData(img2, this.cursorX, this.cursorY);
            }
        }
    },

    onBlink: function(){
        // dump('blink\n');
        this.blinkShow=!this.blinkShow;
        // FIXME: draw blinking characters
        this.setCursorVisible(this.blinkShow);

        // set timeout again
        var _this=this;
    }
}
