if (typeof require != "undefined") {
    var testCase = require("buster-util").testCase;
    var sys = require("sys");
    var sinon = require("sinon");

    var buster = {
        assert: require("buster-assert"),
        testCase: require("../../../lib/buster-test/test-case"),
        testRunner: require("../../../lib/buster-test/test-runner"),
        util: require("buster-util"),
        promise: require("../../../lib/buster-test/promise")
    };
}

Function.prototype.bind = function (obj) {
    var fn = this;

    return function () {
        return fn.call(obj);
    };
};

testCase("TestRunnerCreateTest", {
    "should emit newly created object to callback": function () {
        buster.testRunner.onCreate = sinon.spy();
        var runner = buster.testRunner.create();

        buster.assert(buster.testRunner.onCreate.calledOnce);
        buster.assert(buster.testRunner.onCreate.calledWith(runner));
    }
});

testCase("TestRunnerRunTest", {
    setUp: function () {
        this.runner = buster.testRunner.create();
    },

    "should return promise": function () {
        var promise = this.runner.run();

        buster.assert.isObject(promise);
        buster.assert.isFunction(promise.then);
    },

    "should reject without context": function () {
        var rejection = sinon.spy();
        this.runner.run().then(function () {}, rejection);

        buster.assert(rejection.called);
    },

    "should run single test function": function (test) {
        var testFn = sinon.spy();
        var context = buster.testCase("Test", { test: testFn });

        this.runner.run(context).then(function () {
            buster.assert(testFn.calledOnce);
            buster.assert(context.testCase.isPrototypeOf(testFn.thisValues[0]));
            test.end();
        });
    },

    "should run test with this object containing a logger": function (test) {
        var testFn = sinon.spy();
        var context = buster.testCase("Test", { test: testFn });

        this.runner.run(context).then(function () {
            buster.assert.isObject(testFn.thisValues[0].console);
            buster.assert.isFunction(testFn.thisValues[0].console.log);
            test.end();
        });
    },

    "should run test asynchronously": function (test) {
        var testFn = sinon.spy();
        var context = buster.testCase("Test", { test: testFn });

        this.runner.run(context).then(function () {
            buster.assert(testFn.calledOnce);
            test.end();
        });

        buster.assert(!testFn.called);
    },

    "should not reject if test throws": function (test) {
        var context = buster.testCase("Test", { test: sinon.stub().throws() });

        this.runner.run(context).then(function () {
            test.end();
        }, function () {
            buster.assert.fail();
        });
    },

    "should call setUp on same test case object as test": function (test) {
        var setUp = sinon.spy();
        var testFn = sinon.spy();
        var context = buster.testCase("Test", { setUp: setUp, test: testFn });

        this.runner.run(context).then(function () {
            buster.assert(setUp.calledOnce);
            buster.assert.same(setUp.thisValues[0], testFn.thisValues[0]);
            test.end();
        });
    },

    "should call setUp before test": function (test) {
        var testFn = sinon.spy();
        var setUp = sinon.spy();
        var context = buster.testCase("Test", { setUp: setUp, test: testFn });

        this.runner.run(context).then(function () {
            buster.assert(setUp.calledBefore(testFn));
            test.end();
        });
    },

    "should not call test until setUp resolves": function (test) {
        var promise = buster.promise.create();
        var testFn = sinon.spy();

        var setUp = sinon.spy(function () {
            buster.assert(!testFn.called);
            return promise;
        });

        var context = buster.testCase("Test", { setUp: setUp, test: testFn });

        this.runner.run(context).then(function () {
            buster.assert(testFn.calledOnce);
            test.end();
        });

        promise.resolve();
    },

    "should not reject if setUp fails": function (test) {
        var setUp = sinon.stub().throws();
        var context = buster.testCase("Test", { setUp: setUp, test: sinon.spy() });

        this.runner.run(context).then(function () {
            test.end();
        }, function () {
            buster.assert.fail();
        });
    },

    "should not call test if setUp throws": function (test) {
        var testFn = sinon.spy();
        var setUp = sinon.stub().throws();
        var context = buster.testCase("Test", { setUp: setUp, test: testFn });

        this.runner.run(context).then(function () {
            buster.assert(!testFn.called);
            test.end();
        });
    },

    "should not call test if setUp rejects": function (test) {
        var promise = buster.promise.create();
        var testFn = sinon.spy();
        var setUp = sinon.stub().returns(promise);
        var context = buster.testCase("Test", { setUp: setUp, test: testFn });

        this.runner.run(context).then(function () {
            buster.assert(!testFn.called);
            test.end();
        });

        promise.reject();
    },

    "should call tearDown on same test case object as test": function (test) {
        var testFn = sinon.spy();
        var tearDown = sinon.spy();
        var context = buster.testCase("Test", { tearDown: tearDown, test: testFn });

        this.runner.run(context).then(function () {
            buster.assert(tearDown.calledOnce);
            buster.assert.same(tearDown.thisValues[0], testFn.thisValues[0]);
            test.end();
        });
    },

    "should call tearDown after test": function (test) {
        var testFn = sinon.spy();
        var tearDown = sinon.spy();
        var context = buster.testCase("Test", { tearDown: tearDown, test: testFn });

        this.runner.run(context).then(function () {
            buster.assert(tearDown.calledAfter(testFn));
            test.end();
        });
    },

    "should not resolve until tearDown resolves": function (test) {
        var promise = buster.promise.create();
        var tearDown = sinon.stub().returns(promise);
        var context = buster.testCase("Test", {
            tearDown: tearDown, test: sinon.spy()
        });

        var complete = sinon.spy(function () {
            buster.util.nextTick(function () {
                test.end();
            });
        });

        this.runner.run(context).then(complete);

        buster.util.nextTick(function () {
            buster.assert(!complete.called);
            promise.resolve();
        });
    },

    "should not throw if tearDown throws": function (test) {
        var testFn = sinon.spy();
        var tearDown = sinon.stub().throws();
        var context = buster.testCase("Test", { tearDown: tearDown, test: testFn });

        this.runner.run(context).then(function () {
            test.end();
        }, function () {
            buster.assert.fail();
        });
    },

    "should call tearDown if setUp throws": function (test) {
        var tearDown = sinon.spy();

        var context = buster.testCase("Test", {
            setUp: sinon.stub().throws(), tearDown: tearDown, test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            buster.assert(tearDown.calledOnce);
            test.end();
        });
    },

    "should call tearDown if test throws": function (test) {
        var tearDown = sinon.spy();

        var context = buster.testCase("Test", {
            setUp: sinon.spy(), tearDown: tearDown, test: sinon.stub().throws()
        });

        this.runner.run(context).then(function () {
            buster.assert(tearDown.calledOnce);
            test.end();
        });
    },

    "should run all tests": function (test) {
        var tests = [sinon.spy(), sinon.spy(), sinon.spy()];

        var context = buster.testCase("Test", {
            test1: tests[0], test2: tests[1], test3: tests[2]
        });

        this.runner.run(context).then(function () {
            buster.assert(tests[0].calledOnce);
            buster.assert(tests[1].calledOnce);
            buster.assert(tests[2].calledOnce);
            test.end();
        });
    },

    "should run all tests even if one fails": function (test) {
        var tests = [sinon.spy(), sinon.stub().throws(), sinon.spy()];

        var context = buster.testCase("Test", {
            test1: tests[0], test2: tests[1], test3: tests[2]
        });

        this.runner.run(context).then(function () {
            buster.assert(tests[0].calledOnce);
            buster.assert(tests[1].calledOnce);
            buster.assert(tests[2].calledOnce);
            test.end();
        });
    },

    "should run setUp once for each test": function (test) {
        var setUp = sinon.spy();
        var tests = [sinon.spy(), sinon.spy(), sinon.spy()];

        var context = buster.testCase("Test", {
            setUp: setUp,
            test1: tests[0], test2: tests[1], test3: tests[2]
        });

        this.runner.run(context).then(function () {
            buster.assert(setUp.calledThrice);
            buster.assert(setUp.calledBefore(tests[0]));
            buster.assert(setUp.calledAfter(tests[1]));
            buster.assert(!setUp.calledAfter(tests[2]));
            test.end();
        });
    },

    "should run tearDown once for each test": function (test) {
        var tearDown = sinon.spy();
        var tests = [sinon.spy(), sinon.spy(), sinon.spy()];

        var context = buster.testCase("Test", {
            tearDown: tearDown,
            test1: tests[0], test2: tests[1], test3: tests[2]
        });

        this.runner.run(context).then(function () {
            buster.assert(tearDown.calledThrice);
            buster.assert(!tearDown.calledBefore(tests[0]));
            buster.assert(tearDown.calledAfter(tests[0]));
            buster.assert(tearDown.calledAfter(tests[2]));
            test.end();
        });
    },

    "should run tests in sub context": function (test) {
        var testFn = sinon.spy();
        var context = buster.testCase("Test", { "context": { test1: testFn } });

        this.runner.run(context).then(function () {
            buster.assert(testFn.calledOnce);
            test.end();
        });
    },

    "should run tests in all sub contexts": function (test) {
        var tests = [sinon.spy(), sinon.spy()];

        var context = buster.testCase("Test", {
            "context": { test1: tests[0] },
            "context2": { test1: tests[1] }
        });

        this.runner.run(context).then(function () {
            buster.assert(tests[0].calledOnce);
            buster.assert(tests[1].calledOnce);
            test.end();
        });
    },

    "should run sub context setUp for test in sub context": function (test) {
        var setUp = sinon.spy();
        var testFn = sinon.spy();

        var context = buster.testCase("Test", {
            "context": { setUp: setUp, test1: testFn }
        });

        context.contexts()[0].testCase.id = 42;

        this.runner.run(context).then(function () {
            buster.assert(setUp.calledOnce);
            buster.assert.same(setUp.thisValues[0], testFn.thisValues[0]);
            test.end();
        });
    },

    "should run parent setUp prior to local setUp": function (test) {
        var setUps = [sinon.spy(), sinon.spy()];
        var testFn = sinon.spy();

        var context = buster.testCase("Test", {
            setUp: setUps[0],
            "context": { setUp: setUps[1], test1: testFn }
        });

        this.runner.run(context).then(function () {
            buster.assert(setUps[0].calledOnce);
            buster.assert(setUps[1].calledOnce);
            buster.assert(setUps[0].calledBefore(setUps[1]));
            test.end();
        });
    },

    "should wait for setUp promises to resolve": function (test) {
        var promises = [buster.promise.create(), buster.promise.create()];
        sinon.spy(promises[0], "resolve");
        sinon.spy(promises[1], "resolve");

        var setUps = [sinon.spy(function () {
            buster.util.nextTick(function () {
                promises[0].resolve();
            });

            return promises[0];
        }), sinon.spy(function () {
            buster.util.nextTick(function () {
                promises[1].resolve();
            });

            return promises[1];
        })];

        var testFn = sinon.spy();

        var context = buster.testCase("Test", {
            setUp: setUps[0],
            "context": { setUp: setUps[1], test1: testFn }
        });

        this.runner.run(context).then(function () {
            sinon.assert.callOrder(setUps[0], promises[0].resolve,
                                   setUps[1], promises[1].resolve,
                                   testFn);
            test.end();
        });
    },

    "should run parent setUp on local test case object": function (test) {
        var setUp = sinon.spy();
        var testFn = sinon.spy();

        var context = buster.testCase("Test", {
            setUp: setUp,
            "context": { test1: testFn }
        });

        this.runner.run(context).then(function () {
            buster.assert.same(setUp.thisValues[0], testFn.thisValues[0]);
            test.end();
        });
    },

    "should stop running setUps if one fails": function (test) {
        var setUps = [sinon.stub().throws(), sinon.spy()];

        var context = buster.testCase("Test", {
            setUp: setUps[0],
            "context": { setUp: setUps[1], test1: sinon.spy() }
        });

        this.runner.run(context).then(function () {
            buster.assert(!setUps[1].called);
            test.end();
        });
    },

    "should run sub context tearDown for test in sub context": function (test) {
        var tearDown = sinon.spy();
        var testFn = sinon.spy();

        var context = buster.testCase("Test", {
            "context": { tearDown: tearDown, test1: testFn }
        });

        this.runner.run(context).then(function () {
            buster.assert(tearDown.calledOnce);
            buster.assert.same(tearDown.thisValues[0], testFn.thisValues[0]);
            test.end();
        });
    },

    "should run parent tearDown after local tearDown": function (test) {
        var tearDowns = [sinon.spy(), sinon.spy()];

        var context = buster.testCase("Test", {
            tearDown: tearDowns[0],
            "context": { tearDown: tearDowns[1], test1: sinon.spy() }
        });

        this.runner.run(context).then(function () {
            buster.assert(tearDowns[0].calledOnce);
            buster.assert(tearDowns[0].calledOnce);
            buster.assert(tearDowns[1].calledOnce);
            buster.assert(tearDowns[0].calledAfter(tearDowns[1]));
            test.end();
        });
    },

    "should run parent tearDown on local test case object": function (test) {
        var tearDown = sinon.spy();
        var testFn = sinon.spy();

        var context = buster.testCase("Test", {
            tearDown: tearDown,
            "context": { test1: testFn }
        });

        this.runner.run(context).then(function () {
            buster.assert.same(tearDown.thisValues[0], testFn.thisValues[0]);
            test.end();
        });
    },

    "should not stop running tearDowns if one fails": function (test) {
        var tearDowns = [sinon.spy(), sinon.stub().throws()];

        var context = buster.testCase("Test", {
            tearDown: tearDowns[0],
            "context": { tearDown: tearDowns[1], test1: sinon.spy() }
        });

        this.runner.run(context).then(function () {
            buster.assert(tearDowns[1].called);
            test.end();
        });
    },

    "should wait for tearDown promises to resolve": function (test) {
        var promises = [buster.promise.create(), buster.promise.create()];
        sinon.spy(promises[0], "resolve");
        sinon.spy(promises[1], "resolve");

        var tearDowns = [sinon.spy(function () {
            buster.util.nextTick(function () {
                promises[0].resolve();
            });

            return promises[0];
        }), sinon.spy(function () {
            buster.util.nextTick(function () {
                promises[1].resolve();
            });

            return promises[1];
        })];

        var testFn = sinon.spy();

        var context = buster.testCase("Test", {
            tearDown: tearDowns[0],
            "context": { tearDown: tearDowns[1], test1: testFn }
        });

        this.runner.run(context).then(function () {
            sinon.assert.callOrder(testFn,
                                   tearDowns[1], promises[1].resolve,
                                   tearDowns[0], promises[0].resolve);
            test.end();
        });
    }
});

