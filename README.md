[PCMan BBS extensions](https://addons.mozilla.org/firefox/addon/pcman-bbs-extension/)
=============

This branch contains an extension working on both Google Chrome or Mozilla Firefox. Raw socket is created by a native component and the extension accesses it through [native messaging](https://developer.chrome.com/extensions/nativeMessaging). The native component needs a [node.js runtime](https://nodejs.org/en/download) to execute. Steps for installing the native component are listed below:

## Installation guide

1. Installing native messaging host
  * Copy the socket directory to your computer
  * On Windows:
    * Run install_host.bat for Google Chrome or install_host-fx.bat for Mozilla Firefox in the copied directory.
    * The location of node.exe is the same as that of install_host.bat by default. Put node.exe here or modify native-messaging-socket-host.bat in the copied directory.
  * On Mac and Linux:
    * Run install_host.sh for Google Chrome or install_host-fx.sh for Mozilla Firefox in the copied directory.
    * The location of node binary is /usr/local/bin/node by default. Modify the shebang line of native-messaging-socket-host.js in the copied directory to the path of the installed node binary.
2. Install the extension to Google Chrome or Mozilla Firefox

The unpacked extension can be loaded by both Google Chrome or Mozilla Firefox whereas the packaged .crx file can be installed to Mozilla Firefox after renaming the file extension to .xpi.

## References of the native messaging host

* The installer is modified from the [native messaging example](https://chromium.googlesource.com/chromium/src/+/master/chrome/common/extensions/docs/examples/api/nativeMessaging) written by the Chromium authors with a BSD-style license.
* The [node.js module](https://github.com/jdiamond/chrome-native-messaging) for native messaging protocol is written by [jdiamond](https://github.com/jdiamond) with a MIT license.
* The main script to create raw socket is modified from the [example](https://github.com/jdiamond/chrome-native-messaging/blob/master/host/my_host.js) of the node.js module with a MIT license and the [article](http://www.hacksparrow.com/tcp-socket-programming-in-node-js.html) for writing a TCP client.
