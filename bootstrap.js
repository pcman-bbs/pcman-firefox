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

let Cc = Components.classes;
let Ci = Components.interfaces;
let Cm = Components.manager;
let Cu = Components.utils;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

function log(str) {
  Services.console.logStringMessage(str + '\n');
}

// for multiple component registrations. Only the wrapper is written by u881831
function createFactory() {
  // Register/unregister a constructor as a component.
  let Factory = {
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIFactory]),
    _targetConstructor: null,

    register: function register(targetConstructor) {
      this._targetConstructor = targetConstructor;
      var proto = targetConstructor.prototype;
      var registrar = Cm.QueryInterface(Ci.nsIComponentRegistrar);
      registrar.registerFactory(proto.classID, proto.classDescription,
                                proto.contractID, this);
    },

    unregister: function unregister() {
      var proto = this._targetConstructor.prototype;
      var registrar = Cm.QueryInterface(Ci.nsIComponentRegistrar);
      registrar.unregisterFactory(proto.classID, this);
      this._targetConstructor = null;
    },

    // nsIFactory
    createInstance: function createInstance(aOuter, iid) {
      if (aOuter !== null)
        throw Cr.NS_ERROR_NO_AGGREGATION;
      return (new (this._targetConstructor)).QueryInterface(iid);
    },

    // nsIFactory
    lockFactory: function lockFactory(lock) {
      // No longer used as of gecko 1.7.
      throw Cr.NS_ERROR_NOT_IMPLEMENTED;
    }
  };
  return Factory;
}

let Factories = {};
let protocolHandlerUrl = null;

// quit or refresh tabs after uninstalling or upgrading this addon
// created by u881831
function refreshTabs(close) {
  var browserEnumerator = Cc["@mozilla.org/appshell/window-mediator;1"]
                            .getService(Ci.nsIWindowMediator)
                            .getEnumerator("navigator:browser");
  while (browserEnumerator.hasMoreElements()) {
    var tabsBrowser = browserEnumerator.getNext().gBrowser;
    for (var index = tabsBrowser.browsers.length-1; index >= 0; index--) {
      var loc = tabsBrowser.getBrowserAtIndex(index).contentDocument.location;
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
  Cc["@mozilla.org/intl/stringbundle;1"]
    .getService(Ci.nsIStringBundleService)
    .flushBundles();
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
  protocolHandlerUrl = aData.resourceURI.spec + 'components/TelnetProtocol.js';
  Cu.import(protocolHandlerUrl);
  Factories['telnet'] = createFactory();
  Factories['telnet'].register(Protocol);
  refreshTabs(); // only for upgrading
}

function shutdown(aData, aReason) {
  if (aReason == APP_SHUTDOWN)
    return;
  var ioService = Services.io;
  var resProt = ioService.getProtocolHandler('resource')
                  .QueryInterface(Ci.nsIResProtocolHandler);
  // Remove the resource url.
  resProt.setSubstitution(RESOURCE_NAME, null);
  // Remove the contract/component.
  Factories['telnet'].unregister();
  // Unload the protocol handler
  Cu.unload(protocolHandlerUrl);
  protocolHandlerUrl = null;
  // quit existing telnet page
  if(aReason != ADDON_UPGRADE && aReason != ADDON_DOWNGRADE)
    refreshTabs(true); // uninstall
  //FIXME: close preferences dialogs and others opened by this addon
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}

