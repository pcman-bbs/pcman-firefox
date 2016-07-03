// Listen the input events and handle the typed words

'use strict';

var EXPORTED_SYMBOLS = ["InputHandler"];

function InputHandler(view) {
    this.view = view;
    this.isComposing = false; // Fix for FX 12+

    this.load();
}

InputHandler.prototype = {
    load: function() {
        var topwin = this.view.listener.global;
        var input = this.view.input;

        this.composition_start = {
            view: this,
            handleEvent: function(e) {
                this.view.compositionStart(e);
            }
        };
        input.addEventListener('compositionstart', this.composition_start, false);

        this.composition_end = {
            view: this,
            handleEvent: function(e) {
                this.view.compositionEnd(e);
            }
        };
        input.addEventListener('compositionend', this.composition_end, false);

        this.key_down = {
            view: this.view,
            handleEvent: function(e) {
                this.view.onkeyDown(e);
            }
        };
        topwin.addEventListener('keydown', this.key_down, false);

        this.text_input = {
            view: this,
            handleEvent: function(e) {
                this.view.textInput(e);
            }
        };
        input.addEventListener('input', this.text_input, false);
    },

    unload: function() {
        var topwin = this.view.listener.global;
        var input = this.view.input;
        input.removeEventListener('compositionstart', this.composition_start, false);
        input.removeEventListener('compositionend', this.composition_end, false);
        topwin.removeEventListener('keydown', this.key_down, false);
        input.removeEventListener('input', this.text_input, false);
        this.compositionEnd({ target: {} }); // Hide the input proxy
    },

    compositionStart: function(e) {
        this.isComposing = true; // Fix for FX 12+
        this.view.onCompositionStart(e); // Show the input proxy
    },

    compositionEnd: function(e) {
        this.view.onCompositionEnd(e); // Hide the input proxy
        this.isComposing = false; // Fix for FX 12+

        // For compatibility of FX 10 and before
        this.textInput(e);
    },

    textInput: function(e) {
        if (this.isComposing) // Fix for FX 12+; use e.isComposing in FX 31+
            return;
        if (e.target.value) {
            this.view.onTextInput(e.target.value);
        }
        e.target.value = '';
    }
};

