if (typeof require != "undefined") {
    var sys = require("sys");
    var sinon = require("sinon");
    var buster = require("buster-core");

    buster.extend(buster, {
        assertions: require("buster-assertions"),
        promise: require("buster-promise"),
        testCase: require("../../../lib/buster-test/test-case"),
        testRunner: require("../../../lib/buster-test/test-runner"),
        util: require("buster-util")
    });
}

Function.prototype.bind = function (obj) {
    var fn = this;

    return function () {
        return fn.call(obj);
    };
};

buster.util.testCase.silent = true;
var assert = buster.assertions.assert;
var refute = buster.assertions.refute;

buster.util.testCase("TestRunnerCreateTest", {
    "should emit newly created object to callback": function () {
        var listener = sinon.spy();
        buster.testRunner.onCreate(listener);
        var runner = buster.testRunner.create();

        assert(listener.calledOnce);
        assert(listener.calledWith(runner));
    },

    "should allow many listeners to onCreate callback": function () {
        var listeners = [sinon.spy(), sinon.spy()];
        buster.testRunner.onCreate(listeners[0]);
        buster.testRunner.onCreate(listeners[1]);
        var runner = buster.testRunner.create();

        assert(listeners[0].calledOnce);
        assert(listeners[1].calledOnce);
    }
});

