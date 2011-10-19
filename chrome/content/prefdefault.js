var PrefDefaults = {
    'Encoding': (window.navigator.language == 'zh-CN' ? 'gb2312' : 'big5'),
    'Cols': 80,
    'Rows': 24,
    'HAlignCenter': true,
    'VAlignCenter': true,
    'DetectDBCS': true,
    'ShowConnTimer': false,
    'Beep': false,
    'Popup': true,
    'AskForClose': false,
    'AntiIdleTime': 180,
    'AntiIdleStr': '^[[A^[[B',
    'ReconnectTime': 15,
    'PreLoginPrompt': '',
    'PreLogin': '',
    'LoginPrompt': '',
    'Login': '',
    'PasswdPrompt': '',
    'Passwd': '',
    'PostLogin': '',
    'ClearCopiedSel': true,
    'CopyAfterSel': false,
    'KeepSelAtBufUpd': false,
    'TrimTail': true,
    'LineWrap': 78,
    'EscapeString': '^U',
    'TermType': 'VT100',
    'EnterKey': '^M',
    'LineFeed': true,
    'NewTab': false
}

var PrefDefault = 'Encoding';

// the value of an element corresponds to the property of nsILoginInfo
var PrefLoginMgr = {
    'Login': 'username',
    'Passwd': 'password'
}
