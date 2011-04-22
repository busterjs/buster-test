if (typeof require != "undefined") {
    var buster = require("buster-core");
}

function repeat(character, times) {
    var str = "";

    while (times--) {
        str += character;
    }

    return str;
}

function widest(arr) {
    var width = 0;

    for (var i = 0, l = arr.length; i < l; ++i) {
        if (arr[i].length > width) {
            width = arr[i].length;
        }
    }

    return width;
}

buster.ansiOut = {
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

    cyan: function (str) {
        return this.colorize(str, 36);
    },

    colorize: function (str, color) {
        if (!this.color) {
            return str;
        }

        return (this.bright ? "\033[1m" : "") +
            "\033[" + color + "m" + str + "\033[0m";
    },

    up: function (n) {
        return "\033[" + n + "A";
    },

    down: function (n) {
        return "\033[" + n + "B";
    },

    fwd: function (n) {
        return "\033[" + n + "C";
    },

    save: function () {
        return "\033[s";
    },

    restore: function () {
        return "\033[u";
    },

    move: function (callback) {
        var str = this.save();
        str += callback.call(this);
        str += this.restore();

        return str;
    },

    labeledList: function (io) {
        var labels = Array.prototype.slice.call(arguments, 1), items = {};
        var width = widest(labels);
        var current = labels.length;
        var currPos = {};

        for (var i = 0, l = labels.length; i < l; ++i) {
            items[labels[i]] = i;
            currPos[labels[i]] = width + 2;
            io.puts(labels[i] + ": " + repeat(" ", width - labels[i].length));
        }

        return {
            print: function (label, text) {
                io.print(buster.ansiOut.move(function () {
                    var str = this.up(current - items[label]) +
                        this.fwd(currPos[label]) +
                        text;
                    currPos[label] += text.length;

                    return str;
                }));
            }
        };        
    }
};

if (typeof module != "undefined") {
    module.exports = buster.ansiOut;
}
