// Manage selected text of TermView

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

TermSel.prototype={
    selStart: function(block_mode, col, row) {
        if(this.startRow != -1) // has old selection
            this.cancelSel(false);
        this.isSelecting = true;
        this.blockMode = block_mode;
        this.realStartCol = this.startCol = this.realEndCol = this.endCol = col;
        this.realStartRow = this.startRow = this.realEndRow = this.endRow = row;
    },

    selUpdate: function(col, row) {
        this.realEndCol = col;
        this.realEndRow = row;
        var col1, col2, row1, row2, col, row;

        // swap start and end points to kept them in correct order
        if(this.realEndRow == this.realStartRow) { // only one line is selected
            row1 = row2 = this.realStartRow;
            if(this.realStartCol < this.realEndCol) {
                col1 = this.realStartCol;
                col2 =this.realEndCol;
            }
            else {
                col1 = this.realEndCol;
                col2 = this.realStartCol;
            }
        }
        else if(this.realEndRow < this.realStartRow) {
            col1 = this.realEndCol;
            row1 = this.realEndRow;
            col2 = this.realStartCol;
            row2 = this.realStartRow;
        }
        else {
            col1 = this.realStartCol;
            row1 = this.realStartRow;
            col2 = this.realEndCol;
            row2 = this.realEndRow;
        }

        this.startCol = col1;
        this.startRow = row1;
        this.endCol = col2;
        this.endRow = row2;

        // ask the term view to redraw selected text
        this.view.updateSel();
    },

    selEnd: function(col, row) {
        this.selUpdate(col, row);
        this.isSelecting = false;
    },

    cancelSel: function(redraw) {
        this.realStartCol = this.startCol = this.realEndCol = this.endCol = -1;
        this.realStartRow = this.startRow = this.realEndRow = this.endRow = -1;
        this.isSelecting = false;
        if(redraw)
            this.view.updateSel();
    },

    isCharSelected: function(col, row) {
        if(this.startRow == -1) // no selection at all
            return false;

        var cols = this.view.buf.cols;
        if(this.startRow == this.endRow) { // if only one line is selected
            return row == this.startRow && col >= this.startCol && col <= this.endCol;
        }

        // if multiple lines are selected
        if(row == this.startRow)
            return col >= this.startCol && col < cols;
        else if(row == this.endRow)
            return col >= 0 && col <= this.endCol;
        else if(row > this.startRow && row < this.endRow)
            return true;
        return false;
    },

    hasSelection: function() {
        return this.startRow != -1;
    },

    getText: function() {
        if(!this.hasSelection())
            return null;
        var buf = this.view.buf;
        var lines = buf.lines;
        var row, col;
        var ret = '';
        if(this.startRow == this.endRow) { // only one line is selected
            var line = lines[this.startRow];
            for(col = this.startCol; col <= this.endCol; ++col)
                ret = ret + line[col].ch;
        }
        else {
            var cols = buf.cols;
            var line = lines[this.startRow];
            for(col = this.startCol; col < cols; ++col)
                ret = ret + line[col].ch;
            for(row = this.startRow; row < this.endRow; ++row) {
                line = lines[row];
                for(col = 0; col < cols; ++col)
                    ret = ret + line[col].ch;
            }
            line = lines[this.endRow];
            for(col = 0; col <= this.endCol; ++col)
                ret = ret + line[col].ch;
        }
        ret = this.view.conv.convertStringToUTF8(ret, 'big5',  true);
        return ret;
    }
}

