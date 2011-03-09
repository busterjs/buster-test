var buster = require("buster-core");
buster.test = require("../util");
var consoleReporter = require("./console-reporter");

module.exports = buster.extend(buster.create(consoleReporter), {
    create: function (opt) {
        var reporter = buster.create(this);
        opt = opt || {};
        reporter.io = opt.io || require("sys");
        reporter.ansi = buster.test.ansiOut.create(opt);
        reporter.reset();

        return reporter;
    },

    listen: function (runner) {
        runner.bind(this, {
            "suite:start": "reset", "suite:end": "printStats",
            "test:error": "testError", "test:failure": "testFailure"
        });

        return this;
    }
});
