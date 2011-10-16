function AnsiColor(listener) {
    this.listener = listener;
    this.buf = listener.buf;
}

AnsiColor.prototype = {
    copy: function() {
        var sel = this.listener.view.selection;
        if(!sel.hasSelection())
            return;
        // Use UTF8 format to handle CP among bbs tabs with different charsets
        var text = this.convertStringToUTF8(this.getSelText(true));
        Application.storage.set("copiedAnsiStr", text);

        //FIXME: If user copy string the same as follows, it won't work
        this.systemClipboard("\x02 Not Implemented \x03");

        sel.cancelSel(true);
    },

    paste: function() {
        //FIXME: better approach to listen the change of the system clipboard
        // Retrieving string from system clipboard directly is inefficient
        if(this.systemClipboard() != "\x02 Not Implemented \x03") {
            // The system clipboard is updated by other processes
            Application.storage.set("copiedAnsiStr", "");
            return false; // use normal paste
        }
        var text = Application.storage.get("copiedAnsiStr", "");
        if(!text)
            return false; // use normal paste

        text = this.convertFromUnicode(text);
        text = text.replace(/\r\n/g, '\r');
        text = text.replace(/\n/g, '\r');
        var EscapeString = this.listener.prefs.EscapeString;
        text = text.replace(/\x1b/g, UnEscapeStr(EscapeString));
        this.listener.conn.send(text);
        return true; // paste successfully, stop normal paste
    },

    systemClipboard: function(text) {
        if(text) { // copy string to system clipboard
            var clipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                                            .getService(Components.interfaces.nsIClipboardHelper);
            clipboardHelper.copyString(text);
        } else { // get string from system clipboard
            var clip = Components.classes["@mozilla.org/widget/clipboard;1"]
                            .getService(Components.interfaces.nsIClipboard);
            var trans = Components.classes["@mozilla.org/widget/transferable;1"]
                            .createInstance(Components.interfaces.nsITransferable);
            trans.addDataFlavor("text/unicode");
            clip.getData(trans, clip.kGlobalClipboard);
            var data={};
            var len={};
            trans.getTransferData("text/unicode", data, len);
            if(!data || !data.value)
                return "";
            var text=data.value.QueryInterface(Components.interfaces.nsISupportsString);
            text = text.data.substring(0, len.value / 2);
            return text;
        }
    },

    convertStringToUTF8: function(str) {
        var conv = this.listener.view.conv;
        var Encoding = this.listener.prefs.Encoding;
        return conv.convertStringToUTF8(str, Encoding, true);
    },

    convertFromUnicode: function(str) {
        var Encoding = this.listener.prefs.Encoding;
        if(Encoding.toLowerCase() == 'big5') {
            if(!this.listener.conn.uaoConvLoaded) {
                Components.utils.import("resource://pcmanfx2/uao.js");
                this.listener.conn.uaoConvLoaded = true;
            }
            var text = uaoConv.u2b(str);
        } else {
            this.listener.conn.oconv.charset = Encoding;
            var text = this.listener.conn.oconv.ConvertFromUnicode(str);
        }
        return text.replace(/(\x1b\[[0-9;]*)50m([^\x00-\x7f])/g, "$2$1m");
    },

    getSelText: function(convertBiColor) {
        var sel = this.listener.view.selection;
        if(!sel.hasSelection())
            return '';
        var text = '';
        if(sel.blockMode) {
            var colStart = sel.startCol;
            var colEnd = sel.endCol;
            for(var row=sel.startRow; row<=sel.endRow; ++row) {
                if(colStart > 0 && this.buf.lines[row][colStart-1].isLeadByte)
                    text += ' '; // keep the position of selection
                text += this.getText(row, colStart, colEnd, true, convertBiColor) + '\n';
            }
        } else {
            if(sel.startRow == sel.endRow) {
                text = this.getText(sel.startRow, sel.startCol, sel.endCol+1, true, convertBiColor);
            } else {
                text = this.getText(sel.startRow, sel.startCol, this.buf.cols, true, convertBiColor) + '\n';
                for(var row=sel.startRow+1; row<sel.endRow; ++row)
                    text += this.getText(row, 0, this.buf.cols, false, convertBiColor) + '\n';
                text += this.getText(sel.endRow, 0, sel.endCol+1, false, convertBiColor);
            }
        }
        return text.replace(/\n+$/,'\n');
    },

    //get text in one line
    getText: function(row, colStart, colEnd, reset, convertBiColor) {
        var text = this.buf.lines[row];
        if(colStart > 0) {
            if(!text[colStart].isLeadByte && text[colStart-1].isLeadByte)
                colStart--;
        } else {
            colStart = 0;
        }
        if(colEnd < this.buf.cols) {
            if(text[colEnd].isLeadByte)
                colEnd++;
        } else {
            colEnd = this.buf.cols;
        }

        var output = this.ansiCmp(this.buf.newChar, text[colStart], reset);
        for(var col=colStart; col<colEnd; ++col) {
            if(convertBiColor && text[col].isLeadByte) // no interruption within DBCS char
                output += this.ansiCmp(text[col], text[col+1]).replace(/m$/g, ';50m') + text[col].ch;
            else if(col < colEnd-1)
                output += text[col].ch + this.ansiCmp(text[col], text[col+1]);
            else
                output += text[col].ch + this.ansiCmp(text[col], this.buf.newChar);
        }
        return output.replace(/ +$/,"");
    },

    ansiCmp: function(preChar, thisChar, forceReset) {
        var text = '';
        var reset = forceReset;
        if((preChar.bright && !thisChar.bright) ||
           (preChar.underLine && !thisChar.underLine) ||
           (preChar.blink && !thisChar.blink) ||
           (preChar.invert && !thisChar.invert)) reset = true;
        if(reset) text = ';';
        if((reset || !preChar.bright) && thisChar.bright) text += '1;';
        if((reset || !preChar.underLine) && thisChar.underLine) text += '4;';
        if((reset || !preChar.blink) && thisChar.blink) text += '5;';
        if((reset || !preChar.invert) && thisChar.invert) text += '7;';
        var DeFg = this.buf.newChar.fg;
        var DeBg = this.buf.newChar.bg;
        var thisFg = (thisChar.fg == -1) ? DeFg : thisChar.fg;
        var preFg = (preChar.fg == -1) ? DeFg : preChar.fg;
        var thisBg = (thisChar.bg == -1) ? DeBg : thisChar.bg;
        var preBg = (preChar.bg == -1) ? DeBg : preChar.bg;
        if(thisFg != (reset ? DeFg : preFg))
            text += '3' + thisFg + ';';
        if(thisBg != (reset ? DeBg : preBg))
            text += '4' + thisBg + ';';
        if(!text) return '';
        else return ('\x1b[' + text.substr(0,text.length-1) + 'm');
    }
}
