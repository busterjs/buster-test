if (typeof require != "undefined") {
    var buster = require("buster-core");
}

(function () {
    function escape(str) {
        return (str || "").replace(/"/g, "\\\"");
    }

    function elapsedInSec(context) {
        return context.elapsed == 0 ? 0 : context.elapsed / 1000;
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
                "test:error": "testError", "test:timeout": "testTimeout"
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
            if (this.current) {
                this.addTestCase(this.current);
            } else {
                this.suite = {
                    name: context.name,
                    startedAt: new Date(),
                    testCases: [],
                    tests: 0,
                    errors: 0,
                    failures: 0
                };
            }

            var name = this.current && this.current.name + " " || "";

            this.current = {
                name: name + context.name,
                startedAt: new Date(),
                parent: this.current,
                errors: [],
                failures: []
            };
        },

        contextEnd: function (context) {
            if (!this.current.elapsed) {
                this.addTestCase(this.current);
            }

            this.current = this.current.parent;

            if (!this.current) {
                this.renderSuite(this.suite);
            }
        },

        testSuccess: function (test) {
            this.suite.tests += 1;
        },

        testError: function (test) {
            this.suite.tests += 1;
            this.suite.errors += 1;
            this.current.errors.push(test.error);
        },

        testFailure: function (test) {
            this.suite.tests += 1;
            this.suite.failures += 1;
            this.current.failures.push(test.error);
        },

        renderSuite: function (suite) {
            suite.elapsed = new Date() - suite.startedAt;

            this.io.puts('    <testsuite errors="' + suite.errors +
                         '" tests="' + suite.tests +
                         '" time="' + elapsedInSec(suite) +
                         '" failures="' + suite.failures +
                         '" name="' + escape(suite.name) + '">');
            var elapsed = suite.elapsed * 1000;

            for (var i = 1, l = suite.testCases.length; i < l; ++i) {
                this.renderTestCase(suite.testCases[i]);
                elapsed -= suite.testCases[i].elapsed * 1000;
            }

            if (suite.testCases.length > 0) {
                suite.testCases[0].elapsed = elapsed > 0 ? elapsed / 1000 : 0;
                this.renderTestCase(suite.testCases[0]);
            }

            this.io.puts("    </testsuite>");
         },

        renderTestCase: function (testCase) {
            this.io.print('        <testcase time="' + elapsedInSec(testCase) +
                          '" name="' + escape(testCase.name) + '"');

            if ((testCase.errors.length + testCase.failures.length) == 0) {
                this.io.puts("/>");
            } else {
                this.io.puts(">");
                this.renderErrors(testCase.errors);
                this.renderErrors(testCase.failures);
                this.io.puts("        </testcase>");
            }
        },

        renderErrors: function (errors) {
            var stack, ind = "            ", failInd = "\n    " + ind;

            for (var i = 0, l = errors.length; i < l; ++i) {
                if (!errors[i]) {
                    continue;
                }

                stack = errors[i].stack || "";
                this.io.print(ind + '<failure type="' + errors[i].name + '" ');
                this.io.print('message="' + escape(errors[i].message) + '">');
                this.io.print(failInd + stack.split("\n").join(failInd));
                this.io.puts("\n" + ind + "</failure>");
            }
        },

        addTestCase: function (testCase) {
            testCase.elapsed = new Date() - testCase.startedAt;
            this.suite.testCases.push(testCase);
        }
    };

    buster.reporters.xml.testTimeout = buster.reporters.xml.testFailure;
}());

if (typeof module != "undefined") {
    module.exports = buster.reporters.xml;
}
