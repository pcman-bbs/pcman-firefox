function Robot(listener) {
    this.listener = listener;

    this.replyCount = [];
}

Robot.prototype={
    hasAutoReply: function() {
        for(var i=0; i<5; ++i) {
            if(this.listener.prefs['ReplyPrompt' + i] &&
            this.listener.prefs['ReplyString' + i])
                return true;
        }
        return false;
    },

    checkAutoReply: function(row) {
        var line = this.listener.buf.getRowText(row, 0, this.listener.buf.cols);
        var Encoding = this.listener.prefs.Encoding;
        for(var i=0; i<5; ++i) {
            //FIXME: implement the UI of limiting the number of reply times
            // Reset the count if the strings change? 
            var replyStart = 1; // this.listener.prefs.['ReplyStart' + i];
            var replyLimit = 1; // this.listener.prefs.['ReplyLimit' + i];

            var replyPrompt =
                this.listener.prefs['ReplyPrompt' + i];
            var replyString =
                UnEscapeStr(this.listener.prefs['ReplyString' + i]);
            if(!this.replyCount[i])
                this.replyCount[i] = 0;

            if(!replyPrompt) // Stop auto-reply without prompt string
                continue;

            if(line.indexOf(replyPrompt) < 0) // Not found
                continue;

            ++this.replyCount[i];

            if(this.replyCount[i] < replyStart)
                continue;

            // setting the limit as negative numbers means unlimited
            if(replyLimit >= 0 && this.replyCount[i] >= replyStart + replyLimit)
                continue;

            this.listener.conn.convSend(replyString, Encoding);
            break; // Send only one string at the same time
        }
    },

    // Modified from pcmanx-gtk2
    initialAutoLogin: function() {
        this.listener.prefs.load(true); // Update Login and Passwd
        this.loginPrompt = [
            this.listener.prefs.PreLoginPrompt,
            this.listener.prefs.LoginPrompt,
            this.listener.prefs.PasswdPrompt];
        this.loginStr = [
            UnEscapeStr(this.listener.prefs.PreLogin),
            UnEscapeStr(this.listener.prefs.Login),
            UnEscapeStr(this.listener.prefs.Passwd),
            UnEscapeStr(this.listener.prefs.PostLogin)];
        if(this.loginStr[1])
            this.autoLoginStage = this.loginStr[0] ? 1 : 2;
        else if(this.loginStr[2]) this.autoLoginStage = 3;
        else this.autoLoginStage = 0;
    },

    // Modified from pcmanx-gtk2
    checkAutoLogin: function(row) {
        if(this.autoLoginStage > 3 || this.autoLoginStage < 1) {
            this.autoLoginStage = 0;
            return;
        }

        var line = this.listener.buf.getRowText(row, 0, this.listener.buf.cols);
        if(line.indexOf(this.loginPrompt[this.autoLoginStage - 1]) < 0)
            return;

        var Encoding = this.listener.prefs.Encoding;
        var EnterKey = UnEscapeStr(this.listener.prefs.EnterKey);
        this.listener.conn.convSend(this.loginStr[this.autoLoginStage - 1] + EnterKey, Encoding);

        if(this.autoLoginStage == 3) {
            if(this.loginStr[3])
                this.listener.conn.convSend(this.loginStr[3], Encoding);
            this.autoLoginStage = 0;
            return;
        }

        ++this.autoLoginStage;
    }
}
