// Draw mouse trails of FireGestures in xul pages
//
// Some part of the code is taken from BBSFox developed by
// Ett Chung <ettoolong@hotmail.com>
// https://addons.mozilla.org/zh-TW/firefox/addon/179388/

function FireGesturesTrail(listener) {
    this.listener = listener;

    if(!this.checkFireGesturesPrefs())
        return;

    this.rightClick = 0;

    this.gesture = '';
    //FIXME: add these settings to the preferences page
    this.gestureMap = {
        U: 'Arrow Up',
        R: 'Arrow Right',
        D: 'Arrow Down',
        L: 'Arrow Left',
        LU: 'Home',
        LD: 'End',
        RU: 'Page Up',
        RD: 'Page Down'
    }
    this.gestureLength = 0;

    this.eventListener = {};
    this.addEventListener();
}

FireGesturesTrail.prototype={
    checkFireGesturesPrefs: function() {
        try {
/*
            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                       .getService(Components.interfaces.nsIPrefService)
                       .getBranch("extensions.firegestures.");
            this.triggerButton = prefs.getIntPref('trigger_button');
            this.suppressAlt = prefs.getBoolPref('suppress.alt');
            this.drawTrail = prefs.getBoolPref('mousetrail');
            this.mousetrailColor = unescape(prefs.getCharPref('mousetrail.color'));
            this.mousetrailSize = prefs.getIntPref('mousetrail.size');
            this.mouseGesturesTime = prefs.getIntPref('gesture_timeout');
*/
            //FIXME: add these settings to the preferences page
            this.triggerButton = 2;
            this.suppressAlt = false;
            this.drawTrail = true;
            this.mousetrailColor = '#33FF33';
            this.mousetrailSize = 2;
            this.mouseGesturesTime = 3000;
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
                if(this.view.hideMenu)
                    e.preventDefault();
            }
        };
        document.getElementById('topwin').addEventListener('contextmenu', listener.mouse_menu, false);
    },

    removeEventListener: function() {
        if(!this.eventListener) return;

        var listener = this.eventListener;
        document.removeEventListener('mousedown', listener.mouse_down, false);
        document.removeEventListener('mousemove', listener.mouse_move, false);
        document.removeEventListener('mouseup', listener.mouse_up, false);
        document.getElementById('topwin').removeEventListener('contextmenu', listener.mouse_menu, false);
        delete this.eventListener;
    },

    mousedown: function(event) {
        if(Date.now() - this.rightClick > 500) { // workaround for GC in linux
            if(this.triggerButton == event.button)
                this.hideMenu=true;
            this.rightClick = Date.now();
        } else {
            this.hideMenu=false;
            return; // show menu and don't draw trail
        }

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
        if(!this.drawTrail || !this.isDrawing)
            return;

        this.extendTrail(event);

        if(this.mouseGesturesTime)
            this.setGestureTimeout();
    },

    mouseup: function(event) {
        if(!this.hasTrail && event.button == this.triggerButton)
            this.showContentMenu(event);
        this.hasTrail = false; // for terminated trail

        if(!this.drawTrail || !this.isDrawing)
            return;

        this.endTrail(true);
    },

    cancelAll: function() {
        if(this.drawTrail && this.isDrawing) {
            this.endTrail();
            this.hasTrail = true; // stop content-menu popup
        }

        if(this.mouseGesturesTimeout)
            this.mouseGesturesTimeout.cancel();
        this.mouseGesturesTimeout = null;
    },

    setGestureTimeout: function() {
        if(this.mouseGesturesTimeout)
            this.mouseGesturesTimeout.cancel();

        var _this=this;
        var func = function() {
            _this.mouseGesturesTimeout = null;
            _this.endTrail();
            _this.hasTrail = true; // stop content-menu popup
        }
        this.mouseGesturesTimeout = setTimer(false, func, this.mouseGesturesTime);
    },

    showContentMenu: function(event) {
        this.hideMenu = false;

        var e = event;
        if(!e || !e.originalTarget) // not firefox
            return; // don't prevent default
        var evt = e.view.document.createEvent("MouseEvents");
        evt.initMouseEvent(
            "contextmenu", e.bubbles, e.cancelable, e.view, e.detail,
            e.screenX, e.screenY, e.clientX, e.clientY,
            e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
            e.button, e.relatedTarget
        );
        e.originalTarget.dispatchEvent(evt); // not work due to the bug of GC
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

        if(this.trailDots.length >= 1) {
            this.hasTrail = true;
            this.rightClick = 0;
        }

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
        newDiv.style.transform = 'rotate(' + arg + 'rad)';
        //newDiv.style.MozTransform = 'rotate(' + arg + 'rad)';
        newDiv.style.WebkitTransform = 'rotate(' + arg + 'rad)';
        newDiv.style.transformOrigin = '0px 0px';
        //newDiv.style.MozTransformOrigin = '0px 0px';
        newDiv.style.WebkitTransformOrigin = '0px 0px';
        document.getElementById('input_proxy').parentNode.appendChild(newDiv);
        this.trailDots.push(newDiv);
        this.mouseX = event.pageX;
        this.mouseY = event.pageY;

        if(this.hasTrail)
            this.showTrail(arg, len);
    },

    endTrail: function(execCommand) {
        if(!this.isDrawing)
            return;

        var parentNode = document.getElementById('input_proxy').parentNode;
        while(this.trailDots.length > 0)
            parentNode.removeChild(this.trailDots.pop());

        this.mouseX = -1;
        this.mouseY = -1;
        this.isDrawing = false;
        this.hasTrail = false;

        var gesture = this.showTrail();
        var command = this.gestureMap[gesture];
        if(execCommand && command)
            this.listener.robot.execExtCommand(command);
    },

    showTrail: function(arg, len) {
        if(typeof(arg) == 'undefined') {
            var gesture = this.gesture;
            this.gesture = '';
            var gesturesDiv = document.getElementById('gesturesDiv');
            if(!gesturesDiv)
                return;
            this.listener.view.input.parentNode.removeChild(gesturesDiv);
            return gesture;
        }

        if(!document.getElementById('gesturesDiv')) {
            var gesturesDiv = document.createElement('div');
            this.listener.view.input.parentNode.appendChild(gesturesDiv);
            gesturesDiv.id = 'gesturesDiv';
            gesturesDiv.style.background = 'white';
            gesturesDiv.style.position = 'fixed';
            gesturesDiv.style.bottom = '5px';
            gesturesDiv.style.left = '5px';
        } else {
            var gesturesDiv = document.getElementById('gesturesDiv');
        }

        if(arg > 3/4*Math.PI || -3/4*Math.PI >= arg)
            var gesture = 'R';
        else if(-3/4*Math.PI < arg && arg <= -1/4*Math.PI)
            var gesture = 'D';
        else if(-1/4*Math.PI < arg && arg <= 1/4*Math.PI)
            var gesture = 'L';
        else if(1/4*Math.PI < arg && arg <= 3/4*Math.PI)
            var gesture = 'U';

        if(gesture == this.preGesture)
            this.gestureLength += len;
        else
            this.gestureLength = len;
        this.preGesture = gesture;

        if(this.gestureLength > 10) {
            this.gestureLength = 0;
            if(gesture != this.gesture.substr(-1))
                this.gesture += gesture;
        }

        gesturesDiv.textContent = this.gesture + ': ' + this.gestureMap[this.gesture];
    }
}