testCase("TestRunnerRunSuiteTest", {
    setUp: function () {
        this.runner = buster.testRunner.create();
    },

    "should run all contexts": function (test) {
        var tests = [sinon.spy(), sinon.spy()];

        var contexts = [buster.testCase("Test", {
            test1: tests[0],
        }), buster.testCase("Test other", {
            test2: tests[1]
        })];

        this.runner.runSuite(contexts).then(function () {
            buster.assert(tests[0].calledOnce);
            buster.assert(tests[1].calledOnce);
            buster.assert(tests[1].calledAfter(tests[0]));
            test.end();
        });
    }
});

function runnerEventsSetUp() {
    this.runner = buster.testRunner.create();
    this.runner.failOnNoAssertions = false;
    this.assertionError = new Error("Oh, crap");
    this.assertionError.name = "AssertionError";

    this.listeners = {
        "suite:start": sinon.spy(),
        "context:start": sinon.spy(),
        "test:setUp": sinon.spy(),
        "test:start": sinon.spy(),
        "test:tearDown": sinon.spy(),
        "test:failure": sinon.spy(),
        "test:error": sinon.spy(),
        "test:success": sinon.spy(),
        "context:end": sinon.spy(),
        "suite:end": sinon.spy()
    };

    this.runner.on("suite:start", this.listeners["suite:start"]);
    this.runner.on("context:start", this.listeners["context:start"]);
    this.runner.on("test:setUp", this.listeners["test:setUp"]);
    this.runner.on("test:start", this.listeners["test:start"]);
    this.runner.on("test:tearDown", this.listeners["test:tearDown"]);
    this.runner.on("test:success", this.listeners["test:success"]);
    this.runner.on("test:failure", this.listeners["test:failure"]);
    this.runner.on("test:error", this.listeners["test:error"]);
    this.runner.on("context:end", this.listeners["context:end"]);
    this.runner.on("suite:end", this.listeners["suite:end"]);

    this.myCase = buster.testCase("My case", {});
    this.otherCase = buster.testCase("Other", {});
    this.simpleCase = buster.testCase("One test", {
        setUp: sinon.spy(),
        tearDown: sinon.spy(),
        testIt: sinon.spy()
    });
}

