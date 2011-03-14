if (typeof require != "undefined") {
    var buster = require("buster-core");
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
    }
};

if (typeof module != "undefined") {
    module.exports = buster.ansiOut;
}
