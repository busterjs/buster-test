(function () {
    if (typeof require == "function") {
        var buster = {
            assert: require("buster-assert"),
            autoRun: require("../../../lib/buster-test/auto-run"),
            testCase: require("../../../lib/buster-test/test-case"),
            testRunner: require("../../../lib/buster-test/test-runner"),
            reporters: require("../../../lib/buster-test/reporters"),
            moduleLoader: require("buster-module-loader")
        };

        var assert = buster.assert;
        assert.format = require("buster-format").ascii;
        var sinon = require("sinon");
        buster.util = require("buster-util");
    }

    function testAutoRunOptions(options) {
        return function (test) {
            var env = options.env || {};

            for (var prop in env) {
                process.env[prop] = env[prop];
            }

            this.sandbox.stub(buster.autoRun, "run");
            var runner = buster.autoRun(options.autoRunOptions);

            setTimeout(function () {
                assert.match(buster.autoRun.run.args[0][1], options.options);
                test.end();
            }, 8);

            runner(buster.testCase("Auto running test case", this.tc));
        };
    }

    buster.util.testCase("AutoRunTest", {
        setUp: function () {
            this.tc = { testIt: function () {} };
            this.sandbox = sinon.sandbox.create();
            var self = this;

            this.sandbox.stub(buster.testRunner, "runSuite", function () {
                self.onRun && self.onRun();
            });
        },

        tearDown: function () {
            this.sandbox.restore();
        },

        "should run test case automatically": function (test) {
            this.onRun = test.end;
            var runner = buster.autoRun();

            runner(buster.testCase("Auto running test case", this.tc));
        },

        "should not autorun if a runner was already created": function (test) {
            var spy = this.onRun = sinon.spy();
            var runner = buster.autoRun();
            var testRunner = buster.testRunner.create();

            runner(buster.testCase("Auto running test case", this.tc));

            setTimeout(function () {
                assert(!spy.called);
                test.end();
            }, 5);
        },

        "should not autorun if a runner was created asynchronously": function (test) {
            var spy = this.onRun = sinon.spy();
            var runner = buster.autoRun();

            setTimeout(function () {
                var testRunner = buster.testRunner.create();
            }, 0);

            runner(buster.testCase("Auto running test case", this.tc));

            setTimeout(function () {
                assert(!spy.called);
                test.end();
            }, 5);
        },

        "should default reporter from env.BUSTER_REPORTER": testAutoRunOptions({
            env: { BUSTER_REPORTER: "bddConsole" },
            options: { reporter: "bddConsole" }
        }),

        "should use reporter from options": testAutoRunOptions({
            autoRunOptions: { reporter: "xml" },
            options: { reporter: "xml" }
        }),

        "should call run with filters from BUSTER_FILTERS": testAutoRunOptions({
            env: { BUSTER_FILTERS: "should" },
            options: { filters: ["should"] }
        }),

        "should call run with provided filters": testAutoRunOptions({
            autoRunOptions: { filters: ["should"] },
            options: { filters: ["should"] }
        }),

        "should call run with color setting from BUSTER_COLOR": testAutoRunOptions({
            env: { BUSTER_COLOR: "true" },
            options: { color: true }
        }),

        "should call run with provided color": testAutoRunOptions({
            autoRunOptions: { color: true },
            options: { color: true }
        }),

        "should call run with bright from BUSTER_BRIGHT": testAutoRunOptions({
            env: { BUSTER_BRIGHT: "false" },
            options: { bright: false }
        }),

        "should call run with provided bright setting": testAutoRunOptions({
            autoRunOptions: { bright: true },
            options: { bright: true }
        }),

        "should call run with timeout from BUSTER_TIMEOUT": testAutoRunOptions({
            env: { BUSTER_TIMEOUT: "45" },
            options: { timeout: 45 }
        }),

        "should call run with failOnNoAssertions from BUSTER_FAIL_ON_NO_ASSERTIONS":
        testAutoRunOptions({
            env: { BUSTER_FAIL_ON_NO_ASSERTIONS: "false" },
            options: { failOnNoAssertions: false }
        })
    });

    buster.util.testCase("autoRun.run test", {
        setUp: function () {
            this.sandbox = sinon.sandbox.create();
            this.sandbox.spy(buster.testRunner, "create");
            this.sandbox.stub(buster.testRunner, "runSuite");
            this.context = { tests: [{}] };
        },

        tearDown: function () {
            this.sandbox.restore();
        },

        "should abort if no test contexts": function () {
            buster.autoRun.run([]);

            assert(!buster.testRunner.create.called);
        },

        "should create runner with provided runner": function () {
            buster.autoRun.run([this.context], {
                reporter: "xml",
                filters: ["should"],
                color: true,
                bright: true,
                timeout: 10,
                failOnNoAssertions: false
            });

            assert.match(buster.testRunner.create.args[0][0], {
                reporter: "xml",
                filters: ["should"],
                color: true,
                bright: true,
                timeout: 10,
                failOnNoAssertions: false
            });
        },

        "should use specified reporter": function () {
            this.sandbox.spy(buster.reporters.xml, "create");
            buster.autoRun.run([this.context], { reporter: "xml", });

            assert(buster.reporters.xml.create.calledOnce);
        },

        "should use custom reporter": function () {
            var reporter = { create: sinon.stub().returns({ listen: sinon.spy() }) };
            this.sandbox.stub(buster.moduleLoader, "load").returns(reporter);

            buster.autoRun.run([this.context], { reporter: "mod#report", });

            assert(reporter.create.calledOnce);
        },

        "should initialize reporter with options": function () {
            this.sandbox.spy(buster.reporters.xUnitConsole, "create");
            buster.autoRun.run([this.context], {
                color: false,
                bright: false,
            });

            assert.match(buster.reporters.xUnitConsole.create.args[0][0], {
                color: false,
                bright: false,
            });
        },

        "should parse contexts": function () {
            var tests = [{ tests: [{ id: 1 }] }, { tests: [{ id: 2 }] }];
            var contexts = [{ parse: sinon.stub().returns(tests[0]) },
                            { parse: sinon.stub().returns(tests[1]) }];
            buster.autoRun.run(contexts);

            var actual = buster.testRunner.runSuite.args[0][0];
            assert.same(actual[0], tests[0]);
            assert.same(actual[1], tests[1]);
        },

        "should filter contexts": function () {
            var context = buster.testCase("Some tests", {
                "test #1": function () {},
                "test #2": function () {}
            });

            buster.autoRun.run([context], {
                filters: ["#1"]
            });

            assert.equals(buster.testRunner.runSuite.args[0][0][0].tests.length, 1);
        },

        "should skip contexts where all tests are filtered out": function () {
            var context = buster.testCase("Some tests", {
                "test #1": function () {},
                "test #2": function () {}
            });

            buster.autoRun.run([context], {
                filters: ["non-existent"]
            });

            assert.equals(buster.testRunner.runSuite.args[0][0].length, 0);
        },

        "should not skip contexts if tests are filtered but not sub-contexts":
        function () {
            var context = buster.testCase("Some tests", {
                "test #1": function () {},
                "test #2": function () {},
                "something": { "testIt": function () {} }
            });

            buster.autoRun.run([context], {
                filters: ["something"]
            });

            assert.equals(buster.testRunner.runSuite.args[0][0].length, 1);
        }
    });
}());
