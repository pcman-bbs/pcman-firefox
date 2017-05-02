#!/bin/sh
# Copyright 2013 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

set -e

if [ "$(uname -s)" = "Darwin" ]; then
  if [ "$(whoami)" = "root" ]; then
    TARGET_DIR_FX="/Library/Application Support/Mozilla/NativeMessagingHosts"
  else
    TARGET_DIR_FX="$HOME/Library/Application Support/Mozilla/NativeMessagingHosts"
  fi
else
  if [ "$(whoami)" = "root" ]; then
    if [ -d "/usr/lib/mozilla" ]; then
      TARGET_DIR_FX="/usr/lib/mozilla/native-messaging-hosts"
    else
      TARGET_DIR_FX="/usr/lib64/mozilla/native-messaging-hosts"
    fi
  else
    TARGET_DIR_FX="$HOME/.mozilla/native-messaging-hosts"
  fi
fi

HOST_NAME=org.pcman.pcmanfx2.webextensions.socket
rm "$TARGET_DIR_FX/$HOST_NAME.json"
echo "Native messaging host $HOST_NAME has been uninstalled."
