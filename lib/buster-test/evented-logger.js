var buster = buster || {};

if (typeof require != "undefined") {
    buster.util = require("buster-util");
    buster.eventEmitter = require("buster-event-emitter");
}

function log(messages, level) {
    if (levels[level] > levels[this.level]) {
        return;
    }

    var message = [];

    for (var i = 0, l = messages.length; i < l; ++i) {
        message.push(this.format(messages[i]));
    }

    this.emit("log", { message: message.join(" "), level: level });
}

var levels = {
    "error": 1,
    "warn": 2,
    "log": 3,
    "debug": 4
};

buster.eventedLogger = buster.util.extend(buster.util.create(buster.eventEmitter), {
    level: "debug",

    create: function () {
        return buster.util.create(this);
    },

    debug: function () {
        return log.call(this, arguments, "debug");
    },

    log: function () {
        return log.call(this, arguments, "log");
    },

    warn: function () {
        return log.call(this, arguments, "warn");
    },

    error: function () {
        return log.call(this, arguments, "error");
    },

    format: function (obj) {
        if (typeof obj != "object") {
            return "" + obj;
        }

        try {
            return JSON.stringify(obj);
        } catch (e) {
            return "" + obj;
        }
    }
});

if (typeof module != "undefined") {
    module.exports = buster.eventedLogger;
}
