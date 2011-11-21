/*
// Convert the special notations in the string to the special characters
// Support javascript notations (\\, \n, \077, \x1b, \u0021, ...)
// and caret notations (^C, ^H, ^U, ^[, ^?, ...)
// If you want to show ^, use \^
function UnEscapeStr(str) {
    var result = '';
    for(var i=0; i<str.length; ++i) {
        switch(str.charAt(i)) {
        case '\\':
            if(i == str.length-1)
                break; // independent \ at the end of the string
            switch(str.charAt(i+1)) {
            case '\\':
                result += '\\\\';
                ++i;
                break;
            case '"':
                result += '"';
                ++i;
                break;
            case '^':
                result += '^';
                ++i;
                break;
            default:
                result += '\\';
            }
            break;
        case '^':
            if(i == str.length-1)
                break; // independent ^ at the end of the string
            if('@' <= str.charAt(i+1) && str.charAt(i+1) <= '_') {
                var code = str.charCodeAt(i+1) - 64;
                result += code > 15 ? '\\x' + code.toString(16)
                                    : '\\x0' + code.toString(16);
                i++;
            } else if(str.charAt(i+1) == '?') {
                result += '\\x7f';
                i++;
            }
            break;
        case '"':
            result += '\\"';
            break;
        default:
            result += str.charAt(i);
        }
    }
    return eval('"' + result + '"');
}
*/

// An alternative to the function with  e v a l ();
// Only support caret notations (^C, ^H, ^U, ^[, ^?, ...)
// and hexadecimal notation (\x1b, \x7f, ...)
// If you want to show \ and ^, use \\ and \^ respectively
function UnEscapeStr(str) {
    var result = '';
    for(var i=0; i<str.length; ++i) {
        switch(str.charAt(i)) {
        case '\\':
            if(i == str.length-1) { // independent \ at the end of the string
                result += '\\';
                break;
            }
            switch(str.charAt(i+1)) {
            case '\\':
                result += '\\\\';
                ++i;
                break;
            case '^':
                result += '^';
                ++i;
                break;
            case 'x':
                if(i > str.length - 4) {
                    result += '\\';
                    break;
                }
                var code = parseInt(str.substr(i+2, 2), 16);
                result += String.fromCharCode(code);
                i += 3;
                break;
            default:
                result += '\\';
            }
            break;
        case '^':
            if(i == str.length-1) { // independent ^ at the end of the string
                result += '^';
                break;
            }
            if('@' <= str.charAt(i+1) && str.charAt(i+1) <= '_') {
                var code = str.charCodeAt(i+1) - 64;
                result += String.fromCharCode(code);
                i++;
            } else if(str.charAt(i+1) == '?') {
                result += '\x7f';
                i++;
            } else {
                result += '^';
            }
            break;
        default:
            result += str.charAt(i);
        }
    }
    return result;
}


// Wrap text within maxLen without hyphenating English words,
// where the maxLen is generally the screen width.
function wrapText(str, maxLen, enterChar) {
    // Divide string into non-hyphenated groups
    // classified as \r, \n, single full-width character, an English word,
    // and space characters in the beginning of original line. (indent)
    // Spaces next to a word group are merged into that group
    // to ensure the start of each wrapped line is a word.
    // FIXME: full-width punctuation marks aren't recognized
    var pattern = /\r|\n|([^\x00-\x7f][,.?!:;]?[\t ]*)|([\x00-\x08\x0b\x0c\x0e-\x1f\x21-\x7f]+[\t ]*)|[\t ]+/g;
    var splited = str.match(pattern);

    var result = '';
    var len = 0;
    for(var i=0; i<splited.length; ++i) {
        // Convert special characters to spaces with the same width
        // and then we can get the width by the length of the converted string
        var grouplen = splited[i].replace(/[^\x00-\x7f]/g,"  ")
                                 .replace(/\t/,"    ")
                                 .replace(/\r|\n/,"")
                                 .length;

        if(splited[i] == '\r' || splited[i] == '\n')
            len = 0;
        if(len + grouplen > maxLen) {
            result += enterChar;
            len = 0;
        }
        result += splited[i];
        len += grouplen;
    }
    return result;
}
