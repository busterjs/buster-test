var helper = require("../test-helper");
var rhelper = require("./test-helper");
var bane = require("bane");
var referee = require("referee");
var sinon = require("sinon");
var briefReporter = require("../../lib/reporters/brief");
var assert = referee.assert;
var refute = referee.refute;
var stackFilter = require("stack-filter");

function reporterSetUp(options) {
    this.outputStream = rhelper.writableStream();
    this.assertIO = rhelper.assertIO;
    this.runner = bane.createEventEmitter();

    options = options || {};
    options.outputStream = this.outputStream;
    options.stackFilter = stackFilter.configure({ filters: [__dirname] });
    this.reporter = briefReporter.create(options).listen(this.runner);

    this.firefox = rhelper.makeClient(
        this.runner,
        "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:16.0) Gecko/20100101 Firefox/16.0",
        "3122ebf2-1b5b-44b5-97dd-2ebd2898b95c"
    );

    this.chrome = rhelper.makeClient(
        this.runner,
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.4 (KHTML, like Gecko) Chrome/22.0.1229.94 Safari/537.4",
        "3023ddac-670d-4e32-a99d-25ae32398c11"
    );
}

helper.testCase("Brief reporter", {
    setUp: function () {
        reporterSetUp.call(this);
        this.clock = sinon.useFakeTimers();
    },

    tearDown: function () {
        this.clock.restore();
    },

    "prints temporary mission statement": function () {
        this.runner.emit("suite:start");

        this.assertIO("Running tests ...");
    },

    "prints number of tests to run": function () {
        this.firefox.emit("suite:configuration", { tests: 2 });

        this.assertIO("Running 2 tests in 1 runtime ...");
    },

    "overwrites existing status with new data": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 2 });

        this.assertIO("Running tests ...\n\x1b[1A\x1b[KRunning 2 tests in 1 runtime ...");
    },

    "does not overwrite user's logs": function () {
        this.runner.emit("suite:start");
        this.outputStream.write("YO!\n");
        this.firefox.emit("suite:configuration", { tests: 2 });

        this.assertIO("Running tests ...\nYO!\nRunning 2 tests in 1 runtime ...");
    },

    "does not print data when number of tests unknown": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", {});

        this.assertIO("Running tests in 1 runtime ...");
    },

    "updates number of tests and runtimes": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 2 });
        this.chrome.emit("suite:configuration", { tests: 3 });

        this.assertIO("Running 5 tests across 2 runtimes ...");
    },

    "updates summary with progress after 250ms": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 2 });

        this.clock.tick(249);
        refute.match(this.outputStream.toString(), "%");

        this.clock.tick(1);
        this.assertIO("Running 2 tests in 1 runtime ... 0% done\n");
    },

    "displays actual progress after 250ms": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 2 });
        this.firefox.emit("context:start", {});
        this.firefox.emit("test:success", {});

        this.clock.tick(250);
        this.assertIO("Running 2 tests in 1 runtime ... 50% done\n");
    },

    "displays actual progress with multiple clients": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 2 });
        this.chrome.emit("suite:configuration", { tests: 5 });
        this.firefox.emit("test:success", {});
        this.chrome.emit("test:success", {});
        this.chrome.emit("test:success", {});

        this.clock.tick(250);
        this.assertIO("Running 7 tests across 2 runtimes ... 43% done\n");
    },

    "updates progress every 100ms": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 2 });
        this.chrome.emit("suite:configuration", { tests: 5 });
        this.firefox.emit("test:success", {});
        this.clock.tick(250);

        this.chrome.emit("test:success", {});
        this.clock.tick(100);

        this.assertIO("Running 7 tests across 2 runtimes ... 29% done\n");
    },

    "does not print deferred tests": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 2 });
        this.firefox.emit("test:success", {});
        this.clock.tick(250);

        this.chrome.emit("test:deferred", { name: "test #2" });

        refute.match(this.outputStream.toString(), "test #2");
    },

    "prints final summary": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 1 });
        this.chrome.emit("suite:configuration", { tests: 1 });
        this.runner.emit("suite:end", {
            contexts: 2,
            tests: 2,
            assertions: 2,
            failures: 0,
            errors: 0,
            ok: true
        });

        this.assertIO("2 tests, 2 assertions, 2 runtimes ... OK\n");
    },

    "prints final summary for one test": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 1 });
        this.runner.emit("suite:end", {
            contexts: 1,
            tests: 1,
            assertions: 1,
            failures: 0,
            errors: 0,
            ok: true
        });

        this.assertIO("1 test, 1 assertion, 1 runtime ... OK\n");
    },

    "prints summary with 1 failure": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 1 });
        this.runner.emit("suite:end", {
            contexts: 2,
            tests: 2,
            assertions: 2,
            failures: 1,
            errors: 0,
            ok: false
        });

        this.assertIO("2 tests, 2 assertions, 1 runtime ... 1 failure\n");
    },

    "prints summary with failure, errors timeouts": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 1 });
        this.runner.emit("suite:end", {
            contexts: 2,
            tests: 2,
            assertions: 2,
            failures: 1,
            errors: 1,
            timeouts: 1,
            ok: false
        });

        this.assertIO("2 tests, 2 assertions, 1 runtime ... " +
                      "1 failure, 1 error, 1 timeout\n");
    },

    "prints summary with errors and timeouts": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 1 });
        this.runner.emit("suite:end", {
            contexts: 2,
            tests: 2,
            assertions: 2,
            failures: 0,
            errors: 2,
            timeouts: 2,
            ok: false
        });

        this.assertIO("2 tests, 2 assertions, 1 runtime ... " +
                      "2 errors, 2 timeouts\n");
    },

    "prints deferred count": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 1 });
        this.runner.emit("suite:end", {
            contexts: 2,
            tests: 2,
            assertions: 2,
            failures: 0,
            errors: 0,
            timeouts: 0,
            deferred: 1,
            ok: true
        });

        this.assertIO("1 deferred test\n2 tests, 2 assertions, 1 runtime ... OK");
    },

    "prints deferred count > 1": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 1 });
        this.runner.emit("suite:end", {
            contexts: 2,
            tests: 2,
            assertions: 2,
            failures: 0,
            errors: 0,
            timeouts: 0,
            deferred: 3,
            ok: true
        });

        this.assertIO("3 deferred tests\n2 tests, 2 assertions, 1 runtime ... OK");
    },

    "does not update status after tests complete": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 1 });
        this.firefox.emit("test:success", {});
        this.runner.emit("suite:end", {
            contexts: 1,
            tests: 1,
            assertions: 1,
            failures: 0,
            errors: 0
        });

        this.clock.tick(250);

        refute.match(this.outputStream.toString(), "100% done");
    },

    "does not update status after tests complete if taking > 250ms": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 1 });
        this.clock.tick(250);

        this.firefox.emit("test:success", {});
        this.runner.emit("suite:end", {
            contexts: 1,
            tests: 1,
            assertions: 1,
            failures: 0,
            errors: 0
        });

        this.clock.tick(100);

        refute.match(this.outputStream.toString(), "100% done");
    },

    "prints test failure": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 1 });
        this.clock.tick(250);

        this.firefox.emit("test:success", {});
        this.runner.emit("suite:end", {
            contexts: 1,
            tests: 1,
            assertions: 1,
            failures: 0,
            errors: 0
        });

        this.clock.tick(100);

        refute.match(this.outputStream.toString(), "100% done");
    }
});

