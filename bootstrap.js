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

const RESOURCE_NAME = 'pcmanfx2';

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import('resource://gre/modules/Services.jsm');

function log(str) {
  Cu.import("resource://gre/modules/Console.jsm");
  console.log(str + '\n');
}

var addonBaseUrl = null;
var e10sEnabled = false;

function exec(msg) {
  switch (msg.data.name) {
    case 'log':
      return log.apply(null, msg.data.args);
    case 'addonBaseUrl':
      return addonBaseUrl;
    default:
  }
}

// quit or refresh tabs after uninstalling or upgrading this addon
// created by u881831
function refreshTabs(close) {
  var browserEnumerator = Services.wm.getEnumerator("navigator:browser");
  while (browserEnumerator.hasMoreElements()) {
    var tabsBrowser = browserEnumerator.getNext().gBrowser;
    for (var index = tabsBrowser.browsers.length - 1; index >= 0; index--) {
      var doc = tabsBrowser.getBrowserAtIndex(index).contentDocument;
      if (!doc) // null in multiprocess firefox
        break;
      var loc = doc.location;
      var protocol = loc.protocol.toLowerCase();
      if (protocol == 'telnet:') {
        if (close)
          loc.href = 'about:blank'; // able to use BACK after reinstalling
        else
          loc.reload();
      }
    }
  }
  // stringbundle is cached by firefox before restarting by default
  Services.strings.flushBundles();
}

// As of Firefox 13 bootstrapped add-ons don't support automatic registering and
// unregistering of resource urls and components/contracts. Until then we do
// it programatically. See ManifestDirective ManifestParser.cpp for support.

function startup(aData, aReason) {
  // Setup the resource url.
  var ioService = Services.io;
  var resProt = ioService.getProtocolHandler('resource')
    .QueryInterface(Ci.nsIResProtocolHandler);
  var aliasURI = ioService.newURI('modules/', 'UTF-8', aData.resourceURI);
  resProt.setSubstitution(RESOURCE_NAME, aliasURI);

  // Load the component and register it.
  addonBaseUrl = aData.resourceURI.spec;

  Cu.import(addonBaseUrl + 'modules/RegisterProtocol.js');
  RegisterProtocol.register('telnet', 'TelnetProtocol.js', addonBaseUrl + 'components/');
  try {
    let globalMM = Cc['@mozilla.org/globalmessagemanager;1']
      .getService(Ci.nsIFrameScriptLoader);
    globalMM.loadFrameScript(addonBaseUrl + 'frameScript.js', true);
    globalMM.addMessageListener(RESOURCE_NAME + ':Parent:obj', exec);
    e10sEnabled = true;
  } catch (ex) {}

  refreshTabs(); // only for upgrading
}

function shutdown(aData, aReason) {
  if (aReason == APP_SHUTDOWN)
    return;

  if (e10sEnabled) {
    let globalMM = Cc['@mozilla.org/globalmessagemanager;1']
      .getService(Ci.nsIMessageBroadcaster);
    globalMM.broadcastAsyncMessage(RESOURCE_NAME + ':Child:shutdown', aReason);
    globalMM.removeMessageListener(RESOURCE_NAME + ':Parent:obj', exec);
    globalMM.removeDelayedFrameScript(addonBaseUrl + 'frameScript.js');
  }

  RegisterProtocol.unregister('telnet', 'TelnetProtocol.js');
  Cu.unload(addonBaseUrl + 'modules/RegisterProtocol.js');

  Cu.import(addonBaseUrl + 'modules/RegisterModule.js');
  RegisterModule.unload(this);
  Cu.unload(addonBaseUrl + 'modules/RegisterModule.js');

  var ioService = Services.io;
  var resProt = ioService.getProtocolHandler('resource')
    .QueryInterface(Ci.nsIResProtocolHandler);
  // Remove the resource url.
  resProt.setSubstitution(RESOURCE_NAME, null);

  // quit existing telnet page
  if (aReason != ADDON_UPGRADE && aReason != ADDON_DOWNGRADE)
    refreshTabs(true); // uninstall
  //FIXME: close preferences dialogs and others opened by this addon
}

function install(aData, aReason) {}

function uninstall(aData, aReason) {}

