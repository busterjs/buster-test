var buster = buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
    buster.util = require("../util");
    buster.consoleReporter = require("./console-reporter");
}

(function (B) {
    var consoleReporter = B.consoleReporter;

    buster.quietConsoleReporter = B.extend(B.create(consoleReporter), {
        create: function (runner, opt) {
            var reporter = B.create(this);
            opt = opt || {};
            reporter.io = opt.io || sys;
            reporter.ansi = B.ansiOut.create(opt);
            reporter.reset();
            reporter.bindEvents(runner);

            return reporter;
        },

        bindEvents: function (runner) {
            runner.bind(this, {
                "suite:start": "reset", "suite:end": "printStats",
                "context:start": "startContext", "context:end": "endContext",
                "test:error": "testError", "test:failure": "testFailure"
            });
        }
    });
}(buster));

if (typeof module != "undefined") {
    module.exports = buster.quietConsoleReporter;
}
