function AnsiFile(ansiColor) {
    this.ansi = ansiColor;
    this.listener = ansiColor.listener;
}

AnsiFile.prototype = {
    openFile: function() {
        //FIXME: load file with different charset
        var data = this.loadFile();
        if(!data)
            return;

        var text = this.ansi.convertStringToUTF8(data);
        this.ansi.ansiClipboard(text);
        this.ansi.paste();
    },

    savePage: function() {
        //FIXME: save file with different charset
        if(this.listener.view.selection.hasSelection()) {
            var data = this.ansi.getSelText();
            this.saveFile(data, false);
            if(this.listener.prefs.ClearCopiedSel)
                this.listener.view.selection.cancelSel(true);
        } else {
            var stringBundle = this.listener.stringBundle;
            var noColor = confirm(stringBundle.getString("save_without_color"));

            var downloadArticle = this.listener.robot.downloadArticle;
            var _this = this;
            downloadArticle.finishCallback(function(data) {
                var text = _this.ansi.convertStringToUTF8(data);
                if(noColor) {
                    _this.ansi.systemClipboard(text);
                } else {
                    _this.ansi.ansiClipboard(text);
                }

                _this.saveFile(data, noColor);
            });
            downloadArticle.startDownload(noColor);
        }
    },

    loadFile: function() {
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"]
                           .createInstance(nsIFilePicker);
        fp.init(window, null, nsIFilePicker.modeOpen);
        fp.appendFilters(nsIFilePicker.filterAll);
        if(fp.show() == nsIFilePicker.returnCancel)
            return '';
        if(!fp.file.exists())
            return '';

        var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                                .createInstance(Components.interfaces.nsIFileInputStream);
        // Read data with 2-color DBCS char
        fstream.init(fp.file, -1, -1, false);

        var bstream = Components.classes["@mozilla.org/binaryinputstream;1"]
                      .createInstance(Components.interfaces.nsIBinaryInputStream);
        bstream.setInputStream(fstream);
        var bytes = bstream.readBytes(bstream.available());

        return bytes;
    },

    saveFile: function(data, noColor) {
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        fp.init(window, null, nsIFilePicker.modeSave);
        fp.defaultExtension = noColor ? 'txt' : 'ans';
        fp.defaultString = noColor ? 'newtext' : 'newansi';
        fp.appendFilters(nsIFilePicker.filterAll);
        if (fp.show() == nsIFilePicker.returnCancel)
            return;

        var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                                 .createInstance(Components.interfaces.nsIFileOutputStream);
        foStream.init(fp.file, 0x02 | 0x08 | 0x20, 0666, 0);
        foStream.write(data, data.length);
        if (foStream instanceof Components.interfaces.nsISafeOutputStream)
            foStream.finish();
        else
            foStream.close();
    }
}
