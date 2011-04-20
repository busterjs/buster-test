var buster = require("buster-core");
buster.ansiOut = require("../ansi-out");
buster.stackFilter = require("../stack-filter");
var consoleReporter = require("./console");

module.exports = {
    create: function (opt) {
        opt = opt || {};
        var reporter = buster.create(this);
        reporter.io = opt.io || require("sys");
        reporter.ansi = buster.ansiOut.create(opt);
        reporter.cwd = opt.cwd;
        reporter.contexts = [];

        return reporter;
    },

    listen: function (runner) {
        runner.bind(this, {
            "context:start": "contextStart", "context:end": "contextEnd",
            "test:success": "testSuccess", "test:failure": "testFailure",
            "test:error": "testError", "test:timeout": "testTimeout",
            "test:deferred": "testDeferred", "suite:end": "printStats",
            "suite:start": "suiteStart", "uncaughtException": "uncaughtException"
        });

        if (runner.console) {
            runner.console.bind(this, ["log"]);
        }

        return this;
    },

    suiteStart: function () {
        this.startedAt = new Date();
    },

    contextStart: function (context) {
        if (this.contexts.length == 0) {
            this.io.puts(context.name);
        }

        this.contexts.push(context.name);
    },

    contextEnd: function (context) {
        this.contexts.pop();
    },

    testSuccess: function (test) {
        this.io.puts(this.ansi.green("  ✓ " + this.getPrefix() + test.name));
        this.printMessages();
    },

    testFailure: function (test) {
        var name = "", color = "red";

        if (test.error && test.error.name != "AssertionError") {
            name = test.error.name + ": ";
            color = "yellow";
        }

        this.io.puts(this.ansi[color]("  ✖ " + this.getPrefix() + test.name));
        this.printMessages();

        if (!test.error) {
            return;
        }

        this.io.puts("    " + this.ansi[color](name + test.error.message));
        var stack = buster.stackFilter(test.error.stack, this.cwd);

        if (stack.length > 0) {
            this.io.puts("      " + stack.join("\n      ") + "\n");
        }
    },

    testDeferred: function (test) {
        this.io.puts(this.ansi.cyan("  - " + this.getPrefix() + test.name));
    },

    testTimeout: function (test) {
        this.io.puts(this.ansi.red("  … " + this.getPrefix() + test.name));
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
            this.io.puts("    [" + level + "] " + messages[i].message);
        }

        if (messages.length > 0) {
            this.io.puts("");
        }

        this.messages = [];
    },

    getPrefix: function () {
        var prefix = this.contexts.slice(1).join(" ");
        return prefix + (prefix.length > 0 ? " " : "");
    },

    printStats: consoleReporter.printStats,
    success: consoleReporter.success,
    uncaughtException: consoleReporter.uncaughtException
};

module.exports.testError = module.exports.testFailure;
