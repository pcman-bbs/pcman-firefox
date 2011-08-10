// Convert the special notations in the string to the special characters
// Support javascript notations (\\, \n, \077, \x1b, \u0021, ...)
// and caret notations (^C, ^H, ^U, ^[, ^?, ...)
// If you want to show ^, use \^

function UnEscapeStr(str) {
    var result = "";
    for(var i=0; i<str.length; ++i) {
        switch(str.charAt(i)) {
        case "\\":
            if(i == str.length-1)
                break; // independent \ at the end of the string
            switch(str.charAt(i+1)) {
            case "\\":
                result += "\\\\";
                ++i;
                break;
            case "\'":
                result += "\\'";
                ++i;
                break;
            case "^":
                result += "^";
                ++i;
                break;
            default:
                result += "\\";
            }
            break;
        case "^":
            if(i == str.length-1)
                break; // independent ^ at the end of the string
            if("@" <= str.charAt(i+1) && str.charAt(i+1) <= "_") {
                var code = str.charCodeAt(i+1) - 64;
                result += code > 15 ? "\\x" + code.toString(16)
                                    : "\\x0" + code.toString(16);
                i++;
            } else if(str.charAt(i+1) == "?") {
                result += "\\x7f";
                i++;
            }
            break;
        case "'":
            result += "\\'";
            break;
        default:
            result += str.charAt(i);
        }
    }
    // an alternative to  e v a l ();
    var tmpfunc = new Function("return '" + result + "';");
    return tmpfunc();
}