testCase("TestRunnerEventsTest", {
    setUp: runnerEventsSetUp,

    "should emit event when starting suite": function (test) {
        this.runner.runSuite([this.myCase]).then(function () {
            buster.assert(this.listeners["suite:start"].calledOnce);
            test.end();
        }.bind(this));
    },

    "should emit event when starting suite only once": function (test) {
        this.runner.runSuite([this.myCase, this.otherCase]).then(function () {
            buster.assert(this.listeners["suite:start"].calledOnce);
            test.end();
        }.bind(this));
    },

    "should emit end suite event after context end": function (test) {
        this.runner.runSuite([this.myCase]).then(function () {
            buster.assert(this.listeners["suite:end"].calledOnce);
            buster.assert(this.listeners["suite:end"].calledAfter(this.listeners["context:end"]));
            test.end();
        }.bind(this));
    },

    "should emit event when starting context": function (test) {
        this.runner.run(this.myCase).then(function () {
            buster.assert(this.listeners["context:start"].calledOnce);
            test.end();
        }.bind(this));
    },

    "should emit end context event after start context": function (test) {
        this.runner.run(this.myCase).then(function () {
            buster.assert(this.listeners["context:end"].calledOnce);
            buster.assert(this.listeners["context:end"].calledAfter(this.listeners["context:start"]));
            test.end();
        }.bind(this));
    },

    "should emit event when starting test": function (test) {
        this.runner.run(this.simpleCase).then(function () {
            buster.assert(this.listeners["test:start"].calledOnce);
            test.end();
        }.bind(this));
    },

    "should emit setUp event before test:start": function (test) {
        this.runner.run(this.simpleCase).then(function () {
            buster.assert(this.listeners["test:setUp"].calledOnce);
            buster.assert(this.listeners["test:setUp"].calledBefore(this.listeners["test:start"]));
            test.end();
        }.bind(this));
    },

    "should emit tearDown event after test:start": function (test) {
        this.runner.run(this.simpleCase).then(function () {
            buster.assert(this.listeners["test:tearDown"].calledOnce);
            buster.assert(this.listeners["test:tearDown"].calledAfter(this.listeners["test:start"]));
            test.end();
        }.bind(this));
    },

    "should emit test:success when test passes": function (test) {
        this.runner.run(this.simpleCase).then(function () {
            buster.assert(this.listeners["test:success"].calledOnce);
            test.end();
        }.bind(this));
    },

    "should not emit test:success if setUp throws": function (test) {
        var context = buster.testCase("My case", {
            setUp: sinon.stub().throws(), testIt: sinon.spy()
        });

        this.runner.run(context).then(function () {
            buster.assert(!this.listeners["test:success"].called);
            test.end();
        }.bind(this));
    },

    "should not emit test:success if test throws": function (test) {
        var context = buster.testCase("My case", {
            setUp: sinon.spy(), testIt: sinon.stub().throws()
        });

        this.runner.run(context).then(function () {
            buster.assert(!this.listeners["test:success"].called);
            test.end();
        }.bind(this));
    },

    "should not emit test:success if tearDown throws": function (test) {
        var context = buster.testCase("My case", {
            tearDown: sinon.stub().throws(), testIt: sinon.spy()
        });

        this.runner.run(context).then(function () {
            buster.assert(!this.listeners["test:success"].called);
            test.end();
        }.bind(this));
    },

    "should emit test:fail when test throws assertion error": function (test) {
        var testFn = sinon.stub().throws(this.assertionError);
        var context = buster.testCase("My case", { testIt: testFn });

        this.runner.run(context).then(function () {
            buster.assert(this.listeners["test:failure"].calledOnce);
            test.end();
        }.bind(this));
    },

    "should emit test:fail if setUp throws assertion error": function (test) {
        var context = buster.testCase("My case", {
            setUp: sinon.stub().throws(this.assertionError), testIt: sinon.spy()
        });

        this.runner.run(context).then(function () {
            buster.assert(this.listeners["test:failure"].calledOnce);
            test.end();
        }.bind(this));
    },

    "should not emit test:fail if test passes": function (test) {
        var context = buster.testCase("My case", {
            setUp: sinon.spy(),
            testIt: sinon.stub()
        });

        this.runner.run(context).then(function () {
            buster.assert(!this.listeners["test:failure"].called);
            test.end();
        }.bind(this));
    },

    "should emit test:fail if tearDown throws assertion error": function (test) {
        var context = buster.testCase("My case", {
            tearDown: sinon.stub().throws(this.assertionError), testIt: sinon.spy()
        });

        this.runner.run(context).then(function () {
            buster.assert(this.listeners["test:failure"].calledOnce);
            test.end();
        }.bind(this));
    },

    "should emit test:error when test throws": function (test) {
        var testFn = sinon.stub().throws(new Error("Oops"));
        var context = buster.testCase("My case", { testIt: testFn });

        this.runner.run(context).then(function () {
            buster.assert(this.listeners["test:error"].calledOnce);
            test.end();
        }.bind(this));
    },

    "should emit test:error if setUp throws": function (test) {
        var context = buster.testCase("My case", {
            setUp: sinon.stub().throws(), testIt: sinon.spy()
        });

        this.runner.run(context).then(function () {
            buster.assert(this.listeners["test:error"].calledOnce);
            buster.assert(!this.listeners["test:failure"].called);
            test.end();
        }.bind(this));
    },

    "should not emit test:error if test passes": function (test) {
        var context = buster.testCase("My case", {
            setUp: sinon.spy(), testIt: sinon.stub()
        });

        this.runner.run(context).then(function () {
            buster.assert(!this.listeners["test:error"].called);
            test.end();
        }.bind(this));
    },

    "should emit test:error if tearDown throws assertion error": function (test) {
        var context = buster.testCase("My case", {
            tearDown: sinon.stub().throws(), testIt: sinon.spy()
        });

        this.runner.run(context).then(function () {
            buster.assert(this.listeners["test:error"].calledOnce);
            buster.assert(!this.listeners["test:failure"].called);
            test.end();
        }.bind(this));
    }
});

