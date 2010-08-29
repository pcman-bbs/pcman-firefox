/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla.
 *
 * The Initial Developer of the Original Code is IBM Corporation.
 * Portions created by IBM Corporation are Copyright (C) 2004
 * IBM Corporation. All Rights Reserved.
 *
 * Contributor(s):
 *   Darin Fisher <darin@meer.net>
 *   Doron Rosenberg <doronr@us.ibm.com>
 *   Hong Jen Yee (PCMan) <pcman.tw@gmail.com> 
 *   Hsiao-Ting Yu <sst.dreams@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// Test protocol related
const kSCHEME = "telnet";
// Mozilla defined
const kSIMPLEURI_CONTRACTID = "@mozilla.org/network/simple-uri;1";
const kSTANDARDURL_CONTRACTID = "@mozilla.org/network/standard-url;1";
const kIOSERVICE_CONTRACTID = "@mozilla.org/network/io-service;1";
const nsISupports = Components.interfaces.nsISupports;
const nsIIOService = Components.interfaces.nsIIOService;
const nsIProtocolHandler = Components.interfaces.nsIProtocolHandler;
const nsIURI = Components.interfaces.nsIURI;
const nsIStandardURL     = Components.interfaces.nsIStandardURL;

// Compatiblity notice: 1.9+ only
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function Protocol()
{
}

Protocol.prototype =
{
  classDescription: "Telnet protocol support for BBS",
  classID: Components.ID("5FAF83FD-708D-45c0-988B-C7404FB25376"),
  contractID: "@mozilla.org/network/protocol;1?name="+ kSCHEME,
  QueryInterface: XPCOMUtils.generateQI([nsIProtocolHandler]),
  scheme: kSCHEME,
  defaultPort: 23,
  protocolFlags: nsIProtocolHandler.URI_NORELATIVE |
                 nsIProtocolHandler.URI_NOAUTH |
                 nsIProtocolHandler.URI_LOADABLE_BY_ANYONE |
                 nsIProtocolHandler.URI_NON_PERSISTABLE, // We can not save URL from telnet :D
  
  allowPort: function(port, scheme) {
    return false;
  },

  newURI: function(spec, charset, baseURI) {
    // for nsStandardURL test - http://groups.google.com.tw/group/pcmanfx/browse_thread/thread/ec757aa8c73b1432#
    // Parameters:
    // * aUrlType: URLTYPE_AUTHORITY will always convert telnet:, telnet:/, telnet://, telnet:/// to telnet://
    // * aDefaultPort: will convert telnet://ptt.cc:23 to telnet://ptt.cc
    var url = Components.classes[kSTANDARDURL_CONTRACTID].createInstance(nsIStandardURL);
    url.init(nsIStandardURL.URLTYPE_AUTHORITY, 23, spec, charset, baseURI);
    // Filter and return the pure URI
    var cleanURI = url.QueryInterface(nsIURI);
    cleanURI.userPass = '';
    cleanURI.path = '';
    return cleanURI;
  },

  newChannel: function(aURI) {
    /* create dummy nsIURI and nsIChannel instances */
    var ios = Components.classes[kIOSERVICE_CONTRACTID]
                        .getService(nsIIOService);

    return ios.newChannel('chrome://pcmanfx2/content/pcman.xul', null, null);
  },
}


// Use NSGetFactory for Firefox 4 / Gecko 2
// https://developer.mozilla.org/en/XPCOM/XPCOM_changes_in_Gecko_2.0
if (XPCOMUtils.generateNSGetFactory) {
  var NSGetFactory = XPCOMUtils.generateNSGetFactory([Protocol]);
} else {
  var NSGetModule = XPCOMUtils.generateNSGetModule([Protocol]);
}
