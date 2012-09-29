var helper = require("../../../test-helper");
var rhelper = require("./test-helper");
var bane = require("bane");
var referee = require("referee");
var sinon = require("sinon");
var dotsReporter = require("../../../../lib/buster-test/reporters/dots");
var assert = referee.assert;
var refute = referee.refute;

function runnerSetUp() {
    this.out = rhelper.writableStream();
    this.runner = bane.createEventEmitter();
}

function reporterSetUp() {
    runnerSetUp.call(this);
    this.reporter = dotsReporter.create({
        outputStream: this.out,
        logPassedMessages: true
    }).listen(this.runner);
}

helper.testCase("DotsReporterTestsRunningTest", {
    setUp: reporterSetUp,

    "prints dot when test passes": function () {
        this.runner.emit("test:success", { name: "Stuff" });

        assert.equals(this.out.toString(), ".");
    },

    "does not print dot when test passes if not printing progress": function () {
        this.reporter.displayProgress = false;
        this.runner.emit("test:success", { name: "Stuff" });

        assert.equals(this.out.toString(), "");
    },

    "prints capital E when test errors": function () {
        this.runner.emit("test:error", { name: "Stuff" });

        assert.equals(this.out.toString(), "E");
    },

    "prints capital F when test fails": function () {
        this.runner.emit("test:failure", { name: "Stuff" });

        assert.equals(this.out.toString(), "F");
    },

    "prints capital T when test times out": function () {
        this.runner.emit("test:timeout", { name: "Stuff" });

        assert.equals(this.out.toString(), "T");
    },

    "prints capital A when test is asynchronous": function () {
        this.runner.emit("test:async", { name: "Stuff" });

        assert.equals(this.out.toString(), "A");
    },

    "replaces async marker when test completes": function () {
        this.runner.emit("test:async", { name: "Stuff #1" });
        this.runner.emit("test:success", { name: "Stuff #1" });
        this.runner.emit("test:async", { name: "Stuff #2" });
        this.runner.emit("test:failure", { name: "Stuff #2" });
        this.runner.emit("test:async", { name: "Stuff #3" });
        this.runner.emit("test:error", { name: "Stuff #3" });

        assert.equals(this.out.toString(), "A\033[1D.A\033[1DFA\033[1DE");
    },

    "prints context name when starting top-level context": function () {
        this.runner.emit("context:start", { name: "Stuff" });

        assert.equals(this.out.toString(), "Stuff: ");
    },

    "does not print context name when starting inner context": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("context:start", { name: "Inner" });

        assert.equals(this.out.toString(), "Stuff: ");
    },

    "prints line break when ending top-level context": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("context:end", { name: "Stuff" });

        assert.match(this.out.toString(), "Stuff: \n");
    },

    "does not print line break when ending inner context": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("context:start", { name: "Inner" });
        this.runner.emit("context:end", { name: "Inner" });
        this.runner.emit("context:end", { name: "Stuff" });

        assert.match(this.out.toString(), "Stuff: \n");
    },

    "prints all top-level context names": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("context:end", { name: "Stuff" });
        this.runner.emit("context:start", { name: "Second" });
        this.runner.emit("context:end", { name: "Second" });

        assert.match(this.out.toString(), "Stuff: \nSecond: \n");
    }
});