testCase("TestRunnerEventDataTest", {
    setUp: runnerEventsSetUp,

    "context:start event data": function (test) {
        var context = buster.testCase("My case", {});

        this.runner.run(context).then(function () {
            var args = this.listeners["context:start"].args[0];
            buster.assert.equals(args, [context]);
            test.end();
        }.bind(this));
    },

    "context:end event data": function (test) {
        var context = buster.testCase("My case", {});

        this.runner.run(context).then(function () {
            var args = this.listeners["context:end"].args[0];
            buster.assert.equals(args, [context]);
            test.end();
        }.bind(this));
    },

    "test:setUp event data": function (test) {
        var context = buster.testCase("My case", {
            setUp: function () {}, test1: function () {}
        });

        this.runner.run(context).then(function () {
            var args = this.listeners["test:setUp"].args;
            buster.assert.equals("test1", args[0][0].name);
            buster.assert(context.testCase.isPrototypeOf(args[0][0].testCase));
            test.end();
        }.bind(this));
    },

    "test:tearDown event data": function (test) {
        var context = buster.testCase("My case", {
            setUp: function () {}, test1: function () {}
        });

        this.runner.run(context).then(function () {
            var args = this.listeners["test:tearDown"].args;
            buster.assert.equals("test1", args[0][0].name);
            buster.assert(context.testCase.isPrototypeOf(args[0][0].testCase));
            test.end();
        }.bind(this));
    },

    "test:start event data": function (test) {
        var context = buster.testCase("My case", {
            setUp: function () {}, test1: function () {}
        });

        this.runner.run(context).then(function () {
            var args = this.listeners["test:start"].args;
            buster.assert.equals("test1", args[0][0].name);
            buster.assert(context.testCase.isPrototypeOf(args[0][0].testCase));
            test.end();
        }.bind(this));
    },

    "test:error event data": function (test) {
        var context = buster.testCase("My case", {
            setUp: function () {}, test1: sinon.stub().throws("TypeError")
        });

        this.runner.run(context).then(function () {
            var args = this.listeners["test:error"].args[0];

            buster.assert.equals("test1", args[0].name);
            buster.assert.equals("TypeError", args[0].error.name);
            buster.assert.equals("", args[0].error.message);
            buster.assert.match(/\.js/, args[0].error.stack);
            test.end();
        }.bind(this));
    },

    "test:fail event data": function (test) {
        var context = buster.testCase("My case", {
            setUp: function () {}, test1: sinon.stub().throws("AssertionError")
        });

        this.runner.run(context).then(function () {
            var args = this.listeners["test:failure"].args[0];

            buster.assert.equals("test1", args[0].name);
            buster.assert.equals("AssertionError", args[0].error.name);
            buster.assert.equals("", args[0].error.message);
            buster.assert.match(/\.js/, args[0].error.stack);
            test.end();
        }.bind(this));
    },

    "test:success event data": function (test) {
        var context = buster.testCase("My case", {
            setUp: function () {}, test1: sinon.spy()
        });

        sinon.stub(this.runner, "assertionCount").returns(2);

        this.runner.run(context).then(function () {
            var args = this.listeners["test:success"].args[0];

            buster.assert.equals([{
                name: "test1",
                assertions: 2
            }], args);
            test.end();
        }.bind(this));
    },

    "suite:end event data": function (test) {
        var context = buster.testCase("My case", {
            setUp: function () {},
            test1: sinon.spy(),
            test2: sinon.stub().throws(),
            test3: sinon.spy(),
            test4: sinon.stub().throws("AssertionError"),
            inner: {
                test5: sinon.spy()
            }
        });

        sinon.stub(this.runner, "assertionCount").returns(2);

        this.runner.runSuite([context, context]).then(function () {
            var args = this.listeners["suite:end"].args[0];
            buster.assert.equals(2, args[0].contexts);
            buster.assert.equals(10, args[0].tests);
            buster.assert.equals(2, args[0].errors);
            buster.assert.equals(2, args[0].failures);
            buster.assert.equals(12, args[0].assertions);
            buster.assert.equals(0, args[0].timeouts);
            buster.assert(!args[0].ok);
            test.end();
        }.bind(this));
    }
});

