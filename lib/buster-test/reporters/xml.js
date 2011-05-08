if (typeof require != "undefined") {
    var buster = require("buster-core");
}

(function () {
    function escape(str) {
        return (str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function elapsedInSec(elapsed) {
        return elapsed == 0 ? 0 : elapsed / 1000;
    }

    function contextName(contexts) {
        var name = contexts[0].name;
        var pieces = [];

        if (contexts.length > 1) {
            name += ".";
        }

        for (var i = 1, l = contexts.length; i < l; ++i) {
            pieces.push(contexts[i].name);
        }

        return name + pieces.join(" ");
    }

    buster.reporters = buster.reporters || {};

    buster.reporters.xml = {
        create: function (opt) {
            var reporter = buster.create(this);
            opt = opt || {};
            reporter.io = opt.io || require("sys");

            return reporter;
        },

        listen: function (runner) {
            runner.bind(this, {
                "suite:start": "suiteStart", "suite:end": "suiteEnd",
                "context:start": "contextStart", "context:end": "contextEnd",
                "test:success": "testSuccess", "test:failure": "testFailure",
                "test:error": "testError", "test:timeout": "testTimeout",
                "test:start": "testStart"
            });

            return this;
        },

        suiteStart: function () {
            this.io.puts("<?xml version=\"1.0\" encoding=\"UTF-8\" ?>");
            this.io.puts("<testsuites>");
        },

        suiteEnd: function () {
            this.io.puts("</testsuites>");
        },

        contextStart: function (context) {
            this.contexts = this.contexts || [];

            var testCase = {
                name: context.name,
                startedAt: new Date().getTime(),
                tests: 0,
                errors: 0,
                failures: 0
            };

            if (this.contexts.length == 0) {
                this.suite = testCase;
            }

            this.contexts.push(testCase);
        },

        contextEnd: function () {
            var context = this.contexts.pop();

            if (this.contexts.length > 0) {
                return;
            }

            var elapsed = new Date().getTime() - context.startedAt;
            var tests = this.suite.tests && this.suite.tests.length || 0;

            this.io.puts("    <testsuite errors=\"" + this.suite.errors +
                         "\" tests=\"" + tests +
                         "\" time=\"" + elapsedInSec(elapsed) +
                         "\" failures=\"" + this.suite.failures +
                         "\" name=\"" + context.name + "\">");
            this.renderTests(this.suite.tests);
            this.io.puts("    </testsuite>");
        },

        testStart: function (test) {
            this.currentTest = this.addTest(test);
        },

        testSuccess: function (test) {
            this.completeTest(this.currentTest || this.addTest(test));
        },

        testError: function (testData) {
            var test = this.completeTest(this.currentTest || this.addTest(testData));
            this.suite.errors += 1;
            test.errors.push(testData.error);
        },

        testFailure: function (testData) {
            var test = this.completeTest(this.currentTest || this.addTest(testData));
            this.suite.failures += 1;
            test.failures.push(testData.error);
        },

        renderTests: function (tests) {
            for (var i = 0, l = tests.length; i < l; ++i) {
                this.io.print("        <testcase time=\"" +
                              elapsedInSec(tests[i].elapsed) +
                              "\" classname=\"" + tests[i].context +
                              "\" name=\"" + tests[i].name + "\"");

                if (tests[i].errors.length + tests[i].failures.length > 0) {
                    this.io.print(">\n");
                    this.renderErrors(tests[i].errors);
                    this.renderErrors(tests[i].failures);
                    this.io.puts("        </testcase>");
                } else {
                    this.io.puts("/>\n");
                }
            }
        },

        renderErrors: function (errors) {
            var stack, ind = "            ", failInd = "\n    " + ind;

            for (var i = 0, l = errors.length; i < l; ++i) {
                if (!errors[i]) {
                    continue;
                }

                stack = escape(errors[i].stack);
                this.io.print(ind + '<failure type="' + errors[i].name + '" ');
                this.io.print('message="' + escape(errors[i].message) + '">');
                this.io.print(failInd + stack.split("\n").join(failInd));
                this.io.puts("\n" + ind + "</failure>");
            }
        },

        addTest: function (test) {
            this.suite.tests = this.suite.tests || [];

            var to = {
                name: test.name,
                startedAt: new Date().getTime(),
                context: contextName(this.contexts),
                failures: [],
                errors: []
            };

            this.suite.tests.push(to);
            return to;
        },

        completeTest: function (test) {
            test.elapsed = new Date().getTime() - test.startedAt;
            return test;
        }
    };

    buster.reporters.xml.testTimeout = buster.reporters.xml.testFailure;
}());

if (typeof module != "undefined") {
    module.exports = buster.reporters.xml;
}
