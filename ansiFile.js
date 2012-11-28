function AnsiFile(ansiColor) {
    this.ansi = ansiColor;
    this.listener = ansiColor.listener;
}

AnsiFile.prototype = {
    openFile: function(data) {
        if(!data) {
            //FIXME: load file with different charset
            data = this.loadFile();
            if(!data) // asynchronous read
                return; // fileReader will call this function later
        }
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
/*
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
*/
        if(document.getElementById('upload'))
            return; // don't create element again

        var input = document.createElement('input');
        input.id = 'upload';
        input.type = 'file';
        input.style.position = 'fixed';
        input.style.top = '0px';
        input.style.left = '0px';
        input.style.background = 'white';
        document.getElementById('input_proxy').parentNode.appendChild(input);
        var _this = this;
        input.onchange = function(event) {
            if(input.files.length == 0)
                return;
            var reader = new FileReader();
            reader.onloadend = function(event) {
                if(reader.readyState != FileReader.DONE)
                    return;
                if(reader.result)
                    _this.openFile(reader.result);
                input.parentNode.removeChild(input);
            }
            reader.readAsBinaryString(input.files[0]);
        }
        return ''; // asynchronous read
    },

    saveFile: function(data, noColor) {
/*
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
*/
        window.URL = window.URL || window.webkitURL;

        var ia = new Uint8Array(data.length);
        for(var i=0; i<data.length; ++i) {
            ia[i] = data.charCodeAt(i);
        }
        var bb = new Blob([ia], {"type": "application/octet-stream"});

        var a = document.createElement('a');
        a.id = 'download';
        a.download = noColor ? 'newtext.txt' : 'newansi.ans'; // GC only
        a.href = window.URL.createObjectURL(bb);
        a.textContent = ' ';
        document.getElementById('input_proxy').parentNode.appendChild(a);

        a.onclick = function(event) {
            event.target.parentNode.removeChild(event.target);
        }

        var evt = document.createEvent("HTMLEvents");
        evt.initEvent('click', true, true );
        a.dispatchEvent(evt);
    }
}
