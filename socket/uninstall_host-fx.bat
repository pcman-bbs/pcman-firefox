:: Copyright 2014 The Chromium Authors. All rights reserved.
:: Use of this source code is governed by a BSD-style license that can be
:: found in the LICENSE file.

:: Deletes the entry created by install_host.bat
REG DELETE "HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\org.pcman.pcmanfx2.webextensions.socket" /f
REG DELETE "HKEY_LOCAL_MACHINE\SOFTWARE\Mozilla\NativeMessagingHosts\org.pcman.pcmanfx2.webextensions.socket" /f