helper.testCase("DotsReporterMessagesTest", {
    setUp: function () {
        reporterSetUp.call(this);
        sinon.stub(this.reporter, "printStats");
    },

    "prints messages for passed test": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("test:setUp", { name: "some test" });
        this.runner.emit("log", { level: "log", message: "Is message" });
        this.reporter.success({ name: "some test" });
        this.runner.emit("context:end", { name: "Stuff" });
        this.runner.emit("suite:end");

        assert.match(this.out.toString(), "Passed: Stuff some test");
        assert.match(this.out.toString(), "[LOG] Is message");
    },

    "does not re-print messages for failed test": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("test:setUp", { name: "some test" });
        this.runner.emit("log", { level: "log", message: "Is message" });
        this.runner.emit("test:failure", { name: "some test" });
        this.runner.emit("context:end", { name: "Stuff" });
        this.runner.emit("suite:end");

        refute.match(this.out.toString(), "Passed: Stuff some test");
    },

    "prints messages not belonging to a specific test": function () {
        this.runner.emit("log", { level: "log", message: "Is message" });
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("test:failure", { name: "some test" });
        this.runner.emit("context:end", { name: "Stuff" });
        this.runner.emit("suite:end");

        refute.match(this.out.toString(), "undefined");
        assert.match(this.out.toString(), "Global message log:");
        assert.match(this.out.toString(), "[LOG] Is message");
    },

    "prints list of deferred tests": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("test:deferred", { name: "some test" });
        this.runner.emit("context:end", { name: "Stuff" });
        this.runner.emit("suite:end");

        assert.match(this.out.toString(), "Deferred: Stuff some test");
    },

    "prints deferred test comment": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("test:deferred", { name: "some test", comment: "Later" });
        this.runner.emit("context:end", { name: "Stuff" });
        this.runner.emit("suite:end");

        assert.match(this.out.toString(), "Deferred: Stuff some test\nLater");
    },

    "does not print messages for passed test if not configured to": function () {
        // Create new reporter with different config
        var reporter = dotsReporter.create({
            outputStream: this.out,
            logPassedMessages: false
        }).listen(this.runner);

        // Exercise reporter directly. If we emit events through the runner,
        // the setUp created reporter will also print stuff to STDOU
        reporter["context:start"]({ name: "Stuff" });
        reporter["test:setUp"]({ name: "some test" });
        reporter.log({ level: "log", message: "Is message" });
        reporter["test:success"]({ name: "some test" });
        reporter["context:end"]({ name: "Stuff" });
        reporter["suite:end"]();

        refute.match(this.out.toString(), "Passed: Stuff some test");
        refute.match(this.out.toString(), "[LOG] Is message");
    },

    "prints global messages when configured not to log passed": function () {
        var reporter = dotsReporter.create({
            outputStream: this.out,
            logPassedMessages: false
        }).listen(this.runner);
        reporter.log({ level: "log", message: "Is message" });
        reporter["context:start"]({ name: "Stuff" });
        reporter["test:failure"]({ name: "some test" });
        reporter["context:end"]({ name: "Stuff" });
        reporter["suite:end"]();

        assert.match(this.out.toString(), "Global message log:");
        assert.match(this.out.toString(), "[LOG] Is message");
    }
});

helper.testCase("DotsReporterStatsTest", {
    setUp: reporterSetUp,

    "does not print unsupported context during run": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("context:unsupported", {
            context: { name: "Second" },
            unsupported: ["localStorage"]
        });

        refute.match(this.out.toString(), "localStorage");
    },

    "prints warning when skipping unsupported context": function () {
        this.runner.emit("context:unsupported", {
            context: { name: "Stuff" },
            unsupported: ["localStorage"]
        });

        this.runner.emit("suite:end");

        assert.match(this.out.toString(), "Skipping Stuff, unsupported requirement: localStorage\n");
    },

    "prints warning when skipping nested unsupported context": function () {
        this.runner.emit("context:start", { name: "Test" });

        this.runner.emit("context:unsupported", {
            context: { name: "Stuff" },
            unsupported: ["localStorage"]
        });

        this.runner.emit("suite:end");

        assert.match(this.out.toString(), "Skipping Test Stuff, unsupported requirement: localStorage\n");
    },

    "prints all unsupported features": function () {
        this.runner.emit("context:unsupported", {
            context: { name: "Stuff" },
            unsupported: ["localStorage", "document"]
        });

        this.runner.emit("suite:end");

        assert.match(this.out.toString(), "Skipping Stuff, unsupported requirements:\n    localStorage\n    document\n");
    },

    "prints for one test case with one test": function () {
        this.reporter.printStats({ contexts:  1, tests: 1, assertions: 1, failures: 0, errors: 0 });

        var expected = "1 test case, 1 test, 1 assertion, 0 failures, 0 errors, 0 timeouts\n";
        assert.match(this.out.toString(), expected);
    },

    "prints for two test cases": function () {
        this.reporter.printStats({ contexts:  2, tests: 2, assertions: 2, failures: 0, errors: 0 });

        var expected = "2 test cases, 2 tests, 2 assertions, 0 failures, 0 errors, 0 timeouts\n";
        assert.match(this.out.toString(), expected);
    },

    "prints for errors and failures": function () {
        this.reporter.printStats({ contexts:  2, tests: 4, assertions: 5, failures: 1, errors: 1 });

        var expected = "2 test cases, 4 tests, 5 assertions, 1 failure, 1 error, 0 timeouts\n";
        assert.match(this.out.toString(), expected);
    },

    "reports 0 assertions when assertions property is missing from test success": function () {
        this.reporter.printStats({ contexts:  1, tests: 1 });

        var expected = "1 test case, 1 test, 0 assertions, 0 failures, 0 errors, 0 timeouts\n";
        assert.match(this.out.toString(), expected);
    },

    "reports timeouts": function () {
        this.reporter.printStats({ contexts:  1, tests: 1, timeouts: 1 });

        var expected = "1 test case, 1 test, 0 assertions, 0 failures, 0 errors, 1 timeout\n";
        assert.match(this.out.toString(), expected);
    },

    "reports deferred tests": function () {
        this.reporter.printStats({ contexts:  1, tests: 1, deferred: 2 });

        var expected = "1 test case, 1 test, 0 assertions, 0 failures, 0 errors, 0 timeouts, 2 deferred\n";
        assert.match(this.out.toString(), expected);
    },

    "prints warning when no tests": function () {
        this.reporter.printStats({ contexts:  0, tests: 0, assertions: 0 });

        assert.match(this.out.toString(), "No tests");
    },

    "prints warning when no assertions": function () {
        this.reporter.printStats({ contexts:  1, tests: 1, assertions: 0 });

        assert.match(this.out.toString(), "WARNING: No assertions");
    },

    "does not print warning for no assertions when no tests": function () {
        this.reporter.printStats({ contexts:  1, tests: 0, assertions: 0 });

        refute.match(this.out.toString(), "WARNING: No assertions");
    },

    "includes time taken": function () {
        this.runner.emit("suite:start");
        this.reporter.printStats({ contexts:  1, tests: 5, assertions: 10 });

        assert.match(this.out.toString(), "Finished in");
    }
});