helper.testCase("Brief reporter failures", {
    setUp: function () {
        reporterSetUp.call(this);
        this.firefox.emit("suite:configuration");
    },

    "prints full test name": function () {
        this.firefox.emit("context:start", { name: "Stuff" });
        this.firefox.emit("test:failure", { name: "should do stuff" });

        this.assertIO("Failure: Stuff should do stuff");
    },

    "does not print runtime when only one": function () {
        this.firefox.emit("context:start", { name: "Stuff" });
        this.firefox.emit("test:failure", { name: "should do stuff" });

        var unwanted = "Failure: Stuff should do stuff (Firefox 16.0 on Ubuntu 64-bit)";
        refute.match(this.outputStream.toString(), unwanted);
    },

    "prints full nested test name": function () {
        this.firefox.emit("context:start", { name: "Stuff" });
        this.firefox.emit("context:start", { name: "inner" });
        this.firefox.emit("test:failure", { name: "does stuff" });

        this.assertIO("Failure: Stuff inner does stuff");
    },

    "ignores completed contexts in test name": function () {
        this.firefox.emit("context:start", { name: "Stuff" });
        this.firefox.emit("context:start", { name: "inner" });
        this.firefox.emit("context:end", { name: "inner" });
        this.firefox.emit("test:failure", { name: "does stuff" });

        this.assertIO("Failure: Stuff does stuff");
    },

    "prints full nested test name with runtime when concurrent": function () {
        this.chrome.emit("suite:configuration");
        this.firefox.emit("context:start", { name: "Stuff" });
        this.chrome.emit("context:start", { name: "Other" });
        this.chrome.emit("context:start", { name: "inner" });
        this.firefox.emit("test:failure", { name: "does stuff" });
        this.chrome.emit("test:failure", { name: "sumptn" });

        this.assertIO("Failure: Stuff does stuff (Firefox 16.0 on Ubuntu 64-bit)");
        this.assertIO("Failure: Other inner sumptn (Chrome 22.0.1229.94 on Linux 64-bit)");
    },

    "prints error message": function () {
        this.firefox.emit("context:start", { name: "Stuff" });

        this.firefox.emit("test:failure", {
            name: "does stuff",
            error: { message: "Expected a to be equal to b" }
        });

        this.assertIO("  Expected a to be equal to b");
    },

    "does not print name when AssertionError": function () {
        this.firefox.emit("context:start", { name: "Stuff" });

        this.firefox.emit("test:failure", {
            name: "does stuff",
            error: {
                name: "AssertionError",
                message: "Expected a to be equal to b"
            }
        });

        this.assertIO("  Expected a to be equal to b");
    },

    "prints log messages": function () {
        this.firefox.emit("context:start", { name: "Stuff" });
        this.firefox.emit("test:setUp", { name: "does stuff" });
        this.firefox.emit("log", { level: "log", message: "Hey" });

        this.firefox.emit("test:failure", {
            name: "does stuff",
            error: { message: "Expected a to be equal to b" }
        });

        this.assertIO("[LOG] Hey");
    },

    "prints error source if present": function () {
        this.firefox.emit("context:start", { name: "Stuff" });

        this.firefox.emit("test:failure", {
            name: "does stuff",
            error: { message: "Expected a", source: "setUp" }
        });

        this.assertIO("  -> setUp");
    },

    "prints stack trace": function () {
        var error = new Error("Expected a to be equal to b");
        error.name = "AssertionError";
        try { throw error; } catch (e) { error = e; }
        this.firefox.emit("context:start", { name: "Stuff" });

        this.firefox.emit("test:failure", {
            name: "should do stuff",
            error: {
                message: "Expected a to be equal to b",
                stack: error.stack
            }
        });

        this.firefox.emit("context:end", { name: "Stuff" });

        this.assertIO("\n    at runTest");
    },

    "filters stack trace": function () {
        var error = new Error("Expected a to be equal to b");
        error.name = "AssertionError";
        try { throw error; } catch (e) { error = e; }
        this.firefox.emit("context:start", { name: "Stuff" });

        this.firefox.emit("test:failure", {
            name: "should do stuff",
            error: {
                message: "Expected a to be equal to b",
                stack: error.stack
            }
        });

        refute.match(this.outputStream.toString(), __dirname);
    }
});

