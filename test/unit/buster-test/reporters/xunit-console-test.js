if (typeof require != "undefined") {
    var sinon = require("sinon");
    var buster = require("buster-core");

    buster.extend(buster, {
        assert: require("buster-assert"),
        xUnitConsoleReporter: require("../../../../lib/buster-test/reporters/xunit-console")
    });

    buster.util = require("buster-util");
}

buster.util.testCase("XUnitConsoleReporterEventMappingTest", sinon.testCase({
    setUp: function () {
        this.stub(buster.xUnitConsoleReporter, "reset");
        this.stub(buster.xUnitConsoleReporter, "printDetails");
        this.stub(buster.xUnitConsoleReporter, "startContext");
        this.stub(buster.xUnitConsoleReporter, "endContext");
        this.stub(buster.xUnitConsoleReporter, "unsupportedContext");
        this.stub(buster.xUnitConsoleReporter, "testSuccess");
        this.stub(buster.xUnitConsoleReporter, "testFailure");
        this.stub(buster.xUnitConsoleReporter, "testError");
        this.stub(buster.xUnitConsoleReporter, "testAsync");
        this.stub(buster.xUnitConsoleReporter, "testTimeout");
        this.stub(buster.xUnitConsoleReporter, "testDeferred");
        this.stub(buster.xUnitConsoleReporter, "log");
        this.stub(buster.xUnitConsoleReporter, "uncaughtException");

        this.runner = buster.create(buster.eventEmitter);
        this.runner.console = buster.create(buster.eventEmitter);
        this.reporter = buster.xUnitConsoleReporter.create().listen(this.runner);
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

    "should map context:end to endContext": function () {
        this.runner.emit("context:end");

        buster.assert(this.reporter.endContext.calledOnce);
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
    },

    "should map test:deferred to testDeferred": function () {
        this.runner.emit("test:deferred");

        buster.assert(this.reporter.testDeferred.calledOnce);
    },

    "should map uncaughtException to uncaughtException": function () {
        this.runner.emit("uncaughtException");

        buster.assert(this.reporter.uncaughtException.calledOnce);
    }
}, "should"));

function runnerSetUp() {
    this.io = {
        content: "",
        puts: function (str) { this.print(str + "\n"); },
        print: function (str) { this.content += str; },
        toString: function () { return this.content }
    };

    this.runner = buster.create(buster.eventEmitter);
}

function reporterSetUp() {
    runnerSetUp.call(this);
    this.reporter = buster.xUnitConsoleReporter.create({ io: this.io }).listen(this.runner);
}

buster.util.testCase("XUnitConsoleReporterTestsRunningTest", {
    setUp: reporterSetUp,

    "should print dot when test passes": function () {
        this.reporter.testSuccess({ name: "Stuff" });

        buster.assert.equals(this.io.toString(), ".");
    },

    "should not print dot when test passes if not printing progress": function () {
        this.reporter.displayProgress = false;
        this.reporter.testSuccess({ name: "Stuff" });

        buster.assert.equals(this.io.toString(), "");
    },

    "should print capital E when test errors": function () {
        this.reporter.testError({ name: "Stuff" });

        buster.assert.equals(this.io.toString(), "E");
    },

    "should print capital F when test fails": function () {
        this.reporter.testFailure({ name: "Stuff" });

        buster.assert.equals(this.io.toString(), "F");
    },

    "should print capital T when test times out": function () {
        this.runner.emit("test:timeout", { name: "Stuff" });

        buster.assert.equals(this.io.toString(), "T");
    },

    "should print capital A when test is asynchronous": function () {
        this.reporter.testAsync({ name: "Stuff" });

        buster.assert.equals(this.io.toString(), "A");
    },

    "should replace async marker when test completes": function () {
        this.reporter.testAsync({ name: "Stuff #1" });
        this.reporter.testSuccess({ name: "Stuff #1" });
        this.reporter.testAsync({ name: "Stuff #2" });
        this.reporter.testFailure({ name: "Stuff #2" });
        this.reporter.testAsync({ name: "Stuff #3" });
        this.reporter.testError({ name: "Stuff #3" });

        buster.assert.equals(this.io.toString(), "A\033[1D.A\033[1DFA\033[1DE");
    },

    "should print context name when starting top-level context": function () {
        this.reporter.startContext({ name: "Stuff" });

        buster.assert.equals(this.io.toString(), "Stuff: ");
    },

    "should not print context name when starting inner context": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.startContext({ name: "Inner" });

        buster.assert.equals(this.io.toString(), "Stuff: ");
    },

    "should print line break when ending top-level context": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.endContext({ name: "Stuff" });

        buster.assert.match(this.io.toString(), "Stuff: \n");
    },

    "should not print line break when ending inner context": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.startContext({ name: "Inner" });
        this.reporter.endContext({ name: "Inner" });
        this.reporter.endContext({ name: "Stuff" });

        buster.assert.match(this.io.toString(), "Stuff: \n");
    },

    "should print all top-level context names": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.startContext({ name: "Second" });
        this.reporter.endContext({ name: "Second" });

        buster.assert.match(this.io.toString(), "Stuff: \nSecond: \n");
    }
});

