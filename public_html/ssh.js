// Handle SSH encode and decode on a socket
// SSH function is implemented by paramekojs with LGPL 2.0 by Mime Cuvalo
// https://github.com/mimecuvalo/paramikojs

'use strict';

var EXPORTED_SYMBOLS = ["SSH"];

function SSH(conn) {
    if (!conn) // use unencrypted connection
        return;
    this.enable = true;
    this.sendRaw = false;
    this.recvRaw = false;
    this.callback = null;

    this.host = conn.host;
    this.port = conn.port;
    this.keepAlive = null;

    this.login = ''; // to be override
    this.password = ''; // to be override
    this.loginStr = '';
    this.passStr = '';

    this.banner = '';

    this.privatekey = '';
    this.width = 80; // to be override
    this.height = 24; // to be overfide

    this.lib = conn.listener.global.paramikojs;
    this.getLocalFilePath = function(filename) {
        return conn.listener.ui.getLocalFilePath(filename);
    };
    this.transport = null;
    this.client = null;
    this.shell = null;
    this.bufferOut = '';
}

SSH.prototype = {
    initial: function() {
        var self = this;
        var shell_success = function(shell) {
            self.shell = shell;
            self.callback('loginAccepted'); // userPass accepted
        };

        this.client = new this.lib.SSHClient();
        this.client.set_missing_host_key_policy(new this.lib.AskPolicy());
        this.client.load_host_keys(this.getLocalFilePath('known_hosts'));

        var auth_success = function() {
            self.client.invoke_shell('xterm-256color', self.width, self.height, shell_success);
        };

        var write = function(str) {
            self.sendRaw = true;
            self.callback('send', str);
            self.sendRaw = false;
        };

        this.transport = this.client.connect({
                version: '20141113',
                onSftpCache: function(buffer, new_key, cacheCallback) {
                    cacheCallback('n');
                }
            },
            // This version of paramekojs is committed at 2014/11/13
            // 'y': cache key; 'n': don't cache; '': don't connect
            write, auth_success, this.host, this.port,
            this.login, this.password, null, this.privatekey);
    },

    recv: function() { // for asyncRead, not used yet
        var str = this.input();
        if (!str)
            return;
        this.recvRaw = true;
        this.callback('recv', str);
        this.recvRaw = false;
    },

    send: function() { // for asyncWrite, not used yet
        var str = this.output();
        if (!str)
            return;
        this.sendRaw = true;
        this.callback('send', str);
        this.sendRaw = false;
    },

    isUserPassReady: function(s) {
        if (this.login && this.password) {
            this.bufferOut += s;
            return true;
        }

        var _this = this;
        var screen = function(str) {
            if (s.length > 1)
                return;
            _this.recvRaw = true;
            _this.callback('recv', str);
            _this.recvRaw = false;
        };

        if (!this.login) {
            if (!this.loginStr)
                screen('\x1b[m\x1b[2Jlogin as: ');
            switch (s.charAt(0)) {
                case '\r': // Enter
                    if (!this.loginStr) {
                        this.callback('onDisconnect');
                        return false;
                    }
                    this.login = this.loginStr;
                    this.loginStr = '';
                    screen('\r\n' + this.login + '@' + this.host + '\'s password:');
                    break;
                case '\b': // Back
                    this.loginStr = this.loginStr.replace(/.$/, '');
                    screen('\b\x1b[K');
                    break;
                default:
                    if (s.charAt(0).search(/[^0-9A-z_a-z]/) > -1)
                        return false; // Not supported char
                    this.loginStr += s.charAt(0);
                    screen(s.charAt(0));
            }
            return s.charAt(1) ? this.isUserPassReady(s.substr(1)) : false;
        }

        switch (s.charAt(0)) {
            case '\r': // Enter
                if (!this.passStr) {
                    this.login = '';
                    screen('\x1b[m\x1b[2Jlogin as: ');
                    break;
                }
                this.password = this.passStr;
                this.passStr = '';
                screen('\x1b[2J');
                return true;
            case '\b': // Back
                this.passStr = this.passStr.replace(/.$/, '');
                break;
            default:
                if (s.charAt(0).search(/[^0-9A-z_a-z]/) > -1)
                    return false; // Not supported char
                this.passStr += s.charAt(0);
        }
        return s.charAt(1) ? this.isUserPassReady(s.substr(1)) : false;
    },

    isSSH: function(str) {
        this.banner += str;
        str = this.banner;
        if (!str)
            return '';
        if (str.length < 9 && str.search(/[^0-9A-z_a-z\-]/) == -1) {
            if (str.length >= 4 && str.substr(0, 4) == 'SSH-')
                return '';
            if (str.length < 4 && str == ('SSH-').substr(0, str.length))
                return '';
        }
        if (str.indexOf('SSH-2.0-') != 0 && str.indexOf('SSH-1.99-') != 0) {
            this.enable = false; // use unencrypted connection
            this.callback('recv', str);
            return '';
        }
        return str;
    },

    input: function(str) {
        if (!this.enable || this.recvRaw)
            return str;
        if (!this.client) {
            str = this.isSSH(str);
            if (!str || !this.isUserPassReady(''))
                return ''; // waiting next message or unencrypted connection
            this.banner = '';
            this.initial();
        }
        try {
            this.transport.fullBuffer += str; // read data

            if (!this.gotWelcomeMessage && this.transport.fullBuffer.indexOf('\n') == this.transport.fullBuffer.length - 1) {
                this.callback('onConnected');
            }

            if (str) // false as recall this function for async reading
                this.transport.run();

            if (!this.shell) // authorizing
                return '';
        } catch (ex) {
            if (ex instanceof this.lib.ssh_exception.AuthenticationException) {
                this.client.legitClose = true;
                this.callback('loginDenied', ex.message); // userPass denied
                return '';
            }
            this.callback('onDisconnect');
            return '';
        }

        var stdin = '';
        try {
            if (!this.shell || this.shell.closed) {
                this.callback('onDisconnect');
                return '';
            }
            stdin = this.shell.recv(65536);
            while (this.shell.recv_ready()) // break as data are read thoroughly
                stdin += this.shell.recv(65536);
        } catch (ex) {
            if (ex instanceof this.lib.ssh_exception.WaitException) {
                // fall through to get stderr message
            } else {
                throw (ex);
            }
        }

        var stderr = '';
        try {
            stderr = this.shell.recv_stderr(65536);
            while (this.shell.recv_stderr_ready()) // break as data are read thoroughly
                stderr += this.shell.recv_stderr(65536);
        } catch (ex) {
            if (ex instanceof this.lib.ssh_exception.WaitException) {
                // fall through for data are read thoroughly
            } else {
                throw (ex);
            }
        }
        if (stderr) {
            var logger = this.lib.util.get_logger();
            logger.log(null, 'STDERR: ' + stderr);
        }

        // TODO: call this.recv() after a certain interval
        // Maybe the received data is splitted, but
        // the last part may flush this.shell.in_buffer

        if (stdin && this.bufferOut) // client ready and buffer unflushed
            this.callback('send', ''); // flush bufferOut

        return stdin ? stdin : '';
    },

    output: function(str) {
        if (!this.enable || this.sendRaw)
            return str;
        if (!this.client) {
            if (this.isUserPassReady(str))
                this.input('');
            return '';
        }
        this.bufferOut += str;
        while (this.bufferOut.length > 0) {
            try {
                var n = this.shell.send(this.bufferOut);
            } catch (ex) {
                if (ex instanceof this.lib.ssh_exception.WaitException) {
                    // TODO: call this.send() after a certain interval
                    // or when this.transport.clear_to_send becomes true
                    // Maybe key negotiation, traffic is paused both ways
                    // when the session hits a certain number of packets or
                    // bytes sent or received, remote side will renegotiate
                    /*
                    var _this = this;
                    var clear_to_send = this.transport.clear_to_send;
                    Object.defineProperty(this.transport, 'clear_to_send', {
                        get: function() { return clear_to_send; },
                        set: function(newValue) {
                            clear_to_send = newValue;
                            if (clear_to_send && _this.bufferOut.length > 0)
                                _this.send();
                        },
                        enumerable: true,
                        configurable: true
                    });
                    */
                } else {
                    throw (ex);
                }
            }
            if (n <= 0) { // eof
                break;
            }
            this.bufferOut = this.bufferOut.substring(n);
        }
        return '';
    },

    sendNaws: function(str) {
        if (!this.enable)
            return str;
        var cols = str.charCodeAt(3) * 256 + str.charCodeAt(4);
        var rows = str.charCodeAt(5) * 256 + str.charCodeAt(6);
        this.shell.resize_pty(cols, rows);
        return '';
    },

    close: function(legitClose) {
        if (!this.enable)
            return;
        if (this.client) {
            this.client.close(legitClose);
            this.login = '';
            this.password = '';
            this.transport = null;
            this.client = null;
            this.shell = null;
            this.bufferOut = '';
        }
    }
};

