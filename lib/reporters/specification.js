var colorizer = require("ansi-colorizer");
var runtimeThrottler = require("./runtime-throttler");

function getOutputStream(opt) {
    if (opt.outputStream) { return opt.outputStream; }
    var util = require("util");
    return {
        write: function (bytes) { util.print(bytes); }
    };
}

function filterStack(reporter, stack) {
    if (!stack) { return []; }
    if (reporter.stackFilter) {
        return reporter.stackFilter.filter(stack);
    }
    return stack.split("\n");
}

function printUnsupported(reporter, unsupported) {
    var str = "";

    for (var i = 0, l = unsupported.length; i < l; ++i) {
        str += "Skipping " + unsupported[i].context + ", unsupported requirement";

        if (unsupported[i].unsupported.length > 1) {
            str += "s:\n    " + unsupported[i].unsupported.join("\n    ") + "\n";
        } else {
            str += ": " + unsupported[i].unsupported[0] + "\n";
        }
    }

    reporter.write(reporter.color.yellow(str) + (!!str ? "\n" : ""));
}

function pluralize(num, phrase) {
    num = typeof num == "undefined" ? 0 : num;
    return num + " " + (num == 1 ? phrase : phrase + "s");
}

module.exports = {
    create: function (opt) {
        opt = opt || {};
        var reporter = Object.create(this);
        reporter.out = getOutputStream(opt);
        reporter.color = colorizer.configure(opt);
        reporter.stackFilter = opt.stackFilter;
        reporter.reset();
        reporter.contexts = [];
        return reporter;
    },

    listen: function (runner) {
        var proxy = runtimeThrottler.create();
        proxy.listen(runner).bind(this);
        return this;
    },

    "suite:start": function () {
        this.startedAt = new Date();
    },

    "context:start": function (context) {
        if (this.contexts.length == 0) {
            this.write(context.name + "\n");
        }

        this.contexts.push(context.name);
    },

    "context:end": function (context) {
        this.contexts.pop();
    },

    "context:unsupported": function (data) {
        printUnsupported(this, [{
            context: this.contexts.concat([data.context.name]).join(" "),
            unsupported: data.unsupported
        }]);
    },

    "test:success": function (test) {
        this.write(this.color.green("  ✓ " + this.getPrefix() + test.name)+"\n");
        this.printMessages();
    },

    "test:failure": function (test) {
        var name = "", color = "red";

        if (test.error && test.error.name != "AssertionError") {
            name = test.error.name + ": ";
            color = "yellow";
        }

        this.write(this.color[color]("  ✖ " + this.getPrefix() + test.name) + "\n");
        this.printMessages();

        if (!test.error) {
            return;
        }

        this.write("    " + this.color[color](name + test.error.message) + "\n");
        var stack = filterStack(this, test.error.stack);

        if (stack.length > 0) {
            this.write("      " + stack.join("\n      ") + "\n");
        }
    },

    "test:deferred": function (test) {
        this.write(this.color.cyan("  - " + this.getPrefix() + test.name) + "\n");
    },

    "test:timeout": function (test) {
        this.write(this.color.red("  … " + this.getPrefix() + test.name) + "\n");
        var source = test.error && test.error.source;
        if (source) { this.write(" (" + test.error.source + ")" + "\n"); }
        this.printMessages();
    },

    log: function (msg) {
        this.messages = this.messages || [];
        this.messages.push(msg);
    },

    printMessages: function () {
        var messages = this.messages || [], level;

        for (var i = 0, l = messages.length; i < l; ++i) {
            level = messages[i].level.toUpperCase();
            this.write("    [" + level + "] " + messages[i].message + "\n");
        }

        if (messages.length > 0) {
            this.write("\n");
        }

        this.messages = [];
    },

    getPrefix: function () {
        var prefix = this.contexts.slice(1).join(" ");
        return prefix + (prefix.length > 0 ? " " : "");
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

    success: function (stats) {
        return stats.failures === 0 && stats.errors === 0 &&
            stats.timeouts === 0 && stats.tests > 0 && stats.assertions > 0;
    },

    uncaughtException: function (error) {
        this.uncaught = this.uncaught || [];
        this.uncaught.push({ error: error });
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
                stack = filterStack(this, fail.error.stack);
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

    printUncaughtExceptions: function () {
        this.printExceptions(this.uncaught, this.color.red("Uncaught exception!"));
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

module.exports["test:error"] = module.exports["test:failure"];
