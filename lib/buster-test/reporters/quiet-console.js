var buster = buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
    buster.consoleReporter = require("./console-reporter");
}

(function (B) {
    var consoleReporter = B.consoleReporter;

    buster.quietConsoleReporter = B.extend(B.create(consoleReporter), {
        create: function (opt) {
            var reporter = B.create(this);
            opt = opt || {};
            reporter.io = opt.io || sys;
            reporter.ansi = B.ansiOut.create(opt);
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
