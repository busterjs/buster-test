var buster = buster || {};

if (typeof require != "undefined") {
    buster = {
        util: require("../util")
    };

    sys = require("sys");
}

(function (B) {
    buster.xUnitConsoleReporter = {
        assertions: 0,
        successes: 0,
        contexts: 0,

        create: function (runner, opt) {
            var reporter = B.util.create(this);
            opt = opt || {};
            reporter.io = opt.io || sys;
            reporter.ansi = buster.util.ansiOut.create(opt);
            reporter.reset();
            reporter.bindEvents(runner);

            return reporter;
        },

        bindEvents: function (runner) {
            runner.bind(this, {
                "suite:start": "reset", "suite:end": "printDetails",
                "context:start": "startContext", "context:end": "endContext",
                "test:success": "testSuccess", "test:error": "testError",
                "test:fail": "testFailure"
            });
        },

        testSuccess: function (test) {
            this.successes += 1;
            this.assertions += typeof test.assertions == "number" ? test.assertions : 0;
            this.io.print(this.ansi.green("."));
        },

        testError: function (test) {
            test.contextName = (this.contextNames || []).join(" ");
            this.errors.push(test);
            this.io.print(this.ansi.yellow("E"));
        },

        testFailure: function (test) {
            test.contextName = (this.contextNames || []).join(" ");
            this.failures.push(test);
            this.io.print(this.ansi.red("F"));
        },

        startContext: function (context) {
            this.contextNames = this.contextNames || [];

            if (this.contextNames.length == 0) {
                this.contexts += 1;
                this.io.print(context.name + ": ");
            }

            this.contextNames.push(context.name);
        },

        endContext: function (context) {
            this.contextNames.pop();

            if (this.contextNames.length == 0) {
                this.io.print("\n");
            }
        },

        success: function () {
            return this.failures.length == 0 && this.errors.length == 0 && this.successes > 0 && this.assertions > 0;
        },

        printDetails: function () {
            this.io.puts("");
            this.printFailures();
            this.printErrors();
            this.printStats();
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

        printStats: function () {
            var tests = this.successes + this.failures.length + this.errors.length;
            var stats = [buster.util.pluralize(this.contexts, "test case"),
                         buster.util.pluralize(tests, "test"),
                         buster.util.pluralize(this.assertions, "assertion"),
                         buster.util.pluralize(this.failures.length, "failure"),
                         buster.util.pluralize(this.errors.length, "error")];

            var color = this.success() ? "green" : "red";
            this.io.puts(this.ansi[color](stats.join(", ")));

            if (tests == 0) {
                this.io.puts(this.ansi.red("WARNING: No tests!"));
            } else {
                if (this.assertions == 0) {
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
    module.exports = buster.xUnitConsoleReporter;
}
