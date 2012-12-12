var helper = require("../test-helper");
var rhelper = require("./test-helper");
var bane = require("bane");
var referee = require("referee");
var sinon = require("sinon");
var platform = require("platform");
var briefReporter = require("../../lib/reporters/brief");
var assert = referee.assert;
var refute = referee.refute;
var stackFilter = require("stack-filter");

function client(runner, ua, uuid) {
    var client = platform.parse(ua);
    client.uuid = uuid;

    return {
        emit: function (event, data) {
            data = data || {};
            data.environment = client;
            runner.emit(event, data);
        }
    };
}

function reporterSetUp() {
    this.outputStream = rhelper.writableStream();
    this.assertIO = rhelper.assertIO;
    this.runner = bane.createEventEmitter();

    this.reporter = briefReporter.create({
        outputStream: this.outputStream,
        stackFilter: stackFilter.configure({ filters: [__dirname] })
    }).listen(this.runner);

    this.firefox = client(
        this.runner,
        "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:16.0) Gecko/20100101 Firefox/16.0",
        "3122ebf2-1b5b-44b5-97dd-2ebd2898b95c"
    );

    this.chrome = client(
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

        this.assertIO("Running 2 tests in 1 environment ...");
    },

    "overwrites existing status with new data": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 2 });

        this.assertIO("Running tests ...\n\x1b[1A\x1b[KRunning 2 tests in 1 environment ...\n");
    },

    "updates number of tests and environments": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 2 });
        this.chrome.emit("suite:configuration", { tests: 3 });

        this.assertIO("Running 5 tests across 2 environments ...\n");
    },

    "updates summary with progress after 250ms": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 2 });

        this.clock.tick(249);
        refute.match(this.outputStream.toString(), "%");

        this.clock.tick(1);
        this.assertIO("Running 2 tests in 1 environment ... 0% done\n");
    },

    "displays actual progress after 250ms": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 2 });
        this.firefox.emit("context:start", {});
        this.firefox.emit("test:success", {});

        this.clock.tick(250);
        this.assertIO("Running 2 tests in 1 environment ... 50% done\n");
    },

    "displays actual progress with multiple clients": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 2 });
        this.chrome.emit("suite:configuration", { tests: 5 });
        this.firefox.emit("test:success", {});
        this.chrome.emit("test:success", {});
        this.chrome.emit("test:success", {});

        this.clock.tick(250);
        this.assertIO("Running 7 tests across 2 environments ... 43% done\n");
    },

    "updates progress every 100ms": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 2 });
        this.chrome.emit("suite:configuration", { tests: 5 });
        this.firefox.emit("test:success", {});
        this.clock.tick(250);

        this.chrome.emit("test:success", {});
        this.clock.tick(100);

        this.assertIO("Running 7 tests across 2 environments ... 29% done\n");
    },

    "prints final summary": function () {
        this.runner.emit("suite:start");
        this.firefox.emit("suite:configuration", { tests: 1 });
        this.chrome.emit("suite:configuration", { tests: 1 });
        this.firefox.emit("test:success", {});
        this.chrome.emit("test:success", {});
        this.runner.emit("suite:end", {
            contexts: 2,
            tests: 2,
            assertions: 2,
            failures: 0,
            errors: 0
        });

        this.assertIO("2 tests, 2 assertions, 2 environments ... OK\n");
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
        this.chrome.emit("suite:configuration");
    },

    "prints full test name": function () {
        this.firefox.emit("context:start", { name: "Stuff" });
        this.firefox.emit("test:failure", { name: "should do stuff" });

        this.assertIO("Failure: Stuff should do stuff (Firefox 16.0 on Ubuntu 64-bit)");
    },

    "prints full nested test name": function () {
        this.firefox.emit("context:start", { name: "Stuff" });
        this.firefox.emit("context:start", { name: "inner" });
        this.firefox.emit("test:failure", { name: "does stuff" });

        this.assertIO("Failure: Stuff inner does stuff (Firefox 16.0 on Ubuntu 64-bit)");
    },

    "ignores completed contexts in test name": function () {
        this.firefox.emit("context:start", { name: "Stuff" });
        this.firefox.emit("context:start", { name: "inner" });
        this.firefox.emit("context:end", { name: "inner" });
        this.firefox.emit("test:failure", { name: "does stuff" });

        this.assertIO("Failure: Stuff does stuff (Firefox 16.0 on Ubuntu 64-bit)");
    },

    "prints full nested test name for correct environment": function () {
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

        this.assertIO("    Expected a to be equal to b");
    },

    "prints log messages": function () {
        this.firefox.emit("context:start", { name: "Stuff" });
        this.firefox.emit("test:setUp", { name: "dos stuff" });
        this.firefox.emit("log", { level: "log", message: "Hey" });

        this.firefox.emit("test:failure", {
            name: "dos stuff",
            error: { message: "Expected a to be equal to b" }
        });

        this.assertIO("[LOG] Hey");
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

        this.firefox.emit("context:end", { name: "Stuff" });

        refute.match(this.outputStream.toString(), __dirname);
    }
});

helper.testCase("Brief reporter errors", {
    setUp: reporterSetUp,

    "//???": function () {}
});

helper.testCase("Brief reporter timeouts", {
    setUp: reporterSetUp,

    "//???": function () {}
});

helper.testCase("Brief reporter similar errors", {
    setUp: reporterSetUp,

    "//groups similar errors with 'xx more like this'": function () {}
});

helper.testCase("Brief reporter uncaught exceptions", {
    setUp: reporterSetUp,

    "//???": function () {}
});

helper.testCase("Brief reporter messages", {
    setUp: reporterSetUp,

    "//prints global messages": function () {}
});

helper.testCase("Brief reporter verbose", {
    setUp: reporterSetUp,

    "//prints configuration names and environments": function () {},
    "//prints deferred tests": function () {},
    "//prints deferred tests with comments": function () {},
    "//prints skipped tests": function () {}
});

helper.testCase("Brief reporter double verbose", {
    setUp: reporterSetUp,

    "//prints all messages": function () {}
});
