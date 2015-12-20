kryptos.hash.SHA = function(str) {
  inherit(this, new kryptos.hash.baseHash(str));
}

kryptos.hash.SHA.digest_size = 20;

kryptos.hash.SHA.prototype = {
  type : 'sha1'
};

// http://code.google.com/p/crypto-js/source/browse/branches/2.x/src/SHA1.js
// BSD license: http://www.opensource.org/licenses/bsd-license.php
if (!(Components  && Components.classes)) {  // Chrome
  kryptos.hash.SHA.prototype = {
    digest: function() {
      var hashData = kryptos.toByteArray(this.data);

      var m  = kryptos.bytesToWords(hashData),
          l  = hashData.length * 8,
          w  =  [],
          H0 =  1732584193,
          H1 = -271733879,
          H2 = -1732584194,
          H3 =  271733878,
          H4 = -1009589776;

      // Padding
      m[l >> 5] |= 0x80 << (24 - l % 32);
      m[((l + 64 >>> 9) << 4) + 15] = l;

      for (var i = 0; i < m.length; i += 16) {
        var a = H0,
            b = H1,
            c = H2,
            d = H3,
            e = H4;

        for (var j = 0; j < 80; j++) {
          if (j < 16) {
            w[j] = m[i + j];
          } else {
            var n = w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16];
            w[j] = (n << 1) | (n >>> 31);
          }

          var t = ((H0 << 5) | (H0 >>> 27)) + H4 + (w[j] >>> 0) + (
                   j < 20 ? (H1 & H2 | ~H1 & H3) + 1518500249 :
                   j < 40 ? (H1 ^ H2 ^ H3) + 1859775393 :
                   j < 60 ? (H1 & H2 | H1 & H3 | H2 & H3) - 1894007588 :
                            (H1 ^ H2 ^ H3) - 899497514);

          H4 =  H3;
          H3 =  H2;
          H2 = (H1 << 30) | (H1 >>> 2);
          H1 =  H0;
          H0 =  t;
        }

        H0 += a;
        H1 += b;
        H2 += c;
        H3 += d;
        H4 += e;
      }

      return kryptos.fromByteArray(kryptos.wordsToBytes([H0, H1, H2, H3, H4]));
    }
  };
}
