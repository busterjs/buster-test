var colorizer = require("ansi-colorizer");
var consoleReporter = require("./console");

function filterStack(reporter, stack) {
    if (!stack) { return []; }
    if (reporter.stackFilter) {
        return reporter.stackFilter.filter(stack);
    }
    return stack.split("\n");
}

module.exports = {
    create: function (opt) {
        opt = opt || {};
        var reporter = consoleReporter.create.call(this, opt);
        reporter.contexts = [];
        reporter.stackFilter = opt.stackFilter;
        return reporter;
    },

    listen: function (runner) {
        runner.bind(this);
        if (runner.console) { runner.console.on("log", this.log, this); }
        return this;
    },

    suiteStart: function () {
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

    contextUnsupported: function (data) {
        consoleReporter.printUnsupported.call(this, [{
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

    printStats: consoleReporter.printStats,
    success: consoleReporter.success,
    uncaughtException: consoleReporter.uncaughtException,
    printExceptions: consoleReporter.printExceptions,
    printUncaughtExceptions: consoleReporter.printUncaughtExceptions,
    write: consoleReporter.write,
    reset: function () {} // consoleReporter.create calls this
};

module.exports["test:error"] = module.exports["test:failure"];
