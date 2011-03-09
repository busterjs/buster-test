var buster = buster || {};

if (typeof require != "undefined") {
    buster = require("buster-core");
    buster.test = require("../util");
    var sys = require("sys");
}

(function (B) {
    function messages(reporter, context, test) {
        reporter.messageLog = reporter.messageLog || {};
        reporter.messageLog[context] = reporter.messageLog[context] || {};
        reporter.messageLog[context][test] = reporter.messageLog[context][test] || [];

        return reporter.messageLog[context][test];
    }

    buster.xUnitConsoleReporter = {
        create: function (runner, opt) {
            var reporter = B.create(this);
            opt = opt || {};
            reporter.io = opt.io || sys;
            reporter.ansi = buster.test.ansiOut.create(opt);
            reporter.reset();
            reporter.bindEvents(runner);

            return reporter;
        },

        bindEvents: function (runner) {
            runner.bind(this, {
                "suite:start": "reset", "suite:end": "printDetails",
                "context:start": "startContext", "context:end": "endContext",
                "test:success": "testSuccess", "test:error": "testError",
                "test:failure": "testFailure", "test:async": "testAsync",
                "test:timeout": "testTimeout", "test:setUp": "testSetUp",
                "test:deferred": "testDeferred"
            });

            if (runner.console) {
                runner.console.bind(this, "log");
            }
        },

        testSetUp: function (test) {
            this.currentTest = test.name;
        },

        testSuccess: function (test) {
            this.replaceAsyncMarker();
            this.io.print(this.ansi.green("."));
        },

        testError: function (test) {
            this.replaceAsyncMarker();
            test.contextName = (this.contextNames || []).join(" ");
            this.errors.push(test);
            this.io.print(this.ansi.yellow("E"));
        },

        testFailure: function (test) {
            this.replaceAsyncMarker();
            test.contextName = (this.contextNames || []).join(" ");
            this.failures.push(test);
            this.io.print(this.ansi.red("F"));
        },

        testTimeout: function (test) {
            this.replaceAsyncMarker();
            test.contextName = (this.contextNames || []).join(" ");
            this.timeouts.push(test);
            this.io.print(this.ansi.red("T"));
        },

        testAsync: function (test) {
            this.async = true;
            this.io.print(this.ansi.purple("A"));
        },

        testDeferred: function (test) {
            this.deferred = this.deferred || [];

            this.deferred.push({
                name: test.name,
                context: this.contextNames.join(" ")
            });
        },

        startContext: function (context) {
            this.contextNames = this.contextNames || [];

            if (this.contextNames.length == 0) {
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

        success: function (stats) {
            return stats.failures == 0 && stats.errors == 0 &&
                stats.tests > 0 && stats.assertions > 0;
        },

        printDetails: function (stats) {
            this.io.puts("");
            this.printTimeouts();
            this.printFailures();
            this.printErrors();
            this.printMessages();
            this.printDeferred();
            this.printStats(stats);
        },

        printTimeouts: function () {
            return this.printExceptions(this.timeouts, this.ansi.red("Timeout"));
        },

        printFailures: function () {
            return this.printExceptions(this.failures, this.ansi.red("Failure"));
        },

        printErrors: function () {
            return this.printExceptions(this.errors, this.ansi.yellow("Error"));
        },

        printExceptions: function (exceptions, label, color) {
            var fail, stack;

            for (var i = 0, l = exceptions.length; i < l; ++i) {
                fail = exceptions[i];
                this.io.puts(label + ": " + fail.contextName + " " + fail.name);
                this.printLog(fail.contextName, fail.name);

                if (fail.error) {
                    stack = buster.test.extractStack(fail.error.stack);
                    this.io.print("    ");

                    if (fail.error.name && fail.error.name != "AssertionError") {
                        this.io.print(this.ansi.red(fail.error.name + ": "));
                    }

                    this.io.puts(this.ansi.red(fail.error.message));

                    if (stack.length > 0) {
                        this.io.puts("    " + stack.join("\n    "));
                    }
                }

                this.io.puts("");
            }
        },

        printMessages: function () {
            var log = this.messageLog || {};

            for (var ctx in log) {
                for (var test in log[ctx]) {
                    if (log[ctx][test].length) {
                        this.io.puts(this.ansi.green("Passed: " + ctx + " " + test));
                    }

                    this.printLog(ctx, test);
                }
            }
        },

        printDeferred: function () {
            var funcs = this.deferred || {};

            for (var i = 0, l = funcs.length; i < l; ++i) {
                this.io.puts("Deferred: " + funcs[i].context + " " + funcs[i].name);
            }
        },

        printLog: function (context, test) {
            var msgs = messages(this, context, test);

            if (msgs.length > 0) {
                this.io.puts("    " + msgs.join("\n    "));
                this.io.puts("");
            }

            delete this.messageLog[context][test];
        },

        printStats: function (stats) {
            var statStr = [buster.test.pluralize(stats.contexts, "test case"),
                           buster.test.pluralize(stats.tests, "test"),
                           buster.test.pluralize(stats.assertions, "assertion"),
                           buster.test.pluralize(stats.failures, "failure"),
                           buster.test.pluralize(stats.errors, "error"),
                           buster.test.pluralize(stats.timeouts, "timeout")];

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
        },

        replaceAsyncMarker: function () {
            if (this.async) {
                this.io.print("\033[1D");
            }

            delete this.async;
        },

        log: function (msg) {
            var context = (this.contextNames || []).join(" ");
            var test = this.currentTest;

            messages(this, context, test).push(
                "[" + msg.level.toUpperCase() + "] " + msg.message);
        }
    };
}(buster));

if (typeof module != "undefined") {
    module.exports = buster.xUnitConsoleReporter;
}
