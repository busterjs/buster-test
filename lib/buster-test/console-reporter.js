var util = require("buster-util");
var sys = require("sys");

module.exports = {
    create: function (runner, io) {
        var reporter = util.create(this);
        reporter.io = io || sys;
        runner.on("test:success", util.bind(reporter, "testSuccess"));
        runner.on("test:error", util.bind(reporter, "testError"));
        runner.on("test:fail", util.bind(reporter, "testFail"));

        return reporter;
    },

    testSuccess: function (test) {
        this.io.print(".");
    },

    testError: function (test) {
        this.io.print("E");
    },

    testFail: function (test) {
        this.io.print("F");
    }
};