helper.testCase("DotsReporterFailureTest", {
    setUp: reporterSetUp,

    "prints full test name": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("test:failure", { name: "should do stuff" });
        this.runner.emit("context:end", { name: "Stuff" });
        this.reporter.printFailures();

        assert.match(this.out.toString(), "Failure: Stuff should do stuff");
    },

    "prints error message": function () {
        this.runner.emit("context:start", { name: "Stuff" });

        this.runner.emit("test:failure", { name: "dos stuff", error: {
            message: "Expected a to be equal to b"
        } });

        this.runner.emit("context:end", { name: "Stuff" });
        this.reporter.printFailures();

        assert.match(this.out.toString(), "    Expected a to be equal to b");
    },

    "prints log messages": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("test:setUp", { name: "dos stuff" });
        this.runner.emit("log", { level: "log", message: "Hey" });

        this.runner.emit("test:failure", { name: "dos stuff", error: {
            message: "Expected a to be equal to b"
        } });

        this.runner.emit("context:end", { name: "Stuff" });
        this.reporter.printFailures();

        assert.match(this.out.toString(), "[LOG] Hey");
    },

    "prints stack trace": function () {
        var error = new Error("Expected a to be equal to b");
        error.name = "AssertionError";
        try { throw error; } catch (e) { error = e; }
        this.runner.emit("context:start", { name: "Stuff" });

        this.runner.emit("test:failure", {
            name: "should do stuff",
            error: {
                message: "Expected a to be equal to b",
                stack: error.stack
            }
        });

        this.runner.emit("context:end", { name: "Stuff" });
        this.reporter.printFailures();

        assert.match(this.out.toString(), "\n    at runTest");
    }
});

helper.testCase("DotsReporterErrorTest", {
    setUp: reporterSetUp,

    "prints full test name": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("test:error", { name: "should do stuff" });
        this.runner.emit("context:end", { name: "Stuff" });
        this.reporter.printErrors();

        assert.match(this.out.toString(), "Error: Stuff should do stuff");
    },

    "prints error message": function () {
        this.runner.emit("context:start", { name: "Stuff" });

        this.runner.emit("test:error", { name: "should do stuff", error: {
            message: "a is not defined",
            name: "ReferenceError"
        } });

        this.runner.emit("context:end", { name: "Stuff" });
        this.reporter.printErrors();

        assert.match(this.out.toString(), "    ReferenceError: a is not defined");
    },

    "prints log messages": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("test:setUp", { name: "should do stuff" });
        this.runner.emit("log", { level: "log", message: "Hey" });

        this.runner.emit("test:error", { name: "should do stuff", error: {
            message: "Expected a to be equal to b"
        } });

        this.runner.emit("context:end", { name: "Stuff" });
        this.reporter.printErrors();

        assert.match(this.out.toString(), "[LOG] Hey");
    },

    "prints stack trace": function () {
        var error = new Error("Expected a to be equal to b");
        error.name = "AssertionError";
        try { throw error; } catch (e) { error = e; }
        this.runner.emit("context:start", { name: "Stuff" });

        this.runner.emit("test:error", { name: "should do stuff", error: {
            message: "a is not defined",
            name: "ReferenceError",
            stack: error.stack
        } });

        this.runner.emit("context:end", { name: "Stuff" });
        this.reporter.printErrors();

        assert.match(this.out.toString(), "\n    at runTest");
    }
});