helper.testCase("Brief reporter errors", {
    setUp: function () {
        reporterSetUp.call(this);
        this.firefox.emit("suite:configuration");
        this.chrome.emit("suite:configuration");
    },

    "prints full nested test name for correct runtime": function () {
        this.firefox.emit("context:start", { name: "Stuff" });
        this.chrome.emit("context:start", { name: "Other" });
        this.chrome.emit("context:start", { name: "inner" });
        this.firefox.emit("test:error", { name: "does stuff", error: {} });
        this.chrome.emit("test:error", { name: "sumptn", error: {} });

        this.assertIO("Error: Stuff does stuff (Firefox 16.0 on Ubuntu 64-bit)");
        this.assertIO("Error: Other inner sumptn (Chrome 22.0.1229.94 on Linux 64-bit)");
    },

    "prints error name": function () {
        this.firefox.emit("context:start", { name: "Stuff" });

        this.firefox.emit("test:error", {
            name: "does stuff",
            error: {
                name: "TypeError",
                message: "Expected a to be equal to b"
            }
        });

        this.assertIO("  TypeError: Expected a to be equal to b");
    },

    "does not print timeout error name": function () {
        this.firefox.emit("context:start", { name: "Stuff" });

        this.firefox.emit("test:error", {
            name: "does stuff",
            error: {
                name: "TimeoutError",
                message: "Expected a to be equal to b"
            }
        });

        refute.match(this.outputStream.toString(), "TimeoutError");
    },

    "prints error message": function () {
        this.firefox.emit("context:start", { name: "Stuff" });

        this.firefox.emit("test:error", {
            name: "does stuff",
            error: { message: "Expected a to be equal to b" }
        });

        this.assertIO("  Expected a to be equal to b");
    },

    "prints log messages": function () {
        this.firefox.emit("context:start", { name: "Stuff" });
        this.firefox.emit("test:setUp", { name: "does stuff" });
        this.firefox.emit("log", { level: "log", message: "Hey" });

        this.firefox.emit("test:error", {
            name: "does stuff",
            error: { message: "Expected a to be equal to b" }
        });

        this.assertIO("[LOG] Hey");
    },

    "filters stack trace": function () {
        var error = new Error("Expected a to be equal to b");
        error.name = "AssertionError";
        try { throw error; } catch (e) { error = e; }
        this.firefox.emit("context:start", { name: "Stuff" });

        this.firefox.emit("test:error", {
            name: "should do stuff",
            error: {
                message: "Expected a to be equal to b",
                stack: error.stack
            }
        });

        refute.match(this.outputStream.toString(), __dirname);
    }
});

