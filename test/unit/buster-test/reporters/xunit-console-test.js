if (typeof require != "undefined") {
    var testCase = require("buster-util").testCase;
    var sinon = require("sinon");

    var buster = {
        assert: require("buster-assert"),
        util: require("buster-util"),
        eventEmitter: require("buster-event-emitter"),
        xUnitConsoleReporter: require("buster-test/reporters/xunit-console")
    };
}

testCase("XUnitConsoleReporterEventMappingTest", sinon.testCase({
    setUp: function () {
        this.stub(buster.xUnitConsoleReporter, "reset");
        this.stub(buster.xUnitConsoleReporter, "printDetails");
        this.stub(buster.xUnitConsoleReporter, "startContext");
        this.stub(buster.xUnitConsoleReporter, "endContext");
        this.stub(buster.xUnitConsoleReporter, "testSuccess");
        this.stub(buster.xUnitConsoleReporter, "testFailure");
        this.stub(buster.xUnitConsoleReporter, "testError");
        this.stub(buster.xUnitConsoleReporter, "testAsync");
        this.stub(buster.xUnitConsoleReporter, "testTimeout");
        this.stub(buster.xUnitConsoleReporter, "log");

        this.runner = buster.util.create(buster.eventEmitter);
        this.runner.console = buster.util.create(buster.eventEmitter);
        this.reporter = buster.xUnitConsoleReporter.create(this.runner);
    },

    "should map suite:start to reset": function () {
        this.runner.emit("suite:start");

        // reset is also called by the create method
        buster.assert(this.reporter.reset.calledTwice);
    },

    "should map suite:end to printDetails": function () {
        this.runner.emit("suite:end", {});

        buster.assert(this.reporter.printDetails.calledOnce);
    },

    "should map context:start to startContext": function () {
        this.runner.emit("context:start");

        buster.assert(this.reporter.startContext.calledOnce);
    },

    "should map test:success to testSuccess": function () {
        this.runner.emit("test:success");

        buster.assert(this.reporter.testSuccess.calledOnce);
    },

    "should map test:error to testError": function () {
        this.runner.emit("test:error");

        buster.assert(this.reporter.testError.calledOnce);
    },

    "should map test:fail to testFailure": function () {
        this.runner.emit("test:failure");

        buster.assert(this.reporter.testFailure.calledOnce);
    },

    "should map test:async to testAsync": function () {
        this.runner.emit("test:async");

        buster.assert(this.reporter.testAsync.calledOnce);
    },

    "should map test:timeout to testTimeout": function () {
        this.runner.emit("test:timeout");

        buster.assert(this.reporter.testTimeout.calledOnce);
    },

    "should map logger log to log": function () {
        this.runner.console.emit("log");

        buster.assert(this.reporter.log.calledOnce);
    }
}, "should"));

function runnerSetUp() {
    this.io = {
        content: "",
        puts: function (str) { this.print(str + "\n"); },
        print: function (str) { this.content += str; },
        toString: function () { return this.content }
    };

    this.runner = buster.util.create(buster.eventEmitter);
}

function reporterSetUp() {
    runnerSetUp.call(this);
    this.reporter = buster.xUnitConsoleReporter.create(this.runner, { io: this.io });
}