helper.testCase("DotsReporterUncaughtExceptionTest", {
    setUp: reporterSetUp,

    "prints label": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.reporter.uncaughtException({ name: "should do stuff" });
        this.runner.emit("context:end", { name: "Stuff" });
        this.reporter.printUncaughtExceptions();

        assert.match(this.out.toString(), "Uncaught exception!");
    },

    "prints error message": function () {
        this.runner.emit("context:start", { name: "Stuff" });

        this.reporter.uncaughtException({
            message: "Expected a to be equal to b"
        });

        this.runner.emit("context:end", { name: "Stuff" });
        this.reporter.printUncaughtExceptions();

        assert.match(this.out.toString(), "    Expected a to be equal to b");
    },

    "prints stack trace": function () {
        var error = new Error("Expected a to be equal to b");
        error.name = "AssertionError";
        try { throw error; } catch (e) { error = e; }
        this.runner.emit("context:start", { name: "Stuff" });

        this.reporter.uncaughtException({
            message: "Expected a to be equal to b",
            stack: error.stack
        });

        this.runner.emit("context:end", { name: "Stuff" });
        this.reporter.printUncaughtExceptions();

        assert.match(this.out.toString(), "\n    at runTest");
    }
});

helper.testCase("DotsReporterColorOutputTest", {
    setUp: function () {
        runnerSetUp.call(this);

        this.reporter = dotsReporter.create({
            outputStream: this.out,
            color: true
        }).listen(this.runner);
    },

    "prints green dot when test passes": function () {
        this.runner.emit("test:success", { name: "Stuff" });

        assert.equals(this.out.toString(), "\033[32m.\033[0m");
    },

    "prints green dot when test passes": function () {
        this.runner.emit("test:success", { name: "Stuff" });

        assert.equals(this.out.toString(), "\033[32m.\033[0m");
    },

    "prints yellow capital E when test errors": function () {
        this.runner.emit("test:error", { name: "Stuff" });

        assert.equals(this.out.toString(), "\033[33mE\033[0m");
    },

    "prints red capital F when test fails": function () {
        this.runner.emit("test:failure", { name: "Stuff" });

        assert.equals(this.out.toString(), "\033[31mF\033[0m");
    },

    "prints red capital T when test times out": function () {
        this.runner.emit("test:timeout", { name: "Stuff" });

        assert.equals(this.out.toString(), "\033[31mT\033[0m");
    },

    "prints purple capital A when test is asynchronous": function () {
        this.runner.emit("test:async", { name: "Stuff" });

        assert.equals(this.out.toString(), "\033[35mA\033[0m");
    },

    "prints deferred test in cyan": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("test:deferred", { name: "some test" });
        this.runner.emit("context:end", { name: "Stuff" });
        this.runner.emit("suite:end");

        assert.match(this.out.toString(), "\033[36mDeferred: Stuff some test\033[0m");
    },

    "prints deferred test comment in light grey": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("test:deferred", { name: "some test", comment: "Later" });
        this.runner.emit("context:end", { name: "Stuff" });
        this.runner.emit("suite:end");

        assert.match(this.out.toString(), "\033[38;5;8mLater\033[0m");
    },

    "prints unsupported test in yellow": function () {
        this.runner.emit("context:unsupported", {
            context: { name: "Stuff" },
            unsupported: ["localStorage"]
        });

        this.runner.emit("suite:end");

        assert.match(this.out.toString(), "\033[33mSkipping Stuff, unsupported requirement: localStorage\n\033[0m");
    }
});

helper.testCase("DotsReporterColorizedMessagesTest", {
    setUp: function () {
        reporterSetUp.call(this);

        this.reporter = dotsReporter.create({
            outputStream: this.out,
            color: true,
            logPassedMessages: true
        }).listen(this.runner);

        sinon.stub(this.reporter, "printStats");
    },

    "prints passed in green": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("test:setUp", { name: "some test" });
        this.runner.emit("log", { level: "log", message: "Is message" });
        this.reporter.success({ name: "some test" });
        this.runner.emit("context:end", { name: "Stuff" });
        this.runner.emit("suite:end");

        assert.match(this.out.toString(),
                            "\033[32mPassed: Stuff some test\033[0m");
    }
});

