var logging = {
  DEBUG : 10,
  INFO : 20,
  WARNING : 30,
  ERROR : 40,
  CRITICAL : 50,

  log : function(level, msg) {
    if (level == this.DEBUG) {
      debug(msg);
    } else if (level >= this.ERROR) {
      debug(msg, 'error');
    } else {
      debug(msg, 'info');
    }
  }
};
DEBUG = logging.DEBUG;
INFO = logging.INFO;
WARNING = logging.WARNING;
ERROR = logging.ERROR;
CRITICAL = logging.CRITICAL;

function debug(ex, level, trusted) {
  if (typeof(ex) == 'string')
    ex = {message: ex};
  if (gDebugMode && window['console'] && window.console.log) {
    console.log("\n" + (level ? level : "Debug") + ": " + (ex.stack ? (ex.message + '\n' + ex.stack) : (ex.message ? ex.message : ex)) + "\n");
  }
}
