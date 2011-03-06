var buster = buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
    buster.util = require("../util");
}

(function (B) {
    buster.consoleReporter = {
        create: function (runner, opt) {
            var reporter = B.create(this);
            opt = opt || {};
            reporter.io = opt.io || sys;
            reporter.ansi = buster.util.ansiOut.create(opt);

            return reporter;
        },

        testError: function (test) {
            test.contextName = (this.contextNames || []).join(" ");
        },

        testFailure: function (test) {
            test.contextName = (this.contextNames || []).join(" ");
        },

        startContext: function (context) {
            this.contextNames = this.contextNames || [];
            this.contextNames.push(context.name);
        },

        endContext: function (context) {
            this.contextNames.pop();
        },

        success: function (stats) {
            return stats.failures.length == 0 && stats.errors.length == 0 &&
                stats.tests > 0 && stats.assertions > 0;
        },

        printFailures: function () {
            return this.printExceptions(this.failures, this.ansi.red("Failure"));
        },

        printErrors: function () {
            return this.printExceptions(this.errors, this.ansi.yellow("Error"));
        },

        printExceptions: function (exceptions, label) {
            var fail, stack;

            for (var i = 0, l = exceptions.length; i < l; ++i) {
                fail = exceptions[i];
                this.io.puts(label + ": " + fail.contextName + " " + fail.name);

                if (fail.error) {
                    stack = buster.util.extractStack(fail.error.stack);
                    this.io.print("    ");

                    if (fail.error.name && fail.error.name != "AssertionError") {
                        this.io.print(fail.error.name + ": ");
                    }

                    this.io.puts(fail.error.message);
                    this.io.puts("\n    " + stack.join("\n    "));
                }

                this.io.puts("");
            }
        },

        printStats: function (stats) {
            var statStr = [buster.util.pluralize(stats.contexts, "test case"),
                           buster.util.pluralize(stats.tests, "test"),
                           buster.util.pluralize(stats.assertions, "assertion"),
                           buster.util.pluralize(stats.failures.length, "failure"),
                           buster.util.pluralize(stats.errors.length, "error")];

            var color = this.success(stats) ? "green" : "red";
            this.io.puts(this.ansi[color](statStr.join(", ")));

            if (stats.tests == 0) {
                this.io.puts(this.ansi.red("WARNING: No tests!"));
            } else {
                if (stats.assertions == 0) {
                    this.io.puts(this.ansi.red("WARNING: No assertions!"));
                }
            }
        },

        reset: function () {
            this.failures = [];
            this.errors = [];
        }
    };
}(buster));

if (typeof module != "undefined") {
    module.exports = buster.consoleReporter;
}
