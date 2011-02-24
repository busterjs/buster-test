var buster = buster || {};
buster.util = buster.util || {};

if (typeof require == "function") {
    buster.util = require("buster-util");
    buster.promise = require("./promise");
}

buster.util.pluralize = function (num, phrase) {
    num = typeof num == "undefined" ? 0 : num;
    return num + " " + (num == 1 ? phrase : phrase + "s");
};

buster.util.extractStack = function (stack) {
    var lines = (stack || "").split("\n");
    var stackLines = [];

    for (var i = 0, l = lines.length; i < l; ++i) {
        if (/\d+:\d+\)?$/.test(lines[i])) {
            if (!filterMatch(lines[i])) {
                stackLines.push(lines[i].trim());
            }
        }
    }

    return stackLines;
};

var regexpes = {};

function filterMatch(line) {
    var filters = buster.util.stackFilters;

    for (var i = 0, l = filters.length; i < l; ++i) {
        if (!regexpes[filters[i]]) {
            regexpes[filters[i]] = new RegExp(filters[i]);
        }

        if (regexpes[filters[i]].test(line)) {
            return true;
        }
    }

    return false;
}

buster.util.stackFilters = ["buster-assert/lib", "buster-test/lib"];

buster.util.ansiOut = {
    color: false,
    bright: false,

    create: function (opt) {
        var ansiOut = buster.util.create(this);
        opt = opt || {};

        if (typeof opt.color == "boolean") {
            ansiOut.color = opt.color;
        }

        if (typeof opt.bright == "boolean") {
            ansiOut.bright = opt.bright;
        }

        return ansiOut;
    },

    red: function (str) {
        return this.colorize(str, 31);
    },

    yellow: function (str) {
        return this.colorize(str, 33);
    },

    green: function (str) {
        return this.colorize(str, 32);
    },

    colorize: function (str, color) {
        if (!this.color) {
            return str;
        }

        return (this.bright ? "\033[1m" : "") +
            "\033[" + color + "m" + str + "\033[0m";
    },
};

if (typeof module != "undefined") {
    module.exports = buster.util;
}
