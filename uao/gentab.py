#!/usr/bin/env python
# generate binary version of U2B table
# Author: Hong Jen Yee <pcman.tw@gmail.com>
# License: GNU GPL

import sys
import binascii

if len(sys.argv) < 3:
    print 'usage: gentab.py <input file> <output file>\n'
    exit(1)

fi = open(sys.argv[1], 'r');
fo = open(sys.argv[2], 'wb');
for line in fi:
    if line[0] == '#':
        continue
    parts = line.split();
    big5 = parts[0].strip()[2:]
    uni = parts[1].strip()[2:]
    uni = int(uni, 16);
    print uni
    big5_bin = binascii.a2b_hex(big5)
    fo.write(big5_bin)
fi.close()
fo.close()
