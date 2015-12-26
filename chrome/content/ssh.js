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

    this.login = login || 'bbs';
    this.password = password || 'bbs';

    this.privatekey = '';
    this.width = conn.listener.prefs.Cols;
    this.height = conn.listener.prefs.Rows;

    this.transport = null;
    this.client = null;
    this.shell = null;

    this.initial();
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

    input: function(str) {
        if(!this.enable || this.recvRaw)
            return str;
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