testCase("TestRunnerAssertionCountTest", {
    setUp: function () {
        this.context = buster.testCase("Test + Assertions", {
            test1: function () {}
        });

        this.runner = buster.testRunner.create();
        this.listener = sinon.spy();
        this.runner.on("test:failure", this.listener);
    },

    "should fail test if 0 assertions": function (test) {
        sinon.stub(this.runner, "assertionCount").returns(0);

        this.runner.run(this.context).then(function () {
            buster.assert(this.listener.calledOnce);
            test.end();
        }.bind(this));
    },

    "should not fail test if 1 assertion": function (test) {
        sinon.stub(this.runner, "assertionCount").returns(1);

        this.runner.run(this.context).then(function () {
            buster.assert(!this.listener.called);
            test.end();
        }.bind(this));
    },

    "should configure to not fail test if 0 assertions": function (test) {
        sinon.stub(this.runner, "assertionCount").returns(0);
        this.runner.failOnNoAssertions = false;

        this.runner.run(this.context).then(function () {
            buster.assert(!this.listener.called);
            test.end();
        }.bind(this));
    },

    "should fail for unexpected number of assertions": function (test) {
        sinon.stub(this.runner, "assertionCount").returns(3);

        var context = buster.testCase("Test Assertions", {
            test1: function () {
                this.expectedAssertions = 2;
            }
        });

        this.runner.run(context).then(function () {
            buster.assert(this.listener.calledOnce);
            buster.assert.equals("Expected 2 assertions, ran 3",
                                 this.listener.args[0][0].error.message);
            test.end();
        }.bind(this));
    },

    "should only check expected assertions for tests that explicitly define it": function (test) {
        sinon.stub(this.runner, "assertionCount").returns(3);

        var context = buster.testCase("Test Assertions", {
            test1: function () {
                this.expectedAssertions = 2;
            },

            test2: function () {}
        });

        this.runner.run(context).then(function () {
            buster.assert(this.listener.calledOnce);
            buster.assert.equals("test1", this.listener.args[0][0].name);
            test.end();
        }.bind(this));
    },

    "should clear expected assertions when test fails for other reasons": function (test) {
        sinon.stub(this.runner, "assertionCount").returns(3);
        this.runner.on("test:error", this.listener);

        var context = buster.testCase("Test Assertions", {
            test1: function () {
                this.expectedAssertions = 2;
                throw new Error();
            },

            test2: function () {}
        });

        this.runner.run(context).then(function () {
            buster.assert(this.listener.calledOnce);
            buster.assert.equals("test1", this.listener.args[0][0].name);
            test.end();
        }.bind(this));
    }
});

