var consoleReporter = require("./console");
var colorizer = require("ansi-colorizer");
var _ = require("lodash");

function messages(reporter, context, test) {
    if (!context || !test) {
        reporter.globalMessageLog = reporter.globalMessageLog || [];
        return reporter.globalMessageLog;
    }

    reporter.messageLog = reporter.messageLog || {};
    reporter.messageLog[context] = reporter.messageLog[context] || {};
    reporter.messageLog[context][test] = reporter.messageLog[context][test] || [];

    return reporter.messageLog[context][test];
}

module.exports = _.extend(Object.create(consoleReporter), {
    create: function (opt) {
        opt = opt || {};
        var reporter = consoleReporter.create.call(this, opt);
        reporter.logPassedMessages = !!opt.logPassedMessages;
        reporter.displayProgress = typeof opt.displayProgress == "boolean" ? opt.displayProgress : true;
        return reporter;
    },

    listen: function (runner) {
        runner.bind(this);
        if (runner.console) { runner.console.bind(this, "log"); }
        return this;
    },

    "runner:focus": function () {
        if (!this.displayProgress) { return; }
        this.write([
            this.color.grey("=> "),
            "注",
            this.color.grey(" (concentrate, focus, direct)")
        ].join("") + "\n\n");
    },

    "test:setUp": function (test) {
        this.currentTest = test.name;
    },

    "test:success": function (test) {
        this.replaceAsyncMarker();
        this.printProgress(this.color.green("."));
    },

    "test:error": function (test) {
        this.replaceAsyncMarker();
        test.contextName = (this.contextNames || []).join(" ");
        this.errors.push(test);
        this.printProgress(this.color.yellow("E"));
    },

    "test:failure": function (test) {
        this.replaceAsyncMarker();
        test.contextName = (this.contextNames || []).join(" ");
        this.failures.push(test);
        this.printProgress(this.color.red("F"));
    },

    "test:timeout": function (test) {
        this.replaceAsyncMarker();
        test.contextName = (this.contextNames || []).join(" ");
        this.timeouts.push(test);
        this.printProgress(this.color.red("T"));
    },

    "test:async": function (test) {
        this.async = true;
        this.printProgress(this.color.purple("A"));
    },

    "test:deferred": function (test) {
        this.deferred = this.deferred || [];

        this.deferred.push({
            name: test.name,
            comment: test.comment,
            context: this.contextNames.join(" ")
        });
    },

    "context:start": function (context) {
        this.contextNames = this.contextNames || [];

        if (this.contextNames.length == 0) {
            this.printProgress(context.name + ": ");
        }

        this.contextNames.push(context.name);
    },

    "context:end": function (context) {
        this.contextNames.pop();

        if (this.contextNames.length == 0) {
            this.printProgress("\n");
        }
    },

    "context:unsupported": function (data) {
        this.unsupported = this.unsupported || [];

        this.unsupported.push({
            context: (this.contextNames || []).concat([data.context.name]).join(" "),
            unsupported: data.unsupported
        });
    },

    "suite:end": function (stats) {
        this.printDeferred();
        this.printUnsupported();
        this.printTimeouts();
        this.printFailures();
        this.printErrors();
        this.printMessages();
        this.printStats(stats);
    },

    printMessages: function () {
        this.printGlobalMessages();
        if (!this.logPassedMessages) { return; }
        var log = this.messageLog || {};

        for (var ctx in log) {
            for (var test in log[ctx]) {
                if (log[ctx][test].length) {
                    this.write(this.color.green("Passed: " + ctx + " " + test) + "\n");
                }

                this.printLog(ctx, test);
            }
        }
    },

    printGlobalMessages: function () {
        var messages = this.globalMessageLog || [];
        if (messages.length == 0) return;

        this.write(this.color.green("Global message log:") + "\n");
        this.write("    " + messages.join("\n    ") + "\n");
        this.write("" + "\n");
    },

    printDeferred: function () {
        var funcs = this.deferred || {};
        if (funcs.length > 0) { this.write("\n"); }

        for (var i = 0, l = funcs.length; i < l; ++i) {
            this.write(this.color.cyan("Deferred: " + funcs[i].context +
                                         " " + funcs[i].name) + "\n");

            if (funcs[i].comment) {
                this.write(this.color.grey(funcs[i].comment) + "\n");
            }
        }

        if (funcs.length > 0) { this.write("" + "\n"); }
    },

    printUnsupported: function () {
        consoleReporter.printUnsupported.call(this, this.unsupported || {});
    },

    printLog: function (context, test) {
        var msgs = messages(this, context, test);

        if (msgs.length > 0) {
            this.write("    " + msgs.join("\n    ") + "\n\n");
        }

        delete this.messageLog[context][test];
    },

    replaceAsyncMarker: function () {
        if (this.async) {
            this.printProgress("\033[1D");
        }

        delete this.async;
    },

    log: function (msg) {
        var context = (this.contextNames || []).join(" ");
        var test = this.currentTest;

        messages(this, context, test).push(
            "[" + msg.level.toUpperCase() + "] " + msg.message);
    },

    printProgress: function (str) {
        if (!this.displayProgress) {
            return;
        }

        this.write(str);
    }
});