buster.util.testCase("XUnitConsoleReporterMessagesTest", {
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

        buster.assert.match(this.io.toString(), "Passed: Stuff some test");
        buster.assert.match(this.io.toString(), "[LOG] Is message");
    },

    "should not re-print messages for failed test": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.testSetUp({ name: "some test" });
        this.reporter.log({ level: "log", message: "Is message" });
        this.reporter.testFailure({ name: "some test" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printDetails();

        buster.assert.noMatch(this.io.toString(), "Passed: Stuff some test");
    },

    "should print list of deferred tests": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.testDeferred({ name: "some test" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printDetails();

        buster.assert.match(this.io.toString(), "Deferred: Stuff some test");
    }
});

buster.util.testCase("XUnitConsoleReporterStatsTest", {
    setUp: reporterSetUp,

    "should not print unsupported context during run": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.unsupportedContext({
            context: { name: "Second" },
            unsupported: ["localStorage"]
        });

        buster.assert.noMatch(this.io.toString(), "localStorage");
    },

    "should print warning when skipping unsupported context": function () {
        this.reporter.unsupportedContext({
            context: { name: "Stuff" },
            unsupported: ["localStorage"]
        });

        this.reporter.printDetails();

        buster.assert.match(this.io.toString(), "Skipping Stuff, unsupported requirement: localStorage\n");
    },

    "should print warning when skipping nested unsupported context": function () {
        this.reporter.startContext({ name: "Test" });

        this.reporter.unsupportedContext({
            context: { name: "Stuff" },
            unsupported: ["localStorage"]
        });

        this.reporter.printDetails();

        buster.assert.match(this.io.toString(), "Skipping Test Stuff, unsupported requirement: localStorage\n");
    },

    "should print all unsupported features": function () {
        this.reporter.unsupportedContext({
            context: { name: "Stuff" },
            unsupported: ["localStorage", "document"]
        });

        this.reporter.printDetails();

        buster.assert.match(this.io.toString(), "Skipping Stuff, unsupported requirements:\n    localStorage\n    document\n");
    },

    "should print for one test case with one test": function () {
        this.reporter.printStats({ contexts:  1, tests: 1, assertions: 1, failures: 0, errors: 0 });

        var expected = "1 test case, 1 test, 1 assertion, 0 failures, 0 errors, 0 timeouts\n";
        buster.assert.match(this.io.toString(), expected);
    },

    "should print for two test cases": function () {
        this.reporter.printStats({ contexts:  2, tests: 2, assertions: 2, failures: 0, errors: 0 });

        var expected = "2 test cases, 2 tests, 2 assertions, 0 failures, 0 errors, 0 timeouts\n";
        buster.assert.match(this.io.toString(), expected);
    },

    "should print for errors and failures": function () {
        this.reporter.printStats({ contexts:  2, tests: 4, assertions: 5, failures: 1, errors: 1 });

        var expected = "2 test cases, 4 tests, 5 assertions, 1 failure, 1 error, 0 timeouts\n";
        buster.assert.match(this.io.toString(), expected);
    },

    "should report 0 assertions when assertions property is missing from test success": function () {
        this.reporter.printStats({ contexts:  1, tests: 1 });

        var expected = "1 test case, 1 test, 0 assertions, 0 failures, 0 errors, 0 timeouts\n";
        buster.assert.match(this.io.toString(), expected);
    },

    "should report timeouts": function () {
        this.reporter.printStats({ contexts:  1, tests: 1, timeouts: 1 });

        var expected = "1 test case, 1 test, 0 assertions, 0 failures, 0 errors, 1 timeout\n";
        buster.assert.match(this.io.toString(), expected);
    },

    "should report deferred tests": function () {
        this.reporter.printStats({ contexts:  1, tests: 1, deferred: 2 });

        var expected = "1 test case, 1 test, 0 assertions, 0 failures, 0 errors, 0 timeouts, 2 deferred\n";
        buster.assert.match(this.io.toString(), expected);
    },

    "should print warning when no tests": function () {
        this.reporter.printStats({ contexts:  1, tests: 0, assertions: 0 });

        buster.assert.match(this.io.toString(), "WARNING: No tests!");
    },

    "should print warning when no assertions": function () {
        this.reporter.printStats({ contexts:  1, tests: 1, assertions: 0 });

        buster.assert.match(this.io.toString(), "WARNING: No assertions!");
    },

    "should not print warning for no assertions when no tests": function () {
        this.reporter.printStats({ contexts:  1, tests: 0, assertions: 0 });

        buster.assert.noMatch(this.io.toString(), "WARNING: No assertions!");
    }
});

