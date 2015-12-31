// Handle SSH encode and decode on a socket
// SSH function is implemented by paramekojs with LGPL 2.0 by Mime Cuvalo
// https://github.com/mimecuvalo/paramikojs

function SSH(conn, login, password, callback) {
    if(!conn) // use unencrypted connection
        return;
    this.enable = true;
    this.sendRaw = false;
    this.recvRaw = false;
    this.listener = conn;
    this.callback = callback;

    this.host = conn.host;
    this.port = conn.port;
    this.keepAlive = null;

    this.login = login;
    this.password = password;
    this.loginStr = '';
    this.passStr = '';

    this.banner = '';

    this.privatekey = '';
    this.width = conn.listener.prefs.Cols;
    this.height = conn.listener.prefs.Rows;

    this.transport = null;
    this.client = null;
    this.shell = null;
}

SSH.prototype={
    initial: function() {
        var self = this;
        var shell_success = function(shell) {
            self.shell = shell;
            self.callback('loginAccepted'); // userPass accepted
        };

        this.client = new paramikojs.SSHClient();
        this.client.set_missing_host_key_policy(new paramikojs.AutoAddPolicy());
        var host_keys = 'known_hosts';
        if ((Components && Components.classes)) { // Mozilla
            var file = Components.classes["@mozilla.org/file/directory_service;1"].createInstance(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsILocalFile);
            file.append(host_keys);
            host_keys = file.path;
        }
        this.client.load_host_keys(host_keys);

        var auth_success = function() {
            self.client.invoke_shell('xterm-256color', self.width, self.height, shell_success);
        };

        var write = function(str) {
            self.sendRaw = true;
            self.callback('send', str);
            self.sendRaw = false;
        };

        this.transport = this.client.connect(
            {version: '20141113', onSftpCache: function(buffer, new_key, cacheCallback) {cacheCallback('n');}},
            // This version of paramekojs is committed at 2014/11/13
            // 'y': cache key; 'n': don't cache; '': don't connect
            write, auth_success, this.host, this.port, 
            this.login, this.password, null, this.privatekey);
    },

    recv: function() { // for asyncRead, not used yet
        var str = this.input();
        this.recvRaw = true;
        this.callback('recv', str);
        this.recvRaw = false;
        // TODO: recall this func periodically to imitate Firessh, should it?
    },

    isUserPassReady: function(s) {
        if(this.login && this.password)
            return true;

        var _this = this;
        var screen = function(str) {
            _this.recvRaw = true;
            _this.callback('recv', str);
            _this.recvRaw = false;
        };

        if(!this.login) {
            if(!this.loginStr)
                screen('\x1b[m\x1b[2Jlogin as: ');
            switch(s) {
            case '\r': // Enter
                if(!this.loginStr) {
                    this.callback('onDisconnect');
                    return false;
                }
                this.login = this.loginStr;
                this.loginStr = '';
                screen('\r\n'+this.login+'@'+this.host+'\'s password:');
                return false;
            case '\b': // Back
                this.loginStr = this.loginStr.replace(/.$/,'');
                screen('\b\x1b[K');
                return false;
            default:
                if(s.search(/[^0-9A-z_a-z]/) > -1) // Not supported char
                    return false;
                this.loginStr += s;
                screen(s);
                return false;
            }
        }

        switch(s) {
        case '\r': // Enter
            if(!this.passStr) {
                this.login = '';
                screen('\x1b[m\x1b[2Jlogin as: ');
                return false;
            }
            this.password = this.passStr;
            this.passStr = '';
            screen('\x1b[2J');
            return true;
        case '\b': // Back
            this.passStr = this.passStr.replace(/.$/,'');
            return false;
        default:
            if(s.search(/[^0-9A-z_a-z]/) > -1) // Not supported char
                return false;
            this.passStr += s;
            return false;
        }
    },

    isSSH: function(str) {
        this.banner += str;
        str = this.banner;
        if(!str)
            return '';
        if(str.length < 9 && str.search(/[^0-9A-z_a-z\-]/) == -1) {
            if(str.length >= 4 && str.substr(0, 4) == 'SSH-')
                return '';
            if(str.length < 4 && str == ('SSH-').substr(0, str.length))
                return '';
        }
        if(str.indexOf('SSH-2.0-') != 0 && str.indexOf('SSH-1.99-') != 0) {
            this.enable = false; // use unencrypted connection
            this.callback('recv', str);
            return '';
        }
        return str;
    },

    input: function(str) {
        if(!this.enable || this.recvRaw)
            return str;
        if(!this.client) {
            str = this.isSSH(str);
            if(!str || !this.isUserPassReady(''))
                return ''; // waiting next message or unencrypted connection
            this.banner = '';
            this.initial();
        }
        try {
            this.transport.fullBuffer += str;  // read data

            if (!this.gotWelcomeMessage && this.transport.fullBuffer.indexOf('\n') == this.transport.fullBuffer.length - 1) {
                this.callback('onConnected');
            }

            if (str) // false as recall this function for async reading
                this.transport.run();

            if (!this.shell) // authorizing
                return '';
        } catch(ex) {
            if (ex instanceof paramikojs.ssh_exception.AuthenticationException) {
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
            while(true) // break as data are read thoroughly
                stdin += this.shell.recv(65536);
        } catch(ex) {
            if (ex instanceof paramikojs.ssh_exception.WaitException) {
                // data are read thoroughly
            } else {
               throw(ex);
            }
        }

        var stderr = '';
        try {
            stderr = this.shell.recv_stderr(65536);
            while(true) // break as data are read thoroughly
                stderr += this.shell.recv_stderr(65536);
        } catch(ex) {
            if (ex instanceof paramikojs.ssh_exception.WaitException) {
                // data are read thoroughly
            } else {
               throw(ex);
            }
        }
        var logger = paramikojs.util.get_logger();
        logger.log(null, 'STDERR: ' + stderr);

        if (stdin) {
            return stdin;
        }
        return '';
    },

    output: function(str) {
        if(!this.enable || this.sendRaw)
            return str;
        if(!this.client) {
            if(this.isUserPassReady(str))
                this.input('');
            return '';
        }
        if(str)
            this.shell.send(str);
        return '';
    },

    sendNaws: function(str) {
        if(!this.enable)
            return str;
        var cols = str.charCodeAt(3)*256+str.charCodeAt(4);
        var rows = str.charCodeAt(5)*256+str.charCodeAt(6);
        this.shell.resize_pty(cols, rows);
        return '';
    },

    close: function(legitClose) {
        if(!this.enable)
            return;
        this.client.close(legitClose);
    }
}
