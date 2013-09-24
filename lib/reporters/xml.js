((typeof define === "function" && define.amd && function (m) {
    define(m);
}) || (typeof module === "object" &&
       typeof require === "function" && function (m) {
           module.exports = m();
       }) || function (m) {
           this.buster = this.buster || {};
           this.buster.reporters = this.buster.reporters || {};
           this.buster.reporters.xml = m();
       }
)(function () {
    "use strict";

    function escape(str) {
        return (str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function elapsedInSec(elapsed) {
        var sec = elapsed == 0 ? 0 : elapsed / 1000;
        return isNaN(sec) ? 0 : sec;
    }

    function packageName(contexts, min) {
        return contexts.slice(0, min).map(function (c) { return c.name; }).join(".");
    }

    function testName(test, contexts, min) {
        return contexts.slice(min).map(function (context) {
            return context.name;
        }).concat([test]).join(" ");
    }

    function renderUncaught(error, i) {
        this.writeln("        <testcase classname=\"Uncaught exception\" time=\"0\" " +
                     "name=\"#" + (i + 1) + "\">");
        this.renderErrors([error]);
        this.writeln("        </testcase>");
    }

    function getOutputStream(opt) {
        if (opt.outputStream) { return opt.outputStream; }
        var util = require("util");
        return {
            write: function (bytes) { util.print(bytes); }
        };
    }

    function XMLReporter(opt) {
        this.out = getOutputStream(opt || {});
        this.uncaught = [];
    }

    var xmlReporter = XMLReporter.prototype = {
        contextsInPackageName: 1,

        create: function (opt) {
            return new XMLReporter(opt);
        },

        listen: function (runner) {
            runner.bind(this);
            return this;
        },

        "suite:start": function () {
            this.writeln("<?xml version=\"1.0\" encoding=\"UTF-8\" ?>");
            this.writeln("<testsuites>");
            this.startedAt = new Date().getTime();
        },

        "suite:end": function () {
            this.renderUncaughtExceptions();
            this.writeln("</testsuites>");
        },

        "context:start": function (context) {
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
            this.startedAt = this.startedAt || new Date().getTime();
        },

        "context:end": function () {
            var context = this.contexts.pop();

            if (this.contexts.length > 0) {
                return;
            }

            this.suiteTag(context.name, {
                tests: this.suite.tests && this.suite.tests.length || 0,
                errors: this.suite.errors,
                time: elapsedInSec(new Date().getTime() - context.startedAt),
                failures: this.suite.failures
            });

            this.renderTests(this.suite.tests);
            this.writeln("    </testsuite>");
        },

        "test:start": function (test) {
            this.currentTest = this.addTest(test);
        },

        "test:success": function (test) {
            this.completeTest(this.currentTest || this.addTest(test));
        },

        "test:error": function (testData) {
            var test = this.completeTest(this.currentTest || this.addTest(testData));
            this.suite.errors += 1;
            test.errors.push(testData.error);
        },

        "test:failure": function (testData) {
            var test = this.completeTest(this.currentTest || this.addTest(testData));
            this.suite.failures += 1;
            test.failures.push(testData.error);
        },

        uncaughtException: function (error) {
            this.uncaught.push(error);
        },

        renderUncaughtExceptions: function () {
            if (this.uncaught.length === 0) { return; }
            this.suiteTag("Uncaught exceptions", {
                tests: this.uncaught.length,
                errors: this.uncaught.length
            });
            this.uncaught.forEach(renderUncaught, this);
            this.writeln("    </testsuite>");
        },

        renderTests: function (tests) {
            for (var i = 0, l = tests.length; i < l; ++i) {
                this.write("        <testcase time=\"" +
                           elapsedInSec(tests[i].elapsed) +
                           "\" classname=\"" + tests[i].context +
                           "\" name=\"" + escape(tests[i].name) + "\"");

                if (tests[i].errors.length + tests[i].failures.length > 0) {
                    this.write(">\n");
                    this.renderErrors(tests[i].errors);
                    this.renderErrors(tests[i].failures);
                    this.writeln("        </testcase>");
                } else {
                    this.writeln("/>");
                }
            }
        },

        renderErrors: function (errors) {
            var stack, ind = "            ", failInd = "\n    " + ind;

            for (var i = 0, l = errors.length; i < l; ++i) {
                if (!errors[i]) { continue; }
                stack = escape(errors[i].stack);
                var type = errors[i].name || "Error";
                this.write(ind + '<failure type="' + type + '" ');
                var message = errors[i].message;
                if (errors[i].source) {
                    message = errors[i].source + " " +
                        message.slice(0, 1).toLowerCase() + message.slice(1);
                }
                this.write('message="' + escape(message) + '">');
                if (errors[i].stack) {
                    this.write(failInd + stack.split("\n").join(failInd) + "\n" + ind);
                }
                this.writeln("</failure>");
            }
        },

        addTest: function (test) {
            this.suite.tests = this.suite.tests || [];

            var to = {
                name: testName(test.name, this.contexts, this.contextsInPackageName),
                context: packageName(this.contexts, this.contextsInPackageName),
                failures: [],
                errors: []
            };

            this.suite.tests.push(to);
            return to;
        },

        completeTest: function (test) {
            var now = new Date().getTime();
            test.elapsed = now - this.startedAt;
            this.startedAt = now;
            return test;
        },

        suiteTag: function (name, options) {
            this.write("    <testsuite errors=\"" + options.errors +
                       "\" tests=\"" + options.tests);
            if (options.hasOwnProperty("time")) {
                this.write("\" time=\"" + options.time);
            }
            this.write("\" failures=\"" + (options.failures || 0) +
                       "\" name=\"" + name + "\">\n");
        },

        write: function (str) {
            this.out.write(str);
        },

        writeln: function (str) {
            this.write(str + "\n");
        }
    };

    xmlReporter["test:timeout"] = xmlReporter["test:failure"];
    return xmlReporter;
});
