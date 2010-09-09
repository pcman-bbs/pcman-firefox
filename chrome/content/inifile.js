// A simple ini file parser
// Copyright (C) 2010   Hong Jen Yee <pcman.tw@gmail.com>

function IniFile() {
    this.groups = [];
    this.cachedGroup = null;
    this.cachedGroupName = null;
}

IniFile.prototype={
    load: function(file) { // file is a nsiFile
        // open an input stream from file
        var istream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                                createInstance(Components.interfaces.nsIFileInputStream);
        var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].
                                createInstance(Components.interfaces.nsIConverterInputStream);
        istream.init(file, -1, -1, 0);
        cstream.init(istream, "UTF-8", 0, 0xfffd);
        cstream.QueryInterface(Components.interfaces.nsIUnicharLineInputStream);

        var group, group_name;
        // read lines into array
        var line = {}, hasmore;
        do {
            hasmore = cstream.readLine(line);
            // parse the line
            var s = line.value.trimLeft();
            if(!s || s[0] == '#') // skip empty lines or comments
                continue;
            if(s[0] == '[') { // group
                group_name = s.trimRight();
                if(group_name) {
                    if(group_name[group_name.length-1] == ']')
                    {
                        group_name = group_name.substr(1, group_name.length-2);
                        // dump("group_name = " + group_name + '\n');
                        group = this.groups[group_name] = []; // associate the name with group
                    }
                    else // this is not a valid group
                        group = null;
                }
            }
            else { // key-value pair
                if(group) {
                    var sep = s.indexOf('=');
                    if(sep != -1) {
                        var key = s.slice(0, sep);
                        var value = s.slice(sep + 1);
                        // dump("key = " + key + ', value = "' + value + '"\n');
                        group[key] = value; // associate the key with the value
                    }
                }
            }
        }while(hasmore);
        cstream.close();
    },

    save: function(file) { // file is a nsiFile
        var ostream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                 createInstance(Components.interfaces.nsIFileOutputStream);
        ostream.init(file, -1, 0666, 0);
        var cstream = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
                                  createInstance(Components.interfaces.nsIConverterOutputStream);
        cstream.init(ostream, "UTF-8", 0, 0);
        var groups = this.groups;
        for(group_name in groups) {
            group = groups[group_name];
            cstream.writeString('[' + group_name + ']\n');
            for(key in group) {
                val = group[key];
                cstream.writeString(key + '=' + val + '\n');
            }
            cstream.writeString('\n');
        }
        cstream.close();
    },

    getGroupNames: function() {
        if(!this.groups)
            return null;
        var names = [];
        var groups = this.groups;
        for(name in groups)
            names.push(name);
        return names;
    },

    getKeyNames: function(group) {
        var grp = this.groups[group];
        if(!grp)
            return null;
        var names = [];
        for(name in grp)
            names.push(name);
        return names;
    },

    getVal: function(group, key) {
        var grp;
        if(group == this.cachedGroupName)
            grp = this.cachedGroup;
        else
            grp = this.groups[group]; // lookup in the table

        if(grp) {
            var val = grp[key];
            // cache the group to speed up
            this.cachedGroup = grp;
            this.cachedGroupName = group;
            return val ? val : null;
        }
        return null;
    },

    setVal: function(group, key, val) {
        var grp;
        if(group == this.cachedGroupName)
            grp = this.cachedGroup;
        else
            grp = this.groups[group]; // lookup in the table

        if(!grp) {
            grp = [];
            this.groups[group] = grp;
            // cache the group to speed up
            this.cachedGroup = grp;
            this.cachedGroupName = group;
        }
        grp[key] = val;
    },

    getStr: function(group, key, default_val) {
        var val = this.getVal(group, key);
        // FIXME: unescape the string
        return val ? val : default_val;
    },

    setStr: function(group, key, val) {
        // FIXME: escape the string
        this.setVal(group, key, val);
    },

    getInt: function(group, key, default_val) {
        var val = this.getVal(group, key);
        return val ? parseInt(val, 10) : default_val;
    },

    setInt: function(group, key, val) {
        this.setVal(group, key, val + '');
    },

    getBool: function(group, key, default_val) {
        var val = this.getVal(group, key);
        if(val) {
            val = val[0];
            if(val == '1' || val == 't' || val == 'T') // allow 1, true, True, or TRUE
                return true;
            else
                return false;
        }
        return default_val;
    },

    setBool: function(group, key, val) {
        this.setVal(group, key, val ? '1' : '0');
    }
};
