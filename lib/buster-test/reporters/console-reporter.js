var buster = require("buster-core");
buster.test = require("../util");

module.exports = {
    create: function (runner, opt) {
        var reporter = buster.create(this);
        opt = opt || {};
        reporter.io = opt.io || require("sys");
        reporter.ansi = buster.test.ansiOut.create(opt);
        reporter.reset();

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
        return stats.failures == 0 && stats.errors == 0 &&
            stats.tests > 0 && stats.assertions > 0;
    },

    printFailures: function () {
        return this.printExceptions(this.failures, this.ansi.red("Failure"));
    },

    printErrors: function () {
        return this.printExceptions(this.errors, this.ansi.yellow("Error"));
    },

    printTimeouts: function () {
        return this.printExceptions(this.timeouts, this.ansi.red("Timeout"));
    },

    printExceptions: function (exceptions, label) {
        var fail, stack;

        for (var i = 0, l = exceptions.length; i < l; ++i) {
            fail = exceptions[i];
            this.io.puts(label + ": " + fail.contextName + " " + fail.name);

            if (fail.error) {
                stack = buster.test.extractStack(fail.error.stack);
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
        var statStr = [buster.test.pluralize(stats.contexts, "test case"),
                       buster.test.pluralize(stats.tests, "test"),
                       buster.test.pluralize(stats.assertions, "assertion"),
                       buster.test.pluralize(stats.failures, "failure"),
                       buster.test.pluralize(stats.errors, "error"),
                       buster.test.pluralize(stats.timeouts, "timeout")];

        if (stats.deferred > 0) {
            statStr.push(stats.deferred + " deferred");
        }

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
        this.timeouts = [];
    }
};