helper.testCase("DotsReporterColorizedStatsTest", {
    setUp: function () {
        runnerSetUp.call(this);

        this.reporter = dotsReporter.create({
            outputStream: this.out,
            color: true
        }).listen(this.runner);
    },

    "prints in green when OK": function () {
        this.reporter.printStats({
            contexts: 1,
            tests: 1,
            assertions: 1,
            failures: 0,
            errors: 0,
            timeouts: 0
        });

        var expected = "\033[32m1 test case, 1 test, 1 assertion, 0 failures, 0 errors, 0 timeouts\033[0m\n";
        assert.match(this.out.toString(), expected);
    },

    "prints in red when errors and failures": function () {
        this.reporter.printStats({ contexts: 1, tests: 2, assertions: 2, failures: 1, errors: 1 });

        var expected = "\033[31m1 test case, 2 tests, 2 assertions, 1 failure, 1 error, 0 timeouts\033[0m\n";
        assert.match(this.out.toString(), expected);
    },

    "prints in red when no assertions": function () {
        this.reporter.printStats({ contexts: 1, tests: 1, assertions: 0 });

        var expected = "\033[31m1 test case, 1 test, 0 assertions, 0 failures, 0 errors, 0 timeouts\033[0m\n";
        assert.match(this.out.toString(), expected);
    },

    "prints in red when no tests": function () {
        this.reporter.printStats({ contexts: 0, tests: 0 });

        var expected = "\033[31mNo tests\033[0m\n";
        assert.match(this.out.toString(), expected);
    },

    "prints in red when timeouts": function () {
        this.reporter.printStats({
            contexts: 1,
            tests: 2,
            errors: 0,
            failures: 0,
            timeouts: 1,
            assertions: 2
        });

        var expected = "\033[31m1 test case, 2 tests, 2 assertions, 0 failures, 0 errors, 1 timeout\033[0m\n";
        assert.match(this.out.toString(), expected);
    },

    "prints no test warning in red": function () {
        this.reporter.printStats({ contexts: 0, tests: 0, assertions: 0 });

        assert.match(this.out.toString(), "\033[31mNo tests\033[0m");
    },

    "prints no assertion warning in red": function () {
        this.reporter.printStats({ contexts: 1, tests: 1, assertions: 0 });

        assert.match(this.out.toString(), "\033[31mWARNING: No assertions\033[0m");
    }
});

helper.testCase("DotsReporterColorizedExceptionTest", {
    setUp: function () {
        runnerSetUp.call(this);

        this.reporter = dotsReporter.create({
            outputStream: this.out,
            color: true
        }).listen(this.runner);
    },

    "prints full test name with red label when failure": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("test:failure", { name: "should do stuff" });
        this.runner.emit("context:end", { name: "Stuff" });
        this.reporter.printFailures();

        assert.match(this.out.toString(), "\033[31mFailure\033[0m: Stuff should do stuff");
    },

    "prints full test name with yellow label when error": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("test:error", { name: "should do stuff" });
        this.runner.emit("context:end", { name: "Stuff" });
        this.reporter.printErrors();

        assert.match(this.out.toString(), "\033[33mError\033[0m: Stuff should do stuff");
    }
});

