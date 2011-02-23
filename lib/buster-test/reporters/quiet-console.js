var buster = buster || {};

if (typeof require != "undefined") {
    buster = {
        util: require("../util"),
        consoleReporter: require("./console-reporter")
    };
}

(function (B) {
    var U = B.util;
    var consoleReporter = B.consoleReporter;

    buster.quietConsoleReporter = U.extend(U.create(consoleReporter), {
        create: function (runner, opt) {
            var reporter = U.create(this);
            opt = opt || {};
            reporter.io = opt.io || sys;
            reporter.ansi = U.ansiOut.create(opt);
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
