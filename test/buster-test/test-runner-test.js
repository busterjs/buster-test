if (typeof require != "undefined") {
    var testCase = require("buster-util").testCase;
    var sys = require("sys");
    var sinon = require("sinon");
    var sys = require("sys"); 

    var buster = {
        assert: require("buster-assert"),
        testCase: require("buster-test/test-case"),
        testRunner: require("buster-test/test-runner"),
        util: require("buster-util")
    };
}

testCase("TestRunnerRunTest", {
    setUp: function () {
        this.runner = buster.util.create(buster.testRunner);
    },

    "should run single test function": function () {
        var test = sinon.spy();
        var context = buster.testCase("Test", { test: test });

        this.runner.run(context);

        buster.assert(test.calledOnce);
        buster.assert(test.calledOn(context.testCase));
    },

    "should not throw if test throws": function () {
        var test = sinon.stub().throws();
        var context = buster.testCase("Test", { test: test });
        var runner = this.runner;

        buster.assert.noException(function () {
            runner.run(context);
        });
    },

    "should call setUp on test case object": function () {
        var setUp = sinon.spy();
        var context = buster.testCase("Test", { setUp: setUp, test: function () {} });

        this.runner.run(context);

        buster.assert(setUp.calledOnce);
        buster.assert(setUp.calledOn(context.testCase));
    },

    "should call setUp before test": function () {
        var test = sinon.spy();
        var setUp = sinon.spy();
        var context = buster.testCase("Test", { setUp: setUp, test: test });

        this.runner.run(context);

        buster.assert(setUp.calledBefore(test));
    },

    "should not throw if setUp fails": function () {
        var test = sinon.spy();
        var setUp = sinon.stub().throws();
        var context = buster.testCase("Test", { setUp: setUp, test: test });
        var runner = this.runner;

        buster.assert.noException(function () {
            runner.run(context);
        });
    },

    "should not call test if setUp throws": function () {
        var test = sinon.spy();
        var setUp = sinon.stub().throws();
        var context = buster.testCase("Test", { setUp: setUp, test: test });

        this.runner.run(context);

        buster.assert(!test.called);
    },

    "should call tearDown on test case object": function () {
        var test = sinon.spy();
        var tearDown = sinon.spy();
        var context = buster.testCase("Test", { tearDown: tearDown, test: test });

        this.runner.run(context);

        buster.assert(tearDown.calledOnce);
        buster.assert(tearDown.calledOn(context.testCase));
    },

    "should call tearDown after test": function () {
        var test = sinon.spy();
        var tearDown = sinon.spy();
        var context = buster.testCase("Test", { tearDown: tearDown, test: test });

        this.runner.run(context);

        buster.assert(tearDown.calledAfter(test));
    },

    "should not throw if tearDown throws": function () {
        var test = sinon.spy();
        var tearDown = sinon.stub().throws();
        var context = buster.testCase("Test", { tearDown: tearDown, test: test });
        var runner = this.runner;

        buster.assert.noException(function () {
            runner.run(context);
        });
    },

    "should call tearDown if setUp throws": function () {
        var test = sinon.spy();
        var setUp = sinon.stub().throws();
        var tearDown = sinon.spy();
        var context = buster.testCase("Test", {
            setUp: setUp, tearDown: tearDown, test: test
        });


        this.runner.run(context);

        buster.assert(tearDown.calledOnce);
    },

    "should call tearDown if test throws": function () {
        var test = sinon.stub().throws();
        var setUp = sinon.spy();
        var tearDown = sinon.spy();
        var context = buster.testCase("Test", {
            setUp: setUp, tearDown: tearDown, test: test
        });

        this.runner.run(context);

        buster.assert(tearDown.calledOnce);
    },

    "should run all tests": function () {
        var tests = [sinon.spy(), sinon.spy(), sinon.spy()];

        var context = buster.testCase("Test", {
            test1: tests[0], test2: tests[1], test3: tests[2]
        });

        this.runner.run(context);

        buster.assert(tests[0].calledOnce);
        buster.assert(tests[1].calledOnce);
        buster.assert(tests[2].calledOnce);
    },

    "should run all tests even if one fails": function () {
        var tests = [sinon.spy(), sinon.stub().throws(), sinon.spy()];

        var context = buster.testCase("Test", {
            test1: tests[0], test2: tests[1], test3: tests[2]
        });

        this.runner.run(context);

        buster.assert(tests[0].calledOnce);
        buster.assert(tests[1].calledOnce);
        buster.assert(tests[2].calledOnce);
    },

    "should run setUp once for each test": function () {
        var setUp = sinon.spy();
        var tests = [sinon.spy(), sinon.spy(), sinon.spy()];

        var context = buster.testCase("Test", {
            setUp: setUp,
            test1: tests[0], test2: tests[1], test3: tests[2]
        });

        this.runner.run(context);

        buster.assert(setUp.calledThrice);
        buster.assert(setUp.calledBefore(tests[0]));
        buster.assert(setUp.calledAfter(tests[1]));
        buster.assert(!setUp.calledAfter(tests[2]));
    },

    "should run tearDown once for each test": function () {
        var tearDown = sinon.spy();
        var tests = [sinon.spy(), sinon.spy(), sinon.spy()];

        var context = buster.testCase("Test", {
            tearDown: tearDown,
            test1: tests[0], test2: tests[1], test3: tests[2]
        });

        this.runner.run(context);

        buster.assert(tearDown.calledThrice);
        buster.assert(!tearDown.calledBefore(tests[0]));
        buster.assert(tearDown.calledAfter(tests[0]));
        buster.assert(tearDown.calledAfter(tests[2]));
    },

    "should run tests in sub context": function () {
        var test = sinon.spy();
        var context = buster.testCase("Test", { "context": { test1: test } });

        this.runner.run(context);

        buster.assert(test.calledOnce);
    },

    "should run tests in all sub contexts": function () {
        var tests = [sinon.spy(), sinon.spy()];

        var context = buster.testCase("Test", {
            "context": { test1: tests[0] },
            "context2": { test1: tests[1] }
        });

        this.runner.run(context);

        buster.assert(tests[0].calledOnce);
        buster.assert(tests[1].calledOnce);
    },

    "should run sub context setUp for test in sub context": function () {
        var setUp = sinon.spy();
        var test = sinon.spy();

        var context = buster.testCase("Test", {
            "context": { setUp: setUp, test1: test }
        });

        context.contexts()[0].testCase.id = 42;

        this.runner.run(context);

        buster.assert(setUp.calledOnce);
        buster.assert(setUp.calledOn(context.contexts()[0].testCase));
    },

    "should run parent setUp prior to local setUp": function () {
        var setUps = [sinon.spy(), sinon.spy()];
        var test = sinon.spy();

        var context = buster.testCase("Test", {
            setUp: setUps[0],
            "context": { setUp: setUps[1], test1: test }
        });

        this.runner.run(context);

        buster.assert(setUps[0].calledOnce);
        buster.assert(setUps[0].calledOnce);
        buster.assert(setUps[1].calledOnce);
        buster.assert(setUps[0].calledBefore(setUps[1]));
    },

    "should run parent setUp on local test case object": function () {
        var setUp = sinon.spy();
        var test = sinon.spy();

        var context = buster.testCase("Test", {
            setUp: setUp,
            "context": { test1: test }
        });

        this.runner.run(context);

        buster.assert(setUp.calledOn(context.contexts()[0].testCase));
    },

    "should stop running setUps if one fails": function () {
        var setUps = [sinon.stub().throws(), sinon.spy()];
        var test = sinon.spy();

        var context = buster.testCase("Test", {
            setUp: setUps[0],
            "context": { setUp: setUps[1], test1: test }
        });

        this.runner.run(context);

        buster.assert(!setUps[1].called);
    },

    "should run sub context tearDown for test in sub context": function () {
        var tearDown = sinon.spy();
        var test = sinon.spy();

        var context = buster.testCase("Test", {
            "context": { tearDown: tearDown, test1: test }
        });

        context.contexts()[0].testCase.id = 42;

        this.runner.run(context);

        buster.assert(tearDown.calledOnce);
        buster.assert(tearDown.calledOn(context.contexts()[0].testCase));
    },

    "should run parent tearDown after local tearDown": function () {
        var tearDowns = [sinon.spy(), sinon.spy()];
        var test = sinon.spy();

        var context = buster.testCase("Test", {
            tearDown: tearDowns[0],
            "context": { tearDown: tearDowns[1], test1: test }
        });

        this.runner.run(context);

        buster.assert(tearDowns[0].calledOnce);
        buster.assert(tearDowns[0].calledOnce);
        buster.assert(tearDowns[1].calledOnce);
        buster.assert(tearDowns[0].calledAfter(tearDowns[1]));
    },

    "should run parent tearDown on local test case object": function () {
        var tearDown = sinon.spy();
        var test = sinon.spy();

        var context = buster.testCase("Test", {
            tearDown: tearDown,
            "context": { test1: test }
        });

        this.runner.run(context);

        buster.assert(tearDown.calledOn(context.contexts()[0].testCase));
    },

    "should not stop running tearDowns if one fails": function () {
        var tearDowns = [sinon.spy(), sinon.stub().throws()];
        var test = sinon.spy();

        var context = buster.testCase("Test", {
            tearDown: tearDowns[0],
            "context": { tearDown: tearDowns[1], test1: test }
        });

        this.runner.run(context);

        buster.assert(tearDowns[1].called);
    }
});

// testCase("TestRunnerEventsTest", {
//     setUp: function () {
//         this.context = buster.testCase("Test", {
            
//         });
//     }
// });
