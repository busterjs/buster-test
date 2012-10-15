var helper = require("../test-helper");
var rhelper = require("./test-helper");
var bane = require("bane");
var assert = require("referee").assert;
var sinon = require("sinon");
var tapReporter = require("../../lib/reporters/tap");

helper.testCase("TAPReporterTest", {
    setUp: function () {
        this.outputStream = rhelper.writableStream();
        this.assertIO = rhelper.assertIO;
        this.runner = bane.createEventEmitter();
        this.runner.console = bane.createEventEmitter();
        this.reporter = tapReporter.create({
            outputStream: this.outputStream
        }).listen(this.runner);

        this.test = function (name, result, data) {
            var event = data || {};
            event.name = "no. 1";
            this.runner.emit("test:start", event);
            this.runner.emit("test:" + result, event);
        };
    },

    "prints the plan": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context" });
        this.test("no. 1", "success");
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("suite:end");

        this.assertIO("1..1");
    },

    "prints the plan for three tests": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context" });
        this.test("no. 1", "success");
        this.test("no. 2", "success");
        this.test("no. 3", "success");
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("suite:end");

        this.assertIO("1..3");
    },

    "prints the plan for five tests in nested contexts": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context no. 1" });
        this.test("no. 1", "success");
        this.test("no. 2", "success");
        this.runner.emit("context:end", { name: "Context no. 1" });
        this.runner.emit("context:start", { name: "Context no. 2" });
        this.test("no. 3", "success");
        this.runner.emit("context:start", { name: "Context no. 3" });
        this.test("no. 4", "success");
        this.runner.emit("context:start", { name: "Context no. 4" });
        this.test("no. 5", "success");
        this.runner.emit("context:end", { name: "Context no. 4" });
        this.runner.emit("context:end", { name: "Context no. 3" });
        this.runner.emit("context:end", { name: "Context no. 2" });
        this.runner.emit("suite:end");

        this.assertIO("1..5");
    },

    "prints ok line for passed test": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context" });
        this.test("no. 1", "success");
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("suite:end");

        this.assertIO("ok 1 Context no. 1");
    },

    "prints not ok line for failed test": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context" });
        this.test("no. 1", "failure");
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("suite:end");

        this.assertIO("not ok 1 Context no. 1");
    },

    "prints not ok line for errored test": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context" });
        this.test("no. 1", "error");
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("suite:end");

        this.assertIO("not ok 1 Context no. 1");
    },

    "prints not ok line for timed out test": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context" });
        this.test("no. 1", "timeout");
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("suite:end");

        this.assertIO("not ok 1 Context no. 1");
    },

    "prints TODO directive for pending tests": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context" });
        this.test("no. 1", "deferred");
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("suite:end");

        this.assertIO("not ok 1 Context no. 1 # TODO Deferred");
    },

    "prints TODO directive with comment": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context" });
        this.test("no. 1", "deferred", { comment: "Later y'all" });
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("suite:end");

        this.assertIO("not ok 1 Context no. 1 # TODO Later y'all");
    },

    "prints SKIP directive for unsupported requirement": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("context:unsupported", {
            context: { name: "Context 2" },
            unsupported: ["A"]
        });
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("suite:end");

        this.assertIO("not ok 1 Context 2 # SKIP Unsupported requirement: A");
    },

    "prints SKIP directive for all unsupported requirements": function () {
        this.runner.emit("suite:start");
        this.runner.emit("context:start", { name: "Context" });
        this.runner.emit("context:unsupported", {
            context: { name: "Context 2" },
            unsupported: ["A", "B"]
        });
        this.runner.emit("context:end", { name: "Context" });
        this.runner.emit("suite:end");

        this.assertIO("not ok 1 Context 2 # SKIP Unsupported requirements: A, B");
    }
});
