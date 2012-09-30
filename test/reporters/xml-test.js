var helper = require("../test-helper");
var rhelper = require("./test-helper");
var bane = require("bane");
var referee = require("referee");
var assert = referee.assert;
var refute = referee.refute;
var sinon = require("sinon");
var xmlReporter = require("../../lib/buster-test/reporters/xml");

helper.testCase("XMLReporterTest", {
    setUp: function () {
        this.outputStream = rhelper.writableStream();
        this.assertIO = rhelper.assertIO;
        this.runner = bane.createEventEmitter();
        this.reporter = xmlReporter.create({
            outputStream: this.outputStream
        }).listen(this.runner);
        this.clock = sinon.useFakeTimers();
    },

    tearDown: function () {
        this.clock.restore();
    },

    "prints xml prolog and testsuites tag on suite:start": function () {
        this.reporter.suiteStart();

        var xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?>\n<testsuites>\n";
        this.assertIO(xml);
    },

    "prints testsuites closing tag on suite:end": function () {
        this.reporter.suiteEnd();

        this.assertIO("</testsuites>");
    },

    "prints testsuite element with stats on context:end": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('    <testsuite errors="0" tests="0" ' +
                      'time="0" failures="0" name="Context">');
        this.assertIO('    </testsuite>');
    },

    "does not print testsuite element for nested context:end": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.contextStart({ name: "Inner" });
        this.reporter.contextEnd({ name: "Inner" });

        assert.equals(this.outputStream.toString(), "");
    },

    "prints total time for test suite": function () {
        this.reporter.contextStart({ name: "Context" });
        this.clock.tick(100);
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<testsuite errors="0" tests="0" ' +
                      'time="0.1" failures="0" name="Context">');
    },

    "prints total time for each test suite": function () {
        this.reporter.contextStart({ name: "Context" });
        this.clock.tick(100);
        this.reporter.contextEnd({ name: "Context" });
        this.reporter.contextStart({ name: "Context #2" });
        this.clock.tick(200);
        this.reporter.contextEnd({ name: "Context #2" });

        this.assertIO('<testsuite errors="0" tests="0" ' +
                      'time="0.1" failures="0" name="Context">');
        this.assertIO('<testsuite errors="0" tests="0" ' +
                      'time="0.2" failures="0" name="Context #2">');
    },

    "prints total time for each test": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testStart({ name: "should #1" });
        this.clock.tick(10);
        this.reporter.testSuccess({ name: "should #1" });
        this.reporter.testStart({ name: "should #2" });
        this.clock.tick(20);
        this.reporter.testSuccess({ name: "should #2" });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<testsuite errors="0" tests="2" ' +
                      'time="0.03" failures="0" name="Context">');
        this.assertIO('<testcase time="0.01" classname="Context" name="should #1"/>');
        this.assertIO('<testcase time="0.02" classname="Context" name="should #2"/>');
    },

    "adds nested context names to test names": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.contextStart({ name: "Some behavior" });
        this.reporter.testStart({ name: "should #1" });
        this.reporter.testSuccess({ name: "should #1" });
        this.reporter.testStart({ name: "should #2" });
        this.reporter.testSuccess({ name: "should #2" });
        this.reporter.contextEnd({ name: "Some behavior" });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<testsuite errors="0" tests="2" time="0" failures="0" name="Context">');
        this.assertIO('<testcase time="0" classname="Context" name="Some behavior should #1"/>');
        this.assertIO('<testcase time="0" classname="Context" name="Some behavior should #2"/>');
    },

    "controls number of contexts to keep in classname": function () {
        this.reporter.contextsInPackageName = 2;
        this.reporter.contextStart({ name: "Firefox 4.0 Linux" });
        this.reporter.contextStart({ name: "Form controller" });
        this.reporter.contextStart({ name: "add" });
        this.reporter.testStart({ name: "should clear form" });
        this.reporter.testSuccess({ name: "should clear form" });
        this.reporter.testStart({ name: "should save item on server" });
        this.reporter.testSuccess({ name: "should save item on server" });
        this.reporter.contextEnd({ name: "add" });
        this.reporter.contextEnd({ name: "Form controller" });
        this.reporter.contextEnd({ name: "Firefox 4.0 Linux" });

        this.assertIO(/<testsuite .* name="Firefox 4.0 Linux">/);
        this.assertIO('classname="Firefox 4.0 Linux.Form controller" name="add should clear form"/>');
        this.assertIO('classname="Firefox 4.0 Linux.Form controller" name="add should save item on server"/>');
    },

    "counts total successful tests": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testStart({ name: "#1" });
        this.reporter.testSuccess({ name: "#1" });
        this.reporter.testStart({ name: "#2" });
        this.reporter.testSuccess({ name: "#2" });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<testsuite errors="0" tests="2" ' +
                      'time="0" failures="0" name="Context">');
    },

    "counts test errors": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testStart({ name: "#1" });
        this.reporter.testSuccess({ name: "#1" });
        this.reporter.testStart({ name: "#2" });
        this.reporter.testError({ name: "#2", error: {} });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<testsuite errors="1" tests="2" ' +
                      'time="0" failures="0" name="Context">');
    },

    "counts test failures": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testStart({ name: "#1" });
        this.reporter.testSuccess({ name: "#1" });
        this.reporter.testStart({ name: "#2" });
        this.reporter.testFailure({ name: "#2", error: {} });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<testsuite errors="0" tests="2" ' +
                      'time="0" failures="1" name="Context">');
    },

    "counts test timeout as failure": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testStart({ name: "#1" });
        this.reporter.testSuccess({ name: "#1" });
        this.reporter.testStart({ name: "#2" });
        this.reporter.testTimeout({ name: "#2", error: {} });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<testsuite errors="0" tests="2" ' +
                      'time="0" failures="1" name="Context">');
    },

    "resets test count per context": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testSuccess({ name: "#1" });
        this.reporter.testSuccess({ name: "#2" });
        this.reporter.contextEnd({ name: "Context" });
        this.reporter.contextStart({ name: "Context #2" });
        this.reporter.testSuccess({ name: "#1" });
        this.reporter.contextEnd({ name: "Context #2" });

        this.assertIO('<testsuite errors="0" tests="2" ' +
                      'time="0" failures="0" name="Context">');
        this.assertIO('<testsuite errors="0" tests="1" ' +
                      'time="0" failures="0" name="Context #2">');
    },

    "resets errors and failures count per context": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testError({ name: "#1" });
        this.reporter.testFailure({ name: "#2" });
        this.reporter.contextEnd({ name: "Context" });
        this.reporter.contextStart({ name: "Context #2" });
        this.reporter.testFailure({ name: "#1" });
        this.reporter.testFailure({ name: "#2" });
        this.reporter.testError({ name: "#3" });
        this.reporter.testError({ name: "#4" });
        this.reporter.contextEnd({ name: "Context #2" });

        this.assertIO('<testsuite errors="1" tests="2" ' +
                      'time="0" failures="1" name="Context">');
        this.assertIO('<testsuite errors="2" tests="4" ' +
                      'time="0" failures="2" name="Context #2">');
    },

    "does not reset test count for nested context": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testSuccess({ name: "#1" });
        this.reporter.testSuccess({ name: "#2" });
        this.reporter.contextStart({ name: "Context #2" });
        this.reporter.testSuccess({ name: "#1" });
        this.reporter.contextEnd({ name: "Context #2" });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<testsuite errors="0" tests="3" ' +
                      'time="0" failures="0" name="Context">');
        refute.match(this.outputStream.toString(), /<testsuite[^>]+name="Context #2">/);
    },

    "does not reset error and failures count for nested context": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testFailure({ name: "#1" });
        this.reporter.testError({ name: "#2" });
        this.reporter.contextStart({ name: "Context #2" });
        this.reporter.testError({ name: "#1" });
        this.reporter.testFailure({ name: "#1" });
        this.reporter.contextEnd({ name: "Context #2" });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<testsuite errors="2" tests="4" ' +
                      'time="0" failures="2" name="Context">');
        refute.match(this.outputStream.toString(), /<testsuite[^>]+name="Context #2">/);
    },

    "includes failure element for failed test": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testFailure({ name: "#1", error: {
            name: "AssertionError", message: "Expected no failure",
            stack: "STACK\nSTACK"
        } });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('            <failure type="AssertionError" ' +
                      'message="Expected no failure">' +
                      "\n                STACK\n                STACK" +
                      "\n            </failure>");
    },

    "includes failure element for all failed tests": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testFailure({ name: "#1", error: {
            name: "AssertionError", message: "Expected no failure",
            stack: "STACK\nSTACK"
        } });
        this.reporter.testFailure({ name: "#1", error: {
            name: "AssertionError", message: "#2",
            stack: "stack"
        } });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('            <failure type="AssertionError" ' +
                      'message="Expected no failure">' +
                      "\n                STACK\n                STACK\n" +
                      "            </failure>");
        this.assertIO('        <failure type="AssertionError" ' +
                      'message="#2">' + "\n                stack" +
                      "\n            </failure>");
    },

    "includes failure element for all errored tests": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testError({ name: "#1", error: {
            name: "TypeError", message: "Expected no failure",
            stack: "STACK\nSTACK"
        } });
        this.reporter.testError({ name: "#1", error: {
            name: "TypeError", message: "#2",
            stack: "stack"
        } });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('            <failure type="TypeError" ' +
                      'message="Expected no failure">' +
                      "\n                STACK\n                STACK\n" +
                      "            </failure>");
        this.assertIO('            <failure type="TypeError" ' +
                      'message="#2">' + "\n                stack" +
                      "\n            </failure>");
    },

    "escapes quotes in error message": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testError({ name: "#1", error: {
            name: "Error",
            message: '"Oops" is quoted'
        }});
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<failure type="Error" message="&quot;Oops&quot; is quoted">');
    },

    "escapes brackets and ampersands in error message": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testError({ name: "#1", error: {
            name: "Error",
            message: '<Oops> & stuff'
        }});
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('<failure type="Error" message="&lt;Oops&gt; &amp; stuff">');
    },

    "escapes quotes in test names": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testSuccess({ name: 'it tests the "foo" part'});
        this.reporter.contextEnd({ name: "Context" });
        this.assertIO(/name="it tests the &quot;foo&quot; part".*/);
    },

    "escapes stack trace": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testError({ name: "#1", error: {
            name: "Error",
            message: '<Oops> & stuff',
            stack: 'Stack: &<>"'
        }});
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('Stack: &amp;&lt;&gt;&quot;');
    },

    "includes failure element for timed out test": function () {
        this.reporter.contextStart({ name: "Context" });
        this.reporter.testTimeout({ name: "#1", error: {
            name: "TimeoutError",
            message: "Timed out after 250ms",
            stack: "STACK\nSTACK",
            source: "setUp"
        } });
        this.reporter.contextEnd({ name: "Context" });

        this.assertIO('            <failure type="TimeoutError" ' +
                      'message="setUp timed out after 250ms">' +
                      "\n                STACK\n                STACK" +
                      "\n            </failure>");
    },

    "includes failure element for uncaught exceptions": function () {
        this.reporter.uncaughtException({
            name: "TypeError",
            message: "Thingamagiggy",
            stack: "STACK\nSTACK"
        });
        this.reporter.suiteEnd();

        this.assertIO("<testsuite errors=\"1\" tests=\"1\" failures=\"0\" name=\"Uncaught exceptions\">");
        this.assertIO("<testcase classname=\"Uncaught exception\" name=\"#1\">");
        this.assertIO('<failure type="TypeError" ' +
                      'message="Thingamagiggy">' +
                      "\n                STACK\n                STACK" +
                      "\n            </failure>");
    },

    "defaults uncaught exception type": function () {
        this.reporter.uncaughtException({
            message: "Thingamagiggy"
        });
        this.reporter.suiteEnd();

        this.assertIO("<testsuite errors=\"1\" tests=\"1\" failures=\"0\" name=\"Uncaught exceptions\">");
        this.assertIO("<testcase classname=\"Uncaught exception\" name=\"#1\">");
        this.assertIO('<failure type="Error" message="Thingamagiggy"></failure>');
    },

    "does not include element for uncaught exceptions when there are none": function () {
        this.reporter.suiteEnd();
        refute.match(this.outputStream.toString(), "Uncaught exceptions");
    }
});
