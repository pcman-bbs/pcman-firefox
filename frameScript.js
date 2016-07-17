/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*
    This file is originally developed by pdf.js
    https://github.com/mozilla/pdf.js

    Copyright (c) 2011 Mozilla Foundation

    Contributors: Andreas Gal <gal@mozilla.com>
                  Chris G Jones <cjones@mozilla.com>
                  Shaon Barman <shaon.barman@gmail.com>
                  Vivien Nicolas <21@vingtetun.org>
                  Justin D'Arcangelo <justindarc@gmail.com>
                  Yury Delendik
                  Kalervo Kujala
                  Adil Allawi <@ironymark>
                  Jakob Miland <saebekassebil@gmail.com>
                  Artur Adib <aadib@mozilla.com>
                  Brendan Dahl <bdahl@mozilla.com>
                  David Quintana <gigaherz@gmail.com>

    Permission is hereby granted, free of charge, to any person obtaining a
    copy of this software and associated documentation files (the "Software"),
    to deal in the Software without restriction, including without limitation
    the rights to use, copy, modify, merge, publish, distribute, sublicense,
    and/or sell copies of the Software, and to permit persons to whom the
    Software is furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
    THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
    DEALINGS IN THE SOFTWARE.


    Some codes are modified by u881831 <u881831@hotmail.com>
*/

'use strict';

(function contentScriptClosure(content) {

  const RESOURCE_NAME = 'pcmanfx2';

  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;

  Cu.import('resource://gre/modules/Services.jsm');

  function log(str) {
    sendSyncMessage(RESOURCE_NAME + ':Parent:obj', { name: 'log', args: [str] });
  }

  var e10sEnabled = Services.appinfo.processType ===
    Services.appinfo.PROCESS_TYPE_CONTENT;

  // quit or refresh tabs after uninstalling or upgrading this addon
  // created by u881831
  function refreshTabs(close) {
    var loc = content.document.location;
    var protocol = loc.protocol.toLowerCase();
    if (protocol == 'telnet:') {
      if (close)
        loc.href = 'about:blank'; // able to use BACK after reinstalling
      else
        loc.reload();
    }
    // stringbundle is cached by firefox before restarting by default
    Services.strings.flushBundles();
  }

  function startup(aData, aReason) {
    if (typeof(RegisterProtocol) == 'object')
      return;
    Cu.import('resource://' + RESOURCE_NAME + '/RegisterProtocol.js');
    RegisterProtocol.register('telnet', 'TelnetProtocol.js', sendSyncMessage(RESOURCE_NAME + ':Parent:obj', { name: 'addonBaseUrl' }) + 'components/');

    refreshTabs(); // only for upgrading
  }

  function shutdown(aData, aReason) {
    if (typeof(RegisterProtocol) != 'object')
      return;
    RegisterProtocol.unregister('telnet', 'TelnetProtocol.js');
    Cu.unload('resource://' + RESOURCE_NAME + '/RegisterProtocol.js');

    Cu.import('resource://' + RESOURCE_NAME + '/RegisterModule.js');
    RegisterModule.unload(this);
    Cu.unload('resource://' + RESOURCE_NAME + '/RegisterModule.js');

    // quit existing telnet page
    if (aReason != 7 /*ADDON_UPGRADE*/ && aReason != 8 /*ADDON_DOWNGRADE*/ )
      refreshTabs(true); // uninstall
    //FIXME: close preferences dialogs and others opened by this addon
  }

  if (e10sEnabled) {
    startup(null, null);

    var shutdownListener = function(msg) {
      shutdown(null, msg ? msg.data : 0);
      removeMessageListener(RESOURCE_NAME + ':Child:shutdown', shutdownListener);
    };
    addMessageListener(RESOURCE_NAME + ':Child:shutdown', shutdownListener);
  }
})(content);

