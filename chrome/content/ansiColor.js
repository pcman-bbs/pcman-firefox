function AnsiColor(listener) {
    this.listener = listener;
    this.buf = listener.buf;
    this.file = new AnsiFile(this);
}

AnsiColor.prototype = {
    copy: function() {
        var sel = this.listener.view.selection;
        if(!sel.hasSelection())
            return;

        // Use UTF8 format to handle CP among bbs tabs with different charsets
        var text = this.convertStringToUTF8(this.getSelText(true), true);
        this.ansiClipboard(text);

        if(this.listener.prefs.ClearCopiedSel)
            sel.cancelSel(true);
    },

    paste: function() {
        var text = this.ansiClipboard();
        if(!text)
            return false; // use normal paste

        text = this.convertFromUnicode(text);
        text = text.replace(/\r\n/g, '\r');
        text = text.replace(/\n/g, '\r');
        text = text.replace(/\r/g, UnEscapeStr(this.listener.prefs.EnterKey));
        var EscapeString = this.listener.prefs.EscapeString;
        text = text.replace(/\x1b/g, UnEscapeStr(EscapeString));
        this.listener.conn.send(text);
        return true; // paste successfully, stop normal paste
    },

    ansiClipboard: function(text) {
        //FIXME: better approach to listen the change of the system clipboard
        // If user copy string the same as follows, it won't work
        var identifyStr = "\x02 Not Implemented \x03";
        if(text) { // copy string to internal buffer
            Application.storage.set("copiedAnsiStr", text);
            this.systemClipboard(identifyStr);
        } else { // get string from internal buffer
            // Retrieving string from system clipboard directly is inefficient
            if(this.systemClipboard() != identifyStr) {
                // The system clipboard is updated by other processes
                Application.storage.set("copiedAnsiStr", "");
                return false; // use normal paste
            }
            return Application.storage.get("copiedAnsiStr", "");
        }
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

    convertStringToUTF8: function(str, converted, Encoding) {
        if(!converted) {
            // It is inefficient, convert str without this as far as possible
            var tmp = '';
            var isLeadByte = 0;
            for(var i=0; i<str.length; ++i) {
                if(str.charAt(i) == '\x1b') {
                    if(isLeadByte == 1)
                        isLeadByte = -1; // SGR within DBCS char starts
                } else if(str.charAt(i) > '\x7f') {
                    if(isLeadByte >= 0) // not SGR within DBCS char
                        isLeadByte = (isLeadByte==0 ? 1 : 0);
                } else {
                    if(isLeadByte >= 0) { // not SGR within DBCS char
                        isLeadByte = 0;
                    } else if(str.charAt(i) == 'm') {
                        isLeadByte = 1; // SGR within DBCS char ends
                        tmp += ';50';
                    }
                }
                tmp += str.charAt(i);
            }
            str = tmp.replace(/([^\x00-\x7f])(\x1b\[[0-9;]*;50m)/g, "$2$1");
        }
        var conv = this.listener.view.conv;
        if(!Encoding)
            Encoding = this.listener.prefs.Encoding;
        return conv.convertStringToUTF8(str, Encoding, true, true);
    },

    convertFromUnicode: function(str, Encoding) {
        if(!Encoding)
            Encoding = this.listener.prefs.Encoding;
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
        return text.replace(/(\x1b\[[0-9;]*);50m([^\x00-\x7f])/g, "$2$1m");
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
        if(this.listener.prefs.TrimTail)
            text = text.replace(/\n+$/,'\n');
        return text;
    },

    //get text in one line
    getText: function(row, colStart, colEnd, reset, convertBiColor) {
        var text = this.buf.lines[row];
        if(colStart > 0) {
            if(text[colStart-1].isLeadByte)
                colStart++;
        } else {
            colStart = 0;
        }
        if(colEnd > 0) {
            if(text[colEnd-1].isLeadByte)
                colEnd++;
        } else {
            colEnd = this.buf.cols;
        }
        if(colStart >= colEnd)
            return '';

        var output = this.ansiCmp(this.buf.newChar, text[colStart], reset);
        for(var col=colStart; col<colEnd; ++col) {
            if(convertBiColor && text[col].isLeadByte) // no interruption within DBCS char
                output += this.ansiCmp(text[col], text[col+1]).replace(/m$/g, ';50m') + text[col].ch;
            else if(col < colEnd-1)
                output += text[col].ch + this.ansiCmp(text[col], text[col+1]);
            else
                output += text[col].ch + this.ansiCmp(text[col], this.buf.newChar);
        }
        if(this.listener.prefs.TrimTail)
            output = output.replace(/ +$/,"");
        return output;
    },

    ansiCmp: function(preChar, thisChar, forceReset) {
        var text = '';
        var reset = forceReset;
        if((preChar.bright && !thisChar.bright) ||
           (preChar.underLine && !thisChar.underLine) ||
           (preChar.blink && !thisChar.blink) ||
           (preChar.invert && !thisChar.invert) ||
           (preChar.fg != 7 && thisChar.fg == 7) ||
           (preChar.bg != 0 && thisChar.bg == 0)) reset = true;
        if(reset) text = ';';
        if((reset || !preChar.bright) && thisChar.bright) text += '1;';
        if((reset || !preChar.underLine) && thisChar.underLine) text += '4;';
        if((reset || !preChar.blink) && thisChar.blink) text += '5;';
        if((reset || !preChar.invert) && thisChar.invert) text += '7;';
        if(thisChar.fg != (reset ? 7 : preChar.fg))
            text += '3' + thisChar.fg + ';';
        if(thisChar.bg != (reset ? 0 : preChar.bg))
            text += '4' + thisChar.bg + ';';
        if(!text) return '';
        else return ('\x1b[' + text.replace(/;$/, 'm'));
    }
}
