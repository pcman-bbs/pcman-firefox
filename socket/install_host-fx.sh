#!/bin/sh
# Copyright 2013 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

set -e

DIR="$( cd "$( dirname "$0" )" && pwd )"
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

# Create directory to store native messaging host.
mkdir -p "$TARGET_DIR_FX"

# Copy native messaging host manifest.
cp "$DIR/$HOST_NAME-fx.json" "$TARGET_DIR_FX/$HOST_NAME.json"

# Update host path in the manifest.
HOST_PATH=$DIR/native-messaging-socket-host
ESCAPED_HOST_PATH=${HOST_PATH////\\/}
sed -i -e "s/HOST_PATH/$ESCAPED_HOST_PATH/" "$TARGET_DIR_FX/$HOST_NAME.json"

# Set permissions for the manifest so that all users can read it.
chmod o+r "$TARGET_DIR_FX/$HOST_NAME.json"

echo "Native messaging host $HOST_NAME has been installed."
