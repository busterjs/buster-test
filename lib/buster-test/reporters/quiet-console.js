var buster = buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
    buster.consoleReporter = require("./console-reporter");
    buster.test = require("../util");
}

(function (B) {
    buster.quietConsoleReporter = B.extend(B.create(B.consoleReporter), {
        create: function (opt) {
            var reporter = B.create(this);
            opt = opt || {};
            reporter.io = opt.io || require("sys");
            reporter.ansi = B.test.ansiOut.create(opt);
            reporter.reset();

            return reporter;
        },

        listen: function (runner) {
            runner.bind(this, {
                "suite:start": "reset", "suite:end": "printStats",
                "context:start": "startContext", "context:end": "endContext",
                "test:error": "testError", "test:failure": "testFailure"
            });

            return this;
        }
    });
}(buster));

if (typeof module != "undefined") {
    module.exports = buster.quietConsoleReporter;
}
