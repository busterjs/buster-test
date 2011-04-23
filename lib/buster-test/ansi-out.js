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
        if (n == 0) return "";
        return "\033[" + n + "A";
    },

    down: function (n) {
        if (n == 0) return "";
        return "\033[" + n + "B";
    },

    fwd: function (n) {
        if (n == 0) return "";
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

    stripSeq: function (str) {
        var str = str.replace(/\x1b(\[|\(|\))[;?0-9]*[0-9A-Za-z]/g, "");
        str = str.replace(/\x1b(\[|\(|\))[;?0-9]*[0-9A-Za-z]/g, "");
        str = str.replace(/[\x03|\x1a]/, "");

        return str;
    },

    labeledList: function (io) {
        var initialLabels = Array.prototype.slice.call(arguments, 1);
        var width = widest(initialLabels);
        var current = 0;
        var lines = {};
        var labels = [];

        function formatLabel(label) {
            return label + ": " + repeat(" ", width - label.length);
        }

        function printAt(pos, text, update) {
            var x = typeof pos.x == "string" ? lines[pos.x].x : pos.x;
            var y = typeof pos.y == "string" ? lines[pos.y].y : pos.y;

            io.print(buster.ansiOut.move(function () {
                return this.up(current - y) + this.fwd(x) + text;
            }));
        }

        function len(text) {
            return buster.ansiOut.stripSeq(text).length;
        }

        var list = {
            refitLabels: function (label) {
                width = widest(labels.concat(label));
                var content;

                for (var i = 0, l = labels.length; i < l; ++i) {
                    content = lines[labels[i]].content;
                    printAt({ x: 0, y: labels[i] }, formatLabel(labels[i]) + content);
                    lines[labels[i]].x = width + 2 + len(content);
                }
            },

            add: function (label) {
                if (width < label.length) {
                    this.refitLabels(label);
                }

                labels.push(label);
                lines[label] = { x: width + 2, y: current, content: "" };
                io.puts(formatLabel(label));
                current += 1;
            },

            print: function (label, text) {
                printAt({ x: label, y: label }, text);
                lines[label].x += len(text);
                lines[label].content += text;
            }
        };

        for (var i = 0, l = initialLabels.length; i < l; ++i) {
            list.add(initialLabels[i]);
        }

        return list;
    }
};

if (typeof module != "undefined") {
    module.exports = buster.ansiOut;
}
