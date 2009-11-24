// Main Program

function PCMan() {
    var canvas = document.getElementById("canvas");
    this.conn=new Conn(this);
    this.view=new TermView(canvas);
    this.buf=new TermBuf(80, 24);
    this.buf.setView(this.view);
    this.view.setBuf(this.buf);
    this.view.setConn(this.conn);
    this.parser=new AnsiParser(this.buf);
}

PCMan.prototype={

    connect: function(url) {
        var parts = url.split(':');
        var port = 23;
        if(parts.length > 1)
            port=parseInt(parts[1], 10);
        this.conn.connect(parts[0], port);
    },
    
    close: function() {
        this.conn.close();
    },

    onConnect: function(conn) {
    },

    onData: function(conn, data) {
        //alert('data('+data.length +') ' +data);
        this.parser.feed(data);
        //alert('end data');
    },

    onClose: function(conn) {
        alert('Disconnected from the server!');
    }
}
