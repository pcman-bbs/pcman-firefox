// Terminal View

var uriColor='#FF6600'; // color used to draw URI underline
var selectedStyle = 'rgba(49, 106, 197, 0.6)';

function setTimer(repeat, func, timelimit) {
    var timer = Components.classes["@mozilla.org/timer;1"]
                  .createInstance(Components.interfaces.nsITimer);
    timer.initWithCallback(
        { notify: function(timer) { func(); } },
        timelimit,
        repeat  ? Components.interfaces.nsITimer.TYPE_REPEATING_SLACK
                : Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    return timer;
}

function TermView(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.buf=null;

    // text selection
    this.selection = new TermSel(this);

    // Cursor
    this.cursorX=0;
    this.cursorY=0;
    this.cursorVisible=true; // false to hide the cursor
    this.cursorShow=false; // blinking state of cursor

    this.input = document.getElementById('input_proxy');

    // initialize
    var ctx = this.ctx;
    ctx.fillStyle = "#c0c0c0";
    this.onResize();

    var composition_start ={
        view: this,
        handleEvent: function(e) {
            this.view.onCompositionStart(e);
        }
    };
    this.input.addEventListener('compositionstart', composition_start, false);

    var composition_end ={
        view: this,
        handleEvent: function(e) {
            this.view.onCompositionEnd(e);
        }
    };
    this.input.addEventListener('compositionend', composition_end, false);

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
    this.input.addEventListener('input', text_input, false);

    this.eventListener = {};
    this.eventListener.composition_start = composition_start;
    this.eventListener.composition_end = composition_end;
    this.eventListener.key_press = key_press;
    this.eventListener.text_input = text_input;

    var _this=this;
    this.blinkTimeout=setTimer(true, function(){_this.onBlink();}, 600);
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

    /* update the canvas to reflect the change in TermBuf */
    update: function() {
        var buf = this.buf;
        if(buf.changed) // content of TermBuf changed
        {
            buf.updateCharAttr(); // prepare TermBuf
            this.redraw(false); // do the redraw
            buf.changed=false;
        }
        if(buf.posChanged) { // cursor pos changed
            this.updateCursorPos();
            buf.posChanged=false;
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
        if(line){
            var ch = line[col];
            tihs.doDrawChar(line, ch, row, col, x, y);
        }
    },

    doDrawChar: function(line, ch, row, col, x, y) {
        var chw = this.chw;
        var chh = this.chh;
        if(!ch.isLeadByte) {
            // if this is second byte of DBCS char, draw the first byte together.
            if(col >=1 && line[col-1].isLeadByte) {
                --col;
                x -= chw;
                ch = line[col];
            }
        }
        var fg = ch.getFg();
        var bg = ch.getBg();
        var ctx = this.ctx;
        ctx.save();

        if(ch.isLeadByte) { // first byte of DBCS char
            var cols = this.buf.cols;
            ++col;
            if(col < cols) {
                var ch2 = line[col]; // second byte of DBCS char
                // draw background color
                ctx.fillStyle=termColors[bg];
                var bg2 = ch2.getBg();
                if(bg == bg2) { // two bytes has the same bg
                    ctx.fillRect(x, y, chw * 2, chh);
                }
                else { // two bytes has different bg
                    ctx.fillRect(x, y, chw, chh); // lead byte
                    ctx.fillStyle=termColors[bg2];
                    ctx.fillRect(x + chw, y, chw, chh); // second byte
                }
                // draw text
                var chw2 = chw * 2;
                // blinking text needs to be hidden sometimes
                var visible1 = (!ch.blink || this.blinkShow); // ch1 is visible
                var visible2 = (!ch2.blink || this.blinkShow); // ch2 is visible
                // don't draw hidden text
                if(visible1 || visible2) { // at least one of the two bytes should be visible
                    var b5 = ch.ch + ch2.ch; // convert char to UTF-8 before drawing
                    var charset = this.conn.listener.prefs.Encoding;
                    var u = this.conv.convertStringToUTF8(b5, charset,  true); // UTF-8

                    if(u) { // ch can be converted to valid UTF-8
                        var fg2 = ch2.getFg(); // fg of second byte
                        if( fg == fg2 ) { // two bytes have the same fg
                            if(visible1) { // first half is visible
                                if(visible2) // two bytes are all visible
                                    drawClippedChar(ctx, u, termColors[fg], x, y, chw2, x, y, chw2, chh);
                                else // only the first half is visible
                                    drawClippedChar(ctx, u, termColors[fg], x, y, chw2, x, y, chw, chh);
                            }
                            else if(visible2) { // only the second half is visible
                                drawClippedChar(ctx, u, termColors[fg], x, y, chw2, x + chw, y, chw, chh);
                            }
                        }
                        else {
                            // draw first half
                            if(visible1)
                                drawClippedChar(ctx, u, termColors[fg], x, y, chw2, x, y, chw, chh);
                            // draw second half
                            if(visible2)
                                drawClippedChar(ctx, u, termColors[fg2], x, y, chw2, x + chw, y, chw, chh);
                        }
                    }
                }
                // TODO: draw underline

                // draw selected color
                if(ch.isSelected)
                    this.drawSelRect(ctx, x, y, chw2, chh);

                line[col].needUpdate=false;
            }
        }
        else {
            ctx.fillStyle=termColors[bg];
            ctx.fillRect(x, y, chw, chh);
            // only draw visible chars to speed up
            if(ch.ch > ' ' && (!ch.blink || this.blinkShow))
                drawClippedChar(ctx, ch.ch, termColors[fg], x, y, chw, x, y, chw, chh);

            // TODO: draw underline

            // draw selected color
            if(ch.isSelected)
                this.drawSelRect(ctx, x, y, chw, chh);
        }
        ctx.restore();
        ch.needUpdate=false;
    },

    redraw: function(force) {
        var cursorShow=this.cursorShow;
        if(cursorShow)
            this.hideCursor();

        var cols=this.buf.cols;
        var rows=this.buf.rows;
        var ctx = this.ctx;

        var lines = this.buf.lines;

        for(var row=0; row<rows; ++row) {
            var chh = this.chh;
            var y=row * chh;
            var x = 0;
            var line = lines[row];
            var lineUpdated = false;
            var chw = this.chw;
            for(var col=0; col<cols;) {
                var ch = line[col];
                if(force || ch.needUpdate) {
                    this.doDrawChar(line, ch, row, col, x, y);
                    lineUpdated = true;
                }

                if(ch.isLeadByte) {
                    col += 2;
                    x += chw * 2;
                }
                else {
                    ++col;
                    x += chw;
                }
            }

            // draw underline for links
            if(lineUpdated){
              var uris = line.uris;
              if(uris){
                for (var i=0 ; i<uris.length ; i++) {
                  ctx.save();
                  ctx.strokeStyle = uriColor;
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.lineTo( uris[i][0] * chw, y + chh - 1 );
                  ctx.lineTo( uris[i][1] * chw, y + chh - 1 );
                  ctx.stroke();
                  ctx.restore();
                }
              }
              lineUpdated = false;
            }
        }
        if(cursorShow)
            this.showCursor();
    },

    onTextInput: function(text) {
        var charset = this.conn.listener.prefs.Encoding;
        this.conn.convSend(text, charset);
    },

    onkeyPress: function(e) {
        // dump('onKeyPress:'+e.charCode + ', '+e.keyCode+'\n');
        var conn = this.conn;
        
        // give keypress control back to Firefox
        if ( !conn.ins )
          return;
          
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
        else if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
            switch(e.keyCode){
            case 8:
                if(this.detectDBCS(true))
                    conn.send('\b\b');
                else
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
                if(this.detectDBCS(true))
                    conn.send('\x1b[D\x1b[D');
                else
                    conn.send('\x1b[D');
                break;
            case 38: //Arrow Up
                conn.send('\x1b[A');
                break;
            case 39: //Arrow Right
                if(this.detectDBCS(false))
                    conn.send('\x1b[C\x1b[C');
                else
                    conn.send('\x1b[C');
                break;
            case 40: //Arrow Down
                conn.send('\x1b[B');
                break;
            case 45: //Insert
                conn.send('\x1b[2~');
                break;
            case 46: //DEL
                if(this.detectDBCS(false))
                    conn.send('\x1b[3~\x1b[3~');
                else
                    conn.send('\x1b[3~');
                break;
            }
        }
    },

    detectDBCS: function(back) {
        if(!this.conn.listener.prefs.DetectDBCS || !this.buf)
            return false;
        var line = this.buf.lines[this.buf.curY];
        if(back && this.buf.curX > 1)
            return line[this.buf.curX-2].isLeadByte;
        if(!back && this.buf.curX < this.buf.cols)
            return line[this.buf.curX].isLeadByte;
        return false;
    },

    onResize: function() {
        var cols = this.buf ? this.buf.cols : 80;
        var rows = this.buf ? this.buf.rows : 24;
        var win = document.getElementById('topwin');
        this.canvas.height = win.clientHeight;
        var ctx = this.ctx;
        this.chh = Math.floor(this.canvas.height / rows);
        var font = this.chh + 'px monospace';
        ctx.font= font;
        ctx.textBaseline='top';

        var m=ctx.measureText('　'); //全形空白
        this.chw=Math.round(m.width/2);

        // if overflow, resize canvas again
        var overflowX = (this.chw * cols) - win.clientWidth;
        if(overflowX > 0) {
          this.canvas.width = win.clientWidth;
          this.chw = Math.floor(this.canvas.width / cols);
          this.chh = this.chw*2;  // is it necessary to measureText?
          font = this.chh + 'px monospace';
          ctx.font= font;
          this.canvas.height = this.chh * rows;
        }

        if(this.buf) {
            this.canvas.width = this.chw * cols;
            // font needs to be reset after resizing canvas
            ctx.font= font;
            ctx.textBaseline='top';
            this.redraw(true);
        }
        else {
            // dump(this.chw + ', ' + this.chw * 80 + '\n');
            this.canvas.width = this.chw * cols;
            // font needs to be reset after resizing canvas
            ctx.font= font;
            ctx.textBaseline='top';
        }

        var visible=this.cursorVisible;
        if(visible)
            this.hideCursor();

        this.updateCursorPos();
        // should we set cursor height according to chh?
        this.setCursorSize(this.chw, 2);

        if(visible)
            this.showCursor();
    },

    // Cursor
    setCursorSize: function(w, h){
        var visible=this.cursorVisible;
        if(visible)
            this.hideCursor();
        this.cursorW=w;
        this.cursorH=h;
        if(visible)
            this.showCursor();
    },

    updateCursorPos: function(){
        var visible=this.cursorVisible;
        if(visible)
            this.hideCursor();
        if(this.buf) {
            this.cursorX=this.buf.curX * this.chw;
            this.cursorY=(this.buf.curY + 1)*this.chh - this.cursorH;
        }
        else {
            this.cursorX=0;
            this.cursorY=this.chh - this.cursorH;
        }
        if(visible)
            this.showCursor();
    },

    onCompositionStart: function(e) {
        var top = (this.buf.curY + 1) * this.chh;
        this.input.style.top = (this.canvas.offsetTop + ( top + this.input.clientHeight > this.canvas.clientHeight ? top - this.input.clientHeight : top )) + 'px';
        this.input.style.left = (this.canvas.offsetLeft + this.buf.curX * this.chw ) + 'px';
    },

    onCompositionEnd: function(e) {
      this.input.style.top = '-100px';
    },

    onBlink: function(){
        this.blinkShow=!this.blinkShow;
        var buf = this.buf;

        // redraw the canvas first if needed
        if(buf.changed)
            this.update();

        var col, cols=buf.cols;
        var row, rows=buf.rows;
        var lines = buf.lines;

        // FIXME: draw blinking characters
        for(row = 0; row < rows; ++row) {
            var line = lines[row];
            for(col = 0; col < cols; ++col) {
                var ch = line[col];
                if(ch.blink)
                    ch.needUpdate = true;
                // two bytes of DBCS chars need to be updated together
                if(ch.isLeadByte) {
                    ++col;
                    if(ch.blink)
                        line[col].needUpdate = true;
                    // only second byte is blinking
                    else if(line[col].blink) {
                        ch.needUpdate = true;
                        line[col].needUpdate = true;
                    }
                }
            }
        }
        this.redraw(false);

        if(this.cursorVisible){
            this.cursorShow=!this.cursorShow;
            this.drawCursor();
        }
    },

    showCursor: function(){
        this.cursorVisible=true;
        if( !this.cursorShow ){
            this.cursorShow=true;
            this.drawCursor();
        }
    },

    hideCursor: function(){
        if(this.cursorShow){ // the cursor is currently shown
            this.cursorShow=false;
            this.drawCursor();
        }
        this.cursorVisible=false;
    },

    drawCursor: function(){
        if(this.chh == 0 || this.chw == 0)
            return;

        var ctx=this.ctx;
        var row = Math.floor(this.cursorY / this.chh);
        var col = Math.floor(this.cursorX / this.chw);

        // Some BBS allow the cursor outside the screen range
        if(this.buf && this.buf.cols == col)
            return;

        if(this.cursorShow) {
            if(this.buf) {
                var line = this.buf.lines[row];
                if(!line)
                    return;
                var ch=line[col];
                var fg=ch.getFg();
                ctx.save();
                ctx.fillStyle=termColors[fg];
                ctx.fillRect(this.cursorX, this.cursorY, this.cursorW, this.cursorH);
                ctx.restore();
            }
            else {

            }
        }
        else {
            if(this.buf) {
                var line = this.buf.lines[row];
                if(!line)
                    return;
                var ch = line[col];
                if(!ch.needUpdate)
                    this.doDrawChar(line, ch, row, col, this.cursorX, row * this.chh);
                    if(line.uris) { // has URI in this line
                        var n=line.uris.length;
                        for(var i=0; i<n;++i) {
                            var uri=line.uris[i];
                            if(uri[0] <= col && uri[1] > col) { // the char is part of a URI
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
            }
            else {

            }
        }
    },

    // convert mouse pointer position (x, y) to (col, row)
    mouseToColRow: function(cX, cY){
        var x = cX - this.canvas.offsetLeft;
        var y = cY - this.canvas.offsetTop;
        var col = Math.floor(x / this.chw);
        var row = Math.floor(y / this.chh);

        if(col < 0)
            col = 0;
        else if(col > this.buf.cols)
            col = this.buf.cols;

        if(row < 0)
            row = 0;
        else if(row >= this.buf.rows)
            row = this.buf.rows - 1;

        // FIXME: we shouldn't select half of a DBCS character
        return {col: col, row: row};
    },

    onMouseDown: function(event) {
        if(event.button == 0) { // left button
            var cursor = this.mouseToColRow(event.pageX, event.pageY);
            if(!cursor) return;
            // FIXME: only handle left button
            this.selection.selStart(event.shiftKey, cursor.col, cursor.row);
        }
    },

    onMouseMove: function(event) {
        var cursor = this.mouseToColRow(event.pageX, event.pageY);
        if(!cursor) return;

        // handle text selection
        if(this.selection.isSelecting)
            this.selection.selUpdate(cursor.col, cursor.row);

        // handle cursors for hyperlinks
        var col = cursor.col, row = cursor.row;
        var uris = this.buf.lines[row].uris;
        if (!uris) {
            this.canvas.style.cursor = "default";
            return;
        }
        for (var i=0;i<uris.length;i++) {
            if (col >= uris[i][0] && col < uris[i][1]) { //@ < or <<
                this.canvas.style.cursor = "pointer";
                return
            }
        }
        this.canvas.style.cursor = "default";
    },

    onMouseUp: function(event) {
        if(event.button == 0) { // left button
            var cursor = this.mouseToColRow(event.pageX, event.pageY);
            if(!cursor) return;
            if(this.selection.isSelecting)
                this.selection.selEnd(cursor.col, cursor.row);
        }
    },

    onClick: function(event) {
        var cursor = this.mouseToColRow(event.pageX, event.pageY);
        if(!cursor) return;
        var col = cursor.col, row = cursor.row;
        var uris = this.buf.lines[row].uris;
        if (!uris) return;

        // Event dispatching order: mousedown -> mouseup -> click
        // For a common click, previous selection always collapses in mouseup
        if (this.selection.hasSelection()) return;

        for (var i=0;i<uris.length;i++) {
            if (col >= uris[i][0] && col < uris[i][1]) { //@ < or <<
                var uri = "";
                for (var j=uris[i][0];j<uris[i][1];j++)
                    uri = uri + this.buf.lines[row][j].ch;
                openURI(uri, this.conn.listener.prefs.NewTab);
            }
        }
    },

    onDblClick: function(event) {
        var cursor = this.mouseToColRow(event.pageX, event.pageY);
        if(!cursor) return;
        this.selection.selectWordAt(cursor.col, cursor.row);
    },

    updateSel: function() {
        if(this.buf.changed) // we're in the middle of screen update
            return;

        var col, row;
        var cols = this.buf.cols;
        var rows = this.buf.rows;
        var lines = this.buf.lines;

        for(row = 0; row < rows; ++row) {
            for(col = 0; col < cols; ++col) {
                var ch = lines[row][col];
                var is_sel = this.selection.isCharSelected(col, row);
                if(is_sel != ch.isSelected) {
                    ch.isSelected = is_sel;
                    ch.needUpdate = true;
                }
            }
        }
        this.redraw(false);
    },

    removeEventListener: function() {
        if(!this.eventListener) return;
        var input = this.input;
        var composition_start = this.eventListener.composition_start;
        var composition_end = this.eventListener.composition_end;
        var key_press = this.eventListener.key_press;
        var text_input = this.eventListener.text_input;
        input.removeEventListener('compositionstart', composition_start, false);
        input.removeEventListener('compositionend', composition_end, false);
        removeEventListener('keypress', key_press, false);
        input.removeEventListener('input', text_input, false);
        this.onCompositionEnd();
        delete this.eventListener;
    }
}
