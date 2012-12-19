var helper = require("../test-helper");
var rhelper = require("./test-helper");
var bane = require("bane");
var assert = require("referee").assert;
var sinon = require("sinon");
var spec = require("../../lib/reporters/specification");

function runnerSetUp() {
    this.out = rhelper.writableStream();
    this.runner = bane.createEventEmitter();
}

function reporterSetUp() {
    runnerSetUp.call(this);
    this.reporter = spec.create({
        outputStream: this.out
    }).listen(this.runner);
}

function generateError(message, type) {
    var error = new Error(message);
    error.name = type || "AssertionError";
    try { throw error; } catch (e) { return e; }
}

helper.testCase("SpecificationReporterTestsRunning", {
    setUp: reporterSetUp,

    "prints context name when entering top-level context": function () {
        this.runner.emit("context:start", { name: "Some context" });

        assert.equals(this.out.toString(), "Some context\n");
    },

    "prints passing test name indented with tick": function () {
        this.runner.emit("test:success", { name: "should do something" });

        assert.match(this.out.toString(), "  ✓ should do something\n");
    },

    "prints passing test name with full contextual name": function () {
        this.runner.emit("context:start", { name: "Some stuff" });
        this.runner.emit("context:start", { name: "in some state" });
        this.runner.emit("test:success", { name: "should do it" });

        assert.match(this.out.toString(), "  ✓ in some state should do it\n");
    },

    "does not 'remember' completed contexts": function () {
        this.runner.emit("context:start", { name: "Some stuff" });
        this.runner.emit("context:start", { name: "in some state" });
        this.runner.emit("context:end", { name: "in some state" });
        this.runner.emit("context:start", { name: "in some other state" });
        this.runner.emit("test:success", { name: "should do it" });

        assert.match(this.out.toString(), "  ✓ in some other state should do it\n");
    },

    "prints failed test name indented with cross": function () {
        this.runner.emit("test:failure", { name: "should do something" });

        assert.match(this.out.toString(), "  ✖ should do something\n");
    },

    "prints test failure with stack trace": function () {
        this.runner.emit("test:failure", {
            name: "should do something",
            error: generateError("Expected a to be equal to b")
        });

        assert.match(this.out.toString(), "    Expected a to be equal to b\n");
        assert.match(this.out.toString(), "      at Object");
    },

    "prints failed test name with full contextual name": function () {
        this.runner.emit("context:start", { name: "Some stuff" });
        this.runner.emit("context:start", { name: "in some state" });
        this.runner.emit("test:failure", { name: "should do it" });

        assert.match(this.out.toString(), "  ✖ in some state should do it\n");
    },

    "prints errored test name indented with cross": function () {
        this.runner.emit("test:error", { name: "should do something" });

        assert.match(this.out.toString(), "  ✖ should do something\n");
    },

    "prints test error with stack trace": function () {
        this.runner.emit("test:failure", {
            name: "should do something",
            error: generateError("Oh shizzle!", "SomeError")
        });

        assert.match(this.out.toString(), "    SomeError: Oh shizzle!\n");
        assert.match(this.out.toString(), "      at Object");
    },

    "prints failed test name with full contextual name": function () {
        this.runner.emit("context:start", { name: "Some stuff" });
        this.runner.emit("context:start", { name: "in some state" });
        this.runner.emit("test:error", { name: "should do it" });

        assert.match(this.out.toString(), "  ✖ in some state should do it\n");
    },

    "prints deferred test with indented dash": function () {
        this.runner.emit("test:deferred", { name: "should do something" });

        assert.match(this.out.toString(), "  - should do something\n");
    },

    "prints deferred test name with full contextual name": function () {
        this.runner.emit("context:start", { name: "Some stuff" });
        this.runner.emit("context:start", { name: "in some state" });
        this.runner.emit("test:deferred", { name: "should do it" });

        assert.match(this.out.toString(), "  - in some state should do it\n");
    },

    "prints timed out test with indented ellipsis": function () {
        this.runner.emit("test:timeout", { name: "should do something" });

        assert.match(this.out.toString(), "  … should do something\n");
    },

    "prints timed out test name with full contextual name": function () {
        this.runner.emit("context:start", { name: "Some stuff" });
        this.runner.emit("context:start", { name: "in some state" });
        this.runner.emit("test:timeout", { name: "should do it" });

        assert.match(this.out.toString(), "  … in some state should do it\n");
    },

    "prints log message for passing test": function () {
        this.runner.emit("context:start", { name: "Some stuff" });
        this.runner.emit("context:start", { name: "in some state" });
        this.reporter.log({ level: "log", message: "Is message" });
        this.runner.emit("test:success", { name: "should do it" });

        assert.match(this.out.toString(), "do it\n    [LOG] Is message\n");
    },

    "prints log message for failing test": function () {
        this.runner.emit("context:start", { name: "Some stuff" });
        this.runner.emit("context:start", { name: "in some state" });
        this.reporter.log({ level: "log", message: "Is message" });
        this.runner.emit("test:failure", { name: "should do it" });

        assert.match(this.out.toString(), "do it\n    [LOG] Is message\n");
    },

    "prints log message for errored test": function () {
        this.runner.emit("context:start", { name: "Some stuff" });
        this.runner.emit("context:start", { name: "in some state" });
        this.reporter.log({ level: "log", message: "Is message" });
        this.runner.emit("test:error", { name: "should do it" });

        assert.match(this.out.toString(), "do it\n    [LOG] Is message\n");
    },

    "prints log message for timed out test": function () {
        this.runner.emit("context:start", { name: "Some stuff" });
        this.runner.emit("context:start", { name: "in some state" });
        this.reporter.log({ level: "log", message: "Is message" });
        this.runner.emit("test:timeout", { name: "should do it" });

        assert.match(this.out.toString(), "do it\n    [LOG] Is message\n");
    },

    "does not re-print previous log messages": function () {
        this.runner.emit("context:start", { name: "Some stuff" });
        this.runner.emit("context:start", { name: "in some state" });
        this.reporter.log({ level: "log", message: "Is message" });
        this.runner.emit("test:timeout", { name: "should do it" });
        this.reporter.log({ level: "warn", message: "Is other message" });
        this.runner.emit("test:timeout", { name: "should go again" });

        assert.match(this.out.toString(), "go again\n    [WARN] Is other");
    },

    "prints warning when skipping unsupported context": function () {
        this.reporter["context:unsupported"]({
            context: { name: "Stuff" },
            unsupported: ["localStorage"]
        });

        assert.match(this.out.toString(), "Skipping Stuff, unsupported requirement: localStorage\n");
    },

    "prints warning when skipping nested unsupported context": function () {
        this.runner.emit("context:start", { name: "Test" });

        this.reporter["context:unsupported"]({
            context: { name: "Stuff" },
            unsupported: ["localStorage"]
        });

        assert.match(this.out.toString(), "Skipping Test Stuff, unsupported requirement: localStorage\n");
    },

    "prints all unsupported features": function () {
        this.reporter["context:unsupported"]({
            context: { name: "Stuff" },
            unsupported: ["localStorage", "document"]
        });

        assert.match(this.out.toString(), "Skipping Stuff, unsupported requirements:\n    localStorage\n    document\n");
    }
});

