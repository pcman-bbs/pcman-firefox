paramikojs.win_pageant = function() {
  
}

paramikojs.win_pageant.prototype = {
  _AGENT_COPYDATA_ID : 0x804e50ba,
  _AGENT_MAX_MSGLEN : 8192,
  // Note: The WM_COPYDATA value is pulled from win32con, as a workaround
  // so we do not have to import this huge library just for this one variable.
  win32con_WM_COPYDATA : 74,

  _get_pageant_window_object : function() {
    return false;
  },

  /*
    Check to see if there is a "Pageant" agent we can talk to.

    This checks both if we have the required libraries (win32all or ctypes)
    and if there is a Pageant currently running.
  */
  can_talk_to_agent : function() {
    return false;
  },

  _query_pageant : function(msg) {
    return null;
  },

  /*
    Mock "connection" to an agent which roughly approximates the behavior of
    a unix local-domain socket (as used by Agent).  Requests are sent to the
    pageant daemon via special Windows magick, and responses are buffered back
    for subsequent reads.
  */
  PageantConnection : {
    response : null,

    send : function(data) {
      this._response = null;
    },
    
    recv : function(n) {
      return '';
    },

    close : function() {}
  }
};