testCase("TestRunnerAsyncTest", {
    setUp: function () {
        this.runner = buster.testRunner.create();
        this.promise = buster.promise.create();
        this.testFn = sinon.stub().returns(this.promise);
        this.context = buster.testCase("Test", { test: this.testFn });
    },

    "should resolve run when test has resolved": function (test) {
        this.runner.run(this.context).then(function () {
            test.end();
        });

        buster.util.nextTick(function () {
            this.promise.resolve();
        }.bind(this));
    },

    "should emit test:async event": function (test) {
        var listeners = [sinon.spy(), sinon.spy()];
        this.runner.on("test:async", listeners[0]);
        this.runner.on("test:success", listeners[1]);

        this.runner.run(this.context).then(function () {
            buster.assert(listeners[0].calledOnce);
            buster.assert.equals([{ name: "test" }], listeners[0].args[0]);
            buster.assert(listeners[0].calledBefore(listeners[1]));
            test.end();
        });

        this.promise.resolve();
    },

    "should time out after 250ms": function (test) {
        var runnerResolution = sinon.spy();
        var promise = this.promise;
        this.runner.run(this.context).then(runnerResolution);

        setTimeout(function () {
            buster.assert(runnerResolution.called);
            buster.assert(!promise.resolve.called);
            test.end();
        }, 265);
    },

    "should time out after custom timeout": function (test) {
        var runnerResolution = sinon.spy();
        this.runner.timeout = 100;
        this.runner.run(this.context).then(runnerResolution);

        setTimeout(function () {
            buster.assert(runnerResolution.called);
            test.end();
        }, 130);
    },

    "should emit timeout event": function (test) {
        var listener = sinon.spy();
        this.runner.timeout = 20;
        this.runner.on("test:timeout", listener);

        this.runner.run(this.context).then(function () {
            buster.assert(listener.called);
            buster.assert.equals([{ name: "test" }], listener.args[0]);
            test.end();
        });
    },

    "should not emit test:success event until test has completed": function (test) {
        var listener = sinon.spy();
        this.runner.timeout = 20;
        this.runner.on("test:success", listener);

        this.runner.run(this.context).then(function () {
            buster.assert(listener.calledOnce);
            test.end();
        });

        setTimeout(function () {
            buster.assert(!listener.called);
        }, 20);
    },

    "should error test if it rejects it's returned promise": function (test) {
        var listener = sinon.spy();
        this.runner.timeout = 20;
        this.runner.on("test:error", listener);

        this.runner.run(this.context).then(function () {
            buster.assert(listener.calledOnce);
            buster.assert.equals("Oh no", listener.args[0][0].error.message);
            test.end();
        });

        this.promise.reject(new Error("Oh no"));
    },

    "should fail test if it rejects with an AssertionError": function (test) {
        var listener = sinon.spy();
        this.runner.timeout = 20;
        this.runner.on("test:failure", listener);

        this.runner.run(this.context).then(function () {
            buster.assert(listener.calledOnce);
            buster.assert.equals("Oh no", listener.args[0][0].error.message);
            test.end();
        });

        var error = new Error("Oh no");
        error.name = "AssertionError";
        this.promise.reject(error);
    }
});