testCase("XUnitConsoleReporterTestsRunningTest", {
    setUp: reporterSetUp,

    "should print dot when test passes": function () {
        this.reporter.testSuccess({ name: "Stuff" });

        buster.assert.equals(".", this.io.toString());
    },

    "should print capital E when test errors": function () {
        this.reporter.testError({ name: "Stuff" });

        buster.assert.equals("E", this.io.toString());
    },

    "should print capital F when test fails": function () {
        this.reporter.testFailure({ name: "Stuff" });

        buster.assert.equals("F", this.io.toString());
    },

    "should print capital T when test times out": function () {
        this.runner.emit("test:timeout", { name: "Stuff" });

        buster.assert.equals("T", this.io.toString());
    },

    "should print capital A when test is asynchronous": function () {
        this.reporter.testAsync({ name: "Stuff" });

        buster.assert.equals("A", this.io.toString());
    },

    "should replace async marker when test completes": function () {
        this.reporter.testAsync({ name: "Stuff #1" });
        this.reporter.testSuccess({ name: "Stuff #1" });
        this.reporter.testAsync({ name: "Stuff #2" });
        this.reporter.testFailure({ name: "Stuff #2" });
        this.reporter.testAsync({ name: "Stuff #3" });
        this.reporter.testError({ name: "Stuff #3" });

        buster.assert.equals("A\033[1D.A\033[1DFA\033[1DE", this.io.toString());
    },

    "should print context name when starting top-level context": function () {
        this.reporter.startContext({ name: "Stuff" });

        buster.assert.equals("Stuff: ", this.io.toString());
    },

    "should not print context name when starting inner context": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.startContext({ name: "Inner" });

        buster.assert.equals("Stuff: ", this.io.toString());
    },

    "should print line break when ending top-level context": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.endContext({ name: "Stuff" });

        buster.assert.match("Stuff: \n", this.io.toString());
    },

    "should not print line break when ending inner context": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.startContext({ name: "Inner" });
        this.reporter.endContext({ name: "Inner" });
        this.reporter.endContext({ name: "Stuff" });

        buster.assert.match("Stuff: \n", this.io.toString());
    },

    "should print all top-level context names": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.startContext({ name: "Second" });
        this.reporter.endContext({ name: "Second" });

        buster.assert.match("Stuff: \nSecond: \n", this.io.toString());
    }
});