buster.util.testCase("TestRunnerRunTest", {
    setUp: function () {
        this.runner = buster.testRunner.create();
    },

    "should return promise": function () {
        var promise = this.runner.run();

        assert.isObject(promise);
        assert.isFunction(promise.then);
    },

    "should reject without context": function () {
        var rejection = sinon.spy();
        this.runner.run().then(function () {}, rejection);

        assert(rejection.called);
    },

    "should run single test function": function (test) {
        var testFn = sinon.spy();
        var context = buster.testCase("Test", { test: testFn });

        this.runner.run(context).then(function () {
            assert(testFn.calledOnce);
            assert(context.testCase.isPrototypeOf(testFn.thisValues[0]));
            test.end();
        });
    },

    "should run test asynchronously": function (test) {
        var testFn = sinon.spy();
        var context = buster.testCase("Test", { test: testFn });

        this.runner.run(context).then(function () {
            assert(testFn.calledOnce);
            test.end();
        });

        assert(!testFn.called);
    },

    "should not reject if test throws": function (test) {
        var context = buster.testCase("Test", { test: sinon.stub().throws() });

        this.runner.run(context).then(function () {
            test.end();
        }, function () {
            assert.fail();
        });
    },

    "should call setUp on same test case object as test": function (test) {
        var setUp = sinon.spy();
        var testFn = sinon.spy();
        var context = buster.testCase("Test", { setUp: setUp, test: testFn });

        this.runner.run(context).then(function () {
            assert(setUp.calledOnce);
            assert.same(testFn.thisValues[0], setUp.thisValues[0]);
            test.end();
        });
    },

    "should call setUp before test": function (test) {
        var testFn = sinon.spy();
        var setUp = sinon.spy();
        var context = buster.testCase("Test", { setUp: setUp, test: testFn });

        this.runner.run(context).then(function () {
            assert(setUp.calledBefore(testFn));
            test.end();
        });
    },

    "should not call test until setUp resolves": function (test) {
        var promise = buster.promise.create();
        var testFn = sinon.spy();

        var setUp = sinon.spy(function () {
            assert(!testFn.called);
            return promise;
        });

        var context = buster.testCase("Test", { setUp: setUp, test: testFn });

        this.runner.run(context).then(function () {
            assert(testFn.calledOnce);
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
            assert.fail();
        });
    },

    "should not call test if setUp throws": function (test) {
        var testFn = sinon.spy();
        var setUp = sinon.stub().throws();
        var context = buster.testCase("Test", { setUp: setUp, test: testFn });

        this.runner.run(context).then(function () {
            assert(!testFn.called);
            test.end();
        });
    },

    "should not call test if setUp rejects": function (test) {
        var promise = buster.promise.create();
        var testFn = sinon.spy();
        var setUp = sinon.stub().returns(promise);
        var context = buster.testCase("Test", { setUp: setUp, test: testFn });

        this.runner.run(context).then(function () {
            assert(!testFn.called);
            test.end();
        });

        promise.reject();
    },

    "should call tearDown on same test case object as test": function (test) {
        var testFn = sinon.spy();
        var tearDown = sinon.spy();
        var context = buster.testCase("Test", { tearDown: tearDown, test: testFn });

        this.runner.run(context).then(function () {
            assert(tearDown.calledOnce);
            assert.same(testFn.thisValues[0], tearDown.thisValues[0]);
            test.end();
        });
    },

    "should call tearDown after test": function (test) {
        var testFn = sinon.spy();
        var tearDown = sinon.spy();
        var context = buster.testCase("Test", { tearDown: tearDown, test: testFn });

        this.runner.run(context).then(function () {
            assert(tearDown.calledAfter(testFn));
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
            buster.nextTick(function () {
                test.end();
            });
        });

        this.runner.run(context).then(complete);

        buster.nextTick(function () {
            assert(!complete.called);
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
            assert.fail();
        });
    },

    "should call tearDown if setUp throws": function (test) {
        var tearDown = sinon.spy();

        var context = buster.testCase("Test", {
            setUp: sinon.stub().throws(), tearDown: tearDown, test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            assert(tearDown.calledOnce);
            test.end();
        });
    },

    "should call tearDown if test throws": function (test) {
        var tearDown = sinon.spy();

        var context = buster.testCase("Test", {
            setUp: sinon.spy(), tearDown: tearDown, test: sinon.stub().throws()
        });

        this.runner.run(context).then(function () {
            assert(tearDown.calledOnce);
            test.end();
        });
    },

    "should run all tests": function (test) {
        var tests = [sinon.spy(), sinon.spy(), sinon.spy()];

        var context = buster.testCase("Test", {
            test1: tests[0], test2: tests[1], test3: tests[2]
        });

        this.runner.run(context).then(function () {
            assert(tests[0].calledOnce);
            assert(tests[1].calledOnce);
            assert(tests[2].calledOnce);
            test.end();
        });
    },

    "should run all tests even if one fails": function (test) {
        var tests = [sinon.spy(), sinon.stub().throws(), sinon.spy()];

        var context = buster.testCase("Test", {
            test1: tests[0], test2: tests[1], test3: tests[2]
        });

        this.runner.run(context).then(function () {
            assert(tests[0].calledOnce);
            assert(tests[1].calledOnce);
            assert(tests[2].calledOnce);
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
            assert(setUp.calledThrice);
            assert(setUp.calledBefore(tests[0]));
            assert(setUp.calledAfter(tests[1]));
            assert(!setUp.calledAfter(tests[2]));
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
            assert(tearDown.calledThrice);
            assert(!tearDown.calledBefore(tests[0]));
            assert(tearDown.calledAfter(tests[0]));
            assert(tearDown.calledAfter(tests[2]));
            test.end();
        });
    },

    "should run tests in sub context": function (test) {
        var testFn = sinon.spy();
        var context = buster.testCase("Test", { "context": { test1: testFn } });

        this.runner.run(context).then(function () {
            assert(testFn.calledOnce);
            test.end();
        });
    },

    "should not fail without sub contexts": function (test) {
        var testFn = sinon.spy();
        var context = { tests: [{ name: "sumptn", func: testFn }] };

        refute.exception(function () {
            this.runner.run(context).then(function () {
                assert(testFn.calledOnce);
                test.end();
            });
        }.bind(this));
    },

    "should run tests in all sub contexts": function (test) {
        var tests = [sinon.spy(), sinon.spy()];

        var context = buster.testCase("Test", {
            "context": { test1: tests[0] },
            "context2": { test1: tests[1] }
        });

        this.runner.run(context).then(function () {
            assert(tests[0].calledOnce);
            assert(tests[1].calledOnce);
            test.end();
        });
    },

    "should run sub context setUp for test in sub context": function (test) {
        var setUp = sinon.spy();
        var testFn = sinon.spy();

        var context = buster.testCase("Test", {
            "context": { setUp: setUp, test1: testFn }
        });

        context.contexts[0].testCase.id = 42;

        this.runner.run(context).then(function () {
            assert(setUp.calledOnce);
            assert.same(testFn.thisValues[0], setUp.thisValues[0]);
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
            assert(setUps[0].calledOnce);
            assert(setUps[1].calledOnce);
            assert(setUps[0].calledBefore(setUps[1]));
            test.end();
        });
    },

    "should wait for setUp promises to resolve": function (test) {
        var promises = [buster.promise.create(), buster.promise.create()];
        sinon.spy(promises[0], "resolve");
        sinon.spy(promises[1], "resolve");

        var setUps = [sinon.spy(function () {
            buster.nextTick(function () {
                promises[0].resolve();
            });

            return promises[0];
        }), sinon.spy(function () {
            buster.nextTick(function () {
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
            assert.same(testFn.thisValues[0], setUp.thisValues[0]);
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
            assert(!setUps[1].called);
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
            assert(tearDown.calledOnce);
            assert.same(testFn.thisValues[0], tearDown.thisValues[0]);
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
            assert(tearDowns[0].calledOnce);
            assert(tearDowns[0].calledOnce);
            assert(tearDowns[1].calledOnce);
            assert(tearDowns[0].calledAfter(tearDowns[1]));
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
            assert.same(tearDown.thisValues[0], testFn.thisValues[0]);
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
            assert(tearDowns[1].called);
            test.end();
        });
    },

    "should wait for tearDown promises to resolve": function (test) {
        var promises = [buster.promise.create(), buster.promise.create()];
        sinon.spy(promises[0], "resolve");
        sinon.spy(promises[1], "resolve");

        var tearDowns = [sinon.spy(function () {
            buster.nextTick(function () {
                promises[0].resolve();
            });

            return promises[0];
        }), sinon.spy(function () {
            buster.nextTick(function () {
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
    },

    "should skip 'commented out' test": function (test) {
        var testFn = sinon.spy();

        var context = buster.testCase("Test", {
            "//should do this": testFn
        });

        this.runner.run(context).then(function () {
            assert(!testFn.called);
            test.end();
        });
    }
});

buster.util.testCase("TestRunnerRunSuiteTest", {
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
            assert(tests[0].calledOnce);
            assert(tests[1].calledOnce);
            assert(tests[1].calledAfter(tests[0]));
            test.end();
        });
    }
});

buster.util.testCase("TestRunnerAssertionCountTest", {
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
            assert(this.listener.calledOnce);
            test.end();
        }.bind(this));
    },

    "should not fail test if 1 assertion": function (test) {
        sinon.stub(this.runner, "assertionCount").returns(1);

        this.runner.run(this.context).then(function () {
            assert(!this.listener.called);
            test.end();
        }.bind(this));
    },

    "should configure to not fail test if 0 assertions": function (test) {
        sinon.stub(this.runner, "assertionCount").returns(0);
        this.runner.failOnNoAssertions = false;

        this.runner.run(this.context).then(function () {
            assert(!this.listener.called);
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
            assert(this.listener.calledOnce);
            assert.equals(this.listener.args[0][0].error.message,
                                 "Expected 2 assertions, ran 3");
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
            assert(this.listener.calledOnce);
            assert.equals(this.listener.args[0][0].name, "test1");
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
            assert(this.listener.calledOnce);
            assert.equals(this.listener.args[0][0].name, "test1");
            test.end();
        }.bind(this));
    },

    "should count assertions when asserting in callback to done": function (test) {
        var stub = sinon.stub(this.runner, "assertionCount").returns(0);

        var context = buster.testCase("Test Assertions", {
            test1: function (done) {
                done(function () {
                    stub.returns(3);
                });
            }
        });

        this.runner.runSuite([context]).then(function (result) {
            assert.equals(result.assertions, 3);
            test.end();
        });
    }
});

buster.util.testCase("TestRunnerAsyncTest", {
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

        buster.nextTick(function () {
            this.promise.resolve();
        }.bind(this));
    },

    "should emit test:async event": function (test) {
        var listeners = [sinon.spy(), sinon.spy()];
        this.runner.on("test:async", listeners[0]);
        this.runner.on("test:success", listeners[1]);

        this.runner.run(this.context).then(function () {
            assert(listeners[0].calledOnce);
            assert.equals(listeners[0].args[0], [{ name: "test" }]);
            assert(listeners[0].calledBefore(listeners[1]));
            test.end();
        });

        this.promise.resolve();
    },

    "should time out after 250ms": function (test) {
        var runnerResolution = sinon.spy();
        var promise = this.promise;
        this.runner.run(this.context).then(runnerResolution);

        setTimeout(function () {
            try {
                assert(runnerResolution.called);
                assert(!promise.resolve.called);
            } catch (e) {
                buster.util.puts(e.message);
            }

            test.end();
        }, 350); // Timers in browsers are inaccurate beasts
    },

    "should time out after custom timeout": function (test) {
        var runnerResolution = sinon.spy();
        this.runner.timeout = 100;
        this.runner.run(this.context).then(runnerResolution);

        setTimeout(function () {
            assert(runnerResolution.called);
            test.end();
        }, 200);
    },

    "should emit timeout event": function (test) {
        var listener = sinon.spy();
        this.runner.timeout = 20;
        this.runner.on("test:timeout", listener);

        this.runner.run(this.context).then(function () {
            assert(listener.called);
            assert.equals(listener.args[0], [{ name: "test" }]);
            test.end();
        });
    },

    "should not emit success when test times out": function (test) {
        var listener = sinon.spy();
        this.runner.timeout = 20;
        this.runner.on("test:success", listener);

        this.runner.run(this.context).then(function () {
            assert(!listener.called);
            test.end();
        }.bind(this));
    },

    "should not emit test:success event until test has completed": function (test) {
        var listener = sinon.spy();
        this.runner.timeout = 20;
        this.runner.on("test:success", listener);

        this.runner.run(this.context).then(function () {
            assert(listener.calledOnce);
            test.end();
        });

        setTimeout(function () {
            assert(!listener.called);
            this.promise.resolve();
        }.bind(this), 10);
    },

    "should error test if it rejects it's returned promise": function (test) {
        var listener = sinon.spy();
        this.runner.timeout = 50;
        this.runner.on("test:error", listener);

        this.runner.run(this.context).then(function () {
            assert(listener.calledOnce);
            assert.equals(listener.args[0][0].error.message, "Oh no");
            test.end();
        });

        this.promise.reject(new Error("Oh no"));
    },

    "should fail test if it rejects with an AssertionError": function (test) {
        var listener = sinon.spy();
        this.runner.timeout = 20;
        this.runner.on("test:failure", listener);

        this.runner.run(this.context).then(function () {
            assert(listener.calledOnce);
            assert.equals(listener.args[0][0].error.message, "Oh no");
            test.end();
        });

        var error = new Error("Oh no");
        error.name = "AssertionError";
        this.promise.reject(error);
    },

    "should only emit one test:async event": function (test) {
        var listener = sinon.spy();
        this.runner.on("test:async", listener);
        var promise = buster.promise.create();

        var context = buster.testCase("Test", {
            tearDown: function (done) { done(); },
            test: function (done) { done(); }
        });

        this.runner.run(context).then(function () {
            assert(listener.calledOnce);
            test.end();
        });
    }
});

buster.util.testCase("TestRunnerImplicitAsyncTest", {
    setUp: function () {
        this.runner = buster.testRunner.create();
    },

    "should resolve run when test calls passed argument": function (test) {
        var callback, listener = sinon.spy();
        this.runner.on("test:async", listener);

        var context = buster.testCase("Test", {
            test: function (done) {
                callback = done;

                buster.nextTick(function () {
                    callback.called = true;
                    callback();
                });
            }
        });

        this.runner.run(context).then(function () {
            assert(listener.called);
            assert.defined(callback);
            assert(callback.called);
            test.end();
        });
    },

    "should emit test:success when test calls passed argument": function (test) {
        var listener = sinon.spy();
        this.runner.on("test:success", listener);

        var context = buster.testCase("Test", {
            test: function (done) {
                buster.nextTick(function () {
                    done();
                });
            }
        });

        this.runner.run(context).then(function () {
            assert(listener.calledOnce);
            test.end();
        });

        buster.nextTick(function () {
            assert(!listener.called);
        });
    },

    "should emit test:failure when AssertionError is thrown in done callback":
    function (test) {
        var listener = sinon.spy();
        this.runner.on("test:failure", listener);

        var context = buster.testCase("Test", {
            test: function (done) {
                buster.nextTick(function () {
                    done(function () {
                        var error = new Error("Oops");
                        error.name = "AssertionError";
                        throw error;
                    });
                });
            }
        });

        this.runner.run(context).then(function () {
            assert(listener.calledOnce);
            assert.equals(listener.args[0][0].error.message, "Oops");
            test.end();
        });
    },

    "should emit test:error when Error is thrown in done callback":
    function (test) {
        var listener = sinon.spy();
        this.runner.on("test:error", listener);

        var context = buster.testCase("Test", {
            test: function (done) {
                buster.nextTick(function () {
                    done(function () {
                        throw new Error("Oops");
                    });
                });
            }
        });

        this.runner.run(context).then(function () {
            assert(listener.calledOnce);
            assert.equals(listener.args[0][0].error.message, "Oops");
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
            assert.equals(listener.args[0][0].timeouts, 1);
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
            refute.exception(function () {
                callback();
            });

            test.end();
        });
    }
});

buster.util.testCase("TestRunnerImplicitAsyncSetUpTest", {
    setUp: function () {
        this.runner = buster.testRunner.create();
    },

    "should resolve run when setUp calls passed argument": function (test) {
        var callback;

        var context = buster.testCase("Test", {
            setUp: function (done) {
                callback = done;

                buster.nextTick(function () {
                    callback.called = true;
                    callback();
                });
            },

            test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            assert.defined(callback);
            assert(callback.called);
            test.end();
        });
    },

    "should emit test:start when setUp calls passed argument": function (test) {
        var listener = sinon.spy();
        this.runner.on("test:start", listener);

        var context = buster.testCase("Test", {
            setUp: function (done) {
                buster.nextTick(function () {
                    done();
                });
            },

            test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            assert(listener.calledOnce);
            test.end();
        });

        buster.nextTick(function () {
            assert(!listener.called);
        });
    },

    "should emit test:failure when setUp done callback throws AssertionError":
    function (test) {
        var listener = sinon.spy();
        this.runner.on("test:failure", listener);

        var context = buster.testCase("Test", {
            setUp: function (done) {
                buster.nextTick(function () {
                    done(function () {
                        var error = new Error("Oops");
                        error.name = "AssertionError";
                        throw error;
                    });
                });
            },

            test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            assert(listener.calledOnce);
            assert.equals(listener.args[0][0].error.message, "Oops");
            test.end();
        });
    },

    "should emit test:error when setUp done callback throws Error":
    function (test) {
        var listener = sinon.spy();
        this.runner.on("test:error", listener);

        var context = buster.testCase("Test", {
            setUp: function (done) {
                buster.nextTick(function () {
                    done(function () {
                        throw new Error("Oops");
                    });
                });
            },

            test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            assert(listener.calledOnce);
            assert.equals(listener.args[0][0].error.message, "Oops");
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
            assert(listener.calledOnce);
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
            assert(listener.calledOnce);
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
            assert(listener.calledOnce);
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
            assert(listener.calledOnce);
            test.end();
        });
    }
});

buster.util.testCase("TestRunnerImplicitAsyncTearDownTest", {
    setUp: function () {
        this.runner = buster.testRunner.create();
    },

    "should resolve run when tearDown calls passed argument": function (test) {
        var callback;

        var context = buster.testCase("Test", {
            tearDown: function (done) {
                callback = done;

                buster.nextTick(function () {
                    callback.called = true;
                    callback();
                });
            },

            test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            assert.defined(callback);
            assert(callback.called);
            test.end();
        });
    },

    "should emit test:success when tearDown calls passed argument": function (test) {
        var listener = sinon.spy();
        this.runner.on("test:success", listener);

        var context = buster.testCase("Test", {
            tearDown: function (done) {
                buster.nextTick(function () {
                    done();
                });
            },

            test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            assert(listener.calledOnce);
            test.end();
        });

        buster.nextTick(function () {
            assert(!listener.called);
        });
    },

    "should emit test:failure when tearDown done callback throws AssertionError":
    function (test) {
        var listener = sinon.spy();
        this.runner.on("test:failure", listener);

        var context = buster.testCase("Test", {
            tearDown: function (done) {
                buster.nextTick(function () {
                    done(function () {
                        var error = new Error("Oops");
                        error.name = "AssertionError";
                        throw error;
                    });
                });
            },

            test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            assert(listener.calledOnce);
            assert.equals(listener.args[0][0].error.message, "Oops");
            test.end();
        });
    },

    "should emit test:error when tearDown done callback throws Error":
    function (test) {
        var listener = sinon.spy();
        this.runner.on("test:error", listener);

        var context = buster.testCase("Test", {
            tearDown: function (done) {
                buster.nextTick(function () {
                    done(function () {
                        throw new Error("Oops")
                    });
                });
            },

            test: sinon.spy()
        });

        this.runner.run(context).then(function () {
            assert(listener.calledOnce);
            assert.equals(listener.args[0][0].error.message, "Oops");
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
            assert(listener.calledOnce);
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
            assert(listener.calledOnce);
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
            assert(listener.calledOnce);
            test.end();
        });
    },

    "should not emit test:async after test failure": function (test) {
        var listeners = [sinon.spy(), sinon.spy()];
        this.runner.on("test:async", listeners[0]);
        this.runner.on("test:failure", listeners[1]);
        var runner = this.runner;

        var context = buster.testCase("Test", {
            setUp: function () {},
            tearDown: function (done) { done(); },
            test: function (done) {
                var e = new Error();
                e.name = "AssertionError";
                runner.assertionFailure(e);
            }
        });

        this.runner.run(context).then(function () {
            assert(listeners[1].calledOnce);
            assert(!listeners[0].called);
            test.end();
        });
    }
});

buster.util.testCase("RunnerRunAwayExceptionsTest", {
    "should catch uncaught asynchronous errors": function (test) {
        var runner = buster.testRunner.create();
        runner.timeout = 20;
        var listener = sinon.spy();
        runner.on("uncaughtException", listener);

        var context = buster.testCase("Test", {
            "should not fail, ever": function (done) {
                 setTimeout(function () {
                     throw new Error("Oops!");
                }, 30);
            }
        });

        runner.run(context).then(function () {
            setTimeout(function () {
                assert(listener.calledOnce);
                test.end();
            }, 50);
        });
    },

    "should not handle asynchronous failure as uncaught exception": function (test) {
        if (typeof document != "undefined") {
            console.log("'should not handle asynchronous failure as uncaught " +
                        "exception':\nAborting test, as browsers may not have " +
                        "enough information for uncaught errors to treat them as " +
                        "assertion failures");
            return test.end();
        }

        var runner = buster.testRunner.create();
        var listeners = [sinon.spy(), sinon.spy()];
        runner.on("uncaughtException", listeners[0]);
        runner.on("test:failure", listeners[1]);

        var context = buster.testCase("Test", {
            "should fail with regular AssertionError": function (done) {
                 setTimeout(function () {
                     var error = new Error("[assert] Failed assertion asynchronously");
                     error.name = "AssertionError";
                     throw error;
                }, 10);
            }
        });

        runner.run(context).then(function () {
            refute(listeners[0].called);
            assert(listeners[1].calledOnce);
            test.end();
        });
    },

    "should keep handling uncaught exceptions after async failure": function (test) {
        if (typeof document != "undefined") {
            console.log("'should keep handling uncaught exceptions after async " +
                        "failure':\n Aborting test, as browsers may not have " +
                        "enough information for uncaught errors to treat them as " +
                        "assertion failures");
            return test.end();
        }

        var runner = buster.testRunner.create({ timeout: 15 });
        var listeners = [sinon.spy(), sinon.spy()];
        runner.on("uncaughtException", listeners[0]);
        runner.on("test:failure", listeners[1]);

        var context = buster.testCase("Test", {
            "should fail with regular AssertionError": function (done) {
                 setTimeout(function () {
                     var error = new Error("[assert] Failed assertion asynchronously");
                     error.name = "AssertionError";
                     throw error;
                }, 10);
            },

            "should throw async error": function (done) {
                 setTimeout(function () {
                     throw new Error("Failed something asynchronously");
                }, 20);
            }
        });

        runner.run(context).then(function () {
            setTimeout(function () {
                assert(listeners[0].called);
                assert(listeners[1].called);

                test.end();
            }, 50);
        });
    }
});

buster.util.testCase("TestRunnerEventedAssertionsTest", {
    setUp: function () {
        var runner = this.runner = buster.testRunner.create({
            handleUncaughtExceptions: false
        });

        this.assert = function (val) {
            if (!val) {
                var err = new Error("Assertion failed");
                err.name = "AssertionError";

                try {
                    throw err;
                } catch (e) {
                    runner.assertionFailure(e);
                }
            }
        };
    },

    "should emit failure event": function (test) {
        var _assert = this.assert;
        var listener = sinon.spy();
        this.runner.on("test:failure", listener);

        var context = buster.testCase("Test", {
            "test it": function () {
                _assert(false);
            }
        });

        this.runner.run(context).then(function () {
            assert(listener.calledOnce);
            var args = listener.args;

            assert.equals(args[0][0].name, "test it");
            assert.equals(args[0][0].error.message, "Assertion failed");
            test.end();
        });
    },

    "should only emit failure event once per test": function (test) {
        var assert = this.assert;
        var listener = sinon.spy();
        this.runner.on("test:failure", listener);

        var context = buster.testCase("Test", {
            "test it": function () {
                assert(false);
                assert(false);
            }
        });

        this.runner.run(context).then(function () {
            assert(listener.calledOnce);
            test.end();
        });
    },

    "should not emit error event after failures": function (test) {
        var assert = this.assert;
        var listeners = [sinon.spy(), sinon.spy()];
        this.runner.on("test:failure", listeners[0]);
        this.runner.on("test:error", listeners[1]);

        var context = buster.testCase("Test", {
            "test it": function () {
                assert(false);
                throw new Error("WTF!");
            }
        });

        this.runner.run(context).then(function () {
            assert(listeners[0].calledOnce);
            assert(!listeners[1].called);
            test.end();
        });
    },

    "should not emit timeout event after failures": function (test) {
        var assert = this.assert;
        var listeners = [sinon.spy(), sinon.spy()];
        this.runner.on("test:failure", listeners[0]);
        this.runner.on("test:timeout", listeners[1]);

        var context = buster.testCase("Test", {
            "test it": function (done) {
                assert(false);
            }
        });

        this.runner.run(context).then(function () {
            assert(listeners[0].calledOnce);
            assert(!listeners[1].called);
            test.end();
        });
    },

    "should not emit failure after timeout": function (test) {
        var assert = this.assert;
        var listeners = [sinon.spy(), sinon.spy()];
        this.runner.timeout = 20;
        this.runner.on("test:failure", listeners[0]);
        this.runner.on("test:timeout", listeners[1]);

        var context = buster.testCase("Test", {
            "test it": function (done) {
                setTimeout(function () {
                    assert(false);
                }, 40);
            }
        });

        this.runner.run(context).then(function () {
            setTimeout(function () {
                assert(!listeners[0].called);
                assert(listeners[1].calledOnce);
                test.end();
            }, 30);
        });
    },

    "should not emit success after failure": function (test) {
        var assert = this.assert;
        var listeners = [sinon.spy(), sinon.spy()];
        this.runner.timeout = 20;
        this.runner.on("test:failure", listeners[0]);
        this.runner.on("test:success", listeners[1]);

        var context = buster.testCase("Test", {
            "test it": function () {
                assert(false);
            }
        });

        this.runner.run(context).then(function () {
            setTimeout(function () {
                assert(listeners[0].calledOnce);
                assert(!listeners[1].called);
                test.end();
            }, 30);
        });
    }
});

buster.util.testCase("TestRunnerSupportRequirementsTest", {
    setUp: function () {
        this.runner = buster.testRunner.create({
            handleUncaughtExceptions: false
        });

        this.test = sinon.spy();
    },

    "should execute test normally when support is present": function (test) {
        var context = buster.testCase("Test", {
            requiresSupportFor: { A: true },
            "should run this": this.test
        });

        this.runner.run(context).then(function () {
            assert(this.test.calledOnce);
            test.end();
        }.bind(this));
    },

    "should not execute test when support is present": function (test) {
        var context = buster.testCase("Test", {
            requiresSupportFor: { A: false },
            "should not run this": this.test
        });

        this.runner.run(context).then(function () {
            assert(!this.test.called);
            test.end();
        }.bind(this));
    },

    "should not execute test when support function returns falsy": function (test) {
        var context = buster.testCase("Test", {
            requiresSupportFor: { A: function () { return; } },
            "should not run this": this.test
        });

        this.runner.run(context).then(function () {
            assert(!this.test.called);
            test.end();
        }.bind(this));
    },

    "should execute test when support function returns truthy": function (test) {
        var context = buster.testCase("Test", {
            requiresSupportFor: { A: function () { return "Ok"; } },
            "should run this": this.test
        });

        this.runner.run(context).then(function () {
            assert(this.test.calledOnce);
            test.end();
        }.bind(this));
    },

    "should not run test when not all support requirements are met": function (test) {
        var context = buster.testCase("Test", {
            requiresSupportFor: {
                A: function () { return "Ok"; },
                B: function () { return false; }
            },
            "should not run this": this.test
        });

        this.runner.run(context).then(function () {
            assert(!this.test.called);
            test.end();
        }.bind(this));
    },

    "should not run test when no support requirements are met": function (test) {
        var context = buster.testCase("Test", {
            requiresSupportForAny: {
                A: function () { return; },
                B: function () { return false; }
            },
            "should not run this": this.test
        });

        this.runner.run(context).then(function () {
            assert(!this.test.called);
            test.end();
        }.bind(this));
    },

    "should run test when at least one support requirement is met": function (test) {
        var context = buster.testCase("Test", {
            requiresSupportForAny: {
                A: function () { return true; },
                B: function () { return false; }
            },
            "should run this": this.test
        });

        this.runner.run(context).then(function () {
            assert(this.test.calledOnce);
            test.end();
        }.bind(this));
    },

    "should not emit context:start event for unsupported context": function (test) {
        var listener = sinon.spy();
        this.runner.on("context:start", listener);

        var context = buster.testCase("Test", {
            requiresSupportFor: { B: function () { return false; } },
            "should run this": this.test
        });

        this.runner.run(context).then(function () {
            assert(!listener.called);
            test.end();
        }.bind(this));
    },

    "should not run nested contexts in unsupported context": function (test) {
        var listener = sinon.spy();
        this.runner.on("context:start", listener);
        var context = buster.testCase("Test", {
            requiresSupportFor: { B: function () { return false; } },
            something: {
                "should run this": this.test
            }
        });

        this.runner.run(context).then(function () {
            assert(!listener.called);
            assert(!this.test.called);
            test.end();
        }.bind(this));
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
        "context:unsupported": sinon.spy(),
        "test:setUp": sinon.spy(),
        "test:start": sinon.spy(),
        "test:tearDown": sinon.spy(),
        "test:failure": sinon.spy(),
        "test:error": sinon.spy(),
        "test:success": sinon.spy(),
        "context:end": sinon.spy(),
        "suite:end": sinon.spy(),
        "test:deferred": sinon.spy(),
        "uncaughtException": sinon.spy()
    };

    this.runner.on("suite:start", this.listeners["suite:start"]);
    this.runner.on("context:start", this.listeners["context:start"]);
    this.runner.on("test:setUp", this.listeners["test:setUp"]);
    this.runner.on("test:start", this.listeners["test:start"]);
    this.runner.on("test:tearDown", this.listeners["test:tearDown"]);
    this.runner.on("test:success", this.listeners["test:success"]);
    this.runner.on("test:failure", this.listeners["test:failure"]);
    this.runner.on("test:error", this.listeners["test:error"]);
    this.runner.on("test:deferred", this.listeners["test:deferred"]);
    this.runner.on("context:end", this.listeners["context:end"]);
    this.runner.on("context:unsupported", this.listeners["context:unsupported"]);
    this.runner.on("suite:end", this.listeners["suite:end"]);
    this.runner.on("uncaughtException", this.listeners["uncaughtException"]);

    this.myCase = buster.testCase("My case", {});
    this.otherCase = buster.testCase("Other", {});
    this.simpleCase = buster.testCase("One test", {
        setUp: sinon.spy(),
        tearDown: sinon.spy(),
        testIt: sinon.spy()
    });
}

buster.util.testCase("TestRunnerEventsTest", {
    setUp: runnerEventsSetUp,

    "should emit event when starting suite": function (test) {
        this.runner.runSuite([this.myCase]).then(function () {
            assert(this.listeners["suite:start"].calledOnce);
            test.end();
        }.bind(this));
    },

    "should emit event when starting suite only once": function (test) {
        this.runner.runSuite([this.myCase, this.otherCase]).then(function () {
            assert(this.listeners["suite:start"].calledOnce);
            test.end();
        }.bind(this));
    },

    "should emit end suite event after context end": function (test) {
        this.runner.runSuite([this.myCase]).then(function () {
            assert(this.listeners["suite:end"].calledOnce);
            assert(this.listeners["suite:end"].calledAfter(this.listeners["context:end"]));
            test.end();
        }.bind(this));
    },

    "should emit event when starting context": function (test) {
        this.runner.run(this.myCase).then(function () {
            assert(this.listeners["context:start"].calledOnce);
            test.end();
        }.bind(this));
    },

    "should emit end context event after start context": function (test) {
        this.runner.run(this.myCase).then(function () {
            assert(this.listeners["context:end"].calledOnce);
            assert(this.listeners["context:end"].calledAfter(this.listeners["context:start"]));
            test.end();
        }.bind(this));
    },

    "should emit event when starting test": function (test) {
        this.runner.run(this.simpleCase).then(function () {
            assert(this.listeners["test:start"].calledOnce);
            test.end();
        }.bind(this));
    },

    "should emit setUp event before test:start": function (test) {
        this.runner.run(this.simpleCase).then(function () {
            assert(this.listeners["test:setUp"].calledOnce);
            assert(this.listeners["test:setUp"].calledBefore(this.listeners["test:start"]));
            test.end();
        }.bind(this));
    },

    "should emit tearDown event after test:start": function (test) {
        this.runner.run(this.simpleCase).then(function () {
            assert(this.listeners["test:tearDown"].calledOnce);
            assert(this.listeners["test:tearDown"].calledAfter(this.listeners["test:start"]));
            test.end();
        }.bind(this));
    },

    "should emit test:success when test passes": function (test) {
        this.runner.run(this.simpleCase).then(function () {
            assert(this.listeners["test:success"].calledOnce);
            test.end();
        }.bind(this));
    },

    "should not emit test:success if setUp throws": function (test) {
        var context = buster.testCase("My case", {
            setUp: sinon.stub().throws(), testIt: sinon.spy()
        });

        this.runner.run(context).then(function () {
            assert(!this.listeners["test:success"].called);
            test.end();
        }.bind(this));
    },

    "should not emit test:success if test throws": function (test) {
        var context = buster.testCase("My case", {
            setUp: sinon.spy(), testIt: sinon.stub().throws()
        });

        this.runner.run(context).then(function () {
            assert(!this.listeners["test:success"].called);
            test.end();
        }.bind(this));
    },

    "should not emit test:success if tearDown throws": function (test) {
        var context = buster.testCase("My case", {
            tearDown: sinon.stub().throws(), testIt: sinon.spy()
        });

        this.runner.run(context).then(function () {
            assert(!this.listeners["test:success"].called);
            test.end();
        }.bind(this));
    },

    "should emit test:fail when test throws assertion error": function (test) {
        var testFn = sinon.stub().throws(this.assertionError);
        var context = buster.testCase("My case", { testIt: testFn });

        this.runner.run(context).then(function () {
            assert(this.listeners["test:failure"].calledOnce);
            test.end();
        }.bind(this));
    },

    "should emit test:fail if setUp throws assertion error": function (test) {
        var context = buster.testCase("My case", {
            setUp: sinon.stub().throws(this.assertionError), testIt: sinon.spy()
        });

        this.runner.run(context).then(function () {
            assert(this.listeners["test:failure"].calledOnce);
            test.end();
        }.bind(this));
    },

    "should not emit test:fail if test passes": function (test) {
        var context = buster.testCase("My case", {
            setUp: sinon.spy(),
            testIt: sinon.stub()
        });

        this.runner.run(context).then(function () {
            assert(!this.listeners["test:failure"].called);
            test.end();
        }.bind(this));
    },

    "should emit test:fail if tearDown throws assertion error": function (test) {
        var context = buster.testCase("My case", {
            tearDown: sinon.stub().throws(this.assertionError), testIt: sinon.spy()
        });

        this.runner.run(context).then(function () {
            assert(this.listeners["test:failure"].calledOnce);
            test.end();
        }.bind(this));
    },

    "should emit test:error when test throws": function (test) {
        var testFn = sinon.stub().throws(new Error("Oops"));
        var context = buster.testCase("My case", { testIt: testFn });

        this.runner.run(context).then(function () {
            assert(this.listeners["test:error"].calledOnce);
            test.end();
        }.bind(this));
    },

    "should emit test:error if setUp throws": function (test) {
        var context = buster.testCase("My case", {
            setUp: sinon.stub().throws(), testIt: sinon.spy()
        });

        this.runner.run(context).then(function () {
            assert(this.listeners["test:error"].calledOnce);
            assert(!this.listeners["test:failure"].called);
            test.end();
        }.bind(this));
    },

    "should not emit test:error if test passes": function (test) {
        var context = buster.testCase("My case", {
            setUp: sinon.spy(), testIt: sinon.stub()
        });

        this.runner.run(context).then(function () {
            assert(!this.listeners["test:error"].called);
            test.end();
        }.bind(this));
    },

    "should emit test:error if tearDown throws assertion error": function (test) {
        var context = buster.testCase("My case", {
            tearDown: sinon.stub().throws(), testIt: sinon.spy()
        });

        this.runner.run(context).then(function () {
            assert(this.listeners["test:error"].calledOnce);
            assert(!this.listeners["test:failure"].called);
            test.end();
        }.bind(this));
    },

    "should emit test:deferred event": function (test) {
        var context = buster.testCase("Test", {
            "// should do this": function () {}
        });

        var listener = this.listeners["test:deferred"];

        this.runner.run(context).then(function () {
            assert(listener.calledOnce);
            assert.equals(listener.args[0][0].name, "should do this");
            test.end();
        }.bind(this));
    },

    "should emit test:deferred event with comment": function (test) {
        var context = buster.testCase("Test", {
            "should do this": "Later, seriously"
        });

        var listener = this.listeners["test:deferred"];

        this.runner.run(context).then(function () {
            assert(listener.calledOnce);
            assert.equals(listener.args[0][0].comment, "Later, seriously");
            test.end();
        }.bind(this));
    },

    "should emit context:unsupported event": function (test) {
        var context = buster.testCase("Test", {
            requiresSupportForAny: { A: false },
            "should not run this": this.test
        });

        this.runner.run(context).then(function () {
            assert(this.listeners["context:unsupported"].calledOnce);
            test.end();
        }.bind(this));
    }
});

buster.util.testCase("TestRunnerEventDataTest", {
    setUp: runnerEventsSetUp,

    "context:start event data": function (test) {
        var context = buster.testCase("My case", {});

        this.runner.run(context).then(function () {
            var args = this.listeners["context:start"].args[0];
            assert.equals(args, [context]);
            test.end();
        }.bind(this));
    },

    "context:end event data": function (test) {
        var context = buster.testCase("My case", {});

        this.runner.run(context).then(function () {
            var args = this.listeners["context:end"].args[0];
            assert.equals(args, [context]);
            test.end();
        }.bind(this));
    },

    "context:unsupported event data": function (test) {
        var context = buster.testCase("My case", {
            requiresSupportFor: { "Feature A": false }
        });

        this.runner.run(context).then(function () {
            var args = this.listeners["context:unsupported"].args[0];
            assert.equals(args, [{
                context: context,
                unsupported: ["Feature A"]
            }]);
            test.end();
        }.bind(this));
    },

    "test:setUp event data": function (test) {
        var context = buster.testCase("My case", {
            setUp: function () {}, test1: function () {}
        });

        this.runner.run(context).then(function () {
            var args = this.listeners["test:setUp"].args;
            assert.equals(args[0][0].name, "test1");
            assert(context.testCase.isPrototypeOf(args[0][0].testCase));
            test.end();
        }.bind(this));
    },

    "test:tearDown event data": function (test) {
        var context = buster.testCase("My case", {
            setUp: function () {}, test1: function () {}
        });

        this.runner.run(context).then(function () {
            var args = this.listeners["test:tearDown"].args;
            assert.equals("test1", args[0][0].name);
            assert(context.testCase.isPrototypeOf(args[0][0].testCase));
            test.end();
        }.bind(this));
    },

    "test:start event data": function (test) {
        var context = buster.testCase("My case", {
            setUp: function () {}, test1: function () {}
        });

        this.runner.run(context).then(function () {
            var args = this.listeners["test:start"].args;
            assert.equals(args[0][0].name, "test1");
            assert(context.testCase.isPrototypeOf(args[0][0].testCase));
            test.end();
        }.bind(this));
    },

    "test:error event data": function (test) {
        var context = buster.testCase("My case", {
            setUp: function () {}, test1: sinon.stub().throws("TypeError")
        });

        this.runner.run(context).then(function () {
            var args = this.listeners["test:error"].args[0];

            assert.equals(args[0].name, "test1");
            assert.equals(args[0].error.name, "TypeError");
            assert.equals(args[0].error.message, "");
            assert.match(args[0].error.stack, /\.js/);
            test.end();
        }.bind(this));
    },

    "test:fail event data": function (test) {
        var context = buster.testCase("My case", {
            setUp: function () {}, test1: sinon.stub().throws("AssertionError")
        });

        this.runner.run(context).then(function () {
            var args = this.listeners["test:failure"].args[0];

            assert.equals(args[0].name, "test1");
            assert.equals(args[0].error.name, "AssertionError");
            assert.equals(args[0].error.message, "");
            assert.match(args[0].error.stack, /\.js/);
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

            assert.equals(args, [{
                name: "test1",
                assertions: 2
            }]);
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
            assert.equals(args[0].contexts, 2);
            assert.equals(args[0].tests, 10);
            assert.equals(args[0].errors, 2);
            assert.equals(args[0].failures, 2);
            assert.equals(args[0].assertions, 12);
            assert.equals(args[0].timeouts, 0);
            assert.equals(args[0].deferred, 0);
            assert(!args[0].ok);
            test.end();
        }.bind(this));
    },

    "suite:end event data passing test case": function (test) {
        var context = buster.testCase("My case", {
            setUp: function () {},
            test1: sinon.spy(),
            test2: sinon.spy(),
            test3: sinon.spy(),
            test4: sinon.spy(),
            inner: {
                test5: sinon.spy()
            }
        });

        sinon.stub(this.runner, "assertionCount").returns(2);

        this.runner.runSuite([context, context]).then(function () {
            var args = this.listeners["suite:end"].args[0];
            assert.equals(args[0].contexts, 2);
            assert.equals(args[0].tests, 10);
            assert.equals(args[0].errors, 0);
            assert.equals(args[0].failures, 0);
            assert.equals(args[0].assertions, 20);
            assert.equals(args[0].timeouts, 0);
            assert.equals(args[0].deferred, 0);
            assert(args[0].ok);
            test.end();
        }.bind(this));
    },

    "suite:end event data deferred tests": function (test) {
        var context = buster.testCase("My case", {
            setUp: function () {},
            "//test1": sinon.spy(),
            test2: sinon.spy(),
            test3: sinon.spy(),
            "//test4": sinon.spy(),
            inner: {
                test5: sinon.spy()
            }
        });

        sinon.stub(this.runner, "assertionCount").returns(2);

        this.runner.runSuite([context]).then(function () {
            var args = this.listeners["suite:end"].args[0];
            assert.equals(args[0].contexts, 1);
            assert.equals(args[0].tests, 3);
            assert.equals(args[0].errors, 0);
            assert.equals(args[0].failures, 0);
            assert.equals(args[0].assertions, 6);
            assert.equals(args[0].timeouts, 0);
            assert.equals(args[0].deferred, 2);
            assert(args[0].ok);
            test.end();
        }.bind(this));
    },

    "uncaughtException event data": function (test) {
        if (typeof document != "undefined") {
            console.log("'uncaughtException event data':\n Aborting test, as " +
                        "browsers may not have enough information to extract " +
                        "useful event data");
            return test.end();
        }

        var context = buster.testCase("My case", {
            "test1": function (done) {
                setTimeout(function () {
                    throw new Error("Damnit");
                }, 15);
            }
        });

        this.runner.handleUncaughtExceptions = true;
        this.runner.timeout = 5;
        var listener = this.listeners["uncaughtException"];

        this.runner.run(context).then(function () {
            setTimeout(function () {
                assert(listener.calledOnce);
                assert.match(listener.args[0][0].message, /Damnit/);
                test.end();
            }, 10);
        });
    }
});