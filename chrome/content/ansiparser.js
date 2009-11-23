// Parser for ANSI escape sequence

const STATE_TEXT=0;
const STATE_ESC=1;
const STATE_CSI=2;
const STATE_C1=3;

function AnsiParser(termbuf) {
    this.termbuf=termbuf;
    this.state = STATE_TEXT;
    this.esc='';
}

AnsiParser.prototype={
    feed: function(data) {
        var term=this.termbuf;
        if(!term)
            return;
        var s='';
        var n=data.length;
        for(var i=0; i<n; ++i) {
            var ch = data[i];
            switch(this.state) {
            case STATE_TEXT:
                switch(ch) {
                case '\x1b':
                    if(s) {
                        term.puts(s);
                        s='';
                    }
                    this.state = STATE_ESC;
                    break;
                default:
                    s += ch;
                }
                break;
            case STATE_CSI:
                if( (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <='Z') ) {
                    // if(ch != 'm')
                    //    dump('CSI: ' + this.esc + ch + '\n');
                    var params=this.esc.split(';');
                    for(var j=0; j<params.length; ++j) {
                        if( params[j] )
                            params[j]=parseInt(params[j], 10);
                        else
                            params[j]=0;
                    }
                    switch(ch) {
                    case 'J':
                        term.clear(params ? params[0] : 0);
                        break;
                    case 'H':
                    case 'f':
                        if(params.length < 2)
                            term.gotoPos(0, 0);
                        else {
                            if(params[0] > 0)
                                --params[0];
                            if(params[1] > 0)
                                --params[1];
                            term.gotoPos(params[1], params[0]);
                        }
                        break;
                    case 'm':
                        var attr=term.attr;
                        for(var n_params=params.length;n_params;--n_params){
                            var v=params.shift();
                            switch(v) {
                            case 0: // reset
                                attr.resetAttr();
                                break;
                            case 1: // bright
                                attr.bright=true;
                                break;
                            case 4:
                                attr.underLine=true;
                                break;
                            case 5: // blink
                            case 6:
                                attr.blink=true;
                                break;
                            case 7: // invert
                                attr.invert=true;
                                break;
                            case 8:
                                // invisible is not supported
                                break;
                            default:
                                if(v <= 37) {
                                    if(v >= 30) { // fg
                                        attr.fg=v-30;
                                    }
                                }else if(v >= 40) {
                                    if(v<=47) { //bg
                                        attr.bg=v-40;
                                    }
                                }
                                break;
                            }
                        }
                        break;
                    case 'K':
                        term.eraseLine(params? params[0] : 0);
                        break;
                    case 'r': // FIXME: scroll range
                        break;
                    default:
                        dump('unknown CSI: ' + ch + '\n');
                    }
                    this.state=STATE_TEXT;
                    this.esc = '';
                }
                else
                    this.esc += ch;
                break;
            case STATE_C1:
                this.esc += ch;
                dump('C1 CONTROL CHAR IS FOUND' + this.esc + '\n');
                this.esc='';
                this.state=STATE_TEXT;
                break;
            case STATE_ESC:
                if(ch == '[')
                    this.state=STATE_CSI;
                else
                    this.state=STATE_C1;
                break;
            }
        }
        if(s) {
            term.puts(s);
            s='';
        }
    }
}
