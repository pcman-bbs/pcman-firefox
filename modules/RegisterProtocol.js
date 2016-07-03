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

var EXPORTED_SYMBOLS = ["RegisterProtocol"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cm = Components.manager;
const Cu = Components.utils;
const Cr = Components.results;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

// for multiple component registrations. Only the wrapper is written by u881831
function createFactory () {
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

var Factories = {};
var componentsBaseUrl = null;

var RegisterProtocol = {};

RegisterProtocol.register = function(protocol, filename, resourceUrl) {
  if(Factories && Factories[protocol])
    return false;
  // Load the component and register it.
  if(resourceUrl)
     componentsBaseUrl = resourceUrl;
  Cu.import(componentsBaseUrl + filename);
  Factories[protocol] = createFactory();
  Factories[protocol].register(Protocol);
  return true;
};

RegisterProtocol.unregister = function(protocol, filename) {
  if(!Factories || !Factories[protocol])
    return false;
  // Remove the contract/component.
  Factories[protocol].unregister();
  delete Factories[protocol];
  // Unload the protocol handler
  Cu.unload(componentsBaseUrl + filename);
  if(!Object.keys(Factories).length)
    componentsBaseUrl = null;
  return true;
};
