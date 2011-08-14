var PrefDefaults = {
    'Encoding': (window.navigator.language == 'zh-CN' ? 'gb2312' : 'big5'),
    'Cols': 80,
    'Rows': 24,
    'LineWrap': 78,
    'DetectDBCS': true,
    'NewTab': false,
    'LineFeed': true,
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
    'PostLogin': ''
}

var PrefDefault = 'Encoding';

// the value of an element corresponds to the property of nsILoginInfo
var PrefLoginMgr = {
    'Login': 'username',
    'Passwd': 'password'
}
