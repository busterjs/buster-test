/*jslint maxlen: 100*/
((typeof require === "function" && function (reqs, callback) {
    callback.apply(this, reqs.map(function (req) { return require(req); }));
}) || define)([
    "sinon",
    "referee",
    "../lib/test-case",
    "../lib/test-runner",
    "../lib/auto-run",
    "../lib/reporters",
    "./test-helper"
], function (sinon, referee, testCase, testRunner, autoRun, reporters, helper) {
    var assert = referee.assert;

    function testAutoRunOptions(options) {
        return function () {
            var prop, env = options.env || {};

            if (typeof process === "undefined" && options.env) {
                return;
            }

            for (prop in env) {
                process.env[prop] = env[prop];
            }

            this.sandbox.stub(autoRun, "run");
            var runner = autoRun(options.autoRunOptions);
            runner(testCase("Auto running test case", this.tc));
            this.clock.tick(10);

            assert.match(autoRun.run.args[0][1], options.options);
        };
    }

    helper.testCase("AutoRunTest", {
        setUp: function () {
            this.tc = { testIt: function () {} };
            this.sandbox = sinon.sandbox.create();
            this.clock = this.sandbox.useFakeTimers();
            this.sandbox.stub(testRunner, "on");
            var self = this;

            this.sandbox.stub(testRunner, "runSuite", function () {
                if (self.onRun) { self.onRun(); }
            });
        },

        tearDown: function () {
            this.sandbox.restore();
        },

        "runs test case automatically": function () {
            this.onRun = sinon.spy();
            var runner = autoRun();

            runner(testCase("Auto running test case", this.tc));
            this.clock.tick(10);

            assert(this.onRun.calledOnce);
        },

        "calls callback when runner emits suite:end": function () {
            var callback = function () {};
            var runner = autoRun(callback);

            runner(testCase("Auto running test case", this.tc));
            this.clock.tick(10);

            assert(testRunner.on.calledWith("suite:end", callback));
        },

        "calls end callback when runner emits suite:end": function () {
            var callback = function () {};
            var runner = autoRun({}, { end: callback });

            runner(testCase("Auto running test case", this.tc));
            this.clock.tick(10);

            assert(testRunner.on.calledWith("suite:end", callback));
        },

        "calls start callback with runner": function () {
            var callback = sinon.spy();
            var runner = autoRun({}, { start: callback });

            runner(testCase("Auto running test case", this.tc));
            this.clock.tick(10);

            assert(callback.calledOnce);
            assert(typeof callback.args[0][0].runSuite === "function");
        },

        "does not autorun if a runner was already created": function () {
            var spy = this.onRun = sinon.spy();
            var runner = autoRun();
            var existing = testRunner.create();

            runner(testCase("Auto running test case", this.tc));
            this.clock.tick(10);

            assert(!spy.called);
        },

        "does not autorun if a runner was created asynchronously": function () {
            var spy = this.onRun = sinon.spy();

            var runner = autoRun();
            runner(testCase("Auto running test case", {
                testIt: function () {}
            }));

            var existing = testRunner.create();
            this.clock.tick(1);
            assert(!spy.called);
        },

        "defaults reporter from env.BUSTER_REPORTER": testAutoRunOptions({
            env: { BUSTER_REPORTER: "specification" },
            options: { reporter: "specification" }
        }),

        "uses reporter from options": testAutoRunOptions({
            autoRunOptions: { reporter: "xml" },
            options: { reporter: "xml" }
        }),

        "calls run with filters from BUSTER_FILTERS": testAutoRunOptions({
            env: { BUSTER_FILTERS: "should" },
            options: { filters: ["should"] }
        }),

        "calls run with provided filters": testAutoRunOptions({
            autoRunOptions: { filters: ["should"] },
            options: { filters: ["should"] }
        }),

        "calls run with color setting from BUSTER_COLOR": testAutoRunOptions({
            env: { BUSTER_COLOR: "true" },
            options: { color: true }
        }),

        "calls run with provided color": testAutoRunOptions({
            autoRunOptions: { color: true },
            options: { color: true }
        }),

        "calls run with bright from BUSTER_BRIGHT": testAutoRunOptions({
            env: { BUSTER_BRIGHT: "false" },
            options: { bright: false }
        }),

        "calls run with provided bright setting": testAutoRunOptions({
            autoRunOptions: { bright: true },
            options: { bright: true }
        }),

        "calls run with timeout from BUSTER_TIMEOUT": testAutoRunOptions({
            env: { BUSTER_TIMEOUT: "45" },
            options: { timeout: 45 }
        }),

        "calls run with failOnNoAssertions from BUSTER_FAIL_ON_NO_ASSERTIONS": testAutoRunOptions({
            env: { BUSTER_FAIL_ON_NO_ASSERTIONS: "false" },
            options: { failOnNoAssertions: false }
        }),

        "calls run with random from BUSTER_RANDOM": testAutoRunOptions({
            env: { BUSTER_RANDOM: "0" },
            options: { random: false }
        }),

        "calls run with random from BUSTER_RANDOM with 'false'": testAutoRunOptions({
            env: { BUSTER_RANDOM: "false" },
            options: { random: false }
        }),

        "calls run with random from options": testAutoRunOptions({
            autoRunOptions: { random: false },
            options: { random: false }
        }),

        "calls run with randomSeed from options": testAutoRunOptions({
            autoRunOptions: { randomSeed: "hmm" },
            options: { randomSeed: "hmm" }
        })
    });

    helper.testCase("autoRun.run test", {
        setUp: function () {
            this.sandbox = sinon.sandbox.create();
            this.sandbox.spy(testRunner, "create");
            this.sandbox.stub(testRunner, "runSuite");
            this.context = { tests: [{}] };
        },

        tearDown: function () {
            this.sandbox.restore();
        },

        "aborts if no test contexts": function () {
            autoRun.run([]);

            assert(!testRunner.create.called);
        },

        "creates runner with provided runner": function () {
            autoRun.run([this.context], {
                reporter: "xml",
                filters: ["should"],
                color: true,
                bright: true,
                timeout: 10,
                failOnNoAssertions: false
            });

            assert.match(testRunner.create.args[0][0], {
                reporter: "xml",
                filters: ["should"],
                color: true,
                bright: true,
                timeout: 10,
                failOnNoAssertions: false
            });
        },

        "creates runner with runtime": function () {
            var reporter = typeof document === "undefined" ? reporters.brief : reporters.html;

            this.sandbox.spy(reporter, "create");
            autoRun.run([this.context], { color: true, bright: false });

            assert.isString(testRunner.create.args[0][0].runtime);
        },

        "uses specified reporter": function () {
            var reporter = typeof document === "undefined" ? reporters.xml : reporters.html;
            this.sandbox.spy(reporter, "create");
            autoRun.run([this.context], { reporter: "xml" });

            assert(reporter.create.calledOnce);
        },

        "uses custom reporter": function () {
            if (typeof document !== "undefined") { return; }
            var reporter = { create: sinon.stub().returns({ listen: sinon.spy() }) };

            assert.exception(function () {
                autoRun.run([this.context], { reporter: "mod" });
            });
        },

        "initializes reporter with options": function () {
            var reporter = typeof document === "undefined" ? reporters.brief : reporters.html;

            this.sandbox.spy(reporter, "create");
            autoRun.run([this.context], {
                timeout: 1000,
                failOnNoAssertions: true,
                color: true
            });

            assert.match(reporter.create.args[0][0], {
                timeout: 1000,
                failOnNoAssertions: true,
                color: true
            });
        },

        "parses contexts": function () {
            var tests = [{ tests: [{ id: 1 }] }, { tests: [{ id: 2 }] }];
            var contexts = [{ parse: sinon.stub().returns(tests[0]) },
                            { parse: sinon.stub().returns(tests[1]) }];
            autoRun.run(contexts);

            var actual = testRunner.runSuite.args[0][0];
            assert.match(tests[0], actual[0]);
            assert.match(tests[1], actual[1]);
        },

        "filters contexts": function () {
            var context = testCase("Some tests", {
                "test #1": function () {},
                "test #2": function () {}
            });

            autoRun.run([context], {
                filters: ["#1"]
            });

            assert.equals(testRunner.runSuite.args[0][0][0].tests.length, 1);
        },

        "skips contexts where all tests are filtered out": function () {
            var context = testCase("Some tests", {
                "test #1": function () {},
                "test #2": function () {}
            });

            autoRun.run([context], {
                filters: ["non-existent"]
            });

            assert.equals(testRunner.runSuite.args[0][0].length, 0);
        },

        "does not skip contexts if tests are filtered but not sub-contexts": function () {
            var context = testCase("Some tests", {
                "test #1": function () {},
                "test #2": function () {},
                "something": { "testIt": function () {} }
            });

            autoRun.run([context], {
                filters: ["something"]
            });

            assert.equals(testRunner.runSuite.args[0][0].length, 1);
        }
    });
});
