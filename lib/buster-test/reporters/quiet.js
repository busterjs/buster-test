var buster = require("buster-core");
buster.terminal = require("buster-terminal");
var consoleReporter = require("./console");

module.exports = buster.extend(buster.create(consoleReporter), {
    create: function (opt) {
        var reporter = buster.create(this);
        opt = opt || {};
        reporter.io = opt.io || require("util");
        reporter.term = buster.terminal.create(opt);
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
