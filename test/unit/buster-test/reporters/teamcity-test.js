var sinon = require("sinon");
var buster = require("buster-core");
var assertions = require("buster-assertions");
var teamcityReporter = require("../../../../lib/buster-test/reporters/teamcity");
var busterUtil = require("buster-util");
var assert = assertions.assert;

busterUtil.testCase("TeamcityReporterTest", sinon.testCase({
    setUp:function () {
        var that = this;
        that.reporter = teamcityReporter.create();
        that.log = [];

        sinon.stub(console, 'log', function (msg) {
            that.log.push(msg);
        })
    },

    tearDown:function () {
        console.log.restore();
    },

    "should print testsuite element with stats on context:end":function () {
        this.reporter.contextStart({ name:"Context" });
        this.reporter.contextEnd({ name:"Context" });

        assert.equals(this.log, [
            "##teamcity[testSuiteStarted name='Context']",
            "##teamcity[testSuiteFinished name='Context']"
        ]);
    },

    "should not print testsuite element for nested context:end":function () {
        this.reporter.contextStart({ name:"Context" });
        this.reporter.contextStart({ name:"Inner" });
        this.reporter.contextEnd({ name:"Inner" });

        assert.equals(this.log, []);
    },

    "should print total time for each test":function () {
        this.reporter.contextStart({ name:"Context" });
        this.reporter.testStart({ name:"should #1" });
        this.clock.tick(10);
        this.reporter.testSuccess({ name:"should #1" });
        this.reporter.testStart({ name:"should #2" });
        this.clock.tick(20);
        this.reporter.testSuccess({ name:"should #2" });
        this.reporter.contextEnd({ name:"Context" });

        assert.equals(this.log, [
            "##teamcity[testSuiteStarted name='Context']",
            "##teamcity[testStarted name='should #1' captureStandardOutput='true']",
            "##teamcity[testFinished name='should #1' duration='10']",
            "##teamcity[testStarted name='should #2' captureStandardOutput='true']",
            "##teamcity[testFinished name='should #2' duration='20']",
            "##teamcity[testSuiteFinished name='Context']"
        ]);
    },

    "should add nested context names to test names":function () {
        this.reporter.contextStart({ name:"Context" });
        this.reporter.contextStart({ name:"Some behavior" });
        this.reporter.testStart({ name:"should #1" });
        this.reporter.testSuccess({ name:"should #1" });
        this.reporter.testStart({ name:"should #2" });
        this.reporter.testSuccess({ name:"should #2" });
        this.reporter.contextEnd({ name:"Some behavior" });
        this.reporter.contextEnd({ name:"Context" });

        assert.equals(this.log, [
            "##teamcity[testSuiteStarted name='Context']",
            "##teamcity[testStarted name='Some behavior should #1' captureStandardOutput='true']",
            "##teamcity[testFinished name='Some behavior should #1' duration='0']",
            "##teamcity[testStarted name='Some behavior should #2' captureStandardOutput='true']",
            "##teamcity[testFinished name='Some behavior should #2' duration='0']",
            "##teamcity[testSuiteFinished name='Context']"
        ]);
    },

    "should include elements for errors/failures":function () {
        this.reporter.contextStart({ name:"Context" });
        this.reporter.testStart({ name:"#1" });
        this.reporter.testFailure({ name:"#1", error:{ name:'E1', message:'M1' } });
        this.reporter.testStart({ name:"#2" });
        this.reporter.testError({ name:"#2", error:{ name:'E2', message:'M2' } });
        this.reporter.contextEnd({ name:"Context" });

        assert.equals(this.log, [
            "##teamcity[testSuiteStarted name='Context']",
            "##teamcity[testStarted name='#1' captureStandardOutput='true']",
            "##teamcity[testFailed name='#1' message='Error-> E1 - M1|n' details='Error-> E1 - M1|n']",
            "##teamcity[testFinished name='#1' duration='0']",
            "##teamcity[testStarted name='#2' captureStandardOutput='true']",
            "##teamcity[testFailed name='#2' message='Error-> E2 - M2|n' details='Error-> E2 - M2|n']",
            "##teamcity[testFinished name='#2' duration='0']",
            "##teamcity[testSuiteFinished name='Context']"
        ]);
    }
}, "should"));