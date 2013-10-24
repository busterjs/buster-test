var helper = require("../test-helper");
var rhelper = require("./test-helper");
var bane = require("bane");
var referee = require("referee");
var assert = referee.assert;
var refute = referee.refute;
var sinon = require("sinon");
var xmlReporter = require("../../lib/reporters/xml");

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
        this.runner.emit("suite:start");

        var xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?>\n<testsuites>\n";
        this.assertIO(xml);
    },

    "prints testsuites closing tag on suite:end": function () {
        this.runner.emit("suite:end");

        this.assertIO("</testsuites>");
    },

    "prints testsuite element with stats on context:end": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("context:end", { name: "Context" });

        this.assertIO('    <testsuite errors="0" tests="0" ' +
                      'time="0" failures="0" name="Context">');
        this.assertIO('    </testsuite>');
    },

    "does not print testsuite element for nested context:end": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("context:start", { name: "Inner" });
        this.runner.emit("context:end", { name: "Inner" });

        assert.equals(this.outputStream.toString(), "");
    },

    "prints total time for test suite": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.clock.tick(100);
        this.runner.emit("context:end", { name: "Context" });

        this.assertIO('<testsuite errors="0" tests="0" ' +
                      'time="0.1" failures="0" name="Context">');
    },

    "prints total time for each test suite": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.clock.tick(100);
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("context:start", { name: "Context #2" });
        this.clock.tick(200);
        this.runner.emit("context:end", { name: "Context #2" });

        this.assertIO('<testsuite errors="0" tests="0" ' +
                      'time="0.1" failures="0" name="Context">');
        this.assertIO('<testsuite errors="0" tests="0" ' +
                      'time="0.2" failures="0" name="Context #2">');
    },

    "prints total time for each test": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("testStart", { name: "should #1" });
        this.clock.tick(10);
        this.runner.emit("test:success", { name: "should #1" });
        this.runner.emit("test:start", { name: "should #2" });
        this.clock.tick(20);
        this.runner.emit("test:success", { name: "should #2" });
        this.runner.emit("context:end", { name: "Context" });

        this.assertIO('<testsuite errors="0" tests="2" ' +
                      'time="0.03" failures="0" name="Context">');
        this.assertIO('<testcase time="0.01" classname="Context" name="should #1"/>');
        this.assertIO('<testcase time="0.02" classname="Context" name="should #2"/>');
    },

    "adds nested context names to test names": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("context:start", { name: "Some behavior" });
        this.runner.emit("test:start", { name: "should #1" });
        this.runner.emit("test:success", { name: "should #1" });
        this.runner.emit("test:start", { name: "should #2" });
        this.runner.emit("test:success", { name: "should #2" });
        this.runner.emit("context:end", { name: "Some behavior" });
        this.runner.emit("context:end", { name: "Context" });

        this.assertIO('<testsuite errors="0" tests="2" time="0" failures="0" name="Context">');
        this.assertIO('<testcase time="0" classname="Context" name="Some behavior should #1"/>');
        this.assertIO('<testcase time="0" classname="Context" name="Some behavior should #2"/>');
    },

    "controls number of contexts to keep in classname": function () {
        this.reporter.contextsInPackageName = 2;
        this.runner.emit("context:start", { name: "Firefox 4.0 Linux" });
        this.runner.emit("context:start", { name: "Form controller" });
        this.runner.emit("context:start", { name: "add" });
        this.runner.emit("test:start", { name: "should clear form" });
        this.runner.emit("test:success", { name: "should clear form" });
        this.runner.emit("test:start", { name: "should save item on server" });
        this.runner.emit("test:success", { name: "should save item on server" });
        this.runner.emit("context:end", { name: "add" });
        this.runner.emit("context:end", { name: "Form controller" });
        this.runner.emit("context:end", { name: "Firefox 4.0 Linux" });

        this.assertIO(/<testsuite .* name="Firefox 4.0 Linux">/);
        this.assertIO('classname="Firefox 4.0 Linux.Form controller" name="add should clear form"/>');
        this.assertIO('classname="Firefox 4.0 Linux.Form controller" name="add should save item on server"/>');
    },

    "counts total successful tests": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("test:start", { name: "#1" });
        this.runner.emit("test:success", { name: "#1" });
        this.runner.emit("test:start", { name: "#2" });
        this.runner.emit("test:success", { name: "#2" });
        this.runner.emit("context:end", { name: "Context" });

        this.assertIO('<testsuite errors="0" tests="2" ' +
                      'time="0" failures="0" name="Context">');
    },

    "counts test errors": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("test:start", { name: "#1" });
        this.runner.emit("test:success", { name: "#1" });
        this.runner.emit("test:start", { name: "#2" });
        this.runner.emit("test:error", { name: "#2", error: {} });
        this.runner.emit("context:end", { name: "Context" });

        this.assertIO('<testsuite errors="1" tests="2" ' +
                      'time="0" failures="0" name="Context">');
    },

    "counts test failures": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("test:start", { name: "#1" });
        this.runner.emit("test:success", { name: "#1" });
        this.runner.emit("test:start", { name: "#2" });
        this.runner.emit("test:failure", { name: "#2", error: {} });
        this.runner.emit("context:end", { name: "Context" });

        this.assertIO('<testsuite errors="0" tests="2" ' +
                      'time="0" failures="1" name="Context">');
    },

    "counts test timeout as failure": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("test:start", { name: "#1" });
        this.runner.emit("test:success", { name: "#1" });
        this.runner.emit("test:start", { name: "#2" });
        this.runner.emit("test:timeout", { name: "#2", error: {} });
        this.runner.emit("context:end", { name: "Context" });

        this.assertIO('<testsuite errors="0" tests="2" ' +
                      'time="0" failures="1" name="Context">');
    },

    "resets test count per context": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("test:success", { name: "#1" });
        this.runner.emit("test:success", { name: "#2" });
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("context:start", { name: "Context #2" });
        this.runner.emit("test:success", { name: "#1" });
        this.runner.emit("context:end", { name: "Context #2" });

        this.assertIO('<testsuite errors="0" tests="2" ' +
                      'time="0" failures="0" name="Context">');
        this.assertIO('<testsuite errors="0" tests="1" ' +
                      'time="0" failures="0" name="Context #2">');
    },

    "resets errors and failures count per context": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("test:error", { name: "#1" });
        this.runner.emit("test:failure", { name: "#2" });
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("context:start", { name: "Context #2" });
        this.runner.emit("test:failure", { name: "#1" });
        this.runner.emit("test:failure", { name: "#2" });
        this.runner.emit("test:error", { name: "#3" });
        this.runner.emit("test:error", { name: "#4" });
        this.runner.emit("context:end", { name: "Context #2" });

        this.assertIO('<testsuite errors="1" tests="2" ' +
                      'time="0" failures="1" name="Context">');
        this.assertIO('<testsuite errors="2" tests="4" ' +
                      'time="0" failures="2" name="Context #2">');
    },

    "does not reset test count for nested context": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("test:success", { name: "#1" });
        this.runner.emit("test:success", { name: "#2" });
        this.runner.emit("context:start", { name: "Context #2" });
        this.runner.emit("test:success", { name: "#1" });
        this.runner.emit("context:end", { name: "Context #2" });
        this.runner.emit("context:end", { name: "Context" });

        this.assertIO('<testsuite errors="0" tests="3" ' +
                      'time="0" failures="0" name="Context">');
        refute.match(this.outputStream.toString(), /<testsuite[^>]+name="Context #2">/);
    },

    "does not reset error and failures count for nested context": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("test:failure", { name: "#1" });
        this.runner.emit("test:error", { name: "#2" });
        this.runner.emit("context:start", { name: "Context #2" });
        this.runner.emit("test:error", { name: "#1" });
        this.runner.emit("test:failure", { name: "#1" });
        this.runner.emit("context:end", { name: "Context #2" });
        this.runner.emit("context:end", { name: "Context" });

        this.assertIO('<testsuite errors="2" tests="4" ' +
                      'time="0" failures="2" name="Context">');
        refute.match(this.outputStream.toString(), /<testsuite[^>]+name="Context #2">/);
    },

    "includes failure element for failed test": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("test:failure", { name: "#1", error: {
            name: "AssertionError", message: "Expected no failure",
            stack: "STACK\nSTACK"
        } });
        this.runner.emit("context:end", { name: "Context" });

        this.assertIO('            <failure type="AssertionError" ' +
                      'message="Expected no failure">' +
                      "\n                STACK\n                STACK" +
                      "\n            </failure>");
    },

    "includes failure element for all failed tests": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("test:failure", { name: "#1", error: {
            name: "AssertionError", message: "Expected no failure",
            stack: "STACK\nSTACK"
        } });
        this.runner.emit("test:failure", { name: "#1", error: {
            name: "AssertionError", message: "#2",
            stack: "stack"
        } });
        this.runner.emit("context:end", { name: "Context" });

        this.assertIO('            <failure type="AssertionError" ' +
                      'message="Expected no failure">' +
                      "\n                STACK\n                STACK\n" +
                      "            </failure>");
        this.assertIO('        <failure type="AssertionError" ' +
                      'message="#2">' + "\n                stack" +
                      "\n            </failure>");
    },

    "includes failure element for all errored tests": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("test:error", { name: "#1", error: {
            name: "TypeError", message: "Expected no failure",
            stack: "STACK\nSTACK"
        } });
        this.runner.emit("test:error", { name: "#1", error: {
            name: "TypeError", message: "#2",
            stack: "stack"
        } });
        this.runner.emit("context:end", { name: "Context" });

        this.assertIO('            <failure type="TypeError" ' +
                      'message="Expected no failure">' +
                      "\n                STACK\n                STACK\n" +
                      "            </failure>");
        this.assertIO('            <failure type="TypeError" ' +
                      'message="#2">' + "\n                stack" +
                      "\n            </failure>");
    },

    "escapes quotes in error message": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("test:error", { name: "#1", error: {
            name: "Error",
            message: '"Oops" is quoted'
        }});
        this.runner.emit("context:end", { name: "Context" });

        this.assertIO('<failure type="Error" message="&quot;Oops&quot; is quoted">');
    },

    "escapes brackets and ampersands in error message": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("test:error", { name: "#1", error: {
            name: "Error",
            message: '<Oops> & stuff'
        }});
        this.runner.emit("context:end", { name: "Context" });

        this.assertIO('<failure type="Error" message="&lt;Oops&gt; &amp; stuff">');
    },

    "escapes quotes in test names": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("test:success", { name: 'it tests the "foo" part'});
        this.runner.emit("context:end", { name: "Context" });
        this.assertIO(/name="it tests the &quot;foo&quot; part".*/);
    },

    "escapes stack trace": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("test:error", { name: "#1", error: {
            name: "Error",
            message: '<Oops> & stuff',
            stack: 'Stack: &<>"'
        }});
        this.runner.emit("context:end", { name: "Context" });

        this.assertIO('Stack: &amp;&lt;&gt;&quot;');
    },

    "includes failure element for timed out test": function () {
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("test:timeout", { name: "#1", error: {
            name: "TimeoutError",
            message: "Timed out after 250ms",
            stack: "STACK\nSTACK",
            source: "setUp"
        } });
        this.runner.emit("context:end", { name: "Context" });

        this.assertIO('            <failure type="TimeoutError" ' +
                      'message="setUp timed out after 250ms">' +
                      "\n                STACK\n                STACK" +
                      "\n            </failure>");
    },

    "includes failure element for uncaught exceptions": function () {
        this.runner.emit("uncaughtException", {
            name: "TypeError",
            message: "Thingamagiggy",
            stack: "STACK\nSTACK"
        });
        this.runner.emit("suite:end");

        this.assertIO("<testsuite errors=\"1\" tests=\"1\" failures=\"0\" name=\"Uncaught exceptions\">");
        this.assertIO("<testcase classname=\"Uncaught exception\" time=\"0\" name=\"#1\">");
        this.assertIO('<failure type="TypeError" ' +
                      'message="Thingamagiggy">' +
                      "\n                STACK\n                STACK" +
                      "\n            </failure>");
    },

    "defaults uncaught exception type": function () {
        this.runner.emit("uncaughtException", {
            message: "Thingamagiggy"
        });
        this.runner.emit("suite:end");

        this.assertIO("<testsuite errors=\"1\" tests=\"1\" failures=\"0\" name=\"Uncaught exceptions\">");
        this.assertIO("<testcase classname=\"Uncaught exception\" time=\"0\" name=\"#1\">");
        this.assertIO('<failure type="Error" message="Thingamagiggy"></failure>');
    },

    "does not include element for uncaught exceptions when there are none": function () {
        this.runner.emit("suite:end");
        refute.match(this.outputStream.toString(), "Uncaught exceptions");
    },

    "does not produce invalid xml for uncaught exceptions": function () {
        this.runner.emit("uncaughtException", {
            message: "Thingamagiggy"
        });
        this.runner.emit("suite:end");

        refute.match(this.outputStream.toString(), "time=\"0\"name=\"#1\"");
    }
});
