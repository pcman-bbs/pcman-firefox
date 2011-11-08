// Draw mouse trails of FireGestures in xul pages
//
// Some part of the code is taken from BBSFox developed by
// Ett Chung <ettoolong@hotmail.com>
// https://addons.mozilla.org/zh-TW/firefox/addon/179388/

function FireGesturesTrail(listener) {
    this.listener = listener;

    if(!this.checkFireGesturesPrefs())
        return;

    this.eventListener = {};
    this.addEventListener();
}

FireGesturesTrail.prototype={
    checkFireGesturesPrefs: function() {
        try {
            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                       .getService(Components.interfaces.nsIPrefService)
                       .getBranch("extensions.firegestures.");
            this.triggerButton = prefs.getIntPref('trigger_button');
            this.suppressAlt = prefs.getBoolPref('suppress.alt');
            this.drawTrail = prefs.getBoolPref('mousetrail');
            this.mousetrailColor = unescape(prefs.getCharPref('mousetrail.color'));
            this.mousetrailSize = prefs.getIntPref('mousetrail.size');
            this.mouseGesturesTime = prefs.getIntPref('gesture_timeout');
        } catch(e) {
            return false;
        }
        return true;
    },

    addEventListener: function() {
        var listener = this.eventListener;

        listener.mouse_down ={
            view: this,
            handleEvent: function(e) {
                this.view.mousedown(e);
            }
        };
        document.addEventListener('mousedown', listener.mouse_down, false);

        listener.mouse_move ={
            view: this,
            handleEvent: function(e) {
                this.view.mousemove(e);
            }
        };
        document.addEventListener('mousemove', listener.mouse_move, false);

        listener.mouse_up ={
            view: this,
            handleEvent: function(e) {
                this.view.mouseup(e);
            }
        };
        document.addEventListener('mouseup', listener.mouse_up, false);

        listener.mouse_menu ={
            view: this,
            handleEvent: function(e) {
                if(this.view.ismouseRightBtnDown)
                    e.preventDefault();
            }
        };
        document.getElementById('topwin').addEventListener('contextmenu', listener.mouse_menu, false);
    },

    removeEventListener: function() {
        var listener = this.eventListener;

        document.removeEventListener('mousedown', listener.mouse_down, false);
        document.removeEventListener('mousemove', listener.mouse_move, false);
        document.removeEventListener('mouseup', listener.mouse_up, false);
        document.getElementById('topwin').removeEventListener('contextmenu', listener.mouse_menu, false);
    },

    mousedown: function(event) {
        if(event.button == 2)
            this.ismouseRightBtnDown=true;

        // Get the recent changes of the prefs of FireGestures
        this.checkFireGesturesPrefs();

        if(!this.drawTrail)
            return;

        if(event.button == this.triggerButton &&
        (!this.suppressAlt || !event.altKey) &&
        event.button != 0)
            this.startTrail(event);
    },

    mousemove: function(event) {
        if(this.ismouseRightBtnDown)
            this.ismouseRightBtnDrag = true;

        if(!this.drawTrail || !this.isDrawing)
            return;

        this.extendTrail(event);

        if(this.mouseGesturesTime)
            this.setGestureTimeout();
    },

    mouseup: function(event) {
        if(event.button == 2) {
            this.ismouseRightBtnDown=false;
            if(!this.ismouseRightBtnDrag)
                this.showContentMenu(event);
            this.ismouseRightBtnDrag=false;
        }

        if(!this.drawTrail || !this.isDrawing)
            return;

        this.endTrail();
    },

    cancelAll: function() {
        if(this.drawTrail && this.isDrawing)
            this.endTrail();

        if(this.mouseGesturesTimeout)
            this.mouseGesturesTimeout.cancel();
        this.mouseGesturesTimeout = null;

        if(this.ismouseRightBtnDown)
            this.ismouseRightBtnDrag = true; // stop content-menu popup
    },

    setGestureTimeout: function() {
        if(this.mouseGesturesTimeout)
            this.mouseGesturesTimeout.cancel();

        var _this=this;
        var func = function() {
            _this.mouseGesturesTimeout = null;
            _this.endTrail();
        }
        this.mouseGesturesTimeout = setTimer(false, func, this.mouseGesturesTime);
    },

    showContentMenu: function(event) {
        // if this.view.ismouseRightBtnDown==true, this function won't work
        var e = event;
        var evt = e.view.document.createEvent("MouseEvents");
        evt.initMouseEvent(
            "contextmenu", e.bubbles, e.cancelable, e.view, e.detail,
            e.screenX, e.screenY, e.clientX, e.clientY,
            e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
            e.button, e.relatedTarget
        );
        e.originalTarget.dispatchEvent(evt);
        e.preventDefault();
    },

    startTrail: function(event) {
        if(this.isDrawing)
            this.endTrail();

        this.isDrawing = true;
        this.trailDots = [];
        this.mouseX = event.pageX;
        this.mouseY = event.pageY;
    },

    extendTrail: function(event) {
        if(!this.isDrawing)
            return;

        var lenX = this.mouseX - event.pageX;
        var lenY = this.mouseY - event.pageY;
        var len = Math.ceil(Math.sqrt(lenX*lenX + lenY*lenY));
        var arg = Math.atan2(lenY, lenX);
        var newDiv = document.createElement('div');
        newDiv.id = 'trailDot' + this.trailDots.length;
        newDiv.style.width = len + 'px';
        newDiv.style.height = this.mousetrailSize + 'px';
        newDiv.style.background = this.mousetrailColor;
        newDiv.style.border = "0px";
        newDiv.style.position = "fixed";
        newDiv.style.zIndex = 10;
        newDiv.style.top = event.pageY + 'px';
        newDiv.style.left = event.pageX + 'px';
        newDiv.style.MozTransform = 'rotate(' + arg + 'rad)';
        newDiv.style.MozTransformOrigin = '0px 0px';
        document.getElementById('input_proxy').parentNode.appendChild(newDiv);
        this.trailDots.push(newDiv);
        this.mouseX = event.pageX;
        this.mouseY = event.pageY;
    },

    endTrail: function() {
        if(!this.isDrawing)
            return;

        var parentNode = document.getElementById('input_proxy').parentNode;
        while(this.trailDots.length > 0)
            parentNode.removeChild(this.trailDots.pop());

        this.mouseX = -1;
        this.mouseY = -1;
        this.isDrawing = false;
    }
}
