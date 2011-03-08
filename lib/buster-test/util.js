var buster = buster || {};

if (typeof require == "function") {
    buster = require("buster-core");
    buster.promise = require("buster-promise");
}

buster.test = {};

buster.test.pluralize = function (num, phrase) {
    num = typeof num == "undefined" ? 0 : num;
    return num + " " + (num == 1 ? phrase : phrase + "s");
};

buster.test.extractStack = function (stack) {
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
    var filters = buster.test.stackFilters;

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

buster.test.stackFilters = ["buster-assert/lib",
                            "buster-test/lib", 
                            "buster-util/lib",
                            "buster-core/lib",
                            "node.js"];

buster.test.ansiOut = {
    color: false,
    bright: false,

    create: function (opt) {
        var ansiOut = buster.create(this);
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

    purple: function (str) {
        return this.colorize(str, 35);
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
    module.exports = buster.test;
}