helper.testCase("Brief reporter timeouts", {
    setUp: function () {
        reporterSetUp.call(this);
        this.firefox.emit("suite:configuration");
        this.chrome.emit("suite:configuration");
    },

    "prints full nested test name for correct runtime": function () {
        this.firefox.emit("context:start", { name: "Stuff" });
        this.chrome.emit("context:start", { name: "Other" });
        this.chrome.emit("context:start", { name: "inner" });
        this.firefox.emit("test:timeout", { name: "does stuff" });
        this.chrome.emit("test:timeout", { name: "sumptn" });

        this.assertIO("Timeout: Stuff does stuff (Firefox 16.0 on Ubuntu 64-bit)");
        this.assertIO("Timeout: Other inner sumptn (Chrome 22.0.1229.94 on Linux 64-bit)");
    },

    "prints error message": function () {
        this.firefox.emit("context:start", { name: "Stuff" });

        this.firefox.emit("test:error", {
            name: "does stuff",
            error: { message: "Expected a to be equal to b" }
        });

        this.assertIO("  Expected a to be equal to b");
    },

    "prints log messages": function () {
        this.firefox.emit("context:start", { name: "Stuff" });
        this.firefox.emit("test:setUp", { name: "does stuff" });
        this.firefox.emit("log", { level: "log", message: "Hey" });

        this.firefox.emit("test:timeout", {
            name: "does stuff",
            error: { message: "Expected a to be equal to b" }
        });

        this.assertIO("[LOG] Hey");
    }
});