testCase("TestRunnerImplicitAsyncTest", {
    setUp: function () {
        this.runner = buster.testRunner.create();
    },

    "should resolve run when test calls passed argument": function (test) {
        var callback, listener = sinon.spy();
        this.runner.on("test:async", listener);

        var context = buster.testCase("Test", {
            test: function (done) {
                callback = done;

                buster.util.nextTick(function () {
                    callback.called = true;
                    callback();
                });
            }
        });

        this.runner.run(context).then(function () {
            buster.assert(listener.called);
            buster.assert.isNotUndefined(callback);
            buster.assert(callback.called);
            test.end();
        });
    },

    "should emit test:success when test calls passed argument": function (test) {
        var listener = sinon.spy();
        this.runner.on("test:success", listener);

        var context = buster.testCase("Test", {
            test: function (done) {
                buster.util.nextTick(function () {
                    done();
                });
            }
        });

        this.runner.run(context).then(function () {
            buster.assert(listener.calledOnce);
            test.end();
        });

        buster.util.nextTick(function () {
            buster.assert(!listener.called);
        });
    },

    "should emit test:failure when test calls passed argument with AssertionError":
    function (test) {
        var listener = sinon.spy();
        this.runner.on("test:failure", listener);

        var context = buster.testCase("Test", {
            test: function (done) {
                buster.util.nextTick(function () {
                    var error = new Error("Oops");
                    error.name = "AssertionError";
                    done(error);
                });
            }
        });

        this.runner.run(context).then(function () {
            buster.assert(listener.calledOnce);
            buster.assert.equals("Oops", listener.args[0][0].error.message);
            test.end();
        });
    },

    "should emit test:error when test calls passed argument with Error":
    function (test) {
        var listener = sinon.spy();
        this.runner.on("test:error", listener);

        var context = buster.testCase("Test", {
            test: function (done) {
                buster.util.nextTick(function () {
                    done(new Error("Oops"));
                });
            }
        });

        this.runner.run(context).then(function () {
            buster.assert(listener.calledOnce);
            buster.assert.equals("Oops", listener.args[0][0].error.message);
            test.end();
        });
    },

    "should include timeouts in suite:end results": function (test) {
        var listener = sinon.spy();
        this.runner.on("suite:end", listener);

        var context = buster.testCase("My case", {
            test1: function (done) {}
        });

        sinon.stub(this.runner, "assertionCount").returns(2);

        this.runner.runSuite([context]).then(function () {
            buster.assert.equals(1, listener.args[0][0].timeouts);
            test.end();
        });
    },

    "should disarm callback when test times out": function (test) {
        var callback;

        var context = buster.testCase("My case", {
            test1: function (done) {
                callback = done;
            }
        });

        sinon.stub(this.runner, "assertionCount").returns(2);

        this.runner.runSuite([context]).then(function () {
            buster.assert.noException(function () {
                callback();
            });

            test.end();
        });
    }
});