testCase("XUnitConsoleReporterMessagesTest", {
    setUp: function () {
        reporterSetUp.call(this);
        sinon.stub(this.reporter, "printStats");
    },

    "should print messages for passed test": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.testSetUp({ name: "some test" });
        this.reporter.log({ level: "log", message: "Is message" });
        this.reporter.success({ name: "some test" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printDetails();

        buster.assert.match("Passed: Stuff some test", this.io.toString());
        buster.assert.match("[LOG] Is message", this.io.toString());
    },

    "should not re-print messages for failed test": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.testSetUp({ name: "some test" });
        this.reporter.log({ level: "log", message: "Is message" });
        this.reporter.testFailure({ name: "some test" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printDetails();

        buster.assert.noMatch("Passed: Stuff some test", this.io.toString());
    }
});

testCase("XUnitConsoleReporterStatsTest", {
    setUp: reporterSetUp,

    "should print for one test case with one test": function () {
        this.reporter.printStats({ contexts:  1, tests: 1, assertions: 1, failures: 0, errors: 0 });

        var expected = "1 test case, 1 test, 1 assertion, 0 failures, 0 errors, 0 timeouts\n";
        buster.assert.match(expected, this.io.toString());
    },

    "should print for two test cases": function () {
        this.reporter.printStats({ contexts:  2, tests: 2, assertions: 2, failures: 0, errors: 0 });

        var expected = "2 test cases, 2 tests, 2 assertions, 0 failures, 0 errors, 0 timeouts\n";
        buster.assert.match(expected, this.io.toString());
    },

    "should print for errors and failures": function () {
        this.reporter.printStats({ contexts:  2, tests: 4, assertions: 5, failures: 1, errors: 1 });

        var expected = "2 test cases, 4 tests, 5 assertions, 1 failure, 1 error, 0 timeouts\n";
        buster.assert.match(expected, this.io.toString());
    },

    "should report 0 assertions when assertions property is missing from test success": function () {
        this.reporter.printStats({ contexts:  1, tests: 1 });

        var expected = "1 test case, 1 test, 0 assertions, 0 failures, 0 errors, 0 timeouts\n";
        buster.assert.match(expected, this.io.toString());
    },

    "should report timeouts": function () {
        this.reporter.printStats({ contexts:  1, tests: 1, timeouts: 1 });

        var expected = "1 test case, 1 test, 0 assertions, 0 failures, 0 errors, 1 timeout\n";
        buster.assert.match(expected, this.io.toString());
    },

    "should print warning when no tests": function () {
        this.reporter.printStats({ contexts:  1, tests: 0, assertions: 0 });

        buster.assert.match("WARNING: No tests!", this.io.toString());
    },

    "should print warning when no assertions": function () {
        this.reporter.printStats({ contexts:  1, tests: 1, assertions: 0 });

        buster.assert.match("WARNING: No assertions!", this.io.toString());
    },

    "should not print warning for no assertions when no tests": function () {
        this.reporter.printStats({ contexts:  1, tests: 0, assertions: 0 });

        buster.assert.noMatch("WARNING: No assertions!", this.io.toString());
    }
});

testCase("XUnitConsoleReporterFailureTest", {
    setUp: reporterSetUp,

    "should print full test name": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.testFailure({ name: "should do stuff" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printFailures();

        buster.assert.match("Failure: Stuff should do stuff", this.io.toString());
    },

    "should print error message": function () {
        this.reporter.startContext({ name: "Stuff" });

        this.reporter.testFailure({ name: "should do stuff", error: {
            message: "Expected a to be equal to b"
        } });

        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printFailures();

        buster.assert.match("    Expected a to be equal to b", this.io.toString());
    },

    "should print log messages": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.testSetUp({ name: "should do stuff" });
        this.reporter.log({ level: "log", message: "Hey" });

        this.reporter.testFailure({ name: "should do stuff", error: {
            message: "Expected a to be equal to b"
        } });

        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printFailures();

        buster.assert.match("[LOG] Hey", this.io.toString());
    },

    "should print stack trace": function () {
        var error = new Error("Expected a to be equal to b");
        error.name = "AssertionError";
        try { throw error; } catch (e) { error = e; }
        this.reporter.startContext({ name: "Stuff" });

        this.reporter.testFailure({ name: "should do stuff", error: {
            message: "Expected a to be equal to b",
            stack: error.stack
        } });

        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printFailures();

        buster.assert.match("\n    at Object", this.io.toString());
    }
});

testCase("XUnitConsoleReporterErrorTest", {
    setUp: reporterSetUp,

    "should print full test name": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.testError({ name: "should do stuff" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printErrors();

        buster.assert.match("Error: Stuff should do stuff", this.io.toString());
    },

    "should print error message": function () {
        this.reporter.startContext({ name: "Stuff" });

        this.reporter.testError({ name: "should do stuff", error: {
            message: "a is not defined",
            name: "ReferenceError"
        } });

        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printErrors();

        buster.assert.match("    ReferenceError: a is not defined", this.io.toString());
    },

    "should print log messages": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.testSetUp({ name: "should do stuff" });
        this.reporter.log({ level: "log", message: "Hey" });

        this.reporter.testError({ name: "should do stuff", error: {
            message: "Expected a to be equal to b"
        } });

        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printErrors();

        buster.assert.match("[LOG] Hey", this.io.toString());
    },

    "should print stack trace": function () {
        var error = new Error("Expected a to be equal to b");
        error.name = "AssertionError";
        try { throw error; } catch (e) { error = e; }
        this.reporter.startContext({ name: "Stuff" });

        this.reporter.testError({ name: "should do stuff", error: {
            message: "a is not defined",
            name: "ReferenceError",
            stack: error.stack
        } });

        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printErrors();

        buster.assert.match("\n    at Object", this.io.toString());
    }
});

testCase("XUnitConsoleReporterColorOutputTest", {
    setUp: function () {
        runnerSetUp.call(this);

        this.reporter = buster.xUnitConsoleReporter.create(this.runner, {
            io: this.io,
            color: true
        });
    },

    "should print green dot when test passes": function () {
        this.runner.emit("test:success", { name: "Stuff" });

        buster.assert.equals("\033[32m.\033[0m", this.io.toString());
    },

    "should print green dot when test passes": function () {
        this.runner.emit("test:success", { name: "Stuff" });

        buster.assert.equals("\033[32m.\033[0m", this.io.toString());
    },

    "should print yellow capital E when test errors": function () {
        this.runner.emit("test:error", { name: "Stuff" });

        buster.assert.equals("\033[33mE\033[0m", this.io.toString());
    },

    "should print red capital F when test fails": function () {
        this.runner.emit("test:failure", { name: "Stuff" });

        buster.assert.equals("\033[31mF\033[0m", this.io.toString());
    },

    "should print red capital T when test times out": function () {
        this.runner.emit("test:timeout", { name: "Stuff" });

        buster.assert.equals("\033[31mT\033[0m", this.io.toString());
    },

    "should print purple capital A when test is asynchronous": function () {
        this.reporter.testAsync({ name: "Stuff" });

        buster.assert.equals("\033[35mA\033[0m", this.io.toString());
    }
});

testCase("XUnitConsoleReporterColorizedMessagesTest", {
    setUp: function () {
        reporterSetUp.call(this);

        this.reporter = buster.xUnitConsoleReporter.create(this.runner, {
            io: this.io,
            color: true
        });

        sinon.stub(this.reporter, "printStats");
    },

    "should print passed in green": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.testSetUp({ name: "some test" });
        this.reporter.log({ level: "log", message: "Is message" });
        this.reporter.success({ name: "some test" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printDetails();

        buster.assert.match("\033[32mPassed: Stuff some test\033[0m",
                            this.io.toString());
    }
});

testCase("XUnitConsoleReporterColorizedStatsTest", {
    setUp: function () {
        runnerSetUp.call(this);

        this.reporter = buster.xUnitConsoleReporter.create(this.runner, {
            io: this.io,
            color: true
        });
    },

    "should print in green when OK": function () {
        this.reporter.printStats({ contexts: 1, tests: 1, assertions: 1, failures: 0, errors: 0 });

        var expected = "\033[32m1 test case, 1 test, 1 assertion, 0 failures, 0 errors, 0 timeouts\033[0m\n";
        buster.assert.match(expected, this.io.toString());
    },

    "should print in red when errors and failures": function () {
        this.reporter.printStats({ contexts: 1, tests: 2, assertions: 2, failures: 1, errors: 1 });

        var expected = "\033[31m1 test case, 2 tests, 2 assertions, 1 failure, 1 error, 0 timeouts\033[0m\n";
        buster.assert.match(expected, this.io.toString());
    },

    "should print in red when no assertions": function () {
        this.reporter.printStats({ contexts: 1, tests: 1, assertions: 0 });

        var expected = "\033[31m1 test case, 1 test, 0 assertions, 0 failures, 0 errors, 0 timeouts\033[0m\n";
        buster.assert.match(expected, this.io.toString());
    },

    "should print in red when no tests": function () {
        this.reporter.printStats({ contexts: 1, tests: 0 });

        var expected = "\033[31m1 test case, 0 tests, 0 assertions, 0 failures, 0 errors, 0 timeouts\033[0m\n";
        buster.assert.match(expected, this.io.toString());
    },

    "should print in red when timeouts": function () {
        this.reporter.printStats({ contexts: 1, tests: 1, timeouts: 1 });

        var expected = "\033[31m1 test case, 1 test, 0 assertions, 0 failures, 0 errors, 1 timeout\033[0m\n";
        buster.assert.match(expected, this.io.toString());
    },

    "should print no test warning in red": function () {
        this.reporter.printStats({ contexts: 1, tests: 0, assertions: 0 });

        buster.assert.match("\033[31mWARNING: No tests!\033[0m", this.io.toString());
    },

    "should print no assertion warning in red": function () {
        this.reporter.printStats({ contexts: 1, tests: 1, assertions: 0 });

        buster.assert.match("\033[31mWARNING: No assertions!\033[0m", this.io.toString());
    }
});

testCase("XUnitConsoleReporterColorizedExceptionTest", {
    setUp: function () {
        runnerSetUp.call(this);

        this.reporter = buster.xUnitConsoleReporter.create(this.runner, {
            io: this.io,
            color: true
        });
    },

    "should print full test name with red label when failure": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.testFailure({ name: "should do stuff" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printFailures();

        buster.assert.match("\033[31mFailure\033[0m: Stuff should do stuff", this.io.toString());
    },

    "should print full test name with yellow label when error": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.testError({ name: "should do stuff" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printErrors();

        buster.assert.match("\033[33mError\033[0m: Stuff should do stuff", this.io.toString());
    }
});

testCase("XUnitConsoleReporterBrightColorOutputTest", {
    setUp: function () {
        runnerSetUp.call(this);

        this.reporter = buster.xUnitConsoleReporter.create(this.runner, {
            io: this.io,
            color: true,
            bright: true
        });
    },

    "should print bright green dot when test passes": function () {
        this.runner.emit("test:success", { name: "Stuff" });

        buster.assert.equals("\033[1m\033[32m.\033[0m", this.io.toString());
    },

    "should print bright yellow capital E when test errors": function () {
        this.runner.emit("test:error", { name: "Stuff" });

        buster.assert.equals("\033[1m\033[33mE\033[0m", this.io.toString());
    },

    "should print bright red capital F when test fails": function () {
        this.runner.emit("test:failure", { name: "Stuff" });

        buster.assert.equals("\033[1m\033[31mF\033[0m", this.io.toString());
    },

    "should print bright red capital T when test times out": function () {
        this.runner.emit("test:timeout", { name: "Stuff" });

        buster.assert.equals("\033[1m\033[31mT\033[0m", this.io.toString());
    },

    "should print bright purple capital A when test is asynchronous": function () {
        this.reporter.testAsync({ name: "Stuff" });

        buster.assert.equals("\033[1m\033[35mA\033[0m", this.io.toString());
    }
});

testCase("XUnitConsoleReporterBrightlyColorizedStatsTest", {
    setUp: function () {
        runnerSetUp.call(this);

        this.reporter = buster.xUnitConsoleReporter.create(this.runner, {
            io: this.io,
            color: true,
            bright: true
        });
    },

    "should print in bright green when OK": function () {
        this.reporter.printStats({ contexts: 1, tests: 1, failures: 0, errors: 0, assertions: 1 });

        var expected = "\033[1m\033[32m1 test case, 1 test, 1 assertion, 0 failures, 0 errors, 0 timeouts\033[0m\n";
        buster.assert.match(expected, this.io.toString());
    },

    "should print in bright red when errors and failures": function () {
        this.reporter.printStats({ contexts: 1, tests: 2, failures: 1, errors: 1 });

        var expected = "\033[1m\033[31m1 test case, 2 tests, 0 assertions, 1 failure, 1 error, 0 timeouts\033[0m\n";
        buster.assert.match(expected, this.io.toString());
    },

    "should print in bright red when no assertions": function () {
        this.reporter.printStats({ contexts: 1, tests: 1, assertions: 0 });

        var expected = "\033[1m\033[31m1 test case, 1 test, 0 assertions, 0 failures, 0 errors, 0 timeouts\033[0m\n";
        buster.assert.match(expected, this.io.toString());
    },

    "should print in bright red when no tests": function () {
        this.reporter.printStats({ contexts: 1, tests: 0 });

        var expected = "\033[1m\033[31m1 test case, 0 tests, 0 assertions, 0 failures, 0 errors, 0 timeouts\033[0m\n";
        buster.assert.match(expected, this.io.toString());
    },

    "should print in bright red when timeouts": function () {
        this.reporter.printStats({ contexts: 1, tests: 1, timeouts: 1 });

        var expected = "\033[1m\033[31m1 test case, 1 test, 0 assertions, 0 failures, 0 errors, 1 timeout\033[0m\n";
        buster.assert.match(expected, this.io.toString());
    },

    "should print no test warning in bright red": function () {
        this.reporter.printStats({ tests: 0 });

        buster.assert.match("\033[1m\033[31mWARNING: No tests!\033[0m", this.io.toString());
    },

    "should print no assertion warning in bright red": function () {
        this.reporter.printStats({ tests: 1, assertions: 0 });

        buster.assert.match("\033[1m\033[31mWARNING: No assertions!\033[0m", this.io.toString());
    }
});

testCase("XUnitConsoleReporterBrightlyColorizedExceptionTest", {
    setUp: function () {
        runnerSetUp.call(this);

        this.reporter = buster.xUnitConsoleReporter.create(this.runner, {
            io: this.io,
            color: true,
            bright: true
        });
    },

    "should print full test name with red label when failure": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.testFailure({ name: "should do stuff" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printFailures();

        buster.assert.match("\033[1m\033[31mFailure\033[0m: Stuff should do stuff", this.io.toString());
    },

    "should print full test name with yellow label when error": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.testError({ name: "should do stuff" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printErrors();

        buster.assert.match("\033[1m\033[33mError\033[0m: Stuff should do stuff", this.io.toString());
    }
});
