// Manage selected text of TermView

'use strict';

var EXPORTED_SYMBOLS = ["TermSel"];

function TermSel(view) {
    this.view = view;
    this.isSelecting = false;
    this.blockMode = false;

    this.realStartCol = -1;
    this.realStartRow = -1;
    this.realEndCol = -1;
    this.realEndRow = -1;

    this.startCol = -1;
    this.startRow = -1;
    this.endCol = -1;
    this.endRow = -1;
}

TermSel.prototype = {
    selStart: function(block_mode, col, row) {
        if (this.startRow != -1) // has old selection
            this.cancelSel(false);
        this.isSelecting = true;
        this.blockMode = block_mode;

        this.realStartCol = this.startCol = this.realEndCol = this.endCol = col;
        this.realStartRow = this.startRow = this.realEndRow = this.endRow = row;
    },

    selUpdate: function(col, row) {
        this.realEndCol = col;
        this.realEndRow = row;
        var col1, col2, row1, row2;

        // swap start and end points to kept them in correct order
        if (this.realEndRow == this.realStartRow) { // only one line is selected
            row1 = row2 = this.realStartRow;
            if (this.realStartCol < this.realEndCol) {
                col1 = this.realStartCol;
                col2 = this.realEndCol;
            } else {
                col1 = this.realEndCol;
                col2 = this.realStartCol;
            }
        } else if (this.realEndRow < this.realStartRow) {
            col1 = this.realEndCol;
            row1 = this.realEndRow;
            col2 = this.realStartCol;
            row2 = this.realStartRow;
        } else {
            col1 = this.realStartCol;
            row1 = this.realStartRow;
            col2 = this.realEndCol;
            row2 = this.realEndRow;
        }

        this.startCol = col1;
        this.startRow = row1;
        this.endCol = col2;
        this.endRow = row2;

        if (this.blockMode) {
            if (this.startCol > this.endCol) { // swap
                this.startCol = col2;
                this.endCol = col1;
            }
        }

        // ask the term view to redraw selected text
        this.view.updateSel();
    },

    selEnd: function(col, row) {
        this.selUpdate(col, row);
        this.isSelecting = false;
        if (this.startCol == this.endCol && this.startRow == this.endRow) {
            this.cancelSel(true);
            return;
        }

        if (this.blockMode) {
            if (this.startCol == this.endCol) {
                this.cancelSel(true);
                return;
            }
            this.selBlockTrim();
        } else {
            this.selTrim();
        }

        if (this.view.listener.prefs.get('CopyAfterSel'))
            this.view.listener.copy();
    },

    selTrim: function() {
        var buf = this.view.buf;

        // ensure we don't select half of a DBCS character
        var col = this.startCol;
        var line = buf.lines[this.startRow];
        if (col < buf.cols && col > 0) {
            if (!line[col].isLeadByte && line[col - 1].isLeadByte) {
                line[col].isSelected = false;
                this.startCol++;
            }
        }

        if (this.startCol == this.endCol && this.startRow == this.endRow) {
            this.cancelSel(true);
            return;
        }

        // fit the real selection on the screen
        if (this.endCol == buf.cols) {
            this.endCol--;
            return;
        }
        col = this.endCol;
        line = buf.lines[this.endRow];
        if (!line[col].isSelected) {
            if (!line[col].isLeadByte && line[col - 1].isLeadByte)
                line[col].isSelected = true;
            else
                this.endCol--;
        }
    },

    selBlockTrim: function() {
        var buf = this.view.buf;

        this.endCol--;
        var hasSelection = false;
        for (var row = this.startRow; row <= this.endRow; ++row) {
            var line = buf.lines[row];
            var startCol = this.startCol;
            if (startCol > 0) {
                if (line[startCol - 1].isLeadByte) {
                    line[startCol].isSelected = false;
                    startCol++;
                }
            }
            var endCol = this.endCol;
            if (endCol < buf.cols - 1) {
                if (line[endCol].isLeadByte) {
                    line[endCol + 1].isSelected = true;
                    endCol++;
                }
            }
            if (startCol < endCol) // has visible selection region
                hasSelection = true;
        }
        if (!hasSelection)
            this.cancelSel(true);
    },

    // Updating selection range just after termbuf changes
    refreshSel: function() {
        if (this.view.listener.prefs.get('KeepSelAtBufUpd')) {
            // Reset the startcol endcol to untrimmed ones
            this.selUpdate(this.realEndCol, this.realEndRow);
            // termview should be updated before trimming
            this.view.updateSel(true);
            // Trim the DBCS character again with the updated termbuf
            this.selEnd(this.realEndCol, this.realEndRow);
            return;
        }
        this.cancelSel(false);
        this.view.updateSel(true); // force updating even if buf.changed == true
    },

    cancelSel: function(redraw) {
        this.realStartCol = this.startCol = this.realEndCol = this.endCol = -1;
        this.realStartRow = this.startRow = this.realEndRow = this.endRow = -1;
        this.isSelecting = false;
        if (redraw)
            this.view.updateSel();
    },

    isCharSelected: function(col, row) {
        if (this.startRow == -1) // no selection at all
            return false;

        var cols = this.view.buf.cols;
        if (this.startRow == this.endRow) { // if only one line is selected
            if (this.startCol == this.endCol)
                return false;
            return row == this.startRow && col >= this.startCol && col < this.endCol;
        }

        if (this.blockMode) {
            return this.startRow <= row && row <= this.endRow &&
                this.startCol <= col && col < this.endCol;
        }

        // if multiple lines are selected
        if (row == this.startRow)
            return col >= this.startCol && col < cols;
        else if (row == this.endRow)
            return col >= 0 && col < this.endCol;
        else if (row > this.startRow && row < this.endRow)
            return true;
        return false;
    },

    selectWordAt: function(col, row) {
        var buf = this.view.buf;
        var line = buf.lines[row];
        var splitter = null;
        var chByte = 1;

        var table = this.view.listener.conn.oconv.isFullWidth();
        if (line[col].isLeadByte || (col > 0 && line[col - 1].isLeadByte)) { // DBCS, we should select DBCS text
            if (!line[col].isLeadByte)
                col--; // adjust cursor col, make selection start from leadByte of DBCS
            splitter = new RegExp('[^' + table.substr(1));
            chByte = 2;
        } else {
            if (line[col].ch == ' ')
                return null;
            else if (line[col].ch.charCodeAt(0) >= 129) // half-width utf8
                splitter = new RegExp('[\\x00-\\x7F' + table.substr(1));
            else if (line[col].ch.match(/\w/)) // should select [A-Za-z0-9_]
                splitter = /\s|\W|\b/;
            else // punctuation marks, select nearby punctuations
                splitter = /\s|\w|[^\x00-\x7F]/;
        }

        // FIXME: need an implementation of better performance.
        var textL = buf.getRowText(row, 0, col).split(splitter).pop();
        var textR = buf.getRowText(row, col).split(splitter).shift();

        var colStart = col - textL.length * chByte;
        var colEnd = col + textR.length * chByte;
        this.selStart(false, colStart, row);
        this.selEnd(colEnd, row);
    },

    selectAll: function() {
        var buf = this.view.buf;
        this.selStart(false, 0, 0);
        this.selEnd(buf.cols, buf.rows - 1);
    },

    hasSelection: function() {
        return this.startRow != -1;
    },

    strStrip: function(str) {
        if (!this.view.listener.prefs.get('TrimTail'))
            return str;
        return str.replace(/ +$/, '');
    },

    getText: function(ansi) {
        if (!this.hasSelection())
            return null;

        if (this.blockMode)
            return this.getBlockText(ansi);

        var buf = this.view.buf;
        var endCol = (this.endCol < buf.cols) ? this.endCol : (buf.cols - 1);
        var ret = '';

        if (this.startRow == this.endRow) // only one line is selected
            return this.strStrip(buf.getRowText(this.startRow, this.startCol, endCol + 1, ansi));

        ret = this.strStrip(buf.getRowText(this.startRow, this.startCol, buf.cols, ansi)) + '\n';
        for (var row = this.startRow + 1; row < this.endRow; ++row)
            ret += this.strStrip(buf.getRowText(row, 0, buf.cols, ansi)) + '\n';
        ret += this.strStrip(buf.getRowText(this.endRow, 0, endCol + 1, ansi));

        return ret;
    },

    getBlockText: function(ansi) {
        if (this.startCol == this.endCol)
            return null;
        var buf = this.view.buf;
        var lines = buf.lines;
        var startCol, endCol;
        var ret = '';
        for (var row = this.startRow; row <= this.endRow; ++row) {
            startCol = this.startCol;
            endCol = (this.endCol < buf.cols) ? this.endCol : (buf.cols - 1);
            var line = lines[row];
            // Detect DBCS
            if (startCol > 0 && line[startCol - 1].isLeadByte) {
                startCol++;
                ret += ' '; // keep the position of selection
            }
            if (line[endCol].isLeadByte)
                endCol++;
            ret += this.strStrip(buf.getRowText(row, startCol, endCol + 1, ansi));
            ret += (row < this.endRow ? '\n' : '');
        }

        return ret;
    }
};