helper.testCase("Brief reporter similar errors", {
    setUp: function () {
        this.exceptions = [{
            name: "TypeError",
            message: "Cannot call method 'hasOwnProperty' of undefined",
            stack: "TypeError: Cannot call method 'hasOwnProperty' of undefined\n" +
                "at Object.forEachWatcher (./lib/fs-watcher.js:17:26)\n" +
                "at STACK #1 (./lib/fs-watcher.js:17:26)\n" +
                "at Object.module.exports.end (./lib/fs-watcher.js:75:24)\n" +
                "at EventEmitter.end (./lib/tree-watcher.js:131:17)\n" +
                "at Object.buster.testCase.end closes all the watches (./test/tree-watcher-test.js:54:26)\n" +
                "at Object.p.then (./node_modules/when/when.js:71:31)\n" +
                "at _then (./node_modules/when/when.js:154:13)"
        }, {
            name: "TypeError",
            message: "Cannot call method 'hasOwnProperty' of undefined",
            stack: "TypeError: Cannot call method 'hasOwnProperty' of undefined\n" +
                "at Object.forEachWatcher (./lib/fs-watcher.js:17:26)\n" +
                "at STACK #2 (./lib/fs-watcher.js:17:26)\n" +
                "at Object.module.exports.unwatchDir (./lib/fs-watcher.js:68:24)\n" +
                "at EventEmitter.unwatch (./lib/tree-watcher.js:112:21)\n" +
                "at EventEmitter.emit (events.js:126:20)\n" +
                "at EventEmitter.<anonymous> (./lib/change-tracker.js:54:17)\n" +
                "at ./lib/fs-filtered.js:75:13\n" +
                "at ./lib/async.js:15:21\n" +
                "at ./lib/fs-filtered.js:24:9\n" +
                "at Object.oncomplete (fs.js:297:15)"
        }, {
            name: "TypeError",
            message: "Cannot call method 'hasOwnProperty' of undefined",
            stack: "TypeError: Cannot call method 'hasOwnProperty' of undefined\n" +
                "at Object.forEachWatcher (./lib/fs-watcher.js:17:26)\n" +
                "at STACK #3 (./lib/fs-watcher.js:17:26)\n" +
                "at Object.module.exports.end (./lib/fs-watcher.js:75:24)\n" +
                "at EventEmitter.end (./lib/tree-watcher.js:131:17)\n" +
                "at Object.buster.testCase.end closes all the watches (./test/tree-watcher-test.js:54:26)\n" +
                "at Object.p.then (./node_modules/when/when.js:71:31)\n" +
                "at _then (./node_modules/when/when.js:154:13)"
        }, {
            name: "TypeError",
            message: "Cannot call method 'hasOwnProperty' of undefined",
            stack: "TypeError: Cannot call method 'hasOwnProperty' of undefined\n" +
                "at Object.forEachWatcher (./lib/fs-watcher.js:17:26)\n" +
                "at STACK #4 (./lib/fs-watcher.js:17:26)\n" +
                "at Object.module.exports.unwatchDir (./lib/fs-watcher.js:68:24)\n" +
                "at EventEmitter.unwatch (./lib/tree-watcher.js:112:21)\n" +
                "at EventEmitter.emit (events.js:126:20)\n" +
                "at EventEmitter.<anonymous> (./lib/change-tracker.js:54:17)\n" +
                "at ./lib/fs-filtered.js:75:13\n" +
                "at ./lib/async.js:15:21\n" +
                "at ./lib/fs-filtered.js:24:9\n" +
                "at Object.oncomplete (fs.js:297:15)"
        }];

        reporterSetUp.call(this);
        this.firefox.emit("suite:configuration", {});
        this.firefox.emit("context:start", { name: "Stuff" });
        this.firefox.emit("test:setUp", { name: "does stuff" });
    },

    "prints full stack at first occurrence": function () {
        this.firefox.emit("test:error", {
            name: "test #1",
            error: this.exceptions[0]
        });

        this.assertIO("STACK #1");
    },

    "does not print stack for second occurrence": function () {
        this.firefox.emit("test:error", {
            name: "test #1",
            error: this.exceptions[0]
        });

        this.firefox.emit("test:error", {
            name: "test #2",
            error: this.exceptions[1]
        });

        refute.match(this.outputStream.toString(), "STACK #2");
    },

    "prints all similar errors when suite ends": function () {
        this.firefox.emit("test:error", {
            name: "test #1",
            error: this.exceptions[0]
        });

        this.firefox.emit("test:error", {
            name: "test #2",
            error: this.exceptions[1]
        });

        this.firefox.emit("test:error", {
            name: "test #3",
            error: this.exceptions[2]
        });

        this.firefox.emit("test:error", {
            name: "test #4",
            error: this.exceptions[3]
        });

        this.runner.emit("suite:end", {});

        this.assertIO("Repeated exceptions:");
        this.assertIO("  test #1\n" +
                      "  test #2\n" +
                      "  test #3\n" +
                      "  test #4\n\n" +
                      "  TypeError: Cannot call method 'hasOwnProperty' of undefined\n" +
                      "    at Object.forEachWatcher (./lib/fs-watcher.js:17:26)\n");
    },

    "prints all log messages": function () {
        this.firefox.emit("test:setUp", { name: "test #1" });
        this.firefox.emit("log", { level: "log", message: "MSG1" });

        this.firefox.emit("test:error", {
            name: "test #1",
            error: this.exceptions[0]
        });

        this.firefox.emit("test:setUp", { name: "test #2" });
        this.firefox.emit("log", { level: "log", message: "MSG2" });
        this.firefox.emit("log", { level: "warn", message: "MSG3" });

        this.firefox.emit("test:error", {
            name: "test #2",
            error: this.exceptions[1]
        });

        this.runner.emit("suite:end", {});

        this.assertIO("Repeated exceptions:");
        this.assertIO("  test #1\n" +
                      "    [LOG] MSG1\n" +
                      "  test #2\n" +
                      "    [LOG] MSG2\n" +
                      "    [WARN] MSG3\n\n" +
                      "  TypeError: Cannot call method 'hasOwnProperty' of undefined\n" +
                      "    at Object.forEachWatcher (./lib/fs-watcher.js:17:26)\n");
    },

    "does not print single occurrence errors as repeated": function () {
        this.firefox.emit("test:error", {
            name: "test #1",
            error: this.exceptions[0]
        });

        this.runner.emit("suite:end", {});

        refute.match(this.outputStream.toString(), "Repeated exceptions:");
    }
});

