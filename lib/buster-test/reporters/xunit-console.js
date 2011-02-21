var buster = buster || {};

if (typeof require != "undefined") {
    buster = {
        util: require("buster-util")
    };

    sys = require("sys");
}

(function (B) {
    function pluralize(num, phrase) {
        return num + " " + (num == 1 ? phrase : phrase + "s");
    }

    // TODO: Formalize somehow
    function extractStack(stack) {
        var lines = (stack || "").split("\n");
        var stackLines = [];

        for (var i = 0, l = lines.length; i < l; ++i) {
            if (/\d+:\d+\)?$/.test(lines[i]) &&
                !/buster-assert\/lib/.test(lines[i]) &&
                !/buster-test\/lib/.test(lines[i])) {
                stackLines.push(lines[i].trim());
            }
        }

        return stackLines;
    }

    buster.xUnitConsoleReporter = {
        colors: false,
        bright: false,
        assertions: 0,
        successes: 0,
        contexts: 0,

        create: function (runner, opt) {
            var reporter = B.util.create(this);
            opt = opt || {};
            reporter.io = opt.io || sys;

            if (typeof opt.color != "undefined") {
                reporter.color = opt.color;
            }

            if (typeof opt.bright != "undefined") {
                reporter.bright = opt.bright;
            }

            runner.bind(reporter, {
                "suite:start": "reset", "suite:end": "printDetails",
                "context:start": "startContext", "context:end": "endContext",
                "test:success": "testSuccess", "test:error": "testError",
                "test:fail": "testFailure"
            });

            reporter.reset();

            return reporter;
        },

        testSuccess: function (test) {
            this.successes += 1;
            this.assertions += typeof test.assertions == "number" ? test.assertions : 0;
            this.io.print(this.green("."));
        },

        testError: function (test) {
            test.contextName = (this.contextNames || []).join(" ");
            this.errors.push(test);
            this.io.print(this.yellow("E"));
        },

        testFailure: function (test) {
            test.contextName = (this.contextNames || []).join(" ");
            this.failures.push(test);
            this.io.print(this.red("F"));
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
            return this.printExceptions(this.failures, this.red("Failure"));
        },

        printErrors: function () {
            return this.printExceptions(this.errors, this.yellow("Error"));
        },

        printExceptions: function (exceptions, label) {
            var fail, stack;

            for (var i = 0, l = exceptions.length; i < l; ++i) {
                fail = exceptions[i];
                this.io.puts(label + ": " + fail.contextName + " " + fail.name);

                if (fail.error) {
                    stack = extractStack(fail.error.stack);
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
            var stats = [pluralize(this.contexts, "test case"),
                         pluralize(tests, "test"),
                         pluralize(this.assertions, "assertion"),
                         pluralize(this.failures.length, "failure"),
                         pluralize(this.errors.length, "error")];

            var color = this.success() ? "green" : "red";
            this.io.puts(this[color](stats.join(", ")));

            if (tests == 0) {
                this.io.puts(this.red("WARNING: No tests!"));
            } else {
                if (this.assertions == 0) {
                    this.io.puts(this.red("WARNING: No assertions!"));
                }
            }
        },

        red: function (str) {
            return this.colorize(str, 31);
        },

        yellow: function (str) {
            return this.colorize(str, 33);
        },

        green: function (str) {
            return this.colorize(str, 32);
        },

        colorize: function (str, color) {
            if (!this.color) {
                return str;
            }

            return (this.bright ? "\033[1m" : "") +
                "\033[" + color + "m" + str + "\033[0m";
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
