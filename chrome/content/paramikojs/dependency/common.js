// dependency for win_pageant
//Components.utils.import("resource://gre/modules/ctypes.jsm");

function inherit(derived, base) {
  for (property in base) {
    if (!derived[property]) {
      derived[property] = base[property];
    }
  }
}