helper.testCase("Brief reporter uncaught exceptions", {
    setUp: function () {
        reporterSetUp.call(this);
        this.firefox.emit("suite:configuration", { tests: 2 });
    },

    "prints uncaught errors continuously": function () {
        this.firefox.emit("context:start", { name: "Stuff" });

        this.firefox.emit("uncaughtException", {
            name: "TypeError",
            message: "Expected a to be equal to b"
        });

        this.assertIO("Uncaught exception in Firefox 16.0 on Ubuntu 64-bit:");
        this.assertIO("TypeError: Expected a to be equal to b");
    }
});

helper.testCase("Brief reporter messages", {
    setUp: function () {
        reporterSetUp.call(this);
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 2 });
    },

    "prints global messages continuously": function () {
        this.firefox.emit("log", { level: "log", message: "Check it out" });
        this.runner.emit("suite:end", {});

        this.assertIO("[LOG] Check it out (Firefox 16.0 on Ubuntu 64-bit)\n" +
                      "Running 2 tests in 1 runtime");
    },

    "treats message between tests as global": function () {
        this.firefox.emit("test:setUp", { name: "test #1" });
        this.firefox.emit("test:success", { name: "test #1" });
        this.firefox.emit("test:tearDown", { name: "test #1" });
        this.firefox.emit("log", { level: "log", message: "Check it out" });
        this.firefox.emit("test:setUp", { name: "test #2" });
        this.firefox.emit("test:success", { name: "test #2" });
        this.firefox.emit("test:tearDown", { name: "test #2" });
        this.runner.emit("suite:end", {});

        this.assertIO("[LOG] Check it out (Firefox 16.0 on Ubuntu 64-bit)\n" +
                      "Running 2 tests in 1 runtime");
    },

    "does not print message for passing test": function () {
        this.firefox.emit("context:start", {});
        this.firefox.emit("test:setUp", { name: "test #1" });
        this.firefox.emit("log", { level: "log", message: "Check it out" });
        this.firefox.emit("test:success", { name: "test #1" });
        this.firefox.emit("context:end", {});
        this.runner.emit("suite:end", {});

        refute.match(this.outputStream.toString(), "[LOG]");
    }
});

