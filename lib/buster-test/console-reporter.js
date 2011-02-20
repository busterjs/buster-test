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

    buster.consoleReporter = {
        colors: false,
        bright: false,
        assertions: 0,
        failures: 0,
        errors: 0,
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

            runner.on("suite:end", B.util.bind(reporter, "printStats"));
            runner.on("context:start", B.util.bind(reporter, "startContext"));
            runner.on("context:end", B.util.bind(reporter, "endContext"));
            runner.on("test:success", B.util.bind(reporter, "testSuccess"));
            runner.on("test:error", B.util.bind(reporter, "testError"));
            runner.on("test:fail", B.util.bind(reporter, "testFail"));

            return reporter;
        },

        testSuccess: function (test) {
            this.successes += 1;
            this.assertions += typeof test.assertions == "number" ? test.assertions : 0;
            this.io.print(this.green("."));
        },

        testError: function (test) {
            this.errors += 1;
            this.io.print(this.yellow("E"));
        },

        testFail: function (test) {
            this.failures += 1;
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
            return this.failures == 0 && this.errors == 0 && this.successes > 0 && this.assertions > 0;
        },

        printStats: function () {
            var tests = this.successes + this.failures + this.errors;
            var stats = [pluralize(this.contexts, "test case"),
                         pluralize(tests, "test"),
                         pluralize(this.assertions, "assertion"),
                         pluralize(this.failures, "failure"),
                         pluralize(this.errors, "error")];

            var color = this.success() ? "green" : "red";
            this.io.puts("\n" + this[color](stats.join(", ")));

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
        }
    };
}(buster));

if (typeof module != "undefined") {
    module.exports = buster.consoleReporter;
}