buster.util.testCase("XUnitConsoleReporterFailureTest", {
    setUp: reporterSetUp,

    "should print full test name": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.testFailure({ name: "should do stuff" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printFailures();

        buster.assert.match(this.io.toString(), "Failure: Stuff should do stuff");
    },

    "should print error message": function () {
        this.reporter.startContext({ name: "Stuff" });

        this.reporter.testFailure({ name: "should do stuff", error: {
            message: "Expected a to be equal to b"
        } });

        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printFailures();

        buster.assert.match(this.io.toString(), "    Expected a to be equal to b");
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

        buster.assert.match(this.io.toString(), "[LOG] Hey");
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

        buster.assert.match(this.io.toString(), "\n    at Object");
    }
});

buster.util.testCase("XUnitConsoleReporterErrorTest", {
    setUp: reporterSetUp,

    "should print full test name": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.testError({ name: "should do stuff" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printErrors();

        buster.assert.match(this.io.toString(), "Error: Stuff should do stuff");
    },

    "should print error message": function () {
        this.reporter.startContext({ name: "Stuff" });

        this.reporter.testError({ name: "should do stuff", error: {
            message: "a is not defined",
            name: "ReferenceError"
        } });

        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printErrors();

        buster.assert.match(this.io.toString(), "    ReferenceError: a is not defined");
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

        buster.assert.match(this.io.toString(), "[LOG] Hey");
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

        buster.assert.match(this.io.toString(), "\n    at Object");
    }
});

buster.util.testCase("XUnitConsoleReporterUncaughtExceptionTest", {
    setUp: reporterSetUp,

    "should print label": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.uncaughtException({ name: "should do stuff" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printUncaughtExceptions();

        buster.assert.match(this.io.toString(), "Uncaught exception!");
    },

    "should print error message": function () {
        this.reporter.startContext({ name: "Stuff" });

        this.reporter.uncaughtException({
            message: "Expected a to be equal to b"
        });

        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printUncaughtExceptions();

        buster.assert.match(this.io.toString(), "    Expected a to be equal to b");
    },

    "should print stack trace": function () {
        var error = new Error("Expected a to be equal to b");
        error.name = "AssertionError";
        try { throw error; } catch (e) { error = e; }
        this.reporter.startContext({ name: "Stuff" });

        this.reporter.uncaughtException({
            message: "Expected a to be equal to b",
            stack: error.stack
        });

        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printUncaughtExceptions();

        buster.assert.match(this.io.toString(), "\n    at Object");
    }
});

buster.util.testCase("XUnitConsoleReporterColorOutputTest", {
    setUp: function () {
        runnerSetUp.call(this);

        this.reporter = buster.xUnitConsoleReporter.create({
            io: this.io,
            color: true
        }).listen(this.runner);
    },

    "should print green dot when test passes": function () {
        this.runner.emit("test:success", { name: "Stuff" });

        buster.assert.equals(this.io.toString(), "\033[32m.\033[0m");
    },

    "should print green dot when test passes": function () {
        this.runner.emit("test:success", { name: "Stuff" });

        buster.assert.equals(this.io.toString(), "\033[32m.\033[0m");
    },

    "should print yellow capital E when test errors": function () {
        this.runner.emit("test:error", { name: "Stuff" });

        buster.assert.equals(this.io.toString(), "\033[33mE\033[0m");
    },

    "should print red capital F when test fails": function () {
        this.runner.emit("test:failure", { name: "Stuff" });

        buster.assert.equals(this.io.toString(), "\033[31mF\033[0m");
    },

    "should print red capital T when test times out": function () {
        this.runner.emit("test:timeout", { name: "Stuff" });

        buster.assert.equals(this.io.toString(), "\033[31mT\033[0m");
    },

    "should print purple capital A when test is asynchronous": function () {
        this.reporter.testAsync({ name: "Stuff" });

        buster.assert.equals(this.io.toString(), "\033[35mA\033[0m");
    }
});

buster.util.testCase("XUnitConsoleReporterColorizedMessagesTest", {
    setUp: function () {
        reporterSetUp.call(this);

        this.reporter = buster.xUnitConsoleReporter.create({
            io: this.io,
            color: true
        }).listen(this.runner);

        sinon.stub(this.reporter, "printStats");
    },

    "should print passed in green": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.testSetUp({ name: "some test" });
        this.reporter.log({ level: "log", message: "Is message" });
        this.reporter.success({ name: "some test" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printDetails();

        buster.assert.match(this.io.toString(),
                            "\033[32mPassed: Stuff some test\033[0m");
    }
});

buster.util.testCase("XUnitConsoleReporterColorizedStatsTest", {
    setUp: function () {
        runnerSetUp.call(this);

        this.reporter = buster.xUnitConsoleReporter.create({
            io: this.io,
            color: true
        }).listen(this.runner);
    },

    "should print in green when OK": function () {
        this.reporter.printStats({ contexts: 1, tests: 1, assertions: 1, failures: 0, errors: 0 });

        var expected = "\033[32m1 test case, 1 test, 1 assertion, 0 failures, 0 errors, 0 timeouts\033[0m\n";
        buster.assert.match(this.io.toString(), expected);
    },

    "should print in red when errors and failures": function () {
        this.reporter.printStats({ contexts: 1, tests: 2, assertions: 2, failures: 1, errors: 1 });

        var expected = "\033[31m1 test case, 2 tests, 2 assertions, 1 failure, 1 error, 0 timeouts\033[0m\n";
        buster.assert.match(this.io.toString(), expected);
    },

    "should print in red when no assertions": function () {
        this.reporter.printStats({ contexts: 1, tests: 1, assertions: 0 });

        var expected = "\033[31m1 test case, 1 test, 0 assertions, 0 failures, 0 errors, 0 timeouts\033[0m\n";
        buster.assert.match(this.io.toString(), expected);
    },

    "should print in red when no tests": function () {
        this.reporter.printStats({ contexts: 1, tests: 0 });

        var expected = "\033[31m1 test case, 0 tests, 0 assertions, 0 failures, 0 errors, 0 timeouts\033[0m\n";
        buster.assert.match(this.io.toString(), expected);
    },

    "should print in red when timeouts": function () {
        this.reporter.printStats({ contexts: 1, tests: 1, timeouts: 1 });

        var expected = "\033[31m1 test case, 1 test, 0 assertions, 0 failures, 0 errors, 1 timeout\033[0m\n";
        buster.assert.match(this.io.toString(), expected);
    },

    "should print no test warning in red": function () {
        this.reporter.printStats({ contexts: 1, tests: 0, assertions: 0 });

        buster.assert.match(this.io.toString(), "\033[31mWARNING: No tests!\033[0m");
    },

    "should print no assertion warning in red": function () {
        this.reporter.printStats({ contexts: 1, tests: 1, assertions: 0 });

        buster.assert.match(this.io.toString(), "\033[31mWARNING: No assertions!\033[0m");
    }
});

buster.util.testCase("XUnitConsoleReporterColorizedExceptionTest", {
    setUp: function () {
        runnerSetUp.call(this);

        this.reporter = buster.xUnitConsoleReporter.create({
            io: this.io,
            color: true
        }).listen(this.runner);
    },

    "should print full test name with red label when failure": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.testFailure({ name: "should do stuff" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printFailures();

        buster.assert.match(this.io.toString(), "\033[31mFailure\033[0m: Stuff should do stuff");
    },

    "should print full test name with yellow label when error": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.testError({ name: "should do stuff" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printErrors();

        buster.assert.match(this.io.toString(), "\033[33mError\033[0m: Stuff should do stuff");
    }
});

buster.util.testCase("XUnitConsoleReporterBrightColorOutputTest", {
    setUp: function () {
        runnerSetUp.call(this);

        this.reporter = buster.xUnitConsoleReporter.create({
            io: this.io,
            color: true,
            bright: true
        }).listen(this.runner);
    },

    "should print bright green dot when test passes": function () {
        this.runner.emit("test:success", { name: "Stuff" });

        buster.assert.equals(this.io.toString(), "\033[1m\033[32m.\033[0m");
    },

    "should print bright yellow capital E when test errors": function () {
        this.runner.emit("test:error", { name: "Stuff" });

        buster.assert.equals(this.io.toString(), "\033[1m\033[33mE\033[0m");
    },

    "should print bright red capital F when test fails": function () {
        this.runner.emit("test:failure", { name: "Stuff" });

        buster.assert.equals(this.io.toString(), "\033[1m\033[31mF\033[0m");
    },

    "should print bright red capital T when test times out": function () {
        this.runner.emit("test:timeout", { name: "Stuff" });

        buster.assert.equals(this.io.toString(), "\033[1m\033[31mT\033[0m");
    },

    "should print bright purple capital A when test is asynchronous": function () {
        this.reporter.testAsync({ name: "Stuff" });

        buster.assert.equals(this.io.toString(), "\033[1m\033[35mA\033[0m");
    }
});

buster.util.testCase("XUnitConsoleReporterBrightlyColorizedStatsTest", {
    setUp: function () {
        runnerSetUp.call(this);

        this.reporter = buster.xUnitConsoleReporter.create({
            io: this.io,
            color: true,
            bright: true
        }).listen(this.runner);
    },

    "should print in bright green when OK": function () {
        this.reporter.printStats({ contexts: 1, tests: 1, failures: 0, errors: 0, assertions: 1 });

        var expected = "\033[1m\033[32m1 test case, 1 test, 1 assertion, 0 failures, 0 errors, 0 timeouts\033[0m\n";
        buster.assert.match(this.io.toString(), expected);
    },

    "should print in bright red when errors and failures": function () {
        this.reporter.printStats({ contexts: 1, tests: 2, failures: 1, errors: 1 });

        var expected = "\033[1m\033[31m1 test case, 2 tests, 0 assertions, 1 failure, 1 error, 0 timeouts\033[0m\n";
        buster.assert.match(this.io.toString(), expected);
    },

    "should print in bright red when no assertions": function () {
        this.reporter.printStats({ contexts: 1, tests: 1, assertions: 0 });

        var expected = "\033[1m\033[31m1 test case, 1 test, 0 assertions, 0 failures, 0 errors, 0 timeouts\033[0m\n";
        buster.assert.match(this.io.toString(), expected);
    },

    "should print in bright red when no tests": function () {
        this.reporter.printStats({ contexts: 1, tests: 0 });

        var expected = "\033[1m\033[31m1 test case, 0 tests, 0 assertions, 0 failures, 0 errors, 0 timeouts\033[0m\n";
        buster.assert.match(this.io.toString(), expected);
    },

    "should print in bright red when timeouts": function () {
        this.reporter.printStats({ contexts: 1, tests: 1, timeouts: 1 });

        var expected = "\033[1m\033[31m1 test case, 1 test, 0 assertions, 0 failures, 0 errors, 1 timeout\033[0m\n";
        buster.assert.match(this.io.toString(), expected);
    },

    "should print no test warning in bright red": function () {
        this.reporter.printStats({ tests: 0 });

        buster.assert.match(this.io.toString(), "\033[1m\033[31mWARNING: No tests!\033[0m");
    },

    "should print no assertion warning in bright red": function () {
        this.reporter.printStats({ tests: 1, assertions: 0 });

        buster.assert.match(this.io.toString(), "\033[1m\033[31mWARNING: No assertions!\033[0m");
    }
});

buster.util.testCase("XUnitConsoleReporterBrightlyColorizedExceptionTest", {
    setUp: function () {
        runnerSetUp.call(this);

        this.reporter = buster.xUnitConsoleReporter.create({
            io: this.io,
            color: true,
            bright: true
        }).listen(this.runner);
    },

    "should print full test name with red label when failure": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.testFailure({ name: "should do stuff" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printFailures();

        buster.assert.match(this.io.toString(), "\033[1m\033[31mFailure\033[0m: Stuff should do stuff");
    },

    "should print full test name with yellow label when error": function () {
        this.reporter.startContext({ name: "Stuff" });
        this.reporter.testError({ name: "should do stuff" });
        this.reporter.endContext({ name: "Stuff" });
        this.reporter.printErrors();

        buster.assert.match(this.io.toString(), "\033[1m\033[33mError\033[0m: Stuff should do stuff");
    }
});