helper.testCase("SpecificationReporterColoredTestsRunningTest", {
    setUp: function () {
        runnerSetUp.call(this);

        this.reporter = spec.create({
            outputStream: this.out,
            color: true
        }).listen(this.runner);
    },

    "prints passing test name in green": function () {
        this.runner.emit("test:success", { name: "should do it" });

        assert.match(this.out.toString(), "\033[32m  ✓ should do it\033[0m\n");
    },

    "prints failed test name in red": function () {
        this.runner.emit("test:failure", { name: "should do it" });

        assert.match(this.out.toString(), "\033[31m  ✖ should do it\033[0m\n");
    },

    "prints test failure stack trace in red": function () {
        this.runner.emit("test:failure", {
            name: "should do something",
            error: generateError("Expected a to be equal to b")
        });

        assert.match(this.out.toString(), "    \033[31mExpected a to be equal to b\033[0m\n");
    },

    "prints errored test name indented with cross": function () {
        this.runner.emit("test:error", { name: "should do it", error: { name: "Error" } });

        assert.match(this.out.toString(), "\033[33m  ✖ Should do it\033[0m\n");
    },

    "prints test error stack trace in yellow": function () {
        this.runner.emit("test:failure", {
            name: "should do something",
            error: generateError("Oh shizzle!", "SomeError")
        });

        assert.match(this.out.toString(), "    \033[33mSomeError: Oh shizzle!\033[0m\n");
        assert.match(this.out.toString(), "      at Object");
    },

    "prints deferred test in cyan": function () {
        this.runner.emit("test:deferred", { name: "should do it" });

        assert.match(this.out.toString(), "\033[36m  - should do it\033[0m\n");
    },

    "prints timed out test in red": function () {
        this.runner.emit("test:timeout", { name: "should do something" });

        assert.match(this.out.toString(), "\033[31m  … should do something\033[0m\n");
    }
});