helper.testCase("DotsReporterBrightColorOutputTest", {
    setUp: function () {
        runnerSetUp.call(this);

        this.reporter = dotsReporter.create({
            outputStream: this.out,
            color: true,
            bright: true
        }).listen(this.runner);
    },

    "prints bright green dot when test passes": function () {
        this.runner.emit("test:success", { name: "Stuff" });

        assert.equals(this.out.toString(), "\033[1m\033[32m.\033[0m");
    },

    "prints bright yellow capital E when test errors": function () {
        this.runner.emit("test:error", { name: "Stuff" });

        assert.equals(this.out.toString(), "\033[1m\033[33mE\033[0m");
    },

    "prints bright red capital F when test fails": function () {
        this.runner.emit("test:failure", { name: "Stuff" });

        assert.equals(this.out.toString(), "\033[1m\033[31mF\033[0m");
    },

    "prints bright red capital T when test times out": function () {
        this.runner.emit("test:timeout", { name: "Stuff" });

        assert.equals(this.out.toString(), "\033[1m\033[31mT\033[0m");
    },

    "prints bright purple capital A when test is asynchronous": function () {
        this.runner.emit("test:async", { name: "Stuff" });

        assert.equals(this.out.toString(), "\033[1m\033[35mA\033[0m");
    },

    "prints deferred test in bright cyan": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("test:deferred", { name: "some test" });
        this.runner.emit("context:end", { name: "Stuff" });
        this.runner.emit("suite:end");

        assert.match(this.out.toString(),
                     "\033[1m\033[36mDeferred: Stuff some test\033[0m");
    },

    "prints deferred test comment in bright grey": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("test:deferred", { name: "some test", comment: "Later" });
        this.runner.emit("context:end", { name: "Stuff" });
        this.runner.emit("suite:end");

        assert.match(this.out.toString(), "\033[1m\033[38;5;8mLater\033[0m");
    },

    "prints unsupported test in bright yellow": function () {
        this.runner.emit("context:unsupported", {
            context: { name: "Stuff" },
            unsupported: ["localStorage"]
        });

        this.runner.emit("suite:end");

        assert.match(this.out.toString(), "\033[1m\033[33mSkipping Stuff, unsupported requirement: localStorage\n\033[0m");
    }
});

helper.testCase("DotsReporterBrightlyColorizedStatsTest", {
    setUp: function () {
        runnerSetUp.call(this);

        this.reporter = dotsReporter.create({
            outputStream: this.out,
            color: true,
            bright: true
        }).listen(this.runner);
    },

    "prints in bright green when OK": function () {
        this.reporter.printStats({
            contexts: 1,
            tests: 1,
            failures: 0,
            errors: 0,
            assertions: 1,
            timeouts: 0
        });

        var expected = "\033[1m\033[32m1 test case, 1 test, 1 assertion, 0 failures, 0 errors, 0 timeouts\033[0m\n";
        assert.match(this.out.toString(), expected);
    },

    "prints in bright red when errors and failures": function () {
        this.reporter.printStats({ contexts: 1, tests: 2, failures: 1, errors: 1 });

        var expected = "\033[1m\033[31m1 test case, 2 tests, 0 assertions, 1 failure, 1 error, 0 timeouts\033[0m\n";
        assert.match(this.out.toString(), expected);
    },

    "prints in bright red when no assertions": function () {
        this.reporter.printStats({ contexts: 1, tests: 1, assertions: 0 });

        var expected = "\033[1m\033[31m1 test case, 1 test, 0 assertions, 0 failures, 0 errors, 0 timeouts\033[0m\n";
        assert.match(this.out.toString(), expected);
    },

    "prints in bright red when no tests": function () {
        this.reporter.printStats({ contexts: 0, tests: 0 });

        var expected = "\033[1m\033[31mNo tests\033[0m\n";
        assert.match(this.out.toString(), expected);
    },

    "prints in bright red when timeouts": function () {
        this.reporter.printStats({ contexts: 1, tests: 1, timeouts: 1 });

        var expected = "\033[1m\033[31m1 test case, 1 test, 0 assertions, 0 failures, 0 errors, 1 timeout\033[0m\n";
        assert.match(this.out.toString(), expected);
    },

    "prints no test warning in bright red": function () {
        this.reporter.printStats({ tests: 0 });

        assert.match(this.out.toString(), "\033[1m\033[31mNo tests\033[0m");
    },

    "prints no assertion warning in bright red": function () {
        this.reporter.printStats({ tests: 1, assertions: 0 });

        assert.match(this.out.toString(), "\033[1m\033[31mWARNING: No assertions\033[0m");
    }
});

helper.testCase("DotsReporterBrightlyColorizedExceptionTest", {
    setUp: function () {
        runnerSetUp.call(this);

        this.reporter = dotsReporter.create({
            outputStream: this.out,
            color: true,
            bright: true
        }).listen(this.runner);
    },

    "prints full test name with red label when failure": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("test:failure", { name: "should do stuff" });
        this.runner.emit("context:end", { name: "Stuff" });
        this.reporter.printFailures();

        assert.match(this.out.toString(), "\033[1m\033[31mFailure\033[0m: Stuff should do stuff");
    },

    "prints full test name with yellow label when error": function () {
        this.runner.emit("context:start", { name: "Stuff" });
        this.runner.emit("test:error", { name: "should do stuff" });
        this.runner.emit("context:end", { name: "Stuff" });
        this.reporter.printErrors();

        assert.match(this.out.toString(), "\033[1m\033[33mError\033[0m: Stuff should do stuff");
    }
});
