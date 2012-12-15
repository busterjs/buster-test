var colorizer = require("ansi-colorizer");
var stackFilter = require("stack-filter");

function pluralize(num, phrase) {
    num = typeof num == "undefined" ? 0 : num;
    return num + " " + (num == 1 ? phrase : phrase + "s");
}

function getOutputStream(opt) {
    if (opt.outputStream) { return opt.outputStream; }
    var util = require("util");
    return {
        write: function (bytes) { util.print(bytes); }
    };
}

module.exports = {
    create: function (opt) {
        var reporter = Object.create(this);
        opt = opt || {};
        reporter.out = getOutputStream(opt);
        reporter.color = colorizer.configure(opt);
        reporter.cwd = opt.cwd;
        reporter.reset();

        return reporter;
    },

    testError: function (test) {
        test.contextName = (this.contextNames || []).join(" ");
    },

    testFailure: function (test) {
        test.contextName = (this.contextNames || []).join(" ");
    },

    uncaughtException: function (error) {
        this.uncaught = this.uncaught || [];
        this.uncaught.push({ error: error });
    },

    startContext: function (context) {
        this.contextNames = this.contextNames || [];
        this.contextNames.push(context.name);
    },

    endContext: function (context) {
        this.contextNames.pop();
    },

    success: function (stats) {
        return stats.failures === 0 && stats.errors === 0 &&
            stats.timeouts === 0 && stats.tests > 0 && stats.assertions > 0;
    },

    printUncaughtExceptions: function () {
        this.printExceptions(this.uncaught, this.color.red("Uncaught exception!"));
    },

    printFailures: function () {
        this.printExceptions(this.failures, this.color.red("Failure"));
    },

    printErrors: function () {
        this.printExceptions(this.errors, this.color.yellow("Error"));
    },

    printTimeouts: function () {
        this.printExceptions(this.timeouts, this.color.red("Timeout"));
    },

    printExceptions: function (exceptions, label) {
        var fail, stack;
        exceptions = exceptions || [];

        for (var i = 0, l = exceptions.length; i < l; ++i) {
            fail = exceptions[i];
            this.write(label);

            if (fail.contextName) {
                this.write(": " + fail.contextName);
            }

            if (fail.name) {
                this.write(" " + fail.name);
            }

            this.write("\n");

            if (typeof this.printLog == "function" && fail.contextName && fail.name) {
                this.printLog(fail.contextName, fail.name);
            }

            if (fail.error) {
                stack = stackFilter.filter(fail.error.stack, this.cwd);
                if (fail.error.source) {
                    this.write("    -> " + fail.error.source + "\n");
                }

                this.write("    ");

                if (fail.error.name && fail.error.name != "AssertionError") {
                    this.write(this.color.red(fail.error.name + ": "));
                }

                this.write(this.color.red(fail.error.message) + "\n");

                if (stack.length > 0) {
                    this.write("    " + stack.join("\n    ") + "\n");
                }
            }

            this.write("\n");
        }
    },

    printUnsupported: function (unsupported) {
        var str = "";

        for (var i = 0, l = unsupported.length; i < l; ++i) {
            str += "Skipping " + unsupported[i].context + ", unsupported requirement";

            if (unsupported[i].unsupported.length > 1) {
                str += "s:\n    " + unsupported[i].unsupported.join("\n    ") + "\n";
            } else {
                str += ": " + unsupported[i].unsupported[0] + "\n";
            }
        }

        this.write(this.color.yellow(str) + (!!str ? "\n" : ""));
    },

    printStats: function (stats) {
        this.printUncaughtExceptions();
        stats = stats || {};

        var statStr = [pluralize(stats.contexts, "test case"),
                       pluralize(stats.tests, "test"),
                       pluralize(stats.assertions, "assertion"),
                       pluralize(stats.failures, "failure"),
                       pluralize(stats.errors, "error"),
                       pluralize(stats.timeouts, "timeout")];

        if (stats.deferred > 0) {
            statStr.push(stats.deferred + " deferred");
        }

        if (stats.tests == 0) {
            this.write(this.color.red("No tests") + "\n");
        } else {
            var color = this.success(stats) ? "green" : "red";
            this.write(this.color[color](statStr.join(", ")) + "\n");
            if (stats.assertions == 0) {
                this.write(this.color.red("WARNING: No assertions") + "\n");
            }
        }

        if (this.startedAt) {
            var diff = (new Date() - this.startedAt) / 1000;
            this.write("Finished in " + diff + "s" + "\n");
        }
    },

    reset: function () {
        this.failures = [];
        this.errors = [];
        this.timeouts = [];
        this.startedAt = new Date().getTime();
    },

    write: function (str) {
        this.out.write(str);
    }
};
