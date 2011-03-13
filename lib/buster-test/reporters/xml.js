if (typeof require != "undefined") {
    var buster = require("buster-core");
}

(function () {
    function escape(str) {
        return str.replace(/"/g, "\\\"");
    }

    buster.xmlReporter = {
        create: function (opt) {
            var reporter = buster.create(this);
            opt = opt || {};
            reporter.io = opt.io || require("sys");
            reporter.contexts = [];
            reporter.depth = 0;

            return reporter;
        },

        listen: function (runner) {
            runner.bind(this, {
                "suite:start": "suiteStart", "context:start": "contextStart",
                "context:end": "contextEnd", "test:success": "testSuccess",
                "test:failure": "testFailure", "test:error": "testError",
                "test:timeout": "testTimeout"
            });

            return this;
        },

        suiteStart: function () {
            this.io.puts("<?xml version=\"1.0\" encoding=\"UTF-8\" ?>");
        },

        contextStart: function (context) {
            var ctx = {
                name: context.name,
                startedAt: new Date(),
                tests: 0,
                errors: [],
                failures: [],
                contexts: []
            };

            ctx.contexts.push(ctx);
            this.previous = this.current;

            if (this.depth == 0) {
                this.contexts.push(ctx);
                this.topLevel = ctx;
            } else {
                this.current.contexts.push(ctx);
            }

            this.current = ctx;
            this.depth += 1;
        },

        contextEnd: function (context) {
            this.current.elapsed = new Date() - (this.current.startedAt || 0);
            this.current = this.previous;
            this.depth -= 1;

            if (this.depth == 0) {
                var tests = this.topLevel.tests + this.topLevel.errors.length +
                    this.topLevel.failures.length;
                var elapsed = this.topLevel.elapsed;
                this.topLevel.elapsed = elapsed == 0 ? 0 : elapsed / 1000;

                this.io.puts('<testsuite errors="' + this.topLevel.errors.length +
                             '" tests="' + tests + '" time="' +
                             elapsed + '" failures="' +
                             this.topLevel.failures.length + '" name="' +
                             escape(this.topLevel.name) + '">');

                var contexts = this.topLevel.contexts, elapsed;

                for (var i = 1, l = contexts.length; i < l; ++i) {
                    contexts[0].elapsed -= contexts[i].elapsed;
                }

                for (i = 0, l = contexts.length; i < l; ++i) {
                    elapsed = contexts[i].elapsed / 1000;
                    this.io.puts('    <testcase time="' + elapsed +
                                 '" name="' + escape(contexts[i].name) + '">');
                    this.printErrors(contexts[i].failures);
                    this.printErrors(contexts[i].errors);
                    this.io.puts('    </testcase>');
                }

                this.io.puts("</testsuite>");
            }
        },

        testSuccess: function (test) {
            this.topLevel.tests += 1;
        },

        testError: function (test) {
            this.current.errors.push(test);

            if (this.current != this.topLevel) {
                this.topLevel.errors.push(test);
            }
        },

        testFailure: function (test) {
            this.current.failures.push(test);

            if (this.current != this.topLevel) {
                this.topLevel.failures.push(test);
            }
        },

        printErrors: function (errors) {
            var stack;

            for (var i = 0, l = errors.length; i < l; ++i) {
                if (!errors[i].error) {
                    continue;
                }

                stack = errors[i].error.stack || "";

                this.io.print('        <failure type="' + errors[i].error.name + '" ');
                this.io.print('message="' + escape(errors[i].error.message) + '">');
                this.io.print("\n            " + stack.split("\n").join("\n            "));
                this.io.puts("\n        </failure>");
            }
        }
    };

    buster.xmlReporter.testTimeout = buster.xmlReporter.testFailure;
}());

if (typeof module != "undefined") {
    module.exports = buster.xmlReporter;
}