testCase("TestRunnerImplicitAsyncSetUpTest", {
    setUp: function () {
        this.runner = buster.testRunner.create();
    },

    "should resolve run when setUp calls passed argument": function (test) {
        var callback;

        var context = buster.testCase("Test", {
            setUp: function (done) {
                callback = done;

                buster.util.nextTick(function () {
                    callback.called = true;
                    callback();
                });
            },

            test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            buster.assert.isNotUndefined(callback);
            buster.assert(callback.called);
            test.end();
        });
    },

    "should emit test:start when setUp calls passed argument": function (test) {
        var listener = sinon.spy();
        this.runner.on("test:start", listener);

        var context = buster.testCase("Test", {
            setUp: function (done) {
                buster.util.nextTick(function () {
                    done();
                });
            },

            test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            buster.assert(listener.calledOnce);
            test.end();
        });

        buster.util.nextTick(function () {
            buster.assert(!listener.called);
        });
    },

    "should emit test:failure when setUp calls passed argument with AssertionError":
    function (test) {
        var listener = sinon.spy();
        this.runner.on("test:failure", listener);

        var context = buster.testCase("Test", {
            setUp: function (done) {
                buster.util.nextTick(function () {
                    var error = new Error("Oops");
                    error.name = "AssertionError";
                    done(error);
                });
            },

            test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            buster.assert(listener.calledOnce);
            buster.assert.equals("Oops", listener.args[0][0].error.message);
            test.end();
        });
    },

    "should emit test:error when setUp calls passed argument with Error":
    function (test) {
        var listener = sinon.spy();
        this.runner.on("test:error", listener);

        var context = buster.testCase("Test", {
            setUp: function (done) {
                buster.util.nextTick(function () {
                    done(new Error("Oops"));
                });
            },

            test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            buster.assert(listener.calledOnce);
            buster.assert.equals("Oops", listener.args[0][0].error.message);
            test.end();
        });
    },

    "should time out async setUp": function (test) {
        var listener = sinon.spy();
        this.runner.on("test:timeout", listener);

        var context = buster.testCase("Test", {
            setUp: function (done) {},
            test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            buster.assert(listener.calledOnce);
            test.end();
        });
    },

    "should emit test:async when setUp is async": function (test) {
        var listener = sinon.spy();
        this.runner.on("test:async", listener);

        var context = buster.testCase("Test", {
            setUp: function (done) { done(); },
            test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            buster.assert(listener.calledOnce);
            test.end();
        });
    },

    "should not emit test:async twice": function (test) {
        var listener = sinon.spy();
        this.runner.on("test:async", listener);

        var context = buster.testCase("Test", {
            setUp: function (done) { done(); },
            test: function (done) { done(); }
        });

        this.runner.run(context).then(function () {
            buster.assert(listener.calledOnce);
            test.end();
        });
    },

    "should not emit test:async more than once in nested async context": function (test) {
        var listener = sinon.spy();
        this.runner.on("test:async", listener);

        var context = buster.testCase("Test", {
            setUp: function (done) { done(); },

            context1: {
                setUp: function (done) { done(); },
                test: function (done) { done(); }
            }
        });

        this.runner.run(context).then(function () {
            buster.assert(listener.calledOnce);
            test.end();
        });
    }
});

testCase("TestRunnerImplicitAsyncTearDownTest", {
    setUp: function () {
        this.runner = buster.testRunner.create();
    },

    "should resolve run when tearDown calls passed argument": function (test) {
        var callback;

        var context = buster.testCase("Test", {
            tearDown: function (done) {
                callback = done;

                buster.util.nextTick(function () {
                    callback.called = true;
                    callback();
                });
            },

            test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            buster.assert.isNotUndefined(callback);
            buster.assert(callback.called);
            test.end();
        });
    },

    "should emit test:success when tearDown calls passed argument": function (test) {
        var listener = sinon.spy();
        this.runner.on("test:success", listener);

        var context = buster.testCase("Test", {
            tearDown: function (done) {
                buster.util.nextTick(function () {
                    done();
                });
            },

            test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            buster.assert(listener.calledOnce);
            test.end();
        });

        buster.util.nextTick(function () {
            buster.assert(!listener.called);
        });
    },

    "should emit test:failure when tearDown calls passed argument with AssertionError":
    function (test) {
        var listener = sinon.spy();
        this.runner.on("test:failure", listener);

        var context = buster.testCase("Test", {
            tearDown: function (done) {
                buster.util.nextTick(function () {
                    var error = new Error("Oops");
                    error.name = "AssertionError";
                    done(error);
                });
            },

            test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            buster.assert(listener.calledOnce);
            buster.assert.equals("Oops", listener.args[0][0].error.message);
            test.end();
        });
    },

    "should emit test:error when tearDown calls passed argument with Error":
    function (test) {
        var listener = sinon.spy();
        this.runner.on("test:error", listener);

        var context = buster.testCase("Test", {
            tearDown: function (done) {
                buster.util.nextTick(function () {
                    done(new Error("Oops"));
                });
            },

            test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            buster.assert(listener.calledOnce);
            buster.assert.equals("Oops", listener.args[0][0].error.message);
            test.end();
        });
    },

    "should time out async tearDown": function (test) {
        var listener = sinon.spy();
        this.runner.on("test:timeout", listener);

        var context = buster.testCase("Test", {
            tearDown: function (done) {},
            test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            buster.assert(listener.calledOnce);
            test.end();
        });
    },

    "should emit test:async when tearDown is async": function (test) {
        var listener = sinon.spy();
        this.runner.on("test:async", listener);

        var context = buster.testCase("Test", {
            tearDown: function (done) { done(); },
            test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            buster.assert(listener.calledOnce);
            test.end();
        });
    },

    "should not emit test:async more than once": function (test) {
        var listener = sinon.spy();
        this.runner.on("test:async", listener);

        var context = buster.testCase("Test", {
            setUp: function (done) { done(); },
            tearDown: function (done) { done(); },
            test: function (done) { done(); }
        });

        this.runner.run(context).then(function () {
            buster.assert(listener.calledOnce);
            test.end();
        });
    }
});
