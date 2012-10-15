var helper = require("../test-helper");
var rhelper = require("./test-helper");
var bane = require("bane");
var assert = require("referee").assert;
var sinon = require("sinon");
var teamCity = require("../../lib/reporters/teamcity");

helper.testCase("TeamCityReporterTest", {
    setUp: function () {
        this.outputStream = rhelper.writableStream();
        this.assertIO = rhelper.assertIO;
        this.runner = bane.createEventEmitter();
        this.runner.console = bane.createEventEmitter();
        this.reporter = teamCity.create({
            outputStream: this.outputStream
        }).listen(this.runner);
        this.clock = sinon.useFakeTimers();
    },

    tearDown: function () {
        this.clock.restore();
    },

    "prints testsuite element with stats on context:end":function () {
        this.runner.emit("context:start", { name:"Context" });
        this.runner.emit("context:end", { name:"Context" });

        this.assertIO("##teamcity[testSuiteStarted name='Context']");
        this.assertIO("##teamcity[testSuiteFinished name='Context']");
    },

    "does not print testsuite element for nested context:end":function () {
        this.runner.emit("context:start", { name:"Context" });
        this.runner.emit("context:start", { name:"Inner" });
        this.runner.emit("context:end", { name:"Inner" });

        assert.equals(this.outputStream.toString(), "");
    },

    "prints total time for each test":function () {
        this.runner.emit("context:start", { name:"Context" });
        this.runner.emit("test:start", { name:"should #1" });
        this.clock.tick(10);
        this.runner.emit("test:success", { name:"should #1" });
        this.runner.emit("test:start", { name:"should #2" });
        this.clock.tick(20);
        this.runner.emit("test:success", { name:"should #2" });
        this.runner.emit("context:end", { name:"Context" });

        this.assertIO("##teamcity[testSuiteStarted name='Context']");
        this.assertIO("##teamcity[testStarted name='should #1' captureStandardOutput='true']");
        this.assertIO("##teamcity[testFinished name='should #1' duration='10']");
        this.assertIO("##teamcity[testStarted name='should #2' captureStandardOutput='true']");
        this.assertIO("##teamcity[testFinished name='should #2' duration='20']");
        this.assertIO("##teamcity[testSuiteFinished name='Context']");
    },

    "adds nested context names to test names":function () {
        this.runner.emit("context:start", { name:"Context" });
        this.runner.emit("context:start", { name:"Some behavior" });
        this.runner.emit("test:start", { name:"should #1" });
        this.runner.emit("test:success", { name:"should #1" });
        this.runner.emit("test:start", { name:"should #2" });
        this.runner.emit("test:success", { name:"should #2" });
        this.runner.emit("context:end", { name:"Some behavior" });
        this.runner.emit("context:end", { name:"Context" });

        this.assertIO("##teamcity[testSuiteStarted name='Context']");
        this.assertIO("##teamcity[testStarted name='Some behavior should #1' captureStandardOutput='true']");
        this.assertIO("##teamcity[testFinished name='Some behavior should #1' duration='0']");
        this.assertIO("##teamcity[testStarted name='Some behavior should #2' captureStandardOutput='true']");
        this.assertIO("##teamcity[testFinished name='Some behavior should #2' duration='0']");
        this.assertIO("##teamcity[testSuiteFinished name='Context']");
    },

    "includes elements for errors/failures":function () {
        this.runner.emit("context:start", { name:"Context" });
        this.runner.emit("test:start", { name:"#1" });
        this.runner.emit("test:failure", { name:"#1", error:{ name:'E1', message:'M1' } });
        this.runner.emit("test:start", { name:"#2" });
        this.runner.emit("test:error", { name:"#2", error:{ name:'E2', message:'M2' } });
        this.runner.emit("context:end", { name:"Context" });

        this.assertIO("##teamcity[testSuiteStarted name='Context']");
        this.assertIO("##teamcity[testStarted name='#1' captureStandardOutput='true']");
        this.assertIO("##teamcity[testFailed name='#1' message='Error-> E1 - M1|n' details='Error-> E1 - M1|n']");
        this.assertIO("##teamcity[testFinished name='#1' duration='0']");
        this.assertIO("##teamcity[testStarted name='#2' captureStandardOutput='true']");
        this.assertIO("##teamcity[testFailed name='#2' message='Error-> E2 - M2|n' details='Error-> E2 - M2|n']");
        this.assertIO("##teamcity[testFinished name='#2' duration='0']");
        this.assertIO("##teamcity[testSuiteFinished name='Context']");
    }
});