helper.testCase("Brief reporter verbose", {
    setUp: function () {
        reporterSetUp.call(this, { verbosity: "info" });
    },

    "prints configuration names and runtimes": function () {
        this.firefox.emit("suite:configuration", { tests: 2 });

        this.assertIO("-> Firefox 16.0 on Ubuntu 64-bit\nRunning");
    },

    "prints deferred tests": function () {
        this.firefox.emit("suite:configuration", { tests: 2 });
        this.firefox.emit("context:start", { name: "stuff" });
        this.firefox.emit("test:deferred", { name: "test #2" });

        this.assertIO("Deferred: stuff test #2 (Firefox 16.0 on Ubuntu 64-bit)\nRunning");
    },

    "prints deferred tests with comments": function () {
        this.firefox.emit("suite:configuration", { tests: 2 });
        this.firefox.emit("context:start", { name: "stuff" });
        this.firefox.emit("test:deferred", {
            name: "test #2",
            comment: "TODO"
        });

        this.assertIO("Deferred: stuff test #2 " +
            "(Firefox 16.0 on Ubuntu 64-bit)\n          TODO\nRunning");
     },

    "prints skipped tests": function () {
        this.firefox.emit("suite:configuration", { tests: 2 });
        this.firefox.emit("context:unsupported", {
            context: { name: "thingie" },
            unsupported: ["Some stuff"]
        });

        this.assertIO("Skipping unsupported context thingie (Firefox 16.0 " +
                      "on Ubuntu 64-bit)\n    Some stuff\nRunning");
    },

    "prints all failed requirements for skipped tests": function () {
        this.firefox.emit("suite:configuration", { tests: 2 });
        this.firefox.emit("context:unsupported", {
            context: { name: "thingie" },
            unsupported: ["Some stuff", "Other things"]
        });

        this.assertIO("Skipping unsupported context thingie (Firefox 16.0 " +
                      "on Ubuntu 64-bit)\n    Some stuff\n    Other things\nRunning");
    },

    "warns about no assertions": function () {
        this.firefox.emit("suite:configuration", { tests: 1 });

        this.firefox.emit("test:success", {});
        this.runner.emit("suite:end", {
            contexts: 1,
            tests: 1,
            assertions: 0,
            failures: 0,
            errors: 0
        });

        this.assertIO("WARNING: No assertions!");
    },

    "prints focus mode notification": function () {
        this.firefox.emit("suite:configuration", { tests: 1 });

        this.firefox.emit("runner:focus", {});

        this.assertIO("Focus rocket engaged");
    }
});

helper.testCase("Brief reporter double verbose", {
    setUp: function () {
        reporterSetUp.call(this, { logPassedMessages: true });
        this.firefox.emit("suite:configuration", {});
    },

    "prints messages for passed tests": function () {
        this.firefox.emit("context:start", { name: "Stuff" });
        this.firefox.emit("test:setUp", { name: "test #1" });
        this.firefox.emit("log", { level: "log", message: "Woah" });

        this.firefox.emit("test:success", { name: "test #1" });

        this.assertIO("Stuff test #1");
        this.assertIO("[LOG] Woah\nRunning");
    },

    "does not print test name for passed tests without messages": function () {
        this.firefox.emit("context:start", { name: "Stuff" });
        this.firefox.emit("test:setUp", { name: "test #1" });

        this.firefox.emit("test:success", { name: "test #1" });

        refute.match(this.outputStream.toString(), "test #1");
    }
});
